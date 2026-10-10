# 06 测试、无障碍与错误恢复

## 本章任务

为第 5 章的邻里集市建立风险分层证据：纯函数测试金额边界，组件测试失败保留草稿，store 测试响应乱序，浏览器测试覆盖路由、键盘、冲突与恢复，质量门禁再把这些命令按依赖顺序串起来。

测试通过只说明其真实穿过的层。Mock API 不能证明数据库唯一约束，jsdom 不能证明布局与屏幕阅读器体验，单个 Chromium 也不能代表 Safari、Firefox、VoiceOver、NVDA 或 JAWS。

## 前置知识

- 已完成[Pinia 与状态架构](05-pinia-architecture.md)。
- 能区分 401、403、404、409、422 与 503。
- 知道表单失败保留草稿、收藏幂等、晚到会话结果隔离。
- 熟悉语义 HTML、label、焦点、`role="status"` 与 `role="alert"`。

## 学习路线

| 顺序 | 教程 | 主要证据 | 建议投入 |
| --- | --- | --- | ---: |
| 1 | [纯函数、组件与 Store 测试](06-testing-accessibility/01-pure-component-store-tests.md) | Vitest、Vue Test Utils、Pinia、deferred Promise | 4 小时 |
| 2 | [路由、浏览器、无障碍与错误恢复](06-testing-accessibility/02-router-browser-accessibility-errors.md) | `onErrorCaptured`、Playwright、键盘/焦点/冲突 | 5 小时 |
| 3 | [ESLint、CI 与证据边界](06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md) | flat config、门禁顺序、可复现服务器 | 3 小时 |

## 章级综合任务

建立一条可重复运行的 Vue 质量链：

```text
lint → vue-tsc → unit/component/store → build → isolated Chromium E2E
```

浏览器主路径必须覆盖：

- `search-empty-and-recovery`
- `failed-publish-keeps-draft`
- `favorite-target-is-idempotent`
- `late-session-result-is-ignored`
- `login-publish-favorite-logout`
- `reservation-conflict-across-tabs`
- `not-found-and-service-failure`
- `keyboard-primary-path`

第 8 章再补 `ssr-html-and-hydration`。场景名称是跨 React/Vue 的业务契约，不要求两个框架逐行翻译测试代码。

## 验收证据

- [ ] 金额 `0`、`1000000.00` 合法，负数、指数、前导零、三位小数、超上限非法。
- [ ] 发布失败保留标题、描述和金额；成功才清空。
- [ ] 收藏重复目标不重复，DELETE 失败保留原状态。
- [ ] 退出后旧收藏 Promise 不回写。
- [ ] 键盘可完成搜索、登录、发布、收藏、预约和错误恢复。
- [ ] 路由后标题获得程序化焦点，焦点样式可见。
- [ ] 两页面预约得到一次成功与一次 409。
- [ ] 320 CSS px、200% 缩放无页面级横向溢出。
- [ ] 减少动态偏好关闭非必要过渡。
- [ ] Lint、类型、单元、构建、E2E 都运行真实命令并记录实际数量。

## 完成标准

能从风险选择最低但足够真实的测试层；测试失败时区分实现、测试和环境问题；不会通过 sleep、放宽断言、吞异常或复用脏服务器制造“通过”；能明确列出未做的真实辅助技术、跨浏览器、后端事务和生产安全验证。

[上一章：Pinia 与状态架构](05-pinia-architecture.md) · [下一章：性能证据与进阶 Vue](07-performance-advanced-vue.md) · [Vue 学习路线](README.md)
