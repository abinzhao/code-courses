# 监听器生命周期与事件传播

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 注册和移除事件监听器，使用 once 与 AbortSignal，并预测捕获、目标和冒泡顺序。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `EVT-001`、`EVT-002` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

注册和移除事件监听器，使用 once 与 AbortSignal，并预测捕获、目标和冒泡顺序。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 EVT-001（addEventListener、removeEventListener、AbortSignal）、EVT-002（捕获、目标、冒泡）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

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

预期：路径由实际分派目标开始，经过祖先直到全局对象。`composedPath()` 对 Shadow DOM 的显示还会受事件 `composed` 与 Shadow 边界影响，[本章第 12 课](12-shadow-dom-slots-progressive-enhancement.md)再处理该边界。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [事件委托与合成事件](09-event-delegation-synthetic-events.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 EVT-001（addEventListener、removeEventListener、AbortSignal） 对应的元素、属性或状态；
- 在项目中实现并标出与 EVT-002（捕获、目标、冒泡） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`09-event-delegation-synthetic-events.md`](09-event-delegation-synthetic-events.md)。

## 8. 常见错误与排查路径

### 8.1 明确错误：用新匿名函数移除监听器

- **现象**：调用 `removeEventListener()` 后仍持续触发；
- **证据**：注册和移除各写了一个箭头函数字面量；
- **根因**：函数对象不同；
- **修复**：保存命名函数或同一变量引用；
- **复验**：移除后连续两次操作均无该监听器日志。

### 8.2 明确错误：普通冒泡监听收不到 `invalid`

错误代码：

```js
form.addEventListener("invalid", handleInvalid);
```

- **现象**：浏览器显示无效提示，但表单没有日志；
- **根因**：`invalid` 不冒泡；
- **修复**：使用 `{ capture: true }`；
- **复验**：空表单提交时每个无效候选控件都有捕获日志。

### 8.3 明确错误：中止后复用旧信号

- **现象**：点击“重新启动”后监听器仍不工作；
- **证据**：`controller.signal.aborted === true`；
- **根因**：AbortSignal 的中止不可逆；
- **修复**：每次会话创建新的 `AbortController`；
- **复验**：重启后事件恢复，且单次操作没有重复日志。

### 8.4 明确错误：在列表祖先等待 `dialog` 的 `close`

- **现象**：对话框关闭，但页面容器的普通冒泡监听没有日志；
- **根因**：`close` 不冒泡；
- **修复**：直接监听具体 `dialog`；
- **复验**：关闭后记录 `returnValue` 和 `bubbles=false`。

## 9. 课后题

1. EVT-001（addEventListener、removeEventListener、AbortSignal）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

### 10.1 故障注入：嵌套目标、重复监听与合成激活

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

## 12. 常见问题

### Q2：匿名函数一定不能用吗？

不是。无需单独移除、生命周期由 `once` 或 `signal` 管理时可以使用。若将来需要精确移除或复用，应保存引用。

### Q3：`removeEventListener()` 需要传回完全相同的 options 对象吗？

不需要同一个 options 对象。移除匹配关键是同一目标、类型、回调和相同 `capture` 值。但复用清晰配置有助于避免把捕获值写错。

### Q4：`once` 和 `signal` 应该选哪个？

只允许执行一次用 `once`；一组监听器随会话或组件共同结束用 `signal`。两者可以组合。

### Q19：为什么 `close` 不用委托？

`dialog` 的 `close` 不冒泡。直接监听具体对话框最清楚，也能直接读取 `returnValue`。

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

- 能解释并验证：注册和移除事件监听器，使用 once 与 AbortSignal，并预测捕获、目标和冒泡顺序。
- `EVT-001`：addEventListener、removeEventListener、AbortSignal
- `EVT-002`：捕获、目标、冒泡
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：属性、dataset 与状态同步](06-dom-attributes-dataset-state-sync.md) · [下一课：事件目标、默认行为与语义事件](08-event-target-defaults-semantic-events.md) · [返回 HTML 模块](../README.md)
