# 03 SQL 数据建模：把业务不变量放到正确层

## 本章任务

把前两章的内存商品扩展成 PostgreSQL 18 关系模型：先从领域规则推导用户、商品、收藏和预约，
再用约束与外键保护可由数据库判定的不变量，最后为真实查询设计前向迁移、索引和执行计划证据。

本章只负责 schema、迁移和查询计划，不负责 Node `pg` 连接池、事务用例或 HTTP 持久化。
只有实际连接 PostgreSQL 18、执行迁移并查询结果，才能声称数据库路径通过；SQL 代码围栏或静态解析不够。

## 必要前置与环境门禁

- 已完成[第 02 章：Nest API 与输入验证](02-nest-api-validation.md)。
- 理解整数分、UTC ISO、`Listing.version` 和一个商品最多一个有效预约。
- 数据库基线为 PostgreSQL 18；客户端与服务端主版本都要记录。
- 只在独立练习数据库 `market_model_lab` 运行，不连接生产或共享数据库。
- 优先使用本机安全服务配置或交互认证，不把密码、连接字符串写入仓库、日志或截图。
- 无法启动 PostgreSQL 18 时，记录命令、版本、连接目标和原始错误；只做不依赖数据库的静态检查。
- 不用非目标 PostgreSQL 主版本的成功输出冒充 PostgreSQL 18 兼容证据。
- 时间列使用 `timestamptz`；API 输出时转 UTC ISO。金额列使用整数分，不使用浮点。

## 三课学习路线

| 顺序 | 教程 | 核心产出 | 建议投入 |
| ---: | --- | --- | ---: |
| 1 | [从领域到关系模型](03-sql-modeling/01-domain-to-relational-model.md) | `001_core_tables.sql`、实体/关系/历史决策表 | 3 小时 |
| 2 | [约束、外键与不变量](03-sql-modeling/02-constraints-foreign-keys-invariants.md) | `002_invariants.sql`、非法写入与 SQLSTATE 证据 | 3.5 小时 |
| 3 | [迁移、索引与执行计划](03-sql-modeling/03-migrations-indexes-query-plans.md) | `003_query_indexes.sql`、迁移状态、EXPLAIN 对比 | 3.5 小时 |

依赖关系：

```text
领域对象、身份、引用、历史
  -> 主键、外键、nullability、check、unique
  -> 查询形状、selectivity、索引、EXPLAIN
  -> 第 04 章 pg 参数化访问
  -> 第 05 章真实事务与并发预约
```

## 章级邻里集市任务

1. `users` 保存身份与角色，不向浏览器返回 `password_hash`；
2. `listings.owner_id` 引用真实用户，价格是有界整数分；
3. `favorites` 用 `(user_id, listing_id)` 复合主键表达关系身份；
4. `reservations` 是有状态、有历史价值的独立实体；
5. 一个商品最多存在一条 `pending/confirmed` 预约；
6. 商品状态只允许 `available/reserved/sold`，version 从 1 开始；
7. 时间使用 `timestamptz`，查询/输出边界再转 UTC ISO；
8. 收藏删除策略与预约历史保留策略不同；
9. “买家不能预约自己的商品”等跨表规则明确留给持锁事务；
10. 迁移只前向追加，不编辑已经应用的历史文件；
11. 索引必须对应具体查询，不按“可能有用”堆叠；
12. `EXPLAIN (ANALYZE, BUFFERS)` 只在隔离练习数据上运行并记录实际计划。

## 综合验收证据

| 证据层 | 命令或观察 | 通过标准 |
| --- | --- | --- |
| 客户端 | `psql --version` | 主版本 18；保留完整输出 |
| 服务端 | `SHOW server_version` / `server_version_num` | 主版本 18，与目标实例一致 |
| 连接目标 | `current_database/current_user/inet_server_*` | 明确是隔离练习库，不暴露密码 |
| 迁移 | 按 001→002→003 执行 | ON_ERROR_STOP，事务完整，状态表三条且 checksum 策略清楚 |
| 模型 | `\d+` 或 catalog 查询 | 列、主键、外键、nullability 与决策一致 |
| 不变量 | 负金额、孤立 owner、重复收藏、第二条有效预约 | 分别以预期 SQLSTATE 失败，合法数据不受影响 |
| 删除策略 | 事务内删除测试后 ROLLBACK | 收藏可级联，预约历史阻止随意删除 |
| 索引 | catalog 与 `EXPLAIN` | 索引存在且匹配查询；小表 Seq Scan 不被伪报为失败 |
| 边界 | HTTP/Nest API | 本章未连接，不能声称重启持久化或并发事务通过 |

## 章级完成标准

- [ ] 能从业务句子推导实体、关系、主键、外键和历史保留。
- [ ] 能解释 `NOT NULL`、`UNIQUE`、`CHECK`、FK 与部分唯一索引各自保护什么。
- [ ] 知道数据库约束不能代替当前用户对象授权。
- [ ] 知道普通 CHECK 不能可靠查询另一张表。
- [ ] 金额列为 integer 分，时间列为 timestamptz，UUID 不转 JavaScript number。
- [ ] 每个删除动作都有明确 RESTRICT/CASCADE/保留决策。
- [ ] 迁移失败会整体回滚，不用“表似乎存在”猜迁移状态。
- [ ] 回滚脚本不会被描述成所有 schema 变化都可无损逆转。
- [ ] 索引与查询/排序顺序相符，并理解写入成本。
- [ ] 计划证据记录实际行数、统计信息和环境，不复制教材预期输出。

## 上下章导航

[上一章：Nest API 与输入验证](02-nest-api-validation.md) ·
[返回后端卷目录](README.md) ·
[后端覆盖矩阵](BACKEND-COVERAGE.md) ·
[下一章：PostgreSQL 数据访问](04-postgres-data-access.md)
