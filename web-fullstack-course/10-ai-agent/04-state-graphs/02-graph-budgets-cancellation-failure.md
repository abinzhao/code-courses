# 图循环、取消与失败：业务预算先于框架保护

## 任务卡

- **任务**：让真实 LangGraph 循环在预算、取消或工具故障时进入终点。
- **产出**：`labs/ag04b/bounded-graph.ts`、`labs/ag04b/bounded-graph.test.ts`。
- **证据**：3 项测试；迟到结果不提交、永久故障不再次执行。
- **边界**：只读工作函数，未承诺撤销已经提交的副作用。
- **唯一 ID**：`AG-04B`。

## 1. 任务背景

业务图存在合法环，例如重检索一次。将 recursionLimit 设得很大不能替代停止规则。
用户取消、空结果耗尽和工具故障应该显示不同终止原因，而不是同一个框架异常。

## 2. 学习目标

单调计数；在 await 后检查新鲜度；捕获业务错误但不吞框架 interrupt；
设计可测的 failed 与 cancelled 状态。

## 3. 预备知识

先完成[显式图](./01-langgraph-explicit-workflow.md)。本篇 signal 通过构图闭包传入，
只适用于单任务图实例；第 12 章为每个任务创建实例，不能多个用户共享同一闭包控制器。

<a id="ag-04b-s4"></a>
## 4. 核心理论

### 4.1 更新次数只由执行器增加

turns 表示已开始的工作轮数。检查预算在调用前，增加后返回；一轮失败仍消耗预算。
“失败不算步”会让故障路径无限循环。这里上限 2，框架上限 12 留出节点开销。

### 4.2 取消是结果资格判断

work 可忽略 signal，所以 await 后再次检查。一旦取消不提交 result。
取消记录当前 phase，不把底层 raw error 带入 UI。硬件推理若挂住，需要 Provider
截止包装器与可终止子进程；本篇测试使用手动 Promise 控制完成。

### 4.3 框架控制异常不能吞

本例 catch 只包纯 work，没有 `interrupt()`。以后审批节点调用 interrupt 时不能
广泛 catch，否则会截断 LangGraph 的持久暂停机制。恢复与失败重试应是独立入口。

## 5. 状态清单

| 状态 | 触发 | 可否自动再执行 |
| --- | --- | --- |
| running | 预算尚有余量 | 允许下一轮 |
| exhausted | turns 达上限 | 不允许 |
| cancelled | signal 已取消 | 不允许 |
| failed | work 永久故障 | 不允许，需新任务/显式恢复 |

<a id="ag-04b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag04b/bounded-graph.ts`：

<!-- file: labs/ag04b/bounded-graph.ts -->
```ts
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

const S = Annotation.Root({
  turns: Annotation<number>({ reducer: (_old, next) => next, default: () => 0 }),
  phase: Annotation<"running" | "exhausted" | "cancelled" | "failed">,
  result: Annotation<string>,
});
export function boundedGraph(work: () => Promise<string>, signal: AbortSignal) {
  return new StateGraph(S).addNode("step", async (state) => {
    if (signal.aborted) return { phase: "cancelled" as const };
    if (state.turns >= 2) return { phase: "exhausted" as const };
    const turns = state.turns + 1;
    try {
      const result = await work();
      if (signal.aborted) return { turns, phase: "cancelled" as const };
      if (typeof result !== "string" || result.length > 1000) {
        throw new Error("bad_result");
      }
      return { turns, result, phase: "running" as const };
    } catch {
      return { turns, phase: signal.aborted ? "cancelled" as const : "failed" as const };
    }
  }).addEdge(START, "step")
    .addConditionalEdges("step", (state) => state.phase === "running" ? "step" : END,
      ["step", END]).compile();
}
```

故意不把原始 error 存进状态，真实业务可记录 allowlist 原因码。
永久失败直接 END，不在 catch 中递归调用图。

<a id="ag-04b-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag04b/bounded-graph.test.ts`：

<!-- file: labs/ag04b/bounded-graph.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { boundedGraph } from "./bounded-graph.js";
test("business budget ends the graph after two calls", async () => {
  let calls = 0;
  const graph = boundedGraph(async () => { calls += 1; return "read"; },
    new AbortController().signal);
  const result = await graph.invoke({}, { recursionLimit: 12 });
  assert.equal(result.phase, "exhausted");
  assert.equal(result.turns, 2);
  assert.equal(calls, 2);
});
test("late read cannot commit after cancel", async () => {
  const controller = new AbortController();
  let release!: (value: string) => void;
  let started!: () => void;
  const ready = new Promise<void>((resolve) => { started = resolve; });
  const pending = new Promise<string>((resolve) => { release = resolve; });
  const graph = boundedGraph(() => { started(); return pending; }, controller.signal);
  const job = graph.invoke({}, { recursionLimit: 12 });
  await ready;
  controller.abort();
  release("late");
  const result = await job;
  assert.equal(result.phase, "cancelled");
  assert.equal(result.result, undefined);
});
test("permanent work error stops once", async () => {
  let calls = 0;
  const graph = boundedGraph(async () => { calls += 1; throw new Error("private body"); },
    new AbortController().signal);
  const result = await graph.invoke({}, { recursionLimit: 12 });
  assert.equal(result.phase, "failed");
  assert.equal(calls, 1);
  assert.equal(JSON.stringify(result).includes("private body"), false);
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag04b labs/ag04b/*.ts
node --test dist/ag04b/bounded-graph.test.js
```

预期 3 项通过，自行退出。测试等待 ready 而非 sleep，保证取消发生在工作开始之后。

<a id="ag-04b-s8"></a>
## 8. 错误实验与排查

把 `turns` 更新移除。预算测试将触发框架 recursionLimit 而非业务 exhausted。
这是明确失败证据：业务余额没有递减。恢复更新后验证恰好两次 work。
删除 await 后的取消检查会让 result 变成 late，第二项红灯。

## 9. 课后题与答案

1. 为什么失败也消耗 turn？已经尝试且消耗资源。
2. recursionLimit 与 turns 值需要相等吗？不，框架超步和业务操作不是一回事。
3. 为什么 ready Promise 比等 10ms 稳？直接证明工作边界已到达。

<a id="ag-04b-s10"></a>
## 10. 三类练习与答案

**基础**：调用前已取消。答案：phase cancelled、turns 0、work calls 0。

**进阶**：将 work 的瞬态错误交给第 03 章 boundedCall。答案：外层图 turn 计业务轮数，
adapter attempts 单独计；不要在图与 provider 同时自动重试。

**故障注入**：failed 路由回 step。答案：工具永久错误 calls 增加，测试红灯；
恢复 END，显式恢复应创建新审批/新 task，不重放未知写入。

<a id="ag-04b-s11"></a>
## 11. 阶段验收

- [ ] 3 项通过，预算先于框架保护终止。
- [ ] 取消不提交迟到 result，故障不泄露正文。
- [ ] 永久错误只执行一次。
- [ ] 未宣称取消能撤销外部副作用。

## 12. 常见问题

**为何耗尽时保留最后 result？** 它只是中间读结果，不应当作最终答案。
UI 按 phase 展示，不能有 result 就显示成功。

## 13. 扩展阅读

[LangGraph Graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api)。
取消信号与运行截止见[预算单元](../03-provider-adapters/02-retry-cancellation-budgets.md)。

## 我现在能做到什么

我能让循环图在明确业务终点停止，并用确定性测试验证取消和故障。

## 单元导航

- 上一单元：[显式 Workflow](./01-langgraph-explicit-workflow.md)
- 下一单元：[工具注册与双向 parser](../05-tools/01-tool-registry-schema-authorization.md)
- 本卷入口：[README](../README.md)
