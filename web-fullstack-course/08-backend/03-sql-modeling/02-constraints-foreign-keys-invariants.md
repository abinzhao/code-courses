# 约束、外键与不变量：让绕过应用的写入也失败

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 用 NOT NULL、UNIQUE、CHECK、FK 与部分唯一索引保护邻里集市核心不变量 |
| 练习目录 | `$HOME/code/market-backend-lab/sql-modeling` |
| 前置状态 | PostgreSQL 18 隔离库已应用 001，并可查询一组教学夹具 |
| 主要产物 | `migrations/002_invariants.sql`、SQLSTATE 故障证据、删除策略实验 |
| 成功证据 | 合法夹具保留；非法金额/状态/引用/重复关系被目标约束拒绝 |
| 失败证据 | 23514/23503/23505 等 SQLSTATE 与约束名可观察 |
| 环境边界 | 约束保护数据形状，不替代对象授权或跨表事务状态机 |

## 1. 任务背景

第 2 章 DTO 能拒绝坏 HTTP 输入，但数据库还可能被这些路径写入：

- 管理脚本和数据导入；
- 另一个服务；
- 应用 bug；
- 并发请求在校验后、写入前改变状态；
- 将来新版本忘记复用旧校验。

关键不变量必须尽可能由数据库做最后防线。应用校验仍有价值：它能更早失败并给出友好错误；
数据库约束负责保证任何写入路径都不能破坏事实。

```text
客户端校验：改善交互，不可信
DTO/service：清楚错误与业务规则
数据库约束：所有写路径的最后防线
事务：跨行/跨表原子状态变化
```

本课完成前三层中的数据库约束；“卖家不能预约自己的商品”和商品/预约同步变化需要第 5 章持锁事务。

## 2. 学习目标

完成本课后，你能够：

1. 为每个不变量选择 NOT NULL、UNIQUE、CHECK、FK 或部分唯一索引；
2. 解释为什么应用校验和数据库约束需要同时存在；
3. 使用有名字的约束提高诊断和错误映射稳定性；
4. 从 SQLSTATE 区分 check、foreign key、unique、not-null 失败；
5. 用部分唯一索引限制每个商品最多一条有效预约；
6. 解释普通 CHECK 为什么不能安全引用其他表；
7. 选择 CASCADE、RESTRICT 与历史保留策略；
8. 在已有数据上添加约束前先查冲突；
9. 用事务/SAVEPOINT 做破坏性实验并回滚；
10. 不把数据库原始错误文本直接返回 API。

## 3. 预备知识

确认目标、版本和迁移状态：

```bash
cd "$HOME/code/market-backend-lab/sql-modeling"
psql --version
psql -X -v ON_ERROR_STOP=1 -d market_model_lab -c '
SELECT current_database(), current_setting('\''server_version_num'\'');
SELECT version FROM schema_migrations ORDER BY version;
'
```

必须只有 `001_core_tables`，且已应用上一课夹具。若 002 已存在，不要编辑历史文件后重跑；
创建全新练习库，或按团队迁移流程新增修复版本。

添加约束前检查已有坏数据：

```sql
SELECT id FROM users
WHERE email <> lower(email)
   OR role NOT IN ('user', 'admin');

SELECT id FROM listings
WHERE char_length(title) NOT BETWEEN 1 AND 100
   OR title !~ '\S'
   OR char_length(description) > 2000
   OR price_cents NOT BETWEEN 0 AND 100000000
   OR status NOT IN ('available', 'reserved', 'sold')
   OR version < 1;
```

预期夹具查询为空。若有结果，先决定清洗规则并保留审查证据，不能为了让迁移成功直接删除未知数据。

## 4. 核心理论

### 4.1 NOT NULL 表达存在性

`NOT NULL` 是列级事实：每行都必须有值。它不限制空字符串或 0。描述允许 `''`，金额允许 0；
标题则还需 CHECK 拒绝空白。

SQL 中 `CHECK (expression)` 对 expression 为 `TRUE` 或 `NULL` 的行都不报错，所以需要 `NOT NULL`
和 CHECK 配合，不能误以为 CHECK 自动拒绝 null。

### 4.2 UNIQUE 表达候选键与关系唯一性

用户 email 在课程产品规则下统一小写并唯一。先 CHECK 小写，再 UNIQUE(email)。
真实邮箱大小写和 Unicode 规范有历史复杂性；该简化是本产品登录标识规则，不是互联网邮箱普遍真理。

收藏复合主键已保证同一用户/商品只有一行。应用可使用 `INSERT ... ON CONFLICT DO NOTHING`
实现幂等“设为收藏”，但约束才是并发最后防线。

### 4.3 CHECK 适合单行、不可变表达式

CHECK 适合：

- 金额范围；
- 状态集合；
- 标题/描述长度；
- version 下限；
- role 集合。

PostgreSQL 假设 CHECK 对相同行输入始终给相同结果。不要在 CHECK 中查询另一张表来判断 buyer 是否 owner；
跨表状态会改变，转储/恢复顺序也可能出问题。该规则放进持锁事务。

### 4.4 FK 保护引用存在和删除动作

外键插入时确认引用行存在，删除/更新时执行声明动作：

- `RESTRICT/NO ACTION` 阻止丢失被引用事实；
- `CASCADE` 删除附属关系；
- `SET NULL` 需要列可空且业务能解释“未知引用”。

课程收藏是附属关系，可 cascade；预约和商品有历史价值，默认 restrict。

### 4.5 部分唯一索引表达“有效子集最多一个”

普通 UNIQUE(listing_id) 会让已取消预约也永久阻止新预约。部分唯一索引只覆盖：

```sql
WHERE status IN ('pending', 'confirmed')
```

于是同一商品可有多个 cancelled 历史，但最多一个 active。两个并发事务都尝试插入 active 时，
索引是最终仲裁；应用将可预期 23505 映射为 409。

### 4.6 约束名是诊断契约的一部分

显式命名如 `listings_price_cents_check`，日志可同时记录 SQLSTATE 和 constraint name。
应用不应解析可能本地化/版本变化的完整错误文本。第 4 章使用驱动结构化错误字段映射。

### 4.7 在大表上加约束有锁与扫描成本

本课空/小表可直接 ALTER。生产大表可能需要：

1. 先查询并清理冲突；
2. 对支持的 CHECK/FK 使用 `NOT VALID`；
3. 在受控窗口 `VALIDATE CONSTRAINT`；
4. 评估 UNIQUE/index 构建锁与 `CREATE INDEX CONCURRENTLY`。

`CREATE INDEX CONCURRENTLY` 不能放在普通事务块内，失败后还可能留下 invalid index；本课不需要它，
不能把生产迁移策略简化成一次 BEGIN。

## 5. 元素、属性、API 或配置清单

| 约束 / 接口 | 保护内容 | 常见 SQLSTATE |
| --- | --- | --- |
| `NOT NULL` | 列必须有值 | `23502` |
| `UNIQUE` | 候选键不重复 | `23505` |
| `PRIMARY KEY` | 非空唯一行身份 | `23505` |
| `CHECK` | 单行表达式为真 | `23514` |
| `FOREIGN KEY` | 引用存在/删除动作 | `23503` |
| `ON DELETE CASCADE` | 删除附属关系 | 本身不报错 |
| `ON DELETE RESTRICT` | 有引用时阻止删除 | `23503` |
| 部分唯一索引 | 条件子集唯一 | `23505` |
| `ALTER TABLE ... ADD CONSTRAINT` | 前向增加规则 | 可能扫描/锁表 |
| `NOT VALID` | 新写入执行、旧行暂未全验 | 不是永久完成状态 |
| `VALIDATE CONSTRAINT` | 验证已有行 | 仍需评估锁/耗时 |
| `SAVEPOINT` | 局部回滚故障实验 | 只在当前事务 |
| `\set VERBOSITY verbose` | 显示 SQLSTATE/约束上下文 | psql 客户端设置 |

## 6. 最小可运行案例

创建完整文件 `migrations/002_invariants.sql`：

```sql
BEGIN;

ALTER TABLE users
  ADD CONSTRAINT users_email_lower_check
    CHECK (email = lower(email)),
  ADD CONSTRAINT users_email_unique
    UNIQUE (email),
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('user', 'admin'));

ALTER TABLE listings
  ADD CONSTRAINT listings_title_check
    CHECK (
      char_length(title) BETWEEN 1 AND 100
      AND title ~ '\S'
    ),
  ADD CONSTRAINT listings_description_check
    CHECK (char_length(description) <= 2000),
  ADD CONSTRAINT listings_price_cents_check
    CHECK (price_cents BETWEEN 0 AND 100000000),
  ADD CONSTRAINT listings_status_check
    CHECK (status IN ('available', 'reserved', 'sold')),
  ADD CONSTRAINT listings_version_check
    CHECK (version >= 1);

ALTER TABLE reservations
  ADD CONSTRAINT reservations_status_check
    CHECK (status IN ('pending', 'confirmed', 'cancelled'));

CREATE UNIQUE INDEX reservations_one_active_per_listing_idx
  ON reservations(listing_id)
  WHERE status IN ('pending', 'confirmed');

INSERT INTO schema_migrations(version)
VALUES ('002_invariants');

COMMIT;
```

执行：

```bash
psql -X -v ON_ERROR_STOP=1 -d market_model_lab \
  -f migrations/002_invariants.sql
```

观察：

```bash
psql -X -d market_model_lab -c '\d+ users'
psql -X -d market_model_lab -c '\d+ listings'
psql -X -d market_model_lab -c '\d+ reservations'
psql -X -d market_model_lab -c \
  'SELECT version FROM schema_migrations ORDER BY version;'
```

预期迁移状态为 001、002；`\d+` 可见有名字的 check/unique 和部分唯一索引。
必须保存实际 catalog 输出，不能只看 SQL 文件。

## 7. 邻里集市集成案例

### 7.1 负金额被 CHECK 拒绝

```bash
psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose \
  -d market_model_lab -c "
INSERT INTO listings(
  id, title, description, price_cents, owner_id, status, version
) VALUES (
  '10000000-0000-4000-8000-000000000002',
  '错误价格', '', -1,
  '00000000-0000-4000-8000-000000000001',
  'available', 1
);"
```

预期非零退出，SQLSTATE `23514`，约束名 `listings_price_cents_check`。复验：

```sql
SELECT count(*)
FROM listings
WHERE id = '10000000-0000-4000-8000-000000000002';
```

必须为 0。

### 7.2 孤立 owner 被 FK 拒绝

把 owner_id 改为数据库中不存在的合法 UUID，其他字段合法。预期 `23503`，
约束名 `listings_owner_fk`。不能为让测试通过临时插入一个“未知用户”。

### 7.3 重复收藏被复合主键拒绝

重复上一课 fixture 的收藏：

```sql
INSERT INTO favorites(user_id, listing_id)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001'
);
```

预期 `23505`，约束名 `favorites_pk`。正式“设为收藏”可用：

```sql
INSERT INTO favorites(user_id, listing_id)
VALUES ($1, $2)
ON CONFLICT (user_id, listing_id) DO NOTHING;
```

`$1/$2` 是第 4 章参数化查询占位符，不能在应用中字符串拼接 ID。

### 7.4 第二条有效预约被部分唯一索引拒绝

```sql
INSERT INTO reservations(id, listing_id, buyer_id, status)
VALUES (
  '20000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  'pending'
);
```

因为 fixture 已有 pending，预期 `23505`，对象名 `reservations_one_active_per_listing_idx`。
注意该测试 buyer 恰好是 owner，暴露了另一条事实：部分唯一索引能阻止第二个 active，
却不能完成“卖家不能预约自己”的跨表规则。第 5 章在锁住 listing 后检查 buyer/owner。

### 7.5 删除策略实验

在 psql 交互会话：

```sql
\set VERBOSITY verbose
BEGIN;
SAVEPOINT before_delete;

DELETE FROM listings
WHERE id = '10000000-0000-4000-8000-000000000001';

ROLLBACK TO SAVEPOINT;
SELECT count(*) FROM listings
WHERE id = '10000000-0000-4000-8000-000000000001';
ROLLBACK;
```

删除因 reservation FK 预期 `23503`；回到 savepoint 后商品仍为 1。收藏虽然配置 cascade，
但预约历史先阻止整次商品删除，所以没有部分删除。

## 8. 常见错误与排查路径

### 8.1 明确错误：只在 service 检查金额

错误策略：“DTO 已有 `@Min(0)`，数据库不用 CHECK。”

| 项目 | 记录 |
| --- | --- |
| 现象 | SQL 脚本可插入 `price_cents=-1` |
| 证据 | 绕过 Nest 直接 INSERT 成功 |
| 原因 | 关键不变量只存在于单一应用路径 |
| 修复 | 保留应用校验，同时增加有名字的数据库 CHECK |
| 复验 | HTTP 提前 400；直接 SQL 以 23514 失败 |

### 8.2 CHECK 查询其他表

错误目标：

```sql
CHECK (buyer_id <> (SELECT owner_id FROM listings ...))
```

**现象：** PostgreSQL 不允许该普通 CHECK 子查询，或依赖函数造成后续数据变化破坏假设。
**原因：** 跨表规则不是单行不可变表达式。
**修复：** 在事务内锁 listing、读取 owner、比较 buyer，再写预约；唯一索引继续做并发后盾。
**复验：** 第 5 章两用户与并发测试。

### 8.3 把所有删除设为 CASCADE

**现象：** 删除用户/商品时预约历史消失。
**证据：** catalog 显示 reservations FK cascade。
**原因：** 没有区分附属关系和审计事实。
**修复：** 预约 RESTRICT；另设计取消、匿名化或保留策略。
**复验：** 删除事务以 23503 失败且行仍在。

### 8.4 捕获 23505 后都返回“邮箱重复”

**现象：** 有效预约冲突被错误显示成邮箱重复。
**原因：** 只看 SQLSTATE，不看 constraint/index name。
**修复：** 同时匹配结构化 constraint；未知 23505 记录并返回通用冲突。
**复验：** email、favorite、reservation 三类唯一冲突映射不同 code。

### 8.5 为通过迁移先删除冲突行

**现象：** 迁移变绿但业务数据无审查地丢失。
**原因：** 把数据治理当临时清理。
**修复：** 迁移前报告冲突，产品决定合并/修正/隔离，操作有审计与备份。
**复验：** 约束生效且数据变化与批准清单一致。

## 9. 课后题

**问题 1：为什么 CHECK 还要配合 NOT NULL？**
参考答案：CHECK 表达式为 NULL 时不会失败；NOT NULL 单独保护缺失。

**问题 2：为什么有效预约用部分唯一索引，而不是 UNIQUE(listing_id)？**
参考答案：取消记录应保留且允许以后重新预约；唯一性只约束 pending/confirmed 子集。

**问题 3：数据库已有外键，service 是否还需要先查 owner？**
参考答案：需要给出 404/业务语义时可先查；FK 仍是并发和其他写路径的最后防线。

**问题 4：约束错误为什么不直接把 PostgreSQL message 返回客户端？**
参考答案：文本可能泄露表/列/数据且会随版本/本地化变化；应按 SQLSTATE 和 constraint 映射稳定 code。

## 10. 实践练习

### 基础：验证状态集合

分别尝试 listing status=`draft`、reservation status=`expired`。

可判定标准：

- 都以 23514 失败；
- 约束名分别正确；
- 原行数不增加；
- 合法 cancelled reservation 可存在多条历史。

### 进阶：设计 review 不变量

只做设计，不立即改本章迁移。列出 review 的 ID、reservation、author、rating、body、时间及约束。

答案标准：

- rating CHECK 1..5；
- `(reservation_id, author_id)` 唯一；
- FK 保留预约历史；
- “只有完成交易参与者能评价”属于跨表服务/事务规则；
- 需要新增 `003/004` 前向迁移，不能编辑已应用 001/002。

### 故障注入：取消后再次预约

在事务中把 fixture reservation 更新为 cancelled，再插入一条 pending，观察成功后 ROLLBACK。

可判定标准：

1. cancelled 不在部分索引谓词中；
2. 新 pending 在事务内成功；
3. 第二个 pending 再次 23505；
4. 最终 ROLLBACK，夹具恢复；
5. 记录五段故障证据。

## 11. 阶段验收

- [ ] PostgreSQL 18 client/server/target 再次确认。
- [ ] 002 在一个事务中应用并登记。
- [ ] 用户 email/role、商品标题/描述/金额/状态/version 有名字的约束。
- [ ] reservation 状态集合和有效子集唯一已建立。
- [ ] 负金额为 23514，孤立 FK 为 23503，重复关系为 23505。
- [ ] 失败写入后行数不增加。
- [ ] 收藏 cascade 与预约 restrict 可解释并有回滚实验。
- [ ] 卖家自约等跨表规则明确留给事务，不伪造 CHECK。
- [ ] 应用错误映射基于 SQLSTATE + constraint，不解析整段文本。
- [ ] 未把约束成功称为对象授权或并发事务全部通过。

## 12. 常见问题

**部分唯一索引算约束吗？**
它承担业务唯一不变量，但 PostgreSQL catalog 中属于 index；错误字段可能提供 constraint 名为索引名，
应用映射应以实际驱动字段验证。

**为什么不用触发器完成所有跨表规则？**
触发器可用于特定场景，但会增加隐藏控制流、迁移与测试成本。课程优先用显式事务服务加数据库最后防线。

**CHECK 中能用正则吗？**
可以，如标题非空白。要注意数据库正则语义和性能，并用实际边界样例验证。

**`ON CONFLICT DO NOTHING` 会隐藏所有错误吗？**
只在指定冲突目标上幂等；其他 CHECK/FK 错误仍应失败。不要无目标吞掉未知唯一冲突。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [PostgreSQL 18 Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html)：NOT NULL、UNIQUE、CHECK、FK。
- [PostgreSQL 18 Partial Indexes](https://www.postgresql.org/docs/18/indexes-partial.html)：条件索引。
- [PostgreSQL 18 ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html)：添加/验证约束。
- [PostgreSQL 18 Error Codes](https://www.postgresql.org/docs/18/errcodes-appendix.html)：SQLSTATE。
- [PostgreSQL 18 Savepoints](https://www.postgresql.org/docs/18/sql-savepoint.html)：故障实验局部恢复。
- [PostgreSQL 18 `INSERT ... ON CONFLICT`](https://www.postgresql.org/docs/18/sql-insert.html)：幂等收藏边界。

## 我现在能做到什么

我能把单行、引用和条件唯一不变量落实为有名字的数据库约束，用 SQLSTATE 与对象名诊断失败，
并明确区分数据库最后防线、服务对象授权和跨表事务规则。

## 单元导航

[返回本章 Hub](../03-sql-modeling.md) ·
[上一课：从领域到关系模型](01-domain-to-relational-model.md) ·
[下一课：迁移、索引与执行计划](03-migrations-indexes-query-plans.md)
