# JSON、序列化与数据边界

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 把外部 JSON 从 unknown 形状解析为完整 Listing 分页，并保留精确失败路径 |
| 可观察产出 | `js-lab/json-serialization.mjs`、`js-lab/json-boundary.mjs` |
| 运行条件 | Node.js 24 LTS；无第三方依赖 |
| 建议时间 | 150 分钟 |
| 完成证据 | 合法完整页、null/数组/坏金额/坏 UTC/矛盾分页/坏 JSON |

## 1. 任务背景

JSON 是文本格式，不是“已经符合 TypeScript 类型的对象”。`JSON.parse("null")`、
`JSON.parse("[]")` 和字符串价格都可能语法成功，却不能进入 Listing 业务。
可靠入口要先区分 JSON 语法失败，再检查记录外形、必要自有字段、类型、值域和跨字段关系。

解析器应按已知字段创建新对象，而不是把外部对象整体展开进业务状态。
这样既能忽略未约定字段，也能避免把 `__proto__` 等外部键传播到内部对象。

## 2. 学习目标

完成本课后，你应能：

- 区分 JSON 文本与 JavaScript 值；
- 解释 `JSON.stringify` 对 undefined、函数、数组空位和时间的损失边界；
- 在业务解析前排除 `null` 与数组；
- 用 `Object.hasOwn` 要求必要自有字段；
- 按已知字段重建完整 Listing；
- 验证非负安全整数分；
- 验证 UTC `Z` 格式并执行日历往返；
- 校验 `{ items, page, pageSize, total }` 的自洽关系；
- 区分完整 Listing、算法投影和未经验证的外部 API 响应；
- 为 malformed JSON 和 malformed record 保留不同证据。

## 3. 预备知识

先完成前两篇，理解对象引用、数组分页和不可变更新。外部边界代码会使用第 2 章的
错误传播原则：失败保持失败，不将缺失价格补成 0，不将未知状态补成 available。

## 4. 核心理论

### 4.1 JSON 只定义可传输语法

JSON 支持对象、数组、字符串、有限 number、boolean 和 null。它不支持函数、undefined、
symbol 或 bigint。JSON 对象键必须是双引号字符串，时间没有专用类型，只能以 string 传输。

```text
响应字节 → JSON 文本语法 → JavaScript unknown 值 → 运行时解析器 → 可信领域记录
```

每个箭头都可能失败。HTTP 200 只说明协议状态，JSON.parse 成功只说明文本语法，
都不证明 Listing 字段有效。

### 4.2 stringify 的损失边界

对象属性中的 undefined、函数和 symbol 会被省略；数组中的 undefined、函数和空位会变成 null。
`Date` 默认序列化为字符串，解析后不会自动恢复 Date。`JSON.stringify(1n)` 会抛 TypeError。
因此 JSON 往返不是通用深复制，也不能保存完整运行时语义。

### 4.3 记录检查顺序

稳定顺序是：

1. 排除非 object、`null` 和数组；
2. 要求必要自有字段；
3. 检查每个字段类型和值域；
4. 检查 UTC 格式及真实日历日期；
5. 检查页内数量、offset、total 和重复 id；
6. 仅返回按已知字段构造的新对象。

顺序使错误路径精确，例如 `page.items[0].priceCents`，而不是笼统“数据错误”。

### 4.4 UTC 不能只看 Date.parse

课程持久化格式接受 `YYYY-MM-DDTHH:mm:ssZ` 或带三位毫秒的 UTC `Z` 字符串，
并标准化为三位毫秒。Date.parse 可能规范化不存在的日期，
所以还要把结果 `toISOString()` 与规范输入比较，拒绝 2 月 30 日。
界面显示时才按用户时区本地化；持久化值不改成本地时间文字。

### 4.5 三种形状不能混用

| 形状 | 内容 | 信任状态 |
| --- | --- | --- |
| 外部 API 响应 | 任意 JSON 值，声称含 page 和 items | unknown，必须解析 |
| 完整 Listing | 共同契约全部 8 个字段 | 通过当前运行时解析器 |
| 算法投影 | 如 `{ id, title, priceCents }` | 从可信 Listing 明确派生，不冒充 API DTO |

算法函数可以只接收投影，但网络入口不能因为算法只用三个字段就悄悄丢失完整契约检查。

## 5. 语法、标准 API 与运行时边界清单

| API 或规则 | 作用 | 边界 |
| --- | --- | --- |
| `JSON.parse(text)` | JSON 文本转 JS 值 | 结果仍是 unknown |
| `JSON.stringify(value)` | JS 值转 JSON 文本 | 存在省略、null 化和异常 |
| `typeof value === "object"` | 对象粗检查 | 必须排除 null |
| `Array.isArray(value)` | 区分数组 | 数组也是 object |
| `Object.hasOwn(record, key)` | 要求自有字段 | 存在不代表值合法 |
| `Number.isSafeInteger` | 校验整数分和分页 | 仍检查最小值 |
| `Date.parse` | 解析时间 | 必须配合格式和往返 |
| `Date.prototype.toISOString` | 标准 UTC 输出 | 显示本地化另行处理 |
| `new Set(ids)` | 检查页内重复 id | 不证明跨页唯一 |
| 已知字段映射 | 隔离额外键 | 不直接展开外部对象 |

## 6. 最小可运行案例

创建完整文件 `js-lab/json-serialization.mjs`：

```js
const source = {
  id: "listing-1",
  priceCents: 0,
  createdAt: "2026-10-11T08:00:00.000Z",
  omitted: undefined,
  action() {
    return "not serializable";
  },
  values: [undefined, null],
};

const text = JSON.stringify(source);
const parsed = JSON.parse(text);

console.log(text);
console.log(typeof parsed.createdAt);
console.log(Object.hasOwn(parsed, "omitted"));
console.log(parsed.values[0] === null && parsed.values[1] === null);
```

运行 `node json-serialization.mjs`，预期输出：

```text
{"id":"listing-1","priceCents":0,"createdAt":"2026-10-11T08:00:00.000Z","values":[null,null]}
string
false
true
```

`createdAt` 仍是 string，undefined 属性和函数被省略，数组中的 undefined 变成 null。
这些变化证明 JSON 往返不适合作为无差别复制工具。

## 7. 邻里集市集成案例

创建完整文件 `js-lab/json-boundary.mjs`：

```js
function parseJson(text) {
  if (typeof text !== "string") throw new TypeError("JSON input must be text");
  try {
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("invalid JSON syntax");
    throw error;
  }
}

function record(value, path) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${path}: expected object`);
  }
  return value;
}

function field(source, key, path) {
  if (!Object.hasOwn(source, key)) throw new TypeError(`${path}: missing`);
  return source[key];
}

function text(value, path, allowEmpty = false) {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    throw new TypeError(`${path}: expected text`);
  }
  return value;
}

function integer(value, path, minimum) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum
  ) {
    throw new RangeError(
      `${path}: expected ${minimum === 0 ? "non-negative" : "positive"} safe integer`,
    );
  }
  return value;
}

function listingStatus(value, path) {
  if (value !== "available" && value !== "reserved" && value !== "sold") {
    throw new RangeError(`${path}: invalid listing status`);
  }
  return value;
}

function utcTime(value, path) {
  const input = text(value, path);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(input)) {
    throw new RangeError(`${path}: expected ISO UTC timestamp`);
  }
  const timestamp = Date.parse(input);
  if (!Number.isFinite(timestamp)) {
    throw new RangeError(`${path}: invalid date`);
  }
  const normalized = new Date(timestamp).toISOString();
  const canonicalInput = input.includes(".")
    ? input
    : input.replace("Z", ".000Z");
  if (normalized !== canonicalInput) {
    throw new RangeError(`${path}: invalid calendar date`);
  }
  return normalized;
}

function parseListing(value, path) {
  const source = record(value, path);
  return {
    id: text(field(source, "id", `${path}.id`), `${path}.id`),
    title: text(field(source, "title", `${path}.title`), `${path}.title`),
    description: text(
      field(source, "description", `${path}.description`),
      `${path}.description`,
      true,
    ),
    priceCents: integer(
      field(source, "priceCents", `${path}.priceCents`),
      `${path}.priceCents`,
      0,
    ),
    status: listingStatus(
      field(source, "status", `${path}.status`),
      `${path}.status`,
    ),
    ownerId: text(
      field(source, "ownerId", `${path}.ownerId`),
      `${path}.ownerId`,
    ),
    version: integer(
      field(source, "version", `${path}.version`),
      `${path}.version`,
      1,
    ),
    createdAt: utcTime(
      field(source, "createdAt", `${path}.createdAt`),
      `${path}.createdAt`,
    ),
  };
}

function parseListingPage(textInput) {
  const source = record(parseJson(textInput), "page");
  const page = integer(field(source, "page", "page.page"), "page.page", 1);
  const pageSize = integer(
    field(source, "pageSize", "page.pageSize"),
    "page.pageSize",
    1,
  );
  if (pageSize > 100) throw new RangeError("page.pageSize: exceeds 100");
  const total = integer(field(source, "total", "page.total"), "page.total", 0);
  const rawItems = field(source, "items", "page.items");
  if (!Array.isArray(rawItems)) throw new TypeError("page.items: expected array");

  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) throw new RangeError("page: offset overflow");
  const remaining = Math.max(0, total - offset);
  const expectedItemCount = Math.min(pageSize, remaining);
  if (rawItems.length !== expectedItemCount) {
    throw new RangeError("page.items: count contradicts page metadata");
  }

  const items = rawItems.map((item, index) =>
    parseListing(item, `page.items[${index}]`),
  );
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new RangeError("page.items: duplicate listing id");
  }
  return { items, page, pageSize, total };
}

const validListing = {
  id: "listing-1",
  title: "台灯",
  description: "功能正常，自提",
  priceCents: 1990,
  status: "available",
  ownerId: "user-1",
  version: 1,
  createdAt: "2026-10-11T08:00:00Z",
  ignoredExternalField: "not admitted",
  ["__proto__"]: { polluted: true },
};
const validPageObject = {
  items: [validListing],
  page: 1,
  pageSize: 20,
  total: 1,
  ignoredPageField: true,
};

const page = parseListingPage(JSON.stringify(validPageObject));
const listing = page.items[0];
const projection = {
  id: listing.id,
  title: listing.title,
  priceCents: listing.priceCents,
};

console.log(`accepted=${listing.id}, total=${page.total}`);
console.log(`createdAt=${listing.createdAt}`);
console.log(`known-keys=${Object.keys(listing).join(",")}`);
console.log(`projection=${projection.id}:${projection.title}:${projection.priceCents}`);
console.log(`prototype-polluted=${({}).polluted === true}`);

const cases = [
  ["null", "null"],
  ["array", "[]"],
  [
    "string-price",
    JSON.stringify({
      ...validPageObject,
      items: [{ ...validListing, priceCents: "1990" }],
    }),
  ],
  [
    "bad-date",
    JSON.stringify({
      ...validPageObject,
      items: [{ ...validListing, createdAt: "2026-02-30T08:00:00.000Z" }],
    }),
  ],
  [
    "contradictory",
    JSON.stringify({ ...validPageObject, total: 0 }),
  ],
  [
    "missing-first-page-item",
    JSON.stringify({ ...validPageObject, items: [], total: 1 }),
  ],
  [
    "short-full-page",
    JSON.stringify({
      ...validPageObject,
      pageSize: 2,
      total: 2,
    }),
  ],
  ["malformed", "{"],
];

for (const [label, textInput] of cases) {
  try {
    parseListingPage(textInput);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown failure";
    console.log(`rejected=${label}, reason=${reason}`);
  }
}
```

运行 `node json-boundary.mjs`，预期完整输出：

```text
accepted=listing-1, total=1
createdAt=2026-10-11T08:00:00.000Z
known-keys=id,title,description,priceCents,status,ownerId,version,createdAt
projection=listing-1:台灯:1990
prototype-polluted=false
rejected=null, reason=page: expected object
rejected=array, reason=page: expected object
rejected=string-price, reason=page.items[0].priceCents: expected non-negative safe integer
rejected=bad-date, reason=page.items[0].createdAt: invalid calendar date
rejected=contradictory, reason=page.items: count contradicts page metadata
rejected=missing-first-page-item, reason=page.items: count contradicts page metadata
rejected=short-full-page, reason=page.items: count contradicts page metadata
rejected=malformed, reason=invalid JSON syntax
```

额外字段和 `__proto__` 没有进入新 Listing。投影只在完整记录通过后创建；
不能拿三字段投影冒充 API 返回的完整 Listing。

## 8. 常见错误与排查路径

**明确错误示例：解析即信任。**

```js
const listing = JSON.parse(text);
console.log(listing.priceCents + 100);
```

若 priceCents 是 `"1990"`，结果会变成字符串 `"1990100"`；若输入是 null，
属性访问会直接失败。

**明确错误示例：无条件展开外部对象。**

```js
const trusted = { ...JSON.parse(text) };
```

它复制了所有外部键，却没有证明必要字段、金额、状态或时间有效。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 状态 200 的响应导致金额拼接和页面异常 |
| 证据 | JSON 语法成功，但 `typeof page.items[0].priceCents` 为 string |
| 原因 | 把协议成功和 JSON.parse 成功误当成领域准入 |
| 修复 | 以 unknown 顺序检查页、数组、完整 Listing 字段和值域 |
| 复验 | 数字 1990 接受；字符串 `"1990"` 在精确路径拒绝 |

Malformed JSON 应记录“语法失败”；合法 JSON 中坏字段应记录“契约失败”。
二者不能都吞掉后显示空列表，否则真实故障会伪装成“暂无商品”。

## 9. 课后题

1. JSON.parse 成功证明了什么？
2. 为什么解析后 createdAt 不是 Date？
3. 额外字段为什么不直接展开进领域对象？
4. 空页是否一定违反分页契约？

**参考答案：**

1. 只证明文本符合 JSON 语法并产生一个 JavaScript 值。
2. JSON 没有 Date 类型，时间以 string 传输。
3. 外部键未经过契约准入，可能覆盖内部字段或携带危险键；应按已知字段映射。
4. 不一定；无匹配或超出末页都可合法为空，只要元数据自洽。

## 10. 实践练习

### 基础

分别解析 `"null"`、`"[]"`、`"{\"priceCents\":0}"`，写出“语法是否成功”和“Listing 是否有效”。

### 进阶

增加一项 duplicate id 用例，令 total=2、items 含两个相同 id，必须在 `page.items` 拒绝。

### 故障注入

临时删除日历往返比较，使 2 月 30 日被规范化；保存错误输出后恢复比较，
确认精确路径重新拒绝。

**答案标准：**

- 基础三者 JSON 语法都成功，但都不是完整 Listing；
- 进阶拒绝 duplicate listing id；
- 故障注入说明 Date.parse 与业务有效日期不同；
- 所有修复都保留整数分、UTC 和已知字段映射，不用默认值掩盖坏数据。

## 11. 阶段验收

- [ ] 能说明 stringify 对 undefined、函数、数组值和时间的影响。
- [ ] null、数组和 malformed JSON 分别有可解释错误。
- [ ] 完整 Listing 八个字段逐项准入，字符串金额拒绝。
- [ ] 合法秒级 UTC 标准化为三位毫秒，无效日历日期拒绝。
- [ ] 页内数量严格等于 `min(pageSize, remaining)`，超范围空页仍可合法。
- [ ] 额外字段和 `__proto__` 不进入领域对象。
- [ ] 能区分外部响应、完整 Listing 和算法投影。

## 12. 常见问题

**是否应拒绝所有额外字段？**

取决于契约。本课选择忽略额外字段并按已知字段重建；安全关键场景可选择显式拒绝，
但必须有稳定版本策略，不能无意识传播。

**前端解析通过是否证明后端数据一定正确？**

不证明。它只让当前客户端拒绝不自洽响应；服务端仍需输入校验、授权、事务和数据库约束。

**为什么不自动把字符串价格转成 number？**

那会掩盖接口单位或版本错误。API 契约规定整数分 number，偏差必须显式失败。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN：JSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON)
- [MDN：`JSON.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
- [MDN：`JSON.stringify`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify)
- [MDN：`Date.toISOString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)
- [MDN：原型污染](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Prototype_pollution)

## 我现在能做到什么

我能把 JSON 语法、外部响应和可信领域记录分开，逐字段准入完整 Listing 分页，
保留整数分和规范 UTC，并用已知字段映射阻止外部键直接进入业务状态。

## 单元导航

[上一篇：数组、集合变换与分页](02-arrays-collections-pagination.md) ·
[返回第 3 章入口](../03-objects-arrays-data.md) ·
[下一章：原型、类与 ECMAScript 模块](../04-prototypes-modules.md)
