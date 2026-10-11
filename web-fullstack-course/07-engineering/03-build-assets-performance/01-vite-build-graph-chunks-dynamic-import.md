# Vite 8 构建图、Chunk 与动态导入

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | `market-engineering-lab` 已完成安装、双类型检查和 `pnpm quality` |
| 输入 | `index.html`、TypeScript/CSS 模块、一个按交互加载的 report 模块 |
| 输出 | Vite 8 / Rolldown 构建文件清单与动态 chunk 请求证据 |
| 文件 | `vite.config.mjs`、`src/main.ts`、`src/lazy-message.ts`、`src/report.ts` |
| 运行 | `pnpm build`、`pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort` |
| 版本 | Node.js 24.21.0、pnpm 12.10.1、Vite 8.3.0 |
| 边界 | 本地生产预览不是生产部署；构建成功不替代类型、Lint、测试和浏览器行为验收 |

## 1. 任务背景

源码文件数、开发服务器请求和生产资源并不是同一组事实。开发时 Vite 按需提供接近源码形态的模块；生产构建会从 HTML 入口追踪依赖，转换、消除无用代码、拆分 chunk、生成内容相关文件名，再让浏览器加载结果。

邻里集市的统计面板不是首屏必需功能。把它放进动态 `import()` 可以推迟请求，但“代码中出现动态导入”仍不是完成证据：其他静态导入可能让它回到入口，错误的部署路径也可能让点击后 404。本课同时检查产物图和生产预览 Network。

## 2. 学习目标

- 解释 Vite 8 从 `index.html` 发现应用入口并建立模块图的过程。
- 区分源模块、转换后资源、entry chunk、shared chunk 与 dynamic chunk。
- 使用当前 `build.rolldownOptions` 术语，不把已弃用别名当主线配置。
- 说明 tree shaking、内容 hash、构建 target 和 polyfill 的边界。
- 写出有加载、成功和失败状态的动态 `import()`。
- 在生产预览中证明 report chunk 点击前未请求、点击后才请求。

## 3. 预备知识

在读者自己的练习目录执行：

```bash
cd "$HOME/code/market-engineering-lab"
node --version
pnpm --version
pnpm exec vite --version
pnpm quality
```

预期依次观察 Node.js `v24.21.0`、pnpm `12.10.1`、Vite `8.3.0`，且质量门禁退出 0。补丁环境与课程记录不一致时，保存真实输出；不要把推荐值手写成已验证值。

项目应已有 `index.html`、`src/money.ts` 和 `src/style.css`。HTML 中需要：

```html
<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
```

`type="module"` 让浏览器按 ESM 入口处理脚本；Vite 则把 HTML 也视为构建图的一部分。Vite 转译 TypeScript 不会替代 `tsc --noEmit`，所以本课保留 `pnpm quality`。

## 4. 核心理论

### 4.1 从 HTML 入口到输出图

普通单页应用的默认生产入口是项目根的 `index.html`。Vite 读取其中的模块脚本、样式和静态资源引用，再沿静态 `import` 继续追踪：

```text
index.html
  └── src/main.ts                   静态入口
      ├── src/money.ts              静态依赖
      ├── src/style.css             转换后的 CSS 资源
      └── import("./report")        动态边界
          └── src/report.ts         按需 chunk 候选
```

构建图表达“谁依赖谁”，不是文件夹截图。一个源文件可能被合并进另一个 chunk；一个动态模块也可能依赖共享 chunk。反过来，资源内联策略可能让小图片直接进入 CSS/JS，而不是生成独立文件。

开发服务器与生产构建使用同一应用源码，但服务目标不同。开发模式重视快速启动、按需转换和 HMR；生产模式重视可部署资源、压缩和稳定引用。只能在 `vite preview` 中复现的问题，不应拿 `pnpm dev` 的成功覆盖。

### 4.2 Vite 8 与 Rolldown 术语

Vite 8 的生产构建底层使用 Rolldown。需要直接调整底层输入或输出时，当前配置键是：

```js
build: {
  rolldownOptions: {
    output: {},
  },
}
```

`build.rollupOptions` 在当前文档中只是已弃用别名，不再作为新教材入口。Rolldown 与 Rollup 有历史兼容关系，但名字相似不代表所有插件、钩子和选项行为都可未经验证直接迁移。优先使用 Vite 高层配置；只有可观察需求存在时才进入底层选项。

### 4.3 Chunk、hash 与 tree shaking

- **entry chunk**：从 HTML 静态入口可达的 JavaScript。
- **dynamic chunk**：由动态导入形成的延后边界，通常在运行到该表达式时请求。
- **shared chunk**：多个入口或动态边界共同依赖的代码，是否生成由实际图和拆分策略决定。
- **asset**：CSS、图片、字体等构建资源，不必都是 JavaScript chunk。

`[hash]` 使内容变化通常获得新 URL，便于新旧资源并存和长期缓存。它不是密码学身份认证，不证明来源可信，也不会自动设置 HTTP 缓存头。

tree shaking 依赖 ESM 的静态结构和副作用判断，目标是移除不可达导出。它不会删除运行时可能访问的动态代码，也不保证第三方包声明的副作用信息永远正确。判断某段代码是否进入产物，要看构建结果或可审计分析，而不是仅看 `devDependencies` 分类。

### 4.4 动态 `import()` 的真实成本

`import("./report")` 返回 Promise。第一次运行通常需要网络、解析和执行；失败可能来自离线、错误 `base`、旧页面引用已删除 chunk 或资源服务故障。因此交互需要：

1. 可观察的加载状态；
2. 防止重复触发的策略；
3. 明确的失败提示；
4. 恢复路径；
5. 点击后的真实 Network 证据。

拆分不是越多越好。首屏必需的小模块拆开后会增加请求调度和失败点；低频、较大、允许交互后等待的能力更适合作为动态边界。

### 4.5 构建 target 不是 polyfill

`build.target` 决定最终包的浏览器语法转换目标。本课显式使用 `es2022`，表示实验面向已确认的现代浏览器。它与 `tsconfig.compilerOptions.target` 作用层不同：前者约束最终浏览器构建，后者参与 TypeScript 检查/输出语义。

语法转换不会自动创造缺失的运行时 API。旧浏览器没有某个数组方法时，把 `const` 降为旧语法并不能补上该方法。Vite 默认也不为所有 Web API 注入 polyfill；兼容策略必须先定义目标浏览器，再选择特性检测、替代实现或经过验证的 legacy 方案。

## 5. 元素、属性、API 或配置清单

| 命令/API/配置 | 文件或版本 | 作用 | 失败证据或边界 |
| --- | --- | --- | --- |
| `pnpm quality` | `package.json` | 先运行格式、Lint、TS 7/TS 6 检查 | 通过不证明浏览器动态加载成功 |
| `vite build` | Vite 8.3.0 | 从 HTML 入口生成生产资源 | 不自动运行类型检查，除非脚本显式串联 |
| `vite preview` | Vite 8.3.0 | 本地提供 `dist/` | 官方明确不是生产服务器 |
| `index.html` | 项目根 | 应用构建入口 | 脚本路径错误会使模块图无法建立 |
| `import x from "./x"` | ESM | 建立静态依赖 | 进入初始可达图，不形成交互后请求 |
| `import("./report")` | ESM Promise | 建立动态边界 | 加载、解析或执行都可能拒绝 |
| `build.target` | `vite.config.mjs` | 设置最终包语法目标 | 不提供运行时 API polyfill |
| `build.sourcemap` | `vite.config.mjs` | 控制生产 Source Map | 下一课处理发布风险 |
| `build.rolldownOptions` | Vite 8 | 定制底层 Rolldown 构建 | 不应为无证据的手工切包而使用 |
| `entryFileNames` | Rolldown output | 定义入口 chunk 命名 | 文件名不是缓存响应头 |
| `chunkFileNames` | Rolldown output | 定义非入口 chunk 命名 | hash 文本不应写入固定断言 |
| `find dist -type f` | shell | 观察实际文件集 | 只反映当前一次本地构建 |
| Network 面板 | 浏览器 | 观察请求时机、URL 和状态 | 禁用缓存的本地记录不是生产流量 |

## 6. 最小可运行案例

本例只验证“点击后才加载模块”。从实验根创建文件：

```bash
mkdir -p src
```

**完整文件：`src/lazy-message.ts`**

```ts
export function renderLazyMessage(target: HTMLElement): void {
  target.textContent = "按需模块已加载";
}
```

**完整文件：`src/main.ts`**

```ts
const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("missing #app");

const button = document.createElement("button");
const status = document.createElement("p");
button.type = "button";
button.textContent = "加载按需模块";
status.setAttribute("role", "status");

button.addEventListener("click", async () => {
  button.disabled = true;
  status.textContent = "加载中";
  try {
    const { renderLazyMessage } = await import("./lazy-message");
    renderLazyMessage(status);
  } catch (error) {
    console.error("lazy import failed", error);
    status.textContent = "模块加载失败，可以刷新后重试。";
  } finally {
    button.disabled = false;
  }
});

app.replaceChildren(button, status);
```

**完整文件：`vite.config.mjs`**

```js
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    sourcemap: false,
    rolldownOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
```

运行：

```bash
pnpm quality
pnpm build
find dist -type f -print | sort
pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort
```

预期文件清单包含 `dist/index.html`、入口 JavaScript 和名称含 `lazy-message` 的动态 JavaScript；hash 与字节数以实际输出为准。打开 `http://127.0.0.1:4173/`，在 Network 勾选 Disable cache 并重新加载：

1. 点击前清空 Network，再按 JS 类型筛选；不得出现 `lazy-message-*.js` 请求。
2. 点击按钮；应新增该 chunk 的 200 请求，页面显示“按需模块已加载”。
3. 再次点击可能命中浏览器模块缓存，不应把第二次无网络请求误判为代码未执行。
4. 保存请求 URL、Initiator、状态码和观察时间；`Ctrl+C` 停止预览。

这些结果证明本机当前构建的请求时机，不证明 CDN、生产缓存或真实用户网络。

## 7. 邻里集市集成案例

保留配置，使用已有 `src/money.ts` 与 `src/style.css`。教学商品是源码内静态对象，不是外部 JSON；若改为网络响应，入口类型必须保持 `unknown` 并先运行时解析。

**完整文件：`src/report.ts`**

```ts
export function showReport(target: HTMLElement): void {
  const note = document.createElement("p");
  note.textContent = "教学统计：当前展示 1 件可售商品，不包含真实用户数据。";
  target.replaceChildren(note);
}
```

**完整替换：`src/main.ts`**

```ts
import { formatCents } from "./money";
import "./style.css";

type Listing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: "available" | "reserved" | "sold";
  ownerId: string;
  version: number;
  createdAt: string;
};

const listing: Listing = {
  id: "listing-1",
  title: "台灯",
  description: "教学数据，功能正常，自提",
  priceCents: 1990,
  status: "available",
  ownerId: "user-1",
  version: 1,
  createdAt: "2026-10-11T08:00:00.000Z",
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("missing #app");

const title = document.createElement("h2");
const price = document.createElement("p");
const reportButton = document.createElement("button");
const reportTarget = document.createElement("section");

title.textContent = listing.title;
price.textContent = `价格：${formatCents(listing.priceCents)} 元`;
reportButton.type = "button";
reportButton.textContent = "加载教学统计";
reportTarget.setAttribute("aria-live", "polite");

reportButton.addEventListener("click", async () => {
  reportButton.disabled = true;
  reportTarget.textContent = "加载中";
  try {
    const { showReport } = await import("./report");
    showReport(reportTarget);
  } catch (error) {
    console.error("report chunk failed", error);
    reportTarget.textContent = "统计模块加载失败，请检查网络后重试。";
  } finally {
    reportButton.disabled = false;
  }
});

app.replaceChildren(title, price, reportButton, reportTarget);
console.log(`rendered ${listing.id}, createdAt=${listing.createdAt}`);
```

再次执行 `pnpm quality && pnpm build`，记录新的文件清单并在生产预览复验。页面首屏应显示“台灯”和“价格：19.90 元”；点击前没有 report 请求，点击后出现 report chunk 并显示教学统计。`createdAt` 保持 UTC ISO 8601；页面没有借静态商品数据声称后端鉴权或持久化存在。

若另一处添加：

```ts
import { showReport } from "./report";
```

report 可能重新进入静态图，动态边界的预期会改变。以产物和 Network 为准，不按文件名猜测 chunk。

## 8. 常见错误与排查路径

**故意错误：把 report 改为静态导入，却仍宣称点击后才下载。**

```ts
import { showReport } from "./report";

reportButton.addEventListener("click", () => showReport(reportTarget));
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 点击前已没有独立 report 请求或代码进入入口 | `find dist` 无 report chunk，入口体积变化 | 静态 import 让模块首屏可达 | 恢复动态 `import("./report")`，删除其他静态引用 | 重建后点击前无 report 请求，点击后新增请求 |
| 构建报 unresolved import | 终端给出源文件和失败路径 | 相对路径、大小写或导出名错误 | 从当前模块位置核对真实文件与导出 | `pnpm build` 退出 0，并出现目标 chunk |
| 点击后一直“加载中”或报错 | Console Promise 拒绝，Network 404/blocked | chunk 缺失、`base` 错误或网络阻断 | 保留 catch 状态，修复资源路径/发布 | 点击后 200，按钮恢复可用 |
| 低 target 下仍报某 API 不存在 | 目标浏览器运行时异常 | 只转换语法，没有 API polyfill | 定义支持范围，特性检测或选用受控兼容方案 | 在目标浏览器执行真实路径 |
| 只看到 hash 就宣称缓存完成 | Response Headers 无目标策略 | 构建命名不设置服务器缓存头 | 在部署层分别配置 HTML 与 hash 资源 | 生产响应头实测后再报告 |

记录必须同时保留错误构建版本、命令、退出码、URL/状态码和修复后的同一路径结果。仅保存成功截图无法证明门禁发现过错误。

## 9. 课后题

1. **为什么一个源文件不必对应一个 chunk？**<br>
   答：构建器按可达图、动态边界、共享依赖和优化策略组织输出；源文件可以合并、共享或内联。
2. **动态 `import()` 是否保证独立 chunk？**<br>
   答：它表达异步边界，但其他静态引用、配置和优化会影响最终输出，必须检查产物。
3. **`build.target: "es2022"` 能否让旧浏览器拥有所有 ES2022 API？**<br>
   答：不能。target 主要控制语法转换，不自动补齐缺失运行时 API。
4. **hash 是否能证明脚本未被篡改？**<br>
   答：不能。这里的内容 hash 用于命名和缓存寻址，不是来源认证或完整发布链。
5. **为什么要在生产预览看 Network？**<br>
   答：开发服务器的模块形态和请求策略不同，只有构建产物能暴露实际 chunk URL 与延后请求。

## 10. 实践练习

**基础：再增加一个动态帮助模块。**<br>
创建 `src/help.ts`，点击“帮助”后才导入。验收：构建出现对应 chunk；刷新后两个动态 chunk 点击前均未请求，各自点击后才出现。

**进阶：验证 tree shaking。**<br>
创建模块同时导出 `used()` 与无副作用的 `unused()`，入口只静态调用 `used()`。用产物搜索 `UNUSED_TRAINING_MARKER`。验收：质量门禁和行为通过，标记不在构建 JavaScript；记录这只证明当前构建组合。

**故障注入：阻断 report chunk。**<br>
在生产预览 DevTools Request blocking 中阻止 `*report-*.js`，再点击按钮。验收：Network 明确失败，页面出现可恢复错误，按钮重新启用；解除阻断并刷新后成功。不得把 catch 改成虚假“加载完成”。

## 11. 阶段验收

- [ ] 保存 Node、pnpm、Vite 版本与 `pnpm quality` 结果。
- [ ] `pnpm build` 退出 0，`find dist` 记录 HTML、CSS、入口和动态 chunk。
- [ ] 配置使用 `build.rolldownOptions`，没有把弃用别名写成当前推荐。
- [ ] 能画出 `index.html → main.ts → money/style → report` 的构建图。
- [ ] 生产预览点击前没有 report 请求，点击后出现 200 请求和教学统计。
- [ ] 动态加载失败时页面和 Console 都有证据，解除故障后可恢复。
- [ ] 能解释 tree shaking、hash、target 和 polyfill 各自边界。
- [ ] 记录明确写出“本地生产预览不等于生产部署或性能验收”。

## 12. 常见问题

**需要手工拆 vendor chunk 吗？**<br>
本实验不需要。先观察真实缓存、请求和执行问题；无证据手工切包会增加配置和升级成本。

**为什么构建通过但 TypeScript 仍可能错误？**<br>
Vite 会转译 TypeScript 语法，但不承担完整类型检查。本项目让 `quality` 在构建前运行双编译器检查。

**动态模块失败时直接刷新可以吗？**<br>
刷新可作为一种恢复，但必须先显示可理解状态；生产还要处理旧 HTML 引用已删除 chunk 的发布问题，下一课继续分析。

**第二次点击为什么看不到新请求？**<br>
ES 模块已被浏览器加载并缓存。复验首次请求应禁用缓存并重新加载页面，而不是反复点击同一实例。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [Vite：Building for Production](https://vite.dev/guide/build)：HTML 入口、`base`、Rolldown、自定义拆分与动态加载错误。
- [Vite：Build Options](https://vite.dev/config/build-options)：`target`、`sourcemap`、`rolldownOptions` 与构建输出选项。
- [Vite 8 发布说明](https://vite.dev/blog/announcing-vite8)：Vite 8 工具链与 Rolldown 背景。
- [Rolldown：Manual Code Splitting](https://rolldown.rs/in-depth/manual-code-splitting)：底层拆分语义。
- [MDN：动态 import](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/import)：Promise、模块加载与运行边界。

## 我现在能做到什么

我能从 HTML 入口解释 Vite 8 / Rolldown 构建图，用动态 `import()` 建立可恢复的延后边界，并用生产预览 Network 证明真实请求时机。

## 单元导航

[返回章入口](../03-build-assets-performance.md) · [上一课：质量门禁与失败诊断](../02-lint-format-quality/03-quality-gates-failure-diagnostics.md) · [下一课：客户端环境、Source Map、缓存与发布](02-client-env-sourcemaps-cache-release.md)
