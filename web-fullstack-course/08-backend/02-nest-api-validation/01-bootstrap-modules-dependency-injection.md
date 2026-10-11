# Nest 启动、模块与依赖注入：让对象所有权可追踪

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 手动建立 Nest 12 ESM 应用，追踪 bootstrap、module、controller、service、repository 的所有权 |
| 练习目录 | `$HOME/code/market-backend-lab/nest-api` |
| 固定基线 | Node.js 24、pnpm 12.11.2、NestJS 12.1.2、TypeScript 6 兼容装饰器线 |
| 主要产物 | `main.ts`、`AppModule`、`ListingsModule`、服务与内存仓储 provider |
| 成功证据 | `pnpm build` 后可启动；GET 列表返回明确静态教学商品 |
| 失败证据 | 移除仓储 provider 后启动失败并指出无法解析依赖 |
| 环境标签 | **内存仓储、源码静态种子、固定身份替身、无数据库/认证** |

## 1. 任务背景

第 1 章把所有 HTTP 职责放在少量函数中，便于观察原生协议。业务增长后，如果控制器同时解析输入、
执行业务规则、访问数据库和决定错误正文，任何修改都会牵动整条路径。

Nest 的价值不在装饰器数量，而在对象图与边界：

```text
NestFactory
  -> AppModule
      -> ListingsModule
          -> ListingsController
              -> ListingsService
                  -> LISTINGS_REPOSITORY
                      -> MemoryListingsRepository
```

依赖注入容器根据 module 注册创建对象。控制器不应手工 `new ListingsService()`，服务也不应偷偷创建
数据库连接。谁注册、谁导出、谁注入都应在代码中可追踪。

## 2. 学习目标

完成本课后，你能够：

1. 解释 `NestFactory.create()` 到端口监听的启动链；
2. 配置 Nest 12 ESM 与 TypeScript 装饰器元数据；
3. 区分 root module、feature module、controller 和 provider；
4. 使用 symbol token 注入仓储端口；
5. 说明 provider 默认 singleton 的生命周期与状态风险；
6. 区分 singleton、request scope 和 transient，不滥用 request scope；
7. 让 service 不依赖 HTTP response，让 repository 不决定状态码；
8. 用 DI 启动失败定位缺失注册；
9. 明确内存仓储和静态种子不是持久化数据。

## 3. 预备知识

完成[第 01 章](../01-node-runtime-http/01-node-process-event-loop-lifecycle.md)，并阅读
[版本基线](../../00-guide/version-baseline.md)。Nest 12 核心包采用 ESM；本课使用手动初始化，
避免脚手架默认测试/Lint 配置随版本漂移。

创建练习目录：

```bash
mkdir -p "$HOME/code/market-backend-lab/nest-api/src/listings"
cd "$HOME/code/market-backend-lab/nest-api"
node --version
pnpm --version
pnpm init
pnpm add -E @nestjs/common@12.1.2 @nestjs/core@12.1.2 \
  @nestjs/platform-express@12.1.2 reflect-metadata rxjs
pnpm add -D -E typescript@6.0.3 @types/node@24.19.2
```

让 pnpm 生成并维护锁文件。不要从教材手写 `pnpm-lock.yaml`。将清单设置为 ESM 并添加脚本：

```bash
pnpm pkg set type=module
pnpm pkg set scripts.build='tsc -p tsconfig.json'
pnpm pkg set scripts.start='node dist/main.js'
```

安装后运行 `pnpm list --depth 0`，保存实际版本。只有三个 Nest 核心/平台包必须精确同为 `12.1.2`；
不要混装主版本 11。

## 4. 核心理论

### 4.1 bootstrap 只组合基础设施

`main.ts` 负责创建 Nest application、设置全局前缀/管道/过滤器、注册关闭钩子并监听端口。
它不应写商品规则或 SQL。启动失败要让进程非零退出，不能打印错误后继续一个半初始化实例。

### 4.2 module 是可见性边界

`@Module` 的关键字段：

- `imports`：引入其他 module 导出的能力；
- `controllers`：登记由框架实例化的 HTTP 控制器；
- `providers`：登记服务、仓储、工厂或值；
- `exports`：明确哪些 provider 可被其他 module 注入。

provider 只在所属 module 可见，除非导出并由使用方导入。把所有 provider 都放进 `AppModule`
会失去边界，也会让测试装配越来越困难。

### 4.3 controller、service、repository 的责任

| 层 | 负责 | 不负责 |
| --- | --- | --- |
| Controller | 路由、输入适配、调用服务、声明 HTTP 成功状态 | SQL、事务、Cookie 身份真伪 |
| Service | 用例与业务规则、协调仓储/事务 | Express response、数据库字段映射细节 |
| Repository | 查询与持久化接口 | HTTP 状态、面向用户的消息 |
| Module | 注册与组合对象图 | 运行每次请求的业务逻辑 |

本课仓储是内存实现；第 4 章会增加 PostgreSQL 实现。service 依赖 token，而不是依赖具体内存类，
使替换发生在 module 注册处。

### 4.4 provider token 解决运行时接口消失

TypeScript `interface` 编译后不存在，不能单独作为 Nest 运行时 token。使用 symbol：

```ts
export const LISTINGS_REPOSITORY = Symbol("LISTINGS_REPOSITORY");
```

模块把 token 映射到实现，service 通过 `@Inject(token)` 请求能力。接口继续负责静态形状，
symbol 负责运行时身份。

### 4.5 scope 不是越细越安全

默认 singleton provider 在应用生命周期只创建一次，适合无请求可变状态的 service 和连接池。
request-scoped provider 每个请求创建，并会把 request scope 沿依赖链传播，增加分配和复杂度。
transient 每次注入创建。

本课 `MemoryListingsRepository` 是 singleton，所以数组被所有请求共享；这正是教学替身的限制。
真实请求身份不应存进 singleton 字段，否则并发用户会串号。身份应从每次请求上下文显式传入服务。

### 4.6 ESM 与装饰器元数据

`module/moduleResolution: NodeNext` 下，相对导入在 TypeScript 源码中写 `.js` 后缀，编译后的 Node ESM
才能直接加载。Nest 构造器注入依赖依赖运行时类/装饰器元数据；本课启用
`experimentalDecorators` 和 `emitDecoratorMetadata`。

DTO 类在后两课必须以值导入，不能只用 `import type`，否则运行时无法看到构造器。

## 5. 元素、属性、API 或配置清单

| 元素 / 配置 | 本课用法 | 边界 |
| --- | --- | --- |
| `NestFactory.create` | 从 `AppModule` 构建应用图 | 尚未监听时不能接请求 |
| `app.setGlobalPrefix` | 固定 `/api/v1` | 不提供版本迁移策略 |
| `app.enableShutdownHooks` | 让 provider 生命周期钩子接收信号 | 仍需资源实现关闭 |
| `@Module` | 声明 imports/controllers/providers/exports | 不是业务对象 |
| `@Controller("listings")` | 绑定资源路径 | 不应保存数组 |
| `@Injectable()` | 让 class 可由容器管理 | 不自动选择 scope 之外的实现 |
| `@Inject(token)` | 按运行时 token 注入 | token 必须在 module 可见 |
| `useClass` | token 映射到实现类 | 默认由容器创建实例 |
| `Scope.DEFAULT` | singleton | 不存请求用户状态 |
| `Scope.REQUEST` | 每请求实例 | 有传播和性能成本 |
| `Scope.TRANSIENT` | 每注入点实例 | 易产生更多对象 |
| `NodeNext` | Node ESM 编译/解析 | 相对导入写 `.js` |
| `emitDecoratorMetadata` | 发射传统装饰器元数据 | 不是输入校验本身 |
| `strict` | 开启严格类型检查 | 不能校验外部 JSON |

## 6. 最小可运行案例

### 6.1 TypeScript 配置

创建完整文件 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "types": ["node"],
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*.ts"]
}
```

创建完整文件 `src/main.ts`：

```ts
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

const app = await NestFactory.create(AppModule);
app.setGlobalPrefix("api/v1");
app.enableShutdownHooks();
await app.listen(3000, "127.0.0.1");
console.log("listening http://127.0.0.1:3000/api/v1");
```

创建完整文件 `src/app.module.ts`：

```ts
import { Module } from "@nestjs/common";
import { ListingsModule } from "./listings/listings.module.js";

@Module({
  imports: [ListingsModule],
})
export class AppModule {}
```

### 6.2 领域类型与仓储端口

创建完整文件 `src/listings/listing.ts`：

```ts
export type ListingStatus = "available" | "reserved" | "sold";

export type Listing = Readonly<{
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: ListingStatus;
  ownerId: string;
  version: number;
  createdAt: string;
}>;
```

创建完整文件 `src/listings/listings.repository.ts`：

```ts
import type { Listing } from "./listing.js";

export const LISTINGS_REPOSITORY = Symbol("LISTINGS_REPOSITORY");

export interface ListingsRepository {
  findAll(): readonly Listing[];
}
```

### 6.3 明确标注的内存实现

创建完整文件 `src/listings/memory-listings.repository.ts`：

```ts
import { Injectable } from "@nestjs/common";
import type { Listing } from "./listing.js";
import type { ListingsRepository } from "./listings.repository.js";

const STATIC_TEACHING_LISTING: Listing = Object.freeze({
  id: "10000000-0000-4000-8000-000000000001",
  title: "台灯",
  description: "源码内静态教学数据，暖光，可自提",
  priceCents: 1990,
  status: "available",
  ownerId: "demo-user",
  version: 1,
  createdAt: "2026-10-11T08:00:00.000Z",
});

@Injectable()
export class MemoryListingsRepository implements ListingsRepository {
  private readonly items: Listing[] = [STATIC_TEACHING_LISTING];

  findAll(): readonly Listing[] {
    return [...this.items];
  }
}
```

这里的数组、商品和身份都来自进程内存/源码。它不证明外部 JSON、认证或持久化。

## 7. 邻里集市集成案例

### 7.1 service 与 controller

创建完整文件 `src/listings/listings.service.ts`：

```ts
import { Inject, Injectable } from "@nestjs/common";
import {
  LISTINGS_REPOSITORY,
  type ListingsRepository,
} from "./listings.repository.js";

@Injectable()
export class ListingsService {
  constructor(
    @Inject(LISTINGS_REPOSITORY)
    private readonly repository: ListingsRepository,
  ) {}

  list() {
    const items = this.repository.findAll();
    return {
      items,
      page: 1,
      pageSize: 20,
      total: items.length,
    };
  }
}
```

创建完整文件 `src/listings/listings.controller.ts`：

```ts
import { Controller, Get } from "@nestjs/common";
import { ListingsService } from "./listings.service.js";

@Controller("listings")
export class ListingsController {
  constructor(private readonly listings: ListingsService) {}

  @Get()
  list() {
    return this.listings.list();
  }
}
```

### 7.2 feature module 组合

创建完整文件 `src/listings/listings.module.ts`：

```ts
import { Module } from "@nestjs/common";
import { ListingsController } from "./listings.controller.js";
import { MemoryListingsRepository } from "./memory-listings.repository.js";
import { LISTINGS_REPOSITORY } from "./listings.repository.js";
import { ListingsService } from "./listings.service.js";

@Module({
  controllers: [ListingsController],
  providers: [
    ListingsService,
    {
      provide: LISTINGS_REPOSITORY,
      useClass: MemoryListingsRepository,
    },
  ],
})
export class ListingsModule {}
```

构建和启动：

```bash
pnpm build
pnpm start
```

另一个终端：

```bash
curl -i http://127.0.0.1:3000/api/v1/listings
```

预期 200，固定分页中含台灯、`priceCents: 1990` 和 UTC ISO 时间。
这只证明 HTTP 到内存仓储的读取链；没有请求输入、数据库、会话或授权证据。

### 7.3 文件责任图

在个人 `evidence/di.md` 记录：

```markdown
# Nest DI 证据

- Node / pnpm / Nest 实际版本：
- build/start 命令与退出码：
- `AppModule -> ListingsModule`：
- `Controller -> Service`：
- `Service -> LISTINGS_REPOSITORY`：
- token 的实际实现：
- 响应中的整数分与 UTC 时间：
- 当前替身：内存数组、静态商品、demo-user
```

## 8. 常见错误与排查路径

### 8.1 明确错误：移除 repository provider

临时把 `ListingsModule.providers` 改成只含 `ListingsService`：

```ts
providers: [ListingsService]
```

执行：

```bash
pnpm build
pnpm start
```

五段记录：

| 项目 | 证据 |
| --- | --- |
| 现象 | 应用启动失败，端口不监听 |
| 证据 | Nest 指出无法解析 `ListingsService` 的 repository token 依赖 |
| 原因 | interface 不存在于运行时，symbol token 也没有 provider 映射 |
| 修复 | 恢复 `{ provide: LISTINGS_REPOSITORY, useClass: MemoryListingsRepository }` |
| 复验 | 启动成功，GET 返回 200；不能在 service 中手工 new 仓储 |

### 8.2 controller 手工创建 service

错误写法：

```ts
private readonly listings = new ListingsService(
  new MemoryListingsRepository(),
);
```

**现象：** module 覆盖、测试替换和生命周期钩子失效。
**证据：** provider 配置变化不影响手工对象。
**原因：** 绕过容器建立第二套对象图。
**修复：** 只通过构造器注入。
**复验：** 故障 provider 会让启动失败，恢复后链路唯一。

### 8.3 相对导入漏 `.js`

**现象：** TypeScript 诊断或 Node 运行时报模块找不到。
**证据：** 编译产物保留了无法解析的相对 specifier。
**原因：** NodeNext 按 Node ESM 规则解析。
**修复：** 源码相对导入写编译后扩展名 `.js`。
**复验：** `pnpm build && pnpm start`。

### 8.4 把当前用户放入 singleton 字段

**现象：** 并发请求可能读到另一个用户的身份。
**证据：** service/repository 的可变 `currentUser` 被所有请求共享。
**原因：** 默认 singleton 生命周期跨请求。
**修复：** 身份从认证 guard/request context 得到，再作为参数进入用例；不存全局字段。
**复验：** 后续使用两用户测试证明对象授权，当前章节不虚构通过。

### 8.5 用 request scope 修复所有状态问题

**现象：** 大量 provider 被级联成 request scope，装配和性能成本上升。
**原因：** 没有先移除不该存在的请求可变状态。
**修复：** service 保持无状态，显式传参数；只有确有请求上下文职责时才选 request scope。
**复验：** provider scope 表与实际需求一一对应。

## 9. 课后题

**问题 1：为什么 repository interface 不能直接作为 Nest token？**
参考答案：TypeScript interface 编译后被擦除；Nest 运行时需要 class、string 或 symbol 等真实值。

**问题 2：`@Injectable()` 是否自动把 class 加进所有 module？**
参考答案：不会。它声明可由容器管理，仍需在当前 module 的 providers 中注册或从导入 module 获得。

**问题 3：默认 singleton 为什么不能保存当前用户？**
参考答案：实例跨请求共享，可变身份会串到并发请求；身份应属于请求上下文并显式进入业务用例。

**问题 4：为什么 controller 不应该直接返回 Express response？**
答案标准：指出这会把业务与平台细节耦合，降低测试/适配能力；必要的流式特例可以显式处理，但不是默认。

## 10. 实践练习

### 基础：增加 health module

建立独立 `HealthModule` 与 `HealthController`，提供 `GET /api/v1/health/live`。

可判定标准：

- `AppModule` 通过 imports 引入；
- controller 不依赖 listings；
- 返回 `{ok:true}`；
- 不虚构数据库 readiness。

### 进阶：增加第二个仓储实现用于测试装配

实现只返回空数组的 `EmptyListingsRepository`，只在独立测试 module 中映射 token。

可判定标准：

- service 源码不修改；
- module 注册决定实现；
- 生产练习仍明确使用 Memory 实现；
- 不把 mock 结果称为真实数据库。

### 故障注入：错误导出边界

创建一个消费 `ListingsService` 的临时 module，但既不从 `ListingsModule` 导出 service，也不重新注册。

可判定标准：

1. 启动先失败；
2. 错误指向 provider 可见性；
3. 根据真实需求决定是否 `exports: [ListingsService]`；
4. 恢复后启动成功；
5. 不把全部 provider 无条件导出。

## 11. 阶段验收

```bash
cd "$HOME/code/market-backend-lab/nest-api"
node --version
pnpm --version
pnpm list --depth 0
pnpm build
pnpm start
```

另一个终端读取列表。通过标准：

- Node 24、Nest 12.1.2 核心与平台版本证据已保存；
- ESM 编译产物可以由 Node 启动；
- GET 链路能从 controller 追到 token 和内存实现；
- 台灯价格为整数 `1990`，时间为 UTC ISO；
- 缺 provider 的故障先失败，恢复后成功；
- service/controller 没有手工 new 依赖；
- 当前数据和身份替身标注清楚；
- 没有把 build、200 响应或静态种子称为数据库/认证通过。

## 12. 常见问题

**为什么本课不用 Nest CLI？**
手动建立最小配置能看清 ESM、装饰器和 provider 边界；真实团队可使用 CLI，但必须审查生成默认值。

**所有 provider 都应该有 interface 和 symbol 吗？**
不必。只有需要替换实现或隔离边界时才值得增加 token；单一、稳定的 service 可直接按 class 注入。

**内存 repository 可用于单元测试吗？**
可以作为显式 fake，但它不能证明 SQL、约束、事务和数据库类型映射正确。

**`enableShutdownHooks()` 是否已经完成优雅停机？**
没有。它让 Nest 生命周期钩子有机会运行；每个真实资源仍需实现关闭，部署窗口也需运行验证。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [NestJS 12 Migration Guide](https://docs.nestjs.com/migration-guide)：Nest 12 ESM 与迁移边界。
- [NestJS 12.1.2 Release](https://github.com/nestjs/nest/releases/tag/v12.1.2)：固定补丁来源。
- [NestJS Modules](https://docs.nestjs.com/modules)：module 可见性与导出。
- [NestJS Providers](https://docs.nestjs.com/providers)：provider 注册与注入。
- [NestJS Injection Scopes](https://docs.nestjs.com/fundamentals/injection-scopes)：scope 成本。
- [TypeScript `emitDecoratorMetadata`](https://www.typescriptlang.org/tsconfig/emitDecoratorMetadata.html)：传统元数据发射。
- [Node.js Packages](https://nodejs.org/api/packages.html)：Node ESM 包和 specifier。

## 我现在能做到什么

我能手动建立 Nest 12 ESM 应用，沿 module/provider 图追踪对象创建与可见性，使用运行时 token 隔离仓储实现，
并识别 singleton 请求状态、手工 new 依赖和错误 scope 带来的所有权问题。

## 单元导航

[返回章目录](../README.md#02-nestjs-与输入验证) ·
[上一章：Node 超时、错误与优雅停机](../01-node-runtime-http/03-timeouts-errors-graceful-shutdown.md) ·
[下一课：DTO 转换与运行时校验](02-dto-transformation-validation.md)
