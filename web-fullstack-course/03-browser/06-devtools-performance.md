# 06 · DevTools 与性能诊断

> 本章任务：把“页面很慢”改写成可复现问题，用跨面板证据定位原因，并以同条件复验而不是分数或感觉验收。

## 本章产出

- 一个可控慢请求、`503`、主线程长任务和资源泄漏实验；
- 一条覆盖 Network、Performance、Rendering、Memory、Application、Coverage 与 Accessibility 的证据链；
- 一个可切换正常/故障模式的 LCP、CLS、交互与资源预算实验；
- 一份经过脱敏、含环境、动作、证据、原因、修复、复验和边界的诊断报告。

本章主要使用 Chromium 自动/人工证据。Safari、Firefox、真实移动设备、真实屏幕阅读器与生产字段数据必须单独记录为未验证项。

## 必要前置

1. 完成前五章，能识别网络、渲染、存储、Worker 与 Service Worker 对现象的影响；
2. 按[本卷 browser-lab 契约](README.md#多文件实验怎样启动)启动本地页面；
3. 了解 Performance API、事件监听与资源生命周期；
4. 录制前记录浏览器版本、设备、视口、构建、网络/CPU 节流、缓存和 Service Worker 状态。

## 学习路线

| 顺序 | 教程 | 核心问题 | 主要证据 | 建议投入 |
| --- | --- | --- | --- | ---: |
| 1 | [DevTools 证据链：网络、主线程、内存与页面状态](06-devtools-performance/01-network-performance-memory-evidence.md) | 等待、阻塞和保留分别发生在哪里？ | Timing、调用栈、layout/paint、retainers、存储状态 | 140 分钟 |
| 2 | [Core Web Vitals 与性能预算](06-devtools-performance/02-core-web-vitals-budgets-diagnosis.md) | 指标怎样回到原因，预算怎样可判定？ | LCP/CLS/Event/Long Task、资源预算、5 次范围 | 140 分钟 |

先做证据链，再解释指标。只会报分数但不能定位调用栈、资源或布局来源，不算完成本章。

## 章级邻里集市任务

选择一个商品列表或详情场景，按以下顺序提交诊断：

```text
固定环境与动作
  → Network 确认请求/响应来源
  → Performance 对齐交互、任务与渲染
  → Memory/Application 排除泄漏与旧状态
  → LCP/CLS/交互候选定位体验影响
  → 提出一条可证伪原因
  → 最小修复
  → 同条件至少 5 次复验
```

报告必须遵守：

- 不包含 Cookie、Token、私人响应、真实用户标识与完整敏感 URL；
- 性能优化不能破坏整数分、UTC 时间、权限、错误、离线与无障碍语义；
- 区分本地实验、生产构建实验和真实用户字段数据；
- 多个变量同时变化时，不宣称单一变量具有确定因果；
- 无法验证的浏览器、设备、辅助技术和生产链路明确列出。

## 综合验收

- [ ] 两篇教程的 Node/HTML/JS 文件可独立运行；
- [ ] 慢请求、`503`、180 ms 长任务、timer/listener 泄漏均有稳定证据；
- [ ] Network、Performance、Memory、Application、Coverage、Accessibility 各有结论和边界；
- [ ] 正常/故障模式中的 LCP、CLS、交互与 Long Task 差异能回到具体原因；
- [ ] 每组至少 5 次，报告中位数和范围，不挑最佳单次；
- [ ] 工程预算注明页面、构建、设备、网络、缓存和统计方式；
- [ ] 证据已脱敏，RUM 设计不收集用户输入、DOM 文本、身份与完整 URL；
- [ ] 未把本地 PerformanceObserver 候选写成正式 INP、CrUX 或真实用户 p75。

## 导航

[上一章：Worker、离线与平台能力](05-workers-offline-webapis.md) · [本卷目录](README.md) · [继续：JavaScript 与 TypeScript](../04-javascript-typescript/README.md)
