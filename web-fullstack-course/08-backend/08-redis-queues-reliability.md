# 08 Redis、Outbox 与队列：在多系统失败中保留业务事实

## 本章使命

预约提交后，商品状态在 PostgreSQL 中已经改变；缓存、Redis 队列和通知服务却可能在任意时刻
断开。本章不追求“所有组件永不失败”，而是建立可恢复的职责：

1. PostgreSQL 保存业务事实，Redis 缓存只是可丢失、可重建的加速副本；
2. 预约与 outbox 事件由同一个数据库事务提交，消除“业务成功但事件根本没记录”的窗口；
3. outbox 转发和 BullMQ 按至少一次尝试设计，jobId 只做队列层去重，业务结果另有持久幂等键；
4. 重试只处理暂时错误，耗尽任务可检查、可修复、可受控重放；
5. 停机先停止取新工作，再等待有界任务结束并关闭连接。

Redis 与 BullMQ 是第 10 章最小 API 的**可选可靠性扩展**。完成本章不意味着 capstone 已把缓存
或队列变成必需依赖，也不意味着真实邮件已经发送。

## 必要前置与运行边界

- 已完成[事务与并发](05-transactions-concurrency.md)；
- 理解[PostgreSQL 仓储和连接所有权](04-postgres-data-access.md)；
- 理解[安全搜索与稳定分页](07-search-pagination-files.md)；
- Node.js 24 是示例运行时；
- 真实 outbox 验收需要隔离 PostgreSQL 18；
- BullMQ 验收需要读者授权使用的 Redis，并记录实际 Redis、BullMQ 和客户端版本。

教程中的内存缓存和事务模型均明确标为 `MOCK`，只能说明算法状态，不是 Redis/PostgreSQL
运行证据。连接串、密码和 TLS 材料只使用占位值，不进入日志或提交。

## 学习路线

| 顺序 | 教程 | 核心问题 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [缓存失效与击穿控制](08-redis-queues-reliability/01-cache-invalidation-stampede-control.md) | cache-aside 怎样限制陈旧窗口并防止热点 miss 放大 | 130 分钟 |
| 2 | [事务 Outbox 与一致性](08-redis-queues-reliability/02-transactional-outbox-consistency.md) | PostgreSQL 与队列双写间隙怎样变成可恢复事件 | 150 分钟 |
| 3 | [BullMQ 幂等、重试、死信与停机](08-redis-queues-reliability/03-bullmq-idempotency-retry-dead-letter-shutdown.md) | 重复任务、失败分类、死信检查和进程退出怎样闭环 | 170 分钟 |

依赖关系：

```text
可丢失缓存副本
  -> 事务内持久事件
  -> 至少一次转发
  -> 业务幂等消费
  -> 重试、死信、重放与停机
```

缓存课不依赖队列；但“写提交后失效失败”的可靠重试可以由 outbox 承担。队列课复用第二课的
业务事件 ID，不能用 BullMQ 自动生成 ID 替代领域事件身份。

## 章级邻里集市任务

为“预约成功后刷新公共列表并创建站内通知”设计可靠链路：

1. 公共 Listing 缓存键包含 schema 版本、epoch、规范查询和权限范围；
2. 预约资格、对象授权和唯一性永远读取 PostgreSQL，不读取缓存裁决；
3. Listing 写事务提交后推进 epoch；推进失败有持久事件可重试；
4. Reservation 与 `reservation.created` outbox 行使用同一事务 client；
5. dispatcher 以租约 claim 事件，发布成功后标记，崩溃窗口允许重复；
6. BullMQ `jobId` 使用 event ID，任务清理后仍由业务表唯一键阻止重复结果；
7. 暂时错误指数退避，永久错误停止自动重试；
8. 重试耗尽任务留在 failed 集合，死信摘要不包含密码、Cookie、Token、连接串或完整正文；
9. SIGTERM 后停止 dispatcher/worker 获取新任务，等待活动任务，再关闭 Queue、Redis 和数据库。

## 综合验收与证据

| 证据 | 合格判定 | 不能推出的结论 |
| --- | --- | --- |
| MOCK cache-aside 测试 | miss/hit、epoch 失效和同进程 single-flight 可观察 | Redis Lua、集群或跨进程锁已通过 |
| 真实 Redis 故障实验 | 记录版本、连接目标、停服错误、数据库降级和恢复 | PostgreSQL 业务写可依赖 Redis |
| MOCK outbox 状态机 | 双写窗口和重复转发可确定复现 | PostgreSQL 事务与锁已验证 |
| PostgreSQL outbox 测试 | 预约与事件同成同败；租约可回收；重复发布可观察 | 外部邮件恰好发送一次 |
| BullMQ 测试 | jobId、attempts/backoff、failed 保留和关闭顺序有实际输出 | 业务副作用已幂等 |
| 业务幂等复验 | 同一 event ID 至少执行三次，站内通知仍只有一行 | 第三方供应商也支持相同语义 |

章级完成条件：

- [ ] 能指出 cache-aside 的读路径、写后失效路径和陈旧窗口；
- [ ] 能复现朴素 `DEL` 后旧读回填，并解释 epoch 为什么隔离旧写；
- [ ] 能画出 DB+Queue 两种双写顺序各自的崩溃窗口；
- [ ] outbox 插入与业务写共享同一个 transaction client；
- [ ] 能区分 event ID、BullMQ jobId 和业务幂等键；
- [ ] 重试、failed/dead-letter、人工重放和停机各有可判定步骤；
- [ ] 未运行的 PostgreSQL、Redis、BullMQ 或外部通知范围被明确记录。

## 证据边界

“至少一次”描述处理尝试，不等于最终副作用恰好一次。数据库站内信可以用唯一 event ID 与
业务写放在同一事务里；真实邮件、短信等外部副作用还需要供应商幂等键、发送账本和对账。没有
这些证据时只能声称任务已尝试或本地记录已创建。

缓存实例可按加速目标配置淘汰；队列 Redis 需要按队列产品文档评估持久化、内存策略、复制和
故障恢复。两类负载混用会让淘汰策略和容量目标冲突。任何 Redis 可用性都不能替代预约唯一
约束、对象授权和事务。

## 章节导航

- 上一章：[07 搜索、分页与文件](07-search-pagination-files.md)
- 第一课：[缓存失效与击穿控制](08-redis-queues-reliability/01-cache-invalidation-stampede-control.md)
- 下一章：[09 测试、OpenAPI 与可观测性](09-testing-openapi-observability.md)
- 覆盖审计：[后端覆盖矩阵](BACKEND-COVERAGE.md)
- 分卷入口：[从零建立业务后端](README.md)
