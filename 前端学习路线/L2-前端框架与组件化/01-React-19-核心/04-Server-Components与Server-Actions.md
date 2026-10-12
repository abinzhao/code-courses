# 04 Server Components 与 Server Actions

## 学习目标

- 理解 React Server Components（RSC）的核心概念和设计动机
- 能区分"服务端组件"和"客户端组件"的职责边界
- 掌握 `"use client"` 和 `"use server"` 指令的使用规则
- 理解 RSC 的限制：不能用 Hooks、不能绑定事件、不能使用浏览器 API
- 掌握 Server Actions 作为表单处理新范式的用法
- 掌握 `useActionState` 和 `useFormStatus` 两个新 Hook
- 理解 RSC 的数据流向：Server Component → Client Component（props 序列化）

---

## 内容讲解

### 1. React Server Components（RSC）：为什么需要它？

传统 React 应用的所有组件都在浏览器里运行，这意味着：

```
浏览器下载 → JS Bundle → 解析 → 渲染 → 显示
              ↑ 可能包含大量不参与交互的组件代码
```

RSC 的核心思想很简单：**把不需要交互的组件留在服务端渲染**，只把结果（HTML/VNode）和交互组件（客户端组件）的代码送给浏览器。

```
服务端执行 RSC → 生成序列化结果 → 浏览器只接收渲染结果 + 客户端组件 JS
                                    ↑ Bundle 体积大幅减少
```

| 对比维度 | 传统 CSR | RSC |
|---------|---------|-----|
| 组件执行地点 | 浏览器 | 浏览器 + 服务端 |
| JS Bundle 大小 | 大（所有组件代码） | 小（只包含客户端组件） |
| 数据请求 | 客户端 fetch，有瀑布请求 | 服务端直接读数据库，无瀑布 |
| SEO | 差（空白 HTML） | 好（服务端返回完整 HTML） |
| 交互能力 | 全部可用 | 仅客户端组件可交互 |

---

### 2. 服务端组件 vs 客户端组件

#### 2.1 默认规则

在 React 19（配合 Next.js App Router 等框架）中，**组件默认是服务端组件**。需要客户端能力时才显式声明：

```tsx
// ===== 服务端组件（默认） =====
// 可以直接访问数据库、文件系统等后端资源
async function UserList() {
  // ✅ 直接查询数据库（代码不会发送到浏览器）
  const users = await db.user.findMany();

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}

// ===== 客户端组件（需要显式声明） =====
"use client"; // 必须在文件第一行

import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

#### 2.2 能力边界

| 能力 | 服务端组件 | 客户端组件 |
|------|----------|----------|
| 访问数据库/文件系统 | ✅ | ❌ |
| Hooks（useState、useEffect 等） | ❌ | ✅ |
| 事件处理（onClick 等） | ❌ | ✅ |
| 浏览器 API（localStorage 等） | ❌ | ✅ |
| async/await 直接写在组件里 | ✅ | ❌ |
| 传递 props 给客户端组件 | ✅（需可序列化） | ✅ |
| 接收 children | ✅ | ✅ |
| `"use server"` 指令 | ✅ | ❌ |

> **避坑提示**：服务端组件不能引入和使用客户端特有的东西。如果你在服务端组件里写了 `useState` 或 `useEffect`，编译阶段就会报错。同样，客户端组件不能直接引入数据库模块。

---

### 3. "use client" 和 "use server" 指令

#### 3.1 "use client"：声明客户端边界

```tsx
"use client";
// ↑ 必须在文件最顶部，之前只能有注释

import { useState } from 'react';

// 这个文件及其子组件（如果没有额外声明 "use server"）
// 都会在客户端执行
export default function InteractiveForm() {
  const [name, setName] = useState('');
  return <input value={name} onChange={e => setName(e.target.value)} />;
}
```

关键规则：
- `"use client"` 标记的是**客户端边界**，该文件以及它引入的所有文件都会被打包到客户端
- 服务端组件可以把客户端组件作为子组件传递（`children`），从而突破边界限制
- 一个文件不能同时是服务端组件和客户端组件

#### 3.2 "use server"：声明服务器行为

```tsx
// 方式一：在 async 函数文件顶部
"use server";

export async function createUser(formData: FormData) {
  const name = formData.get('name');
  await db.user.create({ data: { name } });
}

// 方式二：在组件内部的内联函数
import { createUser } from './actions';

function Form() {
  // 直接在 action 属性上调用
  return (
    <form action={createUser}>
      <input name="name" />
      <button type="submit">创建用户</button>
    </form>
  );
}
```

---

### 4. Server Actions：表单处理新范式

Server Actions 让你直接从 `<form>` 的 `action` 属性调用服务端函数，不需要手写事件处理器和 fetch 调用。

```tsx
// ===== actions.ts（服务端文件）=====
"use server";

import { revalidatePath } from 'next/cache';

export async function addComment(formData: FormData) {
  // 直接在服务端操作数据库
  const content = formData.get('content') as string;
  const author = formData.get('author') as string;

  if (!content || !author) {
    return { error: '请填写所有字段' };
  }

  await db.comment.create({
    data: { content, author, createdAt: new Date() },
  });

  // 重新验证页面缓存，确保数据刷新
  revalidatePath('/comments');
  return { success: true };
}
```

```tsx
// ===== CommentForm.tsx（客户端组件）=====
"use client";

import { addComment } from './actions';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  // useFormStatus 必须在使用 <form action> 的子组件中调用
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? '提交中...' : '发布评论'}
    </button>
  );
}

export default function CommentForm() {
  // useActionState：管理 Server Action 的执行状态
  const [state, formAction] = useActionState(addComment, { error: null });

  return (
    <form action={formAction}>
      <div>
        <input name="author" placeholder="你的名字" required />
      </div>
      <div>
        <textarea name="content" placeholder="写评论..." required />
      </div>
      <SubmitButton />
      {state?.error && <p className="error">{state.error}</p>}
      {state?.success && <p className="success">评论发表成功！</p>}
    </form>
  );
}
```

| API | 用途 | 返回值 |
|-----|------|--------|
| `useActionState(fn, init)` | 管理 Server Action 的状态 | `[state, formAction, isPending]` |
| `useFormStatus()` | 读取表单提交状态 | `{ pending, data, method, action }` |

> **避坑提示**：`useFormStatus` 必须作为表单组件内部的**子组件**来调用，不能直接在包含 `<form>` 的同一个组件里调用——它读取的是**最近祖先** `<form>` 的状态。

---

### 5. RSC 的数据流

#### 5.1 Server → Client：Props 序列化

```tsx
// ===== 服务端组件：获取数据 =====
async function CommentsPage() {
  const comments = await db.comment.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1>留言板</h1>
      {/* 服务端组件把数据作为 props 传给客户端组件 */}
      <CommentList comments={comments} />
      <CommentForm />
    </div>
  );
}

// ===== 客户端组件：接收数据并渲染交互 =====
"use client";

import { useState } from 'react';

function CommentList({ comments: initialComments }) {
  const [sortOrder, setSortOrder] = useState('desc');

  const sorted = [...initialComments].sort((a, b) => {
    return sortOrder === 'desc'
      ? b.createdAt - a.createdAt
      : a.createdAt - b.createdAt;
  });

  return (
    <div>
      <button onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}>
        切换排序
      </button>
      <ul>
        {sorted.map(c => (
          <li key={c.id}>
            <strong>{c.author}</strong>: {c.content}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**序列化限制**：从服务端组件传给客户端组件的 props 必须是可序列化的（JSON-safe）。函数、类实例、Symbol、Promise 都不能直接传递。

#### 5.2 组件树混合模式

```
服务端组件 (Page)                  ← 可以 async，直接读数据库
├── 服务端组件 (Sidebar)           ← 静态内容，在服务端渲染
├── 客户端组件 (CommentForm)       ← "use client"，需交互
│   └── 客户端组件 (SubmitButton)  ← 使用 useFormStatus
└── 客户端组件 (CommentList)       ← "use client"，接收序列化 props
    └── 客户端组件 (CommentItem)   ← 每一条评论的渲染
```

---

### 6. 实战：带 RSC 数据加载 + Server Action 的留言板

```tsx
// ===== app/comments/page.tsx（服务端页面） =====
import { db } from '@/lib/db';
import CommentForm from './CommentForm';
import CommentList from './CommentList';

// 服务端组件：直接获取数据
export default async function CommentsPage() {
  const comments = await db.comment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return (
    <main className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">留言板</h1>

      {/* Server Action 表单 */}
      <CommentForm />

      {/* 数据通过 props 传递给客户端组件 */}
      <CommentList comments={comments} />
    </main>
  );
}

// ===== app/comments/actions.ts（Server Actions）=====
"use server";

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function addComment(prevState: any, formData: FormData) {
  const author = formData.get('author') as string;
  const content = formData.get('content') as string;

  // 服务端校验
  if (!author?.trim() || !content?.trim()) {
    return { error: '昵称和内容不能为空' };
  }

  if (content.length > 500) {
    return { error: '评论不能超过 500 字' };
  }

  try {
    await db.comment.create({
      data: {
        author: author.trim(),
        content: content.trim(),
      },
    });

    // 让页面重新获取最新数据
    revalidatePath('/comments');
    return { success: true };
  } catch {
    return { error: '发表失败，请稍后重试' };
  }
}

// ===== app/comments/CommentForm.tsx（客户端） =====
"use client";

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addComment } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
    >
      {pending ? '发布中...' : '发布评论'}
    </button>
  );
}

export default function CommentForm() {
  const [state, formAction] = useActionState(addComment, {
    error: null,
    success: false,
  });

  return (
    <form action={formAction} className="mb-8 p-4 bg-gray-50 rounded">
      <div className="mb-3">
        <input
          name="author"
          placeholder="你的昵称"
          className="border p-2 rounded w-full"
          required
        />
      </div>
      <div className="mb-3">
        <textarea
          name="content"
          placeholder="写下你的评论..."
          rows={3}
          className="border p-2 rounded w-full"
          required
        />
      </div>
      <SubmitButton />
      {state?.error && <p className="text-red-500 mt-2">{state.error}</p>}
      {state?.success && <p className="text-green-500 mt-2">评论发表成功！</p>}
    </form>
  );
}

// ===== app/comments/CommentList.tsx（客户端）=====
"use client";

import { useState } from 'react';

export default function CommentList({ comments: initialComments }) {
  const [sortOrder, setSortOrder] = useState('newest');

  const sorted = [...initialComments].sort((a, b) => {
    if (sortOrder === 'newest') return b.createdAt - a.createdAt;
    return a.createdAt - b.createdAt;
  });

  if (sorted.length === 0) {
    return <p className="text-gray-500">暂无评论，抢个沙发吧！</p>;
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSortOrder('newest')}
          className={`px-3 py-1 rounded ${sortOrder === 'newest' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          最新
        </button>
        <button
          onClick={() => setSortOrder('oldest')}
          className={`px-3 py-1 rounded ${sortOrder === 'oldest' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          最早
        </button>
      </div>
      <ul className="space-y-4">
        {sorted.map(comment => (
          <li key={comment.id} className="border-b pb-3">
            <div className="flex items-center gap-2">
              <strong>{comment.author}</strong>
              <span className="text-gray-400 text-sm">
                {new Date(comment.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
            <p className="mt-1 text-gray-700">{comment.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 常见问题

**Q1：RSC 和 SSR 有什么区别？**

SSR（Server-Side Rendering）是在服务端把组件渲染成 HTML 字符串发给浏览器，但**组件仍然会被打包到客户端 JS 中**进行"水合"（hydration）。RSC 的组件代码**根本不会**发送到客户端，只发送渲染结果。

**Q2：服务端组件不能用什么？**

不能用 Hooks（useState、useEffect 等任何 useXxx）、不能绑定事件处理器（onClick 等）、不能用浏览器 API（localStorage、navigator 等）、不能用 Context（Provider/useContext）、不能使用仅客户端可用的第三方库。

**Q3：同一个文件同时是服务端和客户端组件？**

不行。一个文件要么是服务端组件（默认），要么是客户端组件（声明 `"use client"`）。但可以把客户端组件作为服务端组件的 children 传入。

**Q4：Server Action 和传统 API Route 的区别？**

Server Action 不需要手动定义路由、不需要手写 fetch、支持渐进式增强（JS 禁用时仍可通过普通表单提交工作）。它更接近"后端方法直接在前端调用"的范式。

**Q5：`useActionState` 和 `useState` + 手动 fetch 比有什么优势？**

`useActionState` 与 Server Actions 深度集成，自动处理 pending 状态、表单重置、渐进增强。不需要手动管理 loading/error 状态，也不需要写 useEffect + fetch 的样板代码。

**Q6：客户端组件怎么获取服务端数据？**

两种方式：(1) 通过服务端父组件把数据作为 props 传递；(2) 在客户端组件中用传统方式（fetch / React Query）请求 API。前者是 RSC 推荐的数据获取模式，避免了客户端 API 调用。

**Q7：`revalidatePath` 和 `revalidateTag` 的区别？**

`revalidatePath('/comments')` 按 URL 路径清除缓存；`revalidateTag('comments')` 按标签清除缓存（需要 fetch 时设置 `next: { tags: ['comments'] }`）。路径方式更简单，标签方式更灵活。

**Q8：什么时候该用 `"use client"`？**

只有当组件需要以下能力之一时才加：Hooks、事件处理、浏览器 API、Context 消费、仅客户端可用的第三方库。原则：尽可能让更多代码留在服务端。

---

## 实操作业

### 基础：静态博客列表
用 RSC 从本地数据源（JSON 文件或模拟数据）读取文章列表，在服务端组件中渲染。为每篇文章提供一个"点赞"按钮——这个按钮是客户端组件。

### 进阶：完整留言板
实现上一节实战代码中的完整留言板，包括 RSC 数据加载、Server Action 表单提交、`useFormStatus` 提交状态、`useActionState` 错误处理，以及评论排序。

### 挑战：带乐观更新的留言板
在进阶的基础上，实现乐观更新（Optimistic Update）：评论先立即出现在列表中（用临时 ID），同时发起 Server Action；成功后替换临时 ID；失败后回滚并提示错误。

---

## 本节小结

- RSC 的核心价值：减少客户端 JS 体积、服务端直连数据源、消除瀑布请求
- `"use client"` 标记客户端边界，"use server" 标记服务器行为
- 服务端组件：不能用 Hooks、不能绑事件、不能访问浏览器 API
- Server Actions 让表单处理从 `onSubmit + fetch` 变成 `<form action={fn}>` 的声明式范式
- `useActionState` 管理 Server Action 状态，`useFormStatus` 读取表单提交状态
- 数据流：Server Component → 序列化 props → Client Component
- 原则：尽可能把代码留在服务端，只在需要交互时用 `"use client"`