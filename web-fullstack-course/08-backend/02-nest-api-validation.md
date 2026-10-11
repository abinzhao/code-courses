# 02 Nest API 与输入验证：让框架边界可追踪

## 本章任务

把第 1 章原生 HTTP 服务拆成 NestJS 12 中职责清楚的启动器、模块、控制器、服务和仓储端口，
再为外部 JSON、查询字符串、DTO 转换、字段校验、领域错误与 HTTP 错误建立一条可追踪链路。

本章继续使用**单进程内存仓储**，只验证 Nest 请求边界，不声称已经持久化、认证或授权。
创建结果中的 `ownerId: "demo-user"` 是显式教学身份替身；真实身份必须在后续会话层取得。

## 必要前置与边界

- 已完成[第 01 章：Node 运行时与 HTTP](01-node-runtime-http.md)，理解状态码、流、超时和停机。
- 运行时为 Node.js 24 LTS，Nest 核心包固定 `12.1.1`。
- pnpm 基线为 `12.10.1`；传统装饰器元数据示例使用 TypeScript 6 兼容编译器线。
- 依赖版本以读者生成的 `package.json` 与锁文件为准，不手写或虚构锁文件内容。
- 所有实验位于 `$HOME/code/market-backend-lab/nest-api`，不在教材目录安装依赖。
- 外部正文在框架接收时仍是不可信值；只有通过 DTO 转换与校验后才能进入服务。
- 正文金额不做隐式字符串转数字；查询参数才在明确装饰器下转换。
- 时间持久形状为 UTC ISO 8601；`Date` 仅用于受控查询转换和规范化。

## 三课学习路线

| 顺序 | 教程 | 核心产出 | 建议投入 |
| ---: | --- | --- | ---: |
| 1 | [启动、模块与依赖注入](02-nest-api-validation/01-bootstrap-modules-dependency-injection.md) | ESM 启动、模块边界、provider token、内存仓储 | 3 小时 |
| 2 | [DTO 转换与运行时校验](02-nest-api-validation/02-dto-transformation-validation.md) | create/query DTO、白名单、显式数字/日期转换、嵌套校验 | 3.5 小时 |
| 3 | [管道、过滤器与错误契约](02-nest-api-validation/03-pipes-filters-error-contract.md) | ID pipe、领域错误映射、请求 ID、稳定错误体 | 3 小时 |

依赖关系：

```text
NestFactory + AppModule
  -> controller -> service -> repository token
  -> ValidationPipe + class DTO
  -> domain error -> exception filter -> HTTP error contract
  -> 第 03 章关系模型
```

## 章级邻里集市任务

在独立 Nest 练习中完成：

1. `AppModule` 只组合功能模块，不直接保存商品；
2. `ListingsController` 只适配 HTTP，不手工 `new ListingsService()`；
3. `ListingsService` 依赖仓储端口，不依赖 Express response；
4. `MemoryListingsRepository` 明确标注重启丢数据；
5. `POST /api/v1/listings` 的正文只允许 `title/description/priceCents`；
6. 标题 trim 后必须非空，金额必须为非负有界整数分；
7. 分页查询显式把字符串转换为整数，非法值在服务前被拒绝；
8. 嵌套 DTO 同时使用 `@ValidateNested` 与 `@Type`；
9. 未知字段被拒绝，不静默吞掉客户端漂移；
10. 领域错误、校验错误与未知错误映射为稳定机器码；
11. 错误响应头和正文使用同一个非空 `requestId`；
12. 有效与无效创建请求都不被描述为数据库证据。

## 综合验收证据

| 证据层 | 命令或观察 | 通过标准 |
| --- | --- | --- |
| 版本 | `node --version`、`pnpm list --depth 0` | Node 24；Nest 核心/平台均为 12.1.1 |
| 构建 | `pnpm build` | 装饰器元数据配置正确，ESM 导入可运行 |
| DI | 临时移除 repository provider | 启动明确失败；恢复注册后成功 |
| 有效创建 | POST 整数分商品 | 201，`priceCents` 不变，`createdAt` 为 UTC ISO |
| 字段边界 | 小数、字符串金额、空白标题、未知 `ownerId` | 400，服务与仓储不执行写入 |
| 查询转换 | `page=2&pageSize=10` | DTO 中为数字；非法/越界值为 400 |
| 嵌套校验 | 独立 preview DTO 测试 | 缺少 `@Type` 的故障先红，恢复后逐项校验 |
| 错误契约 | 400/404/409/500 分支 | `code/message/requestId` 稳定，不泄露堆栈 |
| 状态边界 | 重启后读取列表 | 数据清空，证明仍是内存教学仓储 |

记录实际命令、退出码、状态码和响应；不能把本文预期或 TypeScript 构建结果当成 HTTP 已运行证据。

## 章级完成标准

- [ ] 能从 `main.ts` 追踪到 module、controller、service 和 repository。
- [ ] 默认 singleton、request scope、transient 的成本和用途可解释。
- [ ] DTO 使用类和值导入，运行时元数据没有被 `import type` 移除。
- [ ] `transform` 不等于允许所有隐式转换；正文金额字符串仍被拒绝。
- [ ] `whitelist` 与 `forbidNonWhitelisted` 的差异有失败证据。
- [ ] 日期转换后在边界规范化为 UTC ISO，不把本地显示字符串持久化。
- [ ] 嵌套 DTO 同时具备实例化和递归校验。
- [ ] pipe 负责单值适配，service 负责业务规则，filter 负责协议映射。
- [ ] 400、401、403、404、409、500 的语义不会被全部压成 200 或 INTERNAL。
- [ ] 内存、身份替身、未验证持久化和未验证授权均明确标注。

## 上下章导航

[上一章：Node 运行时与 HTTP](01-node-runtime-http.md) ·
[返回后端卷目录](README.md) ·
[下一章：SQL 数据建模](03-sql-modeling.md)
