# Vue 教材覆盖矩阵

> 证据快照：2026-10-11。矩阵列出 Batch C 计划中的全部 24 个教程路径；每篇均使用统一 13 节结构，六类证据可按下表节号定位。

## 读法

| 列 | 含义 |
| --- | --- |
| 理论 | 教程 `§4 核心理论` |
| 最小案例 | 教程 `§6 最小可运行案例` |
| 项目案例 | 教程 `§7 邻里集市集成案例` |
| 错误诊断 | 教程 `§8 常见错误与排查路径` |
| 练习 | 教程 `§9–10` 的答案与三层练习 |
| 验收 | 教程 `§11 阶段验收` |

## 计划路径登记

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VSFC-01 | SFC、模板编译、转义与作用域 | [SFC 与模板编译](01-sfc-templates/01-sfc-template-compiler.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSFC-02 | props、slots、指令与列表 identity | [Props、Slots 与列表 identity](01-sfc-templates/02-props-slots-list-identity.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSFC-03 | Vite、Vue、TypeScript 与首个市场 | [Vite TypeScript 首个市场](01-sfc-templates/03-vite-typescript-first-market.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VRCT-01 | ref、reactive、computed 与更新队列 | [响应式与派生更新](02-reactivity-events-forms/01-ref-reactive-computed-updates.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VRCT-02 | 组件事件、v-model、金额与表单状态 | [事件、v-model 与表单](02-reactivity-events-forms/02-component-events-v-model-forms.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VRCT-03 | 搜索、发布与状态所有权 | [本地市场状态所有权](02-reactivity-events-forms/03-search-publish-state-ownership.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VLIF-01 | 生命周期、watch 与清理 | [生命周期与 Watch 清理](03-lifecycle-composables/01-lifecycle-watch-cleanup.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VLIF-02 | HTTP、取消、浅层快照与资源状态 | [HTTP 取消与资源状态](03-lifecycle-composables/02-fetch-http-abort-resource-state.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VLIF-03 | Composable、重试与本机 API | [Composable 与本机 API](03-lifecycle-composables/03-composables-local-api-retry.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VRTR-01 | Router、URL、历史与查询归一化 | [Router 与 URL 状态](04-router-data/01-router-url-state-navigation.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VRTR-02 | 路由数据、取消、复用与错误 | [路由数据与错误恢复](04-router-data/02-route-data-fetch-cancellation-errors.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VRTR-03 | 登录、发布、预约与冲突 | [认证、发布与预约冲突](04-router-data/03-auth-publish-reservation-conflicts.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPIN-01 | 状态所有权分类 | [状态所有权与 Pinia](05-pinia-architecture/01-state-ownership-pinia-store.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPIN-02 | setup store 的 state/getter/action | [状态所有权与 Pinia](05-pinia-architecture/01-state-ownership-pinia-store.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPIN-03 | `storeToRefs` 与响应式解构 | [状态所有权与 Pinia](05-pinia-architecture/01-state-ownership-pinia-store.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPIN-04 | 会话读取、登录与退出语义 | [会话、收藏与并发](05-pinia-architecture/02-session-favorites-concurrency.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPIN-05 | 幂等收藏与失败保持 | [会话、收藏与并发](05-pinia-architecture/02-session-favorites-concurrency.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPIN-06 | 每 ID busy 与 epoch 乱序隔离 | [会话、收藏与并发](05-pinia-architecture/02-session-favorites-concurrency.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPIN-07 | InjectionKey、只读服务与缺失 provider | [provide/inject 与 SSR](05-pinia-architecture/03-provide-inject-store-ssr.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPIN-08 | 每请求 Pinia 与收藏查询缺口 | [provide/inject 与 SSR](05-pinia-architecture/03-provide-inject-store-ssr.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VTST-01 | 金额与草稿表驱动测试 | [纯函数、组件与 Store 测试](06-testing-accessibility/01-pure-component-store-tests.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VTST-02 | Vue Test Utils 表单成功/失败 | [纯函数、组件与 Store 测试](06-testing-accessibility/01-pure-component-store-tests.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VTST-03 | Pinia deferred Promise 顺序测试 | [纯函数、组件与 Store 测试](06-testing-accessibility/01-pure-component-store-tests.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VTST-04 | `onErrorCaptured` 渲染恢复 | [路由、浏览器与无障碍](06-testing-accessibility/02-router-browser-accessibility-errors.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VTST-05 | 路由标题、焦点与状态语义 | [路由、浏览器与无障碍](06-testing-accessibility/02-router-browser-accessibility-errors.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VTST-06 | Playwright 主路径与两页冲突 | [路由、浏览器与无障碍](06-testing-accessibility/02-router-browser-accessibility-errors.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VTST-07 | ESLint 10、vue-tsc 与门禁顺序 | [ESLint、CI 与证据边界](06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VTST-08 | 冻结安装、严格端口与 CI 证据 | [ESLint、CI 与证据边界](06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VTST-09 | 与 React 对等的 10 个共享业务场景与风险分层 | [流式、Nuxt 与最终验收](08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPER-01 | 性能成本分层与生产测量 | [测量与浅层响应](07-performance-advanced-vue/01-performance-shallow-reactivity-measurement.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPER-02 | computed 与 shallowRef 根替换 | [测量与浅层响应](07-performance-advanced-vue/01-performance-shallow-reactivity-measurement.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPER-03 | 分页、虚拟化、稳定 props 与 v-memo | [测量与浅层响应](07-performance-advanced-vue/01-performance-shallow-reactivity-measurement.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPER-04 | Teleport、原生 dialog 与 model 同步 | [Teleport 与可用对话框](07-performance-advanced-vue/02-teleport-transition-dialog-accessibility.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPER-05 | 焦点恢复、Escape 与减少动态 | [Teleport 与可用对话框](07-performance-advanced-vue/02-teleport-transition-dialog-accessibility.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPER-06 | KeepAlive 激活、停用与资源清理 | [KeepAlive 与异步组件](07-performance-advanced-vue/03-keepalive-async-components-lifecycle.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPER-07 | 缓存 identity、淘汰与用户隔离 | [KeepAlive 与异步组件](07-performance-advanced-vue/03-keepalive-async-components-lifecycle.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VPER-08 | 异步组件、路由分包与 chunk 失败 | [KeepAlive 与异步组件](07-performance-advanced-vue/03-keepalive-async-components-lifecycle.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSSR-01 | CSR、SSR、SSG 与混合模式 | [渲染模式与水合](08-ssr-capstone/01-rendering-modes-hydration-contract.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSSR-02 | createSSRApp 水合与相同初始输入 | [渲染模式与水合](08-ssr-capstone/01-rendering-modes-hydration-contract.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSSR-03 | 无 JavaScript GET 搜索与 mismatch | [渲染模式与水合](08-ssr-capstone/01-rendering-modes-hydration-contract.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSSR-04 | Vite SSR 工厂与 Router history | [Vite Vue SSR 与请求隔离](08-ssr-capstone/02-vite-vue-ssr-serialization-isolation.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSSR-05 | 安全 JSON、可信上游与超时 | [Vite Vue SSR 与请求隔离](08-ssr-capstone/02-vite-vue-ssr-serialization-isolation.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSSR-06 | 200/503/404 与公私缓存 | [Vite Vue SSR 与请求隔离](08-ssr-capstone/02-vite-vue-ssr-serialization-isolation.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSSR-07 | 流式 shell、错误、断开与中止 | [流式、Nuxt 与最终验收](08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSSR-08 | server prefetch、Teleport SSR 与异步水合的采用门禁；最终快照明确未实现 | [流式、Nuxt 与最终验收](08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSSR-09 | Nuxt 边界与唯一完整快照 | [流式、Nuxt 与最终验收](08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VCMP-01 | Vue 3.5.43、Pinia、Router 与 Vite 8 | [唯一完整快照](08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md) | §4–5 | §6 | §7 | §8 | §9–10 | §11 |
| VCMP-02 | TS7 主线与 TS6/vue-tsc 兼容线 | [ESLint、CI 与证据边界](06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VCMP-03 | Node 24、pnpm、锁文件与历史证据 | [唯一完整快照](08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md) | §3–5 | §6 | §7 | §8 | §9–10 | §11 |
| VSEC-01 | HttpOnly Cookie、401 与前端授权边界 | [会话、收藏与并发](05-pinia-architecture/02-session-favorites-concurrency.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSEC-02 | XSS 安全序列化与 SSRF 上游限制 | [Vite Vue SSR 与请求隔离](08-ssr-capstone/02-vite-vue-ssr-serialization-isolation.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VSEC-03 | 预约事务、冲突、CSRF/CORS/秘密边界 | [唯一完整快照](08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md) | §4–5 | §6 | §7 | §8 | §9–10 | §11 |
| VMAN-01 | 键盘、焦点、320px、200% 与 reduced motion | [路由、浏览器与无障碍](06-testing-accessibility/02-router-browser-accessibility-errors.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VMAN-02 | Chromium 证据不得外推到 VoiceOver、NVDA、JAWS、Safari、Firefox 与移动设备 | [ESLint、CI 与证据边界](06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md) | §4 | §6 | §7 | §8 | §9–10 | §11 |
| VMAN-03 | 生产 SSR、真实后端、部署、负载与性能缺口 | [唯一完整快照](08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md) | §4–5 | §6 | §7 | §8 | §9–10 | §11 |

## 统计

- 计划教程路径：24。
- 当前已存在并具有统一 13 节证据的教程：24。
- 矩阵证据行：54。
- 专门边界行：兼容 3、安全 3、人工/生产缺口 3。

[Vue 学习路线](README.md) · [第 5 章](05-pinia-architecture.md) · [第 8 章与唯一快照](08-ssr-capstone.md)
