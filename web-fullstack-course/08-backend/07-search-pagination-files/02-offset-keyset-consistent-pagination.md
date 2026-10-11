# Offset、Keyset 与一致分页：用稳定全序定义下一页

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个版本化 Base64URL 游标编解码器、Offset/Keyset 漂移实验、Keyset SQL 契约 |
| 练习位置 | 读者自己的 `market-backend-lab/pagination/` |
| 运行条件 | Node.js 24；真实 SQL 复验另需 PostgreSQL 18 测试库 |
| 核心命令 | `node --test pagination/cursor.test.mjs pagination/drift.test.mjs` |
| 成功证据 | 游标绑定 `newest` 排序，UTC 与 UUID 被验证；并发头部插入不让 Keyset 重复上一页 |
| 失败证据 | 非法编码、未知版本、错误排序、非 UTC、非 UUID 和超大 limit 被拒绝 |
| 环境标签 | 漂移案例是 **STATIC/IN-MEMORY**；不是 PostgreSQL 隔离级别证据 |

## 1. 任务背景

邻里集市最初只有几十件商品，`LIMIT 20 OFFSET 20` 足够直观。数据增长后出现两个问题：

1. 深页需要数据库先定位或扫描并跳过大量行，成本随 Offset 增长；
2. 用户读取第一页后有人在头部发布新商品，第二页的 Offset 整体后移，上一页末尾可能再次出现。

Keyset 分页不问“跳过多少行”，而问“在上次最后一条之后有哪些行”。它依赖稳定全序和一个
经过验证的锚点。它适合继续加载，不天然提供第 173 页跳转和精确总页数，也不自动建立跨请求
数据库快照。

## 2. 学习目标

完成本课后，你能够：

1. 解释 Offset 分页的适用场景、成本和并发漂移；
2. 用 `(created_at, id)` 定义唯一的降序全序；
3. 为 Keyset 写出与排序方向一致的行值比较；
4. 设计版本化、有限长度、可验证的游标负载；
5. 区分 Base64URL 编码、消息签名和加密；
6. 使用 `limit + 1` 判断是否存在下一页；
7. 说明插入、删除和排序键更新对 Keyset 的不同影响。

## 3. 预备知识

- 已完成[安全搜索与动态查询](01-safe-search-dynamic-queries.md)；
- 理解 PostgreSQL 的 `ORDER BY`、`LIMIT`、行值比较和参数化；
- Listing 的 `createdAt` 是规范 UTC ISO 8601，`id` 在本课使用 UUID；
- 商品价格仍使用整数分，但本课游标不把格式化价格作为隐式排序键。

创建个人练习目录：

```bash
mkdir -p pagination
node --version
```

本课不修改现有 `GET /api/v1/listings?page=...` 契约，而是新增显式扩展
`GET /api/v1/listing-feed?after=...&limit=20`。两种响应不能用同一个 DTO 假装等价。

## 4. 核心理论

### 4.1 Offset 的语义与成本

Offset 接口适合页码导航和精确总数界面：

```sql
SELECT id, title, created_at
FROM listings
WHERE status = 'available'
ORDER BY created_at DESC, id DESC
LIMIT $1 OFFSET $2;
```

即使有合适索引，数据库仍需越过 Offset 前的项目。更重要的是 Offset 是相对于“当前结果集”的
位置：两次请求之间插入或删除，位置就会变化。Repeatable Read 可以让**同一请求内**的 items
和 count 使用同一快照，但普通 HTTP 翻页的下一次请求仍会得到新快照。

### 4.2 Keyset 的锚点必须覆盖完整排序

按 `created_at DESC, id DESC` 排序时，下一页条件是：

```sql
WHERE (created_at, id) < ($1::timestamptz, $2::uuid)
ORDER BY created_at DESC, id DESC
```

只把 `created_at` 放进游标会漏掉与末项同时间、但 `id` 更小的行。排序和比较必须使用相同列、
相同优先级和相容方向。混合方向排序可以实现，但不能机械套一个元组 `<`，应逐项推导条件。

### 4.3 `limit + 1` 比猜测总数更直接

数据库读取 `limit + 1` 行：

1. 如果行数不超过 limit，返回全部且 `nextCursor = null`；
2. 如果多出一行，只返回前 limit 行；
3. 以**返回给客户端的最后一行**生成 nextCursor。

不要用那条额外探测行生成游标，否则会永久跳过它。Keyset feed 通常不返回精确 total；若产品
需要 total，应单独定义成本、一致性和更新频率。

### 4.4 游标是协议输入，不是可信对象

本课游标负载：

```json
{
  "v": 1,
  "sort": "newest",
  "createdAt": "2026-10-11T08:00:00.000Z",
  "id": "10000000-0000-4000-8000-000000000001"
}
```

Base64URL 让它适合查询参数，不提供保密或防篡改。服务端仍需限制编码长度、验证字符集、JSON
对象、字段集合、版本、排序、规范 UTC 和 UUID。即使攻击者修改一个合法锚点，也只能在已授权
查询范围内改变起点；授权条件必须独立放在 SQL 中，不能编码在游标后就省略。

若业务需要防止客户端篡改，可对规范负载使用服务端 HMAC 并做密钥轮换；签名仍不保密。需要
隐藏内容时才考虑经过审查的加密方案，不自创密码协议。

### 4.5 Keyset 的“一致”有边界

对于不可变 `created_at` 和唯一 `id`：

- 头部新插入不会挤动锚点之后的旧行；继续翻页不会因此重复上一页；
- 锚点之后的行被删除，下一页会变短，但不会凭空补回已删除数据；
- 新增一条比锚点更旧的回填数据，可能出现在后续页；
- 若排序字段可更新，记录可能越过锚点，造成重复或遗漏；
- 权限或状态变化会改变可见集合，Keyset 也不能冻结它。

需要完整不变快照时，应设计导出任务、快照标识或受控长查询；不能让用户跨分钟持有数据库长
事务。

### 4.6 索引必须匹配筛选与排序

公共可售 feed 的候选索引：

```sql
CREATE INDEX listings_available_feed_idx
  ON listings (created_at DESC, id DESC)
  WHERE status = 'available';
```

是否使用部分索引取决于真实查询条件和数据分布。新增筛选如 owner、价格或文本后，索引设计要
重新基于计划，而不是为每种排列创建一个组合索引。

## 5. 元素、属性、API 或配置清单

| 项目 | 用法 | 边界 |
| --- | --- | --- |
| `LIMIT ... OFFSET ...` | 页码接口 | 深页成本与并发位置漂移 |
| `ORDER BY created_at DESC, id DESC` | 定义稳定全序 | 两列都必须进入游标 |
| 行值比较 `<` | 降序 feed 的下一页 | 混合方向不能直接照搬 |
| `Buffer.from(...).toString("base64url")` | URL 安全编码 | 不是签名或加密 |
| 游标 `v` | 协议演进 | 未知版本必须拒绝 |
| 游标 `sort` | 防止锚点跨排序复用 | 不能替代服务端白名单 |
| 规范 UTC | 精确、可比较的时间锚点 | 需要验证真实日历日期 |
| UUID | 唯一 tie-breaker | 必须与数据库列类型一致 |
| `limit + 1` | 判断 has-more | 返回时移除探测行 |
| `nextCursor: null` | 明确结束 | 不用空字符串混淆非法输入 |

## 6. 最小可运行案例

### 6.1 创建游标编解码器

创建完整文件 `pagination/cursor.mjs`：

```js
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UTC =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function canonicalUtc(value) {
  if (typeof value !== "string" || !UTC.test(value)) {
    throw new Error("cursor.createdAt: expected canonical UTC ISO");
  }
  const time = Date.parse(value);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value) {
    throw new Error("cursor.createdAt: invalid calendar time");
  }
  return value;
}

function cursorObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("cursor: expected object");
  }
  const keys = Object.keys(value).sort();
  if (keys.join(",") !== "createdAt,id,sort,v") {
    throw new Error("cursor: unexpected fields");
  }
  if (value.v !== 1) throw new Error("cursor.v: unsupported version");
  if (value.sort !== "newest") throw new Error("cursor.sort: mismatch");
  if (typeof value.id !== "string" || !UUID.test(value.id)) {
    throw new Error("cursor.id: expected UUID");
  }
  return {
    v: 1,
    sort: "newest",
    createdAt: canonicalUtc(value.createdAt),
    id: value.id.toLowerCase(),
  };
}

export function encodeCursor(item) {
  const payload = cursorObject({
    v: 1,
    sort: "newest",
    createdAt: item.createdAt,
    id: item.id,
  });
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(encoded) {
  if (
    typeof encoded !== "string" ||
    encoded.length < 1 ||
    encoded.length > 512 ||
    !BASE64URL.test(encoded)
  ) {
    throw new Error("cursor: invalid base64url envelope");
  }
  let value;
  try {
    value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new Error("cursor: invalid JSON");
  }
  return cursorObject(value);
}
```

固定字段集合可以防止客户端悄悄携带未实现参数。512 字符上限在 JSON 解析前拒绝异常大输入。

### 6.2 创建游标测试

创建完整文件 `pagination/cursor.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { decodeCursor, encodeCursor } from "./cursor.mjs";

const anchor = {
  createdAt: "2026-10-11T08:00:00.000Z",
  id: "10000000-0000-4000-8000-000000000001",
};

test("round-trips the complete newest-order anchor", () => {
  const encoded = encodeCursor(anchor);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeCursor(encoded), {
    v: 1,
    sort: "newest",
    ...anchor,
  });
});

test("rejects malformed envelopes and unsupported payloads", () => {
  assert.throws(() => decodeCursor("not+base64"), /envelope/);
  assert.throws(() => decodeCursor("a".repeat(513)), /envelope/);

  const wrongSort = Buffer.from(
    JSON.stringify({ v: 1, sort: "price", ...anchor }),
  ).toString("base64url");
  assert.throws(() => decodeCursor(wrongSort), /sort/);

  const badDate = Buffer.from(
    JSON.stringify({ v: 1, sort: "newest", ...anchor, createdAt: "2026-02-30T08:00:00.000Z" }),
  ).toString("base64url");
  assert.throws(() => decodeCursor(badDate), /calendar/);
});
```

运行：

```bash
node --test pagination/cursor.test.mjs
```

预期 2 条测试通过。游标每次编码应可解码成相同规范对象；测试没有声称负载被保密或签名。

### 6.3 观察 Offset 漂移

创建完整文件 `pagination/drift.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";

const initial = [
  ["a", "2026-10-11T10:00:00.000Z"],
  ["b", "2026-10-11T09:00:00.000Z"],
  ["c", "2026-10-11T08:00:00.000Z"],
  ["d", "2026-10-11T07:00:00.000Z"],
];

test("head insertion shifts offset but not the keyset anchor", () => {
  const firstPage = initial.slice(0, 2);
  assert.deepEqual(firstPage.map(([id]) => id), ["a", "b"]);

  const changed = [["new", "2026-10-11T11:00:00.000Z"], ...initial];
  const offsetPage2 = changed.slice(2, 4);
  assert.deepEqual(offsetPage2.map(([id]) => id), ["b", "c"]);

  const [, anchorTime] = firstPage.at(-1);
  const keysetPage2 = changed
    .filter(([, createdAt]) => createdAt < anchorTime)
    .slice(0, 2);
  assert.deepEqual(keysetPage2.map(([id]) => id), ["c", "d"]);
});
```

运行：

```bash
node --test pagination/drift.test.mjs
```

预期测试通过，并明确显示 Offset 第二页重复 `b`，Keyset 从锚点 `b` 之后得到 `c,d`。该内存
数组每个时间都不同，只用于观察头部插入；真实 SQL 还必须加入 id tie-breaker。

## 7. 邻里集市集成案例

### 7.1 定义独立 feed 契约

请求：

```http
GET /api/v1/listing-feed?limit=20&after=BASE64URL_CURSOR
```

响应：

```json
{
  "items": [
    {
      "id": "10000000-0000-4000-8000-000000000001",
      "title": "二手台灯",
      "priceCents": 1990,
      "createdAt": "2026-10-11T08:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

金额仍是整数分，时间仍是 UTC ISO。`after` 缺失表示第一页；空字符串和非法字符串返回稳定
`400 VALIDATION`。响应没有 `page`、`pageSize` 或伪造 total。

### 7.2 编译 PostgreSQL Keyset 查询

以下是仓储增量片段，真实调用仍需参数化和行解析：

```ts
type FeedInput = { limit: number; after?: string };

function buildFeedQuery(input: FeedInput) {
  if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 100) {
    throw new Error("limit: expected integer 1..100");
  }

  const cursor = input.after ? decodeCursor(input.after) : undefined;
  const values: unknown[] = [];
  const where = ["l.status = 'available'"];

  if (cursor) {
    values.push(cursor.createdAt, cursor.id);
    where.push("(l.created_at, l.id) < ($1::timestamptz, $2::uuid)");
  }

  values.push(input.limit + 1);
  const limitPlaceholder = `$${values.length}`;
  return {
    text: `
      SELECT l.id, l.title, l.price_cents, l.created_at
      FROM listings AS l
      WHERE ${where.join(" AND ")}
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ${limitPlaceholder}
    `,
    values,
  };
}
```

仓储取得 rows 后：

```ts
const hasMore = rows.length > input.limit;
const items = hasMore ? rows.slice(0, input.limit) : rows;
const last = items.at(-1);
return {
  items,
  nextCursor: hasMore && last
    ? encodeCursor({ id: last.id, createdAt: last.createdAt })
    : null,
};
```

游标必须来自 `items.at(-1)`，不能来自被移除的额外行。对象授权、租户和可见状态条件始终在
SQL 中；客户端不能通过构造 cursor 越过它们。

### 7.3 真实 PostgreSQL 复验手册

在隔离 PostgreSQL 18 测试库记录版本、目标和迁移后，插入至少三行具有相同 `created_at` 但
不同 UUID 的测试数据，再执行两页查询。合格证据：

1. 第一页按 `created_at DESC, id DESC` 返回；
2. 第二页条件同时带时间和 ID；
3. 合并两页没有重复，三个同时间项目没有遗漏；
4. `EXPLAIN (ANALYZE, BUFFERS)` 的实际输出与数据量一起保存。

没有服务时，记录连接命令和原始失败，不把内存实验写成 PostgreSQL 已通过。

## 8. 常见错误与排查路径

### 8.1 明确错误示例：游标只有时间

```json
{ "v": 1, "createdAt": "2026-10-11T08:00:00.000Z" }
```

- **现象**：一页恰好结束在某时间中间，同时间剩余商品永久缺失。
- **证据**：测试库放入 3 个相同时间、limit=2 的项目；第二页用 `created_at < $1` 返回 0 个同组项目。
- **原因**：游标没有保存完整排序位置。
- **修复**：把唯一 `id` 加入排序、游标和行值比较。
- **复验**：第一页 2 条、第二页 1 条，合并后 ID 唯一且全集相等。

### 8.2 降序排序却使用 `>`

- **现象**：第二页回到更新的记录，或重复第一页。
- **证据**：打印参数与 SQL，发现 `ORDER BY ... DESC` 配合 `WHERE (...) > (...)`。
- **原因**：比较方向与遍历方向相反。
- **修复**：降序“之后”使用 `<`；增加固定夹具测试。
- **复验**：合并页顺序严格递减，没有上一页 ID。

### 8.3 Base64 解码成功就信任对象

- **现象**：未知版本或异常长 JSON 进入查询，导致 500 或额外成本。
- **证据**：错误输入通过解码，但字段、长度和类型没有检查。
- **原因**：把编码误当成验证。
- **修复**：解析前限制 envelope，解析后验证精确字段、版本、排序和值域。
- **复验**：六类非法游标稳定返回 400，日志不记录完整游标内容。

### 8.4 排序字段可更新

- **现象**：商品改价后在 price feed 重复或漏掉。
- **证据**：两页之间更新价格，记录越过锚点。
- **原因**：Keyset 依赖排序键相对稳定。
- **修复**：产品接受弱一致、固定快照，或选择不可变排序键；在契约中说明。
- **复验**：按选定策略运行确定性更新场景，不把“newest 正常”外推到 price 排序。

## 9. 课后题

1. **为什么 Offset 仍然有价值？**
   答案：页码跳转、后台小数据集和需要精确总页数的界面更直接；应根据成本和一致性要求选择。
2. **为什么 `created_at` 后还要 `id`？**
   答案：时间可能相同，唯一 ID 把偏序补成全序，并准确定位同时间组内位置。
3. **Base64URL 能防止用户修改 cursor 吗？**
   答案：不能，它只是编码；防篡改需服务端验证，必要时增加 HMAC。
4. **Keyset 能保证用户翻页期间看到固定快照吗？**
   答案：不能。它减少位置漂移，但每次 HTTP 请求通常仍使用新数据库快照。

## 10. 实践练习

### 基础：补齐非法游标

增加未知 `v=2`、非法 UUID、额外字段和非规范 UTC 四个测试。可判定标准：每种输入抛出可分类
错误，合法 round-trip 不受影响。

### 进阶：设计 `price_asc` 游标

游标包含 `priceCents` 与 `id`，SQL 使用 `(price_cents, id) > (...)` 和同方向升序。可判定
标准：金额是非负安全整数分，同价三件商品跨页不遗漏，不能复用 newest cursor。

### 故障注入：错误地用探测行生成 cursor

临时以 `rows.at(-1)`（第 `limit+1` 行）生成 nextCursor。测试应发现该行从后续页消失。恢复为
返回 items 的最后一行后，全集断言转绿。

## 11. 阶段验收

- [ ] 游标含版本、排序、规范 UTC 和 UUID，且有 envelope 长度上限；
- [ ] Base64URL 被明确标注为编码，不是签名或加密；
- [ ] Offset 头部插入重复和 Keyset 锚点行为均有可观察测试；
- [ ] SQL 的排序列、方向和比较条件一致；
- [ ] `limit + 1` 的额外行不进入响应，也不被错误用作 cursor；
- [ ] 插入、删除、排序键更新和权限变化的边界均能解释；
- [ ] 真实 PostgreSQL 未运行时没有声称索引或查询通过。

## 12. 常见问题

**游标可以直接放数据库主键吗？**
只有主键本身就是完整公开排序时才可以。按时间排序时只放 ID 无法表达时间位置。

**是否必须给 cursor 加 HMAC？**
不是所有公共 feed 都需要。无签名时仍必须严格验证，并确保 cursor 不能改变授权范围。若业务
依赖“客户端不能修改某字段”，就需要签名或服务端状态。

**为什么不在 cursor 里放用户 ID？**
授权应从当前会话和服务端数据重新判断。把 userId 编码进去既可能泄露，也不能替代认证。

**怎样支持上一页？**
需要反转比较和排序、取回后再恢复展示顺序，或维护双向游标。它是新契约，应单独测试边界，
不能简单重用 after。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [PostgreSQL 18：LIMIT and OFFSET](https://www.postgresql.org/docs/18/queries-limit.html)
- [PostgreSQL 18：Row Constructor Comparison](https://www.postgresql.org/docs/18/functions-comparisons.html#ROW-WISE-COMPARISON)
- [PostgreSQL 18：Index Ordering](https://www.postgresql.org/docs/18/indexes-ordering.html)
- [Node.js Buffer：Base64URL encoding](https://nodejs.org/api/buffer.html)
- [RFC 4648：Base 64 Encoding with URL and Filename Safe Alphabet](https://www.rfc-editor.org/rfc/rfc4648)

## 我现在能做到什么

我能根据页面需求选择 Offset 或 Keyset，用完整稳定排序设计可验证游标和 SQL，并准确说明
Keyset 在并发变化下改善了什么、没有保证什么。

## 单元导航

- 章节目录：[07 搜索、分页与文件](../README.md#07-搜索分页与文件)
- 上一课：[安全搜索与动态查询](01-safe-search-dynamic-queries.md)
- 下一课：[上传流、类型、存储与清理](03-upload-streams-type-storage-cleanup.md)
