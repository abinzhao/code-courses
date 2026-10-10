# 02 URL、HTTP 与第一张服务页面：看见请求怎样得到响应

## 任务卡

静态首页已经能通过 `file:` 打开，但同伴发来一句“访问 3000 端口就能看见页面”，你还不知道浏览器、地址和服务之间发生了什么。本课要把邻里集市首页放到本机 HTTP 服务上，并分别得到 200、404、连接失败和错误 MIME 类型四种可观察结果。

| 关卡 | 可见成果 | 关键证据 |
| --- | --- | --- |
| 读懂 URL | 能拆出协议、主机、端口、路径、查询和片段 | 地址拆解表 |
| 第一个响应 | 浏览器显示服务返回的 HTML | Network 中的 200 与响应头 |
| 第一张服务页面 | 邻里集市首页由磁盘文件提供 | `index.html` 与 `server.mjs` |
| 第一个协议故障 | 观察 404、连接失败、错误 MIME | 三份不同证据 |

建议用 90～120 分钟。需要 Node.js 24 LTS；本课不安装任何第三方依赖。

## 1. 任务背景

双击 `index.html` 时，浏览器通过 `file:` URL 直接读取本机文件。真实网站通常使用 HTTP 或 HTTPS：浏览器根据 URL 找到服务器，发送请求，服务器返回状态、响应头和响应体，浏览器再决定怎样处理这些字节。

```text
浏览器
  → 解析 URL
  → 连接 127.0.0.1:3000
  → 发送 HTTP 请求
Node.js 服务
  → 匹配方法与路径
  → 读取文件或生成错误
  → 返回 HTTP 响应
浏览器
  → 根据状态与 Content-Type 处理响应
  → 解析 HTML 并显示
```

本课只建立本机静态服务。它没有数据库、身份、预约、支付或生产安全能力，也不接收公网流量。

## 2. 学习目标

完成后，你应能：

- 拆解 URL 的 scheme、host、port、path、query 和 fragment。
- 解释 `file:` 与 `http:` 的资源来源和安全环境差异。
- 说明本机回环地址与端口的作用。
- 区分 HTTP 请求与响应，读出方法、状态、响应头和响应体。
- 解释 200、404、405、500 与“没有 HTTP 响应”的区别。
- 说明 MIME 类型如何影响浏览器处理响应。
- 用 Node.js 内置模块运行一个固定边界的本机 HTTP 服务。
- 在 Network 中证明邻里集市首页确实由服务返回。
- 按证据恢复错误路径、服务停止和错误类型三类故障。

## 3. 预备知识

先完成[文件、路径与编辑器](01-files-paths-editors.md)，保留：

```text
market-learning/
└── market-start/
    └── index.html
```

准备 Node.js 24 LTS，检查命令：

```bash
node --version
```

预期输出以 `v24.` 开头。若命令不存在，先按[版本基线](../02-version-baseline.md)记录实际环境，不要把安装问题伪装成代码错误。

还需会打开浏览器开发者工具的 Network 面板。不会终端导航时，可以先看下一章的[终端与进程教程](../04-terminal-git-debugging/01-terminal-processes-ports.md)，再返回本课。

## 4. 核心理论

### 4.1 URL 是一组结构化字段

观察：

```text
http://127.0.0.1:3000/index.html?view=compact#contact-note
```

| 部分 | 本例 | 作用 |
| --- | --- | --- |
| scheme | `http` | 采用的访问协议 |
| hostname | `127.0.0.1` | 目标主机，本例为本机 IPv4 回环地址 |
| port | `3000` | 目标主机上的接收入口 |
| pathname | `/index.html` | 请求的资源路径 |
| search/query | `?view=compact` | 随请求发送的查询参数 |
| fragment | `#contact-note` | 通常只由浏览器处理，不发给服务器 |

可以在浏览器 Console 中验证：

```js
const url = new URL(
  "http://127.0.0.1:3000/index.html?view=compact#contact-note",
);
({
  protocol: url.protocol,
  hostname: url.hostname,
  port: url.port,
  pathname: url.pathname,
  search: url.search,
  hash: url.hash,
});
```

服务能看到路径和查询，却不会在普通 HTTP 请求目标中收到片段。页内导航变化不必重新向服务器请求页面。

### 4.2 `file:` 与 HTTP 不是两种写法相同的地址

| 维度 | `file:` | `http:` |
| --- | --- | --- |
| 数据来源 | 浏览器直接读取本地文件 | 服务器返回响应 |
| HTTP 状态 | 没有 200/404 响应语义 | 响应包含状态码 |
| 响应头 | 没有常规 HTTP 响应头 | 可设置 Content-Type、缓存等 |
| 服务进程 | 不需要 | 必须有进程监听地址和端口 |
| 安全边界 | 本地文件来源规则 | Web origin 由协议、主机、端口等确定 |
| 适合用途 | 最早期静态观察 | 开发模块、请求和真实网站行为 |

通过 `file:` 找不到文件，不等同于 HTTP 404；服务停止导致连接失败，也不等同于 500。

### 4.3 回环地址与端口

`127.0.0.1` 表示当前电脑的 IPv4 回环地址。绑定它后，服务只用于本机访问。端口把同一主机上的多个服务区分开：

```text
127.0.0.1:3000  → 本课服务
127.0.0.1:5173  → 以后可能是 Vite
127.0.0.1:5432  → 以后可能是 PostgreSQL
```

端口不是进程本身。进程创建监听套接字，占用某个地址和端口；进程退出后，监听会释放。两个进程不能在相同条件下同时监听同一入口，重复启动常得到 `EADDRINUSE`。

`localhost` 通常解析到回环地址，但可能优先得到 IPv6 `::1`。本课明确绑定并访问 `127.0.0.1`，减少地址族差异。

### 4.4 请求和响应是两个方向

简化请求：

```http
GET /index.html?view=compact HTTP/1.1
Host: 127.0.0.1:3000
Accept: text/html
```

简化响应：

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Cache-Control: no-store

<!doctype html>
```

请求由浏览器发给服务，包含方法、目标、头和可选请求体。响应由服务发回浏览器，包含状态、头和可选响应体。`GET` 通常用于读取；本课服务只接受 GET。

### 4.5 状态码先说明协议结果

| 状态 | 本课含义 | 不能推出什么 |
| --- | --- | --- |
| 200 | 服务成功返回目标表示 | 不证明页面业务内容完全正确 |
| 404 | 服务已响应，但没有这个路径 | 不表示服务没有运行 |
| 405 | 路径可能存在，但方法不允许 | 不等同于权限不足 |
| 500 | 服务处理请求时发生内部错误 | 不应向用户泄露堆栈或文件路径 |

连接被拒绝时，浏览器连 HTTP 响应都没拿到，所以没有响应状态码。Network 可能显示 `(failed)`、`ERR_CONNECTION_REFUSED` 或浏览器对应错误。

### 4.6 MIME 类型告诉浏览器怎样解释字节

`Content-Type` 是响应表示的媒体类型：

```text
text/html; charset=utf-8
text/plain; charset=utf-8
application/json
text/css
text/javascript
```

相同 HTML 字符串用 `text/html` 返回时会被解析为页面；用 `text/plain` 返回时通常按普通文本显示。文件扩展名不会自动修正错误响应头，服务器必须发送正确类型。

浏览器对脚本和样式还会执行更严格的 MIME 检查。不要通过关闭安全检查来掩盖服务端类型错误。

### 4.7 浏览器不下载服务源代码

浏览器访问 3000 端口时，只收到服务主动写入响应的内容。`server.mjs` 仍在 Node.js 进程中执行，不会自动发送给浏览器。

```text
server.mjs：决定怎样响应
index.html：本课作为响应体发送
浏览器：解析收到的 index.html
```

这就是前端页面与本机服务职责的第一次分开。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `URL` | 结构化解析地址 | `new URL(request.url, base)` | 基准 URL 不会自动验证业务路径 |
| `URL.pathname` | 读取路径 | `url.pathname === "/"` | 不含查询和片段 |
| `URL.searchParams` | 读取查询参数 | `url.searchParams.get("view")` | 用户输入，不能直接信任 |
| `createServer` | 创建 HTTP 服务 | `createServer(handler)` | 不是生产框架或静态服务器 |
| `IncomingMessage.method` | 请求方法 | `request.method` | 可能需要明确允许列表 |
| `readFile` | 异步读取文件字节 | `readFile(pagePath)` | 读取失败应返回受控错误 |
| `writeHead` | 写状态和响应头 | `writeHead(200, headers)` | 响应开始后不能随意改头 |
| `end` | 结束响应 | `response.end(body)` | 漏掉后客户端可能等待 |
| `listen` | 监听地址和端口 | `listen(3000, "127.0.0.1")` | 端口占用会失败 |
| `Content-Type` | 声明响应媒体类型 | `text/html; charset=utf-8` | 与实际内容必须一致 |
| `Cache-Control` | 表达缓存策略 | `no-store` | 只影响对应响应 |
| `Allow` | 说明允许的方法 | `Allow: GET` | 通常配合 405 |

## 6. 最小可运行案例

先用一个只返回内存字符串的服务观察 HTTP，不涉及文件读取。

### 6.1 文件位置与完整代码

在个人目录创建：

```text
market-learning/
└── http-minimum/
    └── hello-server.mjs
```

`hello-server.mjs`：

```js
import { createServer } from "node:http";

const host = "127.0.0.1";
const port = 3100;

const server = createServer((request, response) => {
  if (request.method !== "GET") {
    response.writeHead(405, {
      "Content-Type": "text/plain; charset=utf-8",
      Allow: "GET",
    });
    response.end("Method not allowed");
    return;
  }

  const url = new URL(request.url, `http://${host}:${port}`);

  if (url.pathname === "/") {
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(
      "<!doctype html><html lang=\"zh-CN\"><meta charset=\"utf-8\">" +
        "<title>第一个 HTTP 响应</title><h1>服务已经响应</h1>" +
        "<p>请求路径是 /</p></html>",
    );
    return;
  }

  if (url.pathname === "/wrong-type") {
    response.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end("<h1>这段内容按普通文本返回</h1>");
    return;
  }

  response.writeHead(404, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end("Not found");
});

server.listen(port, host, () => {
  console.log(`打开 http://${host}:${port}/`);
});
```

### 6.2 运行与停止

终端进入 `http-minimum`：

```bash
node hello-server.mjs
```

预期终端打印：

```text
打开 http://127.0.0.1:3100/
```

依次访问：

```text
http://127.0.0.1:3100/
http://127.0.0.1:3100/missing
http://127.0.0.1:3100/wrong-type
```

完成后回到运行服务的终端，按 `Ctrl+C`。这会向前台进程发送中断信号，不是复制快捷键。

### 6.3 预期结果

- `/`：状态 200，浏览器显示一级标题。
- `/missing`：状态 404，正文显示 `Not found`。
- `/wrong-type`：状态仍是 200，但页面显示 `<h1>` 字符而不是标题，因为类型是 `text/plain`。
- 停止服务再刷新：连接失败，没有 404 或 500 响应。

### 6.4 失败观察点

服务启动失败看终端；请求结果看 Network；页面解释方式看响应 `Content-Type`；访问目标看地址栏。不要只根据页面颜色或浏览器错误文案判断根因。

## 7. 邻里集市集成案例

现在让服务读取上一课的完整首页。

### 7.1 文件结构

```text
market-learning/
└── market-start/
    ├── index.html
    └── server.mjs
```

`index.html` 使用下面的完整版本：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta
    name="description"
    content="邻里集市九成新自行车静态商品说明。"
  >
  <title>九成新自行车 · 邻里集市</title>
</head>
<body>
  <header>
    <h1>邻里集市</h1>
    <p>让闲置物品遇见下一位主人。</p>
  </header>
  <main>
    <article>
      <h2>九成新自行车</h2>
      <p>价格：<data value="28000">280 元</data></p>
      <p>
        发布时间：
        <time datetime="2026-10-11T02:00:00Z">
          2026年10月11日 10:00（北京时间）
        </time>
      </p>
      <p>适合周末骑行，见面验车后再决定是否交接。</p>
      <a href="#contact-note">查看联系说明</a>
    </article>
    <section id="contact-note" aria-labelledby="contact-title">
      <h2 id="contact-title">联系说明</h2>
      <p>当前是静态教学页，尚未接入账号、联系或预约功能。</p>
    </section>
  </main>
  <footer>
    <small>演示数据不会创建真实交易。</small>
  </footer>
</body>
</html>
```

`server.mjs` 使用下面的完整版本：

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const host = "127.0.0.1";
const port = 3000;
const pagePath = new URL("./index.html", import.meta.url);

const server = createServer(async (request, response) => {
  let url;

  try {
    if (!request.url.startsWith("/") || request.url.startsWith("//")) {
      throw new Error("Invalid request target");
    }
    url = new URL(request.url, `http://${host}:${port}`);
  } catch {
    response.writeHead(400, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end("Bad request");
    return;
  }

  if (request.method !== "GET") {
    response.writeHead(405, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      Allow: "GET",
    });
    response.end("Method not allowed");
    return;
  }

  if (url.pathname !== "/" && url.pathname !== "/index.html") {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end("页面不存在");
    return;
  }

  try {
    const html = await readFile(pagePath);
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(html);
  } catch (error) {
    console.error("读取网页失败", error.message);
    response.writeHead(500, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end("Server error");
  }
});

server.listen(port, host, () => {
  console.log(`打开 http://${host}:${port}/`);
});
```

### 7.2 运行、观察与边界

终端进入 `market-start`：

```bash
node server.mjs
```

打开 `http://127.0.0.1:3000/`。Network 中选择文档请求，核对：

| 字段 | 预期 |
| --- | --- |
| Request URL | `http://127.0.0.1:3000/` |
| Request Method | `GET` |
| Status Code | `200` |
| Content-Type | `text/html; charset=utf-8` |
| Response | 完整邻里集市 HTML |

再访问：

```text
http://127.0.0.1:3000/missing
```

应得到 404 和“页面不存在”。`?view=compact` 会进入查询字段，但当前服务和页面没有实现紧凑视图；`#contact-note` 由浏览器用于页内跳转，不会让服务增加新路由。

此服务固定提供一个文件，不接受任意磁盘路径，因此不会把请求路径直接拼到文件系统。它适合本机教学，不具备生产静态服务的缓存、安全、压缩和日志能力。

## 8. 常见错误与排查路径

### 8.1 一次完整诊断

| 阶段 | 内容 |
| --- | --- |
| 现象 | `/missing` 看不到商品页 |
| 证据 | Network 收到 404，响应体为“页面不存在” |
| 原因 | 服务只允许 `/` 与 `/index.html` |
| 修复 | 回到正确首页地址，不修改 HTML 和端口 |
| 复验 | 首页为 200；`/missing` 仍稳定返回 404 |

这里保留 404 是正确行为，不应把所有路径都改成 200 来“消除错误”。

### 8.2 四类失败不能混在一起

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 连接失败 | Network 没有响应状态 | 服务未运行或地址端口错误 | 启动服务，核对地址 | 首页得到 200 |
| 404 | 有响应状态和正文 | 路径不受支持 | 访问正确路径 | 首页 200，错误路径仍 404 |
| 页面显示源码 | 200 但类型是 `text/plain` | MIME 错误 | 返回 `text/html` | 浏览器解析标题 |
| 500 | 服务终端记录读取失败 | `index.html` 缺失或不可读 | 恢复正确文件与路径 | 首页 200，终端无读取错误 |
| `EADDRINUSE` | 启动终端报端口已用 | 已有进程监听 3000 | 停止自己启动的旧服务 | 重新启动成功 |

### 8.3 明确错误示例

不要这样把任意 URL 路径直接变成磁盘路径：

```js
// 错误示例：没有路径边界，可能读取非预期文件。
const filePath = `.${request.url}`;
const body = await readFile(filePath);
```

请求目标包含查询、编码字符和路径段，直接拼接会产生正确性与安全风险。本课正确版本只允许两个固定路径，并读取固定的 `index.html`。

## 9. 课后题

<details>
<summary>1. 访问 /missing 得到 404，能否说明服务没有运行？</summary>

不能。能收到 404 正好证明服务已经响应，只是没有对应资源。服务未运行通常导致连接失败，不会得到 HTTP 响应状态。

</details>

<details>
<summary>2. URL 中哪一部分通常不会发送给服务器？</summary>

fragment，也就是 `#contact-note`。它通常由浏览器处理页内定位。路径和查询参数会参与请求。

</details>

<details>
<summary>3. 为什么 200 仍可能显示错误结果？</summary>

状态只表达请求在协议层被成功处理。响应体可能是错误业务内容，`Content-Type` 也可能错误。本课 `/wrong-type` 就返回 200，但浏览器按纯文本处理 HTML 字符。

</details>

<details>
<summary>4. 浏览器会自动拿到 server.mjs 吗？</summary>

不会。Node.js 在服务端执行 `server.mjs`，只有服务写入 HTTP 响应的字节会发送给浏览器。本例发送的是 `index.html` 或错误文本。

</details>

<details>
<summary>5. /index.html?view=compact#contact-note 的 pathname 是什么？</summary>

`/index.html`。查询是 `?view=compact`，片段是 `#contact-note`。当前代码没有根据查询改变页面。

</details>

## 10. 实践练习

### 10.1 基础：增加健康检查

在个人 `server.mjs` 中增加固定路径 `/health`，返回状态 200、类型 `application/json; charset=utf-8` 和正文：

```json
{"status":"ok"}
```

运行 `node server.mjs`，在 Network 核对状态和类型。失败时看终端语法错误、路径分支和响应头。完成标准是 `/health` 返回合法 JSON，首页行为不变。

参考答案要点：在 404 分支之前处理 `/health`，使用 `JSON.stringify({ status: "ok" })`，每个分支都调用 `return` 防止继续写响应。

### 10.2 进阶：记录查询但不改变业务

访问 `/?view=compact`，在服务端受控地记录 `url.searchParams.get("view")`。不要把未经处理的完整请求或敏感信息写入日志。

预期终端记录 `compact`，页面仍是原布局。完成标准是能解释“收到查询”与“实现紧凑视图”是两回事。

参考答案要点：查询值来自用户输入，只用于本地观察；当前没有 CSS，不能声称视图已经变化。

### 10.3 故障注入：区分三种失败

依次制造：

1. 访问 `/missing`；
2. 停止服务后刷新 `/`；
3. 把首页响应类型临时改成 `text/plain`。

记录在 `market-learning/learning-log.md`。每次都写现象、Network 证据、终端证据、原因、修复与复验。

预期分别是 404、连接失败、200 但按文本显示。完成后必须恢复 `text/html` 并得到 200 页面。三种失败都写成“缓存问题”不通过。

## 11. 阶段验收

- [ ] 能拆解本课 URL 的六个组成部分。
- [ ] 能解释 `file:` 与 HTTP 的至少三个差异。
- [ ] Node.js 版本满足课程条件或已记录实际差异。
- [ ] `server.mjs` 与 `index.html` 位于个人练习目录。
- [ ] 首页请求得到 200 和正确 HTML MIME。
- [ ] 错误路径得到 404，而不是伪装为成功。
- [ ] 停止服务后能识别“没有 HTTP 响应”。
- [ ] 能用 `/wrong-type` 解释状态与 MIME 是两个维度。
- [ ] 能说明浏览器与 Node.js 各自执行什么。
- [ ] 能停止自己启动的服务，不终止不认识的进程。

提交证据：文件树、Node.js 版本、启动命令、200/404/连接失败记录、一个响应头记录和一份五阶段故障复盘。

## 12. 常见问题

**为什么不用 `python -m http.server`？**

现成静态服务器可以快速预览，但本课要观察请求分支、状态和 MIME 怎样由代码产生。后续可用专业开发服务器，不应把教学服务当生产方案。

**终端没有回到提示符，是不是死机？**

通常不是。服务在前台等待请求。完成后在同一终端按 `Ctrl+C`。

**为什么绑定 127.0.0.1，而不是 0.0.0.0？**

回环地址把实验限制在本机。`0.0.0.0` 表示监听所有 IPv4 网络接口，会扩大可访问范围，不是本课所需。

**可以给每个错误都返回 200 吗？**

不应。状态码帮助浏览器、脚本和运维区分结果。不存在的资源应是 404，方法不允许应是 405。

**`no-store` 能解决所有旧页面问题吗？**

不能。它表达该响应不应被存储，但改错文件、未保存、服务未重启和 Service Worker 等问题需要各自证据。本课还没有 Service Worker。

## 13. 扩展阅读

以下官方资料于 **2026-10-11** 核验：

- [WHATWG URL Standard](https://url.spec.whatwg.org/)：查 URL 解析和各组件的规范模型。
- [MDN：What is a URL?](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL)：用初学视角复习 URL 字段。
- [MDN：Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview)：带着请求、响应和连接边界阅读。
- [MDN：HTTP response status codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status)：核对 200、404、405 和 500。
- [MDN：Media types](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/MIME_types)：查 `Content-Type` 与浏览器处理方式。
- [Node.js HTTP](https://nodejs.org/api/http.html)：查 `createServer`、请求和响应对象。
- [Node.js File system promises](https://nodejs.org/api/fs.html#promises-api)：查 `readFile` 的异步行为。

## 我现在能做到什么

我能把一个本地文件变成可观察的 HTTP 资源，读懂 URL、请求、状态、响应头和响应体，并用 200、404、连接失败和错误 MIME 证明不同故障属于不同层。邻里集市 V0 首页现在有了可复现的本机服务入口，但仍诚实地保持为静态教学页面。

## 单元导航

[上一课：文件、路径与编辑器](01-files-paths-editors.md) · [下一课：DevTools 与第一份请求证据](03-devtools-first-request-evidence.md) · [章节入口](../03-computer-first-page.md)
