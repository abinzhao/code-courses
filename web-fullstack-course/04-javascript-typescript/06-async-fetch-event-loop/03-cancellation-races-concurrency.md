# 取消、竞态与并发决策

## 任务卡

- **本课产出**：`js-lab/race/search-controller.mjs` 与 `race-demo.mjs`，一套可取消、可释放且用代次保证结果新鲜度的完整控制器。
- **运行环境**：Node.js 24 LTS；使用可控 Promise，不依赖计时睡眠。
- **预计时间**：110 分钟。
- **完成证据**：旧请求晚成功和晚失败都不能覆盖新结果；当前失败可见；释放后的控制器不再渲染。

## 1. 任务背景

用户连续搜索“灯”和“台灯”时，第二个请求可能先返回。如果界面只采用“最后返回的结果”，旧响应会覆盖用户最新意图。`AbortController` 能请求底层操作停止，但服务端或自定义请求函数可能忽略信号，旧 Promise 仍可能结算。

因此搜索需要两层保护：

1. `AbortController` 减少不再需要的工作；
2. 代次（generation）检查决定结果是否仍有资格更新 UI。

这两层解决的是客户端等待与新鲜度，不会回滚已经到达服务端的事务。

## 2. 学习目标

完成本课后，你能够：

1. 创建 `AbortController` 并把 `signal` 传给异步操作；
2. 识别 `AbortError` 与真实请求失败；
3. 使用单调代次抑制旧成功和旧失败；
4. 在取消和释放时清理控制器与防抖计时器；
5. 使用可控 Promise 确定性重现乱序完成；
6. 区分防抖、取消和结果新鲜度的职责；
7. 在串行、`Promise.all` 与 `allSettled` 之间做选择；
8. 根据幂等性决定是否允许自动重试。

## 3. 预备知识

你需要理解 Fetch 的错误分层、Promise 和闭包。创建目录：

```bash
mkdir -p js-lab/race
```

本课控制器通过参数接收 `fetchPage` 与 `onState`，因此既能连接真实 Fetch，也能注入完全可控的教学替身。

## 4. 核心理论

### 4.1 取消是协作协议

`controller.abort()` 把 `signal.aborted` 设为 true，并通知监听者。Fetch 通常以 `AbortError` 拒绝，但自定义函数可能没有检查信号，网络另一端也可能已经完成操作。

因此“已取消”不能推导为：

- 服务端没有收到请求；
- 数据库事务已回滚；
- 旧 Promise 永远不会结算；
- 可以安全重发任何写请求。

### 4.2 代次是提交结果的资格检查

每次搜索递增代次，并捕获本次编号。成功或失败准备更新 UI 前，必须同时满足：

```text
控制器未释放 && 本次代次 === 当前代次
```

检查必须覆盖成功和失败。只阻止旧成功而让旧失败显示，会出现“新结果已成功，随后又显示旧错误”的竞态。

### 4.3 防抖不保证新鲜度

防抖等待用户短暂停止输入再发请求，减少请求数。用户停顿、请求已经发出后仍可能乱序，因此防抖不能替代取消或代次守卫。

计时器由控制器创建，就应在新调度和 `dispose()` 时清理。释放后的回调不能继续更新已卸载页面。

### 4.4 并发组合要服从依赖

- `Promise.all`：任务独立且任何一项失败都使整体不可用；
- `Promise.allSettled`：每项都要显示独立结果；
- 串行 `await`：后一步依赖前一步输出或必须控制顺序；
- 限制并发：任务独立但后端或浏览器资源有限。

自动重试前要确认错误是瞬时的、退避策略有上限，且操作幂等或具有幂等键。不要自动重试未知状态的支付、预约或发布写入。

## 5. 元素、属性、API 或配置清单

| API 或状态 | 作用 | 边界 |
| --- | --- | --- |
| `new AbortController()` | 创建取消控制器 | 每次请求使用独立实例 |
| `controller.signal` | 传递取消信号 | 被调用方必须协作 |
| `controller.abort(reason)` | 发出取消 | 不回滚服务端事务 |
| `signal.aborted` | 是否已取消 | 只表示本地信号状态 |
| `signal.addEventListener("abort", ...)` | 自定义操作响应取消 | 监听应只执行一次或清理 |
| `generation += 1` | 宣告新的用户意图 | 成功和失败都要比较 |
| `clearTimeout(id)` | 清除防抖任务 | 释放时必须调用 |
| `Promise.all(iterable)` | 全部成功或快速失败 | 不自动取消其他任务 |
| `Promise.allSettled(iterable)` | 收集全部结算 | 调用方逐项判断状态 |

## 6. 最小可运行案例

以下片段展示最小代次守卫：

```js
let generation = 0;

async function search(query) {
  const current = ++generation;
  const page = await fetchPage(query);
  if (current !== generation) return;
  render(page);
}
```

它可以阻止旧成功，却没有取消、失败状态或释放逻辑。完整控制器在下一节补全这些边界。

## 7. 邻里集市集成案例

### 7.1 搜索控制器

完整文件 `js-lab/race/search-controller.mjs`：

```js
export function createSearchController({ fetchPage, onState }) {
  if (typeof fetchPage !== "function" || typeof onState !== "function") {
    throw new TypeError("fetchPage and onState must be functions");
  }

  let generation = 0;
  let activeController = null;
  let debounceTimer = null;
  let disposed = false;

  function emit(state) {
    if (!disposed) onState(state);
  }

  async function search(query) {
    if (disposed) return { ignored: true, reason: "disposed" };

    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }

    const currentGeneration = generation + 1;
    generation = currentGeneration;
    activeController?.abort(
      new DOMException("superseded", "AbortError"),
    );

    const controller = new AbortController();
    activeController = controller;
    emit({ phase: "loading", query });

    try {
      const page = await fetchPage(query, { signal: controller.signal });
      if (disposed) {
        return { ignored: true, reason: "disposed" };
      }
      if (currentGeneration !== generation) {
        return { ignored: true, reason: "stale-success" };
      }
      emit({ phase: "success", query, page });
      return { ignored: false, page };
    } catch (error) {
      if (disposed) {
        return { ignored: true, reason: "disposed" };
      }
      const abortReason = controller.signal.reason;
      if (
        abortReason instanceof DOMException &&
        abortReason.name === "AbortError" &&
        abortReason.message === "canceled"
      ) {
        return { ignored: true, reason: "aborted" };
      }
      if (currentGeneration !== generation) {
        return { ignored: true, reason: "stale-error" };
      }
      if (error instanceof Error && error.name === "AbortError") {
        emit({ phase: "canceled", query });
        return { ignored: true, reason: "aborted" };
      }
      emit({ phase: "error", query, error });
      return { ignored: false, error };
    } finally {
      if (activeController === controller) {
        activeController = null;
      }
    }
  }

  function schedule(query, delay = 250) {
    if (disposed) return;
    if (!Number.isSafeInteger(delay) || delay < 0) {
      throw new RangeError("delay must be a non-negative integer");
    }
    if (debounceTimer !== null) clearTimeout(debounceTimer);
    emit({ phase: "scheduled", query });
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void search(query);
    }, delay);
  }

  function cancel() {
    if (disposed) return;
    generation += 1;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    activeController?.abort(
      new DOMException("canceled", "AbortError"),
    );
    activeController = null;
    emit({ phase: "canceled", query: null });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    generation += 1;
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    activeController?.abort(
      new DOMException("disposed", "AbortError"),
    );
    activeController = null;
  }

  return { search, schedule, cancel, dispose };
}
```

连接真实 Fetch 时必须继续传递信号：

```js
async function fetchPage(query, { signal }) {
  const url = new URL("/api/listings", location.origin);
  url.search = new URLSearchParams({ q: query }).toString();
  const response = await fetch(url, { signal, credentials: "same-origin" });
  // 网络、HTTP、解析与契约处理沿用上一课的分层。
  return parseValidatedPage(response);
}
```

片段中的 `parseValidatedPage` 代表上一课已实现的完整协议边界，不能直接写成未经检查的 `response.json()`。

### 7.2 确定性乱序演示

完整文件 `js-lab/race/race-demo.mjs`：

```js
import { createSearchController } from "./search-controller.mjs";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function page(title) {
  return {
    items: [{ id: `id-${title}`, title, priceCents: 100 }],
    page: 1,
    pageSize: 20,
    total: 1,
  };
}

const pending = new Map();
const states = [];

const controller = createSearchController({
  fetchPage(query) {
    const operation = deferred();
    pending.set(query, operation);
    // 故意忽略 signal，证明代次守卫仍然必需。
    return operation.promise;
  },
  onState(state) {
    states.push(`${state.phase}:${state.query ?? "-"}`);
  },
});

const oldRun = controller.search("灯");
const newRun = controller.search("台灯");

pending.get("台灯").resolve(page("新台灯"));
await newRun;
pending.get("灯").resolve(page("旧结果"));
const oldResult = await oldRun;

console.log(states.join(","));
console.log(oldResult.reason);
console.log(
  states.some((state) => state === "success:灯"),
);

const staleErrorRun = controller.search("旧失败");
const recoveryRun = controller.search("恢复结果");
pending.get("恢复结果").resolve(page("恢复结果"));
await recoveryRun;
pending.get("旧失败").reject(new Error("HTTP 500 req-stale"));
const staleErrorResult = await staleErrorRun;
const staleErrorReachedUi = states.some(
  (state) => state === "error:旧失败",
);
if (staleErrorResult.reason !== "stale-error" || staleErrorReachedUi) {
  throw new Error("旧失败覆盖了当前查询状态");
}
console.log(staleErrorResult.reason);
console.log(staleErrorReachedUi);

const failedRun = controller.search("当前失败");
pending.get("当前失败").reject(new Error("HTTP 500 req-current"));
await failedRun;
console.log(states.at(-1));

const lateRun = controller.search("释放后结果");
controller.dispose();
pending.get("释放后结果").resolve(page("不应渲染"));
const lateResult = await lateRun;
console.log(lateResult.reason);
console.log(
  states.some((state) => state === "success:释放后结果"),
);

const cancelStates = [];
const cancelController = createSearchController({
  fetchPage(query, { signal }) {
    return new Promise((resolve, reject) => {
      signal.addEventListener(
        "abort",
        () => {
          reject(new DOMException(`aborted:${query}`, "AbortError"));
        },
        { once: true },
      );
    });
  },
  onState(state) {
    cancelStates.push(state.phase);
  },
});

const canceledRun = cancelController.search("木椅");
cancelController.cancel();
const canceledResult = await canceledRun;
console.log(cancelStates.join(","));
console.log(canceledResult.reason);
```

运行：

```bash
node race/race-demo.mjs
```

预期关键输出：

```text
loading:灯,loading:台灯,success:台灯
stale-success
false
stale-error
false
error:当前失败
disposed
false
loading,canceled
aborted
```

没有使用随机延迟或 `sleep`。测试代码主动决定新成功先于旧成功、恢复结果先于旧失败，因此每次都复现同一竞态；显式 `cancel()` 还必须与被新搜索取代的旧请求分开分类。

## 8. 常见错误与排查路径

### 错误示例：只依赖 AbortController

```js
activeController?.abort();
activeController = new AbortController();
const page = await fetchPage(query, { signal: activeController.signal });
render(page);
```

五段诊断记录：

1. **现象**：快速搜索后，旧查询偶尔覆盖新结果，或新结果后出现旧错误。
2. **证据**：可控 Promise 忽略信号并在新请求后结算，`render` 仍收到旧查询。
3. **原因**：取消是协作信号，没有结果提交资格检查；失败分支也未判断新鲜度。
4. **修复**：每次请求捕获代次，在成功和失败更新 UI 前检查当前代次与释放状态。
5. **复验**：旧成功返回 `stale-success`，旧失败返回 `stale-error`，状态记录中都没有旧查询的最终 UI。

其他排查：

- 释放后仍更新：`dispose()` 是否先标记释放并递增代次，再取消资源；
- 防抖后发出旧词：新输入时是否清理旧计时器；
- `Promise.all` 一项失败后误以为其他请求已取消：它们仍可能运行，应显式传信号；
- 自动重试 409：冲突需要最新数据和用户决策，不是盲目重发；
- 取消 POST 后立即重发：先确认服务端幂等键和事务状态。

## 9. 课后题

1. 有 `AbortController` 后为什么仍需要代次？
2. 代次检查只放在成功分支够吗？
3. 防抖是否能消除所有竞态？
4. `Promise.all` 拒绝后会自动取消其他 Promise 吗？

**答案：**

1. 被调用方可能忽略信号，旧操作仍可能成功或失败。
2. 不够；旧失败也可能覆盖新成功状态。
3. 不能；已发出的请求仍可能乱序。
4. 不会；组合 Promise 拒绝不等于底层任务取消。

## 10. 实践练习

### 基础练习

扩展演示：让旧查询在新查询成功后 rejected，断言状态中没有 `error:旧查询`，返回原因是 `stale-error`。

### 进阶练习

实现最多并发 2 个的详情加载器。输入顺序与输出顺序保持一致，单项失败使用 `allSettled` 风格结果表示。

### 故障注入练习

暂时删除 catch 分支中的代次检查，确定性触发旧失败覆盖新成功；保留失败日志，再恢复实现并复验。

**参考答案标准：**

- 测试使用手动 `resolve` / `reject`，不使用计时睡眠；
- 旧成功和旧失败都不能产生最终状态；
- 当前请求失败必须可见，不能因“防竞态”被一律吞掉；
- `dispose()` 后没有任何 `onState` 调用；
- 重试方案明确限定 GET 或具有幂等键的写请求。

## 11. 阶段验收

- [ ] 新搜索会取消旧信号并递增代次；
- [ ] 忽略信号的旧成功被判为 `stale-success`；
- [ ] 旧失败被判为 `stale-error`，当前失败仍进入 `error`；
- [ ] 显式取消产生单一 canceled 状态；
- [ ] 释放会清理防抖计时器、取消活动请求并阻止后续渲染；
- [ ] 演示零随机等待、零时间睡眠，重复运行输出稳定；
- [ ] 能说明取消不会自动回滚服务端事务。

## 12. 常见问题

**代次可以用时间戳吗？**
不需要。当前控制器内单调整数更直接，也避免时钟精度和回拨问题。

**搜索 GET 可以自动重试吗？**
在网络瞬时失败、次数和退避有界、用户仍保持同一意图时可以考虑；401、409、契约错误和明确 4xx 不应盲目重试。

**组件卸载时只调用 `abort()` 可以吗？**
还应清理计时器、订阅和其他资源，并用释放标记阻止忽略信号的异步结果更新已卸载界面。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [MDN：AbortController](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortController)
- [MDN：AbortSignal](https://developer.mozilla.org/zh-CN/docs/Web/API/AbortSignal)
- [MDN：Promise.all](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise/all)
- [MDN：Promise.allSettled](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise/allSettled)
- [Fetch Standard：Fetch controllers](https://fetch.spec.whatwg.org/#fetch-controller)

## 我现在能做到什么

我能同时使用取消信号和代次守卫管理搜索，把旧成功、旧失败、当前失败与释放状态分开，并用确定性 Promise 控制证明竞态修复，而不是依赖偶然延迟。

## 单元导航

- 上一单元：[Fetch、HTTP 错误与运行时校验](./02-fetch-http-errors-runtime-validation.md)
- 下一单元：[TypeScript 推断、注解与严格配置](../07-typescript-core/01-inference-annotations-strict-config.md)
- 章入口：[异步、Fetch 与事件循环](../06-async-fetch-event-loop.md)
