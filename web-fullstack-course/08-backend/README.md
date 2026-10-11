# 第八卷：从零建立业务后端

本卷把浏览器中的业务契约推进到可信的服务器边界。详细教程位于十个稳定编号章入口之下，共 `3/3/3/3/3/3/3/3/3/4` 篇。目标不是记住框架装饰器，而是能证明：输入被验证、权限逐对象判断、状态变化由数据库约束、失败可回滚且运行证据没有超出实际环境。

## 版本与运行条件

资料快照：2026-10-11。版本探针和服务探针的实际输出才是当前机器事实。

| 工具或协议 | 课程选择 | 责任与边界 |
| --- | --- | --- |
| Node.js | `24.x` LTS | 运行原生 HTTP、工具和测试 |
| pnpm | `12.10.1` | 安装综合项目依赖；教材仓库不保存清单或锁文件 |
| TypeScript | `6.0.3` 兼容线，另核对 TS 7 | 发射 Nest 装饰器元数据；不把编译当成 HTTP 证据 |
| NestJS | `12.1.1` | 模块、依赖注入、验证、控制器和错误映射 |
| PostgreSQL | `18` | 约束、事务、锁、迁移和真实持久化证据 |
| `pg` | 综合项目清单固定版本 | 参数化 SQL、连接池和显式事务 client |
| Redis / BullMQ | Redis 8.6.2；BullMQ 6.3.12 + ioredis 6.0.0 | 可选缓存与任务协调，不替代 PostgreSQL 业务事实 |
| OpenAPI | `3.0.3` | 描述并校验 HTTP 契约，不替代运行测试 |

使用 TypeScript 编译器发射装饰器元数据，不假设 Node 能直接运行带装饰器的 TypeScript。PostgreSQL 验证必须同时记录服务端主版本、客户端主版本、连接目标和迁移状态；目标服务无法启动时保留原始错误，不用其他主版本冒充兼容证据。

## 学习路线

### 01 Node 运行时与 HTTP

章入口：[从一个请求到可控停机](01-node-runtime-http.md)

1. [进程、事件循环与生命周期](01-node-runtime-http/01-node-process-event-loop-lifecycle.md)
2. [HTTP 请求、响应与流](01-node-runtime-http/02-http-request-response-streams.md)
3. [超时、错误与优雅停机](01-node-runtime-http/03-timeouts-errors-graceful-shutdown.md)

### 02 NestJS 与输入验证

章入口：[把请求边界放入应用结构](02-nest-api-validation.md)

1. [启动、模块与依赖注入](02-nest-api-validation/01-bootstrap-modules-dependency-injection.md)
2. [DTO 转换与运行时验证](02-nest-api-validation/02-dto-transformation-validation.md)
3. [Pipe、Filter 与错误契约](02-nest-api-validation/03-pipes-filters-error-contract.md)

### 03 SQL 建模

章入口：[让业务不变量进入数据库](03-sql-modeling.md)

1. [从领域规则到关系模型](03-sql-modeling/01-domain-to-relational-model.md)
2. [约束、外键与不变量](03-sql-modeling/02-constraints-foreign-keys-invariants.md)
3. [迁移、索引与查询计划](03-sql-modeling/03-migrations-indexes-query-plans.md)

### 04 PostgreSQL 数据访问

章入口：[建立连接、类型和仓储边界](04-postgres-data-access.md)

1. [连接、TLS、连接池与超时](04-postgres-data-access/01-connections-tls-pools-timeouts.md)
2. [参数化 SQL、类型与 SQLSTATE](04-postgres-data-access/02-parameterized-sql-types-sqlstate.md)
3. [仓储与连接所有权](04-postgres-data-access/03-repositories-connection-ownership.md)

### 05 事务与并发

章入口：[保证一个商品只被预约一次](05-transactions-concurrency.md)

1. [隔离级别、锁与竞态](05-transactions-concurrency/01-isolation-locks-races.md)
2. [原子预约与并发复现](05-transactions-concurrency/02-atomic-reservations-concurrency-reproduction.md)
3. [乐观锁、死锁、重试与回滚](05-transactions-concurrency/03-optimistic-lock-deadlock-retry-rollback.md)

### 06 认证、会话与授权

章入口：[从证明身份到拒绝越权](06-auth-sessions-rbac.md)

1. [密码哈希与账户边界](06-auth-sessions-rbac/01-password-hashing-account-boundaries.md)
2. [Cookie 会话、Origin 与 CSRF](06-auth-sessions-rbac/02-cookie-sessions-origin-csrf.md)
3. [认证、对象授权与 RBAC](06-auth-sessions-rbac/03-authentication-object-authorization-rbac.md)

### 07 搜索、分页与文件

章入口：[给查询和资源输入设定边界](07-search-pagination-files.md)

1. [安全搜索与动态查询](07-search-pagination-files/01-safe-search-dynamic-queries.md)
2. [Offset、Keyset 与一致分页](07-search-pagination-files/02-offset-keyset-consistent-pagination.md)
3. [上传流、类型、存储与清理](07-search-pagination-files/03-upload-streams-type-storage-cleanup.md)

### 08 Redis、Outbox 与队列

章入口：[在多系统失败之间保留业务事实](08-redis-queues-reliability.md)

1. [缓存失效与击穿控制](08-redis-queues-reliability/01-cache-invalidation-stampede-control.md)
2. [事务 Outbox 与一致性](08-redis-queues-reliability/02-transactional-outbox-consistency.md)
3. [BullMQ 幂等、重试、死信与停机](08-redis-queues-reliability/03-bullmq-idempotency-retry-dead-letter-shutdown.md)

### 09 测试、OpenAPI 与可观测性

章入口：[把正确性和诊断写成证据](09-testing-openapi-observability.md)

1. [单元、HTTP 与真实 PostgreSQL 测试](09-testing-openapi-observability/01-unit-http-real-postgres-tests.md)
2. [OpenAPI 生成与契约验证](09-testing-openapi-observability/02-openapi-generation-contract-validation.md)
3. [结构化日志、指标与 Trace](09-testing-openapi-observability/03-structured-logs-metrics-traces.md)

### 10 API 综合项目

章入口：[从干净工作区到真实边界验收](10-api-capstone.md)

1. [工作区、配置、迁移与启动](10-api-capstone/01-workspace-config-migration-bootstrap.md)
2. [领域、仓储与事务服务](10-api-capstone/02-domain-repositories-transaction-services.md)
3. [会话、控制器与授权接线](10-api-capstone/03-session-controllers-authorization-wiring.md)
4. [真实 HTTP 与数据库验收手册](10-api-capstone/04-real-http-database-acceptance-runbook.md)

## 连续项目与边界

“邻里集市”允许用户发布、收藏和预约闲置商品。`priceCents` 始终是非负安全整数分，持久化时间是 UTC ISO 8601，API 前缀为 `/api/v1`。浏览器主线使用同源 `HttpOnly` Cookie 会话；认证只说明调用者是谁，对象所有权和角色权限仍由后端逐次判断。

第 1、2 章分别使用原生 HTTP 和内存 Nest 教学服务，不声称持久化。第 3 至 9 章解释综合项目的数据库、权限、并发和可靠性边界。第 10 章是完整源码的唯一所有者；其他章节的片段必须放回其声明的文件与基线，不能拼成另一套应用。

一次有效预约独占一个商品，陈旧版本更新返回 `409`。综合项目不接入真实支付、邮件、生产文件存储或强制 Redis 依赖。Mock 仓储、内存状态、stub session 和预期输出必须保持显式标签。

## 验收入口

- [后端覆盖矩阵](BACKEND-COVERAGE.md)：知识点到理论、案例、诊断、练习与验收的映射。
- [统一项目契约](../00-guide/05-project-assessment.md)
- [版本基线](../00-guide/02-version-baseline.md)
- [全书验证记录](../VALIDATION.md)

每章先运行正常路径，再制造故障，最后完成没有现成答案的迁移练习。记录实际命令、版本、状态码、数据库结果和解释，不把示例中的预期输出当成自己的执行证据。能启动 API 只是起点；能证明越权被拒绝、并发只提交一个赢家、失败会回滚、队列可重试且停机可恢复，才进入业务后端能力范围。

## 本卷验证记录

验证日期：2026-10-11。以下是本轮实际观察，不是读者运行后的预期值：

- 文档：31 篇教程、10 个章入口、54 个覆盖 ID、668 条卷内相对链接通过；43 个 Markdown 文件无未闭合围栏或尾随空白。
- 抽取：47 个普通完整文件和综合项目 25 个唯一 owner 文件成功重建到 `/tmp`；6 个 JSON、1 个 YAML、2 个 env 模板通过解析。
- 代码：Node 24.21.0 对 25 个抽取 MJS 做语法检查，31 个抽取 TypeScript 源文件通过语法解析；纯 Node 领域测试 13 条通过；综合项目在 Node 24 下分别通过 TypeScript 6.0.3 与 7.0.2 编译。
- SQL/OpenAPI：5 个完整 SQL 文件通过 PostgreSQL AST 静态解析，共 38 条语句；Outbox 的列级权限与审计重放另在隔离 PostgreSQL 16.13 做补充语法/权限烟测，应用角色被拒绝、operator 重放与审计成功，但该结果不作为 PostgreSQL 18 兼容证据。OpenAPI 3.0.3 子集检查覆盖 7 个状态、精确 CSRF 格式和非空白标题。
- 原生 HTTP：实际观察 `200/201/400/404/413/415`，并验证整数分、UTC、失败写不增加列表以及 SIGTERM 排空后退出 0。
- Redis/BullMQ：Redis 8.6.2、BullMQ 6.3.12、ioredis 6.0.0 的隔离 demo 实际观察暂时错误第 3 次成功、永久错误 1 次进入 failed，并完成有序关闭；临时实例随后停止。
- PostgreSQL 18：**环境阻塞**。本机 `psql --version` 与 `postgres --version` 均为 PostgreSQL 16.13，只有 Homebrew `postgresql@16`，没有 PostgreSQL 18 server/client，因此未启动目标服务、未执行迁移、真实 HTTP/数据库、锁竞争或并发预约测试，也没有用 16 的结果替代 18。

临时验证目录不属于教材交付物，批次结束后删除。浏览器 Cookie 策略、生产 TLS、真实文件扫描、对象存储、邮件和生产容量仍不在本卷自动证据范围内。

## 官方入口

- [Node.js HTTP](https://nodejs.org/api/http.html)
- [NestJS 文档](https://docs.nestjs.com/)
- [PostgreSQL 18](https://www.postgresql.org/docs/18/)
- [node-postgres](https://node-postgres.com/)
- [Redis](https://redis.io/docs/latest/)
- [BullMQ](https://docs.bullmq.io/)
- [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3.html)
- [全书入口](../README.md)

下一卷：[全栈联调与交付](../09-fullstack/README.md)。
