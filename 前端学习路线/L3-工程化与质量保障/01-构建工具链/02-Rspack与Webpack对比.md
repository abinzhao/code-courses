# 02-Rspack 与 Webpack 对比

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L3 工程化与质量保障
> - 先修：[01-Vite 核心原理与配置](./01-Vite-核心原理与配置.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Rspack](https://rspack.dev/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 掌握 Webpack 五大核心概念和完整工作流程
- 理解 Loader 和 Plugin 的区别与职责
- 了解 Rspack 的 Rust 实现带来的性能突破
- 能根据项目场景选择合适的打包工具
- 用 Rspack 搭建基本项目并对比构建速度

---

## 内容讲解

### 一、Webpack 五大核心概念

Webpack 本质是一个**静态模块打包器**：从一个或多个入口开始，构建依赖图（Dependency Graph），把所有模块打包成一个或多个 Bundle。

| 概念 | 作用 | 典型值 |
|------|------|--------|
| **entry** | 打包的入口，从哪个文件开始构建 | `./src/index.js` |
| **output** | 打包产物的输出位置和命名方式 | `dist/` 目录 |
| **loaders** | 处理非 JS 文件，转成 Webpack 可处理的模块 | `css-loader`, `ts-loader` |
| **plugins** | 更广泛的能力扩展：优化、资源管理、环境注入 | `HtmlWebpackPlugin` |
| **mode** | 内置优化策略的选择：development / production / none | `'production'` |

**核心公式：**
```
入口文件 → Loaders 转换各种文件类型 → Plugins 介入打包流程 → 输出 Bundle
```

---

### 二、Webpack 的工作流程

```
阶段 1：初始化
  → 读取 webpack.config.js
  → 合并命令行参数和默认配置
  → 实例化 Compiler 对象

阶段 2：编译
  → 从 entry 出发，调用 Loader 处理每个模块
  → 递归解析模块依赖（import / require）
  → 构建完整的依赖图

阶段 3：输出
  → 将依赖图中的模块组合成 Chunk
  → 每个 Chunk 通过模板生成最终的 Bundle 文件
  → 写入 output.path
```

**依赖图 → Chunk → Bundle 的关系：**

```
依赖图（所有模块及其依赖关系）
  │
  ├─ Chunk A（入口 main）
  │    ├── src/index.js
  │    ├── src/App.js
  │    └── node_modules/react/index.js
  │       → 输出 bundle/main.[hash].js
  │
  ├─ Chunk B（动态导入 about）
  │    └── src/pages/About.js
  │       → 输出 bundle/about.[hash].js
  │
  └─ Chunk C（splitChunks 分离 vendor）
       ├── node_modules/react/index.js
       └── node_modules/react-dom/index.js
          → 输出 bundle/vendor.[hash].js
```

---

### 三、Loader 详解

Loader 的本质是一个**转换函数**，接受源文件内容，返回转换后的内容。它在模块加载阶段工作（文件→模块）。

**执行顺序：从右到左（从下到上）**

```javascript
// 执行顺序：sass-loader → css-loader → style-loader
module.exports = {
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
}
```

#### 常用 Loader 一览

| Loader | 作用 | 典型配置 |
|--------|------|---------|
| `css-loader` | 解析 CSS 中的 `@import` 和 `url()` | `{ loader: 'css-loader', options: { modules: true } }` |
| `style-loader` | 将 CSS 以 `<style>` 标签注入 DOM | 开发环境使用，生产用 MiniCssExtractPlugin |
| `sass-loader` | 编译 Sass/SCSS → CSS | 需同时安装 `sass` 包 |
| `babel-loader` | ES6+ / JSX / TS → ES5 | 配合 `@babel/preset-env` 和 `.babelrc` |
| `ts-loader` | TypeScript → JavaScript | 比 Babel 慢但能做类型检查 |
| `file-loader` | 将文件复制到输出目录，返回 URL | Webpack 5 推荐用内置 `asset/resource` |
| `url-loader` | 小文件转 base64，大文件交给 file-loader | Webpack 5 推荐用内置 `asset/inline` |

**Webpack 5 资源模块（Asset Modules）——推荐替代 file-loader / url-loader：**

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset',  // 自动选择 asset/resource 或 asset/inline
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024,  // 8KB 以下内联为 base64
          },
        },
      },
    ],
  },
}
```

---

### 四、Plugin 详解

Plugin 比 Loader 强大得多。它通过**钩子机制**介入 Webpack 编译的**整个生命周期**，能做 Loader 做不了的事：改变输出、注入变量、压缩代码、生成 HTML 等。

#### Webpack 内置插件

| 插件 | 作用 |
|------|------|
| `DefinePlugin` | 编译时替换全局变量 |
| `HotModuleReplacementPlugin` | 热更新 |

#### 常用第三方插件

| 插件 | 作用 |
|------|------|
| `HtmlWebpackPlugin` | 自动生成 HTML 文件，自动注入打包后的 JS/CSS 引用 |
| `MiniCssExtractPlugin` | 将 CSS 提取为独立文件（替代 style-loader 的生产环境方案） |
| `CssMinimizerPlugin` | 压缩 CSS |
| `TerserPlugin` | 压缩 JS（Webpack 5 内置） |
| `CopyWebpackPlugin` | 复制静态文件到输出目录 |
| `BundleAnalyzerPlugin` | 分析打包体积，可视化依赖构成 |

**一份完整的生产环境 Webpack 配置骨架：**

```javascript
// webpack.config.js
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

module.exports = {
  mode: 'production',                          // 启用内置优化
  entry: './src/index.tsx',                    // 入口文件
  output: {
    path: path.resolve(__dirname, 'dist'),      // 打包输出目录
    filename: 'js/[name].[contenthash:8].js',   // JS 文件命名（带内容哈希）
    chunkFilename: 'js/[name].[contenthash:8].chunk.js', // 异步 chunk 命名
    clean: true,                                // 每次构建前清空 dist
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  module: {
    rules: [
      // TypeScript / JSX
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      // CSS
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      // SCSS
      {
        test: /\.scss$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
      },
      // 图片
      {
        test: /\.(png|jpg|gif|svg)$/i,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 8 * 1024 } },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',   // HTML 模板
      title: 'My App',                   // 注入标题
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
    }),
  ],

  optimization: {
    minimizer: [
      new CssMinimizerPlugin(),  // CSS 压缩
      '...',                     // 保留默认的 TerserPlugin（JS 压缩）
    ],
    splitChunks: {
      chunks: 'all',        // 对所有 chunk 生效
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
        },
      },
    },
  },

  devServer: {
    port: 3000,
    hot: true,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
}
```

---

### 五、Rspack：Rust 实现的高性能 Webpack 替代

Rspack 由字节跳动出品，核心用 Rust 编写。目标是：**Webpack 的配置兼容性 + 10 倍以上的构建性能。**

**设计理念：** 开发者无需学习新范式，把 `webpack.config.js` 改为 `rspack.config.js` 即可，配置项几乎一一对应。

**关键架构区别：**

| 层面 | Webpack | Rspack |
|------|---------|--------|
| 核心语言 | JavaScript | Rust |
| 并行策略 | 核心与插件运行模型以 Node.js 为主，可借助特定工具并行 | Rust 核心可并行处理多个阶段，JS 插件仍受 Node.js 运行时影响 |
| 增量编译 | 可配置文件系统缓存 | 支持增量编译与持久化缓存 |
| 运行时开销 | 核心和插件会受到 V8 GC 影响 | Rust 核心不依赖 V8 GC，JS loader/plugin 仍可能受影响 |

---

### 六、Rspack vs Webpack 完整对比

| 对比维度 | Webpack | Rspack |
|----------|---------|--------|
| **构建速度**（冷启动） | 作为迁移前实测基线 | 通常更快，幅度取决于项目、缓存、loader 和插件 |
| **构建速度**（HMR） | 取决于模块图与配置 | 通常更快，需在目标项目测量 P50/P95 |
| **配置兼容性** | Webpack 原生配置 | 高度兼容 Webpack，但 loader/plugin 和边缘选项需逐项验证 |
| **生态成熟度** | 极其成熟，Loader/Plugin 海量 | 快速增长中，常用场景覆盖完整 |
| **自定义 Loader** | JS 编写，生态丰富 | Rust 或 JS 编写，支持 Webpack Loader 兼容模式 |
| **Tree Shaking** | 成熟 | 支持，结果要结合模块格式和副作用标记验证 |
| **代码分割** | 完整支持 | 完整支持 |
| **学习成本** | 较高 | 熟悉 Webpack 可降低成本，但迁移与差异排查仍需学习 |
| **社区/文档** | 极其丰富 | 已有完善中英文文档 |
| **适用场景** | 所有场景 | 大多数场景，少数特殊 Loader 仍需 Webpack |

**决策建议：**

| 场景 | 推荐工具 |
|------|---------|
| 新项目，不需要大量自定义 Webpack Loader | **Rspack** |
| 现有 Webpack 项目，构建速度是瓶颈 | **Rspack**（渐进迁移） |
| 新项目用 React/Vue，有 Vite 可用 | **Vite**（开发体验最好） |
| 深度定制 Webpack Loader，依赖特殊生态插件 | **Webpack** |
| 存量 Webpack 项目，运行良好 | 不需要迁移，按需评估 |

---

### 七、从 Webpack 迁移到 Rspack 的评估

**迁移检查清单：**

1. **Loader 兼容性：** 检查你使用的 Loader 在 Rspack 中是否有替代。`babel-loader` → `builtin:swc-loader`，`ts-loader` → `builtin:swc-loader`，`css-loader` / `style-loader` → 内置支持
2. **Plugin 兼容性：** `HtmlWebpackPlugin` → `builtin:HtmlRspackPlugin`，`MiniCssExtractPlugin` → `builtin:CssExtractRspackPlugin`
3. **Webpack 5 特性：** Asset Modules、Module Federation 在 Rspack 中都支持
4. **配置改动量：** 大部分项目只需要改文件名 + 替换 plugin 引入路径

---

### 八、实战：Rspack 搭建前端项目并对比构建速度

```bash
# 创建项目
npm create rspack@latest my-rspack-app
cd my-rspack-app
npm install
```

**rspack.config.js 完整配置：**

```javascript
// rspack.config.js
const path = require('path')
const rspack = require('@rspack/core')

module.exports = {
  mode: 'production',
  // 入口：单页应用
  entry: {
    main: './src/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash:8].js',
    clean: true,
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },

  module: {
    rules: [
      // TypeScript / JSX —— 使用内置 SWC Loader（比 ts-loader 快数十倍）
      {
        test: /\.tsx?$/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: { parser: { syntax: 'typescript', tsx: true } },
        },
        type: 'javascript/auto',
      },
      // CSS
      {
        test: /\.css$/,
        use: [rspack.CssExtractRspackPlugin.loader, 'css-loader'],
        type: 'javascript/auto',
      },
      // 图片
      {
        test: /\.(png|jpg|gif|svg)$/i,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 8 * 1024 } },
      },
    ],
  },

  plugins: [
    // 生成 HTML
    new rspack.HtmlRspackPlugin({ template: './public/index.html' }),
    // 提取 CSS
    new rspack.CssExtractRspackPlugin({
      filename: 'css/[name].[contenthash:8].css',
    }),
  ],

  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendor',
          chunks: 'all',
        },
      },
    },
  },

  // 开发服务器配置
  devServer: {
    port: 3000,
    hot: true,
    proxy: { '/api': 'http://localhost:8080' },
  },
}
```

**速度对比测试方法：**

```bash
# 用 time 命令分别测量 Webpack 和 Rspack 的构建时间
# Webpack
time npx webpack --mode production

# Rspack（同样项目、同样配置）
time npx rspack build

# 观察输出：Rspack 通常快 5-10 倍
```

---

## 常见问题

### Q1：Loader 和 Plugin 的核心区别是什么？

Loader 是**文件级别**的转换器，在模块加载阶段工作，将非 JS 文件转为 Webpack 可处理的形式。Plugin 是**流程级别**的扩展，能介入编译的全生命周期（开始、生成资源、输出文件等），功能范围远超 Loader。

### Q2：为什么 Rspack 比 Webpack 快那么多？

主要原因是大量构建核心逻辑由 Rust 实现，并能并行处理部分模块图与编译阶段，同时支持增量和持久化缓存。但项目中的 JavaScript loader、plugin、类型检查和 I/O 仍可能成为瓶颈；迁移收益要用相同机器、相同缓存状态和同一产物要求做基准测试。

### Q3：Rspack 能 100% 替代 Webpack 吗？

不能。如果你的项目深度依赖某个 Webpack 特有的 Loader 或 Plugin（尤其是社区小众插件），短期内仍需 Webpack。但主流 React / Vue 项目的迁移覆盖率已经很高。

### Q4：`contenthash`、`chunkhash`、`hash` 有什么区别？

| 哈希类型 | 范围 | 用途 |
|----------|------|------|
| `hash` | 整个构建共享 | 任何文件变化都变，缓存效果最差 |
| `chunkhash` | 按 chunk 计算 | 同一 chunk 的文件共享 |
| `contenthash` | 按文件内容计算 | **推荐**：只在该文件内容变化时才变，缓存最优 |

### Q5：如何查看打包后的文件分析报告？

Webpack: 使用 `webpack-bundle-analyzer` 插件。Rspack: 使用 `@rspack/bundle-analyzer` 插件。两者都会在构建后打开一个可视化页面，显示每个模块的体积占比。

### Q6：Webpack 配置文件类型应该用 `.js` 还是 `.ts`？

都可以。如果项目本身是 TypeScript 项目，用 `.ts` 可以享受类型提示。Webpack 运行时会通过 ts-node 或 tsx 执行；Rspack 原生支持 TypeScript 配置文件。

### Q7：开发环境用 `style-loader`，生产用 `MiniCssExtractPlugin.loader`，怎么一键切换？

```javascript
const isDev = process.env.NODE_ENV === 'development'
const styleLoader = isDev ? 'style-loader' : MiniCssExtractPlugin.loader
// 然后在 rules 中使用 styleLoader
```

---

## 实操作业

### 基础练习：手写 Webpack 配置

新建一个项目，不借助 `create-react-app` 或 `create-rspack`，从零手写一份完整的 `webpack.config.js`，支持 React + TypeScript + SCSS，包含 devServer 代理和 HMR。

### 进阶练习：对比构建速度

创建一个包含 10 个以上页面组件和 3 个以上第三方库的中等规模 React 项目，分别用 Webpack 和 Rspack 构建（生产模式），对比：
- 冷启动构建时间
- HMR 响应时间
- 最终产物体积

将结果整理成表格。

### 挑战练习：渐进式迁移

找一个已有的 Webpack 项目（或其他开源项目），尝试将其迁移到 Rspack。记录迁移过程中遇到的不兼容 Loader/Plugin，并找到对应的 Rspack 替代方案。总结迁移成本评估模板。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L3 里程碑](../../projects/atlas/milestones/L3.md)
- 本课任务：把“Rspack 与 Webpack 对比”接入 Atlas 工程链路，形成可重复命令和失败门禁，并保存一次故意失败与恢复的证据。
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

Webpack 和 Rspack 代表了前端构建工具的两代架构：JS 单线程 vs Rust 多核并行。你需要掌握的核心知识：

1. **Webpack 五大概念**：entry → loaders → plugins → output → mode，这是理解一切构建工具的基础
2. **Loader 是转换器，Plugin 是流程扩展器**，区分两者职责是关键
3. **Rspack 是 Webpack 的 Rust 重构**，配置兼容、速度飞跃，适合作为 Webpack 用户的升级路径
4. **选型三原则**：新项目优先 Vite → 需要 Webpack 生态优先 Rspack → 深度定制保留 Webpack

下一节我们将深入资源处理方案和代码分割策略，把打包产物做得更小更快。

<!-- course-nav:start -->
---

[上一篇：01-Vite 核心原理与配置](./01-Vite-核心原理与配置.md) · [课程地图](../../README.md) · [下一篇：03-资源处理与代码分割](./03-资源处理与代码分割.md)
<!-- course-nav:end -->
