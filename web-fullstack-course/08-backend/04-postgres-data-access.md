# 04 PostgreSQL 数据访问：连接、查询与所有权

## 本章使命

本章把第 3 章的关系模型接入 Node.js 服务，但不把“能发出 SQL”误当成可靠的数据访问层。
你将建立三条边界：

1. 连接配置能验证目标、TLS、超时和池预算，且日志不泄漏凭据；
2. SQL 结构固定、值参数化，驱动类型与 SQLSTATE 在一个位置映射；
3. 仓储只使用调用方交给它的查询器，事务期间不会偷偷回到连接池借另一条连接。

本章继续使用邻里集市的 `users`、`listings`、`favorites` 和 `reservations`。价格始终是整数分，
持久化时间读出后统一为 UTC ISO 8601。示例使用 `pg` 而非 ORM，以便直接观察连接和查询边界。

## 必要前置与版本

先完成：

- [第 3 章：SQL 数据建模](03-sql-modeling.md)；
- [版本基线](../00-guide/02-version-baseline.md)；
- [邻里集市项目契约](../00-guide/05-project-assessment.md)。

课程目标环境是 Node.js 24 LTS、PostgreSQL 18 与项目实际锁定的 `pg`。开始真实数据库实验前，
必须记录 `node --version`、`psql --version`、服务端 `server_version`、脱敏后的连接目标和
迁移状态。非目标 PostgreSQL 主版本的成功输出不能替代 PostgreSQL 18 的运行证据。

练习文件创建在读者自己的 `market-api-lab/`，不在教材仓库安装依赖或保存 `.env`。所有连接串、
口令、Cookie 与 token 均使用占位值；终端历史和错误日志不得出现真实凭据。

## 学习路线

| 顺序 | 教程 | 核心问题 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [连接、TLS、连接池与超时](04-postgres-data-access/01-connections-tls-pools-timeouts.md) | 怎样证明连到正确目标，并让连接失败可诊断、可清理 | 120 分钟 |
| 2 | [参数化 SQL、类型映射与 SQLSTATE](04-postgres-data-access/02-parameterized-sql-types-sqlstate.md) | 值、标识符、驱动类型和数据库错误如何保持边界 | 130 分钟 |
| 3 | [仓储契约与连接所有权](04-postgres-data-access/03-repositories-connection-ownership.md) | 普通查询和事务如何复用同一仓储而不换连接 | 130 分钟 |

顺序是“先建立可信连接 → 再执行可信查询 → 最后约束调用关系”。第 5 章会直接复用第三课的
`Queryable`/事务 client 契约；若跳过连接所有权，`BEGIN` 和后续写入可能落到不同会话。

## 章级邻里集市任务

为商品列表与单条商品读取建立一个可审查的数据访问层：

1. 配置模块拒绝缺失连接目标、越界池大小和生产环境禁用证书校验。
2. 启动探针只记录数据库名、主机别名、服务端主版本、客户端主版本与迁移状态，不记录口令。
3. 列表查询用 `$1..$n` 传值；排序列由服务端允许列表选择固定 SQL 片段。
4. `price_cents` 只接受安全整数，`created_at` 输出 UTC ISO 8601。
5. 唯一冲突根据 SQLSTATE、当前操作和约束名映射，未知数据库错误不伪装成业务错误。
6. 普通读取可使用池；事务服务获得一个 client 后，把同一对象显式传给所有仓储调用。
7. 命令脚本和服务关闭路径都等待 `pool.end()`，借出的 client 在 `finally` 释放。

章级产出建议如下：

```text
market-api-lab/
  src/db/config.mjs
  src/db/pool.mjs
  src/db/errors.mjs
  src/listings/listings-repository.mjs
  scripts/db-probe.mjs
  test/
```

这些文件是读者练习位置，不是本教材仓库中的已生成工程。

## 综合验收与证据

| 检查 | 合格证据 | 不能推出的结论 |
| --- | --- | --- |
| 配置静态测试 | 缺值、非法池大小、危险 TLS 配置明确失败 | PostgreSQL 正在运行 |
| 未监听端口探针 | 在连接获取超时内非零退出，日志已脱敏 | TLS 路径已验证 |
| 真实连接探针 | 记录服务端 18.x、目标和迁移状态 | 并发事务正确 |
| 参数化查询 | 攻击字符串仍作为一个值，查询结构未变 | 对象授权正确 |
| 类型映射测试 | 整数分和 UTC ISO 通过，越界值失败 | 所有 PostgreSQL 类型已覆盖 |
| SQLSTATE 测试 | 已知约束按上下文映射，未知错误上抛 | HTTP 映射自动正确 |
| client 身份断言 | 一个事务内所有仓储收到同一 client | 真实锁竞争已发生 |
| 关闭测试 | client 释放且 `pool.end()` 完成 | 生产连接预算已经合适 |

章级验收：

- [ ] 没有连接串、密码、服务文件内容或 `.env` 值进入日志、截图和 Git。
- [ ] 能区分连接获取超时、语句超时、锁超时和事务空闲超时。
- [ ] 没有 `rejectUnauthorized: false`、每请求新建 Pool 或 `process.exit()` 掩盖清理。
- [ ] 所有网络值走参数；动态标识符来自服务端有限映射。
- [ ] `int8`、`numeric`、timestamp 的驱动行为有显式契约，不做危险全局解析。
- [ ] 仓储既可接收 Pool，也可接收事务 client；仓储内部不自行 checkout。
- [ ] PostgreSQL 18 不可用时保留原始阻塞，只报告静态或注入测试结果。

## 证据边界

本章的内存记录器只能证明参数数组、映射和对象身份；它不是 PostgreSQL。只有真实 PostgreSQL
18 连接并记录版本、目标和迁移状态后，才能声称对应 SQL 在目标数据库执行。连接失败实验只
证明失败可诊断，不证明成功路径、TLS 或迁移。真实并发与事务原子性由下一章验收。

## 章节导航

[上一章：SQL 数据建模](03-sql-modeling.md) ·
[后端卷目录](README.md) ·
[后端覆盖矩阵](BACKEND-COVERAGE.md) ·
[下一章：事务与并发](05-transactions-concurrency.md)
