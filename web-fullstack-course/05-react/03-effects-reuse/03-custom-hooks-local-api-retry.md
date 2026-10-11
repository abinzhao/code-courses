# 自定义 Hook、本机教学 API 与重试

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | `useListings` 驱动的服务端列表页与 Vite 本机教学 API |
| 建议时间 | 180 分钟 |
| 可观察路径 | 正常、empty、`__error`、Offline、快速搜索、重试 |
| 服务边界 | 进程内存、假登录、固定 CSRF 标记、仅 localhost |
| 完成证据 | typecheck/build 通过；503 不伪装 empty；重启 API 后数据重置 |

自定义 Hook 复用状态逻辑，不自动共享缓存。Vite middleware 只是阶段模拟 API，不是 Nest 服务、数据库或生产安全边界。

## 1. 任务背景

上一课完成 HTTP helper 与 `useListings`，现在需要真实的同源端点观察 Network、状态码、取消和重试。为避免提前引入后端框架，本课用 Vite middleware 提供本机内存 API。

教学 API 同时预留登录、发布、详情、预约、收藏和编辑路由，供第 4 章继续使用；但它有明确限制：

- 进程重启即丢失数据；
- 所有标签页共享同一 Node 进程内存；
- 假登录不验证密码；
- 固定 `demo-csrf` 不是安全防护；
- 没有数据库事务、持久化、速率限制或审计；
- 只能绑定 `127.0.0.1`，不得公网部署。

## 2. 学习目标

- 将资源生命周期提取为自定义 Hook。
- 理解每次 Hook 调用都有独立 state/Effect。
- 用 revision 表达显式重试。
- 在 Vite 插件中建立同源 `/api/v1` 教学路由。
- 实现共享 Listing、分页、错误、会话与预约契约。
- 区分内存原子更新与数据库事务。
- 使用浏览器 Network 验证取消、状态码和 requestId。
- 说明替换真实后端时的代理边界。

## 3. 预备知识

已有文件：

```text
src/domain.ts
src/api.ts
src/useListings.ts
src/ListingCard.tsx
src/form.ts
vite.config.ts
```

`tsconfig.node.json` 需要检查 Vite 配置和插件文件：

**关键片段：`apps/react-web/tsconfig.node.json`**

```json
{
  "include": [
    "vite.config.ts",
    "dev-api.ts",
    "src/domain.ts",
    "src/form.ts"
  ]
}
```

保留原有 compilerOptions，不要用这段增量覆盖整份文件。Node 配置项目必须列出
`dev-api.ts` 跨入的两个模块，否则 project references 会报告 TS6307。

## 4. 核心理论

### 4.1 自定义 Hook 复用逻辑，不共享实例

`useListings(q, revision)` 把 resource、Effect、Abort 与错误转换放在一起。两个组件分别调用会产生两组请求和状态。共享服务器缓存、去重和失效策略需要专门的数据层，不能仅靠“函数名以 use 开头”获得。

### 4.2 重试是输入变化

失败后 q 没变，递增 revision 可明确要求重建读取生命周期。重试不会清空关键字，也不把旧错误转成 empty。若服务仍返回 503，继续显示失败是正确结果。

### 4.3 Vite middleware 的位置

插件运行在 Node 开发服务器，不会打进浏览器 bundle。它适合本地契约教学，但没有生产服务器的进程模型、数据库、反向代理、TLS 与安全设施。

### 4.4 内存更新不是事务证明

Node 单进程中同步替换数组可让两个演示预约得到一成功一冲突；这不能证明多进程真实后端安全。生产需要数据库唯一约束、锁或原子条件更新，并进行真实并发测试。

### 4.5 替换真实后端

进入后端阶段后删除 devApi 插件，开发服务器只代理 `/api` 到本机 API。代理解决开发同源路由，不自动完成生产 HTTPS、Cookie、CORS 或 CSRF。

## 5. 元素、属性、API 或配置清单

| API / 配置 | 用途 | 边界 |
| --- | --- | --- |
| 自定义 Hook | 复用请求生命周期 | 每次调用独立 |
| revision state | 触发显式重试 | 不改变 q |
| Vite `Plugin` | 注入开发 middleware | 不进入生产后端 |
| `configureServer` | 注册开发服务器逻辑 | 只在 dev 生效 |
| `server.middlewares.use` | 处理 `/api/v1` | 需主动调用 `next` |
| `structuredClone` | 复制 fixture | 仍是内存数据 |
| `Set-Cookie` | 建立教学 HttpOnly Cookie | 本地 HTTP 无 Secure |
| `SameSite=Lax` | 一层 Cookie 策略 | 不替代完整 CSRF |
| `requestId` | 关联错误证据 | 不暴露堆栈/密钥 |
| Vite `server.proxy` | 开发转发真实后端 | 不代表生产反代配置 |

## 6. 最小可运行案例

列表页消费上一课 Hook：

**完整文件：`apps/react-web/src/examples/ServerListDemo.tsx`**

```tsx
import { useState } from 'react'
import ListingCard from '../ListingCard'
import { useListings } from '../useListings'

export default function ServerListDemo() {
  const [q, setQ] = useState('')
  const [revision, setRevision] = useState(0)
  const resource = useListings(q, revision)

  return (
    <main>
      <h1>邻里集市</h1>
      <p>本机内存教学 API：重启开发服务器会重置数据。</p>
      <label htmlFor="server-search">搜索标题</label>
      <input
        id="server-search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />

      {resource.status === 'loading' && (
        <p role="status">正在加载商品……</p>
      )}
      {resource.status === 'error' && (
        <section role="alert">
          <p>{resource.message}</p>
          <p>错误码：{resource.code}</p>
          <p>请求编号：{resource.requestId}</p>
          <button type="button" onClick={() => setRevision((n) => n + 1)}>
            重试
          </button>
        </section>
      )}
      {resource.status === 'success' && (
        <section aria-label="商品列表">
          <p role="status">找到 {resource.data.total} 件商品</p>
          {resource.data.items.length === 0 ? (
            <p>没有匹配商品，请调整关键字。</p>
          ) : (
            resource.data.items.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))
          )}
        </section>
      )}
    </main>
  )
}
```

**关键片段：`apps/react-web/src/App.tsx`**

```tsx
export { default } from './examples/ServerListDemo'
```

先完成下面 API 与 Vite 配置，再执行：

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm typecheck
pnpm build
pnpm dev --host 127.0.0.1
```

## 7. 邻里集市集成案例

### 本机教学 API

**完整文件：`apps/react-web/dev-api.ts`**

```ts
import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'
import { seed } from './src/domain.ts'
import type { Listing } from './src/domain.ts'
import { validateDraft } from './src/form.ts'

type JsonObject = Record<string, unknown>

async function readBody(req: IncomingMessage): Promise<JsonObject> {
  let text = ''
  for await (const chunk of req) {
    text += chunk
    if (text.length > 16_384) throw new Error('请求体过大')
  }
  const value: unknown = text ? JSON.parse(text) : {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('请求体必须为对象')
  }
  return value as JsonObject
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export default function devApi(): Plugin {
  let items: Listing[] = structuredClone(seed)
  const favorites = new Set<string>()

  return {
    name: 'neighborhood-market-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        if (!url.pathname.startsWith('/api/v1/')) return next()

        const path = url.pathname.slice('/api/v1'.length)
        const method = (req.method ?? 'GET').toUpperCase()
        const loggedIn = /(?:^|;\s*)demo_session=buyer(?:;|$)/.test(
          req.headers.cookie ?? '',
        )
        const send = (status: number, data: unknown) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(data))
        }
        const fail = (status: number, code: string, message: string) => {
          const requestId = crypto.randomUUID()
          res.setHeader('X-Request-Id', requestId)
          send(status, { code, message, requestId })
        }

        try {
          await delay(250)

          if (method === 'GET' && path === '/auth/me') {
            return loggedIn
              ? send(200, { id: 'demo-buyer', name: '演示居民' })
              : fail(401, 'SESSION_EXPIRED', '请先登录。')
          }

          if (
            !['GET', 'HEAD'].includes(method)
            && req.headers['x-csrf-token'] !== 'demo-csrf'
          ) {
            return fail(403, 'CSRF', '缺少教学 CSRF 标记。')
          }

          if (
            method === 'POST'
            && ['/auth/login', '/auth/register'].includes(path)
          ) {
            await readBody(req)
            res.setHeader(
              'Set-Cookie',
              'demo_session=buyer; HttpOnly; SameSite=Lax; Path=/',
            )
            return send(200, { id: 'demo-buyer', name: '演示居民' })
          }

          if (method === 'POST' && path === '/auth/logout') {
            favorites.clear()
            res.setHeader(
              'Set-Cookie',
              'demo_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
            )
            return send(200, { ok: true })
          }

          if (method === 'GET' && path === '/listings') {
            const q = url.searchParams.get('q') ?? ''
            if (q === '__error') {
              return fail(503, 'DEMO_FAILURE', '演示服务故障。')
            }
            const rawPage = Number(url.searchParams.get('page') ?? '1')
            const rawPageSize = Number(url.searchParams.get('pageSize') ?? '20')
            const page = Number.isSafeInteger(rawPage) && rawPage > 0
              ? rawPage
              : 1
            const pageSize = Number.isSafeInteger(rawPageSize)
              ? Math.min(100, Math.max(1, rawPageSize))
              : 20
            const filtered = items.filter((item) => item.title.includes(q))
            const start = (page - 1) * pageSize
            return send(200, {
              items: filtered.slice(start, start + pageSize),
              page,
              pageSize,
              total: filtered.length,
            })
          }

          const detailMatch = /^\/listings\/([^/]+)$/.exec(path)
          const reservationMatch =
            /^\/listings\/([^/]+)\/reservations$/.exec(path)
          const favoriteMatch = /^\/favorites\/([^/]+)$/.exec(path)
          const encodedId =
            (detailMatch ?? reservationMatch ?? favoriteMatch)?.[1] ?? ''
          const id = decodeURIComponent(encodedId)
          const item = items.find((candidate) => candidate.id === id)

          if (detailMatch && method === 'GET') {
            return item
              ? send(200, item)
              : fail(404, 'NOT_FOUND', '商品不存在。')
          }

          if (!loggedIn) {
            return fail(401, 'SESSION_EXPIRED', '请先登录。')
          }

          if (method === 'POST' && path === '/listings') {
            const data = await readBody(req)
            if (
              typeof data.priceCents !== 'number'
              || !Number.isSafeInteger(data.priceCents)
            ) {
              return fail(400, 'VALIDATION', '价格必须为整数分。')
            }
            const result = validateDraft({
              title: String(data.title ?? ''),
              description: String(data.description ?? ''),
              price: (data.priceCents / 100).toFixed(2),
            })
            if (!result.ok) {
              return fail(400, 'VALIDATION', result.message)
            }
            const created: Listing = {
              ...result.value,
              id: crypto.randomUUID(),
              status: 'available',
              ownerId: 'demo-buyer',
              version: 1,
              createdAt: new Date().toISOString(),
            }
            items = [created, ...items]
            return send(201, created)
          }

          if (!item) return fail(404, 'NOT_FOUND', '商品不存在。')

          if (detailMatch && method === 'PATCH') {
            if (item.ownerId !== 'demo-buyer') {
              return fail(403, 'FORBIDDEN', '只能修改自己的商品。')
            }
            const data = await readBody(req)
            if (data.version !== item.version) {
              return fail(409, 'VERSION_CONFLICT', '商品已更新，请重新读取。')
            }
            const result = validateDraft({
              title: String(data.title ?? item.title),
              description: String(data.description ?? item.description),
              price: typeof data.priceCents === 'number'
                ? (data.priceCents / 100).toFixed(2)
                : (item.priceCents / 100).toFixed(2),
            })
            if (!result.ok) {
              return fail(400, 'VALIDATION', result.message)
            }
            const updated: Listing = {
              ...item,
              ...result.value,
              version: item.version + 1,
            }
            items = items.map((candidate) =>
              candidate.id === id ? updated : candidate,
            )
            return send(200, updated)
          }

          if (reservationMatch && method === 'POST') {
            if (item.ownerId === 'demo-buyer') {
              return fail(403, 'FORBIDDEN', '不能预约自己的商品。')
            }
            if (item.status !== 'available') {
              return fail(409, 'RESERVATION_CONFLICT', '商品已被预约。')
            }
            const updated: Listing = {
              ...item,
              status: 'reserved',
              version: item.version + 1,
            }
            items = items.map((candidate) =>
              candidate.id === id ? updated : candidate,
            )
            return send(201, {
              id: crypto.randomUUID(),
              listingId: id,
              buyerId: 'demo-buyer',
              status: 'pending',
              createdAt: new Date().toISOString(),
            })
          }

          if (
            favoriteMatch
            && (method === 'PUT' || method === 'DELETE')
          ) {
            if (method === 'PUT') favorites.add(id)
            else favorites.delete(id)
            return send(200, { ok: true })
          }

          return fail(405, 'METHOD_NOT_ALLOWED', '不支持此方法。')
        } catch {
          return fail(400, 'BAD_REQUEST', '请求格式错误。')
        }
      })
    },
  }
}
```

### Vite 接线

**替换文件（完成本课时覆盖）：`apps/react-web/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import devApi from './dev-api.ts'

export default defineConfig({
  plugins: [react(), devApi()],
})
```

停止旧开发服务器再重新启动，插件才会加载。输入：

- 空关键字：200，两条 fixture；
- `台灯`：200，一条；
- 未知关键字：200，empty；
- `__error`：503、alert、requestId；
- DevTools Offline：network error；
- “台”快速改“台灯”：最终只保留台灯结果。

真实后端替换：

**关键片段：`apps/react-web/vite.config.ts`**

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000',
    },
  },
})
```

## 8. 常见错误与排查路径

### 明确错误：把教学 API 当生产服务

```bash
pnpm dev --host 0.0.0.0
```

这会把无密码假登录、固定 CSRF 字符串和内存数据暴露给局域网，违背本课边界。

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | 修改 `dev-api.ts` 后请求仍走旧逻辑 |
| 证据 | Network 响应未变化；终端没有插件重新加载记录 |
| 原因 | Vite 配置/服务器插件在开发服务器启动时加载 |
| 修复 | 停止旧进程，使用 `--host 127.0.0.1` 重新启动 |
| 复验 | `__error` 返回 503 与新 requestId，正常搜索恢复 200 |

其他错误：

- API 路径被 SPA fallback 返回 HTML：先注册 API middleware，并检查 Content-Type。
- 直接修改 readonly item：用新对象替换数组项。
- 重试清空 q：revision 只触发重读，不改变关键字。
- 把一个 Hook 实例当全局缓存：检查 Network 中重复请求并重新设计共享层。

## 9. 课后题

1. 自定义 Hook 为什么不会自动共享请求？
2. 重启 Vite 后发布的数据为何消失？
3. 本机两标签预约一成功一 409，能否证明生产并发安全？
4. 开发代理是否自动解决 CORS、CSRF 和 HTTPS？

参考答案：

1. 每次调用都创建自己的 state 与 Effect。
2. 数据只保存在 Node 进程内存，没有数据库。
3. 不能。生产多进程和数据库竞争需要真实约束与并发测试。
4. 不能。代理只改变开发请求转发，生产安全边界仍需独立配置。

## 10. 实践练习

### 基础

在错误区显示 requestId，并提供“重试”按钮。完成标准：q 保持不变，按钮只递增 revision。

### 进阶

给列表端点增加 `pageSize` 最大 100 的测试，并证明非法 page 回退 1。完成标准：响应仍符合 `{items,page,pageSize,total}`。

### 故障注入

启动服务后切到 Offline，再恢复并点击重试。完成标准：Offline 显示网络错误而非 empty；恢复后同一 q 成功；Console 不输出 Cookie。

答案判定：三条路径都有可观察 Network/DOM 证据；不把教学 API 描述成持久化或安全登录。

## 11. 阶段验收

- [ ] `dev-api.ts` 与客户端均通过类型检查。
- [ ] typecheck、测试、build 退出 0。
- [ ] 正常、empty、503、Offline、重试均有不同 UI。
- [ ] 快速输入时旧响应不能覆盖最新 q。
- [ ] 401/403/404/409/400/503 保持不同含义。
- [ ] Cookie 为 HttpOnly 教学会话，浏览器代码不读取凭据。
- [ ] 固定 CSRF、内存、假登录、无事务边界均已明示。
- [ ] 开发服务器仅绑定 `127.0.0.1`。

## 12. 常见问题

**为什么插件同时实现后续路由？**<br>
为了让第 4 章在同一共享契约上继续，不重复另一套 API；未使用的能力不代表本课已经验收。

**可以把内存数据放 LocalStorage 吗？**<br>
本课不这样做。LocalStorage 仍不是后端持久化，而且可能制造跨会话、隐私和过期数据问题。

**为什么重试仍可能失败？**<br>
如果根因仍是 `__error` 或服务离线，重试应如实失败，不能假报成功。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**。

- [React：Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [React：Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [Vite：Plugin API](https://vite.dev/guide/api-plugin)
- [Vite：Server Options](https://vite.dev/config/server-options)
- [MDN：Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [OWASP：Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

## 我现在能做到什么

我能用自定义 Hook 封装可取消、可重试的读取生命周期，并用诚实标记的本机 API 验证 HTTP 状态与恢复路径。

## 单元导航

[上一课：HTTP、取消与资源状态](02-fetch-http-abort-resource-state.md) · [返回章目录](../README.md#第三章effecthttp-与自定义-hook) · [下一章：Data Router 与服务端数据](../04-routing-data/01-data-router-url-state-navigation.md)
