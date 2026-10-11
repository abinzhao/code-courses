# Promise、`async` 与事件循环

## 任务卡

- **本课产出**：`js-lab/async/event-loop.mjs`，一份可预测同步栈、微任务和计时器顺序的完整实验。
- **运行环境**：Node.js 24 LTS；浏览器渲染时机作为平台边界单独说明。
- **预计时间**：85 分钟。
- **完成证据**：执行前写出输出顺序，执行后解释每一行由哪个队列或调用栈产生。

## 1. 任务背景

邻里集市搜索需要等待网络结果，等待期间页面仍应响应输入。Promise 表示未来的完成或失败；`async` / `await` 提供顺序化写法；事件循环决定同步代码、Promise 反应和计时器何时获得执行机会。

“异步”不等于“自动并行”，`await` 也不会阻塞整个线程。本课先建立调度模型，下一课才把它用于 Fetch 协议。

## 2. 学习目标

完成本课后，你能够：

1. 区分 Promise 的 pending、fulfilled 和 rejected 状态；
2. 使用 `then`、`catch` 与 `finally` 组成链；
3. 解释 `async` 函数总是返回 Promise；
4. 解释 `await` 暂停当前异步函数而非整个线程；
5. 预测同步栈、微任务和计时器的基本顺序；
6. 说明 Node 与浏览器调度细节不能完全互推；
7. 识别长同步任务和微任务饥饿；
8. 为异步失败保留可观察的拒绝路径。

## 3. 预备知识

你需要掌握函数、异常、回调和 ESM。创建目录：

```bash
mkdir -p js-lab/async
```

先在纸上写预测，再运行代码。不要通过反复调整 `setTimeout` 毫秒数来猜执行模型。

## 4. 核心理论

### 4.1 Promise 表示一次最终结果

Promise 初始为 pending，只能首次结算为 fulfilled 或 rejected，之后状态不可逆。`then`、`catch`、`finally` 都返回新的 Promise，因此每一步抛出的异常会成为下一步的拒绝。

`finally` 适合释放“无论成功失败都要释放”的资源。它不接收原值；正常返回会透传原结果，抛错或返回拒绝 Promise 则会覆盖原结果。

### 4.2 `async` / `await` 是 Promise 语义

`async function load()` 即使 `return 3`，调用也得到 fulfilled Promise。函数内抛错会得到 rejected Promise。

执行到 `await value` 时，当前异步函数暂停，并把后续部分安排为 Promise 反应；调用栈可以继续处理其他工作。只有等待当前结果所依赖的后续步骤才应串行。

### 4.3 一轮调度的基础模型

对本课示例可以使用以下模型：

1. 当前同步调用栈运行到空；
2. 清空已排队的 Promise 微任务；
3. 运行下一个合适的任务，例如到期计时器；
4. 每个任务后再次处理微任务。

浏览器还会在合适时机执行渲染；它不会保证每个任务后必定绘制。Node 有自己的事件循环阶段、`process.nextTick` 和 I/O 规则。本课不使用 `process.nextTick`，不要把 Node 的每项顺序直接写成浏览器规范。

### 4.4 饥饿与长任务

递归排入无穷微任务会让计时器和浏览器渲染迟迟得不到机会。长时间同步循环同样阻塞输入和绘制。拆分工作前要先测量，并保证每一批最终让出控制权；“换成 Promise”不会自动把 CPU 工作移到其他线程。

## 5. 元素、属性、API 或配置清单

| 语法或 API | 作用 | 注意事项 |
| --- | --- | --- |
| `new Promise(executor)` | 建立异步结果 | executor 会同步执行 |
| `Promise.resolve(value)` | 创建或采用结果 | 反应回调仍异步排队 |
| `.then(onFulfilled, onRejected)` | 转换结果 | 返回新 Promise |
| `.catch(onRejected)` | 处理拒绝 | 等价于 `.then(undefined, handler)` |
| `.finally(onFinally)` | 无条件清理 | 不应返回替代业务值 |
| `async function` | 总是返回 Promise | 抛错成为拒绝 |
| `await expression` | 等待采用后的 Promise | 只暂停当前异步函数 |
| `queueMicrotask(callback)` | 排入微任务 | 递归使用可能饥饿 |
| `setTimeout(callback, delay)` | 安排最短延迟后的任务 | 延迟不是精确执行时间 |

## 6. 最小可运行案例

创建完整文件 `js-lab/async/event-loop.mjs`：

```js
import assert from "node:assert/strict";

const events = [];
function record(label) {
  events.push(label);
  console.log(label);
}

record("1 sync start");

const timerDone = new Promise((resolve) => {
  setTimeout(() => {
    record("6 timer");
    queueMicrotask(() => {
      record("7 microtask after timer");
      resolve();
    });
  }, 0);
});

Promise.resolve()
  .then(() => {
    record("3 promise then");
    return "result";
  })
  .then((value) => {
    record(`5 chained ${value}`);
  });

queueMicrotask(() => record("4 queued microtask"));

async function observeAwait() {
  record("2 async before await");
  await null;
  record("8 async after await");
}

const observation = observeAwait();
record("2.5 sync end");
await observation;
record("9 module after observation");
await timerDone;

assert.deepEqual(events, [
  "1 sync start",
  "2 async before await",
  "2.5 sync end",
  "3 promise then",
  "4 queued microtask",
  "8 async after await",
  "5 chained result",
  "9 module after observation",
  "6 timer",
  "7 microtask after timer",
]);
```

先预测，再运行：

```bash
node async/event-loop.mjs
```

实际预期顺序是：

```text
1 sync start
2 async before await
2.5 sync end
3 promise then
4 queued microtask
8 async after await
5 chained result
9 module after observation
6 timer
7 microtask after timer
```

原因是首个 `then`、显式微任务和 `await` 后续按排队顺序进入微任务队列；首个 `then` 执行后才
为第二个 `then` 排队。顶层等待完成后模块继续，最后才轮到计时器任务。末尾断言让顺序漂移
直接产生非零退出，而不是只靠人工对照日志。

## 7. 邻里集市集成案例

用 Promise 链表达“读取商品 -> 过滤 -> 汇总”，但不制造不必要的计时器：

```js
function readListings() {
  return Promise.resolve([
    { id: "listing-1", title: "台灯", priceCents: 1990 },
    { id: "listing-2", title: "木椅", priceCents: 0 },
  ]);
}

async function buildSearchSummary(query) {
  const listings = await readListings();
  const normalized = query.trim().toLocaleLowerCase("zh-CN");
  const items = listings.filter((item) =>
    item.title.toLocaleLowerCase("zh-CN").includes(normalized),
  );
  const totalCents = items.reduce((sum, item) => {
    if (!Number.isSafeInteger(item.priceCents) || item.priceCents < 0) {
      throw new RangeError("invalid listing price");
    }
    const next = sum + item.priceCents;
    if (!Number.isSafeInteger(next)) {
      throw new RangeError("total too large");
    }
    return next;
  }, 0);
  return { items, totalCents };
}

buildSearchSummary("灯")
  .then((result) => {
    console.log(`market:${result.items.length}:${result.totalCents}`);
  })
  .catch((error) => {
    console.error("market search failed", error);
  })
  .finally(() => {
    console.log("market search settled");
  });
```

新增输出在当前同步栈结束后出现：

```text
market:1:1990
market search settled
```

这里的 `readListings` 只是已结算 Promise，用于观察调度，不代表真实网络、持久化或权限。下一课将用 Fetch 建立协议边界。

## 8. 常见错误与排查路径

### 错误示例：遗漏 `await` 后读取 Promise 属性

```js
const result = buildSearchSummary("灯");
console.log(result.items.length);
```

五段诊断记录：

1. **现象**：抛出读取 `undefined` 属性的 `TypeError`。
2. **证据**：`result instanceof Promise` 为 `true`，而 `result.items` 是 `undefined`。
3. **原因**：异步函数返回 Promise，业务结果尚未通过 `await` 或 `then` 取得。
4. **修复**：在异步上下文使用 `const result = await ...`，或继续 Promise 链。
5. **复验**：输出 `1`，且没有未处理拒绝。

其他错误：

- `new Promise(async (resolve) => ...)`：混合 executor 与 `async` 容易产生独立拒绝；优先直接写异步函数；
- `finally(() => return fallback)`：`finally` 不是错误恢复位置，应在 `catch` 明确决定；
- 用 `setTimeout(..., 0)` 假设立即执行：它至少要等待当前栈和已排微任务；
- 无限 `queueMicrotask`：计时器和渲染没有机会，应设置有界批次。

## 9. 课后题

1. Promise 结算后还能从 fulfilled 改为 rejected 吗？
2. `await` 是否阻塞整个 JavaScript 线程？
3. 为什么第二个 `then` 可能排在已存在的微任务后？
4. `setTimeout(fn, 0)` 是否保证 0 毫秒执行？

**答案：**

1. 不能，首次结算后状态不可逆。
2. 不阻塞；它暂停当前异步函数并让调用栈继续。
3. 它要等前一个 `then` 运行后才被加入队列。
4. 不保证；0 是最短延迟，仍受任务队列和运行环境调度影响。

## 10. 实践练习

### 基础练习

给最小案例增加一个 `Promise.resolve().then(...)`，在运行前写出它与现有微任务的顺序，再执行核对。

### 进阶练习

实现 `mapSerial(items, asyncMapper)`，明确让每项等待前一项；再实现 `Promise.all(items.map(asyncMapper))` 版本，说明二者适用条件。

### 故障注入练习

让 `readListings` 返回 rejected Promise，并暂时移除 `catch`。观察 Node 的未处理拒绝证据，再恢复边界处理。

**参考答案标准：**

- 串行版本在循环中 `await`，并发版本保留输入顺序但任务可重叠；
- 只有任务相互独立且资源允许时才使用并发；
- 故障记录包含拒绝堆栈、边界位置和恢复后的可观察错误。

## 11. 阶段验收

- [ ] 执行前写出的 10 行顺序与实际一致；
- [ ] 能指出哪些日志来自同步栈、微任务和计时器任务；
- [ ] 邻里集市汇总输出 `market:1:1990`；
- [ ] 拒绝路径被 `catch` 处理，`finally` 只负责结算后的动作；
- [ ] 能说明浏览器渲染机会与 Node 事件循环细节的边界；
- [ ] 没有用计时延迟测试异步顺序的业务正确性。

## 12. 常见问题

**Promise 是否会创建新线程？**
不会。Promise 组织结果和回调调度；底层 I/O 或工作线程是否并行由运行时和具体 API 决定。

**`await` 越多越慢吗？**
关键在依赖关系。相互依赖的步骤必须串行；独立任务可以先启动再组合。不要为了“并发”破坏资源限制或错误语义。

**浏览器和 Node 的输出一定相同吗？**
本课只使用共有的基础队列行为；涉及 I/O 阶段、`process.nextTick`、渲染或嵌套计时器时必须按目标平台验证。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [MDN：Promise](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN：`async function`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/async_function)
- [MDN：微任务指南](https://developer.mozilla.org/zh-CN/docs/Web/API/HTML_DOM_API/Microtask_guide)
- [HTML Standard：Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [Node.js：The Node.js Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)

## 我现在能做到什么

我能用 Promise 和 `async` / `await` 表达成功、失败与清理，预测基础调度顺序，并识别长同步任务、微任务饥饿和未处理拒绝，而不把异步误解为自动并行。

## 单元导航

- 上一单元：[内存状态、焦点与可访问交互](../05-dom-events/03-state-focus-accessible-interactions.md)
- 下一单元：[Fetch、HTTP 错误与运行时校验](./02-fetch-http-errors-runtime-validation.md)
- 章节目录：[异步、Fetch 与事件循环](../README.md#第六章异步fetch-与事件循环)
