# Router、URL 状态与导航恢复

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 建立 Vue Router 路由树，让关键字、页码和商品 ID 由 URL 拥有 |
| 可观察产出 | query 规范化测试、Router 配置、应用外壳和 URL 驱动列表 |
| 运行条件 | 第 3 章应用、Vue Router 当前稳定安装结果 |
| 建议时间 | 120 至 140 分钟 |
| 完成证据 | 刷新深链、后退/前进、query 编码、非法页码回退与构建结果 |

## 1. 任务背景

第 3 章的搜索 ref 只存在于当前组件。刷新、复制链接或后退时，它无法恢复。邻里集市的关键字、
页码和商品 ID 都代表可分享页面位置，应放进 URL；尚未提交的输入草稿、表单内容和 pending
则留在组件。

Router 负责客户端 URL 与组件匹配，不替代 HTTP API、服务端页面回退或后端授权。

## 2. 学习目标

完成后你应能：

1. 使用 `createRouter`、`createWebHistory`、`RouterLink` 和 `RouterView`；
2. 按持久性与分享需求判断状态是否属于 URL；
3. 规范化 query 中的字符串、数组、空值和非法页码；
4. 分离搜索输入草稿与已提交 URL；
5. 搜索时重置页码，翻页时保留关键字；
6. 让后退/前进同步输入与数据请求；
7. 解释客户端路由 404 与服务器深链 404 的差异；
8. 说明路由守卫不提供对象授权。

## 3. 预备知识

安装 Router 并记录实际版本：

**命令：在 `apps/vue-web` 执行**

```bash
pnpm add vue-router
pnpm list vue-router --depth 0
```

不要根据教材猜补丁号。确认第 3 章 `useListings(q, page)` 可接受 computed 输入。

## 4. 核心理论

### 4.1 URL 是可分享状态容器

判断一个值是否进入 URL：

| 问题 | 是 | 否 |
| --- | --- | --- |
| 刷新后需要恢复吗 | 候选 URL 状态 | 可留局部 |
| 分享给别人有意义吗 | 候选 URL 状态 | 可留局部 |
| 后退/前进应恢复吗 | 候选 URL 状态 | 可留局部 |
| 包含未提交隐私或密码吗 | 不应进 URL | 留表单 |

q/page/id 属于 URL；登录密码、发布草稿和 pending 不属于 URL。服务器商品仍是 API 事实，
URL 只定位它，不复制资源。

### 4.2 路由读取与导航分工

`useRoute()` 读取当前响应式 route；`useRouter()` 发起 push/replace/back。不要直接修改
`route.query`。`RouterLink` 生成真实链接，可由键盘激活、复制和在新标签打开；`div @click`
没有这些语义。

### 4.3 草稿查询与已提交查询

若输入每个字符都 push，会制造大量历史记录。页面建立 `draftQ`，提交表单后一次 push；
当前 URL 的 q 才驱动 `useListings`。watch q 可让后退、前进和清除链接同步输入。

### 4.4 Query 不是已验证对象

Vue Router query 值可能是字符串、null 或数组。页码需要完整十进制正整数且在安全范围内，
否则回退 1。前端规范化改善体验，API 仍须再次限制页尺寸和页码。

### 4.5 History fallback

`createWebHistory` 使用正常路径。客户端内导航不请求新 HTML，但首次打开或刷新
`/listings/lamp-1` 时，服务器必须把非 API 路径回退到 `index.html`。API 路径绝不能回退 HTML，
否则 JSON 解析会得到协议错误。

## 5. 元素、属性、API 或配置清单

| API/配置 | 作用 | 关键边界 |
| --- | --- | --- |
| `createRouter` | 创建路由实例 | 每个客户端应用安装一次 |
| `createWebHistory` | 使用 History API 正常路径 | 生产服务器需 fallback |
| `RouterLink` | 语义链接与客户端导航 | 不用于提交写操作 |
| `RouterView` | 输出当前匹配组件 | 不创建浏览器窗口 |
| `useRoute` | 读取当前响应式 route | 不直接写 route |
| `useRouter` | push/replace/back | 导航失败需可观察 |
| `router.push` | 新增历史记录 | 搜索提交使用 |
| `router.replace` | 替换当前记录 | 只用于规范化等明确场景 |
| `route.params.id` | 读取路径参数 | 使用前转字符串并编码 API 路径 |
| `route.query` | 读取 query | 先规范化数组/null |

## 6. 最小可运行案例

### 6.1 Query 规范化

**完整文件：`apps/vue-web/src/route-query.ts`**

```ts
export function readQueryText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function readPositivePage(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return 1
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : 1
}
```

**完整文件：`apps/vue-web/src/route-query.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { readPositivePage, readQueryText } from './route-query'

describe('route-query-contract', () => {
  it.each([
    ['1', 1],
    ['20', 20],
    ['0', 1],
    ['-1', 1],
    ['1.5', 1],
    ['abc', 1],
    [['2'], 1],
    [null, 1],
  ])('normalizes page %j to %i', (input, expected) => {
    expect(readPositivePage(input)).toBe(expected)
  })

  it('accepts only one string query value', () => {
    expect(readQueryText('台灯')).toBe('台灯')
    expect(readQueryText(['台灯', '折叠桌'])).toBe('')
    expect(readQueryText(null)).toBe('')
  })
})
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm exec vitest run src/route-query.test.ts
```

### 6.2 可运行路由骨架

本课先用占位页保持路由树可运行，后两课再把详情、登录和发布替换为真实页面。

**完整文件：`apps/vue-web/src/pages/RoutePlaceholder.vue`**

```vue
<script setup lang="ts">
defineProps<{
  heading: string
  message: string
}>()
</script>

<template>
  <section>
    <h2>{{ heading }}</h2>
    <p>{{ message }}</p>
    <RouterLink to="/listings">返回商品列表</RouterLink>
  </section>
</template>
```

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/router.ts`**

```ts
import { createRouter, createWebHistory } from 'vue-router'
import ListPage from './pages/ListPage.vue'
import RoutePlaceholder from './pages/RoutePlaceholder.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/listings' },
    {
      path: '/listings',
      name: 'listings',
      component: ListPage,
    },
    {
      path: '/listings/:id',
      name: 'listing-detail',
      component: RoutePlaceholder,
      props: route => ({
        heading: '商品详情',
        message: `待读取商品：${String(route.params.id)}`,
      }),
    },
    {
      path: '/new',
      name: 'new-listing',
      component: RoutePlaceholder,
      props: { heading: '发布商品', message: '下一课接入发布表单。' },
    },
    {
      path: '/login',
      name: 'login',
      component: RoutePlaceholder,
      props: { heading: '教学登录', message: '下一课接入教学会话。' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: RoutePlaceholder,
      props: { heading: '404：页面不存在', message: '请返回商品列表。' },
    },
  ],
})
```

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/main.ts`**

```ts
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './style.css'

createApp(App).use(router).mount('#app')
```

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/App.vue`**

```vue
<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <main>
    <h1>邻里集市</h1>
    <p>
      <strong>
        本机教学 API：内存数据、演示身份，不代表生产授权或持久化。
      </strong>
    </p>
    <nav aria-label="主导航">
      <RouterLink to="/listings">商品</RouterLink>
      <RouterLink to="/new">发布</RouterLink>
      <RouterLink to="/login">登录</RouterLink>
    </nav>
    <RouterView />
  </main>
</template>
```

## 7. 邻里集市集成案例

**完整文件：`apps/vue-web/src/pages/ListPage.vue`**

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ListingCard from '../ListingCard.vue'
import { readPositivePage, readQueryText } from '../route-query'
import { useListings } from '../useListings'

const route = useRoute()
const router = useRouter()

const q = computed(() => readQueryText(route.query.q))
const page = computed(() => readPositivePage(route.query.page))
const draftQ = ref(q.value)
watch(q, (value) => {
  draftQ.value = value
})

const { resource, retry } = useListings(q, page)

async function search() {
  await router.push({
    name: 'listings',
    query: {
      q: draftQ.value.trim(),
      page: '1',
    },
  })
}

function pageLink(number: number) {
  return {
    name: 'listings',
    query: {
      q: q.value,
      page: String(number),
    },
  }
}
</script>

<template>
  <section aria-labelledby="list-page-title">
    <h2 id="list-page-title">商品列表</h2>
    <form role="search" @submit.prevent="search">
      <label for="listing-query">搜索标题</label>
      <input id="listing-query" v-model="draftQ" type="search" />
      <button>筛选</button>
      <RouterLink :to="{ name: 'listings' }">清除筛选</RouterLink>
    </form>

    <p v-if="resource.status === 'loading'" role="status">
      正在加载商品……
    </p>
    <section v-else-if="resource.status === 'error'" role="alert">
      <p>{{ resource.message }}</p>
      <p v-if="resource.requestId">请求编号：{{ resource.requestId }}</p>
      <button type="button" @click="retry">重试</button>
    </section>
    <template v-else>
      <p role="status">找到 {{ resource.data.total }} 件商品</p>
      <p v-if="resource.data.items.length === 0">没有匹配商品。</p>
      <ListingCard
        v-for="item in resource.data.items"
        :key="item.id"
        :listing="item"
      >
        <template #actions>
          <RouterLink
            :to="{ name: 'listing-detail', params: { id: item.id } }"
          >
            查看详情
          </RouterLink>
        </template>
      </ListingCard>

      <nav aria-label="商品分页">
        <RouterLink
          v-if="page > 1"
          :to="pageLink(page - 1)"
        >
          上一页
        </RouterLink>
        <RouterLink
          v-if="page * resource.data.pageSize < resource.data.total"
          :to="pageLink(page + 1)"
        >
          下一页
        </RouterLink>
      </nav>
    </template>
  </section>
</template>
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm typecheck
pnpm build
pnpm dev --host 127.0.0.1 --strictPort
```

打开 `/listings?q=台灯&page=1`，刷新后结果应保持。输入“折叠桌”但不提交，URL 和列表不变；
提交后 URL 更新。使用浏览器后退，输入值和列表都应恢复为“台灯”。

## 8. 常见错误与排查路径

**明确错误示例：只初始化搜索草稿。**

**关键片段：`apps/vue-web/src/pages/BadListPage.vue`**

```ts
const q = computed(() => readQueryText(route.query.q))
const draftQ = ref(q.value)
// 缺少 watch(q, ...)
```

页面首次正确，但后退时 URL 和请求变了，输入框仍显示旧值。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 后退后列表显示台灯，搜索框仍写折叠桌 |
| 证据 | 地址栏 q=台灯，Vue DevTools 中 computed q=台灯，draftQ=折叠桌 |
| 原因 | draftQ 只在 setup 初始化，没有跟随已提交 URL 变化 |
| 修复 | `watch(q, value => { draftQ.value = value })` |
| 复验 | 搜索两次并后退/前进，URL、输入、列表三者一致 |

另一个常见故障是开发内导航正常，生产刷新深路径却由服务器返回 404。检查静态服务器 fallback，
不要通过改成 hash history 掩盖部署配置，除非产品明确接受 hash URL。

## 9. 课后题

1. 为什么搜索输入草稿不应每个字符都 push URL？
2. 页码非法时前端回退 1，API 是否还要验证？
3. RouterLink 与 button 的语义差异是什么？
4. 路由守卫通过能否证明用户有预约权限？
5. 前端 NotFound 页面是否等于 HTTP 响应状态 404？

**参考答案：**

1. 会污染历史；提交后 URL 才代表已生效查询。
2. 仍要验证，客户端输入不可信。
3. Link 导航到资源位置，可复制/新开；button 执行动作。
4. 不能，后端必须根据会话、归属和状态授权。
5. 不等于。纯 SPA fallback 常先返回 200 HTML，再由客户端显示 404。

## 10. 实践练习

### 基础：清除 query

让清除链接回到 `/listings`，并验证输入同步为空。

**答案标准：**使用命名路由对象，不直接写 `window.location`；后退仍可恢复旧查询。

### 进阶：规范化非法页码

当 `/listings?page=-3` 打开时，用 `router.replace` 规范化为 page=1。

**答案标准：**只替换非法地址，不在 computed 内导航；避免产生额外历史记录。

### 故障注入：破坏 history fallback

用一个不回退 index 的静态服务器访问深路径。

**答案标准：**记录服务器 404 与客户端未启动证据；修复非 API fallback 后深链可加载，API 404 仍保持 JSON。

## 11. 阶段验收

- [ ] Router 依赖实际版本已记录。
- [ ] `/listings?q=台灯&page=1` 刷新结果一致。
- [ ] 输入草稿与 URL 已提交值职责分离。
- [ ] 搜索重置 page，分页保留 q。
- [ ] 后退/前进同步 URL、输入和列表。
- [ ] 非法页码和 query 数组得到确定规范化。
- [ ] 导航使用 RouterLink/真实 form，不用可点击 div。
- [ ] query 测试、类型检查和构建通过。

## 12. 常见问题

**为什么本课用占位页？**

先单独验证 Router 和 URL 所有权；后两课再替换具体页面，避免一次引入所有请求和写操作。

**可以 watch 整个 route 吗？**

不建议。只 watch 真正影响数据的 params/query，避免 hash 或无关 meta 触发请求。

**搜索提交应该 push 还是 replace？**

用户明确提交的新查询通常 push，便于后退；自动规范化非法地址更适合 replace。

**Vite 开发服务为什么深链通常可用？**

开发服务器提供 SPA fallback；生产静态服务器仍需单独配置和验证。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [Vue Router：开始使用](https://router.vuejs.org/guide/)
- [Vue Router：Composition API](https://router.vuejs.org/guide/advanced/composition-api.html)
- [Vue Router：History 模式](https://router.vuejs.org/guide/essentials/history-mode.html)
- [Vue Router：动态路由匹配](https://router.vuejs.org/guide/essentials/dynamic-matching.html)
- [Vue Router：命名路由](https://router.vuejs.org/guide/essentials/named-routes.html)

## 我现在能做到什么

我能让查询和对象身份成为可分享 URL，能规范化不可信 query，并能让刷新、后退和前进恢复一致页面。

## 单元导航

[返回章入口](../04-router-data.md) ·
[下一课：路由取数、取消与错误恢复](02-route-data-fetch-cancellation-errors.md)
