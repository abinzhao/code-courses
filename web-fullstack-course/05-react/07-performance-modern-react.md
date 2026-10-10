# 07 性能与现代 React：先测量，再采用并发与新 API

## 本章任务、产出与前置

先完成测试门禁。本章把网络、bundle、计算、DOM、布局与绘制成本分开，只有观测到瓶颈
才引入 memo、延迟值、transition 或虚拟化。现代 React API 以隔离实验教学，不把所有
能力同时塞进已验收主线。

最终产出是三组可恢复实验：生产条件下的性能测量、带回滚的 Action/乐观写入，以及
`use`、Suspense、ref prop、Effect Event、Compiler 和 Activity 的边界验证。每次实验后
恢复主入口；没有设备、数据量和操作路径的数字不得写成性能收益。

## 学习路线

| 顺序 | 教程 | 核心产出 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [性能测量、memo 与并发更新](07-performance-modern-react/01-performance-measurement-memo-concurrency.md) | 可复现 Profile、deferred/transition 实验 | 180 分钟 |
| 2 | [Actions、乐观状态与表单状态](07-performance-modern-react/02-actions-optimistic-form-status.md) | Action 表单、pending 作用域、失败回滚 | 170 分钟 |
| 3 | [现代 Hooks、Compiler、Suspense 与 Activity](07-performance-modern-react/03-modern-hooks-compiler-suspense-activity.md) | Hook 地图、资源边界、编译与生命周期证据 | 210 分钟 |

第一课解决“慢在哪里”，第二课解决“异步意图如何反馈”，第三课解决“新 API 何时成立”。
并发更新只改变调度体验，不提供授权、事务、响应顺序或持久化。

## 选择工具前先分类

| 现象 | 首要证据 | 可能工具 |
| --- | --- | --- |
| 首屏等待长 | Network、TTFB、请求瀑布 | 并行数据、缓存、SSR |
| JS 下载/解析长 | Coverage、bundle report | 路由拆分、lazy |
| 纯计算重复 | React Profiler、CPU profile | `useMemo`、Compiler |
| 子组件重复渲染 | props 差异、Profiler | `memo`、稳定 props |
| 输入被重列表阻塞 | Interaction trace | `useDeferredValue`、transition |
| DOM 数量过大 | Elements、Layout | 分页、必要时虚拟化 |

## 章级邻里集市任务

1. 在生产构建、固定数据量和 CPU 条件下记录基线；
2. 让输入值保持紧急更新，只延迟结果列表；
3. 说明 memo 缓存纯计算，不是业务正确性保证；
4. Action 失败保留可恢复状态，乐观结果能回滚；
5. `useFormStatus` 放在目标 form 后代，不能读取任意表单；
6. `use` 读取稳定资源，由 Suspense 与错误边界处理；
7. Activity 隐藏后保留 state，但 Effect 必须清理并重建；
8. Compiler 以产物或 DevTools 证据确认，不凭安装成功推断收益。

## 综合验收证据

- [ ] 每条性能结论包含构建模式、设备、数据量、操作与数值。
- [ ] 去掉错误依赖能制造过期结果，恢复依赖后行为正确。
- [ ] 受控输入没有放入 transition。
- [ ] 未登录乐观收藏回滚并显示 401，而非伪装成功。
- [ ] 表单 pending 只覆盖所属 form。
- [ ] Suspense Promise 没有在每次 render 中新建。
- [ ] Activity 隐藏时 Effect 清理，恢复时草稿仍在。
- [ ] Compiler 产物有转换证据；未测性能不填写百分比。
- [ ] 实验结束后主应用入口和路由已恢复。

## 导航

[上一章：测试与无障碍](06-testing-accessibility.md) ·
[下一章：SSR 与综合项目](08-ssr-capstone.md) ·
[本卷目录](README.md) ·
[覆盖矩阵](REACT-COVERAGE.md)
