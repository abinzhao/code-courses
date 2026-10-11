# HTTP 边界、请求取消与资源状态

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 带运行时解析、HTTP 错误、Abort 与互斥资源状态的数据层 |
| 建议时间 | 150 分钟 |
| 核心场景 | 快速搜索时旧响应不能覆盖新关键字 |
| 错误边界 | 503 是 error，200 空数组才是 empty |
| 完成证据 | parser 测试通过；慢旧请求被忽略；requestId 可追踪 |

泛型 `response.json() as T` 只是在编译器前做断言。本课把 HTTP JSON 先当作 `unknown`，在端点适配器中检查关键字段。

## 1. 任务背景

用户先输入“台”，立即改成“台灯”。第一个请求可能更慢并最后返回；如果页面无条件接收，它会用旧结果覆盖当前搜索。HTTP 404/503 也不会让 `fetch` 自动 reject，错误体可能被错误地当成成功分页。

邻里集市还要求错误形状 `{code,message,requestId,details?}`，以便用户得到恢复文案，开发者用 requestId 关联服务端日志。

## 2. 学习目标

- 区分传输失败、HTTP 失败、解析失败与业务空结果。
- 检查 `response.ok`，保留 status、code、requestId。
- 将外部 JSON 作为 `unknown` 运行时解析。
- 同源请求使用 Cookie 但不读取 HttpOnly 凭据。
- 用 `AbortController` 取消过期 GET。
- 用 discriminated union 表达 loading/error/success。
- 让 success-empty 与 error 走不同 UI。
- 解释 CSRF、CORS、Cookie 与授权的不同职责。

## 3. 预备知识

本课依赖完整 `Listing` 与 `Page<T>` 类型、上一课 Effect 生命周期和 Vitest。

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm test
pnpm typecheck
```

浏览器 `fetch` 由 DOM lib 提供。Node 单测只测试纯 parser，不发真实网络。

## 4. 核心理论

### 4.1 fetch 只对部分失败 reject

DNS、连接中断、Abort 等会 reject；HTTP 404/503 仍返回 `Response`。必须检查 `response.ok`。错误响应也可能不是合法 JSON，因此解析失败需要独立错误。

### 4.2 外部数据从 unknown 开始

TypeScript 类型在浏览器运行时不存在。`as Page<Listing>` 不检查 `priceCents` 是否整数、时间是否 UTC、status 是否受控。端点 parser 应拒绝无效响应，避免错误数据深入 UI。

本课 parser 是教学实现，覆盖共享字段和数值边界。大型系统可复用成熟 schema 库，但不能把安装库本身当成已验证所有契约。

### 4.3 资源状态互斥

```ts
type Resource<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T }
```

empty 是 `success` 且 `items.length === 0`。如果 catch 返回空数组，服务故障会被误报成“暂无商品”。

### 4.4 Cookie、CSRF、CORS 与授权

同源 HttpOnly Cookie 由浏览器自动发送，前端代码不能读取凭据。自动携带 Cookie 意味着写请求需要 CSRF 防护；本章 `demo-csrf` 只是教学标记，不是生产 token。

CORS 管跨源浏览器读取权限，不能替代认证、CSRF 或对象授权。隐藏按钮同样不能阻止攻击者直接发请求。

## 5. 元素、属性、API 或配置清单

| API / 类型 | 用途 | 边界 |
| --- | --- | --- |
| `fetch` | 发 HTTP 请求 | 404/503 不自动 reject |
| `Response.ok` | 判断 2xx 成功 | 仍需解析响应体 |
| `AbortController` | 取消过期客户端工作 | 不回滚服务端写入 |
| `AbortSignal` | 传递取消 | loader 也会提供 signal |
| `Headers` | 合并调用方与默认头 | 不放浏览器秘密 |
| `credentials: same-origin` | 同源自动发送 Cookie | JS 不读取 HttpOnly Cookie |
| `URLSearchParams` | 正确编码 q/page | 不手拼 `&` |
| `unknown` | 外部数据起点 | 解析后才成为领域类型 |
| `ApiError` | 保存 status/code/requestId | 不包含堆栈或密钥给用户 |
| discriminated union | 资源 UI 分支 | empty 属于 success |

## 6. 最小可运行案例

先用可控延迟模拟请求，观察旧结果被取消：

**完整文件：`apps/react-web/src/examples/AbortResourceDemo.tsx`**

```tsx
import { useEffect, useState } from 'react'

type Resource =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; items: string[] }

function fakeSearch(q: string, signal: AbortSignal): Promise<string[]> {
  const delay = q === '台' ? 800 : 150
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      if (q === '__error') reject(new Error('演示服务故障'))
      else resolve(q ? [`结果：${q}`] : ['九成新台灯', '折叠桌'])
    }, delay)
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

export default function AbortResourceDemo() {
  const [q, setQ] = useState('')
  const [resource, setResource] = useState<Resource>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    setResource({ status: 'loading' })
    fakeSearch(q, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setResource({ status: 'success', items })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResource({
            status: 'error',
            message: error instanceof Error ? error.message : '未知错误',
          })
        }
      })
    return () => controller.abort()
  }, [q])

  return (
    <main>
      <h1>请求竞态实验</h1>
      <label htmlFor="abort-q">关键字</label>
      <input id="abort-q" value={q}
        onChange={(event) => setQ(event.target.value)} />
      {resource.status === 'loading' && <p role="status">加载中……</p>}
      {resource.status === 'error' && <p role="alert">{resource.message}</p>}
      {resource.status === 'success' && (
        resource.items.length === 0
          ? <p>没有匹配商品。</p>
          : <p role="status">{resource.items.join('，')}</p>
      )}
    </main>
  )
}
```

先输入“台”，立即补成“台灯”。预期最终只显示“结果：台灯”。输入 `__error` 显示 alert，不能显示 empty。

## 7. 邻里集市集成案例

### HTTP 与运行时 parser

**完整文件：`apps/react-web/src/api.ts`**

```ts
import type { ApiErrorBody, Listing, Page } from './domain'

type Parser<T> = (value: unknown) => T

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isListingStatus(value: unknown): value is Listing['status'] {
  return value === 'available' || value === 'reserved' || value === 'sold'
}

function isUtcIso(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.valueOf()) && date.toISOString() === value
}

export function parseListing(value: unknown): Listing {
  if (!isRecord(value)) throw new Error('商品必须是对象。')
  if (
    typeof value.id !== 'string'
    || typeof value.title !== 'string'
    || typeof value.description !== 'string'
    || typeof value.priceCents !== 'number'
    || !Number.isSafeInteger(value.priceCents)
    || value.priceCents < 0
    || value.priceCents > 100_000_000
    || !isListingStatus(value.status)
    || typeof value.ownerId !== 'string'
    || typeof value.version !== 'number'
    || !Number.isSafeInteger(value.version)
    || value.version < 1
    || typeof value.createdAt !== 'string'
    || !isUtcIso(value.createdAt)
  ) {
    throw new Error('商品响应不符合领域契约。')
  }
  return {
    id: value.id,
    title: value.title,
    description: value.description,
    priceCents: value.priceCents,
    status: value.status,
    ownerId: value.ownerId,
    version: value.version,
    createdAt: value.createdAt,
  }
}

export function parseListingPage(value: unknown): Page<Listing> {
  if (
    !isRecord(value)
    || !Array.isArray(value.items)
    || typeof value.page !== 'number'
    || !Number.isSafeInteger(value.page)
    || value.page < 1
    || typeof value.pageSize !== 'number'
    || !Number.isSafeInteger(value.pageSize)
    || value.pageSize < 1
    || typeof value.total !== 'number'
    || !Number.isSafeInteger(value.total)
    || value.total < 0
  ) {
    throw new Error('分页响应不符合契约。')
  }
  return {
    items: value.items.map(parseListing),
    page: value.page,
    pageSize: value.pageSize,
    total: value.total,
  }
}

function parseErrorBody(value: unknown): ApiErrorBody {
  if (
    isRecord(value)
    && typeof value.code === 'string'
    && typeof value.message === 'string'
    && typeof value.requestId === 'string'
  ) {
    return {
      code: value.code,
      message: value.message,
      requestId: value.requestId,
      details: value.details,
    }
  }
  return {
    code: 'INVALID_ERROR_RESPONSE',
    message: '服务返回了无法识别的错误。',
    requestId: 'unknown',
  }
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function request<T>(
  path: string,
  parse: Parser<T>,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  const method = (init.method ?? 'GET').toUpperCase()
  if (init.body) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD'].includes(method)) {
    headers.set('X-CSRF-Token', 'demo-csrf')
  }

  const response = await fetch(`/api/v1${path}`, {
    ...init,
    method,
    headers,
    credentials: 'same-origin',
  })

  let value: unknown
  try {
    value = await response.json()
  } catch {
    throw new ApiError(
      response.status || 502,
      'INVALID_JSON',
      '服务返回的不是合法 JSON。',
      response.headers.get('x-request-id') ?? 'unknown',
    )
  }

  if (!response.ok) {
    const error = parseErrorBody(value)
    throw new ApiError(
      response.status,
      error.code,
      error.message,
      error.requestId,
    )
  }

  try {
    return parse(value)
  } catch {
    throw new ApiError(
      502,
      'INVALID_RESPONSE',
      '服务响应不符合客户端契约。',
      response.headers.get('x-request-id') ?? 'unknown',
    )
  }
}
```

### 可取消的自定义 Hook

**完整文件：`apps/react-web/src/useListings.ts`**

```ts
import { useEffect, useState } from 'react'
import { ApiError, parseListingPage, request } from './api'
import type { Listing, Page } from './domain'

export type Resource<T> =
  | { status: 'loading' }
  | {
      status: 'error'
      message: string
      code: string
      requestId: string
    }
  | { status: 'success'; data: T }

export function useListings(q: string, revision = 0) {
  const [resource, setResource] = useState<Resource<Page<Listing>>>({
    status: 'loading',
  })

  useEffect(() => {
    const controller = new AbortController()
    const search = new URLSearchParams({
      q,
      page: '1',
      pageSize: '20',
    })
    setResource({ status: 'loading' })

    request(`/listings?${search}`, parseListingPage, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted) {
          setResource({ status: 'success', data })
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiError) {
          setResource({
            status: 'error',
            message: error.message,
            code: error.code,
            requestId: error.requestId,
          })
        } else {
          setResource({
            status: 'error',
            message: '网络连接失败，请检查连接后重试。',
            code: 'NETWORK_ERROR',
            requestId: 'unavailable',
          })
        }
      })

    return () => controller.abort()
  }, [q, revision])

  return resource
}
```

`revision` 是显式重试输入；Hook 不把内部 setter 暴露给调用者。每次调用 Hook 都有独立状态和请求，它不是共享缓存。

## 8. 常见错误与排查路径

### 明确错误：把所有失败变成空列表

```ts
fetch(url)
  .then((response) => response.json())
  .catch(() => ({ items: [], page: 1, pageSize: 20, total: 0 }))
```

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | 输入 `__error` 时页面显示“没有匹配商品” |
| 证据 | Network 返回 503 和 `DEMO_FAILURE`，UI 却进入 success-empty |
| 原因 | catch 伪造了成功分页，且未检查 `response.ok` |
| 修复 | 503 转成 `ApiError`，resource 进入 error；只有 200 空 items 才显示 empty |
| 复验 | `__error` 显示 alert/requestId，未知正常关键字显示 empty，改回“台灯”恢复 |

其他错误：

- `return value as T`：加入端点 parser。
- 只 abort 不检查 signal：保留双重保护，防止已完成 Promise 写旧状态。
- 在 Console 输出 Cookie/CSRF：删除敏感日志；HttpOnly Cookie 本就不应被读取。
- 跨源 credentials 配 `Access-Control-Allow-Origin: *`：使用准确 Origin，并说明仍需 CSRF 与授权。

## 9. 课后题

1. 为什么 404 不会自动进入 fetch catch？
2. 空数组与 503 的 UI 为什么必须不同？
3. Abort 能否证明服务端没执行请求？
4. `as Page<Listing>` 为什么不是运行时校验？

参考答案：

1. fetch 将 HTTP 响应视为成功传输，需检查 `response.ok`。
2. 空数组是有效业务结果；503 是服务故障，需要恢复入口和追踪信息。
3. 不能。请求可能已经到达服务端，Abort 只管理客户端生命周期。
4. 类型断言编译后消失，不检查实际 JSON。

## 10. 实践练习

### 基础

为 parser 添加测试：`priceCents: 35.5`、非 UTC 时间和未知 status 均抛错。完成标准：合法 fixture 仍通过。

### 进阶

让错误 UI 显示 `code` 和 `requestId`，但不显示堆栈、Cookie 或请求头。完成标准：重试保留 q，只递增 revision。

### 故障注入

临时删除 `response.ok` 分支，输入 `__error` 观察 parser 失败，再恢复。完成标准：最终 503 仍保留原 status/code/requestId，而不是统一 502。

答案判定：parser 测试可判定；错误信息可恢复且不泄密；竞态最终结果属于最新 q。

## 11. 阶段验收

- [ ] 外部 JSON 从 `unknown` 解析。
- [ ] priceCents、status、version、UTC 时间有运行时检查。
- [ ] HTTP 非 2xx 转为 `ApiError`。
- [ ] 503、空结果、网络失败和 Abort 行为可区分。
- [ ] 快速搜索的最终结果始终属于最新 q。
- [ ] requestId 可见但凭据不输出。
- [ ] Cookie、CSRF、CORS、授权职责没有混用。
- [ ] parser 测试、typecheck、build 退出 0。

## 12. 常见问题

**为什么 parser 失败使用 502？**<br>
客户端从上游收到了不符合契约的成功响应，可视为网关/上游契约故障；它不是业务空数据。

**所有 GET 都应放自定义 Hook 吗？**<br>
不。第 4 章路由数据由 loader 拥有，避免 Hook 与 loader 重复请求。

**`demo-csrf` 能用于生产吗？**<br>
不能。它是公开固定字符串，仅演示请求头位置；真实 token 需不可预测并与会话/请求来源校验结合。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**。

- [MDN：Using Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN：Response.ok](https://developer.mozilla.org/en-US/docs/Web/API/Response/ok)
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [React：useEffect](https://react.dev/reference/react/useEffect)
- [TypeScript：unknown](https://www.typescriptlang.org/docs/handbook/2/functions.html#unknown)
- [OWASP：CSRF Prevention Cheat Sheet](https://owasp.org/www-community/attacks/csrf)

## 我现在能做到什么

我能把 HTTP、JSON 解析、错误追踪和请求生命周期分层，让空数据、服务失败和过期响应在 UI 中保持真实。

## 单元导航

[上一课：Effect 生命周期](01-effects-lifecycle-cleanup-strict-mode.md) · [返回章目录](../README.md#第三章effecthttp-与自定义-hook) · [下一课：自定义 Hook、本机 API 与重试](03-custom-hooks-local-api-retry.md)
