# `unknown`、运行时解析器与错误路径：唯一的数据准入通道

## 任务卡

- **任务**：把未知 JSON 逐字段解析成完整商品页，并保留精确错误路径。
- **产出**：`ts-lab/src/parsers.ts` 与 `ts-lab/src/parser-demo.ts` 两个完整文件。
- **运行**：复用严格项目；两条类型检查通过后由 TS 7 构建并运行。
- **完成证据**：合法 UTC 标准化、额外字段丢弃、字段错误路径、分页矛盾和重复 ID 证据。
- **边界**：解析器验证当前响应的形状和值域，不证明身份、跨页排序或数据库唯一性。

## 1. 任务背景

`response.json()` 只把 JSON 文本解码成 JavaScript 值。`null`、数组、错误对象、字符串金额
和非法日期都可能是合法 JSON，却不是合法商品页。TypeScript 类型在运行时已被擦除，
`as Listing` 不会检查任何字段。

本单元建立单向准入：`unknown → parser → domain`。解析器按已知字段构造新对象，
不把额外键直接扩展到业务状态；失败时保留如 `page.items[0].priceCents` 的路径。

## 2. 学习目标

完成后你能：

1. 按对象、字段类型和值域的顺序解析未知数据；
2. 为金额、状态、整数和 UTC 时间复用小型解析器；
3. 标准化合法 UTC 秒级时间并拒绝非法日历日期；
4. 检查分页容量、剩余总数和页内重复 ID；
5. 解析错误体，同时让 `details` 保持未知。

## 3. 预备知识

先保留上一单元的 `contracts.ts`。了解 JSON 解码异常、`Date.parse` 和集合 `Set`。
本课程接受以下 UTC 形式：

```text
YYYY-MM-DDTHH:mm:ssZ
YYYY-MM-DDTHH:mm:ss.sssZ
```

合法秒级输入会标准化为三位毫秒。带时区偏移的文本需在另一个明确边界转换，
本解析器不静默接受。

## 4. 核心理论

### 4.1 小解析器按证据递进

先排除 `null`、数组和基本值，才能读取对象键；再检查字符串或数字；最后检查业务值域。
每一步接收路径，错误就能指出具体位置。路径用于开发诊断，不应把完整敏感响应显示给用户。

### 4.2 已知字段重建而非透传

`{ ...source } as Listing` 会保留额外键，也没有检查已知键。显式返回八个字段既形成运行时
白名单，也让遗漏在源码审查中可见。额外字段可以被忽略，但缺失必需字段必须失败。

### 4.3 日期需要格式和日历往返

正则只检查形状，`Date.parse` 在部分日期上可能自动进位。将时间转成 `toISOString()`，
再与规范化输入比较，可拒绝 `2026-02-30`。这仍不是完整历法库，只满足课程 UTC 契约。

### 4.4 分页一致性有边界

本页数量不能超过 `pageSize`，也不能超过从当前 offset 到 `total` 的剩余数量。
超范围页返回空数组合法；`total=0` 却带商品矛盾。同页重复 ID 会破坏渲染身份，
应在准入时拒绝。单页不能证明全库排序稳定或跨页不重复。

## 5. 元素、属性、API 或配置清单

| 解析器/API | 责任 | 失败示例 |
| --- | --- | --- |
| `record` | 排除 `null`、数组和基本值 | `page: expected object` |
| `text` | 字符串与空白策略 | `listing.id: expected non-empty text` |
| `integer` | 安全整数和下限 | `page.total: expected safe integer >= 0` |
| `createCents` | 非负安全整数分与品牌 | 字符串、负数、小数 |
| `parseStatus` | 三种字面量状态 | `"draft"` |
| `parseUtcTime` | UTC 格式、可解析和日历往返 | 2 月 30 日 |
| `Object.hasOwn` | 判断可选详情是否存在 | 不读取原型继承键 |
| `Set` | 检查本页 ID 唯一 | 重复商品 ID |

## 6. 最小可运行案例

完整文件 `ts-lab/src/parsers.ts`：

```ts
import {
  createCents,
  type ApiErrorBody,
  type Listing,
  type ListingStatus,
  type Page,
} from "./contracts.js";

export class ContractError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = "ContractError";
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ContractError(path, "expected object");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.trim().length === 0)) {
    throw new ContractError(path, allowEmpty ? "expected text" : "expected non-empty text");
  }
  return value;
}

function integer(value: unknown, path: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new ContractError(path, `expected safe integer >= ${minimum}`);
  }
  return value;
}

function parseStatus(value: unknown, path: string): ListingStatus {
  if (value !== "available" && value !== "reserved" && value !== "sold") {
    throw new ContractError(path, "invalid listing status");
  }
  return value;
}

function parseUtcTime(value: unknown, path: string): string {
  const input = text(value, path);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(input)) {
    throw new ContractError(path, "expected ISO UTC timestamp");
  }
  const timestamp = Date.parse(input);
  if (!Number.isFinite(timestamp)) {
    throw new ContractError(path, "invalid date");
  }
  const normalized = new Date(timestamp).toISOString();
  const canonicalInput = input.includes(".") ? input : input.replace("Z", ".000Z");
  if (normalized !== canonicalInput) {
    throw new ContractError(path, "invalid calendar date");
  }
  return normalized;
}

export function parseListing(value: unknown, path = "listing"): Listing {
  const source = record(value, path);
  const priceCents = createCents(
    integer(source.priceCents, `${path}.priceCents`, 0),
  );
  return {
    id: text(source.id, `${path}.id`),
    title: text(source.title, `${path}.title`),
    description: text(source.description, `${path}.description`, true),
    priceCents,
    status: parseStatus(source.status, `${path}.status`),
    ownerId: text(source.ownerId, `${path}.ownerId`),
    version: integer(source.version, `${path}.version`, 1),
    createdAt: parseUtcTime(source.createdAt, `${path}.createdAt`),
  };
}

export function parseListingPage(value: unknown): Page<Listing> {
  const source = record(value, "page");
  const page = integer(source.page, "page.page", 1);
  const pageSize = integer(source.pageSize, "page.pageSize", 1);
  if (pageSize > 100) {
    throw new ContractError("page.pageSize", "expected integer <= 100");
  }
  const total = integer(source.total, "page.total", 0);
  if (!Array.isArray(source.items)) {
    throw new ContractError("page.items", "expected array");
  }
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) {
    throw new ContractError("page", "offset overflow");
  }
  const remaining = Math.max(0, total - offset);
  if (source.items.length > pageSize || source.items.length > remaining) {
    throw new ContractError("page.items", "count contradicts page metadata");
  }
  const items = source.items.map((item: unknown, index: number) =>
    parseListing(item, `page.items[${index}]`),
  );
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new ContractError("page.items", "duplicate listing id");
  }
  return { items, page, pageSize, total };
}

export function parseApiError(value: unknown): ApiErrorBody {
  const source = record(value, "error");
  const base = {
    code: text(source.code, "error.code"),
    message: text(source.message, "error.message"),
    requestId: text(source.requestId, "error.requestId"),
  };
  return Object.hasOwn(source, "details")
    ? { ...base, details: source.details }
    : base;
}
```

`record` 中的单次断言紧跟对象运行时检查；金额品牌由 `createCents` 在值域检查后建立。
没有从 `unknown` 直接断言完整领域类型。

## 7. 邻里集市集成案例

完整文件 `ts-lab/src/parser-demo.ts`：

```ts
import { parseApiError, parseListingPage } from "./parsers.js";

const validPayload = {
  items: [{
    id: "listing-1",
    title: "台灯",
    description: "功能正常，自提",
    priceCents: 1990,
    status: "available",
    ownerId: "user-1",
    version: 1,
    createdAt: "2026-10-11T08:00:00Z",
    debug: "must not enter domain",
  }],
  page: 1,
  pageSize: 20,
  total: 1,
};
const raw: unknown = validPayload;

const page = parseListingPage(raw);
const first = page.items[0];
console.log(`total=${page.total}, title=${first?.title ?? "missing"}`);
console.log(first?.createdAt ?? "missing");
console.log(`has-debug=${first === undefined ? false : Object.hasOwn(first, "debug")}`);

const error = parseApiError({
  code: "VERSION_CONFLICT",
  message: "商品已被更新",
  requestId: "request-demo-1",
  details: { currentVersion: 2 },
});
console.log(`${error.code}:${error.requestId}`);

const badCases: readonly unknown[] = [
  {
    ...validPayload,
    items: [{ ...validPayload.items[0], priceCents: "1990" }],
  },
  {
    ...validPayload,
    items: [{
      ...validPayload.items[0],
      createdAt: "2026-02-30T08:00:00Z",
    }],
  },
  { ...validPayload, total: 0 },
  {
    ...validPayload,
    items: [validPayload.items[0], validPayload.items[0]],
    total: 2,
  },
];

for (const value of badCases) {
  try {
    parseListingPage(value);
  } catch (caught) {
    console.log(caught instanceof Error ? caught.message : "unknown failure");
  }
}
```

运行：

```bash
pnpm typecheck:all
pnpm build
node dist/parser-demo.js
```

完整输出：

```text
total=1, title=台灯
2026-10-11T08:00:00.000Z
has-debug=false
VERSION_CONFLICT:request-demo-1
page.items[0].priceCents: expected safe integer >= 0
page.items[0].createdAt: invalid calendar date
page.items: count contradicts page metadata
page.items: duplicate listing id
```

额外 `debug` 字段没有进入新对象。错误详情仍是 `unknown`；调用者要先按 code 选择解析器，
不能直接读取 `currentVersion`。

## 8. 常见错误与排查路径

**明确错误示例：**

```ts
const raw = await response.json();
const page = raw as Page<Listing>;
console.log(page.items[0]!.priceCents);
```

这同时跳过外层、项目和空数组检查。另一类错误是只用 `Date.parse` 接受非法日历日期，
或把缺失金额补成 0，造成“免费商品”假数据。

| 项目 | 记录 |
| --- | --- |
| 现象 | 页面在格式化价格时异常，日志只有“读取失败” |
| 证据 | 响应第一项金额是字符串；入口存在整体断言，没有字段路径 |
| 原因 | JSON 解码被误当成契约验证，错误在下游才暴露 |
| 修复 | 响应保持 `unknown`，通过 `parseListingPage` 逐字段重建 |
| 复验 | 同一响应在 `page.items[0].priceCents` 立即失败；合法响应输出不变 |

解析器不应通过 `try/catch` 静默丢弃坏记录，否则 `total` 和可见数量可能互相矛盾。
若业务允许部分导入，必须返回逐条成功/失败报告，那是另一个明确契约。

## 9. 课后题

1. JSON 解析成功为何不能直接进入领域层？
2. 为什么合法秒级 UTC 会变成带 `.000Z`？
3. 超范围页为什么可以是空数组？
4. 同页 ID 唯一能否证明数据库 ID 唯一？

答案：

1. JSON 只保证文本语法，不保证对象形状、字段类型和值域。
2. 领域模型统一使用 `toISOString()` 的规范毫秒表示。
3. 页码本身可以合法，只是当前 offset 已超过总数。
4. 不能；解析器只看到本次响应，数据库约束负责全局唯一。

## 10. 实践练习

**基础**：分别删除 Listing 八个字段，每次记录精确路径。

参考标准：

```text
page.items[0].id
page.items[0].title
page.items[0].description
page.items[0].priceCents
page.items[0].status
page.items[0].ownerId
page.items[0].version
page.items[0].createdAt
```

**进阶**：验证三种状态、0 分、空页和超范围空页：

```ts
parseListingPage({ items: [], page: 9, pageSize: 20, total: 1 });
```

参考结果：上例合法；`items` 非空则矛盾。`"draft"` 状态、负数和小数金额均拒绝。

**故障注入**：从错误体删除 `requestId`。参考结果为
`error.requestId: expected non-empty text`；不能生成本地假编号后冒充服务端关联证据。

## 11. 阶段验收

- [ ] 两个完整文件在 TS 7 和 TS 6 兼容命令下通过。
- [ ] 每个 Listing 必需字段缺失都有准确路径。
- [ ] 0 分通过；字符串、负数、小数和不安全整数拒绝。
- [ ] 三种状态通过，未知状态拒绝。
- [ ] UTC 秒级输入规范化，非法日期和偏移格式拒绝。
- [ ] 空页合法，超容量、矛盾数量和重复 ID 拒绝。
- [ ] 额外字段没有进入返回领域对象。
- [ ] 错误体缺少 `requestId` 时失败，`details` 未被盲读。

## 12. 常见问题

**手写解析器是否总优于 schema 库？**

不是。本课用于看清机制；成熟项目可用经过评估的 schema 库，但仍要定义相同契约和错误边界。

**为什么不自动把字符串金额转换成数字？**

接口单位或类型漂移应明确失败；静默修复会掩盖生产契约问题。

**可以保留所有额外字段吗？**

只有业务明确需要时另建契约。默认重建已知字段可减少意外数据传播。

**解析成功是否可以直接预约？**

不能。解析只证明数据形状；服务端仍要检查会话、状态和并发唯一性。

## 13. 扩展阅读

资料快照：2026-10-11。

- [TypeScript：Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [MDN：JSON.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
- [MDN：Object.hasOwn](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/hasOwn)
- [MDN：Date.parse](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse)
- [MDN：Date.prototype.toISOString](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)
- [RFC 3339：Internet Date/Time Format](https://www.rfc-editor.org/rfc/rfc3339#section-5.6)

兼容边界：课程 UTC 正则比完整 RFC 3339 更窄，这是明确领域策略。本单元未连接真实后端，
也未验证跨页快照、一致排序或数据库记录。

## 我现在能做到什么

我能把 JSON 解码与领域准入分开，逐字段建立证据，并让金额、日期、分页和错误体问题
在最靠近来源的位置给出精确路径。

## 单元导航

- 上一单元：[领域契约、品牌值与 DTO](./01-domain-contracts-branded-values-dtos.md)
- 下一单元：[状态机、版本冲突与授权边界](./03-state-machines-conflicts-authorization.md)
