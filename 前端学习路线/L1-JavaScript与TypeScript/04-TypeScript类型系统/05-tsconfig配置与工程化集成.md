# 05-tsconfig 配置与工程化集成

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L1 JavaScript 与 TypeScript
> - 先修：[04-工具类型与类型体操](./04-工具类型与类型体操.md)
> - 建议用时：120-180 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[TypeScript](https://www.typescriptlang.org/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 掌握 `tsconfig.json` 的核心配置项及其作用
- 理解 `strict` 模式各子选项的含义
- 能正确配置路径别名并让编辑器、构建工具一致识别
- 掌握声明文件（`.d.ts`）的编写场景和方法
- 理解 `@types/xxx` 的查找机制
- 能在 Vite 项目中集成 TypeScript
- 掌握从 JS 到 TS 的渐进式迁移策略

---

## 内容讲解

### 1. tsconfig.json 核心配置

`tsconfig.json` 是 TypeScript 编译器的配置文件，放在项目根目录。先看一个典型的前端项目配置：

```jsonc
{
  "compilerOptions": {
    // ---------- 基础编译 ----------
    "target": "ES2020",              // 编译目标 JS 版本
    "module": "ESNext",              // 模块系统（前端项目用 ESNext）
    "moduleResolution": "bundler",   // 模块解析策略（TS 5.0+，适合 Vite/Webpack）
    "lib": ["ES2020", "DOM", "DOM.Iterable"],  // 编译时可用的内置 API 声明

    // ---------- 输出控制 ----------
    "outDir": "./dist",              // 编译输出目录
    "rootDir": "./src",              // 源码根目录
    "declaration": true,             // 生成 .d.ts 声明文件（库开发必开）
    "declarationMap": true,          // 生成声明文件的 source map
    "sourceMap": true,               // 生成 .js.map

    // ---------- 严格检查（强烈推荐全开）----------
    "strict": true,                  // 一键开启下面所有 strict 子选项
    "noUnusedLocals": true,          // 未使用的局部变量报错
    "noUnusedParameters": true,      // 未使用的参数报错
    "noFallthroughCasesInSwitch": true,  // switch 穿透 case 报错

    // ---------- 模块与路径 ----------
    "baseUrl": ".",                  // 路径别名的基准目录
    "paths": {
      "@/*": ["./src/*"]            // @/ 映射到 ./src/
    },
    "esModuleInterop": true,         // 兼容 CommonJS 模块的默认导入
    "forceConsistentCasingInFileNames": true,  // 强制文件名大小写一致

    // ---------- 其他 ----------
    "skipLibCheck": true,            // 跳过 .d.ts 文件的类型检查（加速编译）
    "jsx": "react-jsx"               // JSX 处理方式（React 17+ 用 react-jsx）
  },
  "include": ["src"],                // 编译 src 目录下的文件
  "exclude": ["node_modules", "dist"] // 排除这些目录
}
```

### 2. 核心配置项逐条拆解

#### target：编译目标

```typescript
// target 决定了 TS 会把语法降级到什么程度
// 示例：?? 操作符在不同 target 下的编译结果

// 源码：
const value = input ?? 'default';

// target: "ES2020" → const value = input ?? 'default';（原样保留）
// target: "ES2015" → const value = input !== null && input !== void 0 ? input : 'default';
```

**建议**：前端项目设为 `ES2020` 或 `ESNext`，只针对需要兼容的浏览器做 polyfill。

#### module 和 moduleResolution

| `module` 值 | 模块语法 | 适用场景 |
|-------------|---------|---------|
| `CommonJS` | `require` / `module.exports` | Node.js 项目 |
| `ESNext` | `import` / `export` | 现代前端项目（搭配打包器） |
| `Preserve` | 保留原样 | 由打包器处理模块 |

| `moduleResolution` 值 | 解析策略 | 适用场景 |
|-----------------------|---------|---------|
| `node` | Node.js 风格（查 node_modules） | Node 项目、旧版前端项目 |
| `bundler`（TS 5.0+） | 打包器风格（支持无扩展名导入） | Vite、Webpack 项目 |
| `classic` | 已废弃 | 不推荐 |

#### lib

`lib` 告诉 TypeScript 编译时有哪些内置 API 可用。不设置时，TypeScript 会根据 `target` 自动选择默认的 lib。

```jsonc
// 前端项目典型配置
"lib": ["ES2020", "DOM", "DOM.Iterable"]

// 含义：
// ES2020  → Promise.allSettled, matchAll, BigInt 等
// DOM     → document, window, HTMLElement 等浏览器 API
// DOM.Iterable → NodeList 可迭代等
```

#### include 和 exclude

```jsonc
// include：编译器只处理这些文件
"include": ["src/**/*"],

// exclude：排除这些路径（默认排除 node_modules）
"exclude": ["node_modules", "dist", "**/*.test.ts"]
```

### 3. strict 模式深度拆解

`"strict": true` 等于同时开启以下所有子选项：

| 子选项 | 作用 | 关闭的风险 |
|--------|------|-----------|
| `strictNullChecks` | `null` 和 `undefined` 不能赋值给其他类型 | 无法发现空值引用的 bug |
| `noImplicitAny` | 禁止隐式 `any` | 类型系统形同虚设 |
| `strictFunctionTypes` | 函数参数逆变检查 | 函数赋值时可能丢失类型安全 |
| `strictBindCallApply` | `bind`/`call`/`apply` 参数检查 | 动态调用时参数可能不匹配 |
| `strictPropertyInitialization` | 类属性必须初始化 | 属性使用前可能为 undefined |
| `noImplicitThis` | 禁止隐式 `any` 的 `this` | `this` 上下文混乱 |
| `alwaysStrict` | 输出 `"use strict"` | 无（建议保持开启） |
| `useUnknownInCatchVariables` | `catch` 的 error 默认为 `unknown`（非 `any`） | 错误处理不安全 |

**实际影响示例**：

```typescript
// ---------- strictNullChecks ----------
// 关闭时：
let name: string = null;  // ✅ 不报错
name.toUpperCase();       // 💥 运行时 TypeError

// 开启时：
// let name: string = null;  // ❌ 编译报错！
let name: string | null = null;
name?.toUpperCase();       // ✅ 安全

// ---------- noImplicitAny ----------
// 关闭时：
function greet(name) { }   // ✅ 不报错，name 被隐式推断为 any

// 开启时：
// function greet(name) { } // ❌ 编译报错
function greet(name: string) { }  // ✅ 必须显式注解

// ---------- useUnknownInCatchVariables ----------
try {
  throw new Error('出错了');
} catch (error) {
  // strict 模式下 error 类型是 unknown
  // console.log(error.message);  // ❌ 需要类型收窄
  if (error instanceof Error) {
    console.log(error.message);   // ✅
  }
}
```

### 4. 路径别名配置

路径别名让你用 `@/components/Button` 代替 `../../components/Button`。

**完整的三步配置**：

```jsonc
// 1. tsconfig.json：让 TS 识别别名
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

```javascript
// 2. vite.config.ts：让 Vite 构建时识别别名（以 Vite 为例）
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

```jsonc
// 3. package.json（可选，用于 Jest 等测试工具）
{
  "jest": {
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/src/$1"
    }
  }
}
```

> **关键认知**：`tsconfig.json` 的 `paths` 只影响 TypeScript 的类型检查，不影响运行时的模块解析。运行时解析由构建工具（Vite/Webpack）或 Node.js 负责。两边必须同步配置。

### 5. 声明文件（.d.ts）

声明文件是 TypeScript 与 JavaScript 生态交互的桥梁。

#### 场景一：为无类型的 JS 库写声明

```typescript
// types/legacy-lib.d.ts
declare module 'legacy-lib' {
  export function doSomething(input: string): number;
  export const VERSION: string;
}

// 之后在代码中直接 import，就有类型提示了
import { doSomething } from 'legacy-lib';
```

#### 场景二：扩展全局类型

```typescript
// types/global.d.ts

// 扩展 Window 对象
declare global {
  interface Window {
    __APP_CONFIG__: {
      apiBase: string;
      env: 'dev' | 'prod';
    };
  }
}

// 声明全局函数
declare function getCurrentUser(): { id: number; name: string };

// 声明 .vue 文件的模块类型（让 TS 认识 .vue 文件）
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// 声明静态资源
declare module '*.svg' {
  const content: string;
  export default content;
}
```

#### 场景三：为环境变量声明类型

```typescript
// env.d.ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  readonly VITE_APP_TITLE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// 现在 import.meta.env.VITE_API_BASE 就有类型提示了
```

### 6. DefinitelyTyped 与 @types

当你在 TypeScript 中使用第三方 JS 库时，需要它们的类型声明。

```bash
# 安装类型包（命名规则：@types/包名）
npm install --save-dev @types/lodash
npm install --save-dev @types/react @types/react-dom
```

**类型查找机制**：

1. 先在库本身的 `package.json` 中查找 `types` 或 `typings` 字段。
2. 如果库自带 `.d.ts` 文件（越来越多的库这样做），直接用。
3. 如果库没有自带类型，TypeScript 会在 `node_modules/@types/` 中查找同名的包。
4. 如果都没有，你需要自己写声明文件（见上一节）。

```jsonc
// tsconfig.json 中可以指定类型查找范围
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./typings"],
    "types": []  // 默认加载所有 @types/*，设为空数组则只加载 typeRoots 中显式导入的
  }
}
```

### 7. Vite 中集成 TypeScript

Vite 天然支持 TypeScript，但只做**语法转译**，不做**类型检查**。你需要额外配置类型检查：

```bash
# 项目结构
my-app/
├── src/
│   ├── main.ts
│   └── components/
├── tsconfig.json
├── vite.config.ts
├── index.html
└── package.json
```

```jsonc
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",  // 先类型检查再构建
    "type-check": "vue-tsc --noEmit"             // 仅类型检查，不输出文件
  }
}
```

```javascript
// vite.config.ts（Vite 配置文件也用 TypeScript）
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

> **关键认知**：Vite 用 esbuild 或 SWC 做 TS 转译，速度极快但不检查类型。你必须单独运行 `tsc --noEmit`（或 `vue-tsc --noEmit`）来做类型检查。推荐在 `build` 命令和 CI 流水线中都加入类型检查步骤。

### 8. 渐进式迁移 JS → TS 的策略

将现有 JS 项目迁移到 TypeScript 不需要一步到位。推荐这个分阶段策略：

| 阶段 | 动作 | tsconfig 关键配置 |
|------|------|------------------|
| 1. 基础设施 | 安装 TS，创建 `tsconfig.json`，配置构建工具 | `allowJs: true` |
| 2. 宽松检查 | 关闭 `strict`，逐个文件重命名为 `.ts` | `strict: false`, `noImplicitAny: false` |
| 3. 逐文件加固 | 给核心模块加类型注解 | 逐步开启 strict 子选项 |
| 4. 全面严格 | 全项目 `strict: true`，清理 `any` | `strict: true` |

```jsonc
// 阶段 1/2 的宽松配置
{
  "compilerOptions": {
    "allowJs": true,           // 允许编译 .js 文件
    "checkJs": false,          // 不检查 .js 文件的类型错误
    "strict": false,
    "noImplicitAny": false,
    "outDir": "./dist"
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

**迁移技巧**：

1. **先改文件名，后加类型**：先 `.js` → `.ts`，用 `any` 占位，编译通过后再补类型。
2. **从底层往上**：先给工具函数、数据模型加类型，再给 UI 组件加。
3. **善用 `any` 做临时方案**：标记 `// TODO: 补充类型`，不要为了去 `any` 而写不正确的类型。
4. **利用 `@ts-expect-error`**：对于确实无法用 TS 表达的临时代码，用 `@ts-expect-error` 注释抑制错误，比 `as any` 更明确。

```typescript
// 临时抑制类型错误，并在下一行写原因
// @ts-expect-error 等待 PR #1234 合并后移除
const temp = legacyFunction(data);
```

### 9. 实战：配置一个生产级别的前端 TypeScript 项目

假设你要搭建一个 React + TypeScript + Vite 的严肃项目，完整配置如下：

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    // 基础
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],

    // 严格模式（全开）
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,  // 允许 undefined 赋值给可选属性

    // 模块与路径
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,       // 确保每个文件都是独立模块（Vite 要求）

    // 输出
    "jsx": "react-jsx",
    "skipLibCheck": true,
    "noEmit": true,                // 不输出编译文件（由 Vite 处理构建）
    "sourceMap": true
  },
  "include": ["src", "vite-env.d.ts"],
  "exclude": ["node_modules", "dist"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```jsonc
// tsconfig.node.json（Node 端配置，如 vite.config.ts 用）
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

```jsonc
// .vscode/settings.json（可选，统一团队编辑器行为）
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  }
}
```

---

## 常见问题

**Q1: `strict: true` 之后项目全是报错怎么办？**

先确认是否为新项目还是迁移项目。新项目直接修。迁移项目可以先把 `strict` 设为 `false`，再逐个子选项地打开，优先修复 `noImplicitAny` 和 `strictNullChecks`。

**Q2: `moduleResolution: "node"` 和 `"bundler"` 到底怎么选？**

现代前端项目（Vite/Webpack/esbuild）用 `"bundler"`；Node.js 项目用 `"node"`；老旧项目用 `"node"` 也可以，但 `"bundler"` 对无扩展名导入更友好。

**Q3: 为什么 Vite 中改了 tsconfig paths，编辑器还是报找不到模块？**

检查三点：(1) 是否重启了 TS Server（VS Code 中按 `Cmd+Shift+P` → `TypeScript: Restart TS Server`）；(2) Vite 配置中的 alias 是否同步设置；(3) `baseUrl` 是否正确设置。

**Q4: `.d.ts` 文件和 `.ts` 文件有什么区别？**

`.d.ts` 只包含类型声明，不包含可执行代码，编译后不产生 `.js` 文件。`.ts` 文件包含实际逻辑。库的入口通常指向 `.d.ts` 文件。

**Q5: 如何判断一个 npm 包是否自带类型？**

看包的 `package.json` 中是否有 `types` 字段；或者包内是否有 `.d.ts` 文件；或者安装 `@types/包名` 试试看是否存在。

**Q6: `skipLibCheck: true` 有什么副作用？**

它会跳过所有 `.d.ts` 文件的类型检查（包括你自己的和 `@types` 下的）。好处是编译速度大幅提升，坏处是可能遗漏类型声明文件中的错误。推荐开启——绝大多数情况下 `.d.ts` 文件的错误与你无关。

**Q7: TypeScript 项目的 `devDependencies` 和 `dependencies` 应该怎么放？**

`typescript` 放 `devDependencies`（只在开发/构建时用，运行时不需）。`@types/xxx` 也放 `devDependencies`。如果库需要暴露类型给消费者，`typescript` 仍然放 `devDependencies`。

---

## 实操作业

### 基础：从零搭建 TS 项目脚手架

1. 创建一个空目录，用 `npm init` 初始化。
2. 安装 `typescript`，创建 `tsconfig.json`（开启 `strict: true`）。
3. 创建 `src/index.ts`，写一个带类型注解的函数。
4. 运行 `npx tsc --noEmit` 检查类型是否通过。
5. 添加 `paths` 别名，在 `src/utils/format.ts` 中用别名导入到 `index.ts`。

**验收标准**：`npx tsc --noEmit` 无错误输出。

### 进阶：为 lodash 的 `get` 方法写类型声明

创建一个 `.d.ts` 文件，为 `lodash.get` 提供比 `@types/lodash` 更精确的类型：

```typescript
// 目标：返回值类型根据路径自动推断
const obj = { a: { b: { c: 42 } } };

// 你的类型声明要让下面这些调用都有正确的类型推断：
const c = myGet(obj, 'a.b.c');         // c 类型：number
const b = myGet(obj, 'a.b');            // b 类型：{ c: number }
const d = myGet(obj, 'a.b.d', '默认');  // d 类型：string（路径不存在，用默认值）
```

### 挑战：配置 CI 友好的 TypeScript 检查流水线

在一个已有 Vite + TypeScript 项目中：

1. 添加 `lint-staged` + `husky`，在 commit 前自动运行 `tsc --noEmit`。
2. 配置 `.github/workflows/ci.yml`（或同等的 CI 配置），包含类型检查步骤。
3. 写一段文档说明：当 CI 类型检查失败时，如何根据错误提示定位和修复。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L1 里程碑](../../projects/atlas/milestones/L1.md)
- 本课任务：把“tsconfig 配置与工程化集成”落实为 Atlas 中可独立导入的模块或纯函数，补充正常、边界、异常三类自动测试。
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

TypeScript 的工程化配置看似繁琐，但掌握核心逻辑后就很简单：

- **`tsconfig.json`** 的核心是 `target`、`module`、`moduleResolution`、`strict`、`paths` 五项。大多数项目只需一个合理的模板做微调。
- **`strict: true`** 是 TypeScript 价值的基石，新项目直接开，老项目逐步开。
- **路径别名**需要 TS 和构建工具两边同步配置，不是 TS 单方面的事情。
- **声明文件**是 TS 与 JS 生态的桥梁——`declare module` 给旧库加类型，`declare global` 扩展全局类型。
- **Vite 集成**的要点是构建前必须跑一次 `tsc --noEmit`（类型检查），避免通过编译但类型有错的代码上线。
- **渐进迁移**从 `allowJs` + 关闭 `strict` 开始，逐文件重命名、补类型、开启严格检查。

至此，L1 阶段 TypeScript 类型系统的五篇教程全部结束。你已经有能力在真实项目中熟练运用 TypeScript 了。下一阶段你将进入模块化与包管理的世界。

<!-- course-nav:start -->
---

[上一篇：04-工具类型与类型体操](./04-工具类型与类型体操.md) · [课程地图](../../README.md) · [下一篇：01 ESM 规范与动态导入](../05-模块化与包管理/01-ESM规范与动态导入.md)
<!-- course-nav:end -->
