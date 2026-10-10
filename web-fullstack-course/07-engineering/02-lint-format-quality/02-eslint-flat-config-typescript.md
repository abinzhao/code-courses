# ESLint 10 Flat Config：文件作用域与 TypeScript 兼容 API

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 建立 ESLint 10 flat config，按浏览器与 Node 文件语义应用规则 |
| 可观察产出 | `eslint.config.mjs`、两类环境探针、`--print-config` 匹配证据 |
| 运行条件 | Node.js 24.21.0、pnpm 12.10.1、TS 7/TS 6 并行别名 |
| 建议时间 | 120 分钟 |
| 完成证据 | ESLint 版本、有效配置摘要、未使用变量与 `debugger` 红绿记录 |

## 1. 任务背景

邻里集市浏览器入口可以使用 `document`，资源预算脚本可以使用 `process` 和 Node
内置模块。若把浏览器与 Node 全局变量无差别地开放给全部文件，浏览器源码误用
`process` 时可能失去提示；若两类变量都不声明，合法代码又会产生噪声。

ESLint 10 使用 flat config。配置是按顺序组合的对象数组，每个对象先通过
`files` 和 `ignores` 决定是否参与，再合并语言选项与规则。正确配置需要回答：
哪些文件属于项目、文件在哪个运行环境执行、TypeScript 由谁解析、冲突规则在
哪个顺序关闭。

本课继续采用官方并行路径：`@typescript/native` 提供 TS 7 的 `tsc`，
`typescript` 包名指向 TS 6 兼容包装包。依赖旧编译器 API 的解析工具从
`import "typescript"` 获得兼容 API，不把 TS 7 CLI 成功误写成整个工具生态兼容。

## 2. 学习目标

完成本课后，你应能：

- 使用 `eslint.config.mjs`，不回退到 `.eslintrc` 或 `.eslintignore`；
- 用 `globalIgnores()` 排除依赖、构建、覆盖率和测试报告；
- 为浏览器 TypeScript 与 Node 脚本声明不同的全局变量；
- 组合 `@eslint/js`、`typescript-eslint`、`globals` 与自定义规则；
- 把 `eslint-config-prettier` 放在末尾关闭冲突规则，而不是运行 Prettier；
- 解释 TS 7 主 CLI 与 TS 6 旧 API 消费者为何必须并存；
- 判断何时需要 `projectService` 和类型感知规则；
- 使用 `--print-config`、文件路径、规则名和退出码定位匹配问题；
- 拒绝用整文件禁用、宽泛 globals 或删除兼容包制造绿色。

## 3. 预备知识

先完成[上一课](01-prettier-format-scope.md)，确认格式配置已恢复为绿色。进入个人
练习项目并执行三条编译器探针：

```bash
cd ~/course-labs/market-engineering-lab
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec node --input-type=module -e 'import ts from "typescript"; console.log(ts.version)'
```

预期第一条为 `Version 7.0.2`。后两条应报告相同的 `6.0.x` 编译器版本；课程固定的
兼容包装包清单版本是 `6.0.2`，其转导出的编译器补丁版本以实际锁文件和探针为准。
若 `tsc6` 或 API 导入失败，先回到第 01 章恢复别名，不继续配置 Lint。

## 4. 核心理论

### 4.1 Flat config 是有顺序的文件匹配

ESLint 先判断配置对象是否匹配目标文件，再把匹配对象按顺序组合。后面的规则可以
覆盖前面的同名规则。全局忽略应使用独立的 `globalIgnores()` 项，不把规则、files
和忽略混进一个难以判断作用域的对象。

本课顺序为：

```text
全局忽略
  -> 浏览器 TypeScript 推荐规则与 globals
  -> Node JavaScript 推荐规则与 globals
  -> eslint-config-prettier 关闭格式冲突
```

`eslint-config-prettier` 不会格式化文件，也不会运行 Prettier。它只关闭已知会和
Prettier 输出冲突的 ESLint 样式规则，所以必须在相关规则之后。

### 4.2 文件环境不能靠“全部放开”解决

浏览器源码允许 `window`、`document`、`AbortController` 等平台全局变量。Node
脚本允许 `process`、`Buffer` 和定时器。把
`{ ...globals.browser, ...globals.node }` 放在顶层会模糊错误运行环境。

正确修复是让路径反映职责：

- `src/**/*.ts` 是浏览器源码；
- 根目录 `*.mjs` 与 `scripts/**/*.mjs` 是 Node 配置或脚本；
- 后续测试按 Vitest 环境另建作用域；
- 同一文件确实跨环境时，先重新审视职责，而不是立刻开放所有 globals。

### 4.3 TypeScript 解析与类型检查是不同工作

`typescript-eslint` 解析 TypeScript 语法并提供规则。当前兼容组合仍需要旧式
TypeScript 编译器 API，因此依赖解析按包名找到 `typescript`，本项目把这个名字
指向 TS 6 兼容包装包。TS 7 则安装在 `@typescript/native` 别名下并提供 `tsc`。

这形成两个独立证据：

```text
pnpm lint       -> typescript-eslint + TS 6 兼容 API
pnpm typecheck  -> TS 7 原生 CLI
```

删除兼容包可能让 Lint 启动失败，即使 `tsc --noEmit` 仍然通过。反过来，Lint 通过
也不证明 TS 7 与 TS 6 编译器对全部源码给出一致诊断。

### 4.4 何时启用 `projectService`

本课使用 `tseslint.configs.recommended`，只启用不依赖完整类型信息的推荐规则，
因此不需要项目服务。`no-floating-promises` 等规则需要知道表达式的真实类型，
此时应把配置切换到类型感知集合，并明确项目服务：

```js
{
  files: ["src/**/*.ts"],
  extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
}
```

这是替换策略，不是把两套 recommended 无差别叠加。目标文件还必须被对应
`tsconfig.json` 包含。类型感知 Lint 会增加启动和分析成本，应在规则确实需要时
启用，并用 `--print-config` 和计时证据确认作用范围。

### 4.5 抑制必须比问题更小

整文件 `eslint-disable` 会隐藏未来新增错误；把 Node globals 加到所有浏览器文件
会隐藏环境错误；给真实未使用变量加下划线会伪造“有意不用”。优先删除死代码、
修正文件职责或收窄到有理由的一行。确需单行抑制时应写明不可直接表达的边界，
并在后续版本可修复时删除。

## 5. 元素、属性、API 或配置清单

| 命令、包或配置 | 课程版本或作用 | 关键边界 |
| --- | --- | --- |
| `eslint` | `10.12.0` | 使用 flat config |
| `@eslint/js` | `10.0.1` | JavaScript 推荐规则 |
| `typescript-eslint` | `8.71.1` | TS 语法解析与规则，消费兼容 API |
| `globals` | `17.13.0` | 提供浏览器和 Node 全局变量表 |
| `eslint-config-prettier` | `10.1.8` | 最后加载，只关闭格式冲突 |
| `defineConfig()` | 定义和展开 flat config | 不替代文件匹配 |
| `globalIgnores()` | 声明全局忽略模式 | ESLint 10 不使用 `.eslintignore` |
| `files` | glob 匹配配置作用域 | 相对配置文件位置解释 |
| `languageOptions.globals` | 声明运行环境全局变量 | 不应全项目混合 browser/node |
| `extends` | 组合推荐配置 | 后项可以覆盖前项 |
| `rules` | 项目明确规则 | 错误修复优先于禁用 |
| `parserOptions.projectService` | 为类型感知规则提供类型信息 | 普通 recommended 不需要 |
| `--max-warnings 0` | 警告也令门禁失败 | 既有项目迁移需单独治理方案 |
| `--print-config <file>` | 输出目标文件最终配置 | 诊断 glob、顺序和覆盖 |
| `--debug` | 输出配置查找过程 | 日志较多，只在定位时使用 |

## 6. 最小可运行案例

### 6.1 安装固定工具

```bash
pnpm add -D -E eslint@10.12.0 @eslint/js@10.0.1
pnpm add -D -E typescript-eslint@8.71.1 globals@17.13.0
pnpm add -D -E eslint-config-prettier@10.1.8
pnpm exec eslint --version
touch eslint.config.mjs src/lint-probe.ts scripts/config-probe.mjs
```

预期 ESLint 输出：

```text
v10.12.0
```

### 6.2 完整 flat config

完整文件 `eslint.config.mjs`：

```js
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/coverage/**",
    "**/playwright-report/**",
    "**/test-results/**",
    "**/src/generated/**",
  ]),
  {
    files: ["src/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "no-debugger": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["*.mjs", "scripts/**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
]);
```

完整文件 `src/lint-probe.ts`：

```ts
export function setPageLabel(label: string): void {
  document.title = label;
  console.info(`title=${document.title}`);
}
```

完整文件 `scripts/config-probe.mjs`：

```js
process.stdout.write(`node=${process.version}\n`);
```

先格式化本课文件，再运行 Lint：

```bash
pnpm exec prettier eslint.config.mjs src/lint-probe.ts scripts/config-probe.mjs --write
pnpm exec eslint src/lint-probe.ts scripts/config-probe.mjs
printf 'exit=%s\n' "$?"
node scripts/config-probe.mjs
```

ESLint 成功时不输出诊断并显示 `exit=0`；Node 脚本输出以 `node=v24.` 开头。
这证明两个文件被各自配置接受，不证明整个项目没有其他错误。

### 6.3 检查最终匹配配置

把有效配置保存到临时目录并提取关键证据：

```bash
pnpm exec eslint --print-config src/lint-probe.ts > /tmp/market-browser-eslint.json
pnpm exec eslint --print-config scripts/config-probe.mjs > /tmp/market-node-eslint.json
node --input-type=module <<'NODE'
import { readFile } from "node:fs/promises";

const browser = JSON.parse(await readFile("/tmp/market-browser-eslint.json", "utf8"));
const node = JSON.parse(await readFile("/tmp/market-node-eslint.json", "utf8"));
const configured = browser.rules["no-debugger"];
const severity = Array.isArray(configured) ? configured[0] : configured;
console.log(`browser.document=${"document" in browser.languageOptions.globals}`);
console.log(`browser.no-debugger=${severity}`);
console.log(`node.process=${"process" in node.languageOptions.globals}`);
NODE
```

预期输出：

```text
browser.document=true
browser.no-debugger=2
node.process=true
```

若某项为 `false` 或规则缺失，先检查文件路径与 `files` glob。不要把缺失的环境变量
直接加到顶层 globals；先确认该文件真实运行环境。

## 7. 邻里集市集成案例

创建完整文件 `src/listing-summary.ts`：

```ts
export type Listing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: "available" | "reserved" | "sold";
  ownerId: string;
  version: number;
  createdAt: string;
};

function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("expected non-negative safe integer cents");
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function createListingSummary(listing: Listing): HTMLElement {
  const summary = document.createElement("p");
  summary.textContent = `${listing.title}：${formatCents(listing.priceCents)} 元`;
  return summary;
}
```

执行完整证据链：

```bash
pnpm exec prettier src/listing-summary.ts --write
pnpm exec eslint src/listing-summary.ts
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec node --input-type=module -e 'import ts from "typescript"; console.log(ts.version)'
```

预期 Lint 无诊断；TS 7 输出 `Version 7.0.2`；`tsc6` 与导入 API 输出相同的
`6.0.x` 编译器版本。该文件使用 `document`，因此属于浏览器作用域。完整 Listing
保留整数分、状态、所有者、版本和 UTC 时间字段，但本例数据仍需由调用者提供。
若调用者来自网络，输入必须先保持 `unknown` 并通过运行时解析，类型别名不产生信任。

## 8. 常见错误与排查路径

### 明确错误案例：未使用代码与 `debugger`

临时在 `src/listing-summary.ts` 末尾追加：

```ts
const staleTitle = "旧标题";
debugger;
```

执行：

```bash
pnpm exec eslint src/listing-summary.ts
printf 'exit=%s\n' "$?"
```

预期退出 `1`，报告 `@typescript-eslint/no-unused-vars` 与 `no-debugger`。Prettier
不会删除这些行，TypeScript 也不负责执行团队的全部维护规则。最小修复是删除本次
注入的死代码和断点，再重跑同一命令。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | `pnpm lint` 非零退出，格式检查仍为绿色 |
| 证据 | ESLint 指向 `src/listing-summary.ts` 的两行，规则分别为 `@typescript-eslint/no-unused-vars` 和 `no-debugger` |
| 原因 | 调试残留和未使用变量违反代码规则，不是排版问题 |
| 修复 | 删除无用途变量和 `debugger`；不加整文件禁用，也不把变量改名为 `_staleTitle` 伪装有意未使用 |
| 复验 | `eslint src/listing-summary.ts` 与项目级 `eslint . --max-warnings 0` 均退出 `0` |

### 按证据选择路径

| 现象 | 先看什么 | 不接受的修复 |
| --- | --- | --- |
| 合法 `document` 报未定义 | `--print-config` 中 browser globals 与 files 匹配 | 全局加入 Node 和 browser 全集 |
| Node 脚本的 `process` 报未定义 | 脚本路径是否匹配 Node 对象 | 在浏览器源码开放 `process` |
| `.ts` 解析失败 | typescript-eslint 是否命中、兼容 API 是否可导入 | 改扩展名绕过检查 |
| Lint 启动时报 TypeScript API 错误 | 三条版本探针和锁文件 | 删除 Lint 或只保留 TS 7 |
| 规则似乎没有生效 | `--print-config <目标文件>` | 凭配置文件肉眼猜测 |
| 错误太多 | 首条本项目错误、文件作用域和迁移边界 | 整文件或全项目 `eslint-disable` |

## 9. 课后题

1. 为什么 `eslint-config-prettier` 要放在配置数组末尾？
2. 为什么浏览器与 Node globals 不应在顶层合并？
3. TS 7 的 `tsc` 通过，为什么 Lint 仍可能启动失败？
4. 何时才需要 `projectService`？

**参考答案：**

1. 后面的配置才能关闭前面启用的冲突样式规则；它本身不运行格式化。
2. 合并会让错误环境中的全局变量也被视为合法，降低运行环境诊断能力。
3. Lint 解析工具消费旧 TypeScript 编译器 API；TS 7 CLI 与该 API 是不同入口。
4. 当启用需要完整类型信息的规则时；普通语法型 recommended 不需要。

## 10. 实践练习

### 基础

新增 `scripts/runtime-info.mjs`，只输出 `process.platform`。格式化后运行 ESLint。

判定答案：文件命中 Node 作用域，Lint 退出 `0`，运行输出当前平台；不得给浏览器
TypeScript 作用域加入 `process`。

### 进阶

为准备使用 `no-floating-promises` 写出类型感知配置变更，但先不提交。说明需要
替换哪个推荐集合、增加哪两个 parserOptions 键，并检查目标文件是否属于 tsconfig。

判定答案：使用 `recommendedTypeChecked`、`projectService: true`、
`tsconfigRootDir: import.meta.dirname`；不能只加规则名后声称已有类型信息。

### 故障注入

临时把浏览器配置的 `files` 改为 `["client/**/*.ts"]`，再对
`src/lint-probe.ts` 执行 `--print-config`，记录 `no-debugger` 和 TypeScript
解析配置是否缺失；随后恢复 glob。

判定答案：证据明确显示目标文件没有命中预期对象；恢复后 `browser.document=true`
且 `no-debugger=2`。修复不得改为顶层宽泛规则或整文件禁用。

## 11. 阶段验收

- [ ] `pnpm exec eslint --version` 精确输出 `v10.12.0`。
- [ ] 配置只使用 flat config，不存在 `.eslintrc` 或 `.eslintignore` 主路径。
- [ ] 全局忽略、浏览器 TypeScript、Node 脚本和 Prettier 兼容项顺序明确。
- [ ] `--print-config` 证明 `document`、`process` 与 `no-debugger` 各自命中正确文件。
- [ ] 未使用变量和 `debugger` 同时产生可定位的非零结果，修复后转绿。
- [ ] 三条编译器/API 探针区分 TS 7 CLI、TS 6 CLI 和 TS 6 API。
- [ ] 能解释何时使用 `projectService`，未无条件开启类型感知规则。
- [ ] 未使用整文件禁用、宽泛 globals 或删除兼容包制造成功。

## 12. 常见问题

**为什么配置文件使用 `.mjs`？**

它让 Node 明确按 ESM 加载 import/export，并与项目的模块方向一致。

**`globals.browser` 会向运行时注入 `document` 吗？**

不会。它只告诉 ESLint 这些名称在目标环境由平台提供；Node 运行该文件仍没有 DOM。

**可以同时保留 `.eslintignore` 吗？**

ESLint 10 主线使用 flat config 的全局忽略。保留旧入口会造成错误预期，应把规则
迁入 `globalIgnores()` 并删除旧式配置依赖。

**为什么不直接让 `typescript` 包名指向 TS 7？**

当前解析工具需要旧编译器 API。课程把 TS 7 CLI 与兼容 API 分开，并用实际 Lint
和版本探针验证，不假设包名替换即可兼容。

## 13. 扩展阅读

官方参考快照日期：**2026-10-11**。

- [ESLint 配置文件](https://eslint.org/docs/latest/use/configure/configuration-files)
- [ESLint 全局忽略](https://eslint.org/docs/latest/use/configure/ignore)
- [ESLint 配置调试](https://eslint.org/docs/latest/use/configure/debug)
- [typescript-eslint 快速开始](https://typescript-eslint.io/getting-started/)
- [typescript-eslint 类型感知 Lint](https://typescript-eslint.io/getting-started/typed-linting/)
- [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier)
- [TypeScript 7.0 与并行兼容路径](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)

## 我现在能做到什么

我能用 ESLint 10 flat config 精确匹配浏览器与 Node 文件，验证全局忽略和最终规则，
区分 TS 7 CLI 与 TS 6 兼容 API，并根据文件、规则名和有效配置实施最小修复。

## 单元导航

[返回第 02 章入口](../02-lint-format-quality.md) ·
[上一篇：Prettier 格式范围](01-prettier-format-scope.md) ·
[下一篇：独立质量门与失败诊断](03-quality-gates-failure-diagnostics.md)
