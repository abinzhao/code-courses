# 03 长任务、同步布局与稳定动画：先测瓶颈再分片和批处理

## 任务卡

邻里集市一次渲染300张卡片。点击“紧凑模式”后，脚本逐张写宽度再读尺寸，交互明显卡顿；顶部提示条动画还按“每帧移动2像素”编写，在高刷新率设备上速度不同。本课用 Performance 和测量 API 建立基线，再分别修复长任务、读写交替与帧率相关动画。

| 产出 | 完成标准 | 证据 |
| --- | --- | --- |
| 可控故障页 | 长任务和布局读写交替可复现 | Performance trace |
| 批处理修复 | 相同结果下减少同步布局压力 | 前后对比 |
| 可取消动画 | 使用时间增量，尊重减少动画 | 运行记录 |
| 诊断报告 | 环境、输入、指标与限制齐全 | 五字段记录 |

建议投入 100～130 分钟。实验按钮故意制造最多500ms阻塞；不要在低电量或有未保存工作时连续触发。

## 1. 任务背景

主线程既执行 JavaScript，也参与样式、布局、绘制和输入处理。一个长时间不返回的任务会推迟点击、键盘、滚动和渲染。常见来源：

- 一次处理过多数据或 DOM。
- 算法复杂度过高。
- DOM 写入与布局读取交替，迫使浏览器反复提供最新几何。
- 在每帧执行过多工作。
- 日志、开发模式和扩展本身增加开销。

“长任务”常以超过50ms的任务条目讨论，但用户体验不由一个阈值完全决定。连续多个较短任务也会造成输入延迟；一次离线初始化长任务与点击处理长任务影响不同。

## 2. 学习目标

- 在 Performance 中定位长任务、脚本栈、样式和布局工作。
- 使用 Long Tasks API（可用时）和 User Timing 辅助记录，不把工具缺失当通过。
- 解释“写样式后读几何”为什么可能强制同步更新。
- 把批量读取与批量写入分开，并优先考虑 CSS 布局。
- 按时间预算分片，允许输入与渲染，不改变结果顺序。
- 用 rAF 时间戳计算动画进度，避免按帧数决定速度。
- 取消旧动画，处理页面隐藏和 `prefers-reduced-motion`。
- 用同一数据、同一设备和多次运行比较前后，不只挑最好数字。

## 3. 预备知识

先完成[任务与微任务](02-tasks-microtasks-rendering-opportunities.md)。创建：

```text
practice/browser-06-performance/
  server.mjs
  public/
    index.html
    app.js
```

运行 `node server.mjs`，打开 `http://127.0.0.1:3300/`。关闭无关扩展和标签，记录浏览器版本、CPU 节流、视口和数据量。先热身一次，再至少测三次。

## 4. 核心理论

### 4.1 长任务与输入延迟

当主线程正在执行任务，新的输入只能等待。把500ms任务移到另一个普通任务，只改变开始时机，不减少500ms阻塞。优先级顺序通常是：

1. 删除不必要工作。
2. 降低算法复杂度和数据量。
3. 减少 DOM 数量与更新范围。
4. 将可并行的纯计算交给 Worker。
5. 对剩余主线程工作按预算分片。

### 4.2 强制同步布局

浏览器可推迟并合并样式/布局。但下面的交替会要求每轮读到最新宽度：

```js
for (const card of cards) {
  card.style.width = `${card.offsetWidth + 1}px`;
}
```

写入使几何可能失效，紧接着的 `offsetWidth` 要求最新结果。改成“先全部读，再全部写”通常更容易批处理：

```js
const widths = cards.map((card) => card.offsetWidth);
cards.forEach((card, index) => {
  card.style.width = `${widths[index] + 1}px`;
});
```

但最好的修复可能是不读写宽度，直接切换容器 class 让 CSS Grid 处理。

### 4.3 动画按时间而不是帧数

刷新率可能是60、90、120Hz，帧也可能丢失。固定“每帧加2”会改变实际速度。rAF 提供时间戳：

```text
progress = clamp((timestamp - start) / duration, 0, 1)
position = easing(progress) × distance
```

页面隐藏时 rAF 常暂停。恢复后时间跨度可能很大，动画应按目标语义完成、暂停或重新开始，不能无限追帧。

### 4.4 测量本身有成本

Performance trace、Console 和 Paint flashing 都增加开销。优化结论应包含：

- 相同输入和环境。
- 至少三次运行，报告中位数或分布。
- 结果正确性不变。
- 不只看总时长，还看输入、长任务、布局次数和帧。

## 5. 协议字段、API、事件、状态与安全边界清单

| 名称 | 用途 | 边界 |
| --- | --- | --- |
| `performance.mark/measure` | 自定义阶段计时 | 不直接解释用户体验 |
| `PerformanceObserver` | 观察支持的条目 | `longtask` 兼容性有限 |
| `PerformanceLongTaskTiming` | 主线程长任务线索 | 归因信息受安全限制 |
| `requestAnimationFrame` | 与渲染更新协调动画 | 后台暂停；回调仍占主线程 |
| `cancelAnimationFrame` | 取消待执行回调 | 还要恢复最终 UI 状态 |
| `matchMedia` | 检查减少动画偏好 | 偏好可动态变化 |
| `Document.visibilityState` | 页面前后台状态 | 不是保存业务状态的信号 |
| `getBoundingClientRect` | 几何读取 | 可能要求同步布局 |
| `DocumentFragment` | 批量构建节点 | 插入后仍有渲染成本 |
| `scheduler.yield` | 新调度能力 | 需特性检测和回退 |

安全边界：性能条目可能因跨源和隐私策略减少精度；不要用耗时差异暴露敏感对象是否存在。优化不能绕过输出编码、权限或正确性校验。

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
  <title>长任务与布局实验 · 邻里集市</title>
  <style>
    body { font: 16px/1.5 system-ui, sans-serif; margin: 1rem; }
    button { margin: .2rem; }
    #indicator {
      width: 2rem;
      height: .5rem;
      background: #075a9c;
      transform: translateX(0);
    }
    #list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
      gap: .5rem;
      margin-top: 1rem;
    }
    .card { padding: .5rem; border: 1px solid #777; }
    .compact .card { font-size: .875rem; padding: .25rem; }
    pre { white-space: pre-wrap; }
    @media (prefers-reduced-motion: reduce) {
      #indicator { transform: none !important; }
    }
  </style>
</head>
<body>
  <main>
    <h1>长任务、布局与动画</h1>
    <button id="long" type="button">制造500ms长任务</button>
    <button id="thrash" type="button">交替读写宽度</button>
    <button id="batch" type="button">批量读后写</button>
    <button id="css" type="button">只切换CSS紧凑类</button>
    <button id="chunk" type="button">分片计算</button>
    <button id="animate" type="button">运行动画</button>
    <button id="cancel" type="button">取消动画</button>
    <div id="indicator" aria-hidden="true"></div>
    <p id="status" role="status">准备就绪</p>
    <pre id="metrics"></pre>
    <section id="list" aria-label="本地演示商品"></section>
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 6.3 完整文件：`public/app.js`

```js
const list = document.querySelector("#list");
const status = document.querySelector("#status");
const metrics = document.querySelector("#metrics");
const indicator = document.querySelector("#indicator");
let animationId = 0;
let chunkRun = 0;

const fragment = document.createDocumentFragment();
for (let index = 0; index < 300; index += 1) {
  const article = document.createElement("article");
  article.className = "card";
  const title = document.createElement("h2");
  title.textContent = `演示商品 ${index + 1}`;
  const price = document.createElement("p");
  price.textContent = `${(1000 + index) / 100} 元`;
  article.append(title, price);
  fragment.append(article);
}
list.append(fragment);

function cards() {
  return [...document.querySelectorAll(".card")];
}

function measure(label, operation) {
  const start = performance.now();
  operation();
  const duration = performance.now() - start;
  metrics.textContent += `${label}: ${duration.toFixed(1)}ms\n`;
  status.textContent = `${label}完成`;
}

document.querySelector("#long").addEventListener("click", () => {
  measure("长任务", () => {
    const end = performance.now() + 500;
    while (performance.now() < end) Math.sqrt(12345);
  });
});

document.querySelector("#thrash").addEventListener("click", () => {
  measure("交替读写", () => {
    for (const card of cards()) {
      card.style.width = `${card.offsetWidth + 1}px`;
    }
  });
});

document.querySelector("#batch").addEventListener("click", () => {
  measure("批量读写", () => {
    const elements = cards();
    const widths = elements.map((card) => card.offsetWidth);
    elements.forEach((card, index) => {
      card.style.width = `${widths[index] + 1}px`;
    });
  });
});

document.querySelector("#css").addEventListener("click", () => {
  measure("CSS类切换", () => list.classList.toggle("compact"));
});

document.querySelector("#chunk").addEventListener("click", () => {
  chunkRun += 1;
  const run = chunkRun;
  let index = 0;
  let checksum = 0;
  status.textContent = "分片计算中";
  function processChunk() {
    if (run !== chunkRun) return;
    const deadline = performance.now() + 5;
    while (index < 200000 && performance.now() < deadline) {
      checksum = (checksum + Math.sqrt(index + 1)) % 100000;
      index += 1;
    }
    status.textContent = `分片进度 ${Math.round(index / 2000)}%`;
    if (index < 200000) {
      setTimeout(processChunk, 0);
    } else {
      status.textContent = `分片完成，校验 ${checksum.toFixed(2)}`;
    }
  }
  processChunk();
});

document.querySelector("#animate").addEventListener("click", () => {
  cancelAnimationFrame(animationId);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    indicator.style.transform = "none";
    status.textContent = "已按减少动画偏好跳过位移";
    return;
  }
  const start = performance.now();
  const duration = 600;
  function frame(timestamp) {
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    indicator.style.transform = `translateX(${eased * 240}px)`;
    if (progress < 1) {
      animationId = requestAnimationFrame(frame);
    } else {
      animationId = 0;
      status.textContent = "动画完成";
    }
  }
  animationId = requestAnimationFrame(frame);
});

document.querySelector("#cancel").addEventListener("click", () => {
  cancelAnimationFrame(animationId);
  animationId = 0;
  chunkRun += 1;
  indicator.style.transform = "translateX(0)";
  status.textContent = "动画与分片任务已取消并复位";
});

if ("PerformanceObserver" in window) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        metrics.textContent += `longtask: ${entry.duration.toFixed(1)}ms\n`;
      }
    });
    observer.observe({ type: "longtask", buffered: true });
  } catch {
    metrics.textContent = "当前浏览器未提供 longtask 观察。\n";
  }
}
```

### 6.4 运行与前后对比

先清除内联宽度：在 Console 执行：

```js
document.querySelectorAll(".card").forEach((card) => card.style.width = "");
```

分别录制交替读写、批量读写和 CSS 类切换，每种至少三次并在每次前恢复相同状态。观察：

- JavaScript 自测时长。
- Performance 中 Layout/Forced reflow 线索及次数。
- 长任务标记与帧。
- 最终卡片宽度/紧凑状态是否满足同一目标。

自测时间不包含所有异步渲染工作，因此必须与 trace 合看。

## 7. 邻里集市集成案例

300张卡片是本地生成的演示，不是真实接口结果。真实列表遵循：

```text
GET /api/v1/listings?page=1&pageSize=20&q=
```

前端优化顺序：

1. 使用服务端分页，避免一次下载和创建全部商品。
2. 更新当前页时复用/替换必要节点，不逐项测宽。
3. 让 Grid/Flex 负责卡片布局。
4. 搜索竞态用 AbortController 或请求序号处理。
5. 大型纯计算经过测量后再考虑 Worker。

示例价格只在展示层格式化；权威值仍是整数分。虚拟列表若使用，还必须验收键盘、焦点、滚动定位和辅助技术，不以 DOM 少作为唯一成功标准。

## 8. 常见错误与排查路径

### 明确错误示例

```js
// 错误：速度依赖刷新次数，掉帧时还会明显变慢。
function frame() {
  x += 2;
  indicator.style.transform = `translateX(${x}px)`;
  requestAnimationFrame(frame);
}
```

修复为按 rAF 时间戳计算进度，并在完成、取消、减少动画或组件销毁时停止循环。

### 诊断记录

| 字段 | 本次记录 |
| --- | --- |
| 现象 | 切换卡片宽度时点击无响应约300ms |
| 证据 | Performance中脚本循环夹杂多次Layout；源代码逐项写后读 |
| 原因 | 读写交替要求最新几何，且300个节点工作过多 |
| 修复 | 删除逐项尺寸逻辑，改为容器CSS类；保留分页20项 |
| 复验 | 相同视口和数据下三次中位数下降；结果和键盘顺序不变 |

固定路径：复现并锁输入 → 录制主线程 → 找最长任务与调用栈 → 判断计算/DOM/布局/绘制 → 做单一修改 → 比较至少三次 → 回归结果、键盘和减少动画。

## 9. 课后题

<details>
<summary>1. 把500ms工作放进 setTimeout 是否消除了长任务？</summary>

没有，只把它推迟到后续任务。执行时仍连续占用主线程500ms。

</details>

<details>
<summary>2. 为什么批量读写仍不一定是最佳修复？</summary>

它只是减少交替。若宽度可由CSS表达，完全删除JS几何读写更简单且成本更低。

</details>

<details>
<summary>3. 每帧移动2px为什么在120Hz更快？</summary>

一秒回调次数更多，按帧累加的距离更大。按时间戳计算可使相同持续时间得到相同进度。

</details>

<details>
<summary>4. 一次 trace 变快能否证明优化成功？</summary>

不能。需要同环境多次、相同输入、正确性回归，并考虑工具开销和波动。

</details>

## 10. 实践练习

### 基础

为三个方案各测五次，报告中位数、最小/最大值及浏览器环境。答案标准：每次恢复相同状态，不只选择最好结果。

### 进阶

给分片计算加入“重新开始”按钮，新任务必须取消旧 run；最终校验值应与同步算法相同。答案标准：处理中仍能点击取消，旧任务不会写入最终状态。

### 故障注入

把动画回调内加入20ms busy loop，录制掉帧后恢复。答案标准：指出 rAF 只协调时机，不能让重工作免费；移除 busy 后再次录制并尊重减少动画。

## 11. 阶段验收

- [ ] 三个完整文件可以启动并生成300张演示卡。
- [ ] 长任务、交替读写、批量读写、CSS切换均有真实记录。
- [ ] 优化对比至少三次且环境一致。
- [ ] 分片任务可取消、结果可校验、不会无限排队。
- [ ] 动画按时间戳推进，可取消并处理减少动画。
- [ ] 真实集成采用分页，不把300项演示当接口契约。
- [ ] 优化后功能、键盘、价格和时间语义未退化。
- [ ] 非 Chromium、真实低端设备和辅助技术缺口明确记录。

## 12. 常见问题

**50ms是不是绝对性能预算？**
不是。它是 Long Tasks API 的定义门槛和有用线索，交互预算还受刷新率、设备、任务序列和产品目标影响。

**`innerHTML` 一次写入会不会一定更快？**
不能保证，而且用户内容会带来XSS风险。先测性能；动态文本使用安全 DOM API，不为微小速度放弃安全。

**Worker 能解决布局抖动吗？**
不能直接操作 DOM 或执行页面布局。它适合可序列化纯计算；主线程仍负责应用结果和渲染。

**为什么 CSS 类切换也可能有布局成本？**
类规则若改变尺寸，浏览器仍需更新布局。优势是声明式表达和减少逐项JS读写，不是“零成本”。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Long Tasks API](https://w3c.github.io/longtasks/)：长任务条目定义。
- [MDN PerformanceObserver](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)：性能条目观察。
- [User Timing Level 3](https://www.w3.org/TR/user-timing-3/)：mark 与 measure。
- [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)：时间戳和后台行为。
- [Chrome: Diagnose forced synchronous layouts](https://developer.chrome.com/docs/performance/insights/forced-reflow)：强制布局诊断。
- [web.dev: Optimize long tasks](https://web.dev/articles/optimize-long-tasks)：减量与分片实践。

兼容边界：Long Tasks API、DevTools 标签和调度 API 支持不同；Safari/Firefox、120Hz设备、低端手机、屏幕阅读器和真实商品规模未验证。

## 我现在能做到什么

我能通过 Performance、User Timing 和可用的长任务条目定位主线程瓶颈，区分重计算与同步布局；能用 CSS、批处理、可取消分片和按时间推进的动画完成最小修复，并用同一输入复验正确性与交互。

## 单元导航

[上一课：任务、微任务与呈现机会](02-tasks-microtasks-rendering-opportunities.md) · [章入口：渲染与事件循环](../02-rendering-event-loop.md) · [下一章：存储与安全](../03-storage-security.md)
