# 教学登录、发布、预约与冲突恢复

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 登录、退出、发布、详情、预约与状态错误完整路由 |
| 建议时间 | 210 分钟 |
| 核心业务 | 服务端生成商品 ID；预约不提交 buyerId；两标签一成功一 409 |
| 会话边界 | 同源 HttpOnly 教学 Cookie，前端不读取或持久化凭据 |
| 完成证据 | 深链刷新、失败草稿保留、201/409、401/403/404/400/503 分流 |

本课完成的是浏览器到本机教学 API 的路由闭环。内存 API 没有真实数据库事务，不能凭两标签演示宣称生产预约唯一性已验证。

## 1. 任务背景

居民登录后发布“二手书架”，服务端返回真实 ID，页面跳到详情；另一个居民预约台灯时，两个标签可能同时看到“可预约”，但只能有一个请求成功。浏览器按钮禁用不能锁住另一标签、另一设备或攻击者请求。

前端还必须把错误转成恢复动作：

- 401：重新登录；
- 403：身份已知但禁止操作；
- 404：资源不存在；
- 409：读取最新状态，不无限重试；
- 400：保留并修正字段；
- 503：稍后重试并保留 requestId。

## 2. 学习目标

- 用根 loader 读取可选会话，不读取 HttpOnly Cookie。
- 登录/退出后通过 action 与重定向刷新会话 UI。
- 发布时复用 `validateDraft`，失败保留非受控表单值。
- 使用服务端响应的商品 ID、ownerId、version、createdAt。
- 预约请求不携带 buyerId。
- 让成功 action 触发详情重新验证。
- 按 401/403/404/409/400/503 提供不同恢复。
- 在两标签中观察一条 201 与一条 409。
- 说明前端证据与后端事务/授权证据的界线。

## 3. 预备知识

需要第 3 章教学 API、HTTP parser 和本章前两课 Router。确认：

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm list react react-dom react-router vite --depth 0
pnpm test
pnpm typecheck
pnpm build
```

开发服务器必须以本机方式启动：

```bash
pnpm dev --host 127.0.0.1
```

不要把真实密码输入教学登录页；它不验证凭据。

## 4. 核心理论

### 4.1 会话是服务端事实

浏览器自动发送 HttpOnly Cookie，前端通过 `GET /auth/me` 询问当前用户。JavaScript 不读取 Cookie，也不把凭据复制到 LocalStorage。根 loader 返回 `User | null`，布局只据此展示体验；每个写 API 仍由服务端重新认证与授权。

### 4.2 发布使用服务端身份

浏览器只发送 `title/description/priceCents`。服务端产生：

- `id`；
- `ownerId`；
- `version`；
- `createdAt`；
- 初始 status。

前端不能先随机生成 ID 再覆盖响应，否则可能跳到不存在的详情。

### 4.3 预约唯一性

请求路径已经包含 listing ID，buyer 身份来自会话。按钮 pending 只防止同一页面重复点击；真正的一成功一冲突应由数据库条件更新、锁或唯一约束保证。本机 API 仅模拟该响应语义。

### 4.4 预期错误与路由错误

发布/预约的 401、403、409、400、503 可在当前表单恢复，返回 action data。详情 GET 的 404/503 让整页无法读取，抛给 errorElement。两类都保留 code/requestId。

### 4.5 非受控路由表单保留草稿

`Form` 字段以 DOM 为真相。action 返回错误时路由和元素未更换，浏览器值保留；成功 redirect 后页面离开，草稿自然销毁。不要在提交开始时主动 reset。

## 5. 元素、属性、API 或配置清单

| API / 契约 | 用途 | 边界 |
| --- | --- | --- |
| 根 route loader | 读取 `/auth/me` | 401 转为匿名，不吞 503 |
| `useRouteLoaderData` | 子页面读取根会话 | UI 不是授权源 |
| login/logout action | 建立/撤销教学会话 | 生产需真实凭据、速率限制 |
| publish action | 验证并 POST ListingInput | ID/owner/version/time 来自响应 |
| reserve action | POST reservation | 不发送 buyerId |
| `redirect` | 成功后进入资源 | 只允许安全内部 next |
| action data | 当前页显示预期失败 | 保留 code/requestId |
| route error | 整页读取失败 | 提供恢复链接 |
| HttpOnly Cookie | 服务端会话凭据 | JavaScript 不可读 |
| 409 | 预约/版本冲突 | 不自动无限重试 |
| 400 | 字段不合法 | 保留草稿修正 |

## 6. 最小可运行案例

先定义 action 响应 parser。它们检查运行时字段，不把断言当验证。

**完整文件：`apps/react-web/src/actionParsers.ts`**

```ts
export type User = Readonly<{
  id: string
  name: string
}>

export type Reservation = Readonly<{
  id: string
  listingId: string
  buyerId: string
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
}>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isReservationStatus(
  value: unknown,
): value is Reservation['status'] {
  return value === 'pending'
    || value === 'confirmed'
    || value === 'cancelled'
}

function isUtcIso(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.valueOf()) && date.toISOString() === value
}

export function parseUser(value: unknown): User {
  if (
    !isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.name !== 'string'
  ) {
    throw new Error('用户响应不符合契约。')
  }
  return { id: value.id, name: value.name }
}

export function parseReservation(value: unknown): Reservation {
  if (
    !isRecord(value)
    || typeof value.id !== 'string'
    || typeof value.listingId !== 'string'
    || typeof value.buyerId !== 'string'
    || !isReservationStatus(value.status)
    || typeof value.createdAt !== 'string'
    || !isUtcIso(value.createdAt)
  ) {
    throw new Error('预约响应不符合契约。')
  }
  return {
    id: value.id,
    listingId: value.listingId,
    buyerId: value.buyerId,
    status: value.status,
    createdAt: value.createdAt,
  }
}

export function parseOk(value: unknown): { ok: true } {
  if (!isRecord(value) || value.ok !== true) {
    throw new Error('操作响应不符合契约。')
  }
  return { ok: true }
}
```

最小验证步骤：

1. 登录页 action 调用 `/auth/login` 与 `parseUser`；
2. 根 loader 再调用 `/auth/me`；
3. 布局显示“演示居民”；
4. 退出 action 调用 `/auth/logout` 与 `parseOk`；
5. 根 loader 重新得到 401 并显示匿名入口。

这条流程观察 Cookie 会话效果，但浏览器代码从未读取 Cookie 内容。

## 7. 邻里集市集成案例

### 完整 Data Router

**完整文件：`apps/react-web/src/router.tsx`**

```tsx
import {
  createBrowserRouter,
  Form,
  isRouteErrorResponse,
  Link,
  Outlet,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useRouteError,
  useRouteLoaderData,
} from 'react-router'
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from 'react-router'
import { ApiError, parseListing, parseListingPage } from './api'
import { request as apiRequest } from './api'
import {
  parseOk,
  parseReservation,
  parseUser,
} from './actionParsers'
import type { User } from './actionParsers'
import ListingCard from './ListingCard'
import { validateDraft } from './form'

type ActionFeedback =
  | {
      kind: 'error'
      message: string
      code: string
      requestId: string
    }
  | { kind: 'success'; message: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positivePage(value: string | null) {
  return value !== null && /^\d+$/.test(value) && Number(value) > 0
    ? Number(value)
    : 1
}

function throwRouteError(error: unknown): never {
  if (error instanceof ApiError) {
    throw new Response(JSON.stringify({
      message: error.message,
      requestId: error.requestId,
    }), {
      status: error.status,
      statusText: error.code,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  throw error
}

function actionFailure(error: unknown): ActionFeedback {
  if (error instanceof ApiError) {
    const recovery = error.status === 401
      ? '请重新登录后再试。'
      : error.status === 403
        ? '当前账号无权执行此操作。'
        : error.status === 409
          ? '状态已变化，请按最新商品状态处理。'
          : error.status === 400
            ? '请修正字段后重试。'
            : error.status === 503
              ? '服务暂不可用，请稍后重试。'
              : '请求失败，请重试。'
    return {
      kind: 'error',
      message: `${error.message} ${recovery}`,
      code: error.code,
      requestId: error.requestId,
    }
  }
  return {
    kind: 'error',
    message: '网络连接失败，请检查连接后重试。',
    code: 'NETWORK_ERROR',
    requestId: 'unavailable',
  }
}

async function rootLoader({ request }: LoaderFunctionArgs) {
  try {
    const user = await apiRequest('/auth/me', parseUser, {
      signal: request.signal,
    })
    return { user }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return { user: null as User | null }
    }
    return throwRouteError(error)
  }
}

async function listLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q') ?? ''
  const page = positivePage(url.searchParams.get('page'))
  const search = new URLSearchParams({
    q,
    page: String(page),
    pageSize: '20',
  })
  try {
    const result = await apiRequest(
      `/listings?${search}`,
      parseListingPage,
      { signal: request.signal },
    )
    return { result, q }
  } catch (error) {
    return throwRouteError(error)
  }
}

async function detailLoader({ params, request }: LoaderFunctionArgs) {
  try {
    return await apiRequest(
      `/listings/${encodeURIComponent(params.id ?? '')}`,
      parseListing,
      { signal: request.signal },
    )
  } catch (error) {
    return throwRouteError(error)
  }
}

function safeInternalNext(value: unknown) {
  if (
    typeof value !== 'string'
    || !value.startsWith('/')
    || value.includes('\\')
  ) {
    return '/listings'
  }
  const base = new URL('https://market.invalid')
  const candidate = new URL(value, base)
  if (candidate.origin !== base.origin) return '/listings'
  return `${candidate.pathname}${candidate.search}${candidate.hash}`
}

async function loginAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const next = safeInternalNext(formData.get('next'))
  try {
    await apiRequest('/auth/login', parseUser, {
      method: 'POST',
      body: '{}',
    })
    return redirect(next)
  } catch (error) {
    return throwRouteError(error)
  }
}

async function logoutAction() {
  try {
    await apiRequest('/auth/logout', parseOk, {
      method: 'POST',
      body: '{}',
    })
    return redirect('/listings')
  } catch (error) {
    return throwRouteError(error)
  }
}

async function publishAction({ request }: ActionFunctionArgs) {
  const formData = await request.formData()
  const result = validateDraft({
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    price: String(formData.get('price') ?? ''),
  })
  if (!result.ok) {
    return {
      kind: 'error',
      message: result.message,
      code: 'VALIDATION',
      requestId: 'client-validation',
    } satisfies ActionFeedback
  }
  try {
    const created = await apiRequest('/listings', parseListing, {
      method: 'POST',
      body: JSON.stringify(result.value),
    })
    return redirect(`/listings/${encodeURIComponent(created.id)}`)
  } catch (error) {
    return actionFailure(error)
  }
}

async function reserveAction({ params, request }: ActionFunctionArgs) {
  const formData = await request.formData()
  if (formData.get('intent') !== 'reserve') {
    return {
      kind: 'error',
      message: '未知操作。',
      code: 'UNKNOWN_INTENT',
      requestId: 'client-validation',
    } satisfies ActionFeedback
  }
  try {
    const reservation = await apiRequest(
      `/listings/${encodeURIComponent(params.id ?? '')}/reservations`,
      parseReservation,
      { method: 'POST', body: '{}' },
    )
    return {
      kind: 'success',
      message: `预约成功，预约编号：${reservation.id}`,
    } satisfies ActionFeedback
  } catch (error) {
    return actionFailure(error)
  }
}

function Layout() {
  const { user } = useLoaderData<typeof rootLoader>()
  const navigation = useNavigation()

  return (
    <main>
      <h1>邻里集市</h1>
      <p>本机内存教学 API，不处理真实账号或生产数据。</p>
      <nav aria-label="主导航">
        <Link to="/listings">商品</Link>
        {' · '}
        <Link to="/new">发布</Link>
        {' · '}
        {user ? (
          <Form method="post" action="/logout" className="inline-form">
            <span>当前用户：{user.name} </span>
            <button>退出</button>
          </Form>
        ) : (
          <Link to="/login">登录</Link>
        )}
      </nav>
      {navigation.state !== 'idle' && (
        <p role="status">
          {navigation.state === 'submitting' ? '正在提交……' : '正在加载……'}
        </p>
      )}
      <Outlet />
    </main>
  )
}

function ListPage() {
  const { result, q } = useLoaderData<typeof listLoader>()
  const navigation = useNavigation()
  const pageUrl = (page: number) =>
    `/listings?${new URLSearchParams({ q, page: String(page) })}`

  return (
    <section aria-labelledby="list-heading">
      <h2 id="list-heading">商品列表</h2>
      <Form method="get" key={q}>
        <label htmlFor="q">搜索标题</label>
        <input id="q" name="q" defaultValue={q} />
        <button disabled={navigation.state !== 'idle'}>搜索</button>
      </Form>
      <p role="status">找到 {result.total} 件商品</p>
      {result.items.length === 0 ? (
        <p>没有匹配商品，请调整关键字。</p>
      ) : (
        <section aria-label="商品列表">
          {result.items.map((item) => (
            <ListingCard key={item.id} listing={item}>
              <Link to={`/listings/${encodeURIComponent(item.id)}`}>
                查看详情
              </Link>
            </ListingCard>
          ))}
        </section>
      )}
      <nav aria-label="分页">
        {result.page > 1 && (
          <Link to={pageUrl(result.page - 1)}>上一页</Link>
        )}
        {' '}
        {result.page * result.pageSize < result.total && (
          <Link to={pageUrl(result.page + 1)}>下一页</Link>
        )}
      </nav>
    </section>
  )
}

function DetailPage() {
  const listing = useLoaderData<typeof detailLoader>()
  const feedback = useActionData<typeof reserveAction>()
  const navigation = useNavigation()

  return (
    <section aria-labelledby="detail-heading">
      <h2 id="detail-heading">商品详情</h2>
      <ListingCard listing={listing} />
      <Form method="post">
        <input type="hidden" name="intent" value="reserve" />
        <button
          disabled={
            navigation.state !== 'idle'
            || listing.status !== 'available'
          }
        >
          {navigation.state === 'submitting' ? '预约中' : '预约'}
        </button>
      </Form>
      {feedback?.kind === 'error' && (
        <section role="alert">
          <p>{feedback.message}</p>
          <p>错误码：{feedback.code}</p>
          <p>请求编号：{feedback.requestId}</p>
          {feedback.code === 'SESSION_EXPIRED' && (
            <Link to="/login?next=/listings">重新登录</Link>
          )}
        </section>
      )}
      {feedback?.kind === 'success' && (
        <p role="status">{feedback.message}</p>
      )}
    </section>
  )
}

function NewPage() {
  const rootData = useRouteLoaderData<typeof rootLoader>('root')
  const feedback = useActionData<typeof publishAction>()
  const navigation = useNavigation()

  if (!rootData?.user) {
    return (
      <section>
        <h2>发布商品</h2>
        <p>请先登录教学账号。</p>
        <Link to="/login?next=/new">前往登录</Link>
      </section>
    )
  }

  return (
    <section>
      <h2>发布商品</h2>
      <Form method="post" aria-busy={navigation.state === 'submitting'}>
        <label htmlFor="new-title">标题</label>
        <input id="new-title" name="title" required maxLength={60} />
        <label htmlFor="new-description">描述</label>
        <textarea
          id="new-description"
          name="description"
          required
          maxLength={500}
        />
        <label htmlFor="new-price">价格（元）</label>
        <input
          id="new-price"
          name="price"
          inputMode="decimal"
          required
          aria-describedby="new-price-help"
        />
        <p id="new-price-help">0 至 1000000 元，最多两位小数。</p>
        <button disabled={navigation.state === 'submitting'}>
          {navigation.state === 'submitting' ? '发布中' : '发布'}
        </button>
      </Form>
      {feedback?.kind === 'error' && (
        <section role="alert">
          <p>{feedback.message}</p>
          <p>错误码：{feedback.code}</p>
          <p>请求编号：{feedback.requestId}</p>
        </section>
      )}
    </section>
  )
}

function LoginPage() {
  const url = new URL(window.location.href)
  const next = safeInternalNext(url.searchParams.get('next'))

  return (
    <section>
      <h2>教学登录</h2>
      <p>不收集真实密码，只创建本机演示 Cookie。</p>
      <Form method="post">
        <input type="hidden" name="next" value={next} />
        <button>以演示居民登录</button>
      </Form>
    </section>
  )
}

function RouteError() {
  const error = useRouteError()
  let status = 500
  let code = 'UNKNOWN_ERROR'
  let message = '页面加载失败。'
  let requestId = 'unavailable'

  if (isRouteErrorResponse(error)) {
    status = error.status
    code = error.statusText || 'ROUTE_ERROR'
    if (isRecord(error.data)) {
      if (typeof error.data.message === 'string') {
        message = error.data.message
      }
      if (typeof error.data.requestId === 'string') {
        requestId = error.data.requestId
      }
    } else {
      message = String(error.data)
    }
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <main role="alert">
      <h1>{status}：暂时无法显示页面</h1>
      <p>{message}</p>
      <p>错误码：{code}</p>
      <p>请求编号：{requestId}</p>
      <button type="button" onClick={() => window.location.reload()}>
        重试当前地址
      </button>
      {' '}
      <Link to="/listings">返回商品列表</Link>
    </main>
  )
}

export const router = createBrowserRouter([
  {
    id: 'root',
    path: '/',
    loader: rootLoader,
    element: <Layout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <p role="status">正在加载应用……</p>,
    children: [
      { index: true, loader: () => redirect('/listings') },
      { path: 'listings', loader: listLoader, element: <ListPage /> },
      {
        path: 'listings/:id',
        loader: detailLoader,
        action: reserveAction,
        element: <DetailPage />,
      },
      { path: 'new', action: publishAction, element: <NewPage /> },
      { path: 'login', action: loginAction, element: <LoginPage /> },
      { path: 'logout', action: logoutAction },
      {
        path: '*',
        loader: () => {
          throw new Response(JSON.stringify({
            message: '页面不存在。',
            requestId: 'client-route',
          }), {
            status: 404,
            statusText: 'NOT_FOUND',
            headers: { 'Content-Type': 'application/json' },
          })
        },
      },
    ],
  },
])
```

### 浏览器入口

**替换文件（完成本课时覆盖）：`apps/react-web/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { router } from './router'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('缺少 #root 容器')

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
```

发布“二手书架 / 保存完好，可自提 / 120.00”，成功后 URL 必须使用服务端返回 ID。打开两个标签到 `lamp-1`，在接近同时点击预约；预期一个 201，另一个 409，详情最终显示 reserved。

## 8. 常见错误与排查路径

### 明确错误：从浏览器提交身份

```tsx
await apiRequest(`/listings/${id}/reservations`, parseReservation, {
  method: 'POST',
  body: JSON.stringify({ buyerId: 'demo-buyer' }),
})
```

攻击者可任意修改 buyerId。请求不应提交身份，服务端从会话解析。

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | 两标签都看到可预约，但第二次提交返回 409 |
| 证据 | Network 一条 POST 为 201，另一条为 409 `RESERVATION_CONFLICT` |
| 原因 | 页面读取发生在竞争前，服务端状态在第一次写入后已改变 |
| 修复 | 不把 409 当网络重试；显示冲突并让 loader 重读 reserved 状态 |
| 复验 | 两页最终都显示已预约，只有一个预约编号，没有第二个成功提示 |

其他错误：

- 发布后浏览器生成随机 ID：改用 `created.id`。
- 401 与 403 都显示“未登录”：分别给重新登录和无权提示。
- 失败时 `form.reset()`：删除，保留非受控 DOM 值。
- `next=//evil.example` 开放跳转：只允许单斜线开头的内部路径。
- 详情按钮 disabled 当作权限：服务端仍检查会话、owner 与状态。

## 9. 课后题

1. 为什么前端不读取 HttpOnly Cookie？
2. 发布请求为什么不发送 ownerId？
3. 两标签演示为何不是数据库事务证明？
4. 401、403、409 分别要求什么恢复？

参考答案：

1. HttpOnly 设计为阻止 JavaScript 读取，浏览器同源请求自动发送，降低凭据被脚本窃取风险。
2. owner 来自认证会话，浏览器值可被篡改。
3. 本机 API 是单进程内存；生产有多进程、数据库与真实并发，需要约束和测试。
4. 401 重新认证；403 说明无权并停止；409 读取最新业务状态并让用户决定。

## 10. 实践练习

### 基础

未登录直接打开 `/new`，登录后回到 `/new`。再分别注入 `//evil.example` 与 `/\evil.example`。完成标准：合法 next 回到内部页面，两种外部形式都回退 `/listings`，页面不收集真实密码。

### 进阶

发布一件商品后尝试预约自己的商品。完成标准：API 返回 403，页面不改成 reserved，并显示 requestId。

### 故障注入

分别访问 `/listings/missing`、`/listings?q=__error`，先在页面提交非法金额观察客户端 `VALIDATION`，再从 DevTools Console 直接向教学 API 提交含小数 `priceCents` 的请求以绕过表单校验，最后执行两标签预约。完成标准：依次观察 404、503、客户端校验、HTTP 400、一条 201 与一条 409，恢复入口各自正确。

答案判定：失败不清空发布草稿；成功 ID 来自响应；预约体无 buyerId；所有错误保留状态码语义。

## 11. 阶段验收

- [ ] `/listings?q=台灯&page=1` 可刷新、后退、前进。
- [ ] 未登录 `/new` 提供登录入口。
- [ ] 登录建立 HttpOnly 教学 Cookie，前端未读取凭据。
- [ ] 发布体只含 title/description/priceCents。
- [ ] 发布成功进入服务端 ID 详情。
- [ ] 发布失败保留输入。
- [ ] 预约体不含 buyerId。
- [ ] 两标签得到一条 201 与一条 409。
- [ ] 401/403/404/409/400/503 文案与恢复不同。
- [ ] action 后 loader 重读最新 status/version。
- [ ] typecheck、测试、build 退出 0。
- [ ] 页面明确声明内存 API、假登录、无生产事务。

## 12. 常见问题

**为什么根 loader 把 401 当匿名而不显示整页错误？**<br>
未登录是公开市场的正常状态；503 才表示会话服务故障，不能也吞成匿名。

**预约成功后为何仍要 loader 重读？**<br>
预约响应不是完整 Listing，服务端商品 status/version 才是详情权威。

**前端能实现真正的预约锁吗？**<br>
不能。跨标签、设备和进程必须依赖后端事务与数据库约束。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**。

- [React Router：Actions](https://reactrouter.com/start/data/actions)
- [React Router：Form](https://reactrouter.com/api/components/Form)
- [React Router：Race Conditions](https://reactrouter.com/explanation/race-conditions)
- [MDN：HttpOnly Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie#httponly)
- [OWASP：Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [OWASP：CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

## 我现在能做到什么

我能用 Data Router 和同源会话接通发布、预约与错误恢复，同时把浏览器交互证据和后端授权/事务证据严格分开。

## 单元导航

[上一课：loader、action 与错误](02-loaders-actions-errors-revalidation.md) · [返回章目录](../README.md#第四章data-router-与服务端数据) · [下一章：状态架构](../05-state-architecture/01-state-ownership-reducer-context.md)
