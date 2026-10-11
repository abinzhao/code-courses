# Vite、ESM、开发构建与预览：读懂模块图的三种证据

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 用浏览器 ESM 与 Vite 8 建立可开发、可构建、可预览的邻里集市列表页 |
| 前置 | 已完成上一课的清单、锁文件与冻结安装 |
| 建议投入 | 3 小时学习与实现，45 分钟 Network 和故障实验 |
| 主要产物 | `index.html`、`vite.config.mjs`、TypeScript 模块图、CSS 与 `dist/` |
| 成功证据 | 开发页、生产构建、生产预览分别有独立命令和观察记录 |
| 失败证据 | 不可解析 import 令构建非零退出，并给出源文件与请求路径 |
| 环境边界 | 页面使用本地静态教学数据；preview 不是生产服务器 |

本课继续使用读者自己的 `$HOME/code/market-engineering-lab`。上一课生成的
`package.json` 与 `pnpm-lock.yaml` 保持不变。所有 `dist/`、开发服务和预览服务都只属于练习目录，
不得放入教材仓库。

## 1. 任务背景

同一份源码在开发服务中能打开，不代表生产构建一定成功；构建成功，也不代表用户通过生产路径能加载资源。
Vite 把这三个阶段分开：

```text
dev：按需转换源码，面向快速开发
build：从 HTML 入口追踪图并输出优化产物
preview：用本地服务器加载已经生成的产物
```

如果只记录“页面能开”，就无法判断观察来自开发源码还是生产产物。工程证据必须包含命令、URL、资源路径、
终端状态和浏览器行为。

## 2. 学习目标

完成本课后，你应能：

- 区分浏览器 ESM 与 Node 包 ESM；
- 解释 Vite 为什么把 `index.html` 作为入口；
- 从静态 import、动态 import 和 CSS import 画出源模块图；
- 区分开发服务器、Vite 8/Rolldown 生产构建与 production preview；
- 配置开发和预览的固定端口及 `strictPort`；
- 解释 `base` 如何影响构建后的资源 URL；
- 判断 Vite 的模块解析便利不能自动推广到原生 Node 或浏览器；
- 使用构建日志和浏览器 Network 定位不可解析 import；
- 在页面中正确展示整数分 `19.90`、`0.00` 和 UTC 时间；
- 说明 Vite 转译 TypeScript 不等于执行类型检查。

## 3. 预备知识

进入练习根并确认上一课证据：

```bash
cd "$HOME/code/market-engineering-lab"
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm exec vite --version
```

预期 Node 为 `v24.21.0`、pnpm 为 `12.11.2`、Vite 为 `8.3.4`。如果 `package.json`
不存在，先修复当前目录，不要在父目录创建第二份清单。

本课假设你理解 `import`、`export` 和 DOM 基础。TypeScript 文件由 Vite 转换后送给浏览器；
静态类型关系会在下一课通过两个编译器独立检查。

## 4. 核心理论

### 4.1 浏览器 ESM 与 Node 包 ESM

浏览器通过 URL 加载模块：

```html
<script type="module" src="/src/main.ts"></script>
```

浏览器原生只理解它支持的 JavaScript 和资源 URL，并不原生执行 TypeScript。开发时，浏览器向 Vite
请求 `/src/main.ts`，Vite 转换类型语法与 import 后返回可执行模块。

Node 包 ESM 由包边界、`package.json` 的 `"type": "module"`、文件扩展名和 Node 解析规则决定：

```js
import { listing } from "./listing.js";
```

上一课的 Node 文件写出 `.js` 扩展名。本课浏览器源码中可以写 `./money`，是因为 Vite 的模块解析器能找到
`money.ts`。不能据此声称 Node、浏览器直连静态服务器和所有测试工具都允许省略扩展名。

### 4.2 HTML 是 Vite 的应用入口

Vite 读取 `index.html` 中的模块脚本和资源，再从入口递归追踪 import：

```text
index.html
  └── /src/main.ts
      ├── ./listings.ts
      ├── ./render-listing.ts
      │   └── ./money.ts
      └── ./style.css
```

HTML 不只是复制到输出的静态附件。Vite 会转换入口引用、处理资源并为生产产物生成最终 URL。
构建后手工把 HTML 改回 `/src/main.ts` 会绕开产物图，不能作为发布方案。

### 4.3 开发服务器建立按需源图

`vite` 启动开发服务器后，浏览器请求哪个模块，Vite 就转换并提供哪个模块。源码编辑会触发 HMR 或页面更新。
此时 Network 中通常能看到多个源码路径；这些请求形态和生产 chunk 不同。

开发服务的目标是反馈速度。它不证明生产压缩、hash、`base`、缓存或懒加载路径正确，也不提供真实认证、
TLS、生产日志和容量治理。

### 4.4 Vite 8 构建使用 Rolldown 术语

Vite 8 当前主线以 Rolldown 组织生产构建。需要底层构建输出选项时使用
`build.rolldownOptions`。本课程只使用当前配置合同；外部资料出现不同字段时，先核对目标 Vite
版本和官方配置页，不把字段名直接复制进项目。

构建会：

1. 从 HTML 和模块 import 建立生产图；
2. 转换 TypeScript 语法与目标语法；
3. 处理 CSS 和静态资源；
4. 分析可删除代码并生成 chunk；
5. 写入内容相关 hash 的产物名；
6. 把 HTML 引用改为最终资源 URL。

构建器能删除类型语法，但不会替 `tsc` 完成完整类型诊断。错误类型可能仍被转换为 JavaScript，所以
下一课必须保留独立 `typecheck`。

### 4.5 preview 验证产物，不等于部署

`vite preview` 读取 `dist/`。它适合确认 HTML、资源路径和浏览器行为，但不是生产服务器：

- 没有证明 CDN 缓存头；
- 没有证明 TLS、域名和反向代理；
- 没有证明真实后端认证、授权或事务；
- 没有证明生产 Source Map 策略；
- 没有证明回滚与旧资源保留。

因此应称它“本地生产产物预览”，不能写成“生产已上线”。

### 4.6 CSS import 是构建图的一部分

在 TypeScript 中：

```ts
import "./style.css";
```

这不是 Node 原生 ESM 的 CSS 能力，而是 Vite 识别并处理的资源依赖。开发阶段它被注入页面；生产构建会生成
CSS 资源并更新 HTML。若把同一入口直接交给 Node，Node 不会因为 `"type": "module"` 自动理解 CSS。

### 4.7 `base`、端口和模块 URL

`base: "/"` 表示应用按站点根路径构建。若真实发布在 `/market/`，应使用与部署挂载一致的
`base: "/market/"`。错误 `base` 的常见证据是 HTML 能返回，但 JS 或 CSS 请求 `404`。

`strictPort: true` 让约定端口被占用时明确失败。若工具自动跳到其他端口，测试或同伴可能仍访问旧 URL，
得到难以解释的页面。

## 5. 元素、属性、API 或配置清单

| 项目 | 本课值 | 作用与边界 |
| --- | --- | --- |
| Vite | `8.3.4` | 开发、构建和本地预览 |
| HTML 入口 | `index.html` | 生产图入口，不是普通复制文件 |
| `<script type="module">` | `/src/main.ts` | 浏览器模块入口，由 Vite 转换 TS |
| `import` / `export` | 静态模块边 | 帮助工具分析依赖，不自动验证业务 |
| CSS import | `import "./style.css"` | Vite 资源图能力，不是 Node 原生 CSS ESM |
| `server.host` | `127.0.0.1` | 只监听本机回环地址 |
| `server.port` | `5173` | 固定开发端口 |
| `preview.port` | `4173` | 固定生产预览端口 |
| `strictPort` | `true` | 端口冲突时非零失败 |
| `base` | `/` | 构建资源基准路径，需匹配部署挂载 |
| `build.target` | `es2022` | 构建语法目标，不自动提供所有运行时 API |
| `build.sourcemap` | `false` | 本课不生成生产 map，不构成秘密保护 |
| `build.rolldownOptions` | 输出命名 | Vite 8 当前底层构建配置术语 |
| `pnpm dev` | `vite --host 127.0.0.1` | 开发源码图 |
| `pnpm build` | `vite build` | 生成 `dist/`；本课尚未加入类型门禁 |
| `pnpm preview` | `vite preview --host 127.0.0.1` | 加载现有生产产物 |

## 6. 最小可运行案例

本节先建立三节点 ESM 图，观察 import 的加载关系，再在第 7 节替换为完整邻里集市页面。

### 6.1 创建文件

```bash
cd "$HOME/code/market-engineering-lab"
mkdir -p src/minimal
touch index.html src/minimal/message.ts src/main.ts vite.config.mjs
```

完整文件 `index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ESM 最小图</title>
  </head>
  <body>
    <main>
      <h1>ESM 最小图</h1>
      <p id="output">等待模块</p>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

完整文件 `src/minimal/message.ts`：

```ts
export const message = "HTML → main.ts → message.ts";
```

完整文件 `src/main.ts`：

```ts
import { message } from "./minimal/message";

const output = document.querySelector<HTMLParagraphElement>("#output");
if (!output) {
  throw new Error("missing #output");
}
output.textContent = message;
console.log(message);
```

完整文件 `vite.config.mjs`：

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

### 6.2 启动与观察

```bash
pnpm dev
```

预期终端给出 `http://127.0.0.1:5173/`。浏览器页面和控制台都显示：

```text
HTML → main.ts → message.ts
```

在 DevTools Network 中按路径筛选 `main` 与 `message`，应观察到入口和被导入模块。完成后在终端
按 `Ctrl+C` 停止服务。

### 6.3 最小构建

```bash
pnpm build
find dist -type f -print | sort
```

预期命令退出 `0`，文件列表至少包含：

```text
dist/index.html
dist/assets/index-<内容哈希>.js
```

`<内容哈希>` 表示每次构建依据内容生成的文件名组成，不要求抄写某个固定 hash。准确证据应保存本机实际
`find` 输出。

## 7. 邻里集市集成案例

现在保留同一个 HTML 入口和配置，把最小图逐步扩展为模块化商品列表。旧的 `src/minimal/` 可保留用于比较，
但不再由入口导入。

### 7.1 创建集成文件

```bash
cd "$HOME/code/market-engineering-lab"
touch src/money.ts src/listings.ts src/render-listing.ts src/style.css
```

完整替换 `index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>邻里集市工程实验</title>
  </head>
  <body>
    <main>
      <p class="eyebrow">本地静态教学数据</p>
      <h1>邻里集市</h1>
      <p id="status" role="status" aria-live="polite">正在加载模块</p>
      <ul id="listings"></ul>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

完整文件 `src/money.ts`：

```ts
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("expected non-negative safe integer cents");
  }
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}
```

完整文件 `src/listings.ts`：

```ts
export type Listing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: "available" | "reserved" | "sold";
  ownerId: string;
  version: number;
  createdAt: string;
};

export const listings: readonly Listing[] = [
  {
    id: "listing-1",
    title: "台灯",
    description: "功能正常，自提",
    priceCents: 1990,
    status: "available",
    ownerId: "user-1",
    version: 1,
    createdAt: "2026-10-11T08:00:00.000Z",
  },
  {
    id: "listing-2",
    title: "旧书",
    description: "社区共享，免费领取",
    priceCents: 0,
    status: "available",
    ownerId: "user-2",
    version: 1,
    createdAt: "2026-10-11T08:30:00.000Z",
  },
];
```

完整文件 `src/render-listing.ts`：

```ts
import { formatCents } from "./money";
import type { Listing } from "./listings";

export function renderListing(listing: Listing): HTMLLIElement {
  const row = document.createElement("li");
  const title = document.createElement("h2");
  const description = document.createElement("p");
  const price = document.createElement("p");
  const time = document.createElement("time");

  title.textContent = listing.title;
  description.textContent = listing.description;
  price.textContent = `${formatCents(listing.priceCents)} 元`;
  time.dateTime = listing.createdAt;
  time.textContent = listing.createdAt;
  row.append(title, description, price, time);
  return row;
}
```

完整替换 `src/main.ts`：

```ts
import { listings } from "./listings";
import { renderListing } from "./render-listing";
import "./style.css";

const status = document.querySelector<HTMLParagraphElement>("#status");
const list = document.querySelector<HTMLUListElement>("#listings");
if (!status || !list) {
  throw new Error("missing application root");
}

list.replaceChildren(...listings.map((listing) => renderListing(listing)));
status.textContent = `已加载 ${listings.length} 件本地静态教学商品`;
console.log(`rendered listings=${listings.length}`);
```

完整文件 `src/style.css`：

```css
:root {
  color-scheme: light;
  font-family: system-ui, sans-serif;
  color: #172126;
  background: #f3f6f7;
}

body {
  margin: 0;
}

main {
  max-width: 48rem;
  margin: 3rem auto;
  padding: 1.5rem;
}

.eyebrow {
  color: #475b65;
  font-weight: 700;
}

#listings {
  display: grid;
  gap: 1rem;
  padding: 0;
  list-style: none;
}

#listings li {
  padding: 1rem;
  border: 1px solid #b8c6cc;
  border-radius: 0.75rem;
  background: #ffffff;
}
```

### 7.2 分别取得 dev、build、preview 证据

开发证据：

```bash
pnpm dev
```

浏览器打开 `http://127.0.0.1:5173/`，预期看到：

```text
台灯
19.90 元
旧书
0.00 元
```

控制台应输出 `rendered listings=2`。Network 可观察 TypeScript 与 CSS 的开发请求。停止开发服务后构建：

```bash
pnpm build
find dist -type f -print | sort
```

预期退出 `0`，`dist/index.html`、带 hash 的 JavaScript 和 CSS 只出现在练习目录。

生产预览证据：

```bash
pnpm preview
```

打开 `http://127.0.0.1:4173/`，重复检查 `19.90`、`0.00` 与控制台日志。Network 应请求
`/assets/` 下的生产产物，而不是 `/src/main.ts`。完成后 `Ctrl+C` 停止预览。

| 阶段 | 必须记录 | 不能扩大解释 |
| --- | --- | --- |
| dev | `5173`、源码模块请求、HMR 行为 | 生产资源和缓存已正确 |
| build | 命令退出码、`dist` 文件清单 | 类型、Lint 和浏览器行为已通过 |
| preview | `4173`、hash 资源请求、页面行为 | TLS、CDN、认证和生产发布已验证 |

## 8. 常见错误与排查路径

### 8.1 明确错误案例：不可解析 import

临时把 `src/render-listing.ts` 第一行改为：

```ts
import { formatCents } from "./money-missing";
```

执行：

```bash
pnpm build
echo "exit=$?"
```

预期构建非零退出，并出现 `Could not resolve "./money-missing"` 或等价的 unresolved import 证据。

| 记录项 | 本次证据 |
| --- | --- |
| 现象 | 页面构建停止，没有可信的新产物 |
| 证据 | 构建日志指向 `src/render-listing.ts` 与 `./money-missing`，退出码非零 |
| 原因 | import 指向不存在的模块，模块图无法闭合 |
| 修复 | 恢复为 `import { formatCents } from "./money";` |
| 复验 | `pnpm build` 退出 `0`，preview 再次显示 `19.90` 与 `0.00` |

不要通过创建一个空 `money-missing.ts` 掩盖错误职责，也不要删除价格展示断言。

### 8.2 常见证据表

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| dev 自动换了端口 | 启动日志与约定 URL 不同 | 未启用 `strictPort` 或端口被占用 | 保留严格端口，停止未知进程或选择并记录新契约 | 访问唯一约定 URL |
| preview 资源 404 | Network 中 `/assets/` 请求路径与状态码 | `base` 与部署挂载不一致 | 让 `base`、入口 URL 与服务器目录一致 | 刷新并确认所有资源 200 |
| Node 直接运行入口时报 CSS/TS 错误 | Node 堆栈指向扩展名或 CSS | 把 Vite 能力误当 Node 原生能力 | 通过 Vite 运行浏览器入口 | dev/build/preview 分别成功 |
| 页面仍是旧内容 | URL、Network、服务端口 | 浏览器访问了旧 dev 或旧 preview | 停止全部本课服务，按目标阶段重启 | 资源路径与阶段匹配 |
| build 成功但类型错误未报告 | 脚本只有 `vite build` | Vite 转译没有执行完整类型检查 | 下一课加入双编译器门禁 | 故障类型被 `typecheck` 拦截 |

## 9. 课后题

**问题 1：为什么 `index.html` 是构建入口，不只是复制文件？**

参考答案：Vite 从其中的模块脚本和资源引用进入模块图，并在生产构建时改写到最终带 hash 的产物 URL。

**问题 2：开发 Network 中看到 `/src/main.ts`，生产 preview 也应该看到它吗？**

参考答案：不应该。preview 加载 `dist`，应看到构建后的 `/assets/` 文件；看到源码路径通常说明访问了开发服务。

**问题 3：`base` 能否解决后端授权？**

参考答案：不能。它只影响资源 URL 基准；认证、对象授权和事务由真实后端实现。

**问题 4：为什么 build 成功不能替代类型检查？**

参考答案：Vite 的职责是转换和打包，可能移除 TS 类型语法后继续输出；完整类型关系由独立编译器门禁检查。

## 10. 实践练习

### 基础练习：增加第三个 ESM 节点

创建 `src/status-label.ts` 导出状态中文文本，并让 `render-listing.ts` 通过 import 使用。

验收标准：

- 不在 `main.ts` 复制状态映射；
- dev 页面出现“可预约”；
- build 成功；
- Network 或构建图能证明新模块进入依赖关系。

### 进阶练习：根路径与子路径构建对照

先保存 `base: "/"` 的 `dist/index.html` 资源 URL，再临时改为 `base: "/market/"` 构建并比较。

答案标准：

- 指出 HTML 中资源 URL 的变化；
- 不手改 `dist/index.html`；
- 恢复根路径配置后重新构建；
- 不把本地对照写成生产子路径已部署。

### 故障注入练习：占用严格端口

在第一终端运行一个读者自有临时服务：

```bash
node -e 'require("node:http").createServer((request, response) => response.end("occupied")).listen(5173, "127.0.0.1")'
```

在第二终端运行 `pnpm dev`。预期 Vite 明确报告端口占用并非零退出，而不是跳到未知端口。回到第一终端
按 `Ctrl+C`，再启动 Vite。

验收标准：

- 保存端口失败日志；
- 停止临时服务；
- dev 恢复到 `127.0.0.1:5173`；
- 没有把 `strictPort` 改成 `false` 制造通过。

## 11. 阶段验收

执行并记录：

```bash
cd "$HOME/code/market-engineering-lab"
pnpm install --frozen-lockfile
pnpm exec vite --version
pnpm build
find dist -type f -print | sort
pnpm preview
```

验收标准：

- Vite 版本为 `8.3.4`；
- 源图至少含 HTML、四个 TypeScript 模块和 CSS；
- 开发页在 `5173` 显示 `19.90` 与 `0.00`；
- build 退出 `0`，产物文件只在练习的 `dist/`；
- preview 在 `4173` 加载 `/assets/` 生产资源并显示相同行为；
- unresolved import 故障确实失败，修复后 build 与 preview 恢复；
- 能说出 dev、build、preview 每项证据和未验证边界。

## 12. 常见问题

**可以直接双击 `index.html` 吗？**

不作为本课运行方式。文件 URL、模块请求、TypeScript 转换和资源路径都与 HTTP 服务不同。

**为什么相对 import 有时需要扩展名，有时不需要？**

解析器不同。Node 原生 ESM、浏览器 URL 与 Vite bundler 模式拥有不同规则；应按实际执行环境配置和验证。

**preview 能替代 Nginx 或 CDN 吗？**

不能。它只用于本地检查生产产物，不证明缓存头、TLS、容量与回滚。

**CSS import 会进入 JavaScript 吗？**

它进入构建依赖图；开发和生产处理方式可能不同，生产通常生成独立 CSS 资源，最终以实际产物为证据。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Vite Getting Started](https://vite.dev/guide/)：HTML 入口、开发服务与基础命令。
- [Vite Features](https://vite.dev/guide/features.html)：TypeScript、CSS 与资源处理。
- [Vite Building for Production](https://vite.dev/guide/build.html)：生产构建和多页入口。
- [Vite Shared Options](https://vite.dev/config/shared-options.html)：`base` 等共享配置。
- [Vite Server Options](https://vite.dev/config/server-options.html)：端口与 `strictPort`。
- [Vite Build Options](https://vite.dev/config/build-options.html)：Vite 8 构建配置。
- [MDN JavaScript modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)：浏览器 ESM 机制。

## 我现在能做到什么

我能从 HTML 入口追踪 ESM 与 CSS 模块图，分别取得开发、Vite 8/Rolldown 构建和生产预览证据，
并用端口、资源 URL 与构建日志定位 unresolved import，而不会把 preview 误报成生产部署。

## 单元导航

[返回章目录](../README.md#01-pnpmvite-与-esm) ·
[上一课：Node、pnpm、清单与锁文件](01-node-pnpm-manifests-lockfiles.md) ·
[下一课：TS 7 / TS 6 并行类型检查](03-ts7-ts6-parallel-typecheck.md)
