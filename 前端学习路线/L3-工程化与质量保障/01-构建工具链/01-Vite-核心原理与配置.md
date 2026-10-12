# 01-Vite 核心原理与配置

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L3 工程化与质量保障
> - 先修：[02 — Vue Router 导航守卫与懒加载](../../L2-前端框架与组件化/05-路由与导航/02-Vue-Router-导航守卫与懒加载.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Vite](https://vite.dev/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Vite 基于 ESM 的开发模式设计哲学
- 掌握预构建（Pre-Bundling）的作用与原理
- 能手写 `vite.config.ts` 完成别名、代理、CSS 等核心配置
- 理解 HMR 的实现机制
- 从零搭建 Vite + React + TypeScript 项目

---

## 内容讲解

### 一、Vite 的设计哲学

传统打包工具（Webpack）在开发模式下会把整个项目打包成一个 Bundle，项目越大启动越慢。Vite 的核心思路是：**开发阶段直接利用浏览器原生 ESM（ES Modules）能力，不再提前打包，只在需要时编译。**

整个工作流分为两层：

| 阶段 | 工具 | 职责 |
|------|------|------|
| 开发（dev） | 浏览器 ESM + esbuild | 按需编译，极速冷启动 |
| 预构建（dev） | esbuild | 将 node_modules 中的 CJS 包转为 ESM |
| 生产（build） | Rollup | 打包优化，Tree Shaking，代码分割 |

**为什么开发不用 Rollup？** Rollup 作为打包器，需要构建完整的模块依赖图，仍然存在冷启动慢的问题。而 esbuild（Go 编写）的编译速度比传统 JS 工具快 10-100 倍，非常适合「按需」编译单文件。

**为什么生产不用 esbuild？** esbuild 的代码分割和 Tree Shaking 能力不如 Rollup 成熟。Vite 的选择是开发追求速度，生产追求最优输出。

---

### 二、开发模式的按需编译原理

当你启动 `vite dev` 时，Vite 在你的 `index.html` 中注入一个客户端脚本，然后起一个 Node.js 开发服务器。流程如下：

```
浏览器请求 /src/main.tsx
  → Vite Dev Server 收到请求
  → 用 esbuild 编译该文件（TS → JS、JSX → JS）
  → 返回编译后的 ESM 代码
  → 浏览器解析 import 语句，继续发请求
  → 形成「请求→编译→返回」的链式按需加载
```

**关键点：** 你改了哪个文件，浏览器只重新请求那个文件。相比 Webpack 每次改动要重新构建整个 Bundle（即使有 HMR），Vite 的改动响应是 O(1) 级别。

---

### 三、预构建（Pre-Bundling）

`npm install` 之后首次启动 `vite dev` 时，Vite 会用 esbuild 扫描 `node_modules`，做两件事：

#### 1. CJS → ESM 转换

许多 npm 包仍以 CommonJS 格式发布。浏览器不认识 `require()`，Vite 会把它们转为 ESM。例如 `lodash` 是 CJS 包，Vite 把它转成 ESM 后缓存到 `node_modules/.vite/deps/`。

#### 2. 合并碎片化模块

某些包由数百个小文件组成（比如 `lodash-es` 有 600+ 个文件）。在原生 ESM 下，浏览器要为每个文件发一次 HTTP 请求，造成网络阻塞。Vite 会把这些碎片合并成少量大文件，减少请求数。

```bash
# 手动触发预构建
npx vite optimize

# 强制重新预构建（删除缓存）
npx vite optimize --force
```

**缓存策略：** 预构建结果缓存在 `node_modules/.vite/deps/`，只有 `package.json` 中依赖版本变化或 `vite.config.ts` 中 `optimizeDeps` 配置变化时才会重新构建。

---

### 四、vite.config.ts 核心配置

下面是一份可直接使用的完整配置，每个字段都有中文注释：

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  // ========== resolve：路径解析 ==========
  resolve: {
    // 路径别名：让你写 import xxx from '@/utils' 而不是 ../../../utils
    alias: {
      '@': path.resolve(__dirname, 'src'),       // @ 指向 src 目录
      '@comp': path.resolve(__dirname, 'src/components'),  // 组件别名
      '@utils': path.resolve(__dirname, 'src/utils'),      // 工具函数别名
    },
    // 忽略扩展名：导入时可以省略这些后缀
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },

  // ========== server：开发服务器 ==========
  server: {
    port: 3000,             // 开发服务器端口
    open: true,             // 启动时自动打开浏览器
    // 请求代理：解决开发时的跨域问题
    proxy: {
      // 所有 /api 开头的请求转发到后端
      '/api': {
        target: 'http://localhost:8080',  // 后端服务地址
        changeOrigin: true,               // 修改请求头中的 origin
        rewrite: (p) => p.replace(/^\/api/, ''),  // 去掉 /api 前缀（可选）
      },
      // 更精细的代理规则
      '/upload': {
        target: 'http://file-server:9000',
        changeOrigin: true,
      },
    },
    // HMR 配置
    hmr: {
      overlay: true,   // 编译错误时浏览器显示错误遮罩
      // protocol: 'ws',  // 默认使用 WebSocket
    },
  },

  // ========== css：样式处理 ==========
  css: {
    // CSS Modules 的行为配置
    modules: {
      // 生成的类名规则：[文件名]_[本地类名]_[hash]
      localsConvention: 'camelCaseOnly',  // 类名以驼峰形式导出
      generateScopedName: '[name]__[local]___[hash:base64:5]',
    },
    // PostCSS 配置（Vite 会自动读取 postcss.config.js）
    postcss: {},
    // 预处理器配置
    preprocessorOptions: {
      less: {
        // 全局注入 Less 变量（无需在每个文件中 @import）
        additionalData: `@import "@/styles/variables.less";`,
        javascriptEnabled: true,
      },
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
    // 将 CSS 转换为内联样式（适合小项目）
    // devSourcemap: true,  // 开发时启用 CSS sourcemap
  },

  // ========== define：全局常量替换 ==========
  define: {
    __APP_VERSION__: JSON.stringify('1.0.0'),  // 构建时替换
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },

  // ========== build：生产构建 ==========
  build: {
    outDir: 'dist',              // 输出目录
    assetsDir: 'assets',         // 静态资源目录（相对于 outDir）
    sourcemap: false,            // 生产环境通常不需要 sourcemap
    // 代码分割策略
    rollupOptions: {
      output: {
        manualChunks: {
          // 将 React 系列库单独打包为 vendor chunk
          vendor: ['react', 'react-dom'],
          // 将 UI 库单独打包
          antd: ['antd'],
        },
      },
    },
    // chunk 大小警告阈值（超过此值控制台会提示）
    chunkSizeWarningLimit: 500,
  },

  // ========== esbuild ==========
  esbuild: {
    // 自动注入 React 导入（不需要 import React from 'react'）
    // jsxInject: `import React from 'react'`,
    // 删除 console 和 debugger
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },

  // ========== optimizeDeps：预构建配置 ==========
  optimizeDeps: {
    // 强制预构建这些包（有些 CJS 包 Vite 无法自动检测）
    include: ['lodash-es', 'dayjs', 'axios'],
    // 排除不需要预构建的包
    exclude: ['your-local-package'],
  },
})
```

---

### 五、HMR（热模块替换）原理

HMR 让你在修改代码后**只更新变化的模块，不刷新整个页面，保持应用状态**。

Vite 的 HMR 流程：

```
你修改 src/App.tsx
  → Vite Dev Server 的文件监听器 (chokidar) 检测到变更
  → 通过 WebSocket 向浏览器推送更新消息
  → 消息包含：更新的模块路径 + 类型（js/css）
  → 浏览器端 HMR Runtime 收到消息
  → 如果是 CSS：只替换 <style> 标签内容，不重新执行 JS
  → 如果是 JS：用动态 import() 重新加载该模块及其 HMR boundary
  → 执行模块的 hot.accept() 回调，局部更新
```

**CSS 的 HMR 特别快：** Vite 对 `.css` 文件的 HMR 只需要替换对应 `<style>` 标签的内容，完全不需要执行 JS，几乎零延迟。

**React 的 HMR：** 通过 `@vitejs/plugin-react` 中的 `react-refresh` 实现，它能在不丢失组件状态的前提下更新组件。原理是在编译时给每个 React 组件注入 HMR 签名代码，运行时通过模块热替换 API 替换组件函数体而不重置 hooks 状态。

---

### 六、常用插件

#### @vitejs/plugin-react

```bash
npm install @vitejs/plugin-react -D
```

```typescript
// vite.config.ts
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // 使用 Babel 而非 esbuild（当需要 Babel 插件时）
      babel: {
        plugins: ['babel-plugin-styled-components'],
      },
      // 或者使用 SWC（更快）替代 Babel
      // 安装 @vitejs/plugin-react-swc 并使用 reactSWC()
    }),
  ],
})
```

#### @vitejs/plugin-vue

```bash
npm install @vitejs/plugin-vue -D
```

```typescript
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
```

---

### 七、实战：从零搭建 Vite + React + TypeScript 项目

```bash
# 1. 创建项目
npm create vite@latest my-app -- --template react-ts
cd my-app

# 2. 安装依赖
npm install

# 3. 安装额外的开发依赖
npm install @types/node -D    # Node.js 类型定义

# 4. 项目结构
my-app/
├── index.html              # Vite 入口（不是 public/index.html）
├── package.json
├── tsconfig.json
├── tsconfig.node.json      # vite.config.ts 的 TS 配置
├── vite.config.ts
└── src/
    ├── main.tsx             # 应用入口
    ├── App.tsx
    ├── App.css
    ├── components/
    │   └── HelloWorld.tsx
    └── vite-env.d.ts        # Vite 环境变量类型声明
```

**关键文件说明：**

```typescript
// src/vite-env.d.ts —— 让 TypeScript 识别 Vite 特有类型
/// <reference types="vite/client" />

// 扩展 import.meta.env 的类型
interface ImportMetaEnv {
  readonly VITE_API_BASE: string
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

```
<!-- index.html —— Vite 的 HTML 入口（必须在项目根目录） -->
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite + React + TS</title>
  </head>
  <body>
    <div id="root"></div>
    <!-- Vite 会自动处理这个 script 标签，不需要手动加 type="module" -->
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**配置代理和别名后，启动开发服务器：**

```bash
npm run dev
# → Vite 在 3000 端口启动，打开浏览器即可看到你的应用
# → 修改 src/App.tsx，保存，浏览器即时更新（HMR 生效）
```

---

## 常见问题

### Q1：Vite 开发模式和打包后行为不一致怎么办？

Vite 开发用 esbuild，生产用 Rollup。差异通常出现在 CJS 模块的处理和 Tree Shaking 上。排查步骤：

1. 先检查 `node_modules/.vite/deps/` 下该模块的预构建结果
2. 查看 Rollup 构建日志中是否有警告
3. 将问题包加入 `optimizeDeps.include` 强制预构建
4. 必要时在 `build.rollupOptions` 中配置特殊处理

### Q2：为什么启动时提示「预构建依赖失败」？

通常是某个 npm 包存在语法问题或依赖了 Node.js 专用模块（如 `fs`, `path`）。解决方法：
- 将该包加入 `optimizeDeps.exclude`
- 如果实在需要该包的浏览器版本，检查该包是否有 ESM 构建产物

### Q3：Vite 项目怎么处理 `require()` 调用？

Vite 使用 ES Module。如果必须使用 CJS 模块，可以通过 `optimizeDeps.include` 让 esbuild 预构建时自动转换。

### Q4：alias 配置了为什么不生效？

检查两点：
1. `tsconfig.json` 中是否同步设置了 `paths`（让 TypeScript 也认识别名）
2. 是否安装了 `@types/node` 才能使用 `path.resolve`

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Q5：如何调试 Vite 配置？

```bash
# 打印最终解析后的配置
npx vite config

# 查看预构建信息
DEBUG=vite:deps npx vite
```

### Q6：CSS Modules 和普通 CSS 怎么混用？

Vite 自动识别：文件名以 `.module.css` / `.module.less` / `.module.scss` 结尾的启用 CSS Modules，否则按普通 CSS 处理。

### Q7：如何配置多页面应用？

```typescript
// vite.config.ts
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
})
```

每个页面都有自己的 `index.html` 作为入口，包含各自的 `<script type="module" src="...">`。

---

## 实操作业

### 基础练习：搭架子

用 `npm create vite@latest` 创建一个 React + TypeScript 项目，完成以下配置：
- 配置 `@` 别名指向 `src` 目录
- 开发服务器端口改为 3333，启动时自动打开浏览器
- 配置代理，将 `/api` 请求转发到 `https://jsonplaceholder.typicode.com`

### 进阶练习：插件与优化

在基础项目上增加：
- 使用 `@vitejs/plugin-react-swc`（SWC 版本）替代默认 React 插件，对比冷启动速度
- 安装 `less`，配置全局 `variables.less` 自动注入
- 安装 `lodash-es`，观察未配置预构建时的请求瀑布流，然后配置 `optimizeDeps.include` 观察效果变化

### 挑战练习：自定义插件

编写一个 Vite 自定义插件，功能：将 `console.log` 替换为带文件名和行号的日志输出。提示：使用 `transform` 钩子和正则匹配。

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：resolve.alias 与 TS paths 对齐，server.port=3333；代理明确是否去掉 /api 前缀。浏览器请求 /api/posts 得到 JSON；代理只用于开发不自动进入生产。
- **进阶**：同锁文件与相同缓存条件比较 SWC，Less 注入仅变量避免重复 CSS。Vite 会自动发现预构建依赖，include 用于实际未发现项，不预设 lodash-es 一定有瀑布。
- **挑战**：transform 使用 AST 或明确限制教学正则的输入范围，返回 source map。字符串/comment 中的 console.log 不应误改，生产关闭插件，行号由实际源位置计算。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L3 里程碑](../../projects/atlas/milestones/L3.md)
- 本课任务：把“Vite 核心原理与配置”接入 Atlas 工程链路，形成可重复命令和失败门禁，并保存一次故意失败与恢复的证据。
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

Vite 通过「开发用 esbuild 按需编译 + 生产用 Rollup 完整打包」的双引擎架构，解决了传统打包工具开发体验和构建产出的矛盾。你需要重点掌握：

1. **预构建机制**：CJS→ESM 转换 + 模块合并，这是 Vite 快的关键
2. **vite.config.ts 五大配置域**：resolve / server / css / build / define
3. **HMR 原理**：WebSocket 推送 + 模块级替换，CSS 尤其快
4. **alias 配置需要 tsconfig.json 同步**，这是新人最容易踩的坑

下一节我们将深入 Rspack 和 Webpack，理解传统打包工具的设计思路和现代演进。

<!-- course-nav:start -->
---

[上一篇：复杂列表、焦点与虚拟化](../../L2-前端框架与组件化/06-复杂业务界面/02-复杂列表-焦点与虚拟化.md) · [课程地图](../../README.md) · [下一篇：02-Rspack 与 Webpack 对比](./02-Rspack与Webpack对比.md)
<!-- course-nav:end -->
