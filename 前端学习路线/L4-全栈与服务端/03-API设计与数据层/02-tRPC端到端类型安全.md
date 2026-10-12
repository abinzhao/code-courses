# 02-tRPC 端到端类型安全

## 学习目标

- 理解 tRPC 的核心理念：靠 TypeScript 类型实现前后端类型安全
- 掌握 tRPC 的三层架构：Router → Procedure → Middleware
- 区分 query（读）、mutation（写）、subscription（实时）三种 Procedure
- 使用 Zod Schema 做运行时输入验证，同时自动推导 TypeScript 类型
- 在 Next.js App Router 中集成 tRPC，代替 REST 风格的 Route Handlers
- 对比 tRPC vs REST vs GraphQL，理解各自适用场景
- 认识 tRPC 的局限性（不适合对外开放 API、不跨语言）
- 实战：用 tRPC 实现一个带完整类型安全的帖子 CRUD API

---

## 内容讲解

### 一、tRPC 解决了什么问题？

你写一个 REST API，前后端代码大概是这样的：

```typescript
// ============ 后端 (Express/Next.js Route Handler) ============
// app/api/posts/route.ts
export async function GET(req: Request) {
  const posts = await db.posts.findMany();
  return Response.json(posts);
}

// ============ 前端 (React) ============
// 前端必须手动定义类型、手动构造 URL、手动序列化参数
interface Post {
  id: number;
  title: string;
  content: string;
}

async function getPosts(): Promise<Post[]> {
  const res = await fetch('/api/posts');
  return res.json(); // ← 返回 any！TypeScript 无法验证类型
}

// ⚠️ 问题：
// 1. 前端定义的 Post 类型和后端真实返回可能不同步
// 2. 后端改了字段名（title → headline），前端不知道，运行时才发现错误
// 3. 没有编译时保证：路径名、参数名、返回值类型都可能出错
```

tRPC 的方案是：**用 TypeScript 类型作为前后端的"契约"**，后端定义的过程（Procedure）的类型自动暴露给前端，编译时就能发现所有不匹配。

```typescript
// ============ tRPC 方式 ============

// 后端：定义 Router
const appRouter = router({
  posts: {
    list: publicProcedure.query(async () => {
      return await db.posts.findMany(); // 后端返回什么类型，前端就能拿到什么类型
    }),
  },
});

export type AppRouter = typeof appRouter; // ← 导出类型是关键！

// 前端：直接调用，完整体验 TypeScript 智能提示
const { data } = trpc.posts.list.useQuery();
//            ↑ data 的类型自动推导为从 db.posts.findMany() 返回的类型
//            不需要手动写 interface Post！
```

> **一句话总结**：tRPC 让你**像调用本地函数一样调用远程 API**，TypeScript 编译器帮你保证前后端一致。

---

### 二、tRPC 的核心架构

tRPC 分为三层：

```
┌─────────────────────────────────────────────────┐
│                   Router                         │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│   │  posts   │  │  users   │  │ comments │   ...│
│   │   .list  │  │  .byId   │  │  .create │      │
│   │   .byId  │  │  .search │  │  .delete │      │
│   │   .create│  │          │  │          │      │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│        │              │              │            │
│   ┌────┴──────────────┴──────────────┴─────┐     │
│   │           Procedure (query / mutation)   │     │
│   │   .input(z.object({...}))   ← Zod 校验   │     │
│   │   .query(async ({ input, ctx }) => {...})│     │
│   └────────────────┬────────────────────────┘     │
│                    │                               │
│   ┌────────────────┴────────────────────────┐     │
│   │            Middleware                     │     │
│   │   认证中间件、日志中间件、限流中间件...     │     │
│   └──────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

| 层级 | 职责 | 示例 |
|------|------|------|
| **Router** | 路由组织，把 Procedure 分组 | `posts.list`, `users.byId` |
| **Procedure** | 具体的 API 端点，包含输入校验和业务逻辑 | `query`, `mutation` |
| **Middleware** | 横切关注点：认证、日志、限流 | `authMiddleware`, `loggerMiddleware` |

---

### 三、三种 Procedure：query / mutation / subscription

```typescript
import { z } from 'zod';
import { publicProcedure, router } from './trpc';

export const appRouter = router({
  posts: {
    // ========== query：只读操作 ==========
    // 语义：获取数据，不产生副作用
    // 前端调用：trpc.posts.list.useQuery()
    list: publicProcedure
      .input(
        z.object({
          page: z.number().min(1).default(1),       // Zod 定义输入类型
          perPage: z.number().min(1).max(100).default(20),
        })
      )
      .query(async ({ input }) => {
        // input 的类型自动从 Zod Schema 推导，不需要手动写 interface
        const skip = (input.page - 1) * input.perPage;
        const posts = await db.posts.findMany({
          skip,
          take: input.perPage,
          orderBy: { createdAt: 'desc' },
        });
        const total = await db.posts.count();
        return { posts, total, page: input.page };
      }),

    // ========== mutation：写操作 ==========
    // 语义：创建/更新/删除数据，产生副作用
    // 前端调用：const createPost = trpc.posts.create.useMutation()
    create: publicProcedure
      .input(
        z.object({
          title: z.string().min(1, '标题不能为空').max(200),
          content: z.string().min(1, '内容不能为空'),
          published: z.boolean().default(false),
        })
      )
      .mutation(async ({ input }) => {
        // mutation 是有副作用的操作（数据库写入）
        return await db.posts.create({ data: input });
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          title: z.string().min(1).max(200).optional(), // optional = 可不传
          content: z.string().min(1).optional(),
          published: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.posts.update({ where: { id }, data });
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.posts.delete({ where: { id: input.id } });
        return { success: true };
      }),
  },
});
```

> **避坑提示**：query 和 mutation 不只是命名约定——tRPC 在底层对它们做不同处理。query 可以被缓存、去重、重试；mutation 不会被这些机制影响。不要用 query 执行写操作。

---

### 四、输入验证：Zod Schema 集成

tRPC 与 Zod 深度集成，Zod Schema 不仅做运行时校验，还**自动推导 TypeScript 类型**——这是 tRPC 类型安全的核心机制。

```typescript
import { z } from 'zod';

// 定义 Zod Schema
const createPostSchema = z.object({
  title: z.string()
    .min(1, '标题必填')
    .max(200, '标题最多 200 字')
    .trim(),                                    // 自动去掉首尾空格
  content: z.string()
    .min(10, '内容至少 10 字')
    .max(50000, '内容最多 50000 字'),
  tags: z.array(z.string().max(20)).max(5).default([]), // 最多 5 个标签
  status: z.enum(['draft', 'published']).default('draft'),
  scheduledAt: z.string().datetime().optional(),  // ISO 8601 格式，可选
});

// 自动推导 TypeScript 类型——不需要手写！
type CreatePostInput = z.infer<typeof createPostSchema>;
// {
//   title: string;
//   content: string;
//   tags: string[];
//   status: "draft" | "published";
//   scheduledAt?: string;
// }

// 在 Procedure 中使用
export const postsRouter = router({
  create: publicProcedure
    .input(createPostSchema)       // ← 一行搞定类型定义 + 校验
    .mutation(async ({ input }) => {
      // input 的类型就是 CreatePostInput，完全类型安全
      return await db.posts.create({ data: input });
    }),
});
```

**为什么 Zod + tRPC = 单一真相源？**

```
传统 REST：          接口文档 ← 前端类型 ← 后端逻辑（三个"真相"，手动同步）
tRPC + Zod：         Zod Schema（唯一的真相） → 自动推导前/后端类型
```

你修改 Schema 一处，前后端自动同步；不存在"后端改了但接口文档没更新"的问题。

---

### 五、Next.js + tRPC 集成

在 Next.js App Router 中集成 tRPC，你需要三个关键文件。以下是完整可运行的配置：

```typescript
// ============================================================
// 文件 1: src/server/trpc/context.ts
// 创建 tRPC 的上下文，每个请求都会调用
// ============================================================
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

// 每个请求的上下文 —— 可以在这里提取认证信息、数据库连接等
export async function createContext(opts?: FetchCreateContextFnOptions) {
  // 从请求头中获取用户信息（示例）
  const authToken = opts?.req.headers.get('authorization');

  return {
    // 可以把数据库 client、用户信息等放进 context
    // db,           ← Prisma Client 或 Drizzle 实例
    // user: await getUserFromToken(authToken),
    requestTime: new Date(),
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

```typescript
// ============================================================
// 文件 2: src/server/trpc/init.ts
// 初始化 tRPC 实例，定义 Procedure 构建器
// ============================================================
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';   // 支持 Date、Map、Set 等类型的序列化
import { type Context } from './context';
import { ZodError } from 'zod';

// 初始化 tRPC，配置 transformer 和错误格式化
const t = initTRPC.context<Context>().create({
  // superjson 让 tRPC 能序列化 Date、Map、Set 等原生 JSON 不支持的类型
  transformer: superjson,

  // 统一格式化 Zod 校验错误，让前端拿到友好的错误信息
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// 导出可复用的构建器
export const router = t.router;                 // 创建 Router
export const publicProcedure = t.procedure;     // 公开接口（无需认证）

// ========== 中间件示例：认证中间件 ==========
// 只有通过认证的请求才能访问
import { TRPCError } from '@trpc/server';

const isAuthed = t.middleware(async ({ ctx, next }) => {
  // 假设从 context 中获取用户
  // if (!ctx.user) {
  //   throw new TRPCError({ code: 'UNAUTHORIZED' });
  // }
  return next({
    ctx: {
      // user: ctx.user,  // 传递给下游 Procedure
    },
  });
});

// 需要认证的 Procedure（继承了 publicProcedure 的所有配置 + 认证逻辑）
export const protectedProcedure = t.procedure.use(isAuthed);
```

```typescript
// ============================================================
// 文件 3: src/server/trpc/routers/posts.ts
// 定义实际的路由和业务逻辑
// ============================================================
import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../init';

export const postsRouter = router({
  // 获取帖子列表（公开）
  list: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        perPage: z.number().min(1).max(100).default(20),
        status: z.enum(['draft', 'published']).optional(),
      })
    )
    .query(async ({ input }) => {
      const skip = (input.page - 1) * input.perPage;
      // 在实际项目中，这里调用数据库
      const posts = await db.posts.findMany({
        skip,
        take: input.perPage,
        where: input.status ? { status: input.status } : undefined,
        orderBy: { createdAt: 'desc' },
      });
      const total = await db.posts.count({
        where: input.status ? { status: input.status } : undefined,
      });
      return {
        posts,
        total,
        page: input.page,
        totalPages: Math.ceil(total / input.perPage),
      };
    }),

  // 根据 ID 获取帖子
  byId: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const post = await db.posts.findUnique({ where: { id: input.id } });
      if (!post) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '帖子不存在' });
      }
      return post;
    }),

  // 创建帖子（需要登录）
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(10).max(50000),
        tags: z.array(z.string()).max(5).default([]),
        status: z.enum(['draft', 'published']).default('draft'),
      })
    )
    .mutation(async ({ input }) => {
      return await db.posts.create({ data: input });
    }),

  // 更新帖子
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200).optional(),
        content: z.string().min(10).max(50000).optional(),
        status: z.enum(['draft', 'published']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await db.posts.update({ where: { id }, data });
    }),

  // 删除帖子
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.posts.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
```

```typescript
// ============================================================
// 文件 4: src/server/trpc/root.ts
// 合并所有 Router，导出 AppRouter 类型
// ============================================================
import { router } from './init';
import { postsRouter } from './routers/posts';
// import { usersRouter } from './routers/users';
// import { commentsRouter } from './routers/comments';

export const appRouter = router({
  posts: postsRouter,
  // users: usersRouter,
  // comments: commentsRouter,
});

// 导出类型给前端使用 —— 这是整个 tRPC 类型安全的基石
export type AppRouter = typeof appRouter;
```

```typescript
// ============================================================
// 文件 5: app/api/trpc/[trpc]/route.ts
// Next.js App Router 的 API 端点 —— 唯一的 HTTP 入口
// ============================================================
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/root';
import { createContext } from '@/server/trpc/context';

// 所有 tRPC 请求都走这一个端点
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',       // tRPC 的入口路径
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
// ↑ tRPC 的 query 用 GET，mutation 用 POST，两者都走同一个 handler
```

```typescript
// ============================================================
// 文件 6: src/lib/trpc/client.ts
// 前端 React 客户端 —— 让组件调用 API 像调用本地函数
// ============================================================
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/trpc/root';

// 创建类型安全的 React Hooks
export const trpc = createTRPCReact<AppRouter>();
```

```tsx
// ============================================================
// 文件 7: 前端组件中使用
// ============================================================
"use client";

import { trpc } from '@/lib/trpc/client';

export function PostList() {
  // 像调用本地函数一样调用 API，享受完整类型提示
  const { data, isLoading, error } = trpc.posts.list.useQuery({
    page: 1,
    perPage: 20,
  });

  if (isLoading) return <div>加载中...</div>;
  if (error) return <div>出错了：{error.message}</div>;

  return (
    <div>
      {data?.posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content.slice(0, 100)}...</p>
        </article>
      ))}
      <p>共 {data?.total} 篇，第 {data?.page} / {data?.totalPages} 页</p>
    </div>
  );
}

export function CreatePostButton() {
  const utils = trpc.useUtils();
  const createPost = trpc.posts.create.useMutation({
    onSuccess: () => {
      // 创建成功后刷新列表缓存
      utils.posts.list.invalidate();
    },
  });

  return (
    <button
      onClick={() =>
        createPost.mutate({
          title: '新帖子',
          content: '这是内容，至少 10 个字以上才能通过 Zod 校验',
        })
      }
      disabled={createPost.isPending}
    >
      {createPost.isPending ? '创建中...' : '创建帖子'}
    </button>
  );
}
```

---

### 六、tRPC vs REST vs GraphQL

| 维度 | REST | tRPC | GraphQL |
|------|------|------|---------|
| **类型安全** | ❌ 无（手动维护类型） | ✅ 编译时端到端安全 | ⚠️ 需要 codegen |
| **学习成本** | 低（HTTP 基础） | 低（TypeScript 函数调用） | 高（Schema 语言、Resolver） |
| **跨语言调用** | ✅ 任意语言 | ❌ 仅 TypeScript | ✅ 任意语言 |
| **过量/不足获取** | 可能过量 | ❌ 严格返回定义的类型 | ✅ 客户端指定字段 |
| **缓存策略** | HTTP 缓存（CDN） | React Query 缓存 | Apollo 缓存 |
| **文档生成** | OpenAPI/Swagger | 类型即文档 | GraphQL Playground |
| **调试工具** | curl、Postman | tRPC Panel | GraphQL Playground |
| **适用场景** | 公共 API、跨团队 | 内部全栈应用 | 复杂数据图、多客户端 |

> **选择建议**：
> - 前后端都是 TypeScript 的**内部应用** → 用 tRPC（类型安全零成本）
> - 需要**对外开放 API** 或对接第三方 → 用 REST（通用性最好）
> - 数据模型复杂、需要**客户端自由查询字段** → 用 GraphQL

---

### 七、tRPC 的局限性

#### 不适合对外开放的 API

tRPC 假设调用方有相同的 TypeScript 类型定义。对外部调用方来说：
- 没有标准化的 Content-Type（tRPC 用自有的序列化格式）
- 没有 OpenAPI 文档（虽然可以通过 trpc-openapi 插件生成，但增加了维护成本）
- 客户端库仅限 TypeScript（JavaScript 也可以用但失去类型安全）

#### 不适合跨语言调用

如果你的后端是 Go/Java，前端是 TypeScript，tRPC 用不了。这时应该用 REST 或 GraphQL。

#### 不适合超大文件上传/下载

tRPC 基于 JSON 序列化（即使用了 superjson），不适合传输二进制大文件。文件上传应该走独立的 REST 端点。

---

## 常见问题

### Q1：tRPC 和 REST 可以共存吗？

完全可以。一个 Next.js 项目里，tRPC 负责内部数据操作（CRUD），REST Route Handler 负责文件上传、Webhook 回调、OAuth 回调等特殊场景。它们共享数据库层，只是 API 入口不同。

### Q2：tRPC 的 query 一定用 GET 吗？

默认情况下，tRPC 的 query 用 GET，mutation 用 POST。但如果 query 的参数太长（超过 URL 长度限制），tRPC 会自动降级为 POST。客户端不需要做任何处理。

### Q3：Zod 校验失败时，前端能拿到详细的错误信息吗？

能。tRPC 把 ZodError 序列化后传给前端，包含每个字段的错误信息。你在 `initTRPC` 时配置的 `errorFormatter` 决定了前端收到的错误格式。

### Q4：tRPC 怎么处理大文件上传？

不要用 tRPC 传文件。单独写一个 REST Route Handler（`app/api/upload/route.ts`）处理文件上传。tRPC 只处理 JSON 数据。

### Q5：tRPC 和 Next.js Server Actions 怎么选？

- **Server Actions**：适合表单提交（`<form action={...}>`），内置渐进增强
- **tRPC**：适合数据查询和结构化 API 调用，有 React Query 的缓存/去重/重试能力

它们不冲突：表单提交用 Server Actions，复杂数据查询和列表操作用 tRPC。

### Q6：tRPC 的 middleware 和 Next.js middleware 有什么区别？

- **Next.js middleware**（`middleware.ts`）：在请求到达路由前执行，适合鉴权重定向、A/B 测试
- **tRPC middleware**：在 tRPC Procedure 执行前后执行，适合提取上下文、日志、权限校验

两者配合使用：Next.js middleware 做请求级别的保护，tRPC middleware 做 Procedure 级别的精细化控制。

### Q7：`useQuery` 和 `useMutation` 的数据怎么缓存和刷新？

tRPC 底层基于 **TanStack Query（React Query）**，提供完整的缓存策略：自动去重、后台刷新、乐观更新、缓存失效。你通过 `trpc.useUtils()` 可以手动操作缓存。

### Q8：生产环境中 tRPC 性能如何？有额外开销吗？

tRPC 本身几乎没有性能开销——它本质上就是把函数调用序列化为 HTTP 请求。唯一的额外步骤是 Zod 校验（这也是你想要的）。相比手写 REST API + 手动校验，tRPC 的性能是一样的，甚至可能更快（因为序列化/反序列化路径更短）。

---

## 实操作业

### 基础练习：搭建 tRPC 基础 CRUD

在一个新的 Next.js 项目中集成 tRPC，实现一个"留言板"功能：

- 配置 tRPC 的 context、init、root router
- 创建 `messagesRouter`：list（列表）、create（创建留言）
- 在前端用 `useQuery` 渲染留言列表，用 `useMutation` 提交新留言
- Zod 校验：留言内容 1-500 字，作者名 1-50 字

### 进阶练习：认证 + 权限控制

在上面的留言板基础上加入认证：

- 实现 `authMiddleware`，从请求头读取 JWT Token 并解析用户信息
- `protectedProcedure` 要求登录后才能创建留言
- 创建留言时自动绑定当前用户（从 `ctx.user` 获取），不需要客户端传 `authorId`
- 只有留言的作者才能删除自己的留言（在 Procedure 中检查权限）

### 挑战练习：tRPC + Drizzle ORM 完整博客

用 tRPC + Drizzle ORM + SQLite 实现一个完整的博客 API：

- 定义 `posts`、`comments`、`users` 三张表的 Drizzle Schema
- 实现帖子 CRUD、评论 CRUD、用户注册/登录
- 查询参数支持分页、排序、状态筛选
- 前端实现帖子列表页（带分页、加载态、空态）、帖子详情页（带评论列表）、创建帖子表单
- 创建帖子后乐观更新列表（不等接口返回就先把新帖子显示出来）

---

## 本节小结

tRPC 的核心价值是**用 TypeScript 类型消除前后端之间的人为同步成本**：

1. **Router → Procedure**：把 API 组织成 `posts.list`、`posts.create` 这样的层级结构
2. **Zod Schema = 单一真相源**：定义一次，前端拿到类型提示，后端拿到运行时校验
3. **query vs mutation**：读操作用 query（带缓存），写操作用 mutation（不带缓存）
4. **AppRouter 类型导出**：`export type AppRouter = typeof appRouter` 是整个类型安全的基石
5. **不适用于公开 API**：tRPC 假设调用方也是 TypeScript，对外 API 请用 REST

tRPC 不代表要抛弃 REST，它们是互补关系：**内部用 tRPC（类型安全），外部用 REST（通用兼容）**。对于前后端都是 TypeScript 的全栈项目，tRPC 是目前开发体验最好的方案。

下一节我们将学习数据校验与错误处理，深入 Zod 的高级用法和全链路错误处理模式。