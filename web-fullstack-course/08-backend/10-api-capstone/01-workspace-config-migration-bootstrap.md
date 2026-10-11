# 工作区、配置与迁移启动：冻结唯一可提取源码

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 在临时目录重建邻里集市 API，固定版本、配置、迁移顺序和全部项目源码 |
| 前置 | 已完成后端前九章，并阅读[版本基线](../../00-guide/02-version-baseline.md)与[统一项目契约](../../00-guide/05-project-assessment.md) |
| 建议投入 | 4 小时录入与审查，1 小时结构和配置故障实验 |
| 唯一完整源码 owner | **本课独占全部 25 个项目文件**；第 02、03、04 课只能引用路径或展示必要片段 |
| 临时工作区 | `/tmp/full-course-verification/batch-e/market-api-capstone` |
| 数据边界 | 金额为非负整数分；对外时间为 UTC ISO 8601；测试数据使用 `.test` 保留域 |
| 成功证据 | 25 个文件一一提取；配置错误在监听前失败；迁移按 manifest 执行且 checksum 不漂移 |
| 失败证据 | 重复路径、缺失文件、占位配置、迁移改写、非 `_test` 测试库或非 PostgreSQL 18 均明确失败 |

本课使用严格的四件套声明完整文件：

```text
完整文件 header（relative/path）
API_CAPSTONE_FILE_BEGIN(path, owner=01)
一个 fenced code block
API_CAPSTONE_FILE_END(path)
```

只有带成对 marker 的代码块才是可落盘完整源码。第 02 至 04 课的代码块都不是项目文件，
不得覆盖本课内容。这样可在解释领域、事务、安全和验收时保留必要片段，又不会产生第二份源码。

## 1. 任务背景

综合项目最危险的不是少一个控制器，而是复现条件不确定：依赖写 `latest`、`.env` 缺少校验、
迁移靠人工挑文件、测试误连开发库、教程四处复制同一个文件。某台机器偶然启动，不等于另一台
机器能重建，更不等于 PostgreSQL 18、HTTP、权限和并发已经被验证。

本课先冻结输入，再谈运行：

```text
教材中的 25 个唯一文件
  -> /tmp 临时工作区
  -> 固定 Node/pnpm/直接依赖
  -> 启动前配置校验
  -> 有序迁移 manifest + checksum
  -> build
  -> fixture
  -> 真实 HTTP / PostgreSQL 验收
```

项目实现发布、查询、编辑、收藏、预约、注册、登录、退出和管理员统计。`reviews` 表只保留领域
模型与约束，本章不提供交易完成和评价入口。真实支付、邮件、上传不在范围内；Redis 不是核心
依赖，只能按第 8 章作为可选扩展。

## 2. 学习目标

完成本课后，你能够：

1. 用 expected manifest 检查完整文件集合，而不是凭目录猜测；
2. 固定 Node.js 24、pnpm 12.10.1、NestJS 12.1.1 和直接依赖精确版本；
3. 区分教材源码、首次生成的 lockfile、依赖目录和构建产物；
4. 在监听端口和连接业务数据库前校验 `DATABASE_URL`、`APP_ORIGIN`、`PORT` 与环境；
5. 强制测试只连接 `_test` 数据库，并核对 PostgreSQL 服务端主版本 18；
6. 用有序迁移 manifest、事务、咨询锁和 checksum 防止迁移竞争与历史改写；
7. 解释整数分、UTC、参数化 SQL、对象授权和错误契约怎样贯穿项目；
8. 从同一份完整源码运行 fixture、HTTP 验收、并发预约和优雅停机；
9. 区分“代码围栏存在”“构建通过”和“真实基础设施已运行”三类证据；
10. 在验证结束后停止进程并清理精确临时目录。

## 3. 预备知识

先确认本机工具，但不要在教材目录安装依赖：

```bash
node --version
pnpm --version
psql --version
pg_isready --version
```

目标 Node 是受支持的 24 LTS，包管理器为 `12.10.1`。`psql` 客户端版本不能证明服务器版本；
真正的服务端版本必须在连接目标数据库后执行 `SHOW server_version_num`。若 PostgreSQL 18 未
运行，保留 `pg_isready`、连接命令和原始错误，只继续做文档与可静态执行检查，不写“验收通过”。

建议依次复习：

- [PostgreSQL 数据访问](../04-postgres-data-access.md)；
- [SQL 建模](../03-sql-modeling.md)；
- [认证、Session 与授权](../06-auth-sessions-rbac.md)；
- [测试、OpenAPI 与可观测性](../09-testing-openapi-observability.md)。

## 4. 核心理论

### 4.1 固定 manifest 是复现输入，不是运行结果

根 `package.json` 固定包管理器，API 清单固定所有直接依赖。首次在 `/tmp` 运行
`pnpm install` 会生成 `pnpm-lock.yaml`；随后用 `--frozen-lockfile` 证明同一依赖图可再次安装。
教材不手写锁文件，也不把全局缓存命中冒充首次公网安装证据。

版本选择遵循 2026-10-11 快照：

| 组件 | 精确声明 | 责任 |
| --- | --- | --- |
| Node.js | `24.21.0` | ESM、fetch、test runner、生命周期 |
| pnpm | `12.10.1` | workspace、lockfile、脚本 |
| NestJS | `12.1.1` | 模块、控制器、guard、filter |
| TypeScript | `6.0.3` | 本项目兼容编译线，不称为最新 |
| `pg` | `8.16.3` | PostgreSQL 连接池和参数化 SQL |
| PostgreSQL | 服务端主版本 `18` | 约束、事务、锁、部分唯一索引 |

TypeScript 7 是全书语言主线。本项目固定 TS 6.0.3，是为了保留传统装饰器元数据和生态兼容
实验；这不允许把 TS 6 写成“最新版本”。若另做 TS 7 对照构建，必须作为第二条真实证据记录。

### 4.2 配置要在副作用前失败

配置校验必须早于 `listen()` 和业务查询。`APP_ORIGIN` 是精确源，不含路径；生产环境必须
HTTPS。`DATABASE_URL` 只接受 PostgreSQL 协议。日志绝不输出连接串、密码、Cookie、CSRF
token 或请求正文。

测试增加第二道保护：

```text
DATABASE_URL pathname 以 _test 结尾
AND current_database() 仍以 _test 结尾
AND server_version_num 对应主版本 18
```

环境变量文本和连接后的事实都要检查，避免代理、service file 或错误变量把测试导向别的库。

### 4.3 迁移有顺序、有身份、有历史

迁移执行器的 manifest 是唯一顺序源。每个文件在一个事务内执行，事务级咨询锁阻止两个发布
进程并发初始化；`schema_migrations` 保存文件名、顺序和 SHA-256。已应用 SQL 不能改写，只能
新增后续迁移。

生产中应分离身份：

- migration identity：在受控交付阶段拥有 DDL 权限；
- runtime identity：应用运行时只有所需 DML 权限；
- owner/superuser：不交给 API。

本地学习环境可用同一账号完成练习，但必须知道这不是生产权限设计。

### 4.4 完整源码只有一个 owner

本课 expected manifest 列出 25 个路径，owner 都是 `01`。后续课程解释代码时只引用，例如：

```text
apps/api/src/service.ts: MarketService.reserve
apps/api/src/auth.ts: SessionGuard
apps/api/test/api.test.mjs: concurrent reservation assertion
```

若后课再次出现“完整文件”header 或 `API_CAPSTONE_FILE_BEGIN`，结构检查应在安装前失败。教材
不能靠“后出现的版本覆盖前一个”解决漂移。

### 4.5 证据必须按层命名

| 证据 | 能说明什么 | 不能说明什么 |
| --- | --- | --- |
| JSON/TS/SQL 静态检查 | 文本结构、语法和部分类型成立 | 数据库或 HTTP 已工作 |
| `pnpm build` | 当前依赖下可发射 JavaScript | 迁移、权限、并发成立 |
| migration + fixture | 目标 PostgreSQL 接受 schema 和数据 | 所有 HTTP 路径成立 |
| HTTP 验收测试 | 真实 socket、Nest、session、SQL 共同工作 | 浏览器 Cookie 策略、生产 TLS 成立 |
| SIGTERM runbook | 当前进程停止并释放端口 | 所有生产流量均已排空 |

## 5. 接口、配置与文件清单

### 5.1 精确文件树

| 路径 | 角色 |
| --- | --- |
| `.node-version` | Node 版本提示 |
| `package.json` | 根 workspace 与累计脚本 |
| `pnpm-workspace.yaml` | 成员声明 |
| `.gitignore` | 机密与生成物边界 |
| `packages/contracts/package.json` | 类型包清单 |
| `packages/contracts/index.ts` | 公共 DTO 类型 |
| `apps/api/package.json` | API 固定依赖与脚本 |
| `apps/api/tsconfig.json` | NodeNext 与装饰器编译 |
| `apps/api/.env.example` | 开发配置占位模板 |
| `apps/api/.env.test.example` | 隔离测试配置模板 |
| `apps/api/migrate.mjs` | 有序迁移执行器 |
| `apps/api/migrations/001_init.sql` | 初始 schema |
| `apps/api/src/config.ts` | 启动配置校验 |
| `apps/api/src/db.ts` | 连接池与关闭 |
| `apps/api/src/errors.ts` | 错误 DTO 与脱敏日志 |
| `apps/api/src/dto.ts` | 输入转换和验证 |
| `apps/api/src/repo.ts` | 仓储与 client 传递 |
| `apps/api/src/service.ts` | 对象授权和事务服务 |
| `apps/api/src/auth.ts` | 密码、session、CSRF |
| `apps/api/src/controller.ts` | HTTP 路由与 RBAC |
| `apps/api/src/app.ts` | Nest 模块 |
| `apps/api/src/bootstrap.ts` | 中间件、pipe、filter |
| `apps/api/src/main.ts` | 监听、超时、停机 |
| `apps/api/test/fixture.mjs` | PostgreSQL 18 测试夹具 |
| `apps/api/test/api.test.mjs` | 真实 HTTP/数据库验收 |

以下机器标记是第 04 课提取器的独立 expected：

<!-- API_CAPSTONE_EXPECT path=".node-version" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="package.json" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="pnpm-workspace.yaml" owner="01" -->
<!-- API_CAPSTONE_EXPECT path=".gitignore" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="packages/contracts/package.json" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="packages/contracts/index.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/package.json" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/tsconfig.json" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/.env.example" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/.env.test.example" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/migrate.mjs" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/migrations/001_init.sql" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/src/config.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/src/db.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/src/errors.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/src/dto.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/src/repo.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/src/service.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/src/auth.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/src/controller.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/src/app.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/src/bootstrap.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/src/main.ts" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/test/fixture.mjs" owner="01" -->
<!-- API_CAPSTONE_EXPECT path="apps/api/test/api.test.mjs" owner="01" -->

### 5.2 HTTP 与错误契约

API 前缀固定 `/api/v1`。成功路径和边界沿用统一项目契约：

| 方法与路径 | 成功 | 关键失败 |
| --- | --- | --- |
| `GET /listings` | `200` 分页 | `400` 参数非法 |
| `GET /listings/:id` | `200` | `400` 非 UUID，`404` 不存在 |
| `POST /listings` | `201` | `401` 未登录，`403` CSRF，`400` DTO |
| `PATCH /listings/:id` | `200` | `403` 非 owner，`409` 旧 version |
| `PUT/DELETE /favorites/:id` | `200` 幂等目标状态 | `401/403/404` |
| `POST /listings/:id/reservations` | `201` | `403` 自己商品，`409` 已预约 |
| `POST /auth/register` | `202` 通用受理响应 | `400` DTO，`403` Origin；重复邮箱不公开 |
| `POST /auth/login` | `200` + Cookie | `401` 通用凭据错误 |
| `GET /auth/me` | `200` | `401` 会话缺失或过期 |
| `POST /auth/logout` | `200` | `401/403` |
| `GET /admin/stats` | `200` | `401` 未登录，`403` 非管理员 |

错误 JSON 固定为：

```json
{
  "code": "VERSION_CONFLICT",
  "message": "商品已变化，请重新读取",
  "requestId": "由服务端生成的 UUID"
}
```

## 6. 最小可运行案例

最小案例先建立 workspace、清单、环境模板与迁移。完整业务源码继续在第 7 节，仍由本课唯一
拥有。所有内容应由第 04 课机械提取，不在教材树手工建立工程。

**完整文件：`.node-version`**
<!-- API_CAPSTONE_FILE_BEGIN path=".node-version" owner="01" -->
```text
24.21.0
```
<!-- API_CAPSTONE_FILE_END path=".node-version" -->

**完整文件：`package.json`**
<!-- API_CAPSTONE_FILE_BEGIN path="package.json" owner="01" -->
```json
{
  "name": "market-api-capstone",
  "private": true,
  "packageManager": "pnpm@12.10.1",
  "scripts": {
    "build": "pnpm --filter @market/api build",
    "migrate": "pnpm --filter @market/api migrate",
    "fixture": "pnpm --filter @market/api fixture",
    "test": "pnpm run build && pnpm --filter @market/api test",
    "start": "pnpm --filter @market/api start"
  }
}
```
<!-- API_CAPSTONE_FILE_END path="package.json" -->

**完整文件：`pnpm-workspace.yaml`**
<!-- API_CAPSTONE_FILE_BEGIN path="pnpm-workspace.yaml" owner="01" -->
```yaml
packages:
  - apps/*
  - packages/*
```
<!-- API_CAPSTONE_FILE_END path="pnpm-workspace.yaml" -->

**完整文件：`.gitignore`**
<!-- API_CAPSTONE_FILE_BEGIN path=".gitignore" owner="01" -->
```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
!.env.test.example
*.log
coverage/
```
<!-- API_CAPSTONE_FILE_END path=".gitignore" -->

**完整文件：`packages/contracts/package.json`**
<!-- API_CAPSTONE_FILE_BEGIN path="packages/contracts/package.json" owner="01" -->
```json
{
  "name": "@market/contracts",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "types": "index.ts"
}
```
<!-- API_CAPSTONE_FILE_END path="packages/contracts/package.json" -->

**完整文件：`packages/contracts/index.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="packages/contracts/index.ts" owner="01" -->
```ts
export type ListingStatus = "available" | "reserved" | "sold";

export interface Listing {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: ListingStatus;
  ownerId: string;
  version: number;
  createdAt: string;
}

export interface ListingPage {
  items: Listing[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PublicUser {
  id: string;
  email: string;
  role: "user" | "admin";
}

export interface Reservation {
  id: string;
  listingId: string;
  buyerId: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}

export interface ApiError {
  code: string;
  message: string;
  requestId: string;
}
```
<!-- API_CAPSTONE_FILE_END path="packages/contracts/index.ts" -->

**完整文件：`apps/api/package.json`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/package.json" owner="01" -->
```json
{
  "name": "@market/api",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node --env-file=.env dist/main.js",
    "migrate": "node --env-file=.env migrate.mjs",
    "fixture": "node --env-file=.env.test test/fixture.mjs",
    "test": "node --env-file=.env.test --test test/api.test.mjs"
  },
  "dependencies": {
    "@market/contracts": "workspace:*",
    "@nestjs/common": "12.1.1",
    "@nestjs/core": "12.1.1",
    "@nestjs/platform-express": "12.1.1",
    "class-transformer": "0.5.1",
    "class-validator": "0.14.2",
    "pg": "8.16.3",
    "reflect-metadata": "0.2.2",
    "rxjs": "7.8.2"
  },
  "devDependencies": {
    "@types/express": "5.0.3",
    "@types/node": "24.0.0",
    "@types/pg": "8.15.5",
    "typescript": "6.0.3"
  }
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/package.json" -->

**完整文件：`apps/api/tsconfig.json`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/tsconfig.json" owner="01" -->
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "types": ["node"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/tsconfig.json" -->

**完整文件：`apps/api/.env.example`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/.env.example" owner="01" -->
```dotenv
DATABASE_URL=postgresql://APP_USER:REPLACE_LOCAL_PASSWORD@127.0.0.1:5432/market
APP_ORIGIN=http://localhost:5173
PORT=3000
NODE_ENV=development
```
<!-- API_CAPSTONE_FILE_END path="apps/api/.env.example" -->

**完整文件：`apps/api/.env.test.example`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/.env.test.example" owner="01" -->
```dotenv
DATABASE_URL=postgresql://APP_USER:REPLACE_LOCAL_PASSWORD@127.0.0.1:5432/market_test
APP_ORIGIN=http://localhost:5173
PORT=3001
NODE_ENV=test
```
<!-- API_CAPSTONE_FILE_END path="apps/api/.env.test.example" -->

**完整文件：`apps/api/migrate.mjs`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/migrate.mjs" owner="01" -->
```js
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}
const parsed = new URL(connectionString);
if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
  throw new Error("DATABASE_URL must use PostgreSQL");
}

const manifest = [{ order: 1, name: "001_init.sql" }];
const pool = new pg.Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 3000,
  statement_timeout: 10000
});
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(81010)");
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      migration_order integer NOT NULL UNIQUE,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  for (const migration of manifest) {
    const sql = await readFile(
      new URL(`./migrations/${migration.name}`, import.meta.url),
      "utf8"
    );
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previous = await client.query(
      "SELECT migration_order, checksum FROM schema_migrations WHERE name=$1",
      [migration.name]
    );

    if (previous.rowCount === 0) {
      await client.query(sql);
      await client.query(
        `INSERT INTO schema_migrations(name,migration_order,checksum)
         VALUES ($1,$2,$3)`,
        [migration.name, migration.order, checksum]
      );
      console.log(`applied ${migration.order}:${migration.name}`);
      continue;
    }

    const row = previous.rows[0];
    if (row.migration_order !== migration.order || row.checksum !== checksum) {
      throw new Error(
        `Applied migration changed: ${migration.name}; add a new migration`
      );
    }
    console.log(`already applied ${migration.order}:${migration.name}`);
  }

  const registered = await client.query(
    "SELECT name FROM schema_migrations ORDER BY migration_order"
  );
  const expected = manifest.map((item) => item.name);
  const actual = registered.rows.map((row) => row.name);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Migration registry differs from manifest: ${actual.join(",")}`
    );
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/migrate.mjs" -->

**完整文件：`apps/api/migrations/001_init.sql`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/migrations/001_init.sql" owner="01" -->
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL CHECK (email = lower(email)),
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE listings (
  id uuid PRIMARY KEY,
  title text NOT NULL
    CHECK (char_length(title) BETWEEN 1 AND 100 AND title ~ '\S'),
  description text NOT NULL CHECK (char_length(description) <= 2000),
  price_cents integer NOT NULL
    CHECK (price_cents BETWEEN 0 AND 100000000),
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'reserved', 'sold')),
  owner_id uuid NOT NULL REFERENCES users(id),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, listing_id)
);

CREATE TABLE reservations (
  id uuid PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES listings(id),
  buyer_id uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX reservations_one_active_per_listing_idx
  ON reservations(listing_id)
  WHERE status IN ('pending', 'confirmed');

CREATE TABLE reviews (
  id uuid PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES reservations(id),
  author_id uuid NOT NULL REFERENCES users(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body text NOT NULL CHECK (char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reservation_id, author_id)
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token text NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE INDEX listings_recent ON listings(created_at DESC, id DESC);
CREATE INDEX listings_owner ON listings(owner_id, created_at DESC);
```
<!-- API_CAPSTONE_FILE_END path="apps/api/migrations/001_init.sql" -->

**完整文件：`apps/api/src/config.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/src/config.ts" owner="01" -->
```ts
export type NodeEnvironment = "development" | "test" | "production";

export interface AppConfig {
  databaseUrl: string;
  appOrigin: string;
  port: number;
  nodeEnv: NodeEnvironment;
}

function required(
  env: NodeJS.ProcessEnv,
  name: "DATABASE_URL" | "APP_ORIGIN"
): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = required(env, "DATABASE_URL");
  const database = new URL(databaseUrl);
  if (!["postgres:", "postgresql:"].includes(database.protocol)) {
    throw new Error("DATABASE_URL must use PostgreSQL");
  }

  const appOrigin = required(env, "APP_ORIGIN");
  const origin = new URL(appOrigin);
  if (origin.origin !== appOrigin || origin.username || origin.password) {
    throw new Error("APP_ORIGIN must be an exact origin");
  }

  const nodeEnv = env.NODE_ENV ?? "development";
  if (!["development", "test", "production"].includes(nodeEnv)) {
    throw new Error("NODE_ENV must be development, test, or production");
  }
  if (nodeEnv === "production" && origin.protocol !== "https:") {
    throw new Error("Production APP_ORIGIN must use HTTPS");
  }

  const port = Number(env.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer from 1 to 65535");
  }

  return Object.freeze({
    databaseUrl,
    appOrigin,
    port,
    nodeEnv: nodeEnv as NodeEnvironment
  });
}

export function assertTestDatabase(databaseUrl: string): void {
  const name = new URL(databaseUrl).pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error("Refusing test operation: database name must end with _test");
  }
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/src/config.ts" -->

### 6.1 最小案例的扩展路径

到这里可以先做三个不依赖 HTTP 的检查：

```bash
pnpm install
pnpm --filter @market/api build
pnpm --filter @market/api migrate
```

预期：安装生成 lockfile；构建退出 `0`；首次迁移打印
`applied 1:001_init.sql`，第二次打印 `already applied 1:001_init.sql`。若数据库未运行，第三条
应保存连接失败证据，不得把前两条成功扩大为“数据库通过”。

## 7. 邻里集市集成案例

以下文件把数据库、领域、仓储、事务、session、HTTP 和测试接到同一项目。完整文件仍只在本课
出现；第 02、03 课按函数名解释设计，不再复制。

**完整文件：`apps/api/src/db.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/src/db.ts" owner="01" -->
```ts
import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import pg from "pg";
import { loadConfig } from "./config.js";

@Injectable()
export class Db implements OnApplicationShutdown {
  readonly pool: pg.Pool;

  constructor() {
    const config = loadConfig();
    this.pool = new pg.Pool({
      connectionString: config.databaseUrl,
      max: 10,
      connectionTimeoutMillis: 3000,
      statement_timeout: 5000,
      idle_in_transaction_session_timeout: 10000
    });
    this.pool.on("error", () => {
      console.error(JSON.stringify({ event: "pg_idle_error" }));
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/src/db.ts" -->

**完整文件：`apps/api/src/errors.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/src/errors.ts" owner="01" -->
```ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException
} from "@nestjs/common";
import type { PublicUser } from "@market/contracts";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";

export interface AppRequest extends Request {
  requestId: string;
  user?: PublicUser;
  tokenHash?: string;
  csrfToken?: string;
}

export function fail(status: number, code: string, message: string): never {
  throw new HttpException({ code, message }, status);
}

function internalContext(error: unknown): Record<string, string> {
  if (!error || typeof error !== "object") return { errorType: typeof error };
  const value = error as { name?: unknown; code?: unknown };
  const context: Record<string, string> = {
    errorType: typeof value.name === "string" ? value.name : "Error"
  };
  if (typeof value.code === "string" && /^[0-9A-Z]{5}$/.test(value.code)) {
    context.sqlState = value.code;
  }
  return context;
}

@Catch()
export class ApiFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<AppRequest>();
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const raw = error instanceof HttpException ? error.getResponse() : null;
    const body =
      raw && typeof raw === "object"
        ? (raw as { code?: unknown; message?: unknown })
        : {};
    const fallback: Record<number, string> = {
      400: "VALIDATION",
      401: "UNAUTHENTICATED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      413: "BODY_TOO_LARGE",
      503: "UNAVAILABLE"
    };
    const requestId = request.requestId ?? randomUUID();

    if (status >= 500) {
      console.error(
        JSON.stringify({
          event: "internal_error",
          requestId,
          ...internalContext(error)
        })
      );
    }

    response.setHeader("x-request-id", requestId);
    response.status(status).json({
      code:
        typeof body.code === "string"
          ? body.code
          : (fallback[status] ?? "INTERNAL"),
      message:
        status >= 500
          ? "服务器错误"
          : typeof body.message === "string"
            ? body.message
            : "请求未通过验证",
      requestId
    });
  }
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/src/errors.ts" -->

**完整文件：`apps/api/src/dto.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/src/dto.ts" owner="01" -->
```ts
import { Type } from "class-transformer";
import {
  IsEmail,
  IsInt,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min
} from "class-validator";

export class CredentialsDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(12, 128)
  password!: string;
}

export class CreateListingDto {
  @IsString()
  @Length(1, 100)
  @Matches(/\S/)
  title!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsInt()
  @Min(0)
  @Max(100000000)
  priceCents!: number;
}

export class PatchListingDto extends CreateListingDto {
  @IsInt()
  @Min(1)
  @Max(2147483646)
  version!: number;
}

export class ListingQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsString()
  @MaxLength(100)
  q = "";
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/src/dto.ts" -->

**完整文件：`apps/api/src/repo.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/src/repo.ts" owner="01" -->
```ts
import { Injectable } from "@nestjs/common";
import type {
  Listing,
  ListingPage,
  PublicUser,
  Reservation
} from "@market/contracts";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { randomUUID } from "node:crypto";
import { Db } from "./db.js";
import type {
  CreateListingDto,
  ListingQueryDto,
  PatchListingDto
} from "./dto.js";

type SqlTarget = Pool | PoolClient;

export function toListing(row: QueryResultRow): Listing {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priceCents: row.price_cents,
    status: row.status,
    ownerId: row.owner_id,
    version: row.version,
    createdAt: row.created_at.toISOString()
  };
}

function toReservation(row: QueryResultRow): Reservation {
  return {
    id: row.id,
    listingId: row.listing_id,
    buyerId: row.buyer_id,
    status: row.status,
    createdAt: row.created_at.toISOString()
  };
}

@Injectable()
export class ListingsRepo {
  constructor(private readonly db: Db) {}

  async find(id: string, target: SqlTarget = this.db.pool): Promise<Listing | null> {
    const result = await target.query("SELECT * FROM listings WHERE id=$1", [id]);
    return result.rows[0] ? toListing(result.rows[0]) : null;
  }

  async lock(id: string, client: PoolClient): Promise<QueryResultRow | null> {
    const result = await client.query(
      "SELECT * FROM listings WHERE id=$1 FOR UPDATE",
      [id]
    );
    return result.rows[0] ?? null;
  }

  async page(query: ListingQueryDto): Promise<ListingPage> {
    const client = await this.db.pool.connect();
    const pattern = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const rows = await client.query(
        `SELECT * FROM listings
         WHERE title ILIKE $1 ESCAPE E'\\\\'
         ORDER BY created_at DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [pattern, query.pageSize, (query.page - 1) * query.pageSize]
      );
      const count = await client.query(
        `SELECT count(*)::integer AS total FROM listings
         WHERE title ILIKE $1 ESCAPE E'\\\\'`,
        [pattern]
      );
      await client.query("COMMIT");
      return {
        items: rows.rows.map(toListing),
        page: query.page,
        pageSize: query.pageSize,
        total: count.rows[0].total
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async create(input: CreateListingDto, user: PublicUser): Promise<Listing> {
    const result = await this.db.pool.query(
      `INSERT INTO listings(id,title,description,price_cents,owner_id)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        randomUUID(),
        input.title.trim(),
        input.description,
        input.priceCents,
        user.id
      ]
    );
    return toListing(result.rows[0]);
  }

  async updateOwned(
    id: string,
    input: PatchListingDto,
    user: PublicUser
  ): Promise<Listing | null> {
    const result = await this.db.pool.query(
      `UPDATE listings
       SET title=$1, description=$2, price_cents=$3, version=version+1
       WHERE id=$4 AND owner_id=$5 AND version=$6
       RETURNING *`,
      [
        input.title.trim(),
        input.description,
        input.priceCents,
        id,
        user.id,
        input.version
      ]
    );
    return result.rows[0] ? toListing(result.rows[0]) : null;
  }

  async markReserved(id: string, client: PoolClient): Promise<void> {
    await client.query(
      `UPDATE listings
       SET status='reserved', version=version+1
       WHERE id=$1`,
      [id]
    );
  }
}

@Injectable()
export class FavoritesRepo {
  constructor(private readonly db: Db) {}

  async set(userId: string, listingId: string, add: boolean): Promise<void> {
    if (add) {
      await this.db.pool.query(
        `INSERT INTO favorites(user_id,listing_id)
         VALUES ($1,$2)
         ON CONFLICT DO NOTHING`,
        [userId, listingId]
      );
      return;
    }
    await this.db.pool.query(
      "DELETE FROM favorites WHERE user_id=$1 AND listing_id=$2",
      [userId, listingId]
    );
  }
}

@Injectable()
export class ReservationsRepo {
  async create(
    listingId: string,
    buyerId: string,
    client: PoolClient
  ): Promise<Reservation> {
    const result = await client.query(
      `INSERT INTO reservations(id,listing_id,buyer_id)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [randomUUID(), listingId, buyerId]
    );
    return toReservation(result.rows[0]);
  }
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/src/repo.ts" -->

**完整文件：`apps/api/src/service.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/src/service.ts" owner="01" -->
```ts
import { Injectable } from "@nestjs/common";
import type { PublicUser, Reservation } from "@market/contracts";
import { Db } from "./db.js";
import type {
  CreateListingDto,
  PatchListingDto
} from "./dto.js";
import { fail } from "./errors.js";
import {
  FavoritesRepo,
  ListingsRepo,
  ReservationsRepo
} from "./repo.js";

@Injectable()
export class MarketService {
  constructor(
    private readonly db: Db,
    private readonly listings: ListingsRepo,
    private readonly favorites: FavoritesRepo,
    private readonly reservations: ReservationsRepo
  ) {}

  async get(id: string) {
    const listing = await this.listings.find(id);
    if (!listing) fail(404, "NOT_FOUND", "商品不存在");
    return listing;
  }

  create(input: CreateListingDto, user: PublicUser) {
    return this.listings.create(input, user);
  }

  async patch(id: string, input: PatchListingDto, user: PublicUser) {
    const current = await this.get(id);
    if (current.ownerId !== user.id) {
      fail(403, "FORBIDDEN", "只能修改自己的商品");
    }
    const updated = await this.listings.updateOwned(id, input, user);
    if (!updated) {
      fail(409, "VERSION_CONFLICT", "商品已变化，请重新读取");
    }
    return updated;
  }

  async favorite(id: string, user: PublicUser, add: boolean) {
    await this.get(id);
    await this.favorites.set(user.id, id, add);
    return { favorited: add };
  }

  async reserve(id: string, user: PublicUser): Promise<Reservation> {
    const client = await this.db.pool.connect();
    let began = false;
    let released = false;
    try {
      await client.query("BEGIN");
      began = true;
      await client.query("SET LOCAL lock_timeout='3s'");
      const row = await this.listings.lock(id, client);
      if (!row) fail(404, "NOT_FOUND", "商品不存在");
      if (row.owner_id === user.id) {
        fail(403, "SELF_RESERVATION", "不能预约自己的商品");
      }
      if (row.status !== "available") {
        fail(409, "RESERVATION_CONFLICT", "商品已被预约");
      }

      const reservation = await this.reservations.create(id, user.id, client);
      await this.listings.markReserved(id, client);
      await client.query("COMMIT");
      began = false;
      return reservation;
    } catch (error) {
      if (began) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          const unhealthy =
            rollbackError instanceof Error
              ? rollbackError
              : new Error("ROLLBACK failed");
          client.release(unhealthy);
          released = true;
          throw new AggregateError(
            [error, unhealthy],
            "reservation and rollback both failed"
          );
        }
      }
      const code = (error as { code?: string }).code;
      if (code === "23505") {
        fail(409, "RESERVATION_CONFLICT", "已有有效预约");
      }
      if (code === "55P03") {
        fail(503, "BUSY", "资源繁忙，请稍后重试");
      }
      throw error;
    } finally {
      if (!released) client.release();
    }
  }
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/src/service.ts" -->

**完整文件：`apps/api/src/auth.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/src/auth.ts" owner="01" -->
```ts
import {
  CanActivate,
  ExecutionContext,
  Injectable
} from "@nestjs/common";
import type { PublicUser } from "@market/contracts";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual
} from "node:crypto";
import { Db } from "./db.js";
import type { CredentialsDto } from "./dto.js";
import { fail } from "./errors.js";
import type { AppRequest } from "./errors.js";
import { loadConfig } from "./config.js";

const scryptOptions = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024
};

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, scryptOptions, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const publicUser = (row: {
  id: string;
  email: string;
  role: "user" | "admin";
}): PublicUser => ({
  id: row.id,
  email: row.email,
  role: row.role
});

export function requireOrigin(request: AppRequest): void {
  if (request.headers.origin !== loadConfig().appOrigin) {
    fail(403, "CSRF", "请求来源不受信任");
  }
}

@Injectable()
export class AuthService {
  constructor(private readonly db: Db) {}

  async register(body: CredentialsDto) {
    const salt = randomBytes(16).toString("hex");
    const key = await derive(body.password, salt);
    try {
      await this.db.pool.query(
        `INSERT INTO users(id,email,password_hash)
         VALUES ($1,$2,$3)`,
        [
          randomUUID(),
          body.email.toLowerCase(),
          `${salt}:${key.toString("hex")}`
        ]
      );
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        return { accepted: true as const };
      }
      throw error;
    }
    return { accepted: true as const };
  }

  async login(body: CredentialsDto) {
    const found = await this.db.pool.query(
      "SELECT * FROM users WHERE email=$1",
      [body.email.toLowerCase()]
    );
    const row = found.rows[0];
    const [salt, hex] = row
      ? row.password_hash.split(":")
      : ["0".repeat(32), "0".repeat(128)];
    const actual = await derive(body.password, salt);
    const expected = Buffer.from(hex, "hex");
    if (
      !row ||
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      fail(401, "INVALID_CREDENTIALS", "邮箱或密码错误");
    }

    const token = randomBytes(32).toString("hex");
    const csrfToken = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await this.db.pool.query(
      `INSERT INTO sessions(token_hash,user_id,csrf_token,expires_at)
       VALUES ($1,$2,$3,$4)`,
      [digest(token), row.id, csrfToken, expiresAt]
    );
    return { token, csrfToken, user: publicUser(row) };
  }

  async resolve(request: AppRequest): Promise<void> {
    const raw = request.headers.cookie
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("sid="))
      ?.slice(4);
    if (!raw || !/^[a-f0-9]{64}$/.test(raw)) {
      fail(401, "UNAUTHENTICATED", "请登录");
    }

    const tokenHash = digest(raw);
    const result = await this.db.pool.query(
      `SELECT u.id,u.email,u.role,s.csrf_token
       FROM sessions s
       JOIN users u ON u.id=s.user_id
       WHERE s.token_hash=$1 AND s.expires_at>now()`,
      [tokenHash]
    );
    if (!result.rows[0]) {
      fail(401, "UNAUTHENTICATED", "会话已失效");
    }
    request.user = publicUser(result.rows[0]);
    request.csrfToken = result.rows[0].csrf_token;
    request.tokenHash = tokenHash;
  }

  async logout(tokenHash: string): Promise<void> {
    await this.db.pool.query(
      "DELETE FROM sessions WHERE token_hash=$1",
      [tokenHash]
    );
  }
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    await this.auth.resolve(request);

    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      requireOrigin(request);
      const token = request.headers["x-csrf-token"];
      if (
        typeof token !== "string" ||
        !/^[a-f0-9]{64}$/.test(token) ||
        !timingSafeEqual(
          Buffer.from(token),
          Buffer.from(request.csrfToken!)
        )
      ) {
        fail(403, "CSRF", "CSRF 校验失败");
      }
    }
    return true;
  }
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/src/auth.ts" -->

**完整文件：`apps/api/src/controller.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/src/controller.ts" owner="01" -->
```ts
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards
} from "@nestjs/common";
import type { Response } from "express";
import { AuthService, requireOrigin, SessionGuard } from "./auth.js";
import { Db } from "./db.js";
import {
  CreateListingDto,
  CredentialsDto,
  ListingQueryDto,
  PatchListingDto
} from "./dto.js";
import { fail } from "./errors.js";
import type { AppRequest } from "./errors.js";
import { ListingsRepo } from "./repo.js";
import { MarketService } from "./service.js";

@Controller("listings")
export class ListingsController {
  constructor(
    private readonly listings: ListingsRepo,
    private readonly market: MarketService
  ) {}

  @Get()
  list(@Query() query: ListingQueryDto) {
    return this.listings.page(query);
  }

  @Get(":id")
  get(@Param("id", ParseUUIDPipe) id: string) {
    return this.market.get(id);
  }

  @Post()
  @UseGuards(SessionGuard)
  create(
    @Body() body: CreateListingDto,
    @Req() request: AppRequest
  ) {
    return this.market.create(body, request.user!);
  }

  @Patch(":id")
  @UseGuards(SessionGuard)
  patch(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: PatchListingDto,
    @Req() request: AppRequest
  ) {
    return this.market.patch(id, body, request.user!);
  }

  @Post(":id/reservations")
  @UseGuards(SessionGuard)
  reserve(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: AppRequest
  ) {
    if (request.body && Object.keys(request.body).length > 0) {
      fail(400, "VALIDATION", "预约不接收身份字段");
    }
    return this.market.reserve(id, request.user!);
  }
}

@Controller("favorites")
@UseGuards(SessionGuard)
export class FavoritesController {
  constructor(private readonly market: MarketService) {}

  @Put(":id")
  add(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: AppRequest
  ) {
    return this.market.favorite(id, request.user!, true);
  }

  @Delete(":id")
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: AppRequest
  ) {
    return this.market.favorite(id, request.user!, false);
  }
}

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @HttpCode(202)
  register(
    @Body() body: CredentialsDto,
    @Req() request: AppRequest
  ) {
    requireOrigin(request);
    return this.auth.register(body);
  }

  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: CredentialsDto,
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    requireOrigin(request);
    const result = await this.auth.login(body);
    const production = process.env.NODE_ENV === "production";
    response.cookie("sid", result.token, {
      httpOnly: true,
      secure: production,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60 * 1000
    });
    return { user: result.user, csrfToken: result.csrfToken };
  }

  @Get("me")
  @UseGuards(SessionGuard)
  me(@Req() request: AppRequest) {
    return {
      user: request.user,
      csrfToken: request.csrfToken
    };
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(SessionGuard)
  async logout(
    @Req() request: AppRequest,
    @Res({ passthrough: true }) response: Response
  ) {
    await this.auth.logout(request.tokenHash!);
    response.clearCookie("sid", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });
    return { ok: true };
  }
}

@Controller()
export class SystemController {
  constructor(private readonly db: Db) {}

  @Get("health/live")
  live() {
    return { ok: true };
  }

  @Get("health/ready")
  async ready() {
    try {
      const client = await this.db.pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL statement_timeout='1s'");
        await client.query("SELECT 1");
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return { ok: true };
    } catch {
      fail(503, "UNAVAILABLE", "依赖不可用");
    }
  }

  @Get("admin/stats")
  @UseGuards(SessionGuard)
  async stats(@Req() request: AppRequest) {
    if (request.user!.role !== "admin") {
      fail(403, "FORBIDDEN", "需要管理员权限");
    }
    const result = await this.db.pool.query(
      "SELECT count(*)::integer AS total FROM listings"
    );
    return result.rows[0];
  }
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/src/controller.ts" -->

**完整文件：`apps/api/src/app.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/src/app.ts" owner="01" -->
```ts
import { Module } from "@nestjs/common";
import { AuthService, SessionGuard } from "./auth.js";
import {
  AuthController,
  FavoritesController,
  ListingsController,
  SystemController
} from "./controller.js";
import { Db } from "./db.js";
import {
  FavoritesRepo,
  ListingsRepo,
  ReservationsRepo
} from "./repo.js";
import { MarketService } from "./service.js";

@Module({
  controllers: [
    AuthController,
    FavoritesController,
    ListingsController,
    SystemController
  ],
  providers: [
    Db,
    ListingsRepo,
    FavoritesRepo,
    ReservationsRepo,
    MarketService,
    AuthService,
    SessionGuard
  ]
})
export class AppModule {}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/src/app.ts" -->

**完整文件：`apps/api/src/bootstrap.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/src/bootstrap.ts" owner="01" -->
```ts
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NextFunction, Response } from "express";
import { randomUUID } from "node:crypto";
import { AppModule } from "./app.js";
import { loadConfig } from "./config.js";
import { ApiFilter } from "./errors.js";
import type { AppRequest } from "./errors.js";

export async function createApp() {
  loadConfig();
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix("api/v1");
  app.use(
    (request: AppRequest, response: Response, next: NextFunction) => {
      request.requestId = randomUUID();
      const started = performance.now();
      response.setHeader("x-request-id", request.requestId);
      response.setHeader("cache-control", "no-store");
      response.setHeader("x-content-type-options", "nosniff");
      response.on("finish", () => {
        console.log(
          JSON.stringify({
            event: "http",
            requestId: request.requestId,
            method: request.method,
            route: request.route?.path ?? "unmatched",
            status: response.statusCode,
            durationMs: Math.round(performance.now() - started)
          })
        );
      });
      next();
    }
  );
  app.useGlobalFilters(new ApiFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false }
    })
  );
  return app;
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/src/bootstrap.ts" -->

**完整文件：`apps/api/src/main.ts`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/src/main.ts" owner="01" -->
```ts
import { createApp } from "./bootstrap.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = await createApp();
await app.listen(config.port, "0.0.0.0");

const server = app.getHttpServer();
server.requestTimeout = 10000;
server.headersTimeout = 12000;

let closing = false;
async function shutdown(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  console.log(JSON.stringify({ event: "shutdown_start", signal }));
  const timer = setTimeout(() => process.exit(1), 15000);
  timer.unref();
  await app.close();
  clearTimeout(timer);
  console.log(JSON.stringify({ event: "shutdown_complete" }));
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
console.log(JSON.stringify({ event: "listening", port: config.port }));
```
<!-- API_CAPSTONE_FILE_END path="apps/api/src/main.ts" -->

**完整文件：`apps/api/test/fixture.mjs`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/test/fixture.mjs" owner="01" -->
```js
import { scrypt } from "node:crypto";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const databaseName = new URL(databaseUrl).pathname.slice(1);
if (!databaseName.endsWith("_test")) {
  throw new Error("Fixture requires a database ending with _test");
}

const ids = {
  seller: "10000000-0000-4000-8000-000000000001",
  buyer: "10000000-0000-4000-8000-000000000002",
  listing: "20000000-0000-4000-8000-000000000001"
};
const password = "fixture-only-password";
const salt = "0123456789abcdef0123456789abcdef";
const options = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024
};
const key = await new Promise((resolve, reject) => {
  scrypt(password, salt, 64, options, (error, derived) => {
    if (error) reject(error);
    else resolve(derived);
  });
});
const passwordHash = `${salt}:${key.toString("hex")}`;

const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const version = await client.query(
    `SELECT current_database() AS database,
            current_setting('server_version_num')::integer AS version_num`
  );
  const serverMajor = Math.floor(version.rows[0].version_num / 10000);
  if (version.rows[0].database !== databaseName || serverMajor !== 18) {
    throw new Error(
      `Fixture requires PostgreSQL 18 and ${databaseName}; got ` +
        `${serverMajor} and ${version.rows[0].database}`
    );
  }

  await client.query(
    `DELETE FROM reviews
     WHERE reservation_id IN (
       SELECT id FROM reservations WHERE listing_id=$1
     )`,
    [ids.listing]
  );
  await client.query("DELETE FROM reservations WHERE listing_id=$1", [
    ids.listing
  ]);
  await client.query("DELETE FROM favorites WHERE listing_id=$1", [ids.listing]);
  await client.query("DELETE FROM listings WHERE id=$1", [ids.listing]);
  await client.query("DELETE FROM sessions WHERE user_id=ANY($1::uuid[])", [
    [ids.seller, ids.buyer]
  ]);
  await client.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [
    [ids.seller, ids.buyer]
  ]);

  await client.query(
    `INSERT INTO users(id,email,password_hash)
     VALUES
       ($1,'seller.fixture@example.test',$3),
       ($2,'buyer.fixture@example.test',$3)`,
    [ids.seller, ids.buyer, passwordHash]
  );
  await client.query(
    `INSERT INTO listings(
       id,title,description,price_cents,owner_id,created_at
     )
     VALUES (
       $1,'夹具台灯','仅用于隔离测试库',19900,$2,
       '2026-10-11T00:00:00.000Z'
     )`,
    [ids.listing, ids.seller]
  );
  await client.query("COMMIT");
  console.log(
    JSON.stringify({
      event: "fixture_ready",
      database: databaseName,
      serverMajor,
      ids
    })
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
```
<!-- API_CAPSTONE_FILE_END path="apps/api/test/fixture.mjs" -->

**完整文件：`apps/api/test/api.test.mjs`**
<!-- API_CAPSTONE_FILE_BEGIN path="apps/api/test/api.test.mjs" owner="01" -->
```js
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";
import { createApp } from "../dist/bootstrap.js";

test("真实 HTTP 与 PostgreSQL 18：身份、权限、版本和并发", async () => {
  const databaseUrl = process.env.DATABASE_URL;
  assert.ok(databaseUrl);
  const declaredName = new URL(databaseUrl).pathname.slice(1);
  assert.match(declaredName, /_test$/);

  const pool = new pg.Pool({ connectionString: databaseUrl });
  const evidence = await pool.query(
    `SELECT current_database() AS database,
            current_setting('server_version_num')::integer AS version_num`
  );
  const serverMajor = Math.floor(evidence.rows[0].version_num / 10000);
  assert.equal(evidence.rows[0].database, declaredName);
  assert.equal(serverMajor, 18);
  console.log(
    JSON.stringify({
      event: "postgres_evidence",
      database: declaredName,
      serverMajor,
      clientMajor: pg.native ? "native" : "javascript"
    })
  );

  const app = await createApp();
  const userIds = [];
  let listingId;

  try {
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    assert.ok(address && typeof address === "object");
    const base = `http://127.0.0.1:${address.port}/api/v1`;

    async function request(
      path,
      method = "GET",
      body,
      session,
      extraHeaders = {}
    ) {
      const headers = {};
      if (!["GET", "HEAD"].includes(method)) {
        headers.Origin = process.env.APP_ORIGIN;
      }
      if (session) {
        headers.Cookie = session.cookie;
        headers["X-CSRF-Token"] = session.csrfToken;
      }
      if (body !== undefined) headers["Content-Type"] = "application/json";
      Object.assign(headers, extraHeaders);

      const response = await fetch(base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      const result = {
        status: response.status,
        body: await response.json(),
        headers: response.headers
      };
      if (result.status >= 400) {
        assert.equal(typeof result.body.code, "string");
        assert.equal(typeof result.body.message, "string");
        assert.equal(
          result.body.requestId,
          response.headers.get("x-request-id")
        );
        assert.equal("stack" in result.body, false);
      }
      return result;
    }

    async function account(label) {
      const credentials = {
        email: `${label}-${randomUUID()}@example.test`,
        password: "example-only-password"
      };
      const registered = await request(
        "/auth/register",
        "POST",
        credentials
      );
      assert.equal(registered.status, 202);
      assert.deepEqual(registered.body, { accepted: true });
      const duplicate = await request(
        "/auth/register",
        "POST",
        credentials
      );
      assert.equal(duplicate.status, 202);
      assert.deepEqual(duplicate.body, registered.body);

      const login = await request("/auth/login", "POST", credentials);
      assert.equal(login.status, 200);
      userIds.push(login.body.user.id);
      const setCookie = login.headers.get("set-cookie");
      assert.match(setCookie, /HttpOnly/i);
      assert.match(setCookie, /SameSite=Lax/i);
      return {
        user: login.body.user,
        csrfToken: login.body.csrfToken,
        cookie: setCookie.split(";")[0],
        credentials
      };
    }

    const seller = await account("seller");
    const buyer = await account("buyer");
    const buyer2 = await account("buyer2");

    assert.equal((await request("/auth/me")).status, 401);
    assert.equal(
      (await request("/auth/me", "GET", undefined, buyer)).body.user.id,
      buyer.user.id
    );
    assert.equal(
      (await request("/admin/stats", "GET", undefined, buyer)).status,
      403
    );
    assert.equal((await request("/health/live")).status, 200);
    assert.equal((await request("/health/ready")).status, 200);
    assert.equal((await request("/listings/not-a-uuid")).status, 400);
    assert.equal(
      (await request(`/listings/${randomUUID()}`)).status,
      404
    );
    assert.equal(
      (
        await request("/auth/login", "POST", {
          ...seller.credentials,
          password: "wrong-only-password"
        })
      ).status,
      401
    );

    const input = {
      title: "灯%架",
      description: "测试物品",
      priceCents: 19900
    };
    assert.equal(
      (
        await request(
          "/listings",
          "POST",
          input,
          { ...seller, csrfToken: "" }
        )
      ).status,
      403
    );
    assert.equal(
      (
        await request("/listings", "POST", input, seller, {
          Origin: "https://untrusted.example.test"
        })
      ).status,
      403
    );
    assert.equal(
      (
        await request(
          "/listings",
          "POST",
          { ...input, ownerId: buyer.user.id },
          seller
        )
      ).status,
      400
    );
    assert.equal(
      (
        await request(
          "/listings",
          "POST",
          { ...input, priceCents: 1.5 },
          seller
        )
      ).status,
      400
    );
    assert.equal(
      (
        await request(
          "/listings",
          "POST",
          { ...input, title: "   " },
          seller
        )
      ).status,
      400
    );

    const created = await request("/listings", "POST", input, seller);
    assert.equal(created.status, 201);
    listingId = created.body.id;
    assert.equal(created.body.ownerId, seller.user.id);
    assert.equal(created.body.priceCents, 19900);
    assert.match(created.body.createdAt, /Z$/);
    assert.equal(created.body.version, 1);

    const patch = {
      ...input,
      title: "修改后的灯%架",
      version: 1
    };
    assert.equal(
      (
        await request(
          `/listings/${listingId}`,
          "PATCH",
          patch,
          buyer
        )
      ).status,
      403
    );
    assert.equal(
      (await request(`/listings/${listingId}`)).body.version,
      1
    );
    const updated = await request(
      `/listings/${listingId}`,
      "PATCH",
      patch,
      seller
    );
    assert.equal(updated.status, 200);
    assert.equal(updated.body.version, 2);
    const stale = await request(
      `/listings/${listingId}`,
      "PATCH",
      patch,
      seller
    );
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "VERSION_CONFLICT");

    const searched = await request(
      "/listings?q=%25&page=1&pageSize=100"
    );
    assert.ok(searched.body.items.some((item) => item.id === listingId));
    assert.ok(
      searched.body.items.every((item) => item.title.includes("%"))
    );
    assert.equal((await request("/listings?page=0")).status, 400);

    for (let index = 0; index < 2; index += 1) {
      assert.equal(
        (
          await request(
            `/favorites/${listingId}`,
            "PUT",
            undefined,
            buyer
          )
        ).status,
        200
      );
    }
    let favorites = await pool.query(
      "SELECT user_id FROM favorites WHERE listing_id=$1",
      [listingId]
    );
    assert.deepEqual(
      favorites.rows.map((row) => row.user_id),
      [buyer.user.id]
    );
    await request(
      `/favorites/${listingId}`,
      "DELETE",
      undefined,
      buyer2
    );
    favorites = await pool.query(
      "SELECT user_id FROM favorites WHERE listing_id=$1",
      [listingId]
    );
    assert.deepEqual(
      favorites.rows.map((row) => row.user_id),
      [buyer.user.id]
    );
    for (let index = 0; index < 2; index += 1) {
      assert.equal(
        (
          await request(
            `/favorites/${listingId}`,
            "DELETE",
            undefined,
            buyer
          )
        ).status,
        200
      );
    }
    assert.equal(
      (
        await pool.query(
          "SELECT * FROM favorites WHERE listing_id=$1",
          [listingId]
        )
      ).rowCount,
      0
    );

    assert.equal(
      (
        await request(
          `/listings/${listingId}/reservations`,
          "POST",
          undefined,
          seller
        )
      ).status,
      403
    );

    const { MarketService } = await import("../dist/service.js");
    const { Db } = await import("../dist/db.js");
    const service = app.get(MarketService);
    const db = app.get(Db);
    const originalConnect = db.pool.connect.bind(db.pool);
    db.pool.connect = async () => {
      const client = await originalConnect();
      const originalQuery = client.query.bind(client);
      client.query = async (...args) => {
        if (
          typeof args[0] === "string" &&
          args[0].includes("UPDATE listings") &&
          args[0].includes("status='reserved'")
        ) {
          throw new Error("Test failure after reservation INSERT");
        }
        return originalQuery(...args);
      };
      const originalRelease = client.release.bind(client);
      client.release = (...args) => {
        client.query = originalQuery;
        return originalRelease(...args);
      };
      return client;
    };
    try {
      await assert.rejects(
        service.reserve(listingId, buyer.user),
        /Test failure/
      );
    } finally {
      db.pool.connect = originalConnect;
    }
    assert.equal(
      (
        await pool.query(
          "SELECT * FROM reservations WHERE listing_id=$1",
          [listingId]
        )
      ).rowCount,
      0
    );
    const rolledBack = await request(`/listings/${listingId}`);
    assert.equal(rolledBack.body.status, "available");
    assert.equal(rolledBack.body.version, 2);

    const concurrencyConnect = db.pool.connect.bind(db.pool);
    const readyPids = [];
    let readyCount = 0;
    let openGate;
    let rejectGate;
    const gate = new Promise((resolve, reject) => {
      openGate = resolve;
      rejectGate = reject;
    });
    const gateDeadline = setTimeout(
      () => rejectGate(new Error("concurrency barrier timed out")),
      3000
    );
    gateDeadline.unref();
    db.pool.connect = async () => {
      const client = await concurrencyConnect();
      const originalQuery = client.query.bind(client);
      let passedGate = false;
      client.query = async (...args) => {
        if (
          !passedGate &&
          typeof args[0] === "string" &&
          args[0].includes("SELECT * FROM listings") &&
          args[0].includes("FOR UPDATE")
        ) {
          passedGate = true;
          const identity = await originalQuery(
            "SELECT pg_backend_pid() AS pid"
          );
          readyPids.push(identity.rows[0].pid);
          readyCount += 1;
          if (readyCount === 2) {
            clearTimeout(gateDeadline);
            openGate();
          }
          await gate;
        }
        return originalQuery(...args);
      };
      const originalRelease = client.release.bind(client);
      client.release = (...args) => {
        client.query = originalQuery;
        return originalRelease(...args);
      };
      return client;
    };
    let competing;
    try {
      competing = await Promise.all([
        request(
          `/listings/${listingId}/reservations`,
          "POST",
          undefined,
          buyer
        ),
        request(
          `/listings/${listingId}/reservations`,
          "POST",
          undefined,
          buyer2
        )
      ]);
    } finally {
      clearTimeout(gateDeadline);
      db.pool.connect = concurrencyConnect;
    }
    assert.equal(readyPids.length, 2);
    assert.equal(new Set(readyPids).size, 2);
    console.log(JSON.stringify({
      event: "concurrency_ready",
      backendPids: readyPids
    }));
    assert.deepEqual(
      competing.map((result) => result.status).sort(),
      [201, 409]
    );
    const reservations = await pool.query(
      "SELECT * FROM reservations WHERE listing_id=$1",
      [listingId]
    );
    assert.equal(reservations.rowCount, 1);
    assert.ok(
      [buyer.user.id, buyer2.user.id].includes(
        reservations.rows[0].buyer_id
      )
    );
    const finalListing = await request(`/listings/${listingId}`);
    assert.equal(finalListing.body.status, "reserved");
    assert.equal(finalListing.body.version, 3);

    assert.equal(
      (
        await request(
          "/auth/logout",
          "POST",
          undefined,
          buyer
        )
      ).status,
      200
    );
    assert.equal(
      (await request("/auth/me", "GET", undefined, buyer)).status,
      401
    );
    await pool.query(
      `UPDATE sessions
       SET expires_at=now()-interval '1 second'
       WHERE user_id=$1`,
      [buyer2.user.id]
    );
    assert.equal(
      (await request("/auth/me", "GET", undefined, buyer2)).status,
      401
    );
  } finally {
    await app.close();
    if (listingId) {
      await pool.query(
        "DELETE FROM reviews WHERE reservation_id IN " +
          "(SELECT id FROM reservations WHERE listing_id=$1)",
        [listingId]
      );
      await pool.query(
        "DELETE FROM reservations WHERE listing_id=$1",
        [listingId]
      );
      await pool.query("DELETE FROM listings WHERE id=$1", [listingId]);
    }
    if (userIds.length > 0) {
      await pool.query(
        "DELETE FROM users WHERE id=ANY($1::uuid[])",
        [userIds]
      );
    }
    await pool.end();
  }
});
```
<!-- API_CAPSTONE_FILE_END path="apps/api/test/api.test.mjs" -->

### 7.1 从最小案例扩展到集成

完整数据流是：

```text
HTTP request
  -> requestId / no-store / nosniff
  -> DTO transform + whitelist
  -> SessionGuard: session + Origin + CSRF
  -> controller: 路径与 HTTP 语义
  -> service: 对象授权、事务所有权、冲突映射
  -> repositories: 参数化 SQL，同一事务 client
  -> PostgreSQL 18: FK、CHECK、唯一索引、行锁
  -> ApiFilter: 稳定错误 JSON
  -> 脱敏结构化日志
```

`priceCents` 在 DTO 和数据库都要求整数范围；`timestamptz` 从 `pg` 读为 `Date` 后只在响应映射
中调用 `toISOString()`。客户端不能提交 `ownerId`、`status`、角色或预约 `buyerId`。

## 8. 常见错误与排查路径

### 明确错误示例：测试脚本误连开发库

错误配置：

```dotenv
# 错误：测试命令会写入开发库
DATABASE_URL=postgresql://APP_USER:REPLACE_LOCAL_PASSWORD@127.0.0.1:5432/market
NODE_ENV=test
```

不能通过“测试数据看起来没关系”继续执行。`fixture.mjs` 和 `api.test.mjs` 都必须在任何写入前
拒绝不以 `_test` 结尾的库。

| 五段诊断 | 本例记录 |
| --- | --- |
| 现象 | `pnpm fixture` 在写入前非零退出 |
| 证据 | 错误包含 `database ending with _test`；目标 URL pathname 是 `market` |
| 原因 | `.env.test` 复制后没有改数据库名 |
| 修复 | 创建隔离 `market_test`，只修改本地 `.env.test`，不提交凭据 |
| 复验 | 再运行 fixture，并用 `SELECT current_database()` 确认为 `market_test` |

### 其他高频错误

| 现象 | 先查证据 | 原因 | 修复与复验 |
| --- | --- | --- | --- |
| 构建找不到 ESM 模块 | `tsc` 的文件与导入后缀 | NodeNext 下漏 `.js` | 恢复后缀并重跑 build |
| `APP_ORIGIN` 启动失败 | 原始变量，不输出密码 | 带路径或尾斜杠 | 改成精确 origin |
| 第二次迁移 checksum 失败 | 迁移名、registry checksum | 改了已应用 SQL | 恢复旧文件，新增 `002_*` |
| `relation does not exist` | 当前库与 migration registry | 只迁移了开发库 | 对测试库单独运行 migration |
| 价格出现小数 | 请求 JSON 与 DTO 错误 | 把元当分或允许 float | 发整数分，保留 DTO/DB 双约束 |
| 时间不是 `Z` 结尾 | HTTP 响应字段 | 手工拼本地时间 | 统一 `toISOString()` |

## 9. 课后题

**问题 1：为什么直接依赖固定版本后仍需要 lockfile？**

参考答案：直接依赖精确版本不固定全部传递依赖和解析元数据；lockfile 记录实际依赖图。两者与
固定 pnpm 共同组成复现输入。

**问题 2：为什么迁移文件有 checksum 还要 manifest 顺序？**

参考答案：checksum 发现同名文件改写，manifest 决定允许文件及执行顺序。只有 checksum 会让
漏文件或额外文件没有独立预期。

**问题 3：为什么 `psql --version` 不能证明 PostgreSQL 18？**

参考答案：它只报告客户端。服务器可能是另一机器或另一主版本，必须连接后查询
`server_version_num`。

**问题 4：为什么 `reviews` 有表但没有 HTTP 入口？**

参考答案：表保留连续领域模型；合法评价需要交易完成状态和对象关系。本章没有完整实现该流程，
因此明确排除，而不是伪造半条接口。

**问题 5：为什么 fixture 固定数据而验收测试仍创建随机账号？**

参考答案：fixture 提供可人工检查的已知基线；测试随机创建并按 ID 清理，避免与 fixture 或并行
运行共享身份。两者职责不同。

## 10. 实践练习

### 基础：配置红绿实验

临时把 `.env.test` 的 `PORT` 改为 `abc`，运行启动命令。

参考答案与判定：监听前失败，错误明确指出端口范围；恢复整数端口后能继续 build/start。不得在
`Number()` 得到 `NaN` 后静默回退。

### 进阶：新增只向前迁移

在临时项目增加 `002_sessions_cleanup_index.sql`，同时把 `{ order: 2, name: ... }` 加到 manifest，
建立适合过期会话清理的索引。

参考答案与判定：首次只应用 002；001 checksum 不变；registry 顺序为 1、2；删除 manifest 中
002 或修改已应用 001 都应失败。正式教材源码不要求纳入该扩展。

### 故障注入：改写已应用迁移

先迁移，再给 `001_init.sql` 增加一个空格，重跑 migration。

参考答案与判定：checksum 失败且事务回滚；恢复原文件后显示 already applied。不能清空
`schema_migrations` 来制造绿色。

## 11. 阶段验收

从临时项目根执行：

```bash
node --version
pnpm --version
pnpm install
pnpm install --frozen-lockfile
pnpm build
pnpm migrate
pnpm migrate
```

预期结果：

- Node 与 pnpm 匹配固定版本；
- frozen 安装不改 lockfile；
- build 退出 `0`；
- 第一次迁移显示 `applied 1:001_init.sql`；
- 第二次显示 `already applied 1:001_init.sql`。

必须保存的失败证据：

- 数据库未运行时的 `pg_isready` 与连接错误；
- 非 PostgreSQL 18 时实际 `server_version_num`；
- 配置占位值、错误 origin 或端口导致的启动前失败；
- checksum 漂移时的迁移名；
- 非 `_test` 库被 fixture/test 拒绝的错误。

检查清单：

- [ ] expected 恰好 25 条，完整文件 header/BEGIN/END 也各 25 条。
- [ ] 同一路径只出现一次，owner 全为 `01`。
- [ ] 直接依赖没有 `^`、`~` 或 `latest`。
- [ ] `.env`、lockfile、`node_modules`、`dist` 不属于教材源码 manifest。
- [ ] 配置在监听前校验，日志不输出连接串。
- [ ] migration manifest、咨询锁、事务、checksum 和 registry 同时存在。
- [ ] schema 保留整数分、UTC、FK、CHECK、收藏唯一和有效预约唯一。
- [ ] fixture 与验收测试都拒绝非 `_test` 数据库，并查询 PostgreSQL 服务端版本。

若当前环境没有运行 PostgreSQL 18，本节结果只能写为“文档结构/可执行静态步骤完成，真实迁移
与验收阻塞”，不能填写上述数据库通过项。

## 12. 常见问题

**为什么完整源码都放在第 01 课，而不是按四课分散 owner？**

本章的强约束是“完整源码只能有一个清晰 owner”。单课集中让后续理论和 runbook 始终引用同一
版本；代价是第 01 课较长，但消除了跨课覆盖顺序。

**可以把 `.env` 也做成完整文件吗？**

不可以提交真实 `.env`。教材只拥有无秘密的 example；读者在 `/tmp` 本地复制并替换占位值。

**为什么不把 Redis 加入 manifest？**

核心 API 的正确性依赖 PostgreSQL 约束和事务，不依赖缓存。Redis、outbox 和 BullMQ 是第 8 章
可选可靠性扩展，不能让缺少 Redis 阻断核心验收。

**测试里手工发送 Cookie，是否验证了浏览器 SameSite？**

没有。Node fetch 只验证服务端收到了指定 Cookie 和 CSRF header；浏览器 Cookie 策略、Secure
属性和 HTTPS 需要真实浏览器与 TLS 环境。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [pnpm Workspaces](https://pnpm.io/workspaces)：workspace 成员与协议。
- [pnpm install](https://pnpm.io/cli/install)：lockfile 与 frozen 安装。
- [NestJS 12.1.1 Release](https://github.com/nestjs/nest/releases/tag/v12.1.1)：本章框架固定点。
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)：配置责任。
- [node-postgres Pool](https://node-postgres.com/features/pooling)：连接池与关闭。
- [PostgreSQL 18 Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html)：行锁与咨询锁。
- [PostgreSQL 18 DDL](https://www.postgresql.org/docs/18/ddl.html)：约束与 schema。
- [Node.js Environment Variables](https://nodejs.org/api/environment_variables.html)：`--env-file`。

## 我现在能做到什么

我能从一份机器可识别、单一 owner 的教材源码重建完整 API，固定工作区和直接依赖，在副作用前
校验配置，按 manifest 安全迁移，并把金额、时间、权限、事务、错误和测试库边界连接到同一份
可审计实现；环境没有 PostgreSQL 18 时，我也能保留阻塞证据而不虚报通过。

## 单元导航

[返回第 10 章入口](../10-api-capstone.md) ·
[上一章：测试、OpenAPI 与可观测性](../09-testing-openapi-observability.md) ·
[下一课：领域、仓储与事务服务](02-domain-repositories-transaction-services.md)
