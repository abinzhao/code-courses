# Vitest 5：用单元测试锁定领域边界

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | Vitest Node 配置、金额单元测试、Listing/Page 解析器领域测试 |
| 练习目录 | 读者自己的 `market-engineering-lab/`，不是教材仓库 |
| 固定版本 | Node.js 24.21.0、pnpm 12.11.2、Vitest 5.0.3 |
| 核心命令 | `pnpm test` |
| 成功证据 | 2 个测试文件、8 条测试通过，进程退出码为 0 |
| 失败证据 | 金额除数改错后精确金额断言失败，恢复后同一命令转绿 |
| 环境标签 | **本机、纯内存、无网络、无浏览器、无真实后端** |

本课只验证纯领域规则。测试中的对象是确定性教学数据，不代表数据库记录已经通过授权或事务
约束。测试通过也不能证明 HTTP、页面或生产部署正确。

## 1. 任务背景

邻里集市从接口收到 `priceCents: 1990`，真正的规则不是“它是一个 `number`”，而是“它是
非负安全整数分，并且展示为 `19.90`”。类似地，`createdAt` 不只是字符串，而是可规范化的
UTC ISO 8601 时间；分页对象也不只是四个字段同时存在，还要满足项目数量、总数和页偏移之间
不矛盾。

如果测试只复制实现算法，错误会在实现和预期中同时出现。例如实现把分除以 `1000`，测试也用
同一个函数生成预期值，绿灯没有提供任何独立证据。本课用人工可推导的字面量作为预期，并用
小而有区分度的数据覆盖合法值、拒绝边界和对象关系。

领域解析器还承担一条重要边界：外部值在进入解析器前是 `unknown`，成功后才成为 `Listing`。
类型断言不会校验日期、重复 ID 或字符串价格，因此测试必须调用真实解析器，而不是把解析器
mock 成永远成功。

## 2. 学习目标

完成本课后，你能够：

1. 在 Vitest 5 的 Node 环境运行一次性单元测试；
2. 为整数分写出零值、边界值和非法值断言；
3. 区分 UTC 格式正确、日历日期有效和规范化输出；
4. 拒绝分页数量矛盾、偏移溢出和同页重复 ID；
5. 证明解析器没有修改输入，也没有把输入对象引用泄露到输出；
6. 从业务规则独立推导预期值，并用故障注入证明断言会变红。

## 3. 预备知识

先确认已经理解：

- [`unknown` 与运行时解析](../../04-javascript-typescript/08-typescript-domain-design/02-unknown-runtime-parsers-errors.md)；
- [`Number.isSafeInteger`](../../04-javascript-typescript/01-values-control-flow/01-values-variables-types-conversion.md)；
- [本章入口](../05-unit-integration-e2e.md)中的测试分层和证据边界。

在 `market-engineering-lab/` 根目录运行：

```bash
node --version
pnpm --version
pnpm add -D -E vitest@5.0.3
pnpm exec vitest --version
mkdir -p src/domain tests/unit tests/fixtures
```

预期版本输出分别以 `v24.21.0`、`12.11.2` 和 `vitest/5.0.3` 为准。安装命令由 pnpm
更新读者练习工程的清单和锁文件；教材仓库不保存这些生成物。版本命令成功只证明工具入口
存在，不证明下面的业务测试已经运行。

## 4. 核心理论

### 4.1 测试的是规则，不是代码形状

单元测试把最少职责放进同一观察范围。本课的金额函数只接收一个数并返回一个字符串；分页解析
器连接多个纯校验，但仍没有网络、时钟或 DOM。这样的边界失败时定位快，适合穷举关键值。

“调用了一次函数”通常不是产品规则。更有发现能力的断言是：

```text
1990 分 → "19.90"
0 分 → "0.00"
字符串 "1990" → 拒绝
2026-02-30T08:00:00Z → 拒绝
同页两个 listing-1 → 拒绝
```

每个预期都能人工解释，不依赖待测函数计算自己。

### 4.2 整数分为什么需要运行时值域

TypeScript 的 `number` 同时包含整数、小数、`NaN`、正负无穷和超过安全整数范围的值。
金额规则要求：

```text
typeof value === "number"
AND Number.isSafeInteger(value)
AND value >= 0
```

零是合法价格，不能用 `if (!priceCents)` 判断缺失。`Number.MAX_SAFE_INTEGER + 1` 虽然
仍是 `number`，但整数算术已不再可靠，也必须拒绝。

### 4.3 UTC 格式、日历有效性与规范化是三层检查

正则表达式可以要求结尾是 `Z`，但不能独自判断 2 月 30 日不存在。`Date.parse` 会在部分
输入上做日期进位，因此只检查它返回有限数值仍不够。可靠流程是：

1. 限定课程接受的 UTC 形状；
2. 解析为时间值；
3. 用 `toISOString()` 规范化；
4. 将规范化结果与补齐毫秒后的原输入比较。

`2026-10-10T08:00:00Z` 因而规范化为 `2026-10-10T08:00:00.000Z`；
`2026-02-30T08:00:00Z` 会规范化成另一个日历日期，比较时被拒绝。

### 4.4 分页不是四个互不相关的字段

对于 `{ items, page, pageSize, total }`：

- `page >= 1`，`pageSize >= 1`，`total >= 0`，且都是安全整数；
- `(page - 1) * pageSize` 不能溢出安全整数；
- 当前 `items.length` 不能超过 `pageSize`；
- 当前项目数不能超过从偏移位置算出的剩余总数；
- 超出最后一页时，空数组可以是合法成功；
- 同一页重复 ID 会让更新与列表 key 语义不确定，应在领域入口拒绝。

这些关系必须由测试构造反例。只给每个字段测一次类型无法发现字段间矛盾。

### 4.5 “输入不可变”包含两个观察

第一，解析前后的输入深层值相同，证明解析器没有直接改写输入。第二，输出对象、数组和项目
不是输入引用，证明后续修改已解析结果不会反向污染原始响应缓存。仅使用
`expect(input).toEqual(before)` 只能证明解析期间没改值，不能证明没有共享引用。

本课不要求把输出永久冻结。是否返回只读对象是另一个 API 设计；这里的契约是解析器不修改
调用方数据，也不复用其中的可变容器。

## 5. 元素、属性、API 或配置清单

| 项目 | 本课用法 | 作用 | 边界 |
| --- | --- | --- | --- |
| `vitest@5.0.3` | 精确开发依赖 | 测试运行器与断言库 | 不提供真实浏览器或后端 |
| `vitest run` | `pnpm test` | 单次运行后退出 | `vitest` 无参数会进入 watch |
| `environment: "node"` | `vitest.config.mjs` | 使用 Node 24 的标准 API | 没有 DOM |
| `include` | `tests/unit/**/*.test.ts` | 限定本课测试发现范围 | 路径写错会出现无测试 |
| `test` | 声明一个可观察行为 | 隔离失败名称 | 名称不能代替断言 |
| `expect(...).toBe(...)` | 精确原始值比较 | 金额文本、规范时间 | 对对象深比较应使用 `toEqual` |
| `toThrow` | 同步拒绝断言 | 非法领域输入 | 异步拒绝使用 `rejects` |
| `structuredClone` | 克隆夹具快照 | 检查输入深层值未变 | 不替代引用身份断言 |
| `Number.isSafeInteger` | 金额与分页整数校验 | 排除小数、无穷和不安全整数 | 不自动检查非负 |
| `Date.parse` / `toISOString` | UTC 解析与规范化 | 发现格式和日历进位 | 必须与受限原输入比较 |
| `Set` | 同页 ID 去重 | 发现重复商品 | 不证明数据库全局唯一 |

### 5.1 工具版本、命令与文件职责

| 项目 | 固定值或命令 | 文件职责 / 输出 |
| --- | --- | --- |
| Node.js | `24.21.0` | 提供测试运行时、`structuredClone` 和标准日期 API |
| pnpm | `12.11.2` | 安装精确依赖并执行本地脚本 |
| Vitest | `5.0.3` | `pnpm exec vitest --version` 核对实际入口 |
| `vitest.config.mjs` | `environment: "node"`、`include` | 定义测试环境与发现范围 |
| `src/domain/money.ts` | 领域源码 | 校验并格式化非负安全整数分 |
| `src/domain/listing-page.ts` | 领域源码 | 把 `unknown` 解析为有效 Listing/Page |
| `tests/fixtures/listing-page.ts` | 测试夹具 | 每次返回新的合法教学输入 |
| `tests/unit/*.test.ts` | 测试证据 | 保存独立预期、非法边界和不可变断言 |
| 一次性门禁 | `pnpm test` | 运行后退出，并把失败通过退出码交给后续门禁 |
| 开发反馈 | `pnpm test:watch` | 监听文件变化；不用于 CI 或最终验收 |

练习工程 `package.json` 的 `scripts` 对象增加以下键；这是增量片段，不要删除前几章脚本：

```json
{
  "test": "vitest run",
  "test:watch": "vitest"
}
```

`test` 用于可重复门禁，`test:watch` 用于本地反馈。CI 或验收不能运行永不主动退出的 watch
命令。

## 6. 最小可运行案例

### 6.1 Vitest 配置

在练习根目录创建完整文件 `vitest.config.mjs`：

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    restoreMocks: true,
  },
});
```

`restoreMocks` 防止某条测试留下的替换影响后续测试。本课不需要 mock，但提前固定隔离行为，
第二课加入请求边界测试时仍沿用这份配置。

### 6.2 金额实现

创建完整文件 `src/domain/money.ts`：

```ts
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("priceCents: expected non-negative safe integer");
  }

  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}
```

创建完整文件 `tests/unit/money.test.ts`：

```ts
import { expect, test } from "vitest";
import { formatCents } from "../../src/domain/money";

test("formats non-negative safe integer cents from literal expectations", () => {
  expect(formatCents(0)).toBe("0.00");
  expect(formatCents(1)).toBe("0.01");
  expect(formatCents(100)).toBe("1.00");
  expect(formatCents(1990)).toBe("19.90");
});

test("rejects negative, fractional, non-finite and unsafe cents", () => {
  const invalid = [
    -1,
    19.9,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ];

  for (const value of invalid) {
    expect(() => formatCents(value), `value=${String(value)}`).toThrow(RangeError);
  }
});
```

预期值直接写成业务可核对的字符串。测试没有执行 `/ 100`，因此不会与实现共享同一个除数
错误。执行：

```bash
pnpm test
```

此时预期 `tests/unit/money.test.ts` 的 2 条测试通过，进程退出 0。若报告找不到测试，先检查
`include` 和文件路径；若找不到 Vitest，检查当前目录和安装结果，不把工具入口错误归因给
金额算法。

## 7. 邻里集市集成案例

本节把金额规则扩展为完整的 Listing/Page 纯领域入口。虽然标题为集成案例，这里仍是领域
层的纯函数组合，不包含第二课的 HTTP 集成。

### 7.1 完整领域解析器

创建完整文件 `src/domain/listing-page.ts`：

```ts
import { formatCents } from "./money";

export type ListingStatus = "available" | "reserved" | "sold";

export type Listing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: ListingStatus;
  ownerId: string;
  version: number;
  createdAt: string;
};

export type ListingPage = {
  items: Listing[];
  page: number;
  pageSize: number;
  total: number;
};

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path}: expected object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    throw new Error(`${path}: expected text`);
  }
  return value;
}

function integer(value: unknown, path: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${path}: expected safe integer >= ${minimum}`);
  }
  return value;
}

function utc(value: unknown): string {
  const input = text(value, "createdAt");
  const shape = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  if (!shape.test(input)) {
    throw new Error("createdAt: expected UTC ISO 8601");
  }

  const time = Date.parse(input);
  if (!Number.isFinite(time)) {
    throw new Error("createdAt: invalid date");
  }

  const normalized = new Date(time).toISOString();
  const canonicalInput = input.includes(".") ? input : input.replace("Z", ".000Z");
  if (normalized !== canonicalInput) {
    throw new Error("createdAt: invalid calendar date");
  }
  return normalized;
}

export function parseListing(value: unknown): Listing {
  const source = record(value, "listing");
  const status = source.status;
  if (status !== "available" && status !== "reserved" && status !== "sold") {
    throw new Error("status: invalid listing status");
  }

  const priceCents = integer(source.priceCents, "priceCents", 0);
  formatCents(priceCents);

  return {
    id: text(source.id, "id"),
    title: text(source.title, "title"),
    description: text(source.description, "description", true),
    priceCents,
    status,
    ownerId: text(source.ownerId, "ownerId"),
    version: integer(source.version, "version", 1),
    createdAt: utc(source.createdAt),
  };
}

export function parseListingPage(value: unknown): ListingPage {
  const source = record(value, "page");
  const page = integer(source.page, "page", 1);
  const pageSize = integer(source.pageSize, "pageSize", 1);
  const total = integer(source.total, "total", 0);
  if (!Array.isArray(source.items)) {
    throw new Error("items: expected array");
  }

  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) {
    throw new Error("page: offset overflow");
  }

  const remaining = Math.max(0, total - offset);
  if (source.items.length > pageSize || source.items.length > remaining) {
    throw new Error("items: count contradicts pagination");
  }

  const items = source.items.map((item: unknown) => parseListing(item));
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new Error("items: duplicate listing id");
  }

  return { items, page, pageSize, total };
}
```

`formatCents(priceCents)` 复用同一金额值域，返回值在解析器中不需要保存。解析器始终创建新
对象和新数组，没有把 `source.items` 直接断言为 `Listing[]`。

### 7.2 可复用夹具

创建完整文件 `tests/fixtures/listing-page.ts`：

```ts
export function listingPageFixture() {
  return {
    items: [
      {
        id: "listing-1",
        title: "台灯",
        description: "本机教学数据，自提",
        priceCents: 1990,
        status: "available",
        ownerId: "user-1",
        version: 1,
        createdAt: "2026-10-10T08:00:00Z",
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  };
}
```

函数每次创建新对象，避免某条故障测试修改共享常量后污染下一条测试。

### 7.3 完整领域测试

创建完整文件 `tests/unit/listing-page.test.ts`：

```ts
import { expect, test } from "vitest";
import { parseListingPage } from "../../src/domain/listing-page";
import { listingPageFixture } from "../fixtures/listing-page";

test("normalizes valid UTC without changing the represented instant", () => {
  const parsed = parseListingPage(listingPageFixture());
  expect(parsed.items[0]?.createdAt).toBe("2026-10-10T08:00:00.000Z");
});

test("rejects non-integer prices from an unknown response", () => {
  const source = listingPageFixture();
  const invalidPrices: unknown[] = ["1990", 19.9, -1, Number.MAX_SAFE_INTEGER + 1];

  for (const priceCents of invalidPrices) {
    const input = {
      ...source,
      items: [{ ...source.items[0], priceCents }],
    };
    expect(() => parseListingPage(input), `price=${String(priceCents)}`).toThrow("priceCents");
  }
});

test("rejects impossible calendar dates and non-UTC offsets", () => {
  const source = listingPageFixture();
  const invalidDates = ["2026-02-30T08:00:00Z", "2026-10-10T16:00:00+08:00"];

  for (const createdAt of invalidDates) {
    const input = {
      ...source,
      items: [{ ...source.items[0], createdAt }],
    };
    expect(() => parseListingPage(input), createdAt).toThrow("createdAt");
  }
});

test("rejects pagination contradictions and unsafe offsets", () => {
  const source = listingPageFixture();
  const second = { ...source.items[0], id: "listing-2" };
  const contradictions = [
    { ...source, total: 0 },
    { ...source, items: [source.items[0], second], pageSize: 1, total: 2 },
    { ...source, items: [], page: Number.MAX_SAFE_INTEGER, pageSize: 20, total: 0 },
  ];

  for (const input of contradictions) {
    expect(() => parseListingPage(input)).toThrow(/pagination|overflow/);
  }

  expect(parseListingPage({ items: [], page: 2, pageSize: 20, total: 1 })).toEqual({
    items: [],
    page: 2,
    pageSize: 20,
    total: 1,
  });
});

test("rejects duplicate listing IDs within one page", () => {
  const source = listingPageFixture();
  const input = {
    ...source,
    items: [source.items[0], { ...source.items[0] }],
    total: 2,
  };
  expect(() => parseListingPage(input)).toThrow("duplicate listing id");
});

test("does not mutate input or reuse its mutable containers", () => {
  const input = listingPageFixture();
  const before = structuredClone(input);
  const parsed = parseListingPage(input);

  expect(input).toEqual(before);
  expect(parsed).not.toBe(input);
  expect(parsed.items).not.toBe(input.items);
  expect(parsed.items[0]).not.toBe(input.items[0]);

  if (parsed.items[0]) {
    parsed.items[0].title = "已解析结果";
  }
  expect(input.items[0]?.title).toBe("台灯");
});
```

再次执行：

```bash
pnpm test
```

预期两个文件共 8 条测试通过。Vitest 输出中的耗时随机器变化，不把固定毫秒数写入验收。
如果某个循环里的第二个输入失败，错误消息中的自定义说明可指出具体值；不要拆除边界输入来
减少失败数量。

## 8. 常见错误与排查路径

### 8.1 故意错误：把分除以一千

临时把 `src/domain/money.ts` 中的两处 `100` 改成 `1000`：

```ts
const whole = Math.floor(cents / 1000);
const fraction = String(cents % 1000).padStart(2, "0");
```

运行：

```bash
pnpm test -- tests/unit/money.test.ts
```

预期 `formatCents(1990)` 的实际结果不再是 `19.90`，命令非零退出。恢复原实现后重复命令，
2 条金额测试重新通过。

**五段错误记录**

- **现象：** 合法金额测试失败，非法值拒绝测试仍可能通过。
- **证据：** Vitest 指出期望 `19.90`，实际值来自错误除数；失败定位到金额测试的字面量断言。
- **原因：** 实现改变了分到元的换算单位，静态类型仍然是 `number → string`，类型检查不会发现。
- **修复：** 恢复除数 `100` 与两位余数，不修改断言接受错误结果。
- **复验：** 先运行金额文件转绿，再运行完整 `pnpm test`，确认领域解析测试没有回归。

### 8.2 只用 `Date.parse` 接受了不可能日期

错误实现如下：

```ts
function unsafeDate(value: string): string {
  return new Date(Date.parse(value)).toISOString();
}
```

它可能把 2 月 30 日进位成 3 月日期。修复不是在测试中改写期望，而是保留形状限制和规范化
比较。重新运行 `rejects impossible calendar dates`，确认非法日期被拒绝。

### 8.3 解析器直接返回输入数组

若写成 `return { ...source, items: source.items as Listing[] }`，类型断言绕开运行时检查，并且
输出与输入共享数组。先看 `not.toBe` 的失败，再检查返回路径；修复为逐项调用
`parseListing` 并创建新数组，不增加 `as unknown as Listing[]`。

### 8.4 测试显示“没有找到测试”

检查顺序：

1. 当前目录是否为 `market-engineering-lab/`；
2. 文件是否以 `.test.ts` 结尾；
3. `vitest.config.mjs` 的 `include` 是否覆盖 `tests/unit/`；
4. `pnpm exec vitest --version` 是否能找到本地依赖。

不要创建一条永远通过的空测试来掩盖路径错误。零测试不是领域规则通过的证据。

## 9. 课后题

**问题 1：为什么 `priceCents: number` 仍要测试小数和 `NaN`？**

参考答案：`number` 包含这些运行时值，类型系统没有表达非负安全整数值域；外部 JSON 还可能
完全不是数字。

**问题 2：为什么 `2026-02-30T08:00:00Z` 不能只靠正则拒绝？**

参考答案：正则适合限定文本形状，但不了解月份天数和闰年。需要解析并把规范化结果与原输入
比较。

**问题 3：第二页、总数 1、空 items 为什么可以合法？**

参考答案：请求超过最后一页可以得到空成功；矛盾的是返回项目数超过当前偏移后的剩余总数，
不是“任何超页都必须报错”。

**问题 4：深相等通过为何还不能证明输入引用隔离？**

参考答案：解析器可以不改输入却把同一个数组返回。此时解析后再改输出会污染输入，所以还要
使用 `not.toBe` 检查容器和项目身份。

## 10. 实践练习

### 基础：增加整数元边界

为 `formatCents(12_300)` 写断言。可判定标准：

- 预期字面量是 `"123.00"`；
- 测试中不执行除法或调用另一个格式函数；
- `pnpm test -- tests/unit/money.test.ts` 通过。

### 进阶：增加闰年日期

增加一个合法输入 `2028-02-29T00:00:00Z` 和非法输入
`2027-02-29T00:00:00Z`。可判定标准：前者规范化为带 `.000Z` 的字符串，后者抛出包含
`createdAt` 的错误，原夹具保持不变。

### 故障注入：删除重复 ID 检查

临时删除 `Set` 判断并只运行重复 ID 测试。可判定标准：

1. 测试先因“不再抛错”而失败；
2. 恢复唯一性检查；
3. 指定测试和完整 `pnpm test` 均转绿；
4. 记录现象、证据、原因、修复和复验，不删除测试或改成允许重复。

## 11. 阶段验收

提交学习证据前逐项核对：

- [ ] `pnpm exec vitest --version` 输出 `vitest/5.0.3`。
- [ ] `pnpm test` 实际执行 2 个文件、8 条测试并退出 0。
- [ ] 金额覆盖 `0`、`1`、整元、`1990` 及五类非法值。
- [ ] UTC 测试同时覆盖规范化、不可能日期和非 UTC 偏移。
- [ ] 分页测试覆盖数量矛盾、页容量矛盾、偏移溢出与合法超页空结果。
- [ ] 重复 ID 被拒绝。
- [ ] 输入深层值、数组引用和项目引用均有不可变证据。
- [ ] 金额除数故障注入先红后绿，断言没有迁就错误实现。
- [ ] 能说明这些纯测试没有验证 HTTP、浏览器、授权或数据库。

## 12. 常见问题

**是否应该把每个非法值拆成一条测试？**

当每个值代表独立业务分支时可以拆分；本课在一个规则内循环，并给断言加输入说明。关键是失败
能定位且所有值真实执行，不是追求测试数量。

**为什么不使用随机金额？**

边界案例用人工可推导值更容易复现。属性测试可以作为扩展，但必须固定或记录种子，并保留零、
安全整数上界等定向案例。

**解析结果是否应该 `Object.freeze`？**

这是另一个 API 契约。本课只要求不修改输入、不共享可变容器；若项目要求深只读，需要单独设计
类型、运行时冻结成本和测试。

**100% 覆盖率是否表示领域完整？**

不表示。代码行被执行不等于断言能发现错误，也不证明遗漏的业务组合、并发和权限边界。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Vitest Guide](https://vitest.dev/guide/)：运行模式、测试结构与命令入口。
- [Vitest Expect API](https://vitest.dev/api/expect.html)：精确值、深相等、引用与异常断言。
- [Vitest Config](https://vitest.dev/config/)：Node 环境、测试发现和隔离配置。
- [MDN `Number.isSafeInteger`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger)：安全整数边界。
- [MDN `Date.prototype.toISOString`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)：UTC 规范字符串。
- [MDN `structuredClone`](https://developer.mozilla.org/docs/Web/API/Window/structuredClone)：深克隆语义；Node 24 提供对应全局 API。

## 我现在能做到什么

我能把整数分、UTC、分页、重复 ID 和输入不可变写成独立可推导的 Vitest 断言，并通过故障
注入证明这些断言会发现真实领域错误，而不是只确认函数被调用。

## 单元导航

[本章入口](../05-unit-integration-e2e.md) ·
[上一课：语义 Design Tokens 与跨框架边界](../04-workspace-component-library/03-design-tokens-cross-framework-boundaries.md) ·
[下一课：集成 HTTP、解析器与请求竞态](02-vitest-integration-http-races.md)
