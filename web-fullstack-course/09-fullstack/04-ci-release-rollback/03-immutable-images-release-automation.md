# 不可变镜像与受守卫发布自动化

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 完整 `compose.release.yaml`、完整 `deploy/release.sh` 与无凭据发布证据 JSON |
| 建议时间 | 180 分钟 |
| 发布输入 | API/Web repository digest、HTTPS `SITE_URL`、commit、lock/migration/config 版本 |
| 身份拆分 | `migrate.env` 为受控 DDL；`runtime.env` 仅为应用 DML |
| 切换顺序 | guard → config → pull → migrate → app/web → Nginx 检查/reload → readiness |
| 写操作边界 | 脚本只供明确授权的隔离目标；本教材任务不运行 pull、迁移或远端发布 |
| 失败原则 | migration/readiness 非零，不自动删 schema、不隐藏错误、不声称零停机 |

## 1. 任务背景

CI 本地构建的 `market-api:<commit>` tag 仍是可移动名字，runner job 结束后镜像也可能消失。授权
制品流程把经过验证和扫描的镜像写入 registry 后，repository digest 才能唯一指向 manifest：

```text
registry.example.test/market-api@sha256:<64 hex>
```

发布目标只拉取这两个不可变引用，不重新 build、不解析 `latest`、不在主机重新安装依赖。迁移先于
应用切换，因此 migration 必须向后兼容当前旧应用；若失败，脚本在切换前停止。切换后还要从外部
HTTPS origin 等待 readiness，而不是只看容器状态。

## 2. 学习目标

完成本课后，你能够：

1. 区分本地 image ID、tag、repository digest 与多架构 manifest；
2. 用严格 guard 拒绝 tag、非 HTTPS URL、缺失 commit/config 等输入；
3. 用 Compose overlay 清除 build，强制 API/migrate/web 使用 digest；
4. 拆分 migration DDL 与 runtime DML 数据库身份；
5. 在应用切换前运行 config/pull/migration，并保留退出码；
6. 在 API/Web 切换后检查 Nginx、reload 服务名并有界等待外部 readiness；
7. 区分 liveness、readiness 与业务 smoke；
8. 记录 commit、lock/image/migration/config 的无秘密证据；
9. 通过 invalid-input guard 测试证明脚本在 Docker 调用前拒绝危险输入；
10. 说明单主机 Compose 重建为什么不是零停机或生产级编排。

## 3. 预备知识

先完成[GitHub Actions 数据库、双前端与浏览器门禁](02-github-actions-database-browser-gates.md)和第
3 章 HTTPS 栈。发布前由操作者在授权系统中确认：

- API/Web digest 来自同一候选 commit 的已验证制品；
- registry pull 身份只有读取所需 repository 的权限；
- `secrets/runtime.env` 与 `secrets/migrate.env` 已由目标 secret 流程提供且权限受限；
- 当前运行版本的 API/Web digest 已记录为 `previous`；
- migration 已审查为向后兼容，并在 PostgreSQL 18 副本/隔离库运行；
- 目标 `SITE_URL` 证书链受发布客户端信任；
- 当前配置支持 Compose `!reset`/`!override`，否则使用经过验证的独立 release 文件；
- 发布窗口、负责人、观察时长和回滚决策人已明确。

本课示例 registry/domain 是文档专用 `.example.test`，不能真实访问。当前任务禁止 registry 写入和
远端部署；只静态检查配置与 shell。

## 4. 核心理论

### 4.1 digest 锁定内容，不能代替来源信任

digest 保证拉取 manifest 的内容地址不变，但攻击者若控制构建或 registry，仍可让你首次记录恶意
digest。还需要受控构建、签名/证明、扫描、权限和审核。回滚也必须记录旧 digest，不能使用
`previous`、`stable` 这类会移动的 tag。

### 4.2 build once, promote same bytes

验证后不在目标机重建。目标机的职责是：

```text
验证输入 -> 拉不可变镜像 -> 迁移 -> 切换 -> 观察
```

目标机若 `docker compose up --build`，会根据当时网络、base tag、上下文和缓存产生另一份未验证
字节，破坏 CI 与 release 的一一对应。

### 4.3 migration 身份与 runtime 身份

`migrate.env` 可以在受控窗口拥有 CREATE/ALTER/迁移表权限；`runtime.env` 只允许应用需要的
SELECT/INSERT/UPDATE/DELETE/sequence。API 被利用时不应自动获得 DROP/ALTER。两个文件都不是
Compose 加密 secret；真实环境由 secret manager/受限文件注入，不能写入镜像或 evidence。

### 4.4 先 migration 的前提是向后兼容

切换前仍有旧 API 在运行。expand migration 必须允许旧版本继续读写，例如新增 nullable 列而不是
立刻 rename/drop。migration 成功不代表新应用一定健康，但 migration 失败可以明确阻止切换。

### 4.5 liveness、readiness、smoke

| 检查 | 回答 | 不回答 |
| --- | --- | --- |
| liveness | 进程是否应被重启 | DB/迁移是否可服务 |
| readiness | 实例是否可接受请求 | 登录/静态资源/业务全正确 |
| external readiness | TLS+Nginx+API 依赖链是否可达 | 写业务与浏览器交互 |
| browser smoke | 关键用户路径是否工作 | 所有回归和容量 |

脚本等待 external readiness，发布后仍需受控只读/虚构数据 smoke 和观察。

### 4.6 readiness 必须有界且验证 TLS

无限循环会占住发布锁。脚本最多 30 次、每次 `curl --max-time 3`、间隔 2 秒；使用系统/目标信任
链，不带 `-k`。失败时非零并保留现场，由操作者根据 previous digest 决策，不自动反复切换。

### 4.7 证据可关联但不能含 secret

证据记录：

- source commit；
- pnpm lock SHA-256；
- API/Web digest；
- migration aggregate SHA-256；
- config version；
- UTC 时间与 ready URL。

不记录 env 文件、连接串、Cookie、CSRF、registry token、私钥或 `docker compose config` 全文。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 本课要求 | 边界 |
| --- | --- | --- | --- |
| `image@sha256` | 不可变拉取 | 精确 64 hex | 不证明构建可信 |
| `!reset null` | 清除 base build | API/migrate/web | 需 Compose 版本 |
| `!override` | 替换 env_file 列表 | DDL/DML 分离 | 文件本身仍需保护 |
| `pull_policy: always` | 按 digest 确认本地内容 | 三服务 | registry 需可读 |
| `set -Eeuo pipefail` | 传播 shell 错误 | release 脚本 | 仍需显式 guard |
| `config --quiet` | 先验证合并配置 | 不输出 secret | 不连接服务 |
| `run --rm migrate` | 一次性迁移 | 失败即停止 | migration 必须兼容 |
| `up --no-build` | 禁止目标重建 | API/Web | 单机可能短暂中断 |
| `nginx -t/reload` | 验证并重载 | readiness 前 | 不替业务 smoke |
| bounded curl | 外部 readiness | HTTPS、30 次 | 不关闭证书验证 |
| evidence JSON | 版本关联 | 无秘密、UTC | 不是审计平台本身 |

## 6. 最小可运行案例

### 6.1 完整 `compose.release.yaml`

它叠加 `compose.yaml` 与 `compose.https.yaml`：

```yaml
services:
  api:
    image: ${API_IMAGE:?Set immutable API_IMAGE}
    build: !reset null
    pull_policy: always
    env_file: !override
      - ./secrets/runtime.env

  migrate:
    image: ${API_IMAGE:?Set immutable API_IMAGE}
    build: !reset null
    pull_policy: always
    env_file: !override
      - ./secrets/migrate.env

  web:
    image: ${WEB_IMAGE:?Set immutable WEB_IMAGE}
    build: !reset null
    pull_policy: always
```

同一 `API_IMAGE` 运行 migration 和 API，避免目标机从不同源码执行 schema。`WEB_IMAGE` 明确选择
已经验收的 React 或 Vue digest；二者不可用同一名字含糊记录。

### 6.2 完整 `deploy/release.sh`

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

die() {
  printf 'release: %s\n' "$*" >&2
  exit 2
}

require_env() {
  local variable_name="$1"
  [[ -n "${!variable_name:-}" ]] || die "$variable_name is required"
}

for variable_name in \
  API_IMAGE WEB_IMAGE SITE_URL SOURCE_COMMIT CONFIG_VERSION; do
  require_env "$variable_name"
done

digest_pattern='^([a-z0-9.-]+(:[0-9]+)?/)?[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)*@sha256:[a-f0-9]{64}$'
[[ "$API_IMAGE" =~ $digest_pattern ]] \
  || die "API_IMAGE must be an immutable repository digest"
[[ "$WEB_IMAGE" =~ $digest_pattern ]] \
  || die "WEB_IMAGE must be an immutable repository digest"
[[ "$SITE_URL" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]] \
  || die "SITE_URL must be an HTTPS origin without path or credentials"
[[ "$SOURCE_COMMIT" =~ ^[a-f0-9]{7,64}$ ]] \
  || die "SOURCE_COMMIT must be a hexadecimal commit identifier"
[[ "$CONFIG_VERSION" =~ ^[A-Za-z0-9._-]{1,128}$ ]] \
  || die "CONFIG_VERSION has an invalid shape"

LOCK_FILE="${LOCK_FILE:-pnpm-lock.yaml}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-apps/api/migrations}"
EVIDENCE_DIR="${EVIDENCE_DIR:-./evidence/releases}"

[[ "$EVIDENCE_DIR" == "./evidence/releases" ]] \
  || die "EVIDENCE_DIR must remain ./evidence/releases"
[[ -f "$LOCK_FILE" ]] || die "lock file not found: $LOCK_FILE"
[[ -d "$MIGRATIONS_DIR" ]] || die "migrations directory not found: $MIGRATIONS_DIR"

for command_name in docker curl awk find sort date mkdir mv seq sleep; do
  command -v "$command_name" >/dev/null \
    || die "required command not found: $command_name"
done

hash_file() {
  local file="$1"
  if command -v sha256sum >/dev/null; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    die "sha256sum or shasum is required"
  fi
}

hash_stdin() {
  if command -v sha256sum >/dev/null; then
    sha256sum | awk '{print $1}'
  elif command -v shasum >/dev/null; then
    shasum -a 256 | awk '{print $1}'
  else
    die "sha256sum or shasum is required"
  fi
}

lock_checksum="$(hash_file "$LOCK_FILE")"
migration_manifest="$(
  find "$MIGRATIONS_DIR" -type f -print \
    | LC_ALL=C sort \
    | while IFS= read -r file; do
        printf '%s  %s\n' "$(hash_file "$file")" "$file"
      done
)"
[[ -n "$migration_manifest" ]] || die "no migration files found"
migration_checksum="$(printf '%s\n' "$migration_manifest" | hash_stdin)"

compose=(
  docker compose
  -f compose.yaml
  -f compose.https.yaml
  -f compose.release.yaml
)

"${compose[@]}" version >/dev/null
"${compose[@]}" config --quiet
"${compose[@]}" pull api migrate web
"${compose[@]}" run --rm migrate
"${compose[@]}" up -d --no-build --no-deps api web
"${compose[@]}" exec -T web nginx -t
"${compose[@]}" exec -T web nginx -s reload

ready_url="${SITE_URL%/}/api/v1/health/ready"
ready=0
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 3 \
    "$ready_url" >/dev/null; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" != 1 ]]; then
  printf '%s\n' \
    "readiness failed; preserve logs and evaluate recorded previous digests" \
    >&2
  exit 1
fi

released_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
release_id="${SOURCE_COMMIT:0:12}-$(date -u +'%Y%m%dT%H%M%SZ')"
mkdir -p "$EVIDENCE_DIR"
evidence_file="$EVIDENCE_DIR/$release_id.json"
temporary_file="$evidence_file.tmp"

printf '%s\n' \
  '{' \
  '  "schemaVersion": 1,' \
  "  \"releasedAt\": \"$released_at\"," \
  "  \"sourceCommit\": \"$SOURCE_COMMIT\"," \
  "  \"lockSha256\": \"$lock_checksum\"," \
  "  \"apiImage\": \"$API_IMAGE\"," \
  "  \"webImage\": \"$WEB_IMAGE\"," \
  "  \"migrationSha256\": \"$migration_checksum\"," \
  "  \"configVersion\": \"$CONFIG_VERSION\"," \
  "  \"readyUrl\": \"$ready_url\"" \
  '}' \
  > "$temporary_file"
mv "$temporary_file" "$evidence_file"

printf 'release ready; evidence=%s\n' "$evidence_file"
```

脚本 guard 全部在任何 Docker 命令之前执行。digest/SITE/config 输入字符集受限，证据 JSON 不需要
插入未转义任意文本。它不打印 env file 或 `compose config`。migration 的 `run` 先确保数据库
依赖可用；切换时用 `--no-deps`，避免 base Compose 的 one-shot migration 依赖被再次启动。

发布机必须信任 `SITE_URL` 的 CA；脚本故意没有 `curl -k`。

### 6.3 静态检查与 guard 失败实验

```bash
bash -n deploy/release.sh
```

在个人项目根目录，只测试保证不会到达 Docker 的非法输入：

```bash
set +e
API_IMAGE='registry.example.test/market-api:latest' \
WEB_IMAGE='registry.example.test/market-web@sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' \
SITE_URL='https://market.example.test' \
SOURCE_COMMIT='abcdef1234567' \
CONFIG_VERSION='local-test' \
  bash deploy/release.sh
status=$?
set -e
test "$status" -eq 2
```

预期 stderr 指出 `API_IMAGE must be an immutable repository digest`，在检查 Docker 工具、pull 或
migration 前退出。分别把 `WEB_IMAGE` 改成 tag、`SITE_URL` 改成 HTTP、缺少 commit/config 重试，
都必须在外部写操作前失败。64 位重复字母 digest 只用于 shape guard，不能 pull 或称为真实镜像。

## 7. 邻里集市集成案例

### 7.1 授权发布输入

真实执行时，操作者从批准记录读取值，而不是手敲 `latest`：

```text
SOURCE_COMMIT=<已批准 commit>
API_IMAGE=<registry 中已验证的 API repository digest>
WEB_IMAGE=<React 或 Vue 的已验证 repository digest>
CONFIG_VERSION=<受控配置版本>
SITE_URL=<隔离目标 HTTPS origin>
```

前一版本的 API/Web digest 必须在执行前单独记录。脚本生成当前 evidence，但不会猜“上一版”。
registry 登录和 secret 注入由外部受控流程完成，本课不提供 token 命令。

### 7.2 发布后的业务 smoke

external readiness 通过后，使用虚构测试账号：

1. HTTPS 首页与一个真实 hash asset 成功；
2. 登录建立 Secure/HttpOnly Cookie；
3. unsafe 创建商品携带精确 Origin/CSRF，价格 `19900` 分；
4. 响应时间为 UTC ISO 8601；
5. 用户乙编辑用户甲商品返回 403；
6. owner 旧 version 返回 409；
7. logout 后旧 session 返回 401。

这些 smoke 不写真实用户数据，不把 Cookie/CSRF 放入 evidence。readiness 与业务 smoke 分开记录。

### 7.3 DDL/DML 权限验证

发布前在隔离数据库检查：

- migrate role 能在指定 schema 执行已审查 DDL；
- runtime role 可以执行业务 DML/sequence；
- runtime role 不能 DROP/ALTER 表；
- API 连接实际使用 runtime 身份；
- migration container 实际使用 migrate 身份。

Compose env file 的文件名不证明数据库 grant 正确，必须连接后检查 current_user 与权限。

### 7.4 单主机切换边界

`up -d --no-build api web` 可能重建容器并产生短暂不可用。本课没有蓝绿 upstream、连接 draining、
多副本 rolling update 或流量切换，因此不能称“零停机”。Nginx reload 用来加载配置/解析，不会
把单副本 API 变成高可用。

## 8. 常见错误与排查路径

### 明确错误：migration 失败但脚本继续切换

错误写法：

```bash
"${compose[@]}" run --rm migrate || true
"${compose[@]}" up -d --no-build api web
```

| 五段 | 记录 |
| --- | --- |
| 现象 | migration 日志报错，新 API 仍被启动，随后 readiness/业务请求因缺列失败 |
| 证据 | migration 非零被 `|| true` 吞掉；新容器创建时间晚于失败 |
| 原因 | 发布脚本破坏 fail-fast，把 schema 前置条件改成可忽略提示 |
| 修复 | 删除 `|| true`，保留 `set -e`; migration 必须退出 0 才切换 |
| 复验 | 注入无效 migration 后脚本在 run 停止，API/Web digest 未切换；恢复后继续 |

### mutable tag 被接受

检查 regex 和 guard 顺序。任何 `:latest`、`:main`、`:v1` 即使团队称“固定 tag”也不是本课接受的
release input；必须是 repository digest。

### `compose config` 展开了 secret

脚本只用 `--quiet`。排错时若人工输出完整 config，先在受控终端查看，不上传；env_file 内容未必
直接显示，但环境插值和路径仍可能敏感。

### migration 成功、readiness 失败

不要自动反向 migration。先查新 API logs、runtime role 权限、config、Nginx DNS/TLS 和外部
requestId。根据 previous digest 和 schema compatibility 决定应用回滚。

### readiness 只检查容器内 URL

容器内 ready 会绕过 TLS、Nginx、DNS 和证书。脚本必须请求外部 `SITE_URL`；容器 health 是补充。

### evidence 记录 env

删除受影响证据并按泄漏处理撤销真实凭据。证据只含不可变标识/hash/时间，不需要连接串或 token。

## 9. 课后题

**问题 1：repository digest 为什么优于 `v1.2.3` tag？**

参考答案：tag 可被重新指向，digest 内容寻址；版本 tag 可作人类索引，但发布记录必须落到 digest。

**问题 2：为什么 migration 和 API 使用同一镜像却不同 env？**

参考答案：保证代码/迁移版本一致，同时让 DDL 高权限只在受控短任务存在，runtime 保持最小 DML。

**问题 3：readiness 失败为什么不自动 restore 备份？**

参考答案：多数发布失败是应用/config 问题，restore 会丢失备份后的写入；先应用回滚和诊断。

**问题 4：为什么脚本不自动回滚？**

参考答案：migration 是否向后兼容、是否已有新写入和失败层次需要决策；盲目抖动版本会扩大影响。

**问题 5：digest 是否能证明镜像来自指定 commit？**

参考答案：不能单独证明。需要构建 provenance/签名、受控 CI 和 evidence 将 commit 与 digest 关联。

## 10. 实践练习

### 基础：guard 矩阵

只用非法输入运行 mutable API、mutable Web、HTTP site、非法 commit/config 四组测试。完成标准：
均退出 2，且 Docker stub/审计日志证明没有调用 pull/migrate。

### 进阶：最小权限角色

在隔离 PG18 创建 migration/runtime role，验证 runtime DML 成功、ALTER 失败，migration 能执行
受控 migration。完成标准：权限 SQL 和 current_user 证据不含密码。

### 故障注入：readiness 超时

只在隔离目标把 ready handler 改成失败或让 API 不可达，执行发布演练。完成标准：轮询有界非零，
保留新/旧 digest、日志和 DB 状态，不 drop schema、不 restore 备份、不声称发布成功。

## 11. 阶段验收

- [ ] API/Web 输入均为严格 repository digest，tag 在 Docker 前被拒绝。
- [ ] `SITE_URL` 只接受 HTTPS origin，无 credentials/path。
- [ ] overlay 清除 build，migrate/API 同一 API digest。
- [ ] runtime/migrate env 与数据库 grant 实际分离。
- [ ] config/pull/migrate/up/Nginx/readiness 顺序明确且 fail-fast。
- [ ] 目标机使用 `--no-build`，不重新生成未验证字节。
- [ ] readiness 请求外部 HTTPS，证书验证开启，轮询有界。
- [ ] evidence 含 commit、lock、images、migration、config、UTC，不含 secret。
- [ ] previous API/Web digest 在发布前单独记录。
- [ ] 迁移失败不会切换；readiness 失败不会自动 DROP/restore。
- [ ] 单主机 Compose 未被描述为零停机。
- [ ] 本轮只完成 Bash/YAML 静态/guard 检查时，registry/发布保持“未执行”。

## 12. 常见问题

**为什么 `pull_policy: always` 配 digest？**

让 Compose向 registry 确认并获取该确切内容；本地已有相同 digest 时不会改变不可变语义。

**可以把 release evidence 提交 Git 吗？**

需按组织策略决定。它不含 secret 仍可能暴露内部 registry/版本；本课默认保存在受控 evidence
系统或个人隔离练习目录，不要求提交教材仓库。

**为何脚本同时支持 `sha256sum` 和 `shasum`？**

Linux 常见前者、macOS 常见后者；两者都计算 SHA-256。真实发布主机应固定工具镜像/版本。

**Compose `!override` 不支持怎么办？**

建立经过静态/运行验证的完整 standalone release file，明确列出所有服务和 env，不依赖错误合并。
不要把 `env_file: []` 当作已覆盖。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [Docker image digests](https://docs.docker.com/dhi/core-concepts/digests/)：不可变引用。
- [Docker pull by digest](https://docs.docker.com/reference/cli/docker/image/pull/)：repository digest
  语法。
- [Compose merge](https://docs.docker.com/reference/compose-file/merge/)：`!reset` 与 `!override`。
- [Compose production](https://docs.docker.com/compose/how-tos/production/)：覆盖与目标差异。
- [Nginx controlling](https://nginx.org/en/docs/control.html)：配置测试和 reload。
- [PostgreSQL privileges](https://www.postgresql.org/docs/18/ddl-priv.html)：DDL/DML 最小权限。
- [SLSA provenance](https://slsa.dev/provenance/)：commit、构建与制品关联。

## 我现在能做到什么

我能拒绝可移动 tag 和非 HTTPS 目标，用不可变 API/Web digest、分离数据库身份和向后兼容 migration
执行受守卫发布，并等待外部 readiness 后生成无秘密证据。我也能明确静态脚本检查不等于 registry
或远端发布已发生。

## 单元导航

- 章节目录：[04 CI、发布与回滚](../README.md#04-ci发布与回滚)
- 上一课：[GitHub Actions 数据库、双前端与浏览器门禁](02-github-actions-database-browser-gates.md)
- 下一课：[回滚、expand/contract 与证据保全](04-rollback-expand-contract-evidence.md)
