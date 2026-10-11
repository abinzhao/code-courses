# Dialog 模式、结果与焦点恢复

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 区分 dialog 状态、顶层和模态行为，处理关闭结果、取消、初始焦点与恢复。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `INT-002`、`INT-003` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

区分 dialog 状态、顶层和模态行为，处理关闭结果、取消、初始焦点与恢复。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 INT-002（`dialog`、show/showModal/close）、INT-003（cancel、close、method=dialog、焦点恢复）；
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
补充内容披露       → details + summary
必须先处理的确认   → dialog + showModal()
短暂的非模态浮层   → popover
```

### 3.2 预备材料 2

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

## 4. 核心理论

### 4.1 dialog 的三种可观察状态

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

### 4.2 顶层、`::backdrop` 与模态

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

### 4.3 `close()` 与 `returnValue`

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

### 4.4 `method="dialog"`：关闭但不发送

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

### 4.5 `cancel` 与 `close`

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

### 4.6 初始焦点与明确关闭入口

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

### 4.7 关闭后的焦点恢复

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

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `INT-002`：`dialog`、show/showModal/close
- `INT-003`：cancel、close、method=dialog、焦点恢复

## 6. 最小可运行案例

在个人练习目录中新建 `practice/02-dialog-modal-focus-results/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 INT-002（`dialog`、show/showModal/close） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 INT-003（cancel、close、method=dialog、焦点恢复） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

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

### 8.2 dialog 模式冲突

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

### 8.3 直接切 `dialog.open`

错误：

```js
reservationDialog.open = true;
```

这最多建立非模态 open 状态，不会获得 `showModal()` 的顶层和背景 inert。关闭时直接写 `false` 也可能绕过应有的 `close` 事件。

恢复：用 `show()`、`showModal()` 和 `close()` 表达生命周期。

### 8.4 忘记重置 `returnValue`

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

### 8.5 混淆“取消按钮”和 `cancel` 事件

`method="dialog"` 中的取消按钮只是以 `value="cancel"` 提交并关闭。Esc 等关闭请求才触发 `cancel` 事件。监听日志时应区分：

```text
取消按钮：submit → close，returnValue="cancel"
Esc：cancel → 未阻止则 close，returnValue 通常保持本轮当前值
close("x")：直接关闭 → close，returnValue="x"
```

不要把所有非确认关闭都写成一定经过 `cancel`。

### 8.6 无理由阻止 Esc

- **现象**：键盘用户无法退出；
- **证据**：`cancel` 监听器始终调用 `preventDefault()`；
- **原因**：把“必须确认”误解成“不能取消”；
- **修复**：默认允许关闭并保留可见取消按钮；只有确实会丢失重要输入时才阻止并解释；
- **复验**：Esc 和触摸可用的取消按钮都能退出。

### 8.7 关闭后只聚焦旧入口

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

### 8.8 把 `z-index` 当顶层

普通元素即使 `z-index: 999999`，仍可能受祖先堆叠上下文、裁剪和变换影响，也不会自动获得模态、关闭和焦点行为。应选择 dialog/popover 的原生顶层入口，而不是不断增大数字。

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

### 9.2 事件顺序题

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

### 9.3 焦点恢复题

关闭预约 dialog 时有三个候选目标：

```text
预约按钮：已禁用，但仍连接
商品标题：tabindex="-1"，仍连接且可见
页面标题：tabindex="-1"，仍连接且可见
```

应选择哪个？如果商品卡也被删除呢？

答案：已禁用按钮不能作为恢复目标，应聚焦商品标题；商品卡删除后商品标题断开连接，应聚焦页面标题。判断不能只看变量是否非空，还要检查连接、禁用、隐藏和 inert 状态。

### 9.4 选型题

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

### 10.1 进阶：可恢复的预约确认

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

### 10.2 故障注入：模式、结果与焦点

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

## 11. 阶段验收

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

### Q14：给 popover 加 `role="dialog"` 会变成模态吗？

不会。ARIA 只改变可访问性语义，不会创造背景 inert、焦点限制或 modal dialog 生命周期。必须先选择正确原生行为。

### Q20：内存预约能用于真实商品吗？

不能。它没有身份、授权、服务器当前状态、事务、唯一约束、幂等和冲突处理。刷新丢失只是教学证据，不是业务实现。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：区分 dialog 状态、顶层和模态行为，处理关闭结果、取消、初始焦点与恢复。
- `INT-002`：`dialog`、show/showModal/close
- `INT-003`：cancel、close、method=dialog、焦点恢复
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：details、summary 与 toggle](01-details-summary-toggle.md) · [下一课：Popover、调用者与回退](03-popover-invokers-fallback.md) · [返回 HTML 模块](../README.md)
