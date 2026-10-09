# 42-PostgreSQL 索引、事务与查询计划

## 目标

完成本知识单元后，学员应能解释 PostgreSQL 为什么在并发下仍能保持数据正确，并能用证据而不是直觉判断一条查询的快慢。

学员应能够：

1. 描述 PostgreSQL 的进程、共享内存、WAL 与 MVCC 等核心机制在一次读写中的作用。
2. 说明索引为什么能加速查询及其写入、存储代价，并区分 B-tree、Hash、GIN、GiST 的适用场景。
3. 判断一条查询能否命中已有索引，识别函数包裹、前导列缺失、低选择度等失效场景。
4. 解释 ACID 的四个性质与四种隔离级别，区分脏读、不可重复读和幻读。
5. 理解行锁、表锁与死锁的成因和处理方式。
6. 使用 `EXPLAIN` 与 `EXPLAIN ANALYZE` 阅读执行计划，并使用普通视图与物化视图封装查询。

本单元以 PostgreSQL 当前稳定大版本的通用行为为准。隔离级别、索引语法在各大版本间保持稳定，个别代价模型数字会随版本变化，应以本机 `EXPLAIN` 输出为准。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| PostgreSQL 当前稳定大版本 | 数据库服务端 | 能执行事务、建索引、查看计划 |
| `psql` | 命令行客户端 | 能开启多会话、设置隔离级别、读计划 |
| SQL（PostgreSQL 方言） | 事务控制、索引 DDL、查询 | 能写 `BEGIN`、`CREATE INDEX`、`EXPLAIN` |
| 系统统计视图 | 观察锁与活动会话 | 能查询活动与锁等待信息 |
| 终端多窗口 | 模拟并发事务 | 能在两个会话间制造并观察并发现象 |

环境说明：

- 本单元所有语法在 PostgreSQL 当前稳定大版本中通用，不锁定小版本。
- 观察并发现象需要两个 `psql` 会话窗口；建议给每个会话设置便于识别的提示或记录先后顺序。
- 执行 `EXPLAIN ANALYZE` 会真正执行语句；对 `UPDATE`、`DELETE` 使用时应放在事务中并回滚。
- 示例中出现的耗时、代价（cost）、行数（rows）均为示意值，不同机器和数据分布下不同。
- 本单元不引入 ORM；Prisma 如何承接索引与事务将在后续单元展开。

开始前检查环境：

```bash
psql -d postgres -c "SHOW server_version;"
psql -d postgres -c "SHOW default_transaction_isolation;"
psql -d postgres -c "SELECT now();"
```

预期观察：

- 第一条输出服务端版本字符串。
- 第二条通常输出 `read committed`，这是 PostgreSQL 的默认隔离级别。
- 第三条确认时间函数与时区设置可用。

## 详细的理论知识讲解和示例伪代码

### 1. PostgreSQL 特性与架构基础

#### 1.1 定义

PostgreSQL 是一个以 SQL 标准遵循度高、扩展性强著称的开源关系型数据库。理解后端性能问题前，需要知道四个架构要素：

- **连接与后端进程**：主服务进程监听端口，每个客户端连接通常对应一个独立的后端进程，负责解析、优化和执行该连接的 SQL。
- **共享内存**：所有后端进程共享的内存区，缓存常用数据页，避免每次都读磁盘。
- **WAL（Write-Ahead Log，预写日志）**：数据页修改前先顺序写入日志，崩溃后可据此重放，保证已提交事务不丢失。
- **MVCC（多版本并发控制）**：每行数据保留多个版本，读操作访问快照版本，写操作创建新版本，使普通读写互不阻塞。

#### 1.2 与后端的关系

一个 Node.js 服务通常通过连接池持有若干数据库连接，每个连接映射到一个后端进程。理解这一点可以解释多个现象：连接数不是越多越好（每个连接都有进程和内存开销）；普通 `SELECT` 不会阻塞别人的写入（MVCC）；数据库崩溃重启后数据能恢复（WAL）。

#### 1.3 示例

```sql
-- 查看当前连接对应的后端进程
SELECT pid, backend_start, state, query
FROM pg_stat_activity
WHERE pid <> pg_backend_pid();

-- 观察一次写入产生的 WAL（概念性验证）
SELECT pg_current_wal_lsn();

CREATE TABLE demo_wal (id INTEGER, note TEXT);

INSERT INTO demo_wal (id, note) VALUES (1, 'wal check');

SELECT pg_current_wal_lsn();
```

连接池在后端侧的概念伪代码：

```text
服务启动
  → 连接池预先建立 N 条连接（N 个后端进程）
请求到达
  → 从池中借一条连接执行 SQL
  → 用完归还，而不是每次新建 TCP 与进程连接
服务关闭
  → 优雅归还并关闭全部连接
```

#### 1.4 常见误区

> 一个数据库连接就是一个线程，开销很小。

PostgreSQL 中一条连接对应一个独立的操作系统进程及其私有内存。高并发下应使用连接池把应用侧的大量请求复用到有限连接上。

> 写入一旦返回成功，就是直接写进了磁盘数据文件。

提交时首先保证 WAL 持久化，数据页往往稍后由检查点批量刷盘。这正是“日志先行”既快又安全的原因。

### 2. 索引原理与代价

#### 2.1 定义

**索引**是建立在表的一列或多列上的辅助数据结构，让数据库不必扫描全表就能定位目标行。没有索引时，数据库只能做**顺序扫描（sequential scan）**：逐页读取整张表再过滤。

索引不是免费的：

- 占用额外存储空间；
- `INSERT`、`UPDATE`、`DELETE` 时需要同步维护索引；
- 过多索引会拖慢写入并增加优化器选择复杂度；
- 小表上索引可能比直接顺序扫描更慢。

#### 2.2 与后端的关系

接口变慢时，最常见的数据库原因就是查询没走索引，随数据量增长从毫秒级退化成秒级。后端工程师要能把“WHERE 条件的形状”和“表上有什么索引”对应起来，而不是只在应用代码里找原因。

#### 2.3 示例

```sql
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL,
  status TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 灌入测试数据后，为高频过滤列建索引
CREATE INDEX idx_orders_user_id ON orders (user_id);

-- 对比两条查询的计划
EXPLAIN SELECT * FROM orders WHERE user_id = 1001;

EXPLAIN SELECT * FROM orders WHERE amount = 99.00;
```

概念伪代码，表达扫描与索引的差别：

```text
表中有 1,000,000 行，目标行只有 5 行

无索引：读取约 1,000,000 行并逐行判断
有索引：沿索引树定位到 5 条记录位置，再回表读取这 5 行
```

#### 2.4 常见误区

> 给每列都建索引，查询一定更快。

索引要随写入维护。以写入为主的表上滥建索引会显著拉低吞吐，且很多单列索引永远不会被使用。

> 查询慢就一定是缺索引。

也可能是锁等待、网络往返、结果集本身过大、排序或 JOIN 计划糟糕。先看执行计划再下结论。

### 3. 索引类型：B-tree、Hash、GIN 与 GiST

#### 3.1 定义

PostgreSQL 支持多种索引类型，分别服务于不同的数据与查询形状：

| 类型 | 典型适用场景 | 支持的主要查询 |
|---|---|---|
| B-tree（默认） | 常规标量列 | 等值、范围、排序、前缀匹配 |
| Hash | 仅等值比较 | `=` |
| GIN（倒排索引） | 数组、JSONB、全文检索 | 包含、键存在、全文匹配 |
| GiST（通用搜索树） | 几何、范围类型、全文 | 重叠、包含、距离 |

- **B-tree**：`CREATE INDEX` 不指定类型时的默认值，数据有序，支持 `<`、`>`、`BETWEEN` 和 `ORDER BY`。
- **Hash**：只处理等值，不支持范围与排序；历史上还有过不做崩溃恢复的阶段，普通场景一般被 B-tree 覆盖。
- **GIN**：把组合值拆开索引（如 JSONB 的每个键值、数组每个元素），适合“是否包含”。
- **GiST**：面向不可简单排序的数据，如地理位置点、区间重叠；常配合距离操作符实现“附近的人”。

#### 3.2 与后端的关系

用户资料表的动态属性用 `JSONB` 存储，查询“包含某个偏好”时应使用 GIN；地理服务查“五公里内门店”用 GiST；绝大多数按用户 id、状态、时间过滤的列表查询用 B-tree。选错类型的典型表现是：索引建了却用不上。

#### 3.3 示例

```sql
-- B-tree：范围 + 排序
CREATE INDEX idx_orders_created_at ON orders (created_at);

-- Hash：仅等值
CREATE INDEX idx_orders_status_hash ON orders USING hash (status);

-- JSONB + GIN：按动态键查询
ALTER TABLE orders ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX idx_orders_metadata_gin ON orders USING gin (metadata);

SELECT * FROM orders WHERE metadata @> '{"channel": "mobile"}';

-- 数组 + GIN
ALTER TABLE orders ADD COLUMN labels TEXT[] NOT NULL DEFAULT '{}';
CREATE INDEX idx_orders_labels_gin ON orders USING gin (labels);

SELECT * FROM orders WHERE labels @> ARRAY['urgent'];
```

概念伪代码，说明选择逻辑：

```text
问题：查询条件长什么样？
  等值 / 范围 / 排序       → B-tree
  仅等值且想压缩结构       → Hash（多数情况仍用 B-tree）
  JSONB 包含、数组包含     → GIN
  地理距离、区间重叠       → GiST
```

#### 3.4 常见误区

> Hash 索引天然比 B-tree 快，等值查询都该用 Hash。

B-tree 同样擅长等值，还支持范围、排序并可用于多列场景。没有特殊理由时默认 B-tree 更稳妥。

> 对 `JSONB` 建普通 B-tree 就能加速内部键查询。

普通 B-tree 索引的是整个 JSON 值；按内部键或包含关系查询需要 GIN（或针对特定表达式建表达式索引）。

### 4. 索引命中条件与失效场景

#### 4.1 定义

优化器只有在“索引结构与查询条件匹配”时才会选择索引。B-tree 的关键命中规则包括：

- **复合索引遵循最左前缀**：索引 `(a, b, c)` 可用于 `(a)`、`(a,b)`、`(a,b,c)`，不能直接用于单独的 `(b)`。
- **不能对索引列做函数或运算包裹**：`WHERE date(created_at) = '...'` 无法使用 `created_at` 上的普通索引，可改用范围条件或表达式索引。
- **`LIKE '前缀%'`** 可使用 B-tree；`'%包含%'` 不能，应考虑全文检索。
- **选择度**：条件命中表中很大比例行时，顺序扫描可能更便宜，优化器会主动放弃索引。
- 隐式类型不匹配也可能导致索引失效。

#### 4.2 与后端的关系

接口查询条件的拼接方式直接决定索引能否命中。把日期函数包在列上、在应用层把数字参数传成字符串，都是“索引明明存在却全表扫描”的高频原因。后端要养成“改完 WHERE 形状后再看一次计划”的习惯。

#### 4.3 示例

```sql
CREATE INDEX idx_orders_user_status_created
  ON orders (user_id, status, created_at);

-- 能命中：包含前导列 user_id
EXPLAIN SELECT * FROM orders
WHERE user_id = 7 AND status = 'paid'
ORDER BY created_at DESC;

-- 不能按该复合索引定位：缺少前导列 user_id
EXPLAIN SELECT * FROM orders WHERE status = 'paid';

-- 不能使用普通索引：列被函数包裹
EXPLAIN SELECT * FROM orders
WHERE date_trunc('day', created_at) = '2026-10-01';

-- 可用：改写为范围条件
EXPLAIN SELECT * FROM orders
WHERE created_at >= '2026-10-01'
  AND created_at <  '2026-10-02';

-- 或建立匹配的表达式索引
CREATE INDEX idx_orders_day
  ON orders (date_trunc('day', created_at));
```

#### 4.4 常见误区

> 复合索引建了之后，里面任意一列都能用到它。

复合索引按列顺序组织，必须满足最左前缀。多列索引的列顺序应按“等值高频列在前、排序列收尾”的实际查询形状设计。

> 计划里出现顺序扫描就一定是索引失效。

小表、查询命中大部分行、或需要全表聚合时，顺序扫描本就是最优选择。判断标准是计划与数据规模是否匹配，而非扫描类型本身。

### 5. ACID、隔离级别与并发异常

#### 5.1 ACID 的定义

事务是一组要么全部成功、要么全部不生效的操作，具有四个性质：

- **原子性（Atomicity）**：事务内操作不可分割，失败则回滚到开始前。
- **一致性（Consistency）**：事务前后数据库满足约束与规则。
- **隔离性（Isolation）**：并发事务互不干扰，干扰程度由隔离级别定义。
- **持久性（Durability）**：提交成功后，即使崩溃数据也不丢失，由 WAL 保障。

#### 5.2 隔离级别与并发现象

SQL 标准定义四种隔离级别，级别越高一致性越强、并发度通常越低：

| 隔离级别 | 脏读 | 不可重复读 | 幻读 |
|---|---|---|---|
| Read Uncommitted | 可能（PostgreSQL 中实际不会） | 可能 | 可能 |
| Read Committed（默认） | 不会 | 可能 | 可能 |
| Repeatable Read | 不会 | 不会 | 标准下可能 |
| Serializable | 不会 | 不会 | 不会 |

三种并发现象：

- **脏读**：读到了另一个事务尚未提交、随后可能回滚的数据。PostgreSQL 任何级别都不允许脏读。
- **不可重复读**：同一事务内两次读同一行，因别人提交更新而得到不同值。
- **幻读**：同一事务内两次按条件查询，因别人提交插入/删除，第二次多出或少了行。

PostgreSQL 的 Repeatable Read 基于事务开始时的快照，实际连幻读也能避免；Serializable 则在快照之上做可序列化检测，发现无法形成合法串行顺序时报错让应用重试。

#### 5.3 与后端的关系

转账、扣库存、下单都必须放在事务里，否则中途失败会留下“扣了钱没发货”的半成品数据。隔离级别应按业务选择：默认 Read Committed 已覆盖多数场景；报表或对账事务可提高到 Repeatable Read；强一致编排可使用 Serializable，但必须处理“重试”这一应用责任。

#### 5.4 示例

```sql
-- 原子转账：两条更新同生共死
BEGIN;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

COMMIT;

-- 指定隔离级别
BEGIN ISOLATION LEVEL REPEATABLE READ;

SELECT balance FROM accounts WHERE id = 1;
-- 此时另一会话提交了对该行的更新
SELECT balance FROM accounts WHERE id = 1;
-- Repeatable Read 下两次结果相同

COMMIT;
```

模拟并发现象的双会话伪代码：

```text
会话 A                          会话 B
BEGIN;
SELECT SUM(amount)
  FROM orders WHERE status='new';
                                BEGIN;
                                INSERT INTO orders(status, amount)
                                VALUES ('new', 50);
                                COMMIT;
SELECT SUM(amount)
  FROM orders WHERE status='new';
COMMIT;

Read Committed：两次合计不同（看到新行）
Repeatable Read：两次合计相同（沿用开始时快照）
```

#### 5.5 常见误区

> 用了事务就不会出现任何并发问题。

普通事务提供原子性，但隔离现象由隔离级别决定。默认级别下同一事务两次查询仍可能看到不同结果。

> 把隔离级别调到最高最安全，没有代价。

Serializable 检测到冲突时会中止事务，应用必须捕获并重试；过高隔离还会降低并发吞吐。应按风险选择，而非一律拉满。

### 6. 锁、阻塞与死锁

#### 6.1 定义

当 MVCC 快照不足以解决冲突时，PostgreSQL 使用**锁**协调访问：

- **行级锁**：更新或删除一行时持有排他行锁，其他事务修改同一行必须等待。
- **表级锁**：DDL 与部分 DML 会申请表锁，例如修改表结构与普通写入互斥。
- `SELECT ... FOR UPDATE`：显式锁定查询到的行，用于“先查后改”的竞争场景。

**死锁（deadlock）**：两个事务互相等待对方持有的锁，形成环。数据库有死锁检测器，会自动中止其中一个事务并报错，应用应重试失败者。

#### 6.2 与后端的关系

接口偶发超时、请求堆积，很多是锁等待而非 CPU 问题。典型死锁来自两个事务以不同顺序更新同一批行。后端应保持统一的加锁顺序、把事务尽量缩短，并在必要时设置锁等待超时，避免请求无限挂起。

#### 6.3 示例

```sql
-- 会话 A
BEGIN;
UPDATE accounts SET balance = balance - 10 WHERE id = 1;
-- 不提交，随后更新 id = 2
UPDATE accounts SET balance = balance + 10 WHERE id = 2;
COMMIT;

-- 会话 B（若以相反顺序同时执行，将与 A 形成死锁）
BEGIN;
UPDATE accounts SET balance = balance - 20 WHERE id = 2;
UPDATE accounts SET balance = balance + 20 WHERE id = 1;
COMMIT;

-- 先锁定再处理，防止并发超扣
BEGIN;
SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;
-- 在同一事务内根据读到的值做更新
UPDATE accounts SET balance = balance - 30 WHERE id = 1;
COMMIT;
```

查看阻塞关系：

```sql
SELECT blocked.pid AS blocked_pid,
       blocked.query AS blocked_query,
       blocking.pid AS blocking_pid,
       blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking
  ON blocking.pid = ANY (pg_blocking_pids(blocked.pid))
WHERE CARDINALITY(pg_blocking_pids(blocked.pid)) > 0;
```

#### 6.4 常见误区

> 普通 SELECT 会把行锁住，阻塞别人写入。

PostgreSQL 的普通读基于 MVCC 快照，不加行锁、不等待写；需要锁定语义时才用 `FOR UPDATE` 等子句。

> 死锁是数据库 Bug，重试也没用。

死锁是应用访问顺序造成的逻辑环，数据库选择牺牲者是正常保护机制。统一加锁顺序可预防，捕获错误后重试可兜底。

### 7. EXPLAIN 与 EXPLAIN ANALYZE

#### 7.1 定义

`EXPLAIN` 让数据库展示优化器选择的执行计划而不执行语句；`EXPLAIN ANALYZE` 真正执行，并对照实际运行情况。

阅读计划的关键字段：

- **节点类型**：Seq Scan（顺序扫描）、Index Scan（索引扫描并回表）、Bitmap Heap Scan、Nested Loop、Hash Join、Merge Join、Sort、Aggregate。
- **cost**：启动代价与总代价的估算值，是相对模型不是毫秒。
- **rows**：预估返回行数；`ANALYZE` 后还有 `actual rows` 实际值。
- **actual time**：实际毫秒耗时。
- 估算行数与实际行数严重偏差，通常说明统计信息过旧或谓词选择度估算失准。

阅读顺序：计划从最内层缩进节点向外执行；关注实际行数最大、耗时最高的节点。

#### 7.2 与后端的关系

查询优化必须“先测后改”：用 `EXPLAIN ANALYZE` 找到扫描大表或排序溢写的节点，再针对性加索引或改写；改完用同样语句复跑，比较实际耗时。这与代码调试先收集证据是同一种方法论。

#### 7.3 示例

```sql
EXPLAIN
SELECT * FROM orders WHERE user_id = 1001;

EXPLAIN ANALYZE
SELECT user_id, COUNT(*) AS order_count
FROM orders
WHERE created_at >= '2026-01-01'
GROUP BY user_id
ORDER BY order_count DESC;

-- 写操作配合事务，避免分析计划时污染数据
BEGIN;

EXPLAIN ANALYZE
UPDATE orders SET status = 'archived'
WHERE created_at < '2025-01-01';

ROLLBACK;
```

概念伪代码，展示一次优化闭环：

```text
1. EXPLAIN ANALYZE 慢查询
2. 发现 Seq Scan，actual rows 很少但 cost 很高
3. 为过滤列建立合适索引
4. 复跑同一查询
5. 计划变为 Index Scan，actual time 明显下降
6. 记录前后对比作为证据
```

#### 7.4 常见误区

> 看到 cost 数字大就等于查询慢。

cost 是无量纲估算值，用于比较同一数据库中不同计划；真实快慢以 `ANALYZE` 的 actual time 和业务测量为准。

> 计划里预估行数不准，是 SQL 写错了。

估算依赖表的统计信息。数据大量变化后可更新统计信息，再观察预估与实际是否贴近。

### 8. 视图：封装查询与逻辑复用

#### 8.1 定义

**视图（view）**是一条被命名、存储下来的 `SELECT`，使用时像表一样查询，但本身不存数据（每次查询展开其定义）：

- 用于隐藏复杂 JOIN、统一权限口径和提供稳定逻辑接口。
- 可更新的简单视图支持 `INSERT`、`UPDATE`；加上检查选项后可防止写入的行在视图中不可见。
- **物化视图（materialized view）**会真正存储结果集，读取快但数据会过期，需要手动或调度刷新。

#### 8.2 与后端的关系

多个接口都需要“订单 + 用户 + 状态文案”的拼装逻辑时，可以在数据库侧用视图统一口径，避免每个服务各写一份 JOIN。报表查询慢且允许轻微延迟时，物化视图用“定期重算”换取“即时读取”，是常用取舍。

#### 8.3 示例

```sql
CREATE VIEW active_user_orders AS
SELECT orders.id AS order_id,
       orders.amount,
       orders.created_at,
       users.email AS user_email
FROM orders
JOIN users ON users.id = orders.user_id
WHERE orders.status = 'paid';

-- 像查询表一样使用
SELECT * FROM active_user_orders
ORDER BY created_at DESC
LIMIT 20;

-- 可更新视图加检查选项
CREATE VIEW recent_orders AS
SELECT * FROM orders WHERE created_at >= '2026-01-01'
WITH LOCAL CHECK OPTION;

-- 物化视图：报表口径固定、允许延迟
CREATE MATERIALIZED VIEW daily_order_summary AS
SELECT date_trunc('day', created_at) AS day,
       COUNT(*) AS order_count,
       SUM(amount) AS total_amount
FROM orders
GROUP BY 1;

-- 刷新（具体并发选项以当前版本文档为准）
REFRESH MATERIALIZED VIEW daily_order_summary;
```

#### 8.4 常见误区

> 视图能让底层查询自动变快。

普通视图不存数据、不预计算，复杂视图只是把复杂查询藏了起来，性能仍由展开后的语句和索引决定。

> 物化视图的数据始终是最新的。

物化视图是某个时间点计算出的快照，必须设计刷新策略；对实时性要求高的数据不能依赖过期快照。

## 课后题

1. 请解释 WAL 和 MVCC 分别为 PostgreSQL 解决了什么问题。为什么普通读和写在大多数情况下互不阻塞？
2. 索引有哪些代价？场景分析：一张以写入为主、每天新增百万行的日志表，如果被随手加上二十个单列索引，会出现什么后果？
3. B-tree、Hash、GIN、GiST 各自适合什么查询形状？请为“JSONB 字段是否包含某个键值”的查询选择索引类型并说明理由。
4. 场景分析：某复合索引为 `(tenant_id, status, created_at)`，查询 `WHERE status = 'open' ORDER BY created_at DESC` 为什么难以利用它？应如何调整索引或查询？
5. 为什么 `WHERE date(created_at) = '2026-10-01'` 可能无法命中 `created_at` 上的 B-tree？给出两种改写思路。
6. 请用自己的语言解释脏读、不可重复读和幻读的区别。PostgreSQL 默认隔离级别下会出现其中哪些现象？
7. 场景分析：两个接口事务都先更新订单再更新库存，但各自的顺序相反，线上周期性出现死锁报错。请解释成因并给出两条改进措施。
8. `EXPLAIN` 和 `EXPLAIN ANALYZE` 的区别是什么？为什么对 `UPDATE` 做执行计划分析时要放进事务并回滚？
9. 场景分析：执行计划显示某查询对千万行表做 Seq Scan，但该条件实际只返回 3 行。请列出至少三个可能原因及对应验证方法。
10. 普通视图和物化视图有什么本质差别？请描述一个适合使用物化视图的业务场景，并说明刷新策略需要考虑什么。

## 实践练习题

### 练习 1：制造并观察索引效果

#### 任务

创建 `orders` 表并灌入不少于十万行测试数据，对比同一查询在建索引前后的执行计划与实际耗时。

#### 步骤约束

1. 使用集合生成（如 `generate_series`）一次性批量造数，不用逐条插入。
2. 数据要倾斜：少量用户拥有大量订单，保证查询选择度可观察。
3. 先对 `WHERE user_id = <某高频用户>` 做 `EXPLAIN ANALYZE`，记录扫描类型、cost、actual rows 与耗时。
4. 在 `user_id` 上建立 B-tree 索引后复跑同一查询，记录前后差异。
5. 再分别执行命中大部分行与命中极少行的查询，观察优化器对索引的取舍。
6. 所有结果整理成对比表，结论必须引用计划节点与数字。

#### 提交物

- `01_setup.sql`（建表与造数）；
- `02_index_test.sql`（查询与建索引语句）；
- `evidence/plan-before.txt`、`evidence/plan-after.txt`；
- 一页对比结论，说明索引何时有效、何时被优化器放弃。

#### 验收标准

- 数据量达到要求且存在倾斜；
- 前后两份计划真实来自同一查询；
- 能解释选择度如何影响优化器决策；
- 没有仅凭“感觉变快”下结论。

### 练习 2：双会话复现并发现象与死锁

#### 任务

使用两个 `psql` 会话，分别在 Read Committed 与 Repeatable Read 下复现不可重复读 / 幻读的差别，并构造一次真实死锁。

#### 步骤约束

1. 编写 `session-a.sql` 与 `session-b.sql`，用注释标注每条语句的执行先后节拍。
2. 第一轮：默认隔离级别下，B 提交更新或插入后，A 的第二次查询看到变化。
3. 第二轮：A 使用 Repeatable Read，重复相同节拍，验证第二次结果与第一次一致。
4. 第三轮：两个事务以相反顺序更新同一两行，观察数据库返回的死锁错误信息。
5. 记录每一轮两个会话的完整对话文本与最终提交或回滚动作。
6. 练习结束必须确认没有未关闭的事务和残留行锁。

#### 提交物

- 两份会话脚本（含节拍注释）；
- 三轮现象的完整会话记录；
- `concurrency-report.md`：现象、隔离级别对应关系、死锁成因与预防建议。

#### 验收标准

- 两种隔离级别下的差异被实际观察到并正确解释；
- 死锁确实由数据库检测并报告，而非手工猜测；
- 能说明应用层应如何重试被中止的事务；
- 练习环境清理干净，无锁残留。

### 练习 3：慢查询诊断与视图封装综合练习

#### 任务

针对给定的三条“慢查询”，完成诊断、优化和封装，形成可复现的优化报告。

待优化查询范围：

- 按用户与状态过滤的订单列表（目前顺序扫描）；
- 按天统计订单数与总金额的聚合查询；
- 订单与用户多表 JOIN 的后台列表。

#### 步骤约束

1. 先对每条查询运行 `EXPLAIN ANALYZE`，保存原始计划。
2. 根据计划选择并建立索引（至少包含一个复合索引），不得无脑给所有列加索引。
3. 复跑并保存新计划，逐条说明关键节点变化与耗时差异。
4. 把第三条 JOIN 查询封装成普通视图，演示通过视图查询结果正确。
5. 把第二条聚合改造成物化视图，执行一次刷新并对比直接聚合的查询代价。
6. 在报告中写明：哪些优化是“索引命中”，哪些是“预计算换实时性”，各自代价是什么。

#### 步骤约束补充

1. 所有写操作性质的计划分析必须在事务中回滚。
2. 不得修改练习要求之外的数据库参数。
3. 报告中的耗时必须标注数据规模与机器条件。

#### 提交物

- `sql/01_base.sql`、`sql/02_optimized.sql`、`sql/03_views.sql`；
- `evidence/` 下每条查询优化前后的计划文本；
- `optimization-report.md`：诊断过程、索引选择依据、视图与物化视图取舍。

#### 验收标准

- 每条慢查询的根因都有计划证据；
- 建立的索引与查询形状匹配，优化后计划出现对应索引访问；
- 能区分普通视图与物化视图的语义和时效差别；
- 报告包含优化前后量化对比，结论可追溯。

## 阶段验收作业

### 作业名称

PostgreSQL 索引、事务与查询计划诊断实战

### 作业场景

线上一个订单系统出现三类问题：部分列表接口随数据增长持续变慢；偶发请求堆积并伴随锁等待；财务同事抱怨同一报表在不同时间跑出不同口径。团队要求你以数据库侧证据定位问题，交付索引方案、事务与隔离级别建议，以及可复用的查询封装，并现场演示。

### 提交物与目录要求

```text
pg-perf-lab/
├── sql/
│   ├── 01_setup.sql
│   ├── 02_indexes.sql
│   ├── 03_transactions.sql
│   └── 04_views.sql
├── evidence/
│   ├── plans-before/
│   ├── plans-after/
│   └── concurrency.md
├── diagrams/
│   └── index-and-lock-notes.md
└── README.md
```

要求：

- 订单、用户等表及不少于十万行测试数据，数据有倾斜。
- 至少一个复合索引、一个 GIN 或表达式索引场景，索引与查询一一对应。
- 一份事务脚本覆盖原子多表更新，并演示隔离级别差异。
- 一个普通视图与一个物化视图，分别服务列表口径与日报口径。
- 完整的优化前后计划对比，以及并发实验记录。

### 演示步骤

学员需要在 20 分钟内完成：

1. 执行建表与造数脚本，说明数据规模与倾斜设计。
2. 选取一条慢查询展示原始 `EXPLAIN ANALYZE`，指出最耗时节点。
3. 建立匹配索引并复跑，用计划与实际耗时证明优化效果。
4. 使用两个会话演示默认隔离级别与 Repeatable Read 的结果差异。
5. 演示一次 `SELECT ... FOR UPDATE` 或死锁检测，解释锁等待链路。
6. 展示普通视图与物化视图查询结果，并说明刷新与时效取舍。
7. 回答导师提出的一个变更，例如“查询改成只看最近三十天，索引还命中吗”。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 架构与原理理解 | 20 | 正确解释 WAL、MVCC、连接与锁的作用 |
| 索引设计 | 25 | 类型选择正确，复合索引顺序合理，无滥建 |
| 事务与并发 | 20 | 原子性脚本正确，隔离现象与死锁解释到位 |
| 查询计划诊断 | 20 | 能读懂节点与行数偏差，优化有前后证据 |
| 视图与综合表达 | 15 | 视图与物化视图取舍清晰，演示与文档完整 |

细分评分规则：

#### 架构与原理理解：20 分

- WAL、检查点与持久性：5 分；
- MVCC 与读写不阻塞：6 分；
- 连接进程与连接池概念：4 分；
- 索引代价理解：5 分。

#### 索引设计：25 分

- 四类索引适用场景正确：8 分；
- 复合索引最左前缀与列顺序合理：9 分；
- 命中条件与失效场景判断正确：8 分。

#### 事务与并发：20 分

- ACID 解释准确：5 分；
- 隔离级别与三种现象对应正确：8 分；
- 锁等待与死锁处理正确：7 分。

#### 查询计划诊断：20 分

- 能读懂计划节点、cost 与 actual rows：7 分；
- 根因判断与证据对应：6 分；
- 优化前后量化对比完整：7 分。

#### 视图与综合表达：15 分

- 普通视图与物化视图差别清晰：6 分；
- 刷新策略与时效取舍合理：4 分；
- 目录规范、演示流畅：5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 无法解释 MVCC 与 WAL 的作用，把普通读描述为“会锁住整表”。
2. 索引与查询形状不匹配（如为 JSONB 包含查询只建普通 B-tree）且无法说明原因。
3. 复合索引最左前缀概念错误，或在演示中无法判断查询是否命中。
4. 多表资金类更新没有使用事务，或无法解释失败后的数据状态。
5. 混淆脏读、不可重复读与幻读，或认为 PostgreSQL 会发生脏读。
6. 对写操作执行 `EXPLAIN ANALYZE` 时未做事务保护，造成数据被真实修改。
7. 优化报告没有原始计划与复跑证据，只凭主观描述“变快了”。
8. 提交真实密码、令牌、私钥等敏感信息，或只提交截图。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解 PostgreSQL 核心架构 | 现场解释与 `index-and-lock-notes.md` |
| 理解索引原理与代价 | 索引设计脚本与取舍说明 |
| 正确选择索引类型 | 复合索引与 GIN / 表达式索引应用 |
| 判断索引命中与失效 | 优化前后计划对比 |
| 理解 ACID 与隔离级别 | 事务脚本与双会话并发记录 |
| 理解锁与死锁 | 锁等待查询与死锁演示 |
| 使用 EXPLAIN 诊断查询 | 计划文件与现场诊断 |
| 使用视图封装查询 | 普通视图与物化视图演示 |

### 提交前自检

- [ ] 六个二级标题完整，理论小节均含定义、后端关系、示例与误区。
- [ ] 测试数据达到规模且存在倾斜，能支持计划对比。
- [ ] 每个索引都能对应一条真实查询，没有为建而建。
- [ ] 并发实验结束后全部事务已提交或回滚，无锁残留。
- [ ] 写操作的计划分析都在事务中回滚。
- [ ] 优化前后计划成对保存，结论引用了节点与数字。
- [ ] 明确标注普通视图与物化视图的刷新和时效语义。
- [ ] README 可指导他人复现，且不含敏感信息。
