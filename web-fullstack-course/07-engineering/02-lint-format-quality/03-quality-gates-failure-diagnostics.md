# 独立质量门：红绿实验与失败诊断

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 建立五个命名清楚的独立门，并组合 fail-fast `quality` |
| 可观察产出 | 最终 scripts、四类红绿实验、逐层失败账本 |
| 运行条件 | 前两课配置均为绿色，TS 7 CLI 与 TS 6 兼容 CLI/API 可用 |
| 建议时间 | 120 分钟 |
| 完成证据 | 各门退出码、文件与行列、规则或诊断号、修复和聚合复验 |

## 1. 任务背景

一个名为 `check` 的脚本如果同时输出十几屏日志，失败时很难判断是谁负责。更严重
的是，团队可能只看到末尾“构建成功”，却没有注意构建前根本没运行类型检查。

本课把格式、Lint、TS 7 和 TS 6 兼容检查保留为独立入口，再用 `&&` 组合
fail-fast `quality`。聚合入口方便 CI，独立入口负责诊断。每个失败都要能回答：

```text
哪个工具失败 -> 退出码是多少 -> 哪个文件哪一行
-> 哪条规则或诊断 -> 根因是什么 -> 最小修复 -> 重跑哪条命令
```

绿色不是目标本身。删除断言、禁用规则、放宽类型或在脚本末尾加 `|| true` 都会
破坏门禁发现问题的能力。本课用真实红灯证明每个门确实拥有自己的责任。

## 2. 学习目标

完成本课后，你应能：

- 分别定义 `format:check`、`lint`、`typecheck`、`typecheck:compat` 和
  `typecheck:all`；
- 使用 `&&` 组合 fail-fast `quality`，并解释短路顺序；
- 读取工具名、退出码、文件、行列、规则名或 TypeScript 诊断号；
- 为格式漂移、未使用代码、`debugger` 和类型错误执行红绿实验；
- 在双编译器聚合短路时，仍分别运行两条编译器命令保存证据；
- 区分根因修复、配置修复和制造假绿色；
- 说明静态质量门无法证明的业务、浏览器、后端和生产边界。

## 3. 预备知识

先完成[Prettier 范围](01-prettier-format-scope.md)与
[ESLint flat config](02-eslint-flat-config-typescript.md)。进入个人项目并确认基线：

```bash
cd "$HOME/code/market-engineering-lab"
pnpm exec prettier --version
pnpm exec eslint --version
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec node --input-type=module -e 'import ts from "typescript"; console.log(ts.version)'
```

预期依次包含 `3.9.10`、`v10.12.0`、`Version 7.0.2`，以及两次相同的 `6.0.x`
兼容编译器/API 版本。任一探针失败都先修复对应安装或别名，不通过改脚本顺序掩盖。

再确认错误实验开始前的工作区状态：

```bash
git status --short
```

若个人练习目录没有 Git 基线，先把将修改的探针文件复制到 `/tmp`。每次只注入
一种错误，恢复绿色后再做下一种，否则第一条失败会遮挡后续证据。

## 4. 核心理论

### 4.1 独立门定义责任

| 门 | 所有者问题 | 典型证据 | 不能代替 |
| --- | --- | --- | --- |
| `format:check` | 文件是否按固定 Prettier 版本排版 | 不同文件列表、退出码 | Lint、类型、行为 |
| `lint` | 是否出现禁止的静态模式 | 文件/行列/规则名 | 业务算法、运行时 JSON |
| `typecheck` | TS 7 类型关系是否成立 | `TSxxxx` 诊断 | TS 6 API 工具兼容 |
| `typecheck:compat` | TS 6 兼容编译器是否接受交集配置 | 独立版本和诊断 | TS 7 主线 |
| `typecheck:all` | 两条编译器路径是否依次通过 | 两条子命令退出结果 | Lint 和运行行为 |

脚本名必须说明所有者。`check`、`validate` 之类的泛称不能替代上述命名门；
聚合入口可以叫 `quality`，但日志必须保留每个子命令名称。

### 4.2 Fail-fast 是诊断顺序，不是覆盖证明

Shell 的 `a && b && c` 只在前一项退出 `0` 时执行下一项。把最快、最基础的
格式检查放前面，可以尽早反馈；随后运行 Lint 和双编译器。

```text
format:check -> lint -> typecheck -> typecheck:compat
```

若格式先失败，聚合日志没有 TypeScript 输出，只能说明后续未执行，不能记录为
“TypeScript 通过”。修复第一层后要重跑聚合，最终绿色才证明这一次顺序全部走完。

`typecheck:all` 内部也会在 TS 7 失败时停止，故障实验要分别运行 `typecheck` 与
`typecheck:compat`，不能根据第一条诊断猜测另一条结果。

### 4.3 退出码是机器契约

终端文字给人阅读，退出码给 shell 和 CI 判断。`0` 表示该命令按自身契约成功；
非零表示失败类别。不能用 `|| true`、无条件 `exit 0` 或吞异常让失败变绿。

错误记录至少保存：

1. 完整命令和工具版本；
2. 非零退出码；
3. 第一条指向项目文件的诊断；
4. 规则名或 TypeScript 诊断号；
5. 注入改动、最小修复与复验命令。

不同终端的颜色和摘要文案可以变化，文件、规则、诊断号和退出码更适合稳定比较。

### 4.4 根因修复不能改变问题定义

未使用变量确实无用途时应删除；固定接口中有意未用的参数才按团队约定加下划线。
字符串 `"1990"` 不能通过 `as number` 强行变成整数分；外部值必须保持 `unknown`
直到运行时解析。格式漂移应由固定版本改写并审查，不把文件加入忽略来逃避。

测试失败时也不能删除断言或把预期改成错误实现。测试不在本课静态 `quality`
脚本内，第 05 章会建立行为门；本课仍要明确静态绿色不能证明金额除数正确。

### 4.5 静态门外仍有多层证据

即使四层全部绿色，下列问题仍可能存在：

- `formatCents` 把分除以 `1000`，类型仍成立；
- `number` 是小数、`NaN`、无穷值或负数，运行时值域不合法；
- 外部 JSON 被类型断言绕过，没有从 `unknown` 解析；
- 页面按钮存在但没有行为，生产资源路径错误；
- 后端未执行对象授权、预约事务或冲突控制；
- 托管 CI、TLS、缓存和回滚没有真实运行。

因此 `quality` 是静态质量门，不是“生产已验证”的别名。

## 5. 元素、属性、API 或配置清单

| 脚本、命令或字段 | 精确定义 | 失败所有者 |
| --- | --- | --- |
| `format` | `prettier . --write` | 有副作用，只用于本地明确改写 |
| `format:check` | `prettier . --check` | Prettier 格式范围 |
| `lint` | `eslint . --max-warnings 0` | ESLint 规则和配置 |
| `typecheck` | `tsc --noEmit` | TS 7 主 CLI |
| `typecheck:compat` | `tsc6 --noEmit` | TS 6 兼容 CLI |
| `typecheck:all` | `pnpm typecheck && pnpm typecheck:compat` | 双编译器顺序 |
| `quality` | `pnpm format:check && pnpm lint && pnpm typecheck:all` | 静态聚合门 |
| `--max-warnings 0` | 任一 warning 也非零退出 | 不允许积累未解释警告 |
| `--noEmit` | 只检查，不生成 JS | 不替代 Vite build |
| `$?` | 最近一条命令退出码 | 记录后再执行其他命令 |
| `TS2322` | 常见赋值类型不兼容诊断 | 以实际行列和两版输出为准 |
| `@typescript-eslint/no-unused-vars` | TS 未使用变量规则 | 删除死代码或解释固定接口 |
| `no-debugger` | 禁止调试断点残留 | 删除断点，不整文件禁用 |

## 6. 最小可运行案例

### 6.1 写入最终脚本

用 pnpm 的结构化清单命令增加或覆盖脚本：

```bash
pnpm pkg set 'scripts.format=prettier . --write'
pnpm pkg set 'scripts.format:check=prettier . --check'
pnpm pkg set 'scripts.lint=eslint . --max-warnings 0'
pnpm pkg set 'scripts.typecheck=tsc --noEmit'
pnpm pkg set 'scripts.typecheck:compat=tsc6 --noEmit'
pnpm pkg set 'scripts.typecheck:all=pnpm typecheck && pnpm typecheck:compat'
pnpm pkg set 'scripts.quality=pnpm format:check && pnpm lint && pnpm typecheck:all'
```

对应 `package.json` 的 scripts 结果必须包含：

```json
{
  "scripts": {
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "typecheck:compat": "tsc6 --noEmit",
    "typecheck:all": "pnpm typecheck && pnpm typecheck:compat",
    "quality": "pnpm format:check && pnpm lint && pnpm typecheck:all"
  }
}
```

这是 scripts 片段，不是让读者删除原有 `dev`、`build`、`preview` 或依赖。`pnpm pkg
set` 会保留其他键；执行后用 `git diff -- package.json` 审查实际变化。

### 6.2 创建绿色探针

完整文件 `src/quality-probe.ts`：

```ts
export const qualityProbe = {
  label: "green",
  priceCents: 1990,
};
```

先格式化一次并逐门运行：

```bash
pnpm exec prettier src/quality-probe.ts --write
pnpm format:check
pnpm lint
pnpm typecheck
pnpm typecheck:compat
pnpm typecheck:all
pnpm quality
```

预期每条命令退出 `0`。Prettier 会打印全部匹配文件符合格式；ESLint 与两个编译器
成功时通常没有源码诊断；pnpm 会显示正在执行的子脚本。若项目中已有其他错误，
先按文件路径判断是否为本课回归，不删除无关用户源码或放宽规则。

## 7. 邻里集市集成案例

保留第 01 章的安全金额函数。完整文件 `src/money.ts`：

```ts
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("expected non-negative safe integer cents");
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
```

第 01 章列表入口没有 `#app`，本课切换为单商品质量探针时必须同时完整替换 `index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>邻里集市质量门禁</title>
  </head>
  <body>
    <main>
      <p>本地静态教学数据</p>
      <h1>邻里集市</h1>
      <div id="app"></div>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

完整文件 `src/main.ts`：

```ts
import { formatCents } from "./money";

type Listing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: "available" | "reserved" | "sold";
  ownerId: string;
  version: number;
  createdAt: string;
};

const listing: Listing = {
  id: "listing-1",
  title: "台灯",
  description: "源码内教学数据，自提",
  priceCents: 1990,
  status: "available",
  ownerId: "user-1",
  version: 1,
  createdAt: "2026-10-11T08:00:00.000Z",
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("missing #app");
}

const heading = document.createElement("h2");
const price = document.createElement("p");
heading.textContent = listing.title;
price.textContent = `价格：${formatCents(listing.priceCents)} 元`;
app.replaceChildren(heading, price);
```

执行：

```bash
pnpm exec prettier index.html src/money.ts src/main.ts --write
pnpm quality
pnpm build
pnpm preview
```

预期 `quality` 和 `build` 退出 `0`，预览终端给出本机 URL。浏览器显示“台灯”和
“价格：19.90 元”。按 `Ctrl+C` 停止预览。这里的 Listing 是源码内教学对象，
不是网络数据；若改成 `response.json()`，结果必须先声明为 `unknown` 并运行时解析。

`pnpm build` 成功只增加“生产产物可生成”的证据。它不替代本课独立门，也不证明
浏览器交互、真实 API、认证、事务或部署正确。

## 8. 常见错误与排查路径

### 8.1 四类红绿实验

每次实验都覆盖完整 `src/quality-probe.ts`，只保留一种故障；恢复绿色后再继续。

#### 实验 A：格式漂移

故意写成：

```ts
export const qualityProbe={label:"format-red",priceCents:1990}
```

运行：

```bash
pnpm format:check
printf 'exit=%s\n' "$?"
```

预期退出 `1`，警告列出 `src/quality-probe.ts`。修复与复验：

```bash
pnpm exec prettier src/quality-probe.ts --write
pnpm format:check
```

审查 diff，确认只有排版变化。

#### 实验 B：未使用代码

故意写成已经格式化的内容：

```ts
export const qualityProbe = { label: "lint-unused-red", priceCents: 1990 };
const stalePrice = 1990;
```

运行：

```bash
pnpm lint
printf 'exit=%s\n' "$?"
```

预期退出 `1`，包含文件行列和 `@typescript-eslint/no-unused-vars`。删除
`stalePrice`，重跑 `pnpm lint` 应退出 `0`。不要改名为 `_stalePrice` 伪装用途。

#### 实验 C：`debugger`

故意写成：

```ts
export const qualityProbe = { label: "lint-debugger-red", priceCents: 1990 };
debugger;
```

运行 `pnpm lint`，预期退出 `1` 并报告 `no-debugger`。删除断点后复验，不使用
`eslint-disable` 包住文件。

#### 实验 D：类型不匹配

故意写成：

```ts
export const qualityProbe: { label: string; priceCents: number } = {
  label: "type-red",
  priceCents: "1990",
};
```

分别运行：

```bash
pnpm typecheck
printf 'ts7_exit=%s\n' "$?"
pnpm typecheck:compat
printf 'ts6_exit=%s\n' "$?"
```

预期两条命令都非零退出，并在赋值行报告类似 `TS2322` 的字符串不能赋给 number。
两版诊断文字可能不同，必须分别保存。修复是恢复整数 `1990`；网络字符串则应在
`unknown` 边界严格解析，不能写 `as number`。

最后把探针恢复为第 6 节绿色内容并执行：

```bash
pnpm quality
printf 'quality_exit=%s\n' "$?"
```

预期完整运行格式、Lint、TS 7、TS 6 兼容检查，最终 `quality_exit=0`。

### 8.2 失败诊断账本

| 注入 | 所属工具 | 预期退出 | 文件/行列 | 规则或诊断 | 根因 | 最小修复 | 复验 |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| 格式漂移 | Prettier | `1` | `src/quality-probe.ts` | 格式警告 | 打印结果不一致 | 单文件 `--write` 并审查 diff | `pnpm format:check` |
| `stalePrice` | ESLint | `1` | 实际声明行 | `@typescript-eslint/no-unused-vars` | 死代码 | 删除无用途声明 | `pnpm lint` |
| `debugger` | ESLint | `1` | 实际断点行 | `no-debugger` | 调试残留 | 删除断点 | `pnpm lint` |
| `"1990"` | TS 7 | 非零 | 实际赋值行 | `TS2322` 或实测编号 | 字符串赋给 number | 恢复整数或解析外部值 | `pnpm typecheck` |
| `"1990"` | TS 6 兼容 CLI | 非零 | 实际赋值行 | 独立实测诊断 | 兼容路径同样拒绝 | 同上，不删除兼容门 | `pnpm typecheck:compat` |

### 8.3 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | `pnpm quality` 在类型阶段停止，未看到 TS 6 兼容命令完成 |
| 证据 | 格式和 Lint 已退出 `0`；TS 7 在字符串金额行报告 `TS2322`；聚合总退出非零 |
| 原因 | `priceCents` 要求 number，却写入字符串；`&&` 使 TS 7 失败后不再执行 TS 6 |
| 修复 | 源码内恢复安全整数 `1990`；若来自网络，从 `unknown` 严格解析，不用类型断言 |
| 复验 | 分别运行两条 typecheck 均退出 `0`，随后 `typecheck:all` 与 `quality` 完整退出 `0` |

### 8.4 不能接受的“修复”

- 把 `format:check` 改成 `prettier . --write` 让 CI 修改源码；
- 给 `lint` 加 `|| true`；
- 用整文件 `eslint-disable` 隐藏新错误；
- 把 `priceCents` 改成 `any` 或 `"1990" as unknown as number`；
- 删除 `typecheck:compat`，只因为 TS 7 通过；
- 把错误金额测试预期改成错误结果；
- 把全部失败统称为“check 挂了”而不记录所有者。

## 9. 课后题

1. `quality` 因格式失败而停止，能否声称 Lint 和类型检查也失败？
2. 为什么 `typecheck:all` 之外还保留两个单编译器脚本？
3. 构建成功为何不能替代 `typecheck`？
4. 全部静态门绿色，为何仍需金额测试和浏览器测试？

**参考答案：**

1. 不能；只能记录后续未执行。修复格式后重跑才能获得后续证据。
2. 聚合便于交付，独立脚本便于保存两版输出和定位差异。
3. Vite 主要转译 TypeScript，不执行完整类型关系检查。
4. 静态工具不知道完整业务预期，也不能证明运行时输入、交互和资源加载。

## 10. 实践练习

### 基础

从绿色基线依次运行五个命名门和 `quality`，记录每条命令、版本和退出码。

判定答案：六项均有独立记录；`typecheck:all` 日志能看到两条编译器脚本；
不能只写一句“所有 check 通过”。

### 进阶

给定日志“Prettier 退出 0，ESLint 在 `src/main.ts:18:3` 报 `no-debugger`，
类型命令没有启动”，写出最小诊断和复验顺序。

判定答案：删除该行调试断点，先 `pnpm lint`，再 `pnpm quality`；不得运行
`lint:fix` 后不审查，也不得记录类型已通过。

### 故障注入

临时把 lint 脚本改成错误版本：

```bash
pnpm pkg set 'scripts.lint=eslint . --max-warnings 0 || true'
```

注入 `debugger` 后运行 `pnpm lint`，观察诊断存在但退出码错误地变成 `0`。随后恢复：

```bash
pnpm pkg set 'scripts.lint=eslint . --max-warnings 0'
```

判定答案：恢复后同一 `debugger` 使门禁非零退出；删除断点后 `lint` 和 `quality`
恢复 `0`。记录说明 `|| true` 破坏机器契约，不是错误处理。

## 11. 阶段验收

- [ ] 五个命名门和 `quality` 均存在，脚本内容与本课一致。
- [ ] 能解释两层 `&&` 的短路顺序和未执行证据。
- [ ] 四类故障均真实报红，没有一次注入多种错误。
- [ ] 每次失败记录工具、退出码、文件/行列、规则或诊断、根因、修复和复验。
- [ ] TS 7 与 TS 6 兼容诊断分别运行并分别保存。
- [ ] 恢复后 `format:check`、`lint`、`typecheck:all` 和 `quality` 全部退出 `0`。
- [ ] 邻里集市仍显示 `1990` 分对应 `19.90` 元。
- [ ] 能列出静态门之外的行为、浏览器、后端和生产验证缺口。

## 12. 常见问题

**为什么 `quality` 不在失败后继续跑完所有门？**

本地快速门使用 fail-fast 减少噪声并尽早反馈。需要汇总所有结果的 CI 可以设计独立
并行作业，但每项仍须保留真实失败状态，不能让总作业无条件成功。

**可以新增 `lint:fix` 吗？**

可作为本地显式工具，但不能替代 `lint` 门。自动修复后必须审查 diff，并重新运行
只读门禁；CI 不应修完后把原提交报告为合格。

**两个 TypeScript 编译器总会给相同诊断吗？**

不会。课程采用共同支持的配置并记录差异；出现分歧时保存最小输入、版本和两份输出，
按迁移说明处理，不删除失败路径。

**静态门能否证明外部商品 JSON 安全？**

不能。类型声明在编译后消失，外部值必须从 `unknown` 经运行时解析器验证字段、整数分、
状态和 UTC 时间。

## 13. 扩展阅读

官方参考快照日期：**2026-10-11**。

- [pnpm run](https://pnpm.io/cli/run)
- [Prettier CLI](https://prettier.io/docs/cli)
- [ESLint 命令行接口](https://eslint.org/docs/latest/use/command-line-interface)
- [TypeScript 编译器选项](https://www.typescriptlang.org/docs/handbook/compiler-options.html)
- [Vite 的 TypeScript 边界](https://vite.dev/guide/features.html#typescript)
- [TypeScript 7.0 与 TS 6 并行兼容](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)

## 我现在能做到什么

我能把静态质量拆成命名明确的独立门，组合可诊断的 fail-fast 流程，为四类故障
保存红绿证据，并拒绝通过吞错误、禁用规则、放宽类型或删除兼容检查制造假绿色。

## 单元导航

[返回第 02 章目录](../README.md#02-lint格式与质量门禁) ·
[上一篇：ESLint 10 Flat Config](02-eslint-flat-config-typescript.md) ·
[下一课：Vite 8 构建图、Chunk 与动态导入](../03-build-assets-performance/01-vite-build-graph-chunks-dynamic-import.md)
