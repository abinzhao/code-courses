# 原子预约与真实并发复现

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 原子预约事务、双 client barrier、最终状态断言与清理 |
| 练习目录 | `market-api-lab/` |
| 最小案例 | fake client 验证 SQL/事务顺序，明确**不证明数据库并发** |
| 核心案例 | 隔离 PostgreSQL 18 上两个真实 client 同时竞争 |
| 成功标准 | 恰好 1 个 created、1 个 RESERVATION_CONFLICT、active count 恰为 1 |
| 证据门槛 | 服务端/客户端 18、脱敏目标、schema/迁移状态、两个 PID、barrier、最终查询 |
| 清理边界 | 只清理本脚本生成的随机 fixture；不接触生产或共享业务数据 |

## 1. 任务背景

“并发测试”经常实际上是串行：

```js
await reserve(buyer1);
await reserve(buyer2);
```

第二次调用开始前第一次已经提交，只能证明冲突分支，不证明两个事务重叠。即便使用
`Promise.all`，若连接池 max 为 1 或第一个事务在第二个 checkout 前完成，也未形成数据库竞争。

本课用两个独立 PoolClient。两个事务都完成 `BEGIN`、记录不同 backend PID 并到达 barrier 后，
测试一次性释放双方去执行 `SELECT ... FOR UPDATE`。随后用结果集合和数据库最终状态双重判定：
一个提交并创建预约，另一个在获得锁后读到 reserved 并回滚。

## 2. 学习目标

完成本课后，你能够：

1. 用同一 client 执行预约事务的 BEGIN、锁、检查、INSERT、UPDATE 和 COMMIT；
2. 在 catch 中 rollback，在 finally 中 release；
3. 用两个独立 backend PID 和 barrier 证明事务确实同时就绪；
4. 将状态冲突与部分唯一索引 `23505` 映射为同一稳定领域冲突；
5. 同时断言调用结果、Reservation 数量、Listing 状态和 version；
6. 记录 PostgreSQL 18、连接目标和迁移/schema 状态，不泄漏凭据；
7. 在环境不满足时输出阻塞，而不是引用 PostgreSQL 16 或 fake 的结果。

## 3. 预备知识

先完成[上一课](01-isolation-locks-races.md)和[连接所有权教程](../04-postgres-data-access/03-repositories-connection-ownership.md)。

在自己的练习项目确认：

```bash
cd market-api-lab
pnpm list pg --depth 0
psql --version
mkdir -p scripts test
```

真实运行要求：

- `DATABASE_URL` 由受控 `.env` 或秘密注入，命令和日志不回显；
- `PG_POOL_MAX >= 2`；
- 目标是可销毁/隔离测试数据库；
- `users/listings/reservations` 与 `reservations_one_active_per_listing_idx` 已存在；
- 没有真实用户数据。

若无法确认最后两项，停止，不运行 fixture 清理。

## 4. 核心理论

### 4.1 预约事务的线性化点

本例让所有竞争者锁同一 Listing 行。谁先获得锁，谁先决定状态转换：

```text
BEGIN
SET LOCAL lock_timeout
SELECT ... FROM listings WHERE id=$1 FOR UPDATE  <- 竞争汇聚点
验证存在、非本人、available
INSERT reservation
UPDATE listing SET status='reserved', version=version+1
COMMIT
```

等待者获得锁时看到提交后的 reserved，于是返回冲突。部分唯一索引兜底其他写入路径。

### 4.2 锁内检查必须基于数据库事实

ownerId、status 和 version 从锁定行读取。不能使用锁前缓存的 Listing，也不能信任浏览器传来的
owner/status。buyerId 来自认证身份；本课用 fixture 参数模拟可信服务层输入。

### 4.3 失败分类决定是否提交

| 失败 | 事务动作 | API 语义 |
| --- | --- | --- |
| Listing 不存在 | rollback | 404（或授权隐藏策略） |
| buyer 是 owner | rollback | 403 SELF_RESERVATION |
| status 非 available | rollback | 409 RESERVATION_CONFLICT |
| unique constraint 兜底 | rollback | 409 RESERVATION_CONFLICT |
| lock timeout | rollback | 409/503，按产品恢复策略 |
| 未知数据库错误 | rollback | 500，脱敏记录 |

错误响应在 rollback 完成后产生。若 rollback 自身失败，需要保留两个错误并把连接视为不健康。

### 4.4 真并发证据需要就绪门槛

本课 barrier 只在每个事务完成这些步骤后计数：

1. 从池得到独立 client；
2. BEGIN 成功；
3. 获得 `pg_backend_pid()`；
4. 报告 ready。

两方都 ready 后才释放。PID 不同证明数据库会话不同；barrier 证明双方在任一业务锁之前同时存在。
最终一个等待另一个，由行锁决定顺序。

### 4.5 结果断言不能只看 Promise

代码可能错误地返回 created，却在 COMMIT 前失败；也可能响应冲突但已经插入脏行。因此同时查询：

```text
active reservations = 1
listing.status = reserved
listing.version = initialVersion + 1
winning reservation.buyer_id 属于两个 fixture buyer 之一
```

还应确认失败者没有预约。数据库最终断言是并发验收的一部分。

### 4.6 测试夹具必须可归属

每次运行使用随机 UUID 和带随机后缀的 `example.test` 邮箱，只删除本轮记录。脚本必须先确认目标
major/schema；若中途失败，finally 按外键顺序清理本轮 fixture。不要用“删除所有 reservations”
来方便重跑。

## 5. 元素、属性、API 或配置清单

| 元素 | 作用 | 必须断言 | 边界 |
| --- | --- | --- | --- |
| 两个 PoolClient | 独立数据库会话 | backend PID 不同 | Pool max 至少 2 |
| barrier | 同时释放竞争 | ready 数达到 2 | 不模拟数据库锁 |
| `BEGIN` | 原子边界开始 | 与后续同一 client | 不能用 pool.query |
| `SET LOCAL lock_timeout` | 限制本事务锁等待 | 只在事务内有效 | 不替代正确锁顺序 |
| `FOR UPDATE` | 锁 Listing 行 | 等待者重读新状态 | 只锁命中行 |
| Reservation INSERT | 写预约事实 | 使用参数与随机 ID | buyerId 来自可信身份 |
| Listing UPDATE | 状态/version 同步 | rowCount=1 | 与 INSERT 同事务 |
| `COMMIT` | 发布赢家变化 | 仅赢家调用 | 外部副作用不在事务中 |
| `ROLLBACK` | 清除输家/故障变化 | catch 中执行 | 最终仍查询数据库 |
| partial unique index | 跨路径兜底 | 索引存在、constraint 稳定 | 不代替错误映射 |
| `Promise.allSettled` | 收集两个独立结果 | 1 fulfilled + 1 rejected | 本身不保证并发 |

## 6. 最小可运行案例

本案例用**fake client**证明单次预约的 SQL 顺序和失败 rollback。它没有 PostgreSQL，也没有锁。

创建 `test/reservation-flow.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";

async function reserveWithClient(client, command) {
  await client.query("BEGIN");
  try {
    const locked = await client.query(
      `SELECT owner_id, status
       FROM listings WHERE id = $1 FOR UPDATE`,
      [command.listingId],
    );
    const listing = locked.rows[0];
    if (!listing) throw new Error("NOT_FOUND");
    if (listing.owner_id === command.buyerId) throw new Error("SELF_RESERVATION");
    if (listing.status !== "available") throw new Error("RESERVATION_CONFLICT");
    await client.query(
      `INSERT INTO reservations(id, listing_id, buyer_id)
       VALUES ($1, $2, $3)`,
      [command.reservationId, command.listingId, command.buyerId],
    );
    await client.query(
      `UPDATE listings
       SET status = 'reserved', version = version + 1
       WHERE id = $1`,
      [command.listingId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function fakeClient(status) {
  const calls = [];
  return {
    calls,
    async query(text, values = []) {
      calls.push({ text, values });
      if (String(text).startsWith("SELECT owner_id")) {
        return { rows: [{ owner_id: "seller", status }] };
      }
      return { rows: [], rowCount: 1 };
    },
  };
}

test("orders one successful reservation transaction", async () => {
  const client = fakeClient("available");
  await reserveWithClient(client, {
    reservationId: "reservation",
    listingId: "listing",
    buyerId: "buyer",
  });
  assert.deepEqual(
    client.calls.map(({ text }) => String(text).trim().split(/\s+/)[0]),
    ["BEGIN", "SELECT", "INSERT", "UPDATE", "COMMIT"],
  );
});

test("rolls back a conflict before insert", async () => {
  const client = fakeClient("reserved");
  await assert.rejects(
    reserveWithClient(client, {
      reservationId: "reservation",
      listingId: "listing",
      buyerId: "buyer",
    }),
    /RESERVATION_CONFLICT/,
  );
  assert.deepEqual(
    client.calls.map(({ text }) => String(text).trim().split(/\s+/)[0]),
    ["BEGIN", "SELECT", "ROLLBACK"],
  );
});
```

运行：

```bash
node --test test/reservation-flow.test.mjs
```

预期 2 条测试通过。它们只证明控制流，不证明 SQL 可执行、两个 client 竞争或最终数据库状态。

## 7. 邻里集市集成案例

### 7.1 完整真实并发脚本

创建 `scripts/reservation-concurrency.mjs`：

```js
import { randomUUID } from "node:crypto";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (process.env.ALLOW_ISOLATED_DB_TEST !== "yes") {
  throw new Error("set ALLOW_ISOLATED_DB_TEST=yes only for an isolated database");
}

const targetUrl = new URL(process.env.DATABASE_URL);
const safeTarget = {
  host: targetUrl.hostname,
  port: Number(targetUrl.port || 5432),
  database: targetUrl.pathname.slice(1),
};
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
  connectionTimeoutMillis: 3_000,
  statement_timeout: 8_000,
});

function barrier(parties) {
  let arrivals = 0;
  let open;
  const opened = new Promise((resolve) => {
    open = resolve;
  });
  return {
    async arriveAndWait() {
      arrivals += 1;
      if (arrivals === parties) open();
      await opened;
    },
  };
}

class ReservationConflict extends Error {
  constructor(message = "RESERVATION_CONFLICT") {
    super(message);
    this.code = "RESERVATION_CONFLICT";
  }
}

const readyEvidence = [];

async function rollback(client, original) {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    const unhealthy =
      rollbackError instanceof Error
        ? rollbackError
        : new Error("ROLLBACK failed");
    throw new AggregateError(
      [original, unhealthy],
      "reservation and rollback both failed",
    );
  }
}

async function reserve({ listingId, buyerId, gate, label }) {
  const client = await pool.connect();
  let began = false;
  let releaseError;
  try {
    await client.query("BEGIN");
    began = true;
    await client.query("SET LOCAL lock_timeout = '5s'");
    const identity = await client.query(
      "SELECT pg_backend_pid() AS pid, clock_timestamp() AS ready_at",
    );
    const pid = identity.rows[0].pid;
    const readyAt = identity.rows[0].ready_at.toISOString();
    readyEvidence.push({ label, pid, readyAt });
    await gate.arriveAndWait();

    const locked = await client.query(
      `SELECT owner_id, status, version, clock_timestamp() AS acquired_at
       FROM listings
       WHERE id = $1
       FOR UPDATE`,
      [listingId],
    );
    const listing = locked.rows[0];
    if (!listing) throw new Error("NOT_FOUND");
    if (listing.owner_id === buyerId) throw new Error("SELF_RESERVATION");
    if (listing.status !== "available") throw new ReservationConflict();

    const reservationId = randomUUID();
    await client.query(
      `INSERT INTO reservations(id, listing_id, buyer_id)
       VALUES ($1, $2, $3)`,
      [reservationId, listingId, buyerId],
    );
    const updated = await client.query(
      `UPDATE listings
       SET status = 'reserved', version = version + 1
       WHERE id = $1
       RETURNING version`,
      [listingId],
    );
    if (updated.rowCount !== 1) throw new Error("LISTING_UPDATE_FAILED");
    await client.query("COMMIT");
    began = false;
    return {
      outcome: "created",
      label,
      pid,
      readyAt,
      acquiredAt: listing.acquired_at.toISOString(),
      reservationId,
    };
  } catch (error) {
    if (began) {
      try {
        await rollback(client, error);
      } catch (aggregate) {
        releaseError = aggregate.errors[1];
        throw aggregate;
      }
    }
    if (
      error?.code === "23505" &&
      error?.constraint === "reservations_one_active_per_listing_idx"
    ) {
      throw new ReservationConflict();
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

const fixture = {
  sellerId: randomUUID(),
  buyer1Id: randomUUID(),
  buyer2Id: randomUUID(),
  listingId: randomUUID(),
};

async function probe() {
  const version = await pool.query(`
    SELECT current_database() AS database,
           current_setting('server_version') AS server_version,
           current_setting('server_version_num')::integer AS server_version_num
  `);
  const row = version.rows[0];
  const serverMajor = Math.floor(row.server_version_num / 10000);
  if (serverMajor !== 18) {
    throw new Error(`PostgreSQL 18 required; observed major ${serverMajor}`);
  }
  if (process.env.PSQL_CLIENT_MAJOR !== "18") {
    throw new Error("record psql --version and set PSQL_CLIENT_MAJOR=18");
  }

  const schema = await pool.query(`
    SELECT to_regclass('public.users') IS NOT NULL AS users,
           to_regclass('public.listings') IS NOT NULL AS listings,
           to_regclass('public.reservations') IS NOT NULL AS reservations,
           to_regclass('public.reservations_one_active_per_listing_idx')
             IS NOT NULL AS active_index,
           to_regclass('public.schema_migrations') IS NOT NULL AS migration_table
  `);
  const readiness = schema.rows[0];
  if (!readiness.users || !readiness.listings ||
      !readiness.reservations || !readiness.active_index) {
    throw new Error("required migrated relations are missing");
  }

  let migrationState = { tableExists: false };
  if (readiness.migration_table) {
    const migrations = await pool.query(
      `SELECT count(*)::integer AS count, max(applied_at) AS latest
       FROM schema_migrations`,
    );
    migrationState = {
      tableExists: true,
      count: migrations.rows[0].count,
      latest: migrations.rows[0].latest?.toISOString() ?? null,
    };
  }

  console.log(JSON.stringify({
    event: "preflight",
    clientMajor: 18,
    serverVersion: row.server_version,
    serverMajor,
    target: safeTarget,
    database: row.database,
    schema: readiness,
    migrationState,
  }));
}

async function setup() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [id, email] of [
      [fixture.sellerId, `seller-${idFragment(fixture.sellerId)}@example.test`],
      [fixture.buyer1Id, `buyer1-${idFragment(fixture.buyer1Id)}@example.test`],
      [fixture.buyer2Id, `buyer2-${idFragment(fixture.buyer2Id)}@example.test`],
    ]) {
      await client.query(
        `INSERT INTO users(id, email, password_hash)
         VALUES ($1, $2, 'lab-only-not-a-password-hash')`,
        [id, email],
      );
    }
    await client.query(
      `INSERT INTO listings(
         id, title, description, price_cents, owner_id, status, version
       ) VALUES ($1, '并发测试折叠桌', '隔离数据库 fixture', 28000, $2,
                 'available', 1)`,
      [fixture.listingId, fixture.sellerId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function idFragment(id) {
  return id.slice(0, 8);
}

async function assertFinalState(initialVersion) {
  const result = await pool.query(
    `SELECT l.status, l.version,
            count(r.*) FILTER (
              WHERE r.status IN ('pending', 'confirmed')
            )::integer AS active_count,
            array_agg(r.buyer_id) FILTER (WHERE r.id IS NOT NULL) AS buyers
     FROM listings l
     LEFT JOIN reservations r ON r.listing_id = l.id
     WHERE l.id = $1
     GROUP BY l.id`,
    [fixture.listingId],
  );
  const row = result.rows[0];
  if (!row ||
      row.status !== "reserved" ||
      row.version !== initialVersion + 1 ||
      row.active_count !== 1 ||
      row.buyers.length !== 1 ||
      ![fixture.buyer1Id, fixture.buyer2Id].includes(row.buyers[0])) {
    throw new Error(`invalid final state: ${JSON.stringify(row)}`);
  }
  return row;
}

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "DELETE FROM reservations WHERE listing_id = $1",
      [fixture.listingId],
    );
    await client.query("DELETE FROM listings WHERE id = $1", [fixture.listingId]);
    await client.query(
      "DELETE FROM users WHERE id = ANY($1::uuid[])",
      [[fixture.sellerId, fixture.buyer1Id, fixture.buyer2Id]],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

let setupComplete = false;
try {
  await probe();
  await setup();
  setupComplete = true;
  const initial = await pool.query(
    "SELECT version FROM listings WHERE id = $1",
    [fixture.listingId],
  );
  const initialVersion = initial.rows[0].version;
  const gate = barrier(2);
  const results = await Promise.allSettled([
    reserve({
      listingId: fixture.listingId,
      buyerId: fixture.buyer1Id,
      gate,
      label: "buyer-1",
    }),
    reserve({
      listingId: fixture.listingId,
      buyerId: fixture.buyer2Id,
      gate,
      label: "buyer-2",
    }),
  ]);

  const created = results.filter((result) => result.status === "fulfilled");
  const conflicts = results.filter(
    (result) =>
      result.status === "rejected" &&
      result.reason?.code === "RESERVATION_CONFLICT",
  );
  if (created.length !== 1 || conflicts.length !== 1) {
    throw new Error(`unexpected outcomes: ${JSON.stringify(results)}`);
  }
  if (
    readyEvidence.length !== 2 ||
    new Set(readyEvidence.map((item) => item.pid)).size !== 2
  ) {
    throw new Error("two distinct ready database sessions were not observed");
  }
  const finalState = await assertFinalState(initialVersion);
  console.log(JSON.stringify({
    event: "concurrency_result",
    outcomes: ["created", "RESERVATION_CONFLICT"],
    readyEvidence,
    winner: created[0].value,
    finalState,
  }));
} finally {
  if (setupComplete) await cleanup();
  await pool.end();
}
```

脚本只在通过显式隔离门禁后写入随机 fixture。它不会打印连接串、邮箱口令或 SQL 参数。
`readyEvidence` 在 barrier 前收集两个会话并断言 PID 唯一；它是测试证据，不应进入产品 HTTP
响应或普通业务日志。

正常 rollback 后 `release(undefined)` 可复用连接；rollback 自身失败时，`release(error)` 让
`pg` 销毁健康未知的连接，同时 `AggregateError` 保留业务错误与 rollback 错误。

### 7.2 运行命令与预期

先真实执行并记录：

```bash
psql --version
```

确认输出为 18.x 后，从不会回显秘密的环境运行：

```bash
PSQL_CLIENT_MAJOR=18 ALLOW_ISOLATED_DB_TEST=yes \
  node --env-file=.env scripts/reservation-concurrency.mjs
```

预期事件：

1. `preflight` 的 serverMajor/clientMajor 都是 18，目标已脱敏；
2. schema 三张表和 active index 为 true，迁移表状态如实记录；
3. ready evidence 有两个不同 PID；
4. outcomes 恰为 `created` 与 `RESERVATION_CONFLICT`；
5. finalState 为 reserved、version 仅加 1、active_count 为 1；
6. fixture 被清理且 pool 正常结束。

这些是读者应观察的判定条件，不是本教材已运行的输出。若本机是 PostgreSQL 16，脚本应在
preflight 失败；保留错误，不降低门禁或把 16 结果贴成 18。

## 8. 常见错误与排查路径

### 明确错误：所谓并发实际串行

```js
const first = await reserve(buyer1);
const second = await reserve(buyer2);
```

| 五段 | 记录 |
| --- | --- |
| 现象 | 总是第一个 created、第二个立即 conflict，看不到等待 |
| 证据 | 第二次调用在第一次 Promise 完成后才开始；没有两个 ready PID |
| 原因 | `await` 把两次事务串行化 |
| 修复 | 两个独立 client 到达 barrier 后，用 `Promise.allSettled` 同时释放 |
| 复验 | ready evidence 有两个不同 PID，结果 1 created + 1 conflict，最终 count=1 |

### Pool max 为 1

第二个任务在 barrier 前等待 checkout，第一个也等待 barrier，最终超时。证据是 ready 数始终为
1、pool waitingCount 为 1。修复测试配置 max>=2，并保留连接预算只用于隔离测试。

### 只断言 Promise 结果

实现可能在 COMMIT 前错误返回，或冲突后留下部分写入。修复为从独立查询断言两张表和 version，
再清理 fixture。

### catch 后继续 COMMIT

错误结构若在 catch 里吞掉后落入 COMMIT，会把部分操作提交。控制流必须是成功路径 COMMIT，
失败路径 ROLLBACK 后 rethrow；故障注入在 INSERT 后抛错应使两表恢复。

### 把唯一冲突当 500

当其他路径跳过锁时，索引仍可能抛 `23505`。结合 constraint
`reservations_one_active_per_listing_idx` 映射为 409；未知 `23505` 不猜测。

## 9. 课后题

**问题 1：Promise.allSettled 为什么还不足以证明并发？**

参考答案：连接池可能只有一条连接，或一个任务在另一个 checkout 前完成。需要两个独立 PID 在
业务锁前同时到达 barrier。

**问题 2：为什么既断言 Listing 状态又断言 Reservation 数量？**

参考答案：事务包含两张表；只看一张无法发现部分提交或状态漂移。version 还证明状态只转换一次。

**问题 3：输家一定通过 SQLSTATE 23505 失败吗？**

参考答案：正常行锁路径中，输家获得锁后看到 reserved，应用主动抛领域冲突；唯一索引是遗漏/
其他路径的兜底，只有竞争到 INSERT 时才可能出现 23505。

## 10. 实践练习

### 基础：补齐双 PID 证据

按正文 `readyEvidence` 扩展脚本。可判定标准：两条 label、两个不同整数 PID、readyAt 为 UTC
ISO；不把 PID 当用户 ID，不进入产品响应。

### 进阶：插入后故障回滚

增加 `INJECT_FAILURE_AFTER_INSERT=yes`，在 INSERT 后、UPDATE 前抛错。可判定标准：

- 事务结果失败；
- active reservations 为 0；
- Listing 仍 available，version 不变；
- 同一 client 执行 ROLLBACK 后 release；
- 关闭故障开关后真实双并发重新满足 1/1/1。

### 故障注入：删除 FOR UPDATE

只在临时脚本副本中移除锁，但保留唯一索引。可判定标准：最终 active count 仍不超过 1；至少
一个路径通过 `23505 + reservations_one_active_per_listing_idx` 受控失败；恢复锁后输家通常在
状态检查阶段冲突。
不得删除索引来制造“更明显”结果。

## 11. 阶段验收

- [ ] 单次 fake 测试证明成功顺序与冲突 rollback，并标明非数据库证据。
- [ ] preflight 实际观察 PostgreSQL 客户端/服务端 18。
- [ ] 连接目标脱敏，迁移表是否存在及 schema/index 状态如实记录。
- [ ] 隔离写门禁明确，fixture 全部为本轮随机 ID。
- [ ] 两个事务在 barrier 前已 BEGIN，并有两个不同 backend PID。
- [ ] 预约 SQL 全部使用各自同一 client。
- [ ] 结果恰为 1 created + 1 RESERVATION_CONFLICT。
- [ ] 最终 active count=1、Listing reserved、version 只增加 1。
- [ ] 插入后故障能让两张表都回滚。
- [ ] finally 清理本轮 fixture 并等待 pool.end。
- [ ] 没有使用 PostgreSQL 16、fake 或静态代码冒充真实 18 并发结果。

## 12. 常见问题

**能用 HTTP 两个 curl 代替脚本吗？**

可以作为更高层验收，但仍要同步释放、确认两个请求实际重叠，并查询数据库最终状态。脚本更容易
记录 PID 和 barrier；第 10 章再验证 HTTP 映射。

**为什么测试使用随机 UUID，而不是固定 UUID？**

随机 fixture 更容易归属本轮并避免上次失败残留冲突。清理仍必须限定这些已知 ID，不能全表删。

**迁移表不存在时可以继续吗？**

只有在明确的第 3 章独立实验库中，可用 schema/index 查询记录“无迁移表但结构存在”；正式项目
应建立迁移记录。任何情况下都不能把不存在写成已应用。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [node-postgres：事务必须使用同一 client](https://node-postgres.com/features/transactions)
- [node-postgres：Pool checkout](https://node-postgres.com/features/pooling)
- [PostgreSQL 18：行级锁](https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-ROWS)
- [PostgreSQL 18：事务隔离](https://www.postgresql.org/docs/18/transaction-iso.html)
- [PostgreSQL 18：唯一索引](https://www.postgresql.org/docs/18/indexes-unique.html)
- [PostgreSQL 18：错误码](https://www.postgresql.org/docs/18/errcodes-appendix.html)

## 我现在能做到什么

我能让两个真实 PostgreSQL 18 会话在可控 barrier 后竞争同一商品，以两个 PID、一个提交者、一个
受控冲突和最终 active count=1 共同证明预约不变量，而不是用串行或内存结果替代并发证据。

## 单元导航

[本章入口](../05-transactions-concurrency.md) ·
[上一课：事务隔离、行锁与竞态](01-isolation-locks-races.md) ·
[下一课：乐观锁、死锁、重试与回滚](03-optimistic-lock-deadlock-retry-rollback.md)
