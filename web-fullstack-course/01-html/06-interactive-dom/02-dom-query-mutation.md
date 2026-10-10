# DOM 查询、创建与修改：让商品卡和内存状态保持一致

> 所属章节：原生交互、DOM 与事件
> 建议学习时间：5–6 小时
> 阶段成果：完成一个可安全创建、移动、更新和删除商品卡的邻里集市内存列表

## 任务卡

邻里集市已经有能阅读的商品内容，但静态 HTML 不会根据内存数据自动增加商品卡，也不会在收藏状态改变时自动同步类名、按钮文字和无障碍状态。更危险的是，若把用户输入直接拼给 `innerHTML`，浏览器会把本应显示的普通文字重新解释为标签。

本课建立一条可以观察和复验的 DOM 修改链：

```text
稳定查询必需容器
  → 区分静态 NodeList 与动态 HTMLCollection
  → 从内存对象创建元素和文本节点
  → 插入、移动、替换或删除既有节点
  → 从单一内存状态同步 class、data-*、ARIA 和可见文字
  → 用 Elements、Console 与纯断言复验结果
```

**完成本课后，你将交付：**

- 一份 `getElementById()`、`querySelector()` 与 `querySelectorAll()` 的选择结果记录；
- 一次静态 `NodeList` 与动态 `HTMLCollection` 的长度对比；
- 一份节点导航与元素导航的空白文本节点证据；
- 一张只用 DOM API 创建、用户文字不经 HTML 解析的商品卡；
- 一次证明“插入已有节点就是移动，不是复制”的身份断言；
- 一组 `append()`、`prepend()`、`before()`、`after()`、`remove()`、`replaceWith()` 与 `replaceChildren()` 操作；
- 一份 `classList`、`dataset`、普通属性、布尔属性与 DOM 属性的对照记录；
- 一个使用整数分和 UTC 时间、刷新即重置的邻里集市内存列表；
- 一次空查询、错误 `innerHTML`、动态集合跳项和状态不同步的故障演练。

完整案例不请求 API，不使用 Cookie、`localStorage`、IndexedDB 或数据库。添加、收藏、移动、预约和删除都只影响当前页面内存；刷新后恢复为代码中的初始数据。

## 1. 任务背景

浏览器解析 HTML 后，会建立由对象组成的 DOM 树。JavaScript 改变页面，通常不是“修改 HTML 文件”，而是对当前文档树中的对象执行四类操作：

1. **查询**：找到要读取或修改的节点；
2. **创建**：建立还未进入文档的新节点；
3. **安放**：插入新节点，或把已有节点移动到新位置；
4. **同步**：让内存状态与可见文字、类名、属性和可访问状态保持一致。

这四步中的任何一步都可能失真：

- 选择器写错，查询返回 `null`，下一行访问属性时报错；
- 把静态集合当成动态集合，新增节点后长度没有变化；
- 把空白文本节点当作元素，`nextSibling` 得到的不是下一张卡；
- 重复插入同一个节点，以为得到两个副本，实际上原节点被移动；
- 用 `innerHTML` 拼接用户标题，使文字被解析成元素；
- 只改 `.is-favorite` 类，却忘记 `aria-pressed` 和按钮文字；
- 用 `disabled="false"` 试图启用按钮，但布尔属性只看是否存在；
- 把输入框的 `value` 内容属性当成用户当前输入；
- 把 `data-*` 当成可信数据库，忽略它始终可由用户修改；
- 页面显示“已预约”，却没有任何服务器请求、权限检查和并发约束。

本课使用“状态先存在内存，界面只是状态投影”的顺序：

```text
内存 Listing
  → createListingCard(listing)
  → DOM 节点

用户操作
  → 更新内存状态
  → syncCard(listing)
  → class / data-* / aria-* / text / disabled 同步
```

CSS 类可以帮助呈现，但不能成为唯一业务状态。DOM 属性可以表达当前界面，但不能替代服务器保存、授权和并发控制。

## 2. 学习目标

完成本课后，你应能：

- 解释 DOM 树、`Node`、`Element` 与 HTML 源文本之间的关系；
- 根据查询范围与结果数量选择 `getElementById()`、`querySelector()` 或 `querySelectorAll()`；
- 处理“零个匹配”结果，并识别无效 CSS 选择器抛出的 `SyntaxError`；
- 证明 `querySelectorAll()` 返回的 `NodeList` 是静态快照；
- 证明 `children` 与 `getElementsByClassName()` 返回的 `HTMLCollection` 会随 DOM 变化；
- 说明并非所有 `NodeList` 都是静态的，例如 `childNodes` 是动态集合；
- 区分 `childNodes`/`children`、`firstChild`/`firstElementChild`、`nextSibling`/`nextElementSibling`；
- 使用 `matches()` 检查当前元素，使用 `closest()` 从自身向祖先查找；
- 使用 `createElement()` 和 `createTextNode()` 建立结构与安全文本；
- 使用 `append()`、`prepend()`、`before()` 和 `after()` 插入节点或普通字符串；
- 使用 `remove()`、`replaceWith()` 和 `replaceChildren()` 删除或替换结构；
- 解释为什么把已有节点插入新父节点会移动它，而不会复制它；
- 说明 `textContent` 与 `innerHTML` 的解析、安全和结构差异；
- 使用 `classList.add()`、`remove()`、`toggle()`、`replace()` 和 `contains()`；
- 在 `dataset` 与 `data-*` 之间正确转换名称，并记住值是字符串；
- 使用 `getAttribute()`、`setAttribute()`、`hasAttribute()`、`removeAttribute()` 和 `toggleAttribute()`；
- 解释布尔内容属性的“存在即真”规则；
- 区分内容属性、反射属性、当前值和默认值；
- 解释输入框的 `value`/`defaultValue` 以及复选框的 `checked`/`defaultChecked`；
- 从一个内存状态函数同步类名、状态文字、ARIA 状态和按钮可用性；
- 用 Elements、Console 和断言定位空查询、移动错误、属性误解与界面漂移；
- 说明本课内存列表为什么不等于持久化、认证、授权或真实预约。

## 3. 预备知识

开始前建议完成：

- [details、dialog 与 popover](01-native-interactive-elements.md)；
- [约束验证、错误恢复与文件](../05-forms-validation/04-constraint-validation-files.md)；
- [第六章入口](../06-interactive-dom.md)。

你需要知道：

- HTML 元素有父子关系，缩进本身不决定语义；
- `id` 应在当前文档中唯一；
- CSS 选择器可以按 ID、类、属性和后代关系匹配元素；
- `button` 用于动作，`a` 用于导航；
- `aria-pressed` 可以表达可切换按钮的当前按下状态；
- JavaScript 对象和数组可以保存当前页面的内存状态；
- `console.log()`、`console.table()` 与 `console.assert()` 可以提供观察证据；
- 邻里集市金额使用整数分，例如 `3900` 表示 `39.00 元`；
- 存储时间使用 UTC ISO 8601，例如 `2026-10-10T08:30:00.000Z`。

本课会为按钮绑定少量 `click` 和表单 `submit` 处理，只为观察 DOM 修改。事件传播、默认动作、事件委托和监听器清理将在[下一课](03-events-forms-delegation.md)系统讲解。

本课不要求：

- 使用 React、Vue 或其他渲染框架；
- 请求真实商品 API；
- 使用 `localStorage`、IndexedDB、Cookie 或数据库；
- 实现登录、授权、CSRF 防护或服务端校验；
- 解决多人同时预约的竞争；
- 把用户提供的 HTML 当成可信内容；
- 创建课程仓库内的实验源码目录。

教程中的文件路径都指学习者自己的练习目录。当前教程仓库只保存 Markdown。

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

`closest()` 包含自身。没有匹配时返回 `null`。在一个按钮里点击嵌套图标时，它可以帮助找到按钮或商品卡；下一课会把它用于事件委托。

边界：

- `closest()` 只沿祖先链查找，不搜索兄弟或子孙；
- 得到元素后还应确认它属于预期容器，例如 `list.contains(card)`；
- 选择器无效仍会抛出 `SyntaxError`；
- 它解决结构定位，不解决权限和数据可信度。

### 4.5 `createElement()` 与 `createTextNode()`

`document.createElement(tagName)` 创建一个尚未连接到页面的元素：

```js
const article = document.createElement("article");
article.className = "product-card";

console.assert(article.isConnected === false);
```

`document.createTextNode(data)` 创建纯文本节点：

```js
const title = document.createElement("h2");
const titleText = document.createTextNode("书桌灯 <九成新>");

title.append(titleText);
```

浏览器不会把文本节点里的 `<九成新>` 当标签。Elements 面板可能把尖括号显示成转义形式，但页面可见文字仍是原字符串。

也可以直接使用 `textContent`：

```js
title.textContent = "书桌灯 <九成新>";
```

选择建议：

- 一次设置元素的完整文字，使用 `textContent`；
- 需要在多个元素或文本节点之间精确组合，使用 `createTextNode()`；
- 创建结构时使用 `createElement()`，不要用字符串猜浏览器会解析出什么树。

### 4.6 `append()`、`prepend()`、`before()` 与 `after()`

四个方法的参照位置不同：

```text
parent.prepend(node)  → 父元素内部最前
parent.append(node)   → 父元素内部最后
element.before(node)  → 当前元素外部之前
element.after(node)   → 当前元素外部之后
```

完整示例：

```js
const card = document.createElement("article");
const title = document.createElement("h2");
const price = document.createElement("p");
const badge = document.createElement("span");

title.textContent = "书桌灯";
price.textContent = "39.00 元";
badge.textContent = "可预约";

card.append(title, price);
card.prepend(badge);

const list = document.querySelector("#listing-list");
list.append(card);

const beforeNote = document.createElement("p");
beforeNote.textContent = "以下为今日商品";
card.before(beforeNote);

const afterNote = document.createElement("p");
afterNote.textContent = "商品信息仅供教学";
card.after(afterNote);
```

这些方法可以接收多个节点，也可以接收字符串。字符串会被转换为文本节点，不会按 HTML 解析：

```js
card.append("<strong>不会变粗</strong>");
```

这与 `innerHTML` 有本质区别。

### 4.7 插入已有节点就是移动

一个节点同一时刻只能位于 DOM 树的一个位置。把已经连接的节点插入另一个父元素，会先从旧位置移除，再进入新位置：

```js
const card = document.querySelector('[data-listing-id="listing-lamp-01"]');
const featuredList = document.querySelector("#featured-list");
const originalReference = card;

featuredList.prepend(card);

console.assert(card === originalReference);
console.assert(card.parentElement === featuredList);
```

这不是复制：

- 对象身份不变；
- 节点上的属性和子节点保留；
- 直接绑定在该节点上的监听器通常也保留；
- 旧父元素不再包含它；
- 动态集合会立即反映新位置。

若确实需要副本，要明确调用 `cloneNode()`；但克隆不会自动复制用 `addEventListener()` 注册的监听器，重复 ID 也可能随深克隆进入页面。模板和克隆将在第四课系统讲解。

### 4.8 `remove()`、`replaceWith()` 与 `replaceChildren()`

删除自身：

```js
const staleCard = document.querySelector(".product-card.is-stale");
staleCard?.remove();
```

节点被移出文档后，若 JavaScript 变量仍引用它，对象仍可存在：

```js
console.assert(staleCard?.isConnected === false);
```

替换当前节点：

```js
const oldMessage = document.querySelector("#message");
const newMessage = document.createElement("p");
newMessage.id = "message";
newMessage.textContent = "列表已经刷新。";

oldMessage.replaceWith(newMessage);
```

替换某个父元素的全部子节点：

```js
const list = document.querySelector("#listing-list");
const emptyMessage = document.createElement("li");
emptyMessage.textContent = "当前没有商品。";

list.replaceChildren(emptyMessage);
```

也可以传入多个节点：

```js
list.replaceChildren(firstCard, secondCard, thirdCard);
```

边界：

- `remove()` 不等于删除服务器记录；
- `replaceWith()` 后，原变量仍指向旧节点，不会自动改指向新节点；
- `replaceChildren()` 会移除原子树，子元素中的焦点和页面状态也会丢失；
- 大范围替换可能破坏焦点、文本选择和辅助技术上下文；
- 只改一个状态时，应更新必要节点，不必重建整张卡。

### 4.9 `textContent` 与 `innerHTML` 的安全边界

`textContent` 把输入当普通文本：

```js
const title = document.createElement("h2");
const userTitle = '儿童桌 <可折叠>';

title.textContent = userTitle;
console.assert(title.textContent === userTitle);
console.assert(title.children.length === 0);
```

给元素设置 `textContent` 会移除原有子节点，再放入文本内容。读取 `textContent` 得到后代文本拼接，不关心视觉隐藏，也可能包含 `script`、`style` 元素的文本；它与布局相关的 `innerText` 不是同一个 API。

`innerHTML` 会调用 HTML 解析器：

```js
// 错误案例：不要把用户输入拼进 innerHTML。
const userTitle = '<button type="button">伪造的页面操作</button>';
const card = document.querySelector(".product-card");

card.innerHTML = `<h2>${userTitle}</h2>`;
```

结果不是显示尖括号，而是在商品标题位置创建一个真实按钮。若字符串含事件处理属性、危险 URL 或其他可执行上下文，可能形成跨站脚本注入。即使某些通过 `innerHTML` 插入的 `script` 元素不会按直觉执行，也绝不意味着 `innerHTML` 对不可信内容安全。

正确写法：

```js
const heading = document.createElement("h2");
heading.textContent = userTitle;
card.replaceChildren(heading);
```

重要边界：

- `textContent` 解决当前文本插入点的 HTML 解析问题，不自动验证长度、业务词汇或权限；
- URL、CSS、脚本和属性各有不同安全规则，不能把“转义 HTML”当成万能消毒；
- 如果产品确实允许富文本，应使用严格格式、可信解析器、允许列表清洗和内容安全策略；
- 在支持环境中，Trusted Types 可以帮助限制危险 HTML sink，但不替代输入设计和服务端安全；
- 本课商品标题、描述和状态都只需要纯文本，因此没有使用 `innerHTML` 的理由。

### 4.10 使用 `classList` 修改类集合

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

### 4.11 `dataset` 与 `data-*`

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

### 4.12 普通属性与布尔属性

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

### 4.13 内容属性与 DOM 属性

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

### 4.14 从一个状态同步类、ARIA、文字与可用性

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

### 4.15 空查询诊断要检查选择器、时机和范围

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

### 4.16 渐进增强：先有可读内容，再增加内存交互

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

这里直接给每张卡绑定监听器，是为了把注意力放在 DOM 与状态同步。下一课会改成列表容器上的事件委托，并处理动态节点、嵌套点击目标和监听器清理。

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

### 8.2 把无效选择器当作零匹配

```js
document.querySelectorAll("[data-status=");
```

这会抛 `SyntaxError`，不会返回空集合。Console 中单独执行选择器，修复括号和引号。若选择器含外部 ID，使用稳定标识或 `CSS.escape()`。

### 8.3 期待静态快照自动更新

```js
const cards = document.querySelectorAll(".product-card");
list.append(createListingItem(listing));
console.log(cards.length);
```

`cards` 保持查询时长度。需要最新快照就重新查询；需要实时集合才选择明确的动态 API。不要为了“自动更新”盲目使用动态集合，稳定数组通常更适合批处理。

### 8.4 遍历动态集合时删除导致跳项

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

### 8.5 `firstChild` 或 `nextSibling` 命中空白文本

证据：

```js
console.log(node.nodeType, node.nodeName);
```

`nodeType === Node.TEXT_NODE` 表示文本节点。商品卡导航改用 `firstElementChild` 或 `nextElementSibling`。不要删除所有 HTML 换行来掩盖模型误解。

### 8.6 节点“从旧位置消失”

现象：把卡加入精选后，普通列表少了一张。

原因：插入已有节点执行移动。

若目标本来就是移动，这是正确行为；用严格相等和父元素断言复验。若确实需要副本，再评估 `cloneNode(true)`、重复 ID、监听器和状态复制问题。

### 8.7 错误 `innerHTML` 让用户文字变成控件

故障注入：

```js
const unsafeTitle = '<button type="button">伪造操作</button>';
title.innerHTML = unsafeTitle;
```

证据：

- Elements 中 h3 出现真实 `button`；
- `title.children.length === 1`；
- 键盘焦点会进入这个意外按钮。

修复：

```js
title.textContent = unsafeTitle;
console.assert(title.children.length === 0);
```

复验时保留尖括号可见，并确认页面没有新交互控件。

### 8.8 `disabled="false"` 仍然禁用

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

### 8.9 读取 `getAttribute("value")` 得不到当前输入

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

### 8.10 类、ARIA 和文字不同步

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

### 8.11 把 `dataset` 数字当成数值

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

### 8.12 替换节点后继续使用旧引用

```js
const message = document.querySelector("#message");
message.replaceWith(nextMessage);
message.textContent = "这只会修改已脱离文档的旧节点";
```

证据：

```js
console.log(message.isConnected); // false
```

修复：让变量重新指向新节点，或避免不必要的整体替换。

### 8.13 大范围 `replaceChildren()` 破坏焦点

现象：用户操作卡片后整个列表重建，焦点回到文档顶部或消失。

证据：

```js
console.log(document.activeElement);
```

修复：单个状态变化只更新对应卡；确需替换列表时，在替换前记录稳定目标，并在替换后把焦点放到等价可操作元素，同时提供状态消息。

### 8.14 页面变化被误认为持久化成功

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

### 9.3 节点移动

同一个 `article` 先 `listA.append(article)`，再 `listB.prepend(article)`。最终有几个 `article`？原监听器是否通常保留？

<details>
<summary>参考答案</summary>

只有一个。第二次插入把原节点移动到 `listB`，对象身份不变，直接注册在该对象上的监听器通常保留。可以用严格相等、父元素与全局查询数量断言。

</details>

### 9.4 安全文本

商品标题是 `'<em>几乎全新</em>'`。怎样让用户看到完整尖括号文本，而不是斜体元素？

<details>
<summary>参考答案</summary>

使用 `title.textContent = userTitle` 或 `title.append(document.createTextNode(userTitle))`。再断言 `title.children.length === 0`。不应把不可信标题拼给 `innerHTML`。

</details>

### 9.5 布尔属性

为什么 `button.setAttribute("disabled", "false")` 仍然禁用？`aria-pressed="false"` 是否也应删除？

<details>
<summary>参考答案</summary>

`disabled` 是布尔内容属性，存在即真，字符串内容不表示布尔假；应设置 `button.disabled = false` 或移除属性。`aria-pressed` 是有明确字符串状态的 ARIA 属性，`"false"` 表示可切换按钮当前未按下，不应套用布尔内容属性规则。

</details>

### 9.6 当前值与默认值

输入初始 `value="台灯"`，用户改成“书桌”。此时 `getAttribute("value")`、`.defaultValue` 和 `.value` 分别表达什么？

<details>
<summary>参考答案</summary>

前两者通常仍表达默认值“台灯”，`.value` 表达用户当前输入“书桌”。业务读取当前输入应使用 `.value`；表单重置会使用默认状态恢复。

</details>

### 9.7 状态同步

为什么收藏逻辑不应只执行 `card.classList.toggle("is-favorite")`？

<details>
<summary>参考答案</summary>

类名只覆盖视觉的一部分，且无条件反转依赖 DOM 旧状态。业务状态应先写入内存 `Set`，再由统一同步函数根据布尔结果设置类、`data-*`、`aria-pressed` 和按钮文字。这样重复渲染仍是确定的。

</details>

### 9.8 系统边界

DOM 中 `data-status="reserved"` 能否证明商品已被真实预约？

<details>
<summary>参考答案</summary>

不能。`data-*` 可由任何页面脚本或 DevTools 修改。本课没有认证、API、数据库和并发约束。真实预约必须由服务端在当前身份、商品状态和唯一约束下原子确认，前端再根据成功响应更新界面。

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

### 10.2 进阶：扩展内存商品卡

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

### 10.3 故障注入：四类可重复错误

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

### 导航与节点操作

- [ ] 能解释空白文本节点为何出现；
- [ ] 节点导航和元素导航选择符合任务；
- [ ] `matches()` 与 `closest()` 使用方向正确；
- [ ] 商品卡由 `createElement()` 和安全文本 API 创建；
- [ ] 四种插入位置均可独立解释；
- [ ] 移动已有节点有对象身份和唯一数量证据；
- [ ] 删除、单节点替换和子树替换使用范围合理。

### 文本与安全

- [ ] 用户标题和描述不经 `innerHTML` 解析；
- [ ] 错误 `innerHTML` 案例能稳定生成意外元素；
- [ ] 修复后尖括号可见且 `children.length === 0`；
- [ ] 能说明 `textContent` 不能替代所有输入验证和服务端安全；
- [ ] 页面没有真实密钥、令牌或个人数据。

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

### Q5：`closest()` 会检查元素自己吗？

会。它从元素自身开始，再逐级向父元素查找。`matches()` 只检查自身，不沿祖先链。

### Q6：`append()` 和 `appendChild()` 有什么差别？

`append()` 可一次接收多个节点或字符串，返回 `undefined`；`appendChild()` 接收一个节点并返回该节点。两者插入已有节点时都会移动它。本课统一使用更适合组合内容的 `append()`。

### Q7：节点移走后监听器会消失吗？

移动同一节点通常保留直接绑定在该对象上的监听器。克隆节点不会自动复制 `addEventListener()` 监听器。移除后若仍有引用，监听器也可能继续占用内存；生命周期清理在下一课展开。

### Q8：`remove()` 会删除商品数据吗？

只会把节点移出 DOM。若内存数组、Map、监听器闭包或服务器仍保存数据，它们不会自动删除。完整案例显式同步数组、Set、Map 和 DOM。

### Q9：什么时候可以使用 `innerHTML`？

只有内容来源和解析边界明确、确实需要 HTML 结构，并采用适当的可信内容策略时才考虑。普通商品标题、描述、错误和状态都应使用 `textContent` 或 DOM 创建 API。

### Q10：`textContent` 会自动清理恶意 URL 吗？

不会。它只保证当前写入作为文本，不作为 HTML 解析。若把输入用于 `href`、`src`、CSS 或脚本，需要相应的 URL 方案允许列表、属性 API 和安全策略。

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
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对整数分、UTC、收藏、预约、权限和并发边界。

阅读时区分：

- **规范行为**：查询结果、树修改、属性反射和集合活性以 DOM/HTML 标准为准；
- **实现表现**：Elements 序列化、焦点恢复和辅助技术朗读需在目标浏览器实际验证；
- **安全边界**：DOM 安全写入不能替代服务端验证、认证、授权、CSRF 和数据库约束；
- **数据边界**：当前页面内存不是持久化，DOM 也不是可信数据库。

## 我现在能做到什么

我能稳定查询必需元素，区分静态与动态集合以及节点与元素导航，用 DOM API 安全创建商品卡，并解释插入、移动、替换和删除对对象身份与文档树的影响。我还能从单一内存状态同步类名、`data-*`、ARIA、文字和布尔属性，识别当前值与默认值的差异，并用 Console、Elements、Accessibility、Network 和纯函数断言定位空查询、注入、跳项和状态漂移。

下一课会在这些动态节点上系统处理事件注册、传播、默认动作、表单提交和列表委托。

## 单元导航

- [上一课：details、dialog 与 popover](01-native-interactive-elements.md)
- [返回第六章入口](../06-interactive-dom.md)
- [下一课：事件、表单与委托](03-events-forms-delegation.md)
- [返回 HTML 模块](../README.md)
