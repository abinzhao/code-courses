# 内存状态、焦点与可访问交互

## 任务卡

- **本课产出**：`js-lab/dom-market/index.html`、`app.mjs`、`server.mjs` 三个完整文件。
- **运行环境**：Node.js 24 LTS 启动静态服务，Chromium 执行页面逻辑。
- **预计时间**：120 分钟。
- **完成证据**：完成发布、校验失败、收藏、筛选、移除、焦点恢复和刷新复位的键盘路径，Console 零未处理错误。

## 1. 任务背景

安全创建节点和正确接收事件只是起点。重新渲染会移除旧节点；若不恢复焦点，键盘用户会突然回到页面起点。筛选视图若直接删改源数组，也会把“暂时不显示”错误变成“数据已删除”。

本课完成邻里集市的原生 DOM 内存应用。它刻意标注教学边界：刷新会恢复初始数据，收藏和移除只影响当前标签页，按钮不证明身份，也不授予服务器对象权限。

## 2. 学习目标

完成本课后，你能够：

1. 把商品、收藏集合、筛选条件和本地 ID 放在显式状态中；
2. 从状态完整渲染列表、汇总和空状态；
3. 使用 `Set` 保存稳定商品 ID，而不是数组下标；
4. 用 `aria-pressed` 表达收藏与筛选按钮状态；
5. 通过状态消息向辅助技术报告操作结果；
6. 在重渲染、项目消失或删除后恢复合理焦点；
7. 让筛选视图不破坏源商品集合；
8. 严格区分页面内存、浏览器持久化、服务端保存和授权。

## 3. 预备知识

先完成本章前两课，确认会使用 `textContent`、表单 `submit` 和列表委托。创建目录：

```bash
mkdir -p js-lab/dom-market
```

本应用没有 `localStorage`、Cookie、登录或写 API。不要擅自把这些能力补进来，也不要把“移除”按钮改名成暗示真实删除的文案。

## 4. 核心理论

### 4.1 状态、派生视图和 DOM 分层

状态保存事实：

```text
listings + favoriteIds + filter + nextLocalId
```

可见列表由状态派生，不单独存一份：

```text
filter === "favorites"
  ? listings 中 ID 位于 favoriteIds 的记录
  : listings
```

DOM 每次从派生结果重建。筛选不会删除 `listings`，取消收藏也只修改 `Set`。

### 4.2 `Set` 只解决当前内存中的唯一成员关系

`Set` 适合表达某 ID 是否被收藏，但不验证 ID 来自有效商品，也不提供跨标签页同步、后端唯一约束或持久化。删除商品时要显式清理对应收藏 ID，避免悬空状态。

### 4.3 状态反馈和切换按钮

收藏与筛选是可切换动作，使用原生 `<button>` 并同步 `aria-pressed`。toggle button 的名称保持
稳定，不随按下状态改成相反动作；操作结果写入 `role="status"`、`aria-live="polite"` 区域，
不要只靠颜色或图标表达状态。

### 4.4 重渲染必须设计焦点去向

若操作后的同一按钮仍存在，焦点回到该按钮。若在“只看收藏”中取消收藏导致当前项消失，焦点回到当前筛选按钮。删除后优先聚焦相邻项；列表为空时回到筛选按钮。

焦点恢复是状态转换的一部分，不是最后添加的视觉补丁。只有真实存在、语义正确的控件才应接收焦点。

## 5. 元素、属性、API 或配置清单

| API 或属性 | 用途 | 边界 |
| --- | --- | --- |
| `Set.prototype.has/add/delete` | 保存收藏 ID | 只属于当前内存 |
| `button[aria-pressed]` | 表达二态按钮 | 值使用 `"true"` / `"false"` |
| `role="status"` | 非打断式状态反馈 | 内容变化时播报 |
| `aria-live="polite"` | 合适时机播报 | 不替代可见文字 |
| `HTMLElement.focus()` | 恢复键盘位置 | 目标必须仍在 DOM 中 |
| `document.activeElement` | 观察当前焦点 | 不能单独证明交互可用 |
| `form.reset()` | 恢复表单默认值 | 不清理应用状态 |
| `button.type = "button"` | 避免意外提交 | 提交按钮使用 `"submit"` |
| `dataset.listingId` | 节点关联稳定 ID | 不作为授权凭据 |

## 6. 最小可运行案例

先理解焦点恢复的最小模式：

```js
function renderAndRestoreFocus({ listingId, action }) {
  render();
  const buttons = list.querySelectorAll("button[data-listing-id]");
  const target = [...buttons].find(
    (button) =>
      button.dataset.listingId === listingId &&
      button.dataset.action === action,
  );
  if (target instanceof HTMLButtonElement) {
    target.focus();
  } else {
    activeFilterButton().focus();
  }
}
```

关键不是选择器写法，而是调用者在更新状态前后明确决定：原控件仍存在、应该转到相邻项，还是回到稳定的筛选控件。完整实现见下一节。

## 7. 邻里集市集成案例

### 7.1 页面

完整文件 `js-lab/dom-market/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>邻里集市 DOM 内存练习</title>
  </head>
  <body>
    <main>
      <h1>邻里集市</h1>
      <p id="mode-note">
        教学内存模式：刷新会恢复初始商品；收藏与移除不会写入服务器。
      </p>

      <section aria-labelledby="publish-title">
        <h2 id="publish-title">发布到内存列表</h2>
        <form id="publish-form">
          <label for="title">商品标题</label>
          <input
            id="title"
            name="title"
            required
            maxlength="80"
            autocomplete="off"
          />

          <label for="price">价格（元）</label>
          <input
            id="price"
            name="price"
            required
            inputmode="decimal"
            autocomplete="off"
          />

          <button type="submit">发布到内存列表</button>
        </form>
      </section>

      <section aria-labelledby="catalog-title">
        <h2 id="catalog-title">商品列表</h2>
        <div id="filters" aria-label="商品筛选">
          <button type="button" data-filter="all" aria-pressed="true">
            全部
          </button>
          <button type="button" data-filter="favorites" aria-pressed="false">
            只看收藏
          </button>
        </div>
        <p id="message" role="status" aria-live="polite"></p>
        <p id="summary"></p>
        <ul id="listing-list" aria-describedby="mode-note"></ul>
      </section>
    </main>

    <script type="module" src="./app.mjs"></script>
  </body>
</html>
```

### 7.2 应用脚本

完整文件 `js-lab/dom-market/app.mjs`：

```js
const form = document.querySelector("#publish-form");
const filters = document.querySelector("#filters");
const message = document.querySelector("#message");
const summary = document.querySelector("#summary");
const list = document.querySelector("#listing-list");

if (!(form instanceof HTMLFormElement)) {
  throw new Error("required element missing: #publish-form");
}
if (!(filters instanceof HTMLDivElement)) {
  throw new Error("required element missing: #filters");
}
if (!(message instanceof HTMLParagraphElement)) {
  throw new Error("required element missing: #message");
}
if (!(summary instanceof HTMLParagraphElement)) {
  throw new Error("required element missing: #summary");
}
if (!(list instanceof HTMLUListElement)) {
  throw new Error("required element missing: #listing-list");
}

const initialListings = [
  {
    id: "listing-1",
    title: "台灯",
    priceCents: 1990,
    status: "available",
  },
  {
    id: "listing-2",
    title: "闲置木椅",
    priceCents: 0,
    status: "available",
  },
];

const state = {
  listings: initialListings.map((item) => ({ ...item })),
  favoriteIds: new Set(),
  filter: "all",
  nextLocalId: 1,
};

function parseYuanToCents(rawValue) {
  const value = rawValue.trim();
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new RangeError("价格应为非负金额，最多两位小数。");
  }

  const yuan = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = yuan * 100 + Number(fraction);
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError("价格超出安全范围。");
  }
  return cents;
}

function formatCents(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("invalid cents in state");
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function visibleListings() {
  if (state.filter === "favorites") {
    return state.listings.filter((item) => state.favoriteIds.has(item.id));
  }
  return state.listings;
}

function createListingItem(listing) {
  const item = document.createElement("li");
  item.dataset.listingId = listing.id;

  const title = document.createElement("h3");
  title.textContent = listing.title;

  const price = document.createElement("p");
  price.textContent = `¥${formatCents(listing.priceCents)}`;

  const favorite = document.createElement("button");
  const isFavorite = state.favoriteIds.has(listing.id);
  favorite.type = "button";
  favorite.dataset.action = "favorite";
  favorite.dataset.listingId = listing.id;
  favorite.setAttribute("aria-pressed", String(isFavorite));
  favorite.textContent = "收藏";

  const remove = document.createElement("button");
  remove.type = "button";
  remove.dataset.action = "remove";
  remove.dataset.listingId = listing.id;
  remove.textContent = "从内存移除";

  item.append(title, price, favorite, " ", remove);
  return item;
}

function activeFilterButton() {
  const button = [...filters.querySelectorAll("button[data-filter]")].find(
    (candidate) => candidate.dataset.filter === state.filter,
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`filter button missing: ${state.filter}`);
  }
  return button;
}

function findActionButton(listingId, action) {
  return [...list.querySelectorAll("button[data-listing-id]")].find(
    (button) =>
      button.dataset.listingId === listingId &&
      button.dataset.action === action,
  );
}

function render(focusRequest = null) {
  const visible = visibleListings();
  const fragment = document.createDocumentFragment();

  if (visible.length === 0) {
    const empty = document.createElement("li");
    empty.textContent =
      state.filter === "favorites" ? "还没有收藏商品。" : "暂无商品。";
    fragment.append(empty);
  } else {
    for (const listing of visible) {
      fragment.append(createListingItem(listing));
    }
  }
  list.replaceChildren(fragment);

  summary.textContent = `显示 ${visible.length} 件，共 ${state.listings.length} 件内存商品。`;
  for (const button of filters.querySelectorAll("button[data-filter]")) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.filter === state.filter),
    );
  }

  if (focusRequest) {
    const target = findActionButton(
      focusRequest.listingId,
      focusRequest.action,
    );
    if (target instanceof HTMLButtonElement) {
      target.focus();
    } else {
      activeFilterButton().focus();
    }
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const rawTitle = data.get("title");
  const rawPrice = data.get("price");
  const title = typeof rawTitle === "string" ? rawTitle.trim() : "";

  if (title.length < 2 || title.length > 80) {
    message.textContent = "标题长度应为 2 到 80 个字符。";
    return;
  }
  if (typeof rawPrice !== "string") {
    message.textContent = "价格字段缺失。";
    return;
  }

  let priceCents;
  try {
    priceCents = parseYuanToCents(rawPrice);
  } catch (error) {
    message.textContent =
      error instanceof Error ? error.message : "价格格式无效。";
    return;
  }

  const listing = {
    id: `local-${state.nextLocalId}`,
    title,
    priceCents,
    status: "available",
  };
  state.nextLocalId += 1;
  state.listings = [listing, ...state.listings];
  state.filter = "all";
  form.reset();
  message.textContent = `已将“${title}”加入当前页面内存。`;
  render({ listingId: listing.id, action: "favorite" });
});

filters.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("button[data-filter]");
  if (!(button instanceof HTMLButtonElement) || !filters.contains(button)) {
    return;
  }
  const nextFilter = button.dataset.filter;
  if (nextFilter !== "all" && nextFilter !== "favorites") return;

  state.filter = nextFilter;
  message.textContent =
    nextFilter === "all" ? "正在显示全部商品。" : "正在显示收藏商品。";
  render();
  activeFilterButton().focus();
});

list.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest("button[data-action][data-listing-id]");
  if (!(button instanceof HTMLButtonElement) || !list.contains(button)) return;

  const { action, listingId } = button.dataset;
  const listing = state.listings.find((item) => item.id === listingId);
  if (!listing) {
    message.textContent = "商品已不在当前内存状态中。";
    render();
    return;
  }

  if (action === "favorite") {
    if (state.favoriteIds.has(listing.id)) {
      state.favoriteIds.delete(listing.id);
      message.textContent = `已取消收藏“${listing.title}”。`;
    } else {
      state.favoriteIds.add(listing.id);
      message.textContent = `已收藏“${listing.title}”。`;
    }
    render({ listingId: listing.id, action: "favorite" });
    return;
  }

  if (action === "remove") {
    const before = visibleListings();
    const removedIndex = before.findIndex((item) => item.id === listing.id);
    state.listings = state.listings.filter((item) => item.id !== listing.id);
    state.favoriteIds.delete(listing.id);

    const after = visibleListings();
    const nextIndex = Math.min(Math.max(removedIndex, 0), after.length - 1);
    const nextListing = after[nextIndex];
    message.textContent = `已从当前页面内存移除“${listing.title}”。`;
    render(
      nextListing
        ? { listingId: nextListing.id, action: "favorite" }
        : { listingId: "", action: "" },
    );
  }
});

render();
```

### 7.3 静态服务

完整文件 `js-lab/dom-market/server.mjs`：

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const host = "127.0.0.1";
const port = 4173;
const routes = new Map([
  ["/", { file: "index.html", type: "text/html; charset=utf-8" }],
  ["/app.mjs", { file: "app.mjs", type: "text/javascript; charset=utf-8" }],
]);

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${host}`).pathname;
  const route = routes.get(pathname);
  if (!route) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("not found");
    return;
  }

  try {
    const body = await readFile(new URL(route.file, import.meta.url));
    response.writeHead(200, { "content-type": route.type });
    response.end(body);
  } catch (error) {
    console.error(error);
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("server error");
  }
});

server.listen(port, host, () => {
  console.log(`DOM market: http://${host}:${port}`);
});

function shutdown() {
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
```

运行：

```bash
node dom-market/server.mjs
```

访问 `http://127.0.0.1:4173`。结束时按 `Control-C`。

## 8. 常见错误与排查路径

### 错误示例：重渲染后不恢复焦点

```js
state.favoriteIds.delete(listing.id);
render();
```

五段诊断记录：

1. **现象**：在“只看收藏”中取消收藏后，键盘焦点落到 `<body>` 或不可预测位置。
2. **证据**：DevTools 执行 `document.activeElement`，结果不是可操作控件；继续按 Tab 会跳过用户预期位置。
3. **原因**：原按钮随列表重建而离开 DOM，代码没有为“项目消失”状态指定后继焦点。
4. **修复**：渲染后尝试同一动作按钮；不存在时聚焦当前筛选按钮，删除时优先相邻商品。
5. **复验**：仅用键盘取消收藏或删除，焦点留在筛选按钮或相邻商品按钮，操作可继续。

其他错误：

- 收藏用数组下标：筛选或重排后指向错误商品，应使用稳定 ID；
- 筛选直接覆盖 `state.listings`：切回“全部”无法恢复，应派生可见列表；
- `aria-pressed` 只初始化一次：视觉和辅助技术状态漂移，应在每次渲染同步；
- `parseFloat("12abc")` 被接受：改用完整正则匹配后再转整数分；
- 把“从内存移除”称为服务器删除：当前应用根本没有写请求。

## 9. 课后题

1. 为什么筛选结果不应另存成第二份可写状态？
2. `Set` 能否保证数据库收藏唯一？
3. 在收藏筛选中取消当前项后，焦点为什么回到筛选按钮？
4. 页面隐藏移除按钮能否阻止无权限请求？

**答案：**

1. 它可由商品和筛选条件派生，双份可写状态容易不一致。
2. 不能；它只保证当前 JavaScript `Set` 内成员唯一。
3. 当前项已不在视图中，筛选按钮是稳定、相关且可继续操作的位置。
4. 不能；攻击者可自行构造请求，服务端必须认证身份并检查对象授权。

## 10. 实践练习

### 基础练习

新增一个初始 0 分商品，确认发布、收藏、筛选和汇总都不会因 falsy 判断漏掉它。

### 进阶练习

增加“可用 / 全部状态”筛选，但仍保留单一 `listings` 源状态。为两个筛选维度定义明确的派生函数和按钮状态。

### 故障注入练习

临时删除 `render` 的焦点恢复分支，在收藏筛选中取消唯一收藏；记录 `document.activeElement`。恢复实现后重复路径并对比。

**可判定答案标准：**

- 所有操作可只用 Tab、Shift+Tab、Enter 和 Space 完成；
- 每个切换按钮保持稳定名称，`aria-pressed` 与源状态一致；
- 删除后收藏集合没有悬空 ID；
- 刷新恢复两条初始商品，新增与收藏消失；
- 说明刷新复位是内存边界，不是数据丢失缺陷的伪装。

## 11. 阶段验收

按以下 Chromium 键盘路径记录结果：

1. 首次打开显示 2 件商品，Console 无未处理错误；
2. Tab 到标题和价格，输入“旧书”与 `12.50`，Enter 发布；
3. 输入“坏价格”与 `1e2`，提交后显示错误且不新增；
4. 聚焦“旧书”的收藏按钮，用 Space 收藏，`aria-pressed="true"`；
5. 进入“只看收藏”，确认只显示旧书；
6. 从内存移除旧书，列表显示空状态，焦点回到“只看收藏”；
7. 切回全部，原始商品仍在；
8. 刷新页面，回到 2 件初始商品且无收藏；
9. 整个路径无鼠标依赖、无未处理 Console 错误。

## 12. 常见问题

**为什么不用 `localStorage` 保存？**
本课目标是 DOM 状态和可访问交互。加入持久化会引入版本、过期、跨标签同步和隐私问题，不能假装只多一行代码就等价于服务端保存。

**焦点是否应该总回到刚操作的按钮？**
按钮仍存在时通常合适；按钮消失时必须选择相邻或稳定控件。具体位置应由操作后的任务连续性决定。

**原生按钮需要手写 Enter 和 Space 监听吗？**
不需要。正确使用 `<button>` 及 `click` 语义即可获得键盘激活，不要用普通 `<div>` 重造按钮。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [MDN：管理焦点](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Keyboard-navigable_JavaScript_widgets)
- [MDN：`aria-pressed`](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-pressed)
- [WAI-ARIA：Status Role](https://www.w3.org/WAI/ARIA/apg/patterns/alert/)
- [MDN：`HTMLElement.focus`](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement/focus)
- [HTML Standard：The button element](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element)

## 我现在能做到什么

我能实现一个完整的原生 DOM 内存商品页，让状态、派生视图、事件和焦点形成可解释闭环，并明确告知用户刷新边界以及前端控件不具备持久化或授权能力。

## 单元导航

- 上一单元：[事件、表单提交与委托](./02-events-forms-delegation.md)
- 下一单元：[Promise、`async` 与事件循环](../06-async-fetch-event-loop/01-promises-async-event-loop.md)
- 章入口：[DOM、事件与可访问状态](../05-dom-events.md)
