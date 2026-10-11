# details、dialog 与 popover：复用浏览器的交互与顶层机制

> 所属章节：原生交互、DOM 与事件
> 建议学习时间：5–6 小时
> 阶段成果：完成规则披露、预约确认和价格帮助，并为旧浏览器与焦点异常提供恢复路径

## 任务卡

邻里集市的商品页需要三种看似相近、实际职责不同的交互：

1. 交接规则平时收起，读者需要时自行展开；
2. 预约会改变当前页面内存中的商品状态，确认前必须暂时阻止背景操作；
3. 价格旁需要一段辅助说明，但查看说明时不应锁住整个页面。

这三种需求分别对应：

```text
补充内容披露       → details + summary
必须先处理的确认   → dialog + showModal()
短暂的非模态浮层   → popover
```

本课不从 `div`、绝对定位和一组自造键盘监听开始。我们先使用浏览器已经实现的开关状态、顶层、模态、关闭请求、焦点移动和声明式调用关系，再用 JavaScript 记录业务状态和补足回退。

**完成本课后，你将交付：**

- 一组可以用键盘展开的交接规则；
- 一份 `details.open`、`toggle` 与命名组互斥行为记录；
- 一份 `show()` 与 `showModal()` 的背景交互对照；
- 一个使用 `method="dialog"`、`returnValue`、`cancel` 和 `close` 的预约确认框；
- 一条在入口正常、被禁用或被删除时都能恢复焦点的路径；
- 一个同时演示 `popover="auto"` 与 `popover="manual"` 的最小页面；
- 一个使用 invoker 属性、Popover API、`beforetoggle` 和 `toggle` 的价格帮助；
- 一份 dialog、popover 和 `details[name]` 的特性检测及可见回退；
- 两个明确反例：CSS 强行显示 dialog、把 popover 当作模态框；
- 一个刷新即重置的邻里集市内存预约状态。

本课不会创建真实预约，不会发送网络请求，也不会提供服务端独占、库存锁定、身份认证、授权、支付或持久化。页面上的“已预约”只是当前标签页中的教学状态。

## 1. 任务背景

普通页面经常把所有“显示一块内容”的需求都做成浮层，然后再逐项补键盘、焦点、层级和关闭逻辑。这种做法会把三个不同问题混在一起：

- **内容是否只是补充说明？**
- **背景是否必须暂停交互？**
- **内容是否需要脱离普通堆叠顺序显示？**

先回答这三个问题，再选元素：

| 需求 | 合适的原生机制 | 背景可操作 | 进入顶层 | 典型关闭方式 |
| --- | --- | ---: | ---: | --- |
| 展开一段规则或技术说明 | `details` | 是 | 否 | 再次激活 `summary` |
| 必须确认或取消的预约 | `dialog.showModal()` | 否 | 是 | 按钮、Esc、`close()` |
| 可继续浏览时查看价格解释 | `popover` | 是 | 是 | 调用按钮、轻触关闭、API |
| 非模态检查器或辅助窗口 | `dialog.show()` | 是 | 否 | 明确按钮或 `close()` |

“在最上面”不等于“模态”。Popover 会进入浏览器的 **top layer（顶层）**，却始终是非模态；背景仍可点击和聚焦。`showModal()` 打开的 dialog 同时进入顶层并让同一文档中的其他内容变为不可交互。两者不能因视觉上都有浮层而互换。

本课按下面的路径推进：

```text
details 建立无脚本披露基线
  → open 与 toggle 提供可观察状态
  → name 组提供原生互斥，并为旧浏览器补回退
  → dialog 对比非模态与模态
  → method="dialog" 产生明确 returnValue
  → cancel/close 分离“请求关闭”与“已经关闭”
  → 焦点从入口进入并可靠返回
  → popover 用声明式 invoker 提供非模态顶层帮助
  → 特性检测保留可读、可操作的旧浏览器路径
```

邻里集市的状态约定是：

```text
商品数据：写在页面脚本中的固定教学数据
规则开关：由 details.open 表示
当前预约：只保存在 JavaScript 对象中
价格帮助：由浏览器维护 popover 显示状态
刷新页面：所有预约状态恢复为 available
```

CSS 类名可以反映状态，但不能成为唯一业务事实。预约结果必须能追溯到内存对象；dialog 和 popover 是否打开则应读取对应原生状态，而不是另外维护一个容易失同步的布尔变量。

## 2. 学习目标

完成本课后，你应能：

- 说明 `details` 是披露控件，而不是标签页、菜单或模态框；
- 把第一个 `summary` 子元素作为可见摘要，并解释缺少它时的浏览器回退；
- 解释 `open` 是布尔属性，`open="false"` 仍表示打开；
- 使用 `.open`、`setAttribute()` 或 `removeAttribute()`观察状态映射；
- 在 `toggle` 发生后读取 `open`、`oldState` 和 `newState`；
- 解释连续快速切换可能合并为一次 `toggle` 通知；
- 使用相同的 `name` 创建互斥 details 组，并说明只应有一个初始 `open`；
- 判断互斥是否真的帮助读者，而不是机械地把所有披露都做成手风琴；
- 区分 dialog 的关闭、非模态打开和模态打开；
- 正确使用 `show()`、`showModal()`、`close()`、`open` 与 `returnValue`；
- 说明 `showModal()` 为什么会进入顶层并使背景不可交互；
- 区分可取消且不冒泡的 `cancel` 与不可取消且不冒泡的 `close`；
- 使用 `form method="dialog"` 在不发送网络请求的情况下关闭 dialog；
- 根据提交按钮的 `value` 读取 dialog 结果；
- 在每次打开前清空旧 `returnValue`，避免把上一次选择误当成本次结果；
- 为模态 dialog 选择合理的初始焦点，并保留明确关闭按钮；
- 在正常入口、禁用入口和已删除入口三种情况下恢复焦点；
- 解释顶层不改变 DOM 父子关系，也不是无限增大 `z-index`；
- 区分 `popover="auto"` 与 `popover="manual"` 的轻触关闭和自动互斥行为；
- 使用 `popovertarget` 和 `popovertargetaction` 声明 show、hide、toggle；
- 使用 `showPopover()`、`hidePopover()` 与 `togglePopover()`；
- 在 `beforetoggle` 与 `toggle` 中读取 `oldState`、`newState`，并知道何时可以阻止打开；
- 解释 popover 虽在顶层却始终非模态；
- 为 `dialog`、Popover API 和 `details[name]` 分别进行特性检测；
- 设计“新能力可用时增强、不可用时必要内容仍可见”的回退；
- 用实际背景点击、`document.activeElement`、原生状态和事件日志证明行为，而不是只看截图。

## 3. 预备知识

开始前建议完成：

- [表单提交与成功控件](../05-forms-validation/01-form-submission-successful-controls.md)；
- [表单控件、选择与分组](../05-forms-validation/03-form-controls-groups.md)；
- [约束验证、错误恢复与文件](../05-forms-validation/04-constraint-validation-files.md)。

你需要知道：

- HTML 布尔属性由“是否存在”决定真假；
- `button` 在表单中未写 `type` 时默认可能提交；
- `event.preventDefault()` 取消的是允许取消的默认动作；
- `document.activeElement` 可以观察当前焦点；
- `hidden` 表示内容当前不应呈现；
- `disabled` 控件不能作为可靠的焦点恢复目标；
- `textContent` 可安全显示普通文字；
- 本课程价格使用整数分，存储时间使用 UTC ISO 8601。

本课不要求：

- 自己实现焦点陷阱；
- 使用第三方弹层库；
- 构建真实预约接口；
- 处理多人同时预约；
- 保存到 `localStorage`、Cookie、数据库或远端服务；
- 证明所有读屏软件表现完全一致。

准备观察工具：

```text
页面：确认哪些内容可见、背景能否操作
Elements：确认 open、name、popover 等属性变化
Console：记录 toggle、cancel、close 与活动焦点
键盘：Tab、Shift+Tab、Enter、Space、Esc
Network：确认案例没有预约请求
```

不要只用鼠标验收。`summary`、button、dialog 和 popover 的价值之一，就是浏览器已经提供键盘与焦点行为；如果测试跳过键盘，就没有验证这部分契约。

## 4. 核心理论

### 4.1 原生交互元素提供的是行为契约

下面两个片段可能都能“显示一块文字”：

```html
<div class="panel visible">交接规则</div>
```

```html
<details>
  <summary>查看交接规则</summary>
  <p>请在门卫处当面核对商品。</p>
</details>
```

第一个片段只给出普通内容和作者自定义类名。第二个片段还定义了：

- 哪一部分是开关；
- 哪一部分是被披露内容；
- 默认关闭状态；
- 键盘激活；
- `open` 内容属性与 `.open` DOM 属性；
- 状态变化后的 `toggle` 事件。

同理，`showModal()` 不只是把 `display` 改成可见。它还触发顶层、背景 inert、初始焦点、关闭请求与恢复流程。使用原生元素并不等于“无需测试”，而是把基础契约交给浏览器，再把测试集中在业务选择、内容、兼容性和恢复路径上。

### 4.2 `details`、`summary` 与 `open`

基础披露：

```html
<details id="handoff-rule">
  <summary>查看当面交接规则</summary>
  <p>双方应在公共区域核对商品状态，再决定是否完成交接。</p>
</details>
```

内容模型应是一个 `summary`，后跟普通流内容。只有父 `details` 的第一个 `summary` 子元素充当原生摘要；后续 `summary` 不会成为第二个开关。把摘要放在最前面最清楚，也符合元素内容模型。

如果没有 `summary`，浏览器可以生成自己的默认标签，但文字、语言和可理解性不可控。教材和生产页面都应提供明确摘要。

`open` 是布尔属性：

```html
<details open>
  <summary>默认展开</summary>
  <p>这段内容初始可见。</p>
</details>
```

错误理解：

```html
<!-- 错误案例：属性仍然存在，所以仍然打开 -->
<details open="false">
  <summary>并没有关闭</summary>
  <p>布尔属性不把字符串 false 解释为假。</p>
</details>
```

正确关闭方式：

```js
const rule = document.querySelector("#handoff-rule");

rule.open = false;
// 等价目标：rule.removeAttribute("open");
```

正确打开方式：

```js
rule.open = true;
// 等价目标：rule.setAttribute("open", "");
```

`.open` 是布尔 DOM 属性，最适合读取和切换当前状态。内容属性仍可在 Elements 中作为证据观察。

### 4.3 `toggle`：状态改变后的通知

`details` 每次在打开和关闭之间切换时，会在状态改变后触发 `toggle`：

```js
rule.addEventListener("toggle", (event) => {
  console.log({
    open: rule.open,
    oldState: event.oldState,
    newState: event.newState
  });
});
```

现代实现使用 `ToggleEvent`，`oldState` 和 `newState` 通常是 `"closed"` 或 `"open"`。排查旧环境时仍应把 `rule.open` 当作当前事实。

两个边界：

1. `toggle` 发生时状态已经改变，不适合用来取消本次展开；
2. 如果脚本在浏览器派发事件前连续多次切换 `open`，通知可能被合并，不能把事件次数当作每一次中间赋值的审计日志。

如果业务必须记录每一个脚本命令，应在发出命令的位置记录；`toggle` 更适合记录浏览器最终完成的可见状态。

### 4.4 `details[name]` 命名组

相同的非空 `name` 把同一树中的 details 放入互斥组：

```html
<section aria-labelledby="rule-title">
  <h2 id="rule-title">交接规则</h2>

  <details name="handoff-rules" open>
    <summary>地点</summary>
    <p>选择有照明和公共监控的区域。</p>
  </details>

  <details name="handoff-rules">
    <summary>核对</summary>
    <p>当面核对成色、配件和已知缺陷。</p>
  </details>

  <details name="handoff-rules">
    <summary>付款</summary>
    <p>确认商品后再按双方约定完成付款。</p>
  </details>
</section>
```

打开“核对”时，“地点”自动关闭，对应元素的 `open` 属性被移除。组成员不必相邻，但应放在有标题的共同容器里，让视觉和程序关系都容易理解。

作者必须遵守：

- `name` 不能是空字符串；
- 同一组初始标记中不能有多个 `open`；
- 不要把同组 details 嵌套进另一个组成员；
- 不要用脚本制造同组多个打开成员；
- 先判断互斥是否帮助任务。

如果用户需要并排比较三条规则，互斥会增加反复展开成本，此时应省略 `name`。命名组是空间与比较需求之间的产品选择，不是“更现代”的固定写法。

### 4.5 dialog 的三种可观察状态

一个 dialog 可以处于：

| 状态 | 建立方式 | `open` | 顶层 | 背景 |
| --- | --- | ---: | ---: | --- |
| 关闭 | 初始状态或 `close()` 后 | `false` | 否 | 可操作 |
| 非模态打开 | `show()` | `true` | 否 | 可操作 |
| 模态打开 | `showModal()` | `true` | 是 | 同一文档背景 inert |

基础结构：

```html
<dialog id="reservation-dialog" aria-labelledby="reservation-title">
  <h2 id="reservation-title">确认预约</h2>
  <p>预约只保存在当前页面内存。</p>
</dialog>
```

打开非模态：

```js
reservationDialog.show();
```

打开模态：

```js
reservationDialog.showModal();
```

关闭：

```js
reservationDialog.close("confirmed");
```

`show()` 适合允许继续操作背景的检查器或辅助窗口。`showModal()` 适合必须先处理的确认。预约确认会决定是否改变当前内存状态，所以本课使用模态。

调用边界：

- 已经由 `showModal()` 模态打开时再调用 `show()`，会抛出 `InvalidStateError`；
- 已经由 `show()` 非模态打开时再调用 `showModal()`，也会抛出 `InvalidStateError`；
- 重复打开前检查 `.open`，并明确当前所需模式；
- 不要用“先随便显示，再补类名”切换模态。

推荐：

```js
if (!reservationDialog.open) {
  reservationDialog.showModal();
}
```

### 4.6 顶层、`::backdrop` 与模态

顶层由浏览器管理，不是 DOM 中的普通容器。进入顶层的元素：

- 绘制在普通页面堆叠上下文之上；
- 不需要与祖先的 `z-index` 竞争；
- 仍保留原来的 DOM 父子关系；
- 按进入顶层的顺序形成层级；
- 可以配合 `::backdrop` 绘制其后方的全视口背景。

`showModal()` 打开的 dialog 会进入顶层，并使同一文档中 dialog 之外的内容 inert。用户不能通过鼠标或正常 Tab 顺序操作背景。若 dialog 位于 iframe 中，被阻塞的是该 iframe 文档，不是 iframe 外的父文档。

样式示例：

```css
dialog::backdrop {
  background: rgb(20 35 28 / 55%);
}
```

`::backdrop` 的深色外观不是模态本身。真正的背景阻塞来自 `showModal()` 的浏览器行为。给普通元素画一个全屏半透明背景，不会自动建立 inert、焦点管理或关闭请求。

### 4.7 `close()` 与 `returnValue`

`close()` 关闭已打开的 dialog。可选字符串参数会更新 `returnValue`：

```js
reservationDialog.close("confirmed");
console.log(reservationDialog.returnValue); // "confirmed"
```

没有参数的 `close()` 不会替你清除旧值。`returnValue` 可能保留上一次结果，所以每次打开前应重置：

```js
reservationDialog.returnValue = "";
reservationDialog.showModal();
```

把 `returnValue` 看作“这次关闭的结果代码”，不要把它当成持久业务状态。真正的当前预约仍应写入明确的内存对象，并根据结果代码更新。

### 4.8 `method="dialog"`：关闭但不发送

dialog 内的表单可以使用特殊提交方式：

```html
<dialog id="confirm-dialog">
  <form method="dialog">
    <p>是否记录本页预约？</p>
    <button value="cancel">取消</button>
    <button value="reserve">确认预约</button>
  </form>
</dialog>
```

激活提交按钮后：

- dialog 关闭；
- 表单数据不会发送到网络；
- 控件状态不会因这次动作自动清空；
- 被激活按钮的 `value` 写入 dialog 的 `returnValue`；
- 随后可以在 `close` 事件中读取结果。

```js
confirmDialog.addEventListener("close", () => {
  if (confirmDialog.returnValue === "reserve") {
    console.log("只更新当前页面内存状态");
  }
});
```

`method="dialog"` 不是网络表单的离线队列，也不代表预约已经写入服务器。它只是 dialog 内部关闭协议。

“取消”按钮通过 `method="dialog"` 关闭时不会因此触发 `cancel` 事件。这里发生的是表单提交并关闭，结果为 `"cancel"`。`cancel` 事件对应的是 Esc、移动端返回等平台关闭请求。

### 4.9 `cancel` 与 `close`

两个事件承担不同阶段：

| 事件 | 发生时机 | 可取消 | 冒泡 | 适合做什么 |
| --- | --- | ---: | ---: | --- |
| `cancel` | 用户或平台请求关闭时 | 是 | 否 | 判断是否暂时阻止关闭 |
| `close` | dialog 已经关闭后 | 否 | 否 | 读取结果、更新状态、恢复焦点 |

基础监听：

```js
reservationDialog.addEventListener("cancel", (event) => {
  console.log("收到关闭请求");

  if (hasUnsavedCriticalInput) {
    event.preventDefault();
  }
});

reservationDialog.addEventListener("close", () => {
  console.log("已经关闭", reservationDialog.returnValue);
});
```

不要默认阻止 Esc。键盘用户通常期待模态框能用 Esc 退出。只有确实存在会丢失的重要输入时才考虑阻止，并提供清楚原因与其他关闭方式。

`cancel` 和 `close` 都不冒泡。应直接监听具体 dialog，不要期待在 `body` 的普通冒泡监听器里统一收到。

### 4.10 初始焦点与明确关闭入口

打开模态 dialog 后，焦点应进入 dialog。用 `autofocus` 表达最合适的初始操作：

```html
<button value="cancel" autofocus>继续浏览</button>
```

选择原则：

- 破坏性或高风险操作不应默认获得焦点；
- 简短确认框通常可以把焦点放到“取消”或安全操作；
- 表单型 dialog 可以把焦点放到第一个需要输入的控件；
- 长说明不应迫使用户先穿过大量内容才能找到关闭按钮；
- 每个 dialog 都要有触摸设备也能使用的可见关闭机制，不能只依赖 Esc；
- 不要给 `<dialog>` 添加 `tabindex` 来代替内部合理焦点。

### 4.11 关闭后的焦点恢复

正常流程应回到打开 dialog 的入口，让键盘用户继续原来的任务：

```js
let lastDialogInvoker = null;

openButton.addEventListener("click", (event) => {
  lastDialogInvoker = event.currentTarget;
  reservationDialog.returnValue = "";
  reservationDialog.showModal();
});

reservationDialog.addEventListener("close", () => {
  lastDialogInvoker?.focus();
});
```

但真实页面会变化：

- 预约确认后，入口可能被禁用；
- 商品被筛掉后，入口可能从 DOM 删除；
- 整张商品卡可能被替换；
- 入口可能位于变成 `hidden` 或 `inert` 的区域。

对无效入口调用 `focus()` 不一定抛错，却可能什么都没发生。可靠恢复需要逐级选择：

```js
function canReceiveFocus(element) {
  return (
    element instanceof HTMLElement &&
    element.isConnected &&
    !element.matches(":disabled") &&
    !element.closest("[hidden], [inert]")
  );
}

function focusWithFallback(preferred, localFallback, pageFallback) {
  const target = [preferred, localFallback, pageFallback].find(canReceiveFocus);

  if (target) {
    target.focus({ preventScroll: true });
  }
}
```

推荐回退顺序：

```text
仍存在且可操作的原入口
  → 当前商品卡标题或下一项合理操作
  → 页面主标题或稳定区域
```

回退目标若不是原生可聚焦元素，可使用 `tabindex="-1"` 允许脚本聚焦，但不会把它加入普通 Tab 顺序：

```html
<h2 id="listing-title" tabindex="-1">胡桃木阅读灯</h2>
```

焦点恢复属于关闭流程的一部分。必须分别测试入口正常、禁用和删除，不能以正常按钮的一次成功代替全部路径。

### 4.12 Popover 是非模态顶层内容

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

### 4.13 `auto` 与 `manual`

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

### 4.14 Invoker 属性：声明谁控制谁

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

### 4.15 Popover JavaScript API

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

### 4.16 `beforetoggle` 与 `toggle`

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

### 4.17 特性检测必须分能力进行

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

### 4.18 可见回退与渐进增强

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

### 4.19 兼容性边界

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

| 名称 | 作用 | 关键证据 | 边界 |
| --- | --- | --- | --- |
| `details` | 建立披露控件 | `.open`、`[open]` | 不适合菜单、标签页或模态确认 |
| `summary` | 提供 details 的摘要与开关 | 键盘激活、可见文字 | 应是父 details 的第一个 summary 子元素 |
| `open` | 表示 details/dialog 打开 | 属性存在、DOM 布尔值 | `open="false"` 仍为真；dialog 直接切属性不等于 API 生命周期 |
| `details[name]` | 建立互斥披露组 | 同组只保留一个 `open` | 新于基础 details；互斥未必适合比较任务 |
| `toggle` | 报告 details 或 popover 已完成切换 | `oldState`、`newState` | 快速变化可能合并，不能取消已完成状态 |
| `dialog` | 表示模态或非模态对话框 | `open`、事件、活动焦点 | 不要通过 CSS 强行显示关闭状态 |
| `show()` | 非模态打开 dialog | `.open === true`，背景可操作 | 不进入顶层；模态已打开时会报错 |
| `showModal()` | 模态打开 dialog | 顶层、`::backdrop`、背景 inert | 只阻塞所在文档；非模态已打开时会报错 |
| `close(value?)` | 关闭 dialog | `open === false`、`close` 事件 | 直接关闭不可取消；省略参数不清旧结果 |
| `returnValue` | 保存本次 dialog 结果字符串 | `close` 事件中读取 | 每次打开前应重置；不是持久业务状态 |
| `cancel` | 报告平台关闭请求 | Esc/返回手势、`defaultPrevented` | 可取消、不冒泡；不要无理由阻止 |
| `close` | 报告 dialog 已关闭 | `returnValue`、焦点 | 不可取消、不冒泡 |
| `form[method="dialog"]` | 提交按钮结果并关闭 dialog | 按钮 `value` 进入 `returnValue` | 不发送数据，也不代表真实业务成功 |
| `autofocus` | 指定打开后的优先焦点 | `document.activeElement` | 选择安全且符合当前任务的控件 |
| `::backdrop` | 样式化顶层元素后方背景 | DevTools 样式与视觉 | 样式本身不创造模态 |
| top layer | 浏览器管理的特殊绘制层 | 普通层级之上 | 不是普通 DOM 容器，也不等于模态 |
| `popover` | 把元素声明为 popover | `element.popover` | 核心 popover 始终非模态 |
| `popover="auto"` | 自动互斥并允许轻触关闭 | 外部点击、Esc、`:popover-open` | 适合短暂帮助，不适合必须确认 |
| `popover="manual"` | 只由明确调用显示或隐藏 | 多个 manual 可同时存在 | 必须提供清楚关闭入口，仍非模态 |
| `popovertarget` | 声明 invoker 的目标 ID | `popoverTargetElement` | ID 拼错时不会获得目标行为 |
| `popovertargetaction` | 声明 toggle/show/hide | `popoverTargetAction` | 省略时默认为 toggle |
| `showPopover()` | 显示并加入顶层 | `:popover-open` 为真 | 无效状态可能抛异常 |
| `hidePopover()` | 隐藏并移出顶层 | `:popover-open` 为假 | 不要对未显示目标盲目重复调用 |
| `togglePopover()` | 按当前状态切换 | 调用后用 `:popover-open` 读取状态 | 现行返回布尔值，但早期实现可能返回 `undefined` |
| `beforetoggle` | 切换前通知 | `oldState`、`newState` | 打开方向可阻止；不要当作所有关闭的锁 |
| `:popover-open` | 选择当前显示的 popover | `matches()` 或 CSS | 旧浏览器需避免无条件依赖 |
| `HTMLElement.prototype.popover` | 检测 Popover 核心 | `"popover" in HTMLElement.prototype` | 不代表全部后续扩展 |
| `HTMLDialogElement.prototype.showModal` | 检测原生模态 API | `"showModal" in ...` | 回退仍需保留可操作任务 |

推荐排查顺序：

```text
需求是披露、非模态还是模态
  → 元素是否使用正确原生模式
  → 能力是否通过运行时检测
  → open / :popover-open 是否符合实际
  → activeElement 是否位于合理位置
  → cancel / close / toggle 日志是否出现
  → returnValue 是否在本轮打开前清空
  → invoker 是否仍连接、可见、未禁用
  → 回退内容是否仍可读、任务是否仍可完成
```

## 6. 最小可运行案例

### 6.1 文件位置

在个人练习目录创建：

```text
market-learning/
└── practice/
    └── html-12-native-interactive/
        └── native-elements-observer.html
```

课程仓库只保存 Markdown 教材。把下一节完整代码保存到个人 `native-elements-observer.html`。

### 6.2 完整文件：原生交互观察器

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>原生交互观察器 · 邻里集市</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, sans-serif;
      }

      body {
        line-height: 1.6;
        margin: 2rem auto;
        max-width: 56rem;
        padding: 0 1rem;
      }

      section {
        border-block-start: 1px solid #b7c4bd;
        margin-block-start: 2rem;
        padding-block-start: 1rem;
      }

      details,
      .fallback,
      [popover] {
        border: 1px solid #8ba095;
        margin-block: 0.75rem;
        padding: 0.75rem;
      }

      summary {
        cursor: pointer;
        font-weight: 700;
      }

      button {
        font: inherit;
        margin: 0.25rem;
        padding: 0.5rem 0.75rem;
      }

      dialog {
        border: 2px solid #285b43;
        max-width: 32rem;
        padding: 1.25rem;
      }

      dialog:not([open]) {
        display: none;
      }

      dialog::backdrop {
        background: rgb(15 35 25 / 55%);
      }

      [popover] {
        background: #fffdf5;
        max-width: 24rem;
      }

      #event-log {
        background: #edf3ef;
        min-height: 8rem;
        overflow: auto;
        padding: 1rem;
        white-space: pre-wrap;
      }

      :focus-visible {
        outline: 3px solid #b04b16;
        outline-offset: 3px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1 id="page-title" tabindex="-1">原生交互观察器</h1>
      <p>
        本页只改变当前文档状态，不发送请求，不保存预约。
      </p>

      <section aria-labelledby="details-title">
        <h2 id="details-title">一、命名规则披露</h2>

        <details id="rule-place" name="observer-rules" open>
          <summary>交接地点</summary>
          <p>选择公共、明亮且双方都容易到达的位置。</p>
        </details>

        <details id="rule-check" name="observer-rules">
          <summary>商品核对</summary>
          <p>当面核对成色、配件和页面中已经说明的缺陷。</p>
        </details>

        <details id="rule-payment" name="observer-rules">
          <summary>付款顺序</summary>
          <p>完成核对后，再按双方约定完成付款。</p>
        </details>
      </section>

      <section aria-labelledby="dialog-section-title">
        <h2 id="dialog-section-title">二、dialog 模式与结果</h2>
        <p>
          分别打开非模态和模态版本，再尝试操作页面上的其他按钮。
        </p>

        <button id="show-dialog" type="button" hidden>
          用 show() 非模态打开
        </button>
        <button id="show-modal" type="button" hidden>
          用 showModal() 模态打开
        </button>

        <section
          id="dialog-fallback"
          class="fallback"
          aria-labelledby="dialog-fallback-title"
        >
          <h3 id="dialog-fallback-title">预约确认兼容模式</h3>
          <p>
            当前环境没有可用的 showModal()。必要说明保持内联可见，
            仍可继续学习 details 和可见回退。
          </p>
        </section>

        <dialog id="observer-dialog" aria-labelledby="observer-dialog-title">
          <form method="dialog">
            <h2 id="observer-dialog-title">确认本页演示</h2>
            <p>
              method="dialog" 只会关闭对话框并产生结果，不会发送表单。
            </p>

            <label>
              <input id="prevent-cancel" type="checkbox">
              暂时阻止 Esc 关闭，用于观察 cancel.preventDefault()
            </label>

            <p>
              <button value="cancel" autofocus>取消</button>
              <button value="confirmed">确认</button>
            </p>

            <p>
              <button id="script-close" type="button">
                用 close("script") 关闭
              </button>
              <button id="disable-invoker" type="button">
                禁用本次入口并关闭
              </button>
              <button id="remove-invoker" type="button">
                删除本次入口并关闭
              </button>
            </p>
          </form>
        </dialog>
      </section>

      <section aria-labelledby="popover-title">
        <h2 id="popover-title">三、Popover auto 与 manual</h2>

        <button
          class="popover-control"
          type="button"
          popovertarget="auto-help"
        >
          切换 auto 价格帮助
        </button>

        <aside id="auto-help" popover="auto">
          <h3>价格帮助</h3>
          <p>3900 分表示 39.00 元。打开本帮助时，背景仍可操作。</p>
        </aside>

        <button
          class="popover-control"
          type="button"
          popovertarget="manual-note"
          popovertargetaction="show"
        >
          显示 manual 提示
        </button>
        <button
          class="popover-control"
          type="button"
          popovertarget="manual-note"
          popovertargetaction="hide"
        >
          隐藏 manual 提示
        </button>
        <button
          id="api-toggle"
          class="popover-control"
          type="button"
        >
          用 togglePopover() 切换
        </button>

        <output id="manual-note" popover="manual">
          这是 manual popover。点击外部不会自动关闭，背景仍可操作。
        </output>
      </section>

      <section aria-labelledby="evidence-title">
        <h2 id="evidence-title">四、事件与焦点证据</h2>
        <p id="feature-report">正在检测能力。</p>
        <button id="background-action" type="button">
          背景操作计数：0
        </button>
        <pre id="event-log" aria-live="polite">尚无事件。</pre>
      </section>
    </main>

    <script>
      "use strict";

      const pageTitle = document.querySelector("#page-title");
      const featureReport = document.querySelector("#feature-report");
      const eventLog = document.querySelector("#event-log");
      const backgroundAction = document.querySelector("#background-action");
      const detailsGroup = [
        ...document.querySelectorAll('details[name="observer-rules"]')
      ];
      const detailsProbe = document.createElement("details");

      const dialog = document.querySelector("#observer-dialog");
      const showDialogButton = document.querySelector("#show-dialog");
      const showModalButton = document.querySelector("#show-modal");
      const dialogFallback = document.querySelector("#dialog-fallback");
      const preventCancel = document.querySelector("#prevent-cancel");
      const scriptCloseButton = document.querySelector("#script-close");
      const disableInvokerButton = document.querySelector("#disable-invoker");
      const removeInvokerButton = document.querySelector("#remove-invoker");

      const autoHelp = document.querySelector("#auto-help");
      const manualNote = document.querySelector("#manual-note");
      const apiToggleButton = document.querySelector("#api-toggle");
      const popoverControls = [
        ...document.querySelectorAll(".popover-control")
      ];

      const supportsDialog =
        typeof HTMLDialogElement !== "undefined" &&
        "showModal" in HTMLDialogElement.prototype;
      const supportsPopover =
        "popover" in HTMLElement.prototype &&
        "showPopover" in HTMLElement.prototype;
      const supportsDetailsName =
        "name" in detailsProbe;
      const supportsDetailsToggle =
        "ontoggle" in detailsProbe;

      let lastDialogInvoker = null;
      let backgroundCount = 0;
      const logLines = [];

      function writeLog(message, data = {}) {
        logLines.push(
          JSON.stringify({
            message,
            activeElement: document.activeElement?.id || "(无 id)",
            ...data
          })
        );
        eventLog.textContent = logLines.slice(-18).join("\n");
      }

      function canReceiveFocus(element) {
        return (
          element instanceof HTMLElement &&
          element.isConnected &&
          !element.matches(":disabled") &&
          !element.closest("[hidden], [inert]")
        );
      }

      function restoreDialogFocus() {
        const target = [lastDialogInvoker, pageTitle].find(canReceiveFocus);

        if (target) {
          target.focus({ preventScroll: true });
        }

        writeLog("焦点恢复完成", {
          preferredInvokerConnected: Boolean(lastDialogInvoker?.isConnected),
          preferredInvokerDisabled: Boolean(lastDialogInvoker?.matches(":disabled"))
        });
      }

      function openDialog(mode, invoker) {
        if (dialog.open) {
          writeLog("忽略重复打开", { mode });
          return;
        }

        lastDialogInvoker = invoker;
        dialog.returnValue = "";
        preventCancel.checked = false;

        if (mode === "modal") {
          dialog.showModal();
        } else {
          dialog.show();
        }

        writeLog("dialog 已打开", {
          mode,
          open: dialog.open
        });
      }

      featureReport.textContent = [
        `details[name]：${
          supportsDetailsName
            ? "支持"
            : supportsDetailsToggle
              ? "使用 toggle 脚本互斥回退"
              : "保留独立展开"
        }`,
        `dialog.showModal：${supportsDialog ? "支持" : "显示内联回退"}`,
        `Popover API：${supportsPopover ? "支持" : "帮助保持普通可见"}`
      ].join("；");

      for (const item of detailsGroup) {
        item.addEventListener("toggle", (event) => {
          writeLog("details toggle", {
            id: item.id,
            open: item.open,
            oldState: event.oldState ?? "(未提供)",
            newState: event.newState ?? "(未提供)"
          });

          if (!supportsDetailsName && supportsDetailsToggle && item.open) {
            for (const other of detailsGroup) {
              if (other !== item) {
                other.open = false;
              }
            }
          }
        });
      }

      if (supportsDialog) {
        dialogFallback.hidden = true;
        showDialogButton.hidden = false;
        showModalButton.hidden = false;

        showDialogButton.addEventListener("click", (event) => {
          openDialog("non-modal", event.currentTarget);
        });

        showModalButton.addEventListener("click", (event) => {
          openDialog("modal", event.currentTarget);
        });

        scriptCloseButton.addEventListener("click", () => {
          dialog.close("script");
        });

        disableInvokerButton.addEventListener("click", () => {
          if (lastDialogInvoker instanceof HTMLButtonElement) {
            lastDialogInvoker.disabled = true;
          }
          dialog.close("invoker-disabled");
        });

        removeInvokerButton.addEventListener("click", () => {
          lastDialogInvoker?.remove();
          dialog.close("invoker-removed");
        });

        dialog.addEventListener("cancel", (event) => {
          writeLog("dialog cancel", {
            cancelable: event.cancelable,
            preventRequested: preventCancel.checked
          });

          if (preventCancel.checked) {
            event.preventDefault();
            writeLog("本次关闭请求已阻止");
          }
        });

        dialog.addEventListener("close", () => {
          writeLog("dialog close", {
            returnValue: dialog.returnValue,
            open: dialog.open
          });
          restoreDialogFocus();
        });
      }

      if (supportsPopover) {
        apiToggleButton.addEventListener("click", () => {
          manualNote.togglePopover();
          const openAfterToggle =
            manualNote.matches(":popover-open");
          writeLog("调用 togglePopover()", { openAfterToggle });
        });

        for (const popover of [autoHelp, manualNote]) {
          popover.addEventListener("beforetoggle", (event) => {
            writeLog("popover beforetoggle", {
              id: popover.id,
              oldState: event.oldState,
              newState: event.newState
            });
          });

          popover.addEventListener("toggle", (event) => {
            writeLog("popover toggle", {
              id: popover.id,
              oldState: event.oldState,
              newState: event.newState,
              open: popover.matches(":popover-open")
            });
          });
        }
      } else {
        for (const control of popoverControls) {
          control.hidden = true;
        }
        autoHelp.removeAttribute("popover");
        manualNote.removeAttribute("popover");
        writeLog("Popover 不受支持，帮助正文保持普通可见");
      }

      backgroundAction.addEventListener("click", () => {
        backgroundCount += 1;
        backgroundAction.textContent = `背景操作计数：${backgroundCount}`;
        writeLog("背景按钮被操作", { backgroundCount });
      });

      writeLog("页面初始化完成");
    </script>
  </body>
</html>
```

### 6.3 打开方法

任选一种方式：

```bash
open market-learning/practice/html-12-native-interactive/native-elements-observer.html
```

或在浏览器中使用“打开文件”。本案例没有请求外部资源，也没有模块脚本，可以直接通过 `file://` 观察。

### 6.4 操作步骤

1. 打开页面，记录“能力检测”文字；
2. 依次展开三个规则，检查同组是否只保留一个 `open`；
3. 用键盘聚焦 `summary`，按 Enter 或 Space 切换；
4. 在 Elements 中观察 `open` 的添加和移除；
5. 用 `show()` 打开非模态 dialog，再点击“背景操作计数”；
6. 关闭后用 `showModal()` 打开，尝试再次点击背景按钮；
7. 模态打开时检查 `document.activeElement.id`；
8. 分别用“取消”“确认”和脚本 `close("script")` 关闭；
9. 打开模态框后按 Esc，比较 `cancel` 与 `close` 日志；
10. 勾选“暂时阻止 Esc”，再次按 Esc，确认 dialog 保持打开；
11. 关闭后重新打开，分别执行“禁用本次入口并关闭”和“删除本次入口并关闭”；
12. 确认无效入口没有吞掉焦点，页面主标题获得焦点；
13. 打开 auto popover，点击页面外部或按 Esc；
14. 打开 manual popover，点击页面外部，确认它保持显示；
15. 用 show/hide invoker 和 `togglePopover()` 改变 manual 状态；
16. popover 打开时操作背景按钮，证明它是非模态；
17. 在 Network 面板确认没有预约或保存请求。

### 6.5 预期结果

- 基础 details 可以通过鼠标和键盘切换；
- 支持 `details[name]` 时，同组最多一个打开；
- 不支持 `name` 但支持 `toggle` 时，脚本回退维持本案例互斥；
- `name` 与 `toggle` 都不支持时，内容仍可独立展开，不承诺互斥；
- `toggle` 日志发生在状态改变后；
- `show()` 打开时背景按钮仍可操作；
- `showModal()` 打开时同一文档背景无法操作；
- 模态打开后焦点位于 dialog 内的安全操作；
- Esc 先产生 `cancel`，未阻止时随后产生 `close`；
- 阻止 `cancel` 后 dialog 保持打开，不产生本次 `close`；
- `method="dialog"` 的按钮值分别产生 `"cancel"` 和 `"confirmed"`；
- `close("script")` 产生 `"script"`；
- 每次打开前旧 `returnValue` 被清空；
- 正常关闭回到原入口；
- 原入口被禁用或删除时回到页面主标题；
- auto popover 可以轻触关闭；
- manual popover 不因外部点击自动关闭；
- popover 显示时位于顶层，但背景按钮仍可操作；
- 不支持 Popover 时，控制按钮隐藏，帮助正文作为普通内容可见；
- Network 没有业务请求。

### 6.6 失败证据

使用下面模板记录，不要只写“弹窗有问题”：

```text
文件路径：
浏览器与版本：
能力检测结果：
操作入口：
调用方式 show/showModal/invoker/API：
open 或 :popover-open：
document.activeElement：
背景按钮是否可操作：
toggle oldState/newState：
cancel 是否发生：
cancel.defaultPrevented：
close 是否发生：
returnValue：
入口 isConnected/disabled：
最终焦点：
Network 请求数：
与预期不一致：
```

典型失败：

- 把 `open="false"` 当成关闭；
- 同一命名组写了多个初始 `open`；
- dialog 已经非模态打开，又直接调用 `showModal()`；
- 忘记清空 `returnValue`，Esc 后仍看到上次的 `"confirmed"`；
- 只调用已删除入口的 `focus()`，页面焦点落到不明确位置；
- 期待 manual popover 点击外部后自动关闭；
- popover 背景仍可操作，却误判实现坏了；
- 不支持 Popover 时既隐藏帮助又保留无效按钮。

### 6.7 渐进扩展：记录状态而不复制状态

在观察器中增加一个状态表：

```html
<dl id="state-view">
  <dt>当前 details</dt>
  <dd id="details-state">尚未观察</dd>
  <dt>dialog</dt>
  <dd id="dialog-state">closed</dd>
  <dt>auto popover</dt>
  <dd id="popover-state">closed</dd>
</dl>
```

事件发生时读取原生事实：

```js
const detailsState = document.querySelector("#details-state");
const dialogState = document.querySelector("#dialog-state");
const popoverState = document.querySelector("#popover-state");

function updateNativeStateView() {
  const openRule = detailsGroup.find((item) => item.open);
  detailsState.textContent = openRule?.id ?? "全部关闭";
  dialogState.textContent = dialog.open ? "open" : "closed";
  popoverState.textContent = supportsPopover &&
    autoHelp.matches(":popover-open")
    ? "open"
    : "closed";
}
```

把 `updateNativeStateView()` 放到对应事件末尾，而不是维护三份新的 `isOpen` 变量。扩展后的通过标准是：无论通过键盘、invoker、API、Esc 还是轻触关闭，状态表都与浏览器原生状态一致。

## 7. 邻里集市集成案例

### 7.1 案例目标

本案例把三种机制放进同一张商品卡：

- 规则披露：`details` 命名组；
- 价格帮助：`popover="auto"`；
- 预约确认：`dialog.showModal()`；
- 不支持 `details[name]`：脚本维持互斥；
- 不支持 Popover：价格说明作为普通正文可见；
- 不支持 dialog：内联预约表单保持可操作；
- 取消预约：焦点回到预约按钮；
- 确认预约：按钮被禁用，焦点回到商品标题；
- dialog 打开期间商品卡被删除：焦点回到页面主标题；
- 预约状态：只在当前 JavaScript 对象中存在，刷新即丢失。

### 7.2 文件位置

保存为：

```text
market-learning/practice/html-12-native-interactive/neighbor-market-reservation.html
```

### 7.3 完整文件：规则、预约与价格帮助

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>商品预约演示 · 邻里集市</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, sans-serif;
      }

      body {
        background: #f3f6f4;
        color: #20332a;
        line-height: 1.6;
        margin: 0;
      }

      main {
        margin: 2rem auto;
        max-width: 58rem;
        padding: 0 1rem;
      }

      .listing {
        background: #ffffff;
        border: 1px solid #9daf9f;
        border-radius: 0.75rem;
        padding: 1.5rem;
      }

      .price-row,
      .actions {
        align-items: center;
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      button,
      select {
        font: inherit;
        padding: 0.55rem 0.8rem;
      }

      button[disabled] {
        cursor: not-allowed;
        opacity: 0.65;
      }

      details {
        border-block-start: 1px solid #c3cec7;
        padding-block: 0.7rem;
      }

      summary {
        cursor: pointer;
        font-weight: 700;
      }

      dialog {
        border: 2px solid #285c43;
        border-radius: 0.5rem;
        max-width: 34rem;
        padding: 1.5rem;
      }

      dialog:not([open]) {
        display: none;
      }

      dialog::backdrop {
        background: rgb(14 29 22 / 58%);
      }

      #price-help {
        background: #fffbea;
        border: 1px solid #9b873d;
        max-width: 24rem;
        padding: 1rem;
      }

      #dialog-fallback {
        background: #f6f0dd;
        border: 1px solid #a48a3f;
        margin-block: 1rem;
        padding: 1rem;
      }

      #event-log {
        background: #e9f0ec;
        min-height: 7rem;
        overflow: auto;
        padding: 1rem;
        white-space: pre-wrap;
      }

      .boundary {
        color: #4e6158;
      }

      :focus-visible {
        outline: 3px solid #b64e18;
        outline-offset: 3px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1 id="page-title" tabindex="-1">邻里集市商品预约演示</h1>
      <p class="boundary">
        本页没有账号、服务端库存锁定、支付或持久化。
        所有预约只存在当前页面内存，刷新后恢复为可预约。
      </p>

      <article
        id="listing-card"
        class="listing"
        data-listing-id="NM-204"
        aria-labelledby="listing-title"
      >
        <h2 id="listing-title" tabindex="-1">胡桃木阅读灯</h2>
        <p>自用两年，灯罩有轻微划痕，线材与开关正常。</p>

        <div class="price-row">
          <strong>价格：39.00 元</strong>
          <button
            id="price-help-button"
            type="button"
            popovertarget="price-help"
          >
            价格怎样计算？
          </button>
        </div>

        <aside id="price-help" popover="auto" aria-labelledby="price-help-title">
          <h3 id="price-help-title">价格说明</h3>
          <p>
            教学数据以整数分保存：3900 分显示为 39.00 元。
            查看本说明不会阻止你继续操作商品页。
          </p>
        </aside>

        <section aria-labelledby="rules-title">
          <h3 id="rules-title">交接规则</h3>

          <details name="market-rules" open>
            <summary>地点规则</summary>
            <p>在小区公共区域当面交接，不进入陌生住所。</p>
          </details>

          <details name="market-rules">
            <summary>核对规则</summary>
            <p>通电测试并核对划痕、线材与开关状态。</p>
          </details>

          <details name="market-rules">
            <summary>预约边界</summary>
            <p>
              本页预约不锁定商品，也不阻止其他人联系卖家。
              真实系统必须由服务端处理权限与并发。
            </p>
          </details>
        </section>

        <p id="reservation-state" role="status">
          当前状态：可预约；尚未记录本页预约。
        </p>

        <div class="actions">
          <button id="reserve-button" type="button" hidden>
            预约当面查看
          </button>
          <button id="background-button" type="button">
            背景操作计数：0
          </button>
        </div>

        <section
          id="dialog-fallback"
          aria-labelledby="fallback-title"
        >
          <h3 id="fallback-title">预约兼容模式</h3>
          <p>
            当前环境不能使用原生模态 dialog，因此预约控件保持内联。
            此回退不会阻止背景，也不会发送网络请求。
          </p>
          <form id="fallback-form">
            <label for="fallback-window">交接时间</label>
            <select id="fallback-window" name="pickupWindow">
              <option value="saturday-morning">周六上午</option>
              <option value="saturday-afternoon">周六下午</option>
              <option value="sunday-morning">周日上午</option>
            </select>
            <button type="submit">记录本页预约</button>
          </form>
        </section>
      </article>

      <dialog
        id="reservation-dialog"
        aria-labelledby="reservation-dialog-title"
        aria-describedby="reservation-dialog-boundary"
      >
        <form method="dialog">
          <h2 id="reservation-dialog-title">确认预约胡桃木阅读灯</h2>
          <p id="reservation-dialog-boundary">
            这只会更新当前页面内存，不会锁定商品或通知卖家。
          </p>

          <label for="pickup-window">选择交接时间</label>
          <select id="pickup-window" name="pickupWindow">
            <option value="saturday-morning">周六上午</option>
            <option value="saturday-afternoon">周六下午</option>
            <option value="sunday-morning">周日上午</option>
          </select>

          <p>
            <button value="cancel" autofocus>继续浏览</button>
            <button value="reserve">确认本页预约</button>
          </p>
        </form>
      </dialog>

      <section aria-labelledby="evidence-title">
        <h2 id="evidence-title">运行证据</h2>
        <p id="feature-report">正在检测能力。</p>
        <pre id="state-output">尚未操作。</pre>
        <pre id="event-log" aria-live="polite">尚无事件。</pre>
      </section>
    </main>

    <script>
      "use strict";

      const marketState = {
        listing: {
          id: "NM-204",
          title: "胡桃木阅读灯",
          priceCents: 3900,
          status: "available"
        },
        reservation: null
      };

      const pageTitle = document.querySelector("#page-title");
      const listingCard = document.querySelector("#listing-card");
      const listingTitle = document.querySelector("#listing-title");
      const reservationState = document.querySelector("#reservation-state");
      const reserveButton = document.querySelector("#reserve-button");
      const backgroundButton = document.querySelector("#background-button");
      const dialogFallback = document.querySelector("#dialog-fallback");
      const fallbackForm = document.querySelector("#fallback-form");
      const fallbackWindow = document.querySelector("#fallback-window");

      const reservationDialog = document.querySelector("#reservation-dialog");
      const pickupWindow = document.querySelector("#pickup-window");

      const priceHelpButton = document.querySelector("#price-help-button");
      const priceHelp = document.querySelector("#price-help");
      const featureReport = document.querySelector("#feature-report");
      const stateOutput = document.querySelector("#state-output");
      const eventLog = document.querySelector("#event-log");
      const ruleDetails = [
        ...document.querySelectorAll('details[name="market-rules"]')
      ];
      const detailsProbe = document.createElement("details");

      const supportsDialog =
        typeof HTMLDialogElement !== "undefined" &&
        "showModal" in HTMLDialogElement.prototype;
      const supportsPopover =
        "popover" in HTMLElement.prototype &&
        "showPopover" in HTMLElement.prototype;
      const supportsDetailsName =
        "name" in detailsProbe;
      const supportsDetailsToggle =
        "ontoggle" in detailsProbe;

      let lastDialogInvoker = null;
      let backgroundCount = 0;
      const logLines = [];

      function writeLog(message, data = {}) {
        logLines.push(
          JSON.stringify({
            message,
            activeElement: document.activeElement?.id || "(无 id)",
            ...data
          })
        );
        eventLog.textContent = logLines.slice(-16).join("\n");
      }

      function renderState() {
        const listing = marketState.listing;
        const reservation = marketState.reservation;
        reservationState.textContent =
          listing.status === "reserved" &&
          reservation?.status === "pending"
          ? `当前状态：本页已预约，交接时间 ${reservation.pickupWindow}。`
          : "当前状态：可预约；尚未记录本页预约。";

        stateOutput.textContent = JSON.stringify(
          {
            ...marketState,
            teachingBoundary: {
              inMemoryOnly: true,
              persisted: false,
              serverLock: false,
              refreshResetsState: true
            }
          },
          null,
          2
        );
      }

      function canReceiveFocus(element) {
        return (
          element instanceof HTMLElement &&
          element.isConnected &&
          !element.matches(":disabled") &&
          !element.closest("[hidden], [inert]")
        );
      }

      function restoreReservationFocus() {
        const candidates = [lastDialogInvoker, listingTitle, pageTitle];
        const target = candidates.find(canReceiveFocus);

        if (target) {
          target.focus({ preventScroll: true });
        }

        writeLog("预约流程焦点恢复", {
          invokerConnected: Boolean(lastDialogInvoker?.isConnected),
          invokerDisabled: Boolean(lastDialogInvoker?.matches(":disabled")),
          fallbackTarget: target?.id || "(无)"
        });
      }

      function applyInMemoryReservation(windowValue, source) {
        marketState.listing.status = "reserved";
        marketState.reservation = {
          status: "pending",
          listingId: marketState.listing.id,
          pickupWindow: windowValue
        };

        reserveButton.disabled = true;
        reserveButton.textContent = "本页已预约";
        renderState();
        writeLog("内存预约已更新", {
          source,
          pickupWindow: windowValue,
          persisted: false
        });
      }

      featureReport.textContent = [
        `details[name]：${
          supportsDetailsName
            ? "支持"
            : supportsDetailsToggle
              ? "toggle 脚本回退"
              : "保留独立展开"
        }`,
        `dialog.showModal：${supportsDialog ? "支持" : "内联回退"}`,
        `Popover API：${supportsPopover ? "支持" : "正文回退"}`
      ].join("；");

      for (const item of ruleDetails) {
        item.addEventListener("toggle", (event) => {
          writeLog("规则 toggle", {
            summary: item.querySelector("summary")?.textContent.trim(),
            open: item.open,
            oldState: event.oldState ?? "(未提供)",
            newState: event.newState ?? "(未提供)"
          });

          if (!supportsDetailsName && supportsDetailsToggle && item.open) {
            for (const other of ruleDetails) {
              if (other !== item) {
                other.open = false;
              }
            }
          }
        });
      }

      if (supportsDialog) {
        dialogFallback.hidden = true;
        reserveButton.hidden = false;

        reserveButton.addEventListener("click", (event) => {
          if (marketState.listing.status === "reserved") {
            return;
          }

          lastDialogInvoker = event.currentTarget;
          reservationDialog.returnValue = "";
          reservationDialog.showModal();
          writeLog("预约 dialog 已模态打开");
        });

        reservationDialog.addEventListener("cancel", () => {
          writeLog("收到 cancel，允许浏览器关闭");
        });

        reservationDialog.addEventListener("close", () => {
          const result = reservationDialog.returnValue;
          writeLog("预约 dialog 已关闭", { returnValue: result });

          if (result === "reserve") {
            applyInMemoryReservation(pickupWindow.value, "dialog");
          }

          restoreReservationFocus();
        });
      } else {
        fallbackForm.addEventListener("submit", (event) => {
          event.preventDefault();
          applyInMemoryReservation(fallbackWindow.value, "inline-fallback");

          const fallbackSubmit = fallbackForm.querySelector(
            'button[type="submit"]'
          );
          fallbackSubmit.disabled = true;
          fallbackSubmit.textContent = "本页已预约";
          listingTitle.focus({ preventScroll: true });
        });
      }

      if (supportsPopover) {
        priceHelp.addEventListener("beforetoggle", (event) => {
          writeLog("价格帮助 beforetoggle", {
            oldState: event.oldState,
            newState: event.newState
          });
        });

        priceHelp.addEventListener("toggle", (event) => {
          writeLog("价格帮助 toggle", {
            oldState: event.oldState,
            newState: event.newState,
            open: priceHelp.matches(":popover-open")
          });
        });
      } else {
        priceHelpButton.hidden = true;
        priceHelp.removeAttribute("popover");
        writeLog("Popover 不受支持，价格帮助保持普通可见");
      }

      backgroundButton.addEventListener("click", () => {
        backgroundCount += 1;
        backgroundButton.textContent = `背景操作计数：${backgroundCount}`;
        writeLog("背景商品操作成功", { backgroundCount });
      });

      listingCard.addEventListener("market:removed-for-test", () => {
        writeLog("商品卡已在故障演练中移除");
      });

      renderState();
      writeLog("页面初始化完成", {
        inMemoryOnly: true,
        priceCents: marketState.listing.priceCents
      });
    </script>
  </body>
</html>
```

### 7.4 执行顺序

页面初始化时：

1. 创建 `available` 商品，尚未生成 Reservation；
2. 检测 `details[name]`、dialog 与 Popover；
3. 能用 dialog 时隐藏内联回退并显示预约按钮；
4. 不能用 dialog 时保留内联表单；
5. 能用 Popover 时由浏览器隐藏价格帮助，invoker 负责打开；
6. 不能用 Popover 时隐藏无效 invoker，说明正文保持普通可见；
7. 预约状态输出明确包含 `persisted: false` 和 `serverLock: false`。

打开 dialog 时：

1. 保存实际入口 `event.currentTarget`；
2. 清空上次 `returnValue`；
3. 调用 `showModal()`；
4. 浏览器把 dialog 加入顶层；
5. 同一文档中的商品背景变为 inert；
6. `autofocus` 把初始焦点放到“继续浏览”。

关闭时：

1. Esc 先产生 `cancel`，然后在未阻止时关闭；
2. `method="dialog"` 按钮直接产生 `"cancel"` 或 `"reserve"`；
3. `close` 中读取 `returnValue`；
4. 只有 `"reserve"` 更新内存对象；
5. 确认后预约按钮被禁用；
6. 禁用入口不能接收焦点，因此回退到商品标题；
7. 取消时入口仍可操作，因此焦点回到预约按钮；
8. 若商品卡在 dialog 打开期间被删除，商品标题也断开连接，最终回退到页面主标题。

### 7.5 打开与测试

```bash
open market-learning/practice/html-12-native-interactive/neighbor-market-reservation.html
```

测试正常路径：

1. 展开三项规则，检查互斥与 `toggle` 日志；
2. 打开价格帮助；
3. 在帮助显示时操作背景计数按钮，确认 popover 非模态；
4. 点击价格帮助外部，确认 auto popover 关闭；
5. 打开预约 dialog；
6. 尝试操作背景计数按钮，确认模态时不可操作；
7. 按 Esc，确认状态仍是 `available`，焦点回到预约按钮；
8. 再次打开，选择时间并确认；
9. 检查状态变为 `reserved`；
10. 检查预约按钮被禁用；
11. 检查焦点位于 `#listing-title`；
12. 刷新页面，确认状态恢复为 `available`；
13. 在 Network 面板确认没有预约请求。

测试入口删除路径：

1. 打开预约 dialog；
2. 在 DevTools Console 执行：

```js
const card = document.querySelector("#listing-card");
card.dispatchEvent(new Event("market:removed-for-test"));
card.remove();
```

3. 按 Esc 或激活 dialog 的“继续浏览”；
4. 确认 `#listing-card` 和原入口都已断开；
5. 检查最终焦点是 `#page-title`；
6. 刷新恢复页面，避免在破坏后的 DOM 上继续其他验收。

### 7.6 预期结果

- 规则内容无脚本也能通过 details 阅读；
- 支持 `name` 时同名组原生互斥；
- 不支持 `name` 但支持 `toggle` 时由脚本维持互斥；
- 两者都不支持时保留独立展开，不把内容隐藏或声称互斥；
- 价格帮助在支持环境中是 auto popover；
- 价格帮助显示时背景仍可操作；
- 不支持 Popover 时价格说明直接可见，不形成空白功能；
- 预约 dialog 通过 `showModal()` 阻止背景交互；
- Esc 取消不改变预约对象；
- “继续浏览”产生 `"cancel"`；
- “确认本页预约”产生 `"reserve"`；
- 只有 `"reserve"` 改变 `marketState.reservation`；
- 确认后入口禁用，焦点回到商品标题；
- 入口和商品卡都删除后，焦点回到页面主标题；
- 不支持 dialog 时内联表单仍能更新相同内存状态；
- 所有状态输出都说明未持久化、未锁定；
- 刷新后预约丢失；
- Network 没有预约、支付或保存请求。

### 7.7 失败与恢复记录

```text
文件路径：
浏览器与版本：
details[name] 检测：
dialog 检测：
Popover 检测：
操作入口：
打开方式：
打开后 activeElement：
背景能否操作：
cancel 日志：
close 日志：
returnValue：
关闭前 listing.status / reservation.status：
关闭后 listing.status / reservation.status：
入口 isConnected：
入口 disabled：
商品标题 isConnected：
最终 activeElement：
priceCents：
persisted/serverLock：
Network 请求数：
刷新后状态：
修复动作：
复验结果：
未验证环境：
```

有效证据应同时包含：

- 一次取消和一次确认；
- 一次正常入口恢复；
- 一次确认后禁用入口回退；
- 一次删除商品卡后的页面级回退；
- 一次 popover 打开时背景仍可操作；
- 一次 dialog 模态打开时背景不可操作；
- 一次刷新后状态丢失。

### 7.8 渐进增强边界

这个案例的基础层不是一片空白：

- `details` 内容一直存在；
- 价格说明在旧浏览器中退化成普通 aside；
- 预约在旧 dialog 环境中退化成内联表单；
- 没有 JavaScript 时，规则和兼容说明仍可读；
- 支持原生能力时，脚本只切换到更合适的交互模式；
- 无论哪条路径，都不声称服务端已接受预约。

真实系统还需要：

```text
登录身份
  → 资源访问授权
  → 服务端读取商品当前状态
  → 事务或原子条件更新
  → 冲突与幂等处理
  → 成功响应和服务端预约 ID
  → 页面根据响应更新
```

本课的内存对象不能替代这些步骤。

## 8. 常见错误与排查路径

### 8.1 明确错误：用 CSS 强行显示关闭的 dialog

错误代码：

```css
/* 错误案例：只制造视觉可见，不建立 dialog 打开状态 */
dialog {
  display: block;
}
```

或：

```js
// 错误案例
reservationDialog.style.display = "block";
```

可观察现象：

- `reservationDialog.open` 仍为 `false`；
- dialog 没有通过 `showModal()` 进入顶层；
- 背景没有变为 inert；
- 初始焦点流程没有建立；
- Esc、`cancel`、`close` 与焦点恢复链不完整；
- 辅助技术不会把它当成一个由正确生命周期打开的模态 dialog。

根因：CSS 只改变绘制，不调用 dialog 算法。

最小恢复：

```js
if (!reservationDialog.open) {
  reservationDialog.showModal();
}
```

复验：

```js
console.log({
  open: reservationDialog.open,
  modal: reservationDialog.matches(":modal"),
  activeElement: document.activeElement?.id
});
```

同时尝试背景按钮。只有外观变暗不算通过。

### 8.2 明确错误：把 popover 当成模态框

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

### 8.3 `open="false"` 仍然打开

- **现象**：details 或 dialog 仍处于 open 属性存在状态；
- **证据**：Elements 中仍有 `open="false"`；
- **原因**：`open` 是布尔属性；
- **修复**：移除属性，或对 details 设置 `.open = false`，对 dialog 使用 `.close()`；
- **复验**：属性消失，`.open === false`。

dialog 尤其应优先调用 `close()`，因为直接移除 `open` 可能绕开正常关闭事件和焦点流程。

### 8.4 同组多个初始 `open`

错误：

```html
<details name="rules" open>...</details>
<details name="rules" open>...</details>
```

规范要求同组不能有多个打开项。实现通常只保留源顺序中第一个为打开，但作者不应依赖浏览器修正误导性标记。

修复：只保留一个初始 `open`，或全部初始关闭。

### 8.5 无条件使用 `details[name]`

- **现象**：旧浏览器允许多个规则同时打开；
- **证据**：基础 details 可用，但 `"name" in document.createElement("details")` 为 `false`；
- **原因**：`name` 晚于基础 details；
- **修复**：接受非互斥回退，或只在不支持时添加小型 `toggle` 互斥脚本；
- **复验**：必要内容始终可读，互斥是否存在不会阻止任务。

### 8.6 把 `toggle` 次数当成每次赋值次数

错误测试：

```js
rule.open = true;
rule.open = false;
rule.open = true;
// 错误期待：一定收到三次 toggle
```

快速连续状态变化可能合并通知。应断言最终 `.open` 和最终事件状态，不把中间命令数量等同于事件数量。

### 8.7 dialog 模式冲突

错误：

```js
reservationDialog.show();
reservationDialog.showModal();
```

第二次调用会因 dialog 已非模态打开而抛 `InvalidStateError`。

排查：

```js
console.log(reservationDialog.open);
```

恢复：先明确产品需要哪种模式。需要改变模式时正常 `close()`，等待关闭流程完成，再以正确模式重新打开；不要依赖异常作为分支控制。

### 8.8 直接切 `dialog.open`

错误：

```js
reservationDialog.open = true;
```

这最多建立非模态 open 状态，不会获得 `showModal()` 的顶层和背景 inert。关闭时直接写 `false` 也可能绕过应有的 `close` 事件。

恢复：用 `show()`、`showModal()` 和 `close()` 表达生命周期。

### 8.9 忘记重置 `returnValue`

复现：

1. 第一次点击“确认”，`returnValue === "reserve"`；
2. 第二次打开；
3. 按 Esc；
4. 代码仍读到旧的 `"reserve"`；
5. 页面错误地再次确认。

修复：

```js
reservationDialog.returnValue = "";
reservationDialog.showModal();
```

复验：Esc 后结果为空字符串，预约状态不变。

### 8.10 混淆“取消按钮”和 `cancel` 事件

`method="dialog"` 中的取消按钮只是以 `value="cancel"` 提交并关闭。Esc 等关闭请求才触发 `cancel` 事件。监听日志时应区分：

```text
取消按钮：submit → close，returnValue="cancel"
Esc：cancel → 未阻止则 close，returnValue 通常保持本轮当前值
close("x")：直接关闭 → close，returnValue="x"
```

不要把所有非确认关闭都写成一定经过 `cancel`。

### 8.11 无理由阻止 Esc

- **现象**：键盘用户无法退出；
- **证据**：`cancel` 监听器始终调用 `preventDefault()`；
- **原因**：把“必须确认”误解成“不能取消”；
- **修复**：默认允许关闭并保留可见取消按钮；只有确实会丢失重要输入时才阻止并解释；
- **复验**：Esc 和触摸可用的取消按钮都能退出。

### 8.12 关闭后只聚焦旧入口

错误：

```js
reservationDialog.addEventListener("close", () => {
  lastDialogInvoker.focus();
});
```

如果入口被禁用或删除，焦点恢复失败。最小修复是按“入口 → 局部标题 → 页面标题”检查 `isConnected`、`:disabled`、`hidden` 和 `inert`。

复验必须包含：

- 正常入口；
- `lastDialogInvoker.disabled = true`；
- `lastDialogInvoker.remove()`；
- 删除整个商品卡。

### 8.13 把 `z-index` 当顶层

普通元素即使 `z-index: 999999`，仍可能受祖先堆叠上下文、裁剪和变换影响，也不会自动获得模态、关闭和焦点行为。应选择 dialog/popover 的原生顶层入口，而不是不断增大数字。

### 8.14 无条件调用 Popover API

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

### 8.15 同时维护自造 popover 布尔值

错误：

```js
let priceHelpOpen = false;
```

声明式 invoker、外部点击、Esc 和 API 都可能改变原生状态，自造值容易过期。恢复为：

```js
const priceHelpOpen = priceHelp.matches(":popover-open");
```

在事件中读取真实状态，而不是推测。

### 8.16 manual popover 没有关闭方式

- **现象**：内容一直遮挡页面；
- **原因**：manual 不轻触关闭，却只提供了 show；
- **修复**：提供明确 hide invoker 或调用 `hidePopover()`；
- **复验**：鼠标、键盘和触摸都能到达关闭入口。

### 8.17 不支持时把正文一起隐藏

错误回退：

```html
<aside id="price-help" popover hidden>价格说明</aside>
```

`hidden` 会让旧浏览器也隐藏必要正文，并可能与 popover 显示机制冲突。更稳妥的基线是让 `popover` 在不支持环境中被忽略，正文自然显示；检测失败后只隐藏无效 invoker。

## 9. 课后题

### 9.1 理解题

1. `details open="false"` 为什么仍然打开？
2. `toggle` 发生时，状态改变了吗？
3. 相同 `name` 的 details 为什么不一定适合所有规则列表？
4. `show()` 和 `showModal()` 的背景交互有什么区别？
5. 进入顶层是否必然意味着模态？
6. 为什么每次打开 dialog 前要清空 `returnValue`？
7. 取消按钮为什么不一定触发 `cancel` 事件？
8. `cancel` 和 `close` 哪个可以阻止？
9. `method="dialog"` 会把表单发送到服务器吗？
10. popover 打开时为什么还能操作背景？
11. auto 与 manual 的轻触关闭有什么区别？
12. 为什么基础 `details` 可用时仍要检测 `details[name]`？

<details>
<summary>查看理解题答案</summary>

1. `open` 是布尔属性，只要存在就为真；字符串 `"false"` 没有关闭含义。
2. 已经改变。`toggle` 是后置通知，应读取 `.open` 或事件的新状态。
3. 互斥会阻止用户同时展开并比较多段内容，可能增加操作成本。
4. `show()` 非模态，背景可操作且不进入顶层；`showModal()` 进入顶层并使同一文档背景 inert。
5. 不必然。popover 进入顶层但始终非模态。
6. 无参数关闭或 Esc 不保证清除旧结果，旧值可能被误当成本轮选择。
7. `method="dialog"` 的取消按钮走表单关闭流程；`cancel` 对应 Esc、返回等关闭请求。
8. `cancel` 可取消，`close` 不可取消。
9. 不会。它关闭 dialog 并设置结果，不发送表单。
10. Popover API 的语义是非模态；顶层只解决绘制层级，不阻塞背景。
11. auto 支持外部点击或 Esc 等轻触关闭；manual 需要明确 hide 调用。
12. `name` 是比基础 details 更新的独立能力，旧实现可能只支持普通展开。

</details>

### 9.2 状态判断题

判断操作后的主要状态：

| 操作 | `open`/显示状态 | 顶层 | 背景可操作 |
| --- | --- | --- | --- |
| 初始关闭 details | ? | ? | ? |
| `details.open = true` | ? | ? | ? |
| `dialog.show()` | ? | ? | ? |
| `dialog.showModal()` | ? | ? | ? |
| auto popover 显示 | ? | ? | ? |
| manual popover 显示 | ? | ? | ? |

<details>
<summary>查看状态判断答案</summary>

| 操作 | `open`/显示状态 | 顶层 | 背景可操作 |
| --- | --- | --- | --- |
| 初始关闭 details | `open === false` | 否 | 是 |
| `details.open = true` | `open === true` | 否 | 是 |
| `dialog.show()` | `open === true` | 否 | 是 |
| `dialog.showModal()` | `open === true` | 是 | 否，同一文档背景 inert |
| auto popover 显示 | `:popover-open` | 是 | 是 |
| manual popover 显示 | `:popover-open` | 是 | 是 |

</details>

### 9.3 事件顺序题

分别写出典型事件顺序：

1. 模态 dialog 打开后按 Esc，未阻止；
2. 模态 dialog 打开后按 Esc，`cancel` 中阻止；
3. 点击 `method="dialog"` 中 `value="reserve"` 的按钮；
4. auto popover 从隐藏变为显示。

<details>
<summary>查看事件顺序答案</summary>

1. `cancel` → dialog 关闭 → `close`；
2. `cancel` → `preventDefault()` → 保持打开，不发生本次 `close`；
3. 表单以 dialog 方法处理 → `returnValue` 设为 `"reserve"` → 关闭 → `close`；不要求经过 `cancel`；
4. `beforetoggle(closed→open)` → 状态显示并进入顶层 → `toggle(closed→open)`。

浏览器可能合并快速连续的后置切换通知。答案用于理解阶段，不应用事件次数替代最终状态断言。

</details>

### 9.4 焦点恢复题

关闭预约 dialog 时有三个候选目标：

```text
预约按钮：已禁用，但仍连接
商品标题：tabindex="-1"，仍连接且可见
页面标题：tabindex="-1"，仍连接且可见
```

应选择哪个？如果商品卡也被删除呢？

答案：已禁用按钮不能作为恢复目标，应聚焦商品标题；商品卡删除后商品标题断开连接，应聚焦页面标题。判断不能只看变量是否非空，还要检查连接、禁用、隐藏和 inert 状态。

### 9.5 选型题

为下列需求选择 details、modal dialog、non-modal dialog 或 popover：

```text
商品缺陷说明
必须确认的预约
价格换算帮助
可持续打开的页面检查器
删除商品确认
三条需要同时比较的交接规则
```

<details>
<summary>查看选型答案</summary>

- 商品缺陷说明：details；
- 必须确认的预约：`dialog.showModal()`；
- 价格换算帮助：auto popover；
- 可持续打开且背景仍可操作的检查器：`dialog.show()`，也可依据内容语义评估 manual popover；
- 删除商品确认：`dialog.showModal()`；
- 需要同时比较的规则：多个普通 details，不使用互斥 `name`。

</details>

## 10. 实践练习

### 10.1 基础：规则披露观察页

文件位置：

```text
practice/html-12-native-interactive/basic-disclosure.html
```

要求：

- 创建三个带明确 `summary` 的 details；
- 至少一个初始 `open`；
- 三个元素使用相同非空 `name`；
- 只允许一个初始 `open`；
- 记录每次 `toggle` 的 ID、`.open`、`oldState` 和 `newState`；
- 用 Elements 证明 `open` 属性随操作变化；
- 用键盘完成全部展开操作；
- 检测 `details[name]`；
- 不支持时允许独立展开或仅添加互斥回退；
- 写一段说明：当前任务为什么适合或不适合互斥。

答案标准：

- `summary` 是父 details 的第一个摘要子元素；
- 没有 `open="false"`；
- 日志读取原生状态，不维护另一份 `isOpen`；
- 快速切换测试不要求事件次数等于赋值次数；
- 即使 `name` 不受支持，全部规则仍可读取；
- 能解释互斥的空间收益和比较成本。

### 10.2 进阶：可恢复的预约确认

文件位置：

```text
practice/html-12-native-interactive/advanced-reservation.html
```

要求：

- 使用 `dialog.showModal()` 打开预约确认；
- dialog 有可见标题、说明、取消和确认按钮；
- 安全操作使用 `autofocus`；
- 表单使用 `method="dialog"`；
- 取消与确认按钮具有不同 `value`；
- 每次打开前清空 `returnValue`；
- 分别记录 `cancel` 与 `close`；
- 默认允许 Esc 关闭；
- 确认后只更新内存对象；
- 确认后禁用入口，焦点回到商品标题；
- 取消后焦点回到原入口；
- 入口删除后焦点回到稳定页面标题；
- 不支持 dialog 时显示内联表单；
- Network 没有请求；
- 刷新后预约丢失。

答案标准：

- `showModal()` 打开时背景按钮不可操作；
- 不通过 CSS 或直接写 `.open` 模拟模态；
- `"reserve"` 才更新内存状态；
- Esc 不会继承上次 `"reserve"`；
- 焦点函数检查 `isConnected`、`:disabled`、`hidden`、`inert`；
- 已禁用或删除入口不会成为最终活动元素；
- 回退路径仍能记录本页状态；
- 页面明确显示 `persisted: false` 和 `serverLock: false`。

### 10.3 故障注入：模式、结果与焦点

在进阶练习副本中逐个制造故障，每次复验后恢复：

1. 用 `dialog { display: block; }` 代替 `showModal()`；
2. 第一次确认后，删除“打开前清空 `returnValue`”；
3. 关闭前禁用入口；
4. 关闭前删除入口；
5. 关闭前删除整张商品卡。

记录：

```text
故障名称：
注入代码：
复现步骤：
dialog.open：
:modal：
背景能否操作：
returnValue：
入口 isConnected/disabled：
最终 activeElement：
根因：
最小修复：
复验结果：
```

答案标准：

- CSS 可见故障用 `open === false`、`:modal === false` 和背景仍可操作证明；
- 旧结果故障能复现 Esc 后误读 `"reserve"`；
- 禁用入口回到局部标题；
- 删除入口但保留卡片时回到局部标题；
- 删除卡片时回到页面标题；
- 修复不通过吞异常、强制聚焦 body 或删除验收步骤实现。

### 10.4 故障注入：把 popover 当模态框

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

### details 与 summary

- [ ] 每个 details 都有明确的第一个 summary；
- [ ] `open` 被当作布尔属性；
- [ ] `.open` 与 Elements 中属性变化一致；
- [ ] 键盘可以切换披露；
- [ ] `toggle` 在状态改变后记录；
- [ ] 不以 `toggle` 次数证明每次快速中间赋值；
- [ ] 命名组最多一个初始 `open`；
- [ ] `details[name]` 有独立特性检测；
- [ ] 互斥确实符合阅读任务；
- [ ] 不支持命名组时内容仍可读取。

### dialog 模式与结果

- [ ] 能解释关闭、非模态、模态三种状态；
- [ ] `show()` 允许背景操作；
- [ ] `showModal()` 进入顶层并阻止同一文档背景；
- [ ] 没有通过 CSS 或直接 `.open = true` 模拟模态；
- [ ] 每次打开前重置 `returnValue`；
- [ ] `close(value)` 的结果可观察；
- [ ] `method="dialog"` 没有网络提交；
- [ ] 取消与确认结果不同；
- [ ] `cancel` 可取消且不冒泡；
- [ ] `close` 不可取消且不冒泡；
- [ ] 默认保留 Esc 和可见关闭按钮；
- [ ] 模式冲突不会产生未处理异常。

### 焦点

- [ ] 打开后焦点进入 dialog；
- [ ] 初始焦点落在安全、合理的操作；
- [ ] 正常取消后回到原入口；
- [ ] 确认后入口禁用时回到局部标题；
- [ ] 入口删除时有局部回退；
- [ ] 商品卡删除时回到页面级稳定目标；
- [ ] 回退目标使用 `tabindex="-1"` 而不污染普通 Tab 顺序；
- [ ] 最终焦点用 `document.activeElement` 取证；
- [ ] 没有只调用一个可能失效的 `.focus()`。

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

### 邻里集市边界

- [ ] 规则披露、预约 dialog、价格 popover 都进入同一案例；
- [ ] 价格使用整数分 `3900`；
- [ ] 预约只更新明确的内存对象；
- [ ] 页面显示未持久化、未锁定；
- [ ] Network 没有预约或支付请求；
- [ ] 刷新后状态恢复为 `available`；
- [ ] 没有声称客户端 dialog 提供并发控制；
- [ ] 服务端身份、授权、事务和冲突责任已列出。

### 运行证据

```text
个人文件路径：
打开命令或方式：
浏览器与版本：
details 键盘记录：
details[name] 检测：
toggle 日志：
show 背景证据：
showModal 背景证据：
cancel/close 顺序：
method=dialog returnValue：
正常焦点恢复：
禁用入口焦点恢复：
删除入口焦点恢复：
删除商品卡焦点恢复：
auto/manual 对照：
beforetoggle/toggle 日志：
Popover 回退：
dialog 回退：
Network 面板：
刷新后内存状态：
未验证浏览器/辅助技术：
```

完成标准不是“三个浮层都能看见”，而是能解释每个机制为什么适合当前任务，用状态、事件、背景交互和焦点证明模式正确，并在能力缺失或入口失效时保留可完成路径。

## 12. 常见问题

### Q1：`details` 可以做导航菜单吗？

它表示披露补充信息或控件，不是通用菜单语义。简单站点导航应使用 `nav` 和链接；需要完整菜单键盘模式时要按对应组件语义和交互实现，不能只因 details 能展开就替代。

### Q2：为什么不用 JavaScript 给 `summary` 切 `aria-expanded`？

原生 details 已维护自己的展开语义和状态。重复手工维护容易失同步。只有自造组件才需要承担完整状态、键盘和 ARIA 责任；本课不重造 details。

### Q3：命名 details 组是否等于 ARIA 手风琴？

它提供原生互斥披露，但产品仍要判断内容组织、标题和比较需求。不要仅为了“手风琴外观”忽略用户可能需要同时查看多项。

### Q4：`toggle` 能阻止 details 打开吗？

不能。它在状态改变后触发。若业务不允许访问某内容，应从权限和内容提供层解决，不要先显示再依赖后置事件藏回去。

### Q5：`dialog.open = true` 和 `show()` 一样吗？

都可能形成非模态可见状态，但直接切属性不执行完整的 dialog 打开步骤，不是推荐生命周期。使用 `show()` 和 `close()` 可获得一致事件与焦点流程。

### Q6：`showModal()` 会锁住整个浏览器吗？

不会。它使 dialog 所在文档的其他内容 inert。若位于 iframe，只阻塞该 iframe 文档；浏览器界面和父文档不因此全部锁定。

### Q7：可以只提供 Esc，不放关闭按钮吗？

不可以作为稳健方案。触摸设备可能没有物理 Esc，用户也需要可发现的退出方式。每个 dialog 都应有明确按钮。

### Q8：`cancel` 中调用 `preventDefault()` 后，`close` 还会发生吗？

本次关闭请求被阻止时不会因该请求关闭，因此不会产生对应的 `close`。后续按钮或 `close()` 仍可关闭。

### Q9：确认按钮用了 `method="dialog"`，还需要 `preventDefault()` 吗？

不需要为了阻止网络提交而调用；`method="dialog"` 本身不会发送表单。你仍可监听 `submit` 做观察，但不要把它误写成远端保存。

### Q10：为什么 `returnValue` 不是预约状态？

它只是关闭结果字符串，可能为空、过期或由不同关闭方式产生。预约状态还需要商品 ID、时间和服务端结果；本课用明确内存对象承载教学状态。

### Q11：关闭后浏览器不是会自动恢复焦点吗？

原生流程会尽力管理焦点，但动态页面可能在关闭前禁用或删除入口。业务代码必须测试这些变化，并提供有意义的局部和页面级回退。

### Q12：为什么不把焦点永远放到页面标题？

正常情况下回到原入口最符合连续操作。只有入口失效时才逐级回退；每次都跳到页首会让用户丢失位置。

### Q13：popover 可以包含按钮和表单吗？

可以根据内容语义包含交互控件，但它仍非模态。复杂菜单、组合框和其他组件还有各自键盘与无障碍要求，Popover API 只解决显示、顶层和部分调用关系。

### Q14：给 popover 加 `role="dialog"` 会变成模态吗？

不会。ARIA 只改变可访问性语义，不会创造背景 inert、焦点限制或 modal dialog 生命周期。必须先选择正确原生行为。

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

### Q20：内存预约能用于真实商品吗？

不能。它没有身份、授权、服务器当前状态、事务、唯一约束、幂等和冲突处理。刷新丢失只是教学证据，不是业务实现。

## 13. 扩展阅读

资料、规范链接和兼容性说明核验日期：2026-10-10。

- [WHATWG HTML Living Standard：The details element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element)：核对 `summary`、`open`、`name`、互斥组和 `toggle` 合并规则。
- [WHATWG HTML Living Standard：The dialog element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)：核对 `show()`、`showModal()`、`close()`、`returnValue`、关闭事件和焦点步骤。
- [WHATWG HTML Living Standard：The popover attribute](https://html.spec.whatwg.org/multipage/popover.html#the-popover-attribute)：核对 auto/manual、顶层、API、事件和轻触关闭算法。
- [WHATWG HTML Living Standard：Modal dialogs and inert subtrees](https://html.spec.whatwg.org/multipage/interaction.html#modal-dialogs-and-inert-subtrees)：理解 modal dialog 如何阻塞所在文档。
- [MDN：`<details>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details)：快速查阅披露、`name`、`open` 和兼容性。
- [MDN：`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)：复习模态/非模态、关闭机制、初始焦点和无障碍注意事项。
- [MDN：HTMLDialogElement.show()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/show)：核对非模态打开和模式冲突异常。
- [MDN：HTMLDialogElement.showModal()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal)：核对顶层、背景 inert 和兼容性。
- [MDN：HTMLDialogElement.close()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close)：核对可选结果参数和关闭后事件。
- [MDN：HTMLDialogElement.returnValue](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/returnValue)：核对默认空字符串和重置原因。
- [MDN：dialog `cancel` event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/cancel_event)：核对可取消、不冒泡和平台关闭请求。
- [MDN：dialog `close` event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close_event)：核对不可取消、不冒泡和多种关闭来源。
- [MDN：Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)：查阅 invoker 属性、JavaScript API、事件和非模态边界。
- [MDN：`popover` global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/popover)：核对状态值和 HTML 用法。
- [MDN Browser Compatibility Data：details](https://github.com/mdn/browser-compat-data/blob/main/html/elements/details.json)：核对基础 details 与 `name` 的独立支持记录。
- [MDN Browser Compatibility Data：dialog](https://github.com/mdn/browser-compat-data/blob/main/html/elements/dialog.json)：核对基础 dialog 与较新扩展的独立支持记录。
- [MDN Browser Compatibility Data：HTMLElement](https://github.com/mdn/browser-compat-data/blob/main/api/HTMLElement.json)：核对 Popover API、`beforetoggle` 与 `toggle` 的支持记录。
- [W3C WAI-ARIA APG：Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)：理解初始焦点、关闭入口和恢复焦点的设计原则。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对整数分、内存教学状态和服务端边界。

阅读时区分：

- **规范机制**：元素状态、事件顺序、顶层与模态算法；
- **兼容数据**：某项具体子特性从哪些版本开始实现；
- **产品选择**：当前内容应是披露、非模态帮助还是必须处理的确认；
- **运行证据**：目标浏览器、设备、键盘和辅助技术中的真实行为；
- **服务端边界**：前端交互不能提供身份、授权、持久化或并发控制。

## 我现在能做到什么

我能根据任务选择 details、非模态 dialog、模态 dialog 或 popover，使用 `open`、`toggle` 和命名组表达规则披露，使用 `show()`、`showModal()`、`close()`、`returnValue`、`cancel`、`close` 与 `method="dialog"` 完成可观察的确认流程。我也能解释顶层不等于模态，使用 auto/manual popover、invoker 属性、三个 Popover API 和切换事件提供非阻塞帮助，并在原生能力缺失、入口被禁用或节点被删除时保留内容、任务和焦点恢复路径。邻里集市预约仍明确只存在当前页面内存。

## 单元导航

- [上一章：表单、提交与验证](../05-forms-validation.md)
- [返回第六章入口](../06-interactive-dom.md)
- [下一课：DOM 查询、创建与修改](02-dom-query-mutation.md)
- [返回 HTML 模块](../README.md)
