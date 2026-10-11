# HTTP 请求、响应、流与背压：把不可信字节变成稳定契约

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 用 Node 标准库实现邻里集市列表、创建和 NDJSON 流式读取接口 |
| 练习目录 | `$HOME/code/market-backend-lab/node-http` |
| 主要产物 | `src/http-app.mjs`、`src/dev-server.mjs`、`evidence/http.md` |
| 成功证据 | 200/201 路径可观察，金额为整数分，时间为 UTC ISO，NDJSON 每行可独立解析 |
| 失败证据 | 坏 JSON、未知字段、浮点金额、超限正文和未知路由分别被 400/413/404 拒绝 |
| 环境标签 | **单进程内存教学存储、固定身份替身、无数据库、无认证** |

## 1. 任务背景

TCP 把字节送到进程，Node 的 HTTP 解析器把它们组织成方法、路径、头部和正文流。到达应用的请求
仍然不可信：`Content-Type` 可能错误，正文可能分成任意多个 chunk，JSON 可以合法但字段错误，
客户端也可能在发送中途断开。

响应也不只是 `JSON.stringify`。状态码、头部和正文要表达同一语义；头部一旦发送就不能重写；
慢客户端可能来不及消费服务端写出的数据，持续忽略背压会让内存增长。

本课建立协议边界：

```text
IncomingMessage 字节流
  -> 媒体类型与字节上限
  -> JSON.parse 得到 unknown
  -> 运行时字段解析
  -> 领域对象
  -> 状态码 + 头部 + JSON/NDJSON
```

## 2. 学习目标

完成本课后，你能够：

1. 区分方法、路径、查询、头部和正文；
2. 按字节累计请求体，并设置明确上限；
3. 把 `JSON.parse` 的结果保持为 `unknown`，通过解析器后才成为商品输入；
4. 同时按方法和规范路径路由，返回 404/405 的可解释边界；
5. 为成功、输入错误和服务器错误选择稳定状态码；
6. 在响应中设置媒体类型、长度、缓存策略和请求 ID；
7. 使用异步迭代读取请求流；
8. 在 `response.write()` 返回 `false` 时等待 `drain`；
9. 说明单进程内存数组为什么不是持久化或跨副本状态。

## 3. 预备知识

先完成[上一课](01-node-process-event-loop-lifecycle.md)，保留 `src/runtime-config.mjs`。
确认端口未被占用：

```bash
cd "$HOME/code/market-backend-lab/node-http"
node --version
lsof -nP -iTCP:3000 -sTCP:LISTEN || true
```

若已有进程监听 3000，先识别它的所有者，不要直接终止未知进程。可通过 `PORT=3100` 选择读者自有端口。

本课用 `curl` 观察 HTTP。`curl -i` 显示响应头和正文；`-sS` 适合脚本但仍保留错误。
命令返回 0 只证明 curl 完成传输，不自动证明状态为 2xx，验收必须同时查看状态码。

## 4. 核心理论

### 4.1 请求行和 URL 要结构化解析

`req.method` 表达方法，`req.url` 通常含路径和查询。使用 `new URL(req.url, base)` 得到规范字段，
不要用 `includes("listings")` 路由，否则 `/not-listings-backup` 也可能误匹配。

资源不存在返回 404；资源存在但不支持当前方法可返回 405，并带 `Allow`。本课先把未匹配的方法和路径
统一纳入路由表，再对 listings 根路径显式返回 405。

### 4.2 正文是流，不是一次到齐的字符串

`IncomingMessage` 是可读流。一个 JSON 对象可能拆成许多 chunk，一个 chunk 也可能包含整个正文。
应用必须累计完整字节后再解析，不能对每个 `data` chunk 单独 `JSON.parse`。

正文上限按 `Buffer.length` 计算字节，不按 JavaScript 字符数。UTF-8 中文通常占多个字节，
“标题最多 100 个字符”和“整个正文最多 16 KiB”是不同规则。

代理层也要限制正文，应用上限不是吸收无限流量的唯一防线。

### 4.3 JSON 语法成功不等于业务输入合法

`JSON.parse` 可以得到字符串、数组、`null` 或任意对象。类型声明不能改变运行时值。
外部 JSON 的正确路径是：

```text
text -> JSON.parse -> unknown -> isRecord/字段规则 -> CreateListingInput
```

`priceCents: 1990` 表示 19.90 元；`19.9`、`"1990"`、`NaN` 都不是合法 API 金额。
不能用 `parseInt` 或隐式转换替客户端修正坏数据。

### 4.4 状态码和错误契约

本课采用：

| 状态 | 含义 |
| ---: | --- |
| 200 | 读取成功 |
| 201 | 创建成功 |
| 400 | JSON 或字段规则错误 |
| 404 | 路由/资源不存在 |
| 405 | 路径存在但方法不允许 |
| 413 | 请求正文超过应用上限 |
| 415 | 媒体类型不是 JSON |
| 500 | 未预期服务器错误，正文不泄露内部细节 |

错误体固定为 `{code,message,requestId}`。`code` 供客户端稳定判断，`message` 指导恢复，
`requestId` 关联日志。它不表示用户身份，也不能包含堆栈、SQL 或密钥。

### 4.5 响应头只发送一次

`writeHead` 或第一次写正文后，`headersSent` 变为真。若流式响应已经输出一半才发生异常，
不能再改成一份完整 500 JSON；通常只能中止连接并记录服务端证据。

JSON 响应设置：

- `Content-Type: application/json; charset=utf-8`；
- 准确的 `Content-Length`，按 UTF-8 字节计算；
- `X-Request-Id`；
- 教学 API 的 `Cache-Control: no-store`。

### 4.6 背压是生产者服从消费者速度

`res.write(chunk)` 返回 `false` 表示内部缓冲达到阈值，生产者应等待 `drain` 再继续。
对几十条数据看不到问题，不代表忽略背压是正确的；大导出和慢客户端会放大内存风险。

NDJSON 每行是一个完整 JSON 值，以换行分隔，适合逐条消费。它不是普通 JSON 数组，
媒体类型和客户端解析方式要明确。

## 5. 元素、属性、API 或配置清单

| API / 配置 | 本课用法 | 可观察证据 | 边界 |
| --- | --- | --- | --- |
| `http.createServer` | 建立 HTTP/1.1 server | 监听本机端口 | 尚无 TLS/代理 |
| `IncomingMessage` | 方法、URL、头部、正文流 | curl 请求 | 值仍不可信 |
| `ServerResponse` | 状态、头部、正文 | `curl -i` | 头部发送后不可改 |
| `new URL` | 分离 pathname/query | 未知查询不影响路由 | base 仅用于解析 |
| `for await...of req` | 读取全部正文 chunk | 多 chunk 仍可解析 | 必须限制总字节 |
| `Buffer.concat` | 合并受限 chunk | UTF-8 文本 | 大体积需流式协议 |
| `JSON.parse` | 只处理 JSON 语法 | 坏 JSON 报 400 | 返回值仍是 `unknown` |
| `Number.isSafeInteger` | 校验整数分 | 0、1990 通过 | 不接受浮点元 |
| `randomUUID` | 生成教学 ID/requestId | 每次不同 | 不把随机值写死断言 |
| `res.write` | 写 NDJSON 行 | false 表示背压 | 要等待 `drain` |
| `once/off` 事件监听 | 在 drain/close 之间完成一次等待并清理监听器 | 慢客户端下限制生产 | 中断时必须拒绝等待 |
| `res.writableEnded` | 防止结束后再写 | 错误路径可检查 | 不等于连接一定健康 |
| `req.destroyed` | 观察请求连接状态 | 客户端中断 | 不能伪造完整响应 |
| `maxBodyBytes` | 16 KiB 教学上限 | 超限为 413 | 生产值需按业务评估 |

## 6. 最小可运行案例

### 6.1 创建 HTTP 应用

创建完整文件 `src/http-app.mjs`：

```js
import { randomUUID } from "node:crypto";

const MAX_BODY_BYTES = 16 * 1024;
const ALLOWED_CREATE_KEYS = new Set(["title", "description", "priceCents"]);

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * JSON.parse 的结果在进入此函数时仍按 unknown 对待。
 * @param {unknown} value
 */
export function parseCreateListing(value) {
  if (!isRecord(value)) {
    throw new HttpError(400, "VALIDATION", "请求正文必须是对象");
  }

  const unknownKey = Object.keys(value).find((key) => !ALLOWED_CREATE_KEYS.has(key));
  if (unknownKey !== undefined) {
    throw new HttpError(400, "VALIDATION", `不支持字段：${unknownKey}`);
  }

  if (
    typeof value.title !== "string" ||
    value.title.trim().length < 1 ||
    value.title.trim().length > 100
  ) {
    throw new HttpError(400, "VALIDATION", "标题去除首尾空白后长度必须为 1 到 100");
  }
  if (typeof value.description !== "string" || value.description.length > 2000) {
    throw new HttpError(400, "VALIDATION", "描述必须是最多 2000 字符的字符串");
  }
  if (
    !Number.isSafeInteger(value.priceCents) ||
    value.priceCents < 0 ||
    value.priceCents > 100_000_000
  ) {
    throw new HttpError(400, "VALIDATION", "价格必须是 0 到 100000000 的安全整数分");
  }

  return Object.freeze({
    title: value.title.trim(),
    description: value.description,
    priceCents: value.priceCents,
  });
}

async function readJson(req, maxBodyBytes = MAX_BODY_BYTES) {
  const contentType = req.headers["content-type"] ?? "";
  const mediaType = contentType.split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "需要 application/json");
  }

  const chunks = [];
  let receivedBytes = 0;
  for await (const chunk of req) {
    receivedBytes += chunk.length;
    if (receivedBytes > maxBodyBytes) {
      throw new HttpError(413, "BODY_TOO_LARGE", `请求正文不能超过 ${maxBodyBytes} 字节`);
    }
    chunks.push(chunk);
  }

  try {
    /** @type {unknown} */
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return parsed;
  } catch {
    throw new HttpError(400, "INVALID_JSON", "JSON 语法错误");
  }
}

function sendJson(res, status, body, requestId) {
  if (res.writableEnded || res.destroyed) return;
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
    "x-request-id": requestId,
  });
  res.end(payload);
}

function waitForDrainOrClose(res) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      res.off("drain", onDrain);
      res.off("close", onClose);
    };
    const onDrain = () => {
      cleanup();
      resolve();
    };
    const onClose = () => {
      cleanup();
      reject(new Error("response closed before drain"));
    };
    res.once("drain", onDrain);
    res.once("close", onClose);
  });
}

async function sendListingsAsNdjson(res, listings, requestId) {
  res.writeHead(200, {
    "content-type": "application/x-ndjson; charset=utf-8",
    "cache-control": "no-store",
    "x-request-id": requestId,
  });
  for (const listing of listings) {
    if (!res.write(`${JSON.stringify(listing)}\n`)) {
      await waitForDrainOrClose(res);
    }
  }
  res.end();
}

export function createRequestHandler({
  now = () => new Date(),
  isClosing = () => false,
  log = (record) => console.log(JSON.stringify(record)),
} = {}) {
  const listings = [];

  return async function handle(req, res) {
    const requestId = randomUUID();
    const startedAt = performance.now();

    try {
      if (isClosing()) {
        throw new HttpError(503, "SHUTTING_DOWN", "服务正在停止");
      }

      const url = new URL(req.url ?? "/", "http://local.invalid");

      if (req.method === "GET" && url.pathname === "/api/v1/health/live") {
        sendJson(res, 200, { ok: true }, requestId);
        return;
      }

      if (url.pathname === "/api/v1/listings" && req.method === "GET") {
        sendJson(res, 200, {
          items: listings,
          page: 1,
          pageSize: 20,
          total: listings.length,
        }, requestId);
        return;
      }

      if (url.pathname === "/api/v1/listings" && req.method === "POST") {
        const raw = await readJson(req);
        const input = parseCreateListing(raw);
        const listing = Object.freeze({
          id: randomUUID(),
          ...input,
          ownerId: "demo-user",
          status: "available",
          version: 1,
          createdAt: now().toISOString(),
        });
        listings.push(listing);
        sendJson(res, 201, listing, requestId);
        return;
      }

      if (url.pathname === "/api/v1/listings.ndjson" && req.method === "GET") {
        await sendListingsAsNdjson(res, listings, requestId);
        return;
      }

      if (url.pathname === "/api/v1/listings") {
        res.setHeader("allow", "GET, POST");
        throw new HttpError(405, "METHOD_NOT_ALLOWED", "该路径不支持此方法");
      }

      throw new HttpError(404, "NOT_FOUND", "接口不存在");
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const known = error instanceof HttpError;
      sendJson(res, known ? error.status : 500, {
        code: known ? error.code : "INTERNAL",
        message: known ? error.message : "服务器内部错误",
        requestId,
      }, requestId);
    } finally {
      log({
        requestId,
        method: req.method ?? null,
        path: (req.url ?? "/").split("?")[0],
        status: res.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
  };
}
```

### 6.2 临时启动器

创建完整文件 `src/dev-server.mjs`：

```js
import http from "node:http";
import { createRequestHandler } from "./http-app.mjs";
import { runtimeConfig } from "./runtime-config.mjs";

const server = http.createServer(createRequestHandler());

server.listen(runtimeConfig.port, runtimeConfig.host, () => {
  console.log(`listening http://${runtimeConfig.host}:${runtimeConfig.port}`);
});
```

启动：

```bash
node src/dev-server.mjs
```

另一个终端执行：

```bash
curl -i http://127.0.0.1:3000/api/v1/health/live
curl -i http://127.0.0.1:3000/api/v1/listings
```

预期均为 200；列表响应固定含 `items/page/pageSize/total`。此时数组为空是成功结果，不是服务失败。

## 7. 邻里集市集成案例

### 7.1 创建整数分商品

```bash
curl -i -X POST http://127.0.0.1:3000/api/v1/listings \
  -H 'Content-Type: application/json' \
  --data '{"title":"二手自行车","description":"正常使用，可自提","priceCents":19900}'
```

预期状态为 201，响应中：

- `priceCents` 精确为 `19900`；
- `ownerId` 为明确教学替身 `demo-user`；
- `status` 为 `available`；
- `version` 为 1；
- `createdAt` 是以 `Z` 结尾、可被 `toISOString()` 规范化的 UTC 字符串；
- `X-Request-Id` 与错误关联机制已存在，但随机值不能写死。

再次读取列表：

```bash
curl -sS http://127.0.0.1:3000/api/v1/listings
```

预期 `total` 为 1。停止并重启后它会回到 0，这正是**内存教学存储**的边界证据。

### 7.2 观察 NDJSON

```bash
curl -i http://127.0.0.1:3000/api/v1/listings.ndjson
```

响应媒体类型为 `application/x-ndjson`，每个商品占一行。不能对整个响应直接当 JSON 数组解析。
代码即使在一条商品时很少触发背压，也已经保留 `write(false) -> await drain` 的正确控制流。

### 7.3 记录证据

在 `evidence/http.md` 记录：

```markdown
# HTTP 边界证据

- 启动命令与 Node 版本：
- 监听地址：
- 健康/列表/创建的状态码：
- `priceCents` 与 `createdAt` 实际形状：
- NDJSON 的 Content-Type 与行数：
- requestId 响应头/错误体是否一致：
- 重启前后 total：
- 未验证：认证、授权、数据库、TLS、代理、跨进程状态
```

## 8. 常见错误与排查路径

### 8.1 明确错误：对每个 chunk 单独解析 JSON

错误写法：

```js
req.on("data", (chunk) => {
  const body = JSON.parse(chunk.toString("utf8"));
  createListing(body);
});
```

| 项目 | 记录 |
| --- | --- |
| 现象 | 小请求偶尔成功，正文被拆分时出现随机 JSON 语法错误或重复业务调用 |
| 证据 | 记录 chunk 数量与长度，发现一个 JSON 跨多个 chunk |
| 原因 | 网络分块不是应用消息边界 |
| 修复 | 在总字节上限内累计全部 chunk，结束后只解析一次 |
| 复验 | 普通请求、分段慢请求和坏 JSON 分别得到稳定结果 |

### 8.2 坏 JSON、未知字段和金额错误

```bash
curl -i -X POST http://127.0.0.1:3000/api/v1/listings \
  -H 'Content-Type: application/json' --data '{"title":'

curl -i -X POST http://127.0.0.1:3000/api/v1/listings \
  -H 'Content-Type: application/json' \
  --data '{"title":"书架","description":"","priceCents":8000,"ownerId":"other"}'

curl -i -X POST http://127.0.0.1:3000/api/v1/listings \
  -H 'Content-Type: application/json' \
  --data '{"title":"书架","description":"","priceCents":80.5}'
```

预期都为 400，错误码分别能指向语法或校验；列表 `total` 不增加。不能删掉 `ownerId` 再静默接受，
否则客户端字段漂移和越权意图会被掩盖。

### 8.3 超过正文上限

```bash
node -e 'process.stdout.write(JSON.stringify({
  title:"大对象",
  description:"x".repeat(17 * 1024),
  priceCents:100
}))' | curl -i -X POST http://127.0.0.1:3000/api/v1/listings \
  -H 'Content-Type: application/json' --data-binary @-
```

预期为 413；具体连接表现还受客户端是否继续发送和 Node 流状态影响。若响应已经无法完整写出，
应保留服务端日志和客户端原始错误，不能伪造一份成功 JSON。

### 8.4 先写 200 再发现错误

**现象：** 客户端收到 200 或截断正文，服务端又试图发送 500。
**证据：** `res.headersSent === true`，日志出现 headers already sent 或连接重置。
**原因：** 在完成易失败操作前发送成功头。
**修复：** 普通 JSON 先完成解析与业务判断再发送；流式协议明确“部分成功后只能中止”。
**复验：** 坏输入在任何成功字节写出前得到 4xx。

### 8.5 把内存列表写成“已持久化”

**现象：** 重启后列表为空。
**证据：** 启动前 `total=1`，新进程中 `total=0`。
**原因：** 数组属于单个进程堆，没有数据库。
**修复：** 当前文档明确标注替身；第 3–5 章建立模型、访问和事务。
**复验：** 本课只验收“重启会清空”的真实边界，不改成虚假持久化声明。

## 9. 课后题

**问题 1：`Content-Type: application/json` 是否证明正文合法？**
参考答案：不证明。它只是客户端声明；服务端仍需限制字节、解析 JSON，并逐字段验证。

**问题 2：为什么金额不能用 `parseInt("19.9")` 修复？**
参考答案：它会静默变成 19，改变业务金额并把坏输入伪装成合法值；API 要求调用方提交整数分。

**问题 3：`res.write()` 返回 `false` 表示写入失败吗？**
参考答案：不一定。数据已进入缓冲，但生产者应暂停并等待 `drain`，避免继续无界积压。

**问题 4：为什么随机 requestId 不能写死到测试？**
参考答案：测试应断言它非空、格式合理、头体一致和日志可关联，而不是依赖某次随机值。

## 10. 实践练习

### 基础：按 ID 读取商品

增加 `GET /api/v1/listings/:id`。

可判定标准：

- 只接受一个非空路径段；
- 使用业务 `id` 查找，不把数组下标当 ID；
- 找到返回 200，未找到返回 `404 LISTING_NOT_FOUND`；
- 响应仍带 requestId；
- 不改变列表和创建行为。

### 进阶：流式输出 1000 条静态教学数据

在独立实验分支注入 1000 条符合契约的数据，再请求 NDJSON。

可判定标准：

- 每行能独立 `JSON.parse`；
- 行数与商品数一致；
- 代码保留 `write(false)` 后等待 `drain`；
- 中断 curl 后服务端不再继续无意义生成；
- 不把该实验称为数据库导出性能结论。

### 故障注入：删除正文上限

临时移除 `receivedBytes > maxBodyBytes` 分支，发送 1 MiB 描述，再恢复。

可判定标准：

1. 故障版确实读取了明显更大的正文；
2. 说明内存和拒绝时机风险；
3. 恢复后 17 KiB 输入得到 413；
4. 合法请求仍为 201；
5. 五段记录完整，不通过增大上限掩盖测试。

## 11. 阶段验收

保持服务运行，逐项检查：

```bash
curl -i http://127.0.0.1:3000/api/v1/health/live
curl -i http://127.0.0.1:3000/api/v1/listings
curl -i http://127.0.0.1:3000/api/v1/missing
curl -i -X POST http://127.0.0.1:3000/api/v1/listings \
  -H 'Content-Type: application/json' \
  --data '{"title":"台灯","description":"暖光","priceCents":1990}'
curl -i http://127.0.0.1:3000/api/v1/listings.ndjson
```

通过标准：

- 健康和列表为 200，创建为 201，缺失路由为 404；
- 外部 JSON 在解析器入口为 `unknown`，未知字段和小数金额被拒绝；
- 0 分商品合法，空白标题非法；
- 创建时间是 UTC ISO，未在 API 层本地化；
- 日志不含正文、Cookie、Authorization；
- NDJSON 行完整，代码尊重背压；
- 重启清空数据，文档明确标注内存替身；
- 没有宣称 TLS、认证、数据库、并发事务已通过。

## 12. 常见问题

**为什么不直接使用 Express 或 Nest？**
先观察 Node 原生请求/响应和流，后续才能理解框架替你做了什么。第二章会迁移到 Nest。

**能否把 JSON 请求体无限增大来支持图片？**
不能。图片不应塞进无界 JSON；文件上传需要独立流式上限、签名检查、隔离存储和清理策略。

**列表为什么固定 pageSize 20，却可能返回更多内存数据？**
这是本课尚未实现真实分页的已知简化。第 7 章实现有界分页；练习中不要把固定字段误写成已分页。

**为什么错误日志不记录完整请求头？**
请求头可能含 Cookie、Authorization 和代理凭证。日志应使用允许列表并做脱敏。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Node.js HTTP](https://nodejs.org/api/http.html)：请求、响应、server 事件与超时属性。
- [Node.js Streams](https://nodejs.org/api/stream.html)：可读/可写流与背压。
- [Node.js Events](https://nodejs.org/api/events.html)：单次监听、移除监听与连接关闭竞争。
- [MDN HTTP Messages](https://developer.mozilla.org/docs/Web/HTTP/Messages)：请求/响应结构。
- [MDN HTTP Status](https://developer.mozilla.org/docs/Web/HTTP/Status)：状态码语义。
- [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110)：HTTP 语义规范。

## 我现在能做到什么

我能把 HTTP 字节流限制在明确大小内，将解析后的外部 JSON 继续按 `unknown` 校验，再以稳定状态码、
头部和错误契约返回结果；我也能解释流式响应的部分失败和背压，不把内存数组冒充持久化。

## 单元导航

[返回章目录](../README.md#01-node-运行时与-http) ·
[上一课：进程、事件循环与生命周期](01-node-process-event-loop-lifecycle.md) ·
[下一课：超时、错误与优雅停机](03-timeouts-errors-graceful-shutdown.md)
