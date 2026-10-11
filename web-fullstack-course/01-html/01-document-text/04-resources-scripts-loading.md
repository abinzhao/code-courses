# 资源与脚本加载：理解 link、style、script 与 noscript

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 解释资源关系、加载属性与脚本执行时机，并通过 Network 和执行顺序证据定位失败。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `DOC-015`、`DOC-016`、`DOC-017`、`DOC-018` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

解释资源关系、加载属性与脚本执行时机，并通过 Network 和执行顺序证据定位失败。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 DOC-015（`link` 资源关系及加载属性）、DOC-016（`style` 与文档内样式边界）、DOC-017（普通脚本、`defer`、`async`、module）、DOC-018（`noscript` 在 head/body 中的边界）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `link` 用关系类型说明“当前文档与资源是什么关系”

`link` 是空元素，最关键的属性是 `rel` 和 `href`。同一个 URL 因关系不同，会触发不同浏览器行为。

#### 样式表

```html
<link rel="stylesheet" href="./styles/product.css" media="screen">
```

`stylesheet` 会下载并应用 CSS。`media` 指定适用媒介或媒体查询；不匹配时浏览器仍可能以较低优先级获取，但不会在该条件下应用。样式表会参与渲染，某些情况下还会影响后续脚本执行时机。

#### 图标

```html
<link
  rel="icon"
  href="./assets/market-icon.svg"
  type="image/svg+xml"
  sizes="any">
```

`icon` 提供页面图标候选。不同浏览器、书签界面和设备可能选择不同格式或尺寸，因此真实站点常提供多个候选。图标不会成为正文图片，也不需要替代文本。

#### 预加载

```html
<link
  rel="preload"
  href="./styles/product.css"
  as="style"
  type="text/css">
```

`preload` 只是提前获取提示，不会应用 CSS，也不会执行脚本。页面后面仍需正常的 `stylesheet`、`script`、`img` 等消费者使用同一资源。

`as` 不是装饰信息。它设置请求目标类型，影响优先级、`Accept` 请求头、CSP 检查和缓存复用。常见值包括 `style`、`script`、`image`、`font` 和 `fetch`。如果图片被错误标为 `as="script"`，预加载请求通常不能被后续 `<img>` 正确复用。

`type` 是 MIME 类型提示。浏览器可以在不支持某种类型时跳过预加载，但它不会把服务器返回的错误 `Content-Type` 自动改正确。

预加载字体时通常需要匹配字体请求的匿名 CORS 模式：

```html
<link
  rel="preload"
  href="./fonts/market.woff2"
  as="font"
  type="font/woff2"
  crossorigin>
```

预加载与真正消费者必须在 URL、请求目标和 CORS 模式等方面匹配，否则可能产生重复请求。

#### 规范地址

```html
<link
  rel="canonical"
  href="https://market.example/listings/lamp-001">
```

`canonical` 向搜索系统提示多个相似 URL 中偏好的规范地址。它应使用可访问的绝对 URL，并与页面真实内容一致。它不会重定向浏览器，不会阻止其他 URL 被访问，也不是跨域授权。

### 4.2 `media`、`as`、`integrity` 与 `crossorigin` 不可互相替代

这几个属性回答的是不同问题：

| 属性 | 回答的问题 | 典型用途 |
| --- | --- | --- |
| `media` | 在什么媒介或条件下适用 | stylesheet、部分 preload |
| `as` | preload 请求将被什么资源类型消费 | preload |
| `type` | 资源声明的 MIME 类型是什么 | icon、preload、stylesheet 提示 |
| `integrity` | 返回字节是否匹配预期哈希 | 外部 stylesheet、script 等受支持资源 |
| `crossorigin` | 跨源请求使用哪种 CORS 凭据模式 | stylesheet、preload、module、图片等 |

子资源完整性（SRI）示例：

```html
<link
  rel="stylesheet"
  href="https://cdn.example.test/product.css"
  integrity="sha384-BB4I7XuXiIzyNfO9S46soJavQbxwQaFewQu0ObIS337raWYQYE253i8fTQJoJG4C"
  crossorigin="anonymous">
```

上面的哈希只匹配以下两个以 LF 换行结尾的 CSS 行：

```css
:root { color-scheme: light; }
body { font-family: sans-serif; }
```

任何字节变化，包括换行差异，都会使完整性检查失败。跨源 SRI 资源还需要服务器提供允许该跨源读取的 CORS 响应。`crossorigin="anonymous"` 不发送用户凭据；`crossorigin="use-credentials"` 会请求携带凭据，并要求服务器明确允许凭据。不能为了“修好 CORS”随意改成 `use-credentials`。

SRI 验证的是获取到的资源字节，不证明资源业务逻辑安全，也不能替代依赖审查、版本固定或服务端安全策略。

### 4.3 `style` 的职责是当前文档 CSS

`style` 在文档内直接提供 CSS：

```html
<style>
  .price {
    font-weight: 700;
  }
</style>
```

它通常放在 `head`，规则进入同一文档的 CSS 级联。它适合很小的页面专用规则、教学演示或必须随文档交付的样式。可复用的大段样式通常放外部 CSS，以便缓存、共享和独立维护。

边界如下：

- `style` 不创建 HTML 结构。
- `style` 不执行 JavaScript。
- `style` 不只作用于它旁边的一个元素；旧的 `scoped` 写法已经过时。
- 普通文档 `style` 不提供组件安全隔离。
- 内联样式是否允许，可能受服务器发送的 CSP 限制。
- CSS 隐藏元素不等于访问控制，查看源代码或请求仍能获得内容。

### 4.4 四种脚本模式改变解析与执行时机

#### 同步 classic 脚本

```html
<script src="./scripts/classic.js"></script>
```

解析器遇到普通外部 classic 脚本时，通常暂停 HTML 解析，等待脚本获取并执行，然后继续向后解析。此时脚本后面的正文节点还不存在。普通内联 classic 脚本会在解析到它时立即执行。

这是“解析器阻塞”行为，不代表所有脚本都应放在 `body` 末尾。更重要的是根据依赖选择加载模式。

#### `defer` classic 脚本

```html
<script src="./scripts/defer-a.js" defer></script>
<script src="./scripts/defer-b.js" defer></script>
```

浏览器并行获取脚本，不暂停 HTML 解析；文档解析完成后按文档顺序执行，且在 `DOMContentLoaded` 之前完成。`defer` 对没有 `src` 的普通内联 classic 脚本不起同样作用，不要写 `<script defer>...</script>` 后期待延迟。

#### `async` classic 脚本

```html
<script src="./scripts/metrics-a.js" async></script>
<script src="./scripts/metrics-b.js" async></script>
```

浏览器并行获取，某个脚本准备好后尽快执行。执行时仍会占用主线程，并可能短暂停止解析。多个 async 脚本不保证文档顺序，也不应互相依赖。它们可能在解析完成前或后执行；`DOMContentLoaded` 不为普通 async 脚本建立统一的“之后再触发”保证，但 `load` 会等待页面相关资源完成。

async 适合独立统计等不依赖 DOM 顺序的脚本。业务初始化脚本如果有顺序依赖，通常不应直接改成 async。

#### module 脚本

```html
<script type="module" src="./scripts/product.js"></script>
```

module 脚本会获取并解析整个依赖图，默认表现为延迟执行：不阻塞 HTML 继续解析，在文档解析后执行，并在完成后才进入 `DOMContentLoaded`。module 默认使用严格模式，拥有模块作用域，外部 module 请求使用 CORS 规则。

`defer` 对 module 没有额外意义，因为 module 已默认延迟。给 module 加 `async` 会改为依赖图准备好后尽快执行，不再依赖文档顺序。使用 `import` 时应通过本地服务器运行，不要把 `file:` 下偶然可用的表现当成网站结论。

可以记住以下保证：

```text
同步 classic：解析到这里 → 等待并执行 → 继续解析
defer classic：并行获取 → 解析完成 → 按文档顺序执行 → DOMContentLoaded
async classic：并行获取 → 谁先准备好谁先执行，顺序不保证
module：并行获取依赖图 → 解析完成 → 执行 → DOMContentLoaded
```

不要死记某一次日志中的完整数字顺序。Network 缓存、资源大小和延迟会改变 async 的位置；应区分规范保证和本次观察。

### 4.5 `noscript` 在 `head` 与 `body` 的边界

当浏览器支持脚本但脚本被禁用时，`noscript` 提供替代内容。它不是“脚本请求失败时自动显示”的通用错误处理器：如果 JavaScript 已启用但某个文件 404，`noscript` 通常不会因此出现。

在 `head` 中，`noscript` 的内容受到严格限制，只能用于适合文档头的 `link`、`style`、`meta` 等允许项，不能放可见段落或标题：

```html
<noscript>
  <style>
    .requires-js {
      display: none;
    }
  </style>
</noscript>
```

在 `body` 中，可以放普通流内容，向用户解释无脚本时仍可做什么：

```html
<noscript>
  <p>脚本已禁用。你仍可阅读商品信息，但教学版收藏按钮不可用。</p>
</noscript>
```

`noscript` 不能嵌套。真正关键的内容不应只由脚本生成；商品名称、价格和安全说明应在基础 HTML 中可读。

## 5. 元素、属性、API 或配置清单

### 5.1 文档头核心元素

| 元素或配置 | 最小示例 | 主要作用 | 关键边界 |
| --- | --- | --- | --- |
| `head` | `<head>...</head>` | 容纳文档元信息 | 不等于可见页头 |
| `title` | `<title>阅读台灯 · 邻里集市</title>` | 文档级名称 | 不代替正文 `h1` |
| `meta charset` | `<meta charset="utf-8">` | 声明 HTML 编码 | 文件字节也必须是 UTF-8 |
| viewport | `width=device-width, initial-scale=1` | 设置移动布局视口 | 不自动修复溢出布局 |
| description | `name="description"` | 提供页面摘要候选 | 不保证搜索摘要或排名 |
| robots | `name="robots"` | 给合规爬虫索引提示 | 不是访问控制 |
| `base[href]` | `<base href="/market/">` | 改变文档基准 URL | 影响全部相对 URL 与片段 |
| `base[target]` | `<base target="_self">` | 设置默认导航目标 | 影响未显式声明目标的链接和表单 |
| `link` | `<link rel="stylesheet" ...>` | 声明文档与资源关系 | 行为取决于 `rel` |
| `style` | `<style>...</style>` | 提供文档内 CSS | 不提供结构或安全隔离 |
| `script` | `<script src="..."></script>` | 加载或包含脚本 | 模式决定解析与执行时机 |
| `noscript` | `<noscript>...</noscript>` | 脚本禁用时的替代 | 不处理普通脚本 404 |

### 5.2 常见 `link rel` 关系

| `rel` | 是否消费资源 | 是否自动应用或执行 | 常配属性 | 本课结论 |
| --- | --- | --- | --- | --- |
| `stylesheet` | 是 | 应用 CSS | `media`、`integrity`、`crossorigin` | 样式入口 |
| `icon` | 是 | 作为页面图标候选 | `type`、`sizes` | 不进入正文 |
| `preload` | 是 | 否，只提前获取 | `as`、`type`、`media`、`crossorigin` | 必须有后续消费者 |
| `canonical` | 否，不是预取 | 否 | 绝对 `href` | 搜索规范地址提示 |
| `alternate` | 视组合而定 | 不一定 | `hreflang`、`type`、`media` | 表示替代版本 |
| `manifest` | 是 | 交给 Web App Manifest 处理 | `crossorigin` | 不等于安装保证 |

本课重点是前四种。不要根据“都是 `link`”推断它们有相同行为。

### 5.3 资源相关属性

| 属性 | 合法思考方式 | 错误思考方式 |
| --- | --- | --- |
| `href` | 先用 `document.baseURI` 解析为绝对 URL | 看到字符串就认为一定相对当前文件 |
| `media` | 描述资源适用的媒体条件 | 当作设备检测或权限判断 |
| `as` | 告诉 preload 未来消费者的请求目标 | 随便填一个“差不多”的类型 |
| `type` | 提供 MIME 类型提示 | 用它覆盖错误响应头 |
| `integrity` | 校验精确响应字节的哈希 | 证明第三方脚本没有业务漏洞 |
| `crossorigin` | 选择 CORS 请求凭据模式 | 自动让对方服务器允许跨域 |
| `referrerpolicy` | 控制该资源请求携带的来源信息 | 代替认证或数据脱敏 |

### 5.4 脚本模式速查

| 写法 | 获取期间阻塞解析 | 典型执行时机 | 保持文档顺序 | `DOMContentLoaded` |
| --- | --- | --- | --- | --- |
| classic 无属性 | 是 | 解析器到达时 | 是 | 脚本先执行 |
| classic `defer` | 否 | 解析完成后 | 是 | 等待它 |
| classic `async` | 否 | 获取完成后尽快 | 否 | 不把它作为统一顺序屏障 |
| module | 否 | 解析完成且依赖图就绪 | 非 async module 按队列处理 | 等待它 |
| module `async` | 否 | 依赖图就绪后尽快 | 否 | 不依赖文档顺序 |

## 6. 最小可运行案例

### 6.1 渐进案例：观察 classic、`defer`、`async` 与 module 顺序

这个案例的目标不是背出一次固定序列，而是验证可依赖的偏序关系。

**文件位置**

```text
practice/html-head/script-order.html
practice/html-head/scripts/classic.js
practice/html-head/scripts/defer-a.js
practice/html-head/scripts/defer-b.js
practice/html-head/scripts/async-a.js
practice/html-head/scripts/async-b.js
practice/html-head/scripts/module-dependency.js
practice/html-head/scripts/module.js
```

**`script-order.html` 完整文件**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>脚本执行顺序观察 · 邻里集市</title>

  <script>
    window.executionLog = [];
    window.renderExecutionLog = function () {
      const list = document.querySelector("#execution-log");
      if (!list) return;

      const items = window.executionLog.map(function (text) {
        const item = document.createElement("li");
        item.textContent = text;
        return item;
      });
      list.replaceChildren(...items);
    };

    window.record = function (label) {
      const number = String(window.executionLog.length + 1).padStart(2, "0");
      const text =
        number + " " + label + " | readyState=" + document.readyState;
      window.executionLog.push(text);
      window.renderExecutionLog();
      console.log(text);
    };
  </script>

  <script src="./scripts/classic.js"></script>
  <script src="./scripts/defer-a.js" defer></script>
  <script src="./scripts/async-a.js" async></script>
  <script type="module" src="./scripts/module.js"></script>
  <script src="./scripts/defer-b.js" defer></script>
  <script src="./scripts/async-b.js" async></script>
</head>
<body>
  <h1>脚本执行顺序观察</h1>
  <p>刷新多次，并区分稳定顺序与可能变化的 async 位置。</p>
  <ol id="execution-log"></ol>

  <script>
    window.renderExecutionLog();
    window.record("body-inline");

    document.addEventListener("DOMContentLoaded", function () {
      window.record("DOMContentLoaded");
    });

    window.addEventListener("load", function () {
      window.record("load");
    });
  </script>
</body>
</html>
```

**各脚本完整内容**

```js
// scripts/classic.js
window.record("classic");
```

```js
// scripts/defer-a.js
window.record("defer-a");
```

```js
// scripts/defer-b.js
window.record("defer-b");
```

```js
// scripts/async-a.js
window.record("async-a");
```

```js
// scripts/async-b.js
window.record("async-b");
```

```js
// scripts/module-dependency.js
window.record("module-dependency");
export const listingId = "lamp-001";
```

```js
// scripts/module.js
import { listingId } from "./module-dependency.js";
window.record("module(" + listingId + ")");
```

**打开或运行方式**

1. 在练习根目录运行 `python3 -m http.server 8000`。
2. 打开 `http://localhost:8000/script-order.html`。
3. 打开 Console 与 Network，勾选 Disable cache。
4. 刷新至少五次。
5. 再把 Network 节流切到 Fast 3G，继续刷新。

**预期结果**

以下关系应该稳定：

- `classic` 早于 `body-inline`，且通常记录 `readyState=loading`。
- `body-inline` 早于 `defer-a` 和 `defer-b`。
- `defer-a` 早于 `defer-b`。
- `module-dependency` 早于 `module(lamp-001)`。
- defer 脚本与非 async module 在 `DOMContentLoaded` 之前完成。
- `DOMContentLoaded` 早于 `load`。
- 两个 async 脚本都在 `load` 之前执行，但彼此顺序以及它们相对 defer、module、`DOMContentLoaded` 的位置不应作为依赖。

**失败诊断**

| 现象 | 证据与修复 |
| --- | --- |
| module 报 CORS 或导入失败 | 确认通过 `http://localhost` 打开，而不是双击 `file:` |
| `record is not a function` | 定义 `window.record` 的内联脚本必须位于所有外部脚本之前 |
| defer 顺序颠倒 | 检查是否误加 `async`，以及文件名是否对应 |
| async 每次都恰好同序 | 这不证明有顺序保证；启用网络节流或增大文件后再观察 |
| 日志缺少某一项 | 在 Network 检查 404，在 Console 检查语法和 MIME 错误 |

## 7. 邻里集市集成案例

现在把前面的机制组合为一张可运行的商品详情页。案例包含完整 `head`、本地样式、SVG 图标和 module 脚本。页面只展示教学数据，不执行真实收藏或预约。

### 7.1 文件结构

```text
practice/html-head/
├── product.html
├── assets/
│   └── market-icon.svg
├── scripts/
│   └── product.js
└── styles/
    └── product.css
```

### 7.2 `product.html`：完整商品页与完整 `head`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <title>阅读台灯，39元 · 邻里集市</title>
  <meta
    name="description"
    content="邻里集市二手阅读台灯，售价39元，可在社区公共地点当面试用。">
  <meta
    name="robots"
    content="index, follow, max-image-preview:large">

  <link
    rel="canonical"
    href="https://market.example/listings/lamp-001">
  <link
    rel="icon"
    href="./assets/market-icon.svg"
    type="image/svg+xml"
    sizes="any">

  <link
    rel="preload"
    href="./styles/product.css"
    as="style"
    type="text/css">
  <link
    rel="stylesheet"
    href="./styles/product.css"
    media="screen">

  <style>
    .metadata-note {
      color: #555;
    }
  </style>

  <script type="module" src="./scripts/product.js"></script>

  <noscript>
    <style>
      .requires-js {
        display: none;
      }
    </style>
  </noscript>
</head>
<body>
  <header>
    <p><a href="./product.html">邻里集市</a></p>
    <h1>阅读台灯</h1>
  </header>

  <main>
    <p>价格：<data value="3900">39.00 元</data></p>
    <p>
      发布于
      <time datetime="2026-10-10T08:00:00Z">2026年10月10日</time>
    </p>
    <p><strong>接电前请检查电源线，当面试用后再交接。</strong></p>
    <p class="metadata-note">
      标签页标题可以比正文标题多出价格与站点名。
    </p>

    <section aria-labelledby="resource-observation">
      <h2 id="resource-observation">资源观察</h2>
      <p class="requires-js" id="script-status">module 脚本尚未记录状态。</p>
      <dl>
        <dt>当前 title</dt>
        <dd id="current-title"></dd>
        <dt>当前 h1</dt>
        <dd id="current-heading"></dd>
        <dt>基准 URL</dt>
        <dd id="current-base"></dd>
      </dl>
    </section>

    <noscript>
      <p>
        JavaScript 已禁用。商品名称、价格和安全说明仍可阅读，
        但资源观察值不会自动填充。
      </p>
    </noscript>
  </main>

  <footer>
    <small>静态教学页面，不接受付款，也不会创建预约。</small>
  </footer>
</body>
</html>
```

这份 `head` 的顺序有意保持清楚：

1. 编码尽早出现。
2. viewport 紧随基础解析信息。
3. `title`、description、robots 描述文档身份与发现方式。
4. canonical 与 icon 表达文档关系。
5. preload 在消费者之前提示样式请求，stylesheet 真正应用样式。
6. 小段页面专用 CSS 放在 `style`。
7. module 脚本默认延迟执行。
8. `head` 中的 `noscript` 只包含允许的 `style`。

### 7.3 `styles/product.css`

```css
:root {
  color-scheme: light;
  font-family: system-ui, sans-serif;
}

body {
  max-width: 48rem;
  margin: 0 auto;
  padding: 1rem;
  line-height: 1.6;
  color: #222;
  background: #faf8f2;
}

header,
footer {
  padding-block: 1rem;
  border-block: 1px solid #d7d1c4;
}

h1 {
  margin-block: 0.25rem 1rem;
}

data {
  font-weight: 700;
}

dt {
  margin-block-start: 0.75rem;
  font-weight: 700;
}

dd {
  margin-inline-start: 0;
  overflow-wrap: anywhere;
}
```

### 7.4 `scripts/product.js`

```js
const titleOutput = document.querySelector("#current-title");
const headingOutput = document.querySelector("#current-heading");
const baseOutput = document.querySelector("#current-base");
const statusOutput = document.querySelector("#script-status");

titleOutput.textContent = document.title;
headingOutput.textContent = document.querySelector("h1").textContent;
baseOutput.textContent = document.baseURI;
statusOutput.textContent =
  "module 已执行，执行时 readyState=" + document.readyState + "。";

console.assert(document.title.includes("阅读台灯"), "title 应包含商品名");
console.assert(
  document.querySelector("h1").textContent === "阅读台灯",
  "h1 应准确描述正文主题"
);
console.assert(
  document.querySelector('link[rel="canonical"]').href ===
    "https://market.example/listings/lamp-001",
  "canonical 应是预期的绝对 URL"
);
```

### 7.5 `assets/market-icon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0b6b53"/>
  <path d="M16 28h32l-3 23H19z" fill="#fff"/>
  <path d="M23 28a9 9 0 0 1 18 0" fill="none" stroke="#fff" stroke-width="5"/>
</svg>
```

### 7.6 打开方式、预期与失败诊断

**打开或运行方式**

1. 在 `practice/html-head/` 启动 `python3 -m http.server 8000`。
2. 打开 `http://localhost:8000/product.html`。
3. 在 Network 勾选 Disable cache 后刷新。
4. 依次筛选 Doc、CSS、JS，查看 Initiator 和响应 `Content-Type`。
5. 在 Elements 展开 `head`，确认资源元素都位于其中。

**预期结果**

- 商品页有样式，标签页和正文标题都准确但不完全相同。
- `product.css` 由 preload 提前提示，并由 stylesheet 消费和应用。
- module 脚本在正文解析后填入三个观察值。
- Console 三条断言均不报错。
- 禁用 JavaScript 后，商品核心信息仍可读，`body` 中的 `noscript` 提示出现。

**失败诊断**

| 现象 | 检查路径 |
| --- | --- |
| 页面完全无样式 | Network 查 `product.css` 状态，再核对 `href` 与文件目录 |
| CSS 请求成功但未应用 | 检查 `rel="stylesheet"`、`media` 是否匹配、响应 MIME 是否正确 |
| 图标不显示 | Network 查 SVG，核对 `type` 与 SVG 语法；部分界面会延迟刷新图标缓存 |
| module 不执行 | Console 查语法/CORS/MIME，确认通过 HTTP 打开 |
| `noscript` 始终不出现 | 它只在脚本禁用时生效，不是脚本文件 404 提示器 |
| canonical 指向示例域名 | 这是教学地址；真实发布必须替换为页面真实规范地址 |

### 7.7 集成边界

本案例使用 `meta name="robots" content="index, follow"` 是为了说明语法。一个本地 `localhost` 页面不会因此自动进入公开搜索索引。示例 canonical 使用保留示例域名，不应直接复制到生产。

更重要的是：

- 页面里的价格仍是作者写入的静态值，没有数据库校验。
- description 与结构化内容必须和可见正文一致，但本身不证明商品真实。
- robots、canonical、`noscript`、SRI 和 meta CSP 都不提供用户权限。
- 真实商品草稿必须由服务器拒绝未授权请求，不能只写 `noindex`。
- 真实安全响应头要在服务器或部署平台配置，并在 Network 的 Response Headers 中验证。

## 8. 常见错误与排查路径

### 8.1 错误案例三：preload 的资源类型与消费者不匹配

**文件位置**

```text
practice/html-head/preload-mismatch.html
practice/html-head/assets/hero.svg
```

**`assets/hero.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#f1eadc"/>
  <path d="M260 245h120l-18 42h-84z" fill="#0b6b53"/>
  <path d="M320 80v165M250 150h140" stroke="#0b6b53" stroke-width="18"/>
  <text x="320" y="330" text-anchor="middle" font-size="28">阅读台灯</text>
</svg>
```

**错误示例**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>preload 类型不匹配 · 邻里集市</title>
  <link
    rel="preload"
    href="./assets/hero.svg"
    as="script"
    type="image/svg+xml">
</head>
<body>
  <h1>阅读台灯</h1>
  <img
    src="./assets/hero.svg"
    alt="绿色阅读台灯示意图"
    width="640"
    height="360">
</body>
</html>
```

**打开或运行方式**

1. 通过本地服务器打开 `http://localhost:8000/preload-mismatch.html`。
2. Network 勾选 Disable cache，清空记录后刷新。
3. 筛选 `hero.svg`，查看 Initiator、Type 和请求时机。
4. 同时查看 Console 是否出现“预加载未使用”或 MIME/目标类型相关警告。

**预期错误**

图片最终可能仍显示，因为 `<img>` 会正常发起图片请求；但错误的 `as="script"` 给了浏览器错误的请求目标，预加载可能被跳过、被拦截，或不能被图片消费者复用。不同浏览器的具体警告文字可以不同。

**修复**

```html
<link
  rel="preload"
  href="./assets/hero.svg"
  as="image"
  type="image/svg+xml">
```

再次清空 Network 并刷新。正确预加载应与 `<img>` 的 URL 和资源类型匹配。不要只以“请求数量恰好是一条”下结论；还要查看 Initiator、请求目标和 Console 警告。

### 8.2 高频现象诊断表

| 现象 | 先取什么证据 | 常见根因 | 恢复动作 |
| --- | --- | --- | --- |
| 标签页标题错误 | Elements 中 `title`、`document.title` | 漏写、重复或脚本改写 | 保留一个准确 `title`，追踪改写脚本 |
| 正文没有主标题 | 标题导航、Elements | 把 `title` 当成 `h1` | 在 `body` 写可见 `h1` |
| 中文乱码 | 文件编码、文档响应头、meta | 三者不一致或字节已损坏 | 统一 UTF-8，从原文恢复损坏字节 |
| 手机页面缩小 | viewport 与布局宽度 | 缺 viewport 或固定宽度溢出 | 加标准 viewport，再修 CSS |
| 样式 200 但不生效 | Response MIME、`rel`、`media` | 关系或媒体不匹配 | 修正 stylesheet 关系与 MIME |
| SRI 资源被拒绝 | Console 与 Network | 哈希、字节或 CORS 不匹配 | 重新生成哈希并配置服务器 CORS |
| preload 重复请求 | 两条请求的 Initiator 和模式 | `as`、URL、CORS 模式不匹配 | 让提示与真实消费者完全匹配 |
| defer 未延迟 | 脚本是否有 `src` | 把 `defer` 加在内联 classic 上 | 使用外部 defer 或移动逻辑 |
| async 依赖偶发失败 | 多次刷新日志 | 错误依赖 async 顺序 | 改用 defer/module 或显式依赖 |
| module 在本地文件失败 | 地址栏协议与 Console | 通过 `file:` 打开 | 使用本地 HTTP 服务器 |
| 脚本 404 但 noscript 不显示 | JS 是否启用 | 误解 `noscript` 触发条件 | 给加载失败单独设计错误处理 |
| 片段跳到别的站点 | `document.baseURI`、链接 `.href` | `base` 改变片段解析 | 删除 base 或写明确 URL |
| `noindex` 页面仍可访问 | 直接请求状态 | 把索引提示当权限 | 在服务器实施认证授权 |
| meta CSP 没挡住某能力 | Response Headers 与策略位置 | 使用了 meta 不支持的指令 | 改由服务器发送完整 CSP |

## 9. 课后题

### 9.1 题目

1. `head` 和 `header` 的核心区别是什么？
2. 为什么商品页同时需要 `title` 和 `h1`？
3. 写了 `<meta charset="utf-8">` 后，为什么仍可能乱码？
4. viewport 能否自动把固定宽 1200px 的页面变成响应式页面？
5. `meta name="description"` 是否保证搜索结果一定显示该文字？
6. `noindex` 能否阻止未登录用户打开草稿商品页？
7. 为什么 `<base href="https://cdn.example/">` 可能让 `href="#details"` 离开当前页面？
8. preload 为什么仍需后续的 stylesheet、script 或 img？
9. 预加载字体时，为什么要关注 `crossorigin`？
10. 两个 defer 脚本与两个 async 脚本，哪一组可以依赖文档顺序？
11. module 脚本为什么通常不需要再写 `defer`？
12. JavaScript 文件 404 时，`noscript` 是否一定显示？
13. meta CSP 为什么不能完全代替 HTTP CSP？
14. canonical 是否会把访问者自动重定向到规范地址？
15. 哪些安全能力不能通过本课元信息实现？至少列出四项。

### 9.2 参考答案

1. `head` 保存文档级元信息和资源关系，通常不成为可见正文；`header` 位于 `body`，表示页面或分节的可见页头结构。
2. `title` 用于标签页、历史、书签等文档界面；`h1` 是正文主标题。它们用途不同，应相关但可包含不同补充信息。
3. 文件可能没有以 UTF-8 保存，HTTP 响应头可能声明了冲突字符集，或者原始文字已经被错误转换并保存。
4. 不能。viewport 设置布局视口；固定宽度、图片溢出和布局规则仍需 CSS 修复。
5. 不保证。搜索系统可以根据查询和正文选择其他摘要。
6. 不能。`noindex` 是给合规爬虫的索引提示，不是认证或授权。
7. 片段引用仍是相对 URL，会以文档基准 URL 解析。
8. preload 只提前获取，不应用 CSS、不执行脚本，也不把图片插入正文。
9. 字体请求通常采用匿名 CORS 模式。preload 与真实字体消费者模式不匹配时，可能重复获取或失败。
10. defer classic 保持文档顺序；async 不保证顺序。
11. module 默认在解析后执行，已经具有延迟特征；`defer` 对 module 没有额外作用。
12. 不一定。`noscript` 取决于脚本是否被禁用，不是外部脚本加载错误的通用回退。
13. meta 解析时机更晚，且不支持 `frame-ancestors`、报告专用模式等完整能力。HTTP 头在文档解析前生效。
14. 不会。canonical 是规范 URL 提示，不是导航或 HTTP 重定向。
15. 可列：认证、授权、`Set-Cookie`、HSTS、CORS、COOP、COEP、CORP、`X-Content-Type-Options`、完整 CSP、真正 HTTP 重定向、可靠缓存策略。答出任意四项并说明由服务器负责即可。

### 9.3 判断理由标准

答案不只写“能”或“不能”，还应指出机制所在层次：

- HTML 解析层：`head`、meta、`base`、`noscript`。
- URL 与资源层：link 关系、preload、CORS 模式。
- 脚本调度层：classic、defer、async、module。
- HTTP 层：状态码、响应头、缓存、安全策略。
- 应用服务层：认证、授权、数据校验与持久化。

能说清“谁负责、何时生效、怎样观察”，才算真正理解。

## 10. 实践练习

### 10.1 提升练习：预测并验证脚本偏序

在 6.2 的案例中增加：

```html
<script src="./scripts/defer-c.js" defer></script>
<script type="module" src="./scripts/module-b.js"></script>
```

先写预测，再运行。预测必须使用偏序，而不是强行写一个总顺序：

```text
classic < body-inline < defer-a < defer-b < defer-c < DOMContentLoaded
module-dependency < module < DOMContentLoaded
module-b < DOMContentLoaded
DOMContentLoaded < load
```

不要声称 defer 组与 module 组之间每一项都有固定交错顺序，也不要给 async 排固定位置。

然后在 Network 中记录：

- 每个脚本的 Initiator。
- 是否从缓存读取。
- async 在五次刷新中的位置。
- module 依赖文件由谁发起。

**完成标准**

- 三个 defer 始终保持 `a → b → c`。
- module 依赖先于入口模块的主体执行。
- 能解释 async 即使五次同序也不构成规范保证。
- 没有把 `load` 与 `DOMContentLoaded` 混为一谈。

## 11. 阶段验收

### 11.1 通过标准

满足以下条件才算通过本课：

- 能独立写出完整商品页 `head`，不是从答案盲拷。
- 能用机制预测脚本顺序，并拒绝为 async 编造固定顺序。
- 能复现并修复乱码、`base` 偏移与 preload 类型错误。
- 能在 Network 区分请求头、响应头、资源类型和发起者。
- 能明确说出：“HTML 元信息可以描述和提示，但认证、授权、CORS、HSTS、Cookie、完整 CSP 等由服务器或 HTTP 响应负责。”

## 12. 常见问题

### 12.1 preload 越多越快吗？

不是。preload 会占用带宽和连接优先级。预加载未尽快使用、类型错误或优先级不当，反而会挤压关键资源。只预加载已确认关键且很快被消费的资源，并用 Network 验证。

### 12.2 `prefetch` 和 `preload` 一样吗？

不一样。preload 面向当前导航中的高优先级资源；prefetch 通常提示未来导航可能使用的低优先级资源。两者都只是提示，不应混用。

### 12.3 为什么样式表会影响脚本执行？

脚本可能读取样式或布局，浏览器需要保持一致的执行模型。某些在脚本之前发现且正在加载的阻塞样式表会延后解析器阻塞脚本的执行。不要把“脚本标签在前后”当成唯一时间因素。

### 12.4 module 和 classic 能共享全局变量吗？

classic 顶层 `var` 和显式写入 `window` 的值可成为全局属性；module 有独立模块作用域，顶层声明不会自动挂到 `window`。需要共享时应显式导入导出，或明确使用公共接口。

### 12.5 为什么 async 不等待 `DOMContentLoaded`？

async 的目标是资源准备好后尽快执行，而不是加入文档顺序队列。它可能早于或晚于 `DOMContentLoaded`，取决于网络和解析时机，因此不能用该事件推断所有 async 已完成。

### 12.6 `noscript` 能处理浏览器不支持某个新 API 吗？

不能准确处理。JavaScript 仍然启用时，`noscript` 不会显示。应在脚本中做特性检测，并提供可用的 HTML 回退。

## 13. 扩展阅读

### 13.1 资源加载与脚本

- [MDN：`<link>`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/link)
- [MDN：资源预加载 `rel=preload`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Attributes/rel/preload)
- [MDN：`<script>`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/script)
- [MDN：JavaScript modules](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules)
- [MDN：Subresource Integrity](https://developer.mozilla.org/zh-CN/docs/Web/Security/Subresource_Integrity)
- [W3C：Subresource Integrity](https://www.w3.org/TR/SRI/)

## 我现在能做到什么

- 能解释并验证：解释资源关系、加载属性与脚本执行时机，并通过 Network 和执行顺序证据定位失败。
- `DOC-015`：`link` 资源关系及加载属性
- `DOC-016`：`style` 与文档内样式边界
- `DOC-017`：普通脚本、`defer`、`async`、module
- `DOC-018`：`noscript` 在 head/body 中的边界
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：文档头与元信息：定义页面身份、编码与基准 URL](03-head-metadata-base.md) · [下一课：文本层次与强调语义：从标题、段落到重点标记](05-text-structure-emphasis.md) · [返回 HTML 模块](../README.md)
