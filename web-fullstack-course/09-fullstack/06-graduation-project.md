# 06：毕业项目，用可重复证据评定全栈能力

## 本章任务

从后端综合项目和两个前端出发，独立交付一个能运行、能拒绝越权、能处理并发、能恢复故障的
邻里集市。第一课固定范围、状态机、outbox、双前端等价状态和证据包；第二课由评审按 100 分表、
维度下限、八项否决、五条双前端路径、补考记录和 90 分钟独立修改作出结论。

阅读完成、照抄源码、构建成功或打开首页都不是毕业证据。未执行的 PostgreSQL、Docker、
浏览器、Redis、托管 CI、恢复或人工无障碍维度不得计分。

## 最终工作区与产出

```text
market/
  apps/
    api/
    react-web/
    vue-web/
  packages/
    contracts/
  migrations/
  deploy/
  ops/
  evidence/
```

最终产出包括：

- 相同契约下的 API、React 与 Vue 应用；
- 注册/登录/恢复/退出、商品、收藏、预约、取消和确认业务闭环；
- 预约与 outbox 同事务、消费者持久幂等和失败重放证据；
- 同源 Cookie、CSRF、对象授权、事务、`409`、整数分和 UTC 证据；
- 冷安装、测试、镜像、HTTPS、健康、CI、digest 回滚、日志、备份与隔离恢复证据；
- `evidence/verify-reservation.mjs` 外部验收器和数据库唯一行断言；
- 脱敏证据包、100 分评分记录、失败/补考历史和独立修改记录。

## 不可变契约

- 金额在请求、领域和数据库中都是非负安全整数分，不接真实支付。
- 持久化时间使用 PostgreSQL `timestamptz`，响应为 UTC ISO 8601。
- 浏览器使用同源 HttpOnly Cookie；身份、CSRF、对象授权与 RBAC 分别验证。
- owner/buyer/role 来自服务端身份，不能接受浏览器自报。
- 一个商品最多一条 `pending` 或 `confirmed` 有效预约；并发败者返回 `409`。
- 编辑必须携带当前 `version`；旧版本保留用户输入并显式重读，不能静默覆盖。
- 收藏 PUT/DELETE 表达目标状态；预约/通知重试使用稳定幂等键。
- PostgreSQL 参数化 SQL、事务同一 client；预约与 outbox 同成同败。
- React 与 Vue 共享业务契约，不共享框架组件；两者接受相同五条路径评审。

## 必要前置

- 已完成本卷前五章和[后端 API 综合项目](../08-backend/10-api-capstone.md)。
- 能从业务规则推导 DTO、数据库约束、事务、HTTP 状态、前端状态和测试。
- 基线为 Node.js 24、pnpm 12.10.1、PostgreSQL 18、NestJS 12.1.1；
  TypeScript 6 是工具兼容线，改用 TS7 时保留工具链对照证据。
- 评审对象必须是读者拥有的全新目录、隔离数据库和本地/明确授权环境。
- 预计实现与证据整理 24 至 40 小时，正式复审约 4 小时，现场独立修改另计 90 分钟。

## 两课路线

| 顺序 | 教程 | 单一责任 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [结业范围、业务闭环与证据包](06-graduation-project/01-capstone-scope-business-evidence.md) | 工作区、强制闭环、状态机、outbox、双前端、外部 verifier 与证据卫生 | 8 小时设计与收口 |
| 2 | [评分、复审与独立修改](06-graduation-project/02-scoring-review-independent-change.md) | 100 分、门槛、八项否决、五路径、补考、故障抽题和 90 分钟修改 | 4 小时复审 + 90 分钟 |

依赖顺序：

```text
先冻结范围和不变量
  -> 完成业务/可靠性/双前端/交付证据
  -> 评审者在干净环境复现
  -> 计算总分、维度下限和否决项
  -> 随机故障与 90 分钟独立修改
  -> 通过，或保留失败证据后补考
```

## 强制范围与选修边界

强制范围是身份、商品、收藏、预约竞争、取消、确认、outbox、双前端和可交付运行。评价为最多
5 分的单独加分项，不进入基础 100 分，也不能抵消维度下限或否决项。真实支付、复杂推荐、
微服务、Kubernetes、真实邮件和对象存储不属于毕业必做。

预约状态机固定为：

```text
available listing
  -> reserve: pending reservation + reserved listing
pending
  -> cancel by buyer or seller: cancelled + available listing
  -> confirm by seller: confirmed + sold listing
cancelled/confirmed
  -> no further transition; return conflict
```

每次变化都在同一事务内锁定并更新业务行、version 与 outbox。外部通知不在数据库事务内假装
原子，而由至少一次投递和消费者幂等吸收重复。

## 完整毕业任务

1. 从全新目录 frozen 安装并核对锁文件、版本、迁移 checksum。
2. 在隔离 PostgreSQL 18 上迁移和加载虚构数据。
3. 运行 API 测试、20 买家并发预约和数据库唯一行断言。
4. React 与 Vue 分别运行五条浏览器路径和键盘主路径。
5. 构建镜像，以同源 HTTPS 运行 SPA/API，验证 live/ready、Cookie 与 CSRF。
6. 演示 outbox 在 Redis/worker 故障后的恢复和单一业务副作用。
7. 以 digest 发布并回滚应用，证明扩展后结构保留新写入。
8. 备份隔离测试库，恢复到全新的 `market_restore_test`，验证业务不变量与 RTO/RPO。
9. 评审随机注入一个故障，候选人按五段记录恢复。
10. 现场完成一项 90 分钟跨层修改，运行失败测试、修复和受影响回归。

## 通过条件

基础总分至少 `80/100`，且同时满足：

- 认证授权至少 `12/15`；
- 数据一致性至少 `12/15`；
- React、Vue 各至少 `8/10`；
- 交付与 CI 至少 `8/10`；
- 性能与恢复至少 `6/8`；
- 独立修改至少 `3/4`；
- 八项一票否决全部为否。

平均分不能抵消关键安全与一致性风险。评分、每项上限、五条路径、八项否决和补考规则在第二课
给出完整可计算版本。

## 证据保留与补考

`evidence/README.md` 记录实际环境、commit、锁文件摘要、镜像 digest、迁移 checksum、命令、
退出码和证据分类。保留脱敏 HTTP、SQL 断言、浏览器 trace、负载、备份/恢复、RTO/RPO 与
回滚记录；不保存密码、Cookie jar、CSRF、私钥、连接串、真实用户数据或生产端点。

失败记录不可被修复后的截图覆盖。补考材料必须并列保留：

```text
原现象 -> 原证据 -> 根因 -> 修复 -> 同命令复验 -> 受影响回归
```

补考只重跑失败维度及其依赖回归，但任何新否决项都会重新阻断。当前环境没有 Docker 或
PostgreSQL 18 时，可以静态检查脚本，不能判交付、恢复、容量或故障维度通过。

## 章节导航

- 上一章：[05 性能、安全与运维](05-performance-security-operations.md)
- 第一课：[结业范围、业务闭环与证据包](06-graduation-project/01-capstone-scope-business-evidence.md)
- 分卷入口：[全栈联调与交付](README.md)
- 课程级评分：[统一项目契约与阶段验收](../00-guide/05-project-assessment.md)
- 全书入口：[Web 全栈课程](../README.md)
