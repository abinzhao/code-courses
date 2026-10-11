# 事务隔离、行锁与竞态

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 确定性 check-then-write 失败模型、两会话行锁观察记录 |
| 练习目录 | `market-api-lab/` |
| 最小案例 | **内存调度模型**，只证明错误交错可能发生 |
| 数据库案例 | 隔离 PostgreSQL 18 中两个独立 `psql` 会话 |
| 关键不变量 | 同一 Listing 最多一个 active Reservation |
| 失败证据 | 两次检查都读到 available，随后产生两条内存预约 |
| 真实证据门槛 | 服务端 18、迁移状态、两个 backend PID、等待/提交后状态 |

## 1. 任务背景

最直觉的预约代码通常是：

```text
查询商品是否 available
如果是，插入预约
把商品改为 reserved
```

单独看每一步都合理，但两个请求可以同时通过第一步。JavaScript 在等待数据库 I/O 时会让其他请求
继续；多进程和多副本更不共享事件循环。即便把三条 SQL 放入两个事务，在 PostgreSQL 默认
Read Committed 下，如果没有锁、条件写或唯一约束，两个事务仍可能依据各自已读到的旧状态继续。

事务提供“这一组数据库变化提交或回滚”的机制，不会自动理解“每个商品只能有一个有效预约”。
业务必须把不变量编码为正确的锁、条件和约束。

## 2. 学习目标

完成本课后，你能够：

1. 区分原子性、一致性、隔离性和持久性，不把它们当一句口号；
2. 解释 PostgreSQL Read Committed 的语句级快照；
3. 用 barrier 稳定复现 check-then-write 交错，不依赖任意 sleep；
4. 说明 `SELECT ... FOR UPDATE` 锁定什么、没有锁定什么；
5. 区分行锁、条件 UPDATE 和部分唯一索引的职责；
6. 在两个数据库会话中观察等待、超时和提交后重读；
7. 准确标注内存模型、手工锁实验与完整业务并发测试的证据范围。

## 3. 预备知识

先完成：

- [SQL 约束、外键与不变量](../03-sql-modeling.md)；
- [仓储契约与连接所有权](../04-postgres-data-access/03-repositories-connection-ownership.md)。

确认第 3 章迁移包含类似数据库兜底：

```sql
CREATE UNIQUE INDEX reservations_one_active_per_listing_idx
ON reservations(listing_id)
WHERE status IN ('pending', 'confirmed');
```

若实际 schema 使用其他状态或约束名，以迁移文件为准并同步测试，不能只改教程命令。真实实验只
对隔离 `market_lab` 或临时测试数据库执行；先备份/确认目标，不操作生产数据。

## 4. 核心理论

### 4.1 ACID 各自回答不同问题

| 性质 | 本例问题 | 注意 |
| --- | --- | --- |
| 原子性 | 插预约与改 Listing 是否一起提交/回滚 | 不自动阻止另一个事务 |
| 一致性 | 提交后约束和业务不变量是否成立 | 需要 schema 与应用共同定义 |
| 隔离性 | 并发事务能观察到哪些中间状态 | 由隔离级别与锁/条件决定 |
| 持久性 | 提交事实在故障后是否保留 | 依赖数据库持久化配置，不由 HTTP 200 单独证明 |

“用了事务”只说明有一个原子边界的意图；还要证明所有 SQL 在同一 client、并发交错受控、最终
约束成立。

### 4.2 Read Committed 是每条语句一个快照

PostgreSQL 默认 Read Committed 下，每条普通 SELECT 看见语句开始前已经提交的数据。同一事务
后面的第二条 SELECT 可能看见其他事务在中间提交的新值，因此它不是整笔事务固定快照。

常见现象：

- 脏读在 PostgreSQL Read Committed 中不会发生；
- 不可重复读可能发生；
- 两次范围查询可能出现不同集合；
- 两个事务都可以先读到“尚无预约”，再尝试写入。

提高到更强隔离级别会改变冲突与重试语义，但不替代唯一约束和业务错误映射。

### 4.3 check-then-write 的窗口

错误交错：

```text
T1: SELECT status -> available
T2: SELECT status -> available
T1: INSERT reservation
T2: INSERT reservation
T1: UPDATE listing -> reserved
T2: UPDATE listing -> reserved
```

若没有唯一约束，两条预约都可提交。若有唯一约束，第二个 INSERT 会失败，避免破坏最终不变量，
但应用仍需回滚并把特定 `23505 + reservations_one_active_per_listing_idx` 映射为受控 409。

### 4.4 行锁把竞争汇聚到同一资源

```sql
SELECT owner_id, status, version
FROM listings
WHERE id = $1
FOR UPDATE;
```

竞争同一现有 Listing 行的事务会排队。等待者获得锁后，在 Read Committed 下会基于最新已提交行
继续，因而看到 `reserved` 并返回冲突。

边界：

- `FOR UPDATE` 只锁命中的现有行，不锁“尚不存在的预约行”；
- 没有合适索引可能扫描/锁更多行并延长事务；
- 锁直到事务结束，不能在锁内等待邮件、队列或用户输入；
- 多资源路径必须统一加锁顺序，避免死锁。

### 4.5 条件写减少检查窗口

某些状态转换可以用一条 SQL：

```sql
UPDATE listings
SET status = 'reserved', version = version + 1
WHERE id = $1 AND status = 'available'
RETURNING id, version;
```

只有一个竞争者能更新该行。但预约还要验证 owner、插入 Reservation，并让两张表原子变化，因此
仍需事务。条件 UPDATE、行锁和唯一索引不是互斥方案，要根据完整不变量组合。

### 4.6 数据库约束是跨路径兜底

后台任务、迁移脚本或未来的新 API 可能绕过某个服务函数。部分唯一索引覆盖所有写入路径，是
最终不变量防线。应用层锁提供可预测的冲突时机和领域判断；约束保证遗漏路径不能静默写坏数据。

## 5. 元素、属性、API 或配置清单

| SQL / API | 作用 | 证据 | 边界 |
| --- | --- | --- | --- |
| `BEGIN` | 开始当前会话事务 | tx 状态、同一 client | 不自动锁业务资源 |
| `COMMIT` | 原子发布事务变化 | 最终状态可见 | 外部 HTTP/邮件不随之提交 |
| `ROLLBACK` | 撤销未提交数据库变化 | 两表都恢复 | 不能撤销已发外部副作用 |
| Read Committed | 每条语句快照 | 第二次读可见新提交 | 不是固定事务快照 |
| `FOR UPDATE` | 锁命中行以供写 | 另一会话等待 | 不锁不存在行 |
| `lock_timeout` | 限制等待锁时间 | `55P03` | 不替代事务结束 |
| `statement_timeout` | 限制语句总执行 | `57014` | 不专门诊断锁 |
| 条件 `UPDATE` | 原子比较并写 | `rowCount`/RETURNING | 需解释 0 行原因 |
| partial unique index | 限制有效预约 | `23505` + constraint | 应用必须映射冲突 |
| `pg_backend_pid()` | 标识数据库会话 | 两个不同 PID | PID 不是用户身份 |
| `pg_stat_activity` | 观察会话状态/等待 | wait_event | 需要权限且要脱敏 |

## 6. 最小可运行案例

本案例是**内存调度模型**。它故意实现错误算法，用 barrier 让两个调用都在写入前读完旧状态。
它不模拟 PostgreSQL MVCC、锁或约束。

### 6.1 确定性 barrier

创建 `test/check-then-write-race.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";

function barrier(parties) {
  let arrivals = 0;
  let release;
  const opened = new Promise((resolve) => {
    release = resolve;
  });
  return {
    async arriveAndWait() {
      arrivals += 1;
      if (arrivals === parties) release();
      await opened;
    },
  };
}

async function unsafeReserve(store, buyerId, afterRead) {
  const statusSeen = store.listing.status;
  await afterRead.arriveAndWait();
  if (statusSeen !== "available") return "conflict";
  store.reservations.push({ buyerId, status: "pending" });
  store.listing.status = "reserved";
  return "created";
}

test("check-then-write can let two callers pass the same old check", async () => {
  const store = {
    listing: { status: "available" },
    reservations: [],
  };
  const afterRead = barrier(2);

  const results = await Promise.all([
    unsafeReserve(store, "buyer-1", afterRead),
    unsafeReserve(store, "buyer-2", afterRead),
  ]);

  assert.deepEqual(results, ["created", "created"]);
  assert.equal(store.reservations.length, 2);
});
```

运行：

```bash
node --test test/check-then-write-race.test.mjs
```

预期 1 条测试通过，断言的“通过”表示错误被稳定复现：两次调用都 created、内存预约数为 2。
不要把断言改成期望 1；本文件的 owner 是证明不安全算法存在。

### 6.2 逐步扩展理解

1. 移除 barrier，测试可能仍失败或偶然只出现一种顺序，证据不稳定。
2. 恢复 barrier，确认两个调用都读取后才继续。
3. 给内存数组增加唯一检查，观察第二次写失败，但说明这只是单进程模拟。
4. 转到真实 PostgreSQL：行锁和唯一索引由数据库跨进程执行。
5. 下一课再用两个真实 client 自动释放 barrier，证明业务事务。

## 7. 邻里集市集成案例

本节只观察 Listing 行锁，不把它称为完整预约成功。

### 7.1 准备证据

在两个终端分别连接同一隔离数据库。每个终端先执行：

```sql
SELECT current_setting('server_version') AS server_version,
       current_setting('server_version_num')::integer AS server_version_num,
       current_database() AS database,
       pg_backend_pid() AS backend_pid;
```

两个 `backend_pid` 必须不同，server major 必须为 18。再检查迁移表和目标 Listing：

```sql
SELECT name, checksum, applied_at
FROM schema_migrations
ORDER BY applied_at, name;

SELECT id, status, version
FROM listings
WHERE id = '10000000-0000-4000-8000-000000000001';
```

若项目尚未建立 `schema_migrations`，记录该事实并先完成迁移治理；不要写“迁移已应用”。

### 7.2 终端 A 持锁

```sql
BEGIN;
SELECT pg_backend_pid(), clock_timestamp() AS locked_at,
       id, status, version
FROM listings
WHERE id = '10000000-0000-4000-8000-000000000001'
FOR UPDATE;
```

保持事务打开，但不要离开电脑或长时间占锁。

### 7.3 终端 B 竞争

```sql
BEGIN;
SET LOCAL lock_timeout = '5s';
SELECT pg_backend_pid(), clock_timestamp() AS acquired_at,
       id, status, version
FROM listings
WHERE id = '10000000-0000-4000-8000-000000000001'
FOR UPDATE;
```

B 应等待 A，或在 5 秒后得到锁超时。A 在超时前执行：

```sql
UPDATE listings
SET status = 'reserved', version = version + 1
WHERE id = '10000000-0000-4000-8000-000000000001';
COMMIT;
```

若 B 及时获得锁，它应读到已提交的 `reserved` 和递增版本。然后 B 执行 `ROLLBACK`。
若 B 已超时，其事务处于失败状态，也必须 `ROLLBACK`。

### 7.4 清理

这个实验没有插 Reservation，不能作为合法业务状态保留。仅在确认隔离测试数据库和 fixture ID
后执行清理事务：

```sql
BEGIN;
UPDATE listings
SET status = 'available', version = version + 1
WHERE id = '10000000-0000-4000-8000-000000000001'
  AND status = 'reserved';
COMMIT;
```

记录清理前后 version，不把 version 改回旧值；版本应保持单调递增。生产环境绝不为重跑教程而
重置真实商品。

## 8. 常见错误与排查路径

### 明确错误：事务内先查后写但不锁

```sql
BEGIN;
SELECT status FROM listings WHERE id = $1;
-- JS 判断 available
INSERT INTO reservations(...);
COMMIT;
```

| 五段 | 记录 |
| --- | --- |
| 现象 | 两个事务都通过 available 检查，第二个直到 INSERT/COMMIT 才冲突，或无约束时都成功 |
| 证据 | 两个会话的读取都发生在任一提交前，查询没有 FOR UPDATE/条件写 |
| 原因 | Read Committed 的普通读取不为后续写保留业务所有权 |
| 修复 | 锁 Listing 行，在锁内重读并保留唯一索引兜底 |
| 复验 | 下一课双 client 结果 1 created + 1 conflict，最终 active count=1 |

### 用 `sleep(100)` 制造并发

机器负载变化会让实验偶发。修复为 barrier 或显式数据库锁，让测试观察“双方已就绪”再同时继续。
等待时长只作为超时上限，不作为正确顺序的证明。

### 认为唯一索引让事务设计无关紧要

索引能守住最终数量，但服务仍要原子更新 Listing、映射特定冲突、避免部分提交。保留索引，同时
用行锁让领域流程和错误更清晰。

### 锁不存在的行

`SELECT ... WHERE id=$1 FOR UPDATE` 返回 0 行时没有目标行锁。需要依赖父资源行、唯一约束、
advisory lock（需严格设计）或可序列化事务，具体由不变量决定。本例锁始终存在的 Listing。

### 锁内调用外部服务

现象是锁等待增加、连接池耗尽，失败后外部调用不能回滚。修复为缩短事务，只写数据库事实；
提交后通过 outbox 触发通知。

## 9. 课后题

**问题 1：把 SELECT 和 INSERT 放进事务，为什么仍可能竞争？**

参考答案：事务保证本事务原子提交，不自动让普通 SELECT 锁定结果。Read Committed 下两个事务
可以在任一写入提交前都读到旧状态。

**问题 2：FOR UPDATE 和唯一索引谁可以删除？**

参考答案：本例不应互相替代。行锁协调正常业务路径并允许重读状态；唯一索引覆盖所有写路径，
兜底最终不变量。

**问题 3：为什么清理时 version 继续增加？**

参考答案：version 表示状态演进，回拨会让旧客户端版本看似重新有效。即使是测试清理，也应保持
单调或重新创建独立 fixture。

## 10. 实践练习

### 基础：画出三种交错

分别写出“无约束两次成功”“唯一约束让第二次失败”“FOR UPDATE 让第二次重读”的 T1/T2 时序。
判定标准：每个时序标出读取快照、等待点、提交点和最终预约数。

### 进阶：条件 UPDATE

在隔离库让两个会话执行相同 `UPDATE ... WHERE status='available' RETURNING`。判定标准：一个
返回 1 行、另一个 0 行；再解释为何还需要把 Reservation INSERT 放入同一事务。

### 故障注入：删除部分唯一索引

只在一次性测试数据库中删除索引，并用下一课的不安全路径尝试双写。判定标准：先证明迁移检查
发现索引缺失；恢复迁移后重新创建索引；最终扫描确认每个 listing 的 active count <= 1。
不得对共享或生产数据库执行。

## 11. 阶段验收

- [ ] 能分别解释原子性与隔离性。
- [ ] 内存 barrier 测试稳定得到 2 个错误预约，并明确标为模型。
- [ ] 不使用 sleep 作为交错正确性的证据。
- [ ] 能描述 Read Committed 的语句级快照。
- [ ] 能解释 FOR UPDATE 锁已有行、不锁不存在行。
- [ ] 两终端记录服务端 18、数据库、迁移与不同 backend PID。
- [ ] B 的等待/超时和 A 的提交顺序有实际记录后才声称观察到锁。
- [ ] 实验后事务全部结束，fixture 安全清理且 version 不回拨。
- [ ] 行锁、条件写和唯一索引的职责清楚。

## 12. 常见问题

**直接使用 SERIALIZABLE 是否更简单？**

它能检测更多异常，但会产生 `40001` 并要求整笔事务重试；仍需唯一约束、幂等和业务错误设计。
应根据跨行不变量选择，不是所有 API 的默认“更安全开关”。

**Node 单线程为什么还会有两个查询同时等待？**

JavaScript 在 `await` I/O 时允许事件循环处理其他请求；数据库还有多个连接、服务进程和副本。
单线程只描述一部分执行模型。

**`lock_timeout` 越长越可靠吗？**

不。它只改变等待多久。长事务、锁顺序和慢外部调用仍需修复；合理超时用于限制损害并留下失败
证据。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [PostgreSQL 18：事务隔离](https://www.postgresql.org/docs/18/transaction-iso.html)
- [PostgreSQL 18：显式锁](https://www.postgresql.org/docs/18/explicit-locking.html)
- [PostgreSQL 18：SELECT 锁子句](https://www.postgresql.org/docs/18/sql-select.html#SQL-FOR-UPDATE-SHARE)
- [PostgreSQL 18：约束](https://www.postgresql.org/docs/18/ddl-constraints.html)
- [PostgreSQL 18：监控统计](https://www.postgresql.org/docs/18/monitoring-stats.html)

## 我现在能做到什么

我能用确定性调度解释 check-then-write 的失败，用两个真实数据库会话观察行锁，并准确区分内存
模型、锁实验和完整业务并发证据。

## 单元导航

[本章入口](../05-transactions-concurrency.md) ·
[下一课：原子预约与真实并发复现](02-atomic-reservations-concurrency-reproduction.md) ·
[后端卷目录](../README.md)
