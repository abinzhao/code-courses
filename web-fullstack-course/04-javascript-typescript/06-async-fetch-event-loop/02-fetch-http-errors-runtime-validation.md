# Fetch、HTTP 错误与运行时校验

## 任务卡

- **本课产出**：`js-lab/fetch/fetch-api.mjs`，一个启动本地 API、执行 12 组响应场景和 1 组关闭后网络失败并自行退出的完整文件。
- **运行环境**：Node.js 24 LTS，使用内置 `fetch` 与 `node:http`。
- **预计时间**：120 分钟。
- **完成证据**：独立观察 200、400、401、404、409、500、正文中断、JSON 解析失败、通用结构
  契约失败、日期/ID/分页契约失败和服务关闭后的网络失败。

## 1. 任务背景

`fetch()` fulfilled 只说明收到了 HTTP 响应，不说明状态码成功；`response.json()` 成功只说明正文是 JSON，不说明字段符合商品契约。一个可靠客户端至少要逐层处理：

```text
网络传输 -> HTTP 状态 -> 正文解码 -> 运行时契约 -> 业务/UI
```

邻里集市搜索 API 还需要保留 `requestId`，让 401、409 与 500 有可追踪证据。本课用自关闭本地服务制造每种结果，不依赖外部网络。

## 2. 学习目标

完成本课后，你能够：

1. 使用 `URL` 与 `URLSearchParams` 构造查询；
2. 区分网络拒绝和 HTTP 非 2xx 响应；
3. 检查 `response.ok` 与 `response.status`；
4. 理解响应正文通常只能消费一次；
5. 区分 JSON 解码错误与字段契约错误；
6. 从错误正文或响应头保留 `requestId`；
7. 对商品分页结果执行运行时校验和已知字段重建；
8. 分别处理 401 身份失效、409 版本冲突与 500 服务故障；
9. 说明 Cookie、CORS、CSRF 和对象授权的不同职责。

## 3. 预备知识

你需要理解 Promise、`async` / `await`、异常、JSON 和完整商品记录。创建目录：

```bash
mkdir -p js-lab/fetch
```

本课服务只监听 `127.0.0.1`，数据固定在进程内存中，不执行写事务。不要把它描述为生产 API。

## 4. 核心理论

### 4.1 Fetch 只在请求层失败时拒绝

DNS、连接失败、TLS 或显式取消等会让 Fetch Promise rejected。服务器返回 404 或 500 时，Fetch 通常仍 fulfilled，并携带 `Response`；必须检查 `response.ok`。

错误分类应保留原层级。把所有错误都显示成“网络错误”会误导排查，也会让服务端 500 和客户端离线无法区分。

### 4.2 响应正文是流

`response.text()`、`json()` 等会消费正文。读取一次后再读通常会报正文已使用。本课先读取文本，再用 `JSON.parse` 解码，这样 HTTP 错误也能保留原始状态和请求 ID。

成功状态的非法 JSON 属于**解析错误**；合法 JSON 但 `items`、金额或分页字段错误属于**契约错误**。TypeScript 泛型也不能替代这一步运行时校验。

### 4.3 非 2xx 仍要解析错误契约

错误正文可包含 `{ code, message, requestId }`。客户端先以 HTTP 状态为主分类，再安全提取可用字段。不能把服务器返回的任意 HTML 或对象直接插入页面。

- 401：当前身份缺失或已失效，引导重新认证；
- 409：版本或唯一约束冲突，读取最新状态并让用户决策；
- 500：服务器故障，保留请求 ID，允许合适的重试；
- 400/404：分别表示请求不符合契约或资源/路由不存在。

### 4.4 安全边界不能互相替代

浏览器同源请求默认携带同源凭据策略；跨源是否允许由 CORS 响应决定。CORS 是浏览器读取策略，不是身份认证。Cookie 身份请求仍需要 CSRF 防护；无论按钮是否显示，服务端都必须做对象授权。

本课 GET 查询不产生写事务。后续即便使用 `AbortController` 取消客户端等待，也不意味着服务端已经回滚写操作。

## 5. 元素、属性、API 或配置清单

| API 或字段 | 作用 | 注意事项 |
| --- | --- | --- |
| `new URL(path, base)` | 安全组合 URL | 基准 URL 必须有效 |
| `URLSearchParams` | 编码查询参数 | 不手工拼接用户文本 |
| `fetch(url, init)` | 发出请求 | 404/500 通常不会 reject |
| `credentials: "same-origin"` | 同源时携带凭据 | 不提供 CSRF 或授权 |
| `response.ok` | 状态是否为 200-299 | 仍需解码和校验 |
| `response.status` | HTTP 状态码 | 网络失败时没有 Response |
| `response.headers` | 响应元数据 | 可读取 `x-request-id` |
| `response.text()` | 消费正文为文本 | 通常只能消费一次 |
| `JSON.parse(text)` | JSON 文本解码 | 成功不等于契约有效 |
| `AbortSignal` | 取消客户端等待 | 不保证撤销服务端事务 |

## 6. 最小可运行案例

最小的分层轮廓如下：

```js
async function fetchJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (cause) {
    throw new Error("network failure", { cause });
  }

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new Error("JSON parse failure", { cause });
  }
}
```

这个版本已经区分网络、HTTP 与解码，但还没有错误正文和商品契约。完整实现见下一节。

## 7. 邻里集市集成案例

创建完整文件 `js-lab/fetch/fetch-api.mjs`：

```js
import { createServer } from "node:http";
import { once } from "node:events";

class FetchLayerError extends Error {
  constructor(kind, message, options = {}) {
    super(message, { cause: options.cause });
    this.name = "FetchLayerError";
    this.kind = kind;
    this.status = options.status;
    this.requestId = options.requestId;
  }
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseListing(input, index) {
  if (!isRecord(input)) {
    throw new TypeError(`items[${index}] must be an object`);
  }
  if (typeof input.id !== "string" || input.id.length === 0) {
    throw new TypeError(`items[${index}].id must be a non-empty string`);
  }
  if (typeof input.title !== "string" || input.title.length === 0) {
    throw new TypeError(`items[${index}].title must be a non-empty string`);
  }
  if (typeof input.description !== "string") {
    throw new TypeError(`items[${index}].description must be a string`);
  }
  if (!Number.isSafeInteger(input.priceCents) || input.priceCents < 0) {
    throw new TypeError(
      `items[${index}].priceCents must be a non-negative safe integer`,
    );
  }
  if (input.status !== "available" && input.status !== "sold") {
    throw new TypeError(`items[${index}].status is invalid`);
  }
  if (typeof input.ownerId !== "string" || input.ownerId.length === 0) {
    throw new TypeError(`items[${index}].ownerId must be a non-empty string`);
  }
  if (!Number.isSafeInteger(input.version) || input.version < 1) {
    throw new TypeError(`items[${index}].version must be a positive integer`);
  }
  if (
    typeof input.createdAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(
      input.createdAt,
    )
  ) {
    throw new TypeError(`items[${index}].createdAt must be a UTC timestamp`);
  }
  const timestamp = Date.parse(input.createdAt);
  if (!Number.isFinite(timestamp)) {
    throw new TypeError(`items[${index}].createdAt is not a calendar date`);
  }
  const normalizedCreatedAt = new Date(timestamp).toISOString();
  const canonicalInput = input.createdAt.includes(".")
    ? input.createdAt
    : input.createdAt.replace("Z", ".000Z");
  if (normalizedCreatedAt !== canonicalInput) {
    throw new TypeError(`items[${index}].createdAt is not a calendar date`);
  }

  return {
    id: input.id,
    title: input.title,
    description: input.description,
    priceCents: input.priceCents,
    status: input.status,
    ownerId: input.ownerId,
    version: input.version,
    createdAt: normalizedCreatedAt,
  };
}

function parseListingPage(input) {
  if (!isRecord(input)) {
    throw new TypeError("page must be an object");
  }
  if (!Array.isArray(input.items)) {
    throw new TypeError("page.items must be an array");
  }
  if (!Number.isSafeInteger(input.page) || input.page < 1) {
    throw new TypeError("page.page must be a positive integer");
  }
  if (
    !Number.isSafeInteger(input.pageSize) ||
    input.pageSize < 1 ||
    input.pageSize > 50
  ) {
    throw new TypeError("page.pageSize must be an integer from 1 to 50");
  }
  if (!Number.isSafeInteger(input.total) || input.total < 0) {
    throw new TypeError("page.total must be a non-negative integer");
  }
  const offset = (input.page - 1) * input.pageSize;
  if (!Number.isSafeInteger(offset)) {
    throw new TypeError("page offset exceeds the safe integer range");
  }
  const remaining = Math.max(0, input.total - offset);
  if (input.items.length > input.pageSize || input.items.length > remaining) {
    throw new TypeError("page metadata contradicts item count");
  }
  const items = input.items.map(parseListing);
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new TypeError("page.items contains a duplicate listing id");
  }

  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    total: input.total,
  };
}

function parseErrorBody(input) {
  if (!isRecord(input)) return null;
  return {
    code: typeof input.code === "string" ? input.code : "UNKNOWN",
    message:
      typeof input.message === "string" ? input.message : "request failed",
    requestId:
      typeof input.requestId === "string" ? input.requestId : undefined,
  };
}

async function fetchListingPage(baseUrl, query, pathname = "/api/listings") {
  const url = new URL(pathname, baseUrl);
  url.search = new URLSearchParams({ q: query }).toString();

  let response;
  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      credentials: "same-origin",
    });
  } catch (cause) {
    throw new FetchLayerError("network", "request did not reach a response", {
      cause,
    });
  }

  const headerRequestId = response.headers.get("x-request-id") ?? undefined;
  let text;
  try {
    text = await response.text();
  } catch (cause) {
    throw new FetchLayerError("body", "response body could not be read", {
      cause,
      status: response.status,
      requestId: headerRequestId,
    });
  }
  let decoded;
  try {
    decoded = JSON.parse(text);
  } catch (cause) {
    if (!response.ok) {
      throw new FetchLayerError(
        "http",
        `HTTP ${response.status} with an unreadable error body`,
        {
          cause,
          status: response.status,
          requestId: headerRequestId,
        },
      );
    }
    throw new FetchLayerError("parse", "success body is not valid JSON", {
      cause,
      status: response.status,
      requestId: headerRequestId,
    });
  }

  if (!response.ok) {
    const errorBody = parseErrorBody(decoded);
    throw new FetchLayerError(
      "http",
      errorBody?.message ?? `HTTP ${response.status}`,
      {
        status: response.status,
        requestId: errorBody?.requestId ?? headerRequestId,
      },
    );
  }

  try {
    return parseListingPage(decoded);
  } catch (cause) {
    throw new FetchLayerError("contract", "response contract is invalid", {
      cause,
      status: response.status,
      requestId: headerRequestId,
    });
  }
}

const listings = [
  {
    id: "listing-1",
    title: "台灯",
    description: "功能正常，自提",
    priceCents: 1990,
    status: "available",
    ownerId: "user-1",
    version: 1,
    createdAt: "2026-10-10T08:00:00.000Z",
  },
  {
    id: "listing-2",
    title: "木椅",
    description: "有使用痕迹",
    priceCents: 0,
    status: "available",
    ownerId: "user-2",
    version: 1,
    createdAt: "2026-10-10T09:00:00.000Z",
  },
];

let requestSequence = 0;

function sendJson(response, status, body, requestId) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "x-request-id": requestId,
  });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  requestSequence += 1;
  const requestId = `req-${requestSequence}`;
  const url = new URL(request.url ?? "/", "http://127.0.0.1");

  if (request.method !== "GET" || url.pathname !== "/api/listings") {
    sendJson(
      response,
      404,
      { code: "NOT_FOUND", message: "route not found", requestId },
      requestId,
    );
    return;
  }

  const query = url.searchParams.get("q") ?? "";
  if (query.length > 40) {
    sendJson(
      response,
      400,
      { code: "INVALID_QUERY", message: "query is too long", requestId },
      requestId,
    );
    return;
  }
  if (query === "unauthorized") {
    sendJson(
      response,
      401,
      { code: "UNAUTHENTICATED", message: "sign in required", requestId },
      requestId,
    );
    return;
  }
  if (query === "conflict") {
    sendJson(
      response,
      409,
      { code: "VERSION_CONFLICT", message: "listing changed", requestId },
      requestId,
    );
    return;
  }
  if (query === "server-error") {
    sendJson(
      response,
      500,
      { code: "INTERNAL", message: "teaching failure", requestId },
      requestId,
    );
    return;
  }
  if (query === "malformed-json") {
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "x-request-id": requestId,
    });
    response.end("{");
    return;
  }
  if (query === "truncated-body") {
    const body = JSON.stringify({
      items: listings,
      page: 1,
      pageSize: 20,
      total: listings.length,
    });
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "content-length": Buffer.byteLength(body),
      "x-request-id": requestId,
    });
    response.flushHeaders();
    response.write(body.slice(0, Math.floor(body.length / 2)));
    setTimeout(() => response.destroy(), 20);
    return;
  }
  if (query === "malformed-data") {
    sendJson(
      response,
      200,
      { items: "not-an-array", page: 1, pageSize: 20, total: 1 },
      requestId,
    );
    return;
  }
  if (query === "invalid-date") {
    sendJson(
      response,
      200,
      {
        items: [{ ...listings[0], createdAt: "2026-02-30T08:00:00.000Z" }],
        page: 1,
        pageSize: 20,
        total: 1,
      },
      requestId,
    );
    return;
  }
  if (query === "duplicate-id") {
    sendJson(
      response,
      200,
      { items: [listings[0], listings[0]], page: 1, pageSize: 20, total: 2 },
      requestId,
    );
    return;
  }
  if (query === "inconsistent-page") {
    sendJson(
      response,
      200,
      { items: [listings[0]], page: 2, pageSize: 20, total: 1 },
      requestId,
    );
    return;
  }

  const normalized = query.toLocaleLowerCase("zh-CN");
  const items = listings.filter((item) =>
    item.title.toLocaleLowerCase("zh-CN").includes(normalized),
  );
  sendJson(
    response,
    200,
    { items, page: 1, pageSize: 20, total: items.length },
    requestId,
  );
});

async function observe(label, operation) {
  try {
    const page = await operation();
    console.log(`${label}:ok:${page.items.length}`);
  } catch (error) {
    if (error instanceof FetchLayerError) {
      console.log(
        `${label}:${error.kind}:${error.status ?? "-"}:${error.requestId ?? "-"}`,
      );
      return;
    }
    throw error;
  }
}

server.listen(0, "127.0.0.1");
await once(server, "listening");
const address = server.address();
if (!address || typeof address === "string") {
  throw new Error("unexpected server address");
}
const baseUrl = `http://127.0.0.1:${address.port}`;

try {
  await observe("200", () => fetchListingPage(baseUrl, "灯"));
  await observe("400", () => fetchListingPage(baseUrl, "x".repeat(41)));
  await observe("404", () => fetchListingPage(baseUrl, "", "/missing"));
  await observe("500", () => fetchListingPage(baseUrl, "server-error"));
  await observe("body", () => fetchListingPage(baseUrl, "truncated-body"));
  await observe("parse", () => fetchListingPage(baseUrl, "malformed-json"));
  await observe("contract", () => fetchListingPage(baseUrl, "malformed-data"));
  await observe("date", () => fetchListingPage(baseUrl, "invalid-date"));
  await observe("duplicate", () => fetchListingPage(baseUrl, "duplicate-id"));
  await observe("pagination", () =>
    fetchListingPage(baseUrl, "inconsistent-page"),
  );
  await observe("401", () => fetchListingPage(baseUrl, "unauthorized"));
  await observe("409", () => fetchListingPage(baseUrl, "conflict"));
} finally {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

await observe("after-close", () => fetchListingPage(baseUrl, "灯"));
```

运行：

```bash
node fetch/fetch-api.mjs
```

关键输出类别应依次为：

```text
200:ok:1
400:http:400:...
404:http:404:...
500:http:500:...
body:body:200:...
parse:parse:200:...
contract:contract:200:...
date:contract:200:...
duplicate:contract:200:...
pagination:contract:200:...
401:http:401:...
409:http:409:...
after-close:network:-:-
```

每次请求 ID 由本地服务生成，具体尾号以实际输出为准。`body` 场景证明收到 200 与响应头后，
正文流仍可能中断；它保留状态、请求 ID 和底层原因。脚本在场景结束后关闭服务，再发一次请求
证明网络层失败；进程应自行退出。

## 8. 常见错误与排查路径

### 错误示例：只写 `await fetch(...).then(response => response.json())`

```js
const data = await fetch(url).then((response) => response.json());
render(data.items);
```

五段诊断记录：

1. **现象**：500 错误正文被当成成功数据，随后在 `data.items` 处失败。
2. **证据**：Network 中状态为 500，但 Fetch Promise 已 fulfilled；堆栈落在渲染而非请求边界。
3. **原因**：没有检查 `response.ok`，也没有对解码结果执行运行时契约校验。
4. **修复**：按网络、HTTP、正文解析、契约四层建立独立错误；保留状态码和 `requestId`。
5. **复验**：500 输出 `http:500`，非法 JSON 输出 `parse:200`，非法字段输出 `contract:200`。

其他排查：

- “Body is unusable”：同一响应正文被读两次，改为读取一次文本后解码；
- 查询含 `&` 后服务端收到多个参数：使用 `URLSearchParams`；
- 401 被无限重试：身份失效不是瞬时网络抖动，应进入重新认证流程；
- 409 被当成普通失败覆盖本地草稿：应读取最新版本并让用户解决冲突；
- 浏览器 CORS 报错：先核对请求来源和响应头，不能通过关闭浏览器安全策略交付。

## 9. 课后题

1. Fetch 收到 500 时 Promise 通常 fulfilled 还是 rejected？
2. JSON 解析成功是否证明 `priceCents` 有效？
3. CORS 是否可以替代服务端对象授权？
4. 客户端取消请求是否保证服务端写事务回滚？

**答案：**

1. 通常 fulfilled，需要检查 `response.ok`。
2. 不能；还要运行时检查类型、范围和分页关系。
3. 不能；CORS 管理浏览器跨源读取，对直接请求和资源所有权不构成授权。
4. 不保证；取消主要停止客户端等待/传输，服务端可能已处理请求。

## 10. 实践练习

### 基础练习

增加 `q=sold` 返回包含非法负金额的 200 JSON，确认分类为 `contract` 而非 `parse`。

### 进阶练习

为错误层定义 `toViewState(error)`：401 返回 `sign-in`，409 返回 `conflict`，500 返回带 `requestId` 的 `retryable-error`，网络失败返回 `offline`。

### 故障注入练习

让 500 路由返回 HTML 文本。客户端仍应以 `http` 为主分类，保留 500 和响应头请求 ID，并把正文不可解码记录为原因。

**可判定答案标准：**

- 每个状态只属于一个主要错误层；
- 成功数据只从 `parseListingPage` 返回；
- 错误显示不直接注入服务端正文；
- 401 不自动重试，409 不覆盖本地草稿，500 保留请求 ID。

## 11. 阶段验收

- [ ] 脚本覆盖 200、400、401、404、409、500；
- [ ] 正文中断分类为 `body`，非法 JSON 分类为 `parse`，合法 JSON 非法字段分类为 `contract`；
- [ ] 关闭服务后的请求分类为 `network`；
- [ ] 0 分商品通过契约，负数或非安全整数不能通过；
- [ ] 所有接收记录均重建已知字段，没有信任额外属性；
- [ ] 服务在 `finally` 中关闭，Node 进程自行退出；
- [ ] 能分别解释 Cookie、CORS、CSRF、身份认证和对象授权。

## 12. 常见问题

**为什么不直接调用 `response.json()`？**
可以，但本课要同时保留 HTTP 错误与无法解码正文的证据，因此先消费文本更容易统一演示。无论采用哪种方式，正文都只消费一次。

**GET 请求需要 CSRF 吗？**
安全设计要求 GET 不改变服务端状态。若某 GET 有副作用，本身就违反常规语义；写请求仍需根据 Cookie 等认证方式设计 CSRF 防护。

**Node Fetch 会自动保存 Cookie 吗？**
Node 的内置 Fetch 不提供浏览器式 Cookie jar。`credentials` 在浏览器同源策略中的意义不能直接推断为 Node 自动管理会话。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [MDN：Fetch API](https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API)
- [MDN：`Response.ok`](https://developer.mozilla.org/zh-CN/docs/Web/API/Response/ok)
- [MDN：`URLSearchParams`](https://developer.mozilla.org/zh-CN/docs/Web/API/URLSearchParams)
- [Fetch Standard](https://fetch.spec.whatwg.org/)
- [Node.js 24：Global `fetch`](https://nodejs.org/docs/latest-v24.x/api/globals.html#fetch)
- [OWASP：Cross-Site Request Forgery Prevention](https://owasp.org/www-community/attacks/csrf)

## 我现在能做到什么

我能把一次 Fetch 拆成网络、HTTP、正文解析和运行时契约四层，保留状态与请求 ID，针对 401、409、500 做不同决策，并避免把 CORS、Cookie、CSRF 或前端按钮误当成授权。

## 单元导航

- 上一单元：[Promise、`async` 与事件循环](./01-promises-async-event-loop.md)
- 下一单元：[取消、竞态与并发决策](./03-cancellation-races-concurrency.md)
- 章入口：[异步、Fetch 与事件循环](../06-async-fetch-event-loop.md)
