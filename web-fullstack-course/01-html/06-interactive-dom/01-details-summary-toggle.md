# details、summary 与 toggle

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 复用 details、summary 的展开契约，观察 open、toggle 和命名组行为。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `INT-001` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

复用 details、summary 的展开契约，观察 open、toggle 和命名组行为。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 INT-001（`details`、`summary`、open、toggle）；
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
商品数据：写在页面脚本中的固定教学数据
规则开关：由 details.open 表示
当前预约：只保存在 JavaScript 对象中
价格帮助：由浏览器维护 popover 显示状态
刷新页面：所有预约状态恢复为 available
```

### 3.2 预备材料 2

```text
页面：确认哪些内容可见、背景能否操作
Elements：确认 open、name、popover 等属性变化
Console：记录 toggle、cancel、close 与活动焦点
键盘：Tab、Shift+Tab、Enter、Space、Esc
Network：确认案例没有预约请求
```

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

本章的完整项目代码集中在 [Dialog 模式、结果与焦点恢复](02-dialog-modal-focus-results.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 INT-001（`details`、`summary`、open、toggle） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`02-dialog-modal-focus-results.md`](02-dialog-modal-focus-results.md)。

## 8. 常见错误与排查路径

### 8.1 `open="false"` 仍然打开

- **现象**：details 或 dialog 仍处于 open 属性存在状态；
- **证据**：Elements 中仍有 `open="false"`；
- **原因**：`open` 是布尔属性；
- **修复**：移除属性，或对 details 设置 `.open = false`，对 dialog 使用 `.close()`；
- **复验**：属性消失，`.open === false`。

dialog 尤其应优先调用 `close()`，因为直接移除 `open` 可能绕开正常关闭事件和焦点流程。

### 8.2 同组多个初始 `open`

错误：

```html
<details name="rules" open>...</details>
<details name="rules" open>...</details>
```

规范要求同组不能有多个打开项。实现通常只保留源顺序中第一个为打开，但作者不应依赖浏览器修正误导性标记。

修复：只保留一个初始 `open`，或全部初始关闭。

### 8.3 无条件使用 `details[name]`

- **现象**：旧浏览器允许多个规则同时打开；
- **证据**：基础 details 可用，但 `"name" in document.createElement("details")` 为 `false`；
- **原因**：`name` 晚于基础 details；
- **修复**：接受非互斥回退，或只在不支持时添加小型 `toggle` 互斥脚本；
- **复验**：必要内容始终可读，互斥是否存在不会阻止任务。

### 8.4 把 `toggle` 次数当成每次赋值次数

错误测试：

```js
rule.open = true;
rule.open = false;
rule.open = true;
// 错误期待：一定收到三次 toggle
```

快速连续状态变化可能合并通知。应断言最终 `.open` 和最终事件状态，不把中间命令数量等同于事件数量。

## 9. 课后题

### 9.1 状态判断题

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

## 12. 常见问题

### Q1：`details` 可以做导航菜单吗？

它表示披露补充信息或控件，不是通用菜单语义。简单站点导航应使用 `nav` 和链接；需要完整菜单键盘模式时要按对应组件语义和交互实现，不能只因 details 能展开就替代。

### Q2：为什么不用 JavaScript 给 `summary` 切 `aria-expanded`？

原生 details 已维护自己的展开语义和状态。重复手工维护容易失同步。只有自造组件才需要承担完整状态、键盘和 ARIA 责任；本课不重造 details。

### Q3：命名 details 组是否等于 ARIA 手风琴？

它提供原生互斥披露，但产品仍要判断内容组织、标题和比较需求。不要仅为了“手风琴外观”忽略用户可能需要同时查看多项。

### Q4：`toggle` 能阻止 details 打开吗？

不能。它在状态改变后触发。若业务不允许访问某内容，应从权限和内容提供层解决，不要先显示再依赖后置事件藏回去。

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
- [邻里集市项目契约](../../00-guide/project-contract.md)：核对整数分、内存教学状态和服务端边界。

阅读时区分：

- **规范机制**：元素状态、事件顺序、顶层与模态算法；
- **兼容数据**：某项具体子特性从哪些版本开始实现；
- **产品选择**：当前内容应是披露、非模态帮助还是必须处理的确认；
- **运行证据**：目标浏览器、设备、键盘和辅助技术中的真实行为；
- **服务端边界**：前端交互不能提供身份、授权、持久化或并发控制。

## 我现在能做到什么

- 能解释并验证：复用 details、summary 的展开契约，观察 open、toggle 和命名组行为。
- `INT-001`：`details`、`summary`、open、toggle
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[返回本章目录](../README.md#第六章原生交互dom-与事件) · [下一课：Dialog 模式、结果与焦点恢复](02-dialog-modal-focus-results.md) · [返回 HTML 模块](../README.md)
