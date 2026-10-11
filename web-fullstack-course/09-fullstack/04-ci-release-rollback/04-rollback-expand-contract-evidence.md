# 回滚、expand/contract 与证据保全

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 一份应用 digest 回滚 runbook、四阶段 schema 兼容计划和前后证据表 |
| 建议时间 | 150 分钟 |
| 回滚对象 | API/Web 应用镜像；使用发布前记录的 repository digest |
| 数据库原则 | 不自动运行旧 migration，不 DROP 新列，不用备份 restore 代替应用回滚 |
| 兼容策略 | expand → 过渡读写/回填 → 观察回滚窗 → contract |
| 业务证据 | 回滚后新写入仍存在，整数分/UTC/session/CSRF/owner/version 规则不变 |
| 写操作边界 | 只在明确隔离目标演练；当前教材任务不执行 registry pull 或远端切换 |

## 1. 任务背景

新版本 readiness 通过后，用户编辑商品出现异常。最快恢复路径通常是把 API/Web 切回上一组已知
digest，而不是让数据库“回到过去”。发布后可能已有新商品、收藏、session 和预约；恢复旧备份会
丢失这些写入，反向 migration 也可能删除新列中的数据。

应用回滚能成立的前提，是新 migration 在回滚窗口内同时兼容旧应用和新应用。expand/contract
把破坏性 schema 变化拆开：先只增加能力，再让多版本共存和迁移数据，观察到不再需要旧版本后才
收缩。回滚因此是设计出来的，不是事故现场临时猜命令。

## 2. 学习目标

完成本课后，你能够：

1. 从发布前 evidence 读取旧 API/Web digest，而不是使用移动 tag；
2. 回滚应用时不运行 migration、不自动逆转 schema；
3. 在 expanded schema 上验证旧应用启动、读取和写入；
4. 设计新增列、双写/兼容读、批量回填、切读和延迟 contract；
5. 定义 rollback window 的开始、结束、负责人和证据；
6. 识别 rename/drop/类型收窄、不可逆数据转换的风险；
7. 区分应用 rollback、数据库 point-in-time recovery 和灾难 restore；
8. 保留 before/after digest、迁移 checksum、业务写入与 requestId；
9. 用旧应用读取发布后新写入，证明没有以“恢复”名义丢数据；
10. 记录失败 migration/readiness 的原始证据，不把失败步骤删掉。

## 3. 预备知识

先完成[不可变镜像与受守卫发布自动化](03-immutable-images-release-automation.md)。回滚演练开始前
必须具备：

- 当前/上一版 API 与 Web repository digest；
- source commit、lock checksum、migration checksum、config version；
- 当前数据库迁移表及 checksum；
- migration 向后兼容评审；
- 只含虚构数据的 PostgreSQL 18 隔离目标；
- HTTPS readiness 和 React/Vue 至少一套目标 smoke；
- 明确的回滚决策人和观察窗口。

没有上一版 digest 或旧应用兼容证据时，先停止自动操作并补证据。不能把猜测的 digest、`stable`
tag 或本机同名镜像作为回滚目标。

## 4. 核心理论

### 4.1 应用回滚切换代码，不撤销事实

回滚 API/Web 后，数据库中这些事实仍应存在：

- 发布后创建的 Listing 与整数 `price_cents`；
- 已建立/撤销的 session；
- 收藏目标状态；
- 已赢得的 Reservation；
- version 递增和 UTC 时间；
- outbox/审计等已提交记录。

旧应用如果无法理解新 schema，说明发布前兼容设计不足；删除新数据让旧应用“能跑”不是安全回滚。

### 4.2 四阶段 schema 演进

以把 `listings.description` 演进为 `details` 为例。

**阶段 A：expand**

```sql
ALTER TABLE listings
  ADD COLUMN details text;
```

旧列、旧约束和旧写路径保持可用；新列 nullable。旧应用仍只读写 `description`。

**阶段 B：过渡应用与回填**

新应用：

- 写入时同时写 `description` 与 `details`；
- 读取时 `COALESCE(details, description)`；
- 指标统计缺失 details，但不把 Listing ID 当高基数 label。

后台以主键/游标小批量回填，设置 statement/lock timeout，记录进度；不做一个无限大事务：

```sql
WITH batch AS (
  SELECT id
  FROM listings
  WHERE details IS NULL
  ORDER BY id
  LIMIT 500
  FOR UPDATE SKIP LOCKED
)
UPDATE listings AS l
SET details = l.description
FROM batch
WHERE l.id = batch.id;
```

重复执行直到缺失为 0。每批失败可重试；先在隔离数据量与负载下观察锁和 WAL。

**阶段 C：切读与观察回滚窗**

新版本以 `details` 为权威读，但继续双写旧列。保留至少一个明确发布周期/业务周期，使 previous
旧应用仍能回滚。持续验证旧 digest 在当前 schema 上登录、创建、编辑、预约和退出。

**阶段 D：contract**

只有满足以下证据后才能收紧/删除：

- 回填缺失为 0；
- 所有写者已升级且不再只写旧列；
- previous digest 已超出批准回滚窗；
- 数据/分析/离线任务不再读旧列；
- 备份与恢复演练覆盖新 schema；
- contract migration 有独立审批。

然后可先 `details SET NOT NULL`，再在另一次发布删除 `description`。contract 一旦执行，旧应用通常
不再是合法回滚目标。

### 4.3 rename 常常是隐藏的 drop+add

直接 `RENAME COLUMN description TO details` 会让旧 SQL 立即失败。即使数据库 rename 保留数据，
应用契约仍破坏。跨版本交付更适合 add/copy/dual-write/switch/drop。

### 4.4 类型收窄与语义转换更危险

把 `bigint` 改 `integer`、允许 null 改 not null、文本状态改 enum，都需先证明所有历史值可转换，
并考虑写入并发。金额主线始终是整数分，不借 migration 改为浮点元。时间始终保持 `timestamptz`
和 UTC 语义，不把本地显示字符串写回数据库。

### 4.5 rollback window 是产品/运维承诺

窗口不是“过几天大概可以删”。记录：

- 从哪个 expand migration 开始；
- 哪些 old digest 保持兼容；
- 最晚何时 contract；
- 谁检查旧版本 smoke；
- 哪些指标/错误会延长窗口；
- 是否已有不可逆写入。

### 4.6 restore 属于数据恢复

备份 restore 或 PITR 处理数据库损坏、误删等数据事件，可能有 RPO 数据损失和更长 RTO。应用
发布错误优先切回兼容 old digest。只有确认数据层事件并走恢复 runbook，才考虑 restore 到新目标
并验证，不覆盖现有数据库。

## 5. 元素、属性、API 或配置清单

| 术语/配置 | 作用 | 可判定证据 | 边界 |
| --- | --- | --- | --- |
| previous digest | 精确旧应用字节 | 发布前 evidence | 不能用 tag |
| current digest | 当前运行字节 | inspect/evidence | 不证明健康 |
| expand migration | 只增加兼容能力 | 旧/新应用都能运行 | 仍需锁评估 |
| dual write | 维护新旧字段 | 同事务两列一致 | 多写者都需覆盖 |
| compatible read | 新值优先、旧值 fallback | 历史行可读 | 不可永久保留歧义 |
| backfill | 迁移历史数据 | 缺失计数归零 | 要有批次/超时 |
| rollback window | 保留旧应用兼容期 | 起止/owner/测试 | 不是无限期 |
| contract migration | 删除旧契约 | 独立审批和证据 | 执行后旧版不可回滚 |
| readiness | 基础依赖可服务 | 外部 HTTPS 200 | 不证明业务 smoke |
| restore | 数据灾难恢复 | 新库、RTO/RPO | 非日常 app rollback |

## 6. 最小可运行案例

### 6.1 先验证 evidence

在隔离目标发布记录中读取上一版两个 digest。为命令设置的值必须是实际 evidence 值：

```bash
export API_IMAGE="$RECORDED_PREVIOUS_API_DIGEST"
export WEB_IMAGE="$RECORDED_PREVIOUS_WEB_DIGEST"
export SITE_URL="$AUTHORIZED_ISOLATED_HTTPS_ORIGIN"
```

这里的环境变量说明数据来源，不是可直接执行的占位发布。执行前使用与 release 脚本相同的 64 hex
digest guard 和 HTTPS origin guard；若变量为空或仍是说明文字，立即停止。

### 6.2 应用回滚命令

确认 expanded schema 对旧版本兼容后：

```bash
#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

die() {
  printf 'rollback: %s\n' "$*" >&2
  exit 2
}

require_env() {
  local variable_name="$1"
  [[ -n "${!variable_name:-}" ]] || die "$variable_name is required"
}

for variable_name in API_IMAGE WEB_IMAGE SITE_URL; do
  require_env "$variable_name"
done

digest_pattern='^([a-z0-9.-]+(:[0-9]+)?/)?[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)*@sha256:[a-f0-9]{64}$'
[[ "$API_IMAGE" =~ $digest_pattern ]] \
  || die "API_IMAGE must be an immutable repository digest"
[[ "$WEB_IMAGE" =~ $digest_pattern ]] \
  || die "WEB_IMAGE must be an immutable repository digest"
[[ "$SITE_URL" =~ ^https://[A-Za-z0-9.-]+(:[0-9]+)?$ ]] \
  || die "SITE_URL must be an HTTPS origin without path or credentials"

EVIDENCE_DIR="${EVIDENCE_DIR:-./evidence/rollbacks}"
[[ "$EVIDENCE_DIR" == "./evidence/rollbacks" ]] \
  || die "EVIDENCE_DIR must remain ./evidence/rollbacks"

for command_name in docker curl date mkdir mv seq sleep; do
  command -v "$command_name" >/dev/null \
    || die "required command not found: $command_name"
done

compose=(
  docker compose
  -f compose.yaml
  -f compose.https.yaml
  -f compose.release.yaml
)

rollback_started_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
rollback_id="$(date -u +'%Y%m%dT%H%M%SZ')-$$"
mkdir -p "$EVIDENCE_DIR"
target_file="$EVIDENCE_DIR/$rollback_id-target.json"
temporary_file="$target_file.tmp"

printf '%s\n' \
  '{' \
  '  "schemaVersion": 1,' \
  "  \"rollbackStartedAt\": \"$rollback_started_at\"," \
  "  \"previousApiImage\": \"$API_IMAGE\"," \
  "  \"previousWebImage\": \"$WEB_IMAGE\"," \
  "  \"siteOrigin\": \"$SITE_URL\"," \
  '  "status": "target-recorded"' \
  '}' \
  >"$temporary_file"
mv "$temporary_file" "$target_file"
printf 'rollback target recorded; evidence=%s\n' "$target_file"

"${compose[@]}" version >/dev/null
"${compose[@]}" config --quiet
"${compose[@]}" pull api web
"${compose[@]}" up -d --no-build --no-deps api web

verify_running_image() {
  local service="$1"
  local expected_reference="$2"
  local expected_image_id
  local actual_image_id
  local configured_reference
  local -a container_ids=()

  expected_image_id="$(
    docker image inspect --format '{{.Id}}' "$expected_reference"
  )"
  container_ids=($("${compose[@]}" ps -q "$service"))
  [[ "${#container_ids[@]}" -eq 1 ]] \
    || die "expected exactly one running $service container"

  actual_image_id="$(
    docker inspect --format '{{.Image}}' "${container_ids[0]}"
  )"
  configured_reference="$(
    docker inspect --format '{{.Config.Image}}' "${container_ids[0]}"
  )"

  [[ "$configured_reference" == "$expected_reference" ]] \
    || die "$service container reference does not match previous digest"
  [[ "$actual_image_id" == "$expected_image_id" ]] \
    || die "$service container image ID does not match previous digest"

  printf '%s\n' "$actual_image_id"
}

api_image_id="$(verify_running_image api "$API_IMAGE")"
web_image_id="$(verify_running_image web "$WEB_IMAGE")"

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
[[ "$ready" -eq 1 ]] || die "rollback readiness failed"

rolled_back_at="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
result_file="$EVIDENCE_DIR/$rollback_id-after.json"
temporary_file="$result_file.tmp"
printf '%s\n' \
  '{' \
  '  "schemaVersion": 1,' \
  "  \"rolledBackAt\": \"$rolled_back_at\"," \
  "  \"apiImage\": \"$API_IMAGE\"," \
  "  \"apiImageId\": \"$api_image_id\"," \
  "  \"webImage\": \"$WEB_IMAGE\"," \
  "  \"webImageId\": \"$web_image_id\"," \
  "  \"readyUrl\": \"$ready_url\"," \
  '  "readiness": "passed"' \
  '}' \
  >"$temporary_file"
mv "$temporary_file" "$result_file"
printf 'rollback ready; evidence=%s\n' "$result_file"
```

刻意没有 `run migrate`，也没有 down、DROP、restore 或 `-v`。`--no-deps` 防止无关重建数据库；
目标依赖必须本来就在运行。命令只适用于已经获得目标权限并确认变量的隔离演练，当前教材任务不
执行。`set -Eeuo pipefail` 保证 `pull` 或 `up` 非零时立即退出；此时 target evidence 已保留，
不会继续执行 inspect、Nginx reload 或 readiness。

**[隔离运行预期]** API/Web 各恰有一个运行容器，容器配置引用等于记录的 previous repository
digest，运行容器 image ID 等于该 digest 拉取后解析出的本地 image ID；这些断言在外部 HTTPS
readiness 前完成，因此旧实例的 200 不能冒充切换成功。readiness 在 30 次内恢复 200，数据库
migration history 不变。失败证据是 pull/up/digest/Nginx/readiness 的原始非零退出与关联日志；
不能把超时改成成功或运行旧 migration。

### 6.3 最小兼容证明

在新 schema 上启动 previous API，用虚构数据：

1. 查询发布前 Listing；
2. 查询新版本发布后创建的 Listing；
3. previous API 创建 `priceCents=19900` 的新 Listing；
4. 确认新列 nullable/兼容 read 不阻断旧写；
5. 新 API 再启动后能读旧 API 刚写的行，并通过 fallback/backfill；
6. 所有 `createdAt` 仍为 UTC ISO 8601。

只有双向读写都成立，才有实证的 rollback window。

## 7. 邻里集市集成案例

### 7.1 发布与回滚时间线

| UTC 时间 | 动作 | API digest | migration | 业务证据 |
| --- | --- | --- | --- | --- |
| T0 | 记录 previous | old digest | schema N | 基线 smoke |
| T1 | expand | old digest | schema N+1 nullable | old smoke 仍通过 |
| T2 | 发布新应用 | new digest | 无新 contract | 新/旧列双写 |
| T3 | 创建虚构商品 | new digest | N+1 | ID、19900 分、UTC |
| T4 | 发现阻断并回滚 | old digest | 仍为 N+1 | T3 商品仍可读 |
| T5 | 修复后再发布 | fixed digest | N+1 | 两套 smoke |
| T6 | 窗口结束后 contract | no-old-compatible | schema N+2 | 独立审批 |

时间必须来自真实 `date -u`/平台记录，表中 T0-T6 只是顺序符号，不是伪造运行时间。

### 7.2 安全和业务契约在回滚中不降级

回滚不是临时关安全：

- 同源 Secure HttpOnly Cookie 保持；
- unsafe 请求仍校验精确 Origin 和 session CSRF；
- 用户乙编辑用户甲商品仍 403；
- owner stale version 仍 409；
- 预约数据库约束仍只允许一个有效预约；
- Nginx TLS/CSP/日志策略仍由当前 Web 配置提供；
- 不把旧应用缺少新 UI 当作删除新数据理由。

如果 old digest 使用已经撤销的安全策略，它就不再是合法回滚候选，应发布修复版而不是恢复漏洞。

### 7.3 前后证据包

只保存脱敏数据：

```text
rollback-evidence/
  decision.md
  before-release.json
  after-release.json
  <rollback-id>-target.json
  <rollback-id>-after.json
  after-rollback.json
  migration-checksums.txt
  invariant-results.txt
```

target JSON 必须在 `pull/up` 前含 UTC 时间和目标 previous API/Web digest；after JSON 再记录
运行容器匹配的 image ID 与 readiness。汇总 JSON 还含 source commit、config version、schema
migration IDs、虚构 Listing ID 与 requestId。不得含 Cookie、CSRF、Authorization、密码、连接串、
私钥、真实用户正文或数据库 dump。

`invariant-results.txt` 至少记录：

- 发布后商品在 rollback 后仍存在；
- `price_cents=19900`；
- UTC timestamp；
- owner/409/预约唯一性；
- migration checksum 未被旧文件覆盖；
- PostgreSQL 18 server version。

### 7.4 failed migration gate

在隔离库注入一条会失败的新 migration，证明 release 在应用切换前停止。保留：

- migration ID/checksum；
- 原始 SQLSTATE/错误分类（不含参数/连接串）；
- 新 API/Web 容器没有切换的证据；
- 修复 migration 后的新 checksum 和完整重跑。

不要删除失败记录或手工改 migration table 让流水线“继续”。

## 8. 常见错误与排查路径

### 明确错误：回滚时自动执行旧 down migration

错误策略：

```text
切旧镜像 -> 执行旧版本 down migration -> DROP details -> 启动旧应用
```

| 五段 | 记录 |
| --- | --- |
| 现象 | 旧应用恢复，但新版本期间写入 `details` 的信息永久丢失，新版本无法再启动 |
| 证据 | migration history 倒退/被改写，列不存在，发布后数据无法查询 |
| 原因 | 把应用版本切换误当 schema 时间倒流，down migration 破坏向前事实 |
| 修复 | 恢复到已验证 expanded schema；应用只切 previous digest，保留新列和 migration history |
| 复验 | previous 应用在 expanded schema 读写；新写入仍存在；fixed 新版可再次启动 |

若列已被删除且数据丢失，这已是数据恢复事件，应停止尝试、评估备份/PITR 和 RPO，不假装普通回滚
已修复。

### old API 插入因 NOT NULL 新列失败

说明 contract 太早执行。若数据未损坏，部署兼容新版本并延长窗口；不要给 old API 超级权限或手工
伪造默认。事前应在 old digest smoke 中覆盖创建/编辑。

### 回滚后 readiness 200 但业务 500

ready 可能没覆盖变更表。执行登录、列表、创建、编辑、预约等 smoke，用 requestId 查 SQLSTATE。
修复 health coverage，但不把 readiness 扩成有副作用的完整测试。

### readiness 200 但运行容器不是 previous digest

立即判定回滚失败，不进入业务 smoke。检查 release override 是否实际消费 `API_IMAGE`/`WEB_IMAGE`、
服务名和 Compose project 是否正确，以及 `up` 是否重建了目标容器。必须先让容器配置引用和实际
image ID 同时匹配目标 digest，再重新请求 readiness；不能把仍在响应的旧实例当作成功。

### 双写两列不一致

应在同一数据库事务写两列，并监控不一致计数。异步双写可能部分成功；若使用 outbox，仍要定义
权威列和恢复策略。

### backfill 锁住业务

减小批次、设置 timeout、按主键推进并观察锁/WAL/replica lag。不要一次无条件 UPDATE 全表或在
生产首次运行未测脚本。

### 把 restore 当快速回滚

restore 会把数据库恢复到旧时间点，丢失后续写入。仅数据灾难 runbook 使用，恢复到新目标验证后
再决策切换，不覆盖当前库。

## 9. 课后题

**问题 1：为什么 expand 阶段新列先 nullable？**

参考答案：旧应用不会提供该值；nullable 让旧写继续，回填和所有写者升级后才能收紧。

**问题 2：为什么双写要维持到 rollback window 结束？**

参考答案：previous 旧应用仍读旧列；若过早停止旧列更新，回滚后会读到陈旧数据。

**问题 3：应用回滚为什么不运行 migration？**

参考答案：当前 schema 是向前历史且应兼容 old app；运行旧 migration 可能重放、冲突或破坏新数据。

**问题 4：备份 restore 与 app rollback 最大区别是什么？**

参考答案：app rollback 切代码并保留数据事实；restore 改变数据时间点，受 RPO/RTO 和数据损失约束。

**问题 5：何时可以 contract？**

参考答案：回填完成、所有写者升级、旧版窗口结束、下游不再依赖、恢复已验证并经独立审批后。

## 10. 实践练习

### 基础：证据表

为个人隔离目标填写 before/release/rollback 三份无秘密记录。完成标准：digest、commit、schema、
config、UTC、readiness 与虚构业务 ID 可关联；没有移动 tag。

### 进阶：description 到 details

在 PG18 测试库执行 add nullable、双写/兼容读、500 行批量回填和缺失计数。用 previous/fixed API
双向 smoke。完成标准：old/new 都能读写，整数分/UTC 不变，回填可重放。

### 故障注入：过早 NOT NULL

只在可丢弃测试库把 details 设 NOT NULL，再用 old API 创建 Listing，稳定复现失败；恢复 expanded
迁移链后重试。完成标准：五段记录指出兼容窗被破坏，不通过删除 old test 或放宽断言制造通过。

## 11. 阶段验收

- [ ] previous/current API/Web 均为真实 repository digest。
- [ ] 回滚脚本以 `set -Eeuo pipefail` 运行，并在 Docker 操作前拒绝 mutable digest 与非 HTTPS origin。
- [ ] `pull/up` 前已落盘记录目标 previous digests，失败后不会继续执行 readiness。
- [ ] 回滚命令不含 migrate、DROP、restore、`down -v` 或 target build。
- [ ] readiness 前已用 inspect 证明运行容器引用和 image ID 都与目标 digest 一致。
- [ ] old digest 在 expanded schema 上启动、读取和写入。
- [ ] 新版本期间的虚构写入在 rollback 后仍存在。
- [ ] 金额整数分、UTC、Cookie/Origin/CSRF、对象授权、version/预约约束未降级。
- [ ] expand、dual-write/read、backfill、观察窗、contract 有明确先后与 owner。
- [ ] backfill 有批次、timeout、进度和重试证据。
- [ ] contract 只有在旧版不再是合法候选后执行。
- [ ] failed migration 保留原始非零证据，修复后完整重跑。
- [ ] readiness 和业务 smoke 分开记录。
- [ ] evidence 无 secret、真实个人数据或 dump。
- [ ] app rollback 与 backup/PITR/restore 的 RPO/RTO 边界清楚。

## 12. 常见问题

**所有 migration 都必须完全可逆吗？**

不必强求机械 down。更重要的是向前兼容、可重放、备份/恢复和明确不可逆审查；伪造可逆脚本可能
更危险。

**可以永远保留旧列吗？**

短期兼容需要，永久保留会增加歧义和双写成本。证据满足后独立 contract，并接受旧版不再可回滚。

**rollback window 应多长？**

由发布频率、业务周期、离线写者、观察信号和恢复能力决定。必须在发布前声明，不能事故后临时缩短。

**Web 可以单独回滚、API 不回滚吗？**

可以，但必须验证前端/API 契约兼容、静态资源保留和 session 行为。记录两者各自 digest，不把它们
视为一个版本字符串。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html)：锁、约束与列演进。
- [PostgreSQL explicit locking](https://www.postgresql.org/docs/18/explicit-locking.html)：评估
  migration/backfill 影响。
- [PostgreSQL constraints](https://www.postgresql.org/docs/18/ddl-constraints.html)：分阶段验证约束。
- [Docker pull by digest](https://docs.docker.com/reference/cli/docker/image/pull/)：旧镜像不可变引用。
- [GitHub deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)：
  授权与审批边界。
- [PostgreSQL backup and restore](https://www.postgresql.org/docs/18/backup.html)：区分逻辑备份与日常
  应用 rollback。

## 我现在能做到什么

我能用记录的不可变 digest 回滚 API/Web 而不破坏向前 schema，通过 expand/contract 让 old/new
应用在明确窗口共存，并证明发布后写入没有丢失。我也能识别何时问题已经升级为数据恢复事件，而
不是继续用应用回滚掩盖。

## 单元导航

- 章入口：[04 CI、发布与回滚](../04-ci-release-rollback.md)
- 上一课：[不可变镜像与受守卫发布自动化](03-immutable-images-release-automation.md)
- 下一章：[05 性能、安全与运维](../05-performance-security-operations.md)
