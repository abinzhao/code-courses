# 先分清所有者，再建立 Pinia Store

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | 路由查询、组合式函数、`ref/computed`、HTTP 资源状态 |
| 输入 | 页面中现有的查询、草稿、商品页、会话摘要与收藏反馈 |
| 输出 | 状态分类表和一个类型完整的 Pinia setup store |
| 文件 | `apps/vue-web/src/stores/market.ts`、`SessionSummary.vue` |
| 验证 | `vue-tsc -b`、构建、浏览器中登录后摘要同步 |
| 边界 | 不把服务端分页、Cookie 凭据或表单草稿搬进 Pinia |

## 1. 任务背景

邻里集市已经有路由、列表请求和发布表单。现在页头、详情页和登录页都要读取会话；详情页还要显示当前浏览器会话内已确认的收藏反馈。直接逐层传 props 会让中间组件承担无关职责，但“用了 Pinia”也不意味着所有状态都应全局化。

先回答四个问题：谁创建状态、谁可以修改、何时失效、刷新后由谁恢复。只有多个远距离组件共同读取且生命周期属于应用实例的客户端状态，才进入本章 store。

## 2. 学习目标

- 区分局部草稿、URL 状态、服务端事实和共享客户端反馈。
- 把 setup store 中的 `ref`、`computed`、函数映射为 state、getter、action。
- 正确使用 `storeToRefs`，避免普通解构丢失响应性。
- 让 store 暴露完整可观察状态，同时把写入集中在有业务语义的 action。
- 解释 Pinia 不提供持久化、授权、事务或服务端数据新鲜度。

## 3. 预备知识

先完成[路由与服务端数据](../04-router-data/03-auth-publish-reservation-conflicts.md)。本课沿用 `/api/v1/auth/me` 和 `/api/v1/favorites/:listingId`。会话凭据是同源 HttpOnly Cookie，浏览器代码只读取会话摘要，不读取 Cookie 值。

在应用目录安装并确认：

```bash
pnpm add pinia
pnpm list vue pinia --depth 0
```

课程快照是 Vue 3.5.43；Pinia 补丁以实际锁文件为准，不把安装时的 `latest` 伪装成教材固定值。

## 4. 核心理论

### 4.1 状态分类

| 状态 | 所有者 | 失效方式 | 放置位置 |
| --- | --- | --- | --- |
| 搜索 `q/page` | URL | 新导航 | Vue Router |
| 发布表单草稿 | 表单实例 | 成功提交或显式重置 | 组件局部 `ref` |
| 商品分页和预约状态 | 后端 | 重取、冲突、缓存失效 | 请求层/页面资源 |
| 当前用户摘要 | 当前应用与后端会话 | 401、登录、退出 | Pinia |
| 本会话已确认收藏 ID | 当前应用 | 退出、刷新、后端失败 | Pinia，并标明易失 |
| 金额格式函数 | 应用环境 | 应用重建 | `provide/inject` 服务 |

把商品页复制进 store 会产生两份事实：路由加载器认为商品可预约，store 可能仍保留旧状态。Pinia 只能让数据响应式，不能决定何时重新验证。

### 4.2 setup store 的公开契约

`defineStore('market', () => {})` 中：

- `ref` 成为 state；
- `computed` 成为 getter；
- 返回的函数成为 action；
- 未返回却影响 UI 的响应式状态会绕过 DevTools、插件和 SSR 序列化。

“完整暴露”不等于允许任意组件修改。组件通过 action 表达“刷新会话”“设置收藏目标”，而不是各自拼接数组。Pinia 默认允许直接写 state，团队仍需用模块契约限制写入方向。

### 4.3 响应式解构

store 本身是响应式对象，模板可直接访问 `store.user`。普通解构：

```ts
const { user } = store
```

取得当前值，后续替换 `store.user` 时局部变量不会更新。`storeToRefs(store)` 为 state/getter 创建保持连接的 ref；action 不需要转换，直接用 `store.loadSession`。

## 5. 元素、属性、API 或配置清单

| API | 责任 | 本课用法 | 失败边界 |
| --- | --- | --- | --- |
| `createPinia()` | 创建应用级容器 | 每个客户端应用一次 | SSR 不能跨请求复用 |
| `app.use(pinia)` | 注册插件 | 在使用 store 前执行 | 顺序错误导致无活动 Pinia |
| `defineStore()` | 声明 store | setup 形式 | 不自动持久化 |
| `ref()` | 可变 state | `user/status/favoriteIds` | 普通解构丢连接 |
| `computed()` | 派生 getter | 收藏数量、是否登录 | getter 应保持纯函数 |
| `storeToRefs()` | 保留 state/getter 响应性 | 页头解构 | action 不放入其中 |
| `$reset()` | option store 重置 | 本课 setup store 自定义 `reset` | setup store 无自动 `$reset` |
| `$dispose()` | 释放 store 订阅 | 高级测试/应用销毁 | 不等于后端退出 |

## 6. 最小可运行案例

先用一个不发网络请求的 store 观察解构差异。

**完整文件：`apps/vue-web/src/stores/counter.ts`**

```ts
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)
  function increment() {
    count.value += 1
  }
  return { count, doubled, increment }
})
```

**完整文件：`apps/vue-web/src/CounterLab.vue`**

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useCounterStore } from './stores/counter'

const store = useCounterStore()
const { count, doubled } = storeToRefs(store)
</script>

<template>
  <section>
    <h1>Pinia 最小实验</h1>
    <p role="status">计数 {{ count }}，两倍 {{ doubled }}</p>
    <button type="button" @click="store.increment">增加</button>
  </section>
</template>
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm exec vue-tsc -b
pnpm dev
```

临时把根组件指向 `CounterLab.vue`。连续点击后应得到 `1/2`、`2/4`。错误实验是改成 `const { count } = store`：模板中的局部 `count` 停在初值。恢复 `storeToRefs` 后复验。完成实验后恢复主入口。

## 7. 邻里集市集成案例

下面只给出状态骨架；网络顺序和失败收敛在下一课完成。

**关键片段：`apps/vue-web/src/stores/market.ts`**

```ts
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type UserSummary = { id: string; name: string }
type SessionStatus = 'unknown' | 'loading' | 'ready' | 'error'

export const useMarketStore = defineStore('market', () => {
  const user = ref<UserSummary | null>(null)
  const sessionStatus = ref<SessionStatus>('unknown')
  const sessionError = ref('')
  const favoriteIds = ref<string[]>([])
  const busyById = ref<Record<string, boolean>>({})
  const epoch = ref(0)

  const favoriteCount = computed(() => favoriteIds.value.length)
  const authenticated = computed(() => user.value !== null)

  function resetClientSession() {
    epoch.value += 1
    user.value = null
    favoriteIds.value = []
    busyById.value = {}
  }

  return {
    user, sessionStatus, sessionError, favoriteIds, busyById, epoch,
    favoriteCount, authenticated, resetClientSession,
  }
})
```

**关键片段：`apps/vue-web/src/SessionSummary.vue`**

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useMarketStore } from './stores/market'

const store = useMarketStore()
const { user, favoriteCount, sessionStatus } = storeToRefs(store)
</script>

<template>
  <aside aria-label="当前会话">
    <p v-if="sessionStatus === 'loading'" role="status">正在读取会话……</p>
    <p v-else-if="user">{{ user.name }}，收藏 {{ favoriteCount }} 件</p>
    <a v-else href="/login">登录后可收藏</a>
  </aside>
</template>
```

项目接线在 `main.ts` 中创建一次 Pinia：

```ts
const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
```

这里没有把 `Listing[]`、搜索词或草稿放进 store。刷新会清空 `favoriteIds`，因为领域契约没有 `GET /favorites`；这是一条真实限制，不通过 `localStorage` 暗造认证关联。

## 8. 常见错误与排查路径

**错误示例：复制服务端列表并随意直接写。**

```ts
const listings = ref<Listing[]>([])
// 页面请求、预约 action 和路由加载都可能写这份副本。
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 登录后页头不更新 | DevTools 中 store 已变，局部变量未变 | 普通解构 state | 改用 `storeToRefs` 或直接访问 store | 登录后名称立即变化 |
| 详情状态与列表冲突 | 两处保存同一 Listing | 服务端事实被复制 | 请求层保留单一资源所有者 | 预约后重新验证两页 |
| 测试报无活动 Pinia | `getActivePinia()` 为空 | 使用 store 前未注册/激活 | 应用 `use`，测试 `setActivePinia` | 测试独立通过 |
| 刷新后收藏消失 | Network 没有收藏查询 | 缺恢复契约 | 明示易失；后端先增加查询协议 | 不再虚报持久化 |

诊断记录必须按“现象 → 证据 → 原因 → 修复 → 复验”保存。看到 UI 不更新时先检查 store 是否真的变更，再判断是响应连接还是请求失败。

## 9. 课后题

1. **为什么 `favoriteCount` 不应是第二份可写 state？**<br>
   答：它完全由 `favoriteIds.length` 决定；双写会产生不同步，`computed` 保持单一事实源。
2. **Pinia 能否证明用户有权收藏或预约？**<br>
   答：不能。前端状态只协调界面，后端依据会话和对象规则授权。
3. **普通 composable 与 Pinia 的关键区别是什么？**<br>
   答：composable 每次调用通常创建独立状态；同一 Pinia 实例中，同 ID store 返回共享实例。
4. **为什么 URL 查询不进入 store？**<br>
   答：URL 已负责分享、刷新和历史恢复；复制会产生两个导航事实源。

## 10. 实践练习

**基础：状态分类。**为发布 pending、路由页码、当前用户、商品库存、币种格式器填写四问表。验收标准是每项只有一个主要所有者。

**进阶：派生视图。**增加 `isFavorite(id)` action 或 getter，不增加 `favoriteCount` 可写字段。验收为同一 ID 不重复、取消后数量减少。

**故障注入：响应丢失。**把 `storeToRefs` 改成普通解构并截图/记录现象，再恢复。答案标准：能指出 store 已更新而模板局部值未跟踪属性替换。

## 11. 阶段验收

- [ ] store 返回所有影响 UI 的 state/getter/action。
- [ ] state/getter 解构全部经过 `storeToRefs`。
- [ ] 搜索、页码、表单草稿、商品分页不在 Pinia。
- [ ] 计数最小实验可连续更新，类型检查通过。
- [ ] 刷新收藏限制在界面或说明中明确可见。
- [ ] 能口述 Pinia 不负责持久化、权限和事务。

失败证据包括 `vue-tsc` 非零退出、登录后摘要停在旧值、同一商品重复计数，或刷新恢复被误写成已完成。

## 12. 常见问题

**可以完全禁止直接写 store state 吗？**<br>
Pinia 技术上允许直接写；可以通过团队约定、action API 和代码审查收紧。不要为了“私有”隐藏影响 SSR/DevTools 的响应式 state。

**需要把所有 getter 都做成 computed 吗？**<br>
只有可由现有 state 纯派生且被多个消费者使用时才需要。单个模板的简单表达式可以留在组件。

**为什么不在 localStorage 保存收藏？**<br>
本课收藏与登录用户绑定，浏览器本地副本无法证明服务端状态，也可能跨退出泄露前一用户反馈。

## 13. 扩展阅读

资料快照日期：2026-10-10。

- [Pinia Core Concepts](https://pinia.vuejs.org/core-concepts/)：setup store 映射和公开状态。
- [Pinia State](https://pinia.vuejs.org/core-concepts/state.html)：重置、订阅和直接写入边界。
- [Pinia SSR](https://pinia.vuejs.org/ssr/)：请求隔离与状态注入。
- [Vue 响应式基础](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)：代理和 ref 的读取规则。

## 我现在能做到什么

我能先按生命周期和事实来源分类状态，再建立一个范围明确、响应连接正确且不冒充后端的 Pinia store。

## 单元导航

[返回章目录](../README.md#第五章pinia依赖注入与状态架构) · [下一课：会话、收藏与并发收敛](02-session-favorites-concurrency.md)
