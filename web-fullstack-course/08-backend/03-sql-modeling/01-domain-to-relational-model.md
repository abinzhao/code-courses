# 从领域到关系模型：分清实体、关系、引用与历史

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 从邻里集市规则推导 users、listings、favorites、reservations 四张核心表 |
| 练习目录 | `$HOME/code/market-backend-lab/sql-modeling` |
| 目标环境 | PostgreSQL 18 server 与同主版本 psql，隔离数据库 `market_model_lab` |
| 主要产物 | `migrations/001_core_tables.sql`、`fixtures/model-seed.sql`、模型决策表 |
| 成功证据 | 001 事务执行；四表、主外键与时间类型可从 catalog 观察；JOIN 返回预期关系 |
| 失败证据 | PostgreSQL 18 不可连接时保留原始错误并停止数据库结论 |
| 环境边界 | 001 只是模型骨架，约束尚未完整，不得接业务流量 |

## 1. 任务背景

Nest 内存仓储把整个商品对象放在数组里。数据库建模不能简单把对象字段照抄成一张“大表”：

- 用户是独立身份，会发布多个商品；
- 收藏表示用户与商品之间的多对多关系；
- 预约有自己的状态、买家和创建时间，具有历史价值；
- 商品需要引用所有者，而不是复制邮箱或用户名；
- 删除收藏与删除预约历史的业务后果不同。

建模先写业务句子，再决定表和键：

```text
User 1 --- N Listing
User N --- N Listing 通过 Favorite
User 1 --- N Reservation
Listing 1 --- N Reservation（后续约束同时最多一个有效）
```

本课先建立身份、引用与历史形状。价格、状态、唯一有效预约等完整不变量在下一课添加。

## 2. 学习目标

完成本课后，你能够：

1. 从业务语言识别实体、值对象和关系；
2. 区分主键、自然键、外键和复合关系键；
3. 解释收藏为什么适合复合主键；
4. 解释预约为什么需要独立 ID 和状态历史；
5. 为每列决定类型、nullability 与命名；
6. 使用 uuid、integer、text、timestamptz 而不是前端展示类型；
7. 区分 API camelCase 与数据库 snake_case；
8. 为删除关系选择 CASCADE 或 RESTRICT；
9. 在运行迁移前记录 client/server/target/migration state；
10. 明确 001 尚未具备完整业务约束。

## 3. 预备知识

先阅读[统一项目契约](../../00-guide/05-project-assessment.md)。准备 PostgreSQL 18，但不要在共享/生产库操作。

创建目录：

```bash
mkdir -p "$HOME/code/market-backend-lab/sql-modeling/migrations"
mkdir -p "$HOME/code/market-backend-lab/sql-modeling/fixtures"
mkdir -p "$HOME/code/market-backend-lab/sql-modeling/evidence"
cd "$HOME/code/market-backend-lab/sql-modeling"
psql --version
```

使用本机已安全配置的角色创建隔离数据库：

```bash
createdb market_model_lab
psql -X -v ON_ERROR_STOP=1 -d market_model_lab -c '
SELECT
  current_database() AS database_name,
  current_user AS role_name,
  current_setting('\''server_version'\'') AS server_version,
  current_setting('\''server_version_num'\'') AS server_version_num,
  inet_server_addr() AS server_address,
  inet_server_port() AS server_port;
'
```

通过标准：

- `psql --version` 主版本为 18；
- `server_version_num` 以 `18` 对应数字开头；
- `database_name` 精确为 `market_model_lab`；
- 连接目标不是生产/共享实例。

若命令失败，记录实际命令、客户端版本、目标主机/端口（不含密码）和原始错误。本课不要求为了制造绿灯
切换到非目标 PostgreSQL 主版本。

## 4. 核心理论

### 4.1 实体、关系和值

实体有跨时间稳定身份：用户、商品、预约。标题和价格是商品的值，不需要各建一张表。
收藏本身主要表达“谁收藏了哪个商品”，组合 `(user_id, listing_id)` 就是自然关系身份。

预约即使取消也可能需要审计、恢复或评价关联，因此有独立 UUID，不用 `(buyer_id, listing_id)` 当永久主键。
同一买家未来可能在上次取消后重新预约。

### 4.2 主键与自然键

课程使用应用生成 UUID 作为主键：

- 跨进程生成，不依赖序列往返；
- API 传输为字符串；
- 不能转成 JavaScript number；
- 随机 UUID 的索引局部性和存储成本需要在高规模场景评估。

email 是业务自然键，下一课增加唯一约束。仍保留 user UUID，避免邮箱修改牵动所有外键。

### 4.3 类型从业务范围推导

| 业务值 | PostgreSQL 类型 | 原因 |
| --- | --- | --- |
| UUID ID | `uuid` | 校验/存储 UUID，不用 text 或 number |
| 标题/描述/email/hash | `text` | 长度用约束表达 |
| `priceCents` | `integer` | 上限 100000000 在 int4 范围，避免浮点 |
| `version` | `integer` | 从 1 开始，后续乐观锁 |
| 状态/角色 | `text` + CHECK | 当前集合小，迁移策略清楚 |
| 创建时间 | `timestamptz` | 表示绝对时间点，输出时 UTC ISO |

PostgreSQL `timestamptz` 内部表示时间点，session 时区只影响显示。写入带 `Z`/偏移量，API 读取后规范为
UTC ISO 8601。不要把本地化字符串写入持久列。

### 4.4 nullability 是业务选择

核心创建字段在本课程都 `NOT NULL`。描述允许空字符串，但不允许 null；这是“已提供空描述”和“值未知”
的区别。若未来支持删除/匿名化，需新增明确列或状态，而不是把所有列预先设为 nullable。

### 4.5 外键表达引用存在

`listings.owner_id -> users.id` 防止孤儿商品。外键不证明“发请求的人就是 owner”，因为数据库约束不知道
当前会话身份。对象授权仍由服务在事务中检查。

删除动作：

- 收藏没有独立审计价值，删除用户/商品时可 `ON DELETE CASCADE`；
- 商品有预约历史时，默认 RESTRICT，防止顺手删除历史；
- 用户有已发布商品/预约时也先阻止硬删除，后续产品决定匿名化或软删除。

### 4.6 历史与当前状态分开

商品 status 表示当前可见状态，预约表保存预约事实。两者需要在同一事务中同步，单独表定义不能保证
“reserved 商品必有有效预约”。下一课的部分唯一索引只能保证“最多一个有效预约”，第 5 章再完成原子变化。

### 4.7 命名边界

数据库使用 `snake_case`，API 使用 `camelCase`。映射集中在 repository，不要让每个 controller 自由改名。
查询可用明确别名：

```sql
SELECT price_cents AS "priceCents"
FROM listings;
```

第 4 章还会把驱动返回值当外部数据解析；SQL 类型和 TypeScript 类型不能靠同名自动互信。

## 5. 元素、属性、API 或配置清单

| SQL / 对象 | 本课用途 | 边界 |
| --- | --- | --- |
| `CREATE TABLE` | 定义关系与列 | 不是迁移状态本身 |
| `PRIMARY KEY` | 行/关系身份 | 不自动保护所有业务唯一性 |
| `FOREIGN KEY` | 引用存在 | 不做当前用户授权 |
| `NOT NULL` | 值必须存在 | 空字符串仍非 null |
| `uuid` | 用户、商品、预约 ID | 应用负责生成合法值 |
| `integer` | 整数分、version | 不存浮点元 |
| `text` | 状态与文本 | 下一课用 CHECK 限集合 |
| `timestamptz` | 绝对时间点 | 显示受 session timezone 影响 |
| 复合主键 | 收藏关系身份 | 列顺序也影响索引用途 |
| `ON DELETE CASCADE` | 清理无历史价值关系 | 不用于预约历史 |
| `ON DELETE RESTRICT` | 防止丢失被引用历史 | 不是软删除 |
| `BEGIN/COMMIT` | 原子应用单个迁移 | 不跨多个部署工具自动锁定 |
| `schema_migrations` | 教学迁移登记 | 真实团队可由迁移工具管理 |
| `ON_ERROR_STOP` | psql 首错退出 | 必须从 shell 开启 |
| `information_schema` / catalogs | 观察实际结构 | 比阅读文件更接近已应用事实 |

## 6. 最小可运行案例

创建完整文件 `migrations/001_core_tables.sql`：

```sql
BEGIN;

CREATE TABLE schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE listings (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  price_cents integer NOT NULL,
  owner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'available',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT listings_owner_fk
    FOREIGN KEY (owner_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
);

CREATE TABLE favorites (
  user_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT favorites_pk PRIMARY KEY (user_id, listing_id),
  CONSTRAINT favorites_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT favorites_listing_fk
    FOREIGN KEY (listing_id)
    REFERENCES listings(id)
    ON DELETE CASCADE
);

CREATE TABLE reservations (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT reservations_listing_fk
    FOREIGN KEY (listing_id)
    REFERENCES listings(id)
    ON DELETE RESTRICT,
  CONSTRAINT reservations_buyer_fk
    FOREIGN KEY (buyer_id)
    REFERENCES users(id)
    ON DELETE RESTRICT
);

INSERT INTO schema_migrations(version)
VALUES ('001_core_tables');

COMMIT;
```

为什么 001 仍不完整：

- email 尚未唯一/规范化；
- 角色和状态尚未限制集合；
- 金额/版本/标题尚无 CHECK；
- 有效预约尚无部分唯一索引。

因此 001 成功后不要开放应用写入，继续完成 002。

执行：

```bash
psql -X -v ON_ERROR_STOP=1 -d market_model_lab \
  -f migrations/001_core_tables.sql
```

观察：

```bash
psql -X -d market_model_lab -c '\dt'
psql -X -d market_model_lab -c '\d+ listings'
psql -X -d market_model_lab -c \
  'SELECT version, applied_at FROM schema_migrations ORDER BY version;'
```

预期四张业务表和迁移表存在，状态表只有 `001_core_tables`。实际时间由数据库生成，不写死。

## 7. 邻里集市集成案例

创建完整文件 `fixtures/model-seed.sql`：

```sql
BEGIN;

INSERT INTO users(id, email, password_hash, role, created_at)
VALUES
  (
    '00000000-0000-4000-8000-000000000001',
    'seller@example.test',
    'not-a-real-password-hash',
    'user',
    '2026-10-11T08:00:00.000Z'
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    'buyer@example.test',
    'not-a-real-password-hash',
    'user',
    '2026-10-11T08:01:00.000Z'
  );

INSERT INTO listings(
  id, title, description, price_cents, owner_id, status, version, created_at
)
VALUES (
  '10000000-0000-4000-8000-000000000001',
  '折叠桌',
  '八成新，可自提',
  12000,
  '00000000-0000-4000-8000-000000000001',
  'available',
  1,
  '2026-10-11T08:10:00.000Z'
);

INSERT INTO favorites(user_id, listing_id, created_at)
VALUES (
  '00000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001',
  '2026-10-11T08:20:00.000Z'
);

INSERT INTO reservations(
  id, listing_id, buyer_id, status, created_at
)
VALUES (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000002',
  'pending',
  '2026-10-11T08:30:00.000Z'
);

COMMIT;
```

`not-a-real-password-hash` 是不可登录的 SQL 夹具标记，不是生产密码处理示范。真实密码哈希在第 6 章。

应用夹具：

```bash
psql -X -v ON_ERROR_STOP=1 -d market_model_lab \
  -f fixtures/model-seed.sql
```

查询关系：

```sql
SET TIME ZONE 'UTC';

SELECT
  l.id,
  l.title,
  l.price_cents AS "priceCents",
  owner.email AS owner_email,
  favorite.user_id IS NOT NULL AS "isFavorited",
  reservation.status AS reservation_status,
  to_char(
    l.created_at AT TIME ZONE 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
  ) AS "createdAt"
FROM listings AS l
JOIN users AS owner
  ON owner.id = l.owner_id
LEFT JOIN favorites AS favorite
  ON favorite.listing_id = l.id
 AND favorite.user_id = '00000000-0000-4000-8000-000000000002'
LEFT JOIN reservations AS reservation
  ON reservation.listing_id = l.id
 AND reservation.status IN ('pending', 'confirmed')
WHERE l.id = '10000000-0000-4000-8000-000000000001';
```

可判定预期：

- 标题为折叠桌；
- `priceCents` 为整数 12000；
- owner 为 seller；
- buyer 的 isFavorited 为 true；
- reservation_status 为 pending；
- createdAt 为 `2026-10-11T08:10:00.000Z`。

这是 SQL 查询证据，不是 Nest HTTP 已持久化。第 4 章才连接 repository 和数据库。

## 8. 常见错误与排查路径

### 8.1 明确错误：把收藏者存成逗号分隔字符串

错误设计：

```sql
ALTER TABLE listings ADD COLUMN favorite_user_ids text;
```

| 项目 | 记录 |
| --- | --- |
| 现象 | 查某用户收藏、避免重复和用户删除都需要字符串拆分 |
| 证据 | 无法用普通外键保证每个字符串 ID 存在 |
| 原因 | 多对多关系被压进单列，丢失关系模型 |
| 修复 | 使用 favorites(user_id, listing_id) 与复合主键 |
| 复验 | JOIN 可查询收藏，重复关系由主键拒绝 |

### 8.2 用浮点存金额

**现象：** 聚合/比较可能出现二进制舍入差异。
**证据：** 业务输入本来只需要精确到分，却使用 real/double precision。
**原因：** 把页面显示的 19.90 元直接映射为浮点。
**修复：** `price_cents integer`，120 元存 12000。
**复验：** SQL 与 API 都使用整数。

### 8.3 把 owner email 复制进 listings

**现象：** 用户改邮箱后旧商品仍显示旧值。
**证据：** 多行重复同一身份属性。
**原因：** 未用外键引用实体。
**修复：** 保存 `owner_id`，读取时 JOIN；历史快照若需要应单独命名并定义更新策略。
**复验：** 一处用户数据更新后 JOIN 结果一致。

### 8.4 所有外键都 CASCADE

**现象：** 删除用户会连带删除预约历史。
**原因：** 没区分附属关系与审计实体。
**修复：** 收藏可 cascade，商品/预约历史默认 restrict，删除需求另做匿名化/软删除设计。
**复验：** 下一课事务内删除实验显示不同行为。

### 8.5 只读 SQL 文件就声称迁移完成

**现象：** 文档有 CREATE TABLE，但目标库 catalog 没有对象。
**证据：** `schema_migrations` 无记录或连接了错误数据库。
**原因：** 把源码意图当已应用状态。
**修复：** 记录连接目标，以 ON_ERROR_STOP 执行，并查询 catalog/状态表。
**复验：** 目标库、表结构和迁移记录一致。

## 9. 课后题

**问题 1：为什么 favorites 不一定需要单独 id？**
参考答案：关系身份就是 user/listing 组合，复合主键同时表达唯一性；若未来有独立生命周期再重新评估。

**问题 2：为什么 reservations 需要独立 id？**
参考答案：同一买家和商品可能有取消后重试等多个历史事件；预约自身还有状态、时间和后续引用。

**问题 3：`timestamptz` 是否保存用户时区名称？**
参考答案：不保存。它表示绝对时间点；session 时区影响显示，用户时区偏好需另存。

**问题 4：外键为何不能证明当前请求用户有权修改商品？**
参考答案：外键只证明 owner 行存在，不知道当前会话身份；对象授权由服务端用例检查。

## 10. 实践练习

### 基础：列出每个用户的商品数

要求包括零商品用户。

答案标准：

```sql
SELECT u.id, count(l.id) AS listing_count
FROM users AS u
LEFT JOIN listings AS l ON l.owner_id = u.id
GROUP BY u.id
ORDER BY u.id;
```

必须使用 `count(l.id)`，不能用会把 LEFT JOIN 占位行算入的 `count(*)`。

### 进阶：写模型决策表

为四张表每列记录“业务含义、类型、nullability、来源、删除影响”。

可判定标准：

- price_cents 来源于受校验的整数分；
- owner_id 来源于后端身份/用例，不来自创建正文；
- created_at 来源于数据库或服务端时间；
- reservation 明确保留历史；
- 没有把 API camelCase 直接当 SQL 列名。

### 故障注入：连接错误数据库

先只读查询 `current_database()`，故意把目标改为一个不存在名称，不执行 DDL。

可判定标准：

1. 连接非零失败；
2. 没有自动创建或改写其他库；
3. 恢复 `market_model_lab` 后再次确认目标；
4. 迁移状态仍只有预期记录；
5. 记录现象、证据、原因、修复、复验。

## 11. 阶段验收

- [ ] psql client 和 server 主版本均为 18，目标库已记录。
- [ ] 001 以 `ON_ERROR_STOP` 在一个事务中应用。
- [ ] catalog 可观察四张业务表和 schema_migrations。
- [ ] 用户、商品、收藏、预约的身份与关系可解释。
- [ ] 金额为 integer 分，时间为 timestamptz。
- [ ] 收藏复合主键、级联策略和预约限制策略有业务理由。
- [ ] fixture 使用 `.test` 邮箱和不可登录 hash 标记。
- [ ] JOIN 返回整数分、owner、收藏、预约和 UTC 形状。
- [ ] 能列出 001 尚缺的业务约束。
- [ ] 未把 SQL 成功写成 Nest、事务并发或认证已经通过。

## 12. 常见问题

**可以使用数据库自动递增 ID 吗？**
可以，但要明确暴露、分片和导入策略。本课程统一 UUID，避免同一项目混用无说明的 ID 语义。

**状态应该使用 PostgreSQL enum 吗？**
enum 有优势，也有迁移成本。本课程用 text + CHECK，让状态变化通过普通迁移可见；不是说 enum 永远错误。

**为什么 schema_migrations 自己也在 001 中？**
这是无迁移框架教学实验的最小登记。真实工具可能在执行 SQL 前管理自己的状态表，应遵循工具契约。

**可以现在把 Nest repository 接到这张表吗？**
先完成约束与索引；第 4 章再处理连接池、参数化 SQL、类型映射和错误。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [PostgreSQL 18 Data Definition](https://www.postgresql.org/docs/18/ddl.html)：表、列、约束概览。
- [PostgreSQL 18 Data Types](https://www.postgresql.org/docs/18/datatype.html)：uuid、numeric 与时间类型。
- [PostgreSQL 18 Foreign Keys](https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK)：引用和删除动作。
- [PostgreSQL 18 Date/Time](https://www.postgresql.org/docs/18/datatype-datetime.html)：timestamptz 与时区。
- [PostgreSQL 18 Transactions](https://www.postgresql.org/docs/18/tutorial-transactions.html)：迁移事务基础。
- [PostgreSQL 18 Information Schema](https://www.postgresql.org/docs/18/information-schema.html)：实际结构观察。

## 我现在能做到什么

我能从领域规则识别实体、关系、引用和历史，为邻里集市选择主键、外键、nullability、整数分与时间类型，
并通过目标库 catalog 和 JOIN 证明模型骨架实际存在，同时明确它还不能接业务流量。

## 单元导航

[返回本章 Hub](../03-sql-modeling.md) ·
[上一章：Nest Pipes、Filters 与错误契约](../02-nest-api-validation/03-pipes-filters-error-contract.md) ·
[下一课：约束、外键与不变量](02-constraints-foreign-keys-invariants.md)
