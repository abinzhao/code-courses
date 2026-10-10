# 元信息、SEO 与结构化数据：让真实页面可发现、可核对

> 所属章节：无障碍、SEO 与质量
>
> 建议学习时间：4–6 小时
>
> 阶段成果：完成一个元信息、HTTP 状态、可抓取链接和结构化数据彼此一致的邻里集市静态商品页

## 任务卡

邻里集市已经有可阅读、可操作的商品页面，但搜索工具看到的入口不一定与浏览器用户看到的结果一致：

- 浏览器标签只显示“商品详情”，无法区分具体商品；
- description 宣称“全新包邮”，正文却是一辆八成新的自提自行车；
- 带追踪参数的多个 URL 展示同一商品，却没有一致的首选 URL；
- 教学预览页本应避免进入搜索索引，却把 `robots.txt` 当成保密工具；
- 商品不存在时，页面显示“未找到”但服务器仍返回 `200 OK`；
- 列表项只能通过 `div` 的点击事件进入，抓取器找不到稳定的商品 URL；
- 商品正文依赖客户端请求成功后才出现，初始 HTML 只有空壳；
- JSON-LD 写了五星评价、低价和“有货”，正文与真实数据却没有这些事实。

本课不研究“关键词技巧”，而是建立一条可以检查的事实链：

```text
稳定 URL
  → 可抓取链接与 sitemap 发现 URL
  → 服务器返回有意义的 HTTP 状态和 HTML
  → title、description、canonical、robots 表达页面意图
  → 可见正文提供真实事实
  → Microdata 或 JSON-LD 描述同一批事实
  → 搜索系统自行决定是否抓取、索引和展示
```

**完成本课后，你将交付：**

- 一个包含具体 title、description、canonical 和 robots 指令的最小教学页；
- 一份解释 `robots` meta、`X-Robots-Tag` 与 `robots.txt` 职责差异的记录；
- 一份只包含首选、可索引、成功 URL 的 XML sitemap 示例；
- 一组使用真实 `<a href>` 的商品导航链接；
- 一份 `200` 错误页与真实 `404` 的请求证据对照；
- 一个从整数分和 UTC ISO 8601 时间生成的静态邻里集市商品页；
- 一段可通过 `JSON.parse()` 的 JSON-LD，并与可见标题、价格和状态逐项相同；
- 一段表达同一商品的 Microdata 对照代码；
- 一份客户端渲染、SSR 与预渲染的选择边界；
- 一份明确拒绝虚构评论、评分、价格和库存的发布检查。

本课的商品是固定教学数据，不连接真实账号、数据库、支付、库存、预约或评论系统。示例域名使用保留的 `example` 域；结构化数据语法正确不代表页面一定被抓取、索引、排名或显示为富结果。

### 可观察完成标准

完成不能只看“HTML 能打开”。至少要取得以下证据：

1. 浏览器标签、`document.title` 和页面主标题都能识别具体商品；
2. description 准确概括正文，没有正文不存在的促销、物流或认证；
3. canonical 是当前商品的公开首选绝对 URL，不指向其他商品；
4. 教学预览页包含 `noindex`，并且没有在 `robots.txt` 中阻止合规抓取器读取该指令；
5. sitemap 不包含教学预览、404、重定向或参数重复 URL；
6. 重要商品能从普通 `<a href>` 到达；
7. 存在的商品返回 `200`，永久迁移返回 `301`，不存在商品返回 `404` 或明确选择的 `410`；
8. 能解释“已抓取但未索引”和“已索引但没有出现在某次查询”并不矛盾；
9. 禁用 JavaScript 后，预渲染商品页仍有商品标题、说明、价格、状态和 UTC 时间；
10. JSON-LD 可被 JSON 解析器读取；
11. JSON-LD 中的名称、说明、URL、价格、币种、成色和可用状态都能在正文或同一真实业务数据中找到；
12. 页面没有为了测试通过而伪造 `Review`、`AggregateRating`、折扣、库存数量或身份；
13. 验收结论没有承诺排名、抓取、索引或富结果。

## 1. 任务背景

### 1.1 SEO 首先是交付一致性问题

SEO 经常被误写成“在 `<head>` 放几个标签”。实际页面至少经过四层：

| 层 | 负责的问题 | 邻里集市示例 |
| --- | --- | --- |
| URL 与链接 | 机器能否发现一个稳定地址 | `/listings/commuter-bike-001` |
| HTTP 交付 | 请求成功、迁移、缺失还是暂时失败 | `200`、`301`、`404`、`503` |
| HTML 与渲染 | 初始或渲染后是否有可理解内容 | 商品标题、价格、状态、说明 |
| 元信息与结构化数据 | 页面如何概括自己并标注事实 | title、canonical、Product/Offer |

任意一层说谎都会破坏后续判断：

- 正文真实，但所有入口都只是无 `href` 的点击脚本，URL 难以发现；
- 页面不存在，却返回 `200`，客户端和抓取系统难以区分成功与错误；
- canonical 指向另一件商品，首选信号与正文冲突；
- JSON-LD 写“280.00 CNY 且有货”，正文却显示“已售出，300 元”；
- HTML 初始空白，脚本资源又被阻止或执行失败，实际内容无法形成。

因此，本课把 SEO 质量定义为：**让每个公开 URL 以诚实状态交付可理解内容，并让元信息与机器标注支持同一事实。**

### 1.2 页面质量、抓取、索引和排名不是同义词

页面可以同时处于这些状态：

- URL 已通过链接或 sitemap 被发现；
- 抓取器还没有请求它；
- 已请求并取得 `200`；
- 已渲染，但资源失败导致正文不完整；
- 已理解内容，但根据 `noindex` 不进入索引；
- 已进入索引，但不是某次查询的合适结果；
- 出现在普通结果中，但没有富结果；
- 结构化数据通过语法测试，但不满足某个搜索功能的内容政策。

“我能在浏览器打开”只证明当前浏览器取得了某个响应；“搜索 `site:` 能看到”也不是完整的抓取、索引或展示诊断。每一层都要使用对应证据。

### 1.3 邻里集市的本课范围

本课选择一件固定商品：

```js
const listing = {
  id: "commuter-bike-001",
  title: "八成新通勤自行车",
  description: "车架稳固，刹车已保养，限同城自提，可预约验车。",
  priceCents: 28000,
  status: "available",
  ownerId: "user-demo-wang",
  version: 1,
  createdAt: "2026-10-10T08:30:00.000Z"
};
```

这些字段遵循[邻里集市项目契约](../../00-guide/05-project-assessment.md)：

- 金额在业务数据中保存为整数分，`28000` 只在输出边界格式化为 `280.00`；
- `createdAt` 保存为 UTC ISO 8601 字符串；
- `available` 是教学商品状态，不是浏览器自行确认的真实库存；
- `ownerId` 不进入公开结构化数据；
- 当前静态页没有账号、授权、支付、评论、持久化或并发预约。

## 2. 学习目标

完成本课后，你应能：

- 解释 URL 发现、抓取、渲染、索引和结果展示的先后关系；
- 为每个页面编写具体、简洁且与正文一致的 `<title>`；
- 编写准确的 meta description，并解释它只是摘要候选而不是固定搜索摘要；
- 使用 `rel="canonical"` 表达重复或高度相似页面的首选 URL；
- 解释 canonical 不是跳转、权限、删除、`noindex` 或强制选择；
- 区分页面级 robots meta、响应级 `X-Robots-Tag` 和站点根目录 `robots.txt`；
- 解释为什么需要读取 `noindex` 的抓取器不应同时被 `robots.txt` 挡住；
- 编写只列出首选公开 URL、使用真实修改时间的 sitemap；
- 使用带 `href` 的 `<a>` 建立可抓取、可键盘操作、可复制的导航；
- 根据资源状态选择 `200`、`301`、`302`、`401`、`403`、`404`、`410`、`429` 或 `5xx`；
- 识别“错误正文 + 200”形成的 soft 404 风险；
- 比较客户端渲染、SSR 和预渲染在初始内容、状态码、缓存和个性化方面的边界；
- 说明 Microdata 的 `itemscope`、`itemtype`、`itemprop`、`itemid` 和嵌套模型；
- 说明 JSON-LD 的 `@context`、`@type`、`@id` 和嵌套对象；
- 从同一份整数分和状态数据生成正文与 JSON-LD；
- 使用 JSON 解析、HTML 检查、Network、View Source、禁用 JavaScript 和 `curl` 形成诊断链；
- 拒绝虚构评价、评分、价格、库存、成色、卖家身份或交易事实；
- 清楚陈述：正确实现只建立可发现和可理解的技术基础，不保证抓取、索引、排名或富结果。

## 3. 预备知识

开始前建议完成：

- [head、元数据与资源加载](../01-document-text/02-head-metadata-resources.md)；
- [URL、链接与导航](../02-structure-links-lists/02-urls-links-navigation.md)；
- [动态状态、焦点与媒体替代](02-dynamic-status-focus-media.md)。

你需要知道：

- `<head>` 保存文档元数据，`<body>` 保存用户可感知内容；
- 相对 URL 以文档基准 URL 解析；
- `<a href>` 与 button 的默认行为不同；
- HTTP 响应由状态行、响应头和响应体共同组成；
- JSON 不允许注释、尾随逗号、单引号或未转义换行；
- JavaScript 数值计算不应改变邻里集市的整数分业务存储；
- 浏览器 Elements 面板展示当前 DOM，View Source 展示最初收到的 HTML 源码，两者可能不同。

### 工具与运行条件

| 工具 | 本课用途 | 必需性 |
| --- | --- | --- |
| 现代 Chromium 浏览器 | 查看标签、Elements、Network、禁用 JavaScript | 必需 |
| Node.js 24 LTS | 运行静态生成脚本和语法检查 | 项目案例必需 |
| `curl` | 查看真实状态行、响应头和重定向 | HTTP 练习必需 |
| Python 3 静态服务器 | 本地观察 HTTP 请求，不负责生产语义 | 二选一 |
| Nu HTML Checker | 检查完整 HTML 语法与内容模型 | 推荐 |
| Rich Results Test / URL Inspection | 部署后检查特定搜索系统看到的内容 | 扩展；本地文件不适用 |

本课不要求安装框架、SEO 插件、抓取器模拟器或第三方结构化数据包。Node 脚本只读取固定教学对象并写出静态 HTML。

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

### 4.2 `<title>`：可以脱离页面上下文识别文档

最小写法位于 `<head>`，一个文档最多一个：

```html
<title>八成新通勤自行车，280.00 元｜邻里集市</title>
```

`<title>` 的直接用户价值包括：

- 浏览器标签和窗口标题；
- 历史记录；
- 书签默认名称；
- 辅助技术识别页面；
- 搜索结果标题的候选来源之一。

它不等同于页面 `<h1>`：

```html
<title>八成新通勤自行车，280.00 元｜邻里集市</title>
...
<h1>八成新通勤自行车</h1>
```

`<h1>` 位于站点和页面的可见上下文中，可以更短；`<title>` 脱离页面后仍应说明具体对象和站点。两者主题应一致，但不要求逐字相同。

搜索系统可能结合主标题、显著文字、链接文字和其他信号生成结果标题，所以 `<title>` 是重要输入，不是锁定输出的指令。不要围绕一个猜测的固定字符数机械截断。更可靠的检查是：

- 是否具体描述当前页面；
- 是否与正文语言一致；
- 是否在同类页面中可区分；
- 是否没有重复堆叠同义关键词；
- 是否没有过期年份、错误价格或不存在的功能。

**错误案例：**

```html
<title>自行车 自行车出售 便宜自行车 二手自行车 同城自行车</title>
```

问题不只是“难看”。它无法自然概括当前商品，也可能与正文信息不匹配。修复应回到用户任务：

```html
<title>八成新通勤自行车，280.00 元｜邻里集市</title>
```

### 4.3 meta description：准确摘要，不是隐藏广告位

最小写法：

```html
<meta
  name="description"
  content="八成新通勤自行车，车架稳固，刹车已保养，价格 280.00 元，限同城自提，可预约验车。"
>
```

description 通常不直接显示在正文中。搜索系统可以把它作为结果摘要候选，也可以根据查询从正文生成更相关的摘要。因此：

- 每个重要页面应尽量有具体描述；
- 描述应总结页面主要内容；
- 数据库驱动页面可以从真实字段程序化生成；
- 不要堆关键词；
- 不要承诺正文没有的折扣、包邮、库存、认证或评价；
- 不要把“某个测试工具显示此描述”理解为所有查询都会原样展示。

下面的描述与本课正文冲突：

```html
<!-- 错误：商品不是全新，也没有包邮或销量事实。 -->
<meta
  name="description"
  content="全新品牌自行车，今日五折包邮，已售 1000 辆，五星好评。"
>
```

诊断时不要只看 Elements。先查看页面源代码和当前 DOM 中是否各有一个 description，再把每个事实与正文和业务数据逐项对照。

### 4.4 canonical：重复内容的首选信号

canonical link 写在有效 `<head>` 中：

```html
<link
  rel="canonical"
  href="https://market.example/listings/commuter-bike-001"
>
```

它表达的是：如果多个 URL 的内容重复或高度相似，发布者希望这个 URL 被视为代表版本。常见场景包括：

```text
https://market.example/listings/commuter-bike-001
https://market.example/listings/commuter-bike-001?source=poster
https://market.example/listings/commuter-bike-001?utm_campaign=autumn
```

这些 URL 如果展示同一商品，可以统一指向不带追踪参数的首选 URL。

#### canonical 不做什么

| 误解 | 实际边界 | 正确机制 |
| --- | --- | --- |
| canonical 会让浏览器跳转 | 用户地址栏不因此改变 | URL 已迁移时使用服务端重定向 |
| canonical 会阻止页面被访问 | 它没有权限能力 | 登录、授权和服务器访问控制 |
| canonical 等同 `noindex` | 它表达首选版本，不是排除索引 | 不应索引的页面使用 `noindex` |
| canonical 可以合并任意页面 | 应用于重复或高度相似内容 | 不同商品保持各自 URL |
| 搜索系统必须接受 canonical | 它是信号，系统会综合其他证据 | 统一重定向、内链、sitemap 和正文 |
| canonical 能修复错误状态码 | 它不改变 HTTP 状态 | 服务器返回正确状态 |

**错误案例：**

```html
<!-- 错误：自行车页面不能把沙发页面当首选版本。 -->
<link rel="canonical" href="https://market.example/listings/sofa-002">
```

如果两个商品不同，这不是“把权重集中到热门页面”，而是制造页面主题和首选信号冲突。

#### 可靠做法

- 使用绝对 HTTPS URL；
- canonical 页面也使用自引用 canonical；
- 内部链接尽量指向首选 URL；
- sitemap 只列首选 URL；
- 不让重定向、canonical、sitemap 和结构化数据 URL 各指不同版本；
- 客户端渲染站点优先在初始 HTML 中输出正确 canonical；
- 不能在初始 HTML 指向 A，再由 JavaScript 改成 B。

### 4.5 robots meta、`X-Robots-Tag` 与 `robots.txt`

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

### 4.6 sitemap：URL 清单，不是收录申请的保证书

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

### 4.7 有效、可抓取、对人也可用的链接

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

### 4.8 HTTP 状态是页面事实的一部分

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

### 4.9 抓取与索引的差异

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

### 4.10 客户端渲染、SSR 与预渲染的边界

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

### 4.11 结构化数据：词汇与编码语法分开理解

结构化数据把页面事实表达为机器可读的类型、属性和值。

两层不要混淆：

| 层 | 本课选择 | 作用 |
| --- | --- | --- |
| 词汇 | Schema.org `Product`、`Offer` | 定义“商品”“报价”“价格”“币种”等概念 |
| 编码 | JSON-LD 或 Microdata | 把这些概念放入页面 |

同一个 `Product` 可以用不同语法表达。语法有效只说明数据可解析；它不证明：

- 事实真实；
- 页面符合某搜索功能的全部必需属性；
- 页面允许抓取和索引；
- 类型选择符合页面主要内容；
- 一定获得富结果；
- 一定提升排名。

### 4.12 Microdata：在可见 HTML 上标注属性

Microdata 使用全局属性：

```html
<article
  itemscope
  itemtype="https://schema.org/Product"
  itemid="https://market.example/listings/commuter-bike-001#product"
>
  <h1 itemprop="name">八成新通勤自行车</h1>
  <p itemprop="description">
    车架稳固，刹车已保养，限同城自提，可预约验车。
  </p>

  <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
    <p>
      价格：
      <data itemprop="price" value="280.00">280.00 元</data>
      <meta itemprop="priceCurrency" content="CNY">
    </p>
    <link
      itemprop="availability"
      href="https://schema.org/InStock"
    >
    <p>状态：在售，可预约验车</p>
  </div>
</article>
```

模型：

- `itemscope` 创建一个 item；
- `itemtype` 给 item 指定绝对 URL 类型；
- `itemid` 在词汇允许时给该 item 全局标识；
- `itemprop` 把当前元素的值关联为属性；
- 嵌套 `itemscope` 可以让 `offers` 的值成为另一个 item；
- `data[value]`、`meta[content]`、`link[href]` 等元素按各自规则提供机器值。

优点：

- 机器标注靠近可见字段；
- 修改标题时容易注意同一元素上的 `itemprop`；
- 不需要维护一整段分离 JSON。

代价：

- 大型嵌套会让正文标记变得密集；
- 组件重排时容易破坏 item 范围；
- 对不直接显示的标识和值仍可能需要 `meta`、`link` 或 `content`；
- “标在可见元素上”仍不自动保证所有机器值真实。

### 4.13 JSON-LD：分离的数据图

JSON-LD 放在：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": "https://market.example/listings/commuter-bike-001#product",
  "name": "八成新通勤自行车",
  "description": "车架稳固，刹车已保养，限同城自提，可预约验车。",
  "sku": "commuter-bike-001",
  "url": "https://market.example/listings/commuter-bike-001",
  "itemCondition": "https://schema.org/UsedCondition",
  "offers": {
    "@type": "Offer",
    "url": "https://market.example/listings/commuter-bike-001",
    "priceCurrency": "CNY",
    "price": "280.00",
    "availability": "https://schema.org/InStock"
  }
}
</script>
```

关键成员：

| 名称 | 作用 | 本课值 |
| --- | --- | --- |
| `@context` | 解释词汇名称 | `https://schema.org` |
| `@type` | 当前节点类型 | `Product`、`Offer` |
| `@id` | 当前实体稳定标识 | canonical 加 `#product` |
| `name` | 商品名称 | 与可见 `<h1>` 相同 |
| `description` | 商品说明 | 与可见说明相同 |
| `sku` | 发布者内部商品标识 | Listing `id` |
| `url` | 商品公开 URL | 与 canonical 相同 |
| `priceCurrency` | ISO 4217 币种代码 | `CNY` |
| `price` | 输出价格 | 由 `priceCents` 生成 `"280.00"` |
| `availability` | Offer 可用状态 | 由真实 Listing 状态映射 |

JSON-LD 与正文分离，便于从一个对象生成和验证；它也更容易出现“正文改了，JSON 忘了改”的漂移。本课不手工维护两份商品事实，而是让生成脚本从同一对象输出二者。

在 HTML `<script>` 中嵌入动态 JSON 时，还要防止数据中的 `<` 形成 `</script>` 提前结束标签。项目生成器会在 `JSON.stringify()` 后把 `<` 转义为 `\u003c`。这不改变 JSON 解析后的文字，却保护 HTML 脚本边界。

### 4.14 可见内容一致性与虚构事实风险

结构化数据不是“给搜索引擎看的另一套营销文案”。逐项检查：

| 结构化字段 | 页面或数据证据 | 错误风险 |
| --- | --- | --- |
| `name` | 主标题 | 写热门但不同的商品名 |
| `description` | 主要商品说明 | 添加正文没有的包邮、认证 |
| `price` | 当前公开售价 | 写更低的诱导价 |
| `priceCurrency` | 页面币种 | 页面人民币、数据写 USD |
| `availability` | 当前可售状态 | 已预约/售出仍写 InStock |
| `itemCondition` | 页面成色说明 | 二手商品写 NewCondition |
| `review` | 可见真实评论 | 编造评论人和评论正文 |
| `aggregateRating` | 完整真实评分集合 | 为通过测试凭空写 4.9/5 |
| `inventoryLevel` | 真实库存系统 | 单件二手商品伪造数量 |

邻里集市当前没有 Review 领域数据和合法交易后评价流程，所以 JSON-LD **不包含** `review` 或 `aggregateRating`。测试工具把某些字段标成“推荐”也不能成为伪造事实的理由。

价格和库存是快速变化信息。更新路径必须让：

```text
领域数据
  → 可见正文
  → JSON-LD / Microdata
  → sitemap lastmod（内容确实变化时）
  → 缓存失效
```

保持同一发布事务。若做不到，应先减少机器声明，而不是留下陈旧的确定性事实。

### 4.15 没有排名或富结果保证

需要明确区分四个结论：

1. HTML/JSON 语法有效；
2. 数据符合词汇；
3. 页面符合某搜索功能的技术和内容政策；
4. 搜索系统实际选择展示该功能。

前一个通常是后一个的必要条件之一，但不构成保证。即使全部技术检查通过：

- 抓取器可能尚未访问；
- 页面可能不进入索引；
- 系统可能选择另一 canonical；
- 查询可能不相关；
- 搜索功能可能不适用于该地区、设备、页面类型或时刻；
- 搜索系统可能选择普通文本结果；
- 政策和展示形式会变化。

本课只承诺可观察、可解释、可校验的页面交付，不承诺排名、流量、索引或富结果。

## 5. 元素、属性、API 或配置清单

### 5.1 HTML 元信息与链接

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `<title>` | 文档标题 | `<title>商品｜邻里集市</title>` | 一个文档最多一个；结果标题不保证原样采用 |
| `meta[name="description"]` | 页面摘要候选 | `<meta name="description" content="…">` | 不直接显示；应与正文一致 |
| `link[rel="canonical"]` | 声明首选 URL | `<link rel="canonical" href="https://…">` | 不是跳转、权限或 `noindex` |
| `meta[name="robots"]` | 页面级索引/展示指令 | `<meta name="robots" content="noindex">` | 抓取器需先取得页面；支持度按目标系统 |
| `<a href>` | 文档导航和 URL 发现 | `<a href="/listings/1">…</a>` | 目标需可直接请求；文字要描述目标 |
| `script[type="application/ld+json"]` | 嵌入 JSON-LD | `<script type="application/ld+json">{…}</script>` | 内容必须是有效 JSON 并与正文一致 |

### 5.2 Microdata

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `itemscope` | 创建 item | `<article itemscope>` | 布尔属性，不写 `itemscope="false"` |
| `itemtype` | 指定类型 | `itemtype="https://schema.org/Product"` | 使用绝对 URL |
| `itemprop` | 声明属性 | `<h1 itemprop="name">…</h1>` | 值的来源取决于元素类型 |
| `itemid` | 声明全局标识 | `itemid="https://…#product"` | 语义由词汇定义，不能随意当 DOM id |
| `itemref` | 关联范围外属性 | `itemref="price"` | 增加维护成本，简单结构优先嵌套 |

### 5.3 可见机器值

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `<data value>` | 绑定机器值和可见文字 | `<data value="28000">280.00 元</data>` | 项目 value 可保留整数分；Schema price 需输出元字符串 |
| `<time datetime>` | 绑定机器时间 | `<time datetime="…Z">… UTC</time>` | 邻里集市存储使用 UTC ISO 8601 |
| `meta[content]` | 提供不可见机器值 | `<meta itemprop="priceCurrency" content="CNY">` | 不能用来藏虚构事实 |
| `link[itemprop][href]` | 提供 URL 枚举值 | `<link itemprop="availability" href="…">` | 不创建用户可导航正文链接 |

### 5.4 站点与 HTTP 配置

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `/robots.txt` | 管理合规抓取器路径访问 | `User-agent` + `Allow/Disallow` | 不是保密、权限或可靠去索引 |
| `/sitemap.xml` | 提供重要 URL 清单 | `<urlset><url>…` | 不保证抓取或索引 |
| `X-Robots-Tag` | 响应级 robots 指令 | `X-Robots-Tag: noindex` | 由服务器发送，适合非 HTML |
| `200` | 当前资源成功 | 商品存在 | 错误正文不要返回 200 |
| `301` | 永久迁移 | 旧 slug 到新 URL | 不是临时实验跳转 |
| `404` / `410` | 缺失 / 明确永久移除 | 商品不存在 | 正文仍可提供恢复链接 |
| `5xx` | 服务器失败 | 数据依赖故障 | 不要伪装成空列表或 404 |

### 5.5 观察工具

| 工具/API | 观察内容 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `document.title` | 当前 DOM 标题 | Console 输入 `document.title` | 可能已被脚本修改，不等于初始源码 |
| `document.querySelector()` | 当前 meta/link | 查询 `meta[name="description"]` | 只看当前 DOM |
| View Source | 初始 HTML | 浏览器“查看网页源代码” | 不显示脚本执行后的 DOM |
| Network | 状态、重定向、资源失败 | 刷新并选 Document | 本地 `file://` 没有真实 HTTP 状态 |
| `curl -I` / `curl -D -` | 状态行和响应头 | `curl -sS -D - URL -o /dev/null` | `-I` 发送 HEAD，服务器可能与 GET 配置不同 |
| `JSON.parse()` | JSON 语法 | `JSON.parse(text)` | 不检查 Schema.org 或内容真实性 |

## 6. 最小可运行案例

### 6.1 目标：观察一个明确 `noindex` 的教学元信息页

这个案例回答五个问题：

1. title、description、canonical 和 robots 在哪里；
2. 浏览器如何把它们暴露给 DOM；
3. 正文如何与摘要保持一致；
4. 教学页为什么使用 `noindex`；
5. 为什么本地打开不能证明搜索系统行为。

### 6.2 文件位置

在个人练习目录创建：

```text
market-learning/
└── practice/
    └── html-chapter-07/
        └── seo/
            └── metadata-lab.html
```

教材仓库不自动提供该练习文件。

### 6.3 完整文件：`metadata-lab.html`

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SEO 元信息教学页｜邻里集市</title>
    <meta
      name="description"
      content="观察邻里集市教学页的 title、description、canonical、robots 和可抓取链接。"
    >
    <meta name="robots" content="noindex, follow">
    <link
      rel="canonical"
      href="https://training.market.example/seo/metadata-lab"
    >
    <style>
      body {
        max-width: 48rem;
        margin: 2rem auto;
        padding: 0 1rem;
        font: 1rem/1.6 system-ui, sans-serif;
      }

      dt {
        font-weight: 700;
      }

      dd {
        margin: 0 0 1rem;
        overflow-wrap: anywhere;
      }

      code {
        background: #f2f4f7;
        padding: 0.1em 0.3em;
      }
    </style>
  </head>
  <body>
    <header>
      <a href="#main">跳到主要内容</a>
      <nav aria-label="教学导航">
        <a href="./metadata-lab.html">教学首页</a>
        <a href="./public/listings/commuter-bike-001.html">商品示例</a>
      </nav>
    </header>

    <main id="main">
      <h1>SEO 元信息教学页</h1>
      <p>
        本页用于观察 title、description、canonical、robots 和普通链接，
        不应进入公开搜索索引。
      </p>

      <dl id="metadata-output">
        <dt>文档标题</dt>
        <dd data-field="title">读取中</dd>
        <dt>描述</dt>
        <dd data-field="description">读取中</dd>
        <dt>首选 URL</dt>
        <dd data-field="canonical">读取中</dd>
        <dt>robots</dt>
        <dd data-field="robots">读取中</dd>
      </dl>

      <p>
        继续学习：
        <a href="./public/listings/commuter-bike-001.html">
          商品元信息案例
        </a>
      </p>
    </main>

    <script>
      const selectors = {
        title: "title",
        description: 'meta[name="description"]',
        canonical: 'link[rel="canonical"]',
        robots: 'meta[name="robots"]'
      };

      const readValue = (field, element) => {
        if (!element) return "缺失";
        if (field === "title") return element.textContent.trim();
        if (field === "canonical") return element.href;
        return element.content;
      };

      for (const [field, selector] of Object.entries(selectors)) {
        const target = document.querySelector(`[data-field="${field}"]`);
        const source = document.querySelector(selector);
        target.textContent = readValue(field, source);
      }
    </script>
  </body>
</html>
```

这个页面使用绝对 canonical，是为了演示假设部署地址。`training.market.example` 是保留教学域名，不能把本地文件真的部署到该地址，也不能把它当作已经存在的线上页面。

### 6.4 打开与运行

直接打开可以观察 DOM：

```bash
open market-learning/practice/html-chapter-07/seo/metadata-lab.html
```

若要在 Network 中观察 HTTP 文档请求，在 `market-learning/practice/html-chapter-07/seo/` 运行：

```bash
python3 -m http.server 4173
```

然后打开：

```text
http://localhost:4173/metadata-lab.html
```

停止服务器：回到终端按 `Control+C`。

### 6.5 预期结果

页面应显示：

```text
文档标题：SEO 元信息教学页｜邻里集市
描述：观察邻里集市教学页的 title、description、canonical、robots 和可抓取链接。
首选 URL：https://training.market.example/seo/metadata-lab
robots：noindex, follow
```

同时：

- 浏览器标签显示具体标题；
- `<h1>` 与 title 主题一致；
- 正文明确说明本页是教学页且不希望进入公开索引；
- 导航使用 `<a href>`；
- 禁用 JavaScript 后核心说明和链接仍存在，只是观察值停留在“读取中”；
- Network 中本地静态服务器对存在文件返回 `200`；
- `noindex` 只是页面指令，不会在本地浏览器中自动隐藏页面。

### 6.6 失败时优先检查

| 现象 | 证据 | 常见原因 | 修复 |
| --- | --- | --- | --- |
| 页面 404 | Network 的 Document 状态 | 服务器目录或 URL 错 | 在包含文件的目录启动服务器 |
| 四项一直“读取中” | Console | 脚本语法错误或被策略阻止 | 查看第一条错误并修复 |
| 某项显示“缺失” | Elements 的 `<head>` | 名称拼错或标签删除 | 恢复对应 meta/link |
| canonical 变成意外地址 | Console 检查 `.getAttribute("href")` 和 `.href` | 相对 URL 或 `<base>` 改变解析 | 使用预期绝对 URL |
| “商品元信息案例”返回 404 | Network | 这是尚未创建的渐进文件 | 完成第 7 节后再访问 |
| 以为 noindex 已生效 | 只有本地页面，没有抓取证据 | 本地文件未被搜索系统抓取 | 只记录标记存在，不宣称索引结果 |

### 6.7 渐进扩展：建立一致性检查

在现有 `<script>` 的循环后增加：

```js
const title = document.title;
const heading = document.querySelector("h1").textContent;
const description = document
  .querySelector('meta[name="description"]')
  .content;
const robots = document.querySelector('meta[name="robots"]').content;

console.assert(title.includes(heading), "title 应包含页面主题");
console.assert(
  description.includes("canonical"),
  "description 应准确概括本页内容"
);
console.assert(
  robots.split(/\s*,\s*/).includes("noindex"),
  "教学页应明确 noindex"
);
```

重新加载，Console 不应出现 assertion failed。然后制造一次故障：

```html
<title>全新自行车五折包邮｜邻里集市</title>
```

预期：

- `title.includes(heading)` 失败；
- 浏览器标签与正文主题冲突；
- 修复应恢复真实教学标题，而不是把 `<h1>` 也改成虚假促销。

这只是本地一致性检查，不是 SEO 评分器。

### 6.8 教学页的 robots 边界

若未来部署该教学页：

- 页面应允许合规搜索抓取器取得 HTML，从而读取 `noindex`；
- sitemap 不应列出它；
- 站内仍可链接到它，`follow` 不承诺搜索系统一定跟随；
- 如果内容必须对未登录用户保密，应加服务端身份与权限检查；
- 下线时根据是否有替代页面选择 301、404 或 410；
- 不要用 canonical 指向课程首页来冒充去索引。

## 7. 邻里集市集成案例

### 7.1 案例目标与数据契约

现在从同一份 Listing 数据生成：

1. 具体 `<title>`；
2. 准确 description；
3. 自引用 canonical；
4. 可见商品正文；
5. JSON-LD Product/Offer；
6. UTC `<time>`；
7. 可抓取站内链接；
8. 静态完整 HTML。

固定教学对象：

```js
const listing = {
  id: "commuter-bike-001",
  title: "八成新通勤自行车",
  description: "车架稳固，刹车已保养，限同城自提，可预约验车。",
  priceCents: 28000,
  status: "available",
  ownerId: "user-demo-wang",
  version: 1,
  createdAt: "2026-10-10T08:30:00.000Z"
};
```

约束：

- `priceCents` 始终保留整数分；
- 只有输出到用户价格和 Schema.org `price` 时生成 `"280.00"`；
- `createdAt` 必须是可解析且以 `Z` 结尾的 UTC ISO 8601；
- status 只允许 `available`、`reserved`、`sold`；
- `ownerId` 不公开；
- 当前 status 由固定数据提供，不代表真实数据库库存；
- 页面没有评价数据，所以不输出 review 或 aggregateRating。

### 7.2 个人练习目录

```text
market-learning/
└── practice/
    └── html-chapter-07/
        └── seo/
            ├── build-listing.mjs
            └── public/
                ├── robots.txt
                ├── sitemap.xml
                └── listings/
                    └── commuter-bike-001.html
```

`public/` 中的文件由学习者按本节创建。生成的 HTML 是练习产物，不提交到本教材仓库。

### 7.3 完整生成器：`build-listing.mjs`

```js
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const listing = {
  id: "commuter-bike-001",
  title: "八成新通勤自行车",
  description: "车架稳固，刹车已保养，限同城自提，可预约验车。",
  priceCents: 28000,
  status: "available",
  ownerId: "user-demo-wang",
  version: 1,
  createdAt: "2026-10-10T08:30:00.000Z"
};

const canonical =
  `https://market.example/listings/${encodeURIComponent(listing.id)}`;

const statusOutput = {
  available: {
    label: "在售，可预约验车",
    availability: "https://schema.org/InStock"
  },
  reserved: {
    label: "已被预约，暂不可继续预约",
    availability: "https://schema.org/OutOfStock"
  },
  sold: {
    label: "已售出",
    availability: "https://schema.org/OutOfStock"
  }
};

const assertListing = (value) => {
  if (!value.title.trim()) {
    throw new TypeError("listing.title 不能为空");
  }

  if (!value.description.trim()) {
    throw new TypeError("listing.description 不能为空");
  }

  if (!Number.isSafeInteger(value.priceCents) || value.priceCents < 0) {
    throw new TypeError("listing.priceCents 必须是非负安全整数分");
  }

  if (!Object.hasOwn(statusOutput, value.status)) {
    throw new TypeError(`未知 listing.status：${value.status}`);
  }

  const parsedTime = new Date(value.createdAt);
  if (
    Number.isNaN(parsedTime.valueOf()) ||
    !value.createdAt.endsWith("Z") ||
    parsedTime.toISOString() !== value.createdAt
  ) {
    throw new TypeError(
      "listing.createdAt 必须是规范 UTC ISO 8601 字符串"
    );
  }
};

const formatCents = (cents) => {
  const yuan = Math.floor(cents / 100);
  const remainder = String(cents % 100).padStart(2, "0");
  return `${yuan}.${remainder}`;
};

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const jsonForHtml = (value) =>
  JSON.stringify(value, null, 2).replaceAll("<", "\\u003c");

assertListing(listing);

const priceYuan = formatCents(listing.priceCents);
const currentStatus = statusOutput[listing.status];
const pageTitle = `${listing.title}，${priceYuan} 元｜邻里集市`;
const pageDescription =
  `${listing.title}，${listing.description}` +
  `价格 ${priceYuan} 元，状态：${currentStatus.label}。`;

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": `${canonical}#product`,
  name: listing.title,
  description: listing.description,
  sku: listing.id,
  url: canonical,
  itemCondition: "https://schema.org/UsedCondition",
  offers: {
    "@type": "Offer",
    url: canonical,
    priceCurrency: "CNY",
    price: priceYuan,
    availability: currentStatus.availability
  }
};

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(pageTitle)}</title>
    <meta
      name="description"
      content="${escapeHtml(pageDescription)}"
    >
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <script type="application/ld+json">
${jsonForHtml(structuredData)}
    </script>
    <style>
      body {
        max-width: 48rem;
        margin: 2rem auto;
        padding: 0 1rem;
        font: 1rem/1.65 system-ui, sans-serif;
      }

      nav a + a {
        margin-inline-start: 1rem;
      }

      .price {
        font-size: 1.4rem;
        font-weight: 700;
      }

      dt {
        font-weight: 700;
      }

      dd {
        margin: 0 0 0.75rem;
      }
    </style>
  </head>
  <body>
    <header>
      <nav aria-label="主要导航">
        <a href="/">邻里集市首页</a>
        <a href="/listings">全部商品</a>
      </nav>
    </header>

    <main>
      <article>
        <h1>${escapeHtml(listing.title)}</h1>
        <p class="price">
          价格：
          <data value="${listing.priceCents}">${priceYuan} 元</data>
        </p>
        <p>${escapeHtml(listing.description)}</p>

        <dl>
          <dt>商品状态</dt>
          <dd>${escapeHtml(currentStatus.label)}</dd>
          <dt>商品成色</dt>
          <dd>二手，约八成新</dd>
          <dt>发布时间</dt>
          <dd>
            <time datetime="${listing.createdAt}">
              ${listing.createdAt}
            </time>
          </dd>
          <dt>商品编号</dt>
          <dd>${escapeHtml(listing.id)}</dd>
        </dl>

        <p>
          本页为固定教学数据，没有真实库存、支付、账号、
          评论或服务端预约能力。
        </p>
      </article>
    </main>
  </body>
</html>
`;

const currentFile = fileURLToPath(import.meta.url);
const outputFile = new URL(
  "./public/listings/commuter-bike-001.html",
  import.meta.url
);

await mkdir(dirname(fileURLToPath(outputFile)), { recursive: true });
await writeFile(outputFile, html, "utf8");

console.log(`generated: ${fileURLToPath(outputFile)}`);
console.log(`source cents: ${listing.priceCents}`);
console.log(`output price: ${priceYuan} CNY`);
console.log(`createdAt UTC: ${listing.createdAt}`);
console.log(`builder: ${currentFile}`);
```

### 7.4 关键推导

#### 第一步：先验证领域输入

`assertListing()` 在生成前拒绝：

- 空标题或空说明；
- 负数、非整数或超出安全整数范围的分值；
- 未知状态；
- 不可解析、非 `Z` 结尾或非规范形式的 UTC 时间。

它不代替后端业务验证。本课只有固定对象，真实系统的 API、数据库和权限仍需独立约束。

#### 第二步：只在输出边界格式化金额

```js
const priceYuan = formatCents(listing.priceCents);
```

业务对象仍是：

```text
priceCents = 28000
```

两个输出使用同一个 `priceYuan`：

```text
可见正文：280.00 元
JSON-LD："price": "280.00"
```

生成器没有把 `listing.priceCents` 改成 `280.00`，也没有在业务对象中保存浮点元。

#### 第三步：状态只映射一次

```js
const currentStatus = statusOutput[listing.status];
```

`currentStatus.label` 进入可见正文，`currentStatus.availability` 进入 Offer。若商品变为 `reserved`，同一映射会同时更新两个输出，减少“正文已预约但机器数据仍 InStock”的风险。

本课把 reserved 和 sold 都映射为 `OutOfStock`，因为当前 Offer 对用户不可用。真实业务若允许候补、恢复时间或其他交易状态，需要重新选择词汇和可见说明，不能照搬。

#### 第四步：UTC 时间保持原值

```html
<time datetime="2026-10-10T08:30:00.000Z">
  2026-10-10T08:30:00.000Z
</time>
```

本课直接显示 UTC，便于核对生成结果。真实 UI 可以在可见文字中按用户时区格式化，但 `datetime` 和领域数据仍保留确定时间点，并且要明确显示时区。

#### 第五步：正文与 JSON-LD来自同一对象

生成器没有从已经拼好的 HTML 反向抓文字，也没有手写第二份价格和状态。数据流是：

```text
listing
  ├── pageTitle / pageDescription
  ├── visible article
  └── structuredData → JSON.stringify()
```

这不能消灭所有错误，例如初始 listing 自己可能不真实，但能减少同一发布物中的复制漂移。

### 7.5 语法检查、生成与打开

在 `market-learning/practice/html-chapter-07/seo/` 运行：

```bash
node --check build-listing.mjs
node build-listing.mjs
python3 -m http.server 4173 --directory public
```

打开：

```text
http://localhost:4173/listings/commuter-bike-001.html
```

停止服务器：终端按 `Control+C`。

预期终端输出包含：

```text
generated: .../public/listings/commuter-bike-001.html
source cents: 28000
output price: 280.00 CNY
createdAt UTC: 2026-10-10T08:30:00.000Z
builder: .../build-listing.mjs
```

预期页面：

- 标签标题为“八成新通勤自行车，280.00 元｜邻里集市”；
- `<h1>` 为“八成新通勤自行车”；
- 可见价格为 `280.00 元`，`data.value` 为 `28000`；
- 状态为“在售，可预约验车”；
- 成色为“二手，约八成新”；
- `<time datetime>` 与可见 UTC 字符串相同；
- 无 JavaScript 时正文完全存在；
- Network 的 Document 为 `200`；
- View Source 中已经有正文和 JSON-LD。

### 7.6 解析生成页面中的 JSON-LD

保持本地服务器可选；JSON 检查直接读取文件。在 `seo/` 目录运行：

```bash
node -e "
const fs = require('node:fs');
const html = fs.readFileSync(
  'public/listings/commuter-bike-001.html',
  'utf8'
);
const match = html.match(
  /<script type=\"application\\/ld\\+json\">([\\s\\S]*?)<\\/script>/
);
if (!match) throw new Error('JSON-LD block missing');
const data = JSON.parse(match[1]);
if (data.offers.price !== '280.00') {
  throw new Error('unexpected structured price');
}
if (data.offers.priceCurrency !== 'CNY') {
  throw new Error('unexpected currency');
}
console.log(data.name, data.offers.price, data.offers.availability);
"
```

预期：

```text
八成新通勤自行车 280.00 https://schema.org/InStock
```

这个命令证明：

- 找到了 JSON-LD block；
- JSON 语法有效；
- 价格和币种符合当前断言。

它没有证明 Schema.org 类型完整、搜索功能资格或事实真实。下一步仍需与正文、词汇和目标搜索功能文档核对。

### 7.7 生成后的 JSON-LD

生成页面应包含下面这段有效 JSON：

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "@id": "https://market.example/listings/commuter-bike-001#product",
  "name": "八成新通勤自行车",
  "description": "车架稳固，刹车已保养，限同城自提，可预约验车。",
  "sku": "commuter-bike-001",
  "url": "https://market.example/listings/commuter-bike-001",
  "itemCondition": "https://schema.org/UsedCondition",
  "offers": {
    "@type": "Offer",
    "url": "https://market.example/listings/commuter-bike-001",
    "priceCurrency": "CNY",
    "price": "280.00",
    "availability": "https://schema.org/InStock"
  }
}
```

刻意省略：

- `review`：没有真实评论；
- `aggregateRating`：没有真实评分集合；
- `inventoryLevel`：没有库存系统；
- `seller`：教学对象不公开真实身份；
- `image`：本课没有提供可抓取、与商品对应且有权使用的真实图片 URL；
- `priceValidUntil`：没有真实到期规则；
- 配送、退货和支付信息：当前静态教学页没有这些能力。

“字段越多越好”不是质量原则。只有真实、相关、可维护的字段才应发布。

### 7.8 添加 `robots.txt`

文件位置：

```text
market-learning/practice/html-chapter-07/seo/public/robots.txt
```

完整内容：

```text
User-agent: *
Allow: /

Sitemap: https://market.example/sitemap.xml
```

本地打开：

```text
http://localhost:4173/robots.txt
```

预期：

- 状态 `200`；
- `Content-Type` 至少是可读取的文本类型；
- 文件不是 HTML 包装页；
- 没有阻止商品或教学 noindex 页被抓取；
- Sitemap 使用假设部署域名，不是 localhost。

失败证据：

- 404 表示文件不在静态服务器根目录；
- 返回应用首页表示 SPA fallback 错误接管了特殊文件；
- `Disallow: /` 表示整个站点被声明为不可抓取；
- robots.txt 中写 `Noindex:` 不能替代页面/响应的受支持 noindex 机制。

### 7.9 添加 `sitemap.xml`

文件位置：

```text
market-learning/practice/html-chapter-07/seo/public/sitemap.xml
```

完整内容：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://market.example/listings/commuter-bike-001</loc>
    <lastmod>2026-10-10T08:30:00Z</lastmod>
  </url>
</urlset>
```

本地打开：

```text
http://localhost:4173/sitemap.xml
```

预期：

- XML 可解析；
- 只列公开首选商品 URL；
- 不列 `metadata-lab.html`，因为它是 `noindex` 教学页；
- 不列 `.html` 文件 URL 和无扩展 URL 两个重复版本；
- `lastmod` 是内容首次发布时的真实 UTC 时间，不是运行检查的当前时间。

可用 Python 标准库验证 XML：

```bash
python3 -c "
import xml.etree.ElementTree as ET
ET.parse('public/sitemap.xml')
print('sitemap XML: PASS')
"
```

预期：

```text
sitemap XML: PASS
```

### 7.10 Microdata 等价表达

不要在练习页同时保留两套手工维护的 Product 数据。为了比较语法，可以复制生成页为独立实验文件，并用下面片段替换原 article；同时暂时移除 JSON-LD：

```html
<article
  itemscope
  itemtype="https://schema.org/Product"
  itemid="https://market.example/listings/commuter-bike-001#product"
>
  <link
    itemprop="url"
    href="https://market.example/listings/commuter-bike-001"
  >
  <meta itemprop="sku" content="commuter-bike-001">
  <link
    itemprop="itemCondition"
    href="https://schema.org/UsedCondition"
  >

  <h1 itemprop="name">八成新通勤自行车</h1>
  <p itemprop="description">
    车架稳固，刹车已保养，限同城自提，可预约验车。
  </p>

  <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
    <link
      itemprop="url"
      href="https://market.example/listings/commuter-bike-001"
    >
    <meta itemprop="priceCurrency" content="CNY">
    <link
      itemprop="availability"
      href="https://schema.org/InStock"
    >
    <p>
      价格：
      <data itemprop="price" value="280.00">280.00 元</data>
    </p>
    <p>状态：在售，可预约验车</p>
  </div>

  <dl>
    <dt>商品成色</dt>
    <dd>二手，约八成新</dd>
    <dt>发布时间</dt>
    <dd>
      <time datetime="2026-10-10T08:30:00.000Z">
        2026-10-10T08:30:00.000Z
      </time>
    </dd>
  </dl>
</article>
```

注意两个不同的 `data[value]`：

- 项目正文若不承担 Schema `price`，可以用 `value="28000"` 保留整数分；
- 标为 `itemprop="price"` 时，该机器值属于 Schema.org Offer 价格，应输出 `"280.00"`，币种由 `priceCurrency="CNY"` 说明。

业务源数据仍必须是 `priceCents: 28000`。Microdata 只是输出编码，不应反向成为业务存储。

### 7.11 渐进扩展：状态变化必须同步

在生成器中把：

```js
status: "available",
```

改为：

```js
status: "reserved",
```

重新运行：

```bash
node build-listing.mjs
```

预期同时变化：

```text
可见状态：已被预约，暂不可继续预约
JSON-LD availability：https://schema.org/OutOfStock
```

价格、标题、URL 和创建时间不应变化。

再运行 JSON 解析命令，并把断言改为：

```js
if (data.offers.availability !== "https://schema.org/OutOfStock") {
  throw new Error("reserved listing must not be InStock");
}
```

若只手工改生成 HTML 的可见文字：

- 下一次生成会覆盖修改；
- JSON-LD 仍可能保留旧状态；
- 正确修复是更新权威数据和映射后重新生成。

真实系统中，reserved 状态还涉及用户、服务端事务和并发约束。本课只验证输出一致性，不声称静态页完成预约。

### 7.12 CSR、SSR 和预渲染在项目中的分工

邻里集市可以按内容性质拆分：

| 内容 | 推荐边界 | 原因 |
| --- | --- | --- |
| 公开商品名称、说明、价格、状态 | SSR 或可及时更新的预渲染 | 每个 URL 需要初始内容和真实状态 |
| 不存在商品 | 服务器/部署层返回 404 | 客户端文字不能改 HTTP 状态 |
| 收藏按钮当前页反馈 | 客户端增强 | 不应写入公共 Product 事实 |
| 登录用户是否已收藏 | 私有 API / SSR 隔离 | 不能泄露到共享缓存 |
| 商品编辑预览 | `noindex` 加权限 | noindex 不替代权限 |
| 评论和评分 | 建立合法交易与审核模型后再输出 | 当前契约没有可伪造的捷径 |

本课生成页无需 hydration。后续框架课程可以在完整静态/SSR HTML 上增强收藏和预约入口，但不能让客户端增强把正确的首个响应退化为空壳。

### 7.13 集成案例的已知边界

- `market.example` 不是真实部署；
- 本地 Python 服务器不能模拟生产重写、缓存和 CDN；
- 静态文件名含 `.html`，假设公开 canonical 无扩展，部署层必须明确映射；
- 若部署层同时让两个 URL 返回 200，应增加重定向统一版本；
- `index, follow` 是默认值，保留它只为教学观察；
- Product/Offer 词汇可表达当前商品事实，但具体搜索功能还有额外资格与政策；
- 本课没有真实图片 URL，因此不声称满足所有 Product 富结果推荐项；
- 本课没有在 Search Console、Bing Webmaster Tools 或生产日志中验证；
- 页面和 JSON-LD 正确也不保证抓取、索引、排名或富结果。

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

### 8.2 canonical 指向不同商品

**错误：**

```html
<!-- 自行车正文 -->
<link rel="canonical" href="https://market.example/listings/sofa-002">
```

**现象：**

- 浏览器仍停留在自行车 URL；
- Elements 能看到 canonical，但它不导航；
- sitemap、内链和 JSON-LD 可能仍指自行车 URL；
- 搜索系统收到互相冲突的主题和 URL 信号。

**原因：**

- 把 canonical 当“集中权重”的任意目标；
- 列表模板复用了上一件商品 URL；
- 用站点首页作为所有页面 canonical；
- 客户端切换商品时只更新正文，没更新元信息。

**修复：**

- 不同商品使用各自 canonical；
- 只有重复或高度相似 URL 才指向同一代表版本；
- 已永久迁移则增加 301，而不是只加 canonical；
- 从同一 Listing id 生成 canonical、JSON-LD URL 和内链。

**复验：**

```js
const canonical = document.querySelector('link[rel="canonical"]').href;
const structured = JSON.parse(
  document.querySelector('script[type="application/ld+json"]').textContent
);

console.assert(canonical === structured.url);
console.assert(structured.offers.url === canonical);
```

### 8.3 `robots.txt` 挡住页面，同时期待 `noindex`

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

### 8.4 sitemap 混入 noindex、404 和重复 URL

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

### 8.5 只有点击脚本，没有 `href`

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

### 8.6 title、description 与正文不一致

**错误：**

```html
<title>全新山地车，包邮｜邻里集市</title>
<meta name="description" content="全新商品，五星好评，库存充足。">
...
<h1>八成新通勤自行车</h1>
<p>限同城自提，当前已预约。</p>
```

**排查顺序：**

1. View Source 看初始值；
2. Elements 看脚本是否修改；
3. 查 title/description 是否重复；
4. 查数据源是否复用旧缓存；
5. 对照正文逐项列出名称、成色、配送、状态和评论；
6. 修复生成源，不在结果页打临时补丁。

### 8.7 JSON-LD 不是有效 JSON

**错误：**

```html
<script type="application/ld+json">
{
  '@type': 'Product',
  "name": "八成新通勤自行车",
  "price": "￥280.00",
}
</script>
```

问题：

- 单引号不是 JSON 字符串语法；
- 尾随逗号非法；
- 缺少上下文；
- `price` 混入币种符号；
- `price` 应位于相应 Offer 中，并配 `priceCurrency`；
- 即使修复语法，也要核对页面事实和目标功能要求。

**修复：**

使用对象 + `JSON.stringify()` 生成，不用字符串手拼：

```js
const data = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "八成新通勤自行车",
  offers: {
    "@type": "Offer",
    price: "280.00",
    priceCurrency: "CNY"
  }
};
```

### 8.8 虚构评价、低价或库存

**错误：**

```json
{
  "@type": "Product",
  "name": "八成新通勤自行车",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 5,
    "reviewCount": 99
  },
  "offers": {
    "@type": "Offer",
    "price": "99.00",
    "priceCurrency": "CNY",
    "availability": "https://schema.org/InStock"
  }
}
```

如果正文和系统没有 99 条真实评价，售价是 280.00，商品又已预约，这段数据即使 JSON 语法正确也是误导。

**风险：**

- 用户看到的结果预期与落地页冲突；
- 特定搜索功能资格可能被取消；
- 可能触发结构化数据人工处置或垃圾内容判断；
- 价格和库存错误还会造成业务与合规问题；
- 团队失去对机器数据的信任。

**修复原则：**

```text
没有真实字段 → 不输出
字段暂时不可靠 → 修复数据链或暂时移除
页面状态变化 → 同一次发布更新正文和结构化数据
测试要求推荐字段 → 不用假数据满足
```

### 8.9 客户端渲染在开发机正常，抓取结果为空

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

### 8.10 多个或互相冲突的 canonical

**错误：**

```html
<link rel="canonical" href="https://market.example/listings/bike-a">
<link rel="canonical" href="https://market.example/listings/bike-b">
```

可能来源：

- 服务端模板输出一个，客户端 SEO 插件再输出一个；
- 组件重复挂载；
- HTTP `Link` header 与 HTML 指向不同目标。

诊断：

```js
[...document.querySelectorAll('link[rel="canonical"]')]
  .map((link) => link.href);
```

预期只有一个明确目标。还需用 `curl -D -` 检查响应头是否另有 `Link: <...>; rel="canonical"`。

### 8.11 用 `file://` 推断 HTTP 和抓取行为

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

### 8.12 诊断与恢复记录

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

### 9.2 情景推理题

#### 情景 A

页面：

```text
URL：https://market.example/listings/bike?utm_source=poster
HTTP：200
canonical：https://market.example/listings/bike
正文：同一辆自行车
```

这个 canonical 是否合理？还应统一哪些信号？

#### 情景 B

预览页既有：

```html
<meta name="robots" content="noindex">
```

又被：

```text
Disallow: /preview/
```

阻止抓取。团队说这是“双保险”。指出问题并给出公开预览和私密预览的两种方案。

#### 情景 C

商品从 available 变为 reserved：

- 正文显示“已预约”；
- JSON-LD 仍为 `InStock`；
- sitemap lastmod 没变化；
- CDN 仍缓存旧 HTML。

应该修哪条数据流？

#### 情景 D

SPA 对 `/listings/not-exist` 返回 `200` app shell，脚本请求 API 后显示未找到。只加 canonical 到 `/listings` 是否足够？为什么？

### 9.3 参考答案

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

### 10.1 基础：为另一件商品编写一致元信息

**文件位置：**

```text
market-learning/practice/html-chapter-07/seo/chair-metadata.html
```

**输入：**

```js
{
  id: "folding-chair-002",
  title: "榉木折叠椅",
  description: "室内使用半年，结构稳定，有轻微使用痕迹，仅支持自提。",
  priceCents: 3500,
  status: "available",
  createdAt: "2026-10-10T09:15:00.000Z"
}
```

**任务：**

- 写具体 title；
- 写与正文一致的 description；
- canonical 使用该商品 URL；
- 可见价格由 `3500` 输出为 `35.00 元`；
- 使用 UTC `<time>`；
- 用普通链接返回商品列表；
- 暂不添加结构化数据。

**运行：**

```bash
python3 -m http.server 4173
```

**预期：**

- 标签、h1、description 都描述折叠椅；
- 页面没有“包邮”“全新”或评分；
- `<data value="3500">35.00 元</data>`；
- Network 为 200。

**失败观察点：**

- 查看 Elements 是否有重复 title/description；
- 检查 canonical 是否误用自行车 ID；
- 检查金额是否把 `3500` 直接显示成 `3500 元`；
- 检查时间是否丢失 `Z`。

**完成标准：**

能逐项说明 title、description、正文和 canonical 的事实来源。

### 10.2 提升：让生成器支持两件商品

**文件位置：**

```text
market-learning/practice/html-chapter-07/seo/build-listings.mjs
```

**任务：**

- 把 Listing 放入数组；
- 对每项运行同一验证和生成函数；
- 每个商品写入独立 HTML；
- 自动生成 sitemap；
- sitemap 只列两个首选 URL；
- `lastmod` 使用各自真实 UTC 修改时间；
- 不复制手写 JSON-LD 字符串。

**运行：**

```bash
node --check build-listings.mjs
node build-listings.mjs
python3 -m http.server 4173 --directory public
```

**预期：**

- 两个 URL 都返回 200；
- title、canonical、JSON-LD URL 不串商品；
- 价格分别为 `280.00` 和 `35.00`；
- sitemap XML 可解析且只有两个 `<url>`；
- 教学 noindex 页不在 sitemap。

**答案标准：**

- 使用纯函数接收单个 listing 并返回 HTML；
- 写文件的循环与 HTML 生成职责分离；
- 由同一个 canonical 变量生成 link、JSON-LD 和 sitemap；
- 任一非法分值或时间使构建失败，而不是跳过并静默发布。

### 10.3 提升：比较 Microdata 与 JSON-LD

**文件位置：**

```text
market-learning/practice/html-chapter-07/seo/structured-data-notes.md
```

**任务：**

用两种语法表达同一折叠椅，并记录：

- Product 名称；
- Offer 价格与币种；
- 成色；
- 可用状态；
- URL；
- 哪些值来自可见元素；
- 哪些值来自 `meta`、`link` 或 JSON；
- 修改价格时需要改几处；
- 如何避免两套数据同时上线后漂移。

**完成标准：**

不能只写“JSON-LD 更好”。要结合当前模板、生成方式、可见内容和维护风险说明选择。

### 10.4 故障演练：制造并修复 soft 404

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

### 10.5 故障演练：阻止抓取后看不到 noindex

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

### 10.6 综合：客户端渲染与预渲染对照

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

### 10.7 提交记录模板

```text
练习：
文件：
运行命令：
页面 URL：
正常预期：
实际结果：
故障注入：
状态/Console/解析失败证据：
根因：
修复：
复验：
正文与结构化数据对照：
未验证搜索引擎/浏览器：
是否作出排名或富结果保证：否
```

## 11. 阶段验收

### 11.1 SEO-001：title、description 与真实正文

- [ ] 每个页面只有一个具体 `<title>`；
- [ ] title 脱离页面仍能识别商品和站点；
- [ ] `<h1>` 与 title 主题一致；
- [ ] description 准确概括正文；
- [ ] description 没有正文不存在的促销、评价、物流或认证；
- [ ] 能解释结果标题和摘要可能由搜索系统重写；
- [ ] 没有承诺固定字符长度或固定展示。

### 11.2 SEO-002：canonical 与 URL 规范化

- [ ] canonical 位于有效 `<head>`；
- [ ] 使用绝对 HTTPS 首选 URL；
- [ ] 当前商品页使用自引用 canonical；
- [ ] JSON-LD URL、内部链接和 sitemap 与首选 URL 一致；
- [ ] 参数重复 URL 指向同一代表版本；
- [ ] 不同商品没有互相 canonical；
- [ ] 能解释 canonical 不是跳转、权限、删除或保证；
- [ ] 永久迁移使用合适重定向。

### 11.3 SEO-003：robots 边界

- [ ] 教学页含 `noindex`；
- [ ] 教学页不在 sitemap；
- [ ] robots.txt 没有挡住需要读取 noindex 的合规抓取器；
- [ ] 能区分 robots meta、`X-Robots-Tag` 和 robots.txt；
- [ ] 不使用 robots.txt 做 canonical；
- [ ] 不把 noindex 或 robots.txt 当访问控制；
- [ ] 私密内容方案包含服务器认证和授权。

### 11.4 SEO-004：sitemap、链接与 HTTP 状态

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

### 11.5 SEO-005：抓取与索引

- [ ] 能画出发现、抓取、渲染、索引、展示流程；
- [ ] 能解释“已发现但未抓取”；
- [ ] 能解释“已抓取但 noindex”；
- [ ] 能解释“已抓取但选择另一 canonical”；
- [ ] 不把 sitemap 提交当索引完成；
- [ ] 不把普通搜索结果当唯一索引证据；
- [ ] 验收记录区分站点输入和搜索系统选择。

### 11.6 SEO-006：Microdata、JSON-LD 与可见内容

- [ ] 能解释词汇与编码语法的区别；
- [ ] Microdata item、type、property 和嵌套关系正确；
- [ ] JSON-LD 可通过 `JSON.parse()`；
- [ ] Product 与 Offer 层级明确；
- [ ] 名称、说明、URL、价格、币种、成色和状态与正文一致；
- [ ] 价格由整数分在输出边界生成；
- [ ] 没有伪造 review、aggregateRating、价格或库存；
- [ ] 能解释测试工具通过不等于内容政策通过；
- [ ] 没有承诺富结果。

### 11.7 SEO-007：客户端渲染、SSR 与预渲染

- [ ] 已比较 View Source 和渲染后 DOM；
- [ ] 已执行禁用 JavaScript 检查；
- [ ] 已检查脚本与 API 失败状态；
- [ ] 已验证深层 URL 可直接请求；
- [ ] 错误 URL 的 HTTP 状态由服务器/部署层负责；
- [ ] 公开关键内容的渲染选择有证据；
- [ ] 没有声称 Google 可运行 JS 就代表所有抓取器都可靠；
- [ ] 没有声称 SSR 或预渲染自动提高排名。

### 11.8 邻里集市数据契约

- [ ] Listing 保持 `priceCents: 28000`；
- [ ] 可见价格输出 `280.00 元`；
- [ ] JSON-LD price 输出 `"280.00"` 和 `CNY`；
- [ ] UTC 输入为 `2026-10-10T08:30:00.000Z`；
- [ ] `<time datetime>` 保留 UTC；
- [ ] status 同时驱动可见标签和 Offer availability；
- [ ] ownerId 未泄露；
- [ ] 静态教学状态没有冒充数据库库存；
- [ ] 没有声称实现支付、登录、授权、真实预约、评论或并发。

### 11.9 文件、运行、预期与失败证据

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

### 11.10 最终发布判断

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

### Q1：每个页面都必须写 meta description 吗？

HTML 语法不强制它存在，搜索系统也可以从正文生成摘要。但重要页面应尽量提供准确、独特的概括。大规模商品页可以从真实字段程序化生成，前提是避免空值、重复模板和虚假事实。

### Q2：title 应控制在多少字符？

不要把某个字符数当标准保证。结果展示会受设备、文字宽度、查询和搜索系统处理影响。先保证具体、简洁、可区分和真实，再在目标设备与官方工具中观察截断。

### Q3：description 会直接影响排名吗？

本课不对排名因素作推断。description 的直接职责是准确概括页面，并可能成为摘要候选。即使某系统不把它当排序输入，误导描述仍会伤害用户预期和内容一致性。

### Q4：canonical 可以指向首页来避免重复吗？

只有内容确实重复或高度相似时才应合并首选版本。不同商品、分类或错误页都指向首页会制造错误信号。不存在页面应返回 404；永久迁移且有真正替代时使用 301。

### Q5：为什么建议 canonical 使用绝对 URL？

绝对 URL 能明确协议和主机，减少测试主机、`<base>` 和路径层级造成的意外解析。还应确保 HTTPS、主机名、尾斜杠和路径大小写与实际首选版本一致。

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

### Q13：JSON-LD 必须放 `<head>` 吗？

目标消费者可能支持 head 或 body，但应查其官方要求。本课放在 head，便于在初始 HTML 中发现并与页面元信息一起生成。无论位置如何，都必须有效、相关、可访问并与可见内容一致。

### Q14：可以同时使用 Microdata 和 JSON-LD 吗？

技术上可以表达多个 item，但重复描述同一实体会增加冲突风险。本课比较时使用独立文件。生产应选择团队能可靠生成、测试和同步的一种主方式；若确需并存，必须证明标识和值完全一致。

### Q15：为什么 JSON-LD 的 price 是字符串？

Schema.org 和特定搜索功能可能接受数字或字符串；本课使用固定两位十进制字符串，明确表达从整数分格式化后的 CNY 金额。不要加入 `￥` 或千位分隔符，币种由 `priceCurrency` 单独表达。

### Q16：`availability: InStock` 是否等于数据库库存大于零？

在本课，它由固定 `available` 状态映射，只表达这份教学 Offer 当前可用。真实系统必须从权威交易状态生成，考虑预约、售出、缓存和并发，不能由浏览器按钮状态或营销人员手写决定。

### Q17：商品没有图片还能写 Product 吗？

Schema.org Product 可以描述商品，但具体搜索功能可能把图片列为必需或推荐属性。不能使用无关占位图骗过检查。本课宁可明确缺少真实可抓取图片和特定富结果资格，也不伪造资源。

### Q18：Rich Results Test 通过后多久会展示？

没有固定时间或展示保证。测试主要提供语法和部分功能资格反馈。实际还取决于部署后可访问性、抓取、索引、内容政策、页面质量和搜索系统的展示选择。

### Q19：客户端可以异步注入 JSON-LD 吗？

某些搜索系统支持渲染后读取，但异步失败、延迟、资源限制和快速变化数据会增加不确定性。公开商品价格和状态优先随初始 HTML 由 SSR 或预渲染输出，并用渲染检查工具复验。

### Q20：为什么查看 Elements 还要看 View Source？

Elements 是当前 DOM，可能已被脚本修改；View Source 是初始响应 HTML。比较二者可以判断元信息和正文是服务器已交付，还是依赖客户端脚本后补，也能发现脚本重复插入 canonical 或 robots。

### Q21：结构化数据可以包含页面折叠区域里的内容吗？

关键不是“是否首屏展开”，而是用户是否能真实访问、内容是否与页面主要主题相关，并符合目标搜索功能政策。不要用不可见数据提供正文没有的评论、价格或库存。对具体折叠、订阅或受限内容规则应查目标功能官方文档。

### Q22：正确 SEO 会提高多少排名？

无法从本课或单个标签给出数值。正确 URL、状态、HTML 和数据能减少发现与理解障碍，但排名和展示由搜索系统根据查询及大量信号决定。本课不提供排名或流量保证。

## 13. 扩展阅读

资料与兼容性说明核验日期：**2026-10-10**。HTML 是持续更新的 Living Standard，搜索系统文档和展示功能也会变化；生产实施前应重新核对目标搜索引擎、站点类型、地区和实际工具结果。

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

### Bing 与 Schema.org

- [Bing Webmaster Blog：Keeping Content Discoverable with Sitemaps in AI Powered Search](https://blogs.bing.com/webmaster/july-2025/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search)：核对 Bing 对 XML sitemap、真实 `lastmod`、robots.txt 声明和“不保证展示”的说明。
- [Schema.org `Product`](https://schema.org/Product)：核对商品类型及 `name`、`description`、`sku`、`itemCondition`、`offers` 等属性。
- [Schema.org `Offer`](https://schema.org/Offer)：核对 `price`、`priceCurrency`、`availability`、`url` 等属性和值类型。
- [Schema.org `InStock`](https://schema.org/InStock)：核对当前可用状态枚举。
- [Schema.org `OutOfStock`](https://schema.org/OutOfStock)：核对当前不可用状态枚举。
- [Schema.org `UsedCondition`](https://schema.org/UsedCondition)：核对二手成色枚举。

阅读官方资料时带着五个问题：

1. 这是 HTML/HTTP 标准，还是某个搜索引擎的产品政策？
2. 文档说的是抓取、索引、结果展示，还是其中一个阶段？
3. 这是必需属性、推荐属性，还是示例字段？
4. 工具通过证明的是语法、资格，还是实际展示？
5. 页面内容和业务数据能否证明每个声明真实？

## 我现在能做到什么

我能让一个公开商品 URL 通过真实链接被发现，以正确 HTTP 状态交付完整 HTML，并让 title、description、canonical、robots、sitemap、可见正文和结构化数据表达一致事实。我能从整数分和 UTC 时间生成静态 Product/Offer 数据，解析 JSON、诊断 soft 404 与客户端渲染故障，并拒绝用虚构评价、低价或库存换取测试通过。

我也能清楚说明边界：这些工作改善的是可发现、可抓取、可理解和可维护性，不保证搜索系统抓取、索引、排名或显示富结果。

## 单元导航

- [上一课：动态状态、焦点与媒体替代](02-dynamic-status-focus-media.md)
- [返回第七章入口](../07-accessibility-seo.md)
- [下一章：HTML 元素参考、历史与迁移](../08-html-element-reference.md)
- [返回 HTML 模块](../README.md)
