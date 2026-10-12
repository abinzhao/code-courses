# 01 App Router 与文件约定

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L4 全栈与服务端
> - 先修：[构建、测试与部署自动化：前端 CI/CD 全链路实战](../../L3-工程化与质量保障/05-CICD流水线/02-构建-测试-部署自动化.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Next.js](https://nextjs.org/docs)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Next.js 解决的核心问题：SSR/SSG、文件路由、全栈能力
- 掌握 Pages Router → App Router 的演进原因和关键差异
- 理解 Server Components 默认模式和文件即路由的设计哲学
- 熟练使用 page.tsx、layout.tsx、loading.tsx、error.tsx 等文件约定
- 掌握动态路由、路由组、并行路由、拦截路由
- 能独立搭建带嵌套布局、加载态、错误处理的博客应用骨架

---

## 内容讲解

### 一、Next.js 是什么？解决了什么问题？

React 本身只是一个 UI 库，它不解决以下问题：

| 问题 | 纯 React | Next.js 方案 |
|------|---------|-------------|
| 首屏白屏（CSR 等 JS 下载） | ❌ 必须等 JS 执行 | SSR/SSG 预渲染 HTML |
| SEO 差（爬虫不执行 JS） | ❌ 空白 HTML | 服务端返回完整 HTML |
| 路由管理 | ❌ 需第三方库 | 文件系统即路由 |
| 数据获取（瀑布请求） | ❌ useEffect + fetch | Server Components 直接读数据库 |
| API 接口 | ❌ 需另起服务 | Route Handlers 内置 |
| 构建优化（代码分割/图片） | ❌ 手动配置 | 框架自动处理 |

简单说：**Next.js 让你用 React 写全栈应用**——前端界面、后端逻辑、API 接口都在同一个项目里。

---

### 二、Pages Router vs App Router：为什么需要新路由？

Next.js 13.4 引入 App Router，这不是简单的升级，而是一次底层架构重写：

#### 2.1 Pages Router 的痛点

```
pages/
  _app.tsx      ← 全局布局（所有页面共用，无法嵌套）
  _document.tsx ← 服务端 HTML 骨架
  index.tsx     ← /
  about.tsx     ← /about
  blog/
    [slug].tsx  ← /blog/:slug
```

**核心问题：**

- **所有组件默认客户端渲染**，即使不需要交互也得发 JS（导致大 Bundle）
- **布局不可嵌套**：`_app.tsx` 是全局的，没法给 `/blog` 一个侧边栏布局
- **数据获取靠 getServerSideProps / getStaticProps**，不是组件级别的，割裂了数据与 UI
- **不支持 Streaming SSR**，整个页面必须等服务端全部渲染完才能返回

#### 2.2 App Router 的解决方案

```
app/
  layout.tsx          ← 根布局（所有页面共享的壳）
  page.tsx            ← /
  about/
    page.tsx          ← /about
  blog/
    layout.tsx        ← /blog 下的共享布局（侧边栏、面包屑等）
    page.tsx          ← /blog
    [slug]/
      page.tsx        ← /blog/:slug
```

**关键改变：**

| 对比维度 | Pages Router | App Router |
|---------|-------------|-----------|
| 组件默认 | 客户端组件 | 服务端组件（React Server Components） |
| 布局 | 单一 `_app.tsx` | 嵌套 layout.tsx，支持多层 |
| 数据获取 | `getServerSideProps` 等页面级函数 | 组件内 `async/await` 直接获取 |
| 加载态 | 手动管理 | `loading.tsx` 自动包裹 Suspense |
| 错误处理 | 手动 try/catch | `error.tsx` 自动隔离错误 |
| 流式渲染 | 不支持 | `<Suspense>` 原生支持 Streaming |

> **避坑提示**：App Router 中**组件默认就是服务端组件**，不能使用 `useState`、`useEffect`、`onClick` 等。需要交互时，显式在文件顶部添加 `"use client"` 指令。

---

### 三、App Router 核心概念

#### 3.1 Server Components 默认

在 `app/` 目录下，每个文件**默认是 Server Component**：

```tsx
// app/page.tsx —— 默认是服务端组件
// ✅ 可以直接 async/await
// ✅ 可以直接访问数据库、文件系统
// ❌ 不能使用 useState、useEffect、onClick
export default async function HomePage() {
  // 服务端直接读数据，这段代码不会发送到浏览器
  const posts = await fetch('https://api.example.com/posts', {
    next: { revalidate: 60 }, // ISR：每 60 秒重新验证
  }).then(res => res.json());

  return (
    <main>
      <h1>博客首页</h1>
      {posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
    </main>
  );
}
```

需要交互时，才声明为客户端组件：

```tsx
"use client";
// ↑ 文件第一行，之前只能有注释

import { useState } from 'react';

export function SearchBar() {
  const [keyword, setKeyword] = useState('');
  return <input value={keyword} onChange={e => setKeyword(e.target.value)} />;
}
```

#### 3.2 文件即路由

App Router 的核心约定：**文件系统结构直接映射 URL 路径**。

```
app/                      → URL 映射
├── layout.tsx            → 根布局（包裹所有页面）
├── page.tsx              → /
├── about/page.tsx        → /about
├── blog/
│   ├── layout.tsx        → /blog 专用布局（不影响其他页面）
│   ├── page.tsx          → /blog
│   └── [slug]/page.tsx   → /blog/hello-world
├── api/
│   └── posts/route.ts    → /api/posts（API 路由）
└── dashboard/
    ├── layout.tsx        → /dashboard 布局
    ├── page.tsx          → /dashboard
    ├── loading.tsx       → /dashboard 加载态
    ├── error.tsx         → /dashboard 错误边界
    └── settings/page.tsx → /dashboard/settings
```

---

### 四、文件约定详解

#### 4.1 page.tsx —— 页面组件

定义路由对应的 UI。接收 `params` 和 `searchParams`：

```tsx
// app/blog/[slug]/page.tsx
interface Props {
  params: Promise<{ slug: string }>;  // Next.js 16 中 params 是 Promise
  searchParams: Promise<{ page?: string }>; // ?page=2
}

export default async function BlogPost({ params, searchParams }: Props) {
  const { slug } = await params;          // 动态路由参数
  const { page } = await searchParams;    // 查询参数
  // 用 slug 获取文章内容...
  return <article>{/* 文章内容 */}</article>;
}
```

> **避坑提示**：Next.js 15+ 中 `params` 和 `searchParams` 是 `Promise` 类型，需要 `await`。如果直接用 `params.slug` 而不 await，TypeScript 会报错。

#### 4.2 layout.tsx —— 布局组件

布局是**持久化**的：路由切换时，layout 不会重新挂载，只有 page 会更新。这对于导航栏、侧边栏非常重要。

```tsx
// app/layout.tsx —— 根布局
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '我的博客',
  description: '一个 Next.js 全栈博客',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <nav>{/* 全局导航栏，切换页面时不重新渲染 */}</nav>
        <main>{children}</main>
        <footer>{/* 全局页脚 */}</footer>
      </body>
    </html>
  );
}
```

嵌套布局示例：

```tsx
// app/blog/layout.tsx —— /blog 的子布局
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-layout">
      <aside>{/* 博客侧边栏：分类、标签 */}</aside>
      <article>{children}</article>  {/* page.tsx 渲染在这里 */}
    </div>
  );
}
```

实际渲染结果：
```
<RootLayout>              ← app/layout.tsx
  <nav>全局导航</nav>
  <BlogLayout>            ← app/blog/layout.tsx
    <aside>侧边栏</aside>
    <BlogPost />          ← app/blog/[slug]/page.tsx
  </BlogLayout>
</RootLayout>
```

#### 4.3 loading.tsx —— 加载态

自动为同级的 page.tsx 包裹 `<Suspense>`，在页面数据未就绪时显示：

```tsx
// app/blog/loading.tsx
export default function BlogLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
  );
}
```

当 `app/blog/page.tsx` 中的 `async` 组件在等待数据时，用户会先看到 loading.tsx 的内容，数据就绪后自动切换为 page.tsx。**不需要手写任何 `if (loading)` 判断。**

#### 4.4 error.tsx —— 错误边界

必须是 `"use client"` 组件，因为错误处理需要交互（重试按钮）：

```tsx
"use client";
// app/blog/error.tsx
// 接收 error 对象和 reset 函数（重新渲染）

export default function BlogError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="error-boundary">
      <h2>出错了：{error.message}</h2>
      <button onClick={reset}>重试</button>
    </div>
  );
}
```

**error.tsx 的隔离特性**：只有同级和子级的 page.tsx 错误会被捕获；layout.tsx 的错误不会被同级的 error.tsx 捕获（需要父级的 error.tsx 来处理）。

#### 4.5 not-found.tsx —— 404 页面

```tsx
// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div>
      <h1>404 - 页面不存在</h1>
      <Link href="/">返回首页</Link>
    </div>
  );
}
```

也可以在 page.tsx 中**主动触发** 404：

```tsx
import { notFound } from 'next/navigation';

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();  // 主动触发 404，渲染最近的 not-found.tsx
  return <article>{post.content}</article>;
}
```

#### 4.6 template.tsx —— 模板组件

与 layout.tsx 类似，但**每次路由切换都会重新挂载**（适合需要动画、重置状态的场景）：

```tsx
// app/template.tsx
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition animate-fade-in">{children}</div>;
}
```

| 特性 | layout.tsx | template.tsx |
|------|-----------|-------------|
| 路由切换时重新挂载 | ❌ 持久化 | ✅ 每次重新挂载 |
| 适合场景 | 导航栏、侧边栏 | 页面切换动画、重置表单 |
| 状态保持 | ✅ | ❌ |

---

### 五、路由组与动态路由

#### 5.1 路由组（Route Groups）：`(group)` 语法

括号文件夹**不影响 URL**，只用于逻辑分组：

```
app/
├── (marketing)/        ← 路由组：不影响 URL
│   ├── layout.tsx      ← 营销页面专用布局
│   ├── page.tsx        → /
│   └── about/page.tsx  → /about
└── (dashboard)/
    ├── layout.tsx      ← 后台专用布局（带侧边栏）
    ├── page.tsx        → /
    └── settings/page.tsx → /settings
```

> **避坑提示**：多个路由组的顶层 `page.tsx` 如果解析为同一 URL（比如 `/`），Next.js 会报错。每个 URL 只能匹配一个 page.tsx。

#### 5.2 动态路由

```tsx
// [slug]        —— 必选参数：/blog/hello-world  ✅   /blog  ❌
// [...slug]     —— 捕获所有：/docs/a/b/c  ✅  slug = ['a','b','c']
// [[...slug]]   —— 可选捕获：/docs  ✅  slug = undefined   /docs/a  ✅  slug = ['a']
```

```tsx
// app/blog/[slug]/page.tsx
export default async function Post({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // ...
}
```

#### 5.3 Parallel Routes（并行路由）

同一个 layout 下渲染多个 page，用 `@` 前缀的插槽：

```
app/
├── layout.tsx
├── @sidebar/          ← 插槽 1
│   └── page.tsx
├── @main/             ← 插槽 2
│   └── page.tsx
└── page.tsx           ← 默认子页（可选的 children）
```

```tsx
// app/layout.tsx —— 接收两个插槽作为 props
export default function Layout({
  children,
  sidebar,
  main,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  main: React.ReactNode;
}) {
  return (
    <div className="flex">
      <aside>{sidebar}</aside>
      <main>{main}</main>
    </div>
  );
}
```

#### 5.4 Intercepting Routes（拦截路由）

在导航时"拦截"目标路由，显示在当前页面之上（比如 Modal 形式的登录页）。用 `(.)` 语法：

```
app/
├── feed/
│   └── page.tsx          → /feed（信息流列表）
├── photo/
│   ├── [id]/
│   │   └── page.tsx      → /photo/123（独立照片页，直接访问时）
│   └── (.)photo/[id]/
│       └── page.tsx      → 拦截 /photo/123，在 /feed 中以 Modal 显示
```

- `(.)` 匹配同一层级
- `(..)` 匹配上一层级
- `(..)(..)` 匹配上两级
- `(...)` 从 app 根目录匹配

---

### 六、实战：搭建博客应用骨架

完整的文件结构：

```
app/
├── layout.tsx                    // 根布局：导航栏 + 页脚
├── page.tsx                      // 首页
├── loading.tsx                   // 首页加载态
├── error.tsx                     // 全局错误边界
├── not-found.tsx                 // 404
├── blog/
│   ├── layout.tsx                // 博客子布局：侧边栏
│   ├── page.tsx                  // /blog：文章列表
│   ├── loading.tsx               // 列表加载态
│   └── [slug]/
│       ├── page.tsx              // /blog/:slug：文章详情
│       └── loading.tsx           // 详情加载态
└── globals.css                   // 全局样式
```

```tsx
// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { template: '%s | 我的博客', default: '我的博客' },
  description: '基于 Next.js 16 的全栈博客',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <nav className="border-b p-4">
          <a href="/">🏠 首页</a> | <a href="/blog">📝 博客</a>
        </nav>
        <main className="max-w-4xl mx-auto p-4">{children}</main>
        <footer className="border-t p-4 text-center text-gray-500 mt-8">
          © 2026 我的博客
        </footer>
      </body>
    </html>
  );
}
```

```tsx
// app/blog/layout.tsx —— 嵌套布局
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-6">
      <aside className="border-r pr-4">
        <h3>分类</h3>
        <ul>
          <li>前端</li>
          <li>后端</li>
          <li>全栈</li>
        </ul>
      </aside>
      <div>{children}</div>
    </div>
  );
}
```

```tsx
// app/blog/page.tsx —— 文章列表（SSR）
interface Post {
  id: number;
  title: string;
  excerpt: string;
}

export default async function BlogList() {
  // 服务端直接请求数据，无需 useEffect
  const posts: Post[] = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5')
    .then(res => res.json());

  return (
    <div>
      <h1>博客列表</h1>
      {posts.map(post => (
        <article key={post.id} className="mb-4 p-4 border rounded">
          <h2>
            <a href={`/blog/${post.id}`} className="text-blue-600 hover:underline">
              {post.title}
            </a>
          </h2>
          <p className="text-gray-600">{post.body.slice(0, 100)}...</p>
        </article>
      ))}
    </div>
  );
}
```

```tsx
// app/blog/loading.tsx
export default function BlogLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="p-4 border rounded">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-full" />
        </div>
      ))}
    </div>
  );
}
```

```tsx
// app/blog/error.tsx
"use client";

export default function BlogError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="text-center py-12">
      <h2 className="text-red-600 text-xl">加载失败：{error.message}</h2>
      <button onClick={reset} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
        重试
      </button>
    </div>
  );
}
```

```tsx
// app/blog/[slug]/page.tsx —— 文章详情
import { notFound } from 'next/navigation';

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${slug}`);
  if (!res.ok) notFound();  // 文章不存在 → 404

  const post = await res.json();

  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <p className="text-gray-700 leading-relaxed">{post.body}</p>
    </article>
  );
}
```

---

## 常见问题

### Q1：App Router 里所有组件默认是服务端组件，那岂不是没法交互了？

不是的。你只需要在需要交互的组件文件顶部加 `"use client"` 即可。策略是：**尽量让"叶子组件"（按钮、表单、搜索框）作为客户端组件，外层保持服务端组件**，这样 Bundle 最小。

### Q2：layout.tsx 和 template.tsx 什么时候用哪个？

- **layout.tsx**：需要保持状态（导航栏选中态、侧边栏展开/收起），路由切换不重新挂载。
- **template.tsx**：需要每次路由切换重新触发动画、重置滚动位置、重置表单状态。

### Q3：为什么 params 是 `Promise<{ slug: string }>` 而不是直接 `{ slug: string }`？

这是 Next.js 15 引入的**异步 API**。原因是为未来的 PPR（Partial Prerendering）和流式渲染做准备——params 可能不是立即可用的。直接用 `await params` 即可，TypeScript 类型也正确。

### Q4：路由组 `(group)` 可以用来做什么？

最常见场景是**不同区域用不同布局**：比如 `(marketing)` 用营销页布局（全宽大图），`(dashboard)` 用后台布局（侧边栏 + 顶栏）。两个组可以有各自的 `layout.tsx`，但 URL 路径互不冲突。

### Q5：layout.tsx 的 data fetching 和 page.tsx 的能共用吗？

可以。layout 的数据获取和 page 是**并行**的（不是瀑布）。但注意：layout 不接收 `searchParams`，如果需要查询参数，只能在 page.tsx 中获取后通过 props 传给子组件。

### Q6：error.tsx 为什么必须是 `"use client"`？

因为 error.tsx 需要渲染一个**可交互的重试按钮**，而事件处理只能在客户端组件中进行。error.tsx 不能是 `async` 函数。

### Q7：`[...slug]` 和 `[[...slug]]` 的区别是什么？

- `[...slug]`：至少匹配一段路径。`/docs` → 404，`/docs/a` → `slug = ['a']`
- `[[...slug]]`：0 段或更多。`/docs` → `slug = undefined`，`/docs/a/b` → `slug = ['a', 'b']`

### Q8：文件约定太多记不住怎么办？

其实核心就 6 个：`page.tsx`（页面）、`layout.tsx`（布局）、`loading.tsx`（加载态）、`error.tsx`（错误）、`not-found.tsx`（404）、`route.ts`（API）。其余如 `template.tsx`、`default.tsx` 按需查阅即可。

---

## 实操作业

### 基础练习：搭博客骨架

使用 `npx create-next-app@latest` 初始化项目（选择 App Router + TypeScript），搭建一个博客应用：
- `app/blog/layout.tsx` 带侧边栏布局
- `app/blog/page.tsx` 请求 `https://jsonplaceholder.typicode.com/posts` 渲染列表
- `app/blog/loading.tsx` 骨架屏
- `app/blog/[id]/page.tsx` 文章详情，不存在时 404

### 进阶练习：多区域路由组

在上面的博客基础上加入后台管理：
- 使用 `(blog)` 和 `(admin)` 路由组，各自有独立 layout
- 后台 `/admin/posts` 页面用 `"use client"` 实现列表的客户端增删（local state 即可）
- 使用 parallel route 在后台页面的顶部添加一个 `@stats` 插槽展示统计数字

### 挑战练习：拦截路由 Modal

实现一个图片画廊：
- `/gallery` 页展示图片网格
- 点击图片时，通过 Intercepting Route 在当前页以 Modal 形式打开 `/photo/[id]`
- 直接访问 `/photo/[id]` 时展示完整的独立页面
- 提示：使用 `(.)photo/[id]/page.tsx` 实现拦截，`photo/[id]/page.tsx` 实现独立页

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：layout/page/loading/not-found 按路由边界放置，await params，读取响应检查状态。未知 id 调 notFound；列表慢响应显示骨架，服务端失败不泄漏堆栈。
- **进阶**：路由组不增加 URL，独立布局避免地址冲突；@stats 是命名 slot 并提供 default。软导航与硬刷新均检查，不能只测已保留的 slot 状态。
- **挑战**：完整 photo 路由与拦截 modal 共存；(.)/(..) 按路由 segment 而非磁盘层数选择。软点击弹窗、刷新独立页、关闭/后退恢复画廊，直接访问也正确。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L4 里程碑](../../projects/atlas/milestones/L4.md)
- 本课任务：按 L4 里程碑把“App Router 与文件约定”接入 Atlas 全栈版本，明确服务端信任边界、数据契约、失败响应和回滚方式。
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

App Router 是 Next.js 最重要的一次架构升级，核心变化是 **Server Components 默认 + 文件系统路由 + 嵌套布局**。你需要重点掌握：

1. **文件约定的优先级**：`page.tsx` > `layout.tsx` > `loading.tsx` > `error.tsx`，记住这几个基本全覆盖
2. **layout 持久化 vs template 重新挂载**：理解这个区别才能处理好状态和动画
3. **路由组 + 动态路由 + 拦截路由**：这三个组合起来可以构建任意复杂的路由结构
4. **"use client" 只在必要时添加**：这是控制 Bundle 体积的关键策略

下一节我们将深入 Next.js 的四种渲染策略（SSG / SSR / ISR / PPR），理解什么时候该用哪种。

<!-- course-nav:start -->
---

[上一篇：pack、版本管理与发布演练](../../L3-工程化与质量保障/06-npm包与SDK工程/02-pack-版本管理与发布演练.md) · [课程地图](../../README.md) · [下一篇：02 SSR / ISR / PPR 渲染策略](./02-SSR-ISR-PPR渲染策略.md)
<!-- course-nav:end -->
