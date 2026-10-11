# Shadow DOM、slot 与渐进增强

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 封装 Shadow DOM，分配 Light DOM 内容并观察 slot 变化，同时保留定义失败时的内容基线。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `INT-008`、`INT-009` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

封装 Shadow DOM，分配 Light DOM 内容并观察 slot 变化，同时保留定义失败时的内容基线。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 INT-008（Shadow DOM 封装边界）、INT-009（`slot`、fallback、assignedElements、slotchange）；
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

## 4. 核心理论

### 4.1 Shadow DOM：封装内部树

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

### 4.2 open 与 closed：可发现 API 差异，不是安全等级

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

### 4.3 `slot`：由组件决定 Light DOM 显示位置

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

### 4.4 fallback 内容：没有分配节点时的可见基线

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

### 4.5 `assignedElements()`：观察分配关系

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

### 4.6 `slotchange`：观察直接分配集合变化

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

### 4.7 渐进增强：定义失败时核心内容仍存在

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

### 5.1 Shadow DOM 与 slot

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

### 5.2 公开组件接口速查

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

在个人练习目录中新建 `practice/12-shadow-dom-slots-progressive-enhancement/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 INT-008（Shadow DOM 封装边界） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 INT-009（`slot`、fallback、assignedElements、slotchange） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

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

### 8.1 在构造器读取 Light DOM

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

### 8.2 把 `acknowledged="false"` 当 false

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

### 8.3 把 closed ShadowRoot 当安全容器

**错误结论：**

> 使用 `{ mode: "closed" }` 后，可以把访问令牌和用户身份证号写进组件。

**问题：**

- 数据已经发送到浏览器；
- closed 只改变 `host.shadowRoot` 的普通访问结果；
- 页面脚本、浏览器工具、扩展或创建方仍可能观察；
- 前端无法替代服务端最小授权与数据最小化。

**修复：**

不要把不需要展示的数据发送到浏览器。服务端执行身份、权限和字段过滤；Shadow DOM 只用于组件封装。

### 8.4 slot 名称不匹配

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

### 8.5 空分配元素遮住 fallback

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

### 8.6 期待 `slotchange` 观察全部文字变化

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

### 8.7 只在 Shadow DOM 放核心正文

**错误设计：**

组件定义前宿主为空，构造器执行后才生成唯一的安全提示。脚本加载失败时，用户完全看不到提示。

**修复：**

把核心业务正文作为 Light DOM 提供，Shadow DOM 负责布局、样式和增强操作。用 `:not(:defined)` 为未升级状态提供简单可见样式。

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

### 9.2 生命周期预测题

假设一个 `market-note` 已连接，依次执行：

```js
note.remove();
containerA.append(note);
containerB.append(note);
note.setAttribute("tone", "info");
```

写出可能发生的连接、断开和属性回调顺序，并说明不应依赖哪些“只调用一次”假设。

### 9.3 slot 推理题

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

## 10. 实践练习

### 10.1 提升：具名标题与 fallback

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

### 10.2 提交记录模板

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

### 11.1 Shadow DOM 与 slot

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

### 11.2 文件、运行、预期与失败证据

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

### Q9：可以在构造器中 `attachShadow()` 吗？

可以，这是常见的稳定内部结构初始化。不要在构造器依赖 Light DOM、父节点、最终属性或网络现场。每个宿主只能附加一个 ShadowRoot。

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

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：封装 Shadow DOM，分配 Light DOM 内容并观察 slot 变化，同时保留定义失败时的内容基线。
- `INT-008`：Shadow DOM 封装边界
- `INT-009`：`slot`、fallback、assignedElements、slotchange
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：自定义元素生命周期与属性同步](11-custom-elements-lifecycle-attributes.md) · [下一章](../07-accessibility-seo.md) · [返回 HTML 模块](../README.md)
