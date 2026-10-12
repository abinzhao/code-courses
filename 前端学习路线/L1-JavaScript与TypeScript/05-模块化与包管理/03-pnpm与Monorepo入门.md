# 03 pnpm 与 Monorepo 入门

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L1 JavaScript 与 TypeScript
> - 先修：[02 CommonJS 与互操作性](./02-CommonJS与互操作性.md)
> - 建议用时：120-180 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[TypeScript](https://www.typescriptlang.org/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解包管理器、依赖图和 lockfile 的作用
- 能使用 pnpm 初始化项目、安装依赖和执行脚本
- 能用 workspace 协议管理本地包之间的依赖
- 能设计一个边界清晰的 Monorepo 目录结构
- 掌握 `pnpm --filter`、递归命令和缓存策略
- 能为 Monorepo 配置 TypeScript、测试、构建和 CI
- 知道什么时候应该使用 Monorepo，什么时候保持多个仓库

## 内容讲解

### 1. 包管理器真正管理的是什么

包管理器不只是“下载 npm 包”。它至少负责四类工作：

| 工作 | 说明 |
|---|---|
| 解析依赖 | 根据 `package.json` 生成完整依赖图 |
| 安装文件 | 把依赖放到项目可解析的位置 |
| 锁定版本 | 用 lockfile 保证不同机器安装同一套版本 |
| 执行脚本 | 统一运行开发、构建、测试和发布命令 |

一个前端项目通常有三份重要信息：

```text
package.json  →  直接依赖与项目脚本
pnpm-lock.yaml → 精确版本、依赖关系、校验信息
node_modules/  →  本地可执行文件和链接结果
```

不要把 `node_modules` 当作项目配置。它是安装结果，可以删除并根据 `package.json` 与 lockfile 重建。

### 2. 为什么选择 pnpm

pnpm 的核心特点是内容寻址存储和硬链接/符号链接。相同版本的包通常只在全局存储中保存一份，多个项目共享文件内容。

```text
项目 A/node_modules/react ─┐
项目 B/node_modules/react ─┼─→ pnpm store 中的同一份内容
项目 C/node_modules/react ─┘
```

和 npm、Yarn 的常见差异：

| 维度 | npm | Yarn | pnpm |
|---|---|---|---|
| 磁盘复用 | 依赖项目和版本 | 依赖版本 | 内容寻址，复用能力强 |
| node_modules | 传统扁平结构 | 传统或 Plug'n'Play | 严格链接结构 |
| 幽灵依赖 | 容易误用未声明依赖 | 取决于模式 | 默认更容易暴露问题 |
| Monorepo | workspace | workspace | workspace + filter 体验成熟 |
| 迁移成本 | 低 | 中 | 低到中，需修复未声明依赖 |

pnpm 的严格依赖结构会让一些旧项目第一次安装时报错。这不是 pnpm “不兼容”，而是项目代码偷偷使用了没有在 `package.json` 声明的依赖。

### 3. 安装、初始化和常用命令

建议在项目的 `package.json` 中固定包管理器版本：

```json
{
  "name": "frontend-project",
  "private": true,
  "packageManager": "pnpm@10.12.1"
}
```

版本号应以团队实际验证过的版本为准。之后团队成员和 CI 都使用同一个版本。

常用命令：

```bash
# 初始化 package.json
pnpm init

# 安装生产依赖
pnpm add react react-dom

# 安装开发依赖
pnpm add -D typescript vite

# 删除依赖
pnpm remove lodash

# 依据 lockfile 安装，CI 推荐
pnpm install --frozen-lockfile

# 查看依赖树
pnpm why react

# 更新交互式依赖版本
pnpm update --interactive

# 执行 package.json 中的脚本
pnpm dev
pnpm build
pnpm test
```

`pnpm install --frozen-lockfile` 会拒绝自动修改 lockfile。CI 使用它可以尽早发现 `package.json` 和 lockfile 不一致。

### 4. Monorepo 解决什么问题

Monorepo 是在一个 Git 仓库中维护多个相互关联的应用和包：

```text
一个仓库
├── apps/web
├── apps/admin
├── packages/ui
├── packages/config
└── packages/utils
```

适合使用 Monorepo 的信号：

- 多个应用共享组件、类型和工具包。
- 需要一次提交同时修改消费方和被消费方。
- 希望统一代码规范、测试和 CI。
- 发布节奏相关，需要统一版本或统一变更记录。

不适合直接使用 Monorepo 的情况：

- 团队权限和发布边界完全不同。
- 项目之间几乎没有共享代码。
- 构建、测试、部署环境完全独立，合并仓库不会降低成本。
- 团队还没有基本的依赖边界和代码所有权机制。

Monorepo 不是“把所有代码放进一个文件夹”，而是通过包边界管理协作关系。

### 5. 初始化 workspace

在仓库根目录创建 `pnpm-workspace.yaml`：

```yaml
packages:
  - "apps/*"
  - "packages/*"

# 可选：不纳入 workspace 的目录
ignoredBuiltDependencies:
  - "some-native-package"
```

根目录 `package.json`：

```json
{
  "name": "atlas-platform",
  "private": true,
  "packageManager": "pnpm@10.12.1",
  "scripts": {
    "dev": "pnpm --parallel --filter './apps/*' dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  }
}
```

`private: true` 是根包的重要保护措施，避免误把 workspace 根目录发布到 npm。

推荐目录：

```text
atlas-platform/
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   └── src/
│   └── admin/
│       ├── package.json
│       └── src/
├── packages/
│   ├── ui/
│   ├── shared/
│   ├── eslint-config/
│   └── tsconfig/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── .gitignore
```

### 6. workspace 包和 `workspace:` 协议

`packages/shared/package.json`：

```json
{
  "name": "@atlas/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

`apps/web/package.json`：

```json
{
  "name": "@atlas/web",
  "private": true,
  "dependencies": {
    "@atlas/shared": "workspace:*",
    "react": "^19.3.0"
  }
}
```

`workspace:*` 表示必须解析到当前 workspace 中的本地包，而不是从 npm 下载同名包。

其他常用写法：

```json
{
  "dependencies": {
    "@atlas/shared": "workspace:*",
    "@atlas/ui": "workspace:^",
    "@atlas/config": "workspace:~"
  }
}
```

发布时，pnpm 会把 workspace 协议转换成可发布的普通版本范围。私有应用不发布，因此常用 `workspace:*`；需要发布的公共包则要结合版本策略验证生成结果。

### 7. package 边界和导出设计

每个包都应该有清晰的职责。不要创建一个名为 `common`、最终包含所有代码的垃圾包。

```text
@atlas/shared   → 领域无关的类型、日期和数据结构
@atlas/ui       → UI 组件和样式
@atlas/config   → ESLint、Prettier、TypeScript 配置
@atlas/api      → API 客户端和请求类型
@atlas/web      → 面向用户的页面应用
```

通过 `exports` 控制公共入口：

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./date": "./dist/date.js",
    "./types": "./dist/types.js"
  }
}
```

不要让应用直接写：

```ts
// 反模式：绕过包的公共边界
import { parseDate } from '../../../packages/shared/src/date.ts';
```

应当写：

```ts
import { parseDate } from '@atlas/shared/date';
```

这样包内部目录可以重构，消费方不必跟着修改。

### 8. `pnpm --filter` 精确操作目标

workspace 中最常用的能力是按包过滤：

```bash
# 只构建 web
pnpm --filter @atlas/web build

# 构建 web 以及它依赖的 workspace 包
pnpm --filter @atlas/web... build

# 构建 web 以及依赖它的包
pnpm --filter ...@atlas/web build

# 运行所有 apps 下的 dev
pnpm --filter "./apps/*" dev

# 运行所有变更包的测试
pnpm --filter "[origin/main]" test

# 根据目录过滤
pnpm --filter "./packages/ui" test
```

过滤符号的理解：

```text
@atlas/web...     当前包 + 它依赖的包
...@atlas/web     当前包 + 依赖它的包
...[origin/main]  相对基线有变更的包及相关包
```

不要在本地只运行根目录 `test` 就认为所有包都通过了。根脚本是否递归执行，取决于脚本定义。

### 9. 递归任务和任务顺序

```bash
# 对所有有该脚本的包执行
pnpm -r typecheck

# 按依赖顺序执行 build
pnpm -r --sort build

# 并行执行互不依赖的任务
pnpm -r --parallel lint

# 只执行当前包，不运行依赖包脚本
pnpm --filter @atlas/web --no-bail test
```

构建通常需要遵循依赖顺序：

```text
@atlas/shared ─┐
@atlas/ui     ─┼─→ @atlas/web
@atlas/api    ─┘
```

若使用 TypeScript 源码直连和 Vite 解析，开发时可能不需要先构建所有包；生产构建则必须明确产物边界。要么每个包先生成 `dist`，要么由应用构建器统一处理源码，不能两种方式混用却没有约定。

### 10. TypeScript 配置复用

可以把公共配置放到专用包：

```json
{
  "name": "@atlas/tsconfig",
  "private": true,
  "files": [
    "base.json",
    "react.json",
    "node.json"
  ]
}
```

应用中引用：

```json
{
  "extends": "@atlas/tsconfig/react.json",
  "compilerOptions": {
    "noEmit": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

公共配置只放稳定的团队共识。应用特有的路径别名、运行环境类型和构建选项留在应用自己的 `tsconfig.json`，否则配置包会变成隐式耦合中心。

### 11. 共享版本和 catalogs

多个包依赖同一个工具时，版本漂移会导致重复安装和行为不一致。可以使用 pnpm catalog 集中声明版本：

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"

catalog:
  typescript: ^6.0.0
  vitest: ^3.2.0
  eslint: ^9.0.0
```

包中使用：

```json
{
  "devDependencies": {
    "typescript": "catalog:",
    "vitest": "catalog:",
    "eslint": "catalog:"
  }
}
```

是否启用 catalogs 取决于团队的 pnpm 版本和 CI 约束。启用后必须把 workspace 配置与 lockfile 一起提交。

### 12. Monorepo 中的测试和 CI

一个可执行的 CI 顺序：

```text
安装依赖
  ↓
检查 lockfile
  ↓
格式与 lint
  ↓
类型检查
  ↓
受影响包的单元测试
  ↓
依赖顺序构建
  ↓
应用级 E2E
```

示例 GitHub Actions：

```yaml
name: monorepo-ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10.12.1

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm --filter @atlas/web... build
```

仓库规模变大后，可以根据变更包缩小范围：

```bash
pnpm --filter "[origin/main]" lint
pnpm --filter "[origin/main]" test
pnpm --filter "[origin/main]..." build
```

不要只追求“只测变更包”。如果公共包变更影响多个应用，必须包含依赖它的包和端到端主流程。

### 13. 版本管理和 Changesets

多个公共包需要独立发布时，可以使用 Changesets 记录变更：

```bash
# 添加一次变更说明
pnpm changeset

# 预览版本变化
pnpm changeset status

# 根据 changeset 更新版本和 CHANGELOG
pnpm changeset version

# 构建并发布
pnpm -r build
pnpm changeset publish
```

一个 changeset 文件表达：

```md
---
"@atlas/ui": minor
"@atlas/shared": patch
---

新增 Button 的 loading 状态，并修复颜色 token 类型。
```

版本策略：

| 变更 | 版本 |
|---|---|
| 修复兼容 bug | patch |
| 新增向后兼容能力 | minor |
| 删除或改变公共 API | major |

应用包通常不需要发布到 npm，公共 UI、工具和类型包才需要独立版本。

### 14. 常见 Monorepo 反模式

| 反模式 | 后果 | 改进 |
|---|---|---|
| 所有代码放进 `common` | 依赖边界模糊 | 按领域职责拆包 |
| 每个包都能互相依赖 | 形成循环依赖 | 设定依赖方向 |
| 根目录脚本只是别名 | 实际没有覆盖全部包 | 明确 `-r`、`--filter` |
| 直接引用其他包的 `src` | 绕过发布边界 | 使用 `exports` |
| 每个包各自锁工具版本 | 行为漂移 | catalogs 或统一升级策略 |
| 把所有任务都缓存 | 缓存错误结果 | 只缓存确定性任务 |
| 没有包所有者 | 问题无人负责 | CODEOWNERS + 包级文档 |

推荐的依赖方向：

```text
配置包 / 基础类型
        ↓
领域工具 / UI 组件
        ↓
API 客户端
        ↓
业务应用
```

方向应该单向。若 `@atlas/shared` 反过来依赖 `@atlas/web`，说明拆包边界已经出现问题。

### 15. 实战：创建一个可运行的 Monorepo

```bash
mkdir atlas-platform
cd atlas-platform
pnpm init
mkdir -p apps/web packages/shared
```

根目录 `pnpm-workspace.yaml`：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

`packages/shared/package.json`：

```json
{
  "name": "@atlas/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

`packages/shared/src/index.ts`：

```ts
export type User = {
  id: string;
  name: string;
};

export function formatUser(user: User): string {
  return `${user.name}（${user.id}）`;
}
```

`apps/web/package.json`：

```json
{
  "name": "@atlas/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "node src/index.js"
  },
  "dependencies": {
    "@atlas/shared": "workspace:*"
  }
}
```

`apps/web/src/index.js`：

```js
import { formatUser } from '@atlas/shared';

console.log(formatUser({ id: 'u-001', name: 'Ada' }));
```

安装并运行：

```bash
pnpm install
pnpm --filter @atlas/web dev
```

如果 Node.js 无法直接执行 TypeScript 入口，应在共享包中先构建 JavaScript 和声明文件，再把 `exports` 指向 `dist`；上面的源码直连方式适合配合 Vite、tsx 等开发工具，不代表生产环境可以忽略构建边界。

## 常见问题

**Q1：pnpm 安装后为什么有些包不能直接 import？**

最常见原因是代码使用了未声明的幽灵依赖。把实际使用的包加入当前包的 `dependencies` 或 `devDependencies`，不要依赖根目录“碰巧安装”出来的包。

**Q2：`workspace:*` 和 `^1.0.0` 有什么区别？**

`workspace:*` 强制使用本地 workspace 包；`^1.0.0` 是普通版本范围，可能解析到 registry 中的包。Monorepo 内部依赖优先用 workspace 协议。

**Q3：所有项目都应该改成 Monorepo 吗？**

不应该。共享代码、协同变更和统一质量门禁是采用 Monorepo 的主要理由。如果项目之间没有实际耦合，拆开反而更清晰。

**Q4：为什么 `pnpm -r build` 构建失败？**

通常是依赖包没有先生成产物、脚本名称不统一、导出路径错误或 TypeScript 配置不一致。先单独执行依赖包的 build，再用 `pnpm --filter 目标包... build` 验证依赖顺序。

**Q5：为什么根目录要设置 `private: true`？**

防止把 workspace 根目录误发布到 npm。根目录通常只是编排配置，不是一个面向消费者的公共包。

**Q6：Monorepo 中每个包都要有独立的版本吗？**

应用包通常不需要发布版本；需要对外发布的 UI、工具和类型包才需要版本。统一版本和独立版本都可以，按发布边界选择。

**Q7：怎样减少 CI 的构建时间？**

先使用 pnpm store 缓存，再使用 `--filter` 只处理受影响包，最后再加入任务级缓存。缓存必须建立在输入和输出可确定的前提下，不能为了速度缓存不稳定任务。

**Q8：Monorepo 中可以直接引用另一个包的源码吗？**

开发工具支持时可以作为临时方案，但公共边界应由 `exports` 和构建产物定义。长期直接跨包引用 `src` 会让构建、测试和发布环境不一致。

## 实操作业

### 基础练习：把两个应用纳入 workspace

创建 `apps/web` 和 `apps/admin` 两个最小应用，再创建 `packages/shared`：

- `web` 和 `admin` 都依赖 `@atlas/shared`。
- 根目录脚本能同时运行 lint 和 typecheck。
- 修改 `shared` 后，两个应用都能通过构建。

### 进阶练习：建立包边界

把一个已有前端项目拆成：

- `@atlas/config`
- `@atlas/shared`
- `@atlas/ui`
- `@atlas/web`

要求：

- 每个包都有独立 `package.json`。
- 应用不允许从其他包的 `src` 相对路径导入。
- 使用 `exports` 限制公共入口。
- 用 `pnpm --filter` 运行单包和依赖链任务。

### 挑战练习：配置受影响包 CI

实现一个 Pull Request 流程：

1. 使用 `pnpm install --frozen-lockfile`。
2. 只对受影响包执行 lint、类型检查和单元测试。
3. 对受影响包的消费者执行构建。
4. `@atlas/ui` 变化时自动执行一个 Playwright 主流程。
5. 使用 Changesets 记录公共包版本变化。

验收标准是：一个只修改文档的 PR 不触发全量构建；一个修改共享 UI 的 PR 能覆盖所有消费者应用。


---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L1 里程碑](../../projects/atlas/milestones/L1.md)
- 本课任务：把“pnpm 与 Monorepo 入门”落实为 Atlas 中可独立导入的模块或纯函数，补充正常、边界、异常三类自动测试。
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

- pnpm 通过 lockfile、内容寻址存储和严格依赖结构提高安装一致性和磁盘利用率。
- Monorepo 的核心不是目录合并，而是包边界、依赖方向和协作流程。
- `workspace:*`、`pnpm --filter` 和递归脚本是日常工作流的三个关键工具。
- 生产项目应明确源码、构建产物、公共入口和发布版本之间的关系。
- 当共享代码和协同变更带来的收益超过仓库治理成本时，Monorepo 才是合理选择。

<!-- course-nav:start -->
---

[上一篇：02 CommonJS 与互操作性](./02-CommonJS与互操作性.md) · [课程地图](../../README.md) · [下一篇：01 JSX、组件、Props 与 State](../../L2-前端框架与组件化/01-React-19-核心/01-JSX-组件-Props-State.md)
<!-- course-nav:end -->
