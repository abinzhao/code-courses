# 04 Server Components 与 Server Actions

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[03 进阶 Hooks：useReducer、useMemo、useCallback 等](./03-进阶Hooks-useReducer-useMemo-useCallback.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[React](https://react.dev/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

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

传统纯 CSR 应用的组件主要在浏览器里运行，这意味着：

```
浏览器下载 → JS Bundle → 解析 → 渲染 → 显示
              ↑ 可能包含大量不参与交互的组件代码
```

RSC 的核心思想是：**把不需要交互的组件留在服务端执行**。框架把 Server Component 的结果编码为 RSC Payload（也称 Flight 数据），并只为客户端组件发送浏览器所需的 JavaScript；首屏是否同时生成 HTML 取决于框架是否组合了 SSR。

```
服务端执行 RSC → 生成 RSC Payload ─┬→ 可选 SSR 生成首屏 HTML
                                  └→ 客户端组件引用与所需 JS
```

| 对比维度 | 传统 CSR | RSC |
|---------|---------|-----|
| 组件执行地点 | 浏览器 | 浏览器 + 服务端 |
| JS Bundle 大小 | 取决于客户端依赖 | 服务端组件代码不进入客户端 Bundle |
| 数据请求 | 容易在 Effect 中形成瀑布 | 可贴近数据源读取，但嵌套顺序请求仍可能形成瀑布 |
| 首屏 HTML / SEO | CSR、预渲染和 SSR 结果不同 | 通常由框架结合 SSR/静态生成提供 |
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
| 客户端状态/副作用 Hook（useState、useEffect 等） | ❌ | ✅ |
| 事件处理（onClick 等） | ❌ | ✅ |
| 浏览器 API（localStorage 等） | ❌ | ✅ |
| 组件函数本身声明为 async | ✅ | ❌（事件处理器等普通函数仍可 async） |
| 传递 props 给客户端组件 | ✅（需可序列化） | ✅ |
| 接收 children | ✅ | ✅ |
| 定义内联 Server Function | ✅ | ❌（客户端组件只能导入模块级 Server Function） |

> **避坑提示**：服务端组件不能引入和使用客户端特有的东西。如果你在服务端组件里写了 `useState` 或 `useEffect`，编译阶段就会报错。同样，客户端组件不能直接引入数据库模块。

---

### 3. "use client" 和 "use server" 指令

#### 3.1 "use client"：声明客户端边界

```tsx
"use client";
// ↑ 必须在文件最顶部，之前只能有注释

import { useState } from 'react';

// 这个文件及其静态导入会进入客户端模块图
export default function InteractiveForm() {
  const [name, setName] = useState('');
  return <input value={name} onChange={e => setName(e.target.value)} />;
}
```

关键规则：
- `"use client"` 标记的是**客户端边界**，该文件以及它引入的所有文件都会被打包到客户端
- 服务端组件可以把已经渲染的服务端内容作为 `children` 传给客户端组件
- 一个文件不能同时是服务端组件和客户端组件

#### 3.2 "use server"：声明服务器行为

```tsx
// 方式一：在 async 函数文件顶部
"use server";

export async function createUser(formData: FormData) {
  const name = formData.get('name');
  await db.user.create({ data: { name } });
}
```

客户端组件需要调用时，从模块级 `"use server"` 文件导入：

```tsx
"use client";
import { createUser } from './actions';

function CreateUserForm() {
  // 直接在 action 属性上调用
  return (
    <form action={createUser}>
      <input name="name" />
      <button type="submit">创建用户</button>
    </form>
  );
}
```

内联写法只能出现在服务端组件中：

```tsx
export default function CreateUserPage() {
  async function createUser(formData: FormData) {
    "use server";
    const name = formData.get('name');
    await db.user.create({ data: { name } });
  }

  return <form action={createUser}>{/* fields */}</form>;
}
```

---

### 4. Server Actions：表单处理新范式

Server Actions 让你直接从 `<form>` 的 `action` 属性调用服务端函数，不需要手写事件处理器和 fetch 调用。

```tsx
// ===== actions.ts（服务端文件）=====
"use server";

import { revalidatePath } from 'next/cache';

export type CommentActionState = {
  error?: string;
  success?: boolean;
};

export async function addComment(
  previousState: CommentActionState,
  formData: FormData
): Promise<CommentActionState> {
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
  const [state, formAction, isPending] = useActionState(addComment, {});

  return (
    <form action={formAction}>
      <div>
        <input name="author" placeholder="你的名字" required />
      </div>
      <div>
        <textarea name="content" placeholder="写评论..." required />
      </div>
      <SubmitButton />
      {isPending && <span aria-live="polite">正在提交</span>}
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

> **安全边界**：Server Function 的参数由客户端控制。每个写操作都必须在服务端重新做输入校验、身份认证和资源级授权，不能因为函数写在服务端文件里就默认调用者可信。

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

SSR 描述的是“如何生成首屏 HTML”，RSC 描述的是“哪些组件在服务端执行以及如何跨边界传输结果”。客户端组件参与 SSR 后仍需发送 JavaScript 进行水合；纯 Server Component 的实现代码不会进入客户端 Bundle。两者可以组合使用，不是互斥方案。

**Q2：服务端组件不能用什么？**

不能使用依赖客户端状态和副作用的 Hook（如 `useState`、`useEffect`），不能绑定浏览器事件处理器，不能访问 `localStorage`、`navigator` 等浏览器 API，也不能直接消费客户端 Context。不能把规则简化成“任何 `useXxx` 都不能用”，因为 React 的 `use` API可在支持的服务端场景读取 Promise。

**Q3：同一个文件同时是服务端和客户端组件？**

不行。一个文件要么是服务端组件（默认），要么是客户端组件（声明 `"use client"`）。但可以把客户端组件作为服务端组件的 children 传入。

**Q4：Server Action 和传统 API Route 的区别？**

Server Action 不需要手动定义路由、不需要手写 fetch、支持渐进式增强（JS 禁用时仍可通过普通表单提交工作）。它更接近"后端方法直接在前端调用"的范式。

**Q5：`useActionState` 和 `useState` + 手动 fetch 比有什么优势？**

`useActionState` 会保存 Action 返回状态，并提供 `isPending`；结合表单 Action 时可支持渐进增强。它不会替你定义错误结构、业务校验或所有表单重置策略，这些仍需显式设计。

**Q6：客户端组件怎么获取服务端数据？**

两种方式：(1) 通过服务端父组件把数据作为 props 传递；(2) 在客户端组件中用传统方式（fetch / React Query）请求 API。前者是 RSC 推荐的数据获取模式，避免了客户端 API 调用。

**Q7：`revalidatePath` 和 `revalidateTag` 的区别？**

`revalidatePath('/comments')` 按 URL 路径重新验证；`revalidateTag('comments', 'max')` 把标签数据标记为 stale，并采用 stale-while-revalidate。Next.js 16 的单参数 `revalidateTag` 已弃用；Server Action 提交后要求立即读到新值时应使用 `updateTag('comments')`。

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

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“Server Components 与 Server Actions”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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

- RSC 的核心价值：让部分组件代码不进入客户端 Bundle，并允许组件贴近服务端数据源
- `"use client"` 标记客户端模块边界，`"use server"` 标记 Server Function，不是 Server Component 标记
- 服务端组件不能使用客户端状态、副作用、事件处理和浏览器 API
- Server Actions 让表单处理从 `onSubmit + fetch` 变成 `<form action={fn}>` 的声明式范式
- `useActionState` 管理 Action 返回状态和 pending，`useFormStatus` 读取父表单提交状态
- 数据流：Server Component → 序列化 props → Client Component
- 原则：尽可能把代码留在服务端，只在需要交互时用 `"use client"`

<!-- course-nav:start -->
---

[上一篇：03 进阶 Hooks：useReducer、useMemo、useCallback 等](./03-进阶Hooks-useReducer-useMemo-useCallback.md) · [课程地图](../../README.md) · [下一篇：05 并发渲染与 Suspense](./05-并发渲染与Suspense.md)
<!-- course-nav:end -->
