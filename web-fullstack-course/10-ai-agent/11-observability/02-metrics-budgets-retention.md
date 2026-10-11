# 指标与预算：分开任务终态、模型耗时和审批等待

## 任务卡

- **任务**：从最小事件计算按 mode 分组的模型延迟，限制调用预算。
- **产出**：`labs/ag11b/metrics.ts`、`labs/ag11b/metrics.test.ts`。
- **证据**：2 项测试，小样本百分位、未知 usage、预算与 deadline。
- **边界**：本地 monetary cost 为未知，不套用云 token 价格；没有真实硬件性能结论。
- **唯一 ID**：`AG-11B`。

## 1. 任务背景

一个任务跑六个节点不能算六个成功任务。审批等了十分钟不代表模型用了十分钟。
fixture 的毫秒级速度也不能和本地模型平均。指标要明确统计对象、样本数、时钟和 mode，
否则漂亮 p95 只是混合了不同事件的数字。

## 2. 学习目标

按模型成功调用统计延迟；明确 nearest-rank p95；
保留未知 usage；运行前消耗调用预算；记录截止和取消的区别。

## 3. 预备知识

依赖[最小 Trace](./01-local-trace-no-content.md)。
预算不是一个日志字段：执行器必须在调用前检查和消耗，测试要验证第 N+1 次不能启动。

<a id="ag-11b-s4"></a>
## 4. 核心理论

### 4.1 百分位需要分母和算法

本例 nearest-rank p95：排序后取 ceil(0.95*n)-1。n=1 时 p95 等于唯一值，
不能据此声称稳定。只统计 generate/succeeded，失败延迟单独报告；
生产还要给失败率和取消率，避免只看成功调用的幸存者偏差。

### 4.2 调用数、token 与成本不相同

调用预算可确定限制次数，入站 bytes 限制资源体积，实际 token 来自 runtime。
有一条事件 usage 未知，则汇总 tokens 为 null，不能把未知当零降低统计。
本地运行没有 provider 账单，电耗与设备成本需独立功率/时间测量，不填远程单价。

### 4.3 Deadline 在副作用前重新检查

预算由 host 保持，模型不能延长 deadline 或生成新预算。
take 在调用前消耗，即便失败也算一次。源于网络/模型的迟到结果到达后还要检查取消、
deadline、来源版本，不能因为调用开始时合法就允许迟到提交。
审批等待可能跨进程，持久计划保存过期时间，恢复检查，不用内存计时器冒充持久期限。

## 5. 统计契约

| 指标 | 分母 | 空值 |
| --- | --- | --- |
| model count | generate succeeded | 0 |
| p95Ms | 同 mode 成功调用 | null |
| tokens | 有可靠 runtime usage 的全部样本 | 任一未知则 null |
| monetaryCost | 本地无账单 | null |
| call budget | 所有发起尝试 | 用尽即拒绝 |

<a id="ag-11b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag11b/metrics.ts`：

<!-- file: labs/ag11b/metrics.ts -->
```ts
import { z } from "zod";
import { EventSchema, type TraceEvent } from "../ag11a/trace.js";
export function summarize(raw: unknown[]) {
  const events = raw.map(x => EventSchema.parse(x));
  return (["fixture", "local-model"] as const).map(mode => {
    const calls = events.filter(e => e.mode === mode && e.node === "generate"
      && e.status === "succeeded");
    const values = calls.map(e => e.ms).sort((a, b) => a - b);
    return { mode, count: values.length,
      p95Ms: values.length ? values[Math.ceil(values.length * 0.95) - 1]! : null,
      tokens: calls.length && calls.every(e => e.tokens !== undefined)
        ? calls.reduce((sum, e) => sum + e.tokens!, 0) : null,
      monetaryCost: null };
  });
}
export function callBudget(max: number, deadline: number, now: () => number) {
  z.number().int().min(1).max(8).parse(max);
  z.number().int().positive().parse(deadline);
  let used = 0;
  return {
    take(signal: AbortSignal) {
      signal.throwIfAborted();
      if (now() >= deadline) throw new Error("deadline");
      if (used >= max) throw new Error("call_budget");
      used += 1;
    },
    used() { return used; },
  };
}
export function terminalCount(events: TraceEvent[]) {
  return new Set(events.filter(e => e.node === "terminal").map(e => e.thread)).size;
}
```

terminalCount 只统计有 terminal 的线程数量，不判定最后结果；完整服务需每线程唯一终态或
明确事件顺序。审批暂停不是终态，不能加入 terminal。node 成功也不是用户任务成功。

<a id="ag-11b-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag11b/metrics.test.ts`：

<!-- file: labs/ag11b/metrics.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize, callBudget, terminalCount } from "./metrics.js";
import type { TraceEvent } from "../ag11a/trace.js";
test("modes, unknown usage and approval time are not mixed", () => {
  const base: TraceEvent = { thread: "thread-1", node: "generate", status: "succeeded",
    ms: 10, at: 100, mode: "fixture" };
  const events: TraceEvent[] = [base, { ...base, ms: 20 },
    { ...base, mode: "local-model", ms: 500, tokens: 30 },
    { ...base, node: "approve", status: "awaiting_approval", ms: 10_000 },
    { ...base, node: "terminal", status: "committed" },
    { ...base, node: "terminal", status: "committed" }];
  const report = summarize(events);
  assert.deepEqual(report[0], { mode: "fixture", count: 2, p95Ms: 20,
    tokens: null, monetaryCost: null });
  assert.equal(report[1]?.p95Ms, 500);
  assert.equal(report[1]?.tokens, 30);
  assert.equal(terminalCount(events), 1);
});
test("budget is consumed before work and cannot be extended by late results", () => {
  let now = 100;
  const budget = callBudget(2, 200, () => now);
  const signal = new AbortController().signal;
  budget.take(signal); budget.take(signal);
  assert.throws(() => budget.take(signal), /call_budget/);
  assert.equal(budget.used(), 2);
  now = 200;
  assert.throws(() => callBudget(2, 200, () => now).take(signal), /deadline/);
  const controller = new AbortController(); controller.abort();
  assert.throws(() => callBudget(2, 300, () => now).take(controller.signal));
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --rootDir labs --outDir dist labs/ag11b/*.ts
node --test dist/ag11b/metrics.test.js
```

预期 2 项通过，所有时间为注入值，不等待真实计时器。测试自行退出；
500ms 是算法样本，不是实测本地模型延迟。

<a id="ag-11b-s8"></a>
## 8. 错误实验与排查

将过滤 node 条件移除，审批 10000ms 混入 p95，第一项红灯。
把未知 tokens 转成 0 则 token 断言红灯。恢复统计范围后复验，
不要通过缩短样本审批耗时来让错误统计通过。

## 9. 课后题与答案

1. n=1 的 p95 可作性能保证吗？不可，必须公开样本数。
2. 失败调用消耗预算吗？消耗，已经占用了资源。
3. fixture 可以算本地推理费用吗？不能，没有推理。
4. model 成功是否任务成功？不是，来源/审批/提交仍可能失败。

<a id="ag-11b-s10"></a>
## 10. 三类练习与答案

**基础**：无 local-model 事件。答案：count=0，p95Ms/tokens/cost 都是 null。

**进阶**：加失败率。答案：generate failed / generate attempts，
明确 cancellation 是否单列；不能只用 succeeded 作为失败率分母。

**故障注入**：预算在调用后加 1。答案：并发可能启动超额调用；
移到启动前原子预留，单线程本例 take 同步，跨进程要用持久约束。

<a id="ag-11b-s11"></a>
## 11. 阶段验收

- [ ] 2 项通过，mode 和审批时间不混算。
- [ ] 未知 usage 不计零，成本未伪造。
- [ ] 用尽、到期、取消在调用前拒绝。
- [ ] 注入时间未报告为硬件性能。

## 12. 常见问题

**为什么不用平均值就够？** 平均值会掩盖尾延迟，但 p95 也需要足够样本。
小样本同时列 min/max/count，真实设备性能另运行固定工作负载并记录模型与设备。

## 13. 扩展阅读

[Node performance timing](https://nodejs.org/docs/latest-v22.x/api/perf_hooks.html)。
预算限制和指标采集是两个不同模块：观测到超额不能代替阻止超额。

## 我现在能做到什么

我能解释指标的统计对象，并让预算在执行前形成实际门禁。

## 单元导航

- 上一单元：[本地 Trace](./01-local-trace-no-content.md)
- 下一单元：[Loopback API](../12-local-product/01-loopback-api-task-lifecycle.md)
- 本卷入口：[README](../README.md)
