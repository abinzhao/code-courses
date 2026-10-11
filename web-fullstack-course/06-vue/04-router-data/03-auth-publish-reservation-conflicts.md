# 教学登录、发布与预约冲突

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 接入教学 Cookie 会话、服务端签发商品 ID、发布失败保稿和两标签页预约冲突 |
| 可观察产出 | 错误恢复分类、登录页、发布页、预约面板、前端 404 |
| 运行条件 | 前两课 Router、完整教学 API、两个同源浏览器标签页 |
| 建议时间 | 130 至 150 分钟 |
| 完成证据 | 401 保稿、登录发布跳转、201/409 冲突、状态恢复和构建结果 |

## 1. 任务背景

路由可分享之后，邻里集市需要处理真实写操作的形状：登录建立会话，发布由服务端生成 ID，
预约由服务端判断当前用户和商品状态。浏览器不能自报 `buyerId`、`ownerId` 或角色作为授权依据。

本课仍使用第 3 章的本机教学 API。它能演示 Cookie、状态码和冲突路径，但不验证密码、数据库
事务或生产 CSRF。页面必须把这条边界写给学习者。

## 2. 学习目标

完成后你应能：

1. 用同源 HttpOnly 教学 Cookie 建立会话形状；
2. 不在 localStorage、URL 或日志保存凭据；
3. 发布时只发送允许字段，并使用响应中的服务端 ID；
4. 让 401/400 发布失败保留草稿；
5. 按 401/403/404/409/400/503 提供不同恢复；
6. 发起预约时不传 buyerId；
7. 让两个标签页得到一个 201 和一个 409；
8. 解释前端 pending、后端授权和数据库唯一约束的不同职责。

## 3. 预备知识

先完成[路由取数](02-route-data-fetch-cancellation-errors.md)，并重启 Vite 使教学 API 回到：

```text
lamp-1: available
desk-1: reserved
无教学会话
```

打开 DevTools Network，保留状态码与响应体。不要在报告里记录 Cookie 值或真实密码；教学登录
不需要输入真实凭据。

## 4. 核心理论

### 4.1 身份、授权和业务约束

三层不可互换：

| 层 | 回答的问题 | 本课证据 |
| --- | --- | --- |
| 认证 | 当前请求是谁 | 服务端解析 HttpOnly 教学 Cookie |
| 对象授权 | 此人能否执行动作 | 服务端检查 ownerId/动作规则 |
| 一致性 | 并发后系统是否仍合法 | 教学单进程检查；生产需数据库约束/事务 |

前端隐藏按钮只是体验。攻击者可以直接调用 API，因此浏览器提交的 role、ownerId、buyerId 都不可信。

### 4.2 发布命令与服务端 ID

浏览器只发送经过验证的：

```json
{
  "title": "二手书架",
  "description": "可拆卸，配件齐全。",
  "priceCents": 12000
}
```

服务端根据会话写 ownerId，生成 id/version/createdAt/status。成功后导航到响应 `created.id`。
不能同时在前端生成另一个 UUID，否则 URL 可能指向不存在资源。

### 4.3 状态码是恢复协议

| 状态 | 本课含义 | 用户恢复 |
| --- | --- | --- |
| 401 | 未登录或会话过期 | 新标签打开教学登录，原发布页保留草稿 |
| 403 | 已知身份但禁止动作 | 解释权限，不反复重试 |
| 404 | 商品已经不存在 | 返回列表 |
| 409 | 预约/版本冲突 | 重新读取服务端状态 |
| 400 | 输入不合法 | 修正字段，保留草稿 |
| 503 | 服务暂不可用 | 保留工作，稍后重试 |

不能全返回 200 再解析 message，也不能把全部失败统一写成“网络错误”。

### 4.4 两标签页冲突

两个标签页都看到 available，只表示它们读取时的快照。两次 POST 到达服务端后，最多一个能把
状态从 available 改为 reserved；另一个得到 409 并重新读取。禁用当前标签页按钮无法锁住另一页。

教学 API 在单进程中演示该顺序。生产必须用数据库唯一约束、条件更新或事务形成跨进程证据。

### 4.5 晚到写结果

预约期间用户可能导航到另一商品。请求仍可能成功，但旧商品的成功消息不能显示在新详情。
组件保存 `targetId` 和 operation generation；只有当前 route 与 generation 都匹配才提交 UI。

## 5. 元素、属性、API 或配置清单

| API/协议 | 作用 | 边界 |
| --- | --- | --- |
| `POST /auth/login` | 建立教学会话 | 不检查真实密码 |
| `GET /auth/me` | 读取当前用户 | 401 表示无会话 |
| `POST /auth/logout` | 撤销教学会话 | 第 5 章纳入共享状态 |
| `POST /listings` | 创建商品并返回 201 | 服务端生成身份字段 |
| `PATCH /listings/:id` | 带 version 编辑 | 403/409 由服务端判断 |
| `POST /listings/:id/reservations` | 创建预约并返回 201 | 请求体不含 buyerId |
| `PUT/DELETE /favorites/:id` | 设定收藏目标状态 | 重复调用幂等 |
| `router.push` | 成功后去服务端资源 URL | 失败不导航 |
| `ApiError.status/code` | 选择恢复行为 | message 只展示，不做稳定判断 |

## 6. 最小可运行案例

先把错误恢复变成纯映射并测试。

**完整文件：`apps/vue-web/src/api-recovery.ts`**

```ts
import type { ApiError } from './api'

export type RecoveryKind =
  | 'unauthenticated'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'unavailable'
  | 'unknown'

export type Recovery = {
  kind: RecoveryKind
  message: string
  retryable: boolean
}

export function classifyApiError(error: ApiError): Recovery {
  switch (error.status) {
    case 401:
      return {
        kind: 'unauthenticated',
        message: '会话不存在或已过期，请先登录。',
        retryable: false,
      }
    case 403:
      return {
        kind: 'forbidden',
        message: '当前身份无权执行此操作。',
        retryable: false,
      }
    case 404:
      return {
        kind: 'not-found',
        message: '商品不存在或已经移除。',
        retryable: false,
      }
    case 409:
      return {
        kind: 'conflict',
        message: error.message,
        retryable: false,
      }
    case 400:
      return {
        kind: 'validation',
        message: error.message,
        retryable: false,
      }
    case 503:
      return {
        kind: 'unavailable',
        message: '服务暂不可用，请稍后重试。',
        retryable: true,
      }
    default:
      return {
        kind: 'unknown',
        message: '请求失败，请使用请求编号联系维护者。',
        retryable: true,
      }
  }
}
```

**完整文件：`apps/vue-web/src/api-recovery.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { ApiError } from './api'
import { classifyApiError } from './api-recovery'

describe('status-specific-recovery', () => {
  it.each([
    [401, 'unauthenticated', false],
    [403, 'forbidden', false],
    [404, 'not-found', false],
    [409, 'conflict', false],
    [400, 'validation', false],
    [503, 'unavailable', true],
  ] as const)('maps %i to %s', (status, kind, retryable) => {
    const recovery = classifyApiError(new ApiError(
      status,
      'DEMO_CODE',
      '原始错误消息',
      'request-id',
    ))
    expect(recovery).toMatchObject({ kind, retryable })
  })
})
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm exec vitest run src/api-recovery.test.ts
```

映射不发送请求，只决定恢复展示。401 与 403、404 与 503 必须保持不同。

## 7. 邻里集市集成案例

### 7.1 教学登录

**完整文件：`apps/vue-web/src/pages/LoginPage.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'

type User = {
  id: string
  name: string
}

const router = useRouter()
const pending = ref(false)
const errorMessage = ref('')

async function login() {
  if (pending.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    await api<User>('/auth/login', {
      method: 'POST',
      body: '{}',
    })
    await router.push({ name: 'listings' })
  } catch (error) {
    errorMessage.value = error instanceof Error
      ? error.message
      : '教学登录失败。'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section aria-labelledby="login-title">
    <h2 id="login-title">教学登录</h2>
    <p>
      本页不收集真实密码，只在本机 Vite 进程中建立固定演示居民会话。
    </p>
    <form @submit.prevent="login">
      <button :disabled="pending">
        {{ pending ? '正在登录' : '以演示居民登录' }}
      </button>
    </form>
    <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
  </section>
</template>
```

### 7.2 发布并使用服务端 ID

**完整文件：`apps/vue-web/src/pages/NewPage.vue`**

```vue
<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'
import ListingForm from '../ListingForm.vue'
import { api } from '../api'
import type { Listing } from '../domain'
import type { ListingInput } from '../form'

const router = useRouter()

async function save(input: ListingInput) {
  const created = await api<Listing>('/listings', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  await router.push({
    name: 'listing-detail',
    params: { id: created.id },
  })
}
</script>

<template>
  <section aria-labelledby="new-listing-title">
    <h2 id="new-listing-title">发布商品</h2>
    <p>
      未登录、校验失败或服务失败时保留草稿；成功后使用服务端 ID 跳转。
    </p>
    <RouterLink
      to="/login"
      target="_blank"
      rel="noopener"
    >
      在新标签页打开教学登录
    </RouterLink>
    <ListingForm :save="save" />
  </section>
</template>
```

`ListingForm` 已在第 2 章保证失败保稿。POST 不包含 ownerId、version、status、createdAt 或
客户端 ID；这些字段由服务端产生。

### 7.3 预约面板

**完整文件：`apps/vue-web/src/ReservationPanel.vue`**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { ApiError, api } from './api'
import { classifyApiError } from './api-recovery'
import type { Listing, Reservation } from './domain'
import type { Recovery } from './api-recovery'

const props = defineProps<{ listing: Readonly<Listing> }>()
const emit = defineEmits<{
  reserved: [reservation: Reservation]
  refresh: []
}>()
const route = useRoute()

const pending = ref(false)
const message = ref('')
const recovery = ref<Recovery | null>(null)
let generation = 0

watch(
  () => props.listing.id,
  () => {
    generation++
    pending.value = false
    message.value = ''
    recovery.value = null
  },
)

async function reserve() {
  if (pending.value || props.listing.status !== 'available') return

  const targetId = props.listing.id
  const operation = ++generation
  pending.value = true
  message.value = '正在预约……'
  recovery.value = null

  try {
    const reservation = await api<Reservation>(
      `/listings/${encodeURIComponent(targetId)}/reservations`,
      { method: 'POST', body: '{}' },
    )
    if (
      operation !== generation
      || String(route.params.id ?? '') !== targetId
    ) {
      return
    }
    message.value = `预约成功，编号：${reservation.id}`
    emit('reserved', reservation)
  } catch (error) {
    if (
      operation !== generation
      || String(route.params.id ?? '') !== targetId
    ) {
      return
    }
    recovery.value = error instanceof ApiError
      ? classifyApiError(error)
      : {
          kind: 'unknown',
          message: '无法连接教学服务。',
          retryable: true,
        }
    message.value = ''
  } finally {
    if (operation === generation) pending.value = false
  }
}
</script>

<template>
  <section aria-label="预约操作">
    <button
      type="button"
      :disabled="pending || listing.status !== 'available'"
      @click="reserve"
    >
      {{ pending ? '正在预约' : '预约' }}
    </button>
    <p v-if="message" role="status">{{ message }}</p>
    <section v-if="recovery" role="alert">
      <p>{{ recovery.message }}</p>
      <RouterLink
        v-if="recovery.kind === 'unauthenticated'"
        to="/login"
      >
        前往教学登录
      </RouterLink>
      <p v-if="recovery.kind === 'conflict'">
        请重新读取详情，确认商品最新状态。
      </p>
      <button
        v-if="recovery.kind === 'conflict'"
        type="button"
        @click="emit('refresh')"
      >
        重新读取详情
      </button>
    </section>
  </section>
</template>
```

在详情成功分支中接入：

**关键片段：`apps/vue-web/src/pages/DetailPage.vue`**

```ts
import ReservationPanel from '../ReservationPanel.vue'
import type { Reservation } from '../domain'

function handleReserved(reservation: Reservation) {
  operationMessage.value = `预约成功，编号：${reservation.id}`
  reload()
}
```

**关键片段：`apps/vue-web/src/pages/DetailPage.vue`**

```vue
<ListingCard :listing="resource.data" />
<ReservationPanel
  :listing="resource.data"
  @reserved="handleReserved"
  @refresh="reload"
/>
```

成功后父级保留预约编号并增加 revision，重新读取服务端的 reserved 状态和新 version；不在
浏览器直接改写商品。冲突按钮同样只触发重读，不把 409 伪装成成功。

### 7.4 Router 页面替换

**完整文件：`apps/vue-web/src/pages/NotFoundPage.vue`**

```vue
<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section>
    <h2>404：页面不存在</h2>
    <p>当前前端路由没有匹配页面。</p>
    <RouterLink to="/listings">返回商品列表</RouterLink>
  </section>
</template>
```

**关键片段：`apps/vue-web/src/router.ts`**

```ts
import LoginPage from './pages/LoginPage.vue'
import NewPage from './pages/NewPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'

{ path: '/new', name: 'new-listing', component: NewPage },
{ path: '/login', name: 'login', component: LoginPage },
{
  path: '/:pathMatch(.*)*',
  name: 'not-found',
  component: NotFoundPage,
},
```

为避免读者从三处片段猜测最终结果，本课结束时用下面两个完整替换文件收敛主流程。

**替换文件（本课最终版本）：`apps/vue-web/src/pages/DetailPage.vue`**

```vue
<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ListingCard from '../ListingCard.vue'
import ReservationPanel from '../ReservationPanel.vue'
import { ApiError, api, isAbortError } from '../api'
import type { Listing, Reservation } from '../domain'
import type { Resource } from '../resource'

const route = useRoute()
const revision = ref(0)
const resource = shallowRef<Resource<Listing>>({ status: 'loading' })
const operationMessage = ref('')

watch(
  () => [String(route.params.id ?? ''), revision.value] as const,
  ([id], _oldValue, onCleanup) => {
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    resource.value = { status: 'loading' }

    api<Listing>(`/listings/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    }).then(data => {
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
        : { status: 'error', message: '无法连接详情服务。' }
    })
  },
  { immediate: true },
)

watch(
  () => route.params.id,
  () => {
    operationMessage.value = ''
  },
)

function reload() {
  revision.value++
}

function handleReserved(reservation: Reservation) {
  operationMessage.value = `预约成功，编号：${reservation.id}`
  reload()
}
</script>

<template>
  <section aria-labelledby="detail-page-title">
    <h2 id="detail-page-title">商品详情</h2>

    <p v-if="resource.status === 'loading'" role="status">
      正在读取详情……
    </p>
    <section v-else-if="resource.status === 'error'" role="alert">
      <h3 v-if="resource.statusCode === 404">商品不存在</h3>
      <h3 v-else>详情暂时不可用</h3>
      <p>{{ resource.message }}</p>
      <p v-if="resource.requestId">请求编号：{{ resource.requestId }}</p>
      <button
        v-if="resource.statusCode !== 404"
        type="button"
        @click="reload"
      >
        重试详情
      </button>
    </section>
    <template v-else>
      <ListingCard :listing="resource.data" />
      <ReservationPanel
        :listing="resource.data"
        @reserved="handleReserved"
        @refresh="reload"
      />
    </template>

    <p v-if="operationMessage" role="status">{{ operationMessage }}</p>
    <RouterLink to="/listings">返回商品列表</RouterLink>
  </section>
</template>
```

**替换文件（本课最终版本）：`apps/vue-web/src/router.ts`**

```ts
import { createRouter, createWebHistory } from 'vue-router'
import ListPage from './pages/ListPage.vue'
import DetailPage from './pages/DetailPage.vue'
import LoginPage from './pages/LoginPage.vue'
import NewPage from './pages/NewPage.vue'
import NotFoundPage from './pages/NotFoundPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/listings' },
    { path: '/listings', name: 'listings', component: ListPage },
    {
      path: '/listings/:id',
      name: 'listing-detail',
      component: DetailPage,
    },
    { path: '/new', name: 'new-listing', component: NewPage },
    { path: '/login', name: 'login', component: LoginPage },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundPage,
    },
  ],
})
```

## 8. 常见错误与排查路径

**明确错误示例：浏览器自报买家。**

**关键片段：`apps/vue-web/src/BadReservationPanel.vue`**

```ts
await api(`/listings/${id}/reservations`, {
  method: 'POST',
  body: JSON.stringify({ buyerId: 'demo-buyer' }),
})
```

攻击者可以任意修改 buyerId。请求体应为空或只含业务允许字段，后端从会话识别当前用户。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 两个标签页都看到可预约，点击后一个成功，另一个显示冲突 |
| 证据 | Network 中一条 POST 为 201，另一条为 409 `RESERVATION_CONFLICT` |
| 原因 | 两页读取的是旧快照，服务端只允许第一次状态转换 |
| 修复 | 409 不伪装成功；显示冲突并重新读取最新详情 |
| 复验 | 两页刷新后都显示 reserved，不能再次预约 |

如果两个请求都 201，教学实现已经破坏核心契约，应先修服务端原子条件；禁用前端按钮不是修复。

## 9. 课后题

1. 为什么登录后不把 Cookie 复制到 localStorage？
2. 发布请求为什么不带 ownerId？
3. 401 与 403 有何差异？
4. 预约 409 为什么不自动无限重试？
5. 前端 route guard 能否代替 API 授权？

**参考答案：**

1. HttpOnly Cookie 由浏览器发送且 JS 不可读，复制会扩大凭据暴露面。
2. ownerId 来自服务端会话，浏览器自报不可信。
3. 401 是没有有效身份，403 是身份已知但无权操作。
4. 冲突代表业务状态已改变，重复相同写入不会自动变合法，应先刷新。
5. 不能，用户可绕过前端直接请求 API。

## 10. 实践练习

### 基础：未登录发布

清除教学 Cookie或重启服务，填写合法书架并提交。

**答案标准：**Network 为 401；页面提供登录入口；三个草稿字段仍在；没有跳转到伪造 ID。

### 进阶：会话过期恢复

在已打开发布页后让会话失效，再提交。

**答案标准：**按 401 恢复；在新标签完成教学登录后回到原发布页重试，敏感草稿不进入 URL。

### 故障注入：跨路由晚到结果

让预约响应延迟，点击后立即导航到另一商品。

**答案标准：**服务器可能完成旧预约，但新页面不显示旧编号；重新进入旧商品可读取最新状态。

## 11. 阶段验收

- [ ] 状态恢复映射测试覆盖 401/403/404/409/400/503。
- [ ] 教学登录不收集真实密码，Cookie 不由 JS 读取或记录。
- [ ] 未登录发布为 401 且草稿保留。
- [ ] 成功发布使用响应 ID，价格为 `12000` 分，时间由服务端生成 UTC。
- [ ] 预约请求不含 buyerId/ownerId/role。
- [ ] 两标签页得到一个 201 和一个 409，随后都读取 reserved。
- [ ] 晚到写结果不会跨商品显示。
- [ ] 类型检查、测试、构建和代表性 Chromium 路径通过。

## 12. 常见问题

**为什么教学登录不要求密码？**

它只演示前端会话和状态恢复形状，避免收集真实凭据；不能称为安全认证。

**成功预约后为什么重新 GET？**

服务端是商品状态和 version 的权威，响应后重读避免浏览器自行猜测完整资源。

**收藏为什么不用“toggle” POST？**

PUT/DELETE 表达目标状态，网络重试不会意外反转两次。

**409 只用于预约吗？**

不是。PATCH 携带旧 version 也返回 409，但 code 应区分 `VERSION_CONFLICT` 与
`RESERVATION_CONFLICT`。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [Vue Router：导航守卫](https://router.vuejs.org/guide/advanced/navigation-guards.html)
- [MDN：HTTP 401](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/401)
- [MDN：HTTP 403](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/403)
- [MDN：HTTP 409](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409)
- [OWASP：授权速查表](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [邻里集市统一契约](../../00-guide/05-project-assessment.md)

## 我现在能做到什么

我能接入同源教学会话和服务端写接口，能保留失败草稿、使用服务端 ID，并能让预约并发以一个
成功和一个 409 收敛，同时不把前端控制误称为授权或事务。

## 单元导航

[上一课：路由取数与错误恢复](02-route-data-fetch-cancellation-errors.md) ·
[返回章入口](../04-router-data.md) ·
[下一章：Pinia 与状态架构](../05-pinia-architecture.md)
