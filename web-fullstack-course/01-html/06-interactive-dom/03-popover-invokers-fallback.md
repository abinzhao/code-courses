# Popover、调用者与回退

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 使用 Popover、声明式调用者和脚本 API，并按能力检测提供可见回退。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `INT-004` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

使用 Popover、声明式调用者和脚本 API，并按能力检测提供可见回退。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 INT-004（popover 模式与 invoker 属性）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 Popover 是非模态顶层内容

最小声明式 popover：

```html
<button type="button" popovertarget="price-help">
  价格说明
</button>

<aside id="price-help" popover>
  标价 3900 分表示 39.00 元。
</aside>
```

`popover` 是全局属性。元素隐藏时不渲染，显示时进入顶层。与 modal dialog 不同，Popover API 创建的 popover **始终非模态**：

- 背景仍可点击；
- 背景仍可通过键盘到达；
- 浏览器不会把其余文档变成 inert；
- 不应拿它承载必须先确认的预约、删除或支付决策。

即使给 popover 的 `::backdrop` 画成深色，背景也不会因此变成不可交互。视觉遮罩不能改变交互模式。

### 4.2 `auto` 与 `manual`

本课重点使用两种状态：

| 值 | 打开其他 popover 时 | 点击外部或 Esc | 常见用途 |
| --- | --- | --- | --- |
| `popover` 或 `popover="auto"` | 通常关闭不在其祖先链中的其他 auto popover | 轻触关闭 | 帮助、菜单、短暂选择器 |
| `popover="manual"` | 不自动关闭其他 popover | 不自动轻触关闭 | 由业务明确控制的状态消息 |

`auto` 示例：

```html
<div id="help" popover="auto">短暂帮助</div>
```

空值与 `"auto"` 等价：

```html
<div id="help" popover>短暂帮助</div>
```

`manual` 示例：

```html
<output id="save-message" popover="manual">
  本地草稿已更新。
</output>
```

manual 必须有明确关闭路径。不要因为它不会轻触关闭，就误以为它具有模态语义；背景仍然可操作。

规范还在演进其他 popover 状态和调用扩展。本课只把跨目标环境更成熟的 auto/manual、基础 invoker 和三个核心方法作为基线；任何新增值都应独立查兼容数据并检测，不应从“支持 popover”推断“支持全部新扩展”。

### 4.3 Invoker 属性：声明谁控制谁

`popovertarget` 指向 popover 元素的 `id`：

```html
<button type="button" popovertarget="price-help">切换价格说明</button>
```

`popovertargetaction` 可取：

```text
toggle  默认值，当前隐藏就显示，当前显示就隐藏
show    只请求显示
hide    只请求隐藏
```

完整关系：

```html
<button
  type="button"
  popovertarget="manual-note"
  popovertargetaction="show"
>
  显示提示
</button>

<button
  type="button"
  popovertarget="manual-note"
  popovertargetaction="hide"
>
  隐藏提示
</button>

<p id="manual-note" popover="manual">这是手动 popover。</p>
```

声明式 invoker 不需要作者监听 `click` 才能完成基础显示和隐藏。浏览器还能建立调用元素与目标之间的原生关系。若目标 ID 拼错，按钮不会得到预期行为；排查时应先检查引用，而不是马上增加自定义点击监听器。

### 4.4 Popover JavaScript API

同一目标也可由脚本控制：

```js
const priceHelp = document.querySelector("#price-help");

priceHelp.showPopover();
priceHelp.hidePopover();
priceHelp.togglePopover();
const isOpenAfterToggle = priceHelp.matches(":popover-open");
```

三个方法要求元素当前是有效 popover，并处在允许的状态。错误时可能抛出 `InvalidStateError`。调用前先确认：

- 浏览器支持 API；
- 元素仍连接在文档中；
- `popover` 属性仍存在；
- 当前操作不是无意义的重复 show/hide；
- 没有在事件回调中把属性删掉后继续调用。

判断当前是否显示可使用：

```js
const isOpen = priceHelp.matches(":popover-open");
```

不要另设 `let isPriceHelpOpen` 后同时允许声明式按钮和轻触关闭；自造布尔值很容易与浏览器状态分离。

### 4.5 `beforetoggle` 与 `toggle`

Popover 在状态变化前后提供事件：

```js
priceHelp.addEventListener("beforetoggle", (event) => {
  console.log("即将变化", event.oldState, event.newState);
});

priceHelp.addEventListener("toggle", (event) => {
  console.log("已经变化", event.oldState, event.newState);
});
```

- `beforetoggle` 发生在变化前；
- 从关闭到打开的 `beforetoggle` 可以通过 `preventDefault()` 阻止；
- 关闭方向的通知不应被当作总能阻止关闭的通用机制；
- `toggle` 发生在变化后，不能撤销已经完成的状态；
- 快速连续切换的后置 `toggle` 也可能合并；
- `oldState` 与 `newState` 使用 `"closed"`、`"open"`。

只在明确条件下阻止打开：

```js
priceHelp.addEventListener("beforetoggle", (event) => {
  if (event.newState === "open" && !priceHelp.textContent.trim()) {
    event.preventDefault();
  }
});
```

不要用阻止事件来掩盖空内容或错误目标。通常更好的修复是确保必要帮助在打开前已经存在。

### 4.6 特性检测必须分能力进行

基础检测：

```js
const supportsDialog =
  typeof HTMLDialogElement !== "undefined" &&
  "showModal" in HTMLDialogElement.prototype;

const supportsPopover =
  "popover" in HTMLElement.prototype &&
  "showPopover" in HTMLElement.prototype;

const supportsDetailsName =
  "name" in document.createElement("details");
```

为什么分开：

- 支持基础 `details` 不等于支持较新的 `name`；
- 存在 `<dialog>` 构造类型不等于目标方法一定可用；
- CSS 看起来能显示 popover 不等于 invoker 和 API 可用；
- 支持 Popover 核心不等于支持其所有后来扩展。

不要只检测用户代理字符串。浏览器品牌和版本不能可靠表示嵌入式 WebView、企业策略、预览功能或部分实现。运行时检测回答的是“当前页面实际可用什么”。

### 4.7 可见回退与渐进增强

渐进增强的关键不是“旧浏览器显示一条不支持提示”，而是必要任务仍可完成。

**dialog 回退：**

```text
基础 HTML：显示内联预约区域
检测到 showModal：隐藏内联区域，显示打开 dialog 的按钮
未检测到：保留内联表单，提交时只更新当前内存
```

**popover 回退：**

```text
基础 HTML：帮助正文位于带 popover 属性的元素中
支持浏览器：浏览器默认隐藏，invoker 可打开
不支持浏览器：未知属性被忽略，帮助正文保持普通可见
检测到不支持：隐藏无效 invoker，保留正文
```

**details[name] 回退：**

```text
基础 details 仍可独立展开
支持 name：浏览器执行互斥
不支持 name：允许全部展开，或用很小的 toggle 增强关闭同组其他项
```

回退优先保留内容和任务，不必像素级复制新特性。旧浏览器内联预约没有模态，但仍可以明确地记录本页教学状态；这比显示一个不能操作的“请升级浏览器”更有用。

### 4.8 兼容性边界

资料核验日期：2026-10-10。以下起始版本来自 MDN Browser Compatibility Data，表格只列桌面主线，移动端和嵌入式 WebView 必须另查：

| 能力 | Chrome | Firefox | Safari | 教学结论 |
| --- | ---: | ---: | ---: | --- |
| 基础 `details`/`open` | 12 | 49 | 6 | 成熟基线，仍需真实键盘与辅助技术测试 |
| `details[name]` | 120 | 130 | 17.2 | 比基础 details 新，必须单独检测或允许非互斥回退 |
| 基础 dialog 与 `showModal()` | 37 | 98 | 15.4 | MDN Baseline 自 2022-03 广泛可用 |
| Popover 核心 auto/manual、基础事件 | 114 | 125 | 17 | MDN Baseline 2025，旧设备与旧 WebView 仍需回退 |

Popover 核心在 Chrome 114 已出现，但 `togglePopover()` 的布尔返回值从 Chrome 116 才实现；因此案例调用后统一读取 `:popover-open`，不把早期 `undefined` 当成关闭状态。

这张表不是支持承诺。项目应依据自己的浏览器矩阵、真实设备和辅助技术复测。新属性、新关闭模式、新 invoker 扩展与动画能力可能具有不同支持范围，不能因基础元素可用就整体判为可用。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `INT-004`：popover 模式与 invoker 属性

## 6. 最小可运行案例

在个人练习目录中新建 `practice/03-popover-invokers-fallback/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 INT-004（popover 模式与 invoker 属性） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 在打开页面前写下预期 DOM、默认行为或请求结果；
4. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
5. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [Dialog 模式、结果与焦点恢复](02-dialog-modal-focus-results.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 INT-004（popover 模式与 invoker 属性） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`02-dialog-modal-focus-results.md`](02-dialog-modal-focus-results.md)。

## 8. 常见错误与排查路径

### 8.1 明确错误：把 popover 当成模态框

错误代码：

```html
<!-- 错误案例：删除确认不能由非模态 popover 承担 -->
<button popovertarget="delete-confirm">删除商品</button>
<div id="delete-confirm" popover>
  <p>确认删除？</p>
  <button>确认</button>
</div>
```

即使再加深色背景：

```css
#delete-confirm::backdrop {
  background: rgb(0 0 0 / 70%);
}
```

背景仍不是 inert。用户可以通过键盘或其他输入继续操作页面，确认任务没有形成真正模态边界。

恢复：

- 必须先处理的决定使用 `dialog.showModal()`；
- 只是辅助解释或非阻塞菜单才使用 popover；
- 不要根据视觉稿中的“浮在上面”决定语义。

复验方法：打开后尝试操作背景按钮并检查 `:modal`。popover 应允许背景操作；modal dialog 不允许。

### 8.2 无条件调用 Popover API

错误：

```js
priceHelp.showPopover();
```

在旧浏览器中方法不存在；在目标已失效或状态不合法时也可能报错。

恢复：

```js
const supportsPopover =
  "popover" in HTMLElement.prototype &&
  "showPopover" in HTMLElement.prototype;

if (supportsPopover) {
  priceHelp.showPopover();
}
```

检测失败时保留普通可见说明，不要只吞掉异常。

### 8.3 同时维护自造 popover 布尔值

错误：

```js
let priceHelpOpen = false;
```

声明式 invoker、外部点击、Esc 和 API 都可能改变原生状态，自造值容易过期。恢复为：

```js
const priceHelpOpen = priceHelp.matches(":popover-open");
```

在事件中读取真实状态，而不是推测。

### 8.4 manual popover 没有关闭方式

- **现象**：内容一直遮挡页面；
- **原因**：manual 不轻触关闭，却只提供了 show；
- **修复**：提供明确 hide invoker 或调用 `hidePopover()`；
- **复验**：鼠标、键盘和触摸都能到达关闭入口。

### 8.5 不支持时把正文一起隐藏

错误回退：

```html
<aside id="price-help" popover hidden>价格说明</aside>
```

`hidden` 会让旧浏览器也隐藏必要正文，并可能与 popover 显示机制冲突。更稳妥的基线是让 `popover` 在不支持环境中被忽略，正文自然显示；检测失败后只隐藏无效 invoker。

## 9. 课后题

1. INT-004（popover 模式与 invoker 属性）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

### 10.1 故障注入：把 popover 当模态框

文件位置：

```text
practice/html-12-native-interactive/popover-boundary.html
```

要求：

- 创建一个 auto 价格帮助；
- 创建一个 manual 状态提示；
- 同时提供声明式 show/hide/toggle 和至少一个 API 调用；
- 记录 `beforetoggle` 与 `toggle`；
- 加一个背景计数按钮；
- 给 popover 添加深色 `::backdrop`；
- 实测背景仍可操作；
- 再把必须确认的预约错误地放入 popover，记录为什么失败；
- 最终恢复为 `dialog.showModal()`；
- 为不支持 Popover 的环境保留普通可见帮助。

答案标准：

- auto 外部点击或 Esc 可关闭；
- manual 外部点击不自动关闭；
- `:popover-open` 与日志一致；
- 没有自造开关布尔值；
- 深色 backdrop 没有被描述成模态；
- 恢复后的预约 dialog 背景不可操作；
- 不支持时必要价格说明仍然可读。

## 11. 阶段验收

### Popover

- [ ] auto 与 manual 行为可以分别说明；
- [ ] invoker ID 指向真实目标；
- [ ] show、hide、toggle 三种声明式动作可观察；
- [ ] `showPopover()`、`hidePopover()`、`togglePopover()` 职责清楚；
- [ ] `beforetoggle` 与 `toggle` 顺序正确；
- [ ] 当前显示状态从 `:popover-open` 读取；
- [ ] popover 被明确描述为非模态；
- [ ] 顶层没有被误写成模态；
- [ ] manual 有明确关闭路径；
- [ ] 不支持时帮助正文保持可见。

## 12. 常见问题

### Q13：popover 可以包含按钮和表单吗？

可以根据内容语义包含交互控件，但它仍非模态。复杂菜单、组合框和其他组件还有各自键盘与无障碍要求，Popover API 只解决显示、顶层和部分调用关系。

### Q15：auto popover 为什么会自动关闭另一个 auto popover？

auto 状态提供轻触关闭和自动管理，减少多个短暂浮层同时堆叠。嵌套关系有更细规则；基础页面仍应实测自己的 invoker 结构。

### Q16：manual 是否更适合重要确认？

不是。manual 只表示不自动轻触关闭，背景仍可操作。重要确认应使用 modal dialog。

### Q17：如何判断 popover 当前打开？

使用 `element.matches(":popover-open")`。不要只检查 `popover` 属性；该属性说明元素具备 popover 能力，不表示此刻正在显示。

### Q18：不支持 popover 时为什么正文会显示？

旧浏览器忽略未知 `popover` 属性，元素回到普通 HTML 呈现。案例检测失败后只隐藏无效调用按钮，因此必要帮助仍在文档流中。

### Q19：所有兼容回退都要复制完全相同的视觉吗？

不需要。优先保证内容可读、任务可完成和状态不误导。内联表单可以是模态 dialog 的合理旧环境回退，即使视觉不同。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：使用 Popover、声明式调用者和脚本 API，并按能力检测提供可见回退。
- `INT-004`：popover 模式与 invoker 属性
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：Dialog 模式、结果与焦点恢复](02-dialog-modal-focus-results.md) · [下一课：DOM 查询、集合与导航](04-dom-query-collections-navigation.md) · [返回 HTML 模块](../README.md)
