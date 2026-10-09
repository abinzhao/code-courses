# 31-生产构建：Rollup、Webpack 存量与产物分析

## 目标

完成本知识单元后，学员应能理解“生产构建”这一步到底对源码做了什么，能读懂 Rollup 配置与产物结构，会分析产物体积，同时对企业中大量存在的 Webpack 5 项目建立基本认知，而不是把构建当成一个只能整体执行的黑盒。

学员应能够：

1. 解释为什么开发阶段可以直接使用原生 ESM，而生产交付仍需要打包、压缩与代码分割。
2. 读懂 Rollup 的 input/output 模型，说清入口、产物格式、文件命名与插件在构建中的角色。
3. 解释 tree-shaking 的前提（ESM 静态结构、副作用标记），能判断“写了没用为什么没被删掉”。
4. 说明 chunk 与代码分割的机制，包括动态 import、共享依赖抽取与手动分组。
5. 区分 source map 的形态与发布策略，理解它对调试与安全的双重意义。
6. 使用产物分析工具定位体积构成，建立产物体积预算意识；能读懂 Webpack 5 的 entry/output/loader/plugin 基本结构，并知道模块联邦的用途位置。

模块联邦在本单元只建立概念，跨应用共享的完整实践在 U36 展开；CI 中如何运行构建与产物检查在 U56 落地。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Node.js 当前 LTS | 构建工具运行时 | 理解构建是一次性 Node 批处理过程 |
| pnpm 当前稳定版 | 依赖与脚本 | 能安装构建插件、执行构建脚本 |
| Rollup 4.x | 生产打包器 | 能读懂并编写基础配置 |
| Vite 当前稳定主版本 | 课程项目中的构建入口 | 知道 `vite build` 底层调用 Rollup |
| rollup-plugin-visualizer | 产物构成可视化 | 能生成并读懂分析报告 |
| Webpack 5 | 存量项目构建器 | 能读懂核心概念，不要求从零搭建 |
| gzip/brotli（平台或插件） | 传输压缩 | 理解构建体积与传输体积的区别 |

开始前准备：

```bash
node -v
pnpm create vite@latest build-lab -- --template react-ts
cd build-lab
pnpm install
pnpm build
```

预期观察：终端打印每个产物文件及体积（同时给出原始大小与 gzip 后大小），产物输出到 `dist/assets/`，文件名带内容 hash。打开 `dist` 目录观察其结构，是本单元所有讨论的实物基础。

约定：

- 构建是可重复的批处理：相同输入与配置应产出等价结果；
- 对构建的任何优化都应先用产物数据证明问题存在，再动手。

## 详细的理论知识讲解和示例伪代码

### 1. 为什么生产环境仍需打包

#### 1.1 定义：生产构建

生产构建是把开发者编写的模块化源码，经过转换、合并、裁剪、压缩和指纹命名，转换成适合在浏览器中高效加载、可长期缓存、能覆盖目标浏览器的静态产物的过程。

它与开发服务器的目标完全不同：

```text
开发：追求“改完立刻看到”，按需编译，不优化
生产：追求“用户加载快、缓存准、兼容稳”，全量优化
```

#### 1.2 直接把原生 ESM 源码交付给用户的问题

问题一：请求瀑布。业务模块图有大量节点，浏览器虽可并行，但模块 A 依赖 B、B 依赖 C，链条必须串行发现：

```text
请求 main.js → 发现依赖 app.js → 发现依赖 list.js → 发现依赖 format.js
```

深度越深，网络往返造成的等待越明显，在弱网下尤其严重。

问题二：无优化。未压缩的变量名、注释、空白、未使用代码全部下发，浪费带宽与解析时间。

问题三：npm 依赖格式不一。很多包是 CommonJS，浏览器无法直接消费；即使是 ESM 包，内部模块数也可能极多。

问题四：缓存粒度过粗或过细。直接按源文件下发时，无法基于内容变化精确控制缓存失效。

#### 1.3 打包如何回应这些问题

| 问题 | 构建手段 |
|---|---|
| 请求瀑布 | 合并模块、按策略分割为少量 chunk |
| 未使用代码 | tree-shaking 裁剪 |
| 体积过大 | 压缩混淆、gzip/brotli 传输压缩 |
| 依赖格式 | 插件把 CJS 等转换为 ESM |
| 缓存失效 | 内容 hash 指纹 |
| 浏览器兼容 | 语法降级（按目标浏览器策略） |

#### 1.4 工程化关系

理解“开发与生产目标不同”，就能解释为什么必须在合并前跑 `pnpm build`：开发服务器宽松、按需、面向本机；生产构建严格、全量、面向真实用户。某些问题（循环依赖导致的产物异常、意外打包了整份库）只会在构建时暴露。

常见误区：

> 现在浏览器都支持原生 ESM 了，打包没有必要。

支持 ESM 解决的是“能不能加载模块”，没有解决请求数量、代码裁剪、压缩、格式互操作与缓存策略。现代构建并非退回单文件，而是把成百上千个模块组织成数量合理、可并行、可长期缓存的少量产物。

### 2. Rollup 基础：input 与 output

#### 2.1 定义

Rollup 是基于 ESM 的模块打包器。它使用 ES 模块标准做静态分析，把模块图转换为一组产物文件。其配置围绕两个核心概念：

- `input`：模块图入口（一个或多个）；
- `output`：产物描述（写到哪里、什么格式、如何命名）。

#### 2.2 最小配置

```js
// rollup.config.js
export default {
  input: 'src/index.js',
  output: {
    dir: 'dist',
    format: 'es',
    sourcemap: true,
  },
};
```

执行：

```bash
rollup -c
```

含义：从 `src/index.js` 建立模块图，输出 ESM 格式产物到 `dist`，并生成 source map。

#### 2.3 多产物与多入口

库通常需要同时提供 ESM 与 CommonJS 两种产物：

```js
// rollup.config.js
export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
  ],
};
```

应用多入口（或多页）则使用数组/对象形式的 input，Rollup 会自动把被多个入口共享的模块抽成公共 chunk。

#### 2.4 插件：让 Rollup 能处理真实世界

Rollup 核心只理解 JS/ESM，真实项目需要插件补齐能力：

```js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default {
  input: 'src/index.ts',
  output: {
    dir: 'dist',
    format: 'es',
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }),
  ],
};
```

- `node-resolve`：让裸模块说明符（`import x from 'pkg'`）能在 node_modules 中定位；
- `commonjs`：把 CommonJS 依赖转换为 ESM 再参与打包；
- `typescript`：编译 TS。

插件顺序有意义：通常先解析、再转换 CJS、再做语言编译，顺序颠倒可能导致依赖无法识别。

#### 2.5 文件命名模板

```js
output: {
  entryFileNames: 'js/[name].[hash].js',
  chunkFileNames: 'js/[name].[hash].js',
  assetFileNames: 'assets/[name].[hash][extname]',
}
```

- `[name]`：入口或 chunk 名称；
- `[hash]`：基于内容的指纹；
- `[extname]`：资源扩展名。

在 Vite 项目中这些默认已经配好；理解占位符是读懂和微调产物结构的前提。

#### 2.6 工程化关系

Vite 应用项目一般不直接写 Rollup 配置，而是通过 `vite.config.ts` 的 `build` 选项间接控制；但输出格式、代码分割、source map 等概念完全一致。开发库（组件库、工具库）时则常直接使用 Rollup 或 Vite 的库模式。

常见误区：

> output 写一个 file 就够了，dir 没必要。

存在代码分割（多个 chunk）时必须使用 `dir`，因为产物是一组文件；`file` 只适用于单文件输出。多入口或动态 import 下使用 `file` 会直接报错。

### 3. Tree-shaking：裁剪未使用代码

#### 3.1 定义

Tree-shaking 指在打包阶段通过静态分析模块图，移除“被导出但从未被使用”或“执行结果不影响外部”的代码。名字的意象是：模块图如一棵树，摇掉枯死的叶子。

#### 3.2 前提：静态 ESM

Tree-shaking 依赖在执行前就能确定导入导出关系：

```js
// 可以静态分析：只引入了 formatDate
import { formatDate } from './format.js';
console.log(formatDate(new Date()));
```

CommonJS 的动态结构难以静态判断：

```js
// 无法在执行前确定到底用了什么
const helper = require(someVariable);
helper[methodName]();
```

因此：只提供 CommonJS 的包通常无法被有效 tree-shake；以 ESM 发布是可摇减的前提。

#### 3.3 副作用决定“能不能删”

即使一个导出没被使用，如果模块在加载时有副作用，删除它可能改变行为：

```js
// polyfill.js —— 修改全局原型，属于副作用
window.Array.prototype.first = function first() {
  return this[0];
};
```

包可以通过 `package.json` 声明副作用边界：

```json
{
  "name": "some-lib",
  "sideEffects": false
}
```

或精确列出有副作用的文件：

```json
{
  "sideEffects": ["*.css", "./src/polyfills.js"]
}
```

`false` 表示所有文件都是“纯”的，未使用即可安全删除；CSS 文件通常需要列入，否则可能在摇减中被误删。

#### 3.4 PURE 注释与压缩阶段

对“函数调用表达式”是否保留，可以用注释向压缩器声明该调用无副作用：

```js
// 未使用其返回值时，压缩器可安全删除这个调用
const tracker = /* @__PURE__ */ createTracker();

// 若 createTracker 内部会注册全局事件，就不应标记为 PURE
const real = registerGlobalHandler();
```

需要注意：tree-shaking 分两个层面理解——打包器的模块/导出级裁剪，与压缩器的语句级死代码消除，二者配合但不完全等同。

#### 3.5 工程化关系

“为什么这个库这么大”常常是 tree-shaking 失效：整包引入、导入了有副作用的入口、包只发布 CJS、或误用了对象命名空间下的深层依赖。诊断路径是：确认导入方式 → 检查包格式与 sideEffects → 在产物分析图中确认实际打包内容。

常见误区：

> 我写了 `import { debounce } from 'big-lib'`，就一定只打包 debounce。

能否只取 debounce 取决于 big-lib 的发布形态：ESM 且正确标注副作用才可以；CJS 版本会被整体转换纳入。命名导入的写法是必要条件，不是充分条件。

### 4. 代码分割与 chunk

#### 4.1 定义

代码分割是把产物拆分为多个 chunk，使浏览器可以按需加载、并行加载并独立缓存。一个 chunk 是一组模块的打包单元。

#### 4.2 自动分割：共享依赖抽取

当多个入口或路由使用同一依赖时，构建器把它抽成独立 chunk，避免在每个入口重复打包：

```text
未分割：
  page-a.js 含 react（重复）
  page-b.js 含 react（重复）

分割后：
  react-[hash].js
  page-a-[hash].js
  page-b-[hash].js
```

#### 4.3 动态 import：按交互/路由按需加载

```ts
// 点击时才加载报表模块及其依赖
async function openReport() {
  const mod = await import('./features/report/index.js');
  mod.mountReport(document.getElementById('panel'));
}

document.querySelector('#open-report')?.addEventListener('click', openReport);
```

构建时，动态 import 的模块天然成为独立 chunk；首屏不下载，用到时才请求。React Router 等框架的路由懒加载正是这个机制的应用。

#### 4.4 手动分组 manualChunks

对依赖结构有明确认知时，可以指定分组：

```js
// 概念示例（Rollup 函数式 manualChunks）
function manualChunks(id) {
  if (id.includes('node_modules')) {
    if (id.includes('react')) return 'react-vendor';
    if (id.includes('chart')) return 'chart-vendor';
    return 'vendor';
  }
}
```

权衡：

- 收益：把稳定的大依赖单独成块，业务改动不影响其缓存；
- 风险：把彼此强耦合的模块硬拆开，会造成 chunk 间循环引用或一次交互要加载过多碎块。

手动分组应基于真实产物数据，而不是凭文件名机械切分。

#### 4.5 chunk 数量的取舍

```text
chunk 太少：单个文件巨大，首屏加载慢，一点改动缓存全失效
chunk 太多：请求数爆炸，调度与解压开销上升，缓存收益被摊薄
```

合理目标：稳定第三方依赖与易变业务代码分离；首屏必需与延迟功能分离；块数量在浏览器调度能力之内。没有放之四海皆准的固定数字。

#### 4.6 工程化关系

代码分割直接影响首屏性能指标（在 U16 接触），是构建优化中收益最明显的手段之一。它也要求部署服务器正确设置缓存与 MIME 类型，否则多 chunk 会出现加载失败。

常见误区：

> 把 node_modules 全部切成一个 vendor 大块最稳妥。

一个巨大的 vendor 里任何依赖升级都会让整块缓存失效，且首屏可能被迫加载根本用不到的库。按稳定性和使用范围分组（框架、图表、编辑器等），通常比单一巨型 chunk 更合理。

### 5. 产物格式与文件指纹

#### 5.1 定义：产物格式

产物格式决定打包结果以何种模块规范存在：

| 格式 | 典型用途 | 特点 |
|---|---|---|
| `es` | 现代应用、ESM 库 | 保留 import/export，支持代码分割 |
| `cjs` | Node 环境、旧工具链 | require/module.exports |
| `iife` | 直接 `<script>` 引入 | 自执行函数，需提供全局名 |
| `umd` | 同时兼容浏览器全局与 CJS | 体积更大，历史方案 |
| `system` | 需要 SystemJS 的环境 | 支持其模块加载模型 |

应用构建通常只用 `es`；库为兼容消费方才输出多种格式。

#### 5.2 全局名与导出形态

```js
output: {
  format: 'iife',
  name: 'TicketKit',
  file: 'dist/ticket-kit.js',
}
```

页面中可通过 `window.TicketKit` 访问。CJS 产物若存在混合导出，需要显式 `exports: 'named'` 或 `'default'`，避免打包器警告。

#### 5.3 文件指纹与缓存

```text
list-page.[a1b2c3].js
  内容变化 → hash 变化 → 文件名变化 → 浏览器重新下载
  内容不变 → hash 不变 → 命中长期缓存
```

HTML 本身不加 hash（它是入口），其中引用的是带最新 hash 的产物。发布时只更新变化文件，配合不可变缓存头（如 `Cache-Control: immutable`）实现精准失效。

#### 5.4 工程化关系

“格式选择”体现的是消费方分析，而不是技术偏好：现代应用不必为 2015 年的环境输出 UMD；而内部组件库可能需要兼顾多个消费项目。发布前还应确认产物中不包含测试文件、调试代码与意外的环境变量值。

常见误区：

> 产物格式越多说明库越专业。

每多一种格式就多一份构建与维护成本，且不同格式可能出现行为差异。按真实消费方需要输出；没有人消费的格式应当删除。

### 6. Source map

#### 6.1 定义

Source map 是建立在“转换后产物”与“原始源码”之间位置映射的文件，使浏览器或错误平台能把压缩后第 3 行第 12000 列的错误，还原成 `list.tsx` 第 42 行。

#### 6.2 常见形态

```js
output: {
  sourcemap: true,    // 生成独立 .map，并在产物末尾加注释引用
}
```

```js
output: {
  sourcemap: 'inline', // map 以 data URL 内联进产物，体积大
}
```

```js
output: {
  sourcemap: 'hidden', // 生成 map 但不写引用注释
}
```

#### 6.3 为什么压缩后必须靠它定位

```text
没有 map：
  Error: Cannot read properties of undefined
    at index.abc123.js:1:18742   ← 人无法对应到源码

有 map：
  Error
    at renderList (list.tsx:42:15)
```

错误监控平台（U58）通常要求上传 source map 才能还原线上堆栈。

#### 6.4 发布策略与安全

Source map 包含源码结构，公开下发会让任何人轻易阅读业务逻辑。常见策略：

- 生产构建生成 map，但不随公开产物部署，只上传到错误监控平台后归档；
- 或通过受控路径提供，仅供调试；
- 对不敏感的开源/纯展示项目，直接公开亦可接受。

选择应基于“是否愿意让产物源码被还原”，而不是默认随包发布。

#### 6.5 工程化关系

source map 横跨开发体验与生产可观测性：开发时 Vite 自动提供，生产时要决定“生成但不公开、上传给监控”。若只生成不部署也不上传，就浪费了构建成本；若随意公开，则等于公开源码。

常见误区：

> 不生成 source map，线上错误就无从查起，所以必须公开 .map。

还原线上堆栈只需要让“错误平台”拿到 map，不需要让所有用户拿到。生成、上传、下线公开文件可以同时成立，安全性与可调试性并不矛盾。

### 7. 构建产物分析

#### 7.1 定义

产物分析是对构建结果做结构化度量：每个 chunk 由哪些模块构成、体积多少、是否有重复依赖、gzip/brotli 后多大，从而让“优化”有对象、可验证。

#### 7.2 生成可视化报告

```js
// 概念示例：在 Rollup/Vite 中接入
import { visualizer } from 'rollup-plugin-visualizer';

plugins: [
  visualizer({
    filename: 'stats/report.html',
    gzipSize: true,
    brotliSize: true,
    open: false,
  }),
]
```

构建后打开 `stats/report.html`，可看到矩形树图：面积代表体积，能快速定位“哪个库占据了首屏”。

#### 7.3 应关注的指标

| 指标 | 回答的问题 |
|---|---|
| 首屏相关 chunk 原始/gzip/brotli 体积 | 用户实际要下载多少 |
| 最大的三个 chunk | 优化优先级在哪里 |
| 同一依赖是否被重复打包 | 是否存在版本/分包问题 |
| chunk 总数与首屏请求数 | 分割是否过度 |
| 构建时间 | CI 资源成本 |

概念伪代码：

```text
分析流程:
  1. 构建并生成报告
  2. 记录首屏总传输体积（gzip/brotli）
  3. 找最大 chunk，下钻到具体模块
  4. 确认是否预期内（如确实需要图表库）
  5. 制定一项优化，重新构建对比前后数据
```

#### 7.4 体积预算

把“合理体积”固化为阈值，超限即在 CI 失败：

```json
{
  "budgets": {
    "initialGzipKb": 250,
    "anyChunkGzipKb": 150
  }
}
```

预算的价值不是卡人，而是让体积退化第一时间被发现：一次 `import wholeChartLib` 让首屏增加 200KB 的改动，应在合并前暴露。

#### 7.5 常见优化手段（按数据选择）

- 换用可 tree-shake 的导入方式或更轻的库；
- 把重型功能改为动态 import 延迟加载；
- 修正重复依赖（多版本并存）；
- 合理 manualChunks 改善缓存；
- 确认压缩与产物格式正确生效。

#### 7.6 工程化关系

产物分析是质量体系中“构建层”的度量环节，与 U29 的成熟度 L3 对应。它使性能讨论从“感觉变慢”变成“数据退化”，并能驱动规则与预算进入 CI。

常见误区：

> 报告里某个库占 800KB 就一定要换掉。

先看它是否在首屏、是否按需加载、gzip 后多大、业务是否确实依赖其能力。分析报告用于定位与权衡，不是用于制造替换库的冲动决策。

### 8. Webpack 5 存量认知与模块联邦

#### 8.1 定位：为什么仍要学 Webpack

尽管新项目主线是 Vite，企业中大量运行多年的项目、组件体系与定制构建基于 Webpack。本节目标是：能读懂其配置、能定位常见问题，而不是从零手写复杂配置。

#### 8.2 四大核心概念

```js
// webpack.config.js（概念示例）
import path from 'node:path';
import HtmlWebpackPlugin from 'html-webpack-plugin';

export default {
  mode: 'production',
  entry: './src/index.js',
  output: {
    path: path.resolve('dist'),
    filename: '[name].[contenthash].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [new HtmlWebpackPlugin({ template: './index.html' })],
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: { '@': path.resolve('src') },
  },
  devtool: 'source-map',
};
```

- `entry`：模块图入口，等价于 Rollup 的 input；
- `output`：产物位置与命名，等价于 output；
- `loader`：在 `module.rules` 中声明“某类文件用什么转换器”，让 Webpack 能处理 JS 之外的资源；
- `plugin`：在构建生命周期更广的节点介入（生成 HTML、资源管理、分包等）。

#### 8.3 与 Rollup/Vite 的对应关系

| 概念 | Webpack | Rollup/Vite |
|---|---|---|
| 入口 | entry | input |
| 输出 | output | output |
| 文件转换 | loader | transform 钩子/插件 |
| 生命周期扩展 | plugin | plugin |
| 路径解析 | resolve | resolve.alias |
| 产物调试 | devtool | build.sourcemap |
| 分包 | splitChunks | manualChunks/自动分割 |

掌握主线工具后，读存量配置主要是在做“概念翻译”，而非重新学一套体系。

#### 8.4 为什么新项目较少以 Webpack 起步

- 配置与概念负担重，上手门槛高；
- 传统打包式冷启动在大项目下反馈慢；
- 浏览器与工具链转向原生 ESM，Vite 类方案开发体验显著更轻；
- 生态新方案默认围绕 ESM 与双引擎设计。

但 Webpack 在极复杂的存量定制、特定分包需求上仍被大量使用；“少用”不等于“淘汰”，切换工具应基于成本收益，而非追新。

#### 8.5 模块联邦（概念点到）

Module Federation 是 Webpack 5 提供的能力：让多个独立构建、独立部署的应用在运行时互相暴露与消费模块，并可共享依赖，避免每个应用各自打包一份 React。

```text
host 应用（壳）
  ├─ 自己的页面模块
  └─ 运行时加载 remote 应用暴露的模块
remote 应用
  └─ expose: { './Header': '...', './Reports': '...' }
```

它解决的是微前端/多应用共享的问题。本单元只需知道：这是构建期决定、运行时生效的跨应用模块机制；版本协商、共享策略与落地架构在 U36 深入。

#### 8.6 工程化关系

面对存量项目，工程师的首要能力是“读懂并安全地小步修改”，而不是立刻主张整体重构。任何工具迁移都要评估构建配置、CI、部署与团队习惯的总成本。

常见误区：

> Webpack 配置看不懂，直接推倒换成 Vite 最省事。

存量构建往往承载了特殊 loader、分包、联邦与部署假设。迁移是独立的工程项目，需要逐项盘点依赖与产物差异、并行验证，而不是删配置重来。

## 课后题

1. 从用户加载与缓存的角度，说明为什么生产环境不能直接交付原生 ESM 源码，至少回答四个具体问题。
2. Rollup 的 input/output 分别描述什么？为什么存在代码分割时必须使用 `dir` 而不是 `file`？
3. tree-shaking 成立需要哪些前提？`sideEffects: false` 向构建器做出了什么承诺？CSS 文件为什么常被列入 sideEffects？
4. 场景分析：项目中 `import { cloneDeep } from 'big-utils'`，产物分析却显示整个 big-utils 都被打包。请给出至少三种可能原因和对应验证方式。
5. 什么是 chunk？动态 import 为什么能天然产生新 chunk？它对首屏加载有什么影响？
6. 场景分析：团队把所有 node_modules 切成一个 2.4MB（gzip 780KB）的 vendor，首屏被迫全部加载，任何依赖升级缓存全失效。请分析问题并给出更合理的分包思路。
7. 产物格式 `es`、`cjs`、`iife`、`umd` 各适合什么场景？一个只在现代浏览器应用内部使用的构建需要输出全部格式吗？
8. 场景分析：线上报错堆栈只显示压缩后的 `index.abc123.js:1:18742`，团队无法定位到源码，同时又有人担心公开 .map 会暴露业务逻辑。请解释 source map 的作用，并说明“生成但不公开 .map、只上传错误平台”为什么是可行且更安全的策略。
9. 场景分析：一次普通改动后首屏体积增加 220KB（gzip），团队希望以后这类退化能自动被拦住。请设计从分析到门禁的完整方案。
10. 请用“概念翻译”的方式，把 Webpack 的 entry/output/loader/plugin 对应到 Rollup/Vite；并说明为什么新项目少用 Webpack、存量项目却不能轻易推倒。

## 实践练习题

### 练习 1：从零观察一次完整生产构建

#### 任务

对课程项目执行生产构建，逐项记录产物结构、命名规律与压缩数据，建立“构建到底产出了什么”的实物认知。

#### 步骤约束

1. 执行 `pnpm build`，完整保留终端产物列表与体积输出。
2. 打开 `dist`，记录入口 HTML、JS、CSS 等文件的目录结构与命名规律。
3. 在 HTML 中找到对带 hash 产物的引用，解释为什么 HTML 不带 hash。
4. 修改一行业务代码后重新构建，对比哪些文件名 hash 变化、哪些不变。
5. 运行 `pnpm preview`，确认产物可独立运行。
6. 用 `gzip`/平台信息或构建输出，记录首屏相关文件的 gzip 体积。

#### 提交物

- `evidence/build-output.md`：产物结构与命名说明；
- 修改前后两次构建的文件 hash 对比表；
- 首屏 gzip 体积记录；
- preview 运行验证记录。

#### 验收标准

- 产物结构描述与实际 dist 一致；
- 能解释 hash 变化与缓存的关系；
- 区分原始体积与 gzip 体积；
- 观察数据来自真实构建；
- 能指出入口 HTML 与产物的引用关系。

### 练习 2：tree-shaking 与代码分割实验

#### 任务

通过一组受控实验，验证副作用、命名导入与动态 import 对产物的实际影响，形成可复现的实验记录。

#### 步骤约束

1. 准备一个工具模块，同时包含“被使用”和“未被使用”的导出函数，观察未使用函数是否进入产物。
2. 增加一个带副作用的模块并在入口引入，对比有无 `sideEffects` 声明时产物差异。
3. 把一个功能改为动态 import，构建后确认产生了独立 chunk，且首屏产物中不含该模块。
4. 尝试配置一次 manualChunks，把指定依赖单独分组，记录前后 chunk 构成变化。
5. 每轮实验都重新构建并保存产物清单，保证结论可追溯。
6. 实验中不得禁用压缩，否则 tree-shaking 结论不成立。

#### 提交物

- 实验源码；
- `evidence/shaking.md`：每轮实验的配置、产物与结论；
- 动态 import 前后 chunk 清单对比；
- 200 字总结：哪些写法能真正减小产物。

#### 验收标准

- 能通过产物差异证明 tree-shaking 生效或失效；
- 正确理解副作用与删除决策；
- 动态 import chunk 不进首屏；
- manualChunks 调整有实际对比；
- 结论均基于构建产物而非推测。

### 练习 3：产物分析、体积预算与 Webpack 配置阅读

#### 任务

接入产物分析并建立体积基线，同时阅读一份 Webpack 5 配置完成概念翻译，输出分析与阅读报告。

#### 步骤约束

1. 接入 rollup-plugin-visualizer（Vite 项目同样适用），生成 HTML 报告。
2. 记录首屏总传输体积、最大三个 chunk、是否存在重复依赖。
3. 针对最大的非首屏必需模块，提出并实施一项优化（动态 import 或按需导入），用前后数据证明收益。
4. 编写一份体积预算说明，定义首屏与单 chunk 阈值及超限处理方式。
5. 阅读一份真实或教材中的 Webpack 5 配置，逐项把 entry/output/loader/plugin/resolve 翻译为 Rollup/Vite 概念。
6. 在报告中指出该 Webpack 项目若要迁移到 Vite，需要盘点的至少五个风险点。

#### 提交物

- `stats/report.html` 与分析报告；
- 优化前后体积对比证据；
- `docs/budget.md` 体积预算；
- `docs/webpack-reading.md` 概念翻译与迁移风险清单。

#### 验收标准

- 能从分析报告定位具体大体积模块；
- 优化收益有前后数据支撑；
- 预算阈值合理、可在 CI 执行；
- Webpack 概念翻译准确；
- 迁移风险盘点具体、符合存量实际。

## 阶段验收作业

### 作业名称

生产构建优化报告与可度量的构建基线

### 作业场景

团队准备把一个中后台项目推向正式发布。当前构建“能出产物”，但没人说得清初屏到底加载了什么、体积是否合理、缓存是否有效。你需要把构建从“黑盒”变成“可度量、可优化、可设门槛”的工程环节：给出产物结构说明、一次有数据支撑的优化、体积预算与安全策略，并证明你能读懂同领域的 Webpack 存量配置。

### 提交物

```text
build-optimization/
├── project/                   # 构建项目（Vite/Rollup）
│   ├── vite.config.ts
│   ├── package.json
│   └── src/
├── stats/
│   ├── report-before.html
│   └── report-after.html
├── docs/
│   ├── build-anatomy.md       # 产物结构与 chunk 说明
│   ├── optimization.md        # 优化方案与前后对比
│   ├── budget.md              # 体积预算与超限处理
│   ├── sourcemap-policy.md    # source map 策略
│   └── webpack-reading.md     # 存量配置阅读
├── evidence/
│   └── build-logs.md
└── README.md
```

要求：

- 优化必须基于分析报告提出，且有前后构建数据；
- 体积预算可被脚本或 CI 实际校验，而非只写数字；
- source map 策略要明确“生成位置、是否公开、如何上传”；
- 所有产物检查不得包含测试代码、真实密钥与意外环境变量。

### 演示步骤

学员需要在 15 分钟内完成：

1. 讲解该项目的构建链路：入口、模块图到产物。
2. 展示产物目录，解释 chunk 拆分与 hash 缓存策略。
3. 打开分析报告，指出最大模块及是否属于首屏。
4. 演示一项优化的前后体积对比数据。
5. 说明体积预算如何在超限时阻断合并。
6. 讲解 source map 的发布策略及安全理由。
7. 现场阅读一段 Webpack 配置并翻译为主线工具概念。

导师可临时增加一个大依赖或调整分割策略，验证分析与应变能力。

### 评分标准（100 分）

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 构建机制理解 | 20 | 打包必要性、input/output、chunk 概念准确 |
| Tree-shaking 与分包 | 20 | 前提、副作用、分割策略讲得清楚 |
| 产物分析与优化 | 25 | 能定位问题，优化有真实数据收益 |
| Source map 与安全 | 10 | 策略合理，产物不含敏感信息 |
| Webpack 存量认知 | 15 | 概念翻译准确，迁移风险盘点到位 |
| 文档与可复现 | 10 | 报告完整、可复现、预算可执行 |

细分评分规则：

#### 构建机制理解：20 分

- 生产打包必要性论证充分：7 分；
- Rollup input/output 与插件角色正确：7 分；
- chunk 与产物格式概念正确：6 分。

#### Tree-shaking 与分包：20 分

- 静态 ESM 与副作用前提正确：8 分；
- 动态 import 与共享抽取理解正确：7 分；
- 分包取舍（数量与缓存）合理：5 分。

#### 产物分析与优化：25 分

- 能从报告定位大体积模块：8 分；
- 优化方案对症、前后数据齐全：10 分；
- 体积预算合理且可执行：7 分。

#### Source map 与安全：10 分

- source map 形态与发布策略正确：5 分；
- 产物无密钥/测试代码/意外变量：5 分。

#### Webpack 存量认知：15 分

- entry/output/loader/plugin 翻译准确：8 分；
- 能说明新项目少用原因与迁移风险：7 分。

#### 文档与可复现：10 分

- 报告与证据齐全、实验可复现：5 分；
- README 能指导他人重现分析与优化：5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过，修正后重新验收：

1. 无法说明生产构建与开发服务器的目标差异。
2. 对 tree-shaking 的解释缺少静态 ESM 与副作用前提，结论与产物不符。
3. “优化”没有前后数据，或靠关闭压缩制造体积下降。
4. 体积预算只写在文档中、无法被实际执行或校验。
5. 产物或提交物中包含真实密钥、后端 Secret 或测试专用代码。
6. Webpack 核心概念翻译错误，或主张不经盘点直接删除存量配置。
7. 只提交报告没有可构建项目，或构建本身无法通过。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 解释生产打包的必要性 | `build-anatomy.md`、演示步骤 1 |
| 掌握 Rollup input/output | 构建配置、演示步骤 1 |
| 理解 tree-shaking | 实验记录、演示讲解 |
| 掌握代码分割与 chunk | 产物目录、演示步骤 2 |
| 制定 source map 与缓存策略 | `sourcemap-policy.md`、演示步骤 6 |
| 会分析产物并建立预算 | 分析报告、`budget.md`、演示步骤 3-5 |
| 读懂 Webpack 5 与模块联邦定位 | `webpack-reading.md`、演示步骤 7 |

### 提交前自检

- [ ] 七个学习目标均有对应证据。
- [ ] 干净环境执行 `pnpm install && pnpm build` 一次通过。
- [ ] 每项优化都有 before/after 报告与体积数据。
- [ ] 体积预算可被脚本或 CI 实际触发并阻断。
- [ ] source map 策略写明生成、上传与公开范围。
- [ ] 产物经检查不含密钥、测试代码与调试残留。
- [ ] Webpack 阅读报告中的概念翻译准确无误。
- [ ] README 可指导他人复现构建、分析与优化全过程。
