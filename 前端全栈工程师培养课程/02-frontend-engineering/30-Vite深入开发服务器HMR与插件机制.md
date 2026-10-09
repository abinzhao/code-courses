# 30-Vite 深入：开发服务器、HMR 与插件机制

## 目标

完成本知识单元后，学员应能讲清 Vite “为什么快”，并且能动手配置开发服务器、路径别名、静态资源与自定义插件，而不是只会执行 `pnpm dev` 然后把一切当作魔法。

学员应能够：

1. 画出 Vite 的双引擎架构：开发时基于浏览器原生 ESM 加 esbuild 依赖预构建，生产构建基于 Rollup，并解释为什么要分两套机制。
2. 说明依赖预构建解决的两个问题（CommonJS/UMD 互操作、海量模块请求合并），以及缓存命中与失效的条件。
3. 解释开发服务器处理一次模块请求的完整流程，理解“源码按需编译”与传统打包式启动的差异。
4. 用自己的语言讲清 HMR 的执行链路：文件变化、WebSocket 通知、失效边界判定、模块替换与状态保留，并能使用 `import.meta.hot` API。
5. 配置静态资源策略、路径别名，理解 `public` 目录与被 import 资源的区别。
6. 在概念层面理解插件机制与钩子时序，能写出一个功能最小的自定义插件，并知道如何用调试手段定位开发服务器问题。

环境变量在本单元只点到为止（`import.meta.env`、`VITE_` 前缀与 `.env` 文件），分层治理与安全边界在 U33 深入；生产构建机制在 U31 展开。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Node.js 当前 LTS | Vite 与插件的运行时 | 理解开发服务器是一个 Node 进程 |
| pnpm 当前稳定版 | 依赖管理与脚本执行 | 能安装、执行脚本 |
| Vite 当前稳定主版本 | 开发服务器、HMR、构建编排 | 本单元核心，需动手配置 |
| esbuild（Vite 内置） | 依赖预构建 | 理解其角色，不要求单独配置 |
| Rollup（Vite 内置） | 生产构建与插件接口基础 | 理解 Vite 插件兼容 Rollup 钩子，U31 深入 |
| 浏览器 DevTools | 观察模块请求与 HMR 行为 | 能读 Network 与 Console 证据 |
| TypeScript | 配置文件与示例语言 | 能读懂 `vite.config.ts` |

开始前准备：

```bash
node -v
pnpm create vite@latest vite-deep -- --template react-ts
cd vite-deep
pnpm install
pnpm dev
```

预期观察：终端输出本地地址（默认 `http://localhost:5173/`），启动通常在数百毫秒级。打开 DevTools 的 Network 面板，刷新页面，可以看到大量独立的模块请求，而不是单个打包文件——这是原生 ESM 开发模式最直接的证据。

约定：

- 所有配置写在 `vite.config.ts` 中；配置应保持克制，能用默认解决的不手写。
- 修改配置后需要重启开发服务器才能生效（多数配置项不支持热更新）。

## 详细的理论知识讲解和示例伪代码

### 1. Vite 的双引擎架构

#### 1.1 定义

Vite 由两条面向不同目标的通路组成：

```text
开发通路（vite / dev server）
  浏览器原生 ESM + esbuild 预构建依赖
  目标：冷启动快、改一行反馈快

生产通路（vite build）
  Rollup 打包 + 产物优化
  目标：体积小、缓存友好、加载快
```

“开发快”和“产物优”是两个不同的问题，Vite 没有试图用一套机制同时解决，这是理解它所有设计选择的总纲。

#### 1.2 传统打包式开发为什么慢

传统方式在启动开发服务器前，要先从入口构建完整模块图、把成百上千个模块打包成一个 bundle，然后才能开始服务：

```text
启动命令
  ↓
打包全部源码（即使你只打算改其中一个文件）
  ↓
启动服务器
  ↓
开始开发
```

项目越大，冷启动越慢；改一行代码，增量重新打包也要经过整条链路，反馈随项目体积劣化。

#### 1.3 Vite 的做法：把编译推迟到请求时

开发模式下 Vite 不预先打包业务源码。浏览器通过原生 ESM 逐个请求模块，Vite 在服务器端按需转换被请求的文件：

```text
浏览器请求 /src/main.tsx
  ↓
Vite 实时编译 main.tsx（TS→JS、JSX→JS）并返回
  ↓
浏览器解析返回内容，继续请求其中 import 的模块
  ↓
Vite 再按需编译这些模块
```

概念对比：

```text
打包式：先编译全部，再打开页面      —— 启动成本随项目总量增长
ESM 式：打开页面时只编译用到的模块  —— 启动成本与项目总量基本无关
```

注意：按需编译并不意味着“零编译”。TS、JSX、CSS 仍需在服务器端转换，只是编译范围被限定在真正被请求的模块上。

#### 1.4 工程化关系

双引擎带来一个重要后果：开发与生产的运行路径不同，个别问题只会在某一侧出现。例如某些依赖在 ESM 开发下正常，却可能在 Rollup 生产构建时因循环依赖或命名导入问题报错。因此：

- 不能因为 `pnpm dev` 正常就认定可以发布；
- 必须在交付前实际运行 `pnpm build` 与 `pnpm preview`；
- 排查问题时先判断它发生在“开发通路”还是“生产通路”。

常见误区：

> Vite 用 esbuild 打包，所以项目里完全不需要 Rollup。

esbuild 在开发时只负责“依赖预构建”，不负责业务源码打包；生产构建仍然走 Rollup。插件体系也以 Rollup 钩子为基础扩展。说“Vite 就是 esbuild”会误判大量行为。

### 2. 依赖预构建

#### 2.1 定义

依赖预构建是指 Vite 在启动开发服务器前，用 esbuild 把 `node_modules` 中被实际引用的依赖提前转换为适合浏览器原生 ESM 消费的形式。产物缓存在 `node_modules/.vite` 目录。

它解决两个不同的问题。

#### 2.2 问题一：模块格式互操作

大量 npm 包仍以 CommonJS 或 UMD 发布，浏览器的原生 ESM 无法直接 `import` 它们。预构建把这些格式统一转换为标准 ESM：

```text
node_modules 中的 CommonJS 包
  module.exports = { createClient }
        ↓ esbuild 预构建
浏览器可消费的 ESM
  export { createClient }
```

#### 2.3 问题二：把成百上千个内部模块合并成少量请求

某些 ESM 包内部由许多文件组成，一个包可能带数千个内部模块。若浏览器逐个原生请求，首次打开页面会产生海量并发连接，拖慢加载。预构建把每个依赖的内部模块图收敛为单个（或少量）模块：

```text
预构建前：import pkg 触发对 pkg 内部 3000 个文件的请求
预构建后：只请求 /node_modules/.vite/deps/pkg.js 一个文件
```

esbuild 使用 Go 实现并以原生代码完成转换，预构建即使面对大依赖也通常在秒级完成，这是 Vite 冷启动快的重要原因。

#### 2.4 缓存与失效

预构建结果带内容哈希并被缓存。重启 dev server 时，如果条件不变，直接复用缓存，跳过重新构建。触发重新预构建的典型条件：

- 锁文件变化（依赖安装/版本变更）；
- `vite.config.ts` 中与依赖优化相关的配置变化；
- 手动删除 `node_modules/.vite`；
- 启动时加 `--force`。

```bash
pnpm dev --force
```

也可以显式声明需要强制纳入或排除预构建的依赖：

```ts
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    include: ['some-large-cjs-package'],
    exclude: ['a-package-that-must-stay-esm'],
  },
});
```

`include` 常用于新依赖在启动后才被动态发现、触发页面重新加载的场景；提前声明可避免“半路预构建”造成的整页刷新。

#### 2.5 工程化关系

理解预构建能解释很多日常现象：为什么改业务代码是毫秒级 HMR，而新装一个包可能触发整页刷新；为什么某些依赖在 dev 下路径变成了 `/node_modules/.vite/deps/...`。遇到“依赖相关”的怪异问题，第一反应可以是检查预构建缓存，而不是立刻怀疑业务代码。

常见误区：

> 把依赖放进 `optimizeDeps.exclude` 能让开发更快。

排除预构建意味着浏览器要直接处理该包的原始模块结构。对内部模块众多或仅提供 CommonJS 的包，这会产生海量请求或直接报错。exclude 只适用于本身就是规范 ESM、模块数少的包，是特例而不是优化开关。

### 3. 开发服务器与模块请求管线

#### 3.1 定义

Vite dev server 是一个基于 Node HTTP 服务的开发服务器，内部由一组可被插件扩展的中间件组成。它负责：静态服务、模块转换、依赖重写、HMR 通道与代理。

#### 3.2 一次模块请求的旅程

以浏览器请求 `/src/main.tsx` 为例：

```text
1. 浏览器请求模块
2. 服务器命中模块转换管线
3. resolveId：确定文件真实路径
4. load：读取文件内容
5. transform：TS/JSX 编译、CSS 处理等
6. import-analysis：把代码中的裸模块说明符重写为可请求路径
7. 返回转换后的 ESM 模块（附带 Source Map）
8. HMR 运行时建立该模块的监听关系
```

关键步骤是 import-analysis。源码里写的：

```ts
import React from 'react';
import { Button } from './Button';
```

在返回给浏览器时，裸说明符 `react` 会被重写为预构建产物路径，相对路径会被补上精确的查询参数，使浏览器能够直接发起正确请求。概念示意：

```js
// 浏览器实际收到的形态（简化示意）
import React from '/node_modules/.vite/deps/react.js?v=hash';
import { Button } from '/src/Button.tsx?t=timestamp';
```

#### 3.3 常用服务器配置

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- `port`：固定端口，避免每次端口漂移；
- `open`：启动后自动打开浏览器；
- `host`：允许局域网设备访问（用于真机调试）；
- `proxy`：把接口请求代理到后端，规避开发期跨域问题。

#### 3.4 与后端协作的典型形态

开发时前端运行在 5173、后端在 3000。前端代码请求 `/api/tickets`，由代理转发：

```text
浏览器 → http://localhost:5173/api/tickets
           Vite proxy 转发
         → http://localhost:3000/api/tickets
```

对浏览器而言请求始终同源，不需要后端为本地开发配置 CORS。

#### 3.5 工程化关系

开发服务器配置属于“每个项目都可能微调”的部分，但端口、代理目标应遵循团队约定，避免 10 个人写 10 个不同端口。代理目标等环境差异应尽量结合环境变量处理，而不是把别人机器的地址提交进仓库。

常见误区：

> 配置了 proxy 之后，生产环境也会自动走同样的代理。

proxy 只存在于开发服务器，生产环境是静态产物 + Nginx/网关，没有 Vite 进程。生产的路由转发必须在真实部署层（Nginx、CDN、API 网关，U57）配置，不能把 dev proxy 当作部署方案。

### 4. HMR 原理

#### 4.1 定义

HMR（Hot Module Replacement，热模块替换）指应用运行过程中，在不整页刷新、尽量保留运行时状态的前提下，替换、增删个别模块。

它解决的核心矛盾是：改代码后想立刻看到结果，但整页刷新会丢失页面状态（表单输入、弹窗展开、列表滚动位置、已加载数据）。

#### 4.2 通信链路

```text
开发者保存文件
  ↓
服务器文件系统监听发现变化
  ↓
服务器重新转换该模块
  ↓
通过 WebSocket 向浏览器推送更新消息（含变化模块及时间戳）
  ↓
浏览器 HMR 运行时沿模块图向上查找“接收边界”
  ↓
到达边界：拉取新模块并执行替换回调
  未找到边界：触发整页刷新兜底
```

#### 4.3 接收边界与失效传播

不是每个模块都要自己处理热更新。HMR 沿 importer（谁引用了我）向上寻找第一个声明“我能处理更新”的模块，这就是边界：

```text
list.tsx 变化
  ↓ 向上找
list.tsx 没有 accept？
  ↓ 找引用它的 App.tsx
框架插件注入的边界能处理组件更新 → 在此停止
```

如果一路向上都没有边界，HMR 放弃精确定位，退回整页刷新。这就是为什么“有时是热更新、有时整页刷新”——取决于变更模块能否找到边界。

#### 4.4 使用 import.meta.hot API

Vite 向模块注入 `import.meta.hot`。一个手写边界的例子：

```ts
// src/features/timer/render.ts
export function renderTimer(container: HTMLElement) {
  let elapsed = 0;
  const el = document.createElement('div');
  container.append(el);

  const timer = setInterval(() => {
    elapsed += 1;
    el.textContent = `已运行 ${elapsed} 秒`;
  }, 1000);

  return () => clearInterval(timer);
}

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    if (newModule) {
      console.log('timer 模块已热替换');
    }
  });

  import.meta.hot.dispose(() => {
    console.log('旧模块即将被替换，在此清理资源');
  });
}
```

常用 API：

| API | 触发时机 | 典型用途 |
|---|---|---|
| `hot.accept(cb)` | 当前模块或其依赖更新 | 声明接收边界 |
| `hot.dispose(cb)` | 旧模块被替换前 | 清理定时器、事件监听、订阅 |
| `hot.prune(cb)` | 模块不再需要 | 清理仅该模块使用的资源 |
| `hot.invalidate()` | 更新无法处理 | 强制整页刷新兜底 |
| `hot.data` | 跨新旧模块持久化 | 把状态传给替换后的自己 |

在新旧实例之间传递状态：

```ts
// 模块热替换后保留计数
const state = (import.meta.hot?.data.state ??= { count: 0 });
state.count += 1;
console.log('模块实例计数：', state.count);
```

#### 4.5 框架层为什么“开箱即用”

实际业务中很少手写 accept，因为框架插件（如 React 的 Fast Refresh 集成）已经在组件层自动建立边界：组件代码变化时，只替换该组件并尽量保留其 state；只有改动影响到组件签名等关键结构时才重置状态。理解底层边界机制，能帮助判断“为什么这次状态没保留”。

#### 4.6 工程化关系

HMR 是开发体验的核心，也是“把反馈周期压到秒级”的关键设施。但它只影响开发，不进入生产产物；`import.meta.hot` 相关代码在生产构建中会被移除。不要在热更新回调里写业务必需逻辑。

常见误区：

> 改了代码页面没刷新，说明 HMR 坏了。

需要先看证据：Console 是否有 HMR 日志、WebSocket 是否连接、变更文件是否在模块图内。环境配置（如反向代理、HTTPS）可能阻断 WebSocket；此时往往表现为“整页刷新”而不是“毫无反应”。排查应从 HMR 的通信链路逐段确认，而非凭感觉。

### 5. 静态资源处理与路径别名

#### 5.1 定义

Vite 把静态资源分成两类：

- 在模块中被 import 的资源：进入模块图，参与 hash 命名、内联阈值等构建策略；
- 放在 `public` 目录的资源：不经过构建处理，原样拷贝，按根路径直接引用。

#### 5.2 import 资源：默认得到 URL

```ts
import logoUrl from './assets/logo.png';

const img = document.createElement('img');
img.src = logoUrl;
document.body.append(img);
```

- 开发时返回该资源的可访问路径；
- 生产构建时文件被输出到产物目录并加上内容 hash（如 `logo-a1b2c3.png`），便于长期缓存；
- 小于内联阈值的资源会直接变成 base64 data URL，减少一次请求。

显式导入方式：

```ts
// 强制取 URL
import iconUrl from './icon.svg?url';

// 以字符串形式读取文件内容
import svgText from './icon.svg?raw';

// 作为 Web Worker 初始化
import Worker from './worker.ts?worker';

const worker = new Worker();
worker.postMessage('start');
```

#### 5.3 public 目录

```text
src/
public/
└── favicon.ico
```

`public/favicon.ico` 在代码和 HTML 中始终以 `/favicon.ico` 引用：

```html
<link rel="icon" href="/favicon.ico" />
```

适用场景：从不改变、需要固定 URL 的文件（robots、favicon）。代价是它不经过 hash，也享受不到基于内容变更的缓存失效。

#### 5.4 路径别名

深层目录下相对路径很快变得不可读：

```ts
import { Button } from '../../../shared/ui/Button';
```

配置别名后：

```ts
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

```ts
import { Button } from '@/shared/ui/Button';
```

TypeScript 还需要在 `tsconfig.json` 中同步路径映射，否则类型检查不认识别名：

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

#### 5.5 工程化关系

别名应在团队内统一（通常只保留 `@` 一个），避免每人定义十几个别名再次制造认知负担。import 资源与 public 的选择体现缓存策略：会变化的资源走 import 获得 hash 缓存，固定不变的才进 public。

常见误区：

> 所有图片都应该放 public，引用最省事。

public 资源不带 hash，更新后用户可能命中旧缓存；import 资源则能随内容变化自动更新文件名。除 favicon 等确需固定 URL 的文件外，业务资源更推荐 import 方式纳入模块图。

### 6. 插件机制与钩子（概念级）

#### 6.1 定义

Vite 插件是一个返回配置对象（或数组）的函数，它借用 Rollup 的插件接口并扩展了若干 Vite 专属钩子。插件让开发者可以在模块解析、加载、转换、服务器定制和 HTML 处理等节点插入自己的逻辑。

#### 6.2 一个最小插件

下面的插件在转换阶段给 `.log.txt` 这类纯文本模块加一行标记，并在 dev server 上挂一个自定义接口（仅作机制演示）：

```ts
// plugins/mark.ts
import type { Plugin } from 'vite';

export function markPlugin(): Plugin {
  return {
    name: 'demo-mark-plugin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__demo/ping', (_req, res) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ ok: true }));
      });
    },
    transform(code, id) {
      if (!id.endsWith('.marked.ts')) return null;
      return {
        code: `console.log('[marked] ${id}');\n${code}`,
        map: null,
      };
    },
  };
}
```

在配置中注册：

```ts
import { defineConfig } from 'vite';
import { markPlugin } from './plugins/mark';

export default defineConfig({
  plugins: [markPlugin()],
});
```

#### 6.3 钩子按阶段分类

| 阶段 | 代表钩子 | 作用 |
|---|---|---|
| 配置 | `config`、`configResolved` | 修改或读取最终配置 |
| 服务器 | `configureServer` | 添加中间件、定制 dev server |
| 解析 | `resolveId` | 自定义模块说明符到文件的映射 |
| 加载 | `load` | 自定义模块内容来源 |
| 转换 | `transform` | 对模块代码做加工 |
| HTML | `transformIndexHtml` | 注入脚本/修改入口 HTML |
| HMR | `handleHotUpdate` | 自定义文件变化时的更新行为 |
| 输出 | `generateBundle`、`writeBundle` | 产物生成阶段介入（偏构建，U31） |

其中 resolveId/load/transform/generateBundle 继承自 Rollup，开发与生产都会经过（在其适用通路内）；configureServer、transformIndexHtml、handleHotUpdate 是 Vite 为开发场景增加的专属能力。

#### 6.4 插件顺序与适用通路

- `enforce`：`'pre'` 在核心插件前执行，`'post'` 在后；默认在中间。
- `apply`：`'serve'` 只在开发生效，`'build'` 只在生产生效；不传则两侧都生效。

```ts
{
  name: 'only-dev-helper',
  apply: 'serve',
  enforce: 'pre',
}
```

多个插件组成数组时，钩子按 enforce 分层与数组顺序执行。排查“插件没生效/被覆盖”时，顺序是首要怀疑对象。

#### 6.5 工程化关系

插件机制让工具链具备可扩展性：框架支持、Wasm、特殊资源类型都通过插件接入，而不必改 Vite 本体。但每增加一个插件都增加启动成本和升级面，应遵循“官方或社区主流优先、无收益不装”的原则，并与 U29 的工具链全景保持一致。

常见误区：

> 钩子随便返回个字符串就算实现了。

转换类钩子必须返回结构化结果（含 `code` 与可选 `map`），或返回 `null` 表示不处理；直接返回字符串、吞掉 source map 会导致行号错乱、调试失效。此外在 transform 中不加文件判断会对所有模块执行，极易拖慢服务器。

### 7. 环境变量（概览）

#### 7.1 定义

环境变量是在代码之外注入的配置，使同一份产物可以对接不同环境（开发、测试、生产）。Vite 通过 `import.meta.env` 暴露：

```ts
console.log(import.meta.env.MODE);
console.log(import.meta.env.DEV);
console.log(import.meta.env.PROD);
console.log(import.meta.env.BASE_URL);
console.log(import.meta.env.VITE_API_BASE_URL);
```

`.env` 文件按模式加载：

```bash
# .env.development
VITE_API_BASE_URL=/api

# .env.production
VITE_API_BASE_URL=https://api.example.com
```

#### 7.2 两条安全事实

```text
1. 只有 VITE_ 前缀的变量才会暴露给客户端代码。
2. 暴露给客户端的变量会被写进可下载的产物，任何人都看得到。
```

因此前端环境变量里只能放“本来就公开”的配置（接口地址、功能开关），绝不能放后端密钥、私钥或服务端令牌。这不是约定而是事实：产物是公开文本。

#### 7.3 工程化关系

本单元只需建立“有环境变量、读哪个文件、哪些会外泄”的认知；多环境分层、运行时注入与 CI 中的安全处理在 U33 系统展开。

常见误区：

> 把密钥放到没有 VITE_ 前缀的变量里，就安全了。

无前缀变量只是“不暴露给浏览器”，但它仍可能出现在构建机进程、日志或被 Node 脚本读取。前端项目根本不应持有后端 Secret；需要保密的能力应由后端代理完成。

### 8. 性能与调试

#### 8.1 启动与更新性能的观察点

```text
冷启动时间：从零开始启动 dev server
依赖优化时间：预构建是否命中缓存
首次页面加载：模块请求数量与瀑布深度
热更新耗时：保存到界面更新的间隔
```

优化手段按收益排序通常是：

1. 确保预构建缓存正常命中（不要频繁误删 `.vite`）；
2. 对新发现的大依赖使用 `optimizeDeps.include` 提前声明；
3. 避免在插件 transform 中对全量文件做重操作；
4. 大型项目关注源码模块请求瀑布，但不要过早优化。

#### 8.2 开启调试日志

```bash
DEBUG=vite:* pnpm dev
```

调试日志会展示模块解析、转换、HMR 消息等细节，用于定位“模块为什么解析到这个路径”“更新为什么走到整页刷新”等问题。

#### 8.3 典型故障与证据

| 症状 | 优先收集的证据 |
|---|---|
| 启动慢 | 是否未命中预构建缓存、依赖数量、插件耗时 |
| HMR 变整页刷新 | Console HMR 日志、变更模块是否有边界 |
| 模块解析失败 | 调试日志中的 resolveId 结果、别名配置 |
| 接口跨域/404 | proxy 配置、请求实际目标地址 |
| 真机访问不了 | host 设置、防火墙、局域网连通性 |

#### 8.4 工程化关系

开发期性能直接影响团队反馈节奏，属于工具链体验的一部分；但它应服务于交付，优化要以测量为依据。不要为了理论上的几百毫秒引入复杂配置，反而增加维护面。

常见误区：

> dev server 慢，就一定是 Vite 的问题，先加一堆插件试试。

慢可能来自：机器杀软扫描 node_modules、网络盘上的项目目录、未命中缓存、自定义插件低效。应先用日志和时间证据定位瓶颈，一次只验证一个假设——这与 U01 建立的证据驱动排查方法一致。

## 课后题

1. 画出 Vite 的双引擎架构，并解释为什么开发通路和生产通路不能简单合成一套。
2. 依赖预构建解决哪两个问题？请分别说明：如果没有预构建，浏览器侧会观察到什么。
3. 什么情况下 Vite 会重新执行依赖预构建？请至少列出四种情况。
4. 场景分析：团队成员新装了一个依赖后，页面突然整页刷新，而此后重启都很快。请用预构建机制解释现象，并给出避免该刷新的配置。
5. 详细描述浏览器请求一个 TSX 模块到得到返回结果之间发生了什么。import-analysis 为什么必要？
6. 解释 HMR 的“接收边界”概念。为什么有的代码改动是热更新，有的却变成整页刷新？
7. `import.meta.hot.dispose` 和 `import.meta.hot.data` 分别解决什么问题？请各给一个适合使用的场景。
8. 场景分析：某项目改任何代码都整页刷新。请按 HMR 链路写出排查顺序，列出至少五个检查点。
9. 场景分析：评审时发现新同学把所有业务图片都放进了 `public`，认为“引用路径短最省事”。请说明被 import 的图片与 public 图片在开发和生产下分别如何被处理，并解释为什么会变化的业务图片应优先选择 import。
10. 场景分析：同事把后端数据库密码写进 `.env`（不带 `VITE_` 前缀），声称“前端读不到所以安全”。请指出这个判断的问题，并给出正确做法。

## 实践练习题

### 练习 1：观察并记录 Vite 开发模式的请求结构

#### 任务

通过 DevTools 与调试日志，亲眼确认原生 ESM、依赖预构建与 HMR 的行为，形成一份带证据的观察报告。

#### 步骤约束

1. 启动项目并打开 Network，刷新页面，记录业务模块与 `/node_modules/.vite/deps/` 下依赖请求的区别。
2. 在终端以 `DEBUG=vite:* pnpm dev` 重启，截取依赖优化与模块解析的关键日志。
3. 修改一个组件的文案，记录 Console 中 HMR 相关输出与 Network 中的新模块请求。
4. 删除 `node_modules/.vite` 后重启，记录首次重新预构建与再次重启命中缓存的耗时差异。
5. 修改一个非组件的普通工具模块，观察是否能热更新；再故意制造一次无边界更新。
6. 所有记录需包含命令、时间戳（可自行计时）与现象，不能只写结论。

#### 提交物

- `evidence/network.md`：模块请求结构说明；
- `evidence/debug-log.md`：关键调试日志摘录与解释；
- `evidence/hmr.md`：修改文件后的 HMR 证据；
- 一份缓存命中/失效的耗时对比表。

#### 验收标准

- 能区分源码模块请求与预构建依赖请求；
- 能从日志中指认依赖优化与模块解析过程；
- 能用边界机制解释观察到的热更新与整页刷新；
- 缓存实验包含真实计时数据；
- 结论均有对应证据。

### 练习 2：配置完整的开发服务器与资源策略

#### 任务

为项目配置端口、代理、路径别名、静态资源策略，使开发体验统一、import 路径清晰。

#### 步骤约束

1. 在 `vite.config.ts` 配置固定端口、自动打开浏览器与 `/api` 代理到本地后端。
2. 配置 `@` 别名指向 `src`，并在 `tsconfig.json` 同步 `paths`。
3. 把至少两张图片改为 import 方式引入，一张放入 public，验证两种引用路径。
4. 使用 `?raw` 导入一个文本文件并在页面展示其内容。
5. 编写配置说明文档，写清每项配置解决什么问题。
6. 重启服务器验证全部配置生效；类型检查不得因别名报错。

#### 提交物

- 更新后的 `vite.config.ts`、`tsconfig.json`；
- 资源使用示例代码；
- `docs/dev-server.md` 配置说明；
- 验证记录（含代理请求与别名 import 成功的证据）。

#### 验收标准

- 别名在运行与类型检查两侧均生效；
- 代理能把 `/api` 请求转发到目标后端；
- 两类资源引用方式均正确；
- 配置项克制，无重复或无效配置；
- 文档与实际配置一致。

### 练习 3：实现并验证一个自定义 Vite 插件

#### 任务

编写一个在开发模式生效的插件，实现自定义虚拟模块与 transform 逻辑，理解钩子时序与插件边界。

#### 步骤约束

1. 插件提供虚拟模块 `virtual:build-info`，import 它可得到构建模式与生成时间。
2. 使用 `resolveId` 与 `load` 钩子实现虚拟模块，模块 ID 约定以 `\0` 前缀防止被其他插件重复处理。
3. 增加 transform 钩子：仅对显式标记的文件（如 `.info.ts`）注入一行日志，并正确返回 `{ code, map }` 结构。
4. 通过 `configureServer` 增加一个 `/__build-info` 的 JSON 接口。
5. 插件设置 `apply: 'serve'`，确认生产构建不受影响。
6. 在页面中同时消费虚拟模块与接口，并记录钩子执行顺序（可在钩子中打日志观察）。

#### 提交物

- `plugins/build-info.ts`；
- 更新后的 `vite.config.ts`；
- 消费虚拟模块与接口的示例组件；
- `docs/plugin.md`：钩子时序记录与设计说明。

#### 验收标准

- 虚拟模块可被正常 import 且类型不报错；
- transform 只作用于目标文件，返回结构合规；
- 自定义接口返回正确 JSON；
- 插件不在生产通路产生副作用；
- 能解释每个钩子的触发时机与顺序。

## 阶段验收作业

### 作业名称

Vite 开发服务器深度配置与机制讲解

### 作业场景

团队要求你把一个普通脚手架项目升级为“开发体验可讲、可演示、可复用”的开发环境：统一的服务器配置、清晰的资源与别名策略、一个服务业务的自定义插件，并且你要能向同事讲清每一项背后的机制，而不只是交出一份能用的配置。评审会重点关注你是否真正理解 dev server 与 HMR 的运行过程。

### 提交物

```text
vite-lab/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── plugins/
│   └── build-info.ts
├── src/
│   ├── main.tsx
│   ├── app/
│   ├── features/
│   │   └── demo/
│   ├── shared/
│   └── assets/
├── public/
├── docs/
│   ├── architecture.md      # 双引擎与请求管线
│   ├── hmr.md               # HMR 链路与边界实验
│   └── plugin.md            # 插件设计与钩子时序
├── evidence/
│   ├── requests.md
│   └── timings.md
└── README.md
```

要求：

- 所有配置真实生效，README 提供启动、复现步骤；
- 文档中的每条结论都能在 evidence 中找到对应观察；
- 插件必须具备实际用途（虚拟模块或构建信息），不允许只打印日志。

### 演示步骤

学员需要在 15 分钟内完成：

1. 讲解 Vite 双引擎架构，说明 dev 为什么不打包业务源码。
2. 在 Network 中指认源码模块与预构建依赖，解释预构建缓存命中条件。
3. 跟随一个模块请求讲清 resolveId → load → transform → import-analysis 管线。
4. 修改组件演示 HMR，再展示一次无边界导致的整页刷新并解释。
5. 演示别名、两类静态资源与代理接口。
6. 展示自定义插件的虚拟模块、接口与钩子执行顺序。
7. 回答导师针对“某个配置能否删除、删除后怎样”的追问。

导师可临时改变端口或让插件增加一个钩子，验证动手能力。

### 评分标准（100 分）

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 架构理解 | 20 | 双引擎、预构建与请求管线解释准确 |
| HMR 理解 | 20 | 通信链路、边界与失效传播讲得清楚 |
| 配置正确性 | 20 | 服务器、别名、资源、代理均生效 |
| 插件实现 | 20 | 钩子使用规范，返回结构正确，仅在目标通路生效 |
| 证据与文档 | 10 | 结论有证据，文档与实现一致 |
| 安全意识 | 10 | 环境变量与密钥边界正确 |

细分评分规则：

#### 架构理解：20 分

- 双引擎与设计动机正确：8 分；
- 预构建两个问题与缓存条件正确：7 分；
- 请求管线各步骤衔接正确：5 分。

#### HMR 理解：20 分

- WebSocket 链路与更新流程正确：8 分；
- 接收边界与失效传播正确：7 分；
- 能正确使用 hot API 并解释其生产期行为：5 分。

#### 配置正确性：20 分

- 服务器与代理生效：7 分；
- 别名在运行与类型检查两侧生效：7 分；
- 资源策略与内联/raw/worker 使用正确：6 分。

#### 插件实现：20 分

- 虚拟模块或业务钩子实现正确：8 分；
- 钩子返回结构与文件过滤规范：7 分；
- 插件顺序、apply 与副作用控制正确：5 分。

#### 证据与文档：10 分

- 请求与耗时记录来自实际运行：5 分；
- 文档结论与证据对应、可复现：5 分。

#### 安全意识：10 分

- 明确 VITE_ 前缀与产物外泄事实：5 分；
- 提交物不含任何真实密钥：5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过，修正后重新验收：

1. 无法解释 dev 与 build 的机制差异，认为 Vite 开发时也在做整体打包。
2. 说不清单次模块请求的处理管线或预构建的作用。
3. 对 HMR 的解释停留在“自动刷新”，无法说明边界与整页刷新原因。
4. 配置无法生效却以“重启试试”敷衍，无法用证据定位。
5. 插件钩子返回非法结构导致 source map 错乱或服务器异常。
6. 提交真实密钥或把后端 Secret 写入前端环境文件。
7. 只提交配置文件，缺少文档、证据与演示。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解双引擎架构 | `architecture.md`、演示步骤 1 |
| 掌握依赖预构建机制 | 演示步骤 2、缓存实验记录 |
| 讲清开发服务器请求管线 | 演示步骤 3 |
| 理解并会用 HMR | `hmr.md`、演示步骤 4 |
| 配置资源与路径别名 | `vite.config.ts`、演示步骤 5 |
| 理解插件与钩子 | `plugins/build-info.ts`、演示步骤 6 |

### 提交前自检

- [ ] 六个学习目标均有对应证据。
- [ ] 删除 `.vite` 缓存后能正常完成一次冷启动并恢复缓存。
- [ ] 别名在开发运行与 `tsc --noEmit` 下均无报错。
- [ ] 至少一次 HMR 与一次整页刷新被实际观察并解释。
- [ ] 自定义插件在 `vite build` 下不产生副作用。
- [ ] 文档中提到的每个现象都有 evidence 支撑。
- [ ] 前端环境文件不含任何真实密钥。
- [ ] README 能指导他人从零复现全部实验。
