# 05 事务与并发：让竞争结果可证明

## 本章使命

本章回答邻里集市最关键的状态问题：两个买家同时预约同一商品，为什么最多只有一个成功？
“页面把按钮禁用”“Node.js 是单线程”“我手工点了两次没复现”都不是答案。多个请求、进程和
副本会在数据库等待期间交错，最终不变量必须由数据库事务、锁、条件写和唯一约束共同保证。

本章建立三层证据：

1. 用确定性内存调度展示 check-then-write 的失败形状，但明确它不是数据库证据；
2. 在真实 PostgreSQL 18 上同时释放两个预约事务，观察一个提交、一个受控冲突、最终有效数为 1；
3. 对编辑冲突、死锁和序列化失败实施有限整笔重试，并把外部副作用留在提交边界之外。

## 必要前置与版本

先完成：

- [第 3 章：SQL 数据建模](03-sql-modeling.md)；
- [第 4 章：PostgreSQL 数据访问](04-postgres-data-access.md)；
- [仓储契约与连接所有权](04-postgres-data-access/03-repositories-connection-ownership.md)。

目标环境是 Node.js 24 LTS、课程锁定的 `pg` 和 PostgreSQL 18。真实并发运行前必须记录客户端/
服务端主版本、脱敏连接目标、数据库名、迁移状态和夹具 ID。PostgreSQL 16、内存 Map、fake
client 或串行 `await` 的结果都不能代替 18 上的并发证据。

所有实验只能操作隔离数据库与虚构 UUID。价格继续使用整数分，数据库时间使用 `timestamptz`，
证据时间戳使用 UTC ISO 8601。清理脚本不得指向生产或共享数据。

## 学习路线

| 顺序 | 教程 | 核心问题 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [隔离、行锁与竞态](05-transactions-concurrency/01-isolation-locks-races.md) | check-then-write 为什么失败，锁和约束各负责什么 | 130 分钟 |
| 2 | [原子预约与真实并发复现](05-transactions-concurrency/02-atomic-reservations-concurrency-reproduction.md) | 怎样让两个事务真正重叠并取得可审计证据 | 160 分钟 |
| 3 | [乐观锁、死锁、重试与回滚](05-transactions-concurrency/03-optimistic-lock-deadlock-retry-rollback.md) | 哪些失败可重试，如何避免覆盖和重复副作用 | 150 分钟 |

顺序是“理解交错 → 真实复现稀缺资源竞争 → 扩展到版本冲突和恢复”。不要在第一课的内存输出后
声称数据库问题已解决，也不要在第三课用无限重试掩盖锁顺序错误。

## 章级邻里集市任务

实现并验收预约与编辑两条路径：

1. 预约事务 checkout 一条 client，`BEGIN` 后锁定 Listing 行。
2. 在锁内检查商品存在、非本人、状态为 available。
3. 插入预约并把 Listing 更新为 reserved、version 加 1，然后提交。
4. `reservations_one_active_per_listing_idx` 部分唯一索引作为所有写路径的数据库兜底。
5. 两个独立 client 由同一个 barrier 同时进入竞争；不能串行调用后称为并发。
6. 结果必须是一个 fulfilled/created、一个受控 conflict，最终有效预约恰为 1。
7. 编辑使用 `WHERE id/owner_id/version` 条件 UPDATE；同一旧版本最多一个成功。
8. 只对 `40001`/`40P01` 等明确瞬时事务失败有限重试整笔回调；权限、校验和业务冲突不重试。
9. 邮件、队列和其他外部副作用不在可回滚事务中直接执行。

## 综合验收与证据

| 检查 | 合格证据 | 不能推出的结论 |
| --- | --- | --- |
| 内存竞态模型 | barrier 后两次 check 都通过并产生重复写 | PostgreSQL 一定如此调度 |
| 两终端行锁 | B 等待，A 提交后 B 读到新状态/超时 | 完整预约事务已正确 |
| 双请求脚本 | 两个不同 backend PID、重叠时间窗、1 创建 1 冲突 | 生产负载容量足够 |
| 最终数据库断言 | 有效预约 count=1、Listing=reserved、version+1 | 所有取消流程正确 |
| rollback 注入 | 插入后抛错，两个表都恢复 | 外部副作用可回滚 |
| 乐观锁 | 同旧 version 的两个更新仅一个 rowCount=1 | 对象授权已自动覆盖 |
| 死锁实验 | 观察 `40P01`，统一锁顺序后恢复 | 永远不会再死锁 |
| 重试测试 | 仅目标 SQLSTATE、有上限、整笔新事务 | 任意错误都适合重试 |

章级验收：

- [ ] check-then-write 错误有稳定交错证据，不靠 `sleep` 猜时序。
- [ ] 真实并发证据满足 PostgreSQL 18、两个 client、同一 barrier 和最终状态四项门槛。
- [ ] 事务中的 SQL 全部命中同一 client，并在 finally release。
- [ ] 行锁、条件 UPDATE、唯一约束的职责没有互相替代。
- [ ] 业务冲突映射为 409；权限失败、校验失败不自动重试。
- [ ] rollback 后同时检查 reservations 与 listings，不只检查抛错。
- [ ] 所有锁路径采用一致顺序，事务内不等待外部网络或用户。
- [ ] 环境不满足时保留阻塞，不用 PostgreSQL 16 的输出冒充 18。

## 证据边界

内存模型能证明某个交错在逻辑上可能发生，fake client 能证明调用顺序；两者都不能证明 MVCC、
行锁、唯一索引或 SQLSTATE。只有目标 PostgreSQL 18 上的实际版本、连接、迁移、backend PID、
事务结果和最终查询共同构成并发证据。一次双请求通过也不等于容量测试、故障转移或生产压测。

## 章节导航

[上一章：PostgreSQL 数据访问](04-postgres-data-access.md) ·
[后端卷目录](README.md) ·
[下一章：认证、会话与授权](06-auth-sessions-rbac.md)
