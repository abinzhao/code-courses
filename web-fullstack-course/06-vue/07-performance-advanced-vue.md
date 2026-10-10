# 07 性能证据与进阶 Vue

## 本章任务

在不改变邻里集市 API 的前提下建立三个隔离实验：先测计算与 DOM 成本，再实现可键盘关闭和恢复焦点的 Teleport 对话框，最后验证 KeepAlive 的激活/停用和异步组件加载失败。

所有数据是本机合成实验，不代表真实居民、真实流量或生产性能。实验结束必须恢复第 6 章主入口，不能让合成数据、临时路由或错误 chunk 留在业务应用。

## 前置知识

- 完成[测试、无障碍与错误恢复](06-testing-accessibility.md)。
- 会使用浏览器 Performance、Vue DevTools、Network 与 reduced-motion 模拟。
- 理解 `computed`、`nextTick`、组件生命周期、动态 import。
- 能区分计算缓存、节点数量、网络延迟和后端分页。

## 学习路线

| 顺序 | 教程 | 产出 | 建议投入 |
| --- | --- | --- | ---: |
| 1 | [测量、浅层响应与渲染成本](07-performance-advanced-vue/01-performance-shallow-reactivity-measurement.md) | 有条件的基线、`shallowRef` 根替换、分页/虚拟化边界 | 4 小时 |
| 2 | [Teleport、Transition 与无障碍对话框](07-performance-advanced-vue/02-teleport-transition-dialog-accessibility.md) | 原生 dialog、焦点恢复、Escape、减少动态 | 4 小时 |
| 3 | [KeepAlive、异步组件与生命周期](07-performance-advanced-vue/03-keepalive-async-components-lifecycle.md) | 草稿缓存、资源暂停、chunk loading/error | 4 小时 |

## 章级综合任务

在 `AdvancedLab.vue` 中组合三个实验，但每课保持独立责任：

1. 5000 条合成数据只渲染前 30 条，记录生产构建、设备、操作和数据量。
2. `shallowRef` 内部原地修改故意不更新，改为根数组替换后恢复。
3. 对话框 Teleport 到稳定 `#overlays`，Tab 不进入背景，Escape 与按钮关闭后焦点回触发器。
4. reduced-motion 下非必要 Transition 为 0。
5. KeepAlive 切走草稿后文本保留，计时/订阅暂停，重新激活不叠加资源。
6. 异步统计组件显示 loading；阻断 chunk 后进入 error，而不是永久加载。
7. 退出账号时销毁用户相关缓存，不让前一用户草稿跨会话存在。

## 验收证据

- [ ] 每条性能记录包含构建模式、设备、数据量、操作和结果。
- [ ] 不把 `nextTick` 时间称为浏览器完成绘制。
- [ ] `shallowRef` 使用根替换，正确性测试先于计时。
- [ ] 对话框有名称、原生模态行为、Escape、close/cancel 同步和焦点恢复。
- [ ] Teleport 目标缺失有可复现错误并由稳定容器修复。
- [ ] KeepAlive deactivated 时资源停止，activated 时只恢复一份。
- [ ] 异步组件有 loading、error、timeout 与部署恢复说明。
- [ ] 主入口恢复，列表、发布、预约和收藏仍通过代表性烟测。

## 完成标准

能先定位网络、计算、DOM、布局或绘制瓶颈再选择工具；能解释浅层响应、Teleport、Transition、KeepAlive 和异步组件各自解决什么、不会解决什么；所有“更快”结论都有条件和测量证据。

[上一章：测试与无障碍](06-testing-accessibility.md) · [下一章：SSR 与结业验收](08-ssr-capstone.md) · [Vue 学习路线](README.md)
