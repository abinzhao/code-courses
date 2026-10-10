# 从渲染模式选择推导水合不变量

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | 浏览器解析、Vue 渲染、HTTP、路由 |
| 输入 | 公开商品、查询 URL、客户端交互 |
| 输出 | 渲染模式决策、相同首屏输入、渐进增强表单 |
| 实验 | random、localStorage、非法 HTML、时区 mismatch |
| 验证 | raw HTML、禁用 JS、hydration 0→1、Console |
| 边界 | SSR 先有内容不等于立即可交互或一定更快 |

## 1. 任务背景

邻里集市公开商品列表需要分享链接、搜索引擎可读内容和无 JavaScript 的基本搜索；个人收藏和预约则必须在客户端根据当前会话重新确认。把所有页面强制 SSR 会增加服务器成本与缓存风险，把所有页面 CSR 又让公开首屏等待 JS 和数据。

正确问题不是“SSR 是否先进”，而是每个页面的内容来源、更新频率、首屏要求、个性化程度和运行成本。

## 2. 学习目标

- 比较 CSR、SSR、SSG 和混合渲染的输入、输出与失效成本。
- 解释服务端渲染与客户端水合是两次独立执行。
- 定义“首次 DOM 与客户端首次虚拟树一致”的水合不变量。
- 用 GET form 保留无 JavaScript 搜索。
- 复现并修复随机值、浏览器 API、非法嵌套和时区导致的 mismatch。

## 3. 预备知识

SSR 首先是 HTTP：服务器根据 URL 产生状态码、响应头和 HTML。浏览器解析 HTML 后可以先显示内容；随后下载客户端模块，Vue 用 `createSSRApp().mount('#app')` 在现有 DOM 上建立事件。

需要分别测：

- TTFB 与原始 HTML 内容；
- 内容出现时间；
- 客户端代码下载/执行；
- hydration 完成与按钮可操作时间；
- 后续 API 新鲜度。

## 4. 核心理论

### 4.1 四种模式

| 模式 | HTML 生成 | 适用 | 主要成本/风险 |
| --- | --- | --- | --- |
| CSR | 浏览器 | 高交互内部工具 | 首屏等待 JS/数据 |
| SSR | 每请求服务器 | 公开、变化频繁首屏 | TTFB、服务器容量、隔离 |
| SSG | 构建阶段 | 稳定内容 | 更新需重建/再验证 |
| 混合 | 按页面/区域 | 公开列表 SSR、私有操作客户端 | 边界和缓存更复杂 |

SSR 的“可见快照”不授予预约权限。即使 HTML 写着 available，点击时后端仍可能返回 409。

### 4.2 水合不变量

服务器和客户端必须以相同组件、相同 props、相同路由、相同公开快照产生相同初始结构。服务器实例不会搬到浏览器；initial data 是显式跨边界协议。

不稳定来源：

- `Math.random()`、`Date.now()`；
- 服务端没有的 `window/localStorage`；
- 服务端与浏览器不同时区的格式化；
- 浏览器会修正的非法 HTML 嵌套；
- 客户端在 mount 前重新请求并得到不同数据。

解决方法是把首屏值放进安全快照、固定格式策略，或等 mounted 后再显示纯客户端值。`data-allow-mismatch` 只用于已理解且不可避免的差异，不是消音器。

### 4.3 渐进增强

```html
<form action="/" method="get">
  <label>搜索标题 <input name="q"></label>
  <button>筛选</button>
</form>
```

不拦截默认提交时，禁用 JS 仍可请求筛选 HTML。水合后可以增强为客户端导航，但不能破坏基本语义。

## 5. 元素、属性、API 或配置清单

| API/机制 | 责任 | 本课检查 | 边界 |
| --- | --- | --- | --- |
| `createSSRApp` | 服务端/客户端 SSR 应用 | 同一组件与初始数据 | 不自动取数 |
| `renderToString` | 生成完整 HTML 字符串 | raw HTML 有内容 | 等待导致 TTFB |
| `app.mount` | 水合并建立事件 | 0→1 | HTML 可见不代表已完成 |
| GET form | 无 JS 导航 | q 出现在 URL | 敏感写操作不能用 GET |
| `router.isReady` | 等初始导航 | 两端都等待 | 不替代业务预取 |
| `onServerPrefetch` | 组件服务端预取 | 可选 | 客户端仍需同快照 |
| `data-allow-mismatch` | 声明已知差异 | 极少使用 | 不修复错误结构 |
| Console recoverable warning | 水合证据 | 应为空 | 生产也需监控 |

## 6. 最小可运行案例

**完整文件：`apps/vue-web/ssr-lab/src/HydrationLab.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ initialTitle: string }>()
const count = ref(0)
</script>

<template>
  <main>
    <h1>{{ initialTitle }}</h1>
    <button type="button" @click="count += 1">水合检查：{{ count }}</button>
  </main>
</template>
```

**关键片段：服务端与客户端**

```ts
const initialTitle = '邻里集市'
// server
const html = await renderToString(createSSRApp(HydrationLab, { initialTitle }))
// client：读取同一安全快照
createSSRApp(HydrationLab, { initialTitle }).mount('#app')
```

服务端 HTML 应含“水合检查：0”；客户端点击变 1，Console 无 mismatch。

错误实验：

```vue
<p>{{ Math.random() }}</p>
```

两端值不同会出现 hydration warning。修复为服务端生成 `requestId` 并放入快照，客户端复用；如果值只属于客户端，mounted 后再显示且首屏结构保持一致。

## 7. 邻里集市集成案例

公开列表初始数据：

```ts
type PublicInitialData = {
  q: string
  items: Array<{
    id: string
    title: string
    description: string
    priceCents: number
    status: 'available' | 'reserved' | 'sold'
    ownerId: string
    version: number
    createdAt: string
  }>
  error: string
}
```

只序列化公开页面需要字段，不包含 Cookie、CSRF token、密码、私有用户对象或收藏。金额仍是整数分，时间仍是 UTC ISO 8601；若服务器首屏格式化时间，必须固定 locale/timeZone，或水合后再按用户环境本地化。

模板保留 GET 搜索：

```vue
<form action="/" method="get">
  <label>搜索标题 <input v-model="query" name="q"></label>
  <button>筛选</button>
</form>
```

`q=__error` 返回 503 与恢复链接，未知商品路径返回 404，空搜索结果返回 200 空态。真实 status 是监控、缓存和爬虫语义的一部分，不能所有页面都 200。

## 8. 常见错误与排查路径

**错误示例：客户端 mount 前重新取数。**

```ts
const initial = await fetch('/api/v1/listings').then(r => r.json())
createSSRApp(App, { initial }).mount('#app')
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 随机文本 mismatch | Console 显示 server/client 不同 | 两端各自 random | 快照复用 | warning 消失 |
| SSR `window is not defined` | 服务器堆栈 | setup 顶层读浏览器 API | mounted 内读取 | SSR 200 |
| DOM 结构 mismatch | Elements 与源 HTML 不同 | 非法嵌套被浏览器修正 | 修复语义 HTML | DOM 一致 |
| 日期只在部分机器警告 | 不同时区输出不同 | 初始本地化策略不固定 | 固定时区或 mounted 本地化 | 跨时区一致 |
| 无 JS 搜索无效 | form 被 JS-only button 替代 | 无原生提交路径 | GET form | 禁 JS 后筛选 |
| 内容可见但按钮不动 | 客户端模块仍加载 | 把 SSR 当交互完成 | 分别测内容与水合 | hydration 后 0→1 |

## 9. 课后题

1. **SSR 是否意味着不需要客户端 JavaScript？**<br>
   答：不一定。静态内容可不水合，但本课按钮和客户端状态需要 hydration。
2. **为何公开列表可以缓存而会话面板不能公共缓存？**<br>
   答：列表对所有用户相同；会话含用户私有状态，公共缓存会泄漏。
3. **SSG 能否永久写“可预约”？**<br>
   答：不能，构建快照会过期；预约时后端必须重新检查并发状态。
4. **禁用 JS 搜索通过能证明 hydration 正确吗？**<br>
   答：不能；它证明渐进增强，hydration 还需启用 JS 后交互与 Console 检查。

## 10. 实践练习

**基础：随机值故障。**复现 warning，改为快照字段，断言 raw HTML 与客户端一致。

**进阶：时区边界。**用两个 `TZ` 运行服务端，证明默认格式可能不同；修复为 UTC/固定时区首屏。

**故障注入：非法嵌套。**把 `<div>` 放进 `<p>`，观察浏览器修正 DOM 和 hydration 警告，修复语义结构。

## 11. 阶段验收

- [ ] 能为公开列表说明 SSR 选择理由和成本。
- [ ] raw HTML 含商品与计数 0。
- [ ] 禁用 JS 后 GET 搜索仍可用。
- [ ] 启用 JS 后 0→1 且 Console 无 mismatch。
- [ ] 四类故障均有“现象、证据、原因、修复、复验”。
- [ ] 初始数据只含公开普通对象。
- [ ] 200/503/404 语义明确。

## 12. 常见问题

**能否用 `ClientOnly` 包住所有不一致内容？**<br>
可以隔离真正客户端专属区域，但滥用会放弃 SSR 内容并掩盖不稳定数据设计。

**SSR 一定改善 Core Web Vitals 吗？**<br>
不一定。慢上游会增加 TTFB，大 JS 仍会拖慢 INP；必须按目标设备和真实部署测量。

**hydration 前用户点击怎么办？**<br>
原生链接/GET form 可工作；只依赖 JS 的按钮可能暂时无响应。可减少首屏 JS、采用渐进增强并监测交互时机。

## 13. 扩展阅读

资料快照日期：2026-10-10。

- [Vue SSR Guide](https://vuejs.org/guide/scaling-up/ssr.html)：水合、跨请求污染与平台 API。
- [Vue `createSSRApp`](https://vuejs.org/api/application.html#createssrapp)：SSR 应用入口。
- [Vue SSR API](https://vuejs.org/api/ssr.html)：字符串与流式渲染接口。
- [Vite SSR Guide](https://vite.dev/guide/ssr)：开发和生产构建边界。

## 我现在能做到什么

我能按页面需求选择渲染模式，并用相同首屏输入、渐进增强和故障实验建立可验证的 hydration 契约。

## 单元导航

[返回章入口](../08-ssr-capstone.md) · [下一课：Vite Vue SSR 与请求隔离](02-vite-vue-ssr-serialization-isolation.md)
