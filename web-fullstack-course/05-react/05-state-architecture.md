# 05 状态架构：让所有权、并发与 SSR 隔离可解释

## 本章任务、产出与前置

先完成第 04 章的路由、loader/action 与会话教学 API。本章把状态分成 URL、局部草稿、
服务器事实和共享客户端反馈，再用 reducer、Context 与外部 store 选择各自合适的所有者。

最终产出是可跨路由工作的会话与收藏模型：失败写入不伪装成功，注销后迟到响应不能恢复
旧用户数据，SSR 请求之间也不共享状态。本章不新增 `GET /favorites`；因此刷新后恢复完整
收藏集合仍是后端契约缺口，不能用 localStorage 猜测服务端事实。

## 学习路线

| 顺序 | 教程 | 核心产出 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [状态所有权、reducer 与 Context](05-state-architecture/01-state-ownership-reducer-context.md) | 纯收藏 reducer、非空 Context 契约 | 150 分钟 |
| 2 | [会话、收藏命令与并发保护](05-state-architecture/02-session-favorites-concurrency.md) | per-ID 锁、epoch 防迟到、注销清理 | 180 分钟 |
| 3 | [外部 store、Context 性能与 SSR](05-state-architecture/03-external-store-context-performance-ssr.md) | 稳定快照、订阅契约、每请求 store | 160 分钟 |

三课依次回答“谁拥有状态”“异步结果何时仍有效”“何时应离开 Context”。reducer 和 store
都不负责持久化、身份认证、对象授权或数据库事务。

## 状态所有权速查

| 状态 | 所有者 | 不应复制到 |
| --- | --- | --- |
| `q/page/listingId` | URL / Router | Context 的第二份路由状态 |
| 发布草稿、焦点 | 表单或局部组件 | 全局 store |
| Listing、预约结果 | 服务端与 loader 快照 | 长期客户端副本 |
| 会话摘要 | 服务端 `/auth/me` 的客户端快照 | localStorage 凭据 |
| 收藏 pending/error | 共享客户端状态 | 商品实体字段 |
| SSR 初始公开数据 | 当前请求 | 模块级 singleton |

## 章级邻里集市任务

1. 收藏按钮以商品 ID 为身份，不按列表下标寻址；
2. PUT/DELETE 使用明确目标状态，重复请求保持幂等；
3. 每个 ID 同时只允许一个前端写命令，其他商品不被全局锁住；
4. 401 清理旧会话，网络失败保留最后已确认状态；
5. logout 增加 epoch，旧 Promise 完成后不能恢复收藏或用户；
6. Provider 缺失时立即报错，不用默认假用户掩盖接线错误；
7. SSR 为每个请求创建新 store，并提供稳定 `getServerSnapshot`；
8. 明确记录当前没有收藏查询接口，刷新恢复不在本章能力内。

## 综合验收证据

- [ ] reducer 的输入对象不变，重复 saved 不重复计数。
- [ ] 收藏失败解除 pending，但保留写入前的 selected 状态。
- [ ] 两个不同商品可以并行，同一商品重复点击被锁住。
- [ ] 401 与 503/离线进入不同恢复路径。
- [ ] logout 后旧请求 resolve/reject 都不能写回当前用户状态。
- [ ] Context 缺 Provider 时抛出可定位错误。
- [ ] `useSyncExternalStore` 连续读取未变化快照时引用稳定。
- [ ] 两个 SSR 请求得到不同 store 实例，没有跨用户泄漏。
- [ ] 刷新收藏恢复被标成未实现契约，而不是伪造通过。

## 导航

[上一章：路由与服务端数据](04-routing-data.md) ·
[下一章：测试与无障碍](06-testing-accessibility.md) ·
[本卷目录](README.md) ·
[覆盖矩阵](REACT-COVERAGE.md)
