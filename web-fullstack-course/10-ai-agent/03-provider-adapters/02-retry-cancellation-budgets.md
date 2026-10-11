# 重试、截止与资源预算：不把故障放大成调用风暴

## 任务卡

- **任务**：给 provider 包裹最多两次尝试、单次截止和迟到结果拒绝。
- **产出**：`labs/ag03b/budget.ts`、`labs/ag03b/budget.test.ts`。
- **运行**：TypeScript，Node 内置测试；全部离线。
- **证据**：4 项测试，包括超时返回、调用数硬上限与同步取消后的底层拒绝。
- **边界**：截止能停止等待，不能强制杀死忽略 signal 的原生推理或已提交写入。
- **唯一 ID**：`AG-03B`。

## 1. 任务背景

模型繁忙返回错误，如果每个图节点都自行重试三次，再乘以三层 SDK 重试，会产生调用放大。
取消也不能只传个 signal 就结束：底层可能不服从。执行器需要截止、并发门禁与预算所有权。

## 2. 学习目标

只重试明确的瞬态错误；区分超时、用户取消和协议错误；记录实际 attempts；
设计不会继续等待迟到 Promise 的包装器。

## 3. 预备知识

熟悉[Provider 契约](./01-provider-contract-local-profile.md)与手动 Promise。
此单元的测试注入 timeout 信号，不依赖机器速度或睡眠。

<a id="ag-03b-s4"></a>
## 4. 核心理论

### 4.1 重试需要分类与余额

本例仅重试 `TransientError`；schema 错误、权限拒绝、取消和超时不重试。
真实 429/503 可在 adapter 中映射，但本地内存不足通常不是“再来一次”能解决。
最多两次尝试意味着总调用上限是 2，不是“首次加两次 retry”。

### 4.2 AbortSignal 不自动让任意 Promise 停止

race 包装监听 signal，截止时拒绝等待；同时将 signal 传入底层，让可合作实现释放资源。
迟到成功不会提交。对忽略 signal 的计算，它仍在后台运行，产品必须占住并发许可直到
真正退出，或使用能终止的子进程。不要超时后马上启动第二个相同推理。

### 4.3 成本和速率要在队列入口约束

本地 profile 的核心预算是尝试数、时长、输入/输出规模与并发。本例只实现串行尝试。
跨任务速率上限应放在 API 队列而非模型 prompt；remote monetary price 未启用，不伪造金额。

## 5. API 清单

| 项目 | 用途 | 约束 |
| --- | --- | --- |
| `AbortSignal.any` | 合并用户取消和截止 | Node 22 基线 |
| `AbortSignal.timeout` | 实际运行截止 | 测试注入信号 |
| `TransientError` | 可重试分类 | 不接受模型自报 |
| `attempts` | 成本证据 | 不重复计同一次调用 |

<a id="ag-03b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag03b/budget.ts`：

<!-- file: labs/ag03b/budget.ts -->
```ts
export class TransientError extends Error {}

export function untilAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const aborted = () => reject(signal.reason ?? new Error("cancelled"));
    if (signal.aborted) {
      void work.catch(() => undefined);
      aborted();
      return;
    }
    signal.addEventListener("abort", aborted, { once: true });
    work.then(
      (value) => {
        signal.removeEventListener("abort", aborted);
        if (signal.aborted) aborted(); else resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", aborted);
        reject(error);
      },
    );
  });
}

export async function boundedCall<T>(
  invoke: (signal: AbortSignal) => Promise<T>,
  parent: AbortSignal,
  timeoutFactory: () => AbortSignal = () => AbortSignal.timeout(30_000),
) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    parent.throwIfAborted();
    const signal = AbortSignal.any([parent, timeoutFactory()]);
    signal.throwIfAborted();
    try {
      const value = await untilAbort(invoke(signal), signal);
      return { value, attempts: attempt };
    } catch (error: unknown) {
      if (signal.aborted || !(error instanceof TransientError) || attempt === 2) {
        throw error;
      }
    }
  }
  throw new Error("unreachable");
}
```

不在本例加入随机退避，让核心测试确定。生产若有 Retry-After，需封顶并纳入总截止，
不要在这个函数外再套无限重试。错误对象不含模型 content。

<a id="ag-03b-s7"></a>
## 7. 集成测试与运行

完整文件 `labs/ag03b/budget.test.ts`：

<!-- file: labs/ag03b/budget.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { boundedCall, TransientError } from "./budget.js";
const parent = () => new AbortController().signal;
const neverTimeout = () => new AbortController().signal;
test("only transient failures use the second attempt", async () => {
  let calls = 0;
  const result = await boundedCall(async () => {
    calls += 1;
    if (calls === 1) throw new TransientError("busy");
    return "ok";
  }, parent(), neverTimeout);
  assert.deepEqual(result, { value: "ok", attempts: 2 });
});
test("permanent failures and repeated transient failures are bounded", async () => {
  let calls = 0;
  await assert.rejects(boundedCall(async () => {
    calls += 1; throw new TransientError("busy");
  }, parent(), neverTimeout), /busy/);
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(boundedCall(async () => {
    calls += 1; throw new Error("schema");
  }, parent(), neverTimeout), /schema/);
  assert.equal(calls, 1);
});
test("deadline stops waiting even if provider ignores signal", async () => {
  const deadline = new AbortController();
  let finish!: (value: string) => void;
  const work = new Promise<string>((resolve) => { finish = resolve; });
  const result = boundedCall(() => work, parent(), () => deadline.signal);
  deadline.abort(new Error("deadline"));
  await assert.rejects(result, /deadline/);
  finish("late");
});
test("synchronous cancellation consumes the underlying rejection", () => {
  const module = new URL("./budget.js", import.meta.url).href;
  const script = `
    import { boundedCall } from ${JSON.stringify(module)};
    const parent = new AbortController();
    await boundedCall(() => {
      parent.abort(new Error("cancelled"));
      return Promise.reject(new Error("provider_aborted"));
    }, parent.signal, () => new AbortController().signal).catch(() => {});
    await new Promise(resolve => setImmediate(resolve));
  `;
  const child = spawnSync(process.execPath,
    ["--unhandled-rejections=strict", "--input-type=module", "-e", script],
    { encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr);
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag03b labs/ag03b/*.ts
node --test dist/ag03b/budget.test.js
```

预期 4 项通过，自行退出。截止实验显式完成后台 Promise；
同步取消实验在独立进程启用严格 rejection 检查，外层捕获取消后不得再因底层拒绝退出。

<a id="ag-03b-s8"></a>
## 8. 错误实验与排查

把 attempt 上限改为 3，第二项调用数红灯。删除 signal 判断导致 deadline 后自动重试，
第三项可能挂起；错误实验应在 `node --test --test-timeout=2000` 子进程中运行并停止。
恢复后运行完整测试。诊断应记录 attempts、错误类别和截止原因，不记录 prompt。

## 9. 课后题与答案

1. 超时是否撤销模型运算？不保证；它先停止等待，需要底层合作。
2. schema 错误能盲目重试吗？不能；另设受预算限制的格式修复流程才可解释。
3. 为什么只有一个重试层？避免层数乘法放大调用。

<a id="ag-03b-s10"></a>
## 10. 三类练习与答案

**基础**：父 signal 已取消。答案：invoke 调用数为 0。

**进阶**：引入 Retry-After。答案：只在可信 HTTP header 层读取，最大延迟和剩余总时间
取较小者；测试注入等待器，不用真实 sleep。

**故障注入**：将 catch 条件改成重试所有 Error。答案：schema 用例 calls 会变 2；
恢复分类，不把测试放宽。

<a id="ag-03b-s11"></a>
## 11. 阶段验收

- [ ] 4 项测试通过，无任意时间睡眠。
- [ ] 暂态最多 2 次，永久错误 1 次。
- [ ] 超时和用户取消不重试。
- [ ] 已说明后台计算与资源许可仍需管理。

## 12. 常见问题

**为什么没有全局 rate limiter？** 那是跨任务队列的责任，第 12 章实现单任务并发门禁。
单函数局部计数无法限制多个 API 客户端。

## 13. 扩展阅读

[Node globals: AbortSignal](https://nodejs.org/docs/latest-v22.x/api/globals.html)。
本测试证明执行器等待语义，不证明任一 runtime 的取消效率。

## 我现在能做到什么

我能用可观察调用数守住重试预算，并在底层忽略取消时拒绝迟到结果。

## 单元导航

- 上一单元：[Provider 契约](./01-provider-contract-local-profile.md)
- 下一单元：[显式 LangGraph 状态图](../04-state-graphs/01-langgraph-explicit-workflow.md)
- 本卷入口：[README](../README.md)
