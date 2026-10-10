# 04 路由、URL 与服务端数据

> 本章目标：让商品列表和详情拥有可刷新、可分享、可后退的 URL，并在不同 HTTP 状态下给出正确恢复路径。

## 本章任务

沿用第 3 章教学 API，把关键字、页码和商品 ID 放入 URL；增加列表、详情、登录、发布、预约和
前端 404 页面。本章采用 Vue Router 的导航后取数：路由先切换，组件再呈现 loading 并读取数据。

这仍是 SPA，不是 SSR。导航守卫可以改善体验，但后端会话、对象授权和预约唯一性仍由服务端负责。

## 前置与产出

- 前置：[生命周期、请求与 Composable](./03-lifecycle-composables.md)全部三课。
- 输入：路径、query、表单草稿、教学 Cookie 和 API 响应。
- 输出：Router 配置、URL 驱动列表、可复用详情、登录/发布/预约与状态恢复。
- 建议投入：6 至 7 小时；每课约 120 至 140 分钟。
- 版本证据：安装 Vue Router 后记录实际版本，不猜测补丁号。

## 三课学习路线

| 顺序 | 教程 | 核心产出 | 依赖 |
| --- | --- | --- | --- |
| 1 | [Router、URL 状态与导航恢复](./04-router-data/01-router-url-state-navigation.md) | 路由树、q/page 规范化、后退/前进与深链 | 第 3 章 |
| 2 | [路由取数、取消与错误恢复](./04-router-data/02-route-data-fetch-cancellation-errors.md) | 参数复用、详情请求、404/503 与晚到结果守卫 | 第 1 课 |
| 3 | [教学登录、发布与预约冲突](./04-router-data/03-auth-publish-reservation-conflicts.md) | 登录、服务端 ID、失败保稿、两标签页 201/409 | 前两课 |

## 章级邻里集市任务

完成以下业务路径：

1. 刷新 `/listings?q=台灯&page=1` 仍显示相同筛选；
2. 修改输入但未提交时 URL 不变，提交后 page 重置为 1；
3. 后退/前进同步 URL、输入和列表；
4. `/listings/missing` 显示对象 404 恢复，未知页面显示路由 404；
5. 未登录发布得到 401 且草稿保留；教学登录后使用服务端返回 ID 跳详情；
6. 两个标签页预约 `lamp-1`，只能一个 201，另一个 409；
7. 503、403、404、409、422 都有不同解释，不统一伪装成“请求失败”。

## 综合验收

- [ ] RouterLink 保留链接语义，RouterView 输出匹配页面。
- [ ] q/page/id 的所有权在 URL，草稿和 pending 留在组件。
- [ ] 只 watch 精确 route 参数；参数变化时旧读请求取消或失效。
- [ ] 写请求完成后检查当前 route ID，避免跨详情显示结果。
- [ ] 深路径开发刷新成功；生产服务器仍需非 API history fallback。
- [ ] 浏览器请求不携带 buyerId/ownerId/role 作为授权依据。
- [ ] 预约冲突不自动无限重试，成功后重新读取服务端状态。
- [ ] `vue-tsc`、测试、构建和代表性 Chromium 路径通过。

## 能力边界

教学登录不验证密码，教学 API 不证明真实数据库事务。前端 404 组件和 HTTP 404 是两层证据；
生产深链回退、HTTPS、真实会话、CSRF、事务和多进程并发仍待后端及交付卷完成。

## 上下章导航

[上一章：生命周期、请求与 Composable](./03-lifecycle-composables.md) ·
[下一章：Pinia 与状态架构](./05-pinia-architecture.md)
