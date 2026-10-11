# 用 provide/inject 传服务，并隔离每次 SSR 请求

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | Pinia setup store、Vue 应用工厂、组合式 API |
| 输入 | 金额显示策略、只读偏好、SSR 请求 |
| 输出 | 类型化 `InjectionKey`、缺失 provider 错误、每请求 Pinia |
| 文件 | `src/display.ts`、应用入口、`createApplication()` |
| 验证 | provider 正常/缺失测试、两个 SSR 工厂实例互不污染 |
| 边界 | 注入不改变组件逻辑树；Pinia 序列化不等于安全 |

## 1. 任务背景

`ListingCard` 需要格式化金额。把 `money` 逐层传递会污染与显示策略无关的布局组件；把函数和币种配置都塞进 Pinia，又会把服务依赖伪装成业务状态。

`provide/inject` 适合沿逻辑组件树传递服务、只读配置或受控命令。Pinia 适合当前应用实例共享的响应式业务反馈。二者都依赖“应用实例”边界，因此 SSR 服务器必须为每个请求重新创建 app、router 和 Pinia。

## 2. 学习目标

- 使用 `InjectionKey<T>` 保持注入身份与 TypeScript 类型一致。
- 对缺失 provider 快速失败，避免静默回退掩盖接线错误。
- 用 `readonly()` 加命令函数定义共享可变状态的写边界。
- 区分 DOM Teleport 与逻辑 provider 链。
- 创建每请求应用工厂，并解释安全序列化和私有状态边界。

## 3. 预备知识

知道 `app.provide()`、组件级 `provide()` 与 `inject()` 沿父子组件关系解析。复习上一课的 `market` store；本课不扩展收藏查询契约，也不把收藏恢复写成已实现。

## 4. 核心理论

### 4.1 服务依赖不是另一份全局 state

金额格式器是一个能力：输入整数分，输出本地化文本。它没有需要被 DevTools 时间旅行的业务状态。测试可提供固定格式器，使断言不依赖机器 locale。

若提供响应式偏好，应提供只读值和明确命令：

```ts
provide(preferenceKey, {
  locale: readonly(locale),
  changeLocale,
})
```

消费者不能任意写 `locale.value`，但可以请求 `changeLocale('zh-CN')`。这仍只是客户端显示偏好，不改变后端存储的 UTC 时间或整数分。

### 4.2 注入按逻辑树解析

Teleport 只改变真实 DOM 位置，不改变组件父子关系。因此被 Teleport 的对话框仍能 inject 原逻辑祖先提供的服务。字符串 key 容易碰撞且类型宽松；模块级 `Symbol()` 配合 `InjectionKey` 提供唯一身份。

### 4.3 SSR 中应用实例是数据隔离边界

在模块顶层创建：

```ts
export const pinia = createPinia()
```

浏览器单应用可工作，但 Node 进程会让多个请求复用同一容器。用户 A 的 `user/favoriteIds` 可能出现在用户 B 渲染中。SSR 工厂必须每次执行：

```text
request → createSSRApp + createPinia + createRouter → render → 丢弃
```

即使每请求隔离，序列化 `pinia.state.value` 仍需只包含页面必需字段、转义 `<`，并排除 Cookie、CSRF 秘密、密码、内部错误和不应公开的用户对象。

## 5. 元素、属性、API 或配置清单

| API | 责任 | 正确用法 | 边界 |
| --- | --- | --- | --- |
| `InjectionKey<T>` | key 与值类型绑定 | 模块级唯一 Symbol | 运行时仍需 provider |
| `app.provide()` | 应用级服务 | mount/render 前注册 | 不是进程级单例许可 |
| `provide()` | 组件子树覆盖 | setup 同步调用 | 后代优先取最近 provider |
| `inject()` | 读取依赖 | 封装成 `useDisplay()` | 默认值可能掩盖接线错误 |
| `readonly()` | 禁止消费者直接写 | 值 + 命令 | 不是深层安全沙箱 |
| `createSSRApp()` | 建立可水合应用 | 客户端和服务端同组件 | 初始输入必须一致 |
| `createPinia()` | 建立 store 容器 | SSR 每请求一次 | 不能跨用户复用 |
| `setActivePinia()` | 测试激活容器 | 每测试新实例 | 不用于生产请求共享 |

## 6. 最小可运行案例

**完整文件：`apps/vue-web/src/display.ts`**

```ts
import { inject } from 'vue'
import type { InjectionKey } from 'vue'

export type DisplayService = {
  money: (cents: number) => string
}

export const displayKey: InjectionKey<DisplayService> = Symbol('display')

export function useDisplay(): DisplayService {
  const service = inject(displayKey)
  if (!service) throw new Error('未注册显示服务。')
  return service
}
```

**完整文件：`apps/vue-web/src/DisplayLab.vue`**

```vue
<script setup lang="ts">
import { useDisplay } from './display'

const { money } = useDisplay()
</script>

<template>
  <p>九成新台灯：{{ money(3500) }}</p>
</template>
```

**关键片段：`apps/vue-web/src/main.ts`**

```ts
const display = {
  money: (cents: number) =>
    new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(cents / 100),
}

createApp(DisplayLab)
  .provide(displayKey, display)
  .mount('#app')
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm exec vue-tsc -b
pnpm dev
```

预期显示“九成新台灯：¥35.00”（具体空格/货币符号形式由 `Intl` 实现决定）。删除 `.provide()` 应明确抛出“未注册显示服务”，这就是故障证据；恢复 provider 后复验。

## 7. 邻里集市集成案例

### 7.1 卡片使用服务

**关键片段：`apps/vue-web/src/ListingCard.vue`**

```vue
<script setup lang="ts">
import { useDisplay } from './display'
import type { Listing } from './domain'

defineProps<{ listing: Listing }>()
const { money } = useDisplay()
</script>

<template>
  <article>
    <h2>{{ listing.title }}</h2>
    <p>{{ listing.description }}</p>
    <p>{{ money(listing.priceCents) }}</p>
  </article>
</template>
```

测试时提供确定输出：

```ts
mount(ListingCard, {
  props: { listing: lamp },
  global: {
    provide: {
      [displayKey as symbol]: { money: cents => `${cents} cents` },
    },
  },
})
```

### 7.2 每请求应用工厂

**关键片段：`apps/vue-web/ssr-lab/src/app.ts`**

```ts
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

export function createApplication(server: boolean) {
  const app = createSSRApp(App)
  const pinia = createPinia()
  const router = createRouter({
    history: server ? createMemoryHistory() : createWebHistory(),
    routes: [{ path: '/', component: () => import('./MarketPage.vue') }],
  })
  app.provide(displayKey, displayService)
  app.use(pinia)
  app.use(router)
  return { app, pinia, router }
}
```

隔离测试的核心断言：

```ts
const first = createApplication(true)
const second = createApplication(true)
expect(first.pinia).not.toBe(second.pinia)
```

如果服务端需要注入初始公开状态，在当前请求的 Pinia 上写入，再安全序列化。客户端必须在首次 `useStore()` 前恢复同一快照。当前领域契约没有收藏查询接口，所以不能凭空在 SSR 快照中恢复用户收藏；公开列表和私有会话也不能使用相同公共缓存。

## 8. 常见错误与排查路径

**错误示例：进程级 Pinia。**

```ts
const pinia = createPinia()
export function createApplication() {
  return createSSRApp(App).use(pinia)
}
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 卡片启动即崩溃 | 堆栈指向 `useDisplay` | 根未 provide | 在应用工厂注册 | 正常显示金额 |
| 测试输出受本机语言影响 | CI 与本机文本不同 | 测试使用真实 Intl | 注入固定 fake | 文本断言稳定 |
| 两个 SSR 请求共享用户 | 两次工厂返回同一 Pinia | 模块顶层单例 | 工厂内创建 | 实例与 state 均不同 |
| 消费者任意改 locale | inject 暴露可写 ref | 无命令边界 | `readonly` + action | 直接写出现开发警告 |
| 快照含私有用户 | HTML initial JSON 可见 | 序列化整个 store | 只挑公开页面字段 | 搜索敏感键无结果 |

诊断 SSR 泄漏时，使用两个不同初始值顺序渲染并比较原始 HTML；不要只在一个请求中观察 DevTools。

## 9. 课后题

1. **Teleport 后为什么仍能 inject 原 provider？**<br>
   答：Teleport 改变 DOM 挂载点，不改变逻辑组件父子树。
2. **缺失 provider 应返回默认金额格式吗？**<br>
   答：核心服务应快速失败，默认值会掩盖入口接线错误；可选能力才适合明确默认值。
3. **每请求 Pinia 能否自动保证初始 JSON 安全？**<br>
   答：不能。隔离解决跨请求共享，序列化仍需字段最小化与 HTML 安全转义。
4. **为何不把显示服务放入 store？**<br>
   答：它是可替换能力，不是需要业务追踪的响应式事实；注入更符合依赖方向。

## 10. 实践练习

**基础：可替换服务。**为测试注入 `money: cents => String(cents)`，断言卡片显示 `3500`，不依赖 locale。

**进阶：只读语言偏好。**提供 `readonly(locale)` 与 `changeLocale`，组件只能调用命令。验收标准：TypeScript 不允许给只读 ref 赋值。

**故障注入：SSR 串状态。**故意把 Pinia 移到模块顶层，先给请求 A 写 `demo-buyer`，再创建请求 B。失败证据是 B 读到 A；修复后两个实例不同且 B 为空。

## 11. 阶段验收

- [ ] `InjectionKey<DisplayService>` 不使用裸字符串。
- [ ] 缺失 provider 有明确错误，恢复后金额正确。
- [ ] 可变注入只暴露只读值与命令。
- [ ] `createApplication()` 每次新建 app/router/Pinia。
- [ ] 原始 HTML 不含 Cookie、密码、CSRF 值或私有收藏。
- [ ] 公开列表与用户内容的缓存策略分开。
- [ ] 收藏刷新限制仍明确记录，没有虚构查询 API。

运行：

```bash
pnpm exec vue-tsc -b
pnpm exec vitest run
pnpm build
```

## 12. 常见问题

**Pinia 插件能否做全局单例？**<br>
插件定义可以复用，但保存请求数据的 Pinia 实例必须每请求创建。插件自身也不能把用户状态留在模块变量。

**什么时候使用组件 props 而不是 inject？**<br>
当数据是组件公开输入、直接父子关系清晰或中间层也需要理解它时，用 props。inject 适合跨深层传服务或环境能力。

**SSR 是否必须序列化全部 Pinia？**<br>
不必须。只序列化首屏水合真正需要且允许公开的普通数据；也可以让某些客户端状态在挂载后再加载。

## 13. 扩展阅读

资料快照日期：2026-10-10。

- [Vue provide/inject](https://vuejs.org/guide/components/provide-inject.html)：逻辑树、响应性与 Symbol key。
- [Vue TypeScript Composition API](https://vuejs.org/guide/typescript/composition-api.html#typing-provide-inject)：`InjectionKey`。
- [Pinia SSR](https://pinia.vuejs.org/ssr/)：每请求状态和安全注入。
- [Vue SSR 指南](https://vuejs.org/guide/scaling-up/ssr.html)：跨请求污染与平台 API 边界。

## 我现在能做到什么

我能把可替换服务与业务状态分开，建立类型化只读注入，并用每请求应用工厂阻止 SSR 用户状态交叉。

## 单元导航

[上一课：会话与收藏并发](02-session-favorites-concurrency.md) · [返回章目录](../README.md#第五章pinia依赖注入与状态架构) · [下一章：测试与无障碍](../06-testing-accessibility/01-pure-component-store-tests.md)
