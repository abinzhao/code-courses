# 04 Data Router、URL 与服务端数据

## 本章任务

把第 3 章单页列表升级为可分享、可刷新、可前进后退的邻里集市：URL 保存搜索、页码和商品 ID；loader 读取列表/详情；action 处理教学登录、退出、发布和预约；错误按状态提供恢复。

本章使用 React Router Data Mode，loader/action 在 Vite SPA 浏览器端运行，不含数据库或服务器秘密。

## 必要前置

- 已完成[第 3 章](03-effects-reuse.md)的 `request`、parser、教学 API。
- 已完成金额表单规则，理解失败保留草稿。
- 能区分 URL、局部草稿、服务端事实和会话状态。
- 已安装并记录实际 `react-router` 版本。

## 学习路线

| 顺序 | 教程 | 核心产出 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [Data Router、URL 状态与导航语义](./04-routing-data/01-data-router-url-state-navigation.md) | 路由树、q/page/id、深链与历史恢复 | 120 分钟 |
| 2 | [loader、action、错误边界与重新验证](./04-routing-data/02-loaders-actions-errors-revalidation.md) | 路由读取/写入、pending、错误与 revalidation | 150 分钟 |
| 3 | [教学登录、发布、预约与冲突恢复](./04-routing-data/03-auth-publish-reservation-conflicts.md) | 完整会话/发布/预约路由闭环 | 210 分钟 |

三课按依赖顺序进行。建议总投入约 8 小时，并留出两个独立标签页完成冲突实验。

## 章级综合任务

1. `/listings?q=&page=` 可分享、刷新、前进后退。
2. `/listings/:id` 读取详情，`missing` 显示真实 404。
3. 根 loader 读取 `/auth/me`；401 表示匿名，503 不吞成匿名。
4. 登录后发布“二手书架”`12000` 分，跳转服务端 ID 详情。
5. 发布失败保留草稿；成功使用响应中的 owner/version/UTC 时间。
6. 预约请求不提交 buyerId。
7. 两标签同时预约台灯，记录一条 201 与一条 409。
8. 401/403/404/409/400/503 分别提供恢复。
9. 生产静态服务器深链 fallback 与 `/api` 反代边界写清。

## 综合验收证据

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm dev --host 127.0.0.1
```

浏览器清单：

- [ ] 刷新 `/listings?q=台灯&page=1` 仍显示台灯。
- [ ] 搜索、分页、后退、前进恢复 URL 和输入。
- [ ] `/listings/missing` 为 404；`q=__error` 为 503。
- [ ] 未登录直接 `/new` 显示登录入口。
- [ ] 登录后发布成功并进入服务端 ID。
- [ ] 失败发布输入保留。
- [ ] 两标签预约为一条 201、一条 409，最终都显示 reserved。
- [ ] 预约自己的商品为 403。
- [ ] requestId 可见，Cookie/密码/服务端秘密不出现在日志。
- [ ] 320px 下无页面级横向滚动，Tab/Enter 主路径可用。

## 权威边界

前端 URL、pending、disabled 和错误文案只提供体验。认证、对象授权、版本冲突、预约唯一性和事务必须由真实后端与数据库执行。本机内存 API 的单进程结果只能验证前端按共享 HTTP 契约恢复，不能替代生产并发证据。

## 章节导航

[上一章：Effect 与 HTTP](03-effects-reuse.md) · [React 学习路线](README.md) · [下一章：状态架构](05-state-architecture.md)
