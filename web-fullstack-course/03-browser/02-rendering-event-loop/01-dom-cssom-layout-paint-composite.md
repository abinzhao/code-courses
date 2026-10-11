# 01 DOM、CSSOM、布局、绘制与合成：从结构变化追到屏幕

## 任务卡

邻里集市把商品卡片的价格改成红色，开发者却说“只改颜色，所以浏览器一定只绘制”；另一处用 `opacity: 0` 隐藏按钮，键盘仍能聚焦。你的任务是建立可观察的渲染模型，区分结构、样式、几何、像素与图层，并为每个结论保留 DevTools 证据。

| 产出 | 完成标准 | 证据 |
| --- | --- | --- |
| 渲染观察页 | Node/HTML/JS 可直接运行 | 页面与终端 |
| 变化分类 | 样式、布局、绘制、合成分别有案例 | Performance/Rendering 记录 |
| 可访问隐藏修复 | 不可见控件不再误接收操作 | 键盘与 DOM 记录 |
| 项目卡片 | 金额、时间和状态符合统一契约 | Elements 与 Console |

建议投入 90～120 分钟。浏览器内部实现会优化和合并工作，本课要求解释证据，不要求背引擎私有函数名。

## 1. 任务背景

浏览器从网络取得 HTML、CSS 和脚本后，建立可操作的数据结构，并在需要时计算样式、几何和像素。常用教学模型如下：

```text
HTML → DOM ┐
           ├→ 样式计算 → 布局 → 绘制 → 合成 → 屏幕
CSS  → CSSOM┘
```

这不是每次更新都完整执行的固定流水线：

- 解析、样式和布局可以增量进行。
- 不影响几何的变化可能跳过布局。
- 某些已有图层的 `transform`/`opacity` 变化可能主要由合成处理。
- 浏览器可能合并多次 DOM 写入，也可能因同步读取被迫提前计算。
- 图层提升取决于实现、内存和场景，CSS 属性本身不构成保证。

开发者工具记录的是特定浏览器、特定运行的一次证据；“通常如此”不能写成“标准保证”。

## 2. 学习目标

- 区分 HTML 源、DOM、CSSOM、计算样式、布局盒、绘制记录和合成图层。
- 解释 DOM 树、渲染相关结构与无障碍树不是同一个对象。
- 使用 `getComputedStyle()` 和 `getBoundingClientRect()` 分别观察计算样式与几何。
- 判断 `display: none`、`visibility: hidden`、`opacity: 0` 的占位、命中与可访问边界。
- 说明改 class 可能引发哪些工作，但不对引擎做无证据承诺。
- 使用 Performance、Rendering 和 Layers/3D 相关工具观察布局、绘制与合成。
- 为图片预留尺寸，避免邻里集市卡片加载时发生不必要位移。
- 明确 `will-change`、图层数量和 GPU 不是“越多越快”。

## 3. 预备知识

- 完成 HTML DOM 与 CSS 盒模型相关章节。
- 理解本卷 [browser-lab 契约](../README.md#多文件实验怎样启动)。
- 使用 Chromium DevTools；其他浏览器面板名称可能不同。

创建：

```text
practice/browser-04-rendering/
  server.mjs
  public/
    index.html
    app.js
```

运行 `node server.mjs`，打开 `http://127.0.0.1:3300/`。Performance 录制前先关闭无关标签，记录浏览器版本、缩放比例和是否开启节流。

## 4. 核心理论

### 4.1 DOM 与 CSSOM

HTML 解析建立 DOM 节点树；CSS 解析建立规则与样式表模型。选择器匹配、层叠、继承和变量替换共同得到元素的计算样式。`element.style` 只表示内联声明，不是最终样式；最终值通过 `getComputedStyle(element)` 观察。

DOM 中存在不代表一定生成布局盒。例如 `display: none` 的元素仍是 DOM 节点，但通常不参与布局。伪元素可能参与视觉，却不是普通 DOM 子节点。

### 4.2 布局回答几何问题

布局确定盒的尺寸与位置，受包含块、字体、内容、视口和其他盒约束。一次祖先尺寸变化可能影响大量后代；反过来，改变纯颜色通常不需重新计算几何。

`getBoundingClientRect()` 返回相对视口的边界矩形。滚动会改变结果；变换后的视觉边界也会反映其中。它不是数据库中的持久坐标。

### 4.3 绘制与合成

绘制把背景、边框、文字、阴影等转成绘制指令/像素工作。合成把不同表面按顺序、裁剪和变换组合。独立图层可以让部分动画避免主线程重绘，但图层占用内存并带来上传和管理成本。

`transform` 与 `opacity` 是合成友好的候选，不等于永远“只走 GPU”。滤镜、裁剪、混合、图层尺寸和设备资源都会改变结果。

### 4.4 可见、占位、命中与可访问是四个维度

| 技术 | 占据布局 | 可见 | 可能命中/聚焦 | 常见用途 |
| --- | --- | --- | --- | --- |
| `display: none` | 否 | 否 | 否 | 完全移除当前呈现 |
| `visibility: hidden` | 是 | 否 | 通常不可交互 | 保留空间 |
| `opacity: 0` | 是 | 否 | 是 | 动画过渡，需另管交互 |
| `hidden` 属性 | 通常否 | 否 | 否 | HTML 状态隐藏 |
| 仅移出屏幕 | 可能 | 不在视口 | 仍可能聚焦 | 视觉隐藏需谨慎设计 |

不能只改透明度就宣布弹窗关闭。还要管理焦点、命中、语义状态和必要的 DOM 属性。

## 5. 协议字段、API、事件、状态与安全边界清单

| 名称 | 观察内容 | 边界 |
| --- | --- | --- |
| `document.styleSheets` | 已加载样式表 | 跨源规则可能不可读 |
| `getComputedStyle()` | 解析后的计算样式 | 读取可能要求刷新样式 |
| `getBoundingClientRect()` | 视口相对几何 | 读取新几何可能触发同步工作 |
| `offsetWidth/Height` | 布局尺寸 | 包含边框且为整数；不是视觉变换全貌 |
| `matchMedia()` | 媒体查询状态 | 状态会变化，应监听需要的查询 |
| `ResizeObserver` | 尺寸变化通知 | 回调里反复改尺寸可形成循环 |
| `requestAnimationFrame()` | 下次呈现机会前回调 | 回调时不保证已绘制 |
| `PerformanceObserver` | 支持的性能条目 | 条目类型和字段有兼容差异 |
| DevTools Paint flashing | 重绘区域 | 工具本身会增加开销 |
| Layers/合成原因 | 图层与原因 | 面板和启发式随版本变化 |
| `hidden` / `inert` | 呈现与交互状态 | `inert` 支持需按目标浏览器核验 |

安全边界：DOM 文本来自用户时使用 `textContent`；渲染机制不消除 XSS。跨源样式表和像素读取可能受同源策略限制。

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

function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET" || !req.url?.startsWith("/") || req.url.startsWith("//")) {
      send(res, 400, "text/plain; charset=utf-8", "无效请求");
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1:3300");
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(root + sep) || !types[extname(file)]) {
      send(res, 404, "text/plain; charset=utf-8", "资源不存在");
      return;
    }
    send(res, 200, types[extname(file)], await readFile(file));
  } catch (error) {
    console.error(error);
    send(res, 500, "text/plain; charset=utf-8", "本地实验失败");
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
  <title>渲染阶段观察 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem; }
    .card {
      width: min(100%, 24rem);
      padding: 1rem;
      border: 2px solid #555;
      background: #fff;
      transition: transform 180ms ease, opacity 180ms ease;
    }
    .card.wide { width: min(100%, 38rem); }
    .card.alert { color: #a40000; background: #fff4f4; }
    .card.moved { transform: translateX(24px); }
    .card.transparent { opacity: 0; }
    .media {
      display: grid;
      place-items: center;
      aspect-ratio: 4 / 3;
      background: #d9e8f5;
    }
    button { margin: .25rem; }
    pre { white-space: pre-wrap; }
    @media (prefers-reduced-motion: reduce) {
      .card { transition: none; }
    }
  </style>
</head>
<body>
  <main>
    <h1>渲染阶段观察</h1>
    <p>本页是本地静态商品演示，不提供真实联系或预约。</p>
    <div>
      <button data-action="color" type="button">切换颜色</button>
      <button data-action="width" type="button">切换宽度</button>
      <button data-action="move" type="button">切换位移</button>
      <button data-action="opacity" type="button">切换透明</button>
      <button data-action="hidden" type="button">切换hidden</button>
      <button data-action="inspect" type="button">读取证据</button>
    </div>
    <article id="card" class="card">
      <div class="media" aria-label="商品图片位置">4:3 媒体区域</div>
      <h2>阅读台灯</h2>
      <p>价格：<data value="3900">39 元</data></p>
      <p>
        发布：
        <time datetime="2026-10-10T08:00:00.000Z">2026-10-10</time>
      </p>
      <button id="contact" type="button">演示按钮</button>
    </article>
    <p id="status" role="status">等待操作</p>
    <pre id="output"></pre>
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 6.3 完整文件：`public/app.js`

```js
const card = document.querySelector("#card");
const contact = document.querySelector("#contact");
const status = document.querySelector("#status");
const output = document.querySelector("#output");

const classes = {
  color: "alert",
  width: "wide",
  move: "moved",
  opacity: "transparent",
};

function inspect() {
  const style = getComputedStyle(card);
  const rect = card.getBoundingClientRect();
  output.textContent = JSON.stringify({
    className: card.className,
    hidden: card.hidden,
    computed: {
      display: style.display,
      color: style.color,
      opacity: style.opacity,
      transform: style.transform,
      width: style.width,
    },
    rect: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
    contactCanReceiveFocus: !card.hidden && !contact.disabled,
  }, null, 2);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (classes[action]) {
    card.classList.toggle(classes[action]);
    status.textContent = `已切换 ${action}；请录制并读取证据`;
  } else if (action === "hidden") {
    card.hidden = !card.hidden;
    status.textContent = card.hidden ? "卡片已从呈现与交互中隐藏" : "卡片已恢复";
  } else if (action === "inspect") {
    inspect();
    status.textContent = "已读取计算样式与几何";
  }
});

contact.addEventListener("click", () => {
  status.textContent = "演示按钮被触发；没有创建真实预约";
});

inspect();
```

### 6.4 运行与观察

1. 在 Rendering 打开 Paint flashing，分别切换颜色、宽度和位移。
2. 在 Performance 录制每次操作，查 Style/Recalculate Style、Layout、Paint、Composite 相关事件。
3. 点击“切换透明”后按 Tab。若按钮仍可聚焦，说明透明不等于关闭交互。
4. 再用 `hidden` 隐藏，确认卡片不占布局且按钮不进入顺序。
5. 每次点击“读取证据”，比较计算样式与几何。

事件名称和面板不保证每版相同。只记录实际看到的条目；没有出现独立 Layout 时，不虚构执行。

## 7. 邻里集市集成案例

卡片遵守统一领域约束：

- `data[value="3900"]` 表示3900分，展示为39元。
- `time[datetime]` 使用 UTC ISO 8601。
- 4:3 媒体区域预留空间，即使未来图片延迟到达，也不会从零高度突然撑开。
- 页面标明本地演示，不把按钮声称为真实联系或预约。

把服务返回的安全对象渲染进现有节点时：

```js
function renderListing(listing) {
  document.querySelector("h2").textContent = listing.title;
  const price = document.querySelector("data");
  price.value = String(listing.priceCents);
  price.textContent = `${(listing.priceCents / 100).toFixed(2)} 元`;
}
```

先校验 `priceCents` 是非负整数；示例只展示文本，不使用 `innerHTML`。视觉隐藏“编辑”按钮也不是授权，后端仍需检查 `ownerId`。

逐步扩展顺序：静态卡片 → class 切换 → 证据读取 → DevTools 录制 → 隐藏与键盘复验。不要一开始加入框架、动画库和网络请求。

## 8. 常见错误与排查路径

### 明确错误示例

```js
// 错误：视觉上消失，但按钮仍可能占位、聚焦和接收点击。
card.style.opacity = "0";
```

若目标是完全关闭内容，使用 `hidden` 或管理 `display`、焦点与语义；若目标是退场动画，动画结束后再切换真实隐藏状态，并处理取消和减少动画偏好。

### 诊断记录

| 字段 | 本次记录 |
| --- | --- |
| 现象 | 商品卡片看不见，Tab仍聚焦“演示按钮” |
| 证据 | Computed opacity为0；矩形仍存在；焦点落在 `#contact` |
| 原因 | 透明只改变像素合成，不移除布局和交互 |
| 修复 | 关闭状态使用 `hidden`；动画只负责过渡 |
| 复验 | 卡片无布局矩形，Tab不进入按钮；恢复后顺序正常 |

排查路径：

1. 在 Elements 确认目标节点与 class。
2. 在 Computed 查最终值与覆盖来源。
3. 读取几何，判断是否仍占布局。
4. 打开 Paint flashing/Performance，记录实际工作。
5. 用键盘和命中测试检查交互，不只看截图。
6. 最小修改后重复同一录制和操作。

不要用永久 `will-change: transform`、强制创建大量图层或删除可访问语义来“优化”一条未测量路径。

## 9. 课后题

<details>
<summary>1. DOM 中有节点是否保证有布局盒？</summary>

不保证。`display: none` 的节点仍在 DOM，但通常不生成布局盒；伪元素反过来可能产生视觉盒却不是普通 DOM 子节点。

</details>

<details>
<summary>2. transform 动画是否保证完全不触发绘制？</summary>

不保证。它通常是合成友好候选，但图层创建、内容失效、滤镜、设备资源和浏览器策略都会影响结果，应以录制为准。

</details>

<details>
<summary>3. 为什么 `element.style.width` 可能是空字符串，而页面有宽度？</summary>

它只读内联声明；宽度可能来自样式表、继承/初始值或布局。使用 Computed 与几何 API 观察不同层次。

</details>

<details>
<summary>4. 预留图片比例能消除所有布局偏移吗？</summary>

不能。它只处理媒体空间；字体、异步内容、广告和脚本插入仍可能改变布局，需要逐项诊断。

</details>

## 10. 实践练习

### 基础

增加“切换边框宽度”按钮并录制。答案标准：能说明几何是否变化、是否观察到 Layout/Paint，并保留一次实际记录。

### 进阶

实现卡片退场：尊重 `prefers-reduced-motion`，普通模式先透明/位移，动画结束后 `hidden=true`；再次显示时恢复顺序。答案标准：重复点击可取消旧动画，隐藏后不可聚焦。

### 故障注入

给50张卡片永久添加 `will-change: transform`，观察图层和内存后恢复。答案标准：不以帧率一次变高作为结论，记录图层/内存成本并移除无必要提示。

## 11. 阶段验收

- [ ] 三个完整文件可在本机运行。
- [ ] 能区分源、DOM、CSSOM、计算样式、布局、绘制和合成。
- [ ] 颜色、宽度、位移、透明与 hidden 都有可重复观察。
- [ ] 至少保存一条 Performance 录制和环境说明。
- [ ] 不把教学模型写成浏览器每次必走的固定流水线。
- [ ] 透明卡片的交互问题已修复并用键盘复验。
- [ ] 商品金额、时间、演示边界符合项目契约。
- [ ] 记录了 Chromium 之外和真实设备未验证。

## 12. 常见问题

**为什么读取几何有时会变慢？**
若前面有影响布局的待处理写入，浏览器为了返回最新值可能同步更新样式和布局。读写批处理在第三课验证。

**Layers 面板找不到怎么办？**
DevTools 入口会变化。使用命令菜单搜索 Layers，或用 Performance 的合成信息；记录工具不可用，不伪造结果。

**`content-visibility` 能否直接解决长列表？**
它可跳过部分离屏渲染，但有尺寸、查找、可访问和兼容边界。长列表还要考虑数据量、DOM 数量和交互状态。

**CSS 动画是不是一定比 JS 快？**
不是。性能取决于属性、工作量和调度。CSS 与 WAAPI 也可能触发布局/绘制；先测实际路径。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN: How browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)：解析与渲染概览。
- [CSSOM](https://drafts.csswg.org/cssom/) 与 [CSSOM View](https://drafts.csswg.org/cssom-view/)：样式表、计算样式和几何接口。
- [Chrome: Rendering performance](https://developer.chrome.com/docs/devtools/rendering/performance/)：渲染诊断工具。
- [Chrome: Performance panel](https://developer.chrome.com/docs/devtools/performance/)：录制主线程和帧。
- [MDN `hidden`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/hidden) 与 [`inert`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inert)：隐藏与交互状态。
- [Web Content Accessibility Guidelines](https://www.w3.org/TR/WCAG22/)：可感知与可操作要求。

兼容边界：合成启发式和 DevTools 是实现细节；Firefox/Safari、低端 GPU、屏幕阅读器和真实移动设备仍需单独验收。

## 我现在能做到什么

我能把 DOM、样式、几何、绘制和合成分层观察，使用计算样式、矩形和 DevTools 记录解释一次变化，并能修复“透明但仍可操作”的商品卡片，而不对浏览器内部优化做无证据承诺。

## 单元导航

[章目录：渲染与事件循环](../README.md#02-渲染事件循环与交互) · [下一课：任务、微任务与呈现机会](02-tasks-microtasks-rendering-opportunities.md) · [浏览器卷](../README.md)
