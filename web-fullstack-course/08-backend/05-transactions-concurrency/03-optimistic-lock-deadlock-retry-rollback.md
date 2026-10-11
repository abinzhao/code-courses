# 乐观锁、死锁、有限重试与回滚

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | version 条件更新、统一锁顺序、有限事务重试器与故障回滚记录 |
| 练习目录 | `market-api-lab/` |
| 最小案例 | fake Queryable 测 version SQL 与重试分类，明确**不是数据库证据** |
| 数据库案例 | PostgreSQL 18 上同旧版本竞争、可控死锁和 INSERT 后故障 |
| 可重试范围 | 仅明确瞬时事务错误，如 `40001`、`40P01`；每次开启新事务 |
| 禁止重试 | 认证/授权、输入错误、version 409、预约 409、未知错误 |
| 副作用边界 | 邮件、HTTP、队列发布不在可重试事务回调中直接执行 |

## 1. 任务背景

预约争用的是一个立即消耗的稀缺状态，行锁适合。编辑商品则不同：用户可能打开表单十分钟后才
提交，不能在十分钟里一直锁行。邻里集市用 `version` 做乐观锁：读取时得到版本 3，提交时要求
数据库仍是 3；成功后原子增加到 4。

多行操作还会遇到死锁。路径 A 锁商品 1 再商品 2，路径 B 锁 2 再 1，双方都等待对方。PostgreSQL
会中止其中一个事务并返回 `40P01`。正确做法首先是统一锁顺序、缩短事务；有限重试只是处理仍
可能出现的瞬时冲突，不是无限掩盖设计问题。

## 2. 学习目标

完成本课后，你能够：

1. 用单条条件 UPDATE 实现 version compare-and-swap；
2. 把 rowCount=0 交给服务层区分不存在、无权和版本冲突；
3. 用相反锁顺序稳定观察死锁，并改为统一顺序；
4. 只重试明确 SQLSTATE，限制次数并为每次尝试创建新事务；
5. 使用退避与抖动降低同步重试风暴；
6. 在 INSERT 后注入故障，查询两张表证明 rollback；
7. 把通知等副作用放到提交后的 outbox/处理器边界。

## 3. 预备知识

先完成：

- [原子预约与真实并发复现](02-atomic-reservations-concurrency-reproduction.md)；
- [参数化 SQL 与 SQLSTATE](../04-postgres-data-access/02-parameterized-sql-types-sqlstate.md)。

真实实验继续只用隔离 PostgreSQL 18。至少准备两个不同 Listing fixture 和两个独立 client。
运行前记录服务端/客户端版本、脱敏目标和迁移状态；结束时删除本轮随机 fixture。

## 4. 核心理论

### 4.1 version 是数据库条件，不是前端比较

错误方式：

```text
GET version=3
前端判断“还是 3”
PATCH 无条件 UPDATE
```

前端无法知道提交瞬间的数据库状态。正确 SQL 在一次写中比较并递增：

```sql
UPDATE listings
SET title = $1,
    description = $2,
    price_cents = $3,
    version = version + 1
WHERE id = $4
  AND owner_id = $5
  AND version = $6
RETURNING ...;
```

同一个旧版本只有第一个 UPDATE 返回行。后续 0 行不能返回旧对象或自动覆盖，应返回
`409 VERSION_CONFLICT`，提示刷新/合并。

### 4.2 0 行有三种可能

条件同时包含 id、owner 和 version，因此 0 行可能是：

1. 对象不存在；
2. 对象存在但 actor 不是 owner；
3. owner 正确但 version 已变化。

服务层可在同一事务中先查询最小授权事实，再执行条件写；或者按安全策略统一隐藏存在性。无论
如何，最终 UPDATE 仍保留 owner/version 条件，不能只依赖先查。

### 4.3 死锁是等待图成环

```text
T1 持有 A，等待 B
T2 持有 B，等待 A
```

数据库检测环后选择一个事务回滚。修复优先级：

1. 所有路径按稳定键排序后加锁；
2. 缩小事务和锁集合；
3. 给查询建立合适索引；
4. 不在事务内做外部 I/O；
5. 对剩余 `40P01` 有限重试整笔事务。

只增大 timeout 不会打破环。

### 4.4 序列化失败要求整笔重试

`40001` 表示当前事务基于已失效的串行化前提。不能只重跑最后一条 UPDATE；前面的读取和业务判断
也可能过期。应释放旧 client，开启全新事务，从头执行回调。

每次尝试必须重新生成“允许变化”的内部读取，但幂等键/业务命令 ID 应保持稳定，防止提交结果
未知时重复业务事实。

### 4.5 哪些错误绝不自动重试

| 错误 | 原因 |
| --- | --- |
| `VERSION_CONFLICT` | 用户基于旧数据，需要刷新/合并 |
| `RESERVATION_CONFLICT` | 业务资源已被占用 |
| `FORBIDDEN` / `UNAUTHENTICATED` | 重试不会产生权限 |
| DTO/约束输入错误 | 需要修正请求 |
| 未知 SQLSTATE | 无证据证明重试安全 |
| 已执行不可幂等外部副作用 | 可能重复邮件、扣款或通知 |

锁超时 `55P03` 是否重试由具体操作、总请求预算和幂等策略决定，本课默认不自动重试。

### 4.6 提交与副作用边界

在可重试回调中发送邮件：

```text
尝试 1 发邮件 -> COMMIT 遇到 40001 -> 重试
尝试 2 再发邮件 -> COMMIT 成功
```

用户收到两封。正确做法是在同一数据库事务写 outbox 事件；事务提交后 worker 以稳定事件 ID
幂等处理。第 8 章完整实现 outbox。

## 5. 元素、属性、API 或配置清单

| 元素 | 作用 | 判定证据 | 边界 |
| --- | --- | --- | --- |
| `version` integer | 乐观并发令牌 | 成功写入 +1 | 不由客户端生成新值 |
| 条件 UPDATE | 原子 compare-and-swap | 1 行或 0 行 | 0 行需按策略分类 |
| `RETURNING` | 返回提交候选新行 | 映射整数分/UTC | 仍需 COMMIT 成功 |
| `ORDER BY id`/JS sort | 统一锁顺序 | 所有路径同序 | 排序规则必须一致 |
| `40P01` | deadlock detected | 一个事务被数据库中止 | 先修锁顺序 |
| `40001` | serialization failure | 整笔事务重试 | 每次新 client |
| 最大尝试次数 | 限制恢复成本 | 超限保留最后错误 | 不是无限循环 |
| exponential backoff | 拉开重试 | 注入 delay 可测试 | 受 HTTP 总预算约束 |
| jitter | 避免同步重试 | 范围可断言 | 不用于业务随机正确性 |
| outbox event ID | 副作用幂等身份 | 同命令稳定 | worker 仍要幂等 |
| `ROLLBACK` | 撤销部分数据库写 | 两表最终状态 | 不撤销外部系统 |

## 6. 最小可运行案例

### 6.1 乐观锁仓储

创建 `src/listings/optimistic-update.mjs`：

```js
export async function updateListingOptimistically(db, command) {
  const result = await db.query({
    text: `UPDATE listings
           SET title = $1,
               description = $2,
               price_cents = $3,
               version = version + 1
           WHERE id = $4
             AND owner_id = $5
             AND version = $6
           RETURNING id, title, description, price_cents,
                     owner_id, status, version, created_at`,
    values: [
      command.title,
      command.description,
      command.priceCents,
      command.listingId,
      command.actorId,
      command.expectedVersion,
    ],
  });
  return result.rows[0] ?? null;
}
```

创建 `test/optimistic-update.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { updateListingOptimistically } from "../src/listings/optimistic-update.mjs";

test("keeps owner and expected version in the atomic update", async () => {
  let observed;
  const db = {
    async query(config) {
      observed = config;
      return { rows: [{ version: 4 }], rowCount: 1 };
    },
  };
  const row = await updateListingOptimistically(db, {
    title: "折叠桌",
    description: "更新描述",
    priceCents: 28000,
    listingId: "listing",
    actorId: "owner",
    expectedVersion: 3,
  });
  assert.deepEqual(observed.values, [
    "折叠桌", "更新描述", 28000, "listing", "owner", 3,
  ]);
  assert.match(observed.text, /owner_id = \$5/);
  assert.match(observed.text, /version = \$6/);
  assert.equal(row.version, 4);
});

test("returns null rather than pretending a stale update succeeded", async () => {
  const row = await updateListingOptimistically(
    { async query() { return { rows: [], rowCount: 0 }; } },
    {
      title: "旧表单",
      description: "",
      priceCents: 1990,
      listingId: "listing",
      actorId: "owner",
      expectedVersion: 3,
    },
  );
  assert.equal(row, null);
});
```

运行：

```bash
node --test test/optimistic-update.test.mjs
```

预期 2 条 fake 测试通过。它们验证 QueryConfig，不证明 PostgreSQL 并发。

### 6.2 从单次更新扩展到竞争

1. 先验证 owner/version 都在 WHERE。
2. 真实库插入 version=1 的随机 Listing。
3. 两个独立 client 同时执行携带 expectedVersion=1 的 UPDATE。
4. 断言一个 `rowCount=1/version=2`、另一个 `rowCount=0`。
5. 查询最终 title 属于赢家，version 恰为 2。

第 4 步不能把 0 行改成成功；服务层应在授权策略下映射 409。

## 7. 邻里集市集成案例

### 7.1 有限事务重试器

创建 `src/db/retry-transaction.mjs`：

```js
const RETRYABLE = new Set(["40001", "40P01"]);

export async function runRetryingTransaction({
  runAttempt,
  maxAttempts = 3,
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  random = Math.random,
}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
    throw new Error("maxAttempts must be 1..5");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      // runAttempt 必须每次 checkout 新 client 并执行完整事务。
      return await runAttempt({ attempt });
    } catch (error) {
      const retryable = RETRYABLE.has(error?.code);
      if (!retryable || attempt === maxAttempts) throw error;
      const baseMs = 25 * 2 ** (attempt - 1);
      const jitterMs = Math.floor(random() * 25);
      await delay(baseMs + jitterMs);
    }
  }
  throw new Error("unreachable retry state");
}
```

创建 `test/retry-transaction.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { runRetryingTransaction } from "../src/db/retry-transaction.mjs";

test("retries a whole transaction after 40001 and then succeeds", async () => {
  const attempts = [];
  const delays = [];
  const result = await runRetryingTransaction({
    random: () => 0,
    delay: async (ms) => delays.push(ms),
    runAttempt: async ({ attempt }) => {
      attempts.push(attempt);
      if (attempt < 3) throw Object.assign(new Error("serialization"), { code: "40001" });
      return "committed";
    },
  });
  assert.equal(result, "committed");
  assert.deepEqual(attempts, [1, 2, 3]);
  assert.deepEqual(delays, [25, 50]);
});

test("does not retry conflicts, permissions or unknown errors", async () => {
  for (const code of ["VERSION_CONFLICT", "FORBIDDEN", "23505", undefined]) {
    let calls = 0;
    await assert.rejects(
      runRetryingTransaction({
        runAttempt: async () => {
          calls += 1;
          throw Object.assign(new Error("stop"), { code });
        },
      }),
      /stop/,
    );
    assert.equal(calls, 1);
  }
});

test("stops after the configured attempt limit", async () => {
  let calls = 0;
  await assert.rejects(
    runRetryingTransaction({
      maxAttempts: 2,
      delay: async () => {},
      runAttempt: async () => {
        calls += 1;
        throw Object.assign(new Error("deadlock"), { code: "40P01" });
      },
    }),
    /deadlock/,
  );
  assert.equal(calls, 2);
});
```

运行：

```bash
node --test test/optimistic-update.test.mjs test/retry-transaction.test.mjs
```

预期累计 5 条测试通过。delay/random 被注入以获得确定性；生产仍要让总重试时间受请求 deadline
约束。

### 7.2 真实死锁与修复

在隔离 PostgreSQL 18 创建两个本轮 Listing A/B。两个 `psql` 会话均设置有界超时并记录 PID。

终端 T1：

```sql
BEGIN;
UPDATE listings SET version = version + 1 WHERE id = :'listing_a';
-- 等 T2 锁住 B 后：
UPDATE listings SET version = version + 1 WHERE id = :'listing_b';
```

终端 T2：

```sql
BEGIN;
UPDATE listings SET version = version + 1 WHERE id = :'listing_b';
-- 等 T1 锁住 A 后：
UPDATE listings SET version = version + 1 WHERE id = :'listing_a';
```

应有一个事务得到 SQLSTATE `40P01`，但必须保存实际错误 code 才能声称观察到死锁。两个终端随后
分别 COMMIT 或 ROLLBACK，不能留开放事务。

修复为两个路径都先对 ID 排序：

```js
const orderedIds = [listingA, listingB].sort();
for (const id of orderedIds) {
  await client.query(
    "SELECT id FROM listings WHERE id = $1 FOR UPDATE",
    [id],
  );
}
```

复验相同双会话路径：可能等待，但不再形成相反顺序的环。一次未复现不等于永不死锁；保留有限
`40P01` 重试和监控。

### 7.3 rollback 故障注入

在预约事务 INSERT 后加入只在测试启用的异常：

```js
await reservations.insert(client, command);
if (injectFailureAfterInsert) {
  throw new Error("INJECTED_AFTER_RESERVATION_INSERT");
}
await listings.markReserved(client, command.listingId);
```

事务回滚后从事务外查询：

```sql
SELECT count(*) FROM reservations WHERE listing_id = :'listing_id';
SELECT status, version FROM listings WHERE id = :'listing_id';
```

合格结果是 count=0、status/version 与事务前相同。仅看到函数 reject 不足以证明 rollback。

### 7.4 outbox 边界

事务内只写：

```sql
INSERT INTO outbox_events(id, event_type, aggregate_id, payload)
VALUES ($1, 'reservation.created', $2, $3::jsonb);
```

事务外 worker 发送通知并按 event id 去重。若事务重试，数据库唯一 event id 阻止重复事实；若
事务回滚，outbox 也消失。第 8 章再实现 worker、重试和死信。

## 8. 常见错误与排查路径

### 明确错误：version 只在 JavaScript 比较

```js
if (listing.version === body.version) {
  await db.query("UPDATE listings SET title=$1 WHERE id=$2", [title, id]);
}
```

| 五段 | 记录 |
| --- | --- |
| 现象 | 两个旧版本表单都返回成功，后提交覆盖先提交 |
| 证据 | UPDATE WHERE 没有 version，两个 rowCount 都为 1 |
| 原因 | 比较与写入之间存在并发窗口 |
| 修复 | 把 owner/version 放入同一 UPDATE 条件并原子递增 |
| 复验 | 同 expectedVersion 仅一个 rowCount=1，最终 version 只加 1 |

### 无限重试所有错误

权限或业务冲突永远不会因立即重试改变，无限循环还会耗尽池。修复 SQLSTATE allowlist、最大尝试
次数和总 deadline；超限保留最后错误。

### 只重跑最后一条 SQL

序列化失败意味着事务读取前提失效。释放旧 client，整个回调从 BEGIN 重跑；不要复用旧领域对象。

### 相反顺序加锁后只增加 timeout

更长 timeout 只延迟死锁检测/请求失败。先统一排序，再缩短事务，并保留指标和有限重试。

### 可重试回调发送通知

现象是一次业务提交产生多封邮件。证据是 attempt 日志与外部消息数不一致。修复事务内写 outbox，
提交后由幂等 worker 处理。

## 9. 课后题

**问题 1：为什么 version 冲突不自动重试？**

参考答案：重试会基于旧用户意图覆盖新状态。用户或业务合并策略必须先看最新版本；应返回 409。

**问题 2：`40P01` 可重试，是否无需修锁顺序？**

参考答案：不是。重试只是恢复偶发受害事务；相反顺序会持续制造死锁、延迟和负载，必须先修设计。

**问题 3：为什么 `40001` 要整笔重试？**

参考答案：事务中所有读取和判断都可能基于无法串行化的快照，只重跑末条 SQL 会沿用失效前提。

## 10. 实践练习

### 基础：同旧版本双更新

用两个真实 client 和 barrier 同时提交 expectedVersion=1。判定标准：两个 PID 不同；一个返回
version=2，一个 0 行并映射 409；最终 title 属于赢家、version=2。

### 进阶：重试总预算

为重试器加入 `deadlineAt`。判定标准：下一次 backoff 会越过 deadline 时不再等待；保留原始
SQLSTATE；单元测试注入 fake clock，不依赖真实 sleep。

### 故障注入：相反锁顺序

在隔离 PostgreSQL 18 运行 A→B 与 B→A，实际捕获 `40P01`；随后统一排序复验。记录两个 PID、
锁顺序、SQLSTATE、回滚和清理。环境无法运行时标记 environment block，不写“已观察”。

## 11. 阶段验收

- [ ] 乐观 UPDATE 在同一 WHERE 中包含 id、ownerId、expectedVersion。
- [ ] 成功写原子递增 version，0 行不伪装成功。
- [ ] 对象不存在/无权/version 冲突按服务策略区分或安全隐藏。
- [ ] 同旧版本真实竞争最多一个成功。
- [ ] 所有多资源路径使用相同排序规则。
- [ ] 实际死锁声明包含 PostgreSQL 18、两个 PID 和 `40P01`。
- [ ] 重试仅允许 `40001`/`40P01`，次数与总预算有界。
- [ ] 每次重试开启全新事务，不复用旧 client/读取。
- [ ] 权限、输入、version 和预约冲突不重试。
- [ ] rollback 故障同时检查 reservations 与 listings。
- [ ] 外部副作用不在可重试事务中直接执行。

## 12. 常见问题

**ETag 可以替代 version 吗？**

HTTP ETag/If-Match 可承载条件请求，但服务端最终仍需把条件原子落实到数据库版本或等价令牌。
只在控制器比较 ETag 仍有竞争窗口。

**重试次数为什么不是越多越好？**

持续冲突通常表示热点或设计问题；多次重试扩大数据库负载并耗尽请求预算。应有限恢复并监控失败率。

**死锁和 lock timeout 是同一个错误吗？**

不是。死锁检测通常是 `40P01`，等待超时常见 `55P03`。二者根因、重试策略和诊断证据不同。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [PostgreSQL 18：事务隔离与序列化失败](https://www.postgresql.org/docs/18/transaction-iso.html)
- [PostgreSQL 18：死锁](https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-DEADLOCKS)
- [PostgreSQL 18：UPDATE](https://www.postgresql.org/docs/18/sql-update.html)
- [PostgreSQL 18：错误码](https://www.postgresql.org/docs/18/errcodes-appendix.html)
- [node-postgres：事务](https://node-postgres.com/features/transactions)

## 我现在能做到什么

我能用数据库条件 version 防止旧编辑覆盖，统一锁顺序并诊断真实死锁，只对明确瞬时 SQLSTATE
有限重试整笔新事务，还能用最终数据库状态证明 rollback 并把外部副作用留在提交边界之外。

## 单元导航

[本章目录](../README.md#05-事务与并发) ·
[上一课：原子预约与真实并发复现](02-atomic-reservations-concurrency-reproduction.md) ·
[下一章：认证、会话与授权](../06-auth-sessions-rbac/01-password-hashing-account-boundaries.md)
