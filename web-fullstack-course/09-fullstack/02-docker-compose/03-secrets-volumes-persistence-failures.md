# Secret、Volume、持久化与故障恢复：重建进程，不删除事实

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 本地 secret 创建流程、API 重建持久化脚本、五类可重复故障记录、角色轮换方案 |
| 核心证据 | API 容器被强制重建后，商品仍可读取，未过期数据库 session 仍能 `/auth/me` |
| 数据边界 | named volume 保存 PostgreSQL 事实；volume 不是备份；默认命令绝不带 `down -v` |
| secret 边界 | 本地 Compose file secret 是挂载，不是自动加密的企业 secret manager |
| 建议时间 | 180 分钟 |
| 环境标签 | 仅个人隔离 Compose project；没有 Docker/PG18 时 runtime 验收保持阻塞 |

本课不复制 Dockerfile 或 `compose.yaml`。它拥有
`ops/verify-compose-persistence.sh`，通过前两课的唯一配置执行重建和断言。

## 1. 任务背景

容器可替换是优点，但前提是把状态放在正确位置。API 进程、临时文件和内存 token 可以随容器消失；
Listing、Reservation 和数据库 session 不可以。它们应存 PostgreSQL named volume，并由备份恢复
另行保护。

另一个误区是“我用了 Compose secrets，所以密码已加密”。本地 Compose 的 file secret 主要提供
`/run/secrets/...` 文件挂载和权限边界；拥有宿主/Docker 高权限的人仍可访问源文件或容器。API 的
`env_file` 连接串也可能通过 inspect 暴露给有 Docker 权限的人。

本课用真实故障证明边界：重建 API 不丢数据库事实；改初始化密码不会自动修改旧数据库角色；错误
host、health path、缺迁移和错误监听地址各有不同证据；删 volume 不是修配置的方法。

## 2. 学习目标

完成本课后，你能够：

1. 用高熵 URL-safe 本地密码创建 secret 文件，不在命令历史打印值；
2. 解释 file secret、env_file、镜像 secret manager 和应用加密的区别；
3. 检查 secret/连接串不进入 Git、构建上下文、日志和公开证据；
4. 创建商品并保存 session Cookie jar 的受控本地证据；
5. 只强制重建 API，不重建/删除数据库 volume；
6. 证明 Listing 和未过期 session 在 API 重建后仍存在；
7. 解释 named volume、逻辑备份和异地恢复的不同故障覆盖；
8. 复现 localhost、坏 health path、旧卷密码、缺迁移、loopback bind 五类故障；
9. 用安全角色轮换替代删除 volume；
10. 在每次故障中保存现象、证据、原因、修复和复验。

## 3. 预备知识

- 完成[Compose 服务、DNS、健康与迁移](02-compose-services-network-health-migrations.md)；
- 只使用 `name: market-course` 对应的个人项目，先运行 `docker compose ls` 确认范围；
- API session 必须存 PostgreSQL；内存 Map session 重建后必然丢失，不能用于本课证据；
- 准备一个虚构 owner 账号、一个已创建 Listing ID 和只在 `/tmp` 使用的 Cookie jar；
- 已知当前主环境若无 Docker/PostgreSQL 18，本课只能检查 shell/YAML/文档，不能运行持久化实验。

任何命令执行前先记录：

```bash
docker version
docker compose version
docker compose -f compose.yaml config --quiet
docker compose ps --all
```

不要在名称不匹配或存在不相关服务的目录继续。

## 4. 核心理论

### 4.1 secret 的“没提交”不等于“不可见”

| 方式 | 值位于哪里 | 常见可见者 | 本课结论 |
| --- | --- | --- | --- |
| Dockerfile `ENV` | 镜像 config/layer | 镜像读取者 | 禁止放凭据 |
| Compose `env_file` | 宿主文件 + 容器环境 | 宿主/Docker 管理者 | 本地可用，非加密托管 |
| Compose file secret | 宿主源文件 + `/run/secrets` | 宿主/Docker 管理者、目标进程 | 文件挂载边界 |
| 外部 secret manager | 专用服务与临时注入 | 按身份策略授权者 | 生产优先，仍需轮换审计 |
| 应用字段加密 | 数据库密文 + 密钥系统 | 取决于密钥边界 | 与连接密码管理不是一回事 |

本课 PostgreSQL 官方镜像支持 `POSTGRES_PASSWORD_FILE`，因此数据库容器读取 file secret。API 综合
项目只接受 `DATABASE_URL`，本地教学通过 `secrets/api.env` 注入。生产应让 API 支持分字段/file
读取或由 secret manager 注入，不能把本地 env_file 宣称为生产加密方案。

### 4.2 volume 是容器生命周期之外的本机状态

named volume 生命周期独立于某个 API/db container：

```text
删除/重建 api container -> pgdata 不变
重建 db container       -> 挂回同一 pgdata，数据可恢复
删除 pgdata volume      -> 数据目录消失
宿主磁盘损坏            -> volume 也可能消失
```

因此 volume 提供**持久化**，不提供独立故障域、版本化、保留期和恢复演练。备份必须可校验、存放在
独立位置并实际恢复到新数据库；运维章再完成。

### 4.3 初始化变量只对空数据目录生效

`POSTGRES_USER/DB/PASSWORD_FILE` 在首次初始化空 PGDATA 时创建角色和数据库。之后改 secret 文件并
重建 db，不会自动 `ALTER ROLE`。这是保护已有数据库不被环境变量悄悄改写，不是镜像缓存错误。

正确轮换是：

1. 创建/修改新凭据和最小角色；
2. 更新应用 secret；
3. 重建 API 并确认新连接成功；
4. 观察旧连接排空；
5. 撤销旧角色登录或旧密码；
6. 保存审计证据。

不能删 volume 迫使初始化重跑。

### 4.4 持久化证据必须跨“身份变化”

只看到相同 container name 不足以证明重建。证据至少包含：

- API 重建前/后的 container ID 不同；
- db container ID 和 pgdata volume identity 保持；
- 同一 Listing ID 前后都能解析，整数分/version 不变或符合业务写入；
- 同一未过期 Cookie 在 API 重建后 `/auth/me` 仍为 200；
- API 进程 UID 非 0，db 未发布宿主端口。

### 4.5 故障修复不应破坏原始证据

面对数据库连接失败，先保存：

```text
时间、project、service、container ID、health、首条错误、配置 hash
```

再修改最小配置并重建相关 service。删除 container 可能可以恢复；删除 volume 会抹掉最重要的数据库
现场，因此不作为普通连接/密码/health 故障的修复动作。

## 5. Secret、Volume 与故障接口清单

| 名称/命令 | 最小用法 | 作用 | 边界 |
| --- | --- | --- | --- |
| `umask 077` | 创建 secret 前设置 | 新文件仅 owner 可读写 | 已有文件权限需另查 |
| `openssl rand -hex 24` | URL-safe 本地密码 | 避免连接串编码歧义 | 不能输出到聊天/日志 |
| `/run/secrets/...` | DB password file | 容器文件注入 | 源文件仍在宿主 |
| `env_file` | `secrets/api.env` | API 运行配置 | Docker 管理者可 inspect |
| named volume | `pgdata` | PG18 数据持久化 | 不是备份 |
| `up --force-recreate --no-deps api` | 只重建 API | 验证无状态应用 | 不重建依赖 |
| `docker compose port` | 查宿主映射 | 证明 db 未发布 | 不能证明网络 ACL |
| `docker inspect` | ID/user/mount/exit | 运行时证据 | 输出需脱敏 |
| `ALTER ROLE`/新角色 | 受控轮换 | 更新数据库凭据 | 需要迁移管理员权限 |
| `/auth/me` | Cookie jar GET | 验证 DB session 持久 | 不打印 Cookie |

## 6. 最小可运行案例

### 6.1 创建本地 secret，不显示原文

先在后端综合项目已有根 `.gitignore` 末尾增加以下规则；这是对唯一文件的增量，不另建第二份完整
`.gitignore`：

```gitignore
secrets/
backups/
```

在个人 `market/` 根执行：

```bash
umask 077
mkdir -p secrets
openssl rand -hex 24 > secrets/db_password.txt
DB_PASSWORD="$(tr -d '\n' < secrets/db_password.txt)"
printf 'DATABASE_URL=postgresql://market_owner:%s@db:5432/market\n' \
  "$DB_PASSWORD" > secrets/api.env
unset DB_PASSWORD
chmod 600 secrets/db_password.txt secrets/api.env
```

hex 只含 URL unreserved 字符，避免把特殊字符直接嵌入 URL。若使用其他随机编码，必须进行正确 URL
percent-encoding，不能手工替换部分字符。

只检查元数据：

```bash
stat -f '%Sp %N' secrets/db_password.txt secrets/api.env 2>/dev/null \
  || stat -c '%A %n' secrets/db_password.txt secrets/api.env
git check-ignore secrets/db_password.txt secrets/api.env
```

预期权限为 owner-only，两个文件都被 Git ignore。不要运行会展开值的 `docker compose config`
并把输出上传；静态检查使用 `--quiet`。

### 6.2 建立前置业务事实

启动栈后，沿用第 1 章客户端做浏览器手工证据；为了运行下方自动脚本，另按
[后端真实 HTTP 验收 Runbook](../../08-backend/10-api-capstone/04-real-http-database-acceptance-runbook.md)
的受控 curl 流程登录并创建一个 Listing，记录：

- Listing ID；
- 响应 `priceCents`、`version`、UTC `createdAt`；
- Cookie jar 的**路径和权限**，不记录内容；
- API/db container ID 与 pgdata volume 名。

curl Cookie jar 只放 `/tmp/market-course-cookie.jar`，权限 600，实验结束精确删除。浏览器 Cookie
不能冒充该文件；创建流程仍要发送当前 CSRF token，不能为了脚本方便关闭 CSRF。

## 7. 邻里集市集成案例

### 7.1 完整持久化验收脚本

脚本只读业务数据并重建 API，不创建/删除 volume，不输出 Cookie 或连接串。

完整文件：`market/ops/verify-compose-persistence.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

LISTING_ID="${1:?usage: COOKIE_JAR=/tmp/file $0 LISTING_ID}"
COOKIE_JAR="${COOKIE_JAR:?set COOKIE_JAR to a protected local cookie jar}"
API_URL="${API_URL:-http://127.0.0.1:3000/api/v1}"
COMPOSE_FILE="${COMPOSE_FILE:-compose.yaml}"
PROJECT_NAME=market-course

if [[ "$API_URL" != "http://127.0.0.1:3000/api/v1" ]]; then
  printf '%s\n' "refusing API outside the fixed loopback lab" >&2
  exit 2
fi
if [[ "$COMPOSE_FILE" != "compose.yaml" ||
      ! -f "$COMPOSE_FILE" ||
      -L "$COMPOSE_FILE" ]]; then
  printf '%s\n' "refusing unexpected or symlink Compose file" >&2
  exit 2
fi
project_root="$(pwd -P)"
physical_compose="$project_root/compose.yaml"
if [[ ! -O "$physical_compose" ]]; then
  printf '%s\n' "Compose file is not owned by the current reader" >&2
  exit 2
fi

if [[ "$COOKIE_JAR" != "/tmp/market-course-cookie.jar" ||
      ! -f "$COOKIE_JAR" ||
      -L "$COOKIE_JAR" ||
      ! -O "$COOKIE_JAR" ]]; then
  printf '%s\n' "refusing unprotected or unexpected cookie jar" >&2
  exit 2
fi
file_mode() {
  if [[ "$(uname -s)" == "Darwin" ]]; then
    stat -f '%Lp' "$1"
  else
    stat -c '%a' "$1"
  fi
}
if [[ "$(file_mode "$COOKIE_JAR")" != "600" ]]; then
  printf '%s\n' "cookie jar must have mode 600" >&2
  exit 2
fi

work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

compose=(
  docker compose
  --project-name "$PROJECT_NAME"
  -f "$physical_compose"
)

services="$("${compose[@]}" config --services)"
for required_service in api db migrate; do
  if ! grep -Fxq "$required_service" <<<"$services"; then
    printf 'required Compose service is absent: %s\n' "$required_service" >&2
    exit 2
  fi
done

before_api_id="$("${compose[@]}" ps -q api)"
db_id="$("${compose[@]}" ps -q db)"
migrate_id="$("${compose[@]}" ps -aq migrate)"
for container_id in "$before_api_id" "$db_id" "$migrate_id"; do
  if [[ -z "$container_id" ]]; then
    printf '%s\n' "required Compose container is absent" >&2
    exit 2
  fi
done
for service_and_id in \
  "api:$before_api_id" \
  "db:$db_id" \
  "migrate:$migrate_id"; do
  service="${service_and_id%%:*}"
  container_id="${service_and_id#*:}"
  observed_project="$(
    docker inspect "$container_id" \
      --format '{{index .Config.Labels "com.docker.compose.project"}}'
  )"
  observed_service="$(
    docker inspect "$container_id" \
      --format '{{index .Config.Labels "com.docker.compose.service"}}'
  )"
  if [[ "$observed_project" != "$PROJECT_NAME" ||
        "$observed_service" != "$service" ]]; then
    printf 'refusing container outside %s/%s\n' \
      "$PROJECT_NAME" "$service" >&2
    exit 2
  fi
done

if "${compose[@]}" port db 5432 >"$work_dir/db-port.txt" 2>/dev/null &&
   [[ -s "$work_dir/db-port.txt" ]]; then
  printf '%s\n' "database unexpectedly has a published host port" >&2
  exit 2
fi

wait_ready() {
  local attempt
  for attempt in {1..30}; do
    if curl --fail --silent --show-error \
      "$API_URL/health/ready" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  printf '%s\n' "api readiness did not recover within 30 seconds" >&2
  return 1
}

assert_listing() {
  local file="$1"
  node - "$LISTING_ID" "$file" <<'NODE'
import { readFileSync } from "node:fs";

const expectedId = process.argv[2];
const path = process.argv[3];
const value = JSON.parse(readFileSync(path, "utf8"));
if (value === null || typeof value !== "object" || Array.isArray(value)) {
  throw new Error("listing response is not an object");
}
if (value.id !== expectedId) throw new Error("listing id changed");
if (!Number.isSafeInteger(value.priceCents) || value.priceCents < 0) {
  throw new Error("priceCents is not a non-negative safe integer");
}
if (!Number.isSafeInteger(value.version) || value.version < 1) {
  throw new Error("version is invalid");
}
if (typeof value.createdAt !== "string" || !value.createdAt.endsWith("Z")) {
  throw new Error("createdAt is not UTC ISO");
}
NODE
}

wait_ready
migrate_exit="$(docker inspect "$migrate_id" --format '{{.State.ExitCode}}')"
[[ "$migrate_exit" == "0" ]] || {
  printf '%s\n' "migration did not exit 0" >&2
  exit 1
}

curl --fail --silent --show-error \
  "$API_URL/listings/$(node -p 'encodeURIComponent(process.argv[1])' "$LISTING_ID")" \
  > "$work_dir/before.json"
assert_listing "$work_dir/before.json"

session_before="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --cookie "$COOKIE_JAR" "$API_URL/auth/me")"
[[ "$session_before" == "200" ]] || {
  printf '%s\n' "session was not valid before api recreation" >&2
  exit 1
}

"${compose[@]}" up -d --force-recreate --no-deps api
wait_ready

after_api_id="$("${compose[@]}" ps -q api)"
after_db_id="$("${compose[@]}" ps -q db)"
[[ "$before_api_id" != "$after_api_id" ]] || {
  printf '%s\n' "api container id did not change" >&2
  exit 1
}
[[ "$db_id" == "$after_db_id" ]] || {
  printf '%s\n' "db container changed during api-only recreation" >&2
  exit 1
}

curl --fail --silent --show-error \
  "$API_URL/listings/$(node -p 'encodeURIComponent(process.argv[1])' "$LISTING_ID")" \
  > "$work_dir/after.json"
assert_listing "$work_dir/after.json"

session_after="$(curl --silent --output /dev/null --write-out '%{http_code}' \
  --cookie "$COOKIE_JAR" "$API_URL/auth/me")"
[[ "$session_after" == "200" ]] || {
  printf '%s\n' "database-backed session did not survive api recreation" >&2
  exit 1
}

api_uid="$("${compose[@]}" exec -T api id -u)"
[[ "$api_uid" != "0" ]] || {
  printf '%s\n' "api runs as root" >&2
  exit 1
}

printf '%s\n' "compose persistence verification: PASS"
printf 'api_recreated=%s db_unchanged=%s session_status=%s\n' \
  "true" "true" "$session_after"
```

运行：

```bash
chmod +x ops/verify-compose-persistence.sh
COOKIE_JAR=/tmp/market-course-cookie.jar \
  ./ops/verify-compose-persistence.sh "实际创建的 Listing ID"
```

预期脚本打印 PASS；API container ID 改变、db ID 不变、Listing parser 通过、session 前后均 200、API
UID 非 0、db 无宿主端口。脚本不比较整个 JSON 字节，因为并发业务可能合法改变数据；验收窗口应停止
其他写入，并另保存目标 Listing 的前后领域字段。

### 7.2 数据库容器重建的第二层证据

API-only 通过后，可在隔离窗口记录 db ID，再执行：

```bash
docker compose up -d --force-recreate --no-deps db
docker compose up -d
```

等待 db healthy、migrate exit 0、api healthy，再运行同一脚本。预期 db ID 改变但同一 named volume
挂载，Listing/session 仍存在。若 session 已自然过期，不能把 401 归因于 volume；应创建短窗口新
session并记录 expiresAt。

### 7.3 安全结束

```bash
rm -f /tmp/market-course-cookie.jar
docker compose stop
```

只删除自己创建的 Cookie jar并停止服务。保留 volume 供下一章部署/恢复练习；若课程结束需要删除
个人 volume，也必须先列出名称、确认备份/无需保留并使用精确 volume 名，不能把 `down -v` 作为默认
命令。

## 8. 常见错误与排查路径

### 故障一：API 使用 localhost 连接数据库

| 记录项 | 内容 |
| --- | --- |
| 现象 | migrate/API connection refused，db healthy |
| 证据 | 错误目标为 API 容器 127.0.0.1:5432 |
| 原因 | localhost 指当前容器 |
| 修复 | `DATABASE_URL` host 改回 `db` |
| 复验 | migrate 0、ready 200、持久化脚本通过 |

### 故障二：healthcheck 路径不存在

| 现象 | API 进程 running，Compose 显示 unhealthy |
| 证据 | health output 为 `/health/missing` 404 |
| 原因 | 健康路径与真实前缀漂移 |
| 修复 | 恢复 `/api/v1/health/ready` |
| 复验 | 有限重试后 healthy，不用永远 `exit 0` |

### 故障三：修改初始化密码但保留旧 volume

| 现象 | 新连接串认证失败，旧密码仍有效 |
| 证据 | PGDATA 已存在，初始化日志没有重新创建角色 |
| 原因 | `POSTGRES_PASSWORD_FILE` 只在空数据目录初始化 |
| 修复 | 使用管理员连接受控 `ALTER ROLE` 或创建新最小角色，分阶段切换 |
| 复验 | 新连接成功后撤销旧凭据；Listing/session 不丢 |

### 故障四：镜像缺少 migration artifact

| 现象 | migrate service 以 module/file not found 退出，API 不启动 |
| 证据 | migrate exit 非 0，depends_on 未满足 |
| 原因 | Dockerfile 部署目录未包含 `migrate.mjs` 或 SQL |
| 修复 | 回到唯一 Dockerfile 显式复制并构建期 `test -f` |
| 复验 | 新 image 构建通过，migrate 0，API 才启动 |

### 故障五：API 在容器内只监听 127.0.0.1

| 现象 | 容器内 health 可能成功，宿主 `127.0.0.1:3000` connection reset/refused |
| 证据 | socket 只绑定容器 loopback，容器 IP:3000 无监听 |
| 原因 | 应用 bootstrap 未监听 `0.0.0.0` |
| 修复 | API 启动监听 `0.0.0.0`，宿主发布仍限制为 `127.0.0.1` |
| 复验 | 容器 health 与宿主 curl 都 200，局域网未开放 |

## 9. 课后题

**1. 为什么 API 重建后 session 仍存在？**
参考答案：sid Cookie 在浏览器，session 记录在 PostgreSQL volume；API 只是无状态执行进程。若使用
内存 session，则无法通过。

**2. named volume 为什么不是备份？**
参考答案：它通常与宿主磁盘同一故障域，没有独立保留、校验和恢复演练；误删、磁盘损坏或勒索可能
同时破坏。

**3. 改 secret 文件为何不自动改数据库密码？**
参考答案：初始化变量只对空 PGDATA 生效。已有角色必须通过数据库管理命令受控轮换。

**4. 为什么不在故障时先 `down -v`？**
参考答案：它删除最重要的数据现场，掩盖根因并造成不可逆丢失；连接、健康和镜像问题都不需要删卷。

## 10. 实践练习

### 基础：API 重建持久化

按脚本验收一个 Listing 和 session。证据写入 `evidence/api-recreate.md`，包含前后 container ID hash/
短前缀、状态码、领域字段和未输出 secret 声明。完成标准：API ID 不同、db ID 相同、两项事实仍在。

### 进阶：最小权限角色轮换设计

在 `evidence/role-rotation.md` 写出 migration DDL 身份与 API DML 身份的权限表，以及创建新角色、
切换、验证、撤销、审计顺序。完成标准：API 角色不能 CREATE TABLE；新连接验证前不撤销旧凭据；
不删除 volume。

### 故障注入：五故障抽签

从本课五个故障中随机选一个，只在个人 project 注入。保存：

```text
现象 / service 状态 / 首条错误 / 原因 / 单点修复 / 复验 / 数据是否保持
```

完成标准：修复后 migration/ready/persistence 重新通过，pgdata volume identity 未被删除。

## 11. 阶段验收

- [ ] secret 文件运行时生成、权限 owner-only、被 Git 与 build context 排除。
- [ ] 证据中不含密码、DATABASE_URL、Cookie、CSRF token 或完整 inspect 环境。
- [ ] 能准确说明 file secret/env_file 不是自动加密 secret manager。
- [ ] API container ID 重建前后不同，db/volume 在 API-only 实验中保持。
- [ ] 同一 Listing 的整数分、version、UTC 字段可解析。
- [ ] 未过期 PostgreSQL session 在 API 重建后 `/auth/me` 仍为 200。
- [ ] API UID 非 0，数据库无宿主发布端口。
- [ ] 五类故障都有可判定证据和最小修复。
- [ ] 密码轮换通过角色/凭据切换，不删除 volume。
- [ ] 停止和清理流程没有默认 `down -v`。
- [ ] 没有 Docker/PG18 时，runtime 项明确为阻塞而非通过。

## 12. 常见问题

**可以把 api.env 改成 Compose secret 吗？**
可以，但应用要支持从 file 读取分字段配置或入口脚本安全组装，且不能在进程环境/日志泄漏。仅把
同一 URL 文件换个挂载位置不自动获得企业级加密和轮换。

**为什么脚本要求 Cookie jar，不直接重新登录？**
目标是证明同一数据库 session 跨 API 重建存在。重新登录会创建新 session，无法证明旧记录存活。

**db 容器也能随意重建吗？**
在同一版本、同一 volume、正确停止和隔离实验下可验证；主版本升级、数据损坏和恢复是另一类受控
操作。

**什么时候才删除个人 volume？**
确认不再需要、已检查 volume 名、备份/恢复要求已满足时，用精确命令删除。教材不提供通配或默认
破坏性清理。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)：核对本地 file secret 挂载。
- [Compose volumes](https://docs.docker.com/reference/compose-file/volumes/)：理解 named volume 生命周期。
- [Docker storage volumes](https://docs.docker.com/engine/storage/volumes/)：核对挂载与删除边界。
- [PostgreSQL 18：Database Roles](https://www.postgresql.org/docs/18/user-manag.html)：设计角色与 LOGIN。
- [PostgreSQL 18：GRANT](https://www.postgresql.org/docs/18/sql-grant.html)：拆分 DDL/DML 权限。
- [PostgreSQL Docker image](https://hub.docker.com/_/postgres)：核对 `_FILE` 和首次初始化语义。

## 我现在能做到什么

我能诚实区分本地 file secret、容器环境、volume 与备份，用可重复脚本证明 API 重建后 Listing 和
数据库 session 仍存在，并能在不删除 volume 的前提下定位网络、健康、密码、迁移和监听故障。

## 单元导航

[章节 hub](../02-docker-compose.md) ·
[上一课：Compose 服务、DNS、健康与迁移](02-compose-services-network-health-migrations.md) ·
[下一章：Nginx 与 HTTPS 部署](../03-nginx-https-deployment.md) ·
[全栈交付卷目录](../README.md)
