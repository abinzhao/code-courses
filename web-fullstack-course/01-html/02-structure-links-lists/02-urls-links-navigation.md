# 02 URL、链接与导航：让每一次跳转都有明确目的地

## 任务卡

邻里集市的台灯详情已经能被读懂，但访问者还不能可靠地查看帮助、返回商品、联系维护者或下载说明。你要把单页扩展为 `index.html` 与 `help.html` 两个页面，并且能在点击前预测每个链接最终到达哪里。

| 关卡 | 你要完成的结果 | 可观察证据 |
| --- | --- | --- |
| 拆解地址 | 说清 URL 的六个主要组成部分 | URL 标注与解析表 |
| 预测目标 | 区分相对、根相对和绝对 URL | 地址栏中的最终 URL |
| 建立导航 | 商品页、帮助页和页内分节可以往返 | 地址片段、浏览器历史、目标元素 |
| 选择控件 | “去哪里”使用链接，“做什么”使用按钮 | Tab 顺序与原生键盘行为 |
| 控制边界 | 新标签、引用来源和下载意图符合需求 | `window.opener`、Network、实际下载行为 |
| 修复风险 | 拒绝不可信的 `javascript:`、`data:` 地址 | 修复前后代码与协议检查结果 |

建议分三次学习：

1. 第一次只完成 URL 拆解和目标预测，不急着复制综合案例。
2. 第二次创建双页案例，用鼠标、键盘、后退和前进逐项验证。
3. 第三次主动制造破碎片段、`file:` 根相对路径和不安全 URL，再留下诊断记录。

本课只实现浏览器原生导航。它不会实现登录、收藏、预约、支付或服务端下载权限。

## 1. 任务背景

链接看起来只是“一段可点击的文字”，实际同时涉及三个问题：

1. 浏览器以哪个地址为起点解析 `href`？
2. 解析后的目标是当前文档、另一个文档，还是另一个应用协议？
3. 激活链接后，当前页、新标签、引用来源和下载行为会发生什么？

如果没有先回答这些问题，常见故障会很难解释：

- 本机双击能打开，部署后却出现 404；
- 地址栏已经有 `#rules`，页面却没有定位到规则；
- `/help.html` 在开发服务器中有效，直接打开文件时却指向磁盘根目录；
- 写了 `download`，跨站 PDF 仍然在当前标签中打开；
- 所有外链都被强制新开标签，访问者不断失去当前位置；
- 把卖家输入直接放进 `href`，使 `javascript:` 或 `data:` 成为可激活地址。

本课的目标不是背诵属性，而是建立一条可以重复使用的判断链：

```text
读取 href
  → 找到文档基准 URL
  → 解析为最终 URL
  → 判断导航目标和来源边界
  → 执行链接的默认行为
  → 用地址栏、DOM、历史、Network 或下载记录验证
```

## 2. 学习目标

完成本课后，你应能独立做到：

- 从一个 URL 中识别 `scheme`、`host`、`port`、`path`、`query` 和 `fragment`。
- 解释文档 URL、文档基准 URL 与 `document.baseURI` 的关系。
- 根据当前地址预测相对 URL、根相对 URL和绝对 URL的最终目标。
- 区分同页片段与跨页片段，并用唯一 `id` 修复破碎目标。
- 正确使用 `mailto:` 和 `tel:`，同时说明外部应用与设备支持边界。
- 说明 `a` 元素的 `href`、`target`、`rel`、`download`、`hreflang`、`type`、`referrerpolicy` 和 `ping`。
- 按“导航到资源”与“执行页面操作”区分链接和按钮。
- 为确有必要的新标签链接设置清楚的提示与 `noopener` 防护。
- 解释 `noreferrer` 与 `noopener` 的不同影响。
- 说明为什么跨源资源不能仅靠 `download` 强制保存。
- 只在链接边界内判断同源与跨源，不把它误解为“跨源链接一律不能访问”。
- 对不可信地址执行协议白名单检查，拒绝 `javascript:`、`data:` 等不需要的方案。
- 用浏览器历史、键盘、Elements、Console 和 Network 留下可复验的导航证据。

## 3. 预备知识

开始前，你需要：

- 会创建文件夹和 UTF-8 文本文件；
- 会用浏览器打开本地 HTML；
- 知道 HTML 文档包含 `doctype`、`html`、`head` 和 `body`；
- 会在开发者工具的 Elements 中搜索元素；
- 最好已经完成[上一课：地标、标题与页面大纲](01-landmarks-headings-outline.md)。

本课使用的个人练习目录是：

```text
practice/
└── html-02-links/
    ├── index.html
    └── help.html
```

这只是学习者在自己电脑上创建的练习路径，不是教材仓库需要新增的源码目录。

你可以用两种方式打开练习：

| 方式 | 地址示例 | 适合观察 | 重要边界 |
| --- | --- | --- | --- |
| 直接打开文件 | `file:///Users/you/practice/html-02-links/index.html` | 同目录相对链接、片段、`file:` 陷阱 | `file:` 的来源和权限行为因浏览器而异 |
| 本地静态服务器 | `http://127.0.0.1:8000/index.html` | 根相对 URL、同源/跨源、Network、下载边界 | 需要终端和 Python 3 |

推荐把本地服务器作为主验证方式。进入练习目录后运行：

```bash
python3 -m http.server 8000
```

然后访问 `http://127.0.0.1:8000/index.html`。停止服务器时回到终端按 <kbd>Control</kbd> + <kbd>C</kbd>。如果系统没有 Python 3，仍可直接打开文件完成大部分练习，但同源、跨源和请求头证据要等到有静态服务器时再验证。

本课会在 Console 中使用一行 `new URL(...)` 帮助观察解析结果。现在不要求掌握 JavaScript；只要把它当成“输入一个地址引用，输出浏览器解析后的完整地址”的观察工具。

## 4. 核心理论

### 4.1 URL 是资源地址，不只是文件名

URL 是 Uniform Resource Locator，中文常译为“统一资源定位符”。浏览器通过 URL 判断使用什么方案、联系哪个主机、请求什么路径，以及加载后定位到文档的哪个部分。

观察这个教学地址：

```text
https://market.example:8443/listings/index.html?category=lamp&page=2#shipping
```

| 组成 | 示例值 | 作用 |
| --- | --- | --- |
| scheme（方案） | `https` | 决定如何处理地址，例如 HTTPS、邮件或电话 |
| host（主机） | `market.example` | 标识目标主机；示例域名不代表真实站点 |
| port（端口） | `8443` | 标识主机上的网络服务；省略时通常使用方案默认端口 |
| path（路径） | `/listings/index.html` | 标识目标服务中的资源路径 |
| query（查询） | `category=lamp&page=2` | 向目标资源表达筛选、分页等参数 |
| fragment（片段） | `shipping` | 文档加载后在客户端定位目标部分 |

分隔符帮助浏览器识别边界：

```text
scheme://host:port/path?query#fragment
```

需要注意：

- `https:` 中的冒号属于 URL 语法，不是主机名的一部分。
- 主机名与路径之间的 `/` 不能随意省略。
- `?` 引出查询，`#` 引出片段；查询和片段不属于路径。
- HTTPS 默认端口是 `443`，HTTP 默认端口是 `80`。显式写默认端口和省略它通常表示同一来源。
- URL 中没有显式端口，不等于浏览器“不使用端口”。
- 查询参数的顺序和重复键可能对服务端有意义，不能擅自当成普通对象去重。
- 片段不会作为普通 HTTP 请求目标发送给服务器，但会出现在地址栏、浏览器历史中，也能被当前页面脚本读取，因此不能存放秘密。

### 4.2 来源只由方案、主机和端口决定

在本课的链接边界中，“来源”（origin）可以先理解为三元组：

```text
scheme + host + port
```

以下地址与 `https://market.example/listings/index.html` 的关系是：

| 目标 URL | 是否同源 | 原因 |
| --- | --- | --- |
| `https://market.example/help.html` | 是 | 方案、主机、默认端口都相同 |
| `https://market.example/listings/2?tab=info` | 是 | 路径和查询不参与来源判断 |
| `http://market.example/help.html` | 否 | 方案不同 |
| `https://docs.market.example/help.html` | 否 | 主机不同，子域名也是不同主机 |
| `https://market.example:8443/help.html` | 否 | 端口不同 |

链接通常可以导航到跨源页面。跨源不等于“禁止访问”，同源也不等于“内容可信”。本课只讨论与链接直接相关的边界：

- 新标签页是否可以通过 `window.opener` 联系原页面；
- 导航时是否发送引用来源信息；
- `download` 是否会被浏览器按下载意图处理。

脚本读取跨源页面、CORS、Cookie 和请求权限属于浏览器与网络课程，本课不提前展开。对于 `file:` URL，现代浏览器常采用不透明或实现相关的来源规则，不要用本地文件之间“看起来在同一文件夹”来证明它们同源。

### 4.3 文档基准 URL 决定相对地址从哪里开始

浏览器解析相对 URL 时需要一个起点，这个起点叫文档基准 URL（document base URL）。

默认情况下，文档基准 URL就是当前文档 URL。例如：

```text
当前文档：
https://market.example/shop/items/index.html

href="help.html"：
https://market.example/shop/items/help.html
```

在 Console 输入下面两行可以观察：

```js
document.baseURI
new URL("help.html", document.baseURI).href
```

第一行输出当前文档使用的基准 URL，第二行输出 `help.html` 的最终绝对 URL。

`head` 中的第一个有效 `<base href>` 可以改变整个文档的基准 URL：

```html
<head>
  <base href="https://cdn.example/market/">
  <title>链接观察</title>
</head>
```

此时：

```html
<a href="help.html">帮助</a>
```

会解析为：

```text
https://cdn.example/market/help.html
```

`base` 的影响是文档级的，不只影响某一个链接。图片、样式表、脚本、表单地址和片段引用等相对 URL 都可能受到影响。还要注意：

- 文档只能可靠地使用第一个带 `href` 的 `base`。
- `base` 应放在所有依赖相对 URL 的元素之前。
- `<base target="_blank">` 还能改变未显式写 `target` 的链接或表单默认目标，容易制造意外新标签。
- 如果 `base href` 指向另一份文档，`href="#contact"` 也可能解析到那份文档的 `#contact`，不再是当前页片段。
- `document.baseURI` 是排查基准地址的直接证据，不要只根据目录结构猜测。

初学项目通常不需要 `base`。只有部署模型明确需要统一基准地址时才使用，并对所有相对引用做回归检查。

### 4.4 相对、根相对和绝对 URL 的解析

假设当前文档 URL 是：

```text
https://market.example:8443/shop/items/index.html?view=full#summary
```

常见写法分为三类：

**相对 URL**

```html
<a href="help.html">同目录帮助</a>
<a href="./help.html">同目录帮助</a>
<a href="../help.html">上一级帮助</a>
```

它们依赖文档基准 URL。浏览器会把基准 URL 的文件部分、目录层级、查询和片段按 URL 解析规则合并或替换。

**根相对 URL**

```html
<a href="/help.html">站点根目录下的帮助</a>
```

它从当前 URL 来源的根路径开始，不是从当前 HTML 文件夹开始，也不是“自动找到项目根目录”。

**绝对 URL**

```html
<a href="https://docs.example/guides/links.html">外部链接指南</a>
```

它已经包含方案和主机，不依赖当前页面目录。绝对 URL 更明确，但站内页面若全部硬编码生产域名，会降低本地预览和环境迁移能力。

浏览器按 URL 规则处理 `.` 和 `..`，不是简单做字符串拼接。路径末尾是否有 `/` 也很重要：

```text
基准 https://market.example/shop/items/ + help.html
结果 https://market.example/shop/items/help.html

基准 https://market.example/shop/items + help.html
结果 https://market.example/shop/help.html
```

第二个基准末尾没有 `/`，`items` 会被当成路径中的最后一个文件段并被替换。

### 4.5 查询与片段会替换什么

相对引用不一定包含文件名：

```html
<a href="?view=compact">紧凑视图</a>
<a href="#contact">联系说明</a>
```

对于当前地址：

```text
https://market.example/shop/index.html?view=full#summary
```

结果是：

| 引用 | 解析结果 | 关键变化 |
| --- | --- | --- |
| `?view=compact` | `https://market.example/shop/index.html?view=compact` | 保留路径，替换查询，旧片段消失 |
| `#contact` | `https://market.example/shop/index.html?view=full#contact` | 保留路径和查询，替换片段 |
| `help.html#contact` | `https://market.example/shop/help.html#contact` | 替换最后路径段并设置片段 |

查询参数中不能直接依赖空格、`&`、`#` 等字符保持原意。应用代码应使用 `URL` 和 `URLSearchParams` 等结构化 API 编码。HTML 属性中用于分隔查询参数的 `&` 推荐写为 `&amp;`：

```html
<a href="search.html?q=lamp&amp;page=2">查看第 2 页台灯</a>
```

浏览器解析属性后，实际 URL 中仍是 `&`。字符引用不是查询参数的加密。

### 4.6 同页片段与跨页片段

同页片段链接只写 `#` 加目标 `id`：

```html
<a href="#shipping">跳到交接说明</a>

<section id="shipping">
  <h2>交接说明</h2>
</section>
```

激活后通常发生：

1. 地址栏片段变为 `#shipping`；
2. 浏览器在当前文档中寻找匹配目标；
3. 找到后将目标滚动到可见区域；
4. 这次同文档导航通常进入浏览器历史。

跨页片段同时包含目标文档和目标 `id`：

```html
<a href="help.html#broken-links">查看破碎链接排查</a>
```

浏览器先加载 `help.html`，再在目标文档中寻找 `id="broken-links"`。普通 HTTP 请求中不会把 `#broken-links` 发送给服务器，因此服务端不能靠 URL 片段选择返回哪一段 HTML。

片段目标要满足：

- `id` 在文档中存在；
- `id` 值与片段准确对应，包括大小写；
- `id` 在当前文档中唯一；
- 目标没有被错误地写到另一份文件；
- 没有被 `base` 改成意料之外的文档。

页面没有明显滚动，不一定代表失败。目标可能已经在视口中。更可靠的证据是：

```js
location.hash
document.querySelector(":target")
document.getElementById(location.hash.slice(1))
```

如果目标存在，后两行应得到目标元素；破碎片段通常得到 `null`。片段导航对焦点的处理在浏览器和目标元素之间可能有差异，本课只验收可到达与可定位，不把滚动等同于完整的焦点管理。

### 4.7 `mailto:` 与 `tel:` 交给外部处理程序

并非所有 `href` 都是 HTTP 页面。

邮件链接：

```html
<a href="mailto:help@example.invalid">给教材维护者发邮件</a>
```

带主题和正文的教学示例：

```html
<a href="mailto:help@example.invalid?subject=%E9%93%BE%E6%8E%A5%E9%97%AE%E9%A2%98&amp;body=%E8%AF%B7%E6%8F%8F%E8%BF%B0%E5%A4%B1%E8%B4%A5%E7%9A%84%20URL">
  报告链接问题
</a>
```

电话链接：

```html
<a href="tel:+15550100000">拨打教学示例号码 +1 555-010-0000</a>
```

这些链接的边界是：

- 浏览器通常把它们交给已注册的邮件或电话应用；
- 桌面设备可能弹出应用选择器，也可能没有可用处理程序；
- 激活链接不代表邮件已发送或电话已接通；
- 预填主题和正文需要 URL 编码；
- 不要把密码、访问令牌、身份证号等秘密放进 URL；
- 页面上的邮箱可能被自动采集，真实站点需要评估公开联系信息的垃圾邮件风险；
- 固定的可信业务地址可以直接编写；来自用户的地址仍需按业务规则验证。

`.invalid` 是专门用于无效示例的顶级域名，不会成为真实邮件目的地。示例电话号码也只用于观察协议处理，不应实际拨打。

### 4.8 `a` 元素和 `href` 决定链接身份

最小超链接是：

```html
<a href="help.html">查看使用帮助</a>
```

`href` 给出目标 URL 引用。带有效 `href` 的 `a` 具有浏览器原生链接行为：

- 进入键盘 Tab 顺序；
- 按 Enter 激活；
- 可以复制链接地址；
- 可以通过上下文菜单或修饰键在新标签打开；
- 浏览器可以记录访问历史；
- 辅助技术能把它识别为链接。

没有 `href` 的 `a` 只是占位元素，不是可正常导航的链接：

```html
<!-- 错误示例：看起来可能被 CSS 画成链接，但没有链接行为 -->
<a class="link-look">查看帮助</a>
```

`href="#"` 也不是“什么都不做”：

```html
<!-- 错误示例：它会修改片段并可能滚动到页面顶部 -->
<a href="#">收藏</a>
```

如果目标是打开另一页、另一个分节、文件、邮件应用或电话应用，就使用链接。如果目标是收藏、展开、提交、复制或删除当前页面中的数据，就使用 `button`。

链接文字应描述目标：

```html
<a href="help.html#returns">阅读退还规则</a>
```

不要在一组链接中反复写“点这里”。读者只浏览链接文字时，应能判断每个链接的目的。

### 4.9 `target` 决定在哪个浏览上下文打开

常见 `target` 值：

| 值 | 行为 | 使用边界 |
| --- | --- | --- |
| `_self` | 当前浏览上下文，默认值 | 普通站内导航优先 |
| `_blank` | 新的浏览上下文，通常是新标签 | 仅在确有保留当前页需求时使用 |
| `_parent` | 当前框架的父上下文 | 主要用于嵌入场景 |
| `_top` | 最顶层上下文 | 主要用于嵌入场景 |
| 自定义名称 | 打开或复用同名上下文 | 容易造成复用和状态混淆，需明确设计 |

`target="_new"` 没有特殊含义，它只是名字为 `_new` 的上下文，后续链接可能复用它。不要把它误当成 `_blank`。

默认在当前页打开通常最尊重用户预期，因为用户自己仍可以通过浏览器手势决定新标签。若产品确实要求新标签：

```html
<a href="help.html"
   target="_blank"
   rel="noopener">
  在新标签打开帮助（新标签页）
</a>
```

可见文字明确提示“新标签页”，避免键盘用户或放大阅读者突然失去上下文。

### 4.10 `rel`、`noopener` 与 `noreferrer`

`rel` 描述当前文档和目标资源的关系。它可以包含以空格分隔的多个词：

```html
<a href="https://docs.example/"
   target="_blank"
   rel="external noopener">
  外部文档（新标签页）
</a>
```

与本课最相关的值：

| `rel` 值 | 作用 | 不会自动做到的事 |
| --- | --- | --- |
| `noopener` | 阻止新上下文通过 `window.opener` 取得原页面引用 | 不会隐藏 HTTP 引用来源 |
| `noreferrer` | 不发送引用来源，并同时提供 `noopener` 效果 | 不会让访问者匿名，也不会清除目标 URL 中的数据 |
| `external` | 表明目标位于当前站点之外 | 不会自动新开标签 |
| `nofollow` | 向搜索系统表达“不为此链接背书”的提示 | 不是访问控制或安全沙箱 |
| `ugc` | 表明链接来自用户生成内容 | 不会自动检查 URL 安全 |
| `sponsored` | 表明赞助或广告关系 | 不会自动满足全部广告合规要求 |

为什么关注 `window.opener`？旧式或特殊浏览器环境中，新页面可能通过它把原页面导航到仿冒地址，这类问题常被称为反向标签劫持。现代浏览器通常已让 `_blank` 隐式具有 `noopener` 行为，但显式写出 `rel="noopener"` 可以表达安全意图，并覆盖需要兼容或审查的边界。

两者不要混为一谈：

```html
<!-- 保留正常引用来源，但切断 opener -->
<a href="help.html" target="_blank" rel="noopener">帮助</a>

<!-- 同时切断 opener，并不发送 Referer -->
<a href="help.html" target="_blank" rel="noopener noreferrer">隐私模式帮助</a>
```

只有存在隐私需求时才使用 `noreferrer`。引用来源对站点分析、故障定位和来源判断可能有合法价值，不要机械地给全部链接添加它。

### 4.11 `referrerpolicy` 控制链接请求携带多少来源

`referrerpolicy` 比“发或不发”更细致。常见值包括：

| 值 | 导航时的来源行为概念 | 适用说明 |
| --- | --- | --- |
| `no-referrer` | 不发送 `Referer` | 明确不需要来源信息 |
| `origin` | 只发送来源，不发送完整路径 | 目标只需知道来自哪个站点 |
| `same-origin` | 仅同源导航发送来源 | 不向跨源目标发送 |
| `strict-origin` | 安全级别不降低时发送来源 | 避免 HTTPS 到 HTTP 泄露来源 |
| `strict-origin-when-cross-origin` | 同源可发较完整信息，跨源只发来源，降级不发 | 现代浏览器常见默认策略 |

示例：

```html
<a href="https://docs.example/"
   referrerpolicy="origin">
  查看外部文档
</a>
```

HTTP 请求头历史上拼写为 `Referer`，不是正确英文 `Referrer`，这是协议保留的旧拼写。属性名使用正确拼写 `referrerpolicy`。

`referrerpolicy` 不会切断 `window.opener`；需要新标签防护时仍应使用 `noopener`。它也不能保护已经写进目标 URL 查询参数中的秘密。

### 4.12 `download`、`hreflang` 与 `type` 都是提示

同源下载示例：

```html
<a href="help.html"
   download="neighbor-market-help.html"
   hreflang="zh-CN"
   type="text/html">
  下载中文帮助页副本
</a>
```

三个属性分别表达：

- `download`：作者希望浏览器把目标当作下载，并可建议文件名；
- `hreflang`：目标资源的语言提示；
- `type`：目标资源 MIME 类型的提示。

它们不是强制命令：

- 浏览器会清理建议文件名中的非法路径字符；
- 用户设置、浏览器策略和响应头会影响最终是保存还是打开；
- `Content-Disposition` 响应头可能决定下载及服务端文件名；
- `download` 通常只对同源 URL，以及浏览器支持的 `blob:`、`data:` URL 生效；
- 跨源资源不能仅靠页面上的 `download` 强制保存，跨源服务器通常需要用合适的响应头明确附件行为；
- `hreflang` 不会翻译页面，也不会替代可见的语言说明；
- `type` 不会验证服务器实际返回的类型，真实响应头仍是证据。

因此，“写了 `download`”只能证明作者表达了下载意图，不能证明文件已经保存、文件名一定相同或用户有权限获得资源。

### 4.13 `ping` 涉及额外请求与隐私

`ping` 可以列出一个或多个通知 URL。用户激活链接时，浏览器可能向这些地址发送审计通知：

```html
<!-- 机制示例，本教材案例不实际使用 ping -->
<a href="help.html"
   ping="https://metrics.example/link-activated">
  查看帮助
</a>
```

边界必须说清：

- 它会在主要导航之外产生额外网络请求；
- 请求可能被浏览器设置、隐私工具、扩展或策略阻止；
- 它会带来跟踪、告知和合规问题；
- 不能把它当成关键业务操作成功的证据；
- 不应把不可信输入直接写进 `ping`，否则可能向意外地址发送请求；
- 本课综合案例不使用 `ping`，只要求能在代码审查中识别它。

需要统计导航时，应先明确最小数据、用户告知、失败容忍与服务端边界，而不是因为有这个属性就默认启用。

### 4.14 链接与按钮的判断方法

先补全一句话：

```text
“激活后，我要 ______。”
```

如果答案是“去往某个可命名地址”，通常使用链接：

- 去商品详情；
- 去帮助页；
- 去当前页的交接说明；
- 去下载资源；
- 去邮件或电话处理程序。

如果答案是“改变当前应用状态或执行动作”，通常使用按钮：

- 收藏商品；
- 展开筛选；
- 提交表单；
- 删除图片；
- 复制商品编号。

| 需求 | 正确元素 | 原因 |
| --- | --- | --- |
| 查看帮助页 | `<a href="help.html">` | 有可导航 URL |
| 跳到当前页规则 | `<a href="#rules">` | 有片段目标 |
| 收藏商品 | `<button type="button">` | 改变应用状态 |
| 提交预约 | `<button type="submit">` | 触发表单提交 |
| 下载公开说明 | `<a href="rules.pdf" download>` | 导航到资源并表达下载意图 |

不要把按钮放进链接，也不要把链接放进按钮。嵌套交互元素会产生冲突的焦点、点击和辅助技术信息。

键盘默认行为也是证据：

- 链接通常用 Tab 聚焦、Enter 激活；
- 按钮通常用 Tab 聚焦、Enter 或 Space 激活；
- Space 在普通链接上通常滚动页面，不等同于按钮激活。

不要通过脚本强行让错误元素模仿另一类控件，再声称语义相同。

### 4.15 不可信的 `javascript:` 与 `data:` URL

`href` 是安全边界的一部分。下面的代码即使使用 DOM 属性赋值，也不代表地址可信：

```js
// 错误示例：sellerUrl 来自不可信输入。
profileLink.href = sellerUrl;
```

攻击者可能提供：

```text
javascript:/* 在页面上下文执行不可信代码 */
data:text/html,<!-- 伪造或主动内容 -->
```

风险包括：

- `javascript:` 在允许执行的环境中可能以当前页面权限运行代码；
- `data:` 可以把内容直接编码进 URL，隐藏真实内容来源；
- 浏览器或 CSP 可能阻止部分行为，但不能把“可能被阻止”当成输入验证；
- `data:` 对作者自己生成的受控小资源有合法用途，不等于适合接收不可信导航地址；
- 字符大小写、转义和前导空白会让简单字符串判断不可靠。

正确思路是先用 URL 解析器标准化，再按业务需要做协议白名单：

```js
function toAllowedNavigationUrl(rawValue, baseUrl) {
  const candidate = new URL(rawValue, baseUrl);
  const allowedProtocols = new Set(["http:", "https:"]);

  if (!allowedProtocols.has(candidate.protocol)) {
    throw new Error("只允许 HTTP 或 HTTPS 链接");
  }

  return candidate.href;
}
```

使用时捕获失败，不要把原值“兜底”写回去：

```js
try {
  profileLink.href = toAllowedNavigationUrl(sellerUrl, document.baseURI);
  profileLink.hidden = false;
} catch (error) {
  profileLink.removeAttribute("href");
  profileLink.hidden = true;
  console.error(error.message);
}
```

这段代码只解决协议白名单，不自动解决域名信任、开放重定向、钓鱼文案、权限或内容审核。若业务只允许某个站点，还要在解析后检查 `hostname` 和规范化端口。`mailto:`、`tel:` 应在确有业务需求时使用独立规则验证，不应为了“兼容更多”就加入通用导航白名单。

## 5. 元素、属性、API 或配置清单

| 名称 | 最小写法 | 作用 | 关键边界或验证方式 |
| --- | --- | --- | --- |
| `a[href]` | `<a href="help.html">帮助</a>` | 创建超链接 | 没有 `href` 就没有完整原生链接行为 |
| `href` | `href="../help.html#rules"` | 保存 URL 引用 | 最终目标由文档基准 URL 解析 |
| `target` | `target="_blank"` | 选择浏览上下文 | 新标签应提示用户并考虑 `noopener` |
| `rel` | `rel="noopener external"` | 描述关系与安全提示 | `external` 不会自动新开标签 |
| `download` | `download="help.html"` | 表达下载意图和建议文件名 | 跨源、响应头和浏览器策略会限制 |
| `hreflang` | `hreflang="zh-CN"` | 提示目标语言 | 不翻译目标，也不替代可见说明 |
| `type` | `type="text/html"` | 提示目标 MIME 类型 | 不验证真实响应类型 |
| `referrerpolicy` | `referrerpolicy="origin"` | 控制引用来源信息 | 不切断 `window.opener` |
| `ping` | `ping="https://metrics.example/p"` | 激活链接时发送审计通知 | 涉及隐私且可能被禁用，不能承担关键业务 |
| `id` | `id="broken-links"` | 提供片段目标 | 文档内应唯一，匹配时注意大小写 |
| `base[href]` | `<base href="https://example/">` | 改变整份文档的 URL 基准 | 影响所有相对引用，优先不用 |
| `document.baseURI` | `document.baseURI` | 读取实际文档基准 URL | 排查 `base` 和相对 URL |
| `new URL()` | `new URL("help.html", document.baseURI)` | 结构化解析 URL | 解析成功不等于业务允许 |
| `location.hash` | `location.hash` | 读取当前片段 | 包含开头的 `#` |
| `:target` | `document.querySelector(":target")` | 找到当前片段目标 | 破碎片段返回 `null` |
| `mailto:` | `href="mailto:a@example.invalid"` | 请求邮件处理程序 | 不保证已配置应用或发送成功 |
| `tel:` | `href="tel:+15550100000"` | 请求电话处理程序 | 桌面端可能无处理程序 |
| `button` | `<button type="button">收藏</button>` | 执行页面动作 | 不用于代替有 URL 的导航 |

### 属性组合速查

普通站内链接：

```html
<a href="help.html">查看帮助</a>
```

安全新标签：

```html
<a href="help.html" target="_blank" rel="noopener">
  在新标签打开帮助（新标签页）
</a>
```

不发送引用来源的新标签：

```html
<a href="help.html" target="_blank" rel="noopener noreferrer">
  隐私模式打开帮助（新标签页）
</a>
```

同源下载意图：

```html
<a href="help.html" download="neighbor-market-help.html">
  下载帮助页
</a>
```

固定的邮件入口：

```html
<a href="mailto:help@example.invalid">联系维护者</a>
```

## 6. 最小可运行案例

### 6.1 案例目标与文件位置

先用一个文件观察同页片段和历史，不引入跨页因素。

文件位置：

```text
practice/html-02-links/minimal.html
```

打开方式：

1. 把下面的完整代码保存为 `minimal.html`。
2. 双击文件，或在浏览器中选择“打开文件”。
3. 也可以在练习目录启动 `python3 -m http.server 8000`，访问 `http://127.0.0.1:8000/minimal.html`。

完整代码：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>片段导航最小观察</title>
  <style>
    section {
      min-height: 70vh;
    }

    :target {
      outline: 3px solid #b45309;
    }
  </style>
</head>
<body>
  <header>
    <h1>阅读台灯帮助</h1>
    <nav aria-label="页内目录">
      <a href="#overview">商品概览</a>
      <a href="#shipping">交接说明</a>
      <a href="#contact">联系维护者</a>
    </nav>
  </header>

  <main>
    <section id="overview">
      <h2>商品概览</h2>
      <p>这是一盏 39 元的二手阅读台灯。</p>
    </section>

    <section id="shipping">
      <h2>交接说明</h2>
      <p>双方在社区公共地点检查物品后交接。</p>
    </section>

    <section id="contact">
      <h2>联系维护者</h2>
      <p><a href="mailto:help@example.invalid">报告页面问题</a></p>
    </section>
  </main>
</body>
</html>
```

### 6.2 预期结果

- 页面顶部有三个可聚焦链接。
- 点击“交接说明”后，地址末尾出现 `#shipping`。
- `id="shipping"` 的分节进入可视区域，并因 `:target` 出现轮廓。
- 点击“联系维护者”后，片段变为 `#contact`。
- 按浏览器后退键，应回到前一个片段位置；前进键可再次进入。
- 按 Tab 能依次聚焦链接，按 Enter 能激活当前链接。

`:target` 样式只是观察辅助，不是链接成功的必要条件。

### 6.3 失败证据与恢复

| 现象 | 优先查看的证据 | 可能原因 | 恢复方法 |
| --- | --- | --- | --- |
| 地址没有片段 | 检查实际 `href` | 文件未保存或链接不是 `#...` | 保存文件并刷新 |
| 地址有片段但没有目标轮廓 | Console 执行 `document.querySelector(":target")` | `id` 不存在或不匹配 | 对齐 `href` 与 `id` |
| 没明显滚动 | 观察目标是否已经可见 | 页面高度不够或目标已在视口 | 以地址片段和 `:target` 为证据 |
| Tab 跳过文字 | Elements 检查是否真有 `href` | 写成了无 `href` 的 `a` | 添加真实目标 URL |
| 邮件链接无反应 | 观察是否弹出应用选择 | 没有配置邮件处理程序 | 记录环境边界，不伪造“发送成功” |

恢复到初始状态：删除地址栏 `#...` 后回车，或重新打开 `minimal.html`。直接打开文件时不需要停止进程；使用静态服务器时按 <kbd>Control</kbd> + <kbd>C</kbd> 停止。

### 6.4 URL 解析表

下面的表以这个基准地址为前提：

```text
https://market.example:8443/shop/items/index.html?view=full#summary
```

先遮住“最终 URL”列自行预测，再核对答案。

| `href` 或 URL 引用 | 最终 URL | 判断依据 |
| --- | --- | --- |
| `help.html` | `https://market.example:8443/shop/items/help.html` | 替换最后一个路径段 |
| `./help.html#contact` | `https://market.example:8443/shop/items/help.html#contact` | 当前目录加跨页片段 |
| `../help.html` | `https://market.example:8443/shop/help.html` | 先回到上一级目录 |
| `/help.html` | `https://market.example:8443/help.html` | 从当前来源根路径开始 |
| `?view=compact` | `https://market.example:8443/shop/items/index.html?view=compact` | 保留路径，替换查询并移除旧片段 |
| `#contact` | `https://market.example:8443/shop/items/index.html?view=full#contact` | 保留路径和查询，替换片段 |
| `help.html?from=listing#contact` | `https://market.example:8443/shop/items/help.html?from=listing#contact` | 同时设置新路径、查询和片段 |
| `../../index.html` | `https://market.example:8443/index.html` | 连续返回两级目录 |
| `https://docs.example/guide` | `https://docs.example/guide` | 已经是绝对 URL |
| `mailto:help@example.invalid` | `mailto:help@example.invalid` | 使用邮件方案，不与 HTTPS 基准合并 |
| `tel:+15550100000` | `tel:+15550100000` | 使用电话方案，不与 HTTPS 基准合并 |

可以在任意页面 Console 中用下面的形式逐项复验：

```js
new URL("../help.html", "https://market.example:8443/shop/items/index.html?view=full#summary").href
```

预期输出：

```text
https://market.example:8443/shop/help.html
```

如果输出与表格不同，先确认输入基准是否完全相同，尤其是端口、末尾文件名和斜杠。

## 7. 邻里集市集成案例

### 7.1 案例目录、打开方式与验证范围

本案例把商品页和帮助页连成一个可往返的小网站。

个人练习目录：

```text
practice/
└── html-02-links/
    ├── index.html
    └── help.html
```

推荐打开方式：

```bash
cd practice/html-02-links
python3 -m http.server 8000
```

浏览器访问：

```text
http://127.0.0.1:8000/index.html
```

运行输入是两份静态 HTML。可观察输出是页面、最终 URL、片段目标、浏览器历史、新标签关系、请求头和下载行为。关闭标签页并在终端按 <kbd>Control</kbd> + <kbd>C</kbd> 即可停止。

如果只能直接打开文件，也可以先完成双页往返；第 7.5 节的来源和下载实验需要 HTTP 服务器。

### 7.2 完整商品页 `index.html`

将以下完整代码保存到：

```text
practice/html-02-links/index.html
```

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="邻里集市阅读台灯详情与链接导航练习。">
  <title>阅读台灯 · 邻里集市</title>
  <style>
    body {
      font-family: sans-serif;
      line-height: 1.6;
      max-width: 48rem;
      margin: 0 auto;
      padding: 1rem;
    }

    section {
      padding-block: 2rem;
    }

    :target {
      outline: 3px solid #b45309;
      outline-offset: 0.5rem;
    }
  </style>
</head>
<body>
  <a href="#content">跳到主要内容</a>

  <header>
    <p>邻里集市</p>
    <nav aria-label="主导航">
      <ul>
        <li><a href="#listing">商品详情</a></li>
        <li><a href="#contact">联系说明</a></li>
        <li><a href="help.html">使用帮助</a></li>
        <li><a href="help.html#broken-links">破碎链接排查</a></li>
      </ul>
    </nav>
  </header>

  <main id="content">
    <article id="listing">
      <h1>阅读台灯</h1>
      <p>价格：<data value="3900">39 元</data></p>
      <p>灯臂可调节，开关工作正常，适合当面检查后交接。</p>
      <p>
        <a href="help.html#navigation-basics">
          阅读跨页面导航说明
        </a>
      </p>
    </article>

    <section id="link-or-button">
      <h2>链接与操作</h2>
      <p><a href="help.html">查看帮助页</a></p>
      <p>
        <button type="button" disabled>
          收藏功能将在交互课程实现
        </button>
      </p>
      <p>
        查看帮助有明确 URL，所以使用链接；收藏会改变应用状态，
        所以后续实现时使用按钮。
      </p>
    </section>

    <section id="new-tab">
      <h2>新标签与下载</h2>
      <p>
        <a href="help.html"
           target="_blank"
           rel="noopener">
          在新标签打开帮助（新标签页）
        </a>
      </p>
      <p>
        <a href="help.html"
           download="neighbor-market-help.html"
           hreflang="zh-CN"
           type="text/html">
          下载中文帮助页副本
        </a>
      </p>
    </section>

    <section id="contact">
      <h2>联系说明</h2>
      <p>
        <a href="mailto:help@example.invalid">
          给教材维护者发邮件
        </a>
      </p>
      <p>
        <a href="tel:+15550100000">
          拨打教学示例号码 +1 555-010-0000
        </a>
      </p>
      <p>
        示例地址和号码不接收真实请求，激活链接也不代表联系已经成功。
      </p>
    </section>
  </main>

  <footer>
    <p>
      <a href="help.html#return-to-listing">
        查看如何返回商品页
      </a>
    </p>
    <p><small>静态教学页面，不创建预约或付款。</small></p>
  </footer>
</body>
</html>
```

### 7.3 完整帮助页 `help.html`

将以下完整代码保存到：

```text
practice/html-02-links/help.html
```

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="邻里集市链接导航与故障排查帮助。">
  <title>使用帮助 · 邻里集市</title>
  <style>
    body {
      font-family: sans-serif;
      line-height: 1.6;
      max-width: 48rem;
      margin: 0 auto;
      padding: 1rem;
    }

    section {
      min-height: 55vh;
      padding-block: 2rem;
    }

    :target {
      outline: 3px solid #0f766e;
      outline-offset: 0.5rem;
    }
  </style>
</head>
<body>
  <a href="#content">跳到主要内容</a>

  <header>
    <p>邻里集市帮助中心</p>
    <nav aria-label="帮助目录">
      <ul>
        <li><a href="#navigation-basics">导航基础</a></li>
        <li><a href="#broken-links">破碎链接排查</a></li>
        <li><a href="#return-to-listing">返回商品页</a></li>
      </ul>
    </nav>
  </header>

  <main id="content">
    <h1>使用帮助</h1>

    <section id="navigation-basics">
      <h2>导航基础</h2>
      <p>
        同目录文件可以使用相对 URL。
        商品页通过 <code>help.html</code> 到达本页。
      </p>
      <p>
        <a href="index.html#listing">
          返回阅读台灯详情
        </a>
      </p>
    </section>

    <section id="broken-links">
      <h2>破碎链接排查</h2>
      <ol>
        <li>查看地址栏中的最终 URL 和片段。</li>
        <li>在 Elements 中搜索片段对应的唯一 ID。</li>
        <li>检查文件名、目录层级、大小写和文档基准 URL。</li>
        <li>修复后用鼠标、键盘、后退和前进重新验证。</li>
      </ol>
      <p>
        <a href="index.html#link-or-button">
          返回商品页的链接与操作说明
        </a>
      </p>
    </section>

    <section id="return-to-listing">
      <h2>返回商品页</h2>
      <p>
        <a href="index.html#listing">
          返回阅读台灯详情
        </a>
      </p>
      <p>
        也可以使用浏览器后退按钮恢复进入帮助页之前的位置。
      </p>
    </section>
  </main>

  <footer>
    <p><a href="index.html">返回商品页顶部</a></p>
    <p><small>本页是静态帮助，不读取或保存账号数据。</small></p>
  </footer>
</body>
</html>
```

### 7.4 双页案例的预期结果与失败证据

按以下顺序验证，不要只看“页面能显示”：

| 操作 | 预期 URL 或行为 | 失败时的证据 |
| --- | --- | --- |
| 打开 `index.html` | `http://127.0.0.1:8000/index.html` | 404 时检查服务器工作目录和文件名 |
| 点击“商品详情” | URL 末尾为 `#listing`，商品区域有轮廓 | `:target` 为 `null` 时检查 `id` |
| 点击“破碎链接排查” | 加载 `help.html#broken-links` | Network 是否成功取得 `help.html` |
| 在帮助页点击“返回阅读台灯详情” | 回到 `index.html#listing` | 检查相对目录和大小写 |
| 连续按两次后退 | 按历史顺序返回此前片段或页面 | 记录实际浏览器历史，不只观察滚动 |
| 再按前进 | 恢复刚才离开的目标 | 若按钮不可用，说明没有对应历史项 |
| Tab 到“使用帮助”并按 Enter | 与鼠标激活相同地进入帮助页 | Tab 跳过时检查 `href` |
| 激活“新标签打开帮助” | 保留原页，并打开新标签 | 未提示新标签时检查可见文字 |
| 在新帮助页 Console 输入 `window.opener` | 预期为 `null` | 非 `null` 时检查 `rel="noopener"` 和环境 |
| 激活同源下载 | 浏览器通常下载或询问保存 `neighbor-market-help.html` | 检查下载记录、响应头和浏览器设置 |

浏览器可能恢复滚动位置，也可能因缓存、标签设置或目标位置产生细节差异。验收重点是最终 URL、正确文档、目标元素和可操作历史，而不是像素级滚动位置完全一致。

### 7.5 `file:` 根相对路径陷阱

先不要修改正式答案。复制下面的错误链接到个人练习的 `index.html` 中：

```html
<!-- 错误实验：把站点根误当成当前练习目录 -->
<a href="/help.html">错误的根相对帮助链接</a>
```

**文件位置：** `practice/html-02-links/index.html`。

**打开方式：** 直接双击 `index.html`，使地址以 `file:` 开头。

**预期现象：** 在 macOS 一类环境中，目标可能解析为 `file:///help.html`，即磁盘卷根下的文件，而不是练习目录中的 `help.html`。Windows 的盘符表现可能不同，但同样不是“项目目录根”。

**失败证据：** 地址栏最终 URL、文件不存在页面，以及 Console 中：

```js
new URL("/help.html", document.baseURI).href
```

**恢复：** 把同目录链接改回：

```html
<a href="help.html">使用帮助</a>
```

然后重新打开或刷新。使用 HTTP 服务器时，`/help.html` 会从 `http://127.0.0.1:8000/` 的 URL 根查找；只有服务器根目录刚好就是练习目录时它才成功。这个成功不能证明它适合任意部署子路径。

### 7.6 安全新标签与引用来源

在 `index.html` 中已有：

```html
<a href="help.html" target="_blank" rel="noopener">
  在新标签打开帮助（新标签页）
</a>
```

**文件位置：** `practice/html-02-links/index.html`。

**打开方式：** 通过 `http://127.0.0.1:8000/index.html` 打开并激活该链接。

**预期：** 新标签显示帮助页；新标签 Console 的 `window.opener` 是 `null`。Network 中的导航请求仍可能带 `Referer`，因为 `noopener` 不负责隐藏来源。

**失败证据：** `window.opener` 非空，或链接文字没有提示新标签。

**恢复：** 确认实际激活的是带 `rel="noopener"` 的链接，清理缓存后重试，并记录浏览器版本与结果。

若需求明确要求不发送来源，可改为：

```html
<a href="help.html"
   target="_blank"
   rel="noopener noreferrer">
  隐私模式打开帮助（新标签页）
</a>
```

重新打开 DevTools Network，勾选保留日志后激活链接。目标请求通常不再包含 `Referer`。如果环境、扩展或工具没有显示该请求，不要凭空声称结果；记录“未取得请求头证据”。

### 7.7 下载行为与跨源限制

第一步验证同源链接。主页面已有：

```html
<a href="help.html"
   download="neighbor-market-help.html"
   hreflang="zh-CN"
   type="text/html">
  下载中文帮助页副本
</a>
```

**位置：** `practice/html-02-links/index.html`。

**打开方式：** 通过端口 `8000` 的服务器打开。

**预期：** 浏览器通常把同源 `help.html` 作为下载处理，并建议文件名 `neighbor-market-help.html`。

**失败证据：** 页面直接导航、下载被阻止、文件名被改写，或下载记录为空。

**排查：** 检查实际目标是否同源、浏览器下载设置、Network 响应和 `Content-Disposition`。

第二步只用于观察跨源边界。在第二个终端、同一练习目录再启动一个端口：

```bash
python3 -m http.server 8001
```

临时把下面链接加入 `index.html`：

```html
<a href="http://127.0.0.1:8001/help.html"
   download="cross-origin-help.html">
  跨源下载边界实验
</a>
```

端口 `8000` 与 `8001` 不同，所以两个地址跨源。

**预期：** 浏览器通常忽略页面对跨源资源写下的下载文件名意图，转而导航或按响应头处理；Python 静态服务器默认不会用附件响应头强制下载。

**失败证据：** 以 Network 中目标端口、响应头、实际标签行为和下载记录为准。不同浏览器策略可能不同，不以一个浏览器现象推导所有环境。

**恢复：** 删除临时跨源实验链接；分别在两个终端按 <kbd>Control</kbd> + <kbd>C</kbd> 停止服务器。

生产环境若要提供跨源下载，应由资源服务器设置正确的访问权限、内容类型与 `Content-Disposition`，并进行真实浏览器测试。前端 `download` 不能替代服务端授权，也不能绕过用户下载策略。

## 8. 常见错误与排查路径

### 8.1 破碎 fragment：URL 变了但页面没到目标

错误代码：

```html
<a href="help.html#broken-link">查看排查步骤</a>
```

实际目标却是：

```html
<section id="broken-links">
```

诊断顺序：

1. 看地址栏，确认最终文档是不是 `help.html`。
2. 看 Network，确认 `help.html` 是否成功加载。
3. 读取 `location.hash`，确认实际片段是 `#broken-link`。
4. 在 Console 执行：

   ```js
   document.getElementById(location.hash.slice(1))
   ```

5. 返回 `null` 后，在 Elements 搜索 `id="broken-links"`。
6. 检查是否有重复 `id`：

   ```js
   document.querySelectorAll('[id="broken-links"]').length
   ```

7. 把 `href` 改为 `help.html#broken-links`，刷新并复验。

不能只说“它没滚动”。目标在视口内也可能没有明显滚动，DOM 查询才是直接证据。

### 8.2 根相对路径在本机或子路径部署中失效

现象：

```html
<a href="/help.html">帮助</a>
```

直接打开时去 `file:///help.html`；部署到 `https://example.com/course/demo/` 时却去 `https://example.com/help.html`。

根因：开头 `/` 表示 URL 来源根，不表示当前文件夹或仓库根。

修复：同目录页面使用 `help.html`；确实需要站点根时，先确认部署约定，并通过目标环境测试。

### 8.3 把 `href="#"` 当按钮

现象：点击“收藏”后地址多了 `#`，页面可能跳到顶部，后退历史也被影响，但收藏状态没有保存。

错误代码：

```html
<a href="#">收藏</a>
```

修复：

```html
<button type="button">收藏</button>
```

按钮行为要在后续 JavaScript 课程实现。当前课不能用空操作欺骗验收。

### 8.4 强制所有外链新开标签

现象：访问者每次点击都产生新标签，后退按钮不能按预期返回，放大或读屏用户可能失去上下文。

根因：把“外部”误当成“必须新开”。

修复：默认使用当前页；只有业务确需保留当前上下文时才用 `_blank`，并提供可见提示及 `noopener`。

### 8.5 只写 `_blank`，忽略 opener 边界

不推荐：

```html
<a href="https://untrusted.example/" target="_blank">
  用户提交的网站
</a>
```

修复至少包括：

```html
<a href="https://untrusted.example/"
   target="_blank"
   rel="noopener ugc">
  用户提交的网站（新标签页）
</a>
```

现代浏览器可能已隐式隔离 opener，但显式属性仍是代码意图。`ugc` 只描述内容关系，不负责协议白名单或内容审核。

### 8.6 把 `noreferrer` 和 `noopener` 当同一件事

现象：团队为了防 opener 给所有链接加 `noreferrer`，结果目标站点无法获得原本允许的来源信息。

修复：

- 只需切断 opener：`rel="noopener"`。
- 同时有不发送引用来源的隐私需求：`rel="noopener noreferrer"`。
- 需要更细粒度来源控制：评估 `referrerpolicy`。

### 8.7 认为 `download` 能强制任意跨源文件保存

现象：点击跨源 PDF 后在标签页预览，或建议文件名被忽略。

根因：`download` 是受同源、响应头和浏览器策略约束的提示。

排查证据：

- 目标 URL 的方案、主机和端口；
- Network 中 `Content-Type`；
- `Content-Disposition`；
- 下载记录；
- 浏览器控制台或拦截提示。

修复：由资源服务器明确附件响应和权限；不要试图仅用 HTML 绕过。

### 8.8 相信 `hreflang` 或 `type` 会验证内容

现象：链接写了 `hreflang="zh-CN"`，目标却是英文；写了 `type="application/pdf"`，服务器实际返回 HTML 错误页。

根因：这两个属性只是作者提供的提示。

修复：保持可见文案、属性和真实响应一致，并以目标内容和 Network 响应头验证。

### 8.9 把邮件或电话处理程序启动当成业务成功

现象：页面统计“邮件已发送”，实际只是打开了邮件客户端；桌面设备甚至没有处理程序。

修复：文案写“发邮件”或“拨打电话”，不要写“发送成功”。需要可确认提交时，应使用受控表单和服务端流程。

### 8.10 直接接受不可信 URL

错误示例：

```js
profileLink.href = sellerProvidedUrl;
profileLink.textContent = "访问卖家主页";
```

失败证据：用测试值 `javascript:/* test */` 或 `data:text/html,test` 解析后，`new URL(...).protocol` 不是允许的 `http:`/`https:`。

修复：使用第 4.15 节的 URL 解析和协议白名单；失败时删除 `href` 并隐藏入口。不要实际运行攻击载荷。

### 8.11 片段 `id` 重复

现象：同一个 `#contact` 可能定位到意外元素，DOM 查询结果不再唯一。

证据：

```js
document.querySelectorAll('[id="contact"]').length
```

期望值是 `1`。修复时给每个分节唯一、稳定、能描述内容的 ID，并同步全部入口链接。

### 8.12 文件名大小写只在部署后失败

现象：本机 `href="Help.html"` 似乎能打开 `help.html`，部署到大小写敏感环境后 404。

修复：文件名与 `href` 完全一致，推荐使用英文小写和连字符；通过 Network 的状态码确认，不以本机文件系统宽容行为为标准。

## 9. 课后题

先独立回答，再展开参考答案。答案不仅给结论，也说明判断步骤。

### 9.1 URL 六部分

题目：拆解下面的 URL。

```text
https://market.example:9443/search/items?q=lamp&page=3#results
```

<details>
<summary>参考答案</summary>

- scheme：`https`
- host：`market.example`
- port：`9443`
- path：`/search/items`
- query：`q=lamp&page=3`
- fragment：`results`

判断时先找 `://`、第一个路径 `/`、`?` 和 `#`。查询和片段不属于路径。

</details>

### 9.2 相对目标预测

题目：当前文档是 `https://market.example/shop/items/index.html`，`href="../../help.html#contact"` 最终去哪里？

<details>
<summary>参考答案</summary>

结果是：

```text
https://market.example/help.html#contact
```

`index.html` 所在目录是 `/shop/items/`。第一个 `..` 回到 `/shop/`，第二个 `..` 回到 `/`，再添加 `help.html#contact`。

</details>

### 9.3 根相对不是当前目录

题目：当前页面是 `https://market.example/course/demo/index.html`，`href="/help.html"` 去哪里？为什么不是 `course/demo/help.html`？

<details>
<summary>参考答案</summary>

结果是 `https://market.example/help.html`。开头 `/` 从当前来源的 URL 根路径开始。若要同目录帮助页，应写 `help.html` 或 `./help.html`。

</details>

### 9.4 查询与片段替换

题目：当前 URL 是 `https://market.example/items?q=lamp#top`，分别激活 `?q=desk` 和 `#results` 会得到什么？

<details>
<summary>参考答案</summary>

- `?q=desk` 得到 `https://market.example/items?q=desk`：保留路径，替换查询，旧片段不保留。
- 如果从原始 URL 激活 `#results`，得到 `https://market.example/items?q=lamp#results`：保留路径和查询，只替换片段。

若连续操作，第二步基于当时的当前 URL，而不是自动回到题目原始 URL。

</details>

### 9.5 Fragment 会发送给服务器吗

题目：访问 `help.html#broken-links` 时，服务器能否从普通 HTTP 请求目标中读取 `broken-links`？

<details>
<summary>参考答案</summary>

不能。浏览器请求 `help.html`，文档加载后在客户端处理 `#broken-links`。页面脚本、地址栏和历史可以看到片段，所以它仍然不能存放秘密。

</details>

### 9.6 链接还是按钮

题目：为“查看交接规则”“收藏商品”“下载公开说明”“提交预约”分别选择元素。

<details>
<summary>参考答案</summary>

- 查看交接规则：链接，例如 `<a href="#shipping">`。
- 收藏商品：`<button type="button">`，因为它改变应用状态。
- 下载公开说明：带资源 URL 的链接，可在同源条件合适时增加 `download`。
- 提交预约：表单中的 `<button type="submit">`。

判断标准不是外观，而是“导航到地址”还是“执行动作”。

</details>

### 9.7 `noopener` 与 `noreferrer`

题目：产品需要新标签打开帮助，但允许目标知道来源；应该选择什么？若还要求不发送来源呢？

<details>
<summary>参考答案</summary>

允许发送来源时：

```html
<a href="help.html" target="_blank" rel="noopener">帮助</a>
```

还要求不发送来源时：

```html
<a href="help.html" target="_blank" rel="noopener noreferrer">帮助</a>
```

`noopener` 处理 opener 关系，`noreferrer` 处理引用来源并同时带来 opener 隔离效果。

</details>

### 9.8 同源判断

题目：当前页是 `http://127.0.0.1:8000/index.html`，以下哪些同源？

1. `http://127.0.0.1:8000/help.html`
2. `http://127.0.0.1:8001/help.html`
3. `https://127.0.0.1:8000/help.html`
4. `http://localhost:8000/help.html`

<details>
<summary>参考答案</summary>

只有第 1 个同源。

- 第 2 个端口不同；
- 第 3 个方案不同；
- 第 4 个主机字符串不同，`localhost` 与 `127.0.0.1` 在网络上可能指向同一台机器，但来源判断仍把它们视为不同主机。

</details>

### 9.9 下载意图

题目：为什么 `<a href="https://files.example/rules.pdf" download>` 不能保证下载？

<details>
<summary>参考答案</summary>

因为目标可能跨源，`download` 只是浏览器受限处理的提示。真实行为还受目标响应的 `Content-Disposition`、`Content-Type`、浏览器策略、用户设置和权限影响。页面不能靠一个属性强制跨源服务器提供附件。

</details>

### 9.10 不可信协议

题目：为什么 `sellerUrl.startsWith("http")` 不是理想的 URL 安全检查？

<details>
<summary>参考答案</summary>

字符串前缀检查没有完成标准 URL 解析，也容易遗漏大小写、空白、转义、相对地址和业务域名限制。应先用 `new URL()` 解析并读取规范化后的 `protocol`，再按白名单判断；若还有限定站点需求，再检查 `hostname` 和端口。

</details>

### 9.11 `base` 对片段的影响

题目：当前页面是 `https://market.example/index.html`，`head` 中有 `<base href="https://docs.example/help.html">`。此时 `href="#contact"` 一定指向当前页吗？

<details>
<summary>参考答案</summary>

不一定。相对片段也以文档基准 URL 解析，最终可成为 `https://docs.example/help.html#contact`。应检查 `document.baseURI` 和链接元素解析后的 `href`。这也是初学项目不应随意加入 `base` 的原因。

</details>

### 9.12 `mailto:` 的成功边界

题目：用户点击 `mailto:` 后出现邮件编辑器，页面能否显示“邮件已发送”？

<details>
<summary>参考答案</summary>

不能。页面只知道浏览器尝试交给外部处理程序，无法由这次链接激活证明用户真的发送、服务器收到或地址有效。文案应保持为“写邮件”或“联系”，而不是成功确认。

</details>

## 10. 实践练习

所有练习都在个人目录 `practice/html-02-links/` 中完成。先备份能工作的版本；制造故障后必须恢复，不要把错误状态当作最终答案。

### 10.1 基础练习：目标预测表

当前文档：

```text
https://market.example/course/html/pages/index.html?mode=learn#start
```

不运行代码，先写出以下引用的完整目标：

1. `help.html`
2. `./help.html#keyboard`
3. `../index.html`
4. `/support/index.html`
5. `?mode=review`
6. `#download`
7. `https://docs.example/html/links`

然后在 Console 用 `new URL(引用, 基准).href` 逐项核对。

#### 完整答案

| 引用 | 完整目标 |
| --- | --- |
| `help.html` | `https://market.example/course/html/pages/help.html` |
| `./help.html#keyboard` | `https://market.example/course/html/pages/help.html#keyboard` |
| `../index.html` | `https://market.example/course/html/index.html` |
| `/support/index.html` | `https://market.example/support/index.html` |
| `?mode=review` | `https://market.example/course/html/pages/index.html?mode=review` |
| `#download` | `https://market.example/course/html/pages/index.html?mode=learn#download` |
| `https://docs.example/html/links` | `https://docs.example/html/links` |

完成标准：七项全部正确，并能口头解释为什么第 4 项丢弃 `/course/html/pages/`，为什么第 5 项不保留旧片段。

### 10.2 基础练习：历史导航与键盘

使用第 7 节双页案例，按顺序执行：

1. 打开不带片段的 `index.html`。
2. 只用键盘 Tab 找到“联系说明”，按 Enter。
3. 继续用 Tab 找到“破碎链接排查”，按 Enter。
4. 在帮助页点击“返回商品页的链接与操作说明”。
5. 按两次浏览器后退，再按一次前进。
6. 记录每一步地址栏 URL 和页面标题。

#### 完整答案与预期序列

在没有额外操作和浏览器历史合并的典型情况下，关键导航依次是：

```text
index.html
index.html#contact
help.html#broken-links
index.html#link-or-button
```

第一次后退通常回到 `help.html#broken-links`，第二次后退回到 `index.html#contact`，一次前进再到 `help.html#broken-links`。

允许浏览器在滚动恢复细节上不同，但必须满足：

- Tab 能聚焦真实链接；
- Enter 能激活；
- 页面标题在商品页和帮助页之间正确切换；
- 后退与前进恢复的是历史目标，而不是由学习者重新输入 URL；
- 记录中没有把按钮 Space 行为误写成链接行为。

如果序列不同，记录是否刷新、手动输入地址或从新标签操作；这些都会改变历史栈。

### 10.3 进阶练习：新标签与引用来源

在 `index.html` 增加两个明确标注的新标签链接：

1. 一个保留正常引用来源，只隔离 opener；
2. 一个既隔离 opener，也不发送引用来源。

用 Console 和 Network 分别记录证据。

#### 完整答案

```html
<p>
  <a href="help.html"
     target="_blank"
     rel="noopener">
    打开普通帮助（新标签页）
  </a>
</p>

<p>
  <a href="help.html"
     target="_blank"
     rel="noopener noreferrer">
    打开隐私帮助（新标签页）
  </a>
</p>
```

预期：

- 两个新标签中的 `window.opener` 都为 `null`；
- 普通帮助请求是否带完整来源取决于有效 referrer policy，但同源导航通常可在 Network 看到 `Referer`；
- 隐私帮助请求不应发送 `Referer`；
- 两个链接文字都提示新标签。

若 Network 没有证据，打开 DevTools 后勾选“Preserve log/保留日志”再重试，不要把看不到请求解释为一定没有请求。

### 10.4 故障注入：破碎 fragment

把 `index.html` 中：

```html
<a href="help.html#broken-links">破碎链接排查</a>
```

临时改为：

```html
<a href="help.html#broken-link">破碎链接排查</a>
```

要求提交四项记录：

1. 地址栏最终 URL；
2. Network 中文档请求；
3. `location.hash`；
4. `document.querySelector(":target")`。

修复后重复四项记录。

#### 完整答案

故障状态：

```text
最终 URL：http://127.0.0.1:8000/help.html#broken-link
文档请求：http://127.0.0.1:8000/help.html
location.hash：#broken-link
document.querySelector(":target")：null
```

修复为 `help.html#broken-links` 后：

```text
最终 URL：http://127.0.0.1:8000/help.html#broken-links
文档请求：http://127.0.0.1:8000/help.html
location.hash：#broken-links
document.querySelector(":target")：对应 section 元素
```

完成标准：能解释“文档加载成功”和“片段目标存在”是两个独立检查，不把 200 响应当成片段有效证明。

### 10.5 故障注入：`file:` 根相对路径

直接打开 `index.html`，临时加入：

```html
<a href="/help.html">根相对帮助</a>
```

点击前先在 Console 预测：

```js
new URL("/help.html", document.baseURI).href
```

#### 完整答案

在常见 macOS 文件 URL 中，结果是：

```text
file:///help.html
```

它不是：

```text
file:///Users/you/practice/html-02-links/help.html
```

修复为：

```html
<a href="help.html">同目录帮助</a>
```

完成标准：保留一条“预测值、实际值、修复值”记录，并说明根相对路径依赖 URL 来源根，不依赖编辑器项目根。

### 10.6 进阶练习：下载边界

通过端口 `8000` 打开商品页，再通过端口 `8001` 提供同一 `help.html`。分别创建同源与跨源下载链接，记录：

- 链接元素解析后的完整 `href`；
- 两个目标的来源三元组；
- 实际是下载、预览还是导航；
- Network 中的 `Content-Type` 与 `Content-Disposition`；
- 下载记录中的最终文件名。

#### 完整答案

```html
<a href="help.html"
   download="same-origin-help.html">
  同源下载
</a>

<a href="http://127.0.0.1:8001/help.html"
   download="cross-origin-help.html">
  跨源下载边界
</a>
```

来源：

```text
页面：http + 127.0.0.1 + 8000
同源目标：http + 127.0.0.1 + 8000
跨源目标：http + 127.0.0.1 + 8001
```

Python 静态服务器通常返回 `Content-Type: text/html`，不会默认返回 `Content-Disposition: attachment`。同源链接通常按 `download` 处理；跨源链接通常忽略前端建议文件名并导航或预览。浏览器若表现不同，应记录浏览器版本和响应证据，结论仍然是：不能仅凭 `download` 保证跨源保存。

### 10.7 安全练习：修复不可信链接

错误代码：

```html
<a id="seller-profile">访问卖家主页</a>

<script>
  const sellerProvidedUrl = "javascript:/* untrusted */";
  const profileLink = document.querySelector("#seller-profile");
  profileLink.href = sellerProvidedUrl;
</script>
```

要求：

- 只允许 HTTP 和 HTTPS；
- 解析失败或协议不允许时，链接不可激活；
- 页面显示清楚的错误说明；
- 不执行测试字符串。

#### 完整答案

```html
<p>
  <a id="seller-profile" hidden>访问卖家主页</a>
  <span id="seller-profile-error" role="status"></span>
</p>

<script>
  const sellerProvidedUrl = "javascript:/* untrusted */";
  const profileLink = document.querySelector("#seller-profile");
  const errorMessage = document.querySelector("#seller-profile-error");

  function toAllowedNavigationUrl(rawValue, baseUrl) {
    const candidate = new URL(rawValue, baseUrl);
    const allowedProtocols = new Set(["http:", "https:"]);

    if (!allowedProtocols.has(candidate.protocol)) {
      throw new Error("卖家主页只允许 HTTP 或 HTTPS 地址。");
    }

    return candidate.href;
  }

  try {
    profileLink.href = toAllowedNavigationUrl(
      sellerProvidedUrl,
      document.baseURI
    );
    profileLink.hidden = false;
    errorMessage.textContent = "";
  } catch (error) {
    profileLink.removeAttribute("href");
    profileLink.hidden = true;
    errorMessage.textContent = error.message;
  }
</script>
```

预期结果：

- 页面不显示可激活的卖家主页链接；
- 状态文字显示“卖家主页只允许 HTTP 或 HTTPS 地址。”；
- Console 不应出现不可信代码执行结果；
- 将测试值改成 `https://example.com/profile` 后，链接才显示并具有规范化后的 HTTPS 地址。

这份答案不检查允许域名。若业务只允许平台官方域名，还应在 URL 解析后增加 `candidate.hostname` 白名单，不能用链接文字代替。

### 10.8 综合练习：独立增加“安全交接”页面入口

不创建第三个文件，只在现有帮助页增加 `id="safe-handover"` 分节，并完成：

- 商品页增加跨页片段链接；
- 帮助页目录增加同页片段链接；
- 链接文字明确描述“安全交接”；
- 用后退和前进验证；
- 故意把 `id` 改错一次并按第 8.1 节恢复。

#### 完整答案

插入 `index.html` 主导航或正文：

```html
<a href="help.html#safe-handover">阅读安全交接说明</a>
```

插入 `help.html` 的帮助目录：

```html
<li><a href="#safe-handover">安全交接</a></li>
```

插入 `help.html` 的 `main`：

```html
<section id="safe-handover">
  <h2>安全交接</h2>
  <p>在光线充足的公共地点检查物品，不提前提供支付凭证。</p>
  <p><a href="index.html#listing">返回阅读台灯详情</a></p>
</section>
```

验收：

- `help.html#safe-handover` 的 `:target` 是新增分节；
- `document.querySelectorAll('[id="safe-handover"]').length` 等于 `1`；
- 键盘 Enter 可以从两个入口到达；
- 后退可以恢复之前的商品页位置；
- 修复记录包含错误片段、`null` 证据和正确目标元素。

## 11. 阶段验收

### 11.1 必做成果

- [ ] `index.html` 与 `help.html` 都是完整 HTML 文档。
- [ ] 两页能通过同目录相对 URL 往返。
- [ ] 至少有一个同页片段和一个跨页片段，目标 `id` 存在且唯一。
- [ ] 能从给定基准 URL 正确预测相对、根相对和绝对目标。
- [ ] 已实际使用浏览器后退与前进验证历史导航。
- [ ] 只用键盘 Tab 与 Enter 可以完成商品页到帮助页再返回的路径。
- [ ] “查看帮助”使用链接，“收藏”不使用伪链接。
- [ ] 新标签链接有可见提示和 `rel="noopener"`。
- [ ] 能用 `window.opener` 说明新标签防护证据。
- [ ] 能说明 `noreferrer` 与 `noopener` 的差异。
- [ ] 能解释 `hreflang`、`type` 和 `download` 都不是内容验证或强制命令。
- [ ] 已完成一次同源与跨源下载行为对比，或明确记录环境未提供 HTTP 验证。
- [ ] 已复现并修复破碎片段。
- [ ] 已复现并解释 `file:` 根相对路径陷阱。
- [ ] 已把不可信 URL 改成解析后执行协议白名单检查。
- [ ] 没有实际启用 `ping`，但能说明其额外请求与隐私边界。

### 11.2 提交证据

学习记录应至少包含：

1. 一张手写或文本形式的 URL 六部分拆解；
2. 第 6.4 节 URL 解析表的个人预测结果；
3. 双页关键路径的 URL 序列；
4. 破碎片段修复前后的 `:target` 结果；
5. `file:` 根相对路径的预测值与实际值；
6. 新标签中的 `window.opener` 结果；
7. 同源与跨源下载的 Network 或下载记录；
8. 不可信地址被拒绝后的页面结果；
9. 使用的浏览器名称与版本；
10. 未验证项及原因。

### 11.3 一票否决项

出现以下任一项，不能判定本课通过：

- 用 `href="#"`、无 `href` 的 `a` 或点击 `div` 代替按钮；
- 片段目标不存在或 `id` 重复，却只凭“看起来没问题”通过；
- 所有外链无条件强制新开标签且不提示；
- 把 `download` 描述成可绕过跨源或服务端权限；
- 把 `mailto:` 或 `tel:` 的处理程序启动描述成业务成功；
- 直接把不可信输入写进 `href`、`ping` 或其他 URL 属性；
- 在 URL 查询或片段中放入密码、令牌或真实敏感数据；
- 删除失败证据而没有修复并复验。

### 11.4 自我讲解验收

不看正文，用三分钟回答：

1. 浏览器从哪里开始解析 `help.html`？
2. `/help.html` 为什么不是“当前文件夹的帮助页”？
3. `help.html#rules` 中哪一部分会请求服务器，哪一部分由浏览器处理？
4. 为什么链接和按钮不能只按外观选择？
5. `noopener` 与 `noreferrer` 分别控制什么？
6. 为什么跨源链接可以导航，但 `download` 仍可能被忽略？
7. 为什么 URL 解析成功不代表 URL 可以信任？

任何一题只能背属性名、不能解释浏览器行为和证据时，都应回到对应理论与错误实验。

## 12. 常见问题

### 地址出现了 `#target`，为什么页面没有滚动？

目标可能已经在视口中，也可能根本不存在。执行 `document.querySelector(":target")`：得到元素说明片段匹配成功；得到 `null` 才是破碎目标证据。还要检查 `id` 大小写和唯一性。

### `./help.html` 与 `help.html` 有区别吗？

在普通同目录解析中结果相同。`./` 明确表示当前目录，有时能提高可读性，但不会改变基准 URL。两者都会受 `base` 影响。

### 为什么不能一直使用绝对 URL，避免相对路径出错？

绝对 URL 的目标明确，但站内链接硬编码域名会增加本地开发、预览环境、域名迁移和子路径部署成本。应根据资源归属选择：站内稳定关系通常用合适的相对 URL，跨站目标使用绝对 URL，并通过测试验证。

### URL 中的 `#` 是注释吗？

不是。在 URL 中它引出片段；在 CSS 选择器中它常用于 ID；不同语言上下文含义不同。不要把一种语法的规则套到另一种语法。

### 同源链接一定安全吗？

不一定。同源只描述方案、主机和端口相同，不证明内容可信、用户有权限或页面没有漏洞。跨源链接也不自动恶意。本课用来源判断 opener、referrer 和下载边界，不把它当成信誉评分。

### `_blank` 是否一定打开新“窗口”？

它请求新的浏览上下文，现代浏览器通常表现为新标签，也可能根据用户设置成为窗口。文案写“新标签页”是常见产品提示，但测试时应记录实际环境。

### 现代浏览器已经隐式 `noopener`，还要写吗？

显式写出能表达安全意图，便于代码审查，并照顾特殊或旧环境。不能因为现代默认行为就混淆 `noopener` 和 `noreferrer`，也不能忽略可见的新标签提示。

### `rel="external"` 会自动新开标签吗？

不会。它只描述目标关系。打开位置由 `target`、浏览器和用户操作决定。

### `referrerpolicy="no-referrer"` 能替代 `noopener` 吗？

不能。它控制引用来源请求头，不负责切断新页面的 `window.opener`。新标签隔离仍使用 `noopener`。

### 为什么 `noreferrer` 不能保护 URL 查询中的秘密？

`noreferrer` 只控制来源信息。目标 URL 自己的查询仍会发送给目标服务器，也可能进入历史、日志和监控。秘密不应放进 URL。

### `download` 的文件名为什么和属性值不同？

浏览器会清理非法字符，服务器 `Content-Disposition`、操作系统规则和用户选择也可能改变文件名。属性只是建议，不是文件系统写入命令。

### 能否把用户上传的任何文件做成 `data:` 下载链接？

不能因此放弃验证。`data:` 可能承载主动内容、消耗大量内存或产生欺骗性下载。受控数据生成也要限制类型、大小、文件名和使用场景；不可信导航默认不允许 `data:`。

### `mailto:` 中可以预填 HTML 邮件正文吗？

不同邮件客户端支持不一致，`body` 通常按文本处理。不要依赖它传递复杂格式、附件或敏感数据。需要可靠邮件工作流时应使用后端服务并取得用户确认。

### 直接打开 `file:` 页面可以测试同源吗？

不适合作为可靠同源实验。`file:` 来源和本地文件访问策略存在浏览器差异。使用 `http://127.0.0.1` 的本地静态服务器，才能得到更接近网站的来源与 Network 证据。

### `ping` 能否用来确认用户已经看到目标页？

不能。它最多表示浏览器在激活链接时尝试发送通知，请求可能被禁用或阻止，也不能证明目标加载完成、用户阅读或业务成功。

## 13. 扩展阅读

参考资料核对日期：**2026-10-10**。

- [WHATWG URL Standard](https://url.spec.whatwg.org/)：URL 解析、基准 URL 与序列化模型。
- [WHATWG HTML：Links](https://html.spec.whatwg.org/multipage/links.html)：链接关系、下载与超链接处理。
- [WHATWG HTML：The `a` element](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element)：`a` 元素内容模型和属性。
- [WHATWG HTML：The `base` element](https://html.spec.whatwg.org/multipage/semantics.html#the-base-element)：文档基准 URL 与默认目标。
- [MDN：What is a URL?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL)：面向初学者的 URL 组成与相对地址。
- [MDN：`<a>` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a)：属性、下载、邮件、电话与无障碍提示。
- [MDN：`URL` API](https://developer.mozilla.org/en-US/docs/Web/API/URL)：用结构化 API 解析和检查 URL。
- [MDN：Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)：来源三元组和浏览器安全边界。
- [MDN：Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)：引用来源策略及各取值。
- [OWASP：Reverse Tabnabbing](https://owasp.org/www-community/attacks/Reverse_Tabnabbing)：新标签 opener 风险与现代浏览器变化。

查阅资料时区分三类结论：

1. 规范定义了什么模型；
2. 浏览器当前实现了什么行为；
3. 你的目标浏览器、扩展和用户设置实际产生了什么证据。

本课示例已按现代 HTML 和 URL 模型编写，但 `file:` 来源、下载策略、外部协议处理、新窗口形态和隐私工具拦截仍需在目标环境实测。

## 我现在能做到什么

我能从文档基准 URL 推导链接的最终目标，区分同页与跨页片段，并用地址栏、DOM、历史和 Network 找到失败证据。我能选择链接或按钮，为新标签隔离 opener，按隐私需求控制引用来源，说明下载的同源与响应头边界，并在不可信地址进入 `href` 前执行结构化解析和协议白名单检查。

我也知道 HTML 链接只负责导航意图：它不证明邮件已发送、电话已接通、文件有权限下载，也不实现邻里集市的收藏、预约、认证或支付。

## 单元导航

| 方向 | 教材 |
| --- | --- |
| 上一课 | [01 地标、标题与页面大纲](01-landmarks-headings-outline.md) |
| 本章入口 | [02 结构、链接与列表](../02-structure-links-lists.md) |
| 下一课 | [03 列表、图文与内容分组](03-lists-figures-content-groups.md) |
| 模块入口 | [HTML：邻里集市零基础教材](../README.md) |
