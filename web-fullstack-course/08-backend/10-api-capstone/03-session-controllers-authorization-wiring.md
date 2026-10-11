# Session、Controller 与授权接线：把身份、对象权限和错误边界分开

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 解释并验收密码边界、数据库 session、CSRF、controller、对象授权、RBAC、错误和脱敏日志 |
| 前置 | 已完成[第 01 课](01-workspace-config-migration-bootstrap.md)唯一源码与[第 02 课](02-domain-repositories-transaction-services.md)事务设计 |
| 建议投入 | 3 小时阅读与请求实验，1 小时授权/日志故障注入 |
| 完整源码 owner | 本课拥有 `0` 个完整项目文件；所有片段均引用第 01 课 |
| 认证主线 | 同源浏览器、opaque HttpOnly Cookie、数据库 session、8 小时有效期 |
| CSRF 主线 | 写请求同时校验精确 `Origin` 和 synchronizer token；SameSite 只是额外一层 |
| 授权主线 | 先认证，再做对象 owner 或 admin 角色检查；body 不提供身份和角色 |
| 日志边界 | 允许 requestId、method、route、status、duration、异常类型和 SQLSTATE；禁止秘密和正文 |

本课只解释如何接线和验证。项目文件仍以第 01 课 marker 为唯一事实源；不要把本课局部片段
另存为第二版 `auth.ts`、`controller.ts` 或 `errors.ts`。

## 1. 任务背景

“登录成功”只证明某个凭据建立了身份，不证明这个身份能修改任意商品。Cookie 会被浏览器自动
携带，也不等于写请求可信；跨站页面可能诱导浏览器发送 Cookie。错误处理如果直接返回数据库
message 或日志记录完整 headers，又会把密码、session、CSRF token 和连接信息带出边界。

本章把安全决策拆为五层：

```text
CredentialsDto + scrypt
  -> opaque session token（浏览器）/ token hash（数据库）
  -> SessionGuard 解析身份
  -> Origin + CSRF 保护写请求
  -> service owner / controller admin 授权
  -> ApiFilter 稳定错误 + 脱敏结构化日志
```

任何前端隐藏按钮、传入 `ownerId`、传入 `role: "admin"` 或成功拿到 Cookie 的事实，都不能跳过
后端授权。

## 2. 学习目标

完成本课后，你能够：

1. 区分密码、密码散列、session 原始 token、token hash 和 CSRF token；
2. 用固定成本假计算降低登录账号枚举的时序差异；
3. 只把 opaque session token 放入 HttpOnly Cookie；
4. 在数据库中只保存 token hash、用户、CSRF token 和过期时间；
5. 解释 `HttpOnly`、`Secure`、`SameSite`、`Path` 各自职责；
6. 对写请求同时校验精确 Origin 和 CSRF token；
7. 区分 401 未认证、403 已认证但无权、404 不存在和 409 状态冲突；
8. 在 service 中基于持久化 owner 做对象授权；
9. 在 controller 中基于 session 角色做管理员 RBAC；
10. 输出稳定错误 DTO，并让日志可关联但不泄露秘密。

## 3. 预备知识

在唯一源码中定位：

| 路径 | 关键入口 | 本课关注 |
| --- | --- | --- |
| `apps/api/src/auth.ts` | `AuthService.register/login/resolve/logout` | 密码、session、CSRF |
| `apps/api/src/auth.ts` | `SessionGuard` | 认证与写请求防护 |
| `apps/api/src/controller.ts` | `AuthController` | Cookie 创建/清除 |
| `apps/api/src/controller.ts` | `ListingsController` | DTO、路径、session user |
| `apps/api/src/controller.ts` | `SystemController.stats` | admin RBAC |
| `apps/api/src/service.ts` | `MarketService.patch/reserve` | 对象 owner 授权 |
| `apps/api/src/errors.ts` | `ApiFilter` | 错误 DTO 与内部日志 |
| `apps/api/src/bootstrap.ts` | request middleware | requestId 和 HTTP 日志 |

复习：

- [认证、Session 与授权](../06-auth-sessions-rbac/03-authentication-object-authorization-rbac.md)；
- [NestJS 与输入验证](../02-nest-api-validation/02-dto-transformation-validation.md)；
- [测试、OpenAPI 与可观测性](../09-testing-openapi-observability/01-unit-http-real-postgres-tests.md)。

测试用密码、邮箱和 token 都必须是虚构值。不得把真实账号、Cookie 或 `.env` 放进命令历史、
教材、截图或日志。

## 4. 核心理论

### 4.1 密码验证不返回散列，也不泄露登录枚举

注册把随机 salt 和 scrypt 派生结果保存为：

```text
scrypt$N$r$p$keyLength$saltHex$derivedKeyHex
```

参数随记录保存，并在解析时限制算法、N/r/p、长度和十六进制形状，后续调整参数不会让既有账号
失效，也不会接受可触发无界资源消耗的记录。登录无论账号是否存在都会执行一次 scrypt；不存在
账号或记录损坏时使用固定形状的受控参数与假 salt/key。最终错误统一：

```json
{
  "code": "INVALID_CREDENTIALS",
  "message": "邮箱或密码错误"
}
```

进程内 limiter 同时按可信 socket 地址和规范化账号建立一分钟固定窗口：账号第 6 次、地址第
21 次请求返回 `429 RATE_LIMITED`。它限制单实例资源消耗，但不能替代多实例共享策略、边缘限频、
风险识别和容量监控。

### 4.2 Opaque session 把浏览器秘密和数据库记录分离

登录生成 32 字节随机 token，只把原值写入 Cookie；数据库保存 SHA-256：

```text
browser cookie sid=<raw random token>
database sessions.token_hash=sha256(raw token)
```

数据库泄漏不会直接得到可用 Cookie。每次解析 session 时 JOIN users，角色变更不会长期封存在
Cookie。退出删除 token hash 并清 Cookie；过期记录可由定时维护删除，但认证查询本身已经检查
`expires_at > now()`，不依赖清理任务及时运行。

### 4.3 Cookie 属性不是同一个开关

| 属性 | 本章值 | 作用 | 不负责 |
| --- | --- | --- | --- |
| `HttpOnly` | `true` | 普通前端脚本不能读取 sid | 不阻止浏览器自动携带 |
| `Secure` | 生产 `true` | 只经 HTTPS 发送 | 本地 HTTP 无法验证生产行为 |
| `SameSite` | `lax` | 降低部分跨站携带 | 不替代 Origin/CSRF token |
| `Path` | `/` | 整个 API 路径可用 | 不做用户权限 |
| `Max-Age` | 8 小时 | 浏览器端生命周期 | 服务端仍以数据库过期为准 |

清 Cookie 必须使用相同 Path/SameSite/Secure 语义，否则浏览器可能保留旧 Cookie。

### 4.4 CSRF 与 CORS、认证、XSS 不是一回事

本章同源主线不启用全局 CORS，开发前端通过 Vite 代理。同源写请求仍做：

1. `Origin === APP_ORIGIN`；
2. `X-CSRF-Token` 形状合法；
3. token 与当前 session 保存值定时安全比较。

登录和注册还没有 session，因此至少执行 Origin 检查，防止登录 CSRF。CORS 决定浏览器是否
允许跨源脚本读取/发起某些请求，不是对象授权；CSP 和输出转义用于降低 XSS，也不能代替 CSRF。

### 4.5 认证、对象授权与 RBAC 分层

```text
SessionGuard -> “你是谁”
MarketService.patch -> “你是否拥有这个 Listing”
SystemController.stats -> “你的持久化角色是否为 admin”
```

PATCH 的 `ownerId` 从数据库读取，当前用户从 session 读取。请求 body 只含可编辑字段和 version。
预约的 `buyerId` 也只取 session。否则攻击者可以提交别人的 ID 或 `role: "admin"`。

状态码策略：

| 状态 | 含义 | 本章例子 |
| --- | --- | --- |
| `401` | 没有可接受身份 | `/auth/me` 无 Cookie、错误登录 |
| `403` | 身份已知但操作不允许 | 非 owner 编辑、普通用户看统计、CSRF 失败 |
| `404` | 目标资源不存在 | 合法 UUID 对应商品不存在 |
| `409` | 当前资源状态与请求冲突 | 旧 version、商品已预约 |
| `429` | 当前窗口超过认证预算 | 注册或登录尝试过多 |

高敏感资源可把非 owner 统一映射 404 降低存在性泄露，但必须在产品契约中一致。本章按统一契约
明确返回 403，便于教学区分对象授权。

### 4.6 错误响应与日志是两份不同数据

客户端只得到稳定的：

```text
code + 可恢复 message + requestId
```

内部日志只记录诊断元数据：

```text
event, requestId, method, route, status, durationMs
errorType, allow-listed SQLSTATE
```

禁止记录：Authorization、Cookie、CSRF token、密码、请求/响应 body、数据库 URL、SQL 参数、
堆栈回传和真实个人邮箱。500 对外统一“服务器错误”；详细异常只留在受控日志系统。

## 5. 接口、守卫与日志清单

| 元素 | 固定用法 | 证据 | 边界 |
| --- | --- | --- | --- |
| `CredentialsDto` | email + 12..128 密码 | 400 输入错误 | 不负责认证预算 |
| `scrypt` | 自描述 N/r/p/keyLength | 旧参数记录仍可验证 | 参数需按硬件复核 |
| `AuthAttemptLimiter` | 账号 5/min、地址 20/min | 第 6/21 次为 429 | 单实例边界，不替代共享限频 |
| `timingSafeEqual` | 同长度 Buffer | 密码和 CSRF 比较 | 不能消除所有侧信道 |
| `sid` | 64 个 hex 字符 | Cookie + token hash 查询 | 原 token 不入库/日志 |
| `sessions.expires_at` | 8 小时 | 过期后 401 | 清理任务仅回收空间 |
| `Origin` | 精确 `APP_ORIGIN` | 错误 origin 403 | 非浏览器客户端另设计 |
| `X-CSRF-Token` | 64 个 hex 字符 | 缺失/错误 403 | 不是身份凭据 |
| `SessionGuard` | 保护需身份路由 | request.user | 不做 owner/admin 决策 |
| owner check | service 读数据库字段 | 非 owner 403 | 前端隐藏按钮无效 |
| role check | session JOIN 的 user.role | 普通用户 403 | 不接受 body role |
| `ApiFilter` | 稳定 code/message/requestId | 响应 header 与 body 对齐 | 500 不回传内部消息 |
| HTTP log | 元数据 allow-list | requestId 串联 | 不记录 query/body/headers |

Controller 责任清单：

```text
路由与 HTTP status
参数 pipe / DTO
guard 选择
Cookie 写入和清除
调用 service
不拼 SQL
不相信 body 身份
不吞异常
```

## 6. 最小可运行案例

最小案例只验证一个账号的注册、登录、当前身份和退出。先按第 04 课启动 API，然后用一个临时
Cookie 文件；示例值均为虚构：

```bash
BASE=http://127.0.0.1:3000/api/v1
ORIGIN=http://localhost:5173
COOKIE=/tmp/market-api-cookie.txt

curl -i -X POST "$BASE/auth/register" \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: application/json" \
  --data '{"email":"lesson-user@example.test","password":"example-only-password"}'

curl -i -c "$COOKIE" -X POST "$BASE/auth/login" \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: application/json" \
  --data '{"email":"lesson-user@example.test","password":"example-only-password"}'
```

从登录响应 JSON 读取临时 `csrfToken`，只存当前 shell 变量，不写教材或日志：

```bash
CSRF=REPLACE_WITH_CURRENT_TEST_RESPONSE
curl -i -b "$COOKIE" "$BASE/auth/me"
curl -i -b "$COOKIE" -X POST "$BASE/auth/logout" \
  -H "Origin: $ORIGIN" \
  -H "X-CSRF-Token: $CSRF"
curl -i -b "$COOKIE" "$BASE/auth/me"
```

预期顺序：注册 `202` 且只返回 `{"accepted":true}`；登录 `200` 且 `Set-Cookie` 含
`HttpOnly`/`SameSite=Lax`；第一次 me
`200`；logout `200`；第二次 me `401`。失败证据应保存 status、错误 code 和 requestId，不保存
Cookie 或 CSRF 值。

### 6.1 从最小案例扩展

最小身份路径不证明对象授权。扩展时至少建立 seller、buyer 两个独立 Cookie jar：

```text
seller 创建 listing
buyer PATCH seller listing -> 403
seller PATCH version=1 -> 200/version=2
seller 重放 version=1 -> 409
buyer GET admin/stats -> 403
数据库把 seller 角色改为 admin -> seller GET admin/stats -> 200
无 Cookie GET auth/me -> 401
合法随机 UUID GET listing -> 404
```

这组结果才把 401/403/404/409 分开。

## 7. 邻里集市集成案例

创建商品时，controller 不接受 owner：

```ts
create(
  @Body() body: CreateListingDto,
  @Req() request: AppRequest
) {
  return this.market.create(body, request.user!);
}
```

真正对象授权在 service：

```ts
const current = await this.get(id);
if (current.ownerId !== user.id) {
  fail(403, "FORBIDDEN", "只能修改自己的商品");
}
```

管理员统计单独检查角色：

```ts
if (request.user!.role !== "admin") {
  fail(403, "FORBIDDEN", "需要管理员权限");
}
```

这些都是必要片段，不是完整文件。验收测试还提交额外 `ownerId`，全局 ValidationPipe 使用
`forbidNonWhitelisted: true`，因此返回 400；即使攻击者知道 seller UUID，也不能把它写进 DTO。

错误路径必须保持同一响应形状：

```json
{
  "code": "FORBIDDEN",
  "message": "只能修改自己的商品",
  "requestId": "与 x-request-id 响应头相同"
}
```

测试还断言没有 `stack`。数据库异常、连接串、SQL 和参数不会进入 body。

## 8. 常见错误与排查路径

### 明确错误示例：为“修好 403”删除 CSRF guard

错误局部改动：

```ts
// 错误：浏览器写请求只要有 Cookie 就放行
await this.auth.resolve(request);
return true;
```

| 五段诊断 | 本例记录 |
| --- | --- |
| 现象 | 缺少 CSRF token 和恶意 Origin 的 POST 都返回 201 |
| 证据 | 验收测试原本两个 403 断言变红；请求仍自动携带 session Cookie |
| 原因 | 为绕过开发代理配置问题，删除了写请求 Origin/token 校验 |
| 修复 | 恢复 SessionGuard；把前端经同源代理访问，并让 `APP_ORIGIN` 等于真实页面 origin |
| 复验 | 正确 Origin+token 成功；缺 token、错误 token、错误 Origin 均 403 |

### 其他错误

| 现象 | 证据 | 原因 | 修复 |
| --- | --- | --- | --- |
| 登录错误暴露“账号不存在” | 401 body 文案不同 | 分支返回不同消息 | 统一 INVALID_CREDENTIALS |
| 数据库保存原 token | sessions 列可直接当 Cookie | 未 hash | 只存 SHA-256，浏览器持有原值 |
| 前端传 admin 后通过 | request body 与日志 | 信任客户端角色 | 角色只从 users JOIN |
| 非 owner 编辑成功 | listing.owner/user.id | 只隐藏按钮 | service 强制比较并在 UPDATE 带 owner |
| 日志出现 Cookie | 日志采样 | 记录完整 headers | 改 allow-list 元数据并轮换泄漏 session |
| 500 返回 SQL message | HTTP body | filter 透传异常 | 500 固定文案，内部只记类型/SQLSTATE |
| logout 后 Cookie 仍发 | 浏览器存储属性 | clearCookie 属性不一致 | 使用相同 Path/SameSite/Secure |

## 9. 课后题

**问题 1：HttpOnly 为什么不能替代 CSRF？**

参考答案：HttpOnly 阻止脚本读取 Cookie，但浏览器仍会自动在匹配请求中发送 Cookie；跨站诱导
写请求仍需 Origin 和 CSRF token 防护。

**问题 2：为什么 CSRF token 不是认证 token？**

参考答案：它只证明请求掌握与当前 session 配对的随机值，身份仍由 sid 查数据库得出；两者职责
不同。

**问题 3：普通用户访问管理员统计为什么是 403，不是 401？**

参考答案：session 已解析出有效身份，只是角色不满足，因此是已认证但无权。

**问题 4：合法 UUID 对应商品不存在为什么是 404，非 UUID 为什么是 400？**

参考答案：前者通过路径格式但资源不存在；后者请求参数本身不合法，尚未进入资源查找。

**问题 5：requestId 为什么同时出现在 header、body 和日志？**

参考答案：客户端可以用同一个无秘密标识关联错误和内部日志；它不是 session，也不能承载个人
数据。

## 10. 实践练习

### 基础：401/403/404/409 表格

对一个 seller 商品依次执行：无 Cookie PATCH、buyer PATCH、随机 UUID GET、seller 旧版本
PATCH。

参考答案：分别为 401、403、404、409；每个错误 body 有 code/message/requestId，header 的
requestId 相同。不得把所有失败统一成 200。

### 进阶：会话过期

登录 buyer 后，在隔离测试库把该 session 的 `expires_at` 改为过去，再请求 `/auth/me`。

参考答案与判定：返回 401 `UNAUTHENTICATED`；无需先运行清理任务；日志不出现 sid。删除测试
创建的账号会通过 FK cascade 清理 session。

### 故障注入：敏感日志

在临时源码中错误地给 HTTP 日志增加 `headers: request.headers`，发一次登录请求并检查输出，
随后立即恢复。

参考答案与判定：能指出 Cookie/CSRF/客户端元数据泄漏风险；恢复 allow-list 后日志只含 event、
requestId、method、route、status、duration。若真实 session 曾被写入持久日志，应吊销 session
并按安全流程处理，不能只删本地一行。

## 11. 阶段验收

最小自动验收仍使用唯一项目测试：

```bash
cd /tmp/web-fullstack-modernization/batch-5/market-api-capstone
pnpm test
```

需要从实际输出和断言确认：

- 无 session 的 `/auth/me` 是 401；
- 错误密码是通用 401；
- 普通用户访问 admin 是 403；
- 非 owner 编辑和自己预约是 403；
- 缺少 CSRF、错误 Origin 都是 403；
- 非法 UUID 400、合法不存在 UUID 404；
- 旧 version 和并发预约冲突 409；
- 错误 body 无 stack，requestId 与 header 一致；
- logout 与 session 过期后都返回 401。

手工启动后可观察脱敏日志：

```bash
pnpm start
```

预期 listening 和 HTTP 日志不含 `DATABASE_URL`、密码、邮箱正文、Cookie、CSRF token、SQL 参数。
失败证据是实际日志行的字段名清单；汇报时仍要把任何意外秘密替换为 `[REDACTED]`。

验收清单：

- [ ] 密码散列不进入 HTTP。
- [ ] 原始 session token 不入数据库和日志。
- [ ] Cookie 属性与清除属性一致。
- [ ] 写请求同时校验 Origin 和 CSRF token。
- [ ] SessionGuard 只解析身份和 CSRF，不代替 owner/RBAC。
- [ ] owner 与角色都来自数据库状态，不来自 body。
- [ ] 普通用户访问 admin 为 403，数据库角色变更后同一 session 重新解析为 admin 并返回 200。
- [ ] 401/403/404/409/429 的语义和测试可区分。
- [ ] 500 不回传内部异常，日志只记录 allow-list。
- [ ] 进程内认证预算已验证；共享/边缘限频与 HTTPS 浏览器验证明确列为缺口。

## 12. 常见问题

**为什么注册重复邮箱也返回 202？**

公开注册端点不能用 `201/409` 差异充当账号目录。本项目对新邮箱和重复邮箱都完成同样的
scrypt 成本并返回 `{"accepted":true}`；用户随后通过登录或受控恢复流程继续。该策略降低直接
枚举，但网络、数据库缓存、共享限频与邮件流程仍需单独评估，不能承诺时序完全一致。

**SameSite=Lax 能否升级为 Strict？**

可以评估，但会影响从外部链接进入后的会话体验。无论选 Lax 或 Strict，写请求的 Origin/CSRF
检查仍保留。

**为什么 session 放 PostgreSQL，不用 Redis？**

本章以 PostgreSQL 为唯一必需状态源，重启后 session 仍在。Redis 可作为高吞吐扩展，但会增加
持久化、过期、故障切换和一致性责任，不能无条件替换。

**为何不记录完整 URL？**

query 可能包含搜索词、邮箱或其他个人数据。教学日志记录 route 模板而不是实际 query；生产
仍需按数据分类和保留策略设计。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN Set-Cookie](https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Set-Cookie)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)：scrypt、随机数和定时安全比较。
- [NestJS Guards](https://docs.nestjs.com/guards)
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## 我现在能做到什么

我能把密码、opaque session、Cookie、Origin、CSRF、对象 owner 和管理员角色分成独立安全边界，
为 401/403/404/409 建立可观察契约，并用 requestId 连接稳定错误与脱敏日志；遇到代理或浏览器
问题时，我不会删除 guard、信任 body 身份或把秘密写进日志来制造成功。

## 单元导航

[返回第 10 章目录](../README.md#10-api-综合项目) ·
[上一课：领域、仓储与事务服务](02-domain-repositories-transaction-services.md) ·
[下一课：真实 HTTP 与数据库验收 Runbook](04-real-http-database-acceptance-runbook.md)
