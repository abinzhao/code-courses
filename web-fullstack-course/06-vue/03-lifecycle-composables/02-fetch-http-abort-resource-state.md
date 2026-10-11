# HTTP 错误、取消与资源状态

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 建立统一 HTTP 边界，区分非 2xx、取消、空数据与成功数据 |
| 可观察产出 | `api.ts`、`resource.ts`、HTTP 测试和 `ListingRequestProbe.vue` |
| 运行条件 | 浏览器 Fetch/AbortController、Node 测试环境、上一课 watcher 模式 |
| 建议时间 | 120 分钟 |
| 完成证据 | 200/503 测试、取消证据、快速搜索最终结果和错误诊断 |

## 1. 任务背景

`fetch` 只在网络层失败时 reject；服务器返回 404 或 503 时 Promise 仍会 resolve。如果直接
`await response.json()` 并把结果当商品页，错误体可能被误显示为空列表。

快速搜索还会并发多个请求：先发出的慢请求可能后完成，覆盖用户当前输入。本课用
`AbortController` 取消旧读请求，并在提交状态前检查 signal，建立双重过期保护。

## 2. 学习目标

完成后你应能：

1. 区分 transport failure、HTTP failure、解析失败和业务空数据；
2. 检查 `response.ok`，保留 status/code/requestId；
3. 解释泛型 `api<T>` 只是静态承诺，不是 JSON 运行时校验；
4. 使用同源 HttpOnly Cookie 而不在浏览器持久化凭据；
5. 说明教学 CSRF 标记的局限；
6. 设计互斥的 loading/error/success 联合；
7. 取消旧读请求并忽略过期回调；
8. 解释取消不等于服务器事务回滚。

## 3. 预备知识

先完成[生命周期与同步清理](01-lifecycle-watch-cleanup.md)。需要理解 HTTP 状态语义：

- 401：没有有效身份；
- 403：身份已知但无权操作，或教学 CSRF 检查失败；
- 404：资源不存在；
- 409：当前状态冲突；
- 400：输入无法按业务规则处理；
- 503：服务暂不可用。

错误状态不是空数组。用户恢复行为和日志定位依赖这些差异。

## 4. 核心理论

### 4.1 四层失败

```text
fetch reject
  → DNS/连接/浏览器策略/主动 abort 等 transport 结果
fetch resolve + !response.ok
  → 401/403/404/409/400/503 等 HTTP 失败
response body 不是预期 JSON
  → 协议或代理配置失败
2xx JSON 字段不符合契约
  → 运行时 schema 失败
```

本课 helper 处理前三层的通用形状，但成功体仍使用泛型断言。生产 API 适配层必须对外部 JSON
执行运行时解析；TypeScript 类型不能改变收到的字节。

### 4.2 同源 Cookie 与 CSRF

主线会话使用同源 HttpOnly Cookie。浏览器自动发送 Cookie，前端 JavaScript 不读取、不复制到
localStorage。自动发送凭据意味着写请求需要 CSRF 防护。

本地 API 使用固定 `demo-csrf` 仅为展示 header 协议。生产 token 必须不可预测、绑定会话，
并结合 SameSite、Origin/Referer 检查和 HTTPS。CORS、CSRF、Cookie 与授权解决不同问题。

### 4.3 资源联合防止不可能组合

不要维护四个互相矛盾的布尔值：

```text
isLoading=true + error存在 + data存在
```

使用可辨识联合后，每个状态只暴露合法字段。成功且 items 为空就是 empty，不是 error。

### 4.4 取消与过期守卫

watcher 每次执行创建 controller，并同步注册 `abort()`。新参数到来时上一轮 signal 变为
aborted。catch 中忽略 AbortError，then/catch 写状态前再检查 signal。

取消尽量停止客户端等待，但请求可能已经到达服务器。读请求可安全重新发起；写请求是否可重试
取决于幂等性、请求 ID、事务和冲突策略。

### 4.5 `shallowRef` 保存服务器快照

列表响应作为整体替换的服务器快照，不需要递归代理每个字段，可放在 `shallowRef` 中。
更新时必须替换 `.value` 根对象。若在内部直接修改 `resource.value.data.items`，浅层 ref
不会因深层写入自动触发更新。

## 5. 元素、属性、API 或配置清单

| API | 作用 | 关键边界 |
| --- | --- | --- |
| `fetch` | 发起 HTTP 请求 | 非 2xx 不自动 reject |
| `Response.ok` | 判断 200-299 | 仍需解析响应体 |
| `Headers` | 规范化请求头 | 不记录 Cookie/密码 |
| `credentials: 'same-origin'` | 同源发送 Cookie | HttpOnly 值不可由 JS 读取 |
| `AbortController` | 发出取消信号 | 不保证服务器回滚 |
| `AbortSignal.aborted` | 检查结果是否过期 | 写状态前再次检查 |
| `URLSearchParams` | 正确编码查询 | 不手工拼接用户文本 |
| `shallowRef` | 保存整体替换快照 | 深层写入不触发根替换 |
| `ApiError` | 保留稳定错误信息 | 不暴露服务端堆栈 |

## 6. 最小可运行案例

### 6.1 HTTP helper

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/api.ts`**

```ts
export type ApiErrorBody = {
  code: string
  message: string
  requestId: string
  details?: unknown
}

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string
  readonly details?: unknown

  constructor(
    status: number,
    code: string,
    message: string,
    requestId: string,
    details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.details = details
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readErrorBody(value: unknown): ApiErrorBody | null {
  if (!isRecord(value)) return null
  if (
    typeof value.code !== 'string'
    || typeof value.message !== 'string'
    || typeof value.requestId !== 'string'
  ) {
    return null
  }
  return {
    code: value.code,
    message: value.message,
    requestId: value.requestId,
    details: value.details,
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  fetcher: FetchLike = fetch,
): Promise<T> {
  if (!path.startsWith('/')) {
    throw new TypeError('API path 必须以 / 开头')
  }

  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (!['GET', 'HEAD'].includes(method) && !headers.has('X-CSRF-Token')) {
    headers.set('X-CSRF-Token', 'demo-csrf')
  }

  const response = await fetcher(`/api/v1${path}`, {
    ...init,
    method,
    headers,
    credentials: 'same-origin',
  })

  if (response.ok && response.status === 204) {
    return undefined as T
  }

  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new ApiError(
      response.status,
      'INVALID_JSON',
      '服务返回了无法解析的响应。',
      response.headers.get('x-request-id') ?? 'unknown',
    )
  }

  if (!response.ok) {
    const body = readErrorBody(value)
    throw new ApiError(
      response.status,
      body?.code ?? 'HTTP_ERROR',
      body?.message ?? '请求失败。',
      body?.requestId ?? 'unknown',
      body?.details,
    )
  }

  // 泛型只约束调用点；生产边界仍需按 DTO 运行时解析 value。
  return value as T
}
```

### 6.2 资源状态

**完整文件：`apps/vue-web/src/resource.ts`**

```ts
export type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string; statusCode?: number; requestId?: string }
  | { status: 'success'; data: T }
```

### 6.3 HTTP 单元测试

**完整文件：`apps/vue-web/src/api.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { ApiError, api } from './api'
import type { FetchLike } from './api'

describe('http-boundary', () => {
  it('returns successful JSON', async () => {
    const fetcher: FetchLike = async () => new Response(
      JSON.stringify({ items: [], page: 1, pageSize: 20, total: 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )

    await expect(api('/listings', {}, fetcher)).resolves.toMatchObject({
      items: [],
      total: 0,
    })
  })

  it('keeps 503 code and requestId', async () => {
    const fetcher: FetchLike = async () => new Response(JSON.stringify({
      code: 'DEMO_FAILURE',
      message: '演示服务故障。',
      requestId: 'request-503',
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })

    const error = await api('/listings?q=__error', {}, fetcher)
      .catch(reason => reason)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 503,
      code: 'DEMO_FAILURE',
      requestId: 'request-503',
    })
  })

  it('adds the teaching CSRF header to writes', async () => {
    let captured = ''
    const fetcher: FetchLike = async (_input, init) => {
      captured = new Headers(init?.headers).get('X-CSRF-Token') ?? ''
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await api('/auth/login', {
      method: 'POST',
      body: '{}',
    }, fetcher)
    expect(captured).toBe('demo-csrf')
  })
})
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm exec vitest run src/api.test.ts
```

## 7. 邻里集市集成案例

这一版故意把请求写在页面中，下一课再提取 composable。

**完整文件：`apps/vue-web/src/lessons/ListingRequestProbe.vue`**

```vue
<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import ListingCard from '../ListingCard.vue'
import { ApiError, api, isAbortError } from '../api'
import type { Listing, Page } from '../domain'
import type { Resource } from '../resource'

const q = ref('')
const resource = shallowRef<Resource<Page<Listing>>>({ status: 'loading' })

watch(
  q,
  (query, _oldQuery, onCleanup) => {
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    resource.value = { status: 'loading' }

    const params = new URLSearchParams({
      q: query,
      page: '1',
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
        : { status: 'error', message: '网络连接失败。' }
    })
  },
  { immediate: true },
)
</script>

<template>
  <section aria-labelledby="request-probe-title">
    <h2 id="request-probe-title">服务端商品探针</h2>
    <label>
      搜索标题
      <input v-model="q" type="search" />
    </label>

    <p v-if="resource.status === 'loading'" role="status">
      正在加载商品……
    </p>
    <section v-else-if="resource.status === 'error'" role="alert">
      <p>{{ resource.message }}</p>
      <p v-if="resource.requestId">请求编号：{{ resource.requestId }}</p>
    </section>
    <section v-else aria-label="商品列表">
      <p role="status">找到 {{ resource.data.total }} 件商品</p>
      <p v-if="resource.data.items.length === 0">没有匹配商品。</p>
      <ListingCard
        v-for="item in resource.data.items"
        :key="item.id"
        :listing="item"
      />
    </section>
  </section>
</template>
```

配合下一课教学 API，搜索不存在文字得到 `success + items=[]`；搜索 `__error` 得到 503 error。
Network 限速后快速输入不同关键字，旧请求应显示 cancelled，最终页面与当前输入一致。

## 8. 常见错误与排查路径

**明确错误示例：忽略 HTTP 状态。**

**关键片段：`apps/vue-web/src/bad-api.ts`**

```ts
const response = await fetch('/api/v1/listings?q=__error')
return response.json() as Promise<Page<Listing>>
```

503 错误体会被断言成商品页，后续读取 `items` 可能崩溃或被误判为空。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 输入 `__error` 后页面显示“没有匹配商品”或读取 `items` 报错 |
| 证据 | Network 状态为 503，响应体是 `{code,message,requestId}` |
| 原因 | helper 没检查 `response.ok`，类型断言把错误体冒充成功体 |
| 修复 | 非 2xx 抛 `ApiError`，页面进入 error 分支并展示恢复信息 |
| 复验 | `__error` 显示 503 文案；不存在关键字仍显示成功 empty |

若快速搜索最终显示旧关键字，检查 watcher 是否同步注册 abort，以及 then 写状态前是否检查 signal。

## 9. 课后题

1. fetch 在 404 时是否 reject？
2. `api<Page<Listing>>` 能否验证每个字段？
3. empty 和 503 为什么必须分开？
4. HttpOnly Cookie 为什么不放 localStorage？
5. abort 是否证明服务器没有处理请求？

**参考答案：**

1. 通常不会，需检查 `response.ok`。
2. 不能，泛型在运行时不存在。
3. empty 是成功的零结果，503 是服务失败，恢复动作不同。
4. 浏览器自动发送且 JS 不可读，可降低凭据被脚本窃取风险；仍需 CSRF 防护。
5. 不能，请求可能已到达服务器并产生效果。

## 10. 实践练习

### 基础：处理 204

给 fake fetch 返回 204，验证 `api<void>` 返回 `undefined`。

**答案标准：**只在 `response.ok && status === 204` 时走该分支。

### 进阶：运行时解析列表页

为 Page 顶层字段写最小 parser，拒绝 `items: null` 和负 total。

**答案标准：**输入类型为 unknown；逐字段检查；失败产生可定位协议错误，不能直接 `as Page`。

### 故障注入：删除过期守卫

保留 abort 但删除 then 中的 `!signal.aborted`，用不能及时取消的 fake fetch 测试。

**答案标准：**复现旧结果覆盖，再恢复写入前守卫；说明两道保护解决不同实现差异。

## 11. 阶段验收

- [ ] 成功、503 和写请求 header 测试通过。
- [ ] 错误保留 status、code、requestId，不显示堆栈。
- [ ] loading/error/success 互斥，empty 属于 success。
- [ ] 快速搜索最终结果属于当前关键字。
- [ ] 取消结果不显示为用户错误。
- [ ] 能说明泛型、Cookie、CSRF 和取消边界。
- [ ] `pnpm typecheck`、测试与构建通过。

## 12. 常见问题

**所有 GET 都应自动重试吗？**

不一定。需要退避、上限、在线状态和用户意图。本章提供显式重试，下一课实现。

**为什么固定 CSRF header 还保留？**

只为展示客户端协议接线；页面和文档必须同时标注它不是安全 token。

**CORS 配置能替代 CSRF 吗？**

不能。CORS 控制浏览器跨源读取/部分请求，CSRF 防止借用户凭据伪造写操作。

**为什么 shallowRef 不递归代理？**

服务器页作为不可变快照整体替换即可，减少不必要代理，也让写入边界更清楚。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [MDN：Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
- [MDN：Response.ok](https://developer.mozilla.org/en-US/docs/Web/API/Response/ok)
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [Vue：`shallowRef`](https://vuejs.org/api/reactivity-advanced.html#shallowref)
- [OWASP：CSRF 防护](https://owasp.org/www-community/attacks/csrf)

## 我现在能做到什么

我能把 HTTP 非 2xx 与空数据分开，保留可诊断错误信息，并通过取消和过期守卫阻止旧读结果覆盖当前页面。

## 单元导航

[上一课：生命周期与清理](01-lifecycle-watch-cleanup.md) ·
[返回章目录](../README.md#第三章生命周期请求竞争与-composable) ·
[下一课：Composable、重试与教学 API](03-composables-local-api-retry.md)
