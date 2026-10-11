# Service Worker：生命周期、控制权与版本化缓存

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个可离线打开的邻里公告页，以及可见的安装、等待更新、激活和控制状态 |
| 文件 | `browser-lab/server.mjs`、`public/index.html`、`public/app.js`、`public/sw.js` |
| 运行方式 | `node server.mjs ./public`；首次在线访问并刷新，再用 DevTools 切 Offline |
| 可观察证据 | Application 中 registration/worker 状态、Cache Storage 内容、Network 的 ServiceWorker 标记 |
| 缓存边界 | 只缓存公开应用外壳；不缓存 API、私人数据、Cookie 或变更请求 |
| 更新边界 | 新版本 waiting 时提示用户；切换后重载，避免旧页面与新外壳静默混搭 |
| 清理边界 | 只删除 `neighbor-market-shell-` 前缀的旧缓存 |
| 证据边界 | 本机首次安装和 v1→v2 只证明该单标签场景，不代表生产部署与存储驱逐 |
| 建议时间 | 阅读 40 分钟，实验 50 分钟，练习 30 分钟 |

## 1. 任务背景

用户在社区活动室网络不稳定时，仍希望打开邻里集市的公开使用说明。Service Worker 可以拦截其作用域内的请求并从 Cache API 返回应用外壳。

它不是普通 Web Worker，也不是永久运行的后台守护进程。浏览器可以在事件结束后终止它；页面首次注册成功也不一定立即受控；新脚本下载后可能进入 waiting，直到旧版本不再控制页面。

## 2. 学习目标

- 解释 registration、installing、waiting、active 和 controller 的区别；
- 观察首次安装为什么常要刷新后才受控；
- 用版本化缓存预存公开外壳，并只清理自身旧版本；
- 为导航使用 network-first + 离线回退，为静态外壳使用 cache-first；
- 显式处理 waiting 更新与 `controllerchange`；
- 区分 HTTP 缓存、Cache API、Service Worker 和业务数据新鲜度。

## 3. 预备知识

需要会使用 Promise、Fetch、DevTools Application 与 Network。Service Worker 通常要求安全上下文；`http://localhost` 和 `http://127.0.0.1` 是开发例外。部署到普通 HTTP 站点不会获得同等能力。

开始前关闭其他本地同源实验，避免旧 Worker 干扰。结束后只注销本实验 registration 并删除本实验缓存，不要清空不属于你的同源数据。

## 4. 核心理论

### 4.1 注册与控制不是同一步

```text
页面 register("./sw.js")
  → 浏览器下载脚本
  → install：准备新版本资源
  → waiting：旧版本仍控制页面时等待
  → activate：清理旧版本、建立新状态
  → active
  → controller：仅对符合 scope 且被其控制的页面成立
```

首次加载页面发生在注册之前，当前导航通常未被该 Worker 拦截。安装成功后刷新，新的导航才会经过 active Worker。

### 4.2 install 应原子准备最小外壳

`event.waitUntil(cache.addAll(...))` 把异步准备工作与 install 生命周期绑定。任一必需资源失败，install 失败，旧版本继续工作。预缓存清单应小、同源、稳定；不要把所有商品和私人响应塞进去。

### 4.3 waiting 保护版本一致性

新 Worker 默认等待旧 Worker 不再控制客户端，避免运行中的旧页面突然切换执行策略。无条件 `skipWaiting()` + `clients.claim()` 可能让旧页面逻辑配上新缓存协议。

本课让页面检测 waiting，由用户点击“应用更新”，再发送 `SKIP_WAITING`。`controllerchange` 后只重载一次。

### 4.4 Cache API 不等于 HTTP Cache

Cache API 是脚本管理的 Request/Response 存储；它不会自动过期，也不遵循所有 HTTP 缓存语义。命中、更新、删除都由策略决定。Response 放进 Cache 前后仍需考虑 Vary、认证、隐私和配额。

### 4.5 策略必须按资源类型选择

- 导航：network-first，失败时回退公开外壳；
- 版本化静态外壳：cache-first，缺失时网络补充；
- 商品 API：本课直接走网络，不缓存；
- POST/预约：不由通用 fetch handler 缓存或伪造成功。

## 5. 元素、属性、API 或配置清单

| API / 事件 | 作用 | 关键边界 |
| --- | --- | --- |
| `navigator.serviceWorker.register()` | 注册脚本与 scope | URL 相对位置影响默认 scope |
| `registration.installing/waiting/active` | 当前版本状态 | registration 存在不代表页面受控 |
| `navigator.serviceWorker.controller` | 当前页面控制者 | 首次安装后常需新导航 |
| `install` | 准备版本资源 | 用 `waitUntil` 延长事件 |
| `activate` | 清理旧版本 | 只删除自己的命名空间 |
| `fetch` | 拦截作用域请求 | 必须限定方法、源和资源类型 |
| `respondWith()` | 指定响应 Promise | 事件中同步调用 |
| `skipWaiting()` | 让 waiting 版本申请激活 | 需评估页面/缓存协议兼容 |
| `controllerchange` | 页面控制者变化 | 防止重复 reload |
| `caches.open/match/delete` | 管理 Cache API | 无自动过期与业务新鲜度保证 |

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
  ".css": "text/css; charset=utf-8",
};

function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Service-Worker-Allowed": "/",
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
    if (url.pathname.startsWith("/api/")) {
      send(res, 503, "application/json; charset=utf-8", JSON.stringify({
        code: "API_NOT_PART_OF_OFFLINE_SHELL",
        message: "本课不缓存业务 API",
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
    send(res, status, "text/plain; charset=utf-8", "无法读取实验资源");
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
<title>邻里集市离线公告</title>
<main>
  <h1>邻里集市公开公告</h1>
  <p>线下交接前请当面检查物品，不要提前转账。</p>
  <p id="status" role="status">正在检查离线能力</p>
  <dl>
    <dt>页面是否受控</dt><dd id="controlled">未知</dd>
    <dt>Worker 状态</dt><dd id="worker-state">未知</dd>
  </dl>
  <button id="check" type="button">检查更新</button>
  <button id="apply" type="button" hidden>应用等待中的更新</button>
</main>
<script type="module" src="./app.js"></script>
</html>
```

### 6.3 `public/app.js`

```js
const status = document.querySelector("#status");
const controlled = document.querySelector("#controlled");
const workerState = document.querySelector("#worker-state");
const checkButton = document.querySelector("#check");
const applyButton = document.querySelector("#apply");

let registration;
let reloading = false;

function showControl() {
  controlled.textContent = navigator.serviceWorker.controller
    ? "是，导航与资源可能经过 Service Worker"
    : "否，首次安装后请在线刷新一次";
}

function watchInstalling(worker) {
  if (!worker) return;
  workerState.textContent = worker.state;
  worker.addEventListener("statechange", () => {
    workerState.textContent = worker.state;
    if (worker.state === "installed" && navigator.serviceWorker.controller) {
      status.textContent = "新版本已安装，等待应用";
      applyButton.hidden = false;
    }
  });
}

async function register() {
  if (!("serviceWorker" in navigator)) {
    status.textContent = "当前浏览器不支持 Service Worker，只能在线访问";
    checkButton.disabled = true;
    return;
  }
  try {
    registration = await navigator.serviceWorker.register("./sw.js");
    showControl();
    watchInstalling(registration.installing);
    if (registration.waiting) {
      status.textContent = "发现等待中的版本";
      applyButton.hidden = false;
      workerState.textContent = registration.waiting.state;
    } else {
      status.textContent = navigator.serviceWorker.controller
        ? "离线外壳已就绪"
        : "安装已提交；在线刷新后检查控制状态";
    }
    registration.addEventListener("updatefound", () => {
      status.textContent = "正在安装新版本";
      watchInstalling(registration.installing);
    });
  } catch (error) {
    status.textContent = `注册失败：${error.message}`;
  }
}

checkButton.addEventListener("click", async () => {
  if (!registration) return;
  status.textContent = "正在检查 sw.js";
  try {
    await registration.update();
    status.textContent = registration.waiting
      ? "新版本等待应用"
      : "检查完成，当前没有等待版本";
    applyButton.hidden = !registration.waiting;
  } catch (error) {
    status.textContent = `更新检查失败：${error.message}`;
  }
});

applyButton.addEventListener("click", () => {
  if (!registration?.waiting) return;
  status.textContent = "正在切换版本";
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
});

navigator.serviceWorker?.addEventListener("controllerchange", () => {
  showControl();
  if (reloading) return;
  reloading = true;
  location.reload();
});

showControl();
register();
```

### 6.4 `public/sw.js`

```js
const CACHE_PREFIX = "neighbor-market-shell-";
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const SHELL = ["./", "./index.html", "./app.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(async () => (
        await caches.match("./index.html", { cacheName: CACHE_NAME }) ??
        new Response("离线外壳不可用", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        })
      )),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => (
      cached ?? fetch(event.request)
    )),
  );
});
```

运行并验证：

```bash
cd browser-lab
node server.mjs ./public
```

1. 在线打开页面，Application > Service Workers 观察 installed/activated。
2. 在线刷新，页面“是否受控”应为“是”。
3. Network 切 Offline 后刷新，应看到公开公告；API 不会被缓存伪造。
4. 把 `sw.js` 的 `v1` 改为 `v2` 且修改公告文件，恢复在线并点“检查更新”；观察 waiting，再点应用。
5. 实验结束后在 Application 注销该 Worker，并删除 `neighbor-market-shell-*`。

## 7. 邻里集市集成案例

应用外壳只包括公开、可版本化且不含用户数据的 HTML/JS/CSS。商品列表和预约接口采用独立策略：

```text
公开外壳：版本化 Cache API，可离线
公开商品快照：如确需缓存，必须显示 fetchedAt 和离线标记
私人收藏/预约：默认不进入共享缓存
POST/PUT/DELETE：网络失败不伪造业务成功
```

发布时把外壳版本、页面代码和缓存协议视为同一兼容单元。若新页面需要新缓存结构，先让新 Worker 准备完成，再提示切换。强制立即接管之前必须证明新 Worker 能服务仍打开的旧页面。

性能证据要比较首次在线、重复在线、受控离线三种导航，并记录资源来自 network、memory/disk cache 还是 ServiceWorker。不能把 DevTools 的 “from ServiceWorker” 当成内容新鲜。

## 8. 常见错误与排查路径

### 错误示例：删除同源全部缓存

```js
// 错误：可能删除同源其他应用或功能的缓存。
caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
```

### 错误示例：缓存所有 GET

```js
// 错误：可能缓存私人 API、陈旧库存和带鉴权响应。
event.respondWith(caches.match(event.request).then(
  (hit) => hit ?? fetch(event.request).then((res) => {
    caches.open("all").then((cache) => cache.put(event.request, res.clone()));
    return res;
  }),
));
```

### 诊断记录

| 字段 | 记录 |
| --- | --- |
| 现象 | 修改 `sw.js` 后页面仍显示旧公告 |
| 证据 | Application 显示新 Worker 为 waiting，当前页面 controller 仍是旧版本 |
| 原因 | 打开的页面继续由旧 Worker 控制，新版本尚未激活 |
| 修复 | 页面提示等待版本；用户触发 `SKIP_WAITING`，`controllerchange` 后重载一次 |
| 复验 | v1 受控页面上安装 v2，提示、切换、重载和新缓存名称均可观察 |

排查顺序：确认 scope 和脚本状态，再确认 controller，然后检查 Cache Storage 名称与条目，最后看 Network 的响应来源。不要第一步就清空所有站点数据，因为那会毁掉生命周期证据。

## 9. 课后题

1. **注册成功为何不代表当前页面已受控？**
   答：当前导航发生在注册之前；Worker 需完成生命周期，通常从后续导航开始控制。
2. **waiting 状态解决什么问题？**
   答：避免新 Worker 在旧页面仍运行时无协调接管，保护跨版本一致性。
3. **Cache API 会按 `max-age` 自动删除吗？**
   答：不会。脚本负责命中和清理策略，HTTP 头仍可作为策略输入但不是自动回收保证。
4. **为什么不缓存本课 API？**
   答：离线外壳与业务数据新鲜度、隐私和授权是不同问题，不能用通用 GET 缓存混在一起。
5. **localhost 可运行是否证明生产 HTTP 可运行？**
   答：不证明。localhost 是安全上下文开发例外，生产通常必须 HTTPS。

## 10. 实践练习

### 基础：增加离线样式

新增 `styles.css` 到页面和 `SHELL`，验证在线安装后离线仍生效。

**验收答案：**Network 显示来自 ServiceWorker；install 任一资源失败时不激活半成品版本。

### 进阶：广播版本

激活后用 `clients.matchAll()` 向页面发送新缓存版本，页面显示但不泄露其他客户端信息。

**验收答案：**消息有版本字段；页面验证结构；多标签页均得到一致提示；旧页面兼容该消息。

### 故障注入：预缓存 404

把不存在的文件加入 `SHELL`。

**验收答案：**install 失败，旧 active 版本继续；Application 有失败证据；修正清单后再更新，不清空其他缓存。

## 11. 阶段验收

- [ ] 四个文件可运行，首次安装、刷新受控和离线导航可复现；
- [ ] v1 → v2 可观察 installing、waiting、activate 与 controllerchange；
- [ ] 只清理 `neighbor-market-shell-` 旧版本；
- [ ] API 和非 GET 不被通用缓存；
- [ ] 页面在不支持、注册失败和更新失败时仍有在线回退；
- [ ] 能说明 Cache API、HTTP cache、业务快照和权威状态的区别；
- [ ] 未声称本地 HTTP、单标签页实验等同生产 HTTPS 更新策略。

## 12. 常见问题

**开发时可以勾选 Update on reload 吗？**
可以辅助开发，但它改变正常更新节奏。验收生命周期时应关闭并按真实流程观察。

**需要每次都 `clients.claim()` 吗？**
不需要。它让新 active Worker 立即控制现有未受控页面，可能改变首次加载行为；只有明确兼容策略时使用。

**离线页面能提交预约吗？**
只能保存“待提交草稿”并明确未确认；联网后仍需服务端重新校验状态、版本和权限。

**为什么 `sw.js` 也设置 no-store？**
教学服务避免额外 HTTP 缓存干扰更新观察；生产应遵循浏览器更新检查规则和部署策略。

## 13. 扩展阅读

- [Service Workers specification](https://w3c.github.io/ServiceWorker/)
- [MDN: Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN: Cache](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [web.dev: The service worker lifecycle](https://web.dev/articles/service-worker-lifecycle)

资料快照日期：2026-10-11。实验未验证生产 HTTPS、CDN、多个部署版本、存储压力驱逐、Safari/Firefox 或真实 PWA 安装环境。

## 我现在能做到什么

我能观察并解释 Service Worker 的生命周期和页面控制权，建立只覆盖公开外壳的版本化缓存，并让更新与离线状态对用户可见而不破坏同源其他数据。

## 单元导航

[上一课：Web Worker](01-web-worker-messaging-transfer-cancel.md) · [本章目录](../README.md#05-worker离线与平台能力) · [下一课：离线一致性与更新](03-offline-consistency-updates.md)
