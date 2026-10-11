# Data Router、URL 状态与导航语义

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 可分享、刷新、后退恢复的商品列表与详情路由 |
| 建议时间 | 120 分钟 |
| 路由模式 | React Router Data Mode，运行于 Vite SPA 浏览器端 |
| URL 状态 | `q`、`page`、商品 `id` |
| 完成证据 | 刷新 `/listings?q=台灯&page=1`、前进/后退均恢复 |

Data Mode 的 loader/action 在本章运行于浏览器。它们不能读取数据库或服务器密钥，也不会把 Vite SPA 自动变成服务端框架。

## 1. 任务背景

第 3 章把 q 放在局部 state。刷新后关键字消失，链接无法分享，浏览器后退也不能恢复搜索。可分享状态应进入 URL；尚未提交的输入和短暂弹窗仍可留在局部 state。

商品详情 ID 天然属于路径。服务器事实如 status、version 不应复制进 URL 或 Context，它们来自 loader 请求。

## 2. 学习目标

- 建立 `createBrowserRouter`、`RouterProvider` 与嵌套路由。
- 使用 layout、`Outlet` 和语义导航。
- 区分 `Link`、GET `Form`、普通 button。
- 把 q/page/id 放进 URL。
- 规范化非法页码并正确编码查询参数。
- 区分输入草稿与已提交 URL。
- 验证刷新、前进、后退和深链。
- 解释生产静态服务器 history fallback。

## 3. 预备知识

安装并记录实际 Router 版本：

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm add react-router@8.4.0
pnpm list react-router --depth 0
```

2026-10-11 本轮注册表解析为 React Router `8.4.0`。本书从 `react-router` 导入 Data API，从 `react-router/dom` 导入浏览器 `RouterProvider`。若实际版本不同，先查官方迁移说明和类型，不混用旧教程的包入口。

## 4. 核心理论

### 4.1 状态按可恢复范围分类

| 状态 | 所有者 | 原因 |
| --- | --- | --- |
| q/page/id | URL | 可分享、刷新、前进后退 |
| 输入框尚未提交文本 | 表单 DOM 或局部 state | 不为每次按键制造历史 |
| 商品列表/status/version | 服务端 loader | 需要重新验证 |
| 弹窗开关 | 局部 state | 短生命周期、不需分享 |

### 4.2 Link、Form 与 button

- `Link` 表示导航到资源；
- `<Form method="get">` 表示提交查询并更新 URL；
- button 表示当前页面动作；
- 不用 `onClick={() => navigate(...)}` 替代所有链接，否则会损失链接语义、打开新标签和辅助技术行为。

### 4.3 参数规范化

`?page=-1`、`?page=abc` 规范成 1。q 使用 `URLSearchParams`，不能手拼字符串，否则 `&`、`#` 等字符会改变查询结构。新搜索省略旧 page，自然回到第一页；分页链接必须保留 q。

### 4.4 表单草稿与 URL

GET Form 的输入在提交前只是草稿，提交后 URL 才成为已确认查询。`defaultValue` 适合这种非受控输入。后退到不同 q 时，可用明确 key 重新建立表单 DOM；key 此时表达“URL 查询身份”，不是随机重置。

### 4.5 深链 fallback

Vite dev server 会为 SPA 提供历史回退。生产静态服务器也必须让 `/listings/lamp-1` 返回 `index.html`，但 `/api/*` 必须转给 API，不能被 fallback 吞成 HTML。

## 5. 元素、属性、API 或配置清单

| API | 用途 | 边界 |
| --- | --- | --- |
| `createBrowserRouter` | 创建浏览器 Data Router | 需要服务器深链回退 |
| `RouterProvider` | 向 React 树提供 router | 从 `react-router/dom` 导入 |
| `Outlet` | 渲染匹配的子路由 | layout 本身不替代子页面 |
| `Link` | SPA 内语义导航 | 外部 URL 使用普通链接 |
| `Form method="get"` | 将查询写入 URL | 不用于业务写入 |
| `redirect` | loader/action 重定向 | 返回/抛出 Response |
| `useLoaderData` | 读取当前路由数据 | 不复制到 Context |
| `useParams` | 读取动态路径参数 | 外部输入仍需校验/编码 |
| `URLSearchParams` | 编码和读取查询 | 同名参数策略需明确 |
| `request.url` | loader 的目标 URL | 浏览器端执行，不含服务端秘密 |

## 6. 最小可运行案例

以下示例用静态 fixture 演示 URL 行为，下一课再接 HTTP loader。

**完整文件：`apps/react-web/src/examples/RouterUrlDemo.tsx`**

```tsx
import {
  createBrowserRouter,
  Form,
  Link,
  Outlet,
  redirect,
  useLoaderData,
  useParams,
} from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { seed } from '../domain'

function positivePage(value: string | null) {
  return value !== null && /^\d+$/.test(value) && Number(value) > 0
    ? Number(value)
    : 1
}

function listLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q') ?? ''
  const page = positivePage(url.searchParams.get('page'))
  const items = seed.filter((item) => item.title.includes(q))
  return { items, q, page }
}

function Layout() {
  return (
    <main>
      <h1>邻里集市路由实验</h1>
      <nav aria-label="主导航">
        <Link to="/listings">商品列表</Link>
      </nav>
      <Outlet />
    </main>
  )
}

function ListPage() {
  const { items, q, page } = useLoaderData<typeof listLoader>()
  const pageUrl = (nextPage: number) =>
    `/listings?${new URLSearchParams({
      q,
      page: String(nextPage),
    })}`

  return (
    <section aria-labelledby="list-heading">
      <h2 id="list-heading">商品列表</h2>
      <Form method="get" key={q}>
        <label htmlFor="router-q">搜索标题</label>
        <input id="router-q" name="q" defaultValue={q} />
        <button>搜索</button>
      </Form>
      <p role="status">第 {page} 页，找到 {items.length} 件商品</p>
      {items.length === 0 ? (
        <p>没有匹配商品。</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <Link to={`/listings/${encodeURIComponent(item.id)}`}>
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="演示分页">
        {page > 1 && <Link to={pageUrl(page - 1)}>上一页</Link>}
        {' '}
        <Link to={pageUrl(page + 1)}>下一页</Link>
      </nav>
    </section>
  )
}

function DetailPage() {
  const { id = '' } = useParams()
  const item = seed.find((candidate) => candidate.id === id)
  if (!item) return <p role="alert">404：商品不存在。</p>
  return (
    <section>
      <h2>{item.title}</h2>
      <p>{item.description}</p>
      <Link to="/listings">返回列表</Link>
    </section>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', loader: () => redirect('/listings') },
      { path: '/listings', loader: listLoader, element: <ListPage /> },
      { path: '/listings/:id', element: <DetailPage /> },
      { path: '*', element: <p role="alert">404：页面不存在。</p> },
    ],
  },
])

export default function RouterUrlDemo() {
  return <RouterProvider router={router} />
}
```

**关键片段：`apps/react-web/src/App.tsx`**

```tsx
export { default } from './examples/RouterUrlDemo'
```

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm typecheck
pnpm dev --host 127.0.0.1
```

打开 `/listings?q=台灯&page=1`，刷新后查询仍在；搜索折叠桌，再使用浏览器后退，输入和结果恢复台灯。

## 7. 邻里集市集成案例

真实列表 loader 把规范化 URL 转成共享 API：

**关键片段：`apps/react-web/src/router.tsx`**

```tsx
async function listLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const q = url.searchParams.get('q') ?? ''
  const page = positivePage(url.searchParams.get('page'))
  const search = new URLSearchParams({
    q,
    page: String(page),
    pageSize: '20',
  })
  const result = await request(
    `/listings?${search}`,
    parseListingPage,
    { signal: request.signal },
  )
  return { result, q }
}
```

`request.signal` 在新导航取代旧导航时取消读取。不要同时在页面调用 `useListings` 读取同一资源，否则会产生两份请求和两个所有者。

列表分页响应仍是 `{items,page,pageSize,total}`。详情 ID 用 `encodeURIComponent` 生成 URL，loader 读取后再次编码进 API 路径。

## 8. 常见错误与排查路径

### 明确错误：手工拼查询字符串

```tsx
const url = '/listings?q=' + q + '&page=' + page
```

q 为 `台灯&状态` 时会被拆成额外参数。

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | SPA 内点击详情正常，刷新 `/listings/lamp-1` 却得到服务器 404 |
| 证据 | Network 的 document 请求由静态服务器返回 404，React 尚未启动 |
| 原因 | 生产服务器缺少 SPA history fallback |
| 修复 | 非 `/api` 资源路径回退到 `index.html`；API 路径继续反代 |
| 复验 | 直接刷新详情返回 index 文档并由 router 渲染；`/api/v1/...` 仍返回 JSON |

其他错误：

- page 接受 `-1`/`NaN`：统一规范为正整数。
- 新搜索保留旧 page：GET Form 不提交 page，回到 1。
- 用 button 模拟所有链接：恢复 `Link` 语义。
- loader 数据复制到 Context：直接 `useLoaderData`，让 router 负责失效。

## 9. 课后题

1. 哪些状态应进入 URL？
2. GET Form 为什么适合搜索？
3. loader 在本章能否安全读取服务器密钥？
4. Vite dev 深链成功是否证明生产服务器已配置？

参考答案：

1. 需要分享、刷新、前进后退恢复的 q/page/id。
2. 查询是安全、可重复读取，表单自然生成可复制 URL。
3. 不能，本章 Data Mode loader 在浏览器执行并打入客户端。
4. 不能，生产静态服务器仍需独立 history fallback 验收。

## 10. 实践练习

### 基础

添加“清除筛选”Link 指向 `/listings`。完成标准：q 为空、page 为 1、输入同步恢复。

### 进阶

为 page 超出总页数定义行为：本课选择保留 URL 并显示 empty，或规范到末页；写清规则并测试后退行为。

### 故障注入

临时把开发服务器换成不支持 fallback 的静态文件服务，刷新详情观察 404，再恢复正确配置。完成标准：能区分服务器文档 404 与路由对象 404。

答案判定：查询用 `URLSearchParams`；链接语义保留；故障记录包含 document 请求证据。

## 11. 阶段验收

- [ ] Router 实际版本已记录。
- [ ] layout、Outlet、列表和详情路由可达。
- [ ] q/page/id 由 URL 拥有。
- [ ] 非法 page 规范为 1。
- [ ] 新搜索回到第一页，分页保留 q。
- [ ] 刷新、前进、后退恢复页面。
- [ ] Link、GET Form、button 语义正确。
- [ ] 能说明 dev 与生产 fallback 的差异。
- [ ] typecheck 与 build 退出 0。

## 12. 常见问题

**每次输入都应该更新 URL 吗？**<br>
不一定。本课让输入先成为草稿，提交后更新 URL，避免每个按键产生历史。

**Hash Router 是否无需服务器 fallback？**<br>
通常 hash 不发送给服务器，但 URL 结构、SEO 和服务端渲染能力不同。本书主线使用 Browser Router 并正确配置服务器。

**page 为什么不用 state？**<br>
它需要分享和历史恢复，URL 已是单一真相。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**；注册表解析日期：**2026-10-11**。

- [React Router：Data Mode Installation](https://reactrouter.com/start/data/installation)
- [React Router：Routing](https://reactrouter.com/start/data/routing)
- [React Router：Navigating](https://reactrouter.com/start/data/navigating)
- [React Router：URL Values](https://reactrouter.com/start/library/url-values)
- [MDN：URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)

## 我现在能做到什么

我能让搜索、分页和详情成为可分享的 URL 状态，并用语义导航和深链证据验证浏览器历史行为。

## 单元导航

[返回章目录](../README.md#第四章data-router-与服务端数据) · [下一课：loader、action、错误与重新验证](02-loaders-actions-errors-revalidation.md)
