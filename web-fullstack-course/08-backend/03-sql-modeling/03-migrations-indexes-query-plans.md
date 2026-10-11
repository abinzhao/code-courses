# 迁移、索引与执行计划：用真实查询证明设计

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 完成第三个前向迁移，为具体查询建立索引，并用 PostgreSQL 18 EXPLAIN 观察计划 |
| 练习目录 | `$HOME/code/market-backend-lab/sql-modeling` |
| 前置状态 | 目标库已按 001→002 应用，约束故障实验已恢复 |
| 主要产物 | `migrations/003_query_indexes.sql`、迁移校验和记录、计划证据 |
| 成功证据 | 迁移状态精确为三条；索引对应查询；代表性数据下计划可解释 |
| 失败证据 | 重跑历史迁移、缺索引和错误查询形状产生明确差异 |
| 环境边界 | EXPLAIN 只代表该版本、数据量、统计信息与参数，不是生产性能保证 |

## 1. 任务背景

建表和约束解决“数据能否合法存在”，索引解决“数据库怎样找到需要的行”。两者都要通过迁移交付：

- 开发、测试和生产必须按同一顺序得到结构；
- 失败不能留下半套对象；
- 已应用文件不能被静默编辑；
- 索引必须服务于真实 WHERE/ORDER BY/JOIN；
- 执行计划必须在目标 PostgreSQL 与代表性数据上观察。

“给每列都建索引”会增加写入、磁盘、缓存和维护成本；“EXPLAIN 出现 Seq Scan 就失败”也不正确，
因为小表全扫可能最便宜。正确问题是：在当前数据分布和查询目标下，规划器为什么做这个选择？

## 2. 学习目标

完成本课后，你能够：

1. 按顺序应用不可变前向迁移；
2. 用状态表和文件校验和区分“文件存在”与“已应用版本”；
3. 说明 DDL 事务、锁和 `CREATE INDEX CONCURRENTLY` 的边界；
4. 从 WHERE、JOIN、ORDER BY、LIMIT 推导 B-tree 列顺序；
5. 解释选择性、最左前缀和索引写入成本；
6. 使用 `EXPLAIN` 与 `EXPLAIN (ANALYZE, BUFFERS)`；
7. 不把 estimates、actual、planning/execution time 混在一起；
8. 为小表 Seq Scan 给出合理解释；
9. 通过故障注入比较有无索引计划；
10. 说明回滚为什么不总能用 down migration无损完成。

## 3. 预备知识

先确认 PostgreSQL 18 与迁移状态：

```bash
cd "$HOME/code/market-backend-lab/sql-modeling"
psql --version
psql -X -v ON_ERROR_STOP=1 -d market_model_lab -c '
SELECT
  current_database(),
  current_setting('\''server_version'\''),
  current_setting('\''server_version_num'\'');
SELECT version FROM schema_migrations ORDER BY version;
'
```

预期只有：

```text
001_core_tables
002_invariants
```

记录现有文件校验和：

```bash
shasum -a 256 migrations/001_core_tables.sql
shasum -a 256 migrations/002_invariants.sql
```

把结果写入个人 `evidence/migration-checksums.txt`。它用于发现历史文件被改写，不含密码。
真实迁移平台通常自己维护校验和和锁，应遵循平台机制，不重复发明一套并行状态。

## 4. 核心理论

### 4.1 迁移是有顺序的历史

每个迁移只从一个已知版本前进到下一个版本。已经在任何共享环境应用后：

- 不编辑 001/002；
- 修复错误要新增 004 等迁移；
- 不用 `IF NOT EXISTS` 掩盖“对象同名但定义不同”；
- 应用代码部署要与 schema 兼容窗口协调。

本教学状态表只记录 version/time。文件校验和单独保存；生产工具应在锁、并发执行和 checksum 上提供更完整保证。

### 4.2 DDL 事务与并发索引

PostgreSQL 多数 DDL 可在事务中回滚。本课普通 `CREATE INDEX` 放在 BEGIN/COMMIT，适合隔离小表。
生产大表普通建索引会阻塞写入；`CREATE INDEX CONCURRENTLY` 降低阻塞，但：

- 不能放在普通事务块；
- 扫描更久、资源成本更高；
- 失败可能留下 invalid index，需要检测和清理；
- 多步迁移的原子性发生变化。

不能把本课事务脚本直接宣称为大表零停机方案。

### 4.3 从查询形状推导索引

邻里集市近期可售列表：

```sql
WHERE status = 'available'
ORDER BY created_at DESC, id DESC
LIMIT 20
```

适合 `(status, created_at DESC, id DESC)`：先等值 status，再按排序列遍历，id 作为稳定并列项。

卖家自己的近期商品：

```sql
WHERE owner_id = $1
ORDER BY created_at DESC, id DESC
```

适合 `(owner_id, created_at DESC, id DESC)`。

列顺序不能任意交换。索引 `(created_at, owner_id)` 对只按 owner 查通常无法利用最左等值前缀完成同样工作。

### 4.4 外键不会自动创建引用列索引

PostgreSQL 为主键/唯一约束创建被引用侧索引，但不会自动给每个 referencing FK 列建索引。
删除 user/listing 检查引用、按 listing 查收藏、按 buyer 查预约历史时，合适索引可以避免大表全扫。

仍然只为真实查询建立：

- favorites 按 listing 查收藏者/删除引用；
- reservations 按 buyer + created_at 查个人预约；
- active reservation 已由 002 部分唯一索引覆盖 listing active 查询。

### 4.5 选择性决定成本

布尔或低基数 status 单列选择性可能很低，单列索引不一定有利。但与排序和 LIMIT 组合后，
复合索引可以直接取前 20 行。规划器还会比较随机/顺序 I/O、缓存、表大小和统计信息。

统计信息过期会造成估算偏差。测试数据变更后运行 `ANALYZE`，但不要在每次请求里执行。

### 4.6 阅读 EXPLAIN

`EXPLAIN` 只规划，不执行查询；`EXPLAIN ANALYZE` 真正执行。对 SELECT 教学查询风险较低，
对 UPDATE/DELETE 会真的改数据，必须包事务并回滚或只用 EXPLAIN。

重点字段：

- 节点：Seq Scan、Index Scan、Bitmap、Sort、Nested Loop 等；
- `cost`：规划器相对成本，不是毫秒；
- `rows`：估算行数；
- `actual time/rows/loops`：ANALYZE 实际观测；
- `Buffers`：缓存命中/读取；
- Filter 和 Rows Removed：扫描后丢弃量。

### 4.7 rollback 不总是逆迁移

新增索引可以安全 drop，新增 nullable 列也可能容易回退；删除列、数据清洗、枚举收窄可能不可逆。
发布失败时常用兼容代码回退 + 前向修复，而不是机械运行 down migration。恢复数据库还需验证备份和恢复时间，
不在本章伪造。

## 5. 元素、属性、API 或配置清单

| SQL / 命令 | 用途 | 边界 |
| --- | --- | --- |
| `CREATE INDEX` | 普通事务内建索引 | 大表可能阻塞写 |
| `CREATE INDEX CONCURRENTLY` | 减少大表写阻塞 | 不在事务块，需处理 invalid |
| 多列 B-tree | 等值 + 排序/范围 | 受列顺序和最左前缀影响 |
| `DESC` | 与主要排序方向对齐 | B-tree 可反向扫描但混合方向需审查 |
| `INCLUDE` | 覆盖额外返回列 | 增大索引，本课不使用 |
| 部分索引 | 只索引谓词子集 | 查询谓词需能推出索引谓词 |
| `ANALYZE` | 更新统计信息 | 不是性能优化本身 |
| `EXPLAIN` | 观察估算计划 | 不执行查询 |
| `EXPLAIN ANALYZE` | 执行并观察实际 | 写查询会真的写 |
| `BUFFERS` | 观察缓存/读取 | 受预热和环境影响 |
| `pg_indexes` | 观察索引定义 | 不能证明被使用 |
| `pg_stat_user_indexes` | 累积使用统计 | 需足够代表性流量 |
| `schema_migrations` | 已应用版本 | 不读文件内容 |
| `shasum -a 256` | 记录文件不可变证据 | 需安全存放基线 |
| `ON_ERROR_STOP` | 首错使 psql 非零退出 | shell 必须开启 |

## 6. 最小可运行案例

创建完整文件 `migrations/003_query_indexes.sql`：

```sql
BEGIN;

CREATE INDEX listings_status_recent_idx
  ON listings(status, created_at DESC, id DESC);

CREATE INDEX listings_owner_recent_idx
  ON listings(owner_id, created_at DESC, id DESC);

CREATE INDEX favorites_listing_user_idx
  ON favorites(listing_id, user_id);

CREATE INDEX reservations_buyer_recent_idx
  ON reservations(buyer_id, created_at DESC, id DESC);

INSERT INTO schema_migrations(version)
VALUES ('003_query_indexes');

COMMIT;
```

每个索引对应：

- 公共可售列表；
- owner 商品管理列表；
- 按商品查收藏/外键删除检查；
- 买家预约历史。

active reservation 按 listing 查询已经有
`reservations_one_active_per_listing_idx`，不再建立重复前缀索引，除非实际历史查询证明需要。

执行：

```bash
psql -X -v ON_ERROR_STOP=1 -d market_model_lab \
  -f migrations/003_query_indexes.sql
```

观察：

```sql
SELECT version, applied_at
FROM schema_migrations
ORDER BY version;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('listings', 'favorites', 'reservations')
ORDER BY tablename, indexname;
```

预期迁移状态精确为 001/002/003，四个新索引和既有主键/唯一索引都可见。
索引存在不等于查询一定使用，下一节看计划。

## 7. 邻里集市集成案例

### 7.1 小表计划

先执行：

```sql
ANALYZE listings;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title, price_cents, created_at
FROM listings
WHERE status = 'available'
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

只有一两行时，Seq Scan + Sort 可能比索引访问便宜，不应判失败。记录：

- 节点；
- estimated/actual rows；
- 是否出现 Sort；
- shared hit/read；
- planning/execution time；
- PostgreSQL 版本和当前总行数。

### 7.2 在可回滚代表数据上观察

以下只在隔离练习库运行：

```sql
BEGIN;

INSERT INTO listings(
  id,
  title,
  description,
  price_cents,
  owner_id,
  status,
  version,
  created_at
)
SELECT
  (
    '30000000-0000-4000-8000-' ||
    lpad(series_id::text, 12, '0')
  )::uuid,
  '计划测试商品 ' || series_id,
  '仅用于 EXPLAIN 的事务内教学数据',
  series_id % 100000,
  '00000000-0000-4000-8000-000000000001'::uuid,
  CASE
    WHEN series_id % 3 = 0 THEN 'sold'
    ELSE 'available'
  END,
  1,
  '2026-01-01T00:00:00.000Z'::timestamptz
    + series_id * interval '1 second'
FROM generate_series(1, 20000) AS source(series_id);

ANALYZE listings;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title, price_cents, created_at
FROM listings
WHERE status = 'available'
ORDER BY created_at DESC, id DESC
LIMIT 20;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title, price_cents, created_at
FROM listings
WHERE owner_id = '00000000-0000-4000-8000-000000000001'
ORDER BY created_at DESC, id DESC
LIMIT 20;

ROLLBACK;
ANALYZE listings;
```

`EXPLAIN ANALYZE` 会执行 SELECT，但插入数据在事务末回滚。`ANALYZE` 的统计影响不应依赖事务回滚，
所以最后对恢复后的小表再次 `ANALYZE`。

可判定标准：

- 公共列表计划能利用 `listings_status_recent_idx`，或对未使用给出基于实际输出的解释；
- owner 列表能利用 `listings_owner_recent_idx`；
- LIMIT 不需要先排序全部匹配行时，计划中不应出现高成本全量 Sort；
- actual rows/loops 与语义相符；
- 不复制本文不存在的“标准毫秒数”。

### 7.3 keyset 查询形状

下一页使用稳定二元游标：

```sql
SELECT id, title, price_cents, created_at
FROM listings
WHERE status = 'available'
  AND (created_at, id) < ($1::timestamptz, $2::uuid)
ORDER BY created_at DESC, id DESC
LIMIT $3;
```

同一 `(status, created_at DESC, id DESC)` 索引与查询顺序一致。`$1/$2/$3` 是参数，不可字符串拼接。
游标编码和并发变化语义在第 7 章展开。

## 8. 常见错误与排查路径

### 8.1 明确错误：为每列单独建索引

错误策略：

```sql
CREATE INDEX ON listings(status);
CREATE INDEX ON listings(created_at);
CREATE INDEX ON listings(owner_id);
CREATE INDEX ON listings(id);
```

| 项目 | 记录 |
| --- | --- |
| 现象 | 写入维护多个索引，查询仍可能额外 Sort |
| 证据 | EXPLAIN 没有一个索引同时满足等值和排序；pg_indexes 重复主键 id |
| 原因 | 从列名而不是查询形状设计索引 |
| 修复 | 按 status/owner 等值 + created_at/id 排序建立复合索引，删除证实冗余者 |
| 复验 | 代表查询计划改善，写入索引数量有依据 |

### 8.2 把任何 Seq Scan 当失败

**现象：** 小表计划用 Seq Scan，被迫设置 `enable_seqscan=off`。
**证据：** 表只有一行，全扫成本低于索引跳转。
**原因：** 把节点名称当绝对质量分。
**修复：** 看数据量、选择性、actual rows、buffers；用代表数据比较。
**复验：** 不修改规划器开关也能解释小表和大表差异。

### 8.3 查询对列使用函数而索引不匹配

```sql
WHERE lower(title) = lower($1)
```

普通 `(title)` 索引不能自动等价于 `lower(title)` 表达式索引。修复可选：

- 产品先规范化并保存独立规范列；
- 建与查询完全一致的表达式索引；
- 改用适合搜索需求的索引/全文搜索。

必须从真实搜索语义决定，不能仅为让 EXPLAIN 出现 Index Scan 改业务规则。

### 8.4 编辑已应用 003

**现象：** 新环境与旧环境同为 version 003，实际索引定义不同。
**证据：** 文件 checksum 与基线不一致，状态表看不出差异。
**原因：** 修改历史迁移而非新增前向修复。
**修复：** 恢复历史文件，新增 004 drop/create 修复并审查锁影响。
**复验：** 所有环境通过同一顺序收敛，checksum 一致。

### 8.5 EXPLAIN ANALYZE 用在生产写语句

**现象：** 为“看计划”实际执行 UPDATE/DELETE。
**原因：** 忽略 ANALYZE 会运行语句。
**修复：** 生产写入先用 EXPLAIN；隔离库才在事务中 ANALYZE 后 ROLLBACK。
**复验：** 行数与业务数据无意外变化。

## 9. 课后题

**问题 1：为什么索引 `(status, created_at DESC, id DESC)` 比三个单列索引更贴近列表查询？**
参考答案：它能沿同一有序结构先限定 status，再按稳定排序取 LIMIT，减少额外扫描/排序。

**问题 2：为什么索引存在不等于一定使用？**
参考答案：规划器按表大小、选择性、统计、缓存和成本选择；小表全扫或低选择性可能更便宜。

**问题 3：`cost=100` 是否代表 100 ms？**
参考答案：不是。cost 是规划器内部相对单位；实际时间只在 ANALYZE 中观察且受环境影响。

**问题 4：为什么删除列不能假设 down migration 无损？**
参考答案：列数据已丢失，重新建同名列不能恢复内容；需要备份/恢复或前向兼容策略。

## 10. 实践练习

### 基础：记录计划证据表

为小表和 20k 事务数据各记录一次公共列表计划。

可判定标准：

- 包含版本、总行数、节点、estimated/actual rows、buffers、时间；
- 不把 cost 当毫秒；
- 解释为何节点可能变化；
- 最后回滚并重新 ANALYZE。

### 进阶：验证 keyset 查询

从第一页最后一行取 `(created_at,id)`，作为参数执行下一页。

可判定标准：

- 排序列与游标列完全一致；
- 同一时间用 id 打破并列；
- 无重复第一页最后一项；
- EXPLAIN 能使用对应复合索引；
- 参数化，不拼接游标文本。

### 故障注入：事务内移除索引

在隔离库：

```sql
BEGIN;
DROP INDEX listings_status_recent_idx;
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title, price_cents, created_at
FROM listings
WHERE status = 'available'
ORDER BY created_at DESC, id DESC
LIMIT 20;
ROLLBACK;
```

可判定标准：

1. 记录缺索引计划是否出现额外 Sort/扫描；
2. ROLLBACK 后索引仍存在；
3. 再次 EXPLAIN 恢复；
4. 不设置 `enable_seqscan=off` 操纵结论；
5. 写完整现象、证据、原因、修复、复验。

## 11. 阶段验收

- [ ] PostgreSQL 18 client/server/target 与三条迁移状态已记录。
- [ ] 001/002 checksum 在创建 003 前保存，历史文件未编辑。
- [ ] 003 事务成功，四个索引都对应具体查询/引用。
- [ ] catalog 索引定义与文件一致，没有重复主键索引。
- [ ] 小表 Seq Scan 能合理解释，不用规划器开关制造 Index Scan。
- [ ] 代表数据在事务内创建并回滚，统计在恢复后更新。
- [ ] EXPLAIN 记录 estimates、actual、loops、buffers 和环境。
- [ ] keyset 查询与复合索引排序一致。
- [ ] 故障注入移除索引后有差异证据，ROLLBACK 恢复。
- [ ] 未把当前计划写成生产容量、HTTP 持久化或 PostgreSQL 其他主版本证据。

## 12. 常见问题

**索引越多，读取是否一定越快？**
不一定。规划器可能不用，且每个索引增加写入、VACUUM、缓存和磁盘成本。

**应该在迁移里运行 ANALYZE 吗？**
取决于变更与部署策略。本课在实验数据后显式运行；生产需考虑自动分析、数据回填和发布窗口。

**可以用 `IF NOT EXISTS` 让迁移可重复吗？**
它可能掩盖同名对象定义漂移。迁移系统应保证版本只执行一次，并在冲突时失败，而不是猜“存在就正确”。

**为什么没有提供 down migration？**
因为完成标准是理解可逆性。索引可 drop，但表/数据变化未必无损；默认前向修复比虚假通用 rollback 更诚实。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [PostgreSQL 18 Indexes](https://www.postgresql.org/docs/18/indexes.html)：B-tree、多列与表达式索引。
- [PostgreSQL 18 Multicolumn Indexes](https://www.postgresql.org/docs/18/indexes-multicolumn.html)：列顺序与最左约束。
- [PostgreSQL 18 EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html)：计划、actual 与 buffers。
- [PostgreSQL 18 `CREATE INDEX`](https://www.postgresql.org/docs/18/sql-createindex.html)：CONCURRENTLY 和事务限制。
- [PostgreSQL 18 Planner Statistics](https://www.postgresql.org/docs/18/planner-stats.html)：统计与估算。
- [PostgreSQL 18 Routine Vacuuming](https://www.postgresql.org/docs/18/routine-vacuuming.html)：ANALYZE 与维护背景。

## 我现在能做到什么

我能把 schema 变化作为不可变前向历史交付，从真实查询推导复合索引，并在 PostgreSQL 18 隔离数据上用
EXPLAIN/ANALYZE/BUFFERS 解释规划器选择，同时把回滚、锁、统计和生产容量边界如实记录。

## 单元导航

[返回章目录](../README.md#03-sql-建模) ·
[上一课：约束、外键与不变量](02-constraints-foreign-keys-invariants.md) ·
[下一章：PostgreSQL 数据访问](../04-postgres-data-access/01-connections-tls-pools-timeouts.md)
