# loader、action、错误边界与重新验证

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 带读取、写入、导航反馈、错误页和自动重新验证的路由 |
| 建议时间 | 150 分钟 |
| 数据所有者 | loader 拥有路由服务端数据，action 拥有路由写入 |
| 失败路径 | 404、503、409 与未知渲染错误 |
| 完成证据 | action 成功后 loader 自动重读；失败有可恢复入口 |

本课最小案例用浏览器模块内存模拟服务端事实，只为观察 Router 生命周期。邻里集市集成必须调用第 3 章 HTTP API。

## 1. 任务背景

商品列表和详情由当前地址决定，读取应在进入路由时启动；预约和发布由表单提交触发，成功后页面需要重新读取服务端状态。若组件自己维护副本并手动改三处 state，容易漏掉其他路由和标签页变化。

Data Router 用 loader 读取、action 写入，并在 action 完成后重新验证相关 loader。导航期间旧页面可保留，`useNavigation` 提供 pending 状态；读取或渲染失败交给最近的 `errorElement`。

## 2. 学习目标

- 使用 loader 读取地址对应数据。
- 将 `request.signal` 传给下游读取。
- 使用 action 接收路由表单写入。
- 读取 `useNavigation` 和 `useActionData`。
- 理解成功 action 后的 loader revalidation。
- 区分初始 fallback、导航 pending 与 route error。
- 把 HTTP 404/503 转成路由错误。
- 保留预期冲突的恢复信息，而非无限重试。
- 避免把 loader 数据复制进 Context。

## 3. 预备知识

需要完成上一课 Router 安装与第 3 章 `ApiError/request`。运行：

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm list react-router --depth 0
pnpm typecheck
```

理解：

- loader/action 在本章都运行于浏览器；
- `Form method="post"` 提交给当前匹配路由 action；
- Response status 仍保留 HTTP 语义；
- action 成功不代表数据库事务已验证。

## 4. 核心理论

### 4.1 loader 在渲染前拥有读取

loader 接收目标 `request`、动态 params 和 context。路由被新导航取代时，`request.signal` 会 abort，应继续传给 fetch。页面通过 `useLoaderData` 读取结果，不再用 Effect 重复请求。

### 4.2 action 拥有写入意图

路由 Form 的 POST 到 action。action 解析 FormData、验证 intent、调用 API。成功后 Router 重新验证页面 loader；重定向可进入新资源。预期错误可以返回 action data，让表单保留；无法在本页恢复的读取错误可抛给 errorElement。

### 4.3 三类反馈阶段

| 阶段 | API | 用途 |
| --- | --- | --- |
| 初始 hydration/fallback | `hydrateFallbackElement` | Router 尚无初始数据 |
| 后续导航/提交 | `useNavigation` | 旧页面保留时显示 pending |
| loader/action/render 失败 | `errorElement` | 显示状态、原因与恢复入口 |

普通 loader 不会因为外层包了 Suspense 就自动获得 Data Router pending UI。

### 4.4 revalidation 不等于乐观更新

action 完成后重新运行 loader，页面获得服务端确认事实。它可能增加一次读取，但能减少客户端副本漂移。性能优化必须基于测量和一致性要求，不能先删重新验证。

### 4.5 错误语义

404 表示资源不存在；503 表示服务暂不可用；409 表示已知业务冲突。409 预约不应自动无限重试，因为商品已被别人预约是需要用户理解的新事实。

## 5. 元素、属性、API 或配置清单

| API | 用途 | 边界 |
| --- | --- | --- |
| route `loader` | 进入路由前读取 | 本章运行在浏览器 |
| route `action` | 处理 mutation Form | 不直接访问数据库 |
| `request.signal` | 取消过期导航读取 | 不回滚写请求 |
| `useLoaderData` | 读取 loader 结果 | 不复制为 Context state |
| `useActionData` | 读取当前 action 结果 | 导航后生命周期改变 |
| `useNavigation` | 查看 idle/loading/submitting | 全局导航视角 |
| `redirect` | 成功后导航 | 使用服务端返回 ID |
| `errorElement` | 捕获路由读取/渲染错误 | 事件异步仍需显式处理 |
| `useRouteError` | 读取最近路由错误 | 先判断错误类型 |
| `isRouteErrorResponse` | 判断路由 Response | 保留 status/data |
| 自动 revalidation | action 后重跑 loader | 不证明后端事务 |

## 6. 最小可运行案例

用模块内存观察 action 后 loader 重读；刷新会重置，不能称为后端。

**完整文件：`apps/react-web/src/examples/RouterLoaderDemo.tsx`**

```tsx
import {
  createBrowserRouter,
  Form,
  isRouteErrorResponse,
  Link,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError,
} from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { RouterProvider } from 'react-router/dom'

let available = true

function wait(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, milliseconds)
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

async function demoLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  await wait(200, request.signal)
  if (url.searchParams.get('fail') === '503') {
    throw new Response('演示服务暂不可用。', { status: 503 })
  }
  return { title: '九成新台灯', available }
}

type ActionResult = { error?: string; success?: string }

async function demoAction({ request }: ActionFunctionArgs):
Promise<ActionResult> {
  const formData = await request.formData()
  if (formData.get('intent') !== 'reserve') {
    return { error: '未知操作。' }
  }
  if (!available) {
    return { error: '409：商品已被预约，请刷新状态。' }
  }
  available = false
  return { success: '预约成功，loader 将重新读取状态。' }
}

function DemoPage() {
  const listing = useLoaderData<typeof demoLoader>()
  const actionData = useActionData<typeof demoAction>()
  const navigation = useNavigation()

  return (
    <main>
      <h1>路由数据实验</h1>
      <p>{listing.title}</p>
      <p>状态：{listing.available ? '可预约' : '已预约'}</p>
      <Form method="post">
        <input type="hidden" name="intent" value="reserve" />
        <button
          disabled={!listing.available || navigation.state !== 'idle'}
        >
          {navigation.state === 'submitting' ? '预约中' : '预约'}
        </button>
      </Form>
      {actionData?.error && <p role="alert">{actionData.error}</p>}
      {actionData?.success && <p role="status">{actionData.success}</p>}
      <p><Link to="?fail=503">触发 503</Link></p>
    </main>
  )
}

function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status}：${String(error.data)}`
    : error instanceof Error
      ? error.message
      : '未知页面错误。'

  return (
    <main role="alert">
      <h1>暂时无法显示页面</h1>
      <p>{message}</p>
      <Link to="/router-data-demo">恢复正常路径</Link>
    </main>
  )
}

const router = createBrowserRouter([
  { path: '/', loader: () => redirect('/router-data-demo') },
  {
    path: '/router-data-demo',
    loader: demoLoader,
    action: demoAction,
    element: <DemoPage />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <p role="status">正在加载路由数据……</p>,
  },
])

export default function RouterLoaderDemo() {
  return <RouterProvider router={router} />
}
```

**关键片段：`apps/react-web/src/App.tsx`**

```tsx
export { default } from './examples/RouterLoaderDemo'
```

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm typecheck
pnpm dev --host 127.0.0.1
```

第一次预约后状态变“已预约”，证明 action 完成后 loader 重读。再次提交可通过重新启用调试按钮观察 409 文案；触发 503 后用恢复链接返回。

## 7. 邻里集市集成案例

loader 把 API 错误保留为路由状态：

**关键片段：`apps/react-web/src/router.tsx`**

```tsx
async function detailLoader({ params, request }: LoaderFunctionArgs) {
  try {
    return await requestApi(
      `/listings/${encodeURIComponent(params.id ?? '')}`,
      parseListing,
      { signal: request.signal },
    )
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Response(error.message, {
        status: error.status,
        statusText: error.code,
        headers: { 'X-Request-Id': error.requestId },
      })
    }
    throw error
  }
}
```

预约 action 返回预期错误，成功后让 Router revalidate：

```tsx
async function reserveAction({ params, request }: ActionFunctionArgs) {
  const formData = await request.formData()
  if (formData.get('intent') !== 'reserve') {
    return { kind: 'error' as const, message: '未知操作。' }
  }
  try {
    const reservation = await requestApi(
      `/listings/${encodeURIComponent(params.id ?? '')}/reservations`,
      parseReservation,
      { method: 'POST', body: '{}' },
    )
    return {
      kind: 'success' as const,
      message: `预约成功：${reservation.id}`,
    }
  } catch (error) {
    return actionFailure(error)
  }
}
```

action 不提交 buyerId。服务端从 HttpOnly Cookie 会话识别用户，检查不能预约自己的商品与唯一预约约束。

## 8. 常见错误与排查路径

### 明确错误：loader 与 Effect 重复读取

```tsx
const loaderData = useLoaderData()
const duplicated = useListings(q)
```

同一页面产生两份请求、两套 loading/error 与失效时机。

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | 打开详情发出两个 GET，页面偶尔先显示旧状态再跳变 |
| 证据 | Network 有重复 URL；React DevTools 显示两份资源 state |
| 原因 | loader 和组件 Hook 同时拥有同一服务端数据 |
| 修复 | 删除页面 Hook，统一通过 loader/useLoaderData 读取 |
| 复验 | 每次导航只有一份读取；action 后发生一次可解释的 revalidation |

其他错误：

- action 后手动修改多个 Context 副本：依赖 loader revalidation。
- 所有错误都 redirect 到登录：按 401/403/404/409/400/503 恢复。
- 409 自动重试：提示冲突并重读最新商品。
- 忽略 `request.signal`：继续传给 HTTP helper。

## 9. 课后题

1. loader 与 Effect 谁应拥有路由商品读取？
2. action 成功后为什么需要重新验证？
3. 409 为什么不应无限自动重试？
4. errorElement 能否捕获事件处理器里所有异步 reject？

参考答案：

1. loader；路由地址决定资源，避免重复所有者。
2. 服务端是权威，重新读取能得到确认后的 status/version。
3. 冲突是新的业务事实，重试相同操作不会改变已被预约状态。
4. 不能保证。事件异步应显式 catch；路由 action 的错误由 Router 管理。

## 10. 实践练习

### 基础

为 action 增加未知 intent 分支，返回可见错误。完成标准：不发 API 请求。

### 进阶

让错误页显示 status、statusText 和 requestId，但不泄露堆栈。完成标准：404/503 文案与恢复链接不同。

### 故障注入

临时在页面同时调用 `useListings`，记录重复请求，再删除。完成标准：最终每次导航只有 loader 请求，action 后只有预期 revalidation。

答案判定：错误状态可判定；导航 pending 不清空旧页面；故障修复后 Network 请求数稳定。

## 11. 阶段验收

- [ ] loader 使用 request.signal。
- [ ] action 解析 FormData 与 intent。
- [ ] pending、action error/success、route error 分开。
- [ ] 成功 action 后 loader 重新读取。
- [ ] 404、503、409 保留不同语义。
- [ ] 页面没有重复 Hook 读取。
- [ ] loader 数据未复制到 Context。
- [ ] typecheck/build 退出 0。

## 12. 常见问题

**action 返回错误还是抛 Response？**<br>
本页可恢复的表单错误适合返回 action data；整页无法读取的错误适合抛给 errorElement。保持状态语义即可。

**revalidation 会不会太慢？**<br>
先保证一致性并测量。需要优化时采用明确缓存/乐观策略和回滚，不是删除读取后假设成功。

**loader 是否等于服务端 loader？**<br>
不等于。本章 Data Mode loader 在浏览器；框架模式或 SSR 的执行位置需单独确认。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**。

- [React Router：Data Loading](https://reactrouter.com/start/data/data-loading)
- [React Router：Actions](https://reactrouter.com/start/data/actions)
- [React Router：Pending UI](https://reactrouter.com/start/data/pending-ui)
- [React Router：Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [React Router：Race Conditions](https://reactrouter.com/explanation/race-conditions)

## 我现在能做到什么

我能让 Router 统一拥有路由读取与写入，用重新验证恢复服务端事实，并为 404、503、409 提供不同恢复路径。

## 单元导航

[上一课：URL 状态与导航](01-data-router-url-state-navigation.md) · [返回章节入口](../04-routing-data.md) · [下一课：登录、发布与预约冲突](03-auth-publish-reservation-conflicts.md)
