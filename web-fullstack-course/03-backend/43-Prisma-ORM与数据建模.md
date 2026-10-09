# 43-Prisma ORM 与数据建模

## 目标

完成本知识单元后，学员应能把前两个单元的关系模型和 SQL，换成一套以 TypeScript 类型为中心的 ORM 工作方式，并理解这种抽象的边界。

学员应能够：

1. 说明 ORM 解决的问题，以及 Prisma 在“schema、引擎、客户端”三层的定位。
2. 编写 `schema.prisma` 中的 `datasource`、`generator` 配置，并用字段属性表达主键、默认值、唯一、枚举、可空与原生类型。
3. 在 Prisma schema 中正确建模 1:1、1:N 和 M:N 关系，理解关系字段与外键的配对规则。
4. 使用 Prisma Client 完成类型安全的增删改查与条件过滤。
5. 使用 `include`、`select` 与嵌套写控制关系加载、返回形状并完成关联写入。
6. 正确管理 Prisma Client 的生命周期，避免开发环境重复实例化，并复用生成类型。

本单元以 Prisma 当前稳定大版本与 PostgreSQL 当前稳定大版本为准。命令名称和核心 API 长期稳定；部分生成器与预览特性可能随版本演进，应以当前版本文档为准，课程不锁定小版本。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Prisma ORM 当前稳定大版本 | schema 建模、迁移、生成客户端 | 能写 schema、执行 CLI、调用 Client |
| Prisma Client（生成到项目中） | 后端数据访问层 | 能完成 CRUD 与关系查询 |
| Prisma CLI | 初始化、生成、迁移、可视化 | 能区分 generate / migrate / studio |
| PostgreSQL 当前稳定大版本 | 底层数据库 | 理解 schema 与真实表的对应 |
| TypeScript 当前稳定大版本 | 类型安全的宿主语言 | 能读懂推断类型与生成类型 |
| Node.js 当前 LTS | 运行后端脚本 | 能管理客户端单例与环境变量 |

环境说明：

- 连接串通过环境变量注入，格式形如 `postgresql://用户:密码@主机:端口/数据库名?schema=public`，只能出现在本地 `.env` 中，不得提交真实值。
- 示例中的 `npx prisma` 命令会使用项目内安装的当前版本；全局安装不作为要求。
- 修改 schema 后通常需要重新生成客户端，TypeScript 类型才会更新。
- Prisma 的字段命名使用 camelCase，通过映射属性对应数据库中的 snake_case 列，二者命名风格不要混用。
- 本单元只做建模与数据访问；迁移工作流细节与查询性能优化在下一单元展开。

开始前检查环境：

```bash
node -v
npm ls prisma @prisma/client
npx prisma -v
```

预期观察：

- `node -v` 输出当前 LTS 版本。
- `npm ls` 能看到 `prisma`（开发依赖）与 `@prisma/client`（运行时依赖）。
- `npx prisma -v` 输出 CLI、客户端与引擎版本信息。

## 详细的理论知识讲解和示例伪代码

### 1. Prisma 的定位与组成

#### 1.1 定义

**ORM（Object-Relational Mapper，对象关系映射）**在关系数据库与编程语言对象之间建立映射，让开发者用操作对象的方式读写数据，少写甚至不写手写 SQL。

Prisma 由三部分组成：

- **Prisma schema**：一份声明式文件，描述数据源、生成器和数据模型，是单一事实源。
- **Prisma 引擎**：负责把 schema 转换为数据库结构、把客户端调用翻译为 SQL 并返回结果。
- **Prisma Client**：根据 schema 生成的、类型安全的数据访问客户端，每个模型都有带完整类型的方法。

#### 1.2 与后端的关系

在 Express、Fastify 或 Serverless 函数中，路由处理函数不再拼接 SQL 字符串，而是调用 `prisma.user.findMany()` 一类方法。收益是：表结构变化后重新生成客户端，字段拼错、类型用错在编译期就报错；代价是：多一层抽象，复杂查询、极限优化和数据库特有能力有时需要原生 SQL 补充。

#### 1.3 示例

```bash
# 在后端项目中初始化
npm install prisma --save-dev
npm install @prisma/client
npx prisma init
```

初始化后的典型结构：

```text
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   └── server.ts
├── .env
└── package.json
```

概念伪代码，对比裸 SQL 与 ORM：

```text
裸 SQL：
  写 SQL 字符串 → 手工传参 → 拿回无类型的行 → 手工断言字段
  改了列名，运行时才崩

Prisma：
  改 schema → 生成客户端 → 调用带类型的方法 → 拿到推断好的结果类型
  改了字段名，编译期就报错
```

#### 1.4 常见误区

> 用了 ORM 就不需要懂 SQL 和关系模型。

ORM 生成的仍是 SQL。不懂索引、JOIN 和事务，就无法理解 N+1、锁等待和迁移风险，只会把问题藏得更深。

> Prisma Client 是一个需要手写实现的类库。

客户端是根据你的 schema 生成出来的。模型、字段、枚举和类型都来自生成结果，手写声明会与真实结构脱节。

### 2. datasource、generator 与初始化配置

#### 2.1 定义

`schema.prisma` 以三个顶层块组织：

- `datasource`：声明数据库厂商与连接地址。
- `generator`：声明要生成什么客户端及输出位置。
- `model` / `enum`：声明数据结构（后续小节展开）。

连接串通过 `env("DATABASE_URL")` 从环境变量读取，配置与密钥分离。

#### 2.2 与后端的关系

本地开发、测试、生产使用各自的环境变量，同一份 schema 可以指向不同数据库。后端服务启动时读取环境变量，Prisma 客户端据此建立连接池。连接串绝不允许硬编码进源码或提交到版本库。

#### 2.3 示例

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

`.env` 示例（练习结束时 `.env` 应被版本库忽略）：

```bash
DATABASE_URL="postgresql://练习用户:练习密码@localhost:5432/练习库?schema=public"
```

配套的忽略规则与读取方式：

```bash
# .gitignore 中至少包含
node_modules
.env
```

```ts
// 服务入口：进程启动时环境变量必须已经存在
if (!process.env.DATABASE_URL) {
  throw new Error('缺少 DATABASE_URL 环境变量');
}
```

#### 2.4 常见误区

> 把连接串写在 schema 里最方便。

连接串含账号密码，写进 schema 会随代码提交泄露。正确做法是 `env()` 引用，并确保环境文件被忽略。

> generator 和 datasource 配置一次就永远不用动。

调整生成客户端的输出目录、更换数据库厂商或使用新生成器时都要改这两个块；理解每个块职责，才能看懂报错。

### 3. 模型与字段属性

#### 3.1 定义

`model` 块对应数据库中的一张表，字段语法为 `名称 类型 属性`。常用标量类型：`String`、`Int`、`BigInt`、`Float`、`Decimal`、`Boolean`、`DateTime`、`Json`、`Bytes`。

字段修饰符：

- `?`：可空字段，对应可列为 `NULL`。
- `[]`：列表字段（常用于隐式多对多或标量列表，具体支持以数据库为准）。

常用字段属性：

| 属性 | 含义 |
|---|---|
| `@id` | 主键 |
| `@default(...)` | 默认值，可含自增、随机值、当前时间等函数 |
| `@unique` | 唯一约束 |
| `@updatedAt` | 更新时自动写入当前时间 |
| `@map("name")` | 字段映射到指定数据库列名 |
| `@db.*` | 指定数据库原生类型（如 `@db.Timestamptz()`） |
| `@relation` | 声明关系（下一小节） |

模型级（块级）属性：`@@id`、`@@unique`、`@@index`、`@@map`。

#### 3.2 与后端的关系

TypeScript 中可空列会被生成为 `string | null`，忘记处理 `null` 会在编译期暴露；`DateTime` 列生成为 `Date`。字段属性等价于前两个单元学习的约束与类型：`@unique` 对应唯一约束，`@db.*` 对应 PostgreSQL 原生类型。

#### 3.3 示例

```prisma
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  role      Role     @default(USER)
  balance   Decimal  @default(0) @db.Decimal(12, 2)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz()

  posts Post[]

  @@map("users")
}

enum Role {
  USER
  ADMIN
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  body      String   @default("")
  published Boolean  @default(false)
  authorId  Int      @map("author_id")

  author User @relation(fields: [authorId], references: [id])

  @@map("posts")
}
```

生成后的 TypeScript 使用示例：

```ts
// name 可空，类型为 string | null，必须显式处理
const greeting = user.name === null ? '访客' : user.name;

// Decimal 列在客户端有专门表示；需要数字时显式转换
const balanceNumber = Number(user.balance);
```

#### 3.4 常见误区

> 不写 `?` 的字段在数据库里也是可空的。

不带 `?` 的字段默认按必填处理，迁移会生成非空列；可空语义必须显式写出。

> 应用里用 `number` 就够了，金额不需要 `Decimal`。

`Float` 是近似浮点，仍会产生精度误差；金额必须使用 `Decimal` 并在边界处谨慎转换。

### 4. 关系建模：1:1、1:N 与 M:N

#### 4.1 定义

Prisma 关系必须在两个模型上成对声明：一个**关系字段**（对象类型，不映射物理列）和必要时的一个**外键标量字段**（真实存储的列），通过 `@relation(fields: [外键], references: [引用列])` 连接。

- **1:N**：“多”的一侧持有外键标量字段，“一”的一侧声明列表。
- **1:1**：两侧都是单值字段，其中一侧必须加 `@unique` 保证唯一。
- **M:N**：
  - 隐式：两侧都声明列表，Prisma 自动维护底层关联表。
  - 显式：自定义中间模型持有两个外键，用于关联表还要存额外属性（如角色、加入时间）的场景。

#### 4.2 与后端的关系

API 的嵌套资源（用户的文章、订单的明细、文章的标签）全部由关系字段支撑。选择隐式还是显式多对多，取决于“关系本身是否有属性”：用户加入群组的时间、在群组中的角色，就必须用显式中间表。

#### 4.3 示例

```prisma
// 1:N：一个用户多篇文章
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[]
}

model Post {
  id       Int    @id @default(autoincrement())
  authorId Int
  author   User   @relation(fields: [authorId], references: [id])
}

// 1:1：用户与一份个人资料
model Profile {
  id     Int  @id @default(autoincrement())
  userId Int  @unique
  user   User @relation(fields: [userId], references: [id])
  bio    String
}

// 隐式 M:N：文章与标签
model Post {
  id        Int     @id @default(autoincrement())
  published Boolean @default(false)
  tags      Tag[]
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
}

// 显式 M:N：成员关系带角色
model Group {
  id      Int                  @id @default(autoincrement())
  members GroupMembership[]
}

model GroupMembership {
  id      Int   @id @default(autoincrement())
  userId  Int
  groupId Int
  role    String
  user    User  @relation(fields: [userId], references: [id])
  group   Group @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
}
```

概念伪代码，表达建模选择：

```text
问：关系两端各能对应几个？
  一 对 多 → 多端存外键
  一 对 一 → 外键端加唯一约束
  多 对 多 → 是否需要在关系上存数据？
               不需要 → 隐式
               需要   → 显式中间模型
```

#### 4.4 常见误区

> 关系字段本身会在数据库里生成一列。

`author User` 这样的关系字段是虚拟的，真正落库的是 `authorId` 外键标量字段；只写关系字段不写外键，schema 无法通过校验。

> 多对多一律隐式最省事。

隐式关联表只能存两端外键；一旦关系需要角色、时间、状态等属性，就必须改为显式中间模型，且后续迁移要付出改造成本。

### 5. Prisma Client 的 CRUD

#### 5.1 定义

每个模型在客户端上都有一组标准方法：

- 查询：`findUnique`、`findFirst`、`findMany`、`count`、`exists`（按当前版本提供）。
- 写入：`create`、`createMany`、`update`、`updateMany`、`upsert`、`delete`、`deleteMany`。

过滤条件支持丰富操作符：`equals`、`in`、`notIn`、`lt`、`lte`、`gt`、`gte`、`contains`、`startsWith`、`endsWith`，以及 `AND`、`OR`、`NOT` 组合。

#### 5.2 与后端的关系

REST 接口的方法与 Client 方法几乎一一对应：`GET /users/:id` → `findUnique`；列表搜索 → `findMany` + `where`；PUT 更新 → `update`；不存在则创建 → `upsert`。参数来自用户输入时直接作为对象传入，天然参数化，避免了手写 SQL 拼接的注入风险。

#### 5.3 示例

```ts
// 创建
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    profile: {
      create: { bio: '后端学习者' },
    },
  },
});

// 按唯一字段查询
const found = await prisma.user.findUnique({
  where: { email: 'alice@example.com' },
});

// 多条件列表
const list = await prisma.user.findMany({
  where: {
    role: 'ADMIN',
    posts: { some: { title: { contains: '数据库' } } },
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
});

// 更新与 upsert
await prisma.user.update({
  where: { id: 1 },
  data: { name: 'Alice' },
});

await prisma.user.upsert({
  where: { email: 'alice@example.com' },
  create: { email: 'alice@example.com' },
  update: { name: 'Alice' },
});

// 删除
await prisma.user.delete({ where: { id: 1 } });
```

#### 5.4 常见误区

> `update` 找不到记录时会静默返回 null。

按唯一条件更新但记录不存在时，Prisma 会抛出“记录不存在”的异常，而不是返回空值；需要不报错语义时使用 `upsert` 或先查询。

> 前端传什么过滤对象，后端就直接透传给 where。

where 对象必须在后端按接口契约白名单构造。直接透传任意对象会让调用方越权过滤（例如读取其他租户字段），这是典型的对象级授权漏洞。

### 6. include 与 select：关系查询与字段裁剪

#### 6.1 定义

- `include`：在返回标量字段的基础上，额外加载关系字段，并可继续嵌套。
- `select`：显式声明返回哪些字段（标量或关系），返回类型随之收窄。
- 二者都支持嵌套过滤关系列表，如对文章列表加 `where`、`orderBy`、`take`。

`include` 回答“还要带上关联数据”；`select` 回答“只要这些字段”。

#### 6.2 与后端的关系

详情页需要“用户 + 文章 + 每篇文章的标签”，一次嵌套 include 即可装配；对外暴露的公开接口应使用 select 只返回安全字段，避免把邮箱、内部状态或余额意外序列化进响应。返回类型由选择结果精确推断，前端可据此约定数据契约。

#### 6.3 示例

```ts
// include：用户及其文章
const userWithPosts = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    },
  },
});

// select：公开视图只暴露安全字段
const publicUsers = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    posts: {
      select: { id: true, title: true },
    },
  },
});

// 嵌套关系多层装配
const postGraph = await prisma.post.findMany({
  include: {
    author: { select: { id: true, name: true } },
    tags: true,
  },
});
```

在接口边界明确返回类型的示例：

```ts
async function getPublicProfile(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, createdAt: true },
  });
}

type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;
```

#### 6.4 常见误区

> include 用得越多越好，一次把所有关系都带上。

加载不需要的关系会产生额外查询和大量数据传输；深层 include 可能等价于多次 JOIN/附加查询，应按页面需要精确声明。

> select 只是少返回几个字段，对安全没影响。

字段裁剪同时是数据最小化手段。内部字段即使在数据库中存在，也不应出现在公开响应类型中。

### 7. 嵌套写：一次操作关联数据

#### 7.1 定义

嵌套写允许在父记录的 `data` 中通过关系字段操作子记录，常用操作：

- `create` / `createMany`：同时新建关联记录。
- `connect`：按唯一字段关联已有记录。
- `connectOrCreate`：存在则连接，不存在则创建。
- `update` / `upsert`：在写父记录时同步修改关联记录。
- `disconnect` / `set` / `delete`：解除或重建关联（具体语义以关系基数为准）。

嵌套写通常在一个事务上下文中完成，避免“父记录建成了、子记录失败”的半成品。

#### 7.2 与后端的关系

注册时同时创建用户和资料、发表文章时连接多个标签、把订单连同明细一起落库，都是嵌套写的典型场景。后端应优先用结构化的嵌套操作表达“同生共死”的写入，而不是手工发多条语句再祈祷它们一致。

#### 7.3 示例

```ts
// 创建用户并同时创建资料与第一篇文章
await prisma.user.create({
  data: {
    email: 'bob@example.com',
    profile: { create: { bio: '新成员' } },
    posts: {
      create: [{ title: '第一篇' }, { title: '第二篇' }],
    },
  },
});

// 发表文章时连接已有标签，缺失则创建
await prisma.post.create({
  data: {
    title: 'Prisma 关系',
    tags: {
      connectOrCreate: [
        {
          where: { name: 'orm' },
          create: { name: 'orm' },
        },
        {
          where: { name: 'prisma' },
          create: { name: 'prisma' },
        },
      ],
    },
  },
});

// 更新文章时同步替换标签集合
await prisma.post.update({
  where: { id: 1 },
  data: {
    tags: {
      set: [{ name: 'sql' }, { name: 'backend' }],
    },
  },
});
```

#### 7.4 常见误区

> `connect` 会在记录不存在时自动创建。

`connect` 只连接已存在记录，找不到会抛错；“没有就建”必须使用 `connectOrCreate`。

> 嵌套写成功一半失败一半也没关系。

应把业务上要求原子完成的操作放在同一嵌套写或显式事务中；误以为多语句自动同生共死，是数据不一致的常见来源。

### 8. 类型安全与 Prisma Client 生命周期

#### 8.1 定义

**生命周期**关注客户端在进程中创建与销毁的方式：

- Prisma Client 内部自带连接池，通常一个进程只需一个实例。
- 开发环境配合热重载时，若每次模块重新执行都 `new PrismaClient()`，会不断产生新实例与连接，导致连接数膨胀。
- 标准做法是用单例模块导出客户端；测试或 Serverless 场景按需显式连接与关闭。

**类型安全**不仅包括模型类型，还包括生成的输入类型（如 where 输入、排序输入、事务客户端类型），可从生成产物中导出复用。

#### 8.2 与后端的关系

服务框架的每个请求都应复用同一个客户端实例；优雅停机时调用关闭方法，让连接正常释放。事务函数内必须使用事务客户端参数继续查询（下一单元详解），而不是重新引用全局实例，否则不在同一事务中。

#### 8.3 示例

```ts
// src/db/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

优雅停机与生成类型导出：

```ts
async function shutdown() {
  await prisma.$disconnect();
}

process.once('SIGTERM', () => {
  shutdown().finally(() => process.exit(0));
});

// 复用生成类型约束仓储层入参
import type { Prisma } from '@prisma/client';

type UserWhere = Prisma.UserWhereInput;

function buildUserWhere(keyword: string): UserWhere {
  return {
    OR: [
      { email: { contains: keyword } },
      { name: { contains: keyword } },
    ],
  };
}
```

概念伪代码，表达请求与实例关系：

```text
进程启动
  → 创建唯一 PrismaClient（内含连接池）
请求 1 → 借用实例方法
请求 2 → 复用同一实例
...
收到终止信号 → 完成在途操作 → 关闭连接 → 退出
```

#### 8.4 常见误区

> 每个文件、每个请求都 new 一个客户端更独立、更安全。

重复实例化会创建多套连接池，耗尽数据库连接；正确复用单例才能既高效又稳定。

> TypeScript 不报错就等于查询一定在事务里、一定高效。

类型系统保证形状正确，不保证事务边界正确，也不保证没有 N+1。事务语义与性能仍需靠理解和验证。

## 课后题

1. ORM 解决了什么问题、引入了什么代价？为什么“会用 Prisma 但不懂 SQL”仍然危险？
2. `datasource` 和 `generator` 分别承担什么职责？为什么连接串必须通过环境变量读取？
3. `?`、`[]` 两个字段修饰符分别表达什么含义？请各举一个业务字段例子。
4. 场景分析：某开发者把用户金额字段定义为 `Float`，月底对账出现分级误差。应改成什么类型？在 TypeScript 边界处还要注意什么？
5. 1:1 关系在 schema 中需要满足什么条件？如果外键侧忘记加唯一约束，语义会变成什么？
6. 场景分析：团队一开始用隐式多对多实现“用户-群组”，后来需求要求记录“加入时间”和“群内角色”。为什么必须改成显式中间模型？改造时要新增什么？
7. `include` 和 `select` 的差别是什么？场景分析：公开接口直接返回了完整 user 对象，可能泄露哪些字段？应如何修复？
8. 嵌套写中的 `connect` 与 `connectOrCreate` 有何差别？场景分析：发表文章时标签可能已存在也可能不存在，应使用哪个操作？
9. 场景分析：开发环境使用热重载，每次保存都新建 PrismaClient，数据库很快报连接数过多。请解释原因并给出单例方案要点。
10. 场景分析：某接口直接把请求体透传为 `where` 条件调用 `findMany`，会产生什么安全风险？正确的过滤条件应如何构造？

## 实践练习题

### 练习 1：搭建 Prisma 项目并完成用户与文章模型

#### 任务

在一个全新的 TypeScript 后端项目中接入 Prisma，建模用户与文章（1:N），并写出可运行的创建与查询脚本。

#### 步骤约束

1. 使用 npm 安装 CLI 与客户端，执行初始化，确认生成 `prisma/schema.prisma` 与 `.env`。
2. `datasource` 指向 PostgreSQL，连接串只写在 `.env`；`.gitignore` 必须忽略 `.env`。
3. User 至少包含自增主键、唯一邮箱、可空姓名、角色枚举、创建与更新时间；时间列映射为带时区类型。
4. Post 包含标题、正文、作者外键，关系字段配对完整。
5. 使用本地练习库创建表并生成客户端（可先用数据库推送或下一单元的迁移命令，记录所用命令）。
6. 编写一个脚本：创建一个用户及两篇文章，再按邮箱查询并打印。

#### 提交物

- 项目关键文件（schema、`.env.example`、脚本、忽略规则）；
- 使用的 CLI 命令记录；
- 脚本实际输出；
- 100 字以内的环境配置说明。

#### 验收标准

- schema 校验通过，客户端成功生成；
- 可空、唯一、枚举、时间默认值语义正确；
- 真实 `.env` 不在提交物中，只提供示例文件；
- 脚本能创建并读回关联数据。

### 练习 2：建模全部基数关系并完成关系查询

#### 任务

在上一轮项目中扩展模型，覆盖 1:1、1:N、隐式 M:N 与显式 M:N 四种关系，并编写查询脚本验证。

#### 步骤约束

1. 为 User 增加 Profile（1:1），外键侧加唯一约束。
2. 为 Post 增加 Tag 的隐式多对多；再新增 Group 与 GroupMembership 显式多对多，成员关系包含角色与加入时间。
3. 更新数据库结构并重新生成客户端。
4. 编写查询脚本：
   - 用户及其已发布文章（按时间倒序，取 5 篇）；
   - 文章带作者公开信息与全部标签；
   - 某群组下角色为管理员的成员。
5. 每个查询使用 select 或 include 明确返回形状，不得整对象裸返回。
6. 在代码注释中标注每条查询对应的页面或业务需求。

#### 提交物

- 更新后的 schema；
- `src/relation-queries.ts`；
- 查询输出与返回形状说明；
- 关系对照文本图（四类关系各举一处）。

#### 验收标准

- 四种关系全部实现且外键配对正确；
- 隐式与显式多对多的选择理由清晰；
- 查询返回字段与声明一致，无敏感字段泄露；
- 重新生成客户端后无类型错误。

### 练习 3：嵌套写、客户端单例与仓储层类型约束

#### 任务

完成一个小型仓储层：用嵌套写处理注册与发帖，用单例管理客户端，并用生成类型约束查询构造。

#### 步骤约束

1. 实现 `registerUser`：一次创建用户、资料及可选的首篇文章。
2. 实现 `publishPostWithTags`：发文时对标签使用“存在则连接、不存在则创建”。
3. 实现客户端单例模块，并在服务入口添加环境变量校验与优雅停机逻辑。
4. 定义查询构造函数，入参使用生成的 where 输入类型；过滤条件按白名单生成，不接受调用方透传。
5. 编写一个可运行的演示脚本顺序调用上述能力并打印结果。
6. 故意制造两次错误场景（连接不存在的标签、更新不存在的用户），记录异常类型与信息。

#### 提交物

- `src/db/prisma.ts`、`src/repositories/*.ts`、`src/demo.ts`；
- 演示输出与异常记录；
- 设计说明：嵌套写原子性、单例必要性、输入类型约束。

#### 验收标准

- 嵌套写正确使用 create 与 connectOrCreate；
- 客户端全局只实例化一次，停机能正常关闭连接；
- where 条件由后端构造，无透传越权；
- 异常被正确识别为“记录不存在”等具体类型。

## 阶段验收作业

### 作业名称

Prisma 数据建模与类型安全数据访问层

### 作业场景

团队要把一个社区系统的数据访问层从手写 SQL 迁移到 Prisma。系统包含用户、资料、文章、评论、标签、群组及群组成员关系，需要注册即建档、发文带标签、按群组管理成员等能力。团队要求你交付完整 schema、可运行的仓储层与现场演示，并证明关系基数、返回字段与事务性写入都正确。

### 提交物与目录要求

```text
prisma-community-lab/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── db/prisma.ts
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── post.repository.ts
│   │   └── group.repository.ts
│   └── demo.ts
├── evidence/
│   └── run-record.md
├── .env.example
└── README.md
```

要求：

- 七类实体完整，四类关系基数（1:1、1:N、隐式与显式 M:N）至少各一处。
- 字段属性完整：主键、唯一、可空、枚举、默认值、更新时间、原生类型映射。
- 仓储层方法覆盖 CRUD、include/select、嵌套写，入参使用生成类型。
- 客户端单例、环境变量校验与优雅停机齐全。
- 种子脚本与演示脚本可重复运行；README 说明本地配置步骤。

### 演示步骤

学员需要在 20 分钟内完成：

1. 按 README 配置练习环境变量，展示 schema 与数据库结构同步。
2. 对照 schema 讲解四类关系的外键与关系字段配对。
3. 运行种子脚本，再调用仓储层演示注册建档与发文带标签。
4. 演示三类关系查询，并解释 include 与 select 造成的返回类型差异。
5. 展示两次“记录不存在”异常及处理方式。
6. 解释单例方案如何避免开发环境连接膨胀。
7. 回答导师临时变更，例如“给成员关系再加一个状态字段，需要改哪里”。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| Schema 建模 | 25 | 实体与属性完整，类型与约束映射正确 |
| 关系设计 | 20 | 四类基数正确，隐式/显式多对多选择合理 |
| Client 数据操作 | 20 | CRUD 与条件操作符使用正确，异常处理到位 |
| 关系查询与嵌套写 | 20 | include/select 精确，嵌套写原子完成 |
| 生命周期与工程规范 | 15 | 单例、环境变量、停机与文档规范 |

细分评分规则：

#### Schema 建模：25 分

- 实体与字段完整：8 分；
- 标量类型与原生类型映射正确：8 分；
- 枚举、默认值、时间属性正确：9 分。

#### 关系设计：20 分

- 关系字段与外键配对正确：8 分；
- 1:1 唯一约束正确：4 分；
- 多对多隐式/显式选择合理：8 分。

#### Client 数据操作：20 分

- 标准 CRUD 调用正确：7 分；
- 过滤与排序操作符正确：6 分；
- 异常语义识别正确：7 分。

#### 关系查询与嵌套写：20 分

- include 与 select 选择恰当：7 分；
- 嵌套关系过滤正确：5 分；
- 嵌套写操作选择正确：8 分。

#### 生命周期与工程规范：15 分

- 客户端单例正确：5 分；
- 环境变量与停机逻辑完整：5 分；
- 无敏感信息提交、README 可复现：5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 关系字段与外键标量字段配对缺失，schema 无法通过校验。
2. 1:1 关系外键侧缺少唯一约束，或混淆一对多与一对一语义。
3. 把金额等精确数据定义为浮点，或时间列没有使用带时区类型。
4. 公开接口整对象裸返回，泄露邮箱、余额等不应暴露的字段。
5. 每次请求或每个模块重复实例化 PrismaClient，造成连接数膨胀。
6. 将真实连接串、密码、令牌提交进版本库，或缺少环境变量示例与说明。
7. 直接透传请求体作为 where 条件，存在对象级越权风险。
8. 只提交截图，没有 schema、代码与运行记录。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解 ORM 与 Prisma 组成 | 现场讲解与 README |
| 配置 datasource 与 generator | schema 与 `.env.example` |
| 使用模型与字段属性 | schema 评审 |
| 建模三类基数关系 | 关系字段与中间模型 |
| 使用 Prisma Client CRUD | 仓储层代码与演示 |
| 使用 include/select | 关系查询脚本与返回类型 |
| 使用嵌套写 | 注册与发文用例 |
| 管理客户端生命周期与类型 | 单例模块、生成类型使用 |

### 提交前自检

- [ ] 六个二级标题完整，理论小节均含定义、后端关系、示例与误区。
- [ ] schema 校验、客户端生成、结构同步三步均成功。
- [ ] 四类关系至少各有一处，外键与关系字段成对出现。
- [ ] 精确数值用 Decimal，时间用带时区类型，可空字段显式标注。
- [ ] 仓储层没有直接透传外部输入作为查询条件。
- [ ] 客户端为单例，具备环境变量校验与优雅停机。
- [ ] 提交物不含真实 `.env` 与任何密钥。
- [ ] 种子与演示脚本可在干净练习库重复运行。
