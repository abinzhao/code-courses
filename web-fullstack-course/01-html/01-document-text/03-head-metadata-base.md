# 文档头与元信息：定义页面身份、编码与基准 URL

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 用 title、字符编码、视口、描述、robots 和 base 建立可解释的文档身份与 URL 基准。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `DOC-011`、`DOC-012`、`DOC-013`、`DOC-014`、`DOC-019` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

用 title、字符编码、视口、描述、robots 和 base 建立可解释的文档身份与 URL 基准。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 DOC-011（`title` 与正文标题职责）、DOC-012（`meta charset` 与文件编码）、DOC-013（viewport、description、robots 元信息）、DOC-014（`base` 与文档级 URL 副作用）、DOC-019（`http-equiv` 与真实 HTTP 响应头区别）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

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

### 4.7 HTTP 响应头与 `meta http-equiv` 的分工

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

### 5.1 可用于观察的 DOM 属性

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

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [资源与脚本加载：理解 link、style、script 与 noscript](04-resources-scripts-loading.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 DOC-011（`title` 与正文标题职责） 对应的元素、属性或状态；
- 在项目中实现并标出与 DOC-012（`meta charset` 与文件编码） 对应的元素、属性或状态；
- 在项目中实现并标出与 DOC-013（viewport、description、robots 元信息） 对应的元素、属性或状态；
- 在项目中实现并标出与 DOC-014（`base` 与文档级 URL 副作用） 对应的元素、属性或状态；
- 在项目中实现并标出与 DOC-019（`http-equiv` 与真实 HTTP 响应头区别） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`04-resources-scripts-loading.md`](04-resources-scripts-loading.md)。

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

### 8.3 通用排查顺序

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

1. DOC-011（`title` 与正文标题职责）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

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

### 10.2 故障练习：三次注入、三次恢复

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

### 10.3 安全边界练习：把错误说法改正确

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

### 12.6 能否在 meta 中设置任意 HTTP 头？

不能。只有规范定义并被浏览器支持的少数 `http-equiv` 值有作用。写一个看似响应头的名字不会把它变成真正 HTTP 头。

### 12.7 meta refresh 能否代替 301？

不能。它是文档解析后的刷新或导航，不携带真正 HTTP 重定向语义，还可能影响历史记录和无障碍体验。永久地址迁移应由服务器返回正确 3xx 状态。

### 12.8 canonical、robots 和 CSP 都是“安全标签”吗？

不是。canonical 与 robots 主要服务于搜索发现；CSP 是浏览器安全策略，但生产完整能力应由 HTTP 响应头提供。三者不能替代登录、权限和服务端数据保护。

### 12.9 本课为什么用 `example` 或 `.test` 域名？

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

### 13.2 元信息、HTTP 与安全边界

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

- 能解释并验证：用 title、字符编码、视口、描述、robots 和 base 建立可解释的文档身份与 URL 基准。
- `DOC-011`：`title` 与正文标题职责
- `DOC-012`：`meta charset` 与文件编码
- `DOC-013`：viewport、description、robots 元信息
- `DOC-014`：`base` 与文档级 URL 副作用
- `DOC-019`：`http-equiv` 与真实 HTTP 响应头区别
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：HTML 语法与内容模型：写出可预测的合法结构](02-html-syntax-content-models.md) · [下一课：资源与脚本加载：理解 link、style、script 与 noscript](04-resources-scripts-loading.md) · [返回 HTML 模块](../README.md)
