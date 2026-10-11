# SQLite Checkpoint、Interrupt 与进程恢复

## 任务卡

- **任务**：暂停真实 LangGraph，关闭 SQLite 后重开，再显式 resume。
- **产出**：`labs/ag07a/checkpoint.ts`、`labs/ag07a/checkpoint.test.ts`。
- **运行**：LangGraph `1.4.21`、SQLite saver `1.0.4`；真实 file DB。
- **证据**：2 项测试，重开恢复、拒绝分支与 thread 删除。
- **边界**：审批内容仅演示字符串，完整写入授权在第 09 章；不把 MemorySaver 当持久化。
- **唯一 ID**：`AG-07A`。

## 1. 任务背景

审批页面关闭后不能丢失待办，也不能重启就自动批准。checkpoint 保存线程运行状态，
interrupt 暂停等待显式外部输入。进程重启后要使用相同 thread_id 与兼容图版本恢复。

## 2. 学习目标

连接 SqliteSaver；使用 interrupt 与 Command；重开同文件恢复；
理解节点重执行；删除 thread；区分 checkpoint 与长期记忆。

## 3. 预备知识

完成[显式图](../04-state-graphs/01-langgraph-explicit-workflow.md)及事务知识。
SqliteSaver 使用 better-sqlite3 原生模块，安装失败是 ABI/构建问题，不可删掉持久测试改 RAM。

<a id="ag-07a-s4"></a>
## 4. 核心理论

### 4.1 Checkpoint 保存线程执行状态

短期状态属于 thread；长期偏好属于用户/来源存储。checkpoint 可含用户输入与节点数据，
不能因 trace 关闭正文就以为 DB 没正文。本例只保存 task ID 与固定 preview，正式系统应
尽量存 docIds 与版本引用、限制保留，并提供 thread 删除。

### 4.2 Interrupt 会重执行所在节点

resume 时节点从头运行，interrupt 按序匹配 resume 值。因此 interrupt 之前不做非幂等写；
也不改变同节点 interrupt 顺序。不要 catch interrupt，它用框架控制机制暂停。
本例 approve 节点只有纯 preview 和 interrupt，execute 节点才处理后续业务。

### 4.3 Resume 输入仍不可信

`Command({ resume: ... })` 不等于用户授权。必须在 host 认证、绑定 actor/thread/计划摘要，
再解析输入。本例 z.strictObject 只证明形状，后续审批篇增加身份和意图绑定。
不同 actor 猜到 thread_id 不应该能调用恢复。

## 5. API 清单

| API | 用途 | 边界 |
| --- | --- | --- |
| `SqliteSaver.fromConnString` | 文件持久化 | 不传 SQLite URL，传本地路径 |
| `interrupt` | 暂停 | 不 catch，不先做非幂等写 |
| `Command` | 显式恢复 | host 必须授权 |
| `thread_id` | 线程身份 | 不是用户身份凭证 |
| `deleteThread` | 删除 checkpoint/writes | 不删除长期记忆 |

<a id="ag-07a-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag07a/checkpoint.ts`：

<!-- file: labs/ag07a/checkpoint.ts -->
```ts
import { Annotation, StateGraph, START, END, interrupt } from "@langchain/langgraph";
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";
import { z } from "zod";
const S = Annotation.Root({
  taskId: Annotation<string>,
  approved: Annotation<boolean>,
  phase: Annotation<"committed" | "rejected">,
});
const Decision = z.strictObject({ approved: z.boolean() });
export function resumableGraph(path: string) {
  const saver = SqliteSaver.fromConnString(path);
  const graph = new StateGraph(S)
    .addNode("approve", (state) => {
      const raw: unknown = interrupt({ taskId: state.taskId, preview: "Create one local task" });
      return { approved: Decision.parse(raw).approved };
    })
    .addNode("finish", (state) => ({
      phase: state.approved ? "committed" as const : "rejected" as const,
    }))
    .addEdge(START, "approve").addEdge("approve", "finish").addEdge("finish", END)
    .compile({ checkpointer: saver });
  return { graph, saver, close() { saver.db.close(); } };
}
```

committed 在本例只是状态演示，没有真实任务写；完整 Capstone 使用同一机制配合幂等事务，
不会把这里的字符串状态当提交证明。

<a id="ag-07a-s7"></a>
## 7. 文件持久恢复测试

完整文件 `labs/ag07a/checkpoint.test.ts`：

<!-- file: labs/ag07a/checkpoint.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Command } from "@langchain/langgraph";
import { resumableGraph } from "./checkpoint.js";
test("file checkpoint survives close and reopen", async () => {
  const root = await mkdtemp(join(tmpdir(), "agent-checkpoint-"));
  const path = join(root, "state.sqlite");
  const config = { configurable: { thread_id: "thread-1" } };
  let active = resumableGraph(path);
  try {
    await active.graph.invoke({ taskId: "task-1" }, config);
    assert.equal((await active.graph.getState(config)).tasks[0]?.interrupts.length, 1);
    active.close();
    active = resumableGraph(path);
    assert.ok(await active.saver.getTuple(config));
    const result = await active.graph.invoke(
      new Command({ resume: { approved: true } }), config,
    );
    assert.equal(result.phase, "committed");
    await active.saver.deleteThread("thread-1");
    assert.equal(await active.saver.getTuple(config), undefined);
  } finally { active.close(); await rm(root, { recursive: true, force: true }); }
});
test("rejection is explicit and does not imply commitment", async () => {
  const active = resumableGraph(":memory:");
  const config = { configurable: { thread_id: "thread-2" } };
  try {
    await active.graph.invoke({ taskId: "task-2" }, config);
    const result = await active.graph.invoke(new Command({ resume: { approved: false } }), config);
    assert.equal(result.phase, "rejected");
  } finally { active.close(); }
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag07a labs/ag07a/*.ts
node --test dist/ag07a/checkpoint.test.js
```

预期 2 项通过，第一项真正在同一路径关闭重开 DB。finally 关闭 saver 并删除自己创建的
目录；不可把真实用户的 checkpoint 目录放入这个清理逻辑。

<a id="ag-07a-s8"></a>
## 8. 错误实验与排查

第二次创建 active 时改为 `:memory:`，第一项 getTuple 失败，说明 RAM 不能恢复。
恢复 file 路径后复验。resume 后重复副作用时，检查 interrupt 前是否有非幂等操作；
不是“框架执行两遍就是 bug”，而是节点重执行契约未遵守。

## 9. 课后题与答案

1. checkpoint 等于长期记忆吗？不是，范围与保留策略不同。
2. interrupt 前能写通知吗？非幂等写不行，恢复会重跑。
3. thread_id 能授权用户吗？不能，需 host 身份绑定。

<a id="ag-07a-s10"></a>
## 10. 三类练习与答案

**基础**：恢复传字符串 `"yes"`。答案：Decision parser 拒绝，不到 finish。

**进阶**：保存图版本。答案：在任务元数据记录 graphVersion，恢复前对比；
失配时拒绝自动恢复，使用导出/迁移后的新线程，不猜节点兼容。

**故障注入**：approve 节点 interrupt 前自增计数。答案：恢复后计数再加一次；
移至审批后幂等事务节点，测试应证明同意重放仍只提交一次。

<a id="ag-07a-s11"></a>
## 11. 阶段验收

- [ ] 2 项通过，文件 DB 关闭重开后继续。
- [ ] 拒绝不映射成功。
- [ ] 删除 thread 后 getTuple 为 undefined。
- [ ] 无 interrupt catch 或之前的非幂等写。
- [ ] checkpoint 内容保留与删除边界已记录。

## 12. 常见问题

**为什么用两个 SQLite 库？** LangGraph saver 已实现自身序列化表；业务存储使用 Node SQLite。
它们可在同机不同文件，跨文件不是一个事务。Capstone 用业务幂等防重放。

## 13. 扩展阅读

[LangGraph interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)、
[persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)。
API 经本卷固定包类型核对。

## 我现在能做到什么

我能持久暂停与恢复真实图，解释重执行语义，并清理线程状态。

## 单元导航

- 上一单元：[MCP 信任](../06-mcp/02-host-trust-discovery-versioning.md)
- 下一单元：[长期记忆、保留与删除](./02-memory-retention-deletion.md)
- 本卷入口：[README](../README.md)
