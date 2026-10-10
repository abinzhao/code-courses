# Package Exports：从源码契约到可发布产物

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 受 `exports` 约束的 contracts/UI 包、运行时 parser、可发布构建与干净消费者证据 |
| 最小案例 | 工作区源码包只从公共入口消费，错误深导入确定失败 |
| 集成案例 | 在系统临时目录生成 JS、`.d.ts`、CSS 和 tarball，再由独立 Vite 消费者安装 |
| 运行位置 | 第 1 课的 `market-workspace/`；发布演练副本与消费者位于 `/tmp/` |
| 固定工具 | Node.js `24.21.0`、pnpm `12.10.1`、Vite `8.3.0`、TS 7 `7.0.2` |
| 完成时间 | 约 150 分钟 |
| 明确边界 | 本地 pack 不是公共注册表发布；类型、parser 与 exports 都不是身份授权机制 |

价格在领域层保持非负安全整数分，`createdAt` 保持 UTC ISO 8601。网络、文件或消息中的 JSON 必须以 `unknown` 进入运行时 parser。`packages/contracts` 不得包含数据库连接、服务端会话、DOM 构造、框架生命周期、密钥或角色授权决定。

## 1. 任务背景

第 1 课已经让 pnpm 知道“谁依赖谁”，但包仍可能把内部目录暴露给消费者。只要应用写下 `@market/contracts/src/index.ts`，一次内部重命名就会变成跨仓修改；更严重的是，消费者可能绕过经过审查的 parser，直接导入内部辅助函数。

另一类风险是把工作区源码包误当成可发布库。Vite 可以转译链接包中的 `.ts`，不代表普通 Node 消费者也能执行 TypeScript；仓库里的类型文件可见，也不代表 tarball 含有声明；开发目录里能找到 CSS，也不代表发布清单把 CSS 带了出去。

本课用 `exports` 定义公共入口，用运行时 parser 把不可信值变成领域对象，再通过编译、pack 和干净消费验证包脱离源码仓库仍能工作。

## 2. 学习目标

完成本课后，你能够：

1. 用 `exports` 声明包根入口和 CSS 子路径，并解释深导入为什么应失败。
2. 区分 TypeScript 静态类型与运行时值，保持 `unknown → parser → Listing` 边界。
3. 让 contracts 保持环境无关，不依赖 DOM、数据库、会话和密钥。
4. 区分私有源码消费包与编译发布包，列出各自支持的消费者。
5. 为发布包生成 JavaScript、声明文件和必要 CSS，并用 `files` 控制 tarball。
6. 根据实际框架运行时决定 React/Vue peer，而不是向纯 contracts 添加无意义依赖。
7. 在 workspace 之外安装本地 tarball，发现源码共址掩盖的缺失产物和依赖。

## 3. 预备知识

- 已完成[第 1 课](01-pnpm-workspace-dependency-graph.md)，三成员图和根锁文件均正常。
- 理解 ESM 静态导入、`package.json` 的 `type` 和 Vite 的源码转换职责。
- 能区分 `import type` 与保留到运行时的普通 `import`。
- 知道构建成功不替代类型检查、行为测试或授权验证。
- 能在系统临时目录中创建并删除练习副本，不把 tarball 和安装结果写入教材树。

先从 `market-workspace/` 复验：

```bash
pnpm graph:check
pnpm typecheck:all
pnpm build
```

三项都通过后再修改公共契约。若基线已失败，先恢复第 1 课，不把已有错误归因于 exports。

## 4. 核心理论

### 4.1 `exports` 是包的公共入口白名单

下面的清单只公开包根和一个 CSS 子路径：

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./tokens.css": "./src/tokens.css"
  }
}
```

合法消费者写：

```ts
import { parseListing } from "@market/contracts";
import "@market/ui/tokens.css";
```

不合法消费者写：

```ts
import { parseListing } from "@market/contracts/src/index.ts";
```

支持 package exports 的 Node、Vite 和现代解析工具会拒绝未公开子路径。这样包可以重排内部文件，只要公共入口的语义保持兼容，消费者不必跟着目录变化。

`exports` 不是安全访问控制。进入浏览器包的代码仍可被下载；同一机器上有文件权限的人也可能直接读取源码。它约束模块解析契约，不能藏密钥、替代后端授权或阻止恶意用户构造 HTTP 请求。

### 4.2 类型在运行时不存在

下面的写法只告诉 TypeScript“开发者希望它是 Listing”：

```ts
const listing = (await response.json()) as Listing;
```

`as` 不检查 `priceCents` 是否是字符串，也不检查时间是否有效。类型在转译后消失，浏览器得到的仍是原始值。正确数据流是：

```text
response.json()
  → unknown
  → parseListing(unknown)
  → Listing
  → formatCents(Listing.priceCents)
```

parser 与类型放在同一 contracts 包，能让“静态承诺”和“运行时进入承诺的条件”靠近维护，但二者职责仍不同。

### 4.3 Contracts 必须保持环境中立

领域包可以包含：

- Listing、Page 和错误形状等类型。
- 非负安全整数分、UTC ISO 8601、枚举值和分页结构 parser。
- 金额格式化、稳定错误码映射等纯函数。

领域包不应包含：

- 数据库客户端、SQL 连接池和迁移。
- HttpOnly Cookie 会话读取、CSRF 校验或角色查询。
- `document.createElement`、React Hook、Vue composable。
- 服务端密钥、浏览器公开变量或生产端点凭据。

环境中立意味着 Node 测试、浏览器和后端都能消费领域规则；它不意味着三端拥有相同权限。服务端仍必须根据可信会话检查对象授权和事务约束。

### 4.4 私有源码包与发布包是两种承诺

| 维度 | 私有源码消费包 | 编译发布包 |
| --- | --- | --- |
| 典型入口 | `./src/index.ts` | `./dist/index.js` + `./dist/index.d.ts` |
| 消费者 | 已声明支持的 workspace/Vite 工具链 | 满足包声明的外部 Node/打包器/类型工具 |
| `private` | `true`，防止误发布 | 通常省略或 `false`，必须有发布流程 |
| 构建责任 | 应用构建器处理包源码 | 包自己先生成受支持产物 |
| CSS | 可指向源码，但只适合约定工具链 | 必须复制到 tarball 并从 exports 公开 |
| 验证 | workspace 类型检查与应用构建 | tarball 清单、干净安装、运行和构建 |

两种方案都可以合理，关键是明确消费者。内部源码包不应宣称“可直接给任意 Node 使用”；发布包也不能依赖消费者恰好拥有仓库源目录。

### 4.5 发布入口要同时服务运行时和类型工具

编译包常用条件入口：

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

`import` 指向运行时 JavaScript，`types` 指向声明。两者必须描述同一公共 API。只生成 `.d.ts` 会让运行时找不到实现；只生成 `.js` 会让 TypeScript 消费体验退化。CSS 不会由 `tsc` 自动复制，需要单独构建步骤和 tarball 检查。

### 4.6 Peer dependency 表达“由消费者提供的共同运行时”

若一个包真正导出 React 组件，它通常把 React 声明为 peer，并在自己的 devDependencies 中安装用于构建和测试的版本。这样宿主应用与组件库使用同一套 React 运行时，避免重复实例破坏 Hook 或上下文预期。

Vue 组件包同理。纯 CSS、DOM 工厂和 contracts 没有 React/Vue 运行时 import，就不应为了显得完整而同时添加两个 peer。peer 范围是兼容承诺，需要由真实测试支持，不是越宽越好。

### 4.7 干净消费者是发布前的最后一道本地证据

工作区内构建可能从相邻源码、根依赖或缓存中“借到”缺失内容。干净消费者应：

1. 位于 workspace 之外。
2. 只安装打包后的 tarball，不用 `link:` 指向源码。
3. 导入所有公共运行时和 CSS 入口。
4. 完成类型检查、Node 运行和浏览器构建。
5. 尝试一个深导入并观察它被拒绝。

本地 tarball 通过仍不证明公共注册表权限、签名、供应链、所有操作系统和真实生产部署通过；这些要单独授权和验证。

## 5. 元素、属性、API 或配置清单

| 命令、配置或文件 | 示例 | 角色 | 失败时先看 |
| --- | --- | --- | --- |
| `exports["."]` | 源码或 `dist` 入口 | 包根公共 API | 目标文件是否真实存在 |
| `exports["./tokens.css"]` | CSS 子路径 | 允许消费者稳定导入样式 | CSS 是否进入 tarball |
| `exports.types` | `./dist/index.d.ts` | 类型工具公共声明 | 声明是否与 JS 同步 |
| `exports.import` | `./dist/index.js` | ESM 运行时实现 | `type`、扩展名与内部 import |
| `files` | `["dist"]` | 限制 pack 包含的文件 | `tar -tf` 实际清单 |
| `private` | `true` | 防止包被误发布 | 它不提供保密 |
| `workspace:*` | 内部包依赖 | 开发期强制本地成员 | pack 后转换结果 |
| `peerDependencies` | `react: ^19.3.0` | 让宿主提供共同运行时 | 消费者是否安装兼容版本 |
| `peerDependenciesMeta` | `optional: true` | 明确可选 peer | 代码是否真的能在缺失时工作 |
| `declaration` | `true` | 让 tsc 生成 `.d.ts` | `noEmit` 是否已覆盖 |
| `outDir` / `rootDir` | `dist` / `src` | 固定发布目录结构 | 输出是否越界或嵌套 |
| `pnpm pack` | 本地 tarball | 模拟发布包内容 | 包名、版本与文件清单 |
| `tar -tf` | 查看 tarball | 发现缺失/多余文件 | 是否含源码、密钥、缓存 |
| Node.js | `24.21.0` | 验证 ESM 运行时入口 | 包条件和扩展名 |
| TypeScript | TS 7 `7.0.2` | 生成并消费声明 | TS 6 API 工具不是同一入口 |
| Vite | `8.3.0` | 验证浏览器和 CSS 消费 | 它不生成库声明 |

## 6. 最小可运行案例

### 6.1 用运行时 parser 替换静态信任

完整替换 `market-workspace/packages/contracts/src/index.ts`：

```ts
export type ListingStatus = "available" | "reserved" | "sold";

export type Listing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: ListingStatus;
  ownerId: string;
  version: number;
  createdAt: string;
};

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path}: expected object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    throw new TypeError(`${path}: expected text`);
  }
  return value;
}

function safeInteger(value: unknown, path: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${path}: expected safe integer >= ${minimum}`);
  }
  return value;
}

function utcTimestamp(value: unknown): string {
  const source = text(value, "createdAt");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(source)) {
    throw new TypeError("createdAt: expected UTC ISO 8601");
  }
  const milliseconds = Date.parse(source);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError("createdAt: invalid date");
  }
  const normalized = new Date(milliseconds).toISOString();
  const canonicalSource = source.includes(".") ? source : source.replace("Z", ".000Z");
  if (normalized !== canonicalSource) {
    throw new TypeError("createdAt: invalid calendar date");
  }
  return normalized;
}

export function parseListing(value: unknown): Listing {
  const source = record(value, "listing");
  const status = source.status;
  if (status !== "available" && status !== "reserved" && status !== "sold") {
    throw new TypeError("status: expected available, reserved or sold");
  }
  return {
    id: text(source.id, "id"),
    title: text(source.title, "title"),
    description: text(source.description, "description", true),
    priceCents: safeInteger(source.priceCents, "priceCents", 0),
    status,
    ownerId: text(source.ownerId, "ownerId"),
    version: safeInteger(source.version, "version", 1),
    createdAt: utcTimestamp(source.createdAt),
  };
}

export function formatCents(cents: number): string {
  const parsed = safeInteger(cents, "priceCents", 0);
  return `${Math.floor(parsed / 100)}.${String(parsed % 100).padStart(2, "0")}`;
}
```

parser 返回新对象，不把未经检查的原对象直接暴露为 Listing。它验证金额、状态、版本和 UTC 日历时间，但不执行服务端身份认证或对象授权。

### 6.2 让应用从 `unknown` 进入领域

完整替换 `market-workspace/apps/lab-web/src/main.ts`：

```ts
import { parseListing } from "@market/contracts";
import { createListingCard } from "@market/ui";
import "@market/ui/tokens.css";

const rawListings: unknown = [
  {
    id: "listing-1",
    title: "台灯",
    description: "本地静态教学数据，自提",
    priceCents: 1990,
    status: "available",
    ownerId: "user-1",
    version: 1,
    createdAt: "2026-10-11T08:00:00.000Z",
  },
  {
    id: "listing-2",
    title: "免费书籍",
    description: "本地静态教学数据，整套领取",
    priceCents: 0,
    status: "available",
    ownerId: "user-2",
    version: 1,
    createdAt: "2026-10-11T08:30:00.000Z",
  },
];

if (!Array.isArray(rawListings)) throw new TypeError("listings: expected array");
const listings = rawListings.map((value) => parseListing(value));

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("missing #app");
app.replaceChildren(...listings.map((listing) => createListingCard(listing)));
```

此处数据仍是本地静态教学值，但刻意按外部边界的 `unknown` 流程处理。接真实 `response.json()` 时保持相同入口，不增加 `as Listing[]`。

### 6.3 验证公共入口

运行：

```bash
pnpm graph:check
pnpm typecheck:all
pnpm build
```

预期双类型检查和应用构建成功，页面仍显示 `19.90 元` 与 `0.00 元`。

现在故意把 app 的第一行改成：

```ts
import { parseListing } from "@market/contracts/src/index.ts";
```

再次运行：

```bash
pnpm typecheck
pnpm build
```

至少一个解析阶段必须非零退出，错误指向未由 `exports` 公开的子路径。恢复 `@market/contracts` 后复验两项通过。若某个工具意外允许深导入，不能把它当作公共 API；应检查该工具是否尊重 package exports，并保留另外的 Node/打包消费门禁。

### 6.4 运行时错误证据

把第二件商品的 `priceCents` 临时改成字符串 `"0"`。类型检查不会检查 `unknown` 内部字段，但浏览器运行 parser 时必须抛出 `priceCents: expected safe integer >= 0`，页面不能显示伪造的免费价格。恢复数字 `0` 后重新构建和加载，页面显示 `0.00 元`。

这证明静态 unknown 边界和运行时 parser 各自承担不同职责。

## 7. 邻里集市集成案例

本节在系统临时目录制作“可发布变体”，不改教材仓库，也不把 `dist` 或 tarball 留在 `market-workspace` 的正式练习分支。

### 7.1 创建无生成物的临时副本

从 `market-workspace/` 根执行：

```bash
rm -rf /tmp/market-publish-workspace
mkdir -p /tmp/market-publish-workspace
rsync -a --exclude node_modules --exclude dist --exclude pnpm-lock.yaml ./ /tmp/market-publish-workspace/
cd /tmp/market-publish-workspace
```

`rm -rf` 只允许用于这里明确命名、由读者拥有的临时目录；路径不一致时先停止。副本重新安装并生成自己的临时锁文件，不把它与正式 workspace 锁文件混用。

### 7.2 把 contracts 变成编译发布包

完整替换 `/tmp/market-publish-workspace/packages/contracts/package.json`：

```json
{
  "name": "@market/contracts",
  "version": "0.1.0",
  "type": "module",
  "files": ["dist"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json"
  }
}
```

完整文件 `/tmp/market-publish-workspace/packages/contracts/tsconfig.build.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

发布变体不再使用 `private: true`，因此必须通过明确的 pack/publish 流程控制。Source Map 在本地 tarball 中便于教学检查；真实发布前要按源码暴露策略决定是否包含，不能默认公开。

### 7.3 把 UI 变成编译发布包

完整替换 `/tmp/market-publish-workspace/packages/ui/package.json`：

```json
{
  "name": "@market/ui",
  "version": "0.1.0",
  "type": "module",
  "files": ["dist"],
  "sideEffects": ["./dist/tokens.css"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./tokens.css": "./dist/tokens.css"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json && node scripts/copy-css.mjs"
  },
  "dependencies": {
    "@market/contracts": "workspace:*"
  }
}
```

`sideEffects` 保留 CSS 导入的副作用语义，避免消费者优化器把纯样式入口当成可删除代码。它不是“CSS 一定加载”的保证，消费应用仍需显式 import。

完整文件 `/tmp/market-publish-workspace/packages/ui/tsconfig.build.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "noEmit": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"]
}
```

创建目录：

```bash
mkdir -p packages/ui/scripts
```

完整文件 `/tmp/market-publish-workspace/packages/ui/scripts/copy-css.mjs`：

```js
import { copyFile, mkdir } from "node:fs/promises";

const outputDirectory = new URL("../dist/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });
await copyFile(
  new URL("../src/tokens.css", import.meta.url),
  new URL("tokens.css", outputDirectory),
);
console.log("copied tokens.css");
```

### 7.4 构建并检查发布文件

从临时 workspace 根执行：

```bash
pnpm install
pnpm --filter @market/contracts build
pnpm --filter @market/ui build
find packages/contracts/dist packages/ui/dist -type f -print | sort
```

预期至少包含：

```text
packages/contracts/dist/index.d.ts
packages/contracts/dist/index.js
packages/ui/dist/index.d.ts
packages/ui/dist/index.js
packages/ui/dist/tokens.css
```

`.map` 文件是否列出取决于上面的明确配置。缺少 JS、声明或 CSS 中任何一类，都不能进入 pack。

### 7.5 生成并检查 tarball

```bash
rm -rf /tmp/market-package-tarballs
mkdir -p /tmp/market-package-tarballs
pnpm --dir packages/contracts pack --pack-destination /tmp/market-package-tarballs
pnpm --dir packages/ui pack --pack-destination /tmp/market-package-tarballs
tar -tf /tmp/market-package-tarballs/market-contracts-0.1.0.tgz
tar -tf /tmp/market-package-tarballs/market-ui-0.1.0.tgz
```

检查点：

- 两个 tarball 都有 `package/package.json`。
- contracts 含 `dist/index.js` 与 `dist/index.d.ts`。
- UI 含 `dist/index.js`、`dist/index.d.ts` 与 `dist/tokens.css`。
- 不含 `node_modules`、真实 `.env`、密钥、数据库文件或应用源码。
- UI 打包后的清单不再留下无法被外部包管理器理解的悬空源码路径。

### 7.6 建立仓库外干净消费者

```bash
rm -rf /tmp/market-clean-consumer
mkdir -p /tmp/market-clean-consumer/src
cd /tmp/market-clean-consumer
```

完整文件 `/tmp/market-clean-consumer/package.json`：

```json
{
  "name": "market-clean-consumer",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@12.10.1",
  "scripts": {
    "runtime": "node src/runtime.mjs",
    "typecheck": "tsc --noEmit",
    "build": "pnpm typecheck && vite build"
  },
  "dependencies": {
    "@market/contracts": "file:/tmp/market-package-tarballs/market-contracts-0.1.0.tgz",
    "@market/ui": "file:/tmp/market-package-tarballs/market-ui-0.1.0.tgz"
  },
  "devDependencies": {
    "@typescript/native": "npm:typescript@7.0.2",
    "vite": "8.3.0"
  },
  "pnpm": {
    "overrides": {
      "@market/contracts": "file:/tmp/market-package-tarballs/market-contracts-0.1.0.tgz"
    }
  }
}
```

本地 override 让 UI 的已转换版本依赖也解析到待测 contracts tarball，避免把“访问公共注册表”混入本地包内容测试。真正发布后还需在受控环境验证注册表安装。

完整文件 `/tmp/market-clean-consumer/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

完整文件 `/tmp/market-clean-consumer/src/runtime.mjs`：

```js
import { formatCents, parseListing } from "@market/contracts";

const listing = parseListing({
  id: "listing-1",
  title: "台灯",
  description: "tarball 运行时验证",
  priceCents: 1990,
  status: "available",
  ownerId: "user-1",
  version: 1,
  createdAt: "2026-10-11T08:00:00.000Z",
});

console.log(`${listing.title}:${formatCents(listing.priceCents)}`);
```

完整文件 `/tmp/market-clean-consumer/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>干净消费者</title>
  </head>
  <body>
    <main>
      <h1>干净消费者</h1>
      <div id="app"></div>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

完整文件 `/tmp/market-clean-consumer/src/main.ts`：

```ts
import { parseListing } from "@market/contracts";
import { createListingCard } from "@market/ui";
import "@market/ui/tokens.css";

const raw: unknown = {
  id: "listing-2",
  title: "免费书籍",
  description: "tarball 与 CSS 入口验证",
  priceCents: 0,
  status: "available",
  ownerId: "user-2",
  version: 1,
  createdAt: "2026-10-11T08:30:00.000Z",
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("missing #app");
app.replaceChildren(createListingCard(parseListing(raw)));
```

执行：

```bash
pnpm install
pnpm runtime
pnpm typecheck
pnpm build
```

预期 Node 输出 `台灯:19.90`，类型检查与 Vite 构建退出 0，构建产物包含被导入的 CSS。

### 7.7 在干净消费者证明深导入失败

临时把 `src/runtime.mjs` 的导入改成：

```js
import { formatCents } from "@market/contracts/dist/index.js";
```

执行 `pnpm runtime`，预期 Node 报 `ERR_PACKAGE_PATH_NOT_EXPORTED`。恢复根入口并复验输出。即使你猜到了 tarball 内部文件名，未公开子路径仍不是消费者契约。

### 7.8 Peer 决策示例

当前 `@market/ui` 是 DOM 工厂，不导入 React/Vue，因此没有框架 peer。若未来拆出 React 包，清单应类似：

```json
{
  "name": "@market/react-ui",
  "peerDependencies": {
    "react": "^19.3.0"
  },
  "devDependencies": {
    "react": "19.3.0"
  }
}
```

Vue 包按真实支持范围声明 `vue` peer，例如课程基线 `^3.5.43`。不要让一个纯 contracts 包同时 peer React 和 Vue，也不要让组件包把框架打进自己的运行时副本。peer 范围扩大前要分别运行组件测试、应用构建和干净消费。

## 8. 常见错误与排查路径

### 8.1 错误一：消费者深导入内部文件

- **现象**：Node 报 `ERR_PACKAGE_PATH_NOT_EXPORTED`，或 Vite 报 missing specifier。
- **证据**：失败导入包含 `/src/` 或 `/dist/`，而 package `exports` 只公开 `"."`。
- **原因**：消费者依赖了文件布局，而不是包的公共契约。
- **修复**：从 `@market/contracts` 根入口导入；确有稳定子模块需求时由包所有者显式设计 exports。
- **复验**：Node runtime、双类型检查和 Vite build 全部通过；内部目录重命名不要求改消费者。

### 8.2 错误二：用类型断言信任字符串金额

- **现象**：代码能编译，但运行后金额显示错误、产生隐式转换或在格式函数中失败。
- **证据**：数据流中出现 `response.json() as Listing`，原始 `priceCents` 为 `"1990"`。
- **原因**：类型断言没有运行时检查，外部 JSON 从未进入 parser。
- **修复**：保持返回值为 `unknown`，调用 `parseListing`，拒绝字符串金额。
- **复验**：非法输入出现字段级失败，合法 `1990` 和 `0` 分别显示 `19.90` 与 `0.00`。

### 8.3 错误三：发布包漏掉 CSS 或声明

- **现象**：工作区应用成功，干净消费者却报 CSS 子路径不存在或缺少类型声明。
- **证据**：`tar -tf` 没有 `package/dist/tokens.css` 或 `package/dist/index.d.ts`。
- **原因**：`tsc` 不复制 CSS，或 `files`/exports 指向未生成路径。
- **修复**：增加明确复制步骤，核对 `files`、exports 与实际 dist。
- **复验**：重新 pack，tar 清单完整，仓库外类型检查与 Vite 构建成功。

### 8.4 错误四：把 React 放进组件包 dependencies

- **现象**：宿主和库可能安装两套框架运行时，Hook、Context 或实例比较行为异常。
- **证据**：依赖树显示组件库私有 React 副本，而宿主也安装 React。
- **原因**：共同运行时被当成库内部实现依赖。
- **修复**：按真实兼容范围改为 peer，并在库 devDependencies 保留测试版本。
- **复验**：干净消费者只有预期框架实例，组件测试和宿主构建均通过。

### 8.5 错误分类表

| 失败阶段 | 典型证据 | 优先检查 |
| --- | --- | --- |
| workspace 安装 | `WORKSPACE_PKG_NOT_FOUND` | 成员名、`workspace:*`、workspace YAML |
| 类型解析 | 找不到声明或导出 | `exports.types`、`.d.ts`、moduleResolution |
| Node 运行 | `PACKAGE_PATH_NOT_EXPORTED` / 模块不存在 | `exports.import`、扩展名、dist |
| Vite 构建 | CSS 子路径或 bare import 失败 | CSS 是否 pack、dependencies 是否完整 |
| parser 运行 | 字段级 TypeError | 原始 unknown、字段值域、错误是否被吞掉 |
| peer 安装 | peer 警告或不兼容 | 宿主版本、peer 范围、重复实例 |

## 9. 课后题

**1. `exports` 是否能阻止用户读取浏览器里的 parser 源码？**

参考答案：不能。exports 约束模块解析公共入口，不是保密或授权边界。进入浏览器的代码可以被下载分析。

**2. 为什么 `Listing` 类型和 `parseListing` 都要保留？**

参考答案：类型帮助受控源码静态协作，parser 检查运行时不可信值。删除任何一项都会丢失一个独立证据层。

**3. 为什么发布包需要干净消费者，而不是只运行包自己的构建？**

参考答案：包内构建可能看到相邻源码、根依赖和未打包文件。干净消费者验证 tarball 的真实入口、依赖、声明与 CSS。

**4. peer 是否应该写成 `*` 以减少安装冲突？**

参考答案：不应该无证据扩大。peer 是兼容承诺，范围必须由实际构建和行为测试支持。

**5. 共享 parser 是否意味着后端无需再次授权？**

参考答案：不是。parser 只验证数据形状和值域；服务端仍要从可信会话判断身份、对象所有权、角色和事务状态。

## 10. 实践练习

### 基础：新增公开状态标签函数

在 contracts 根入口增加 `listingStatusLabel(status)`，只接受 ListingStatus，返回稳定中文标签。应用从根入口调用。

验收标准：

- 没有新增深导入。
- 三个状态都有确定输出。
- 函数不读取 DOM、会话或全局语言状态。
- 工作区双类型检查和应用构建通过。

### 进阶：检查 tarball 契约

为两个 tarball 保存一份人工审查记录，至少列出：

- package.json。
- JavaScript 运行时入口。
- `.d.ts` 类型入口。
- UI CSS 入口。
- 不应出现的密钥、`.env`、`node_modules` 和应用源码。

验收标准：记录来自 `tar -tf` 实际输出，不是从源目录猜测；发现缺项后重新 build/pack 并复验。

### 故障注入：删除 CSS 复制步骤

临时从 UI build 脚本删除 `copy-css.mjs`，清空 UI dist 后重新 build、pack 和消费。

确定性验收：

1. `tar -tf` 明确缺少 tokens.css。
2. 干净消费者构建非零退出。
3. 五段记录写清现象、证据、原因、修复、复验。
4. 恢复复制步骤后，tar 清单和消费者构建重新通过。

## 11. 阶段验收

### 工作区源码包

```bash
cd market-workspace
pnpm graph:check
pnpm typecheck
pnpm typecheck:compat
pnpm typecheck:all
pnpm build
```

### 临时发布副本

```bash
cd /tmp/market-publish-workspace
pnpm --filter @market/contracts build
pnpm --filter @market/ui build
find packages/contracts/dist packages/ui/dist -type f -print | sort
```

### 干净消费者

```bash
cd /tmp/market-clean-consumer
pnpm runtime
pnpm typecheck
pnpm build
```

通过标准：

- 应用和 UI 的 imports 与各自 dependencies 一致。
- 正常导入只经过 package exports，深导入在干净消费者中确定失败。
- 外部形态数据保持 `unknown`，parser 拒绝字符串金额和非法 UTC 时间。
- 源码包只承诺已声明的 workspace/Vite 消费；发布包提供 JS、声明和 CSS。
- `tar -tf` 与仓库外安装证明产物完整，没有依赖相邻源码。
- React/Vue peer 决策基于真实 runtime import，contracts 没有框架 peer。
- 页面或 Node 输出包含 `19.90` 和 `0.00`。
- 文档明确说明本地 pack 没有验证公共注册表、签名、生产部署、认证、授权或事务。

完成后可删除本课临时目录：

```bash
rm -rf /tmp/market-publish-workspace
rm -rf /tmp/market-package-tarballs
rm -rf /tmp/market-clean-consumer
```

删除前逐字核对路径；不要把该命令替换成更宽的通配目录。

## 12. 常见问题

**内部包一定要编译后再给同仓应用使用吗？**

不一定。已声明支持的 Vite workspace 可以消费私有 TS 源码包。关键是明确工具链和边界，不能把这种便利冒充通用发布能力。

**可以在 `exports` 中公开整个 `./src/*` 吗？**

技术上能配置通配入口，但这会把内部布局变成长期契约。只公开有稳定语义和真实消费者的入口。

**为什么 `paths` 已经找到类型，Node 仍然报错？**

`paths` 不安装包，也不重写 Node 的运行时解析。Node 读取清单、exports 和真实文件；两层必须分别成立。

**CSS 为什么需要 `sideEffects`？**

CSS import 的价值就是产生样式副作用。包若声明整体无副作用，优化器可能误删未被 JavaScript 值引用的样式。仍需在目标构建器中验证实际结果。

**本地 tarball 安装成功，是否可以直接执行 `pnpm publish`？**

不可以。发布是外部写操作，需要包名权限、版本策略、注册表、供应链和回滚方案，并取得明确授权。本课只做本地 pack。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Node.js Packages: Package Entry Points](https://nodejs.org/api/packages.html#package-entry-points)：`exports`、条件入口和封装边界。
- [pnpm Workspace Protocol](https://pnpm.io/workspaces#workspace-protocol-workspace)：本地成员约束与 pack/publish 转换。
- [pnpm pack](https://pnpm.io/cli/pack)：生成 tarball 和检查发布内容。
- [TypeScript Publishing Declaration Files](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html)：声明入口与发布包。
- [TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)：`exports` 与模块解析。
- [npm package.json: peerDependencies](https://docs.npmjs.com/cli/configuring-npm/package-json#peerdependencies)：共同宿主运行时契约。
- [Vite Library Mode](https://vite.dev/guide/build.html#library-mode)：需要更复杂库构建时的官方入口。

## 我现在能做到什么

我能用 `exports` 把包内部目录与公共契约分开，让外部值经过运行时 parser 后才进入 Listing；我能区分工作区源码包与可发布包，生成 JS、声明和 CSS，并用仓库外干净消费者验证 tarball，而不会把类型、exports、peer 或本地 pack 误写成授权与生产发布证明。

## 单元导航

[章节 hub](../04-workspace-component-library.md) · [上一单元：pnpm Workspace 与依赖图](01-pnpm-workspace-dependency-graph.md) · [下一单元：语义 Design Tokens 与跨框架边界](03-design-tokens-cross-framework-boundaries.md) · [工程化卷目录](../README.md)
