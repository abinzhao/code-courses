# 03 缓存验证、CORS 与观测：读懂 200、304 和“已发送但不可读”

## 任务卡

邻里集市发布公告后，有人总看到旧内容；另一个页面跨端口请求接口时，服务日志显示已收到请求，浏览器却报告 CORS。你的任务是分别建立 HTTP 缓存与跨源读取证据，不能用“清缓存就好了”或“后端没收到”代替诊断。

| 产出 | 完成标准 | 证据 |
| --- | --- | --- |
| 条件缓存服务 | 复现200、304、版本变化后200 | curl 与 Network |
| CORS 对照 | 同一接口允许/拒绝读取均可复现 | Console、Network、服务日志 |
| 缓存策略表 | 能解释入口、哈希静态资源和个人API | 决策记录 |
| 诊断闭环 | 修复后重复同一请求 | 五字段记录 |

建议投入 90～120 分钟。该实验启动两个本机源：页面 `3300`，API `3400`。

## 1. 任务背景

HTTP 缓存保存响应表示及元数据。命中新鲜响应时可以直接复用；需要验证时，客户端带验证器询问服务端。服务端返回304表示“使用你已有的表示”，304本身不携带新的完整表示。

```text
首次 GET
  ← 200 + ETag: "notice-1" + 表示

再次 GET + If-None-Match: "notice-1"
  ← 304 + 元数据（复用已有表示）

版本变化后再次验证
  ← 200 + ETag: "notice-2" + 新表示
```

CORS 是另一层：同源策略限制浏览器脚本读取跨源资源，服务端用响应头明确授权。CORS 不是身份认证、防火墙或 CSRF 防护。一个不触发预检的跨源写请求可能已经到达服务端，随后脚本仍因缺少允许头而无法读取结果。

## 2. 学习目标

- 区分缓存存储、复用、验证和失效，不把 `no-cache` 解释成“不存”。
- 解释 `ETag`/`If-None-Match` 与 `Last-Modified`/`If-Modified-Since` 的验证关系。
- 知道浏览器可能把304与缓存体组合成脚本看到的200 Response，实际状态以 Network 为证。
- 为入口 HTML、内容哈希静态资源、公开列表和个人数据选择不同策略。
- 解释源的三元组，以及简单跨源请求、预检、凭据与允许源的边界。
- 复现 CORS 允许、CORS 阻止读取、预检拒绝和网络失败。
- 知道 `Disable cache` 只在 DevTools 打开时影响相应上下文，不是生产修复。
- 记录缓存键、`Vary`、共享缓存和授权数据泄露风险。

## 3. 预备知识

完成本章前两课。创建：

```text
practice/browser-03-cache-cors/
  server.mjs
  public/
    index.html
    app.js
```

运行 `node server.mjs`。打开 `http://127.0.0.1:3300/`，不要改成 `localhost`。Network 关闭 **Disable cache** 后再做缓存实验，并勾选 Preserve log 便于对照。

若端口冲突，使用系统只读查询确认占用者；不要直接终止不属于本实验的进程。

## 4. 核心理论

### 4.1 缓存指令不是一个“开关”

| 指令 | 语义 | 常见用途 |
| --- | --- | --- |
| `no-store` | 不存储该响应 | 敏感或不应落盘的动态响应 |
| `no-cache` | 可存，但复用前必须验证 | 需要每次确认是否变化的入口 |
| `max-age=60` | 60秒内可视为新鲜 | 可容忍短时旧数据的公开资源 |
| `private` | 不允许共享缓存保存 | 可由浏览器缓存的个人响应 |
| `public` | 明确允许共享缓存 | 真正公共且缓存键正确的内容 |
| `immutable` | 新鲜期内无需主动验证 | 内容哈希且永不原地改写的资源 |
| `must-revalidate` | 过期后必须成功验证再用 | 不允许离线使用陈旧表示的场景 |

`private` 不等于 `no-store`；`no-cache` 不等于“不缓存”。授权响应即使标记 `private`，仍需评估浏览器本地存储风险。

### 4.2 验证器和缓存键

强 ETag 表示字节级等价，弱 ETag（`W/`）只保证语义等价，不能用于所有范围请求。修改时间精度较粗且依赖时钟，ETag 更适合版本明确的表示。

缓存键至少受 URL 影响，还可能受 `Vary` 声明的请求字段影响。若响应随语言、编码或 Origin 变化却遗漏 `Vary`，共享缓存可能复用错误变体。`Vary: Origin` 对动态 CORS 允许源尤其重要。

### 4.3 200 与 304 的观测视角

浏览器内部完成条件验证后，页面脚本通常得到可消费的完整表示；`response.status` 可能表现为200，而 Network 显示网络交换为304。命令行显式发送 `If-None-Match` 可直接看到304。两种工具回答的问题不同。

### 4.4 CORS 的决策

源由 scheme、host、port 组成。`http://127.0.0.1:3300` 与 `http://127.0.0.1:3400` 端口不同，因此跨源。

```text
脚本发起跨源请求
  → 浏览器判断是否需要预检
  → 必要时 OPTIONS 询问方法和字段
  → 服务端按精确 Origin 返回允许策略
  → 浏览器决定脚本能否读取响应
```

带凭据请求不能把 `Access-Control-Allow-Origin: *` 当允许凭据读取；应返回经过允许名单校验的具体 Origin，并设置 `Access-Control-Allow-Credentials: true`。即使 CORS 允许读取，服务端仍必须认证、授权和防 CSRF。

跨源脚本默认只能读取 CORS safelisted 响应字段。示例需要在脚本中读取 `ETag`，因此允许响应还要
显式返回 `Access-Control-Expose-Headers: ETag`；Network 可见不代表脚本一定可读。

## 5. 协议字段、API、事件、状态与安全边界清单

| 名称 | 作用 | 关键边界 |
| --- | --- | --- |
| `Cache-Control` | 缓存存储与复用策略 | 指令需要按资源选择 |
| `ETag` | 表示验证器 | 不能跨不同表示错误复用 |
| `If-None-Match` | 条件请求 | 匹配时可返回304 |
| `Last-Modified` | 修改时间验证器 | 精度和时钟有限 |
| `Age` | 共享缓存中停留秒数 | 未出现不等于没有缓存 |
| `Vary` | 声明响应选择维度 | `Vary: Origin` 防止错配来源 |
| `Access-Control-Allow-Origin` | 允许哪个源读取 | 必须由服务端名单产生 |
| `Access-Control-Allow-Methods` | 预检允许方法 | 不等于业务授权 |
| `Access-Control-Allow-Headers` | 预检允许请求字段 | 不应无条件反射任意字段 |
| `Access-Control-Expose-Headers` | 允许脚本读取额外响应字段 | 只列实际需要的字段 |
| `Access-Control-Allow-Credentials` | 允许凭据模式读取 | 需具体允许源 |
| `Origin` | 浏览器发送的来源 | 服务端校验，不能信任业务身份 |
| `fetch(..., { cache })` | 请求缓存模式 | 不替代服务端缓存设计 |
| `credentials` | Fetch 凭据模式 | 与 Cookie SameSite/CORS 一起决定行为 |

安全边界：共享缓存若忽略授权、Cookie 或 `Vary`，可能跨用户泄露；CORS 配置过宽会扩大恶意站点读取面；配置过窄只会阻止合法前端读取，不能保护直接 API 调用。

## 6. 最小可运行案例

### 6.1 完整文件：`server.mjs`

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const appOrigin = "http://127.0.0.1:3300";
const apiOrigin = "http://127.0.0.1:3400";
const root = resolve("./public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};
let revision = 1;
let simplePostCount = 0;

function send(res, status, headers, body = "") {
  res.writeHead(status, headers);
  res.end(body);
}

const appServer = createServer(async (req, res) => {
  try {
    if (!req.url?.startsWith("/") || req.url.startsWith("//")) {
      send(res, 400, {}, "Bad Request");
      return;
    }
    const url = new URL(req.url, appOrigin);
    if (req.method !== "GET") {
      send(res, 405, { Allow: "GET" });
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(root + sep) || !types[extname(file)]) {
      send(res, 404, {}, "Not Found");
      return;
    }
    send(res, 200, {
      "Content-Type": types[extname(file)],
      "Cache-Control": "no-store",
    }, await readFile(file));
  } catch (error) {
    console.error(error);
    send(res, 500, {}, "App server error");
  }
});

const apiServer = createServer((req, res) => {
  if (!req.url?.startsWith("/") || req.url.startsWith("//")) {
    send(res, 400, {}, "Bad Request");
    return;
  }
  const url = new URL(req.url, apiOrigin);
  const allowCors = url.searchParams.get("cors") === "allow";
  const corsHeaders = allowCors ? {
    "Access-Control-Allow-Origin": appOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Demo-Request",
    "Access-Control-Expose-Headers": "ETag",
    Vary: "Origin",
  } : {};

  if (req.method === "OPTIONS") {
    console.log("OPTIONS", url.pathname, { allowCors });
    send(res, allowCors ? 204 : 403, corsHeaders);
    return;
  }
  if (url.pathname === "/notice" && req.method === "GET") {
    const etag = `"notice-${revision}"`;
    const headers = {
      ...corsHeaders,
      "Cache-Control": "no-cache",
      ETag: etag,
      "Content-Type": "application/json; charset=utf-8",
    };
    if (req.headers["if-none-match"] === etag) {
      console.log("NOTICE 304", etag);
      send(res, 304, headers);
      return;
    }
    console.log("NOTICE 200", etag);
    send(res, 200, headers, JSON.stringify({
      revision,
      message: `邻里公告第 ${revision} 版`,
    }));
    return;
  }
  if (url.pathname === "/bump" && req.method === "POST") {
    simplePostCount += 1;
    revision += 1;
    console.log("BUMP reached server", { revision, simplePostCount, allowCors });
    send(res, 204, corsHeaders);
    return;
  }
  if (url.pathname === "/preflight" && req.method === "PATCH") {
    console.log("PATCH reached server", { allowCors });
    send(res, 200, {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    }, JSON.stringify({ received: true }));
    return;
  }
  send(res, 404, {
    ...corsHeaders,
    "Content-Type": "application/json; charset=utf-8",
  }, JSON.stringify({ code: "NOT_FOUND" }));
});

appServer.listen(3300, "127.0.0.1", () => {
  console.log(`页面：${appOrigin}/`);
});
apiServer.listen(3400, "127.0.0.1", () => {
  console.log(`API：${apiOrigin}/`);
});

function close() {
  appServer.close();
  apiServer.close();
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
  <title>缓存与 CORS 实验 · 邻里集市</title>
</head>
<body>
  <main>
    <h1>缓存验证与跨源读取</h1>
    <button id="notice" type="button">请求公告（允许CORS）</button>
    <button id="deny" type="button">请求公告（拒绝读取）</button>
    <button id="bump" type="button">发送简单POST（拒绝读取）</button>
    <button id="preflight" type="button">发送需预检PATCH</button>
    <p id="status" role="status">等待操作</p>
    <pre id="output"></pre>
    <p>本页只操作本机内存版本，不含账号、真实商品或持久数据。</p>
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 6.3 完整文件：`public/app.js`

```js
const api = "http://127.0.0.1:3400";
const status = document.querySelector("#status");
const output = document.querySelector("#output");

async function run(label, operation) {
  status.textContent = `${label}：请求中`;
  output.textContent = "";
  try {
    const result = await operation();
    output.textContent = JSON.stringify(result, null, 2);
    status.textContent = `${label}：完成`;
  } catch (error) {
    status.textContent = `${label}：浏览器未允许脚本取得结果`;
    output.textContent = String(error);
  }
}

document.querySelector("#notice").addEventListener("click", () => run(
  "允许CORS的公告",
  async () => {
    const response = await fetch(`${api}/notice?cors=allow`);
    return {
      scriptStatus: response.status,
      etagVisible: response.headers.get("etag"),
      data: await response.json(),
    };
  },
));

document.querySelector("#deny").addEventListener("click", () => run(
  "拒绝读取的公告",
  async () => {
    const response = await fetch(`${api}/notice`);
    return response.json();
  },
));

document.querySelector("#bump").addEventListener("click", () => run(
  "简单POST",
  async () => {
    const response = await fetch(`${api}/bump`, { method: "POST" });
    return { status: response.status };
  },
));

document.querySelector("#preflight").addEventListener("click", () => run(
  "预检PATCH",
  async () => {
    const response = await fetch(`${api}/preflight?cors=allow`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Demo-Request": "cache-cors",
      },
      body: JSON.stringify({ action: "observe" }),
    });
    return response.json();
  },
));
```

### 6.4 缓存复现命令

先点两次“请求公告”，Network 第二次应发起验证；脚本可能仍看到200和完整 JSON，而 Network/服务日志出现304。

命令行明确复现：

```bash
curl -i 'http://127.0.0.1:3400/notice?cors=allow'
curl -i -H 'If-None-Match: "notice-1"' \
  'http://127.0.0.1:3400/notice?cors=allow'
curl -i -X POST 'http://127.0.0.1:3400/bump?cors=allow'
curl -i -H 'If-None-Match: "notice-1"' \
  'http://127.0.0.1:3400/notice?cors=allow'
```

预期顺序：200、304、204、200；最后 ETag 和公告版本均为2。若此前点击过 bump，版本不同，以首次响应的实际 ETag 为准，不硬套示例值。

## 7. 邻里集市集成案例

建议策略：

| 资源 | 示例策略 | 理由 |
| --- | --- | --- |
| `index.html` | `no-cache` 或短新鲜期 | 发布后需发现新资源入口 |
| `app.<hash>.js` | `public, max-age=31536000, immutable` | URL 随内容变化 |
| 公开商品列表 | 短 `max-age` 或 ETag，按查询键区分 | 可容忍度由产品决定 |
| 当前用户 `/auth/me` | 常用 `private, no-store` | 身份与隐私敏感 |
| 商品编辑结果 | 不能只清浏览器缓存 | 还要更新服务端/CDN键和客户端状态 |

跨源集成只允许明确的前端源，生产主线优先同源 `/api/v1`。即便同源，也仍有 Cookie 自动发送引出的 CSRF 风险；即便跨源 CORS 已允许，也仍需服务端验证当前用户、`ownerId` 和 `version`。

点击“简单POST（拒绝读取）”：页面显示 CORS 失败，但终端出现 `BUMP reached server`，再请求公告会看到版本已变。这证明“脚本不能读响应”不等于“请求没有副作用”。修改接口必须有 CSRF 和授权，而不能依赖 CORS 报错。

## 8. 常见错误与排查路径

### 明确错误示例

```js
// 错误：CORS 失败后直接重试写请求，可能重复产生副作用。
try {
  await fetch(crossOriginWrite, { method: "POST" });
} catch {
  await fetch(crossOriginWrite, { method: "POST" });
}
```

修复：先确认服务是否收到请求；写操作采用幂等键或目标状态接口，并修复服务端 CORS/CSRF/授权策略，而不是盲重试。

### 诊断记录

| 字段 | 本次记录 |
| --- | --- |
| 现象 | 页面报告 `TypeError: Failed to fetch`，公告版本却增加 |
| 证据 | Network有POST；服务日志 `BUMP reached server`；响应缺少允许源 |
| 原因 | 简单跨源POST已到服务，浏览器只阻止脚本读取响应 |
| 修复 | 生产写操作改同源并加入CSRF/授权；演示用精确Origin返回CORS头 |
| 复验 | 单次POST可读204；版本只增加一次；非法Origin仍不可读 |

缓存排查顺序：

1. 确认请求 URL 和查询是否完全相同。
2. 关闭 DevTools 的 Disable cache，记录 `Cache-Control`、ETag、Age、Vary。
3. 对照 Network 与服务日志，区分内存缓存、验证304和新200。
4. 查看服务/CDN是否原地覆盖了 immutable URL。
5. 修复策略后用新会话和原 URL 复验，不只强制刷新。

CORS 排查顺序：确认两个源 → 看有无 OPTIONS → 看实际 Origin → 看响应允许头 → 看实际请求是否到服务 → 再检查凭据、CSRF 与授权。

## 9. 课后题

<details>
<summary>1. `no-cache` 是否禁止浏览器保存响应？</summary>

否。它允许保存，但复用前必须向源验证。完全不存储使用 `no-store`，仍要考虑中间系统与实际合规要求。

</details>

<details>
<summary>2. 为什么脚本看到200而 Network 可能显示304？</summary>

浏览器把304元数据与已有缓存表示组合成可供脚本消费的完整 Response。Network记录线上交换，脚本面对的是缓存处理后的结果。

</details>

<details>
<summary>3. CORS 失败能否证明服务没执行写操作？</summary>

不能。简单请求可能已发送并产生副作用，随后浏览器因响应不允许当前源而阻止脚本读取。

</details>

<details>
<summary>4. `Access-Control-Allow-Origin: *` 能否与 Cookie 凭据读取组合？</summary>

不能。凭据模式需要经过验证的具体允许源及允许凭据头；服务仍要做认证、授权与CSRF防护。

</details>

## 10. 实践练习

### 基础

复现200/304/204/200并记录每次 ETag、状态和是否有响应体。答案标准：304没有把公告体当新体读取，版本变化后验证器更新。

### 进阶

给公告增加 `Accept-Language` 变体并返回 `Vary: Accept-Language, Origin`。答案标准：中英文有不同 ETag 或明确同一版本策略，缓存不会把一种语言错给另一种请求。

### 故障注入

临时删掉 `Vary: Origin`，模拟一个会缓存响应的代理思维实验；再把允许源改成 `*` 并尝试凭据模式。答案标准：解释潜在错配和浏览器拒绝原因，恢复精确 Origin 与 Vary，不能把放宽策略当修复。

## 11. 阶段验收

- [ ] 两个本机源同时启动，三个文件完整可运行。
- [ ] curl 与浏览器各留下条件验证证据。
- [ ] 能解释 Network 304 与脚本 Response 的不同视角。
- [ ] CORS 允许、拒绝读取和预检至少各复现一次。
- [ ] 能证明简单POST即使不可读也可能到达服务。
- [ ] 为四类邻里集市资源写出不同缓存策略。
- [ ] 缓存策略包含隐私、`Vary`、共享缓存和内容哈希边界。
- [ ] 未把 CORS 当认证、CSRF 或对象授权。

## 12. 常见问题

**强制刷新为什么不是修复？**
它只改变当前客户端的一次加载。错误的源站/CDN头、旧 HTML 引用、缓存键或发布保留策略仍会影响其他用户。

**为什么304不返回完整响应体？**
它告诉客户端复用已有表示，节省传输。客户端没有匹配缓存体时不应凭空构造内容。

**预检成功是否表示 PATCH 有权限？**
不表示。预检只判断浏览器能否发出相应跨源形状；实际请求仍要认证、授权、校验与处理冲突。

**Service Worker 会不会改变这些结果？**
会，它可能拦截请求并使用自己的缓存。本课目录没有注册 Service Worker；若其他实验污染源，应在 Application 中注销并清理该实验源。

## 13. 扩展阅读

资料于 **2026-10-11** 核验：

- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111)：缓存、验证与警告语义。
- [MDN HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)：浏览器实践。
- [MDN Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)：指令索引。
- [WHATWG Fetch: CORS protocol](https://fetch.spec.whatwg.org/#http-cors-protocol)：CORS 算法与字段。
- [MDN CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)：简单请求、预检与凭据。
- [Chrome Network reference](https://developer.chrome.com/docs/devtools/network/reference/)：缓存与请求证据。

本课未实测真实 CDN、代理缓存、Safari/Firefox、第三方 Cookie 策略和生产 TLS；这些都必须按目标环境另行验证。

## 我现在能做到什么

我能通过 ETag 条件请求解释200与304，按资源选择缓存指令，并用两个本机源复现 CORS 允许、拒绝读取与预检；遇到错误时会同时查浏览器和服务端证据，不盲目清缓存或重试写操作。

## 单元导航

[上一课：HTTP 消息、状态与协商](02-http-messages-status-negotiation.md) · [章入口：请求、HTTP 与缓存](../01-network-http-cache.md) · [下一章：渲染与事件循环](../02-rendering-event-loop.md)
