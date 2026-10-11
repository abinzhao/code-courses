# 自定义元素生命周期与属性同步

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 注册自主自定义元素，管理连接、断开、采用和属性变化生命周期。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `INT-006`、`INT-007` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

注册自主自定义元素，管理连接、断开、采用和属性变化生命周期。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 INT-006（自定义元素命名与 define）、INT-007（connected/disconnected/attributeChanged 生命周期）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 自主自定义元素：给新标签定义行为

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

### 4.2 自定义元素注册表：`define()`、`get()` 与 `whenDefined()`

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

### 4.3 构造器约束：只建立自身，不依赖页面现场

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

### 4.4 `connectedCallback()`：每次连接都可能执行

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

### 4.5 `disconnectedCallback()`：解除组件建立的外部关系

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

### 4.6 `adoptedCallback()`：跨文档采用

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

### 4.7 `observedAttributes` 与 `attributeChangedCallback()`

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

### 4.8 属性同步与反射递归

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

## 5. 元素、属性、API 或配置清单

### 5.1 自定义元素注册表

| API | 输入 | 结果 | 失败或边界 |
| --- | --- | --- | --- |
| `customElements.define()` | 合法名称、构造器 | 注册并升级已有元素 | 无效名称、重复名称或重复构造器 |
| `customElements.get()` | 名称 | 构造器或 `undefined` | 只表示是否注册，不表示实例已连接 |
| `customElements.whenDefined()` | 名称 | 兑现为构造器的 Promise | 无效名称时拒绝 |
| `document.createElement()` | 已定义或未定义名称 | 对应元素 | 未定义时可先成为未知元素，之后升级 |
| `:defined` | CSS 伪类 | 匹配已定义元素和内建元素 | 不表示组件数据已完成 |

### 5.2 生命周期

| 回调或配置 | 触发条件 | 适合职责 | 不应假设 |
| --- | --- | --- | --- |
| `constructor()` | 构造或升级 | 字段、ShadowRoot、稳定内部骨架 | 属性、Light DOM、父节点已完整 |
| `connectedCallback()` | 每次连接文档 | 绑定本次连接监听、渲染、订阅 | 只调用一次 |
| `disconnectedCallback()` | 每次断开文档 | 取消监听、观察器、计时器、请求 | 实例会立即销毁 |
| `adoptedCallback()` | owner document 改变 | 更新文档相关依赖 | 同文档移动也一定触发 |
| `observedAttributes` | 类级属性名列表 | 声明要观察的公开属性 | 所有属性都会自动观察 |
| `attributeChangedCallback()` | 观察属性新增、改变或删除 | 解析属性并同步视图 | 元素已经连接 |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/11-custom-elements-lifecycle-attributes/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 INT-006（自定义元素命名与 define） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 INT-007（connected/disconnected/attributeChanged 生命周期） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [Shadow DOM、slot 与渐进增强](12-shadow-dom-slots-progressive-enhancement.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 INT-006（自定义元素命名与 define） 对应的元素、属性或状态；
- 在项目中实现并标出与 INT-007（connected/disconnected/attributeChanged 生命周期） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`12-shadow-dom-slots-progressive-enhancement.md`](12-shadow-dom-slots-progressive-enhancement.md)。

## 8. 常见错误与排查路径

### 8.1 自定义元素名称无连字符

**错误代码：**

```js
customElements.define("marketnote", MarketNote);
```

**现象：**

注册抛出 `SyntaxError`。

**修复：**

使用稳定的合法名称，例如 `market-note`。名称是公开 API，发布后改名会影响所有标记和选择器。

### 8.2 重复注册同一名称

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

### 8.3 每次连接都累加监听器

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

### 8.4 把“只初始化一次”写成永不恢复

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

### 8.5 属性回调自我写回

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

## 9. 课后题

### 9.1 参考答案

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

### 10.1 提升：实现最小 `market-badge`

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

### 10.2 故障演练：重连监听器泄漏

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

### 10.3 综合：扩展 `market-note`

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

## 11. 阶段验收

### 11.1 自定义元素与生命周期

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

### 11.2 属性同步

- [ ] 观察属性完整列在 `observedAttributes`；
- [ ] 新增、修改、删除属性均有合理结果；
- [ ] 非法 `tone` 有明确 fallback；
- [ ] UTC 时间原值和本地展示分开；
- [ ] 布尔属性按存在性解释；
- [ ] DOM setter 如有实现，会规范反射属性；
- [ ] `attributeChangedCallback()` 不无条件写回来源属性；
- [ ] 属性回调在未连接状态也不会报错。

## 12. 常见问题

### Q6：自定义元素必须在 HTML 出现前定义吗？

不必须。可以先解析未知元素，稍后 `define()` 时升级。渐进增强内容应在升级前仍可读，并避免构造器依赖偶然解析顺序。

### Q7：为什么不能重复 `define()` 覆盖旧版本？

注册表定义不可覆盖，这让元素名称保持稳定。需要新行为时应协调版本和装载入口，而不是在运行时争夺同一名称。

### Q8：`whenDefined()` 是否表示页面里至少有一个实例？

不表示。它只说明名称已注册。页面可能没有任何实例；实例也可能尚未连接。

### Q11：移动自定义元素一定会重建全部内部 DOM 吗？

不应。普通移动可能产生断开与连接回调，但构造器建立的 Shadow DOM 属于同一元素实例，通常保留。每次连接只重建需要连接期间存在的订阅。

### Q12：`disconnectedCallback()` 执行后对象会被垃圾回收吗？

不一定。只要脚本、缓存或其他对象仍引用它，就不会回收，也可能稍后重新连接。断开回调负责清理外部关系，不是析构器保证。

### Q13：什么时候需要 `adoptedCallback()`？

当组件可能在不同 `Document` 间移动，并持有文档相关资源时。普通单文档页面通常很少触发，但可复用组件应理解这个生命周期。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：注册自主自定义元素，管理连接、断开、采用和属性变化生命周期。
- `INT-006`：自定义元素命名与 define
- `INT-007`：connected/disconnected/attributeChanged 生命周期
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：Template、DocumentFragment 与克隆](10-template-fragment-clone.md) · [下一课：Shadow DOM、slot 与渐进增强](12-shadow-dom-slots-progressive-enhancement.md) · [返回 HTML 模块](../README.md)
