# 41-关系型数据库与 SQL 基础

## 目标

完成本知识单元后，学员应能把“数据存在哪里、如何保证正确、如何取出来”这三件事用关系型数据库的语言讲清楚，并亲手写出结构正确的 SQL。

学员应能够：

1. 用表、行、列、主键、外键解释一个业务领域（例如用户、文章、评论）如何被拆成关系结构。
2. 根据数据含义选择 PostgreSQL 的常用数据类型，避免把所有字段都定义成文本。
3. 使用 DDL 创建、修改和删除表，并为表加上主键、非空、唯一、检查和外键约束。
4. 使用 DML 完成插入、更新和删除，理解没有条件的更新与删除为什么危险。
5. 使用 `SELECT` 配合 `WHERE`、`ORDER BY`、`LIMIT` 完成过滤、排序和截取。
6. 使用 JOIN 与 `GROUP BY` 装配关系、完成统计，并说明前三范式想要消除的问题与建模取舍。

本单元是后续索引事务、Prisma ORM 和查询优化单元的基础。本单元以标准 SQL 和 PostgreSQL 通用语法为主，不依赖任何 ORM。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| PostgreSQL 当前稳定大版本 | 关系型数据库服务端 | 能启动服务、创建数据库、执行 SQL |
| `psql` | PostgreSQL 官方命令行客户端 | 能连接数据库、执行语句、查看表结构 |
| 标准 SQL（以 PostgreSQL 方言为准） | 定义结构与操作数据 | 能写出可执行的 DDL、DML 与查询 |
| 任意纯文本 SQL 文件 | 保存可重复执行的脚本 | 能区分脚本与一次性命令 |
| 终端 | 启动客户端与保存运行记录 | 能记录语句、输出和报错 |

环境说明：

- 安装 PostgreSQL 时选择官网当前标注的稳定大版本即可，本课程不锁定小版本；各大版本对本单元涉及的基础语法支持一致。
- 课程使用 `psql` 作为主线客户端；使用图形化客户端（如 pgAdmin、DBeaver）完成相同语句也可以，但必须能看懂 `psql` 的输出。
- SQL 关键字在示例中统一大写（如 `SELECT`、`FROM`），这是书写约定，不是语法强制。
- 字符串字面量使用单引号，例如 `'alice@example.com'`；双引号在 PostgreSQL 中用于标识表名、列名，二者不能混用。
- 示例中的 `;` 是语句结束符，`psql` 默认遇到分号才会提交执行。

开始前检查环境：

```bash
psql --version
psql -d postgres -c "SELECT version();"
```

预期观察：

- 第一条命令输出客户端版本信息。
- 第二条命令连接到默认的 `postgres` 数据库并返回服务端版本字符串。
- 如果提示连接失败，应先确认 PostgreSQL 服务已启动，以及当前用户名、端口和认证方式。

## 详细的理论知识讲解和示例伪代码

### 1. 关系模型：表、行、列与键

#### 1.1 定义

关系型数据库把现实世界的实体组织成若干张**表（table，关系）**。每张表由**列（column，字段）**和**行（row，记录，元组）**组成：

- 表描述一类实体，例如 `users`、`posts`。
- 列描述这类实体的一个属性，例如用户的邮箱、创建时间。
- 行是一个具体实体的一组取值。

**键（key）**是关系模型中用于标识和关联数据的列：

- **主键（primary key，PK）**：唯一标识表中的每一行，非空且不重复。一张表至多一个主键。
- **外键（foreign key，FK）**：一列引用另一张表（也可以是同表）的主键，用来表达“属于”“引用”关系。
- **候选键 / 唯一键**：取值不重复、可作为主键备选的列。

#### 1.2 与后端的关系

后端 API 处理的资源几乎都要落库：注册用户对应向 `users` 插入一行；发表文章对应向 `posts` 插入一行并带上作者的外键。关系模型决定了接口数据的形状：后端返回的 JSON 字段通常能直接对应到某张表的列，或对应多张表 JOIN 后的结果。

#### 1.3 示例

```sql
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id BIGINT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT ''
);
```

概念伪代码，表达两行数据之间的关系：

```text
users 表一行：id = 1, email = 'alice@example.com'
posts 表一行：id = 10, author_id = 1, title = '你好数据库'

posts.author_id = 1  →  引用 users.id = 1 这一行
```

#### 1.4 常见误区

> 外键列里出现的值可以随便填，只要应用代码不报错。

外键是数据库层面的约束：填入一个在被引用表中不存在的 `id`，数据库会直接拒绝。关系完整性不应该只靠应用代码自觉维护。

> 主键和“自增 id”是同一个概念。

自增（identity / serial）只是生成主键值的一种方式。主键也可以由业务编码、UUID 或多个列组合担任，关键是非空、唯一和稳定。

### 2. 数据类型

#### 2.1 定义

每一列必须声明**数据类型**，它决定了这一列能存什么值、占多少空间、支持哪些运算和能使用哪些索引。PostgreSQL 常用类型包括：

| 类型 | 用途 | 示例 |
|---|---|---|
| `SMALLINT` / `INTEGER` / `BIGINT` | 整数 | `42` |
| `NUMERIC(precision, scale)` | 精确小数，用于金额 | `19.99` |
| `REAL` / `DOUBLE PRECISION` | 浮点近似值，不用于金额 | `3.14e0` |
| `TEXT` / `VARCHAR(n)` | 字符串 | `'hello'` |
| `BOOLEAN` | 真 / 假 | `TRUE` |
| `DATE` | 日期 | `2026-10-09` |
| `TIMESTAMPTZ` | 带时区的时间戳 | `2026-10-09 08:30:00+00` |
| `JSONB` | 二进制存储的 JSON | `'{"role":"admin"}'` |
| `UUID` | 通用唯一标识 | 由扩展或应用生成 |

#### 2.2 与后端的关系

TypeScript 类型与数据库类型需要一一对应：`INTEGER` 对应 `number`，`BOOLEAN` 对应 `boolean`，`TIMESTAMPTZ` 在 Node.js 中通常被读成 `Date`。类型选错会在运行期才暴露问题，例如用浮点数存金额会出现 `0.1 + 0.2` 一类的精度误差。

#### 2.3 示例

```sql
CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku VARCHAR(32) NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  released_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

JavaScript 中错误与正确的金额处理对比：

```js
// 错误：浮点运算产生 0.30000000000000004，不能直接作为金额
const bad = 0.1 + 0.2;

// 正确：以分为单位用整数存储，或由数据库 NUMERIC 配合定点库处理
const priceInCents = 10;
const taxInCents = 2;
const totalInCents = priceInCents + taxInCents;
```

#### 2.4 常见误区

> 所有列都定义成 `TEXT` 最省事。

文本列无法做数值比较与数值运算，数据库也无法替你拦截非法日期和数字，还会让索引和存储失去优化空间。

> `TIMESTAMP` 和 `TIMESTAMPTZ` 只是显示格式不同。

`TIMESTAMPTZ` 内部按统一时刻存储并在读写时按会话时区转换；不带时区的 `TIMESTAMP` 不记录时区，跨时区系统极易出错。新系统默认应优先使用 `TIMESTAMPTZ`。

### 3. DDL 与数据完整性约束

#### 3.1 DDL 的定义

DDL（Data Definition Language，数据定义语言）用于定义数据库对象的结构，核心语句是：

- `CREATE TABLE`：创建表。
- `ALTER TABLE`：修改表，如加列、改类型、加约束。
- `DROP TABLE`：删除表及其全部数据。
- `TRUNCATE TABLE`：清空表数据但保留结构，通常比逐行删除快。

#### 3.2 DDL 与后端的关系

需求变化时结构必须随之演进：新增“用户昵称”功能要加列，废弃字段要安全下线。DDL 一旦在生产库执行就会影响所有正在运行的服务，因此生产环境的 DDL 必须写成可审查、回滚思路清晰的脚本，而不是在客户端里随手敲。

#### 3.3 DDL 示例

```sql
CREATE TABLE categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL
);

ALTER TABLE categories
  ADD COLUMN slug TEXT;

ALTER TABLE categories
  ALTER COLUMN name SET NOT NULL;

ALTER TABLE categories
  ADD CONSTRAINT categories_slug_unique UNIQUE (slug);

DROP TABLE categories;
```

#### 3.4 约束的定义

**约束（constraint）**是数据库对数据正确性做出的强制保证，在写入时校验，违规则整条语句失败：

- `PRIMARY KEY`：非空且唯一，标识每一行。
- `FOREIGN KEY`：引用值必须在被引用表中存在。
- `NOT NULL`：列不允许空值 `NULL`。
- `UNIQUE`：列（或列组合）取值不允许重复。
- `CHECK`：写入的值必须满足布尔表达式。

#### 3.5 约束与后端的关系

约束是数据正确性的最后一道防线。应用层校验负责友好提示和提前失败，但应用可以有 Bug、可以被绕过、可以有多个服务同时写库；数据库约束对所有写入方一视同仁。

```text
HTTP 入口
  → 前端校验：给出即时提示，可被绕过
  → 后端校验：检查业务规则与权限
  → 数据库约束：无论谁写入都必须满足的底线
```

#### 3.6 约束示例

```sql
CREATE TABLE accounts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  age INTEGER NOT NULL CHECK (age >= 0 AND age < 150),
  status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'closed')),
  invited_by BIGINT REFERENCES accounts(id)
);

CREATE TABLE memberships (
  account_id BIGINT NOT NULL REFERENCES accounts(id),
  group_id BIGINT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (account_id, group_id),
  CHECK (role IN ('member', 'moderator', 'owner'))
);
```

#### 3.7 常见误区

> `DROP TABLE` 只是清空数据，下次还能用这张表。

`DROP TABLE` 连结构带数据一起删除；只清数据应使用 `DELETE FROM` 或 `TRUNCATE`。`DROP` 与无 `WHERE` 的 `TRUNCATE` 在生产环境都属于高风险操作。

> 有了应用层校验，就不需要数据库约束。

两者职责不同。批量脚本、运维操作、历史代码和其他服务都可能绕过你写的那层应用校验。

> `UNIQUE` 列天然等于主键。

`UNIQUE` 列默认可以为 `NULL`，也不承担“行标识”的语义；主键额外要求非空，且每表只能有一个。

### 4. DML：插入、更新与删除

#### 4.1 定义

DML（Data Manipulation Language，数据操纵语言）用于操作表中的行：

- `INSERT INTO ... VALUES ...`：插入行。
- `UPDATE ... SET ... WHERE ...`：修改满足条件的行。
- `DELETE FROM ... WHERE ...`：删除满足条件的行。

PostgreSQL 还支持 `INSERT ... RETURNING`、`UPDATE ... RETURNING`，把被影响的行直接返回，便于后端拿到生成的主键。

#### 4.2 与后端的关系

一个“编辑资料”接口内部就是一条 `UPDATE`；一个“注销账号”接口可能是一条 `DELETE`，也可能是带状态的软删除。后端必须把用户输入作为参数传递，而不是拼进 SQL 字符串，否则会产生 SQL 注入。

#### 4.3 示例

```sql
INSERT INTO users (email)
VALUES ('alice@example.com')
RETURNING id, email, created_at;

INSERT INTO posts (author_id, title, body)
VALUES (1, '第一天', '今天学习了关系模型'),
       (1, '第二天', '今天学习了约束');

UPDATE users
SET email = 'alice-new@example.com'
WHERE id = 1
RETURNING id, email;

DELETE FROM posts
WHERE id = 2;
```

使用参数占位的概念示例（防止 SQL 注入）：

```js
// 错误：把外部输入直接拼进 SQL，存在注入风险
const badSql = "SELECT * FROM users WHERE email = '" + inputEmail + "'";

// 正确：使用参数化查询，SQL 结构与数据分离
const sql = 'SELECT * FROM users WHERE email = $1';
const params = [inputEmail];
```

#### 4.4 常见误区

> `UPDATE` / `DELETE` 不加 `WHERE` 会只操作“当前这一行”。

没有“当前行”这回事。不带 `WHERE` 的 `UPDATE` 会更新全表、`DELETE` 会删除全表。执行前应先用相同条件做一次 `SELECT` 确认影响范围。

> 删除一行后，引用它的其他表数据会自动一起删除。

默认不会。外键的默认行为通常是阻止删除被引用行；是否级联删除需要在定义外键时显式指定，详见后续单元。

### 5. SELECT：过滤、排序与截取

#### 5.1 定义

`SELECT` 用于查询数据，常用子句：

- `FROM`：从哪些表取数。
- `WHERE`：按条件过滤行，作用于聚合之前的原始行。
- `ORDER BY`：按列排序，`ASC` 升序（默认）、`DESC` 降序。
- `LIMIT n`：只取前 n 行；`OFFSET m`：跳过前 m 行。
- `DISTINCT`：对结果去重。

`WHERE` 常用运算：`=`、`<>`（不等于）、`>`、`<`、`AND`、`OR`、`IN (...)`、`BETWEEN ... AND ...`、`LIKE`、`IS NULL`。

#### 5.2 与后端的关系

列表页的搜索、筛选、排序和翻页全部对应这些子句：搜索框对应 `LIKE` 或全文条件，状态筛选对应 `IN`，最新优先对应 `ORDER BY created_at DESC`，每页二十条对应 `LIMIT 20 OFFSET ...`。

#### 5.3 示例

```sql
SELECT id, title, created_at
FROM posts
WHERE author_id = 1
ORDER BY created_at DESC
LIMIT 10;

SELECT id, email
FROM users
WHERE email LIKE '%@example.com'
ORDER BY id ASC;

SELECT id, title
FROM posts
WHERE title IS NULL;

SELECT DISTINCT author_id
FROM posts;
```

把 HTTP 查询参数翻译成 SQL 子句的概念伪代码：

```text
GET /posts?author=1&sort=newest&page=2
  author=1     → WHERE author_id = 1
  sort=newest  → ORDER BY created_at DESC
  page=2       → LIMIT 20 OFFSET 20
```

#### 5.4 常见误区

> `WHERE` 里可以直接对聚合结果过滤。

`WHERE` 在分组聚合之前执行，不能引用聚合别名；对聚合结果过滤应使用 `HAVING`。

> `NULL` 可以用 `= NULL` 判断。

`NULL` 表示“未知”，任何与 `NULL` 的普通比较结果都不是真，判断空值必须用 `IS NULL` / `IS NOT NULL`。

### 6. JOIN：把多张表按关系拼回

#### 6.1 定义

规范化会把数据拆到多张表，查询时再用 JOIN 连接：

- `INNER JOIN`：只保留两表中匹配成功的行。
- `LEFT JOIN`（左外连接）：保留左表全部行，右表无匹配时补 `NULL`。
- `RIGHT JOIN`：保留右表全部行，实践中常改写为 `LEFT JOIN`。
- `FULL JOIN`：两边行都保留，无匹配处补 `NULL`。

连接条件写在 `ON` 之后，通常是外键等于主键。

#### 6.2 与后端的关系

“展示文章列表及其作者信息”如果不用 JOIN，就要先查文章、再对每篇文章查一次作者，形成 N+1 次查询（后续单元专门解决）。JOIN 让数据库用一次查询完成关系装配，后端再把扁平结果整理成嵌套 JSON。

#### 6.3 示例

```sql
SELECT posts.id AS post_id,
       posts.title,
       users.email AS author_email
FROM posts
INNER JOIN users ON posts.author_id = users.id
ORDER BY posts.id;

SELECT users.id AS user_id,
       users.email,
       posts.title
FROM users
LEFT JOIN posts ON posts.author_id = users.id
ORDER BY users.id, posts.id;
```

概念伪代码，说明两种连接的差别：

```text
users 有 id 1、2
posts 只有 author_id = 1 的文章

INNER JOIN：只出现用户 1（用户 2 无匹配，被丢弃）
LEFT JOIN ：用户 1 带文章；用户 2 也保留，文章列为 NULL
```

#### 6.4 常见误区

> 多表查询时不写连接条件也能跑，结果差不多。

缺少 `ON` 条件会形成笛卡尔积：两张各一千行的表相乘得到一百万行结果。多表 JOIN 必须写清连接条件。

> 左连接之后再在 `WHERE` 中过滤右表列，不影响左连接语义。

对右表列做 `WHERE right.col = 'x'` 会把右表无匹配（补了 `NULL`）的行过滤掉，左连接实际退化成内连接。这类条件应写在 `ON` 中，或明确接受这一语义变化。

### 7. GROUP BY 与聚合函数

#### 7.1 定义

聚合函数把多行压缩成一个值：`COUNT`、`SUM`、`AVG`、`MIN`、`MAX`。`GROUP BY` 按某些列分组，聚合按组分别计算。

- 出现在 `SELECT` 中的非聚合列，必须出现在 `GROUP BY` 中。
- `WHERE` 过滤分组前的行，`HAVING` 过滤分组后的结果。

#### 7.2 与后端的关系

后台仪表盘上的“每个分类文章数”“每个用户最后登录时间”“订单总数与总金额”都是聚合查询。后端通常把聚合结果直接映射成统计卡片或图表数据结构。

#### 7.3 示例

```sql
SELECT author_id,
       COUNT(*) AS post_count,
       MAX(created_at) AS latest_at
FROM posts
GROUP BY author_id
ORDER BY post_count DESC;

SELECT author_id, COUNT(*) AS post_count
FROM posts
GROUP BY author_id
HAVING COUNT(*) >= 2
ORDER BY post_count DESC;

SELECT COUNT(*) AS total_users
FROM users;
```

统计结果映射到后端响应的示例：

```js
// 行形式的聚合结果
const rows = [
  { author_id: 1, post_count: 2, latest_at: null },
];

// 接口响应通常整理为对象
const responseBody = {
  stats: rows.map((row) => ({
    authorId: row.author_id,
    postCount: Number(row.post_count),
  })),
};
```

#### 7.4 常见误区

> `COUNT(*)`、`COUNT(列)` 和 `COUNT(DISTINCT 列)` 没有区别。

`COUNT(*)` 统计行数；`COUNT(列)` 只统计该列非 `NULL` 的行；`COUNT(DISTINCT 列)` 统计非空且去重后的值数量。

> 分组后可以随便 `SELECT` 其他列。

没有出现在 `GROUP BY` 中的普通列，其取值在组内并不唯一，数据库会拒绝或给出不可靠结果。

### 8. 范式入门：为什么要拆分

#### 8.1 定义

范式是用于减少冗余和更新异常的设计规范，入门阶段掌握前三范式：

- **第一范式（1NF）**：每个单元格只存一个原子值，不在一列里塞逗号分隔的多个值。
- **第二范式（2NF）**：在 1NF 基础上，非主属性完全依赖于整个主键，而不是只依赖组合主键的一部分。
- **第三范式（3NF）**：在 2NF 基础上，非主属性直接依赖主键，不依赖其他非主属性（消除传递依赖）。

#### 8.2 与后端的关系

反例设计：在 `orders` 表里同时存 `user_id`、`user_name`、`user_email`。用户改名后要更新他所有的订单行，漏改一行就出现同一用户两个名字（更新异常）。范式化后用户信息只存 `users` 一处，订单只保留外键。实践中为了查询性能会有意做反范式冗余，这是有意识的取舍，而不是随手复制字段。

#### 8.3 示例

不符合范式的表：

```text
posts(id, title, author_name, author_email, tags)
tags 中存 "sql,db,backend"      -- 违反 1NF
author_email 依赖 author_name    -- 与主键 id 之间是传递依赖，违反 3NF
```

范式化后的结构：

```sql
CREATE TABLE users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  author_id BIGINT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL
);

CREATE TABLE tags (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE post_tags (
  post_id BIGINT NOT NULL REFERENCES posts(id),
  tag_id BIGINT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);
```

#### 8.4 常见误区

> 范式越高越好，任何冗余都是错误。

范式减少异常，但过度拆分会增加 JOIN 数量和写操作复杂度。报表、搜索、缓存场景经常刻意反范式。理解规则后按场景权衡，才是工程能力。

> 多值字段用逗号字符串存储最方便。

字符串标签无法有效使用索引、无法保证引用完整、查询“包含某标签”必须全表扫描并做字符串匹配。多值关系应使用关联表或数组等一等结构。

## 课后题

1. 表、行、列、主键、外键分别解决什么问题？请以“订单、商品、订单明细”为例说明外键放在哪张表。
2. 为什么金额字段推荐使用 `NUMERIC` 而不是 `DOUBLE PRECISION`？请写出一个浮点误差导致对账出错的具体场景。
3. `PRIMARY KEY`、`UNIQUE`、`NOT NULL` 三种约束在空值处理和数量限制上有什么差别？
4. 场景分析：某注册接口没有任何数据库唯一约束，两名用户几乎同时提交了相同邮箱，应用层先查后插。为什么仍然可能出现两条相同邮箱记录？应如何修复？
5. `UPDATE users SET status = 'closed';` 这条语句有什么风险？执行前你会做哪些确认？
6. 场景分析：把 `TIMESTAMP`（不带时区）用于跨国团队的协作系统，可能出现什么问题？为什么新项目通常默认使用 `TIMESTAMPTZ`？
7. `INNER JOIN` 和 `LEFT JOIN` 的差别是什么？请描述一个“必须使用左连接”的业务场景。
8. 场景分析：运营需要“每个分类下已发布文章数，且只展示文章数不少于 5 的分类”。请写出对应的 SQL，并说明为什么过滤条件必须用 `HAVING` 而不是 `WHERE`。
9. 什么是第三范式？请举出一个存在传递依赖的表设计，并说明它会引发哪类更新异常。
10. 场景分析：某开发者在 `posts` 表中用逗号分隔字符串存标签。请列出这种做法在查询、约束和数据一致性上的至少三个问题，并给出改造方案。

## 实践练习题

### 练习 1：建立一个博客数据库骨架

#### 任务

编写 `schema.sql`，创建 `users`、`posts`、`comments` 三张表，并配置完整约束。

关系要求：

- 一个用户可以发表多篇文章；一篇文章属于一个用户。
- 一篇文章可以有多条评论；每条评论属于一篇文章，评论者可选匿名（评论不强制关联用户）。

#### 步骤约束

1. 先在纸上画出三张表及其外键箭头，再写 SQL。
2. 所有主键使用 identity 生成；所有外键、必填字段显式写出 `NOT NULL`。
3. 为用户邮箱加唯一约束；为文章状态加 `CHECK`，取值限定为 `draft`、`published`。
4. 时间字段统一使用 `TIMESTAMPTZ` 并设置默认值 `now()`。
5. 在全新练习库中执行脚本，并使用查看表结构的元数据命令确认定义生效。
6. 脚本必须可以被完整阅读和重复审查，但不得在已有数据的库上盲目重跑 `DROP`。

#### 提交物

- `schema.sql`；
- 三张表关系草图或文本关系说明；
- 表结构查看命令及其输出；
- 一段 100 字以内的设计说明，解释每个外键的归属理由。

#### 验收标准

- 三张表创建成功，主键、外键、非空、唯一、检查约束齐全；
- 类型选择与业务含义匹配，金额等精确字段没有使用浮点；
- 外键方向正确（文章引用用户、评论引用文章）；
- 脚本能在空库一次执行成功。

### 练习 2：插入样例数据并完成多条件查询

#### 任务

编写 `seed.sql` 与 `queries.sql`。前者插入至少 3 个用户、5 篇文章、6 条评论；后者完成规定查询。

#### 步骤约束

1. `seed.sql` 中至少一篇文章为 `draft` 状态，至少一个用户没有发表过文章。
2. 使用 `INSERT ... RETURNING` 观察生成的主键，理解外键值的来源。
3. `queries.sql` 必须包含：
   - 已发布文章按发布时间倒序取前 3 篇；
   - 每个用户的文章数量，按数量倒序；
   - 文章标题与其作者邮箱的内连接；
   - 全部用户及其文章的左连接（没有文章的用户也要出现）。
4. 每条查询前用注释写明该查询回答的业务问题。
5. 尝试插入一条引用不存在作者的文章，记录数据库报错；再尝试插入重复邮箱，记录报错。
6. 故意构造一次不带 `WHERE` 的 `UPDATE` 时必须放在事务中并立即回滚，不得真实污染数据。

#### 提交物

- `seed.sql`、`queries.sql`；
- 四条查询的实际输出；
- 两次约束报错的脱敏记录；
- 对每条查询与业务问题对应关系的说明。

#### 验收标准

- 样例数据满足规定分布；
- 四条查询结果与数据事实一致，无文章用户在左连接结果中出现；
- 能解释两次报错分别由哪条约束拦截；
- 没有真实执行破坏性的无条件更新。

### 练习 3：从坏表设计重构到第三范式

#### 任务

给定一份反范式设计，输出重构后的 DDL 与迁移思路。原始设计如下：

```text
orders(
  id,
  customer_name,
  customer_email,
  customer_city,
  product_name,
  product_category,
  quantity
)
```

同一个客户的每笔订单都重复保存姓名、邮箱、城市；每个商品都重复保存分类。

#### 步骤约束

1. 列出原设计存在的插入异常、更新异常和删除异常各至少一个。
2. 拆出 `customers`、`products`、`categories`、订单行项目等表，写清主键与外键。
3. 保证每张表满足第三范式，并在报告中逐个说明依赖关系。
4. 用一段文字说明：哪些字段在未来报表场景下可能被有意冗余回来，冗余后如何保持一致。
5. 给出从旧表迁移到新表的高层步骤伪代码（建表、去重灌入、校验、切换），不要求真正执行数据迁移。
6. 所有 SQL 保存为版本化脚本文件，文件名体现顺序。

#### 提交物

- `01_normalized_schema.sql`；
- `analysis.md`：异常分析、依赖说明、反范式取舍与迁移步骤；
- 新旧结构对照文本图。

#### 验收标准

- 准确识别三类异常并给出具体例子；
- 新结构外键完整、满足第三范式；
- 迁移步骤包含数据校验环节，顺序合理；
- 反范式讨论体现“有意识取舍”，而非绝对化结论。

## 阶段验收作业

### 作业名称

博客系统关系数据库设计与 SQL 综合实战

### 作业场景

团队要为一个博客系统设计数据库。系统中有用户、文章、评论、分类、标签五类实体，需要支持写作、评论、按分类浏览、按标签检索和简单统计。团队要求你交付一套可以在空库重建的 SQL 脚本，并现场证明数据的完整性和查询的正确性。

### 提交物与目录要求

```text
blog-db/
├── sql/
│   ├── 01_schema.sql
│   ├── 02_seed.sql
│   └── 03_queries.sql
├── diagrams/
│   └── er-model.md
├── evidence/
│   └── run-record.md
└── README.md
```

要求：

- `01_schema.sql`：全部表与约束，覆盖主键、外键、非空、唯一、检查。
- `02_seed.sql`：至少 4 个用户、8 篇文章、10 条评论，文章与标签为多对多关系。
- `03_queries.sql`：至少 6 条查询，覆盖过滤排序、JOIN、分组聚合。
- `er-model.md`：实体关系图（文本图或 Mermaid），标注主键、外键和基数（1:1、1:N、M:N）。
- `evidence/run-record.md`：实际执行记录、输出与报错分析。
- `README.md`：环境要求、重建步骤、脚本执行顺序与验证方法。

### 必做查询

1. 最近发布的 5 篇文章及其作者邮箱。
2. 每个分类下的文章数，仅展示文章数大于等于 2 的分类。
3. 评论数最多的 3 篇文章（含评论数）。
4. 所有用户及其文章数，包含从未发表文章的用户。
5. 带有某个指定标签的全部文章。
6. 每篇文章及其标签列表（允许用关联表 JOIN 后以行形式返回）。

### 演示步骤

学员需要在 15 分钟内完成：

1. 在空库中按顺序执行三个脚本，完成建库与灌数。
2. 展示 ER 图，解释每个外键方向和一对多、多对多关系。
3. 现场执行 6 条必做查询并解读结果。
4. 现场演示：插入重复邮箱、插入引用不存在作者的文章，解释被哪条约束拦截。
5. 回答导师临时提出的一个查询变化，例如“把统计改成只统计已发布文章”。
6. 说明本设计满足第几范式、哪里做了或可能做反范式取舍。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 关系建模 | 25 | 实体完整，主键外键正确，多对多通过关联表实现，范式取舍合理 |
| 约束与类型 | 20 | 五类约束齐全有效，类型选择符合业务含义 |
| 查询能力 | 25 | 6 条查询全部正确，JOIN 类型选择恰当，聚合与 HAVING 使用正确 |
| 可复现性 | 15 | 空库按 README 顺序执行可成功重建，脚本整洁有序 |
| 证据与表达 | 15 | ER 图清晰，执行记录真实，报错分析准确，现场解释到位 |

细分评分规则：

#### 关系建模：25 分

- 五类实体与关联表完整：8 分；
- 外键方向与基数正确：9 分；
- 范式分析与取舍说明合理：8 分。

#### 约束与类型：20 分

- 主键、非空、唯一、检查约束齐全：8 分；
- 外键约束完整：6 分；
- 类型选择正确（时间、精确数值等）：6 分。

#### 查询能力：25 分

- 过滤、排序、截取查询正确：7 分；
- 内连接与左连接使用正确：9 分；
- 分组聚合与 HAVING 使用正确：9 分。

#### 可复现性：15 分

- 脚本顺序清晰、空库可一次重建：8 分；
- README 完整可执行：4 分；
- 无破坏性残留操作：3 分。

#### 证据与表达：15 分

- ER 图规范易读：5 分；
- 执行记录与输出真实完整：5 分；
- 现场能解释约束报错与查询语义：5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 五张核心实体表或文章-标签关联表缺失，多对多关系被错误实现为逗号字符串。
2. 外键方向错误，或关键外键约束缺失导致可以插入引用不存在用户的文章。
3. 脚本无法在空库按顺序重建，或需要大量手动操作才能跑通。
4. 在真实数据上执行了无 `WHERE` 的更新、删除或 `DROP`、`TRUNCATE` 且未做事务保护。
5. 左连接查询漏掉“没有文章的用户”，且无法解释原因。
6. 提交内容包含真实密码、令牌、私钥或个人敏感信息。
7. 只提交截图，没有 SQL 脚本、执行记录和文字说明。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解关系模型与键 | ER 图、`01_schema.sql` 与现场解释 |
| 正确选择数据类型 | 建表脚本与类型说明 |
| 使用 DDL 管理结构 | 空库重建演示 |
| 使用约束保证数据正确 | 建表脚本与两次约束违反应用例 |
| 使用 DML 操作数据 | `02_seed.sql` 与执行记录 |
| 使用 SELECT 完成过滤排序截取 | 必做查询 1、5 |
| 使用 JOIN 装配关系数据 | 必做查询 1、4、6 |
| 使用 GROUP BY 与聚合统计 | 必做查询 2、3 |
| 理解范式并做取舍 | 范式分析说明 |

### 提交前自检

- [ ] 六个二级标题完整，理论小节均含定义、后端关系、示例与误区。
- [ ] 全部表都有主键，关键业务列有非空与唯一约束。
- [ ] 多对多关系通过关联表实现，关联表有组合主键。
- [ ] 时间字段使用 `TIMESTAMPTZ`，精确数值没有使用浮点。
- [ ] 6 条必做查询结果与种子数据事实一致。
- [ ] 空库执行三个脚本可以一次成功。
- [ ] 所有破坏性操作都有事务保护或只停留在伪代码层面。
- [ ] README 与脚本中不含真实密钥、个人绝对路径等敏感信息。
