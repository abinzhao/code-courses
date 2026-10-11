# Composable、重试与本机教学 API

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 提取 `useListings`，接入仅供本机开发的 Vite middleware，并完成加载/错误/空/成功/重试 |
| 可观察产出 | `useListings.ts`、`dev-api.ts`、Vite 配置、`ServerListPage.vue` |
| 运行条件 | 第 3 章前两课、Node.js 24、Vite 8 |
| 建议时间 | 130 分钟 |
| 完成证据 | 类型/测试/构建、HTTP 状态、快速搜索取消和教学边界检查 |

## 1. 任务背景

上一课的页面已经正确处理请求，但请求逻辑与模板绑在一起。邻里集市的列表页和后续路由都要
复用“参数变化、取消旧请求、资源状态、重试”这组生命周期逻辑。

Composable 是按组件调用建立的一组响应式状态和副作用，不天然是全局 store。本课提取
`useListings`，并用 Vite 开发中间件提供可运行协议。中间件只用于当前电脑教学，不可部署为
生产后端。

## 2. 学习目标

完成后你应能：

1. 接收普通值、ref 或 getter 作为 composable 输入；
2. 使用 `toValue` 与显式 watch 建立可审查依赖；
3. 返回 ref 而不是失去响应性的值快照；
4. 用 revision 实现不改变查询参数的显式重试；
5. 编写 Vite `configureServer` middleware；
6. 实现统一分页、错误体、教学登录、发布、编辑、收藏和预约协议；
7. 说明教学 API 的内存、安全、并发和部署边界；
8. 用 Network 与页面状态验证快速查询竞争。

## 3. 预备知识

应已存在：

```text
src/api.ts
src/resource.ts
src/domain.ts
src/form.ts
src/ListingCard.vue
src/SearchField.vue
```

`tsconfig.node.json` 必须严格检查 `vite.config.ts` 和 `dev-api.ts`。若脚手架只 include 一个文件，
需要增加另一个，而不是让 Node 侧代码逃离类型门禁。

## 4. 核心理论

### 4.1 Composable 的实例边界

每次 `useListings(...)` 调用都会建立自己的 `resource`、`revision` 和 watcher。它适合复用逻辑，
不表示状态自动共享。跨路由会话和收藏在第 5 章由 Pinia 负责。

返回 ref 后调用方可以安全解构：

```ts
const { resource, retry } = useListings(q)
```

若返回 `resource.value`，那只是调用时快照，后续更新不会到达模板。

### 4.2 `MaybeRefOrGetter` 与 `toValue`

调用方可能传：

- 普通 `1`；
- `ref(1)`；
- `computed(() => route.query.page)`；
- getter `() => normalizedPage.value`。

在 watch source 中调用 `toValue`，Vue 才能追踪 getter/ref 的依赖。不要在 composable 创建时只
求值一次。

### 4.3 重试不是伪造成功

`revision` 自增让 watch source 改变，产生一个参数相同的新请求。重试按钮不能直接把 error
改成 success，因为只有新的有效响应能提供成功数据。

### 4.4 教学 API 的真实边界

本机 middleware：

- 数据存在 Vite Node 进程内存，重启清空；
- 登录不检查密码，只设置固定演示身份；
- Cookie 没有生产 HTTPS 的 Secure 属性；
- `demo-csrf` 固定可预测，不构成真实 CSRF 防护；
- 单进程同步检查可演示一个预约成功、另一个 409，但不是数据库事务证据；
- 没有数据库、密码散列、速率限制、审计、备份或多进程一致性；
- 只通过 `--host 127.0.0.1` 在当前电脑运行。

页面和文档都必须显示这些限制。

### 4.5 生产替换方向

真实后端建立后移除 `devApi()`，Vite 开发环境可把 `/api` 代理到明确的本机后端。生产环境由
同源反向代理或经过审查的跨源配置提供 API。代理只解决转发，不自动提供授权、CSRF、事务或 TLS。

## 5. 元素、属性、API 或配置清单

| API/配置 | 作用 | 关键边界 |
| --- | --- | --- |
| `MaybeRefOrGetter<T>` | 接受值、ref、getter | 不表示全局共享 |
| `toValue()` | 在响应式上下文解包输入 | 应在 watch source 中读取 |
| `watch` | 根据 q/page/revision 同步请求 | 同步注册 abort |
| `shallowRef` | 保存整体资源快照 | 根对象整体替换 |
| `configureServer` | 添加 Vite 开发 middleware | 不进入生产构建服务 |
| `server.middlewares.use` | 处理本机请求 | 先限制 `/api/v1` 前缀 |
| `URL` / `URLSearchParams` | 解析并编码参数 | 不手工拼接 |
| `Set-Cookie: HttpOnly` | 演示服务端会话形状 | 本地 HTTP 不等于生产安全 |
| `PUT` / `DELETE` 收藏 | 表达目标状态 | 重复调用保持幂等 |
| 409 | 预约或版本冲突 | 不无限自动重试 |

## 6. 最小可运行案例

**完整文件：`apps/vue-web/src/useListings.ts`**

```ts
import { ref, shallowRef, toValue, watch } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import { ApiError, api, isAbortError } from './api'
import type { Listing, Page } from './domain'
import type { Resource } from './resource'

export function useListings(
  q: MaybeRefOrGetter<string>,
  page: MaybeRefOrGetter<number> = 1,
) {
  const revision = ref(0)
  const resource = shallowRef<Resource<Page<Listing>>>({
    status: 'loading',
  })

  watch(
    () => [toValue(q), toValue(page), revision.value] as const,
    ([query, currentPage], _oldValue, onCleanup) => {
      const controller = new AbortController()
      onCleanup(() => controller.abort())
      resource.value = { status: 'loading' }

      const params = new URLSearchParams({
        q: query,
        page: String(currentPage),
        pageSize: '20',
      })
      api<Page<Listing>>(`/listings?${params}`, {
        signal: controller.signal,
      }).then((data) => {
        if (!controller.signal.aborted) {
          resource.value = { status: 'success', data }
        }
      }).catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        resource.value = error instanceof ApiError
          ? {
              status: 'error',
              message: error.message,
              statusCode: error.status,
              requestId: error.requestId,
            }
          : { status: 'error', message: '无法连接教学服务。' }
      })
    },
    { immediate: true },
  )

  return {
    resource,
    retry: () => {
      revision.value++
    },
  }
}
```

渐进提取顺序：

1. 从页面复制 q 请求和资源状态；
2. 把 q 改成 `MaybeRefOrGetter<string>`；
3. 增加 page 输入；
4. 把两者和 revision 放入单一 watch source；
5. 保留取消与写入前检查；
6. 返回 resource ref 和 retry 命令。

## 7. 邻里集市集成案例

### 7.1 本机教学 API

**完整文件：`apps/vue-web/dev-api.ts`**

```ts
import { randomUUID } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'
import { seed } from './src/domain.ts'
import { validateDraft } from './src/form.ts'

type JsonObject = Record<string, unknown>

async function readBody(req: IncomingMessage): Promise<JsonObject> {
  let text = ''
  for await (const chunk of req) {
    text += chunk
    if (text.length > 16_384) {
      throw new Error('请求体超过 16 KiB 教学限制')
    }
  }
  const value: unknown = text ? JSON.parse(text) : {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('请求体必须是 JSON 对象')
  }
  return value as JsonObject
}

const wait = (milliseconds: number) =>
  new Promise(resolve => setTimeout(resolve, milliseconds))

export default function devApi(): Plugin {
  let items = structuredClone(seed)
  const favorites = new Set<string>()

  return {
    name: 'neighborhood-market-teaching-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
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
        const fail = (status: number, code: string, message: string) =>
          send(status, {
            code,
            message,
            requestId: randomUUID(),
          })

        try {
          if (method === 'GET' && path === '/listings') {
            const q = url.searchParams.get('q') ?? ''
            await wait(q === '台灯' ? 700 : 120)
            if (q === '__error') {
              return fail(503, 'DEMO_FAILURE', '演示服务暂不可用。')
            }
            const rawPage = Number(url.searchParams.get('page') ?? '1')
            const rawPageSize = Number(url.searchParams.get('pageSize') ?? '20')
            const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
            const pageSize = Number.isInteger(rawPageSize)
              ? Math.min(100, Math.max(1, rawPageSize))
              : 20
            const filtered = items.filter(item => item.title.includes(q))
            return send(200, {
              items: filtered.slice(
                (page - 1) * pageSize,
                page * pageSize,
              ),
              page,
              pageSize,
              total: filtered.length,
            })
          }

          await wait(120)

          if (method === 'GET' && path === '/auth/me') {
            return loggedIn
              ? send(200, { id: 'demo-buyer', name: '演示居民' })
              : fail(401, 'SESSION_EXPIRED', '请先登录。')
          }

          if (!['GET', 'HEAD'].includes(method)
            && req.headers['x-csrf-token'] !== 'demo-csrf') {
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

          const listingMatch = /^\/listings\/([^/]+)$/.exec(path)
          const reservationMatch =
            /^\/listings\/([^/]+)\/reservations$/.exec(path)
          const favoriteMatch = /^\/favorites\/([^/]+)$/.exec(path)
          const encodedId =
            (listingMatch ?? reservationMatch ?? favoriteMatch)?.[1]
          const id = encodedId ? decodeURIComponent(encodedId) : ''
          const item = items.find(candidate => candidate.id === id)

          if (listingMatch && method === 'GET') {
            if (id === '__error') {
              return fail(503, 'DEMO_FAILURE', '详情服务暂不可用。')
            }
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
              return fail(400, 'VALIDATION', '价格必须是整数分。')
            }
            const result = validateDraft({
              title: String(data.title ?? ''),
              description: String(data.description ?? ''),
              price: (data.priceCents / 100).toFixed(2),
            })
            if (!result.ok) {
              return fail(400, 'VALIDATION', result.message)
            }
            const created = {
              ...result.value,
              id: randomUUID(),
              status: 'available' as const,
              ownerId: 'demo-buyer',
              version: 1,
              createdAt: new Date().toISOString(),
            }
            items = [created, ...items]
            return send(201, created)
          }

          if (!listingMatch && !reservationMatch && !favoriteMatch) {
            return fail(404, 'NOT_FOUND', '接口不存在。')
          }
          if (!item) {
            return fail(404, 'NOT_FOUND', '商品不存在。')
          }

          if (listingMatch && method === 'PATCH') {
            if (item.ownerId !== 'demo-buyer') {
              return fail(403, 'FORBIDDEN', '只能修改自己的商品。')
            }
            const data = await readBody(req)
            if (data.version !== item.version) {
              return fail(
                409,
                'VERSION_CONFLICT',
                '商品已更新，请重新读取。',
              )
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
            Object.assign(item, result.value, {
              version: item.version + 1,
            })
            return send(200, item)
          }

          if (reservationMatch && method === 'POST') {
            if (item.ownerId === 'demo-buyer') {
              return fail(403, 'FORBIDDEN', '不能预约自己的商品。')
            }
            if (item.status !== 'available') {
              return fail(
                409,
                'RESERVATION_CONFLICT',
                '商品已被预约。',
              )
            }
            item.status = 'reserved'
            item.version++
            return send(201, {
              id: randomUUID(),
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

### 7.2 Vite 接线

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import devApi from './dev-api.ts'

export default defineConfig({
  plugins: [vue(), devApi()],
})
```

**关键片段：`apps/vue-web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts", "dev-api.ts"]
}
```

这是对现有脚手架配置的关键字段说明，不应删除其余 project reference 与工具选项。

### 7.3 页面

**完整文件：`apps/vue-web/src/pages/ServerListPage.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import ListingCard from '../ListingCard.vue'
import SearchField from '../SearchField.vue'
import { useListings } from '../useListings'

const q = ref('')
const { resource, retry } = useListings(q)
</script>

<template>
  <section aria-labelledby="server-list-title">
    <h2 id="server-list-title">教学 API 商品</h2>
    <p>
      <strong>
        本机内存 API：重启清空；固定教学身份和 CSRF 标记不用于生产。
      </strong>
    </p>
    <SearchField v-model="q" label="搜索标题" />

    <p v-if="resource.status === 'loading'" role="status">
      正在加载商品……
    </p>
    <section v-else-if="resource.status === 'error'" role="alert">
      <p>{{ resource.message }}</p>
      <p v-if="resource.requestId">请求编号：{{ resource.requestId }}</p>
      <button type="button" @click="retry">重试</button>
    </section>
    <section v-else aria-label="商品列表">
      <p role="status">找到 {{ resource.data.total }} 件商品</p>
      <p v-if="resource.data.items.length === 0">
        没有匹配商品。
      </p>
      <ListingCard
        v-for="item in resource.data.items"
        :key="item.id"
        :listing="item"
      />
    </section>
  </section>
</template>
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm typecheck
pnpm exec vitest run
pnpm build
pnpm dev --host 127.0.0.1 --strictPort
```

重启 Vite 才会加载新增插件。浏览器验证普通、空、`__error`、重试和快速切换路径。

## 8. 常见错误与排查路径

**明确错误示例：异步创建 watcher。**

**关键片段：`apps/vue-web/src/bad-useListings.ts`**

```ts
setTimeout(() => {
  watch(q, loadListings)
}, 1000)
```

这个 watcher 脱离同步 setup 创建，不能依赖组件自动停止。正确做法是在 composable 同步建立，
用响应式条件决定何时请求。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 先搜索慢速“台灯”，立即改为“折叠桌”，最终页面却显示台灯 |
| 证据 | Network 中台灯请求后完成；旧实现没有 abort 或写入前 signal 检查 |
| 原因 | 两次请求都能提交状态，完成顺序覆盖用户意图顺序 |
| 修复 | watcher 同步注册 controller.abort，并在 then/catch 写入前检查 signal |
| 复验 | 重复操作，台灯请求 cancelled，最终标题和当前输入都为折叠桌 |

若响应是 Vite 的 HTML 页面而不是 JSON，检查 API 前缀和 middleware/代理顺序，不要把 HTML
断言成 `Page<Listing>`。

## 9. 课后题

1. 两个组件各调用一次 `useListings`，是否共享 resource？
2. retry 为什么只增加 revision？
3. Vite middleware 为什么不能作为生产后端？
4. 固定 `demo-csrf` 证明了什么？
5. 单进程中一成功一 409 是否证明数据库并发安全？

**参考答案：**

1. 不共享，每次调用建立独立状态和 watcher。
2. 让同参数依赖变化并重新请求，成功仍来自响应。
3. 它缺少生产认证、持久化、事务、安全和部署能力，且只服务开发进程。
4. 只证明客户端会发送约定 header，不提供不可预测性或会话绑定。
5. 不证明；真实多进程需要数据库事务/唯一约束和并发测试。

## 10. 实践练习

### 基础：页码输入

给 `ServerListPage` 增加 `page` ref 并传给 `useListings`。

**答案标准：**页码最小为 1；参数用 URLSearchParams；翻页触发新请求并取消旧请求。

### 进阶：Composable 竞态测试

用两个可控 Promise 模拟慢旧请求和快新请求。

**答案标准：**先完成新请求，再完成旧请求，最终 resource 仍是新查询；测试不使用任意 sleep。

### 故障注入：移除 `response.ok`

临时让 helper 返回 503 JSON。

**答案标准：**复现错误体冒充成功体；恢复后 503 显示 alert，空查询仍显示 empty。

## 11. 阶段验收

- [ ] `useListings` 支持值/ref/getter，返回响应式 resource 和显式 retry。
- [ ] 普通、empty、503、retry 和慢请求竞争路径均有证据。
- [ ] API 提供列表、详情、登录/退出、发布/编辑、收藏和预约最小协议。
- [ ] 金额写入检查整数分，时间生成 UTC ISO 8601。
- [ ] 页面和正文都标明内存、教学 cookie/CSRF、无事务和回环边界。
- [ ] 真实凭据、Cookie 值和密码未进入日志。
- [ ] `vue-tsc`、测试、构建和代表性 Chromium 路径通过。

## 12. 常见问题

**为什么本课 middleware 写了后续接口？**

第 4 章需要在同一协议上演示登录、发布和预约。集中一份教学 API 可避免多个漂移副本。

**为什么不在 composable 加防抖？**

本课要清楚观察取消。产品可按需求增加防抖，但防抖不能替代取消和过期守卫。

**真实后端接入时保留 `demo-csrf` 吗？**

不保留固定值。改为服务端签发、绑定会话的方案，并按真实契约取值和轮换。

**请求取消后需要显示错误吗？**

不需要。取消是参数失效的内部控制流，不是用户可恢复故障。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [Vue：Composables](https://vuejs.org/guide/reusability/composables.html)
- [Vue：`toValue`](https://vuejs.org/api/reactivity-utilities.html#tovalue)
- [Vue：Watchers](https://vuejs.org/guide/essentials/watchers.html)
- [Vite：插件 API](https://vite.dev/guide/api-plugin.html)
- [Vite：开发服务器配置](https://vite.dev/config/server-options.html)
- [邻里集市项目契约](../../00-guide/project-contract.md)

## 我现在能做到什么

我能把请求生命周期提取为 composable，能运行并审计本机教学 API，也能阻止旧读结果覆盖当前查询，
同时不把教学模拟描述成生产能力。

## 单元导航

[上一课：HTTP 错误与取消](02-fetch-http-abort-resource-state.md) ·
[返回章目录](../README.md#第三章生命周期请求竞争与-composable) ·
[下一章：路由、URL 与服务端数据](../04-router-data/01-router-url-state-navigation.md)
