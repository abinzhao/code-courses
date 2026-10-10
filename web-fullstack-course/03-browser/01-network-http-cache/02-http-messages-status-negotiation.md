# 02 HTTP 消息、状态与协商：让客户端按证据处理响应

## 任务卡

邻里集市列表接口有时返回 JSON，有时返回空响应，有时返回错误。旧页面无论状态都调用 `response.json()`，于是把 204 误报成“JSON 损坏”，也把 404 当成功数据。本课建立一台无依赖 Node 服务，观察方法、状态、头、内容协商、压缩和消息体边界。

| 产出 | 完成标准 | 证据 |
| --- | --- | --- |
| 消息观察服务 | GET、HEAD、204、404、405 均可复现 | Network 与终端 |
| 协商客户端 | 按状态和媒体类型决定解析方式 | 页面日志 |
| 压缩观察 | 能区分表示长度与传输编码 | 响应头 |
| 错误恢复 | 不把 HTTP 错误或空响应伪装成成功 | 诊断记录 |

建议投入 90 分钟。实验仍在个人目录完成，不在教材仓库创建源码。

## 1. 任务背景

HTTP 消息由起始信息、字段和可选内容组成。HTTP/1.1 常以文本形式教学，HTTP/2 和 HTTP/3 使用二进制分帧，但 `GET`、状态码、字段和表示等应用语义仍然成立。

```http
GET /api/v1/listings?page=1 HTTP/1.1
Host: 127.0.0.1:3300
Accept: application/json
Accept-Language: zh-CN
```

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Language: zh-CN
Vary: Accept-Language, Accept-Encoding

{"items":[],"page":1,"pageSize":20,"total":0}
```

浏览器 Fetch 在收到 404、409、503 时通常仍会兑现 Promise；只有 DNS、连接、TLS、CORS 阻止读取、取消等网络层失败才常使 Promise 拒绝。应用必须先解释状态，再解析内容。

## 2. 学习目标

- 说明请求方法、目标、字段、内容和响应状态的职责。
- 区分安全方法、幂等语义与“每次响应完全相同”。
- 按 1xx～5xx 类别解释状态，并为 204、304 等无正常响应体状态选择正确处理。
- 使用 `Accept`、`Accept-Language`、`Content-Type`、`Content-Encoding` 和 `Vary` 解释协商。
- 知道 `Content-Length` 与压缩后的传输内容相关，不能当业务字符数。
- 理解 HTTP/1.1 的 `Content-Length`/分块与 HTTP/2/3 分帧边界，不手工猜消息结束。
- 写出检查 `response.ok`、状态与媒体类型的可靠 Fetch 客户端。
- 用 400、404、405、406、503 和网络失败分别留下恢复证据。

## 3. 预备知识

先完成[上一课](01-url-dns-connections-tls.md)。建立：

```text
practice/browser-02-http/
  server.mjs
  public/
    index.html
    app.js
```

本课使用 Node.js 内置 `http` 和 `zlib`，不安装依赖。运行：

```bash
cd practice/browser-02-http
node server.mjs
```

打开 `http://127.0.0.1:3300/`。DevTools Network 中启用 Method、Status、Type、Size 与 Content-Encoding 列；具体列名会随 Chromium 版本变化。

## 4. 核心理论

### 4.1 方法表达操作语义

| 方法 | 常见语义 | 安全 | 通常幂等 | 关键边界 |
| --- | --- | --- | --- | --- |
| GET | 读取表示 | 是 | 是 | 不应用于修改业务 |
| HEAD | 读取与 GET 类似的头，不返回内容 | 是 | 是 | 元数据应与 GET 对应 |
| POST | 创建或执行命令 | 否 | 否 | 重试可能重复产生效果 |
| PUT | 把资源设置为目标状态 | 否 | 是 | 重复后的目标状态相同 |
| PATCH | 局部修改 | 否 | 不一定 | 由补丁语义决定 |
| DELETE | 删除目标关系 | 否 | 是 | 状态幂等不保证状态码相同 |
| OPTIONS | 查询通信选项 | 是 | 是 | CORS 预检会使用 |

“安全”表示预期不请求状态改变，不代表请求内容保密；“幂等”表示重复同一请求的预期最终效果相同，不代表日志、时间或响应字节不变。

### 4.2 状态驱动恢复

| 状态 | 客户端决策 |
| --- | --- |
| 200 | 按 `Content-Type` 解析表示 |
| 201 | 读取新资源或 `Location` |
| 204 | 成功但无内容，不调用 `json()` |
| 304 | 条件请求使用已有缓存表示，不是普通 Fetch 成功体 |
| 400 | 修正请求输入 |
| 401 | 建立或恢复认证 |
| 403 | 已知身份但无权操作 |
| 404 | 资源不存在，不改成“空列表”掩盖 |
| 405 | 改方法并查看 `Allow` |
| 406 | 客户端要求的表示无法提供 |
| 409 | 刷新版本并处理冲突 |
| 429 | 按策略退避，不盲目并发重试 |
| 500/503 | 服务异常/暂不可用，显示可恢复失败 |

状态码和错误 JSON 都是契约的一部分。不能统一返回 200 再靠 `message` 文本猜成功。

### 4.3 表示与协商

`Accept` 表示客户端可接收的媒体类型；`Content-Type` 描述实际内容。`Accept-Language` 可参与语言选择；服务器若按请求字段改变响应，应通过 `Vary` 告诉缓存哪些字段参与选择。

压缩是内容编码：

```text
JSON 表示
  → UTF-8 字节
  → gzip 内容编码
  → HTTP 消息传输
```

浏览器通常自动发送 `Accept-Encoding`、解压并把解压后的内容交给 Fetch。脚本不能依赖能手工设置这个受控请求头。DevTools 的 transferred/resource size 用于区分线上字节，不要拿 `text.length` 代替。

### 4.4 消息体边界

HTTP/1.1 可用 `Content-Length`、`Transfer-Encoding: chunked` 或连接语义界定内容；HTTP/2/3 由帧结束标识。Node 和浏览器协议栈会处理边界。应用代码不能用“读到换行”判断完整 JSON，也不能同时发送矛盾的长度与传输编码。

## 5. 协议字段、API、事件、状态与安全边界清单

| 名称 | 方向 | 用途 | 边界 |
| --- | --- | --- | --- |
| `Host` / `:authority` | 请求 | 选择目标虚拟主机 | 不可信作用户身份 |
| `Accept` | 请求 | 声明可接受媒体类型 | 服务可返回406 |
| `Accept-Language` | 请求 | 语言偏好 | 不是可靠身份或地理位置 |
| `Content-Type` | 双向 | 描述内容媒体类型 | 要与真实字节匹配 |
| `Content-Length` | 双向 | 声明当前消息内容字节数 | 不是字符数或解压后大小 |
| `Content-Encoding` | 响应 | gzip、br 等内容编码 | 客户端需支持 |
| `Vary` | 响应 | 声明缓存选择维度 | `Vary: *` 限制复用 |
| `Allow` | 响应 | 405 时声明支持方法 | 不是权限名单 |
| `Location` | 响应 | 创建结果或重定向目标 | 客户端仍需校验跳转语境 |
| `response.ok` | Fetch | 状态是否在200～299 | 不校验 JSON 结构 |
| `response.headers` | Fetch | 读取可暴露响应头 | 跨源受 CORS 暴露规则限制 |
| `AbortSignal` | Fetch | 取消请求 | 取消不保证服务端回滚副作用 |

安全边界：请求头来自客户端，服务端必须校验；`Content-Type` 不是内容安全证明；压缩敏感响应需考虑侧信道与跨用户缓存隔离。

## 6. 最小可运行案例

### 6.1 完整文件：`server.mjs`

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { gzipSync } from "node:zlib";

const host = "127.0.0.1";
const port = 3300;
const root = resolve("./public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};
const listings = [
  {
    id: "listing-1",
    title: "自行车",
    priceCents: 28000,
    createdAt: "2026-10-10T08:00:00.000Z",
  },
];

function sendRepresentation(req, res, status, type, value, extra = {}) {
  const raw = Buffer.from(value);
  const acceptsGzip = /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");
  const body = acceptsGzip && raw.length > 100 ? gzipSync(raw) : raw;
  res.writeHead(status, {
    "Content-Type": type,
    "Content-Length": body.length,
    "Content-Encoding": body === raw ? "identity" : "gzip",
    "Cache-Control": "no-store",
    Vary: "Accept-Language, Accept-Encoding",
    ...extra,
  });
  if (req.method === "HEAD") {
    res.end();
  } else {
    res.end(body);
  }
}

function acceptsJson(header = "*/*") {
  const matches = header
    .split(",")
    .map((item) => {
      const [range, ...parameters] = item
        .trim()
        .toLowerCase()
        .split(";")
        .map((part) => part.trim());
      const [type, subtype] = range.split("/");
      if (!type || !subtype) return null;

      let quality = 1;
      for (const parameter of parameters) {
        if (!parameter.startsWith("q=")) continue;
        const parsed = Number(parameter.slice(2));
        quality = Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
          ? parsed
          : 0;
      }

      if (type === "application" && subtype === "json") {
        return { specificity: 2, quality };
      }
      if (type === "application" && subtype === "*") {
        return { specificity: 1, quality };
      }
      if (type === "*" && subtype === "*") {
        return { specificity: 0, quality };
      }
      return null;
    })
    .filter(Boolean);

  if (matches.length === 0) return false;
  const specificity = Math.max(...matches.map((item) => item.specificity));
  return matches
    .filter((item) => item.specificity === specificity)
    .some((item) => item.quality > 0);
}

createServer(async (req, res) => {
  try {
    if (!req.url?.startsWith("/") || req.url.startsWith("//")) {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }
    const url = new URL(req.url, `http://${host}:${port}`);
    if (url.pathname === "/api/v1/listings") {
      if (!["GET", "HEAD"].includes(req.method ?? "")) {
        res.writeHead(405, { Allow: "GET, HEAD" });
        res.end();
        return;
      }
      if (!acceptsJson(req.headers.accept)) {
        res.writeHead(406, { "Cache-Control": "no-store" });
        res.end();
        return;
      }
      const language = (req.headers["accept-language"] ?? "").startsWith("en")
        ? "en"
        : "zh-CN";
      const payload = JSON.stringify({
        items: listings,
        page: 1,
        pageSize: 20,
        total: listings.length,
        notice: language === "en" ? "Local demo data" : "本地演示数据",
      });
      sendRepresentation(
        req,
        res,
        200,
        "application/json; charset=utf-8",
        payload.padEnd(220, " "),
        { "Content-Language": language },
      );
      return;
    }
    if (url.pathname === "/api/v1/ping") {
      res.writeHead(204, { "Cache-Control": "no-store" });
      res.end();
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      sendRepresentation(
        req,
        res,
        404,
        "application/json; charset=utf-8",
        JSON.stringify({
          code: "NOT_FOUND",
          message: "接口不存在",
          requestId: "browser-http-lab",
        }),
      );
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(root + sep) || !types[extname(file)]) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    sendRepresentation(req, res, 200, types[extname(file)], await readFile(file));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("本地服务异常");
  }
}).listen(port, host, () => {
  console.log(`打开 http://${host}:${port}/`);
});
```

### 6.2 完整文件：`public/index.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>HTTP 消息实验 · 邻里集市</title>
</head>
<body>
  <main>
    <h1>HTTP 消息与协商</h1>
    <p>所有数据均为本地内存演示，不是在线商品。</p>
    <button data-path="/api/v1/listings" type="button">请求列表</button>
    <button data-path="/api/v1/ping" type="button">请求204</button>
    <button data-path="/api/v1/missing" type="button">请求404</button>
    <p id="status" role="status">等待操作</p>
    <pre id="output"></pre>
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 6.3 完整文件：`public/app.js`

```js
const status = document.querySelector("#status");
const output = document.querySelector("#output");

async function request(path) {
  status.textContent = "请求中";
  output.textContent = "";
  try {
    const response = await fetch(path, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "zh-CN",
      },
    });
    const type = response.headers.get("content-type") ?? "";
    let data = null;
    if (response.status !== 204 && type.includes("application/json")) {
      data = await response.json();
    }
    const result = {
      ok: response.ok,
      status: response.status,
      type,
      contentLanguage: response.headers.get("content-language"),
      contentEncoding: response.headers.get("content-encoding"),
      data,
    };
    output.textContent = JSON.stringify(result, null, 2);
    status.textContent = response.ok
      ? `完成：${response.status}`
      : `失败：${response.status} ${data?.code ?? "HTTP_ERROR"}`;
  } catch (error) {
    status.textContent = `网络失败：${error.message}`;
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-path]");
  if (button) request(button.dataset.path);
});
```

### 6.4 运行与预期

依次点击三个按钮：

- 列表：200，JSON 中价格为 `28000` 分、时间为 UTC ISO。
- ping：204，`data` 为 `null`，没有 JSON 解析错误。
- missing：404，Promise 仍正常返回 Response，但页面显示失败。

在 Network 右键列表请求选择 Copy as cURL，可观察浏览器实际字段；命令可能带临时浏览器字段，公开记录前删除 Cookie 等敏感信息。

## 7. 邻里集市集成案例

列表响应遵守统一契约：

```json
{
  "items": [
    {
      "id": "listing-1",
      "title": "自行车",
      "priceCents": 28000,
      "createdAt": "2026-10-10T08:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "notice": "本地演示数据"
}
```

集成时继续增加运行时校验：确认 `items` 是数组、`priceCents` 是非负整数、时间可解析且携带时区。类型声明不能验证网络字节。

将请求语言改为 `en`：

```js
const requestHeaders = {
  Accept: "application/json",
  "Accept-Language": "en",
};
```

预期 `Content-Language: en` 且 notice 改变。因为响应受语言和压缩影响，服务返回 `Vary`。真实商品标题是用户数据，不应为了协商语言自动伪造翻译。

协商实验还要覆盖下面四种请求头：

| `Accept` | 预期 |
| --- | --- |
| `application/json` | 200 |
| `application/*` | 200 |
| `application/json;q=0, */*;q=1` | 406；更具体的拒绝不能被通配符覆盖 |
| `text/plain, */*;q=0` | 406 |

本课解析器只为固定的 `application/json` 表示选择媒体范围与 `q` 值，不是可复制到任意生产协商场景的完整 RFC 实现。生产框架应使用经过测试的协商组件。

逐步扩展顺序：先只处理200，再加入204分支，再加入非2xx错误，最后观察语言与压缩。每一步都复验旧路径。

## 8. 常见错误与排查路径

### 明确错误示例

```js
// 错误：404 仍会走到这里；204 会因空内容解析失败。
const data = await fetch(path).then((response) => response.json());
showSuccess(data);
```

修复原则：先取得 Response，判断状态和媒体类型，再决定是否解析、成功展示或恢复。

### 诊断记录

| 字段 | 本次记录 |
| --- | --- |
| 现象 | 点击“请求204”显示 `Unexpected end of JSON input` |
| 证据 | Network状态204、Response无内容；堆栈指向 `response.json()` |
| 原因 | 客户端把“成功且无内容”误当JSON |
| 修复 | 204分支不解析内容，返回 `data: null` |
| 复验 | 204显示完成；200仍解析；404仍显示失败 |

其他常见错误：

| 现象 | 优先证据 | 原因方向 |
| --- | --- | --- |
| 405 | `Allow` 与 Request Method | 方法错误 |
| 406 | `Accept` 与响应状态 | 要求了服务不提供的表示 |
| 中文乱码 | 原始字节与 `charset` | 编码声明不一致 |
| Size 不一致 | transferred/resource size | gzip 与缓存 |
| Fetch rejected | Console 与 Network | 网络、取消或 CORS，不是普通404 |

## 9. 课后题

<details>
<summary>1. DELETE 幂等是否表示两次都必须返回204？</summary>

不是。最终“资源已删除”状态应相同，但第一次可返回204，第二次可返回404。接口契约应明确客户端如何解释。

</details>

<details>
<summary>2. 为什么不能只看 Content-Type 就相信 JSON 安全？</summary>

它只是发送方声明。客户端仍要处理解析失败并校验结构；服务端也不能把客户端声明当作输入已合法。

</details>

<details>
<summary>3. gzip 后 Content-Length 表示什么？</summary>

表示当前消息中编码后内容的字节长度，不是 JavaScript 字符数，也不是解压后 JSON 大小。

</details>

<details>
<summary>4. 503 与连接失败如何区分？</summary>

503 是服务实际返回的 HTTP 状态；连接失败没有 HTTP 响应。两者恢复、日志位置和可观测证据不同。

</details>

## 10. 实践练习

### 基础

增加 `HEAD /api/v1/listings` 按钮，用 `fetch(path, { method: "HEAD" })` 请求。答案标准：状态与相关头可见，内容为空，不调用 `json()`。

### 进阶

给服务加入 `Accept: text/plain` 的406实验，并在页面显示“服务无法提供该表示”。答案标准：错误不是空列表，且恢复时改回 `application/json` 后200。

### 故障注入

把服务的 `Content-Type` 暂改为 `text/plain` 但仍发送 JSON，再把客户端改成无条件解析。记录错误后恢复。答案标准：说明“字节能被 JSON.parse”与“协议声明正确”是两项检查，修复两端契约并复验200/204/404。

## 11. 阶段验收

- [ ] Node、HTML、JS 三个完整文件可直接运行。
- [ ] 200、204、404、405、406 至少各复现一次。
- [ ] 204 不触发 JSON 解析。
- [ ] 非2xx 不显示成功或“暂无商品”。
- [ ] 能解释 `Accept` 与 `Content-Type`、表示与内容编码、长度与字符数。
- [ ] 能解释方法的安全与幂等边界。
- [ ] 诊断记录含修复前后同路径证据。
- [ ] 没有复制、公开 Cookie 或真实请求凭据。

## 12. 常见问题

**为什么服务把 JSON 补空格到220字节？**
只为让小型本地响应更容易触发 gzip 观察；空格是 JSON 后允许的空白。生产不应为压缩阈值填充内容。

**浏览器为何不让我设置 Accept-Encoding？**
它是用户代理控制的受限字段之一。浏览器协商并自动解压，脚本观察结果而不接管传输实现。

**`response.ok` 为真是否表示数据结构正确？**
不表示。它只覆盖200～299状态；JSON解析和业务结构校验仍需执行。

**HTTP/2 是否还看得到 Content-Length？**
可以有该字段，但消息边界由帧控制。不要把 HTTP/1.1 的分块编码规则机械套到 HTTP/2/3。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)：方法、状态、字段与内容。
- [RFC 9112: HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112)：HTTP/1.1 消息与边界。
- [RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113)：HTTP/2 分帧与流。
- [MDN HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)：状态码索引。
- [MDN Content negotiation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Content_negotiation)：主动协商与 `Vary`。
- [MDN Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)：Response 与网络错误。
- [Node.js HTTP](https://nodejs.org/api/http.html) 与 [Zlib](https://nodejs.org/api/zlib.html)：本课服务接口。

兼容与验证缺口：只在 Node 24 与当前 Chromium 语义上设计；代理对字段的改写、HTTP/2/3 服务端、Brotli、Safari/Firefox 和真实弱网尚未运行验证。

## 我现在能做到什么

我能按 HTTP 方法、状态、字段、表示和内容编码解释一次交换；能运行支持协商与 gzip 的本地服务，正确处理200、204和错误响应，并用协议证据而不是异常文本定位问题。

## 单元导航

[上一课：URL、DNS、连接与 TLS](01-url-dns-connections-tls.md) · [下一课：缓存验证、CORS 与观测](03-cache-validation-cors-observation.md) · [章入口](../01-network-http-cache.md)
