# 01 URL、DNS、连接与 TLS：先确认请求究竟去了哪里

## 任务卡

邻里集市的商品列表在一台电脑上能打开，在另一台电脑上却显示“无法访问”。本课不靠反复刷新碰运气，而是沿着 `URL → 名称解析 → 传输连接 → TLS → HTTP` 建立证据链。

| 产出 | 完成标准 | 保留证据 |
| --- | --- | --- |
| URL 分解器 | 能区分协议、主机、端口、路径、查询和片段 | 页面输出 |
| 本地连接实验 | Node 服务与浏览器页面均可运行 | 终端日志、Network Timing |
| 故障诊断 | 能区分 URL、DNS、端口和 TLS 问题 | 五字段诊断记录 |
| 项目边界 | 不把 HTTPS、登录或授权能力虚构出来 | 页面边界说明 |

建议投入 75～100 分钟。个人实验目录为 `practice/browser-01-url/`；教材仓库只保存教程，不保存实验工程。

## 1. 任务背景

一个 URL 不是“服务器文件名”，而是浏览器处理资源的输入。浏览器可能先应用 HSTS、代理、缓存、Service Worker 和连接池，再决定是否解析名称、建立连接。第二次请求也可能复用已有连接，因此下面只是因果模型，不是每次都完整重放的固定流水线：

```text
解析 URL
  → 确定源与目标端口
  → 查询可用地址（可能命中多层缓存）
  → 建立 TCP，或为 HTTP/3 建立 QUIC
  → HTTPS 执行 TLS 身份校验与密钥协商
  → 在可复用连接上交换 HTTP 消息
```

DNS 只把名称映射到地址，不证明该地址上的服务是邻里集市；TLS 证明客户端连接到证书所覆盖身份并保护传输，也不证明当前用户有权编辑某件商品。授权仍由服务端业务规则决定。

## 2. 学习目标

完成后你应能：

- 使用 `URL` 和 `URLSearchParams` 正确读取 URL，知道片段通常不随 HTTP 请求发送。
- 解释源由协议、主机和端口组成，并区分“同站”与“同源”。
- 说明 DNS 缓存、多个地址、连接复用和协议协商为何使瀑布图不总是逐项出现。
- 区分 TCP、QUIC、TLS 与 HTTP 的职责，不把 HTTP/2 简化成“更快的 TCP”。
- 用 Node 内置模块建立本地服务，并用浏览器 Network 与 Performance API 留证。
- 根据错误信息区分名称解析失败、连接拒绝、证书失败与 HTTP 状态错误。
- 明确本地 HTTP 实验没有验证生产 HTTPS、证书轮换、代理和移动网络。

## 3. 预备知识

- 已按本卷 [browser-lab 契约](../README.md#多文件实验怎样启动)理解“个人目录、无依赖、本机服务”的边界。
- 本机有 Node.js 24 LTS 和现代 Chromium。
- 能打开 DevTools 的 Network、Console 和 Security 面板。
- 端口 `3300` 仅用于个人实验；若被占用，先查占用者，再同时修改服务与页面地址。

实验结构：

```text
practice/browser-01-url/
  server.mjs
  public/
    index.html
    app.js
```

运行 `node server.mjs`，访问 `http://127.0.0.1:3300/`，用 `Ctrl+C` 停止。不要用管理员权限运行，也不要把服务绑定到公网地址。

## 4. 核心理论

### 4.1 URL 是结构化数据

以 `https://market.example.invalid:443/listings/bike?q=blue#details` 为例：

| 部分 | 值 | 是否通常进入 HTTP 请求目标 |
| --- | --- | --- |
| scheme | `https` | 决定处理协议，不作为 path 发送 |
| hostname | `market.example.invalid` | 用于解析、连接与 `Host`/`:authority` |
| port | `443` | 决定目标端口；默认端口可省略 |
| pathname | `/listings/bike` | 是 |
| search | `?q=blue` | 是 |
| hash | `#details` | 否，通常只供客户端定位 |

必须使用 URL API 编码用户输入。字符串拼接 `"?q=" + input` 会把 `&`、`#` 等字符误解释成结构。

### 4.2 DNS 给出地址，不给出业务真相

解析器可能读取浏览器缓存、操作系统缓存、hosts、企业解析器或公共递归解析器。一次名称可返回多个 IPv4/IPv6 地址，客户端会按网络状态尝试。DevTools 没显示 DNS 时间，不代表 DNS 从未发生，可能是缓存或既有连接已满足请求。

`localhost` 和 `127.0.0.1` 也不能随意互换：

- 它们是不同主机文本，因此 Cookie、源和证书判断可能不同。
- `localhost` 可能解析到 IPv6 `::1`；服务若只监听 `127.0.0.1`，对应连接可能失败。
- 本课统一使用 `127.0.0.1`，避免把名称解析差异混入其他变量。

### 4.3 连接与协议

HTTP/1.1 和 HTTP/2 通常运行在 TCP 上；HTTP/3 运行在 QUIC 上，而 QUIC 基于 UDP。HTTPS 还会协商 TLS。HTTP/2 多路复用减少同一连接上的应用层排队，但无法消除服务器慢、资源过大或主线程阻塞。

连接是否复用由浏览器、协议、目标、凭据和连接状态共同决定。Network 的 Connection ID、Timing 或协议列比“第二次一定不连接”的推测更可靠。

### 4.4 TLS 的边界

TLS 主要提供：

1. 服务身份校验：证书链、主机名、有效期和信任根参与判断。
2. 传输机密性：中间节点不能直接读取明文。
3. 传输完整性：篡改会被检测。

TLS 不负责用户登录、对象授权、内容无恶意、服务端数据库安全。证书有效也不等于站点值得信任。本课不生成自签名证书，因为“点击忽略证书错误”会训练错误习惯；真实 HTTPS 应由受信任证书和明确域名验证。

## 5. 协议字段、API、事件、状态与安全边界清单

| 名称 | 类型 | 用途 | 边界 |
| --- | --- | --- | --- |
| `URL` | Web/Node API | 解析绝对或带基准的相对 URL | 不自动判断资源可信 |
| `URLSearchParams` | Web/Node API | 编码与读取查询参数 | 同名参数可能有多个 |
| `location.origin` | 浏览器状态 | 当前文档源 | `file:` 的源行为不适合本课 |
| `performance.getEntriesByType("resource")` | Web API | 读取资源时序 | 精度、跨源字段受策略限制 |
| `PerformanceResourceTiming.nextHopProtocol` | 字段 | 观察协商后的协议 | 值由实现与连接决定 |
| `node:dns/promises.lookup` | Node API | 走系统名称解析 | 不是完整 DNS 抓包 |
| `server.listen(host)` | Node API | 绑定监听地址 | `127.0.0.1` 只接受本机 IPv4 回环 |
| `Host` / `:authority` | HTTP 字段 | 标识目标主机与端口 | 不能当用户身份 |
| SNI / ALPN | TLS 扩展 | 选择证书/虚拟主机与应用协议 | 由 TLS 栈协商，不是授权 |
| `SecureContext` | 浏览器概念 | 限制敏感 Web API | 本机回环有特殊待遇，不等于已部署 HTTPS |

兼容边界：各浏览器 DevTools 列名和连接复用策略不同；HTTP/3、ECH、DNS over HTTPS 受浏览器、网络与服务端共同影响。不能用一次 Chromium 本机观察外推所有用户。

## 6. 最小可运行案例

### 6.1 完整文件：`server.mjs`

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { lookup } from "node:dns/promises";

const host = "127.0.0.1";
const port = 3300;
const root = resolve("./public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};
const connectionIds = new WeakMap();
let nextConnectionId = 1;

function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    if (!req.url?.startsWith("/") || req.url.startsWith("//")) {
      send(res, 400, "text/plain; charset=utf-8", "无效请求目标");
      return;
    }
    const url = new URL(req.url, `http://${host}:${port}`);
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end();
      return;
    }
    if (url.pathname === "/api/connection") {
      const address = await lookup(host);
      const reusedConnection = connectionIds.has(req.socket);
      if (!reusedConnection) {
        connectionIds.set(req.socket, nextConnectionId);
        nextConnectionId += 1;
      }
      send(res, 200, "application/json; charset=utf-8", JSON.stringify({
        requestTarget: `${url.pathname}${url.search}`,
        hostHeader: req.headers.host,
        localAddress: req.socket.localAddress,
        localPort: req.socket.localPort,
        remoteAddress: req.socket.remoteAddress,
        remotePort: req.socket.remotePort,
        connectionId: connectionIds.get(req.socket),
        reusedConnection,
        resolvedAddress: address.address,
        protocol: `HTTP/${req.httpVersion}`,
        encrypted: Boolean(req.socket.encrypted),
      }));
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(root + sep) || !types[extname(file)]) {
      send(res, 404, "text/plain; charset=utf-8", "资源不存在");
      return;
    }
    send(res, 200, types[extname(file)], await readFile(file));
  } catch (error) {
    console.error(error);
    send(res, 500, "text/plain; charset=utf-8", "本地实验失败");
  }
}).listen(port, host, () => {
  console.log(`打开 http://${host}:${port}/`);
});
```

`connectionId` 由服务按 socket 对象分配；同一 ID 再次出现时，`reusedConnection` 为 true。它能
证明本服务进程观察到连接复用，但不能替代 DevTools 中的协议、代理和 Timing 证据。

### 6.2 完整文件：`public/index.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>URL 与连接实验 · 邻里集市</title>
</head>
<body>
  <main>
    <h1>URL 与连接实验</h1>
    <form id="url-form">
      <label for="target">待解析 URL</label>
      <input
        id="target"
        value="http://127.0.0.1:3300/api/connection?q=自行车#details"
      >
      <button type="submit">解析并请求</button>
    </form>
    <p id="status" role="status">尚未请求</p>
    <pre id="output"></pre>
    <p>
      本页是本机 HTTP 教学实验，不提供 HTTPS、登录、授权或持久化能力。
    </p>
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 6.3 完整文件：`public/app.js`

```js
const form = document.querySelector("#url-form");
const input = document.querySelector("#target");
const status = document.querySelector("#status");
const output = document.querySelector("#output");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "请求中";
  output.textContent = "";
  try {
    const url = new URL(input.value, location.href);
    if (url.origin !== location.origin) {
      throw new Error("本实验只允许请求当前源");
    }
    const response = await fetch(`${url.pathname}${url.search}`);
    const connection = await response.json();
    const navigation = performance.getEntriesByType("navigation")[0];
    output.textContent = JSON.stringify({
      parsed: {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || "(默认端口)",
        pathname: url.pathname,
        query: Object.fromEntries(url.searchParams),
        hashNotSent: url.hash,
        origin: url.origin,
      },
      response: {
        status: response.status,
        connection,
      },
      navigation: {
        nextHopProtocol: navigation?.nextHopProtocol || "未暴露",
        domainLookupMs: navigation
          ? navigation.domainLookupEnd - navigation.domainLookupStart
          : null,
        connectMs: navigation
          ? navigation.connectEnd - navigation.connectStart
          : null,
      },
    }, null, 2);
    status.textContent = "请求完成";
  } catch (error) {
    status.textContent = `请求失败：${error.message}`;
  }
});
```

### 6.4 运行与预期

```bash
cd practice/browser-01-url
node server.mjs
```

预期页面把 `#details` 列为 `hashNotSent`，服务端 `requestTarget` 中没有片段；`encrypted` 为 `false`，明确证明这是 HTTP。刷新两次，在 Network 勾选 Protocol、Remote address、Connection ID 并比较。计时为 `0` 可能表示缓存或复用，也可能受计时精度影响，不可直接写成“没有 DNS/连接”。

## 7. 邻里集市集成案例

把输入改为：

```text
/api/connection?page=1&pageSize=20&q=咖啡机#listing-2
```

页面会用当前文档作为基准补成绝对 URL，并由 `URLSearchParams` 保留中文编码语义。服务端只收到 `/api/connection?page=1&pageSize=20&q=...`；`#listing-2` 留给列表渲染后定位商品。

集成约束：

- 价格和商品数据尚未由本课接口返回，不虚构已加载的列表。
- 生产 API 使用同源 `/api/v1`，但同源不能替代登录、CSRF 或对象授权。
- 生产 HTTPS 必须用真实域名与受信任证书验收；本地 `127.0.0.1` HTTP 结果不能成为证据。
- 前端跳转使用 `new URL(relative, location.href)`；服务端仍独立校验 path、query 与权限。

逐步扩展：先只输出 URL 字段，再请求 `/api/connection`，最后加入 Performance 数据。每一步刷新并保留输出，避免同时加入三层后无法定位错误。

## 8. 常见错误与排查路径

### 明确错误示例

```js
// 错误：用户输入中的 &、#、? 会改变 URL 结构。
const target = "/api/connection?q=" + userInput;
```

修复：

```js
const target = new URL("/api/connection", location.href);
target.searchParams.set("q", userInput);
```

### 诊断记录

| 字段 | 本次记录 |
| --- | --- |
| 现象 | `http://127.0.0.1:3301/` 显示连接被拒绝 |
| 证据 | 服务日志只监听3300；Network无HTTP状态；终端服务仍运行 |
| 原因 | URL端口错误，连接没有到达HTTP层 |
| 修复 | 地址改回3300，不改业务代码 |
| 复验 | 首页200；`/api/connection` 200；服务日志出现请求 |

固定顺序：

1. 用 `new URL(location.href)` 核对协议、主机、端口。
2. 判断是浏览器错误页、网络错误，还是已有 HTTP 状态。
3. 检查服务进程和监听地址，不先修改 DNS。
4. 名称失败时再查解析结果；证书失败时查看 Security 面板。
5. 收到 4xx/5xx 后转入 HTTP 层诊断，不再称为“连不上”。
6. 修复一个变量并重复同一请求。

不要通过关闭证书校验、忽略浏览器警告或把服务绑定 `0.0.0.0` 来制造“成功”。

## 9. 课后题

<details>
<summary>1. URL 片段为什么不能直接作为后端筛选条件？</summary>

片段通常不会进入 HTTP 请求目标，服务器看不到它。需要后端参与的筛选应使用经过编码的 path、query 或 body。

</details>

<details>
<summary>2. DNS 成功是否说明 HTTP 一定成功？</summary>

不是。DNS 只提供候选地址；之后还可能连接拒绝、超时、TLS 身份失败、协议失败或服务返回错误状态。

</details>

<details>
<summary>3. HTTPS 是否证明当前用户能编辑商品？</summary>

不是。HTTPS保护连接并验证服务身份；用户认证和 `Listing.ownerId` 对象授权必须由服务端另行执行。

</details>

<details>
<summary>4. Timing 中 DNS 为 0 能否证明浏览器没做名称解析？</summary>

不能。可能命中缓存、复用连接、精度被限制，或该字段未暴露。应结合连接、地址、协议和多次请求证据。

</details>

## 10. 实践练习

### 基础

新增一个输入 `q=台灯 & 书`，必须通过 `searchParams.set()` 编码。答案标准：服务端解析出的查询值保持原文字义，且 `&` 没有生成第二个参数。

### 进阶

连续请求接口三次，在 Network 记录 Protocol、Remote address、Connection ID 和 Timing。答案标准：只描述实际观测；若连接 ID 未提供，明确写“工具未暴露”，不推测结果。

### 故障注入

不要修改本页输入框的同源请求。分别在新标签地址栏访问未监听的
`http://127.0.0.1:3301/`、不存在的 `.invalid` 名称，以及一个故意拼错主机名的 HTTPS 地址。
每次记录浏览器错误页和 Network 后关闭该标签，再回到本课首页复验。答案标准：分别归类为
连接、名称解析、TLS/名称或其他实际浏览器错误；不得忽略证书警告继续。

## 11. 阶段验收

- [ ] 三个完整文件按路径保存，`node server.mjs` 可启动。
- [ ] 页面能展示 URL 六部分与当前源。
- [ ] 服务收到的请求目标不包含片段。
- [ ] Network 记录至少含状态、协议、远端地址和 Timing 中可见字段。
- [ ] 能解释 `localhost` 与 `127.0.0.1` 不可随意混用的原因。
- [ ] 能区分 DNS、连接、TLS、HTTP 和业务授权。
- [ ] 诊断记录包含现象、证据、原因、修复、复验。
- [ ] 明确记录本课没有验证真实 HTTPS 和多浏览器网络栈。

## 12. 常见问题

**为什么不在教材里提供自签名证书？**
自签名证书需要额外信任配置，跳过警告会破坏正确安全习惯。本课只讲边界，生产 HTTPS 在部署章节用真实证书验收。

**为什么页面限制同源请求？**
让实验只观察 URL 与连接，不把任意外部请求、CORS 和隐私泄露混入结果。跨源在本章第三课单独验证。

**为什么 Node 输出的 HTTP 版本可能是 1.1？**
该内置服务使用普通 HTTP/1.1。HTTP/2/3 需要相应服务与协商环境；不能改一个标签就声称已验证。

**Performance 时间为什么每次不同？**
调度、缓存、连接复用和系统负载都会变化。性能证据应保留环境、重复次数和分布，不用单次数字做因果结论。

## 13. 扩展阅读

以下资料于 **2026-10-11** 核验：

- [WHATWG URL Standard](https://url.spec.whatwg.org/)：URL 解析与序列化算法。
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)：HTTP 语义和连接无关边界。
- [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446)：TLS 1.3 协议。
- [RFC 9000: QUIC](https://www.rfc-editor.org/rfc/rfc9000)：QUIC 传输。
- [MDN URL API](https://developer.mozilla.org/en-US/docs/Web/API/URL)：浏览器 URL 接口。
- [Chrome DevTools Network](https://developer.chrome.com/docs/devtools/network/)：协议、连接与 Timing 证据。
- [Node.js DNS](https://nodejs.org/api/dns.html)：`lookup` 与 DNS API 的差异。

技术快照只覆盖当前教材基线。Firefox、Safari、企业代理、VPN、DoH、IPv6 与移动网络尚未实测，应在目标环境单独验收。

## 我现在能做到什么

我能把 URL 当结构化输入，沿 DNS、连接、TLS 和 HTTP 分层收集证据；能运行本地 Node/HTML/JS 实验，识别片段未发送、连接失败和工具观测边界，也不会把 HTTPS 与业务授权混为一谈。

## 单元导航

[章目录：请求、HTTP 与缓存](../README.md#01-请求http-与缓存) · [下一课：HTTP 消息、状态与协商](02-http-messages-status-negotiation.md) · [浏览器卷](../README.md)
