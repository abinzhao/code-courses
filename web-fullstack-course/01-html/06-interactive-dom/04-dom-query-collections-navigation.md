# DOM 查询、集合与导航

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 查询当前 DOM，区分静态与动态集合，并沿节点和元素关系导航。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `DOM-001`、`DOM-002`、`DOM-003` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

查询当前 DOM，区分静态与动态集合，并沿节点和元素关系导航。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 DOM-001（getElementById、querySelector、querySelectorAll）、DOM-002（静态 NodeList 与动态集合）、DOM-003（节点/元素导航、closest、matches）；
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
稳定查询必需容器
  → 区分静态 NodeList 与动态 HTMLCollection
  → 从内存对象创建元素和文本节点
  → 插入、移动、替换或删除既有节点
  → 从单一内存状态同步 class、data-*、ARIA 和可见文字
  → 用 Elements、Console 与纯断言复验结果
```

## 4. 核心理论

### 4.1 DOM 是当前文档的对象树，不是源文件本身

服务器返回或本地文件提供 HTML 文本后，浏览器解析器会据此建立 DOM。开发者工具 Elements 面板显示的是**当前 DOM 的序列化视图**，它可能已经不同于最初源文本：

- 解析器可能补全省略的 `html`、`head` 或 `body`；
- 表格错误嵌套可能被纠正；
- JavaScript 可能新增、移动或删除节点；
- 表单当前值可能只存在 DOM 属性中，未写回内容属性；
- 浏览器扩展也可能改变页面。

下面两行代码操作的是当前文档对象：

```js
const heading = document.querySelector("h1");
heading.textContent = "今日邻里好物";
```

它们不会自动修改磁盘上的 `.html` 文件。刷新时，浏览器重新读取原始文件，脚本再从头执行。

DOM 类型形成继承关系：

```text
EventTarget
  └── Node
      ├── Document
      ├── DocumentFragment
      ├── Text
      └── Element
          └── HTMLElement
              ├── HTMLButtonElement
              ├── HTMLInputElement
              └── ...
```

因此：

- 每个元素都是节点；
- 文本和注释是节点，但不是元素；
- 元素拥有类名、属性和 `matches()` 等元素 API；
- 文本节点有 `textContent`，却没有 `classList`。

观察方法：

```js
const title = document.querySelector("h1");
console.log(title instanceof Node);        // true
console.log(title instanceof Element);     // true
console.log(title.firstChild instanceof Text); // 取决于标题内容
```

### 4.2 三种常用查询 API

#### `document.getElementById(id)`

按精确 ID 查询整个文档：

```js
const list = document.getElementById("listing-list");
```

特点：

- 参数只是 ID 字符串，不写 `#`；
- 返回一个 `Element` 或 `null`；
- `Document` 提供该方法，普通元素不提供同名的局部 ID 查询；
- 重复 ID 属于文档错误，不应依赖浏览器“碰巧返回哪一个”。

错误：

```js
document.getElementById("#listing-list");
```

这里会查找字面 ID `#listing-list`，通常返回 `null`。

#### `root.querySelector(selector)`

返回范围内第一个匹配 CSS 选择器的元素：

```js
const firstAvailable = document.querySelector(
  '.product-card[data-status="available"]'
);

const favoriteButton = firstAvailable?.querySelector(
  'button[data-action="favorite"]'
);
```

特点：

- 可以从 `document`、某个 `Element` 或 `DocumentFragment` 开始查询；
- 没有匹配时返回 `null`；
- 选择器语法无效时不是返回 `null`，而是抛出 `DOMException: SyntaxError`；
- 只返回第一个匹配项。

若选择器的一部分来自外部标识符，不能直接拼接：

```js
const unsafeId = 'listing:lamp.1';
const element = document.querySelector(`#${CSS.escape(unsafeId)}`);
```

更简单的做法是：可控 ID 使用稳定命名；业务标识放进 `data-listing-id`，查询后再比较 `dataset`，避免把不可信字符串直接变成选择器程序。

#### `root.querySelectorAll(selector)`

返回范围内所有当前匹配元素组成的静态 `NodeList`：

```js
const cards = document.querySelectorAll(".product-card");

for (const card of cards) {
  console.log(card.dataset.listingId);
}
```

没有匹配时返回长度为 `0` 的 `NodeList`，不是 `null`。无效选择器仍会抛出 `SyntaxError`。

选择依据：

| 需求 | API | 零匹配结果 |
| --- | --- | --- |
| 文档中唯一、稳定的 ID | `getElementById("id")` | `null` |
| 第一个复杂选择器匹配 | `querySelector("selector")` | `null` |
| 当前全部复杂选择器匹配 | `querySelectorAll("selector")` | 空静态 `NodeList` |

查询成功只证明当前 DOM 有匹配，不证明数据合法、用户有权限或服务器也存在该商品。

### 4.3 静态 `NodeList` 与动态 `HTMLCollection`

`querySelectorAll()` 返回的是**静态快照**：

```js
const snapshot = document.querySelectorAll(".product-card");
const card = document.createElement("article");
card.className = "product-card";
document.body.append(card);

console.log(snapshot.length); // 仍是查询当时的长度
```

`getElementsByClassName()`、`getElementsByTagName()` 与元素的 `children` 通常返回**动态 `HTMLCollection`**：

```js
const liveCards = document.getElementsByClassName("product-card");
const before = liveCards.length;

const card = document.createElement("article");
card.className = "product-card";
document.body.append(card);

console.assert(liveCards.length === before + 1);
```

“`NodeList` 静态、`HTMLCollection` 动态”是便于入门的近似，不是完整规则。反例是 `node.childNodes`：它返回动态 `NodeList`。判断时应看具体 API 的规范，而不是只看类型名。

两类集合都不是普通数组：

- `NodeList` 通常可 `for...of`，现代实现也有 `forEach()`；
- `HTMLCollection` 可按索引访问，但不要假设有数组的 `map()`、`filter()`；
- 需要稳定副本和数组方法时使用 `[...collection]` 或 `Array.from(collection)`。

动态集合最常见的错误是边遍历边删除：

```js
// 错误：每删除一项，后续元素会向前补位，索引再加一会跳过元素。
const cards = document.getElementsByClassName("expired");

for (let index = 0; index < cards.length; index += 1) {
  cards[index].remove();
}
```

正确做法是先拍快照：

```js
const expiredCards = [
  ...document.getElementsByClassName("expired")
];

for (const card of expiredCards) {
  card.remove();
}
```

也可以一直删除第 `0` 项，但先转成稳定数组通常更容易审查。

### 4.4 节点导航与元素导航

考虑以下 HTML：

```html
<ul id="list">
  <li>台灯</li>
  <li>折叠椅</li>
</ul>
```

开始标签后的换行和空格通常会形成文本节点。因此：

```js
const list = document.querySelector("#list");

console.log(list.childNodes);        // Text、LI、Text、LI、Text
console.log(list.children);          // 两个 LI
console.log(list.firstChild);        // 常常是空白 Text
console.log(list.firstElementChild); // 第一个 LI
```

常用对照：

| 节点导航 | 元素导航 | 差异 |
| --- | --- | --- |
| `parentNode` | `parentElement` | Document 等节点没有父元素 |
| `childNodes` | `children` | 前者包含文本、注释等 |
| `firstChild` | `firstElementChild` | 前者可能是空白文本 |
| `lastChild` | `lastElementChild` | 同上 |
| `previousSibling` | `previousElementSibling` | 前者可能是文本或注释 |
| `nextSibling` | `nextElementSibling` | 前者可能是文本或注释 |

若任务是“下一张商品卡”，优先使用元素导航；若任务是文本编辑器、语法树或需要保留注释，就必须使用节点导航。

#### `matches(selector)`

检查**当前元素自身**是否匹配选择器：

```js
const card = document.querySelector(".product-card");
console.assert(card.matches('[data-status="available"]'));
```

它不搜索子孙，也不向上查祖先。

#### `closest(selector)`

从当前元素自身开始，沿祖先方向返回第一个匹配元素：

```js
const icon = document.querySelector(".favorite-icon");
const card = icon.closest(".product-card");
```

`closest()` 包含自身。没有匹配时返回 `null`。在一个按钮里点击嵌套图标时，它可以帮助找到按钮或商品卡；[本章第 9 课](09-event-delegation-synthetic-events.md)会把它用于事件委托。

边界：

- `closest()` 只沿祖先链查找，不搜索兄弟或子孙；
- 得到元素后还应确认它属于预期容器，例如 `list.contains(card)`；
- 选择器无效仍会抛出 `SyntaxError`；
- 它解决结构定位，不解决权限和数据可信度。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `getElementById()` | 按文档 ID 查询 | `document.getElementById("list")` | 参数不含 `#`；无结果为 `null` |
| `querySelector()` | 返回首个 CSS 匹配 | `root.querySelector(".card")` | 无结果为 `null`；无效选择器抛错 |
| `querySelectorAll()` | 返回当前全部匹配 | `root.querySelectorAll(".card")` | 返回静态 `NodeList` |
| `getElementsByClassName()` | 按类名查询 | `root.getElementsByClassName("card")` | 返回动态 `HTMLCollection` |
| `childNodes` | 所有直接子节点 | `node.childNodes` | 动态 `NodeList`，含文本和注释 |
| `children` | 所有直接子元素 | `element.children` | 动态 `HTMLCollection` |
| `firstChild` | 第一个子节点 | `node.firstChild` | 可能是空白文本 |
| `firstElementChild` | 第一个子元素 | `element.firstElementChild` | 无元素时为 `null` |
| `nextSibling` | 下一个兄弟节点 | `node.nextSibling` | 可能是文本或注释 |
| `nextElementSibling` | 下一个兄弟元素 | `element.nextElementSibling` | 无元素时为 `null` |
| `matches()` | 检查元素自身 | `card.matches(".active")` | 不搜索祖先或后代 |
| `closest()` | 自身向祖先查找 | `icon.closest("button")` | 无结果为 `null` |
| `createElement()` | 创建元素节点 | `document.createElement("article")` | 创建后尚未自动连接 |
| `createTextNode()` | 创建纯文本节点 | `document.createTextNode(title)` | 不进行 HTML 解析 |
| `textContent` | 读写节点文本 | `title.textContent = userText` | 设置时移除原子节点 |
| `innerHTML` | 解析/序列化 HTML 片段 | `box.innerHTML = trustedHtml` | 不可信字符串会形成注入风险 |
| `append()` | 内部末尾插入 | `parent.append(node, "text")` | 已有节点会移动 |
| `prepend()` | 内部开头插入 | `parent.prepend(node)` | 已有节点会移动 |
| `before()` | 当前节点之前插入 | `element.before(note)` | 需要当前节点有父级 |
| `after()` | 当前节点之后插入 | `element.after(note)` | 同上 |
| `remove()` | 从父级移除自身 | `element.remove()` | 不删除内存对象或服务器数据 |
| `replaceWith()` | 替换当前节点 | `old.replaceWith(next)` | 原变量仍指向旧节点 |
| `replaceChildren()` | 替换全部子节点 | `list.replaceChildren(...items)` | 注意焦点和状态丢失 |
| `isConnected` | 判断节点是否连入文档 | `node.isConnected` | 只能说明 DOM 连接状态 |
| `classList` | 管理类名 token | `card.classList.toggle("x", on)` | 不应作为唯一业务状态 |
| `dataset` | 读写 `data-*` | `card.dataset.listingId` | 值为字符串且不可信 |
| `getAttribute()` | 读取内容属性 | `el.getAttribute("title")` | 返回字符串或 `null` |
| `setAttribute()` | 设置内容属性 | `el.setAttribute("role", "status")` | 值会转成字符串 |
| `hasAttribute()` | 判断属性存在 | `el.hasAttribute("disabled")` | 适合布尔属性存在性 |
| `removeAttribute()` | 删除内容属性 | `el.removeAttribute("disabled")` | 删除与设空字符串不同 |
| `toggleAttribute()` | 切换属性存在性 | `el.toggleAttribute("hidden", hide)` | 适合布尔内容属性 |
| `.value` | 表单控件当前值 | `input.value` | 不等于 `value` 内容属性 |
| `.defaultValue` | 输入默认值 | `input.defaultValue` | 通常反射 `value` 内容属性 |
| `.checked` | 当前选中状态 | `checkbox.checked` | 布尔值 |
| `.defaultChecked` | 默认选中状态 | `checkbox.defaultChecked` | 通常反射 `checked` 属性 |

## 6. 最小可运行案例

### 6.1 文件位置

在个人练习目录创建：

```text
market-learning/
└── practice/
    └── html-12-dom-query-mutation/
        └── index.html
```

本实验同时观察查询结果、集合变化、元素导航、安全文本、插入位置、节点移动、替换和删除。

### 6.2 完整文件：DOM 操作台

文件 `practice/html-12-dom-query-mutation/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>DOM 查询与修改实验</title>
    <style>
      body {
        max-width: 54rem;
        margin: 0 auto;
        padding: 1rem;
        font-family: system-ui, sans-serif;
        line-height: 1.6;
      }

      .shelf {
        min-height: 5rem;
        padding: 1rem;
        border: 2px dashed #8a8a8a;
      }

      .product-card {
        margin-block: 0.75rem;
        padding: 1rem;
        border: 1px solid #777;
        border-radius: 0.5rem;
      }

      .product-card.is-featured {
        border-color: #7a4b00;
        background: #fff8df;
      }

      .badge {
        display: inline-block;
        padding-inline: 0.4rem;
        border: 1px solid currentColor;
      }

      code {
        overflow-wrap: anywhere;
      }
    </style>
  </head>
  <body>
    <h1>DOM 查询与修改实验</h1>
    <p id="baseline-note">
      如果脚本失败，这张静态商品卡仍然可读。
    </p>

    <h2>普通商品</h2>
    <section id="regular-shelf" class="shelf" aria-label="普通商品">
      <article
        class="product-card"
        data-listing-id="listing-chair-01"
        data-status="available"
      >
        <h3>静态折叠椅</h3>
        <p>25.00 元</p>
      </article>
    </section>

    <h2>精选商品</h2>
    <section id="featured-shelf" class="shelf" aria-label="精选商品"></section>

    <h2>观察日志</h2>
    <ol id="log">
      <li>脚本尚未写入观察结果。</li>
    </ol>

    <script>
      "use strict";

      function mustQuery(selector, root = document) {
        const element = root.querySelector(selector);

        if (!element) {
          throw new Error(`缺少必需元素：${selector}`);
        }

        return element;
      }

      function createLogLine(text) {
        const item = document.createElement("li");
        item.textContent = text;
        return item;
      }

      function createProductCard(listing) {
        const card = document.createElement("article");
        card.classList.add("product-card");
        card.dataset.listingId = listing.id;
        card.dataset.status = listing.status;

        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = "脚本创建";

        const title = document.createElement("h3");
        title.textContent = listing.title;

        const description = document.createElement("p");
        description.append(document.createTextNode(listing.description));

        const price = document.createElement("p");
        price.textContent = `${(listing.priceCents / 100).toFixed(2)} 元`;

        card.append(title, description, price);
        card.prepend(badge);

        return card;
      }

      const regularShelf = mustQuery("#regular-shelf");
      const featuredShelf = mustQuery("#featured-shelf");
      const log = mustQuery("#log");
      const baselineNote = document.getElementById("baseline-note");

      if (!baselineNote) {
        throw new Error("缺少必需元素：baseline-note");
      }

      const staticSnapshot = document.querySelectorAll(".product-card");
      const liveCards = document.getElementsByClassName("product-card");
      const initialChildNodes = regularShelf.childNodes.length;
      const initialChildren = regularShelf.children.length;

      const listing = {
        id: "listing-lamp-01",
        title: "书桌灯 <九成新>",
        description: "用户文字中的 <strong> 只应作为文字显示。",
        priceCents: 3900,
        status: "available",
        createdAt: "2026-10-10T08:30:00.000Z"
      };

      const createdCard = createProductCard(listing);
      const sameReference = createdCard;
      regularShelf.append(createdCard);

      console.assert(staticSnapshot.length === 1);
      console.assert(liveCards.length === 2);
      console.assert(createdCard.isConnected);
      console.assert(createdCard.matches(".product-card"));
      console.assert(
        createdCard.querySelector("h3").closest(".product-card") === createdCard
      );
      console.assert(createdCard.querySelector("h3").children.length === 0);
      console.assert(Number.isSafeInteger(listing.priceCents));
      console.assert(listing.createdAt.endsWith("Z"));

      const beforeNote = document.createElement("p");
      beforeNote.textContent = "下一张卡将被移动到精选区域。";
      createdCard.before(beforeNote);

      const afterNote = document.createElement("p");
      afterNote.textContent = "移动后，这条说明留在普通区域。";
      createdCard.after(afterNote);

      featuredShelf.prepend(createdCard);
      createdCard.classList.toggle("is-featured", true);
      createdCard.dataset.status = "featured";

      console.assert(createdCard === sameReference);
      console.assert(createdCard.parentElement === featuredShelf);
      console.assert(regularShelf.contains(createdCard) === false);
      console.assert(featuredShelf.contains(createdCard) === true);

      beforeNote.remove();

      const enhancedNote = document.createElement("p");
      enhancedNote.id = "baseline-note";
      enhancedNote.textContent = "脚本已完成创建、移动、替换和删除实验。";
      baselineNote.replaceWith(enhancedNote);

      const lines = [
        `querySelectorAll 静态长度：${staticSnapshot.length}`,
        `getElementsByClassName 动态长度：${liveCards.length}`,
        `普通区域 childNodes 初始长度：${initialChildNodes}`,
        `普通区域 children 初始长度：${initialChildren}`,
        `标题按纯文本显示：${createdCard.querySelector("h3").textContent}`,
        `移动后父元素：${createdCard.parentElement.id}`,
        `旧说明是否仍连接：${baselineNote.isConnected}`
      ].map(createLogLine);

      log.replaceChildren(...lines);

      console.assert(log.children.length === lines.length);
      console.assert(baselineNote.isConnected === false);
      console.assert(document.querySelector("#baseline-note") === enhancedNote);
    </script>
  </body>
</html>
```

### 6.3 运行方法

在终端进入文件所在目录：

```bash
cd market-learning/practice/html-12-dom-query-mutation
python3 -m http.server 8000
```

浏览器打开：

```text
http://localhost:8000/
```

打开 DevTools 的 Console 与 Elements。实验结束后回到终端按 `Control+C` 停止服务器。

若端口已占用，可改为：

```bash
python3 -m http.server 8001
```

并打开 `http://localhost:8001/`。

### 6.4 预期结果

页面应显示：

- 普通区域保留一张“静态折叠椅”；
- 精选区域出现“书桌灯 `<九成新>`”，尖括号作为文字可见；
- `<strong>` 字样也作为普通文字，不生成加粗元素；
- 精选卡带 `is-featured` 类和 `data-status="featured"`；
- “移动后，这条说明留在普通区域”仍在普通区域；
- 原基线说明已被新说明替换；
- 日志显示静态集合长度为 `1`，动态集合长度为 `2`；
- Console 没有失败断言或未捕获异常。

在 Elements 面板确认：

```text
article[data-listing-id="listing-lamp-01"]
  父元素是 #featured-shelf
  只有一个实例
  h3 内没有 strong 或其他元素
```

在 Console 复验：

```js
document.querySelectorAll(
  '[data-listing-id="listing-lamp-01"]'
).length;
// 1

document.querySelector(
  '[data-listing-id="listing-lamp-01"] h3'
).children.length;
// 0
```

### 6.5 失败证据

| 现象 | 优先证据 | 常见原因 | 修复后复验 |
| --- | --- | --- | --- |
| 页面只有静态卡 | Console 第一条异常 | 选择器或脚本语法错误 | 精选卡出现，Console 无异常 |
| `Cannot read properties of null` | 异常行与 Elements | ID 拼错或元素不存在 | `mustQuery()` 不再抛错 |
| 日志中静态长度变成 2 | 检查变量来源 | 错把动态集合当静态快照 | 使用 `querySelectorAll()` |
| `<strong>` 真的变粗 | Elements 查看 h3 子元素 | 使用了 `innerHTML` | h3 的 `children.length === 0` |
| 普通区和精选区各有一张相同卡 | 检查是否克隆 | 创建了副本而不是移动 | 同一 ID 只出现一次 |
| `nextSibling` 不是卡片 | Console 查看 `nodeType` | 命中空白 Text | 改用 `nextElementSibling` |
| 断言失败但页面相似 | Console 查看具体断言 | 状态与结构未完全同步 | 不删除断言，修复根因 |

服务器终端若出现 `404`，检查 URL 和文件名；DOM 逻辑错误通常在 Console 和 Elements，不在 Network。

### 6.6 渐进扩展顺序

不要一次写完整文件后只看最终页面。按下面顺序扩展并每步刷新：

1. 只保留静态卡，确认无脚本也可读；
2. 增加 `mustQuery()`，故意把 `#regular-shelf` 拼错一次，记录错误；
3. 同时保存静态 `NodeList` 和动态 `HTMLCollection`；
4. 用 `createElement()` 和 `textContent` 创建卡；
5. 用 `append()` 连接卡，比较集合长度；
6. 用 `before()`、`after()` 增加说明；
7. 用 `prepend()` 把原卡移动到精选区，断言对象身份；
8. 用 `remove()` 删除临时说明；
9. 用 `replaceWith()` 替换基线说明；
10. 用 `replaceChildren()` 一次写入日志；
11. 最后在 Elements、Console 和禁用 JavaScript 后分别复验。

禁用 JavaScript 并刷新时，应仍能阅读静态折叠椅和基线说明；动态书桌灯与观察日志不出现，这是明确降级，不是假装完整交互仍可用。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [属性、dataset 与状态同步](06-dom-attributes-dataset-state-sync.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 DOM-001（getElementById、querySelector、querySelectorAll） 对应的元素、属性或状态；
- 在项目中实现并标出与 DOM-002（静态 NodeList 与动态集合） 对应的元素、属性或状态；
- 在项目中实现并标出与 DOM-003（节点/元素导航、closest、matches） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`06-dom-attributes-dataset-state-sync.md`](06-dom-attributes-dataset-state-sync.md)。

## 8. 常见错误与排查路径

### 8.1 把无效选择器当作零匹配

```js
document.querySelectorAll("[data-status=");
```

这会抛 `SyntaxError`，不会返回空集合。Console 中单独执行选择器，修复括号和引号。若选择器含外部 ID，使用稳定标识或 `CSS.escape()`。

### 8.2 期待静态快照自动更新

```js
const cards = document.querySelectorAll(".product-card");
list.append(createListingItem(listing));
console.log(cards.length);
```

`cards` 保持查询时长度。需要最新快照就重新查询；需要实时集合才选择明确的动态 API。不要为了“自动更新”盲目使用动态集合，稳定数组通常更适合批处理。

### 8.3 遍历动态集合时删除导致跳项

现象：删除“全部过期商品”后仍剩一半。

证据：

```js
const live = document.getElementsByClassName("expired");
console.log(live.length);
```

每次删除后集合立即缩短。修复为：

```js
for (const card of [...live]) {
  card.remove();
}
```

复验最终 `live.length === 0`。

### 8.4 大范围 `replaceChildren()` 破坏焦点

现象：用户操作卡片后整个列表重建，焦点回到文档顶部或消失。

证据：

```js
console.log(document.activeElement);
```

修复：单个状态变化只更新对应卡；确需替换列表时，在替换前记录稳定目标，并在替换后把焦点放到等价可操作元素，同时提供状态消息。

### 8.5 页面变化被误认为持久化成功

现象：按钮文字显示“已预约”，刷新后消失。

证据：

- Network 没有 `POST /reservations`；
- Application 没有本案例状态；
- 刷新后回到初始数组。

这不是 DOM 故障，而是能力边界。正确文案应写“仅内存”；真实预约必须等待服务端在权限和并发约束下确认。

## 9. 课后题

### 9.1 查询与集合

给定：

```html
<ul id="list">
  <li class="card">一</li>
</ul>
```

执行：

```js
const snapshot = document.querySelectorAll(".card");
const live = document.getElementsByClassName("card");
const second = document.createElement("li");
second.className = "card";
document.querySelector("#list").append(second);
```

`snapshot.length` 和 `live.length` 分别是多少？为什么？

<details>
<summary>参考答案</summary>

分别是 `1` 和 `2`。`querySelectorAll()` 返回查询时的静态 `NodeList`；`getElementsByClassName()` 返回随当前 DOM 更新的动态 `HTMLCollection`。

</details>

### 9.2 节点与元素导航

为什么格式良好的缩进 HTML 中，`list.firstChild` 可能不是第一个 `li`？怎样验证并修复？

<details>
<summary>参考答案</summary>

换行与空格可能形成 `Text` 节点。记录 `firstChild.nodeType` 和 `nodeName`；需要第一个元素时使用 `firstElementChild`。不要靠删除缩进规避节点模型。

</details>

## 10. 实践练习

### 10.1 基础：查询与集合观察表

文件：

```text
practice/html-12-dom-query-mutation/exercise-query.html
```

要求：

- 至少有两个含缩进空白的商品 `li`；
- 分别使用 `getElementById()`、`querySelector()`、`querySelectorAll()`；
- 记录一个成功单选、一个 `null` 和一个空 `NodeList`；
- 故意执行一次无效选择器，并用 `try...catch` 记录 `error.name`；
- 同时保存静态 `NodeList`、动态 `HTMLCollection` 和 `childNodes`；
- 新增、移动、删除元素后记录三者长度；
- 比较 `firstChild` 与 `firstElementChild`；
- 用 `matches()` 和 `closest()` 各完成一个断言。

运行：

```bash
cd market-learning/practice/html-12-dom-query-mutation
python3 -m http.server 8000
```

预期：

- 页面有可见观察表；
- Console 无未捕获异常；
- 能解释每次长度是否变化；
- 空查询与语法错误被明确区分。

失败优先看 Console 第一条异常和 Elements 实际树。完成标准不是“所有数字相同”，而是能根据 API 模型预测每个数字。

### 10.2 故障注入：四类可重复错误

文件：

```text
practice/html-12-dom-query-mutation/exercise-failures.html
```

每次只注入一个故障：

1. 把必需选择器拼错后直接访问 `.children`；
2. 把用户标题从 `textContent` 改成 `innerHTML`；
3. 对动态 `HTMLCollection` 正向遍历并删除；
4. 收藏时只改类，不改 `aria-pressed` 和文字。

记录：

```text
故障：
注入行：
操作步骤：
可见现象：
Console 证据：
Elements 证据：
Accessibility 证据：
根因：
最小修复：
复验断言：
刷新后结果：
```

答案标准：

- 空查询通过第一条异常、真实选择器和执行时机定位；
- `innerHTML` 故障通过意外子元素证明，不只说“可能不安全”；
- 动态集合跳项通过删除前后长度和剩余元素证明；
- 状态漂移同时检查类、`data-*`、ARIA 和文字；
- 修复后恢复原断言；
- 不吞异常、不删除断言、不使用持久化掩盖刷新重置。

## 11. 阶段验收

### 查询与集合

- [ ] 能根据范围和数量选择三种查询 API；
- [ ] 必需单元素查询有明确 `null` 处理；
- [ ] 能区分零匹配与无效选择器异常；
- [ ] 能用新增节点证明静态快照和动态集合差异；
- [ ] 遍历动态集合删除前会创建稳定副本。

### 运行证据

提交以下材料：

```text
练习文件路径：
启动命令与当前目录：
浏览器与版本：
静态 NodeList 初始/修改后长度：
动态 HTMLCollection 初始/修改后长度：
childNodes/children 对比：
安全标题的 Elements 证据：
节点移动前后父元素：
对象身份与唯一数量断言：
class/data/ARIA/text 同步表：
value/defaultValue 对比：
错误 innerHTML 复现：
空查询复现与修复：
Network 证据：
刷新后证据：
Node 纯函数断言输出：
未验证浏览器/辅助技术：
```

完成标准：

- HTML 页面关键路径可重复运行；
- Console 无未解释错误或失败断言；
- `node --check assertions.js` 与 `node assertions.js` 通过；
- 故障注入有修复前后证据；
- 键盘可以完成添加、收藏、状态切换、移动和删除；
- 状态不能只靠颜色表达；
- 没有用删除断言、吞异常或写持久化制造“通过”。

## 12. 常见问题

### Q1：ID 查询一定比 `querySelector()` 快吗？

性能通常不是这里的决策重点。稳定唯一 ID 用 `getElementById()` 清楚直接；复杂条件用选择器。先保证范围、空值处理和可维护性正确，再用真实性能数据判断热点。

### Q2：为什么 `querySelectorAll()` 不自动更新？

静态快照使批处理范围稳定。遍历过程中新增或删除节点时，不会因集合即时变化而改变本轮成员。需要最新结果时重新查询即可。

### Q3：所有 `NodeList` 都是静态的吗？

不是。`querySelectorAll()` 的结果是静态 `NodeList`，`childNodes` 是动态 `NodeList`。必须根据具体 API 判断。

### Q4：可以把 `HTMLCollection` 直接转数组吗？

可以使用 `[...collection]` 或 `Array.from(collection)`。转换得到当前稳定快照，之后 DOM 改变不会自动更新该数组。

### Q16：DOM 上显示“已预约”为什么还不够？

DOM 可被任意修改，也不知道其他用户是否同时预约。真实系统必须由服务端检查身份、不能预约自己的商品、当前状态和数据库唯一约束，成功后前端再同步显示。

## 13. 扩展阅读

资料与兼容性说明核验日期：2026-10-10。

- [WHATWG DOM Standard](https://dom.spec.whatwg.org/)：核对节点树、查询、集合、插入、替换、删除和属性算法。
- [WHATWG HTML：Common DOM interfaces](https://html.spec.whatwg.org/multipage/common-dom-interfaces.html)：理解 HTML 对 DOM 接口和反射行为的补充。
- [WHATWG HTML：Boolean attributes](https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes)：核对“存在即真”以及 `"false"` 仍为真的规则。
- [WHATWG HTML：input element](https://html.spec.whatwg.org/multipage/input.html#the-input-element)：核对输入当前值、默认值、checked 状态和重置行为。
- [MDN：Document.getElementById()](https://developer.mozilla.org/en-US/docs/Web/API/Document/getElementById)：复习 ID 查询和空结果。
- [MDN：Document.querySelector()](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)：核对首个匹配、选择器语法错误和转义。
- [MDN：Document.querySelectorAll()](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelectorAll)：核对静态 `NodeList`。
- [MDN：HTMLCollection](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection)：复习动态集合和先复制再迭代的建议。
- [MDN：NodeList](https://developer.mozilla.org/en-US/docs/Web/API/NodeList)：区分静态与动态 `NodeList`。
- [MDN：Element.children](https://developer.mozilla.org/en-US/docs/Web/API/Element/children)：核对元素子集合与 `childNodes` 差异。
- [MDN：Element.closest()](https://developer.mozilla.org/en-US/docs/Web/API/Element/closest)：复习自身向祖先匹配。
- [MDN：Element.matches()](https://developer.mozilla.org/en-US/docs/Web/API/Element/matches)：复习当前元素匹配。
- [MDN：Document.createElement()](https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement)：复习元素创建。
- [MDN：Document.createTextNode()](https://developer.mozilla.org/en-US/docs/Web/API/Document/createTextNode)：复习纯文本节点创建。
- [MDN：Node.textContent](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)：核对读写文本和替换子节点行为。
- [MDN：Element.innerHTML](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML)：核对解析行为、注入风险与 Trusted Types。
- [MDN：Element.classList](https://developer.mozilla.org/en-US/docs/Web/API/Element/classList)：复习 token 级类名操作。
- [MDN：HTMLElement.dataset](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset)：核对名称映射和字符串转换。
- [MDN：Element.toggleAttribute()](https://developer.mozilla.org/en-US/docs/Web/API/Element/toggleAttribute)：复习布尔属性存在性切换。
- [WAI-ARIA：button role](https://www.w3.org/WAI/ARIA/apg/patterns/button/)：核对切换按钮状态、键盘行为与可见标签。
- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)：理解不同输出上下文和安全 sink。
- [邻里集市项目契约](../../00-guide/project-contract.md)：核对整数分、UTC、收藏、预约、权限和并发边界。

阅读时区分：

- **规范行为**：查询结果、树修改、属性反射和集合活性以 DOM/HTML 标准为准；
- **实现表现**：Elements 序列化、焦点恢复和辅助技术朗读需在目标浏览器实际验证；
- **安全边界**：DOM 安全写入不能替代服务端验证、认证、授权、CSRF 和数据库约束；
- **数据边界**：当前页面内存不是持久化，DOM 也不是可信数据库。

## 我现在能做到什么

- 能解释并验证：查询当前 DOM，区分静态与动态集合，并沿节点和元素关系导航。
- `DOM-001`：getElementById、querySelector、querySelectorAll
- `DOM-002`：静态 NodeList 与动态集合
- `DOM-003`：节点/元素导航、closest、matches
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：Popover、调用者与回退](03-popover-invokers-fallback.md) · [下一课：节点创建、移动、删除与安全文本](05-dom-create-move-remove-safe-text.md) · [返回 HTML 模块](../README.md)
