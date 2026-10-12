# 01 PostgreSQL 核心概念

## 学习目标

- 理解关系型数据库的核心概念：表、行、列、主键、外键、索引、视图
- 完成 PostgreSQL 的安装与基本配置，能通过命令行和 GUI 工具连接数据库
- 掌握基本 CRUD 操作：SELECT、INSERT、UPDATE、DELETE
- 熟练使用条件查询、排序分页、聚合函数和表关联
- 理解子查询和 CTE（WITH 语句）的适用场景
- 熟悉 PostgreSQL 的常用数据类型及其选择策略
- 能独立为一个博客系统设计规范化的数据库表结构

---

## 内容讲解

### 一、关系型数据库的核心概念

如果你之前只用过 `localStorage` 或前端内存数组存数据，那么数据库带来的第一个思维转变是：**数据不是散落的 JSON，而是有结构、有关系、有约束的**。

#### 1.1 表（Table）、行（Row）、列（Column）

可以把表想象成一个 Excel 工作表：

| 列（Column / Field） | → | id | name | email | created_at |
|---------------------|---|----|------|-------|------------|
| 行（Row / Record）   | → | 1  | 张三 | zh@ex.com | 2025-01-01 |
|                      | → | 2  | 李四 | ls@ex.com | 2025-01-02 |

- **表**：一类数据的集合（如 `users` 表存所有用户）
- **列**：数据的属性（如 `name`、`email`），列有固定的**数据类型**
- **行**：一条具体的数据记录

> **避坑提示**：JSON 可以随便加字段，但数据库中**列是预先定义好的**——你不能在某一行突然多一个 `nickname` 字段，除非先用 `ALTER TABLE` 添加列。这是"schemaful（有模式的）"和"schemaless（无模式的）"的本质区别。

#### 1.2 主键（Primary Key）

主键是**每一行数据的唯一标识**，相当于身份证号：

```sql
-- 最常见的做法：自增整数主键
CREATE TABLE users (
  id SERIAL PRIMARY KEY,  -- SERIAL = 自增整数，PRIMARY KEY = 唯一 + 非空
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);
```

主键的特性：
- **唯一**：不能有两行数据的主键相同
- **非空**：主键必须有值
- **不可变**：主键值不应该被修改（否则外键关联会断裂）

> **避坑提示**：不要用业务含义的字段做主键（如手机号、邮箱），业务规则会变。始终用无业务含义的 `id`。

#### 1.3 外键（Foreign Key）

外键用来**建立表与表之间的关联**，确保数据引用的完整性：

```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  -- 外键约束：posts.user_id 必须指向 users 表中存在的 id
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

`ON DELETE CASCADE` 的含义：当 `users` 表中的某一行被删除时，`posts` 表中所有引用该用户的帖子也自动删除。其他选项：

| 选项 | 行为 |
|------|------|
| `CASCADE` | 级联删除，父记录删除时子记录也删除 |
| `SET NULL` | 父记录删除时，子记录的外键列设为 NULL |
| `RESTRICT` / `NO ACTION`（默认） | 如果有子记录引用，禁止删除父记录 |

#### 1.4 索引（Index）

索引就像书的目录——没有目录你要逐页翻找，有了目录你能快速定位：

```sql
-- 为 email 列创建索引，加快按 email 查询的速度
CREATE INDEX idx_users_email ON users(email);

-- 查询时数据库会自动使用索引
SELECT * FROM users WHERE email = 'zh@ex.com';  -- 不用扫描全表
```

索引的本质是用**额外的存储空间**换取**查询速度**。第三篇会深入讲。

#### 1.5 视图（View）

视图是一个**保存下来的查询**，看起来像表，但它不存数据，只是查询的别名：

```sql
-- 创建一个视图：只暴露已发布文章的标题和作者
CREATE VIEW published_posts AS
SELECT p.title, u.name AS author, p.created_at
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.status = 'published';
```

视图的使用场景：
- 简化复杂查询（把多表 JOIN 封装成一个"虚拟表"）
- 权限控制（只暴露部分列给某些用户）

---

### 二、PostgreSQL 安装与连接

#### 2.1 macOS 安装

```bash
# 方式一：Homebrew（推荐）
brew install postgresql@18

# 启动服务
brew services start postgresql@18

# 确认安装成功
psql --version   # 应输出 psql (PostgreSQL) 18.x
```

#### 2.2 创建数据库和用户

```bash
# 进入 PostgreSQL 命令行
psql postgres

# 创建一个新用户（role）
CREATE ROLE myuser WITH LOGIN PASSWORD 'mypassword';

# 创建数据库并指定 owner
CREATE DATABASE blog_dev OWNER myuser;

# 退出
\q
```

#### 2.3 连接数据库

```bash
# 用特定用户连接特定数据库
psql -U myuser -d blog_dev

# 常用 psql 命令
\l          -- 列出所有数据库
\dt         -- 列出当前数据库的所有表
\d users    -- 查看 users 表结构
\q          -- 退出
```

> **避坑提示**：macOS 上 `brew install postgresql` 后如果 `psql` 找不到，检查 `brew` 提示的 PATH 配置，通常需要把 `/opt/homebrew/opt/postgresql@18/bin` 加入 PATH。

---

### 三、基本 SQL 操作

以下示例均在一个博客数据库的上下文中。

#### 3.1 创建表

```sql
-- 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,            -- 自增主键
  name VARCHAR(100) NOT NULL,       -- 变长字符串，最长 100 字符
  email VARCHAR(255) UNIQUE NOT NULL, -- 唯一且非空
  avatar_url TEXT,                  -- 头像链接，TEXT 无长度限制
  created_at TIMESTAMPTZ DEFAULT NOW() -- 默认当前时间
);

-- 文章表
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',   -- draft | published | archived
  user_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 3.2 INSERT：插入数据

```sql
-- 插入单行
INSERT INTO users (name, email) VALUES ('张三', 'zhangsan@example.com');

-- 插入多行（一次插入多条比多次单条插入快很多）
INSERT INTO users (name, email) VALUES
  ('李四', 'lisi@example.com'),
  ('王五', 'wangwu@example.com');

-- 插入时返回插入的行（不需要再查一次）
INSERT INTO posts (title, content, user_id)
VALUES ('第一篇博客', '这是内容...', 1)
RETURNING id, title, created_at;
-- 输出： id | title       | created_at
--       ----|-------------|---------------------------
--        1  | 第一篇博客   | 2025-01-15 10:30:00+08
```

#### 3.3 SELECT：查询数据

```sql
-- 查询所有列（生产环境尽量避免 *，明确列出需要的列）
SELECT id, name, email FROM users;

-- 去重
SELECT DISTINCT status FROM posts;

-- 别名
SELECT title AS 标题, created_at AS 发布时间 FROM posts;
```

#### 3.4 UPDATE：更新数据

```sql
-- 更新单行
UPDATE posts SET status = 'published' WHERE id = 1;

-- 更新多列
UPDATE posts
SET title = '新标题', updated_at = NOW()
WHERE id = 1;

-- ⚠️ 不加 WHERE 会更新全表！生产环境务必小心
-- UPDATE posts SET status = 'published';  -- 这是灾难
```

> **避坑提示**：写 UPDATE / DELETE 时，**先写 WHERE 条件再写 SET**，养成习惯防止误操作。生产环境建议在事务中执行（第三篇会讲）。

#### 3.5 DELETE：删除数据

```sql
-- 删除单行
DELETE FROM posts WHERE id = 1;

-- 删除所有草稿
DELETE FROM posts WHERE status = 'draft';

-- ⚠️ 不加 WHERE 会删除全表数据
-- DELETE FROM posts;  -- 清空全表（TRUNCATE posts 更快但无法回滚）
```

---

### 四、条件查询

```sql
-- WHERE：基础过滤
SELECT * FROM posts WHERE status = 'published';

-- AND / OR：多条件组合（AND 优先级高于 OR，复杂条件用括号）
SELECT * FROM posts
WHERE status = 'published' AND user_id = 1;

-- IN：匹配集合中的任意值
SELECT * FROM posts WHERE status IN ('draft', 'archived');

-- BETWEEN：范围查询（闭区间，包含两端）
SELECT * FROM posts WHERE created_at BETWEEN '2025-01-01' AND '2025-01-31';

-- LIKE：模糊匹配（% = 任意字符，_ = 单个字符）
SELECT * FROM posts WHERE title LIKE '%PostgreSQL%';  -- 标题包含 PostgreSQL
SELECT * FROM users WHERE name LIKE '张_';             -- 姓张且名字只有一个字

-- IS NULL / IS NOT NULL：判空（不能用 = NULL！）
SELECT * FROM users WHERE avatar_url IS NULL;
```

> **避坑提示**：`NULL` 在 SQL 中表示"未知"，任何与 NULL 的比较（包括 `NULL = NULL`）都返回 `NULL`（不是 true 也不是 false），所以必须用 `IS NULL`。另外，`LIKE '%keyword%'` 无法使用普通索引，全文搜索场景考虑用 PostgreSQL 的 `tsvector`。

---

### 五、排序和分页

```sql
-- ORDER BY：默认升序 ASC，降序用 DESC
SELECT * FROM posts ORDER BY created_at DESC;

-- 多字段排序：先按状态升序，相同状态内按时间降序
SELECT * FROM posts ORDER BY status ASC, created_at DESC;

-- LIMIT + OFFSET：分页（第 1 页，每页 10 条）
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10 OFFSET 0;
-- 第 2 页
SELECT * FROM posts ORDER BY created_at DESC LIMIT 10 OFFSET 10;
```

> **避坑提示**：`OFFSET` 分页在大数据量下性能很差——数据库仍需扫描前 N 行再跳过。更好的做法是**基于游标分页**（上一页最后一条的 id 或时间戳）：
> ```sql
> -- 游标分页：假设上一页最后一条的 created_at 是 '2025-01-20 10:00:00'
> SELECT * FROM posts
> WHERE created_at < '2025-01-20 10:00:00'
> ORDER BY created_at DESC LIMIT 10;
> ```

---

### 六、聚合查询

聚合函数把多行数据汇总为单个值：

```sql
-- 统计总数
SELECT COUNT(*) FROM posts;

-- 按状态分组统计
SELECT status, COUNT(*) AS count
FROM posts
GROUP BY status;
-- 输出： status    | count
--       -----------|------
--       draft      | 5
--       published  | 12

-- 每个用户的文章统计
SELECT
  u.name AS 作者,
  COUNT(p.id) AS 文章数,
  MAX(p.created_at) AS 最新发布
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.name;

-- HAVING：对分组结果过滤（WHERE 不能用于聚合后的条件）
SELECT user_id, COUNT(*) AS post_count
FROM posts
GROUP BY user_id
HAVING COUNT(*) > 5;  -- 只返回文章数大于 5 的用户
```

WHERE vs HAVING 的区别：
- `WHERE` 在分组前过滤**行**
- `HAVING` 在分组后过滤**组**

> **避坑提示**：`SELECT` 中的非聚合列必须出现在 `GROUP BY` 中，否则 PostgreSQL 会报错。MySQL 默认不报（但结果不确定），这是新手常踩的坑。

---

### 七、表关联（JOIN）

JOIN 是关系型数据库最强大的能力之一：**把多张表按条件"拼"在一起**。

#### 7.1 INNER JOIN（内连接）

只返回**两表都匹配**的行：

```sql
-- 查询文章及其作者姓名
SELECT p.title, u.name AS author
FROM posts p
INNER JOIN users u ON p.user_id = u.id;
-- 结果只包含有作者的帖子 + 有帖子的作者
```

#### 7.2 LEFT JOIN（左连接）

返回左表**所有**行 + 右表匹配的行（不匹配则为 NULL）：

```sql
-- 所有用户及其文章数（包括没发过文章的用户）
SELECT u.name, COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
GROUP BY u.id, u.name;
-- 没发过文章的用户 post_count = 0
```

#### 7.3 RIGHT JOIN（右连接）

返回右表所有行 + 左表匹配的行。实践中较少使用——LEFT JOIN 换一下表顺序通常就能达到同样效果。

#### 7.4 FULL JOIN（全外连接）

返回两表所有行，不匹配的地方填 NULL：

```sql
-- 找出仅在一侧存在的数据（用于数据对账）
SELECT u.name, p.title
FROM users u
FULL JOIN posts p ON u.id = p.user_id
WHERE u.id IS NULL OR p.id IS NULL;
```

#### 关联类型速查

| JOIN 类型 | A 表无匹配 | B 表无匹配 |
|-----------|-----------|-----------|
| INNER JOIN | 丢弃 | 丢弃 |
| LEFT JOIN | 保留（B 列为 NULL） | 丢弃 |
| RIGHT JOIN | 丢弃 | 保留（A 列为 NULL） |
| FULL JOIN | 保留 | 保留 |

---

### 八、子查询和 CTE

#### 8.1 子查询

子查询是嵌套在另一个查询中的查询：

```sql
-- 查询文章数超过平均值的用户
SELECT name FROM users WHERE id IN (
  SELECT user_id FROM posts
  GROUP BY user_id
  HAVING COUNT(*) > (SELECT AVG(cnt) FROM (
    SELECT COUNT(*) AS cnt FROM posts GROUP BY user_id
  ) AS avg_posts)
);
```

子查询虽然灵活，但多层嵌套时**可读性很差**。这时 CTE 登场。

#### 8.2 CTE（Common Table Expression，WITH 语句）

CTE 让你给子查询起一个名字，像使用临时表一样使用它：

```sql
-- 同样的需求用 CTE 改写
WITH user_post_counts AS (
  SELECT user_id, COUNT(*) AS cnt FROM posts GROUP BY user_id
),
avg_count AS (
  SELECT AVG(cnt)::FLOAT AS avg_cnt FROM user_post_counts
)
SELECT u.name, upc.cnt
FROM users u
JOIN user_post_counts upc ON u.id = upc.user_id
WHERE upc.cnt > (SELECT avg_cnt FROM avg_count);
```

CTE 的优势：
- **可读性**：每个步骤有名字，从上到下阅读
- **可复用**：同一个 CTE 可以在后续多次引用
- **递归**：CTE 支持递归查询（如查询树形结构的组织架构或分类目录）

```sql
-- 递归 CTE：查询分类树
WITH RECURSIVE category_tree AS (
  -- 基础情况：根节点
  SELECT id, name, parent_id, 1 AS depth FROM categories WHERE parent_id IS NULL
  UNION ALL
  -- 递归：子节点
  SELECT c.id, c.name, c.parent_id, ct.depth + 1
  FROM categories c
  JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY depth, id;
```

---

### 九、PostgreSQL 数据类型

| 类型 | 说明 | 使用场景 |
|------|------|---------|
| `SERIAL` / `BIGSERIAL` | 自增整数（4/8 字节） | 主键 |
| `INTEGER` / `BIGINT` | 整数（4/8 字节） | 数量、年龄、计数 |
| `TEXT` | 无长度限制的文本 | 文章内容、Markdown |
| `VARCHAR(n)` | 有长度限制的变长字符串 | 用户名、标题、邮箱 |
| `BOOLEAN` | true / false / null | 开关状态、是否删除 |
| `TIMESTAMP` | 日期时间（无时区） | ⚠️ 不推荐，用 TIMESTAMPTZ |
| `TIMESTAMPTZ` | 日期时间（带时区） | 创建时间、更新时间（推荐） |
| `UUID` | 全局唯一标识符 | 分布式系统的主键 |
| `JSONB` | 二进制 JSON，支持索引 | 灵活的动态字段、配置数据 |
| `DECIMAL(p,s)` | 精确小数 | 金额、价格（不能用 FLOAT） |

> **避坑提示**：
> 1. **金额千万别用 FLOAT**——`0.1 + 0.2 != 0.3` 的浮点精度问题会算错钱。用 `DECIMAL(10,2)` 或整数存"分"。
> 2. **TIMESTAMP vs TIMESTAMPTZ**：永远用 `TIMESTAMPTZ`。不带时区的时间存储会丢失时区信息，导致跨时区时时间对不上。PostgreSQL 内部始终以 UTC 存储 TIMESTAMPTZ，展示时按会话时区转换。

---

### 十、实战：为博客系统设计数据库表结构

#### 需求分析

一个博客系统需要：
- 用户可以注册、登录（users）
- 用户可以发布文章（posts），每篇文章属于一个用户
- 用户可以评论文章（comments）
- 文章可以有多个标签（tags），一个标签可以属于多篇文章（多对多）

#### ER 图（实体关系）

```
users 1 ──── N posts 1 ──── N comments
                    │
                    N
                    │
                    M ──── N tags
```

#### 完整建表 SQL

```sql
-- 1. 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,          -- 存储 bcrypt 加密后的密码
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 文章表
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,    -- URL 友好的标题，如 "hello-world"
  content TEXT NOT NULL,
  excerpt TEXT,                         -- 摘要
  status VARCHAR(20) DEFAULT 'draft',   -- draft | published | archived
  view_count INTEGER DEFAULT 0,         -- 阅读量
  user_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,             -- 发布时间
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 评论表
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  post_id INTEGER NOT NULL,
  parent_id INTEGER,                    -- 回复某条评论（NULL 表示顶层评论）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- 4. 标签表
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL      -- URL 友好的标签名
);

-- 5. 文章-标签关联表（多对多关系的中间表）
CREATE TABLE post_tags (
  post_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, tag_id),        -- 复合主键：同一篇文章不能重复添加同一标签
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- 6. 创建常用查询的索引
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);
```

#### 设计要点说明

1. **`slug` 字段**：文章 URL 用 `/posts/hello-world` 而非 `/posts/123`，SEO 更好，用户也更容易理解。
2. **`status` 字段**：用 `VARCHAR` 而非枚举类型，方便后续扩展状态。实际项目中也可用 PostgreSQL 的 `ENUM` 类型。
3. **`post_tags` 中间表**：多对多关系必须拆出一个中间表，否则会导致数据冗余。不能用数组存标签（违反第一范式且难以索引）。
4. **`parent_id` 自引用外键**：评论的嵌套回复通过 `parent_id` 指向同表内的父评论实现，配合递归 CTE 可以查询整个评论树。

---

## 常见问题

**Q1: PostgreSQL 和 MySQL 该选哪个？**

博文/内容管理系统、需要 JSON 查询、查询复杂、对数据完整性和标准合规要求高 → PostgreSQL。简单 CRUD、读多写少、追求极简运维 → MySQL 也可。作为前端工程师学 PostgreSQL 更合适，因为它对 JSONB 的支持让你能平滑过渡 NoSQL 思维。

**Q2: TEXT 和 VARCHAR 有什么区别？**

性能上几乎没有差别。`VARCHAR(n)` 有长度约束可以防止脏数据，`TEXT` 无长度限制适合存大段内容。PostgreSQL 内部存储机制相同，选择主要看业务是否需要长度约束。

**Q3: 什么时候用 JSONB 而不是单独的列？**

当你事先不确定字段结构（如用户自定义表单、第三方 API 返回数据），或者字段只在某些情况下出现时，用 JSONB。其余情况优先用独立列——独立列可以设约束、建索引、类型检查更严格。

**Q4: COUNT(*) 和 COUNT(column) 有什么区别？**

`COUNT(*)` 统计**所有行**（包括 NULL 列）。`COUNT(column)` 只统计该列**非 NULL** 的行数。性能上 `COUNT(*)` 通常是最优的。

**Q5: 为什么我的 LIKE 查询很慢？**

`LIKE 'prefix%'`（前缀匹配）可以使用 B-Tree 索引，但 `LIKE '%keyword%'`（中间匹配）用不了。后一种场景需要 `pg_trgm` 扩展的 GIN 索引或全文搜索（`tsvector`）。

**Q6: JOIN 和子查询哪个性能好？**

没有绝对答案。现代查询优化器通常能把两者优化到相同水平。优先用**可读性更好**的写法。当子查询嵌套超过 2 层时，考虑用 CTE 改写。

**Q7: 外键会影响性能吗？**

每次 INSERT/UPDATE 都会检查外键约束，有一定开销但通常可以忽略。外键的主要价值是**数据完整性保障**——没有外键，你的代码就是数据完整性的唯一守护者，而代码会出 bug。生产环境不要为了微小的性能提升而放弃外键。

**Q8: PostgreSQL 的 SERIAL 主键用完了怎么办？**

`SERIAL` 是 4 字节整数，最大约 21 亿，对于大多数应用够用。如果真的快用完了，改用 `BIGSERIAL`（8 字节，约 9 亿亿）。分布式系统建议用 `UUID` 做主键。

---

## 实操作业

### 基础练习：创建一个电影数据库

```sql
-- 1. 创建 movies 表，包含：id, title, director, year, rating(评分), genre(类型), created_at
-- 2. 插入 10 部电影数据
-- 3. 查询 2000 年以后上映的科幻片，按评分降序排列
-- 4. 统计每个导演的电影数量和平均评分
```

### 进阶练习：博客系统的复杂查询

在博客表结构上完成：
1. 查询每篇文章的标题、作者名、评论数、标签列表（用 `STRING_AGG` 聚合标签）
2. 查询每个标签下文章数量最多的前 5 个标签
3. 用递归 CTE 查出某篇文章的完整评论树（嵌套回复结构）

### 挑战练习：设计一个电商数据库

设计商品、订单、用户、购物车的表结构，包含：
- 一个订单可以有多个商品（订单明细表）
- 商品可以属于多个分类
- 用户有收货地址（一个用户多个地址）
- 写出建表 SQL，定义好主键、外键和必要索引

---

## 本节小结

- **关系型数据库**的核心是表/行/列，数据有严格的结构约束（schema）
- **主键**唯一标识行，**外键**建立表间关联并保证引用完整性
- **SQL** 是声明式语言：你描述要什么数据，数据库决定怎么取
- **JOIN** 是关系型数据库的杀手锏——多张表按条件"拼"在一起查询
- **CTE（WITH）** 让复杂查询可读可维护，递归 CTE 能处理树形数据
- **数据类型选择**直接影响数据正确性：金额用 DECIMAL，时间用 TIMESTAMPTZ
- **索引**是用空间换时间——现在只需要知道它的存在，第三篇会深入