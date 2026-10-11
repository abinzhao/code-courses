# 写前审批：计划摘要、版本绑定与重放

## 任务卡

- **任务**：审批一个明确的本地任务计划；改参数、用户、版本或超时都不得复用批准。
- **产出**：`labs/ag09b/approval.ts`、`labs/ag09b/approval.test.ts`。
- **证据**：3 项测试，允许/拒绝矩阵、摘要变化、过期与 parser。
- **边界**：仅本地任务表写；不启用文件、Shell、网络或通知。摘要不是认证 token。
- **唯一 ID**：`AG-09B`。

## 1. 任务背景

用户批准“创建备份提醒”，模型恢复后却改为“删除备份”。若审批只存 approved=true，
变化后的意图可能仍被执行。审批应绑定实际计划，不绑定“模型愿意执行”的口头说明。
恢复后必须再次核验来源、预算和用户权限，不把 checkpoint 里的 approved 当永久授权。

## 2. 学习目标

构造规范计划摘要；绑定 actor/thread/工具版本/来源版本/截止；
解析 approve/reject/cancel；区分重复提交和一次性授权；接入持久图。

## 3. 预备知识

完成[注入边界](./01-injection-capability-boundaries.md)、
[checkpoint](../07-state-memory/01-sqlite-checkpoint-interrupt-resume.md)与幂等事务。
actor 必须由 host 认证。这个纯函数不提供登录，不能拿客户端自报 actor 来调用。

<a id="ag-09b-s4"></a>
## 4. 核心理论

### 4.1 预览和执行共用一个计划

计划含固定 tool/version、规范化 title、actor、thread、来源位置与 hash、expiresAt。
host 先解析计划，再对明确键序的 JSON 计算 SHA-256。UI 展示的值和 executor 消费同一对象，
不要预览一个友好摘要、实际执行另一个未经显示的参数。
原始 JSON 键顺序不同不应影响摘要；数组排序在规范化中确定。

### 4.2 摘要绑定不代替身份与授权

攻击者知道 digest 仍不能批准别人的任务。身份、对象归属、Origin、工具权限都在 host。
本例 decision 不含 actor，actor 是 host 参数。reject/cancel 不进入 commit。
更改来源版本、工具版本、标题或 thread 都要新审批；过期批准不能因为“已经点过”而继续。

### 4.3 重放用幂等结果处理

Command resume 可能重执行节点。审批后 DB 写使用 actor/thread 派生的稳定 key，
在一个事务内写任务与回执。再次同意返回同一回执而非重复行；同 key 不同计划拒绝。
审批模块是无存储验证器；Capstone 将计划持久化并在提交节点再查 来源/截止/取消。

## 5. 审批矩阵

| 条件 | 结果 | 副作用 |
| --- | --- | --- |
| actor/摘要/期限匹配且 approve | 允许 | 仅受控 DB 事务 |
| reject | rejected | 无写入 |
| cancel | cancelled | 无写入 |
| 参数/版本/hash/thread 改变 | approval_changed | 无写入 |
| actor 错误 | actor_denied | 无写入 |
| 到期 | approval_expired | 无写入 |

<a id="ag-09b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag09b/approval.ts`：

<!-- file: labs/ag09b/approval.ts -->
```ts
import { createHash } from "node:crypto";
import { z } from "zod";
const Ref = z.strictObject({ docId: z.string().regex(/^doc:[a-z0-9-]+$/),
  line: z.number().int().positive(), hash: z.string().regex(/^[a-f0-9]{64}$/) });
export const PlanSchema = z.strictObject({
  actor: z.string().min(1).max(80), thread: z.string().min(1).max(80),
  tool: z.literal("create_task"), toolVersion: z.literal("1"),
  title: z.string().trim().min(1).max(120),
  sources: z.array(Ref).min(1).max(8),
  expiresAt: z.number().int().positive(),
});
export type Plan = z.infer<typeof PlanSchema>;
export const DecisionSchema = z.strictObject({
  action: z.enum(["approve", "reject", "cancel"]),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
});
export function canonicalPlan(raw: unknown): Plan {
  const value = PlanSchema.parse(raw);
  const sources = value.sources.map(c => ({ docId: c.docId, line: c.line, hash: c.hash }))
    .sort((a, b) => a.docId.localeCompare(b.docId, "en") || a.line - b.line);
  if (new Set(sources.map(c => `${c.docId}:${c.line}`)).size !== sources.length) {
    throw new Error("duplicate_source");
  }
  return { actor: value.actor, thread: value.thread, tool: value.tool,
    toolVersion: value.toolVersion, title: value.title, sources, expiresAt: value.expiresAt };
}
export function planDigest(raw: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalPlan(raw))).digest("hex");
}
export function decide(plan: Plan, raw: unknown, hostActor: string, now: number) {
  if (hostActor !== plan.actor) throw new Error("actor_denied");
  const decision = DecisionSchema.parse(raw);
  if (decision.digest !== planDigest(plan)) throw new Error("approval_changed");
  if (now >= plan.expiresAt) throw new Error("approval_expired");
  return decision.action;
}
```

expiresAt 来自 host 的当前时间加审批窗口，不来自模型。标题 trim 后显示并执行；
不要 UI 显示原始标题却对另一标题计算摘要。locale 固定 en，但跨运行时升级仍需回归摘要，
正式多语言 ID 排序可改为明确字节序并提升计划版本。

<a id="ag-09b-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag09b/approval.test.ts`：

<!-- file: labs/ag09b/approval.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { canonicalPlan, planDigest, decide } from "./approval.js";
const plan = canonicalPlan({ actor: "alice", thread: "thread-1", tool: "create_task",
  toolVersion: "1", title: " Make backup ", expiresAt: 200,
  sources: [{ docId: "doc:guide", line: 1, hash: "a".repeat(64) }] });
test("approval, rejection and cancellation remain separate", () => {
  for (const action of ["approve", "reject", "cancel"]) {
    assert.equal(decide(plan, { action, digest: planDigest(plan) }, "alice", 100), action);
  }
  assert.equal(plan.title, "Make backup");
});
test("intent, source version and actor cannot reuse approval", () => {
  const decision = { action: "approve", digest: planDigest(plan) };
  assert.throws(() => decide(plan, decision, "bob", 100), /actor_denied/);
  for (const changed of [{ ...plan, title: "Delete backup" },
    { ...plan, thread: "thread-2" },
    { ...plan, sources: [{ ...plan.sources[0]!, hash: "b".repeat(64) }] }]) {
    assert.throws(() => decide(changed, decision, "alice", 100), /approval_changed/);
  }
});
test("expiry, strict decision and unsupported tools fail closed", () => {
  assert.throws(() => decide(plan, { action: "approve", digest: planDigest(plan) },
    "alice", 200), /approval_expired/);
  assert.throws(() => decide(plan, { action: "approve", digest: planDigest(plan), title: "Other" },
    "alice", 100));
  assert.throws(() => canonicalPlan({ ...plan, tool: "shell" }));
  assert.equal(planDigest({ ...plan, title: "Make backup" }), planDigest(plan));
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag09b labs/ag09b/*.ts
node --test dist/ag09b/approval.test.js
```

预期 3 项通过，无真实任务写入，测试自行停止。Capstone 使用同一验证器搭配真正事务；
不要把这 3 项当作持久幂等测试。

<a id="ag-09b-s8"></a>
## 8. 错误实验与排查

从 canonicalPlan 摘要字段移除 sources，改 hash 的第二项红灯。
恢复来源绑定后复验。审批 UI 显示成功但 DB 无行时，应查真实回执，
不是将“批准成功”更名为“任务成功”。响应丢失时同 key 查询，不创建新 key。

## 9. 课后题与答案

1. digest 是密码吗？不是，知道摘要不能取得 actor 身份。
2. reject 能写审计事件吗？可以写最小事件，但不执行被拒计划；本例纯函数无写。
3. 恢复是否必须新批准？原计划不变且未过期可恢复，仍重新查权限和来源。
4. COMMIT 后 cancel 能显示未发生吗？不能，应显示 committed，再考虑明确补偿。

<a id="ag-09b-s10"></a>
## 10. 三类练习与答案

**基础**：title 前后空格。答案：canonicalPlan trim 后摘要相同，预览显示 trim 后标题。

**进阶**：工具升级到 2。答案：计划 schema 显式版本 2，迁移或新建审批；
旧版授权不可用于新工具实现，升级后重跑协议与效果矩阵。

**故障注入**：审批后改为 file_write。答案：PlanSchema 当场拒绝，不能因为 approved=true
临时派发未知工具。实际文件工具需要新的隔离与 diff 验收，本课保持禁用。

<a id="ag-09b-s11"></a>
## 11. 阶段验收

- [ ] 3 项通过，approve/reject/cancel 明确区分。
- [ ] actor/thread/title/工具与来源版本都绑定。
- [ ] 过期、额外字段和危险工具拒绝。
- [ ] 批准与真实提交回执分离，恢复不自动授予新能力。

## 12. 常见问题

**摘要为什么没有秘密？** 计划只含最小任务参数和来源引用，默认不处理秘密。
摘要不加密，不能把敏感值 hash 后写 trace 就认为不会泄漏。

## 13. 扩展阅读

[LangGraph interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)。
身份认证、SQL 原子性与来源核验各有独立责任，图框架不会自动完成。

## 我现在能做到什么

我能将批准绑定到可审计的实际计划，阻止改参数和恢复重放越过写入边界。

## 单元导航

- 上一单元：[注入防护](./01-injection-capability-boundaries.md)
- 下一单元：[离线评测与判定器](../10-evaluation/01-dataset-judges-regression.md)
- 本卷入口：[README](../README.md)
