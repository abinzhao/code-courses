# 领域契约、品牌值与 DTO：按用途拆开数据

## 任务卡

- **任务**：建立完整领域契约，区分表单草稿、有效命令、服务端资源和查询投影。
- **产出**：`ts-lab/src/contracts.ts` 与 `ts-lab/src/contracts-demo.ts` 两个完整文件。
- **运行**：复用第 07 章严格配置，执行双线类型检查、TS 7 构建和 Node 运行。
- **完成证据**：严格元转分、完整 Listing、白名单补丁、投影输出和失败记录。
- **边界**：品牌类型是编译期语义；只有运行时构造入口提供金额值域证据。

## 1. 任务背景

发布表单里的价格是字符串，创建命令里的价格是已验证整数分，服务端返回的商品还有
`id/ownerId/version/createdAt`。如果把它们都写成一个 `Listing`，界面草稿要么充满
假字段，要么可以伪造服务端字段。

可靠契约先按用途拆分，再在边界明确转换。类型名称应回答“这个值在哪一层、已获得
什么保证”，而不是笼统叫 `Data` 或 `Info`。

## 2. 学习目标

完成后你能：

1. 定义完整 Listing、分页、错误体和预约契约；
2. 用品牌值降低“元、分、任意数字”混用风险；
3. 区分表单草稿、创建命令、补丁 DTO 和服务端资源；
4. 用字段白名单构造投影与编辑类型；
5. 说明前端类型、后端授权和数据库约束各自边界。

## 3. 预备知识

需要理解 `unknown`、联合、`Pick/Partial` 和精确可选属性。继续遵守统一项目契约：
金额是非负安全整数分，持久化时间是 UTC ISO 8601，状态只允许三种，`version`
由服务端用于乐观并发控制。

## 4. 核心理论

### 4.1 完整资源与命令不是同一个类型

`Listing` 表示服务端已创建资源。`ListingDraft` 保存用户尚未完成的文字；
`CreateListingCommand` 只含允许创建的字段；`ListingPatch` 只含可编辑字段与必需版本。
服务端字段不应出现在草稿中等待前端“正确填写”。

### 4.2 品牌值减少单位混淆

`Cents` 在 `number` 上增加不可伪造的编译期标记，让普通数字不能直接进入需要已验证
金额的函数。品牌在 JavaScript 中不存在，因此构造函数仍要检查安全整数和非负。
单次、位于验证后的断言是在建立品牌；把外部对象直接断言成 `Listing` 没有同等证据。

### 4.3 DTO 使用允许列表

`Partial<Listing>` 会允许修改 `id`、`ownerId` 和时间。正确方向是先 `Pick` 可编辑字段，
再按补丁语义设为可选，同时强制携带 `version`。运行时后端仍须丢弃或拒绝额外字段。

### 4.4 投影应明确不完整

列表卡片只需一部分字段，可以命名为 `ListingCard`。它不是坏掉的 Listing，也不应被
传给需要完整资源的解析或更新函数。

## 5. 元素、属性、API 或配置清单

| 契约 | 责任 | 不拥有的保证 |
| --- | --- | --- |
| `Cents` | 标记已验证整数分 | 不能跨 JSON 自动保留品牌 |
| `ListingDraft` | 保存表单原文 | 不保证可提交 |
| `CreateListingCommand` | 创建允许字段 | 不含服务端身份和版本 |
| `Listing` | 完整资源形状 | 不证明当前用户有权限 |
| `ListingPatch` | 可编辑字段 + 版本 | 不执行原子版本比较 |
| `ListingCard` | 列表显示投影 | 不可冒充完整资源 |
| `Reservation` | 预约资源形状 | 不保证数据库唯一 |
| `ApiErrorBody` | 稳定错误代码与请求编号 | `details` 仍需按场景解析 |

## 6. 最小可运行案例

完整文件 `ts-lab/src/contracts.ts`：

```ts
declare const centsBrand: unique symbol;

export type Cents = number & { readonly [centsBrand]: "Cents" };
export type ListingStatus = "available" | "reserved" | "sold";

export type Listing = {
  id: string;
  title: string;
  description: string;
  priceCents: Cents;
  status: ListingStatus;
  ownerId: string;
  version: number;
  createdAt: string;
};

export type Page<T> = {
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
};

export type ApiErrorBody = {
  code: string;
  message: string;
  requestId: string;
  details?: unknown;
};

export type Reservation = {
  id: string;
  listingId: string;
  buyerId: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
};

export type ListingDraft = {
  title: string;
  description: string;
  priceYuan: string;
};

export type CreateListingCommand = {
  title: string;
  description: string;
  priceCents: Cents;
};

export const editableListingKeys = [
  "title",
  "description",
  "priceCents",
] as const satisfies readonly (keyof Listing)[];

export type EditableListingKey = (typeof editableListingKeys)[number];
export type ListingPatch = {
  version: number;
} & Partial<Pick<Listing, EditableListingKey>>;

export type ListingCard = Pick<
  Listing,
  "id" | "title" | "priceCents" | "status" | "version"
>;

export function createCents(value: number): Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("cents must be a non-negative safe integer");
  }
  return value as Cents;
}

export function draftToCommand(draft: ListingDraft): CreateListingCommand {
  const title = draft.title.trim();
  if (title.length < 1 || title.length > 80) {
    throw new RangeError("title must contain 1 to 80 characters");
  }
  const text = draft.priceYuan.trim();
  if (!/^(0|[1-9]\d*)(?:\.\d{1,2})?$/.test(text)) {
    throw new RangeError("price must be non-negative yuan with up to 2 decimals");
  }
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return {
    title,
    description: draft.description.trim(),
    priceCents: createCents(cents),
  };
}

export function toListingCard(listing: Listing): ListingCard {
  return {
    id: listing.id,
    title: listing.title,
    priceCents: listing.priceCents,
    status: listing.status,
    version: listing.version,
  };
}
```

`createCents` 的单次断言发生在运行时值域检查之后，只建立品牌，不更改数值。

## 7. 邻里集市集成案例

完整文件 `ts-lab/src/contracts-demo.ts`：

```ts
import {
  createCents,
  draftToCommand,
  toListingCard,
  type Listing,
  type ListingDraft,
  type ListingPatch,
} from "./contracts.js";

const draft: ListingDraft = {
  title: "  阅读灯  ",
  description: "暖光，可调亮度",
  priceYuan: "19.90",
};
const command = draftToCommand(draft);

const listing: Listing = {
  id: "listing-1",
  title: command.title,
  description: command.description,
  priceCents: command.priceCents,
  status: "available",
  ownerId: "user-1",
  version: 1,
  createdAt: "2026-10-11T08:00:00.000Z",
};
const patch: ListingPatch = {
  version: listing.version,
  priceCents: createCents(1500),
};
const card = toListingCard(listing);

console.log(`${command.title}:${command.priceCents}`);
console.log(JSON.stringify(card));
console.log(`patch-version=${patch.version}, patch-price=${patch.priceCents}`);

for (const value of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
  try {
    createCents(value);
  } catch (error) {
    console.log(error instanceof Error ? error.message : "unknown failure");
  }
}
```

运行：

```bash
pnpm typecheck:all
pnpm build
node dist/contracts-demo.js
```

完整输出：

```text
阅读灯:1990
{"id":"listing-1","title":"阅读灯","priceCents":1990,"status":"available","version":1}
patch-version=1, patch-price=1500
cents must be a non-negative safe integer
cents must be a non-negative safe integer
cents must be a non-negative safe integer
```

投影通过显式构造丢弃 `ownerId/description/createdAt`，不是依赖工具类型在运行时删字段。
这个 `listing` 是受控源码夹具；网络数据必须经过下一单元解析。

## 8. 常见错误与排查路径

**明确错误示例：**

```ts
type BrokenPatch = Partial<Listing>;
const broken: BrokenPatch = {
  id: "another-id",
  ownerId: "attacker",
  version: 999,
};
```

类型允许了不应由用户修改的字段。另一个错误是用 `parseFloat("19.90abc")` 得到 19.9，
再乘 100；输入尾随文字已被静默丢失。

| 项目 | 记录 |
| --- | --- |
| 现象 | 更新请求可携带 `ownerId`；非法金额文字被截断接受 |
| 证据 | `BrokenPatch` 编译通过；`parseFloat` 返回有限数字 |
| 原因 | 从完整资源做宽泛可选；转换前没有验证整个字符串 |
| 修复 | 从可编辑字段白名单构造补丁；先严格匹配再按字符串拆分 |
| 复验 | `ownerId` 无法进入 `ListingPatch`；尾随文字、指数和三位小数均拒绝 |

不能用双重断言把普通数字变成 `Cents`。若值来自 JSON，先检查运行时类型和值域，
再调用 `createCents`。

## 9. 课后题

1. `Cents` 能否阻止服务端收到负数？
2. 为什么表单草稿的金额是字符串？
3. `ListingCard` 为什么不使用 `Partial<Listing>`？
4. `version` 为什么必须进入补丁但不能由前端随意递增？

答案：

1. 不能；品牌只约束可信源码，所有服务边界都要重新校验。
2. 用户输入会暂时为空或只有小数点，尚未形成有效金额。
3. 卡片有确定字段，`Partial` 会让每个字段都不确定且语义含糊。
4. 它携带读到的版本供后端原子比较；最新版本由持久化层决定。

## 10. 实践练习

**基础**：验证 `"0"`、`"2.5"`、`""`、`"1e2"` 和 `"01"`。

参考结果：前两项分别得到 0、250；后三项拒绝。

**进阶**：新增只用于查询列表的投影：

```ts
export type ListingSearchRow = Pick<
  Listing,
  "id" | "title" | "priceCents" | "status"
>;

export function toSearchRow(listing: Listing): ListingSearchRow {
  return {
    id: listing.id,
    title: listing.title,
    priceCents: listing.priceCents,
    status: listing.status,
  };
}
```

参考标准：函数显式构造新对象；名称不暗示完整 Listing。

**故障注入**：临时把 `editableListingKeys` 加入 `"ownerId"`。类型本身可能接受该键，
但业务审查必须失败；恢复白名单并说明“类型正确”不等于“权限策略正确”。

## 11. 阶段验收

- [ ] 完整类型包含统一契约要求的所有字段。
- [ ] 草稿、创建命令、完整资源、补丁和投影名称及用途分开。
- [ ] 0 分构造成功，负数、小数和超安全整数失败。
- [ ] 严格元文本解析不接受指数、尾随文字和多余前导零。
- [ ] 补丁只包含三项可编辑字段和必需版本。
- [ ] 投影通过运行时代码实际删去不需要字段。
- [ ] 单次品牌断言紧跟值域检查，没有双重断言。
- [ ] 能说明预约唯一性仍需服务端事务或数据库约束。

## 12. 常见问题

**每种数字都要品牌吗？**

不需要。只在单位混淆或“已验证/未验证”边界确实频繁出错时使用。

**前端可以把 `ownerId` 从类型中删掉来实现授权吗？**

不能。隐藏字段减少误用，但真正授权必须依据服务端会话和资源所有者。

**`details?: unknown` 为什么不直接写对象？**

不同错误的详情形状不同；调用方在读取具体字段前要按错误代码继续解析。

**创建命令需要 `status` 吗？**

本课程由服务端把新商品设为初始状态，客户端不通过表单决定任意状态。

## 13. 扩展阅读

资料快照：2026-10-11。

- [TypeScript：Creating Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [TypeScript：`unique symbol`](https://www.typescriptlang.org/docs/handbook/symbols.html#unique-symbol)
- [TypeScript：Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [TypeScript：`satisfies` Operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
- [MDN：Number.isSafeInteger](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger)
- [HTTP Semantics：201 Created](https://www.rfc-editor.org/rfc/rfc9110.html#name-201-created)

兼容边界：类型契约是课程共享语言，不是自动生成的服务端验证、OpenAPI 或数据库约束。
真实 API 联调与 schema 库选型不在本单元验证范围。

## 我现在能做到什么

我能按用途拆分领域数据，用受控构造建立整数分，并以允许列表定义投影和更新契约，
而不让表单或客户端类型伪造服务端字段。

## 单元导航

- 上一单元：[章入口](../08-typescript-domain-design.md)
- 下一单元：[`unknown`、运行时解析器与错误路径](./02-unknown-runtime-parsers-errors.md)
