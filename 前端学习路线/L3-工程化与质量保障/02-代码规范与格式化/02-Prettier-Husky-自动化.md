# 02 Prettier + Husky 自动化流水线

## 学习目标

- 理解 Prettier 的 Opinionated 设计哲学及其与 ESLint 的分工边界
- 掌握 Prettier 核心配置项的含义与常见取值
- 能正确集成 ESLint + Prettier，避免规则冲突
- 掌握 lint-staged + Husky 实现 Git 提交流程自动化
- 能搭建 commitlint 校验 Conventional Commits 格式
- 能配置 VS Code 实现保存时自动格式化
- 能从零搭建一条完整的「保存 → 格式化 → 提交前检查 → 提交信息校验」自动化流水线

---

## 内容讲解

### 1. 为什么有了 ESLint 还需要 Prettier？

ESLint 和 Prettier 不是竞争关系，而是**分工互补**：

| 维度 | ESLint | Prettier |
|------|--------|----------|
| **定位** | 代码质量、逻辑正确性 | 代码风格、排版美观 |
| **检查内容** | 潜在 bug、反模式、最佳实践 | 缩进、引号、分号、换行 |
| **可配置性** | 每条规则都可定制 | 刻意限制选项，减少争议 |
| **修复方式** | `eslint --fix`（部分规则） | `prettier --write`（全部可自动修复） |
| **典型规则** | 禁止 `var`、检查 Hook 依赖 | 单引号还是双引号、缩进是 2 还是 4 |

> **一句话总结**：ESLint 保障代码**不出错**，Prettier 保障代码**不吵架**。

如果把格式规则全交给 ESLint（比如用 `eslint --fix` 排版），会遇到两个问题：
1. ESLint 的格式化规则不够全面（对齐、换行策略不如 Prettier 细致）
2. 团队新人会纠结每一条格式规则怎么配，增加不必要的决策成本

Prettier 的策略是 **Opinionated**——给你极少的配置项，让你"别吵了，用我就对了"。

---

### 2. Prettier 核心配置

#### 2.1 配置文件

Prettier 支持多种配置文件格式：`.prettierrc`、`.prettierrc.json`、`prettier.config.js`、`prettier.config.mjs`。推荐用 `prettier.config.mjs`，统一模块规范。

```js
// prettier.config.mjs —— Prettier 配置（含中文注释）
/** @type {import("prettier").Config} */
export default {
  // ---------- 核心排版 ----------
  printWidth: 100,         // 单行最大字符数，超了就换行（默认 80）
  tabWidth: 2,             // 缩进空格数（默认 2）
  useTabs: false,          // 用空格缩进（默认 false）

  // ---------- 标点 ----------
  semi: true,              // 每条语句末尾加分号（默认 true）
  singleQuote: true,       // 用单引号而非双引号（默认 false）
  quoteProps: 'as-needed', // 对象 key 需要时才加引号（默认 'as-needed'）
  jsxSingleQuote: false,   // JSX 中用双引号（默认 false）

  // ---------- 尾逗号 ----------
  // 'es5'  : 在 ES5 有效的地方加尾逗号（对象、数组等）
  // 'none' : 不加尾逗号
  // 'all'  : 所有可能的地方都加（包括函数参数）
  trailingComma: 'all',

  // ---------- 括号空格 ----------
  bracketSpacing: true,    // { key: value } 花括号内侧留空格（默认 true）
  bracketSameLine: false,  // JSX 的 > 放在下一行（默认 false）

  // ---------- 箭头函数参数 ----------
  arrowParens: 'always',   // 箭头函数参数始终加括号（默认 'always'）
  // 'always' : (x) => x
  // 'avoid'  : x => x

  // ---------- 换行符 ----------
  endOfLine: 'lf',         // 统一用 LF（Linux/macOS 换行符）

  // ---------- 其他 ----------
  proseWrap: 'preserve',   // Markdown 文本不自动换行
  htmlWhitespaceSensitivity: 'css', // HTML 空白敏感度遵循 CSS display 属性

  // ---------- 覆盖（文件级别的特殊规则）----------
  overrides: [
    {
      files: '*.md',
      options: {
        proseWrap: 'always',  // Markdown 自动换行
        printWidth: 80,
      },
    },
    {
      files: ['*.json', '*.yaml', '*.yml'],
      options: {
        tabWidth: 2,          // JSON/YAML 用 2 空格缩进
      },
    },
  ],
};
```

#### 2.2 常用配置项速查

| 配置项 | 默认值 | 常见替代 | 说明 |
|--------|--------|---------|------|
| `printWidth` | 80 | 100, 120 | 一行最多多少字符 |
| `tabWidth` | 2 | 4 | 缩进空格数 |
| `semi` | `true` | `false` | 是否加分号 |
| `singleQuote` | `false` | `true` | 是否用单引号 |
| `trailingComma` | `'all'`(3.0+) | `'es5'`, `'none'` | 尾逗号策略 |
| `bracketSpacing` | `true` | `false` | 花括号内侧空格 |
| `arrowParens` | `'always'` | `'avoid'` | 箭头函数参数括号 |

> **Note**：Prettier 3.0 起 `trailingComma` 默认值改为 `'all'`，函数参数也会加尾逗号。这在 Git diff 中非常有用——加新参数时只显示一行变更，不会把上一行也标红。

---

### 3. ESLint + Prettier 的正确集成方式

#### 3.1 冲突的根源

ESLint 和 Prettier 的规则有重叠区域（如缩进、引号、分号），同时开启会互相打架：

```
// 场景：ESLint 要求双引号，Prettier 要求单引号
const name = "hello";  // ESLint: ✅  Prettier: ❌ （期望单引号）
const name = 'hello';  // ESLint: ❌ （期望双引号）  Prettier: ✅
```

无论你写哪种，总有一个工具不满意。解决方案：**`eslint-config-prettier` 关闭 ESLint 中与 Prettier 冲突的规则**。

#### 3.2 集成步骤

```bash
# 安装依赖
npm install -D prettier eslint-config-prettier
```

```js
// eslint.config.js —— 在 Flat Config 中集成 Prettier
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
// 导入 eslint-config-prettier（它就是一组全关的 rules 对象）
import prettierConfig from 'eslint-config-prettier';

export default [
  // 1. 忽略文件
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  // 2. ESLint + TypeScript + React 推荐规则
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. 项目自定义规则
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // ⭐ 4. 关键：eslint-config-prettier 必须放在最后！
  // 它会把前面所有可能与 Prettier 冲突的规则关闭
  prettierConfig,
];
```

> **铁律**：`eslint-config-prettier`（即 `prettierConfig`）永远放在 export default 数组的**最后一个元素**，这样它才能覆盖前面所有配置可能引入的格式规则。

#### 3.3 验证集成是否正确

```bash
# 安装验证工具
npx eslint-config-prettier  # 检查当前 ESLint 配置是否与 Prettier 冲突
```

如果输出 `No rules that are unnecessary or conflict with Prettier were found.`，说明集成正确。

---

### 4. lint-staged：只检查你改过的文件

全量 `eslint .` 和 `prettier --write .` 在老项目中非常慢。**lint-staged** 只对 `git add` 的暂存文件执行检查，速度快一个数量级。

```bash
npm install -D lint-staged
```

```js
// lint-staged.config.mjs —— lint-staged 配置
export default {
  // key 是 glob 模式，value 是要执行的命令数组
  // 暂存区中的每个匹配文件会自动作为参数追加到命令后面

  // TypeScript/TSX 文件：先跑 ESLint 修复，再跑 Prettier 格式化
  '*.{ts,tsx}': [
    'eslint --fix --max-warnings 0',  // --max-warnings 0：任何警告都视为失败
    'prettier --write',
  ],

  // JavaScript/JSX 文件
  '*.{js,jsx}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
  ],

  // JSON/Markdown/YAML/CSS：只跑 Prettier（这些文件 ESLint 不管）
  '*.{json,md,yaml,yml,css,scss,html}': [
    'prettier --write',
  ],
};
```

```json
// package.json 中添加脚本
{
  "scripts": {
    "lint-staged": "lint-staged"
  }
}
```

> **注意**：`lint-staged` 本身不负责 Git Hook 的触发，它只是"当被调用时，去检查暂存区的文件"。触发它的是下一步的主角——Husky。

---

### 5. Husky：Git Hooks 管理工具

Git 自带了 Hooks 机制（`.git/hooks/` 目录），但直接在里面写 shell 脚本很难管理、不容易团队共享。Husky 把 Git Hooks 变成了项目文件中可版本管理的配置。

```bash
# 安装 Husky 9
npm install -D husky

# 初始化 Husky（在项目根目录创建 .husky/ 目录）
npx husky init
```

执行 `npx husky init` 后，项目里会多出：

```
.husky/
└── _/                # Husky 内部脚本
    ├── .gitignore
    └── h
    └── pre-commit    # ← 我们需要编辑这个！
```

#### 5.1 配置 pre-commit Hook：提交前自动 lint + format

```bash
# .husky/pre-commit —— 提交前自动执行
# Husky 9 的 Hook 就是纯 shell 脚本

# 在提交前运行 lint-staged（只检查暂存文件）
npx lint-staged
```

完整流程如下：

```
git add .  →  git commit  →  Husky 触发 pre-commit
                                   ↓
                              npx lint-staged
                                   ↓
                          只对暂存文件执行 eslint --fix + prettier --write
                                   ↓
                          如果全部通过 → 提交成功
                          如果有一项失败 → 提交被阻止，修复后重新提交
```

#### 5.2 配置 commit-msg Hook：校验提交信息格式

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

```js
// commitlint.config.mjs —— commitlint 配置
/** @type {import('@commitlint/types').UserConfig} */
export default {
  // 继承 Conventional Commits 规范
  extends: ['@commitlint/config-conventional'],

  // 自定义规则
  rules: {
    // body 可以空，但如果有的话每行不超过 100 字符
    'body-max-line-length': [1, 'always', 100],

    // type 必须在枚举范围内
    'type-enum': [
      2,          // 错误级别：0=off, 1=warn, 2=error
      'always',   // 应用方式：always=必须满足, never=不能出现
      [
        'feat',     // 新功能
        'fix',      // 修复 bug
        'docs',     // 文档变更
        'style',    // 格式变更（不影响代码运行）
        'refactor', // 重构（既不是 feat 也不是 fix）
        'perf',     // 性能优化
        'test',     // 测试变更
        'chore',    // 构建/工具/依赖变更
        'ci',       // CI 配置变更
        'revert',   // 回滚
        'build',    // 构建系统或外部依赖变更
      ],
    ],
  },
};
```

```bash
# .husky/commit-msg —— 提交信息格式检查
# $1 是 Git 传给 Hook 的 commit message 临时文件路径
npx commitlint --edit $1
```

**Conventional Commits 格式**：

```
<type>(<scope>): <subject>

[body]

[footer]
```

示例：

```bash
# ✅ 正确格式
git commit -m "feat(auth): 添加 JWT 登录功能"
git commit -m "fix(button): 修复 Safari 下按钮圆角不生效的问题"
git commit -m "docs(readme): 更新安装说明"

# ❌ 错误格式
git commit -m "改了登录功能"            # 没有 type
git commit -m "add login"               # type 'add' 不在枚举范围内
git commit -m "feat:add login"          # : 后面需要空格
```

> **为什么要用 Conventional Commits？** 规范的提交信息能让你自动生成 CHANGELOG、自动判定版本号（semver），并在 CI 中按 type 决定不同的构建策略。

---

### 6. VS Code 保存自动格式化

团队里不是所有人都会记得手动 `eslint --fix`，所以要把格式化集成到编辑器中，**保存即格式化**。

```json
// .vscode/settings.json —— 项目级 VS Code 配置（推荐提交到仓库）
{
  // ====== 格式化引擎 ======
  // 设置 Prettier 为默认格式化器
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // ====== 保存时自动操作 ======
  // 保存时自动格式化
  "editor.formatOnSave": true,
  // 保存时自动修复 ESLint 能修的问题（排序 import、删除未使用变量等）
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },

  // ====== ESLint 检查的文件类型 ======
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "vue"
  ],

  // ====== Prettier 文件类型关联 ======
  // 让 VS Code 对这些文件也启用 Prettier
  "[javascript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescript]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[typescriptreact]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[json]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[jsonc]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[markdown]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[css]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[scss]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[html]": { "editor.defaultFormatter": "esbenp.prettier-vscode" },
  "[yaml]": { "editor.defaultFormatter": "esbenp.prettier-vscode" }
}
```

```json
// .vscode/extensions.json —— 推荐团队成员安装的插件
{
  "recommendations": [
    "dbaeumer.vscode-eslint",       // ESLint 插件
    "esbenp.prettier-vscode"        // Prettier 插件
  ]
}
```

> **提示**：把 `.vscode/` 目录提交到 Git 仓库后，团队成员打开项目时 VS Code 会自动提示安装推荐插件，并套用项目的格式化设置。这是一次配置、全员受益。

---

### 7. 全局脚本串联

在 `package.json` 中配置好脚本，让所有自动化命令可以一键执行：

```json
{
  "scripts": {
    // 开发用：只检查暂存文件
    "lint-staged": "lint-staged",

    // 全量格式化整个项目
    "format": "prettier --write .",

    // 全量 lint 检查
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0",

    // 全量 lint + 自动修复
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix --max-warnings 0",

    // 一次性检查所有（CI 用）
    "check": "npm run lint && npx prettier --check .",

    // 准备 Husky（团队成员 clone 后首次运行）
    "prepare": "husky"
  }
}
```

---

### 8. 完整自动化流水线全景

把上面的所有环节串起来，你得到的是一条**零手动干预**的代码规范自动化流水线：

```
┌─────────────────────────────────────────────────────────┐
│                    你在写代码                             │
│  Ctrl+S → VS Code 自动 Prettier 格式化 + ESLint auto-fix │
│                      ↓                                  │
│                 git add .                                │
│                      ↓                                  │
│                git commit                                │
│                      ↓                                  │
│         ┌──── Husky pre-commit Hook ────┐               │
│         │  npx lint-staged              │               │
│         │  → eslint --fix（暂存文件）    │               │
│         │  → prettier --write（暂存文件）│               │
│         │  全部通过 → 继续               │               │
│         │  任一失败 → 阻止提交           │               │
│         └───────────────────────────────┘               │
│                      ↓                                  │
│         ┌──── Husky commit-msg Hook ────┐               │
│         │  npx commitlint --edit $1     │               │
│         │  格式正确 → 继续               │               │
│         │  格式错误 → 阻止提交           │               │
│         └───────────────────────────────┘               │
│                      ↓                                  │
│                 提交成功 ✅                              │
└─────────────────────────────────────────────────────────┘
```

---

## 常见问题

**Q1: Prettier 的 `trailingComma: 'all'` 和 `'es5'` 到底选哪个？**

对 TypeScript 和现代前端项目，选 `'all'`。它会在函数参数和泛型中也加尾逗号——当你新增或删除一个参数时，Git diff 只显示一行变更，而不是两行（上一行去掉逗号 + 新增一行）。唯一的代价是 Node.js 老版本不支持函数参数的尾逗号，但现代工具链（Babel/TypeScript/Vite）会自动处理。

**Q2: `eslint-config-prettier` 和 `eslint-plugin-prettier` 有什么区别？我该装哪个？**

`eslint-config-prettier` 只关闭 ESLint 中与 Prettier 冲突的规则（推荐）。`eslint-plugin-prettier` 会把 Prettier 作为 ESLint 的一条规则来运行，让格式问题在 ESLint 中显示为红色波浪线。**推荐只用 `eslint-config-prettier`**，格式化交给 VS Code 自动完成和 `lint-staged`，不需要在 ESLint 里再跑一遍 Prettier（这是多余的开销）。

**Q3: `lint-staged` 中为什么用 `eslint --fix` 而不是 `eslint`？**

如果只检查不修复，lint-staged 即使报错也不会改文件，你还是要手动修。`eslint --fix` 会自动修能修的（如把 `let` 改 `const`、添加缺失的分号），修不了的才会报错让你手动处理。但对于那些修改不应该自动进行的规则（如 `no-console`），`--fix` 不会动它们。

**Q4: Husky 的 Hook 在 CI 中也会运行吗？**

不会。Husky Hook 依赖 `.git/hooks/` 目录，这通常不在 CI 的 Git 历史中。而且在 CI 中你已经通过 `npm run lint` 和 `prettier --check` 显式调用了，Hook 是多余的。这也是推荐在 `package.json` 中同时保留 `lint` 和 `check` 脚本的原因。

**Q5: 为什么有时 `git commit` 被 Husky 拦截了，但修改没有被应用到文件上？**

这是 `lint-staged` 的一个"隐蔽特性"：当 `eslint --fix` 或 `prettier --write` 修改了文件后，它会把修改自动 `git add` 回暂存区。但如果脚本执行失败（exit code 非 0），修改**不会**被加入暂存。你的工作区文件已经被修改了，但暂存区还是旧的。此时你需要检查工作区改动是否正确，然后重新 `git add`。

**Q6: 团队有人不想装 VS Code 插件怎么办？**

不需要强制。VS Code 的自动格式化是"锦上添花"，真正的防线是 Husky + lint-staged 组成的 Git Hook 屏障。即使不用 VS Code，`git commit` 时依然会被检查，代码质量不会丢失。

**Q7: 如果我想跳过 Hook 临时提交怎么办？**

```bash
git commit --no-verify -m "wip: 临时保存"
```

`--no-verify`（或 `-n`）会跳过 pre-commit 和 commit-msg Hook。但这应该是**极少使用的逃生出口**，不是日常操作。团队成员发现有人频繁 --no-verify，应该作为流程问题来讨论。

**Q8: Conventional Commits 的 `scope` 怎么定？**

根据项目不同，常见做法是按功能模块（`feat(auth)`、`fix(button)`）、按目录（`feat(core)`、`fix(utils)`）或按包名（`feat(eslint-config)`）。小项目 scope 可选。关键是在团队内对齐约定，写入项目的 CONTRIBUTING.md。

---

## 实操作业

### 基础练习：配置 Prettier + VS Code 自动格式化

在一个 React/TypeScript 项目中完成以下操作：

1. 安装 Prettier，创建 `prettier.config.mjs`，配置：
   - `singleQuote: true`，`semi: true`，`trailingComma: 'all'`
   - `printWidth: 100`，`tabWidth: 2`
2. 创建 `.vscode/settings.json`，实现保存时自动 Prettier 格式化
3. 写几段格式随意的 TSX 代码，按 `Ctrl+S` 验证自动格式化生效
4. 运行 `npx prettier --check src/` 验证整个项目格式合规

---

### 进阶练习：从零搭建完整的自动化流水线

在一个 Vite + React + TypeScript 项目中，从头搭建完整的代码规范自动化：

1. **ESLint**：用 Flat Config 配置 TS + React 规则
2. **Prettier**：配置 `.prettierrc`，按 3.2 节方式集成到 ESLint
3. **lint-staged**：只对暂存文件执行 `eslint --fix` + `prettier --write`
4. **Husky**：配置 `pre-commit` 和 `commit-msg` 两个 Hook
5. **commitlint**：配置 Conventional Commits 校验
6. **验证**：故意写一段有格式问题和代码质量问题的代码，`git commit` 看 Hook 是否拦截
7. **修复后验证**：修复所有问题后，用规范的 commit message 重新提交，确认通过

---

### 挑战练习：为团队搭建共享配置 + CI 集成

1. 把 ESLint + Prettier + commitlint 的配置抽取为一个 npm 包（`@your-team/code-config`）
2. 在 Monorepo 的两个子项目中安装并引用
3. 在 GitHub Actions（或 GitLab CI）中添加 `lint` 和 `check` Job，确保 PR 合并前自动运行
4. 编写团队使用文档（控制在 20 行以内），包括：
   - clone 后第一次运行的命令
   - VS Code 插件要求
   - commit message 格式要求
   - 常见错误的修复方式

---

## 本节小结

- Prettier 的理念是 **Opinionated**——少配置、少争议，把精力留给真正重要的事
- ESLint 管代码质量（不会出错），Prettier 管格式（不会吵架），二者用 `eslint-config-prettier` 集成
- `eslint-config-prettier` 必须放在配置数组最后，用于关闭所有与 Prettier 冲突的 ESLint 规则
- `lint-staged` 只对暂存文件执行检查，比全量快一个数量级
- Husky 9 通过 `npx husky init` 初始化，Hook 是 `.husky/` 下的纯 shell 脚本
- `pre-commit` Hook 触发 lint-staged，`commit-msg` Hook 触发 commitlint
- Conventional Commits 格式：`type(scope): subject`，支持自动生成 CHANGELOG 和版本号
- VS Code 的 `.vscode/settings.json` 和 `extensions.json` 提交到仓库，全团队自动受益