# 结构化日志、指标与 Trace：关联故障而不泄露用户数据

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个零依赖 allow-list 日志与内存指标实验、一份 Nest/OTel 诊断与脱敏清单 |
| 练习位置 | 读者自己的 `market-backend-lab/telemetry/` |
| 运行条件 | 最小案例仅需 Node.js 24；真实 trace/metrics 后端需项目锁定工具和授权环境 |
| 核心命令 | `node --test telemetry/telemetry.test.mjs` |
| 成功证据 | 同一请求日志字段可关联；指标只使用 route/status class 低基数标签；禁止字段不出现 |
| 失败证据 | 展开 headers/body、使用原始 URL 或以 requestId 作 label 时测试/审查失败 |
| 环境标签 | 指标实现是 **IN-MEMORY 教学模型**；不证明 Prometheus/OTel/告警已部署 |

## 1. 任务背景

用户报告“预约一直转圈”。只有一行 `something failed` 无法判断请求有没有到 API、在数据库池等待、
因 409 冲突失败，还是 outbox 积压。于是团队把整个 `req.headers`、body、SQL 和队列 payload
都打印出来，结果 Cookie、CSRF token、密码和搜索词进入长期日志。

可观测性要同时满足两个目标：

1. 用足够稳定的上下文回答“哪类请求、在哪一段、以什么状态失败”；
2. 不把秘密、个人信息、高基数标识和完整业务载荷扩散到日志、指标、trace 与第三方后端。

正确做法从字段 allow-list 开始，而不是先记录一切、再期待一个正则能可靠擦除。

## 2. 学习目标

完成本课后，你能够：

1. 区分日志、指标和 trace 各自回答的问题；
2. 用 requestId 和 traceId 关联一次请求，但不把它们作为指标标签；
3. 使用 route template 而不是原始 URL/ID 建立低基数维度；
4. 只记录 allow-list 字段、错误分类和 SQLSTATE，不记录 secrets/参数；
5. 设计请求数、延迟、冲突、池等待、outbox/queue age 等指标；
6. 为 HTTP、PostgreSQL、Redis/BullMQ 建立脱敏 span 属性；
7. 区分 liveness、readiness、业务错误和内部故障；
8. 用“现象、证据、原因、修复、复验”闭环定位故障。

## 3. 预备知识

- 完成[单元、HTTP 与真实 PostgreSQL 测试](01-unit-http-real-postgres-tests.md)；
- 完成[OpenAPI 生成与契约验证](02-openapi-generation-contract-validation.md)；
- 理解统一 Error 的 `requestId`；
- 理解 outbox oldest age、BullMQ failed/oldest job 和数据库 pool waiting。

创建个人练习目录：

```bash
mkdir -p telemetry
node --version
```

本课不用真实用户数据。示例邮箱、Token、Cookie 都是明显占位，并且测试要求它们不出现在遥测
输出。

## 4. 核心理论

### 4.1 三类信号回答不同问题

| 信号 | 典型问题 | 数据形态 | 主要风险 |
| --- | --- | --- | --- |
| 日志 | 某次请求发生了什么 | 离散事件、可搜索字段 | 泄密、成本、格式漂移 |
| 指标 | 一段时间多少、多久、趋势如何 | counter/gauge/histogram | 高基数、错误聚合 |
| Trace | 跨边界时间花在哪一段 | trace/span/attributes/events | 采样缺口、属性泄密 |

日志不适合计算所有 p99；指标不适合保存每次错误细节；trace 被采样后也不能替代审计。三者用
相同 route/error taxonomy 和受控关联 ID 连接。

### 4.2 Request ID 与 Trace ID 不是同一个承诺

`requestId` 是应用/边缘分配给单次请求的支持标识，返回 `X-Request-ID` 并进入统一错误正文。
`traceId` 属于 W3C Trace Context/OpenTelemetry，可跨服务包含多个 span。

- 未经信任的外部 `X-Request-ID` 不能原样接受任意长度/控制字符；可在可信边缘生成，应用只接受
  受信代理头，否则自行生成 UUID；
- `traceparent` 由符合规范的库解析和传播，不手写字符串切片；
- 两者可以同时写日志；
- 两者都具有高基数，不能用作 Prometheus label；
- 不把用户 ID、邮箱或 Cookie 塞进 baggage。

### 4.3 日志字段采用 allow-list

请求完成日志可包含：

```text
timestamp UTC ISO
level
event=http_request_completed
requestId
traceId（存在时）
method
route=/api/v1/listings/:id
status
durationMs
errorCode（失败时）
```

默认不包含：

- 原始 URL/query（q 可能有个人信息）；
- headers、Cookie、Authorization、CSRF；
- body、密码、session ID；
- 数据库 URL、SQL 参数、完整 SQL；
- outbox/job payload；
- 原始 error.message/stack 进入客户端或低权限日志。

受保护内部错误日志可保留经过审核的 stack 和 SQLSTATE，但仍不记录参数/连接串，并设置访问和
保留策略。Redaction 是最后防线，不是展开任意对象的许可。

### 4.4 使用单调时钟计算耗时

日志时间戳用 `new Date().toISOString()` 表达 UTC wall clock；持续时间用
`performance.now()` 等单调时钟计算，避免系统时间调整造成负延迟。不要用两个 `Date.now()`
差值建立高精度延迟证据。

### 4.5 指标标签必须低基数

推荐 HTTP 指标：

```text
http_server_requests_total{method,route,status_class}
http_server_request_duration_seconds{method,route}
```

`route` 使用 `/api/v1/listings/:id`，不能用 `/listings/<uuid>`。`status_class` 使用 `2xx/4xx/5xx`
或有限 status；requestId、userId、listingId、q、error message 都不做 label。

业务/依赖指标：

- reservation result counter：`created/conflict/self_forbidden/internal_error`；
- PostgreSQL pool：total/idle/waiting、acquire timeout；
- outbox pending count 和 oldest event age seconds；
- BullMQ waiting/active/failed、oldest job age；
- cache hit/miss/error；
- CSRF/登录拒绝计数（不要标签化邮箱/IP 原文）。

409 是预期业务冲突，不应和 500 一起算“服务内部错误率”。4xx 激增仍可能是攻击或客户端回归，
但告警含义不同。

### 4.6 Histogram 需要先定义 bucket 和单位

请求延迟使用 seconds；数据库 acquire 也使用 seconds。Bucket 应覆盖目标 SLO 和超时，不从
默认值照抄。p95/p99 由监控后端根据 histogram 计算；本课内存 Map 只计算 count/sum，不能声称
得到准确分位数。

### 4.7 Trace 属性也必须脱敏

HTTP span：

- method、route template、status、server address；
- 不放 raw URL/query/body/header。

数据库 span：

- system=`postgresql`、operation=`SELECT/UPDATE`、受控表/模块名、SQLSTATE；
- 不放连接串、参数值；完整 statement 是否记录要按 SDK 配置与安全评估，课程默认关闭。

队列 span：

- queue name、job name、attempt、outcome；
- event ID 可在受限日志用于对账，但不做指标 label；payload 不进 span；
- 长时间异步任务更适合 span link 连接 producer context，而不是让一个 parent span 跨数小时。

### 4.8 Sampling 不应改变安全规则

采样减少成本，不是脱敏。未采样 trace 仍可能有日志/指标；被采样 trace 也不能包含秘密。可考虑
保留错误/慢请求的 tail sampling，但它依赖 collector 能力和容量。采样率、保留期和访问权限都
需要生产环境验证。

### 4.9 Liveness 与 Readiness 分工

- `/live`：进程事件循环能回应，不检查昂贵依赖；
- `/ready`：短超时检查当前是否可接流量，例如 pool 可取得连接并 `SELECT 1`；
- 数据库暂时不可用时 ready 503，live 仍 200，避免无意义重启风暴；
- readiness 不执行全表 count、迁移或写操作。

当前 API 若依赖错误统一返回 500，就按 OpenAPI 和日志分类；若引入 503
`DEPENDENCY_UNAVAILABLE`，属于协议变化，要同步规范和测试。

### 4.10 遥测本身也会失败

日志 sink、metrics exporter、trace collector 可能变慢或不可用。应用不能无限阻塞业务请求或
无限内存排队。SDK/exporter 应有批量、队列上限、超时和丢弃指标；关键审计若要求不丢，需要
独立持久设计，不能假设普通 debug 日志等价审计账本。

## 5. 元素、属性、API 或配置清单

| API / 字段 | 用途 | 边界 |
| --- | --- | --- |
| `randomUUID()` | 生成应用 requestId | 外部头需信任边界 |
| `performance.now()` | 单调持续时间 | 不表示 UTC 时间 |
| `Date#toISOString()` | UTC 日志时间 | 不用于高精度耗时 |
| `AsyncLocalStorage` | 在 Node 调用链传播上下文 | 生命周期和异步边界需测试 |
| `X-Request-ID` | 返回支持标识 | 不含用户数据 |
| W3C `traceparent` | 标准 trace 传播 | 由库解析，不手写信任 |
| route template | 低基数路由维度 | unmatched 统一标签 |
| counter | 累计请求/结果数 | 只能递增 |
| gauge | 当前 pool/queue 状态 | 采集失败要可观察 |
| histogram | 延迟/大小分布 | bucket 和单位要明确 |
| SQLSTATE | 数据库错误分类 | 不记录 SQL 参数 |
| OpenTelemetry span | 跨边界耗时与状态 | 属性需 allow-list/采样 |

## 6. 最小可运行案例

### 6.1 创建 allow-list 日志与 IN-MEMORY 指标

创建完整文件 `telemetry/telemetry.mjs`：

```js
const ROUTES = new Set([
  "/api/v1/listings",
  "/api/v1/listings/:id",
  "/api/v1/listings/:id/reservations",
  "unmatched",
]);
const METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);

function checkedRoute(route) {
  return ROUTES.has(route) ? route : "unmatched";
}

function checkedMethod(method) {
  return METHODS.has(method) ? method : "OTHER";
}

function statusClass(status) {
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    throw new Error("status: expected HTTP status");
  }
  return `${Math.floor(status / 100)}xx`;
}

export function requestCompletedLog(input) {
  if (!Number.isFinite(input.durationMs) || input.durationMs < 0) {
    throw new Error("durationMs: expected non-negative finite number");
  }
  const output = {
    timestamp: input.timestamp,
    level: input.status >= 500 ? "error" : "info",
    event: "http_request_completed",
    requestId: input.requestId,
    method: checkedMethod(input.method),
    route: checkedRoute(input.route),
    status: input.status,
    durationMs: Number(input.durationMs.toFixed(3)),
  };
  if (input.traceId) output.traceId = input.traceId;
  if (input.errorCode) output.errorCode = input.errorCode;
  return output;
}

export class InMemoryHttpMetrics {
  constructor() {
    this.requests = new Map();
    this.duration = new Map();
  }

  observe({ method, route, status, durationSeconds }) {
    const normalizedMethod = checkedMethod(method);
    const normalizedRoute = checkedRoute(route);
    const counterKey = JSON.stringify({
      method: normalizedMethod,
      route: normalizedRoute,
      statusClass: statusClass(status),
    });
    const durationKey = JSON.stringify({
      method: normalizedMethod,
      route: normalizedRoute,
    });
    this.requests.set(counterKey, (this.requests.get(counterKey) ?? 0) + 1);
    const current = this.duration.get(durationKey) ?? { count: 0, sum: 0 };
    this.duration.set(durationKey, {
      count: current.count + 1,
      sum: current.sum + durationSeconds,
    });
  }

  snapshot() {
    return {
      requests: [...this.requests.entries()],
      duration: [...this.duration.entries()],
      label: "IN_MEMORY_NO_PERCENTILES",
    };
  }
}
```

函数没有 `{...request}` 或 `{...headers}`，输出字段从 allow-list 构造。未知 raw path 统一为
`unmatched`，不把 UUID 变成新 label。

### 6.2 创建泄密和基数测试

创建完整文件 `telemetry/telemetry.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  InMemoryHttpMetrics,
  requestCompletedLog,
} from "./telemetry.mjs";

test("builds an allow-listed structured completion log", () => {
  const log = requestCompletedLog({
    timestamp: "2026-10-11T08:00:00.000Z",
    requestId: "request-demo-1",
    traceId: "0123456789abcdef0123456789abcdef",
    method: "PATCH",
    route: "/api/v1/listings/:id",
    status: 403,
    durationMs: 12.34567,
    errorCode: "FORBIDDEN",
    rawUrl: "/api/v1/listings/secret-id?q=person@example.test",
    headers: { cookie: "sid=SECRET", authorization: "Bearer SECRET" },
    body: { password: "SECRET", priceCents: 1990 },
  });

  assert.deepEqual(Object.keys(log).sort(), [
    "durationMs", "errorCode", "event", "level", "method",
    "requestId", "route", "status", "timestamp", "traceId",
  ]);
  const serialized = JSON.stringify(log);
  for (const forbidden of ["SECRET", "person@example.test", "password", "cookie"]) {
    assert.equal(serialized.includes(forbidden), false);
  }
});

test("keeps metric labels stable across resource IDs", () => {
  const metrics = new InMemoryHttpMetrics();
  for (let index = 0; index < 100; index += 1) {
    metrics.observe({
      method: "GET",
      route: "/api/v1/listings/:id",
      status: index % 10 === 0 ? 404 : 200,
      durationSeconds: 0.01,
      requestId: `request-${index}`,
      listingId: `listing-${index}`,
    });
  }
  const snapshot = metrics.snapshot();
  assert.equal(snapshot.requests.length, 2);
  assert.equal(snapshot.duration.length, 1);
  assert.equal(snapshot.label, "IN_MEMORY_NO_PERCENTILES");
});
```

运行：

```bash
node --test telemetry/telemetry.test.mjs
```

预期 2 条测试通过。第二条说明 100 个资源 ID 没有制造 100 个 label series；Map 不实现真实
histogram、并发安全、进程聚合或 exporter。

## 7. 邻里集市集成案例

### 7.1 请求上下文与完成日志

Nest/Express 增量设计：

```ts
const requestId = randomUUID();
const started = performance.now();
response.setHeader("X-Request-ID", requestId);

response.once("finish", () => {
  const route = request.route?.path
    ? `${request.baseUrl}${request.route.path}`
    : "unmatched";
  logger.info(requestCompletedLog({
    timestamp: new Date().toISOString(),
    requestId,
    traceId: activeSpanContext()?.traceId,
    method: request.method,
    route,
    status: response.statusCode,
    durationMs: performance.now() - started,
    errorCode: response.locals.errorCode,
  }));
});
```

真实代码用 AsyncLocalStorage 或 OTel context 让 Filter/Repository 取得 requestId/traceId。注册
`finish` 与 `close` 时避免重复记录；客户端断开应有单独 outcome。不要使用 `request.originalUrl`
作为 route。

统一 Error Filter：

- 响应 `requestId` 与头一致；
- 公开 `code/message` 来自受控错误映射；
- 内部日志记录 error class、errorCode、SQLSTATE、requestId/traceId；
- 不把 stack、SQL、参数、headers/body 发给客户端；
- 5xx 才是 error level，预期 409/403 可以 info/warn 并由指标分类。

### 7.2 指标设计表

| 指标 | 类型 | 允许标签 | 禁止标签 |
| --- | --- | --- | --- |
| `http_server_requests_total` | Counter | method, route, status_class | requestId, URL, userId |
| `http_server_request_duration_seconds` | Histogram | method, route | q, listingId |
| `reservation_results_total` | Counter | result | buyerId, sellerId |
| `db_pool_waiting` | Gauge | pool_name | SQL, connection URL |
| `db_acquire_timeouts_total` | Counter | pool_name | requestId |
| `outbox_oldest_event_age_seconds` | Gauge | event_type（受控枚举） | eventId/payload |
| `queue_oldest_job_age_seconds` | Gauge | queue_name | jobId |
| `cache_requests_total` | Counter | cache_name, result | key/q |

`priceCents` 不作为指标 label；若需要价格分布，先经过隐私和业务审查并使用固定 bucket，不记录
单笔商品价格明细。

### 7.3 OpenTelemetry 启动顺序

Instrumentation 必须在被观测库导入前初始化：

```text
node --import ./dist/instrumentation.js ./dist/main.js
```

或让入口最先 import instrumentation。具体 SDK/exporter/instrumentation 版本必须与 Node 24、
Nest 12、HTTP、pg、Redis/BullMQ 实际版本核对并锁定，不在教程猜补丁版本。

配置审查：

- service name/version/environment 来自非秘密配置；
- exporter endpoint 不含明文凭据日志；
- HTTP 忽略 `/live` 高频 span（按产品策略）；
- DB statement/parameters 默认不采集；
- headers 采集 allow-list，Cookie/Authorization/CSRF 永不采集；
- resource/user/listing ID 不放 metrics label；
- queue payload 不放 span event；
- batch queue、timeout 和 drop counter 有上限。

### 7.4 异步队列 trace

API 事务提交 outbox 后，原 HTTP trace 已结束。Dispatcher 发布 job 时创建 producer span；Worker
消费时创建 consumer span，并可 link 到经过验证的 trace context。业务 event ID 用于数据库
对账和受限日志，不要求把跨数小时 job 强行作为 HTTP span 的直接 child。

不要传播包含用户邮箱/角色的 baggage。Trace 丢失或采样不应影响 job 处理；幂等依赖 event ID，
不是 traceId。

### 7.5 数据库故障诊断

场景：停止隔离测试数据库后请求列表。

| 项目 | 预期观察 |
| --- | --- |
| HTTP | 当前契约定义的受控 500；若已版本化为 503，则规范/测试同步 |
| Error | `code` 稳定、requestId 与头一致、无连接串/SQL |
| 日志 | route template、duration、dependency error class/SQLSTATE（若有） |
| 指标 | 5xx 增加、pool waiting/acquire timeout 变化 |
| Trace | HTTP span error，DB acquire/query span 标记失败且无参数 |
| Health | `/ready` 503，`/live` 200 |

恢复数据库后复验 ready、请求、pool waiting 和错误率恢复。没有实际监控后端时，只能在本机
检查结构化输出/内存 exporter，不能宣称告警已触发。

### 7.6 409 与 500 的区分

两个买家争抢同一 Listing：

- 赢家 201；
- 输家 409 `RESERVATION_CONFLICT`；
- `reservation_results_total{result="conflict"}` 增加；
- HTTP 4xx 指标增加，但 internal error 不增加；
- 日志 info/warn，trace status 可保持业务可预期状态而记录 outcome；
- 数据库最终一条有效预约。

如果所有非 2xx 都标 error，正常竞争会制造告警噪声，掩盖真实 500。

### 7.7 遥测脱敏测试

自动测试序列化后的 log/span fixture：

- 禁止 key：`password`、`cookie`、`authorization`、`csrf`、`database_url`、`sql_params`；
- 禁止值：测试占位 SECRET、邮箱和完整 q；
- route 必须来自 allow-list/template；
- metric label name/value 集合固定；
- error body/日志分层，公开输出无 stack。

Redaction 测试使用明显唯一的 canary secret，确保测试真的会发现泄漏；不要用真实秘密。

## 8. 常见错误与排查路径

### 8.1 明确错误示例：展开请求对象

```ts
// 错误：headers/body/query 会把凭据和个人信息写入日志。
logger.info({ ...request, body: request.body }, "request");
```

- **现象**：日志搜索到 `sid=...`、Bearer token、密码或用户搜索词。
- **证据**：canary secret 出现在序列化日志或 exporter fixture。
- **原因**：使用 deny-list 事后清理任意对象，字段嵌套和新 header 绕过规则。
- **修复**：从空对象按 allow-list 构造 method/route/status/duration/requestId/errorCode；sink 再设 redaction 防线。
- **复验**：注入 Cookie、Authorization、CSRF、密码、q canary，日志/trace/metrics 均不包含。

### 8.2 原始路径造成高基数

- **现象**：每个 Listing ID 都产生一条新指标 series，监控成本和内存增长。
- **证据**：label 值形如 `/listings/<uuid>`，series 数接近请求 ID 数。
- **原因**：在路由匹配前记录 raw URL。
- **修复**：在匹配后取得 route template；未匹配统一 `unmatched`。
- **复验**：100 个不同 ID 只产生按 status class 区分的有限 series。

### 8.3 Request ID 被当作 Trace

- **现象**：跨服务每段都打印同一字符串，但看不到父子耗时和传播错误。
- **证据**：没有有效 trace/span context，只是复制 header。
- **原因**：混淆支持关联 ID 与标准分布式 tracing。
- **修复**：用 OTel/W3C Trace Context；requestId 保留为日志和响应支持标识。
- **复验**：真实跨边界 trace 有 span 关系，日志同时可按 requestId 搜索。

### 8.4 指标把 409 当 500

- **现象**：商品热门时“错误率”告警，但服务和数据库正常。
- **证据**：告警把所有非 2xx 相加，409 conflict 占多数。
- **原因**：没有按状态类别和业务 outcome 分类。
- **修复**：内部错误 SLI 聚焦 5xx/依赖失败；409 单独业务指标和产品阈值。
- **复验**：并发冲突增加 conflict 指标，不触发内部 5xx 告警。

### 8.5 Exporter 反压业务线程

- **现象**：collector 故障时 API 延迟和内存一起上升。
- **证据**：export queue 无上限或同步等待网络。
- **原因**：遥测发送缺少批量、超时和丢弃策略。
- **修复**：有界 batch queue、短超时、drop counter；关键审计另建可靠通道。
- **复验**：停止 collector，业务延迟仍在预算内，丢弃可观察且内存不无限增长。

## 9. 课后题

1. **为什么不能把 requestId 作为 metrics label？**
   答案：几乎每次请求都不同，会产生无界 series；它适合日志字段。
2. **为什么记录 SQLSTATE 比完整 SQL+参数更合适？**
   答案：SQLSTATE 支持错误分类，完整 SQL/参数可能含个人和秘密且制造高基数；必要 SQL 模板也需受控。
3. **Trace 被采样是否可以放更多敏感字段？**
   答案：不可以。采样只控制数量，不改变数据访问和泄漏风险。
4. **Readiness 失败为什么不一定让 liveness 失败？**
   答案：进程仍健康但依赖暂不可用，应先摘流而不是反复重启。

## 10. 实践练习

### 基础：增加 409 outcome

为预约冲突增加低基数 `result=conflict` counter 和完成日志 `errorCode`。可判定标准：不含 listing/
buyer ID；不增加 internal 5xx；测试中并发冲突只生成有限 label。

### 进阶：Outbox 积压诊断

设计 pending count、oldest age 和 dispatcher error 日志。可判定标准：event type 为受控枚举；
eventId/payload 不做 label；停止 Redis 后 age 上升，恢复后下降；未实际运行时只写手册。

### 故障注入：Canary secret

在测试 request header/body/query 注入唯一 `TELEMETRY_CANARY_SECRET`。可判定标准：序列化日志、
span fixture、metric snapshot 和错误响应均不包含；故意展开 headers 时测试先红，恢复 allow-list
后转绿。

## 11. 阶段验收

- [ ] 日志、指标、trace 的问题和证据边界分别说明；
- [ ] requestId 与 traceId 职责分开且均不做 metric label；
- [ ] route template/status class 等标签保持低基数；
- [ ] Cookie、Authorization、CSRF、密码、连接串、SQL 参数、q/payload 不进入遥测；
- [ ] wall clock UTC 与单调 duration 分开；
- [ ] 409/403 与 500/依赖错误分类正确；
- [ ] PostgreSQL pool、outbox、queue、cache 有容量/年龄指标；
- [ ] `/live` 与 `/ready` 在数据库故障时行为不同；
- [ ] exporter 故障有有界队列和丢弃证据；
- [ ] IN-MEMORY 测试没有被报告为生产监控或告警通过。

## 12. 常见问题

**可以记录 userId 方便排查吗？**
它可能是个人标识且高基数。先问是否必要、谁可访问、保留多久；优先使用 requestId 查受控业务
系统。绝不放 metrics label。

**错误 stack 完全不能记录吗？**
受保护内部错误日志可以按策略记录经过脱敏和限长的 stack；不能发给客户端，也不能连同任意
request/body/SQL 参数展开。

**是否应该给每个函数创建 span？**
不应。Span 覆盖有诊断价值的边界，如 HTTP、DB、cache、queue 和关键领域阶段；过细会增加成本
和噪声。

**日志能否代替审计？**
普通应用日志常被采样、删除或限权方式不同。高价值管理操作需要不可抵赖、完整性和保留要求时，
应设计专门审计事件和存储。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Prometheus：Instrumentation](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus：Naming](https://prometheus.io/docs/practices/naming/)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [Node.js `AsyncLocalStorage`](https://nodejs.org/api/async_context.html#class-asynclocalstorage)

## 我现在能做到什么

我能用 allow-list 结构化日志、低基数指标和脱敏 trace 关联 HTTP、PostgreSQL、缓存、outbox 与
队列故障，并通过 canary 测试和故障注入证明诊断能力没有以泄露秘密为代价。

## 单元导航

- 章入口：[09 测试、OpenAPI 与可观测性](../09-testing-openapi-observability.md)
- 上一课：[OpenAPI 生成与契约验证](02-openapi-generation-contract-validation.md)
- 下一章：[10 API 综合项目](../10-api-capstone.md)
