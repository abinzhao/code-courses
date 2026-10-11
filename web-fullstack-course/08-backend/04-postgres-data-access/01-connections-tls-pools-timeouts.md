# PostgreSQL 连接、TLS、连接池与超时

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 脱敏配置、单例连接池、数据库探针与关闭路径 |
| 练习目录 | `market-api-lab/` |
| 目标环境 | Node.js 24 LTS、课程锁定的 `pg`、PostgreSQL 18 |
| 最小证据 | 配置测试与未监听端口失败；不需要伪造成功数据库 |
| 真实证据门槛 | 同时记录客户端/服务端主版本、脱敏目标、TLS 状态和迁移状态 |
| 安全边界 | 连接串、口令、服务文件和证书私钥不得出现在代码、命令输出或日志 |
| 环境标签 | 最小案例为**静态配置 + 预期连接失败**；成功探针必须连接真实 PostgreSQL 18 |

## 1. 任务背景

“数据库连不上”可能发生在不同阶段：DNS 或端口不可达、TLS 握手失败、证书主机名不匹配、
认证失败、数据库不存在、连接池排队超时，或者连通后语句执行超时。若应用只打印完整
`DATABASE_URL` 和一个 `ECONNREFUSED`，既泄漏凭据，也没有留下足够证据。

连接池也不是“连接越多越快”。每个应用副本都拥有自己的池；6 个副本各配 30 条连接，就可能
向数据库申请 180 条。正确做法是先从数据库总预算扣除迁移、运维和应急预留，再按最大副本数
分配，并观察等待时间和查询时长。

本课建立一个进程一个池、配置失败即停止、关闭时等待池排空的基础。它不运行业务 SQL，也不
声称目标环境已经具备高可用或生产容量。

## 2. 学习目标

完成本课后，你能够：

1. 比较 URI、离散环境变量、`pg_service.conf` 和密码文件的适用边界；
2. 解释 TLS 加密、证书链验证和主机名验证分别解决什么问题；
3. 配置连接获取、空闲连接、语句和事务空闲四类超时；
4. 根据数据库连接预算、最大副本数和预留计算每进程池上限；
5. 用一个进程级 Pool 复用连接，并处理 idle client 错误；
6. 在 SIGTERM/脚本结束时等待 `pool.end()`，不强制截断在途工作；
7. 记录可诊断、已脱敏的连接失败与真实 PostgreSQL 18 成功证据。

## 3. 预备知识

先完成[第 3 章](../03-sql-modeling/01-domain-to-relational-model.md)，并在自己的练习项目中准备：

```bash
mkdir -p market-api-lab/src/db market-api-lab/scripts market-api-lab/test
cd market-api-lab
pnpm init
pnpm add pg
```

再记录实际环境：

```bash
node --version
pnpm list pg --depth 0
psql --version
```

课程推荐 Node.js 24 与 PostgreSQL 18，但上述命令必须保留本机真实输出。只有客户端版本不等于
服务端版本；没有 `psql` 也不表示 Node 驱动一定不可用。创建 `.gitignore` 时至少排除
`.env`、本地 Cookie jar、证书私钥和测试证据中的敏感原文。

练习配置使用明显占位：

```dotenv
DATABASE_URL=postgresql://APP_USER:REPLACE_ME@db.example.test:5432/market_lab
PG_POOL_MAX=5
PG_CA_FILE=/absolute/path/to/ca-certificate.pem
```

不要把这段占位值改成真实凭据后提交。

## 4. 核心理论

### 4.1 配置载体不改变最小权限

连接 URI 便于作为一个部署变量传递，但很容易在异常对象、进程列表或命令历史中整段泄漏。
离散 `PGHOST/PGPORT/PGDATABASE/PGUSER` 便于分别校验；口令仍应由受控秘密注入。

libpq 的 service file 能用服务名组合主机、端口、数据库和 TLS 参数；密码文件则保存认证信息。
二者都依赖文件权限和运行用户。`pg` 是否原生读取某种 libpq 文件必须以驱动当前文档为准，
不能因为 `psql` 支持就假设 Node 驱动自动支持。应用可由部署层解析服务配置，再把最小值传入。

配置错误应在启动阶段失败。回退到 `localhost`、空密码或生产共享账号会把部署错误变成误连。

### 4.2 TLS 不只是“有一把锁”

TLS 至少包含：

1. 加密传输，降低链路窃听；
2. 验证证书由受信任 CA 签发；
3. 验证证书标识与目标主机匹配。

`rejectUnauthorized: false` 关闭后两项，攻击者可以提供任意证书。它最多只能是隔离实验中的
故障定位开关，不能作为“修复证书问题”的提交。生产应提供正确 CA、目标主机名和服务端证书。
TLS 不替代数据库认证、SQL 参数化、对象授权或行级业务约束。

### 4.3 Pool 是并发预算，不是无限队列

Pool 按需创建连接，查询完成后复用。等待者超过 `connectionTimeoutMillis` 时失败，提示“当前
进程没有及时获得连接”；这不等同于数据库语句执行超时。

一个简化预算：

```text
每进程 max <= floor((数据库连接上限 - 运维预留 - 迁移预留) / 最大应用副本数)
```

还要为其他服务保留份额。预算只是起点；慢 SQL、长事务或 client 泄漏会让小池排队，盲目加大
池只会把压力推给数据库。

### 4.4 四类超时有不同 owner

| 超时 | 控制什么 | 典型证据 | 不能替代 |
| --- | --- | --- | --- |
| 连接获取超时 | 等待新连接/池中连接 | connect 超时、waitingCount | SQL 执行限制 |
| `statement_timeout` | 单条语句执行 | SQLSTATE `57014` | 整笔事务截止时间 |
| `lock_timeout` | 等锁时间 | SQLSTATE `55P03` | 慢查询预算 |
| `idle_in_transaction_session_timeout` | 已开启事务却无语句 | 会话被服务端终止 | 正常 COMMIT/ROLLBACK |

应用层请求截止时间还应取消后续工作并停止发布结果。数据库超时是最后边界，不应成为正常释放
连接的机制。

### 4.5 关闭过程也拥有连接

命令脚本用 `try/finally` 等待 `pool.end()`。长期服务收到 SIGTERM 后应：

1. 停止接收新请求；
2. 给在途请求一个有界完成期；
3. 停止创建新数据库工作；
4. 等待 `pool.end()`；
5. 超过总关闭预算时记录失败并由进程管理器处理。

直接 `process.exit(0)` 会截断日志、响应和连接清理，不能证明优雅关闭。

## 5. 元素、属性、API 或配置清单

| API / 配置 | 作用 | 建议证据 | 风险边界 |
| --- | --- | --- | --- |
| `new Pool(config)` | 创建进程级连接池 | 模块只构造一次 | 不在每个请求中调用 |
| `connectionString` | 组合连接目标 | 只记录脱敏目标 | 不打印原值 |
| `ssl.ca` | 提供受信 CA | 成功握手与证书配置 | 不提交私钥 |
| `ssl.rejectUnauthorized` | 是否校验证书 | 生产必须为 `true` | `false` 不是修复 |
| `max` | 每进程连接上限 | 有预算计算 | 不是越大越好 |
| `connectionTimeoutMillis` | 连接/checkout 等待上限 | 未监听端口非零退出 | 不限制 SQL |
| `idleTimeoutMillis` | 空闲 client 回收时间 | 观察池计数 | 不结束事务中连接 |
| `statement_timeout` | 服务端语句上限 | `57014` | 不替代请求预算 |
| `idle_in_transaction_session_timeout` | 事务空闲上限 | 服务端终止证据 | 不替代 finally |
| `pool.on("error")` | 捕获 idle client 错误 | 脱敏结构日志 | 不吞掉进程健康问题 |
| `pool.connect()` | 显式借 client | 必须 `release()` | 事务需要同一 client |
| `pool.query()` | 单条普通查询 | 自动借还 | 不用于分散事务 |
| `pool.end()` | 停止新 checkout 并关闭池 | Promise 完成 | 不用 `process.exit()` 代替 |

## 6. 最小可运行案例

本案例先证明配置可判定，再故意连接未监听端口。失败是预期证据，不是 PostgreSQL 成功证据。

### 6.1 配置模块

创建 `src/db/config.mjs`：

```js
import { readFile } from "node:fs/promises";

function integer(name, raw, minimum, maximum) {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer in ${minimum}..${maximum}`);
  }
  return value;
}

export async function loadDatabaseConfig(env = process.env) {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const target = new URL(env.DATABASE_URL);
  if (target.protocol !== "postgresql:" && target.protocol !== "postgres:") {
    throw new Error("DATABASE_URL must use postgresql");
  }

  const production = env.NODE_ENV === "production";
  if (production && !env.PG_CA_FILE) {
    throw new Error("PG_CA_FILE is required in production");
  }

  return {
    connectionString: env.DATABASE_URL,
    max: integer("PG_POOL_MAX", env.PG_POOL_MAX ?? "5", 1, 20),
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 10_000,
    statement_timeout: 3_000,
    idle_in_transaction_session_timeout: 5_000,
    ssl: env.PG_CA_FILE
      ? {
          ca: await readFile(env.PG_CA_FILE, "utf8"),
          rejectUnauthorized: true,
        }
      : undefined,
    safeTarget: {
      host: target.hostname,
      port: Number(target.port || 5432),
      database: target.pathname.slice(1),
      tlsConfigured: Boolean(env.PG_CA_FILE),
    },
  };
}
```

`safeTarget` 不含用户名、密码或 query 参数。生产规则应按部署架构调整，例如云平台可能通过系统
信任库提供 CA；调整后仍要验证证书，不能简单删掉门禁。

### 6.2 配置测试

创建 `test/db-config.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import { loadDatabaseConfig } from "../src/db/config.mjs";

test("rejects missing target and invalid pool size", async () => {
  await assert.rejects(loadDatabaseConfig({}), /DATABASE_URL/);
  await assert.rejects(
    loadDatabaseConfig({
      DATABASE_URL: "postgresql://USER:PASSWORD@127.0.0.1:5432/market_lab",
      PG_POOL_MAX: "200",
    }),
    /1\.\.20/,
  );
});

test("safe target excludes credentials", async () => {
  const config = await loadDatabaseConfig({
    DATABASE_URL: "postgresql://USER:PASSWORD@127.0.0.1:5432/market_lab",
    PG_POOL_MAX: "3",
  });
  assert.deepEqual(config.safeTarget, {
    host: "127.0.0.1",
    port: 5432,
    database: "market_lab",
    tlsConfigured: false,
  });
  assert.equal(JSON.stringify(config.safeTarget).includes("PASSWORD"), false);
});
```

运行：

```bash
node --test test/db-config.test.mjs
```

预期 2 条测试通过。它只验证配置逻辑，未连接数据库。

### 6.3 连接失败探针

创建 `scripts/db-connect-failure.mjs`：

```js
import pg from "pg";
import { loadDatabaseConfig } from "../src/db/config.mjs";

const config = await loadDatabaseConfig();
const pool = new pg.Pool(config);
pool.on("error", (error) => {
  console.error(JSON.stringify({
    event: "pg_idle_client_error",
    code: error.code ?? "UNKNOWN",
  }));
});

try {
  await pool.query("SELECT 1");
  console.log(JSON.stringify({ event: "unexpected_connection_success" }));
  process.exitCode = 2;
} catch (error) {
  console.error(JSON.stringify({
    event: "expected_connection_failure",
    target: config.safeTarget,
    code: error.code ?? "UNKNOWN",
  }));
} finally {
  await pool.end();
}
```

指定一个确认未监听的本地端口，值仍为占位账号：

```bash
DATABASE_URL='postgresql://USER:PASSWORD@127.0.0.1:65432/market_lab' \
  PG_POOL_MAX=1 node scripts/db-connect-failure.mjs
```

预期在约 2 秒内出现 `expected_connection_failure` 和脱敏目标，不出现 `USER`/`PASSWORD`。
若该端口意外有服务，脚本以退出码 2 标记“故障注入未成立”；换用确认未监听端口后复验。

## 7. 邻里集市集成案例

### 7.1 单例池

创建 `src/db/pool.mjs`：

```js
import pg from "pg";
import { loadDatabaseConfig } from "./config.mjs";

const config = await loadDatabaseConfig();

export const databaseTarget = Object.freeze(config.safeTarget);
export const pool = new pg.Pool(config);

pool.on("error", (error) => {
  console.error(JSON.stringify({
    event: "pg_idle_client_error",
    code: error.code ?? "UNKNOWN",
  }));
});

export async function closeDatabase() {
  await pool.end();
}
```

只在应用组合根导入该模块。测试需要隔离 Pool 时应通过工厂注入，避免多个测试共享隐藏单例。

### 7.2 真实 PostgreSQL 18 探针

创建 `scripts/db-probe.mjs`：

```js
import { pool, databaseTarget, closeDatabase } from "../src/db/pool.mjs";

try {
  const clientVersion = process.env.PSQL_CLIENT_MAJOR ?? "record-separately";
  const result = await pool.query(`
    SELECT current_database() AS database,
           current_user AS database_user,
           current_setting('server_version') AS server_version,
           current_setting('server_version_num')::integer AS server_version_num
  `);
  const row = result.rows[0];
  const migrations = await pool.query(`
    SELECT to_regclass('public.schema_migrations') IS NOT NULL AS table_exists
  `);

  console.log(JSON.stringify({
    event: "database_probe",
    target: databaseTarget,
    clientMajor: clientVersion,
    database: row.database,
    serverVersion: row.server_version,
    serverMajor: Math.floor(row.server_version_num / 10000),
    migrationTableExists: migrations.rows[0].table_exists,
  }));

  if (Math.floor(row.server_version_num / 10000) !== 18) {
    throw new Error("PostgreSQL 18 is required for this evidence run");
  }
} finally {
  await closeDatabase();
}
```

先用 `psql --version` 取得真实客户端主版本，再由安全的本地环境注入连接配置：

```bash
PSQL_CLIENT_MAJOR=18 node --env-file=.env scripts/db-probe.mjs
```

合格记录必须包含实际服务端 18.x、客户端主版本、脱敏目标、当前数据库和迁移表是否存在。若迁移
表不存在，记录 `false` 并先执行第 3 章迁移；不能把“连接成功”写成“迁移已应用”。若本机只有
非目标 PostgreSQL 主版本，保留实际输出并标记版本门禁失败，不把它改写为 18 的结果。

### 7.3 关闭钩子

长期服务由应用生命周期 owner 调用：

```js
let closing = false;

export function installShutdown(server, closeDatabase) {
  process.once("SIGTERM", async () => {
    if (closing) return;
    closing = true;
    server.close(async (httpError) => {
      try {
        await closeDatabase();
        process.exitCode = httpError ? 1 : 0;
      } catch {
        process.exitCode = 1;
      }
    });
  });
}
```

生产实现还需要总关闭期限和结构日志。这里展示所有权顺序，不声称已经验证特定编排平台。

## 8. 常见错误与排查路径

### 明确错误：关闭证书验证

```js
ssl: { rejectUnauthorized: false }
```

| 五段 | 记录 |
| --- | --- |
| 现象 | 改成 `false` 后握手“成功”，原本报证书链或主机名错误 |
| 证据 | 配置 diff 明确关闭验证，服务端身份未再校验 |
| 原因 | CA、证书链、目标主机名或系统时钟配置不正确 |
| 修复 | 安装正确 CA，使用证书覆盖的主机名，校准时钟并恢复验证 |
| 复验 | `rejectUnauthorized: true` 下探针通过，日志不含证书私钥或连接串 |

### 每个请求创建 Pool

现象是连接数随请求增长、关闭困难。搜索 `new Pool` 调用点；应用运行时应只有组合根创建。修复为
注入共享池，并在进程关闭时统一 `end()`。

### client 未释放

现象是 `waitingCount` 增长并最终 checkout 超时。证据是 `totalCount === max` 且
`idleCount === 0`。用 `try/finally { client.release(); }` 修复，再运行并发 checkout 测试，
确认等待者完成且计数恢复。不要通过把 max 从 5 改成 50 掩盖泄漏。

### 把不同超时混为一谈

连接拒绝发生在语句执行前；`57014` 表示语句被取消；`55P03` 常见于锁等待失败。先记录错误
code、发生阶段和池计数，再调整对应 owner。不能统一向用户返回“输入错误”。

### 用 `process.exit()` 结束脚本

它会让进程看似立即退出，却可能截断输出和连接清理。删除强制退出，给顶层设置
`process.exitCode`，并在 `finally` 等待 `pool.end()`。

## 9. 课后题

**问题 1：设置 `ssl: true` 是否足以证明服务端身份？**

可判定答案：不足。必须确认驱动实际验证证书链和主机名，并提供受信 CA；禁用
`rejectUnauthorized` 只能得到加密但不可可信确认对端的链路。

**问题 2：为什么 `statement_timeout` 不能解决 client 泄漏？**

可判定答案：它限制语句执行，不会替代码调用 `release()`；空闲或已完成语句后的 client 仍可被
长期占用。

**问题 3：怎样计算 Pool 上限的起点？**

可判定答案：从数据库总连接上限扣除运维、迁移及其他服务预留，再除以应用最大副本数并向下取整；
之后还要用池等待和数据库负载实测调整。

## 10. 实践练习

### 基础：配置红绿测试

增加生产环境缺 CA 的测试。判定标准：`NODE_ENV=production` 且无 `PG_CA_FILE` 时先失败；提供
临时测试 CA 文件时通过配置读取；测试输出不含文件内容和连接密码。

### 进阶：连接预算记录

为“数据库上限 100、运维预留 15、迁移预留 5、最多 8 副本”计算每副本上限。答案上限为 10，
但还需写明其他服务是否共享数据库。把计算、假设和调整指标写入 `docs/db-budget.md`。

### 故障注入：池耗尽

在隔离测试数据库中把 `max` 设为 1，借出 client 后不立即释放，再发起第二次 `connect()`。
判定标准：

1. 第二次在连接获取超时后明确失败；
2. 记录 `totalCount/idleCount/waitingCount`，不记录连接串；
3. 在 `finally` 释放第一条 client；
4. 恢复正确代码后，同一测试中第二次 checkout 成功；
5. 最终 `pool.end()` 完成。

## 11. 阶段验收

- [ ] 配置测试能拒绝缺失 URL、非法协议、越界池大小和危险生产 TLS。
- [ ] 脱敏目标不含用户名、密码、query 参数或证书内容。
- [ ] 未监听端口实验得到有界、非敏感的失败证据。
- [ ] 应用运行时只有一个明确 Pool owner。
- [ ] 能分别解释连接获取、语句、锁和事务空闲超时。
- [ ] 所有显式 client 都在 `finally` 释放。
- [ ] 命令脚本等待 `pool.end()`，没有强制成功退出。
- [ ] 真实成功声明包含客户端/服务端版本、目标和迁移状态。
- [ ] PostgreSQL 18 不可用时没有引用 16 的结果冒充。

## 12. 常见问题

**开发环境可以不启用 TLS 吗？**

只在明确隔离的本机 socket/loopback 实验中可以记录为“未启用 TLS”。远程和生产连接应使用可验证
TLS；开发例外不能自动进入生产配置。

**为什么不把完整 DATABASE_URL 打印出来方便排查？**

URI 常包含用户名、口令和额外参数。主机、端口、数据库、TLS 是否配置与错误 code 通常已足够；
必要时使用受控诊断通道，而不是普通日志。

**Pool 的 idle error 监听后可以继续假装健康吗？**

不能一概而论。监听器防止未处理事件并留下证据；应用还要结合错误类型、健康检查和连续失败决定
是否摘除实例或退出。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [node-postgres：连接](https://node-postgres.com/features/connecting)
- [node-postgres：连接池](https://node-postgres.com/features/pooling)
- [node-postgres：SSL](https://node-postgres.com/features/ssl)
- [PostgreSQL 18：libpq 连接字符串](https://www.postgresql.org/docs/18/libpq-connect.html)
- [PostgreSQL 18：密码文件](https://www.postgresql.org/docs/18/libpq-pgpass.html)
- [PostgreSQL 18：客户端连接默认值](https://www.postgresql.org/docs/18/runtime-config-client.html)
- [Node.js：进程信号事件](https://nodejs.org/api/process.html#signal-events)

## 我现在能做到什么

我能建立不泄漏凭据的 PostgreSQL 连接配置，区分 TLS、池预算和四类超时，记录真实版本与迁移
状态，并让连接失败和关闭过程都有可观察、可复验的证据。

## 单元导航

[本章目录](../README.md#04-postgresql-数据访问) ·
[下一课：参数化 SQL、类型映射与 SQLSTATE](02-parameterized-sql-types-sqlstate.md) ·
[后端卷目录](../README.md)
