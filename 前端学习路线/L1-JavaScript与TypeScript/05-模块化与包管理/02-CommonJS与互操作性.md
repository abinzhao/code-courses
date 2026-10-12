# 02 CommonJS 与互操作性

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L1 JavaScript 与 TypeScript
> - 先修：[01 ESM 规范与动态导入](./01-ESM规范与动态导入.md)
> - 建议用时：120-180 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[TypeScript](https://www.typescriptlang.org/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 CommonJS 的加载、执行和缓存机制
- 分清 `module.exports`、`exports`、`require` 的关系
- 能在 Node.js 中判断和配置 ESM、CommonJS 模块类型
- 掌握 ESM 与 CommonJS 互相调用的边界和常见错误
- 能设计同时支持 `import` 和 `require` 的 npm 包入口
- 能定位循环依赖、重复实例和默认导入异常等问题

## 内容讲解

### 1. CommonJS 解决了什么问题

CommonJS 是 Node.js 早期采用的模块规范。它把每个文件视为一个独立模块，模块默认拥有自己的作用域，不再把所有变量直接放到全局对象上。

```js
// math.cjs
const PI = 3.1415926;

function add(a, b) {
  return a + b;
}

// 只暴露需要给外部使用的成员
module.exports = { PI, add };
```

```js
// app.cjs
const math = require('./math.cjs');

console.log(math.add(1, 2)); // 3
console.log(math.PI);        // 3.1415926
```

CommonJS 的核心特点：

| 特点 | 含义 | 影响 |
|---|---|---|
| 同步加载 | `require()` 调用后等模块执行完才继续 | 适合服务端本地文件，不适合直接阻塞网络加载 |
| 运行时加载 | `require()` 是普通函数调用 | 可以放在条件分支中，但不利于静态分析 |
| 单次执行并缓存 | 同一个解析后的文件通常只执行一次 | 多次 `require()` 拿到同一个导出对象 |
| 文件级作用域 | 顶层变量不自动挂到 `global` | 模块之间必须显式导出和导入 |

> **关键区别**：CommonJS 的依赖关系主要在运行时确定；ESM 的静态 `import` 在执行前就能被构建工具分析。两者都能实现模块隔离，但优化能力和加载模型不同。

### 2. Node.js 如何执行 CommonJS 文件

Node.js 不会直接把 CommonJS 文件中的代码放进全局作用域。它会把文件内容包装成一个函数，再调用这个函数。

概念上的包装形式如下：

```js
(function (exports, require, module, __filename, __dirname) {
  // 你的 CommonJS 文件内容
});
```

因此，CommonJS 文件中可以直接使用：

- `exports`
- `require`
- `module`
- `__filename`
- `__dirname`

```js
// info.cjs
console.log(__filename); // 当前文件绝对路径
console.log(__dirname);  // 当前目录绝对路径

console.log(typeof require); // function
console.log(module === module.exports); // true，初始时二者指向同一个对象
```

ESM 没有这几个 CommonJS 专属变量。ESM 中应使用 `import.meta.url`，需要文件路径时再转换为路径：

```js
// info.mjs
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const filename = fileURLToPath(import.meta.url);
const directory = dirname(filename);

console.log(filename);
console.log(directory);
```

### 3. `module.exports` 与 `exports` 的关系

模块加载开始时，Node.js 会让 `exports` 和 `module.exports` 指向同一个对象：

```js
console.log(exports === module.exports); // true
```

给对象增加属性时，两种写法都有效：

```js
// user.cjs
exports.createUser = function createUser(name) {
  return { name };
};

module.exports.findUser = function findUser(id) {
  return { id, name: 'Ada' };
};
```

但重新赋值时必须使用 `module.exports`：

```js
// logger.cjs
function createLogger(prefix) {
  return {
    log(message) {
      console.log(`[${prefix}] ${message}`);
    },
  };
}

// 正确：整个模块导出一个函数
module.exports = createLogger;
```

下面的写法不会导出你以为的函数：

```js
// 错误示例
exports = createLogger;

// exports 只是一个局部参数，重新赋值不会改变 module.exports
```

可以把它记成一句话：

> **给导出对象加属性可以用 `exports.x`；替换整个导出值必须用 `module.exports = value`。**

### 4. `require()` 的解析和缓存

调用 `require('./config.cjs')` 时，Node.js 大致会经历以下步骤：

```text
调用 require
  ↓
解析模块标识符
  ↓
读取文件并确定扩展名
  ↓
创建 module 对象
  ↓
执行模块代码
  ↓
记录 module.exports
  ↓
写入 require.cache
  ↓
返回导出值
```

可以用下面的代码验证“只执行一次”：

```js
// counter.cjs
console.log('counter.cjs 执行了一次');

let count = 0;
module.exports = {
  next() {
    count += 1;
    return count;
  },
};
```

```js
// app.cjs
const first = require('./counter.cjs');
const second = require('./counter.cjs');

console.log(first === second); // true
console.log(first.next());     // 1
console.log(second.next());    // 2，共享同一个模块状态
```

如果确实需要删除缓存，可以手动操作，但这通常只适合测试和调试：

```js
const path = require.resolve('./counter.cjs');
delete require.cache[path];

// 再次 require 会重新执行文件
const fresh = require('./counter.cjs');
```

> **避坑提示**：生产代码不要把删除缓存当作热更新方案。重新加载可能产生多个单例、重复注册事件监听器和资源未释放等问题。

### 5. CommonJS 与 ESM 的模块判定

Node.js 会根据文件扩展名和最近的 `package.json` 中的 `type` 字段判定模块类型。

| 文件/配置 | 默认解释 |
|---|---|
| `.cjs` | CommonJS |
| `.mjs` | ESM |
| `.js` 且没有 `type` | CommonJS，具体行为取决于项目配置和 Node.js 版本 |
| `.js` 且 `"type": "module"` | ESM |

推荐在项目中明确声明：

```json
{
  "name": "module-demo",
  "type": "module",
  "scripts": {
    "start": "node src/index.js"
  }
}
```

此时 `.js` 文件按 ESM 处理；如果某个文件仍然需要 CommonJS，将它命名为 `.cjs`。

另一种选择是整个项目继续使用 CommonJS：

```json
{
  "name": "legacy-service",
  "type": "commonjs"
}
```

不要依赖 Node.js 自动猜测。项目越大，明确的 `type` 和扩展名越能减少迁移成本。

### 6. ESM 调用 CommonJS

ESM 可以通过静态 `import` 导入 CommonJS：

```js
// legacy.cjs
module.exports = {
  parse(value) {
    return JSON.parse(value);
  },
  version: '1.0.0',
};
```

```js
// app.mjs
import legacy from './legacy.cjs';

console.log(legacy.parse('{"ok":true}'));
console.log(legacy.version);
```

在 ESM 中导入 CommonJS 时，最可靠的入口是默认导出，因为 CommonJS 只有一个运行时导出值：`module.exports`。

某些 Node.js 版本会根据静态分析推测 CommonJS 的具名导出：

```js
import legacy, { version } from './legacy.cjs';
```

这种具名导出推测不是完整的语言契约。动态修改、计算属性和复杂赋值可能无法被识别。因此库代码优先使用默认导入：

```js
import legacy from './legacy.cjs';
const { parse, version } = legacy;
```

如果 ESM 代码需要使用 CommonJS 的 `require`，可以通过 `createRequire` 创建：

```js
// app.mjs
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const config = require('./config.cjs');

console.log(config);
```

`createRequire` 适合读取仍然依赖 `require` 的旧模块、JSON 或本地 CommonJS 配置。新代码不要为了风格统一而滥用它。

### 7. CommonJS 调用 ESM

CommonJS 中不能直接写静态 `import`，因为 `import` 只能出现在 ESM 模块中。最通用的方式是使用动态 `import()`：

```js
// feature.mjs
export function runFeature(input) {
  return input.toUpperCase();
}
```

```js
// app.cjs
async function main() {
  const feature = await import('./feature.mjs');
  console.log(feature.runFeature('hello')); // HELLO
}

main().catch((error) => {
  console.error('加载功能失败：', error);
  process.exitCode = 1;
});
```

较新的 Node.js 版本在满足条件时允许 `require()` 同步加载 ESM，条件包括模块图不含顶层 `await` 等限制。为了兼容不同 Node.js 版本和不同依赖图，公共代码仍建议使用动态 `import()`。

```js
// CommonJS 的兼容封装
async function loadParser() {
  const module = await import('./parser.mjs');
  return module.default ?? module;
}
```

> **设计建议**：CommonJS 调用 ESM 时把边界收敛在一个适配模块中。不要在业务代码各处散落动态导入，否则模块类型迁移会变得难以追踪。

### 8. `package.json` 的 `exports` 与双入口包

库作者可以用 `exports` 明确暴露公共入口：

```json
{
  "name": "format-kit",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./date": {
      "import": "./dist/date.js",
      "require": "./dist/date.cjs",
      "types": "./dist/date.d.ts"
    }
  }
}
```

使用者可以这样调用：

```js
import { formatDate } from 'format-kit';
const { formatDate: formatDateCjs } = require('format-kit');
```

`exports` 还有两个重要作用：

1. 只暴露稳定的公共入口，避免用户直接依赖内部文件。
2. 可以按条件为 ESM 和 CommonJS 提供不同构建产物。

库的构建目录通常如下：

```text
format-kit/
├── src/
│   ├── index.ts
│   └── date.ts
├── dist/
│   ├── index.js
│   ├── index.cjs
│   ├── date.js
│   ├── date.cjs
│   └── index.d.ts
└── package.json
```

### 9. 双包陷阱（Dual Package Hazard）

如果同一个库同时被 `import` 和 `require` 加载，而两套入口各自创建了状态，那么应用中可能出现两个实例：

```js
// state.js
let count = 0;

export function increase() {
  count += 1;
}

export function getCount() {
  return count;
}
```

如果 ESM 入口和 CJS 入口分别打包了这段状态，下面两种调用可能读到不同的 `count`：

```text
ESM 入口 → state-esm.js → 实例 A
CJS 入口 → state-cjs.cjs → 实例 B
```

对单例、事件总线、缓存、数据库连接尤其危险。可选策略：

| 策略 | 适用情况 |
|---|---|
| 只发布 ESM | 新项目、可以接受升级的应用 |
| 只发布 CommonJS | 必须兼容旧 Node.js 的服务 |
| ESM/CJS 共享一个底层实现 | 需要双生态兼容的库 |
| 在文档中声明状态不保证跨入口共享 | 无法避免双入口实例时 |

不要仅因为“同时支持两种语法”就盲目发布双入口。先确认使用者的 Node.js、打包工具和运行环境。

### 10. Bundler 如何处理两种模块

浏览器原生只认识 ESM。CommonJS 依赖要在浏览器中运行，通常需要由 Vite、Webpack、Rspack 等工具预构建为浏览器可执行的 ESM。

```text
源码依赖
  ├── ESM ───────────────┐
  └── CommonJS ──预构建───┤
                         ↓
                   浏览器 ESM Bundle
```

在应用中遇到 CommonJS 依赖时，优先检查：

1. 是否有官方 ESM 入口。
2. 是否能升级到支持 `exports` 的版本。
3. 是否需要配置 `optimizeDeps` 或 `commonjsOptions`。
4. 是否因为动态 `require(variable)` 导致无法静态分析。
5. 是否把仅服务端依赖错误地打进了浏览器端。

### 11. 互操作性排查清单

遇到“默认导入是 undefined”“require 不是函数”或“模块类型冲突”时，按顺序排查：

```text
1. 查看 package.json 的 type
2. 查看文件扩展名 .js/.cjs/.mjs
3. 查看模块实际导出值：module.exports 还是 exports.default
4. 查看 package.json 的 exports 条件
5. 确认当前运行时是 Node、浏览器还是 Bundler
6. 检查是否存在顶层 await
7. 检查是否有重复的依赖实例
```

### 12. 实战：把 CommonJS 库包装成稳定的 ESM API

假设现有依赖只能使用 CommonJS：

```js
// legacy-parser.cjs
module.exports = function legacyParser(text) {
  return text.trim().split(/\s+/);
};
```

不要让业务代码直接依赖它，而是建立一个 ESM 适配层：

```js
// parser-adapter.js
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const legacyParser = require('./legacy-parser.cjs');

export function parseText(text) {
  if (typeof text !== 'string') {
    throw new TypeError('parseText 只接受字符串');
  }

  return legacyParser(text);
}
```

```js
// app.js
import { parseText } from './parser-adapter.js';

console.log(parseText('  hello   module  '));
// [ 'hello', 'module' ]
```

这样做的价值是：

- 业务层只依赖稳定的 ESM API。
- 旧依赖的替换只需要修改适配层。
- 参数校验和错误转换集中处理。
- 未来升级到原生 ESM 依赖时，不必改业务调用点。

## 常见问题

**Q1：`exports.foo` 和 `module.exports.foo` 完全等价吗？**

在没有重新给 `exports` 赋值的前提下等价。`exports` 只是指向 `module.exports` 的初始引用；一旦写 `exports = newValue`，它就和真正的导出对象脱离了。

**Q2：CommonJS 为什么是同步加载？**

Node.js 主要加载本地文件，读取本地文件的延迟和网络相比更可控。同步模型让 `require()` 返回值简单直接，但它不适合浏览器网络加载，所以浏览器生态更偏向 ESM 和动态导入。

**Q3：ESM 导入 CommonJS 时应该用默认导入还是具名导入？**

优先默认导入，再从默认对象中取属性。具名导出依赖 Node.js 的静态推测，对动态导出和复杂赋值不可靠。

**Q4：为什么 `require('./data.json')` 可以工作，而 ESM 导入 JSON 需要额外配置？**

CommonJS 对 JSON 有历史兼容行为；ESM 更强调显式模块类型和安全边界。Node.js ESM 中应按当前版本要求使用 import attributes，或使用 `fs` 读取再解析。

**Q5：项目应该选择 ESM 还是 CommonJS？**

新项目优先 ESM；如果已有大量 CommonJS 依赖、运行环境较旧或迁移成本明显高于收益，可以暂时保留 CommonJS，并把边界写清楚。不要为了追新而在一个项目中无规划地混用。

**Q6：`require()` 找不到模块时如何排查？**

先执行 `require.resolve('包名')` 查看解析结果，再检查 `package.json` 的 `exports`、包管理器安装位置、当前工作目录和模块类型。不要只靠修改相对路径碰运气。

**Q7：动态 `import()` 会不会每次都重新执行模块？**

同一个模块 URL 通常会被运行时缓存。动态导入的主要成本是首次加载和异步边界，不是每次调用都重新执行。

**Q8：双入口包一定会产生两个实例吗？**

不一定。如果 ESM 和 CJS 入口最终共享同一份底层实现，可能保持同一状态；如果它们各自包含状态代码，就存在产生两个实例的风险。单例库必须专门验证。

## 实操作业

### 基础练习：CommonJS 模块拆分

将一个包含日期格式化、数组过滤和日志输出的单文件 CommonJS 脚本拆成三个模块。

要求：

- 每个模块只暴露必要的公共 API。
- 至少使用一次 `module.exports = function`。
- 至少使用一次 `exports.namedFunction = function`。
- 用 `require.cache` 验证模块只执行一次。

### 进阶练习：混合模块项目

创建一个 `"type": "module"` 的 Node.js 项目，同时包含：

- `config.cjs`：导出配置对象。
- `parser.mjs`：导出解析函数。
- `adapter.js`：用 `createRequire` 读取 `config.cjs`，并用动态 `import()` 加载 `parser.mjs`。
- `index.js`：调用适配层完成一次完整处理。

要求记录 ESM 和 CommonJS 的边界，以及异常处理策略。

### 挑战练习：发布双入口工具包

实现一个 `format-kit` 工具包，同时生成 ESM、CJS 和 TypeScript 类型声明。

验收标准：

- `package.json` 使用 `exports` 声明 `import`、`require`、`types` 条件。
- `node --input-type=module` 可以调用 ESM 入口。
- CommonJS 调用可以正常执行。
- 不允许业务代码直接引用 `dist` 内部文件。
- 至少测试一次默认导入、具名导入和入口不存在时的错误提示。


---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L1 里程碑](../../projects/atlas/milestones/L1.md)
- 本课任务：把“CommonJS 与互操作性”落实为 Atlas 中可独立导入的模块或纯函数，补充正常、边界、异常三类自动测试。
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

- CommonJS 通过 `require()` 运行时同步加载模块，`module.exports` 是真正的导出值。
- `exports` 适合给导出对象添加属性，替换整个导出值必须使用 `module.exports`。
- Node.js 通过文件扩展名和 `package.json.type` 区分 ESM 与 CommonJS。
- ESM 调用 CommonJS 通常使用默认导入；CommonJS 调用 ESM 通常使用动态 `import()`。
- `exports` 条件可以让一个包同时服务 ESM 和 CommonJS，但要警惕双包导致的重复实例。
- 互操作性问题的根因通常来自模块类型、导出形态、入口条件和运行环境，而不是某一行 import 写法。

<!-- course-nav:start -->
---

[上一篇：01 ESM 规范与动态导入](./01-ESM规范与动态导入.md) · [课程地图](../../README.md) · [下一篇：03 pnpm 与 Monorepo 入门](./03-pnpm与Monorepo入门.md)
<!-- course-nav:end -->
