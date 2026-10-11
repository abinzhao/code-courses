# 真实 HTTP 与数据库验收 Runbook：迁移、并发、状态码与停机

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 从唯一源码机械重建项目，在隔离 PostgreSQL 18 上完成真实 HTTP/数据库验收并安全停机 |
| 前置 | 已完成前三课，且第 01 课 25 个完整文件未被后课复制 |
| 建议投入 | 2.5 小时首次安装与数据库初始化，1 小时故障注入和证据整理 |
| 完整源码 owner | 本课拥有 `0` 个项目文件；只读取第 01 课 marker 并执行命令 |
| 项目目录 | `/tmp/full-course-verification/batch-e/market-api-capstone` |
| 临时数据库目录 | `/tmp/full-course-verification/batch-e/postgres-18-data` |
| 临时端口 | PostgreSQL `55432`，API `3000`；占用时停止并记录，不杀未知进程 |
| 核心证据 | manifest 25/25、冻结安装、PG 18、两库迁移、fixture、401/403/404/409、并发一胜、SIGTERM |
| 证据分类 | observed pass、observed failure/recovery、environment block、manual gap |

本 runbook 会创建和删除 `/tmp/full-course-verification/batch-e` 下的精确目标。它不修改教材树，
不提交 lockfile，不推送、不部署。若使用团队已有 PostgreSQL，只能读取和迁移明确授权的隔离
数据库；不得停止或删除不属于本次 runbook 的服务。

## 1. 任务背景

构建成功不能证明 HTTP、PostgreSQL、事务或授权工作。反过来，一条 curl 200 也不能证明测试
连的是 PostgreSQL 18、迁移没有漂移、两个并发预约只有一个赢家、错误响应没有泄露内部信息，
或进程收到 SIGTERM 后真的释放了端口。

验收要形成完整证据链：

```text
唯一源码集合
  -> 临时工作区
  -> 固定工具与 lockfile
  -> 自有 PostgreSQL 18 进程
  -> market / market_test 两库有序迁移
  -> fixture
  -> 真实 HTTP socket + 数据库断言
  -> 独立 API 进程 readiness
  -> SIGTERM + pool close + 端口释放
  -> PostgreSQL fast shutdown
  -> 精确清理
```

任一步未执行或被环境阻止，都必须停在相应证据层，不能用代码阅读或预期输出填成通过。

## 2. 学习目标

完成本课后，你能够：

1. 机械提取第 01 课 25 个唯一文件并拒绝重复/缺失/owner 漂移；
2. 在 `/tmp` 生成 lockfile，并证明 frozen 安装不改变它；
3. 区分 Node、pnpm、PostgreSQL 客户端和服务端版本；
4. 启动只监听回环地址的临时 PostgreSQL 18；
5. 分别迁移开发库和 `_test` 测试库；
6. 加载可识别、可重放、无真实个人数据的 fixture；
7. 运行真正监听随机端口的 Nest HTTP 验收；
8. 验证并发预约一个 201、一个 409，数据库只有一条记录；
9. 验证 401、403、404、409 和统一错误 DTO；
10. 发送 SIGTERM，确认应用关闭连接池并释放端口。

## 3. 预备知识

### 3.1 安全检查

从课程仓库根执行：

```bash
pwd
test -f web-fullstack-course/08-backend/10-api-capstone/01-workspace-config-migration-bootstrap.md
test -f web-fullstack-course/08-backend/10-api-capstone/02-domain-repositories-transaction-services.md
test -f web-fullstack-course/08-backend/10-api-capstone/03-session-controllers-authorization-wiring.md
test -f web-fullstack-course/08-backend/10-api-capstone/04-real-http-database-acceptance-runbook.md
```

四条 `test` 应退出 0。确认固定端口没有未知监听者：

```bash
lsof -nP -iTCP:55432 -sTCP:LISTEN
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

预期无输出。若有输出，记录 PID、command 和端口并停止本 runbook；不要 `kill -9`，不要接管
未知进程，也不要把 API 改到随机端口后忘记同步配置。

### 3.2 工具探针

```bash
node --version
pnpm --version
pg_config --bindir
"$(pg_config --bindir)/postgres" --version
psql --version
```

目标是 Node `v24.21.0`、pnpm `12.10.1`、postgres 服务端二进制主版本 18。`psql` 可以是兼容
客户端，但必须记录其主版本。若 `pg_config` 指向非 18，标记 environment block；不要用
PostgreSQL 16 的成功证明 18。

## 4. 核心理论

### 4.1 验收先证明输入集合

提取器先读 25 条 expected，再读唯一源码块，比较：

```text
expected path set == extracted path set
expected owner == block owner == 01
header path == BEGIN path == END path
BEGIN count == matched block count == END count == 25
```

只有全部成立才创建目标。若先安装再检查，残留文件和依赖可能掩盖漏文件。

### 4.2 数据库证据至少有四个维度

| 维度 | 命令/查询 | 目的 |
| --- | --- | --- |
| server binary | `postgres --version` | 启动前确认二进制主版本 |
| connected server | `server_version_num` | 防止连到别的实例 |
| connection target | `current_database()`、addr、port | 确认库和端口 |
| migration state | `schema_migrations` | 确认顺序和 checksum 登记 |

仅有任一项都不完整。连接串含凭据，证据只记录脱敏后的 host/port/database，不回显 password。

### 4.3 真实 HTTP 的最低含义

第 01 课测试调用 `app.listen(0, "127.0.0.1")`，再使用 Node fetch 访问实际分配端口。它经过
socket、Express adapter、middleware、pipe、guard、controller、service、repository 和真实
PostgreSQL，不是直接调用 controller，也不是 mock repository。

但它手工管理 Cookie header，不是浏览器 SameSite/Secure 验收；生产 HTTPS、代理和浏览器仍是
manual gap。

### 4.4 并发证据必须同时看 HTTP 和数据库

只断言 `[201, 409]` 可能遗漏“返回冲突但仍插入两行”；只看一行数据库也可能遗漏第二请求错误
映射。完整证据同时断言：

```text
both transactions BEGIN on two different pg_backend_pid values
test barrier releases only after both sessions report ready
HTTP statuses sorted == [201, 409]
reservations rows for listing == 1
winner buyer belongs to competitors
listing.status == reserved
listing.version increases exactly once for reservation
```

### 4.5 停机是有序资源释放

runbook 直接启动 `node dist/main.js` 并记录其 PID，避免只杀包管理器包装进程。SIGTERM 后：

1. `main.ts` 阻止重复 shutdown；
2. `app.close()` 停止 HTTP；
3. Nest 调用 `Db.onApplicationShutdown()`；
4. `pool.end()` 等待连接释放；
5. 记录 `shutdown_complete`；
6. 进程退出，3000 不再监听。

15 秒计时器是失败上限，不是成功目标。不能用 SIGKILL 冒充优雅停机。

## 5. 命令、接口与证据清单

| 阶段 | 命令 | 预期 | 必留失败证据 |
| --- | --- | --- | --- |
| 提取 | Python marker extractor | 25/25，owner 01 | 重复/缺失路径 |
| 安装 | `pnpm install` + frozen | lock hash 不变 | registry/版本错误 |
| PG 初始化 | `initdb` | 本地 trust、回环使用 | 二进制/权限错误 |
| PG 启动 | `pg_ctl start` | 55432 ready | 日志和退出码 |
| 迁移 | dev/test 各两次 | applied 后 already applied | checksum/权限/连接 |
| fixture | `pnpm fixture` | PostgreSQL 18 + IDs | 非 `_test` 拒绝 |
| HTTP 验收 | `pnpm test` | 一项综合测试 pass | status/code/requestId |
| 独立启动 | `node dist/main.js` | ready 200 | 启动日志 |
| 停机 | `kill -TERM` + `wait` | complete、端口释放 | 超时/遗留监听 |
| PG 停机 | `pg_ctl -m fast stop` | server stopped | postmaster log |

状态码矩阵：

| 状态 | 验收场景 |
| --- | --- |
| `400` | 非 UUID、页码 0、额外 ownerId、小数价格、空白标题 |
| `401` | 无 session、错误密码、退出后、过期后 |
| `403` | 非 owner、普通用户访问 admin、自己预约、错误 Origin/CSRF |
| `404` | 合法随机 UUID 商品不存在 |
| `409` | 旧 version、并发预约败者 |
| `503` | 锁超时/依赖不可用的受控映射，非正常 happy path 预期 |

## 6. 最小可运行案例

最小案例只提取、安装、启动 PostgreSQL 并验证 readiness；第 7 节继续业务验收。

### 6.1 机械提取唯一源码

从课程仓库根执行：

```bash
set -euo pipefail

SOURCE="$PWD/web-fullstack-course/08-backend/10-api-capstone/01-workspace-config-migration-bootstrap.md"
TARGET="/tmp/full-course-verification/batch-e/market-api-capstone"
export SOURCE TARGET

python3 - <<'PY'
from pathlib import Path, PurePosixPath
import os
import re
import shutil

source = Path(os.environ["SOURCE"]).resolve()
target = Path(os.environ["TARGET"]).resolve()
required = Path(
    "/tmp/full-course-verification/batch-e/market-api-capstone"
).resolve()
if target != required:
    raise SystemExit(f"refusing unexpected target: {target}")

text = source.read_text(encoding="utf-8")
expected_pairs = re.findall(
    r'<!-- API_CAPSTONE_EXPECT path="([^"]+)" owner="([^"]+)" -->',
    text,
)
if len(expected_pairs) != 25:
    raise SystemExit(f"expected 25 manifest entries, found {len(expected_pairs)}")
expected = dict(expected_pairs)
if len(expected) != len(expected_pairs):
    raise SystemExit("duplicate expected path")

pattern = re.compile(
    r'^\*\*完整文件：`([^`]+)`\*\*\n'
    r'<!-- API_CAPSTONE_FILE_BEGIN path="([^"]+)" owner="([^"]+)" -->\n'
    r'```[^\n]*\n(.*?)^```\n'
    r'<!-- API_CAPSTONE_FILE_END path="([^"]+)" -->',
    re.MULTILINE | re.DOTALL,
)
blocks = {}
for header, begin, owner, body, end in pattern.findall(text):
    if not (header == begin == end):
        raise SystemExit(f"marker mismatch: {header}, {begin}, {end}")
    path = PurePosixPath(header)
    if path.is_absolute() or ".." in path.parts:
        raise SystemExit(f"unsafe path: {header}")
    if header in blocks:
        raise SystemExit(f"duplicate source path: {header}")
    blocks[header] = (owner, body)

begin_count = text.count("<!-- API_CAPSTONE_FILE_BEGIN ")
end_count = text.count("<!-- API_CAPSTONE_FILE_END ")
if begin_count != 25 or end_count != 25 or len(blocks) != 25:
    raise SystemExit(
        f"marker count mismatch: begin={begin_count} end={end_count} blocks={len(blocks)}"
    )
if set(blocks) != set(expected):
    missing = sorted(set(expected) - set(blocks))
    extra = sorted(set(blocks) - set(expected))
    raise SystemExit(f"path mismatch missing={missing} extra={extra}")
for path, (owner, _) in blocks.items():
    if owner != expected[path] or owner != "01":
        raise SystemExit(
            f"owner mismatch for {path}: expected={expected[path]} actual={owner}"
        )

if target.exists():
    shutil.rmtree(target)
target.mkdir(parents=True)
for relative, (_, body) in sorted(blocks.items()):
    destination = target / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(body, encoding="utf-8")

print(f"extracted={len(blocks)} owner01={sum(o == '01' for o, _ in blocks.values())}")
PY

cd "$TARGET"
find . -type f -print | sort
```

预期最后打印 `extracted=25 owner01=25`，`find` 也恰好 25 个文件。提取器只读第 01 课，后面
三课即使讨论路径也不会参与写盘。

### 6.2 安装与冻结 lockfile

```bash
cd /tmp/full-course-verification/batch-e/market-api-capstone
test "$(node --version)" = "v24.21.0"
test "$(pnpm --version)" = "12.10.1"
pnpm install
shasum -a 256 pnpm-lock.yaml > /tmp/market-api-lock.before
pnpm install --frozen-lockfile
shasum -a 256 pnpm-lock.yaml > /tmp/market-api-lock.after
diff -u /tmp/market-api-lock.before /tmp/market-api-lock.after
pnpm build
```

预期 `diff` 无输出、build 退出 0。网络或 registry 不可用属于 environment block；已有 store
缓存成功不证明首次公网下载。

### 6.3 启动自有 PostgreSQL 18

```bash
set -euo pipefail

ROOT=/tmp/full-course-verification/batch-e
PGDATA="$ROOT/postgres-18-data"
PGBIN="$(pg_config --bindir)"
PGPORT=55432

"$PGBIN/postgres" --version | tee /tmp/market-api-postgres-binary.txt
"$PGBIN/postgres" --version | grep -E 'PostgreSQL 18([. ]|$)'
test ! -e "$PGDATA"
test -z "$(lsof -tiTCP:$PGPORT -sTCP:LISTEN || true)"

"$PGBIN/initdb" -D "$PGDATA" --username=postgres --auth=trust
"$PGBIN/pg_ctl" -D "$PGDATA" \
  -l "$ROOT/postgres-18.log" \
  -o "-h 127.0.0.1 -p $PGPORT" start
"$PGBIN/pg_isready" -h 127.0.0.1 -p "$PGPORT" -U postgres
"$PGBIN/createdb" -h 127.0.0.1 -p "$PGPORT" -U postgres market
"$PGBIN/createdb" -h 127.0.0.1 -p "$PGPORT" -U postgres market_test
```

`trust` 只用于本机临时、只监听 `127.0.0.1` 的一次性集群，不是生产认证方案。预期
`pg_isready` 报 accepting connections。失败时保存 `postgres-18.log`，不要改用旧服务冒充。

### 6.4 配置本地临时环境

在临时项目内创建 `.env` 和 `.env.test`，值只指向本 runbook 自有集群：

```bash
cd /tmp/full-course-verification/batch-e/market-api-capstone/apps/api
cp .env.example .env
cp .env.test.example .env.test
```

把两文件的 `DATABASE_URL` 分别改为以下本机临时值；这是无密码 trust 集群，不能复制到生产：

```dotenv
# .env
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/market
APP_ORIGIN=http://localhost:5173
PORT=3000
NODE_ENV=development
```

```dotenv
# .env.test
DATABASE_URL=postgresql://postgres@127.0.0.1:55432/market_test
APP_ORIGIN=http://localhost:5173
PORT=3001
NODE_ENV=test
```

### 6.5 从最小案例扩展

到此只证明工具、安装、构建和 PostgreSQL readiness。扩展到业务验收前，先记录：

```text
Node raw output:
pnpm raw output:
postgres binary raw output:
psql client raw output:
host: 127.0.0.1
port: 55432
databases: market, market_test
migration state: 尚未执行
```

不能提前把 401/403/404/409 或并发预约填写为通过。

## 7. 邻里集市集成案例

### 7.1 两库迁移与迁移状态

```bash
set -euo pipefail
TARGET=/tmp/full-course-verification/batch-e/market-api-capstone

cd "$TARGET"
pnpm migrate
pnpm migrate

cd "$TARGET/apps/api"
node --env-file=.env.test migrate.mjs
node --env-file=.env.test migrate.mjs
```

两个库都应先 `applied 1:001_init.sql`，再 `already applied 1:001_init.sql`。查询连接目标和迁移
状态，不回显连接串：

```bash
cd /tmp/full-course-verification/batch-e/market-api-capstone/apps/api
node --env-file=.env.test --input-type=module - <<'NODE'
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const target = await pool.query(`
  SELECT current_database() AS database,
         inet_server_addr()::text AS address,
         inet_server_port() AS port,
         current_setting('server_version_num')::integer AS version_num
`);
const migrations = await pool.query(`
  SELECT migration_order, name, applied_at
  FROM schema_migrations
  ORDER BY migration_order
`);
console.log(JSON.stringify({
  target: target.rows[0],
  migrations: migrations.rows
}, null, 2));
await pool.end();
NODE
```

预期 database 为 `market_test`、address `127.0.0.1`、port `55432`、version_num 的主版本为 18，
迁移只有 order 1。`applied_at` 是 PostgreSQL 返回的时间点，证据记录为 UTC ISO。

### 7.2 Fixture

```bash
cd /tmp/full-course-verification/batch-e/market-api-capstone
pnpm fixture
pnpm fixture
```

预期两次都成功，输出 `fixture_ready`、database `market_test`、serverMajor 18 和固定虚构 IDs。
第二次先清理同一 fixture 再重建，不增加重复行。

验证金额与时间：

```bash
cd apps/api
node --env-file=.env.test --input-type=module - <<'NODE'
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const result = await pool.query(`
  SELECT id, title, price_cents, created_at, version
  FROM listings
  WHERE id='20000000-0000-4000-8000-000000000001'
`);
console.log(JSON.stringify(result.rows[0], null, 2));
await pool.end();
NODE
```

预期 `price_cents: 19900`、version 1，序列化时间为 `2026-10-11T00:00:00.000Z`。

### 7.3 真实 HTTP / PostgreSQL 综合测试

```bash
cd /tmp/full-course-verification/batch-e/market-api-capstone
pnpm test
```

测试会重新 build，在 `127.0.0.1` 随机端口启动真实 Nest HTTP，然后访问 PostgreSQL 18。预约
竞争前，测试在两个事务都完成 `BEGIN` 并取得不同 `pg_backend_pid()` 后才释放 barrier；只用
`Promise.all` 发两个请求不能证明事务重叠。预期 Node test runner 报一项综合测试通过。单项测试
内部必须实际执行：

1. 三个随机 `.test` 账号注册/登录；
2. 401：无 session、错误密码、退出后、过期后；
3. 403：非 owner、普通用户 admin、自己预约、坏 Origin、坏 CSRF；
4. 404：合法随机 UUID 不存在；
5. 409：旧 version；
6. 收藏 PUT/DELETE 各重复两次并直接查表；
7. 事务故障注入后零 reservation、Listing 不变；
8. 两个事务在不同 backend PID 到达 barrier 后竞争预约，一个 201、一个 409；
9. 数据库只有一个 reservation，Listing reserved/version 3；
10. finally 关闭 app、删除本测试创建的行并结束 pool。

测试输出 `postgres_evidence` 与 `concurrency_ready`；后者只含两个临时 backend PID，不含
URL 或密码。一个 test case 内有多项断言，不能汇报成几十个独立测试。

### 7.4 独立进程、readiness 与停机

```bash
set -euo pipefail

API_DIR=/tmp/full-course-verification/batch-e/market-api-capstone/apps/api
API_LOG=/tmp/market-api-process.log
cd "$API_DIR"

node --env-file=.env dist/main.js >"$API_LOG" 2>&1 &
API_PID=$!
printf '%s\n' "$API_PID" >/tmp/market-api.pid

for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl --fail --silent \
    http://127.0.0.1:3000/api/v1/health/ready >/tmp/market-api-ready.json; then
    break
  fi
  sleep 0.5
done

curl --fail --silent \
  http://127.0.0.1:3000/api/v1/health/ready
kill -TERM "$API_PID"
wait "$API_PID"

grep '"event":"listening"' "$API_LOG"
grep '"event":"shutdown_start","signal":"SIGTERM"' "$API_LOG"
grep '"event":"shutdown_complete"' "$API_LOG"
test -z "$(lsof -tiTCP:3000 -sTCP:LISTEN || true)"
if curl --silent --max-time 1 \
  http://127.0.0.1:3000/api/v1/health/live >/dev/null; then
  echo "API still accepts requests after shutdown" >&2
  exit 1
fi
```

预期 readiness 为 `{"ok":true}`，`wait` 退出 0，日志按 listening、shutdown_start、
shutdown_complete 出现，端口 3000 无监听，最后 curl 连接失败。失败时保存 PID、日志、端口和
退出码；不要用 SIGKILL 后声称优雅关闭。

### 7.5 停止 PostgreSQL 并清理

先确认 API 已停止，再停止本 runbook 创建的数据库：

```bash
set -euo pipefail

ROOT=/tmp/full-course-verification/batch-e
TARGET="$ROOT/market-api-capstone"
PGDATA="$ROOT/postgres-18-data"
PGBIN="$(pg_config --bindir)"

test -f "$PGDATA/PG_VERSION"
test "$(sed -n '1p' "$PGDATA/PG_VERSION")" = "18"
"$PGBIN/pg_ctl" -D "$PGDATA" -m fast stop
test -z "$(lsof -tiTCP:55432 -sTCP:LISTEN || true)"

test "$TARGET" = "/tmp/full-course-verification/batch-e/market-api-capstone"
test "$PGDATA" = "/tmp/full-course-verification/batch-e/postgres-18-data"
rm -rf "$TARGET" "$PGDATA"
rm -f /tmp/market-api-lock.before /tmp/market-api-lock.after
rm -f /tmp/market-api-postgres-binary.txt /tmp/market-api-cookie.txt
rm -f /tmp/market-api-ready.json /tmp/market-api-process.log /tmp/market-api.pid
rmdir "$ROOT" 2>/dev/null || true
rmdir /tmp/full-course-verification 2>/dev/null || true
```

`fast` 会回滚仍打开的事务并正常关闭，不等于断电。不要删除团队数据库目录、全局 pnpm store
或其他项目缓存。

## 8. 常见错误与排查路径

### 明确错误示例：客户端 18，实际服务端 16

错误判断：

```text
psql (PostgreSQL) 18.x
所以当前数据库已满足 PostgreSQL 18。
```

| 五段诊断 | 本例记录 |
| --- | --- |
| 现象 | 客户端版本看似正确，但验收测试拒绝 serverMajor |
| 证据 | `SHOW server_version_num` 或测试日志实际为 `1600xx` |
| 原因 | `psql` 连接到了另一端口上的 PostgreSQL 16 |
| 修复 | 核对 address/port/database，启动并连接自有 18 集群 |
| 复验 | binary、connected server、target 和 migration state 四类证据都指向 18/55432 |

### 其他错误

| 现象 | 证据 | 原因 | 修复与复验 |
| --- | --- | --- | --- |
| 提取少于 25 | marker count | 源码块损坏/遗漏 | 修复教材结构后重新提取 |
| frozen 安装改 lock | hash diff | 清单或 lock 漂移 | 回到首次安装输入，禁止删锁逃避 |
| 测试 relation 不存在 | current_database + registry | test 库未迁移 | 对 `.env.test` 单独迁移 |
| fixture 拒绝 | database name | 误指向开发库 | 改隔离 `_test`，不放宽 guard |
| 两个预约都 201 | statuses + DB rows | 锁/索引/同 client 破坏 | 回到第 02 课定位 |
| 错误 body 有 stack | response JSON | filter 透传异常 | 恢复统一 filter，轮换泄漏秘密 |
| SIGTERM 后仍监听 | PID/log/lsof | 包装进程或 pool 未关闭 | 直接启动 Node，检查 app.close |
| PG 无法停止 | postmaster log | API 或 shell 留连接 | 先停止 API，查活动连接再 fast stop |

## 9. 课后题

**问题 1：为什么 runbook 自建 PostgreSQL 18，而不是默认使用本机 5432？**

参考答案：自有数据目录、端口和 PID 能明确归属、版本与清理边界；未知 5432 可能是其他项目、
其他版本或生产代理。

**问题 2：为什么综合测试监听随机 HTTP 端口，独立停机又使用 3000？**

参考答案：测试随机端口避免并行冲突并验证真实 socket；停机 runbook 需要已知端口观察外部进程
的 readiness 和释放，两者证据不同。

**问题 3：为什么 fixture 成功后仍要测试创建随机账号？**

参考答案：fixture 是可人工检查的稳定基线；测试数据独立创建/清理，避免依赖固定状态和相互
污染。

**问题 4：为什么测试通过仍不能声称浏览器 Cookie 已验收？**

参考答案：Node fetch 手工设置 Cookie，不执行浏览器 SameSite、Secure、代理和 HTTPS 策略。

**问题 5：为什么停止 PostgreSQL 前先验证 `PG_VERSION`？**

参考答案：确认将要停止/删除的是本 runbook 的 18 数据目录，降低路径变量错误造成破坏的风险。

## 10. 实践练习

### 基础：证据账本

为每条 runbook 命令记录 JSON Lines：

```json
{"command":"pnpm test","category":"observed-pass","exitCode":0,"observedAtUtc":"2026-10-11T00:00:00.000Z","summary":"真实值由本轮填写"}
```

参考答案与判定：字段包含 command/category/exitCode/observedAtUtc/summary；failure 与 recovery
分两行；不保存 token、Cookie、数据库 URL、真实邮箱或完整请求 body。

### 进阶：20 个并发买家

在测试的隔离数据中创建 20 个 buyer，并发请求同一商品。

参考答案与判定：一个 201、十九个 409、数据库一条有效预约、Listing version 只因预约增加一次；
所有测试账号按 ID 清理。若出现 503，单独记录锁超时，不篡改为 409。

### 故障注入：停机时保留长事务

在测试专用连接开启事务并持有行锁，发送 SIGTERM，观察 15 秒上限；随后回滚/关闭连接并重新
运行正常停机。

参考答案与判定：故障轮保留日志和非零/超时证据，恢复轮出现 shutdown_complete 且端口释放。
不得缩短测试到 `kill -9`，也不得对未知生产实例做此实验。

## 11. 阶段验收

### 11.1 自动证据

- [ ] 提取结果为 25/25，所有 owner 为 01，无重复、缺失或 marker 残留。
- [ ] Node/pnpm 与固定 manifest 一致，frozen 安装不改 lockfile hash。
- [ ] PostgreSQL binary 与连接后的 server major 都是 18。
- [ ] connection target 是回环 `55432` 和明确的 `market`/`market_test`。
- [ ] 两库迁移第一次 applied、第二次 already applied，registry 顺序/checksum 稳定。
- [ ] fixture 可重放，金额 19900，时间是 UTC ISO 对应时间点。
- [ ] `pnpm test` 实际通过真实 HTTP/数据库综合测试。
- [ ] 400/401/403/404/409 的场景均由断言覆盖。
- [ ] 并发预约一个 201、一个 409，数据库一行，Listing 状态/version 正确。
- [ ] 回滚故障后无 reservation，Listing 未改变。
- [ ] 独立 API readiness 200，SIGTERM 后 shutdown_complete、端口释放。
- [ ] 自有 PostgreSQL 正常停止，临时目录和 PID/log 受控清理。

### 11.2 证据分类

| 分类 | 何时使用 | 本章例子 |
| --- | --- | --- |
| observed pass | 本轮命令真实退出 0，范围明确 | `pnpm test`、PG18 查询 |
| observed failure/recovery | 注入后非零，恢复后同命令为 0 | checksum、事务、停机实验 |
| environment block | 应自动运行但工具/权限/网络阻止 | 无 PG18 binary、registry 不可达 |
| manual gap | 本章设计不包含 | HTTPS 浏览器、生产代理、真实备份恢复 |

### 11.3 仍不得声称通过

- 真实支付、邮件、上传和对象存储；
- Redis、BullMQ 与 outbox 生产运行；
- 浏览器 Secure/SameSite、CORS 代理和生产 TLS；
- 生产限频、WAF、密钥管理和审计平台；
- 托管 CI、多实例滚动发布、真实容量和灾难恢复；
- Review 的交易完成与评价流程。

若环境没有运行 PostgreSQL 18，最终证据应写：

```text
文档结构：已检查
机械提取/静态构建：按实际结果填写
PostgreSQL 18 migration/fixture/HTTP/concurrency/shutdown：environment block
原始阻塞：粘贴脱敏后的命令、退出码和错误
```

## 12. 常见问题

**可以保留临时项目给审查者吗？**

执行过程中可以。交付前应按任务约定清理；需要长期保留时保存脱敏证据摘要，不提交
`node_modules`、lockfile、`.env`、PGDATA、Cookie 或日志。

**为什么 runbook 不自动安装 PostgreSQL 18？**

系统包管理器和管理员权限有平台副作用。本课只使用已经可用的 18 二进制；缺失时记录环境阻塞，
不擅自升级全局数据库。

**能把端口改为任意可用值吗？**

可以在个人扩展中统一修改环境和证据模板。本 runbook 固定端口是为了让占用检查、目标证明和
清理可判定；遇到占用先停止，不杀未知服务。

**为什么没有真实备份恢复？**

本章验收 API 正确性。备份格式、恢复时间、权限和生产容量属于全栈交付卷，不能用一次
`pg_dump` 文件存在冒充恢复成功。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [PostgreSQL 18 `initdb`](https://www.postgresql.org/docs/18/app-initdb.html)
- [PostgreSQL 18 `pg_ctl`](https://www.postgresql.org/docs/18/app-pg-ctl.html)
- [PostgreSQL 18 Server Version](https://www.postgresql.org/docs/18/functions-info.html)
- [PostgreSQL 18 Monitoring Activity](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [Node.js Test Runner](https://nodejs.org/api/test.html)
- [Node.js Process Signals](https://nodejs.org/api/process.html#signal-events)
- [NestJS Lifecycle Events](https://docs.nestjs.com/fundamentals/lifecycle-events)
- [node-postgres Pool Shutdown](https://node-postgres.com/features/pooling)
- [curl Exit Codes](https://curl.se/docs/manpage.html)

## 我现在能做到什么

我能从唯一教材源码在 `/tmp` 重建 API，证明固定依赖、PostgreSQL 18 连接目标、迁移、fixture、
真实 HTTP、对象授权、版本冲突和并发预约，并用 SIGTERM 验证 HTTP 与连接池有序关闭；任何工具
或基础设施缺失时，我会保留原始阻塞，而不是把配置、静态构建或历史结果冒充本轮通过。

## 单元导航

[返回第 10 章入口](../10-api-capstone.md) ·
[上一课：Session、Controller 与授权接线](03-session-controllers-authorization-wiring.md) ·
[返回后端卷目录](../README.md) ·
[进入全栈交付卷](../../09-fullstack/README.md)
