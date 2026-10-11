# GitHub Actions 数据库、双前端与浏览器门禁

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 完整 `.github/workflows/verify.yml` |
| 建议时间 | 170 分钟 |
| 权限 | `contents: read`，无 registry、environment、OIDC 或部署权限 |
| 数据库 | 作业内 PostgreSQL 18 service，临时凭据，只服务当前 job |
| 门禁 | 冻结安装、迁移两次、API/PG、React、Vue、顺序 Chromium、三类镜像 build |
| 制品 | 只上传构建目录；不上传 env、日志、Cookie、trace 或数据库 dump |
| 证据边界 | YAML/命令可本地静态复核；只有真实 Actions URL 才证明托管执行 |

## 1. 任务背景

本地质量门已经能失败和恢复，但 GitHub runner 是另一台临时机器：没有本机 `node_modules`、没有
旧 dist，也没有本地 PostgreSQL。CI 的任务是从候选提交和锁文件重新建立环境，运行相同门禁，并
把失败归属到具体步骤。

CI 不是发布授权。若 pull request 中的未审查代码能得到生产 token，它可以直接读取并外传。验证
workflow 因此只有只读仓库权限、作业内测试凭据和本地 Docker build；它不登录 registry、不 push
镜像、不调用远端主机，也不使用 `pull_request_target` 执行贡献者代码。

## 2. 学习目标

完成本课后，你能够：

1. 为 workflow 设置最小 `GITHUB_TOKEN` 权限、并发取消和总超时；
2. 用 PostgreSQL 18 service health 建立真实测试数据库；
3. 把数据库密码限制在单 job 测试环境，不复用生产 secret；
4. 运行 migration 两次、API HTTP/PG 测试和两套前端门；
5. 启动一个 API，并在同一 5173 origin 顺序运行 React 与 Vue Chromium journey；
6. 构建 API、React Web、Vue Web 三个本地镜像但不发布；
7. 只上传不含 secret 的提交绑定构建制品；
8. 解释 fork、`pull_request_target`、Action 可移动 tag 与依赖 lifecycle 风险；
9. 用 YAML parser、actionlint 和本地等价命令区分静态与托管证据。

## 3. 预备知识

先完成[本地质量门与干净冻结安装](01-local-quality-gates-clean-install.md)。以下前提必须在仓库真实
存在，不能在 workflow 中用空命令替代：

- `apps/api/dist/main.js` 由 API build 生成；
- `apps/api/migrate.mjs` 可读取 `DATABASE_URL`，第二次执行保持成功；
- React/Vue build 均生成 `dist`，Vite preview 的 `/api` proxy 指向 `127.0.0.1:3000`；
- 根 `playwright.config.ts` 的 projects 名为 `react` 与 `vue`，testMatch 分别限定到两个 app 的
  `e2e` 目录，使用 `http://127.0.0.1:5173`；
- API 测试和 E2E 只操作 `market_test` 中的随机化虚构数据；
- E2E 不含 `page.route`、`route.fulfill` 或 `devApi`，两个 project 的 `--list` 均非空；
- safe logs 不打印 Cookie、CSRF、密码、连接串或请求 body。

完整 workflow 使用 2026-10-11 从官方 tag 核对的 40 位 commit SHA，并以注释保留
`checkout v4.2.2`、`setup-node v4.4.0` 和 `upload-artifact v4.6.2`。升级时重新解析 tag、审查
release 与权限差异，再提交新的 SHA；不能退回可移动 tag。

## 4. 核心理论

### 4.1 job 是短期隔离边界，不是绝对安全沙箱

service container、runner process 和测试凭据只为当前 job 创建，job 结束后由平台回收。未审查
代码仍能读取 job env，因此 env 只能含专用测试值，不能放 registry、云、生产 DB 或部署私钥。

### 4.2 最小权限从 `permissions` 开始

验证只需检出代码，`contents: read` 足够。没有 `packages: write`、`id-token: write`、
`deployments: write`。workflow 顶层明确权限，避免仓库默认权限变化。

### 4.3 fork PR 与高权限事件

普通 `pull_request` 在 fork 场景不会获得仓库 Actions secrets，适合运行不依赖 secret 的检查。
`pull_request_target` 在目标仓库上下文运行，若 checkout 并执行 PR 代码，可能把高权限交给攻击者。
本课完全不使用它。

### 4.4 service health 只证明 PostgreSQL 接受连接

`pg_isready` 不证明 schema 已迁移、角色最小权限或业务不变量。workflow 还要：

1. 查询服务端 `server_version_num`；
2. 运行迁移两次；
3. 运行真实 HTTP/数据库测试；
4. 浏览器再走业务路径。

### 4.5 双前端为什么顺序运行

API 配置精确 `APP_ORIGIN=http://127.0.0.1:5173`。React preview 先占用 5173，测试后停止；Vue 再
占相同端口。这样无需为了并行测试扩大 origin allowlist，也不会把 CSRF 失败误归因于框架。

并行也可以，但必须使用两套 API/origin/数据库或明确 allowlist，并隔离测试数据；不是简单后台
启动两个 preview。

### 4.6 浏览器门不能只检查页面 200

至少包含登录/session 恢复、发布整数分商品、UTC 时间、收藏幂等、并发预约、owner 403、version
409 草稿恢复和退出 401。Playwright 启动真实 built preview，不使用 dev server 隐藏 production
构建问题。

### 4.7 镜像 build 与 registry promotion 分离

runner 可以本地 `docker build` 检查三个 Dockerfile/构建参数。没有 login/push 步骤，因此不会
产生可供发布的 repository digest。第 3 课只消费另一个已授权流程产生、扫描并记录的 digest。

### 4.8 制品最小化

`dist` 是浏览器/Node 可执行字节，仍需访问控制和保留期，但不应含 secret。失败 trace、HAR、API
日志可能含 Cookie/header/表单数据，本课不自动上传；若团队需要，先配置脱敏和最短保留再加入。

## 5. 元素、属性、API 或配置清单

| Workflow 项 | 本课选择 | 作用 | 边界 |
| --- | --- | --- | --- |
| `pull_request` | 普通事件 | 验证 fork 候选 | 无发布 secret |
| `permissions` | `contents: read` | 最小 token | Action/依赖仍执行代码 |
| `concurrency` | workflow + ref | 取消同 ref 旧运行 | 不跨分支误取消 |
| `timeout-minutes` | 35 | 防止挂起 | 各命令仍需自身超时 |
| PG image | `postgres:18-bookworm` | 真实 PG18 service | 标签仍可移动 |
| health options | `pg_isready` | 等待接受连接 | 不证明迁移 |
| job env | `_test` URL、精确 origin | 临时测试配置 | 不能复用生产 |
| frozen install | `pnpm install --frozen-lockfile` | 输入一致 | 不审计依赖安全 |
| Chromium install | `--with-deps` | 匹配项目 Playwright | 只覆盖 Chromium |
| background trap | 停止 API/preview | 保留步骤边界 | 不代替 graceful shutdown test |
| Docker build | 三镜像、本地 tag | 验证构建 | 不 push、无 digest |
| artifact | commit SHA + dist | 绑定候选提交 | 不等于发布 |

## 6. 最小可运行案例

### 6.1 完整 `.github/workflows/verify.yml`

在个人项目创建：

```yaml
name: Verify market

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

concurrency:
  group: verify-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-24.04
    timeout-minutes: 35

    services:
      postgres:
        image: postgres:18-bookworm
        env:
          POSTGRES_DB: market_test
          POSTGRES_USER: market_test_user
          POSTGRES_PASSWORD: ci-job-only-password
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U market_test_user -d market_test"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 20

    env:
      CI: "true"
      NODE_ENV: test
      PORT: "3000"
      APP_ORIGIN: http://127.0.0.1:5173
      DATABASE_URL: postgresql://market_test_user:ci-job-only-password@127.0.0.1:5432/market_test

    steps:
      - name: Check out candidate commit
        uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2

      - name: Install Node.js 24
        uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
        with:
          node-version: "24"

      - name: Install pinned pnpm
        run: npm install --global pnpm@12.10.1

      - name: Record tool versions
        run: |
          node --version
          pnpm --version
          git rev-parse HEAD

      - name: Install locked dependencies
        run: pnpm install --frozen-lockfile

      - name: Verify PostgreSQL 18 server
        run: |
          pnpm --filter @market/api exec node --input-type=module <<'NODE'
          import pg from "pg";

          const client = new pg.Client({
            connectionString: process.env.DATABASE_URL,
          });
          await client.connect();
          try {
            const result = await client.query(
              "SELECT current_database() AS database, " +
              "current_setting('server_version_num') AS version",
            );
            const { database, version } = result.rows[0];
            if (database !== "market_test" || !version.startsWith("18")) {
              throw new Error("expected market_test on PostgreSQL 18");
            }
            console.log(`database=${database} serverMajor=18`);
          } finally {
            await client.end();
          }
          NODE

      - name: Build API
        run: pnpm --filter @market/api build

      - name: Apply migrations twice
        working-directory: apps/api
        run: |
          node migrate.mjs
          node migrate.mjs

      - name: Run real API and database tests
        run: pnpm --filter @market/api test:http

      - name: Verify React
        run: |
          pnpm --filter @market/react-web typecheck
          pnpm --filter @market/react-web test
          pnpm --filter @market/react-web build

      - name: Verify Vue
        run: |
          pnpm --filter @market/vue-web typecheck
          pnpm --filter @market/vue-web test
          pnpm --filter @market/vue-web build

      - name: Reject browser mocks and empty projects
        shell: bash
        run: |
          set -Eeuo pipefail
          command -v rg >/dev/null
          forbidden_e2e_pattern='page\.route\s*\(|route\.fulfill\s*\(|\bdevApi\b'
          if rg -n \
            --glob '*.{ts,tsx,js,jsx,mts,mjs,cts,cjs}' \
            "$forbidden_e2e_pattern" \
            apps/react-web/e2e apps/vue-web/e2e; then
            printf '%s\n' \
              "E2E tests must call the real API; forbidden network mock found" \
              >&2
            exit 1
          fi

          assert_project_has_tests() {
            local project="$1"
            local output
            output="$(
              pnpm exec playwright test \
                --config=playwright.config.ts \
                --project="$project" \
                --list
            )"
            printf '%s\n' "$output"
            if ! rg -q \
              '^Total: [1-9][0-9]* tests? in [1-9][0-9]* files?$' \
              <<<"$output"; then
              printf 'Playwright project is empty: %s\n' "$project" >&2
              return 1
            fi
          }

          assert_project_has_tests react
          assert_project_has_tests vue

      - name: Install matching Chromium
        run: pnpm exec playwright install --with-deps chromium

      - name: Run React and Vue browser journeys sequentially
        shell: bash
        run: |
          set -Eeuo pipefail
          api_pid=""
          web_pid=""

          cleanup() {
            set +e
            if [[ -n "$web_pid" ]]; then
              kill "$web_pid" 2>/dev/null
              wait "$web_pid" 2>/dev/null
            fi
            if [[ -n "$api_pid" ]]; then
              kill "$api_pid" 2>/dev/null
              wait "$api_pid" 2>/dev/null
            fi
          }
          trap cleanup EXIT

          stop_web() {
            kill "$web_pid"
            set +e
            wait "$web_pid" 2>/dev/null
            set -e
            web_pid=""
          }

          wait_for() {
            local url="$1"
            local label="$2"
            local pid="$3"
            for attempt in $(seq 1 30); do
              if ! kill -0 "$pid" 2>/dev/null; then
                printf '%s\n' \
                  "$label process exited before readiness" >&2
                return 1
              fi
              if curl --fail --silent --show-error \
                --max-time 2 "$url" >/dev/null; then
                return 0
              fi
              sleep 1
            done
            printf '%s\n' "$label did not become ready" >&2
            return 1
          }

          node apps/api/dist/main.js > /tmp/market-api.log 2>&1 &
          api_pid=$!
          wait_for \
            "http://127.0.0.1:3000/api/v1/health/ready" \
            "api" \
            "$api_pid"

          pnpm --filter @market/react-web exec vite preview \
            --host 127.0.0.1 --port 5173 --strictPort \
            > /tmp/market-react.log 2>&1 &
          web_pid=$!
          wait_for \
            "http://127.0.0.1:5173/" \
            "react preview" \
            "$web_pid"
          pnpm test:e2e:react
          stop_web

          pnpm --filter @market/vue-web exec vite preview \
            --host 127.0.0.1 --port 5173 --strictPort \
            > /tmp/market-vue.log 2>&1 &
          web_pid=$!
          wait_for \
            "http://127.0.0.1:5173/" \
            "vue preview" \
            "$web_pid"
          pnpm test:e2e:vue
          stop_web

      - name: Build API image without publishing
        run: >-
          docker build
          --file apps/api/Dockerfile
          --tag market-api:${{ github.sha }}
          .

      - name: Build React web image without publishing
        run: >-
          docker build
          --file deploy/web.Dockerfile
          --build-arg WEB_APP=react-web
          --tag market-react:${{ github.sha }}
          .

      - name: Build Vue web image without publishing
        run: >-
          docker build
          --file deploy/web.Dockerfile
          --build-arg WEB_APP=vue-web
          --tag market-vue:${{ github.sha }}
          .

      - name: Upload commit-bound build outputs
        uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4.6.2
        with:
          name: market-builds-${{ github.sha }}
          path: |
            apps/api/dist
            apps/react-web/dist
            apps/vue-web/dist
          if-no-files-found: error
          retention-days: 3
```

`ci-job-only-password` 是 job service 的临时教学值，不是 GitHub secret，也不能复用到其他系统。
工作流没有 registry login/push、SSH、environment 或 deployment。构建输出中的所有 `VITE_*`
都是公开字节；上传前仍要扫描，不可把 secret 当 Vite 配置。

### 6.2 本地 YAML 与 workflow 静态检查

从项目根运行：

```bash
ruby -e '
  require "yaml"
  YAML.parse_file(".github/workflows/verify.yml")
  puts "workflow YAML syntax: PASS"
'
```

若已安装并锁定 actionlint：

```bash
actionlint .github/workflows/verify.yml
```

当前环境无 actionlint 时，记录 `blocked-by-tool`，不能说 actionlint 通过。Ruby AST 解析只证明 YAML
语法，不理解 GitHub expressions、runner 工具或包脚本。

### 6.3 本地等价命令

在隔离 PostgreSQL 18 和干净目录运行上一课的全部命令，再额外执行三次 Docker build。只有这些
实际退出码可记为本地证据；`act` 等本地 runner 可作补充，但不能证明 GitHub token 权限、service
行为、缓存或受保护 environment。

## 7. 邻里集市集成案例

### 7.1 从数据层到浏览器的同一事实

API 测试先直接验证数据库约束；浏览器 journey 再通过同源代理观察：

| 业务事实 | API/数据库证据 | React/Vue 浏览器证据 |
| --- | --- | --- |
| 金额 | `price_cents = 19900` integer | 显示 199.00 元但提交仍是 19900 |
| 时间 | `timestamptz` 与 UTC ISO 响应 | 本地化只发生在显示层 |
| session | PostgreSQL session、退出撤销 | 刷新恢复、退出后 401 |
| CSRF | 缺/错 Origin/token 403 | unsafe 请求带当前 token |
| 对象授权 | 用户乙 UPDATE 不改变行 | 编辑入口/响应显示无权 |
| version | stale UPDATE 影响 0 行 -> 409 | 草稿保留并显式重读 |
| 预约 | 并发只有一个有效行 | 一成功一冲突，不假成功 |

前端隐藏按钮只用于体验。workflow 必须保留直接 HTTP/数据库越权测试，不能只依赖 UI。

### 7.2 失败制品不上传为发布候选

默认 step 只在前面成功后继续。任何 migration、test、build、browser 或 image build 非零都会阻止
artifact step。不得为“收集更多结果”给核心门加 `continue-on-error` 后仍发布制品。

浏览器门在启动 API 前已完成两个 fail-fast 静态检查：真实 API Mock 扫描必须无输出，React/Vue
`--list` 都必须列出至少一项测试。运行时 API/preview 进程若提前退出也立即失败，不能借用其他
监听进程或空 project 继续上传制品。

如果团队需要聚合报告，可让报告上传使用 `if: failure()`，但最终 job 必须保持失败；报告要先
脱敏 Cookie、Authorization、CSRF、表单和用户数据。

### 7.3 Action pinning 的落地流程

在授权仓库启用前：

1. 从官方 Action 仓库 release/tag 解析当前完整 commit SHA；
2. 阅读 release notes、运行时升级和权限需求；
3. 把 `uses: owner/repo@<40-hex-sha>` 写入变更；
4. 注释对应 release 版本，代码评审确认来源；
5. 由依赖更新流程提出下一次 SHA，不自动跟随 tag。

教材不提供可能过期或错误的 SHA；“没有编造 pin”优于假装固定到一个未经核验的值。

## 8. 常见错误与排查路径

### 明确错误：迁移失败却继续执行浏览器测试

错误修改：

```yaml
- name: Apply migration
  continue-on-error: true
  run: node apps/api/migrate.mjs
```

| 五段 | 记录 |
| --- | --- |
| 现象 | migration step 显示警告，后续测试可能因旧 schema 产生噪声，job 甚至仍绿 |
| 证据 | step outcome 为 failure/conclusion success 或日志非零，但后续步骤继续 |
| 原因 | 核心门被 `continue-on-error` 改成非阻断 |
| 修复 | 删除该选项，保持 migration 退出码；报告聚合不能改变 job 失败 |
| 复验 | 注入无效 SQL 后 job 在 migration 停止；恢复后两次 migration 与后续门通过 |

### PostgreSQL service healthy 但迁移连接失败

检查 `DATABASE_URL` host/port、用户名/库名与 service env。不要把 runner job 误改成 container job
后仍假设 `127.0.0.1:5432`；两种网络模型不同。

### React 通过、Vue 没有运行

检查日志步骤与 workflow path，确认 Vue type/test/build 和 project=vue 都存在。不能从共享 API
测试推断 Vue SFC 或路由正确。

### Playwright project 为空或命中网络 Mock

检查根 config 的 testMatch 与实际文件路径。把已有 journey 移到各 app 的 `e2e` 目录并改为访问
真实 preview/API；不要删除静态 gate、增加空占位测试，或用 `page.route`、`route.fulfill`、
`devApi` 伪造服务端成功。

### preview 启动但 Playwright 请求错 origin

确认 `baseURL`、Vite proxy、`APP_ORIGIN` 都是 `http://127.0.0.1:5173`，不要混用 localhost。
scheme、host、port 任一不同都会改变 origin。

### artifact 含 secret

停止下载/传播并撤销真实凭据；检查 Vite env、source map、生成配置和 dist。删除 artifact 不能撤销
已泄漏 secret。修复后重建并扫描，不把 secret 改名继续打包。

### fork PR 获取不到 secret

这是预期安全边界。验证 workflow 应不依赖发布 secret；需要 secret 的部署应由受保护环境和已审查
提交触发，不改用 `pull_request_target` 执行不可信代码。

## 9. 课后题

**问题 1：为什么 service 的临时密码可以写在 workflow，生产密码不可以？**

参考答案：临时值只保护当前一次性测试 service，没有其他系统权限；生产凭据可访问持久数据，必须
通过受控 secret/identity 分发且不暴露给 PR 代码。

**问题 2：`contents: read` 是否让第三方 Action 自动安全？**

参考答案：不。它限制 token 权限，但 Action 仍执行代码、可读取工作区/job env；还需来源审查与
不可变 SHA。

**问题 3：为什么三个 image build 后仍没有 release digest？**

参考答案：它们只在 runner 本地以 tag 构建，没有 push 到 repository；可发布 digest 必须来自
授权 registry 中确切 manifest。

**问题 4：为什么不自动上传 Playwright trace？**

参考答案：trace/HAR 可能含 Cookie、headers、表单和个人数据；需先脱敏、访问控制和保留策略。

**问题 5：readiness 200 能否省略浏览器 journey？**

参考答案：不能。ready 只证明服务依赖满足，不能证明静态资源、代理、Cookie、CSRF 和业务交互。

## 10. 实践练习

### 基础：静态审查

用 YAML parser 和可用 actionlint 检查 workflow，逐项标记权限、PG18、迁移两次、双前端、顺序
浏览器、三镜像和 artifact。完成标准：parser/actionlint 状态分开，无发布步骤。

### 进阶：固定 Action

在个人授权练习仓库解析三个官方 Action 的实际 commit SHA，提交 pin 与 release 注释。完成标准：
每个 SHA 来自官方仓库且经审查；不要把练习 token 或 API 返回凭据写入证据。

### 故障注入：迁移门

在隔离分支让一条新 migration 语法失败，运行本地等价门；若用户明确授权个人练习仓库，再由用户
自行触发托管 run。完成标准：失败阻断浏览器/artifact；恢复后两次迁移成功。当前教材任务不触发
远端 workflow。

## 11. 阶段验收

- [ ] workflow 顶层只有 `contents: read`，没有部署/registry/OIDC 权限。
- [ ] 使用普通 `pull_request`，没有执行 PR 代码的 `pull_request_target`。
- [ ] 并发 key 含 workflow/ref，总 timeout 明确。
- [ ] PostgreSQL 18 health、数据库名和服务端版本被验证。
- [ ] 测试凭据只属于 job，不引用生产 secret。
- [ ] frozen install、API build、迁移两次、HTTP/PG 测试实际存在。
- [ ] workflow 扫描 E2E 网络 Mock，并用 `--list` 阻断任一空 project。
- [ ] React/Vue 各自 type/test/build，Chromium journey 顺序执行。
- [ ] API/React/Vue 镜像只 build，不 login/push。
- [ ] artifact 绑定 `github.sha`，只含三个 dist，短期保留。
- [ ] 核心门没有 `continue-on-error`、`|| true` 或空测试。
- [ ] Action tag 可移动边界已说明，高信任启用前要求真实 SHA 审查。
- [ ] YAML 静态、本地等价、hosted run 三类证据没有混写。

只有真实授权 run URL、commit SHA、结论和时间齐全时，才可记录“GitHub Actions 通过”。本课写出
workflow 或本地 YAML PASS 不能升级为托管证据。

## 12. 常见问题

**为什么不用 pnpm setup Action？**

减少一个第三方执行边界，直接用目标 Node 的 npm 安装精确 pnpm。团队也可使用官方/审查过的
setup Action，但仍要固定真实 SHA。

**GitHub runner 的 `ubuntu-24.04` 是否永远不变？**

不是。标签固定主系统版本，但镜像内工具会维护更新；关键 runtime 仍显式安装/记录。

**为什么没有依赖缓存？**

先保证语义正确。缓存是加速层，miss 必须回退冻结安装，key 应包含 OS、Node、pnpm 和 lock hash。

**可以在 CI 内生成发布镜像并 push 吗？**

可以由独立、授权的 delivery workflow 完成，但不能让普通 PR job 获得写凭据。第 3 课从已经存在
的不可变 digest 开始。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)：
  权限、并发、service 与表达式。
- [GitHub Actions security hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)：
  fork、pinning 与脚本注入边界。
- [PostgreSQL service containers](https://docs.github.com/en/actions/use-cases-and-examples/using-containerized-services/creating-postgresql-service-containers)：
  runner/service 网络。
- [pnpm CI](https://pnpm.io/continuous-integration)：冻结安装与平台示例。
- [Playwright CI](https://playwright.dev/docs/ci)：浏览器依赖与报告。
- [Docker build](https://docs.docker.com/reference/cli/docker/buildx/build/)：本地构建与输出边界。

## 我现在能做到什么

我能把 PG18、真实 API、React、Vue、Chromium 和镜像构建组织成最小权限 GitHub Actions
workflow，并识别 fork、Action tag、artifact 与测试凭据边界。我也能坚持只有真实 hosted run 才
能证明托管 CI，而静态 YAML 通过只是前置证据。

## 单元导航

- 章入口：[04 CI、发布与回滚](../04-ci-release-rollback.md)
- 上一课：[本地质量门与干净冻结安装](01-local-quality-gates-clean-install.md)
- 下一课：[不可变镜像与受守卫发布自动化](03-immutable-images-release-automation.md)
