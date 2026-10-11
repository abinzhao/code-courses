# 有界负载基线与慢查询：先声明前提，再讨论性能

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 在读者自有 loopback API 上建立公共列表基线，区分延迟、状态类、网络错误、SQL 计划与池等待 |
| 练习位置 | 读者自己的 `market/ops/load.mjs`、固定 service `market_load_reader_local` 和隔离数据库 `market_ops_test` |
| 运行条件 | Node.js 24；查询计划运行需要 loopback PostgreSQL 18 和至少 10,000 条虚构商品 |
| 核心命令 | `CONCURRENCY=10 SECONDS=60 node ops/load.mjs http://127.0.0.1:3000` |
| 成功证据 | 脚本直查并落盘的本轮数据库 preflight、预热、状态/错误分类、p50/p95/p99、请求率、计划、数据库等待和 pool waiting |
| 失败证据 | 非 loopback 被拒绝；超限参数非零退出；错误状态、超时与查询/池等待保留原始分类 |
| 教学门槛 | 公共列表占比 100%，并发 10、60 秒，网络错误 0、5xx 0、HTTP 200 全部、p95 不高于 300 ms |
| 证据边界 | 这是指定单机的闭环负载，不证明固定到达率容量、互联网延迟或生产 SLO |

## 1. 任务背景

“我的接口只要 18 ms”没有说明硬件、数据量、并发、预热、统计口径和错误。空数据库上的一次
请求可以很快，但真实列表可能有 10,000 行、稳定排序、模糊查询、连接池竞争和代理开销。
另一方面，看见一次 p95 变慢就认定“索引失效”，也把相关性误写成了因果。

本课建立一条可审计证据链：

```text
环境与数据前提
  -> 功能 smoke
  -> 有界预热
  -> 有界闭环测量
  -> 状态类/网络错误/分位数
  -> 应用 pool 指标
  -> PostgreSQL plan 与 waits
  -> 形成假设
  -> 单变量实验与复验
```

任何一步缺失，都只能给出范围更窄的结论。Node 脚本语法通过不等于负载通过；负载通过也不等于
查询计划或生产容量通过。

## 2. 学习目标

完成本课后，你能够：

1. 在测试前声明 CPU、内存、OS、Node、PostgreSQL、数据规模和索引状态；
2. 区分并发数、到达率、吞吐、延迟和错误率；
3. 用 loopback allow-list、时间上限、样本上限和请求超时约束负载；
4. 先预热，再计算 nearest-rank p50、p95、p99；
5. 分开统计精确状态码、状态类、timeout、network 与 body read 错误；
6. 解释闭环模型在服务变慢时会自动降低到达率的局限；
7. 安全读取 `EXPLAIN (ANALYZE, BUFFERS)`、`pg_stat_activity` 和连接池等待；
8. 区分事实、假设与因果结论，不用单次观测证明缓存或索引一定有效。

## 3. 预备知识

先完成：

- [Compose 服务、网络、健康与迁移](../02-docker-compose/02-compose-services-network-health-migrations.md)；
- [PostgreSQL 连接、TLS、池与超时](../../08-backend/04-postgres-data-access/01-connections-tls-pools-timeouts.md)；
- [迁移、索引与查询计划](../../08-backend/03-sql-modeling/03-migrations-indexes-query-plans.md)；
- [结构化日志、指标与 Trace](../../08-backend/09-testing-openapi-observability/03-structured-logs-metrics-traces.md)。

安全前提：

- API 必须绑定 `127.0.0.1`、`localhost` 或 `::1`；
- PostgreSQL 必须是读者拥有的 `market_ops_test`，服务端主版本 18；
- `market_load_reader_local` 只能读取该库，且 service/passfile 由读者持有，不进入仓库；
- 只生成 `@example.test` 虚构账号和商品；
- fixture 商品标题使用 `OPS-LOAD-<fixtureRunId>::` 前缀；本轮恰好一个 run 至少 10,000 行；
- 先确认 `/api/v1/listings?page=1&pageSize=20` 返回预期 200；
- 不在生产、共享测试、公共域名或第三方 API 上运行本课脚本；
- 不用最大并发探路，先从并发 1 开始。

记录环境，不把下列模板中的说明文字当实测值：

```text
observed_at_utc:
os_and_arch:
cpu_model_and_logical_cores:
memory_bytes:
node_raw_version:
postgres_server_version_num:
api_commit:
database_name: market_ops_test
listing_rows:
active_reservations:
relevant_indexes:
warmup_seconds:
request_mix: public list 100%
concurrency:
duration_seconds:
timeout_ms:
```

## 4. 核心理论

### 4.1 性能结论是条件命题

正确表达是：

> 在所记录机器、PostgreSQL 18、10,000 条虚构商品、公共列表 100%、预热 5 秒、并发 10、
> 闭环运行 60 秒的条件下，本轮观察到某个 p95、请求率和错误分布。

错误表达是：

> 系统可以承受 10 个用户，生产一定小于 300 ms。

并发 10 表示最多 10 个客户端循环，不等于只有 10 个真实用户，也不等于每秒固定到达 10 个
请求。真实用户有 think time、突发、慢网、登录和写操作；脚本没有模拟这些行为。

### 4.2 闭环与开放到达模型

本课客户端收到响应后才发下一次请求，是闭环模型：

```text
request -> wait response -> next request
```

服务器变慢时，每个 worker 等得更久，总请求率会下降，因此它可能隐藏固定到达率下不断增长的
排队。开放模型按计划到达率发请求，更适合验证过载与排队，但必须另外设置最大 in-flight、
停止条件和授权。结业基线选择闭环，是为了让零依赖实验有界，不是声称它覆盖全部容量模型。

### 4.3 延迟必须和结果放在一起

一个 2 ms 的 503 不是性能成功。至少同时记录：

- 精确状态码：200、400、401、403、409、429、500、503；
- 状态类：2xx、4xx、5xx；
- 网络错误：连接拒绝、DNS、socket 中断；
- timeout：请求超过本课上限；
- body read：收到头后读取正文失败；
- 延迟：每次尝试从发起到正文读取或失败完成。

对预约负载，409 是预期业务竞争，不等于内部错误；对公共列表，本课只期待 200。不同场景要先
定义允许结果，不能把所有非 2xx 合并后再解释。

### 4.4 分位数的含义

把 `n` 个延迟升序排列，nearest-rank 的 p95 取 `ceil(n * 0.95)` 对应值。p95 表示至少 95%
样本不超过该值，不是“最慢请求平均值”，也不说明某个具体用户总是处于 p95。

样本太少时 p99 很不稳定；跨轮比较还要保持前提相同。平均值会被少量极慢请求拉动，分位数也
不能解释错误原因，因此两者都要和状态、trace、pool、SQL 证据结合。

### 4.5 预热改变什么

首次请求可能包含 JIT、模块初始化、连接建立、文件缓存和数据库 buffer cache 变化。预热让测量
更接近平稳阶段，但不能删除冷启动问题。应分别记录：

- 冷启动/首次可用时间；
- 预热动作和时长；
- 预热后的测量结果。

不能把预热当成“每次运行前都能保证缓存已热”的生产承诺。

### 4.6 从请求慢到 SQL 慢需要跨层证据

请求总耗时可以粗略拆成：

```text
代理 + 应用排队 + pool acquire + SQL execute + serialize + network/body read
```

如果 p95 升高而 SQL execute 仍快、pool waiting 增加，可能是连接池过小、连接泄露或事务过长。
如果 pool 不等待而 SQL actual time 和 buffer reads 增加，才更像查询路径问题。即使二者同时变化，
也要用单变量实验复验，不能立即宣布其中一个导致另一个。

### 4.7 `EXPLAIN ANALYZE` 真的会执行

`EXPLAIN (ANALYZE, BUFFERS)` 会执行查询。对 UPDATE/DELETE 使用会改变数据，除非在明确事务中
回滚且已理解副作用。本课只运行已审查的 SELECT，并且只在隔离测试库执行。

重点观察：

- estimated rows 与 actual rows；
- actual loops；
- Seq Scan、Index Scan、Bitmap Scan 的条件；
- Sort 方法、内存与磁盘 spill；
- shared hit/read/dirtied buffers；
- Planning Time 和 Execution Time。

小表 Seq Scan 可能最优。不能用 `SET enable_seqscan = off` 制造看似漂亮的 Index Scan 作为优化
证据。

### 4.8 OFFSET 与游标不是无条件替换

第一页 `OFFSET 0` 通常简单；深页需要扫描并丢弃前面的行，成本可能增长。游标分页要有稳定、
唯一排序，例如 `(created_at DESC, id DESC)`，并携带两个边界值。它改善深页访问形态，但会改变
随机跳页、总数和并发插入语义，必须同步 API 契约与双前端。

## 5. 接口、命令与证据清单

| 项目 | 本课值 | 证据或边界 |
| --- | --- | --- |
| 目标 origin | `http://127.0.0.1:3000` 等 loopback | 拒绝用户名、密码、query、hash 和非 loopback |
| 数据证明 service | `market_load_reader_local` | 直查 connected database/address/PG18，不接受 service 环境覆盖 |
| fixture 证明 | 实际 `rowCount`、`fixtureRunId`、数据库 UTC `observedAt` | 发 HTTP 前查询；拒绝零/多轮合格 fixture |
| preflight evidence | `/tmp/full-course-verification/batch-f/reader-owned/load-evidence/` | 固定 reader-owned 目录，原子写 JSON |
| 请求路径 | `/api/v1/listings?page=1&pageSize=20` | 只读公共列表，占比 100% |
| `CONCURRENCY` | 默认 10，范围 1..20 | 固定 worker 数，不是固定 RPS |
| `SECONDS` | 默认 60，范围 1..120 | 测量时长上限 |
| `WARMUP_SECONDS` | 默认 5，范围 0..30 | 不进入分位数 |
| `TIMEOUT_MS` | 默认 5000，范围 100..10000 | 每请求超时 |
| `MAX_SAMPLES` | 默认 200000，范围 1..200000 | 防止内存无界增长 |
| p50/p95/p99 | nearest-rank | 只对测量阶段尝试计算 |
| `pool.total/idle/waiting` | API 暴露的受控内部指标 | 不能把连接串或 SQL 放进指标 |
| `pg_stat_activity` | state/wait/query age | 受限运维身份，只看自有数据库 |
| `EXPLAIN` | SELECT + ANALYZE + BUFFERS | 会执行，只用于隔离测试库 |

## 6. 最小可运行案例

### 6.1 创建完整有界负载器

**完整文件：`ops/load.mjs`**

```js
import { execFile } from "node:child_process";
import {
  chmod,
  lstat,
  mkdir,
  realpath,
  rename,
  writeFile,
} from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { promisify } from "node:util";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const DATABASE_LOOPBACK = new Set(["local-socket", "127.0.0.1", "::1"]);
const LOAD_SERVICE = "market_load_reader_local";
const LOAD_DATABASE = "market_ops_test";
const EVIDENCE_ROOT =
  "/tmp/full-course-verification/batch-f/reader-owned/load-evidence";
const PHYSICAL_EVIDENCE_ROOTS = new Set([
  EVIDENCE_ROOT,
  "/private/tmp/full-course-verification/batch-f/reader-owned/load-evidence",
]);
const execFileAsync = promisify(execFile);

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor !== 24) {
  throw new Error(`Node.js 24 is required; observed ${process.version}`);
}

function integerSetting(name, fallback, minimum, maximum) {
  const raw = process.env[name] ?? String(fallback);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function checkedOrigin(raw) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("target protocol must be http or https");
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error("this lesson permits loopback targets only");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("target must be a credential-free origin without query or hash");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("target must be an origin; the lesson owns the request path");
  }
  return url;
}

const target = checkedOrigin(
  process.argv[2] ?? "http://127.0.0.1:3000",
);
if ("DATASET_ROWS" in process.env) {
  throw new Error(
    "DATASET_ROWS is forbidden; dataset size must come from PostgreSQL preflight",
  );
}
const concurrency = integerSetting("CONCURRENCY", 10, 1, 20);
const durationSeconds = integerSetting("SECONDS", 60, 1, 120);
const warmupSeconds = integerSetting("WARMUP_SECONDS", 5, 0, 30);
const timeoutMs = integerSetting("TIMEOUT_MS", 5000, 100, 10000);
const maxSamples = integerSetting("MAX_SAMPLES", 200000, 1, 200000);
const endpoint = new URL(
  "/api/v1/listings?page=1&pageSize=20",
  target,
);

const PREFLIGHT_SQL = String.raw`
SELECT (
  current_database() = 'market_ops_test'
  AND COALESCE(inet_server_addr()::text, 'local-socket')
      IN ('local-socket', '127.0.0.1', '::1')
  AND current_setting('server_version_num')::integer >= 180000
  AND current_setting('server_version_num')::integer < 190000
) AS allowed
\gset
\if :allowed
WITH marked AS (
  SELECT (
    regexp_match(
      title,
      '^OPS-LOAD-([A-Za-z0-9_][A-Za-z0-9_-]{7,63})::'
    )
  )[1] AS fixture_run_id
  FROM listings
  WHERE title ~ '^OPS-LOAD-[A-Za-z0-9_][A-Za-z0-9_-]{7,63}::'
),
eligible AS (
  SELECT fixture_run_id, count(*)::bigint AS row_count
  FROM marked
  GROUP BY fixture_run_id
  HAVING count(*) >= 10000
)
SELECT json_build_object(
  'targetOrigin', :'target_origin',
  'database', current_database(),
  'databaseAddress',
    COALESCE(inet_server_addr()::text, 'local-socket'),
  'currentRole', current_user,
  'serverMajor',
    current_setting('server_version_num')::integer / 10000,
  'rowCount', row_count,
  'fixtureRunId', fixture_run_id,
  'observedAt',
    to_char(
      clock_timestamp() AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
    )
)
FROM eligible
WHERE (SELECT count(*) FROM eligible) = 1;
\else
\echo refusing unexpected database target or PostgreSQL major
\quit 2
\endif
`;

function validatePreflight(value) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error("PostgreSQL preflight did not return an object");
  }
  if (value.targetOrigin !== target.origin) {
    throw new Error("preflight target origin mismatch");
  }
  if (value.database !== LOAD_DATABASE) {
    throw new Error("preflight database mismatch");
  }
  if (!DATABASE_LOOPBACK.has(value.databaseAddress)) {
    throw new Error("preflight database address is not loopback");
  }
  if (value.currentRole !== LOAD_SERVICE) {
    throw new Error("preflight service resolved to an unexpected role");
  }
  if (value.serverMajor !== 18) {
    throw new Error("preflight server major must be PostgreSQL 18");
  }
  if (
    !Number.isSafeInteger(value.rowCount) ||
    value.rowCount < 10000
  ) {
    throw new Error("preflight rowCount must be an observed integer >= 10000");
  }
  if (
    typeof value.fixtureRunId !== "string" ||
    !/^[A-Za-z0-9_][A-Za-z0-9_-]{7,63}$/.test(value.fixtureRunId)
  ) {
    throw new Error("preflight fixtureRunId is invalid");
  }
  const observedAtMs = Date.parse(value.observedAt);
  const ageMs = Date.now() - observedAtMs;
  if (!Number.isFinite(observedAtMs) || ageMs < -5000 || ageMs > 60000) {
    throw new Error("preflight observedAt is not from this run");
  }
  return Object.freeze(value);
}

async function queryPreflight() {
  const { stdout } = await execFileAsync(
    "psql",
    [
      `service=${LOAD_SERVICE} dbname=${LOAD_DATABASE}`,
      "-X",
      "--no-align",
      "--tuples-only",
      "--quiet",
      "--set=ON_ERROR_STOP=1",
      `--set=target_origin=${target.origin}`,
      "--command",
      PREFLIGHT_SQL,
    ],
    {
      encoding: "utf8",
      timeout: 15000,
      maxBuffer: 1024 * 1024,
    },
  );
  const raw = stdout.trim();
  if (raw === "") {
    throw new Error(
      "preflight found zero or multiple fixture runs with at least 10000 rows",
    );
  }
  return validatePreflight(JSON.parse(raw));
}

async function writePreflightEvidence(preflight) {
  await mkdir(EVIDENCE_ROOT, { recursive: true, mode: 0o700 });
  const rootStat = await lstat(EVIDENCE_ROOT);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error("load evidence root must be a real directory");
  }
  if (rootStat.uid !== process.getuid()) {
    throw new Error("load evidence root is not reader-owned");
  }
  await chmod(EVIDENCE_ROOT, 0o700);
  const physicalRoot = await realpath(EVIDENCE_ROOT);
  if (!PHYSICAL_EVIDENCE_ROOTS.has(physicalRoot)) {
    throw new Error("load evidence root escaped the reader-owned path");
  }

  const stamp = preflight.observedAt.replace(/[^0-9]/g, "").slice(0, 17);
  const finalPath =
    `${EVIDENCE_ROOT}/load-preflight-${stamp}-${process.pid}.json`;
  const partialPath = `${finalPath}.partial`;
  const body = `${JSON.stringify({
    label: "READER_OWNED_PG18_LOAD_PREFLIGHT",
    service: LOAD_SERVICE,
    ...preflight,
  }, null, 2)}\n`;
  await writeFile(partialPath, body, { flag: "wx", mode: 0o600 });
  await rename(partialPath, finalPath);
  return finalPath;
}

// This database query and evidence write complete before the first fetch.
const preflight = await queryPreflight();
const preflightEvidencePath = await writePreflightEvidence(preflight);

const latencies = [];
const statusCodes = new Map();
const statusClasses = new Map();
const errorKinds = new Map();
let sampleLimitReached = false;
let issuedSamples = 0;

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function isTimeout(error) {
  return error instanceof Error &&
    ["TimeoutError", "AbortError"].includes(error.name);
}

function classifyRequestError(error) {
  if (isTimeout(error)) {
    return "timeout";
  }
  if (
    error instanceof TypeError &&
    error.cause instanceof Error &&
    typeof error.cause.code === "string"
  ) {
    return "network";
  }
  return "request_other";
}

async function attempt(record) {
  const started = performance.now();
  try {
    let response;
    try {
      response = await fetch(endpoint, {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Accept: "application/json" },
      });
    } catch (error) {
      if (record) increment(errorKinds, classifyRequestError(error));
      return;
    }

    // Status is evidence as soon as headers arrive, even if body reading fails.
    if (record) {
      increment(statusCodes, String(response.status));
      increment(statusClasses, `${Math.floor(response.status / 100)}xx`);
    }
    try {
      await response.arrayBuffer();
    } catch (error) {
      if (record) {
        increment(errorKinds, isTimeout(error) ? "timeout" : "body_read");
      }
    }
  } finally {
    if (record) latencies.push(performance.now() - started);
  }
}

async function runPhase(seconds, record) {
  const deadline = performance.now() + seconds * 1000;
  async function worker() {
    while (performance.now() < deadline) {
      if (record) {
        if (issuedSamples >= maxSamples) {
          sampleLimitReached = true;
          return;
        }
        issuedSamples += 1;
      }
      await attempt(record);
    }
  }
  await Promise.all(
    Array.from({ length: concurrency }, () => worker()),
  );
}

if (warmupSeconds > 0) await runPhase(warmupSeconds, false);
const measuredAt = new Date().toISOString();
const measurementStarted = performance.now();
await runPhase(durationSeconds, true);
const measuredSeconds = (performance.now() - measurementStarted) / 1000;

latencies.sort((left, right) => left - right);
function percentile(ratio) {
  if (latencies.length === 0) return null;
  const rank = Math.max(1, Math.ceil(latencies.length * ratio));
  return Number(latencies[rank - 1].toFixed(3));
}

const transportErrors = [...errorKinds.values()].reduce(
  (sum, count) => sum + count,
  0,
);
const success200 = statusCodes.get("200") ?? 0;
const internal5xx = statusClasses.get("5xx") ?? 0;
const p95Ms = percentile(0.95);
const teachingGatePassed =
  !sampleLimitReached &&
  transportErrors === 0 &&
  internal5xx === 0 &&
  success200 === latencies.length &&
  p95Ms !== null &&
  p95Ms <= 300;

const report = {
  label: "LOCAL_LOOPBACK_CLOSED_LOOP_MEASUREMENT",
  measuredAt,
  targetOrigin: target.origin,
  endpoint: `${endpoint.pathname}${endpoint.search}`,
  publicListRatio: 1,
  assumptions: {
    databasePreflight: {
      service: LOAD_SERVICE,
      evidencePath: preflightEvidencePath,
      ...preflight,
    },
    authentication: "public unauthenticated list",
    arrivalModel: "closed loop",
  },
  limits: {
    concurrency,
    warmupSeconds,
    requestedDurationSeconds: durationSeconds,
    timeoutMs,
    maxSamples,
  },
  observed: {
    attempts: latencies.length,
    measuredSeconds: Number(measuredSeconds.toFixed(3)),
    attemptsPerSecond: Number(
      (latencies.length / measuredSeconds).toFixed(3),
    ),
    statusCodes: Object.fromEntries(statusCodes),
    statusClasses: Object.fromEntries(statusClasses),
    errorKinds: Object.fromEntries(errorKinds),
    p50Ms: percentile(0.5),
    p95Ms,
    p99Ms: percentile(0.99),
    sampleLimitReached,
  },
  teachingGate: {
    rule: "all 200, zero timeout/network/body-read/request-other errors, zero 5xx, p95 <= 300 ms",
    passed: teachingGatePassed,
  },
};

console.log(JSON.stringify(report, null, 2));
if (!teachingGatePassed) process.exitCode = 1;
```

### 6.2 先做语法和拒绝测试

```bash
node --version
node --check ops/load.mjs
DATASET_ROWS=10000 \
  node ops/load.mjs http://127.0.0.1:3000
node ops/load.mjs https://example.com
```

第一条必须显示 `v24.x`，第二条预期退出 0。第三条必须在调用 `psql` 前拒绝自报行数；第四条
必须在查询数据库或发送 HTTP 前拒绝非 loopback。后两条失败是安全门生效，不是负载失败。若
它们继续访问目标，本课验收失败。

### 6.3 从并发 1 到教学负载

先确认 API 与虚构数据已经存在：

```bash
curl --fail --silent --show-error \
  'http://127.0.0.1:3000/api/v1/listings?page=1&pageSize=20' \
  >/tmp/full-course-verification/batch-f/reader-owned/listings-smoke.json

CONCURRENCY=1 SECONDS=10 WARMUP_SECONDS=2 \
  node ops/load.mjs http://127.0.0.1:3000

CONCURRENCY=10 SECONDS=60 WARMUP_SECONDS=5 \
  node ops/load.mjs http://127.0.0.1:3000 \
  > /tmp/full-course-verification/batch-f/reader-owned/load-report.json
```

目标目录和 `market_load_reader_local` 必须由读者创建并拥有。脚本先查询 connected target 和
fixture，再原子写 `load-evidence/load-preflight-*.json`，成功后才访问本机公共列表。报告中的
行数、runId 和时间来自同一 service 的本轮查询，教材不提供可复制的“漂亮结果”。当前没有
PG18 或 API 时属于环境阻塞，不能写容量通过。

## 7. 邻里集市集成案例

### 7.1 准备可识别的 10,000 行数据

数据生成器必须创建本轮随机 `fixtureRunId`，并让每条 fixture 标题使用
`OPS-LOAD-<fixtureRunId>::<序号>`。它还必须在连接后检查：

```sql
SELECT current_database() = 'market_ops_test' AS correct_database,
       current_setting('server_version_num')::integer / 10000 = 18
         AS correct_server_major;
```

两个值都为 true 才能继续。生成固定前缀的虚构用户与商品，金额使用 `integer price_cents`，
时间使用 `timestamptz`。生成器应可按 run ID 清理自己的行，禁止对整个共享表执行 TRUNCATE。
本课不提供绕过外键和授权的批量生产命令；应复用项目 fixture 或受审查的测试数据脚本。

记录实际规模：

```sql
SELECT count(*) AS listing_rows FROM listings;
SELECT status, count(*) FROM listings GROUP BY status ORDER BY status;
```

清理旧 fixture 后，本轮前缀至少有 10,000 行，而且不能同时残留第二个也达到 10,000 行的
fixtureRunId。`load.mjs` 会从实际标题分组读取 runId 和行数；它不接受操作者手填数字。这个规模
只保证基线不再是空表实验，不代表生产数据分布。标题长度、状态比例、时间分布和收藏/预约关联
也会影响计划。

### 7.2 读取公共列表计划

只在 `market_ops_test` 执行：

```sql
BEGIN READ ONLY;

EXPLAIN (ANALYZE, BUFFERS, WAL, SETTINGS, FORMAT TEXT)
SELECT id, title, price_cents, status, owner_id, version, created_at
FROM listings
WHERE status = 'available'
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 0;

ROLLBACK;
```

预期得到 actual rows、loops、buffers、planning/execution time。不要把 `Index Scan` 当唯一成功
形态；先解释数据规模和估算。`WAL` 对只读查询通常没有写入，但保留该字段能发现意外写动作。

深页对照实验：

```sql
BEGIN READ ONLY;

EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT id, title, price_cents, created_at
FROM listings
WHERE status = 'available'
ORDER BY created_at DESC, id DESC
LIMIT 20 OFFSET 8000;

ROLLBACK;
```

只比较同一快照附近的计划与扫描量。若深页明显增加，再设计 cursor 查询并同步契约；不能只加
索引就宣称解决所有分页问题。

### 7.3 观察 PostgreSQL waits

由受限本地观测身份执行，不导出 SQL 参数：

```sql
SELECT state,
       wait_event_type,
       wait_event,
       count(*) AS sessions,
       max(clock_timestamp() - query_start) AS max_query_age
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
GROUP BY state, wait_event_type, wait_event
ORDER BY sessions DESC, state;
```

`ClientRead` 可能只是连接等待客户端请求；`Lock`、`IO` 和长 `idle in transaction` 才需要结合
上下文调查。快照只代表采样时刻，没看见等待不证明整轮从未等待。

### 7.4 同时记录应用连接池

在受保护内部指标中记录：

```text
db_pool_total{pool="runtime"}
db_pool_idle{pool="runtime"}
db_pool_waiting{pool="runtime"}
db_pool_acquire_timeout_total{pool="runtime"}
```

标签只使用受控 pool 名，不使用 requestId、用户、SQL 或连接串。负载前、中、后各保存一次。
如果 pool waiting 增加而 SQL execution 不慢，先查事务持有时间和 client release；不要直接把
最大连接数翻倍，因为这可能把排队转移到 PostgreSQL。

### 7.5 形成不夸因果的结论

合格记录：

```text
事实：本轮 p95 比同前提基线高；pool waiting 同时从 0 增加；
      两次已采样 SELECT 的 execution time 未明显增加。
推断：应用连接取得可能是候选瓶颈。
待确认：是否存在未释放连接或长事务；采样是否覆盖慢请求。
动作：关联慢请求 trace，检查 acquire duration 和事务边界；
      修复一个确认问题后，在相同前提重跑。
```

不合格记录：

```text
数据库连接池导致 p95 变慢，扩大 pool 即可。
```

后者没有排除代理、事件循环、序列化和采样遗漏，也没有单变量复验。

## 8. 常见错误与排查路径

### 8.1 明确错误示例

```js
// 错误：目标来自任意参数，没有 allow-list，也没有时长、超时或样本上限。
const target = process.argv[2];
while (true) {
  fetch(target);
}
```

这段代码可能对无授权目标持续制造请求、无限增加 in-flight 和内存，不能作为压测工具。

### 8.2 五段诊断记录

**现象**：并发 10 时 p95 超过 300 ms，报告有 503，pool waiting 持续非零。
**证据**：保留环境前提、负载 JSON、ready 结果、pool 三项、wait 聚合和对应查询计划。
**原因**：先标“待确认”；关联后发现某事务在外部网络调用期间一直占有数据库 client。
**修复**：把外部调用移出数据库事务，确保 `finally` release，并增加 acquire timeout 测试。
**复验**：同数据、同 commit、同负载重跑；比较 p95、503、pool waiting，并运行预约事务回归。

不能把“重启 API 后恢复”写成原因。重启可能只清掉泄露连接，没有修复生命周期错误。

### 8.3 错误对照表

| 现象 | 先看证据 | 可能原因 | 修复后复验 |
| --- | --- | --- | --- |
| 非 loopback 被拒绝 | 脚本错误和目标参数 | 安全门正常工作 | 改用自有本地服务，不放宽默认 |
| preflight 无结果 | service target/fixture 前缀分组 | 行数不足、多个合格 run 或连错库 | 清理本轮 fixture，重新直查，不手填行数 |
| 样本上限触发 | `sampleLimitReached` | 时长/吞吐超过内存预算 | 缩短实验或流式 histogram，不增成无界 |
| 全是 404 | endpoint 与代理 access log | base origin/前缀错误 | 正确路径返回 200 后再测 |
| timeout 增加 | timeout、ready、pool、waits | 排队、依赖慢或超时过紧 | 修复确认根因后按同配置复验 |
| p95 快但 500 很多 | status classes | 快速失败 | 先修正确性，不能判性能通过 |
| 计划走 Seq Scan | actual rows/buffers/table size | 小表最优或统计失真 | ANALYZE/数据规模复验，不强关 seqscan |
| SQL 快但请求慢 | trace/pool/serialize | 应用排队或正文处理 | 分段计时与单变量实验 |

## 9. 课后题

**问题 1：为什么并发 10 不等于每秒 10 个请求？**
参考答案：闭环 worker 收到响应后才继续；单次延迟决定每个 worker 的请求频率，总 RPS 会变化。

**问题 2：409 是否应该计入 5xx 错误率？**
参考答案：不应该。409 是已定义的业务冲突，应单独计数；它仍可能暴露产品问题，但不是内部 5xx。

**问题 3：看到 `Index Scan` 能否证明接口已经优化？**
参考答案：不能。还要看 actual rows、loops、buffers、整体请求分段和同前提复验；索引也可能回表
很多或不覆盖真正慢路径。

**问题 4：为什么空表 p95 没有毕业意义？**
参考答案：空表缺少排序、过滤、分页、缓存页和数据分布成本，不能代表课程要求的 10,000 行场景。

## 10. 实践练习

### 基础：建立可重复基线

记录环境，准备带唯一 `fixtureRunId` 的至少 10,000 条虚构商品，依次运行并发 1 和并发 10。
预期 preflight evidence 与报告中的 origin/database/PG18/runId/行数/时间一致，报告包含状态码、
错误类和分位数；失败时保留 JSON，不在测后修改阈值。完成标准是另一人能按记录复跑，且不能用
`DATASET_ROWS` 伪造规模。

### 进阶：比较 OFFSET 与 cursor 假设

对第一页和深页各保存一份计划，设计 `(created_at,id)` cursor 查询，比较 actual rows/buffers。
预期能说明接口语义变化，不只贴执行时间。完成标准是 React/Vue 的契约影响也被列出。

### 故障注入：制造有界 pool wait

只在隔离 `market_ops_test` 中，用测试端点持有一个短事务，并把 pool 限制在小值；运行 10 秒负载
后释放。预期 pool waiting 可观察、实验自动结束、数据回滚。失败时停止本课，不终止未知 backend。
完成标准是五段诊断区分 SQL execute 与 acquire wait。

## 11. 阶段验收

- [ ] `ops/load.mjs` 通过 Node.js 24 `--check`。
- [ ] `DATASET_ROWS`、外部域名、凭据 URL、超限并发/时长/超时均在请求前被拒绝。
- [ ] 固定 `market_load_reader_local` 直查 connected loopback `market_ops_test` 和 PG18。
- [ ] HTTP 前已原子写 reader-owned preflight；origin、真实行数、fixtureRunId、数据库 UTC 时间进入报告。
- [ ] headers 到达即统计 status；timeout、network、body read、request other 分开统计。
- [ ] 前提表含真实环境、PG 服务端版本、行数、runId、索引、预热和请求比例。
- [ ] 报告分别包含 status code/class、错误种类、p50/p95/p99 和请求率。
- [ ] 教学门槛结果来自实际运行；未运行时明确为未验证。
- [ ] 查询计划只执行隔离测试库 SELECT，未修改 planner 全局设置。
- [ ] pool waiting 与 PostgreSQL waits 分开记录。
- [ ] 结论区分事实、推断、待确认与下一步，没有用相关性夸大因果。
- [ ] 金额仍是整数分，时间仍是 UTC，预约事务与授权没有为性能绕过。

## 12. 常见问题

**能把 `MAX_SAMPLES` 调到无限吗？**
不能。原始样本占内存；更大实验应使用固定 bucket/histogram 或专业工具，同时保留边界。

**为什么脚本读取整个响应正文？**
只读响应头会漏掉流中断和序列化/传输成本。读取正文更接近用户等待完成，但仍不含浏览器渲染。
状态码在 headers 到达时已经计数；后续正文失败另记 `body_read`，不会抹掉已收到的 HTTP 状态。

**可以在生产只读副本运行 `EXPLAIN ANALYZE` 吗？**
需要独立授权和风险审查。本课默认禁止；即使 SELECT 也可能消耗大量 IO 和影响其他查询。

**p95 达标后还需要看 p99 吗？**
需要记录，但小样本 p99 波动较大。教学门槛以 p95 为主，p99 用于发现尾部并形成后续假设。

**加缓存是否一定更快？**
不一定。缓存增加失效、一致性和故障路径；预约资格仍必须由数据库事务判定。

## 13. 扩展阅读

官方资料快照：**2026-10-11**。

- [PostgreSQL 18 EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html)：估算与实际计划。
- [PostgreSQL 18 EXPLAIN 命令](https://www.postgresql.org/docs/18/sql-explain.html)：`ANALYZE` 与
  `BUFFERS` 选项。
- [PostgreSQL 18 监控](https://www.postgresql.org/docs/18/monitoring.html)：活动与等待事件。
- [Node.js Performance Hooks](https://nodejs.org/api/perf_hooks.html)：单调时钟。
- [MDN AbortSignal timeout](https://developer.mozilla.org/docs/Web/API/AbortSignal/timeout_static)：
  请求超时信号。
- [下一课：日志、指标、告警与磁盘](02-logs-metrics-alerts-disk.md)。

## 我现在能做到什么

我能在明确硬件、版本、数据和负载模型下运行有界本地测量，把结果、错误、pool 与 SQL 证据分层，
并用单变量复验约束因果结论。

## 单元导航

- 上一章：[04 CI、发布与回滚](../04-ci-release-rollback.md)
- 本章入口：[05 性能、安全与运维](../05-performance-security-operations.md)
- 下一课：[日志、指标、告警与磁盘](02-logs-metrics-alerts-disk.md)
- 分卷入口：[全栈联调与交付](../README.md)
