# 56-CI/CD 流水线与自动化部署

## 目标

当代码只在一名工程师的机器上构建和发布时，交付是不可控的：是否跑过测试全凭自觉，发布步骤靠口口相传，半夜上线靠人守着，出了问题只能手工回退。团队规模一旦扩大，就必须把“检查、构建、打包、发布”从个人动作变成由代码定义、由平台执行、对每次提交一致生效的自动化流水线，这就是 CI/CD。

本单元以 GitHub Actions 为主线，把质量门禁、镜像制品与自动发布串成一条完整链路，并理解流水线背后的工程原则——快速反馈、制品不可变、最小权限与可回滚。

完成本知识单元后，学员应能够：

1. 区分持续集成（CI）、持续交付与持续部署（CD）的概念边界，说明流水线要解决的核心问题。
2. 使用 GitHub Actions 的 workflow、job、step、runner、触发事件与表达式组织流水线，理解任务之间的并行与依赖。
3. 为 pnpm/Node 项目配置依赖缓存，缩短流水线执行时间，并理解缓存命中条件。
4. 编写 lint、typecheck、test、build 质量阶段，任一阶段失败即阻断后续流程。
5. 在流水线中构建并推送容器镜像到 GHCR，设计合理的标签策略，保证制品可追溯。
6. 正确使用 secrets 注入敏感信息，配置持续部署任务、分支门禁与环境审批，并理解回滚的基本方式。

本单元的核心信念是：流水线是团队的“自动化执法者”——它不相信“我本地测过了”，只相信可复现的命令与证据；同时，任何不能回滚的发布都不算真正完成，自动化必须为“安全撤退”留好通道。

## 技术栈

| 工具或服务 | 当前稳定版本线 | 用途 | 学习要求 |
|---|---|---|---|
| GitHub Actions | 平台当前版本 | CI/CD 流水线托管 | 掌握 workflow/job/step、触发、表达式、并发组 |
| actions/checkout | v4 | 拉取仓库代码 | 理解 fetch-depth 与令牌权限 |
| pnpm/action-setup | v4 | 安装 pnpm | 会与 packageManager 字段联动 |
| actions/setup-node | v4 | 安装 Node 与缓存 | 掌握 node-version 与 cache 参数 |
| actions/cache | v4 | 通用目录缓存 | 会按 lockfile 哈希配置缓存键 |
| docker/setup-buildx-action | v3 | 启用 Buildx 构建器 | 掌握多平台与缓存导出 |
| docker/build-push-action | v6 | 构建并推送镜像 | 掌握标签、摘要、缓存与 GHCR 推送 |
| GHCR（ghcr.io） | 平台服务 | 容器镜像仓库 | 会用 GITHUB_TOKEN 鉴权推送 |

约定：

- workflow 文件统一放在 `.github/workflows/`，命名使用小写连字符（如 `ci.yml`、`release.yml`）。
- Action 引用一律固定到主版本标签（如 `actions/checkout@v4`），不允许直接引用分支名或裸仓库名。
- 流水线中所有密钥只通过 `secrets.*` 引用，日志中只允许出现占位符 `<NOT_PRINTED>`，禁止 echo 真实值。
- 任务权限遵循最小化原则：在 workflow 级别声明 `permissions: contents: read`，需要写权限的 job 单独放开。
- 镜像标签必须包含完整 SHA 短哈希；`latest` 只作为指针，不能作为部署的唯一依据。

开始前检查环境：

```bash
git --version
gh --version
ls .github/workflows/ 2>/dev/null || echo "workflows 目录待创建"
```

预期观察：能看到 git、gh 版本；workflow 目录尚无文件是正常的，本单元会创建。

## 详细的理论知识讲解和示例伪代码

### 1. CI/CD 的概念与价值

#### 1.1 三个容易混淆的概念

```text
持续集成 CI（Continuous Integration）
  开发者频繁把代码合并到主干
  每次合并都自动执行安装、检查、测试
  目标：尽早发现集成问题

持续交付（Continuous Delivery）
  在 CI 之上，随时保持“可发布状态”
  发布动作需要人工批准，但发布过程已自动化
  目标：发布成为低风险、可重复的操作

持续部署（Continuous Deployment）
  通过质量门禁后，系统自动发布到生产
  无需人工批准
  目标：以提交为节奏的高频交付
```

持续交付与持续部署的分水岭只有一个：**上线生产那一下是否需要人按按钮**。两者都建立在同一条自动化流水线之上。

#### 1.2 流水线要解决的问题

| 没有流水线 | 有流水线 |
|---|---|
| “我本地测过”无法验证 | 每次提交在同一环境执行同样命令 |
| 发布步骤只存在于某个人脑中 | 发布过程以代码形式进版本库 |
| 坏代码可以被直接合并 | 质量门禁自动阻断 |
| 出问题靠手工重建回退 | 制品不可变、可按版本回退 |

#### 1.3 全栈关系

在全栈项目里，一次合并的影响面横跨两端：前端类型与后端契约可能同时改变。流水线必须在同一处验证整组变更——类型生成、前后端测试、镜像构建、编排配置校验都应纳入，而不是让前后端各自维护互不相关的检查。

#### 1.4 常见误区

> 误区一：CI 就是“在服务器上跑一下 build”。

构建成功只说明能打包，不代表行为正确。CI 的核心是用测试与检查提供集成证据。

> 误区二：CI 跑得越慢说明检查越全面，慢一点没关系。

反馈延迟会让开发者绕过流程或堆积未验证提交。流水线应在保证覆盖的前提下追求快速，慢任务拆分并行。

### 2. GitHub Actions 核心概念

#### 2.1 最小工作流

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

#### 2.2 概念职责

| 概念 | 职责 | 要点 |
|---|---|---|
| workflow | 一个 YAML 文件定义的完整流程 | 由 `on` 决定何时运行 |
| event | 触发事件 | push、pull_request、workflow_dispatch、schedule 等 |
| job | 一组在同一 runner 上执行的步骤 | 多个 job 默认并行，可用 needs 串联 |
| step | job 内的最小单元 | 可以是 `run` 命令或 `uses` 调用 Action |
| runner | 执行任务的机器 | GitHub 托管或自托管，注意系统镜像差异 |
| expression | `${{ ... }}` 表达式 | 访问上下文、做条件判断 |

#### 2.3 并行、依赖与条件

把检查拆成并行 job 可以显著缩短总时长，再用一个汇总 job 做门禁：

```yaml
jobs:
  typecheck:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test

  gate:
    needs: [typecheck, test]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-24.04
    steps:
      - run: echo "所有检查通过，允许进入发布阶段"
```

#### 2.4 手动触发与输入参数

排障或临时发布时，手工触发比推空提交更干净：

```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 部署目标环境
        type: choice
        options: [staging, production]
        required: true

jobs:
  deploy:
    runs-on: ubuntu-24.04
    steps:
      - run: echo "部署到 ${{ inputs.environment }}"
```

#### 2.5 全栈关系与常见误区

工作流本身是代码，需要评审与演进。全栈项目常见做法是为“PR 检查”和“发布”分别建文件：前者短平快、只做验证；后者只在主干或标签上运行、负责制品与部署，职责分离更易维护。

> 误区一：所有步骤塞进一个巨型 job，串行跑十几分钟。

无关步骤应拆分并行，耗时相近的检查同时执行，反馈更快。

> 误区二：Action 引用不固定版本，直接用 `@main`。

分支引用随时可能变化，供应链风险与不可复现性都很高，应固定主版本标签或提交摘要。

### 3. 依赖缓存

#### 3.1 setup-node 内置缓存

`actions/setup-node@v4` 在指定 `cache: pnpm` 后会自动按 lockfile 建立缓存，是最省心的方式：

```yaml
- uses: pnpm/action-setup@v4
  with:
    version: 9
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm
- run: pnpm install --frozen-lockfile
```

缓存命中条件是 lockfile 内容与操作系统一致；业务代码变化不会使缓存失效。

#### 3.2 显式 actions/cache

需要缓存构建产物或自定义目录时使用通用缓存动作：

```yaml
- uses: actions/cache@v4
  with:
    path: |
      node_modules
      .vite
    key: ${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

- `key`：精确命中键，包含 lockfile 哈希。
- `restore-keys`：精确键未命中时的前缀回退，可复用部分旧缓存。

通常不建议直接缓存 `node_modules` 与包管理器 store 混用；优先缓存 store，再执行安装，由包管理器还原依赖结构。

#### 3.3 Docker 层缓存

镜像构建同样需要缓存，避免每次从零拉基础层与重装系统依赖：

```yaml
- uses: docker/setup-buildx-action@v3
- uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-buildx-
```

#### 3.4 验证与常见误区

在日志中观察 `Cache Status` 或安装步骤耗时：命中时安装时间应明显下降。缓存不是“命中就一定正确”，恢复后仍应执行 `--frozen-lockfile` 安装，由包管理器校验完整性。

> 误区一：缓存键不含 lockfile 哈希，依赖更新后还在用旧缓存。

键必须随依赖清单变化，否则会固化过期依赖。

> 误区二：把缓存当作制品仓库。

缓存是加速手段，可能被随时淘汰；发布制品必须推送到正式仓库，不能依赖缓存恢复。

### 4. 质量阶段：lint、typecheck、test、build

#### 4.1 失败即停的语义

GitHub Actions 中任何一步以非零退出码结束，该 job 立即标记失败，后续步骤与依赖它的 job 都不会执行。这与第 01 单元建立的“退出码是给自动化看的”心智模型完全一致：脚本必须在失败时返回非零，不能只打印错误。

#### 4.2 可复用的检查片段

```yaml
jobs:
  verify:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: 代码规范
        run: pnpm lint
      - name: 类型检查
        run: pnpm typecheck
      - name: 单元测试
        run: pnpm test -- --coverage
      - name: 构建
        run: pnpm build
      - name: 上传覆盖率
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage
```

`if: always()` 让产物上传即使在前面失败时也执行，便于分析失败现场；但这不会改变 job 失败状态。

#### 4.3 测试环境服务

依赖数据库的集成测试可在流水线中启动临时服务容器，与应用测试在同一 job 网络：

```yaml
jobs:
  integration:
    runs-on: ubuntu-24.04
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: <NOT_PRINTED>
          POSTGRES_DB: articles_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U test"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 10
    env:
      DATABASE_URL: postgresql://test:***@localhost:5432/articles_test
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test:integration
```

#### 4.4 全栈关系与本地对齐

CI 与本地必须执行同一套脚本，避免“本地命令 A、CI 命令 B”。所有检查以 `package.json` 脚本为唯一入口：

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:integration": "vitest run --config vitest.integration.ts",
    "build": "pnpm typegen && vite build"
  }
}
```

#### 4.5 常见误区

> 误区一：CI 失败后只会点 “Re-run failed jobs”，不读日志。

重跑只对基础设施抖动有意义。真正的失败要看第一条错误输出与退出码。

> 误区二：为了合并分支临时加 `|| true` 让检查永远成功。

这会让门禁彻底失效。检查无法通过时应修代码或在评审中调整规则，不能欺骗自动化。

### 5. 镜像构建与推送

#### 5.1 发布工作流骨架

```yaml
name: release

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  image:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4

      - uses: docker/setup-buildx-action@v3

      - name: 登录 GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: 生成镜像标签
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository }}/articles-api
          tags: |
            type=sha,format=long,prefix=
            type=ref,event=branch
            type=raw,value=latest,enable={{is_default_branch}}

      - name: 构建并推送
        uses: docker/build-push-action@v6
        with:
          context: ./apps/api
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

#### 5.2 标签策略

| 标签 | 含义 | 用途 |
|---|---|---|
| `sha-<完整哈希>` | 与提交一一对应，不可变 | 部署与回滚的精确依据 |
| `main` | 分支滚动指针 | 标识最新主干构建，不用于精确定版 |
| `latest` | 默认分支最新构建 | 仅方便人工拉取，不能作为部署凭据 |

部署系统必须使用 SHA 标签（或摘要），让“哪个提交在生产”可直接读出。

#### 5.3 构建摘要与产物证明

构建后可以把镜像摘要导出为作业产物，部署阶段按摘要拉取：

```bash
# 概念步骤：metadata-action 与 build-push-action 会输出 digest
# 部署文件中记录：
echo "image=ghcr.io/org/repo/articles-api@sha256:<DIGEST>" >> release.txt
```

配合 `actions/upload-artifact@v4`，发布记录与制品绑定，审计时可追溯到具体提交。

#### 5.4 全栈关系与常见误区

一次发布通常包含多个镜像（api、web）。它们应在同一次工作流运行中构建，共享同一个提交哈希标签，使部署单元内部版本自洽；不允许 api 用周一的镜像、web 用周三的镜像拼凑。

> 误区一：每次构建都推送 `latest`，部署时直接拉 `latest`。

`latest` 会随构建漂移，无法确定生产版本，回滚也失去目标。

> 误区二：把构建参数中的密钥放进镜像层或缓存。

密钥应通过短时密钥挂载传入构建期，且不出现在最终层；能进入镜像的内容都应视为可被他人读取。

### 6. Secrets 与敏感信息

#### 6.1 secrets 的注入方式

敏感信息在仓库或组织设置中登记，流水线通过上下文引用，以环境变量传入具体步骤：

```yaml
jobs:
  deploy:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - name: 部署
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: |
          ./scripts/deploy.sh
```

脚本只从环境变量读取，不接受命令行明文传参（进程列表可能暴露参数）：

```bash
#!/usr/bin/env bash
set -euo pipefail

if [ -z "${DEPLOY_TOKEN:-}" ]; then
  echo "缺少 DEPLOY_TOKEN" >&2
  exit 1
fi

# 只打印是否存在，绝不打印值
echo "token loaded: <NOT_PRINTED>"
```

#### 6.2 最小权限

- workflow 顶层默认 `permissions: contents: read`，按 job 追加最小权限。
- 自动令牌 `GITHUB_TOKEN` 只在本次运行期间有效，优先于自建长期令牌。
- 长期云凭证应通过 OIDC 联合身份换取短时凭据，避免存储永久密钥：

```yaml
permissions:
  id-token: write
  contents: read
steps:
  - uses: some-cloud/auth-action@v3
    with:
      workload-identity-provider: <PROVIDER_ID_PLACEHOLDER>
```

#### 6.3 防止日志泄露

GitHub 会自动掩码已登记的 secret 值，但不能依赖这一层作为唯一防线：

```yaml
- name: 安全执行
  env:
    API_KEY: ${{ secrets.API_KEY }}
  run: |
    # 禁止 set -x 后展开含密钥的命令
    node scripts/publish.js
```

调试时若必须输出结构，先对值做脱敏（只显示长度或前后缀掩码），再打印。

#### 6.4 全栈关系与常见误区

全栈流水线涉及仓库、镜像库、部署目标三类凭证，权限边界不同。登记密钥时应按用途拆分（推送镜像一个、部署一个），一把令牌走全程会使任何一次泄露的影响面最大化。

> 误区一：为了让所有 job 都方便，把 secret 配置成全局可见并放开全部权限。

可见范围与权限都应最小化，job 不用就不给。

> 误区二：把 `.env` 连同真实值提交进仓库，再用 secrets 只是“多一道装饰”。

进入 Git 历史的值应视为已泄露，需要轮换；secrets 不能替代版本库卫生。

### 7. 持续部署

#### 7.1 带环境审批的部署

使用 GitHub Environments 把预发与生产区分开，生产环境要求指定评审人批准后才执行：

```yaml
jobs:
  deploy-staging:
    needs: image
    runs-on: ubuntu-24.04
    environment: staging
    steps:
      - name: 部署到预发
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: ./scripts/deploy.sh staging

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-24.04
    environment:
      name: production
    steps:
      - name: 部署到生产
        env:
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
        run: ./scripts/deploy.sh production
```

在仓库设置中为 `production` 环境添加 Required reviewers：job 会停在等待审批，批准后才继续。这让团队处于“持续交付”状态——随时可发，发布一下由人确认。

#### 7.2 部署脚本的幂等要求

部署脚本必须可重复执行而不产生重复资源：

```bash
#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="$1"
IMAGE="ghcr.io/${GITHUB_REPOSITORY}/articles-api:sha-${GITHUB_SHA}"

echo "deploying ${IMAGE} to ${ENVIRONMENT}"
# 概念步骤（实际命令随平台不同）：
# 1. 拉取指定 SHA 镜像
# 2. 以滚动方式替换实例
# 3. 等待新实例健康检查通过
# 4. 健康后再切换流量；失败则保持旧版本并退出非零
```

#### 7.3 并发控制与部署安全

同一环境的两次部署同时进行会造成状态混乱，用并发组让新运行排队或取代旧运行：

```yaml
jobs:
  deploy-production:
    concurrency:
      group: production
      cancel-in-progress: false
```

`cancel-in-progress: false` 保证生产部署不被新提交打断；预发场景可以设为 true，让最新提交优先。

#### 7.4 全栈关系与发布后验证

部署不等于完成，发布后应自动冒烟：

```ts
// 概念伪代码：smoke.ts 只验证关键链路
async function smoke(baseUrl: string): Promise<void> {
  const health = await fetch(`${baseUrl}/health`);
  if (!health.ok) throw new Error('健康检查失败');

  const response = await fetch(`${baseUrl}/v1/articles?page=1`);
  if (!response.ok) throw new Error('列表接口异常');
}

smoke(process.env.SMOKE_BASE_URL as string).catch((error) => {
  console.error(error);
  process.exit(1);
});
```

冒烟失败应让部署 job 失败并触发回退决策，而不是静默收尾。

#### 7.5 常见误区

> 误区一：部署脚本直接 SSH 到机器上 git pull、npm install。

这是“雪花服务器”模式：机器状态不可控、无法回滚。部署应发布不可变镜像并滚动替换。

> 误区二：发布后没有任何自动验证，全靠用户发现问题。

最小冒烟与监控是发布的一部分，应随流水线自动执行。

### 8. 分支门禁、保护规则与回滚

#### 8.1 分支保护与必过检查

在 GitHub 仓库设置中对主干启用 Branch protection：

```text
- Require a pull request before merging：禁止直推
- Require status checks to pass：指定 ci 的关键 job 必过
- Require branches to be up to date：合并前必须与主干同步
- Require conversation resolution：评审意见解决后才能合并
- Restrict who can push：限定可直接操作的人
```

被设为必过的检查名称必须与 workflow 中的 job 名一致；检查不通过或未运行时，合并按钮保持禁用。

#### 8.2 制品不可变与回滚方式

回滚的前提是“旧版本依然存在且已知版本号”。常见回滚方式：

| 方式 | 做法 | 适用 | 注意 |
|---|---|---|---|
| 制品回滚 | 把部署目标重新指回上一个 SHA 标签 | 应用代码问题，最快 | 数据库迁移若不兼容需一并评估 |
| 流水线重放 | 对旧提交重新触发已验证的发布流程 | 需要重建部署记录 | 不应重新构建，尽量复用旧制品 |
| 前向修复 | 快速提交修复并走正常流水线 | 无法简单回退的变更 | 依赖流水线足够快 |

容器场景首选“重新指向旧镜像”：因为制品不可变，旧版本与当初验证过的内容完全一致，回滚是一次确定性操作。

#### 8.3 数据库变更的回滚约束

代码可以秒级回退，数据库结构不能简单“撤销”。安全策略是把一次变更拆成兼容式多步：

```text
第 1 步：扩展（新增表/字段，向后兼容），先部署
第 2 步：迁移数据（双写或回填）
第 3 步：切换应用读取新结构
第 4 步：确认稳定后，再发布清理（删除旧字段）
```

这样任何阶段回滚代码都不会撞上不兼容的数据库结构；删除操作与扩展操作绝不能放在同一次发布里。

#### 8.4 全栈关系与常见误区

门禁、发布、回滚共同构成交付安全网：门禁防止坏变更进入，制品策略保证变更可定位，回滚通道保证事故可收敛。全栈工程师要对整条链路负责，不能只关心“我的服务发出去了”。

> 误区一：认为只要有回滚按钮就高枕无忧。

回滚不能覆盖不兼容迁移、外部副作用（已发通知、已扣款）。关键仍在变更设计与发布节奏。

> 误区二：主干可以热修直推，事后再补流程。

绕过门禁的提交不会被验证，事故往往就来自“这次特殊”。热修也应走最短的 PR 与流水线。

## 课后题

1. 请用自己的语言区分持续集成、持续交付与持续部署。持续交付与持续部署的分水岭是什么？
2. 场景分析：团队 CI 一次要跑 20 分钟，开发者开始减少合并频率、攒一大堆代码一起提。这会带来什么风险？你会从哪些方面缩短反馈时间？
3. workflow、job、step、runner 分别是什么？把检查拆成多个并行 job 时，如何用一个汇总 job 做最终门禁？
4. 场景分析：某流水线中所有 Action 都以 `@main` 引用，某天上游 Action 更新后流水线集体失败。问题出在哪？正确的版本固定方式是什么？
5. setup-node 的 pnpm 缓存命中条件是什么？缓存键为什么必须包含 lockfile 哈希？缓存和正式制品仓库的本质区别是什么？
6. 场景分析：PR 检查失败，学员直接在命令后面加 `|| true` 让其变绿后合并。请说明这为什么是严重违规，正确应对失败的顺序是什么？
7. 镜像标签为什么必须包含提交 SHA，而部署不能只使用 `latest`？请描述一次从“生产故障”到“确定回滚目标”所需的信息链路。
8. 场景分析：部署 job 需要一个云平台令牌，学员把令牌写在 workflow 的环境变量默认值里并提交。请指出风险，并给出 secrets 注入与最小权限的正确做法。
9. 什么是环境审批与并发组？生产部署为什么不应被新提交中断，而预发部署通常允许被取代？
10. 场景分析：一次发布包含代码与数据库字段删除，上线后发现严重缺陷想要回滚，却发现旧代码无法兼容新库结构。请说明问题根源，并描述把该变更改造为可回滚发布的分步方案。

## 实践练习题

### 练习 1：PR 质量门禁工作流

#### 任务

为一个 pnpm + TypeScript 项目建立在 PR 与主干推送时运行的质量流水线，覆盖安装到构建全过程。

#### 步骤约束

1. 创建 `.github/workflows/ci.yml`，触发于 push 到 main 与针对 main 的 pull_request。
2. workflow 顶层声明最小权限 `contents: read`。
3. 使用固定版本的 checkout、pnpm/action-setup、setup-node，Node 版本 20 并启用 pnpm 缓存。
4. 依次执行 `--frozen-lockfile` 安装、lint、typecheck、test、build。
5. 故意制造一次 lint 失败提交 PR，记录失败现象，再修复重新通过。
6. 在 README 中写明每个检查的含义与失败后的处理方式。

#### 提交物

- `ci.yml`；
- 一次失败与一次成功的运行记录（含关键日志）；
- README 说明；
- 200 字以内的门禁实践总结。

#### 验收标准

- PR 上能看到检查状态，失败时合并被阻断；
- 缓存实际命中并有日志证据；
- 所有 Action 固定主版本；
- 失败通过修代码解决，没有 `|| true` 等绕过；
- 日志中无敏感信息。

### 练习 2：镜像构建、标签与推送

#### 任务

在流水线中把容器化 API 构建为镜像并推送到 GHCR，形成与提交绑定的不可变制品。

#### 步骤约束

1. 新建 `release.yml`，在主干推送时运行，设置 `packages: write` 权限。
2. 使用 setup-buildx、login-action（GHCR + GITHUB_TOKEN）、metadata-action 生成标签。
3. 标签至少包含完整 SHA 标签；默认分支额外提供 `latest`，并说明其仅为指针。
4. build-push-action 启用 GHA 缓存（cache-from/cache-to）。
5. 构建后记录镜像摘要，作为作业产物上传。
6. 连续两次推送，验证第二次构建利用缓存，并确认两个 SHA 标签各自独立可拉取。

#### 提交物

- `release.yml`；
- GHCR 中的镜像与标签截图或文本记录；
- 镜像摘要产物；
- 缓存命中与镜像拉取验证记录。

#### 验收标准

- SHA 标签与提交一一对应；
- 推送使用自动令牌，没有登记额外长期密码；
- 两次构建均成功，第二次有缓存收益；
- 摘要可追溯到具体提交；
- 仓库与日志中没有真实云凭证。

### 练习 3：持续部署、审批与回滚演练

#### 任务

把镜像发布延伸为自动部署到预发、审批后部署到生产的完整流程，并完成一次真实回滚演练。

#### 步骤约束

1. 定义 staging 与 production 两个 Environments，生产配置至少一名 Required reviewers。
2. 部署脚本以 SHA 标签为输入，必须幂等，禁止 SSH 手工改机器；部署参数与令牌通过 secrets 以环境变量注入。
3. 生产 job 使用并发组且不允许取消进行中的部署。
4. 部署后自动执行健康检查与列表接口冒烟，失败时 job 失败。
5. 记录最近两个版本；在生产部署 v2 后，通过重新指回 v1 的 SHA 标签完成回滚演练，并验证服务恢复。
6. 在文档中写明回滚步骤、责任人与数据库变更注意事项。

#### 提交物

- 更新后的 `release.yml`；
- 幂等部署脚本与冒烟脚本；
- 环境审批配置说明；
- 部署、冒烟、回滚的完整运行记录；
- runbook（含回滚决策与数据库兼容要求）。

#### 验收标准

- 预发自动部署、生产需人工批准；
- 同环境并发部署被正确控制；
- 冒烟失败会让发布失败；
- 回滚通过旧 SHA 标签完成且服务恢复；
- 全程无明文密钥，权限最小化。

## 阶段验收作业

### 作业名称

全栈项目 CI/CD 流水线与可回滚发布

### 作业场景

“文章与评论”系统已经容器化，团队现在要求把交付彻底自动化：每个 PR 有统一质量门禁；合并主干后自动构建与提交绑定的镜像；预发自动发布、生产审批发布；发布后自动冒烟；任何版本都可以通过旧镜像确定性回滚。你需要独立设计并实现这条流水线，并通过一次真实演练证明它有效。

### 提交物

```text
cicd-lab/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── release.yml
├── scripts/
│   ├── deploy.sh
│   └── smoke.ts
├── docs/
│   ├── pipeline.md
│   └── rollback-runbook.md
└── README.md
```

### 必做内容

1. `ci.yml` 至少覆盖 lint、typecheck、test、build；涉及数据库的测试可用 service 容器。
2. `release.yml` 完成镜像构建、SHA 标签、摘要记录、推送到 GHCR。
3. 预发环境自动部署，生产环境配置审批；部署脚本幂等并以 SHA 标签定版。
4. 部署后自动冒烟，失败阻断流程；生产部署使用并发组保护。
5. 全部敏感信息通过 secrets 与环境变量传递，权限最小化，无明文密钥。
6. 在 `pipeline.md` 中画出从 PR 到生产回滚的完整流程图与任务依赖。
7. 完成一次 v1 → v2 → 回滚 v1 的演练，并在 runbook 中记录每步命令与结果。
8. 在文档中说明数据库变更的兼容式发布要求。

### 演示步骤

学员需要在 25 分钟内完成以下演示：

1. 提交一个 PR，展示质量门禁逐项执行，并现场制造一次失败再修复。
2. 合并主干，展示镜像构建、SHA 标签与推送结果。
3. 展示预发自动部署与冒烟通过。
4. 演示生产环境审批流程，批准后完成部署与冒烟。
5. 发布一个带可见变更的 v2，再通过重新指向 v1 SHA 标签完成回滚。
6. 讲解流水线权限、密钥注入与并发控制设计。

导师可以要求查看某次历史运行的日志与镜像摘要，或临时追问“这次数据库变更能否与代码同批回滚”，验证学员是否真正理解发布与回滚边界。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| CI 质量门禁 | 25 | 四类检查齐全，失败可阻断合并，缓存有效，版本固定 |
| 镜像制品管理 | 20 | SHA 标签、摘要、推送与追溯链路完整 |
| 持续部署与审批 | 20 | 预发自动、生产审批，部署幂等，并发控制正确 |
| 发布验证与回滚 | 15 | 冒烟自动化，回滚演练成功，制品复用旧版本 |
| 密钥与权限 | 10 | secrets 注入、最小权限，无明文敏感信息 |
| 文档与表达 | 10 | 流程图与 runbook 清晰，能指导他人操作 |

细分评分规则：

#### CI 质量门禁：25 分

- 工作流触发与权限配置正确：7 分；
- lint/typecheck/test/build 齐全：10 分；
- 缓存命中与失败阻断有效：8 分。

#### 镜像制品管理：20 分

- 构建与推送链路正确：8 分；
- SHA 标签与摘要可追溯：7 分；
- 多镜像版本自洽：5 分。

#### 持续部署与审批：20 分

- 双环境与审批配置正确：8 分；
- 部署脚本幂等：7 分；
- 并发组与部署顺序正确：5 分。

#### 发布验证与回滚：15 分

- 冒烟自动执行并能拦截失败：7 分；
- 回滚演练成功且使用旧制品：8 分。

#### 密钥与权限：10 分

- secrets 注入规范、日志无泄露：6 分；
- 权限最小化、优先短时凭据：4 分。

#### 文档与表达：10 分

- 流水线流程图完整：5 分；
- runbook 可执行、表达清晰：5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. PR 检查不能阻断失败合并，或门禁通过 `|| true`、关闭规则等方式被绕过。
2. 镜像只推送 `latest`，无法确定生产版本或无法按提交回滚。
3. 生产部署无审批、无并发保护，或部署依赖登录机器手工修改。
4. 回滚演练失败，或回滚需要重新构建而非复用旧制品。
5. workflow、脚本或日志中出现真实令牌、密码等敏感信息。
6. Action 引用分支名等漂移版本，或 job 权限被无差别放开。
7. 只提交截图，没有 workflow 源文件、脚本与运行记录。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解 CI/CD 概念与价值 | pipeline.md 概念图与现场讲解 |
| 使用 GitHub Actions 组织流水线 | ci.yml、release.yml 的任务结构 |
| 配置依赖缓存 | 缓存命中日志与缓存键配置 |
| 编写质量阶段 | 四类检查与失败/修复记录 |
| 构建推送镜像 | GHCR 标签、摘要与追溯记录 |
| 管理 secrets 与持续部署 | 环境审批、密钥注入与部署脚本 |
| 掌握门禁与回滚 | 分支保护说明与回滚演练记录 |

### 提交前自检

- [ ] PR 上四个质量检查全部运行，失败时无法合并。
- [ ] 所有 Action 固定主版本标签，无分支引用。
- [ ] 依赖缓存键包含 lockfile 哈希，命中有日志证据。
- [ ] 镜像包含 SHA 标签并记录摘要，可按提交追溯。
- [ ] 预发自动部署、生产需审批，部署脚本幂等。
- [ ] 冒烟脚本在部署后自动执行，失败会阻断流程。
- [ ] secrets 只通过环境变量注入，日志中不出现真实值。
- [ ] 回滚演练复用旧 SHA 镜像成功，数据库兼容策略已写明。
