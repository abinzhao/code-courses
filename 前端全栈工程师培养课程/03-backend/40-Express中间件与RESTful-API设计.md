# 40-Express 中间件与 RESTful API 设计

## 目标

第 39 单元用原生 http 手写了服务器、路由器和分层架构，本单元正式进入 Express：它用“中间件管道 + 声明式路由”把重复劳动标准化。本单元的另一半是 API 设计语言——REST。会写代码只能让接口“能跑”，理解资源建模、方法语义、状态码与幂等，才能让接口“可预期、可协作、可演进”。

完成本知识单元后，学员应能够：

1. 独立装配 Express 应用，理解 Express 应用与原生 http 服务器、Node 事件循环的关系。
2. 使用 `express.Router()` 按资源组织模块化路由，理解路由匹配顺序与路径参数。
3. 解释中间件链的执行机制与 `next` 的作用，能编写自定义中间件并正确接入内置与第三方中间件。
4. 使用四参数错误处理中间件统一兜底，理解异步错误如何被捕获并翻译成统一错误响应。
5. 熟练使用 req/res 常用 API（params/query/body、json/status/headers 等）。
6. 按 REST 思想为资源建模并设计 URI，正确运用 HTTP 方法语义、状态码与幂等性，实现分页与统一响应格式。

## 技术栈

| 工具或环境 | 版本线 | 用途 | 学习要求 |
|---|---|---|---|
| Node.js | 当前 LTS | 运行时 | 理解 Express 构建于 http 之上 |
| Express | 当前稳定版 | Web 框架主线 | 应用、路由、中间件、错误处理 |
| TypeScript | 5.x 稳定版 | 类型化中间件与处理器 | 能扩展 Request 类型、声明请求体接口 |
| cors / helmet / morgan / compression | 当前稳定版 | 第三方中间件 | 理解各自职责与接入顺序 |
| tsx | 当前稳定版 | 开发期运行 | watch 模式调试 |
| pnpm | 当前稳定版 | 包管理 | 安装依赖与组织脚本 |
| @types/express、@types/cors 等 | 随生态发布 | 类型声明 | 编译期类型，运行时无关 |

约定：

- 中间件接入遵循“先基础安全与解析、再业务路由、最后错误处理”的顺序纪律。
- URI 使用复数名词的教学虚构资源（`/api/articles`），不写真实业务域名。
- 统一响应与统一错误结构在全项目复用；示例中不出现真实凭据。
- 版本号不写死小版本，以包管理器当前解析的稳定版为准。

## 详细的理论知识讲解和示例伪代码

### 1. Express 应用装配与启动

#### 1.1 定义

Express 应用（application）是一个请求处理函数：它内部维护一条中间件与路由的有序表，请求进来后按顺序匹配。`express()` 创建应用，`app.listen` 在底层调用 `http.createServer(app)` 并监听端口。

```js
import express from 'express';

const app = express();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(3000, () => {
  console.log('服务运行在 http://127.0.0.1:3000');
});
```

与原生 http 的对应关系：

```text
const app = express();
http.createServer(app);           ← app 本身就是 (req, res) => void 的请求函数
app.listen(3000);                 ← 内部创建 http 服务器并 listen
中间件/路由                        ← 替代第 39 单元手写的匹配表
错误兜底                          ← 替代手写的 catch 翻译逻辑
```

更工程化的写法是把“装配”和“启动”分离，便于测试（测试可以直接拿 app 起临时端口，不必占用固定端口）：

```ts
// src/app.ts：只负责装配
import express from 'express';

export function createApp() {
  const app = express();

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
```

```ts
// src/main.ts：只负责启动
import { createApp } from './app.js';
import { config } from './config.js';

const app = createApp();
app.listen(config.port, () => {
  console.log(`服务启动于 ${config.port}`);
});
```

#### 1.2 与 Web/后端的关系

装配与启动分离让应用可测试、可复用（同一 app 可接入 HTTP 测试工具、可挂到 https 服务器、可接 serverless 适配）。它仍然是第 39 单元分层架构中的“传输层”：app 只负责把 HTTP 请求接到 route，业务逻辑依旧在 service/repository。

#### 1.3 常见误区

> Express 替换了 Node 的 http 模块。

Express 构建于 http 之上，请求和响应对象仍是 IncomingMessage/ServerResponse 的扩展，流和事件循环行为完全一致。

> app 必须直接 listen 才能使用。

app 只是函数；可以交给 http 测试工具、https.createServer 或部署平台，listen 只是最常见的启动方式。

### 2. 路由系统：方法、路径与 Router

#### 2.1 定义

路由把“方法 + 路径”映射到处理器。Express 为每个标准方法提供了注册函数：`app.get/post/put/patch/delete`。路径可以是静态字符串、带参数段（`:id`）或正则约束。

```js
app.get('/api/articles', listArticles);
app.post('/api/articles', createArticle);
app.get('/api/articles/:id', getArticle);
app.put('/api/articles/:id', replaceArticle);
app.patch('/api/articles/:id', updateArticle);
app.delete('/api/articles/:id', removeArticle);
```

路径参数与查询参数通过 req 读取：

```js
app.get('/api/articles/:id/comments/:commentId', (req, res) => {
  const { id, commentId } = req.params; // 路径参数（字符串）
  const { page = '1' } = req.query;     // 查询参数
  res.json({ articleId: id, commentId, page });
});
```

#### 2.2 匹配顺序：先注册先匹配

Express 按注册顺序逐条尝试，匹配成功且处理器结束响应后停止；处理器不结束、不调用 next 时请求会挂起。因此顺序纪律很重要：

```text
具体路由放在带参数路由之前，避免被参数路由“吞掉”：
  GET /api/articles/published     ← 先注册
  GET /api/articles/:id           ← 后注册
顺序写反时，请求 /published 会进入 :id 处理器，id 变成 "published"。
```

#### 2.3 Router：模块化组织路由

`express.Router()` 是一个迷你应用，可以挂载中间件和路由，再整体挂到路径前缀。它是按资源拆分代码的基础件。

```js
// src/routes/articles-router.js
import { Router } from 'express';

export const articlesRouter = Router();

articlesRouter.get('/', (req, res) => {
  res.json([{ id: 1, title: '第一篇' }]);
});
articlesRouter.get('/:id', (req, res) => {
  res.json({ id: Number(req.params.id), title: '第一篇' });
});
articlesRouter.post('/', (req, res) => {
  res.status(201).json({ id: 2, ...req.body });
});
```

```js
// src/app.ts 挂载
app.use('/api/articles', articlesRouter);
// Router 内的 '/' 实际匹配 /api/articles，'/:id' 匹配 /api/articles/:id
```

嵌套资源可以用嵌套 Router 或合并参数；需要让子 Router 访问父路径参数时，开启 `mergeParams: true`。

TypeScript 中给请求体定义接口：

```ts
interface CreateArticleBody {
  title: string;
  content: string;
}

articlesRouter.post('/', (req, res) => {
  const body = req.body as CreateArticleBody;
  if (!body.title || !body.content) {
    res.status(400).json({ message: '标题与内容必填' });
    return;
  }
  res.status(201).json({ id: 1, ...body });
});
```

#### 2.4 与 Web/后端的关系

路由表是前后端契约的骨架：URI 清单稳定，前端才能固定页面到接口的映射，后端才能在不改契约的前提下替换实现。Router 让“一个资源一个文件”成为团队级约定，新成员按目录即可定位接口，而不必在一个上千行的入口文件里搜索。随着资源增多，路由组织能力比单个处理器写法更能决定项目的可维护性。

#### 2.5 常见误区

> 路由注册顺序无所谓。

顺序决定匹配结果；静态段与参数段冲突时尤其敏感。

> Router 挂载后，内部路径还要重复写完整前缀。

挂载点已经给出前缀，Router 内部从 `/` 开始写。

> 路径参数可以直接当数字用。

params 永远是字符串，需显式转换并校验。

### 3. 中间件链与 next

#### 3.1 定义

中间件（middleware）是签名为 `(req, res, next) => void` 的函数。Express 把所有中间件和路由组织成一条有序管道：请求从头部进入，每个中间件可以：

```text
1. 处理请求（读头、改 req、记日志）
2. 调用 next() 把控制权交给下一个中间件/路由
3. 直接结束响应（res.json/end）
4. 调用 next(err) 把错误交给错误处理中间件
```

管道的概念模型：

```text
请求 → json 解析 → cors → 日志 → 鉴权 → 路由处理器 → 响应
                任一步调用 next(err) → 错误处理中间件
                任一步忘记 next 且不响应 → 请求挂起
```

自定义日志中间件：

```js
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const cost = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${cost}ms`);
  });
  next(); // 必须放行，否则后续全部卡住
}

app.use(requestLogger);
```

路径限定与多中间件串行：

```js
// 只对 /admin 路径生效
app.use('/admin', adminAuthMiddleware);

// 单个路由上挂多个中间件：先鉴权、再校验、最后处理器
app.post(
  '/api/articles',
  authMiddleware,
  validateArticleMiddleware,
  createArticleHandler,
);
```

#### 3.2 中间件的“洋葱”视角

请求阶段按注册顺序向下，响应在 res 结束后回传；在 next 之后写的代码会在下游全部处理完后执行：

```js
app.use((req, res, next) => {
  console.log('A 进入');
  next();
  console.log('A 退出'); // 下游链路返回后执行
});

app.use((req, res, next) => {
  console.log('B 进入');
  res.send('ok');
  next(); // 响应已发送仍可继续，但不应再写 res
});
```

输出为 `A 进入 → B 进入 → A 退出`。这一模型用于包裹计时、事务、追踪上下文等场景。

TypeScript 下把三个参数显式标注为 `Request`、`Response`、`NextFunction`，中间件契约一目了然：

```ts
import type { Request, Response, NextFunction } from 'express';

function timingMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`响应完成，耗时 ${Date.now() - start}ms`);
  });
  next();
}
```

#### 3.3 与 Web/后端的关系

中间件是“横切关注点”的答案：日志、CORS、鉴权、压缩、安全头、请求 ID 这些每个请求都要走的逻辑，写成中间件后业务处理器只关心业务。这也是分层架构之外的“管道层”纪律。

#### 3.4 常见误区

> 忘记调用 next() 只是“少走一步”。

不 next 也不响应，请求会一直挂到超时，且占用连接资源。

> 在中间件里 res.send 之后再 next 会进入下一个路由。

响应已结束；后续中间件仍会执行，但若再次写响应会报 `Cannot set headers after they are sent`。send 后不应再继续写响应。

> next() 之后的代码不会执行。

会执行，它在下游同步返回后运行；异步工作要注意时序。

> 所有逻辑都该做成中间件。

中间件处理横切逻辑；业务规则属于 service，不要把业务判断塞进全局管道。

### 4. 内置、第三方与自定义中间件

#### 4.1 内置中间件

| 中间件 | 作用 |
|---|---|
| `express.json()` | 解析 JSON 请求体，挂到 `req.body`；支持 limit 大小限制 |
| `express.urlencoded({ extended })` | 解析表单请求体 |
| `express.raw()` | 保留原始 Buffer body（处理 webhook 签名等） |
| `express.text()` | 解析纯文本 body |
| `express.static(root)` | 托管静态文件目录 |

```js
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static('./public'));
```

json 解析器只处理匹配的 content-type，且有大小上限：超限直接进入错误流程（状态 413），非法 JSON 返回 400——它替你完成了第 39 单元手写的收集与解析工作。

#### 4.2 常见第三方中间件

| 中间件 | 职责 | 接入注意 |
|---|---|---|
| cors | 跨域资源共享，处理预检与响应头 | 生产应限定来源，不默认全开 |
| helmet | 设置一组安全响应头 | 尽早注册，让所有响应带上 |
| morgan | HTTP 访问日志 | 与自定义业务日志区分 |
| compression | gzip 压缩响应体 | 已压缩内容（图片/视频）无需再压 |
| express-rate-limit | 请求频率限制 | 保护登录、短信等接口 |

接入示例（注意顺序：安全与解析在前）：

```js
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';

app.use(helmet());
app.use(cors({ origin: 'https://web.example.com' })); // 教学占位来源
app.use(compression());
app.use(morgan('short'));
app.use(express.json({ limit: '1mb' }));
app.use('/api', articlesRouter); // 业务路由在通用中间件之后
```

把装配顺序固化成一张清单，新增任何中间件时都对照它决定位置：

```text
1. helmet        安全头，需要覆盖所有响应，放最前
2. cors          跨域预检要在业务路由之前处理
3. morgan        访问日志，越早越能记录完整管道
4. json/encoded  body 解析，处理器读取 req.body 之前必须就位
5. static        静态资源，可与业务路由并列
6. routers       业务路由
7. 404 兜底      未命中任何路由时统一 JSON
8. error 兜底    错误处理中间件，必须最后
```

#### 4.3 自定义中间件实战

请求 ID 与简单鉴权：

```js
import { randomUUID } from 'node:crypto';

function attachRequestId(req, res, next) {
  req.id = req.headers['x-request-id'] ?? randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ message: '缺少认证信息' });
    return; // 不调用 next，链路在此结束
  }
  req.token = auth.slice('Bearer '.length);
  next();
}
```

TypeScript 扩展 Request 类型，让自定义字段有类型：

```ts
// src/types/express.d.ts
import type { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    id?: string;
    token?: string;
  }
}
```

#### 4.4 与 Web/后端的关系

中间件生态是 Express 最大的工程资产：多数通用问题都有成熟实现，不必手写。但接入第三方中间件仍要审视配置（CORS 全开、静态目录暴露、limit 缺失都是常见安全坑），并理解每个中间件“在管道里做了什么”。

#### 4.5 常见误区

> `app.use(cors())` 无参配置适合生产。

无参默认允许任意来源；生产应白名单限定。

> static 可以直接托管整个项目根目录。

会把源码、配置甚至 `.env` 暴露出去；静态目录应只指向专门的 public 目录。

> 中间件顺序无所谓，全 use 上就行。

解析器必须在使用 req.body 的路由之前；安全头希望覆盖所有响应，应放最前。

### 5. 错误处理中间件与异步错误

#### 5.1 定义：四参数是唯一标志

错误处理中间件必须声明四个参数 `(err, req, res, next)`，Express 靠参数个数识别它。它通过 `next(err)` 触发，应放在所有路由之后注册。

```js
function errorHandler(err, req, res, next) {
  console.error(`[${req.id ?? 'no-id'}]`, err);

  const status = err.statusCode ?? 500;
  const message = status >= 500 ? 'Internal Server Error' : err.message;

  res.status(status).json({
    error: {
      code: err.code ?? 'INTERNAL_ERROR',
      message,
      requestId: req.id,
    },
  });
}

app.use(errorHandler); // 必须最后注册
```

5xx 错误对外只给笼统信息，详细错误进日志；4xx 可以把可修正的信息返回给调用方。这与第 39 单元的错误翻译原则一致，但集中到了一处。

TypeScript 可以用 `ErrorRequestHandler` 类型给错误处理器“强制四参数”，少写一个参数时编译期就报错：

```ts
import type { ErrorRequestHandler } from 'express';

interface HttpError extends Error {
  statusCode?: number;
  code?: string;
}

const typedErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const httpError = err as HttpError;
  const statusCode = httpError.statusCode ?? 500;

  res.status(statusCode).json({
    error: {
      code: httpError.code ?? 'INTERNAL_ERROR',
      message: statusCode >= 500 ? 'Internal Server Error' : httpError.message,
      requestId: req.id,
    },
  });
};
```

#### 5.2 异步错误为什么需要包装

Express 的传统版本不会自动捕获 async 处理器中抛出的异常或 rejected Promise：抛出的错误不在同步调用栈内，到不了错误中间件。需要用包装器把拒绝转成 `next(err)`：

```js
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

app.get(
  '/api/articles/:id',
  asyncHandler(async (req, res) => {
    const article = await articleService.getById(Number(req.params.id));
    res.json(article);
  }),
);
```

使用具名业务错误携带状态码：

```js
export class NotFoundError extends Error {
  constructor(resource) {
    super(`${resource} 不存在`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.code = 'RESOURCE_NOT_FOUND';
  }
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.code = 'VALIDATION_FAILED';
  }
}
```

在较新的 Express 大版本中，对返回 rejected Promise 的处理器已有更好的内置支持；但使用包装器（或确认版本行为后依赖其能力）仍是跨版本最稳妥的写法。

#### 5.3 404 兜底

没有路由匹配时 Express 默认返回 HTML 404；为了统一 JSON 契约，在路由之后、错误处理之前挂一个兜底：

```js
app.use((req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `路径 ${req.method} ${req.path} 不存在` },
  });
});

app.use(errorHandler);
```

完整管道顺序：

```text
安全/日志/解析中间件 → 业务路由 → 404 兜底 → 错误处理中间件
```

#### 5.4 与 Web/后端的关系

统一错误处理是前后端协作中“失败路径”的契约：前端拿到的每一个错误都有可枚举的错误码、可追踪的请求 ID 和一致的结构，才能区分“提示用户重试”“引导重新登录”与“上报监控”。没有兜底中间件时，错误可能以未处理拒绝的形式让进程崩溃，或以默认 HTML 的形式破坏前端解析。生产服务的错误出口必须收敛到这一处。

#### 5.5 常见误区

> 错误处理中间件只写三个参数也能用。

少了参数会被当作普通中间件，收不到错误。

> async 路由里 throw 会自动进错误中间件。

传统行为下不会，需要包装器或确认当前版本的 Promise 拒绝处理能力。

> 在错误中间件里再次出错没关系。

兜底中间件自身出错会让进程进入未处理错误路径；它应只做简单日志与响应，不再调用复杂逻辑。

> 错误处理中间件放在路由前面更早拦截。

放前面时还没有 `next(err)` 来源，等于无效；它必须在管道末端。

### 6. req/res 常用 API 速览

#### 6.1 定义

req/res API 是 Express 在原生 IncomingMessage/ServerResponse 之上加的便捷层：它们负责把路径参数、查询串、请求体、响应状态与 JSON 序列化等高频操作收敛成统一方法，但不改变对象本质——请求与响应仍然是流，头与体的发送顺序、结束响应的规则与原生 http 完全一致。

#### 6.2 Request 常用 API

| API | 内容 |
|---|---|
| `req.params` | 路径参数对象 |
| `req.query` | 查询参数对象 |
| `req.body` | 解析后的请求体（依赖解析中间件） |
| `req.headers` / `req.get(name)` | 请求头 |
| `req.method`、`req.path`、`req.originalUrl` | 方法、路径、完整原始 URL |
| `req.ip`、`req.protocol`、`req.hostname` | 连接信息 |
| `req.cookies` | Cookie（依赖 cookie 解析中间件） |

#### 6.3 Response 常用 API

| API | 作用 |
|---|---|
| `res.json(data)` | 发送 JSON（自动设置 Content-Type） |
| `res.status(code)` | 链式设置状态码 |
| `res.send(data)` | 发送字符串/Buffer/对象 |
| `res.set(name, value)` / `res.header` | 设置响应头 |
| `res.redirect(code, url)` | 重定向 |
| `res.cookie(name, val, opts)` / `res.clearCookie` | 写/删 Cookie |
| `res.sendStatus(code)` | 用状态码短语作为响应体 |
| `res.type(mime)` | 设置 Content-Type |

类型化的处理器示例：

```ts
interface ListQuery {
  page?: string;
  size?: string;
  keyword?: string;
}

app.get('/api/articles', (req, res) => {
  const { page = '1', size = '20', keyword = '' } = req.query as ListQuery;
  res.json({
    items: [],
    page: Number(page),
    size: Number(size),
    keyword,
  });
});

app.put('/api/articles/:id', (req, res) => {
  res.status(200).json({ updated: Number(req.params.id), ...req.body });
});
```

输入与输出的来源、顺序必须记清楚：

```text
req 读取：params ← 路径段    query ← 查询串    body ← 解析中间件填充
res 输出：status → set 头 → json/send 体（顺序反了头就白设）
```

普通 JavaScript 中同样使用链式组合，不需要类型注解，语义完全一致：

```js
app.get('/api/demo', (req, res) => {
  res
    .status(200)
    .set('X-Trace', req.get('x-trace') ?? 'none')
    .json({ receivedQuery: req.query });
});
```

#### 6.4 与 Web/后端的关系

这些 API 是第 39 单元原生对象能力的“加糖版”：`res.json` 等于序列化加头加 end，`req.query` 等于提前解析查询串。理解底层能避免在“头已发送”“重复响应”上犯错。

#### 6.5 常见误区

> `res.json` 之后还需要再调用 `res.end`。

json 内部已经结束响应，再 end 无意义且可能触发警告。

> 链式调用顺序无所谓。

`res.status(201).json(...)` 正确；先 json 再 status 则头已发出、设置无效。

### 7. REST 资源建模与 URI 设计

#### 7.1 定义：从“动作”到“资源”

REST（Representational State Transfer）是一种 Web API 架构风格，核心是把系统中的事物抽象为**资源**，每个资源用 URI 标识，用 HTTP 方法表达对资源做什么，用状态码表达结果。

```text
错误思路（RPC 式、把动词写进路径）：
  POST /createArticle
  GET  /getArticle?id=1
  POST /deleteArticle?id=1

REST 思路（名词是资源、动词是方法）：
  POST   /api/articles          创建文章
  GET    /api/articles/1        获取文章 1
  GET    /api/articles          获取文章集合
  DELETE /api/articles/1        删除文章 1
```

URI 设计规则：

```text
1. 路径中使用名词，集合用复数：/api/articles、/api/users
2. 层级表达从属关系：/api/articles/1/comments（文章 1 的评论）
3. 层级不宜过深（一般不超过两级），更深时用查询过滤：
   /api/comments?articleId=1
4. URI 里不出现动词；版本可放路径前缀（/api/v1/...）
5. 查询串表达“筛选/分页/排序/字段裁剪”，不属于资源层级：
   /api/articles?tag=node&sort=-createdAt
6. 命名统一使用小写连字符，不用下划线与驼峰（路径段层面）
```

#### 7.2 资源关系建模

```text
一对多：作者 → 文章
  GET /api/users/1/articles

多对多：文章 ↔ 标签
  GET /api/articles/1/tags
  POST /api/articles/1/tags      （把标签关联到文章）
  DELETE /api/articles/1/tags/9

独立查询：
  GET /api/tags?articleId=1
```

TypeScript 中把资源模型显式化：

```ts
interface ArticleResource {
  id: number;
  title: string;
  content: string;
  authorId: number;
  createdAt: string;
}

interface CommentResource {
  id: number;
  articleId: number;
  author: string;
  body: string;
}
```

普通 JavaScript 可以维护一份“方法 + URI”清单，并在注册前做命名自检，避免路径里混入驼峰段或动词：

```js
const plannedRoutes = [
  { method: 'GET', uri: '/api/articles' },
  { method: 'POST', uri: '/api/articles' },
  { method: 'GET', uri: '/api/articles/:id' },
  { method: 'DELETE', uri: '/api/articles/:id' },
];

for (const route of plannedRoutes) {
  const segments = route.uri.split('/').slice(2); // 去掉空段与 api
  for (const segment of segments) {
    if (segment.startsWith(':')) continue; // 参数段不检查
    if (/[A-Z_]/.test(segment)) {
      throw new Error(`路径段应使用小写连字符：${route.uri}`);
    }
  }
}
```

#### 7.3 与 Web/后端的关系

URI 是前后端协作契约中最显眼的部分：资源划分稳定，前端页面与后端表结构才能各自演进而不互相牵动。把动作写进路径会让接口数量爆炸（每个功能一个端点），资源建模则用少量 URI + 方法覆盖完整 CRUD。

#### 7.4 常见误区

> REST 就是“路径好看一点”。

它是一整套以资源为中心的建模方式，影响端点数量、缓存能力、接口可发现性和前后端分工。

> 所有操作都能 CRUD 化。

审核、发布、点赞这类非 CRUD 动作可以建模为子资源（`POST /api/articles/1/publishments` 之类）或专用子路径，但应保持语义清晰、数量克制，而不是退回一堆动词端点。

> 层级越深越“规范”。

过深的嵌套导致 URI 脆弱；用查询参数表达过滤更灵活。

### 8. 方法语义、状态码、幂等与统一响应

#### 8.1 定义：HTTP 方法语义与幂等性

HTTP 方法是请求意图的标准化表达：它告诉服务器这次调用是读取、创建、替换、局部更新还是删除，并由此决定操作是否安全、是否幂等。正确运用方法语义，调用方（浏览器、网关、重试机制）才能在无需阅读接口文档细节的情况下推断重复请求的后果。

幂等（idempotent）指：同一请求执行一次与执行 N 次，对资源状态的影响相同。

| 方法 | 语义 | 安全（不改变状态） | 幂等 |
|---|---|---|---|
| GET | 获取资源 | 是 | 是 |
| HEAD | 只取响应头 | 是 | 是 |
| POST | 创建资源（或提交处理） | 否 | 否 |
| PUT | 整体替换资源 | 否 | 是 |
| PATCH | 局部更新资源 | 否 | 不保证 |
| DELETE | 删除资源 | 否 | 是 |

```text
为什么 POST 不幂等：重复提交两次创建，生成两条记录
为什么 PUT 幂等：用同一份完整内容替换 10 次，结果与 1 次相同
为什么 DELETE 幂等：删除已不存在的资源，状态结果应保持一致（可返回 404 或 204，但重复调用不产生新副作用）
```

实践推论：

- 表单重复提交（网络重试、用户连点）应通过幂等键或使用 PUT/PATCH 语义防护。
- 更新接口优先让客户端提供完整资源走 PUT，或明确 PATCH 的局部语义。
- GET 绝不应产生副作用（不能用 GET 做删除/修改链接），否则预取、缓存、爬虫都会触发意外操作。

#### 8.2 状态码选用

| 状态码 | 使用场景 |
|---|---|
| 200 OK | 读取/更新成功 |
| 201 Created | 创建成功，通常在 Location 头给出新资源 URI |
| 204 No Content | 删除成功或无内容返回 |
| 400 Bad Request | 请求参数/JSON 不合法 |
| 401 Unauthorized | 未认证 |
| 403 Forbidden | 已认证但无权限 |
| 404 Not Found | 资源不存在 |
| 409 Conflict | 冲突（重复数据、并发版本冲突） |
| 422 Unprocessable Entity | 语法正确但语义校验失败 |
| 429 Too Many Requests | 触发限流 |
| 500 Internal Server Error | 服务端未预期错误 |

创建成功应带 Location：

```js
app.post('/api/articles', (req, res) => {
  const created = { id: 42, ...req.body };
  res.status(201).location(`/api/articles/${created.id}`).json(created);
});
```

#### 8.3 分页与统一响应

列表接口统一携带分页元信息，字段命名全项目一致：

```ts
interface Paginated<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

function toPaginated<T>(items: T[], total: number, page: number, size: number): Paginated<T> {
  return {
    items,
    page,
    size,
    total,
    totalPages: Math.ceil(total / size),
  };
}
```

统一成功响应与统一错误响应：

```text
成功（可按团队约定包裹，也可直接返回资源；课程建议列表包裹、单资源直接返回）：
  { "data": { ... } } 或直接资源 JSON
错误（全项目统一）：
  { "error": { "code": "VALIDATION_FAILED", "message": "...", "requestId": "..." } }
```

分页参数依然遵循第 39 单元规则：page 从 1 起、size 有上界、非法值兜底或 400。

#### 8.4 路由组织与最终目录

```text
backend-demo/
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts
│   ├── app.ts                 # 按顺序装配中间件与路由
│   ├── config.ts
│   ├── routes/
│   │   ├── index.ts           # 汇总各 Router 并挂载
│   │   ├── articles-router.ts
│   │   └── comments-router.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── request-id.ts
│   │   ├── async-handler.ts
│   │   └── error-handler.ts
│   ├── services/
│   ├── repositories/
│   └── types/
└── tests/
```

routes/index.ts 汇总：

```js
import { Router } from 'express';
import { articlesRouter } from './articles-router.js';
import { commentsRouter } from './comments-router.js';

export const apiRouter = Router();
apiRouter.use('/articles', articlesRouter);
apiRouter.use('/comments', commentsRouter);
```

app.ts 装配（顺序即纪律）：

```js
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.allowedOrigins }));
  app.use(attachRequestId);
  app.use(morgan('short'));
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

#### 8.5 与 Web/后端的关系

方法语义、状态码和统一响应共同构成了 API 的“公共语言”：监控系统按状态码统计错误率，缓存与 CDN 按方法和头判断能否缓存，前端按错误码决定交互，重试机制按幂等性决定是否自动重发。任何脱离这套语义的“私有约定”（动词端点、全 200、每接口一套结构）都会让协作成本随接口数量线性增长。本单元的规范应在后续所有后端单元中被持续复用。

#### 8.6 常见误区

> 认为 PATCH 天然幂等。

PATCH 只表达“局部更新”，是否幂等取决于具体补丁语义；需要保证重复安全时应设计成幂等操作或加幂等键。

> 401 和 403 混用。

401 是“没登录/令牌无效”，403 是“登录了但不允许”。前端会据此引导重新登录还是提示无权限。

> 删除一律返回 200 带 body。

无内容时 204 更贴切；是否带返回体可在团队规范中统一，但全项目要一致。

> 每个接口自定义一套响应结构。

契约不统一会让前端为每个接口写特殊处理；统一响应/错误结构是协作底线。

## 课后题

1. 描述 Express 请求管道的完整组成与注册顺序。为什么错误处理中间件必须放在最后？
2. `next` 在中间件中有哪些用法？忘记调用 next 会发生什么？
3. 场景分析：某学员在全局中间件里对每个请求做鉴权，未通过时既不 `next()` 也不响应。上线后大量客户端请求超时、连接堆积。请指出问题并写出正确写法。
4. 列举 Express 的内置中间件及其作用。为什么说 `express.json()` 替你完成了第 39 单元手写的工作？
5. 场景分析：生产环境直接 `app.use(cors())` 且用 `express.static('.')` 托管根目录。请指出两处风险及正确配置。
6. 传统 Express 版本中，async 处理器抛出的异常为什么不会自动到达错误中间件？写出包装器实现，并说明四参数错误中间件的识别机制。
7. 场景分析：某 API 全部用 POST，路径为 `/createArticle`、`/deleteArticle?id=1`，且所有响应都返回 200，错误放在 body。请从资源建模、方法语义、状态码三个维度批评并改写。
8. 解释安全、幂等的含义，并填写 GET/POST/PUT/PATCH/DELETE 的幂等性。为什么 GET 不能有副作用？
9. 场景分析：用户在弱网下双击“提交”按钮，服务端创建了两篇相同文章。请用方法语义与幂等思想给出至少两种防重方案。
10. 写出分页统一响应结构与 404 兜底、错误兜底的管道位置，并说明 201/204/401/403/409/422 各自的使用场景。

## 实践练习题

### 练习 1：中间件管道工坊

#### 任务

创建 `middleware-lab`，实现并接入三个自定义中间件：请求 ID（透传或生成，写入响应头）、访问日志（方法、路径、状态码、耗时）、简单 Bearer 鉴权（仅保护 `/api/secure`）；再接入 helmet、cors、express.json，并验证接入顺序。

#### 步骤约束

1. 使用 ESM + TypeScript，通过 tsx watch 运行；扩展 Express Request 类型以支持自定义字段。
2. 请求 ID 在日志与错误响应中都能被引用。
3. 鉴权失败返回 401，不调用 next；成功挂载解析出的 token 并放行。
4. 故意把 json 解析器放到使用 req.body 的路由之后，观察行为，再调回正确顺序并解释。
5. 用 curl 验证：普通路由、受保护路由（带/不带令牌）、响应头中的请求 ID。
6. 中间件中不写业务规则，业务数据一律走 service。

#### 提交物

- 三个中间件源码与类型声明；
- app 装配代码；
- 顺序实验与各路径请求记录；
- 中间件职责说明。

#### 验收标准

- 中间件顺序正确，请求 ID 全链路可见；
- 鉴权失败不挂起、不继续向下；
- 能解释中间件与 service 的职责边界；
- 第三方中间件配置安全（CORS 不全开）。

### 练习 2：RESTful 文章与评论 API

#### 任务

基于 Router 实现文章及其评论的 REST API，覆盖资源的增删改查：文章集合与单资源、文章下评论的嵌套资源；统一成功与错误结构，创建返回 201 + Location，删除返回 204。

#### 步骤约束

1. 使用分层结构：router → service → repository（内存实现）；路由中不出现业务规则。
2. 静态路由（如 `/api/articles/popular`）注册在 `/:id` 之前，并解释原因。
3. 请求体经 `express.json()` 解析并做校验：非法/缺失返回 400 或 422；body 超限返回 413。
4. 评论使用嵌套 Router 并开启 `mergeParams`，可访问文章 id。
5. 路径 id 转换并校验，不存在返回 404；重复标题等冲突返回 409。
6. 列表支持 page/size（size 上界 100）与按标签过滤，响应带分页元信息。

#### 提交物

- 路由、服务、仓储全部源码；
- 覆盖 200/201/204/400/404/409/413 的请求记录；
- 分页与过滤的测试记录；
- OpenAPI 风格的接口清单（用 Markdown 表格表达即可）。

#### 验收标准

- URI 全部名词化、层级合理；
- 状态码与方法语义正确；
- 业务逻辑集中在 service，可脱离 HTTP 测试；
- 路由顺序不出现参数吞静态的问题。

### 练习 3：防重提交与统一错误契约（综合）

#### 任务

为文章创建接口实现幂等保护：客户端可在请求头携带幂等键，服务端对同一键的重复请求返回首次结果而非重复创建；同时完善统一错误处理：任何路由（含异步）抛出的错误都经错误中间件输出统一结构与请求 ID。

#### 步骤约束

1. 异步路由全部使用 asyncHandler 包装；业务错误用具名类携带 code 与 statusCode。
2. 幂等键及其结果保存在 repository 中（接口抽象，内存实现即可）；重复键命中时返回 200 与首次资源，不产生新数据。
3. 不支持的方法返回 405 与 Allow；未匹配路径返回统一 JSON 404。
4. 错误中间件区分 4xx/5xx：5xx 对外只给笼统信息，详细内容进日志并带请求 ID。
5. 用脚本并发发送 10 个相同幂等键的创建请求，验证只创建一条资源。
6. 模拟 service 抛错、JSON 解析失败、body 超限三类错误，核对统一错误结构。

#### 提交物

- 幂等中间件/服务与仓储源码；
- 并发防重实验数据；
- 三类错误的统一响应记录；
- 错误码表与契约文档。

#### 验收标准

- 并发重复请求只产生一条资源；
- 所有异步错误均能到达错误中间件，无挂起、无未捕获拒绝；
- 错误结构、错误码、请求 ID 全项目一致；
- 405/404/413 等语义齐备。

## 阶段验收作业

### 作业名称

RESTful 内容 API：中间件管道与资源设计

### 作业场景

团队要交付一个内容服务的第一版 API，覆盖文章与评论两类资源。评审既看“管道工程”——中间件、错误处理、防重提交；也看“API 设计语言”——资源建模、URI、方法语义、状态码、幂等与统一契约。后续接入真实数据库与前端联调时，这套接口应当稳定、可预期。

### 提交物

```text
express-final/
├── middleware-lab/        # 练习 1 成果
├── articles-api/          # 练习 2 成果（含评论嵌套资源）
├── idempotency/           # 练习 3 成果
├── docs/
│   ├── api-contract.md    # 统一成功/错误契约与错误码表
│   ├── rest-design.md     # 资源模型图、URI 清单与方法/状态码矩阵
│   └── pipeline.md        # 中间件管道顺序图
├── tests/                 # 路由测试与并发防重测试
└── README.md
```

### 演示步骤

学员在 20 分钟内完成：

1. 讲解 Express 与 http/事件循环的关系及装配/启动分离。
2. 展示中间件管道顺序，现场发起带/不带令牌的请求并追踪请求 ID。
3. 演示文章与评论资源的完整 CRUD，指出 201/Location 与 204。
4. 现场并发发送相同幂等键请求，证明只创建一条资源。
5. 触发异步业务错误、非法 JSON、超大 body，展示统一错误响应。
6. 回答导师关于幂等性、401/403、PUT/PATCH 差异的追问。

### 评分标准（合计 100 分）

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| Express 装配与路由组织 | 15 | app/启动分离，Router 模块化，路由顺序正确 |
| 中间件机制与自定义 | 20 | 理解 next 与管道，自定义/内置/第三方接入规范 |
| 错误处理与异步安全 | 20 | 错误中间件、async 包装、统一错误结构与请求 ID |
| REST 资源建模与 URI | 20 | 名词化、层级合理、嵌套资源与查询过滤得当 |
| 方法语义/状态码/幂等 | 15 | 语义准确，幂等保护有效，状态码矩阵完整 |
| 分页统一响应与规范 | 10 | 分页元信息与统一契约一致，可复现、脱敏 |

细分规则：

- 装配与路由（15 分）：createApp/main 分离 4 分；Router 拆分挂载 5 分；静态/参数顺序 3 分；mergeParams 等细节 3 分。
- 中间件（20 分）：next 机制解释 6 分；三个自定义中间件 6 分；helmet/cors/json 接入与顺序 5 分；职责边界清晰 3 分。
- 错误处理（20 分）：四参数中间件 5 分；asyncHandler 覆盖全部异步路由 5 分；具名错误与状态翻译 5 分；404 兜底与请求 ID 关联 5 分。
- REST 建模（20 分）：资源抽象与 URI 清单 8 分；嵌套资源 5 分；无动词端点 4 分；层级深度控制 3 分。
- 方法/状态码/幂等（15 分）：方法语义与安全/幂等表 5 分；201/204/401/403/409/422 等使用 5 分；并发防重实验 5 分。
- 分页与规范（10 分）：分页元信息与 size 上界 4 分；统一成功/错误结构 3 分；README、脱敏、可复现 3 分。

70 分及以上通过。

### 强制不通过条件

出现以下任一情况即不通过，修正后重新验收：

1. 无法解释 Express 与原生 http、事件循环的关系。
2. 存在忘记 next 或不结束响应的分支，导致请求挂起。
3. 异步处理器错误未被捕获（无包装且未确认版本行为），出现未处理拒绝。
4. 错误处理中间件参数不足四个，或放在路由之前导致无效。
5. 接口以动词端点为主、统一返回 200，或方法语义/状态码明显错误。
6. 并发重复提交会产生重复资源，且无任何幂等防护。
7. 项目无法按 README 在另一台当前 LTS 环境复现，或提交真实密钥。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 装配 Express 应用并理解其底层 | 装配/启动分离代码与现场讲解 |
| 用 Router 组织模块化路由 | articles/comments Router 与挂载结构 |
| 掌握中间件链与 next | middleware-lab 与管道顺序图 |
| 接入各类中间件并自定义 | 安全/解析/鉴权中间件演示 |
| 统一错误处理（含异步） | 错误中间件、asyncHandler 与三类错误演示 |
| 熟练使用 req/res API | 各资源处理器与分页响应 |
| REST 资源建模与 URI 设计 | `rest-design.md` 与 URI 清单 |
| 方法语义/状态码/幂等/统一响应 | 方法矩阵、并发防重实验与契约文档 |

### 提交前自检

- [ ] 八个学习目标均有对应证据。
- [ ] app 装配严格按“安全/解析 → 业务路由 → 404 → 错误处理”的顺序。
- [ ] 所有处理器分支都会结束响应；中间件按规则调用 next。
- [ ] 全部异步路由经包装器（或确认版本能力）处理，未处理拒绝为零。
- [ ] URI 无动词、复数名词、层级不超过两级、过滤走查询参数。
- [ ] 方法语义、状态码与幂等表完整；创建带 201/Location、删除用 204。
- [ ] 幂等保护经并发实验验证：重复键只产生一条资源。
- [ ] 分页带统一元信息且 size 有上界；成功与错误结构全项目一致。
- [ ] README 不含真实密钥、绝对路径、个人信息，并可指导他人复现。
