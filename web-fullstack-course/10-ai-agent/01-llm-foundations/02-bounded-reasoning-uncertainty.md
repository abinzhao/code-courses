# 受限推理与不确定性：先有停止规则，再谈自主决策

## 任务卡

- **任务**：实现只有“检索、回答、拒答”三种动作的有限循环。
- **产出**：`labs/ag01b/loop.mjs` 与 `labs/ag01b/loop.test.mjs`。
- **运行**：Node.js 22.22.0；不安装模型、不访问网络。
- **完成证据**：3 项测试，证明回答、步数耗尽和取消三个终点。
- **边界**：硬编码 policy 是控制流 fixture，不是智能体质量评测。
- **唯一 ID**：`AG-01B`。

## 1. 任务背景

资料不足时，开放循环可能一直“再搜索一次”。模型越善于提出下一步，越不能把终止权
交给它。第一个 Agent 应该比普通 workflow 多一点选择能力，而不是无限多的权限。
这里将模型替换为一个可注入 policy，让循环的工程约束可独立测试。

## 2. 学习目标

区分固定 workflow 与受限 Agent；实现应用持有的步数预算；在每次异步边界后检查取消；
解释“完成”“拒答”“耗尽”为什么需要不同状态。

## 3. 预备知识

Promise、AbortSignal 和联合状态。先完成[答案 parser](./01-token-context-structured-output.md)。
该实验使用 MJS 以便先观察循环，后续图主线回到 TypeScript。

<a id="ag-01b-s4"></a>
## 4. 核心理论

### 4.1 自主性是有范围的选择

workflow 的下一节点由程序条件决定；受限 Agent 的下一动作由模型提议，但仍在有限集合里。
开放 Agent 可能动态提出工具与目标，本课程不以它作为入门。动作 parser 与授权器必须
在循环外定义，不能在每轮被模型重写。

### 4.2 预算属于执行器

使用 `for` 明确上限，每次 policy 调用算一步，重复搜索也消耗预算。不让 policy 返回
`remainingSteps`，否则它可以“增加余额”。步数、时间、输出长度是不同资源：
最大步数不能防止单次调用挂住，超时不能防止极速重复调用。

### 4.3 停止原因必须可解释

成功意味着有符合契约的答案；拒答意味着有明确业务原因；耗尽意味着执行器保护终止。
三者不能都显示为“任务完成”。取消检查位于调用前和 await 后，防止迟到结果提交。
取消并不撤回已经发生的副作用，因此此阶段工具只读。

## 5. 状态与 API 清单

| 项目 | 作用 | 不变量 |
| --- | --- | --- |
| `maxSteps` | policy 调用总上限 | 整数，1–8 |
| `evidence` | 已检索结果 | 由执行器更新 |
| `signal` | 用户取消 | await 前后均检查 |
| `phase` | 终止原因 | 不混淆业务与保护终止 |

<a id="ag-01b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag01b/loop.mjs`：

<!-- file: labs/ag01b/loop.mjs -->
```js
export async function runAgent({ policy, search, maxSteps = 3, signal }) {
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 8) {
    throw new Error("invalid_budget");
  }
  const evidence = [];
  const events = [];
  for (let step = 0; step < maxSteps; step += 1) {
    if (signal?.aborted) return { phase: "cancelled", events };
    const action = await policy(Object.freeze({ step, evidence: [...evidence] }));
    if (signal?.aborted) return { phase: "cancelled", events };
    if (!action || typeof action !== "object") throw new Error("invalid_action");
    if (action.kind === "search" && typeof action.query === "string"
        && action.query.length > 0 && action.query.length <= 80) {
      const result = await search(action.query, signal);
      if (signal?.aborted) return { phase: "cancelled", events };
      if (typeof result !== "string" || result.length > 2000) {
        throw new Error("invalid_tool_result");
      }
      evidence.push(result);
      events.push({ step, action: "search" });
    } else if (action.kind === "answer" && typeof action.text === "string"
        && action.text.length > 0 && action.text.length <= 2000) {
      if (evidence.length === 0) throw new Error("answer_without_evidence");
      return { phase: "answered", text: action.text, events };
    } else if (action.kind === "abstain") {
      return { phase: "abstained", events };
    } else throw new Error("invalid_action");
  }
  return { phase: "exhausted", events };
}
```

复制 evidence 防止 policy 修改数组，但不声称 `Object.freeze` 是沙箱：
恶意 JS 函数仍能访问进程。真实模型只返回数据，不加载为可执行函数。

<a id="ag-01b-s7"></a>
## 7. 集成与确定性测试

完整文件 `labs/ag01b/loop.test.mjs`：

<!-- file: labs/ag01b/loop.test.mjs -->
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { runAgent } from "./loop.mjs";

test("one search then answer", async () => {
  const result = await runAgent({
    policy: async ({ step }) => step === 0
      ? { kind: "search", query: "backup" } : { kind: "answer", text: "Use a snapshot." },
    search: async () => "doc:backup says snapshot",
  });
  assert.equal(result.phase, "answered");
  assert.equal(result.events.length, 1);
});
test("repeated search cannot extend budget", async () => {
  let calls = 0;
  const result = await runAgent({
    maxSteps: 2,
    policy: async () => ({ kind: "search", query: "again" }),
    search: async () => { calls += 1; return "empty"; },
  });
  assert.equal(result.phase, "exhausted");
  assert.equal(calls, 2);
});
test("late policy answer is discarded after cancellation", async () => {
  const controller = new AbortController();
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const job = runAgent({ signal: controller.signal,
    policy: () => pending, search: async () => "unused" });
  controller.abort();
  release({ kind: "abstain" });
  assert.equal((await job).phase, "cancelled");
});
```

```bash
node --check labs/ag01b/loop.mjs
node --test labs/ag01b/loop.test.mjs
```

预期 3 项通过；测试自行退出，无停止命令。

<a id="ag-01b-s8"></a>
## 8. 错误实验与排查

把循环条件改成 `step <= maxSteps`。第二项应出现 calls 3 而非 2，证明 off-by-one。
恢复 `<`，复验并记录总调用数。不要仅断言最终 `exhausted`，那个状态无法检测额外调用。

删除 policy await 后的取消检查，第三项可能产生 `abstained`。这是结果提交资格错误，
不是 AbortController 的 API 错误。最小化实验保留故意忽略 signal 的 policy。

## 9. 课后题与答案

1. fixture 能证明推理可靠性吗？不能，它证明已编程的分支和保护逻辑。
2. 为什么搜索空结果也计步？消耗资源且可能重复；不计步会形成无界循环。
3. 单步超时与总步数能互相替代吗？不能，分别处理挂起与重复。

<a id="ag-01b-s10"></a>
## 10. 三类练习与答案

**基础**：加入“没有搜索直接回答”测试。答案：使用 answer policy，
断言 `assert.rejects(..., /answer_without_evidence/)`。

**进阶**：记录 refusal 原因。答案：让 abstain 只接受 `no_evidence`、
`conflict` 两个枚举，非法值走 `invalid_action`，不接受任意错误消息作 UI 文案。

**故障注入**：每次搜索后把 step 减 1。答案：先用独立进程/外层截止保护运行错误版，
观察不能按预算终止；恢复单调递增。不得在主测试进程跑无保护无限循环。

<a id="ag-01b-s11"></a>
## 11. 阶段验收

- [ ] 3 项测试通过，重复搜索恰好 2 次。
- [ ] 取消后不提交迟到 policy 结果。
- [ ] 回答、拒答、取消、耗尽有不同状态。
- [ ] 无工具动态注册、Shell 或网络调用。

## 12. 常见问题

**为何不保存模型思维链？** 运维需要动作、证据和原因码，不需要内部逐字推理。
长推理文本还会扩大隐私风险。后续 trace 只记录结构化事件。

**何时升级到图？** 分支、恢复和审批需要独立节点时。不要因库流行而在首个纯函数里加图。

## 13. 扩展阅读

[LangGraph workflows and agents](https://docs.langchain.com/oss/javascript/langgraph/workflows-agents)。
本实验不调用 LangGraph，图 API 见第 04 章；完成本篇不代表离线模型质量达标。

## 我现在能做到什么

我能把自主决策限定在应用持有的动作集合与预算内，并重现取消和耗尽边界。

## 单元导航

- 上一单元：[结构化输出](./01-token-context-structured-output.md)
- 下一单元：[本地模型清单与硬件探针](../02-local-runtime/01-model-inventory-hardware-probe.md)
- 本卷入口：[README](../README.md)
