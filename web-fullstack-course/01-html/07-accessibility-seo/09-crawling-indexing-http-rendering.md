# 抓取、索引、HTTP 与渲染：交付真实页面状态

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 区分发现、抓取与索引，结合 robots、sitemap、链接、HTTP 状态和渲染策略交付事实。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `SEO-003`、`SEO-004`、`SEO-005`、`SEO-007` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

区分发现、抓取与索引，结合 robots、sitemap、链接、HTTP 状态和渲染策略交付事实。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 SEO-003（robots meta 与 robots.txt 边界）、SEO-004（sitemap、有效链接与 HTTP 状态）、SEO-005（抓取与索引差异）、SEO-007（客户端渲染、SSR 和预渲染边界）；
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
稳定 URL
  → 可抓取链接与 sitemap 发现 URL
  → 服务器返回有意义的 HTTP 状态和 HTML
  → title、description、canonical、robots 表达页面意图
  → 可见正文提供真实事实
  → Microdata 或 JSON-LD 描述同一批事实
  → 搜索系统自行决定是否抓取、索引和展示
```

## 4. 核心理论

### 4.1 从发现到展示：不要跳过中间状态

可以先用一个简化模型理解搜索处理：

```text
发现 URL
  ↓
允许并尝试抓取
  ↓
读取 HTTP 状态、响应头与初始 HTML
  ↓
按系统能力和资源预算渲染 JavaScript
  ↓
分析正文、链接、元信息、重复关系和结构化数据
  ↓
决定是否索引以及选择哪个 canonical
  ↓
收到查询时决定是否以及怎样展示
```

这个流程不是页面可以调用的同步 API。站点提供输入和信号，搜索系统保留自己的调度与判断。

| 阶段 | 问题 | 能影响它的站点输入 | 不能推导出的结论 |
| --- | --- | --- | --- |
| 发现 | 是否知道 URL 存在 | `<a href>`、sitemap、外部链接 | 已经请求 URL |
| 抓取 | 是否取得响应 | robots.txt、服务器可用性、状态码 | 一定会索引 |
| 渲染 | 脚本执行后是什么 DOM | HTML、JS、CSS、API、资源权限 | 所有抓取器都能等到结果 |
| 索引 | 是否保存和理解内容 | 正文、robots meta、canonical、质量 | 某个查询一定展示 |
| 展示 | 是否适合这次查询 | 索引内容及搜索系统信号 | 固定排名、固定摘要或富结果 |

Google 官方文档把主要阶段概括为 crawling、indexing 和 serving；JavaScript 页面还需要特别观察 rendering。其他搜索引擎和工具的能力、调度与政策可能不同，因此不能用一个搜索引擎的实现保证所有消费者。

### 4.2 robots meta、`X-Robots-Tag` 与 `robots.txt`

三个机制处于不同层：

| 机制 | 位置 | 主要粒度 | 典型用途 | 关键边界 |
| --- | --- | --- | --- | --- |
| robots meta | HTML `<head>` | 单个 HTML 页面 | `noindex`、摘要预览指令 | 抓取器必须取得页面才能读取 |
| `X-Robots-Tag` | HTTP 响应头 | 页面或非 HTML 资源 | PDF、图片或统一响应策略 | 需要服务器配置 |
| `robots.txt` | 每个主机根路径 | 抓取路径规则 | 管理合规抓取器访问 | 不是索引删除、权限或保密机制 |

#### 教学预览页使用 `noindex`

```html
<meta name="robots" content="noindex, follow">
```

它表达“不在支持该指令的搜索结果中展示此页面；页面链接仍可供发现”。不同搜索引擎支持的具体 token 可能不同，应查目标系统官方文档。

`noindex` 不是安全边界：

- 知道 URL 的人仍可访问；
- 不守规则的抓取器可以忽略；
- 页面内容仍通过网络公开传输；
- 私密内容应使用身份认证、授权和服务器拒绝访问；
- 临时删除还需要结合搜索系统删除工具与长期正确状态。

#### 为什么不要同时挡住 `noindex`

下面的组合意图冲突：

```text
# robots.txt
User-agent: *
Disallow: /teaching-preview/
```

```html
<!-- /teaching-preview/page.html -->
<meta name="robots" content="noindex">
```

对遵守 `robots.txt` 的抓取器来说，它可能不能请求页面，也就看不到页面里的 `noindex`。如果 URL 从其他链接被发现，系统仍可能知道这个 URL。要让合规搜索抓取器读取 `noindex`，应允许它抓取该页面；要保护内容，应在服务器实施权限，而不是组合两个公开提示。

#### `robots.txt` 的合理示例

文件必须位于当前主机根路径：

```text
https://market.example/robots.txt
```

内容：

```text
User-agent: *
Allow: /

Sitemap: https://market.example/sitemap.xml
```

若某些无限参数路径会制造大量重复抓取，应先从 URL 设计、链接生成和服务器行为修复，再评估抓取规则。不要把 `robots.txt` 当 canonical 工具。

### 4.3 sitemap：URL 清单，不是收录申请的保证书

最小 XML sitemap：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://market.example/listings/commuter-bike-001</loc>
    <lastmod>2026-10-10T08:30:00Z</lastmod>
  </url>
</urlset>
```

它告诉搜索工具站点认为哪些 URL 重要，并可以提供真实最后修改时间。它不能：

- 让被权限阻止的页面公开；
- 修复 `404`、`5xx` 或无正文页面；
- 替代站内导航；
- 强制抓取或索引；
- 让重复参数 URL 自动合并；
- 证明结构化数据真实；
- 保证排名或富结果。

邻里集市 sitemap 应只列：

- 公开可访问；
- 返回成功内容；
- 希望索引；
- 作为首选版本；
- 能长期保持稳定的 URL。

不应列：

- `noindex` 教学页；
- 登录后个人页；
- `404` 或已删除 URL；
- 只负责跳转的 URL；
- 带追踪参数的重复 URL；
- 临时预览、草稿和本地地址。

`lastmod` 应表示页面主要内容的真实最后修改时间，不是每次生成 sitemap 的当前时间。本课首次生成商品时，创建时间也就是初次发布修改时间，所以示例复用该 UTC 时间；商品后续编辑时必须改为真实编辑时间。

### 4.4 有效、可抓取、对人也可用的链接

稳定入口使用带 `href` 的锚点：

```html
<a href="/listings/commuter-bike-001">查看八成新通勤自行车</a>
```

它同时提供：

- 浏览器默认导航；
- 键盘 Enter 激活；
- 地址复制、在新标签打开、收藏和状态栏预览；
- 无 JavaScript 基线；
- 抓取器可提取的 URL；
- 描述目标的链接文字。

下面不是可靠的页面导航：

```html
<!-- 错误：无 href，不是可抓取链接。 -->
<a onclick="openListing('commuter-bike-001')">查看商品</a>

<!-- 错误：span 没有链接语义和默认导航。 -->
<span data-url="/listings/commuter-bike-001">查看商品</span>

<!-- 错误：button 用于执行动作，不用于表达另一个文档 URL。 -->
<button onclick="location.href='/listings/commuter-bike-001'">
  查看商品
</button>
```

客户端路由可以增强 `<a href>` 的导航体验，但不应删除真实 `href`。链接目标还必须能被服务器直接请求；只在已经打开的应用中点击成功，而刷新目标 URL 返回 404，仍不是完整路由。

### 4.5 HTTP 状态是页面事实的一部分

响应正文给人阅读，状态码给客户端、缓存、代理和抓取器表达请求结果。常见选择：

| 状态 | 含义 | 邻里集市场景 |
| --- | --- | --- |
| `200 OK` | 成功返回当前资源 | 存在的公开商品详情 |
| `301 Moved Permanently` | 永久迁移 | 商品永久更换规范 URL |
| `302 Found` / `307 Temporary Redirect` | 临时跳转 | 短期维护或实验入口 |
| `401 Unauthorized` | 尚未完成所需认证 | 登录后才能访问的页面 |
| `403 Forbidden` | 已理解请求但拒绝访问 | 已登录但没有编辑权限 |
| `404 Not Found` | 当前找不到资源 | 不存在的商品 ID |
| `410 Gone` | 资源明确永久移除 | 依法或按明确策略永久删除 |
| `429 Too Many Requests` | 请求过多 | API 或抓取限流 |
| `500` / `502` / `503` | 服务器暂时失败 | 数据库或上游故障、维护 |

#### 错误的 200 未找到页

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<h1>商品不存在</h1>
```

状态说“请求成功”，正文说“资源不存在”。搜索系统可能把它判断为 soft 404，但站点不应依赖外部系统猜错。正确响应应是：

```http
HTTP/1.1 404 Not Found
Content-Type: text/html; charset=utf-8

<h1>没有找到这件商品</h1>
<p><a href="/listings">返回全部商品</a></p>
```

自定义 404 页面可以保留站点导航和恢复入口，但响应状态仍必须是 `404`。

#### canonical 不能修复状态

在 200 错误页上加：

```html
<link rel="canonical" href="https://market.example/listings">
```

不会把它变成 404，也不会替用户跳转。若资源缺失就返回 404；若有明确替代资源且确实永久迁移，才返回 301 到替代 URL。

### 4.6 抓取与索引的差异

**抓取（crawl）**关注“是否请求并取得资源”。
**索引（index）**关注“是否分析、选择代表版本并保存为可检索内容”。

可能出现：

| 现象 | 可能状态 | 下一步证据 |
| --- | --- | --- |
| robots.txt 阻止路径 | URL 可能已知，但内容未抓取 | robots 测试、服务器日志 |
| 已抓取且看到 `noindex` | 内容可读，但不应进入索引 | URL 检查、页面响应 |
| 已抓取但选择另一 canonical | 当前 URL 不是代表版本 | 声明 canonical 与系统选择 |
| 已索引但搜索不到某个词 | 查询相关性或展示选择不同 | URL 检查，不只用普通搜索 |
| sitemap 已提交但未抓取 | sitemap 只是发现信号 | sitemap 状态、日志、可访问性 |
| 结构化数据有效但无富结果 | 资格、政策或展示选择不同 | 特定功能文档、检查工具 |

不要把 `robots.txt Disallow` 写成“不会索引”。不要把 sitemap 写成“提交后收录”。不要把 Rich Results Test 通过写成“富结果已上线”。

### 4.7 客户端渲染、SSR 与预渲染的边界

#### 客户端渲染（CSR）

初始响应可能只有应用外壳：

```html
<main id="app">
  <p>正在加载商品……</p>
</main>
<script type="module" src="/assets/app.js"></script>
```

脚本再请求 API 并创建内容。现代搜索系统可能执行 JavaScript，但风险包括：

- 渲染与初始抓取不是同一时刻完成；
- 脚本、CSS、API 或跨域请求可能失败；
- 其他抓取器、分享工具和审核工具可能不执行 JavaScript；
- 客户端路由容易把所有未知路径先返回 `200`；
- title、description、canonical 和 JSON-LD 可能在异步数据前保持错误模板值；
- 快速变化的价格和状态可能在不同抓取阶段不一致。

CSR 不是“不能 SEO”，但需要真实渲染检查、直接 URL 路由、状态码策略和资源可靠性。不能只在开发者自己的浏览器里点击一次就下结论。

#### 服务端渲染（SSR）

服务器针对每次请求生成含商品正文和元信息的 HTML：

```text
GET /listings/commuter-bike-001
  → 查询商品
  → 存在：200 + 具体 HTML
  → 不存在：404 + 恢复页面
```

优势是首个响应就包含页面事实，状态码可以依据服务端数据决定。代价是：

- 每次请求或缓存刷新需要渲染资源；
- 数据依赖失败要设计 `5xx` 与恢复；
- 缓存必须避免把用户私有内容混给其他人；
- hydration 仍可能产生客户端差异。

SSR 本身不保证排名，也不会自动修复不真实内容。

#### 预渲染 / 静态生成

构建或发布时为已知 URL 生成完整 HTML：

```text
固定 Listing 数据
  → build-listing.mjs
  → public/listings/commuter-bike-001.html
```

它适合本课固定商品：

- 初始 HTML 完整；
- 容易缓存和检查；
- 不依赖浏览器执行脚本才能看到正文；
- 需要在商品变化时重新生成；
- 需要部署层把稳定 URL 映射到文件，并返回正确 404；
- 不适合未经隔离的用户私有页面。

#### 选择表

| 条件 | CSR | SSR | 预渲染 |
| --- | --- | --- | --- |
| 内容高度个性化 | 可用，但不应把私有内容公开索引 | 常用，必须正确缓存和权限 | 通常不适合 |
| 公开商品频繁变化 | 需严密渲染与状态同步 | 常用 | 可增量再生成 |
| 公开商品变化很少 | 可以 | 可以 | 很合适 |
| 每个 URL 需要真实 404 | 需要服务器配合 | 自然处理 | 部署层检查文件/路由 |
| 无 JS 时需要核心正文 | 需要基线或预渲染 | 可以 | 可以 |
| 只追求“某搜索引擎能运行 JS” | 不是充分决策依据 | 不保证展示 | 不保证展示 |

本课采用预渲染，是为了让输入、生成输出和检查证据最容易观察，不是声称所有邻里集市页面都必须静态生成。

## 5. 元素、属性、API 或配置清单

### 5.1 站点与 HTTP 配置

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `/robots.txt` | 管理合规抓取器路径访问 | `User-agent` + `Allow/Disallow` | 不是保密、权限或可靠去索引 |
| `/sitemap.xml` | 提供重要 URL 清单 | `<urlset><url>…` | 不保证抓取或索引 |
| `X-Robots-Tag` | 响应级 robots 指令 | `X-Robots-Tag: noindex` | 由服务器发送，适合非 HTML |
| `200` | 当前资源成功 | 商品存在 | 错误正文不要返回 200 |
| `301` | 永久迁移 | 旧 slug 到新 URL | 不是临时实验跳转 |
| `404` / `410` | 缺失 / 明确永久移除 | 商品不存在 | 正文仍可提供恢复链接 |
| `5xx` | 服务器失败 | 数据依赖故障 | 不要伪装成空列表或 404 |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/09-crawling-indexing-http-rendering/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 SEO-003（robots meta 与 robots.txt 边界） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 SEO-004（sitemap、有效链接与 HTTP 状态） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 为 SEO-005（抓取与索引差异） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
5. 为 SEO-007（客户端渲染、SSR 和预渲染边界） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
6. 在打开页面前写下预期 DOM、默认行为或请求结果；
7. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
8. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [结构化数据与可见内容：从同一事实生成机器标注](10-structured-data-visible-content.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 SEO-003（robots meta 与 robots.txt 边界） 对应的元素、属性或状态；
- 在项目中实现并标出与 SEO-004（sitemap、有效链接与 HTTP 状态） 对应的元素、属性或状态；
- 在项目中实现并标出与 SEO-005（抓取与索引差异） 对应的元素、属性或状态；
- 在项目中实现并标出与 SEO-007（客户端渲染、SSR 和预渲染边界） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`10-structured-data-visible-content.md`](10-structured-data-visible-content.md)。

## 8. 常见错误与排查路径

### 8.1 不存在商品返回 `200`

**错误响应：**

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8

<!doctype html>
<title>商品不存在｜邻里集市</title>
<h1>商品不存在</h1>
```

**现象：**

- 用户看到错误页；
- Network 和 `curl` 却显示成功；
- SPA 的所有未知路径都返回同一个 app shell；
- 搜索检查可能报告 soft 404。

**证据：**

```bash
curl -sS -D - \
  http://localhost:4173/listings/not-exist \
  -o /tmp/not-exist.html
```

重点看第一行，而不是只搜索正文：

```text
HTTP/1.1 200 OK
```

**原因：**

- 静态托管把任意路径回退到 `index.html`；
- 服务端查不到商品后仍使用默认 200；
- 客户端路由加载后才把正文改成“未找到”；
- 异常被吞掉并误当空数据。

**修复：**

```text
存在商品 → 200 + 商品正文
不存在商品 → 404 + 可用错误页
明确永久迁移 → 301 + Location
依赖暂时失败 → 5xx，不伪装成不存在
```

**复验：**

```bash
curl -sS -o /dev/null -w "%{http_code}\n" \
  http://localhost:4173/listings/not-exist
```

预期 `404`。还要在浏览器确认 404 正文有返回列表的真实链接。

### 8.2 `robots.txt` 挡住页面，同时期待 `noindex`

**错误组合：**

```text
User-agent: *
Disallow: /preview/
```

```html
<meta name="robots" content="noindex">
```

**现象：**

- 页面源码确实有 `noindex`；
- 合规抓取器却报告被 robots.txt 阻止；
- 团队误以为“双保险”更安全。

**原因：**

混淆抓取控制、索引指令和访问权限。

**修复：**

- 公开但不希望索引：允许抓取并返回 `noindex`；
- 私密：服务器认证和授权，必要时同时 noindex，但不依赖它；
- 不重要重复路径：先修 URL 与链接，再审慎管理抓取。

**复验：**

- 请求 `/robots.txt`；
- 请求页面并确认能取得 robots meta 或 `X-Robots-Tag`；
- 生产环境再用目标搜索系统的 URL 检查工具核对。

### 8.3 sitemap 混入 noindex、404 和重复 URL

**错误：**

```xml
<url>
  <loc>https://market.example/preview/draft-1</loc>
</url>
<url>
  <loc>https://market.example/listings/missing</loc>
</url>
<url>
  <loc>https://market.example/listings/commuter-bike-001?utm_source=x</loc>
</url>
```

**现象：**

- sitemap 能解析；
- URL 检查却显示 noindex、404 或 alternate canonical；
- 站点持续提交不想索引的 URL。

**原因：**

生成器只遍历数据库记录或路由，没有过滤发布状态、HTTP 可用性和首选 URL。

**修复：**

建立明确过滤：

```text
公开 + 已发布 + 希望索引 + 当前返回 200 + canonical 本身
```

**复验：**

- XML 语法通过；
- 抽样请求每个 URL；
- canonical 与 `<loc>` 一致；
- 不含 noindex 和重定向 URL；
- lastmod 对应真实内容修改。

### 8.4 只有点击脚本，没有 `href`

**错误：**

```html
<div class="listing" onclick="openListing('commuter-bike-001')">
  八成新通勤自行车
</div>
```

**现象：**

- 鼠标点击在脚本正常时可用；
- Tab 找不到入口；
- 复制链接和新标签打开不可用；
- View Source 或渲染 DOM 中没有可提取目标 URL。

**修复：**

```html
<article>
  <h2>
    <a href="/listings/commuter-bike-001">
      八成新通勤自行车
    </a>
  </h2>
</article>
```

客户端路由监听可以保留，但必须建立在真实链接上。

### 8.5 客户端渲染在开发机正常，抓取结果为空

**现象：**

- 开发者浏览器看到完整商品；
- View Source 只有 `<div id="app"></div>`；
- 禁用 JavaScript 后为空；
- Network 中 API 401、CORS、5xx 或超时；
- 渲染检查没有商品正文。

**排查：**

1. 直接请求深层 URL，确认不是只从首页点击才可用；
2. 看 Document 状态；
3. 看初始源码是否有核心内容；
4. 禁用 JavaScript；
5. 检查脚本和 API 响应；
6. 检查 robots.txt 是否阻止关键资源；
7. 检查渲染后 title、canonical 和 JSON-LD；
8. 用目标搜索系统的 URL 检查工具观察其渲染结果。

**修复选择：**

- 公开关键内容使用 SSR 或预渲染；
- 保留 CSR，但修复直接路由、资源和渲染检查；
- 错误 URL 由服务器返回真实 404；
- 不把“某个抓取器能执行 JavaScript”写成所有工具保证。

### 8.6 用 `file://` 推断 HTTP 和抓取行为

本地双击只能检查：

- HTML 是否被浏览器解析；
- DOM 和脚本是否工作；
- title、meta 和 JSON-LD 是否存在。

它不能检查：

- HTTP 状态；
- 响应头；
- 重定向；
- robots.txt 根路径；
- sitemap 对应主机；
- 生产路由和缓存；
- 搜索系统实际抓取、索引和展示。

需要 HTTP 证据时使用本地服务器；需要目标搜索系统证据时在有权管理的测试/生产站点使用其官方工具。

### 8.7 诊断与恢复记录

每次故障按固定顺序记录：

```text
现象：
目标 URL：
发现入口（链接/sitemap/外部）：
Document HTTP 状态：
响应头：
初始 HTML 的 title/description/canonical/robots：
渲染后 DOM 的对应值：
JavaScript 与 API 失败：
可见正文：
结构化数据解析结果：
结构化数据与正文差异：
声明 canonical 与首选 URL 差异：
根因：
最小修复：
复验命令：
复验结果：
未验证搜索引擎/浏览器：
```

#### 示例恢复记录

```text
现象：不存在商品显示“未找到”，但检查报告 soft 404
目标 URL：http://localhost:4173/listings/missing
发现入口：旧 sitemap
Document HTTP 状态：200
响应头：Content-Type: text/html
初始 HTML：通用 app shell
渲染后 DOM：h1 为“商品不存在”
根因：静态托管把所有路径回退到 index.html
最小修复：部署路由在商品不存在时返回 404；从 sitemap 删除 URL
复验命令：curl -sS -o /dev/null -w "%{http_code}\n" URL
复验结果：404；页面保留返回商品列表链接
未验证：生产 CDN、Google URL Inspection、Bing Webmaster Tools
```

## 9. 课后题

### 9.1 理解题

1. 为什么 `<title>` 和 `<h1>` 应主题一致，却不必逐字相同？
2. meta description 是否一定原样出现在搜索结果？
3. canonical 为什么不能代替 301？
4. 为什么 `robots.txt Disallow` 不能可靠代替 `noindex`？
5. sitemap 已成功提交，是否表示 URL 已被索引？
6. 一个页面返回 200 且正文写“商品不存在”，问题是什么？
7. 为什么 `<button onclick="location.href='…'">` 不如 `<a href="…">` 适合商品详情入口？
8. Google 能运行 JavaScript，是否意味着所有客户端渲染页都无需 SSR 或预渲染？
9. Microdata 和 JSON-LD 的共同数据模型是什么？
10. 为什么推荐字段缺失时不能编造评分来消除测试警告？
11. 结构化数据通过 Rich Results Test 是否保证富结果？
12. `priceCents: 28000` 应在哪个边界变成 `"280.00"`？

### 9.2 参考答案

<details>
<summary>1. title 与 h1</summary>

title 需要在标签、历史、书签和结果候选等脱离页面上下文的场景识别文档，可以包含站点名、价格或限定信息；h1 位于页面上下文中，可以更聚焦。两者必须描述同一个页面主题，避免标题与正文冲突。

</details>

<details>
<summary>2. description 是否固定展示</summary>

不一定。它是摘要候选。搜索系统可以根据具体查询从正文选择其他片段，也可能截断。应优化准确性和可读性，不围绕固定展示长度作保证。

</details>

<details>
<summary>3. canonical 与 301</summary>

canonical 是代表版本信号，不会改变浏览器地址和 HTTP 导航。资源永久迁移时，301 同时把用户和客户端送到新地址，并提供更直接的迁移语义。

</details>

<details>
<summary>4. robots.txt 与 noindex</summary>

robots.txt 主要控制合规抓取器能否请求路径。被阻止后，抓取器可能看不到页面内 noindex；URL 仍可能从外部链接被发现。希望公开访问但不索引时允许抓取并返回 noindex；私密内容使用服务器权限。

</details>

<details>
<summary>5. sitemap 与索引</summary>

不表示。sitemap 帮助发现 URL 并提供站点信号，搜索系统仍会决定是否抓取、选择哪个 canonical、是否索引和如何展示。

</details>

<details>
<summary>6. 200 未找到</summary>

状态与正文冲突，属于 soft 404 风险。不存在资源应由服务器返回 404 或明确的 410；如果永久迁移且有真正替代，返回 301。

</details>

<details>
<summary>7. a 与 button</summary>

`<a href>` 原生表达文档 URL，支持键盘导航、复制地址、新标签打开、无 JS 基线和 URL 提取。button 适合执行当前页面动作，不应替代文档导航。

</details>

<details>
<summary>8. JavaScript 渲染边界</summary>

不能这样推导。渲染可能延迟，资源和 API 可能失败，其他工具未必执行 JavaScript，状态码也不能由客户端可靠改变。应根据公开内容、变化频率、状态码、性能和维护选择 CSR、SSR 或预渲染，并用真实渲染结果验证。

</details>

<details>
<summary>9. Microdata 与 JSON-LD</summary>

二者都可表达类型、属性、值和嵌套 item。本课使用 Schema.org Product/Offer 词汇；差别主要在编码位置和维护方式。

</details>

<details>
<summary>10. 推荐字段与假评分</summary>

推荐字段仍必须真实、相关、可见并可维护。当前项目没有合法评论和评分来源，虚构评分会误导用户，还可能违反结构化数据政策。正确答案是保留缺失并说明边界。

</details>

<details>
<summary>11. 测试通过与富结果</summary>

不保证。语法和部分技术资格通过后，仍有抓取、索引、canonical、内容政策、页面质量、查询和展示选择等条件。搜索系统明确保留是否展示富结果的决定。

</details>

<details>
<summary>12. 整数分转换边界</summary>

Listing 和业务逻辑始终保存 `28000` 分。生成可见价格和 Schema Offer price 时才格式化为 `"280.00"`，并显式提供 `CNY`。

</details>

<details>
<summary>情景 A</summary>

若两个 URL 的正文确实相同，指向无追踪参数 URL 的 canonical 合理。还应让站内链接、sitemap、JSON-LD url、分享链接和必要的重定向策略都偏向首选 URL，避免产生冲突信号。

</details>

<details>
<summary>情景 B</summary>

公开预览：允许抓取并返回 `noindex`，不列入 sitemap。私密预览：使用服务器认证与授权拒绝未授权访问，可额外 noindex，但不把它当权限。阻止抓取会让合规抓取器无法读取页面 noindex，不是可靠“双保险”。

</details>

<details>
<summary>情景 C</summary>

从权威 Listing 状态出发，同一次发布更新可见正文、JSON-LD availability、真实 lastmod 和缓存版本/失效。不能只手工改正文。还要确认 reserved 在业务中确实表示 Offer 当前不可用。

</details>

<details>
<summary>情景 D</summary>

不够。canonical 不会修复 200 状态，也不是错误处理。服务器或部署层应让不存在商品返回 404；SPA 至少要有能产生真实错误响应的路由策略，并从 sitemap 和内链清除不存在 URL。

</details>

## 10. 实践练习

### 10.1 故障演练：制造并修复 soft 404

**文件位置：**

```text
market-learning/practice/html-chapter-07/seo/soft-404-report.md
```

**任务：**

1. 在可控制的本地服务器中让未知商品返回 `200` 和“商品不存在”；
2. 用 `curl -D -` 保存状态证据；
3. 说明为什么只看页面文字会误判；
4. 修改服务端路由返回 `404`；
5. 保留可用的返回列表链接；
6. 从 sitemap 删除未知 URL；
7. 再次用 curl 复验。

**预期：**

```text
修复前：200 + 未找到正文
修复后：404 + 未找到正文 + 恢复链接
```

**失败观察点：**

- 只改页面 title 为 404，状态仍 200；
- 只加 `noindex`，状态仍不真实；
- 只加 canonical 到列表页，状态仍不真实；
- API 返回 404，但 Document 仍返回 200 app shell。

### 10.2 故障演练：阻止抓取后看不到 noindex

**文件位置：**

```text
market-learning/practice/html-chapter-07/seo/robots-boundary.md
```

**任务：**

- 写出错误组合：robots.txt Disallow + 页面 noindex；
- 画出合规抓取器的请求决策；
- 分别给出“公开但不索引”和“私密且不公开”的修复方案；
- 说明为什么 noindex 不是权限；
- 记录目标搜索引擎的官方依据链接。

**完成标准：**

答案必须区分抓取、索引和访问控制，不能只说“删掉其中一个”。

### 10.3 综合：客户端渲染与预渲染对照

**文件位置：**

```text
market-learning/practice/html-chapter-07/seo/rendering-comparison.md
```

**任务：**

对同一商品记录：

| 证据 | CSR 页面 | 预渲染页面 |
| --- | --- | --- |
| Document 状态 |  |  |
| View Source 的 h1 |  |  |
| 禁用 JS 的正文 |  |  |
| 渲染后 title |  |  |
| canonical |  |  |
| JSON-LD |  |  |
| API 失败时页面 |  |  |
| 不存在 URL 的状态 |  |  |

**完成标准：**

- 不以“CSR 一定不行”或“SSR 一定排名更高”收尾；
- 根据证据说明当前公开商品为何选择预渲染或 SSR；
- 指出客户端收藏状态不应进入公共 Product 数据；
- 记录未测试的搜索工具。

## 11. 阶段验收

### 11.1 SEO-003：robots 边界

- [ ] 教学页含 `noindex`；
- [ ] 教学页不在 sitemap；
- [ ] robots.txt 没有挡住需要读取 noindex 的合规抓取器；
- [ ] 能区分 robots meta、`X-Robots-Tag` 和 robots.txt；
- [ ] 不使用 robots.txt 做 canonical；
- [ ] 不把 noindex 或 robots.txt 当访问控制；
- [ ] 私密内容方案包含服务器认证和授权。

### 11.2 SEO-004：sitemap、链接与 HTTP 状态

- [ ] sitemap XML 可解析；
- [ ] sitemap 只列公开、首选、希望索引的成功 URL；
- [ ] `lastmod` 表示真实内容修改时间；
- [ ] 每个重要商品至少有一个 `<a href>` 入口；
- [ ] 链接文字能描述目标；
- [ ] 直接请求深层 URL 成功；
- [ ] 存在商品返回 200；
- [ ] 不存在商品返回 404/明确的 410；
- [ ] 迁移和临时故障使用对应状态；
- [ ] 没有 200 错误正文。

### 11.3 SEO-005：抓取与索引

- [ ] 能画出发现、抓取、渲染、索引、展示流程；
- [ ] 能解释“已发现但未抓取”；
- [ ] 能解释“已抓取但 noindex”；
- [ ] 能解释“已抓取但选择另一 canonical”；
- [ ] 不把 sitemap 提交当索引完成；
- [ ] 不把普通搜索结果当唯一索引证据；
- [ ] 验收记录区分站点输入和搜索系统选择。

### 11.4 SEO-007：客户端渲染、SSR 与预渲染

- [ ] 已比较 View Source 和渲染后 DOM；
- [ ] 已执行禁用 JavaScript 检查；
- [ ] 已检查脚本与 API 失败状态；
- [ ] 已验证深层 URL 可直接请求；
- [ ] 错误 URL 的 HTTP 状态由服务器/部署层负责；
- [ ] 公开关键内容的渲染选择有证据；
- [ ] 没有声称 Google 可运行 JS 就代表所有抓取器都可靠；
- [ ] 没有声称 SSR 或预渲染自动提高排名。

### 11.5 文件、运行、预期与失败证据

- [ ] 记录所有练习文件路径；
- [ ] 记录 Node 语法检查命令；
- [ ] 记录生成命令和输出；
- [ ] 记录本地服务器命令和停止方式；
- [ ] 记录正常页面预期；
- [ ] 保存一次 JSON 解析通过结果；
- [ ] 保存一次无效 JSON 失败结果；
- [ ] 保存一次 200 soft 404 故障；
- [ ] 保存修复后的 404 状态；
- [ ] 保存一次 canonical 冲突诊断；
- [ ] 记录 View Source、Elements 和 Network 的差异；
- [ ] 记录未验证搜索引擎、部署和浏览器。

### 11.6 最终发布判断

只有以下结论全部有证据时，才可标记本课完成：

```text
结构正确：是
JSON 可解析：是
正文与机器数据一致：是
HTTP 状态真实：是
重要 URL 可由链接发现：是
noindex 与抓取边界清楚：是
CSR/SSR/预渲染选择可解释：是
虚构事实：无
排名保证：无
索引保证：无
富结果保证：无
```

## 12. 常见问题

### Q6：`index, follow` 必须写吗？

对支持这些 token 的常见搜索系统，它们通常是默认行为。本课显式写出只为观察。生产中可以省略冗余默认值，但必须确保模板不会继承错误 noindex。

### Q7：`nofollow` 能保证链接目标不被发现吗？

不能。目标还可能通过其他链接、sitemap 或外部来源被发现。`nofollow` 是特定关系/抓取处理信号，不是权限或秘密 URL 机制。付费和用户生成链接还应查目标搜索系统对 `sponsored`、`ugc` 的说明。

### Q8：robots.txt 能保护后台吗？

不能。它是公开文本，会暴露路径，并依赖抓取器自愿遵守。后台必须使用身份认证、授权、网络策略和服务器拒绝访问。不要在 robots.txt 中泄露本不应公开的敏感路径设计。

### Q9：为什么 sitemap 不能替代内部链接？

sitemap 主要面向机器发现，普通链接同时服务人、键盘导航、浏览器默认行为和页面关系。一个只有 sitemap、站内无入口的页面可能仍被发现，但信息架构和用户路径仍不完整。

### Q10：`lastmod` 每次部署都写当前时间不是更“新”吗？

不是。它应反映该 URL 主要内容的真实最后修改。无内容变化却不断刷新时间会降低信号可信度，也浪费抓取资源。构建脚本版本变化只有确实改变页面内容时才更新对应 URL 的 lastmod。

### Q11：404 页面可以有导航和搜索框吗？

可以，而且应帮助用户恢复。但 Document 状态仍必须是 404。不要因为页面设计完整就返回 200，也不要把所有缺失 URL 301 到首页。

### Q12：商品售出后应该 404、保留 200 还是重定向？

取决于真实产品策略：

- 页面仍有历史价值且用户需要确认“已售出”：可保留 200，正文和结构化数据更新为不可用；
- 内容彻底移除且无替代：404 或明确的 410；
- 商品确实迁移到等价新 URL：301；
- 不能为了“保留 SEO”让已删除商品继续显示虚假在售状态。

### Q20：为什么查看 Elements 还要看 View Source？

Elements 是当前 DOM，可能已被脚本修改；View Source 是初始响应 HTML。比较二者可以判断元信息和正文是服务器已交付，还是依赖客户端脚本后补，也能发现脚本重复插入 canonical 或 robots。

## 13. 扩展阅读

### HTML、HTTP 与协议

- [WHATWG HTML：文档元数据](https://html.spec.whatwg.org/multipage/semantics.html#document-metadata)：核对 `head`、`title`、`link` 和 `meta` 的内容模型与 DOM 接口。
- [WHATWG HTML：`title`](https://html.spec.whatwg.org/multipage/semantics.html#the-title-element)：核对一个文档最多一个 title，以及脱离上下文仍应识别文档的要求。
- [WHATWG HTML：链接类型 canonical](https://html.spec.whatwg.org/multipage/links.html#link-type-canonical)：核对 HTML 中 canonical 关系的标准定义。
- [WHATWG HTML：Microdata](https://html.spec.whatwg.org/multipage/microdata.html)：核对 item、property、`itemscope`、`itemtype`、`itemid`、`itemprop` 和值提取模型。
- [WHATWG HTML：`a` 元素](https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element)：核对有 `href` 时的超链接语义和 DOM 行为。
- [RFC 9110：HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)：核对成功、重定向、客户端错误和服务器错误状态语义。
- [RFC 9309：Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309)：核对 robots.txt 协议语法与抓取规则边界。
- [Sitemaps Protocol](https://www.sitemaps.org/protocol.html)：核对 XML 命名空间、`loc`、`lastmod` 和 sitemap index 格式。

### Google Search Central

- [Google 搜索的工作原理](https://developers.google.com/search/docs/fundamentals/how-search-works)：核对抓取、索引和结果提供三个阶段，以及不保证抓取、索引或展示。
- [标题链接最佳实践](https://developers.google.com/search/docs/appearance/title-link)：核对具体 title、正文主标题一致性、标题来源与可能重写。
- [搜索摘要与 meta description](https://developers.google.com/search/docs/appearance/snippet)：核对摘要主要来自页面内容，description 只是可能采用的来源。
- [指定 canonical URL](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)：核对重定向、canonical、sitemap 信号强度及 canonical 误区。
- [robots meta 与 X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)：核对页面/响应级索引和展示指令，以及抓取器必须能访问页面。
- [robots.txt 简介](https://developers.google.com/search/docs/crawling-indexing/robots/intro)：核对 robots.txt 主要管理抓取，不是可靠去索引或保密机制。
- [Sitemap 概览](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)：核对 sitemap 帮助发现但不保证抓取或索引。
- [可抓取链接最佳实践](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)：核对 `<a href>`、可解析 URL 和描述性链接文字。
- [HTTP 状态、网络与 DNS 错误](https://developers.google.com/search/docs/crawling-indexing/http-network-errors)：核对 2xx、3xx、4xx、5xx 和 soft 404 的处理差异。
- [JavaScript SEO 基础](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)：核对抓取、渲染、索引队列，状态码、客户端路由和 SSR/预渲染边界。
- [结构化数据通用指南](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)：核对可见内容、相关性、真实性、访问和“不保证富结果”。
- [Product snippet 结构化数据](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)：核对 Product、Offer、价格、币种、评论及特定功能要求；不要把推荐字段变成造假理由。
- [Rich Results Test](https://search.google.com/test/rich-results)：检查受支持搜索功能的语法和部分资格；通过不保证展示。
- [URL Inspection Tool 说明](https://support.google.com/webmasters/answer/9012289)：部署后查看 Google 取得和渲染的页面；需要有权访问对应 Search Console 资源。

## 我现在能做到什么

- 能解释并验证：区分发现、抓取与索引，结合 robots、sitemap、链接、HTTP 状态和渲染策略交付事实。
- `SEO-003`：robots meta 与 robots.txt 边界
- `SEO-004`：sitemap、有效链接与 HTTP 状态
- `SEO-005`：抓取与索引差异
- `SEO-007`：客户端渲染、SSR 和预渲染边界
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：页面元信息与 Canonical：让摘要和首选 URL 一致](08-page-metadata-canonical-urls.md) · [下一课：结构化数据与可见内容：从同一事实生成机器标注](10-structured-data-visible-content.md) · [返回 HTML 模块](../README.md)
