# 显式 LangGraph Workflow：状态、Reducer 与终点

## 任务卡

- **任务**：用真实 LangGraph JS 构造检索、回答与拒答图。
- **产出**：`labs/ag04a/graph.ts`、`labs/ag04a/graph.test.ts`。
- **运行**：`@langchain/langgraph@1.4.21`，TypeScript strict。
- **证据**：2 项测试，节点轨迹分别为 search→answer、search→abstain。
- **边界**：检索是纯 fixture；未调用模型、未证明回答质量。
- **唯一 ID**：`AG-04A`。

## 1. 任务背景

有限循环开始出现多个业务阶段，单个函数难以描述“哪些状态能转到哪里”。
图将状态变化显式化。这里先建立确定性 workflow，不让模型动态生成边或节点。
应用仍掌握工具与停止权。

## 2. 学习目标

使用 Annotation、StateGraph、START/END；选择 reducer；
通过条件边拒答；将业务步数与框架 recursionLimit 分开。

## 3. 预备知识

完成[有限循环](../01-llm-foundations/02-bounded-reasoning-uncertainty.md)，了解 reducer
与不可变更新。安装本卷固定依赖，不能从 Python LangGraph 文档猜 JS API。

<a id="ag-04a-s4"></a>
## 4. 核心理论

### 4.1 节点返回更新，不返回任意完整状态

Annotation 定义通道。普通通道以新值替换；events 用连接 reducer 累积节点事件。
如果每个节点返回旧 events 再追加，而 reducer 还 concat，历史会被重复叠加。
节点仅返回本轮新增事件。并发节点更新同一无 reducer 通道会冲突，不能靠“最后写入”猜结果。

### 4.2 条件边表达可审计决策

搜索结果为空走 abstain，否则 answer。所有路径到 END。graph 的静态边与业务权限不同：
即使节点能被路由到，工具仍需独立授权。不要把“只能走 tool 节点”当 ACL。

### 4.3 两种预算

业务 steps 用于解释多少次动作；recursionLimit 是框架保护，计算超步语义与业务计数不同。
将前者作产品预算，后者作最后保险。测试应直接断言调用数，不能只等框架抛异常。

## 5. API 清单

| API | 用途 | 本例行为 |
| --- | --- | --- |
| `Annotation.Root` | 声明状态通道 | 文本、证据、phase、events |
| `Annotation<T>` | 通道类型 | events 使用 concat |
| `addConditionalEdges` | 按状态路由 | 无证据拒答 |
| `compile()` | 生成可运行图 | 无 checkpointer |
| `invoke` | 运行任务 | recursionLimit 10 |

<a id="ag-04a-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag04a/graph.ts`：

<!-- file: labs/ag04a/graph.ts -->
```ts
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

export const State = Annotation.Root({
  query: Annotation<string>,
  evidence: Annotation<string[]>({ reducer: (_old, next) => next, default: () => [] }),
  phase: Annotation<"running" | "answered" | "abstained">,
  answer: Annotation<string>,
  events: Annotation<string[]>({ reducer: (old, next) => old.concat(next), default: () => [] }),
});
export function buildWorkflow(search: (query: string) => Promise<string[]>) {
  return new StateGraph(State)
    .addNode("search", async (state) => ({
      evidence: await search(state.query), phase: "running" as const, events: ["search"],
    }))
    .addNode("compose", (state) => ({
      answer: state.evidence.join("\n"), phase: "answered" as const, events: ["answer"],
    }))
    .addNode("abstain", () => ({
      phase: "abstained" as const, answer: "", events: ["abstain"],
    }))
    .addEdge(START, "search")
    .addConditionalEdges("search", (state) => state.evidence.length ? "compose" : "abstain",
      ["compose", "abstain"])
    .addEdge("compose", END).addEdge("abstain", END)
    .compile();
}
```

这是 extractive workflow，compose 节点只展示证据，不宣称经过模型摘要。
节点叫 compose，避免与 answer 状态通道同名；事件名仍表示业务动作 answer。
用 injected search 隔离图行为，真正 SQLite 检索在第 08 章与 Capstone 接入。

<a id="ag-04a-s7"></a>
## 7. 集成与测试

完整文件 `labs/ag04a/graph.test.ts`：

<!-- file: labs/ag04a/graph.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWorkflow } from "./graph.js";
test("known source reaches answer once", async () => {
  const graph = buildWorkflow(async () => ["doc:guide L1 backup"]);
  const result = await graph.invoke({ query: "backup" }, { recursionLimit: 10 });
  assert.equal(result.phase, "answered");
  assert.deepEqual(result.events, ["search", "answer"]);
});
test("missing evidence reaches explicit abstention", async () => {
  const graph = buildWorkflow(async () => []);
  const result = await graph.invoke({ query: "unknown" }, { recursionLimit: 10 });
  assert.equal(result.phase, "abstained");
  assert.deepEqual(result.events, ["search", "abstain"]);
  assert.equal(result.answer, "");
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag04a labs/ag04a/*.ts
node --test dist/ag04a/graph.test.js
```

预期 2 项通过，无进程需停止。若 API 编译失败，核对锁定版本和本地 `.d.ts`，不要照搬
Python `StateGraph(dict)` 用法。

<a id="ag-04a-s8"></a>
## 8. 错误实验与排查

把 answer 返回的 events 改为 `[...state.events, "answer"]`。连接 reducer 会输出
`["search","search","answer"]`，第一项红灯。恢复仅增量事件。
轨迹重复首先检查 reducer 与节点更新契约，不要在 UI 去重来掩盖状态错误。

## 9. 课后题与答案

1. 图是否自动避免无限循环？不，环仍需业务预算与 recursionLimit。
2. concat reducer 为什么不能返回完整历史？会重复累积。
3. 空来源应该到 answer 吗？不，应明确拒答。

<a id="ag-04a-s10"></a>
## 10. 三类练习与答案

**基础**：断言 search 恰好执行一次。答案：注入计数器并 assert.equal(calls, 1)。

**进阶**：加入 schema 验证节点。答案：放在 answer 前，接受 unknown，失败进入显式
failed 分支而非输出原始模型字符串；需要同时测试正常、坏协议和空来源。

**故障注入**：从 answer 加回 search 边。答案：在受限测试中触发 recursionLimit，
记录框架异常；恢复静态终点。后续预算单元要在框架异常前业务终止。

<a id="ag-04a-s11"></a>
## 11. 阶段验收

- [ ] 2 项测试通过，所有正常分支到 END。
- [ ] 增量 reducer 轨迹没有重复。
- [ ] 空证据不生成肯定回答。
- [ ] 不将 workflow fixture 宣称为模型 Agent 质量通过。

## 12. 常见问题

**为什么不用 MessagesAnnotation？** 本项目先声明最小业务状态，避免将全部 prompt、
附件和工具内容默认长期保存在消息历史。需要 chat 时再按保留策略加入。

## 13. 扩展阅读

[LangGraph Graph API](https://docs.langchain.com/oss/javascript/langgraph/graph-api)。
本卷固定 JS 包，网页可能随新版本变化；以本篇测试和 `.d.ts` 为运行契约。

## 我现在能做到什么

我能构造有显式终点的真实 LangGraph workflow，并通过轨迹测试发现 reducer 错误。

## 单元导航

- 上一单元：[重试与预算](../03-provider-adapters/02-retry-cancellation-budgets.md)
- 下一单元：[图循环、取消与失败](./02-graph-budgets-cancellation-failure.md)
- 本卷入口：[README](../README.md)
