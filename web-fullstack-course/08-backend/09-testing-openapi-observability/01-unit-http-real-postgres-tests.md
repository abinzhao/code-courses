# 单元、HTTP 与真实 PostgreSQL 测试：让每个结论停在证据边界

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一条纯授权单测、测试分层表、PostgreSQL 18 身份门禁与 HTTP/数据库验收清单 |
| 练习位置 | 读者自己的 `market-backend-lab/tests/`；综合验收复用第 10 章工作区 |
| 运行条件 | 最小案例仅需 Node.js 24；真实边界另需隔离 PostgreSQL 18 和已迁移 API |
| 核心命令 | `node --test tests/unit/authorization.test.mjs` |
| 成功证据 | 纯规则故障注入先红后绿；真实套件同时断言 HTTP 响应和数据库状态 |
| 失败证据 | 数据库名/主版本/迁移不符时在清理前停止；越权或并发不变量破坏时测试非零退出 |
| 环境标签 | Mock repository、stub session、静态 fixture 必须逐处标记，不冒充 PostgreSQL |

## 1. 任务背景

一个 HTTP 测试发送 `PATCH /listings/:id` 并得到 200，只能证明请求表面成功。如果实现忘记 owner
检查，它甚至可能成功修改别人的商品。测试必须问更具体的问题：

- 未登录是 401，已登录但非 owner 是 403；
- 403 后数据库 title、priceCents、ownerId、version 都没变化；
- owner 使用旧 version 更新得到 409；
- 两个买家并发预约只有一个 201，另一个 409；
- 数据库最终只有一个有效 Reservation，Listing 状态与赢家一致；
- 错误正文符合统一 contract，且不泄露 SQL/stack。

这些结论横跨纯业务、Nest 管道、HTTP、Cookie/CSRF、SQL、约束和事务。一个全 Mock 测试不能
证明真实数据库锁；一个 repository 测试也不能证明 Cookie 或 DTO。测试分层的价值是让失败有
归属，让结论不超过实际经过的边界。

## 2. 学习目标

完成本课后，你能够：

1. 按单元、模块、HTTP、数据库集成和浏览器层分配规则；
2. 识别 Mock 能替代的外部边界和不能替代的核心边界；
3. 在任何破坏性清理前验证测试数据库身份；
4. 记录 PostgreSQL 客户端/服务端 18、连接目标和迁移状态；
5. 为 repository 测试和 HTTP 测试选择不同隔离策略；
6. 同时断言响应、持久状态和未发生的副作用；
7. 用确定性同步而非随机 sleep 增强并发测试；
8. 区分测试失败、本次回归、环境阻塞和未验证范围。

## 3. 预备知识

- 阅读[统一项目契约](../../00-guide/05-project-assessment.md)；
- 完成[原子预约与并发复现](../05-transactions-concurrency/02-atomic-reservations-concurrency-reproduction.md)；
- 完成[认证、对象授权与 RBAC](../06-auth-sessions-rbac/03-authentication-object-authorization-rbac.md)；
- 理解 `node:test`、`assert`、Promise 和进程退出码。

创建纯单元测试目录：

```bash
mkdir -p tests/unit tests/helpers tests/postgres tests/http
node --version
```

真实测试使用独立 `TEST_DATABASE_URL`，不要让代码回退到 `DATABASE_URL`。测试配置缺失时立即
失败，不能默默连接开发或生产。

## 4. 核心理论

### 4.1 每层回答不同问题

| 层次 | 真实组件 | 可替换组件 | 主要证明 | 不能证明 |
| --- | --- | --- | --- | --- |
| 纯单元 | 领域函数 | 时钟/随机数可注入 | 金额、UTC、授权决策、错误映射 | Nest、HTTP、SQL |
| Nest module | module/provider/guard/filter 接线 | 明确外部 provider | DI、scope、异常映射接线 | 网络、真实 DB 锁 |
| HTTP + Mock repo | HTTP parser/DTO/guard/filter | 标记为 MOCK 的 repo | 状态、头、Cookie、body contract | SQL/约束/事务 |
| Repository + PostgreSQL | SQL、类型、约束、事务 client | 外部通知 | 数据访问和回滚 | Controller/Cookie |
| HTTP + PostgreSQL | 除浏览器外完整 API 边界 | 真实外部邮件等 stub | 协议与持久状态组合 | 浏览器代理和 UI |
| 浏览器 E2E | 浏览器、代理、构建页、API | 非关键第三方 | 用户可见流程与 Cookie 行为 | 穷举数据库不变量 |

同一规则可以在多个层有少量重叠，但要选“最小充分层”。例如 owner 决策的组合在单元层穷举，
HTTP+PostgreSQL 保留一个越权贯通案例；不需要用浏览器重复 50 组纯函数表格。

### 4.2 Mock 要替换边缘，不要替换要证明的对象

适合 Mock：

- 邮件/短信供应商；
- 随机 ID、时钟（纯函数测试）；
- 为 HTTP 协议测试提供的显式 `MockListingRepository`；
- 尚未接入的外部对象存储。

不适合在“真实数据库测试”中 Mock：

- `pg` client/pool；
- 唯一约束和 SQLSTATE；
- `SELECT ... FOR UPDATE`；
- transaction ownership；
- PostgreSQL 时间和类型转换。

测试名应包含证据标签，例如 `HTTP+MOCK`、`POSTGRES18`，报告中一眼能分辨。

### 4.3 数据库身份门禁必须早于清理

测试启动顺序：

```text
读取 TEST_DATABASE_URL（不得 fallback）
  -> 只建立连接
  -> SELECT current_database/current_user/server_version_num/地址/端口
  -> 数据库名满足明确 allow-list 或 _test 约束
  -> server major == 18
  -> migration state == expected
  -> 才允许 TRUNCATE / DROP schema / fixture
```

仅检查变量名不够，连接串可能指错目标。日志只打印数据库名、用户、地址分类和主版本，不打印
密码或完整 URL。

### 4.4 测试隔离取决于连接边界

Repository 测试若所有调用共享一个显式 client，可以每条测试 `BEGIN`，结束 `ROLLBACK`。
完整 HTTP API 通常从 pool 自行 checkout，外部测试事务无法包住其连接；此时选择：

- 每个 worker 独立 database/schema 并运行迁移；
- 教学项目串行运行，测试前清理明确表并插 fixture；
- 使用可注入 transaction context，但复杂度需有价值。

不要在 HTTP 测试外层开事务后以为 API 写入会自动回滚。也不要多 worker 共用一个 schema 又
同时 TRUNCATE。

### 4.5 断言“拒绝后没有变化”

越权测试至少保存更新前快照，并在请求后重新从数据库读取：

```text
HTTP status == 403
error.code == FORBIDDEN
response requestId == header requestId
title/priceCents/ownerId/version == before
outbox/notification count 没增加
```

只断言 403 可能掩盖“先 UPDATE 再抛错但错误提交”的实现。反过来只查数据库也会漏掉错误状态
映射。

### 4.6 并发测试验证结果，不靠运气解释

`Promise.all` 同时发两个请求只是增加重叠机会。更强的测试可以在**测试专用、不可进入生产的**
同步点让两个事务都到达竞争位置，再释放。不要使用随机 `sleep(100)` 推断并发。

即使重复 20 轮通过，也不能数学证明所有调度安全；数据库唯一约束和锁是正确性机制，测试证明
当前实现没有绕开它们。

### 4.7 时间和随机性要分层处理

纯单元层注入固定 clock/UUID，断言确定值。PostgreSQL 集成层让数据库生成
`timestamptz`，断言：

- 返回是可解析且规范的 UTC ISO；
- 时间位于测试开始/结束允许范围；
- 不把本机时区文本当持久值。

密码盐、session ID 等安全随机值只断言长度、差异和不可回传，不固定真实秘密。

### 4.8 失败分类是测试报告的一部分

- 断言因本次代码变化失败：本次回归；
- 目标 PostgreSQL 18 无法启动：环境阻塞，数据库范围未验证；
- 迁移状态不符：fixture 前置失败，不运行行为结论；
- 既有无关套件失败：记录命令、范围和原始错误，不冒充本次修复；
- flaky：先固定同步和隔离，不能盲目重跑到绿。

## 5. 元素、属性、API 或配置清单

| 工具/API | 本课用途 | 边界 |
| --- | --- | --- |
| `node:test` | 组织纯单元和集成测试 | 不自动提供数据库隔离 |
| `node:assert/strict` | 精确断言值和异常 | 断言质量取决于预期是否独立 |
| Nest `TestingModule` | 验证 provider/guard/filter 接线 | 不自动建立真实网络 |
| 原生 `fetch` | 对监听随机端口的 API 发真实 HTTP | 仍不是浏览器 Cookie jar |
| `listen(0)` | 让 OS 分配测试端口 | 必须在 teardown 关闭 |
| `TEST_DATABASE_URL` | 专用测试连接 | 禁止 fallback 到生产配置 |
| `current_database()` | 核对目标数据库名 | 名称还应配合地址/用户 |
| `server_version_num` | 机械判定主版本 18 | 客户端版本另用 `psql --version` |
| `TRUNCATE ... CASCADE` | 串行测试清理 | 仅在身份门禁后使用 |
| per-worker schema | 并行隔离 | 动态标识符必须受控生成 |
| `Promise.all` | 发起并发请求 | 不保证精确到达竞态点 |
| 测试 barrier | 确定竞争顺序 | 不能进入生产路径 |

## 6. 最小可运行案例

### 6.1 创建纯授权函数

创建完整文件 `tests/unit/authorization.mjs`：

```js
export function decideListingEdit(actor, listing) {
  if (!actor) return { allowed: false, status: 401, code: "UNAUTHENTICATED" };
  if (actor.id !== listing.ownerId) {
    return { allowed: false, status: 403, code: "FORBIDDEN" };
  }
  return { allowed: true };
}
```

创建完整文件 `tests/unit/authorization.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { decideListingEdit } from "./authorization.mjs";

const listing = {
  id: "listing-1",
  ownerId: "user-seller",
  priceCents: 1990,
  version: 3,
  createdAt: "2026-10-11T08:00:00.000Z",
};

test("unit: separates unauthenticated, forbidden, and owner decisions", () => {
  assert.deepEqual(decideListingEdit(undefined, listing), {
    allowed: false,
    status: 401,
    code: "UNAUTHENTICATED",
  });
  assert.deepEqual(decideListingEdit({ id: "user-buyer" }, listing), {
    allowed: false,
    status: 403,
    code: "FORBIDDEN",
  });
  assert.deepEqual(decideListingEdit({ id: "user-seller" }, listing), {
    allowed: true,
  });
});
```

运行：

```bash
node --test tests/unit/authorization.test.mjs
```

预期 1 条测试通过。该测试没有 Nest、Cookie、数据库或 HTTP，因此不能证明真实越权请求被拒绝。

### 6.2 故障注入纯规则

临时把实现改为 `if (actor) return { allowed: true }`。相同命令应在 buyer 断言处失败。恢复 owner
比较后转绿。不能把 expected 改成允许 buyer 来迁就错误实现。

## 7. 邻里集市集成案例

### 7.1 PostgreSQL 身份门禁 helper

项目安装并锁定 `pg` 后，创建
`tests/helpers/assert-test-database.mjs`：

```js
export async function assertTestDatabase(pool, expectedMigration) {
  const target = await pool.query(`
    SELECT
      current_database() AS database_name,
      current_user AS database_user,
      current_setting('server_version_num')::integer AS server_version_num,
      inet_server_addr()::text AS server_address,
      inet_server_port() AS server_port
  `);
  const row = target.rows[0];
  const major = Math.floor(row.server_version_num / 10_000);
  if (!row.database_name.endsWith("_test")) {
    throw new Error(`refusing destructive test target: ${row.database_name}`);
  }
  if (major !== 18) {
    throw new Error(`expected PostgreSQL 18, received major ${major}`);
  }

  const migrations = await pool.query(
    "SELECT version FROM schema_migrations ORDER BY version",
  );
  const actual = migrations.rows.at(-1)?.version;
  if (actual !== expectedMigration) {
    throw new Error(
      `migration mismatch: expected ${expectedMigration}, received ${actual ?? "none"}`,
    );
  }
  return {
    databaseName: row.database_name,
    databaseUser: row.database_user,
    serverMajor: major,
    serverAddress: row.server_address,
    serverPort: row.server_port,
    migration: actual,
  };
}
```

更严格项目应配置明确数据库 allow-list，而不仅是后缀；后缀是教学最低门。测试日志输出返回对象，
不输出连接串。

### 7.2 启动前证据

```bash
psql --version
PGSERVICE=market_test psql -X -v ON_ERROR_STOP=1 -c \
  "SELECT current_database(), current_user, current_setting('server_version');"
PGSERVICE=market_test psql -X -v ON_ERROR_STOP=1 -c \
  "SELECT version FROM schema_migrations ORDER BY version;"
```

`market_test` 必须指向专用 `_test` 数据库，并通过 `.pg_service.conf` 与权限为 `0600` 的 passfile
提供连接信息；不要把含密码 URL 放进 `psql` argv。预期客户端和服务端主版本均为 18、数据库名
以 `_test` 结尾、迁移到项目声明版本。任何一项不符，
先停止，不执行 TRUNCATE。

### 7.3 串行 HTTP+PostgreSQL fixture

教学基线用一个专用 `_test` 数据库和串行执行：

```bash
TEST_DATABASE_URL='postgresql://TEST_USER:REPLACE_LOCAL_PASSWORD@127.0.0.1:5432/market_test' \
  node --test --test-concurrency=1 tests/postgres/*.test.mjs tests/http/*.test.mjs
```

套件全局流程：

1. 创建 pool；
2. `assertTestDatabase(pool, EXPECTED_MIGRATION)`；
3. 运行项目迁移器而不是手工假设表存在；
4. 每个测试前按外键顺序或 `TRUNCATE ... RESTART IDENTITY CASCADE` 清理项目表；
5. 插入虚构 seller、buyer、buyer2 和 available Listing；
6. 应用 `listen(0, "127.0.0.1")`；
7. 用原生 fetch 发送真实 HTTP，手工维护测试 Cookie/CSRF；
8. 每条请求后查询数据库不变量；
9. teardown 关闭 HTTP server 和 pool，即使断言失败也执行。

测试中的邮箱使用 `example.test`，密码仅为明显教学占位，不写真实账号。

### 7.4 越权贯通断言

```js
const before = await pool.query(
  `SELECT title, price_cents, owner_id, version
   FROM listings WHERE id = $1`,
  [listingId],
);

const denied = await api.patchListing({
  actor: buyerSession,
  listingId,
  csrfToken: buyerSession.csrfToken,
  body: {
    title: "越权修改",
    description: "",
    priceCents: 1,
    version: before.rows[0].version,
  },
});
assert.equal(denied.status, 403);
assert.equal(denied.body.code, "FORBIDDEN");
assert.equal(denied.headers.get("x-request-id"), denied.body.requestId);

const after = await pool.query(
  `SELECT title, price_cents, owner_id, version
   FROM listings WHERE id = $1`,
  [listingId],
);
assert.deepEqual(after.rows, before.rows);
```

这段依赖完整 fixture 和 `api` helper，是贯通测试片段，不是独立文件。不能使用 Mock repository
后把测试命名为 POSTGRES18。

### 7.5 并发预约断言

```js
const results = await Promise.all([
  api.reserve({ actor: buyerSession, listingId }),
  api.reserve({ actor: buyer2Session, listingId }),
]);
assert.deepEqual(results.map((result) => result.status).sort(), [201, 409]);

const reservations = await pool.query(
  `SELECT buyer_id, status
   FROM reservations
   WHERE listing_id = $1
     AND status IN ('pending', 'confirmed')`,
  [listingId],
);
assert.equal(reservations.rowCount, 1);

const listing = await pool.query(
  "SELECT status, version FROM listings WHERE id = $1",
  [listingId],
);
assert.equal(listing.rows[0].status, "reserved");
```

还应检查 outbox 只有赢家事件。若需要稳定重现竞争，使用测试专用 barrier 让两个事务都到达锁前，
不要靠随机 sleep。

### 7.6 分层最小清单

| 规则 | 最小充分层 | 贯通保留 |
| --- | --- | --- |
| 整数分/UTC parser | 单元 | HTTP 返回值抽查 |
| owner 决策组合 | 单元 | HTTP+PG 越权无变化 |
| DTO whitelist/转换 | HTTP+MOCK | 合法请求贯通 |
| SQL 参数/类型/约束 | Repository+PG | HTTP+PG |
| 会话/CSRF/错误 contract | HTTP | 浏览器关键路径 |
| 并发唯一预约 | HTTP+PG | 可选浏览器不重复提交 |
| 外部邮件 | provider contract stub | 授权沙箱另验 |

## 8. 常见错误与排查路径

### 8.1 明确错误示例：Mock 锁后声称并发通过

```ts
const repository = {
  reserve: async () => ({ id: "reservation-1", status: "pending" }),
};
```

- **现象**：两个请求测试始终“成功”，测试仍标为并发安全。
- **证据**：没有 PostgreSQL 连接、唯一约束、锁或最终状态查询。
- **原因**：Mock 删除了正要证明的竞争边界。
- **修复**：Mock 测试改名为 HTTP+MOCK，只测状态映射；另建 POSTGRES18 并发套件。
- **复验**：真实数据库中两个请求得到 `[201,409]`，有效 reservation 只有一行。

### 8.2 测试事务没有包住 HTTP pool

- **现象**：外层 rollback 后 API 数据仍残留。
- **证据**：测试 client 与 API pool backend PID 不同。
- **原因**：PostgreSQL 事务只属于一个连接。
- **修复**：HTTP 测试使用独立 schema/database 或受门禁的串行清理。
- **复验**：连续运行两次套件，fixture 数量一致，无跨测试残留。

### 8.3 `_test` 门禁在 TRUNCATE 之后

- **现象**：错误连接已经删除数据才发现数据库名不对。
- **证据**：setup 日志顺序先出现 TRUNCATE。
- **原因**：安全检查不是第一个数据库动作。
- **修复**：连接后只查询身份，验证通过才迁移/清理。
- **复验**：把 URL 指向不匹配名称，套件在任何写入前失败；目标表行数不变。

### 8.4 只断言状态码

- **现象**：越权返回 403，但商品已被先更新。
- **证据**：响应测试绿，数据库 before/after 不同。
- **原因**：错误映射掩盖事务顺序或提交错误。
- **修复**：拒绝案例同时断言持久状态和副作用计数。
- **复验**：故障注入“先更新后抛错”使测试红，修复事务后转绿。

### 8.5 用 sleep 等会话过期

- **现象**：测试慢且偶发失败。
- **证据**：固定等待接近真实过期时间。
- **原因**：没有控制时钟或测试数据。
- **修复**：单元层注入 clock；数据库集成直接把专用 session `expires_at` 更新到过去。
- **复验**：无任意等待，401 稳定出现。

## 9. 课后题

1. **HTTP+Mock repository 能证明 DTO unknown field 被拒绝吗？**
   答案：能证明 HTTP/Nest 验证接线；不能证明 SQL、约束或事务。
2. **为什么 repository 测试可用 rollback，完整 HTTP 测试往往不能？**
   答案：前者能把同一个 client 传给所有调用，后者应用 pool 会使用其他连接。
3. **并发测试通过 20 次能否证明永远安全？**
   答案：不能。测试验证实现，正确性来自数据库约束、锁和事务；确定性 barrier 能提高发现能力。
4. **为什么越权测试要查数据库未变化？**
   答案：只看 403 无法发现“先写后报错”或错误提交。

## 10. 实践练习

### 基础：过期会话

登录取得专用测试 session，把该行 `expires_at` 更新到过去，再请求 `/auth/me` 和一个写接口。
可判定标准：两者 401；不 sleep；数据库没有写副作用；Cookie/CSRF 不出现在日志。

### 进阶：每 worker 独立 schema

为并行 worker 生成只含 `[a-z0-9_]` 的 schema 名，分别迁移和设置 search_path。可判定标准：
两个 worker fixture 不互见；动态标识符不来自 HTTP；teardown 只删除本次 schema。

### 故障注入：移除 owner 条件

在个人副本临时移除 service/SQL 的 owner 检查。可判定标准：纯授权或 HTTP+PG 越权测试先红；
恢复后响应 403、数据库 before/after 相同；完整相关套件转绿。

## 11. 阶段验收

- [ ] 每条关键规则映射到最小充分测试层；
- [ ] Mock/stub 测试名和正文有明确标签；
- [ ] 真实套件在任何清理前核对数据库名、用户、地址、服务端 18 和迁移；
- [ ] `psql --version` 记录客户端主版本；
- [ ] HTTP 拒绝同时断言响应和持久状态未变；
- [ ] 并发预约断言两个状态、唯一 reservation、Listing 和 outbox；
- [ ] teardown 在失败时仍关闭 server/pool；
- [ ] 无随机 sleep、无真实凭据、无测试回退到生产 URL；
- [ ] 目标 PostgreSQL 不可用时明确报告未验证。

## 12. 常见问题

**测试数据库可以是 PostgreSQL 16 吗？**
它可以用于其他兼容探索，但不能作为本课程 PostgreSQL 18 验收证据。目标版本不可用时保留
阻塞，不替换结论。

**是否所有测试都要走 HTTP？**
不需要。纯规则在单元层更快、更易穷举；只保留能证明跨边界接线的 HTTP 场景。

**是否应该比较完整错误 message？**
稳定机器判断优先断言 `code`、状态和结构；对用户关键恢复文案可有针对性断言，避免所有标点都
变成脆弱 contract。

**能否在测试日志打印数据库 URL 方便排查？**
不能。输出数据库名、用户、地址/端口和版本即可，URL 可能含密码。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Node.js Test Runner](https://nodejs.org/api/test.html)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [node-postgres Pooling](https://node-postgres.com/features/pooling)
- [node-postgres Transactions](https://node-postgres.com/features/transactions)
- [PostgreSQL 18：Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html)
- [PostgreSQL 18：System Information Functions](https://www.postgresql.org/docs/18/functions-info.html)

## 我现在能做到什么

我能把后端规则放到最小充分测试层，用数据库身份门禁保护清理操作，并通过真实 HTTP +
PostgreSQL 状态断言证明越权、冲突和并发不变量，而不让 Mock 越过证据边界。

## 单元导航

- 章入口：[09 测试、OpenAPI 与可观测性](../09-testing-openapi-observability.md)
- 上一课：[BullMQ 幂等、重试、死信与停机](../08-redis-queues-reliability/03-bullmq-idempotency-retry-dead-letter-shutdown.md)
- 下一课：[OpenAPI 生成与契约验证](02-openapi-generation-contract-validation.md)
