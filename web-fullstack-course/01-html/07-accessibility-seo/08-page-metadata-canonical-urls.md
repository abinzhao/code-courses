# 页面元信息与 Canonical：让摘要和首选 URL 一致

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 编写可脱离上下文识别的 title 和 description，并声明与内容一致的 canonical。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `SEO-001`、`SEO-002` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

编写可脱离上下文识别的 title 和 description，并声明与内容一致的 canonical。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 SEO-001（title、description 与真实正文）、SEO-002（canonical 与 URL 规范化边界）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

### 3.1 预备材料 1

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

## 4. 核心理论

### 4.1 `<title>`：可以脱离页面上下文识别文档

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

### 4.2 meta description：准确摘要，不是隐藏广告位

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

### 4.3 canonical：重复内容的首选信号

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

### 5.2 观察工具

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

本章的完整项目代码集中在 [结构化数据与可见内容：从同一事实生成机器标注](10-structured-data-visible-content.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 SEO-001（title、description 与真实正文） 对应的元素、属性或状态；
- 在项目中实现并标出与 SEO-002（canonical 与 URL 规范化边界） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`10-structured-data-visible-content.md`](10-structured-data-visible-content.md)。

## 8. 常见错误与排查路径

### 8.1 canonical 指向不同商品

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

### 8.2 title、description 与正文不一致

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

### 8.3 多个或互相冲突的 canonical

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

## 9. 课后题

### 9.1 情景推理题

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

## 13. 扩展阅读

资料与兼容性说明核验日期：**2026-10-10**。HTML 是持续更新的 Living Standard，搜索系统文档和展示功能也会变化；生产实施前应重新核对目标搜索引擎、站点类型、地区和实际工具结果。

## 我现在能做到什么

- 能解释并验证：编写可脱离上下文识别的 title 和 description，并声明与内容一致的 canonical。
- `SEO-001`：title、description 与真实正文
- `SEO-002`：canonical 与 URL 规范化边界
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：缩放、触控、颜色与动效：守住视觉使用边界](07-zoom-touch-color-motion.md) · [下一课：抓取、索引、HTTP 与渲染：交付真实页面状态](09-crawling-indexing-http-rendering.md) · [返回 HTML 模块](../README.md)
