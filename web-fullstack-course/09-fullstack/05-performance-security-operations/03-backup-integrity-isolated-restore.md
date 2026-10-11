# PostgreSQL 18 备份完整性与隔离恢复：只有恢复过的备份才有恢复证据

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 为本地 `market_ops_test` 创建 custom dump、catalog 与 SHA-256，并恢复到全新的 `market_restore_test` |
| 练习位置 | `market/ops/backup.sh`、`market/ops/restore-verify.sh`；全部证据只写 reader-owned `/tmp` |
| 运行条件 | PostgreSQL 18 服务端与 `pg_dump/pg_restore` 18 客户端；libpq service/passfile 权限正确 |
| 核心命令 | 先运行固定 service 的 `ops/backup.sh`，再把显式 dump/catalog/SHA-256 三路径传给 `ops/restore-verify.sh` |
| 成功证据 | 本地目标核对、非空 custom dump、catalog、checksum、全新库单事务恢复、权限/不变量/API smoke |
| 失败证据 | 客户端或服务端非 18、目标非 loopback/非 `_test`、catalog 失败、checksum 不符、同名恢复库已存在 |
| 恢复边界 | 不使用 `--clean`，不覆盖已有库，不自动 drop 失败库，不把 API runtime 身份当 restore 身份 |
| 当前环境 | 没有 PostgreSQL 18 时只能运行 `bash -n` 和审查 SQL；不得声称真实恢复、RTO 或 RPO 通过 |

## 1. 任务背景

一个 `.dump` 文件存在，只证明某次命令可能写出了字节。它可能截断、属于错误数据库、依赖缺失
扩展、没有所需角色、没有权限重建对象，或在真正恢复时才发现 checksum 与迁移不一致。

恢复能力需要完整链路：

```text
确认源目标与版本
  -> 受限 backup 身份读取
  -> custom dump 写 partial
  -> catalog 解析
  -> checksum
  -> 原子发布最终文件
  -> 确认新库不存在
  -> 独立 restore 身份建库
  -> --single-transaction 恢复
  -> 重新施加最小权限
  -> 结构/数据/业务不变量
  -> 临时 API smoke
  -> 记录 RTO/RPO
```

checksum 证明当前文件与记录的字节一致，不证明业务可用；`SELECT count(*)` 证明有行，不证明 owner、
金额、预约唯一性、索引、授权和迁移都正确。

## 2. 学习目标

完成本课后，你能够：

1. 区分逻辑备份、物理基础备份、WAL 归档和应用回滚；
2. 用不同身份承担 runtime、migration、backup 和 restore；
3. 通过 libpq service/passfile 避免连接串和密码进入命令历史；
4. 用 partial、custom format、catalog、checksum 和原子 rename 制作备份；
5. 在同一恢复脚本中先固定并复验 dump/catalog/checksum，再证明目标是 loopback PostgreSQL 18 且 `market_restore_test` 不存在；
6. 用 `--single-transaction --exit-on-error --no-owner --no-acl` 恢复；
7. 恢复后重新施加最小权限并检查业务不变量；
8. 用实际时间线计算 RTO，并诚实描述逻辑 dump 的 RPO。

## 3. 预备知识

- 完成[PostgreSQL 连接、TLS、池与超时](../../08-backend/04-postgres-data-access/01-connections-tls-pools-timeouts.md)；
- 完成[约束、外键与不变量](../../08-backend/03-sql-modeling/02-constraints-foreign-keys-invariants.md)；
- 完成[API 综合项目真实 HTTP/数据库验收](../../08-backend/10-api-capstone/04-real-http-database-acceptance-runbook.md)；
- 已有自有 loopback PostgreSQL 18，源库固定为 `market_ops_test`；
- 已有四个分离身份：`market_runtime_local`、`market_migrate_local`、
  `market_backup_local`、`market_restore_admin_local`；
- 已在 reader-owned `~/.pg_service.conf`/passfile 配置服务，文件权限符合 libpq 要求。

服务名是教学约束，脚本还会查询 connected server，不能只相信名字。service 文件和 passfile
可能含秘密，不进入仓库、截图或证据包。

开始前创建 reader-owned 目录：

```bash
mkdir -p /tmp/full-course-verification/batch-f/reader-owned/backups
chmod 700 /tmp/full-course-verification/batch-f/reader-owned/backups
```

不要把 dump 放在数据库同一 volume 后就称为灾难恢复。正式策略还要有加密、访问控制、异地副本、
保留、删除、密钥恢复与周期演练。

## 4. 核心理论

### 4.1 逻辑备份与物理恢复点

`pg_dump` 读取一个一致快照并输出逻辑对象/数据，适合单库迁移和教学恢复。它不包含：

- 集群级角色密码与部分全局对象；
- postgresql.conf、pg_hba.conf；
- dump 完成后的写入；
- 连续时间点恢复能力。

物理基础备份加 WAL 归档可以支持 PITR，但部署、保留、恢复和时间线管理更复杂。不能因为做了
每日逻辑 dump 就声称 RPO 为 0。

### 4.2 custom format 的价值

custom format 支持 `pg_restore --list`、选择对象和一定并行能力；本课恢复使用单事务，优先保证
失败不留下半套表结构。`--no-owner --no-acl` 让恢复不依赖源角色 ACL，但也意味着恢复后必须由
restore 管理员明确重新授权。

### 4.3 身份分离

| 身份 | 需要 | 不应拥有 |
| --- | --- | --- |
| runtime | 业务所需表/列 DML | 建库、改 schema、备份全部对象 |
| migration | 受控 DDL、迁移登记 | 长期注入 API |
| backup | 读取需备份对象/sequence | 写业务、建库、改角色 |
| restore admin | 在隔离实例建目标库/对象/授权 | 注入日常 API |

PostgreSQL 18 的备份权限仍要按 schema、table、sequence、RLS 和扩展核对。超级用户方便不等于
最小权限；若某对象只能由高权限读取，必须审查原因和缩短凭据暴露时间。

### 4.4 partial 与原子发布

脚本先写 `.partial`，解析 catalog 并计算 checksum，再把最终 dump 通过同一文件系统 `mv`
原子发布。失败 trap 只删除本次 partial，不删除历史备份、数据库或其他目录。

catalog 和 checksum 是 sidecar。消费者只选择没有 `.partial` 后缀且 sidecar 均存在的 dump。
跨文件系统 move 可能不再是原子 rename，因此脚本固定同一 `BACKUP_DIR`。

### 4.5 `--single-transaction` 的保证与边界

`pg_restore --single-transaction` 把恢复命令放在一个事务中，任何 SQL 错误会回滚该库内已执行
对象。目标数据库本身由事务外创建，因此失败后空库仍可能存在；本课保留它用于诊断，不自动 drop。

某些不能在事务中执行的对象不适合该模式；发现时应调整备份范围或单独受控处理，不能删掉
`--single-transaction` 后不说明原子性变化。

### 4.6 RTO 与 RPO 必须有时间线

- **RTO observed**：从演练声明故障开始，到 restore API 完成业务 smoke、readiness 通过的时间。
- **RPO observed**：故障前最后确认写入与恢复后实际存在的最新写入之间的差。

逻辑 dump 的一致快照时刻位于 dump 执行期间。教学上应在 dump 前创建一个可识别 sentinel，
恢复后确认它存在；dump 后再创建一个 post-backup sentinel，确认它不在恢复库，并记录这个预期
缺口。精确 PITR 需要基础备份/WAL 和实际演练。

### 4.7 恢复不能撤销外部世界

数据库恢复不会自动：

- 撤销已泄露 Cookie/session；
- 收回旧数据库凭据；
- 撤回已发送邮件/通知；
- 删除对象存储文件；
- 回滚第三方支付。

这些需要 session 撤销、凭据轮换、幂等、补偿与对账。下一课专门演练。

## 5. 命令、文件与不变量清单

| 项目 | 本课固定值 | 证明 |
| --- | --- | --- |
| 源 service | `market_backup_local` | 脚本查询 connected target |
| 源库 | `market_ops_test` | 拒绝其他数据库 |
| 源地址 | Unix local socket、127.0.0.1 或 ::1 | 拒绝远端 |
| 客户端/服务端 | PostgreSQL 18 | 双重版本检查 |
| 备份格式 | custom | `pg_restore --list` |
| 目录 | reader-owned `/tmp/.../backups` | 拒绝其他路径 |
| 目标 service | `market_restore_admin_local` | 只指向自有隔离实例 |
| maintenance DB | `postgres` | 脚本显式连接并查询确认 |
| 目标库 | `market_restore_test` | 必须事先不存在 |
| 恢复输入 | 三个显式绝对路径 | 禁止在恢复 shell 中重新选择 latest |
| 恢复选项 | exit-on-error + single-transaction | SQL 错误整批回滚 |
| owner/ACL | 不从 dump 恢复 | 恢复后显式授权 |
| 金额 | `price_cents` 0..100000000 integer | 零非法行 |
| owner | listings.owner_id -> users.id | 零孤儿 |
| 有效预约 | 每 listing 最多一条 pending/confirmed | 零重复组 |
| 迁移 | order/name/checksum | 与源码 manifest 对账 |
| 索引 | active reservation unique index 等 | `to_regclass` 非空 |

## 6. 最小可运行案例

### 6.1 完整备份脚本

**完整文件：`ops/backup.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
umask 077

: "${PGSERVICE:?set PGSERVICE=market_backup_local}"
: "${BACKUP_DIR:?set a reader-owned backup directory}"

if [[ "$PGSERVICE" != "market_backup_local" ]]; then
  printf '%s\n' "refusing unexpected backup service" >&2
  exit 2
fi

case "$BACKUP_DIR" in
  /tmp/full-course-verification/batch-f/reader-owned/backups) ;;
  *)
    printf '%s\n' "refusing backup directory outside reader-owned lab" >&2
    exit 2
    ;;
esac

pg_dump_version=$(pg_dump --version)
pg_restore_version=$(pg_restore --version)
pg_dump_18_pattern='^pg_dump \(PostgreSQL\) 18([.][0-9]+)?$'
pg_restore_18_pattern='^pg_restore \(PostgreSQL\) 18([.][0-9]+)?$'
if [[ ! "$pg_dump_version" =~ $pg_dump_18_pattern ]]; then
  printf 'expected PostgreSQL 18 pg_dump; observed: %s\n' \
    "$pg_dump_version" >&2
  exit 2
fi
if [[ ! "$pg_restore_version" =~ $pg_restore_18_pattern ]]; then
  printf 'expected PostgreSQL 18 pg_restore; observed: %s\n' \
    "$pg_restore_version" >&2
  exit 2
fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
if [[ -L "$BACKUP_DIR" ]]; then
  printf '%s\n' "refusing symlink backup directory" >&2
  exit 2
fi

physical_dir=$(cd "$BACKUP_DIR" && pwd -P)
case "$physical_dir" in
  /tmp/full-course-verification/batch-f/reader-owned/backups) ;;
  /private/tmp/full-course-verification/batch-f/reader-owned/backups) ;;
  *)
    printf '%s\n' "refusing unexpected physical backup directory" >&2
    exit 2
    ;;
esac

target=$(
  psql "service=$PGSERVICE" -X -A -t -F '|' -v ON_ERROR_STOP=1 \
    -c "SELECT current_database(),
               COALESCE(inet_server_addr()::text, 'local-socket'),
               current_setting('server_version_num'),
               current_user,
               rolsuper,
               rolcreatedb,
               rolcreaterole,
               rolreplication
        FROM pg_roles
        WHERE rolname = current_user"
)
IFS='|' read -r \
  database address version_num connected_role \
  is_super can_create_db can_create_role can_replicate <<<"$target"
if [[ "$database" != "market_ops_test" ]]; then
  printf '%s\n' "refusing source database: $database" >&2
  exit 2
fi
case "$address" in
  local-socket|127.0.0.1|::1) ;;
  *)
    printf '%s\n' "refusing non-loopback PostgreSQL address" >&2
    exit 2
    ;;
esac
if (( version_num < 180000 || version_num >= 190000 )); then
  printf '%s\n' "refusing non-PostgreSQL-18 server" >&2
  exit 2
fi
if [[ "$connected_role" != "market_backup_local" ||
      "$is_super" != "f" ||
      "$can_create_db" != "f" ||
      "$can_create_role" != "f" ||
      "$can_replicate" != "f" ]]; then
  printf '%s\n' "refusing unexpected or privileged backup role" >&2
  exit 2
fi

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
base="market-${timestamp}-$$"
partial="$BACKUP_DIR/$base.dump.partial"
catalog_partial="$BACKUP_DIR/$base.catalog.partial"
checksum_partial="$BACKUP_DIR/$base.sha256.partial"
final="$BACKUP_DIR/$base.dump"
catalog="$final.catalog"
checksum="$final.sha256"

cleanup_partial() {
  rm -f "$partial" "$catalog_partial" "$checksum_partial"
}
trap cleanup_partial EXIT

for path in "$partial" "$catalog_partial" "$checksum_partial" \
  "$final" "$catalog" "$checksum"; do
  if [[ -e "$path" ]]; then
    printf '%s\n' "refusing existing output: $path" >&2
    exit 2
  fi
done

source_observed_before=$(
  psql "service=$PGSERVICE" -X -A -t -v ON_ERROR_STOP=1 \
    -c "SELECT clock_timestamp() AT TIME ZONE 'UTC'"
)

pg_dump \
  --dbname="service=$PGSERVICE" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="$partial"

test -s "$partial"
pg_restore --list "$partial" >"$catalog_partial"
test -s "$catalog_partial"

if command -v sha256sum >/dev/null 2>&1; then
  digest=$(sha256sum "$partial" | awk '{print $1}')
else
  digest=$(shasum -a 256 "$partial" | awk '{print $1}')
fi
printf '%s  %s\n' "$digest" "$(basename "$final")" >"$checksum_partial"

source_observed_after=$(
  psql "service=$PGSERVICE" -X -A -t -v ON_ERROR_STOP=1 \
    -c "SELECT clock_timestamp() AT TIME ZONE 'UTC'"
)

chmod 600 "$partial" "$catalog_partial" "$checksum_partial"
mv "$catalog_partial" "$catalog"
mv "$checksum_partial" "$checksum"
mv "$partial" "$final"
trap - EXIT

printf '%s\n' \
  "backup=$final" \
  "catalog=$catalog" \
  "checksum=$checksum" \
  "source_database=$database" \
  "source_address=$address" \
  "source_role=$connected_role" \
  "server_version_num=$version_num" \
  "source_observed_before_utc=$source_observed_before" \
  "source_observed_after_utc=$source_observed_after"
```

脚本没有接受任意 service，也不把密码/连接串放进参数。Unix local socket 会让
`inet_server_addr()` 为 null，本课规范化为 `local-socket`。

### 6.2 静态检查与安全门

```bash
bash -n ops/backup.sh
PGSERVICE=market_backup_local \
BACKUP_DIR=/tmp/full-course-verification/batch-f/not-reader-owned \
  bash ops/backup.sh
```

第一条预期退出 0；第二条必须在连接数据库前非零拒绝。当前没有 PostgreSQL 18 时，检查到这里
结束并记录 environment block，不能制造 dump 文件冒充备份。

### 6.3 在可用环境运行

```bash
PGSERVICE=market_backup_local \
BACKUP_DIR=/tmp/full-course-verification/batch-f/reader-owned/backups \
  bash ops/backup.sh \
  | tee /tmp/full-course-verification/batch-f/reader-owned/backup-run.txt
```

预期输出一个非空 `.dump`、`.dump.catalog` 和 `.dump.sha256`。服务端/客户端非 18、数据库名
错误、地址非本地或 catalog 失败都应非零退出，且没有最终 `.dump`。

## 7. 邻里集市集成案例

### 7.1 备份前建立 RPO sentinel

通过正常 API 创建一条明确虚构、金额为整数分的商品，记录 ID 和服务端 UTC `createdAt`：

```text
title: OPS-RPO-SENTINEL-BEFORE
description: reader-owned isolated restore evidence
priceCents: 12345
```

必须走认证、CSRF、对象授权和正常事务，不能直接插表绕过业务。把返回 ID 写入脱敏 evidence。
随后执行备份。备份完成后再通过 API 创建：

```text
title: OPS-RPO-SENTINEL-AFTER
priceCents: 23456
```

恢复库预期包含 BEFORE，不包含 AFTER。这个差异是逻辑 dump 的已知恢复点，不是数据丢失 bug。

### 7.2 单次固定输入、恢复、授权与不变量脚本

恢复不能在新的 shell 中再次按时间挑选 dump。下面脚本要求调用者一次显式传入 dump、catalog 和
checksum；三者路径、字节与 catalog 在任何 `CREATE DATABASE` 前固定并复验。此后目标检查、
建库、单事务恢复、授权和不变量断言都在同一次 Bash 运行中完成。

**完整文件：`ops/restore-verify.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
umask 077

RESTORE_SERVICE=market_restore_admin_local
MAINTENANCE_DATABASE=postgres
TARGET_DATABASE=market_restore_test
BACKUP_ROOT=/tmp/full-course-verification/batch-f/reader-owned/backups
EVIDENCE_ROOT=/tmp/full-course-verification/batch-f/reader-owned/restore-evidence

if (( $# != 3 )); then
  printf '%s\n' \
    "usage: restore-verify.sh ABS_DUMP ABS_CATALOG ABS_SHA256" >&2
  exit 2
fi

dump=$1
catalog=$2
checksum=$3

case "$dump" in
  "$BACKUP_ROOT"/market-*.dump) ;;
  *) printf '%s\n' "refusing dump outside reader-owned backups" >&2; exit 2 ;;
esac
if [[ "$catalog" != "$dump.catalog" || "$checksum" != "$dump.sha256" ]]; then
  printf '%s\n' "catalog and checksum must be explicit sidecars of dump" >&2
  exit 2
fi

for path in "$dump" "$catalog" "$checksum"; do
  if [[ ! -f "$path" || ! -s "$path" || -L "$path" ]]; then
    printf 'refusing missing, empty, or symlink input: %s\n' "$path" >&2
    exit 2
  fi
done

physical_backup_root=$(cd "$BACKUP_ROOT" && pwd -P)
case "$physical_backup_root" in
  /tmp/full-course-verification/batch-f/reader-owned/backups) ;;
  /private/tmp/full-course-verification/batch-f/reader-owned/backups) ;;
  *) printf '%s\n' "refusing unexpected physical backup root" >&2; exit 2 ;;
esac

dump="$physical_backup_root/$(basename "$dump")"
catalog="$physical_backup_root/$(basename "$catalog")"
checksum="$physical_backup_root/$(basename "$checksum")"

owner_uid() {
  if stat -f '%u' "$1" >/dev/null 2>&1; then
    stat -f '%u' "$1"
  else
    stat -c '%u' "$1"
  fi
}

current_uid=$(id -u)
for path in "$physical_backup_root" "$dump" "$catalog" "$checksum"; do
  if [[ "$(owner_uid "$path")" != "$current_uid" ]]; then
    printf 'refusing input not owned by current reader: %s\n' "$path" >&2
    exit 2
  fi
done

pg_restore_version=$(pg_restore --version)
psql_version=$(psql --version)
if [[ ! "$pg_restore_version" =~ ^pg_restore\ \(PostgreSQL\)\ 18([.][0-9]+)?([[:space:]].*)?$ ]]; then
  printf 'expected PostgreSQL 18 pg_restore; observed: %s\n' \
    "$pg_restore_version" >&2
  exit 2
fi
if [[ ! "$psql_version" =~ ^psql\ \(PostgreSQL\)\ 18([.][0-9]+)?([[:space:]].*)?$ ]]; then
  printf 'expected PostgreSQL 18 psql; observed: %s\n' "$psql_version" >&2
  exit 2
fi

mkdir -p "$EVIDENCE_ROOT"
if [[ -L "$EVIDENCE_ROOT" ]]; then
  printf '%s\n' "refusing symlink restore evidence root" >&2
  exit 2
fi
chmod 700 "$EVIDENCE_ROOT"
physical_evidence_root=$(cd "$EVIDENCE_ROOT" && pwd -P)
case "$physical_evidence_root" in
  /tmp/full-course-verification/batch-f/reader-owned/restore-evidence) ;;
  /private/tmp/full-course-verification/batch-f/reader-owned/restore-evidence) ;;
  *) printf '%s\n' "refusing unexpected restore evidence root" >&2; exit 2 ;;
esac
if [[ "$(owner_uid "$physical_evidence_root")" != "$current_uid" ]]; then
  printf '%s\n' "restore evidence root is not reader-owned" >&2
  exit 2
fi

run_id="$(date -u +%Y%m%dT%H%M%SZ)-$$"
run_dir="$physical_evidence_root/$run_id"
mkdir "$run_dir"
chmod 700 "$run_dir"
restore_started_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
restore_started_epoch=$(date +%s)
printf '%s|%s\n' "$restore_started_utc" "$restore_started_epoch" \
  >"$run_dir/restore-start.txt"

printf '%s\n' \
  "dump=$dump" \
  "catalog=$catalog" \
  "checksum=$checksum" \
  >"$run_dir/fixed-inputs.txt"

line_count=$(wc -l <"$checksum" | tr -d ' ')
if [[ "$line_count" != "1" ]]; then
  printf '%s\n' "checksum sidecar must contain exactly one line" >&2
  exit 2
fi
IFS=' ' read -r expected_digest expected_name extra <"$checksum"
if [[ ! "$expected_digest" =~ ^[[:xdigit:]]{64}$ ]] ||
   [[ "$expected_name" != "$(basename "$dump")" ]] ||
   [[ -n "${extra:-}" ]]; then
  printf '%s\n' "checksum sidecar content does not bind the explicit dump" >&2
  exit 2
fi
if command -v sha256sum >/dev/null 2>&1; then
  actual_digest=$(sha256sum "$dump" | awk '{print $1}')
else
  actual_digest=$(shasum -a 256 "$dump" | awk '{print $1}')
fi
expected_digest=$(printf '%s' "$expected_digest" | tr '[:upper:]' '[:lower:]')
actual_digest=$(printf '%s' "$actual_digest" | tr '[:upper:]' '[:lower:]')
if [[ "$actual_digest" != "$expected_digest" ]]; then
  printf '%s\n' "checksum mismatch; database has not been created" >&2
  exit 2
fi

observed_catalog="$run_dir/catalog-observed.txt"
pg_restore --list "$dump" >"$observed_catalog"
test -s "$observed_catalog"
if ! cmp -s "$catalog" "$observed_catalog"; then
  printf '%s\n' "catalog mismatch; database has not been created" >&2
  exit 2
fi

target=$(
  psql \
    "service=$RESTORE_SERVICE dbname=$MAINTENANCE_DATABASE" \
    -X -A -t -F '|' -v ON_ERROR_STOP=1 \
    -c "SELECT current_database(),
               COALESCE(inet_server_addr()::text, 'local-socket'),
               current_setting('server_version_num'),
               current_user,
               (
                 SELECT count(*)
                 FROM pg_database
                 WHERE datname = '$TARGET_DATABASE'
               )"
)
IFS='|' read -r database address version_num connected_role existing <<<"$target"
if [[ "$database" != "$MAINTENANCE_DATABASE" ]]; then
  printf '%s\n' "refusing unexpected maintenance database" >&2
  exit 2
fi
case "$address" in
  local-socket|127.0.0.1|::1) ;;
  *) printf '%s\n' "refusing non-loopback restore server" >&2; exit 2 ;;
esac
if (( version_num < 180000 || version_num >= 190000 )); then
  printf '%s\n' "refusing non-PostgreSQL-18 restore server" >&2
  exit 2
fi
if [[ "$connected_role" != "$RESTORE_SERVICE" ]]; then
  printf '%s\n' "restore service resolved to an unexpected role" >&2
  exit 2
fi
if [[ "$existing" != "0" ]]; then
  printf '%s\n' "market_restore_test already exists; refusing overwrite" >&2
  exit 2
fi

printf '%s\n' \
  "service=$RESTORE_SERVICE" \
  "maintenance_database=$database" \
  "server_address=$address" \
  "server_version_num=$version_num" \
  "connected_role=$connected_role" \
  "target_database=$TARGET_DATABASE" \
  "dump_sha256=$actual_digest" \
  >"$run_dir/pre-create-evidence.txt"

psql \
  "service=$RESTORE_SERVICE dbname=$MAINTENANCE_DATABASE" \
  -X -v ON_ERROR_STOP=1 \
  -c 'CREATE DATABASE market_restore_test'

# Failure after CREATE intentionally leaves market_restore_test for diagnosis.
pg_restore \
  --dbname="service=$RESTORE_SERVICE dbname=$TARGET_DATABASE" \
  --exit-on-error \
  --single-transaction \
  --no-owner \
  --no-acl \
  "$dump"

psql \
  "service=$RESTORE_SERVICE dbname=$TARGET_DATABASE" \
  -X -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DO $guard$
DECLARE
  target_address text;
  version_num integer;
BEGIN
  target_address := COALESCE(inet_server_addr()::text, 'local-socket');
  version_num := current_setting('server_version_num')::integer;
  IF current_database() <> 'market_restore_test'
     OR target_address NOT IN ('local-socket', '127.0.0.1', '::1')
     OR version_num < 180000
     OR version_num >= 190000
     OR current_user <> 'market_restore_admin_local' THEN
    RAISE EXCEPTION 'refusing grants on unexpected restore target';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'market_restore_runtime_local'
      AND rolcanlogin
      AND NOT rolsuper
      AND NOT rolcreatedb
      AND NOT rolcreaterole
  ) THEN
    RAISE EXCEPTION 'expected constrained restore runtime role is absent';
  END IF;
END
$guard$;

REVOKE ALL ON DATABASE market_restore_test FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

GRANT CONNECT ON DATABASE market_restore_test
  TO market_restore_runtime_local;
GRANT USAGE ON SCHEMA public
  TO market_restore_runtime_local;
GRANT SELECT, INSERT, UPDATE ON users, listings, reservations, reviews
  TO market_restore_runtime_local;
GRANT SELECT, INSERT, DELETE ON favorites, sessions
  TO market_restore_runtime_local;
GRANT SELECT, INSERT ON outbox_events
  TO market_restore_runtime_local;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO market_restore_runtime_local;

DO $invariants$
DECLARE
  violations bigint;
BEGIN
  SELECT count(*) INTO violations
  FROM listings
  WHERE price_cents < 0 OR price_cents > 100000000;
  IF violations <> 0 THEN
    RAISE EXCEPTION 'invalid price rows: %', violations;
  END IF;

  SELECT count(*) INTO violations
  FROM listings AS listing
  LEFT JOIN users AS owner ON owner.id = listing.owner_id
  WHERE owner.id IS NULL;
  IF violations <> 0 THEN
    RAISE EXCEPTION 'orphan listing owners: %', violations;
  END IF;

  SELECT count(*) INTO violations
  FROM (
    SELECT listing_id
    FROM reservations
    WHERE status IN ('pending', 'confirmed')
    GROUP BY listing_id
    HAVING count(*) > 1
  ) AS duplicates;
  IF violations <> 0 THEN
    RAISE EXCEPTION 'duplicate active reservations: %', violations;
  END IF;

  SELECT count(*) INTO violations
  FROM listings AS listing
  WHERE (
    listing.status = 'available'
    AND EXISTS (
      SELECT 1
      FROM reservations AS reservation
      WHERE reservation.listing_id = listing.id
        AND reservation.status IN ('pending', 'confirmed')
    )
  ) OR (
    listing.status IN ('reserved', 'sold')
    AND NOT EXISTS (
      SELECT 1
      FROM reservations AS reservation
      WHERE reservation.listing_id = listing.id
        AND reservation.status IN ('pending', 'confirmed')
    )
  );
  IF violations <> 0 THEN
    RAISE EXCEPTION 'inconsistent listing status rows: %', violations;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM schema_migrations
    WHERE checksum IS NULL OR checksum = ''
  ) THEN
    RAISE EXCEPTION 'migration checksum is missing';
  END IF;
  IF to_regclass(
    'public.reservations_one_active_per_listing_idx'
  ) IS NULL THEN
    RAISE EXCEPTION 'required active reservation index is absent';
  END IF;
  IF (
    SELECT count(*)
    FROM listings
    WHERE title = 'OPS-RPO-SENTINEL-BEFORE'
      AND price_cents = 12345
  ) <> 1 THEN
    RAISE EXCEPTION 'pre-backup sentinel mismatch';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM listings
    WHERE title = 'OPS-RPO-SENTINEL-AFTER'
  ) THEN
    RAISE EXCEPTION 'post-backup sentinel unexpectedly restored';
  END IF;
  IF NOT has_database_privilege(
    'market_restore_runtime_local',
    'market_restore_test',
    'CONNECT'
  ) OR has_schema_privilege(
    'market_restore_runtime_local',
    'public',
    'CREATE'
  ) THEN
    RAISE EXCEPTION 'restore runtime privilege invariant failed';
  END IF;
END
$invariants$;

COMMIT;
SQL

psql \
  "service=$RESTORE_SERVICE dbname=$TARGET_DATABASE" \
  -X -A -F '|' -v ON_ERROR_STOP=1 \
  -c "SELECT
        (SELECT count(*) FROM users) AS users,
        (SELECT count(*) FROM listings) AS listings,
        (SELECT count(*) FROM reservations) AS reservations,
        (SELECT count(*) FROM outbox_events) AS outbox_events,
        to_regclass(
          'public.reservations_one_active_per_listing_idx'
        ) AS active_reservation_index" \
  >"$run_dir/invariants.tsv"

restore_sql_finished_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
printf '%s\n' \
  "restore_run_id=$run_id" \
  "restore_started_utc=$restore_started_utc" \
  "restore_started_epoch=$restore_started_epoch" \
  "restore_sql_finished_utc=$restore_sql_finished_utc" \
  "evidence_dir=$run_dir"
```

若项目的真实表或权限不同，先按 repository SQL 修改脚本并复审，不能删除断言来迁就失败。
`pg_restore` 或后置 SQL 失败时，脚本不会自动 drop `market_restore_test`；stderr、固定输入和已创建
数据库继续保留供诊断。

### 7.3 静态门禁与显式运行

先提取备份脚本本轮记录的唯一显式路径，不扫描目录、不重新选择 latest：

```bash
set -euo pipefail
bash -n ops/restore-verify.sh

BACKUP_RUN=/tmp/full-course-verification/batch-f/reader-owned/backup-run.txt
test "$(grep -c '^backup=' "$BACKUP_RUN")" = "1"
DUMP=$(sed -n 's/^backup=//p' "$BACKUP_RUN")
CATALOG="${DUMP}.catalog"
SHA256="${DUMP}.sha256"

bash ops/restore-verify.sh "$DUMP" "$CATALOG" "$SHA256" \
  2>&1 \
  | tee /tmp/full-course-verification/batch-f/reader-owned/restore-run.txt
```

三条路径在进程启动时即固定。checksum/catalog 不匹配、service 映射到错误 role、maintenance DB
不是 `postgres`、地址非 loopback、服务端/客户端非 PG18 或目标库已存在时，都必须在建库前退出。
不要在第二个 shell 重新运行 `find | tail`。

故障门禁使用本课目录中的损坏副本，并传入该副本自己的显式三路径。预期 checksum 或 catalog
校验失败，且 `market_restore_test` 仍不存在。不要修改或删除原始备份三件套。

### 7.4 数量、sentinel、manifest 与 API smoke

比较源备份前记录和恢复库的 users/listings/reservations/outbox 数量，但 count 只作辅助。确认：

- `OPS-RPO-SENTINEL-BEFORE` 恰好一条且 `price_cents=12345`；
- `OPS-RPO-SENTINEL-AFTER` 为零条；
- 临时 API 使用 `market_restore_runtime_local`，不是 restore admin；
- `/live` 200、`/ready` 200、公共列表 200；
- 用虚构账号创建整数分商品成功，越权编辑仍 403，旧 version 仍 409；
- API 日志不含 restore service、密码或连接串。

启动配置保存在
`/tmp/full-course-verification/batch-f/reader-owned/restore-api.env`，权限 600，不进入仓库或证据包。
使用项目已经验证的启动命令；若应用只接受 URL，应在该本地文件中配置，不回显。

脚本已经记录数量并断言 sentinel、权限和核心数据不变量；仍要把 `schema_migrations` 的
`migration_order/name/checksum` 与当前源码 manifest 对账。随后完成 API smoke。全部通过后，从
`restore-run.txt` 中记录的唯一 `evidence_dir` 读取开始时间：

```bash
set -euo pipefail
RESTORE_RUN=/tmp/full-course-verification/batch-f/reader-owned/restore-run.txt
test "$(grep -c '^evidence_dir=' "$RESTORE_RUN")" = "1"
RESTORE_EVIDENCE_DIR=$(sed -n 's/^evidence_dir=//p' "$RESTORE_RUN")
case "$RESTORE_EVIDENCE_DIR" in
  /tmp/full-course-verification/batch-f/reader-owned/restore-evidence/*) ;;
  /private/tmp/full-course-verification/batch-f/reader-owned/restore-evidence/*) ;;
  *) exit 2 ;;
esac
IFS='|' read -r restore_started_utc restore_started_epoch \
  < "$RESTORE_EVIDENCE_DIR/restore-start.txt"
[[ "$restore_started_epoch" =~ ^[0-9]+$ ]]
restore_ready_utc=$(date -u +%Y-%m-%dT%H:%M:%SZ)
restore_ready_epoch=$(date +%s)
restore_rto_seconds=$((restore_ready_epoch - restore_started_epoch))
printf '%s\n' \
  "restore_ready_utc=$restore_ready_utc" \
  "observed_rto_seconds=$restore_rto_seconds"
```

RTO 终点不是 `pg_restore` 退出，而是权限、不变量和 API smoke 通过。RPO 用 BEFORE/AFTER sentinel
及最后确认写入时间计算，不写“零丢失”。

## 8. 常见错误与排查路径

### 8.1 明确错误示例

错误做法是对一个已存在、来源未确认的数据库启用 restore clean 行为。它可能删除现有对象，
也没有证明目标属于本次实验。本课不提供这类可执行命令；恢复目标必须是事先不存在的固定新库。

### 8.2 五段诊断记录

**现象**：`pg_restore --single-transaction` 非零退出，提示运行角色不存在。
**证据**：保存 stderr、dump catalog、PG18 客户端/服务端版本和目标库对象计数；不输出密码。
**原因**：dump 中某函数 owner/默认权限仍引用源集群角色，备份范围与 `--no-owner` 假设不完整。
**修复**：在隔离实例用受控角色映射或调整源对象 ownership/备份范围，更新恢复 runbook。
**复验**：删除失败库需要独立所有者确认后重新创建；同一 dump 单事务恢复、权限和业务 smoke 通过。

不要删掉出错对象或取消 `--exit-on-error` 制造“其余大部分恢复成功”。

### 8.3 错误对照表

| 现象 | 证据 | 原因候选 | 修复与复验 |
| --- | --- | --- | --- |
| dump 为 0 字节 | exit/stderr/file size | 连接或权限失败 | 修复 backup 身份后重新生成 |
| catalog 可读但 checksum 错 | 复算摘要 | 传输/存储字节变化 | 隔离损坏文件，不恢复 |
| checksum 对但 restore 失败 | stderr/catalog/version | 依赖对象/扩展/权限 | 补齐受控依赖并全新库复验 |
| 同名库已存在 | `pg_database` | 前次演练或未知资源 | 停止并确认所有权，不覆盖 |
| 恢复后 API 403/500 | grants/log/SQLSTATE | ACL 未重施或身份错误 | 按 repository 最小授权 |
| count 相同但预约重复 | 不变量查询 | 源备份已含业务损坏 | 不宣称恢复成功，先处置数据 |
| RTO 很短但没 API smoke | 时间线 | 过早停止计时 | 以业务 ready 为终点重算 |
| RPO 写 0 但 AFTER 缺失 | sentinel/time | 混淆 dump 与持续归档 | 按实际差值记录并设计 PITR |

## 9. 课后题

**问题 1：checksum 通过为什么还必须恢复？**
参考答案：checksum 只证明字节与记录一致，不证明 catalog、依赖、权限、SQL 和业务不变量可用。

**问题 2：为什么恢复使用新库而不是先 clean 原库？**
参考答案：新库避免覆盖来源、保留故障证据和回退路径；clean 会删除对象并扩大误操作影响。

**问题 3：为什么 `--no-acl` 后必须重新授权？**
参考答案：dump 不携带源 ACL，恢复对象由 restore 身份拥有；runtime 默认不应继承 restore 权限。

**问题 4：逻辑 dump 能否提供任意时间点恢复？**
参考答案：不能。它恢复到一致快照；PITR 需要物理基础备份、WAL 归档、恢复目标和实际演练。

## 10. 实践练习

### 基础：备份三件套

在 loopback `market_ops_test` 运行脚本，保存 dump/catalog/checksum 和目标核对。预期三者非空，
checksum/catalog 可复验；失败时没有最终 dump。完成标准是证据不含 service secret。

### 进阶：权限与业务不变量

把 `backup-run.txt` 中唯一显式 dump 及其 catalog/checksum 一次传给 `restore-verify.sh`。脚本在
建库前复验三件套和 connected maintenance target，再恢复到全新 `market_restore_test`、重施
runtime 权限并断言金额、owner、预约、迁移、索引和 sentinel。预期 runtime 不能 CREATE，随后
API smoke 保持业务状态与整数分/UTC 契约。

### 故障注入：损坏副本

在 reader-owned 目录复制一个 dump 为 `market-corruption-experiment.dump`，为副本显式准备
`.catalog`/`.sha256` 后只改 dump 一个字节。预期 SHA 校验非零，脚本在创建数据库前停止。实验后
只清理该副本三件套，不删除原 dump/catalog/checksum。

## 11. 阶段验收

- [ ] `ops/backup.sh` 通过 `bash -n`。
- [ ] `ops/restore-verify.sh` 通过 `bash -n`，非法/损坏显式输入在任何建库前失败。
- [ ] 脚本拒绝非固定 service、非 reader-owned 目录、非 `_test`、远端地址和非 PG18。
- [ ] backup/migration/runtime/restore 身份分离，命令不回显秘密。
- [ ] dump 先写 partial，catalog/checksum 成功后才发布最终文件。
- [ ] 恢复进程启动时已固定显式 dump/catalog/checksum，没有重新选择 latest。
- [ ] 同一脚本确认 maintenance DB、loopback、PG18 和 `market_restore_test` 不存在；没有 `--clean` 或自动 drop。
- [ ] 恢复使用 `--exit-on-error --single-transaction --no-owner --no-acl`。
- [ ] 恢复后重新施加最小权限，runtime 无 schema CREATE。
- [ ] 金额、owner、有效预约、状态、迁移 checksum、索引和 API smoke 均有实际结果。
- [ ] RTO 从故障开始到业务 smoke 通过；RPO 由 sentinel/时间线计算。
- [ ] 当前没有 PostgreSQL 18 时，真实备份、恢复、RTO/RPO 明确未验证。

## 12. 常见问题

**为什么脚本固定 service 名？**
课程优先降低误操作概率；service 名和 connected target 双重检查。真实平台可用更强资源身份系统。

**能把 dump 提交 Git 吗？**
不能。dump 可能含个人/业务数据和密码散列；应加密、限制访问、设置保留并放独立备份系统。

**恢复失败后为何不自动 drop 空库？**
自动删除扩大脚本破坏性，也会清掉诊断证据；由所有者确认后单独清理更安全。

**恢复时能否使用 API runtime 角色？**
不能。runtime 不应建库/建表；restore admin 也不应注入 API。

**应用回滚能替代数据恢复吗？**
不能。应用回滚切换代码；数据恢复可能丢失备份后的写入，只用于数据灾难并需 RPO 决策。

## 13. 扩展阅读

官方资料快照：**2026-10-11**。

- [PostgreSQL 18 Backup and Restore](https://www.postgresql.org/docs/18/backup.html)：备份策略总览。
- [pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html)：一致逻辑导出与格式。
- [pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html)：catalog、事务与错误选项。
- [libpq Service Files](https://www.postgresql.org/docs/18/libpq-pgservice.html)：service 参数。
- [Password File](https://www.postgresql.org/docs/18/libpq-pgpass.html)：passfile 权限。
- [Continuous Archiving and PITR](https://www.postgresql.org/docs/18/continuous-archiving.html)：
  物理备份与 WAL。
- [下一课：故障演练与凭据轮换](04-failure-drills-credential-rotation.md)。

## 我现在能做到什么

我能为自有 PostgreSQL 18 测试库制作可校验逻辑备份，只恢复到全新隔离库，并以权限、业务不变量、
API smoke、RTO 和 RPO 说明恢复能力及其边界。

## 单元导航

- 上一课：[日志、指标、告警与磁盘](02-logs-metrics-alerts-disk.md)
- 章节目录：[05 性能、安全与运维](../README.md#05-性能安全与运维)
- 下一课：[故障演练与凭据轮换](04-failure-drills-credential-rotation.md)
- 分卷入口：[全栈联调与交付](../README.md)
