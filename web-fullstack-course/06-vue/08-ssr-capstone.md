# 08 渲染模式、SSR 水合与 Vue 结业验收

## 本章任务

为邻里集市公开商品列表建立可渐进增强的 Vue SSR：原始 HTML 可见、无 JavaScript 时 GET 搜索可用、客户端使用相同快照水合、每请求 app/router/Pinia 隔离，404 与 503 返回真实状态。

第三篇教程拥有本卷唯一完整最终项目快照。前七章的完整小实验和聚焦片段仍是教学证据，但不得再拼出另一份“最终项目”，避免两套源码漂移。

## 前置知识

- 完成第 1–7 章：SFC、响应式、组合式函数、路由、Pinia、测试与进阶组件。
- 能解释公开数据与用户私有数据的缓存差异。
- 理解 HTML 解析、JSON/HTML 上下文转义、HTTP status 与 AbortSignal。
- 不把 SSR 理解成“没有 JavaScript”或“自动更快”。

## 学习路线

| 顺序 | 教程 | 产出 | 建议投入 |
| --- | --- | --- | ---: |
| 1 | [渲染模式与水合不变量](08-ssr-capstone/01-rendering-modes-hydration-contract.md) | CSR/SSR/SSG/混合决策、渐进增强、 mismatch 故障证据 | 3 小时 |
| 2 | [Vite Vue SSR、安全序列化与请求隔离](08-ssr-capstone/02-vite-vue-ssr-serialization-isolation.md) | app 工厂、200/503/404、可信上游、缓存与生命周期 | 5 小时 |
| 3 | [流式渲染、Nuxt 边界与最终验收](08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md) | 唯一完整快照、测试、构建、SSR、Chromium 验收 | 8 小时 |

## 章级综合任务

从第三课完整文件块重建到全新的 `/tmp/full-course-verification-batch-c-vue.*`：

1. 冻结并记录 Node、pnpm 与依赖版本。
2. 运行 lint、`vue-tsc`、Vitest 与 Vite build。
3. SSR 请求 `/?q=台灯` 得 200 且原始 HTML 含“九成新台灯”。
4. `/?q=__error` 得 503 与恢复链接；`/?q=不存在` 得 200 空态；`/missing` 得 404。
5. 标题含 `</script>` 时 initial JSON 只含 `\u003c/script>`，不得生成第二个 script 元素。
6. 禁用 JavaScript 后 GET 搜索仍返回筛选 HTML。
7. 启用 JavaScript 后水合计数从 0 到 1，Console 无 mismatch。
8. 两次 SSR 工厂创建的 app/router/Pinia 互不共享。
9. 初始 JSON 不含 Cookie、CSRF 值、密码、私有用户对象或服务器秘密。

## 验收证据

- [ ] 能说明为何该页面选择 SSR，而内部后台可以继续 CSR。
- [ ] 随机值、localStorage、非法 HTML、时区四类 mismatch 均可复现与修复。
- [ ] `createSSRApp` 在服务端和客户端使用相同初始输入。
- [ ] router 服务端 memory history，客户端 web history，并分别等待 ready。
- [ ] 每请求新建 Pinia，不导出进程级用户 singleton。
- [ ] JSON 安全转义、可信 `API_ORIGIN`、超时、status/schema 检查边界明确。
- [ ] Teleport SSR、异步组件、流式错误/中止和 Nuxt 只按真实范围描述。
- [ ] 所有已执行/未执行验证均使用实际结果，不复制历史数量。

## 完成标准

能从 HTTP 原始响应一直解释到浏览器水合；能设计公开/私有缓存、请求隔离和失败状态；能从唯一快照重建并运行项目；知道开发 SSR 与生产双构建、CDN、真实后端、负载和辅助技术验收之间仍有距离。

[上一章：性能证据与进阶 Vue](07-performance-advanced-vue.md) · [Vue 学习路线](README.md) · [课程结业项目](../09-fullstack/06-graduation-project.md)
