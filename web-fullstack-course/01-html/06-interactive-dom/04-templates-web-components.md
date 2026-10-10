# template 与 Web Components：复用结构并管理组件生命周期

> 所属章节：原生交互、DOM 与事件
>
> 建议学习时间：5–6 小时
>
> 阶段成果：完成一个可重复渲染商品、可断开重连并接收页面内容的“邻里集市提示组件”

## 任务卡

邻里集市的商品列表已经能通过 DOM API 创建节点，也能处理动态按钮事件。随着重复结构增多，新的问题出现了：

- 每张商品卡都手写同一组节点，结构容易漂移；
- 把一段隐藏 HTML 当“模板”会让它仍然参与文档语义或资源行为；
- 复制节点后，原节点上的监听器没有跟着复制；
- 自定义元素从页面移除再插回时，可能重复绑定监听器；
- 页面希望提供提示标题和正文，但组件仍要控制自己的边框、状态和按钮；
- 团队把 closed Shadow DOM 误解成敏感数据保险箱。

本课用两层复用解决这些问题：

1. 用 `template` 保存不会立即渲染的商品卡结构，每次从 `.content` 深克隆；
2. 用自主自定义元素 `market-note` 管理提示组件的连接、断开、属性同步、Shadow DOM 和 slot。

**完成本课后，你将交付：**

- 一个从 `template.content` 克隆的商品列表；
- 一份证明 `DocumentFragment` 插入后会被清空的观察记录；
- 一份证明 `cloneNode(true)` 不复制 `addEventListener()` 监听器的观察记录；
- 一个合法注册并可通过 `get()`、`whenDefined()` 检查的 `market-note`；
- 一个覆盖连接、断开、跨文档采用和属性变化的生命周期说明；
- 一个使用 `AbortController` 清理监听器、反复重连也只响应一次的组件；
- 一个具有具名标题 slot、默认 slot、fallback 与 `slotchange` 诊断的开放 Shadow DOM；
- 一份解释 open/closed Shadow DOM 是封装边界而不是安全边界的记录。

本课的商品来自脚本中的固定数组，收藏只保存在当前页面的 `Set` 中。金额以整数分保存，时间以 UTC ISO 8601 字符串保存并在界面按本地时区展示。页面没有网络请求、账号、持久化、服务端授权、真实预约或并发控制。

## 1. 任务背景

### 1.1 复用结构、封装行为和保护数据是三件事

下面三个目标经常被混在一起：

| 目标 | 主要机制 | 能解决什么 | 不能保证什么 |
| --- | --- | --- | --- |
| 重复创建相同结构 | `template` + `cloneNode(true)` | 避免反复手写节点层级 | 不自动填数据、不自动复制监听器 |
| 封装可复用元素行为 | Custom Elements | 定义名称、类、生命周期和公开属性 | 不自动隔离内部 DOM 或样式 |
| 建立 DOM 与样式边界 | Shadow DOM + slot | 隔离内部树，控制页面内容投影位置 | 不提供鉴权、加密或秘密存储 |

`template` 可以独立使用，不必先创建自定义元素。自定义元素也可以只管理 Light DOM，不必附加 Shadow DOM。Shadow DOM 还可以挂在普通元素上，不要求宿主已注册为自定义元素。

本课把三者组合，是因为“邻里集市提示”同时有重复结构、生命周期和投影内容需求，而不是因为 Web Components 必须一次使用全部能力。

### 1.2 两棵树和一组投影关系

使用 Shadow DOM 后，应区分：

```text
文档树中的宿主元素
market-note
├── h2[slot="title"]       ← Light DOM，仍是宿主的子节点
└── p                      ← Light DOM，仍是宿主的子节点

宿主的 ShadowRoot
└── aside
    ├── slot[name="title"] ← 显示具名分配内容或 fallback
    ├── slot               ← 显示未命名分配内容或 fallback
    └── button             ← 组件内部节点
```

slot 不会把 Light DOM 节点搬进 ShadowRoot。它建立的是渲染投影关系：

- `h2.parentElement` 仍是 `market-note`；
- `h2.getRootNode()` 仍是页面 `document`；
- `slot.assignedElements()` 可以取得投影到该 slot 的元素；
- Shadow DOM 内部按钮的根是 `ShadowRoot`；
- 页面脚本仍能查询和修改 Light DOM 标题。

理解“所有权没有改变”是解释样式、事件、表单、清理和 `slotchange` 的基础。

### 1.3 本课的可观察完成标准

不能只看到“页面长得像组件”就判定完成。至少要观察：

1. `template` 本身不显示商品卡，克隆并插入后才显示；
2. `template.content` 是 `DocumentFragment`；
3. 深克隆包含后代，浅克隆不包含后代；
4. 插入一个片段后，片段自身变为空；
5. 模板原型节点上的 JavaScript 监听器不会自动出现在克隆节点上；
6. `market-note` 定义前的 Light DOM 仍可阅读，定义后被投影到 slot；
7. `tone`、`updated-at` 和 `acknowledged` 属性变化会同步到组件可见状态；
8. 断开并重连组件三次后，点击一次内部按钮仍只产生一次动作；
9. 有标题节点时使用分配标题，没有标题节点时显示 fallback；
10. 修改直接分配节点会触发 `slotchange`，只改节点内部文字通常不会；
11. `customElements.get("market-note")` 返回构造器，`whenDefined()` 正常完成；
12. 重复 `define()` 能在 Console 中定位为注册表错误；
13. 页面没有把 Shadow DOM 描述为权限、隐私或敏感数据保护。

## 2. 学习目标

完成本课后，你应能：

- 解释 `template` 内容为什么是惰性的，以及惰性不等于删除；
- 通过 `.content` 查询 `DocumentFragment` 中的节点；
- 区分 `cloneNode(false)` 与 `cloneNode(true)`；
- 解释片段插入时移动的是其子节点，而不是片段包装本身；
- 说明属性和后代会被克隆，但通过 `addEventListener()` 注册的监听器不会；
- 避免克隆后产生重复 `id`；
- 为自主自定义元素选择包含连字符的合法名称；
- 使用 `customElements.define()`、`get()` 和 `whenDefined()`；
- 解释已有未知元素何时升级为已定义的自定义元素；
- 遵守自定义元素构造器的限制，把依赖连接和页面内容的工作留给生命周期；
- 使用 `connectedCallback()` 完成每次连接所需的初始化；
- 使用 `disconnectedCallback()` 清理监听器、计时器或其他外部资源；
- 解释 `adoptedCallback()` 与同一文档内移动的区别；
- 使用 `observedAttributes` 和 `attributeChangedCallback()` 同步公开属性；
- 避免属性与属性 setter 互相反射导致递归；
- 编写重连安全、幂等的初始化和清理逻辑；
- 比较 open 与 closed ShadowRoot 的可观察 API 差异；
- 解释 Shadow DOM 的 DOM、样式和事件边界，以及它不提供的安全保证；
- 使用具名 slot、默认 slot 和 fallback 内容；
- 用 `assignedElements()` 观察实际分配的元素；
- 用 `slotchange` 响应直接分配关系变化，并识别它不会观察的深层文字变化；
- 设计无 JavaScript 时仍能阅读核心信息的渐进增强基线；
- 在 DevTools 的 Elements、Console 和 Event Listeners 面板中定位组件问题。

## 3. 预备知识

开始前建议先完成：

- [DOM 查询、创建与修改](02-dom-query-mutation.md)；
- [事件、表单与委托](03-events-forms-delegation.md)。

你需要知道：

- 元素节点与文本节点不同；
- `querySelector()` 可能返回 `null`；
- `append()` 会移动已有节点；
- `textContent` 可把不可信文字作为文字插入，而不是再次解析 HTML；
- `addEventListener()` 可使用 `AbortSignal` 批量清理；
- 属性是 HTML/DOM 边界上的字符串状态；
- 自定义事件可以通过 `bubbles` 和 `composed` 决定传播范围。

本课不要求：

- 安装框架、构建工具、polyfill 或第三方组件库；
- 创建真实 npm 包；
- 实现跨页面持久化；
- 在组件中发起网络请求；
- 使用 form-associated custom elements；
- 使用 customized built-in elements；
- 把组件内部实现当作稳定公共 API；
- 用 closed Shadow DOM 保存令牌、身份或个人信息。

两个完整案例都可以直接通过 `file://` 打开。若目标浏览器或组织策略限制本地脚本，可在个人练习目录运行已有的静态文件服务器；本课不要求新增依赖。浏览器兼容性结论必须以实际目标版本和官方兼容数据为准。

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

### 4.5 自主自定义元素：给新标签定义行为

本课使用自主自定义元素：

```js
class MarketNote extends HTMLElement {
  connectedCallback() {
    console.log("market-note 已连接");
  }
}

customElements.define("market-note", MarketNote);
```

名称必须是合法 custom element name。最容易观察的要求是至少包含一个连字符：

```text
market-note   合法且语义明确
marketnote    非法：没有连字符
Market-Note   非法：名称语法不允许 ASCII 大写字母
```

连字符既降低与当前内建元素重名的风险，也为未来 HTML 新元素保留名称空间。真实命名还应避免规范保留名，并在团队内使用稳定前缀。

自主自定义元素继承 `HTMLElement`，在 HTML 中直接写 `<market-note>`。另一类 customized built-in element 会继承具体内建元素并使用 `is` 属性，但其兼容性和使用模型不同；本课不把它作为项目基线。

### 4.6 自定义元素注册表：`define()`、`get()` 与 `whenDefined()`

每个 `Window` 有一个 `customElements` 注册表。

#### `define(name, constructor)`

`define()` 把名称和构造器关联起来：

```js
customElements.define("market-note", MarketNote);
```

定义成功后：

- 后续创建的 `<market-note>` 使用该构造器；
- 文档中已经存在的同名未知元素会被升级；
- 相应生命周期会按照当前状态执行。

同一个名称不能定义两次，同一个构造器也不能注册为多个名称。重复注册通常抛出 `NotSupportedError`。

#### `get(name)`

`get()` 同步读取已经注册的构造器：

```js
const constructor = customElements.get("market-note");

if (constructor) {
  console.log("已经注册", constructor);
}
```

它适合：

- 避免一个脚本被重复执行时再次注册；
- 在测试或诊断中确认实际构造器；
- 在多个入口可能装载同一组件时实施幂等注册。

常见保护：

```js
if (!customElements.get("market-note")) {
  customElements.define("market-note", MarketNote);
}
```

这能避免相同组件脚本重复执行时报错，但不能掩盖两个不同实现争夺同一名称。若现有构造器不是预期版本，应修复依赖或装载顺序，而不是静默跳过。

#### `whenDefined(name)`

`whenDefined()` 返回 Promise，在名称完成定义后兑现为构造器：

```js
customElements.whenDefined("market-note").then((constructor) => {
  console.log("可以调用依赖组件定义的逻辑", constructor);
});
```

如果调用时已经定义，Promise 仍以已完成定义的构造器兑现。名称本身无效时，Promise 会拒绝并给出 `SyntaxError`。它适合等待分批加载的组件定义，不表示组件实例已经连接，也不表示其异步数据已经加载完成。

### 4.7 构造器约束：只建立自身，不依赖页面现场

自定义元素构造器有严格的升级语义。可靠原则是：

1. 派生类构造器先调用 `super()`，再访问 `this`；
2. 初始化内部字段和稳定引用；
3. 可以附加 ShadowRoot 并建立与外部内容无关的内部骨架；
4. 不读取依赖解析时机的属性、子节点或父节点；
5. 不根据当前连接状态发起网络请求或绑定全局监听；
6. 不在构造过程中给宿主增加业务属性或 Light DOM 子节点；
7. 把依赖属性和页面的渲染留给回调。

错误示例：

```js
class MarketNote extends HTMLElement {
  constructor() {
    super();

    // 错误：解析器升级时，后续 Light DOM 子节点可能尚未解析。
    const title = this.querySelector('[slot="title"]').textContent;

    // 错误：连接、断开、重连时无法统一管理。
    window.addEventListener("resize", this.render);
  }
}
```

更稳妥的分工：

```js
class MarketNote extends HTMLElement {
  constructor() {
    super();
    this.connectionController = null;
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    // 此时元素已经连接；建立本次连接需要的监听器。
  }

  disconnectedCallback() {
    // 对称清理本次连接建立的外部关系。
  }
}
```

构造器可能因脚本创建、HTML 解析或已有元素升级而运行。不要让正确性依赖“构造时属性和子节点一定已经齐全”这一偶然顺序。

### 4.8 `connectedCallback()`：每次连接都可能执行

当自定义元素被插入一个文档连接树时，浏览器调用 `connectedCallback()`。它不是“一生只执行一次”的挂载钩子：

```js
const note = document.querySelector("market-note");
note.remove();            // disconnectedCallback()
document.body.append(note); // connectedCallback() 再次执行
```

同一文档内移动元素也可能经历断开和重新连接回调。实现应假设：

- 一个实例可以连接多次；
- 上一次连接可能留下监听器、计时器或观察器；
- DOM 移动不代表应重建永久内部结构；
- 初始化必须幂等，或者每次连接前都有完整清理。

适合在连接回调中完成：

- 读取当前公开属性并渲染；
- 为当前连接绑定事件；
- 订阅依赖文档连接的观察器；
- 建立需要在断开时取消的计时器或异步任务；
- 读取 slot 分配结果。

### 4.9 `disconnectedCallback()`：解除组件建立的外部关系

元素不再连接文档时调用 `disconnectedCallback()`。这不等于实例会被立即销毁：脚本可能仍持有引用，并稍后重新插入。

应清理当前连接创建的资源：

- 事件监听器；
- `setInterval()` 或未完成的 `setTimeout()`；
- `MutationObserver`、`ResizeObserver`、`IntersectionObserver`；
- 可取消的请求或流；
- 与其他对象建立的订阅。

`AbortController` 可以让一组监听器具有同一生命周期：

```js
connectedCallback() {
  if (this.connectionController) {
    return;
  }

  this.connectionController = new AbortController();
  const { signal } = this.connectionController;

  this.shadowRoot
    .querySelector("button")
    .addEventListener("click", this.handleClick, { signal });

  window.addEventListener("resize", this.handleResize, { signal });
}

disconnectedCallback() {
  this.connectionController?.abort();
  this.connectionController = null;
}
```

这里有两道保险：

- 非空 controller 阻止同一次连接期间重复初始化；
- 断开时 `abort()` 移除本次连接的全部监听器，并把字段恢复为 `null`，允许下一次连接重新建立。

只写 `connectedCallback()` 而不清理，会让重连后的一个点击执行多次。只写“已初始化”布尔值且断开不清理，则会让重连后的组件继续依赖旧文档或旧观察器。

### 4.10 `adoptedCallback()`：跨文档采用

当元素从一个 `Document` 被采用到另一个 `Document` 时，可执行：

```js
adoptedCallback(oldDocument, newDocument) {
  console.log("文档已改变", oldDocument.URL, newDocument.URL);
}
```

典型触发方式是 `newDocument.adoptNode(element)`，或者把节点移动到另一个文档的树中。它与同一文档内从一个容器移动到另一个容器不同。

采用可能改变：

- `ownerDocument`；
- 基于文档的 URL 解析环境；
- 关联的样式表和字体；
- 应绑定的 `window` 或 `document`；
- 文档语言、方向与区域上下文。

若组件监听 `document` 或 `window`，连接与断开清理尤其重要。不要在构造器永久捕获第一个文档，并假设实例永远不会被采用。

本课完整案例记录 `adoptedCallback()`，但不自动创建 iframe 或第二文档。跨文档行为属于定向实验，普通页面的核心功能不依赖它。

### 4.11 `observedAttributes` 与 `attributeChangedCallback()`

浏览器不会把每个属性变化都推给组件。类必须先声明需要观察的属性：

```js
class MarketNote extends HTMLElement {
  static get observedAttributes() {
    return ["tone", "updated-at", "acknowledged"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    this.render();
  }
}
```

回调参数表示：

| 操作 | `oldValue` | `newValue` |
| --- | --- | --- |
| 新增 `tone="warning"` | `null` | `"warning"` |
| 改为 `tone="info"` | `"warning"` | `"info"` |
| 删除 `tone` | `"info"` | `null` |

已有标记在升级时，观察属性也可能在首次连接前触发回调。因此 `render()` 不应假设元素已经连接；它可以更新构造器已建立的 Shadow DOM，但不应依赖外部容器一定存在。

HTML 属性都是字符串或“存在/不存在”状态。组件要自行解析并处理非法值：

```js
const allowedTones = new Set(["info", "warning"]);
const requestedTone = this.getAttribute("tone");
const tone = allowedTones.has(requestedTone) ? requestedTone : "info";
```

对于布尔状态，应使用属性存在性：

```js
const acknowledged = this.hasAttribute("acknowledged");
this.toggleAttribute("acknowledged", true);
this.removeAttribute("acknowledged");
```

不要把 `acknowledged="false"` 当作 false。布尔 HTML 属性只要存在就表示开启。

### 4.12 属性同步与反射递归

组件常同时暴露 DOM 属性：

```js
get acknowledged() {
  return this.hasAttribute("acknowledged");
}

set acknowledged(value) {
  this.toggleAttribute("acknowledged", Boolean(value));
}
```

setter 把 JavaScript 布尔值反射为 HTML 属性，`attributeChangedCallback()` 再更新视图。这是单向闭环：

```text
DOM 属性 setter
  → 内容属性变化
  → attributeChangedCallback
  → 更新 Shadow DOM
```

错误实现会在回调中再次无条件写同一属性：

```js
attributeChangedCallback(name, oldValue, newValue) {
  // 错误：把收到的变化再次写回，复杂转换时容易递归或抖动。
  this.setAttribute(name, newValue);
}
```

修复原则：

- setter 负责把类型化值规范化为属性；
- 回调读取最终属性并渲染，不无条件写回来源属性；
- 写入前比较旧值；
- 非法值采用明确 fallback，是否修正宿主属性由公开 API 契约决定。

### 4.13 Shadow DOM：封装内部树

Shadow DOM 让宿主拥有独立的 `ShadowRoot`：

```js
const shadowRoot = this.attachShadow({ mode: "open" });
shadowRoot.append(document.createElement("aside"));
```

页面选择器不会穿透边界：

```js
document.querySelector("market-note aside"); // null
note.shadowRoot.querySelector("aside"); // open 模式下可以取得
```

组件内部样式默认只作用于 Shadow Tree，页面上的普通选择器也不会直接选中内部元素。常用边界包括：

- `:host` 选择宿主；
- `::slotted(...)` 选择直接分配到 slot 的 Light DOM 元素；
- CSS 自定义属性可以从宿主继承进 Shadow Tree；
- 可继承 CSS 属性仍可能跨边界继承；
- 组件可显式暴露 `part`，让外部通过 `::part()` 定制；
- 事件是否离开 ShadowRoot 取决于事件的 `bubbles`、`composed` 等语义；
- 离开边界的事件目标可能被重定向为宿主。

因此“样式封装”也不是绝对隔绝。设计良好的组件应把 CSS 自定义属性、slot、part、属性、方法和事件视为公开接口，把其他内部选择器视为实现细节。

### 4.14 open 与 closed：可发现 API 差异，不是安全等级

open 模式：

```js
const root = host.attachShadow({ mode: "open" });
console.log(host.shadowRoot === root); // true
```

closed 模式：

```js
const root = host.attachShadow({ mode: "closed" });
console.log(host.shadowRoot); // null
console.log(root instanceof ShadowRoot); // true，创建方仍持有引用
```

closed 只让 `host.shadowRoot` 对普通外部代码返回 `null`。它可以表达“内部根不是公开 API”，但不能证明内部内容保密：

- 创建 ShadowRoot 的代码已经持有引用；
- 浏览器开发工具或扩展可能提供额外检查能力；
- 页面传入的 Light DOM、属性和事件仍在外部可见；
- 同一页面中的其他脚本与组件运行在同一个前端信任环境；
- 用户下载到浏览器的数据已经到达用户设备；
- 服务端权限、数据最小化、加密和会话控制不由 Shadow DOM 完成。

本课使用 open 模式，便于学习者在 DevTools 中核对内部状态。生产代码选择 closed 也必须基于 API 维护策略，而不是“防止用户看到数据”。

### 4.15 `slot`：由组件决定 Light DOM 显示位置

Shadow DOM 中的 slot 是插入点：

```html
<!-- Shadow DOM 内部 -->
<aside>
  <slot name="title">
    <h2>集市提示</h2>
  </slot>

  <slot>
    <p>暂无补充说明。</p>
  </slot>
</aside>
```

页面使用组件：

```html
<market-note>
  <h2 slot="title">线下交接提醒</h2>
  <p>请在公共地点验货。</p>
</market-note>
```

分配规则：

- Light DOM 元素的 `slot="title"` 匹配 `name="title"`；
- 没有 `slot` 属性的节点分配给默认的无名 slot；
- 名称不匹配的节点不会自动进入另一个具名 slot；
- 同名 slot 通常由树顺序中的第一个插入点获得分配；
- 节点仍属于 Light DOM，只是在 Shadow DOM 的插入点渲染。

`slot` 只有在 Shadow Tree 中才承担这套投影角色。把 `<slot>` 放在普通页面 Light DOM 中，不会自动建立组件投影。

### 4.16 fallback 内容：没有分配节点时的可见基线

slot 自身的子内容是 fallback：

```html
<slot name="title">
  <h2>集市提示</h2>
</slot>
```

当没有节点分配给 `title` 时显示“集市提示”；一旦有任何匹配节点被分配，fallback 不再显示。

注意“空元素也算已分配”：

```html
<market-note>
  <span slot="title"></span>
</market-note>
```

这个空 `span` 会占用具名 slot，fallback 标题不会出现。修复应删除空分配节点或填入有效标题，而不是试图用 CSS 强行显示两份标题。

对于默认 slot，缩进产生的空白文本节点也可能成为分配节点并影响 fallback。若 fallback 是关键内容，应在目标标记中检查实际 `assignedNodes()`，不要只凭源代码肉眼判断“好像没有内容”。

### 4.17 `assignedElements()`：观察分配关系

取得 slot 后，可以读取直接分配的元素：

```js
const titleSlot = this.shadowRoot.querySelector('slot[name="title"]');
const titleElements = titleSlot.assignedElements();
```

相关 API：

| API | 返回 | 适用问题 |
| --- | --- | --- |
| `assignedNodes()` | 元素和文本等所有分配节点 | 空白文本是否占用默认 slot |
| `assignedElements()` | 只返回元素 | 有多少个标题元素被分配 |
| `{ flatten: true }` | 展开后备 slot 链的分配结果 | 组件组合中是否经过其他 slot |

fallback 元素不是“已分配的 Light DOM”。当 fallback 正在显示时，`assignedElements()` 通常返回空数组；需要从 ShadowRoot 自身查询 fallback。

### 4.18 `slotchange`：观察直接分配集合变化

监听 slot：

```js
titleSlot.addEventListener("slotchange", () => {
  const titles = titleSlot.assignedElements();
  console.log("标题分配数量", titles.length);
});
```

以下操作会改变分配集合：

- 增加或删除带 `slot="title"` 的直接子节点；
- 修改直接子节点的 `slot` 属性；
- 把节点移入或移出宿主；
- 让另一节点占用相应 slot。

但下面通常不会触发新的 `slotchange`：

```js
const title = note.querySelector('[slot="title"]');
title.textContent = "新的文字";
```

直接分配的仍是同一个 `title` 元素，只有它内部文字改变。若组件确实需要观察深层内容变化，应明确使用 `MutationObserver` 并限定范围；不要把 `slotchange` 误写成“所有投影内容变化事件”。

### 4.19 渐进增强：定义失败时核心内容仍存在

未知自定义元素在 HTML 中仍可承载普通 Light DOM：

```html
<market-note>
  <h2 slot="title">线下交接提醒</h2>
  <p>请在公共地点验货。</p>
</market-note>
```

如果 JavaScript 未执行：

- 浏览器不会获得组件 Shadow DOM、按钮和属性同步；
- 但 `h2` 与 `p` 仍是普通页面内容；
- 页面可以用 `market-note:not(:defined)` 提供简单边框；
- 核心安全提示不应只存在于构造器动态生成的 Shadow DOM。

定义成功后，Light DOM 被 slot 投影到组件布局中。这个过程是渐进增强：

```text
可读 Light DOM
  → 自定义元素定义并升级
  → Shadow DOM 提供布局与交互
  → 属性和生命周期维持状态
```

`whenDefined()` 可以等待增强完成，但不应先隐藏全部内容再无限等待脚本。

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

### 5.2 自定义元素注册表

| API | 输入 | 结果 | 失败或边界 |
| --- | --- | --- | --- |
| `customElements.define()` | 合法名称、构造器 | 注册并升级已有元素 | 无效名称、重复名称或重复构造器 |
| `customElements.get()` | 名称 | 构造器或 `undefined` | 只表示是否注册，不表示实例已连接 |
| `customElements.whenDefined()` | 名称 | 兑现为构造器的 Promise | 无效名称时拒绝 |
| `document.createElement()` | 已定义或未定义名称 | 对应元素 | 未定义时可先成为未知元素，之后升级 |
| `:defined` | CSS 伪类 | 匹配已定义元素和内建元素 | 不表示组件数据已完成 |

### 5.3 生命周期

| 回调或配置 | 触发条件 | 适合职责 | 不应假设 |
| --- | --- | --- | --- |
| `constructor()` | 构造或升级 | 字段、ShadowRoot、稳定内部骨架 | 属性、Light DOM、父节点已完整 |
| `connectedCallback()` | 每次连接文档 | 绑定本次连接监听、渲染、订阅 | 只调用一次 |
| `disconnectedCallback()` | 每次断开文档 | 取消监听、观察器、计时器、请求 | 实例会立即销毁 |
| `adoptedCallback()` | owner document 改变 | 更新文档相关依赖 | 同文档移动也一定触发 |
| `observedAttributes` | 类级属性名列表 | 声明要观察的公开属性 | 所有属性都会自动观察 |
| `attributeChangedCallback()` | 观察属性新增、改变或删除 | 解析属性并同步视图 | 元素已经连接 |

### 5.4 Shadow DOM 与 slot

| 项目 | 作用 | 关键边界 |
| --- | --- | --- |
| `attachShadow({ mode: "open" })` | 创建可由 `host.shadowRoot` 访问的根 | 只可为宿主附加一次 |
| `attachShadow({ mode: "closed" })` | 创建 `host.shadowRoot` 返回 `null` 的根 | 不是权限或秘密保护 |
| `:host` | 从内部样式选择宿主 | 不穿透到任意祖先 |
| `<slot name="...">` | 接收匹配 `slot` 属性的 Light DOM | 节点所有权不改变 |
| 默认 `<slot>` | 接收无 slot 名称的可分配节点 | 空白文本也可能被分配 |
| slot fallback | 无分配节点时显示 | 不属于 assigned elements |
| `assignedElements()` | 返回分配元素 | 不包含纯文本 |
| `assignedNodes()` | 返回全部分配节点 | 可能包含空白文本 |
| `slotchange` | 直接分配集合变化 | 不观察分配元素的全部后代变化 |
| `::slotted(*)` | 样式化直接分配元素 | 不能像普通后代选择器一样深入任意后代 |

### 5.5 公开组件接口速查

一个可维护的 Web Component 应明确哪些是公开接口：

```text
元素名称：market-note
观察属性：tone、updated-at、acknowledged
DOM 属性：可选，本课主要演示内容属性
具名 slot：title
默认 slot：提示正文
自定义事件：market-note-action
CSS 接口：宿主继承属性；本课不暴露 part
方法：无
内部选择器：不是公开接口
```

公开接口比“能否从 open ShadowRoot 查到某节点”更重要。外部代码不应依赖 `.note > footer > button` 这类内部路径。

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

### 7.1 案例范围与公开契约

综合页面同时演示：

- listing 模板克隆；
- `market-note` 自主自定义元素；
- 合法名称和幂等注册；
- `get()` 与 `whenDefined()`；
- open Shadow DOM；
- 具名标题 slot、默认 slot 和 fallback；
- `assignedElements()` 的直接 Light DOM 分配结果；
- `slotchange`；
- `tone`、`updated-at`、`acknowledged` 属性同步；
- `connectedCallback()` / `disconnectedCallback()` 对称清理；
- `adoptedCallback()` 记录；
- 断开、重连和单次动作计数；
- 无脚本时仍可读的 Light DOM 基线。

组件公开接口：

```text
名称：market-note
属性：
  tone="info|warning"
  updated-at="UTC ISO 8601 字符串"
  acknowledged（布尔属性）
具名 slot：
  title
默认 slot：
  提示正文
事件：
  market-note-action，bubbles: true，composed: true
```

商品和组件都只在当前页面运行。提示确认不是服务端确认，收藏不是用户账号数据，重新连接组件也不会产生持久化。

### 7.2 文件位置

```text
market-learning/
└── practice/
    └── html-chapter-06/
        ├── template-listings.html
        └── market-note.html
```

### 7.3 完整页面

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市 Web Components 实验</title>
  <style>
    :root {
      color-scheme: light;
      font-family: system-ui, sans-serif;
      line-height: 1.6;
    }

    body {
      max-width: 56rem;
      margin: 2rem auto;
      padding: 0 1rem 3rem;
    }

    button,
    select {
      font: inherit;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: end;
      margin-block: 1rem;
    }

    .controls label {
      display: grid;
      gap: 0.25rem;
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

    market-note {
      display: block;
      margin-block: 1.5rem;
    }

    market-note:not(:defined) {
      padding: 1rem;
      border: 2px solid #8a5a00;
      border-radius: 0.75rem;
      background: #fff8e8;
    }

    market-note:not(:defined) [slot="title"] {
      margin-block-start: 0;
    }

    #component-log {
      padding: 0.75rem;
      background: #f3f5f7;
      border-radius: 0.5rem;
    }
  </style>
</head>
<body>
  <main>
    <h1>邻里集市商品与交接提示</h1>
    <p>
      商品来自固定数组；价格存整数分，时间存 UTC；
      收藏、提示确认和组件计数都只在当前页面内存中。
    </p>

    <section aria-labelledby="note-demo-title">
      <h2 id="note-demo-title">组件生命周期实验</h2>

      <market-note
        id="handover-note"
        tone="warning"
        updated-at="2026-10-10T10:00:00.000Z">
        <h3 slot="title">线下交接提醒</h3>
        <p>请在公共地点验货，不要在页面中发送敏感身份信息。</p>
      </market-note>

      <div class="controls">
        <label>
          提示语气
          <select id="tone-control">
            <option value="warning">警示</option>
            <option value="info">信息</option>
          </select>
        </label>
        <button id="toggle-connection" type="button">断开组件</button>
        <button id="toggle-title" type="button">移除分配标题</button>
        <button id="change-title-text" type="button">只改标题文字</button>
        <button id="reset-note" type="button">重置已读状态</button>
      </div>

      <p id="component-log" role="status">
        等待组件定义。
      </p>
    </section>

    <section aria-labelledby="listing-heading">
      <h2 id="listing-heading">固定教学商品</h2>
      <ul id="listing-list"></ul>
      <p id="favorite-status" role="status">还没有收藏操作。</p>
    </section>
  </main>

  <template id="market-note-template">
    <style>
      :host {
        display: block;
        color: #1d2733;
      }

      .note {
        padding: 1rem;
        border: 2px solid #315b7d;
        border-radius: 0.75rem;
        background: #eef7ff;
      }

      .note[data-tone="warning"] {
        border-color: #8a5a00;
        background: #fff8e8;
      }

      .title {
        margin-block: 0 0.5rem;
      }

      slot[name="title"]::slotted(*) {
        margin-block: 0;
      }

      .meta,
      .slot-report {
        color: #4c5967;
        font-size: 0.875rem;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        margin-block-start: 1rem;
      }

      button {
        font: inherit;
      }
    </style>

    <aside class="note">
      <div class="title">
        <slot name="title">
          <h3>集市提示</h3>
        </slot>
      </div>

      <div class="body">
        <slot>
          <p>暂无补充说明。</p>
        </slot>
      </div>

      <p class="meta">
        更新时间：
        <span class="updated-at">未提供</span>
      </p>
      <p class="slot-report">标题使用 fallback。</p>

      <div class="actions">
        <button class="acknowledge" type="button">我知道了</button>
        <output class="state">尚未确认</output>
      </div>
    </aside>
  </template>

  <template id="listing-template">
    <li>
      <article class="listing-card">
        <h3 class="listing-title"></h3>
        <p class="listing-description"></p>
        <p>
          <data class="listing-price"></data>
          ·
          <span class="listing-created"></span>
        </p>
        <button class="favorite" type="button" aria-pressed="false">
          收藏
        </button>
      </article>
    </li>
  </template>

  <script>
    const marketNoteTemplate =
      document.querySelector("#market-note-template");

    if (!(marketNoteTemplate instanceof HTMLTemplateElement)) {
      throw new Error("缺少 market-note 的内部模板");
    }

    const marketNoteTemplateContent =
      marketNoteTemplate.content.cloneNode(true);

    class MarketNote extends HTMLElement {
      static get observedAttributes() {
        return ["tone", "updated-at", "acknowledged"];
      }

      constructor() {
        super();

        const shadow = this.attachShadow({ mode: "open" });

        shadow.append(marketNoteTemplateContent.cloneNode(true));
        this.connectionController = null;
      }

      connectedCallback() {
        if (this.connectionController) {
          return;
        }

        const controller = new AbortController();
        const { signal } = controller;
        const button =
          this.shadowRoot.querySelector(".acknowledge");
        const titleSlot =
          this.shadowRoot.querySelector('slot[name="title"]');

        this.connectionController = controller;

        button.addEventListener("click", () => {
          this.toggleAttribute("acknowledged", true);
          this.dispatchEvent(new CustomEvent("market-note-action", {
            bubbles: true,
            composed: true,
            detail: { action: "acknowledge" }
          }));
        }, { signal });

        titleSlot.addEventListener("slotchange", () => {
          this.syncTitleSlotReport();
          this.dispatchEvent(new CustomEvent("market-note-action", {
            bubbles: true,
            composed: true,
            detail: { action: "slotchange" }
          }));
        }, { signal });

        this.render();
        this.syncTitleSlotReport();
      }

      disconnectedCallback() {
        this.connectionController?.abort();
        this.connectionController = null;
      }

      adoptedCallback(oldDocument, newDocument) {
        console.info("market-note 被采用到新文档", {
          from: oldDocument.URL,
          to: newDocument.URL
        });
      }

      attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) {
          return;
        }

        this.render();
      }

      render() {
        const note = this.shadowRoot.querySelector(".note");
        const timeContainer =
          this.shadowRoot.querySelector(".updated-at");
        const button =
          this.shadowRoot.querySelector(".acknowledge");
        const state = this.shadowRoot.querySelector(".state");
        const allowedTones = new Set(["info", "warning"]);
        const requestedTone = this.getAttribute("tone");
        const tone = allowedTones.has(requestedTone)
          ? requestedTone
          : "info";
        const updatedAt = this.getAttribute("updated-at");
        const utcPattern =
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
        const parsedTime = updatedAt === null
          ? Number.NaN
          : Date.parse(updatedAt);
        const hasCanonicalUtc =
          updatedAt !== null &&
          utcPattern.test(updatedAt) &&
          !Number.isNaN(parsedTime) &&
          new Date(parsedTime).toISOString() === updatedAt;
        const acknowledged =
          this.hasAttribute("acknowledged");

        note.dataset.tone = tone;

        if (!hasCanonicalUtc) {
          timeContainer.textContent = updatedAt === null
            ? "未提供"
            : "时间必须是规范 UTC ISO 8601";
        } else {
          const time = document.createElement("time");

          time.dateTime = updatedAt;
          time.textContent =
            new Date(parsedTime).toLocaleString("zh-CN");
          timeContainer.replaceChildren(time);
        }

        button.disabled = acknowledged;
        button.textContent = acknowledged
          ? "已知道"
          : "我知道了";
        state.textContent = acknowledged
          ? "当前页面已确认"
          : "尚未确认";
      }

      syncTitleSlotReport() {
        const titleSlot =
          this.shadowRoot.querySelector('slot[name="title"]');
        const report =
          this.shadowRoot.querySelector(".slot-report");
        const assigned = titleSlot.assignedElements();

        this.dataset.assignedTitleCount =
          String(assigned.length);
        report.textContent = assigned.length === 0
          ? "标题使用 fallback。"
          : `标题由 ${assigned.length} 个 Light DOM 元素提供。`;
      }
    }

    if (!customElements.get("market-note")) {
      customElements.define("market-note", MarketNote);
    }

    const note = document.querySelector("#handover-note");
    const componentLog =
      document.querySelector("#component-log");
    let componentActionCount = 0;

    customElements.whenDefined("market-note").then(
      (constructor) => {
        componentLog.textContent =
          `组件已定义：${constructor.name}；动作计数 0。`;
      }
    );

    document.addEventListener("market-note-action", (event) => {
      componentActionCount += 1;
      componentLog.textContent =
        `组件动作：${event.detail.action}；` +
        `累计 ${componentActionCount} 次。`;
    });

    const connectionMarker = document.createComment(
      "market-note reconnect marker"
    );
    note.before(connectionMarker);

    const connectionButton =
      document.querySelector("#toggle-connection");

    connectionButton.addEventListener("click", () => {
      if (note.isConnected) {
        note.remove();
        connectionButton.textContent = "重新连接组件";
        componentLog.textContent =
          "组件已断开；本次连接的监听器已 abort。";
      } else {
        connectionMarker.after(note);
        connectionButton.textContent = "断开组件";
        componentLog.textContent =
          "组件已重新连接；已建立一组新监听器。";
      }
    });

    document
      .querySelector("#tone-control")
      .addEventListener("change", (event) => {
        note.setAttribute("tone", event.currentTarget.value);
      });

    document
      .querySelector("#reset-note")
      .addEventListener("click", () => {
        note.removeAttribute("acknowledged");
        componentLog.textContent = "已移除 acknowledged 属性。";
      });

    document
      .querySelector("#toggle-title")
      .addEventListener("click", (event) => {
        const currentTitle =
          note.querySelector('[slot="title"]');

        if (currentTitle) {
          currentTitle.remove();
          event.currentTarget.textContent = "恢复分配标题";
        } else {
          const title = document.createElement("h3");
          title.slot = "title";
          title.textContent = "线下交接提醒";
          note.prepend(title);
          event.currentTarget.textContent = "移除分配标题";
        }
      });

    document
      .querySelector("#change-title-text")
      .addEventListener("click", () => {
        const currentTitle =
          note.querySelector('[slot="title"]');

        if (!currentTitle) {
          componentLog.textContent =
            "当前使用 fallback，没有可修改的分配标题。";
          return;
        }

        currentTitle.textContent =
          currentTitle.textContent === "线下交接提醒"
            ? "更新后的交接提醒"
            : "线下交接提醒";
        componentLog.textContent =
          "只修改了同一分配元素的内部文字；" +
          "通常不会产生 slotchange。";
      });

    const listings = [
      {
        id: "listing-lamp",
        title: "可调光阅读台灯",
        description: "功能正常，限同城当面交接。",
        priceCents: 8600,
        createdAt: "2026-10-10T08:30:00.000Z"
      },
      {
        id: "listing-desk",
        title: "折叠学习桌",
        description: "桌面有轻微使用痕迹。",
        priceCents: 12800,
        createdAt: "2026-10-10T09:15:00.000Z"
      }
    ];

    const favorites = new Set();
    const listingTemplate =
      document.querySelector("#listing-template");
    const listingList =
      document.querySelector("#listing-list");
    const favoriteStatus =
      document.querySelector("#favorite-status");
    const currency = new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY"
    });

    function renderListing(listing) {
      const fragment =
        listingTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".listing-card");
      const title = fragment.querySelector(".listing-title");
      const description =
        fragment.querySelector(".listing-description");
      const price = fragment.querySelector(".listing-price");
      const createdPlaceholder =
        fragment.querySelector(".listing-created");
      const created = document.createElement("time");
      const favorite = fragment.querySelector(".favorite");

      card.dataset.listingId = listing.id;
      title.textContent = listing.title;
      description.textContent = listing.description;
      price.value = String(listing.priceCents);
      price.textContent =
        currency.format(listing.priceCents / 100);
      created.dateTime = listing.createdAt;
      created.textContent =
        new Date(listing.createdAt).toLocaleString("zh-CN");
      createdPlaceholder.replaceWith(created);
      favorite.dataset.listingId = listing.id;

      favorite.addEventListener("click", () => {
        const active = !favorites.has(listing.id);

        if (active) {
          favorites.add(listing.id);
        } else {
          favorites.delete(listing.id);
        }

        favorite.setAttribute("aria-pressed", String(active));
        favorite.textContent = active ? "取消收藏" : "收藏";
        favoriteStatus.textContent = active
          ? `已在当前页面收藏“${listing.title}”。`
          : `已在当前页面取消收藏“${listing.title}”。`;
      });

      listingList.append(fragment);
    }

    listings.forEach(renderListing);

    console.assert(
      customElements.get("market-note") === MarketNote
    );
  </script>
</body>
</html>
```

### 7.4 打开与运行

1. 保存 `market-note.html`；
2. 直接在现代浏览器打开；
3. 打开 DevTools 的 Elements 与 Console；
4. 展开 `market-note#handover-note` 的 Shadow Root；
5. 依次测试语气、断开/连接、移除/恢复标题、只改标题文字和重置；
6. 连续执行三轮“断开组件 → 重新连接组件”；
7. 点击一次“我知道了”，观察动作累计值；
8. 在 Console 运行：

```js
customElements.get("market-note")
await customElements.whenDefined("market-note")
document.querySelector("#handover-note").shadowRoot
document.querySelector("#handover-note").dataset.assignedTitleCount
document.querySelector('#handover-note [slot="title"]').parentElement
document.querySelector('#handover-note [slot="title"]').getRootNode()
```

若 Console 不支持顶层 `await`，改用：

```js
customElements.whenDefined("market-note").then(console.log)
```

停止方式：关闭页面。所有数据只在当前标签页内存中。

### 7.5 预期页面与 DOM 结果

初始状态：

- `market-note` 已升级为 `MarketNote`；
- open ShadowRoot 可在 Elements 展开，也可由 `.shadowRoot` 取得；
- 警示语气使用 warning 样式；
- `updated-at` 的 UTC 原值保留在 `time[datetime]`，文字按本地时区展示；
- Light DOM 的 `h3[slot="title"]` 显示在具名 slot 位置；
- `data-assigned-title-count="1"`；
- Light DOM 的正文显示在默认 slot；
- “尚未确认”与“我知道了”一致。

操作结果：

- 修改 select 会改变 `tone` 属性并触发可见样式同步；
- 点击“我知道了”会增加 `acknowledged` 布尔属性、禁用内部按钮并更新状态；
- 移除 `acknowledged` 后按钮恢复；
- 移除具名标题后显示 fallback“集市提示”，分配数量变成 `0`；
- 恢复标题后触发 `slotchange`，分配数量变回 `1`；
- 只改现有标题内部文字时，通常不增加 `slotchange` 动作计数；
- 三轮断开重连后，点击一次“我知道了”只增加一次 acknowledge 动作；
- 收藏刷新后丢失，组件确认刷新后也丢失。

### 7.6 重连安全为什么成立

每次连接：

```js
const controller = new AbortController();
this.connectionController = controller;
```

本次连接建立的内部按钮和 slot 监听器共享 `signal`。每次断开：

```js
this.connectionController?.abort();
this.connectionController = null;
```

旧监听器全部移除，字段恢复可连接状态。下一次连接创建全新 controller。内部 Shadow DOM 只在构造器创建一次，所以重连不会重复插入样式、slot 或按钮。

可以用动作计数验证，而不是只看代码：

```text
重连 3 次
  → 重置已读
  → 点击内部按钮 1 次
  → acknowledge 动作只增加 1
```

若增加 4，说明旧连接监听器未清理。

### 7.7 属性同步为什么不依赖连接顺序

`attributeChangedCallback()` 只调用 `render()`。`render()`：

- 查询构造器已经建立的 Shadow DOM；
- 解析当前最终属性；
- 把非法 `tone` 降级为 `info`；
- 把有效 UTC 字符串写入 `time.dateTime` 并本地化显示；
- 把 `acknowledged` 的存在性同步到按钮和输出。

它不查询外部父元素，也不假设当前 `isConnected` 为 true。因此已有元素升级时即使属性回调先于连接回调，也能安全更新内部视图。

### 7.8 slot 所有权证据

下面两个表达式分别返回宿主和页面文档：

```js
const title =
  document.querySelector('#handover-note [slot="title"]');

console.log(title.parentElement.localName); // market-note
console.log(title.getRootNode() === document); // true
```

标题虽然视觉上出现在 Shadow DOM 的 slot 位置，仍是页面 Light DOM。页面 CSS 可以直接样式化它，页面脚本也可以修改它。组件内部的 `::slotted(*)` 只能为直接分配元素提供有限样式，不会取得该元素后代的任意控制权。

### 7.9 渐进增强验证

在 DevTools 临时禁用 JavaScript并刷新，或把本地副本中的 `<script>` 暂时改成不执行的类型：

```html
<script type="text/plain">
```

预期：

- 商品列表不会由脚本生成；
- `market-note` 不会定义，也没有 Shadow DOM 按钮；
- Light DOM 的“线下交接提醒”和正文仍然显示；
- `market-note:not(:defined)` 提供简单可见边框；
- 核心交接提示没有因组件升级失败而消失。

恢复 `<script>` 后刷新，组件重新升级。不要把禁用脚本的临时修改提交为最终练习文件。

### 7.10 数据、无障碍与安全边界

- `priceCents` 始终是整数分，格式化时才除以 100；
- `createdAt` 和 `updated-at` 使用 UTC ISO 8601，界面按用户本地时区显示；
- 商品标题、描述和 slot 内容都是静态教学文字；
- 收藏与确认只在当前页面内存中；
- 自定义元素没有登录用户信息，不执行授权；
- “已确认”只表示当前页面属性存在，不是服务端审计记录；
- Shadow DOM 不隐藏敏感数据，也不验证传入 Light DOM；
- closed 模式不会改变以上结论；
- 内部按钮使用原生 `button`，不手工模拟键盘激活；
- `market-note-action` 使用 `composed: true` 是公开事件选择，不意味着所有内部事件都应跨边界；
- 页面没有网络、数据库、真实预约和并发保证。

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

### 8.5 在构造器读取 Light DOM

**错误代码：**

```js
constructor() {
  super();
  this.titleText =
    this.querySelector('[slot="title"]').textContent;
}
```

**现象：**

脚本创建时似乎可用，HTML 解析或升级时却得到 `null`。

**根因：**

构造时后续子节点不保证已经解析完成。

**修复：**

在 `connectedCallback()` 或 slot 的分配逻辑中读取；同时处理没有分配标题的 fallback。

### 8.6 自定义元素名称无连字符

**错误代码：**

```js
customElements.define("marketnote", MarketNote);
```

**现象：**

注册抛出 `SyntaxError`。

**修复：**

使用稳定的合法名称，例如 `market-note`。名称是公开 API，发布后改名会影响所有标记和选择器。

### 8.7 重复注册同一名称

**错误复现实验：**

在综合案例 Console 执行：

```js
customElements.define(
  "market-note",
  customElements.get("market-note")
);
```

**预期失败：**

Console 报 `NotSupportedError`，因为名称已经注册，构造器也已经使用。

**正确诊断：**

```js
customElements.get("market-note")
```

如果返回构造器，检查脚本是否被重复包含、开发热更新是否重复执行，或两个依赖是否争用名称。

**幂等注册：**

```js
if (!customElements.get("market-note")) {
  customElements.define("market-note", MarketNote);
}
```

保护语句适合同一实现重复装载。若返回的是另一个实现，应报告冲突，不应假装兼容。

### 8.8 每次连接都累加监听器

**错误代码：**

```js
connectedCallback() {
  this.shadowRoot
    .querySelector("button")
    .addEventListener("click", this.handleClick);
}
```

没有 `disconnectedCallback()` 时，反复移除和插回可能积累处理器。

**观察：**

重连三次，点击一次，动作计数增加四。

**修复：**

- 每次连接创建 `AbortController`；
- 所有本次连接监听器使用同一 `signal`；
- 断开时 `abort()`；
- controller 设回 `null`；
- 用动作计数复验一次点击只响应一次。

### 8.9 把“只初始化一次”写成永不恢复

**错误代码：**

```js
connectedCallback() {
  if (this.initialized) {
    return;
  }

  this.initialized = true;
  window.addEventListener("resize", this.handleResize);
}

disconnectedCallback() {
  window.removeEventListener("resize", this.handleResize);
}
```

断开清理后，重连因 `initialized` 为 true 不再绑定。

**修复：**

把永久内部树初始化与每次连接订阅分开：

```text
constructor：只做一次的内部结构
connected：每次连接建立订阅
disconnected：每次断开解除订阅并恢复字段
```

### 8.10 属性回调自我写回

**错误代码：**

```js
attributeChangedCallback(name, oldValue, newValue) {
  this.setAttribute(name, newValue);
}
```

**风险：**

简单浏览器实现可能因相同字符串不再变化而暂时停止，但一旦加入大小写规范化、默认值或多个属性联动，就可能递归、抖动或产生难以追踪的二次回调。

**修复：**

回调读取当前属性并更新内部视图；公开 DOM setter 在必要时反射属性，并在写入前比较。

### 8.11 把 `acknowledged="false"` 当 false

**错误标记：**

```html
<market-note acknowledged="false"></market-note>
```

布尔属性存在就表示 true。

**修复：**

```js
note.removeAttribute("acknowledged"); // false
note.toggleAttribute("acknowledged", true); // true
```

### 8.12 把 closed ShadowRoot 当安全容器

**错误结论：**

> 使用 `{ mode: "closed" }` 后，可以把访问令牌和用户身份证号写进组件。

**问题：**

- 数据已经发送到浏览器；
- closed 只改变 `host.shadowRoot` 的普通访问结果；
- 页面脚本、浏览器工具、扩展或创建方仍可能观察；
- 前端无法替代服务端最小授权与数据最小化。

**修复：**

不要把不需要展示的数据发送到浏览器。服务端执行身份、权限和字段过滤；Shadow DOM 只用于组件封装。

### 8.13 slot 名称不匹配

**错误标记：**

```html
<market-note>
  <h3 slot="heading">交接提醒</h3>
</market-note>
```

组件只声明 `slot name="title"`。`heading` 不会自动分配到 title。

**诊断：**

```js
note.shadowRoot
  .querySelector('slot[name="title"]')
  .assignedElements()
```

若为空，检查 Light DOM 的 `slot` 属性拼写。修复为 `slot="title"`，或正式扩展组件公开 slot 契约。

### 8.14 空分配元素遮住 fallback

**错误标记：**

```html
<market-note>
  <span slot="title"></span>
</market-note>
```

**现象：**

看不到 fallback“集市提示”，标题区域却是空的。

**根因：**

slot 已经获得一个元素；分配算法不根据文字是否为空决定是否使用 fallback。

**修复：**

删除空节点，或填入有意义标题。组件可诊断空文字，但不应秘密改变页面对 Light DOM 的所有权。

### 8.15 期待 `slotchange` 观察全部文字变化

**错误假设：**

```js
title.textContent = "新标题";
// 期待 slotchange 必然触发
```

分配对象仍是同一个 `title`，通常没有 slot 分配变化。

**修复：**

- 若只需渲染，浏览器已经会显示新文字，不需要事件；
- 若组件必须计算文字派生状态，明确增加受限 `MutationObserver`；
- 若只关心节点替换，继续使用 `slotchange`。

### 8.16 克隆固定 ID

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

### 8.17 只在 Shadow DOM 放核心正文

**错误设计：**

组件定义前宿主为空，构造器执行后才生成唯一的安全提示。脚本加载失败时，用户完全看不到提示。

**修复：**

把核心业务正文作为 Light DOM 提供，Shadow DOM 负责布局、样式和增强操作。用 `:not(:defined)` 为未升级状态提供简单可见样式。

### 8.18 排查顺序

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

### 9.1 理解题

1. 为什么 `template.querySelector(".title")` 可能返回 `null`，而 `template.content.querySelector(".title")` 能返回元素？
2. 把 `DocumentFragment` append 到页面后，片段为什么变空？
3. `cloneNode(true)` 中的 `true` 表示什么？
4. 为什么 `addEventListener()` 注册的监听器不随节点克隆？
5. 模板为什么不应包含会被重复克隆的固定 ID？
6. 自主自定义元素名称为什么需要连字符？
7. `customElements.get()` 与 `whenDefined()` 的使用时机有什么区别？
8. 为什么不应在构造器读取 Light DOM 标题？
9. `connectedCallback()` 为什么必须按“可执行多次”设计？
10. 断开时为什么不能只把 `initialized` 保持为 true？
11. 哪些属性变化会触发 `attributeChangedCallback()`？
12. `acknowledged="false"` 为什么仍表示已确认？
13. open 与 closed Shadow DOM 的可观察差异是什么？
14. 为什么 closed Shadow DOM 不能保存秘密？
15. slot 投影后，Light DOM 节点的父节点是否改变？
16. fallback 标题何时显示？
17. `assignedElements()` 与 `assignedNodes()` 的区别是什么？
18. 替换一个具名标题元素和只修改它的 `textContent`，哪一个会触发 `slotchange`？
19. 为什么核心业务提示适合放在 Light DOM，而不是只由构造器生成？
20. 商品收藏为什么刷新后消失？

### 9.2 代码推理题

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

### 9.3 生命周期预测题

假设一个 `market-note` 已连接，依次执行：

```js
note.remove();
containerA.append(note);
containerB.append(note);
note.setAttribute("tone", "info");
```

写出可能发生的连接、断开和属性回调顺序，并说明不应依赖哪些“只调用一次”假设。

### 9.4 slot 推理题

Shadow DOM：

```html
<slot name="title"><h2>默认标题</h2></slot>
<slot><p>默认正文</p></slot>
```

Light DOM：

```html
<market-note>
  <span slot="title"></span>
  文本正文
</market-note>
```

回答：

1. title fallback 是否显示？
2. 默认正文 fallback 是否显示？
3. `titleSlot.assignedElements().length` 是多少？
4. 默认 slot 的 `assignedNodes()` 是否可能包含文本节点？

### 9.5 参考答案

1. 模板后代存放在独立的 `content` 片段中，不是 `template` 的普通子树。
2. append 移动片段的子节点，片段自身不进入页面，所以子节点被移空。
3. 深克隆当前节点及全部后代。
4. 监听器是节点对象的运行时注册关系，不是要复制的 DOM 结构或属性。
5. 多次克隆会制造重复 ID，并破坏标签、ARIA 或片段引用。
6. 合法自定义元素名称需要连字符，以避免与内建 HTML 名称空间冲突。
7. `get()` 同步检查当前是否已注册；`whenDefined()` 异步等待将来完成定义。
8. 构造或升级时 Light DOM 子节点不保证已解析完整。
9. 节点可以断开、移动并重新连接，同一实例会多次进入连接状态。
10. 断开清理后重连需要重新建立订阅；永久 true 会阻止恢复。
11. 只有 `observedAttributes` 列出的属性；新增、改变和删除都可能触发。
12. HTML 布尔属性看存在性，不解析字符串 `"false"`。
13. open 可由 `host.shadowRoot` 取得根；closed 返回 `null`。
14. closed 不是数据隔离、权限、加密或服务端字段过滤。
15. 不改变；节点仍是宿主的 Light DOM 子节点。
16. 没有节点分配到该 slot 时。
17. 前者只返回元素，后者还可返回文本等节点。
18. 替换直接分配元素会；只改同一元素内部文字通常不会。
19. 脚本失败或组件未定义时，Light DOM 仍可读。
20. 收藏只存在当前页内存 `Set`，没有持久化或服务端。

代码推理题答案：

1. 只插入一次；第一次 append 后片段已空。
2. 会，监听器绑定在被移动进页面的那个按钮对象上。
3. `0`。
4. 第二次重新执行 `template.content.cloneNode(true)`，并为新实例取得引用和绑定行为。

生命周期题的一种可观察顺序：

```text
初始：connectedCallback
remove：disconnectedCallback
append 到 A：connectedCallback
从 A 移到 B：可能 disconnectedCallback → connectedCallback
设置 tone：attributeChangedCallback
```

具体移动 API 与浏览器规范演进可能提供更细的保状态机制，但组件不能把普通 `connectedCallback()` 当一次性构造器。属性回调也不能假设组件当前必然连接。

slot 题答案：

1. 不显示，空 `span` 仍是一个已分配元素。
2. 不显示，文本正文会分配到默认 slot。
3. `1`。
4. 会，文本正文是文本节点。

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

### 10.2 提升：实现最小 `market-badge`

**目标**

创建自主自定义元素：

```html
<market-badge status="available"></market-badge>
```

**要求**

- 合法名称并继承 `HTMLElement`；
- 观察 `status`；
- 允许 `available`、`reserved`、`sold`；
- 非法值显示“未知状态”，不能假装可预约；
- 构造器只建立 Shadow DOM；
- 属性回调更新文字；
- 用 `customElements.get()` 防重复注册；
- 用 `whenDefined()` 在 Console 记录构造器名；
- 写清 Shadow DOM 不执行服务端状态校验。

**运行**

直接打开页面，在 Console 执行：

```js
document.querySelector("market-badge")
  .setAttribute("status", "reserved")
```

**预期**

文字同步变为“已预约”；设为 `other` 后显示“未知状态”。

**失败优先检查**

`observedAttributes` 拼写、回调参数、布尔/字符串混淆和重复注册。

### 10.3 提升：具名标题与 fallback

**目标**

为 `market-badge` 或新的 `market-panel` 增加：

- `slot name="title"`；
- fallback“商品状态”；
- 默认 slot；
- `assignedElements()` 数量输出；
- `slotchange` 日志。

**故障注入**

依次测试：

```html
<!-- 无标题：应显示 fallback -->
<market-panel><p>正文</p></market-panel>

<!-- 空标题：fallback 不显示 -->
<market-panel>
  <span slot="title"></span>
  <p>正文</p>
</market-panel>

<!-- 名称错误：不会进入 title slot -->
<market-panel>
  <h2 slot="heading">标题</h2>
  <p>正文</p>
</market-panel>
```

**预期**

能用 `assignedElements()` 解释三种结果，而不是只靠 CSS 猜测。

### 10.4 故障演练：重连监听器泄漏

**目标**

先故意创建会重复响应的组件，再最小修复。

**错误阶段**

- 在 `connectedCallback()` 每次 addEventListener；
- 不写 `disconnectedCallback()`；
- 断开重连三次；
- 点击一次；
- 记录动作执行次数。

**修复阶段**

- 每次连接创建 controller；
- 使用 `{ signal }`；
- 断开时 abort 并置空；
- 再次重复相同操作。

**预期**

错误阶段一次点击多次执行；修复后一次点击只执行一次。

**证据**

提交连接次数、动作次数、Event Listeners 面板观察和修复代码。

### 10.5 故障演练：重复注册

**目标**

在 Console 主动重复执行 `define()`，记录错误名称，再使用 `get()` 解释注册表状态。

**要求**

- 不通过刷新后忽略错误完成练习；
- 找到哪个脚本或执行路径进行了第二次注册；
- 加入幂等保护；
- 若是两个不同类争同名，记录为名称冲突并停止静默覆盖。

**预期**

相同实现重复加载时不再抛错；不同实现争名时有明确诊断。

### 10.6 综合：扩展 `market-note`

在综合案例副本中增加 `compact` 布尔属性：

```html
<market-note compact></market-note>
```

**完成标准**

- `compact` 加入 `observedAttributes`；
- 属性存在时缩小内部间距，不存在时恢复；
- JavaScript DOM 属性 setter 接收布尔值并反射属性；
- 不使用 `compact="false"`；
- 属性回调不自我递归；
- 未定义组件时核心 Light DOM 仍可读；
- 重连三次后事件仍只响应一次；
- 原有 `tone`、时间、slot 与收藏行为不回归。

**运行**

直接打开页面，先用属性按钮切换，再在 Console 使用 DOM 属性切换。

**预期**

两条入口得到一致状态，刷新后恢复静态初始值。

**失败优先检查**

属性存在性、setter 反射、回调递归、Shadow DOM 样式选择器和重连监听器。

### 10.7 提交记录模板

```text
练习文件：
浏览器与版本：
打开方式：
模板 content 类型：
浅克隆结果：
深克隆结果：
fragment 插入前后长度：
克隆监听器证据：
自定义元素名称：
get() 结果：
whenDefined() 结果：
连接次数：
断开次数：
单次点击动作数：
观察属性同步结果：
slot 分配元素数：
fallback 结果：
slotchange 触发与未触发操作：
open/closed 边界说明：
重复注册错误：
渐进增强结果：
整数分与 UTC 证据：
未验证浏览器或辅助技术：
```

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

### 11.2 自定义元素与生命周期

- [ ] 自主自定义元素名称合法且包含连字符；
- [ ] 构造器先调用 `super()`；
- [ ] 构造器不依赖 Light DOM、父节点或连接状态；
- [ ] `define()` 只对同一名称执行一次；
- [ ] `get()` 返回预期构造器；
- [ ] `whenDefined()` 能正常完成；
- [ ] 能解释已有未知元素的升级；
- [ ] `connectedCallback()` 可安全执行多次；
- [ ] `disconnectedCallback()` 对称清理资源；
- [ ] 重连三次后一次点击只产生一次动作；
- [ ] 能解释 `adoptedCallback()` 的跨文档用途；
- [ ] 不把回调次数当业务持久化状态。

### 11.3 属性同步

- [ ] 观察属性完整列在 `observedAttributes`；
- [ ] 新增、修改、删除属性均有合理结果；
- [ ] 非法 `tone` 有明确 fallback；
- [ ] UTC 时间原值和本地展示分开；
- [ ] 布尔属性按存在性解释；
- [ ] DOM setter 如有实现，会规范反射属性；
- [ ] `attributeChangedCallback()` 不无条件写回来源属性；
- [ ] 属性回调在未连接状态也不会报错。

### 11.4 Shadow DOM 与 slot

- [ ] 能从 Elements 区分 Light DOM、ShadowRoot 和投影位置；
- [ ] open 模式下 `.shadowRoot` 返回根；
- [ ] 能解释 closed 模式下 `.shadowRoot` 返回 `null`；
- [ ] 未宣称 closed 模式提供秘密保护；
- [ ] 具名标题 slot 正确匹配；
- [ ] 默认 slot 接收正文；
- [ ] 无分配标题时显示 fallback；
- [ ] 空分配元素遮住 fallback 的错误已复现并解释；
- [ ] `assignedElements()` 返回值已记录；
- [ ] 能区分 `assignedElements()` 与 `assignedNodes()`；
- [ ] 直接分配变化能观察到 `slotchange`；
- [ ] 只改分配元素内部文字的边界已验证；
- [ ] 能证明投影节点的父节点和根仍属于 Light DOM。

### 11.5 项目与边界

- [ ] 商品数据是静态教学数组；
- [ ] 收藏与确认明确标为当前页内存状态；
- [ ] 金额业务值使用整数分；
- [ ] 时间业务值使用 UTC ISO 8601；
- [ ] 没有声称实现登录、授权、服务端预约或并发；
- [ ] 核心提示在脚本失败时仍可阅读；
- [ ] 自定义事件是否跨 Shadow 边界是显式决定；
- [ ] 内部选择器未被当作公开稳定 API；
- [ ] 未把 Shadow DOM 当作清洗不可信 HTML 的工具。

### 11.6 文件、运行、预期与失败证据

- [ ] 记录了实际练习文件路径；
- [ ] 记录了直接打开或静态服务器运行方式；
- [ ] 记录了浏览器与版本；
- [ ] 记录了页面和 Console 预期；
- [ ] 记录了失败时最先查看的证据；
- [ ] 记录了重复注册的错误名称；
- [ ] 记录了重连前后动作次数；
- [ ] 记录了 slot 分配和 fallback 结果；
- [ ] 记录了未验证浏览器、读屏软件或跨文档采用范围；
- [ ] 刷新后内存状态丢失符合本课契约。

只有所有相关项都有观察证据，才能把本课标记为完成。仅通过“页面能打开”不能证明生命周期、slot 或安全边界正确。

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

### Q6：自定义元素必须在 HTML 出现前定义吗？

不必须。可以先解析未知元素，稍后 `define()` 时升级。渐进增强内容应在升级前仍可读，并避免构造器依赖偶然解析顺序。

### Q7：为什么不能重复 `define()` 覆盖旧版本？

注册表定义不可覆盖，这让元素名称保持稳定。需要新行为时应协调版本和装载入口，而不是在运行时争夺同一名称。

### Q8：`whenDefined()` 是否表示页面里至少有一个实例？

不表示。它只说明名称已注册。页面可能没有任何实例；实例也可能尚未连接。

### Q9：可以在构造器中 `attachShadow()` 吗？

可以，这是常见的稳定内部结构初始化。不要在构造器依赖 Light DOM、父节点、最终属性或网络现场。每个宿主只能附加一个 ShadowRoot。

### Q10：为什么属性回调可能早于连接回调？

已有标记升级时，浏览器需要把已存在的观察属性交给组件，然后元素才按连接状态执行连接回调。实现应让属性渲染不依赖已经连接。

### Q11：移动自定义元素一定会重建全部内部 DOM 吗？

不应。普通移动可能产生断开与连接回调，但构造器建立的 Shadow DOM 属于同一元素实例，通常保留。每次连接只重建需要连接期间存在的订阅。

### Q12：`disconnectedCallback()` 执行后对象会被垃圾回收吗？

不一定。只要脚本、缓存或其他对象仍引用它，就不会回收，也可能稍后重新连接。断开回调负责清理外部关系，不是析构器保证。

### Q13：什么时候需要 `adoptedCallback()`？

当组件可能在不同 `Document` 间移动，并持有文档相关资源时。普通单文档页面通常很少触发，但可复用组件应理解这个生命周期。

### Q14：为什么本课用 open Shadow DOM？

教学需要直接检查内部节点、属性同步和监听器。open 也常用于允许明确调试或集成的组件。选择 closed 只改变根的公开获取方式，不提升数据安全。

### Q15：页面 CSS 完全不能影响 Shadow DOM 吗？

不能这样绝对描述。普通选择器不会直接穿透，但继承属性、CSS 自定义属性、宿主样式、显式 `part` 接口和用户代理样式仍可产生影响。封装是受控边界，不是另一个浏览器进程。

### Q16：Shadow DOM 会自动清洗 slot 内容吗？

不会。Light DOM 仍由页面提供并拥有。组件应使用清晰 slot 契约；不可信字符串仍应作为文字处理，服务端与页面仍负责输入边界。

### Q17：slot 会把节点复制一份吗？

不会。是同一个 Light DOM 节点在插入点渲染。修改它会更新显示，`parentNode` 仍是宿主。

### Q18：为什么 fallback 不在默认的 `assignedElements()` 中？

fallback 是 Shadow Tree 自己的子内容，不是从 Light DOM 直接分配来的元素。无分配节点时它参与显示，但默认 `flatten: false` 的 assigned 列表为空；`flatten: true` 会沿后备 slot 链展开，并可能返回 fallback 元素，因此不能用它统计直接 Light DOM 标题。

### Q19：如何观察默认 slot 被空白占用？

使用 `assignedNodes()` 并检查 `nodeType` 和 `textContent`。`assignedElements()` 会过滤文本节点，可能让你误以为完全没有分配内容。

### Q20：`slotchange` 可以替代 MutationObserver 吗？

不能。它关注 slot 的直接分配集合变化，不是任意后代内容观察器。只有真实需求要求派生深层内容时才增加范围受限的 MutationObserver。

### Q21：组件内部事件为什么有时到不了 document？

事件需要满足传播和 Shadow 边界规则。自定义事件若要成为公开通知，通常显式设置 `bubbles: true` 与 `composed: true`；不应无条件把所有内部事件暴露。

### Q22：Web Components 能替代 React 或 Vue 吗？

它提供浏览器级元素、生命周期、Shadow DOM 和 slot 能力，但不自动提供应用路由、服务端状态、复杂数据流或团队工程约定。是否组合使用取决于系统边界；本课只建立平台基础。

### Q23：为什么 `market-note` 不自己保存到 localStorage？

这会引入持久化键设计、版本迁移、跨标签页同步、隐私和过期策略，超出本课静态/内存契约。真实确认还可能需要账号和服务端审计，不能用 localStorage 假装完成。

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

我能用 `template.content` 和深克隆稳定生成商品结构，解释 DocumentFragment 插入后的移动语义，并在克隆后正确建立实例行为。我能注册、查询和等待自主自定义元素，按构造、连接、断开、采用与属性变化的职责设计重连安全组件。我还能用 open Shadow DOM、具名/默认 slot、fallback、`assignedElements()` 和 `slotchange` 组合页面内容，同时明确 Light DOM 所有权、监听边界和 closed Shadow DOM 不提供安全隔离。

## 单元导航

- [上一课：事件、表单与委托](03-events-forms-delegation.md)
- [返回第六章入口](../06-interactive-dom.md)
- [下一章：无障碍、SEO 与质量](../07-accessibility-seo.md)
- [返回 HTML 模块](../README.md)
