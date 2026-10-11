# SVG、Canvas 与可访问图形

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 在可缩放图形和像素表面之间做选择，为 Canvas 提供尺寸、高清绘制与等价替代。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `MED-014`、`MED-015` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

在可缩放图形和像素表面之间做选择，为 Canvas 提供尺寸、高清绘制与等价替代。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 MED-014（HTML 中的 SVG 与外部 SVG）、MED-015（Canvas 尺寸、像素、跨源污染与替代）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 内联 SVG 与外部 SVG

SVG 使用矢量形状描述图形。常见引入方式：

| 方式 | 父页能否直接查询内部形状 | 文本替代入口 | 适用场景 |
| --- | --- | --- | --- |
| 内联 `<svg>` | 可以 | `title`、`desc`、ARIA、可见文字 | 需要逐元素样式、脚本或与页面语义关联 |
| `<img src="diagram.svg" alt="...">` | 不可以 | HTML `alt` | 静态图像，缓存和复用方便 |
| `<object data="diagram.svg">` | 视源和策略而定 | 回退内容及 SVG 自身语义 | 需要独立文档行为且可接受兼容差异 |
| CSS `background-image` | 不作为内容暴露 | 由相邻 HTML 承担 | 纯装饰背景 |

信息型内联 SVG 的稳妥起点：

```html
<svg
  viewBox="0 0 320 180"
  role="img"
  aria-labelledby="lamp-title lamp-desc">
  <title id="lamp-title">台灯结构示意</title>
  <desc id="lamp-desc">
    圆形底座连接竖直灯臂，灯臂顶部连接向右下方照射的灯罩。
  </desc>
  <circle cx="100" cy="150" r="45" fill="#5b7c6f"></circle>
  <path d="M100 140V65L180 35" fill="none" stroke="#263c34" stroke-width="12"></path>
  <path d="M165 20L245 70H145Z" fill="#d97745"></path>
</svg>
```

`viewBox` 建立内部坐标系，使图形可随 CSS 尺寸缩放。`role="img"` 让整体按图像理解；`aria-labelledby` 把短标题和长描述关联到整体。不同辅助技术组合的行为仍需实测，可见文字说明是复杂图形最稳定的补充。

注意：

- 内联 SVG 没有 HTML `alt` 属性；
- `title` 应短，`desc` 用于较长结构或结论；
- 外部 SVG 通过 `img` 显示时，父页必须提供 `alt`，不能依赖外部文件内部的 `title`；
- 纯装饰 SVG 可使用 `aria-hidden="true"`，但必要信息必须在相邻 HTML 中存在；
- 不要把复杂交互全部塞进 SVG 而忽略焦点、键盘和状态提示；
- SVG 中的 `path`、`circle`、`rect` 属于 SVG 命名空间，不是 HTML 元素。

### 4.2 Canvas 的两种尺寸

Canvas 有一张内部位图，也有页面上的 CSS 显示盒：

```html
<canvas
  width="600"
  height="300"
  style="width: 300px; height: 150px;">
</canvas>
```

- HTML `width="600"`、`height="300"`：位图为 600 × 300 像素；
- CSS `width: 300px; height: 150px`：页面显示为 300 × 150 CSS 像素；
- 未写属性时，位图默认是 300 × 150；
- 只用 CSS 把默认位图放大，会拉伸像素并产生模糊；
- 运行时重新设置 `canvas.width` 或 `canvas.height` 会重建位图，并重置绘图状态、变换和已有内容，即使设置成原值也应按重置处理。

下面是典型错误：

```html
<!-- 错误案例：只扩大显示盒，内部仍可能是默认 300 × 150 -->
<canvas id="chart" style="width: 900px; height: 450px;"></canvas>
```

修复时同时规划 CSS 尺寸和位图尺寸，不要把它们当成同一件事。

### 4.3 `devicePixelRatio` 与高清绘制

在设备像素比为 2 的屏幕上，一个 400 × 200 CSS 像素的区域可能对应 800 × 400 个设备像素。常用步骤：

1. 读取 Canvas 的 CSS 尺寸；
2. 读取 `window.devicePixelRatio`；
3. 把位图属性设为 CSS 尺寸乘以 DPR；
4. 把 CSS 显示尺寸保持为原值；
5. 使用 `setTransform(dpr, 0, 0, dpr, 0, 0)`，继续按 CSS 像素坐标绘制；
6. 每次重建位图后重新取得或配置绘图上下文并完整重绘。

```js
const canvas = document.querySelector("#chart");
const rect = canvas.getBoundingClientRect();
const cssWidth = Math.max(1, Math.round(rect.width));
const cssHeight = 240;
const dpr = Math.max(1, window.devicePixelRatio || 1);

canvas.width = Math.round(cssWidth * dpr);
canvas.height = Math.round(cssHeight * dpr);
canvas.style.width = `${cssWidth}px`;
canvas.style.height = `${cssHeight}px`;

const context = canvas.getContext("2d");
if (context) {
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = "#263c34";
  context.fillRect(0, 0, cssWidth, cssHeight);
}
```

这里的缩放只解决位图清晰度，不会创造图表语义。DPR 还可能因窗口移动到另一块屏幕、浏览器缩放等条件发生变化，因此响应式图表应在尺寸改变后重新计算和绘制。

### 4.4 Canvas 的语义替代

Canvas 绘图命令修改像素，不会创建“柱条”“价格标签”这样的 DOM 子节点。下面的内容视觉上可能完整，非视觉用户却得不到数据：

```html
<!-- 错误案例：没有等价数据和图表说明 -->
<canvas id="price-chart" width="640" height="260"></canvas>
```

静态数据图至少应提供：

- 一个可见图表标题；
- 一段可见结论或趋势摘要；
- 一张含表头的语义表格；
- Canvas 自身与标题、摘要的关联；
- Canvas 不支持或脚本关闭时的回退文字。

价格数据应以整数分为业务源值：

```text
阅读台灯：3900 分
实木椅：5200 分
旧书套装：1800 分
```

显示时再除以 100 格式化为元。不要把 `39.00` 之类浮点元值作为业务计算源。

表格不是给图表“补一句 alt”，而是提供可检查的数据结构。仅写“这是一张价格图”没有传达每个商品的价格和比较结论。

### 4.5 `toDataURL()`、`getImageData()` 与污染画布

`toDataURL()` 把当前位图序列化为 `data:` URL；默认格式通常为 PNG。大画布会生成很长的字符串，生产导出更常考虑异步 `toBlob()`。

`getImageData(x, y, width, height)` 读取指定区域的像素数据。宽或高为 0 会产生尺寸错误；读取范围超出画布的部分按透明黑处理。

新 Canvas 的位图初始具有 origin-clean 状态。若把未经 CORS 授权的跨源图片、视频或其他像素源绘入 Canvas，该状态会变为不干净，通常不能恢复为可读状态；此时调用读取或导出 API会抛出 `SecurityError`：

```js
try {
  const firstPixel = context.getImageData(0, 0, 1, 1);
  const pngDataUrl = canvas.toDataURL("image/png");
  console.log(firstPixel.data, pngDataUrl.slice(0, 22));
} catch (error) {
  console.error(error.name, error.message);
}
```

这叫 tainted canvas。浏览器仍可显示已经画出的图像，但阻止页面读取像素，避免恶意站点借 Canvas 窃取其他来源的内容。

正确恢复路径只有两类：

1. 使用同源图像，或在当前页面生成的同源 `Blob`/Canvas；
2. 在设置 `src` 之前为图片设置 `crossOrigin = "anonymous"`，并让图片服务器返回匹配的 `Access-Control-Allow-Origin`。

```js
const image = new Image();
image.crossOrigin = "anonymous";
image.src = "https://assets.example/product/lamp.png";
```

只写 `crossOrigin` 不够。服务器没有正确 CORS 响应时，图片加载会失败；删掉 `crossOrigin` 也不是修复，因为图片虽然可能显示，却会污染画布。代理他人图片还涉及授权、缓存与隐私，不应把开放代理当成默认方案。

重设 `canvas.width`/`height` 会创建新位图，新的位图重新处于 origin-clean 状态，但之前的像素也全部丢失。这只是清空后重新开始，不是把已污染像素“洗干净”。

## 5. 元素、属性、API 或配置清单

### 5.1 SVG 与 Canvas

| 名称 | 作用 | 最小示例 | 关键边界 |
| --- | --- | --- | --- |
| `svg[viewBox]` | 建立矢量坐标系 | `viewBox="0 0 320 180"` | 有助于无损缩放 |
| SVG `title` | 短标题 | `<title>台灯结构</title>` | 不是可见正文 |
| SVG `desc` | 较长描述 | `<desc>底座连接灯臂</desc>` | 复杂信息仍提供可见文字 |
| `role="img"` | 将内联 SVG 作为整体图像 | `<svg role="img">` | 配合可访问名称 |
| `aria-labelledby` | 引用标题与说明 | `aria-labelledby="t d"` | ID 必须真实存在且唯一 |
| `canvas[width]` | 设置位图宽度 | `width="640"` | 不是 CSS 宽度 |
| `canvas[height]` | 设置位图高度 | `height="260"` | 重设会清空并重置状态 |
| `getContext("2d")` | 获取 2D 绘图上下文 | `canvas.getContext("2d")` | 可能返回 `null` |
| `window.devicePixelRatio` | CSS 像素与设备像素比例 | `window.devicePixelRatio || 1` | 可能随环境变化 |
| `setTransform()` | 设置当前变换 | `setTransform(dpr, 0, 0, dpr, 0, 0)` | 位图重建后重新设置 |
| `getImageData()` | 读取像素 | `getImageData(0, 0, 1, 1)` | 污染画布会抛 `SecurityError` |
| `toDataURL()` | 同步序列化位图 | `toDataURL("image/png")` | 污染画布不可导出；大图成本高 |
| `toBlob()` | 异步生成图片 Blob | `canvas.toBlob(callback)` | 也要求画布保持 origin-clean |

### 5.2 选择速查

| 场景 | 推荐 | 不推荐的替代 |
| --- | --- | --- |
| 商品实拍 | `img` | 用 Canvas 重画照片 |
| 简单结构图，需要无损缩放 | SVG | 超大位图 |
| 高频动画或大量像素绘制 | Canvas | 数万个 SVG DOM 节点 |
| 第三方地图 | 供应商允许时使用 `iframe`，同时给地址链接 | 尝试读取跨源地图 DOM |
| PDF 规则 | 首先给普通链接；可选 `object`/`iframe` 预览 | 只给 `embed` 且无链接 |
| 图片区域导航 | `map`/`area` 加普通链接 | 只提供不可见热点 |
| 普通章节导航 | `a` | 为导航创建 iframe |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/08-svg-canvas-graphics/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 MED-014（HTML 中的 SVG 与外部 SVG） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 MED-015（Canvas 尺寸、像素、跨源污染与替代） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

### 7.1 案例范围

本页组合四项能力：

```text
邻里集市媒体说明页
├── iframe：静态交接规则
├── map/area：商品分区热点
├── SVG：台灯结构示意
└── Canvas：整数分价格图
    ├── 可见文字摘要
    └── 语义价格表
```

页面中的三件商品是固定教学数据。JavaScript 只从当前 DOM 读取整数分并绘图；没有 `fetch()`、`localStorage`、Cookie、登录、收藏、预约、支付或写入服务器。

### 7.2 文件位置

```text
market-learning/
└── practice/
    └── html-09-embedding/
        └── index.html
```

把下面的完整文件保存为 `index.html`。它不需要其他图片、脚本或样式文件。

### 7.3 完整页面

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>商品媒体说明 · 邻里集市</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, sans-serif;
        color: #263c34;
        background: #faf8f2;
      }

      body {
        max-width: 72rem;
        margin: 0 auto;
        padding: 1.5rem;
        line-height: 1.6;
      }

      section {
        margin-block: 2.5rem;
      }

      iframe,
      img,
      svg,
      canvas {
        display: block;
        max-width: 100%;
      }

      iframe {
        width: 100%;
        min-height: 15rem;
        border: 2px solid #5b7c6f;
        border-radius: 0.75rem;
      }

      .map-image {
        width: 600px;
        height: auto;
      }

      .text-links ul {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem 1.5rem;
        padding-left: 1.25rem;
      }

      .product-diagram {
        width: min(100%, 32rem);
        height: auto;
        border: 1px solid #b8c6bf;
        background: #f4f0e6;
      }

      #price-chart {
        width: 100%;
        height: 260px;
        border: 1px solid #b8c6bf;
        background: #ffffff;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      caption {
        text-align: left;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }

      th,
      td {
        border: 1px solid #879b91;
        padding: 0.5rem;
        text-align: left;
      }

      a:focus-visible {
        outline: 3px solid #bd5d32;
        outline-offset: 3px;
      }
    </style>
  </head>
  <body>
    <header>
      <p>邻里集市 · 静态教学页</p>
      <h1>商品媒体说明</h1>
      <p>
        页面只展示固定教学数据，不会创建预约、完成支付或保存商品状态。
      </p>
    </header>

    <main>
      <section aria-labelledby="rules-heading">
        <h2 id="rules-heading">交接规则卡</h2>
        <p id="rules-note">
          规则卡是独立静态文档。空 sandbox 限制其能力，但不代表内容已经过安全审计。
        </p>
        <iframe
          title="邻里集市静态交接规则"
          aria-describedby="rules-note"
          sandbox
          allow="camera 'none'; microphone 'none'; geolocation 'none'; fullscreen 'none'"
          loading="eager"
          referrerpolicy="no-referrer"
          srcdoc='<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>静态交接规则</title>
    <style>
      body {
        margin: 0;
        padding: 1rem;
        font: 1rem/1.6 system-ui, sans-serif;
        color: #263c34;
        background: #f4f0e6;
      }
    </style>
  </head>
  <body>
    <h2>当面交接三步</h2>
    <ol>
      <li>选择公共地点。</li>
      <li>检查物品与配件。</li>
      <li>双方确认后完成交接。</li>
    </ol>
    <p>静态说明不代表预约或付款已经发生。</p>
  </body>
</html>'>
        </iframe>
        <p>文字摘要：公共地点见面，检查商品，双方确认后再交接。</p>
      </section>

      <section aria-labelledby="map-heading">
        <h2 id="map-heading">商品分区图</h2>
        <p>
          可以点击图中三个色块，也可以使用图后的普通链接。
        </p>
        <img
          class="map-image"
          src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgMjIwIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjIyMCIgZmlsbD0iI2Y0ZjBlNiIvPjxyZWN0IHg9IjMwIiB5PSIzMCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxNjAiIHJ4PSIyMCIgZmlsbD0iI2Q5Nzc0NSIvPjxyZWN0IHg9IjIyMCIgeT0iMzAiIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiByeD0iMjAiIGZpbGw9IiM1YjdjNmYiLz48cmVjdCB4PSI0MTAiIHk9IjMwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgcng9IjIwIiBmaWxsPSIjNmQ2YThkIi8+PGcgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj48dGV4dCB4PSIxMTAiIHk9IjEyMCI+5Y+w54GvPC90ZXh0Pjx0ZXh0IHg9IjMwMCIgeT0iMTIwIj7mnKjmpIU8L3RleHQ+PHRleHQgeD0iNDkwIiB5PSIxMjAiPuaXp+S5pjwvdGV4dD48L2c+PC9zdmc+"
          width="600"
          height="220"
          alt="三个商品分区，从左到右为台灯、木椅和旧书"
          usemap="#product-zones">
        <map name="product-zones" id="product-zones">
          <area
            shape="rect"
            coords="30,30,190,190"
            href="#lamp"
            alt="跳到阅读台灯说明">
          <area
            shape="rect"
            coords="220,30,380,190"
            href="#chair"
            alt="跳到实木椅说明">
          <area
            shape="rect"
            coords="410,30,570,190"
            href="#books"
            alt="跳到旧书套装说明">
        </map>

        <nav class="text-links" aria-label="商品分区文字导航">
          <ul>
            <li><a href="#lamp">阅读台灯</a></li>
            <li><a href="#chair">实木椅</a></li>
            <li><a href="#books">旧书套装</a></li>
          </ul>
        </nav>
      </section>

      <section id="lamp" aria-labelledby="lamp-heading">
        <h2 id="lamp-heading">阅读台灯结构图</h2>
        <svg
          class="product-diagram"
          viewBox="0 0 480 280"
          role="img"
          aria-labelledby="lamp-svg-title lamp-svg-desc">
          <title id="lamp-svg-title">阅读台灯结构示意</title>
          <desc id="lamp-svg-desc">
            左下方的圆形底座连接竖直灯臂，灯臂顶部向右连接橙色灯罩，
            灯罩下方有三条光线。图中标出底座、灯臂和灯罩。
          </desc>
          <rect width="480" height="280" fill="#f4f0e6"></rect>
          <circle cx="140" cy="230" r="58" fill="#5b7c6f"></circle>
          <path
            d="M140 210V95L270 55"
            fill="none"
            stroke="#263c34"
            stroke-width="16"
            stroke-linecap="round">
          </path>
          <path d="M245 30L375 100H220Z" fill="#d97745"></path>
          <g stroke="#bd5d32" stroke-width="5" stroke-linecap="round">
            <path d="M290 110L270 170"></path>
            <path d="M325 110L325 180"></path>
            <path d="M360 110L385 170"></path>
          </g>
          <g fill="#263c34" font-family="system-ui, sans-serif" font-size="18">
            <text x="35" y="245">底座</text>
            <text x="90" y="90">灯臂</text>
            <text x="365" y="45">灯罩</text>
          </g>
        </svg>
        <p>
          图示说明：底座支撑灯臂，灯臂连接灯罩；示意图不代表商品实拍或检测报告。
        </p>
      </section>

      <section id="chair" aria-labelledby="chair-heading">
        <h2 id="chair-heading">实木椅说明</h2>
        <p>固定教学商品，价格数据见下方表格；页面没有真实库存。</p>
      </section>

      <section id="books" aria-labelledby="books-heading">
        <h2 id="books-heading">旧书套装说明</h2>
        <p>固定教学商品，价格数据见下方表格；页面没有真实库存。</p>
      </section>

      <section aria-labelledby="chart-title">
        <h2 id="chart-title">商品价格比较</h2>
        <p id="chart-summary">
          三件商品中，实木椅价格最高，为 52.00 元；旧书套装最低，为 18.00 元。
          所有业务源值均为整数分。
        </p>

        <canvas
          id="price-chart"
          width="640"
          height="260"
          role="img"
          aria-labelledby="chart-title"
          aria-describedby="chart-summary">
          价格比较：阅读台灯 3900 分，实木椅 5200 分，旧书套装 1800 分。
          完整数据见紧随其后的价格表。
        </canvas>

        <table>
          <caption id="price-table-caption">商品价格源数据</caption>
          <thead>
            <tr>
              <th scope="col">商品</th>
              <th scope="col">整数分</th>
              <th scope="col">显示价格</th>
            </tr>
          </thead>
          <tbody id="price-data">
            <tr data-price-cents="3900">
              <th scope="row">阅读台灯</th>
              <td>3900</td>
              <td>39.00 元</td>
            </tr>
            <tr data-price-cents="5200">
              <th scope="row">实木椅</th>
              <td>5200</td>
              <td>52.00 元</td>
            </tr>
            <tr data-price-cents="1800">
              <th scope="row">旧书套装</th>
              <td>1800</td>
              <td>18.00 元</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>

    <script>
      const canvas = document.querySelector("#price-chart");
      const rows = [...document.querySelectorAll("#price-data tr")];
      const formatter = new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: "CNY",
      });

      const items = rows.map((row) => {
        const name = row.querySelector("th").textContent.trim();
        const priceCents = Number(row.dataset.priceCents);

        if (!Number.isInteger(priceCents) || priceCents < 0) {
          throw new TypeError(`${name} 的价格必须是非负整数分`);
        }

        return { name, priceCents };
      });

      function drawPriceChart() {
        const cssWidth = Math.max(
          320,
          Math.round(canvas.getBoundingClientRect().width),
        );
        const cssHeight = 260;
        const dpr = Math.max(1, window.devicePixelRatio || 1);

        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        const context = canvas.getContext("2d");
        if (!context) {
          return;
        }

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, cssWidth, cssHeight);

        const chartLeft = 110;
        const chartRight = 95;
        const chartWidth = Math.max(120, cssWidth - chartLeft - chartRight);
        const barHeight = 38;
        const rowGap = 28;
        const maxPriceCents = Math.max(...items.map((item) => item.priceCents));

        context.font = "16px system-ui, sans-serif";
        context.textBaseline = "middle";

        items.forEach((item, index) => {
          const y = 34 + index * (barHeight + rowGap);
          const barWidth = Math.round(
            (item.priceCents / maxPriceCents) * chartWidth,
          );

          context.fillStyle = "#263c34";
          context.textAlign = "right";
          context.fillText(item.name, chartLeft - 12, y + barHeight / 2);

          context.fillStyle = index === 1 ? "#d97745" : "#5b7c6f";
          context.fillRect(chartLeft, y, barWidth, barHeight);

          context.fillStyle = "#263c34";
          context.textAlign = "left";
          context.fillText(
            formatter.format(item.priceCents / 100),
            chartLeft + barWidth + 10,
            y + barHeight / 2,
          );
        });
      }

      let resizeFrame = 0;
      window.addEventListener("resize", () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(drawPriceChart);
      });

      drawPriceChart();
    </script>
  </body>
</html>
```

### 7.4 打开方法

1. 保存 `index.html`；
2. 直接用浏览器打开，不需要本地服务器；
3. 只使用键盘 Tab 键，确认普通商品链接可聚焦；
4. 点击色块或普通链接，确认都跳到对应商品说明；
5. 放大页面到 200%，确认 SVG 边缘仍清晰；
6. 在 Elements 中选择 Canvas，比较属性尺寸和 CSS 尺寸；
7. 在 Console 运行：

```js
const chart = document.querySelector("#price-chart");
console.table({
  bitmapWidth: chart.width,
  bitmapHeight: chart.height,
  cssWidth: chart.getBoundingClientRect().width,
  cssHeight: chart.getBoundingClientRect().height,
  dpr: window.devicePixelRatio,
});
```

8. 禁用 JavaScript 后刷新，确认文字摘要和价格表仍然完整；
9. 打开 Network，确认没有业务 API 请求。

### 7.5 预期结果

- 静态规则卡显示三步规则；
- 商品分区图有三个热点，并有三个普通链接；
- 三种入口都跳到页面内真实存在的目标；
- 台灯 SVG 有短标题、长描述和可见说明；
- Canvas 按价格比例显示三条横向柱；
- 实木椅最长，旧书套装最短；
- 表格源值分别是 `3900`、`5200`、`1800` 分；
- 禁用脚本后只损失可视化，不损失价格事实；
- 改变窗口宽度后图表重新绘制；
- 页面刷新后不会保留用户操作，因为没有可变业务状态。

### 7.6 失败证据

- Tab 键无法到达任何商品导航；
- `usemap` 与 `map[name]` 名称不一致；
- `area` 有 `href` 却没有有意义的 `alt`；
- 图像缩放后热点与色块明显错位；
- SVG 在 Accessibility 树中没有名称；
- Canvas 的属性仍是默认 300 × 150，却被 CSS 放大；
- 价格源数据出现 `39.00` 这样的浮点元值；
- 禁用脚本后价格数据全部消失；
- Console 报 `getContext(...) is null` 后代码仍继续调用绘图方法；
- Network 出现收藏、预约、支付或登录请求；
- 文案把规则卡的 `sandbox` 描述为完整安全审计或服务端权限。

### 7.7 数据与安全边界

这个案例刻意保持简单：

- SVG data URL 只为避免新增素材文件，不是商品实拍；
- `srcdoc` 是开发者写死的可信教学文本，没有拼接用户输入；
- Canvas 数据从当前文档表格读取，只存在当前页面内存；
- 表格才是价格事实的可读基线，Canvas 是增强视图；
- `sandbox` 只限制嵌入文档的部分能力；
- 空 `sandbox` 不证明规则内容真实、合法、无欺骗或已经授权；
- `allow` 禁止设备权限，不等于用户已经登录；
- 页面没有后端，所以不能证明库存、预约、支付和成交状态。

## 8. 常见错误与排查路径

### 8.1 内联 SVG 只有形状

**错误案例：**

```html
<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40"></circle>
</svg>
```

**问题：**辅助技术无法从圆形推导业务含义。

**修复：**根元素增加 `role="img"` 和 `aria-labelledby`，添加 `title`、`desc`，复杂结论再写成可见文字。

**复验：**Accessibility 面板显示预期名称；关闭图形后正文仍有必要信息。

### 8.2 只用 CSS 放大 Canvas

**错误案例：**

```html
<canvas style="width: 1200px; height: 600px;"></canvas>
```

**现象：**图形和文字模糊。

**证据：**`canvas.width === 300`、`canvas.height === 150`，CSS 盒却大很多。

**修复：**按 CSS 尺寸和 DPR 设置位图属性，随后重新设置变换并完整重绘。

**复验：**属性像素数约为 CSS 尺寸乘以 DPR，缩放后边缘清楚。

### 8.3 Canvas 有图无数据

**错误案例：**

```html
<canvas id="prices"></canvas>
```

**问题：**图形不是可查询的数据结构。

**修复：**增加标题、摘要和真实表格；Canvas 只作为增强。

**复验：**禁用脚本仍可完成“比较三件商品价格”的任务。

### 8.4 跨源画布污染实验

文件位置：

```text
market-learning/
└── practice/
    └── html-09-embedding/
        └── canvas-origin-check.html
```

该实验需要网络，只用于观察失败边界。远程示例资源可能不可达；若发生网络错误，应与 `SecurityError` 分开记录。

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Canvas 来源检查</title>
  </head>
  <body>
    <h1>Canvas 来源检查</h1>
    <p>
      第一个按钮绘制跨源图片并尝试读取像素；第二个按钮改用当前页面生成的 Blob。
    </p>
    <button id="remote" type="button">测试跨源图片</button>
    <button id="local" type="button">恢复为同源生成图</button>
    <p id="result" role="status">尚未测试。</p>
    <canvas id="test-canvas" width="240" height="120">
      一块用于来源检查的测试画布。
    </canvas>

    <script>
      const canvas = document.querySelector("#test-canvas");
      const result = document.querySelector("#result");
      const remoteButton = document.querySelector("#remote");
      const localButton = document.querySelector("#local");
      const remoteUrl =
        "https://mdn.github.io/shared-assets/images/examples/rhino.jpg";

      function drawAndRead(sourceUrl, label, revokeAfterLoad = false) {
        const image = new Image();
        result.textContent = `${label}：正在加载。`;

        image.addEventListener("load", () => {
          canvas.width = 240;
          canvas.height = 120;
          const context = canvas.getContext("2d");

          if (!context) {
            result.textContent = `${label}：浏览器没有提供 2D 上下文。`;
            return;
          }

          context.drawImage(image, 0, 0, 240, 120);

          try {
            const pixel = context.getImageData(0, 0, 1, 1);
            const prefix = canvas.toDataURL("image/png").slice(0, 22);
            result.textContent =
              `${label}：读取成功，首像素红色通道为 ${pixel.data[0]}，` +
              `导出前缀为 ${prefix}。`;
          } catch (error) {
            result.textContent =
              `${label}：${error.name}。画面可以显示，但像素读取或导出被阻止。`;
          } finally {
            if (revokeAfterLoad) {
              URL.revokeObjectURL(sourceUrl);
            }
          }
        });

        image.addEventListener("error", () => {
          result.textContent =
            `${label}：图片网络加载失败，尚未进入画布读取步骤。`;
          if (revokeAfterLoad) {
            URL.revokeObjectURL(sourceUrl);
          }
        });

        image.src = sourceUrl;
      }

      remoteButton.addEventListener("click", () => {
        drawAndRead(remoteUrl, "跨源无 CORS 模式");
      });

      localButton.addEventListener("click", () => {
        const svg = [
          '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120">',
          '<rect width="240" height="120" fill="#f4f0e6"/>',
          '<circle cx="60" cy="60" r="35" fill="#d97745"/>',
          '<text x="110" y="68" font-size="20">同源生成图</text>',
          "</svg>",
        ].join("");
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const objectUrl = URL.createObjectURL(blob);
        drawAndRead(objectUrl, "当前页面 Blob", true);
      });
    </script>
  </body>
</html>
```

#### 预期与失败分流

点击“测试跨源图片”后可能出现两类结果：

1. 图片加载成功，绘制成功，读取时报 `SecurityError`：这才是画布污染证据；
2. 图片网络加载失败：这是网络、证书、资源地址或策略问题，尚不能证明画布污染。

点击“恢复为同源生成图”后：

- 代码先重设尺寸，清空旧位图；
- 当前页面创建的 Blob 图像可绘制；
- `getImageData()` 与 `toDataURL()` 应成功；
- 结果文字显示首像素通道和 `data:image/png;base64,` 前缀。

#### 生产环境的 CORS 恢复

若必须绘制远程商品图片并读取像素：

1. 图片服务明确返回允许当前页面来源的 `Access-Control-Allow-Origin`；
2. JavaScript 在设置 `src` 前设置 `image.crossOrigin = "anonymous"`；
3. Network 中确认请求模式和响应头；
4. 图片加载后再绘制；
5. 同时调用 `getImageData()` 与 `toDataURL()` 复验；
6. 不支持 CORS 时，停止像素读取需求或把有权使用的资源迁到受控同源服务。

### 8.5 诊断与恢复记录

一次合格记录应区分“现象、证据、原因、修复、复验”：

```text
目标：导出价格图 PNG
现象：图像已经画出，但 toDataURL() 抛出 SecurityError
Network 证据：远程图片以跨源无 CORS 模式加载
Console 证据：SecurityError，画布不再 origin-clean
排除项：2D 上下文已获得；Canvas 宽高均为非零整数
根因：未经 CORS 授权的跨源像素被绘入 Canvas
修复：改用当前页面生成的 Blob 图；生产方案要求图片服务配置 CORS
复验：getImageData() 返回 ImageData；toDataURL() 返回 PNG data URL
剩余风险：尚未验证真实商品图片服务的 CORS 配置
```

不要用以下方式制造“恢复”：

- 删除 `getImageData()` 与 `toDataURL()`，然后声称导出成功；
- 吞掉异常并显示固定成功文案；
- 关闭浏览器安全策略；
- 安装来源不明的扩展绕过同源限制；
- 把任意远程 URL 转发到开放代理。

## 9. 课后题

### 9.1 场景选择题

为以下需求选择 `img`、SVG、Canvas、`iframe`、`object` 或普通链接，可以组合使用：

1. 展示一张卖家拍摄的商品照片；
2. 展示可缩放的台灯部件图，并让 CSS 改变某个部件颜色；
3. 每秒重绘六十次、包含数千粒子的装饰动画；
4. 提供社区规则 PDF；
5. 展示第三方地图，但地图服务明确允许嵌入；
6. 访问一个明确拒绝被框入的外部帮助页。

<details>
<summary>查看场景题答案</summary>

1. 使用 `img`，提供符合语境的 `alt` 和固有尺寸。
2. 使用内联 SVG，因为需要逐元素样式和无损缩放。
3. Canvas 更适合高频像素绘制，但仍需处理性能、减少动画和替代信息。
4. 首先提供普通链接；可选增加 `object` 预览和回退内容。
5. 可以使用 `iframe`，同时提供地址或地图普通链接，设置准确 `title`、最小 `allow` 和适当 `referrerpolicy`。
6. 使用普通链接，不能用父页标记绕过目标服务器策略。

</details>

### 9.2 推理题：选择 SVG 还是 Canvas

邻里集市要展示一张只有 12 个节点的商品流转图。每个节点需要：

- 键盘聚焦；
- 可见文字；
- 独立样式；
- 点击后跳到页面章节；
- 放大后保持清晰。

答案标准：优先使用 HTML 链接配合内联 SVG，或使用可访问的 SVG 链接结构，并保留普通链接。节点数量少、需要逐元素交互和语义，不需要 Canvas 的像素吞吐。若选择 Canvas，必须额外实现焦点映射、键盘行为、命中测试和语义替代，成本明显更高。

### 9.3 故障推理题

开发者写了：

```js
const image = new Image();
image.src = "https://cdn.example/lamp.png";
image.addEventListener("load", () => {
  context.drawImage(image, 0, 0);
  console.log(canvas.toDataURL());
});
```

图片正常显示，但导出抛 `SecurityError`。只把 `image.crossOrigin = "anonymous"` 加在 `image.src = ...` 之后是否可靠？为什么？

<details>
<summary>查看故障题答案</summary>

不可靠。跨源模式必须在发起请求前确定，因此应先设置 `crossOrigin`，再设置 `src`。同时服务器必须返回允许当前来源的 CORS 响应头；客户端属性不能单方面授权。

</details>

## 10. 实践练习

### 10.1 提升：整数分价格图与技术选型

文件位置：

```text
practice/html-09-embedding/advanced.html
```

要求：

- 准备至少四件固定教学商品；
- 价格源值使用非负整数分；
- 先写带 `caption`、列标题和行标题的价格表；
- 再用 Canvas 绘制价格柱；
- 按 CSS 尺寸和 `devicePixelRatio` 设置位图；
- 页面尺寸变化时完整重绘；
- 图表有标题和趋势摘要；
- 在代码注释中说明为什么这里使用 Canvas；
- 再说明若只有四个静态柱，为什么 SVG 也可能更简单。

答案标准：

- Canvas 属性尺寸约等于 CSS 尺寸乘 DPR；
- 修改一个表格 `data-price-cents` 后，图表与表格通过同一读取路径保持一致；
- 禁用脚本后表格和摘要仍可用；
- 能比较 Canvas 和 SVG 的维护成本，而不是声称 Canvas 总是更快。

### 10.2 综合：六选一设计说明

对以下每项写出首选技术和一项拒绝理由：

| 内容 | 候选 |
| --- | --- |
| 商品实拍 | `img` / SVG / Canvas |
| 可换色的产品结构图 | 外部 `img` SVG / 内联 SVG / Canvas |
| 每帧变化的粒子背景 | SVG / Canvas |
| 外部帮助中心 | `iframe` / `object` / 普通链接 |
| PDF 质检报告 | `object` / `embed` / 普通链接 |
| 商品分区导航 | 图像映射 / 内联 SVG 链接 / 普通链接 |

完成标准：每项都根据文档边界、语义、键盘、跨源、性能和回退作答，不以“我更熟悉”作为唯一理由。

## 11. 阶段验收

### 11.1 无障碍与降级

- [ ] 只用键盘可以完成所有导航；
- [ ] 隐藏商品分区图后仍有完整文字链接；
- [ ] 隐藏 SVG 后仍有必要文字说明；
- [ ] 禁用 JavaScript 后仍能读取价格；
- [ ] Canvas 标题、摘要与数据表传达同等核心事实；
- [ ] 不把颜色作为区分价格高低的唯一方式；
- [ ] 在目标浏览器的 Accessibility 面板检查过名称。

### 11.2 提交证据

```text
练习文件路径：
打开方法：
浏览器与版本：
iframe 可访问名称：
sandbox 保留令牌及理由：
allow 策略：
图像映射键盘结果：
普通链接替代：
SVG 名称与描述：
Canvas 位图尺寸：
Canvas CSS 尺寸：
devicePixelRatio：
禁用脚本结果：
跨源失败证据：
恢复与复验：
Network 请求范围：
未验证浏览器或辅助技术：
```

只有完成标准和相关验证通过后，才能把本课标记为完成。未在真实屏幕阅读器、其他浏览器或目标服务上验证的内容，应明确写入未验证范围。

## 12. 常见问题

### Q9：可以把链接直接放进内联 SVG 吗？

可以，但仍需设计可访问名称、焦点顺序、可见焦点样式和普通链接恢复路径。少量页面导航通常先用 HTML 链接更简单。

### Q10：为什么外部 SVG 的内部 `title` 不能替代 `img[alt]`？

通过 `img` 引用时，父页面把 SVG 当作图像资源，不依赖内部 DOM 来建立父文档中的文本替代。应在 `img` 上写符合当前语境的 `alt`。

### Q11：Canvas 里写了回退文字，还需要外部表格吗？

数据图通常需要。Canvas 子内容主要在 Canvas 不受支持等情况下作为回退，不能保证在图形正常绘制时形成完整、易发现的数据体验。可见表格和摘要更可靠。

### Q12：为什么重设 `canvas.width` 后图消失？

设置 `width` 或 `height` 会重建位图并重置绘图状态。响应式重绘应按“设尺寸、设变换、完整绘制”的顺序执行。

### Q13：`toDataURL()` 与 `toBlob()` 应选哪一个？

小型教学验证可以用 `toDataURL()`。大图或真实导出通常优先异步 `toBlob()`，避免构造很长的内存字符串；两者都不能读取污染画布。

### Q14：给图片设置 `crossOrigin="anonymous"` 就一定能导出吗？

不一定。它必须在 `src` 前设置，而且图片服务器必须返回匹配的 CORS 响应头。否则图片可能直接加载失败。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：在可缩放图形和像素表面之间做选择，为 Canvas 提供尺寸、高清绘制与等价替代。
- `MED-014`：HTML 中的 SVG 与外部 SVG
- `MED-015`：Canvas 尺寸、像素、跨源污染与替代
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：嵌入文档、安全边界与图像映射](07-embedded-documents-image-maps.md) · [下一章](../04-tables-data/01-table-model-structure.md) · [返回 HTML 模块](../README.md)
