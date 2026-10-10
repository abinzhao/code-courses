# 观察器、权限与平台 API：能力检测、清理和可操作回退

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个自动/手动分页、容器尺寸提示、第三方 DOM 审计和剪贴板回退的商品页 |
| 文件 | `browser-lab/server.mjs`、`public/index.html`、`public/main.js` |
| 运行方式 | `node server.mjs ./public`，打开 `http://127.0.0.1:3300` |
| 可观察证据 | Observer 回调次数、分页请求、清理日志、剪贴板成功/拒绝状态 |
| 回退原则 | 不支持自动观察时保留按钮；复制失败时保留可选择文本 |
| 权限原则 | 只在用户点击后写剪贴板，不读取内容；权限查询不替代实际调用 |
| 生命周期 | 页面离开时 disconnect/abort；从 bfcache 恢复时幂等重建 |
| 证据边界 | 本机 observer 与权限结果不代表 iframe、移动端或其他浏览器策略 |
| 建议时间 | 阅读 40 分钟，实验 50 分钟，练习 30 分钟 |

## 1. 任务背景

邻里集市希望在列表接近底部时加载下一页、在卡片容器变窄时调整提示、监测嵌入式第三方挂件是否插入异常内容，并让用户复制公开交接说明。

这些需求分别适合 IntersectionObserver、ResizeObserver、MutationObserver 和 Clipboard API。但平台能力不是“存在就调用”：

- 观察器回调可能重复或合并；
- 被观察对象和回调闭包会延长资源生命周期；
- 权限策略、用户手势和安全上下文会让调用拒绝；
- 某浏览器不支持时，核心任务仍应可完成。

## 2. 学习目标

- 为 Intersection/Resize/MutationObserver 选择正确观察对象和边界；
- 把 observer 信号与业务请求状态分离，防止重复分页；
- 在页面离开和 bfcache 恢复时正确清理、重建；
- 用能力检测和行为检测设计可操作回退；
- 在用户手势中调用 Clipboard，并处理拒绝与不支持；
- 解释权限查询为何只是提示，不能替代 API 调用和异常处理。

## 3. 预备知识

需要会 DOM 事件、Fetch、AbortController 和 `pagehide/pageshow`。本课只处理公开演示数据；涉及定位、通知、摄像头或剪贴板读取时还需额外的最小授权与隐私设计。

观察器异步通知变化，不保证每个像素或每个 DOM 操作都产生一次回调。业务逻辑不能依赖精确回调次数。

## 4. 核心理论

### 4.1 IntersectionObserver 观察相交，不证明用户看见

它根据目标与根的几何相交异步回调，适合懒加载哨兵。元素相交不等于内容已加载、未被遮挡或用户真正阅读，因此曝光分析还需可见时长和业务定义。

分页必须另有状态：

```text
idle → pending → idle
               ↘ done
               ↘ error（允许人工重试）
```

回调只调用 `loadNext()`；函数内部用 pending 和 done 防重复。

### 4.2 ResizeObserver 观察元素盒，不是窗口替身

组件受侧栏、Grid 或容器影响时，窗口宽度不够准确。ResizeObserver 报告目标盒变化。回调中修改会再次影响尺寸，可能形成反馈循环；应避免“测量 → 改宽度 → 再测量”的无界循环。

### 4.3 MutationObserver 是边界工具

它适合观察不受当前状态系统控制的 DOM，例如第三方挂件或遗留集成。自己创建的列表应直接在状态更新处记录，不要再用 MutationObserver 反向猜测应用状态。

观察范围越大、`subtree` 和属性过滤越宽，成本越高。只观察需要的节点与 mutation 类型。

### 4.4 权限是多层决策

平台调用可能受到：

- API 支持情况；
- 安全上下文；
- 顶层/嵌入上下文与 Permissions Policy；
- 用户手势；
- 用户或组织策略；
- 当前权限状态；
- 调用时错误。

Permissions API 并不覆盖所有能力，返回 `prompt` 也不保证下一次成功。最终以 API Promise 成功或拒绝为准。

### 4.5 渐进增强保留核心路径

自动分页增强“省一次点击”，手动“加载更多”仍是完整路径。剪贴板增强复制效率，公开说明文本仍可选择。回退不是隐藏错误，而是保留任务完成能力并说明限制。

## 5. 元素、属性、API 或配置清单

| API / 选项 | 作用 | 边界 |
| --- | --- | --- |
| `IntersectionObserver` | 观察目标与 root 相交 | 回调次数不等于曝光次数 |
| `rootMargin` | 提前/延后触发区域 | 不是网络完成保证 |
| `threshold` | 相交比例阈值 | 浮点与布局变化会重复跨越 |
| `ResizeObserver` | 观察元素尺寸 | 回调内改尺寸可能循环 |
| `contentRect` | 兼容读取尺寸 | 新盒模型信息支持有差异 |
| `MutationObserver` | 观察 DOM 变更 | 限定 target、subtree 和类型 |
| `disconnect()` | 停止并释放观察关系 | 页面离开必须调用 |
| `navigator.clipboard.writeText()` | 写入纯文本 | 通常需安全上下文与用户手势 |
| `navigator.permissions.query()` | 查询部分权限提示 | 名称支持和结果因浏览器而异 |
| `AbortController` | 取消分页请求 | observer 清理与请求取消都需要 |

## 6. 最小可运行案例

### 6.1 `server.mjs`

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? "./public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};
const listings = Array.from({ length: 12 }, (_, index) => ({
  id: `listing-${index + 1}`,
  title: `社区闲置物品 ${index + 1}`,
  priceCents: 500 + index * 275,
}));

function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/api/v1/listings") {
      const page = Number(url.searchParams.get("page") ?? "1");
      const pageSize = 3;
      if (!Number.isInteger(page) || page < 1) {
        send(res, 400, "application/json; charset=utf-8", JSON.stringify({
          code: "INVALID_PAGE",
          message: "页码不合法",
        }));
        return;
      }
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
      const start = (page - 1) * pageSize;
      send(res, 200, "application/json; charset=utf-8", JSON.stringify({
        items: listings.slice(start, start + pageSize),
        page,
        hasMore: start + pageSize < listings.length,
      }));
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, "." + (
      pathname.endsWith("/") ? `${pathname}index.html` : pathname
    ));
    const type = types[extname(file)];
    if (!file.startsWith(root + sep) || !type) {
      send(res, 404, "text/plain; charset=utf-8", "资源不存在");
      return;
    }
    send(res, 200, type, await readFile(file));
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 500;
    send(res, status, "text/plain; charset=utf-8", "实验服务失败");
  }
}).listen(3300, "127.0.0.1", () => {
  console.log(`实验根目录：${root}`);
  console.log("打开 http://127.0.0.1:3300");
});
```

### 6.2 `public/index.html`

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>平台能力与回退</title>
<style>
  #catalog { resize: horizontal; overflow: auto; max-width: 100%; min-width: 16rem; }
  #list { display: grid; gap: .5rem; min-height: 24rem; }
  #catalog[data-size="narrow"] { border-inline-start: .4rem solid #b45309; }
  #sentinel { min-height: 3rem; background: #eee; }
</style>
<main>
  <h1>邻里集市渐进增强列表</h1>
  <section id="catalog" aria-labelledby="catalog-title">
    <h2 id="catalog-title">公开商品</h2>
    <p id="size-status">等待容器尺寸</p>
    <ul id="list"></ul>
    <div id="sentinel" aria-hidden="true"></div>
    <button id="load-more" type="button">加载更多</button>
    <p id="list-status" role="status">尚未加载</p>
  </section>

  <section aria-labelledby="handoff-title">
    <h2 id="handoff-title">公开交接说明</h2>
    <p id="instructions">请在社区服务站当面检查物品，不要提前转账。</p>
    <button id="copy" type="button">复制说明</button>
    <p id="copy-status" role="status">也可以手动选择上方文字。</p>
  </section>

  <section aria-labelledby="widget-title">
    <h2 id="widget-title">第三方挂件边界</h2>
    <div id="third-party-slot"></div>
    <button id="mutate" type="button">模拟挂件插入内容</button>
    <p id="mutation-status">尚无外部变更</p>
  </section>
</main>
<script type="module" src="./main.js"></script>
</html>
```

### 6.3 `public/main.js`

```js
const catalog = document.querySelector("#catalog");
const list = document.querySelector("#list");
const sentinel = document.querySelector("#sentinel");
const loadMoreButton = document.querySelector("#load-more");
const listStatus = document.querySelector("#list-status");
const sizeStatus = document.querySelector("#size-status");
const copyButton = document.querySelector("#copy");
const copyStatus = document.querySelector("#copy-status");
const instructions = document.querySelector("#instructions");
const slot = document.querySelector("#third-party-slot");
const mutateButton = document.querySelector("#mutate");
const mutationStatus = document.querySelector("#mutation-status");

let page = 0;
let pending = false;
let done = false;
let pageController;
let intersectionObserver;
let resizeObserver;
let mutationObserver;
let fallbackResize;

function validatePage(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    !Array.isArray(value.items) ||
    !Number.isInteger(value.page) ||
    typeof value.hasMore !== "boolean"
  ) {
    throw new TypeError("分页响应不合法");
  }
  for (const item of value.items) {
    if (
      typeof item?.id !== "string" ||
      typeof item.title !== "string" ||
      !Number.isSafeInteger(item.priceCents)
    ) {
      throw new TypeError("商品字段不合法");
    }
  }
  return value;
}

async function loadNext() {
  if (pending || done) return;
  pending = true;
  pageController = new AbortController();
  loadMoreButton.disabled = true;
  listStatus.textContent = `正在加载第 ${page + 1} 页`;
  try {
    const response = await fetch(`/api/v1/listings?page=${page + 1}`, {
      signal: pageController.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = validatePage(await response.json());
    const fragment = document.createDocumentFragment();
    for (const item of data.items) {
      const row = document.createElement("li");
      row.textContent = `${item.title}，${item.priceCents} 分`;
      fragment.append(row);
    }
    list.append(fragment);
    page = data.page;
    done = !data.hasMore;
    loadMoreButton.hidden = done;
    listStatus.textContent = done ? "全部加载完成" : `已加载 ${list.children.length} 件`;
  } catch (error) {
    if (!pageController.signal.aborted) {
      listStatus.textContent = `加载失败：${error.message}，可手动重试`;
    }
  } finally {
    pending = false;
    loadMoreButton.disabled = false;
  }
}

function updateSize(width) {
  const narrow = width < 420;
  catalog.dataset.size = narrow ? "narrow" : "wide";
  sizeStatus.textContent = `容器约 ${Math.round(width)} px，${narrow ? "窄" : "宽"}布局提示`;
}

function setupObservers() {
  if ("IntersectionObserver" in window) {
    intersectionObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) loadNext();
    }, { rootMargin: "160px" });
    intersectionObserver.observe(sentinel);
    loadMoreButton.textContent = "自动加载失败时点此重试";
  } else {
    loadMoreButton.textContent = "加载更多（浏览器不支持自动观察）";
  }

  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver((entries) => {
      const entry = entries.at(-1);
      if (entry) updateSize(entry.contentRect.width);
    });
    resizeObserver.observe(catalog);
  } else {
    fallbackResize = () => updateSize(catalog.getBoundingClientRect().width);
    window.addEventListener("resize", fallbackResize);
    fallbackResize();
  }

  if ("MutationObserver" in window) {
    mutationObserver = new MutationObserver((records) => {
      const added = records.reduce(
        (count, record) => count + record.addedNodes.length,
        0,
      );
      mutationStatus.textContent = `挂件新增 ${added} 个节点，请按集成契约审查`;
    });
    mutationObserver.observe(slot, { childList: true });
  } else {
    mutationStatus.textContent = "无法自动观察挂件，请人工检查其输出";
  }
}

function cleanup() {
  intersectionObserver?.disconnect();
  resizeObserver?.disconnect();
  mutationObserver?.disconnect();
  intersectionObserver = undefined;
  resizeObserver = undefined;
  mutationObserver = undefined;
  pageController?.abort(new DOMException("页面离开", "AbortError"));
  if (fallbackResize) window.removeEventListener("resize", fallbackResize);
  fallbackResize = undefined;
}

loadMoreButton.addEventListener("click", loadNext);

copyButton.addEventListener("click", async () => {
  if (!window.isSecureContext || !navigator.clipboard?.writeText) {
    copyStatus.textContent = "当前环境不支持自动复制，请手动选择上方文字";
    return;
  }
  copyButton.disabled = true;
  try {
    await navigator.clipboard.writeText(instructions.textContent);
    copyStatus.textContent = "已复制公开说明，请粘贴核对";
  } catch (error) {
    copyStatus.textContent = `复制未获允许：${error.name}；请手动选择文字`;
  } finally {
    copyButton.disabled = false;
  }
});

mutateButton.addEventListener("click", () => {
  const note = document.createElement("p");
  note.textContent = `挂件消息 ${slot.children.length + 1}`;
  slot.append(note);
});

window.addEventListener("pagehide", cleanup);
window.addEventListener("pageshow", (event) => {
  if (event.persisted) setupObservers();
});

setupObservers();
loadNext();

if (navigator.permissions?.query) {
  navigator.permissions.query({ name: "clipboard-write" }).then((result) => {
    console.info("clipboard-write 权限提示", result.state);
  }).catch(() => {
    console.info("当前浏览器不提供 clipboard-write 权限查询");
  });
}
```

运行后滚到底部，应自动逐页加载；按钮始终可用于重试。拖动容器右下角改变宽度，观察尺寸提示。点“模拟挂件插入内容”，审计文本更新。点击复制后粘贴核对；在站点设置拒绝剪贴板或模拟 Promise 拒绝，页面应保留手动复制路径。

## 7. 邻里集市集成案例

平台能力接入表应记录：

| 能力 | 主路径 | 不支持/拒绝回退 | 收集的数据 |
| --- | --- | --- | --- |
| 自动分页 | 相交哨兵触发受控加载 | “加载更多”按钮 | 页码与请求状态 |
| 容器适配 | ResizeObserver | 初始测量 + window resize | 仅宽度档位 |
| 外部挂件审计 | 限定节点 MutationObserver | 人工检查 | 节点数量，不记私人文本 |
| 复制说明 | 用户点击 writeText | 可选择的可见文本 | 不读取剪贴板 |

所有请求仍做服务端对象授权。IntersectionObserver 不应把私人商品提前批量下载；MutationObserver 不应把第三方内容全文上传日志；Clipboard 只写公开说明。

离线时自动分页失败，按钮显示可重试，已加载列表标记为快照。性能上记录 observer 数量、观察目标数、回调耗时、请求去重和断开后的活动，而不是假定 observer 一定比事件监听“更快”。

## 8. 常见错误与排查路径

### 错误示例：每次相交都发请求

```js
// 错误：回调可能重复，且没有 pending、页码与页尾控制。
new IntersectionObserver(() => {
  fetch(`/api/v1/listings?page=${page++}`).then(render);
}).observe(sentinel);
```

### 错误示例：加载时索取剪贴板

```js
// 错误：缺少用户意图，可能被拒绝，也没有必要。
navigator.clipboard.writeText("自动写入");
```

### 诊断记录

| 字段 | 记录 |
| --- | --- |
| 现象 | 滚动到底部后同一页请求出现 4 次 |
| 证据 | Network URL 页码相同，Initiator 均来自 IntersectionObserver 回调 |
| 原因 | 相交状态变化重复触发，业务函数没有 pending 锁 |
| 修复 | `loadNext()` 统一检查 pending/done，页码只在成功响应后推进 |
| 复验 | 快速上下滚动 20 次，每一页只有一个并发请求，失败后按钮可重试 |

排查顺序：先看 callback 是否重复，再看业务状态锁；确认观察对象是否重复注册；页面离开后检查 observer/request 是否清理；权限问题最后以实际 API 错误为准。

## 9. 课后题

1. **元素相交是否等于用户看见？**
   答：不等于。遮挡、停留时间、页面可见性和内容加载都可能不同。
2. **为何 ResizeObserver 比只监听 window.resize 更适合组件？**
   答：组件尺寸可由父布局变化而非窗口变化引起。
3. **为什么不应用 MutationObserver 管理自己列表的状态？**
   答：应用已经知道何时更新；反向观察 DOM 增加延迟、复杂度和反馈风险。
4. **Permissions API 返回 granted 是否保证调用成功？**
   答：不保证，安全上下文、策略、瞬时条件和实现仍可能使调用失败。
5. **回退路径的最低要求是什么？**
   答：用户仍能完成核心任务，并得到限制和下一步提示。

## 10. 实践练习

### 基础：分页失败按钮

让服务第 2 页返回一次 `503`，保留手动重试。

**验收答案：**页码不前进；pending 恢复；按钮可用；重试成功后无重复项。

### 进阶：页面可见性预算

页面 hidden 时停止预加载，visible 后若哨兵仍相交再恢复。

**验收答案：**不把 visibility 当离线；恢复不重复注册 observer；Network 证明隐藏期间无新分页。

### 故障注入：Resize 反馈循环

故意在窄状态给容器增加会改变宽度的样式，再改成只切不影响被测尺寸的视觉提示。

**验收答案：**Console 不出现 loop limit 警告；状态稳定；相同宽度不反复写 DOM。

## 11. 阶段验收

- [ ] 三个文件可运行，自动分页与手动按钮均可用；
- [ ] pending、done、错误和取消阻止重复请求；
- [ ] Resize 与 Mutation 观察范围最小且离开时清理；
- [ ] Clipboard 只在点击后写公开文本，拒绝时有手动路径；
- [ ] bfcache 恢复不产生重复 observer；
- [ ] 能说明安全上下文、权限、离线和对象授权边界；
- [ ] 未把 observer 回调、权限查询或本地成功当作用户行为/生产兼容证据。

## 12. 常见问题

**能力检测只写 `"IntersectionObserver" in window` 足够吗？**
它只证明接口存在。还要验证关键选项、行为和错误回退；新特性可用更细粒度检测。

**Clipboard 失败时能用 `document.execCommand("copy")` 吗？**
它已是旧路径且行为不一致。若业务必须兼容，可隔离实现并测试；最稳定的最低回退仍是可选择文本。

**observer 会自动垃圾回收吗？**
不要依赖不明确时机。显式 `disconnect()` 能终止回调并清楚表达生命周期。

**MutationObserver 能做安全过滤器吗？**
不能。恶意内容在插入前就应经过可信渲染/消毒边界，观察器只能辅助诊断。

## 13. 扩展阅读

- [Intersection Observer specification](https://w3c.github.io/IntersectionObserver/)
- [Resize Observer specification](https://drafts.csswg.org/resize-observer/)
- [DOM Standard: Mutation observers](https://dom.spec.whatwg.org/#mutation-observers)
- [Clipboard API and events](https://www.w3.org/TR/clipboard-apis/)
- [Permissions specification](https://www.w3.org/TR/permissions/)
- [MDN: Page visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)

资料快照日期：2026-10-11。实验未验证嵌入 iframe 的 Permissions Policy、移动端权限 UI、Safari/Firefox、辅助技术或大规模观察目标。

## 我现在能做到什么

我能把观察器当作可清理的信号源，把权限调用当作可拒绝的能力，并为不支持、离线和失败状态保留可操作回退，而不降低服务端授权和隐私边界。

## 单元导航

[上一课：离线一致性与更新](03-offline-consistency-updates.md) · [本章入口](../05-workers-offline-webapis.md) · [下一章：DevTools 与性能](../06-devtools-performance.md)
