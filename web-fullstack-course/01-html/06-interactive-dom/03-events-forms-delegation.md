# 事件、表单与委托：从一次点击追踪到动态列表

> 所属章节：原生交互、DOM 与事件
> 建议学习时间：5–6 小时
> 阶段成果：完成一个用事件委托管理动态商品、可提交本地表单并可统一清理监听器的邻里集市页面

## 任务卡

商品列表只有三张卡片时，可以给每个收藏按钮分别绑定监听器；但商品由表单动态加入后，新按钮没有监听器，点击图标时 `event.target` 又可能只是按钮里的 `span`。如果继续逐个补监听器，删除节点、重复渲染和页面离开都会让生命周期越来越难判断。

本课把一次用户输入拆成五个可以取证的环节：

```text
用户或脚本产生事件
  → 事件沿捕获、目标、冒泡路径传播
  → 监听器读取 target/currentTarget 并决定是否处理
  → 监听器可以改变传播或取消可取消的默认行为
  → 浏览器执行未被取消的默认行为
```

**完成本课后，你将交付：**

- 一份捕获、目标、冒泡顺序和 `eventPhase` 数值记录；
- 一份 `target`、`currentTarget`、`closest()` 与 `matches()` 对照记录；
- 一次“相同函数引用才能移除监听器”的失败和恢复实验；
- 一组使用 `once`、监听器选项和 `AbortSignal` 的生命周期证据；
- 一份 `preventDefault()`、`stopPropagation()` 与 `stopImmediatePropagation()` 的差异记录；
- 一个使用事件委托管理动态收藏按钮的商品列表；
- 一条从嵌套图标恢复到收藏按钮的委托路径；
- 一个处理 `input`、`change`、`submit` 与捕获阶段 `invalid` 的本地表单；
- 一组直接监听 `toggle` 和 `close` 的状态日志；
- 一份可信事件、合成事件与用户激活边界说明。

完整案例只修改当前页内存。商品价格始终使用整数分，时间始终保存为 UTC ISO 8601 字符串。刷新页面后，动态商品、收藏和事件日志都会消失；案例没有认证、授权、上传、数据库、支付或并发控制。

## 1. 任务背景

事件不是“给按钮绑一个函数”这么简单。浏览器至少要回答以下问题：

1. 事件从哪个对象开始分派？
2. 它会经过哪些祖先？
3. 当前执行的是捕获、目标还是冒泡阶段？
4. 用户实际点到的节点与监听器所在节点是否相同？
5. 事件有没有浏览器默认行为，这个行为能否取消？
6. 某个监听器停止传播后，当前节点上的其他监听器是否仍执行？
7. 动态加入的元素怎样复用已有监听器？
8. 页面或组件离开后，哪些监听器必须清理？
9. 脚本分派的事件是否等同于真实用户操作？

邻里集市需要同时处理三种职责：

- **命令**：点击“收藏”或“打开操作说明”；
- **输入**：标题持续变化、分类完成选择；
- **提交**：浏览器确认表单有效后创建本地商品对象。

它们不能全部粗暴地写成 `click`。键盘提交表单不一定来自鼠标点击；输入框的 `input` 和 `change` 时机不同；`invalid` 不冒泡；`toggle` 和 `close` 应直接监听状态发生变化的元素。

本课按下面的顺序推进：

```text
注册和移除一个监听器
  → 观察完整传播路径
  → 分开默认行为与传播控制
  → 按事件语义选择 click/input/change/submit/invalid
  → 在稳定祖先上委托动态列表
  → 用 AbortController 统一结束监听生命周期
  → 区分真实输入、合成事件和用户激活
```

## 2. 学习目标

完成本课后，你应能：

- 使用 `addEventListener()` 注册命名函数；
- 说明 `removeEventListener()` 为什么需要同一函数引用；
- 说明移除匹配由事件类型、回调和 `capture` 共同决定；
- 正确使用 `capture`、`once`、`passive` 和 `signal`；
- 用 `AbortController.abort()` 清理一组监听器；
- 预测捕获、目标和冒泡阶段的执行顺序；
- 解释 `Event.NONE`、`CAPTURING_PHASE`、`AT_TARGET` 和 `BUBBLING_PHASE`；
- 区分 `event.target` 与 `event.currentTarget`；
- 在委托代码中组合 `matches()`、`closest()` 和容器边界检查；
- 在异步工作前保存 `currentTarget` 所需信息；
- 先检查 `event.cancelable`，再判断 `preventDefault()` 是否有意义；
- 使用 `event.defaultPrevented` 判断默认行为是否已被取消；
- 区分取消默认行为与停止传播；
- 解释 `stopPropagation()` 与 `stopImmediatePropagation()` 对同节点其他监听器的不同影响；
- 说明被动监听器为什么不能取消默认行为；
- 为链接与按钮选择正确语义，并显式声明表单内按钮类型；
- 按语义使用 `click`、`input`、`change`、`submit`、`invalid`、`toggle` 和 `close`；
- 用 `SubmitEvent.submitter` 判断哪个提交按钮触发提交；
- 说明 `invalid` 不冒泡，为什么应使用捕获监听；
- 使用一个列表容器处理已有和动态加入的收藏按钮；
- 修复点击嵌套图标时 `event.target === button` 失败的问题；
- 说明合成事件的 `isTrusted`、同步分派和构造选项；
- 解释合成事件不能获得真实用户激活；
- 将事件处理与业务状态更新函数分开，以便独立测试。

## 3. 预备知识

开始前建议完成：

- [DOM 查询、创建与修改](02-dom-query-mutation.md)；
- [表单提交与成功控件](../05-forms-validation/01-form-submission-successful-controls.md)；
- [约束验证、错误恢复与文件](../05-forms-validation/04-constraint-validation-files.md)。

你需要知道：

- `querySelector()` 可能返回 `null`；
- `createElement()`、`append()` 和 `textContent` 可以安全构造节点；
- `data-*` 会映射到 `dataset`；
- `button` 在表单内默认可能是提交按钮；
- `form` 的原生约束验证可能在 `submit` 前触发 `invalid`；
- `FormData` 读取的是当前表单控件状态；
- 邻里集市的金额使用整数分；
- 存储时间使用带 `Z` 的 UTC ISO 8601 字符串。

本课不要求：

- 真实商品接口；
- 数据库或 `localStorage`；
- 登录与权限系统；
- 跨标签页同步；
- 框架事件系统；
- 服务端渲染或水合；
- 支付、库存锁定或并发收藏。

本课使用开发者工具 Console 和页面日志取证。不要只看按钮颜色变化；同一视觉结果可能来自重复监听、错误传播或过期状态。

## 4. 核心理论

### 4.1 `EventTarget`：事件监听器注册在哪里

实现 `EventTarget` 的对象可以注册事件监听器。常见对象包括：

- `window`；
- `document`；
- 元素节点；
- `AbortSignal`；
- 一些浏览器 API 返回的对象。

基本形式：

```js
function handleClick(event) {
  console.log(event.type);
}

const button = document.querySelector("#favorite-button");
button.addEventListener("click", handleClick);
```

这里有三个稳定身份：

```text
事件目标对象：button
事件类型："click"
回调对象：handleClick 指向的函数
```

`addEventListener()` 不会立即调用函数。它把监听器加入目标对象的监听器列表，等相应事件分派到该对象时再调用。

同一目标、同一类型、同一回调对象和同一捕获标记重复注册，不会产生两个相同监听器。匿名函数每次求值都会创建新函数对象，因此看起来一样的两个箭头函数并不相同。

### 4.2 移除监听器必须保留同一函数引用

下面的移除无效：

```js
// 错误案例：两个箭头函数是两个不同对象
button.addEventListener("click", () => {
  console.log("收藏");
});

button.removeEventListener("click", () => {
  console.log("收藏");
});
```

正确做法是保存引用：

```js
function handleFavoriteClick() {
  console.log("收藏");
}

button.addEventListener("click", handleFavoriteClick);
button.removeEventListener("click", handleFavoriteClick);
```

移除时要匹配：

1. 同一个事件目标；
2. 同一个事件类型；
3. 同一个回调对象；
4. 相同的 `capture` 值。

下面注册的是捕获监听器，移除时也要写 `capture: true`：

```js
button.addEventListener("click", handleFavoriteClick, {
  capture: true
});

button.removeEventListener("click", handleFavoriteClick, {
  capture: true
});
```

`once`、`passive` 和 `signal` 不参与 `removeEventListener()` 的移除匹配，`capture` 参与。实践中仍应让注册和移除代码使用同一个明确配置，减少阅读歧义。

### 4.3 `once` 与 `AbortSignal` 解决不同生命周期

只处理第一次事件：

```js
button.addEventListener("click", handleFirstClick, {
  once: true
});
```

`once: true` 适合“一次确认”“首次展开统计”一类监听器。第一次调用后，浏览器自动移除它。

一组监听器共同结束：

```js
const controller = new AbortController();
const options = { signal: controller.signal };

button.addEventListener("click", handleClick, options);
form.addEventListener("submit", handleSubmit, options);
details.addEventListener("toggle", handleToggle, options);

controller.abort();
```

`abort()` 会移除所有使用该信号注册且仍存活的监听器。它适合页面会话、临时面板或组件连接周期。

两者可以组合：

```js
button.addEventListener("click", handleFirstClick, {
  once: true,
  signal: controller.signal
});
```

结果取决于哪个先发生：

- 先点击：监听器执行一次并自动移除；
- 先 `abort()`：监听器未执行就被移除。

已经中止的信号不能重新启用。重新开始监听时，应创建新的 `AbortController`，不能复用旧信号。

### 4.4 事件传播路径：捕获、目标、冒泡

假设结构如下：

```html
<div id="outer">
  <button id="favorite" type="button">
    <span aria-hidden="true">★</span>
    收藏
  </button>
</div>
```

点击 `span` 时，事件路径包含文档祖先、`outer`、`button` 和 `span`。监听器大致经历：

```text
从外到内：捕获阶段
到达分派目标：目标阶段
从内到外：冒泡阶段
```

`event.eventPhase` 的值为：

| 常量 | 数值 | 含义 |
| --- | ---: | --- |
| `Event.NONE` | 0 | 当前不在分派过程 |
| `Event.CAPTURING_PHASE` | 1 | 正沿祖先从外到内捕获 |
| `Event.AT_TARGET` | 2 | 正在事件目标上调用监听器 |
| `Event.BUBBLING_PHASE` | 3 | 正沿祖先从内到外冒泡 |

捕获监听器要显式注册：

```js
outer.addEventListener("click", handleCapture, {
  capture: true
});

outer.addEventListener("click", handleBubble);
```

需要注意：

- `capture: true` 不会让所有事件突然冒泡，它只决定监听器在路径哪个方向接收；
- 到达事件目标时，目标上的捕获监听器和普通监听器的 `eventPhase` 都是 `AT_TARGET`；
- 只有事件本身 `bubbles === true` 时，才会经过祖先的冒泡监听器；
- `click`、`input`、`change` 和 `submit` 通常冒泡；
- `invalid`、`close` 以及本课直接观察的 `toggle` 不应依赖祖先冒泡委托。

### 4.5 `target` 与 `currentTarget` 回答不同问题

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

### 4.6 `matches()` 与 `closest()`：从嵌套目标恢复动作

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

### 4.7 默认行为与传播是两条独立轴

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

### 4.8 `passive`：承诺不会取消默认行为

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

### 4.9 链接与按钮：默认行为来自语义

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

### 4.10 按语义选择事件

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

### 4.11 事件委托：监听稳定祖先，不逐个追赶动态节点

逐项绑定：

```js
document.querySelectorAll("[data-action='favorite']").forEach((button) => {
  button.addEventListener("click", handleFavorite);
});
```

问题：

- 之后动态加入的按钮没有监听器；
- 删除节点前后清理责任分散；
- 重复渲染可能重复绑定；
- 大列表有大量功能相同的监听器。

委托把一个冒泡监听器放在稳定容器上：

```js
list.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }

  const button = event.target.closest("button[data-action='favorite']");

  if (!button || !list.contains(button)) {
    return;
  }

  toggleFavorite(button.dataset.listingId, button);
});
```

委托适合：

- 子项由脚本动态加入或删除；
- 子项动作类型有限；
- 事件会冒泡；
- 容器有清晰所有权边界。

委托不等于把整个应用所有事件都绑到 `document`。监听器应放在能表达职责的最近稳定祖先上。

对于不冒泡事件：

- `invalid` 可在共同祖先使用捕获；
- 焦点委托可考虑冒泡的 `focusin`/`focusout`；
- `close`、`toggle` 等状态事件通常直接监听元素；
- 不要为了委托而把事件替换成语义错误的 `click`。

### 4.12 合成事件不等于真实用户操作

脚本可以构造并同步分派事件：

```js
const event = new CustomEvent("market:favorite", {
  bubbles: true,
  cancelable: true,
  detail: {
    listingId: "listing-101"
  }
});

const completed = list.dispatchEvent(event);
console.log(completed);
```

关键边界：

- `dispatchEvent()` 在当前调用栈同步执行监听器；
- `new Event()` 的 `bubbles` 和 `cancelable` 默认都是 `false`；
- 合成事件的 `isTrusted` 为 `false`；
- 若可取消事件被取消，`dispatchEvent()` 返回 `false`，否则返回 `true`；
- `CustomEvent.detail` 可携带应用数据，但仍是不可信页面内数据；
- 合成事件可以测试事件接线，不能证明真实鼠标、键盘、辅助技术和焦点行为正确；
- 某些元素激活路径可能还有规范定义的默认动作，测试前必须明确目标元素与事件选项。

`HTMLElement.click()` 会调用元素的点击激活路径，但产生的点击不因此变成真实用户输入。它也不能为页面创造真实的瞬时用户激活。

受用户激活保护的 API，例如弹窗、全屏、剪贴板或媒体相关能力，必须在真实可信输入形成的有效激活窗口内调用。下面的思路不可靠：

```js
// 错误案例：合成 click 不能伪造用户激活
button.dispatchEvent(
  new MouseEvent("click", {
    bubbles: true,
    cancelable: true
  })
);
```

测试业务规则时，优先把业务函数与事件适配层分开：

```js
function toggleFavoriteState(favorites, listingId) {
  const next = new Set(favorites);

  if (next.has(listingId)) {
    next.delete(listingId);
  } else {
    next.add(listingId);
  }

  return next;
}

function handleFavoriteClick(event) {
  // 只负责从事件找到 listingId，再调用纯状态函数。
}
```

这样，纯函数可以在 Node.js 中测试；浏览器测试只验证选择、传播、默认行为、焦点和接线。

### 4.13 传播顺序可以先写成纯预期

下面的脚本不模拟 DOM。它把本课传播实验的预期顺序写成纯数据，适合先在 Node.js 中检查题目答案：

```js
"use strict";

const assert = require("node:assert/strict");

function expectedPropagationTrace(mode = "normal") {
  const beforeOuterBubble = [
    "document capture",
    "outer capture",
    "button target capture",
    "button target bubble"
  ];

  if (mode === "stop-at-outer-capture") {
    return [
      "document capture",
      "outer capture"
    ];
  }

  if (mode === "stop-immediate-at-outer-bubble") {
    return [
      ...beforeOuterBubble,
      "outer bubble first"
    ];
  }

  return [
    ...beforeOuterBubble,
    "outer bubble first",
    "outer bubble second",
    "document bubble"
  ];
}

assert.deepEqual(expectedPropagationTrace(), [
  "document capture",
  "outer capture",
  "button target capture",
  "button target bubble",
  "outer bubble first",
  "outer bubble second",
  "document bubble"
]);

assert.deepEqual(
  expectedPropagationTrace("stop-at-outer-capture"),
  [
    "document capture",
    "outer capture"
  ]
);

assert.deepEqual(
  expectedPropagationTrace("stop-immediate-at-outer-bubble"),
  [
    "document capture",
    "outer capture",
    "button target capture",
    "button target bubble",
    "outer bubble first"
  ]
);

console.log("propagation expectations: PASS");
```

运行：

```bash
node propagation-expectations.js
```

预期：

```text
propagation expectations: PASS
```

这只能检查“我们写下的预期是否一致”，不能替代浏览器实验。浏览器实验才会证明实际事件路径、`target`、`currentTarget` 和默认行为。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 关键观察 | 边界 |
| --- | --- | --- | --- |
| `addEventListener()` | 注册监听器 | 类型、回调、选项 | 不立即执行 |
| `removeEventListener()` | 移除监听器 | 同目标、类型、回调、`capture` | 新匿名函数无法移除旧函数 |
| `capture` | 选择捕获监听 | `eventPhase === 1` | 不改变事件自身是否冒泡 |
| `once` | 首次调用后移除 | 第二次事件无日志 | 不适合持续交互 |
| `passive` | 承诺不取消默认行为 | `preventDefault()` 被忽略 | 不能机械用于所有事件 |
| `signal` | 让 AbortSignal 管理监听器 | `abort()` 后无日志 | 中止后的信号不可复用 |
| `AbortController` | 发出统一中止 | `controller.abort()` | 只清理绑定到该信号的监听器 |
| `eventPhase` | 当前传播阶段 | 0、1、2、3 | 目标上的两类监听器都是 2 |
| `target` | 原始分派目标 | 可能是嵌套图标 | 不等于动作按钮 |
| `currentTarget` | 当前监听器所有者 | 委托时是容器 | 监听器返回后恢复为空 |
| `matches()` | 检查元素自身是否匹配 | 布尔值 | 不向祖先查找 |
| `closest()` | 向自身和祖先查找 | 元素或 `null` | 仍需检查委托容器边界 |
| `bubbles` | 事件是否经过祖先冒泡阶段 | 布尔值 | 不由监听器选项决定 |
| `cancelable` | 默认行为是否可取消 | 布尔值 | `false` 时 preventDefault 无效 |
| `defaultPrevented` | 默认行为是否已取消 | 布尔值 | 不代表传播已停止 |
| `preventDefault()` | 取消可取消默认行为 | 链接不改变片段 | 不停止传播 |
| `stopPropagation()` | 停止后续节点传播 | 祖先无后续日志 | 同节点后续监听器仍执行 |
| `stopImmediatePropagation()` | 停止同节点后续监听与传播 | 同节点第二监听器不执行 | 不自动取消默认行为 |
| `isTrusted` | 是否由用户代理可信路径产生 | 合成事件为 `false` | 不应作为授权依据 |
| `dispatchEvent()` | 同步分派事件 | 返回布尔值 | 不创造真实用户激活 |
| `click` | 激活动作 | 按钮、链接 | 先选正确元素语义 |
| `input` | 编辑过程变化 | 每次用户编辑 | 脚本赋值通常不自动触发 |
| `change` | 值完成变化 | 控件类型决定时机 | 不等于每次按键 |
| `submit` | 表单提交意图 | `submitter` | 监听 form，不只监听按钮 |
| `invalid` | 控件约束失败 | 捕获阶段日志 | 不冒泡 |
| `toggle` | 显示状态已切换 | `open` 或新旧状态 | 不可取消，快速切换可合并 |
| `close` | dialog 已关闭 | `returnValue` | 不冒泡且不可取消 |

推荐排查顺序：

```text
事件是否真的分派
  → type/bubbles/cancelable/isTrusted
  → target 与 composedPath()
  → 当前 currentTarget/eventPhase
  → 监听器 capture/once/passive/signal
  → closest() 是否找到动作元素
  → 元素是否仍在委托容器
  → defaultPrevented
  → 是否有 propagation stop
  → 业务状态是否真的更新
  → 界面是否从状态重新渲染
```

## 6. 最小可运行案例

### 6.1 文件位置

在个人练习目录创建：

```text
market-learning/
└── practice/
    └── html-14-events/
        └── propagation-lab.html
```

课程仓库只保存 Markdown 教材。请把下一节完整代码保存到个人文件。

### 6.2 完整文件：传播与默认行为实验室

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>事件传播实验室 · 邻里集市</title>
    <style>
      body {
        font-family: system-ui, sans-serif;
        line-height: 1.6;
        margin: 2rem;
        max-width: 52rem;
      }

      #outer {
        border: 2px solid #486b5a;
        padding: 1rem;
      }

      button,
      select {
        font: inherit;
        margin: 0.25rem;
        padding: 0.45rem 0.7rem;
      }

      pre {
        background: #eef3f0;
        min-height: 12rem;
        overflow: auto;
        padding: 1rem;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>事件传播实验室</h1>
      <p>
        价格示例为 <strong>3900 分</strong>。本页只记录事件，
        不保存收藏，不发送请求。
      </p>

      <label for="mode">传播模式</label>
      <select id="mode">
        <option value="normal">正常传播</option>
        <option value="stop">outer 冒泡时 stopPropagation</option>
        <option value="immediate">
          outer 第一个冒泡监听器 stopImmediatePropagation
        </option>
      </select>

      <div id="outer">
        <p>外层容器</p>
        <button id="favorite" type="button">
          <span aria-hidden="true">★</span>
          收藏阅读台灯
        </button>
      </div>

      <p>
        <a id="rules-link" href="#rules">跳到规则</a>
        <label>
          <input id="cancel-link" type="checkbox">
          取消链接默认跳转
        </label>
      </p>

      <p>
        <button id="remove-named" type="button">移除命名监听器</button>
        <button id="abort-group" type="button">中止实验监听器组</button>
      </p>

      <h2 id="rules">规则</h2>
      <p>按钮执行命令，链接负责导航。</p>

      <h2>事件日志</h2>
      <pre id="log" aria-live="polite">等待操作。</pre>
    </main>

    <script>
      "use strict";

      const outer = document.querySelector("#outer");
      const favorite = document.querySelector("#favorite");
      const mode = document.querySelector("#mode");
      const rulesLink = document.querySelector("#rules-link");
      const cancelLink = document.querySelector("#cancel-link");
      const logElement = document.querySelector("#log");
      const abortGroup = document.querySelector("#abort-group");
      const removeNamed = document.querySelector("#remove-named");
      const controller = new AbortController();
      const { signal } = controller;
      const lines = [];

      const phaseNames = {
        [Event.NONE]: "NONE",
        [Event.CAPTURING_PHASE]: "CAPTURE",
        [Event.AT_TARGET]: "TARGET",
        [Event.BUBBLING_PHASE]: "BUBBLE"
      };

      function nodeName(node) {
        if (node === document) {
          return "document";
        }

        if (node instanceof Element) {
          return node.id || node.tagName.toLowerCase();
        }

        return String(node);
      }

      function write(label, event) {
        lines.push(
          [
            label,
            `phase=${phaseNames[event.eventPhase]}`,
            `target=${nodeName(event.target)}`,
            `current=${nodeName(event.currentTarget)}`,
            `bubbles=${event.bubbles}`,
            `cancelable=${event.cancelable}`,
            `defaultPrevented=${event.defaultPrevented}`
          ].join(" | ")
        );

        logElement.textContent = lines.join("\n");
      }

      function documentCapture(event) {
        write("document capture", event);
      }

      function outerCapture(event) {
        write("outer capture", event);
      }

      function buttonCapture(event) {
        write("button capture listener", event);
      }

      function buttonBubble(event) {
        write("button bubble listener", event);
      }

      function outerBubbleFirst(event) {
        write("outer bubble first", event);

        if (mode.value === "stop") {
          event.stopPropagation();
        }

        if (mode.value === "immediate") {
          event.stopImmediatePropagation();
        }
      }

      function outerBubbleSecond(event) {
        write("outer bubble second", event);
      }

      function documentBubble(event) {
        write("document bubble", event);
      }

      function namedFavoriteObserver(event) {
        write("named favorite observer", event);
      }

      document.addEventListener("click", documentCapture, {
        capture: true,
        signal
      });
      outer.addEventListener("click", outerCapture, {
        capture: true,
        signal
      });
      favorite.addEventListener("click", buttonCapture, {
        capture: true,
        signal
      });
      favorite.addEventListener("click", buttonBubble, { signal });
      outer.addEventListener("click", outerBubbleFirst, { signal });
      outer.addEventListener("click", outerBubbleSecond, { signal });
      document.addEventListener("click", documentBubble, { signal });
      favorite.addEventListener("click", namedFavoriteObserver);

      favorite.addEventListener(
        "click",
        (event) => {
          write("once observer", event);
        },
        { once: true, signal }
      );

      rulesLink.addEventListener(
        "click",
        (event) => {
          if (cancelLink.checked) {
            event.preventDefault();
          }

          write("link listener", event);
        },
        { signal }
      );

      removeNamed.addEventListener("click", () => {
        favorite.removeEventListener("click", namedFavoriteObserver);
        lines.push("命名监听器已移除。");
        logElement.textContent = lines.join("\n");
      });

      abortGroup.addEventListener("click", () => {
        controller.abort();
        lines.push("AbortController 已中止；带 signal 的监听器已清理。");
        logElement.textContent = lines.join("\n");
      });
    </script>
  </body>
</html>
```

### 6.3 运行方法

1. 用现代浏览器直接打开 `propagation-lab.html`；
2. 保持“正常传播”，直接点击按钮文字；
3. 再点击星形 `span`，比较 `target`；
4. 第二次点击时确认 `once observer` 不再出现；
5. 选择 `stopPropagation` 模式，清空页面可通过刷新完成，再点击；
6. 选择 `stopImmediatePropagation` 模式，再点击；
7. 取消勾选“取消链接默认跳转”，点击链接；
8. 回到页面并勾选该选项，再点击链接；
9. 点击“移除命名监听器”，再点击收藏按钮；
10. 点击“中止实验监听器组”，再点击收藏按钮；
11. 在 Console 执行 `document.querySelector("#favorite").click()`，观察接线仍会执行，但这不是一份真实用户激活证据。

### 6.4 预期结果

正常点击按钮时，核心顺序为：

```text
document capture
outer capture
button capture listener
button bubble listener
named favorite observer
once observer（仅第一次）
outer bubble first
outer bubble second
document bubble
```

同一阶段内按注册顺序执行，因此命名观察器和一次性观察器位于按钮普通监听器之后。点星形时：

```text
target=span
button 捕获监听器的 phase=CAPTURE
button 普通监听器的 phase=BUBBLE
button 上两个监听器的 current=favorite
outer 上监听器的 current=outer
document 上监听器的 current=document
```

直接点按钮本体时，按钮上的捕获监听器和普通监听器都处于
`eventPhase=TARGET`。监听器的 `capture` 选项决定调用批次，不会把目标阶段改名为捕获阶段。

其他预期：

- `stopPropagation()` 在 `outer bubble first` 调用后，`outer bubble second` 仍执行，`document bubble` 不执行；
- `stopImmediatePropagation()` 后，`outer bubble second` 和 `document bubble` 都不执行；
- 两种传播停止都不会自动取消链接默认导航；
- 未勾选时链接把 URL 片段改为 `#rules`；
- 勾选后 `cancelable=true` 且 `defaultPrevented=true`，URL 片段不因该次点击改变；
- 移除命名监听器后，`named favorite observer` 不再出现；
- `abort()` 后，所有带 `signal` 的监听器停止工作；
- 不带该 `signal` 的“移除”和“中止”按钮监听器仍存在；
- 已被显式移除的命名监听器不会因中止动作重新出现。

### 6.5 失败证据

使用下面模板记录：

```text
文件路径：
浏览器与版本：
点击位置（文字/星形/链接）：
传播模式：
日志实际顺序：
target：
currentTarget：
eventPhase：
bubbles/cancelable：
defaultPrevented：
URL 片段变化：
once 第二次是否出现：
remove 后是否出现：
abort 后是否出现：
与预期不同之处：
```

典型失败：

- 把“点到图标时 `target=span`”误判为事件没有到按钮；
- 以为 `stopPropagation()` 会阻止同一 `outer` 上第二个监听器；
- 以为停止传播会取消链接导航；
- 使用新的箭头函数调用 `removeEventListener()`；
- `abort()` 后尝试复用同一个信号重新注册；
- 只截图最终页面，不保留顺序和阶段日志。

### 6.6 诊断与恢复记录：匿名函数无法移除

把命名观察器暂时改成：

```js
favorite.addEventListener("click", () => {
  console.log("anonymous favorite observer");
});
```

再尝试：

```js
favorite.removeEventListener("click", () => {
  console.log("anonymous favorite observer");
});
```

**现象：** 再次点击仍有日志。

**根因：** 两次箭头函数字面量创建两个不同函数对象，移除匹配失败。

**最小恢复：**

```js
function anonymousInNameOnly() {
  console.log("removable observer");
}

favorite.addEventListener("click", anonymousInNameOnly);
favorite.removeEventListener("click", anonymousInNameOnly);
```

**复验：** 移除前一次点击有日志，移除后连续两次点击都没有该日志。

### 6.7 渐进扩展：记录完整传播路径

在 `write()` 中加入：

```js
const path = event.composedPath().map(nodeName);
lines.push(`path=${path.join(" > ")}`);
```

扩展后比较：

- 点击按钮文字；
- 点击星形；
- 脚本调用 `.click()`；
- 把星形移到按钮外后再点击。

预期：路径由实际分派目标开始，经过祖先直到全局对象。`composedPath()` 对 Shadow DOM 的显示还会受事件 `composed` 与 Shadow 边界影响，下一课再处理该边界。

## 7. 邻里集市集成案例

### 7.1 案例目标与约束

完整页面包含：

- 两件固定内存商品；
- 一个可动态添加商品的本地表单；
- 一个列表容器上的收藏委托监听器；
- 每个收藏按钮中的嵌套星形图标；
- `input` 驱动的标题预览；
- `change` 驱动的分类日志；
- 原生约束失败时由表单捕获的 `invalid`；
- 有效提交时创建的内存商品；
- 规则链接与打开说明按钮的默认行为对比；
- `details` 的 `toggle` 记录；
- `dialog` 的 `close` 记录；
- 一组可用 `AbortController` 清理和重新启动的监听器；
- 可见状态和事件日志；
- 价格整数分和 UTC ISO 时间。

所有状态都只存在以下内存结构：

```text
listings：当前页商品数组
favorites：当前页商品 ID Set
sessionController：当前监听会话
eventLines：当前页最近事件日志
```

刷新后全部恢复初始状态。没有请求、持久化、跨页面同步或服务端确认。

### 7.2 文件位置

保存为：

```text
market-learning/practice/html-14-events/delegated-market.html
```

### 7.3 完整文件：动态商品与委托收藏

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>动态商品与委托收藏 · 邻里集市</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, sans-serif;
      }

      body {
        background: #f3f6f4;
        color: #203128;
        line-height: 1.6;
        margin: 0;
      }

      main {
        background: #ffffff;
        margin: 2rem auto;
        max-width: 64rem;
        padding: 2rem;
      }

      form,
      details,
      .session,
      .listing {
        border: 1px solid #9aaba2;
        margin: 1rem 0;
        padding: 1rem;
      }

      label {
        display: block;
        font-weight: 650;
        margin-top: 0.75rem;
      }

      input,
      select,
      button {
        font: inherit;
      }

      input,
      select {
        box-sizing: border-box;
        display: block;
        max-width: 100%;
        padding: 0.5rem;
        width: 30rem;
      }

      button {
        margin: 0.25rem;
        padding: 0.5rem 0.75rem;
      }

      .listing-list {
        list-style: none;
        padding: 0;
      }

      .listing {
        display: grid;
        gap: 0.5rem;
      }

      .favorite[aria-pressed="true"] {
        background: #244f3b;
        color: #ffffff;
      }

      .boundary {
        color: #4c5d54;
      }

      pre {
        background: #eaf1ed;
        max-height: 24rem;
        overflow: auto;
        padding: 1rem;
        white-space: pre-wrap;
      }

      dialog {
        max-width: 32rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>动态商品与委托收藏</h1>
      <p class="boundary">
        本页仅维护内存商品和收藏。刷新即丢失；没有登录、授权、数据库、
        上传、支付、库存锁定或并发控制。
      </p>

      <p>
        <a id="rules-link" href="#market-rules">前往集市规则</a>
        <button id="open-help" type="button">打开操作说明</button>
      </p>

      <label>
        <input id="cancel-rule-link" type="checkbox">
        教学演示：取消上方链接的默认跳转
      </label>

      <details id="market-rules">
        <summary>集市规则</summary>
        <p>
          商品价格用整数分记录，标题只作为文本显示，当前页收藏不持久化。
        </p>
      </details>

      <dialog id="help-dialog" aria-labelledby="help-title">
        <h2 id="help-title">操作说明</h2>
        <p>
          点击星形或按钮文字都应切换同一个商品的收藏状态。
        </p>
        <button id="close-help" type="button">关闭说明</button>
      </dialog>

      <section aria-labelledby="add-title">
        <h2 id="add-title">添加内存商品</h2>
        <form id="listing-form">
          <label for="title">标题</label>
          <input
            id="title"
            name="title"
            required
            minlength="2"
            maxlength="40"
          >

          <p>
            标题预览：
            <strong id="title-preview">尚未输入</strong>
          </p>

          <label for="category">分类</label>
          <select id="category" name="category" required>
            <option value="">请选择</option>
            <option value="home-lighting">家居照明</option>
            <option value="furniture">家具</option>
            <option value="children">儿童用品</option>
          </select>

          <label for="price-cents">价格（人民币分）</label>
          <input
            id="price-cents"
            name="priceCents"
            type="number"
            min="0"
            max="100000000"
            step="1"
            required
            inputmode="numeric"
          >

          <button type="submit" name="intent" value="add">
            添加到当前页
          </button>
          <button id="fill-example" type="button">填入示例</button>
        </form>
      </section>

      <section aria-labelledby="list-title">
        <h2 id="list-title">商品列表</h2>
        <p id="status" role="status">
          当前有 2 件内存商品，0 件收藏。
        </p>
        <ul id="listing-list" class="listing-list"></ul>
      </section>

      <section class="session" aria-labelledby="session-title">
        <h2 id="session-title">监听器会话</h2>
        <button id="stop-session" type="button">清理页面监听器</button>
        <button id="start-session" type="button">重新启动监听器</button>
        <p id="session-status">监听器会话已启动。</p>
      </section>

      <section aria-labelledby="log-title">
        <h2 id="log-title">最近事件</h2>
        <pre id="event-log">等待操作。</pre>
      </section>
    </main>

    <script>
      "use strict";

      const listings = [
        {
          id: "listing-101",
          title: "阅读台灯",
          category: "home-lighting",
          priceCents: 3900,
          createdAt: "2026-10-10T08:30:00.000Z"
        },
        {
          id: "listing-102",
          title: "榉木小凳",
          category: "furniture",
          priceCents: 6800,
          createdAt: "2026-10-10T09:00:00.000Z"
        }
      ];

      const favorites = new Set();
      const eventLines = [];
      let nextListingNumber = 103;
      let sessionController = null;

      const list = document.querySelector("#listing-list");
      const form = document.querySelector("#listing-form");
      const title = document.querySelector("#title");
      const category = document.querySelector("#category");
      const priceCents = document.querySelector("#price-cents");
      const titlePreview = document.querySelector("#title-preview");
      const status = document.querySelector("#status");
      const eventLog = document.querySelector("#event-log");
      const rules = document.querySelector("#market-rules");
      const rulesLink = document.querySelector("#rules-link");
      const cancelRuleLink = document.querySelector("#cancel-rule-link");
      const helpDialog = document.querySelector("#help-dialog");
      const openHelp = document.querySelector("#open-help");
      const closeHelp = document.querySelector("#close-help");
      const fillExample = document.querySelector("#fill-example");
      const stopSession = document.querySelector("#stop-session");
      const startSession = document.querySelector("#start-session");
      const sessionStatus = document.querySelector("#session-status");

      function formatCents(value) {
        if (!Number.isSafeInteger(value)) {
          throw new TypeError("priceCents 必须是安全整数。");
        }

        const sign = value < 0 ? "-" : "";
        const absolute = Math.abs(value);
        const yuan = Math.trunc(absolute / 100);
        const cents = String(absolute % 100).padStart(2, "0");
        return `${sign}¥${yuan}.${cents}`;
      }

      function addLog(message) {
        eventLines.push(`${new Date().toISOString()} ${message}`);

        if (eventLines.length > 20) {
          eventLines.shift();
        }

        eventLog.textContent = eventLines.join("\n");
      }

      function createListingItem(listing) {
        const item = document.createElement("li");
        const article = document.createElement("article");
        const heading = document.createElement("h3");
        const price = document.createElement("p");
        const meta = document.createElement("p");
        const button = document.createElement("button");
        const icon = document.createElement("span");
        const label = document.createElement("span");

        item.dataset.listingId = listing.id;
        article.className = "listing";
        heading.textContent = listing.title;
        price.textContent = `价格：${formatCents(listing.priceCents)}`;
        meta.textContent =
          `分类：${listing.category}；创建时间：${listing.createdAt}`;

        button.type = "button";
        button.className = "favorite";
        button.dataset.action = "favorite";
        button.dataset.listingId = listing.id;
        button.setAttribute(
          "aria-pressed",
          String(favorites.has(listing.id))
        );

        icon.textContent = favorites.has(listing.id) ? "★" : "☆";
        icon.setAttribute("aria-hidden", "true");
        label.textContent = `收藏${listing.title}`;

        button.append(icon, " ", label);
        article.append(heading, price, meta, button);
        item.append(article);
        return item;
      }

      function renderListings() {
        const fragment = document.createDocumentFragment();

        for (const listing of listings) {
          fragment.append(createListingItem(listing));
        }

        list.replaceChildren(fragment);
        status.textContent =
          `当前有 ${listings.length} 件内存商品，` +
          `${favorites.size} 件收藏。`;
      }

      function toggleFavorite(listingId, button) {
        const listing = listings.find(
          (listing) => listing.id === listingId
        );

        if (!listing) {
          addLog(`忽略未知商品：${listingId}`);
          return;
        }

        if (favorites.has(listingId)) {
          favorites.delete(listingId);
        } else {
          favorites.add(listingId);
        }

        const pressed = favorites.has(listingId);
        button.setAttribute("aria-pressed", String(pressed));
        button.querySelector("[aria-hidden='true']").textContent =
          pressed ? "★" : "☆";
        status.textContent =
          `${pressed ? "已收藏" : "已取消收藏"}${listing.title}；` +
          `当前共收藏 ${favorites.size} 件。状态只在本页内存中。`;
        addLog(
          `${listingId} 收藏状态=${pressed}`
        );
      }

      function handleListClick(event) {
        if (!(event.target instanceof Element)) {
          return;
        }

        const button = event.target.closest(
          "button[data-action='favorite']"
        );

        if (!button || !list.contains(button)) {
          return;
        }

        addLog(
          [
            "委托 click",
            `target=${event.target.tagName.toLowerCase()}`,
            `currentTarget=${event.currentTarget.id}`,
            `phase=${event.eventPhase}`
          ].join(" ")
        );

        toggleFavorite(button.dataset.listingId, button);
      }

      function handleInput(event) {
        if (
          event.target instanceof HTMLInputElement &&
          event.target.matches("#title")
        ) {
          titlePreview.textContent =
            event.target.value.trim() || "尚未输入";
          addLog(`input 标题长度=${event.target.value.length}`);
        }

        if (
          event.target instanceof HTMLInputElement &&
          event.target.matches("#price-cents")
        ) {
          event.target.setCustomValidity("");
        }
      }

      function handleChange(event) {
        if (
          event.target instanceof HTMLSelectElement &&
          event.target.matches("#category")
        ) {
          addLog(`change 分类=${event.target.value || "(空)"}`);
        }
      }

      function handleInvalid(event) {
        if (event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLSelectElement) {
          addLog(
            `invalid capture id=${event.target.id} ` +
            `message=${event.target.validationMessage}`
          );
        }
      }

      function handleSubmit(event) {
        event.preventDefault();

        const data = new FormData(form);
        const numericPrice = Number(data.get("priceCents"));

        if (!Number.isSafeInteger(numericPrice)) {
          priceCents.setCustomValidity("价格必须是安全整数分。");
          priceCents.reportValidity();
          addLog("submit 被业务规则拒绝：价格不是安全整数分");
          return;
        }

        priceCents.setCustomValidity("");

        const listing = {
          id: `listing-${nextListingNumber}`,
          title: String(data.get("title")).trim(),
          category: String(data.get("category")),
          priceCents: numericPrice,
          createdAt: new Date().toISOString()
        };

        nextListingNumber += 1;
        listings.push(listing);
        form.reset();
        titlePreview.textContent = "尚未输入";
        renderListings();
        addLog(
          `submit 添加 ${listing.id} ` +
          `submitter=${event.submitter?.value || "(无)"}`
        );
      }

      function handleRulesLink(event) {
        if (cancelRuleLink.checked) {
          event.preventDefault();
        }

        addLog(
          `链接 click cancelable=${event.cancelable} ` +
          `defaultPrevented=${event.defaultPrevented}`
        );
      }

      function handleRulesToggle(event) {
        addLog(
          `toggle open=${event.currentTarget.open} ` +
          `cancelable=${event.cancelable}`
        );
      }

      function handleOpenHelp() {
        helpDialog.showModal();
        addLog("按钮命令：showModal()");
      }

      function handleCloseHelp() {
        helpDialog.close("acknowledged");
      }

      function handleDialogClose(event) {
        addLog(
          `close returnValue=${event.currentTarget.returnValue} ` +
          `bubbles=${event.bubbles}`
        );
      }

      function handleFillExample() {
        title.value = "藤编收纳篮";
        category.value = "furniture";
        priceCents.value = "5200";
        priceCents.setCustomValidity("");
        titlePreview.textContent = title.value;
        addLog("按钮命令：填入示例；脚本赋值未伪装 input/change");
      }

      function startListenerSession() {
        if (sessionController) {
          sessionController.abort();
        }

        sessionController = new AbortController();
        const { signal } = sessionController;

        list.addEventListener("click", handleListClick, { signal });
        form.addEventListener("input", handleInput, { signal });
        form.addEventListener("change", handleChange, { signal });
        form.addEventListener("submit", handleSubmit, { signal });
        form.addEventListener("invalid", handleInvalid, {
          capture: true,
          signal
        });
        rulesLink.addEventListener("click", handleRulesLink, { signal });
        rules.addEventListener("toggle", handleRulesToggle, { signal });
        openHelp.addEventListener("click", handleOpenHelp, { signal });
        closeHelp.addEventListener("click", handleCloseHelp, { signal });
        helpDialog.addEventListener("close", handleDialogClose, { signal });
        fillExample.addEventListener("click", handleFillExample, { signal });

        sessionStatus.textContent = "监听器会话已启动。";
        addLog("监听器会话启动");
      }

      stopSession.addEventListener("click", () => {
        if (sessionController) {
          sessionController.abort();
          sessionController = null;
        }

        sessionStatus.textContent =
          "监听器已清理；列表、表单和说明控件暂不响应脚本。";
        addLog("监听器会话清理");
      });

      startSession.addEventListener("click", () => {
        startListenerSession();
      });

      renderListings();
      startListenerSession();
    </script>
  </body>
</html>
```

### 7.4 代码执行顺序

#### 点击嵌套星形

1. `click` 从星形 `span` 开始分派；
2. 事件冒泡到 `#listing-list`；
3. `handleListClick()` 看到 `target` 是 `span`；
4. `closest()` 找到最近的收藏按钮；
5. `list.contains(button)` 确认按钮属于当前列表；
6. 从 `button.dataset.listingId` 读取稳定 ID；
7. `toggleFavorite()` 更新内存 `Set`；
8. 原按钮原地更新星形和 `aria-pressed`，不会因重建节点丢失焦点；
9. 稳定的按钮名称、状态区域和 UTC 事件日志保持一致。

#### 提交新增商品

1. 用户点击提交按钮或从表单触发正常提交；
2. 浏览器先执行原生约束验证；
3. 无效控件产生 `invalid`，表单在捕获阶段记录；
4. 无效时 `submit` 不会发生；
5. 有效时 `submit` 冒泡到表单监听器；
6. 监听器 `preventDefault()`，因此没有网络导航；
7. `FormData` 读取当前值；
8. 价格转换为 Number 并检查安全整数；
9. 新商品获得当前页 ID 和 `new Date().toISOString()`；
10. 商品进入内存数组；
11. 表单重置，列表重绘；
12. 刚加入的收藏按钮无需单独绑定，也能被容器委托处理。

#### 清理监听器

1. “清理页面监听器”自身不属于会话信号；
2. 它调用当前 `AbortController.abort()`；
3. 列表、表单、链接、`details` 和 `dialog` 的会话监听器统一移除；
4. 原生链接导航和原生表单约束仍可能工作，因为清理脚本监听器不等于关闭浏览器行为；
5. “重新启动”创建新的控制器和新信号；
6. 命名处理函数只注册一次，不产生重复日志。

### 7.5 运行方法

1. 打开 `delegated-market.html`；
2. 点击第一件商品的星形，检查日志中 `target=span`；
3. 点击按钮文字，检查 `target=button` 或内部文字对应的元素路径；
4. 确认两种点击都切换同一商品；
5. 在标题中逐字输入，观察 `input` 和预览；
6. 选择分类，观察 `change`；
7. 保持必填字段为空并尝试提交，观察 `invalid capture`；
8. 输入标题、分类和整数分价格，提交；
9. 检查新商品时间以 `Z` 结尾；
10. 点击新商品的星形，证明无需新增监听器；
11. 点击规则链接，检查默认片段导航；
12. 勾选“取消链接默认跳转”后再点，检查 `defaultPrevented=true`；
13. 展开和收起规则，检查 `toggle`；
14. 打开并关闭操作说明，检查 `close` 和 `returnValue`；
15. 点击“填入示例”，确认值变化但没有伪造 `input`/`change`；
16. 清理会话，再尝试收藏和提交；
17. 重新启动会话，再次收藏，确认每次只有一条委托处理日志；
18. 打开 Network 面板，确认没有商品请求；
19. 刷新页面，确认动态商品和收藏消失。

### 7.6 预期结果

- 初始商品数为 2，收藏数为 0；
- 点击嵌套星形与按钮文字都能切换收藏；
- 收藏状态来自 `favorites`，`aria-pressed` 与可见文字同步；
- 动态商品不用单独注册收藏监听器；
- 标题逐字编辑触发 `input`；
- 分类完成选择触发 `change`；
- 无效控件触发捕获日志，且无效表单不进入 `submit`；
- 有效提交被取消默认导航，只创建内存对象；
- `priceCents` 是安全整数，例如 `5200`，不是 52 元浮点数；
- `createdAt` 是带 `Z` 的 UTC ISO 字符串；
- 链接默认导航与按钮命令不同；
- 取消链接后 `defaultPrevented` 为 `true`，传播日志仍可发生；
- `toggle` 在规则开闭后记录当前 `open`；
- `close` 直接由 `dialog` 记录，`bubbles=false`；
- 清理后会话处理停止；
- 重启后没有重复监听；
- Network 面板无新增商品请求；
- 刷新恢复两件初始商品和零收藏。

### 7.7 失败证据与恢复记录

```text
文件路径：
浏览器与版本：
操作入口：
事件类型：
isTrusted：
target/currentTarget：
eventPhase/bubbles/cancelable：
defaultPrevented：
closest 结果：
listingId：
修改前 favorites：
修改后 favorites：
aria-pressed 与可见文字：
submitter：
invalid 捕获日志：
toggle/close 日志：
abort 后行为：
重启后单次日志数：
priceCents：
createdAt：
Network 请求：
刷新后状态：
根因：
最小恢复：
复验结果：
```

### 7.8 渐进扩展：增加删除动作而不增加监听器

为每张卡增加：

```html
<button type="button" data-action="remove" data-listing-id="listing-101">
  删除当前页商品
</button>
```

把委托处理扩展成动作路由：

```js
function handleListClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  const actionButton = event.target.closest("button[data-action]");

  if (!actionButton || !list.contains(actionButton)) {
    return;
  }

  const { action, listingId } = actionButton.dataset;

  if (action === "favorite") {
    toggleFavorite(listingId, actionButton);
    return;
  }

  if (action === "remove") {
    removeListing(listingId);
  }
}
```

`removeListing()` 的答案标准：

- 按稳定 ID 从 `listings` 删除；
- 同时从 `favorites` 删除，避免孤立状态；
- 再渲染列表和状态；
- 若焦点位于即将删除的按钮，删除后把焦点移到合理的相邻按钮或列表标题；
- 删除只影响当前页内存；
- 不为删除按钮新增逐项监听器；
- 未知动作明确忽略，不执行任意字符串对应的函数。

## 8. 常见错误与排查路径

### 8.1 明确错误：用新匿名函数移除监听器

- **现象**：调用 `removeEventListener()` 后仍持续触发；
- **证据**：注册和移除各写了一个箭头函数字面量；
- **根因**：函数对象不同；
- **修复**：保存命名函数或同一变量引用；
- **复验**：移除后连续两次操作均无该监听器日志。

### 8.2 明确错误：点击图标时委托失效

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

### 8.3 明确错误：把 `currentTarget` 当成被点击按钮

在列表委托中，`currentTarget` 是列表，不是收藏按钮。若读取：

```js
event.currentTarget.dataset.listingId
```

结果通常为 `undefined`。应从经 `closest()` 定位的动作按钮读取 ID。

### 8.4 明确错误：异步读取 `currentTarget`

- **现象**：微任务或 Promise 中 `event.currentTarget` 为 `null`；
- **根因**：它只在监听器调用期间指向当前监听目标；
- **修复**：同步保存元素或所需 ID；
- **复验**：异步日志使用保存值，不依赖事件对象仍处于分派。

### 8.5 明确错误：用 `stopPropagation()` 取消链接

- **现象**：祖先日志消失，但页面仍导航；
- **根因**：传播和默认行为是独立轴；
- **修复**：若产品确实不应导航，先检查元素语义，再对可取消点击调用 `preventDefault()`；
- **复验**：`defaultPrevented=true` 且 URL 不变。

不要因为不理解上层监听器就到处停止传播。那会让分析、快捷键、弹层关闭或其他组件悄悄失效。

### 8.6 明确错误：认为 `preventDefault()` 会停止冒泡

- **现象**：链接未导航，但祖先委托仍有日志；
- **原因**：取消默认行为不影响传播；
- **修复**：若确需停止传播，应有独立协议和理由；
- **复验**：分别记录 `defaultPrevented` 与祖先日志，不把两者混写。

### 8.7 明确错误：在被动监听器中取消默认行为

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

### 8.8 明确错误：只监听提交按钮 `click`

- **现象**：鼠标点击可处理，按 Enter 或 `requestSubmit()` 路径遗漏；
- **根因**：监听的是某个入口，不是表单提交意图；
- **修复**：监听 form 的 `submit`，需要时读取 `event.submitter`；
- **复验**：点击和键盘提交进入同一处理函数。

### 8.9 明确错误：普通冒泡监听收不到 `invalid`

错误代码：

```js
form.addEventListener("invalid", handleInvalid);
```

- **现象**：浏览器显示无效提示，但表单没有日志；
- **根因**：`invalid` 不冒泡；
- **修复**：使用 `{ capture: true }`；
- **复验**：空表单提交时每个无效候选控件都有捕获日志。

### 8.10 明确错误：表单内命令按钮遗漏 `type`

- **现象**：点击“填入示例”意外触发表单验证或提交；
- **根因**：表单内 `button` 默认类型可能为 submit；
- **修复**：命令按钮显式 `type="button"`；
- **复验**：点击只修改示例值，不触发 `submit`。

### 8.11 明确错误：每次渲染后给所有按钮重新绑定

- **现象**：一次点击切换两次，视觉上像“没有变化”；
- **证据**：同一点击产生重复业务日志；
- **根因**：渲染函数重复注册，旧监听器未清理；
- **修复**：把一个委托监听器放在稳定列表容器；生命周期结束时用信号清理；
- **复验**：重绘十次后，一次点击仍只有一次状态更新。

### 8.12 明确错误：中止后复用旧信号

- **现象**：点击“重新启动”后监听器仍不工作；
- **证据**：`controller.signal.aborted === true`；
- **根因**：AbortSignal 的中止不可逆；
- **修复**：每次会话创建新的 `AbortController`；
- **复验**：重启后事件恢复，且单次操作没有重复日志。

### 8.13 明确错误：把 `toggle` 当成可取消的“打开前”事件

- **现象**：在 `toggle` 中调用 `preventDefault()`，`details` 仍已打开；
- **根因**：`toggle` 在状态变化后发生且不可取消；
- **修复**：用它观察结果；需要打开前规则时核对对应元素的前置事件或控制入口；
- **复验**：日志读取当前 `open`，不声称已阻止切换。

### 8.14 明确错误：在列表祖先等待 `dialog` 的 `close`

- **现象**：对话框关闭，但页面容器的普通冒泡监听没有日志；
- **根因**：`close` 不冒泡；
- **修复**：直接监听具体 `dialog`；
- **复验**：关闭后记录 `returnValue` 和 `bubbles=false`。

### 8.15 明确错误：用合成事件冒充真实用户激活

- **现象**：普通监听器执行，但剪贴板、弹窗或全屏 API 被拒绝；
- **证据**：`event.isTrusted === false`，没有有效用户激活；
- **根因**：脚本不能伪造可信输入；
- **修复**：把受保护 API 直接放在真实用户激活处理路径，并处理拒绝；
- **复验**：真实键盘或指针操作成功，合成事件仍只用于接线测试。

### 8.16 明确错误：把事件数据当成授权证据

`isTrusted` 不能证明用户有业务权限，`dataset.listingId` 也可被 DevTools 修改。真实收藏接口必须：

- 从可信会话确认身份；
- 检查商品是否存在和当前用户是否允许操作；
- 验证输入 ID；
- 处理重复请求和并发；
- 返回服务端最终状态。

本课没有接口，因此只显示“当前页收藏”，不能写“收藏已保存”。

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

### 10.3 故障注入：嵌套目标、重复监听与合成激活

在进阶练习副本中逐个制造故障，每次只改一项：

1. 把 `closest()` 改成只判断 `event.target.matches("button")`；
2. 每次渲染后重新注册列表监听器；
3. 中止后复用旧 `AbortSignal`；
4. 给 `wheel` 监听器使用 `passive: true`，再尝试取消；
5. 用 `dispatchEvent(new MouseEvent("click"))` 尝试调用受用户激活保护的 API。

记录模板：

```text
故障名称：
注入位置：
操作步骤：
事件属性证据：
target/currentTarget：
日志次数：
defaultPrevented：
signal.aborted：
isTrusted：
可见现象：
根因：
最小恢复：
复验结果：
未验证浏览器：
```

答案标准：

- 嵌套目标故障由 `target=span` 证明；
- 重复监听故障由单次点击多条业务日志证明；
- 旧信号故障由 `signal.aborted === true` 证明；
- 被动监听故障同时记录 Console、`cancelable` 和 `defaultPrevented`；
- 合成事件明确记录 `isTrusted=false`；
- 不通过删除日志、吞掉错误或关闭约束来制造“修复”；
- 每个故障都有修复前后同路径复验。

### 10.4 传播预期的 Node.js 检查

把 4.13 的纯脚本保存为：

```text
practice/html-14-events/propagation-expectations.js
```

执行：

```bash
node --check practice/html-14-events/propagation-expectations.js
node practice/html-14-events/propagation-expectations.js
```

预期：

```text
propagation expectations: PASS
```

故障注入：

- 交换 `outer bubble second` 与 `document bubble`；
- 再运行脚本；
- 应得到 `AssertionError`；
- 恢复顺序后重新通过。

这个练习验证纯预期，不验证浏览器 DOM。必须同时完成基础浏览器实验。

## 11. 阶段验收

### 注册与清理

- [ ] 能解释监听器由目标、类型、回调和捕获标记识别；
- [ ] 成功复现新匿名函数无法移除旧监听器；
- [ ] 使用同一命名函数引用完成移除；
- [ ] `capture` 的注册和移除匹配正确；
- [ ] `once` 第二次不执行；
- [ ] 一组监听器可由 `AbortController` 清理；
- [ ] 中止后重启使用新的控制器；
- [ ] 重启没有重复监听。

### 传播与目标

- [ ] 捕获、目标、冒泡顺序有日志；
- [ ] `eventPhase` 的 0、1、2、3 能解释；
- [ ] 目标上的捕获监听器知道自己处于 `AT_TARGET`；
- [ ] 图标点击时 `target` 与 `currentTarget` 有证据；
- [ ] 异步逻辑不依赖过期的 `currentTarget`；
- [ ] `matches()` 与 `closest()` 的差异可复现；
- [ ] `closest()` 结果有 `null` 与容器边界检查；
- [ ] 传播预测纯脚本通过 Node.js 检查。

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

### 合成事件与项目边界

- [ ] 合成事件记录 `isTrusted=false`；
- [ ] `dispatchEvent()` 的同步和返回值能解释；
- [ ] 构造事件时明确 `bubbles` 与 `cancelable`；
- [ ] 合成事件未被当作真实用户激活；
- [ ] `isTrusted` 未被当作服务端授权；
- [ ] 价格始终是安全整数分；
- [ ] 创建时间始终是 UTC ISO；
- [ ] Network 面板没有商品或收藏请求；
- [ ] 页面明确说明状态仅在内存；
- [ ] 刷新后动态商品和收藏消失。

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

### Q2：匿名函数一定不能用吗？

不是。无需单独移除、生命周期由 `once` 或 `signal` 管理时可以使用。若将来需要精确移除或复用，应保存引用。

### Q3：`removeEventListener()` 需要传回完全相同的 options 对象吗？

不需要同一个 options 对象。移除匹配关键是同一目标、类型、回调和相同 `capture` 值。但复用清晰配置有助于避免把捕获值写错。

### Q4：`once` 和 `signal` 应该选哪个？

只允许执行一次用 `once`；一组监听器随会话或组件共同结束用 `signal`。两者可以组合。

### Q5：事件委托总是性能更好吗？

不能只用“性能”判断。委托的主要价值是统一动态子项的接线和生命周期。若子元素事件不冒泡、逻辑差异巨大或边界不清，直接监听可能更简单。

### Q6：为什么委托不直接放在 `document`？

最近稳定祖先能表达所有权，减少无关事件过滤和组件冲突。商品动作属于商品列表，就放在列表上。

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

### Q15：`dispatchEvent()` 是异步的吗？

不是。监听器在当前调用栈中同步执行。浏览器产生的真实事件由事件循环安排，但一次分派内部的监听调用仍按规范顺序进行。

### Q16：`dispatchEvent()` 返回 `false` 是报错吗？

不是。对可取消事件，如果监听器成功调用 `preventDefault()`，它返回 `false`；否则返回 `true`。监听器抛错应单独观察 Console 和错误处理。

### Q17：`isTrusted === true` 能作为权限检查吗？

不能。它只描述事件来源，不描述用户身份、资源所有权或服务端授权。所有敏感操作仍需服务端检查。

### Q18：为什么 `toggle` 可能少于程序切换次数？

快速连续切换可能在事件循环有机会分派前被合并。业务状态应读取元素最终状态，不要把每个 `toggle` 当不可丢失的审计日志。

### Q19：为什么 `close` 不用委托？

`dialog` 的 `close` 不冒泡。直接监听具体对话框最清楚，也能直接读取 `returnValue`。

### Q20：清理监听器后链接为什么仍能跳转？

链接导航是浏览器默认行为，不是脚本监听器提供的。移除监听器只会移除脚本处理；若没有监听器取消默认行为，链接继续按语义工作。

## 13. 扩展阅读

资料、规范链接和兼容性说明核验日期：2026-10-10。

- [DOM Standard：Events](https://dom.spec.whatwg.org/#events)：核对事件分派、监听器、阶段、停止传播、取消和可信状态。
- [DOM Standard：EventTarget.addEventListener](https://dom.spec.whatwg.org/#dom-eventtarget-addeventlistener)：核对监听器选项、`once`、`passive` 和 `signal`。
- [DOM Standard：EventTarget.removeEventListener](https://dom.spec.whatwg.org/#dom-eventtarget-removeeventlistener)：核对回调与捕获标记的移除匹配。
- [WHATWG HTML：Activation behavior](https://html.spec.whatwg.org/multipage/interaction.html#activation-behavior-of-elements)：核对元素激活与点击行为。
- [WHATWG HTML：Tracking user activation](https://html.spec.whatwg.org/multipage/interaction.html#tracking-user-activation)：核对瞬时与历史用户激活边界。
- [WHATWG HTML：Form submission](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-2)：核对交互验证、提交事件和提交算法。
- [WHATWG HTML：Events index](https://html.spec.whatwg.org/multipage/indices.html#events-2)：查询 HTML 事件的目标、接口、冒泡与可取消属性。
- [MDN：addEventListener()](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)：快速查阅注册方式和选项示例。
- [MDN：removeEventListener()](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener)：复习同一函数引用和 `capture` 匹配。
- [MDN：Event.eventPhase](https://developer.mozilla.org/en-US/docs/Web/API/Event/eventPhase)：查阅阶段常量。
- [MDN：Event.target](https://developer.mozilla.org/en-US/docs/Web/API/Event/target)：复习原始目标。
- [MDN：Event.currentTarget](https://developer.mozilla.org/en-US/docs/Web/API/Event/currentTarget)：复习当前监听器目标和生命周期。
- [MDN：Element.matches()](https://developer.mozilla.org/en-US/docs/Web/API/Element/matches)：核对自身选择器匹配。
- [MDN：Element.closest()](https://developer.mozilla.org/en-US/docs/Web/API/Element/closest)：核对祖先查找和空结果。
- [MDN：Event.preventDefault()](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault)：核对 `cancelable`、`defaultPrevented` 和被动监听器边界。
- [MDN：Event.stopPropagation()](https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation)：核对传播停止边界。
- [MDN：Event.stopImmediatePropagation()](https://developer.mozilla.org/en-US/docs/Web/API/Event/stopImmediatePropagation)：核对同节点监听器停止边界。
- [MDN：submit event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit_event)：核对表单提交事件与 `submitter`。
- [MDN：invalid event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/invalid_event)：核对约束失败事件。
- [MDN：HTMLElement toggle event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/toggle_event)：核对状态切换、不可取消和事件合并。
- [MDN：HTMLDialogElement close event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close_event)：核对关闭事件不冒泡且不可取消。
- [MDN：Features gated by user activation](https://developer.mozilla.org/en-US/docs/Web/Security/User_activation)：查阅需要用户激活的 Web API。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对整数分、UTC 时间和教学状态边界。

阅读时区分：

- **事件分派规则**：以 DOM Standard 为准；
- **元素默认行为**：以 HTML Living Standard 对具体元素的算法为准；
- **实现表现**：原生提示、焦点、手势和兼容性需要在目标浏览器实测；
- **业务安全**：事件来源和客户端状态都不能替代服务端认证、授权、验证与并发控制。

## 我现在能做到什么

我能注册、移除并按生命周期清理事件监听器，预测捕获、目标和冒泡顺序，区分 `target` 与 `currentTarget`，并用 `closest()` 修复嵌套图标目标。我也能把默认行为与传播控制分开，按语义处理表单和状态事件，用一个委托监听器管理动态商品，并说明合成事件、可信事件与用户激活的边界。我的商品价格保持整数分，时间保持 UTC ISO，收藏和新增商品明确只存在当前页内存。

## 单元导航

- [上一课：DOM 查询、创建与修改](02-dom-query-mutation.md)
- [返回第六章入口](../06-interactive-dom.md)
- [下一课：template 与 Web Components](04-templates-web-components.md)
- [返回 HTML 模块](../README.md)
