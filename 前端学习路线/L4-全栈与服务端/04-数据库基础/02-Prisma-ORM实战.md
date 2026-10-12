# 02 Prisma ORM 实战

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L4 全栈与服务端
> - 先修：[01 PostgreSQL 核心概念](./01-PostgreSQL核心概念.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Prisma](https://www.prisma.io/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 ORM 的价值：把数据库操作从"写 SQL 字符串"提升到"类型安全的函数调用"
- 掌握 Prisma Schema 的结构和常见配置
- 熟练使用 Prisma Client 进行 CRUD、关联查询、过滤排序
- 理解 include 和 select 的区别及选择策略
- 掌握 Prisma Migrate 的基本工作流
- 能用 Prisma 为一个博客系统实现完整的数据访问层

---

## 内容讲解

### 一、为什么需要 ORM？

#### 1.1 裸写 SQL 的痛点

你用 Node.js 操作数据库，最原始的方式是：

```typescript
// 原始方式：拼接 SQL 字符串
const userId = 1;
const result = await pg.query(
  `SELECT * FROM posts WHERE user_id = ${userId}`
);
```

这有几个致命问题：

| 问题 | 说明 |
|------|------|
| **SQL 注入** | 字符串拼接让恶意输入可以执行任意 SQL |
| **无类型安全** | `result.rows[0].title` 是 `any`，拼写错误要到运行时才暴露 |
| **字段不匹配** | 数据库改了列名，JS 代码不报错，只返回 `undefined` 然后静默出 bug |
| **心智负担** | 每次 CRUD 都要手写 SQL，容易写错，JOIN 复杂时更难维护 |

#### 1.2 ORM 的价值

ORM（Object-Relational Mapping）在代码和数据库之间加了一层"翻译层"：

```typescript
// Prisma：类型安全的数据库操作
const posts = await prisma.post.findMany({
  where: { userId: 1 },
  include: { author: true },
});
// posts 的类型自动推断为 (Post & { author: User })[]
// 拼错字段？TypeScript 编译器直接报错
```

核心价值：
- **类型安全**：Schema 定义 → 自动生成类型 → 编辑器自动补全
- **避免注入**：参数化的查询由 ORM 生成，框架保证了安全
- **迁移管理**：Schema 变更自动生成 SQL 迁移文件
- **关系抽象**：`include` 替代手写 JOIN，可读性大幅提升

#### 1.3 为什么选 Prisma？

| 对比 | Prisma | TypeORM | Drizzle |
|------|--------|---------|---------|
| 类型安全 | ⭐⭐⭐ 优秀 | ⭐⭐ 部分 | ⭐⭐⭐ 优秀 |
| Schema 定义 | 自有 DSL，直观 | 装饰器，侵入代码 | TS 代码定义，灵活 |
| 迁移工具 | 内置 Prisma Migrate | 弱，需额外工具 | 内置 drizzle-kit |
| 学习曲线 | 低（DSL 图简单） | 中 | 中（需理解 SQL） |
| 社区生态 | 最大，文档最好 | 成熟但增长放缓 | 新兴，SQL-like |

Prisma 对前端工程师最友好：Schema DSL 直观、VS Code 插件自动补全、文档质量高。

---

### 二、项目初始化

```bash
# 1. 初始化 Node.js 项目
mkdir blog-api && cd blog-api
npm init -y

# 2. 安装依赖
npm install prisma @prisma/client
npm install -D typescript ts-node @types/node

# 3. 初始化 Prisma（创建 prisma/schema.prisma 和 .env）
npx prisma init

# 4. 初始化 TypeScript
npx tsc --init
```

执行后目录结构：

```
blog-api/
├── prisma/
│   └── schema.prisma      # 数据库模型定义
├── .env                   # DATABASE_URL="postgresql://..."
├── package.json
└── tsconfig.json
```

---

### 三、Prisma Schema 文件结构

打开 `prisma/schema.prisma`：

```prisma
// ===== 1. 数据源配置 =====
datasource db {
  provider = "postgresql"    // 数据库类型
  url      = env("DATABASE_URL")  // 连接字符串，从 .env 读取
}

// ===== 2. 生成器配置 =====
generator client {
  provider = "prisma-client-js"  // 生成 JS/TS 客户端
}

// ===== 3. 数据模型 =====
model User {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(100)
  email     String   @unique
  posts     Post[]   // 一对多：一个用户有多篇文章
  comments  Comment[]
  createdAt DateTime @default(now()) @db.Timestamptz()
  updatedAt DateTime @updatedAt @db.Timestamptz()
}

model Post {
  id          Int        @id @default(autoincrement())
  title       String     @db.VarChar(200)
  slug        String     @unique
  content     String     @db.Text
  status      String     @default("draft") @db.VarChar(20)
  userId      Int
  author      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  comments    Comment[]
  tags        PostTag[]
  createdAt   DateTime   @default(now()) @db.Timestamptz()
  updatedAt   DateTime   @updatedAt @db.Timestamptz()
  publishedAt DateTime?  @db.Timestamptz()  // ? 表示可选
}

model Comment {
  id        Int       @id @default(autoincrement())
  content   String    @db.Text
  userId    Int
  postId    Int
  parentId  Int?
  author    User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  parent    Comment?  @relation("CommentReplies", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentReplies")
  createdAt DateTime  @default(now()) @db.Timestamptz()
}

model Tag {
  id    Int       @id @default(autoincrement())
  name  String    @unique @db.VarChar(50)
  slug  String    @unique @db.VarChar(50)
  posts PostTag[]
}

model PostTag {
  postId Int
  tagId  Int
  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])  // 复合主键
}
```

#### 3.1 字段类型速查

| Prisma 类型 | PostgreSQL 列类型 | 用途 |
|------------|------------------|------|
| `Int` | integer | 整数 |
| `BigInt` | bigint | 大整数 |
| `Float` | double precision | 浮点数（不推荐存金额） |
| `Decimal` | decimal(65,30) | 精确小数 |
| `String` | text | 默认映射为 text |
| `String @db.VarChar(n)` | varchar(n) | 受限长度 |
| `Boolean` | boolean | 布尔值 |
| `DateTime` | timestamp(3) | 日期时间 |
| `DateTime @db.Timestamptz()` | timestamptz(3) | 带时区（推荐） |
| `Json` | jsonb | JSON 数据 |
| `Bytes` | bytea | 二进制 |
| `Unsupported("...")` | 自定义原生类型 | PG 特有类型 |

#### 3.2 常用属性

| 属性 | 说明 |
|------|------|
| `@id` | 主键 |
| `@default(autoincrement())` | 自增（映射 SERIAL） |
| `@default(uuid())` | 自动生成 UUID |
| `@default(now())` | 默认当前时间 |
| `@unique` | 唯一约束 |
| `@updatedAt` | 更新时自动设当前时间 |
| `?` | 字段可选（允许 NULL） |
| `[]` | 数组（表示一对多/多对多的"多"侧） |

#### 3.3 关系定义

```prisma
// 一对一（1-1）：User 只有一个 Profile
model User {
  id      Int      @id @default(autoincrement())
  profile Profile? // 可选的一对一
}
model Profile {
  id     Int  @id @default(autoincrement())
  userId Int  @unique  // ⚠️ 一对一的关键：外键必须加 @unique！
  user   User @relation(fields: [userId], references: [id])
}

// 一对多（1-N）：User 有多个 Post
model User {
  id    Int    @id @default(autoincrement())
  posts Post[] // "多"侧，用数组
}
model Post {
  id     Int  @id @default(autoincrement())
  userId Int
  author User @relation(fields: [userId], references: [id])
}

// 多对多（N-M）：Post 和 Tag 通过 PostTag 中间表关联
model Post {
  id   Int      @id @default(autoincrement())
  tags PostTag[]
}
model Tag {
  id    Int      @id @default(autoincrement())
  posts PostTag[]
}
model PostTag {
  postId Int
  tagId  Int
  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([postId, tagId])
}
```

> **避坑提示**：一对一关系中外键必须加 `@unique`，否则数据库层面允许一个 Profile 关联多个 User，Prisma 也会接受。

---

### 四、Prisma Client：类型安全的 CRUD

每次修改 `schema.prisma` 后运行：

```bash
npx prisma generate   # 重新生成 Prisma Client 类型
```

初始化 Client：

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

// 开发环境中避免热重载导致多个 Prisma Client 实例
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

#### 4.1 创建数据

```typescript
// create：创建单条记录
const user = await prisma.user.create({
  data: {
    name: '张三',
    email: 'zhangsan@example.com',
  },
});
// user 的类型是完整的 User 类型，包括自动生成的 id 和 createdAt

// createMany：批量创建（⚠️ 默认不支持 return 返回数据）
await prisma.user.createMany({
  data: [
    { name: '李四', email: 'lisi@example.com' },
    { name: '王五', email: 'wangwu@example.com' },
  ],
});

// 创建时同时创建关联数据（嵌套写入）
const post = await prisma.post.create({
  data: {
    title: '我的第一篇博客',
    slug: 'hello-world',
    content: '这是内容...',
    author: {
      connect: { id: 1 },  // 关联已存在的用户
      // 或者 create 新用户：create: { name: '新作者', email: 'new@ex.com' }
    },
    tags: {
      create: [
        { tag: { connectOrCreate: {
          where: { name: '技术' },
          create: { name: '技术', slug: 'tech' },
        }}},
      ],
    },
  },
  include: { author: true, tags: { include: { tag: true } } },
});
```

#### 4.2 查询数据

```typescript
// findUnique：通过主键或唯一字段查询单条
const user = await prisma.user.findUnique({
  where: { id: 1 },
});
// 或者通过唯一字段
const userByEmail = await prisma.user.findUnique({
  where: { email: 'zhangsan@example.com' },
});

// findFirst：查询满足条件的第一条（适合非唯一字段查询）
const latestPost = await prisma.post.findFirst({
  where: { status: 'published' },
  orderBy: { createdAt: 'desc' },
});

// findMany：查询多条
const posts = await prisma.post.findMany({
  where: { status: 'published' },
  orderBy: { createdAt: 'desc' },
  take: 10,        // LIMIT
  skip: 0,         // OFFSET
});
```

#### 4.3 更新数据

```typescript
// update：更新单条（where 条件必须是唯一字段）
const updated = await prisma.post.update({
  where: { id: 1 },
  data: {
    status: 'published',
    publishedAt: new Date(),
  },
});

// updateMany：批量更新（可以匹配多条记录）
const result = await prisma.post.updateMany({
  where: { status: 'draft' },
  data: { status: 'archived' },
});
// result.count 是更新的行数

// upsert：存在则更新，不存在则创建
const post = await prisma.post.upsert({
  where: { slug: 'hello-world' },
  update: { title: '更新后的标题' },
  create: {
    title: '我的第一篇博客',
    slug: 'hello-world',
    content: '内容...',
    userId: 1,
  },
});
```

#### 4.4 删除数据

```typescript
// delete：删除单条
await prisma.post.delete({ where: { id: 1 } });

// deleteMany：批量删除
await prisma.comment.deleteMany({ where: { postId: 1 } });
```

---

### 五、查询过滤和排序

```typescript
// 等于 / 不等于
const drafts = await prisma.post.findMany({
  where: { status: 'draft' },
});

// 比较运算符
const popularPosts = await prisma.post.findMany({
  where: { viewCount: { gte: 100 } },  // >= 100
});

// 字符串过滤
const results = await prisma.post.findMany({
  where: {
    title: {
      contains: 'Prisma',        // 包含（大小写敏感）
      // startsWith: '如何',     // 以...开头
      // endsWith: '教程',       // 以...结尾
      // mode: 'insensitive',    // 不区分大小写
    },
  },
});

// IN：匹配集合
const posts = await prisma.post.findMany({
  where: { status: { in: ['draft', 'archived'] } },
});

// 范围
const januaryPosts = await prisma.post.findMany({
  where: {
    createdAt: {
      gte: new Date('2025-01-01'),
      lt: new Date('2025-02-01'),
    },
  },
});

// AND / OR / NOT
const filtered = await prisma.post.findMany({
  where: {
    AND: [
      { status: 'published' },
      { OR: [
        { title: { contains: 'Prisma' } },
        { title: { contains: 'PostgreSQL' } },
      ]},
    ],
  },
});

// 关联过滤：查询至少有一条评论的文章
const postsWithComments = await prisma.post.findMany({
  where: {
    comments: { some: {} },  // 至少有一条评论
  },
});

// 关联过滤：查询没有评论的文章
const postsWithoutComments = await prisma.post.findMany({
  where: {
    comments: { none: {} },
  },
});

// 关联过滤：查询所有评论都来自 userId=1 的文章
const posts = await prisma.post.findMany({
  where: {
    comments: { every: { userId: 1 } },
  },
});
```

> **避坑提示**：关联过滤的 `some`、`every`、`none` 只检查关联记录的存在性和条件，不返回关联数据本身。要同时过滤和返回关联数据，需要把条件放在 `where` 而获取数据放在 `include`，不要混用。

---

### 六、关联查询：include vs select

这是 Prisma 中最重要的一组 API：

```typescript
// include：返回关系字段（整条关联记录）
const post = await prisma.post.findUnique({
  where: { id: 1 },
  include: {
    author: true,           // 返回关联的 User
    comments: {
      include: {
        author: true,       // 嵌套 include：评论 → 评论作者
      },
    },
    tags: {
      include: { tag: true },
    },
  },
});
// 返回类型：Post & { author: User; comments: (Comment & { author: User })[]; ... }

// select：只返回指定字段（精确控制返回数据）
const postSummary = await prisma.post.findUnique({
  where: { id: 1 },
  select: {
    title: true,            // 只返回标题
    author: {
      select: { name: true }, // 作者只返回 name
    },
    _count: {
      select: { comments: true }, // 评论数（不返回评论内容本身）
    },
  },
});
// 返回类型：{ title: string; author: { name: string }; _count: { comments: number } }
```

**选择策略**：

| 场景 | 推荐方式 |
|------|---------|
| 需要完整关联对象 | `include` |
| 只需要关联对象的几个字段 | `select`（减少数据传输） |
| 只需要关联对象的计数 | `include: { _count: { select: { ... } } }` |
| API 响应需要精确控制字段 | `select`（避免过度暴露数据） |

> **避坑提示**：`include` 和 `select` 不能同时用在同一次查询中。要么用 `include` 返回完整关联，要么用 `select` 精确选择字段。

---

### 七、事务（Transaction）快速入门

事务确保多个操作要么全部成功，要么全部回滚：

```typescript
// 方式一：$transaction([...])——批量顺序执行
const [newPost, updatedUser] = await prisma.$transaction([
  prisma.post.create({
    data: { title: '新文章', slug: 'new-post', content: '...', userId: 1 },
  }),
  prisma.user.update({
    where: { id: 1 },
    data: { postCount: { increment: 1 } },
  }),
]);

// 方式二：Interactive Transaction——在回调中按需执行
const result = await prisma.$transaction(async (tx) => {
  // tx 是事务专用的 Prisma Client 实例
  const user = await tx.user.findUnique({ where: { id: 1 } });
  if (!user) throw new Error('用户不存在');

  const post = await tx.post.create({
    data: { title: '新文章', slug: 'another-post', content: '...', userId: 1 },
  });

  // 如果这里抛出异常，上面的 create 也会回滚
  if (someCondition) {
    throw new Error('业务规则不满足，全部回滚');
  }

  await tx.user.update({
    where: { id: 1 },
    data: { postCount: { increment: 1 } },
  });

  return post;
});
```

第三篇会深入讲事务的 ACID 原理和更复杂的场景。

---

### 八、Prisma Migrate：数据库迁移

```bash
# 开发环境：自动生成迁移文件并应用到数据库
npx prisma migrate dev --name init
# 做了什么？
# 1. 对比 schema.prisma 和当前数据库结构
# 2. 生成 prisma/migrations/20250101000000_init/migration.sql
# 3. 执行该 SQL，应用到数据库
# 4. 重新生成 Prisma Client

# 查看迁移状态
npx prisma migrate status

# 回滚上一次迁移（开发环境专用）
npx prisma migrate reset   # ⚠️ 会删除数据库所有数据并重新应用所有迁移

# 生产环境：只生成迁移文件，不自动执行
npx prisma migrate deploy
```

迁移文件示例（自动生成）：

```sql
-- prisma/migrations/20250101000000_init/migration.sql
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
```

> **避坑提示**：`prisma migrate reset` 会删除数据库或 schema 中的数据，只能在确认可丢弃的开发数据库中使用。测试与生产环境使用 `prisma migrate deploy` 应用已提交迁移；若生产迁移失败，应按备份、修复迁移和 `migrate resolve` 流程处理，不能重置数据库。

---

### 九、实战：博客系统的完整数据层

#### 9.1 目录结构

```
blog-api/
├── prisma/
│   └── schema.prisma
├── lib/
│   └── prisma.ts           # Prisma Client 单例
├── services/
│   ├── user.service.ts     # 用户相关操作
│   ├── post.service.ts     # 文章相关操作
│   └── comment.service.ts  # 评论相关操作
└── index.ts                # 入口文件
```

#### 9.2 用户服务

```typescript
// services/user.service.ts
import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

export const userService = {
  // 创建用户
  async create(data: { name: string; email: string }) {
    return prisma.user.create({ data });
  },

  // 按 ID 查询
  async findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  },

  // 按邮箱查询
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  // 获取用户的所有文章（带分页）
  async findPosts(userId: number, page = 1, pageSize = 10) {
    return prisma.post.findMany({
      where: { userId, status: 'published' },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });
  },
};
```

#### 9.3 文章服务

```typescript
// services/post.service.ts
import { prisma } from '../lib/prisma';

// 公开文章列表的字段（不暴露内部字段）
const publicPostSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  status: true,
  viewCount: true,
  createdAt: true,
  publishedAt: true,
  author: {
    select: { id: true, name: true, avatarUrl: true },
  },
  tags: {
    select: { tag: { select: { id: true, name: true, slug: true } } },
  },
  _count: { select: { comments: true } },
} as const;

export const postService = {
  // 创建文章（草稿）
  async create(userId: number, data: { title: string; slug: string; content: string; excerpt?: string }) {
    return prisma.post.create({
      data: { ...data, userId },
    });
  },

  // 文章列表（已发布，带分页）
  async findPublished(page = 1, pageSize = 10) {
    const where = { status: 'published' as const };
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        select: publicPostSelect,
        orderBy: { publishedAt: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
      }),
      prisma.post.count({ where }),
    ]);
    return { posts, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  },

  // 文章详情（通过 slug）
  async findBySlug(slug: string) {
    return prisma.post.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, bio: true } },
        tags: { include: { tag: true } },
        comments: {
          where: { parentId: null }, // 只取顶层评论
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
            replies: {
              include: {
                author: { select: { id: true, name: true, avatarUrl: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  // 发布文章
  async publish(id: number) {
    return prisma.post.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
  },

  // 软删除（不真删，只标记状态）
  async archive(id: number) {
    return prisma.post.update({
      where: { id },
      data: { status: 'archived' },
    });
  },
};
```

#### 9.4 评论服务

```typescript
// services/comment.service.ts
import { prisma } from '../lib/prisma';

export const commentService = {
  // 创建评论（可能是顶层评论或回复）
  async create(userId: number, postId: number, content: string, parentId?: number) {
    // 在事务中：创建评论 + 更新文章评论计数
    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: { content, userId, postId, parentId },
        include: { author: { select: { id: true, name: true, avatarUrl: true } } },
      });
      // 如果是顶层评论，增加文章评论计数
      if (!parentId) {
        await tx.post.update({
          where: { id: postId },
          data: { commentCount: { increment: 1 } },  // 需要先在 Post 模型中加 commentCount 字段
        });
      }
      return comment;
    });
  },

  // 删除评论（及其所有子回复）
  async delete(commentId: number) {
    // 因为 schema 中定义了 onDelete: Cascade，删除父评论会自动删除子回复
    return prisma.comment.delete({ where: { id: commentId } });
  },

  // 获取文章的评论树
  async findByPost(postId: number) {
    return prisma.comment.findMany({
      where: { postId, parentId: null },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
```

#### 9.5 入口示例

```typescript
// index.ts
import { postService } from './services/post.service';

async function main() {
  // 获取已发布文章列表
  const { posts, total, totalPages } = await postService.findPublished(1, 10);
  console.log(`共 ${total} 篇文章，当前第 1/${totalPages} 页`);

  for (const post of posts) {
    console.log(`- [${post.status}] ${post.title} (${post._count.comments} 条评论)`);
    console.log(`  作者: ${post.author.name}`);
    console.log(`  标签: ${post.tags.map(t => t.tag.name).join(', ')}`);
  }

  // 获取文章详情
  const detail = await postService.findBySlug('hello-world');
  if (detail) {
    console.log(`\n正文:\n${detail.content.slice(0, 100)}...`);
    console.log(`${detail.comments.length} 条评论`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## 常见问题

**Q1: Prisma Client 每次查询都要写成 `{ where: { id: 1 } }` 这么啰嗦？**

这是类型安全的代价——但编辑器自动补全几乎帮你完成了所有输入。另一种思路是封装 Repository 模式的 service 层（如上文的 `postService`），把常用查询封装成有语义的方法。

**Q2: `prisma generate` 和 `prisma migrate dev` 什么时候需要跑？**

`prisma generate` 在每次修改 `schema.prisma` 后需要跑（重新生成类型）。`prisma migrate dev` 同时完成 generate，所以日常开发只跑 migrate dev 就够了。

**Q3: include 和 select 哪个性能好？**

`select` 只传输需要的字段，数据量更小，理论上更快。但差异通常微乎其微，优先选择**可读性更好**的写法。只有在大字段（如文章正文 TEXT）的场景，用 `select` 排除这些字段才有明显收益。API 响应场景建议用 `select` 精确控制暴露字段，防止意外的数据泄露。

**Q4: 多对多关系可以不创建中间表吗？**

Prisma 支持隐式多对多（不显式定义中间表），它会自动创建。但**显式定义中间表更好**：你可以给关联关系添加额外字段（如关联时间）。这里建议始终显式定义。

**Q5: Prisma 能执行原生 SQL 吗？**

可以，用 `prisma.$queryRaw` 或 `prisma.$executeRaw`。用于 Prisma 不支持的特性（如 PostgreSQL 的 `COPY` 批量导入、复杂 CTE、数据库特定函数）。类型安全丢失，只在必要时用。

**Q6: 生产环境 Prisma Client 的 `log` 应该怎么配置？**

```typescript
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error'],
});
```

生产环境别输出 `query` 日志，它会打印每一条 SQL 的完整参数，既影响性能也可能泄露敏感数据。

**Q7: Prisma 的连接池怎么管理？**

Prisma 默认通过 `@prisma/client` 内置连接池，不需要额外配置。如果你的 Serverless 环境（如 Vercel Functions、AWS Lambda）出现 "too many connections" 错误，配置 `pgbouncer=true` 并在连接字符串中指向 PgBouncer 端口。

**Q8: 修改 `schema.prisma` 后同事更新代码跑不起来？**

你改 schema 后跑了 `prisma migrate dev`，生成了新的迁移文件。同事拉代码后需要跑 `npx prisma migrate dev`（开发环境）或 `npx prisma generate`（只看代码不连数据库）。迁移文件必须提交到 Git，`node_modules/.prisma` 不要提交。

---

## 实操作业

### 基础练习：搭建第一个 Prisma 项目

1. 初始化 TypeScript + Prisma 项目
2. 创建一个 `todos` 表（id, title, completed, userId, createdAt）
3. 用 Prisma Client 实现增删改查并通过 `ts-node` 运行验证

### 进阶练习：为博客系统补齐数据层

在 9.2-9.4 节的基础上：
1. 添加 `tagService`：创建标签、按标签查文章、获取热门标签
2. 给文章添加"点赞"功能（需要新建 likes 表，userId + postId 复合主键）
3. 实现文章的全文搜索（用 PostgreSQL 的 `tsvector` + `$queryRaw`）

### 挑战练习：API 接口实现

用你熟悉的框架（Express / Fastify / Next.js Route Handlers）封装上述数据层，实现以下 REST API：
- `GET /api/posts?page=1&pageSize=10`——文章列表
- `GET /api/posts/:slug`——文章详情
- `POST /api/posts`——创建文章
- `POST /api/posts/:id/comments`——创建评论
- `DELETE /api/comments/:id`——删除评论

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L4 里程碑](../../projects/atlas/milestones/L4.md)
- 本课任务：按 L4 里程碑把“Prisma ORM 实战”接入 Atlas 全栈版本，明确服务端信任边界、数据契约、失败响应和回滚方式。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

- **ORM** 把 SQL 操作升级为类型安全的函数调用，消除 SQL 注入风险
- **Prisma Schema** 用声明式 DSL 定义数据模型，自动生成类型和迁移文件
- **Prisma Client** 提供完整 CRUD API：`create`/`findMany`/`findUnique`/`update`/`delete`
- **include vs select**：include 返回完整关联对象，select 精确选择字段——二选一
- **关联过滤**（some/every/none）可以在查询条件中过滤关联记录的存在性和特征
- **Prisma Migrate** 将 Schema 变更转化为版本控制的 SQL 迁移文件
- **事务**保证多个写入操作的原子性——要么全成功，要么全回滚

<!-- course-nav:start -->
---

[上一篇：01 PostgreSQL 核心概念](./01-PostgreSQL核心概念.md) · [课程地图](../../README.md) · [下一篇：03 迁移、事务与索引](./03-迁移-事务与索引.md)
<!-- course-nav:end -->
