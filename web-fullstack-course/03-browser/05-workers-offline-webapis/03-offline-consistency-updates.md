# 离线一致性与更新：草稿、幂等和版本冲突

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个离线保存预约草稿、联网后显式同步并处理版本冲突的页面 |
| 文件 | `browser-lab/server.mjs`、`public/index.html`、`public/main.js`、`public/sw.js` |
| 运行方式 | 在线加载一次并刷新受控；切 Offline 创建草稿；恢复在线后手动同步 |
| 可观察证据 | 草稿的 UTC 时间/预期版本/幂等键、Network 的 `201` 或 `409`、服务端当前版本 |
| 业务边界 | 离线只保存“待提交”；只有服务端响应才能确认预约 |
| 数据边界 | 示例草稿只含公开商品 ID，不含联系人、Cookie、Token 或支付信息 |
| 缓存边界 | 外壳可缓存，`/api/` 永远 network-only；只删除自己的版本缓存 |
| 证据边界 | 本地内存服务与单条草稿不证明真实多用户事务、持久幂等或后台同步 |
| 建议时间 | 阅读 40 分钟，实验 55 分钟，练习 35 分钟 |

## 1. 任务背景

用户离线时看到上一次加载的自行车仍是 `available`，点击预约。页面若立即显示“预约成功”，就把陈旧快照伪装成权威事实。期间商品可能已被别人预约，用户权限也可能变化。

正确做法是把操作保存为明确的本地草稿：

```text
离线点击 → pending-local
恢复联网 → submitting
  ├─ 201 → confirmed
  ├─ 409 → conflict，重新读取
  └─ 网络失败 → pending-local，稍后再试
```

服务端使用预期版本检测并发变化，使用幂等键处理“响应丢失后重试”的重复请求。

## 2. 学习目标

- 区分应用外壳、离线快照、本地草稿和服务端权威状态；
- 给草稿记录创建时间、预期版本和稳定幂等键；
- 只在用户明确同步时发送，正确处理网络失败、`409` 和重复响应；
- 解释 `navigator.onLine` 为什么只是提示；
- 设计版本化缓存更新而不删除其他应用数据；
- 明确敏感离线数据、共享设备和退出登录清理边界。

## 3. 预备知识

请先完成[Service Worker 生命周期与缓存](02-service-worker-lifecycle-cache.md)，理解首次控制、Cache API 和 network-only 边界；了解 HTTP POST、JSON 与乐观并发版本。

本课用 `localStorage` 保存一条公开教学草稿，只为观察状态。真实私人离线队列应评估 IndexedDB、加密、设备共享、退出登录、配额和数据保留政策。

## 4. 核心理论

### 4.1 四种数据有不同可信度

| 数据 | 来源 | 可用于什么 | 不能证明什么 |
| --- | --- | --- | --- |
| 应用外壳 | 版本化 Cache API | 离线打开 UI | 商品仍在售 |
| 商品快照 | 上次 GET | 离线阅读并显示抓取时间 | 当前库存与权限 |
| 本地草稿 | 用户离线操作 | 待提交意图 | 服务端已接受 |
| 权威状态 | 当前服务端事务 | 业务确认 | 客户端永久不会过期 |

UI 必须把四者区分出来，尤其不能把 `pending-local` 使用成功颜色和“已预约”文案。

### 4.2 预期版本检测冲突

客户端从 GET 得到 `version: 1`，提交：

```json
{ "listingId": "listing-1", "expectedVersion": 1 }
```

服务端事务只在当前版本仍为 1 且状态可预约时成功，然后更新版本。若已变成 2，返回 `409 VERSION_CONFLICT`，客户端重新读取并让用户决定。

### 4.3 幂等键解决未知结果

网络可能在服务端提交成功后、响应到达前断开。重试若使用同一 `Idempotency-Key`，服务端可以返回第一次结果，而不是重复创建。键应与一次业务意图绑定；每次重试不能生成新键。

内存 Map 只用于本地实验。生产幂等记录必须持久化、限定用户/路由作用域、原子写入并设置保留期。

### 4.4 在线信号不是可达性证明

`navigator.onLine` 可能为 true 但 API、DNS、代理或认证失败，也可能为 false 时局域服务仍可达。真正提交结果只能由请求决定。`online` 事件适合提示“可以尝试”，不应自动无限重放。

### 4.5 更新必须保持队列兼容

新版本页面读取旧版本草稿时，需要 schemaVersion 和迁移策略。无法识别的草稿应隔离并提示，不应直接丢弃，也不应按新结构盲发。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 边界 |
| --- | --- | --- |
| `navigator.onLine` | 网络连接提示 | 不证明 API 可达 |
| `online/offline` | 连接状态变化提示 | 不自动代表业务同步成功 |
| `localStorage` | 本课保存一条公开草稿 | 同步 API、容量小、不适合敏感队列 |
| `crypto.randomUUID()` | 生成草稿/幂等标识 | 服务端仍需按用户与接口限定作用域 |
| `Idempotency-Key` | 重试复用同一业务意图 | 不是身份认证 |
| `expectedVersion` | 乐观并发条件 | 必须由服务端原子检查 |
| HTTP `201` | 本次或幂等复用后已确认 | 仍要验证响应结构 |
| HTTP `409` | 当前状态与预期冲突 | 重新读取，不盲目覆盖 |
| `createdAt` | 草稿 UTC 时间 | 显示时本地化并标注未提交 |
| Cache API | 保存公开外壳 | `/api/` 保持 network-only |

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
let listing = {
  id: "listing-1",
  title: "自行车",
  priceCents: 28000,
  status: "available",
  version: 1,
  updatedAt: new Date().toISOString(),
};
const idempotencyResults = new Map();
let dropNextConfirmation = false;

function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16 * 1024) throw new Error("请求体过大");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function publicListing() {
  return { ...listing, fetchedAt: new Date().toISOString() };
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");

    if (req.method === "GET" && url.pathname === "/api/v1/listings/listing-1") {
      send(res, 200, "application/json; charset=utf-8", JSON.stringify(
        publicListing(),
      ));
      return;
    }

    const reservationMatch = url.pathname.match(
      /^\/api\/v1\/listings\/([^/]+)\/reservations$/,
    );
    if (req.method === "POST" && reservationMatch) {
      const listingId = decodeURIComponent(reservationMatch[1]);
      const key = req.headers["idempotency-key"];
      if (typeof key !== "string" || key.length < 8 || key.length > 100) {
        send(res, 400, "application/json; charset=utf-8", JSON.stringify({
          code: "INVALID_IDEMPOTENCY_KEY",
          message: "缺少合法幂等键",
        }));
        return;
      }
      if (idempotencyResults.has(key)) {
        send(res, 200, "application/json; charset=utf-8", JSON.stringify({
          ...idempotencyResults.get(key),
          reused: true,
        }));
        return;
      }
      const body = await readJson(req);
      if (
        listingId !== listing.id ||
        !Number.isInteger(body.expectedVersion)
      ) {
        send(res, 400, "application/json; charset=utf-8", JSON.stringify({
          code: "INVALID_REQUEST",
          message: "预约参数不合法",
        }));
        return;
      }
      if (
        listing.status !== "available" ||
        body.expectedVersion !== listing.version
      ) {
        send(res, 409, "application/json; charset=utf-8", JSON.stringify({
          code: "VERSION_CONFLICT",
          message: "商品状态已变化，请刷新",
          current: publicListing(),
        }));
        return;
      }
      listing = {
        ...listing,
        status: "reserved",
        version: listing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      const result = {
        reservationId: `reservation-${listing.version}`,
        listing: publicListing(),
        reused: false,
      };
      idempotencyResults.set(key, result);
      if (dropNextConfirmation) {
        dropNextConfirmation = false;
        const responseBody = JSON.stringify(result);
        res.writeHead(201, {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(responseBody),
          "Cache-Control": "no-store",
        });
        res.flushHeaders();
        res.write(responseBody.slice(0, Math.floor(responseBody.length / 2)));
        setTimeout(() => res.destroy(), 20);
        return;
      }
      send(res, 201, "application/json; charset=utf-8", JSON.stringify(result));
      return;
    }

    if (req.method === "POST" && url.pathname === "/lab/drop-next-confirmation") {
      dropNextConfirmation = true;
      send(res, 204, "text/plain; charset=utf-8");
      return;
    }

    if (req.method === "POST" && url.pathname === "/lab/advance") {
      listing = {
        ...listing,
        status: "reserved",
        version: listing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      send(res, 200, "application/json; charset=utf-8", JSON.stringify(
        publicListing(),
      ));
      return;
    }

    if (req.method === "POST" && url.pathname === "/lab/reset") {
      listing = {
        ...listing,
        status: "available",
        version: listing.version + 1,
        updatedAt: new Date().toISOString(),
      };
      idempotencyResults.clear();
      send(res, 200, "application/json; charset=utf-8", JSON.stringify(
        publicListing(),
      ));
      return;
    }

    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET, POST" });
      res.end();
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
    const status = error?.code === "ENOENT" ? 404 : 400;
    send(res, status, "application/json; charset=utf-8", JSON.stringify({
      code: "LAB_ERROR",
      message: "实验请求无法处理",
    }));
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
<title>离线预约草稿</title>
<main>
  <h1>邻里集市离线预约实验</h1>
  <p id="network">连接状态未知</p>
  <article>
    <h2 id="title">尚未加载商品</h2>
    <p id="snapshot">没有权威快照</p>
  </article>
  <p id="status" role="status">请先在线加载</p>
  <button id="load" type="button">读取当前商品</button>
  <button id="draft" type="button">保存预约草稿</button>
  <button id="sync" type="button">同步草稿</button>
  <button id="discard" type="button">丢弃草稿</button>
  <button id="advance" type="button">模拟他人先预约</button>
  <button id="drop" type="button">模拟提交后响应丢失</button>
  <button id="reset" type="button">重置本地服务状态</button>
  <pre id="draft-view">没有本地草稿</pre>
</main>
<script type="module" src="./main.js"></script>
</html>
```

### 6.3 `public/main.js`

```js
const STORAGE_KEY = "neighbor-market-reservation-draft-v1";
const network = document.querySelector("#network");
const title = document.querySelector("#title");
const snapshotText = document.querySelector("#snapshot");
const status = document.querySelector("#status");
const draftView = document.querySelector("#draft-view");
const buttons = Object.fromEntries(
  ["load", "draft", "sync", "discard", "advance", "drop", "reset"].map((id) => [
    id,
    document.querySelector(`#${id}`),
  ]),
);

let snapshot;

function readDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (
      value?.schemaVersion !== 1 ||
      typeof value.idempotencyKey !== "string" ||
      value.listingId !== "listing-1" ||
      !Number.isInteger(value.expectedVersion) ||
      Number.isNaN(Date.parse(value.createdAt))
    ) {
      throw new TypeError("草稿结构不兼容");
    }
    return value;
  } catch {
    status.textContent = "本地草稿损坏或版本不兼容，请人工丢弃";
    return null;
  }
}

function showDraft() {
  const draft = readDraft();
  draftView.textContent = draft
    ? JSON.stringify(draft, null, 2)
    : "没有本地草稿";
}

function showNetwork() {
  network.textContent = navigator.onLine
    ? "浏览器报告在线；API 仍可能不可达"
    : "浏览器报告离线；当前页面数据都是快照";
}

async function loadListing() {
  status.textContent = "正在读取权威状态";
  const response = await fetch("/api/v1/listings/listing-1", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const value = await response.json();
  if (
    value?.id !== "listing-1" ||
    !Number.isInteger(value.version) ||
    !["available", "reserved"].includes(value.status)
  ) {
    throw new TypeError("商品响应不合法");
  }
  snapshot = value;
  title.textContent = `${value.title}，${value.priceCents} 分`;
  snapshotText.textContent =
    `状态 ${value.status}，版本 ${value.version}，抓取于 ${value.fetchedAt}`;
  status.textContent = "已读取；这份快照仍会随时间变旧";
}

buttons.load.addEventListener("click", () => {
  loadListing().catch((error) => {
    status.textContent = `读取失败：${error.message}`;
  });
});

buttons.draft.addEventListener("click", () => {
  if (!snapshot) {
    status.textContent = "没有可引用的商品快照";
    return;
  }
  if (snapshot.status !== "available") {
    status.textContent = "快照已显示不可预约，请先刷新";
    return;
  }
  const draft = {
    schemaVersion: 1,
    idempotencyKey: crypto.randomUUID(),
    listingId: snapshot.id,
    expectedVersion: snapshot.version,
    createdAt: new Date().toISOString(),
    state: "pending-local",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  showDraft();
  status.textContent = "仅已保存本地草稿，尚未预约成功";
});

buttons.sync.addEventListener("click", async () => {
  const draft = readDraft();
  if (!draft) {
    status.textContent = "没有可同步草稿";
    return;
  }
  status.textContent = "正在提交草稿，结果未知前不要重复创建新意图";
  try {
    const response = await fetch(
      `/api/v1/listings/${encodeURIComponent(draft.listingId)}/reservations`,
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": draft.idempotencyKey,
      },
      body: JSON.stringify({
        expectedVersion: draft.expectedVersion,
      }),
      },
    );
    const body = await response.json();
    if (response.status === 409) {
      status.textContent =
        `同步冲突：服务端版本 ${body.current?.version}，请刷新后决定`;
      return;
    }
    if (!response.ok || typeof body.reservationId !== "string") {
      throw new Error(body.message ?? `HTTP ${response.status}`);
    }
    localStorage.removeItem(STORAGE_KEY);
    showDraft();
    const confirmation = body.reused
      ? `服务端返回已确认结果：${body.reservationId}`
      : `预约已由服务端确认：${body.reservationId}`;
    status.textContent = confirmation;
    try {
      await loadListing();
      status.textContent = `${confirmation}；商品快照已刷新`;
    } catch (refreshError) {
      status.textContent =
        `${confirmation}；但刷新失败：${refreshError.message}`;
    }
  } catch (error) {
    status.textContent = `同步未确认：${error.message}；保留同一草稿和幂等键`;
  }
});

buttons.discard.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  showDraft();
  status.textContent = "本地草稿已丢弃，没有改变服务端";
});

buttons.advance.addEventListener("click", async () => {
  try {
    const response = await fetch("/lab/advance", { method: "POST" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    status.textContent = "已模拟他人更新；现有草稿将产生版本冲突";
  } catch (error) {
    status.textContent = `无法模拟他人更新：${error.message}`;
  }
});

buttons.drop.addEventListener("click", async () => {
  try {
    const response = await fetch("/lab/drop-next-confirmation", {
      method: "POST",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    status.textContent = "下一次成功提交会在服务端保存后丢失响应";
  } catch (error) {
    status.textContent = `无法设置故障：${error.message}`;
  }
});

buttons.reset.addEventListener("click", async () => {
  try {
    const response = await fetch("/lab/reset", { method: "POST" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    status.textContent = "本地服务已重置，请重新读取";
    await loadListing();
  } catch (error) {
    status.textContent = `重置或刷新失败：${error.message}`;
  }
});

for (const button of [buttons.advance, buttons.reset]) {
  button.addEventListener("click", (event) => {
    const target = event.currentTarget;
    target.disabled = true;
    setTimeout(() => { target.disabled = false; }, 500);
  });
}

window.addEventListener("online", showNetwork);
window.addEventListener("offline", showNetwork);
showNetwork();
showDraft();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((error) => {
    status.textContent = `离线外壳注册失败：${error.message}`;
  });
}
```

### 6.4 `public/sw.js`

```js
const CACHE_PREFIX = "neighbor-market-offline-consistency-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const SHELL = ["./", "./index.html", "./main.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)),
  )));
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/lab/")
  ) {
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => (
      caches.match("./index.html", { cacheName: CACHE_NAME })
    )));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((hit) => hit ?? fetch(event.request)),
  );
});
```

运行：

```bash
cd browser-lab
node server.mjs ./public
```

运行后先在线加载并刷新一次。切为 Offline，点击“保存预约草稿”，页面必须写“尚未预约成功”。
恢复 Online，不要立刻同步；先点“模拟他人先预约”，再同步，应得到 `409`。重置、重新读取并
创建新草稿；点“模拟提交后响应丢失”，再同步，页面应报告结果未知并保留草稿。使用同一草稿
再次同步，应得到 `reused: true` 和同一个预约编号。

## 7. 邻里集市集成案例

真实离线队列至少需要：

```text
draftId / schemaVersion / actorId
operationType / payload
expectedVersion / idempotencyKey
createdAt / lastAttemptAt / attemptCount
state: pending | submitting | conflict | confirmed | rejected
```

队列按当前用户隔离；退出登录要清理或锁定；共享设备需避免下一位用户看到前一位的草稿。联系人、身份证明、支付和私聊默认不离线存储。客户端不能自行把 `conflict` 改成 confirmed。

更新应用前先迁移草稿 schema。迁移失败时保留原记录并提示导出/丢弃，不可用 `caches.keys().map(delete)` 或“清站点数据”代替迁移。

性能上限制队列长度、单项大小和同步并发，使用退避与总预算；批量重连时避免所有客户端同时重放造成惊群。

## 8. 常见错误与排查路径

### 错误示例：离线直接宣布成功

```js
// 错误：本地写入只证明保存了意图。
localStorage.setItem("reservation", JSON.stringify(payload));
status.textContent = "预约成功";
```

### 错误示例：每次重试换幂等键

```js
// 错误：服务端会把每次请求当成新意图。
headers.set("Idempotency-Key", crypto.randomUUID());
await fetch(
  `/api/v1/listings/${encodeURIComponent(listingId)}/reservations`,
  { method: "POST", headers },
);
```

### 诊断记录

| 字段 | 记录 |
| --- | --- |
| 现象 | 恢复联网后草稿提交返回 `409 VERSION_CONFLICT` |
| 证据 | 草稿 `expectedVersion: 1`；服务端响应 current.version 为 2 且 status 为 reserved |
| 原因 | 离线期间其他用户先更新了商品，旧快照不再满足并发条件 |
| 修复 | 保留冲突状态，重新读取权威数据，让用户丢弃或按新状态重新操作 |
| 复验 | 重置后读取新版本并创建新草稿，`201` 确认；同键重放只复用结果 |

排查顺序：先检查草稿 schema/用户归属，再看 Network 是否真正发出，核对幂等键是否稳定、预期版本和当前版本，最后区分网络未知、冲突与确定拒绝。

## 9. 课后题

1. **离线快照显示 available，能否确认可预约？**
   答：不能，它只反映抓取时状态；提交时由服务端重新检查。
2. **为什么 `navigator.onLine === true` 仍可能失败？**
   答：它不验证目标 API、DNS、代理、TLS、会话和服务健康。
3. **幂等键与预期版本分别解决什么？**
   答：幂等键抑制同一意图重复执行；预期版本检测业务状态并发变化。
4. **冲突后为何不自动改成最新版本重试？**
   答：那会在用户未确认新事实时改变意图，可能预约已变化的商品。
5. **Service Worker 能保证后台最终同步吗？**
   答：不能。生命周期、平台支持和调度都有限，必须让未同步状态可见并允许前台恢复。

## 10. 实践练习

### 基础：显示草稿年龄

把 `createdAt` 本地化，并显示“未提交已 X 分钟”。

**验收答案：**存储仍为 UTC ISO 8601；显示使用当前 locale；不把客户端时间当服务端审计时间。

### 进阶：草稿 schema 迁移

引入 v2 的 `note` 字段，把 v1 草稿确定性迁移且保留同一幂等键。

**验收答案：**迁移可重复执行；未知版本不发送；失败不删除原始值；测试 v1/v2/损坏三种输入。

### 故障注入：响应丢失后重试

让服务端提交后断开连接，客户端保留草稿；用同一键再次同步。

**验收答案：**服务端只产生一次预约；第二次返回保存结果；页面能区分 reused；换键测试会被业务状态拒绝。

## 11. 阶段验收

- [ ] 四个文件可运行，外壳离线可打开而 API 不被缓存；
- [ ] 离线创建草稿时明确显示“尚未确认”；
- [ ] `409` 冲突可稳定复现且不被吞成成功；
- [ ] 同一草稿在网络未知后复用同一幂等键；
- [ ] 草稿含 schema、UTC 时间、预期版本和状态；
- [ ] 能说明本课内存服务与 localStorage 不适合生产敏感队列；
- [ ] 缓存、队列、权限、版本和性能边界均有明确记录。

## 12. 常见问题

**为什么不自动监听 `online` 后立即同步？**
恢复信号可能抖动，用户会话和业务上下文也可能变化。先提示、去重并按预算同步更可控。

**冲突草稿要保留多久？**
由产品和隐私政策决定。必须有可见清理、用户隔离和过期规则，不应永久保存。

**Background Sync 可以解决一切吗？**
不能。支持和调度有限，也不替代幂等、授权、冲突处理与用户可见状态。

**Cache API 和离线队列能放在同一缓存吗？**
不应。Request/Response 外壳缓存与结构化业务操作有不同查询、迁移、隐私和事务需求。

## 13. 扩展阅读

- [Service Workers specification](https://w3c.github.io/ServiceWorker/)
- [MDN: Navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)
- [MDN: Online and offline events](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine#listening_for_changes_in_network_status)
- [HTTP Semantics: Idempotent Methods](https://httpwg.org/specs/rfc9110.html#idempotent.methods)
- [web.dev: Offline data](https://web.dev/learn/pwa/offline-data)

资料快照日期：2026-10-11。实验未验证 Background Sync、真实数据库事务、多用户认证、存储驱逐、共享设备清理、Safari/Firefox 或生产迁移。

## 我现在能做到什么

我能把离线操作表示为待提交草稿，用版本冲突和幂等键与服务端安全重连，并明确区分本地可用、网络可达和业务确认。

## 单元导航

[上一课：Service Worker 生命周期与缓存](02-service-worker-lifecycle-cache.md) · [本章目录](../README.md#05-worker离线与平台能力) · [下一课：观察器、权限与回退](04-observers-permissions-api-fallback.md)
