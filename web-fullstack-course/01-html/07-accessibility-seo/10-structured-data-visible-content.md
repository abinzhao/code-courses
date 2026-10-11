# 结构化数据与可见内容：从同一事实生成机器标注

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 用 Microdata 或 JSON-LD 表达与可见内容一致的结构化事实，并拒绝虚构富结果。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `SEO-006` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

用 Microdata 或 JSON-LD 表达与可见内容一致的结构化事实，并拒绝虚构富结果。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 SEO-006（Microdata、JSON-LD 与可见内容一致）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 结构化数据：词汇与编码语法分开理解

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

### 4.2 Microdata：在可见 HTML 上标注属性

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

### 4.3 JSON-LD：分离的数据图

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

### 4.4 可见内容一致性与虚构事实风险

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

### 4.5 没有排名或富结果保证

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

### 5.1 Microdata

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `itemscope` | 创建 item | `<article itemscope>` | 布尔属性，不写 `itemscope="false"` |
| `itemtype` | 指定类型 | `itemtype="https://schema.org/Product"` | 使用绝对 URL |
| `itemprop` | 声明属性 | `<h1 itemprop="name">…</h1>` | 值的来源取决于元素类型 |
| `itemid` | 声明全局标识 | `itemid="https://…#product"` | 语义由词汇定义，不能随意当 DOM id |
| `itemref` | 关联范围外属性 | `itemref="price"` | 增加维护成本，简单结构优先嵌套 |

### 5.2 可见机器值

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `<data value>` | 绑定机器值和可见文字 | `<data value="28000">280.00 元</data>` | 项目 value 可保留整数分；Schema price 需输出元字符串 |
| `<time datetime>` | 绑定机器时间 | `<time datetime="…Z">… UTC</time>` | 邻里集市存储使用 UTC ISO 8601 |
| `meta[content]` | 提供不可见机器值 | `<meta itemprop="priceCurrency" content="CNY">` | 不能用来藏虚构事实 |
| `link[itemprop][href]` | 提供 URL 枚举值 | `<link itemprop="availability" href="…">` | 不创建用户可导航正文链接 |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/10-structured-data-visible-content/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 SEO-006（Microdata、JSON-LD 与可见内容一致） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 在打开页面前写下预期 DOM、默认行为或请求结果；
4. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
5. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

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

### 8.1 JSON-LD 不是有效 JSON

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

### 8.2 虚构评价、低价或库存

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

## 9. 课后题

1. SEO-006（Microdata、JSON-LD 与可见内容一致）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

### 10.1 提升：让生成器支持两件商品

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

### 10.2 提升：比较 Microdata 与 JSON-LD

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

### 10.3 提交记录模板

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

### 11.1 SEO-006：Microdata、JSON-LD 与可见内容

- [ ] 能解释词汇与编码语法的区别；
- [ ] Microdata item、type、property 和嵌套关系正确；
- [ ] JSON-LD 可通过 `JSON.parse()`；
- [ ] Product 与 Offer 层级明确；
- [ ] 名称、说明、URL、价格、币种、成色和状态与正文一致；
- [ ] 价格由整数分在输出边界生成；
- [ ] 没有伪造 review、aggregateRating、价格或库存；
- [ ] 能解释测试工具通过不等于内容政策通过；
- [ ] 没有承诺富结果。

### 11.2 邻里集市数据契约

- [ ] Listing 保持 `priceCents: 28000`；
- [ ] 可见价格输出 `280.00 元`；
- [ ] JSON-LD price 输出 `"280.00"` 和 `CNY`；
- [ ] UTC 输入为 `2026-10-10T08:30:00.000Z`；
- [ ] `<time datetime>` 保留 UTC；
- [ ] status 同时驱动可见标签和 Offer availability；
- [ ] ownerId 未泄露；
- [ ] 静态教学状态没有冒充数据库库存；
- [ ] 没有声称实现支付、登录、授权、真实预约、评论或并发。

## 12. 常见问题

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

### Q21：结构化数据可以包含页面折叠区域里的内容吗？

关键不是“是否首屏展开”，而是用户是否能真实访问、内容是否与页面主要主题相关，并符合目标搜索功能政策。不要用不可见数据提供正文没有的评论、价格或库存。对具体折叠、订阅或受限内容规则应查目标功能官方文档。

### Q22：正确 SEO 会提高多少排名？

无法从本课或单个标签给出数值。正确 URL、状态、HTML 和数据能减少发现与理解障碍，但排名和展示由搜索系统根据查询及大量信号决定。本课不提供排名或流量保证。

## 13. 扩展阅读

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

- 能解释并验证：用 Microdata 或 JSON-LD 表达与可见内容一致的结构化事实，并拒绝虚构富结果。
- `SEO-006`：Microdata、JSON-LD 与可见内容一致
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：抓取、索引、HTTP 与渲染：交付真实页面状态](09-crawling-indexing-http-rendering.md) · [下一章](../08-html-element-reference/01-current-elements-by-responsibility.md) · [返回 HTML 模块](../README.md)
