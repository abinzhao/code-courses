# 本地质量门与干净冻结安装

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 包自有脚本、完整 `scripts/verify-local.sh` 与一次干净归档冻结安装记录 |
| 建议时间 | 130 分钟 |
| 门禁范围 | API build/迁移/HTTP+PG、React、Vue、顺序浏览器 journey |
| 故障证据 | React 与 Vue 各注入一个真实引用源码类型错误，先非零、恢复后再通过 |
| 安全范围 | 只连接 loopback 且库名以 `_test` 结尾的 PostgreSQL 18 |
| 边界 | 本地通过不证明 GitHub runner、Docker 镜像、registry 或发布目标 |

## 1. 任务背景

把十条命令复制进 CI 之前，必须先证明它们在本地有明确责任并且会发现错误。如果根
`typecheck` 实际没有包含 `apps/vue-web/src`，即使退出 0 也没有覆盖 Vue；如果测试脚本只有
`echo ok`，绿色状态没有业务意义；如果迁移只跑一次，就不知道第二次会不会重复建表失败。

邻里集市需要从一份干净提交和锁文件重建，使用 PostgreSQL 18 测试库，依次检查 API、React、Vue
和浏览器路径。质量门还必须“有牙齿”：注入已知错误时先失败，恢复文件后才重新变绿。

## 2. 学习目标

完成本课后，你能够：

1. 让每个 package 自己拥有 `typecheck`、`test`、`build` 等真实脚本；
2. 固定 Node.js 24 与 pnpm 12.11.2，使用 frozen lockfile；
3. 在迁移和 HTTP 测试前拒绝非 loopback、非 `_test` 数据库；
4. 连续运行迁移两次，验证初次应用与幂等重放；
5. 分别检查 React `tsc6` 与 Vue `vue-tsc` 的实际源码包含范围；
6. 顺序执行两个前端浏览器 journey，避免共享一个 `APP_ORIGIN` 的并行冲突；
7. 用临时错误证明门禁确实扫描被应用引用的源码；
8. 从 Git 提交导出干净临时目录，区分“工作树通过”和“提交可重建”；
9. 记录命令、退出码、UTC 时间、失败与恢复，而不记录凭据。

## 3. 预备知识

先完成[第 03 章](../03-nginx-https-deployment/01-web-image-spa-static-cache.md)，并确认个人 `market` 项目已有：

- 根 `packageManager: "pnpm@12.11.2"` 与 `pnpm-lock.yaml`；
- API `build`、迁移器和真实 HTTP/PostgreSQL 测试；
- React 与 Vue 各自真实类型、Vitest、build 脚本；
- Playwright projects `react`、`vue`，覆盖登录、发布、收藏、预约竞争、`409` 编辑冲突和退出；
- PostgreSQL 服务端主版本 18 的隔离 `market_test`。

记录工具：

```bash
node --version
pnpm --version
git status --short
```

预期 Node 输出 `v24.`，pnpm 精确 `12.11.2`。版本不同是待处理事实，不可手改记录。数据库版本必须
通过连接后查询 `server_version_num`，`psql --version` 只证明客户端。

## 4. 核心理论

### 4.1 门禁由拥有源码的包定义

CI 只调用包脚本，不在 YAML 临时发明另一套编译参数。这样本地、CI 和维护者执行同一入口，源码
包含范围、project references、测试配置不会悄悄漂移。

| 包 | 必需脚本 | 必须覆盖 |
| --- | --- | --- |
| `@market/api` | `build`、`test:http` | bootstrap、DTO、repository、真实 HTTP/PG |
| `@market/react-web` | `typecheck`、`test`、`build` | 实际 TSX、hooks、路由与 Vite build |
| `@market/vue-web` | `typecheck`、`test`、`build` | 实际 SFC/main、Pinia、路由与 Vite build |
| 根 | `test:e2e:react/vue` | 两套浏览器 journey 与真实 API |

React 的 TS 6 兼容包装包可能提供 `tsc6`；Vue 工具链按实际兼容线使用 `vue-tsc`。不要假设同一
workspace 的所有包自动获得同名可执行文件。

### 4.2 冻结安装检查输入一致性

`pnpm install --frozen-lockfile` 在 manifest 与 lockfile 不匹配时失败。修复方式是用固定 pnpm
更新并审查 lockfile，不是移除 frozen。冻结只保证解析输入一致，不证明依赖无漏洞或生命周期
脚本可信。

### 4.3 顺序是依赖图，不是装饰

```text
冻结安装
  -> API build
  -> PG18 迁移两次
  -> API HTTP/数据库测试
  -> React type/test/build
  -> Vue type/test/build
  -> React 浏览器 journey
  -> Vue 浏览器 journey
```

数据库没迁移时，HTTP 失败不能归因于前端；类型失败时不应继续产出发布候选。浏览器测试最后验证
真实组装路径，但不能替代更快、更精确的单元/集成门。

### 4.4 迁移重复执行与 rollback 不同

第二次迁移应报告“已应用”或无变化并退出 0，证明迁移 runner 幂等检查。它不表示 schema 可以
反向回滚。数据库向后兼容策略由第 4 课的 expand/contract 负责。

### 4.5 失败实验防止空配置绿灯

向实际入口依赖的源码注入确定类型错误：

```ts
const __qualityGateProbe: number = "must fail";
```

若 typecheck 仍退出 0，说明源码未被包含、脚本调用错编译器或错误被跳过。修复质量门后，才恢复
源码并记录 pass。不能把 probe 留在提交，也不能放宽类型让它通过。

### 4.6 干净归档验证提交，不验证未提交工作树

`git archive HEAD` 导出提交中的文件，不包含本地未跟踪 secret、旧 dist 或修改。它适合证明提交
可重建；若本次改动尚未提交，则应先在工作树运行，明确“未提交”，不能声称归档包含当前修改。

## 5. 元素、属性、API 或配置清单

| 命令/配置 | 作用 | 成功证据 | 失败证据 |
| --- | --- | --- | --- |
| `packageManager` | 声明 pnpm 版本 | 与实际 `pnpm --version` 一致 | Corepack/本机版本不同 |
| `--frozen-lockfile` | 拒绝依赖图漂移 | 安装退出 0，lock hash 不变 | `ERR_PNPM_OUTDATED_LOCKFILE` |
| `pnpm --filter` | 调用包自有脚本 | 日志显示目标包 | 包名/脚本不存在 |
| `tsc6 -b` | React 兼容类型检查 | 实际 TSX 被扫描 | probe 未失败 |
| `vue-tsc -b` | Vue SFC/TS 类型检查 | main/SFC 错误被发现 | project reference 断开 |
| `node migrate.mjs` 两次 | 迁移与重放 | applied -> already applied | 重复对象/校验和漂移 |
| `node --test` | API HTTP/PG 边界 | 真实 socket 与 DB 断言 | mock 代替真实库 |
| Playwright project | 浏览器业务路径 | React/Vue 各有报告 | 只打开首页 |
| `git archive` | 导出提交快照 | 临时目录无旧产物 | 不含未提交修改 |
| SHA-256 | 绑定 lock/输入 | 记录真实 hash | 不证明业务正确 |

## 6. 最小可运行案例

### 6.1 包自有脚本

以下是需要合并进各自 `package.json` 的脚本字段，不是让读者覆盖整个 manifest。

API：

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test:http": "node --test test/api.test.mjs"
  }
}
```

React：

```json
{
  "scripts": {
    "typecheck": "tsc6 -b",
    "test": "vitest run",
    "build": "vite build"
  }
}
```

Vue：

```json
{
  "scripts": {
    "typecheck": "vue-tsc -b",
    "test": "vitest run",
    "build": "vite build"
  }
}
```

根：

```json
{
  "scripts": {
    "test:e2e:list": "playwright test --config=playwright.config.ts --list",
    "test:e2e:react": "playwright test --config=playwright.config.ts --project=react",
    "test:e2e:vue": "playwright test --config=playwright.config.ts --project=vue",
    "verify:local": "bash scripts/verify-local.sh"
  }
}
```

API 脚本与第 08 章唯一完整 `apps/api/package.json` 一致，项目没有另一份 build 专用 tsconfig。
Playwright 配置不声明 `webServer`：调用者必须先启动真实 API 和当前前端的 built preview。本课
脚本与第 2 课 workflow 都承担这个生命周期，不能在没有页面或真实 API 时空通过。

### 6.2 完整根 `playwright.config.ts`

在仓库根创建：

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "react",
      testMatch:
        /apps[\\/]react-web[\\/]e2e[\\/].*\.(?:spec|test)\.[cm]?[jt]sx?$/,
    },
    {
      name: "vue",
      testMatch:
        /apps[\\/]vue-web[\\/]e2e[\\/].*\.(?:spec|test)\.[cm]?[jt]sx?$/,
    },
  ],
});
```

把现有 React/Vue journey 分别放入 `apps/react-web/e2e` 与 `apps/vue-web/e2e`，并适配为通过页面和
真实 `/api` 请求完成业务路径。两个目录都必须至少列出一项测试；不得用空 project 冒充通过，也
不得用 `page.route`、`route.fulfill` 或 `devApi` 替代真实 API。`workers: 1` 只控制单个 project
内并发；两个 project 仍由调用者顺序启动各自 preview。

### 6.3 完整 `scripts/verify-local.sh`

在个人项目创建：

```bash
#!/usr/bin/env bash
set -Eeuo pipefail

die() {
  printf 'verify-local: %s\n' "$*" >&2
  exit 2
}

command -v node >/dev/null || die "node is required"
command -v pnpm >/dev/null || die "pnpm is required"
command -v curl >/dev/null || die "curl is required"
command -v rg >/dev/null || die "ripgrep is required"

node_version="$(node --version)"
pnpm_version="$(pnpm --version)"
[[ "$node_version" == v24.* ]] || die "expected Node.js 24, got $node_version"
[[ "$pnpm_version" == 12.11.2 ]] || die "expected pnpm 12.11.2, got $pnpm_version"

: "${DATABASE_URL:?Set isolated PostgreSQL 18 test DATABASE_URL}"
: "${APP_ORIGIN:=http://127.0.0.1:5173}"
: "${PORT:=3000}"
[[ "$APP_ORIGIN" == "http://127.0.0.1:5173" ]] \
  || die "APP_ORIGIN must match Playwright baseURL"
[[ "$PORT" == 3000 ]] || die "PORT must be 3000"
export APP_ORIGIN PORT
export NODE_ENV=test

node --input-type=module -e '
  const target = new URL(process.env.DATABASE_URL);
  const loopback = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (!loopback.has(target.hostname)) {
    throw new Error("DATABASE_URL must use a loopback host");
  }
  if (!target.pathname.slice(1).endsWith("_test")) {
    throw new Error("database name must end with _test");
  }
'

printf 'startedAt=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
printf 'node=%s pnpm=%s\n' "$node_version" "$pnpm_version"

pnpm install --frozen-lockfile
pnpm --filter @market/contracts typecheck
pnpm --filter @market/contracts test
pnpm --filter @market/contracts build
pnpm --filter @market/api build

(
  cd apps/api
  node migrate.mjs
  node migrate.mjs
)

pnpm --filter @market/api test:http
pnpm --filter @market/react-web typecheck
pnpm --filter @market/react-web test
pnpm --filter @market/react-web build
pnpm --filter @market/vue-web typecheck
pnpm --filter @market/vue-web test
pnpm --filter @market/vue-web build

for test_dir in apps/react-web/e2e apps/vue-web/e2e; do
  [[ -d "$test_dir" ]] || die "missing E2E directory: $test_dir"
done

forbidden_e2e_pattern='page\.route\s*\(|route\.fulfill\s*\(|\bdevApi\b'
if rg -n \
  --glob '*.{ts,tsx,js,jsx,mts,mjs,cts,cjs}' \
  "$forbidden_e2e_pattern" \
  apps/react-web/e2e apps/vue-web/e2e; then
  die "E2E tests must call the real API; forbidden network mock found"
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
  rg -q '^Total: [1-9][0-9]* tests? in [1-9][0-9]* files?$' \
    <<<"$output" \
    || die "Playwright project is empty: $project"
}

assert_project_has_tests react
assert_project_has_tests vue

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
    kill -0 "$pid" 2>/dev/null \
      || die "$label process exited before readiness"
    if curl --fail --silent --show-error --max-time 2 \
      "$url" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  die "$label did not become ready"
}

run_web_project() {
  local package_name="$1"
  local project="$2"
  local log_file="$3"

  pnpm --filter "$package_name" exec vite preview \
    --host 127.0.0.1 --port 5173 --strictPort \
    >"$log_file" 2>&1 &
  web_pid=$!
  wait_for "http://127.0.0.1:5173/" "$project preview" "$web_pid"
  pnpm "test:e2e:$project"
  stop_web
}

node apps/api/dist/main.js >/tmp/market-verify-api.log 2>&1 &
api_pid=$!
wait_for \
  "http://127.0.0.1:3000/api/v1/health/ready" \
  "api" \
  "$api_pid"

run_web_project \
  @market/react-web react /tmp/market-verify-react.log
run_web_project \
  @market/vue-web vue /tmp/market-verify-vue.log

printf 'finishedAt=%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
```

为文件加可执行权限后运行：

```bash
chmod 0755 scripts/verify-local.sh
: "${MARKET_TEST_DATABASE_URL:?Inject the isolated test database URL}"
DATABASE_URL="$MARKET_TEST_DATABASE_URL" \
  pnpm verify:local
```

测试 URL 必须通过当前 shell 或受权限保护的本地 secret 工具注入，不写进 shell history、文档或
Git；也可使用受权限保护的 libpq/service 配置。**[本地预期]** 每步退出 0，迁移第二次不重复
应用，两个 `--list` project 均非空且未发现网络 Mock，React journey 完成并停止 preview 后 Vue
才开始。若新启动的 API/preview 提前退出，脚本不会借用端口上的旧进程制造通过。

### 6.4 Bash、配置与 E2E 静态检查

```bash
bash -n scripts/verify-local.sh
pnpm test:e2e:list
if rg -n \
  'page\.route\s*\(|route\.fulfill\s*\(|\bdevApi\b' \
  apps/react-web/e2e apps/vue-web/e2e; then
  exit 1
fi
```

`bash -n` 只证明 Bash parser 接受语法。`--list` 必须分别出现非零 React/Vue 测试，扫描必须无
输出；它们仍不证明浏览器、API 或数据库运行成功，动态证据来自完整 `verify:local`。

## 7. 邻里集市集成案例

### 7.1 数据库版本与业务不变量

门禁开始时通过现有测试连接查询：

```sql
SELECT current_database(), current_setting('server_version_num');
```

预期库名 `market_test`、版本号以 `18` 开头。测试至少断言：

- `price_cents` 是非负整数，HTTP `priceCents` 不使用浮点元；
- 数据库 `timestamptz` 对外为 UTC ISO 8601；
- 用户乙编辑用户甲商品为 403且数据库不变；
- owner 旧 version 为 409；
- 两个并发预约只有一个 201，另一个 409，数据库一个有效预约；
- 同源 Cookie session 可恢复，unsafe 写入缺 Origin/CSRF 为 403；
- logout 后旧 session 为 401。

### 7.2 React 与 Vue 等价门

两套 journey 使用同一业务复杂度：

1. 登录并恢复 session；
2. 发布 `19900` 分商品并观察 UTC 时间；
3. 收藏 PUT 重试保持一条；
4. 两用户并发预约一胜一冲突；
5. owner 编辑与 `409` 草稿保留；
6. 非 owner 编辑 403；
7. 退出后 `/auth/me` 401。

顺序使用同一个 `http://127.0.0.1:5173` 外部 origin，可避免 API 同时允许两个测试 port。每个
前端停止 preview 后再启动下一个，测试数据用唯一后缀并只清理自己创建的对象。

### 7.3 干净提交归档

先确认本地门已对当前工作树通过，再用已提交版本做冷构建：

```bash
tmp="$(mktemp -d /tmp/market-clean-install.XXXXXX)"
git archive --format=tar HEAD | tar -xf - -C "$tmp"
(
  cd "$tmp"
  test ! -d node_modules
  test ! -d apps/react-web/dist
  test ! -d apps/vue-web/dist
  pnpm install --frozen-lockfile
  pnpm --filter @market/contracts typecheck
  pnpm --filter @market/contracts test
  pnpm --filter @market/contracts build
  pnpm --filter @market/api build
  pnpm --filter @market/react-web typecheck
  pnpm --filter @market/react-web test
  pnpm --filter @market/react-web build
  pnpm --filter @market/vue-web typecheck
  pnpm --filter @market/vue-web test
  pnpm --filter @market/vue-web build
)
rm -rf "$tmp"
```

删除只针对刚由 `mktemp` 返回的精确 `/tmp/market-clean-install.*`。数据库与浏览器门还需要在临时
目录注入测试配置后运行；不要把 Git ignored secret 复制进 archive 并提交。

## 8. 常见错误与排查路径

### 明确错误：类型配置没有包含真实 React 源码

先要求工作树无无关改动，再执行受控 probe：

```bash
test -z "$(git status --short -- apps/react-web/src/App.tsx)"
backup="$(mktemp /tmp/market-react-App.XXXXXX)"
cp apps/react-web/src/App.tsx "$backup"
restore_probe() {
  cp "$backup" apps/react-web/src/App.tsx
  rm -f "$backup"
}
trap restore_probe EXIT

printf '\nconst __qualityGateProbe: number = "must fail";\n' \
  >> apps/react-web/src/App.tsx

set +e
pnpm --filter @market/react-web typecheck
status=$?
set -e
test "$status" -ne 0

restore_probe
trap - EXIT
pnpm --filter @market/react-web typecheck
```

| 五段 | 记录 |
| --- | --- |
| 现象 | 注入明显类型错误后 `typecheck` 仍退出 0 |
| 证据 | probe 位于应用实际入口源码，但日志没有该文件或对应诊断 |
| 原因 | tsconfig include/references 断开，或脚本调用了错误/空配置 |
| 修复 | 让包脚本指向真实 project graph，保留严格错误，不排除源码 |
| 复验 | probe 非零且显示文件/类型错误；恢复原文件后同一命令退出 0 |

对 Vue 在 `apps/vue-web/src/main.ts` 重复同样实验，调用 `vue-tsc -b`。不能只验证 React 后推断
Vue 也被覆盖。

### frozen lock 失败

检查 manifest diff 和 lockfile 生成使用的 pnpm 版本。恢复方式是确认依赖变更后更新、审查并提交
lockfile；不允许在 CI 改成非 frozen 或删除锁文件。

### 迁移第二次失败

保留第一次迁移记录和数据库 schema，检查 migration table/checksum、DDL 是否带正确存在性策略。
不要 drop 测试库掩盖重复执行错误；修复 runner 后从新库与已迁移库各测一次。

### 浏览器测试只有首页

检查 Playwright project 和 test list。若没有登录、发布、并发预约、409、退出的真实断言，首页
200 不能称全栈 browser gate。若 `--list` 中任一 project 为 0，或 E2E 目录出现
`page.route`/`route.fulfill`/`devApi`，门禁必须失败而不是降级成 mock。

### 测试连接到开发库

脚本应在任何迁移前检查 loopback 和 `_test`。若 guard 失败，不要绕过；创建明确测试库和最小
权限角色。

## 9. 课后题

**问题 1：为什么包脚本优于在 CI YAML 中直接写 `tsc -p ...`？**

参考答案：源码 owner 管理真实配置和可执行文件，本地与 CI 复用同一入口，减少参数漂移。

**问题 2：冻结安装成功是否证明 lockfile 中依赖安全？**

参考答案：不证明。它证明清单与解析图一致；来源、漏洞、生命周期脚本仍需独立审查。

**问题 3：迁移跑两次成功是否证明可以回滚 schema？**

参考答案：不证明。它只证明向前 runner 能识别已应用版本；反向兼容由 expand/contract 和应用
证据决定。

**问题 4：为什么 probe 恢复后必须重跑？**

参考答案：先失败证明门有效，恢复后通过证明合法源码满足门；只保留失败或只恢复文件都不完整。

## 10. 实践练习

### 基础：包脚本清单

逐包列出脚本、真实配置、包含源码和退出码。在个人 `evidence/local-gates.md` 记录 UTC 时间与
命令。完成标准：没有 root 空脚本代替 package owner，没有“测试”实际只 echo。

### 进阶：干净归档

从 `HEAD` 导出 `/tmp`，冻结安装并验证 contracts、API 与双前端；比较 lock hash 与工作区。
完成标准：contracts 的双类型、28 个 parser/bridge/edit/operation 测试和 build 均被执行，无旧
`node_modules/dist`，hash 一致，命令从归档退出 0；未提交修改明确不在归档证据中。

### 故障注入：双前端 probe

按受控备份/恢复分别注入 React TSX 和 Vue main.ts 类型错误。完成标准：两者各自先非零，错误
指向实际文件；恢复后同一门各自通过，最终 diff 无 probe。

## 11. 阶段验收

- [ ] Node.js 24、pnpm 12.11.2 和 lock hash 有真实记录。
- [ ] Contracts/API/React/Vue 各自拥有真实 package scripts。
- [ ] frozen 安装失败不会被自动改成非 frozen。
- [ ] 数据库 guard 在迁移前拒绝远程或非 `_test` URL。
- [ ] PostgreSQL 服务端主版本 18 由连接查询证明。
- [ ] 迁移连续两次、真实 HTTP/数据库测试通过。
- [ ] 根 Playwright config 把 React/Vue testMatch 分别限定到两个 app 的 `e2e` 目录。
- [ ] 静态 `--list` 证明两个 project 均非空，E2E 扫描不存在 `page.route`/`route.fulfill`/`devApi`。
- [ ] Contracts 双类型/test/build 与 React/Vue type/test/build 均执行，浏览器 journey 顺序执行。
- [ ] 两个 probe 都先失败、恢复后通过，最终 diff 无故障代码。
- [ ] clean archive 不依赖旧依赖/产物或 Git ignored secret。
- [ ] 整数分、UTC、Cookie/Origin/CSRF、对象授权、并发预约与 409 有断言。
- [ ] 本地证据没有冒充 hosted CI、Docker runtime 或发布成功。

## 12. 常见问题

**本机已有 `node_modules`，还要冷安装吗？**

要。日常增量运行和提交可重建是两种证据；归档/干净目录能发现未声明依赖和旧产物依赖。

**可以并行跑 React/Vue E2E 吗？**

可以为它们配置独立 API/origin/数据库；本课默认共享一个 API origin，因此顺序运行更清晰。

**为什么不在脚本里自动启动 PostgreSQL？**

数据库生命周期由本地环境或 Compose owner 管理。脚本先严格检查目标，避免隐式创建/删除数据库。
CI 服务容器由下一课负责。

**测试失败后可以自动恢复数据库快照吗？**

只可在精确隔离测试库采用已审查清理策略；不能覆盖未知库。失败现场通常应先保留足够证据。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [pnpm install](https://pnpm.io/cli/install)：冻结锁文件语义。
- [pnpm filtering](https://pnpm.io/filtering)：按 workspace package 调用 owner 脚本。
- [TypeScript project references](https://www.typescriptlang.org/docs/handbook/project-references.html)：
  检查真实源码图。
- [Vue TypeScript](https://vuejs.org/guide/typescript/overview.html)：理解 `vue-tsc` 的 SFC 责任。
- [Node test runner](https://nodejs.org/api/test.html)：API 测试退出语义。
- [Playwright test projects](https://playwright.dev/docs/test-projects)：分别表达 React/Vue journey。
- [Git archive](https://git-scm.com/docs/git-archive)：区分提交快照与工作树。

## 我现在能做到什么

我能从干净锁定输入运行 API、PG18、双前端与浏览器质量门，并通过真实错误注入证明门禁覆盖了
应用源码。我也能明确本地证据只属于当前机器和提交，不会把它冒充托管 CI 或发布结果。

## 单元导航

- 章节目录：[04 CI、发布与回滚](../README.md#04-ci发布与回滚)
- 上一课：[Compose HTTPS、证书与状态码诊断](../03-nginx-https-deployment/03-compose-tls-certificate-diagnosis.md)
- 下一课：[GitHub Actions 数据库、双前端与浏览器门禁](02-github-actions-database-browser-gates.md)
