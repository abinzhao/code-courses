# 10 API 综合项目：从唯一源码到真实 PostgreSQL 18 验收

## 本章使命

把前九章的 Node.js、NestJS、DTO、PostgreSQL、事务、session、对象授权、错误契约、测试和日志
组装成一个可机械重建的邻里集市 API。项目只在临时目录
`/tmp/full-course-verification/batch-e/market-api-capstone` 运行，教材树不保存 package、lockfile、
依赖、构建产物、`.env` 或数据库文件。

本章完成：

- 用户注册、登录、当前身份和退出；
- 商品分页查询、详情、创建和带 version 编辑；
- 收藏 PUT/DELETE 目标状态幂等；
- 同一商品并发预约只有一个赢家；
- 普通用户与管理员统计的角色边界；
- 统一 400/401/403/404/409/503 错误契约；
- 真实 HTTP socket、PostgreSQL 18、fixture、回滚与停机验收。

价格从传输到持久化始终使用非负整数分；时间保存为 PostgreSQL `timestamptz`，对外输出 UTC
ISO 8601。客户端不能提交 owner、buyer 或 role。

## 必要前置

- 已完成[第 09 章：测试、OpenAPI 与可观测性](09-testing-openapi-observability.md)及其前置章节。
- 能区分 DTO 校验、service 业务决策、repository SQL 和数据库约束。
- 能解释认证、对象授权、RBAC、Origin、CSRF 和 Cookie 属性的不同职责。
- 本机目标工具为 Node.js `24.21.0`、pnpm `12.10.1`、PostgreSQL 服务端主版本 18。
- 已阅读[版本基线](../00-guide/02-version-baseline.md)和
  [邻里集市统一契约](../00-guide/05-project-assessment.md)。

`psql --version` 只说明客户端；只有连接后的 `server_version_num` 才能证明服务端主版本。没有
运行 PostgreSQL 18 时，可以检查文档、提取和静态构建，但不得声称迁移、HTTP、事务或并发通过。

## 四课路线

| 顺序 | 教程 | 主要责任 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [工作区、配置与迁移启动](10-api-capstone/01-workspace-config-migration-bootstrap.md) | 临时工作区、25 文件唯一源码、固定 manifest、配置校验、迁移、fixture 与验收测试 | 5 小时 |
| 2 | [领域、仓储与事务服务](10-api-capstone/02-domain-repositories-transaction-services.md) | 整数分、UTC、仓储边界、同一 client、version、收藏幂等与并发预约 | 4 小时 |
| 3 | [Session、Controller 与授权接线](10-api-capstone/03-session-controllers-authorization-wiring.md) | scrypt、opaque session、Cookie、CSRF、对象授权、RBAC、错误与脱敏日志 | 4 小时 |
| 4 | [真实 HTTP 与数据库验收 Runbook](10-api-capstone/04-real-http-database-acceptance-runbook.md) | 机械提取、PG18 两库迁移、fixture、状态码/并发验收、SIGTERM 与清理 | 4 小时 |

依赖顺序不可交换：

```text
唯一源码、配置与迁移
  -> 领域/仓储/事务推理
  -> session/controller/授权接线
  -> 真实 HTTP + PostgreSQL 18 + 停机证据
```

## 完整源码责任

第 01 课是全部 **25 个项目文件的唯一完整源码 owner**。它用
`API_CAPSTONE_EXPECT` 和成对 `API_CAPSTONE_FILE_BEGIN/END` marker 声明：

- 根 workspace 与固定版本；
- contracts 和 API 清单；
- 环境模板、迁移执行器与 schema；
- config、数据库、错误、DTO、仓储和事务 service；
- auth、guard、controller、module、bootstrap 和 main；
- fixture 与真实 HTTP/数据库验收测试。

第 02、03 课只引用函数或展示局部片段；第 04 课只读取 marker 并执行命令。后续三课不得再次
声明完整项目文件。这样所有理论、故障实验和 runbook 都指向同一实现，不依赖覆盖顺序。

## 章级领域与安全契约

| 主题 | 固定决策 | 最后防线 |
| --- | --- | --- |
| 金额 | `priceCents` 非负整数，最大 `100000000` | DTO `IsInt` + SQL integer CHECK |
| 时间 | `timestamptz`，响应 `toISOString()` | PostgreSQL 时间点 + UTC 序列化 |
| 编辑 | owner 且提交当前 version | UPDATE 带 owner/version，旧值 409 |
| 收藏 | PUT 为有、DELETE 为无 | 复合主键 + `ON CONFLICT DO NOTHING` |
| 预约 | 非 owner、available、同事务 | `FOR UPDATE` + 部分唯一索引 |
| session | opaque HttpOnly Cookie，数据库存 hash | 过期查询 + logout 删除 |
| CSRF | 写请求精确 Origin + token | SessionGuard |
| 管理员 | 角色从 session JOIN 用户表读取 | controller RBAC |
| 错误 | code/message/requestId | filter 不回传 stack/SQL |
| 日志 | allow-list 元数据和 SQLSTATE | 不记 header/body/秘密/参数 |

每条 mutation 都要能回答：

```text
谁可以执行？
事务由谁拥有？
重复请求是否幂等？
冲突映射为何种状态？
数据库怎样兜底？
失败后哪些副作用可回滚？
```

## 累计邻里集市验收

1. `19900` 分通过 HTTP 和数据库保持整数，fixture 时间对应
   `2026-10-11T00:00:00.000Z`。
2. 配置错误在监听前失败；生产 `APP_ORIGIN` 必须是 HTTPS 精确源。
3. 两个数据库分别迁移；首次 applied、再次 already applied；历史 checksum 漂移失败。
4. fixture 只接受 `_test` 数据库，并确认 PostgreSQL 服务端主版本 18。
5. 商品 owner 来自 session，不接受 body 中 `ownerId`；预约 buyer 同理。
6. 非 owner 编辑 403；owner 合法编辑 version + 1；旧 version 返回 409。
7. 收藏重复 PUT 只有一行，重复 DELETE 保持零行，另一用户 DELETE 不影响原用户。
8. 预约事务故障注入后 reservations 为零，Listing 状态和 version 不变。
9. 两个真实 HTTP 请求并发预约：一个 201、一个 409，数据库恰好一行有效预约。
10. 无 session/错误密码/退出后/过期后为 401；权限或 CSRF 问题为 403；不存在为 404。
11. 错误 body 无 stack，requestId 与响应头一致；日志不含 Cookie、token、密码、连接串和 SQL 参数。
12. 独立 API 进程 readiness 为 200；SIGTERM 后出现 shutdown_complete，3000 端口释放。

## 必需命令与证据

| 阶段 | 代表命令 | 必须观察 |
| --- | --- | --- |
| 结构 | 第 04 课 extractor | 25/25，owner 全为 01 |
| 环境 | `node --version`、`pnpm --version`、`postgres --version` | 固定 Node/pnpm，PG binary 18 |
| 安装 | `pnpm install`、`pnpm install --frozen-lockfile` | lockfile hash 不变 |
| 构建 | `pnpm build` | TypeScript 实际退出 0 |
| 迁移 | 开发/测试库各执行两次 | applied -> already applied |
| 数据库 | 查询 target/version/migrations | 回环端口、库名、server 18、迁移顺序 |
| fixture | `pnpm fixture` 两次 | 可重放，整数分/UTC 正确 |
| 验收 | `pnpm test` | 真实 HTTP/PG、状态码、回滚和并发断言 |
| 停机 | 直接启动 Node、SIGTERM、`lsof` | complete、进程退出、端口释放 |

一项综合 Node test 中可以有多项断言，但不能把它报告成几十个独立测试。配置文本、预期输出、
旧机器历史和静态构建也不能替代本轮 HTTP/数据库运行证据。

## 章级排除项

以下能力明确不在本章核心实现或未由本章证明：

- 真实支付、邮件、文件上传、对象存储和媒体处理；
- Review 的交易完成状态与评价 HTTP 入口；
- Redis、BullMQ、缓存、outbox worker 和死信运维，它们只可作为第 8 章扩展；
- 浏览器 Secure/SameSite 行为、生产 TLS、CORS 代理和 CSP；
- 生产登录限频、WAF、密钥托管、审计平台与隐私保留策略；
- OpenAPI 生成客户端在真实前端中的完整联调；
- 托管 CI、多实例滚动发布、容量压测、备份恢复和灾难演练；
- Firefox、Safari、真实移动设备和生产可观测后端。

本地临时 PostgreSQL 的 `trust` 认证只允许绑定回环地址的一次性 runbook；不得复制到生产。
生产运行身份只应有 DML 权限，迁移身份单独管理，API 不使用超级用户。

## 章级完成标准

- [ ] 四篇教程均严格包含任务卡、1..13、我现在能做到什么、单元导航。
- [ ] 第 01 课是唯一完整源码 owner，expected/header/BEGIN/END 各 25 条且路径一致。
- [ ] 依赖、配置、迁移顺序、金额、UTC、session、CSRF、授权、错误和日志边界可追溯。
- [ ] 第 02、03、04 课没有第二份完整文件，只引用唯一源码。
- [ ] 第 04 课从空临时目录机械提取，不手工猜测覆盖顺序。
- [ ] PostgreSQL 18 可用时，两库迁移、fixture、HTTP、回滚、并发和停机实际通过。
- [ ] PostgreSQL 18 不可用时，保存精确命令、版本、目标与原始阻塞，不写通过。
- [ ] 验证后停止自有进程并清理精确 `/tmp` 目录，不污染教材树。

## 章节导航

- 上一章：[09 测试、OpenAPI 与可观测性](09-testing-openapi-observability.md)
- 第一课：[工作区、配置与迁移启动](10-api-capstone/01-workspace-config-migration-bootstrap.md)
- 分卷入口：[后端与 API 工程](README.md)
- 下一卷：[全栈集成与交付](../09-fullstack/README.md)
- 全书入口：[Web 全栈课程](../README.md)
