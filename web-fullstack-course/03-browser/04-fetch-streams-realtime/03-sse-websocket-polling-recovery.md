# SSE、WebSocket 与轮询：重连、游标和重复抑制

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个可切换 SSE/轮询的商品状态看板，能显示连接状态、断线重连、事件游标和重复抑制 |
| 文件 | `browser-lab/server.mjs`、`browser-lab/public/index.html`、`browser-lab/public/main.js` |
| 运行方式 | `node server.mjs ./public`，打开 `http://127.0.0.1:3300` |
| 故障设计 | SSE 每发送 4 条后主动断开；重连时故意回放上一条事件 |
| 可观察证据 | Network 中重复 SSE 请求、`Last-Event-ID`、轮询请求、页面连接状态与去重计数 |
| 业务边界 | 状态事件只是通知；最终预约结果仍以权威读取/写入接口为准 |
| 安全边界 | 实验无认证、无私人数据；生产订阅必须校验身份、对象权限与 Origin |
| 证据边界 | 本机重连与回放不证明生产代理、集群日志或跨区域链路可靠 |
| 建议时间 | 阅读 40 分钟，实验 50 分钟，练习 30 分钟 |

## 1. 任务背景

邻里集市需要及时提示“商品已被预约”。有三种常见选择：

- 客户端每隔一段时间轮询；
- 服务端通过 SSE 单向推送；
- 双方通过 WebSocket 持续双向通信。

选型不能只看“实时”两个字。还要回答：消息方向、连接数量、代理支持、断线恢复、事件游标、重复和丢失、鉴权更新、页面生命周期以及最终业务一致性。

本课让服务端每秒生成一个公开商品状态事件，并故意断开 SSE。重连时服务端回放上一条，客户端必须去重。这个实验说明“自动重连”不等于“恰好一次”，而重复抑制也不等于“绝不丢失”。

## 2. 学习目标

完成本课后，你能够：

- 按消息方向和恢复需求比较轮询、SSE 与 WebSocket；
- 解释 SSE 的事件字段、自动重连和 `Last-Event-ID`；
- 用单调游标恢复，并在客户端幂等处理重复事件；
- 为轮询设置停止、退避、可见性和取消边界；
- 让连接状态对用户可见，而不是静默显示陈旧数据；
- 区分传输送达、事件处理和业务事实三种保证。

## 3. 预备知识

应先完成[可靠 Fetch](01-reliable-fetch-timeout-cancel-race.md)，理解取消和 HTTP 错误；了解 `pagehide/pageshow` 与页面可能进入 bfcache。

实验使用同源 HTTP。EventSource 在本例不需要自定义请求头；真实跨源方案需要同时审查 CORS、Cookie `SameSite`、凭据暴露和 URL 日志。不要把长期 Token 放在查询字符串。

## 4. 核心理论

### 4.1 先确定通信形状

| 机制 | 方向 | 浏览器接口 | 适用场景 | 主要恢复成本 |
| --- | --- | --- | --- | --- |
| 短轮询 | 客户端定时请求 | `fetch()` | 低频变化、简单兼容 | 间隔延迟、请求开销、停止条件 |
| 长轮询 | 服务端延迟响应 | `fetch()` | 事件较少且需较快到达 | 超时、并发请求、代理限制 |
| SSE | 服务端到客户端 | `EventSource` | 通知、进度、状态变化 | 游标、代理缓冲、连接数 |
| WebSocket | 双向 | `WebSocket` | 聊天、协同、低延迟双向控制 | 心跳、协议、背压、重连、鉴权 |

商品状态通知是服务端单向，SSE 足够；聊天需要频繁双向消息，WebSocket 才更自然。不要为了“高级”增加双向协议。

### 4.2 SSE 的帧和游标

SSE 响应使用 `text/event-stream`。事件由若干字段和一个空行结束：

```text
id: 42
event: listing-status
data: {"listingId":"listing-1","status":"reserved"}

```

浏览器记住最近分发的 `id`，重连时通常通过 `Last-Event-ID` 请求头发送。服务端应从可重放日志中补发其后的事件。若日志过期，应明确要求客户端重新获取权威快照，而不是假装连续。

### 4.3 至少一次与幂等处理

连接可能在服务端发送后、客户端确认前断开。为避免丢失，服务端可能重放，因此客户端要按事件 ID 去重，并让状态更新幂等：

```text
同一 listing-status 事件执行两次 → 最终状态仍相同
```

“看到 ID 42”不证明 43 没丢。连续性还要检查游标，并在缺口时重新同步快照。

### 4.4 连接状态是产品状态

至少显示：

```text
connecting → live → reconnecting → stopped
polling → waiting → polling
```

断线时页面已有数据成为快照。应标注“正在重连”与最后更新时间，不能继续显示绿色“实时”。

### 4.5 WebSocket 不是消息队列

WebSocket 提供有序字节/消息通道，但不自动提供：

- 持久化和离线补发；
- 业务消息确认；
- 跨重连去重；
- 对象授权；
- 发送速度大于消费速度时的应用背压；
- Token 更新和服务端撤销。

这些都要由应用协议和服务端状态补齐。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 关键边界 |
| --- | --- | --- |
| `EventSource` | 建立 SSE 连接 | 只支持 GET 风格连接；请求头控制有限 |
| `open/message/error` | 连接与事件状态 | `error` 后通常自动重连 |
| `event.lastEventId` | 当前事件游标 | 需要服务端稳定、单调且可重放 |
| `retry:` | 建议重连等待毫秒 | 不是业务重试预算 |
| `Last-Event-ID` | 重连时发送最后游标 | 代理与服务端需保留并使用 |
| `EventSource.close()` | 主动停止重连 | 页面离开和模式切换时必须调用 |
| `WebSocket.readyState` | 连接状态 | `OPEN` 也不证明订阅已授权 |
| `WebSocket.bufferedAmount` | 待发送字节 | 应用背压的一个信号 |
| `document.visibilityState` | 页面可见性 | 可用于降低轮询频率，不代表离线 |
| `pagehide/pageshow` | 页面生命周期 | bfcache 恢复时重建必要连接 |

## 6. 最小可运行案例

下面服务维护最近 100 条内存事件。它没有持久化，重启后游标从 1 开始，因此只适合教学。

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
const history = [];
const subscribers = new Set();
const listingIds = ["listing-1", "listing-2", "listing-3"];
const statuses = ["available", "reserved", "available"];
let nextId = 1;

function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function createEvent() {
  const id = nextId;
  nextId += 1;
  const event = {
    id,
    listingId: listingIds[(id - 1) % listingIds.length],
    status: statuses[(id - 1) % statuses.length],
    occurredAt: new Date().toISOString(),
  };
  history.push(event);
  if (history.length > 100) history.shift();
  return event;
}

function writeSse(res, event) {
  res.write(`id: ${event.id}\n`);
  res.write("event: listing-status\n");
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

const ticker = setInterval(() => {
  const event = createEvent();
  for (const client of subscribers) client.push(event);
}, 1000);
ticker.unref();

function openSse(req, res) {
  const headerId = Number(req.headers["last-event-id"] ?? "0");
  const lastId = Number.isInteger(headerId) && headerId >= 0 ? headerId : 0;
  let sent = 0;

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write("retry: 1000\n");
  res.write(": connected\n\n");

  // 故意从上一条开始回放，用于验证客户端重复抑制。
  for (const event of history.filter((item) => item.id > Math.max(0, lastId - 1))) {
    writeSse(res, event);
    sent += 1;
  }

  const client = {
    push(event) {
      if (res.destroyed) return;
      writeSse(res, event);
      sent += 1;
      if (sent >= 4) res.end();
    },
  };
  subscribers.add(client);
  res.on("close", () => subscribers.delete(client));
}

function pollEvents(url, res) {
  const after = Number(url.searchParams.get("after") ?? "0");
  if (!Number.isInteger(after) || after < 0) {
    send(res, 400, "application/json; charset=utf-8", JSON.stringify({
      code: "INVALID_CURSOR",
      message: "after 必须是非负整数",
    }));
    return;
  }
  const events = history.filter((item) => item.id > after).slice(0, 20);
  send(res, 200, "application/json; charset=utf-8", JSON.stringify({
    events,
    nextCursor: events.at(-1)?.id ?? after,
    serverTime: new Date().toISOString(),
  }));
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/events") {
      openSse(req, res);
      return;
    }
    if (url.pathname === "/api/v1/events") {
      pollEvents(url, res);
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
<title>商品实时状态</title>
<main>
  <h1>邻里集市状态看板</h1>
  <fieldset>
    <legend>连接方式</legend>
    <label><input name="mode" type="radio" value="sse" checked> SSE</label>
    <label><input name="mode" type="radio" value="poll"> 轮询</label>
  </fieldset>
  <button id="start" type="button">开始</button>
  <button id="stop" type="button">停止</button>
  <p id="connection" role="status">已停止</p>
  <p>最近游标：<output id="cursor">0</output>；
    抑制重复：<output id="duplicates">0</output></p>
  <ul id="events" aria-label="最近商品状态"></ul>
</main>
<script type="module" src="./main.js"></script>
</html>
```

### 6.3 `public/main.js`

```js
const startButton = document.querySelector("#start");
const stopButton = document.querySelector("#stop");
const connection = document.querySelector("#connection");
const cursorOutput = document.querySelector("#cursor");
const duplicateOutput = document.querySelector("#duplicates");
const eventList = document.querySelector("#events");

let eventSource;
let pollController;
let running = false;
let cursor = 0;
let duplicateCount = 0;
const seen = new Set();

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

function validateEvent(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    !Number.isInteger(value.id) ||
    value.id < 1 ||
    typeof value.listingId !== "string" ||
    !["available", "reserved"].includes(value.status) ||
    Number.isNaN(Date.parse(value.occurredAt))
  ) {
    throw new TypeError("事件结构不合法");
  }
  return value;
}

function applyEvent(raw) {
  const event = validateEvent(raw);
  if (seen.has(event.id)) {
    duplicateCount += 1;
    duplicateOutput.value = String(duplicateCount);
    return;
  }
  if (event.id > cursor + 1 && cursor !== 0) {
    connection.textContent = `发现游标缺口 ${cursor} → ${event.id}，需重取快照`;
  }
  seen.add(event.id);
  if (seen.size > 500) {
    const oldest = Math.min(...seen);
    seen.delete(oldest);
  }
  cursor = Math.max(cursor, event.id);
  cursorOutput.value = String(cursor);

  const row = document.createElement("li");
  row.textContent =
    `#${event.id} ${event.listingId} → ${event.status} @ ${event.occurredAt}`;
  eventList.prepend(row);
  while (eventList.children.length > 8) eventList.lastElementChild.remove();
}

function startSse() {
  if (!running) return;
  if (!("EventSource" in window)) {
    connection.textContent = "不支持 SSE，切换为轮询";
    startPolling();
    return;
  }
  connection.textContent = "SSE 连接中";
  eventSource = new EventSource("/events");
  eventSource.addEventListener("open", () => {
    connection.textContent = "SSE 实时连接";
  });
  eventSource.addEventListener("listing-status", (event) => {
    try {
      applyEvent(JSON.parse(event.data));
    } catch (error) {
      connection.textContent = `忽略非法事件：${error.message}`;
    }
  });
  eventSource.addEventListener("error", () => {
    if (running) connection.textContent = "SSE 已断开，浏览器等待重连";
  });
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    }, { once: true });
  });
}

async function startPolling() {
  pollController?.abort();
  pollController = new AbortController();
  const controller = pollController;
  connection.textContent = "轮询已启动";

  try {
    while (running && !controller.signal.aborted) {
      if (document.visibilityState === "hidden") {
        connection.textContent = "页面隐藏，暂停轮询";
        await wait(2000, controller.signal);
        continue;
      }
      connection.textContent = "轮询请求中";
      const response = await fetch(`/api/v1/events?after=${cursor}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.events)) throw new TypeError("轮询响应不合法");
      data.events.forEach(applyEvent);
      connection.textContent = `轮询等待中，服务时间 ${data.serverTime}`;
      await wait(1500, controller.signal);
    }
  } catch (error) {
    if (!controller.signal.aborted && running) {
      connection.textContent = `轮询失败：${error.message}`;
      await wait(2000, controller.signal).catch(() => {});
      if (running && pollController === controller) startPolling();
    }
  }
}

function stop() {
  running = false;
  eventSource?.close();
  eventSource = undefined;
  pollController?.abort(new DOMException("停止轮询", "AbortError"));
  pollController = undefined;
  connection.textContent = "已停止，现有状态是快照";
}

function start() {
  stop();
  running = true;
  if (selectedMode() === "sse") startSse();
  else startPolling();
}

startButton.addEventListener("click", start);
stopButton.addEventListener("click", stop);
window.addEventListener("pagehide", stop);
window.addEventListener("pageshow", (event) => {
  if (event.persisted) start();
});
```

运行：

```bash
cd browser-lab
node server.mjs ./public
```

选择 SSE 并开始。每 4 条左右连接会断开，状态变为“等待重连”，Network 出现新 `/events` 请求，页面的重复计数增加但列表不重复。切换轮询前先点停止，再选轮询并开始；Network 应约每 1.5 秒出现请求。页面隐藏时轮询降低活动，返回后恢复。

## 7. 邻里集市集成案例

生产集成分两条链：

```text
事件链：listing-status(id, listingId, status, occurredAt)
权威链：GET /api/v1/listings/:id → 当前版本与可预约状态
```

事件用于提醒页面“可能已变化”，权威读取决定按钮是否可用。预约提交仍应带预期版本或等价并发条件，由服务端事务决定成功或冲突。

订阅端的安全规则：

- 连接建立时验证会话；
- 每个主题验证对象/租户权限，而不是只验证已登录；
- 会话撤销或权限变化后关闭或降权连接；
- 校验 `Origin` 和消息结构；
- 日志只记录连接 ID、事件 ID、主题和错误类别，不记录凭据；
- 私人事件不能进入共享缓存。

离线期间的事件可能超过保留窗口。重连发现游标太旧时，服务端返回“需要快照”信号，客户端清理不再可信的派生状态并重新读取。性能预算要同时考虑每用户连接、心跳、代理空闲超时、事件速率和页面渲染频率。

## 8. 常见错误与排查路径

### 错误示例：每次 error 都新建 EventSource

```js
// 错误：EventSource 本身会重连，这会制造并行连接。
source.onerror = () => {
  source = new EventSource("/events");
};
```

### 错误示例：连接成功等于数据可靠

```js
// 错误：OPEN 只表示传输建立，不表示订阅已授权或历史已补齐。
if (socket.readyState === WebSocket.OPEN) {
  showBadge("数据完全同步");
}
```

### 诊断记录

| 字段 | 记录 |
| --- | --- |
| 现象 | 断线重连后同一商品状态在列表出现两次 |
| 证据 | Network 新请求携带 `Last-Event-ID: 7`；服务端故意从事件 7 回放 |
| 原因 | 恢复采用至少一次投递，客户端没有按稳定事件 ID 幂等处理 |
| 修复 | 处理前检查 `seen`，状态提交使用事件 ID/版本，发现游标缺口时重取快照 |
| 复验 | 连续经历 5 次主动断线，重复计数增加但可见事件 ID 唯一且递增 |

排查顺序：

1. 页面状态是否为 live、reconnecting 还是 stopped；
2. Network 是否存在多个并行连接；
3. 请求是否带预期 Cookie/Origin/`Last-Event-ID`，但不要截图泄露凭据；
4. 服务端保留窗口是否覆盖游标；
5. 客户端是否按事件 ID 去重并检查缺口；
6. 最终业务状态是否经权威接口复核。

## 9. 课后题

1. **商品状态通知为什么优先考虑 SSE 而不是 WebSocket？**
   答：主要是服务端单向通知，SSE 协议、浏览器重连和 HTTP 基础设施更简单。
2. **EventSource 自动重连是否保证不丢消息？**
   答：不保证。需要稳定 ID、可重放日志、保留窗口和缺口恢复。
3. **客户端去重是否保证恰好一次？**
   答：只在其去重状态有效范围内抑制重复；崩溃、清理或 ID 复用都可能改变结果。
4. **轮询间隔越短越好吗？**
   答：不是。延迟下降会增加请求、功耗和服务负载，应按业务新鲜度预算选择。
5. **WebSocket `open` 后为什么仍不能显示“已同步”？**
   答：连接建立不证明鉴权、订阅确认、历史补齐和最新快照都完成。

## 10. 实践练习

### 基础：显示最后更新时间

每次应用新事件时更新“最后事件时间”，断线时保留并标注为快照。

**验收答案：**时间来自事件的 UTC ISO 8601，显示时本地化；重复事件不刷新“新事件”计数。

### 进阶：过期游标恢复

让服务只保留 5 条；客户端使用更早游标时返回 `409 CURSOR_EXPIRED`，然后重新获取快照。

**验收答案：**不从 0 静默重放；UI 显示重新同步；快照完成后再恢复事件；权限检查不被绕过。

### 故障注入：重复绑定连接

故意连续点击开始 5 次，观察 Network 连接数，再修复为始终先关闭旧连接。

**验收答案：**修复后任一时刻每页面最多一个 SSE 或一个轮询循环；停止后无后续请求。

## 11. 阶段验收

- [ ] 三个文件可独立运行，SSE 和轮询都能更新状态；
- [ ] SSE 主动断开后状态可见并自动恢复；
- [ ] 服务端回放重复事件，客户端不重复渲染；
- [ ] 停止、模式切换和 bfcache 恢复不会留下并行连接；
- [ ] 能解释事件通知、权威状态和预约事务的关系；
- [ ] 能列出认证、对象授权、Origin、游标保留和日志脱敏边界；
- [ ] 未把本地每秒事件实验写成生产容量或可靠性证明。

## 12. 常见问题

**SSE 能发送二进制吗？**
协议是 UTF-8 文本。二进制可编码为文本，但体积和处理成本通常使其他传输更合适。

**EventSource 可以设置 Authorization 头吗？**
原生接口不能任意设置请求头。同源 Cookie、短期 URL 票据或 Fetch 流各有安全代价，需按架构选择；不要把长期密钥放 URL。

**页面隐藏时应该断开 SSE 吗？**
取决于新鲜度和连接预算。断开后必须能按游标恢复；保持连接则要考虑后台限制和资源成本。

**轮询响应为空算错误吗？**
不算。它表示当前游标之后暂无事件；仍要更新连接健康状态和下一次计划。

## 13. 扩展阅读

- [HTML Standard: Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [MDN: EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [WebSockets Standard](https://websockets.spec.whatwg.org/)
- [MDN: WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [RFC 9110: HTTP Semantics](https://httpwg.org/specs/rfc9110.html)

资料快照日期：2026-10-11。实验未覆盖生产代理超时、HTTP/2 连接上限、集群事件日志、跨区域恢复、Safari/Firefox 或真实登录会话。

## 我现在能做到什么

我能按通信方向选择轮询、SSE 或 WebSocket，能实现带游标、重连状态和重复抑制的单向通知，并明确说明传输恢复不等于业务一致性。

## 单元导航

[上一课：可读流与增量解析](02-readable-stream-incremental-parsing.md) · [本章入口](../04-fetch-streams-realtime.md) · [下一章：Worker、离线与平台能力](../05-workers-offline-webapis.md)
