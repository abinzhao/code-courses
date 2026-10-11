# 参数化 SQL、类型映射与 SQLSTATE

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 查询构造器、Listing 行映射、SQLSTATE 分类器与可判定测试 |
| 练习目录 | `market-api-lab/` |
| 最小运行方式 | Node.js 内存查询记录器，**不连接数据库** |
| 真实集成方式 | 对 PostgreSQL 18 迁移库运行同一查询并记录版本/目标/迁移 |
| 领域约束 | `priceCents` 是安全整数分；时间对外是 UTC ISO 8601 |
| 安全重点 | 网络输入只能作为值参数；标识符必须由服务端允许列表选择 |
| 失败证据 | 攻击文本进入 SQL 字符串、越界 int8、非法时间或错误 SQLSTATE 映射均使测试失败 |

## 1. 任务背景

参数化查询解决的是“用户值改变 SQL 结构”。它不自动解决动态列名、错误对象映射、对象越权或
`LIKE` 通配符语义。下面两个需求看似相同，边界却不同：

```text
title 等于用户输入       -> WHERE title = $1
按用户选择的字段排序     -> 服务端 map 选择固定 ORDER BY 片段
```

数据库类型也不会自动变成 API 契约。PostgreSQL `count(*)` 是 `bigint`，`pg` 通常保留为字符串，
避免 JavaScript 静默丢精度；`numeric` 也通常是字符串。`timestamptz` 常映射为 `Date`，但
`timestamp without time zone` 缺少时区语义。若仓储随处 `Number(value)` 或拼接 `Z`，就可能
在数据扩大或服务器时区变化时制造隐蔽错误。

最后，数据库错误需要保留结构信息。SQLSTATE `23505` 表示唯一约束冲突，但“邮箱重复”和
“有效预约重复”应映射成不同领域冲突；仅凭 `23505` 返回“邮箱已存在”会误导用户。

## 2. 学习目标

完成本课后，你能够：

1. 用 `$1..$n` 分离 SQL 结构和值，并解释参数不能替代标识符；
2. 用有限映射选择排序列和方向，不接受任意 SQL 片段；
3. 在仓储边界验证整数分、int8、UUID、枚举和时间；
4. 把 UTC 持久化值映射为带 `Z` 的 ISO 8601 字符串；
5. 根据 SQLSTATE、操作和约束名映射可预期冲突；
6. 让未知数据库错误保留 cause 并交给上层统一 500，而不是泄露 detail；
7. 区分内存查询记录器、真实 PostgreSQL 集成测试和 HTTP 行为证据。

## 3. 预备知识

先完成[上一课](01-connections-tls-pools-timeouts.md)，理解 Pool 只负责连接生命周期。本课文件：

```bash
cd market-api-lab
mkdir -p src/db src/listings test
```

真实数据库实验还要求第 3 章迁移已应用。运行前记录：

```bash
node --version
pnpm list pg --depth 0
psql --version
```

不要从驱动错误对象中整段打印 `query`、`parameters`、`detail` 或连接配置。测试数据使用
`example.test`、固定 UUID 和虚构商品，不使用真实账号。

## 4. 核心理论

### 4.1 参数绑定只绑定值

驱动向服务器发送 SQL 文本与参数数组。服务器把 `$1` 解释成表达式中的值，而不是重新解析成
SQL 源码：

```sql
SELECT id FROM listings WHERE title = $1;
```

用户输入 `' OR true --` 仍是一个 title 值。错误写法：

```js
const sql = `SELECT id FROM listings WHERE title = '${input}'`;
```

字符串中的引号进入 SQL 语法，查询结构已由输入控制。

参数不能放在标识符位置：

```sql
-- $1 是一个值，不会变成列标识符
SELECT * FROM listings ORDER BY $1;
```

正确方式是将外部枚举映射为预先写好的片段：

```js
const orderBy = {
  newest: "created_at DESC, id DESC",
  priceLow: "price_cents ASC, id ASC",
};
```

映射的值由源码拥有，参数数组继续只承载数据值。

### 4.2 参数化不等于字面搜索

`ILIKE $1` 能防 SQL 注入，但参数中的 `%` 和 `_` 仍有模式含义。若产品承诺字面搜索，应转义
通配符并声明 `ESCAPE`；这由第 7 章完整处理。本课只证明查询结构不会被输入改变，不把
`ILIKE` 的模糊语义说成精确匹配。

### 4.3 类型映射是应用契约

| PostgreSQL 类型/表达式 | `pg` 常见结果 | 本课契约 |
| --- | --- | --- |
| `integer` | `number` | 验证安全整数与业务范围 |
| `bigint` / `count(*)` | `string` | 局部解析并拒绝超过安全整数 |
| `numeric` | `string` | 根据金额模型显式处理，不全局转 Number |
| `timestamptz` | `Date` | 验证有效后 `toISOString()` |
| `timestamp` | `Date`/受本地时区解释影响 | 业务事件避免无时区列 |
| `uuid` | `string` | 数据库约束格式，应用仍按领域解析 |
| enum/check 后的 text | `string` | 用运行时允许集合收窄 |

全局覆盖 type parser 会影响进程内所有查询。除非所有调用方共享同一精度契约，否则优先在仓储
映射或 SQL 中局部转换。

### 4.4 SQLSTATE 比错误文本稳定

PostgreSQL 错误文本可能随版本、语言和上下文变化，SQLSTATE 是机器判断字段。常见分类：

| SQLSTATE | 含义 | 邻里集市处理 |
| --- | --- | --- |
| `23505` | unique violation | 结合 constraint/操作映射 409 |
| `23503` | foreign key violation | 结合业务查询映射 404/409，不直接泄露表名 |
| `23514` | check violation | 通常是服务端规则或迁移漂移，不能一律说用户输入错 |
| `40001` | serialization failure | 符合条件时有限重试整笔事务 |
| `40P01` | deadlock detected | 有限重试并修复锁顺序 |
| `55P03` | lock not available | 受控冲突或服务繁忙 |
| `57014` | query canceled | 区分语句超时/主动取消 |

SQLSTATE 仍需上下文。约束名是数据库与应用的契约，应稳定命名；未知约束不能猜测业务含义。

### 4.5 对外错误与内部 cause 分离

仓储可抛稳定领域错误：

```text
code: EMAIL_TAKEN
status: 409
public message: 该账号无法注册
cause: 原始数据库错误，仅受控日志/追踪内部使用
```

日志只记录 `requestId`、领域 code、SQLSTATE、约束名和操作名。`detail` 可能包含邮箱、ID 或
参数值，不应默认进入日志。HTTP 层在第 2 章的异常过滤器中统一生成响应。

## 5. 元素、属性、API 或配置清单

| 元素 / API | 作用 | 可观察证据 | 边界 |
| --- | --- | --- | --- |
| `$1..$n` | 值占位符 | SQL 文本固定、values 独立 | 不能替代列名 |
| `{ text, values, name }` | `pg` QueryConfig | 记录结构并可选 prepared name | 动态 SQL 不应复用错误 name |
| `ORDER_BY` map | 选择固定标识符片段 | 未知 key 被拒绝 | 不能把输入拼进值 |
| `result.rows` | 数据库行集合 | 每行经过 mapper | 原始行不是 API DTO |
| `result.rowCount` | 受影响行数 | 判断冲突/不存在 | 某些命令可为 null |
| `Number.isSafeInteger` | JS 精度边界 | 越界值失败 | 不代表业务范围合法 |
| `Date#toISOString()` | UTC ISO 输出 | 以 `Z` 结束 | 先验证 Date 有效 |
| `error.code` | SQLSTATE | 按稳定 code 分类 | 不单独决定业务语义 |
| `error.constraint` | 约束名 | 区分同类冲突 | 不直接返回客户端 |
| `Error.cause` | 保留内部根因 | 上层可追踪 | 普通响应不序列化 |

## 6. 最小可运行案例

本案例使用**内存查询记录器**。它能证明 SQL 文本、参数顺序和行映射，但没有解析 SQL，也没有
连接 PostgreSQL。

### 6.1 查询与类型映射

创建 `src/listings/listing-query.mjs`：

```js
const ORDER_BY = Object.freeze({
  newest: "created_at DESC, id DESC",
  priceLow: "price_cents ASC, id ASC",
});

const STATUSES = new Set(["available", "reserved", "sold"]);

function safeInteger(value, field) {
  const parsed = typeof value === "string" ? Number(value) : value;
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${field} must be a safe integer`);
  }
  return parsed;
}

function utcIso(value, field) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${field} must be a valid timestamptz Date`);
  }
  return value.toISOString();
}

export function mapListingRow(row) {
  const priceCents = safeInteger(row.price_cents, "price_cents");
  const version = safeInteger(row.version, "version");
  if (priceCents < 0) throw new Error("price_cents must be non-negative");
  if (!STATUSES.has(row.status)) throw new Error("invalid listing status");
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceCents,
    ownerId: row.owner_id,
    status: row.status,
    version,
    createdAt: utcIso(row.created_at, "created_at"),
  };
}

export function buildListingQuery({ ownerId, sort = "newest", limit = 20 }) {
  const order = ORDER_BY[sort];
  if (!order) throw new Error("unsupported sort");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("limit must be 1..100");
  }
  return {
    text: `SELECT id, title, description, price_cents, owner_id,
                  status, version, created_at
           FROM listings
           WHERE owner_id = $1
           ORDER BY ${order}
           LIMIT $2`,
    values: [ownerId, limit],
  };
}
```

`ORDER BY` 的插值只来自冻结的源码映射；`ownerId` 和 `limit` 仍作为参数。

### 6.2 内存记录器测试

创建 `test/listing-query.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildListingQuery, mapListingRow } from "../src/listings/listing-query.mjs";

test("keeps hostile owner id in values, not SQL text", () => {
  const hostile = "' OR true --";
  const query = buildListingQuery({ ownerId: hostile, sort: "priceLow", limit: 10 });
  assert.equal(query.text.includes(hostile), false);
  assert.deepEqual(query.values, [hostile, 10]);
  assert.match(query.text, /ORDER BY price_cents ASC, id ASC/);
});

test("rejects an arbitrary sort identifier", () => {
  assert.throws(
    () => buildListingQuery({ ownerId: "u1", sort: "title; DROP TABLE users" }),
    /unsupported sort/,
  );
});

test("maps integer cents and UTC time", () => {
  const listing = mapListingRow({
    id: "10000000-0000-4000-8000-000000000001",
    title: "折叠桌",
    description: "九成新",
    price_cents: 28000,
    owner_id: "00000000-0000-4000-8000-000000000001",
    status: "available",
    version: 1,
    created_at: new Date("2026-10-11T08:00:00.000Z"),
  });
  assert.equal(listing.priceCents, 28000);
  assert.equal(listing.createdAt, "2026-10-11T08:00:00.000Z");
});

test("rejects unsafe integer and invalid Date", () => {
  const base = {
    id: "id",
    title: "台灯",
    description: "正常",
    price_cents: "9007199254740993",
    owner_id: "owner",
    status: "available",
    version: 1,
    created_at: new Date("invalid"),
  };
  assert.throws(() => mapListingRow(base), /safe integer/);
  assert.throws(
    () => mapListingRow({ ...base, price_cents: 1990 }),
    /valid timestamptz/,
  );
});
```

运行：

```bash
node --test test/listing-query.test.mjs
```

预期 4 条测试通过。这里没有 SQL 解析器或数据库，因此只能写“查询对象与映射测试通过”。

### 6.3 从最小案例逐步扩展

1. 先只支持 `newest`，测试 SQL 固定、参数独立。
2. 增加 `priceLow` 服务端映射，未知 key 先红后绿。
3. 增加 `mapListingRow`，固定整数分和 UTC 输出。
4. 增加越界 int8、非法 Date、未知 status 的失败测试。
5. 最后才把 QueryConfig 交给真实 `Pool`/`PoolClient`。

每一步保留一个能判定责任的失败，避免真实连接失败遮住映射错误。

## 7. 邻里集市集成案例

### 7.1 SQLSTATE 领域分类器

创建 `src/db/errors.mjs`：

```js
export class DomainConflict extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = "DomainConflict";
    this.code = code;
    this.status = 409;
  }
}

export function translateDatabaseError(error, context) {
  if (!error || typeof error !== "object") return error;

  if (
    error.code === "23505" &&
    context.operation === "register" &&
    error.constraint === "users_email_unique"
  ) {
    return new DomainConflict("ACCOUNT_UNAVAILABLE", "无法创建该账号", error);
  }

  if (
    error.code === "23505" &&
    context.operation === "reserve" &&
    error.constraint === "reservations_one_active_per_listing_idx"
  ) {
    return new DomainConflict(
      "RESERVATION_CONFLICT",
      "商品已被预约",
      error,
    );
  }

  return error;
}
```

客户端得到稳定领域 code；原始 `detail` 不进入 message。登录防枚举将在第 6 章处理，注册也可按
产品策略统一为不暴露账号状态的响应。

创建 `test/db-errors.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { translateDatabaseError } from "../src/db/errors.mjs";

test("uses operation and constraint with SQLSTATE", () => {
  const source = {
    code: "23505",
    constraint: "reservations_one_active_per_listing_idx",
    detail: "sensitive row detail",
  };
  const mapped = translateDatabaseError(source, { operation: "reserve" });
  assert.equal(mapped.code, "RESERVATION_CONFLICT");
  assert.equal(mapped.message, "商品已被预约");
  assert.equal(mapped.message.includes(source.detail), false);
  assert.equal(mapped.cause, source);
});

test("does not guess unknown unique violations", () => {
  const source = { code: "23505", constraint: "unknown_unique" };
  assert.equal(
    translateDatabaseError(source, { operation: "register" }),
    source,
  );
});
```

运行：

```bash
node --test test/listing-query.test.mjs test/db-errors.test.mjs
```

预期累计 6 条测试通过。

### 7.2 真实仓储查询

在下一课的仓储中执行：

```js
const query = buildListingQuery(input);
const result = await db.query(query);
return result.rows.map(mapListingRow);
```

真实 PostgreSQL 18 集成测试的前置证据：

```sql
SELECT current_setting('server_version') AS server_version,
       current_setting('server_version_num')::integer AS server_version_num,
       current_database() AS database;
SELECT name, checksum, applied_at
FROM schema_migrations
ORDER BY applied_at, name;
```

测试至少插入价格 `0` 和 `28000` 的虚构商品，并断言输出分别仍为整数 `0`、`28000`，时间以
`Z` 结束。攻击字符串只作为 ownerId 参数，预期返回空行或 UUID 类型错误，绝不能改变结构。
实际结果由读者运行后记录；本教材不提供一段虚构“已通过”日志。

## 8. 常见错误与排查路径

### 明确错误：字符串拼 SQL

```js
const sql = `SELECT * FROM listings WHERE title = '${q}'`;
```

| 五段 | 记录 |
| --- | --- |
| 现象 | 引号、注释符或分号改变查询结果/语法 |
| 证据 | 查询文本本身包含原始输入，values 数组为空 |
| 原因 | 数据值被当成 SQL 源码拼接 |
| 修复 | 改为 `WHERE title = $1` 和 `[q]` |
| 复验 | hostile input 不在 text 中，只在 values[0]；真实库返回业务匹配而非整表 |

### 把 `ORDER BY $1` 当动态列

现象是排序没有按预期字段发生，或所有行按同一个常量排序。参数代表值，不代表列。修复为服务端
允许映射，并为每个选项断言实际行顺序。

### 全局把 int8 转成 Number

现象是较大 bigint 静默失真。证据是转换后的值不再能往返原字符串。修复为局部解析、检查
`Number.isSafeInteger`，或让 API 契约使用十进制字符串。不要为课程小数据假设未来永不越界。

### 时间后面手工拼 `Z`

无时区 timestamp `"2026-10-11 08:00:00"` 拼 `Z` 相当于擅自声明它原本是 UTC。修复数据库列
为 `timestamptz`，写入 UTC 事实，并对驱动返回的有效 Date 调用 `toISOString()`。

### 仅按 `23505` 猜业务

现象是预约冲突被显示为“邮箱已注册”。证据是 SQLSTATE 相同但 constraint/operation 不同。修复
上下文映射；未知约束保留原错误，由统一异常边界作为 500 处理并报警。

## 9. 课后题

**问题 1：参数化查询能防止对象越权吗？**

参考答案：不能。它只保护 SQL 结构；合法参数仍可能指定他人对象。身份必须来自会话，服务端还要
执行对象所有权和角色策略。

**问题 2：为什么 count(*) 常不直接是 number？**

参考答案：结果类型为 PostgreSQL bigint，可能超出 JavaScript 安全整数；驱动保留字符串避免
静默精度丢失。应用只能在已证明范围内局部转换。

**问题 3：可以把数据库 `detail` 直接返回以方便前端吗？**

参考答案：不可以。detail 可能泄漏表、约束、邮箱、ID 或输入值。对外使用稳定领域 code 与恢复
文案，内部仅在受控、脱敏日志中记录必要字段。

**问题 4：`LIKE $1` 是否会把 `%` 当普通字符？**

参考答案：不会。参数化阻止结构注入，但 `%`/`_` 仍按 LIKE 模式解释；字面搜索需要单独转义。

## 10. 实践练习

### 基础：增加金额上界

把邻里集市单件价格上界设为一个产品明确值，例如 `100_000_000` 分。可判定标准：边界值通过，
边界加 1 失败，错误包含字段名但不包含整行数据；`0` 仍合法。

### 进阶：实现收藏幂等查询

使用固定 SQL：

```sql
INSERT INTO favorites(user_id, listing_id)
VALUES ($1, $2)
ON CONFLICT (user_id, listing_id) DO NOTHING;
```

可判定标准：两个 ID 都在 values；SQL 不含原值；根据 `rowCount` 区分“本次创建”和“原已存在”，
但两种都返回目标收藏状态；`user_id` 来自会话而非 body。

### 故障注入：错误约束映射

临时让任意 `23505` 都返回 `ACCOUNT_UNAVAILABLE`。构造
`reservations_one_active_per_listing_idx` 错误后，测试应先失败；恢复 operation + constraint
判断后转绿。
记录现象、证据、原因、修复、复验，不修改断言迁就错误实现。

## 11. 阶段验收

- [ ] 用户输入不出现在 SQL text，只出现在 values。
- [ ] 排序标识符来自有限服务端映射，未知选项明确失败。
- [ ] 能解释参数化与 LIKE 字面转义的区别。
- [ ] priceCents 为非负安全整数，`0` 不被误判为空。
- [ ] UTC 时间来自 `timestamptz` 语义并输出 ISO 8601 `Z`。
- [ ] bigint/numeric 没有未经边界检查的全局 Number 转换。
- [ ] SQLSTATE 映射同时使用操作和稳定约束名。
- [ ] 未知数据库错误没有被错误归类或泄漏 detail。
- [ ] 内存记录器与真实 PostgreSQL 证据被明确区分。
- [ ] 真实集成声明包含 PostgreSQL 18、连接目标和迁移状态。

## 12. 常见问题

**使用 ORM 就不需要这些映射了吗？**

仍然需要。ORM 也有参数、标识符、驱动类型、事务和数据库错误边界，只是生成 SQL 的位置不同。
应检查 ORM 实际 SQL 与错误契约，而不是假设抽象自动安全。

**可以给每条查询都命名为 prepared statement 吗？**

可以有选择地使用，但同名必须始终对应同一 SQL 结构。动态结构错误复用名称会产生冲突；先以
正确参数化为目标，再用测量结果决定是否命名和缓存。

**UUID 参数收到攻击字符串时为什么可能是数据库类型错误？**

因为列/参数推断为 uuid，非法文本无法转换。这仍证明它是值而不是 SQL 结构；HTTP 层应在发出
查询前完成 UUID 输入校验，返回稳定 400。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [node-postgres：查询与参数](https://node-postgres.com/features/queries)
- [node-postgres：数据类型](https://node-postgres.com/features/types)
- [PostgreSQL 18：值表达式](https://www.postgresql.org/docs/18/sql-expressions.html)
- [PostgreSQL 18：数据类型](https://www.postgresql.org/docs/18/datatype.html)
- [PostgreSQL 18：日期与时间类型](https://www.postgresql.org/docs/18/datatype-datetime.html)
- [PostgreSQL 18：错误码附录](https://www.postgresql.org/docs/18/errcodes-appendix.html)

## 我现在能做到什么

我能把外部值与 SQL 结构分开，用服务端映射控制标识符，把 PostgreSQL 行可靠地转换为整数分和
UTC API 契约，并依据 SQLSTATE、操作和约束名生成不泄密的领域错误。

## 单元导航

[本章入口](../04-postgres-data-access.md) ·
[上一课：连接、TLS、连接池与超时](01-connections-tls-pools-timeouts.md) ·
[下一课：仓储契约与连接所有权](03-repositories-connection-ownership.md)
