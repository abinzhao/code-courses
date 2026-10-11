# 推断、注解与严格配置：让每条命令只证明一件事

## 任务卡

- **任务**：建立可复验的 TypeScript 双编译器实验，区分推断、边界注解、类型检查、生成和运行。
- **产出**：`ts-lab/package.json`、`ts-lab/tsconfig.json`、`ts-lab/src/main.ts` 三个完整文件。
- **运行**：Node.js 24 LTS、pnpm 12.11.2；TS 7.0.2 是主线，TS 6 只走兼容命令。
- **完成证据**：三条版本原始输出、两条类型检查结果、一次构建结果和程序完整输出。
- **边界**：类型会被擦除；通过 `tsc` 不证明网络 JSON、金额值域或权限正确。

## 1. 任务背景

邻里集市已有 JavaScript 金额函数。给每个名称补一个类型并不会自动提高可靠性：
局部常量本来就能推断，真正需要明确的是函数边界、空集合、可选字段与外部输入。
同时，“编辑器不报错”“生成了 JavaScript”“程序输出正确”是三份不同证据。

本单元从一份严格配置出发，让错误停在最靠近假设的位置。我们不会用 `any`、
双重断言或非空断言把问题移到运行时。

## 2. 学习目标

完成后你能：

1. 解释类型擦除、推断、注解和结构类型；
2. 配置 `strict`、索引检查、精确可选属性与禁止错误生成；
3. 区分 `typecheck`、`build` 和 `node` 的责任；
4. 说明 `skipLibCheck` 只影响声明文件内部，不跳过业务源码；
5. 分开记录 TS 7 主线与 TS 6 兼容证据。

## 3. 预备知识

先会创建文件、运行终端命令，并理解对象、数组、函数和 ESM。金额继续使用非负安全
整数分。开始前执行：

```bash
node --version
pnpm --version
```

目标分别为 `v24.` 开头和 `12.11.2`。若本机不同，保留原始输出；不要把后续
`npx`、版本管理器或 CI 的结果冒充全局环境。

## 4. 核心理论

### 4.1 推断与注解各有位置

`const priceCents = 1990` 足以推断局部数字。函数参数、返回值和跨模块对象是契约边界，
显式注解能阻止调用方传入不相关形状。TypeScript 采用结构类型：值只要具备要求的
属性就可参与契约，不要求由同一个类构造。

`number` 仍包含负数、小数、`NaN` 和无穷大。类型只说明 JavaScript 数值类别，
“非负安全整数分”仍要在运行时检查。

### 4.2 严格选项处理不同漏洞

- `strict` 开启一组严格检查，但不包含下面两个独立选项；
- `noUncheckedIndexedAccess` 让普通数组下标结果包含 `undefined`；
- `exactOptionalPropertyTypes` 区分属性缺省与显式 `undefined`；
- `noEmitOnError` 防止有类型错误时产生新的 JavaScript；
- `skipLibCheck` 只跳过依赖 `.d.ts` 内部一致性检查，不跳过 `src/`。

已有 `dist/` 可能是旧产物，因此“构建失败后还能运行旧文件”不是新源码通过。

### 4.3 TS 7 与 TS 6 是两条命令线

本书固定 `@typescript/native` 别名到 `typescript@7.0.2`，它提供 `tsc`。
兼容依赖键名为 `typescript`，实际包是 `@typescript/typescript6@6.0.2`，
它提供 `tsc6` 和旧编译器 API；本次锁定解析中二者报告内部版本 6.0.3。
不能把包装包版本和内部版本拼成一个虚构安装项。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 不能证明什么 |
| --- | --- | --- |
| `strict` | 启用严格空值、函数等检查 | 不校验运行时 JSON |
| `noUncheckedIndexedAccess` | 暴露越界读取 | 不证明数组业务上非空 |
| `exactOptionalPropertyTypes` | 区分缺省和显式 `undefined` | 不删除运行时字段 |
| `noEmitOnError` | 错误时不写新产物 | 不删除旧 `dist/` |
| `skipLibCheck` | 跳过依赖声明内部检查 | 不跳过自己的 `.ts` |
| `satisfies` | 检查表达式满足目标形状 | 不转换或冻结运行时值 |
| `pnpm exec tsc` | 运行 TS 7 主线编译器 | 不代表 TS 6 工具兼容 |
| `pnpm exec tsc6` | 运行旧 API 兼容编译器 | 不代表当前主线版本 |

## 6. 最小可运行案例

在个人练习目录创建 `ts-lab/src/`。以下三个文件是完整文件。

完整文件 `ts-lab/package.json`：

```json
{
  "name": "market-ts-core-lab",
  "private": true,
  "type": "module",
  "packageManager": "pnpm@12.11.2",
  "engines": {
    "node": ">=24 <25"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "typecheck:compat": "tsc6 -p tsconfig.json --noEmit",
    "typecheck:all": "pnpm run typecheck && pnpm run typecheck:compat",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/main.js"
  },
  "devDependencies": {
    "@types/node": "24.10.0",
    "@typescript/native": "npm:typescript@7.0.2",
    "typescript": "npm:@typescript/typescript6@6.0.2"
  }
}
```

完整文件 `ts-lab/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noEmitOnError": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"]
}
```

完整文件 `ts-lab/src/main.ts`：

```ts
type ListingSummary = {
  id: string;
  title: string;
  priceCents: number;
  note?: string;
};

function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("invalid cents");
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function describeListing(listing: ListingSummary): string {
  const note = listing.note === undefined ? "" : ` (${listing.note})`;
  return `${listing.title} ¥${formatCents(listing.priceCents)}${note}`;
}

const sourceRecord = {
  id: "listing-1",
  title: "台灯",
  priceCents: 1990,
  ownerId: "user-1",
};
const prices = [0, sourceRecord.priceCents];
const first = prices[0];

console.log(describeListing(sourceRecord));
console.log(first === undefined ? "missing" : formatCents(first));
console.log(`count=${prices.length}`);
```

`sourceRecord` 多出的 `ownerId` 不妨碍它满足所需结构；函数只能按参数类型读取声明字段。
数组下标必须检查，因为即使当前字面量有两项，普通数组类型也允许以后为空。

运行：

```bash
pnpm install
pnpm install --frozen-lockfile
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec node --input-type=module -e \
  'import ts from "typescript"; console.log(ts.version)'
pnpm typecheck:all
pnpm build
pnpm start
```

固定解析的版本输出依次应为 `Version 7.0.2`、`Version 6.0.3`、`6.0.3`。
程序完整输出：

```text
台灯 ¥19.90
0.00
count=2
```

## 7. 邻里集市集成案例

从最小案例逐步扩展：

1. `ListingSummary` 明确是列表投影，不冒充完整 API `Listing`；
2. `formatCents` 在运行时守住金额值域；
3. `describeListing` 在函数边界接收结构契约；
4. `note?: string` 表示可以没有该属性，不表示应显式写入 `undefined`；
5. `prices[0]` 先处理空集合，再进入金额函数；
6. 两个编译器只验证同一组语言关系，最终运行由 TS 7 生成文件承担。

若商品来自 `response.json()`，不能直接把它赋给 `ListingSummary`。网络值必须先保持
`unknown`，由第 08 章解析完整字段。这里的 `sourceRecord` 是源码内受控教学数据。

## 8. 常见错误与排查路径

**明确错误示例，不要保留在有效文件中：**

```ts
const prices: number[] = [];
console.log(prices[0].toFixed(2));

const listing: ListingSummary = {
  id: "x",
  title: "书架",
  priceCents: "5000",
  note: undefined,
};
```

第一处忽略越界，第二处混入字符串金额；在精确可选属性配置下，第三处也不等于省略
`note`。不允许改成 `prices[0]!`、无证据的双重类型断言或 `any`。

| 项目 | 记录 |
| --- | --- |
| 现象 | `pnpm typecheck` 报下标可能缺失、金额类型错误和可选属性错误 |
| 证据 | 诊断包含源码文件、行列、实际类型与目标类型；`dist/` 时间未更新 |
| 原因 | 代码把运行时不确定性和表单文字伪装成已满足契约 |
| 修复 | 检查 `undefined`；在输入边界严格解析金额；无备注时省略属性 |
| 复验 | 两条类型检查通过，重新构建后运行输出与预期完全一致 |

如果 TS 7 通过而 TS 6 失败，先保留两条原始诊断并查兼容范围；不要把脚本都改回
`tsc` 后声称双线通过。如果版本命令与预期不同，检查依赖别名和锁文件，不靠清空
所有缓存掩盖解析差异。

## 9. 课后题

1. 为什么不给 `const prices = [...]` 手写所有局部类型？
2. `strict` 是否自动启用 `noUncheckedIndexedAccess`？
3. `noEmitOnError` 为何不能证明 `dist/` 中没有旧文件？
4. TS 6 兼容检查通过是否说明项目应以 TS 6 为主线？

答案：

1. 推断已保留精确信息；边界注解比重复局部事实更有价值。
2. 不会，这个选项需显式开启。
3. 它只阻止本次写入，不负责清理此前产物。
4. 不能；它只证明该源码也满足旧 API 工具需要的兼容编译器。

## 10. 实践练习

**基础**：增加 `const last = prices[prices.length - 1]`，检查后再格式化。

参考答案：

```ts
const last = prices[prices.length - 1];
console.log(last === undefined ? "empty" : formatCents(last));
```

**进阶**：写 `subtotal(priceCents, quantity)`，两项都必须是非负安全整数，数量至少 1，
乘积也必须是安全整数。

参考答案：

```ts
function subtotal(priceCents: number, quantity: number): number {
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw new RangeError("invalid cents");
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new RangeError("invalid quantity");
  }
  const result = priceCents * quantity;
  if (!Number.isSafeInteger(result)) throw new RangeError("subtotal overflow");
  return result;
}
```

**故障注入**：把 `priceCents` 改为 `"1990"`，先确认两条类型检查都失败；再恢复数字。
完成标准是保留失败行和修复后两条零退出证据，不使用断言。

## 11. 阶段验收

- [ ] 三个完整文件位于个人 `ts-lab/`，教材仓库没有依赖产物。
- [ ] 安装后保留锁文件，并以 frozen 安装复验。
- [ ] TS 7 主线与 TS 6 兼容版本输出分开记录。
- [ ] 严格配置中的四个关键检查显式存在。
- [ ] 正常源码在两条检查线上通过，由 TS 7 构建。
- [ ] 程序三行输出逐字匹配，0 分未被当作缺失。
- [ ] 错误实验没有产生新的有效构建产物。
- [ ] 说明中没有把类型成功扩张成运行时数据可信。

## 12. 常见问题

**`skipLibCheck: true` 会让自己的类型错误消失吗？**

不会。它跳过声明文件内部检查；业务源码及其使用声明的方式仍会检查。

**为什么兼容依赖键名叫 `typescript`？**

旧式工具通常导入这个包名。别名让导入指向兼容包，同时主线 `tsc` 由另一个依赖提供。

**能只运行 `build` 吗？**

本配置下 `build` 也会检查并生成，但 CI 仍应把检查意图写清。运行生成文件又是另一关。

**类型通过后还要检查 `Number.isSafeInteger` 吗？**

要。`number` 没有表达金额单位和值域。

## 13. 扩展阅读

资料快照：2026-10-11。

- [TypeScript：Type Inference](https://www.typescriptlang.org/docs/handbook/type-inference.html)
- [TypeScript：Type Compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [TSConfig：strict](https://www.typescriptlang.org/tsconfig/strict.html)
- [TSConfig：noUncheckedIndexedAccess](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)
- [TSConfig：exactOptionalPropertyTypes](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html)
- [TypeScript 7.0 发布说明](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [pnpm：Continuous Integration / frozen lockfile](https://pnpm.io/continuous-integration)

兼容边界：本教程固定的是课程验证组合，不宣称所有依赖都已支持 TS 7 旧 API。
编辑器语言服务、Safari、Firefox 和浏览器打包器不在本单元运行证据中。

## 我现在能做到什么

我能建立严格、可复验的 TypeScript 项目，选择哪些值交给推断、哪些边界写注解，
并把 TS 7 主线、TS 6 兼容、生成和运行证据分开。

## 单元导航

- 上一单元：[章入口](../07-typescript-core.md)
- 下一单元：[联合、收窄与状态建模](./02-unions-narrowing-state-modeling.md)
