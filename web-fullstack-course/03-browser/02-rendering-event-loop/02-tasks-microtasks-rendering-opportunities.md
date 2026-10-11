# 02 任务、微任务与呈现机会：预测顺序而不阻塞画面

## 任务卡

邻里集市搜索按钮先把状态改成“处理中”，随后同步筛选大量数据。用户只看到页面冻结，恢复时直接变成“完成”。另一个修复把计算放进 Promise，仍然没有出现中间画面。本课用日志和帧计数解释当前任务、微任务、后续任务与呈现机会。

| 产出 | 完成标准 | 证据 |
| --- | --- | --- |
| 顺序实验 | 同步、微任务、定时器、消息与 rAF 可观察 | 页面日志 |
| 呈现实验 | 能解释“DOM 已改但尚未画出” | 截图/录屏与时间戳 |
| 恢复方案 | 先呈现状态，再分片工作 | 交互记录 |
| 边界说明 | 不把浏览器规则套到 Node 全部阶段 | 口头说明 |

建议投入 80～110 分钟。所有时序结论写明浏览器、可见状态和运行次数。

## 1. 任务背景

浏览器主线程一次执行一个 JavaScript 调用栈。任务结束后，事件循环通常执行微任务检查点；在合适时机，用户代理可能更新渲染。随后再从某个任务源选择任务。

```text
取一个任务
  → 执行同步调用栈
  → 执行微任务检查点，直到队列为空
  → 可能更新渲染
  → 选择后续任务
```

“可能”很重要：规范定义处理模型和约束，但刷新率、后台标签页、节能策略与浏览器调度会影响具体时刻。不同任务源之间不能仅凭代码排版推导绝对顺序。

Promise 回调属于微任务。把重计算写进 `Promise.resolve().then(...)` 没有把工作移到后台，反而可能在呈现前继续占用主线程。

## 2. 学习目标

- 区分调用栈、任务、微任务和渲染更新机会。
- 预测同一脚本中同步日志、Promise、`queueMicrotask`、定时器和 rAF 的约束关系。
- 解释 `setTimeout(fn, 0)` 是“满足最小延迟后可排队”，不是立即执行。
- 解释 rAF 回调发生在渲染更新过程中的绘制前，不保证上一行已经显示。
- 识别不断追加微任务造成的微任务饥饿。
- 用后续任务或分片让浏览器获得呈现与输入机会。
- 使用时间戳和 `document.visibilityState` 解释后台节流。
- 区分浏览器事件循环与 Node.js 的阶段、`process.nextTick` 等运行时规则。

## 3. 预备知识

先完成[渲染阶段观察](01-dom-cssom-layout-paint-composite.md)，并理解 Promise 基本语法。创建：

```text
practice/browser-05-event-loop/
  server.mjs
  public/
    index.html
    app.js
```

运行 `node server.mjs`，访问 `http://127.0.0.1:3300/`。本课故意包含最长约600ms的本地阻塞按钮；开始前保存其他工作，不连续点击。

## 4. 核心理论

### 4.1 当前任务必须先返回

事件监听器本身在一个任务中执行。它修改 DOM 后若继续同步计算，浏览器通常没有机会在调用栈返回前呈现中间状态。

```js
status.textContent = "处理中";
busy(600);
status.textContent = "完成";
```

DOM 属性在脚本层已经改变，但屏幕像素更新由渲染机会决定。DOM 状态与用户实际看到的帧不能混为一谈。

### 4.2 微任务检查点

Promise reaction、`queueMicrotask` 和部分平台算法排入微任务。当前任务结束后，浏览器会持续清空微任务队列；若微任务不断追加微任务，定时器、输入和渲染可能长期得不到机会。

微任务适合在离开当前任务前完成短小一致性工作，不适合把大循环拆成一串 Promise。

### 4.3 任务来源与定时器

定时器、用户交互、网络回调和消息可能来自不同任务源。规范维护各任务源顺序，但用户代理选择哪个来源继续执行有自由。下面只可稳定推导约束，不应承诺所有浏览器的跨源总顺序：

- 当前同步代码先于它排入的异步回调完成。
- 当前任务排入的微任务在进入下一个任务前执行。
- 同一计时器来源、同等条件下有相应排队规则。
- rAF 属于渲染更新，而不是普通“延迟0任务”。

### 4.4 呈现机会

`requestAnimationFrame(callback)` 请求在未来渲染更新中、绘制前调用。适合根据时间更新视觉状态。回调内继续做600ms计算仍会错过帧。

想让“处理中”至少有机会出现，可让当前任务结束，并在后续任务开始重工作：

```js
status.textContent = "处理中";
requestAnimationFrame(() => {
  setTimeout(runHeavyWork, 0);
});
```

这是教学观测手段，不是最终性能修复。重工作仍应减量、分片或交给 Worker。

## 5. 协议字段、API、事件、状态与安全边界清单

| 名称 | 队列/时机 | 边界 |
| --- | --- | --- |
| 同步函数调用 | 当前调用栈 | 不返回就没有后续调度 |
| `Promise.then/catch/finally` | 微任务 | 不会自动后台执行 |
| `queueMicrotask()` | 微任务 | 异常报告与 Promise 有差异 |
| `setTimeout()` | 定时器任务 | 延迟是下限，后台会节流 |
| `MessageChannel` | 消息任务 | 跨任务源顺序不要过度承诺 |
| `requestAnimationFrame()` | 渲染更新前 | 后台标签页可暂停 |
| `cancelAnimationFrame()` | 取消请求 | 已执行回调无法撤销 |
| `performance.now()` | 单调高精度时间 | 精度可能因安全策略降低 |
| `visibilitychange` | 文档可见性事件 | 不等于页面卸载 |
| `scheduler.yield()` | 新型调度 API | 支持与行为需特性检测 |

安全与兼容：精确计时可能被降低以缓解侧信道；不要用前端时间顺序实现安全授权或交易并发。实验只在当前 Chromium 验证。

## 6. 最小可运行案例

### 6.1 完整文件：`server.mjs`

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve("./public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    if (req.method !== "GET" || !req.url?.startsWith("/") || req.url.startsWith("//")) {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1:3300");
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(root + sep) || !types[extname(file)]) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[extname(file)],
      "Cache-Control": "no-store",
    });
    res.end(await readFile(file));
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end("Local server error");
  }
}).listen(3300, "127.0.0.1", () => {
  console.log("打开 http://127.0.0.1:3300/");
});
```

### 6.2 完整文件：`public/index.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>事件循环顺序实验 · 邻里集市</title>
  <style>
    body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem; }
    button { margin: .25rem; }
    pre { min-height: 16rem; padding: 1rem; background: #f4f4f4; }
  </style>
</head>
<body>
  <main>
    <h1>任务、微任务与呈现机会</h1>
    <button id="order" type="button">记录顺序</button>
    <button id="blocked" type="button">同步阻塞</button>
    <button id="promise" type="button">Promise阻塞</button>
    <button id="yielded" type="button">先给呈现机会</button>
    <button id="clear" type="button">清空日志</button>
    <p id="status" role="status">准备就绪</p>
    <pre id="log" aria-live="polite"></pre>
    <p>这是本地调度实验，不会搜索、预约或保存真实商品。</p>
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 6.3 完整文件：`public/app.js`

```js
const status = document.querySelector("#status");
const logBox = document.querySelector("#log");
const channel = new MessageChannel();
let sequence = 0;

function log(label) {
  sequence += 1;
  const elapsed = performance.now().toFixed(1);
  logBox.textContent += `${sequence}. ${elapsed}ms ${label}\n`;
}

function busy(ms) {
  const end = performance.now() + ms;
  while (performance.now() < end) {
    Math.sqrt(12345);
  }
}

channel.port1.addEventListener("message", () => {
  log("MessageChannel 任务");
});
channel.port1.start();

document.querySelector("#order").addEventListener("click", () => {
  log("点击任务：同步开始");
  setTimeout(() => log("setTimeout 任务"), 0);
  Promise.resolve().then(() => log("Promise 微任务"));
  queueMicrotask(() => log("queueMicrotask 微任务"));
  requestAnimationFrame(() => log("requestAnimationFrame 回调（绘制前）"));
  channel.port2.postMessage("run");
  log("点击任务：同步结束");
});

document.querySelector("#blocked").addEventListener("click", () => {
  status.textContent = "同步处理中";
  log("设置同步处理中");
  busy(600);
  status.textContent = "同步完成";
  log("同步计算结束");
});

document.querySelector("#promise").addEventListener("click", () => {
  status.textContent = "Promise处理中";
  log("设置Promise处理中");
  Promise.resolve().then(() => {
    log("Promise重计算开始");
    busy(600);
    status.textContent = "Promise完成";
    log("Promise重计算结束");
  });
});

document.querySelector("#yielded").addEventListener("click", () => {
  status.textContent = "等待后续计算";
  log("设置等待状态");
  requestAnimationFrame(() => {
    log("rAF：仍在绘制前");
    setTimeout(() => {
      log("后续任务：重计算开始");
      busy(600);
      status.textContent = "后续计算完成";
      log("后续任务：重计算结束");
    }, 0);
  });
});

document.querySelector("#clear").addEventListener("click", () => {
  sequence = 0;
  logBox.textContent = "";
  status.textContent = "日志已清空";
});

document.addEventListener("visibilitychange", () => {
  log(`可见性变为 ${document.visibilityState}`);
});
```

### 6.4 运行与预期

“记录顺序”中，同步开始/结束先出现，两个微任务在后续任务前出现。rAF、计时器与 MessageChannel 的相对位置记录实际结果，不写成所有运行时都相同。

“同步阻塞”通常来不及显示中间状态；“Promise阻塞”也仍会卡住，因为微任务在呈现机会前运行；“先给呈现机会”更容易让等待状态出现，但600ms后续任务仍造成卡顿。

用 Performance 录制三种按钮，保留主线程长片段与截图。切到后台再回来，记录 rAF/定时器被节流的实际表现。

## 7. 邻里集市集成案例

模拟5000件本地商品的搜索，先只计算结果数，不创建5000个 DOM：

```js
const listings = Array.from({ length: 5000 }, (_, index) => ({
  id: `listing-${index + 1}`,
  title: index % 2 === 0 ? `自行车 ${index + 1}` : `台灯 ${index + 1}`,
  priceCents: 1000 + index,
  createdAt: "2026-10-10T08:00:00.000Z",
}));

function search(query) {
  return listings.filter((item) => item.title.includes(query));
}
```

这是内存演示数据，页面必须标明。真实列表仍由 `/api/v1/listings?page=...` 分页，不能下载全部数据后假装服务端搜索。

集成流程：

1. 输入事件只更新查询状态。
2. 取消或忽略过期请求，避免旧结果覆盖新结果。
3. 本地重计算若超过一帧预算，减量、分片或交给 Worker。
4. DOM 更新只渲染当前页/可见项。
5. “加载中”“空”“失败”“成功”是互斥可观察状态。

事件循环只能解释调度，不能解决后端查询慢或对象授权。

## 8. 常见错误与排查路径

### 明确错误示例

```js
// 错误：把每个重片段继续塞进微任务，渲染仍可能饥饿。
function process(items) {
  if (items.length === 0) return;
  doHeavyWork(items.shift());
  queueMicrotask(() => process(items));
}
```

修复方向：减小总工作；按时间预算在后续任务中分片；需要并行计算时使用 Worker；每片之间允许输入和渲染。

### 诊断记录

| 字段 | 本次记录 |
| --- | --- |
| 现象 | 状态从“准备”直接变“Promise完成”，中间不可见且按钮卡住 |
| 证据 | Performance显示点击任务后连续微任务600ms；无中间帧 |
| 原因 | Promise回调仍在主线程微任务检查点执行 |
| 修复 | 删除不必要计算；剩余工作分到后续任务并限制每片预算 |
| 复验 | 中间状态可见；每片低于预算；点击其他按钮可响应 |

排查顺序：记录输入动作 → 看主线程任务 → 展开微任务 → 查帧和截图 → 检查后台/节流 → 减量或改调度 → 使用同一数据复验。

## 9. 课后题

<details>
<summary>1. `await Promise.resolve()` 能保证先绘制吗？</summary>

不能。它恢复于微任务，通常仍在渲染机会前继续执行。

</details>

<details>
<summary>2. `setTimeout(fn, 0)` 为什么可能过很多毫秒才执行？</summary>

0是最小延迟语义的一部分，回调还要等待当前任务、微任务、其他调度与浏览器节流；嵌套定时器也可能被夹紧。

</details>

<details>
<summary>3. rAF 回调执行时，回调前设置的文本是否保证已经显示？</summary>

不保证。rAF 在绘制前运行；回调前的 DOM 状态可用于本次渲染，但像素显示要到后续绘制与合成。

</details>

<details>
<summary>4. Promise 是否把计算放到另一个线程？</summary>

否。Promise规定异步结果组合与微任务回调，回调默认仍在当前 JavaScript 主线程执行。

</details>

## 10. 实践练习

### 基础

在“记录顺序”中再加入一个嵌套微任务，先写预测再运行三次。答案标准：同步先完成，微任务检查点内按实际入队顺序记录；跨任务源只描述观测。

### 进阶

把5000项搜索按5ms预算分片，每片结束用 `setTimeout(..., 0)` 继续，并提供取消令牌。答案标准：新查询能停止旧工作，页面显示进度，最终结果与同步版本一致。

### 故障注入

编写一个最多追加10000次的微任务链，记录页面无响应后恢复，绝不做无限循环。答案标准：Performance 能看到微任务占用；修复后分片且按钮在处理中可响应。

## 11. 阶段验收

- [ ] 三个完整文件可运行，四种按钮结果可复现。
- [ ] 能预测同步与微任务的必然约束。
- [ ] 不把 rAF 说成“上一帧已画完”的通知。
- [ ] 不把 Promise 说成后台线程。
- [ ] 至少保存一次同步、微任务和后续任务的 Performance 对比。
- [ ] 练习中的分片可取消，不会旧搜索覆盖新结果。
- [ ] 明确浏览器与 Node 事件循环规则不可机械互换。
- [ ] 后台标签页和非 Chromium 行为标为未验证。

## 12. 常见问题

**可否用两个 rAF 保证用户看见中间状态？**
它常用于跨帧安排，但可见性、后台节流和渲染策略仍影响结果。业务不应依赖“用户必定肉眼看到一帧”完成正确性。

**`queueMicrotask` 与 `Promise.then` 有什么差别？**
都进入微任务，但创建对象、异常报告语义等不同。选择应依据意图；都不适合重计算。

**为什么 aria-live 日志本身也可能影响实验？**
大量文本更新会增加 DOM、布局和辅助技术处理成本。正式测量应减少日志量，并把调试开销纳入说明。

**Node 中顺序为什么不同？**
Node 有阶段、`process.nextTick`、I/O 等自己的规则。只复用“不要阻塞线程”的原则，具体顺序查 Node 文档并单独实验。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [WHATWG HTML: Event loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)：任务、微任务与更新渲染。
- [HTML: Animation frames](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#animation-frames)：rAF 处理模型。
- [MDN JavaScript execution model](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Execution_model)：执行模型概览。
- [MDN `queueMicrotask`](https://developer.mozilla.org/en-US/docs/Web/API/Window/queueMicrotask)：微任务接口。
- [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)：后台状态。
- [Node.js event loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)：Node 运行时差异。

`scheduler.yield()` 等新调度接口需查目标浏览器支持，不作为本课完成的硬依赖。Safari、Firefox、60Hz以外屏幕和低端移动设备未验证。

## 我现在能做到什么

我能按当前任务、微任务检查点、后续任务和呈现机会预测浏览器执行约束，能证明 Promise 没有把重计算移出主线程，并能用可取消分片让邻里集市搜索保留状态反馈与交互机会。

## 单元导航

[上一课：DOM、CSSOM、布局、绘制与合成](01-dom-cssom-layout-paint-composite.md) · [下一课：长任务、布局抖动与动画](03-long-tasks-layout-thrashing-animation.md) · [本章目录](../README.md#02-渲染事件循环与交互)
