# 01 ESLint Flat Config 配置

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L3 工程化与质量保障
> - 先修：[04-环境变量与多环境构建](../01-构建工具链/04-环境变量与多环境构建.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[ESLint](https://eslint.org/docs/latest/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 ESLint 的三层价值：静态分析、代码风格约束、潜在错误检测
- 掌握 ESLint 9 的 Flat Config 新配置体系（`eslint.config.js`）
- 能正确配置 `files`、`rules`、`plugins`、`languageOptions`
- 熟练使用 `eslint:recommended` 和 `typescript-eslint` 推荐规则集
- 能独立搭建 React + TypeScript 项目的完整 ESLint 配置
- 能独立搭建 Vue 3 + TypeScript 项目的完整 ESLint 配置
- 掌握自定义规则、覆盖规则和 `ignores` 的配置方法

---

## 内容讲解

### 1. ESLint 到底解决了什么问题？

ESLint 是 JavaScript/TypeScript 生态中最主流的静态代码分析工具。它在**不运行代码**的前提下扫描源码，找出三类问题：

| 层次 | 说明 | 举例 |
|------|------|------|
| **语法/逻辑错误** | 能在编码阶段拦截的潜在 bug | `const a = 1; a = 2;` → 给常量重新赋值 |
| **代码风格** | 团队统一的写法约定 | 缩进用 2 空格还是 4 空格、是否强制分号 |
| **最佳实践** | 避免反模式、低效写法 | `var` 声明、`==` 比较、未使用的变量 |

Prettier 诞生后，代码风格的工作逐渐交给了 Prettier，ESLint 更专注在前两类——**质量** + **最佳实践**。二者的分工下文会详细展开。

> **核心认知**：ESLint 无法替代测试，但它能在你敲代码的时候就拦截掉大量低级错误，把 Code Review 的精力从"这里少了个分号"解放到"这里的逻辑对不对"。

---

### 2. Flat Config：ESLint 9 的全新配置体系

#### 2.1 为什么放弃 .eslintrc？

从 ESLint 9 开始，旧的 `.eslintrc.*`（JSON/YAML/JS）被彻底废弃，统一为 `eslint.config.js`。旧配置的核心痛点：

- **extends 链式叠加**：`extends: ['airbnb', 'plugin:react/recommended']` 层层覆盖，出问题时很难追到是哪层引入的、哪层覆盖的
- **overrides 全局应用**：规则覆盖是全局的，理解成本高
- **插件/解析器是全局字符串引用**：`"plugin:react/recommended"` 这种魔法字符串不好追踪

Flat Config 的核心理念：**配置就是数组，数组元素就是对象，对象之间纯组合**。

#### 2.2 Flat Config 的基本结构

```js
// eslint.config.js —— Flat Config 的最小骨架
export default [
  // 数组中每个元素是一个配置对象，按顺序应用
  // 后面的配置会覆盖前面配置中的同名规则
  {
    // 1. 指定这个配置作用于哪些文件（glob 模式）
    files: ['**/*.ts', '**/*.tsx'],

    // 2. 忽略哪些文件
    ignores: ['**/node_modules/**', '**/dist/**'],

    // 3. 语言选项（替代旧 parserOptions + env + globals）
    languageOptions: {
      ecmaVersion: 2024,         // ECMAScript 版本
      sourceType: 'module',      // 'module' | 'script'
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        // 声明全局变量，避免 undef 报错
        console: 'readonly',
        process: 'readonly',
      },
    },

    // 4. 插件（替代旧 plugins 字段）
    plugins: {
      // key 是插件别名，value 是导入的插件对象
      react: reactPlugin,
      '@typescript-eslint': tseslintPlugin,
    },

    // 5. 规则（替代旧 rules 字段）
    rules: {
      'no-console': 'warn',
      'no-unused-vars': 'error',
      // 规则值：'off' | 'warn' | 'error'（或 0 | 1 | 2）
    },
  },
];
```

#### 2.3 Flat Config vs .eslintrc 对照速查

| 旧配置（.eslintrc） | 新配置（Flat Config） | 说明 |
|---------------------|----------------------|------|
| `extends: ['eslint:recommended']` | 用 `@eslint/js` 包 | 见下文 3.1 |
| `parser: '@typescript-eslint/parser'` | `languageOptions.parser` | 对象注入替代字符串 |
| `parserOptions` | `languageOptions.parserOptions` | 层级变化 |
| `env: { browser: true }` | `languageOptions.globals` | 不再有 `env`，直接用 `globals` 包 |
| `plugins: ['react']` | `plugins: { react: reactPlugin }` | 对象注入替代字符串 |
| `overrides: [...]` | 直接在数组末尾追加配置对象 | 更直观 |

---

### 3. 配置实战：从最小化到生产级

#### 3.1 最简配置：纯 JavaScript 项目

```bash
# 安装 ESLint 9
npm install -D eslint @eslint/js globals
```

```js
// eslint.config.js —— 最简 JS 项目配置
import js from '@eslint/js';       // eslint:recommended 的新载体
import globals from 'globals';     // 声明浏览器/Node 全局变量

export default [
  // 第 1 层：ESLint 核心推荐规则
  js.configs.recommended,

  // 第 2 层：项目自定义规则
  {
    // 全局忽略（可以放在单独对象中，也可以放在任何对象中）
    // 注意：全局 ignores 必须是一个只有 ignores 字段的对象
  },
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },

  // 第 3 层：实际规则配置
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,  // window、document、console 等
        ...globals.node,     // process、__dirname 等
      },
    },
    rules: {
      'no-console': 'warn',              // console.log 提醒但允许
      'no-debugger': 'error',            // debugger 语句直接报错
      'no-unused-vars': 'error',         // 不要留未使用的变量
      'prefer-const': 'error',           // 能 const 就别 let
    },
  },
];
```

#### 3.2 TypeScript 集成配置

```bash
npm install -D typescript-eslint
```

```js
// eslint.config.js —— TypeScript 项目配置
import js from '@eslint/js';
import tseslint from 'typescript-eslint';  // TS ESLint 全家桶
import globals from 'globals';

export default [
  js.configs.recommended,
  // typescript-eslint 提供的推荐规则（已包含 type-checked）
  ...tseslint.configs.recommended,

  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,           // TypeScript 解析器
      parserOptions: {
        project: './tsconfig.json',      // 启用类型检查（需要 tsconfig）
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // 类型相关规则
      '@typescript-eslint/no-explicit-any': 'warn',      // 尽量不用 any
      '@typescript-eslint/no-unused-vars': 'error',       // TS 版的 unused-vars
      '@typescript-eslint/consistent-type-imports': 'error', // 强制 type import
      '@typescript-eslint/no-non-null-assertion': 'warn', // 谨慎使用 ! 断言

      // 关闭与 TS 冲突的 JS 规则
      'no-unused-vars': 'off', // 交给 @typescript-eslint/no-unused-vars
    },
  },
];
```

> **关于 `project: './tsconfig.json'`**：指定这个选项后，ESLint 会调用 TypeScript 的编译器 API 做**类型感知的规则检查**，比如 `@typescript-eslint/no-unnecessary-type-assertion` 这种需要类型信息才能判断的规则。代价是 lint 会变慢。如果不需要类型感知规则，可以改用 `...tseslint.configs.strict`。

---

### 4. React 项目的 ESLint 配置

```bash
npm install -D eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh
```

```js
// eslint.config.js —— React + TypeScript 完整配置
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';

export default [
  // ====== 第 1 层：全局忽略 ======
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '.next/**',          // Next.js 构建产物
      'build/**',          // Create React App 构建产物
    ],
  },

  // ====== 第 2 层：基础推荐规则 ======
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ====== 第 3 层：通用 TS/TSX 文件 ======
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'react': reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    // React 特定设置
    settings: {
      react: {
        version: 'detect',  // 自动检测 React 版本
      },
    },
    rules: {
      // ---------- TypeScript ----------
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },  // _ 开头的参数可以不用
      ],
      '@typescript-eslint/consistent-type-imports': 'error',

      // ---------- React 核心 ----------
      'react/jsx-uses-react': 'off',        // React 17+ 不需要 import React
      'react/react-in-jsx-scope': 'off',    // React 17+ 不需要 import React
      'react/prop-types': 'off',            // 用 TypeScript 定义 props 类型，不需要 prop-types
      'react/jsx-no-target-blank': 'error', // target="_blank" 必须有 rel="noreferrer"
      'react/jsx-key': 'error',             // 列表渲染必须带 key

      // ---------- React Hooks ----------
      'react-hooks/rules-of-hooks': 'error',  // Hooks 必须在顶层调用
      'react-hooks/exhaustive-deps': 'warn',  // useEffect 依赖项完整性检查

      // ---------- React Refresh ----------
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },  // 允许导出常量
      ],

      // ---------- 通用 ----------
      'no-console': ['warn', { allow: ['warn', 'error'] }],  // console.log 提醒，.warn/.error 允许
      'no-debugger': 'error',
    },
  },

  // ====== 第 4 层：配置文件特殊规则 ======
  {
    files: ['*.config.js', '*.config.ts'],
    rules: {
      // 配置文件中允许使用 any 和 require
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
```

---

### 5. Vue 项目的 ESLint 配置

```bash
npm install -D eslint-plugin-vue vue-eslint-parser
```

```js
// eslint.config.js —— Vue 3 + TypeScript 完整配置
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import vuePlugin from 'eslint-plugin-vue';
// vue-eslint-parser 不需要显式 import，插件内部已处理

export default [
  // 全局忽略
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      '.nuxt/**',          // Nuxt 构建产物
      '.output/**',        // Nuxt Nitro 输出
    ],
  },

  // 基础推荐
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ====== Vue 文件配置 ======
  // vue-eslint-parser 是理解 .vue 单文件组件的解析器
  ...vuePlugin.configs['flat/recommended'],  // Vue 推荐规则

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        // 关键：Vue 文件中 <script> 部分用 TS 解析器
        parser: tseslint.parser,
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        // 告诉 vue-eslint-parser 哪些部分是模板
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Vue 特定规则
      'vue/multi-word-component-names': 'warn',   // 组件名至少两个单词
      'vue/no-mutating-props': 'error',           // 不要直接修改 props
      'vue/no-v-html': 'warn',                    // v-html 有 XSS 风险
      'vue/require-default-prop': 'off',          // TS 类型已足够，不强制 default
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],
      'vue/component-tags-order': ['error', {
        order: ['script', 'template', 'style'],  // 统一 SFC 内部顺序
      }],
    },
  },

  // ====== 通用 TS/TSX 文件 ======
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
];
```

---

### 6. 自定义规则与覆盖规则

#### 6.1 按文件类型覆盖

```js
export default [
  // 全局规则
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-console': 'warn',
    },
  },

  // 测试文件：放宽 console 和 any 限制
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    rules: {
      'no-console': 'off',                      // 测试里 console 无所谓
      '@typescript-eslint/no-explicit-any': 'off', // 测试有时需要 any
    },
  },

  // 配置文件：关闭部分检查
  {
    files: ['*.config.ts', '*.config.js', 'scripts/**'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
```

#### 6.2 自定义规则的三种粒度

```js
rules: {
  // 粒度 1：直接关闭/开启
  'no-console': 'off',

  // 粒度 2：'warn' | 'error'（1 | 2）
  'no-unused-vars': 'error',

  // 粒度 3：数组格式，第二个元素是 options
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',       // 忽略 _ 开头的参数
      varsIgnorePattern: '^_',       // 忽略 _ 开头的变量
      caughtErrorsIgnorePattern: '^_', // 忽略 _ 开头的 catch 变量
    },
  ],
},
```

---

### 7. ignores 的全局与局部

```js
export default [
  // ✅ 全局 ignore：整个配置数组中独占一个对象
  // 这种写法"真正全局"生效，优先级最高
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '**/*.min.js',       // 压缩文件不检查
      '**/coverage/**',
    ],
  },

  // ✅ 也可以放在其他配置对象中（作为那个配置的忽略）
  {
    files: ['**/*.ts'],
    ignores: ['**/*.d.ts'],  // 只对 .ts 文件的规则生效时，忽略 .d.ts
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },

  // ⚠️ 常见误区：在 rules 配置和 ignores 混用
  // 下面这种 ignores 只对同对象中的 rules 生效，不是全局的
  {
    files: ['**/*.js'],
    ignores: ['legacy/**'],  // 只是这组 rules 会忽略 legacy/
    rules: { /* ... */ },
  },
];
```

> **最佳实践**：全局 ignores 放在数组最前面，独占一个对象。文件级别的 ignores 放在对应配置对象中。

---

## 常见问题

**Q1: ESLint 9 的 Flat Config 和旧的 `.eslintrc` 能共存吗？**

不能。ESLint 9 会优先使用 `eslint.config.js`。如果项目里两个文件都存在，ESLint 9 会忽略 `.eslintrc`。建议切换后用 `npx @eslint/migrate-config` 工具自动迁移。

**Q2: `typescript-eslint` 的 `recommended` 和 `strict` 有什么区别？**

`recommended` 是适合大多数项目的开箱即用规则集，不包含需要类型信息的规则。`strict` 在 `recommended` 基础上加了更多严格规则，部分需要 `project: './tsconfig.json'` 支持。想要最严格检查可以用 `strictTypeChecked`。

**Q3: 为什么配置了 `eslint-plugin-react-hooks` 的 `exhaustive-deps` 规则后，`useEffect` 的依赖数组会飘红？**

`exhaustive-deps` 规则会检查 `useEffect`/`useMemo`/`useCallback` 的依赖数组是否包含了所有引用的外部变量。飘红说明你的依赖数组不完整——这不是误报，是实实在在的 bug 隐患。如果确实需要忽略，用 eslint-disable 注释并写清楚原因。

**Q4: 能不能在 Vite 项目中用 `eslint.config.ts` 而不是 `.js`？**

不能直接用。ESLint 的配置文件加载器只认 `.js` 和 `.mjs`。如果你用的是 Vite + TypeScript，可以装 `jiti` 来让 Node.js 运行时直接解析 `.ts` 配置文件，但官方推荐写 `eslint.config.js`。

**Q5: `languageOptions.globals` 中 `readonly`、`writable`、`off` 有什么区别？**

- `readonly`：变量可以读但不能赋值（如 `console`）
- `writable`：变量可以读也可以赋值（如 `window.location`）
- `off`：变量完全不可用，访问就报错

一般用 `globals` npm 包提供的内置集合就够了，不需要手动声明。

**Q6: 一个 Monorepo 里如何共享 ESLint 配置？**

把公共配置做成一个单独的 npm 包（如 `@your-org/eslint-config`），导出为 Flat Config 数组。各个子项目安装后直接 `import config from '@your-org/eslint-config'; export default [...config, { /* 子项目独有规则 */ }]`。

**Q7: 如何在 CI 中运行 ESLint 检查？**

```bash
# package.json 中配置 script，然后在 CI 流程中执行
{
  "scripts": {
    "lint": "eslint . --max-warnings 0"
  }
}
# --max-warnings 0：warning 也算失败，确保零告警
```

**Q8: 保存文件时 ESLint 自动修复怎么配？**

在 VS Code 的 `settings.json` 中配置：

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "vue"
  ]
}
```

---

## 实操作业

### 基础练习：搭建一个纯 JS 项目的 ESLint 配置

新建一个空目录，初始化 `package.json`，安装 ESLint 9，创建 `eslint.config.js`，让它：
- 继承 `@eslint/js` 推荐规则
- 声明浏览器和 Node 全局变量
- 禁止 `console.log`（warn 级别）
- 强制使用 `const` 替代 `let`
- 忽略 `dist/` 和 `node_modules/`

写完配置后，创建几个 JS 文件故意写一些违规代码，运行 `npx eslint .` 验证规则生效。

---

### 进阶练习：为现有 React + TypeScript 项目迁移到 Flat Config

找一个你之前写的 React + TypeScript 项目（或从 Vite 模板创建），将其从 `.eslintrc.cjs` 迁移到 `eslint.config.js`：

1. 卸载旧配置依赖（如 `@typescript-eslint/parser`、`@typescript-eslint/eslint-plugin` 等旧版本）
2. 安装 ESLint 9 生态对应的新包
3. 按上文「React 项目完整配置」搭建
4. 运行 `npx eslint src/` 看报错，逐一修复（不是关规则，是修代码）
5. 在 `package.json` 中加 `lint` 和 `lint:fix` 脚本

---

### 挑战练习：搭建 Monorepo 共享 ESLint 配置 + 子项目差异化覆盖

在一个 pnpm workspace 的 Monorepo 中：

1. 在 `packages/eslint-config/` 中创建一个共享配置包，包含 TS + React 基础规则
2. 两个子项目 A（后台管理系统）和 B（H5 活动页）分别引用共享配置，并叠加各自的差异化规则：

   - 项目 A：严格控制 `any`、禁止 `console`、开启所有 strict 规则
   - 项目 B：放宽 `console`、允许 `any`、关闭 `exhaustive-deps`

3. 根目录 `package.json` 中配置 `lint` 和 `lint:fix`，通过 `pnpm -r lint` 运行所有子项目的检查

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L3 里程碑](../../projects/atlas/milestones/L3.md)
- 本课任务：把“ESLint Flat Config 配置”接入 Atlas 工程链路，形成可重复命令和失败门禁，并保存一次故意失败与恢复的证据。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

- ESLint 的核心价值是**静态分析**——在编码阶段拦截错误、统一最佳实践
- ESLint 9 的 Flat Config 用数组 + 对象替代了旧的 extends 链式叠加，更清晰可控
- `eslint.config.js` 中每个对象代表一组规则，`files` 限定作用范围，`ignores` 排除文件
- `languageOptions` 统一了旧版的 `parser`、`parserOptions`、`env`、`globals`
- TypeScript 项目用 `typescript-eslint` 全家桶，React 额外加 `eslint-plugin-react` + `eslint-plugin-react-hooks`
- 自定义规则的优先级：数组后面的配置覆盖前面的，`files` 越具体的越靠后
- 全局 `ignores` 独占一个对象，放在数组最前面

<!-- course-nav:start -->
---

[上一篇：04-环境变量与多环境构建](../01-构建工具链/04-环境变量与多环境构建.md) · [课程地图](../../README.md) · [下一篇：02 Prettier + Husky 自动化流水线](./02-Prettier-Husky-自动化.md)
<!-- course-nav:end -->
