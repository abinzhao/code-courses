# 39-Node HTTP 服务与 Web 框架入门

## 目标

本单元从“运行脚本”跨到“提供服务”。一个 Web 后端的本质是：监听端口、解析 HTTP 请求报文、执行逻辑、组织 HTTP 响应报文。Node.js 的 `http` 模块把这套能力完整暴露出来——先用原生模块手写一遍，才能真正理解 Express 替你做了什么；再引入分层架构，为第 40 单元的 Express 与 RESTful API 打好骨架。

完成本知识单元后，学员应能够：

1. 使用 `node:http` 创建服务器，理解一次请求对应一次回调，`req`/`res` 本质都是流。
2. 从请求中读取方法、路径、请求头、查询参数，并通过收集请求体流解析 JSON 与表单数据。
3. 设置状态码、响应头与响应体，正确返回 JSON、文本与错误响应。
4. 手写路由雏形：方法与路径匹配、简单路径参数提取、404 与 405 的区分。
5. 解释为什么真实项目需要 Web 框架，说出 Express、Fastify、Nest 的定位差异，并明确本课程主线为 Express。
6. 按 route/service/repository 分层组织后端代码，说明各层职责与依赖方向，并落地标准目录结构。

## 技术栈

| 工具或环境 | 版本线 | 用途 | 学习要求 |
|---|---|---|---|
| Node.js | 当前 LTS | HTTP 服务运行时 | 掌握 http、url 内置模块 |
| TypeScript | 5.x 稳定版 | 类型化请求处理与分层代码 | 给请求体、响应体与处理器声明类型 |
| Express | 当前稳定版 | 主线 Web 框架 | 本单元建立认知，第 40 单元深入 |
| tsx | 当前稳定版 | 开发期运行 TS 服务 | 配合 watch 自动重启 |
| pnpm | 当前稳定版 | 包管理与脚本 | 安装 Express 与类型声明 |
| @types/express | 随 Express 生态发布 | Express 类型声明 | 理解其仅作用于编译期 |

约定：

- 先用零依赖的原生 http 实现全部原理，再安装 Express 做对照重写。
- 服务地址使用 `127.0.0.1` 与课程端口（如 3000），不写真实线上域名。
- 请求体一律设大小上限，不接收无界 body；示例数据全部为教学虚构数据。
- 版本号不写死小版本，以包管理器当前解析的稳定版为准。

## 详细的理论知识讲解和示例伪代码

### 1. http 模块与服务器模型

#### 1.1 定义

`node:http` 实现了 HTTP 协议。创建服务器只需提供一个请求监听器：每收到一个 HTTP 请求，Node 就调用一次该函数，传入请求对象和响应对象。

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: true }));
});

server.listen(3000, '127.0.0.1', () => {
  console.log('服务运行在 http://127.0.0.1:3000');
});
```

这个模型的关键事实：

```text
1. createServer 的回调是“每个请求执行一次”，不是“整个进程执行一次”
2. 回调并发执行靠事件循环：等待 I/O 时让出，下一个请求的回调可以插入
3. req 是 IncomingMessage（Readable 流）：请求体逐块到达
4. res 是 ServerResponse（Writable 流）：响应体逐块写出
5. 每个请求必须且只能结束一次：res.end() 之后不能再写
6. server.listen 把进程绑定到端口；端口被占用会报 EADDRINUSE
```

最小服务的进程视角：

```text
node server.js
  → 加载模块、创建 server 对象
  → listen 向操作系统注册 127.0.0.1:3000
  → 事件循环进入 poll 等待连接
  → 请求到达：执行回调，处理，end 响应
  → 回到 poll，继续等待（进程不退出，因为仍在监听端口）
```

#### 1.2 与 Web/后端的关系

所有 Web 框架在 Node 上最终都构建于 http 模块。理解这一层，你就能解释：为什么响应必须 end、为什么重复 end 会报错、为什么框架里请求体也“默认不解析”（因为它本质是流，需要有人去消费）。

用 TypeScript 给处理器明确签名：

```ts
import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';

function handler(req: IncomingMessage, res: ServerResponse): void {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('hello');
}

const server = http.createServer(handler);
server.listen(3000);
```

#### 1.3 常见误区

> createServer 回调只在启动时执行一次。

它在每个请求到来时执行；启动时执行的是 listen 的回调。

> 不写 res.end() 也没关系，浏览器会自己判断结束。

不 end，请求会一直挂起直到超时；keep-alive 连接下尤其严重。每个分支（成功、各种错误）都必须有对应的 end。

> 服务器只能处理一个请求，因为单线程。

事件循环让单进程并发处理大量请求；只有当某段代码阻塞主线程时才会排队。

### 2. 请求对象 IncomingMessage

#### 2.1 定义

`req` 携带请求报文的全部信息：

| 属性/方法 | 内容 | 示例 |
|---|---|---|
| `req.method` | HTTP 方法（大写） | `GET`、`POST` |
| `req.url` | 路径 + 查询串（不含协议与主机） | `/api/users?page=2` |
| `req.headers` | 请求头对象（键已转小写） | `{ 'content-type': 'application/json' }` |
| `req.httpVersion` | HTTP 版本 | `1.1`、`2.0` |
| `req`（流事件） | 请求体数据 | `data`、`end`、`error` |

读取请求行信息：

```js
import http from 'node:http';

http.createServer((req, res) => {
  console.log('方法：', req.method);
  console.log('原始 URL：', req.url);
  console.log('内容类型：', req.headers['content-type']);
  res.end();
}).listen(3000);
```

#### 2.2 请求体是流，不是现成字段

HTTP 请求体不会自动出现在 `req.body` 上——原生 http 没有这个属性。数据以字节块形式到达，必须监听 data/end 收集（这正是第 38 单元流知识的直接应用）：

```text
为什么不自动拼接？
  1. body 可能巨大（上传文件），自动拼接等于无上限吃内存
  2. 有的请求根本不需要 body（GET）
  3. 框架选择在显式中间件中、按大小限制和内容类型来解析
```

收集 JSON body 的最小实现：

```js
function readJsonBody(req, limitBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(Object.assign(new Error('请求体过大'), { statusCode: 413 }));
        req.destroy(); // 停止继续接收
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('JSON 格式不合法'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}
```

TypeScript 给出结构化负载：

```ts
interface CreateUserBody {
  name: string;
  email: string;
}

function isCreateUserBody(value: unknown): value is CreateUserBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as CreateUserBody).name === 'string' &&
    typeof (value as CreateUserBody).email === 'string'
  );
}
```

#### 2.3 与 Web/后端的关系

请求体来自不可信客户端：字段可能缺失、类型可能错误、大小可能超限、内容类型可能撒谎。后端必须把“解析”和“校验”当作两道独立的关：解析失败返回 400/413，解析成功后还要做业务校验。前端校验只改善体验，不能替代后端校验。

#### 2.4 常见误区

> `req.body` 是原生 http 的标准属性。

它是 Express 等框架在中间件里挂上去的；原生代码必须自己收集流。

> content-type 是 application/json，body 就一定是合法 JSON。

头可以任意伪造；解析必须 try/catch。

> body 很小，不必限制大小。

限制是安全基线：不限制就允许客户端用超大 body 耗尽内存。默认 1 MB 以内的 JSON 接口是常见做法。

### 3. 响应对象 ServerResponse

#### 3.1 定义

`res` 用来组织响应报文：状态行、响应头、响应体。

| 属性/方法 | 作用 |
|---|---|
| `res.statusCode = n` | 设置状态码（默认 200） |
| `res.statusMessage` | 自定义原因短语（通常不写） |
| `res.setHeader(name, value)` | 设置单个响应头 |
| `res.getHeader(name)` | 读取已设置的头 |
| `res.writeHead(code, headers)` | 一次性写状态行和头（头已发出后不能再改） |
| `res.write(chunk)` | 写入响应体（可多次） |
| `res.end(data?)` | 结束响应，可附带最后一段数据 |

返回 JSON 的标准写法：

```js
function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

// 使用
sendJson(res, 200, { id: 1, name: '小明' });
sendJson(res, 404, { message: '资源不存在' });
```

显式给出 Content-Length 能让对端明确响应边界；不写时 Node/HTTP 使用分块传输。中文内容应在 Content-Type 上标注 `charset=utf-8`。

上面 `sendJson(res, 200, { id: 1, name: '小明' })` 真正写到网络上的字节是一个完整的响应报文：

```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Content-Length: 27

{"id":1,"name":"小明"}
```

状态行、头部、空行、消息体四部分缺一不可；状态码与头部都必须在消息体开始发送之前确定。

#### 3.2 响应也是流：大响应分块发送

大文件下载不应该一次性读入再 end，而应把文件流接入 res（第 38 单元的 pipeline）：

```js
import { createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

http.createServer(async (req, res) => {
  if (req.url === '/download') {
    res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8' });
    try {
      await pipeline(createReadStream('./large.csv'), res);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: '传输失败' }));
      }
      console.error(err);
    }
    return;
  }
  res.writeHead(404);
  res.end();
}).listen(3000);
```

TypeScript 下把“无内容响应”也收敛成带类型的工具函数，避免各处手写状态行：

```ts
import type { ServerResponse } from 'node:http';

function sendNoContent(res: ServerResponse): void {
  res.writeHead(204);
  res.end();
}
```

`res.headersSent` 是重要判断：一旦头已发出（甚至已经写了部分体），就不能再改状态码，否则抛错。错误处理必须分“头未发出”和“头已发出”两种情形。

#### 3.3 与 Web/后端的关系

状态码和响应头是前后端契约的一部分：201 表示创建成功，400 表示客户端错误，401/403 表示认证/授权问题，500 表示服务端错误。正确使用状态码，前端才能按语义处理。Content-Type 决定浏览器如何解读响应体。

#### 3.4 常见误区

> 所有错误都返回 200，再在 body 里放 `{ success: false }`。

这破坏了 HTTP 语义，监控、网关和缓存都会误判。客户端错误用 4xx，服务端错误用 5xx。

> 写完 res.end 后发现出错，再补一个 500。

响应一旦结束不能撤回。错误要在 end 之前处理。

> 不设 Content-Type 也无所谓。

浏览器可能按内容嗅探错误解读（把文本当脚本/HTML），带来安全与显示问题。应显式设置。

### 4. 手写路由雏形

#### 4.1 定义：路由要回答两个问题

路由（routing）是把请求分发到处理逻辑的机制，匹配两件事：

```text
1. 方法是否匹配（GET/POST/PUT/DELETE）
2. 路径是否匹配，包括静态路径和带参数路径（/users/:id）
匹配失败要区分：
  路径不存在 → 404 Not Found
  路径存在但方法不对 → 405 Method Not Allowed（可附 Allow 头）
```

最简单的静态映射：

```js
const routes = new Map();

routes.set('GET /api/health', (req, res) => {
  sendJson(res, 200, { status: 'ok' });
});
routes.set('GET /api/users', (req, res) => {
  sendJson(res, 200, [{ id: 1, name: '小明' }]);
});

http.createServer((req, res) => {
  const pathOnly = req.url.split('?')[0];
  const key = `${req.method} ${pathOnly}`;
  const handler = routes.get(key);
  if (handler) {
    handler(req, res);
  } else {
    sendJson(res, 404, { message: 'Not Found' });
  }
}).listen(3000);
```

#### 4.2 路径参数匹配

手写一个支持 `:param` 的迷你路由器，理解 Express 路由的底层思路：

```js
function compilePath(pattern) {
  const names = [];
  const regexText = pattern.replace(/:([^/]+)/g, (_, name) => {
    names.push(name);
    return '([^/]+)';
  });
  return { regex: new RegExp(`^${regexText}$`), names };
}

class MiniRouter {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler) {
    const { regex, names } = compilePath(pattern);
    this.routes.push({ method, regex, names, handler });
  }

  handle(req, res) {
    const pathname = new URL(req.url, 'http://localhost').pathname;

    for (const route of this.routes) {
      const match = route.regex.exec(pathname);
      if (!match) continue;

      if (route.method !== req.method) {
        res.setHeader('Allow', route.method);
        sendJson(res, 405, { message: 'Method Not Allowed' });
        return;
      }

      const params = {};
      route.names.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      req.params = params;
      route.handler(req, res);
      return;
    }

    sendJson(res, 404, { message: 'Not Found' });
  }
}

const router = new MiniRouter();
router.add('GET', '/api/users/:id', (req, res) => {
  sendJson(res, 200, { id: req.params.id });
});
```

TypeScript 中可以把参数收敛成明确类型：

```ts
interface RequestWithParams extends IncomingMessage {
  params?: Record<string, string>;
}

type Handler = (req: RequestWithParams, res: ServerResponse) => void | Promise<void>;
```

#### 4.3 与 Web/后端的关系

这一层是每个框架的核心组件。理解了“正则 + 参数名 + 方法判断”，就不觉得 Express 的 `app.get('/users/:id')` 是魔法；也能解释路径参数永远是字符串（需要自己转数字并校验）。

异步处理器中抛出的错误不会被 try/catch 自动包住（事件回调在未来执行），框架通过包装 Promise 来统一捕获；原生写法需要自行 catch 并返回 500。

#### 4.4 常见误区

> 路径参数 `:id` 拿到的是数字。

它是 URL 的一部分，永远是字符串；`Number(id)` 后还要校验 NaN 和范围。

> 匹配不到统一返回 404。

方法不对应返回 405，帮助调用方理解“地址没错、动词用错”。

> 在路由处理器里写同步阻塞逻辑没关系。

处理器运行在主线程，阻塞会拖慢所有请求。

### 5. 查询参数与表单解析

#### 5.1 定义

- 查询串是 URL 中 `?` 之后的部分，用于 GET 类请求的参数传递（过滤、分页、排序）。
- 表单 body 常见 `application/x-www-form-urlencoded`（键值编码）与 `multipart/form-data`（含文件）。

使用 WHATWG URL 解析查询参数：

```js
const url = new URL(req.url, 'http://localhost');
const page = Number(url.searchParams.get('page') ?? '1');
const size = Number(url.searchParams.get('size') ?? '20');
const active = url.searchParams.get('active') === 'true';

console.log({ page, size, active });
```

分页参数应做边界处理：

```ts
interface Pagination {
  page: number;
  size: number;
}

function parsePagination(searchParams: URLSearchParams): Pagination {
  let page = Number(searchParams.get('page') ?? 1);
  let size = Number(searchParams.get('size') ?? 20);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(size) || size < 1) size = 20;
  if (size > 100) size = 100; // 强制上界，防止一次拉取过多

  return { page, size };
}
```

#### 5.2 urlencoded 表单解析

收集 body 后用 `URLSearchParams` 解码：

```js
function parseFormBody(req, limitBytes = 100_000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(Object.assign(new Error('表单过大'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const type = (req.headers['content-type'] ?? '').split(';')[0];
      const raw = Buffer.concat(chunks).toString('utf8');
      if (type === 'application/x-www-form-urlencoded') {
        const params = new URLSearchParams(raw);
        resolve(Object.fromEntries(params.entries()));
      } else {
        reject(Object.assign(new Error('不支持的内容类型'), { statusCode: 415 }));
      }
    });
    req.on('error', reject);
  });
}
```

multipart 表单（带文件）的解析复杂得多（边界、分片、多部分），实践中应使用成熟库处理，而不是手写；课程只需理解它与 urlencoded 的区别和使用场景。

三种“参数位置”的分工可以固定下来，作为后续所有接口的判断依据：

```text
URL 查询串 (?a=b)         GET 读取条件：分页、过滤、排序、字段裁剪
urlencoded 请求体          POST/PATCH 的普通键值负载（传统表单）
multipart 请求体           含文件或多段二进制的上传
JSON 请求体               现代 API 的结构化负载（见第 2 节）
```

#### 5.3 与 Web/后端的关系

查询参数适合无副作用的读取条件；敏感信息和大数据不应放进 URL（URL 会进入日志、历史记录）。统一的分页解析逻辑应被所有列表接口复用，而不是每个接口各写一套。

#### 5.4 常见误区

> 查询参数有类型，`?page=2` 拿到的 page 是数字。

URL 一切皆字符串，必须显式转换与兜底。

> 表单和 JSON body 用同一段解析逻辑。

编码方式不同，应按 content-type 分发解析器；类型不支持时返回 415 Unsupported Media Type。

> 分页 size 由客户端说了算，传多少给多少。

必须强制上界，否则一次请求可能拖垮数据库和内存。

### 6. 为什么真实项目需要框架

#### 6.1 定义：框架是什么、解决什么问题

Web 框架是构建在 http 模块之上的软件层，它把路由匹配、请求体解析、横切逻辑插入和错误兜底等每个项目都重复出现的问题，做成可组合、可配置的标准件。框架不替代 Node.js，也不替代业务架构；它替代的是手写这些通用机制的重复劳动。

把前面手写的能力汇总，就看清了这些重复劳动：

```text
每个项目都要自己解决：
1. 路由：路径参数、正则、404/405、多文件路由组织
2. body 解析：JSON、表单、大小限制、错误码
3. 查询参数与分页的重复解析
4. 横切逻辑：日志、认证、CORS、压缩——如何在不污染业务代码的情况下插入
5. 错误处理：异步处理器 throw 之后如何统一兜底
6. 异步处理器的 Promise 拒绝如何被捕获
7. 响应封装、安全头、静态文件……
```

手写一遍的价值是理解原理；生产中继续全手写则是重复造轮子且容易遗漏安全细节。框架的本质是**把这些通用问题做成可组合的标准件**。

#### 6.2 Express、Fastify、Nest 的定位

| 框架 | 定位 | 特点 |
|---|---|---|
| Express | 极简、成熟的 Web 框架 | 中间件模型简单直观，生态与存量项目最庞大，学习曲线平缓；本课程主线 |
| Fastify | 高性能 Web 框架 | 内置 schema 校验、更快的 JSON 序列化、插件体系；新项目追求性能时常选 |
| Nest | 企业级全功能框架 | 基于 TypeScript，提供依赖注入、模块化、守卫、拦截器等完整架构约束 |

三者并不矛盾：Nest 默认可基于 Express（也可切换 Fastify）作为底层 HTTP 适配层；Express/Fastify 处理的是“请求-响应”管道，Nest 在其上加了一层工程架构。Hono 等更轻量的现代框架也值得关注，但不是本课程主线。

建议的认知路径：

```text
第 39 单元：原生 http 手写 → 理解原理，建立分层意识
第 40 单元：Express 主线 → 中间件、路由、RESTful API
后续单元：需要更强架构约束时能理解 Nest 的动机；需要性能时了解 Fastify
```

用 Express 重写健康检查（第 40 单元展开，先建立直观对照）：

```js
import express from 'express';

const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('Express 运行在 3000');
});
```

对照可见：路由注册、JSON 响应、参数解析都变成了声明式 API，但底层仍是同一个 http 服务器。

在 TypeScript 中，处理器的三参数与错误处理器的四参数都有官方类型，签名本身就是文档：

```ts
import type { Request, Response, NextFunction } from 'express';

const healthHandler = (_req: Request, res: Response, next: NextFunction): void => {
  try {
    res.json({ status: 'ok' });
  } catch (err) {
    next(err); // 交给第 40 单元的四参数错误中间件
  }
};
```

#### 6.3 与 Web/后端的关系

框架决定了“请求进入业务逻辑之前”和“业务逻辑出错之后”这两段管道的写法，直接影响代码的可维护性和安全性：中间件顺序、解析限制、安全头、错误兜底都在这一层落地。但它不改变后端的核心职责——资源建模、业务规则与数据一致性仍然要靠分层架构和开发者自身完成。选框架时应先问“它替我省掉了什么、约束了什么”，而不是只比较性能数字。

#### 6.4 常见误区

> 用了框架就不用理解 http 与流。

框架是抽象不是黑盒；遇到超时、头已发送、body 超限等问题时，原理决定你能否排障。

> Express 性能最差，不该学。

对绝大多数业务系统，框架开销远小于网络与数据库耗时；Express 的生态、文档和就业存量价值极高，是最好的入门主线。

> 学了 Express 就等于会 Nest。

Nest 的核心增量是依赖注入与架构约束，需要单独学习；但 Express 基础会让你理解其底层。

### 7. 分层架构：route / service / repository

#### 7.1 定义：为什么要分层

当一个处理器既解析请求、又写业务规则、又直接操作数据时，代码会迅速变成无法测试的大函数。分层把不同变化速率的职责拆开：

```text
route（路由/控制器层）
  职责：接请求、取参数、调 service、组织 HTTP 响应与状态码
  不做：业务规则、直接读写数据

service（业务逻辑层）
  职责：业务规则与编排（校验规则、事务边界、调用其他服务）
  不做：不知道 HTTP 的存在（不接触 req/res），不直接写存储细节

repository（数据访问层）
  职责：对数据存储的增删改查封装（本课程先用内存/文件，后续换数据库）
  不做：业务判断
```

依赖方向只能从上往下：

```text
route → service → repository
反向依赖（repository 调 service）或跨层（route 直接操作存储）都会破坏可替换性与可测试性。
service 不依赖 req/res，意味着同一套业务逻辑可以被 HTTP、CLI、定时任务复用。
```

#### 7.2 各层 TypeScript 示例

repository（先用内存 Map，接口未来可无缝换成数据库实现）：

```ts
// repositories/user-repository.ts
export interface UserRecord {
  id: number;
  name: string;
  email: string;
}

export interface UserRepository {
  findById(id: number): Promise<UserRecord | null>;
  findAll(): Promise<UserRecord[]>;
  create(data: Omit<UserRecord, 'id'>): Promise<UserRecord>;
  delete(id: number): Promise<boolean>;
}

export function createInMemoryUserRepository(): UserRepository {
  const store = new Map<number, UserRecord>();
  let nextId = 1;

  return {
    async findById(id) {
      return store.get(id) ?? null;
    },
    async findAll() {
      return [...store.values()];
    },
    async create(data) {
      const record: UserRecord = { id: nextId++, ...data };
      store.set(record.id, record);
      return record;
    },
    async delete(id) {
      return store.delete(id);
    },
  };
}
```

service（纯业务逻辑，输入输出都是领域对象）：

```ts
// services/user-service.ts
import type { UserRepository, UserRecord } from '../repositories/user-repository.js';

export class UserNotFoundError extends Error {
  constructor(id: number) {
    super(`用户 ${id} 不存在`);
    this.name = 'UserNotFoundError';
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`邮箱 ${email} 已被使用`);
    this.name = 'DuplicateEmailError';
  }
}

export class UserService {
  constructor(private readonly users: UserRepository) {}

  async getById(id: number): Promise<UserRecord> {
    const user = await this.users.findById(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  }

  async list(): Promise<UserRecord[]> {
    return this.users.findAll();
  }

  async register(input: { name: string; email: string }): Promise<UserRecord> {
    const all = await this.users.findAll();
    if (all.some((u) => u.email === input.email)) {
      throw new DuplicateEmailError(input.email);
    }
    return this.users.create(input);
  }
}
```

route（HTTP 适配层，把领域错误翻译成状态码）：

```ts
// routes/user-routes.ts
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { UserService } from '../services/user-service.js';
import { UserNotFoundError, DuplicateEmailError } from '../services/user-service.js';
import { readJsonBody, sendJson } from '../lib/http-helpers.js';

export function createUserRouteHandler(userService: UserService) {
  return async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');

      if (req.method === 'GET' && url.pathname === '/api/users') {
        sendJson(res, 200, await userService.list());
        return;
      }

      const idMatch = /^\/api\/users\/(\d+)$/.exec(url.pathname);
      if (req.method === 'GET' && idMatch) {
        sendJson(res, 200, await userService.getById(Number(idMatch[1])));
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/users') {
        const body = await readJsonBody(req);
        sendJson(res, 201, await userService.register(body as { name: string; email: string }));
        return;
      }

      sendJson(res, 404, { message: 'Not Found' });
    } catch (err) {
      if (err instanceof UserNotFoundError) {
        sendJson(res, 404, { message: err.message });
      } else if (err instanceof DuplicateEmailError) {
        sendJson(res, 409, { message: err.message });
      } else {
        console.error(err);
        sendJson(res, 500, { message: 'Internal Server Error' });
      }
    }
  };
}
```

即使不使用 TypeScript（如维护老项目），service 也应是一个不认识 HTTP 的普通类，靠构造函数注入 repository：

```js
class ArticleService {
  constructor(articleRepository) {
    this.articles = articleRepository;
  }

  async publish(id) {
    const article = await this.articles.findById(id);
    if (!article) throw new Error('文章不存在');
    article.published = true;
    return this.articles.save(article);
  }
}
```

分层纪律与语言无关：类型只是让边界在编译期更清晰，职责与依赖方向才是本质。

#### 7.3 与 Web/后端的关系

分层让后端系统具备三种工程能力：可测试（service 注入假 repository 即可单测，无需起服务和数据库）、可替换（repository 从内存换成数据库时 service 不变）、可复用（同一 service 同时服务 HTTP、CLI 与定时任务）。这三点直接决定项目在需求增长时是“加层”还是“重写”，也是评审新人后端代码时的首要检查项。

#### 7.4 组装入口与目录结构

在入口处“创建依赖、注入、启动”：

```ts
// src/main.ts
import http from 'node:http';
import { createInMemoryUserRepository } from './repositories/user-repository.js';
import { UserService } from './services/user-service.js';
import { createUserRouteHandler } from './routes/user-routes.js';

const userRepository = createInMemoryUserRepository();
const userService = new UserService(userRepository);
const handler = createUserRouteHandler(userService);

const server = http.createServer((req, res) => {
  Promise.resolve(handler(req, res)).catch((err) => {
    console.error('未被处理器捕获的错误：', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Internal Server Error' }));
    }
  });
});

server.listen(3000, () => console.log('服务启动于 3000'));
```

标准目录结构：

```text
backend-demo/
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts               # 入口：组装依赖、启动服务
│   ├── app.ts                # 应用装配（第 40 单元用于挂载中间件/路由）
│   ├── config.ts             # 环境配置读取与校验
│   ├── routes/               # 路由层：HTTP 适配
│   │   └── user-routes.ts
│   ├── services/             # 业务逻辑层
│   │   └── user-service.ts
│   ├── repositories/         # 数据访问层
│   │   └── user-repository.ts
│   ├── lib/                  # 通用工具（http 辅助、日志）
│   └── types/                # 共享类型
└── tests/                    # 各层测试
```

分层带来的直接收益：

```text
可测试：service 传入假的 repository 即可单测，不需要起 HTTP、不需要数据库
可替换：repository 从内存换成数据库时，service 一行不改
可复用：同一 service 被 HTTP、CLI、消息消费者复用
```

#### 7.5 常见误区

> route 里写业务逻辑“更直接”。

短期直接，长期导致逻辑无法测试、无法复用，且散落在多个处理器中产生不一致。

> service 里直接用 req 取数据更省事。

这把业务层绑死在 HTTP 上，CLI 或定时任务无法复用。数据应由 route 提取后传入。

> repository 返回 HTTP 错误对象。

存储层不应知道状态码；它抛出领域无关的错误，由 route 翻译成 HTTP 语义。

> 分层就是多建几个文件夹。

关键是依赖方向与职责边界；文件夹结构只是约束的外化。

## 课后题

1. 描述一次 HTTP 请求进入 Node.js 后的完整路径：从操作系统通知到 res.end。
2. 为什么说 `req` 和 `res` 都是流？这一事实解释了原生 http 的哪两个“默认行为缺失”？
3. 场景分析：学员在 createServer 回调里只处理了成功分支并 res.end，异常分支没有任何处理。线上出现一次异常后，该客户端的请求一直挂起直到超时。请解释原因并给出修复结构。
4. 写出收集 JSON 请求体的步骤。为什么必须设置大小上限？解析与业务校验为什么是两道关？
5. 场景分析：某接口 content-type 声明为 application/json，服务端未做 try/catch 直接 JSON.parse。攻击者发送非法 JSON 导致服务进程出现未处理错误。请设计安全的解析函数返回状态。
6. 手写路由如何支持路径参数？为什么路径参数总是字符串？404 与 405 应如何区分？
7. 场景分析：某列表接口允许客户端传任意 `size`，一次请求 size=1_000_000 后数据库与服务内存同时告警。请写出分页参数解析的安全逻辑。
8. Express、Fastify、Nest 各自定位是什么？为什么课程在原生 http 之后以 Express 为主线？
9. 画出 route/service/repository 的职责与依赖方向。为什么 service 不应该接触 req/res？
10. 场景分析：把 repository 从内存实现换成数据库实现时，团队发现 service 代码里散落着数据格式转换逻辑，改动牵连很大。请说明分层哪里出了问题，正确的边界应如何划分？

## 实践练习题

### 练习 1：原生 HTTP 服务器与响应规范

#### 任务

零依赖创建 `raw-http-server`，实现三个端点：`GET /api/health` 返回健康 JSON、`GET /api/echo?text=...` 原样返回文本信息、`GET /api/time` 返回服务器时间；所有响应统一 JSON 格式并带正确状态码与 Content-Type。

#### 步骤约束

1. 使用 ESM + TypeScript，通过 tsx 运行；不安装任何框架。
2. 封装 `sendJson(res, code, payload)` 工具，全站使用，不重复写头。
3. 未匹配路径返回 404 JSON；方法错误返回 405 并设置 Allow 头。
4. 用 curl 或 HTTP 客户端记录每个端点的状态码、响应头与响应体。
5. 在某个端点中制造同步阻塞 2 秒的临时实验，用并发请求观察排队，再删除实验代码并解释。
6. 服务监听 `127.0.0.1`，端口从环境变量读取并校验。

#### 提交物

- 服务器源码与工具模块；
- 各端点与错误路径的请求记录；
- 阻塞实验的观察结论；
- 启动方式说明。

#### 验收标准

- 所有分支均有且仅有一次 end；
- 状态码、Content-Type、405/Allow 使用正确；
- 能用事件循环解释阻塞实验现象；
- 端口配置校验有效，端口冲突有可识别错误。

### 练习 2：带 body 解析的迷你文章 API（原生路由）

#### 任务

用第 4、5 节的迷你路由器实现文章资源的雏形 API：列出文章、按 id 获取、创建文章；支持路径参数、JSON body 解析与查询分页参数。数据存内存。

#### 步骤约束

1. 复用自写 MiniRouter，路由注册形式为 `router.add('GET', '/api/articles/:id', handler)`。
2. 创建接口解析 JSON body（上限 1 MB），非法 JSON 返回 400、过大返回 413。
3. 列表接口解析 page/size 参数，强制 size 上界 100，并在响应中带回分页信息。
4. 路径 id 转数字并校验，非法 id 返回 400，不存在返回 404。
5. 所有异步处理器必须 catch 错误并映射为合适状态码，不能让请求挂起。
6. 用 curl 覆盖正常、404、405、400、413 五类路径并记录。

#### 提交物

- 路由器、解析工具与处理器源码；
- 五类状态路径的请求/响应记录；
- 分页参数测试（含超大 size 的处理）；
- 接口清单文档。

#### 验收标准

- 状态码语义正确，404 与 405 不混淆；
- body 与分页均有边界保护；
- 异步错误不会造成挂起或进程崩溃；
- 处理器中不出现同步阻塞调用。

### 练习 3：分层架构改造与 Express 对照

#### 任务

把练习 2 的代码按 route/service/repository 分层重构为 `layered-api`，并额外用 Express 重写同一个资源的健康检查与列表接口，对照说明框架替你完成的工作。

#### 步骤约束

1. repository 定义接口并提供内存实现；service 包含文章创建与查询的业务规则（如标题非空、内容长度限制）。
2. route 只做参数提取、调用 service、错误到状态码的翻译；业务错误使用具名错误类。
3. service 不得导入 http 相关模块；用一个不依赖 HTTP 的测试验证 service 行为。
4. Express 版本单独目录，使用 `express.json()` 解析 body、`app.get` 注册路由。
5. 在 README 中给出“原生 vs Express”对照表：路由、body、错误处理、横切逻辑各由谁负责。
6. 两套实现共享同一份 service/repository 代码，证明业务层与传输层解耦。

#### 提交物

- 分层后的完整项目（含 Express 对照版本）；
- service 层的非 HTTP 测试；
- 原生与 Express 对照表；
- 组装入口 main.ts 与目录结构说明。

#### 验收标准

- 依赖方向严格为 route → service → repository；
- service 可独立测试，换 HTTP 框架不影响业务代码；
- 错误翻译集中在 route 层，状态码与错误类型对应；
- 对照表能准确指出框架的价值边界。

## 阶段验收作业

### 作业名称

分层文章 API：从原生 HTTP 到框架认知

### 作业场景

团队要启动一个内容服务，要求你先用原生 http 证明自己理解服务器与路由的底层原理，再以清晰的分层结构交付可演进的代码，最后用 Express 做对照证明你理解框架“替你做了什么、没替你做什么”。后续接入数据库时，业务逻辑应一行不改。

### 提交物

```text
http-final/
├── raw-http-server/        # 练习 1 成果
├── mini-articles-api/      # 练习 2 成果
├── layered-api/            # 练习 3 成果（含 Express 对照）
│   ├── src/
│   │   ├── main.ts
│   │   ├── config.ts
│   │   ├── routes/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── lib/
│   └── tests/
├── docs/
│   ├── request-lifecycle.md  # 请求生命周期与 req/res 流说明
│   └── framework-compare.md  # 原生/Express/Fastify/Nest 认知与对照表
└── README.md
```

### 演示步骤

学员在 20 分钟内完成：

1. 讲解一次请求从端口到 res.end 的生命周期，指出 req/res 为何是流。
2. 运行原生服务器，现场发起健康检查、404、405 请求并解释响应头。
3. 对文章 API 现场发送正常创建、非法 JSON、超大 body、错误 id 请求，展示状态码。
4. 展示分页 size 超上界时的处理。
5. 讲解分层结构，指出某段“写在 route 里的业务逻辑”应如何归位。
6. 运行 service 的非 HTTP 测试，并切换到 Express 版本演示同一套业务代码不变。

### 评分标准（合计 100 分）

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| HTTP 原理与服务器 | 15 | 生命周期、req/res 流、listen/端口理解准确 |
| 请求解析与校验 | 20 | method/url/headers/query/body 解析完整，边界与状态码正确 |
| 响应与路由雏形 | 20 | 状态码/头/体规范，路径参数、404/405 处理正确 |
| 框架认知 | 15 | 准确说明框架价值与 Express/Fastify/Nest 定位 |
| 分层架构 | 20 | 三层职责清晰、依赖方向正确、service 可独立测试 |
| 可复现性与规范 | 10 | README 完整，脱敏，无真实密钥，他人可复现 |

细分规则：

- HTTP 原理（15 分）：生命周期解释 6 分；流的理解 5 分；端口/headersSent 等细节 4 分。
- 请求解析（20 分）：JSON 收集 6 分；大小限制与错误码 5 分；查询/分页 5 分；解析与校验分离 4 分。
- 响应与路由（20 分）：sendJson 规范 5 分；路径参数 5 分；404/405 区分 5 分；异步错误不挂起 5 分。
- 框架认知（15 分）：痛点清单 5 分；三框架定位 6 分；Express 对照实现 4 分。
- 分层架构（20 分）：职责划分 6 分；依赖方向 5 分；service 去 HTTP 化与测试 5 分；组装入口 4 分。
- 可复现性（10 分）：README 4 分；脱敏无密钥 3 分；目录整洁、产物分离 3 分。

70 分及以上通过。

### 强制不通过条件

出现以下任一情况即不通过，修正后重新验收：

1. 认为 req/res 是普通对象，或无法解释请求体为何要手动收集。
2. 存在没有 end 的响应分支，导致请求挂起。
3. 不限制 body 大小或分页 size，允许客户端无界索取资源。
4. 统一用 200 包裹错误，或无法区分 404 与 405。
5. service 直接依赖 req/res，或分层依赖方向倒置、跨层访问。
6. 项目无法按 README 在另一台当前 LTS 环境复现。
7. 提交真实密码、令牌或私钥。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 用 http 创建服务器，理解 req/res 流 | `request-lifecycle.md` 与原生服务器演示 |
| 解析请求方法/头/查询/body | 文章 API 五类状态路径演示 |
| 规范组织响应 | sendJson 工具与状态码检查 |
| 手写路由与路径参数 | MiniRouter 实现与 404/405 演示 |
| 解释框架价值与流派 | `framework-compare.md` 与 Express 对照版本 |
| 实践 route/service/repository 分层 | layered-api 结构、组装入口与非 HTTP 测试 |

### 提交前自检

- [ ] 六个学习目标均有对应证据。
- [ ] 每个处理器的每个分支都有且仅有一次 res.end。
- [ ] 所有 body 解析带大小上限，非法/超限/类型不支持分别返回 400/413/415。
- [ ] 路径参数与查询参数均做了类型转换、兜底与上界约束。
- [ ] 404 与 405 使用正确，错误响应不统一包 200。
- [ ] service 层源码中不出现 http/req/res 字样，且有独立测试。
- [ ] repository 面向接口编程，切换实现不影响 service。
- [ ] README 可指导他人复现，且不含真实密钥、绝对路径或个人信息。
