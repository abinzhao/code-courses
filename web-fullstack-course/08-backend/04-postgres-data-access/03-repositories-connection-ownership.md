# 仓储契约与事务连接所有权

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | `Queryable` 契约、ListingsRepository、`withTransaction` 与连接身份测试 |
| 练习目录 | `market-api-lab/` |
| 最小运行方式 | **内存 fake queryable**，只观察调用和对象身份 |
| 真实集成方式 | PostgreSQL 18 的 Pool/PoolClient，事务前记录版本、目标和迁移状态 |
| 核心不变量 | `BEGIN`、所有事务 SQL、`COMMIT/ROLLBACK` 必须在同一个 client |
| 仓储边界 | 仓储接受调用方传入的查询器，不自行 connect、不决定 HTTP 状态 |
| 失败证据 | 仓储隐藏 checkout、client 身份变化、漏 rollback/release 均由测试或池超时暴露 |

## 1. 任务背景

`pool.query("BEGIN")` 看起来能开启事务，但下一次 `pool.query(...)` 可能借到另一条连接。PostgreSQL
事务属于数据库会话，不属于 JavaScript 调用栈：

```text
pool.query("BEGIN")  -> client A
pool.query("UPDATE") -> client B
pool.query("COMMIT") -> client C
```

这三条语句都可能执行成功，却没有形成预期事务。另一个常见问题是服务层已经拿到 client，仓储
内部仍调用模块全局 Pool。读代码的人看到 `withTransaction`，实际写入却绕出事务边界。

解决方法不是让每个仓储都管理事务，而是倒置所有权：组合根拥有 Pool，事务协调器 checkout 一条
client，服务层把这个 client 作为 `Queryable` 显式传给仓储。仓储只负责 SQL 和行映射。

## 2. 学习目标

完成本课后，你能够：

1. 定义 Pool 与 PoolClient 都能满足的最小查询契约；
2. 让仓储依赖调用方传入的 Queryable，不导入全局 Pool；
3. 区分单条普通查询、事务协调与业务服务三种 owner；
4. 用 `try/catch/finally` 保证 commit、rollback 和 release 顺序；
5. 测试一个事务内所有仓储调用收到同一 client 对象；
6. 解释仓储为什么不返回 HTTP 响应、不读 Cookie、不自行重试；
7. 为真实 PostgreSQL 集成保留版本、连接目标、迁移和回滚证据。

## 3. 预备知识

先完成：

- [连接、TLS、连接池与超时](01-connections-tls-pools-timeouts.md)；
- [参数化 SQL、类型映射与 SQLSTATE](02-parameterized-sql-types-sqlstate.md)。

保留上一课的 `mapListingRow` 和错误映射。创建目录：

```bash
cd market-api-lab
mkdir -p src/db src/listings src/favorites src/services test
```

本课不要求先启动数据库。先运行 fake 测试证明调用图，再在 PostgreSQL 18 隔离库执行真实
rollback 测试。fake 不能证明 SQL 语法、约束、锁或事务真的生效。

## 4. 核心理论

### 4.1 Queryable 是能力，不是具体类

仓储真正需要的是：

```text
给定 QueryConfig -> 返回 rows/rowCount
```

Pool 和已 checkout 的 PoolClient 都提供 `query`。把依赖缩小到这个能力后：

- 非事务读取可以把 Pool 传入；
- 事务业务把同一 PoolClient 传入；
- 单元测试可传入记录器；
- 仓储不需要知道连接怎样获得和释放。

在 TypeScript 项目中可定义：

```ts
import type { QueryConfig, QueryResult, QueryResultRow } from "pg";

export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(
    config: QueryConfig,
  ): Promise<QueryResult<R>>;
}
```

本课 JavaScript 示例通过约定实现同一结构。类型只能约束形状，运行时所有权仍要由测试和代码
审查证明。

### 4.2 谁创建，谁关闭；谁 checkout，谁 release

| 资源/行为 | owner | 原因 |
| --- | --- | --- |
| Pool 创建与 `end()` | 应用组合根 | 生命周期等于进程 |
| client checkout/release | 事务协调器 | 能形成完整 try/finally |
| BEGIN/COMMIT/ROLLBACK | 事务协调器 | 都必须命中同一 client |
| 业务规则与调用顺序 | 服务层 | 组合多个仓储 |
| SQL 与行映射 | 仓储 | 隔离持久化细节 |
| HTTP status/DTO | 控制器/异常过滤器 | 不污染数据访问 |

仓储若同时 checkout、开启事务和映射 HTTP，会让上层无法组合原子操作，也难以测试泄漏。

### 4.3 事务 client 必须显式流动

常用两种 API：

```js
withTransaction(async (client) => {
  const listings = createListingsRepository(client);
  const favorites = createFavoritesRepository(client);
  // 所有写入显式使用同一个 client
});
```

或让仓储方法接收 `db` 参数。前者减少每个方法参数，后者让依赖在调用点更明显。无论选择哪种，
都不能在仓储模块偷偷导入全局 Pool。

### 4.4 仓储返回领域结果，不决定 HTTP

`findById` 返回领域对象或 `null`。是返回 404、隐藏存在性还是继续做对象授权，由服务层根据
用例决定。`updateOwned` 可返回受影响行数/新对象，上层再区分不存在、非 owner 和版本冲突。

仓储也不从 Cookie 获取 userId。身份由认证层建立，服务层把可信 actor ID 传入；SQL 仍应在写
条件中包含 owner，形成纵深防御。

### 4.5 事务回调不能逃逸 client

`withTransaction` 返回后 client 已 release。不要把 client、绑定仓储或惰性 iterator 缓存在外部：

```js
let escapedRepository;
await withTransaction(pool, async (client) => {
  escapedRepository = createListingsRepository(client);
});
await escapedRepository.findById(id); // 生命周期已经结束
```

事务回调必须在返回前完成所有数据库工作。需要稍后执行的外部副作用应写入 outbox，而不是保留
client。

## 5. 元素、属性、API 或配置清单

| 契约/API | owner | 成功证据 | 失败模式 |
| --- | --- | --- | --- |
| `Queryable.query` | Pool 或 PoolClient | QueryConfig 被执行 | 仓储依赖具体全局池 |
| `create...Repository(db)` | 组合/服务层 | db 显式注入 | 构造器内部 connect |
| `pool.connect()` | 事务协调器 | 得到唯一 client | checkout 后未 release |
| `client.query("BEGIN")` | 事务协调器 | 在业务 SQL 前 | 用 pool.query 分散 |
| `client.query("COMMIT")` | 事务协调器 | 回调成功后一次 | 外部副作用已先发生 |
| `client.query("ROLLBACK")` | 事务协调器 | 回调失败后尝试 | rollback 错误覆盖根因 |
| `client.release()` | 事务协调器 finally | 成败都执行 | 池最终耗尽 |
| `rowCount` | 仓储/服务边界 | 判断写入结果 | 不查原因就猜 HTTP |
| `null` | 查询未找到 | 上层决定策略 | 仓储直接构造 404 |
| `Error.cause` | 错误边界 | 保留 rollback 等上下文 | 对外泄漏数据库 detail |

## 6. 最小可运行案例

本案例是**内存 fake queryable**。它不解析 SQL、不提供隔离，只证明仓储使用注入对象。

### 6.1 仓储

创建 `src/listings/listings-repository.mjs`：

```js
import { mapListingRow } from "./listing-query.mjs";

const SELECT_COLUMNS = `
  id, title, description, price_cents, owner_id,
  status, version, created_at
`;

export function createListingsRepository(db) {
  if (!db || typeof db.query !== "function") {
    throw new Error("Queryable is required");
  }

  return Object.freeze({
    async findById(id) {
      const result = await db.query({
        text: `SELECT ${SELECT_COLUMNS} FROM listings WHERE id = $1`,
        values: [id],
      });
      return result.rows[0] ? mapListingRow(result.rows[0]) : null;
    },

    async updateTitleOwned({ id, ownerId, expectedVersion, title }) {
      const result = await db.query({
        text: `UPDATE listings
               SET title = $1, version = version + 1
               WHERE id = $2 AND owner_id = $3 AND version = $4
               RETURNING ${SELECT_COLUMNS}`,
        values: [title, id, ownerId, expectedVersion],
      });
      return result.rows[0] ? mapListingRow(result.rows[0]) : null;
    },
  });
}
```

仓储没有导入 `pool.mjs`，没有 `connect()`、Cookie 或 HTTP status。

### 6.2 记录器测试

创建 `test/listings-repository.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createListingsRepository } from "../src/listings/listings-repository.mjs";

const row = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "折叠桌",
  description: "九成新",
  price_cents: 28000,
  owner_id: "00000000-0000-4000-8000-000000000001",
  status: "available",
  version: 2,
  created_at: new Date("2026-10-11T08:00:00.000Z"),
};

test("uses the injected queryable and parameter values", async () => {
  const calls = [];
  const fake = {
    async query(config) {
      calls.push(config);
      return { rows: [row], rowCount: 1 };
    },
  };
  const repository = createListingsRepository(fake);
  const listing = await repository.findById(row.id);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].text.includes(row.id), false);
  assert.deepEqual(calls[0].values, [row.id]);
  assert.equal(listing.priceCents, 28000);
  assert.equal(listing.createdAt, "2026-10-11T08:00:00.000Z");
});

test("represents a missing row as null", async () => {
  const repository = createListingsRepository({
    async query() {
      return { rows: [], rowCount: 0 };
    },
  });
  assert.equal(await repository.findById("missing"), null);
});
```

运行：

```bash
node --test test/listings-repository.test.mjs
```

预期 2 条测试通过。它们不能证明 PostgreSQL 接受 SQL。

### 6.3 从最小仓储扩展

1. `findById` 只验证查询注入、参数和 null。
2. `updateTitleOwned` 同时携带 owner 与 version，验证参数顺序。
3. 服务层先读取对象决定 403/404 策略，再执行带条件的 UPDATE。
4. 最后在真实数据库测试 rowCount、约束和事务回滚。

不要一开始把所有表、HTTP 和认证塞进同一 fake；那只会复制实现。

## 7. 邻里集市集成案例

### 7.1 事务协调器

创建 `src/db/transaction.mjs`：

```js
export async function withTransaction(pool, work) {
  const client = await pool.connect();
  let began = false;
  let releaseError;
  try {
    await client.query("BEGIN");
    began = true;
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    if (began) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        releaseError =
          rollbackError instanceof Error
            ? rollbackError
            : new Error("ROLLBACK failed");
        throw new AggregateError(
          [error, releaseError],
          "transaction and rollback both failed",
        );
      }
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}
```

若 `BEGIN` 本身失败，当前实现不发送 ROLLBACK；无论何处失败都 release。生产日志应记录稳定事件、
SQLSTATE 和 requestId，不记录 SQL 参数。`pg` 的 `release(error)` 会销毁健康未知的连接，而不是
把它归还池。

### 7.2 连接身份测试

创建 `test/transaction-ownership.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { withTransaction } from "../src/db/transaction.mjs";
import { createListingsRepository } from "../src/listings/listings-repository.mjs";

function transactionDouble({ failRollback = false } = {}) {
  const calls = [];
  const releases = [];
  const client = {
    async query(input) {
      calls.push({ receiver: this, input });
      if (input === "ROLLBACK" && failRollback) {
        throw new Error("rollback failed");
      }
      if (typeof input === "string") return { rows: [], rowCount: null };
      return { rows: [], rowCount: 0 };
    },
    release(error) {
      releases.push(error);
    },
  };
  const pool = {
    async connect() {
      return client;
    },
    async query() {
      throw new Error("hidden pool.query call");
    },
  };
  return { pool, client, calls, releases };
}

test("uses one checked-out client for begin, repository SQL and commit", async () => {
  const double = transactionDouble();
  await withTransaction(double.pool, async (client) => {
    assert.equal(client, double.client);
    const listings = createListingsRepository(client);
    assert.equal(await listings.findById("missing"), null);
  });

  assert.deepEqual(
    double.calls.map(({ input }) => typeof input === "string" ? input : input.text.trim().split(/\s+/)[0]),
    ["BEGIN", "SELECT", "COMMIT"],
  );
  assert.equal(double.calls.every(({ receiver }) => receiver === double.client), true);
  assert.deepEqual(double.releases, [undefined]);
});

test("rolls back and releases after work fails", async () => {
  const double = transactionDouble();
  await assert.rejects(
    withTransaction(double.pool, async () => {
      throw new Error("injected failure");
    }),
    /injected failure/,
  );
  assert.deepEqual(
    double.calls.map(({ input }) => input),
    ["BEGIN", "ROLLBACK"],
  );
  assert.deepEqual(double.releases, [undefined]);
});

test("destroys an unhealthy client and preserves both errors", async () => {
  const double = transactionDouble({ failRollback: true });
  await assert.rejects(
    withTransaction(double.pool, async () => {
      throw new Error("work failed");
    }),
    (error) =>
      error instanceof AggregateError &&
      error.errors[0].message === "work failed" &&
      error.errors[1].message === "rollback failed",
  );
  assert.equal(double.releases.length, 1);
  assert.match(double.releases[0].message, /rollback failed/);
});
```

运行：

```bash
node --test test/listings-repository.test.mjs test/transaction-ownership.test.mjs
```

预期累计 5 条测试通过。`pool.query` 被设为立即失败，能暴露仓储或服务偷偷绕回池的行为；
rollback 失败用 `release(error)` 明确销毁连接。

### 7.3 业务服务组合

预约服务在第 5 章展开；连接方式应保持：

```js
export async function renameListing(pool, command) {
  return withTransaction(pool, async (client) => {
    const listings = createListingsRepository(client);
    const current = await listings.findById(command.listingId);
    if (!current) throw new Error("NOT_FOUND");
    if (current.ownerId !== command.actorId) throw new Error("FORBIDDEN");

    const updated = await listings.updateTitleOwned({
      id: command.listingId,
      ownerId: command.actorId,
      expectedVersion: command.expectedVersion,
      title: command.title,
    });
    if (!updated) throw new Error("VERSION_CONFLICT");
    return updated;
  });
}
```

这里的首次读取用于决定领域错误；UPDATE 再次包含 owner/version，避免检查与写入之间失去约束。
“不存在”和“不是 owner”是否对外统一为 404/403 是授权策略，不能由仓储猜测。

### 7.4 真实 rollback 证据

只在隔离 PostgreSQL 18 测试库执行：

1. 记录客户端/服务端版本、脱敏目标和 `schema_migrations`。
2. 开启事务，插入一个 title 为 `rollback-probe`、价格 `1990` 分的虚构商品。
3. 注入异常，确认 `ROLLBACK`。
4. 用事务外查询确认该 ID 行数为 0。
5. 确认池仍可执行 `SELECT 1`，最后 `pool.end()`。

真实测试必须断言数据库最终状态，不能只断言 JavaScript 抛错。若 PostgreSQL 18 未启动，只保留
fake 测试与环境阻塞，不把 rollback 写成已验证。

## 8. 常见错误与排查路径

### 明确错误：事务中调用全局 Pool

```js
await client.query("BEGIN");
await globalPool.query("UPDATE listings SET ...");
await client.query("COMMIT");
```

| 五段 | 记录 |
| --- | --- |
| 现象 | 注入失败后 UPDATE 仍然存在，或并发时出现部分提交 |
| 证据 | 查询接收者身份不同；数据库 pid/txid 不属于同一会话 |
| 原因 | UPDATE 从 Pool 另借连接，逃出 client 事务 |
| 修复 | 仓储接受并只使用事务 client |
| 复验 | 身份测试全为同一对象；真实异常后数据库行数为 0 |

### 仓储自己 `connect()`

现象是服务层无法把多个仓储操作放进一个事务，测试也难判断谁释放。修复为构造时注入 Queryable，
checkout 只留在 transaction owner。

### catch 中漏 rollback

失败事务中的 client 可能保持 aborted 状态或持锁，归还池后污染后续请求。修复后注入业务异常，
断言顺序 `BEGIN -> ROLLBACK -> release`，并在真实库确认后续查询可用。

### rollback 错误覆盖原始业务错误

简单 `await rollback; throw original` 在 rollback 失败时会只看到 rollback 错误。使用 cause 或
`AggregateError` 保存两者，日志脱敏；连接健康未知时应销毁/不复用，具体采用 `pg` 当前 API。

### 事务回调返回后继续用仓储

现象可能是“Client was closed and is not queryable”或更危险的跨请求复用。禁止 client/仓储逃逸，
所有查询在回调内 await 完成。

## 9. 课后题

**问题 1：为什么 Pool 和 PoolClient 都能传给仓储？**

参考答案：仓储只依赖 query 能力。普通单语句由 Pool 自动借还；事务由调用方把已 checkout 的同一
client 传入。

**问题 2：仓储发现 null 时为什么不直接抛 404？**

参考答案：404 是 HTTP 适配决定；同一个 null 在内部任务、授权隐藏策略或可选关系中可能有不同
语义。仓储返回持久化事实，上层决定领域/协议结果。

**问题 3：UPDATE 已包含 ownerId，为什么服务层还先读取 owner？**

参考答案：带 owner 的 UPDATE 是最终写保护；预读用于区分不存在、无权和版本冲突，并应用领域
策略。二者职责不同，且不能只预读后无条件写。

## 10. 实践练习

### 基础：FavoritesRepository

实现 `put(userId, listingId)` 与 `delete(userId, listingId)`，构造器只接收 Queryable。判定标准：
values 参数化；userId 由服务传入；两次 put/delete 具有目标状态语义；fake 能证明没有全局 Pool。

### 进阶：事务上下文追踪

给测试 double 增加不可伪造的 `clientId`，让两个仓储在一个事务中记录相同 ID。判定标准：一个
事务只有一个 checkout/release；两个并行事务各自 ID 不同；日志不包含查询参数。

### 故障注入：隐藏 checkout

临时让 ListingsRepository 从传入 db 以外的 fake Pool 查询。现有
`hidden pool.query call` 必须先失败；恢复注入后，指定测试和完整测试均通过。再在隔离数据库
注入 UPDATE 后异常，确认无部分提交。

## 11. 阶段验收

- [ ] 仓储文件不导入全局 Pool，不调用 connect/end。
- [ ] Pool 创建/关闭只有组合根 owner。
- [ ] transaction owner checkout、BEGIN、COMMIT/ROLLBACK、release 顺序完整。
- [ ] 所有事务仓储收到同一个 client 对象。
- [ ] 失败路径 rollback，成败路径都 release。
- [ ] rollback 失败不会静默丢失原始错误。
- [ ] 仓储返回领域数据/null，不构造 HTTP 响应。
- [ ] actor ID 来自服务层可信身份，不由仓储读取 Cookie/body。
- [ ] fake 证据明确不代表 SQL、约束或真实事务。
- [ ] 真实回滚声明包含 PostgreSQL 18、目标、迁移与最终数据库状态。

## 12. 常见问题

**每个仓储方法都包一个事务更安全吗？**

不一定。事务边界应覆盖完整业务不变量；每方法自开事务会让跨仓储操作无法原子提交。纯单语句
本身已是数据库原子语句，是否需要更大事务由服务用例决定。

**可以用 AsyncLocalStorage 隐式传 client 吗？**

大型系统有时这样做，但隐式上下文增加调试和测试难度。本课程先使用显式传递，直到团队有清楚
的上下文生命周期、嵌套事务和丢失上下文策略。

**事务里可以调用邮件 API 吗？**

不应。数据库无法回滚已发送邮件，网络等待还会延长持锁。事务写业务事实与 outbox，第 8 章由
提交后的 worker 处理外部副作用。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [node-postgres：事务](https://node-postgres.com/features/transactions)
- [node-postgres：连接池 checkout/release](https://node-postgres.com/features/pooling)
- [PostgreSQL 18：BEGIN](https://www.postgresql.org/docs/18/sql-begin.html)
- [PostgreSQL 18：COMMIT](https://www.postgresql.org/docs/18/sql-commit.html)
- [PostgreSQL 18：ROLLBACK](https://www.postgresql.org/docs/18/sql-rollback.html)
- [PostgreSQL 18：事务隔离](https://www.postgresql.org/docs/18/transaction-iso.html)

## 我现在能做到什么

我能把 Pool、事务 client、服务和仓储的所有权分开，让一个事务中的全部 SQL 显式命中同一连接，
并用身份测试、回滚后的数据库状态与清理证据发现隐藏 checkout 和部分提交。

## 单元导航

[本章目录](../README.md#04-postgresql-数据访问) ·
[上一课：参数化 SQL、类型映射与 SQLSTATE](02-parameterized-sql-types-sqlstate.md) ·
[下一章：事务与并发](../05-transactions-concurrency/01-isolation-locks-races.md)
