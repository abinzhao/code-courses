# 安全搜索与动态查询：把结构选择和值输入分开

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个可单测的 Listing 查询编译器、一份 PostgreSQL 计划检查手册 |
| 练习位置 | 读者自己的 `market-backend-lab/search/`，不是教材仓库 |
| 运行条件 | Node.js 24；计划分析另需 PostgreSQL 18 测试库 |
| 核心命令 | `node --test search/query.test.mjs` |
| 成功证据 | 排序只来自白名单；搜索、状态、整数分和 limit 只进入参数数组 |
| 失败证据 | 注入式排序、超长查询、小数分和反向价格区间均被拒绝 |
| 环境标签 | 最小案例是 **STATIC SQL 编译**；没有执行数据库或 HTTP 请求 |

## 1. 任务背景

邻里集市要支持“搜索标题、筛选状态、限定价格、选择排序”。最危险的实现是把查询参数直接
拼进 SQL：

```ts
// 错误示例：不要运行。
const sql = `SELECT id, title, price_cents FROM listings
  WHERE title ILIKE '%${q}%'
  ORDER BY ${sort}`;
```

这里同时混淆了两类输入。`q` 是 SQL 值，应该使用参数占位符；`sort` 决定列名和方向，是 SQL
结构，不能用普通值占位符替代，也不能信任客户端字符串。即使把 `q` 参数化，如果产品定义为
“字面子串”，`%` 和 `_` 仍会被 `LIKE` 当作通配符，搜索语义依然错误。

安全动态查询不是“彻底禁止动态”，而是把变化压缩成受控集合：服务端从白名单选择结构，用户
提供的值进入参数数组，每个值再接受长度、枚举、整数分和关系约束。

## 2. 学习目标

完成本课后，你能够：

1. 区分 SQL 标识符、关键字和普通值；
2. 用白名单映射排序，不把用户字符串拼入 `ORDER BY`；
3. 参数化状态、金额和搜索模式；
4. 正确转义 `LIKE` 的 `%`、`_` 与转义字符本身；
5. 为动态占位符维护稳定的参数顺序；
6. 解释 B-tree、前缀搜索、子串搜索与 `pg_trgm` 的差别；
7. 只在真实 PostgreSQL 18 测试库输出查询计划证据。

## 3. 预备知识

先阅读：

- [参数化 SQL、类型与 SQLSTATE](../04-postgres-data-access/02-parameterized-sql-types-sqlstate.md)；
- [迁移、索引与查询计划](../03-sql-modeling/03-migrations-indexes-query-plans.md)；
- [统一项目契约](../../00-guide/project-contract.md)中的 Listing 和整数分约束。

在个人练习工程根目录创建目录：

```bash
mkdir -p search
node --version
```

本课文件使用 `.mjs` 和 Node 内置测试，不安装依赖。预期版本以 `v24.` 开头。版本输出只证明
运行时入口存在，不代表 SQL 已由 PostgreSQL 解析或执行。

## 4. 核心理论

### 4.1 值参数化不等于结构参数化

PostgreSQL 占位符 `$1` 表示一个值，不能表示列名、`ASC`、`DESC` 或整段表达式：

```sql
-- $1 会被当成一个值，不会变成 title 列。
ORDER BY $1
```

因此动态结构必须由服务端代码从有限映射中选择。白名单值应是完整、审查过的 SQL 片段，而
不是只检查“看起来像标识符”的正则。正则可能允许一个存在但不该公开排序的敏感列。

### 4.2 参数化和 `LIKE` 转义解决不同问题

参数化阻止用户值改变 SQL 语法。`LIKE` 转义决定 `%` 和 `_` 是通配符还是普通字符：

| 输入字符 | 未转义含义 | 字面搜索中的参数内容 |
| --- | --- | --- |
| `%` | 任意长度字符 | `\%` |
| `_` | 任意单个字符 | `\_` |
| `\` | 转义字符 | `\\` |

先转义反斜线、百分号和下划线，再在两侧加产品需要的 `%`：

```text
用户输入 "%_\" -> 参数 "%\%\_\\%"
```

SQL 同时声明 `ESCAPE E'\\'`，否则代码和数据库可能对转义字符理解不同。这里的两层反斜线
分别属于 JavaScript 字符串和 PostgreSQL escape string，必须用测试检查最终字符串和真实查询，
不能凭源码里斜线数量猜测。

### 4.3 动态占位符需要单一所有者

可选筛选会改变参数数量。可靠做法是由一个小函数在 `values.push(value)` 后返回当前位置：

```js
const bind = (value) => {
  values.push(value);
  return `$${values.length}`;
};
```

这样 SQL 中 `$3` 与数组第三项从同一操作生成，避免新增筛选后忘记整体重编号。

### 4.4 输入约束早于数据库成本

`q`、`limit` 和价格区间必须在查询前验证：

- `q` 是字符串，去首尾空白后最长 100 个 Unicode code points；
- `status` 只能是公开枚举；
- `minPriceCents`、`maxPriceCents` 是非负安全整数分；
- 最小价格不能大于最大价格；
- `limit` 是 `1..100` 的安全整数。

DTO 验证和查询编译器可以双重保护。编译器不能假设所有调用者永远经过同一 HTTP DTO，因为
后台任务、测试或新控制器也可能直接调用仓储。

### 4.5 稳定排序是分页的前置

`created_at` 可能相同，`price_cents` 更会大量重复。每种公开排序都要追加唯一且方向明确的
`id` 作为 tie-breaker：

```sql
ORDER BY l.created_at DESC, l.id DESC
ORDER BY l.price_cents ASC, l.id ASC
ORDER BY l.price_cents DESC, l.id DESC
```

这使结果成为全序。它还没有自动解决 Offset 的并发漂移，但为下一课的 Keyset 游标提供了
可定义的锚点。

### 4.6 索引选择要服从真实查询

普通 B-tree 可以帮助等值、范围和某些前缀排序，通常不能有效支持前导通配符
`ILIKE '%台灯%'`。PostgreSQL 的 `pg_trgm` + GIN/GiST 可能适合子串搜索，但是否值得取决于
语言、数据量、选择性、写入成本和真实计划。

`EXPLAIN` 只给估算；`EXPLAIN (ANALYZE, BUFFERS)` 会实际执行查询并收集运行信息。它不能在
未授权环境对写语句随意使用，也不能把小测试库的计划外推成生产结论。

## 5. 元素、属性、API 或配置清单

| 项目 | 本课用法 | 边界 |
| --- | --- | --- |
| `$1..$n` | 绑定搜索、枚举、整数分和 limit | 不能绑定列名和方向 |
| `SORT_SQL` | `sort` 到完整 `ORDER BY` 片段的白名单 | 不接受未知键回退到用户文本 |
| `ILIKE` | 不区分大小写的教学搜索 | 语言学规则受 collation 影响 |
| `ESCAPE E'\\'` | 明确反斜线为模式转义字符 | 应核对最终 SQL 字符串 |
| `replace(/[\\%_]/g, "\\$&")` | 转义三个模式元字符 | 只适用于本课定义的字面搜索 |
| `Number.isSafeInteger` | 检查整数分和 limit | 还需检查范围与非负 |
| `Array.push` + `$${length}` | 同步生成参数和占位符 | 参数数组仍需按驱动要求传递 |
| `EXPLAIN` | 查看计划估算 | 不提供实际耗时 |
| `EXPLAIN (ANALYZE, BUFFERS)` | 测试库实际执行并观察缓存页 | 不能冒充生产压测 |
| `pg_trgm` | 可选子串索引扩展 | 需迁移、权限和真实基准 |

## 6. 最小可运行案例

### 6.1 创建查询编译器

用编辑器创建完整文件 `search/query.mjs`：

```js
const SORT_SQL = Object.freeze({
  newest: "l.created_at DESC, l.id DESC",
  price_asc: "l.price_cents ASC, l.id ASC",
  price_desc: "l.price_cents DESC, l.id DESC",
});

const STATUSES = new Set(["available", "reserved", "sold"]);

function cents(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name}: expected non-negative safe integer cents`);
  }
  return value;
}

export function escapeLikeLiteral(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}

export function buildListingQuery(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("query: expected object");
  }

  const sort = input.sort ?? "newest";
  const orderBy = SORT_SQL[sort];
  if (!orderBy) {
    throw new RangeError("sort: unsupported value");
  }

  const limit = input.limit ?? 20;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError("limit: expected integer 1..100");
  }

  const values = [];
  const where = [];
  const bind = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (input.q !== undefined) {
    if (typeof input.q !== "string") {
      throw new TypeError("q: expected string");
    }
    const q = input.q.trim();
    if ([...q].length > 100) {
      throw new RangeError("q: maximum 100 code points");
    }
    if (q !== "") {
      const pattern = `%${escapeLikeLiteral(q)}%`;
      where.push(`l.title ILIKE ${bind(pattern)} ESCAPE E'\\\\'`);
    }
  }

  if (input.status !== undefined) {
    if (!STATUSES.has(input.status)) {
      throw new RangeError("status: unsupported value");
    }
    where.push(`l.status = ${bind(input.status)}`);
  }

  if (input.minPriceCents !== undefined) {
    where.push(`l.price_cents >= ${bind(cents(input.minPriceCents, "minPriceCents"))}`);
  }
  if (input.maxPriceCents !== undefined) {
    where.push(`l.price_cents <= ${bind(cents(input.maxPriceCents, "maxPriceCents"))}`);
  }
  if (
    input.minPriceCents !== undefined &&
    input.maxPriceCents !== undefined &&
    input.minPriceCents > input.maxPriceCents
  ) {
    throw new RangeError("price range: minimum exceeds maximum");
  }

  const text = [
    "SELECT l.id, l.title, l.price_cents, l.status, l.created_at",
    "FROM listings AS l",
    where.length === 0 ? "" : `WHERE ${where.join(" AND ")}`,
    `ORDER BY ${orderBy}`,
    `LIMIT ${bind(limit)}`,
  ]
    .filter(Boolean)
    .join("\n");

  return { text, values };
}
```

查询编译器只生成 `{ text, values }`，不连接数据库。`SORT_SQL` 是结构的唯一来源；q 即使包含
引号或 SQL 片段，也只能成为参数数组的一项。

### 6.2 创建可观察测试

创建完整文件 `search/query.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildListingQuery, escapeLikeLiteral } from "./query.mjs";

test("escapes LIKE metacharacters as literal text", () => {
  assert.equal(escapeLikeLiteral("%_\\"), "\\%\\_\\\\");
  const query = buildListingQuery({ q: "%_\\", limit: 20 });
  assert.equal(query.values[0], "%\\%\\_\\\\%");
  assert.match(query.text, /ILIKE \$1 ESCAPE E'\\\\'/);
});

test("selects SQL structure only from the allow-list", () => {
  const query = buildListingQuery({
    sort: "price_asc",
    status: "available",
    minPriceCents: 0,
    maxPriceCents: 1990,
    limit: 10,
  });
  assert.match(query.text, /ORDER BY l\.price_cents ASC, l\.id ASC/);
  assert.deepEqual(query.values, ["available", 0, 1990, 10]);
  assert.equal(query.text.includes("available"), false);
});

test("rejects structural injection and invalid ranges", () => {
  assert.throws(
    () => buildListingQuery({ sort: "created_at DESC; DROP TABLE users" }),
    /sort/,
  );
  assert.throws(() => buildListingQuery({ q: "x".repeat(101) }), /maximum/);
  assert.throws(() => buildListingQuery({ minPriceCents: 19.9 }), /integer cents/);
  assert.throws(
    () => buildListingQuery({ minPriceCents: 2000, maxPriceCents: 1990 }),
    /minimum exceeds/,
  );
});
```

运行：

```bash
node --test search/query.test.mjs
```

预期 3 条测试通过并退出 `0`。这是可观察的字符串和参数边界，不是数据库证据。若测试显示 SQL
正文包含 `available` 或恶意排序文本，说明值/结构边界已被破坏。

## 7. 邻里集市集成案例

### 7.1 放入仓储边界

综合项目的完整代码仍由第 10 章拥有。以下是应放入
`apps/api/src/listings/listing.repository.ts` 的**增量设计片段**，不是第二份完整仓储：

```ts
type SearchInput = {
  q?: string;
  status?: "available" | "reserved" | "sold";
  minPriceCents?: number;
  maxPriceCents?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  limit?: number;
};

async function searchListings(client: PoolClient, input: SearchInput) {
  const query = buildListingQuery(input);
  const result = await client.query(query);
  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    priceCents: Number(row.price_cents),
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}
```

真实实现还应对 `pg` 返回值做运行时检查：`price_cents` 必须能安全转换为非负整数分，
`created_at` 必须规范化成 UTC ISO。Controller 只传 DTO 允许的字段，仓储仍保留自己的值域
检查。公共列表不混入“当前用户是否收藏”等私有字段，避免后续缓存串身份。

### 7.2 取得真实 PostgreSQL 计划时需要记录什么

只有已准备隔离 PostgreSQL 18 测试库时，才执行以下手册。先保存环境事实：

```bash
psql --version
PGSERVICE=market_lab psql -X -v ON_ERROR_STOP=1 -c \
  "SELECT current_database(), current_user, current_setting('server_version');"
PGSERVICE=market_lab psql -X -v ON_ERROR_STOP=1 -c \
  "SELECT version FROM schema_migrations ORDER BY version;"
```

`market_lab` 使用第 4 章配置的 `.pg_service.conf` 与权限为 `0600` 的 passfile；不要把含密码的
连接 URL 展开进 `psql` 进程参数。再以测试数据的真实参数执行：

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, title, price_cents, status, created_at
FROM listings
WHERE title ILIKE '%台灯%' ESCAPE E'\\'
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

保存实际计划、表行数、参数和执行时间。若没有 PostgreSQL 18、迁移未应用或连接失败，应保存
原始错误并停止数据库结论，不能用上面的“预期可能出现 Seq Scan”伪装成实际输出。

若真实数据证明子串扫描不可接受，再由迁移评估：

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX listings_title_trgm_idx
  ON listings USING gin (title gin_trgm_ops);
```

扩展需要数据库权限并增加写放大；先在测试库比较计划和写入成本，不因为索引能创建就直接进入
生产。

## 8. 常见错误与排查路径

### 8.1 明确错误示例：排序回退到原始输入

```js
// 错误：未知值又回到了 SQL 结构。
const orderBy = SORT_SQL[input.sort] ?? input.sort;
```

- **现象**：`sort=created_at DESC; SELECT pg_sleep(10)` 出现在 SQL 正文。
- **证据**：`query.text` 包含请求原文，结构注入测试失败。
- **原因**：白名单只覆盖正常路径，回退路径重新信任用户输入。
- **修复**：未知排序立即返回 `400 VALIDATION`；默认值只能是服务端常量 `newest`。
- **复验**：运行指定测试与完整测试，确认恶意文本不在 SQL，合法三种排序仍产生预期全序。

### 8.2 参数化后 `%` 搜索仍返回全部

- **现象**：搜索字面 `%` 得到几乎所有商品。
- **证据**：参数值是 `"%%%"`，或 SQL 没有 `ESCAPE`。
- **原因**：参数化阻止注入，却没有改变 `LIKE` 模式语义。
- **修复**：先转义 `\`、`%`、`_`，两侧再加通配符，并声明同一个 escape 字符。
- **复验**：用标题分别为 `100% 棉` 和 `普通棉` 的测试数据查询 `%`，只返回前者。

### 8.3 有索引但计划仍是顺序扫描

- **现象**：计划没有使用新索引。
- **证据**：实际 `EXPLAIN`、表大小、统计信息和查询模式。
- **原因**：表太小、选择性低、统计陈旧、索引表达式不匹配，或 B-tree 不支持前导通配符。
- **修复**：核对操作符和索引类型，在测试库更新统计并重新测量；不要强制关闭 Seq Scan 掩盖成本。
- **复验**：记录变更前后同一数据集的计划、缓冲区和耗时，仍不划算则删除无价值索引。

## 9. 课后题

1. **为什么不能写 `ORDER BY $1` 让 `$1 = "created_at DESC"`？**
   答案：占位符代表值，不会被重新解析为标识符和关键字；动态结构应由服务端白名单选择。
2. **参数化 `ILIKE $1` 为什么还要转义 `%`？**
   答案：参数化处理语法注入，`LIKE` 转义处理产品定义的字面匹配，两者责任不同。
3. **`ORDER BY price_cents ASC` 为什么不稳定？**
   答案：多件商品可以同价；必须追加唯一 tie-breaker，例如同方向的 `id ASC`。
4. **能否看到 `Index Scan` 就宣布查询优化完成？**
   答案：不能，还需真实数据量、参数、缓冲区、耗时、写入成本和并发观察。

## 10. 实践练习

### 基础：增加出售状态筛选

增加 `sold` 合法用例和未知 `hidden` 拒绝用例。可判定标准：合法状态只在参数数组，SQL 正文只
出现占位符；未知状态抛出包含 `status` 的错误。

### 进阶：增加标题前缀模式

显式增加 `match=prefix`，参数应为 `${escaped}%`；不能复用子串模式后再删字符串首字符。
可判定标准：模式枚举有白名单，`%` 仍按字面转义，文档说明前缀和子串索引策略不同。

### 故障注入：删除 tie-breaker

临时把 `newest` 改成只有 `l.created_at DESC`，补一条精确断言让测试先红，再恢复 `id DESC`。
验收记录必须包含现象、失败断言、原因、修复和完整复验；不能删除断言接受非全序。

## 11. 阶段验收

- [ ] `node --test search/query.test.mjs` 实际执行并退出 `0`；
- [ ] 三种排序均由白名单映射并包含唯一 tie-breaker；
- [ ] q、状态、整数分和 limit 都在 `values`，不出现在 SQL 正文；
- [ ] `%`、`_`、`\` 三种字符有字面搜索断言；
- [ ] q 长度、limit、金额值域和价格关系均被拒绝；
- [ ] 若运行计划，已记录 PostgreSQL 服务端/客户端主版本、连接目标和迁移状态；
- [ ] 若未运行 PostgreSQL，报告明确写“仅完成静态编译测试”，没有虚构计划结果。

## 12. 常见问题

**可以用查询构建器或 ORM 代替手写占位符吗？**
可以，但仍需核对它如何处理标识符、排序、原始 SQL 和 `LIKE` 转义。库 API 不能替代白名单和
值域设计。

**q 应该先转小写吗？**
不一定。`ILIKE`、collation、Unicode 规范化和产品搜索语义相关。需要明确语言需求和数据库
配置，不要在应用与数据库各做一套不一致转换。

**为什么限制 100 code points 而不是 `q.length`？**
展开字符串比 UTF-16 code unit 更接近用户字符数量，但仍不等于 grapheme cluster。这里用于
成本上限；严格展示长度应另选 Unicode 分段策略。

**查询计划能写进单元测试吗？**
字符串测试可进入单元层；真实计划依赖 PostgreSQL、数据和统计信息，应作为数据库集成或基准
证据，避免在纯单元测试里伪造。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [PostgreSQL 18：SQL Syntax / Lexical Structure](https://www.postgresql.org/docs/18/sql-syntax-lexical.html)
- [PostgreSQL 18：Pattern Matching](https://www.postgresql.org/docs/18/functions-matching.html)
- [PostgreSQL 18：Using EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html)
- [PostgreSQL 18：`pg_trgm`](https://www.postgresql.org/docs/18/pgtrgm.html)
- [node-postgres：Queries](https://node-postgres.com/features/queries)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

## 我现在能做到什么

我能把动态列表查询拆成受控 SQL 结构和参数化值，正确表达字面 `LIKE` 搜索、整数分边界和稳定
排序，并能区分纯字符串测试与真实 PostgreSQL 查询计划证据。

## 单元导航

- 章节目录：[07 搜索、分页与文件](../README.md#07-搜索分页与文件)
- 上一课：[认证、对象授权与 RBAC](../06-auth-sessions-rbac/03-authentication-object-authorization-rbac.md)
- 下一课：[Offset、Keyset 与一致分页](02-offset-keyset-consistent-pagination.md)
