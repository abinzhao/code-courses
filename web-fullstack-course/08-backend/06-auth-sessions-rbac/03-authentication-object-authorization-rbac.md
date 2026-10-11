# 认证、对象授权与 RBAC

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | Session actor、对象策略、能力型 RBAC、条件写与 401/403 测试 |
| 练习目录 | `market-api-lab/` |
| 最小案例 | **纯策略函数 + in-memory fixture**，不代表控制器已接线 |
| 真实集成 | 两用户/一管理员、真实 HTTP 和 PostgreSQL 最终状态 |
| 核心分层 | 认证“是谁” / 对象授权“能否操作这条记录” / RBAC“能否执行该类能力” |
| 状态契约 | 未认证 401；已认证无权 403；不存在 404；版本冲突 409 |
| 信任边界 | actor/role 来自服务端 session + users；body/query/header 的角色与 userId 不可信 |

## 1. 任务背景

用户乙成功登录后，把 PATCH URL 改成用户甲的 Listing ID。如果服务只检查“req.user 存在”，乙就
能修改甲的商品。这是水平越权。若普通用户在 body 加 `"role":"admin"` 后进入管理接口，则是垂直
越权。

前端隐藏按钮只能减少误操作，不能阻止手工 HTTP 请求。认证 guard 也只能建立可信 actor，无法
知道每个 Listing 的 owner。对象授权必须在读取目标后判断，并在最终 UPDATE 的 WHERE 中再次带
owner；RBAC 则针对明确能力检查服务端角色，不应把 admin 解释成无条件绕过全部领域规则。

## 2. 学习目标

完成本课后，你能够：

1. 把 Session 解析结果收窄为可信 actor；
2. 区分 401、403、404 和 409 的恢复语义；
3. 在服务层对具体 Listing 执行 owner 策略；
4. 在 SQL 写入条件中再次绑定 owner 与 version；
5. 用能力表实现 deny-by-default RBAC，而非散落 role 判断；
6. 拒绝 body 中的 `ownerId/userId/role` 等越权字段；
7. 验证用户乙失败后数据库行、version 和 owner 均不变；
8. 设计一致的登录防枚举与对象存在性策略。

## 3. 预备知识

先完成：

- [密码哈希与账号边界](01-password-hashing-account-boundaries.md)；
- [Cookie 会话、Origin 与 CSRF](02-cookie-sessions-origin-csrf.md)；
- [乐观锁、死锁、重试与回滚](../05-transactions-concurrency/03-optimistic-lock-deadlock-retry-rollback.md)。

创建：

```bash
cd market-api-lab
mkdir -p src/auth src/authorization src/listings test
```

本课假设公开 Listing ID 可在列表中看到，因此对“已认证但非 owner 的现有 Listing”返回 403；
不存在返回 404。这是一项产品策略，不适合所有敏感对象。若对象存在性本身敏感，可统一返回 404，
但必须全路径一致并保留内部审计原因。

## 4. 核心理论

### 4.1 三层判断按顺序执行

```text
session sid -> 认证 -> actor
actor + listing -> 对象授权 -> owner 是否允许 edit
actor.role + capability -> RBAC -> 是否允许查看运营统计
```

认证失败时没有可信 actor，返回 401。认证成功但策略拒绝时返回 403。RBAC 不能替代 owner 检查：
本课程 admin 可看运营统计，但不会隐式编辑任意用户商品。

### 4.2 actor 只能来自服务端事实

可信 actor 最小形状：

```ts
type Actor = {
  id: string;
  role: "user" | "admin";
  sessionTokenHash: string;
};
```

它由有效 session JOIN users 产生。email 可用于展示，但授权尽量基于稳定 ID。请求 body 中的
`userId`、`ownerId` 和 `role` 应由 DTO whitelist 拒绝，而不是“忽略后仍回显”。

### 4.3 对象授权要贴近业务写入

控制器级 Guard 很适合“是否登录”“是否有管理能力”，但对象授权常需要加载记录和理解动作。把
Listing owner 规则放在服务层：

1. 查询 Listing；
2. 不存在按策略 404；
3. ownerId 与 actor.id 不同则 403；
4. 调用带 `owner_id` 与 `version` 的条件 UPDATE；
5. 0 行映射 409 或重新分类。

最终 SQL 仍带 owner，防止检查后状态变化或未来调用方漏掉策略。

### 4.4 RBAC 用能力而不是角色大小比较

错误思路：

```text
admin > user，所以 admin 可以做所有 user 操作并绕过所有规则
```

更明确：

```js
const CAPABILITIES = {
  user: new Set(["listing:create"]),
  admin: new Set(["listing:create", "ops:read"]),
};
```

“编辑自己的 Listing”不是单纯角色能力，还需要对象 owner 条件。取消预约、处理举报等动作也应有
独立策略，不把 admin 当数据库 root。

### 4.5 deny by default 与穷举动作

未知 role、未知 capability、缺 actor 都拒绝。策略函数以动作枚举为输入，新增路由时必须显式选择
能力或对象策略。测试应覆盖允许与拒绝，不只覆盖成功。

### 4.6 401、403、404、409 不应混用

| 状态 | 邻里集市含义 | 前端恢复 |
| --- | --- | --- |
| 401 | session 缺失/过期/撤销 | 登录 |
| 403 | actor 已知但不允许该动作，或 CSRF 拒绝 | 说明无权/重新获取 token |
| 404 | 当前策略下目标不可见/不存在 | 返回列表 |
| 409 | actor 有权，但 version/状态已冲突 | 刷新/合并 |

CSRF 403 与对象 403 应使用不同稳定 code（`CSRF`、`FORBIDDEN`），便于恢复和监控。

### 4.7 防枚举不只是登录文案

登录不存在账号和错误密码统一 `INVALID_CREDENTIALS`。对象接口是否隐藏存在性取决于威胁模型：
公开 Listing 可明确 403；私有资源可统一 404。日志可记录内部 reason，但不能把 owner email、
session 或敏感对象详情放入响应。

### 4.8 授权结果不可长期缓存

role、owner、session 撤销和资源状态会变化。不要把“用户曾经是 admin”缓存进长期客户端 token
后永不刷新。若使用短期缓存，必须定义失效与高风险操作回源；本课每次从有效 session/数据库事实
建立 actor。

## 5. 元素、属性、API 或配置清单

| 元素 / API | 责任 | 成功证据 | 禁止做法 |
| --- | --- | --- | --- |
| Session guard | 建立 actor | 缺/过期 sid -> 401 | 顺便判 owner |
| `request.actor` | 请求内可信身份 | 来自 session JOIN | 来自 body |
| DTO whitelist | 限制可写字段 | role/ownerId -> 400 | 静默接受 |
| object policy | actor + object + action | 非 owner -> 403 | 只靠 UI |
| capability map | role + capability | 普通 user ops:read -> 403 | role 字符串大小比较 |
| `owner_id = $n` | 写时纵深防御 | 越权 rowCount=0 | 先查后无条件 UPDATE |
| `version = $n` | 乐观并发 | 旧版本 -> 409 | 自动覆盖 |
| public error code | 前端恢复 | 稳定 code/status | 暴露 SQL/detail |
| audit event | 高风险拒绝/允许 | requestId/actorId/action/objectId | 密码/Cookie/CSRF |

## 6. 最小可运行案例

本案例是**纯策略函数与 in-memory fixture**。它证明决策表，不证明 Nest Guard、路由或 SQL 已调用。

### 6.1 错误与策略

创建 `src/authorization/policy.mjs`：

```js
export class AccessError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = "AccessError";
    this.status = status;
    this.code = code;
  }
}

const CAPABILITIES = Object.freeze({
  user: new Set(["listing:create"]),
  admin: new Set(["listing:create", "ops:read"]),
});

export function requireActor(actor) {
  if (!actor) {
    throw new AccessError(401, "UNAUTHENTICATED", "请先登录");
  }
  if (!CAPABILITIES[actor.role]) {
    throw new AccessError(403, "FORBIDDEN", "没有操作权限");
  }
  return actor;
}

export function requireCapability(actorInput, capability) {
  const actor = requireActor(actorInput);
  if (!CAPABILITIES[actor.role].has(capability)) {
    throw new AccessError(403, "FORBIDDEN", "没有操作权限");
  }
  return actor;
}

export function requireListingOwner(actorInput, listing) {
  const actor = requireActor(actorInput);
  if (!listing) {
    throw new AccessError(404, "LISTING_NOT_FOUND", "商品不存在");
  }
  if (listing.ownerId !== actor.id) {
    throw new AccessError(403, "FORBIDDEN", "不能修改他人的商品");
  }
  return actor;
}
```

admin 没有特殊 owner bypass；若未来产品批准代运营，应新增独立 capability、审计和明确动作，而
不是修改 `requireListingOwner` 为“admin 一律通过”。

### 6.2 策略测试

创建 `test/authorization-policy.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  requireActor,
  requireCapability,
  requireListingOwner,
} from "../src/authorization/policy.mjs";

const owner = { id: "user-a", role: "user" };
const other = { id: "user-b", role: "user" };
const admin = { id: "admin-a", role: "admin" };
const listing = { id: "listing-1", ownerId: owner.id, version: 3 };

test("separates unauthenticated from authenticated-but-forbidden", () => {
  assert.throws(
    () => requireActor(null),
    (error) => error.status === 401 && error.code === "UNAUTHENTICATED",
  );
  assert.throws(
    () => requireListingOwner(other, listing),
    (error) => error.status === 403 && error.code === "FORBIDDEN",
  );
});

test("allows only the concrete owner to edit", () => {
  assert.equal(requireListingOwner(owner, listing), owner);
  assert.throws(
    () => requireListingOwner(admin, listing),
    (error) => error.status === 403,
  );
  assert.throws(
    () => requireListingOwner(owner, null),
    (error) => error.status === 404,
  );
});

test("grants ops capability only from the trusted role map", () => {
  assert.throws(
    () => requireCapability(owner, "ops:read"),
    (error) => error.status === 403,
  );
  assert.equal(requireCapability(admin, "ops:read"), admin);
  assert.throws(
    () => requireCapability({ id: "x", role: "super-admin" }, "ops:read"),
    (error) => error.status === 403,
  );
});
```

运行：

```bash
node --test test/authorization-policy.test.mjs
```

预期 3 条测试通过。这里 actor 是测试 fixture，真实 actor 必须由上一课 session guard 建立。

### 6.3 从策略扩展到写入

1. 先穷举 null/user/admin 与 owner/other/missing。
2. DTO 拒绝 ownerId/userId/role。
3. 服务加载 Listing 并调用 owner policy。
4. 仓储 UPDATE 再带 owner/version。
5. HTTP + PostgreSQL 测试断言状态码和数据库未变。

任何一层通过都不能替代下一层。

## 7. 邻里集市集成案例

### 7.1 认证 Guard 只建立 actor

Nest 风格伪代码（需按项目 Nest 12 API 与类型实现）：

```ts
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sid = readCookie(request.headers.cookie, sessionCookieName());
    const actor = await this.sessions.authenticate(sid);
    if (!actor) {
      throw new UnauthorizedException({
        code: "UNAUTHENTICATED",
        message: "请先登录",
      });
    }
    request.actor = actor;
    return true;
  }
}
```

`readCookie` 使用成熟解析器或严格实现，不用 `split("=")` 处理任意 Cookie。Guard 不读 body role，
不加载 Listing。

### 7.2 Listing 服务对象授权

```js
export async function updateListing({ db, actor, command }) {
  const current = await db.listings.findById(command.listingId);
  requireListingOwner(actor, current);

  const updated = await db.listings.updateOwnedVersion({
    id: command.listingId,
    ownerId: actor.id,
    expectedVersion: command.expectedVersion,
    title: command.title,
    description: command.description,
    priceCents: command.priceCents,
  });
  if (!updated) {
    const error = new Error("商品已被更新，请刷新后再提交");
    error.status = 409;
    error.code = "VERSION_CONFLICT";
    throw error;
  }
  return updated;
}
```

最终 SQL：

```sql
UPDATE listings
SET title = $1,
    description = $2,
    price_cents = $3,
    version = version + 1
WHERE id = $4
  AND owner_id = $5
  AND version = $6
RETURNING id, title, description, price_cents,
          owner_id, status, version, created_at;
```

ownerId 使用 actor.id，不使用 body。管理员若没有代编辑 capability，同样因 owner policy 拒绝。

### 7.3 RBAC 管理能力

管理统计路由只检查 `ops:read`：

```ts
@UseGuards(SessionGuard, CapabilityGuard)
@RequireCapability("ops:read")
@Get("/ops/summary")
getSummary() {
  return this.opsService.summary();
}
```

CapabilityGuard 从 `request.actor.role` 查服务端能力表。装饰器缺失时默认拒绝受保护管理控制器，
避免新增方法忘记配置后公开。

### 7.4 真实 HTTP/PostgreSQL 验收

在隔离 PostgreSQL 18 创建 seller、buyer、admin 和 seller Listing，记录 fixture ID、迁移状态，
不记录密码/Cookie/token。依次验证：

1. 无 Cookie PATCH seller Listing -> `401 UNAUTHENTICATED`。
2. buyer 登录，带正确 Origin/CSRF PATCH seller Listing -> `403 FORBIDDEN`。
3. 查询数据库：title、price_cents、owner_id、version 完全不变。
4. seller 登录，旧 version PATCH -> `200`，priceCents 仍整数分，version +1。
5. seller 重放旧 version -> `409 VERSION_CONFLICT`。
6. buyer GET ops summary -> `403 FORBIDDEN`。
7. admin GET ops summary -> `200`；admin PATCH seller Listing 仍 `403`。
8. 注册 body 加 `role:"admin"` -> `400`，数据库没有新 admin。
9. missing account 与 wrong password 登录 -> 相同 401/code/message；日志无账号状态和凭据。

响应中的 `createdAt` 必须是 UTC ISO 8601。清理仅删除本轮 fixture。上述是验收步骤，只有实际
运行并保存脱敏状态/数据库断言后才能标为通过。

### 7.5 审计但不泄密

高风险允许/拒绝事件可记录：

```json
{
  "event": "authorization_decision",
  "requestId": "request-id",
  "actorId": "internal-user-id",
  "action": "listing:update",
  "objectId": "listing-id",
  "decision": "deny",
  "reason": "not_owner",
  "observedAtUtc": "2026-10-11T08:00:00.000Z"
}
```

不记录 password、hash、sid、Cookie、CSRF、完整 body 或数据库连接串。对 actor/object ID 的
日志访问和保留期仍需治理。

## 8. 常见错误与排查路径

### 明确错误：只在前端隐藏编辑按钮

```js
if (currentUser.id !== listing.ownerId) {
  editButton.hidden = true;
}
```

| 五段 | 记录 |
| --- | --- |
| 现象 | UI 看不到按钮，但手工 PATCH 能修改他人商品 |
| 证据 | 服务只检查登录，没有 owner policy；数据库行发生变化 |
| 原因 | 把客户端展示当作服务端授权 |
| 修复 | 服务层检查 owner，最终 UPDATE 带 owner_id/version |
| 复验 | buyer PATCH 403，数据库 title/price/owner/version 全部不变 |

### 信任 body.role

攻击者提交 `role:"admin"`。DTO 应因未知/禁止字段返回 400；INSERT 使用服务端默认 user。不能
“前端不发送所以安全”。

### 认证 Guard 中塞入所有对象规则

Guard 不知道每个路由的对象加载与动作语义，最终变成巨大条件树。保留身份 Guard、能力 Guard 与
服务对象策略三层，并分别测试。

### admin 自动绕过 owner

这会把一个运营能力扩大为全局数据修改。按最小权限为代运营设计独立 action/capability、审批和
审计；默认 admin 也受 owner 规则。

### 403 后数据库仍变化

可能是写入发生在授权前，或 catch 把错误映射后仍提交。检查调用顺序、事务 rollback 和 UPDATE
条件。复验不能只看 status，必须查数据库。

## 9. 课后题

**问题 1：认证成功为什么不能直接允许 PATCH？**

参考答案：认证只证明 actor 身份；PATCH 还需要该 actor 对具体 Listing 的 edit 权限。

**问题 2：RBAC 为什么不能替代对象 owner 判断？**

参考答案：角色描述类别能力，owner 描述 actor 与具体记录的关系。普通 user 对自己的和他人的
Listing 拥有不同权限。

**问题 3：什么时候把 403 统一成 404？**

参考答案：当资源存在性本身敏感，并且产品明确选择隐藏时。策略要全路径一致，内部仍审计真实
原因。本课程 Listing 公开可见，所以明确 403。

**问题 4：SQL 带 owner 条件后还需要服务层策略吗？**

参考答案：需要。SQL 是最终写保护；服务层负责动作语义和准确错误分类。两层形成纵深防御。

## 10. 实践练习

### 基础：收藏身份来源

实现 `PUT /favorites/:listingId`，忽略/拒绝 body.userId。可判定标准：userId 只来自 actor；两次
PUT 目标状态相同；用户不能替别人收藏。

### 进阶：显式代运营能力

设计 `listing:update:any`，仅用于经过批准的运营角色。判定标准：与 `ops:read` 分开；每次代编辑
记录审计 reason/ticket；普通 admin 默认没有；owner 正常路径不需要该能力。

### 故障注入：删除 SQL owner 条件

保留服务层检查，构造“检查后 owner 被测试事务改变”的场景。条件缺失时旧 actor 可能写入，测试
先红；恢复 `owner_id=$5` 后 rowCount=0，并按策略返回冲突/拒绝。只在隔离数据库执行。

## 11. 阶段验收

- [ ] Session guard 只从服务端 session 建立 actor，缺失/过期为 401。
- [ ] actor.id/role 不来自 body、query 或自定义客户端 header。
- [ ] DTO 拒绝 role/userId/ownerId/passwordHash 等越权字段。
- [ ] 对象 owner 策略与 capability RBAC 是独立函数/层。
- [ ] 未知 role/capability 默认拒绝。
- [ ] admin 没有未声明的全局 owner bypass。
- [ ] 最终 UPDATE 同时包含 id、ownerId、version。
- [ ] buyer 越权 403 后数据库字段与 version 不变。
- [ ] seller 旧版本返回 409，不自动覆盖。
- [ ] 登录 missing/wrong 公开响应一致。
- [ ] CSRF 403 与对象 403 使用不同稳定 code。
- [ ] 策略 fake、HTTP 行为和 PostgreSQL 状态三类证据没有混称。
- [ ] 审计日志使用 UTC ISO 且不含任何凭据。

## 12. 常见问题

**能把 role 放进签名 token 避免每次查数据库吗？**

可以设计短期、可撤销的 token，但角色变化和账号冻结需要失效策略。本课程使用服务端 session，
每次从可信状态建立 actor，先学清撤销与授权边界。

**所有 403 都会泄漏对象存在吗？**

403 表示已知身份但策略拒绝，可能透露存在性。是否统一 404 取决于资源敏感度。本课程公开 Listing
选择明确 403，私有资源应另做威胁模型。

**管理员是不是应该能修复任何数据？**

紧急修复也应通过独立受控工具、最小能力、审批、审计和回滚，而不是普通 Web admin 自动拥有所有
业务写权限。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [PostgreSQL 18：UPDATE](https://www.postgresql.org/docs/18/sql-update.html)

## 我现在能做到什么

我能从服务端会话建立可信 actor，把认证、对象 owner 策略和 RBAC 能力分层执行，并用 401/403/
409 HTTP 结果与数据库不变证据证明越权请求没有产生副作用。

## 单元导航

[本章目录](../README.md#06-认证会话与授权) ·
[上一课：Cookie 会话、Origin 与 CSRF](02-cookie-sessions-origin-csrf.md) ·
[下一章：搜索、分页与文件](../07-search-pagination-files/01-safe-search-dynamic-queries.md)
