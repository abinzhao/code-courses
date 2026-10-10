# 泛型、工具类型与健全性边界：保存关系，不伪造事实

## 任务卡

- **任务**：用泛型保存分页输入与输出关系，并审查工具类型和断言的运行时边界。
- **产出**：完整文件 `ts-lab/src/generics.ts`。
- **运行**：复用严格配置，执行双线类型检查、TS 7 构建和 Node 运行。
- **完成证据**：映射后的类型、分页元数据、空集合、输入未修改和完整输出。
- **边界**：泛型、`readonly`、`Pick`、`Omit`、`Partial` 都会被擦除，不验证网络响应。

## 1. 任务背景

邻里集市的列表接口返回商品分页，界面只需要标题和格式化价格。如果为每种项目复制
一份分页类型，页码、页容量和总数容易漂移；如果直接用 `unknown[]` 或宽泛对象，
又会失去项目字段关系。

泛型适合表达“输入项目是 `T`，投影函数把它变成 `U`，输出项目因此是 `U`”。
它不适合让调用者随意指定网络 JSON 的类型。可靠抽象必须保存已有证据，而不是制造证据。

## 2. 学习目标

完成后你能：

1. 用类型参数保存参数、回调和返回值之间的关系；
2. 让只读参数阻止函数通过该引用修改输入；
3. 选择 `type`、`interface`、索引访问和 `as const`；
4. 解释 `Pick`、`Omit`、`Partial` 的适用范围；
5. 识别不安全的 `fetchJson<T>`、断言和非空断言。

## 3. 预备知识

需要掌握数组 `map`、对象展开、联合类型和严格空值检查。先运行：

```bash
pnpm typecheck:all
```

本单元的 `Page<T>` 是通用分页结构；其中项目是否是完整 `Listing`，取决于进入函数前
是否已经通过运行时解析。类型参数不会补充缺失字段。

## 4. 核心理论

### 4.1 泛型要表示真实关联

`first<T>(items): T | undefined` 保留元素类型，也保留空集合边界。
`mapPage<T, U>` 的投影函数决定输出项目类型。若类型参数只出现一次，或只是为了避开
具体类型，可能不需要泛型。

### 4.2 `readonly` 是编译期调用契约

`readonly T[]` 阻止函数对该参数调用 `push` 或重写下标，但运行时数组没有自动冻结。
另一个可写别名仍可修改它，普通 JavaScript 也不受该类型约束。需要运行时不可变时，
应根据真实风险选择复制、冻结或封装，而不是过度承诺。

### 4.3 `type` 与 `interface`

两者都能描述对象。`interface` 支持声明合并和面向对象扩展；`type` 还能直接表达联合、
元组和映射组合。本卷用 `type` 统一状态联合，并不规定所有项目只能使用一种。
选择应遵循已有代码和扩展需求。

### 4.4 工具类型只变换静态形状

`Pick` 选择已知字段，`Omit` 排除已知字段，`Partial` 把属性设为可选。
它们不会在运行时删除字段、校验金额或限制攻击者发送额外键。
尤其不能把 `Partial<Listing>` 直接当 PATCH 契约：它会放开 `id`、`ownerId`、
`createdAt` 等服务端字段。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 健全性边界 |
| --- | --- | --- |
| `<T, U>` | 表达输入与输出关系 | 不检查运行时值 |
| `readonly T[]` | 禁止通过该参数改数组 | 不冻结对象和其他别名 |
| `keyof` | 取得已知键联合 | 运行时仍是普通字符串 |
| `T[K]` | 读取属性对应类型 | 要求键已受约束 |
| `as const` | 保留字面量并设为只读 | 不验证外部数据 |
| `satisfies` | 检查表达式符合目标 | 保留表达式自身较窄类型 |
| `Pick<T, K>` | 选择字段 | 不从运行时对象删字段 |
| `Omit<T, K>` | 排除字段 | 不阻止请求携带额外字段 |
| `Partial<T>` | 所有字段可选 | 不等于合法更新命令 |

## 6. 最小可运行案例

创建完整文件 `ts-lab/src/generics.ts`：

```ts
type ListingStatus = "available" | "reserved" | "sold";

type ListingSummary = {
  id: string;
  title: string;
  priceCents: number;
  status: ListingStatus;
};

type Page<T> = {
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
};

type ListingCard = Pick<ListingSummary, "id" | "title" | "priceCents">;
type EditableListing = Pick<ListingSummary, "title" | "priceCents">;
type ListingDraft = Partial<EditableListing>;

const statuses = ["available", "reserved", "sold"] as const;
type StatusFromValues = (typeof statuses)[number];

function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}

function mapPage<T, U>(
  source: Page<T>,
  project: (item: T) => U,
): Page<U> {
  return {
    items: source.items.map(project),
    page: source.page,
    pageSize: source.pageSize,
    total: source.total,
  };
}

function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("invalid cents");
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

const source: Page<ListingSummary> = {
  items: [
    { id: "a", title: "台灯", priceCents: 1990, status: "available" },
    { id: "b", title: "书架", priceCents: 5000, status: "reserved" },
  ],
  page: 1,
  pageSize: 20,
  total: 2,
};

const cards = mapPage(source, (item): ListingCard => ({
  id: item.id,
  title: item.title,
  priceCents: item.priceCents,
}));
const labels = mapPage(cards, (item) => `${item.title} ¥${formatCents(item.priceCents)}`);
const draft: ListingDraft = { title: "阅读灯" };
const status: StatusFromValues = "available";

console.log(first(labels.items) ?? "empty");
console.log(`page=${labels.page}, total=${labels.total}`);
console.log(`source-title=${source.items[0]?.title}`);
console.log(`draft-price=${draft.priceCents ?? "unchanged"}`);
console.log(`status=${status}`);
```

运行：

```bash
pnpm typecheck:all
pnpm build
node dist/generics.js
```

完整输出：

```text
台灯 ¥19.90
page=1, total=2
source-title=台灯
draft-price=unchanged
status=available
```

`first` 没有假定集合非空；`mapPage` 创建新项目数组并保留元数据，不修改 `source`。
`ListingDraft` 只表示界面可能尚未填全，不表示可以直接提交给服务端。

## 7. 邻里集市集成案例

集成时先由解析器产生 `Page<Listing>`，再做投影：

```text
unknown JSON
  → parseListingPage
  → Page<Listing>
  → mapPage
  → Page<ListingCard>
  → 渲染
```

不要把顺序倒成“先用泛型声明是 `Page<Listing>`，然后跳过解析”。正确的网络入口应返回
`Promise<unknown>`，成功读取后交给解析器：

```ts
async function readUnknown(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

这段函数只处理网络状态和 JSON 解码，不声称返回领域对象。第 08 章的解析器拥有
`unknown → Page<Listing>` 的准入责任。

更新命令也应从可编辑白名单构造，而不是 `Partial<Listing>`：

```ts
type ListingPatch = {
  version: number;
} & Partial<Pick<ListingSummary, "title" | "priceCents">>;
```

运行时仍须拒绝额外字段，并由后端核对身份与版本。

## 8. 常见错误与排查路径

**明确错误示例，不得作为有效读取器：**

```ts
async function unsafeFetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  return response.json() as T;
}
```

调用者可写 `unsafeFetchJson<ListingSummary[]>`，但响应可能是错误对象、`null` 或字符串金额。
断言只让编译器接受，没有建立任何字段证据。

另一个错误是：

```ts
function unsafeFirst<T>(items: readonly T[]): T {
  return items[0]!;
}
```

空数组时仍返回 `undefined`，签名却谎称一定有 `T`。

| 项目 | 记录 |
| --- | --- |
| 现象 | 类型检查通过，但页面读取 `title` 时异常 |
| 证据 | Network 响应是 `{ "code": "FAILED" }`；读取器使用泛型断言 |
| 原因 | 泛型把调用者愿望写进返回类型，没有解析运行时值 |
| 修复 | 返回 `unknown`，检查 HTTP/JSON 后调用领域解析器 |
| 复验 | 错误体进入错误分支；合法分页通过解析后才能投影 |

不要把修复写成双重断言，也不要将 `Partial<Listing>` 扩大为“什么都能更新”。

## 9. 课后题

1. 为什么 `mapPage` 需要两个类型参数？
2. `readonly` 参数是否让原数组在运行时冻结？
3. `as const` 为什么不适合验证服务器状态？
4. `Omit<Listing, "ownerId">` 是否会从运行时对象移除 `ownerId`？

答案：

1. 输入元素 `T` 与投影结果 `U` 可以不同，返回页必须保存这种关系。
2. 不会，它只限制经过该静态类型的写操作。
3. 它只收窄源码字面量，服务器值仍是运行时输入。
4. 不会；它只创建静态类型，实际映射仍要显式构造对象。

## 10. 实践练习

**基础**：使用 `mapPage` 得到只含 `id/title` 的结果，并预先写出类型。

参考答案：

```ts
type TitleRow = Pick<ListingSummary, "id" | "title">;
const rows = mapPage(source, (item): TitleRow => ({
  id: item.id,
  title: item.title,
}));
```

**进阶**：写通用的安全属性读取器：

```ts
function getProperty<T, K extends keyof T>(value: T, key: K): T[K] {
  return value[key];
}

console.log(getProperty(source.items[0], "title"));
```

参考标准：先检查第一项不是 `undefined`，不能靠非空断言。可写：

```ts
const item = first(source.items);
if (item !== undefined) console.log(getProperty(item, "title"));
```

**故障注入**：把 `mapPage` 内部改为 `source.items.push(...)`。只读类型应阻止编译；
恢复纯映射后，比较运行前后 `source` 内容一致。

## 11. 阶段验收

- [ ] `generics.ts` 在 TS 7 和 TS 6 兼容命令下通过。
- [ ] 完整输出逐行匹配，空集合路径有明确结果。
- [ ] 分页映射保留 `page/pageSize/total`。
- [ ] 输入数组与输入记录未被修改。
- [ ] 可解释 `type` 与 `interface` 的选择而不制造绝对规则。
- [ ] 工具类型只用于明确白名单，不冒充运行时过滤。
- [ ] 网络读取器返回 `unknown`，解析器拥有准入责任。
- [ ] 有效实现没有 `any`、双重断言和无理由非空断言。

## 12. 常见问题

**泛型越多越复用吗？**

不是。只有真实变化且需要保存关系时才使用类型参数；过多参数会隐藏简单契约。

**可以让 `Page<T>` 的 `items` 使用可写数组吗？**

可以，但只读输入能表达转换函数不应修改来源。输出需要修改时再明确创建可写副本。

**品牌类型是不是泛型的替代品？**

不是。品牌区分同底层类型的已验证语义，泛型保存多个类型位置之间的关系。

**为什么不用一个通用深度 `Partial`？**

深度可选会制造大量非法中间状态，也不会增加运行时校验。应按具体表单和命令建模。

## 13. 扩展阅读

资料快照：2026-10-11。

- [TypeScript：Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [TypeScript：Creating Types from Types](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [TypeScript：Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [TypeScript：Indexed Access Types](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)
- [TypeScript：Type Compatibility / Soundness](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#a-note-on-soundness)
- [MDN：Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

兼容边界：示例说明 TypeScript 类型关系，不宣称浏览器 `fetch`、真实 API 或第三方 schema
库已完成联调。运行时领域准入在下一章验证。

## 我现在能做到什么

我能用泛型保存真实的数据关系，用工具类型表达明确白名单，并识别“类型看似漂亮、
运行时没有证据”的不安全 API。

## 单元导航

- 上一单元：[联合、收窄与状态建模](./02-unions-narrowing-state-modeling.md)
- 下一单元：[第 08 章入口](../08-typescript-domain-design.md)
