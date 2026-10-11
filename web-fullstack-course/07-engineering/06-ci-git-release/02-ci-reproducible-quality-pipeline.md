# 可复现 CI 质量流水线

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一份可静态审查、可由本地命令等价复现的 GitHub Actions 教学工作流 |
| 建议时间 | 110 分钟 |
| 输入 | 已审查的提交、`package.json`、`pnpm-lock.yaml` |
| 输出证据 | 版本探针、冻结安装、`pnpm verify`、提交绑定制品与短期失败报告 |
| 未验证边界 | 未推送，因此托管 runner 结果仍未观察 |

## 1. 任务背景

开发者本机绿灯，但 CI 使用另一个 Node 版本并重新解析依赖，结果不同。另一条流水线在格式步骤自动改写源码，再对改写后的工作树构建；它验证的不是提交内容。邻里集市需要让本机和 CI 对同一提交、同一锁文件、同一命令顺序给出可追踪证据。

CI 是持续集成检查。写出 YAML 不代表它已经在 GitHub 执行，更不代表制品已部署到生产。

## 2. 学习目标

- 把本地 `pnpm verify` 映射到 CI。
- 固定 Node 与 pnpm，使用冻结安装。
- 记录 TS 7、TS 6 与 Playwright 版本证据。
- 配置最小权限、超时和并发取消。
- 区分受信 push 与未受信 pull request。
- 识别安装生命周期脚本和可移动 Action tag 的供应链边界。
- 让失败报告和构建制品绑定提交 SHA。

## 3. 预备知识

在个人项目根目录先执行本地等价命令：

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec playwright --version
pnpm verify
```

目标环境为 Node `24.21.0`、pnpm `12.11.2`、TS 7 主 CLI、TS 6 兼容 CLI/API、Playwright `1.64.0`。实际输出不同应记录差异，不要改文字伪装一致。

## 4. 核心理论

### 4.1 可复现输入

可复现从提交中的清单、锁文件、源代码、配置和脚本开始。`pnpm install --frozen-lockfile` 在清单与锁文件矛盾时失败；取消冻结门只能隐藏输入不一致。CI 不应提交自动修复结果，也不应用遗留 `dist` 代替当前提交构建。

### 4.2 失败要归属到具体门

`pnpm verify` 是聚合入口，但日志仍应显示格式、Lint、两条类型检查、Vitest、Vite 构建、预算与浏览器测试各自失败位置。给失败步骤加 `|| true` 或 `continue-on-error` 会把证据变成噪声。

### 4.3 权限与供应链

默认 `contents: read` 足够检出源码。未受信 PR 不应获得生产密钥，也不能在高权限 `pull_request_target` 上安装并执行对方提交。依赖安装可能执行 lifecycle scripts，因此锁文件和来源审查不只是版本问题。

Action tag 可移动。完整教学文件把当前审查版本固定到真实完整 commit SHA；升级时重新解析官方
tag、审查差异并更新版本旁注，不能只替换注释或编造 SHA。

## 5. 元素、属性、API 或配置清单

| 配置 | 作用 | 本课选择 |
| --- | --- | --- |
| `permissions` | 限定 `GITHUB_TOKEN` 能力 | `contents: read` |
| `timeout-minutes` | 防止挂起任务无限占用 runner | `20` |
| `concurrency.group` | 同工作流/引用归组 | 含 workflow 与 ref |
| `cancel-in-progress` | 新提交取消同组旧检查 | `true` |
| `ubuntu-24.04` | 固定 runner 主机标签 | 仍可能随镜像维护更新 |
| `node-version` | 固定 Node | `"24.21.0"` |
| `--frozen-lockfile` | 拒绝输入漂移 | 不自动重写锁文件 |
| `github.sha` | 当前提交标识 | 制品名和证据名使用 |
| `if-no-files-found` | 产物缺失策略 | 构建制品为 `error` |
| `retention-days` | 故障证据保留期 | 教学数据设 `3` |

## 6. 最小可运行案例

先建立本地 CI 等价脚本：

```json
{
  "scripts": {
    "ci:versions": "node --version && pnpm --version && tsc --version && tsc6 --version && playwright --version",
    "test": "vitest run",
    "verify": "pnpm test && pnpm build && pnpm budget && pnpm test:e2e"
  }
}
```

运行：

```bash
pnpm install --frozen-lockfile
pnpm ci:versions
pnpm verify
printf 'exit=%s\\n' "$?"
```

预期版本探针逐项输出，Vitest 在首次构建前明确执行，聚合门退出 `0`。即使当前项目的
`build` 或 `test:e2e` 会再次间接运行测试，也保留具名 `pnpm test`，避免脚本重构后让领域、
HTTP 或竞态测试从 CI 消失。这只能证明当前机器的本地等价执行；runner 操作系统、网络和
权限仍需真实 CI 观察。

## 7. 邻里集市集成案例

完整教学文件 `.github/workflows/verify.yml`：

```yaml
name: Verify market capstone

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

concurrency:
  group: verify-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - name: Check out submitted commit
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          persist-credentials: false

      - name: Install Node
        uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
        with:
          node-version: "24.21.0"

      - name: Enable pinned pnpm
        run: |
          corepack enable
          corepack prepare pnpm@12.11.2 --activate
          pnpm --version

      - name: Record runtime versions
        run: |
          node --version
          pnpm --version

      - name: Install locked dependencies
        run: pnpm install --frozen-lockfile

      - name: Record compiler versions
        run: |
          pnpm exec tsc --version
          pnpm exec tsc6 --version
          pnpm exec node --input-type=module -e 'import ts from "typescript"; console.log(ts.version)'

      - name: Install matching Chromium
        run: pnpm exec playwright install --with-deps chromium

      - name: Verify submitted source
        run: pnpm verify

      - name: Bind artifact metadata to submitted commit
        env:
          BUILD_COMMIT: ${{ github.sha }}
        run: |
          BUILD_TIME="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
          export BUILD_TIME
          node -e '
            const { writeFileSync } = require("node:fs");
            writeFileSync("dist/RELEASE.json", JSON.stringify({
              schemaVersion: 1,
              commit: process.env.BUILD_COMMIT,
              builtAt: process.env.BUILD_TIME,
              source: "authorized-ci",
              entry: "index.html"
            }, null, 2) + "\n");
          '
          (
            cd dist
            find . -type f ! -name SHA256SUMS -print0 \
              | sort -z \
              | xargs -0 sha256sum > SHA256SUMS
            sha256sum -c SHA256SUMS
          )

      - name: Upload commit-linked build
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: market-web-${{ github.sha }}
          path: dist
          if-no-files-found: error

      - name: Upload short-lived browser failure evidence
        if: failure()
        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
        with:
          name: browser-failure-${{ github.sha }}
          path: |
            test-results
            playwright-report
          if-no-files-found: ignore
          retention-days: 3
```

工作流检查提交源码，不运行 `format --write` 或 `lint --fix`。故障报告可能含页面文本、请求和截图；真实系统应限制访问、脱敏并缩短保留，不能上传 Cookie、认证头或环境变量全集。

## 8. 常见错误与排查路径

### 错误实验：上传不存在的目录

把 `path: dist` 临时改成 `path: missing-dist`，使用 YAML 解析器和工作流审查确认差异；若在授权练习仓库执行，上传步骤应因 `if-no-files-found: error` 失败。

- **现象**：质量门可能绿，但构建制品步骤失败。
- **证据**：上传日志指出路径没有文件，步骤为非零。
- **原因**：工作流声明的输出路径与 Vite 实际 `outDir` 不一致。
- **修复**：从构建日志和 `find dist -type f` 确认真实目录，恢复路径。
- **复验**：本地重建并列出文件；只有真实 runner 再执行成功，才能记录托管上传通过。

不要把 `if-no-files-found` 改成 `ignore` 掩盖发布输入缺失。

## 9. 课后题

1. 为什么 CI 不执行 `prettier --write`？
   **答案**：CI 应检查提交输入；自动改写后绿灯无法证明已提交源码符合规则。
2. 缓存命中能替代冻结安装吗？
   **答案**：不能。缓存是加速层，锁文件一致性仍需验证。
3. `pull_request_target` 为什么危险？
   **答案**：它可能带目标仓库权限；不得用它执行未受信任分支任意代码并接触密钥。
4. 为什么完整 Action SHA 比版本注释更能固定实际执行代码？
   **答案**：不是，主版本 tag 可移动；严格场景固定经审查的真实 SHA。

## 10. 实践练习

- **基础**：把本地命令表映射到 YAML step。验收：格式、Lint、TS7、TS6、测试、构建、预算、E2E 均有真实执行路径。
- **进阶**：审计 `setup-node` 内置 pnpm 缓存身份。验收：说明它基于 runner 平台与锁文件，
  cache miss 能回退正常安装；若团队还要求按 Node/pnpm 版本隔离，应改用显式缓存步骤并记录 key。
- **故障注入**：令清单与锁文件不一致。验收：冻结安装失败；恢复方式是重新生成并审查锁文件，不是移除 frozen。

## 11. 阶段验收

静态审查命令可使用项目已有 YAML 解析器；没有解析器时至少逐行核对缩进并保留未运行说明：

```bash
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec playwright --version
pnpm verify
find dist -type f -print | sort
```

通过条件：本地门全部退出 `0`；工作流使用最小权限、超时和并发；制品绑定 SHA；无自动修复和生产密钥；托管状态明确写作“未执行”或附真实运行链接，不用 YAML 文件存在代替运行证据。

## 12. 常见问题

**为什么不默认加入缓存？** 先让安装语义清晰。缓存优化应在基线可复现后单独测量。

**失败报告上传失败怎么办？** 原始测试失败仍是主结论；报告上传是辅助证据，不能反过来掩盖根因。

**CI 通过是否可以自动生产发布？** 不能自动推导。部署还需环境授权、制品验证、观察、回滚和数据兼容策略。

## 13. 扩展阅读

资料快照：2026-10-11。

- [GitHub Actions 工作流语法](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)
- [GitHub Actions 安全加固](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [GitHub Actions 制品](https://docs.github.com/en/actions/using-workflows/storing-workflow-data-as-artifacts)
- [pnpm install](https://pnpm.io/cli/install)
- [Playwright CI](https://playwright.dev/docs/ci)

## 我现在能做到什么

我能把本地质量链映射为检查同一提交的最小权限 CI，识别冻结安装、未受信代码和供应链边界，并把“静态审查”和“托管运行”分开陈述。

## 单元导航

- 章节目录：[06 CI、Git 与发布](../README.md#06-gitci-与发布)
- 上一课：[Git 范围、审查与可回退提交](01-git-scope-reviewable-commits.md)
- 下一课：[制品、发布、缓存与回滚边界](03-artifacts-release-cache-rollback.md)
