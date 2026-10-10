# 缓存组件实例时暂停资源，并为异步 Chunk 设计失败路径

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | 生命周期、动态 import、路由、错误状态 |
| 输入 | 面板切换、会话 epoch、计时器、异步 chunk |
| 输出 | KeepAlive 草稿缓存、资源暂停、loading/error/timeout |
| 文件 | `DraftPanel.vue`、`AdvancedLab.vue`、路由动态 import |
| 验证 | 草稿保留、ticks 暂停、无重复 timer、chunk 阻断 |
| 边界 | 实例缓存不是持久化，也不是服务端数据缓存 |

## 1. 任务背景

用户在发布页输入草稿，切到统计面板再返回，希望文本仍在。KeepAlive 可以缓存组件实例，但“没有卸载”也意味着 timer、订阅和观察器可能继续工作。若只在 `onUnmounted` 清理，隐藏组件仍消耗资源。

异步组件减少初始 bundle，却增加 chunk 加载失败、超时和旧部署资源丢失等新状态。加载 spinner 不是完整恢复策略。

## 2. 学习目标

- 区分 mounted/unmounted 与 activated/deactivated。
- 在停用时暂停资源，在激活时幂等恢复。
- 理解 include/exclude、组件 name、key、max 与淘汰。
- 用会话 epoch 销毁用户相关缓存。
- 为 `defineAsyncComponent` 和路由动态 import 提供 loading/error/timeout 与部署恢复。

## 3. 预备知识

KeepAlive 只缓存它的直接动态组件子节点。组件需要稳定 identity；`include/exclude` 按组件 `name` 匹配。动态路由组件通常直接使用 `() => import()`，Vue Router 不需要再包 `defineAsyncComponent`。

## 4. 核心理论

### 4.1 生命周期矩阵

| 时刻 | mounted | activated | deactivated | unmounted |
| --- | ---: | ---: | ---: | ---: |
| 首次进入缓存组件 | 是 | 是 | 否 | 否 |
| 切到其他组件 | 否 | 否 | 是 | 否 |
| 返回缓存组件 | 否 | 是 | 否 | 否 |
| 缓存淘汰/父级销毁 | 否 | 否 | 可能 | 是 |

资源启动函数必须先 stop 再 start，防止多次 activated 叠加。停用时保留草稿 state，但 timer、WebSocket、observer 和不需要的订阅应暂停。

### 4.2 缓存 identity 与用户边界

`max` 使用近似 LRU 淘汰，不保证永久保留。刷新页面全部消失。用户 A 的草稿不应在退出后给用户 B 看到；可以把会话 epoch 放在 KeepAlive 外层父节点 key，退出时重建整个缓存子树。

KeepAlive 缓存组件实例，不证明后端商品数据仍新鲜。重新激活详情页时仍可能需要重新验证库存和版本。

### 4.3 异步组件状态

`defineAsyncComponent` 可配置 delay、timeout、loading、error 和 `onError`。错误可能来自离线、CDN、部署后旧 HTML 引用已删除 hash chunk。重试要有次数上限；部署系统应保留旧资源一段时间或提示整页刷新。

官方 Suspense 仍有稳定性边界，本课程不把它当默认生产请求架构。异步组件加载和业务数据请求是两类状态，不能只用一个 fallback 混在一起。

## 5. 元素、属性、API 或配置清单

| API | 作用 | 本课用法 | 边界 |
| --- | --- | --- | --- |
| `<KeepAlive>` | 缓存动态组件实例 | `max=2` | 不持久化 |
| `include/exclude` | 按 name 选缓存 | `defineOptions({ name })` | 不按 URL 猜 |
| `onActivated` | 首次/再次激活 | 幂等 start | 可能多次调用 |
| `onDeactivated` | 离开缓存视图 | stop 资源 | state 仍保留 |
| `onUnmounted` | 最终销毁 | 兜底 stop | 切页不一定发生 |
| `defineAsyncComponent` | 异步加载普通组件 | loading/error/timeout | 路由可直接 import |
| dynamic `import()` | 创建分包边界 | route component | 不自动预取数据 |
| `key` | 定义实例身份 | 会话 epoch 重建 | 随机 key 会丢缓存 |

## 6. 最小可运行案例

**完整文件：`apps/vue-web/src/DraftPanel.vue`**

```vue
<script setup lang="ts">
import { onActivated, onDeactivated, onUnmounted, ref } from 'vue'

defineOptions({ name: 'DraftPanel' })

const text = ref('')
const ticks = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

function stop() {
  if (timer !== undefined) clearInterval(timer)
  timer = undefined
}

function start() {
  stop()
  timer = setInterval(() => {
    ticks.value += 1
  }, 1000)
}

onActivated(start)
onDeactivated(stop)
onUnmounted(stop)
</script>

<template>
  <section>
    <h2>缓存草稿实验</h2>
    <label>实验草稿 <textarea v-model="text" /></label>
    <p role="status">激活计时 {{ ticks }} 秒</p>
  </section>
</template>
```

**关键片段：`apps/vue-web/src/AdvancedLab.vue`**

```vue
<KeepAlive :max="2">
  <DraftPanel v-if="tab === 'draft'" />
  <StatsPanel v-else />
</KeepAlive>
```

输入草稿，等待 ticks 增长，切走 3 秒再返回。草稿保留，隐藏期间 ticks 不增长；多次切换后每秒仍只加 1。错误实验是删除 `onDeactivated(stop)`，隐藏期间计时继续；恢复后复验。

## 7. 邻里集市集成案例

### 7.1 异步统计面板

**关键片段：`apps/vue-web/src/AdvancedLab.vue`**

```ts
import { defineAsyncComponent, h, ref } from 'vue'

const AsyncStats = defineAsyncComponent({
  loader: () => import('./StatsPanel.vue'),
  delay: 120,
  timeout: 5000,
  loadingComponent: {
    render: () => h('p', { role: 'status' }, '正在载入统计组件……'),
  },
  errorComponent: {
    render: () => h('p', { role: 'alert' }, '组件载入失败，请刷新页面。'),
  },
  onError(error, retry, fail, attempts) {
    if (attempts <= 2 && /fetch|network/i.test(error.message)) retry()
    else fail()
  },
})
const tab = ref<'draft' | 'stats'>('draft')
```

默认 runtime-only 构建不编译运行时 template 字符串，因此轻量 loading/error 组件用 `h()`。

### 7.2 路由分包与会话缓存

**关键片段：`apps/vue-web/src/router.ts`**

```ts
{
  path: '/listings/:id',
  name: 'listing-detail',
  component: () => import('./pages/DetailPage.vue'),
}
```

路由直接动态 import。应用外层使用会话 epoch 重建用户草稿缓存：

```vue
<KeepAlive :key="store.epoch" :max="3">
  <component :is="activePanel" />
</KeepAlive>
```

真正路由缓存通常通过 RouterView slot 选择组件；不要无条件缓存所有页面。详情重新激活时检查 route id 并重取可能过期的 Listing。退出导致 epoch 改变，前用户草稿实例被销毁。

### 7.3 Chunk 失败恢复

在 DevTools Network 阻断 `StatsPanel` chunk，页面应进入 alert。恢复网络后可提供“重新加载应用”按钮；旧部署 hash 缺失时刷新获取新 HTML/manifest。无限自动重试会放大故障。

## 8. 常见错误与排查路径

**错误示例：只在卸载时停 timer。**

```ts
onMounted(start)
onUnmounted(stop)
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 隐藏页仍发请求/计时 | Performance/日志持续 | deactivated 非 unmounted | 停用时 stop | 隐藏期间静止 |
| 返回后每秒加 2 | 多个 interval ID | start 不幂等 | start 先 stop | 每秒只加 1 |
| 用户 B 看见 A 草稿 | logout 后实例仍缓存 | 缓存 key 无会话边界 | epoch 重建 | 新用户为空 |
| 异步页永久 loading | Network chunk 404 | 无 error/timeout | 配置失败状态与恢复 | 5 秒内 alert |
| include 不生效 | DevTools 名称不匹配 | 组件无稳定 name | `defineOptions` | 仅目标被缓存 |
| 详情显示旧库存 | 激活后没重取 | 把实例缓存当数据缓存 | onActivated 重新验证 | 409/最新状态可见 |

## 9. 课后题

1. **KeepAlive 等于 localStorage 吗？**<br>
   答：不等于。它只在当前应用内缓存组件实例，会淘汰，刷新即消失。
2. **为何首次进入也会调用 onActivated？**<br>
   答：缓存组件挂载后立即处于激活状态，资源初始化应放在可重复的 start。
3. **路由组件为何不需要 defineAsyncComponent？**<br>
   答：Vue Router 已理解返回 Promise 的动态 import，并管理导航加载。
4. **异步 chunk 成功是否代表业务数据成功？**<br>
   答：不代表；代码加载和 API 请求是独立状态。

## 10. 实践练习

**基础：暂停资源。**切走 3 秒后返回，ticks 差值应不包含隐藏时间。

**进阶：会话隔离。**输入草稿后调用 store reset 递增 epoch，断言新缓存实例草稿为空。

**故障注入：阻断 chunk。**确认 loading 转 error；恢复资源并整页刷新后成功。答案标准包含 Network 404/blocked 证据和有限重试，不使用无限 spinner。

## 11. 阶段验收

- [ ] 草稿切换后保留，刷新后不宣称保留。
- [ ] deactivated 停止 timer/订阅，activated 幂等恢复。
- [ ] 多次切换无资源叠加。
- [ ] include/exclude 使用显式组件 name。
- [ ] logout/epoch 销毁用户相关缓存。
- [ ] 异步组件有 loading、error、timeout 和有限重试。
- [ ] 详情激活重新验证服务端事实。
- [ ] 实验结束恢复主入口并构建通过。

## 12. 常见问题

**可以缓存整个 RouterView 吗？**<br>
可以按路由 meta 精确选择，但认证页、错误页和含敏感草稿页面需要逐项判断；无条件缓存会保留过期和私有状态。

**KeepAlive 的 max 应该是多少？**<br>
没有通用值。依据组件内存、切换频率和设备 profile 决定，并验证淘汰后的恢复行为。

**Chunk 404 是否只需 retry？**<br>
不一定。部署已删除旧资源时同一 URL 永远 404，应该获取新 HTML/manifest 或保留旧静态资源，而不是无限重试。

## 13. 扩展阅读

资料快照日期：2026-10-10。

- [Vue KeepAlive](https://vuejs.org/guide/built-ins/keep-alive.html)：缓存、生命周期与 include。
- [Vue Async Components](https://vuejs.org/guide/components/async.html)：loading/error/timeout/retry。
- [Vue Router Lazy Loading](https://router.vuejs.org/guide/advanced/lazy-loading.html)：路由动态 import。
- [Vue Suspense](https://vuejs.org/guide/built-ins/suspense.html)：实验性边界与事件。

## 我现在能做到什么

我能在缓存组件状态的同时暂停资源、隔离用户会话，并把异步代码加载的等待、失败和部署恢复设计成显式状态。

## 单元导航

[上一课：Teleport 与对话框](02-teleport-transition-dialog-accessibility.md) · [返回章入口](../07-performance-advanced-vue.md) · [下一章：SSR 与结业验收](../08-ssr-capstone.md)
