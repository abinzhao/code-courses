# 03 Server Actions 与数据变更

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L4 全栈与服务端
> - 先修：[02 SSR / ISR / PPR 渲染策略](./02-SSR-ISR-PPR渲染策略.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Next.js](https://nextjs.org/docs)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Server Actions 的概念：在服务端执行的异步函数
- 掌握 `"use server"` 指令的两种使用方式和适用场景
- 能用 Server Action 处理表单：action 属性绑定、FormData 解析
- 掌握 `useActionState` 管理表单状态和验证
- 掌握 `useFormStatus` 获取提交状态（Pending 态）
- 掌握 `useOptimistic` 实现乐观更新
- 理解 `revalidatePath` / `revalidateTag` / `redirect` 在 Server Action 中的用法
- 了解 Server Actions 的安全边界
- 实现一个完整的 CRUD 留言板（增删改查 + 乐观更新 + 错误处理）

---

## 内容讲解

### 一、Server Actions 是什么？

传统 React 表单处理流程：

```
用户在浏览器填表单 → onSubmit → fetch('/api/submit') → 后端处理 → 返回结果 → 更新 UI
```

Server Actions 把这条链路简化成：

```
用户在浏览器填表单 → <form action={serverAction}> → 服务端直接处理 → 自动更新 UI
```

**核心思想**：表单可以直接调用服务端函数，不再需要手写 `fetch` 请求层。Server Action 仍然是公开的网络入口，输入验证、身份认证、授权、错误映射和幂等性都不能省略。它是在服务端执行、可由 React 组件触发的异步 Server Function。

---

### 二、"use server" 指令的两种用法

#### 2.1 方式一：文件级别（Server Action 模块）

```tsx
"use server";
// 文件顶部声明：该文件内所有导出函数都是 Server Actions

// app/actions/posts.ts
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// 每个 export async function 都是 Server Action
export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  // ✅ 在服务端执行：直接操作数据库、文件系统
  // const post = await db.post.create({ data: { title, content } });

  revalidatePath('/posts');  // 刷新 /posts 页面的缓存
  redirect('/posts');         // 重定向到文章列表
}

export async function deletePost(id: number) {
  // await db.post.delete({ where: { id } });
  revalidatePath('/posts');
}
```

#### 2.2 方式二：函数级别（内联到服务端组件）

```tsx
// app/posts/new/page.tsx —— 服务端组件
import { revalidatePath } from 'next/cache';

export default function CreatePostPage() {
  // 内联 Server Action 必须定义在服务端组件中
  async function createPost(formData: FormData) {
    "use server";

    const title = formData.get('title') as string;

    if (!title || title.length < 3) {
      throw new Error('标题至少 3 个字符');
    }

    await db.post.create({ data: { title } });
    revalidatePath('/posts');
  }

  return (
    <form action={createPost}>
      <input name="title" />
      <button type="submit">创建文章</button>
    </form>
  );
}
```

| 特性 | 文件级别 `"use server"` | 函数级别 `"use server"` |
|------|----------------------|------------------------|
| 声明位置 | 文件顶部 | 异步函数体内第一行 |
| 复用性 | 高（可跨组件导入） | 低（仅在该组件内） |
| 参数 | 可序列化参数或 `FormData` | 可序列化参数或 `FormData` |
| 适用场景 | 需要复用或供客户端组件导入 | 依赖当前服务端组件上下文的局部操作 |

> **避坑提示**：函数级别的 `"use server"` 只能内联在**服务端组件**中，且必须写在异步函数体第一行。客户端组件需要调用 Server Action 时，应从文件顶部带 `"use server"` 的独立模块导入。`useActionState` 所要求的 `prevState` 参数来自 Hook 包装，不是内联指令本身的规则。

---

### 三、表单处理

#### 3.1 基础表单：action 属性绑定

```tsx
// app/actions/posts.ts
"use server";

import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  // 服务端验证
  if (!title || title.trim().length === 0) {
    throw new Error('标题不能为空');
  }

  console.log('服务端收到:', { title, content }); // 只会在终端输出，不会到浏览器
  // await db.post.create({ data: { title, content } });

  revalidatePath('/posts');
}
```

```tsx
// app/posts/new/page.tsx —— 客户端组件
"use client";

import { createPost } from '@/app/actions/posts';

export default function NewPostPage() {
  return (
    <form action={createPost}>
      {/* ← 直接绑定 Server Action，不需要 onSubmit */}
      <input name="title" type="text" placeholder="标题" required />
      <textarea name="content" placeholder="内容" required />
      <button type="submit">发布</button>
    </form>
  );
}
```

两点重要变化：
1. 使用 `<form action={...}>` 时不需要自己编写 `onSubmit` 或调用 `e.preventDefault()`
2. `<input name="xxx">` 的值自动通过 FormData 传入，不需要 `useState` 管理

#### 3.2 渐进增强：即使 JS 没加载也能提交

Server Action 表单是**纯 HTML form** 的增强版。如果 JS 还没加载完（慢网络），表单依然可以提交——浏览器发送原生 POST 请求，Next.js 服务端处理。JS 加载完成后，Next.js 自动升级为 SPA 式的无刷新提交。

---

### 四、useActionState：管理表单状态

`useActionState` 是 React 19 引入的 Hook，专为 Server Action 设计。它帮你管理"提交前状态 → 提交中 → 提交结果"这条链路。

```tsx
// app/actions/messages.ts
"use server";

// useActionState 会把上一次状态作为第一个参数传入
export async function submitMessage(
  prevState: { error?: string; success?: string },
  formData: FormData
) {
  const content = formData.get('content') as string;

  // 服务端验证
  if (!content || content.trim().length < 2) {
    return { error: '留言内容至少 2 个字符' };
  }
  if (content.length > 500) {
    return { error: '留言内容不能超过 500 字符' };
  }

  // 模拟存储
  // await db.message.create({ data: { content } });

  return { success: '留言发布成功！' };
}
```

```tsx
// app/messages/MessageForm.tsx
"use client";

import { useActionState } from 'react';
import { submitMessage } from '@/app/actions/messages';

export function MessageForm() {
  // useActionState(action, initialState)
  // 返回值：[state, formAction, isPending]
  const [state, formAction, isPending] = useActionState(submitMessage, {});

  return (
    <form action={formAction} className="space-y-4">
      <textarea
        name="content"
        placeholder="写下你的留言..."
        className="w-full border rounded p-2"
        rows={4}
        required
      />

      {/* 错误信息 */}
      {state?.error && (
        <p className="text-red-500 text-sm">{state.error}</p>
      )}

      {/* 成功信息 */}
      {state?.success && (
        <p className="text-green-500 text-sm">{state.success}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {isPending ? '发布中...' : '发布留言'}
      </button>
    </form>
  );
}
```

**useActionState 签名：**

```tsx
const [state, formAction, isPending] = useActionState(
  action,       // (prevState, formData) => Promise<newState>
  initialState  // 初始状态值
);
```

> **避坑提示**：Server Action 的第一个参数 `prevState` 类型必须和 `initialState` 一致。如果类型不匹配，TypeScript 会报错但运行时行为可能不符合预期。

---

### 五、useFormStatus：获取表单提交状态

`useFormStatus` 用于获取**父级 `<form>`** 的提交状态。它必须写在 `<form>` 的**子组件**中：

```tsx
"use client";

import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  // pending   —— 是否正在提交
  // data      —— 正在提交的 FormData
  // method    —— HTTP 方法（GET 或 POST）
  // action    —— 表单的 action URL

  return (
    <button type="submit" disabled={pending}>
      {pending ? '提交中...' : '提交'}
    </button>
  );
}

// 父组件中
export function MyForm() {
  return (
    <form action={myServerAction}>
      <input name="email" />
      <SubmitButton />  {/* ← useFormStatus 在这里面 */}
    </form>
  );
}
```

`useFormStatus` vs `useActionState` 的 `isPending`：
- `useActionState` 的 `isPending`：整个 action 的生命周期
- `useFormStatus` 的 `pending`：当前 `<form>` 的提交状态
- 如果只有一个表单，两者效果相同；多个表单时用 `useFormStatus` 可以精确控制每个 `<form>` 下的按钮。

---

### 六、useOptimistic：乐观更新

"乐观更新"的意思是：**先假设操作成功，立刻更新 UI，如果失败了再回滚**。这给用户的体验就是"操作零延迟"。

```tsx
"use client";

import { startTransition, useOptimistic, useState } from 'react';
import { deleteMessage } from '@/app/actions/messages';

interface Message {
  id: number;
  content: string;
}

interface Props {
  initialMessages: Message[];  // 从服务端组件传入的初始数据
}

export function MessageList({ initialMessages }: Props) {
  const [error, setError] = useState('');

  // useOptimistic(数据源, 更新函数)
  const [optimisticMessages, addOptimistic] = useOptimistic(
    initialMessages,
    // 更新函数：接收当前状态 + 要移除的 id，返回新状态
    (currentMessages: Message[], deletedId: number) =>
      currentMessages.filter(msg => msg.id !== deletedId)
  );

  function handleDelete(id: number) {
    startTransition(async () => {
      // ① 先乐观更新 UI（立刻移除这条留言）
      addOptimistic(id);
      setError('');

      // ② 再调用 Server Action 执行真实删除
      try {
        await deleteMessage(id);
      } catch (cause) {
        // 当前乐观覆盖会在 Action 结束后消失；这里仍要向用户解释失败原因
        setError(cause instanceof Error ? cause.message : '删除失败');
      }
    });
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <ul className="space-y-2">
        {optimisticMessages.map(msg => (
          <li key={msg.id} className="border rounded p-3 flex justify-between items-center">
            <span>{msg.content}</span>
            <button
              onClick={() => handleDelete(msg.id)}
              className="text-red-500 hover:underline text-sm"
            >
              删除
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
```

**乐观更新的流程：**

```
用户点击"删除" → addOptimistic(id) → UI 立即移除该条目
                                    → deleteMessage(id) 发送到服务端
                                        ├── 成功：服务端刷新权威数据
                                        └── 失败：乐观覆盖消失，并显示错误
```

> **避坑提示**：`useOptimistic` 提供的是 Action 执行期间的临时 UI 覆盖，不是事务系统。成功后要用服务端返回值或重新验证后的数据确认结果；失败时要捕获并展示错误。对于删除、付款等操作，服务端仍需提供幂等保护。

---

### 七、revalidatePath / revalidateTag / updateTag / redirect

这三个 API 是 Server Action 的"三板斧"，用于处理数据变更后的副作用：

```tsx
"use server";

import { revalidatePath, revalidateTag, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';

export async function updatePost(id: number, formData: FormData) {
  // ... 更新数据库

  // ① revalidatePath：清除指定路径的缓存（页面级别）
  revalidatePath('/posts');             // 清除 /posts 整页缓存
  revalidatePath('/posts/[id]', 'page'); // 清除动态路由页面的缓存

  // ② updateTag：Server Action 中立即刷新，提供 read-your-writes
  updateTag('posts');
  updateTag(`post-${id}`);

  // ③ revalidateTag(tag, 'max')：允许先返回旧值再后台刷新
  // 适合不要求提交后立刻读到新值的内容
  revalidateTag('related-posts', 'max');

  // ④ redirect：服务端重定向（必须在 try/catch 外部调用）
  redirect('/posts');
}
```

**redirect 的坑：**

```tsx
export async function dangerousAction(formData: FormData) {
  try {
    await db.post.create({ data: { title } });
    redirect('/posts');  // ❌ 在 try 块里调用 redirect 不会生效！
  } catch (error) {
    return { error: '创建失败' };
  }
  // 正确做法：redirect 必须在 try/catch 外部
}
```

`redirect` 内部通过抛出 `NEXT_REDIRECT` 错误来实现，这个错误会被 try/catch 捕获，导致重定向失败。

---

### 八、安全考虑

Server Actions 本质是公开的 API 端点，需要关注安全：

```tsx
"use server";

import { cookies } from 'next/headers';

export async function deletePost(postId: number) {
  // ① 身份验证：检查用户是否有权限
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) {
    throw new Error('未登录');
  }

  // ② 授权验证：该用户是否拥有这个 Post
  const user = await verifySession(session);
  const post = await db.post.findUnique({ where: { id: postId } });
  if (post.authorId !== user.id) {
    throw new Error('无权删除');
  }

  // ③ 请求来源校验：框架会执行 Origin/Host 检查，但不能替代业务授权

  // ④ 输入清理：
  // - Server Action 不能接受函数、类实例、Symbol 等不可序列化参数
  // - 敏感数据（密码）不要在返回值中回传
  // - 对用户输入做权限校验（比如只有管理员能修改其他用户的角色）
}
```

安全清单：
1. **身份验证**：每个修改数据的 Server Action 都检查 session
2. **授权验证**：确认用户有权操作该数据
3. **输入验证**：不要信任 `formData.get()` 返回的值
4. **请求来源与部署配置**：保留框架的 Origin/Host 检查；跨域代理需显式配置允许来源
5. **不要暴露敏感信息**：错误信息不要包含数据库结构、文件路径等

---

### 九、实战：留言板 CRUD

完整的增删改查留言板应用：

```tsx
// app/actions/messages.ts —— 所有 Server Actions
"use server";

import { revalidatePath } from 'next/cache';

// 模拟数据库（实际项目中替换为真实数据库）
const messages: { id: number; content: string; createdAt: string }[] = [];
let nextId = 1;

export async function getMessages() {
  // 按时间倒序
  return [...messages].reverse();
}

export async function createMessage(formData: FormData) {
  const content = formData.get('content') as string;

  // 服务端验证
  if (!content || content.trim().length < 2) {
    throw new Error('留言至少 2 个字符');
  }
  if (content.length > 200) {
    throw new Error('留言不能超过 200 个字符');
  }

  messages.push({
    id: nextId++,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  });

  revalidatePath('/messages');
}

export async function deleteMessage(id: number) {
  const index = messages.findIndex(m => m.id === id);
  if (index === -1) throw new Error('留言不存在');
  messages.splice(index, 1);
  revalidatePath('/messages');
}

export async function updateMessage(id: number, formData: FormData) {
  const content = formData.get('content') as string;
  if (!content || content.trim().length < 2) {
    throw new Error('留言至少 2 个字符');
  }

  const message = messages.find(m => m.id === id);
  if (!message) throw new Error('留言不存在');

  message.content = content.trim();
  revalidatePath('/messages');
}
```

```tsx
// app/messages/page.tsx —— 留言板主页面（服务端组件）
import { getMessages } from '@/app/actions/messages';
import { MessageForm } from './MessageForm';
import { MessageList } from './MessageList';

export default async function MessagesPage() {
  const messages = await getMessages();

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">留言板</h1>
      <MessageForm />
      <MessageList initialMessages={messages} />
    </div>
  );
}
```

```tsx
// app/messages/MessageForm.tsx —— 创建留言表单（客户端组件）
"use client";

import { useActionState } from 'react';
import { createMessage } from '@/app/actions/messages';

export function MessageForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: { error?: string; success?: string }, formData: FormData) => {
      try {
        await createMessage(formData);
        return { success: '发布成功！' };
      } catch (error) {
        return { error: (error as Error).message };
      }
    },
    {}
  );

  return (
    <form action={formAction} className="mb-6">
      <textarea
        name="content"
        placeholder="说点什么..."
        className="w-full border rounded p-2 resize-none"
        rows={3}
        required
      />
      {state?.error && <p className="text-red-500 text-sm mt-1">{state.error}</p>}
      {state?.success && <p className="text-green-500 text-sm mt-1">{state.success}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {isPending ? '发布中...' : '发布'}
      </button>
    </form>
  );
}
```

```tsx
// app/messages/MessageList.tsx —— 留言列表 + 乐观删除 + 内联编辑
"use client";

import { useOptimistic, useState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteMessage, updateMessage } from '@/app/actions/messages';

interface Message {
  id: number;
  content: string;
  createdAt: string;
}

function EditButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-blue-500 hover:underline text-sm">
      {pending ? '保存中...' : '保存'}
    </button>
  );
}

export function MessageList({ initialMessages }: { initialMessages: Message[] }) {
  const [optimisticMessages, removeOptimistic] = useOptimistic(
    initialMessages,
    (messages: Message[], deletedId: number) => messages.filter(m => m.id !== deletedId)
  );

  const [editingId, setEditingId] = useState<number | null>(null);

  async function handleDelete(id: number) {
    removeOptimistic(id);            // ① 立即从 UI 中移除
    try {
      await deleteMessage(id);       // ② 调用 Server Action
    } catch {
      // 如果失败，React 自动恢复 optimisticMessages
    }
  }

  async function handleEdit(id: number, formData: FormData) {
    try {
      await updateMessage(id, formData);
      setEditingId(null);  // 退出编辑模式
    } catch (error) {
      alert((error as Error).message);
    }
  }

  return (
    <ul className="space-y-2">
      {optimisticMessages.map(msg => (
        <li key={msg.id} className="border rounded p-3">
          {editingId === msg.id ? (
            <form action={(fd: FormData) => handleEdit(msg.id, fd)}>
              <textarea name="content" defaultValue={msg.content}
                className="w-full border rounded p-1 resize-none" rows={2} />
              <div className="flex gap-2 mt-1">
                <EditButton />
                <button type="button" onClick={() => setEditingId(null)}
                  className="text-gray-500 text-sm">取消</button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-start">
              <div>
                <p>{msg.content}</p>
                <p className="text-gray-400 text-xs mt-1">
                  {new Date(msg.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <button onClick={() => setEditingId(msg.id)} className="text-blue-500 hover:underline">
                  编辑
                </button>
                <button onClick={() => handleDelete(msg.id)} className="text-red-500 hover:underline">
                  删除
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
```

---

## 常见问题

### Q1：Server Action 和 API Route 有什么本质区别？

- **Server Action**：RPC 风格，在客户端组件中像调用函数一样调用，自动处理序列化，对表单特别友好
- **API Route（Route Handler）**：REST 风格，需要手动 fetch，适合对外暴露的 API 或非 React 客户端调用
- 实际选择：组件内部的数据操作优先用 Server Action；需要被外部系统调用的接口用 Route Handler

### Q2：Server Action 能上传文件吗？

可以。`<input type="file" name="avatar">` 的 `File` 对象会通过 FormData 自动序列化，在 Server Action 中通过 `formData.get('avatar')` 获取，返回的是 `File` 对象。

### Q3：`useActionState` 和 `useFormStatus` 需要同时用吗？

不需要。如果你的表单简单（只需要知道"是否正在提交"），只用 `useFormStatus` 就够了。如果需要"提交结果的状态"（成功/失败的 message），用 `useActionState`。

### Q4：乐观更新失败后数据会丢失吗？

`useOptimistic` 不会直接修改服务端权威数据。Action 结束后，乐观覆盖会被新的权威状态替代；如果操作失败，应保留原始数据、显示错误，并确认缓存重新验证没有把失败操作误认为成功。

### Q5：为什么 `redirect()` 在 try/catch 里不生效？

`redirect()` 的内部实现是抛出一个 `NEXT_REDIRECT` 错误，被 Next.js 框架捕获后执行重定向。但如果你在 try/catch 中捕获了它，框架就收不到这个错误了。正确做法是让 redirect 在 try/catch 外面执行，或者重新抛出。

### Q6：Server Action 的返回值有什么限制？

返回值必须符合 React Server Function 的序列化协议。除普通对象和基础类型外，React 还支持 `Date`、`FormData`、`Map`、`Set`、`ArrayBuffer` 等明确列出的类型；普通函数、React 元素和自定义类实例不能跨边界传递。不要用“JSON-safe”替代真实协议判断。

### Q7：多个 Server Action 可以放在同一个文件吗？

可以。一个 `"use server"` 文件可以导出多个 Server Action，适合按业务领域集中维护。不要依赖框架内部生成的请求地址或把它当成稳定的 REST 端点；外部系统需要调用时应使用 Route Handler。

### Q8：Server Action 怎么处理并发提交（用户快速点击两次）？

同一个 `useActionState` 实例会按顺序处理排队的 Action，但它不会自动禁止用户再次提交。是否禁用按钮取决于你的 UI 实现；服务端还必须用唯一键、版本号或幂等键防止重复写入，不能只依赖 `isPending`。

---

## 实操作业

### 基础练习：简单留言板

实现一个单页留言板：
- 用 Server Action 创建留言（标题 + 内容）
- 用 `useActionState` 显示验证错误和成功信息
- 留言列表用服务端组件渲染
- 提交后用 `revalidatePath` 刷新列表

### 进阶练习：CRUD + 乐观更新

在基础练习上增加：
- 编辑留言（内联编辑，点击编辑按钮后变为输入框）
- 删除留言（使用 `useOptimistic` 实现乐观删除）
- 使用 `useFormStatus` 给每个操作按钮独立的 loading 状态
- 添加"编辑中"状态：同时只能有一条留言处于编辑模式

### 挑战练习：带分页和搜索的完整留言板

实现一个完整的留言应用：
- 分页加载（使用 Server Action 接受 `page` 和 `pageSize` 参数）
- 搜索功能（关键词搜索，使用 Server Action 接受 `keyword` 参数）
- 乐观更新 + 分页：删除一条留言后，如果当前页数据不够，从下一页"借"一条补上
- 使用 `useTransition` 包裹搜索，让搜索输入时有 loading 状态但不阻塞页面

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：action 验证输入/身份，返回可序列化 state，useActionState(previousState,formData) 匹配签名。成功 revalidatePath，空留言无写入，错误保留表单值。
- **进阶**：每表单子树 useFormStatus，乐观删除按 ID 对账，失败回滚。编辑 ID 单一来源；并发其他成功不能被旧快照覆盖，服务端资源授权不可省略。
- **挑战**：校验 page/pageSize/keyword 并限制成本，查询宜用 GET/loader，练习 Action 保留明确契约。删除后重新取权威页，不本地乱借下一页；快速搜索只接纳最新结果。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L4 里程碑](../../projects/atlas/milestones/L4.md)
- 本课任务：按 L4 里程碑把“Server Actions 与数据变更”接入 Atlas 全栈版本，明确服务端信任边界、数据契约、失败响应和回滚方式。
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

Server Actions 是 Next.js 最重要的开发者体验升级之一。三条关键原则：

1. **表单就是 API**：`<form action={serverAction}>` 代替了 `onSubmit + fetch` 的旧模式
2. **乐观更新需要权威状态收敛**：`useOptimistic` 提供即时反馈，成功和失败都必须回到服务端权威数据
3. **安全是 Server Action 的责任**：每个写操作都要验证身份和权限，不能假设"只有前端会调用"

掌握了 Server Actions + useActionState + useOptimistic 这个组合，你就有了 Next.js 处理数据变更的基础工具箱。下一节学习 Proxy（旧称 Middleware）和 Route Handlers，构建完整的请求边界。

<!-- course-nav:start -->
---

[上一篇：02 SSR / ISR / PPR 渲染策略](./02-SSR-ISR-PPR渲染策略.md) · [课程地图](../../README.md) · [下一篇：04 Proxy（旧称 Middleware）与 Route Handlers](./04-Proxy与Route-Handlers.md)
<!-- course-nav:end -->
