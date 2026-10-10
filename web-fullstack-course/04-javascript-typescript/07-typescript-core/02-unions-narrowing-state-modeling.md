# 联合、收窄与状态建模：只表达可成立的组合

## 任务卡

- **任务**：把未知金额和搜索界面建模为可穷尽处理的判别联合。
- **产出**：完整文件 `ts-lab/src/state.ts`。
- **运行**：复用上一单元严格配置，先双线类型检查，再由 TS 7 构建和 Node 执行。
- **完成证据**：未知输入分类、空列表成功态、错误态和穷尽检查的可观察输出。
- **边界**：类型收窄依赖实际运行时判断；断言不会执行检查，UI 状态也不授予后端权限。

## 1. 任务背景

外部金额在进入程序前可能是数字、文字、空值或 `NaN`。搜索页面也可能正在加载、
成功但没有商品、失败或尚未发起。如果用多个可选字段和布尔值表示这些情况，
程序会允许“正在加载且同时成功和失败”这样的矛盾组合。

联合类型的价值不是把类型写长，而是让合法状态变少、每个分支的数据更明确。
运行时判断负责把 `unknown` 缩小，判别字段负责让后续代码只读取当前分支拥有的数据。

## 2. 学习目标

完成后你能：

1. 保持外部输入为 `unknown`，通过真实检查完成收窄；
2. 使用字面量联合和判别字段表达成功或失败；
3. 区分可选属性、缺省属性与值为 `undefined`；
4. 用 `never` 让新增状态暴露遗漏分支；
5. 把空列表、`NaN` 和错误分别处理，而不是依赖真假值。

## 3. 预备知识

需要完成上一单元并保留严格配置。先确认：

```bash
pnpm typecheck:all
```

类型检查必须通过。理解 `typeof` 的局限：`typeof NaN` 是 `"number"`，
`typeof null` 是 `"object"`，数组也属于对象；单个检查不能替代完整值域规则。

## 4. 核心理论

### 4.1 `unknown` 要求先建立证据

`unknown` 可以接收任何运行时值，但不能直接做数字运算或读取属性。检查
`typeof value === "number"` 后，控制流把分支中的类型缩小为 `number`；
还要检查 `Number.isSafeInteger` 和非负，才能满足金额规则。

`any` 会关闭这条证据链。把网络值直接断言成目标类型，也只改变编译器看法，
不会改变运行时值。

### 4.2 判别联合让字段与状态绑定

成功结果有 `cents`，失败结果有 `code/message`；搜索成功有 `items`，
错误有 `message`。共同的字面量字段 `ok` 或 `phase` 让控制流知道当前分支。
这比在一个对象上放满可选属性更能排除矛盾。

### 4.3 空数据不是失败

搜索成功且 `items.length === 0` 是合法空态。失败态表示没有可信结果，
二者需要不同文案和恢复行为。类似地，0 分是有效金额，不能用 `if (cents)` 判断成功。

### 4.4 `never` 检查演进遗漏

穷尽 `switch` 后剩余值应为 `never`。新增 `"cancelled"` 状态而未增加分支时，
编译器会在 `assertNever` 调用处失败。它检查源码分支完整性，不代表运行时外部数据
一定只会出现声明过的状态；外部状态仍需解析。

## 5. 元素、属性、API 或配置清单

| 语法或 API | 用途 | 边界 |
| --- | --- | --- |
| `unknown` | 表示尚未验证的值 | 必须先收窄才能使用 |
| `typeof` | 区分基本运行时类型 | 不能识别 `NaN`、数组业务形状 |
| 字面量联合 | 限定 `"idle" \| "loading"` 等值 | 只存在于编译期 |
| 判别联合 | 让字段随判别值变化 | 判别字段必须稳定且唯一 |
| `in` | 检查属性存在并辅助收窄 | 不校验属性值和值域 |
| `Number.isSafeInteger` | 检查安全整数 | 仍需检查非负和单位 |
| `never` | 表示不可到达分支 | 不能替代外部数据解析 |
| `??` | 仅为空值使用缺省 | 不会把 0、空字符串当缺失 |

## 6. 最小可运行案例

创建完整文件 `ts-lab/src/state.ts`：

```ts
type CentsResult =
  | { ok: true; cents: number }
  | { ok: false; code: "NOT_NUMBER" | "NOT_CENTS"; message: string };

type ListingSummary = {
  id: string;
  title: string;
};

type SearchState =
  | { phase: "idle" }
  | { phase: "loading"; query: string }
  | { phase: "success"; query: string; items: readonly ListingSummary[] }
  | { phase: "error"; query: string; message: string };

function readCents(value: unknown): CentsResult {
  if (typeof value !== "number") {
    return { ok: false, code: "NOT_NUMBER", message: "cents must be a number" };
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    return {
      ok: false,
      code: "NOT_CENTS",
      message: "cents must be a non-negative safe integer",
    };
  }
  return { ok: true, cents: value };
}

function assertNever(value: never): never {
  throw new Error(`unhandled state: ${JSON.stringify(value)}`);
}

function describeState(state: SearchState): string {
  switch (state.phase) {
    case "idle":
      return "请输入搜索词";
    case "loading":
      return `正在搜索：${state.query}`;
    case "success":
      return state.items.length === 0
        ? `“${state.query}”没有结果`
        : `“${state.query}”共 ${state.items.length} 件`;
    case "error":
      return `搜索失败：${state.message}`;
    default:
      return assertNever(state);
  }
}

for (const value of [1990, 0, Number.NaN, "1990"]) {
  const result = readCents(value);
  console.log(result.ok ? `accepted=${result.cents}` : `rejected=${result.code}`);
}

const states: readonly SearchState[] = [
  { phase: "idle" },
  { phase: "loading", query: "台灯" },
  { phase: "success", query: "台灯", items: [] },
  {
    phase: "success",
    query: "书架",
    items: [{ id: "listing-2", title: "三层书架" }],
  },
  { phase: "error", query: "台灯", message: "服务暂时不可用" },
];

for (const state of states) console.log(describeState(state));
```

运行：

```bash
pnpm typecheck:all
pnpm build
node dist/state.js
```

完整输出：

```text
accepted=1990
accepted=0
rejected=NOT_CENTS
rejected=NOT_NUMBER
请输入搜索词
正在搜索：台灯
“台灯”没有结果
“书架”共 1 件
搜索失败：服务暂时不可用
```

`NaN` 在第二层值域检查被拒绝，0 分进入成功分支。空数组属于成功态，错误态有明确原因。

## 7. 邻里集市集成案例

把最小案例连接到页面状态时，保持一条单向路径：

```text
表单或网络 unknown
  → 运行时检查
  → CentsResult / 已解析分页
  → SearchState
  → describeState / 渲染
```

发起搜索时产生 `{ phase: "loading", query }`；只有通过分页解析且仍是最新请求的响应，
才能产生 `success`。网络、HTTP 或解析失败产生 `error`，但不把错误伪装成空列表。
取消旧请求时可以选择不产生用户可见错误；请求新鲜度仍由第 06 章的代次编号保证。

`SearchState` 只描述前端视图。即使状态中出现可编辑商品，也不能证明当前用户有修改权限；
后端仍要检查会话、`ownerId` 和 `version`。

可选属性适合“字段可以不存在”，不适合互斥状态。例如：

```ts
type SearchOptions = { query: string; cursor?: string };
const firstPage: SearchOptions = { query: "台灯" };
```

在精确可选属性配置下，省略 `cursor` 与强行写 `cursor: undefined` 不同。

## 8. 常见错误与排查路径

**明确错误示例：**

```ts
type BrokenState = {
  loading: boolean;
  items?: ListingSummary[];
  error?: string;
};

const impossible: BrokenState = {
  loading: true,
  items: [{ id: "x", title: "台灯" }],
  error: "request failed",
};
```

这个类型允许同时加载、成功和失败。另一个错误是：

```ts
function broken(value: unknown): number {
  return value as number;
}
```

断言没有检查 `"1990"`、`NaN` 或负数。

| 项目 | 记录 |
| --- | --- |
| 现象 | 页面同时显示加载、旧结果和错误；字符串金额进入计算 |
| 证据 | 状态对象三个字段同时有值；日志显示 `typeof value` 仍是 `string` |
| 原因 | 类型允许矛盾组合，断言只修改静态视图 |
| 修复 | 改用判别联合；外部金额经过 `readCents` |
| 复验 | 每次状态只有一个 `phase`；四种金额输入得到预期分类 |

删除 `Number.isSafeInteger` 后，`NaN` 会进入成功分支。修复应恢复运行时值域检查，
不能在下游格式化时把 `NaN` 显示成 0。

## 9. 课后题

1. 为什么 `typeof NaN === "number"` 仍不足以接受金额？
2. 空数组为什么属于成功而不是错误？
3. `state.items?.length ?? 0` 能否替代判别联合？
4. `assertNever` 是否会检查服务器返回的新状态？

答案：

1. `number` 是语言类别，金额还要求安全整数、非负和正确单位。
2. 请求和解析可能完全成功，只是当前查询没有匹配记录。
3. 不能；它把未加载、失败和合法空结果都压成 0。
4. 不能；它检查源码声明的联合分支，服务器输入仍需运行时解析。

## 10. 实践练习

**基础**：为 `readCents` 增加 `Infinity` 和 `-1` 输入，预期均为 `NOT_CENTS`。

参考答案：

```ts
for (const value of [Number.POSITIVE_INFINITY, -1]) {
  const result = readCents(value);
  console.log(result.ok ? "unexpected" : result.code);
}
```

**进阶**：增加已取消状态，并保持穷尽处理：

```ts
type ExtendedSearchState =
  | SearchState
  | { phase: "cancelled"; query: string };

function describeExtended(state: ExtendedSearchState): string {
  if (state.phase === "cancelled") return `已取消：${state.query}`;
  return describeState(state);
}
```

参考标准：取消不显示服务器故障；原四种状态输出不变。

**故障注入**：先把 `"cancelled"` 直接加入 `SearchState`，暂不修改 `describeState`。
`assertNever(state)` 应产生编译错误；补齐 `case` 后两条类型检查恢复通过。

## 11. 阶段验收

- [ ] `state.ts` 在两条编译器线上通过。
- [ ] 0、`NaN`、字符串和正常金额分别得到正确结果。
- [ ] 页面状态不使用多个互相矛盾的布尔值。
- [ ] 成功空列表与请求失败显示不同信息。
- [ ] 成功分支之外无法读取 `items`，错误分支之外无法读取 `message`。
- [ ] 新增状态会触发 `never` 处的编译失败。
- [ ] 没有 `any`、双重断言或非空断言。
- [ ] 能说明前端状态与后端授权是两种保证。

## 12. 常见问题

**所有函数都要返回判别联合吗？**

不需要。可预期的业务分支适合显式结果；真正无法继续的程序错误也可抛异常。

**为什么失败结果还要有 `code`？**

稳定代码便于程序分支，`message` 便于解释；两者都不能包含敏感服务细节。

**`in` 检查属性后就可信了吗？**

只证明属性存在；属性值仍可能类型或值域错误。

**可以用可选链让页面永不报错吗？**

可选链只停止访问，可能把契约错误隐藏成缺省显示。数据边界仍应明确拒绝。

## 13. 扩展阅读

资料快照：2026-10-11。

- [TypeScript：Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript：Everyday Types / Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)
- [TypeScript：The `never` Type](https://www.typescriptlang.org/docs/handbook/2/functions.html#never)
- [MDN：typeof](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)
- [MDN：Number.isSafeInteger](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger)

兼容边界：控制流收窄属于 TypeScript 编译行为，最终 JavaScript 只保留实际判断。
本单元未运行浏览器 DOM、真实 API 或辅助技术验证。

## 我现在能做到什么

我能让未知值在建立运行时证据后进入程序，并用判别联合表达合法界面状态；
新增状态时，编译器会指出尚未处理的分支。

## 单元导航

- 上一单元：[推断、注解与严格配置](./01-inference-annotations-strict-config.md)
- 下一单元：[泛型、工具类型与健全性边界](./03-generics-utility-types-soundness.md)
