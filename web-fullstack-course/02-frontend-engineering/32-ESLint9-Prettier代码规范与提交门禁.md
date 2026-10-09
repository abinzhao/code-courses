# 32-ESLint 9、Prettier：代码规范与提交门禁

## 目标

完成本知识单元后，学员应能为项目建立一套“规则明确、工具协同、提交即检查”的代码规范体系：ESLint 管质量、Prettier 管格式、提交门禁负责强制执行，并且能把规则当作可持续治理的对象，而不是一份开完就关规则的配置。

学员应能够：

1. 区分代码质量规则与格式规则的职责，解释为什么必须由两类工具分工而不是让一个工具包办。
2. 读懂并编写 ESLint 9 flat config，理解配置对象数组、files、ignores、languageOptions、plugins 与 rules 的合并顺序。
3. 描述规则严重级别（off/warn/error）与插件的作用，能为不同文件范围配置不同规则。
4. 完成 ESLint 与 TypeScript、React 的集成，理解类型感知规则的收益与成本。
5. 配置 Prettier 并通过 `eslint-config-prettier` 解决与 ESLint 的格式冲突，完成编辑器保存自动修复。
6. 使用 Husky 与 lint-staged 建立提交门禁，正确配置忽略范围，并说明规则从灰度到收紧的治理方法。

CI 中如何运行 lint 作为合并门禁在 U56 展开；本单元聚焦本地规则体系与提交前最后一道闸门。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Node.js 当前 LTS | 工具运行时 | 理解 lint 是 Node 批处理任务，退出码决定门禁 |
| pnpm 当前稳定版 | 依赖与脚本 | 能安装插件、执行检查 |
| ESLint 9.x | 代码质量检查 | 本单元核心，使用 flat config |
| @eslint/js | ESLint 官方推荐规则集 | 能作为基础配置引入 |
| typescript-eslint | TS 解析与规则集 | 能接入并理解类型感知规则 |
| eslint-plugin-react-hooks 等 | 框架规则 | 能接入 React 规则 |
| Prettier 3.x | 代码格式化 | 能配置并与 ESLint 协同 |
| eslint-config-prettier | 关闭格式冲突规则 | 能放在配置末尾生效 |
| Husky 9.x | Git 钩子管理 | 能创建 pre-commit 钩子 |
| lint-staged | 暂存文件检查 | 能配置只检查变化文件 |
| VS Code + ESLint/Prettier 扩展 | 编辑期反馈 | 能配置保存自动修复 |

开始前准备：

```bash
node -v
pnpm create vite@latest lint-lab -- --template react-ts
cd lint-lab
pnpm install
```

预期观察：项目可运行，但默认不包含完整规范体系。本单元将逐项把它补齐。检查全局是否残留旧版 ESLint 配置（`.eslintrc.*`），ESLint 9 默认使用 flat config，本课程不再以旧的层级配置（eslintrc）作为主线。

约定：

- 配置文件统一命名为 `eslint.config.js`，Prettier 配置使用 `.prettierrc.json`；
- 规则变更属于团队决策，要在评审中说明理由，不允许个人私自关闭。

## 详细的理论知识讲解和示例伪代码

### 1. 规范体系：质量与格式的分工

#### 1.1 定义：代码规范

代码规范是团队对“代码应当如何书写”所做的、可被工具自动检验的约定。它覆盖两类性质不同的问题：

- 质量问题：未使用的变量、隐式全局、`==` 比较、React Hooks 依赖缺失、可能的空值解引用——这类问题可能导致 bug；
- 格式问题：缩进、引号、分号、行宽、尾逗号——这类问题通常不影响运行，但影响阅读与 diff 稳定。

#### 1.2 为什么分工：ESLint 与 Prettier

历史上人们尝试让 ESLint 同时管格式，但格式化规则与“自动修正”需要对整份代码做重排，容易与质量规则互相牵制；不同工具各自裁决同一处空白还会冲突。

现代分工：

```text
ESLint  —— 发现质量问题（也可能顺带少量风格判断）
Prettier —— 独占排版：不讨论审美，只按配置重排
eslint-config-prettier —— 关闭 ESLint 中一切会与 Prettier 冲突的规则
```

一句话：

```text
让 ESLint 管“对不对”，让 Prettier 管“齐不齐”，用 config-prettier 保证二者不争。
```

#### 1.3 工程化关系

规范是 U29 质量体系在“代码文本层”的落点。分工清晰后：

- 评审不再为引号和缩进耗费注意力；
- 格式争议被工具彻底取消（没有个人风格，只有配置）；
- 质量规则的告警值得认真看，因为它们指向风险而非排版。

常见误区：

> 格式化纯属小事，团队口头约定即可。

格式不统一会让 diff 噪音极大、评审困难、合并冲突增多；而“口头约定”无法执行。把格式交给工具，正是为了把人的精力从机械问题上解放出来。

### 2. ESLint 9 flat config 结构

#### 2.1 定义：flat config

flat config 是 ESLint 9 默认的配置形态：一份导出配置对象数组的文件。数组按顺序合并，后面的配置与前面的同名规则叠加、覆盖。

```js
// eslint.config.js
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
    },
  },
];
```

运行：

```bash
pnpm exec eslint .
```

#### 2.2 单个配置对象的关键字段

```js
{
  files: ['src/**/*.{ts,tsx}'],   // 本配置作用于哪些文件
  ignores: ['dist/**', 'coverage/**'], // 忽略哪些文件
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    globals: {},                  // 运行环境全局变量
  },
  plugins: {},                    // 注册插件
  rules: {},                      // 规则及级别
  settings: {},                   // 插件共享配置
}
```

- 不带 `files` 的基础对象对所有匹配文件生效；
- 带 `files` 的对象只在对应范围生效，可实现“测试文件放宽、源码收紧”；
- 独立的 `ignores` 对象表示全局忽略。

#### 2.3 全局对象

默认配置不认识浏览器或 Node 的全局变量，直接使用 `window`、`process` 会被告警。使用 `globals` 包声明：

```js
import globals from 'globals';

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];
```

含义：浏览器源码允许 `window/document`，Node 脚本允许 `process`。不要为了消除告警把不相关环境的全局全开，应按文件范围精确赋予。

#### 2.4 全局忽略

```js
export default [
  {
    ignores: ['dist/**', 'coverage/**', '*.config.js'],
  },
];
```

说明：

- `node_modules` 默认被忽略，无需重复声明；
- 忽略模式应围绕产物目录、生成代码与特殊脚本；
- 忽略一个目录意味着其中问题不会再被检查，应确认其确实不属于需要质量保证的源码。

#### 2.5 工程化关系

flat config 只有一个文件、顺序即优先级，比旧的多层 eslintrc 更易推理。排查“某条规则为什么没生效/为什么报错”时，沿数组顺序看覆盖关系即可，这是它可维护性的来源。

常见误区：

> 把所有规则写在一个大对象里就行，files 没必要。

源码、测试、构建脚本的质量要求不同。例如测试中允许非空断言、构建脚本允许使用 Node 全局。合理分范围配置，比用一个全局配置到处加行内豁免更清晰。

### 3. 规则、严重级别与插件

#### 3.1 定义：规则与严重级别

```js
rules: {
  'no-console': 'off',   // 或 0：不检查
  'no-debugger': 'warn', // 或 1：警告，不影响退出码
  'no-undef': 'error',   // 或 2：错误，命令以非零退出码失败
}
```

区别在于自动化：

```text
warn  —— 提醒开发者，eslint 仍以 0 退出，门禁不会因此失败
error —— 必须修复，eslint 返回非零，提交/CI 被阻断
```

因此“是否设为 error”等价于“是否允许带着这个问题合并”，应按风险决定，而不是全部设成 error。

#### 3.2 插件提供新规则

插件是规则集合（也可能带环境与配置）。注册后用 `插件名/规则名` 引用：

```js
import demoPlugin from 'eslint-plugin-demo';

export default [
  {
    plugins: {
      demo: demoPlugin,
    },
    rules: {
      'demo/no-secret-pattern': 'error',
    },
  },
];
```

#### 3.3 配置合并顺序

```text
数组自上而下处理：
  基础规则 no-unused-vars: warn
    ↓
  后面对 src/** 的同名规则 no-unused-vars: error
    ↓
最终该范围内为 error；其余文件保持 warn
```

利用这一点，可以先铺通用基线，再对关键目录收紧，而不必复制整份配置。

#### 3.4 行内禁用的正确姿势

极少数历史代码确实无法立即修复时，可在最小范围内禁用并写明理由：

```ts
// eslint-disable-next-line no-explicit-api -- 第三方回调入参无类型，下个迭代补声明
const payload: any = thirdParty.read();
```

要求：

- 作用域最小（单行而非整文件）；
- 必须附原因，便于后续清理；
- 禁止文件级大面积禁用。

#### 3.5 工程化关系

规则级别与覆盖设计是“严格性”和“可落地性”的平衡器。一刀切全 error 会让存量项目永远无法通过；全 warn 又没有底线。正确做法是：新代码 error、存量问题用范围配置或基线消化。

常见误区：

> 跑 lint 一片红，先把报错规则全部关掉，保证能提交。

关闭规则等于移除一层保护，而且团队会误以为仍然受检查。正确顺序是：先确认问题是否真实，再决定修复、降级为 warn 灰度，或在最小范围豁免——不能用全局关闭“解决”报错。

### 4. 与 TypeScript、React 集成

#### 4.1 定义与接入：typescript-eslint

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
];
```

要点：

- TS 文件需要 TS 感知解析器，不能直接套用纯 JS 解析；
- TS 规则通常与基础规则同名替换（如用 `@typescript-eslint/no-unused-vars` 替代基础版），推荐配置已处理大部分映射；
- 下划线前缀常用于表达“有意保留的未使用参数”。

#### 4.2 类型感知规则

部分规则需要读取类型信息才能判断（如“不得对可能为 null 的值解引用”）。启用时要让解析器关联 tsconfig（概念示例）：

```js
{
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
}
```

```js
...tseslint.configs.recommendedTypeChecked
```

权衡：

- 收益：能发现纯语法层面看不到的类型相关风险；
- 成本：检查更慢、配置更严格，存量项目可能产生大量告警。

大项目常对全量 CI 使用类型感知配置，而在高频的本地暂存检查中使用较轻配置，或接受其耗时——按项目规模取舍。

#### 4.3 React 规则

```js
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
];
```

- `rules-of-hooks`：保证 Hook 调用规则，违反即 error；
- `exhaustive-deps`：检查 effect 依赖完整性，多设为 warn；
- react-refresh 规则：保证文件导出结构不破坏 Fast Refresh 边界（与 U30 的 HMR 呼应）。

Vue 项目对应使用 `eslint-plugin-vue` 与 `vue-eslint-parser`，思路一致：换解析器、加插件、按文件范围配规则。

#### 4.4 与 tsc 的分工

```text
tsc --noEmit：类型正确性（这个值是不是 string、属性是否存在）
ESLint：代码质量模式（未使用变量、Hook 依赖、危险写法）
```

二者重叠很少、互为补充。Vite 构建只做语法转译、不做完整类型检查，所以类型防线不能靠“能 build”代替。

#### 4.5 工程化关系

框架与语言集成让规范深入到具体技术栈的风险点，而不是停留在通用 JS 层面。集成配置应进入团队模板（U29），使每个新项目天然具备这些检查。

常见误区：

> 有了 TypeScript 就不需要 ESLint，或有了 ESLint 就不用类型检查。

类型系统回答“值是否符合约定”，lint 回答“写法是否安全、规范”。大量问题（未使用导入、依赖数组、空函数）类型系统不报错；而纯语法 lint 又无法替代类型推断。两者都需要。

### 5. Prettier 分工与集成

#### 5.1 定义与配置

定义：Prettier 是一个有主见的代码格式化工具，它只负责按统一配置重排排版，不判断代码对错，也不提供可讨论的“个人风格”选项。

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

这些只描述“怎么排”，不评价代码对错。团队在评审中不再讨论行宽与引号，因为答案已在配置里。

#### 5.2 手动运行

```bash
pnpm exec prettier --write .
pnpm exec prettier --check .
```

- `--write`：就地重排文件（日常使用）；
- `--check`：只报告不修改，适合 CI 判定（不合规即非零退出码）。

#### 5.3 关闭冲突：eslint-config-prettier

```js
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier, // 必须放在最后，关闭所有与 Prettier 冲突的格式规则
];
```

原理：它本身不添加规则，只把“会和 Prettier 决定相矛盾”的规则关掉。放前面会被后续配置重新打开，因此位置就是它生效的条件。

#### 5.4 Prettier 忽略

```text
# .prettierignore
dist
coverage
node_modules
pnpm-lock.yaml
stats
```

被忽略的通常是产物、生成文件与第三方锁文件——重排它们没有意义，还可能破坏格式约定。

#### 5.5 工程化关系

Prettier 接入后，格式成为提交物的客观属性：凡是通过门禁的代码格式都一致。配合自动修复，开发者几乎不会“主动处理格式”，工具在保存与提交时完成全部排版。

常见误区：

> 我不喜欢 Prettier 的某条排版，就在 ESLint 里加一条规则改回来。

这会重新制造两个工具对同一处代码的争夺，且不同项目结论不一。对 Prettier 的意见应通过修改 Prettier 配置、团队统一决定来解决，而不是用 ESLint 暗中对抗。

### 6. 编辑器集成

#### 6.1 定义与扩展安装

定义：编辑器集成是指让 ESLint 与 Prettier 在编码阶段实时显示问题、在保存时自动修复，使规范反馈提前到书写当下，而不是等到提交才暴露。

需要安装：

- ESLint 扩展：读取 `eslint.config.js`，在问题面板实时显示告警，支持快速修复；
- Prettier 扩展：提供格式化能力。

工作区推荐配置：

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "eslint.useFlatConfig": true,
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

#### 6.2 保存时发生了什么

```text
1. 触发 codeActionsOnSave：ESLint 对可自动修复的问题直接修复
2. Prettier 按配置重排整份文件
3. 组织 import（去除无用导入等）
4. 文件落盘
```

结果：开发者写下的代码在保存瞬间就同时满足“可自动修复的质量规则”和“全部格式规则”，剩下的告警才是真正需要人工判断的部分。

#### 6.3 扩展推荐

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

团队成员打开项目会被提示安装，避免“我没装插件所以没看到告警”。

#### 6.4 工程化关系

编辑器集成是“质量左移”最靠前的一环（对应 U29 分层的第一层）：问题在书写时出现、在保存时修复，根本不会走到提交。但它只对装了扩展的人生效，因此不能替代提交门禁与 CI——后两者保证无论个人编辑器如何配置，底线都成立。

常见误区：

> 我本地编辑器都自动修好了，所以提交门禁多余。

有人会关闭提示、使用其他编辑器、或直接在命令行/CI 机上提交。门禁保护的是“团队底线”，不依赖任何个人的编辑器配置；编辑器提升的是个人体验，二者层级不同。

### 7. 提交门禁：Husky 与 lint-staged

#### 7.1 定义

提交门禁是挂在 `git commit` 上的自动检查：检查不通过，提交被拒绝，代码进不了本地历史，更无法推送。

- Husky：管理 Git 钩子（把脚本绑定到 pre-commit 等时机）；
- lint-staged：只对“已暂存（staged）”的文件运行命令。

只检查暂存文件是门禁可行性的关键：全量 lint 可能要几十秒，而一次提交通常只改几个文件，局部检查常在毫秒到秒级完成。

#### 7.2 安装与初始化

```bash
pnpm add -D husky lint-staged
pnpm exec husky init
```

在 `package.json` 中保留准备脚本：

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

`prepare` 在安装依赖后自动执行，保证每个成员 clone 并 install 后钩子自动就位。

#### 7.3 编写 pre-commit 钩子

```bash
# .husky/pre-commit
pnpm exec lint-staged
```

配置 lint-staged（写在 package.json）：

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,css,md}": [
      "prettier --write"
    ]
  }
}
```

执行语义：

```text
git commit
  ↓
触发 pre-commit
  ↓
lint-staged 取出暂存文件列表
  ↓
对匹配文件依次执行 eslint --fix、prettier --write
  ↓
命令修改过的文件自动重新加入暂存
  ↓
全部退出码 0 → 提交完成
任一非零     → 提交被拒绝，提示修复后重新提交
```

#### 7.4 为什么不能只跑 prettier

```text
prettier --write：保证格式，但不判断逻辑风险
eslint --fix：修复部分质量问题；无法自动修复的 error 会让提交失败
```

两者缺一，门禁就只覆盖一半职责。顺序上一般先 eslint 后 prettier，最终排版以 Prettier 为准。

#### 7.5 忽略配置小结

| 文件 | 作用 |
|---|---|
| ESLint `ignores`（flat config） | lint 不检查的产物/生成目录 |
| `.prettierignore` | prettier 不重排的文件 |
| `.husky/` 中的钩子 | 决定提交时执行什么 |
| lint-staged 的匹配模式 | 决定暂存文件由哪些命令处理 |

四者职责不同：忽略是“不检查”，门禁是“检查并阻断”，不要混用。

#### 7.6 工程化关系

提交门禁是代码进入仓库前的最后一道本地闸门，属于 U29 分层的第二层。它把规范从“建议”变成“强制”，且成本被 lint-staged 控制在可接受范围。Monorepo 中可在根目录统一配置，或按子包扩展命令，原理相同。

常见误区：

> 门禁挡了我，加 `--no-verify` 先提交再说。

绕过钩子意味着未检查代码直接入库，且会形成习惯。正确做法是读完 eslint 的报错、修复后重新提交；只有在极少数紧急且事后补检的情况下，经团队约定才可临时绕过并记录。

### 8. 规则治理

#### 8.1 定义：规则治理

依赖升级会带来新规则，业务发展会暴露新的风险类型。规则集需要治理：谁来加、如何灰度、存量怎么办。

#### 8.2 从 warn 到 error 的灰度路径

```text
引入新规则
  ↓
先设 warn：收集真实告警量，不阻断流程
  ↓
评估告警：修复高价值问题，确认误报率
  ↓
新代码合规（可按目录/时间点划基线）
  ↓
存量清零或进入豁免清单后，切换为 error
```

这样门禁始终“跳一跳够得着”，不会在开门第一天就把所有人锁死。

#### 8.3 基线思路

存量项目一次性合规不现实。可建立基线：

```text
记录当前所有告警作为“历史基线”
要求：新增/修改文件不得引入新告警
定期：安排专项逐步削减基线
```

等价于“冻结旧问题、禁止新问题”，比全放开或全卡死都更可持续。

#### 8.4 升级与评审

- ESLint、typescript-eslint、插件升级时阅读变更说明，关注新规则与行为变化；
- 规则调整以合并请求方式评审，说明“拦住什么、误报成本、存量处理”；
- 配置本身应简洁可解释，避免层层叠加后无人能理清最终规则。

#### 8.5 工程化关系

规则治理回答了 U29 提出的“门禁如何不形同虚设”：靠分级、灰度与基线，让严格性随团队能力一起增长，而不是靠一次性命令制造虚假的合规。

常见误区：

> 规则越严、级别越高，团队代码质量就越好。

无法落地的严格只会催生关闭规则和绕过钩子。真正提升质量的是“规则被持续执行、问题被持续清理”，而不是配置文件里写了多少个 error。

## 课后题

1. 代码质量问题和格式问题有什么区别？为什么现代方案让 ESLint 与 Prettier 分工，并需要 `eslint-config-prettier`？
2. 解释 flat config 中配置数组的合并顺序。后面的配置与前面同名规则冲突时结果如何？
3. `warn` 和 `error` 在退出码与门禁行为上有什么不同？把一条规则设为 error 意味着什么承诺？
4. 场景分析：某项目接入 ESLint 后一次跑出 600 个告警，负责人把相关规则全部关闭“先让项目能提交”。请指出问题，并给出兼顾落地与底线的方案。
5. typescript-eslint 的“类型感知规则”需要什么配置？它的收益与成本分别是什么？
6. 场景分析：有了 TypeScript 后，团队对是否还需要 ESLint 产生分歧。请给出你的结论，并举出两类只有其中一方能发现的问题。
7. Prettier 的 `--write` 与 `--check` 分别用在什么场景？`.prettierignore` 通常应包含哪些文件？
8. 场景分析：某团队在 pre-commit 中直接运行全量 `eslint .`，每次提交都要等待三四十秒，开发者怨声载道。请说明 Husky 与 lint-staged 各自承担什么职责，并解释为什么门禁只检查暂存文件而不是全量项目。
9. 场景分析：团队成员频繁使用 `--no-verify` 绕过提交检查，理由是“门禁太慢/误报太多”。请从门禁成本与规则治理两个角度分析并提出整改。
10. 请完整描述一条新规则从引入到成为 error 的灰度路径，并解释“冻结旧问题、禁止新问题”的基线思路。

## 实践练习题

### 练习 1：搭建 ESLint 9 + TS 基础规范

#### 任务

在项目中建立 flat config 与脚本，使源码具备基础质量检查，并通过一次“制造问题—修复”的闭环理解规则行为。

#### 步骤约束

1. 安装 `eslint`、`@eslint/js`、`typescript-eslint`、`globals`。
2. 创建 `eslint.config.js`：引入官方推荐与 TS 推荐配置，声明浏览器与 Node 全局。
3. 配置全局忽略（dist、coverage），并对 `src/**` 设置 `@typescript-eslint/no-unused-vars` 为 error（允许 `_` 前缀参数）。
4. 在 package.json 增加 `lint` 与 `lint:fix` 脚本。
5. 故意制造未使用变量与隐式全局，运行 lint，记录规则名、级别与退出码。
6. 修复全部问题使 `pnpm lint` 以 0 退出。

#### 提交物

- `eslint.config.js` 与更新后的 package.json；
- `evidence/lint-baseline.md`：配置说明与问题实验记录；
- 修复前后两次 lint 输出与退出码。

#### 验收标准

- flat config 结构正确，文件范围与忽略合理；
- 能区分 error 造成的非零退出与通过时的 0；
- TS 规则正确替换基础同名规则；
- 问题实验真实可查；
- 最终 lint 一次通过。

### 练习 2：接入 Prettier 并完成编辑器协同

#### 任务

把格式化职责交给 Prettier，解决与 ESLint 的冲突，并配置保存自动修复，形成“写得乱也能自动变整齐”的工作流。

#### 步骤约束

1. 安装 `prettier` 与 `eslint-config-prettier`，创建 `.prettierrc.json`（至少含行宽、引号、分号、尾逗号）。
2. 在 ESLint 配置末尾接入 `eslint-config-prettier`，确认冲突规则被关闭。
3. 创建 `.prettierignore`，忽略产物与锁文件。
4. 增加 `format` 与 `format:check` 脚本；对全项目运行一次 prettier write。
5. 配置 `.vscode/settings.json` 与 `extensions.json`，实现保存自动修复与默认格式化器。
6. 故意写一段不符合排版的代码，演示保存前后差异，并用 `prettier --check` 验证门禁判定。

#### 提交物

- `.prettierrc.json`、`.prettierignore`、更新后的 ESLint 配置；
- `.vscode/settings.json`、`.vscode/extensions.json`；
- `evidence/prettier.md`：排版修复前后对比与 check 退出码记录。

#### 验收标准

- 保存后代码同时满足 ESLint 可修复项与 Prettier 排版；
- config-prettier 位于配置末尾且冲突关闭；
- `--check` 能对不合规文件返回非零；
- 忽略范围合理；
- 文档记录与实际行为一致。

### 练习 3：建立 Husky + lint-staged 提交门禁

#### 任务

把检查绑定到提交动作，只对暂存文件运行 ESLint 与 Prettier，并验证“问题代码提交被拒、修复后通过”的完整流程。

#### 步骤约束

1. 安装 `husky`、`lint-staged`，执行 husky 初始化并保留 `prepare` 脚本。
2. 在 `.husky/pre-commit` 中调用 lint-staged。
3. 在 package.json 配置 lint-staged：TS/JS 文件先 `eslint --fix` 再 `prettier --write`，其余常见文件仅 prettier。
4. 制造一个无法自动修复的 error，尝试提交，记录被拒绝的输出与退出状态。
5. 修复后再次提交成功；再验证纯格式问题在提交时被自动修复并重新暂存。
6. 编写门禁说明：检查范围、失败含义、为什么不应使用 `--no-verify`。

#### 提交物

- `.husky/pre-commit`、package.json 中的 lint-staged 配置；
- `evidence/gate.md`：拒绝与通过两次提交的记录；
- `docs/commit-gate.md` 门禁说明。

#### 验收标准

- pre-commit 钩子在 install 后自动可用；
- 只检查暂存文件，耗时合理；
- 无法自动修复的问题确实阻断提交；
- 格式问题被自动修复并正确重新暂存；
- 说明文档清晰，且未把绕过钩子作为常规手段。

## 阶段验收作业

### 作业名称

团队代码规范体系与提交门禁落地

### 作业场景

团队近期合并的代码风格混乱、低级问题频发：未使用变量、Hooks 依赖缺失、格式 diff 噪音、有人直接绕过检查。团队要求你交付一套完整的规范方案并在真实项目中跑通：ESLint 9 负责质量、Prettier 负责格式、编辑器即时反馈、提交门禁强制执行，同时建立规则治理机制，保证这套体系能够长期执行而不是上线即废弃。

### 提交物

```text
quality-gate/
├── project/
│   ├── eslint.config.js
│   ├── .prettierrc.json
│   ├── .prettierignore
│   ├── package.json
│   ├── .vscode/
│   │   ├── settings.json
│   │   └── extensions.json
│   ├── .husky/
│   │   └── pre-commit
│   └── src/
├── docs/
│   ├── rules.md            # 规则清单与级别理由
│   ├── editor-flow.md      # 编辑器与保存修复流程
│   ├── commit-gate.md      # 提交门禁说明
│   └── governance.md       # 灰度、基线与升级治理
├── evidence/
│   ├── lint-errors.md
│   ├── format-before-after.md
│   └── gate-blocked.md
└── README.md
```

要求：

- `pnpm lint`、`pnpm format:check` 均以 0 退出；
- pre-commit 对暂存文件真实生效，且能被其他成员在 install 后自动获得；
- 规则清单要逐条说明级别理由，不允许出现无解释的全局关闭；
- 治理方案包含至少一条规则的 warn→error 灰度计划。

### 演示步骤

学员需要在 15 分钟内完成：

1. 讲解质量规则与格式规则的分工及协同方式。
2. 展示 flat config 结构与合并顺序，指出不同文件范围的规则差异。
3. 现场制造一个质量问题，演示 lint 报错、级别与退出码，再修复。
4. 演示保存时 ESLint 自动修复与 Prettier 重排。
5. 制造无法自动修复的问题尝试提交，展示门禁阻断；修复后提交成功。
6. 讲解规则灰度与基线方案。
7. 回答导师针对“为什么这条规则是 warn 不是 error”的追问。

导师可临时新增一条规则或改动暂存文件范围，验证配置与治理能力。

### 评分标准（100 分）

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 分工与架构理解 | 15 | 质量/格式分工清晰，协同原理正确 |
| ESLint flat config | 20 | 结构、范围、合并与忽略配置正确 |
| TS/框架集成 | 15 | 解析器、规则集与类型感知取舍合理 |
| Prettier 集成 | 15 | 配置正确，冲突关闭，check 可判定 |
| 提交门禁 | 20 | Husky/lint-staged 真实阻断与自动修复 |
| 规则治理 | 10 | 灰度、基线与升级方法可执行 |
| 证据与文档 | 5 | 记录真实，文档与实现一致 |

细分评分规则：

#### 分工与架构理解：15 分

- 质量与格式职责区分准确：8 分；
- config-prettier 作用与位置理解正确：7 分。

#### ESLint flat config：20 分

- 配置对象字段使用正确：7 分；
- files/ignores 范围合理：7 分；
- 数组合并顺序与级别行为正确：6 分。

#### TS/框架集成：15 分

- typescript-eslint 接入与规则替换正确：8 分；
- 类型感知规则取舍与 React 规则配置合理：7 分。

#### Prettier 集成：15 分

- 配置与忽略合理：7 分；
- write/check 脚本与退出码正确：8 分。

#### 提交门禁：20 分

- Husky 钩子自动可用：6 分；
- lint-staged 范围与命令顺序正确：7 分；
- 阻断与自动重新暂存行为正确：7 分。

#### 规则治理：10 分

- 灰度路径具体可执行：5 分；
- 基线与升级评审方法合理：5 分。

#### 证据与文档：5 分

- 报错、排版与门禁证据真实可查：5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过，修正后重新验收：

1. 无法区分 ESLint 与 Prettier 的职责，或未关闭格式冲突导致两个工具互相矛盾。
2. flat config 结构错误，规则作用范围与忽略配置明显不合理。
3. 通过全局关闭关键规则制造“零告警”。
4. 提交门禁未真实生效，或把 `--no-verify` 作为通过作业的手段。
5. lint/prettier 失败却仍返回零退出码，掩盖问题。
6. 提交物包含真实密钥、令牌或其他敏感信息。
7. 缺少规则治理方案，或只提交配置没有证据与文档。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 区分质量规则与格式规则 | 现场讲解、`rules.md` |
| 掌握 ESLint 9 flat config | `eslint.config.js`、演示步骤 2 |
| 理解级别、插件与范围覆盖 | 演示步骤 3、规则清单 |
| 完成 TS/框架集成 | ESLint 配置、`docs/rules.md` |
| 配置 Prettier 与编辑器协同 | `.prettierrc.json`、`.vscode`、演示步骤 4 |
| 建立 Husky + lint-staged 门禁 | `.husky/pre-commit`、演示步骤 5 |
| 掌握规则治理方法 | `governance.md`、演示步骤 6 |

### 提交前自检

- [ ] 七个学习目标均有对应证据。
- [ ] 干净环境 `pnpm install` 后 Husky 钩子自动就位。
- [ ] `pnpm lint` 与 `pnpm format:check` 均以 0 退出。
- [ ] 无法自动修复的问题确实会阻断提交。
- [ ] ESLint 中不存在无理由的全局规则关闭。
- [ ] 保存自动修复在编辑器中真实工作。
- [ ] 治理方案包含至少一条规则的灰度计划。
- [ ] 提交内容不含任何真实密钥或敏感信息。
- [ ] README 能指导新成员在 30 分钟内获得全部规范与门禁能力。
