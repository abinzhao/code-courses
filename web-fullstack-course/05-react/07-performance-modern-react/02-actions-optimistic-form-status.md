# Actions、乐观状态与表单状态：pending 不是权限，回滚不是事务

## 任务卡

- **任务**：使用 `useActionState`、`useFormStatus`、`useOptimistic` 表达提交、pending 与回滚。
- **产出**：完整实验 `ActionFavoriteLab.tsx`，以及主项目受控草稿的接线决策。
- **运行**：React 19.3、同源教学 API；用未登录 401 和 Offline 注入失败。
- **完成证据**：表单 pending 作用域正确，乐观收藏失败回到基础值，错误可见。
- **边界**：客户端 Action 不会获得服务器权限；乐观回滚不撤销服务端事务。

## 1. 任务背景

用户提交时需要即时反馈，但“正在提交”不等于服务端已接受，“先显示收藏”也不等于数据库
已经写入。Actions 把异步意图与结果状态组织在一起，乐观状态缩短感知等待；真正的认证、
授权、CSRF、幂等和事务仍由后端裁决。

本课把实验限制为单飞命令，避免把复杂多请求排序隐藏在 API 名称后面。

## 2. 学习目标

完成后你能：

1. 解释 `useActionState` 的 previous state、Action 与 pending；
2. 正确放置 `useFormStatus` 后代组件；
3. 区分受控草稿与 Action 自动重置；
4. 在 transition 中应用 `useOptimistic` 并处理失败；
5. 区分客户端 Action、Server Function 和服务器授权。

## 3. 预备知识

复用 `validateDraft`、`api`、`Listing` 和幂等 PUT/DELETE。主项目的发布表单要求失败保留草稿，
因此仍使用受控字段；本课不会为了展示 Action 破坏已验收体验。

先登录教学会话后可观察成功路径；未登录时应得到 401 并回滚。

## 4. 核心理论

### 4.1 Action 是异步意图，不一定在服务器

React 客户端函数也可作为 Action。函数名或 form action 语法不会自动创建后端、读取私有
凭据或授予权限。Server Function 需要支持该协议的框架，并在服务器重新鉴权校验。

### 4.2 previous state 与 FormData 参数顺序

`useActionState(fn, initial)` 让 fn 第一参数变成 previous state，FormData 是第二参数。
把 FormData 当第一参数会得到难以理解的运行错误。

### 4.3 useFormStatus 只看祖先 form

它必须在目标 `<form>` 的后代组件调用；在渲染 form 的同一个父组件中调用，读不到该 form
的提交状态。一个页面多个 form 时，作用域尤其重要。

### 4.4 乐观值是进行中 Action 的临时投影

基础 `saved` 代表最后确认状态，optimistic 代表当前意图。失败时 transition 完成，显示回到
基础值。并发多写仍需序号、单飞或服务器版本，`useOptimistic` 不排序 HTTP。

## 5. 元素、属性、API 或配置清单

| API | 本课职责 | 失效边界 |
| --- | --- | --- |
| `useActionState` | Action 结果与 pending | 不自动成为 Server Function |
| `useFormStatus` | 最近祖先 form 状态 | 父组件或其他 form 不可见 |
| `useOptimistic` | 进行中 Action 的临时投影 | 不持久化、不排序响应 |
| `startTransition` | 建立非紧急 Action 上下文 | 不提供事务 |
| `FormData` | 读取 successful controls | 值仍是不可信字符串/File |
| controlled input | 失败保留草稿 | 需显式成功重置 |
| `aria-busy` | 暴露处理状态 | 不替代禁用重复命令 |
| PUT/DELETE | 幂等目标状态 | 后端仍需鉴权 |

## 6. 最小可运行案例

**完整文件：`apps/react-web/src/ActionFavoriteLab.tsx`**

```tsx
import {
  startTransition,
  useActionState,
  useOptimistic,
  useState,
  useTransition,
} from "react";
import { useFormStatus } from "react-dom";
import { api } from "./api";

type PublishResult = Readonly<{ error: string; title: string }>;
const initialResult: PublishResult = { error: "", title: "" };

async function preview(
  _previous: PublishResult,
  data: FormData,
): Promise<PublishResult> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const title = String(data.get("title") ?? "").trim();
  return title.length >= 2
    ? { error: "", title }
    : { error: "标题至少 2 个字符", title: "" };
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? "正在提交" : "预览发布"}
    </button>
  );
}

function PublishPreview() {
  const [result, action, pending] = useActionState(preview, initialResult);
  return (
    <form action={action} aria-busy={pending}>
      <label>
        标题
        <input name="title" required />
      </label>
      <SubmitButton />
      {result.error && <p role="alert">{result.error}</p>}
      {result.title && <p role="status">可发布：{result.title}</p>}
    </form>
  );
}

function OptimisticFavorite() {
  const [saved, setSaved] = useState(false);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [pending, begin] = useTransition();
  const [error, setError] = useState("");

  function submit() {
    if (pending) return;
    const next = !saved;
    setError("");
    begin(async () => {
      setOptimistic(next);
      try {
        await api("/favorites/lamp-1", {
          method: next ? "PUT" : "DELETE",
        });
        startTransition(() => setSaved(next));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "收藏失败");
      }
    });
  }

  return (
    <section>
      <h2>乐观收藏实验</h2>
      <button
        type="button"
        aria-pressed={optimistic}
        disabled={pending}
        onClick={submit}
      >
        {optimistic ? "取消收藏" : "收藏"}
      </button>
      <p role="status">{pending ? "正在同步服务器" : "同步结束"}</p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export default function ActionFavoriteLab() {
  return (
    <main>
      <h1>Action 与乐观状态实验</h1>
      <PublishPreview />
      <OptimisticFavorite />
    </main>
  );
}
```

**命令：在 `apps/react-web` 执行**

```bash
pnpm typecheck
pnpm build
pnpm dev --host 127.0.0.1 --port 5185 --strictPort
```

预期空/短标题显示错误，合法标题显示 status。未登录点击收藏时先短暂选中，401 后回到未收藏
并显示 alert。渐进扩展：登录后重试，PUT 成功后基础值为 true。

## 7. 邻里集市集成案例

主项目发布表单必须失败保留草稿，因此保留受控字段：

**关键片段：`apps/react-web/src/ListingForm.tsx`**

```tsx
const [draft, setDraft] = useState(emptyDraft);
const [result, publishAction, pending] = useActionState(publish, initialResult);

useEffect(() => {
  if (result.createdId) setDraft(emptyDraft);
}, [result.createdId]);

<form action={publishAction} aria-busy={pending}>
  <input
    name="title"
    value={draft.title}
    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
  />
  <PublishButton />
</form>
```

完整实现还要保留 label、描述、价格和错误关联。Action 函数重新运行 `validateDraft`，发送
整数分 DTO，并按 401/403/409/400/503 显示不同恢复。Effect 只响应已确认 createdId 清草稿，
不是用来执行用户提交。

本例的 `PublishPreview` 使用非受控字段，只演示 Action 参数和 form status；不能替代主项目
“失败保留三字段”的契约。

## 8. 常见错误与排查路径

**明确错误示例：**

```tsx
function FormAndStatus() {
  const { pending } = useFormStatus();
  return <form action={action}>...</form>;
}
```

Hook 调用位置不是 form 后代，pending 不属于即将渲染的 form。

| 项目 | 记录 |
| --- | --- |
| 现象 | 请求进行中按钮仍可重复点击，pending 始终 false |
| 证据 | React DevTools 显示 useFormStatus 位于 form 的父组件 |
| 原因 | form status 只从祖先 form context 读取 |
| 修复 | 把 SubmitButton 提取为 form 后代并在其中调用 |
| 复验 | 提交期间按钮禁用且文案变化，其他 form 不受影响 |

另一个错误是 catch 后 `setSaved(next)`，会把失败也固化。只在成功路径更新基础值。

## 9. 课后题

1. 客户端 Action 是否自动拥有服务器权限？
2. 为什么 previous state 在 FormData 前？
3. useOptimistic 是否保证两个请求按点击顺序完成？
4. 非受控 Action 表单为何不满足本项目失败保留草稿？

答案：

1. 否，服务端必须重新鉴权、校验与授权。
2. `useActionState` 注入 previous state 作为包装后函数第一参数。
3. 不保证；需要单飞、序号或服务端版本。
4. Action 正常完成可能重置非受控字段，主项目需受控草稿或显式恢复。

## 10. 实践练习

**基础**：把 SubmitButton 移到 form 外，确认 pending 失败；恢复层级后通过。

**进阶**：为 400 显示字段错误并保留受控草稿。验收：DTO 仍是整数分，成功才清空。

**故障注入**：未登录收藏，观察 401 回滚。临时在 catch 固化 next，测试必须失败；恢复后
基础值不变、alert 可见。

## 11. 阶段验收

- [ ] Action 参数顺序正确，FormData 仍经过校验。
- [ ] useFormStatus 位于目标 form 后代。
- [ ] pending 有可见文案和重复提交约束。
- [ ] 主项目失败保留受控草稿，成功才重置。
- [ ] 乐观值与确认基础值分开。
- [ ] 401/Offline 失败后回滚并显示错误。
- [ ] 实验限制单飞，没有宣称任意并发自动正确。
- [ ] 客户端 Action、Server Function 和后端授权边界明确。

## 12. 常见问题

**useActionState 能否替代 reducer？**

两者关注不同：前者组织异步 Action 结果，reducer 表达纯状态迁移。

**可以不禁用乐观按钮吗？**

可以设计并发队列，但必须处理排序和回滚。本实验用单飞缩小正确性范围。

**为什么成功 setSaved 还放进 transition？**

让确认结果与 Action 上下文一致；它仍不改变 HTTP 完成顺序。

## 13. 扩展阅读

资料快照：2026-10-11。

- [React：useActionState](https://react.dev/reference/react/useActionState)
- [React：useOptimistic](https://react.dev/reference/react/useOptimistic)
- [React DOM：useFormStatus](https://react.dev/reference/react-dom/hooks/useFormStatus)
- [React：startTransition](https://react.dev/reference/react/startTransition)
- [MDN：FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [React：Server Functions](https://react.dev/reference/rsc/server-functions)

兼容边界：Server Functions 需要框架/构建支持，普通 Vite 客户端 Action 不实现该协议。
教学 API 也不提供生产授权或事务证据。

## 我现在能做到什么

我能用 Actions 表达 pending 和结果，用乐观投影缩短感知等待并在失败时回到确认状态，同时
不把客户端调度误解为服务器权限或事务。

## 单元导航

- 上一单元：[性能测量、memo 与并发更新](./01-performance-measurement-memo-concurrency.md)
- 下一单元：[现代 Hooks、Compiler、Suspense 与 Activity](./03-modern-hooks-compiler-suspense-activity.md)
- 分卷目录：[React](../README.md)
