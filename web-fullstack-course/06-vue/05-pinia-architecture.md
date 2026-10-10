# 05 Pinia、依赖注入与状态架构

## 本章任务

沿用第 4 章的路由与服务端数据边界，为邻里集市加入跨路由会话摘要、收藏反馈和显示服务。你要先判断状态所有者，再选择 Pinia 或 `provide/inject`，而不是把所有数据塞进全局 store。

章级输入是 `/auth/me`、登录/退出结果和收藏目标状态；输出是跨页面一致的会话、每商品 pending、失败恢复、旧响应隔离与明确的刷新限制。Pinia 不替代数据库、权限检查或服务端缓存。

## 前置知识

- 已完成[路由与服务端数据](04-router-data.md)，理解 URL、页面草稿和后端事实的所有权。
- 熟悉 `ref`、`computed`、组合式函数、HTTP 错误和取消。
- 遵守[邻里集市领域契约](../00-guide/05-project-assessment.md)：收藏使用幂等 `PUT/DELETE`，会话凭据留在 HttpOnly Cookie。

## 学习路线

| 顺序 | 教程 | 产出 | 建议投入 |
| --- | --- | --- | ---: |
| 1 | [状态所有权与 Pinia setup store](05-pinia-architecture/01-state-ownership-pinia-store.md) | 状态分类表、setup store、`storeToRefs` 接线 | 3 小时 |
| 2 | [会话、收藏与并发收敛](05-pinia-architecture/02-session-favorites-concurrency.md) | epoch、每 ID 锁、失败保持与退出语义 | 4 小时 |
| 3 | [provide/inject、只读边界与 SSR 隔离](05-pinia-architecture/03-provide-inject-store-ssr.md) | 类型化显示服务、缺失 provider 失败、每请求 Pinia | 3 小时 |

必须按顺序完成：第 2 篇复用第 1 篇 store 的公开状态；第 3 篇把“服务依赖”和“共享可变状态”分开，并为第 8 章 SSR 建立隔离规则。

## 章级综合任务

在 `neighborhood-market/apps/vue-web` 中完成跨路由状态闭环：

1. 启动时读取会话；401 显示匿名，网络失败显示重试。
2. 登录后所有路由立即看到 `demo-buyer / 演示居民`。
3. 收藏 `lamp-1` 使用 `PUT`，取消使用 `DELETE`；重复目标不会重复计数。
4. 每件商品独立 pending，失败保持此前已确认状态。
5. 收藏请求未完成时退出，旧响应不得恢复前一会话数据。
6. 显示服务缺失时抛出可定位错误，不静默采用另一套金额规则。
7. 刷新后收藏不能恢复，明确指出原因是契约没有收藏查询接口。

本章示例仍可使用本机教学 API；它是易失内存状态，不证明持久化、跨进程一致性或后端授权。

## 验收证据

- [ ] `pnpm exec vue-tsc -b` 与 `pnpm build` 退出码为 0。
- [ ] store 测试覆盖幂等收藏、失败保持、退出期间旧响应与 401。
- [ ] `storeToRefs` 用于 state/getter，action 从 store 直接调用。
- [ ] URL 查询、表单草稿和服务端分页没有复制进 Pinia。
- [ ] 移除 provider 能稳定复现“未注册显示服务”，恢复后金额显示正确。
- [ ] SSR 示例每次调用工厂都得到不同 Pinia；不存在进程级用户 singleton。
- [ ] 明确记录：前端 `disabled` 不提供授权，刷新收藏恢复尚无后端契约。

## 完成标准

能为任意状态回答“谁创建、谁修改、何时失效、刷新后如何恢复”；能用失败驱动测试证明晚到响应不跨会话；能解释 Pinia、普通 composable、`provide/inject` 和服务端数据库各自负责什么。

[上一章：路由与服务端数据](04-router-data.md) · [下一章：测试、无障碍与错误恢复](06-testing-accessibility.md) · [Vue 学习路线](README.md)
