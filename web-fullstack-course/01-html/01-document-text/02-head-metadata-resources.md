# 02 文档头、元信息与资源加载：让商品页先被正确识别

## 任务卡

王阿姨的二手台灯商品页已经有正文，但标签页显示文件名，手机上页面缩得很小，中文偶尔乱码，样式和脚本的加载顺序也说不清。你的任务是补全这张“邻里集市”商品页的文档头，让浏览器能正确识别页面、解析文字、适配移动设备，并按可解释的顺序加载资源。

| 任务关卡 | 你要完成的结果 | 可观察证据 |
| --- | --- | --- |
| 识别页面 | 写出准确的 `title`、编码、视口和摘要 | 标签页、Elements、页面源代码 |
| 区分职责 | 分清 `head`、可见 `header`、`title` 与 `h1` | DOM 树与页面正文 |
| 连接资源 | 正确连接样式、图标、预加载资源和规范地址 | Network、Computed、地址解析结果 |
| 预测脚本 | 解释 classic、`defer`、`async`、module 的顺序 | 页面日志与 Console |
| 诊断故障 | 修复乱码、`base` 链接偏移和 preload 类型不匹配 | Headers、Network、修复记录 |
| 守住边界 | 说明哪些安全能力必须由 HTTP 响应头或服务器提供 | 响应头检查表 |

建议学习用时为 4 至 6 小时。所有练习文件都创建在你自己的 `practice/html-head/` 目录中；教材仓库不需要创建 `labs`。本课页面仍是静态教学页，不包含账号、付款、真实预约、服务端持久化或访问控制。

完成证据至少包括：

1. 一张完整商品页的页面截图和 Elements 中的 `head`。
2. 一份脚本执行日志，并标出哪些顺序是保证的、哪些不保证。
3. 一份故障恢复记录，包含现象、证据、根因、修复和复测结果。
4. 一段口头或书面说明：为什么安全元信息不能冒充服务端安全响应头。

## 1. 任务背景

浏览器不能只靠正文猜出页面的一切信息。它还需要知道字符如何解码、标签页显示什么、移动设备用多宽的布局视口、应加载哪些样式和脚本，以及相对 URL 以哪里为基准。这些信息主要放在文档的 `head` 中。

初学者常把 `head` 误认为页面顶部横幅，也会把 `title` 与正文 `h1` 当成同一个标题。它们虽然都与“标题”有关，出现位置和使用者却不同：

- `head` 是文档元信息容器，通常不直接成为页面可见内容。
- `header` 是 `body` 中的可见结构，可放品牌、标题、搜索或导航。
- `title` 是文档级名称，常用于浏览器标签、历史记录和书签。
- `h1` 是正文中的一级标题，用户打开页面后可以看到。

资源加载也不只是“把标签写进去”。`link` 的关系类型会告诉浏览器资源的用途；`script` 的属性会改变解析是否暂停、何时执行以及顺序是否稳定；`base` 会重写整份文档对相对 URL 的理解。一个看似很小的文档头，实际连接了 HTML 解析、URL 解析、网络请求、渲染和搜索发现。

本课继续使用“邻里集市二手阅读台灯”作为连续案例。你会先做一个最小页面，再扩展为完整商品页，最后主动制造三类故障并用浏览器证据修复。

## 2. 学习目标

完成本课后，你应能：

- 区分 `head` 与可见的 `header`，区分 `title` 与正文 `h1`。
- 写出位置合理的 `meta charset`、viewport、description 和 robots。
- 解释 `http-equiv` 只能模拟少数响应头语义，不能替代完整 HTTP 响应头。
- 预测 `base` 对链接、图片、样式、脚本、表单动作和片段链接的文档级影响。
- 根据资源目的选择 `stylesheet`、`icon`、`preload` 和 `canonical`。
- 解释 `media`、`as`、`type`、`integrity` 与 `crossorigin` 各自改变什么。
- 说明 `style` 负责 CSS 规则，不负责页面结构、脚本行为或服务端安全。
- 比较同步 classic、`defer`、`async` 和 module 脚本的解析与执行时机。
- 说明 `noscript` 在 `head` 与 `body` 中允许内容和作用范围的差异。
- 使用 Elements、Network、Console 和响应头定位乱码、重复请求及顺序问题。
- 明确 robots、description、canonical、meta CSP 等都不是认证、授权或秘密保护机制。

这些目标都有可观察结果。仅仅“页面看起来正常”不算完成；你需要指出浏览器实际使用了哪个标题、哪个基准 URL、哪种请求目标和哪条执行顺序保证。

## 3. 预备知识

开始前，你只需要：

- 会创建和保存文本文件。
- 知道一个 HTML 文档通常包含 `doctype`、`html`、`head` 和 `body`。
- 能在浏览器中打开开发者工具，并找到 Elements、Console 和 Network。
- 知道相对路径 `./styles/product.css` 是相对于某个基准 URL 解析的。

还不需要掌握 CSS 和 JavaScript。示例中的少量 CSS 用来让加载结果可见，JavaScript 用来记录执行顺序。先按原样运行，再根据日志理解机制。

练习约定如下：

| 约定 | 本课使用方式 |
| --- | --- |
| 练习根目录 | `practice/html-head/` |
| 本地服务器 | 在练习根目录运行 `python3 -m http.server 8000` |
| 页面地址 | `http://localhost:8000/文件名.html` |
| 停止服务器 | 回到终端按 `Ctrl+C` |
| 商品价格 | 仍使用整数分，例如 `3900` 表示 39.00 元 |
| 时间 | 机器值仍使用 ISO 8601 UTC |
| 网络状态 | Network 勾选 Disable cache 后刷新，便于观察 |

为什么推荐本地服务器，而不是一直双击 HTML：

- module 脚本、CORS 和 HTTP 响应头需要 HTTP 上下文才能稳定观察。
- `file:` URL 的根路径和权限行为与网站不同，容易把路径问题混在一起。
- Network 面板在 HTTP 页面中能显示更完整的请求、状态与响应头。

如果端口 8000 已占用，可以改用 8001，并同步修改浏览器地址。端口变化不会改变本课机制。

## 4. 核心理论

### 4.1 `head` 不是页面顶部的 `header`

一个文档只能有一个主要的 `head`。它位于 `html` 中、`body` 之前，保存文档级元信息和资源关系。浏览器读取它来设置标题、字符编码、视口并发起资源请求。

```html
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>阅读台灯 · 邻里集市</title>
</head>
<body>
  <header>
    <p>邻里集市</p>
    <h1>阅读台灯</h1>
  </header>
</body>
</html>
```

这里的 `header` 属于正文。它可以显示，也可以有多个，例如页面级 `header` 和商品卡片自己的 `header`。`head` 不负责视觉上的“头部布局”，`header` 也不能代替字符编码、文档标题或资源关系。

浏览器有错误恢复能力。即使省略某些标签，它也可能在 DOM 中补出 `head` 和 `body`。教材仍要求明确书写完整骨架，因为明确结构更容易审查，也不会让元信息意外落到错误位置。

### 4.2 `title` 与 `h1` 服务于不同界面

`title` 的内容是纯文本。它通常出现在：

- 浏览器标签页。
- 浏览历史。
- 书签默认名称。
- 搜索结果标题的候选来源之一。
- 辅助技术识别文档时使用的页面名称。

`h1` 是正文的一部分，出现在页面内容和无障碍标题导航中。两者应相关，但不必逐字相同：

```html
<title>阅读台灯，39元 · 邻里集市</title>
<h1>阅读台灯</h1>
```

`title` 可以补充站点名或用于区分多个相似标签页，`h1` 则应直接说明当前正文的主主题。不要为了 SEO 堆砌词语，也不要只写“详情”“首页”这类无法区分页面的标题。

常见失败：

- 只写 `title`，正文没有可见主标题。
- 只写 `h1`，浏览器标签仍显示文件名或 URL。
- 每个商品页都写相同的 `title`，打开多个标签后无法分辨。
- 用 HTML 标签装饰 `title`，例如 `<title><strong>台灯</strong></title>`。其中标签不会按正文元素渲染。

### 4.3 `meta charset`：先把字节解码成字符

HTML 文件在磁盘或网络中是字节。浏览器必须先选择字符编码，才能把字节解释成“邻里集市”等字符。现代 HTML 文档应使用 UTF-8：

```html
<meta charset="utf-8">
```

关键边界：

1. 文件本身必须真的以 UTF-8 保存。
2. 声明应尽早出现，并位于文档开头 1024 字节内。
3. HTML 中的标准编码声明值是 `utf-8`。
4. 如果 HTTP `Content-Type` 明确发送了另一个字符集，传输层信息可能先于文档内声明参与编码判断。
5. 如果字节已经被错误解码后又保存成乱码文字，改 `charset` 不能还原原始内容。

`charset` 不是语言声明。中文文档仍需在根元素写 `lang="zh-CN"`。编码回答“字节怎样变成字符”，`lang` 回答“这些文字主要是什么语言”。

### 4.4 viewport：控制移动端布局视口，不是缩放锁

常见移动端声明是：

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

- `width=device-width`：让 CSS 布局视口宽度接近设备宽度。
- `initial-scale=1`：设置初始缩放比例。

没有这条声明时，移动浏览器可能使用较宽的虚拟布局视口，再把整页缩小。文字因此显得很小，响应式 CSS 的断点也可能不按预期触发。

不要通过 `user-scalable=no` 或极小的 `maximum-scale` 禁止用户缩放。低视力用户需要放大内容，锁缩放会制造无障碍问题。viewport 也不会自动让页面响应式；布局是否溢出仍由 CSS、图片尺寸和内容共同决定。

### 4.5 description 与 robots：发现提示，不是访问控制

页面摘要：

```html
<meta
  name="description"
  content="邻里集市二手阅读台灯，售价39元，支持社区公共地点当面试用。">
```

搜索引擎可能把 description 作为结果摘要，也可能根据查询改用正文片段。它不是必然展示的广告语，更不是排名保证。摘要应准确、具体，并与可见正文一致。

抓取与索引提示：

```html
<meta name="robots" content="index, follow, max-image-preview:large">
```

教学页或不希望进入索引的预览页可以写：

```html
<meta name="robots" content="noindex, nofollow">
```

边界必须说清：

- robots 指令只对愿意遵守它的爬虫有意义。
- `noindex` 不是密码，知道 URL 的人仍可能访问页面。
- 页面必须先能被爬虫读取，爬虫才能看到页面内的 robots 元信息。
- `robots.txt` 管抓取路径提示，页面内 robots 管当前文档的索引和链接跟随提示，两者不是同一个文件或机制。
- 私密商品、草稿、用户资料必须依靠服务器认证、授权和数据隔离，不能依赖 robots。

### 4.6 `base`：一次设置，改变整份文档的相对 URL

`base` 可以设置文档基准 URL：

```html
<base href="https://static.example.test/market/">
```

之后，浏览器会据此解析文档中的相对 URL：

| 原始写法 | 使用上述 `base` 后的结果 |
| --- | --- |
| `href="help.html"` | `https://static.example.test/market/help.html` |
| `src="images/lamp.jpg"` | `https://static.example.test/market/images/lamp.jpg` |
| `action="reserve"` | `https://static.example.test/market/reserve` |
| `href="#pickup"` | `https://static.example.test/market/#pickup` |

最后一行最容易被忽略。`#pickup` 看起来像“当前页面片段”，但它仍是相对 URL。设置远程 `base` 后，点击它可能离开当前文档。

`base` 的影响还包括 `script src`、`link href`、`iframe src`、`object data`，以及 JavaScript 中按文档基准解析的 `new URL(relative, document.baseURI)`。内联样式中的相对 URL 也以文档基准为基础；外部 CSS 文件内部的相对 URL 通常以该 CSS 文件自己的 URL 为基础。

一个文档最多应使用一个有效 `base`，并放在 `head` 中。对多个 `base href`，文档使用第一个相关值；依赖这种冲突行为会使维护者误判。`base target` 还能给未声明 `target` 的链接和表单设置默认浏览上下文，同样是文档级副作用。

更稳妥的初学者策略是：

- 没有明确部署需求时，不使用 `base`。
- 为页面资源写与当前目录结构一致的明确相对路径。
- 必须使用 `base` 时，逐项检查链接、图片、脚本、样式、表单动作和片段。
- 不把 `base` 当作修复任意路径错误的快捷补丁。

### 4.7 `link` 用关系类型说明“当前文档与资源是什么关系”

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

### 4.8 `media`、`as`、`integrity` 与 `crossorigin` 不可互相替代

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

### 4.9 `style` 的职责是当前文档 CSS

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

### 4.10 四种脚本模式改变解析与执行时机

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

### 4.11 `noscript` 在 `head` 与 `body` 的边界

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

### 4.12 HTTP 响应头与 `meta http-equiv` 的分工

`meta http-equiv` 能表达少数类似 HTTP pragma 的文档指令，例如旧式内容类型声明、刷新，以及受限形式的 Content Security Policy：

```html
<meta http-equiv="refresh" content="30">
```

但它不是任意响应头注入器。浏览器拿到响应头时，文档甚至可能还没开始解析；而 meta 只有解析到该元素后才有机会生效。两者时机和能力天然不同。

| 需求 | HTML 元信息能否完整替代 | 正确责任方 |
| --- | --- | --- |
| 指定 UTF-8 | 可在文档内声明，但服务器也应正确发送 | HTML 与服务器配置 |
| 真正的 301/302 重定向 | 不能，refresh 不是 HTTP 重定向 | 服务器或边缘网关 |
| `Set-Cookie` | 不能 | 服务器响应 |
| HSTS | 不能 | HTTPS 响应头 |
| `X-Content-Type-Options` | 不能 | 服务器响应头 |
| `X-Frame-Options` | 不能 | 服务器响应头，或 CSP `frame-ancestors` |
| CSP `frame-ancestors` | meta CSP 中无效 | HTTP CSP 响应头 |
| CSP 报告专用模式 | meta 不能完整提供 | HTTP `Content-Security-Policy-Report-Only` |
| COOP、COEP、CORP | 不能 | HTTP 响应头 |
| CORS | 不能 | 目标资源服务器响应头 |
| 缓存控制 | 不能可靠替代 | HTTP `Cache-Control` 等 |
| 权限与数据隔离 | 完全不能 | 服务端认证、授权和数据层 |

meta CSP 即使可用于部分策略，也只会影响它之后的内容，并缺少若干只能由 HTTP 头表达的指令。生产安全基线应优先由服务器发送 HTTP CSP。教材中的安全元信息不能写成“加一行 meta 就防住攻击”。

`http-equiv="refresh"` 还可能打断阅读、焦点和历史导航。需要跳转时优先使用正确 HTTP 状态码；需要定时更新时，应让用户知道并能控制。

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

### 5.5 可用于观察的 DOM 属性

| API | 观察内容 | 示例 |
| --- | --- | --- |
| `document.title` | 当前文档标题文本 | `console.log(document.title)` |
| `document.head` | 实际 `head` 元素 | `console.log(document.head)` |
| `document.baseURI` | 浏览器使用的文档基准 URL | `console.log(document.baseURI)` |
| `HTMLAnchorElement.href` | 链接解析后的绝对 URL | `document.querySelector("a").href` |
| `document.readyState` | `loading`、`interactive` 或 `complete` | 记录脚本执行时状态 |
| `performance.getEntriesByType("resource")` | 已记录的资源请求条目 | 辅助发现重复获取 |

这些属性用于观察，不会替你判断业务正确性。尤其是 `document.title` 可被脚本修改，源代码和当前 DOM 值可能不同。

## 6. 最小可运行案例

### 6.1 最小案例：同时观察 `title`、`h1`、`head` 与 `header`

**文件位置**

```text
practice/html-head/minimal.html
```

**完整文件**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta
    name="description"
    content="邻里集市阅读台灯商品页的文档头教学案例。">
  <title>阅读台灯，39元 · 邻里集市</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 42rem;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    header {
      border-block-end: 1px solid #ccc;
    }
  </style>
</head>
<body>
  <header>
    <p>邻里集市</p>
    <h1>阅读台灯</h1>
  </header>

  <main>
    <p>价格：<data value="3900">39.00 元</data></p>
    <dl>
      <dt>文档标题</dt>
      <dd id="document-title"></dd>
      <dt>正文一级标题</dt>
      <dd id="page-heading"></dd>
      <dt>文档基准 URL</dt>
      <dd id="base-uri"></dd>
    </dl>
  </main>

  <script>
    document.querySelector("#document-title").textContent = document.title;
    document.querySelector("#page-heading").textContent =
      document.querySelector("h1").textContent;
    document.querySelector("#base-uri").textContent = document.baseURI;
  </script>
</body>
</html>
```

**打开或运行方式**

1. 保存文件。
2. 在 `practice/html-head/` 运行 `python3 -m http.server 8000`。
3. 打开 `http://localhost:8000/minimal.html`。
4. 在 Elements 中分别定位 `head` 和 `body > header`。

**预期结果**

- 标签页显示“阅读台灯，39元 · 邻里集市”。
- 页面可见主标题是“阅读台灯”。
- 页面列表显示 `document.title`、`h1` 文本和 `document.baseURI`。
- `head` 不在正文布局中；`header` 位于 `body` 并可见。

**失败诊断**

| 现象 | 优先检查 |
| --- | --- |
| 标签页显示 `minimal.html` | `title` 是否位于 `head`，文件是否保存 |
| 页面没有“阅读台灯” | `h1` 是否在 `body`，脚本前是否已有对应元素 |
| Console 报 `Cannot set properties of null` | 三个目标 `id` 是否拼写一致 |
| 手机视图仍像桌面缩略图 | viewport 是否准确，DevTools 是否真的切到移动视图 |

### 6.2 渐进案例：观察 classic、`defer`、`async` 与 module 顺序

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

### 8.1 错误案例一：UTF-8 文件被错误 HTTP 字符集覆盖

这个案例让服务器故意发送错误字符集，以便区分“文件保存错误”和“响应头错误”。

**文件位置**

```text
practice/html-head/encoding/index.html
practice/html-head/encoding/wrong-charset-server.py
```

**`encoding/index.html` 完整文件**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>编码诊断 · 邻里集市</title>
</head>
<body>
  <h1>邻里集市</h1>
  <p>二手阅读台灯，售价39元。</p>
</body>
</html>
```

确保该文件以 UTF-8 保存。

**`wrong-charset-server.py` 错误示例**

```python
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = Path("index.html").read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=windows-1252")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


HTTPServer(("localhost", 8002), Handler).serve_forever()
```

**打开或运行方式**

1. 进入 `practice/html-head/encoding/`。
2. 运行 `python3 wrong-charset-server.py`。
3. 打开 `http://localhost:8002/`。
4. 在 Network 选择文档，查看 Response Headers。

**预期错误**

中文可能显示为乱码。源文件中的 meta 明明写着 UTF-8，但响应头宣称 `windows-1252`，传输层声明造成冲突。

**失败证据**

- Network 的 `Content-Type` 明确显示错误字符集。
- 编辑器状态栏显示文件实际为 UTF-8。
- 页面源文件中存在 `<meta charset="utf-8">`。

**修复**

把服务器行改为：

```python
self.send_header("Content-Type", "text/html; charset=utf-8")
```

重启服务器并强制刷新。中文应恢复。不要删除 meta；HTML 与服务器应保持一致。

如果响应头已经是 UTF-8，页面仍显示“é‚»é‡Œ”一类文本，则检查文件内容是否已被错误转换后保存。声明只能决定如何解码现有字节，不能猜回已经丢失的原文。

### 8.2 错误案例二：`base` 让片段和资源整体偏移

**文件位置**

```text
practice/html-head/base-offset.html
```

**错误示例**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>base 偏移实验 · 邻里集市</title>
  <base href="https://static.example.test/catalog/">
</head>
<body>
  <h1>阅读台灯</h1>
  <p><a id="pickup-link" href="#pickup">跳到交接说明</a></p>
  <p><a id="help-link" href="help.html">查看帮助</a></p>
  <img src="images/lamp.svg" alt="阅读台灯示意图">

  <section id="pickup">
    <h2>交接说明</h2>
    <p>在社区公共地点当面试用。</p>
  </section>

  <script>
    console.table({
      baseURI: document.baseURI,
      pickup: document.querySelector("#pickup-link").href,
      help: document.querySelector("#help-link").href,
      image: document.querySelector("img").src
    });
  </script>
</body>
</html>
```

**打开或运行方式**

1. 通过 `http://localhost:8000/base-offset.html` 打开。
2. 看 Console 表格。
3. 将鼠标停在两个链接上，观察状态栏绝对 URL。
4. 点击“跳到交接说明”。

**预期错误**

- `document.baseURI` 是 `https://static.example.test/catalog/`。
- `#pickup` 被解析为远程基准 URL 加片段，而不是当前 localhost 文档。
- 帮助链接和图片也都偏移到远程示例域名。
- 图片请求失败，点击片段可能离开当前页并得到 DNS 错误。

**修复方案一，推荐**

本页没有统一远程基准需求，删除 `base`。刷新后：

- `#pickup` 指向当前文档片段。
- `help.html` 相对于当前目录。
- 图片相对于当前目录。

**修复方案二，确实需要 `base` 时**

保留 `base`，但把应留在当前站点的地址写成经过部署确认的根相对或绝对 URL，例如：

```html
<a href="/base-offset.html#pickup">跳到交接说明</a>
```

这在 localhost 根路径下有效，但部署到子目录时又需调整。因此使用 `base` 前必须先确定部署 URL 契约，不能盲目复制这行。

**恢复记录**

| 字段 | 记录 |
| --- | --- |
| 现象 | 本页片段跳到外部域名，图片同时失效 |
| 证据 | `document.baseURI` 与元素 `.href`/`.src` 都指向远程 |
| 根因 | `base href` 改变了整份文档的相对 URL 基准 |
| 修复 | 删除无必要的 `base` |
| 复测 | 片段留在当前页面，图片和帮助链接回到 localhost |

### 8.3 错误案例三：preload 的资源类型与消费者不匹配

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

### 8.4 高频现象诊断表

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

### 8.5 通用排查顺序

面对文档头问题时，按以下顺序取证：

1. **确认地址**：地址栏是 `file:` 还是 `http:`，是否打开了正确文件。
2. **确认源字节与保存状态**：编辑器是否保存，编码是否 UTF-8。
3. **查看实际 DOM**：Elements 中元素是否被解析到预期位置。
4. **查看当前属性**：在 Console 读取 `document.title`、`document.baseURI` 和元素绝对 URL。
5. **查看请求**：Network 中检查状态、Initiator、Type、请求与响应头。
6. **查看执行错误**：Console 中检查语法、CORS、MIME、SRI 和 preload 警告。
7. **只改一个变量**：修改后清缓存或勾选 Disable cache，再刷新复测。
8. **记录保证与偶然**：一次 async 顺序不是规范保证，一次缓存命中也不是首次访问表现。

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

### 10.1 基础练习：为第二件商品写文档头

为“折叠椅，2500 分，2026-10-10T09:30:00Z 发布”创建：

```text
practice/html-head/chair.html
```

要求：

- 完整文档骨架与 `lang="zh-CN"`。
- UTF-8、标准 viewport。
- 可区分的 `title` 与可见 `h1`。
- 准确 description，不超过一到两句。
- robots 明确写为教学页不索引。
- 正文使用 `data value="2500"` 与 `time datetime`。
- Console 输出 `document.title`、`h1` 文本和 `document.baseURI`。

**打开方式**

通过 `http://localhost:8000/chair.html` 打开，并检查 Elements 与 Console。

**预期**

标签页能与台灯页区分，正文主标题只描述折叠椅，Console 三项均有值，中文无乱码。

**完成标准**

```html
<title>折叠椅，25元 · 邻里集市</title>
<meta
  name="description"
  content="邻里集市二手折叠椅，售价25元，可当面检查。">
<meta name="robots" content="noindex, nofollow">
```

允许文案略有不同，但必须准确、非堆词，并与正文一致。`title` 与 `h1` 不得互相替代。

### 10.2 提升练习：预测并验证脚本偏序

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

### 10.3 故障练习：三次注入、三次恢复

依次制造以下故障，每次只改一项：

1. 让编码服务器发送错误字符集。
2. 给当前页加入远程 `base`，观察片段与图片。
3. 把图片 preload 的 `as` 改为 `script`。

每次填写：

| 项目 | 必填内容 |
| --- | --- |
| 文件位置 | 出错文件的相对路径 |
| 打开方式 | URL 与启动命令 |
| 预期故障 | 修改前先写预测 |
| 失败证据 | Headers、绝对 URL、Network 或 Console |
| 根因 | 用机制解释，不写“浏览器有问题” |
| 最小修复 | 只修根因 |
| 复测结果 | 同一观察点恢复正常 |

**答案标准**

- 编码故障必须同时核对文件编码、meta 与 HTTP `Content-Type`。
- `base` 故障必须展示 `document.baseURI` 和至少一个元素的绝对 `.href` 或 `.src`。
- preload 故障必须区分“图片最终显示”和“预加载正确复用”。
- 修复后要清除 Network 记录并重新加载，不能只凭旧日志判断。

### 10.4 安全边界练习：把错误说法改正确

改写以下错误说法：

1. “加 `noindex` 后，别人就访问不了草稿。”
2. “加 canonical 后，旧地址会自动 301。”
3. “把 `X-Frame-Options` 写进 `http-equiv` 就能防嵌入。”
4. “meta CSP 和服务端 CSP 完全一样。”
5. “SRI 通过就说明第三方脚本绝对安全。”

**参考改写**

1. `noindex` 只是索引提示；草稿访问必须由服务器认证与授权控制。
2. canonical 只提示规范地址；真正重定向由服务器返回 3xx 和 `Location`。
3. `X-Frame-Options` 必须作为 HTTP 响应头发送；现代策略也可使用 HTTP CSP `frame-ancestors`。
4. meta CSP 生效更晚且缺少部分指令与报告能力，生产基线应由 HTTP 响应头提供。
5. SRI 只证明响应字节匹配指定哈希，不证明代码没有恶意逻辑或业务漏洞。

## 11. 阶段验收

### 11.1 商品页验收清单

- [ ] `meta charset="utf-8"` 靠近文档开头，文件也以 UTF-8 保存。
- [ ] viewport 未禁用用户缩放。
- [ ] 每个商品页有唯一且可区分的 `title`。
- [ ] 正文有准确可见的 `h1`，并能解释它与 `title` 的差异。
- [ ] description 与可见正文一致，不堆砌关键词。
- [ ] robots 被明确理解为爬虫提示，而不是访问控制。
- [ ] 没有无意加入 `base`；若使用，已审计所有相对 URL 与片段。
- [ ] stylesheet 真正应用 CSS，preload 只做提前获取。
- [ ] preload 的 URL、`as`、`type` 与真实消费者匹配。
- [ ] 需要 SRI 时，哈希、CORS 和实际字节一致。
- [ ] 业务脚本没有错误依赖 async 顺序。
- [ ] module 通过 HTTP 运行，依赖请求无 404 与 MIME 错误。
- [ ] `noscript` 的 head/body 内容都符合所在位置边界。
- [ ] 安全响应头在 Network Response Headers 中验证，而不是从 meta 名称猜测。

### 11.2 浏览器证据

提交或保留以下证据：

1. **Elements**：截图或记录一个完整 `head`，以及 `body > header > h1`。
2. **Console**：脚本执行日志，标记 defer 顺序、module 依赖顺序与 async 非保证项。
3. **Network**：CSS、JS、SVG 的状态、Type、Initiator 和响应 `Content-Type`。
4. **URL 解析**：`document.baseURI` 和一个链接 `.href`。
5. **编码诊断**：正确与错误 `Content-Type` 的对比。
6. **安全边界**：列出至少四个只能在 HTTP 或服务端完成的能力。

### 11.3 可执行自检

在完整商品页 Console 运行：

```js
const checks = {
  charset:
    document.characterSet.toLowerCase() === "utf-8",
  viewport:
    Boolean(document.querySelector('meta[name="viewport"]')),
  title:
    document.title.includes("阅读台灯"),
  heading:
    document.querySelector("h1")?.textContent.trim() === "阅读台灯",
  description:
    Boolean(document.querySelector('meta[name="description"]')?.content),
  canonical:
    document.querySelector('link[rel="canonical"]')?.href ===
      "https://market.example/listings/lamp-001",
  oneBaseAtMost:
    document.querySelectorAll("base").length <= 1
};

console.table(checks);
console.assert(
  Object.values(checks).every(Boolean),
  "文档头自检存在失败项"
);
```

预期所有值均为 `true`，Console 不出现断言失败。这个检查只覆盖结构事实，不证明 SEO 效果、跨浏览器兼容性或服务端安全。

### 11.4 通过标准

满足以下条件才算通过本课：

- 能独立写出完整商品页 `head`，不是从答案盲拷。
- 能用机制预测脚本顺序，并拒绝为 async 编造固定顺序。
- 能复现并修复乱码、`base` 偏移与 preload 类型错误。
- 能在 Network 区分请求头、响应头、资源类型和发起者。
- 能明确说出：“HTML 元信息可以描述和提示，但认证、授权、CORS、HSTS、Cookie、完整 CSP 等由服务器或 HTTP 响应负责。”

## 12. 常见问题

### 12.1 `head` 里的内容是不是都不可见？

不是绝对意义上的“不可见”。`title` 会显示在标签页，icon 会显示在浏览器界面，CSS 会改变正文外观，脚本会改变行为。但它们通常不作为 `body` 正文盒子直接排版。

### 12.2 一个页面可以有多个 `title` 吗？

应只有一个有效、明确的文档标题。重复 `title` 会制造解析和维护歧义。需要动态更新时修改 `document.title`，同时确保初始 HTML 仍有有意义的标题。

### 12.3 description 多长最好？

没有一个对所有搜索界面都固定的字符上限。写一到两句准确摘要，优先表达商品、状态、价格或交接方式；搜索系统可能截断或改用正文。

### 12.4 robots 写 `noindex` 后多久生效？

取决于爬虫何时再次抓取并处理页面。它不是即时删除按钮。已经公开的敏感信息应立即撤下并在服务器阻止访问，不能等待索引更新。

### 12.5 可以用 `base` 简化所有路径吗？

可以，但副作用是文档级的。组件被嵌入不同页面、片段导航、表单 action 和脚本资源都可能受影响。没有明确 URL 契约时，显式相对路径通常更容易审查。

### 12.6 preload 越多越快吗？

不是。preload 会占用带宽和连接优先级。预加载未尽快使用、类型错误或优先级不当，反而会挤压关键资源。只预加载已确认关键且很快被消费的资源，并用 Network 验证。

### 12.7 `prefetch` 和 `preload` 一样吗？

不一样。preload 面向当前导航中的高优先级资源；prefetch 通常提示未来导航可能使用的低优先级资源。两者都只是提示，不应混用。

### 12.8 为什么样式表会影响脚本执行？

脚本可能读取样式或布局，浏览器需要保持一致的执行模型。某些在脚本之前发现且正在加载的阻塞样式表会延后解析器阻塞脚本的执行。不要把“脚本标签在前后”当成唯一时间因素。

### 12.9 module 和 classic 能共享全局变量吗？

classic 顶层 `var` 和显式写入 `window` 的值可成为全局属性；module 有独立模块作用域，顶层声明不会自动挂到 `window`。需要共享时应显式导入导出，或明确使用公共接口。

### 12.10 为什么 async 不等待 `DOMContentLoaded`？

async 的目标是资源准备好后尽快执行，而不是加入文档顺序队列。它可能早于或晚于 `DOMContentLoaded`，取决于网络和解析时机，因此不能用该事件推断所有 async 已完成。

### 12.11 `noscript` 能处理浏览器不支持某个新 API 吗？

不能准确处理。JavaScript 仍然启用时，`noscript` 不会显示。应在脚本中做特性检测，并提供可用的 HTML 回退。

### 12.12 能否在 meta 中设置任意 HTTP 头？

不能。只有规范定义并被浏览器支持的少数 `http-equiv` 值有作用。写一个看似响应头的名字不会把它变成真正 HTTP 头。

### 12.13 meta refresh 能否代替 301？

不能。它是文档解析后的刷新或导航，不携带真正 HTTP 重定向语义，还可能影响历史记录和无障碍体验。永久地址迁移应由服务器返回正确 3xx 状态。

### 12.14 canonical、robots 和 CSP 都是“安全标签”吗？

不是。canonical 与 robots 主要服务于搜索发现；CSP 是浏览器安全策略，但生产完整能力应由 HTTP 响应头提供。三者不能替代登录、权限和服务端数据保护。

### 12.15 本课为什么用 `example` 或 `.test` 域名？

它们用于文档示例，避免误指向真实业务。发布真实页面时必须改成你控制并验证过的 HTTPS 地址。

## 13. 扩展阅读

以下资料均在 **2026-10-10** 核对。WHATWG HTML Living Standard 是规范来源；MDN 适合查阅解释、示例与兼容信息。浏览器兼容性会继续变化，涉及新属性或旧 WebView 时应再次查证并实测。

### 13.1 HTML 规范

- [WHATWG：文档元数据](https://html.spec.whatwg.org/multipage/semantics.html#document-metadata)
- [WHATWG：`head`](https://html.spec.whatwg.org/multipage/semantics.html#the-head-element)
- [WHATWG：`title`](https://html.spec.whatwg.org/multipage/semantics.html#the-title-element)
- [WHATWG：`base`](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element)
- [WHATWG：`link`](https://html.spec.whatwg.org/multipage/semantics.html#the-link-element)
- [WHATWG：`meta`](https://html.spec.whatwg.org/multipage/semantics.html#the-meta-element)
- [WHATWG：`style`](https://html.spec.whatwg.org/multipage/semantics.html#the-style-element)
- [WHATWG：`script`](https://html.spec.whatwg.org/multipage/scripting.html#the-script-element)
- [WHATWG：`noscript`](https://html.spec.whatwg.org/multipage/scripting.html#the-noscript-element)
- [WHATWG：CORS 设置属性](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attributes)

### 13.2 资源加载与脚本

- [MDN：`<link>`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/link)
- [MDN：资源预加载 `rel=preload`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Attributes/rel/preload)
- [MDN：`<script>`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/script)
- [MDN：JavaScript modules](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules)
- [MDN：Subresource Integrity](https://developer.mozilla.org/zh-CN/docs/Web/Security/Subresource_Integrity)
- [W3C：Subresource Integrity](https://www.w3.org/TR/SRI/)

### 13.3 元信息、HTTP 与安全边界

- [MDN：`<meta>`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Reference/Elements/meta)
- [MDN：Viewport meta](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Viewport_meta_tag)
- [MDN：HTTP headers](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Headers)
- [MDN：Content Security Policy](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/CSP)
- [RFC 9110：HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [Google Search Central：robots meta tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Google Search Central：canonical URL](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)

阅读官方资料时，优先回答三个问题：

1. 这是规范要求、浏览器提示，还是搜索引擎约定？
2. 它在 HTML 解析前、解析时，还是解析后生效？
3. 它能否被不可信客户端绕过，真正的服务端边界在哪里？

## 我现在能做到什么

完成本课后，我已经能：

- 为零基础商品页写出完整、可解释的 `head`。
- 区分元信息容器与可见页头，区分文档标题与正文主标题。
- 用 UTF-8、viewport、description 和 robots 表达正确意图，并说清边界。
- 预测 `base` 对全部相对 URL 和片段的副作用。
- 为样式、图标、预加载和规范地址选择正确的 `link` 关系。
- 检查 `media`、`as`、`type`、`integrity` 和 `crossorigin` 是否与消费者匹配。
- 根据依赖选择 classic、defer、async 或 module，而不是靠标签位置猜顺序。
- 正确使用 `noscript` 的 head/body 边界。
- 用 Elements、Network、Console 和响应头证据诊断乱码与资源问题。
- 明确拒绝“用安全元信息冒充服务端安全头”的错误方案。

## 单元导航

- [上一课：解析、文档骨架与 DOM](01-parser-document-model.md)
- [章入口：文档、语法与文本](../01-document-text.md)
- [下一课：文本语义与国际化](03-text-semantics-i18n.md)
- [模块入口：HTML 教材](../README.md)
