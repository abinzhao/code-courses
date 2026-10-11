# OpenAPI 生成与契约验证：让文档、实现和客户端拒绝漂移

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个 OpenAPI 3.0.3 教学子集、零依赖结构检查器、生成/校验/diff/响应验证门禁 |
| 练习位置 | 读者自己的 `market-backend-lab/openapi/` 与 `scripts/` |
| 运行条件 | 最小案例仅需 Node.js 24；生成器需项目锁定的 Nest/OpenAPI 工具 |
| 核心命令 | `node scripts/check-openapi.mjs openapi/market.openapi.json` |
| 成功证据 | 规范可解析、关键路径/状态/schema 存在；生成到临时文件后标准校验和稳定 diff 均通过 |
| 失败证据 | DTO/状态/schema 单边变化使 diff 或真实响应契约测试失败 |
| 环境标签 | 最小 JSON 是 **STATIC 教学子集**，不声称覆盖完整 API |

## 1. 任务背景

邻里集市后端把 `PATCH /listings/{id}` 的成功状态从 200 改成 204，OpenAPI 仍写 200；前端生成
客户端继续尝试解析 JSON，直到运行时才发现空正文。另一种漂移更隐蔽：DTO 新增 `version`
必填，规范没有更新，客户端编译正常却持续收到 400。

OpenAPI 不是一张 Swagger UI 截图，而是机器可读协议契约。它至少需要四个独立门：

```text
生成或维护规范
  -> OpenAPI 标准校验
  -> 与已审查规范做稳定 diff
  -> 用真实 HTTP 响应做契约验证
```

JSON 能 `JSON.parse` 只证明语法正确；生成客户端能编译只证明类型生成和调用代码兼容；二者都不
证明对象授权、数据库事务或实际响应符合规范。

## 2. 学习目标

完成本课后，你能够：

1. 比较 code-first、spec-first 和混合契约治理；
2. 在 OpenAPI 3.0.3 中描述 Cookie session、CSRF header、整数分、UTC 和统一错误；
3. 为成功与 400/401/403/404/409/500 写响应 schema 和例子；
4. 让生成器无监听、无真实数据库副作用地输出确定规范；
5. 把标准 lint、稳定 diff 和真实响应检查分成独立门；
6. 发现 DTO runtime validation 与 OpenAPI schema 的差异；
7. 说明 generated client 的类型为何不能替代运行时数据校验；
8. 在契约变化时区分兼容与破坏性影响。

## 3. 预备知识

- 完成[DTO 转换与运行时验证](../02-nest-api-validation/02-dto-transformation-validation.md)；
- 完成[Pipe、Filter 与错误契约](../02-nest-api-validation/03-pipes-filters-error-contract.md)；
- 完成[单元、HTTP 与真实 PostgreSQL 测试](01-unit-http-real-postgres-tests.md)；
- 理解统一 API 前缀 `/api/v1` 和错误 `{code,message,requestId}`。

创建个人目录：

```bash
mkdir -p openapi scripts
node --version
```

本卷基线使用 OpenAPI `3.0.3`。若项目升级到 3.1 或更高版本，要按对应规范和工具兼容性重新
验证，不能只改 `openapi` 字符串。

## 4. 核心理论

### 4.1 Code-first 和 spec-first 都需要漂移门

**Code-first** 从 Controller/DTO 装饰器生成规范：

- 优点：路径和代码接近，重构时容易同步；
- 风险：TypeScript 类型在运行时擦除，装饰器可能漏字段/状态；class-validator 规则不一定自动
  完整映射；启动生成器可能误连数据库。

**Spec-first** 先审查 OpenAPI，再生成 server/client 类型：

- 优点：协议变化先被看见，跨团队契约清晰；
- 风险：实现仍可能不遵守；生成代码和自定义业务校验可能分叉。

**混合**可从 code-first 生成候选规范，提交一份稳定审查快照，再用真实响应验证。无论哪种，
都必须指定唯一受审契约、生成命令和漂移门。

### 4.2 HTTP 契约不只是 200 schema

每个 operation 至少核对：

- 唯一稳定 `operationId`；
- path/query/header/cookie 参数及 required/default/limit；
- request content type 和 schema；
- 成功状态与正文；
- 400 输入、401 身份、403 CSRF/对象权限、404 不存在、409 version/状态冲突；
- 统一错误 schema 和 request ID header；
- security requirements；
- 幂等语义、分页和 cursor（描述/扩展文档）。

不能把所有错误只写 `"default": {"description":"error"}`，否则客户端无法稳定处理 409 与 401。

### 4.3 整数分和 UTC 要进入 schema

`priceCents`：

```yaml
type: integer
format: int64
minimum: 0
maximum: 100000000
```

业务上仍要求 JavaScript 安全整数和当前产品上限。OpenAPI `integer` 不会自动让 JSON parser
拒绝不安全数字，服务端 DTO 和客户端运行时边界仍要验证。

`createdAt`：

```yaml
type: string
format: date-time
pattern: "Z$"
```

`date-time` 接受符合规范的偏移时间；项目契约要求 UTC `Z`，因此增加 pattern 和例子。完整
日历有效性仍由 runtime parser 验证，pattern 不是日期解析器。

### 4.4 Cookie session 与 CSRF 是两个协议元素

Cookie session 可定义为：

```yaml
securitySchemes:
  cookieSession:
    type: apiKey
    in: cookie
    name: sid
```

写操作的 `security: [{cookieSession: []}]` 表示需要会话。`X-CSRF-Token` 是额外 required
header 参数，并配合 Origin 检查；它不能因为存在 Cookie security scheme 就省略。规范不保存
真实 sid 或 csrfToken example。

### 4.5 `additionalProperties: false` 必须与 runtime 一致

如果 DTO 的 ValidationPipe 使用 whitelist + forbidNonWhitelisted，OpenAPI 请求 schema 应写
`additionalProperties: false`。如果服务端只静默删除未知字段，规范却声明拒绝，仍是行为漂移。
默认值、字符串 trim、数字转换和空字符串处理也要通过 HTTP 测试核对，不能只看 schema。

### 4.6 生成器必须确定且无副作用

规范生成不应：

- 监听端口；
- 连接生产数据库；
- 执行迁移；
- 读取真实秘密；
- 写随机 request ID、当前时间或环境域名；
- 直接覆盖已审查文件后再比较自己。

生成到 `/tmp`，标准校验后 canonicalize，再与仓库快照 diff。只有评审确认协议变化后才更新
快照。

### 4.7 标准校验、结构断言和响应验证职责不同

| 门 | 发现什么 | 发现不了什么 |
| --- | --- | --- |
| JSON parse | 语法错误 | OpenAPI 引用和语义 |
| 本课零依赖结构断言 | 项目必须路径/状态/字段缺失 | 完整 OpenAPI 标准 |
| OpenAPI validator/linter | `$ref`、operation、schema 等规范问题 | 实现运行响应 |
| 稳定 diff | 生成结果与审查快照变化 | 哪一边业务正确 |
| 真实响应 validator | 状态/headers/body 与规范不符 | 深层授权和事务不变量 |
| 业务测试 | owner/并发/状态变化 | 规范是否完整 |

所有门都需要，不能用一个“大绿灯”隐藏它具体执行了什么。

### 4.8 Generated client 是消费者，不是信任边界

生成客户端可提供路径、参数和 TypeScript 类型，减少手写漂移。但网络 JSON 在运行时仍是
`unknown`：服务端故障、旧版本代理或错误缓存都可能返回不合规数据。关键客户端可以启用响应
验证，至少在测试中对生成客户端执行真实 contract suite。

生成客户端版本应绑定规范摘要或 API version；规范破坏性变化要有迁移和发布顺序，不能只在
后端合并后等待前端编译失败。

## 5. 元素、属性、API 或配置清单

| OpenAPI 项目 | 用途 | 边界 |
| --- | --- | --- |
| `openapi: 3.0.3` | 固定规范语义 | 工具必须支持同版本 |
| `servers` | API 前缀 `/api/v1` | 环境域名不硬编码秘密 |
| `operationId` | 生成稳定客户端方法 | 全规范唯一 |
| `security` | Cookie session 要求 | CSRF/对象授权另描述和测试 |
| `parameters` | path/query/header 契约 | 转换和 trim 仍需 runtime 测试 |
| `requestBody` | JSON schema 和 required | content type 也要验证 |
| `responses` | 每个状态/正文/头 | 不用 default 掩盖业务错误 |
| `components.schemas` | 复用 Listing/Error | 变更会影响多个 operation |
| `additionalProperties` | 未知字段行为 | 必须与 ValidationPipe 一致 |
| `example/examples` | 可读样例 | 不是真实运行证据，不放秘密 |
| `$ref` | 复用 schema | 标准 validator 检查引用 |
| `readOnly/writeOnly` | 区分输入输出字段 | 工具支持需验证 |

## 6. 最小可运行案例

### 6.1 创建 STATIC OpenAPI 子集

创建完整文件 `openapi/market.openapi.json`：

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "邻里集市教学契约子集",
    "version": "1.0.0"
  },
  "servers": [
    { "url": "/api/v1" }
  ],
  "paths": {
    "/listings/{id}": {
      "patch": {
        "operationId": "updateListing",
        "security": [
          { "cookieSession": [] }
        ],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string", "format": "uuid" }
          },
          {
            "name": "X-CSRF-Token",
            "in": "header",
            "required": true,
            "schema": {
              "type": "string",
              "minLength": 64,
              "maxLength": 64,
              "pattern": "^[a-f0-9]{64}$"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "$ref": "#/components/schemas/UpdateListing" }
            }
          }
        },
        "responses": {
          "200": {
            "description": "本人商品更新成功",
            "headers": {
              "X-Request-ID": {
                "required": true,
                "schema": { "type": "string" }
              }
            },
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Listing" }
              }
            }
          },
          "400": { "$ref": "#/components/responses/ErrorResponse" },
          "401": { "$ref": "#/components/responses/ErrorResponse" },
          "403": { "$ref": "#/components/responses/ErrorResponse" },
          "404": { "$ref": "#/components/responses/ErrorResponse" },
          "409": { "$ref": "#/components/responses/ErrorResponse" },
          "500": { "$ref": "#/components/responses/ErrorResponse" }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "cookieSession": {
        "type": "apiKey",
        "in": "cookie",
        "name": "sid"
      }
    },
    "responses": {
      "ErrorResponse": {
        "description": "统一错误响应",
        "headers": {
          "X-Request-ID": {
            "required": true,
            "schema": { "type": "string" }
          }
        },
        "content": {
          "application/json": {
            "schema": { "$ref": "#/components/schemas/Error" }
          }
        }
      }
    },
    "schemas": {
      "UpdateListing": {
        "type": "object",
        "additionalProperties": false,
        "required": ["title", "description", "priceCents", "version"],
        "properties": {
          "title": {
            "type": "string",
            "minLength": 1,
            "maxLength": 100,
            "pattern": "\\S"
          },
          "description": { "type": "string", "maxLength": 2000 },
          "priceCents": {
            "type": "integer",
            "format": "int64",
            "minimum": 0,
            "maximum": 100000000
          },
          "version": { "type": "integer", "minimum": 1 }
        }
      },
      "Listing": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "id",
          "title",
          "description",
          "priceCents",
          "status",
          "ownerId",
          "version",
          "createdAt"
        ],
        "properties": {
          "id": { "type": "string", "format": "uuid" },
          "title": { "type": "string", "minLength": 1, "maxLength": 100 },
          "description": { "type": "string", "maxLength": 2000 },
          "priceCents": {
            "type": "integer",
            "format": "int64",
            "minimum": 0,
            "maximum": 100000000
          },
          "status": {
            "type": "string",
            "enum": ["available", "reserved", "sold"]
          },
          "ownerId": { "type": "string", "format": "uuid" },
          "version": { "type": "integer", "minimum": 1 },
          "createdAt": {
            "type": "string",
            "format": "date-time",
            "pattern": "Z$",
            "example": "2026-10-11T08:00:00.000Z"
          }
        }
      },
      "Error": {
        "type": "object",
        "additionalProperties": false,
        "required": ["code", "message", "requestId"],
        "properties": {
          "code": { "type": "string" },
          "message": { "type": "string" },
          "requestId": { "type": "string" }
        }
      }
    }
  }
}
```

这是单路径教学子集，不包含注册、登录、列表、收藏、预约、健康检查或 outbox 运维接口。

### 6.2 创建零依赖项目断言

创建完整文件 `scripts/check-openapi.mjs`：

```js
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) throw new Error("usage: node scripts/check-openapi.mjs FILE");
const document = JSON.parse(await readFile(file, "utf8"));

assert.equal(document.openapi, "3.0.3");
assert.equal(document.servers?.[0]?.url, "/api/v1");

const patch = document.paths?.["/listings/{id}"]?.patch;
assert.equal(patch.operationId, "updateListing");
assert.deepEqual(Object.keys(patch.responses).sort(), [
  "200", "400", "401", "403", "404", "409", "500",
]);
assert.deepEqual(patch.security, [{ cookieSession: [] }]);
assert.equal(
  patch.parameters.some(
    (parameter) =>
      parameter.in === "header" &&
      parameter.name === "X-CSRF-Token" &&
      parameter.required === true &&
      parameter.schema?.minLength === 64 &&
      parameter.schema?.maxLength === 64 &&
      parameter.schema?.pattern === "^[a-f0-9]{64}$",
  ),
  true,
);

const update = document.components.schemas.UpdateListing;
assert.equal(update.additionalProperties, false);
assert.deepEqual(update.required.sort(), [
  "description", "priceCents", "title", "version",
]);
assert.equal(update.properties.priceCents.type, "integer");
assert.equal(update.properties.priceCents.minimum, 0);
assert.equal(update.properties.title.pattern, "\\S");
assert.equal(document.components.schemas.Listing.additionalProperties, false);
assert.equal(document.components.schemas.Listing.properties.createdAt.pattern, "Z$");
assert.deepEqual(document.components.schemas.Error.required.sort(), [
  "code", "message", "requestId",
]);

console.log(JSON.stringify({
  openapi: document.openapi,
  operations: [patch.operationId],
  checkedStatuses: Object.keys(patch.responses).sort(),
  label: "STATIC_SUBSET_STRUCTURE_ONLY",
}));
```

运行：

```bash
node scripts/check-openapi.mjs openapi/market.openapi.json
```

预期输出 `STATIC_SUBSET_STRUCTURE_ONLY` 和七个状态并退出 0。该脚本不是 OpenAPI 标准 validator；
它只锁定本项目教学子集的关键结构。

## 7. 邻里集市集成案例

### 7.1 完整规范文件责任

综合项目建议：

```text
apps/api/
  src/openapi/generate-openapi.ts
  openapi/openapi.json
scripts/
  canonicalize-openapi.mjs
  check-openapi-contract.mjs
```

若使用 `@nestjs/swagger`，先选择与 NestJS 12.1.2 兼容并在项目锁文件固定的版本，再记录：

```bash
pnpm list @nestjs/core @nestjs/swagger
```

不能从教程猜补丁版本并宣称兼容。生成入口创建应用 context/document，但不监听端口、不执行迁移、
不需要真实 PostgreSQL。若 module 初始化会连接数据库，应拆出 contract module 或提供明确的
无副作用 generation mode，而不是把生产连接串注入 CI。

### 7.2 生成到临时位置

```bash
pnpm openapi:generate --output /tmp/market-openapi.generated.json
pnpm openapi:lint /tmp/market-openapi.generated.json
node scripts/canonicalize-openapi.mjs \
  /tmp/market-openapi.generated.json \
  /tmp/market-openapi.canonical.json
diff -u apps/api/openapi/openapi.json /tmp/market-openapi.canonical.json
```

脚本名由项目清单固定。顺序必须是“临时生成 -> 标准校验 -> canonicalize -> diff”，不能先覆盖
tracked 文件再比较。Canonicalize 只稳定对象 key 和可预测数组，不应擅自排序有语义顺序的
security/parameters。

标准 lint 工具使用项目锁定的确切版本，例如团队选定的 OpenAPI validator/linter；记录命令和
版本。零依赖 checker 不能替代它。

### 7.3 DTO 与规范对账

为每个 operation 建表：

| 实现事实 | OpenAPI 位置 | HTTP 证据 |
| --- | --- | --- |
| whitelist + forbid unknown | request schema `additionalProperties:false` | 额外 `role` 返回 400 |
| `priceCents` 非负整数分 | `integer/minimum/maximum` | 字符串/小数/负数返回 400 |
| owner 才能更新 | 403 response + description | buyer 403 且 DB 不变 |
| `version` 乐观锁 | required/minimum + 409 | stale version 返回 VERSION_CONFLICT |
| UTC 输出 | `date-time` + `Z$` | 实际 createdAt 以 Z 结尾并规范 |
| Cookie + CSRF | security + header parameter | 缺 Cookie 401、缺 CSRF 403 |

生成器漏出的 schema 必须补装饰器或显式 schema；不能为了让 diff 绿删除 runtime 规则。

### 7.4 真实响应契约验证

使用支持 OpenAPI 3.0.3 的锁定 response validator，把第 01 课的真实 HTTP 响应交给它：

1. 选择 operation（method + path template）；
2. 验证 status 在规范中；
3. 验证 `Content-Type`、`X-Request-ID`；
4. 验证响应 body schema；
5. 再运行独立业务断言和数据库不变量。

至少覆盖：

- owner 200 Listing；
- unknown field 400 Error；
- 缺 Cookie 401；
- buyer 403 且 DB 不变；
- missing 404；
- stale version 409；
- 受控内部错误 500，正文无 stack/SQL。

Validator 通过不替代 owner/事务断言；它只证明形状与规范一致。

### 7.5 Generated client 验收

在临时目录从 canonical spec 生成客户端并执行：

```text
生成 -> TypeScript 编译 -> 对测试 API 发请求 -> 验证 200/409/401
```

客户端必须允许同源 Cookie 凭据并让调用者提供 CSRF token；不能把 sid 作为普通 JS 字段暴露。
服务端 response 在进入关键领域前仍做 runtime parser，尤其检查整数分、UTC 和错误 union。

### 7.6 兼容性判断

通常破坏性变化：

- 删除 operation/状态/schema 字段；
- 把可选字段改必填；
- 收紧枚举、范围或字符串长度；
- 改成功状态/正文；
- 改认证方式。

通常兼容但仍需审查：

- 增加可选响应字段（严格客户端可能仍受影响）；
- 新增 endpoint；
- 增加新的错误 code（客户端 default 分支要可恢复）。

API 前缀/version 策略和发布顺序应在变更前决定，不依赖生成工具自动判断一切。

## 8. 常见错误与排查路径

### 8.1 明确错误示例：DTO 改了但规范没更新

- **现象**：生成客户端不传 `version`，服务器持续返回 400。
- **证据**：runtime DTO required 包含 version，checked-in OpenAPI required 缺失，生成 diff 有变化。
- **原因**：实现和契约快照只有一边更新，CI 没运行生成/diff。
- **修复**：补齐 DTO 的 OpenAPI 元数据或 spec-first 定义，更新真实 HTTP 用例并评审协议影响。
- **复验**：临时生成与快照无 diff；客户端重新生成编译；缺 version 400、合法 version 200、旧 version 409。

### 8.2 直接覆盖后 diff 永远为空

- **现象**：协议变化没有审查记录，CI 总是绿。
- **证据**：脚本先写 `apps/api/openapi/openapi.json`，随后与自身比较。
- **原因**：候选产物和受审快照没有分离。
- **修复**：生成到 `/tmp`，校验/canonicalize 后 diff；只有显式更新命令才覆盖快照。
- **复验**：临时删一个 409 response，diff 门非零；恢复后转绿。

### 8.3 JSON parse 成功就宣布规范有效

- **现象**：不存在的 `$ref` 或重复 operationId 进入仓库。
- **证据**：JSON.parse 绿，标准 validator 红。
- **原因**：语法检查被误当 OpenAPI 语义检查。
- **修复**：保留 parse/项目断言，并增加锁定标准 validator。
- **复验**：破坏 `$ref` 时 lint 失败，修复后完整门通过。

### 8.4 Spec 通过但实现返回额外秘密

- **现象**：响应含 `passwordHash`，客户端忽略后测试仍绿。
- **证据**：validator 配置允许额外字段，业务测试没检查禁止字段。
- **原因**：response schema 过宽或 validator 模式不严格。
- **修复**：敏感 response schema 使用 `additionalProperties:false`/显式 DTO，并增加禁止字段断言。
- **复验**：注入敏感字段使契约测试失败，正常公开 user 通过。

### 8.5 Generator 启动时误连生产

- **现象**：CI 生成文档超时或访问真实数据库。
- **证据**：生成日志出现 pool connection/migration。
- **原因**：把完整 runtime bootstrap 直接用于 contract generation。
- **修复**：拆无副作用 module/bootstrap，配置缺失时不 fallback 到生产。
- **复验**：无 DATABASE_URL 的隔离环境仍能生成规范，且没有监听端口。

## 9. 课后题

1. **OpenAPI validator 通过能证明 buyer 不能编辑 seller 商品吗？**
   答案：不能，它验证协议结构；对象授权需要业务和持久状态测试。
2. **为什么生成器要输出到 `/tmp`？**
   答案：把候选和已审查快照分开，diff 才能发现未确认变化。
3. **`format: date-time` 为什么还不能完全表达项目 UTC contract？**
   答案：date-time 可含偏移；项目要求规范 `Z`，还需 pattern、例子和 runtime 日期校验。
4. **生成 TypeScript 客户端后为什么仍需 runtime parser？**
   答案：类型在运行时不存在，网络/缓存/旧服务仍可能返回不合规 JSON。

## 10. 实践练习

### 基础：补充 409 example

为 409 增加 `VERSION_CONFLICT` Error example。可判定标准：不含真实 requestId/秘密；仍引用统一
Error schema；零依赖 checker 和标准 lint 均通过。

### 进阶：列表 Keyset contract

增加 `/listing-feed`、`after`、`limit`、`nextCursor`。可判定标准：limit 范围 1..100；cursor
是字符串且说明非授权载体；items 的 priceCents/createdAt 复用正确 schema；无伪造 total。

### 故障注入：删除规范中的 403

临时删除 updateListing 403。可判定标准：项目 checker 或 coverage 对账先失败；恢复后生成 diff、
lint、真实 buyer 403 response validation 和 DB 不变断言都通过。

## 11. 阶段验收

- [ ] OpenAPI 3.0.3 文件可解析且通过项目锁定标准 validator；
- [ ] operationId 唯一，路径/参数/request/response/security 完整；
- [ ] priceCents、UTC、Cookie、CSRF、Error 和 409 被明确描述；
- [ ] 生成器无监听、迁移、生产连接和随机输出；
- [ ] 候选生成到临时文件，canonicalize 后与受审快照 diff；
- [ ] 真实 200/400/401/403/404/409/500 响应经过 contract validation；
- [ ] 业务授权和数据库不变量仍有独立断言；
- [ ] generated client 编译和运行时响应边界均验证；
- [ ] STATIC 子集没有被报告为完整 API 覆盖。

## 12. 常见问题

**是否必须提交生成的 OpenAPI？**
如果它是跨团队受审契约和客户端输入，提交稳定快照通常有价值；也可发布制品，但必须能绑定
提交、审查 diff 和复现生成。

**Swagger UI 能作为验收吗？**
它适合探索和人工阅读，不替代标准 lint、响应 contract、授权和数据库测试。

**能否从 class-validator 自动得到全部 schema？**
不要假设。转换、条件校验、自定义 validator、默认值和 runtime pipe 可能无法完整推导，需逐项
对账和 HTTP 测试。

**规范 example 可以放真实响应吗？**
不能直接复制真实用户数据或 Token。使用明显虚构 ID、整数分和 UTC 时间，并经过敏感字段审查。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [OpenAPI Specification 3.0.3](https://spec.openapis.org/oas/v3.0.3.html)
- [OpenAPI Initiative](https://www.openapis.org/)
- [NestJS OpenAPI Introduction](https://docs.nestjs.com/openapi/introduction)
- [NestJS Types and Parameters](https://docs.nestjs.com/openapi/types-and-parameters)
- [OWASP API Security Top 10](https://owasp.org/API-Security/)

## 我现在能做到什么

我能把 OpenAPI 当成受审机器契约，通过无副作用生成、标准校验、稳定 diff、真实响应验证和业务
断言共同阻止 DTO、实现、规范与 generated client 漂移。

## 单元导航

- 章节目录：[09 测试、OpenAPI 与可观测性](../README.md#09-测试openapi-与可观测性)
- 上一课：[单元、HTTP 与真实 PostgreSQL 测试](01-unit-http-real-postgres-tests.md)
- 下一课：[结构化日志、指标与 Trace](03-structured-logs-metrics-traces.md)
