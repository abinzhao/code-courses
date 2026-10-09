# 36-前端 CI/CD、微前端与模块联邦

## 目标

完成本知识单元后，学员应能为前端应用设计持续集成与持续交付流水线，并理解微前端与模块联邦在“大规模、多团队”场景中的价值、代价与边界，而不是把“有个构建脚本”和“装了联邦插件”当作工程目标。

学员应能够：

1. 设计前端 CI 流水线，按顺序组织 lint、typecheck、test、build，并解释每一步拦截什么问题。
2. 配置依赖与构建缓存，管理构建制品（artifact），区分缓存与制品的用途。
3. 描述产物发布到 CDN 的链路、缓存刷新策略与预览环境（preview）的协作价值。
4. 解释微前端要解决的组织问题，以及它在运行时复杂度、样式隔离和一致性上的代价。
5. 在概念层面说明模块联邦的 host、remote、共享依赖模型，以及它与传统构建期代码共享的区别。
6. 说明模块联邦与 Monorepo 结合的方式，掌握拆分边界原则与版本、可用性方面的风险。

本单元是前端工程化模块的收口。容器化、服务端部署与全链路可观测性将在后续全栈项目单元中展开。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| GitHub Actions（当前 runner 版本） | CI/CD 流水线 | 能编写 workflow、job、step，使用 secrets 与缓存 |
| pnpm 当前稳定版（10.x） | 安装与 workspace 任务 | 能在 CI 中使用冻结锁文件与过滤执行 |
| Node.js 当前 LTS（24.x，或团队锁定的 LTS） | CI 运行环境 | 理解 runner、矩阵与引擎版本约束 |
| Vite 当前稳定版（6.x/7.x） | 构建产物 | 能输出静态资源并配合 CDN 路径 |
| ESLint 9 / TypeScript / Vitest | 质量门禁任务 | 能在流水线中无交互运行 |
| 模块联邦当前稳定版（Module Federation 2.x，含 Vite 插件） | 运行时模块共享 | 理解 remote/host/shared 概念与配置骨架 |
| CDN 与对象存储（概念认知） | 静态资源分发 | 理解上传、缓存键与失效刷新 |
| Turborepo 2.x（可选） | Monorepo 远程缓存 | 理解 CI 中缓存共享与增量构建 |

版本说明：

- GitHub Actions 的 action 版本更新较快，示例以当前稳定大版本为准，使用时应替换为经过验证的版本。
- 模块联邦最初由 Webpack 5 提供，Module Federation 2.x 提供了与构建器解耦的能力，可通过对应插件在 Vite 等工具中使用。
- 本单元聚焦概念与流水线骨架，不要求在课堂上搭建真实云环境。

开始前检查环境：

```bash
node -v
pnpm -v
git status
```

预期观察：

- 前两条输出版本；`git status` 确认当前在干净的练习仓库中。
- CI 的一切操作都应能先在本地以相同命令复现，因此先确认本地工具链可用。

## 详细的理论知识讲解和示例伪代码

### 1. 前端 CI/CD 总览

#### 1.1 定义

CI（持续集成）是在代码进入主干前，用自动化流程验证“这份变更是否健康”；CD（持续交付/持续部署）是在验证通过后，把产物自动送达测试、预发或生产环境。

前端 CI/CD 的典型链路：

```text
推送 / Pull Request
   ↓
CI：安装依赖 → lint → typecheck → test → build
   ↓
产出静态制品（HTML/JS/CSS/资源）
   ↓
CD：上传到对象存储/CDN → 刷新缓存 → 生成预览或正式环境
```

#### 1.2 工程化关系

每一步解决的问题不同，缺一则留有漏洞：

| 阶段 | 拦截的问题 |
|---|---|
| install（冻结锁文件） | 依赖未锁定、版本漂移 |
| lint | 代码风格与潜在错误模式 |
| typecheck | 类型不匹配、接口契约偏差 |
| test | 行为回归 |
| build | 构建失败、产物缺失 |

CI 是团队的质量底线，而不是“本地通过后的重复劳动”：本地环境与 runner 存在 Node 版本、操作系统、环境变量差异，许多问题只在 CI 暴露。

最小 GitHub Actions 工作流骨架：

```yaml
# .github/workflows/ci.yml
name: frontend-ci

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 启用 pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: 设置 Node
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 代码检查
        run: pnpm lint

      - name: 类型检查
        run: pnpm typecheck

      - name: 测试
        run: pnpm test

      - name: 构建
        run: pnpm build
```

`--frozen-lockfile` 保证 CI 严格按 lockfile 安装：lockfile 与 package.json 不一致时直接失败，而不是悄悄更新锁文件。

#### 1.3 常见误区

> CI 只在合并后跑，合并前靠大家自觉。

问题代码进入主干后会影响所有人，且定位“是哪次提交引入”更困难。门禁应作用于 Pull Request。

> CI 失败就点重跑，连日志都不看。

重跑只能解决偶发环境问题；代码缺陷不会因重跑消失。失败先读日志、定位步骤，再决定动作。

### 2. 质量门禁：lint、typecheck、test、build 的工程设计

#### 2.1 定义

质量门禁是一组必须全部通过才能合并的检查。设计门禁时应同时考虑“严格性”和“信号质量”：规则太松拦不住问题，规则太吵则会被团队无视。

#### 2.2 工程化关系

各任务应无交互、可在 CI 中一次跑完：

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "build": "tsc -b && vite build"
  }
}
```

`--max-warnings 0` 让警告也成为门禁信号，避免“警告堆积无人管”。

测试任务常见增强：

```yaml
# .github/workflows/ci.yml（节选）
- name: 单元测试
  run: pnpm test:coverage

- name: 上传覆盖率报告
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
    retention-days: 7
```

需要跨 Node 版本验证时可使用矩阵：

```yaml
jobs:
  test-matrix:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: [20, 22, 24]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
```

`if: always()` 表示即使前面步骤失败也执行，适合收集报告；`fail-fast: false` 让矩阵中一个版本失败时，其余版本继续跑完，以一次拿到完整兼容性证据。

门禁失败时的正确处理顺序：

```text
1. 定位失败步骤与首个错误
2. 在本地用相同命令复现
3. 修复并本地验证
4. 推送后确认 CI 全绿
```

#### 2.3 常见误区

> 为了让 CI 变绿，临时关闭报错规则或加跳过注释。

这是在用门禁失效换表面通过。规则误报应调整规则配置，业务问题则修复代码。

> build 任务只看退出码，不验证产物。

构建“成功”但产物缺文件（如 base 路径错误导致资源 404）不会退出失败。关键发布还应增加产物检查步骤（见第 4 节）。

### 3. 缓存：依赖缓存与构建缓存

#### 3.1 定义

缓存是把“上一次运行的可复用结果”保存起来供后续运行使用，目的是减少重复下载与重复计算。CI 中两类缓存最常见：

- 依赖缓存：pnpm store 与全局缓存；
- 构建/任务缓存：如 Turborepo 远程缓存、Vite 或 bundler 的缓存目录。

#### 3.2 工程化关系

`actions/setup-node` 在指定 `cache: pnpm` 后会基于 lockfile 自动维护 pnpm store 缓存：lockfile 不变则命中。

Monorepo 中可让 Turborepo 使用远程缓存，使不同 PR、不同 job 共享产物：

```yaml
# .github/workflows/ci.yml（节选）
- name: 安装依赖
  run: pnpm install --frozen-lockfile

- name: 构建（带远程缓存）
  run: pnpm turbo build
  env:
    TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
```

配合增量过滤，在 Monorepo 中只检查受影响的包：

```bash
# 仅对相对 main 发生变化的包及其下游执行
pnpm turbo test --filter="...[origin/main]"
pnpm turbo build --filter="...[origin/main]"
```

缓存与正确性必须同时成立：

```text
缓存命中的前提：输入指纹完全一致（源码、锁文件、配置、关键环境变量）
一旦依赖了未声明的输入（如本机时间、随机值、未纳入指纹的配置）
    → 命中旧结果，产生“缓存投毒”式错误
```

缓存不是制品（第 4 节会对比）：缓存可以随时删除、重建，服务于“加速”；制品是一次构建的正式输出，服务于“发布与追溯”。

排查缓存问题的思路：

```text
怀疑缓存导致错误
  → 使用无缓存模式重跑（禁用缓存或新建空缓存键）
  → 若禁用后通过，说明指纹配置有误
  → 修正 inputs/键策略，而不是永久关闭缓存
```

#### 3.3 常见误区

> 缓存整个 node_modules 目录。

node_modules 含平台相关二进制与软链接，跨机器还原易损坏。应缓存包管理器的 store，由安装步骤重建 node_modules。

> 缓存键不包含 lockfile 哈希。

依赖更新后仍命中旧缓存，产生版本不一致。键必须随锁文件变化而失效。

### 4. 制品（artifact）与构建产物检查

#### 4.1 定义

制品是流水线产出并保存的文件集合，前端的正式制品通常是构建目录（如 `dist/`），包含带 hash 的 JS/CSS、HTML、字体与图片。制品可被下游 job 下载、部署，或留存用于追溯。

#### 4.2 工程化关系

上传与下载制品：

```yaml
# .github/workflows/ci.yml（节选）
- name: 构建
  run: pnpm build

- name: 上传构建制品
  uses: actions/upload-artifact@v4
  with:
    name: web-dist
    path: dist/
    retention-days: 14
```

```yaml
# 部署 job 中下载同一份制品
jobs:
  deploy:
    needs: verify
    steps:
      - name: 下载制品
        uses: actions/download-artifact@v4
        with:
          name: web-dist
          path: dist/
      - name: 列出产物
        run: ls -R dist | head -n 50
```

制品的工程意义：

```text
单一事实来源：所有环境部署同一份构建产物，避免“各环境分别构建”造成差异
可追溯：保留制品即可知道某次发布的确切文件
职责分离：构建 job 与部署 job 解耦，部署失败不需重新构建
```

构建后应做产物健康检查，例如：

```bash
# 检查入口 HTML 存在
test -f dist/index.html
# 检查没有把超大文件误打进产物
find dist -type f -size +2M -print
# 检查产物中不包含演示密钥占位之外的可疑凭证模式
grep -R "sk-live-" dist || echo "未发现硬编码生产密钥"
```

产物中 hash 文件名与长缓存策略是配套的：文件内容变 → hash 变 → URL 变 → 自然绕过缓存；HTML 本身则应短缓存，保证总能拿到最新资源引用。

#### 4.3 常见误区

> 每个环境（staging/prod）各自重新构建一次。

环境差异本应由配置注入解决；重复构建会让“测试通过的产物”和“上线的产物”不是同一文件，埋下不一致风险。

> 制品永久保存、不加保留期。

制品占用存储且多数只有短期价值。应按追溯需求设置保留期，历史版本由版本化发布承载。

### 5. CD 发布：CDN、对象存储与预览环境

#### 5.1 定义

前端 CD 是把静态制品上传到对象存储并由 CDN 分发，同时处理缓存刷新；预览环境是为每个 Pull Request（或分支）生成一套临时可访问的完整环境，供评审、设计与产品验收。

#### 5.2 工程化关系

发布链路（概念级，工具无关）：

```text
下载制品
  ↓
上传到对象存储桶（按版本/前缀组织）
  ↓
CDN 回源指向桶
  ↓
对变更文件或 HTML 发起缓存失效（invalidation）
  ↓
返回访问地址并做冒烟检查
```

发布步骤示例（以通用上传工具占位，实际替换为云厂商 CLI）：

```yaml
# .github/workflows/deploy.yml（节选）
jobs:
  deploy-preview:
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: web-dist
          path: dist/
      - name: 上传预览环境
        run: |
          echo "将 dist 上传到 preview/${PR_ID} 前缀"
          echo "部署完成后执行冒烟检查"
        env:
          PR_ID: ${{ github.event.pull_request.number }}
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
```

预览环境的协作价值：

| 角色 | 用法 |
|---|---|
| 评审者 | 直接点开真实页面验证交互，不靠想象读 diff |
| 设计师 | 核对视觉还原 |
| 产品 | 合并前确认需求完成度 |
| 测试 | 在独立环境提前验证，互不干扰 |

生产发布应更谨慎，常见保护策略：

```text
仅 main 分支 / 标签触发
需要人工审批（environment protection）
发布后自动冒烟（首页状态码、关键资源可访问）
具备回滚路径（切回上一版本前缀或重新刷新缓存）
```

回滚静态应用通常很快：旧 hash 文件仍在存储中时，可让 HTML 指回旧版本资源；因此发布不宜立即清理历史文件。

#### 5.3 常见误区

> 上传完文件就认为发布成功，不做任何验证。

上传成功不等于页面可用：缓存未刷新、base 路径错误、某 chunk 缺失都会白屏。发布后冒烟是必须环节。

> 所有文件一律强缓存一年。

带 hash 的资源适合长缓存；HTML 必须可重新验证，否则新版本永远无法到达用户。

### 6. 微前端：概念、价值与代价

#### 6.1 定义

微前端是把一个大型前端应用按业务域拆成若干“可独立开发、独立部署”的小应用，由一个壳应用（shell）在运行时组合。它把后端微服务的“按团队边界拆分”的思想搬到前端。

```text
单体前端：
一个仓库、一次构建、一次发布，任何团队改动都耦合在一起

微前端：
壳应用（导航、布局、会话）
 ├─ 订单团队应用（独立部署）
 ├─ 商品团队应用（独立部署）
 └─ 营销团队应用（独立部署）
```

#### 6.2 工程化关系

它真正解决的是组织与交付问题：

- 团队自治：各团队自选发布节奏，不必协调全量发版窗口；
- 增量升级：老旧子应用可以独立重构，不逼全栈重写；
- 运行时拼装：新功能随子应用上线，壳应用保持稳定。

代价必须被正视（多数失败项目都低估了它们）：

| 代价 | 具体表现 |
|---|---|
| 运行时复杂度 | 加载编排、依赖协调、通信机制、错误隔离 |
| 样式与全局冲突 | 子应用样式互相污染，需要 Shadow DOM 或命名约定 |
| 用户体验 | 子应用分别加载可能产生闪烁、重复网络请求 |
| 一致性成本 | 设计系统、鉴权、监控口径需要跨团队统一 |
| 治理成本 | 版本兼容、契约管理、联调环境 |

因此微前端的决策顺序应是“先有组织痛点，再选架构”，而不是相反：一个小团队维护的单一应用，拆分只亏不赚。

子应用通信应走最小契约（如 props、事件、共享只读状态），避免重新耦合成“分布式单体”：

```text
允许：壳向子应用传入用户上下文；子应用抛出业务事件
避免：子应用之间直接互相调用内部 API、共享可变全局变量
```

#### 6.3 常见误区

> 用了微前端，团队之间就再也不用沟通。

共享依赖、设计系统、通信契约仍需协作。自治的是实现与发布节奏，不是接口契约。

> 先拆成微前端，再慢慢补样式隔离和监控。

隔离、鉴权、错误边界是地基，事后补代价极高，且会在用户侧先暴露故障。

### 7. 模块联邦：host、remote 与共享依赖

#### 7.1 定义

模块联邦（Module Federation）是一种运行时模块共享机制：一个应用（remote，远程模块提供方）把部分模块暴露给其他应用；另一个应用（host，宿主）在运行时加载这些模块，如同使用本地模块。多个应用还可以声明共享依赖，避免各带一份 React。

```text
host（壳应用）
 ├─ 本地模块：布局、导航
 └─ 运行时加载 remote：
       orderRemote 暴露 ./OrderApp
       promoRemote 暴露 ./PromoPanel
```

与传统 npm 共享代码相比，关键差异在加载时机：

```text
npm 包：构建期把代码打进各应用产物 → 升级必须重新构建消费方
模块联邦：运行时从 remote 加载 → remote 独立部署，host 不重新构建也能拿到新版
```

#### 7.2 工程化关系

remote 端配置骨架（以模块联邦插件概念字段示意，具体 API 以当前稳定版插件为准）：

```js
// apps/order/vite.config.js（示意）
import { defineConfig } from 'vite';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'orderRemote',
      filename: 'remoteEntry.js',
      exposes: {
        './OrderApp': './src/OrderApp.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
});
```

host 端声明远程模块：

```js
// apps/shell/vite.config.js（示意）
import { defineConfig } from 'vite';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    federation({
      name: 'shell',
      remotes: {
        orderRemote: 'http://localhost:3001/assets/remoteEntry.js',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
});
```

host 中按约定的虚拟模块或异步边界消费远程组件，并配合错误边界：

```tsx
// apps/shell/src/RemoteOrder.tsx
import { Component, type ReactNode } from 'react';

const RemoteOrder = React.lazy(() => import('orderRemote/OrderApp'));

class ErrorFallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return <div>订单模块暂时不可用，已降级显示基础信息。</div>;
    }
    return this.props.children;
  }
}

export function RemoteOrderSection() {
  return (
    <ErrorFallback>
      <RemoteOrder />
    </ErrorFallback>
  );
}
```

共享依赖要点：

- `singleton` 要求全局只加载一份，适合 React 这类“多实例即故障”的库；
- 共享版本不兼容时，加载可能失败或行为异常，因此版本策略必须统一；
- 共享不是免费午餐：协商与运行时解析增加启动复杂度。

#### 7.3 常见误区

> remote 地址挂了，host 只是少一个功能，不需要兜底。

若没有错误边界与加载兜底，远程入口加载失败可能拖垮整个页面。必须为每个远程边界准备降级 UI。

> 把所有依赖都设为 singleton 共享。

单例要求版本严格对齐，反而让各团队被版本锁死。只共享真正需要单实例、体积可观且兼容性可控的库。

### 8. 模块联邦与 Monorepo 结合、拆分边界与风险

#### 8.1 定义

模块联邦解决“运行时怎么拼装”，Monorepo 解决“源码怎么协作”。二者正交，常见组合是：一个 Monorepo 内同时管理 shell 与多个 remote，共享类型与设计系统通过 workspace 包在构建期共享，而具体业务页面通过联邦在运行时装配。

#### 8.2 工程化关系

典型组合结构：

```text
platform-monorepo/
├── apps/
│   ├── shell/          # host：导航、布局、鉴权上下文
│   ├── order/          # remote：暴露 OrderApp
│   └── promo/          # remote：暴露 PromoPanel
├── packages/
│   ├── ui/             # 构建期共享设计系统（workspace 协议）
│   ├── shared/         # 构建期共享类型与工具
│   └── federation-config/  # 联邦名称/共享依赖的统一配置
└── pnpm-workspace.yaml
```

分工原则：

```text
构建期共享（workspace 包）：稳定的类型、工具、设计系统
运行时共享（联邦）：需要独立部署节奏的业务子应用
```

拆分边界应跟随业务域与团队边界，而不是技术分层：

```text
好的 remote：订单中心——高内聚、对外暴露少量稳定入口
坏的 remote：按钮、表格等基础组件——变化频繁且被强依赖，更适合 workspace 包
```

风险清单与应对：

| 风险 | 后果 | 应对 |
|---|---|---|
| remote 不可用 | 页面区块白屏或整体崩溃 | 错误边界、加载超时、版本回退 |
| 版本不兼容 | 共享依赖协商失败 | 统一版本策略、契约测试、灰度发布 |
| 部署顺序耦合 | 新 host 依赖未发布的 remote | 接口向后兼容、先发布 remote、保留旧版本 |
| 网络与性能 | remoteEntry 与 chunk 过多、加载慢 | 预加载、按需暴露、CDN 与缓存、监控加载指标 |
| 调试困难 | 跨应用问题难复现 | 统一日志与 trace 标识、固定联调版本 |

CI/CD 也应随之调整：

```yaml
# .github/workflows/federation.yml（节选思路）
- name: 受影响包检查
  run: pnpm turbo lint typecheck test --filter="...[origin/main]"

- name: 构建 remote 与 host
  run: pnpm turbo build

- name: 分别发布
  run: |
    echo "remote 先发布并冒烟，再确认 host 可用"
```

演进建议从“构建期拆分”起步：先用 Monorepo 与包边界理顺依赖，确有独立部署诉求时再对个别业务域启用联邦。避免一步到位的全量联邦化。

#### 8.3 常见误区

> 认为 Monorepo 与模块联邦二选一。

两者层次不同，可以并用：构建期协作靠 Monorepo，运行时独立交付靠联邦。混淆两者会导致“该共享的类型走了网络、该独立的业务却被构建耦合”。

> 按组件颗粒度暴露大量 remote。

remote 过细会让运行时依赖图爆炸，版本协调成本远超收益。联邦的粒度应是“可独立交付的业务能力”。

## 课后题

1. 请描述前端 CI/CD 的完整链路，并说明 lint、typecheck、test、build 分别拦截什么类型的问题。
2. 为什么 CI 要使用 `--frozen-lockfile`？它与“在 CI 中自动更新 lockfile”相比，保护了什么？
3. 场景分析：某 PR 的 CI 在 test 步骤失败，同事连续点了三次“重新运行”指望恢复。请说明为什么这通常无效，并给出标准排查路径。
4. 依赖缓存与制品有什么本质区别？为什么推荐缓存 pnpm store 而不是直接缓存整个 node_modules？
5. 场景分析：团队为 staging 和 production 分别执行两次构建并分别部署。请分析这如何破坏“测试过的产物即上线产物”原则，并给出基于制品的改进方案。
6. 预览环境解决了协作中的什么问题？请分别从评审、设计、产品与测试的角度各举一个用法。
7. 微前端的核心价值是什么？请列出至少四类它引入的代价，并解释为什么小团队单体应用不应盲目拆分。
8. 模块联邦中 host、remote、shared 分别是什么？它与通过 npm 包共享代码，在“升级方式”上最关键的差异是什么？
9. 场景分析：上线后某个 remote 的 remoteEntry.js 无法访问，host 整个页面白屏。请指出缺失了哪些防护机制，以及正确的降级与发布顺序设计。
10. 场景分析：某团队把基础组件库拆成十几个联邦 remote，结果每次发版都要协调版本、页面加载明显变慢。请分析拆分粒度错在哪里，并给出“Monorepo + 联邦”混合方案的重构建议。

## 实践练习题

### 练习 1：完整的前端 CI 流水线

#### 任务

为一个 Vite + TypeScript 项目编写 GitHub Actions CI，在 Pull Request 上依次完成安装、lint、typecheck、test、build，并上传覆盖率与构建制品。

#### 步骤约束

1. 必须使用冻结锁文件安装；脚本命令与本地完全一致。
2. 配置 pnpm store 缓存，缓存键随 lockfile 变化。
3. 覆盖率在失败时也能上传；构建产物作为制品保留至少 7 天。
4. 故意制造一次 lint 或类型失败，记录 CI 红灯日志，修复后转绿。
5. 不得通过关闭规则或跳过检查来制造“假绿”。

#### 提交物

- CI workflow 文件与项目脚本；
- 红灯与绿灯的流水线记录（含失败步骤定位）；
- 制品与覆盖率上传证据；
- 排查过程简述。

#### 验收标准

- 五个检查阶段全部真实执行，顺序合理；
- 缓存命中可观察，键策略正确；
- 制品可被下载且内容完整；
- 失败被正确修复，不是重跑碰运气；
- 流水线可在新分支直接生效。

### 练习 2：预览环境与发布冒烟

#### 任务

在 CI 基础上增加部署流程：为 Pull Request 生成预览环境（可用本地静态服务器或模拟存储步骤演示），发布后执行冒烟检查；并实现一条受保护的生产发布路径骨架。

#### 步骤约束

1. 部署必须复用 CI 构建制品，禁止重新构建。
2. 预览地址需包含 PR 标识，并作为评论或输出返回。
3. 冒烟至少检查入口文件可访问、关键资源引用存在。
4. 生产路径需体现触发限制（main/标签）、人工审批占位与回滚说明。
5. 写清 hash 资源长缓存与 HTML 短缓存的配套策略。

#### 提交物

- 部署 workflow；
- 预览地址与冒烟记录；
- 发布/回滚说明文档；
- 缓存策略说明。

#### 验收标准

- 预览环境可访问且内容来自制品；
- 冒烟失败会使部署 job 失败；
- 生产路径具备触发保护与审批设计；
- 回滚路径具体可执行；
- 没有把密钥硬编码进 workflow。

### 练习 3：模块联邦 host/remote 演示

#### 任务

在 Monorepo 中创建一个 shell（host）与一个业务 remote，通过模块联邦在运行时加载业务模块，配置 React 单例共享，并为远程加载实现错误边界降级。

#### 步骤约束

1. remote 至少暴露一个完整业务组件，host 通过懒加载方式消费。
2. 共享 react/react-dom 为单例，版本通过 catalog 统一。
3. 停掉 remote 或改错地址，验证 host 显示降级 UI 而非白屏。
4. 独立构建两个应用，记录构建顺序与产物入口。
5. 在文档中说明：哪些能力适合联邦、哪些应留在 workspace 包。

#### 提交物

- shell 与 remote 的项目及联邦配置；
- 正常加载与降级两种状态记录；
- 构建与启动命令；
- 边界与风险说明。

#### 验收标准

- host 运行时成功渲染 remote 模块；
- remote 不可用时页面其余部分正常、降级可见；
- 单例共享生效，无重复 React 实例；
- 构建可独立完成，配置字段与文档一致；
- 能解释联邦与 Monorepo 的分工。

## 阶段验收作业

### 作业名称

从流水线到运行时组合的前端交付体系

### 作业场景

你负责一个多团队平台的前端交付体系。团队希望证明你不仅能让单个应用自动化测试与发布，还能为“多应用独立交付”建立可持续的运行时组合方案。你需要回答：

- 代码合并前有哪些自动化门禁？证据如何留存？
- 产物如何在预览与生产之间复用同一份制品？
- 发布失败、缓存异常、remote 不可用时如何降级与回滚？
- 哪些代码应在构建期共享，哪些能力应在运行时装配？
- 拆分边界如何跟随业务域，而不是制造分布式耦合？

### 提交物

```text
delivery-platform-lab/
├── apps/
│   ├── shell/
│   └── order/
├── packages/
│   ├── ui/
│   └── shared/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docs/
│   ├── release-and-rollback.md
│   └── federation-boundaries.md
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

提交清单：

1. CI：冻结安装、缓存、lint/typecheck/test/build 全门禁，覆盖率与制品留存。
2. CD：PR 预览环境（可模拟）、发布冒烟、受保护的生产路径与回滚说明。
3. 模块联邦：shell + order remote、单例共享、错误边界降级。
4. `docs/federation-boundaries.md`：构建期/运行时共享决策、拆分原则、风险与应对表。
5. README：流水线说明、复现方式、环境与密钥占位约定。

### 演示步骤

学员需要在 15 至 20 分钟内完成以下演示：

1. 推送一个变更，讲解 CI 各阶段并展示全绿与制品。
2. 展示一次失败门禁的定位与修复（可用历史记录）。
3. 打开 PR 预览环境并执行冒烟检查。
4. 演示生产发布路径的保护措施与回滚方案。
5. 在 shell 中正常加载 order 模块；再模拟 remote 故障展示降级。
6. 讲解拆分边界：为什么 ui/shared 走 workspace，order 走联邦。

导师可以临时改变 remote 地址或要求新增一个 remote，以验证配置与降级机制是否真实生效。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| CI 门禁设计 | 20 | 阶段完整、命令一致、冻结安装、失败可定位 |
| 缓存与制品 | 15 | 缓存键正确、制品复用、留存策略合理 |
| CD 发布与回滚 | 20 | 预览环境、冒烟、审批保护、回滚可执行 |
| 微前端概念与代价判断 | 10 | 价值与代价说清，拆分动机来自组织痛点 |
| 模块联邦实现 | 20 | host/remote/shared 正确，降级有效，无重复实例 |
| 边界治理与表达 | 15 | 构建期/运行时决策清晰，文档完整，风险有应对 |

细分评分规则：

#### CI 门禁设计：20 分

- 五阶段完整且顺序合理：8 分；
- 冻结锁文件与命令一致性：6 分；
- 失败定位与修复证据：6 分。

#### 缓存与制品：15 分

- 缓存键与 store 策略：6 分；
- 制品上传/下载复用：6 分；
- 覆盖率等证据留存：3 分。

#### CD 发布与回滚：20 分

- 预览环境与部署复用制品：7 分；
- 冒烟检查：6 分；
- 发布保护与回滚方案：7 分。

#### 微前端概念与代价判断：10 分

- 价值与组织关系：4 分；
- 代价与适用条件：6 分。

#### 模块联邦实现：20 分

- remote 暴露与 host 消费：7 分；
- 单例共享与版本统一：6 分；
- 错误边界与故障降级：7 分。

#### 边界治理与表达：15 分

- 构建期/运行时共享决策：6 分；
- 拆分原则与风险应对表：5 分；
- README 与演示质量：4 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. CI 门禁缺失关键阶段，或通过关闭规则、跳过检查制造假通过。
2. staging/production 使用不同构建产物，或部署过程绕过制品重新构建。
3. 发布后没有任何冒烟检查，且说不清回滚路径。
4. 远程模块加载失败时 host 白屏，没有错误边界与降级方案。
5. 共享依赖出现重复 React 实例或版本不兼容且未处理。
6. 把组件颗粒度内容大量联邦化，无法说明拆分边界依据。
7. 在 workflow 或文档中提交真实令牌、密钥等敏感信息。
8. 只提交截图，没有 workflow、源码与命令证据。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 设计前端 CI 流水线 | `ci.yml`、全绿记录与失败修复演示 |
| 配置缓存与管理制品 | 缓存命中证据、制品上传/下载与复用演示 |
| 完成 CDN 发布与预览环境 | `deploy.yml`、预览地址、冒烟与缓存策略说明 |
| 理解微前端价值与代价 | 概念问答与适用性判断 |
| 掌握模块联邦核心模型 | host/remote/shared 配置与运行演示 |
| 联邦与 Monorepo 结合治理 | 目录结构、边界文档与风险应对表 |
| 守住拆分边界与可用性 | 降级演示、版本策略与导师追问应答 |
