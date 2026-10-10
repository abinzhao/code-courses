# pnpm Workspace：把目录组织成可检查的依赖图

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个包含 `apps/lab-web`、`packages/contracts`、`packages/ui` 的 pnpm workspace |
| 核心证据 | 唯一根锁文件、成员列表、`workspace:*` 链接、按包名过滤结果、无环方向检查 |
| 运行位置 | 读者自己的 `market-workspace/`，不在教材仓库内安装 |
| 固定工具 | Node.js `24.21.0`、pnpm `12.10.1`、Vite `8.3.0`、TS 7 `7.0.2`、TS 6 兼容包装包 `6.0.2` |
| 完成时间 | 约 120 分钟 |
| 明确边界 | 本地静态教学数据；没有真实登录、对象授权、数据库事务或生产发布 |

本课把价格 `1990` 和 `0` 保持为非负安全整数分，只在界面显示为 `19.90` 和 `0.00`。workspace 能表达安装关系，不能授予用户权限；共享 TypeScript 类型也不能把外部 JSON 自动变成可信数据。

## 1. 任务背景

当 `apps/lab-web`、`packages/contracts` 与 `packages/ui` 只是三个文件夹时，工具并不知道它们是不是同一个安装边界，也不知道谁可以依赖谁。开发者可能用很长的相对路径导入源码，或者把所有依赖都装在根目录，让本机“碰巧能找到”。一旦进入干净机器、独立构建或发布包，隐含关系就会暴露。

pnpm workspace 解决的是多包的成员发现、统一安装和本地链接问题。它不是业务架构生成器：错误方向、循环依赖、浏览器导入数据库代码等问题，仍要由包职责和门禁阻止。本课先建立真实依赖图，再通过故障注入证明清单不是装饰。

## 2. 学习目标

完成本课后，你能够：

1. 区分根清单、成员清单、`pnpm-workspace.yaml`、根锁文件与各包安装结果。
2. 使用 `workspace:*` 强制依赖解析到本地成员，而不是同名远端包。
3. 用包名而不是文件夹名执行 `--filter`，并解释 `包...` 与 `...包` 的方向。
4. 让应用依赖 UI 和 contracts，让 UI 只依赖 contracts，阻止共享包反向读取应用。
5. 用确定性脚本拒绝成员缺失、必要边缺失、非法方向和循环。
6. 说明 TypeScript `paths`、仓库共址与根依赖为什么不能替代真实包依赖。

## 3. 预备知识

- 已理解 `package.json`、pnpm 安装、ESM 和 Vite HTML 入口。
- 能运行 `node --version`、`pnpm --version` 并读取退出码。
- 知道 `import type` 会在转译后消失，普通 `import` 需要运行时解析。
- 知道 Vite 转译 TypeScript 不等于完成类型检查。
- 已阅读本章 [hub](../04-workspace-component-library.md)，接受整数分、`unknown` 输入和授权边界。

先检查环境：

```bash
node --version
pnpm --version
```

预期分别输出 `v24.21.0` 与 `12.10.1`。版本不符时先切换读者自己的练习环境，不修改教材仓库或全局共享工程来迁就示例。

## 4. 核心理论

### 4.1 Workspace 是带清单的图

把每个成员看成一个节点，把 `dependencies` 中指向工作区成员的声明看成有向边：

```text
@market/lab-web
  ├──> @market/ui
  └──> @market/contracts

@market/ui
  └──> @market/contracts

@market/contracts
  └──> 无工作区依赖
```

箭头表示“左侧在构建或运行时需要右侧”。高层应用知道页面和路由，可以依赖低层领域规则；低层 contracts 不应反向导入某个应用。若 contracts 读取 `apps/lab-web` 的状态，任何后端、测试或第二个前端消费者都会被迫带上浏览器应用。

### 4.2 成员声明与根清单职责不同

`pnpm-workspace.yaml` 用 glob 声明哪些目录属于当前工作区。根 `package.json` 提供包管理器版本、跨包命令和全局开发工具。成员 `package.json` 则声明该包的名称、公共入口、自己的脚本和直接依赖。

只有目录，没有成员 glob，pnpm 不会自动把它当成员。只有根依赖，没有成员依赖，也不能表达“UI 自己需要 contracts”。将全部运行依赖堆在根，会让成员在仓库里工作、离开仓库就失败。

### 4.3 一个安装边界生成一份根锁文件

本课程把 `market-workspace` 作为一个安装边界。第一次从根执行 `pnpm install`，pnpm 生成一个根 `pnpm-lock.yaml`，记录所有成员解析后的依赖图。成员不再各自生成锁文件。

锁文件必须由 pnpm 生成并审查，不能手写。`node_modules` 是可重建安装结果，不提交；根锁文件是复现输入，应保留。删除 `node_modules` 后冻结安装成功，能证明安装结果可从清单和锁文件重建；删除锁文件重新解析则是另一种行为。

### 4.4 `workspace:*` 是本地成员约束

下面的声明表示当前包要求工作区内存在 `@market/contracts`：

```json
{
  "dependencies": {
    "@market/contracts": "workspace:*"
  }
}
```

若成员不存在或名称不匹配，安装应失败，而不是静默下载远端同名包。`*` 表示接受当前工作区成员版本；它不等于允许任何来源的任意版本。发布或 pack 时，pnpm 会按规则把 workspace 协议转换成可发布版本关系，第 2 课再验证该边界。

### 4.5 Filter 按包名选择子图

`--filter` 的主要输入是清单里的 `name`，不是文件夹的显示名称：

```bash
pnpm --filter @market/lab-web build
pnpm --filter @market/lab-web... list --depth -1
pnpm --filter ...@market/contracts list --depth -1
```

- `@market/lab-web`：只选择该包。
- `@market/lab-web...`：选择该包及其依赖。
- `...@market/contracts`：选择该包及依赖它的包。

方向写反可能扩大或缩小执行范围。交付证据应同时写命令和实际包列表，不能只说“跑了 filter”。

### 4.6 循环依赖是职责问题

若 UI 导入 app，而 app 又导入 UI，就形成环。ESM 在模块初始化期间可能读取到尚未初始化的绑定；构建、测试和拆包也更难推理。修复方式不是把所有文件搬进 `common`，而是识别低层不变量并通过参数传入高层状态。

pnpm 可能对循环给出警告，但警告不是所有工具链中的强制失败。本课增加一个项目级图检查，把允许方向和必要边写成门禁。真实大型仓库可采用经过评估的图分析工具；无论工具是什么，策略都应来自明确的分层，而不是来自文件夹名字。

### 4.7 `paths` 不建立运行时安装关系

TypeScript `paths` 主要影响类型工具如何解析模块名，不会创建 pnpm 链接，也不会改写浏览器或 Node 的运行时加载器。仓库中能用相对路径读到另一个目录，也不代表当前包声明了依赖。正确顺序是先建立 package membership、`dependencies` 与 `exports`，再让类型工具和构建器沿相同公共入口工作。

## 5. 元素、属性、API 或配置清单

| 命令、配置或文件 | 固定值/示例 | 角色 | 不能证明 |
| --- | --- | --- | --- |
| Node.js | `24.21.0` | 执行 pnpm、图检查与构建工具 | 浏览器行为或授权正确 |
| pnpm | `12.10.1` | 发现成员、解析依赖、生成根锁文件 | 依赖方向自然合理 |
| `pnpm-workspace.yaml` | `apps/*`、`packages/*` | 声明工作区成员范围 | glob 中每个目录都有正确清单 |
| 根 `package.json` | `private`、`packageManager`、根脚本 | 定义安装边界和公共命令入口 | 成员可以省略真实依赖 |
| 成员 `name` | `@market/lab-web` 等 | filter 和依赖引用的稳定标识 | 文件夹名必须与包名相同 |
| `workspace:*` | 本地成员协议 | 拒绝缺失或同名远端替代 | 版本升级和发布自动无风险 |
| `pnpm-lock.yaml` | pnpm 生成 | 固定完整解析图与完整性信息 | 当前 `node_modules` 未损坏 |
| `pnpm list -r --depth -1` | 递归成员列表 | 观察 pnpm 识别的包 | 源码 import 都已声明 |
| `--filter 包...` | 包及其依赖 | 对应用子图运行命令 | 依赖包一定有同名脚本 |
| `--filter ...包` | 包及其依赖者 | 查看影响面 | 所有业务影响都能由包图推断 |
| TS 7 CLI | `@typescript/native@npm:typescript@7.0.2` | 主类型检查 | TS 6 API 工具兼容 |
| TS 6 包 | `typescript@npm:@typescript/typescript6@6.0.2` | `tsc6` 与旧编译器 API | Vue SFC 已检查 |
| Vite | `8.3.0` | 构建浏览器应用和源码消费包 | 完整类型、无障碍或发布通过 |

## 6. 最小可运行案例

### 6.1 创建位置和目录

在读者自己的练习根目录执行：

```bash
mkdir -p market-workspace/apps/lab-web
mkdir -p market-workspace/packages/contracts/src
cd market-workspace
```

本节先建立 `lab-web → contracts` 两个节点，只观察 membership 和本地链接。不要在此目录之外生成清单或锁文件。

### 6.2 根清单

完整文件 `market-workspace/package.json`：

```json
{
  "name": "market-workspace",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@12.10.1",
  "engines": {
    "node": ">=24.21.0 <25"
  }
}
```

`private: true` 防止误发布根聚合包，但不会让浏览器资源或本地文件自动保密。

### 6.3 成员声明

完整文件 `market-workspace/pnpm-workspace.yaml`：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

完整文件 `market-workspace/packages/contracts/package.json`：

```json
{
  "name": "@market/contracts",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

完整文件 `market-workspace/packages/contracts/src/index.ts`：

```ts
export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("expected non-negative safe integer cents");
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
```

完整文件 `market-workspace/apps/lab-web/package.json`：

```json
{
  "name": "@market/lab-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "dependencies": {
    "@market/contracts": "workspace:*"
  }
}
```

### 6.4 安装和观察

从 `market-workspace/` 执行：

```bash
pnpm install
pnpm list -r --depth -1
pnpm --filter @market/lab-web... list --depth -1
find . -name pnpm-lock.yaml -print
```

预期成员列表包含：

```text
market-workspace
@market/lab-web
@market/contracts
```

最后一条命令应只打印 `./pnpm-lock.yaml`。`@market/lab-web...` 的选择结果应包含应用和 contracts。实际输出的附加版本信息可能随 pnpm 展示格式变化，因此验收包名集合，而不是复制终端装饰字符。

若只看到根包，先检查命令是否在根执行以及 workspace YAML 是否拼写正确。若安装报 `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`，核对依赖键与成员 `name`，不要在根安装一个同名远端包来掩盖错误。

### 6.5 最小案例的可观察结论

此时还没有浏览器页面，但已经能观察三件事：

1. pnpm 从 YAML 发现两个成员。
2. `workspace:*` 把应用依赖解析到本地 contracts。
3. 整个安装边界只有一份根锁文件。

这就是最小案例的成功标准。页面行为属于下一节，不能用“目录存在”代替依赖图证据。

## 7. 邻里集市集成案例

### 7.1 扩展目录

在 `market-workspace/` 继续执行：

```bash
mkdir -p apps/lab-web/src
mkdir -p packages/ui/src
mkdir -p scripts
```

最终图为 `lab-web → ui → contracts`，同时 `lab-web → contracts`，因为应用源码也直接导入 `Listing`。

### 7.2 根工具与脚本

完整替换 `market-workspace/package.json`：

```json
{
  "name": "market-workspace",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@12.10.1",
  "engines": {
    "node": ">=24.21.0 <25"
  },
  "scripts": {
    "graph:check": "node scripts/check-workspace-graph.mjs",
    "typecheck": "tsc --noEmit -p apps/lab-web/tsconfig.json",
    "typecheck:compat": "tsc6 --noEmit -p apps/lab-web/tsconfig.json",
    "typecheck:all": "pnpm typecheck && pnpm typecheck:compat",
    "build": "pnpm graph:check && pnpm typecheck:all && pnpm --filter @market/lab-web build"
  },
  "devDependencies": {
    "@typescript/native": "npm:typescript@7.0.2",
    "typescript": "npm:@typescript/typescript6@6.0.2"
  }
}
```

完整文件 `market-workspace/tsconfig.base.json`：

```json
{
  "compilerOptions": {
    "target": "ES2025",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2025", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

### 7.3 Contracts 包

完整替换 `market-workspace/packages/contracts/src/index.ts`：

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

export function formatCents(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("expected non-negative safe integer cents");
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}
```

此包不读取 `document`、数据库、Cookie、会话或应用状态。Listing 是静态契约；网络输入仍要在第 2 课以 `unknown` 进入解析器。

### 7.4 UI 包

完整文件 `market-workspace/packages/ui/package.json`：

```json
{
  "name": "@market/ui",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./tokens.css": "./src/tokens.css"
  },
  "dependencies": {
    "@market/contracts": "workspace:*"
  }
}
```

完整文件 `market-workspace/packages/ui/src/index.ts`：

```ts
import { formatCents } from "@market/contracts";
import type { Listing } from "@market/contracts";

export function createListingCard(listing: Listing): HTMLElement {
  const card = document.createElement("article");
  card.className = "market-card";

  const title = document.createElement("h2");
  title.textContent = listing.title;

  const description = document.createElement("p");
  description.textContent = listing.description;

  const price = document.createElement("p");
  price.textContent = `${formatCents(listing.priceCents)} 元`;

  card.append(title, description, price);
  return card;
}
```

完整文件 `market-workspace/packages/ui/src/tokens.css`：

```css
:root {
  font-family: system-ui, sans-serif;
  color: #172126;
  background: #f6f7f8;
}

.market-card {
  margin-block: 1rem;
  padding: 1rem;
  border: 1px solid #cbd5da;
  border-radius: 0.5rem;
  background: #ffffff;
}
```

DOM 工厂只是本课框架无关的浏览器消费者。第 3 课会解释为什么 React/Vue 不应共同接管它创建的节点。

### 7.5 应用包与入口

完整替换 `market-workspace/apps/lab-web/package.json`：

```json
{
  "name": "@market/lab-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 5173 --strictPort",
    "build": "vite build"
  },
  "dependencies": {
    "@market/contracts": "workspace:*",
    "@market/ui": "workspace:*"
  },
  "devDependencies": {
    "vite": "8.3.0"
  }
}
```

完整文件 `market-workspace/apps/lab-web/tsconfig.json`：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

完整文件 `market-workspace/apps/lab-web/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>邻里集市 Workspace</title>
  </head>
  <body>
    <main>
      <h1>邻里集市</h1>
      <p>本地静态教学数据，不代表真实库存或授权。</p>
      <div id="app"></div>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

完整文件 `market-workspace/apps/lab-web/src/main.ts`：

```ts
import type { Listing } from "@market/contracts";
import { createListingCard } from "@market/ui";
import "@market/ui/tokens.css";

const listings: Listing[] = [
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

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("missing #app");
app.replaceChildren(...listings.map((listing) => createListingCard(listing)));
```

### 7.6 确定性依赖图门禁

完整文件 `market-workspace/scripts/check-workspace-graph.mjs`：

```js
import { readFile } from "node:fs/promises";

const locations = [
  "apps/lab-web",
  "packages/contracts",
  "packages/ui",
];

const manifests = new Map();
for (const location of locations) {
  const source = await readFile(new URL(`../${location}/package.json`, import.meta.url), "utf8");
  const manifest = JSON.parse(source);
  if (typeof manifest.name !== "string") {
    throw new Error(`${location}: missing package name`);
  }
  manifests.set(manifest.name, { location, manifest });
}

const required = new Map([
  ["@market/lab-web", new Set(["@market/contracts", "@market/ui"])],
  ["@market/ui", new Set(["@market/contracts"])],
  ["@market/contracts", new Set()],
]);

const allowed = new Map([
  ["@market/lab-web", new Set(["@market/contracts", "@market/ui"])],
  ["@market/ui", new Set(["@market/contracts"])],
  ["@market/contracts", new Set()],
]);

const graph = new Map();
for (const [name, { manifest }] of manifests) {
  const dependencies = manifest.dependencies ?? {};
  const workspaceTargets = new Set(
    Object.keys(dependencies).filter((dependency) => manifests.has(dependency)),
  );
  for (const target of required.get(name) ?? []) {
    if (dependencies[target] !== "workspace:*") {
      throw new Error(`${name}: missing required ${target}@workspace:*`);
    }
  }
  for (const target of workspaceTargets) {
    if (!allowed.get(name)?.has(target)) {
      throw new Error(`${name}: forbidden dependency direction to ${target}`);
    }
  }
  graph.set(name, workspaceTargets);
}

const visiting = new Set();
const visited = new Set();
function visit(name) {
  if (visiting.has(name)) throw new Error(`workspace cycle reaches ${name}`);
  if (visited.has(name)) return;
  visiting.add(name);
  for (const target of graph.get(name) ?? []) visit(target);
  visiting.delete(name);
  visited.add(name);
}
for (const name of graph.keys()) visit(name);

for (const [name, targets] of graph) {
  console.log(`${name} -> ${[...targets].sort().join(", ") || "(none)"}`);
}
console.log("workspace dependency graph: PASS");
```

脚本使用 JSON 解析清单，不用正则猜测依赖。它检查本课程的必要边和允许方向，再做通用 DFS 环检测。它不扫描源文件 import，因此 `pnpm build` 仍负责发现清单之外的真实运行时解析问题。

### 7.7 安装、检查、构建和观察

从根执行：

```bash
pnpm install
pnpm graph:check
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm typecheck:all
pnpm build
pnpm --filter @market/lab-web dev
```

预期图输出：

```text
@market/lab-web -> @market/contracts, @market/ui
@market/contracts -> (none)
@market/ui -> @market/contracts
workspace dependency graph: PASS
```

预期 `tsc` 为 `7.0.2`，`tsc6` 为锁文件解析出的同一 TS 6 兼容编译器版本。浏览器打开 `http://127.0.0.1:5173/`，应看到 `19.90 元` 和 `0.00 元`。终端按 `Ctrl+C` 停止服务。`apps/lab-web/dist` 是应用构建结果，不是 contracts 或 UI 已可发布的证据。

## 8. 常见错误与排查路径

### 8.1 错误一：成员存在于磁盘，却不在 workspace

故意把 `pnpm-workspace.yaml` 暂时改成只包含 `apps/*`，清理读者练习目录的安装结果后运行 `pnpm install`。

- **现象**：安装非零退出，应用的 `workspace:*` 依赖无法解析。
- **证据**：日志包含缺失的 `@market/contracts` 或 `@market/ui`，`pnpm list -r --depth -1` 不再列出 packages 成员。
- **原因**：文件夹存在不等于 pnpm member；成员 glob 没有覆盖 `packages/*`。
- **修复**：恢复 `packages/*`，不在根改装同名远端包，不把 `workspace:*` 改成宽松注册表范围。
- **复验**：重新 `pnpm install`，成员列表恢复三包，`pnpm graph:check` 与 `pnpm build` 均退出 0。

### 8.2 错误二：UI 导入 contracts，却没有声明依赖

暂时删除 `packages/ui/package.json` 中的 `@market/contracts`。

- **现象**：`pnpm graph:check` 非零退出；干净构建还可能报告无法解析 `@market/contracts`。
- **证据**：首条门禁错误为 `@market/ui: missing required @market/contracts@workspace:*`。
- **原因**：真实源码 import 与成员清单不一致；应用自己的 contracts 依赖不能替 UI 代为声明。
- **修复**：在 UI 的 `dependencies` 恢复 `workspace:*`，不把依赖堆到根清单。
- **复验**：删除练习目录安装结果后执行冻结安装、`pnpm graph:check`、`pnpm build`，三项都成功。

### 8.3 错误三：Contracts 反向依赖应用

暂时给 `packages/contracts/package.json` 增加 `@market/lab-web: "workspace:*"`。

- **现象**：安装可能完成或警告循环，但图门禁必须失败。
- **证据**：错误包含 `@market/contracts: forbidden dependency direction to @market/lab-web`；若移除方向规则，DFS 仍会发现 `lab-web → contracts → lab-web`。
- **原因**：低层领域包读取高层应用，破坏复用方向并形成环。
- **修复**：删除反向依赖，把 contracts 所需的纯输入作为参数传入；页面状态留在 app。
- **复验**：图输出恢复为固定三条边，双类型检查和应用构建成功。

### 8.4 快速定位表

| 现象 | 优先证据 | 常见根因 | 不接受的处理 |
| --- | --- | --- | --- |
| filter 选不到包 | 成员列表、成员 `name` | 把目录名当包名 | 在根复制同名脚本 |
| workspace 包找不到 | YAML glob、依赖键、包名 | 未声明成员或名称不一致 | 改成远端 `latest` |
| 本机能构建，干净安装失败 | 成员 dependencies、根锁文件 | 幽灵依赖或锁文件漂移 | 提交 `node_modules` |
| 图检查失败 | 首条方向/必要边错误 | 责任反向或声明缺失 | 删除门禁脚本 |
| ESM 初始化值异常 | 依赖链和环路径 | 循环 import | 加任意延迟等待 |
| 类型能解析，运行时失败 | `exports`、真实依赖、构建日志 | 只配了 TS `paths` | 用 `as` 压掉错误 |

## 9. 课后题

**1. 为什么根清单安装了 `@market/contracts`，UI 仍应自己声明？**

参考答案：依赖属于实际进口者。根安装只会让仓库布局偶然可解析，不能让 UI 的清单在打包、独立消费和影响分析时保持完整。

**2. `workspace:*` 与相对路径 `../../packages/contracts/src/index.ts` 的核心差异是什么？**

参考答案：前者通过包名、成员资格和公共入口表达依赖；后者耦合物理目录并绕过包边界。第 2 课还会用 `exports` 限制允许子路径。

**3. 一个根锁文件是否是所有 monorepo 的绝对规则？**

参考答案：不是。本课程把一个 workspace 定义为一个安装边界，因此使用一份根锁文件。真正相互独立的仓库或安装边界应有明确约定，不能不分析就合并或复制锁文件。

**4. 图无环是否证明架构正确？**

参考答案：不能。无环只是必要条件之一；浏览器仍可能依赖数据库包，包也可能泄露密钥或混入授权职责，需要继续检查环境和数据边界。

## 10. 实践练习

### 基础：加入第三件静态商品

在 `apps/lab-web/src/main.ts` 增加 `priceCents: 250` 的商品，不复制金额格式函数。

验收标准：

- 页面显示 `2.50 元`。
- 新对象拥有完整 Listing 字段和 UTC ISO 8601 时间。
- `formatCents` 仍只存在 contracts。
- `pnpm typecheck:all` 与构建成功。

### 进阶：解释两个 filter 方向

分别运行：

```bash
pnpm --filter @market/lab-web... list --depth -1
pnpm --filter ...@market/contracts list --depth -1
```

写下两个包名集合和方向解释。验收标准：第一条从应用向依赖展开，第二条从 contracts 向依赖者展开；输出差异不能只用“一个更多”描述。

### 故障注入：破坏依赖方向

为 contracts 临时增加对 UI 的 `workspace:*` 依赖，再运行：

```bash
pnpm graph:check
pnpm build
```

确定性验收：

1. 图门禁非零退出并指出非法方向。
2. 保存现象、证据、原因、修复、复验五项记录。
3. 恢复清单后门禁和完整构建都通过。
4. 不通过放宽允许边或删除检查制造绿灯。

## 11. 阶段验收

从 `market-workspace/` 逐项执行并保存退出码：

```bash
node --version
pnpm --version
pnpm install
pnpm install --frozen-lockfile
pnpm list -r --depth -1
pnpm graph:check
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm typecheck
pnpm typecheck:compat
pnpm typecheck:all
pnpm build
find . -name pnpm-lock.yaml -print
```

通过标准：

- Node 与 pnpm 符合任务卡版本，三项编译器探针角色没有混淆。
- 三个成员和固定三条工作区依赖边可观察。
- 只有根 `pnpm-lock.yaml`，冻结安装成功。
- 主、兼容类型检查与 Vite 构建分别成功。
- 页面显示 `19.90 元` 与 `0.00 元`。
- 至少一项故障注入先红后绿，记录包含五段证据。
- 能说明本地页面、类型和 workspace 均未证明真实认证、对象授权、事务或生产部署。

本课不要求把练习工程、锁文件或构建产物放入教材仓库。

## 12. 常见问题

**可以把所有依赖都放在根，减少重复吗？**

工具依赖可按仓库约定集中，但每个成员的运行依赖仍应归属真实消费者。pnpm 的内容寻址存储已经处理物理复用，不需要靠错误清单“去重”。

**为什么 app 同时依赖 UI 和 contracts？**

因为 app 自己直接导入 Listing，UI 也直接导入 contracts。直接 import 对应直接依赖，不能只依赖 UI 后借用它的传递依赖。

**pnpm 发出循环警告，是否足够？**

不够。门禁需要稳定的非零退出；本课用图脚本把方向和环变为失败。真实项目应把选定工具纳入 CI。

**`private: true` 是否能防止源码泄露？**

不能。它主要防止误发布。浏览器构建产物仍可下载分析，密钥和授权逻辑必须留在服务端。

**为什么没有给 contracts 加 React 或 Vue？**

纯领域契约不需要框架运行时。无消费者的 peer 只会增加耦合，第 2、3 课再根据真实组件形态决策。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [pnpm Workspaces](https://pnpm.io/workspaces)：成员、workspace 协议和发布转换。
- [pnpm Filtering](https://pnpm.io/filtering)：包、依赖与依赖者选择语法。
- [pnpm CLI](https://pnpm.io/pnpm-cli)：递归命令和执行入口。
- [Node.js Package Entry Points](https://nodejs.org/api/packages.html#package-entry-points)：下一课使用的公共入口基础。
- [TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)：类型解析与运行时解析的区别。
- [Vite Monorepos and Linked Dependencies](https://vite.dev/guide/dep-pre-bundling.html#monorepos-and-linked-dependencies)：链接依赖的开发处理。

## 我现在能做到什么

我能把目录转换为可观察的 pnpm 包图，用 `workspace:*`、包名 filter 和唯一根锁文件表达真实安装关系；我能阻止缺失成员、幽灵依赖、反向依赖和循环，而不会用根安装、TypeScript `paths` 或重装依赖掩盖架构错误。

## 单元导航

[章节 hub](../04-workspace-component-library.md) · [上一单元：构建、资源、缓存与性能预算](../03-build-assets-performance.md) · [下一单元：Package Exports、运行时契约与发布](02-package-exports-contracts-publishing.md) · [工程化卷目录](../README.md)
