# 属性、dataset 与状态同步

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 同步 class、data-*、普通与布尔属性、ARIA、文字和可用性状态。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `DOM-008`、`DOM-009`、`DOM-010`、`DOM-011` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

同步 class、data-*、普通与布尔属性、ARIA、文字和可用性状态。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 DOM-008（classList）、DOM-009（dataset 与 data-*）、DOM-010（getAttribute、setAttribute、toggleAttribute）、DOM-011（内容属性与 DOM 属性）；
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
内存 Listing
  → createListingCard(listing)
  → DOM 节点

用户操作
  → 更新内存状态
  → syncCard(listing)
  → class / data-* / aria-* / text / disabled 同步
```

## 4. 核心理论

### 4.1 使用 `classList` 修改类集合

`element.classList` 提供一个类名 token 集合：

```js
const card = document.querySelector(".product-card");

card.classList.add("is-favorite");
card.classList.remove("is-loading");
card.classList.toggle("is-reserved");
card.classList.replace("tone-neutral", "tone-success");

console.assert(card.classList.contains("is-favorite"));
```

`toggle()` 的第二个参数适合从布尔状态确定界面：

```js
card.classList.toggle("is-favorite", isFavorite);
card.classList.toggle("is-reserved", listing.status === "reserved");
```

有第二个参数时：

- `true` 保证类存在；
- `false` 保证类不存在；
- 返回值是操作后该类是否存在。

这比无条件反转更适合渲染函数。无条件 `toggle("is-favorite")` 依赖 DOM 当前状态；若之前某一步漏改，DOM 会继续漂移。传入内存布尔值可以反复调用并得到同一结果。

不要把完整 `className` 字符串反复覆盖：

```js
// 容易误删布局类、测试类或其他状态类。
card.className = isFavorite ? "is-favorite" : "";
```

### 4.2 `dataset` 与 `data-*`

HTML 自定义数据属性：

```html
<article
  class="product-card"
  data-listing-id="listing-lamp-01"
  data-status="available"
></article>
```

JavaScript 中通过 `dataset` 读写：

```js
const card = document.querySelector(".product-card");

console.log(card.dataset.listingId); // "listing-lamp-01"
console.log(card.dataset.status);    // "available"

card.dataset.status = "reserved";
delete card.dataset.status;
```

名称映射：

```text
data-listing-id  ↔ dataset.listingId
data-created-at  ↔ dataset.createdAt
data-price-cents ↔ dataset.priceCents
```

所有值最终都是字符串：

```js
card.dataset.priceCents = 3900;
console.assert(card.dataset.priceCents === "3900");
```

边界：

- `data-*` 适合把稳定标识和界面状态附着在元素上；
- 它不是隐藏存储，Elements 面板可直接查看和修改；
- 不要存密码、令牌、私人信息或可信价格；
- 读到数值字符串时必须按明确规则解析和验证；
- 本课的权威页面状态仍在 JavaScript 内存对象与 `Set` 中，`dataset` 只是 DOM 投影。

### 4.3 普通属性与布尔属性

常用属性 API：

```js
const button = document.querySelector("button");

button.setAttribute("aria-pressed", "true");
console.assert(button.getAttribute("aria-pressed") === "true");
console.assert(button.hasAttribute("aria-pressed"));

button.removeAttribute("aria-pressed");
console.assert(button.getAttribute("aria-pressed") === null);
```

`setAttribute()` 把值转换为字符串。`getAttribute()` 返回字符串或 `null`，不会自动返回数字或布尔值。

`toggleAttribute(name, force)` 适合布尔内容属性：

```js
button.toggleAttribute("disabled", shouldDisable);
console.assert(button.hasAttribute("disabled") === shouldDisable);
```

布尔属性只看是否存在：

```html
<!-- 三个按钮都被禁用。 -->
<button disabled>一</button>
<button disabled="">二</button>
<button disabled="false">三</button>
```

因此下面写法错误：

```js
button.setAttribute("disabled", "false"); // 仍然禁用
```

正确写法：

```js
button.disabled = false;
// 或
button.removeAttribute("disabled");
// 或
button.toggleAttribute("disabled", false);
```

`aria-pressed` 不是同类布尔内容属性。它的值 `"true"`、`"false"`、`"mixed"` 有不同语义，不能用“移除代表 false”替代明确状态：

```js
button.setAttribute("aria-pressed", String(isFavorite));
```

### 4.4 内容属性与 DOM 属性

HTML 中写出的名称和值称为内容属性；JavaScript 对象上的成员称为 DOM 属性。很多 DOM 属性会反射内容属性，但并非全部都以同一种方式同步。

#### 简单反射

```html
<article id="card" title="查看商品"></article>
```

```js
const card = document.querySelector("#card");

console.assert(card.getAttribute("title") === "查看商品");
console.assert(card.title === "查看商品");

card.title = "查看详情";
console.assert(card.getAttribute("title") === "查看详情");
```

这里 `.title` 通常反射 `title` 内容属性。

#### 布尔反射

```js
const button = document.querySelector("button");

button.disabled = true;
console.assert(button.hasAttribute("disabled"));

button.disabled = false;
console.assert(!button.hasAttribute("disabled"));
```

属性是字符串存在性，DOM 属性是布尔值。

#### 输入框的默认值与当前值

```html
<input id="title-input" value="默认台灯">
```

页面刚加载时：

```js
const input = document.querySelector("#title-input");

console.assert(input.getAttribute("value") === "默认台灯");
console.assert(input.defaultValue === "默认台灯");
console.assert(input.value === "默认台灯");
```

用户把输入改成“用户当前输入”后：

```js
console.log(input.getAttribute("value")); // 通常仍是 "默认台灯"
console.log(input.defaultValue);          // "默认台灯"
console.log(input.value);                 // "用户当前输入"
```

含义：

- `value` 内容属性提供初始/默认值；
- `.defaultValue` 反射默认值；
- `.value` 是当前值；
- 表单重置会尝试把当前值恢复到默认值；
- 不应从 `getAttribute("value")` 读取用户当前输入。

#### 复选框的默认选中与当前选中

```html
<input id="favorite" type="checkbox" checked>
```

```js
const checkbox = document.querySelector("#favorite");

console.assert(checkbox.getAttribute("checked") === "");
console.assert(checkbox.defaultChecked === true);
console.assert(checkbox.checked === true);
```

用户取消选中后，`.checked` 变为 `false`，但 `checked` 内容属性和 `.defaultChecked` 仍表示默认状态。类似地，`option` 有 `selected` 内容属性、`.defaultSelected` 与当前 `.selected`。

#### 当前值与默认值对照

| HTML 概念 | 默认/内容状态 | 当前 DOM 状态 |
| --- | --- | --- |
| 文本输入值 | `value` 属性、`.defaultValue` | `.value` |
| 复选框选中 | `checked` 属性、`.defaultChecked` | `.checked` |
| 选项选中 | `selected` 属性、`.defaultSelected` | `.selected` |
| 按钮禁用 | `disabled` 属性 | `.disabled`，通常直接反射 |
| details 展开 | `open` 属性 | `.open`，通常直接反射 |

不要建立“属性永远初始、DOM 属性永远当前”的过度简化规则。很多属性直接反射；表单值因为用户交互和重置机制才有明确默认/当前分层。遇到具体 API 应查该元素规范。

### 4.5 从一个状态同步类、ARIA、文字与可用性

收藏按钮至少有四种界面表达：

1. 内存中的收藏布尔值；
2. 卡片的视觉类；
3. 按钮的 `aria-pressed`；
4. 按钮可见文字。

若分别在不同位置修改，很容易漂移。应集中到一个同步函数：

```js
function syncFavoriteView(card, button, isFavorite) {
  card.classList.toggle("is-favorite", isFavorite);
  card.dataset.favorite = String(isFavorite);
  button.setAttribute("aria-pressed", String(isFavorite));
  button.textContent = isFavorite ? "取消收藏" : "收藏";
}
```

调用方先更新内存状态，再渲染：

```js
favoriteIds.add(listingId);
syncFavoriteView(card, button, favoriteIds.has(listingId));
```

不要从类名反推业务状态：

```js
// 脆弱：样式类一旦被其他逻辑改变，业务状态也被误判。
const isFavorite = card.classList.contains("is-favorite");
```

本课完整案例使用 `Set` 保存收藏 ID，使用 Listing 对象保存商品状态和是否精选。DOM 只展示这些状态。

### 4.6 空查询诊断要检查选择器、时机和范围

下面代码会在查询为空时立即失败，并给出可定位信息：

```js
function mustQuery(selector, root = document) {
  const element = root.querySelector(selector);

  if (!element) {
    throw new Error(`缺少必需元素：${selector}`);
  }

  return element;
}
```

空查询常见原因：

1. **拼写错误**：HTML 是 `id="listing-list"`，脚本查 `#listings-list`；
2. **执行过早**：脚本位于目标元素之前，且没有 `defer`；
3. **范围错误**：从错误卡片内部查询另一个区域；
4. **元素已替换**：变量仍指向被 `replaceWith()` 移除的旧节点；
5. **条件结构不存在**：某状态下该元素本来就不渲染；
6. **选择器无效**：此时会抛 `SyntaxError`，不是返回 `null`；
7. **动态 ID 未转义**：冒号、点号等被解释成选择器语法；
8. **iframe 或 Shadow DOM 边界**：当前 `document` 不是目标树。

诊断顺序：

```text
Console 查看第一条错误
  → Elements 确认元素是否真的存在
  → 在 Console 单独执行选择器
  → 检查脚本位置/defer
  → 检查查询 root
  → 检查元素是否被替换
  → 最后才修改业务逻辑
```

可选元素可以用显式分支：

```js
const optionalHelp = document.querySelector("#price-help");

if (optionalHelp) {
  optionalHelp.hidden = false;
}
```

不要用可选链把必需结构的错误全部吞掉。必需元素缺失应尽早失败；可选增强才适合跳过。

### 4.7 渐进增强：先有可读内容，再增加内存交互

若商品信息对完成任务是必要的，基线 HTML 应先提供可读内容。脚本加载成功后再替换为可交互列表：

```html
<ul id="listing-list">
  <li>
    <article>
      <h2>书桌灯</h2>
      <p>39.00 元，仅为静态基线内容。</p>
    </article>
  </li>
</ul>
```

增强脚本先在文档外构建完整节点，确认创建成功后才一次替换：

```js
const nextItems = listings.map(createListingItem);
listingList.replaceChildren(...nextItems);
```

这样：

- JavaScript 禁用或下载失败时，基础商品仍可读；
- 增强成功后，内存数据成为当前列表来源；
- 创建过程中若先抛错，原基线内容不必提前清空；
- 页面没有把“能点按钮”误写成“已完成服务器操作”。

渐进增强不等于所有功能都能无脚本完成。本课收藏和移动本来就是内存演示；无脚本时保留可读商品与真实导航即可。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `DOM-008`：classList
- `DOM-009`：dataset 与 data-*
- `DOM-010`：getAttribute、setAttribute、toggleAttribute
- `DOM-011`：内容属性与 DOM 属性

## 6. 最小可运行案例

在个人练习目录中新建 `practice/06-dom-attributes-dataset-state-sync/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 DOM-008（classList） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 DOM-009（dataset 与 data-*） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 为 DOM-010（getAttribute、setAttribute、toggleAttribute） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
5. 为 DOM-011（内容属性与 DOM 属性） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
6. 在打开页面前写下预期 DOM、默认行为或请求结果；
7. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
8. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

### 7.1 案例目标与边界

现在把分散 API 组合成一个完整内存列表。页面支持：

- 从代码内初始数组创建商品卡；
- 标题和描述始终按纯文本插入；
- 添加一条用户输入的本地商品；
- 收藏/取消收藏，并同步类、`data-favorite`、`aria-pressed` 和按钮文字；
- 在售/已预约切换，并同步类、`data-status`、状态文字、按钮状态；
- 把既有商品节点移入精选区或移回普通区；
- 从 DOM 与内存数组中删除商品；
- 使用 `replaceChildren()` 在增强成功后替换静态基线；
- 使用整数分保存金额，使用 `toISOString()` 生成 UTC 时间；
- 刷新后恢复初始数组。

它明确**没有**：

- 真实用户身份和所有者授权；
- API、网络写入或数据库；
- CSRF 防护；
- 多人预约唯一约束；
- 服务端时间和版本冲突；
- 跨刷新收藏；
- 富文本商品描述。

### 7.2 文件位置

在同一练习目录新增：

```text
market-learning/
└── practice/
    └── html-12-dom-query-mutation/
        ├── index.html
        ├── neighbor-market.html
        └── assertions.js
```

### 7.3 完整文件：内存商品列表

文件 `practice/html-12-dom-query-mutation/neighbor-market.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>邻里集市内存商品列表</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, sans-serif;
        line-height: 1.6;
      }

      body {
        max-width: 68rem;
        margin: 0 auto;
        padding: 1rem;
      }

      form,
      .panel,
      .product-card {
        padding: 1rem;
        border: 1px solid #777;
        border-radius: 0.6rem;
      }

      form {
        display: grid;
        gap: 0.75rem;
        margin-block: 1rem;
      }

      label {
        font-weight: 700;
      }

      input,
      textarea,
      button {
        font: inherit;
      }

      input,
      textarea {
        box-sizing: border-box;
        width: 100%;
        padding: 0.55rem;
      }

      .listing-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
        gap: 1rem;
        padding: 0;
        list-style: none;
      }

      .product-card {
        height: 100%;
        box-sizing: border-box;
      }

      .product-card.is-favorite {
        border-width: 3px;
        border-color: #9b5c00;
      }

      .product-card.is-reserved {
        opacity: 0.78;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .status-badge {
        display: inline-block;
        padding-inline: 0.45rem;
        border: 1px solid currentColor;
        border-radius: 999px;
      }

      .boundary {
        padding: 0.75rem;
        border-inline-start: 0.3rem solid #9b5c00;
      }
    </style>
  </head>
  <body>
    <header>
      <h1>邻里集市：内存商品列表</h1>
      <p class="boundary">
        本页没有网络请求和持久化。刷新后，新增、收藏、移动、预约和删除全部重置。
      </p>
    </header>

    <main>
      <section aria-labelledby="add-heading">
        <h2 id="add-heading">添加本地演示商品</h2>
        <form id="new-listing-form">
          <div>
            <label for="new-title">标题</label>
            <input
              id="new-title"
              name="title"
              required
              maxlength="60"
              value="儿童桌 <可折叠>"
            >
          </div>

          <div>
            <label for="new-description">描述</label>
            <textarea
              id="new-description"
              name="description"
              required
              maxlength="180"
            >输入中的标签外形只会作为文字显示。</textarea>
          </div>

          <div>
            <label for="new-price-cents">价格（人民币分）</label>
            <input
              id="new-price-cents"
              name="priceCents"
              type="number"
              min="0"
              max="100000000"
              step="1"
              required
              value="8800"
            >
          </div>

          <button type="submit">加入当前页面</button>
        </form>
      </section>

      <p id="page-status" role="status">
        尚未执行内存操作。
      </p>

      <section id="featured-section" class="panel" aria-labelledby="featured-heading" hidden>
        <h2 id="featured-heading">精选商品</h2>
        <ul id="featured-list" class="listing-grid"></ul>
      </section>

      <section class="panel" aria-labelledby="available-heading">
        <h2 id="available-heading">全部商品</h2>
        <ul id="available-list" class="listing-grid">
          <li>
            <article>
              <h3>书桌灯</h3>
              <p>39.00 元。JavaScript 不可用时仍可阅读的静态基线。</p>
            </article>
          </li>
        </ul>
      </section>

      <section aria-labelledby="evidence-heading">
        <h2 id="evidence-heading">当前内存证据</h2>
        <pre id="state-evidence">脚本尚未输出状态。</pre>
      </section>
    </main>

    <script>
      "use strict";

      function mustQuery(selector, root = document) {
        const element = root.querySelector(selector);

        if (!element) {
          throw new Error(`缺少必需元素：${selector}`);
        }

        return element;
      }

      function formatCents(priceCents) {
        if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
          throw new RangeError("priceCents 必须是非负安全整数");
        }

        return `${(priceCents / 100).toFixed(2)} 元`;
      }

      function isUtcIso(value) {
        if (typeof value !== "string") {
          return false;
        }

        const timestamp = Date.parse(value);
        return (
          !Number.isNaN(timestamp) &&
          new Date(timestamp).toISOString() === value
        );
      }

      function formatUtcForUser(utcIso) {
        if (!isUtcIso(utcIso)) {
          throw new TypeError("createdAt 必须是可解析的 UTC ISO 字符串");
        }

        return new Intl.DateTimeFormat("zh-CN", {
          dateStyle: "medium",
          timeStyle: "short"
        }).format(new Date(utcIso));
      }

      const listings = [
        {
          id: "listing-lamp-01",
          title: "书桌灯 <九成新>",
          description: "暖色灯光；尖括号必须按用户文字显示。",
          priceCents: 3900,
          status: "available",
          featured: false,
          createdAt: "2026-10-10T08:30:00.000Z"
        },
        {
          id: "listing-chair-01",
          title: "折叠椅",
          description: "有正常使用痕迹，仅限当前页面演示预约。",
          priceCents: 2500,
          status: "reserved",
          featured: true,
          createdAt: "2026-10-09T14:15:00.000Z"
        }
      ];

      const favoriteIds = new Set();
      const cardPartsById = new Map();
      let nextLocalId = 1;

      const form = mustQuery("#new-listing-form");
      const titleInput = mustQuery("#new-title");
      const descriptionInput = mustQuery("#new-description");
      const priceInput = mustQuery("#new-price-cents");
      const pageStatus = mustQuery("#page-status");
      const featuredSection = mustQuery("#featured-section");
      const featuredList = mustQuery("#featured-list");
      const availableList = mustQuery("#available-list");
      const stateEvidence = mustQuery("#state-evidence");

      function listingById(listingId) {
        return listings.find((listing) => listing.id === listingId) ?? null;
      }

      function announce(message) {
        pageStatus.textContent = message;
      }

      function writeStateEvidence() {
        const evidence = listings.map((listing) => ({
          id: listing.id,
          priceCents: listing.priceCents,
          status: listing.status,
          featured: listing.featured,
          favorite: favoriteIds.has(listing.id),
          createdAt: listing.createdAt
        }));

        stateEvidence.textContent = JSON.stringify(evidence, null, 2);
      }

      function updateFeaturedVisibility() {
        featuredSection.hidden = featuredList.children.length === 0;
      }

      function syncCard(listing) {
        const parts = cardPartsById.get(listing.id);

        if (!parts) {
          throw new Error(`找不到商品卡节点：${listing.id}`);
        }

        const isFavorite = favoriteIds.has(listing.id);
        const isReserved = listing.status === "reserved";

        parts.article.classList.toggle("is-favorite", isFavorite);
        parts.article.classList.toggle("is-reserved", isReserved);
        parts.article.dataset.favorite = String(isFavorite);
        parts.article.dataset.status = listing.status;

        parts.favoriteButton.setAttribute(
          "aria-pressed",
          String(isFavorite)
        );
        parts.favoriteButton.textContent = isFavorite
          ? "取消收藏"
          : "收藏";

        parts.statusBadge.textContent = isReserved
          ? "已预约（仅内存）"
          : "可预约（仅内存）";

        parts.reserveButton.setAttribute(
          "aria-pressed",
          String(isReserved)
        );
        parts.reserveButton.textContent = isReserved
          ? "恢复可预约"
          : "标记为已预约";

        parts.moveButton.textContent = listing.featured
          ? "移回全部商品"
          : "移到精选商品";
      }

      function moveCardToCurrentSection(listing) {
        const parts = cardPartsById.get(listing.id);

        if (!parts) {
          throw new Error(`找不到待移动节点：${listing.id}`);
        }

        const targetList = listing.featured
          ? featuredList
          : availableList;

        targetList.prepend(parts.item);
        updateFeaturedVisibility();

        console.assert(
          parts.item.parentElement === targetList,
          "已有 li 应移动到目标列表"
        );
      }

      function createListingItem(listing) {
        if (!Number.isSafeInteger(listing.priceCents)) {
          throw new TypeError(`价格不是安全整数分：${listing.id}`);
        }

        if (!isUtcIso(listing.createdAt)) {
          throw new TypeError(`时间不是 UTC ISO：${listing.id}`);
        }

        const item = document.createElement("li");
        const article = document.createElement("article");
        const title = document.createElement("h3");
        const description = document.createElement("p");
        const price = document.createElement("data");
        const created = document.createElement("p");
        const createdTime = document.createElement("time");
        const statusBadge = document.createElement("p");
        const actions = document.createElement("div");
        const favoriteButton = document.createElement("button");
        const reserveButton = document.createElement("button");
        const moveButton = document.createElement("button");
        const removeButton = document.createElement("button");

        article.className = "product-card";
        article.dataset.listingId = listing.id;
        title.textContent = listing.title;
        description.append(document.createTextNode(listing.description));

        price.value = String(listing.priceCents);
        price.textContent = formatCents(listing.priceCents);

        created.append("创建时间：");
        createdTime.dateTime = listing.createdAt;
        createdTime.textContent = formatUtcForUser(listing.createdAt);
        created.append(createdTime);

        statusBadge.className = "status-badge";

        actions.className = "actions";

        favoriteButton.type = "button";
        favoriteButton.dataset.action = "favorite";

        reserveButton.type = "button";
        reserveButton.dataset.action = "reserve";

        moveButton.type = "button";
        moveButton.dataset.action = "move";

        removeButton.type = "button";
        removeButton.dataset.action = "remove";
        removeButton.textContent = "从当前页面删除";

        actions.append(
          favoriteButton,
          reserveButton,
          moveButton,
          removeButton
        );

        article.append(
          title,
          description,
          price,
          created,
          statusBadge,
          actions
        );
        item.append(article);

        cardPartsById.set(listing.id, {
          item,
          article,
          statusBadge,
          favoriteButton,
          reserveButton,
          moveButton
        });

        favoriteButton.addEventListener("click", () => {
          if (favoriteIds.has(listing.id)) {
            favoriteIds.delete(listing.id);
          } else {
            favoriteIds.add(listing.id);
          }

          syncCard(listing);
          writeStateEvidence();
          announce(
            favoriteIds.has(listing.id)
              ? `已在当前页面收藏“${listing.title}”。`
              : `已在当前页面取消收藏“${listing.title}”。`
          );
        });

        reserveButton.addEventListener("click", () => {
          listing.status =
            listing.status === "reserved"
              ? "available"
              : "reserved";

          syncCard(listing);
          writeStateEvidence();
          announce(
            listing.status === "reserved"
              ? `已把“${listing.title}”标记为内存预约。`
              : `已把“${listing.title}”恢复为内存可预约。`
          );
        });

        moveButton.addEventListener("click", () => {
          const sameItem = item;
          listing.featured = !listing.featured;
          moveCardToCurrentSection(listing);
          syncCard(listing);
          writeStateEvidence();

          console.assert(item === sameItem, "移动前后必须是同一节点");
          console.assert(
            document.querySelectorAll(
              `[data-listing-id="${listing.id}"]`
            ).length === 1,
            "移动不应复制商品卡"
          );

          moveButton.focus();
          announce(
            listing.featured
              ? `已把“${listing.title}”移动到精选商品。`
              : `已把“${listing.title}”移回全部商品。`
          );
        });

        removeButton.addEventListener("click", () => {
          const index = listings.findIndex(
            (candidate) => candidate.id === listing.id
          );

          if (index === -1) {
            throw new Error(`内存中找不到待删除商品：${listing.id}`);
          }

          const nextFocusTarget =
            item.nextElementSibling?.querySelector("button") ??
            item.previousElementSibling?.querySelector("button") ??
            form.querySelector("button");

          listings.splice(index, 1);
          favoriteIds.delete(listing.id);
          cardPartsById.delete(listing.id);
          item.remove();
          updateFeaturedVisibility();
          writeStateEvidence();
          nextFocusTarget?.focus();
          announce(
            `已从当前页面删除“${listing.title}”；刷新可恢复初始数据。`
          );
        });

        syncCard(listing);
        return item;
      }

      function renderInitialListings() {
        const featuredItems = [];
        const availableItems = [];

        cardPartsById.clear();

        for (const listing of listings) {
          const item = createListingItem(listing);

          if (listing.featured) {
            featuredItems.push(item);
          } else {
            availableItems.push(item);
          }
        }

        featuredList.replaceChildren(...featuredItems);
        availableList.replaceChildren(...availableItems);
        updateFeaturedVisibility();
        writeStateEvidence();

        console.assert(
          document.querySelectorAll(".product-card").length === listings.length
        );
      }

      form.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!form.reportValidity()) {
          announce("请先修正本地表单字段。");
          return;
        }

        const title = titleInput.value.trim();
        const description = descriptionInput.value.trim();
        const priceCents = Number(priceInput.value);

        if (title === "" || description === "") {
          announce("标题和描述去除首尾空白后不能为空。");
          return;
        }

        if (
          !Number.isSafeInteger(priceCents) ||
          priceCents < 0 ||
          priceCents > 100000000
        ) {
          announce("价格必须是 0 至 100000000 的安全整数分。");
          return;
        }

        const listing = {
          id: `local-listing-${nextLocalId}`,
          title,
          description,
          priceCents,
          status: "available",
          featured: false,
          createdAt: new Date().toISOString()
        };

        nextLocalId += 1;
        listings.push(listing);

        const item = createListingItem(listing);
        availableList.prepend(item);
        updateFeaturedVisibility();
        writeStateEvidence();

        console.assert(
          item.querySelector("h3").textContent === title,
          "用户标题应按原始文字显示"
        );
        console.assert(
          item.querySelector("h3").children.length === 0,
          "用户标题不应生成子元素"
        );
        console.assert(
          item.querySelector("time").dateTime.endsWith("Z"),
          "新时间应为 UTC ISO"
        );

        form.reset();
        item.querySelector("button").focus();
        announce(
          `已把“${listing.title}”加入当前页面；刷新后不会保留。`
        );
      });

      renderInitialListings();
      announce("内存商品列表已增强；所有操作只在当前页面有效。");

      console.assert(listingById("listing-lamp-01") !== null);
      console.assert(
        listings.every((listing) =>
          Number.isSafeInteger(listing.priceCents)
        )
      );
      console.assert(
        listings.every((listing) => isUtcIso(listing.createdAt))
      );
    </script>
  </body>
</html>
```

案例没有读写 `localStorage`、IndexedDB 或其他客户端数据库。“没有持久化”应由以下证据共同证明：

- 源码中没有 `localStorage.setItem()`、IndexedDB 或网络写入；
- Application 面板操作前后没有本案例新增键；
- Network 面板没有商品写请求；
- 刷新后恢复初始两条数据。

不要用 `localStorage.clear()` 作为“测试清理”，那会删除同源下与本案例无关的数据，也会把未使用持久化的案例变成主动操作持久化存储。

### 7.4 代码执行顺序

页面加载后：

```text
解析静态基线
  → 查询所有必需节点
  → 校验代码内 Listing 的整数分和 UTC 时间
  → 在文档外创建 li/article/文字/按钮
  → 建立 listing.id 到节点部件的 Map
  → syncCard() 首次同步全部状态
  → replaceChildren() 一次替换静态列表
  → 输出当前内存证据
```

收藏时：

```text
favoriteIds 增删 listing.id
  → syncCard()
  → 同步 class / data-favorite / aria-pressed / button text
  → 更新 JSON 证据与 role=status
```

移动时：

```text
listing.featured 反转
  → targetList.prepend(existingLi)
  → 原节点移动
  → syncCard() 更新按钮文字
  → 断言同一对象且页面仅有一个 listing-id
```

删除时：

```text
确定删除后焦点候选
  → 从 listings 数组删除
  → 从 favoriteIds 与 Map 删除
  → item.remove()
  → 更新分区可见性、证据和焦点
```

这里直接给每张卡绑定监听器，是为了把注意力放在 DOM 与状态同步；[本章第 7–9 课](07-event-listener-lifecycle-propagation.md)会依次处理监听器生命周期、嵌套点击目标和列表容器事件委托。

### 7.5 运行方法

保持同一服务器运行，打开：

```text
http://localhost:8000/neighbor-market.html
```

按以下顺序操作：

1. 确认初始两张卡和内存证据；
2. 收藏书桌灯；
3. 把书桌灯标记为已预约；
4. 把书桌灯移到精选，再移回；
5. 用默认标题“儿童桌 `<可折叠>`”新增商品；
6. 在 Elements 检查新增标题没有子元素；
7. 删除新增商品；
8. 刷新页面。

全过程同时打开：

- Elements：观察节点位置、类名和属性；
- Console：观察断言与异常；
- Network：确认没有商品 API 请求；
- Application：确认案例没有写持久化键；
- Accessibility：观察收藏按钮的 pressed 状态和名称。

按 `Control+C` 停止服务器。

### 7.6 预期结果

- 初始金额以 `39.00 元`、`25.00 元` 显示，内存仍保存 `3900`、`2500`；
- UTC 字符串写入 `time[datetime]`，可见时间按用户环境本地化；
- 标题中的尖括号按文字显示；
- 收藏后卡片增加 `is-favorite`，`data-favorite="true"`，按钮 `aria-pressed="true"`，文字变为“取消收藏”；
- 预约后卡片增加 `is-reserved`，`data-status="reserved"`，状态文字和按钮文字同步；
- 移动商品时页面始终只有一个相同 `data-listing-id` 的元素；
- 精选列表为空时整个精选区 `hidden`；
- 新增标题不会产生意外子元素；
- 删除后相邻按钮或表单提交按钮接收焦点；
- Network 没有商品写请求；
- 刷新后所有交互结果消失，恢复代码内两条商品。

关键 Console 复验：

```js
const lamp = document.querySelector(
  '[data-listing-id="listing-lamp-01"]'
);

console.assert(lamp !== null);
console.assert(
  lamp.classList.contains("is-favorite") ===
    (lamp.dataset.favorite === "true")
);

const favoriteButton = lamp.querySelector(
  '[data-action="favorite"]'
);

console.assert(
  favoriteButton.getAttribute("aria-pressed") ===
    lamp.dataset.favorite
);
```

### 7.7 纯函数断言

把不依赖 DOM 的金额与 UTC 规则放进单独文件，可以直接用 Node 运行。文件 `practice/html-12-dom-query-mutation/assertions.js`：

```js
"use strict";

function formatCents(priceCents) {
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw new RangeError("priceCents 必须是非负安全整数");
  }

  return `${(priceCents / 100).toFixed(2)} 元`;
}

function isUtcIso(value) {
  if (typeof value !== "string") {
    return false;
  }

  const timestamp = Date.parse(value);
  return (
    !Number.isNaN(timestamp) &&
    new Date(timestamp).toISOString() === value
  );
}

console.assert(formatCents(0) === "0.00 元");
console.assert(formatCents(1) === "0.01 元");
console.assert(formatCents(3900) === "39.00 元");
console.assert(isUtcIso("2026-10-10T08:30:00.000Z"));
console.assert(!isUtcIso("2026-10-10T08:30:00"));
console.assert(!isUtcIso("not-a-date"));

let rejectedFraction = false;

try {
  formatCents(39.5);
} catch (error) {
  rejectedFraction =
    error instanceof RangeError &&
    error.message.includes("安全整数");
}

console.assert(rejectedFraction);
console.log("DOM 课程纯函数断言完成");
```

运行：

```bash
cd market-learning/practice/html-12-dom-query-mutation
node --check assertions.js
node assertions.js
```

预期：

```text
DOM 课程纯函数断言完成
```

不应出现 `Assertion failed`。若断言失败，不要删除断言或把预期改成错误结果；先检查整数分和 UTC 规则。

### 7.8 渐进增强与服务端接力

当前静态基线保证脚本失败时至少能读到一条商品。增强脚本成功后，内存数组驱动当前界面。真实产品接力时还需要：

| 当前教学行为 | 真实系统职责 |
| --- | --- |
| 代码内 `listings` | `GET /api/v1/listings` 返回并经过运行时验证 |
| 本地新增对象 | 登录、CSRF、服务端校验、`POST /listings`、数据库事务 |
| 本地收藏 `Set` | 幂等 `PUT/DELETE /favorites/:listingId` 与用户隔离 |
| 本地预约切换 | 服务端授权和数据库唯一/并发约束 |
| `new Date().toISOString()` | 服务端生成可信创建时间 |
| 本地删除节点 | 授权、版本比较、服务端删除/状态变更成功后再更新 UI |
| `dataset.listingId` | 仅作为请求标识输入，服务端重新校验存在性和权限 |

在服务器确认前，页面应显示“正在处理”或“本地演示”，不能先宣布持久化成功。

## 8. 常见错误与排查路径

### 8.1 空查询后直接访问属性

错误：

```js
document.querySelector("#listing-lsit").replaceChildren();
```

排查：

```text
现象：Cannot read properties of null
证据：Console 指向 replaceChildren
原因：listing-list 拼写错误
修复：Elements 复制真实 ID，使用 mustQuery()
复验：查询返回元素，错误消失
```

不要改成 `?.replaceChildren()` 后声称修复。列表是必需结构，静默跳过只会把错误推迟。

### 8.2 `firstChild` 或 `nextSibling` 命中空白文本

证据：

```js
console.log(node.nodeType, node.nodeName);
```

`nodeType === Node.TEXT_NODE` 表示文本节点。商品卡导航改用 `firstElementChild` 或 `nextElementSibling`。不要删除所有 HTML 换行来掩盖模型误解。

### 8.3 `disabled="false"` 仍然禁用

证据：

```js
console.log(button.hasAttribute("disabled")); // true
console.log(button.disabled);                 // true
```

修复：

```js
button.disabled = false;
// 或 button.toggleAttribute("disabled", false);
```

ARIA 字符串状态不能照搬此规则；`aria-pressed="false"` 是有效的明确状态。

### 8.4 读取 `getAttribute("value")` 得不到当前输入

现象：用户改了标题，脚本仍读到默认标题。

证据：

```js
console.table({
  attribute: input.getAttribute("value"),
  defaultValue: input.defaultValue,
  currentValue: input.value
});
```

修复：业务提交读取 `.value`；需要表单默认值时读取 `.defaultValue`。复验用户编辑后两者有意不同，`form.reset()` 后当前值恢复。

### 8.5 类、ARIA 和文字不同步

现象：卡片视觉上已收藏，但按钮仍朗读“未按下”，文字仍是“收藏”。

证据：

```js
console.table({
  classFavorite: card.classList.contains("is-favorite"),
  dataFavorite: card.dataset.favorite,
  ariaPressed: button.getAttribute("aria-pressed"),
  text: button.textContent
});
```

根因通常是多个处理分支各改一部分。修复为先更新 `favoriteIds`，再统一调用 `syncCard()`。验收不能只截图颜色。

### 8.6 把 `dataset` 数字当成数值

```js
card.dataset.priceCents = 3900;
console.log(card.dataset.priceCents + 100); // "3900100"
```

修复时用明确解析并验证：

```js
const priceCents = Number(card.dataset.priceCents);

if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
  throw new TypeError("无效整数分");
}
```

更重要的是，不要把 DOM 中的价格当成服务端可信价格。

## 9. 课后题

### 9.1 布尔属性

为什么 `button.setAttribute("disabled", "false")` 仍然禁用？`aria-pressed="false"` 是否也应删除？

<details>
<summary>参考答案</summary>

`disabled` 是布尔内容属性，存在即真，字符串内容不表示布尔假；应设置 `button.disabled = false` 或移除属性。`aria-pressed` 是有明确字符串状态的 ARIA 属性，`"false"` 表示可切换按钮当前未按下，不应套用布尔内容属性规则。

</details>

### 9.2 当前值与默认值

输入初始 `value="台灯"`，用户改成“书桌”。此时 `getAttribute("value")`、`.defaultValue` 和 `.value` 分别表达什么？

<details>
<summary>参考答案</summary>

前两者通常仍表达默认值“台灯”，`.value` 表达用户当前输入“书桌”。业务读取当前输入应使用 `.value`；表单重置会使用默认状态恢复。

</details>

### 9.3 状态同步

为什么收藏逻辑不应只执行 `card.classList.toggle("is-favorite")`？

<details>
<summary>参考答案</summary>

类名只覆盖视觉的一部分，且无条件反转依赖 DOM 旧状态。业务状态应先写入内存 `Set`，再由统一同步函数根据布尔结果设置类、`data-*`、`aria-pressed` 和按钮文字。这样重复渲染仍是确定的。

</details>

### 9.4 系统边界

DOM 中 `data-status="reserved"` 能否证明商品已被真实预约？

<details>
<summary>参考答案</summary>

不能。`data-*` 可由任何页面脚本或 DevTools 修改。本课没有认证、API、数据库和并发约束。真实预约必须由服务端在当前身份、商品状态和唯一约束下原子确认，前端再根据成功响应更新界面。

</details>

## 10. 实践练习

### 10.1 进阶：扩展内存商品卡

文件：

```text
practice/html-12-dom-query-mutation/exercise-market.html
```

在完整邻里集市案例基础上增加：

- 一个 `sold` 状态；
- `sold` 卡增加 `is-sold` 类；
- 状态文字改为“已售出（仅内存）”；
- 预约按钮设置真实 `disabled` 布尔属性；
- 收藏按钮仍保留明确 `aria-pressed`；
- 新增商品标题包含 `<mark>用户文字</mark>` 时只显示文本；
- 增加“移到列表末尾”动作，证明仍是移动；
- 删除卡片后焦点落在合理位置；
- 精选区为空时 `hidden`，有卡时恢复；
- 所有金额保持安全整数分；
- 所有时间保持 UTC ISO，界面按本地时区显示；
- 刷新后状态全部重置。

验收断言至少包括：

```js
console.assert(
  soldCard.classList.contains("is-sold") ===
    (soldCard.dataset.status === "sold")
);
console.assert(soldButton.disabled);
console.assert(soldButton.hasAttribute("disabled"));
console.assert(title.children.length === 0);
console.assert(document.querySelectorAll(
  `[data-listing-id="${listing.id}"]`
).length === 1);
```

不要加入持久化。Network 应无商品写请求，Application 应无本练习新增状态。

## 11. 阶段验收

### 属性与状态

- [ ] `classList.toggle(name, force)` 由内存状态驱动；
- [ ] `dataset` 名称映射和值字符串边界可解释；
- [ ] 普通属性、布尔内容属性和 ARIA 字符串状态没有混淆；
- [ ] 能演示 `value/defaultValue` 与 `checked/defaultChecked`；
- [ ] 收藏状态的类、data、ARIA 和可见文字同步；
- [ ] 售出或不可操作状态使用真实 DOM 属性禁用。

### 邻里集市契约

- [ ] `priceCents` 始终是非负安全整数；
- [ ] `createdAt` 始终是带 `Z` 的 UTC ISO 字符串；
- [ ] 可见时间明确按用户环境展示；
- [ ] 页面操作均标明仅内存；
- [ ] Network 无商品写请求；
- [ ] 没有 `localStorage`、IndexedDB 或其他持久化写入；
- [ ] 刷新后恢复初始数据；
- [ ] 未宣称完成认证、授权、CSRF、事务或并发预约。

## 12. 常见问题

### Q5：`closest()` 会检查元素自己吗？

会。它从元素自身开始，再逐级向父元素查找。`matches()` 只检查自身，不沿祖先链。

### Q11：`dataset` 能存对象吗？

不能直接保持对象类型。赋值会转成字符串，读回也是字符串。复杂状态应保存在 JavaScript 数据结构中，DOM 只附着稳定标识和必要界面状态。

### Q12：为什么 `aria-pressed` 和按钮文字都要更新？

`aria-pressed` 向辅助技术表达切换状态；可见文字帮助所有用户理解下一步动作或当前结果。CSS 类只影响视觉。它们应由同一个状态同步函数维护。

### Q13：设置 `.value` 会更新 `value` 内容属性吗？

不能笼统假设会。输入当前值和默认值有独立状态。用 `.value` 读写当前值，用 `.defaultValue` 或内容属性处理默认值，并通过实际控件与重置行为复验。

### Q14：为什么案例删除后还处理焦点？

若当前聚焦按钮随卡片一起删除，焦点可能落到 `body` 或不可预测位置。删除前先确定相邻操作或表单按钮，删除后恢复到合理位置，用户才能继续键盘操作。

### Q15：刷新后能否保留收藏？

本课明确不能，也不应偷偷加 `localStorage`。持久化会引入身份隔离、版本、过期、跨标签页同步和服务端一致性问题。真实收藏应按项目契约接入用户和 API。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：同步 class、data-*、普通与布尔属性、ARIA、文字和可用性状态。
- `DOM-008`：classList
- `DOM-009`：dataset 与 data-*
- `DOM-010`：getAttribute、setAttribute、toggleAttribute
- `DOM-011`：内容属性与 DOM 属性
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：节点创建、移动、删除与安全文本](05-dom-create-move-remove-safe-text.md) · [下一课：监听器生命周期与事件传播](07-event-listener-lifecycle-propagation.md) · [返回 HTML 模块](../README.md)
