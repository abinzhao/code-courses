# 响应式图片选源与艺术指导

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 使用 srcset、sizes、picture 和 currentSrc 解释浏览器的图片候选选择。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `MED-003`、`MED-004` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

使用 srcset、sizes、picture 和 currentSrc 解释浏览器的图片候选选择。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 MED-003（`srcset`、`sizes` 与 `currentSrc`）、MED-004（`picture` 与图片 `source`）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

### 3.1 预备材料 1

```text
解析 img/picture
  → 组成候选集合
  → 根据 media、type、sizes、像素密度等选择 URL
  → 发起请求
  → 接收图片字节
  → 解析元数据与固有尺寸
  → 解码像素
  → 绘制到预留的布局区域
```

## 4. 核心理论

### 4.1 `srcset` 解决分辨率切换，`sizes` 描述布局插槽

当多个文件表达同一图片内容，只是像素宽度不同，可以使用 `w` 描述符：

```html
<img
  src="./images/lamp-800.jpg"
  srcset="
    ./images/lamp-480.jpg 480w,
    ./images/lamp-800.jpg 800w,
    ./images/lamp-1200.jpg 1200w
  "
  sizes="(max-width: 44rem) 100vw, 50vw"
  alt="米白色阅读台灯，灯罩边缘有轻微划痕"
  width="1200"
  height="900">
```

`480w` 表示候选文件的真实固有宽度是 480 像素，不是“在 480 像素视口使用”，也不是 CSS 宽度。写错描述符会让浏览器基于错误数据选择。

`sizes` 从左到右读取：

```text
(max-width: 44rem) 100vw, 50vw
└──── 媒体条件 ────┘ └插槽宽度┘
```

- 视口不超过 44rem 时，告诉浏览器图片大约占 100vw。
- 否则使用最后一个无条件值 50vw。
- 浏览器取第一个匹配项。
- `sizes` 描述的是**图片在布局中将占多宽**，不是候选文件有多宽。

浏览器再把插槽宽度、设备像素密度、缩放、可用候选以及自身策略结合起来选择资源。例如 400 CSS px 的插槽在 2x 屏上大约需要 800 个资源像素，因此可能选 800w 候选。

选择是浏览器决策，不是作者的精确命令。缓存、网络策略和候选集合都会影响结果。不要写“视口 400px 必定下载 480w”。应通过 `currentSrc` 和 Network 观察实际结果。

固定显示尺寸、只处理像素密度时，可以使用 `x` 描述符：

```html
<img
  src="./images/avatar-160.jpg"
  srcset="
    ./images/avatar-160.jpg 1x,
    ./images/avatar-320.jpg 2x
  "
  alt="卖家王阿姨"
  width="160"
  height="160">
```

同一个 `srcset` 不能混合 `w` 和 `x`：

```html
<!-- 错误：同一候选列表混用了宽度和像素密度描述符。 -->
<img
  src="./images/lamp-480.jpg"
  srcset="./images/lamp-480.jpg 480w, ./images/lamp-960.jpg 2x"
  alt="米白色阅读台灯">
```

使用 `w` 描述符时应提供 `sizes`；否则默认源尺寸通常按 `100vw` 推断，可能与两栏卡片的实际 50vw 差很多。符合特定条件的 `loading="lazy"` 图片还可使用 `sizes="auto, ..."`，但初学阶段先把布局规则显式写清楚，更容易核对。

### 4.2 `currentSrc` 告诉你最后选择了谁

`src` 只反映 `src` 属性解析后的 URL，`currentSrc` 才是当前被选中的候选 URL：

```js
const image = document.querySelector("#product-photo");

image.addEventListener("load", () => {
  console.table({
    srcAttribute: image.getAttribute("src"),
    resolvedSrc: image.src,
    selectedCandidate: image.currentSrc,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight
  });
});
```

`currentSrc` 返回绝对 URL，并可能在视口、设备状态或媒体条件变化后改变。测试时注意：

- 浏览器可能复用已经下载的较大候选。
- 只拖窄窗口但不刷新，未必会为了节省字节重新下载小图。
- DevTools 设备模拟的 DPR 会改变候选选择。
- Network 中的请求事实比“我认为该选哪个”更可靠。

### 4.3 `picture` 解决艺术指导和格式选择

`srcset` 通常在“同一画面，不同分辨率”中选择。若窄屏要改用更紧的裁剪，属于艺术指导，应使用 `picture`：

```html
<picture>
  <source
    media="(max-width: 44rem)"
    srcset="
      ./images/lamp-close-480.jpg 480w,
      ./images/lamp-close-800.jpg 800w
    "
    sizes="100vw">
  <img
    src="./images/lamp-wide-800.jpg"
    srcset="
      ./images/lamp-wide-800.jpg 800w,
      ./images/lamp-wide-1200.jpg 1200w
    "
    sizes="(max-width: 70rem) 70vw, 760px"
    alt="米白色阅读台灯，灯罩边缘有轻微划痕"
    width="1200"
    height="900">
</picture>
```

窄屏候选把主体裁得更近，宽屏候选保留使用场景。所有候选仍表达同一核心意义，因此替代文本写在最终 `img` 上，而不是每个 `source` 上。

格式选择使用 `type`：

```html
<picture>
  <source
    type="image/avif"
    srcset="./images/lamp-800.avif 800w, ./images/lamp-1200.avif 1200w">
  <source
    type="image/webp"
    srcset="./images/lamp-800.webp 800w, ./images/lamp-1200.webp 1200w">
  <img
    src="./images/lamp-800.jpg"
    srcset="./images/lamp-800.jpg 800w, ./images/lamp-1200.jpg 1200w"
    sizes="(max-width: 50rem) 100vw, 760px"
    alt="米白色阅读台灯"
    width="1200"
    height="900">
</picture>
```

浏览器按文档顺序寻找第一个 `media` 匹配且 `type` 可用的 `source`，再从它的 `srcset` 选候选。关键规则：

- `picture` 自己不绘制图片，真正绘制和提供替代文本的是内部 `img`。
- 图片用的 `source` 写 `srcset`，不是 `src`。
- `source` 必须出现在 `img` 之前。
- `img` 是必需的默认分支和旧环境回退。
- `type` 是支持性提示；服务器仍须返回正确的图片 MIME 类型与有效字节。
- 如果不同艺术裁剪比例不同，可在各 `source` 和 `img` 上提供对应 `width`、`height`，或用匹配的 CSS `aspect-ratio` 预留正确区域。

## 5. 元素、属性、API 或配置清单

### 5.1 图片 `source` 核心属性

| 属性 | 作用 | 常见错误 |
| --- | --- | --- |
| `srcset` | 提供该分支的候选集合 | 错写成 `src` |
| `sizes` | 描述该分支的布局插槽 | 与真实 CSS 布局不一致 |
| `media` | 决定艺术指导分支是否匹配 | 顺序让宽条件提前吞掉窄条件 |
| `type` | 让浏览器跳过不支持的格式 | MIME 写错或服务端返回内容不匹配 |
| `width`、`height` | 为该艺术裁剪提供尺寸比例 | 不同比例仍沿用 `img` 的错误比例 |

### 5.2 选择工具

| 需求 | 首选工具 |
| --- | --- |
| 只有一个图片文件 | `img src` |
| 同一内容，不同像素宽度 | `img srcset` + `sizes` + `w` |
| 固定 CSS 尺寸，不同像素密度 | `img srcset` + `x` |
| 小屏需要不同裁剪 | `picture` + `source media` |
| 提供 AVIF/WebP/JPEG 回退 | `picture` + `source type` |
| 首屏主要商品图 | eager/默认加载，按证据考虑 `fetchpriority="high"` |
| 屏外相关推荐图 | `loading="lazy"`，保留正确宽高 |
| 动态切图后再呈现 | `decode()` |
| 控制跨站来源泄露 | `referrerpolicy` |
| 需要跨源图片像素可读 | `crossorigin` + 服务器正确 CORS 响应 |

## 6. 最小可运行案例

### 6.1 渐进扩展：从单一来源到真实候选

响应式选择要观察真实网络候选，不能只靠 data URL。请在自己的练习目录准备以下文件；这些文件不是教材仓库资源，也不是上传功能：

```text
practice/html-images/
├── responsive-selection.html
└── images/
    ├── lamp-480.jpg
    ├── lamp-800.jpg
    └── lamp-1200.jpg
```

真实资源契约：

| 文件 | 固有尺寸 | 内容 | 要求 |
| --- | --- | --- | --- |
| `lamp-480.jpg` | 480 × 360 | 同一台灯、同一裁剪 | 较小文件 |
| `lamp-800.jpg` | 800 × 600 | 同一台灯、同一裁剪 | 中等文件 |
| `lamp-1200.jpg` | 1200 × 900 | 同一台灯、同一裁剪 | 较大文件 |

`responsive-selection.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>响应式图片候选观察</title>
  <style>
    body {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px;
      font: 16px/1.6 system-ui, sans-serif;
    }

    figure {
      width: min(100%, 760px);
      margin: 0;
    }

    img {
      display: block;
      width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <h1>浏览器选择了哪张图片？</h1>

  <figure>
    <img
      id="product-photo"
      src="./images/lamp-800.jpg"
      srcset="
        ./images/lamp-480.jpg 480w,
        ./images/lamp-800.jpg 800w,
        ./images/lamp-1200.jpg 1200w
      "
      sizes="(max-width: 48rem) calc(100vw - 48px), 760px"
      alt="米白色阅读台灯，灯罩边缘有轻微划痕"
      width="1200"
      height="900">
    <figcaption id="selection">等待加载……</figcaption>
  </figure>

  <script>
    const image = document.querySelector("#product-photo");
    const output = document.querySelector("#selection");

    function reportSelection() {
      output.textContent =
        `currentSrc: ${image.currentSrc}; ` +
        `natural: ${image.naturalWidth} × ${image.naturalHeight}; ` +
        `rendered: ${Math.round(image.getBoundingClientRect().width)} × ` +
        `${Math.round(image.getBoundingClientRect().height)}`;
    }

    image.addEventListener("load", reportSelection);
    window.addEventListener("resize", reportSelection);

    if (image.complete) {
      reportSelection();
    }
  </script>
</body>
</html>
```

通过 HTTP 打开，清空 Network 并禁用缓存，在窄视口和宽视口分别重新加载。预期能看到：

- `currentSrc` 指向一个候选的绝对 URL。
- `naturalWidth`、`naturalHeight` 反映被选资源密度修正后的固有尺寸；不要把它们直接当成文件原始像素矩阵。
- 渲染尺寸由 CSS 和布局决定，不必等于固有尺寸。
- 窄视口通常有机会选较小候选，但具体选择还受 DPR、缩放和浏览器策略影响。

如果所有视口都请求 1200w，不要先断言浏览器错误。检查 DPR、`sizes`、缓存、候选真实宽度和实际 CSS 插槽。

## 7. 邻里集市集成案例

本案例把替代文本、分辨率候选、格式回退、首屏优先级、屏外懒加载、状态 API 和一次性失败恢复组合到一个静态商品页中。

### 7.1 练习文件与真实资源契约

创建：

```text
practice/html-images/
├── neighbor-market.html
└── images/
    ├── lamp-close-480.avif
    ├── lamp-close-800.avif
    ├── lamp-close-480.webp
    ├── lamp-close-800.webp
    ├── lamp-wide-800.avif
    ├── lamp-wide-1200.avif
    ├── lamp-wide-800.webp
    ├── lamp-wide-1200.webp
    ├── lamp-wide-800.jpg
    ├── lamp-wide-1200.jpg
    ├── lamp-base-640.jpg
    └── table-640.jpg
```

资源要求：

- `lamp-close-*` 是窄屏近裁剪，主体与划痕清楚。
- `lamp-wide-*` 是宽屏场景图，所有候选都为 4:3。
- 文件名中的宽度必须等于图片真实固有宽度。
- AVIF、WebP、JPEG 版本表达相同内容；不能用完全不同的照片冒充格式候选。
- `lamp-base-640.jpg` 和 `table-640.jpg` 都是 640 × 480。
- 压缩与格式生成在图片工具中完成；HTML 本身不会生成这些文件。

### 7.2 完整 `neighbor-market.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>阅读台灯，39元 · 邻里集市</title>
  <style>
    :root {
      font-family: system-ui, sans-serif;
      color: #18201d;
      background: #f5f1e8;
    }

    * {
      box-sizing: border-box;
    }

    body {
      max-width: 1120px;
      margin: 0 auto;
      padding: 24px;
      line-height: 1.6;
    }

    header,
    main,
    footer {
      margin-bottom: 32px;
    }

    .listing {
      display: grid;
      gap: 24px;
      align-items: start;
    }

    .hero,
    .detail-photo,
    .related-card {
      margin: 0;
      overflow: hidden;
      border: 1px solid #b9c7be;
      border-radius: 18px;
      background: #e4ebe5;
    }

    img {
      display: block;
      width: 100%;
      height: auto;
    }

    figcaption,
    .related-card span {
      display: block;
      padding: 12px 16px;
      background: #fff;
    }

    .facts {
      padding: 20px;
      border-radius: 18px;
      background: #fff;
    }

    .price {
      color: #9b3f1f;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .status {
      min-height: 3em;
      padding: 12px;
      border-left: 4px solid #d47c34;
      background: #fff8e9;
    }

    .details,
    .related {
      display: grid;
      gap: 16px;
      margin-top: 32px;
    }

    .related-card {
      color: inherit;
      text-decoration: none;
    }

    .related-card:focus-visible {
      outline: 4px solid #d47c34;
      outline-offset: 4px;
    }

    @media (min-width: 48rem) {
      .listing {
        grid-template-columns: minmax(0, 3fr) minmax(260px, 2fr);
      }

      .details,
      .related {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  </style>
</head>
<body>
  <header>
    <p><a href="./index.html">邻里集市</a></p>
    <h1>阅读台灯</h1>
  </header>

  <main>
    <div
      class="listing"
      data-listing-id="lamp-001"
      data-price-cents="3900"
      data-published-at="2026-10-10T08:30:00.000Z">
      <figure class="hero">
        <picture id="hero-picture">
          <source
            media="(max-width: 47.99rem)"
            type="image/avif"
            srcset="
              ./images/lamp-close-480.avif 480w,
              ./images/lamp-close-800.avif 800w
            "
            sizes="calc(100vw - 48px)">
          <source
            media="(max-width: 47.99rem)"
            type="image/webp"
            srcset="
              ./images/lamp-close-480.webp 480w,
              ./images/lamp-close-800.webp 800w
            "
            sizes="calc(100vw - 48px)">
          <source
            type="image/avif"
            srcset="
              ./images/lamp-wide-800.avif 800w,
              ./images/lamp-wide-1200.avif 1200w
            "
            sizes="(max-width: 70rem) 58vw, 645px">
          <source
            type="image/webp"
            srcset="
              ./images/lamp-wide-800.webp 800w,
              ./images/lamp-wide-1200.webp 1200w
            "
            sizes="(max-width: 70rem) 58vw, 645px">
          <img
            id="hero-image"
            src="./images/lamp-wide-800.jpg"
            srcset="
              ./images/lamp-wide-800.jpg 800w,
              ./images/lamp-wide-1200.jpg 1200w
            "
            sizes="(max-width: 47.99rem) calc(100vw - 48px), (max-width: 70rem) 58vw, 645px"
            alt="米白色阅读台灯，灯罩边缘有轻微划痕"
            width="1200"
            height="900"
            loading="eager"
            decoding="async"
            fetchpriority="high">
        </picture>
        <figcaption>主图展示整体成色；窄屏使用更近的裁剪。</figcaption>
      </figure>

      <section class="facts" aria-labelledby="listing-facts">
        <h2 id="listing-facts">商品信息</h2>
        <p class="price" id="price">价格载入中</p>
        <p>状态：二手，可正常点亮</p>
        <p>交接：社区公共区域当面检查</p>
        <p>
          发布时间：
          <time datetime="2026-10-10T08:30:00.000Z">2026-10-10</time>
        </p>
        <p id="image-status" class="status" role="status">
          正在确认商品主图……
        </p>
        <p>
          本页仅演示静态商品信息，没有账号、付款、预约、上传或保存功能。
        </p>
      </section>
    </div>

    <section aria-labelledby="detail-heading">
      <h2 id="detail-heading">成色细节</h2>
      <div class="details">
        <figure class="detail-photo">
          <img
            src="./images/lamp-base-640.jpg"
            alt="台灯底座右侧有约两厘米浅色划痕"
            width="640"
            height="480"
            loading="lazy"
            decoding="async"
            fetchpriority="low">
          <figcaption>底座划痕不影响放置稳定性。</figcaption>
        </figure>

        <figure class="detail-photo" aria-label="尺寸说明">
          <svg
            viewBox="0 0 640 480"
            role="img"
            aria-labelledby="size-title size-desc">
            <title id="size-title">阅读台灯尺寸示意</title>
            <desc id="size-desc">台灯总高约四十五厘米，底座直径约十八厘米。</desc>
            <rect width="640" height="480" fill="#e7efe9"></rect>
            <path d="M320 95 L260 210 H380 Z" fill="#d47c34"></path>
            <rect x="305" y="210" width="30" height="170" fill="#174d3a"></rect>
            <ellipse cx="320" cy="390" rx="110" ry="28" fill="#174d3a"></ellipse>
            <text x="425" y="245" font-size="24">高约 45 cm</text>
            <text x="225" y="445" font-size="24">底座直径约 18 cm</text>
          </svg>
          <figcaption>尺寸为人工测量值，仅作当面检查参考。</figcaption>
        </figure>
      </div>
    </section>

    <section aria-labelledby="related-heading">
      <h2 id="related-heading">附近其他物品</h2>
      <div class="related">
        <a class="related-card" href="./listing-table.html">
          <img
            src="./images/table-640.jpg"
            alt=""
            width="640"
            height="480"
            loading="lazy"
            decoding="async">
          <span>查看折叠餐桌商品详情</span>
        </a>
      </div>
    </section>
  </main>

  <footer>
    <p>邻里集市静态教学页</p>
  </footer>

  <script>
    const listing = document.querySelector(".listing");
    const price = document.querySelector("#price");
    const heroPicture = document.querySelector("#hero-picture");
    const heroImage = document.querySelector("#hero-image");
    const imageStatus = document.querySelector("#image-status");

    const priceCents = Number(listing.dataset.priceCents);
    price.textContent = new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY"
    }).format(priceCents / 100);

    const fallbackSource =
      "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%201200%20900%22%3E%3Crect%20width%3D%221200%22%20height%3D%22900%22%20fill%3D%22%23e7e4dc%22%2F%3E%3Cpath%20d%3D%22M420%20580%20L600%20320%20L780%20580Z%22%20fill%3D%22%239aa39e%22%2F%3E%3Ctext%20x%3D%22600%22%20y%3D%22680%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2252%22%20fill%3D%22%233e4944%22%3EImage%20unavailable%3C%2Ftext%3E%3C%2Fsvg%3E";

    async function reportHeroSuccess() {
      try {
        await heroImage.decode();
        const label =
          heroImage.dataset.fallbackApplied === "true"
            ? "本地说明图已就绪"
            : "主图已就绪";
        imageStatus.textContent =
          `${label}：${heroImage.naturalWidth} × ` +
          `${heroImage.naturalHeight}；候选：${heroImage.currentSrc}`;
      } catch (error) {
        imageStatus.textContent = `主图解码检查失败：${error.name}`;
      }
    }

    heroImage.addEventListener("load", reportHeroSuccess);

    heroImage.addEventListener("error", () => {
      if (heroImage.dataset.fallbackApplied === "true") {
        imageStatus.textContent = "主图和本地回退图都无法显示，请稍后重试。";
        return;
      }

      heroImage.dataset.fallbackApplied = "true";
      heroPicture.querySelectorAll("source").forEach((source) => {
        source.remove();
      });
      heroImage.removeAttribute("srcset");
      heroImage.removeAttribute("sizes");
      heroImage.src = fallbackSource;
      imageStatus.textContent = "主图失败，已显示本地说明图。";
    });

    if (heroImage.complete) {
      if (heroImage.naturalWidth > 0) {
        reportHeroSuccess();
      } else {
        heroImage.dispatchEvent(new Event("error"));
      }
    }
  </script>
</body>
</html>
```

### 7.3 逐层解释

#### 主图语义

主图 `alt` 说明商品和可见瑕疵。`figcaption` 解释拍摄与裁剪策略，两者信息互补，不是逐字重复。

相关推荐卡片的图片使用 `alt=""`，因为同一个链接里的“查看折叠餐桌商品详情”已经提供清楚名称。若移除可见文字，图片就必须承担链接目标名称。

#### 候选选择

窄屏先匹配 `media="(max-width: 47.99rem)"` 的近裁剪；同一裁剪中，支持 AVIF 的浏览器选择 AVIF 分支，否则继续判断 WebP。宽屏跳过窄屏来源，再按格式支持情况选择 AVIF、WebP 或最终 JPEG。

这里的“格式回退”针对浏览器是否支持声明的 `type`，不是某个 URL 请求失败后的自动重试链。浏览器一旦选中支持的 AVIF 分支，若该 AVIF 文件随后 404 或字节损坏，不保证自动改试 WebP；应修复资源，或像本案例一样进入明确的错误恢复。

`picture` 的所有主图保持 4:3，因此 `img width="1200" height="900"` 可以稳定预留空间。如果窄屏裁剪改为 4:5，应给窄屏 `source` 增加对应宽高，例如 `width="800" height="1000"`。

#### 性能意图

- 主图在首屏，使用 eager、async decode 和 high priority 提示。
- 细节图与相关推荐通常位于首屏之后，使用 lazy。
- 每张图片仍有宽高，懒加载不等于可以放弃尺寸。
- 是否真的改善加载必须以 Network、性能轨迹和真实页面位置验证。

#### 数据边界

`data-price-cents="3900"` 保存整数分，格式化时才除以 100。`data-published-at` 与 `time datetime` 使用 UTC ISO 值。本页只读这些静态值，没有数据库、付款、图片上传或服务端接口。

#### 失败恢复

主图失败后，脚本先用 `data-fallback-applied` 防止重复恢复，再移除 `picture` 的 `source` 和 `img` 的响应式候选，最后换成自包含 SVG。这样选源算法不会继续把失败候选覆盖回去。

回退图本身也可能因代码错误失败，所以第二次 `error` 只报告状态，不再次改 `src`。这避免无限事件循环。

### 7.4 打开方法

在 `practice/html-images/` 运行：

```bash
python3 -m http.server 8000
```

访问：

```text
http://localhost:8000/neighbor-market.html
```

分别在约 390 CSS px 和 1024 CSS px 的视口下：

1. 勾选 Network 的 Disable cache。
2. 清空请求列表。
3. 刷新页面。
4. 记录主图的请求 URL、类型、大小和优先级。
5. 在 Console 读取：

```js
const image = document.querySelector("#hero-image");
({
  currentSrc: image.currentSrc,
  complete: image.complete,
  naturalWidth: image.naturalWidth,
  naturalHeight: image.naturalHeight,
  rendered: image.getBoundingClientRect().toJSON()
});
```

### 7.5 预期结果与失败证据

正常结果：

- 窄屏和宽屏可使用不同裁剪。
- 支持现代格式的浏览器优先选择相应格式。
- 价格显示为人民币格式，但源数据仍是整数 `3900`。
- 主图加载前已预留 4:3 空间。
- 滚动接近细节图前后，可以观察 lazy 请求时机。
- 状态区域显示实际 `currentSrc` 与固有尺寸。

失败证据：

| 现象 | 必查证据 |
| --- | --- |
| 只请求 JPEG | 浏览器格式支持、`source type`、源文件和响应 MIME |
| 窄屏仍是宽图 | viewport、`media` 是否匹配、Network、`currentSrc` |
| 图片加载后跳动 | 宽高属性、候选比例、CSS 是否覆盖 `height` |
| 主图 404 | Network Request URL 与 Status |
| 状态说失败但图片可见 | 是否发生了旧请求与新请求竞态 |
| 回退反复触发 | `data-fallback-applied` 是否在改 `src` 前设置 |

## 8. 常见错误与排查路径

### 8.1 错误三：把 `sizes` 写成图片文件宽度

错误：

```html
<img
  src="./images/lamp-800.jpg"
  srcset="./images/lamp-480.jpg 480w, ./images/lamp-1200.jpg 1200w"
  sizes="1200px"
  alt="米白色阅读台灯">
```

若图片实际只占两栏布局的 50vw，`sizes="1200px"` 会误导浏览器倾向更大候选。`srcset` 描述文件，`sizes` 描述布局插槽；两者不能混为一谈。

### 8.2 错误四：用 CSS 媒体查询切换两个 `img`

错误思路：

```html
<img class="mobile-photo" src="./images/lamp-close.jpg" alt="米白色阅读台灯">
<img class="desktop-photo" src="./images/lamp-wide.jpg" alt="米白色阅读台灯">
```

```css
@media (min-width: 48rem) {
  .mobile-photo {
    display: none;
  }
}
```

即使其中一个最终 `display: none`，浏览器仍可能提前发现并下载两个 `img` 来源；辅助技术也可能遇到重复内容。艺术指导应交给 `picture` 的声明式选源。

### 8.3 错误八：`picture` 回退时只改 `img.src`

错误恢复：

```js
image.addEventListener("error", () => {
  image.src = "./images/fallback.svg";
});
```

如果匹配中的 `source srcset` 仍存在，浏览器可能继续选择失败来源。正确恢复应修复候选，或在使用本地回退时移除失败 `source` 和 `img.srcset`，并加一次性标记。

## 9. 课后题

### 9.1 参考答案

1. 不会。属性提供默认尺寸与比例信息，CSS 和容器可改变实际渲染尺寸。
2. 写 `alt=""`，明确表示图片不承担内容；能用 CSS 背景时也可不使用 `img`。
3. 不是。它表示候选文件的固有宽度为 480 像素。
4. 当前媒体条件下图片将占用的布局插槽宽度。
5. `srcset`、`sizes` 或 `picture source` 可能让浏览器选择另一个候选。
6. 最终的 `img alt`；`picture` 和图片 `source` 不提供各自的 `alt`。
7. 不能。它只声明候选格式，文件必须事先真实生成。
8. 通常不适合。关键首屏图应及时发现和获取。
9. 前者是浏览器解码安排提示；后者返回可等待、可失败的 Promise。
10. 因为 `complete` 表示进入完成状态，失败终态也属于完成。
11. 通常可以显示，但脚本不能据此读取跨源像素。
12. 图片服务器通过 CORS 响应头决定，客户端属性不能自行授权。
13. 响应可能是 HTML、损坏字节或不支持的图片格式，网络成功不代表解码成功。
14. CSS 只决定渲染规则；HTML 宽高可让浏览器在资源到达前推导比例并预留空间。

## 10. 实践练习

### 10.1 提升练习：组合艺术指导与格式回退

文件位置：

```text
practice/html-images/picture-advanced.html
```

真实资源契约：

- 窄屏裁剪：480w、800w，AVIF 与 WebP。
- 宽屏裁剪：800w、1200w，AVIF、WebP 与 JPEG。
- 所有文件名描述符必须匹配实际固有宽度。
- 若窄宽裁剪比例不同，分别提供正确的 `source`/`img` 宽高。

要求：

1. 窄于 48rem 时选近裁剪。
2. 每个裁剪按浏览器格式支持情况选择 AVIF 或 WebP。
3. `img` 提供 JPEG 回退和唯一 `alt`。
4. 用 `sizes` 反映单栏与双栏布局。
5. 页面输出 `currentSrc`、`naturalWidth` 和渲染宽度。
6. 在 390 CSS px、768 CSS px、1200 CSS px 下分别禁用缓存刷新。

记录表：

| 视口 | DPR | 匹配分支 | `currentSrc` | 固有宽度 | 渲染宽度 | Network 字节 |
| --- | --- | --- | --- | --- | --- | --- |
| 390 | 实测 |  |  |  |  |  |
| 768 | 实测 |  |  |  |  |  |
| 1200 | 实测 |  |  |  |  |  |

**答案标准**

- 不能写“390px 一定选 480w”；应记录当前浏览器实际选择。
- `source` 使用 `srcset`，最终保留 `img`。
- 没有混合 `w` 与 `x` 描述符。
- `sizes` 写的是布局插槽，不是最大文件宽度。
- Network 与 `currentSrc` 能互相印证。
- 改变裁剪不改变图片在页面中的核心意义。

## 11. 阶段验收

### 11.1 尺寸与响应式验收

- [ ] 每张图片有与真实比例一致的 `width`、`height`。
- [ ] CSS 缩放时保持比例，不让图片溢出容器。
- [ ] `srcset` 的描述符与候选真实尺寸一致。
- [ ] 同一 `srcset` 没有混用 `w` 与 `x`。
- [ ] `sizes` 与页面实际单栏、双栏插槽一致。
- [ ] `picture` 的 `source` 位于 `img` 之前。
- [ ] `img` 保留默认来源、替代文本与尺寸。
- [ ] 不同艺术裁剪比例有对应的空间预留策略。

## 12. 常见问题

### 12.1 `sizes` 能否写百分比？

源尺寸值不能直接写百分比。可以使用 `vw`、`px`、`rem` 或 `calc()` 等合适长度，表达真实布局插槽。

### 12.2 为什么刷新后浏览器没有改选小图？

可能复用了缓存中的大图，DPR 需要较大候选，或 `sizes` 仍声明了大插槽。禁用缓存，记录 DPR、视口和 `currentSrc` 后再判断。

### 12.3 `picture` 会下载所有 `source` 吗？

它的设计目标是让浏览器从匹配分支中选择候选，而不是把所有来源当独立 `img` 下载。错误预加载、脚本改源或其他引用仍可能产生额外请求，应以 Network 为准。

### 12.4 AVIF 一定比 WebP、JPEG 小吗？

不能只凭格式名保证。内容、编码器、质量参数、元数据和目标视觉质量都会影响体积。应比较实际文件字节和视觉结果。

## 13. 扩展阅读

### 13.1 无障碍与响应式图片

- [W3C WAI：图片教程](https://www.w3.org/WAI/tutorials/images/)
- [W3C WAI：`alt` 决策树](https://www.w3.org/WAI/tutorials/images/decision-tree/)
- [MDN：`img` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)
- [MDN：`picture` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture)
- [MDN：`source` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/source)
- [MDN：响应式图片指南](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)

## 我现在能做到什么

- 能解释并验证：使用 srcset、sizes、picture 和 currentSrc 解释浏览器的图片候选选择。
- `MED-003`：`srcset`、`sizes` 与 `currentSrc`
- `MED-004`：`picture` 与图片 `source`
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：图片语义、替代文本与尺寸](01-image-semantics-alt-dimensions.md) · [下一课：图片加载、解码、性能与失败恢复](03-image-loading-state-failures.md) · [返回 HTML 模块](../README.md)
