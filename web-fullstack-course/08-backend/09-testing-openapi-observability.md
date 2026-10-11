# 09 测试、OpenAPI 与可观测性：让正确性和故障都有证据

## 本章使命

把“测试通过、文档已生成、日志能搜到”拆成可审查的证据链：

1. 单元测试证明纯规则，模块测试证明接线，HTTP 测试证明协议，真实 PostgreSQL 测试证明 SQL、
   约束、事务和并发；任一层都不能冒充另一层；
2. OpenAPI 3.0.3 从受控源生成或维护，经标准校验、稳定 diff 和真实响应契约检查防止漂移；
3. 日志、指标和 trace 使用相同请求上下文定位故障，同时通过 allow-list、低基数和属性限制保护
   Cookie、Token、密码、SQL 参数、搜索词和个人信息。

本章不把类型检查、Mock 仓储或 JSON 可解析写成真实 HTTP/数据库证据。第 10 章综合项目仍是
完整源码与验收入口；本章负责解释每类证据怎样建立、失败和复验。

## 必要前置与运行边界

- 已完成[Cookie 会话、CSRF 与对象授权](06-auth-sessions-rbac.md)；
- 已完成[事务与并发](05-transactions-concurrency.md)；
- 已完成[Redis、Outbox 与队列](08-redis-queues-reliability.md)；
- 阅读[统一项目契约](../00-guide/05-project-assessment.md)中的状态码、整数分、UTC 和阻断项；
- 使用 Node.js 24、NestJS 12.1.1；真实数据边界只接受隔离 PostgreSQL 18 测试库；
- OpenAPI 基线为 3.0.3，工具具体补丁版本以项目锁文件和实际探针为准。

测试中的假时钟、stub session、Mock provider、静态 OpenAPI fixture 和内存 metrics 会明确标记。
生产监控后端、采样策略、告警和真实跨服务传播必须在目标环境另行验证。

## 学习路线

| 顺序 | 教程 | 核心问题 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [单元、HTTP 与真实 PostgreSQL 测试](09-testing-openapi-observability/01-unit-http-real-postgres-tests.md) | 每一层能证明什么，数据库状态怎样安全隔离 | 170 分钟 |
| 2 | [OpenAPI 生成与契约验证](09-testing-openapi-observability/02-openapi-generation-contract-validation.md) | DTO、规范、真实响应和客户端怎样避免漂移 | 150 分钟 |
| 3 | [结构化日志、指标与 Trace](09-testing-openapi-observability/03-structured-logs-metrics-traces.md) | 怎样关联故障而不泄密或制造高基数 | 160 分钟 |

依赖顺序：

```text
行为和持久状态证据
  -> 协议机器契约与漂移门
  -> 运行时日志/指标/trace 诊断
```

OpenAPI 契约测试复用第一课的 HTTP harness；遥测课用同一 request ID 和 route template 关联测试
故障，但不以“日志出现”替代业务断言。

## 章级邻里集市任务

为“卖家更新商品、买家无权更新、两个买家并发预约”建立完整证据：

1. 纯函数单测锁定整数分、UTC、授权决策和错误映射；
2. Nest module test 只替换真正外部 provider，不把 PostgreSQL 锁 mock 掉；
3. HTTP 测试覆盖 Cookie、Origin、CSRF、DTO、401/403/404/409 和统一 Error；
4. PostgreSQL 测试前验证 `_test` 数据库、服务端/客户端主版本 18、连接目标和迁移状态；
5. 越权后同时检查响应与数据库 title/version/owner 未变；
6. 并发预约同时检查 `[201,409]`、唯一有效 reservation 和 Listing 状态；
7. OpenAPI 描述参数、Cookie security、CSRF header、整数分、UTC、成功与错误 schema；
8. CI 重新生成规范到临时位置，标准校验后做稳定 diff，并用真实响应做契约检查；
9. 日志用 requestId/traceId 关联，指标只使用 route template/status class 等低基数标签；
10. Cookie、Authorization、CSRF、密码、连接串、SQL 参数、q 原文和事件 payload 不进入遥测。

## 综合验收与证据

| 证据 | 合格判定 | 不能推出的结论 |
| --- | --- | --- |
| 纯 Node 单测 | 授权、金额、UTC 等纯规则红绿 | Nest/HTTP/数据库正确 |
| Nest module test | provider/guard/filter 接线可观察 | PostgreSQL 约束和锁正确 |
| HTTP + Mock repository | 协议与错误映射正确，Mock 显式标记 | SQL 或持久化正确 |
| HTTP + PostgreSQL 18 | 协议、真实 SQL、事务与状态一起验证 | 浏览器代理/Cookie 策略全部正确 |
| OpenAPI parse/lint/diff | 规范格式、结构和生成结果稳定 | 运行实现一定符合规范 |
| 响应契约测试 | 实际状态/正文与规范匹配 | 对象授权规则完整，仍需业务断言 |
| 日志/指标/trace 故障注入 | 同一请求可关联且禁止字段未泄露 | 生产采样、保留和告警已部署 |

章级完成条件：

- [ ] 每条关键规则有最小充分测试层，未用昂贵 E2E 替代所有纯函数测试；
- [ ] 真实 PostgreSQL 测试有数据库身份门禁和隔离清理；
- [ ] Mock、stub、静态 fixture 均有醒目标记；
- [ ] OpenAPI 生成、标准校验、稳定 diff 和运行响应检查分成独立门；
- [ ] generated client 的类型不被当作不可信 JSON 的运行时验证；
- [ ] 日志字段白名单、指标基数、trace 属性和采样边界可检查；
- [ ] 数据库中断、CSRF 拒绝、版本冲突和慢查询能被不同信号正确分类；
- [ ] 未运行的 PostgreSQL、浏览器、监控后端和跨服务 trace 被列为剩余风险。

## 证据边界

真实 PostgreSQL 并发测试必须记录服务端主版本、客户端主版本、连接目标和迁移状态。目标 18
无法启动时保留原始错误，不用 PostgreSQL 16、Mock repository 或 SQL 字符串测试冒充兼容。
测试重复多轮提高发现概率，但安全性仍来自约束、锁和事务设计。

OpenAPI 是机器可读协议承诺，不证明业务权限。可观测性是诊断证据，不应改变成功条件：不能因
为某条日志存在就让错误请求返回 200，也不能为了指标好看吞掉异常。遥测后端本身处理敏感数据，
需要访问控制、加密、保留期和删除策略；本章代码片段不代表这些生产治理已经完成。

## 章节导航

- 上一章：[08 Redis、Outbox 与队列](08-redis-queues-reliability.md)
- 第一课：[单元、HTTP 与真实 PostgreSQL 测试](09-testing-openapi-observability/01-unit-http-real-postgres-tests.md)
- 下一章：[10 API 综合项目](10-api-capstone.md)
- 分卷入口：[从零建立业务后端](README.md)
