# GitHub Actions 入门：前端 CI/CD 第一步

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L3 工程化与质量保障
> - 先修：[04-测试策略与覆盖率](../04-自动化测试/04-测试策略与覆盖率.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[GitHub Actions](https://docs.github.com/actions)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 CI/CD 的核心概念和在前端项目中的价值
- 掌握 GitHub Actions 的工作机制和 YAML 配置结构
- 能独立配置触发条件、缓存策略、Matrix 矩阵测试
- 完成后能搭建一个包含 Lint → 类型检查 → 测试 → 构建的完整 CI 流水线

---

## 内容讲解

### 1. CI/CD 核心概念

在开始写配置之前，先理解这三个术语到底在说什么：

```
传统手动开发流程（无 CI/CD）：

  开发者本地  ──►  手动运行 lint  ──►  手动跑测试  ──►  手动构建
       │                                                         │
       └────────── 手动 FTP 上传到服务器 ←────────── 手动压缩打包 ←┘
       
  问题：靠人记忆，经常漏步骤，每次部署心惊胆战


有 CI/CD 后的自动化流程：

  开发者 push 代码
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │  CI（持续集成）                                    │
  │  ├─ 自动安装依赖                                   │
  │  ├─ 自动运行 Lint                                  │
  │  ├─ 自动运行类型检查                                │
  │  ├─ 自动运行单元测试                                │
  │  └─ 自动构建，验证是否能 build 成功                  │
  └──────────┬──────────────────────────────────────┘
             │ 全部通过 ✓
             ▼
  ┌─────────────────────────────────────────────────┐
  │  CD（持续交付 / 持续部署）                          │
  │  ├─ 生成构建产物（dist/）                           │
  │  ├─ 部署到预览环境（PR Preview）                    │
  │  └─ 合并到 main 后自动部署到生产环境                 │
  └─────────────────────────────────────────────────┘
```

**三个概念的精确含义：**

| 术语 | 含义 | 在前端项目中的体现 |
|------|------|-------------------|
| **持续集成 (CI)** | 频繁将代码合并到主干，每次合并自动构建和测试 | PR 提交后自动跑 Lint + Test + Build |
| **持续交付 (CD)** | 代码随时可以手动部署到生产环境 | 构建产物就绪，点击按钮即可发布 |
| **持续部署 (CD)** | 代码通过测试后自动部署到生产环境 | 合并到 main 后自动上线，无需人工干预 |

> 前端项目通常走「持续部署」：合并到 main → 自动构建 → 自动推到 CDN/静态托管平台。

### 2. GitHub Actions 工作机制

GitHub Actions 的运行模型可以用一个层级结构来理解：

```
Workflow（工作流）
  │
  ├── Job A（作业，在独立虚拟机中运行）
  │     ├── Step 1：拉取代码（使用 action：actions/checkout）
  │     ├── Step 2：安装 Node.js（使用 action：actions/setup-node）
  │     ├── Step 3：安装依赖（直接运行 shell 命令）
  │     └── Step 4：运行测试（直接运行 shell 命令）
  │
  ├── Job B（可以和 Job A 并行运行）
  │     ├── Step 1：拉取代码
  │     └── Step 2：运行 Lint
  │
  └── Job C（依赖 Job A 和 Job B 都完成后才运行）
        ├── Step 1：下载构建产物
        └── Step 2：部署到服务器
```

**各层级说明：**

- **Workflow**：一个 YAML 文件，定义一整套自动化流程，放在 `.github/workflows/` 目录下
- **Job**：Workflow 中的一组 Step，每个 Job 在独立的虚拟机（Runner）中执行，默认并行
- **Step**：Job 中的单个执行步骤，可以是运行一个 Action，也可以是执行一条 shell 命令
- **Action**：可复用的代码片段，类似 npm 包，由社区或 GitHub 官方提供

### 3. YAML 配置文件结构

每个 Workflow 文件由以下核心字段构成：

```yaml
# .github/workflows/ci.yml

# ============================================
# 1. name：工作流名称，会显示在 GitHub Actions 页面
# ============================================
name: Frontend CI

# ============================================
# 2. on：定义触发条件（什么时候运行这个工作流）
# ============================================
on:
  # 当推送到 main 和 develop 分支时触发
  push:
    branches:
      - main
      - develop

  # 当有人向 main 分支创建 Pull Request 时触发
  pull_request:
    branches:
      - main
    # 只监听以下路径的变更，避免无关文件的改动触发 CI
    paths:
      - 'src/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - '.github/workflows/**'

  # 定时任务：北京时间每天凌晨 2 点自动运行
  schedule:
    - cron: '0 18 * * *'  # UTC 18:00 = 北京时间 02:00

  # 允许手动在 GitHub 页面上点击按钮触发
  workflow_dispatch:
    inputs:
      environment:
        description: '部署到哪个环境？'
        required: true
        type: choice
        options:
          - staging
          - production

# ============================================
# 3. env：全局环境变量，所有 Job 都能使用
# ============================================
env:
  NODE_VERSION: '24'
  PNPM_VERSION: '10'

# 2026-10 基线：Node 24 为当前 LTS，Node 22 处于维护期。
# Node 18/20 已结束官方支持，不应继续作为新项目的常规 CI 基线。

# ============================================
# 4. jobs：定义需要执行的任务
# ============================================
jobs:
  # ---------- Job 1：代码质量检查 ----------
  lint-and-typecheck:
    name: Lint & Type Check
    # 指定运行的操作系统
    runs-on: ubuntu-latest

    # 超时时间：防止某个步骤卡死导致 Runner 一直消耗分钟数
    timeout-minutes: 10

    steps:
      # Step 1：拉取仓库代码到 Runner
      - name: 拉取代码
        uses: actions/checkout@v4

      # Step 2：安装 pnpm 包管理器
      - name: 安装 pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      # Step 3：安装 Node.js
      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          # 让 setup-node 自动读取 pnpm 的缓存配置
          cache: 'pnpm'

      # Step 4：安装项目依赖
      - name: 安装依赖
        run: pnpm install --frozen-lockfile
        # --frozen-lockfile：严格使用 lock 文件，不允许自动更新

      # Step 5：运行 ESLint 检查
      - name: 运行 ESLint
        run: pnpm run lint

      # Step 6：运行 TypeScript 类型检查
      - name: 运行类型检查
        run: pnpm run typecheck

  # ---------- Job 2：单元测试（Matrix 多版本并行） ----------
  unit-test:
    name: Test (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest
    timeout-minutes: 15

    # Matrix 策略：用不同 Node.js 版本并行跑测试
    strategy:
      # fail-fast: false 表示即使某个版本失败，其他版本继续跑
      fail-fast: false
      matrix:
        node-version: [22, 24]

    steps:
      - name: 拉取代码
        uses: actions/checkout@v4

      - name: 安装 pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: 安装 Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 运行单元测试
        run: pnpm run test -- --coverage
        # --coverage：生成覆盖率报告，方便后续上传到 Codecov 等服务

      # 上传测试覆盖率报告（如果使用了 Codecov 等服务）
      - name: 上传覆盖率到 Codecov
        uses: codecov/codecov-action@v4
        if: matrix.node-version == '20'  # 只在其中一个版本上传，避免重复
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # ---------- Job 3：构建验证 ----------
  build:
    name: Build Check
    runs-on: ubuntu-latest
    # needs：让 build Job 在 lint 和 test 都通过后才运行
    needs: [lint-and-typecheck, unit-test]
    timeout-minutes: 10

    steps:
      - name: 拉取代码
        uses: actions/checkout@v4

      - name: 安装 pnpm
        uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: 安装 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 构建项目
        run: pnpm run build
        env:
          # 注入构建时的环境变量
          VITE_APP_ENV: production

      # 上传构建产物作为 artifact，供后续部署 Job 使用
      - name: 上传构建产物
        uses: actions/upload-artifact@v4
        with:
          name: dist-${{ github.sha }}
          # 发布到当前 Job 的 artifact，作为后续 Job 的输入
          path: dist/
          # 保留时间（天）
          retention-days: 7
```

### 4. 触发条件详解

GitHub Actions 支持 30+ 种触发事件，前端项目最常用的是以下几种：

```yaml
on:
  # ===== 代码事件 =====
  push:
    branches: [main, develop]     # 指定分支推送时触发
    tags: ['v*']                  # 推送 tag 时触发（用于发版）
    paths-ignore:                 # 忽略这些路径的变更
      - '**.md'
      - 'docs/**'

  pull_request:
    types: [opened, synchronize, reopened]  # PR 创建、推送新提交、重新打开时触发
    branches: [main]

  # ===== 定时任务 =====
  schedule:
    # cron 表达式：分 时 日 月 周（UTC 时间）
    # 下面表示：每周一至周五，北京时间 9:00 运行
    - cron: '0 1 * * 1-5'

  # ===== 手动触发 =====
  workflow_dispatch:
    inputs:
      release_type:
        description: '发版类型'
        required: true
        type: choice
        options:
          - patch  # 补丁版本
          - minor  # 次版本
          - major  # 主版本

  # ===== 被其他 Workflow 调用 =====
  workflow_call:
    inputs:
      environment:
        required: true
        type: string
```

### 5. 缓存策略

每次 CI 都重新 `pnpm install` 会浪费大量时间。用缓存把 `node_modules` 或 pnpm store 存下来：

```yaml
# 方式一：setup-node 内置缓存（推荐，最简单）
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'          # 自动读取 pnpm-lock.yaml 生成缓存 key

# 方式二：手动使用 actions/cache（更灵活，可缓存任意路径）
- name: 缓存 pnpm store
  uses: actions/cache@v4
  with:
    # 缓存路径：pnpm 的全局存储目录
    path: ~/.local/share/pnpm/store
    # 缓存 key：根据 lock 文件的 hash 生成，lock 不变则命中缓存
    key: pnpm-store-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
    # 回退 key：key 不匹配时尝试模糊匹配
    restore-keys: |
      pnpm-store-${{ runner.os }}-

# 方式三：同时缓存 node_modules 和 pnpm store
- name: 缓存依赖
  uses: actions/cache@v4
  with:
    path: |
      node_modules
      ~/.local/share/pnpm/store
    key: deps-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}
```

### 6. 环境变量和 Secrets

```yaml
# ===== 环境变量的三种层级 =====

# 1. Workflow 级别（所有 Job 可见）
env:
  APP_NAME: my-app

# 2. Job 级别（覆盖 Workflow 级别）
jobs:
  build:
    env:
      APP_NAME: my-app-build      # 覆盖外层的 APP_NAME

  # 3. Step 级别（覆盖 Job 级别）
    steps:
      - name: 构建
        env:
          NODE_ENV: production     # 仅此 Step 有效
        run: pnpm build

# ===== Secrets 管理（敏感信息，日志中自动脱敏）=====
# Secrets 在 GitHub 仓库的 Settings → Secrets and variables → Actions 中配置
jobs:
  deploy:
    steps:
      - name: 部署到服务器
        env:
          # 通过 ${{ secrets.XXX }} 引用 Secret
          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: pnpm run deploy
```

**Secrets 注意事项：**
- Secrets 的值不会在日志中显示，自动替换为 `***`
- 但不要在 Step 中使用 `echo $SECRET`，可能被绕过脱敏
- 不同环境用不同 Secret：`DEPLOY_TOKEN_STAGING`、`DEPLOY_TOKEN_PRODUCTION`

### 7. Matrix 策略

Matrix 让你用不同参数组合并行运行同一个 Job，不需要写多份配置：

```yaml
jobs:
  test:
    strategy:
      fail-fast: false         # 某个组合失败不取消其他组合
      max-parallel: 6          # 最大并行数，开源仓库限制 20
      matrix:
        # 组合 1：Node 22 + ubuntu
        # 组合 2：Node 22 + windows
        # 组合 3：Node 24 + ubuntu
        # 组合 4：Node 24 + windows
        node-version: [22, 24]
        os: [ubuntu-latest, windows-latest]

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

  # 排除不需要的组合
  exclude:
    # Windows + Node 22 的组合跳过
    - node-version: 22
      os: windows-latest

  # 额外添加特定组合
  include:
    # 单独加一组 Node 26 的前瞻兼容测试（当前版本，不作为发布基线）
    - node-version: 26
      os: ubuntu-latest
      experimental: true      # 自定义变量，可在 Step 中用 matrix.experimental 引用
```

### 8. 实战：完整前端 CI 流水线

下面是可直接复制到项目中的完整配置，将前面的知识点串起来：

```yaml
# .github/workflows/ci.yml
# ============================================================
# 前端项目完整 CI 流水线
# 流程：安装依赖 → Lint → 类型检查 → 单元测试 → 构建 → 部署预览
# ============================================================

name: CI Pipeline

on:
  pull_request:
    branches: [main, develop]
    paths:
      - 'src/**'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - 'tsconfig*.json'
      - '.github/workflows/ci.yml'
      - 'vite.config.*'
  workflow_dispatch:

env:
  NODE_VERSION: '24'
  PNPM_VERSION: '10'

# 取消同一 PR 的旧运行，节省 Runner 资源
concurrency:
  group: ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  # ==================== Job 1：代码检查 ====================
  lint:
    name: 🔍 Lint & Type Check
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: ESLint 检查
        run: pnpm run lint

      - name: TypeScript 类型检查
        run: pnpm run typecheck

  # ==================== Job 2：单元测试 ====================
  test:
    name: 🧪 Unit Test (Node ${{ matrix.node-version }})
    runs-on: ubuntu-latest
    timeout-minutes: 15

    strategy:
      fail-fast: false
      matrix:
        node-version: [22, 24]

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 运行测试
        run: pnpm run test -- --coverage

      # 在 PR 上的测试结果摘要（可选，需要 vitest 配置 reporters）
      - name: 上传测试报告
        if: always()   # 即使测试失败也上传报告
        uses: actions/upload-artifact@v4
        with:
          name: coverage-node-${{ matrix.node-version }}
          path: coverage/
          retention-days: 3

  # ==================== Job 3：构建 ====================
  build:
    name: 📦 Build
    runs-on: ubuntu-latest
    needs: [lint, test]
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: ${{ env.PNPM_VERSION }}

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: 安装依赖
        run: pnpm install --frozen-lockfile

      - name: 构建生产版本
        run: pnpm run build

      - name: 上传构建产物
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 7

  # ==================== Job 4：预览部署 ====================
  deploy-preview:
    name: 🚀 Preview Deploy
    runs-on: ubuntu-latest
    needs: [build]
    timeout-minutes: 5
    # 仅在 PR 事件时执行预览部署
    if: github.event_name == 'pull_request'

    steps:
      - name: 下载构建产物
        uses: actions/download-artifact@v4
        with:
          name: dist
          path: dist/

      - name: 部署预览到 Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist/ --project-name=my-app --branch=${{ github.head_ref }}

      # 在 PR 中评论预览链接
      - name: 评论 PR 预览链接
        uses: thollander/actions-comment-pull-request@v2
        with:
          message: |
            🚀 预览部署成功！
            
            🔗 预览地址：https://${{ github.head_ref }}.my-app.pages.dev
            📦 构建产物：${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
```

**执行流程总结：**

```
PR 提交到 main
      │
      ▼
  ┌──────────┐    ┌──────────────────┐
  │  Lint    │    │  Test (Node 22)  │
  │ 检查代码  │    │  Test (Node 24)  │  ← 当前与维护期 LTS 并行跑
  │ 规范     │    │                  │
  └────┬─────┘    └────────┬─────────┘
       │                   │
       └──────┬────────────┘
              │ 全部通过
              ▼
         ┌──────────┐
         │  Build   │  ← 只有 Lint 和 Test 全通过才执行
         └────┬─────┘
              │ 构建成功
              ▼
         ┌──────────────┐
         │ Preview Deploy│  ← 自动部署到预览环境
         └──────────────┘
```

---

## 常见问题

### Q1：为什么 CI 跑得比我本地慢很多？

主要有三个原因：① Runner 每次都是全新环境，首次安装依赖没有缓存；② GitHub 免费 Runner 的 CPU 性能一般（2核）；③ 网络下载 npm 包的速度可能不如本地。

**优化方案：** 配置缓存（见上文第 5 节）、使用 `--prefer-offline` 和 `--frozen-lockfile`、考虑自托管 Runner。

### Q2：`--frozen-lockfile` 是什么？什么时候用？

这个参数告诉 pnpm：**严格按 lock 文件安装，如果 lock 文件与 `package.json` 不一致就直接报错。** 在 CI 中必须使用，因为 CI 环境的职责是"验证 lock 文件是正确的"，而不是"帮你修复 lock 文件"。如果你在本地改了依赖但忘记 commit lock 文件，CI 会立刻发现。

### Q3：多个 Job 之间怎么传递数据？

数据不共享——每个 Job 跑在独立的虚拟机上。**传递方式：** 使用 `actions/upload-artifact` 上传产物，下游 Job 用 `actions/download-artifact` 下载。如果需要更简单的共享，可以把多个步骤合并到同一个 Job 中。

### Q4：GitHub Actions 免费额度够用吗？

公开仓库：完全免费，不限制使用量。私有仓库：每月 2000 分钟（Linux Runner），macOS 和 Windows 有不同倍率。对个人或小团队前端项目来说通常足够。如果不够，可以配置 `timeout-minutes` 防止卡死的 Job 持续消耗额度。

### Q5：怎么调试 GitHub Actions 失败？

1. 看 Actions 日志：每个 Step 的输出都在 GitHub 页面上可见
2. 本地复现：把命令在本地跑一遍，排除环境差异
3. 使用 `act` 工具：`brew install act`，可以在本地模拟 GitHub Actions 环境
4. 加 debug 日志：在仓库 Settings 中开启 debug logging，或在 Workflow 开头加 `ACTIONS_RUNNER_DEBUG: true`

### Q6：`concurrency` 是干什么的？

```yaml
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

当你连续 push 多次到同一个 PR，`concurrency` 会自动取消上一次还在运行中的 CI，只保留最新这一次。节省 Runner 时间，避免排队。

### Q7：怎么只让特定文件变更时才触发 CI？

```yaml
on:
  pull_request:
    paths:
      - 'src/**'           # 只监听 src 目录
      - 'package.json'      # 依赖变更
      - '.github/workflows/**'
    paths-ignore:
      - 'docs/**'           # 文档变更不触发
      - '**.md'
```

### Q8：不创建 PR，直接推送到 main 也能触发吗？

可以，配置 `on: push: branches: [main]`，但**强烈不建议在 CI 阶段这么做**。应该用分支保护规则（Branch Protection Rules），要求必须通过 CI 才能合并到 main，这才是 CI 的核心价值——在合并前拦住有问题的代码。

---

## 实操作业

### 基础：给现有项目添加 CI

在你的前端项目中创建 `.github/workflows/ci.yml`，实现：

1. 监听 PR 到 main 分支
2. 安装依赖
3. 运行 ESLint 检查
4. 运行 `pnpm build`

验证方式：创建一个 PR，看 GitHub Actions 是否自动运行。

### 进阶：添加 Matrix 测试和缓存

在基础之上：

1. 用 Matrix 在 Node 22、24 两个受支持的 LTS 版本上并行跑单元测试
2. 配置 pnpm 缓存加速安装
3. 设置 `concurrency` 取消重复运行
4. Lint 失败或测试失败时，Build 不执行（用 `needs`）

验证方式：故意写一个失败的测试并提交，确认失败后 Build 没有被触发。

### 挑战：完整 CI + 预览部署

在进阶之上：

1. 用 `upload-artifact` 上传构建产物
2. 新建一个 `deploy-preview` Job，下载产物并部署到 Cloudflare Pages 或 Vercel
3. 部署成功后，用 `actions-comment-pull-request` 在 PR 中评论预览链接

验证方式：提交 PR，确认预览链接在 PR 评论区生效，且能正常访问。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L3 里程碑](../../projects/atlas/milestones/L3.md)
- 本课任务：把“GitHub Actions 入门：前端 CI/CD 第一步”接入 Atlas 工程链路，形成可重复命令和失败门禁，并保存一次故意失败与恢复的证据。
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

- **CI/CD 的核心**：把重复的人工检查变成自动化流程，每次代码提交都经过 Lint → Test → Build 的验证
- **GitHub Actions 的层级**：Workflow → Job → Step → Action，每个 Job 在独立虚拟机中运行
- **YAML 配置六要素**：name、on（触发条件）、env（环境变量）、jobs（任务）、steps（步骤）、runs-on（运行环境）
- **缓存是必备优化**：用 `actions/setup-node` 的 `cache` 或 `actions/cache` 缓存依赖，减少安装时间
- **Matrix 实现多版本测试**：一行配置让测试在多个 Node 版本上并行运行
- **Secrets 管理敏感信息**：Token、密钥等放在 GitHub Secrets 中，不硬编码在 YAML 里
- **needs 控制执行顺序**：让 Lint 和 Test 先跑，通过后才执行 Build，合理编排 Job 依赖

版本参考：[Node.js Release Schedule](https://github.com/nodejs/Release#release-schedule)

下一节将深入前端项目的完整部署链路：从 PR 预览部署到生产环境自动发布，以及 E2E 测试的 CI 集成。

<!-- course-nav:start -->
---

[上一篇：04-测试策略与覆盖率](../04-自动化测试/04-测试策略与覆盖率.md) · [课程地图](../../README.md) · [下一篇：构建、测试与部署自动化：前端 CI/CD 全链路实战](./02-构建-测试-部署自动化.md)
<!-- course-nav:end -->
