# 领域、仓储与事务服务：让并发结果由数据库决定

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 解释并验证整数分、UTC、仓储边界、乐观版本、收藏幂等和原子预约 |
| 前置 | 已完成[第 01 课](01-workspace-config-migration-bootstrap.md)的 25 文件唯一源码与迁移 |
| 建议投入 | 3 小时阅读与跟踪数据流，1 小时事务故障实验 |
| 完整源码 owner | 本课拥有 `0` 个完整项目文件，只引用第 01 课路径并展示局部片段 |
| 事务 owner | `MarketService.reserve` 获取、提交、回滚并释放同一个 `PoolClient` |
| 冲突语义 | 旧版本 `409 VERSION_CONFLICT`；已预约 `409 RESERVATION_CONFLICT`；锁超时 `503 BUSY` |
| 成功证据 | 两个真实 HTTP 预约竞争得到一个 `201`、一个 `409`，数据库只有一个有效预约 |
| 失败证据 | 注入 reservation INSERT 后异常，预约和 Listing 状态/版本全部回滚 |

本课不再给出任何同路径完整文件。要录入项目，请只使用第 01 课的 marker 源码；本课片段用于
推理、观察和故障注入，不能覆盖工作区文件。

## 1. 任务背景

“先查商品可用，再插入预约”在单请求演示中看起来正确，却会在并发时产生两个赢家：

```text
请求 A：读到 available ─────────┐
请求 B：读到 available ─────────┼─> 两次 INSERT
请求 A/B 各自更新 reserved ─────┘
```

业务正确性必须由数据库事务、行锁和唯一约束共同承担。与此同时，金额不能在服务层变成浮点元，
时间不能混入本地时区字符串，对象授权不能依赖浏览器传来的 owner，仓储也不能在事务中偷偷从
pool 借第二条连接。

本课沿着一条真实数据流审查第 01 课源码：

```text
DTO 值域
  -> service 业务决策
  -> repository 参数化 SQL
  -> transaction-owned client
  -> PostgreSQL CHECK/FK/UNIQUE/row lock
  -> domain mapping: integer cents + UTC ISO
  -> HTTP conflict contract
```

## 2. 学习目标

完成本课后，你能够：

1. 从统一项目契约推导 User、Listing、Favorite、Reservation 和 Review 不变量；
2. 解释 `priceCents` 为什么需要 DTO 与数据库双重整数范围约束；
3. 把 `timestamptz` 映射为 UTC ISO 8601，而不是在 SQL 中保存展示文本；
4. 区分 repository 的 SQL 所有权与 service 的业务/事务所有权；
5. 把同一个 `PoolClient` 显式传给事务内所有仓储操作；
6. 用 `version` 条件更新发现旧页面提交；
7. 用目标状态 PUT/DELETE 实现收藏幂等；
8. 用 `FOR UPDATE` 串行化同一商品预约；
9. 用部分唯一索引作为跨进程最后防线；
10. 区分状态冲突、锁超时、输入错误和服务不可用。

## 3. 预备知识

先定位唯一源码中的实现：

| 关注点 | 唯一路径 | 入口 |
| --- | --- | --- |
| 领域类型 | `packages/contracts/index.ts` | `Listing`、`Reservation` |
| 数据约束 | `apps/api/migrations/001_init.sql` | CHECK、FK、部分唯一索引 |
| 输入值域 | `apps/api/src/dto.ts` | `CreateListingDto`、`PatchListingDto` |
| 数据映射 | `apps/api/src/repo.ts` | `toListing`、`toReservation` |
| 查询仓储 | `apps/api/src/repo.ts` | `ListingsRepo.page` |
| 乐观更新 | `apps/api/src/repo.ts` | `ListingsRepo.updateOwned` |
| 预约事务 | `apps/api/src/service.ts` | `MarketService.reserve` |
| 回滚证据 | `apps/api/test/api.test.mjs` | `Test failure after reservation INSERT` |

复习前置章节：

- [原子预约与并发复现](../05-transactions-concurrency/02-atomic-reservations-concurrency-reproduction.md)；
- [仓储与连接所有权](../04-postgres-data-access/03-repositories-connection-ownership.md)；
- [SQL 建模](../03-sql-modeling.md)。

需要 PostgreSQL 18 才能把并发结果写成“已观察”。没有服务时可以完成静态推理，但必须把运行
步骤标为环境阻塞。

## 4. 核心理论

### 4.1 不变量应放在最窄且可靠的层

| 不变量 | DTO | service | database |
| --- | --- | --- | --- |
| `priceCents` 为整数且在范围内 | 是 | 使用已验证值 | `integer + CHECK` |
| title 非空白、最长 100 | 是 | `trim()` 后写入 | 长度与正则 CHECK |
| owner 来自会话 | 不接受 `ownerId` | 传 `user.id` | FK |
| 只能 owner 编辑 | 不负责 | 比较当前 owner | UPDATE 再带 owner |
| 旧版本不能覆盖新版本 | 接收正整数 version | 映射 409 | `WHERE version=$6` |
| 同商品一个有效预约 | 不接受 buyerId/status | 事务判断 | 行锁 + 部分唯一索引 |
| 不能预约自己的商品 | 不负责 | 比较锁定行 owner | 本项目未复制为 CHECK |

数据库不认识“当前登录用户”，因此对象授权留在 service；数据库非常适合保证跨进程唯一性，
因此不能只靠按钮禁用或进程内布尔值。

### 4.2 金额与时间是领域数据，不是格式技巧

`199.00` 元传输为：

```json
{
  "priceCents": 19900
}
```

DTO 使用 `@IsInt()`，SQL 使用 `integer` 和范围 CHECK。服务端不执行 `Math.round(input * 100)`，
因为那会接受本来非法的浮点协议并隐藏客户端错误。

PostgreSQL 的 `timestamptz` 表示时间点；响应映射只做：

```ts
createdAt: row.created_at.toISOString()
```

`toISOString()` 的 `Z` 是 UTC 证据。用户时区显示由前端完成，不把“2026/10/11 上午”存入表。

### 4.3 Repository 拥有 SQL，service 拥有用例

仓储回答“怎样读写表”，service 回答“当前身份能否执行用例、哪些语句必须原子”。例如：

```ts
const row = await this.listings.lock(id, client);
const reservation = await this.reservations.create(id, user.id, client);
await this.listings.markReserved(id, client);
```

三个操作都显式收到同一个 `client`。如果 `ReservationsRepo.create` 改成
`this.db.pool.query(...)`，INSERT 会离开当前事务；service 即使随后 ROLLBACK，也无法撤销另一
连接上已经提交的写入。

### 4.4 乐观版本解决“基于旧数据编辑”

PATCH 不是先比较内存后无条件 UPDATE，而是把版本放进写条件：

```sql
UPDATE listings
SET title=$1, description=$2, price_cents=$3, version=version+1
WHERE id=$4 AND owner_id=$5 AND version=$6
RETURNING
  id,title,description,price_cents,status,owner_id,version,created_at
```

零行返回时，service 报 `409 VERSION_CONFLICT`。客户端应重新 GET、展示差异，再由用户决定是否
重提；不能自动覆盖，也不能把 409 当 500 重试。

### 4.5 悲观锁与唯一索引共同保护预约

预约事务顺序固定：

```text
BEGIN
SET LOCAL lock_timeout='3s'
SELECT listing FOR UPDATE
检查存在、owner、status
INSERT reservation
UPDATE listing status/version
COMMIT
```

同一商品的第二个请求等待第一把行锁。第一请求提交后，第二请求读取最新 `reserved` 并返回
409。部分唯一索引仍保留，因为未来代码路径、脚本或维护任务可能绕过当前 service；SQLSTATE
`23505` 只有同时匹配 `reservations_one_active_per_listing_idx` 时才映射为同一业务冲突；其他
唯一约束错误保持内部失败，不能猜成预约冲突。

锁超时 `55P03` 只说明本次未获得锁，不证明商品已预约，因此返回可重试的 `503 BUSY`，不能
错误映射为 409。

### 4.6 事务内不做不可回滚外部副作用

本章预约事务只有 PostgreSQL 操作。真实邮件、支付、上传和队列发送都不在事务内。将来要通知
卖家，应在同一事务写 outbox，再由独立 worker 发送；不能在 COMMIT 前发邮件后遇到 ROLLBACK。
Redis 也不能替代数据库唯一约束。

## 5. 接口、SQL 与配置清单

| 项目 | 本章固定做法 | 可观察证据 | 失败语义 |
| --- | --- | --- | --- |
| `price_cents` | `integer` + `0..100000000` | HTTP 数字与 DB 值一致 | DTO `400` / CHECK SQLSTATE |
| `created_at` | `timestamptz` | 响应 `Z` 结尾 | 映射错误为内部错误 |
| 列表搜索 | 参数化 `ILIKE`，转义 `%/_` | `%` 按字面搜索 | 非法分页 `400` |
| 列表快照 | REPEATABLE READ READ ONLY | items 与 total 同一快照 | 查询错误 ROLLBACK |
| 收藏 | PK `(user_id,listing_id)` | 重复 PUT 仍一行 | 不存在商品 `404` |
| 乐观锁 | `WHERE version` | 成功后 version + 1 | 旧版本 `409` |
| 预约行锁 | `FOR UPDATE` | 同商品请求串行 | 锁超时 `503` |
| 有效预约唯一 | 部分唯一索引 | 数据库最多一行有效预约 | 指定约束的 `23505 -> 409` |
| transaction client | service 获取并传入 repo | 故障后全部回滚 | 跨连接会留下脏写 |

事务所有权清单：

```text
获取 client：MarketService.reserve
BEGIN/COMMIT/ROLLBACK：MarketService.reserve
事务 SQL：ListingsRepo.lock / ReservationsRepo.create / ListingsRepo.markReserved
release：MarketService.reserve finally
外部副作用：无
```

## 6. 最小可运行案例

最小案例只观察仓储映射和数据库约束，不启动浏览器。先按第 01 课迁移测试库并加载 fixture：

```bash
cd /tmp/web-fullstack-modernization/batch-5/market-api-capstone
cp apps/api/.env.test.example apps/api/.env.test
# 仅在本地编辑占位账号和密码
cd apps/api
node --env-file=.env.test migrate.mjs
node --env-file=.env.test test/fixture.mjs
```

然后使用 `psql` 读取，不输出连接串：

```bash
PGSERVICE=market_test psql -X -v ON_ERROR_STOP=1 -c \
  "SELECT title, price_cents, created_at, version
   FROM listings
   WHERE id='20000000-0000-4000-8000-000000000001';"
```

`market_test` 必须与 `.env.test` 指向同一专用测试库，连接参数来自 `.pg_service.conf`，密码来自
权限为 `0600` 的 passfile；含密码的 URL 不进入命令参数。

预期：

- title 为“夹具台灯”；
- `price_cents` 为 `19900`，不是 `199.00`；
- `created_at` 表示 `2026-10-11T00:00:00Z` 对应时间点；
- version 为 `1`。

失败证据包括：关系不存在、fixture 拒绝非 `_test`、服务端不是 18、连接失败。不能用复制一行
预期输出代替真实命令。

### 6.1 从最小案例扩展

扩展到 service 前，先画出每次写操作的四项契约：

| 写操作 | 授权 | 事务 owner | 幂等/冲突 | 数据库最后防线 |
| --- | --- | --- | --- | --- |
| 创建商品 | 已认证 | 单 INSERT | 非幂等，201 | DTO + CHECK + FK |
| 编辑商品 | owner | 单 UPDATE | version 冲突 409 | owner/version 条件 |
| 收藏 | 已认证 | 单语句 | PUT/DELETE 目标幂等 | 复合 PK |
| 预约 | 已认证且非 owner | service transaction | 状态冲突 409 | 行锁 + 部分唯一索引 |

这张表是新增 mutation 的最低设计输入；没有说明授权、事务、重试和冲突，就不应先写 controller。

## 7. 邻里集市集成案例

运行第 01 课验收测试时，预约部分真正经过 HTTP、session、service、repository 和数据库：

```js
const competing = await Promise.all([
  request(`/listings/${listingId}/reservations`, "POST", undefined, buyer),
  request(`/listings/${listingId}/reservations`, "POST", undefined, buyer2)
]);

assert.deepEqual(
  competing.map((result) => result.status).sort(),
  [201, 409]
);
```

这只是必要片段；唯一完整测试文件仍是第 01 课的
`apps/api/test/api.test.mjs`。集成验收还直接查询：

```sql
SELECT id, buyer_id, status FROM reservations WHERE listing_id=$1;
```

必须得到一行，并确认 buyer 是两个竞争者之一。随后 GET Listing 应得到：

```json
{
  "status": "reserved",
  "version": 3
}
```

版本从初始 `1` 经一次合法编辑到 `2`，再由成功预约到 `3`。HTTP 结果和数据库行同时断言，避免
只看响应却遗漏双写。

## 8. 常见错误与排查路径

### 明确错误示例：事务仓储偷偷使用 pool

错误局部改动：

```ts
// 错误：无视调用者传入的 client
await this.db.pool.query(
  "INSERT INTO reservations(id,listing_id,buyer_id) VALUES ($1,$2,$3)",
  [id, listingId, buyerId]
);
```

| 五段诊断 | 本例记录 |
| --- | --- |
| 现象 | 注入 `markReserved` 失败后，Listing 仍 available，但 reservation 留在表中 |
| 证据 | HTTP/服务调用失败；`SELECT reservations` 却返回一行 |
| 原因 | INSERT 在 pool 的另一连接上自动提交，不属于 service 的事务 |
| 修复 | repository 方法必须接收并使用 `PoolClient`；事务 owner 负责传递 |
| 复验 | 同样故障注入后 reservation 为 0 行、Listing 状态/version 不变，下一请求仍可用 |

### 其他错误

| 现象 | 证据 | 原因 | 修复 |
| --- | --- | --- | --- |
| 两个请求都 201 | HTTP 状态 + DB 两行 | 无锁或无唯一索引 | 恢复两层保护，重跑并发 |
| 第二请求长期卡住 | `pg_stat_activity`、lock timeout | 忘记 COMMIT/ROLLBACK/release | 检查 finally 与超时 |
| 旧编辑覆盖新值 | UPDATE 不带 version | 只在内存比较 | 条件 UPDATE，零行映射 409 |
| `%` 搜索命中全部 | SQL pattern 与参数 | 未转义通配符 | 转义 `\%`、`\_` 并声明 ESCAPE |
| 预约自己的商品成功 | row owner 与 user | 身份字段来自 body | buyer 只取 session，service 比 owner |
| 价格 `19.9` 入库 | 请求 JSON、列类型 | 使用 numeric/浮点或强制 round | DTO `IsInt` + integer CHECK |

## 9. 课后题

**问题 1：有部分唯一索引，为什么还要 `FOR UPDATE`？**

参考答案：唯一索引能拒绝第二个有效预约，但行锁让 service 在一致状态上检查 owner/status，并把
reservation 与 Listing 状态/version 原子更新；错误也能映射为明确业务语义。

**问题 2：有 `FOR UPDATE`，为什么还要唯一索引？**

参考答案：未来其他代码路径、脚本或缺陷可能绕过锁。数据库约束是跨进程、跨入口最后防线。

**问题 3：锁超时为什么不是 409？**

参考答案：请求只是暂时没获得锁，尚未确认资源状态；409 表示已知状态冲突，503 表示可稍后重试
的依赖繁忙。

**问题 4：收藏 DELETE 重复执行为什么仍返回成功？**

参考答案：目标是“不收藏”。重复 DELETE 后状态仍满足目标，没有新增副作用，便于网络重试。

**问题 5：为什么不能在预约事务里直接发邮件？**

参考答案：邮件不可随数据库 ROLLBACK 撤回。应提交 outbox 后异步、幂等发送。

## 10. 实践练习

### 基础：金额边界

分别提交 `0`、`100000000`、`-1`、`1.5`。

参考答案：前两者可创建；后两者 `400`。数据库直接插入越界值还应由 CHECK 拒绝。测试必须删除
自己创建的数据。

### 进阶：20 人预约竞争

创建一个 seller、20 个独立 buyer 会话和一个商品，同时发起 20 个 HTTP 请求。

参考答案与判定：恰好一个 `201`、十九个 `409`；数据库恰好一条 active reservation；Listing
为 reserved 且 version 只增加一次。不能把 lock timeout 预期写成 409；若出现 503，应记录并
分析超时预算。

### 故障注入：INSERT 后失败

复用唯一测试文件中的 query 注入，在 reservation INSERT 后、Listing UPDATE 前抛错。

参考答案与判定：调用失败；reservation 为 0；Listing 保持 available 和原 version；连接释放后
下一请求可执行。删除断言或改成“允许一行”不算修复。

## 11. 阶段验收

在 PostgreSQL 18 可用并完成两库迁移后执行：

```bash
cd /tmp/web-fullstack-modernization/batch-5/market-api-capstone
pnpm test
```

预期：Node test runner 报一项综合测试通过；日志包含脱敏的 `postgres_evidence`，并发状态排序为
测试内部断言的 `[201, 409]`。失败时至少保存：

- 测试名称、退出码；
- PostgreSQL 服务端主版本与测试库名；
- HTTP status 和 `code`，不保存 Cookie/CSRF；
- reservations 行数与 Listing status/version；
- 若锁超时，保存 SQLSTATE `55P03` 和请求 ID，不保存 SQL 参数。

验收清单：

- [ ] 价格在 DTO、domain、SQL、HTTP 中始终为整数分。
- [ ] 对外时间由 `toISOString()` 生成 UTC ISO。
- [ ] repository 不决定当前用户权限。
- [ ] service 不拼 SQL，也不接受 body 中的 owner/buyer。
- [ ] 事务内三个仓储操作使用同一 `PoolClient`。
- [ ] 编辑的 owner 与 version 都进入 UPDATE 条件。
- [ ] 收藏重复 PUT/DELETE 结果稳定。
- [ ] 并发预约只有一个赢家，数据库仍有唯一约束。
- [ ] 事务故障注入证明回滚和连接释放。

未连接 PostgreSQL 18 时，本节只能记录“静态审查完成，运行验收未执行”。

## 12. 常见问题

**为什么列表 count 也放事务？**

REPEATABLE READ READ ONLY 让 items 与 total 看见同一快照，避免两条查询之间插入造成明显矛盾。
大数据量分页还需分析性能和 keyset 方案，本章保留统一契约的 page/pageSize。

**为什么 service 先 GET 再 UPDATE，不直接用零行判断 403/409？**

先读让本章明确区分不存在、非 owner 和旧版本。UPDATE 仍重复带 owner/version，防止读写之间
状态变化。高敏感资源还可在一个事务中锁定后判断。

**能用 Redis 锁代替 `FOR UPDATE` 吗？**

不能作为本章正确性基础。Redis 锁引入租约、网络分区和双系统一致性；最终唯一性仍应由主数据
库约束。

**金额上限为什么是 100000000 分？**

这是本课程业务上限，不是 JavaScript 或 PostgreSQL 的极限。真实产品应由业务和货币规则确定，
变更时同步 DTO、数据库迁移、合同和测试。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [node-postgres Transactions](https://node-postgres.com/features/transactions)：同一 client 规则。
- [PostgreSQL 18 Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html)：隔离级别。
- [PostgreSQL 18 Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html)：行锁。
- [PostgreSQL 18 Partial Indexes](https://www.postgresql.org/docs/18/indexes-partial.html)：有效预约唯一性。
- [PostgreSQL 18 Error Codes](https://www.postgresql.org/docs/18/errcodes-appendix.html)：`23505`、`55P03`。
- [MDN Date `toISOString`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)：UTC 输出。
- [HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)：状态码语义。

## 我现在能做到什么

我能把领域不变量分配给 DTO、service 和数据库，把 SQL 留在仓储、把事务留在用例服务，并用
同一 client、行锁和唯一索引证明预约只有一个赢家；我也能用 409、503 和回滚证据区分真正冲突、
暂时繁忙与实现缺陷。

## 单元导航

[返回第 10 章入口](../10-api-capstone.md) ·
[上一课：工作区、配置与迁移启动](01-workspace-config-migration-bootstrap.md) ·
[下一课：Session、Controller 与授权接线](03-session-controllers-authorization-wiring.md)
