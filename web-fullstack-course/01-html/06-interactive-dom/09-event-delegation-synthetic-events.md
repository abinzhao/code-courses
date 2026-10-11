# 事件委托与合成事件

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 在稳定祖先上委托动态列表事件，并区分合成事件与真实用户操作。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `EVT-008` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

在稳定祖先上委托动态列表事件，并区分合成事件与真实用户操作。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 EVT-008（事件委托与动态列表）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 事件委托：监听稳定祖先，不逐个追赶动态节点

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

### 4.2 合成事件不等于真实用户操作

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

### 4.3 传播顺序可以先写成纯预期

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

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `EVT-008`：事件委托与动态列表

## 6. 最小可运行案例

在个人练习目录中新建 `practice/09-event-delegation-synthetic-events/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 EVT-008（事件委托与动态列表） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 在打开页面前写下预期 DOM、默认行为或请求结果；
4. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
5. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

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

### 8.1 明确错误：用合成事件冒充真实用户激活

- **现象**：普通监听器执行，但剪贴板、弹窗或全屏 API 被拒绝；
- **证据**：`event.isTrusted === false`，没有有效用户激活；
- **根因**：脚本不能伪造可信输入；
- **修复**：把受保护 API 直接放在真实用户激活处理路径，并处理拒绝；
- **复验**：真实键盘或指针操作成功，合成事件仍只用于接线测试。

### 8.2 明确错误：把事件数据当成授权证据

`isTrusted` 不能证明用户有业务权限，`dataset.listingId` 也可被 DevTools 修改。真实收藏接口必须：

- 从可信会话确认身份；
- 检查商品是否存在和当前用户是否允许操作；
- 验证输入 ID；
- 处理重复请求和并发；
- 返回服务端最终状态。

本课没有接口，因此只显示“当前页收藏”，不能写“收藏已保存”。

## 9. 课后题

1. EVT-008（事件委托与动态列表）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

### 10.1 传播预期的 Node.js 检查

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

## 12. 常见问题

### Q5：事件委托总是性能更好吗？

不能只用“性能”判断。委托的主要价值是统一动态子项的接线和生命周期。若子元素事件不冒泡、逻辑差异巨大或边界不清，直接监听可能更简单。

### Q6：为什么委托不直接放在 `document`？

最近稳定祖先能表达所有权，减少无关事件过滤和组件冲突。商品动作属于商品列表，就放在列表上。

### Q15：`dispatchEvent()` 是异步的吗？

不是。监听器在当前调用栈中同步执行。浏览器产生的真实事件由事件循环安排，但一次分派内部的监听调用仍按规范顺序进行。

### Q16：`dispatchEvent()` 返回 `false` 是报错吗？

不是。对可取消事件，如果监听器成功调用 `preventDefault()`，它返回 `false`；否则返回 `true`。监听器抛错应单独观察 Console 和错误处理。

### Q17：`isTrusted === true` 能作为权限检查吗？

不能。它只描述事件来源，不描述用户身份、资源所有权或服务端授权。所有敏感操作仍需服务端检查。

### Q18：为什么 `toggle` 可能少于程序切换次数？

快速连续切换可能在事件循环有机会分派前被合并。业务状态应读取元素最终状态，不要把每个 `toggle` 当不可丢失的审计日志。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：在稳定祖先上委托动态列表事件，并区分合成事件与真实用户操作。
- `EVT-008`：事件委托与动态列表
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：事件目标、默认行为与语义事件](08-event-target-defaults-semantic-events.md) · [下一课：Template、DocumentFragment 与克隆](10-template-fragment-clone.md) · [返回 HTML 模块](../README.md)
