# 路由取数、取消与错误恢复

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 在导航完成后读取详情，处理组件复用、请求竞争、404/503 和重试 |
| 可观察产出 | `RouteParamProbe.vue`、`DetailPage.vue`、Router 详情接线 |
| 运行条件 | 上一课 Router、第 3 章 `api.ts` 与教学 API |
| 建议时间 | 120 分钟 |
| 完成证据 | 参数复用、取消旧读、missing/`__error` 恢复和构建结果 |

## 1. 任务背景

从 `/listings/lamp-1` 导航到 `/listings/desk-1` 时，Vue Router 可能复用同一个详情组件实例。
如果数据只在 `onMounted` 读取一次，URL 已改变，页面却仍显示台灯。

本课采用“导航后取数”：路由先进入目标组件，组件立即显示 loading，再根据当前 id 请求。
参数变化会让上一轮读请求失效。404 代表商品不存在，503 代表服务暂不可用，两者恢复方式不同。

## 2. 学习目标

完成后你应能：

1. 解释同一路由记录参数变化时的组件复用；
2. watch 精确 `route.params.id`，而不是整个 route；
3. 在每次参数变化时取消旧请求并重置资源状态；
4. 为详情读取提供显式 retry revision；
5. 区分路由 404、对象 404 和服务 503；
6. 在写操作返回前保存目标 ID，并在提交 UI 前检查当前路由；
7. 避免用强制 remount 掩盖生命周期错误；
8. 说明导航后取数与导航前守卫取数的权衡。

## 3. 预备知识

完成[URL 状态与导航](01-router-url-state-navigation.md)，确认以下路径可进入同一个详情路由：

```text
/listings/lamp-1
/listings/desk-1
/listings/missing
/listings/__error
```

第 3 章教学 API 中 `missing` 返回 404，`__error` 返回 503。若使用其他后端，应建立等价、可控
的测试 fixture，而不是依赖随机故障。

## 4. 核心理论

### 4.1 路由记录相同不等于重新挂载

两个 URL 都匹配 `/listings/:id`，Router 可以保留 `DetailPage` 实例，只更新 `route.params.id`。
这样局部状态可保留且避免无谓重建，但组件必须观察真正的数据输入。

用 `<RouterView :key="$route.fullPath">` 强制重建可以表面修复旧数据，却会丢失所有局部状态，
并掩盖未声明的依赖。除非产品明确需要新实例，否则优先 watch 参数。

### 4.2 导航后取数

本路线选择：

```text
URL 改变
  → Router 匹配并显示 DetailPage
  → resource=loading
  → 发起详情 GET
  → success / 404 / 503
```

优点是导航立即反馈，组件拥有自己的 loading/error。导航前取数可在进入前准备数据，但需设计
全局 pending、取消和错误导航。两种策略都不能绕过服务端授权。

### 4.3 参数精确依赖

watch source 只包含当前 id 和 retry revision。hash、无关 query 或 meta 改变不应重发详情请求。
ID 转成字符串后再用于 API，并通过 `encodeURIComponent` 编码路径段。

### 4.4 读与写的失效策略不同

旧详情 GET 可以 abort 并忽略。用户发起的预约 POST 即使页面已离开也可能在服务器成功；
不能把导航当作事务取消。写请求开始时保存 `targetId`，返回后：

```ts
if (String(route.params.id) !== targetId) return
```

只阻止把旧页面结果显示到新页面，不声称服务器操作被撤销。

### 4.5 状态码决定恢复

| 状态 | 含义 | 页面恢复 |
| --- | --- | --- |
| 404 | 对象不存在 | 返回列表，不盲目重试 |
| 503 | 服务暂不可用 | 保留当前位置，提供重试 |
| transport | 无连接等 | 检查服务/网络，提供重试 |
| abort | 参数已失效 | 静默，不显示错误 |

## 5. 元素、属性、API 或配置清单

| API/模式 | 作用 | 关键边界 |
| --- | --- | --- |
| `route.params.id` | 当前详情身份 | 先转字符串 |
| `watch(() => route.params.id)` | 响应参数复用 | 不 watch 整个 route |
| revision ref | 相同 ID 的显式重试 | 不伪造成功 |
| `AbortController` | 取消旧读 | 不取消已生效写事务 |
| `encodeURIComponent` | 编码 API 路径段 | 不用于完整 URL |
| `ApiError.status` | 选择恢复 UI | 不根据 message 文本猜状态 |
| `RouterLink` | 返回列表或登录 | 保留真实链接语义 |
| route ID guard | 阻止晚到写结果跨页面显示 | 不回滚服务器 |

## 6. 最小可运行案例

先不请求网络，只观察同一组件实例如何响应参数。

**完整文件：`apps/vue-web/src/lessons/RouteParamProbe.vue`**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()
const changes = ref(0)
const currentId = ref('')

watch(
  () => String(route.params.id ?? ''),
  (id) => {
    changes.value++
    currentId.value = id
  },
  { immediate: true },
)
</script>

<template>
  <section aria-labelledby="route-probe-title">
    <h2 id="route-probe-title">路由参数复用探针</h2>
    <p>当前商品：{{ currentId }}</p>
    <p>参数处理次数：{{ changes }}</p>
    <RouterLink to="/listings/lamp-1">台灯</RouterLink>
    <RouterLink to="/listings/desk-1">折叠桌</RouterLink>
  </section>
</template>
```

临时让 `listing-detail` 路由使用该组件。从台灯链接切换折叠桌，计数应递增而不是总回到 1，
证明实例被复用且 watcher 捕获变化。

渐进扩展：

1. 只显示 `route.params.id`；
2. 增加 watch 与次数；
3. 加两个 RouterLink；
4. 加计时器模拟慢读并在 cleanup 清除；
5. 替换为真实 HTTP 请求。

## 7. 邻里集市集成案例

**完整文件：`apps/vue-web/src/pages/DetailPage.vue`**

```vue
<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ListingCard from '../ListingCard.vue'
import { ApiError, api, isAbortError } from '../api'
import type { Listing } from '../domain'
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
    <ListingCard
      v-else
      :listing="resource.data"
    />

    <p v-if="operationMessage" role="status">{{ operationMessage }}</p>
    <RouterLink to="/listings">返回商品列表</RouterLink>
  </section>
</template>
```

更新详情路由：

**关键片段：`apps/vue-web/src/router.ts`**

```ts
import DetailPage from './pages/DetailPage.vue'

{
  path: '/listings/:id',
  name: 'listing-detail',
  component: DetailPage,
}
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm typecheck
pnpm build
pnpm dev --host 127.0.0.1 --strictPort
```

依次访问台灯、折叠桌、missing、`__error`。前两个显示不同资源；missing 引导返回列表且不显示
重试；`__error` 保留位置并提供重试。

## 8. 常见错误与排查路径

**明确错误示例：只在 mounted 读取参数。**

**关键片段：`apps/vue-web/src/pages/BadDetailPage.vue`**

```ts
onMounted(() => {
  void load(String(route.params.id))
})
```

同一路由参数改变时组件不一定重新 mounted，页面保留旧商品。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 地址从 `/lamp-1` 变为 `/desk-1`，卡片仍显示台灯 |
| 证据 | Vue DevTools 中 route.params.id 已是 desk-1，Network 没有新详情请求 |
| 原因 | 数据只在 onMounted 读取一次，组件实例被复用 |
| 修复 | watch 精确 id，并为每轮请求注册 abort 与过期守卫 |
| 复验 | 台灯/折叠桌快速切换，最终卡片总与地址 ID 一致 |

若 404 和 503 都显示同一按钮，检查是否保留 `ApiError.status`，不要解析 message 文本猜错误种类。

## 9. 课后题

1. 为什么详情参数变化不保证组件重建？
2. 强制给 RouterView 随机 key 有什么代价？
3. 404 和 503 的恢复动作为什么不同？
4. 写请求返回后检查 route ID 能否撤销服务器操作？
5. 导航后取数为什么需要明确 loading？

**参考答案：**

1. 相同路由记录可以复用实例，只更新响应式 route。
2. 每次导航销毁局部状态和资源，掩盖依赖错误。
3. 404 表示对象缺失，503 表示服务暂不可用，后者可重试。
4. 不能，只防止旧结果污染当前页面。
5. 路由已经显示目标组件，数据尚未返回，必须避免展示旧资源或假空状态。

## 10. 实践练习

### 基础：增加当前 ID

在 loading 文案中显示经过文本插值的当前 ID。

**答案标准：**只用于帮助识别目标；API 路径仍编码；不使用 `v-html`。

### 进阶：缓存前一次成功数据

比较“进入 loading 就清空”与“保留旧数据加刷新指示”。

**参考答案方向：**保留旧数据可减少闪烁，但必须明确标出旧数据且不能让用户对错误对象执行动作；
本教程选择清空以保持身份边界清晰。

### 故障注入：删除 abort

为两个 ID 配置不同延迟，快速切换。

**答案标准：**复现地址和商品不一致；恢复 abort 与写入守卫后结果稳定。

## 11. 阶段验收

- [ ] 同一详情实例能处理 lamp/desk 参数变化。
- [ ] 每轮 GET 都有同步 abort 清理和写入前过期检查。
- [ ] missing 显示对象 404 返回路径。
- [ ] `__error` 显示 503 与重试，不误作 404 或 empty。
- [ ] requestId 可见但 Cookie、堆栈和密钥不可见。
- [ ] 能解释晚到写结果的 route ID 守卫。
- [ ] 类型检查、测试和构建通过。

## 12. 常见问题

**为什么不使用 `beforeRouteUpdate`？**

它也能处理更新；本课的数据依赖直接由 id 表达，组合式 watch 更集中。需要阻止导航时再考虑守卫。

**详情数据应该放 Pinia 吗？**

当前只属于详情页面，没必要复制服务器资源到全局 store。共享缓存需要明确失效策略。

**错误后切换 ID 会怎样？**

watch 立即进入新 loading 并清空旧 operation message，错误不会跨对象保留。

**为什么 404 仍由 API 返回 JSON？**

对象 API 404 属于数据协议；服务器 SPA fallback 只处理非 API 页面路径。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [Vue Router：动态参数响应](https://router.vuejs.org/guide/essentials/dynamic-matching.html#reacting-to-params-changes)
- [Vue Router：数据获取](https://router.vuejs.org/guide/advanced/data-fetching.html)
- [Vue Router：Composition API](https://router.vuejs.org/guide/advanced/composition-api.html)
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

## 我现在能做到什么

我能在复用的路由组件中精确观察参数、取消旧读请求，并按 404/503 提供不同恢复路径。

## 单元导航

[上一课：Router 与 URL 状态](01-router-url-state-navigation.md) ·
[返回章入口](../04-router-data.md) ·
[下一课：教学登录、发布与预约冲突](03-auth-publish-reservation-conflicts.md)
