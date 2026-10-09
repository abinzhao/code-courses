# 50-API E2E 测试与测试数据库

## 目标

上一单元的集成测试仍然可以替换掉数据库，而数据库恰恰是后端最容易出问题的边界：SQL 方言差异、事务隔离级别、外键约束、唯一索引、并发写入。API E2E（端到端）测试把应用按生产形态启动，连接真实数据库，只把最难控制的第三方服务替换掉，从 HTTP 请求一路验证到数据落库。

要让 E2E 既真实又稳定，核心工程问题是“测试数据库如何隔离”：几十个用例共享一个库必然互相污染，用真实生产库更是不可接受。本单元围绕隔离、种子、清理、契约与稳定性展开。

完成本知识单元后，学员应能够：

1. 界定 API E2E 测试与单元/集成测试的边界，说明 E2E 为什么数量要少而覆盖关键路径。
2. 使用独立测试库、事务回滚、容器数据库三种隔离策略，并能说明各自的适用场景与代价。
3. 编写种子数据（seed）与清理（teardown）逻辑，保证用例可重复、可并行、不依赖执行顺序。
4. 使用全局 setup/teardown 启动应用与数据库连接池，组织真实 HTTP E2E 用例并校验数据库最终状态。
5. 解释契约测试的概念与价值，区分它与 E2E 在服务协作验证上的不同分工。
6. 按关键路径优先级设计 E2E 覆盖，并系统治理 flaky test（时间、顺序、并行、残留数据四类根因）。

本单元的核心信念是：E2E 的“真”必须建立在“净”之上——一个每次运行前数据状态都明确的环境，才能给出可信的绿灯。

## 技术栈

| 工具或库 | 当前稳定版本线 | 用途 | 学习要求 |
|---|---|---|---|
| Vitest | 3.x 稳定版 | E2E 运行器、全局 setup、生命周期 | 掌握 `globalSetup`、`beforeAll/afterAll` |
| Jest | 30.x 稳定版 | 存量项目的替代运行器 | 对应 `globalSetup`、`setupFilesAfterEach` 配置 |
| supertest | 7.x 稳定版 | 对应用发起真实 HTTP 请求 | 与真实 Service、真实仓储联动 |
| testcontainers | 10.x 稳定版 | 用 Docker 启动一次性数据库容器 | 掌握 GenericContainer/PostgreSqlContainer 生命周期 |
| pg / Postgres | pg 8.x、Postgres 16.x | 驱动与被测数据库（MySQL 同理） | 会连接池、事务、TRUNCATE |
| Prisma / Drizzle | 当前稳定版 | ORM/查询构建器（可选主线） | 理解迁移与种子命令在测试中的用法 |
| @faker-js/faker | 9.x 稳定版 | 生成不重复的随机测试数据 | 保证唯一字段不冲突 |
| Docker | 当前稳定版 | 容器化隔离的运行前提 | 本机 Docker 守护进程可用 |

约定：

- 主线数据库使用 PostgreSQL，MySQL 的对应做法在差异处注明；所有连接串来自环境变量，默认指向本机或容器映射端口。
- 第三方服务（支付、短信）在 E2E 中使用进程内 Stub 或独立的 Mock Server 替换，绝不请求真实外网。
- 测试数据中的邮箱、手机号等使用 faker 生成或使用保留示例域名，不使用真实个人信息。
- 示例应用沿用上一单元的 `createApp` 分离结构，E2E 中可以真实监听端口，也可以继续由 supertest 在进程内发起请求。

开始前检查环境：

```bash
docker version
docker ps
```

预期观察：客户端与服务端版本都能打印，`docker ps` 无报错。容器隔离策略依赖 Docker；若环境暂不具备，可先完成独立库与事务回滚策略的练习。

## 详细的理论知识讲解和示例伪代码

### 1. API E2E 的定义与边界

#### 1.1 什么才算 API E2E

API E2E 以应用对外暴露的 HTTP 接口为入口，以生产等价的组装方式运行：真实路由、真实中间件、真实 Service、真实数据库、真实数据库迁移。允许被替换的只有两类：进程外第三方依赖，以及为了可重复性而被固定的时间。

```text
测试进程
  HTTP 请求（supertest 或真实端口）
      ↓
createApp() 生产组装
      ↓
OrderService（真实）
      ↓
OrderRepository（真实 SQL）
      ↓
测试数据库（真实 Postgres，独立实例/独立库/容器）

支付网关 → 本地 Stub 服务（唯一被替换的外部边界）
```

#### 1.2 E2E 与厚集成测试的区别

两者都连真实数据库，差别在“组装的真实程度”和“验证的终点”：

| 维度 | 厚集成测试 | API E2E |
|---|---|---|
| 入口 | 可能直接调控制器/Service | 只能从 HTTP 进入 |
| 数据库结构 | 可能用简化 schema | 必须跑完整迁移 |
| 配置 | 测试专用装配 | 生产等价配置与启动流程 |
| 断言终点 | 响应为主 | 响应 + 数据库最终状态 + 副作用 |
| 数量 | 每个写接口可多条 | 只守关键业务路径 |

判断标准：如果一个用例只能通过 HTTP 触发、跑完后还要去数据库里核对“到底写了什么”，它就是 E2E。

#### 1.3 与后端系统的关系

E2E 守住的是“用户真正走的那条路”：注册 → 登录 → 下单 → 支付 → 查询。这些路径一旦在生产中断就是线上事故，值得用较慢的测试守住；但每个接口的全部边界组合不应放进 E2E，那是单元与集成测试的职责。

#### 1.4 常见误区

> 误区一：给每个字段组合都写 E2E。

套件从分钟级膨胀到小时级，没人愿意本地跑，最终只在 CI 深夜运行，反馈链断裂。

> 误区二：E2E 连开发共享数据库。

他人正在调试的数据会让用例时好时坏，且测试清理可能删掉别人的数据。

### 2. 隔离策略一：独立测试数据库

#### 2.1 为测试单独建库

最基础的隔离是“应用有自己的测试数据库”，与开发库、生产库物理分离：

```bash
createdb app_test
# 或
psql -c "CREATE DATABASE app_test;"
```

连接通过环境变量注入：

```bash
DATABASE_URL=postgres://app:app@localhost:5432/app_test pnpm test:e2e
```

```ts
// test/e2e/config.ts
export const config = {
  databaseUrl:
    process.env.DATABASE_URL ??
    'postgres://app:app@localhost:5432/app_test',
};
```

#### 2.2 每次运行重建 schema

E2E 要求数据库结构与生产一致，正确做法是在测试启动时执行迁移而不是手改表：

```bash
pnpm prisma migrate deploy
# 或
pnpm drizzle-kit push
# 或原生
psql "$DATABASE_URL" -f migrations/001_init.sql
```

```ts
// test/e2e/global-setup.ts
import { execSync } from 'node:child_process';

export default async function setup() {
  execSync('pnpm migrate:deploy', {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
```

```ts
// vitest.config.ts 片段
export default defineConfig({
  test: {
    globalSetup: ['./test/e2e/global-setup.ts'],
    include: ['test/e2e/**/*.e2e.test.ts'],
  },
});
```

#### 2.3 更细的隔离：每作业一个库

CI 上多个作业并行、本地多个分支同时测试时，共用一个 `app_test` 仍会冲突。可以让每次运行使用带唯一后缀的库名：

```text
库名 = app_test_<runId>
runId = 进程环境变量 CI_JOB_ID，或启动时生成的短随机串

流程：
1. 连接维护库 postgres，CREATE DATABASE app_test_<runId>
2. 在该库执行迁移并运行全部用例
3. afterAll 中 DROP DATABASE app_test_<runId>
```

```ts
// test/e2e/database.ts
import { Client } from 'pg';

export async function createEphemeralDatabase(adminUrl: string, runId: string) {
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  const name = `app_test_${runId.replace(/[^a-z0-9_]/gi, '')}`;
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  return name;
}

export async function dropDatabase(adminUrl: string, name: string) {
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  // 强制断开残留连接后再删除
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
    [name],
  );
  await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  await admin.end();
}
```

不使用 TypeScript 的项目可以把它写成一个可独立执行的 Node 脚本，供命令行手工申请与回收临时库：

```js
// scripts/test-db.js
#!/usr/bin/env node
import { Client } from 'pg';

const adminUrl = process.env.ADMIN_DATABASE_URL;
const runId = process.argv[2];

if (!adminUrl || !runId) {
  console.error('用法：ADMIN_DATABASE_URL=<url> node scripts/test-db.js <runId>');
  process.exit(1);
}

const name = `app_test_${runId.replace(/[^a-z0-9_]/gi, '')}`;
const admin = new Client({ connectionString: adminUrl });

await admin.connect();
await admin.query(`CREATE DATABASE ${name}`);
console.log(name);
await admin.end();
```

#### 2.4 与后端系统的关系

独立库保证测试的写操作永远不会碰到真实用户数据，这是红线级要求；唯一库名则让“并行”成为可能，CI 才能在有限时间内跑完所有作业。

#### 2.5 常见误区

> 误区：图省事让测试库和开发库共用一个实例但“小心点不删表”。

一次错误的 `TRUNCATE` 或迁移测试就会清掉开发数据；实例也应分离。

### 3. 隔离策略二：事务回滚

#### 3.1 用一个外层事务包裹每个用例

速度最快的隔离方式：每个用例开始时开启事务，用例中的所有读写都在该事务内发生，用例结束时 `ROLLBACK`，数据库恢复到用例前状态。不需要删除任何数据。

```ts
// test/e2e/transactional-context.ts
import { Pool } from 'pg';
import { afterEach, beforeEach } from 'vitest';

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });

let txClient: import('pg').PoolClient;

beforeEach(async () => {
  txClient = await pool.connect();
  await txClient.query('BEGIN');
});

afterEach(async () => {
  await txClient.query('ROLLBACK');
  txClient.release();
});

export function getClient() {
  return txClient;
}
```

#### 3.2 让应用代码复用同一事务是关键前提

事务回滚有效的必要条件是：被测应用拿到的数据库连接与测试开启事务的连接是同一个。常见做法有两种：

```text
方式 A：应用支持在请求作用域注入一个已存在的客户端
  测试中把 txClient 放进请求上下文，仓储从上下文取连接

方式 B：连接池劫持
  测试中临时让 pool.connect 永远返回事务客户端，用例结束后还原
```

```ts
// 方式 B 的概念伪代码
const originalConnect = pool.connect.bind(pool);

beforeEach(async () => {
  txClient = await originalConnect();
  await txClient.query('BEGIN');
  pool.connect = (() => Promise.resolve(txClient)) as never;
});

afterEach(async () => {
  pool.connect = originalConnect;
  await txClient.query('ROLLBACK');
  txClient.release();
});
```

#### 3.3 适用边界

| 优点 | 限制 |
|---|---|
| 用例间零残留，无需清理脚本 | 应用必须能复用测试事务连接 |
| 速度极快，只 BEGIN/ROLLBACK | 无法覆盖连接池行为、跨连接事务 |
| 可安全并行（各自事务） | 测不了自行提交事务的代码路径 |

当某个用例就是要验证“事务提交后的可见性”或使用了 `SELECT FOR UPDATE` 跨连接加锁，应把该用例移出事务隔离，改用独立库 + 表清理策略。

#### 3.4 常见误区

> 误区一：应用代码内部用独立连接池，测试却只在自己的连接里 BEGIN。

应用的写入走了另一个连接并真正提交，回滚什么都没发生，数据残留。

> 误区二：在事务用例中断言“另起连接能查到刚写入的数据”。

未提交事务对其他连接本就不可见，这不是 bug，是隔离策略的预期行为。

### 4. 隔离策略三：容器化数据库

#### 4.1 一次性容器提供最强一致环境

testcontainers 在测试启动时用 Docker 拉起一个真实数据库容器：版本固定、端口自动映射、用例结束自动销毁。它消除了“我机器上的 Postgres 是 13，CI 是 16”这类环境漂移。

```bash
pnpm add -D testcontainers
```

```ts
// test/e2e/container-setup.ts
import { PostgreSqlContainer } from 'testcontainers';

declare global {
  // eslint-disable-next-line no-var
  var __PG__: { connectionString: string; stop: () => Promise<void> };
}

export default async function setup() {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('app_test')
    .withUsername('app')
    .withPassword('app')
    .start();

  const connectionString = container.getConnectionUri();

  globalThis.__PG__ = {
    connectionString,
    stop: () => container.stop(),
  };

  // 在容器库上执行迁移
  process.env.TEST_DATABASE_URL = connectionString;
}
```

```ts
// test/e2e/container-teardown.ts
export default async function teardown() {
  await globalThis.__PG__?.stop();
}
```

#### 4.2 通用容器与 Mock 服务容器

同一机制还能启动第三方依赖的替身，让 E2E 完全离线：

```ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';

export async function startStubPayment(): Promise<StartedTestContainer> {
  return new GenericContainer('wiremock/wiremock:3-alpine')
    .withExposedPorts(8080)
    .withCopyFilesToContainer([
      {
        source: 'test/e2e/stubs/payment',
        target: '/home/wiremock',
      },
    ])
    .start();
}
```

#### 4.3 代价与取舍

```text
收益：
- 数据库版本与生产严格一致
- 用例结束容器即销毁，绝无残留
- 新成员不需要本地装数据库

代价：
- 首次拉取镜像耗时，需要 Docker
- 启动容器比连本地库慢（可用复用模式或镜像预热缓解）
```

实践中常用组合：本地开发用独立库 + 事务回滚求速度；CI 与验收演示用容器求一致。

#### 4.4 常见误区

> 误区一：每个用例都 start/stop 一次容器。

应在 globalSetup 启动一次供整个套件复用，否则时间全花在容器启停上。

> 误区二：使用不带版本号的 `postgres:latest` 镜像。

版本随时间漂移，违背了容器隔离“环境固定”的初衷。

### 5. 种子数据与清理策略

#### 5.1 种子数据分两类

- 基线种子：所有用例都依赖的静态数据，如国家代码、系统角色、固定套餐，在迁移后一次性插入。
- 用例数据：每个用例自己构造的业务数据，如用户、订单，必须就近创建、就近清理。

```ts
// test/e2e/seeds/baseline.ts
export async function seedBaseline(db: Db) {
  await db.insertInto('roles').values([
    { code: 'admin' },
    { code: 'member' },
  ]).execute();
}
```

#### 5.2 用 builder 构造不冲突的数据

直接复用固定邮箱会让并行用例在唯一索引上相撞。使用 builder + faker：

```ts
// test/e2e/builders/user.builder.ts
import { faker } from '@faker-js/faker';
import type { Db } from '../../../src/db/client';

export function buildUser(overrides: Partial<UserInput> = {}): UserInput {
  return {
    email: faker.internet.email({ provider: 'example.com' }).toLowerCase(),
    name: faker.person.fullName(),
    status: 'active',
    ...overrides,
  };
}

export async function createUser(db: Db, overrides: Partial<UserInput> = {}) {
  const input = buildUser(overrides);
  const [row] = await db.insertInto('users').values(input).returningAll().execute();
  return row;
}
```

#### 5.3 三种清理方式

```text
方式 1：事务回滚（见第 3 节），最快，零残留
方式 2：按用例删除自己创建的 id，精准但依赖外键删除顺序
方式 3：每个用例后 TRUNCATE 全表并 RESTART IDENTITY，简单粗暴
```

```ts
// test/e2e/cleanup.ts
import { Pool } from 'pg';

const TABLES = ['order_items', 'orders', 'users'] as const;

export async function truncateAll(pool: Pool) {
  await pool.query(`
    TRUNCATE TABLE ${TABLES.join(', ')}
    RESTART IDENTITY CASCADE
  `);
}
```

`CASCADE` 会顺带清空有外键引用的表，必须确认引用范围只在测试表内；生产连接串上绝不允许执行该逻辑，因此配置层要保证 E2E 只能拿到测试库地址。

#### 5.4 与后端系统的关系

种子和清理决定了 E2E 是否“可重复”：今天能过、明天也能过、连跑三遍还能过。残留数据是 flaky 的第一大来源，把数据构造收敛到 builder 与统一 cleanup，是所有团队的必经之路。

#### 5.5 常见误区

> 误区一：用例依赖“上一个用例创建的订单”。

一旦单独运行或并行执行就失败；每个用例自己创建全部前置数据。

> 误区二：清理时按固定邮箱/手机号 DELETE。

并行用例可能互相删除对方的数据；应按创建时返回的 id 清理。

### 6. E2E 用例组织：启动、请求与数据库核对

#### 6.1 全局生命周期

```text
globalSetup：
  启动容器或创建临时库 → 执行迁移 → 插入基线种子 → 启动支付 Stub

每个用例 beforeEach：
  开启事务，或 truncateAll

每个用例 afterEach：
  回滚事务

globalTeardown：
  关闭连接池 → 销毁容器 / DROP 临时库
```

```ts
// test/e2e/order.e2e.test.ts
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { createRealDeps } from '../../src/deps';

describe('下单关键路径 E2E', () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    pool = new Pool({ connectionString: globalThis.__PG__?.connectionString });
    const deps = await createRealDeps({
      databaseUrl: globalThis.__PG__!.connectionString,
      paymentBaseUrl: process.env.STUB_PAYMENT_URL!,
    });
    app = createApp(deps);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('注册用户下单支付成功后，订单以 paid 状态落库', async () => {
    // 1. 通过 API 注册
    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ email: `e2e_${Date.now()}@example.com`, password: 'A-strong-pass-1' });
    expect(signup.status).toBe(201);
    const token = signup.body.token;
    const userId = signup.body.user.id;

    // 2. 通过 API 下单
    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 199 });
    expect(order.status).toBe(201);
    const orderId = order.body.id;

    // 3. 直接查数据库核对最终状态
    const result = await pool.query(
      'SELECT status, amount, user_id FROM orders WHERE id = $1',
      [orderId],
    );
    expect(result.rows[0]).toEqual({
      status: 'paid',
      amount: 199,
      user_id: userId,
    });
  });
});
```

#### 6.2 鉴权与固定时间

E2E 不应绕过鉴权，但可以通过真实登录获取 token；时间相关断言（如“30 分钟后订单超时”）通过向应用注入固定时钟或使用假定时器触发，而不是真的等待 30 分钟。

#### 6.3 常见误区

> 误区：为图方便在 E2E 里直接调用 Service 方法做“前置准备”。

前置走了捷径，接口链路（注册、鉴权）就没有被完整验证；前置数据也应通过 API 创建。

### 7. 契约测试概念

#### 7.1 微服务协作的接口失配问题

当服务 A（消费方）调用服务 B（提供方），常见事故是 B 修改了字段名或必填项，A 在集成时才发现。E2E 把所有服务部署在一起能发现问题，但成本高、反馈晚。契约测试只验证“双方对请求/响应结构的约定”，不验证业务结果。

```text
消费方驱动契约（consumer-driven）：
1. 消费方把自己发出的请求和期望响应记录成一份契约
2. 提供方在 CI 中拉取所有消费方契约，逐一验证当前实现仍满足
3. 任一方破坏约定，在自己的流水线里立即失败，不需要双方同时部署
```

#### 7.2 契约长什么样

契约可以先用最简单的 JSON Schema 表达，理解“结构约定”这个本质：

```json
{
  "consumer": "web-api",
  "provider": "user-service",
  "request": {
    "method": "GET",
    "path": "/users/1001"
  },
  "response": {
    "status": 200,
    "body": {
      "id": 1001,
      "email": "string",
      "status": "active"
    },
    "required": ["id", "email", "status"]
  }
}
```

提供方验证时只检查：路由存在、状态码一致、响应体满足 schema 与必填项；`email` 的具体值并不重要。

#### 7.3 工具生态与定位

- Pact：消费方驱动契约的主流实现，支持多语言，契约通过 Pact Broker 在双方流水线间流转。
- Schemathesis：基于 OpenAPI 对提供方做 schema 驱动的用例生成与校验，适合单服务保证“实现不背离文档”。

契约测试与 E2E 的分工：契约保证“接得上”，E2E 保证“整条业务跑得通”；前者快而多，后者慢而少。

#### 7.4 常见误区

> 误区一：把业务规则断言塞进契约。

契约会变得臃肿且频繁失败；业务正确性由各方自己的测试保证。

> 误区二：有了契约测试就删掉 E2E。

结构匹配不代表部署、网络、数据协同没有问题，关键路径仍需少量 E2E。

### 8. 关键路径覆盖与 flaky 治理

#### 8.1 按关键路径而不是接口数量设计 E2E

```text
第一步：列出业务生命线（断了就是 P0 事故的路径）
  注册登录、下单支付、内容发布与可见、退款到账
第二步：每条生命线一条正向 E2E + 一条最关键失败分支
  下单成功 / 支付失败订单不落成 paid
第三步：其余边界与组合交给单元和集成测试
```

衡量 E2E 质量的指标不是百分比，而是：P0 路径是否全覆盖、失败时是否指向具体环节、近一个月是否出现非代码原因的失败。

#### 8.2 flaky 的四类根因

| 根因 | 典型表现 | 治理手段 |
|---|---|---|
| 时间 | 断言当前时间、用固定 sleep 等待 | 注入时钟、轮询等待条件、fake timers |
| 顺序 | 单跑失败、整套能过 | 每用例自建数据、禁止依赖前序用例 |
| 并行 | 唯一字段冲突、共享库互相清理 | 临时库/事务隔离、faker 生成唯一值 |
| 残留 | 第一次失败第二次通过 | 统一 cleanup、容器即用即弃 |

#### 8.3 等待条件而非固定延时

```ts
// 反模式
await new Promise((r) => setTimeout(r, 2000));

// 正确：轮询直到条件成立或超时
async function waitFor<T>(
  fn: () => Promise<T>,
  { timeout = 5000, interval = 50 }: { timeout?: number; interval?: number } = {},
): Promise<T> {
  const deadline = Date.now() + timeout;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      await new Promise((r) => setTimeout(r, interval));
    }
  }
  throw lastError;
}

// 用法：等待异步状态在数据库中出现
await waitFor(async () => {
  const { rows } = await pool.query(
    'SELECT status FROM email_logs WHERE user_id = $1',
    [userId],
  );
  if (rows[0]?.status !== 'sent') throw new Error('邮件状态未就绪');
});
```

#### 8.4 flaky 治理流程

```text
1. 任何用例非代码原因失败，立即标记并隔离，不允许“重跑就好”
2. 收集失败日志与数据库快照，按四类根因归因
3. 修复后对应用例连续重跑（如 20 次）验证稳定性
4. 在 CI 上统计 flaky 率，作为测试体系健康度指标
```

#### 8.5 与后端系统的关系

flaky 的危害不是“多等几分钟”，而是团队对红灯失去信任：当真正的缺陷红灯亮起时，大家也会习惯性点重跑。守住 E2E 的稳定性，等于守住整个质量信号的可信度。

#### 8.6 常见误区

> 误区一：通过给所有用例加大超时“治好”偶发失败。

慢用例掩盖了竞态根因，套件越来越慢；应定位等待对象。

> 误区二：偶发失败不归任何人管。

必须有归属与闭环，否则 flaky 会像传染病一样扩散到整个套件。

## 课后题

1. API E2E 与厚集成测试都连真实数据库，请说明区分二者的三个维度。
2. 测试数据库隔离有哪三种策略？请按“隔离强度、速度、环境要求”比较它们。
3. 为什么 E2E 要求在测试库上执行完整迁移，而不是手工维护一份简化表结构？
4. 事务回滚隔离为什么要求应用复用测试开启事务的同一个连接？应用使用独立连接池时会发生什么？
5. 什么是基线种子和用例数据？为什么用例不应依赖其他用例创建的数据？
6. 什么是消费方驱动契约测试？它与 E2E 在验证服务协作时是怎样分工的？
7. 场景分析：某 E2E 在本地“单跑失败、整套跑通过”。请判断最可能的根因类别，并给出数据组织上的修正方案。
8. 场景分析：CI 两个作业并行跑同一套 E2E，偶发“邮箱已存在”的唯一索引冲突。请给出两种可行的隔离改造，并说明 builder 中应如何生成数据。
9. 场景分析：某用例第一次运行失败、不改动任何代码重跑第二次通过，数据库中多出一条上一次的订单。请分析根因并设计 cleanup 与验证方案。
10. 场景分析：团队在 E2E 中用 `setTimeout(3000)` 等待异步发券，机器负载高时频繁失败。请解释固定等待为什么必然 flaky，并用轮询等待重写。

## 实践练习题

### 练习 1：独立测试库与种子清理

#### 任务

为“知识条目”接口搭建独立测试数据库，实现迁移、基线种子与表级清理，完成“创建后能查到、清理后查不到”的 E2E 闭环。

#### 步骤约束

1. 创建 `app_test` 数据库，连接串只从环境变量读取，并编写误用保护：连接到库名不含 `test` 的地址时直接拒绝启动。
2. globalSetup 执行迁移并插入基线种子（至少一种系统角色）。
3. 编写 `createItem` builder，标题使用 faker 生成，保证并行不冲突。
4. 用例：POST 创建条目 → GET 查到该条目 → afterEach 按 id 清理 → 再查为 404。
5. 连续运行三次，确认无残留、结果一致。

#### 提交物

- globalSetup、迁移与种子脚本；
- builder 与 E2E 用例；
- 三次运行记录与数据库为空的核对结果。

#### 验收标准

- 测试全程不接触开发/生产库；
- 用例数据就近创建、按 id 清理；
- 单用例可独立运行；
- 无固定延时。

### 练习 2：事务回滚隔离改造

#### 任务

把练习 1 的清理方式改造成事务回滚：每个用例在事务中运行，结束自动回滚，并验证“故意造的脏数据”在库中不存在。

#### 步骤约束

1. beforeEach 中 `BEGIN`，afterEach 中 `ROLLBACK`，不再使用 DELETE/TRUNCATE。
2. 通过连接池劫持或请求上下文，保证应用的写入复用该事务客户端。
3. 用例中创建两条数据并断言接口可见；用例结束后用独立连接查询，断言两条数据都不存在。
4. 说明哪一类用例（跨连接锁/提交可见性）不适合本策略，并把它们标注为继续走表清理。

#### 提交物

- 事务上下文代码；
- 改造后的用例与独立连接核对代码；
- 策略适用边界说明。

#### 验收标准

- 用例结束库中零残留；
- 应用确实复用测试事务（提交不发生）；
- 明确列出不适用场景；
- 运行速度较表清理有可说明的提升。

### 练习 3：容器化 E2E 关键路径

#### 任务

使用 testcontainers 启动一次性 Postgres，跑通“注册 → 登录 → 发布知识条目 → 公开列表可见”完整关键路径，结束后容器自动销毁。

#### 步骤约束

1. globalSetup 启动固定版本的 Postgres 容器，执行迁移与基线种子；teardown 保证容器停止。
2. 所有前置数据（用户、条目）都通过 API 创建，不直接调 Service。
3. 发布后通过公开 GET 接口断言新条目出现，异步索引类等待使用轮询条件而非固定 sleep。
4. 第三方通知边界以 Stub 容器或进程内替身替换，全程无真实外网。
5. 演示：用例结束后 `docker ps` 中无残留容器。

#### 提交物

- 容器 setup/teardown 代码；
- 关键路径 E2E 文件；
- 全绿记录与容器销毁证据。

#### 验收标准

- 数据库版本固定、即用即弃；
- 路径只走 HTTP，鉴权真实；
- 连续三次稳定通过；
- 无残留容器与数据。

## 阶段验收作业

### 作业名称

真实数据库的 API E2E 套件与隔离方案

### 作业场景

团队要求你为“账户 + 知识条目 + 下单”模块交付一套 E2E：必须连真实数据库、执行真实迁移、覆盖业务生命线，并能在 CI 并行环境下稳定运行。评审重点是隔离策略是否合理、数据是否干净、关键路径是否完整、有没有 flaky 隐患，而不是用例数量。

### 提交物

```text
api-e2e/
├── src/
│   ├── app.ts
│   └── deps.ts
├── test/
│   └── e2e/
│       ├── global-setup.ts
│       ├── global-teardown.ts
│       ├── database.ts
│       ├── seeds/
│       │   └── baseline.ts
│       ├── builders/
│       │   └── user.builder.ts
│       ├── auth.e2e.test.ts
│       ├── item.e2e.test.ts
│       └── order.e2e.test.ts
├── contracts/
│   └── user-service.contract.json
├── vitest.config.ts
└── README.md
```

提交要求：

1. E2E 用例不少于 8 条，覆盖注册登录、发布可见、下单支付三条生命线，每条生命线至少含一条失败分支。
2. 同时实现两种隔离：本地以独立库/事务回滚运行，提供容器化 setup 供 CI 使用，并在 README 说明切换方式。
3. 含一份契约文件（JSON Schema 形式）并说明提供方应如何校验。
4. 所有数据通过 builder + faker 创建，用例间无依赖；有统一 cleanup。
5. 测试代码通过类型检查；无真实外网请求、无真实个人信息与凭据。

### 演示步骤

学员在 15 分钟内完成：

1. 展示误用保护：把连接串改成开发库地址时测试拒绝启动。
2. 用容器方式启动并跑通全部 E2E，展示迁移日志。
3. 单独运行一个用例文件，再整体运行，说明数据互不依赖。
4. 演示一条生命线的成功路径，并直接查询数据库核对最终状态。
5. 演示一条失败分支（如支付 Stub 返回失败），断言数据未以成功状态落库。
6. 讲解契约文件内容，并把套件连续运行三次展示稳定性；结束后展示无残留容器。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| E2E 边界理解 | 10 | 正确区分 E2E/集成/单元，入口只走 HTTP |
| 数据库隔离 | 25 | 独立库/事务/容器策略实现合理，含误用保护 |
| 种子与清理 | 20 | 基线种子清晰，builder 唯一，用例零残留 |
| 关键路径覆盖 | 20 | 三条生命线完整且含失败分支，有数据库核对 |
| 契约测试 | 10 | 契约结构正确，能说明提供方验证方式 |
| flaky 治理与规范 | 15 | 无固定等待，可并行，连跑三次稳定，README 完整 |

细分规则：

- 边界理解 10 分：E2E 定义 5 分，只走 HTTP 与真实迁移 5 分。
- 隔离 25 分：独立库 6 分，事务回滚 8 分，容器化 8 分，误用保护 3 分。
- 种子清理 20 分：基线种子 5 分，builder/faker 8 分，cleanup 与零残留 7 分。
- 路径覆盖 20 分：三条生命线正向 12 分，失败分支 5 分，数据库核对 3 分。
- 契约 10 分：schema 结构 6 分，验证流程说明 4 分。
- flaky 与规范 15 分：轮询等待 6 分，三次稳定 5 分，README 4 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. E2E 连接开发库或生产库，或缺少连接目标保护。
2. 测试库结构没有执行迁移，靠手工建表维持。
3. 用例依赖其他用例的数据或执行顺序，不能单独运行。
4. 出现固定毫秒级等待，或连续三次运行中有任何偶发失败。
5. 只覆盖成功路径，生命线没有失败分支，也不核对数据库最终状态。
6. 用例结束后残留数据或容器，并行时发生唯一字段冲突。
7. 提交真实个人信息、密码、令牌，或测试访问真实第三方服务。
8. 代码无法按 README 在评审环境复现。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 界定 API E2E 与其他测试的边界 | 演示讲解、用例入口只走 HTTP |
| 掌握三种数据库隔离策略 | `database.ts`、容器 setup、演示步骤 2 |
| 编写种子与清理并保证可重复 | `seeds/`、`builders/`、cleanup 记录 |
| 组织真实 E2E 并核对数据落库 | 三个 e2e 文件、演示步骤 4 |
| 理解契约测试 | `contracts/` 文件与说明 |
| 设计关键路径覆盖 | 三条生命线及失败分支 |
| 系统治理 flaky | 轮询等待、三次稳定运行记录 |

### 提交前自检

- [ ] E2E 只能拿到名称含测试标识的数据库地址。
- [ ] 每次运行都执行完整迁移，库结构与迁移文件一致。
- [ ] 所有用例数据由 builder 创建并可按 id 清理，或由事务回滚。
- [ ] 生命线的成功与失败路径都断言了响应与数据库状态。
- [ ] 不存在固定 sleep，异步状态以轮询条件等待。
- [ ] 容器与临时库在用例结束后被销毁或删除。
- [ ] 任一用例单独运行、并行运行、连续三次运行结果一致。
- [ ] README 说明两种隔离方式的切换命令与环境前提。
