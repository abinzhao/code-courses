# 日志、指标、告警与磁盘：让每个信号都能触发行动

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 为邻里集市建立安全日志、低基数指标、可行动告警、日志轮转、磁盘与证书监控 |
| 练习位置 | 读者自己的 `market/ops/` 与 reader-owned 本地日志实验目录 |
| 运行条件 | Node.js 24；容器轮转、磁盘卷和证书检查只在对应本地工具实际可用时执行 |
| 核心命令 | `node --check ops/telemetry-policy.mjs && node ops/telemetry-policy.mjs` |
| 成功证据 | 日志 allow-list、固定 route labels、版本关联、告警 owner/runbook、轮转、磁盘和证书证据 |
| 失败证据 | secret/body/raw URL 泄露、高基数 series、无最小流量告警、日志无限增长或 sink 失败不可见 |
| 安全边界 | 不写 Cookie、sid、CSRF、密码、连接串、私钥、完整请求正文或真实个人信息 |
| 环境标签 | 本课最小指标为进程内教学模型，不证明 Prometheus、OTel、Pager 或生产日志平台已部署 |

## 1. 任务背景

接口变慢时，如果日志只有 `something failed`，无法判断请求在哪一层失败；如果为了“详细”直接
记录 headers、body、原始 URL、SQL 参数和队列 payload，密码、Cookie、搜索词和个人信息会进入
比业务数据库保留更久、访问面更广的系统。

另一个常见失败是“监控很多，没人行动”。每次 404 都告警会形成噪声；磁盘只剩 1% 时才发现
日志没有轮转，则可能同时影响 PostgreSQL、容器和备份。可观测性不是多打日志，而是：

```text
安全字段 -> 稳定分类 -> 有界存储 -> 可解释阈值
  -> 明确负责人 -> 诊断动作 -> 恢复条件 -> 复盘证据
```

## 2. 学习目标

完成本课后，你能够：

1. 区分日志、指标、trace 和审计记录的责任；
2. 从 allow-list 构造请求完成日志，而不是展开 request/error；
3. 使用 route template、method、status class 等低基数标签；
4. 解释 requestId/traceId 为什么适合关联、不适合指标 label；
5. 把 release commit、image digest 和 config version 连接到故障时间线；
6. 为延迟、5xx、pool、outbox、queue、磁盘与证书建立可行动告警；
7. 给容器日志设置 `max-size`/`max-file`，并监控宿主、卷、镜像与备份目录；
8. 在 reader-owned 目录模拟 sink 写失败，不删除 WAL、数据库文件或保留备份。

## 3. 预备知识

- 完成[有界负载基线与慢查询](01-load-baseline-slow-query.md)；
- 理解[后端结构化日志、指标与 Trace](../../08-backend/09-testing-openapi-observability/03-structured-logs-metrics-traces.md)；
- 已有 `/live`、`/ready`、统一错误 `code/message/requestId` 和 outbox/queue 指标；
- 已为镜像和 release 保存 commit/digest/config version；
- 所有实验路径位于 `/tmp/full-course-verification/batch-f/reader-owned/`。

本课不要求连接真实监控供应商，也不要求把证书私钥复制到证据包。检查证书时只读取公开证书；
日志实验只制造虚构内容。

## 4. 核心理论

### 4.1 四类记录不是互相替代

| 信号 | 回答 | 典型形态 | 不能替代 |
| --- | --- | --- | --- |
| 日志 | 某次事件发生了什么 | JSON event | 趋势、精确审计账本 |
| 指标 | 一段时间有多少、多久 | counter/gauge/histogram | 单次请求正文 |
| Trace | 时间花在哪些 span | trace/span/link | 未采样请求的完整事实 |
| 审计 | 谁在何时改变了什么 | 受控追加业务记录 | debug 日志 |

日志 sink 丢失时，普通请求不能无限阻塞或无限内存排队；关键审计若要求不丢，必须设计独立持久
存储、权限与校验，不能因为日志打印了 userId 就称为审计。

### 4.2 字段 allow-list 优先于 redaction

请求完成日志允许：

```text
timestamp UTC ISO
level
event
requestId / traceId
method
route template
status / statusClass
durationMs
errorCode
releaseVersion / imageDigestPrefix / configVersion
```

默认禁止：

- raw URL/query、Referer、完整 User-Agent；
- Cookie、Authorization、CSRF、session ID、密码；
- request/response body；
- 邮箱、电话、地址、真实搜索词；
- 数据库连接串、SQL 参数、完整 SQL；
- outbox/job payload、私钥、证书私钥路径；
- 未审核的 `error.message` 与 stack。

受限内部错误日志可以记录 error class、SQLSTATE 和经过审查的 stack，但访问、保留和导出仍需
控制。Redaction 是最后防线；正则无法可靠识别任意嵌套对象和编码后的秘密。

### 4.3 时间点与持续时间使用不同的钟

`new Date().toISOString()` 给出 UTC 时间点，适合跨系统对齐；`performance.now()` 是单调时钟，
适合计算持续时间。两个 wall clock 相减可能受 NTP 调整影响。指标单位应固定为 seconds，
日志可以把展示值保存为 `durationMs`，不能混用后再比较阈值。

### 4.4 低基数是指标可持续的前提

正确标签：

```text
method=GET
route=/api/v1/listings/:id
status_class=2xx
release=git-短版本
```

危险标签：

```text
requestId=<每次不同>
listingId=<资源 UUID>
userId=<每位用户>
url=/api/v1/listings/<UUID>?q=<原始搜索>
error=<任意 message>
```

每一种标签值组合都可能成为独立 time series。把 UUID 放进 label 会让内存、存储和查询成本随
业务实体增长。requestId 可以出现在日志和 trace，不进入指标。

### 4.5 Histogram 与应用分位数边界

服务端 histogram bucket 先按 SLO/超时设计，例如 0.05、0.1、0.2、0.3、0.5、1、2、5 秒。
监控后端从 bucket 聚合分位数；不同实例可合并。直接把每个请求延迟作为 label 是错误的。

上一课脚本从有限原始样本计算 nearest-rank；本课内存模型只展示标签收敛，不实现生产 histogram，
也不能宣称跨进程 p95 已部署。

### 4.6 告警必须包含业务语义和最小流量

“p95 > 300 ms”在一分钟只有一个请求时不稳定。告警至少定义：

- 信号与查询；
- 阈值和持续窗口；
- 最小请求量或流量条件；
- 严重级别；
- owner 与替补；
- 第一检查动作；
- 自动/人工恢复条件；
- 关联 release；
- 静默、合并和升级策略。

409 预约冲突与 500 内部错误必须分开。4xx 激增可能是攻击、客户端回归或业务变化，但不应触发
同一 5xx 值班说明。

### 4.7 磁盘不是一个百分比

至少区分：

- 宿主文件系统 inode 与 bytes；
- 容器日志；
- PostgreSQL 数据与 WAL；
- Redis 持久文件；
- 备份目录；
- 镜像、layer 与 build cache；
- 临时文件和浏览器 trace。

磁盘告警要保留安全余量和增长速率。磁盘紧张时先停止本次负载/生成任务，确认最大拥有者，再按
保留策略处理**本次实验文件**。不能删除 `pg_wal`、活动数据库文件、未知 volume 或尚未验证的
唯一备份。

### 4.8 证书到期不是“HTTPS 还通就没事”

证书告警要检查 notAfter、hostname/SAN、证书链、实际边缘正在提供的证书和自动续期结果。建议在
30、14、7 天建立不同严重级别，并在续期后从客户端重新握手验证。只检查磁盘上的新证书，不能
证明 Nginx 已 reload。

## 5. 日志、指标与告警清单

### 5.1 指标契约

| 指标 | 类型 | 允许标签 | 主要动作 |
| --- | --- | --- | --- |
| `http_server_requests_total` | counter | method, route, status_class | 计算错误率与流量 |
| `http_server_request_duration_seconds` | histogram | method, route | 计算 p95/p99 |
| `db_pool_waiting` | gauge | pool | 查连接占用与事务 |
| `db_pool_acquire_timeouts_total` | counter | pool | 查泄露、池大小和依赖 |
| `outbox_pending` | gauge | event_type 受控枚举 | 查 dispatcher/Redis |
| `outbox_oldest_event_age_seconds` | gauge | event_type | 查积压和租约 |
| `queue_jobs` | gauge | queue, state | 查 waiting/active/failed |
| `queue_oldest_job_age_seconds` | gauge | queue | 查 worker 与重试 |
| `reservation_results_total` | counter | result 固定枚举 | 区分 created/conflict/error |
| `disk_available_bytes` | gauge | mount_role | 查日志/数据/备份增长 |
| `tls_certificate_expiry_seconds` | gauge | endpoint_role | 续期和 reload |

### 5.2 起步告警表

| 告警 | 示例条件 | Owner | 第一动作 | 恢复条件 |
| --- | --- | --- | --- | --- |
| API 5xx | 请求量满足且 5xx 比例连续 5 分钟超基线 | API on-call | 按 route/release 查日志与 trace | 受影响 route 回基线并 smoke |
| API p95 | 流量满足且 p95 连续 10 分钟 > 300 ms | API on-call | 查 pool、waits、release | 同负载窗口回阈值内 |
| pool wait | waiting 持续非零并有 acquire timeout | DB/API owner | 查长事务与 release | waiting/timeout 恢复且事务回归通过 |
| outbox age | oldest > 60 s | Reliability owner | 查 db/Redis/dispatcher | age 回落且幂等对账通过 |
| queue failed | failed 增量或 oldest 超业务目标 | Worker owner | 查错误类、attempt、dead letter | 重放成功且副作用唯一 |
| disk bytes/inodes | 低于预留或增长率异常 | Runtime owner | 停止生成任务，按目录归因 | 恢复余量且写入 smoke 通过 |
| certificate | 30/14/7 天分级 | Edge owner | 查续期任务、SAN、reload | 客户端看到新 notAfter |

这些数值是教学起点，不是任意系统的生产默认值。应根据实际流量、RTO 和误报复盘调整。

## 6. 最小可运行案例

### 6.1 创建 allow-list 策略

**完整文件：`ops/telemetry-policy.mjs`**

```js
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PATCH",
  "PUT",
  "DELETE",
]);
const ALLOWED_ROUTES = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/logout",
  "/api/v1/listings",
  "/api/v1/listings/:id",
  "/api/v1/listings/:id/reservations",
  "unmatched",
]);

function method(value) {
  return ALLOWED_METHODS.has(value) ? value : "OTHER";
}

function route(value) {
  return ALLOWED_ROUTES.has(value) ? value : "unmatched";
}

function statusClass(value) {
  if (!Number.isInteger(value) || value < 100 || value > 599) {
    throw new Error("status must be an HTTP status integer");
  }
  return `${Math.floor(value / 100)}xx`;
}

export function completionLog(input) {
  if (!Number.isFinite(input.durationMs) || input.durationMs < 0) {
    throw new Error("durationMs must be a non-negative finite number");
  }
  const output = {
    timestamp: input.timestamp,
    level: input.status >= 500 ? "error" : "info",
    event: "http_request_completed",
    requestId: input.requestId,
    method: method(input.method),
    route: route(input.route),
    status: input.status,
    statusClass: statusClass(input.status),
    durationMs: Number(input.durationMs.toFixed(3)),
    releaseVersion: input.releaseVersion,
    configVersion: input.configVersion,
  };
  if (input.traceId) output.traceId = input.traceId;
  if (input.errorCode) output.errorCode = input.errorCode;
  return output;
}

export function metricLabels(input) {
  return {
    method: method(input.method),
    route: route(input.route),
    statusClass: statusClass(input.status),
  };
}

function assertNoForbiddenData(value) {
  const serialized = JSON.stringify(value);
  for (const forbidden of [
    "demo-password",
    "sid=demo-cookie",
    "csrf-demo",
    "person@example.test",
    "postgresql://",
  ]) {
    if (serialized.includes(forbidden)) {
      throw new Error(`telemetry leaked forbidden marker: ${forbidden}`);
    }
  }
}

if (
  process.argv[1] &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
) {
  const unsafeInput = {
    timestamp: "2026-10-11T08:00:00.000Z",
    requestId: "request-demo-1",
    traceId: "0123456789abcdef0123456789abcdef",
    method: "PATCH",
    route: "/api/v1/listings/:id",
    status: 409,
    durationMs: 18.4567,
    errorCode: "VERSION_CONFLICT",
    releaseVersion: "git-demo123",
    configVersion: "config-7",
    rawUrl: "/api/v1/listings/private-id?q=person@example.test",
    headers: {
      cookie: "sid=demo-cookie",
      "x-csrf-token": "csrf-demo",
    },
    body: { password: "demo-password", priceCents: 1990 },
    databaseUrl: "postgresql://course:secret@127.0.0.1/market",
  };
  const log = completionLog(unsafeInput);
  const labels = metricLabels(unsafeInput);
  assertNoForbiddenData({ log, labels });
  console.log(JSON.stringify({
    label: "IN_MEMORY_TELEMETRY_POLICY_DEMO",
    log,
    labels,
  }, null, 2));
}
```

运行：

```bash
node --check ops/telemetry-policy.mjs
node ops/telemetry-policy.mjs
```

预期 JSON 只含 allow-list 字段；不出现 password、Cookie、CSRF、邮箱、raw URL 或连接串。
`requestId` 留在日志，不出现在 labels。这个输出验证策略函数，不证明 collector、保留期、采样和
告警系统已经运行。

### 6.2 明确错误示例

```js
// 错误：展开未知对象会把 headers、body 和任意未来字段写入日志。
logger.info({
  ...request,
  ...error,
  route: request.originalUrl,
});
```

即使随后运行一个 redaction 正则，也无法保证嵌套、编码、数组和未来字段全部安全。

## 7. 邻里集市集成案例

### 7.1 在请求完成时记录，而不是只在进入时记录

Nest/Express 接线应在响应 `finish`/`close` 处只记录一次，并使用单调时钟：

```ts
const started = performance.now();
response.once("finish", () => {
  logger.info(completionLog({
    timestamp: new Date().toISOString(),
    requestId: context.requestId,
    traceId: context.traceId,
    method: request.method,
    route: routeTemplateFromFramework(request),
    status: response.statusCode,
    durationMs: performance.now() - started,
    errorCode: response.locals.errorCode,
    releaseVersion: config.releaseVersion,
    configVersion: config.configVersion,
  }));
});
```

真实实现要处理 `close` 和 `finish` 竞态，避免双记；客户端中断使用固定 outcome。route 必须来自
框架模板映射，不能直接使用 `originalUrl`。Error Filter 仍只向客户端返回稳定 code/message/
requestId，不返回 stack、SQL 或内部版本。

### 7.2 容器日志有界配置

在 reader-owned `compose.yaml` 对每个长期服务设置：

```yaml
services:
  api:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
  worker:
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
```

这是每个容器约 50 MB 的数量级上限，不是严格瞬时硬配额。Docker daemon 还可能保留 metadata；
宿主其他服务也占空间。修改后只在 `market-ops-lab` 项目验证：

```bash
docker compose --project-name market-ops-lab \
  -f /tmp/full-course-verification/batch-f/reader-owned/market/compose.yaml \
  config --quiet
```

当前没有 Docker 时只做 YAML/人工检查，不能写轮转生效。

### 7.3 监控 reader-owned 文件系统

```bash
LAB_ROOT=/tmp/full-course-verification/batch-f/reader-owned/log-sink-lab
case "$LAB_ROOT" in
  /tmp/full-course-verification/batch-f/reader-owned/*) ;;
  *) printf '%s\n' "refusing non-lab path" >&2; exit 2 ;;
esac
mkdir -p "$LAB_ROOT"
df -Pk "$LAB_ROOT"
df -Pi "$LAB_ROOT"
du -sk "$LAB_ROOT"
```

三条证据分别覆盖 bytes、inode 和本实验目录体积。它们不代表 PostgreSQL volume、Docker
Desktop VM 或其他挂载点，真实部署要分别采集对应 mount。

### 7.4 有界模拟日志 sink 写失败

下面只限制子 shell 单个输出文件，并只删除自己创建的虚构文件：

```bash
set -euo pipefail
LAB_ROOT=/tmp/full-course-verification/batch-f/reader-owned/log-sink-lab
GENERATED="$LAB_ROOT/generated-by-log-sink-lab.bin"
case "$GENERATED" in
  /tmp/full-course-verification/batch-f/reader-owned/log-sink-lab/*) ;;
  *) printf '%s\n' "refusing unsafe generated path" >&2; exit 2 ;;
esac
mkdir -p "$LAB_ROOT"
test ! -L "$LAB_ROOT"
rm -f "$GENERATED"
set +e
(
  ulimit -f 8
  dd if=/dev/zero of="$GENERATED" bs=1024 count=64 status=none
)
write_status=$?
set -e
test "$write_status" -ne 0
test -f "$GENERATED"
rm -f "$GENERATED"
printf '%s\n' "observed bounded sink write failure and removed only $GENERATED"
```

预期 `dd` 非零，应用等价 sink 应增加受控 `log_sink_write_failures_total`，但业务请求不能无限等待。
`ulimit -f` 在不同 Unix 上的单位和信号表现可能不同，必须记录实际结果。该实验模拟文件写上限，
不等于真实 ENOSPC，也不允许通过填满宿主磁盘获得“更真实”证据。

### 7.5 证书到期检查

只检查 reader-owned 本地 `.test` 证书：

```bash
CERT=/tmp/full-course-verification/batch-f/reader-owned/tls/market.example.test.crt
test -f "$CERT"
openssl x509 -in "$CERT" -noout -subject -issuer -dates
openssl x509 -in "$CERT" -noout -checkend $((30 * 24 * 60 * 60))
```

第二条退出 0 表示未来 30 天内不会过期；非零应触发本地演练告警。它没有验证线上端点实际提供
这张证书。完整检查还要对 loopback HTTPS 入口握手、验证 SAN 和受信 CA，不使用 `-k` 作为成功。

### 7.6 关联 release，而不增加无限 label

部署日志记录完整 image digest；常规请求日志可记录受控短 release ID。指标的 release label 只
保留当前和有限历史版本，旧 series 按保留策略退出。配置版本应是非秘密 checksum/编号，不把
环境变量内容写入日志。

事故时间线示例：

```text
08:00Z release=git-demo123 ready
08:07Z p95 alert opened, minimum traffic satisfied
08:08Z pool waiting normal, outbox age normal
08:09Z 5xx concentrated on one route and release
08:12Z rollback to recorded digest
08:14Z route error returned to baseline; business smoke passed
```

这能支持“变化与 release 同时出现”的假设，但最终根因仍需代码/配置证据。

## 8. 常见错误与排查路径

### 8.1 五段诊断记录

**现象**：宿主剩余空间快速下降，API 日志出现 sink write failure。
**证据**：bytes/inodes、按目录 `du`、容器日志配置、增长起点与 release；不打开用户正文。
**原因**：确认 worker 对同一失败 job 无退避地记录完整 stack，容器 `max-file` 配置未应用。
**修复**：限制错误字段与重复频率，增加有界退避，重建 reader-owned worker 使轮转配置生效。
**复验**：故障注入只产生受控日志量，轮转文件数有界，队列恢复且幂等副作用仍为一条。

不能把“删除所有 Docker 数据”作为修复；这会破坏其他项目并掩盖增长来源。

### 8.2 常见错误表

| 现象 | 证据 | 原因 | 修复与复验 |
| --- | --- | --- | --- |
| 指标 series 暴增 | label values/top series | 使用 URL、ID、message | 改 route/enums，确认 series 收敛 |
| 日志出现 Cookie | 安全扫描与样本 | 展开 headers/request | allow-list 构造，回归禁止标记 |
| p95 告警反复开关 | 流量、窗口、bucket | 无最小流量或窗口太短 | 加流量门槛/for，回放历史 |
| 证书文件已更新但仍告警 | 客户端握手 notAfter | 边缘未 reload/路径错误 | 校验配置并 reload，再握手 |
| df 有空间但写失败 | inode、quota、权限 | inode 耗尽或只读挂载 | 分层检查，不只看 bytes |
| queue 清空但通知重复 | 幂等表/业务行 | 至少一次重放未去重 | 修复 consumer 幂等并对账 |
| 日志轮转配置存在但无效 | inspect/实际文件 | 服务未重建或 driver 不同 | 只重建自有服务后复验 |

## 9. 课后题

**问题 1：为什么 requestId 不应作为指标 label？**
参考答案：它几乎每请求唯一，会制造高基数 series；应留在日志/trace 用于单次关联。

**问题 2：日志已经 redaction，为什么仍不能记录整个 body？**
参考答案：规则无法穷尽嵌套、编码和未来字段；allow-list 从源头限制数据面更可靠。

**问题 3：为什么 outbox age 比 pending count 更重要？**
参考答案：低流量时一条事件也可能卡很久；age 直接表达用户等待和 RTO 风险，两者应一起看。

**问题 4：磁盘告警后为什么不能删除 `pg_wal`？**
参考答案：WAL 是数据库一致性与恢复所需数据，手工删除可能损坏集群；应先停止增长源并按受控
数据库/备份策略处理。

## 10. 实践练习

### 基础：日志泄密回归

把密码、Cookie、CSRF、邮箱和连接串标记传入策略函数，断言输出均不包含。预期合法 requestId、
route/status/duration 保留；完成标准是新增字段默认不自动进入日志。

### 进阶：建立告警 runbook

为 5xx、p95、outbox age、disk 和 certificate 各写查询、窗口、最小流量、owner、第一动作和恢复
条件。用一段虚构历史数据走读。完成标准是每条告警都能回答“谁现在做什么”。

### 故障注入：sink 写上限

运行 reader-owned `ulimit` 实验，并让教学 sink 返回受控错误。预期业务路径有界失败或降级、
失败指标增加、没有无限内存排队；恢复后写入 smoke 通过。不得填满真实磁盘。

## 11. 阶段验收

- [ ] allow-list 策略通过 Node 语法与泄密标记检查。
- [ ] 日志时间为 UTC，持续时间用单调时钟。
- [ ] 指标只使用 route template 和有限枚举；requestId/userId/UUID 不作 label。
- [ ] 5xx、409、CSRF/权限拒绝分开解释。
- [ ] 每条告警包含最小流量、持续窗口、owner、动作和恢复条件。
- [ ] 容器日志有 `max-size`/`max-file`，且实际生效证据与配置文本分开。
- [ ] bytes、inode、日志、数据、WAL、备份、镜像目录分别考虑。
- [ ] 证书检查包含 notAfter、SAN/链和实际端点 reload 边界。
- [ ] sink 故障只作用 reader-owned 目录，未删除 WAL、数据库文件或备份。
- [ ] 当前无 Docker/真实监控后端时，对应能力明确未验证。

## 12. 常见问题

**日志能否记录完整 stack？**
受限内部错误日志可记录经审核 stack，但不能发给客户端，也不能附带秘密/参数；访问和保留受控。

**所有 4xx 都不告警吗？**
不是。4xx 与 5xx 分开设语义；401/403/429 激增可能是攻击或客户端回归，但响应动作不同。

**容器日志轮转等于日志备份吗？**
不等于。轮转限制本机占用；集中采集、完整性、访问、保留和灾难恢复是独立设计。

**证书还有 30 天就必须立即轮换吗？**
30 天是早期提醒。实际动作取决于自动续期周期和变更窗口，但必须在失败前留出重试与人工介入。

**监控后端不可用时应用应静默吗？**
不应无限阻塞；要有 exporter timeout、队列上限、丢弃/失败指标和本地健康信号。

## 13. 扩展阅读

官方资料快照：**2026-10-11**。

- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)：
  安全事件与禁止数据。
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)：稳定属性语义。
- [Prometheus Naming](https://prometheus.io/docs/practices/naming/)：指标单位与命名。
- [Prometheus Instrumentation](https://prometheus.io/docs/practices/instrumentation/)：标签与在线系统。
- [Docker json-file driver](https://docs.docker.com/engine/logging/drivers/json-file/)：轮转配置。
- [OpenSSL x509](https://docs.openssl.org/master/man1/openssl-x509/)：证书日期与 `checkend`。
- [下一课：备份完整性与隔离恢复](03-backup-integrity-isolated-restore.md)。

## 我现在能做到什么

我能设计不泄密、低基数、能关联 release 的遥测，并把告警连接到负责人和恢复动作；我也能在
不破坏数据库或宿主的前提下验证日志写失败、轮转、磁盘和证书边界。

## 单元导航

- 上一课：[有界负载基线与慢查询](01-load-baseline-slow-query.md)
- 章节目录：[05 性能、安全与运维](../README.md#05-性能安全与运维)
- 下一课：[备份完整性与隔离恢复](03-backup-integrity-isolated-restore.md)
- 分卷入口：[全栈联调与交付](../README.md)
