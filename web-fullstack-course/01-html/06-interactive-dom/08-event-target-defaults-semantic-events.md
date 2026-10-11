# 事件目标、默认行为与语义事件

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 区分 target 与 currentTarget、传播与默认行为，并按元素语义选择事件。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `EVT-003`、`EVT-004`、`EVT-005`、`EVT-006`、`EVT-007` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

区分 target 与 currentTarget、传播与默认行为，并按元素语义选择事件。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 EVT-003（target、currentTarget、closest）、EVT-004（preventDefault、stopPropagation、passive）、EVT-005（click、input、change）、EVT-006（submit、invalid）、EVT-007（toggle、close）；
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
用户或脚本产生事件
  → 事件沿捕获、目标、冒泡路径传播
  → 监听器读取 target/currentTarget 并决定是否处理
  → 监听器可以改变传播或取消可取消的默认行为
  → 浏览器执行未被取消的默认行为
```

### 3.2 预备材料 2

```text
注册和移除一个监听器
  → 观察完整传播路径
  → 分开默认行为与传播控制
  → 按事件语义选择 click/input/change/submit/invalid
  → 在稳定祖先上委托动态列表
  → 用 AbortController 统一结束监听生命周期
  → 区分真实输入、合成事件和用户激活
```

## 4. 核心理论

### 4.1 `target` 与 `currentTarget` 回答不同问题

```js
list.addEventListener("click", (event) => {
  console.log(event.target);
  console.log(event.currentTarget);
});
```

- `target`：事件最初分派到的对象，在整条传播路径中通常保持不变；
- `currentTarget`：当前正在执行这个监听器的对象，随着路径变化而变化。

在列表容器的委托监听器中：

```text
点击星形 span：
target        → span
currentTarget → 列表容器
```

`currentTarget` 只在监听器执行期间有意义。若异步回调稍后再读，通常已恢复为 `null`。应在进入异步工作前保存所需值：

```js
list.addEventListener("click", (event) => {
  const listenerOwner = event.currentTarget;

  queueMicrotask(() => {
    console.log(listenerOwner.id);
    console.log(event.currentTarget); // 通常为 null
  });
});
```

### 4.2 `matches()` 与 `closest()`：从嵌套目标恢复动作

直接比较会漏掉嵌套图标：

```js
// 错误案例：点到 span 时条件为 false
if (event.target === favoriteButton) {
  toggleFavorite();
}
```

`matches()` 检查当前元素自身：

```js
if (
  event.target instanceof Element &&
  event.target.matches("[data-action='favorite']")
) {
  // 只有直接点到按钮本身才成立
}
```

`closest()` 从当前元素开始向祖先查找：

```js
list.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest("[data-action='favorite']");

  if (!button || !list.contains(button)) {
    return;
  }

  console.log(button.dataset.listingId);
});
```

这段代码有三层边界：

1. `target` 不保证一定是 `Element`，先做类型守卫；
2. `closest()` 可能返回 `null`；
3. 查到的按钮必须仍属于当前委托容器。

第三层在复杂嵌套、Shadow DOM 或可复用局部监听器中尤其重要。不要因为当前页面结构简单就删除边界检查。

### 4.3 默认行为与传播是两条独立轴

链接点击可能导航，表单提交可能发送请求，复选框点击会切换选中状态。这些是默认行为。事件沿 DOM 路径传递是传播。

三种方法的作用不同：

| 方法 | 取消默认行为 | 阻止到后续节点 | 阻止当前节点后续监听器 |
| --- | --- | --- | --- |
| `preventDefault()` | 是，仅当事件可取消 | 否 | 否 |
| `stopPropagation()` | 否 | 是 | 否 |
| `stopImmediatePropagation()` | 否 | 是 | 是 |

`preventDefault()`：

```js
link.addEventListener("click", (event) => {
  console.log(event.cancelable);
  event.preventDefault();
  console.log(event.defaultPrevented);
});
```

- 只有 `cancelable === true` 时，取消才有效；
- 成功取消后 `defaultPrevented === true`；
- 它不会停止捕获或冒泡；
- 它不会自动阻止其他监听器。

`stopPropagation()`：

```js
outer.addEventListener("click", (event) => {
  event.stopPropagation();
});
```

- 后续传播节点收不到该事件；
- 当前 `outer` 上已经排队的其他监听器仍可执行；
- 链接导航等默认行为不会因此自动取消。

`stopImmediatePropagation()`：

```js
outer.addEventListener("click", (event) => {
  event.stopImmediatePropagation();
});
```

- 当前节点后续监听器不再执行；
- 后续传播节点也不再接收；
- 默认行为仍需用 `preventDefault()` 单独处理。

传播控制应有明确理由，例如隔离同一页面上互相冲突的事件协议。不要用它掩盖重复监听或错误选择器。

### 4.4 `passive`：承诺不会取消默认行为

```js
window.addEventListener("wheel", handleWheel, {
  passive: true
});
```

`passive: true` 是监听器对浏览器的承诺：“我不会调用 `preventDefault()`。”浏览器因此可能更早开始滚动等默认行为。

如果被动监听器仍调用：

```js
event.preventDefault();
```

浏览器会忽略取消请求，并可能在 Console 给出警告，`defaultPrevented` 不会按期望变成 `true`。

规则：

- 不需要取消默认行为时，可明确使用 `passive: true`；
- 确实需要取消时，必须使用 `passive: false`，并确认事件可取消；
- 不要为了“性能”给所有监听器机械添加 `passive: true`；
- 滚动和触摸手势还应优先考虑合适的 CSS，例如 `touch-action`；
- 某些浏览器会对特定全局滚动事件采用实现相关默认值，关键行为应显式声明并在目标浏览器验证。

本课的 `click`、表单和委托监听器不使用被动模式，因为部分演示需要取消链接或提交默认行为。

### 4.5 链接与按钮：默认行为来自语义

链接用于导航：

```html
<a href="#market-rules">查看交易规则</a>
```

按钮用于执行命令：

```html
<button type="button">收藏</button>
```

提交按钮用于提交表单：

```html
<button type="submit">添加本地商品</button>
```

常见错误：

```html
<!-- 错误案例：伪造命令链接 -->
<a href="#">收藏</a>

<!-- 错误案例：表单内未声明 type，可能意外提交 -->
<button>打开帮助</button>
```

判断顺序：

1. 操作是否改变当前页状态？优先使用按钮；
2. 操作是否前往一个 URL？使用带真实 `href` 的链接；
3. 是否提交表单？使用 `type="submit"`；
4. 表单内其他按钮是否只是命令？显式使用 `type="button"`。

不要先选错误元素，再靠 `preventDefault()` 修补语义。

### 4.6 按语义选择事件

#### `click`

适合按钮激活、链接激活和其他点击激活行为。键盘激活原生按钮和链接也会产生 `click`，因此不要另写只处理 Enter 的重复逻辑。

#### `input`

控件值因用户编辑而持续变化时触发，适合即时预览、字数或筛选：

```js
title.addEventListener("input", () => {
  preview.textContent = title.value;
});
```

脚本直接设置 `title.value = "台灯"` 通常不会自动分派 `input`。状态代码若依赖事件刷新，应明确调用渲染函数，或在测试中显式分派事件。

#### `change`

值被用户“确认”后触发。文本框通常在失去焦点且值变化时触发；复选框、单选框和选择框的时机更接近完成选择。不要假设所有控件的 `change` 都在每次按键发生。

#### `submit`

应监听表单，而不是只监听提交按钮的 `click`：

```js
form.addEventListener("submit", (event) => {
  event.preventDefault();
  console.log(event.submitter);
});
```

这样可以覆盖：

- 点击提交按钮；
- 在支持隐式提交的控件中按 Enter；
- 调用 `form.requestSubmit()`；
- 不同提交按钮通过 `event.submitter` 进入同一处理函数。

`form.submit()` 会绕过 `submit` 事件和约束验证，不应用来模拟正常用户提交。需要程序触发正常流程时优先使用 `requestSubmit()`。

#### `invalid`

原生约束失败时在无效控件上触发。它不冒泡，因此表单上的普通冒泡监听收不到：

```js
form.addEventListener(
  "invalid",
  (event) => {
    console.log(event.target.id);
  },
  { capture: true }
);
```

取消 `invalid` 的默认行为只会影响浏览器报告方式，不会让控件变成有效。若取消原生提示，页面必须提供清楚的字段错误和恢复路径。

#### `toggle`

`details`、popover，以及当前标准中的 `dialog` 在显示状态变化后可产生 `toggle`。状态已经改变，事件不可取消；快速连续切换还可能被合并。最稳妥的观察方式是直接监听发生切换的元素，并读取它的当前状态：

```js
details.addEventListener("toggle", () => {
  console.log(details.open);
});
```

不要通过取消 `toggle` 阻止打开。需要在状态改变前干预的组件，应核对对应元素的 `beforetoggle` 或更合适的业务入口。

#### `close`

`dialog.close()`、`method="dialog"` 等路径关闭对话框后，`dialog` 会产生 `close`：

```js
dialog.addEventListener("close", () => {
  console.log(dialog.returnValue);
});
```

`close` 不冒泡且不可取消，应直接监听 `dialog`。它不同于可取消的 `cancel`，也不同于按钮自己的 `click`。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `EVT-003`：target、currentTarget、closest
- `EVT-004`：preventDefault、stopPropagation、passive
- `EVT-005`：click、input、change
- `EVT-006`：submit、invalid
- `EVT-007`：toggle、close

## 6. 最小可运行案例

在个人练习目录中新建 `practice/08-event-target-defaults-semantic-events/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 EVT-003（target、currentTarget、closest） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 EVT-004（preventDefault、stopPropagation、passive） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 为 EVT-005（click、input、change） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
5. 为 EVT-006（submit、invalid） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
6. 为 EVT-007（toggle、close） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
7. 在打开页面前写下预期 DOM、默认行为或请求结果；
8. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
9. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [事件委托与合成事件](09-event-delegation-synthetic-events.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 EVT-003（target、currentTarget、closest） 对应的元素、属性或状态；
- 在项目中实现并标出与 EVT-004（preventDefault、stopPropagation、passive） 对应的元素、属性或状态；
- 在项目中实现并标出与 EVT-005（click、input、change） 对应的元素、属性或状态；
- 在项目中实现并标出与 EVT-006（submit、invalid） 对应的元素、属性或状态；
- 在项目中实现并标出与 EVT-007（toggle、close） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`09-event-delegation-synthetic-events.md`](09-event-delegation-synthetic-events.md)。

## 8. 常见错误与排查路径

### 8.1 明确错误：点击图标时委托失效

错误代码：

```js
if (event.target.matches("button[data-action='favorite']")) {
  toggleFavorite(event.target.dataset.listingId, event.target);
}
```

- **现象**：点按钮空白或文字可用，点星形无效；
- **证据**：星形点击的 `target` 是 `span`；
- **根因**：`matches()` 只检查目标自身；
- **修复**：类型守卫后用 `closest()`，再检查 `list.contains()`；
- **复验**：点图标和按钮边缘得到同一 `listingId`。

### 8.2 明确错误：把 `currentTarget` 当成被点击按钮

在列表委托中，`currentTarget` 是列表，不是收藏按钮。若读取：

```js
event.currentTarget.dataset.listingId
```

结果通常为 `undefined`。应从经 `closest()` 定位的动作按钮读取 ID。

### 8.3 明确错误：异步读取 `currentTarget`

- **现象**：微任务或 Promise 中 `event.currentTarget` 为 `null`；
- **根因**：它只在监听器调用期间指向当前监听目标；
- **修复**：同步保存元素或所需 ID；
- **复验**：异步日志使用保存值，不依赖事件对象仍处于分派。

### 8.4 明确错误：用 `stopPropagation()` 取消链接

- **现象**：祖先日志消失，但页面仍导航；
- **根因**：传播和默认行为是独立轴；
- **修复**：若产品确实不应导航，先检查元素语义，再对可取消点击调用 `preventDefault()`；
- **复验**：`defaultPrevented=true` 且 URL 不变。

不要因为不理解上层监听器就到处停止传播。那会让分析、快捷键、弹层关闭或其他组件悄悄失效。

### 8.5 明确错误：认为 `preventDefault()` 会停止冒泡

- **现象**：链接未导航，但祖先委托仍有日志；
- **原因**：取消默认行为不影响传播；
- **修复**：若确需停止传播，应有独立协议和理由；
- **复验**：分别记录 `defaultPrevented` 与祖先日志，不把两者混写。

### 8.6 明确错误：在被动监听器中取消默认行为

错误代码：

```js
window.addEventListener("wheel", (event) => {
  event.preventDefault();
}, { passive: true });
```

- **现象**：页面仍滚动，Console 可能警告；
- **证据**：监听器选项是 `passive: true`；
- **根因**：监听器已经承诺不会取消；
- **修复**：只有确有必要时改为 `passive: false`，并审查交互和性能；触摸手势优先核对 CSS；
- **复验**：检查 `cancelable`、`defaultPrevented` 和实际滚动。

### 8.7 明确错误：只监听提交按钮 `click`

- **现象**：鼠标点击可处理，按 Enter 或 `requestSubmit()` 路径遗漏；
- **根因**：监听的是某个入口，不是表单提交意图；
- **修复**：监听 form 的 `submit`，需要时读取 `event.submitter`；
- **复验**：点击和键盘提交进入同一处理函数。

### 8.8 明确错误：表单内命令按钮遗漏 `type`

- **现象**：点击“填入示例”意外触发表单验证或提交；
- **根因**：表单内 `button` 默认类型可能为 submit；
- **修复**：命令按钮显式 `type="button"`；
- **复验**：点击只修改示例值，不触发 `submit`。

### 8.9 明确错误：每次渲染后给所有按钮重新绑定

- **现象**：一次点击切换两次，视觉上像“没有变化”；
- **证据**：同一点击产生重复业务日志；
- **根因**：渲染函数重复注册，旧监听器未清理；
- **修复**：把一个委托监听器放在稳定列表容器；生命周期结束时用信号清理；
- **复验**：重绘十次后，一次点击仍只有一次状态更新。

### 8.10 明确错误：把 `toggle` 当成可取消的“打开前”事件

- **现象**：在 `toggle` 中调用 `preventDefault()`，`details` 仍已打开；
- **根因**：`toggle` 在状态变化后发生且不可取消；
- **修复**：用它观察结果；需要打开前规则时核对对应元素的前置事件或控制入口；
- **复验**：日志读取当前 `open`，不声称已阻止切换。

## 9. 课后题

### 9.1 理解题

1. 为什么两个文字相同的箭头函数不能互相移除？
2. `removeEventListener()` 的哪些部分必须匹配？
3. 目标上的捕获监听器为什么可能显示 `eventPhase === 2`？
4. 委托时 `target` 和 `currentTarget` 分别是谁？
5. `preventDefault()` 会停止冒泡吗？
6. `stopPropagation()` 会取消链接导航吗？
7. `stopImmediatePropagation()` 比 `stopPropagation()` 多停止什么？
8. 为什么 `invalid` 需要捕获监听？
9. 动态加入的按钮为什么能被已有委托处理？
10. 合成事件为什么不能获得真实用户激活？

<details>
<summary>查看理解题答案</summary>

1. 每次求值都会创建不同函数对象，监听器移除按对象身份匹配。
2. 同一目标、事件类型、回调对象和 `capture` 值；其他选项不参与移除匹配。
3. 事件到达分派目标时属于目标阶段，目标上的捕获和普通监听器都看到 `AT_TARGET`。
4. `target` 是最初被点到的对象，可能是图标；`currentTarget` 是当前委托监听器所在的列表。
5. 不会。它只取消可取消的默认行为。
6. 不会。停止传播不自动取消默认行为。
7. 它还阻止当前节点尚未执行的其他监听器。
8. `invalid` 不冒泡，但会经过祖先捕获路径。
9. 监听器在稳定列表容器上，动态按钮的冒泡点击仍会经过该容器。
10. 浏览器只把真实可信输入纳入用户激活状态；脚本分派事件的 `isTrusted` 为 `false`。

</details>

### 9.2 传播预测题

注册顺序：

```text
document capture
outer capture
button capture
button bubble
outer bubble A
outer bubble B
document bubble
```

回答：

1. 正常点击按钮的顺序是什么？
2. `outer bubble A` 调用 `stopPropagation()` 后，哪些仍执行？
3. `outer bubble A` 调用 `stopImmediatePropagation()` 后，哪些仍执行？
4. `outer capture` 调用 `stopPropagation()` 后，按钮监听器会执行吗？
5. `button bubble` 只调用 `preventDefault()`，传播顺序有什么变化？

<details>
<summary>查看传播预测答案</summary>

1. 按题目列出的顺序执行。
2. `outer bubble B` 仍执行，`document bubble` 不执行。
3. `outer bubble B` 与 `document bubble` 都不执行。
4. 不执行。事件在到达目标前已停止继续沿路径传播。
5. 传播顺序不变；只有可取消默认行为被取消，后续监听器可读到 `defaultPrevented=true`。

</details>

### 9.3 目标判断题

结构：

```html
<ul id="list">
  <li>
    <button data-action="favorite">
      <span aria-hidden="true">★</span>
      收藏
    </button>
  </li>
</ul>
```

监听器在 `ul` 上。点击 `span` 时填写：

```text
event.target =
event.currentTarget =
event.target.matches("button") =
event.target.closest("button") =
```

答案：

```text
event.target = span
event.currentTarget = ul#list
event.target.matches("button") = false
event.target.closest("button") = 对应收藏按钮
```

### 9.4 默认行为判断题

判断下列语句：

| 语句 | 对/错 |
| --- | --- |
| 所有事件都能被 `preventDefault()` 取消 | ? |
| `defaultPrevented` 表示传播已停止 | ? |
| 被动监听器承诺不取消默认行为 | ? |
| 表单命令按钮应显式使用 `type="button"` | ? |
| `dispatchEvent()` 默认创建会冒泡、可取消的事件 | ? |

<details>
<summary>查看默认行为答案</summary>

| 语句 | 答案 |
| --- | --- |
| 所有事件都能被 `preventDefault()` 取消 | 错，必须 `cancelable === true` |
| `defaultPrevented` 表示传播已停止 | 错，它只反映默认行为取消状态 |
| 被动监听器承诺不取消默认行为 | 对 |
| 表单命令按钮应显式使用 `type="button"` | 对 |
| `dispatchEvent()` 默认创建会冒泡、可取消的事件 | 错，构造事件时两者默认通常为 `false` |

</details>

## 10. 实践练习

### 10.1 基础：事件路径观察器

文件位置：

```text
practice/html-14-events/basic-propagation.html
```

要求：

- 创建 document、外层容器、按钮、按钮内图标四层观察结构；
- 在 document、容器和按钮注册捕获与普通监听器；
- 每条日志包含类型、`eventPhase`、`target`、`currentTarget`、`bubbles`、`cancelable`、`defaultPrevented`；
- 使用一个 `once` 监听器；
- 使用命名函数完成一次成功移除；
- 复现一次匿名函数移除失败；
- 用 `AbortController` 清理至少三个监听器；
- 加入一个真实链接，分别观察默认导航和取消导航；
- 比较 `stopPropagation()` 与 `stopImmediatePropagation()`；
- 保存文件、打开方式、预期和失败证据。

运行方式：

```bash
open practice/html-14-events/basic-propagation.html
```

答案标准：

- 顺序与捕获、目标、冒泡模型一致；
- 图标点击时 `target` 与按钮监听器的 `currentTarget` 不同；
- `once` 只执行一次；
- 同一函数引用可以移除，新箭头函数不能移除旧监听器；
- `stopPropagation()` 不停止同节点后续监听器；
- `stopImmediatePropagation()` 会停止；
- `preventDefault()` 不改变传播顺序；
- `abort()` 后对应监听器不再执行；
- 结论不依赖固定浏览器日志格式。

### 10.2 进阶：动态商品多动作委托

文件位置：

```text
practice/html-14-events/advanced-delegation.html
```

要求：

- 至少两件初始商品；
- 表单可动态加入商品；
- 商品含收藏和删除两个 `type="button"` 动作；
- 只在列表容器注册一个 `click` 委托；
- 两种按钮都含嵌套图标；
- 使用 `closest("button[data-action]")`；
- 检查按钮仍在委托容器；
- 按 `dataset.action` 路由到明确允许的动作；
- 未知动作被忽略；
- 收藏使用当前页 `Set`；
- 删除同时清理收藏；
- 删除聚焦元素后恢复合理焦点；
- 价格只保存安全整数分；
- 创建时间只保存 UTC ISO；
- 表单处理 `input`、`change`、捕获 `invalid` 和 `submit`；
- 所有页面监听器可由一个信号清理；
- 重启时创建新控制器；
- 刷新后恢复初始状态。

答案标准：

- 动态按钮不新增逐项监听器；
- 点击图标和按钮文字动作一致；
- 单次点击只更新一次；
- 删除后没有孤立收藏 ID；
- 价格没有小数元；
- 时间以 `Z` 结尾；
- 无效提交不会创建商品；
- 有效提交没有网络请求；
- 清理后监听停止，重启后不重复；
- 页面明确写出“仅内存、刷新丢失”。

## 11. 阶段验收

### 默认行为与传播控制

- [ ] 链接默认导航可以观察；
- [ ] 按钮命令不伪装成链接；
- [ ] 表单内按钮都有明确 `type`；
- [ ] 取消前检查或记录 `cancelable`；
- [ ] 取消后 `defaultPrevented` 为 `true`；
- [ ] `preventDefault()` 没有被描述为停止传播；
- [ ] `stopPropagation()` 没有被描述为取消默认行为；
- [ ] 同节点第二监听器在 `stopPropagation()` 后仍执行；
- [ ] `stopImmediatePropagation()` 后不再执行；
- [ ] 被动监听器边界有故障记录。

### 表单与状态事件

- [ ] `input` 用于持续文本预览；
- [ ] `change` 用于完成选择后的记录；
- [ ] `submit` 监听在 form 上；
- [ ] `SubmitEvent.submitter` 可观察；
- [ ] `invalid` 使用捕获阶段；
- [ ] `toggle` 直接监听状态元素；
- [ ] `close` 直接监听 dialog；
- [ ] 不冒泡事件没有被强行按普通委托解释。

### 动态委托

- [ ] 列表只有一个收藏委托监听器；
- [ ] 初始和动态商品使用同一路径；
- [ ] 点击嵌套图标仍找到按钮；
- [ ] 动作来自允许列表，不执行任意 dataset 字符串；
- [ ] 未知商品 ID 被拒绝；
- [ ] 收藏状态来自内存 `Set`；
- [ ] `aria-pressed`、图标和文字同步；
- [ ] 单次点击只产生一次业务更新；
- [ ] 清理监听器后原生默认行为与脚本行为能区分。

### 运行证据

```text
个人文件路径：
打开命令或方式：
浏览器与版本：
正常传播顺序：
stopPropagation 顺序：
stopImmediatePropagation 顺序：
target/currentTarget：
eventPhase：
链接 defaultPrevented：
once 证据：
remove 同引用证据：
AbortSignal 清理证据：
input/change：
invalid capture：
submitter：
toggle/close：
嵌套图标委托：
动态商品委托：
重复监听故障：
合成事件 isTrusted：
用户激活边界：
Node 传播预期：
priceCents：
createdAt：
Network 面板：
刷新后状态：
未验证浏览器/辅助技术：
```

完成标准不是“按钮能点”，而是能预测一次事件会经过哪里、哪个处理器为何执行、默认行为是否被取消、监听器何时结束，并能用日志复现和恢复至少一个故障。

## 12. 常见问题

### Q1：为什么不用 `onclick`？

`onclick` 属性或 DOM 属性只能保存一个对应处理器，容易被后续赋值覆盖；`addEventListener()` 支持多个监听器、捕获、一次性、被动模式和信号清理。本课统一使用后者。

### Q7：`target` 一定是 Element 吗？

`Event.target` 类型是 `EventTarget`，不能假定有 `closest()`。委托代码应先用 `instanceof Element` 检查。

### Q8：为什么 `currentTarget` 在 Promise 中变成 `null`？

它表示当前正在执行哪个监听器，只在监听器调用期间设置。异步前保存需要的元素或 ID。

### Q9：`stopPropagation()` 能阻止当前节点其他框架监听器吗？

不能保证。它不停止当前节点后续监听器；`stopImmediatePropagation()` 才会，但影响更强。应优先建立清楚的事件协议，而不是用停止传播解决所有冲突。

### Q10：为什么取消了 `click`，复选框状态表现还需要实测？

默认动作、激活行为和兼容处理由具体元素及规范算法决定。不要把一个元素的实验外推到全部元素；记录目标浏览器、事件属性和最终状态。

### Q11：`input` 与 `change` 应该都监听吗？

取决于需求。即时预览通常使用 `input`；只关心完成选择可使用 `change`。完整案例同时使用，是为了观察两种语义，不是要求所有字段重复处理。

### Q12：为什么无效表单看不到 `submit` 日志？

在原生交互验证启用时，浏览器先验证控件。若失败，会产生 `invalid`，并可能根本不分派 `submit`。这正是应监听捕获阶段 `invalid` 的原因。

### Q13：可以在 `invalid` 中 `preventDefault()` 吗？

可以影响默认错误报告，但不会让字段有效。若取消，就必须提供可见、可关联、可聚焦的错误界面。

### Q14：为什么脚本给 `.value` 赋值没有 `input` 日志？

属性赋值本身通常不模拟用户编辑。应直接调用状态同步函数；测试事件接线时才显式分派事件。

### Q20：清理监听器后链接为什么仍能跳转？

链接导航是浏览器默认行为，不是脚本监听器提供的。移除监听器只会移除脚本处理；若没有监听器取消默认行为，链接继续按语义工作。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：区分 target 与 currentTarget、传播与默认行为，并按元素语义选择事件。
- `EVT-003`：target、currentTarget、closest
- `EVT-004`：preventDefault、stopPropagation、passive
- `EVT-005`：click、input、change
- `EVT-006`：submit、invalid
- `EVT-007`：toggle、close
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：监听器生命周期与事件传播](07-event-listener-lifecycle-propagation.md) · [下一课：事件委托与合成事件](09-event-delegation-synthetic-events.md) · [返回 HTML 模块](../README.md)
