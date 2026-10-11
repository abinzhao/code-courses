# 05：性能、安全与运维，用证据证明系统能恢复

## 本章任务

在读者拥有的隔离邻里集市环境中，建立有前提的性能基线，设计不泄密的日志、指标与告警，
制作 PostgreSQL 18 custom 备份并恢复到全新的 `market_restore_test`，最后演练数据库、
Redis、worker、日志磁盘和凭据泄露故障。所有结论都必须来自本轮观察，不能用教材预期值代替。

## 产出与安全边界

- `ops/load.mjs`：只允许 loopback、并发/时长/超时/样本均有上限的闭环负载器。
- 一份性能前提表：硬件、版本、10,000 条虚构数据、预热、请求比例和教学门槛。
- 一份低基数遥测与告警表：字段 allow-list、route template、负责人和处置步骤。
- `ops/backup.sh`：本地 `_test` 库 custom dump、catalog、SHA-256 与原子改名。
- 一次全新库恢复记录：单事务、最小权限、业务不变量、API smoke、RTO 与 RPO。
- 一份故障与轮换记录：现象、证据、原因、修复、复验，以及旧凭据/旧 session 已撤销的证明。

本章命令只允许读者自有的 loopback 服务、`market_ops_test`、`market_restore_test`、
Compose 项目 `market-ops-lab` 和
`/tmp/full-course-verification/batch-f/reader-owned/`。禁止对生产或共享环境压测、停服务、
填磁盘、轮换凭据或恢复数据；禁止默认 `docker compose down -v`、`pg_restore --clean`、
覆盖已有数据库、删除 `pg_wal`、数据库文件或保留备份。

## 必要前置

- 已完成[发布与回滚](04-ci-release-rollback.md)和
  [后端 outbox](../08-backend/08-redis-queues-reliability/02-transactional-outbox-consistency.md)。
- 邻里集市 API、PostgreSQL、Redis/worker、`/live`、`/ready` 和同源入口已经接通。
- 理解整数分、UTC、对象授权、事务、幂等、Cookie session、CSRF 与 `409` 的项目契约。
- 运行时基线为 Node.js 24、PostgreSQL 18；Docker/Compose 只在本机实际可用时执行。
- 当前没有 PostgreSQL 18 或 Docker 时，只做 Node/Bash/SQL 静态检查，并把恢复、容量和故障
  演练标为未验证。

## 四课路线

| 顺序 | 教程 | 单一责任 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [负载基线与慢查询证据](05-performance-security-operations/01-load-baseline-slow-query.md) | 声明前提，测 p50/p95/p99、错误类、计划与 pool waits，不夸大因果 | 3 小时 |
| 2 | [日志、指标、告警与磁盘](05-performance-security-operations/02-logs-metrics-alerts-disk.md) | 日志 allow-list、低基数指标、可行动告警、轮转、磁盘与证书 | 3 小时 |
| 3 | [备份完整性与隔离恢复](05-performance-security-operations/03-backup-integrity-isolated-restore.md) | PG18 custom dump、catalog/checksum、全新库单事务恢复与业务验收 | 4 小时 |
| 4 | [故障演练与凭据轮换](05-performance-security-operations/04-failure-drills-credential-rotation.md) | 隔离依赖故障、outbox/队列幂等恢复、分阶段凭据和 session 撤销 | 4 小时 |

依赖顺序如下：

```text
先声明负载并取得可比较基线
  -> 再让日志、指标与告警能解释变化
  -> 再证明备份可恢复且权限/业务不变量成立
  -> 最后注入故障并轮换凭据、撤销 session
```

没有基线时，告警阈值没有上下文；没有观测时，恢复快慢无法解释；没有隔离恢复时，故障演练
只能证明进程重启，不能证明数据正确。

## 教学门槛

在事先声明的单机条件、PostgreSQL 18、至少 10,000 条虚构商品、公共列表请求占比 100% 下：

- 先并发 1 预热并确认功能，再并发 10 测量 60 秒；
- 预期业务冲突与内部 `5xx` 分开统计；
- 教学目标为网络错误 0、内部 `5xx` 0、公共列表 p95 不超过 300 ms；
- 同时记录 pool waiting、数据库等待与查询计划；
- 门槛只适用于该环境，不是互联网容量或生产 SLO 承诺。

若机器条件需要替代门槛，评审必须在运行前书面确定。测完后降低阈值属于改变验收规则。

## 章级邻里集市事故任务

1. 记录环境和 10,000 条虚构数据，执行预热与有界负载。
2. 保存状态类、p95、查询计划、pool waiting、outbox age 和磁盘/证书基线。
3. 对本地 `market_ops_test` 生成 custom dump、catalog 和 SHA-256。
4. 只创建全新的 `market_restore_test`，单事务恢复并重新施加运行权限。
5. 验证金额、owner、有效预约唯一性、迁移 checksum、索引、权限和临时 API smoke。
6. 依次停止 `market-ops-lab` 自有 db、Redis 和 worker；恢复后验证 outbox 与消费者幂等。
7. 分阶段切换数据库凭据，确认新连接后禁用旧身份；随后撤销泄露窗口内的 session。
8. 保存事故时间线和失败证据，不以重启所有服务、清空队列或删除数据掩盖根因。

## 综合验收证据

- 性能报告同时写前提、预热、请求比例、状态/错误类、p50/p95/p99、吞吐与闭环模型限制。
- `EXPLAIN (ANALYZE, BUFFERS)` 只作用于已审查的测试库只读查询，并与池等待分开解释。
- 日志不含密码、Cookie、sid、CSRF、连接串、原始查询正文；指标不含 requestId/userId/资源 ID。
- 每条告警都有阈值、最小流量、持续窗口、负责人、检查动作和恢复条件。
- dump 非空、catalog 可读、checksum 可复算，但只有全新库恢复和业务 smoke 才算可恢复。
- RTO 用故障开始到服务复验通过的实际时间；RPO 用备份覆盖点与最后确认写入比较。
- 数据库故障保持 live 200、ready 503；Redis/worker 恢复后事件不丢且业务副作用不重复。
- 新凭据连接成功后旧凭据才撤销；数据库恢复不被错误地当成 session 或外部副作用撤销。

当前工作区没有 Docker 与 PostgreSQL 18 时，上述容器、恢复、容量与轮换证据均不得计为通过。
Node/Bash 语法和 SQL 人工审查只属于静态证据。

## 章节导航

- 上一章：[04 CI、发布与回滚](04-ci-release-rollback.md)
- 第一课：[负载基线与慢查询证据](05-performance-security-operations/01-load-baseline-slow-query.md)
- 分卷入口：[全栈联调与交付](README.md)
- 下一章：[06 毕业项目](06-graduation-project.md)
- 全书入口：[Web 全栈课程](../README.md)
