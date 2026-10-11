# 流式渲染、Nuxt 边界与邻里集市最终验收

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | Vue 1–7 章、前两课 SSR 契约 |
| 输入 | 完整依赖快照、公开列表、会话/收藏/预约意图 |
| 输出 | 本卷唯一完整 SPA + SSR 项目快照与验收矩阵 |
| 重建 | 全新 `/tmp/full-course-verification-batch-c-vue.*` |
| 验证 | lint、vue-tsc、Vitest、build、SSR、Chromium |
| 边界 | Nuxt、生产双构建、真实后端、部署、负载均不伪装已完成 |

## 1. 任务背景

前七章分别建立组件、表单、请求、路由、Pinia、测试和进阶交互。本课不再给零散增量，而是提供唯一可重建快照，把这些责任收敛到一个可运行教学应用。

快照中的 Vite middleware API 是 localhost 内存实现，用于验证浏览器协议与失败状态。它没有数据库事务、生产认证、真实 CSRF、跨进程持久化或部署能力。SSR 也是 Vite middleware 开发服务器，不是生产双构建。

## 2. 学习目标

- 解释字符串 SSR 与流式 SSR 的 shell、错误、断开和超时边界。
- 说明 `onServerPrefetch`、异步组件和 Teleport SSR 的位置约束。
- 判断何时采用 Nuxt，而不是把一个 Vite 实验称为 Nuxt 项目。
- 从唯一快照重建并执行静态、运行时、SSR 与浏览器验证。
- 用同一验收矩阵对齐 Vue 与 React 的业务结果，同时保留框架实现差异。

## 3. 预备知识

验证环境目标为 Node 24 LTS、pnpm 12.11.2。实际运行前必须保存：

```bash
node --version
pnpm --version
```

快照固定直接依赖；首次提取后生成临时锁文件，再执行冻结安装复验。教材仓库本身不创建 package.json、锁文件、依赖或构建产物。

## 4. 核心理论

### 4.1 流式不是自动更快

`renderToNodeStream` 或 `pipeToNodeWritable` 可以先发送 shell，再发送异步片段。响应头一旦发出，后续错误可能无法改成 503，只能在 HTML 中呈现可恢复边界并记录服务器错误。客户端断开时应中止无用上游，整体渲染还要有超时。

选择流式前先测：

- shell 是否足够早且有意义；
- 异步边界是否稳定；
- 搜索引擎和缓存如何处理分块；
- 错误发生在发头前还是发头后；
- 代理/CDN 是否缓冲响应。

本快照用 `renderToString` 保持状态码实验确定；流式作为生产进阶，不虚报已验证。

### 4.2 服务端预取与 Teleport

`onServerPrefetch` 能在组件内等待公开数据，但客户端仍需同一快照，避免 mount 前重复请求。请求级缓存可以去重同一渲染内的读取，不能成为跨用户全局私有缓存。

SSR Teleport 内容写入 render context 的 `teleports`，服务器必须插入与客户端一致的专用容器。把客户端 dialog 直接 Teleport 到 body 而不处理 context，会造成水合位置不一致。

### 4.3 Nuxt 的真实边界

Nuxt 提供文件路由、服务端运行、数据获取、错误页、混合渲染和构建部署整合。采用它能减少自建胶水，但不会自动解决：

- 对象授权、预约事务和数据库唯一约束；
- 公私缓存分类与敏感字段最小化；
- CSRF、CORS、Cookie、CSP 和 TLS 各自职责；
- 上游超时、SSR 资源容量和发布回滚；
- 真实辅助技术、跨浏览器与负载验收。

本卷没有建立 Nuxt 工程，因此只提供迁移决策边界，不声称 Nuxt 已运行。

## 5. 元素、属性、API 或配置清单

| API/配置 | 责任 | 本快照状态 | 生产边界 |
| --- | --- | --- | --- |
| `renderToString` | 确定性完整 SSR | 已使用 | 大页面 TTFB |
| `renderToNodeStream` | Node 分块输出 | 仅讲解 | 发头后错误处理 |
| `onServerPrefetch` | 组件服务端预取 | 仅讲解 | 快照去重/错误 |
| render context `teleports` | 收集 Teleport HTML | 说明插入规则 | 容器必须稳定 |
| `createSSRApp` | 两端 SSR 应用 | 已使用 | 初始输入一致 |
| Nuxt `useAsyncData` 等 | 集成数据边界 | 未运行 | 缓存 key/私有数据 |
| Vite middleware | 本地 API/SSR 实验 | 已使用 | 不是生产服务器 |
| Pinia | 会话与收藏反馈 | 已使用 | 不替代数据库 |
| Playwright | Chromium 主路径 | 已配置 | 不代表全部引擎 |

## 6. 最小可运行案例

流式迁移前先把“何时还能改 HTTP status”写成纯策略。

**完整文件：`apps/vue-web/ssr/stream-policy.ts`**

```ts
export type StreamPhase = 'before-headers' | 'after-headers'

export function recoverStreamFailure(phase: StreamPhase) {
  return phase === 'before-headers'
    ? { status: 503, action: 'render-recovery-document' as const }
    : { status: null, action: 'emit-safe-inline-recovery-and-log' as const }
}
```

**完整文件：`apps/vue-web/ssr/stream-policy.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { recoverStreamFailure } from './stream-policy'

describe('stream failure policy', () => {
  it('发头前仍能返回 503', () => {
    expect(recoverStreamFailure('before-headers')).toEqual({
      status: 503,
      action: 'render-recovery-document',
    })
  })

  it('发头后不能伪造新的 HTTP 状态', () => {
    expect(recoverStreamFailure('after-headers').status).toBeNull()
  })
})
```

这不是流式实现，而是先固定不可逆边界。下一步只有在真实代理与中止测试可用时才替换 `renderToString`。

高级 SSR 能力先通过采用门禁，而不是看到 API 名称就写进最终快照：

**完整文件：`apps/vue-web/ssr/advanced-boundary.ts`**

```ts
export type AdvancedBoundaryInput = {
  serverPrefetchSettled: boolean
  teleportTargetInTemplate: boolean
  asyncFallbackMatchesServer: boolean
}

export function assessAdvancedBoundary(input: AdvancedBoundaryInput) {
  const missing = [
    !input.serverPrefetchSettled && 'server prefetch 未完成',
    !input.teleportTargetInTemplate && 'Teleport 目标不在服务端模板',
    !input.asyncFallbackMatchesServer && '异步 fallback 与首帧不一致',
  ].filter((item): item is string => typeof item === 'string')

  return {
    ready: missing.length === 0,
    missing,
  }
}
```

**完整文件：`apps/vue-web/ssr/advanced-boundary.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { assessAdvancedBoundary } from './advanced-boundary'

describe('advanced SSR adoption boundary', () => {
  it('三项证据齐全才允许进入实现阶段', () => {
    expect(assessAdvancedBoundary({
      serverPrefetchSettled: true,
      teleportTargetInTemplate: true,
      asyncFallbackMatchesServer: true,
    })).toEqual({ ready: true, missing: [] })
  })

  it.each([
    ['serverPrefetchSettled', 'server prefetch 未完成'],
    ['teleportTargetInTemplate', 'Teleport 目标不在服务端模板'],
    ['asyncFallbackMatchesServer', '异步 fallback 与首帧不一致'],
  ] as const)('%s 缺失时拒绝采用', (field, message) => {
    const input = {
      serverPrefetchSettled: true,
      teleportTargetInTemplate: true,
      asyncFallbackMatchesServer: true,
      [field]: false,
    }
    expect(assessAdvancedBoundary(input)).toEqual({
      ready: false,
      missing: [message],
    })
  })
})
```

三项全 `true` 时才得到 `{ ready: true, missing: [] }`；任一项为 `false` 都由实际测试锁定具体缺口。它验证的是采用条件，不是 Teleport 或异步组件已经进入应用。

## 7. 邻里集市集成案例

以下是本卷唯一完整最终项目快照。每个“完整文件”路径只能出现一次。

本快照继续使用 `renderToString`，没有接入 `onServerPrefetch` 数据链、SSR Teleport 或异步组件水合。迁移前必须先让 `assessAdvancedBoundary` 通过，再在独立分支验证 render context 中的 Teleport 容器、服务端与客户端 fallback 一致性以及错误/中止路径；本课不把设计说明写成已完成能力。

### 7.1 工具链与入口

**完整文件：`apps/vue-web/package.json`**

```json
{
  "name": "neighborhood-market-vue",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "vue-tsc --noEmit -p tsconfig.json",
    "test": "vitest run",
    "build": "vite build",
    "e2e": "playwright test",
    "ssr": "node ssr/server.mjs"
  },
  "dependencies": {
    "@vue/server-renderer": "3.5.43",
    "pinia": "4.0.3",
    "vue": "3.5.43",
    "vue-router": "5.3.1"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@playwright/test": "1.64.0",
    "@types/node": "24.19.2",
    "@vitejs/plugin-vue": "6.0.10",
    "@vue/test-utils": "2.5.1",
    "eslint": "10.12.0",
    "eslint-plugin-vue": "10.11.1",
    "globals": "17.13.0",
    "jsdom": "30.1.1",
    "typescript": "npm:@typescript/typescript6@6.0.2",
    "typescript-eslint": "8.71.1",
    "vite": "8.3.4",
    "vitest": "5.0.3",
    "vue-eslint-parser": "10.4.1",
    "vue-tsc": "3.3.13"
  }
}
```

**完整文件：`apps/vue-web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "allowImportingTsExtensions": true,
    "types": ["vite/client", "node"]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.vue",
    "e2e/**/*.ts",
    "ssr/**/*.ts",
    "ssr/**/*.vue",
    "*.config.ts"
  ]
}
```

**完整文件：`apps/vue-web/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>邻里集市 Vue</title>
  </head>
  <body>
    <div id="app"></div>
    <div id="overlays"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**完整文件：`apps/vue-web/eslint.config.mjs`**

```js
import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

export default defineConfig([
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.vue'],
    extends: [vue.configs['flat/essential'], tseslint.configs.recommended],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
])
```

**完整文件：`apps/vue-web/vitest.config.ts`**

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'ssr/**/*.test.ts'],
    restoreMocks: true,
    clearMocks: true,
  },
})
```

**完整文件：`apps/vue-web/playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174/listings',
    reuseExistingServer: false,
    timeout: 120000,
  },
})
```

### 7.2 本机教学 API

**完整文件：`apps/vue-web/vite.config.ts`**

```ts
import type { IncomingMessage, ServerResponse } from 'node:http'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import type { Listing } from './src/domain.ts'

const initialListings: Listing[] = [
  {
    id: 'lamp-1',
    title: '九成新台灯',
    description: '暖光，可现场验货。',
    priceCents: 3500,
    status: 'available',
    ownerId: 'seller-1',
    version: 1,
    createdAt: '2026-10-10T08:00:00.000Z',
  },
  {
    id: 'desk-1',
    title: '折叠桌',
    description: '已被预约，用于状态示例。',
    priceCents: 8000,
    status: 'reserved',
    ownerId: 'seller-2',
    version: 2,
    createdAt: '2026-10-09T08:00:00.000Z',
  },
]

function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', chunk => chunks.push(Buffer.from(chunk)))
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8')
        resolve(text ? JSON.parse(text) as Record<string, unknown> : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

function send(
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  })
  res.end(JSON.stringify(body))
}

function errorBody(code: string, message: string) {
  return { code, message, requestId: 'demo-request-id' }
}

function hasSession(req: IncomingMessage) {
  return (req.headers.cookie ?? '')
    .split(';')
    .some(part => part.trim() === 'demo_session=1')
}

function teachingApi(): Plugin {
  let listings = structuredClone(initialListings)
  const reservations = new Set<string>()
  const favorites = new Set<string>()
  let nextId = 1

  return {
    name: 'neighborhood-market-teaching-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://127.0.0.1')
        if (!url.pathname.startsWith('/api/v1/')) {
          next()
          return
        }

        try {
          const path = url.pathname.slice('/api/v1'.length)
          if (
            req.method !== 'GET' &&
            req.headers['x-csrf-token'] !== 'demo-csrf'
          ) {
            send(res, 403, errorBody('CSRF', '缺少教学 CSRF 标记。'))
            return
          }
          if (req.method === 'GET' && path === '/listings') {
            const q = url.searchParams.get('q') ?? ''
            if (q === '__error') {
              send(res, 503, errorBody('SERVICE_UNAVAILABLE', '演示服务故障。'))
              return
            }
            const pageText = url.searchParams.get('page') ?? '1'
            const pageSizeText = url.searchParams.get('pageSize') ?? '20'
            const requestedPage =
              /^[1-9]\d*$/.test(pageText) ? Number(pageText) : 1
            const pageSize = /^[1-9]\d*$/.test(pageSizeText)
              ? Math.min(100, Number(pageSizeText))
              : 20
            const items = listings.filter(item => item.title.includes(q))
            const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
            const page = Math.min(requestedPage, pageCount)
            send(res, 200, {
              items: items.slice((page - 1) * pageSize, page * pageSize),
              page,
              pageSize,
              total: items.length,
            })
            return
          }

          const detail = /^\/listings\/([^/]+)$/.exec(path)
          if (req.method === 'GET' && detail) {
            const listing = listings.find(item => item.id === decodeURIComponent(detail[1]!))
            if (!listing) {
              send(res, 404, errorBody('NOT_FOUND', '商品不存在。'))
              return
            }
            send(res, 200, listing)
            return
          }

          if (req.method === 'POST' && path === '/auth/login') {
            send(res, 200, { id: 'demo-buyer', name: '演示居民' }, {
              'Set-Cookie': 'demo_session=1; HttpOnly; SameSite=Lax; Path=/',
            })
            return
          }

          if (req.method === 'GET' && path === '/auth/me') {
            if (!hasSession(req)) {
              send(res, 401, errorBody('UNAUTHENTICATED', '请先登录。'))
              return
            }
            send(res, 200, { id: 'demo-buyer', name: '演示居民' })
            return
          }

          if (req.method === 'POST' && path === '/auth/logout') {
            send(res, 204, null, {
              'Set-Cookie': 'demo_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
            })
            return
          }

          if (req.method === 'POST' && path === '/listings') {
            if (!hasSession(req)) {
              send(res, 401, errorBody('UNAUTHENTICATED', '请先登录。'))
              return
            }
            const body = await readJson(req)
            const title = typeof body.title === 'string' ? body.title.trim() : ''
            const description =
              typeof body.description === 'string' ? body.description.trim() : ''
            const priceCents = body.priceCents
            if (title === '__error') {
              send(res, 503, errorBody('SERVICE_UNAVAILABLE', '发布服务暂不可用。'))
              return
            }
            if (
              title.length < 2 ||
              description.length < 5 ||
              !Number.isSafeInteger(priceCents) ||
              (priceCents as number) < 0 ||
              (priceCents as number) > 100_000_000
            ) {
              send(res, 400, errorBody('VALIDATION', '发布内容不合法。'))
              return
            }
            const listing: Listing = {
              id: `published-${nextId++}`,
              title,
              description,
              priceCents: priceCents as number,
              status: 'available',
              ownerId: 'demo-buyer',
              version: 1,
              createdAt: new Date().toISOString(),
            }
            listings = [listing, ...listings]
            send(res, 201, listing)
            return
          }

          const reservation = /^\/listings\/([^/]+)\/reservations$/.exec(path)
          if (req.method === 'POST' && reservation) {
            if (!hasSession(req)) {
              send(res, 401, errorBody('UNAUTHENTICATED', '请先登录。'))
              return
            }
            const id = decodeURIComponent(reservation[1]!)
            const listing = listings.find(item => item.id === id)
            if (!listing) {
              send(res, 404, errorBody('NOT_FOUND', '商品不存在。'))
              return
            }
            if (listing.ownerId === 'demo-buyer') {
              send(res, 403, errorBody('OBJECT_FORBIDDEN', '不能预约自己的商品。'))
              return
            }
            if (reservations.has(id) || listing.status !== 'available') {
              send(res, 409, errorBody('RESERVATION_CONFLICT', '商品已被预约。'))
              return
            }
            reservations.add(id)
            listing.status = 'reserved'
            listing.version += 1
            send(res, 201, {
              id: `reservation-${id}`,
              listingId: id,
              buyerId: 'demo-buyer',
              status: 'pending',
              createdAt: new Date().toISOString(),
            })
            return
          }

          const favorite = /^\/favorites\/([^/]+)$/.exec(path)
          if (favorite && (req.method === 'PUT' || req.method === 'DELETE')) {
            if (!hasSession(req)) {
              send(res, 401, errorBody('UNAUTHENTICATED', '请先登录。'))
              return
            }
            const id = decodeURIComponent(favorite[1]!)
            if (req.method === 'PUT') favorites.add(id)
            else favorites.delete(id)
            send(res, 200, { listingId: id, favorite: favorites.has(id) })
            return
          }

          send(res, 404, errorBody('NOT_FOUND', '接口不存在。'))
        } catch {
          send(res, 400, errorBody('BAD_REQUEST', '请求格式错误。'))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), teachingApi()],
})
```

### 7.3 领域、请求与 Pinia

**完整文件：`apps/vue-web/src/domain.ts`**

```ts
export type ListingStatus = 'available' | 'reserved' | 'sold'

export interface Listing {
  id: string
  title: string
  description: string
  priceCents: number
  status: ListingStatus
  ownerId: string
  version: number
  createdAt: string
}

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface Reservation {
  id: string
  listingId: string
  buyerId: string
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
}

export interface ListingDraft {
  title: string
  description: string
  price: string
}

const PRICE = /^(0|[1-9]\d{0,6})(?:\.(\d{1,2}))?$/

export function parsePrice(input: string): number | null {
  const value = input.trim()
  const match = PRICE.exec(value)
  if (!match) return null
  const [yuanText, fraction = ''] = value.split('.')
  const cents = Number(yuanText) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents <= 100_000_000 ? cents : null
}

export function money(cents: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(cents / 100)
}
```

**完整文件：`apps/vue-web/src/api.ts`**

```ts
import type { Listing, Page, Reservation } from './domain'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = 'UNKNOWN',
    public readonly requestId = 'unknown',
  ) {
    super(message)
  }
}

export class ResponseValidationError extends Error {}

type RecordValue = Record<string, unknown>

function record(value: unknown, label: string): RecordValue {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ResponseValidationError(`${label} 不是对象。`)
  }
  return value as RecordValue
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new ResponseValidationError(`${label} 不是字符串。`)
  }
  return value
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new ResponseValidationError(`${label} 不是安全整数。`)
  }
  return value as number
}

function nonNegativeInteger(value: unknown, label: string): number {
  const parsed = integer(value, label)
  if (parsed < 0) {
    throw new ResponseValidationError(`${label} 不能为负数。`)
  }
  return parsed
}

function positiveInteger(value: unknown, label: string): number {
  const parsed = integer(value, label)
  if (parsed < 1) {
    throw new ResponseValidationError(`${label} 必须为正整数。`)
  }
  return parsed
}

function utcInstant(value: unknown, label: string): string {
  const parsed = text(value, label)
  const date = new Date(parsed)
  if (Number.isNaN(date.valueOf()) || date.toISOString() !== parsed) {
    throw new ResponseValidationError(`${label} 不是规范 UTC 时间。`)
  }
  return parsed
}

export function parseUser(value: unknown) {
  const data = record(value, '用户响应')
  return { id: text(data.id, 'user.id'), name: text(data.name, 'user.name') }
}

export function parseListing(value: unknown): Listing {
  const data = record(value, '商品响应')
  const status = text(data.status, 'listing.status')
  if (!['available', 'reserved', 'sold'].includes(status)) {
    throw new ResponseValidationError('listing.status 非法。')
  }
  return {
    id: text(data.id, 'listing.id'),
    title: text(data.title, 'listing.title'),
    description: text(data.description, 'listing.description'),
    priceCents: nonNegativeInteger(data.priceCents, 'listing.priceCents'),
    status: status as Listing['status'],
    ownerId: text(data.ownerId, 'listing.ownerId'),
    version: positiveInteger(data.version, 'listing.version'),
    createdAt: utcInstant(data.createdAt, 'listing.createdAt'),
  }
}

export function parseListingPage(value: unknown): Page<Listing> {
  const data = record(value, '分页响应')
  if (!Array.isArray(data.items)) {
    throw new ResponseValidationError('page.items 不是数组。')
  }
  return {
    items: data.items.map(parseListing),
    page: positiveInteger(data.page, 'page.page'),
    pageSize: positiveInteger(data.pageSize, 'page.pageSize'),
    total: nonNegativeInteger(data.total, 'page.total'),
  }
}

export function parseReservation(value: unknown): Reservation {
  const data = record(value, '预约响应')
  const status = text(data.status, 'reservation.status')
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    throw new ResponseValidationError('reservation.status 非法。')
  }
  return {
    id: text(data.id, 'reservation.id'),
    listingId: text(data.listingId, 'reservation.listingId'),
    buyerId: text(data.buyerId, 'reservation.buyerId'),
    status: status as Reservation['status'],
    createdAt: utcInstant(data.createdAt, 'reservation.createdAt'),
  }
}

export function parseAck(value: unknown): RecordValue {
  return record(value, '确认响应')
}

export function parseVoid(value: unknown): void {
  if (value !== null && value !== undefined) {
    throw new ResponseValidationError('空响应包含意外内容。')
  }
}

export async function api<T>(
  path: string,
  parse: (value: unknown) => T,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if ((init.method ?? 'GET').toUpperCase() !== 'GET') {
    headers.set('X-CSRF-Token', 'demo-csrf')
  }
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: 'same-origin',
    headers,
  })
  const text = await response.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) as unknown : null
  } catch {
    throw new ResponseValidationError('响应不是合法 JSON。')
  }
  if (!response.ok) {
    const body = record(data, '错误响应')
    throw new ApiError(
      response.status,
      typeof body.message === 'string'
        ? body.message
        : `请求失败（${response.status}）`,
      typeof body.code === 'string' ? body.code : 'UNKNOWN',
      typeof body.requestId === 'string' ? body.requestId : 'unknown',
    )
  }
  return parse(data)
}
```

**完整文件：`apps/vue-web/src/stores/market.ts`**

```ts
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  api,
  ApiError,
  parseAck,
  parseUser,
  parseVoid,
} from '../api'

export type UserSummary = { id: string; name: string }

export const useMarketStore = defineStore('market', () => {
  const user = ref<UserSummary | null>(null)
  const sessionStatus = ref<'unknown' | 'loading' | 'ready' | 'error'>('unknown')
  const sessionError = ref('')
  const favoriteIds = ref<string[]>([])
  const busyById = ref<Record<string, boolean>>({})
  const epoch = ref(0)
  const favoriteCount = computed(() => favoriteIds.value.length)

  function clearPrivateState() {
    user.value = null
    favoriteIds.value = []
    busyById.value = {}
  }

  function resetClientSession() {
    epoch.value += 1
    clearPrivateState()
  }

  async function loadSession() {
    if (sessionStatus.value === 'loading') return
    const token = epoch.value
    sessionStatus.value = 'loading'
    sessionError.value = ''
    try {
      const result = await api('/auth/me', parseUser)
      if (token !== epoch.value) return
      user.value = result
      sessionStatus.value = 'ready'
    } catch (error) {
      if (token !== epoch.value) return
      if (error instanceof ApiError && error.status === 401) {
        resetClientSession()
        sessionStatus.value = 'ready'
        return
      }
      sessionStatus.value = 'error'
      sessionError.value = error instanceof Error ? error.message : '会话读取失败。'
    }
  }

  async function login() {
    const token = epoch.value + 1
    epoch.value = token
    clearPrivateState()
    sessionStatus.value = 'loading'
    sessionError.value = ''
    try {
      const result = await api('/auth/login', parseUser, {
        method: 'POST',
        body: '{}',
      })
      if (token !== epoch.value) return
      user.value = result
      sessionStatus.value = 'ready'
    } catch (error) {
      if (token !== epoch.value) return
      sessionStatus.value = 'error'
      sessionError.value = error instanceof Error ? error.message : '登录失败。'
      throw error
    }
  }

  async function logout() {
    const token = epoch.value + 1
    epoch.value = token
    sessionStatus.value = 'loading'
    sessionError.value = ''
    try {
      await api('/auth/logout', parseVoid, { method: 'POST', body: '{}' })
      if (token !== epoch.value) return
      clearPrivateState()
      sessionStatus.value = 'ready'
    } catch (error) {
      if (token !== epoch.value) return
      sessionStatus.value = 'error'
      sessionError.value = error instanceof Error ? error.message : '退出失败。'
      throw error
    }
  }

  async function setFavorite(id: string, enabled: boolean) {
    if (!user.value) throw new Error('请先登录。')
    if (busyById.value[id]) return
    const token = epoch.value
    busyById.value = { ...busyById.value, [id]: true }
    try {
      await api(`/favorites/${encodeURIComponent(id)}`, parseAck, {
        method: enabled ? 'PUT' : 'DELETE',
      })
      if (token !== epoch.value) return
      favoriteIds.value = enabled
        ? [...new Set([...favoriteIds.value, id])]
        : favoriteIds.value.filter(value => value !== id)
    } catch (error) {
      if (token !== epoch.value) return
      if (error instanceof ApiError && error.status === 401) {
        resetClientSession()
        sessionStatus.value = 'ready'
      }
      throw error
    } finally {
      if (token === epoch.value) {
        busyById.value = { ...busyById.value, [id]: false }
      }
    }
  }

  return {
    user,
    sessionStatus,
    sessionError,
    favoriteIds,
    busyById,
    epoch,
    favoriteCount,
    loadSession,
    login,
    logout,
    setFavorite,
  }
})
```

### 7.4 路由与界面

**完整文件：`apps/vue-web/src/router.ts`**

```ts
import { nextTick } from 'vue'
import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from 'vue-router'
import MarketPage from './MarketPage.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/listings' },
  { path: '/listings', name: 'listings', component: MarketPage, meta: { title: '商品列表' } },
  { path: '/listings/:id', name: 'detail', component: MarketPage, meta: { title: '商品详情' } },
  { path: '/login', name: 'login', component: MarketPage, meta: { title: '登录' } },
  { path: '/new', name: 'new-listing', component: MarketPage, meta: { title: '发布商品' } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: MarketPage, meta: { title: '页面不存在' } },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.afterEach(async (to, from) => {
  document.title = `${String(to.meta.title ?? '邻里集市')} · 邻里集市`
  if (from.name === undefined || to.path === from.path) return
  await nextTick()
  document.querySelector<HTMLElement>('main h1')?.focus()
})
```

**完整文件：`apps/vue-web/src/App.vue`**

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useMarketStore } from './stores/market'

const store = useMarketStore()
const logoutError = ref('')

onMounted(() => {
  void store.loadSession()
})

async function logout() {
  logoutError.value = ''
  try {
    await store.logout()
  } catch (error) {
    logoutError.value = error instanceof Error ? error.message : '退出失败。'
  }
}
</script>

<template>
  <header>
    <a class="skip-link" href="#main">跳到主要内容</a>
    <nav aria-label="主导航">
      <RouterLink to="/listings">商品</RouterLink>
      <RouterLink to="/new">发布</RouterLink>
      <RouterLink v-if="!store.user" to="/login">登录</RouterLink>
      <button v-else type="button" @click="logout">
        退出 {{ store.user.name }}（收藏 {{ store.favoriteCount }}）
      </button>
    </nav>
    <p v-if="store.sessionStatus === 'loading'" role="status">正在读取会话……</p>
    <p v-if="store.sessionError" role="alert">{{ store.sessionError }}</p>
    <p v-if="logoutError" role="alert">{{ logoutError }}</p>
  </header>
  <RouterView />
</template>
```

**完整文件：`apps/vue-web/src/MarketPage.vue`**

```vue
<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  api,
  ApiError,
  parseListing,
  parseListingPage,
  parseReservation,
} from './api'
import { money, parsePrice } from './domain'
import type { Listing, Page } from './domain'
import { useMarketStore } from './stores/market'

const route = useRoute()
const router = useRouter()
const store = useMarketStore()
const loading = ref(false)
const error = ref('')
const feedback = ref('')
const page = ref<Page<Listing> | null>(null)
const detail = ref<Listing | null>(null)
const searchDraft = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const publish = reactive({ title: '', description: '', price: '' })
const pending = ref(false)
let loadSequence = 0
let activeController: AbortController | null = null

const routeName = computed(() => String(route.name ?? ''))
const selected = computed(() =>
  detail.value ? store.favoriteIds.includes(detail.value.id) : false,
)
const pageCount = computed(() =>
  page.value
    ? Math.max(1, Math.ceil(page.value.total / page.value.pageSize))
    : 1,
)

function pageLocation(pageNumber: number) {
  return {
    name: 'listings',
    query: {
      ...(searchDraft.value ? { q: searchDraft.value } : {}),
      page: String(pageNumber),
    },
  }
}

function message(reason: unknown) {
  return reason instanceof ApiError
    ? `${reason.status} ${reason.code}：${reason.message}（请求 ${reason.requestId}）`
    : reason instanceof Error
      ? reason.message
      : '请求失败。'
}

async function loadRoute() {
  const sequence = ++loadSequence
  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  error.value = ''
  feedback.value = ''
  page.value = null
  detail.value = null
  searchDraft.value = typeof route.query.q === 'string' ? route.query.q : ''
  if (routeName.value !== 'listings' && routeName.value !== 'detail') return
  loading.value = true
  try {
    if (routeName.value === 'listings') {
      const q = typeof route.query.q === 'string' ? route.query.q : ''
      const pageNumber =
        typeof route.query.page === 'string' && /^[1-9]\d*$/.test(route.query.page)
          ? route.query.page
          : '1'
      const result = await api(
        `/listings?q=${encodeURIComponent(q)}&page=${pageNumber}&pageSize=20`,
        parseListingPage,
        { signal: controller.signal },
      )
      if (sequence !== loadSequence) return
      if (result.page !== Number(pageNumber)) {
        await router.replace({
          name: 'listings',
          query: {
            ...(q ? { q } : {}),
            page: String(result.page),
          },
        })
        return
      }
      page.value = result
    } else {
      const result = await api(
        `/listings/${encodeURIComponent(String(route.params.id ?? ''))}`,
        parseListing,
        { signal: controller.signal },
      )
      if (sequence === loadSequence) detail.value = result
    }
  } catch (reason) {
    if (!controller.signal.aborted && sequence === loadSequence) {
      error.value = message(reason)
    }
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

watch(() => route.fullPath, loadRoute, { immediate: true })

async function search() {
  await router.push({
    name: 'listings',
    query: searchDraft.value ? { q: searchDraft.value } : {},
  })
  await nextTick()
  searchInput.value?.focus()
}

async function login() {
  pending.value = true
  error.value = ''
  try {
    await store.login()
    await router.push('/listings')
  } catch (reason) {
    error.value = message(reason)
  } finally {
    pending.value = false
  }
}

async function createListing() {
  error.value = ''
  const priceCents = parsePrice(publish.price)
  if (
    publish.title.trim().length < 2 ||
    publish.description.trim().length < 5 ||
    priceCents === null
  ) {
    error.value = '请填写合法标题、描述和价格。'
    return
  }
  pending.value = true
  try {
    const created = await api('/listings', parseListing, {
      method: 'POST',
      body: JSON.stringify({
        title: publish.title.trim(),
        description: publish.description.trim(),
        priceCents,
      }),
    })
    publish.title = ''
    publish.description = ''
    publish.price = ''
    await router.push(`/listings/${created.id}`)
  } catch (reason) {
    error.value = message(reason)
  } finally {
    pending.value = false
  }
}

async function toggleFavorite() {
  if (!detail.value) return
  error.value = ''
  try {
    const target = !selected.value
    await store.setFavorite(detail.value.id, target)
    feedback.value = target ? '已收藏。' : '已取消收藏。'
  } catch (reason) {
    error.value = message(reason)
  }
}

async function reserve() {
  if (!detail.value) return
  pending.value = true
  error.value = ''
  feedback.value = ''
  try {
    const reservation = await api(
      `/listings/${encodeURIComponent(detail.value.id)}/reservations`,
      parseReservation,
      { method: 'POST', body: '{}' },
    )
    feedback.value = `预约成功，编号：${reservation.id}`
    detail.value = { ...detail.value, status: 'reserved' }
  } catch (reason) {
    error.value = message(reason)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main id="main" tabindex="-1">
    <section v-if="routeName === 'listings'">
      <h1 tabindex="-1">商品列表</h1>
      <form @submit.prevent="search">
        <label for="search">搜索标题</label>
        <input id="search" ref="searchInput" v-model="searchDraft" name="q">
        <button>筛选</button>
        <RouterLink v-if="route.query.q" to="/listings">清除筛选</RouterLink>
      </form>
      <p v-if="loading" role="status">正在加载商品……</p>
      <div v-else-if="error" role="alert">
        <p>{{ error }}</p>
        <button type="button" @click="loadRoute">重试</button>
      </div>
      <p v-else-if="page?.items.length === 0">没有匹配商品。</p>
      <section v-else aria-label="商品结果">
        <article v-for="item in page?.items ?? []" :key="item.id">
          <h2><RouterLink :to="`/listings/${item.id}`">{{ item.title }}</RouterLink></h2>
          <p>{{ item.description }}</p>
          <p>{{ money(item.priceCents) }} · {{ item.status }}</p>
        </article>
      </section>
      <nav v-if="page" aria-label="分页">
        <RouterLink
          v-if="page.page > 1"
          :to="pageLocation(page.page - 1)"
        >上一页</RouterLink>
        <span>第 {{ page.page }} / {{ pageCount }} 页</span>
        <RouterLink
          v-if="page.page < pageCount"
          :to="pageLocation(page.page + 1)"
        >下一页</RouterLink>
      </nav>
    </section>

    <section v-else-if="routeName === 'detail'">
      <h1 tabindex="-1">{{ detail?.title ?? '商品详情' }}</h1>
      <p v-if="loading" role="status">正在加载详情……</p>
      <div v-else-if="error && !detail" role="alert">
        <p>{{ error }}</p>
        <RouterLink to="/listings">返回商品列表</RouterLink>
      </div>
      <article v-else-if="detail">
        <p v-if="error" role="alert">{{ error }}</p>
        <p>{{ detail.description }}</p>
        <p>{{ money(detail.priceCents) }}</p>
        <p>状态：{{ detail.status }}</p>
        <button
          type="button"
          :disabled="!!store.busyById[detail.id]"
          :aria-pressed="selected"
          @click="toggleFavorite"
        >
          {{ selected ? '取消收藏' : '收藏' }}
        </button>
        <button
          type="button"
          :disabled="pending || detail.status !== 'available'"
          @click="reserve"
        >
          预约
        </button>
      </article>
    </section>

    <section v-else-if="routeName === 'login'">
      <h1 tabindex="-1">教学登录</h1>
      <p>只创建本机演示会话，不输入真实密码。</p>
      <button type="button" :disabled="pending" @click="login">
        以演示居民登录
      </button>
    </section>

    <section v-else-if="routeName === 'new-listing'">
      <h1 tabindex="-1">发布商品</h1>
      <form @submit.prevent="createListing">
        <label for="title">标题</label>
        <input id="title" v-model="publish.title" name="title" required>
        <label for="description">描述</label>
        <textarea id="description" v-model="publish.description"
          name="description" required />
        <label for="price">价格（元）</label>
        <input id="price" v-model="publish.price" name="price"
          inputmode="decimal" required>
        <button :disabled="pending">发布</button>
      </form>
    </section>

    <section v-else>
      <h1 tabindex="-1">页面不存在</h1>
      <p role="alert">找不到该页面。</p>
      <RouterLink to="/listings">返回商品列表</RouterLink>
    </section>

    <p v-if="feedback" role="status">{{ feedback }}</p>
    <p v-if="error && routeName !== 'listings' && routeName !== 'detail'"
      role="alert">{{ error }}</p>
  </main>
</template>
```

**完整文件：`apps/vue-web/src/main.ts`**

```ts
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './style.css'

createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app')
```

**完整文件：`apps/vue-web/src/style.css`**

```css
:root {
  color: #1f2a24;
  background: #f6f3ea;
  font-family: system-ui, sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; }
header, main {
  width: min(100% - 2rem, 54rem);
  margin-inline: auto;
}
nav {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  padding-block: 1rem;
}
main { padding-block: 1rem 3rem; }
form { display: grid; gap: 0.5rem; max-width: 30rem; }
article {
  border-block-start: 1px solid #aeb8b1;
  padding-block: 1rem;
}
button, input, textarea { font: inherit; }
input, textarea { max-width: 100%; padding: 0.5rem; }
button, a { min-height: 2.5rem; }
:focus-visible { outline: 3px solid #8b3d20; outline-offset: 3px; }
.skip-link { position: absolute; transform: translateY(-200%); }
.skip-link:focus { position: static; transform: none; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

### 7.5 单元与 Store 测试

**完整文件：`apps/vue-web/src/domain.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import {
  parseListing,
  parseListingPage,
  ResponseValidationError,
} from './api'
import { parsePrice } from './domain'

describe('price-and-draft-contract', () => {
  it.each([
    ['35.10', 3510],
    ['0', 0],
    ['1000000.00', 100_000_000],
    ['-1', null],
    ['01', null],
    ['3e2', null],
    ['35.001', null],
    ['1000000.01', null],
  ])('%s -> %s', (input, expected) => {
    expect(parsePrice(input)).toBe(expected)
  })

  it('畸形成功响应被运行时 parser 拒绝', () => {
    const valid = {
      id: 'lamp-1',
      title: '台灯',
      description: '完整字段',
      priceCents: 3500,
      status: 'available',
      ownerId: 'seller-1',
      version: 1,
      createdAt: '2026-10-11T08:00:00.000Z',
    }
    for (const invalid of [
      { ...valid, priceCents: -1 },
      { ...valid, version: 0 },
      { ...valid, createdAt: '2026-10-11' },
    ]) {
      expect(() => parseListing(invalid)).toThrow(ResponseValidationError)
    }
    expect(() => parseListingPage({
      items: [valid],
      page: 0,
      pageSize: 20,
      total: -1,
    })).toThrow(ResponseValidationError)
  })
})
```

**完整文件：`apps/vue-web/src/stores/market.test.ts`**

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { useMarketStore } from './market'

vi.mock('../api', async importOriginal => {
  const original = await importOriginal<typeof import('../api')>()
  return { ...original, api: vi.fn() }
})

const request = vi.mocked(api)

beforeEach(() => {
  setActivePinia(createPinia())
  request.mockReset()
})

describe('favorite-target-is-idempotent', () => {
  it('重复设置已收藏不会重复 ID', async () => {
    request.mockResolvedValue({ ok: true })
    const store = useMarketStore()
    store.user = { id: 'demo-buyer', name: '演示居民' }
    await store.setFavorite('lamp-1', true)
    await store.setFavorite('lamp-1', true)
    expect(store.favoriteIds).toEqual(['lamp-1'])
    expect(store.favoriteCount).toBe(1)
  })
})

describe('late-session-result-is-ignored', () => {
  it('退出完成后旧收藏响应不能回写', async () => {
    let finish!: (value: unknown) => void
    request.mockImplementationOnce(() =>
      new Promise(resolve => { finish = resolve }),
    )
    const store = useMarketStore()
    store.user = { id: 'demo-buyer', name: '演示居民' }
    const oldWrite = store.setFavorite('lamp-1', true)
    request.mockResolvedValueOnce({ ok: true })
    await store.logout()
    finish({ ok: true })
    await oldWrite
    expect(store.user).toBeNull()
    expect(store.favoriteIds).toEqual([])
    expect(store.busyById).toEqual({})
  })

  it('退出后晚到登录不能复活旧会话', async () => {
    let finishLogin!: (value: unknown) => void
    request.mockImplementationOnce(() =>
      new Promise(resolve => { finishLogin = resolve }),
    )
    const store = useMarketStore()
    const oldLogin = store.login()
    request.mockResolvedValueOnce({ ok: true })
    await store.logout()
    finishLogin({ id: 'old-user', name: '旧居民' })
    await oldLogin
    expect(store.user).toBeNull()
  })

  it('新登录后晚到退出不能清除新会话', async () => {
    let finishLogout!: (value: unknown) => void
    request.mockImplementationOnce(() =>
      new Promise(resolve => { finishLogout = resolve }),
    )
    const store = useMarketStore()
    store.user = { id: 'old-user', name: '旧居民' }
    const oldLogout = store.logout()
    request.mockResolvedValueOnce({ id: 'new-user', name: '新居民' })
    await store.login()
    finishLogout({ ok: true })
    await oldLogout
    expect(store.user).toEqual({ id: 'new-user', name: '新居民' })
  })
})
```

### 7.6 Chromium 场景

**完整文件：`apps/vue-web/e2e/market.spec.ts`**

```ts
import { expect, test } from '@playwright/test'

test('search-empty-and-recovery', async ({ page }) => {
  await page.goto('/listings')
  await page.getByLabel('搜索标题').fill('没有这件商品')
  await page.getByRole('button', { name: '筛选', exact: true }).click()
  await expect(page.getByText('没有匹配商品。')).toBeVisible()
  await page.getByRole('link', { name: '清除筛选' }).click()
  await expect(page.getByRole('heading', { name: '九成新台灯' })).toBeVisible()
})

test('keyboard-primary-path', async ({ page }) => {
  await page.goto('/listings')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: '跳到主要内容' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('搜索标题')).toBeFocused()
  await page.keyboard.type('台灯')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/q=/)
  await expect(page.getByRole('heading', { name: '九成新台灯' })).toBeVisible()
  await expect(page.getByLabel('搜索标题')).toBeFocused()
})

test('pagination-normalizes-an-out-of-range-page', async ({ page }) => {
  await page.goto('/listings?page=999')
  await expect(page).toHaveURL(/page=1/)
  await expect(page.getByRole('navigation', { name: '分页' }))
    .toContainText('第 1 / 1 页')
})

test('failed-publish-keeps-draft', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: '以演示居民登录' }).click()
  await page.getByRole('link', { name: '发布', exact: true }).click()
  await page.getByLabel('标题', { exact: true }).fill('__error')
  await page.getByLabel('描述', { exact: true }).fill('保留这份失败草稿。')
  await page.getByLabel('价格（元）').fill('120.00')
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('503 SERVICE_UNAVAILABLE')
  await expect(page.getByLabel('标题', { exact: true })).toHaveValue('__error')
  await expect(page.getByLabel('描述', { exact: true }))
    .toHaveValue('保留这份失败草稿。')
  await expect(page.getByLabel('价格（元）')).toHaveValue('120.00')
})

test('not-found-and-service-failure', async ({ page }) => {
  await page.goto('/listings/missing')
  await expect(page.getByRole('alert')).toContainText('404 NOT_FOUND')
  await page.goto('/listings?q=__error')
  await expect(page.getByRole('alert')).toContainText('503 SERVICE_UNAVAILABLE')
})

test('login-publish-favorite-logout', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: '以演示居民登录' }).click()
  await page.getByRole('link', { name: '发布', exact: true }).click()
  await page.getByLabel('标题', { exact: true }).fill('二手书架')
  await page.getByLabel('描述', { exact: true }).fill('可拆卸，配件齐全。')
  await page.getByLabel('价格（元）').fill('120.00')
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await expect(page.getByRole('heading', { name: '二手书架' })).toBeVisible()
  await page.getByRole('button', { name: '预约', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('不能预约自己的商品')
  await page.getByRole('button', { name: '收藏', exact: true }).click()
  await expect(page.getByRole('button', { name: '取消收藏' }))
    .toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /退出 演示居民/ }).click()
  await expect(page.getByRole('link', { name: '登录' })).toBeVisible()
})

test('reservation-conflict-across-tabs', async ({ page, context }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: '以演示居民登录' }).click()
  await page.goto('/listings/lamp-1')
  const second = await context.newPage()
  await second.goto('/listings/lamp-1')
  await page.getByRole('button', { name: '预约', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('预约成功')
  await second.getByRole('button', { name: '预约', exact: true }).click()
  await expect(second.getByRole('alert'))
    .toContainText('409 RESERVATION_CONFLICT')
  await expect(second.getByRole('alert')).toContainText('请求 demo-request-id')
  await second.close()
})
```

### 7.7 SSR 应用与服务器

**完整文件：`apps/vue-web/ssr/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>邻里集市 Vue SSR</title>
  </head>
  <body>
    <div id="app"><!--app-html--></div>
    <script id="initial-data" type="application/json"><!--app-data--></script>
    <script type="module" src="/src/entry-client.ts"></script>
  </body>
</html>
```

**完整文件：`apps/vue-web/ssr/vite.config.ts`**

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  server: {
    fs: { allow: ['..'] },
  },
})
```

**完整文件：`apps/vue-web/ssr/src/types.ts`**

```ts
import type { Listing } from '../../src/domain'

export type InitialData = {
  q: string
  items: Listing[]
  error: string
}
```

**完整文件：`apps/vue-web/ssr/src/App.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { money } from '../../src/domain'
import type { InitialData } from './types'

const props = defineProps<{ initial: InitialData }>()
const query = ref(props.initial.q)
const count = ref(0)
</script>

<template>
  <main>
    <h1>邻里集市 Vue SSR</h1>
    <form action="/" method="get">
      <label>搜索标题 <input v-model="query" name="q"></label>
      <button>筛选</button>
    </form>
    <section v-if="initial.error" role="alert">
      <p>{{ initial.error }}</p>
      <a href="/">重新加载列表</a>
    </section>
    <section v-else aria-label="商品列表">
      <p v-if="initial.items.length === 0">没有匹配商品。</p>
      <article v-for="item in initial.items" :key="item.id">
        <h2>{{ item.title }}</h2>
        <p>{{ item.description }}</p>
        <p>{{ money(item.priceCents) }}</p>
      </article>
    </section>
    <button type="button" @click="count += 1">水合检查：{{ count }}</button>
  </main>
</template>
```

**完整文件：`apps/vue-web/ssr/src/app.ts`**

```ts
import { createPinia } from 'pinia'
import { createSSRApp, h } from 'vue'
import {
  createMemoryHistory,
  createRouter,
  createWebHistory,
} from 'vue-router'
import App from './App.vue'
import type { InitialData } from './types'

const EmptyRoute = { render: () => h('span', { hidden: true }) }

export function createApplication(initial: InitialData, server: boolean) {
  const app = createSSRApp(App, { initial })
  const pinia = createPinia()
  const router = createRouter({
    history: server ? createMemoryHistory() : createWebHistory(),
    routes: [{ path: '/', component: EmptyRoute }],
  })
  app.use(pinia)
  app.use(router)
  return { app, pinia, router }
}
```

**完整文件：`apps/vue-web/ssr/src/app.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createApplication } from './app'
import type { InitialData } from './types'

const initial: InitialData = { q: '', items: [], error: '' }

describe('SSR request isolation', () => {
  it('每次工厂调用创建独立 app、router 与 Pinia', () => {
    const first = createApplication(initial, true)
    const second = createApplication(initial, true)
    expect(first.app).not.toBe(second.app)
    expect(first.router).not.toBe(second.router)
    expect(first.pinia).not.toBe(second.pinia)
  })
})
```

**完整文件：`apps/vue-web/ssr/src/serialize.ts`**

```ts
export function serializeForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}
```

**完整文件：`apps/vue-web/ssr/src/entry-server.ts`**

```ts
import { renderToString } from 'vue/server-renderer'
import type { Listing } from '../../src/domain'
import { createApplication } from './app'
import type { InitialData } from './types'

const seed: Listing[] = [
  {
    id: 'lamp-1',
    title: '九成新台灯',
    description: '暖光，可现场验货。',
    priceCents: 3500,
    status: 'available',
    ownerId: 'seller-1',
    version: 1,
    createdAt: '2026-10-10T08:00:00.000Z',
  },
  {
    id: 'desk-1',
    title: '折叠桌',
    description: '已被预约，用于状态示例。',
    priceCents: 8000,
    status: 'reserved',
    ownerId: 'seller-2',
    version: 2,
    createdAt: '2026-10-09T08:00:00.000Z',
  },
]

export async function render(url: string) {
  const parsed = new URL(url, 'http://ssr.local')
  const q = parsed.searchParams.get('q') ?? ''
  const xssFixture: Listing = {
    ...seed[0]!,
    id: 'xss-1',
    title: '</script><script>globalThis.pwned=true</script>',
  }
  const initial: InitialData = {
    q,
    items: q === '__error'
      ? []
      : q === 'xss'
        ? [xssFixture]
        : seed.filter(item => item.title.includes(q)),
    error: q === '__error' ? '演示数据源不可用。' : '',
  }
  const { app, router } = createApplication(initial, true)
  await router.push(parsed.pathname + parsed.search)
  await router.isReady()
  const html = await renderToString(app)
  return { html, initial, status: initial.error ? 503 : 200 }
}
```

**完整文件：`apps/vue-web/ssr/src/entry-client.ts`**

```ts
import { createApplication } from './app'
import type { InitialData } from './types'

const node = document.getElementById('initial-data')
if (!node?.textContent) throw new Error('缺少 SSR 初始数据。')
const initial = JSON.parse(node.textContent) as InitialData
const { app, router } = createApplication(initial, false)
await router.isReady()
app.mount('#app')
```

**完整文件：`apps/vue-web/ssr/src/serialize.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { serializeForHtml } from './serialize'

describe('ssr-html-and-hydration serialization', () => {
  it('转义 script 结束标签但保持 JSON 值', () => {
    const output = serializeForHtml({ title: '</script><script>x</script>' })
    expect(output).not.toContain('</script>')
    expect(output).toContain('\\u003c/script>')
    expect(JSON.parse(output).title).toContain('</script>')
  })
})
```

**完整文件：`apps/vue-web/ssr/server.mjs`**

```js
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))
const vite = await createViteServer({
  root,
  configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url)),
  server: { middlewareMode: true },
  appType: 'custom',
})

function serializeForHtml(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}

const server = createServer((req, res) => {
  vite.middlewares(req, res, async () => {
    try {
      const url = req.url ?? '/'
      const pathname = new URL(url, 'http://ssr.local').pathname
      if (pathname !== '/') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
        res.end('页面不存在')
        return
      }
      let template = await readFile(new URL('./index.html', import.meta.url), 'utf8')
      template = await vite.transformIndexHtml(url, template)
      const module = await vite.ssrLoadModule('/src/entry-server.ts')
      const result = await module.render(url)
      const output = template
        .replace('<!--app-html-->', () => result.html)
        .replace('<!--app-data-->', () => serializeForHtml(result.initial))
      res.writeHead(result.status, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      res.end(output)
    } catch (error) {
      if (error instanceof Error) vite.ssrFixStacktrace(error)
      console.error(error)
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('渲染失败，请稍后重试')
    }
  })
})

const port = Number(process.env.PORT ?? 4174)
server.listen(port, '127.0.0.1', () => {
  console.log(`SSR lab: http://127.0.0.1:${port}`)
})
```

### 7.8 重建与命令

把上述文件按相对路径写入全新临时目录后，在 `apps/vue-web` 执行：

```bash
pnpm install
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm e2e
pnpm ssr
```

第一条只在新临时项目生成锁文件；第二条证明该锁可冻结复现。真实项目应提交并审查锁文件。教材仓库不保存临时锁和构建产物。

另开终端验证 SSR：

```bash
curl -i -G --data-urlencode 'q=台灯' 'http://127.0.0.1:4174/'
curl -i 'http://127.0.0.1:4174/?q=__error'
curl -i -G --data-urlencode 'q=不存在' 'http://127.0.0.1:4174/'
curl -i 'http://127.0.0.1:4174/missing'
curl -s 'http://127.0.0.1:4174/?q=xss'
```

预期依次为 200/503/200/404；xss 响应的 initial JSON 不含字面 `</script>`，DOM 不增加脚本。浏览器中禁用 JS 搜索仍可用；启用后计数 0→1 且 Console 无 hydration mismatch。

## 8. 常见错误与排查路径

**错误示例：为追求“流式”在发头后仍尝试改 status。**

```ts
res.writeHead(200)
stream.pipe(res)
stream.on('error', () => res.writeHead(503))
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| `ERR_HTTP_HEADERS_SENT` | Node 日志 | 发头后再次 writeHead | 分阶段错误策略 | 无二次写头 |
| e2e 找到旧应用 | 端口已有进程 | 复用服务器 | strictPort/no reuse | 冲突直接失败 |
| 第二页预约按钮已禁用 | 第一页后共享数据更新时序 | 测试先后不明确 | 第二页先加载，再提交第一页 | 第二页收到 409 |
| SSR xss 多一个 script | raw HTML 有 `</script>` | 只 stringify | 转义 `<` | 节点数不增加 |
| typecheck 没检查 SFC | 只运行 build | Vite 转译不等于类型 | vue-tsc | 非法 prop 门禁失败 |
| Nuxt 被写成已完成 | 无项目/命令/输出 | 用框架名替代证据 | 标记选修与迁移项 | 报告无虚假通过 |
| Teleport 内容在水合后移动 | 服务端模板缺少稳定目标 | 只写客户端 `to` | 在模板预留并注入 context teleports | DOM 位置一致且无 mismatch |
| 异步组件首帧不一致 | 服务端内容与客户端 fallback 不同 | 两端加载状态不一致 | 固定同一 fallback 和数据种子 | raw HTML 与首个客户端 render 一致 |

每次修复后只重跑受影响最小检查，再跑完整门禁。连续失败应回到首个错误和版本事实，不通过升级全部依赖碰运气。

## 9. 课后题

1. **流式响应发头后发生错误，为什么不能再返回 503？**<br>
   答：HTTP 状态和响应头已发送；只能记录错误并在剩余流中提供安全恢复内容或终止连接。
2. **Nuxt 是否自动解决预约并发？**<br>
   答：不能，预约唯一性仍由后端事务和数据库约束保证。
3. **为什么完整快照只放一次？**<br>
   答：避免前文章节各自维护一套最终源码，产生类型、协议和测试漂移。
4. **Vite middleware E2E 证明了什么？**<br>
   答：指定浏览器流程和演示协议可运行；不证明真实数据库、生产认证或部署。
5. **为什么教程解释了 Teleport SSR，却没有在最终快照声称已实现？**<br>
   答：理解 API 不等于完成服务端容器注入、异步 fallback、水合和中止测试；缺少这些证据时只能登记采用边界。

## 10. 实践练习

**基础：负向类型门禁。**在临时副本把 `status` 改成 `"draft"`，`pnpm typecheck` 必须失败；恢复后通过。

**进阶：无 JavaScript 搜索。**禁用 JS，提交 `q=台灯`，断言 HTTP 200 和原始页面仍含台灯。

**故障注入：流式阶段策略。**扩展 `stream-policy.test.ts` 覆盖客户端中止。答案标准：中止上游、记录原因、不伪造新 status。

**边界练习：高级 SSR 采用门禁。**扩展 `advanced-boundary.test.ts`，验证两个缺口同时存在时按固定顺序返回，再设计一个不进入最终快照的 Teleport 探针。答案标准：缺口逐项可见且顺序稳定；没有真实服务端容器与水合证据时报告仍写“未实现”。

## 11. 阶段验收

共享业务场景采用以下固定名称：

| 场景 | Vue 快照证据 | 合格结果 |
| --- | --- | --- |
| `price-and-draft-contract` | Vitest | 金额边界正确 |
| `failed-publish-keeps-draft` | 第 6 章组件测试/手工 | 503 后草稿保留 |
| `favorite-target-is-idempotent` | store 测试/E2E | 无重复 ID |
| `late-session-result-is-ignored` | store 测试 | 退出后旧结果不回写 |
| `search-empty-and-recovery` | E2E | 空态可清除 |
| `login-publish-favorite-logout` | E2E | 完整主路径 |
| `reservation-conflict-across-tabs` | E2E | 一次成功、一次 409 |
| `not-found-and-service-failure` | 第 6 章/E2E 扩展 | 404/503 可恢复 |
| `keyboard-primary-path` | Capstone E2E | Tab/Enter 与路由焦点恢复可用 |
| `ssr-html-and-hydration` | SSR/Chromium | raw HTML、无 JS、0→1 |

完成还要求：

- [ ] 直接依赖版本与实际 `pnpm list --depth 0` 已记录。
- [ ] lint、vue-tsc、测试、build 退出 0。
- [ ] SSR 200/503/404 和安全序列化通过。
- [ ] Chromium 代表路径与 hydration Console 通过。
- [ ] 高级 SSR 采用门禁能分别报告 server prefetch、Teleport 容器和异步 fallback 缺口；最终快照仍明确未实现三项能力。
- [ ] Safari、Firefox、真实移动设备、VoiceOver、NVDA、JAWS 明确未测或有独立证据。
- [ ] 真实后端事务、生产 CSRF、部署、负载、CDN 缓存和性能收益不虚报。

## 12. 常见问题

**为什么快照仍使用内存 API？**<br>
后端卷尚未接入真实 Nest/PostgreSQL。演示 API 让前端状态可验证，并明确不提供持久化、授权和事务证据。

**为什么 SSR 与 SPA 各有入口？**<br>
教学上隔离风险，避免一个开发服务器掩盖双构建复杂度。生产可由框架整合，但仍要维护客户端/服务端边界。

**可以现在迁移 Nuxt 吗？**<br>
可以作为独立任务，先定义页面渲染策略、数据缓存、错误和部署目标，再验证等价业务矩阵；不要在本快照中混入未经测试的第二实现。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [Vue SSR API](https://vuejs.org/api/ssr.html)：字符串、Web Stream、Node Stream 与 render context。
- [Vue Server-Side Rendering](https://vuejs.org/guide/scaling-up/ssr.html)：hydration、状态污染和生产注意事项。
- [Nuxt Documentation](https://nuxt.com/docs)：集成路由、数据和渲染模式。
- [Vite SSR](https://vite.dev/guide/ssr)：生产构建清单。
- [Pinia SSR](https://pinia.vuejs.org/ssr/)：状态注入与安全。

## 我现在能做到什么

我能从唯一快照重建 Vue 邻里集市，运行类型、测试、构建、SSR 与浏览器验收，并准确区分已证明的教学能力和仍需真实后端、生产环境与人工验证的边界。

## 单元导航

[上一课：Vite Vue SSR 与请求隔离](02-vite-vue-ssr-serialization-isolation.md) · [返回章目录](../README.md#第八章渲染模式ssr-与结业验收) · [Vue 覆盖矩阵](../VUE-COVERAGE.md)
