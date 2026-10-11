# 第八卷：从零建立业务后端

## 本卷定位与教材结构

本卷把浏览器中的业务契约推进到可信的服务器边界。本 README 按章节直接导航详细教程，
统筹路线、依赖和综合验收；教程负责可运行实现与阶段验收，覆盖矩阵负责知识点审计。目标不是记住框架
装饰器，而是能证明输入、权限、事务、回滚与运行证据各自成立。

## 学习路线

### 01 Node 运行时与 HTTP

1. [进程、事件循环与生命周期](01-node-runtime-http/01-node-process-event-loop-lifecycle.md)
2. [HTTP 请求、响应与流](01-node-runtime-http/02-http-request-response-streams.md)
3. [超时、错误与优雅停机](01-node-runtime-http/03-timeouts-errors-graceful-shutdown.md)

### 02 NestJS 与输入验证

1. [启动、模块与依赖注入](02-nest-api-validation/01-bootstrap-modules-dependency-injection.md)
2. [DTO 转换与运行时验证](02-nest-api-validation/02-dto-transformation-validation.md)
3. [Pipe、Filter 与错误契约](02-nest-api-validation/03-pipes-filters-error-contract.md)

### 03 SQL 建模

1. [从领域规则到关系模型](03-sql-modeling/01-domain-to-relational-model.md)
2. [约束、外键与不变量](03-sql-modeling/02-constraints-foreign-keys-invariants.md)
3. [迁移、索引与查询计划](03-sql-modeling/03-migrations-indexes-query-plans.md)

### 04 PostgreSQL 数据访问

1. [连接、TLS、连接池与超时](04-postgres-data-access/01-connections-tls-pools-timeouts.md)
2. [参数化 SQL、类型与 SQLSTATE](04-postgres-data-access/02-parameterized-sql-types-sqlstate.md)
3. [仓储与连接所有权](04-postgres-data-access/03-repositories-connection-ownership.md)

### 05 事务与并发

1. [隔离级别、锁与竞态](05-transactions-concurrency/01-isolation-locks-races.md)
2. [原子预约与并发复现](05-transactions-concurrency/02-atomic-reservations-concurrency-reproduction.md)
3. [乐观锁、死锁、重试与回滚](05-transactions-concurrency/03-optimistic-lock-deadlock-retry-rollback.md)

### 06 认证、会话与授权

1. [密码哈希与账户边界](06-auth-sessions-rbac/01-password-hashing-account-boundaries.md)
2. [Cookie 会话、Origin 与 CSRF](06-auth-sessions-rbac/02-cookie-sessions-origin-csrf.md)
3. [认证、对象授权与 RBAC](06-auth-sessions-rbac/03-authentication-object-authorization-rbac.md)

### 07 搜索、分页与文件

1. [安全搜索与动态查询](07-search-pagination-files/01-safe-search-dynamic-queries.md)
2. [Offset、Keyset 与一致分页](07-search-pagination-files/02-offset-keyset-consistent-pagination.md)
3. [上传流、类型、存储与清理](07-search-pagination-files/03-upload-streams-type-storage-cleanup.md)

### 08 Redis、Outbox 与队列

1. [缓存失效与击穿控制](08-redis-queues-reliability/01-cache-invalidation-stampede-control.md)
2. [事务 Outbox 与一致性](08-redis-queues-reliability/02-transactional-outbox-consistency.md)
3. [BullMQ 幂等、重试、死信与停机](08-redis-queues-reliability/03-bullmq-idempotency-retry-dead-letter-shutdown.md)

### 09 测试、OpenAPI 与可观测性

1. [单元、HTTP 与真实 PostgreSQL 测试](09-testing-openapi-observability/01-unit-http-real-postgres-tests.md)
2. [OpenAPI 生成与契约验证](09-testing-openapi-observability/02-openapi-generation-contract-validation.md)
3. [结构化日志、指标与 Trace](09-testing-openapi-observability/03-structured-logs-metrics-traces.md)

### 10 API 综合项目

1. [工作区、配置、迁移与启动](10-api-capstone/01-workspace-config-migration-bootstrap.md)
2. [领域、仓储与事务服务](10-api-capstone/02-domain-repositories-transaction-services.md)
3. [会话、控制器与授权接线](10-api-capstone/03-session-controllers-authorization-wiring.md)
4. [真实 HTTP 与数据库验收手册](10-api-capstone/04-real-http-database-acceptance-runbook.md)

## 学习与运行

精确技术选择、核验日期和兼容线统一见[版本基线](../00-guide/version-baseline.md)。开始实验前
记录运行时、包管理器、编译器、数据库客户端与服务端的实际探针输出。TypeScript 编译成功不等于
HTTP 行为正确；数据库验证还必须记录连接目标与迁移状态，不能用其他主版本冒充目标环境证据。

教材仓库只保存 Markdown。应用清单、锁文件、依赖、数据库状态和构建产物只能出现在读者练习
目录或临时验证目录。

## 连续项目与边界

“邻里集市”允许用户发布、收藏和预约闲置商品。`priceCents` 始终是非负安全整数分，持久化时间是 UTC ISO 8601，API 前缀为 `/api/v1`。浏览器主线使用同源 `HttpOnly` Cookie 会话；认证只说明调用者是谁，对象所有权和角色权限仍由后端逐次判断。

第 1、2 章分别使用原生 HTTP 和内存 Nest 教学服务，不声称持久化。第 3 至 9 章解释综合项目的数据库、权限、并发和可靠性边界。第 10 章是完整源码的唯一所有者；其他章节的片段必须放回其声明的文件与基线，不能拼成另一套应用。

一次有效预约独占一个商品，陈旧版本更新返回 `409`。综合项目不接入真实支付、邮件、生产文件存储或强制 Redis 依赖。Mock 仓储、内存状态、stub session 和预期输出必须保持显式标签。

## 验收

- [后端覆盖矩阵](BACKEND-COVERAGE.md)：知识点到理论、案例、诊断、练习与验收的映射。
- [统一项目契约](../00-guide/project-contract.md)
- [版本基线](../00-guide/version-baseline.md)
- [全书验证记录](../VALIDATION.md)

每章先运行正常路径，再制造故障，最后完成没有现成答案的迁移练习。记录实际命令、版本、状态码、数据库结果和解释，不把示例中的预期输出当成自己的执行证据。能启动 API 只是起点；能证明越权被拒绝、并发只提交一个赢家、失败会回滚、队列可重试且停机可恢复，才进入业务后端能力范围。

## 验证范围

本卷已完成文档结构、代码与配置抽取、代表性 Node/TypeScript、SQL/OpenAPI、原生 HTTP 和
Redis/BullMQ 验证；目标 PostgreSQL 服务、真实迁移、锁竞争和端到端数据库路径仍受本机环境
限制。精确数量、版本、运行结果和未验证范围统一见[交付与验证说明](../VALIDATION.md)。

## 资料与导航

- [Node.js HTTP](https://nodejs.org/api/http.html)
- [NestJS 文档](https://docs.nestjs.com/)
- [PostgreSQL 18](https://www.postgresql.org/docs/18/)
- [node-postgres](https://node-postgres.com/)
- [Redis](https://redis.io/docs/latest/)
- [BullMQ](https://docs.bullmq.io/)
- [OpenAPI 3.0.3](https://spec.openapis.org/oas/v3.0.3.html)

[上一卷：工程化](../07-engineering/README.md) · [全书入口](../README.md) ·
[下一卷：全栈联调与交付](../09-fullstack/README.md)
