# 03 源、Cookie、XSS、CSRF 与对象授权：把五种边界分开验证

## 任务卡

邻里集市采用 HttpOnly Cookie 会话。旧实现认为“前端隐藏编辑按钮 + 配置 CORS”已经安全，却仍存在三类问题：商品标题被当 HTML 插入、跨站表单可能借 Cookie 发写请求、已登录用户可以改别人的商品。本课用本地内存服务分别验证输出编码、CSRF 防护、认证和对象授权。

| 产出 | 完成标准 | 证据 |
| --- | --- | --- |
| 演示会话 | HttpOnly/SameSite 本地 Cookie，明示非生产 | Network/Application |
| 安全渲染 | 恶意形状标题只显示文本 | 页面记录 |
| 修改防护 | Origin + CSRF + 内容类型均校验 | 200/401/403/415 |
| 对象授权 | 本人可改、他人商品403、旧版本409 | 请求记录 |
| 攻击页 | 表单/fetch 均不能改商品 | 服务日志与复查 |

建议投入 120～150 分钟。只使用虚构商品和随机本地会话，不输入真实账号、Cookie 或个人数据。

## 1. 任务背景

五个概念解决不同问题：

| 概念 | 主要问题 | 不负责什么 |
| --- | --- | --- |
| 同源策略/CORS | 哪个浏览器源可读取跨源响应 | 用户身份、对象权限、CSRF副作用 |
| Cookie 属性 | Cookie 何时发送、脚本能否读取 | 业务授权和输出编码 |
| XSS 防护 | 不让不可信数据成为可执行代码 | 跨站请求和对象所有权 |
| CSRF 防护 | 阻止第三方上下文借自动凭据执行写操作 | 已登录用户越权 |
| 对象授权 | 当前身份能否操作这个对象 | 脚本注入与跨站来源 |

这些层必须组合。CORS 阻止恶意脚本读取响应，不保证一个简单请求没有到达服务；SameSite 降低部分跨站 Cookie 发送，不覆盖所有部署和旧环境；前端按钮可见性只是体验，攻击者可直接构造 HTTP 请求。

## 2. 学习目标

- 区分 origin 与 schemeful site，知道端口影响 origin 但通常不决定 site。
- 解释 `HttpOnly`、`Secure`、`SameSite`、`Domain`、`Path`、`Max-Age` 的职责。
- 使用 `textContent` 安全显示普通用户文本，知道富文本需成熟消毒策略。
- 解释存储型、反射型和 DOM 型 XSS 的共同代码执行结果。
- 对 Cookie 写请求校验可信 Origin、会话绑定 CSRF token 和非简单内容类型。
- 知道 CORS、预检和 SameSite 都不能替代 CSRF token/服务端授权。
- 区分401、403和409，并在服务端根据 session 用户检查 `ownerId`。
- 不信任请求体中的 `userId`、`ownerId` 或 `role`。
- 记录本地 HTTP 与生产 HTTPS/Secure Cookie 的差异。

## 3. 预备知识

完成本章前两课以及[网络卷的 CORS 实验](../01-network-http-cache/03-cache-validation-cors-observation.md)。创建：

```text
practice/browser-09-security/
  server.mjs
  public/
    index.html
    app.js
  attacker/
    index.html
```

运行 `node server.mjs`。应用为 `http://127.0.0.1:3300/`，攻击页为 `http://localhost:3400/`。两者至少跨源；`localhost`、IP 和 SameSite 的本地处理不是生产域名替身，因此本课正确性不依赖 Cookie 是否随攻击表单发送。

生产必须使用 HTTPS 和 `Secure` Cookie。本地 HTTP 示例故意不写 `Secure` 才能稳定教学，不能复制为部署配置。

## 4. 核心理论

### 4.1 Origin 与 site

Origin 是 scheme、host、port 三元组。任一不同即跨源。Site 以 scheme 和可注册域边界为核心，端口通常不参与。同站页面仍可能跨源；跨源也不必然跨站。

同源策略限制 DOM、存储和响应读取等能力。CORS 是服务端授权浏览器脚本读取跨源响应的协议，不是服务器对任意客户端的防火墙。

### 4.2 Cookie 会话

生产会话 Cookie 形状：

```http
Set-Cookie: session=<opaque-random-id>; HttpOnly; Secure; SameSite=Lax; Path=/
```

- `HttpOnly`：脚本不能直接读 Cookie；XSS 仍可代表用户发同源请求。
- `Secure`：只通过安全传输发送；生产必须启用。
- `SameSite`：限制部分跨站发送；Lax、Strict、None 的产品影响不同。
- `Domain`：缺省时为 host-only；显式放宽会扩大子域发送面。
- `Path`：发送范围，不是不同应用间的保密隔离。
- `Max-Age/Expires`：客户端保留期；服务端仍应支持撤销。

Cookie 只保存不可预测会话标识；用户、角色、过期和撤销状态由服务端会话记录决定。

### 4.3 XSS

不可信标题：

```text
<img src=x onerror=alert(document.domain)>
```

若赋给 `innerHTML`，浏览器把数据解析成标记；赋给 `textContent`，只显示原文字。自行“删除 `<script>`”不够，危险入口还包括事件属性、URL、SVG、模板和 DOM API。

CSP 是纵深防御，能限制脚本来源与内联执行；它不能替代正确的输出编码、框架安全默认和依赖治理。

### 4.4 CSRF

Cookie 会自动随符合条件的请求发送，攻击页不需要读 Cookie 就可能利用它。写接口至少采用：

1. GET 不产生业务修改。
2. 合理 SameSite/Secure Cookie。
3. 校验 `Origin`（必要时谨慎处理缺失情况）。
4. 使用与会话绑定的不可预测 CSRF token。
5. 对 JSON API 要求明确 `Content-Type`，跨源非简单请求还会触发预检。
6. 所有写操作继续认证与授权。

XSS 发生在可信源内时通常可读页面中的 CSRF token，因此 XSS 防护仍不可省。

### 4.5 对象级授权

认证回答“当前会话是谁”；授权回答“此人能否操作这件商品”。服务端流程：

```text
会话 → currentUser.id
  → 加载 Listing
  → 检查 ownerId / 管理策略
  → 检查 version
  → 校验输入
  → 提交更新和审计
```

请求体提供的 ownerId、role 只是不可信输入，不能覆盖会话身份。列表 ID 可猜到也不应造成越权。

## 5. 协议字段、API、事件、状态与安全边界清单

| 名称 | 作用 | 关键边界 |
| --- | --- | --- |
| `Origin` | 写请求来源信号 | 可缺失于部分场景；按策略拒绝 |
| `Sec-Fetch-Site` | Fetch Metadata 来源关系 | 纵深信号，需兼容策略 |
| `Set-Cookie` | 服务端设置 Cookie | 不可由前端 JS 伪造响应头 |
| `HttpOnly` | 禁止脚本读取 Cookie | 不阻止 XSS 发请求 |
| `Secure` | 只经安全传输发送 | 本地演示差异必须标注 |
| `SameSite` | 限制跨站发送 | 不等于 CSRF 完整方案 |
| `credentials` | Fetch 凭据模式 | 同源默认与跨源策略不同 |
| `textContent` | 按文本插入 | 不适合需要受控富文本的场景 |
| `innerHTML` | 解析 HTML | 不可信数据禁止直接进入 |
| CSP | 限制资源/脚本执行 | 纵深防御，不修复 DOM 注入 |
| CSRF token | 证明请求来自已获 token 的上下文 | 必须与会话绑定并校验 |
| 401/403/409 | 未认证/无权限/冲突 | 不统一返回200 |
| `ownerId` | 服务端对象所有者 | 不能信任客户端提供 |

兼容边界：第三方 Cookie、SameSite 默认值、Fetch Metadata 和本地地址规则会变化。目标浏览器与真实域名必须单独测试。

## 6. 最小可运行案例

### 6.1 完整文件：`server.mjs`

```js
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const appOrigin = "http://127.0.0.1:3300";
const appRoot = resolve("./public");
const attackerRoot = resolve("./attacker");
const sessions = new Map();
const listings = new Map([
  ["listing-1", {
    id: "listing-1",
    title: "二手自行车",
    description: "本地演示商品",
    priceCents: 28000,
    status: "available",
    ownerId: "user-1",
    version: 1,
    createdAt: "2026-10-10T08:00:00.000Z",
  }],
  ["listing-2", {
    id: "listing-2",
    title: "其他用户的咖啡机",
    description: "用于对象授权拒绝实验",
    priceCents: 19900,
    status: "available",
    ownerId: "user-2",
    version: 1,
    createdAt: "2026-10-10T08:05:00.000Z",
  }],
]);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function json(res, status, value, extra = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extra,
  });
  res.end(JSON.stringify(value));
}

function error(res, status, code, message) {
  json(res, status, { code, message, requestId: "browser-security-lab" });
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").flatMap((part) => {
    const index = part.indexOf("=");
    if (index < 0) return [];
    return [[part.slice(0, index).trim(), part.slice(index + 1).trim()]];
  }));
}

async function readJson(req) {
  if (!(req.headers["content-type"] ?? "").startsWith("application/json")) {
    const error = new Error("只接受 application/json");
    error.status = 415;
    throw error;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) {
      const error = new Error("请求体过大");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function getSession(req) {
  const id = parseCookies(req.headers.cookie).session;
  return id ? sessions.get(id) : undefined;
}

function secureHeaders(type) {
  return {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self'",
      "connect-src 'self'",
      "img-src 'self' data:",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
    ].join("; "),
    "X-Content-Type-Options": "nosniff",
  };
}

async function sendStatic(req, res, root, origin, useCsp) {
  const url = new URL(req.url, origin);
  const pathname = decodeURIComponent(url.pathname);
  const file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(root + sep) || !types[extname(file)]) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }
  const headers = useCsp
    ? secureHeaders(types[extname(file)])
    : { "Content-Type": types[extname(file)], "Cache-Control": "no-store" };
  res.writeHead(200, headers);
  res.end(await readFile(file));
}

const appServer = createServer(async (req, res) => {
  try {
    if (!req.url?.startsWith("/") || req.url.startsWith("//")) {
      error(res, 400, "BAD_REQUEST", "无效请求目标");
      return;
    }
    const url = new URL(req.url, appOrigin);
    if (req.method === "OPTIONS") {
      error(res, 403, "CORS_DENIED", "本实验不开放跨源读取");
      return;
    }
    if (url.pathname === "/api/session" && req.method === "POST") {
      if (req.headers.origin !== appOrigin) {
        error(res, 403, "ORIGIN_DENIED", "来源不可信");
        return;
      }
      const sessionId = randomUUID();
      const session = { userId: "user-1", csrfToken: randomUUID() };
      sessions.set(sessionId, session);
      json(res, 200, {
        user: { id: session.userId, role: "member" },
        csrfToken: session.csrfToken,
        localOnly: true,
      }, {
        "Set-Cookie": [
          `session=${sessionId}`,
          "HttpOnly",
          "SameSite=Lax",
          "Path=/",
          "Max-Age=1800",
        ].join("; "),
      });
      return;
    }
    if (url.pathname === "/api/v1/listings" && req.method === "GET") {
      json(res, 200, { items: [...listings.values()] });
      return;
    }
    const match = url.pathname.match(
      /^\/api\/v1\/listings\/([^/]+)\/rename$/,
    );
    if (match && req.method === "POST") {
      if (req.headers.origin !== appOrigin) {
        error(res, 403, "ORIGIN_DENIED", "来源不可信");
        return;
      }
      const session = getSession(req);
      if (!session) {
        error(res, 401, "UNAUTHENTICATED", "请先建立本地演示会话");
        return;
      }
      if (req.headers["x-csrf-token"] !== session.csrfToken) {
        error(res, 403, "CSRF_DENIED", "CSRF 校验失败");
        return;
      }
      const listing = listings.get(match[1]);
      if (!listing) {
        error(res, 404, "NOT_FOUND", "商品不存在");
        return;
      }
      if (listing.ownerId !== session.userId) {
        error(res, 403, "OBJECT_FORBIDDEN", "不能修改其他用户的商品");
        return;
      }
      let body;
      try {
        body = await readJson(req);
      } catch (readError) {
        error(
          res,
          readError.status ?? 400,
          "INVALID_BODY",
          readError.message,
        );
        return;
      }
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title || title.length > 80) {
        error(res, 400, "INVALID_TITLE", "标题长度必须为1到80");
        return;
      }
      if (body.version !== listing.version) {
        error(res, 409, "VERSION_CONFLICT", "商品已更新，请刷新");
        return;
      }
      const updated = {
        ...listing,
        title,
        version: listing.version + 1,
      };
      listings.set(updated.id, updated);
      console.log("listing updated", {
        id: updated.id,
        userId: session.userId,
        version: updated.version,
      });
      json(res, 200, updated);
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      error(res, 404, "NOT_FOUND", "接口不存在");
      return;
    }
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end();
      return;
    }
    await sendStatic(req, res, appRoot, appOrigin, true);
  } catch (serverError) {
    console.error(serverError);
    error(res, 500, "INTERNAL", "本地服务异常");
  }
});

const attackerServer = createServer(async (req, res) => {
  try {
    if (req.method !== "GET" || !req.url?.startsWith("/")) {
      res.writeHead(405, { Allow: "GET" });
      res.end();
      return;
    }
    await sendStatic(
      req,
      res,
      attackerRoot,
      "http://localhost:3400",
      false,
    );
  } catch (serverError) {
    console.error(serverError);
    res.writeHead(500);
    res.end("Attacker demo server error");
  }
});

appServer.listen(3300, "127.0.0.1", () => {
  console.log(`应用：${appOrigin}/`);
});
attackerServer.listen(3400, "localhost", () => {
  console.log("攻击页：http://localhost:3400/");
});

function close() {
  appServer.close();
  attackerServer.close();
}
process.on("SIGINT", close);
process.on("SIGTERM", close);
```

### 6.2 完整文件：`public/index.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>浏览器安全边界 · 邻里集市</title>
</head>
<body>
  <main>
    <h1>本地会话与对象授权</h1>
    <p>本页使用内存会话和虚构商品，不是生产登录。</p>
    <button id="session" type="button">建立演示会话</button>
    <button id="load" type="button">读取商品</button>
    <label>
      新标题
      <input id="title" value="通勤自行车">
    </label>
    <button id="rename-own" type="button">修改自己的商品</button>
    <button id="rename-other" type="button">尝试修改他人商品</button>
    <button id="bad-csrf" type="button">注入错误CSRF</button>
    <button id="render-text" type="button">安全显示攻击形状文本</button>
    <p id="status" role="status">尚未建立会话</p>
    <section aria-labelledby="listing-title">
      <h2 id="listing-title">商品输出</h2>
      <p id="listing-output"></p>
    </section>
    <pre id="evidence"></pre>
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 6.3 完整文件：`public/app.js`

```js
const status = document.querySelector("#status");
const evidence = document.querySelector("#evidence");
const listingOutput = document.querySelector("#listing-output");
const titleInput = document.querySelector("#title");
let csrfToken = "";
let listings = [];

async function parseResponse(response) {
  const data = await response.json();
  evidence.textContent = JSON.stringify({
    status: response.status,
    ok: response.ok,
    data,
  }, null, 2);
  if (!response.ok) {
    throw new Error(`${data.code}: ${data.message}`);
  }
  return data;
}

async function establishSession() {
  const response = await fetch("/api/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const data = await parseResponse(response);
  csrfToken = data.csrfToken;
  status.textContent = "本地演示会话已建立；Cookie 对脚本不可读";
}

async function loadListings() {
  const data = await parseResponse(await fetch("/api/v1/listings"));
  listings = data.items;
  listingOutput.textContent = listings
    .map((item) => `${item.title} / ${(item.priceCents / 100).toFixed(2)}元`)
    .join("；");
  status.textContent = "商品已读取";
}

async function rename(id, token = csrfToken) {
  const listing = listings.find((item) => item.id === id);
  if (!listing) throw new Error("请先读取商品");
  const response = await fetch(`/api/v1/listings/${id}/rename`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify({
      title: titleInput.value,
      version: listing.version,
      ownerId: "attacker-cannot-choose-owner",
      role: "admin",
    }),
  });
  const updated = await parseResponse(response);
  listings = listings.map((item) => item.id === updated.id ? updated : item);
  listingOutput.textContent = updated.title;
  status.textContent = `修改成功，版本 ${updated.version}`;
}

async function run(operation) {
  try {
    await operation();
  } catch (error) {
    status.textContent = `操作被拒绝或失败：${error.message}`;
  }
}

document.querySelector("#session").addEventListener(
  "click",
  () => run(establishSession),
);
document.querySelector("#load").addEventListener(
  "click",
  () => run(loadListings),
);
document.querySelector("#rename-own").addEventListener(
  "click",
  () => run(() => rename("listing-1")),
);
document.querySelector("#rename-other").addEventListener(
  "click",
  () => run(() => rename("listing-2")),
);
document.querySelector("#bad-csrf").addEventListener(
  "click",
  () => run(() => rename("listing-1", "invalid-token")),
);
document.querySelector("#render-text").addEventListener("click", () => {
  const attackShape = "<img src=x onerror=alert(document.domain)>";
  listingOutput.textContent = attackShape;
  status.textContent = "攻击形状只作为文本显示，没有解析为HTML";
});
```

### 6.4 完整文件：`attacker/index.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>跨源拒绝实验</title>
</head>
<body>
  <main>
    <h1>不可信来源实验页</h1>
    <p>提交目标是另一个源；服务必须拒绝，商品不得改变。</p>
    <form
      method="post"
      action="http://127.0.0.1:3300/api/v1/listings/listing-1/rename"
      target="result"
    >
      <input name="title" value="被跨站表单篡改">
      <input name="version" value="1">
      <button type="submit">尝试普通表单提交</button>
    </form>
    <button id="fetch-attack" type="button">尝试带凭据跨源fetch</button>
    <p id="status" role="status">尚未尝试</p>
    <iframe name="result" title="拒绝响应"></iframe>
  </main>
  <script type="module">
    const status = document.querySelector("#status");
    document.querySelector("#fetch-attack").addEventListener("click", async () => {
      try {
        await fetch(
          "http://127.0.0.1:3300/api/v1/listings/listing-1/rename",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": "unknown",
            },
            body: JSON.stringify({ title: "跨源fetch篡改", version: 1 }),
          },
        );
        status.textContent = "意外取得响应，请检查服务策略";
      } catch (error) {
        status.textContent = `浏览器阻止读取/发送：${error.name}`;
      }
    });
  </script>
</body>
</html>
```

### 6.5 运行与预期

应用页按顺序：

1. 建会话：Network 看到 Set-Cookie；`document.cookie` 读不到 session。
2. 读商品：两件虚构商品可见。
3. 修改自己的商品：200，version 加1；请求体伪造的 ownerId/role 被忽略。
4. 修改他人商品：403 `OBJECT_FORBIDDEN`。
5. 错误 CSRF：403 `CSRF_DENIED`。
6. 安全显示攻击文本：页面只显示尖括号文本，无图片或 alert。

攻击页两种请求均不能改商品。普通表单可能因 SameSite 不带 Cookie而401，也可能先因 Origin 被403；其 `application/x-www-form-urlencoded` 还不符合 JSON 契约。跨源 fetch 会预检并被403/CORS阻止。回到应用重新读取，标题必须未被攻击页改变。

## 7. 邻里集市集成案例

完整修改路径：

```text
POST /api/v1/listings/:id/rename
  → Origin / Fetch Metadata 策略
  → Cookie 查会话（401）
  → 会话绑定 CSRF token（403）
  → 加载 Listing（404）
  → ownerId / 管理策略（403）
  → JSON schema 与长度（400/413/415）
  → version（409）
  → 事务更新与审计（200）
```

真实 API 可使用 PATCH，但本课使用显式命令 POST 便于普通表单攻击对照。无论方法名如何，服务端检查不变。

前端隐藏他人商品的编辑按钮是良好体验，但验收必须直接请求 `listing-2`。管理员能力若存在，应由服务端会话角色和审计策略决定，不接受浏览器 body 中的 `role: "admin"`。

本地会话储存在内存，服务重启即失效；生产需可靠会话存储、过期、轮换、撤销、速率限制、HTTPS、日志脱敏和密钥管理。

## 8. 常见错误与排查路径

### 明确错误示例一：XSS

```js
// 错误：商品标题来自用户，不能作为HTML解析。
listingOutput.innerHTML = listing.title;
```

普通文本改用 `textContent`。需要富文本时使用经过维护的消毒库、明确允许列表和 CSP 纵深防御，不能手写正则删标签。

### 明确错误示例二：对象越权

```js
// 错误：登录即可修改，且信任客户端 ownerId。
if (session) listing.ownerId = body.ownerId;
```

服务端必须加载对象并比较 `listing.ownerId === session.userId`，管理员例外也需服务端策略。

### 诊断记录

| 字段 | 本次记录 |
| --- | --- |
| 现象 | 已登录 user-1 直接请求 listing-2 返回403 |
| 证据 | 会话有效、CSRF正确；响应 `OBJECT_FORBIDDEN`；数据未变 |
| 原因 | listing-2.ownerId 为 user-2，对象授权拒绝 |
| 修复 | 这是正确防护；前端补充无权提示，不放宽服务端 |
| 复验 | listing-1仍可改；listing-2仍403；伪造ownerId/role无效 |

安全排查顺序：确认请求源与方法 → 查 Cookie 属性/会话 → 查 CSRF/Origin → 查服务端当前用户 → 查对象 owner/角色 → 查版本和输入 → 查输出进入哪个 DOM sink → 复验数据没有改变。

## 9. 课后题

<details>
<summary>1. HttpOnly 是否让 XSS 完全无害？</summary>

否。它阻止脚本直接读取 Cookie，但恶意同源脚本仍可发请求、读取页面数据并执行用户能执行的操作。

</details>

<details>
<summary>2. CORS 拒绝能否替代 CSRF 防护？</summary>

不能。CORS主要控制脚本读取；简单跨源请求可能已到服务。写接口仍需 SameSite、Origin/token 和授权。

</details>

<details>
<summary>3. 为什么 Path 不是 Cookie 保密边界？</summary>

它主要控制请求发送路径，不隔离同源脚本和应用。敏感隔离应使用独立安全边界与服务端设计。

</details>

<details>
<summary>4. 认证成功为什么仍可能403？</summary>

认证只确定身份。该身份可能没有对象或操作权限，例如 user-1 不能修改 user-2 的商品。

</details>

<details>
<summary>5. CSP 为什么不能替代 textContent？</summary>

CSP 是纵深限制，配置和兼容可能有缺口，也不消除 DOM 被错误构造。数据与代码边界仍应在 sink 处正确处理。

</details>

## 10. 实践练习

### 基础

输入攻击形状标题并成功保存自己的商品，再重新读取。答案标准：服务端保存的是普通文本；页面始终用 `textContent` 显示，无元素被创建。

### 进阶

增加退出接口：撤销服务端 session 并用过期 Set-Cookie 清 Cookie。答案标准：退出后修改返回401；旧 CSRF token 无效；GET公开列表仍按契约工作。

### 故障注入

依次临时移除对象授权、CSRF校验和 `textContent`，每次只注入一项并使用本地虚构数据观察，然后立即恢复。答案标准：记录可利用路径、恢复提交前检查；最终三项防护同时存在。不要在可访问网络或真实数据上运行。

## 11. 阶段验收

- [ ] Node、应用 HTML/JS、攻击页 HTML 均完整可运行。
- [ ] 本地 Cookie 标明未使用 Secure 的原因，生产要求明确。
- [ ] `document.cookie` 无法读取 HttpOnly session。
- [ ] 攻击形状标题只作为文本显示。
- [ ] 无会话401、坏CSRF/他人对象403、旧版本409均可复现。
- [ ] body 伪造 ownerId/role 不改变授权结果。
- [ ] 攻击页两条路径均不能修改商品。
- [ ] 能分别解释 CORS、Cookie、XSS、CSRF 和对象授权。
- [ ] CSP 被描述为纵深防御，不是唯一修复。
- [ ] 真实域名、HTTPS、Secure Cookie、Safari/Firefox、第三方 Cookie 与渗透测试列为未验证。

## 12. 常见问题

**为什么 CSRF token 可以出现在页面 JSON 中？**
它不是长期秘密，而是证明请求来自已获得当前会话页面的随机值。XSS 可读取它，因此还必须防 XSS；第三方站点受同源策略限制读取。

**可否只校验 Referer？**
Referer 可能因策略被裁剪并包含更多隐私。优先按明确策略校验 Origin，结合 Fetch Metadata、token 和部署兼容方案。

**SameSite=Strict 是否总是最好？**
它可能破坏外部链接进入后的登录体验。Lax/Strict/None 要按业务流、嵌入需求和威胁模型选择，不能只追求最严格标签。

**Bearer Token 就没有 CSRF 吗？**
若浏览器不自动附加且攻击页拿不到 token，传统 Cookie CSRF 面会不同；但 token 存储、XSS、泄露、生命周期和 CORS 仍需设计，不能简单宣称更安全。

**本地两个地址为何不能证明生产 SameSite？**
localhost/IP 是特殊开发环境，浏览器策略和生产可注册域不同。本课依赖服务端 Origin/token/授权，因此即使本地 Cookie 行为变化也应安全；生产另做真实域名测试。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [HTML Standard: Origins](https://html.spec.whatwg.org/multipage/browsers.html#origins)：源模型。
- [RFC 6265bis draft](https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis/)：Cookie 与 SameSite 当前规范工作。
- [MDN Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)：Cookie 属性实践。
- [WHATWG Fetch](https://fetch.spec.whatwg.org/)：Origin、CORS、Fetch Metadata 相关处理。
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)：按上下文输出处理。
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)：token、Origin 与 SameSite。
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)：拒绝默认与对象检查。
- [MDN CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)：内容安全策略。

安全规则会随浏览器与标准演进。本课不是生产安全审计；真实系统还需威胁建模、依赖扫描、日志审计、会话轮换、速率限制和独立测试。

## 我现在能做到什么

我能区分源与站、解释 Cookie 属性，并把 XSS、CSRF、CORS、认证和对象授权作为不同边界验证；能运行本地攻击对照，确保不可信标题不执行、跨源请求不改数据、已登录用户也不能越权修改他人商品。

## 单元导航

[上一课：IndexedDB 事务与升级](02-indexeddb-transactions-upgrades.md) · [章入口：存储与安全](../03-storage-security.md) · [下一章：Fetch、流与实时通信](../04-fetch-streams-realtime.md)
