# 事务 Outbox 与一致性：把跨系统双写变成可恢复事件

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个明确标记的 MOCK 双写实验、PostgreSQL outbox 表与租约 dispatcher 设计 |
| 练习位置 | 读者自己的 `market-backend-lab/outbox/` |
| 运行条件 | 最小案例仅需 Node.js 24；真实验收需要隔离 PostgreSQL 18 |
| 核心命令 | `node --test outbox/dual-write.test.mjs` |
| 成功证据 | 业务写与 outbox 在模型事务中同成同败；不安全双写可复现“预约存在、事件缺失” |
| 失败证据 | outbox 改用 pool 或写到 COMMIT 后，真实集成测试应发现缺失事件 |
| 环境标签 | 最小案例是 **MOCK transaction / MOCK queue**，不是 PostgreSQL 事务证据 |

## 1. 任务背景

邻里集市预约成功后要创建站内通知。两行看似合理的代码存在不可消除的进程崩溃窗口：

```ts
await createReservationInPostgres(input); // 已提交
await queue.add("reservation.created", event); // 进程可能在此之前退出
```

交换顺序也不正确：任务可能先被消费，随后数据库事务回滚，用户收到不存在预约的通知。普通
PostgreSQL 事务不能同时提交 Redis。让两个系统都“重试一下”也没有回答哪个事实已经持久化。

事务 outbox 的核心是：在同一个 PostgreSQL 事务、同一个 client 中，既写业务行，也写“需要
发布的事件”行。提交成功后，即使 Redis 暂时不可用，事件仍可查询和重试。dispatcher 发布后
再标记；如果在这两步之间崩溃，事件会重复发布，因此下游仍必须按 event ID 幂等。

## 2. 学习目标

完成本课后，你能够：

1. 画出“先 DB 后队列”和“先队列后 DB”的崩溃窗口；
2. 把业务写与 outbox 插入放进同一事务 client；
3. 设计稳定 event ID、event type、aggregate version 和非敏感 payload；
4. 用 `FOR UPDATE SKIP LOCKED` + 租约让多个 dispatcher 分工；
5. 解释为什么发布成功后标记失败会产生重复；
6. 设计 claim、续期/超时、退避、清理和对账；
7. 区分 outbox 已发布、任务已处理和外部副作用已发生；
8. 用真实 PostgreSQL 证据验证同成同败，而不伪造队列结果。

## 3. 预备知识

- 完成[原子预约与并发复现](../05-transactions-concurrency/02-atomic-reservations-concurrency-reproduction.md)；
- 完成[仓储与连接所有权](../04-postgres-data-access/03-repositories-connection-ownership.md)；
- 理解唯一约束、显式 `BEGIN/COMMIT/ROLLBACK` 和 SQLSTATE；
- 理解[缓存失效](01-cache-invalidation-stampede-control.md)也可以作为 outbox 事件。

创建个人练习目录：

```bash
mkdir -p outbox
node --version
```

本课不会连接真实邮件、短信或推送供应商。示例 `notifications` 是 PostgreSQL 站内信模型，
外部发送语义必须另行验证。

## 4. 核心理论

### 4.1 两种直接双写都有缺口

| 顺序 | 崩溃点 | 可观察错误 |
| --- | --- | --- |
| DB COMMIT -> queue add | 提交后、入队前 | 预约存在，通知事件永久缺失 |
| queue add -> DB COMMIT | 入队后、提交前/回滚 | 通知先发生，预约不存在 |

“捕获异常再补偿”无法处理进程断电，因为补偿代码也不会运行。两阶段提交理论上可以跨资源协调，
但 Redis/BullMQ 与应用部署通常不提供这套事务，复杂度也远超本项目。Outbox 把跨系统原子问题
转换为“数据库内原子记录 + 可重复转发”。

### 4.2 Outbox 行是业务事件，不是任意任务 JSON

最小字段责任：

- `id`：全局稳定 event ID，重试不变化；
- `event_type`：版本化语义，如 `reservation.created.v1`；
- `aggregate_type/id/version`：事件属于哪个领域对象及顺序位置；
- `payload`：消费者所需的最小非敏感快照；
- `occurred_at`：数据库记录的 `timestamptz`，对外转 UTC ISO；
- `available_at`：延迟与退避；
- claim 租约：哪个 dispatcher 暂时拥有；
- `published_at`：已成功交给队列的时间；
- `attempt_count/last_error_code`：运维诊断，不保存凭证或完整堆栈。

payload 不放密码、Cookie、CSRF token、连接串、完整个人资料。事件 schema 一经发布就要兼容；
字段含义变化应升级 event type 或明确向后兼容。

### 4.3 同一事务意味着同一 client

`BEGIN` 只影响当前 PostgreSQL 连接。以下是概念演示，省略业务参数与错误清理，不是可运行文件；
完整示例见第 6、7 节：

```text
const client = await pool.connect();
await client.query("BEGIN");
await reservationRepository.insert(client, ...);
await outboxRepository.insert(client, ...);
await client.query("COMMIT");
```

如果 outbox repository 偷偷调用 `pool.query`，它会从另一个连接自动提交。业务回滚时事件仍
存在，或业务提交后事件缺失。Repository 接口必须显式接收 transaction client，且测试要故障
注入验证同成同败。

### 4.4 Claim 不应无限持有数据库锁

最简单 dispatcher 可以在行锁事务中调用 Redis，但网络变慢时会长时间持锁。更可扩展的教学
设计是短事务租约：

1. 用 `FOR UPDATE SKIP LOCKED` 选择到期未发布事件；
2. 在同一短事务设置 `claimed_by`、`claim_until`、attempt；
3. 提交并释放数据库锁；
4. 事务外发布到队列；
5. 成功后带 `claimed_by` 条件标记 published；
6. 失败后记录分类、设置下次 available_at 或等待租约到期。

进程在第 4 步成功、第 5 步前崩溃，租约到期后会再次发布。这是预期的至少一次窗口，不应通过
永久锁住事件“修复”。

### 4.5 `SKIP LOCKED` 提供分工，不提供全局顺序

多个 dispatcher 可以跳过彼此已锁行提高吞吐，但完成顺序可能变化。如果同一 aggregate 的事件
必须严格有序，需要：

- 持久化单调 `aggregate_version`；
- 每个 aggregate 一次只发布下一版本，或按分区串行；
- 消费者检查版本并延迟未来事件；
- 对缺失版本告警和对账。

当前站内通知允许不同预约之间乱序，但同一预约的版本仍保留，方便未来演进。不能因为 SQL 有
`ORDER BY` 就声称跨 worker 全局有序。

### 4.6 发布、处理和副作用是三个状态

```text
outbox.published_at != null
  只表示 queue.add 已确认
BullMQ completed
  表示 handler 没抛错
notifications/event provider result
  才是业务副作用证据
```

网络确认也可能丢失：队列已接受但 producer 未收到响应。相同 jobId 能降低短期重复任务，业务
消费者仍需持久幂等。

### 4.7 清理需要保留恢复窗口

已发布 outbox 不能立刻删除。保留期应覆盖：

- 队列最大延迟和重试窗口；
- 消费者幂等记录保留期；
- 故障调查和对账；
- 备份恢复后可能重新转发的时间。

清理只处理 `published_at` 明确且超过策略的行，分批删除并监控表膨胀。未发布或 claim 超时的
事件不能当垃圾清理。

## 5. 元素、属性、API 或配置清单

| SQL/字段 | 用途 | 边界 |
| --- | --- | --- |
| `outbox_events.id` | 稳定业务事件 ID | 重试不得新生成 |
| `event_type` | 版本化事件语义 | 不使用任意类名泄露内部结构 |
| `aggregate_version` | 同一对象顺序位置 | 需由业务事务分配 |
| `jsonb payload` | 最小非敏感快照 | 仍需消费者运行时校验 |
| `FOR UPDATE SKIP LOCKED` | 多 dispatcher 分工 | 不保证全局处理顺序 |
| `claim_until` | 崩溃后自动可回收租约 | 时间和查询必须以数据库为准 |
| `available_at` | 延迟/退避到期时间 | 不用应用本地睡眠占住 worker |
| `published_at` | queue 接受后的标记 | 不等于消费者副作用成功 |
| `attempt_count` | 转发尝试次数 | 避免无限无告警重试 |
| 部分索引 | 快速定位未发布事件 | 需真实计划和表规模验证 |

## 6. 最小可运行案例

### 6.1 创建 MOCK 状态模型

创建完整文件 `outbox/dual-write.mjs`：

```js
export class MockDatabase {
  constructor() {
    this.state = { reservations: [], outbox: [] };
  }

  transaction(work) {
    const draft = structuredClone(this.state);
    const result = work(draft);
    this.state = draft;
    return result;
  }
}

export class MockQueue {
  constructor() {
    this.events = [];
  }
  add(event) {
    this.events.push(structuredClone(event));
  }
}

export function unsafeCreateReservation(db, queue, event, crashAfterCommit) {
  db.transaction((tx) => {
    tx.reservations.push({ id: event.reservationId });
  });
  if (crashAfterCommit) throw new Error("PROCESS_CRASH_AFTER_DB_COMMIT");
  queue.add(event);
}

export function createReservationWithOutbox(db, event, failInsideTransaction) {
  db.transaction((tx) => {
    tx.reservations.push({ id: event.reservationId });
    tx.outbox.push(structuredClone(event));
    if (failInsideTransaction) throw new Error("TRANSACTION_FAILURE");
  });
}
```

这只是用 draft 模拟提交/回滚的状态模型，没有隔离级别、连接、锁、SQL 或进程崩溃恢复。

### 6.2 创建确定性双写测试

创建完整文件 `outbox/dual-write.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  MockDatabase,
  MockQueue,
  createReservationWithOutbox,
  unsafeCreateReservation,
} from "./dual-write.mjs";

const event = {
  id: "20000000-0000-4000-8000-000000000001",
  type: "reservation.created.v1",
  reservationId: "30000000-0000-4000-8000-000000000001",
  listingId: "10000000-0000-4000-8000-000000000001",
  priceCents: 1990,
  occurredAt: "2026-10-11T08:00:00.000Z",
};

test("MOCK: direct DB then queue loses the event in the crash window", () => {
  const db = new MockDatabase();
  const queue = new MockQueue();
  assert.throws(
    () => unsafeCreateReservation(db, queue, event, true),
    /PROCESS_CRASH/,
  );
  assert.equal(db.state.reservations.length, 1);
  assert.equal(queue.events.length, 0);
});

test("MOCK: reservation and outbox commit or roll back together", () => {
  const committed = new MockDatabase();
  createReservationWithOutbox(committed, event, false);
  assert.equal(committed.state.reservations.length, 1);
  assert.equal(committed.state.outbox.length, 1);

  const rolledBack = new MockDatabase();
  assert.throws(
    () => createReservationWithOutbox(rolledBack, event, true),
    /TRANSACTION_FAILURE/,
  );
  assert.deepEqual(rolledBack.state, { reservations: [], outbox: [] });
});
```

运行：

```bash
node --test outbox/dual-write.test.mjs
```

预期 2 条测试通过。第一条的“通过”意味着成功复现不安全窗口，不是系统可靠；第二条只说明
MOCK 状态模型按 draft 回滚。

## 7. 邻里集市集成案例

### 7.1 迁移文件

在综合项目的后续扩展迁移
`apps/api/migrations/008_transactional_outbox.sql` 中定义：

基础设施管理员先在独立角色 bootstrap 中创建两个 `NOLOGIN` 角色，并分别授予专用
dispatcher 登录身份和受控运维登录身份；应用登录不能成为任一角色的成员：

```sql
CREATE ROLE market_outbox_dispatcher NOLOGIN;
CREATE ROLE market_outbox_operator NOLOGIN;
```

角色已存在时由基础设施变更工具判断并跳过，不通过吞掉任意 SQL 错误实现幂等。应用迁移只负责
对象与列级权限：

```sql
CREATE TABLE outbox_events (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version bigint NOT NULL CHECK (aggregate_version >= 1),
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  claimed_by text,
  claim_until timestamptz,
  published_at timestamptz,
  failed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error_code text,
  UNIQUE (aggregate_type, aggregate_id, aggregate_version, event_type),
  CHECK (NOT (published_at IS NOT NULL AND failed_at IS NOT NULL)),
  CHECK (
    (claimed_by IS NULL AND claim_until IS NULL)
    OR (claimed_by IS NOT NULL AND claim_until IS NOT NULL)
  )
);

CREATE INDEX outbox_events_pending_idx
  ON outbox_events (available_at, occurred_at, id)
  WHERE published_at IS NULL AND failed_at IS NULL;

CREATE TABLE outbox_requeue_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES outbox_events(id),
  operator_name text NOT NULL CHECK (char_length(operator_name) BETWEEN 1 AND 100),
  reason text NOT NULL CHECK (char_length(reason) BETWEEN 1 AND 500),
  previous_attempt_count integer NOT NULL CHECK (previous_attempt_count >= 1),
  requeued_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON outbox_events FROM market_api;
GRANT INSERT (
  id, event_type, aggregate_type, aggregate_id,
  aggregate_version, payload
) ON outbox_events TO market_api;
REVOKE ALL ON outbox_requeue_audit FROM market_api;
REVOKE market_outbox_dispatcher FROM market_api;
REVOKE market_outbox_operator FROM market_api;
GRANT SELECT (
  id, event_type, aggregate_type, aggregate_id, aggregate_version,
  payload, occurred_at, available_at, claimed_by, claim_until,
  published_at, failed_at, attempt_count, last_error_code
) ON outbox_events TO market_outbox_dispatcher;
GRANT UPDATE (
  available_at, claimed_by, claim_until, published_at,
  failed_at, attempt_count, last_error_code
) ON outbox_events TO market_outbox_dispatcher;
GRANT SELECT (id, attempt_count, failed_at)
  ON outbox_events TO market_outbox_operator;
GRANT UPDATE (
  failed_at, attempt_count, last_error_code,
  available_at, claimed_by, claim_until
) ON outbox_events TO market_outbox_operator;
GRANT INSERT (
  event_id, operator_name, reason, previous_attempt_count
) ON outbox_requeue_audit TO market_outbox_operator;
GRANT SELECT (event_id)
  ON outbox_requeue_audit TO market_outbox_operator;
GRANT USAGE, SELECT ON SEQUENCE outbox_requeue_audit_id_seq
  TO market_outbox_operator;
```

`payload` 可增加 `CHECK (jsonb_typeof(payload) = 'object')`，但具体字段仍需应用解析和事件版本
测试。迁移需由项目迁移器执行；手工粘贴成功不替代迁移状态记录。

### 7.2 在预约事务中写事件

以下是 service 增量结构：

```ts
const eventId = randomUUID();
const reservationId = randomUUID();
const client = await pool.connect();
let released = false;
try {
  await client.query("BEGIN");
  const listing = await lockAvailableListing(client, input.listingId);
  const reservation = await insertReservation(client, {
    id: reservationId,
    listingId: listing.id,
    buyerId: actor.id,
  });
  await markListingReserved(client, listing.id);
  await client.query(
    `INSERT INTO outbox_events (
       id, event_type, aggregate_type, aggregate_id,
       aggregate_version, payload
     ) VALUES ($1, $2, 'reservation', $3, 1, $4::jsonb)`,
    [
      eventId,
      "reservation.created.v1",
      reservation.id,
      JSON.stringify({
        reservationId: reservation.id,
        listingId: listing.id,
        sellerId: listing.ownerId,
        priceCents: listing.priceCents,
      }),
    ],
  );
  await client.query("COMMIT");
  return reservation;
} catch (error) {
  try {
    await client.query("ROLLBACK");
  } catch (rollbackError) {
    const unhealthy =
      rollbackError instanceof Error
        ? rollbackError
        : new Error("ROLLBACK failed");
    client.release(unhealthy);
    released = true;
    throw new AggregateError(
      [error, unhealthy],
      "reservation outbox and rollback both failed",
    );
  }
  throw error;
} finally {
  if (!released) client.release();
}
```

`priceCents` 来自已锁定数据库行且仍为整数分。`occurred_at` 由 PostgreSQL 记录，dispatcher
序列化时用 UTC ISO。事件不包含用户邮箱、Cookie 或密码。

### 7.3 租约 claim

dispatcher 每轮在短事务中执行：

```sql
BEGIN;
SET LOCAL ROLE market_outbox_dispatcher;

WITH candidates AS (
  SELECT id
  FROM outbox_events
  WHERE published_at IS NULL
    AND failed_at IS NULL
    AND attempt_count < 5
    AND available_at <= now()
    AND (claim_until IS NULL OR claim_until < now())
  ORDER BY occurred_at, id
  FOR UPDATE SKIP LOCKED
  LIMIT $1
)
UPDATE outbox_events AS event
SET claimed_by = $2,
    claim_until = now() + $3::interval
FROM candidates
WHERE event.id = candidates.id
RETURNING
  event.id, event.event_type, event.aggregate_type,
  event.aggregate_id, event.aggregate_version, event.payload,
  event.occurred_at, event.attempt_count;

COMMIT;
```

`$1` 是有上限批量，`$2` 是本进程随机实例 ID，`$3` 是服务端配置的受控 interval，不来自
HTTP。提交 claim 后逐项发布。成功标记必须验证租约所有权：

```sql
BEGIN;
SET LOCAL ROLE market_outbox_dispatcher;

UPDATE outbox_events
SET published_at = now(), claimed_by = NULL, claim_until = NULL,
    last_error_code = NULL
WHERE id = $1
  AND claimed_by = $2
  AND published_at IS NULL;

COMMIT;
```

更新行数不是 1 时不能静默成功：可能租约过期并被其他实例接管，需要记录并允许幂等重复。
失败时才递增 `attempt_count`，保存受控 `last_error_code`，设置 `available_at` 退避并释放
claim；第 5 次明确失败在同一语句进入人工处理终止态：

```sql
BEGIN;
SET LOCAL ROLE market_outbox_dispatcher;

UPDATE outbox_events
SET last_error_code = $3,
    available_at = now() + $4::interval,
    attempt_count = attempt_count + 1,
    failed_at = CASE WHEN attempt_count + 1 >= 5 THEN now() ELSE NULL END,
    claimed_by = NULL,
    claim_until = NULL
WHERE id = $1
  AND claimed_by = $2
  AND published_at IS NULL
  AND failed_at IS NULL;

COMMIT;
```

`$3` 只能是 allow-list 错误码，`$4` 是服务端配置的有界退避。完整异常只进入受保护日志且经过
脱敏。claim 不增加失败次数，所以第 5 次投递中途崩溃时，租约过期后仍可按原次数重领；队列已
接受但确认丢失会重复投递，由下一课的业务幂等吸收。

`failed_at` 非空后，普通 dispatcher 不再 claim。dispatcher 的 success/failure 更新也必须在
`market_outbox_dispatcher` 角色下执行；API runtime role 不拥有这些 UPDATE。人工重放再切换为
单独的 `market_outbox_operator`，并要求工单中的操作者和原因：

```sql
BEGIN;
SET LOCAL ROLE market_outbox_operator;

WITH target AS (
  SELECT id, attempt_count
  FROM outbox_events
  WHERE id = $1
    AND failed_at IS NOT NULL
  FOR UPDATE
),
audit AS (
  INSERT INTO outbox_requeue_audit(
    event_id, operator_name, reason, previous_attempt_count
  )
  SELECT id, $2, $3, attempt_count
  FROM target
  RETURNING event_id
)
UPDATE outbox_events
SET failed_at = NULL,
    attempt_count = 0,
    last_error_code = NULL,
    available_at = now(),
    claimed_by = NULL,
    claim_until = NULL
WHERE id IN (SELECT event_id FROM audit)
RETURNING id;

COMMIT;
```

返回零行表示目标不是终止态或 ID 不存在，必须停止而不是伪造“已重放”。上述列级授权允许
operator 完成 `FOR UPDATE`、受控状态更新、审计 INSERT 和 `RETURNING`；identity sequence
另有最小权限。`market_api` 只保留事务内写新事件所需的列级 INSERT，不能直接 UPDATE outbox，
也不是 dispatcher/operator 的直接或间接成员。基础设施把两个角色都建为 `NOLOGIN` 组角色，
分别只授给专用 dispatcher 和受权人员的独立运维身份；生产 migration 应先由平台创建这些角色，
应用迁移不能自行扩大成员或赋予 superuser。

### 7.4 真实 PostgreSQL 验收手册

先记录：

```bash
psql --version
PGSERVICE=market_lab psql -X -v ON_ERROR_STOP=1 -c \
  "SELECT current_database(), current_user, current_setting('server_version');"
PGSERVICE=market_lab psql -X -v ON_ERROR_STOP=1 -c \
  "SELECT version FROM schema_migrations ORDER BY version;"
```

`market_lab` 来自第 4 章的 `.pg_service.conf`，密码只放权限为 `0600` 的 passfile；不能把含密码
连接 URL 展开进进程参数。然后在隔离测试库验证：

1. 让 outbox INSERT 抛唯一冲突，预约、Listing 状态和 outbox 全部回滚；
2. 正常预约，三者全部提交；
3. 两个 dispatcher 并发 claim，event ID 集合不重叠；
4. claim 后终止一个 dispatcher，租约到期后另一个可回收；
5. 模拟 queue 已接受但 published 更新前崩溃，确认事件会再次发布；
6. 在第 5 次 claim 后、发布前崩溃，确认租约到期后仍可重领且次数没有凭空增加；
7. 让永久错误明确失败 5 次，确认 `failed_at` 非空且第 6 轮不再 claim；
8. `market_api` 的列级 INSERT 可写新事件，但直接 UPDATE、审计 INSERT 和
   `SET ROLE market_outbox_dispatcher`、`SET ROLE market_outbox_operator` 都被拒绝；
9. 查询 `pg_has_role` 确认 `market_api` 不是两个角色的成员，并核对它不是 superuser；
10. operator 重放恰好写一条审计并恢复一次 claim；
11. 不把第 5 步重复写成缺陷，下一课用业务幂等消除重复结果。

每一步保存实际 SQL 行数、事务结果和时间。若 PostgreSQL 18 无法启动，保留原始错误，只报告
MOCK 测试和静态 SQL 审查。

## 8. 常见错误与排查路径

### 8.1 明确错误示例：outbox repository 使用 pool

```ts
// 错误：忽略调用者 transaction client。
await pool.query("INSERT INTO outbox_events ...");
```

- **现象**：预约事务回滚，但 outbox 事件仍被 dispatcher 发布。
- **证据**：业务表无 reservation，outbox 却有同一 reservationId；连接日志显示不同 backend PID。
- **原因**：`BEGIN` 只约束 client，`pool.query` 在另一连接自动提交。
- **修复**：Repository 显式接收并只使用 transaction client；禁止事务方法隐藏 checkout。
- **复验**：故意让 outbox 后一步失败，reservation/listing/outbox 全部回滚；正常路径全部提交。

### 8.2 发布成功后进程崩溃

- **现象**：同一 event ID 再次进入 BullMQ。
- **证据**：queue 接受记录存在，outbox `published_at` 仍为空，租约到期后重发。
- **原因**：跨系统确认与数据库标记无法原子提交。
- **修复**：接受至少一次，jobId 复用 event ID，消费者建立持久业务幂等。
- **复验**：同一事件处理三次，业务结果仍一份；outbox 最终可标记 published。

### 8.3 租约太短

- **现象**：正常慢发布尚未结束，另一个 dispatcher 已重新 claim。
- **证据**：同一 event ID 的 claimed_by 在前一请求未结束时变化。
- **原因**：租约短于可接受发布时间，且没有续约/超时预算。
- **修复**：发布调用设置超时，租约大于预算并按需安全续约；消费者仍保持幂等。
- **复验**：边界延迟下没有无谓重领，进程崩溃后仍能在规定时间恢复。

### 8.4 payload 变成敏感数据仓库

- **现象**：outbox 行含邮箱、Cookie 或完整请求正文，保留期又很长。
- **证据**：数据库审查直接看到秘密或个人信息。
- **原因**：把事件当调试 dump，而非最小业务契约。
- **修复**：只保留消费者必需 ID/整数分/版本，敏感值按授权从源系统读取；制定保留和访问策略。
- **复验**：schema fixture 与日志脱敏测试拒绝禁止字段。

## 9. 课后题

1. **为什么 COMMIT 后捕获 queue 错误再重试仍不够？**
   答案：进程可能在进入 catch 前终止，没有持久记录就不知道该重试什么。
2. **Outbox 是否保证任务只发布一次？**
   答案：不保证。发布后标记前崩溃会重复，它保证事件不会因 DB/queue 间隙永久无记录。
3. **`SKIP LOCKED` 为什么不保证全局顺序？**
   答案：多个 worker 可并行 claim 和完成，网络延迟会改变完成顺序。
4. **`published_at` 有值能否证明邮件送达？**
   答案：不能，只能证明 dispatcher 收到队列接受确认；消费者和供应商还有独立状态。

## 10. 实践练习

### 基础：增加缓存失效事件

在 Listing 更新事务插入 `listing.cache.invalidate.v1`。可判定标准：与 UPDATE 同 client；payload
只有 listingId；回滚时两者都不存在；event ID 重试不变化。

### 进阶：聚合顺序

为同一 Listing 的事件增加 version 2、3，并设计 dispatcher/consumer 顺序规则。可判定标准：
重复版本由唯一约束拒绝；version 3 不在 version 2 缺失时永久覆盖；乱序有可恢复状态。

### 故障注入：发布后标记前退出

在授权测试环境让 queue add 成功后进程退出。可判定标准：outbox 保持未发布或租约状态，租约
后重发同一 event ID，消费者最终只有一个业务结果。不能通过手工把 published_at 改真掩盖窗口。

## 11. 阶段验收

- [ ] 两种直接双写的故障窗口均能确定复述；
- [ ] 业务写与 outbox 使用同一 transaction client；
- [ ] event ID、类型、aggregate/version、UTC 时间和最小 payload 职责清楚；
- [ ] claim 是短事务，网络发布不无限持行锁；
- [ ] 租约过期、失败退避、重复发布和保留清理有明确路径；
- [ ] published、processed、external delivered 三种状态没有混用；
- [ ] 真实 PostgreSQL 证据包含服务端/客户端 18、连接目标和迁移状态；
- [ ] 未运行 PostgreSQL 时只报告 MOCK 和静态审查。

## 12. 常见问题

**可以用数据库触发器写 outbox 吗？**
可以减少应用漏写，但事件 schema、上下文、迁移和测试仍需治理。触发器不是自动正确，应权衡
可见性和团队维护能力。

**为什么不让 dispatcher 删除已发布行？**
立即删除会缩短对账和恢复窗口。按保留策略分批清理，并确保消费者幂等记录覆盖可能重放周期。

**轮询会不会很慢？**
短间隔轮询配合索引通常足够起步，也可用通知唤醒加轮询兜底。先测最老事件年龄和吞吐，不为
避免毫秒延迟引入不可恢复复杂度。

**能否把 outbox payload 当 API 响应复用？**
不建议。事件是内部长期契约，API 是客户端契约，权限和演进不同。可共享领域字段定义，但不要
让一个对象承担两种生命周期。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [PostgreSQL 18：Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html)
- [PostgreSQL 18：`SELECT` locking clause / `SKIP LOCKED`](https://www.postgresql.org/docs/18/sql-select.html)
- [PostgreSQL 18：Partial Indexes](https://www.postgresql.org/docs/18/indexes-partial.html)
- [microservices.io：Transactional Outbox](https://microservices.io/patterns/data/transactional-outbox.html)
- [AWS Prescriptive Guidance：Transactional outbox pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html)

## 我现在能做到什么

我能把预约与待发布事件放进同一 PostgreSQL 事务，用短租约 dispatcher 将事件至少一次转发，
并把重复、顺序、保留和外部副作用边界写成可恢复设计。

## 单元导航

- 章节目录：[08 Redis、Outbox 与队列](../README.md#08-redisoutbox-与队列)
- 上一课：[缓存失效与击穿控制](01-cache-invalidation-stampede-control.md)
- 下一课：[BullMQ 幂等、重试、死信与停机](03-bullmq-idempotency-retry-dead-letter-shutdown.md)
