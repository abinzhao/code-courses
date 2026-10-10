# 渲染与事件循环：从 DOM 变化到用户看见

本章把“页面卡住”拆成三类可观察问题：渲染阶段是否被错误理解、任务与微任务是否阻塞呈现、主线程是否被长计算或同步布局占满。目标是先收集浏览器证据，再选择减量、CSS、批处理、分片或 Worker。

## 本章任务

你将完成：

1. 用计算样式、几何和 DevTools 区分 DOM、布局、绘制与合成。
2. 记录同步代码、微任务、定时器、消息和 rAF 的顺序约束。
3. 复现长任务与布局读写交替，并做同输入前后对比。
4. 实现可取消、按时间推进且尊重减少动画偏好的动画。

章级产出是“商品列表主线程诊断包”：三组完整源码、至少两条 Performance trace、顺序日志、优化对比表与键盘/减少动画复验。

## 必要前置

- [browser-lab 运行契约](README.md#多文件实验怎样启动)
- [HTML DOM 交互章节](../01-html/06-interactive-dom.md)
- [CSS 盒模型与定位](../02-css/03-box-sizing-flow-position.md)
- [JavaScript 异步章节](../04-javascript-typescript/06-async-fetch-event-loop.md)可在语言卷学完后回访

实验使用 Node.js 24 与 Chromium。DevTools 面板、事件名和合成策略属于实现证据，不能外推成全部浏览器保证。

## 学习路线

| 顺序 | 教程 | 核心问题 | 建议投入 | 关键证据 |
| --- | --- | --- | ---: | --- |
| 1 | [DOM、CSSOM、布局、绘制与合成](02-rendering-event-loop/01-dom-cssom-layout-paint-composite.md) | 改变结构或样式后，浏览器实际做了什么？ | 90～120分钟 | Computed、矩形、Paint/Performance |
| 2 | [任务、微任务与呈现机会](02-rendering-event-loop/02-tasks-microtasks-rendering-opportunities.md) | 为什么“处理中”可能没有显示？ | 80～110分钟 | 顺序日志、帧与长任务 |
| 3 | [长任务、同步布局与稳定动画](02-rendering-event-loop/03-long-tasks-layout-thrashing-animation.md) | 如何减少阻塞并证明修复有效？ | 100～130分钟 | trace、三次以上对比 |

先理解浏览器要做的工作，再学习调度，最后做性能修复。只看第三课的“优化写法”而不保留基线，不算完成。

## 邻里集市综合任务

使用同一台电脑、同一 Chromium 版本和同一视口，建立：

```text
render-evidence/
  environment.md
  rendering-trace.md
  event-order.md
  performance-before-after.md
  accessibility-regression.md
```

综合场景包含：

- 一页20件真实契约形状的本地演示商品，价格用整数分、时间用 UTC ISO 8601。
- “加载中”状态在重工作前获得呈现机会，但重工作本身继续减量或分片。
- 布局由 Grid/Flex 表达，不逐项读取并写回卡片宽度。
- 动画可取消；减少动画偏好下内容和操作仍完整。
- 隐藏商品操作区时不只改透明度，键盘不能进入不可见控件。

本章不实现真实接口、认证或持久化；视觉隐藏也不是对象授权。

## 综合验收

- [ ] 三篇细课的 Node/HTML/JS 完整案例均可运行。
- [ ] 能说明渲染教学模型不是每次固定完整执行的流水线。
- [ ] 能区分 DOM 存在、布局占位、视觉可见、命中和可访问状态。
- [ ] 能预测同步代码与微任务的必要顺序，不承诺不同任务源的固定总顺序。
- [ ] 能解释 rAF 在绘制前，Promise 不会自动进入后台线程。
- [ ] 至少复现一次长任务和一次同步布局压力。
- [ ] 优化前后使用相同输入并运行至少三次。
- [ ] 分片可取消，旧任务不会覆盖新状态。
- [ ] 动画按时间而非帧数推进，支持取消和减少动画。
- [ ] 修复后金额、时间、键盘顺序和界面状态没有退化。
- [ ] 明确记录 Safari、Firefox、真实移动设备、屏幕阅读器和低端硬件缺口。

现场验收会随机注入：透明但可聚焦、Promise 中重计算、逐项读写宽度三类问题。学习者需用证据定位，而不是直接套固定代码。

## 章节导航

[上一章：请求、HTTP 与缓存](01-network-http-cache.md) · [下一章：存储与安全](03-storage-security.md) · [浏览器卷](README.md)
