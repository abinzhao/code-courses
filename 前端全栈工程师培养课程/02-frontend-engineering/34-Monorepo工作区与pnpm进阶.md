# 34-Monorepo 工作区与 pnpm 进阶

## 目标

完成本知识单元后，学员应能判断一个团队是否需要 Monorepo，并能用 pnpm workspace 搭建、维护和排障一个多包仓库，而不是只把多个目录放进同一个 Git 仓库就声称完成了 Monorepo。

学员应能够：

1. 说明 Monorepo 解决什么问题、不解决什么问题，以及它引入的成本与风险。
2. 配置 `pnpm-workspace.yaml` 与根 `package.json`，正确划分应用包与共享包。
3. 使用 `workspace:` 协议表达内部依赖，理解版本在开发期与发布期的不同表现。
4. 解释 pnpm 的内容寻址存储、符号链接结构，以及它如何消除幽灵依赖。
5. 使用 `--filter`、`-r` 等能力编排多包任务，并了解基于依赖图的任务缓存（Turborepo、Nx 点到）。
6. 设计共享配置包（TypeScript、ESLint）与典型目录结构，守住包间依赖方向。

本单元聚焦仓库组织与任务协作。npm 包的发布、Changesets 与模块联邦将分别在第 35、36 单元展开。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| pnpm 当前稳定版（10.x） | 包安装、workspace、任务过滤 | 能配置 workspace、使用 `workspace:` 与 `--filter` |
| Node.js 当前 LTS（24.x，或团队锁定的 LTS） | 运行各包脚本与工具 | 理解单仓库内多包共用一个 Node 版本 |
| TypeScript 当前稳定版（5.x） | 包间类型共享与项目引用 | 能配置分层 tsconfig 与 `references` |
| Vite 当前稳定版（6.x/7.x） | 应用包与库包构建 | 能在 workspace 中构建应用和库 |
| Turborepo 2.x（认知与入门） | 任务编排与缓存示例 | 理解依赖图、缓存命中概念，不要求精通配置 |
| Nx（概念点到） | 另一类任务编排方案 | 知道与 Turborepo 解决同类问题 |
| Git | 单仓库版本管理 | 理解 Monorepo 不等于多仓库压缩包 |

版本说明：

- pnpm 8 之后 workspace 配置与过滤语义保持稳定，本单元示例以当前稳定版为准。
- 新版 pnpm 使用 `pnpm-workspace.yaml` 同时承载 workspace 包声明，部分安装相关配置也逐步迁移到该文件。
- Turborepo 与 Nx 属于“可选增强”，课程主线是先理解 pnpm 原生能力，再理解缓存编排器解决什么问题。

开始前检查环境：

```bash
node -v
pnpm -v
pnpm config get store-path
```

预期观察：

- 前两条命令输出版本号；第三条输出 pnpm 全局内容寻址存储的位置。
- 记住这个 store 路径，后续观察硬链接时会用到。

## 详细的理论知识讲解和示例伪代码

### 1. Monorepo 解决什么问题

#### 1.1 定义

Monorepo 是用一个版本仓库管理多个项目或包，这些包通常包括若干可独立运行的应用（apps）和若干被复用的库（packages）。与它相对的是 Multi-repo（Polyrepo），即每个包一个仓库。

Monorepo 的核心价值来自“跨包变更可以在一次提交中原子完成”：

```text
Multi-repo 中修改一个共享类型：
改 shared 仓库 → 发版 → 等应用仓库升级 → 联调 → 三个应用分别走三条流水线

Monorepo 中修改同一个类型：
一次提交同时改 shared 和三个应用 → 一条流水线统一验证 → 变更天然一致
```

#### 1.2 工程化关系

适合 Monorepo 的典型信号：

- 多个应用共享同一套组件、工具函数或类型定义；
- 共享代码改动频繁，跨仓库发版成为明显瓶颈；
- 希望统一 lint、测试、构建和发布流程；
- 团队希望新人一条命令即可在所有项目间开发。

它不解决的问题（必须先建立预期）：

- 不自动改善架构。边界混乱的代码搬进一个仓库只会“混乱得更集中”。
- 不自动提升性能。包数量增大后，安装、构建、CI 都需要编排与缓存策略。
- 不替代版本与权限管理。哪些包对外发布、谁可以改动核心包，仍需规则。

常见代价包括 CI 需要按包增量执行、工具链需要支持 workspace、包的公开 API 需要治理。小团队只有一个应用时，保持单包仓库往往更简单。

#### 1.3 常见误区

> Monorepo 就是把几个项目复制进一个文件夹。

没有 workspace 配置、没有包边界、没有统一安装与任务编排，只是“一个仓库里放了几坨代码”，无法获得跨包原子变更和依赖联动的收益。

> 大厂都用 Monorepo，所以任何项目都该上。

Monorepo 有明确的工具与治理成本。是否采用取决于跨包协作频率，而不是流行程度。

### 2. pnpm workspace 配置

#### 2.1 定义

workspace 通过 `pnpm-workspace.yaml` 声明哪些目录属于工作区成员，pnpm 会在一次 `pnpm install` 中为所有成员统一解析依赖、建立内部链接。

最小配置：

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

不希望被当作包发布的工具目录可以排除或不放匹配路径下，例如 `tools/` 若只放脚本可直接放在根目录。

#### 2.2 工程化关系

典型根目录与成员配置：

```text
acme-monorepo/
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── src/
│   └── admin/
│       ├── package.json
│       └── src/
├── packages/
│   ├── ui/
│   │   ├── package.json
│   │   └── src/
│   └── shared/
│       ├── package.json
│       └── src/
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
└── tsconfig.base.json
```

根 `package.json` 负责私有保护、统一脚本和共用开发依赖：

```json
{
  "name": "acme-monorepo",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "dev:web": "pnpm --filter @acme/web dev"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0"
  },
  "packageManager": "pnpm@10.0.0"
}
```

应用成员声明自己的名字与依赖：

```json
// apps/web/package.json
{
  "name": "@acme/web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@acme/ui": "workspace:*",
    "@acme/shared": "workspace:*"
  }
}
```

初始化与验证命令：

```bash
pnpm install
pnpm list -r --depth -1        # 查看所有 workspace 成员
pnpm -w add -D typescript     # 向根目录添加共享开发依赖
```

使用 `packageManager` 字段配合 Corepack，可以让团队成员使用同一份 pnpm 版本：

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
```

#### 2.3 常见误区

> 每个包各自执行 `pnpm install`，各自维护一份 lockfile。

workspace 的意义之一就是统一解析、生成单一 `pnpm-lock.yaml`。多份 lockfile 会让版本不一致、内部链接失效。

> 根目录设置成可发布的公开包。

根包应保持 `"private": true`，它只承担编排职责，不是产物。

### 3. workspace 协议与内部依赖

#### 3.1 定义

`workspace:` 是 pnpm 提供的协议，用来声明“此依赖来自当前工作区的另一个成员”，而不是 registry 上的外部包。pnpm 在安装时会把它直接链接到本地成员目录。

```json
{
  "dependencies": {
    "@acme/shared": "workspace:*",
    "@acme/ui": "workspace:^"
  }
}
```

后缀语义：

| 写法 | 含义 |
|---|---|
| `workspace:*` | 始终链接本地成员，发布时被替换为实际版本号 |
| `workspace:^` | 发布时替换为 `^当前版本` 的 semver 范围 |
| `workspace:~` | 发布时替换为 `~当前版本` |
| `workspace:1.2.3` | 固定版本引用 |

#### 3.2 工程化关系

当包只在仓库内部消费（如 apps），`workspace:*` 最省心；当包要发布到 registry 时，pnpm publish 会自动把协议替换成真实版本范围，保证外部用户安装到正确版本。

内部包的源码与导出：

```ts
// packages/shared/src/index.ts
export function formatCurrency(value: number, currency = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
  }).format(value);
}

export type Paginated<T> = {
  list: T[];
  total: number;
  page: number;
};
```

```json
// packages/shared/package.json
{
  "name": "@acme/shared",
  "version": "0.3.1",
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

应用中直接按包名导入，不使用跨目录相对路径：

```ts
// apps/web/src/pages/Orders.tsx
import { formatCurrency, type Paginated } from '@acme/shared';

export function Orders({ data }: { data: Paginated<{ amount: number }> }) {
  return (
    <ul>
      {data.list.map((order, index) => (
        <li key={index}>{formatCurrency(order.amount)}</li>
      ))}
    </ul>
  );
}
```

开发期直接引用 TS 源码依赖构建器支持；对于需要独立构建发布的库包，则应导出构建产物并用 TypeScript 项目引用保证类型顺序：

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  }
}
```

```json
// packages/shared/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

#### 3.3 常见误区

> 用 `../../packages/shared/src/index` 这样的相对路径引用内部包。

相对路径绕过了包边界：内部包一旦调整目录或改名就会连锁断裂，也无法表达版本关系。应始终通过包名导入。

> 内部包改完忘了构建，消费方拿到旧产物。

开发期引用源码可规避；引用产物时应配合 `watch` 模式或任务编排器的依赖感知（见第 7 节），保证上游先构建。

### 4. pnpm 的存储模型：内容寻址、硬链接与虚拟 store

#### 4.1 定义

pnpm 把所有下载过的包保存在全局内容寻址 store 中：文件内容决定地址，相同内容只存一份。项目 `node_modules` 里的文件通过硬链接指向 store，因此同一版本的依赖在几十个项目中也几乎不重复占磁盘。

workspace 项目的 `node_modules` 采用分层结构：

```text
node_modules/
├── .pnpm/                 # 虚拟 store，每个包及其依赖隔离存放
│   ├── react@18.3.1/
│   │   └── node_modules/react
│   └── lodash@4.17.21/
│       └── node_modules/lodash
├── react -> .pnpm/react@18.3.1/node_modules/react
└── @acme/
    └── shared -> ../../packages/shared
```

每个包只能看到自己声明过的依赖，因为顶层只对声明者创建符号链接。

#### 4.2 工程化关系

这种结构带来三个工程收益：

1. 安装快：绝大多数文件是硬链接，不发生复制。
2. 磁盘省：跨项目共享同一份物理文件。
3. 严格可访问：未声明的依赖在代码中不可解析。

观察硬链接关系：

```bash
pnpm install
ls -li node_modules/.pnpm/lodash@*/node_modules/lodash/package.json
# 第一列是 inode 编号；与全局 store 中同一文件的 inode 相同，证明是硬链接
pnpm store path
```

各成员包拥有隔离的依赖视图。例如 `packages/ui` 没声明 lodash，即使其他包声明了，在 `packages/ui` 内也无法 import：

```text
apps/web 声明了 lodash      → apps/web 中 import 'lodash' 成功
packages/ui 未声明 lodash   → packages/ui 中 import 'lodash' 报模块找不到
```

必要时可以通过配置放宽，但应作为例外处理：

```yaml
# pnpm-workspace.yaml（示意：默认严格，仅在确有兼容需求时调整）
# hoistPattern、publicHoistPattern 等配置会削弱隔离，应注释清楚原因
```

#### 4.3 常见误区

> 硬链接就是复制一份文件，pnpm 省盘是营销说法。

硬链接是文件系统级别的多个目录项指向同一 inode，物理数据只存一份。可通过比较 inode 编号自行验证。

> 删掉 store 不影响项目。

store 被清理后，硬链接的数据会失效；应使用 `pnpm store prune` 清理无引用内容，而不是手动删除目录。

### 5. 提升（hoisting）与幽灵依赖

#### 5.1 定义

幽灵依赖（phantom dependency）是指代码 import 了一个没有在自己的 `package.json` 中声明的包，却因为包管理器把依赖“提升”到顶层 `node_modules` 而侥幸可用。npm 早期的扁平提升结构让任何包都能访问被提升的包。

```text
问题链路：
你的代码 import 'lodash'
你的 package.json 没有声明 lodash
但某第三方依赖内部使用 lodash，被提升到顶层 node_modules
本机运行正常 → CI 或依赖升级后提升结构变化 → 突然构建失败
```

#### 5.2 工程化关系

pnpm 默认不做扁平提升，幽灵依赖在开发期就会暴露为“模块找不到”，迫使依赖声明与实际使用一致。

典型的幽灵依赖案例与修复：

```ts
// packages/ui/src/Button.tsx
// 错误示范：clsx 未在 @acme/ui 的 package.json 中声明
import clsx from 'clsx';

export function Button({ className }: { className?: string }) {
  return <button className={clsx('btn', className)}>确定</button>;
}
```

修复方式是显式安装到使用方：

```bash
pnpm --filter @acme/ui add clsx
```

```json
// packages/ui/package.json（修复后）
{
  "dependencies": {
    "clsx": "^2.1.1",
    "react": "catalog:"
  }
}
```

pnpm 还支持 catalog（目录）功能，在 workspace 中统一管理同一依赖的版本，避免各包版本漂移：

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'

catalog:
  react: 18.3.1
  react-dom: 18.3.1
```

```json
// 任意成员 package.json 中引用 catalog
{
  "dependencies": {
    "react": "catalog:",
    "react-dom": "catalog:"
  }
}
```

排查幽灵依赖的思路：

```text
1. 报错包的源码中找到 import 语句
2. 打开该包 package.json，确认是否声明
3. 未声明则判定为幽灵依赖，补装到该包
4. 不要通过全局提升把问题“压回去”
```

#### 5.3 常见误区

> 本机能跑就说明依赖没问题。

“能跑”可能恰好依赖当前提升结构。幽灵依赖的特点就是环境敏感、随时破裂；判断依据只能是声明文件。

> 为了省事，在根配置里 public-hoist 一切。

这等于退回扁平 node_modules，幽灵依赖全面回归，还可能引入多版本冲突。提升应是针对个别工具兼容问题的例外。

### 6. 多包任务编排：filter 与递归执行

#### 6.1 定义

pnpm 提供面向 workspace 的任务选择能力：

| 命令模式 | 作用 |
|---|---|
| `pnpm -r <script>` | 对所有包含该脚本的成员递归执行 |
| `pnpm --filter <selector> <script>` | 只对选中的包执行 |
| `pnpm --filter ...^...` | 结合依赖关系选择上下游 |
| `pnpm -r --parallel <script>` | 并行执行，适合长跑 dev 服务 |

过滤器支持包名、目录、glob 和依赖关系选择。

#### 6.2 工程化关系

常用过滤组合：

```bash
# 只构建 @acme/web 及其依赖的所有上游包
pnpm --filter @acme/web... build

# 构建所有依赖了 @acme/shared 的下游包
pnpm --filter @acme/shared... build

# 在指定目录的包中执行命令
pnpm --filter ./packages/ui test

# 同时启动多个长跑开发服务
pnpm -r --parallel dev

# 仅对自上次提交以来发生变化的包执行（配合 changed 选择器）
pnpm --filter "...[origin/main]" test
```

在根脚本中固化高频编排：

```json
{
  "scripts": {
    "build": "pnpm -r --filter './apps/**' build",
    "build:libs": "pnpm -r --filter './packages/**' build",
    "test": "pnpm -r test",
    "check": "pnpm lint && pnpm -r typecheck && pnpm test"
  }
}
```

`-r` 默认按依赖拓扑顺序执行：被依赖的包先运行。例如构建时 `@acme/shared` 先于 `@acme/ui`，`@acme/ui` 先于 `@acme/web`，与包间依赖图一致。

执行顺序示意：

```text
@acme/shared      （无内部依赖，最先）
@acme/ui          （依赖 shared）
@acme/web         （依赖 shared、ui）
@acme/admin       （依赖 shared、ui）
```

#### 6.3 常见误区

> 用一个巨型 shell 脚本手写各包执行顺序。

依赖关系已经写在 package.json 中，手写顺序会在依赖变化时过时。应让工具按拓扑图执行。

> 对所有任务无脑 `--parallel`。

长跑的 dev 服务适合并行；有产物依赖的 build 并行可能导致下游拿到旧产物。需要并行时应配合缓存编排器的任务依赖声明。

### 7. 任务缓存：Turborepo 与 Nx

#### 7.1 定义

任务缓存器记录一次任务的输入（源码、配置、依赖版本、环境变量白名单）与输出（构建产物、日志）。下次执行时若输入完全相同，直接还原输出，跳过真实执行。它还能按依赖图把多个包的任务并行调度。

pnpm 解决“包怎么连、任务按什么顺序跑”，缓存器解决“没变的任务不要重跑”。

#### 7.2 工程化关系

Turborepo 最小配置：

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "outputs": ["coverage/**"],
      "inputs": ["src/**", "test/**", "package.json"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

字段含义：

- `dependsOn: ["^build"]`：先构建所有上游依赖；
- `outputs`：声明产物路径以便缓存还原；
- `inputs`：收窄指纹范围，无关文件变动不击穿缓存；
- `persistent`：长跑任务不参与缓存。

使用方式与缓存观察：

```bash
pnpm add -w -D turbo
pnpm turbo build           # 第一次：真实执行
pnpm turbo build           # 第二次：缓存命中，输出 >>> FULL TURBO
pnpm turbo build --filter=@acme/web...
```

CI 中通常需要配置远程缓存，使不同流水线任务共享缓存产物；本地缓存只在单机有效。

Nx 提供同类能力（`nx run-many`、`nx affected`、分布式缓存与执行），并在代码约束、项目图可视化上功能更重。两者选型更多看团队偏好，概念可以迁移：输入指纹、输出缓存、依赖图调度。

无缓存器时也可获得部分收益：CI 中结合 pnpm 的 changed 过滤，只对受影响的包执行检查：

```bash
pnpm --filter "...[origin/main]" test
pnpm --filter "...[origin/main]" build
```

#### 7.3 常见误区

> 配了缓存就一定更快。

若 `inputs` 过宽（如把整个仓库纳入指纹），任何提交都击穿缓存；若 `outputs` 漏声明，还原不完整。缓存质量取决于配置精度。

> 缓存器能理解业务依赖方向。

它只读取你声明的任务依赖（如 `^build`）和包依赖图。依赖关系错误时，缓存会“高速地产生错误结果”。

### 8. 共享配置包、目录结构与边界治理

#### 8.1 定义

共享配置包是 Monorepo 中统一工程规范的手段：把 tsconfig、ESLint flat config、Prettier 配置做成内部包或根配置，所有成员复用，杜绝“每个项目一套规则”。

#### 8.2 工程化关系

方式一：根级配置文件，成员 extends：

```json
// apps/web/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

方式二：独立配置包，适合配置复杂或需要跨仓库复用：

```text
packages/
├── eslint-config-acme/
│   ├── index.js
│   └── package.json        # name: eslint-config-acme
└── tsconfig/
    ├── base.json
    ├── react-app.json
    └── package.json        # name: @acme/tsconfig
```

```js
// packages/eslint-config-acme/index.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  ...tsseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactPlugin },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    ignores: ['**/dist/**'],
  },
];
```

成员包以普通依赖方式引用配置包：

```js
// apps/web/eslint.config.js
import acmeConfig from 'eslint-config-acme';

export default acmeConfig;
```

依赖方向治理规则（建议写入 README 并配 CI 检查）：

```text
允许：app → packages 中的共享层（ui、shared）
允许：packages/shared 无内部依赖
禁止：packages/shared → app（共享层反向依赖业务）
禁止：packages/ui → apps/*
禁止：任意循环依赖（A 依赖 B，B 又依赖 A）
```

完整典型结构总览：

```text
acme-monorepo/
├── apps/
│   ├── web/                 # C 端应用，可独立部署
│   └── admin/               # 后台应用，可独立部署
├── packages/
│   ├── ui/                  # 组件库
│   ├── shared/              # 纯逻辑与类型
│   ├── eslint-config-acme/  # 共享 lint 配置
│   └── tsconfig/            # 共享 TS 配置
├── tools/                   # 仓库脚本（非发布包）
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
├── tsconfig.base.json
└── turbo.json               # 可选
```

可用静态检查脚本或依赖约束工具发现违规方向：

```bash
# 快速肉眼核查：查看每个包声明的内部依赖
pnpm -r list --depth -1 | grep -E '@acme|^/' || true
```

#### 8.3 常见误区

> 共享包为了“通用”，反向 import 业务应用里的类型。

这会立刻制造循环依赖并污染共享层。共享层不知道任何具体应用；应用特有的东西留在应用内。

> 目录结构一开始就设计十几个分层。

结构应服务现有包数量。两个应用、两个库时 apps/packages 已足够；过早分层只会增加跳转成本。

## 课后题

1. Monorepo 与 Multi-repo 的本质区别是什么？“跨包原子变更”为什么是它最核心的收益？
2. 场景分析：某团队三个应用共享一个类型包，每次改类型都要经历“改库→发版→三个应用升级→联调”的漫长流程。请具体描述 Monorepo 如何缩短这条链路，以及还需要哪些工程动作才能真正落地。
3. `pnpm-workspace.yaml` 的作用是什么？为什么 workspace 中只应存在一份 `pnpm-lock.yaml`？
4. `workspace:*` 与 `workspace:^` 有什么区别？当包执行 publish 时，这些协议会发生什么变化？
5. 请解释 pnpm 的内容寻址存储和硬链接如何同时实现“节省磁盘”和“安装快速”。如何用 inode 证据验证硬链接？
6. 什么是幽灵依赖？请描述它为什么会“本机能跑、CI 突然失败”，以及 pnpm 为什么能在开发期就暴露它。
7. 场景分析：新人的代码在本地运行正常，合并后 CI 报 `Cannot find package 'dayjs'`。排查发现他在 `packages/ui` 中使用了 dayjs，但依赖被装在了 `apps/web`。请给出根因判断、修复命令，以及为什么不应该用全局提升掩盖。
8. `pnpm --filter @acme/web... build` 中省略号的含义是什么？`-r` 递归执行时按什么顺序构建多个包？
9. 场景分析：某团队配置 Turborepo 后发现缓存几乎从不命中——哪怕只改了 README，所有包也会全部重建。请分析最可能的指纹配置问题（如 `inputs` 缺失、把整个仓库纳入指纹），说明 `inputs`、`outputs`、`dependsOn: ["^build"]` 分别解决什么问题，并给出验证修复是否生效的实验方法。
10. 场景分析：审查某 Monorepo 时发现 `packages/shared` 中出现了 `import type { User } from '@acme/web/src/types'`。请分析这违反了什么边界、会引发什么后果，并给出重构方向。

## 实践练习题

### 练习 1：搭建 workspace 骨架

#### 任务

从零创建一个包含两个应用和两个共享包的 pnpm workspace：`apps/web`、`apps/admin`、`packages/ui`、`packages/shared`，并实现跨包导入。

概念伪代码：

```text
初始化根 package.json（private）
编写 pnpm-workspace.yaml
创建四个成员包并声明各自 name
在 shared 中实现工具函数，在 ui 中实现组件
两个应用通过包名导入并渲染
统一安装，生成唯一 lockfile
```

#### 步骤约束

1. 所有内部依赖必须使用 `workspace:*`，禁止相对路径跨包引用。
2. 共享开发依赖（typescript、vite）装在根目录，业务依赖装在使用方包内。
3. 使用 `pnpm list -r` 输出成员清单作为证据。
4. 两个应用都能通过各自的 `pnpm dev` 启动，并实际使用共享包能力。
5. 根脚本提供一键 `build` 与 `test`。

#### 提交物

- 完整目录、`pnpm-workspace.yaml`、根与各成员的 `package.json`；
- `pnpm-lock.yaml`；
- 成员清单输出与两个应用运行证据；
- 200 字以内的包职责说明。

#### 验收标准

- workspace 成员识别完整，lockfile 唯一；
- 跨包导入全部走包名，无 `../../packages` 形式路径；
- 根脚本可递归执行，顺序符合依赖拓扑；
- 根包保持私有；
- 依赖分类正确，无幽灵依赖。

### 练习 2：幽灵依赖实验与 catalog 统一版本

#### 任务

在练习 1 基础上完成一次受控的幽灵依赖实验：制造、观察报错、修复；随后用 catalog 统一 React 版本，验证各包版本一致。

#### 步骤约束

1. 在一个未声明某第三方依赖的包中使用它，先尝试运行，记录现象；若本机侥幸可用，说明提升来源。
2. 用 `pnpm --filter <包> add <依赖>` 修复，对比修复前后该包 package.json。
3. 配置 catalog，把 react、react-dom 纳入统一版本，成员包改用 `catalog:` 引用。
4. 使用检索或 `pnpm list` 证据证明所有成员的 React 版本一致。
5. 写一段排查笔记，固化“幽灵依赖四步判断法”。

#### 提交物

- 实验前后的代码与声明文件差异；
- 报错日志（含命令）与修复记录；
- catalog 配置和版本一致性证据；
- 排查笔记。

#### 验收标准

- 能清楚解释幽灵依赖产生条件与环境敏感性；
- 修复落在正确的包上，没有启用全局提升；
- catalog 生效，无版本漂移；
- 实验代码最终处于健康状态，不保留故障。

### 练习 3：共享配置包与受依赖感知的构建

#### 任务

把 ESLint 配置抽成 `eslint-config-acme` 内部包供两个应用复用，并引入 Turborepo（或等价缓存方案）实现“改一个包只重建受影响链”的构建编排与缓存命中。

#### 步骤约束

1. 配置包必须有清晰 name 与入口，成员以依赖方式引用，禁止复制配置文件。
2. `turbo.json` 中为 build/test/lint 声明依赖关系与输出；dev 任务标记为非缓存。
3. 连续执行两次构建，记录第二次缓存命中证据；再只修改 `packages/shared`，证明下游重建、未受影响包走缓存。
4. 检查并说明仓库中不存在反向依赖与循环依赖。
5. 不使用远程缓存时，应明确说明缓存仅本机有效。

#### 提交物

- `eslint-config-acme` 包与成员引用配置；
- `turbo.json` 与两次构建、一次增量构建的日志；
- 依赖方向核查证据；
- 缓存配置逐字段说明。

#### 验收标准

- 两个应用实际复用同一份 lint 配置；
- 能演示全量缓存命中与增量重建两种行为；
- 产物还原完整，没有因 outputs 漏配造成脏构建；
- 包间依赖方向全部合法；
- 能解释 pnpm 编排与 Turborepo 缓存各自的职责边界。

## 阶段验收作业

### 作业名称

企业级 pnpm Monorepo 工程基座

### 作业场景

你需要为团队搭建新的前端工程基座，未来将承载两个独立部署的应用和多个共享包。团队希望这套基座能够回答：

- 新增一个应用或共享包时，标准动作是什么？
- 包之间如何引用？如何保证不出现幽灵依赖和循环依赖？
- 一次提交只改动一个共享包时，CI 如何只验证受影响的链？
- TypeScript、ESLint 等工程配置如何一处维护、处处生效？
- 本地与 CI 的构建行为如何保持一致？

你需要提交一个结构完整、可安装、可构建、可演示的 Monorepo。

### 提交物

```text
acme-platform/
├── apps/
│   ├── web/
│   └── admin/
├── packages/
│   ├── ui/
│   ├── shared/
│   ├── eslint-config-acme/
│   └── tsconfig/
├── tools/
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
├── tsconfig.base.json
├── turbo.json
├── docs/
│   ├── package-boundaries.md
│   └── add-a-package.md
└── README.md
```

提交清单：

1. 两个应用均可独立启动和构建，且实际消费 ui、shared。
2. workspace 协议、catalog 版本统一、幽灵依赖治理证据。
3. 共享配置包（ESLint、tsconfig）被成员真实复用。
4. Turborepo（或等价方案）任务编排：拓扑构建、缓存命中、增量执行。
5. `docs/package-boundaries.md`：依赖方向规则与核查方法；`docs/add-a-package.md`：新增包标准动作。
6. README：环境要求、安装、开发、构建、测试与 CI 约定。

### 演示步骤

学员需要在 15 分钟内完成以下演示：

1. 干净安装（删除 node_modules 后 `pnpm install`），展示成员清单与唯一 lockfile。
2. 启动一个应用，展示跨包渲染，并指出依赖链接位置。
3. 演示幽灵依赖的报错与正确修复方式。
4. 连续两次构建展示缓存命中；只改 shared 后展示增量重建范围。
5. 展示共享配置包被两个应用引用，并现场修改一条 lint 规则验证全局生效。
6. 讲解依赖边界规则，并回答导师“新增一个应用需要几步”。

导师可以临时要求新增一个 `packages/icons` 包并接入应用，以验证标准动作是否真实可执行。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| Monorepo 概念判断 | 15 | 能说清收益、代价与适用条件，区分 workspace 与“文件夹拼盘” |
| workspace 与内部依赖 | 20 | 配置正确、协议使用规范、包名导入、lockfile 唯一 |
| 存储模型与幽灵依赖治理 | 20 | 理解硬链接/隔离，完成幽灵依赖实验，catalog 统一版本 |
| 任务编排与缓存 | 20 | 过滤选择正确，拓扑顺序执行，缓存命中与增量重建可演示 |
| 共享配置与边界治理 | 15 | 配置包复用，依赖方向合法，文档可指导新增包 |
| 可复现与表达 | 10 | 干净安装可复现，README 完整，演示与证据一致 |

细分评分规则：

#### Monorepo 概念判断：15 分

- 收益与原子变更理解：6 分；
- 代价与适用条件：5 分；
- workspace 与伪 Monorepo 区分：4 分。

#### workspace 与内部依赖：20 分

- 配置与成员识别：6 分；
- workspace 协议与发布替换语义：7 分；
- 包名导入与 lockfile 唯一：7 分。

#### 存储模型与幽灵依赖治理：20 分

- 内容寻址与硬链接解释：6 分；
- 幽灵依赖实验与修复：8 分；
- catalog 版本统一：6 分。

#### 任务编排与缓存：20 分

- filter 与拓扑顺序：7 分；
- 缓存配置与命中演示：7 分；
- 增量执行正确性：6 分。

#### 共享配置与边界治理：15 分

- 配置包复用：6 分；
- 依赖方向与无循环依赖：5 分；
- 新增包文档可执行：4 分。

#### 可复现与表达：10 分

- 干净安装复现：5 分；
- README 与演示质量：5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 跨包引用大量使用相对路径，绕过包边界。
2. 仓库中存在多份 lockfile，或删除/忽略 `pnpm-lock.yaml`。
3. 存在幽灵依赖却以全局提升方式掩盖，或成员代码依赖未声明的包。
4. 包间存在反向依赖或循环依赖。
5. 无法演示缓存命中或增量重建，且说不清任务执行顺序依据。
6. 共享配置被复制多份而非复用，新增包文档与实际操作不符。
7. 干净安装后项目无法按 README 构建，或只提交截图无源码证据。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解 Monorepo 的价值、代价与适用条件 | 概念问答与现场取舍说明 |
| 配置 pnpm workspace | `pnpm-workspace.yaml`、成员清单与干净安装演示 |
| 掌握内部依赖与 workspace 协议 | 成员 package.json 与发布替换语义问答 |
| 理解存储模型与幽灵依赖治理 | inode 证据、幽灵依赖实验、catalog 配置 |
| 编排多包任务 | filter/递归命令与拓扑顺序演示 |
| 使用任务缓存 | Turborepo 缓存命中与增量构建日志 |
| 共享配置与边界治理 | 配置包复用、边界文档与新增包演示 |
