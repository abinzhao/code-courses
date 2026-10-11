# URL 解析与片段导航：预测最终目标

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 拆解 URL、来源和文档基准，计算相对地址、查询和片段的最终目标。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `LNK-001`、`LNK-002`、`LNK-003`、`LNK-004` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

拆解 URL、来源和文档基准，计算相对地址、查询和片段的最终目标。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 LNK-001（URL 的协议、主机、端口、路径、查询、片段）、LNK-002（文档基准 URL）、LNK-003（相对、根相对、绝对 URL）、LNK-004（同页与跨页片段导航）；
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
读取 href
  → 找到文档基准 URL
  → 解析为最终 URL
  → 判断导航目标和来源边界
  → 执行链接的默认行为
  → 用地址栏、DOM、历史、Network 或下载记录验证
```

### 3.2 预备材料 2

```text
practice/
└── html-02-links/
    ├── index.html
    └── help.html
```

### 3.3 预备材料 3

```bash
python3 -m http.server 8000
```

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

本章的完整项目代码集中在 [原生链接与页面导航：从 href 到历史记录](04-native-links-navigation.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 LNK-001（URL 的协议、主机、端口、路径、查询、片段） 对应的元素、属性或状态；
- 在项目中实现并标出与 LNK-002（文档基准 URL） 对应的元素、属性或状态；
- 在项目中实现并标出与 LNK-003（相对、根相对、绝对 URL） 对应的元素、属性或状态；
- 在项目中实现并标出与 LNK-004（同页与跨页片段导航） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`04-native-links-navigation.md`](04-native-links-navigation.md)。

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

### 8.3 片段 `id` 重复

现象：同一个 `#contact` 可能定位到意外元素，DOM 查询结果不再唯一。

证据：

```js
document.querySelectorAll('[id="contact"]').length
```

期望值是 `1`。修复时给每个分节唯一、稳定、能描述内容的 ID，并同步全部入口链接。

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

### 9.6 同源判断

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

### 9.7 不可信协议

题目：为什么 `sellerUrl.startsWith("http")` 不是理想的 URL 安全检查？

<details>
<summary>参考答案</summary>

字符串前缀检查没有完成标准 URL 解析，也容易遗漏大小写、空白、转义、相对地址和业务域名限制。应先用 `new URL()` 解析并读取规范化后的 `protocol`，再按白名单判断；若还有限定站点需求，再检查 `hostname` 和端口。

</details>

### 9.8 `base` 对片段的影响

题目：当前页面是 `https://market.example/index.html`，`head` 中有 `<base href="https://docs.example/help.html">`。此时 `href="#contact"` 一定指向当前页吗？

<details>
<summary>参考答案</summary>

不一定。相对片段也以文档基准 URL 解析，最终可成为 `https://docs.example/help.html#contact`。应检查 `document.baseURI` 和链接元素解析后的 `href`。这也是初学项目不应随意加入 `base` 的原因。

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

### 10.2 故障注入：破碎 fragment

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

### 10.3 故障注入：`file:` 根相对路径

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

## 12. 常见问题

### `./help.html` 与 `help.html` 有区别吗？

在普通同目录解析中结果相同。`./` 明确表示当前目录，有时能提高可读性，但不会改变基准 URL。两者都会受 `base` 影响。

### 为什么不能一直使用绝对 URL，避免相对路径出错？

绝对 URL 的目标明确，但站内链接硬编码域名会增加本地开发、预览环境、域名迁移和子路径部署成本。应根据资源归属选择：站内稳定关系通常用合适的相对 URL，跨站目标使用绝对 URL，并通过测试验证。

### URL 中的 `#` 是注释吗？

不是。在 URL 中它引出片段；在 CSS 选择器中它常用于 ID；不同语言上下文含义不同。不要把一种语法的规则套到另一种语法。

### 直接打开 `file:` 页面可以测试同源吗？

不适合作为可靠同源实验。`file:` 来源和本地文件访问策略存在浏览器差异。使用 `http://127.0.0.1` 的本地静态服务器，才能得到更接近网站的来源与 Network 证据。

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

- 能解释并验证：拆解 URL、来源和文档基准，计算相对地址、查询和片段的最终目标。
- `LNK-001`：URL 的协议、主机、端口、路径、查询、片段
- `LNK-002`：文档基准 URL
- `LNK-003`：相对、根相对、绝对 URL
- `LNK-004`：同页与跨页片段导航
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：标题大纲、阅读顺序与 ARIA：保持结构一致](02-headings-reading-order-aria.md) · [下一课：原生链接与页面导航：从 href 到历史记录](04-native-links-navigation.md) · [返回 HTML 模块](../README.md)
