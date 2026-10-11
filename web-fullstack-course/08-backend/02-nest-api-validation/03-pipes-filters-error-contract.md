# Pipes、Filters 与错误契约：把失败映射成可恢复协议

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 用参数 pipe、领域错误与全局 exception filter 建立稳定机器可读错误契约 |
| 练习目录 | `$HOME/code/market-backend-lab/nest-api` |
| 主要产物 | UUID pipe、领域错误、validation exception factory、请求 ID、全局 filter |
| 成功证据 | 合法 ID 返回商品；400/404 错误头体 requestId 一致，code 可稳定判断 |
| 失败证据 | 非 UUID、缺失商品、DTO 错误和测试故障分别映射为 400/404/400/500 |
| 环境标签 | **错误映射已实现，持久化/认证/授权仍未实现** |

## 1. 任务背景

没有统一边界时，同一个 API 可能返回：

```json
{"message":["priceCents must be an integer number"],"error":"Bad Request","statusCode":400}
```

也可能返回字符串、HTML、堆栈，甚至总是 200 再用正文说失败。客户端因此只能猜文本，
日志也无法与用户看到的错误关联。

邻里集市统一错误形状：

```json
{
  "code": "LISTING_NOT_FOUND",
  "message": "商品不存在",
  "requestId": "运行时生成的 UUID",
  "details": [
    {"field":"priceCents","rules":["isInt"]}
  ]
}
```

`details` 可选，只包含安全、结构化字段。错误映射顺序是：

```text
单值输入 -> Pipe
DTO -> ValidationPipe
业务不变量 -> DomainError
未知程序错误 -> Error
              |
              v
全局 ExceptionFilter -> HTTP status + ApiErrorBody
```

## 2. 学习目标

完成本课后，你能够：

1. 区分 pipe、guard、interceptor、filter 的职责；
2. 用参数 pipe 在 controller 前解析单个路径值；
3. 让 domain error 不依赖 Nest `HttpException`；
4. 将校验错误压缩为不回显原值的结构化 details；
5. 区分 400、401、403、404、409 与 500；
6. 让响应头和正文复用同一个 requestId；
7. 对未知错误隐藏堆栈和内部 message，同时保留服务端关联证据；
8. 避免 catch-all 后返回 200、空数组或模糊 INTERNAL；
9. 说明错误契约稳定不等于认证、授权或持久化已经完成。

## 3. 预备知识

完成[上一课](02-dto-transformation-validation.md)，确认合法创建 201、非法正文 400。
为 Express 平台的类型安装开发依赖：

```bash
cd "$HOME/code/market-backend-lab/nest-api"
pnpm add -D @types/express
mkdir -p src/http
```

`@nestjs/platform-express` 提供运行平台；`@types/express` 只供 TypeScript 编译。不要因为有 Express 类型就让
service 接收 `Request`/`Response`。

## 4. 核心理论

### 4.1 Pipe 处理进入 controller 的单值

Pipe 可转换或拒绝参数。例如 `ParseListingIdPipe` 接收 `unknown`，确认它是 UUID 字符串后才返回 string。
它适合路径 ID、整数参数等局部适配，不负责“当前用户能否编辑该商品”。

### 4.2 Guard、interceptor、filter 不可互换

| 组件 | 主要职责 | 本课是否实现 |
| --- | --- | --- |
| Pipe | 转换/校验输入值 | 是 |
| Guard | 身份与是否允许进入 handler | 第 6 章 |
| Interceptor | handler 前后横切、映射成功结果/耗时 | 后续按需 |
| Exception Filter | 把抛出的失败映射为协议响应 | 是 |

把授权写进 validation decorator 会让输入形状与用户身份耦合；把所有异常塞进 interceptor 也会模糊职责。

### 4.3 Domain error 不认识 HTTP

“商品不存在”“版本冲突”是业务事实，可由 HTTP、队列任务或命令行用例触发。领域层抛出自己的错误：

```text
ListingNotFoundError
VersionConflictError
```

filter 再把它们映射成 404/409。这样 service 不导入 `NotFoundException`，也不直接写 response。

### 4.4 状态码语义

| 状态 | 稳定含义 | 示例 code |
| ---: | --- | --- |
| 400 | 请求语法/字段/参数不合法 | `VALIDATION`、`INVALID_LISTING_ID` |
| 401 | 未建立有效身份 | `UNAUTHENTICATED` |
| 403 | 已知身份但对象/角色不允许 | `FORBIDDEN` |
| 404 | 资源或路由不存在 | `LISTING_NOT_FOUND`、`NOT_FOUND` |
| 409 | 当前状态与提交冲突 | `VERSION_CONFLICT` |
| 500 | 未预期服务端错误 | `INTERNAL` |

401 与 403 不能互换；隐藏按钮也不能替代后端 403。当前章节没有认证，不能为了演示随意返回 401/403。

### 4.5 requestId 的生成与传播

本课在应用入口为每个请求生成 UUID，并同时：

- 写入 request 对象供 filter 使用；
- 写入 `X-Request-Id` 响应头；
- 放入错误正文；
- 供服务端脱敏日志关联。

生产代理可能传入 trace/request ID，但不能盲信任任意长度和字符的外部头。后续可校验后接续，
本课始终生成服务端 ID。

### 4.6 校验详情不回显敏感值

class-validator 的 `ValidationError` 可包含 `target` 和 `value`。全局 pipe 已关闭两者，
exception factory 进一步只保留字段路径和规则键。`password`、Cookie 和整个请求正文不得出现在错误体。

### 4.7 未知错误要双向不同

客户端只收到稳定 500：

```json
{"code":"INTERNAL","message":"服务器内部错误","requestId":"..."}
```

服务端记录 requestId、错误类别和安全上下文。不能把 `error.message`、stack、SQL 或绝对路径回给客户端。
同时不能吞掉未知错误后返回空列表，否则用户看到“无商品”，监控也失去失败信号。

## 5. 元素、属性、API 或配置清单

| API / 类型 | 用途 | 边界 |
| --- | --- | --- |
| `PipeTransform<unknown, string>` | unknown 路径值 -> 已校验 ID | 不查数据库 |
| `@Param("id", Pipe)` | controller 参数前执行 | 不证明资源存在 |
| `BadRequestException` | pipe/validation 产生 400 | service 不直接依赖 |
| `ValidationPipe.exceptionFactory` | 自定义 DTO 错误 payload | 仍由 filter 统一 requestId |
| `ValidationError` | 读取 property/constraints/children | 不回显 target/value |
| `DomainError` | 表达业务失败 | 不包含 HTTP response |
| `@Catch()` | 捕获所有流出异常 | 必须先分类，不能全映射 500 |
| `ArgumentsHost` | 进入 HTTP context | filter 与平台边界 |
| `HttpException.getStatus` | 保留已知 HTTP 状态 | payload 仍需安全规范化 |
| `randomUUID` | 服务端 requestId | 不写死测试值 |
| `X-Request-Id` | 客户端关联字段 | 不是认证凭据 |
| `instanceof` | 区分本进程 error class | 跨进程序列化后需稳定 code |
| `details` | 可选字段/规则列表 | 不放原始输入 |

## 6. 最小可运行案例

### 6.1 领域错误

创建完整文件 `src/listings/listing.errors.ts`：

```ts
export abstract class DomainError extends Error {
  abstract readonly code: string;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class ListingNotFoundError extends DomainError {
  readonly code = "LISTING_NOT_FOUND";

  constructor(readonly listingId: string) {
    super("商品不存在");
  }
}

export class VersionConflictError extends DomainError {
  readonly code = "VERSION_CONFLICT";

  constructor(
    readonly expectedVersion: number,
    readonly actualVersion: number,
  ) {
    super("商品已被更新，请刷新后再提交");
  }
}
```

`VersionConflictError` 在本课只建立映射合同；真正受保护更新和并发证据在第 5 章。

### 6.2 路径 ID pipe

创建完整文件 `src/http/parse-listing-id.pipe.ts`：

```ts
import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";
import { isUUID } from "class-validator";

@Injectable()
export class ParseListingIdPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== "string" || !isUUID(value, "4")) {
      throw new BadRequestException({
        code: "INVALID_LISTING_ID",
        message: "商品 ID 必须是 UUID v4",
      });
    }
    return value;
  }
}
```

Pipe 只验证形状；合法 UUID 指向不存在商品时，由 service 抛 404 domain error。

### 6.3 校验错误扁平化

创建完整文件 `src/http/validation-details.ts`：

```ts
import type { ValidationError } from "class-validator";

export type ValidationDetail = Readonly<{
  field: string;
  rules: readonly string[];
}>;

export function flattenValidationErrors(
  errors: readonly ValidationError[],
  parent = "",
): ValidationDetail[] {
  return errors.flatMap((error) => {
    const field = parent === "" ? error.property : `${parent}.${error.property}`;
    const current =
      error.constraints === undefined
        ? []
        : [{
            field,
            rules: Object.keys(error.constraints).sort(),
          }];
    return [
      ...current,
      ...flattenValidationErrors(error.children ?? [], field),
    ];
  });
}
```

规则键比 class-validator 默认英文句子更稳定，但客户端仍不应把每个内部规则键当永久产品文案。

## 7. 邻里集市集成案例

### 7.1 全局 exception filter

创建完整文件 `src/http/api-exception.filter.ts`：

```ts
import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import {
  DomainError,
  ListingNotFoundError,
  VersionConflictError,
} from "../listings/listing.errors.js";
import type { ValidationDetail } from "./validation-details.js";

type ApiErrorBody = {
  code: string;
  message: string;
  requestId: string;
  details?: readonly ValidationDetail[];
};

type RequestWithId = Request & { requestId?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function defaultCode(status: number): string {
  if (status >= 500) return "INTERNAL";
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 405) return "METHOD_NOT_ALLOWED";
  if (status === 409) return "CONFLICT";
  return "HTTP_ERROR";
}

function defaultMessage(status: number): string {
  if (status >= 500) return "服务器内部错误";
  if (status === 400) return "请求不符合接口规则";
  if (status === 401) return "请先登录";
  if (status === 403) return "没有权限执行此操作";
  if (status === 404) return "接口不存在";
  if (status === 405) return "请求方法不受支持";
  if (status === 409) return "当前状态与提交冲突";
  return "请求失败";
}

function mapDomainError(error: DomainError) {
  if (error instanceof ListingNotFoundError) {
    return { status: 404, code: error.code, message: error.message };
  }
  if (error instanceof VersionConflictError) {
    return { status: 409, code: error.code, message: error.message };
  }
  return { status: 500, code: "INTERNAL", message: "服务器内部错误" };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<Response>();
    const requestId = request.requestId ?? randomUUID();

    let status = 500;
    let body: ApiErrorBody = {
      code: "INTERNAL",
      message: "服务器内部错误",
      requestId,
    };

    if (error instanceof DomainError) {
      const mapped = mapDomainError(error);
      status = mapped.status;
      body = { code: mapped.code, message: mapped.message, requestId };
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      const payload: unknown = error.getResponse();
      const hasExplicitContract =
        isRecord(payload) &&
        typeof payload.code === "string" &&
        typeof payload.message === "string";
      body = {
        code: hasExplicitContract ? payload.code : defaultCode(status),
        message: hasExplicitContract ? payload.message : defaultMessage(status),
        requestId,
      };
      if (hasExplicitContract && Array.isArray(payload.details)) {
        body.details = payload.details as ValidationDetail[];
      }
    } else {
      console.error(JSON.stringify({
        requestId,
        event: "unhandled_request_error",
        errorName: error instanceof Error ? error.name : "UnknownThrownValue",
      }));
    }

    response.setHeader("x-request-id", requestId);
    response.status(status).json(body);
  }
}
```

`details as ValidationDetail[]` 只接收本应用 exception factory 生成的内部 payload；若错误来自远端服务，
必须像外部 JSON 一样从 `unknown` 完整解析，不能照搬这个断言。

### 7.2 让 repository 支持按 ID 读取

在 `ListingsRepository` 增加：

```ts
findById(id: string): Listing | undefined;
```

在 `MemoryListingsRepository` 增加：

```ts
findById(id: string): Listing | undefined {
  return this.items.find((listing) => listing.id === id);
}
```

在 `ListingsService` 增加：

```ts
get(id: string): Listing {
  const listing = this.repository.findById(id);
  if (listing === undefined) {
    throw new ListingNotFoundError(id);
  }
  return listing;
}
```

并以值导入 `ListingNotFoundError`。service 只表达商品不存在，不决定 404 JSON。

在 `ListingsController` 增加：

```ts
@Get(":id")
get(@Param("id", ParseListingIdPipe) id: string) {
  return this.listings.get(id);
}
```

同时从 `@nestjs/common` 导入 `Param`，从 HTTP 文件以值导入 `ParseListingIdPipe`。

### 7.3 更新应用入口

用下面完整文件替换 `src/main.ts`：

```ts
import "reflect-metadata";
import {
  BadRequestException,
  ValidationPipe,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module.js";
import { ApiExceptionFilter } from "./http/api-exception.filter.js";
import { flattenValidationErrors } from "./http/validation-details.js";

type RequestWithId = Request & { requestId?: string };

const app = await NestFactory.create(AppModule);
app.setGlobalPrefix("api/v1");

app.use((
  request: RequestWithId,
  response: Response,
  next: NextFunction,
) => {
  const requestId = randomUUID();
  request.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  next();
});

app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: {
    enableImplicitConversion: false,
  },
  validationError: {
    target: false,
    value: false,
  },
  exceptionFactory: (errors) =>
    new BadRequestException({
      code: "VALIDATION",
      message: "请求不符合接口规则",
      details: flattenValidationErrors(errors),
    }),
}));

app.useGlobalFilters(new ApiExceptionFilter());
app.enableShutdownHooks();
await app.listen(3000, "127.0.0.1");
console.log("listening http://127.0.0.1:3000/api/v1");
```

请求 ID 在 filter 前生成。未知错误客户端只看到 INTERNAL；服务端安全日志仍能按相同 ID 关联。

### 7.4 可观察请求

```bash
pnpm build
pnpm start
```

另一个终端：

```bash
curl -i http://127.0.0.1:3000/api/v1/listings/not-a-uuid

curl -i \
  http://127.0.0.1:3000/api/v1/listings/20000000-0000-4000-8000-000000000002

curl -i -X POST http://127.0.0.1:3000/api/v1/listings \
  -H 'Content-Type: application/json' \
  --data '{"title":"书架","description":"","priceCents":"8000"}'
```

预期：

- 非 UUID 为 400 `INVALID_LISTING_ID`；
- 合法但不存在 UUID 为 404 `LISTING_NOT_FOUND`；
- 字符串金额为 400 `VALIDATION`，details 含 `priceCents` 和 `isInt`；
- 每个错误的 `X-Request-Id` 与正文 `requestId` 相同；
- 响应不含原始正文、target、value、stack 或绝对路径。

实际随机 ID 和 details 顺序以运行结果为准；测试宜按字段查找，不断言整段随机 JSON。

## 8. 常见错误与排查路径

### 8.1 明确错误：catch 后一律返回 200

错误写法：

```ts
try {
  return this.listings.get(id);
} catch (error) {
  return { ok: false, message: String(error) };
}
```

| 项目 | 记录 |
| --- | --- |
| 现象 | 不存在商品的 HTTP 状态仍为 200 |
| 证据 | curl/Network 显示 200，监控无法统计失败 |
| 原因 | controller 吞掉异常，用正文布尔值重造协议 |
| 修复 | 让 domain error 流向全局 filter，映射为 404/409 |
| 复验 | 缺失 UUID 为 404，正常商品仍为 200 |

### 8.2 所有错误都映射 INTERNAL

**现象：** 坏 UUID、无商品和版本冲突都返回 500。
**证据：** 客户端无法区分修正输入、刷新数据或稍后重试。
**原因：** filter 没有先分类 domain/HttpException。
**修复：** 按稳定类型和 code 映射，未知值才 500。
**复验：** 400/404/409 的 filter 测试独立通过。

### 8.3 把 `error.message` 直接回给客户端

**现象：** 500 正文可能出现 SQL、包路径或内部对象。
**证据：** 故障注入返回原始 message。
**原因：** 混淆内部诊断与外部恢复信息。
**修复：** 未知错误外部固定 INTERNAL，内部按 requestId 记录安全字段。
**复验：** 客户端无堆栈，服务端仍能定位同一 requestId。

### 8.4 filter 自己生成第二个 requestId

**现象：** 响应头、正文和前置日志 ID 不一致。
**原因：** 每层各自调用 randomUUID。
**修复：** 入口生成一次并放入 request context；filter 只在缺失时兜底。
**复验：** 头体与日志三处相同。

### 8.5 通过 details 回显原值

**现象：** 错误体包含密码、长描述或整个目标对象。
**原因：** 使用 ValidationError 的 `value/target`。
**修复：** 全局关闭回显，flatten 只取 property/constraint keys。
**复验：** 故障正文中搜索原始敏感字符串结果为空。

## 9. 课后题

**问题 1：为什么 `ListingNotFoundError` 不直接继承 `NotFoundException`？**
参考答案：商品不存在是领域事实；HTTP 只是一个适配器。解耦后 service 可用于队列、命令行和不同协议。

**问题 2：合法 UUID 为什么仍可能返回 404？**
参考答案：pipe 只证明格式；repository 查询才判断该 ID 是否对应资源。

**问题 3：requestId 是否可以作为会话 ID？**
参考答案：不能。它只关联一次请求/日志，不证明用户身份，也不应授权资源。

**问题 4：为什么 409 不等于 400？**
参考答案：请求形状可能完全合法，但基于过期 version 或已被预约的当前状态无法执行，客户端应刷新/解决冲突。

## 10. 实践练习

### 基础：稳定 405 错误

对已知 listings 路径使用不支持方法，映射为 405 `METHOD_NOT_ALLOWED` 并保留 `Allow`。

可判定标准：

- 不支持方法不是 500；
- code/message/requestId 形状不变；
- `Allow` 与实际 controller 方法一致；
- 正常 GET/POST 不回归。

### 进阶：为 filter 写协议级测试

构造 domain error、BadRequestException 与普通 Error，驱动 filter 或通过 Nest 测试应用发请求。

可判定标准：

- 404、409、400、500 分别断言；
- requestId 头体一致；
- 500 不含原始 message/stack；
- details 只在 validation 分支存在；
- mock/fake host 明确标注，不称为真实网络。

### 故障注入：测试专用未知异常

只在本地测试 module 中增加抛 `new Error("database password=secret")` 的 handler，不能保留在正式 controller。

可判定标准：

1. 客户端得到 500 INTERNAL；
2. 客户端正文不含故障 message；
3. 服务端日志含 requestId 和 `Error` 类别，不含伪造密码；
4. 删除测试端点后重跑正常 API；
5. 记录现象、证据、原因、修复与复验。

## 11. 阶段验收

- [ ] 非 UUID 在 repository 前被 pipe 拒绝为 400。
- [ ] 合法缺失 UUID 由 service/domain error 变为 404。
- [ ] DTO 错误为 400 VALIDATION，details 无 target/value。
- [ ] `VersionConflictError` 有明确 409 映射，但未虚构并发实现。
- [ ] 401 与 403 的语义已说明，当前无认证时不伪造这两类证据。
- [ ] requestId 在入口生成，响应头与正文一致。
- [ ] 500 只返回安全通用消息，服务端有可关联日志。
- [ ] controller 不 catch 后返回 200，service 不导入 HTTP response。
- [ ] 内存仓储重启丢数据，仍明确标注。
- [ ] `pnpm build` 与 curl 运行证据分别记录。

## 12. 常见问题

**可以直接使用 Nest 默认错误形状吗？**
小型内部实验可以，但跨前后端契约应固定 code/message/requestId，并在升级框架时防止默认形状漂移。

**所有错误都需要 details 吗？**
不需要。只有用户可修正、且不会泄密的字段错误适合 details；权限和内部错误通常不展开。

**filter 能代替日志系统吗？**
不能。它只是映射和最小安全记录；结构化日志、指标与 trace 在第 9 章完成。

**为什么不接受客户端传来的 requestId？**
生产可在校验长度/字符后接续可信代理 ID；本课为避免注入和混淆始终生成服务端 ID。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [NestJS Pipes](https://docs.nestjs.com/pipes)：参数转换与校验。
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)：异常到传输协议的映射。
- [NestJS Guards](https://docs.nestjs.com/guards)：与认证/授权职责的区别。
- [NestJS Interceptors](https://docs.nestjs.com/interceptors)：handler 前后横切边界。
- [NestJS Validation](https://docs.nestjs.com/techniques/validation)：exception factory 与错误信息。
- [MDN HTTP Status](https://developer.mozilla.org/docs/Web/HTTP/Status)：400/401/403/404/409/500 语义。
- [Node.js Crypto UUID](https://nodejs.org/api/crypto.html#cryptorandomuuidoptions)：requestId 生成。

## 我现在能做到什么

我能让 pipe、DTO 校验、领域错误和 exception filter 各守一层职责，把 400/404/409/500 映射成稳定、
可关联且不泄密的错误协议，并明确哪些身份、授权和持久化能力仍未实现。

## 单元导航

[返回本章 Hub](../02-nest-api-validation.md) ·
[上一课：DTO 转换与运行时校验](02-dto-transformation-validation.md) ·
[下一章：SQL 数据建模](../03-sql-modeling.md)
