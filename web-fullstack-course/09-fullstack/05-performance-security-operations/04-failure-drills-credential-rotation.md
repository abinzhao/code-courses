# 隔离故障演练与凭据轮换：恢复服务，也恢复业务不变量

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 依次演练自有数据库、Redis、worker、日志 sink 故障，再分阶段轮换数据库凭据并撤销 session |
| 练习目标 | Compose 项目固定 `market-ops-lab`，数据库固定 `market_ops_test`，HTTP 只访问 loopback |
| 运行条件 | 实际故障演练需要 reader-owned Docker/Compose、PostgreSQL 18、Redis/BullMQ 和可运行 API |
| 核心命令 | 故障只用固定 Compose project；凭据只用固定 service 的 `ops/rotate-credential.sh <stage>` |
| 成功证据 | live/ready 分离、受控错误、outbox/queue 追回、幂等副作用唯一、新凭据接管、旧身份/session 失效 |
| 失败证据 | 重启全部服务、清队列/删卷、吞掉错误、旧凭据仍可登录、旧 Cookie 仍可访问 |
| 禁止动作 | 不停止未知服务，不 `down -v`，不删 Redis/PG 数据，不清空业务表，不对共享/生产目标轮换 |
| 当前环境 | 无 Docker/PG18 时只做 Node/Bash/SQL 静态检查；不得声称故障恢复或轮换通过 |

## 1. 任务背景

“容器重新变绿”不等于系统恢复。数据库停机期间，API 可能返回无结构 500；Redis 恢复后，
outbox 可能重复发布；worker 重启后，通知可能发送两次；数据库密码改了，但旧进程仍持有旧连接；
session 密钥或 Cookie 泄露后，只恢复数据库也不会让攻击者退出。

演练要回答：

```text
故障是否只作用于自有隔离目标？
用户看到了什么？
live 与 ready 是否表达真实状态？
业务事务是否提交或回滚完整？
积压是否追回？
重复投递是否只有一个业务副作用？
新凭据是否先验证？
旧凭据和旧 session 是否真的失效？
恢复后哪些外部副作用仍需对账？
```

## 2. 学习目标

完成本课后，你能够：

1. 用预检确认 Compose project、文件、数据库和服务 ownership；
2. 只停止目标 service，不用重启全部系统掩盖根因；
3. 验证数据库不可用时 live 200、ready 503 和业务请求受控失败；
4. 验证 Redis/worker 不可用时业务事务与 outbox 仍持久，恢复后可追赶；
5. 用 event ID/job ID/业务唯一约束证明至少一次投递没有重复副作用；
6. 区分日志 sink、磁盘告警与数据库数据盘，不用删除数据解决空间；
7. 用带强制目标/角色/审计守卫的单一脚本，按“建立新身份 -> 切流 -> 验证 -> 禁用旧身份 -> 终止旧连接”轮换数据库凭据；
8. 单独撤销旧 session，并解释恢复数据库不能撤销 Cookie 或外部通知。

## 3. 预备知识

- 完成[备份完整性与隔离恢复](03-backup-integrity-isolated-restore.md)；
- 完成[事务 Outbox](../../08-backend/08-redis-queues-reliability/02-transactional-outbox-consistency.md)和
  [BullMQ 幂等/重试/死信](../../08-backend/08-redis-queues-reliability/03-bullmq-idempotency-retry-dead-letter-shutdown.md)；
- API 已有 `/live`、`/ready`、依赖超时和稳定错误 DTO；
- consumer 有持久幂等表/唯一键，不只依赖 Redis 短期 jobId；
- 当前 runtime、migration、backup、restore、dispatcher 身份已分离；
- 所有虚构账号、日志和证据位于 reader-owned 临时根。

固定实验变量：

```bash
LAB_ROOT=/tmp/full-course-verification/batch-f/reader-owned/market
COMPOSE_FILE="$LAB_ROOT/compose.yaml"
PROJECT=market-ops-lab
API_ORIGIN=http://127.0.0.1:3000
```

`COMPOSE_FILE` 必须由读者拥有。若端口已有未知监听、Compose project 有来源不明容器，停止演练；
不杀未知进程、不接管 volume。

## 4. 核心理论

### 4.1 故障演练先定义 blast radius

一个合格实验在执行前写清：

- 目标 project/service/database/path；
- 预计开始和最长持续时间；
- 允许影响；
- 停止条件；
- 恢复命令；
- 观察信号；
- 业务不变量；
- owner 和旁观者。

“停 Redis 看看”不合格。它可能选错环境，也没有说明 API 是否仍允许提交、outbox 应如何变化和
何时结束。

### 4.2 Live 与 Ready 不能合并

- `/live`：进程事件循环能回应；数据库停机时通常仍 200。
- `/ready`：当前实例能否接新流量；必要数据库不可用时应短超时并返回 503。
- 业务接口：返回稳定 `DEPENDENCY_UNAVAILABLE`/503 或项目约定错误，不挂死到代理超时。

如果 readiness 与 liveness 都深查数据库，短暂 DB 故障会触发无意义重启风暴。如果两者都只看
进程，代理会继续把流量送给不能服务的实例。

### 4.3 数据库故障的事务边界

故障可能发生在：

1. 取得连接前；
2. BEGIN 后、写入前；
3. 部分 SQL 后、COMMIT 前；
4. COMMIT 已成功但响应确认丢失。

前三种应无部分业务状态；第四种结果不确定，客户端不能盲目重试非幂等 mutation。预约依靠唯一
约束和状态查询解决歧义；取消/确认应使用 version、状态机和幂等键。

### 4.4 Redis/worker 故障不应回滚已提交业务

预约和 outbox 同一 PostgreSQL 事务。Redis 停机时：

- 预约仍可按业务策略成功并持久 outbox；
- dispatcher 发布失败，记录受控 error code、attempt/available_at；
- outbox oldest age 增长并告警；
- Redis 恢复后重新发布；
- worker 按 event ID 幂等执行。

如果业务 service 直接 `queue.add` 并因 Redis 错误回滚/假报预约失败，就重新引入跨系统双写。

### 4.5 Queue 为空不证明副作用唯一

队列最终为零可能意味着完成、删除、丢失或死信。恢复证据至少对账：

```text
业务预约行 = 1
outbox event = 1
publish 可能 >= 1
consumer idempotency key = 1
站内通知/业务副作用 = 1
failed/dead-letter 有明确归宿
```

外部邮件供应商还需要 provider idempotency key 或对账，不能用本地 completed 状态证明用户只收
一封。

### 4.6 凭据轮换是有重叠窗口的协议

直接修改当前数据库角色密码会让新连接失败，而旧连接可能继续工作，形成难解释的半轮换。更安全：

```text
创建 next LOGIN 身份
  -> 继承同一 NOLOGIN 权限组
  -> 通过安全渠道设置新秘密
  -> 用 next 做独立连接/业务 smoke
  -> 更新 reader-owned secret 并只重建 API
  -> 确认 pool 全部转到 next
  -> 将 current NOLOGIN
  -> 终止 current 在 market_ops_test 的旧 backend
  -> 证明 current 无法新连
  -> 审计并按保留期删除旧身份
```

迁移、backup、restore 和 dispatcher 身份分别轮换，不能让 API next 获得它们的权限。

### 4.7 Session 撤销是另一条控制面

数据库凭据泄露不必然意味着 Cookie 泄露，但事故范围不清或 session 存储/签名秘密泄露时，应
撤销相关 session。主线使用数据库中 opaque token hash：

- 删除/过期服务端 session 行；
- 浏览器旧 Cookie 再请求得到 401；
- 新登录建立新 token；
- logout 仍删除服务端行并清 Cookie；
- 证据不保存原 Cookie/token。

若使用 session epoch，可提升用户/全局 epoch 并在每次认证比较。无论哪种方案，只改 Cookie
属性或重启 API 都不会撤销已持久 session。

### 4.8 故障证据不能被“恢复”覆盖

保留故障前、故障中、故障后的不同文件和时间线。不要只留最终绿色截图。日志需脱敏；requestId、
eventId 可保留为虚构测试关联键，但不保留 Cookie、CSRF、密码和连接串。

## 5. 命令、状态与证据清单

| 演练 | 触发 | 故障中预期 | 恢复后必须验证 |
| --- | --- | --- | --- |
| PostgreSQL | 只 stop `db` | live 200、ready 503、业务有界 503 | ready 200、查询/事务不变量 |
| Redis | 只 stop `redis` | outbox 保留、age 增长、发布失败分类 | publish 追回、业务副作用唯一 |
| worker | 只 stop `worker` | queue waiting 增长，API/DB 可用 | waiting 下降、failed 有归宿 |
| 日志 sink | reader-owned file limit | sink failure metric，业务不无界阻塞 | 写入恢复、日志量有界 |
| DB credential | 固定 admin/next service + 受守卫脚本 | 新旧重叠可回退 | next 接管，current NOLOGIN/连接 0，四阶段审计齐全 |
| session | 删除/epoch 提升 | 旧 Cookie 401 | 新登录成功、旧 token 不复活 |

## 6. 最小可运行案例

### 6.1 完整 loopback 健康断言器

**完整文件：`ops/check-health.mjs`**

```js
import assert from "node:assert/strict";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);

function checkedOrigin(raw) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("health target must use http or https");
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error("health checks are limited to loopback targets");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("health target must be a credential-free origin");
  }
  return url;
}

async function status(origin, path) {
  const response = await fetch(new URL(path, origin), {
    redirect: "error",
    signal: AbortSignal.timeout(2000),
    headers: { Accept: "application/json" },
  });
  await response.arrayBuffer();
  return response.status;
}

export async function checkHealth({
  origin,
  expectedLive,
  expectedReady,
}) {
  const observed = {
    live: await status(origin, "/api/v1/health/live"),
    ready: await status(origin, "/api/v1/health/ready"),
  };
  assert.equal(observed.live, expectedLive);
  assert.equal(observed.ready, expectedReady);
  return observed;
}

if (
  process.argv[1] &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
) {
  const origin = checkedOrigin(
    process.env.API_ORIGIN ?? "http://127.0.0.1:3000",
  );
  const expectedReady = Number(process.env.EXPECT_READY ?? 200);
  if (![200, 503].includes(expectedReady)) {
    throw new Error("EXPECT_READY must be 200 or 503");
  }
  const observed = await checkHealth({
    origin,
    expectedLive: 200,
    expectedReady,
  });
  console.log(JSON.stringify({
    label: "LOCAL_ISOLATED_HEALTH_OBSERVATION",
    origin: origin.origin,
    expected: { live: 200, ready: expectedReady },
    observed,
    observedAt: new Date().toISOString(),
  }, null, 2));
}
```

### 6.2 静态与安全检查

```bash
node --check ops/check-health.mjs
API_ORIGIN=https://example.com node ops/check-health.mjs
```

第一条预期 0；第二条必须在发送请求前拒绝非 loopback。当前 API 未运行时，loopback 检查会连接
失败，这是环境证据，不得写健康通过。

### 6.3 绿色基线

```bash
API_ORIGIN=http://127.0.0.1:3000 \
EXPECT_READY=200 \
  node ops/check-health.mjs
```

在实际故障前还要运行一条公开查询、一次登录和一项数据库不变量；否则故障后的“恢复”没有可比
基线。

## 7. 邻里集市集成案例

### 7.1 Compose ownership 预检

```bash
set -euo pipefail
LAB_ROOT=/tmp/full-course-verification/batch-f/reader-owned/market
COMPOSE_FILE="$LAB_ROOT/compose.yaml"
PROJECT=market-ops-lab
case "$COMPOSE_FILE" in
  /tmp/full-course-verification/batch-f/reader-owned/market/compose.yaml) ;;
  *) printf '%s\n' "refusing unexpected compose file" >&2; exit 2 ;;
esac
test -f "$COMPOSE_FILE"
docker compose --project-name "$PROJECT" -f "$COMPOSE_FILE" config --quiet
docker compose --project-name "$PROJECT" -f "$COMPOSE_FILE" ps
```

人工确认 project 只含本实验 `db/api/redis/worker` 等服务，volume 名带 `market-ops-lab` 前缀，
API 仅绑定 loopback，数据库/Redis 不发布公网端口。发现未知容器或 volume 即停止。

### 7.2 数据库故障

记录开始时间，只停止自有 db：

```bash
date -u +%Y-%m-%dT%H:%M:%SZ
docker compose --project-name market-ops-lab \
  -f /tmp/full-course-verification/batch-f/reader-owned/market/compose.yaml \
  stop --timeout 10 db

API_ORIGIN=http://127.0.0.1:3000 \
EXPECT_READY=503 \
  node ops/check-health.mjs
```

再请求公开列表，预期在应用依赖超时内返回受控 503/error code/requestId，不一直等到代理超时。
检查 pool acquire timeout 和日志 error class，不记录连接串。

恢复：

```bash
docker compose --project-name market-ops-lab \
  -f /tmp/full-course-verification/batch-f/reader-owned/market/compose.yaml \
  start db

API_ORIGIN=http://127.0.0.1:3000 \
EXPECT_READY=200 \
  node ops/check-health.mjs
```

随后重跑公开查询、一次事务回滚测试、有效预约唯一性和 migration checksum。只看 ready 200 不够。

### 7.3 Redis 故障与 outbox 追回

只停止自有 Redis：

```bash
docker compose --project-name market-ops-lab \
  -f /tmp/full-course-verification/batch-f/reader-owned/market/compose.yaml \
  stop --timeout 10 redis
```

通过正常同源 API 创建一笔虚构预约。若产品策略允许异步通知降级，预期预约 201、reservation 和
outbox 同时存在；dispatcher 记录受控 Redis 错误，outbox `published_at` 为空且 age 增长。若
产品策略选择依赖不可用时拒绝新业务，也必须在契约中明确并证明事务无部分状态，不能临时变化。

恢复 Redis：

```bash
docker compose --project-name market-ops-lab \
  -f /tmp/full-course-verification/batch-f/reader-owned/market/compose.yaml \
  start redis
```

等待有界 dispatcher 周期，按 event ID 对账 outbox published、queue job、consumer idempotency 和
站内通知。不得以“队列为 0”作为唯一证据。

### 7.4 Worker 故障与幂等重放

```bash
docker compose --project-name market-ops-lab \
  -f /tmp/full-course-verification/batch-f/reader-owned/market/compose.yaml \
  stop --timeout 10 worker
```

创建另一笔虚构业务事件，预期 job waiting/age 增长，API 和 PostgreSQL 保持可用。启动 worker：

```bash
docker compose --project-name market-ops-lab \
  -f /tmp/full-course-verification/batch-f/reader-owned/market/compose.yaml \
  start worker
```

故意把同一 event ID 再投递一次，预期消费者幂等表冲突被当作“已处理”，站内通知仍一条。不能
通过换 event ID 规避重复测试。

### 7.5 日志 sink/磁盘故障

复用上一课 reader-owned `ulimit -f` 实验。预期 sink failure 指标增加、应用不无限阻塞、告警
指向本次生成文件。恢复动作只能删除 `generated-by-log-sink-lab.bin`；禁止删除 WAL、数据库、
Redis 持久文件、未知容器日志或保留备份。

### 7.6 数据库凭据分阶段轮换

角色创建、禁用和 backend 终止不能与目标检查拆成“先人工看一眼、稍后再执行”的命令。下面脚本
为每个阶段生成一个临时 SQL 文件；连接目标、PG18、固定 admin/数据库、角色后缀与审计参数守卫，
和该阶段的集群级操作在同一次 `psql -f` 中执行。

**完整文件：`ops/rotate-credential.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
umask 077

ADMIN_SERVICE=market_rotation_admin_local
ADMIN_ROLE=market_rotation_admin_local
NEXT_SERVICE=market_runtime_next_local
DATABASE=market_ops_test
CURRENT_ROLE=market_runtime_current_local
NEXT_ROLE=market_runtime_next_local
PRIVILEGE_ROLE=market_runtime_dml_local
EVIDENCE_ROOT=/tmp/full-course-verification/batch-f/reader-owned/credential-rotation

if (( $# != 1 )); then
  printf '%s\n' \
    "usage: rotate-credential.sh prepare|verify-next|retire|verify-retired" >&2
  exit 2
fi
stage=$1
case "$stage" in
  prepare|verify-next|retire|verify-retired) ;;
  *) printf '%s\n' "refusing unknown rotation stage" >&2; exit 2 ;;
esac

: "${ROTATION_ID:?set a non-secret rotation audit id}"
: "${CHANGE_TICKET:?set a non-secret change ticket}"
: "${OPERATOR_ID:?set a non-secret operator id}"

if [[ ! "$ROTATION_ID" =~ ^rot_[0-9]{8}T[0-9]{6}Z_[A-Za-z0-9_-]{3,32}$ ]]; then
  printf '%s\n' "invalid ROTATION_ID" >&2
  exit 2
fi
if [[ ! "$CHANGE_TICKET" =~ ^[A-Z][A-Z0-9]+-[0-9]+$ ]]; then
  printf '%s\n' "invalid CHANGE_TICKET" >&2
  exit 2
fi
if [[ ! "$OPERATOR_ID" =~ ^[A-Za-z0-9._@-]{3,64}$ ]]; then
  printf '%s\n' "invalid OPERATOR_ID" >&2
  exit 2
fi
if [[ "$ADMIN_SERVICE" != "$ADMIN_ROLE" ||
      "$NEXT_SERVICE" != "$NEXT_ROLE" ]]; then
  printf '%s\n' "fixed service-to-role mapping is inconsistent" >&2
  exit 2
fi
for role in "$ADMIN_ROLE" "$CURRENT_ROLE" "$NEXT_ROLE" "$PRIVILEGE_ROLE"; do
  if [[ ! "$role" =~ _local$ ]]; then
    printf '%s\n' "all fixed roles must use the reader-owned suffix" >&2
    exit 2
  fi
done

psql_version=$(psql --version)
if [[ ! "$psql_version" =~ ^psql\ \(PostgreSQL\)\ 18([.][0-9]+)?([[:space:]].*)?$ ]]; then
  printf 'expected PostgreSQL 18 psql; observed: %s\n' "$psql_version" >&2
  exit 2
fi

owner_uid() {
  if stat -f '%u' "$1" >/dev/null 2>&1; then
    stat -f '%u' "$1"
  else
    stat -c '%u' "$1"
  fi
}

current_uid=$(id -u)
mkdir -p "$EVIDENCE_ROOT"
if [[ -L "$EVIDENCE_ROOT" ]]; then
  printf '%s\n' "refusing symlink credential evidence root" >&2
  exit 2
fi
chmod 700 "$EVIDENCE_ROOT"
physical_evidence_root=$(cd "$EVIDENCE_ROOT" && pwd -P)
case "$physical_evidence_root" in
  /tmp/full-course-verification/batch-f/reader-owned/credential-rotation) ;;
  /private/tmp/full-course-verification/batch-f/reader-owned/credential-rotation) ;;
  *) printf '%s\n' "refusing unexpected credential evidence root" >&2; exit 2 ;;
esac
if [[ "$(owner_uid "$physical_evidence_root")" != "$current_uid" ]]; then
  printf '%s\n' "credential evidence root is not reader-owned" >&2
  exit 2
fi

rotation_dir="$physical_evidence_root/$ROTATION_ID"
mkdir -p "$rotation_dir"
if [[ -L "$rotation_dir" ]]; then
  printf '%s\n' "refusing symlink rotation directory" >&2
  exit 2
fi
chmod 700 "$rotation_dir"
if [[ "$(owner_uid "$rotation_dir")" != "$current_uid" ]]; then
  printf '%s\n' "rotation directory is not reader-owned" >&2
  exit 2
fi

evidence="$rotation_dir/$stage.txt"
if [[ -e "$evidence" ]]; then
  printf '%s\n' "refusing to overwrite completed stage evidence" >&2
  exit 2
fi
sql_file="$rotation_dir/.${stage}.$$.sql"
if [[ -e "$sql_file" ]]; then
  printf '%s\n' "refusing existing temporary SQL file" >&2
  exit 2
fi
trap 'rm -f "$sql_file"' EXIT

write_audit_settings() {
  cat <<'SQL'
\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on
BEGIN;
SELECT
  set_config(
    'market.rotation_id',
    :'rotation_id',
    true
  ) AS rotation_id_setting,
  set_config(
    'market.change_ticket',
    :'change_ticket',
    true
  ) AS change_ticket_setting,
  set_config(
    'market.operator_id',
    :'operator_id',
    true
  ) AS operator_id_setting
\gset audit_
SQL
}

write_admin_guard() {
  write_audit_settings
  cat <<'SQL'
DO $guard$
DECLARE
  target_address text;
  version_num integer;
  admin_role text := 'market_rotation_admin_local';
  current_role_name text := 'market_runtime_current_local';
  next_role_name text := 'market_runtime_next_local';
  privilege_role_name text := 'market_runtime_dml_local';
BEGIN
  target_address := COALESCE(inet_server_addr()::text, 'local-socket');
  version_num := current_setting('server_version_num')::integer;
  IF current_database() <> 'market_ops_test'
     OR target_address NOT IN ('local-socket', '127.0.0.1', '::1')
     OR version_num < 180000
     OR version_num >= 190000
     OR current_user <> admin_role THEN
    RAISE EXCEPTION 'refusing rotation on unexpected connected target';
  END IF;
  IF admin_role !~ '_local$'
     OR current_role_name !~ '_local$'
     OR next_role_name !~ '_local$'
     OR privilege_role_name !~ '_local$' THEN
    RAISE EXCEPTION 'all rotation roles must use the reader-owned suffix';
  END IF;
  IF current_setting('market.rotation_id')
       !~ '^rot_[0-9]{8}T[0-9]{6}Z_[A-Za-z0-9_-]{3,32}$'
     OR current_setting('market.change_ticket')
       !~ '^[A-Z][A-Z0-9]+-[0-9]+$'
     OR current_setting('market.operator_id')
       !~ '^[A-Za-z0-9._@-]{3,64}$' THEN
    RAISE EXCEPTION 'rotation audit parameters are invalid';
  END IF;
END
$guard$;
SQL
}

write_next_guard() {
  write_audit_settings
  cat <<'SQL'
DO $guard$
DECLARE
  target_address text;
  version_num integer;
BEGIN
  target_address := COALESCE(inet_server_addr()::text, 'local-socket');
  version_num := current_setting('server_version_num')::integer;
  IF current_database() <> 'market_ops_test'
     OR target_address NOT IN ('local-socket', '127.0.0.1', '::1')
     OR version_num < 180000
     OR version_num >= 190000
     OR current_user <> 'market_runtime_next_local'
     OR current_user !~ '_local$' THEN
    RAISE EXCEPTION 'refusing next verification on unexpected target';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'market_runtime_next_local'
      AND rolcanlogin
      AND NOT rolsuper
      AND NOT rolcreatedb
      AND NOT rolcreaterole
      AND NOT rolreplication
  ) OR NOT pg_has_role(
    'market_runtime_next_local',
    'market_runtime_dml_local',
    'member'
  ) THEN
    RAISE EXCEPTION 'next runtime role attributes or membership are invalid';
  END IF;
END
$guard$;
SQL
}

case "$stage" in
  prepare)
    {
      write_admin_guard
      cat <<'SQL'
DO $roles$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'market_runtime_current_local'
      AND rolcanlogin
      AND NOT rolsuper
      AND NOT rolcreatedb
      AND NOT rolcreaterole
      AND NOT rolreplication
  ) THEN
    RAISE EXCEPTION 'constrained current runtime role is absent';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'market_runtime_dml_local'
      AND NOT rolcanlogin
  ) OR NOT pg_has_role(
    'market_runtime_current_local',
    'market_runtime_dml_local',
    'member'
  ) THEN
    RAISE EXCEPTION 'runtime privilege role or current membership is invalid';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_roles WHERE rolname = 'market_runtime_next_local'
  ) THEN
    RAISE EXCEPTION 'next runtime role already exists';
  END IF;
END
$roles$;

CREATE ROLE market_runtime_next_local
  LOGIN INHERIT
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION
  PASSWORD NULL;
GRANT market_runtime_dml_local TO market_runtime_next_local;
\password market_runtime_next_local

SELECT json_build_object(
  'stage', 'prepare',
  'rotationId', :'rotation_id',
  'changeTicket', :'change_ticket',
  'operatorId', :'operator_id',
  'database', current_database(),
  'address', COALESCE(inet_server_addr()::text, 'local-socket'),
  'serverMajor', current_setting('server_version_num')::integer / 10000,
  'adminRole', current_user,
  'nextRole', 'market_runtime_next_local',
  'observedAt', clock_timestamp() AT TIME ZONE 'UTC'
);
COMMIT;
SQL
    } >"$sql_file"
    service=$ADMIN_SERVICE
    ;;
  verify-next)
    {
      write_next_guard
      cat <<'SQL'
SELECT count(*) AS visible_listings FROM listings
\gset
SELECT json_build_object(
  'stage', 'verify-next',
  'rotationId', :'rotation_id',
  'changeTicket', :'change_ticket',
  'operatorId', :'operator_id',
  'database', current_database(),
  'address', COALESCE(inet_server_addr()::text, 'local-socket'),
  'serverMajor', current_setting('server_version_num')::integer / 10000,
  'connectedRole', current_user,
  'visibleListings', (:'visible_listings')::bigint,
  'observedAt', clock_timestamp() AT TIME ZONE 'UTC'
);
COMMIT;
SQL
    } >"$sql_file"
    service=$NEXT_SERVICE
    ;;
  retire)
    {
      write_admin_guard
      cat <<'SQL'
DO $roles$
DECLARE
  next_backends integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'market_runtime_next_local'
      AND rolcanlogin
      AND NOT rolsuper
      AND NOT rolcreatedb
      AND NOT rolcreaterole
      AND NOT rolreplication
  ) OR NOT pg_has_role(
    'market_runtime_next_local',
    'market_runtime_dml_local',
    'member'
  ) THEN
    RAISE EXCEPTION 'verified next runtime role is absent';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'market_runtime_current_local'
      AND NOT rolsuper
      AND NOT rolcreatedb
      AND NOT rolcreaterole
      AND NOT rolreplication
  ) THEN
    RAISE EXCEPTION 'constrained current runtime role is absent';
  END IF;
  SELECT count(*) INTO next_backends
  FROM pg_stat_activity
  WHERE datname = 'market_ops_test'
    AND usename = 'market_runtime_next_local';
  IF next_backends < 1 THEN
    RAISE EXCEPTION 'no next backend proves API cutover';
  END IF;
END
$roles$;

ALTER ROLE market_runtime_current_local NOLOGIN;
COMMIT;

SELECT
  count(*) FILTER (WHERE stopped) AS terminated_count,
  count(*) FILTER (WHERE NOT stopped) AS failed_terminations
FROM (
  SELECT pg_terminate_backend(pid) AS stopped
  FROM pg_stat_activity
  WHERE datname = 'market_ops_test'
    AND usename = 'market_runtime_current_local'
    AND pid <> pg_backend_pid()
) AS terminations
\gset

SELECT ((:'failed_terminations')::integer = 0) AS all_terminated
\gset
\if :all_terminated
\else
  \echo one or more old runtime backends could not be terminated
  \quit 3
\endif

DO $postcheck$
BEGIN
  IF current_database() <> 'market_ops_test'
     OR COALESCE(inet_server_addr()::text, 'local-socket')
       NOT IN ('local-socket', '127.0.0.1', '::1')
     OR current_setting('server_version_num')::integer < 180000
     OR current_setting('server_version_num')::integer >= 190000
     OR current_user <> 'market_rotation_admin_local' THEN
    RAISE EXCEPTION 'retire postcheck target changed unexpectedly';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'market_runtime_current_local' AND rolcanlogin
  ) OR EXISTS (
    SELECT 1
    FROM pg_stat_activity
    WHERE datname = 'market_ops_test'
      AND usename = 'market_runtime_current_local'
  ) THEN
    RAISE EXCEPTION 'old runtime role or backend remains active';
  END IF;
END
$postcheck$;

SELECT json_build_object(
  'stage', 'retire',
  'rotationId', :'rotation_id',
  'changeTicket', :'change_ticket',
  'operatorId', :'operator_id',
  'database', current_database(),
  'address', COALESCE(inet_server_addr()::text, 'local-socket'),
  'serverMajor', current_setting('server_version_num')::integer / 10000,
  'adminRole', current_user,
  'retiredRole', 'market_runtime_current_local',
  'terminatedBackends', (:'terminated_count')::integer,
  'observedAt', clock_timestamp() AT TIME ZONE 'UTC'
);
SQL
    } >"$sql_file"
    service=$ADMIN_SERVICE
    ;;
  verify-retired)
    {
      write_admin_guard
      cat <<'SQL'
DO $roles$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'market_runtime_current_local' AND rolcanlogin
  ) OR EXISTS (
    SELECT 1
    FROM pg_stat_activity
    WHERE datname = 'market_ops_test'
      AND usename = 'market_runtime_current_local'
  ) THEN
    RAISE EXCEPTION 'old role is login-capable or still connected';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'market_runtime_next_local' AND rolcanlogin
  ) OR NOT pg_has_role(
    'market_runtime_next_local',
    'market_runtime_dml_local',
    'member'
  ) THEN
    RAISE EXCEPTION 'next role is not ready';
  END IF;
END
$roles$;
SELECT json_build_object(
  'stage', 'verify-retired',
  'rotationId', :'rotation_id',
  'changeTicket', :'change_ticket',
  'operatorId', :'operator_id',
  'database', current_database(),
  'address', COALESCE(inet_server_addr()::text, 'local-socket'),
  'serverMajor', current_setting('server_version_num')::integer / 10000,
  'adminRole', current_user,
  'currentCanLogin', false,
  'currentBackends', 0,
  'observedAt', clock_timestamp() AT TIME ZONE 'UTC'
);
COMMIT;
SQL
    } >"$sql_file"
    service=$ADMIN_SERVICE
    ;;
esac

chmod 600 "$sql_file"
export PSQL_HISTORY=/dev/null
attempt_stamp=$(date -u +%Y%m%dT%H%M%SZ)
attempt_evidence="$rotation_dir/.${stage}-attempt-${attempt_stamp}-$$.txt"
set +e
psql \
  "service=$service dbname=$DATABASE" \
  -X \
  --set="rotation_id=$ROTATION_ID" \
  --set="change_ticket=$CHANGE_TICKET" \
  --set="operator_id=$OPERATOR_ID" \
  --file="$sql_file" \
  2>&1 | tee "$attempt_evidence"
pipeline_status=("${PIPESTATUS[@]}")
set -e
chmod 600 "$attempt_evidence"
if (( pipeline_status[0] != 0 || pipeline_status[1] != 0 )); then
  failed_evidence=\
"$rotation_dir/${stage}-failed-${attempt_stamp}-$$.txt"
  mv "$attempt_evidence" "$failed_evidence"
  printf 'rotation stage failed; evidence=%s\n' "$failed_evidence" >&2
  if (( pipeline_status[0] != 0 )); then
    exit "${pipeline_status[0]}"
  fi
  exit "${pipeline_status[1]}"
fi
mv "$attempt_evidence" "$evidence"
```

先做语法和无副作用门禁：

```bash
bash -n ops/rotate-credential.sh
ROTATION_ID=hand-written \
CHANGE_TICKET=OPS-123 \
OPERATOR_ID=reader.local \
  bash ops/rotate-credential.sh prepare
```

第二条必须在创建 evidence、连接数据库或创建角色前拒绝审计 ID。真实轮换固定同一组三个非秘密
审计参数：

```bash
export ROTATION_ID=rot_20261011T090000Z_reader01
export CHANGE_TICKET=OPS-123
export OPERATOR_ID=reader.local

bash ops/rotate-credential.sh prepare
```

`prepare` 在受守卫事务内创建 next、授予固定 NOLOGIN 权限组，并用 `\password` 从终端交互读取
两次密码；密码不会进入 argv、SQL 临时文件或 evidence。随后把新秘密写入 reader-owned passfile
和权限 600 的
`/tmp/full-course-verification/batch-f/reader-owned/market/secrets/runtime.next.env`，固定 service
`market_runtime_next_local` 只解析到该角色。执行：

```bash
bash ops/rotate-credential.sh verify-next
```

next 的 target、角色属性、组成员资格和实际 `SELECT` 全部通过后，再只重建 API：

```bash
docker compose --project-name market-ops-lab \
  -f /tmp/full-course-verification/batch-f/reader-owned/market/compose.yaml \
  up -d --no-deps --force-recreate api
```

确认 ready、登录、整数分创建、owner 授权、409 和日志正常，并让 API 至少保有一个 next backend。
然后执行：

```bash
bash ops/rotate-credential.sh retire
bash ops/rotate-credential.sh verify-retired
```

`retire` 先在同一 SQL 文件中重验所有守卫和 next backend，再提交 current `NOLOGIN`，只终止自有
`market_ops_test` 的 current backend，并断言连接归零。它允许在 NOLOGIN 已提交、终止失败后用
同一 stage 重试；失败输出改名保留为 `retire-failed-*.txt`，不会冒充完成证据。四个成功 stage
evidence 均位于固定 reader-owned 目录，包含 rotation/ticket/operator、connected target、角色与
数据库 UTC 时间，不含密码。角色删除放在独立保留期后，不在本演练自动执行。

轮换脚本不停止 API、Redis 或 worker，也不修改 Compose/secret 文件；数据库、Redis、worker
故障演练继续按 7.2 至 7.4 单变量执行，不能与凭据轮换合并成一次不可归因的实验。

### 7.7 撤销旧 session

若事故范围包含 Cookie/session 存储或无法排除泄露，在固定本地测试库执行：

```sql
BEGIN;

DO $$
DECLARE
  target_address text;
BEGIN
  target_address := COALESCE(inet_server_addr()::text, 'local-socket');
  IF current_database() <> 'market_ops_test'
     OR target_address NOT IN ('local-socket', '127.0.0.1', '::1') THEN
    RAISE EXCEPTION 'refusing session revocation outside local market_ops_test';
  END IF;
END
$$;

DELETE FROM sessions;

COMMIT;
```

这是全量撤销，只适用于 reader-owned 测试实例。生产应根据事故范围按用户、token generation、
created_at 或全局 epoch 撤销，并通过审批执行。复验：

- 演练前保存的 Cookie 请求 `/auth/me` 为 401；
- 旧 CSRF token 不能恢复身份；
- 新登录成功并获得新 Cookie/CSRF；
- logout 后新 Cookie 再次 401；
- 证据只保存状态码/requestId，不保存 Cookie/token。

### 7.8 最终业务对账

故障全部恢复后检查：

```sql
SELECT listing_id, count(*)
FROM reservations
WHERE status IN ('pending', 'confirmed')
GROUP BY listing_id
HAVING count(*) > 1;

SELECT event_type, count(*) AS pending
FROM outbox_events
WHERE published_at IS NULL AND failed_at IS NULL
GROUP BY event_type
ORDER BY event_type;

SELECT event_id, count(*) AS effects
FROM notification_effects
GROUP BY event_id
HAVING count(*) > 1;
```

第一和第三查询预期零行；第二应在有界恢复窗口后回到基线。若项目的幂等表名不同，使用真实
consumer 持久表，不编造“queue empty”替代。

## 8. 常见错误与排查路径

### 8.1 明确错误示例

错误做法是让 Compose 同时停止整组服务并删除 volume。它会掩盖恢复问题，也可能误伤同目录
其他项目。本章不提供这类可执行命令；故障恢复必须保留数据库、outbox、queue 和失败证据。

### 8.2 五段诊断记录

**现象**：Redis 恢复后，同一预约产生两条站内通知。
**证据**：reservation=1、outbox=1、同 event ID publish=2、consumer effect=2；保留 attempt 时间线。
**原因**：dispatcher 在 queue 接受后、标记 published 前中断，至少一次重放；consumer 只用
进程内 Set 去重，重启后丢失。
**修复**：在 PostgreSQL notification effects 上增加 event ID 唯一约束，handler 同事务写效果
和幂等记录。
**复验**：再次制造确认丢失并重放；publish 可为 2，effect 保持 1，正常新 event 仍产生效果。

不能把队列清空或删除第二条通知当根因修复。

### 8.3 错误对照表

| 现象 | 证据 | 原因候选 | 修复与复验 |
| --- | --- | --- | --- |
| DB 停后 live 也 503 | health 实现/日志 | liveness 深查依赖 | 拆分 live/ready，再停 DB |
| DB 停后请求挂很久 | pool acquire/statement timeout | 无有界超时 | 配置并验证受控 503 |
| Redis 停导致预约回滚 | transaction/outbox 路径 | service 直接 queue 双写 | 改同事务 outbox |
| worker 恢复后重复 | event/effect 对账 | 幂等仅内存或 key 变化 | 持久唯一 key 后重放 |
| 轮换守卫在 DDL 前失败 | stage evidence/connected target | service、数据库、PG 版本、角色后缀或审计参数错误 | 不分离执行 DDL；修正固定 service 后新建 rotation ID |
| 新凭据通过但旧凭据仍可连 | role/backends | 只改 secret 文件 | NOLOGIN + 终止自有旧 backend |
| 旧 Cookie 仍有效 | sessions/epoch | 只重启 API | 撤销服务端 session 并复验 401 |
| “恢复”后 migration 漂移 | checksum/目标 | 连错库或旧镜像 | 核对 target/digest/checksum |
| 外部通知无法撤回 | provider 对账 | 把 DB restore 当补偿 | 幂等、补偿和人工对账 |

## 9. 课后题

**问题 1：为什么 Redis 停机时预约可以成功？**
参考答案：若产品选择异步通知降级，预约和 outbox 在 PostgreSQL 同事务持久；Redis 只影响随后
发布。产品也可选择拒绝，但必须预先契约化且无部分状态。

**问题 2：为什么旧数据库连接在改密码后可能继续工作？**
参考答案：认证发生在建立连接时，已建立 session 不会因密码变化自动断开；需切换 pool、NOLOGIN
并终止自有旧 backend。

**问题 3：数据库恢复为什么不能撤销旧 Cookie？**
参考答案：Cookie 可能仍在客户端，恢复快照甚至会复活旧 session 行；必须单独撤销 token/epoch。

**问题 4：为什么至少一次投递仍然可用？**
参考答案：producer 无法原子知道远端是否接受；允许重复并用稳定 event ID 和持久唯一约束吸收，
比静默丢失更可恢复。

## 10. 实践练习

### 基础：数据库 live/ready

按预检只 stop/start `market-ops-lab` 的 db。预期故障中 live 200、ready 503、业务受控失败；
恢复后 ready 与数据库不变量通过。完成标准是保留故障中证据。

### 进阶：Redis/worker 双故障

分别停止 Redis 和 worker，创建两类虚构事件，恢复后按 outbox/job/effect 对账。预期可重复发布、
副作用唯一。完成标准是 event ID 不变且 dead-letter 有处理记录。

### 故障注入：轮换中回退

用同一审计参数完成 `prepare` 和 `verify-next`，但在 API 切换时故意给 reader-owned secret 文件
错误权限。预期 API 拒绝启动或 ready 失败，旧身份仍在重叠窗口可回退；修复权限后再切换，确认
next backend 存在才执行 `retire`。不得绕过脚本提前 NOLOGIN。

## 11. 阶段验收

- [ ] 所有 stop/start/terminate/delete 命令都限定 reader-owned local target。
- [ ] 未执行 `down -v`、队列清空、整表清空、WAL/数据库/备份删除。
- [ ] `ops/rotate-credential.sh` 通过 `bash -n`；非法 stage/审计参数在连接前失败。
- [ ] DB 故障中 live/ready 与业务错误符合契约，超时有界。
- [ ] Redis/worker 故障后 outbox/job 追回，consumer 业务副作用唯一。
- [ ] 日志 sink 失败不让业务无限阻塞，恢复只删除本实验文件。
- [ ] `prepare` 的 CREATE ROLE 与 connected target/PG18/角色后缀/审计守卫位于同一 `psql -f`。
- [ ] next 密码仅由 `\password` 交互读取，未进入 argv、SQL 文件或 evidence。
- [ ] 同一 rotation/ticket/operator 完成四阶段 evidence；next 验证、API 切换后 current 才 NOLOGIN。
- [ ] `retire` 的 ALTER ROLE/terminate 与同组守卫位于同一 `psql -f`，只终止 `market_ops_test` 的旧 runtime backend。
- [ ] `verify-retired` 证明旧角色 NOLOGIN、旧 backend 为 0、next 仍可服务。
- [ ] 凭据脚本未混入 API/Redis/worker 故障动作，单变量证据仍隔离。
- [ ] session 撤销后旧 Cookie 401，新登录/退出路径仍通过。
- [ ] 金额、UTC、授权、事务、409 和有效预约唯一性均未被故障处理绕过。
- [ ] 无 Docker/PG18 时对应演练标记未验证，不以静态配置计分。

## 12. 常见问题

**能并行停止 DB 和 Redis 节省时间吗？**
首次演练不要。单变量故障更容易归因；组合故障应在各自恢复路径稳定后另设范围。

**为什么不自动删除旧角色？**
NOLOGIN 可立即阻止新连接并保留审计/owner 关系；DROP 可能因对象 ownership 失败且难恢复。

**重启所有容器不是更快吗？**
可能暂时恢复，却清除连接、内存和时间线，无法定位哪个依赖与恢复机制生效。

**是否每次数据库密码轮换都要撤销所有用户 session？**
不一定。依据泄露范围决定；但 session secret/存储泄露或范围不明时需明确撤销策略和证据。

**恢复后 outbox pending 必须立即为 0 吗？**
不必瞬时为 0，但应在定义窗口回落、失败有归宿、业务副作用对账正确。

## 13. 扩展阅读

官方资料快照：**2026-10-11**。

- [PostgreSQL 18 Database Roles](https://www.postgresql.org/docs/18/user-manag.html)：角色与属性。
- [PostgreSQL 18 Role Membership](https://www.postgresql.org/docs/18/role-membership.html)：NOLOGIN
  权限组。
- [PostgreSQL pg_stat_activity](https://www.postgresql.org/docs/18/monitoring-stats.html)：
  backend 与等待。
- [Docker Compose stop](https://docs.docker.com/reference/cli/docker/compose/stop/)：停止服务但不删除。
- [BullMQ Idempotent Jobs](https://docs.bullmq.io/patterns/idempotent-jobs)：幂等任务模式。
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)：
  session 生命周期与撤销。
- [下一章：毕业项目](../06-graduation-project/01-capstone-scope-business-evidence.md)。

## 我现在能做到什么

我能在严格限定的自有环境中注入数据库、Redis、worker 和日志故障，验证事务/outbox/幂等恢复，
并以可回退步骤轮换数据库凭据、撤销 session，而不删除状态掩盖问题。

## 单元导航

- 上一课：[备份完整性与隔离恢复](03-backup-integrity-isolated-restore.md)
- 章节目录：[05 性能、安全与运维](../README.md#05-性能安全与运维)
- 下一章：[06 毕业项目](../06-graduation-project/01-capstone-scope-business-evidence.md)
- 分卷入口：[全栈联调与交付](../README.md)
