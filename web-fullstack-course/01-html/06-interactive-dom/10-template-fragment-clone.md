# Template、DocumentFragment 与克隆

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 解析但暂不激活 template 内容，使用 DocumentFragment 和 cloneNode() 安全复用结构。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `INT-005` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

解析但暂不激活 template 内容，使用 DocumentFragment 和 cloneNode() 安全复用结构。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 INT-005（`template`、DocumentFragment、cloneNode）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `template`：已解析但暂不进入活动页面的内容

最小语法：

```html
<template id="listing-template">
  <article>
    <h2 class="listing-title"></h2>
  </article>
</template>
```

浏览器会识别 `template` 元素并解析其中的标记，但模板内容不作为 `template` 的普通子节点进入活动文档树。内容位于 `HTMLTemplateElement.content`：

```js
const template = document.querySelector("#listing-template");

console.log(template.content instanceof DocumentFragment); // true
console.log(template.children.length); // 0
console.log(template.content.children.length); // 1
```

这带来几项直接结果：

- 模板中的商品卡不会直接绘制；
- 模板内部的控件不会进入页面焦点顺序；
- 模板内部的 `style` 不会直接给当前页面应用样式；
- 模板内部的 `script` 不会因为模板被解析就执行；
- 应从 `template.content` 查询内部节点，而不是从 `template` 查询；
- 内容仍然存在于内存中，页面脚本可以读取、修改和克隆。

“惰性”描述的是内容尚未作为活动页面内容参与渲染和交互，不表示浏览器把字符串原样保存，也不表示它是安全的 HTML 容器。模板标记仍按 HTML 解析规则构建节点；把不可信 HTML 填进模板同样可能在未来插入活动文档时形成注入风险。

下面的写法不会找到标题：

```js
const template = document.querySelector("#listing-template");
const title = template.querySelector(".listing-title");

console.log(title); // null
```

正确查询边界是：

```js
const title = template.content.querySelector(".listing-title");
```

### 4.2 `.content` 与 `DocumentFragment`

`DocumentFragment` 是一种没有父节点的轻量节点容器。它可以暂存一组节点，但把它插入元素时，真正被移动的是它的子节点：

```js
const fragment = document.createDocumentFragment();
fragment.append(
  document.createElement("h2"),
  document.createElement("p")
);

console.log(fragment.childNodes.length); // 2
document.body.append(fragment);
console.log(fragment.childNodes.length); // 0
```

插入后：

- `h2` 和 `p` 成为 `body` 的子节点；
- 页面中不会出现一个名为 `DocumentFragment` 的包装节点；
- 原片段被清空；
- 再次 `append(fragment)` 不会插入任何内容。

`template.content` 本身也是一个片段，但通常不要直接把原始 `.content` 插入页面：

```js
// 错误：第一次会把模板内容移走，后续没有原型可克隆。
list.append(template.content);
```

应先克隆：

```js
const copy = template.content.cloneNode(true);
list.append(copy);
```

这样原模板仍可继续产生新实例。

### 4.3 `cloneNode()`：复制节点结构，不复制运行时关系

`cloneNode(deep)` 的参数决定是否复制后代：

```js
const shallow = template.content.cloneNode(false);
const deep = template.content.cloneNode(true);

console.log(shallow.childNodes.length); // 0
console.log(deep.childNodes.length); // 包含模板后代
```

深克隆会复制：

- 元素及其后代；
- 文本节点；
- HTML 属性及属性值；
- 写在属性中的内联事件处理器文本。

深克隆不会复制通过 `addEventListener()` 建立的监听器，也不会复制赋给 DOM 事件属性的 JavaScript 函数关系：

```js
const sourceButton = template.content.querySelector("button");
sourceButton.addEventListener("click", () => {
  console.log("模板原型按钮");
});

const fragment = template.content.cloneNode(true);
const clonedButton = fragment.querySelector("button");

// 点击 clonedButton 不会输出“模板原型按钮”。
```

原因不是浏览器“漏复制”，而是监听器属于节点对象的运行时注册状态，不是节点结构和 HTML 属性的一部分。每个克隆节点都是新的对象，需要：

- 在克隆后为实例绑定监听器；
- 或把事件委托给稳定的祖先；
- 或让自定义元素在连接时建立自己的监听器。

不要为了让监听器“可复制”改用 `onclick="..."`。内联处理器把行为塞回标记，依赖全局名称，也扩大不可信内容进入可执行上下文的风险。

### 4.4 克隆中的状态、引用与唯一性

克隆不是“生成完整业务对象”。还要处理三个边界。

#### 唯一 `id`

如果模板包含固定 `id`，克隆三次就会得到三个相同 ID：

```html
<!-- 错误：每次克隆都产生 id="listing-title" -->
<article aria-labelledby="listing-title">
  <h2 id="listing-title"></h2>
</article>
```

优先在重复实例内部使用类和相对查询。如果必须用 ID 建立 `aria-labelledby`、`for` 或片段引用，应在每次克隆时生成稳定且唯一的成对值。

#### 数据填充

模板只提供结构。业务数据仍要经过明确转换：

```js
title.textContent = listing.title;
price.textContent = formatCents(listing.priceCents);
time.dateTime = listing.createdAt;
time.textContent = formatLocalTime(listing.createdAt);
```

标题用 `textContent`，避免把数据中的 `<`、`&` 或标签样文本再次当作 HTML 解析。价格保留整数分模型，时间保留 UTC 原值并单独格式化展示。

#### 节点引用

片段插入后会变空，因此应在插入前取得需要的节点引用：

```js
const fragment = template.content.cloneNode(true);
const button = fragment.querySelector("button");

list.append(fragment);
button.focus(); // 引用仍指向已经进入页面的那个按钮。
```

## 5. 元素、属性、API 或配置清单

### 5.1 模板与片段

| 项目 | 类型 | 关键行为 | 常见误区 |
| --- | --- | --- | --- |
| `<template>` | HTML 元素 | 保存惰性模板内容 | 当作 `display: none` 容器 |
| `template.content` | `DocumentFragment` | 访问实际模板节点 | 从 `template` 直接查后代 |
| `DocumentFragment` | DOM 节点 | 插入时移动其子节点 | 以为页面会保留片段包装 |
| `cloneNode(false)` | Node 方法 | 只复制当前节点 | 期待包含全部模板后代 |
| `cloneNode(true)` | Node 方法 | 深复制结构、文本和属性 | 期待复制监听器和业务状态 |
| `document.createDocumentFragment()` | DOM 方法 | 手工创建临时节点集合 | 把它当永久组件实例 |

## 6. 最小可运行案例

### 6.1 目标：从惰性模板创建两张商品卡

这个案例只关注：

- `template.content`；
- `DocumentFragment`；
- 深克隆；
- 安全数据填充；
- 监听器不随克隆复制；
- 插入后片段变空。

它不创建自定义元素，先把“结构复用”与“组件生命周期”分开。

### 6.2 文件位置

在个人练习目录创建：

```text
market-learning/
└── practice/
    └── html-chapter-06/
        └── template-listings.html
```

### 6.3 完整文件

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>template 商品卡实验</title>
  <style>
    body {
      max-width: 48rem;
      margin: 2rem auto;
      padding: 0 1rem;
      font-family: system-ui, sans-serif;
      line-height: 1.6;
    }

    #listing-list {
      display: grid;
      gap: 1rem;
      padding: 0;
      list-style: none;
    }

    .listing-card {
      padding: 1rem;
      border: 1px solid #b8c1cc;
      border-radius: 0.75rem;
    }

    .listing-card h2 {
      margin-block-start: 0;
    }

    .favorite[aria-pressed="true"] {
      color: #7b1b1b;
      border-color: currentColor;
    }
  </style>
</head>
<body>
  <main>
    <h1>今日邻里商品</h1>
    <p>商品是固定教学数据；收藏只保存在当前页面内存中。</p>

    <ul id="listing-list"></ul>
    <p id="favorite-status" role="status">还没有收藏操作。</p>
  </main>

  <template id="listing-template">
    <li>
      <article class="listing-card">
        <h2 class="listing-title"></h2>
        <p>
          <data class="listing-price"></data>
          · 发布于
          <span class="listing-created"></span>
        </p>
        <button class="favorite" type="button" aria-pressed="false">
          收藏
        </button>
      </article>
    </li>
  </template>

  <script>
    const listings = [
      {
        id: "listing-lamp",
        title: "可调光阅读台灯",
        priceCents: 8600,
        createdAt: "2026-10-10T08:30:00.000Z"
      },
      {
        id: "listing-desk",
        title: "折叠学习桌",
        priceCents: 12800,
        createdAt: "2026-10-10T09:15:00.000Z"
      }
    ];

    const favorites = new Set();
    const template = document.querySelector("#listing-template");
    const list = document.querySelector("#listing-list");
    const status = document.querySelector("#favorite-status");
    const currency = new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY"
    });

    console.assert(template.content instanceof DocumentFragment);
    console.assert(template.children.length === 0);
    console.assert(template.content.children.length === 1);

    const prototypeButton =
      template.content.querySelector(".favorite");

    prototypeButton.addEventListener("click", () => {
      console.log("这条模板原型监听器不会被 cloneNode 复制。");
    });

    function formatCents(priceCents) {
      return currency.format(priceCents / 100);
    }

    function renderListing(listing) {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector(".listing-card");
      const title = fragment.querySelector(".listing-title");
      const price = fragment.querySelector(".listing-price");
      const createdPlaceholder =
        fragment.querySelector(".listing-created");
      const created = document.createElement("time");
      const button = fragment.querySelector(".favorite");

      card.dataset.listingId = listing.id;
      title.textContent = listing.title;
      price.value = String(listing.priceCents);
      price.textContent = formatCents(listing.priceCents);
      created.dateTime = listing.createdAt;
      created.textContent =
        new Date(listing.createdAt).toLocaleString("zh-CN");
      createdPlaceholder.replaceWith(created);
      button.dataset.listingId = listing.id;

      button.addEventListener("click", () => {
        const willFavorite = !favorites.has(listing.id);

        if (willFavorite) {
          favorites.add(listing.id);
        } else {
          favorites.delete(listing.id);
        }

        button.setAttribute("aria-pressed", String(willFavorite));
        button.textContent = willFavorite ? "取消收藏" : "收藏";
        status.textContent = willFavorite
          ? `已在当前页面收藏“${listing.title}”。`
          : `已在当前页面取消收藏“${listing.title}”。`;
      });

      console.assert(fragment.childNodes.length > 0);
      list.append(fragment);
      console.assert(fragment.childNodes.length === 0);
    }

    listings.forEach(renderListing);
  </script>
</body>
</html>
```

### 6.4 打开与运行

1. 保存 `template-listings.html`；
2. 直接用现代浏览器打开；
3. 打开 DevTools 的 Console；
4. 点击两张卡片的收藏按钮；
5. 在 Elements 中展开 `template#listing-template` 的 `#document-fragment`；
6. 在 Console 输入：

```js
document.querySelector("#listing-template").content
document.querySelectorAll(".listing-card").length
document.querySelector("#listing-template").children.length
```

停止方式：关闭页面即可。页面不写存储、不发请求，也不需要清理服务进程。

### 6.5 预期结果

- 页面显示两张商品卡，`template` 原型本身不显示；
- 价格分别显示为人民币 86 元和 128 元，业务数据仍是 `8600`、`12800` 分；
- UTC `datetime` 原值保留，界面文字按设备本地时区显示；
- 每个收藏按钮独立切换当前页内存状态；
- Console 的三个 `console.assert()` 类别均不报告失败；
- 点击克隆按钮不会输出“模板原型监听器”；
- 每个克隆按钮自己的监听器会更新文字与状态；
- `template.children.length` 为 `0`；
- `template.content.children.length` 为 `1`；
- 刷新页面后收藏状态恢复为初始值。

### 6.6 逐步推导

#### 第一步：保留稳定结构

模板只声明卡片骨架，不写具体商品，也不放重复 ID。

#### 第二步：深克隆

```js
const fragment = template.content.cloneNode(true);
```

若误写 `false`，片段没有后代，后续查询全部得到 `null`。

#### 第三步：在插入前查询和填充

片段插入后会变空，所以先取得 `card`、`title`、`price`、时间占位节点和 `button`。商品标题通过 `textContent` 填充；即使标题包含 `<em>`，也只显示文字。脚本根据 UTC 数据创建带 `datetime` 的真实 `time` 元素，再替换普通占位节点，因此模板源码和插入后的实例都不依赖伪造日期。

#### 第四步：为实例建立运行时行为

模板原型上的监听器没有被克隆。案例显式给每个克隆按钮绑定监听器，让这条边界可以通过 Console 观察。

#### 第五步：插入并验证片段清空

```js
list.append(fragment);
console.assert(fragment.childNodes.length === 0);
```

这证明被插入的是子节点。已经保存的 `button` 引用仍指向页面中的按钮。

### 6.7 失败时优先检查

| 现象 | 优先证据 | 可能根因 | 最小修复 |
| --- | --- | --- | --- |
| 页面没有商品卡 | Console 是否有 null 属性错误 | 使用浅克隆或选择器拼错 | 改为 `cloneNode(true)`，逐项检查选择器 |
| 模板原型消失，只能渲染一次 | Elements 中 `template.content` 是否变空 | 直接 append 原 `.content` | 每次先深克隆 |
| 点击没有反应 | Event Listeners 面板检查克隆按钮 | 只给模板原型绑定监听器 | 克隆后绑定或使用事件委托 |
| 多张卡查询到同一标题 | Elements 检查重复 ID | 模板包含固定 ID | 用类和相对查询，或为每份克隆生成唯一 ID |
| 标题中的标签被解析 | Elements 检查是否出现意外元素 | 使用 `innerHTML` 填业务文字 | 改为 `textContent` |
| 时间相差数小时 | 检查 `datetime` 与设备时区 | 把 UTC 显示差异误判为数据变化 | 保留 UTC 原值，明确本地展示 |

### 6.8 渐进扩展：从逐实例监听到稳定祖先委托

当商品数量增加时，可以保留模板渲染，把按钮监听移到稳定的 `#listing-list`。事件委托已经在上一课讲解，这里只说明模板与委托如何组合：

```js
list.addEventListener("click", (event) => {
  const button = event.target.closest(".favorite");

  if (!button || !list.contains(button)) {
    return;
  }

  const { listingId } = button.dataset;
  // 根据 listingId 更新内存 Set 和当前按钮。
});
```

模板负责“每个实例有哪些节点”，委托负责“动态实例的事件从哪里统一处理”。两者职责不同，可以独立替换。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [Shadow DOM、slot 与渐进增强](12-shadow-dom-slots-progressive-enhancement.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 INT-005（`template`、DocumentFragment、cloneNode） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`12-shadow-dom-slots-progressive-enhancement.md`](12-shadow-dom-slots-progressive-enhancement.md)。

## 8. 常见错误与排查路径

### 8.1 从 `template` 而不是 `.content` 查询

**错误代码：**

```js
const template = document.querySelector("#listing-template");
const title = template.querySelector(".listing-title");
title.textContent = "台灯";
```

**现象：**

Console 报 `Cannot set properties of null`。

**证据：**

```js
template.children.length // 0
template.content.querySelector(".listing-title") // HTMLHeadingElement
```

**修复：**

```js
const fragment = template.content.cloneNode(true);
const title = fragment.querySelector(".listing-title");
```

### 8.2 直接插入原始 `.content`

**错误代码：**

```js
list.append(template.content);
list.append(template.content);
```

**现象：**

第一次有内容，第二次什么也没有；Elements 中模板片段已经变空。

**根因：**

片段插入会移动其子节点。

**修复：**

```js
list.append(template.content.cloneNode(true));
list.append(template.content.cloneNode(true));
```

### 8.3 使用浅克隆

**错误代码：**

```js
const fragment = template.content.cloneNode(false);
console.log(fragment.querySelector(".listing-title")); // null
```

**修复：**

模板实例需要后代时使用 `cloneNode(true)`。不要为了消除 null 错误而跳过节点填充。

### 8.4 假设监听器会被克隆

**错误代码：**

```js
const source = template.content.querySelector("button");
source.addEventListener("click", saveFavorite);

const copy = template.content.cloneNode(true);
list.append(copy);
```

**现象：**

按钮存在，但点击不执行 `saveFavorite`。

**诊断：**

在 DevTools 的 Event Listeners 面板比较模板原型按钮与克隆按钮。

**修复选择：**

```js
const copy = template.content.cloneNode(true);
copy.querySelector("button")
  .addEventListener("click", saveFavorite);
```

或者把 click 委托给稳定列表祖先。不要改成内联 `onclick`。

### 8.5 克隆固定 ID

**错误模板：**

```html
<template id="item-template">
  <article aria-labelledby="item-title">
    <h3 id="item-title"></h3>
  </article>
</template>
```

**诊断：**

```js
document.querySelectorAll("#item-title").length
```

大于 1 就违反唯一性。

**修复：**

不需要跨节点引用时移除 ID。确需关联时按商品稳定标识生成：

```js
const titleId = `listing-title-${listing.id}`;
article.setAttribute("aria-labelledby", titleId);
title.id = titleId;
```

仍需保证 `listing.id` 已按项目规则规范化，且同一页面不会重复。

### 8.6 排查顺序

遇到“组件没显示或行为重复”，按证据顺序检查：

1. **Console**：是否有语法错误、`SyntaxError`、`NotSupportedError` 或 null 访问；
2. **注册表**：`customElements.get(name)` 是否返回预期构造器；
3. **升级状态**：宿主是否匹配 `:defined`；
4. **Elements**：是否存在 ShadowRoot，模式与预期是否一致；
5. **模板边界**：节点在 `template.content` 还是普通后代；
6. **克隆深度**：是否使用 `cloneNode(true)`；
7. **唯一性**：是否复制了固定 ID；
8. **属性**：宿主最终属性值、布尔属性存在性是否正确；
9. **slot**：`assignedNodes()` / `assignedElements()` 实际返回什么；
10. **监听器**：重连前后 Event Listeners 数量和动作计数；
11. **所有权**：节点的 `parentNode`、`getRootNode()` 与预期是否一致；
12. **边界声明**：问题究竟是组件封装、页面数据还是服务端职责。

## 9. 课后题

### 9.1 代码推理题

阅读代码：

```js
const template = document.querySelector("#card-template");
const fragment = template.content.cloneNode(true);
const button = fragment.querySelector("button");

button.addEventListener("click", () => console.log("clicked"));
list.append(fragment);
list.append(fragment);
```

回答：

1. 卡片会插入几次？
2. 点击页面里的按钮是否输出？
3. `fragment.childNodes.length` 最终是多少？
4. 若想插入第二份独立卡片，应改哪一行？

## 10. 实践练习

### 10.1 基础：商品标签模板

**目标**

创建 `template-badges.html`，用一个模板渲染三条商品状态标签。

数据：

```js
const listings = [
  { id: "lamp", title: "阅读台灯", status: "available" },
  { id: "desk", title: "折叠学习桌", status: "reserved" },
  { id: "shelf", title: "窄边书架", status: "sold" }
];
```

**要求**

- 模板中不出现固定 ID；
- 使用 `template.content.cloneNode(true)`；
- 标题通过 `textContent` 填充；
- 状态代码映射为“可预约 / 已预约 / 已售出”；
- 插入前后记录 fragment 子节点数量；
- 页面显示数据来源为固定教学数组。

**运行**

直接打开文件并查看 Console。

**预期**

三条商品均显示；每次插入前片段非空，插入后为 `0`。

**失败优先检查**

浅克隆、从 `template` 查询、状态映射拼写和 fragment 被重复使用。

### 10.2 故障演练：重复注册

**目标**

在 Console 主动重复执行 `define()`，记录错误名称，再使用 `get()` 解释注册表状态。

**要求**

- 不通过刷新后忽略错误完成练习；
- 找到哪个脚本或执行路径进行了第二次注册；
- 加入幂等保护；
- 若是两个不同类争同名，记录为名称冲突并停止静默覆盖。

**预期**

相同实现重复加载时不再抛错；不同实现争名时有明确诊断。

## 11. 阶段验收

### 11.1 结构与模板

- [ ] 能解释模板内容为何在 `.content` 中；
- [ ] `template` 原型不直接显示；
- [ ] 使用深克隆创建完整实例；
- [ ] 没有直接移走原始 `.content`；
- [ ] 插入前后能证明 fragment 被清空；
- [ ] 商品文字使用 `textContent`；
- [ ] 模板没有产生重复 ID；
- [ ] 能证明 JavaScript 监听器不会随克隆复制；
- [ ] 每个实例监听或祖先委托有明确归属。

### 11.2 项目与边界

- [ ] 商品数据是静态教学数组；
- [ ] 收藏与确认明确标为当前页内存状态；
- [ ] 金额业务值使用整数分；
- [ ] 时间业务值使用 UTC ISO 8601；
- [ ] 没有声称实现登录、授权、服务端预约或并发；
- [ ] 核心提示在脚本失败时仍可阅读；
- [ ] 自定义事件是否跨 Shadow 边界是显式决定；
- [ ] 内部选择器未被当作公开稳定 API；
- [ ] 未把 Shadow DOM 当作清洗不可信 HTML 的工具。

## 12. 常见问题

### Q1：`template` 和 `display: none` 有什么区别？

`display: none` 元素仍在活动文档树中，只是不生成可见盒；其中节点仍是普通文档节点。`template` 内容位于独立 `DocumentFragment`，不会直接成为活动页面内容。模板更适合保存待克隆结构。

### Q2：可以直接修改 `template.content` 吗？

可以，后续克隆会基于修改后的原型。但这会影响所有未来实例，不会自动更新已经插入的实例。应明确是在改模板原型还是改某个实例。

### Q3：为什么不用字符串拼接和 `innerHTML` 生成卡片？

结构化 DOM 模板更容易进行相对查询、逐字段填充和安全文字插入。`innerHTML` 会重新解析字符串；当数据包含不可信内容时会扩大注入风险。静态可信模板可以写在 HTML 中，动态文字用 `textContent`。

### Q4：`cloneNode(true)` 会复制表单当前值吗？

克隆语义围绕节点、属性和部分元素状态存在细节差异，不能把它当完整应用状态复制工具。业务状态应来自明确模型，并在新实例上重新同步；本课不依赖克隆用户正在编辑的表单状态。

### Q5：DocumentFragment 会让大量插入只发生一次重排吗？

片段可以减少逐个调用插入 API 的中间工作，但浏览器最终渲染和布局由实现、样式读取与任务时机共同决定。不要把“使用片段”写成固定一次重排的性能保证；先用性能工具测量真实瓶颈。

### Q10：为什么属性回调可能早于连接回调？

已有标记升级时，浏览器需要把已存在的观察属性交给组件，然后元素才按连接状态执行连接回调。实现应让属性渲染不依赖已经连接。

### Q24：组件属性能代替服务端 Listing 状态吗？

不能。属性是当前页面的表现输入，用户脚本可以修改。商品是否可预约、谁有权限修改、并发预约谁成功，必须由服务端和数据库约束决定。

## 13. 扩展阅读

资料与兼容性说明核验日期：**2026-10-10**。HTML 与 DOM 是持续更新的 Living Standards；下面链接用于核对模型和 API，实际生产基线仍要结合目标浏览器版本、兼容数据和真实测试。

- [WHATWG HTML：`template` 元素](https://html.spec.whatwg.org/multipage/scripting.html#the-template-element)：核对模板内容、`.content`、惰性与克隆语义。
- [WHATWG DOM：`DocumentFragment`](https://dom.spec.whatwg.org/#interface-documentfragment)：核对片段接口、节点树和插入算法。
- [WHATWG DOM：克隆节点](https://dom.spec.whatwg.org/#concept-node-clone)：核对节点克隆算法和深克隆参数。
- [WHATWG HTML：Custom Elements](https://html.spec.whatwg.org/multipage/custom-elements.html)：核对合法名称、升级、构造器要求、注册表与生命周期回调。
- [WHATWG HTML：`CustomElementRegistry`](https://html.spec.whatwg.org/multipage/custom-elements.html#custom-elements-api)：核对 `define()`、`get()` 和 `whenDefined()`。
- [WHATWG DOM：Shadow trees](https://dom.spec.whatwg.org/#shadow-trees)：核对 ShadowRoot、宿主、slot 分配、事件路径与封装模型。
- [WHATWG HTML：`slot` 元素](https://html.spec.whatwg.org/multipage/scripting.html#the-slot-element)：核对具名/默认 slot、`assignedNodes()`、`assignedElements()` 与 `slotchange`。
- [MDN：`template`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/template)：查看可运行示例、DocumentFragment 与声明式 Shadow DOM 的独立边界。
- [MDN：Using custom elements](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_custom_elements)：查看自主自定义元素、生命周期、注册和属性响应示例。
- [MDN：Using shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)：查看 open/closed、样式封装和页面脚本访问边界。
- [MDN：Using templates and slots](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_templates_and_slots)：查看模板克隆、具名 slot 与组合案例。
- [MDN：`HTMLSlotElement.assignedElements()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLSlotElement/assignedElements)：核对返回元素和 `flatten` 选项。
- [MDN：`slotchange`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLSlotElement/slotchange_event)：核对直接分配变化与后代变化边界。
- [MDN：`CustomElementRegistry.define()`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/define)：核对重复名称、重复构造器和无效名称错误。
- [MDN：`CustomElementRegistry.whenDefined()`](https://developer.mozilla.org/en-US/docs/Web/API/CustomElementRegistry/whenDefined)：核对 Promise 结果与无效名称拒绝。

阅读时重点核对五组边界：

1. 模板惰性与 `display: none` 是否被混为一谈；
2. 节点结构克隆与监听器、业务状态复制是否被混为一谈；
3. 构造一次与连接多次是否被混为一谈；
4. Light DOM 投影与节点所有权移动是否被混为一谈；
5. Shadow DOM 封装与鉴权、秘密保护是否被混为一谈。

## 我现在能做到什么

- 能解释并验证：解析但暂不激活 template 内容，使用 DocumentFragment 和 cloneNode() 安全复用结构。
- `INT-005`：`template`、DocumentFragment、cloneNode
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：事件委托与合成事件](09-event-delegation-synthetic-events.md) · [下一课：自定义元素生命周期与属性同步](11-custom-elements-lifecycle-attributes.md) · [返回 HTML 模块](../README.md)
