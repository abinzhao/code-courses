# 01 ESM 规范与动态导入

## 学习目标

- 理解模块化的发展历史：IIFE → CommonJS → AMD → UMD → ESM
- 说清"为什么需要模块化"的三个核心痛点
- 掌握 ESM 的 `export` / `import` 全语法
- 理解静态导入与动态导入的区别与适用场景
- 懂得 `<script type="module">` 的行为特性
- 能够将传统 script 项目迁移为 ESM 结构

---

## 内容讲解

### 1. 模块化发展史：没有模块化的日子有多痛？

在没有模块化的年代，所有代码写在一个文件里，或者用多个 `<script>` 标签按顺序加载。

```html
<!-- 传统方式：所有脚本全局共享作用域 -->
<script src="utils.js"></script>
<script src="user.js"></script>
<script src="app.js"></script>
```

这种写法带来了三个致命问题：

| 痛点 | 说明 | 典型场景 |
|------|------|----------|
| **命名冲突** | 所有变量挂在全局，后加载的覆盖先加载的 | `utils.js` 和 `user.js` 都定义了 `data`，后一个覆盖前一个 |
| **依赖管理** | 依赖关系靠 script 标签顺序，人工维护 | `app.js` 依赖 `user.js`，忘记引用或顺序错了就报 undefined |
| **代码组织** | 无边界隔离，大型项目完全不可维护 | 上百万行代码混在一个全局作用域里，改一行可能崩一片 |

为了解决这些问题，社区经历了一系列演化：

#### 1.1 IIFE（Immediately Invoked Function Expression）—— 函数闭包隔离

```js
// IIFE 模式：用立即执行函数创建私有作用域
const myModule = (function () {
  // 私有变量：外部无法直接访问
  const privateData = '不被外界污染的数据';

  // 暴露公共 API
  return {
    getData() {
      return privateData;
    },
  };
})();

console.log(myModule.getData()); // '不被外界污染的数据'
console.log(myModule.privateData); // undefined —— 私有的，拿不到
```

IIFE 解决了命名冲突，但**依赖管理**仍然靠手动排序 `<script>` 标签解决。

#### 1.2 CommonJS —— 服务端模块规范（2009）

```js
// 导出
module.exports = { add, subtract };

// 导入
const math = require('./math');
```

**特点**：同步加载（适合服务端本地文件读取）、每个文件是一个模块、`require` 时执行并缓存。

#### 1.3 AMD（Asynchronous Module Definition）—— 浏览器异步加载（2011）

```js
// AMD 通过 define 声明依赖，回调中获取模块
define(['jquery', 'underscore'], function ($, _) {
  // 模块代码
});
```

**特点**：异步加载（适合浏览器网络环境）、依赖前置声明。RequireJS 是典型实现。写法繁琐，逐渐被淘汰。

#### 1.4 UMD（Universal Module Definition）—— 兼顾 CJS 和 AMD

```js
// UMD 样板：同时兼容 CommonJS、AMD、全局变量三种环境
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD 环境
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS 环境
    module.exports = factory(require('jquery'));
  } else {
    // 浏览器全局变量
    root.myLib = factory(root.jQuery);
  }
})(this, function ($) {
  // 库的核心逻辑
  return { /* ... */ };
});
```

**特点**：一库三用，是库开发者兼容多环境的妥协方案。

#### 1.5 ESM（ES Modules）—— 官方标准（ES2015 / ES6）

```js
// 简单直接：export 导出，import 导入
export const add = (a, b) => a + b;
import { add } from './math.js';
```

**关键优势**：静态结构（编译时就能确定依赖关系，支持 Tree Shaking）、浏览器原生支持、Node.js 从 12 开始稳定支持。

---

### 2. ESM 核心语法：export 与 import

#### 2.1 命名导出（Named Export）—— 一个模块可以导出多个

```js
// math.js —— 命名导出：一个文件导出多个具名成员
export const PI = 3.14159;

export function add(a, b) {
  return a + b;
}

export function multiply(a, b) {
  return a * b;
}

// 或者先声明再集中导出（两种写法等价）
// const add = (a, b) => a + b;
// const multiply = (a, b) => a * b;
// export { add, multiply };
```

#### 2.2 默认导出（Default Export）—— 每个模块只能有一个

```js
// calculator.js —— 默认导出：一个模块只导出一个"主角"
export default class Calculator {
  constructor() {
    this.result = 0;
  }

  add(n) {
    this.result += n;
    return this;
  }

  getResult() {
    return this.result;
  }
}

// 一个文件可以同时有默认导出和命名导出
// export default Calculator;
// export const VERSION = '1.0.0';
```

#### 2.3 导入语法全解

```js
// 1. 命名导入 —— 必须用 { } 精确匹配导出名
import { add, multiply } from './math.js';

// 2. 默认导入 —— 不带 { }，文件名可以随意取
import Calculator from './calculator.js';

// 3. 混合导入 —— 同时拿默认和命名
import Calculator, { VERSION } from './calculator.js';

// 4. 命名空间导入 —— 把所有导出打包成一个对象
import * as math from './math.js';
console.log(math.add(1, 2)); // 3
console.log(math.PI);         // 3.14159

// 5. 副作用导入 —— 只执行模块，不拿任何导出
import './init.js'; // init.js 里的代码会自动执行一遍

// 6. 重命名导入 —— 用 as 给导入的成员起别名
import { add as sum, multiply as product } from './math.js';
```

> **关键规则**：ESM 的 `import` 语句必须写在文件最顶层，不能放在 `if` 或函数内部。这是它"静态"特性的来源。

---

### 3. 静态导入 vs 动态导入

#### 3.1 静态导入 —— 编译时确定

```js
// 静态 import 语句在代码执行前就被解析
// 这就是为什么它必须放在文件顶层
import { render } from './ui.js';

// 以下写法全部非法：
// if (condition) { import ... }    // ❌
// function foo() { import ... }    // ❌
```

#### 3.2 动态导入 —— `import()` 函数

```js
// import() 返回一个 Promise，可以在任何位置调用
button.addEventListener('click', async () => {
  // 点击按钮时才加载模块 —— 这就是"按需加载"（lazy loading）
  const { default: Chart } = await import('./chart.js');
  new Chart('#container').render();
});

// 条件加载：根据运行环境选择不同模块
let encrypt;
if (window.crypto) {
  encrypt = (await import('./web-encrypt.js')).encrypt;
} else {
  encrypt = (await import('./polyfill-encrypt.js')).encrypt;
}
```

> **关键区别**：静态 `import` 用于始终需要的核心依赖；`import()` 用于可选功能、大型组件、条件加载等场景。Webpack/Vite 遇到 `import()` 会自动做代码分割（code splitting）。

---

### 4. ESM 静态结构带来的红利

#### 4.1 Tree Shaking —— 摇掉没用到的代码

```js
// utils.js 导出了 3 个函数
export const fnA = () => 'a';
export const fnB = () => 'b';
export const fnC = () => 'c';

// app.js 只用了 fnA
import { fnA } from './utils.js';
console.log(fnA());
```

因为 ESM 是静态的，打包工具能确切知道 `fnB` 和 `fnC` **没有被任何地方引用**，于是直接把它们从最终产物中删除。这就是 Tree Shaking——ESM 天生支持，CommonJS 做不到。

#### 4.2 静态分析

构建工具可以在不运行代码的情况下：
- 检查缺失的导入
- 发现循环依赖
- 生成精确的依赖图谱
- 做 Bundle 分析优化

---

### 5. `<script type="module">` 的行为特性

```html
<!-- type="module" 声明这是一个 ESM 模块 -->
<script type="module" src="./app.js"></script>

<!-- 内联写法同样支持 -->
<script type="module">
  import { init } from './app.js';
  init();
</script>
```

| 特性 | 普通 `<script>` | `<script type="module">` |
|------|----------------|--------------------------|
| 执行时机 | 下载完立即执行（阻塞解析） | **默认 defer**（等 HTML 解析完再执行） |
| 跨域 | 无限制 | **必须显式允许 CORS**（`Access-Control-Allow-Origin`） |
| 严格模式 | 需手动写 `'use strict'` | **自动严格模式** |
| 作用域 | 顶层变量是全局变量 | **顶层变量是模块内的**，不污染全局 |
| 重复加载 | 多次加载执行多次 | **相同 URL 只执行一次** |

> **踩坑提示**：在本地通过 `file://` 协议打开 HTML 时，`type="module"` 会因为 CORS 策略报错。必须用本地服务器（`npx serve` 或 VS Code Live Server）打开。

---

### 6. `import.meta` 的用途

```js
// import.meta 提供当前模块的元信息
console.log(import.meta.url); // 当前模块的完整 URL

// 在浏览器中获取当前脚本路径
const currentScriptPath = new URL(import.meta.url);

// Vite 等构建工具会扩展 import.meta
console.log(import.meta.env.MODE);        // Vite 环境变量
console.log(import.meta.glob('./*.md'));  // Vite Glob 导入
```

---

### 7. 实战：将传统 script 项目迁移为 ESM

#### 迁移前的传统项目结构

```
project/
├── index.html       —— 所有 script 标签全写在这里
├── utils.js         —— window.utils = { ... }
├── api.js           —— 依赖 utils，通过全局变量通信
├── app.js           —— 依赖 utils 和 api
└── constants.js     —— window.CONFIG = { ... }
```

```html
<!-- 迁移前：index.html 中的 script 地狱 -->
<script src="constants.js"></script>
<script src="utils.js"></script>
<script src="api.js"></script>
<script src="app.js"></script>
```

```js
// 迁移前：utils.js —— 所有东西挂在全局
window.utils = {
  formatDate(date) { /* ... */ },
  debounce(fn, delay) { /* ... */ },
};
```

#### 迁移步骤

**第 1 步**：每个文件改为 ESM 导出

```js
// utils.js —— 用 export 替代 window.xxx =
export function formatDate(date) {
  return date.toISOString().split('T')[0];
}

export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
```

```js
// api.js —— 显式声明它依赖什么
import { debounce } from './utils.js';

export async function fetchUser(id) {
  const res = await fetch(`/api/user/${id}`);
  return res.json();
}

export const searchUser = debounce(async (keyword) => {
  const res = await fetch(`/api/user?q=${keyword}`);
  return res.json();
}, 300);
```

```js
// app.js —— 入口文件，把所有依赖串起来
import { fetchUser, searchUser } from './api.js';
import { formatDate } from './utils.js';

async function init() {
  const user = await fetchUser(1);
  console.log(formatDate(new Date(user.createdAt)));
}

init();
```

**第 2 步**：index.html 只留一个入口

```html
<!-- 迁移后：只有一个 script 标签 -->
<script type="module" src="./app.js"></script>
```

**第 3 步**：验证

```bash
# 必须用本地服务器打开，不能用 file:// 协议
npx serve .
# 打开 http://localhost:3000，检查控制台无报错
```

#### 迁移检查清单

- [ ] 所有 `window.xxx =` 改为 `export`
- [ ] 所有全局变量引用改为 `import`
- [ ] HTML 中只保留一个 `<script type="module">`
- [ ] 文件中未使用的变量可以放心删除（不再污染全局）
- [ ] 确认使用本地服务器打开（非 `file://`）

---

## 常见问题

**Q1: 为什么 ESM 的 import 必须写 `.js` 后缀，而 CommonJS 的 require 可以不写？**

Node.js 的 `require()` 有自动补全机制（尝试 `.js`、`.json`、`.node`、目录下的 `index.js`），而浏览器没有文件系统概念，ESM 必须给完整路径。即使使用打包工具，保持 `.js` 后缀也是最佳实践。

**Q2: `export default` 和具名导出选哪个？**

没有绝对标准，业界惯例是：**工具函数用具名导出**（方便 Tree Shaking 和按需引入），**组件/类用默认导出**（一个文件一个主角）。但团队项目统一即可。

**Q3: `import()` 返回的 Promise 的 then 回调里拿到的模块对象结构是怎样的？**

```js
import('./module.js').then((module) => {
  console.log(module);
  // { default: '默认导出', namedExport: '命名导出', __esModule: true }
});
```

**Q4: 多个模块之间形成循环引用会怎样？**

ESM 会先完成所有模块的"连接"阶段（只收集导出），再执行代码。循环引用不会报错，但可能拿到 `undefined`。所以尽量避免循环引用，或者在循环引用中用函数延迟取值。

**Q5: `<script type="module">` 和 `<script defer>` 有什么区别？**

执行顺序相同（等 HTML 解析完），但 `type="module"` 额外带来：严格模式、模块作用域、CORS 限制、相同 URL 只执行一次。它是 `defer` 的超集。

**Q6: `import.meta.url` 在浏览器和 Node.js 中分别返回什么？**

浏览器返回类似 `http://localhost:3000/js/app.js`；Node.js 返回 `file:///User/project/js/app.js`。都是完整 URL 字符串。

**Q7: Vite/Webpack 的 `@/` 路径别名和 ESM 有关系吗？**

没关系。路径别名是打包工具的"魔法"，不是 ESM 标准。Node.js 原生的 ESM 不支持 `@/`，但在构建工具加持下可以写。

**Q8: 如何在 Node.js 中判断当前文件是 ESM 还是 CJS？**

```js
// 在 CJS 中
console.log(typeof require); // 'function'

// 在 ESM 中——require 不存在，但可以检查
console.log(import.meta.url); // 能访问，说明是 ESM
```

---

## 实操作业

### 基础练习：将全局脚本改为 ESM

给定一个小的 HTML 单页项目（3 个 JS 文件通过 `<script>` 标签加载，彼此依赖全局变量），将其改写为 ESM 结构。

**要求**：
- 入口 HTML 中只保留一个 `<script type="module">`
- 所有文件间通信通过 `import`/`export`，不使用 `window` 全局变量
- 使用本地服务器验证运行

---

### 进阶练习：实现一个支持懒加载的模块管理器

编写一个 `ModuleManager` 类，支持按需动态加载模块：

```js
// 预期用法
const manager = new ModuleManager({
  'user-detail': () => import('./user-detail.js'),
  'dashboard': () => import('./dashboard.js'),
});

// 点击侧边栏时按需加载对应模块
sidebar.onClick(async (name) => {
  const module = await manager.load(name);
  module.render();
});
```

**要求**：
- 已加载的模块需要缓存，重复调用 `load` 不重新加载
- 加载中状态正确处理（并发调同一模块只发一次网络请求）
- 处理加载失败的情况（展示错误提示）

---

### 挑战练习：分析一个真实网站的模块加载策略

打开 GitHub / VS Code Web / Figma 等复杂应用，通过 Chrome DevTools 的 Network 面板观察：

1. 首次加载了几个 JS 文件？哪些是同步加载的，哪些是懒加载的？
2. 懒加载的 chunk 之间有没有依赖关系？chunk 大小约多少？
3. 写一份 300 字以内的分析报告，描述你观察到的加载策略和优化手段。

---

## 本节小结

- 模块化从 IIFE → CJS → AMD → UMD → ESM 一路演化，ESM 是官方标准
- ESM 静态结构的核心价值：Tree Shaking、编译时检查、打包优化
- `export` 分命名导出和默认导出；`import` 支持命名/默认/命名空间/副作用四种写法
- `import()` 动态导入返回 Promise，用于按需加载和代码分割
- `<script type="module">` 自带 defer + 严格模式 + 模块作用域
- 迁移传统项目到 ESM：所有 `window.xxx` → `export`，所有全局引用 → `import`