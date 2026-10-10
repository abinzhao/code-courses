# 建立每请求隔离、可安全序列化的 Vite Vue SSR

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | 上一课水合契约、Vue Router、Pinia、Node HTTP |
| 输入 | 请求 URL、公开商品上游、模板 |
| 输出 | app/router/Pinia 工厂、200/503/404、安全 initial JSON |
| 路径 | `apps/vue-web/ssr-lab`（独立于 SPA 入口） |
| 验证 | curl、两个请求隔离、`</script>`、超时与状态 |
| 边界 | Vite middleware 是开发实验，不是生产双构建服务器 |

## 1. 任务背景

把 `renderToString(App)` 放进 Node 服务器只是起点。真实 SSR 还要根据 URL 初始化 router、为每请求创建 Pinia、处理上游超时、把公开快照安全嵌入 HTML、返回正确 status，并避免把请求 Host 当任意内网访问地址。

本课搭建这些边界，但不重复最终项目全部文件；唯一可重建快照在下一课。

## 2. 学习目标

- 为服务端使用 memory history，为客户端使用 web history。
- 每请求创建 app/router/Pinia 并等待 router ready。
- 安全序列化 JSON，阻止 `</script>` 提前闭合元素。
- 限制 SSR 上游地址、超时、HTTP/schema 与缓存策略。
- 让 404、503 与 500 保持不同语义。

## 3. 预备知识

实验目录与主 SPA 隔离：

```text
apps/vue-web/
  src/
  ssr-lab/
    index.html
    server.mjs
    vite.config.ts
    src/
      app.ts
      entry-server.ts
      entry-client.ts
      App.vue
```

Vite dev SSR 通过 `ssrLoadModule` 转换服务端入口；生产需要客户端 build、SSR build、manifest、静态资源缓存与进程管理，不能直接部署该 middleware 实验。

## 4. 核心理论

### 4.1 每请求工厂

工厂输入公开快照和运行环境，输出新 app/router/Pinia。服务端先 `router.push(url)` 再 `await router.isReady()`；客户端由当前地址初始化并等待 ready 后 mount。

模块可以复用纯函数、组件定义和无请求状态的配置；不能复用保存用户数据的 store 实例、router 或 app。

### 4.2 JSON 在 HTML 中的双重语境

`JSON.stringify` 产生合法 JSON，却不保证能安全放进 `<script>`。HTML parser 遇到 `</script>` 会提前结束元素，即使 type 是 `application/json`。

至少转义：

```text
<      → \u003c
U+2028 → \u2028
U+2029 → \u2029
```

用 replacer 函数插入，避免 replacement string 中 `$` 产生特殊替换语义。客户端读取 `textContent` 再 JSON.parse。

### 4.3 上游与缓存

SSR 服务器的 `API_ORIGIN` 必须来自受控配置白名单，不从请求 Host 或 query 拼接任意绝对 URL，防止 SSRF。为 fetch 设置 AbortSignal timeout、检查 `response.ok`、验证 JSON shape。

公开列表可按完整 `q/page/locale` 键短时缓存；用户会话、收藏和预约必须 private/no-store。SSR 快照是时点数据，写操作仍由 API 再授权。

## 5. 元素、属性、API 或配置清单

| API/配置 | 责任 | 本课规则 | 风险 |
| --- | --- | --- | --- |
| `createMemoryHistory` | 服务端无浏览器地址 | push 当前 URL | 忘记 push 渲染错误页 |
| `createWebHistory` | 客户端地址栏 | 水合当前页面 | 静态服务器需 fallback |
| `router.isReady()` | 等初始导航 | 两端等待 | 不替代数据验证 |
| `renderToString` | 完整字符串 SSR | 收集 teleports context | 上游串行拖慢 TTFB |
| `ssrLoadModule` | Vite 开发加载 | middleware 实验 | 不是生产运行方式 |
| `AbortSignal.timeout` | 上游超时 | 明确毫秒数 | 中止不回滚写操作 |
| `Cache-Control` | 响应缓存边界 | 实验 `no-store` | 公私混缓存泄漏 |
| `textContent` | 读取 JSON script | 不用 innerHTML | 仍需 schema 验证 |

## 6. 最小可运行案例

先独立验证安全序列化。

**完整文件：`apps/vue-web/ssr-lab/src/serialize.ts`**

```ts
export function serializeForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}
```

**完整文件：`apps/vue-web/ssr-lab/src/serialize.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { serializeForHtml } from './serialize'

describe('safe initial data', () => {
  it('不产生可闭合 script 的文本', () => {
    const output = serializeForHtml({
      title: '</script><script>globalThis.pwned=true</script>',
    })
    expect(output).not.toContain('</script>')
    expect(output).toContain('\\u003c/script>')
    expect(JSON.parse(output).title).toContain('</script>')
  })
})
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm exec vitest run ssr-lab/src/serialize.test.ts
```

错误实验是只 `JSON.stringify`，测试应失败；恢复转义后通过。

## 7. 邻里集市集成案例

### 7.1 应用工厂

**关键片段：`apps/vue-web/ssr-lab/src/app.ts`**

```ts
export function createApplication(initial: InitialData, server: boolean) {
  const app = createSSRApp(App, { initial })
  const pinia = createPinia()
  const router = createRouter({
    history: server ? createMemoryHistory() : createWebHistory(),
    routes: [{ path: '/', component: App }],
  })
  app.use(pinia)
  app.use(router)
  return { app, pinia, router }
}
```

根组件直接接收 `initial`，示例 router 只用于展示请求隔离。真实 RouterView 应把 shell 与 route page 分开，避免同一个 App 同时作为根和路由组件。

### 7.2 服务端入口

**关键片段：`apps/vue-web/ssr-lab/src/entry-server.ts`**

```ts
export async function render(url: string) {
  const parsed = new URL(url, 'http://ssr.local')
  const q = parsed.searchParams.get('q') ?? ''
  const initial = await loadPublicListings(q, {
    signal: AbortSignal.timeout(3000),
  })
  const { app, router } = createApplication(initial, true)
  await router.push(parsed.pathname + parsed.search)
  await router.isReady()
  const context: Record<string, unknown> = {}
  const html = await renderToString(app, context)
  return { html, initial, teleports: context.teleports ?? {}, status: initial.error ? 503 : 200 }
}
```

`loadPublicListings` 只访问受控 API origin，错误映射为公开消息和 503。解析失败返回 502/500 的选择应按系统契约统一，本教学快照用 503 表示演示数据源不可用。

### 7.3 Node 响应

**关键片段：`apps/vue-web/ssr-lab/server.mjs`**

```js
const pathname = new URL(url, 'http://ssr.local').pathname
if (pathname !== '/') {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('页面不存在')
  return
}
const result = await render(url)
const output = template
  .replace('<!--app-html-->', () => result.html)
  .replace('<!--app-data-->', () => serializeForHtml(result.initial))
res.writeHead(result.status, {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
})
res.end(output)
```

404 在进入 Vue SSR 前返回；`__error` 渲染带恢复链接的 503 页面；异常堆栈只写服务器日志，响应使用安全通用文本。

## 8. 常见错误与排查路径

**错误示例：用请求 Host 拼上游。**

```ts
const api = `http://${request.headers.host}/internal/listings`
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 第二用户看到第一用户 | 两请求 Pinia identity 相同 | 进程单例 | 工厂内创建 | `not.toBe` |
| 页面出现第二个 script | HTML parser 统计为 2 | `<` 未转义 | 安全 serializer | 始终 2 个预期 script |
| SSR 永久等待 | 上游无超时 | fetch 无 signal | timeout + 503 | 3 秒内恢复页 |
| 可访问任意内网 | URL 来自 Host/query | SSRF | 配置白名单 origin | 非法 origin 拒绝启动 |
| 错误页仍 200 | response status 固定 | 忽略业务状态 | 映射 503/404 | curl status 正确 |
| 服务端 timer 泄漏 | setup 顶层 setInterval | SSR 不运行 unmounted | onMounted 中启动 | 多请求无 timer 增长 |

## 9. 课后题

1. **为什么每请求新 Pinia 仍不能序列化 Cookie？**<br>
   答：隔离只防跨请求共享，Cookie 仍是敏感凭据且不应进入公开 HTML。
2. **Node fetch 会自动带浏览器 Cookie 吗？**<br>
   答：不会；私有 SSR 必须只向可信上游显式转发最小必要身份，并设置 private/no-store。
3. **为何不用用户 Host 当 API origin？**<br>
   答：攻击者可控制 Host 诱导服务器访问任意目标，构成 SSRF/路由混淆。
4. **renderToString 何时会拖慢 TTFB？**<br>
   答：它等待渲染依赖完成后一次输出；慢上游或大树会推迟首字节。

## 10. 实践练习

**基础：状态矩阵。**用 curl 验证正常 200、`__error` 503、不存在查询 200 空态、未知路径 404。

**进阶：请求隔离。**创建两个 factory，在第一个 Pinia 写用户，断言第二个 state 不含该用户。

**故障注入：恶意标题。**注入 `</script><script>...`，用 HTML parser 统计 script 节点，数量不得增加，解析后的标题仍保留原文。

## 11. 阶段验收

- [ ] 每请求新 app/router/Pinia。
- [ ] 服务端 memory history、客户端 web history。
- [ ] 两端等待 router ready。
- [ ] initial JSON 转义 `<`、U+2028、U+2029。
- [ ] raw HTML 无 Cookie、密码、CSRF、私有用户和服务器 secret。
- [ ] 上游 origin 受控且有超时/status/schema 检查。
- [ ] 200/503/404 与恢复内容正确。
- [ ] 开发 middleware 未被描述为生产发布。

## 12. 常见问题

**可以使用第三方序列化库吗？**<br>
可以，但要核对其 XSS 语境、类型恢复和版本。引入库不免除字段最小化与私有数据审查。

**SSR 中 Pinia state 必须全部注入吗？**<br>
不必。只注入首屏真正需要的公开普通数据；个人状态可在客户端挂载后通过 `/auth/me` 获取。

**Teleport SSR 放在哪里？**<br>
`renderToString` context 的 `teleports` 单独返回，应插入专用稳定容器。不能随意拼到 body 后再让客户端猜。

## 13. 扩展阅读

资料快照日期：2026-10-10。

- [Vite SSR](https://vite.dev/guide/ssr)：开发加载与生产构建。
- [Vue SSR API](https://vuejs.org/api/ssr.html)：render context、teleports 和 streams。
- [Pinia SSR](https://pinia.vuejs.org/ssr/)：状态注入与 XSS。
- [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)：上游地址控制。

## 我现在能做到什么

我能建立请求级 Vue SSR 工厂、安全 initial data、真实 HTTP 状态和可信上游边界，并分清开发实验与生产发布。

## 单元导航

[上一课：渲染模式与水合](01-rendering-modes-hydration-contract.md) · [返回章入口](../08-ssr-capstone.md) · [下一课：流式、Nuxt 与最终验收](03-streaming-nuxt-capstone-acceptance.md)
