# 本地 Trace：解释过程，不记录资料正文

## 任务卡

- **任务**：用严格事件 schema 保存节点、耗时、状态和错误码，默认不接受 prompt/content。
- **产出**：`labs/ag11a/trace.ts`、`labs/ag11a/trace.test.ts`。
- **证据**：2 项测试，内容字段拒绝、状态计数与保留删除。
- **边界**：无遥测 exporter；SQLite 仍含任务 ID，权限和保留不可省略。
- **唯一 ID**：`AG-11A`。

## 1. 任务背景

最终回答不能解释为何失败。需要知道停在哪个节点、模型多久、工具是否成功、取消是否赶在
提交之前。但将 prompt、附件和完整工具结果全部写 trace 会制造第二份隐私资料库。
本课默认最小事件，不记录推理链，不接任何云观测服务。

## 2. 学习目标

建模本地事件；对额外字段 fail closed；保留未知 token；按 host 时间清理；
为模型、工具和提交过程留足解释信息而不复制正文。

## 3. 预备知识

SQLite 参数绑定、monotonic duration 与 wall clock。duration 用 performance.now 差值，
at 用 Date.now 决定保留；不能用模型自报时间。依赖本卷固定 Zod。

<a id="ag-11a-s4"></a>
## 4. 核心理论

### 4.1 白名单比事后脱敏可控

事件仅含 thread、node、status、ms、mode、at 和有限 code。
默认严格对象拒绝 prompt/content/rawError，而不是先保存再正则脱敏。
thread 应为 host 生成的不含用户文本的 ID；字符串限长无法自动发现嵌在 ID 中的秘密。

### 4.2 延迟与结果分别解释

模型失败、工具拒绝、取消、审批等待、DB 提交不是同一状态。
本例 status 用 running/succeeded/failed/cancelled/awaiting_approval/committed。
审批等待的墙钟长时间不能计入模型耗时；COMMIT 已成功不应被 cancel 事件覆盖成未执行。
后续指标按 terminal 事件统计，不能把每个 node 当一个用户任务。

### 4.3 保留与导出是不同开关

无 exporter 表示本应用不主动上传，不能证明全部依赖无外连。
本地 trace purge 删除逻辑行，不是 SSD 擦除。备份可能还有旧事件，恢复要重新实施保留。
OpenTelemetry GenAI 内容字段可选择，但本课选择自定义最小 JSON/SQLite，
不要为了遵循某种惯例而自动打开正文采集。

## 5. 事件契约

| 字段 | 测量来源 | 规则 |
| --- | --- | --- |
| thread | host | 不含正文的 UUID |
| node | graph | 固定枚举 |
| status | executor | 固定枚举 |
| ms | monotonic clock | 非负 |
| mode | provider | fixture/local-model |
| tokens | runtime | 未知省略，不写零 |
| code | 应用 | 有限非敏感原因码 |

<a id="ag-11a-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag11a/trace.ts`：

<!-- file: labs/ag11a/trace.ts -->
```ts
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
export const EventSchema = z.strictObject({
  thread: z.string().regex(/^[a-z0-9-]{1,80}$/),
  node: z.enum(["retrieve", "generate", "verify", "approve", "commit", "terminal"]),
  status: z.enum(["running", "succeeded", "failed", "cancelled", "awaiting_approval", "committed"]),
  ms: z.number().nonnegative().finite(), at: z.number().int().nonnegative(),
  mode: z.enum(["fixture", "local-model"]),
  tokens: z.number().int().nonnegative().optional(),
  code: z.enum(["ok", "invalid_output", "source_changed", "timeout", "denied", "cancelled"]).optional(),
});
export type TraceEvent = z.infer<typeof EventSchema>;
export function traceStore(path: string) {
  const db = new DatabaseSync(path);
  db.exec("CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY,at INTEGER NOT NULL,body TEXT NOT NULL)");
  return {
    append(raw: unknown) {
      const event = EventSchema.parse(raw);
      db.prepare("INSERT INTO events(at,body) VALUES(?,?)").run(event.at, JSON.stringify(event));
    },
    list(): TraceEvent[] {
      return db.prepare("SELECT body FROM events ORDER BY id").all()
        .map(row => EventSchema.parse(JSON.parse(z.string().parse(row.body))));
    },
    purge(before: number) {
      z.number().int().nonnegative().parse(before);
      return db.prepare("DELETE FROM events WHERE at<?").run(before).changes;
    },
    deleteThread(thread: string) {
      db.prepare("DELETE FROM events WHERE json_extract(body,'$.thread')=?").run(thread);
    },
    close() { db.close(); },
  };
}
```

所有字符串字段都受固定形状或枚举约束，错误堆栈不作为 code。
list 只供同一用户本机查看，正式多用户 trace 还要带 owner 并按 SQL actor WHERE 限制。

<a id="ag-11a-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag11a/trace.test.ts`：

<!-- file: labs/ag11a/trace.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { traceStore } from "./trace.js";
const event = { thread: "thread-1", node: "generate", status: "succeeded",
  ms: 12, at: 100, mode: "fixture" };
test("content and arbitrary error text cannot enter trace", () => {
  const store = traceStore(":memory:");
  try {
    store.append(event);
    assert.throws(() => store.append({ ...event, prompt: "EXAMPLE_PRIVATE_TEXT" }));
    assert.throws(() => store.append({ ...event, code: "EXAMPLE_TOKEN" }));
    assert.equal(store.list().length, 1);
    assert.equal(store.list()[0]?.tokens, undefined);
    assert.equal(JSON.stringify(store.list()).includes("EXAMPLE_PRIVATE_TEXT"), false);
  } finally { store.close(); }
});
test("retention and thread deletion are explicit", () => {
  const store = traceStore(":memory:");
  try {
    store.append(event);
    store.append({ ...event, at: 200, thread: "thread-2", node: "terminal", status: "cancelled" });
    assert.equal(store.purge(200), 1);
    assert.equal(store.list()[0]?.status, "cancelled");
    store.deleteThread("thread-2");
    assert.equal(store.list().length, 0);
  } finally { store.close(); }
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag11a labs/ag11a/*.ts
node --test dist/ag11a/trace.test.js
```

预期 2 项通过，无遥测端点、无常驻进程，测试结束退出。
Capstone 将实际检索/生成/审批/提交事件接入，不把这里的合成 12ms 当性能数据。

<a id="ag-11a-s8"></a>
## 8. 错误实验与排查

EventSchema 改成宽松对象会接受 prompt 并剥离它，第一项红灯。
恢复严格对象，检查事件只有一次入库。日志中出现正文时先停采集并执行副本清单，
不要只改 UI 隐藏正文。

## 9. 课后题与答案

1. prompt 被 schema 剥离为什么仍不行？它掩盖调用方意外传正文，严格失败更可见。
2. unknown tokens 应写零吗？不，零表示已测且为零。
3. trace 关闭等于 checkpoint 无正文吗？不，存储域不同。
4. 合成事件耗时能当模型性能吗？不能。

<a id="ag-11a-s10"></a>
## 10. 三类练习与答案

**基础**：tokens=-1。答案：拒绝，不能用负数表示未知，未知省略。

**进阶**：接 OTel 本地 collector。答案：collector 只 loopback、无 exporter、
关闭 GenAI 输入输出字段；验证导出开关与整个进程网络，不先启用云遥测。

**故障注入**：错误码直接用 error.message。答案：parser 应拒绝任意字符串；
将已知错误映射到固定原因码，未知统一 invalid_output，不包含秘密或堆栈。

<a id="ag-11a-s11"></a>
## 11. 阶段验收

- [ ] 2 项通过，默认不接受正文字段。
- [ ] status、mode、未知 tokens 可辨识。
- [ ] 保留与线程删除有实际 SQL 测试。
- [ ] 无远程 exporter，不宣称 OS 无网络已验。

## 12. 常见问题

**调试是否需要完整 prompt？** 先用合成输入重放。
必要时只在用户显式同意的一次性本地工作区采集，设置期限与销毁，不改变默认事件 schema。

## 13. 扩展阅读

[OpenTelemetry GenAI conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)。
语义约定会演进，本篇没有安装 OTel，也没有假称完整 OTel 兼容。

## 我现在能做到什么

我能解释本地执行过程并控制观测副本，不让 trace 成为未授权正文仓库。

## 单元导航

- 上一单元：[红队门禁](../10-evaluation/02-redteam-mutation-gates.md)
- 下一单元：[指标、预算与保留](./02-metrics-budgets-retention.md)
- 本卷入口：[README](../README.md)
