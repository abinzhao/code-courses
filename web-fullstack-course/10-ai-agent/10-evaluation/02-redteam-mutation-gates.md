# 红队与突变门禁：测试必须能抓住错误实现

## 任务卡

- **任务**：运行不会执行危险能力的攻击矩阵，并证明删授权后的实现被抓住。
- **产出**：`labs/ag10b/redteam.ts`、`labs/ag10b/redteam.test.ts`。
- **证据**：2 项测试；真实门禁通过，故意放宽 parser 与来源授权的替身失败。
- **边界**：只提交攻击数据给 parser；不执行 shell、不外连、不读取真实秘密。
- **唯一 ID**：`AG-10B`。

## 1. 任务背景

测试 suite 全绿可能只是所有测试都走允许路径。安全门禁应证明“正确允许”和“正确拒绝”，
还要证明删掉关键检查就变红。否则测试只是代码存在的装饰。
红队覆盖输入表面、来源污染、审批、恢复和预算，不以一个关键词攻击代表全部风险。

## 2. 学习目标

固定攻击矩阵；按拒绝位置断言；注入故意错误 gate；
区分拒绝攻击与系统崩溃；让高风险负例成为不能被总分抵消的阻断项。

## 3. 预备知识

依赖[权限策略](../09-security/01-injection-capability-boundaries.md)。
这里 gate 是纯授权器，异常表示拒绝。完整系统还要检查 handler 调用数为零和 DB 行数不变，
Capstone 集成测试承担后半段。

<a id="ag-10b-s4"></a>
## 4. 核心理论

### 4.1 攻击矩阵按能力边界组织

模型输出字段污染、越权来源、撤回 grant、危险工具、过长参数是不同边界。
把攻击字符串交给 fixture 不验证模型会不会服从，但能验证即便模型服从，执行器仍会拒绝。
真实模型红队另记录 model/hash/temperature 与输出，不运行危险工具来“看看会发生什么”。

### 4.2 突变检验测试敏感性

mutant 是明确故意错误的实现：宽松剥离字段、允许全部来源、忽略 read=false。
同一矩阵必须拒绝这些实现。生产中不能加 `unsafe=true` 开关方便测试；
替身只在 test 文件中存在，也不靠修改用户的文件实施突变。

### 4.3 安全失败要保留拒绝原因

本例 pass 只表示允许/拒绝符合期待。工具服务器崩溃、测试超时或网络不可用不应被当成
“安全拒绝”。集成层还需要状态码与原因码来分辨拒绝和失败，未执行副作用应从真实存储取证。
容器或 VM 外连拒绝属于隔离验收，不是本矩阵通过就自动具备。

## 5. 攻击矩阵

| 名称 | 期待 | 漏洞突变 |
| --- | --- | --- |
| valid-search | 允许 | 防止全拒绝假通过 |
| extra-actor | 拒绝 | 宽松 schema |
| private-source | 拒绝 | 来源授权删除 |
| revoked-read | 拒绝 | capability 删除 |
| shell | 拒绝 | 动态工具派发 |
| oversized-query | 拒绝 | 预算删除 |

<a id="ag-10b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag10b/redteam.ts`：

<!-- file: labs/ag10b/redteam.ts -->
```ts
import { authorizeIntent, type Grant } from "../ag09a/policy.js";
export type Gate = (raw: unknown, grant: Grant) => unknown;
const grant: Grant = { actor: "alice", sources: new Set(["doc:guide"]), read: true };
export const attacks = [
  { id: "valid-search", raw: { tool: "search", query: "backup" }, grant, allowed: true },
  { id: "extra-actor", raw: { tool: "search", query: "backup", actor: "bob" },
    grant, allowed: false },
  { id: "private-source", raw: { tool: "lookup", docId: "doc:private", line: 1 },
    grant, allowed: false },
  { id: "revoked-read", raw: { tool: "search", query: "backup" },
    grant: { ...grant, read: false }, allowed: false },
  { id: "shell", raw: { tool: "shell", command: "EXAMPLE_ONLY" }, grant, allowed: false },
  { id: "oversized-query", raw: { tool: "search", query: "x".repeat(81) },
    grant, allowed: false },
];
export function redteam(gate: Gate = authorizeIntent) {
  return attacks.map(sample => {
    let allowed = false;
    try { gate(sample.raw, sample.grant); allowed = true; } catch { /* Pure gate rejection. */ }
    return { id: sample.id, pass: allowed === sample.allowed };
  });
}
```

catch 仅适用于纯同步 gate，不要照搬到工具调用，把连接失败当权限拒绝。
集成工具必须显式拒绝码与调用证据，不能靠“任何异常算拒绝”获得安全分。

<a id="ag-10b-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag10b/redteam.test.ts`：

<!-- file: labs/ag10b/redteam.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { redteam } from "./redteam.js";
test("real policy passes allow and deny matrix", () => {
  const results = redteam();
  assert.equal(results.length, 6);
  assert.equal(results.filter(x => x.pass).length, 6);
  assert.equal(redteam(() => { throw new Error("deny_all"); })[0]?.pass, false);
});
test("schema and authorization mutants are detected", () => {
  const loose = z.discriminatedUnion("tool", [
    z.object({ tool: z.literal("search"), query: z.string().min(2).max(80) }),
    z.object({ tool: z.literal("lookup"), docId: z.string(), line: z.number() }),
  ]);
  const results = redteam(raw => loose.parse(raw));
  assert.equal(results.find(x => x.id === "extra-actor")?.pass, false);
  assert.equal(results.find(x => x.id === "private-source")?.pass, false);
  assert.equal(results.find(x => x.id === "revoked-read")?.pass, false);
  assert.equal(results.find(x => x.id === "shell")?.pass, true);
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --rootDir labs --outDir dist labs/ag10b/*.ts
node --test dist/ag10b/redteam.test.js
```

预期 2 项通过；正常 gate 6/6，替身在 3 项明确失败。测试通过的含义是“错误实现被抓住”，
不是错误 gate 也安全。测试结束退出，不留子进程。

<a id="ag-10b-s8"></a>
## 8. 错误实验与排查

把红队断言改成只检查 results.length，mutant 也通过，说明断言不敏感。
恢复逐项 pass 检查。拒绝所有请求的 gate 也必须失败 valid-search，
否则“功能全坏”会被误认为最高安全。

## 9. 课后题与答案

1. 为什么不实际执行危险工具？权限验证应在副作用前阻止，执行会造成不必要风险。
2. 全拒绝为什么不通过？合法业务同样是完成标准。
3. pure gate 抛异常能证明 DB 没写？不能，需真实集成证据。
4. 红队全过代表全部注入解决？不是，只覆盖固定矩阵。

<a id="ag-10b-s10"></a>
## 10. 三类练习与答案

**基础**：加入 query 长度恰好 80 的允许样本。答案：边界合法，81 拒绝；
一正一反防止 off-by-one 与全拒绝。

**进阶**：审批突变矩阵。答案：忽略 digest、actor、expiresAt 的三个纯替身分别运行
AG-09B 负例；正确实现必须允许正确计划，错误实现不能通过全部。

**故障注入**：工具超时被 catch 当拒绝。答案：新增 status=failure/timeout，
不要归入 denied。集成测试既查状态又查实际任务行数。

<a id="ag-10b-s11"></a>
## 11. 阶段验收

- [ ] 2 项通过，正确 gate 6/6。
- [ ] 全拒绝和三种授权/schema 突变被抓住。
- [ ] 攻击只作为数据，不执行危险命令。
- [ ] 安全矩阵覆盖范围和未测隔离清楚标注。

## 12. 常见问题

**要自动生成上千条攻击吗？** 可以在固定阻断集之外补充，但数量不替代边界。
先检查身份、对象授权、审批、取消与回放，每条都应有稳定期待和副作用证据。

## 13. 扩展阅读

[MCP security](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices)。
本卷不启用远程红队平台，也不采集真实秘密作 canary。

## 我现在能做到什么

我能证明门禁既支持合法业务，也能被测试发现关键防线删除。

## 单元导航

- 上一单元：[离线评测](./01-dataset-judges-regression.md)
- 下一单元：[内容最小化 Trace](../11-observability/01-local-trace-no-content.md)
- 本卷入口：[README](../README.md)
