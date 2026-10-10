# 06 测试与无障碍：用分层证据约束用户可见行为

## 本章任务、产出与前置

前置是第 05 章的纯 reducer、会话命令和跨路由状态。本章不以“组件渲染成功”作为完成，
而是按纯函数、组件、路由、浏览器和人工检查分配风险，固定金额、草稿、收藏、错误恢复、
键盘、焦点和状态消息。

最终产出是 Vitest 与 Testing Library 契约测试、路由错误边界、Playwright 主路径，以及
ESLint 10 / 类型 / 测试 / 构建 / E2E 的质量门禁。Mock 只替代明确边界，不把前端绿色结果
扩张成后端授权、预约事务、生产 CSRF 或全面无障碍认证。

## 学习路线

| 顺序 | 教程 | 核心产出 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [纯函数与组件契约测试](06-testing-accessibility/01-pure-component-contract-tests.md) | 金额、reducer、表单与保留草稿测试 | 180 分钟 |
| 2 | [路由、浏览器、无障碍与错误恢复](06-testing-accessibility/02-router-browser-accessibility-errors.md) | 错误边界、焦点恢复、共享 E2E 场景 | 210 分钟 |
| 3 | [ESLint、CI 与证据边界](06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md) | ESLint 10 flat config、五级门禁与缺口表 | 150 分钟 |

测试顺序不是价值排序。纯函数快速定位规则，组件测试验证可访问交互，真实 Chromium 验证
路由与浏览器行为，辅助技术和跨浏览器仍需要单独人工证据。

## 测试层职责

| 层 | 主要证明 | 不能证明 |
| --- | --- | --- |
| 纯函数 | 金额边界、reducer 不变性 | DOM、网络、权限 |
| 组件 | label、键盘输入、失败保留草稿 | history fallback、真实 cookie |
| 路由集成 | loader/action、404/503 恢复 | 数据库并发 |
| Chromium E2E | 真实 DOM、焦点、URL、两页面流程 | Safari/Firefox、屏幕阅读器 |
| 人工检查 | 朗读、缩放、目标设备体验 | 后端事务与安全 |

## 章级邻里集市任务

1. 表驱动测试价格 `0`、`1000000.00` 及全部非法形式；
2. 证明 reducer 失败不改变原 selected，重复成功仍幂等；
3. 表单失败后保留输入，成功后才重置并发送整数分；
4. 以 role/name 查询主控件，不把 class 或实现细节当契约；
5. 路由局部错误保留返回入口，顶层错误避免整页空白；
6. 键盘完成搜索、登录、发布、收藏、预约与恢复；
7. 焦点在路由切换后进入页面标题，错误用 alert、成功用 status；
8. 五个质量命令在全新隔离端口按固定顺序运行。

## 综合验收证据

- [ ] 测试先能因错误实现失败，再因正确实现通过。
- [ ] 金额与草稿规则没有被 Mock。
- [ ] 异步断言使用 `findBy` / `waitFor`，没有任意 sleep。
- [ ] 404 与 503 保留不同语义和恢复入口。
- [ ] 两页面预约场景要求一个成功、一个 409。
- [ ] 320 CSS 像素、200% 缩放无页面级横向溢出。
- [ ] Tab、Shift+Tab、Enter、Space、Escape 主路径可完成且焦点可见。
- [ ] lint、typecheck、unit、build、E2E 各自退出 0。
- [ ] Safari、Firefox、VoiceOver、NVDA、JAWS 未运行时明确记为未验证。

## 导航

[上一章：状态架构](05-state-architecture.md) ·
[下一章：性能与现代 React](07-performance-modern-react.md) ·
[本卷目录](README.md) ·
[覆盖矩阵](REACT-COVERAGE.md)
