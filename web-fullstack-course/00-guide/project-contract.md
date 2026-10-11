# 邻里集市项目契约：让多端使用同一套业务事实

本页是 Web、Agent、小程序和浏览器扩展的共享业务参考。各端可以采用不同运行时与认证适配，
但不能自行改变金额、时间、权限和预约状态的含义。

## 业务与工作区

王阿姨发布自行车，小林预约验车。系统需要展示商品、搜索、收藏、发布草稿、管理预约，并在
失败、冲突和会话过期时保留足够信息让用户恢复。课程不接入真实支付。

教材仅保存 Markdown。把各课标出的完整文件创建在个人工作区：

```text
market-learning/
  market-start/
  js-lab/
  market/
    apps/react-web/
    apps/vue-web/
    apps/api/
    packages/contracts/
  agent-lab/
  mini-market/
  market-extension/
  evidence/
```

目录随课程逐步建立。不同课程的独立实验不要直接覆盖结业项目。前端可以共享领域 parser、
类型、金额格式和 API 契约；React、Vue 和小程序保留各自的界面实现。

## 持续演进的阶段

| 阶段 | 技术与数据 | 完成边界 |
|---|---|---|
| V0 摆摊 | HTML、固定文本与本机 HTTP | 首周只展示与观察请求；没有真实账号、预约、收藏持久化或数据库 |
| V1 装修 | CSS、固定文本 | 响应式、布局、动效降级与键盘 |
| V2 营业 | 原生 JS/TS、内存与本地实验数据 | 筛选、异步、类型与测试；明确本地数据范围 |
| V3 双门面 | React/Vue、同一 API 契约与阶段模拟 | 等价页面、会话与失败状态；模拟不代替真实服务 |
| V4 业务服务 | NestJS/PostgreSQL、真实数据库 | 身份、对象授权、事务、并发和重启持久化 |
| V5 可交付 | CI、Docker、Nginx、实际运行环境 | 新机器复现、发布、回滚与备份恢复 |

进入进阶卷时保留阶段证据：平台替身、模型 fixture 和公开 DOM 投影不升级为 V4 或 V5 的
服务端证明。每阶段只引入当时具备的能力，不在 V0 显示真实登录或交易成功。

## 核心对象

| 对象 | 必须保持的约束 |
|---|---|
| User | 身份由服务端确认，不把客户端传入的角色当权限；不返回密码散列 |
| Listing | ID、标题、描述、整数分、状态、ownerId、version、createdAt |
| Favorite | `(userId, listingId)` 唯一，PUT/DELETE 设置目标状态 |
| Reservation | 买家、商品、受控状态；一个商品最多一个有效预约，不允许预约自己的商品 |

Web 主线采用下列契约：

```ts
export type ListingStatus = "available" | "reserved" | "sold";
export type ReservationStatus = "pending" | "confirmed" | "cancelled";

export interface Listing {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: ListingStatus;
  ownerId: string;
  version: number;
  createdAt: string;
}
```

`priceCents` 是非负安全整数：280 元保存为 `28000`，不使用浮点金额。`version` 是服务端
维护的正整数。`createdAt` 使用合法、规范的 UTC ISO 8601，例如 `2026-10-12T00:00:00.000Z`；
显示时才转为用户时区。ID 的具体格式和字段长度以实际接口 parser 为准。

扩展业务若加入下架或交易完成状态，应先更新共享类型、运行时 parser、状态图、数据库约束与
两端测试，再启用新值。局部教程中的简化对象或 demo 状态必须明确标注，不能直接接到完整 API。

## HTTP 契约

前缀为 `/api/v1`，金额和状态不能依赖界面文案推断：

| 方法与路径 | 成功与拒绝条件 |
|---|---|
| GET `/listings` | 分页、搜索、固定排序，`page/pageSize/total/items` 一致 |
| GET `/listings/:id` | 详情；不存在返回 404 |
| POST `/listings` | 登录后创建，201；字段不合法 400 |
| PATCH `/listings/:id` | 本人编辑，携带 version；旧版本 409 |
| POST `/listings/:id/reservations` | 登录、非本人、商品可预约；成功 201 |
| POST `/reservations/:id/cancel` | 买家或商品 owner 取消 pending 预约 |
| POST `/reservations/:id/confirm` | 只有商品 owner 确认 pending 预约 |
| PUT/DELETE `/favorites/:listingId` | 设置/取消收藏，重试保持目标状态 |
| POST `/auth/register` | 202 `{"accepted":true}`，不暴露邮箱是否已注册 |
| POST `/auth/login` | 建立会话，校验凭据和尝试预算 |
| GET `/auth/me` | 当前身份；无有效会话 401 |
| POST `/auth/logout` | 撤销服务端会话并清除客户端身份 |

列表和错误分别是：

```json
{"items":[],"page":1,"pageSize":20,"total":0}
```

```json
{"code":"VERSION_CONFLICT","message":"商品已更新，请刷新后再提交","requestId":"demo-request-id"}
```

JSON/查询/路径/字段错误统一 400 `VALIDATION` 或具体输入错误码；401 为未认证、403 为
无权操作、409 为业务状态冲突。保留 `code/status/requestId`，不返回 SQL、堆栈或凭据。
所有客户端对成功和失败响应都做运行时解析，TypeScript 类型声明不能替代解析。

## 预约状态与事务

```text
创建：Reservation pending + Listing reserved + version 加 1
取消：Reservation cancelled + Listing available + version 加 1
确认：Reservation confirmed + Listing sold + version 加 1
```

预约与商品在一个数据库事务内迁移；异常一起回滚。取消/确认只能从 pending 开始，终态重复
操作返回明确冲突。两个用户并发只能有一个创建成功；按钮禁用、进程内锁和客户端缓存不能
替代数据库约束。

预约 POST 的幂等语义由服务端按认证用户、操作、key 和请求摘要实现。响应丢失表示结果未知；
保留原 key，通过权威查询或同 key 重试恢复，不能生成新 key 自动重复写，也不能在离线时
宣布预约成功。

## 认证与多端边界

| 客户端 | 主线 | 不能代替什么 |
|---|---|---|
| Web | 同源 HttpOnly Cookie、服务端会话、CSRF | 隐藏按钮不代替对象授权；SameSite 不代替全部 CSRF 校验 |
| 小程序 | 平台 code 交服务端换业务会话，显式 Token 生命周期 | code 不是长期 Token；AppSecret 不在客户端 |
| 扩展 | 默认本地公开字段与备注，无网络同步 | host permission 不等于站点用户授权 |
| Agent | 默认本地资料、受限工具、写前审批 | 模型输出不是可信身份、权限或来源 |

HTTPS、秘密存储、吊销、退出清理、用户隔离均在实际部署和平台验收中复核。教学 fixture、
内存服务和 Node 平台替身只能证明它们明确声明的范围。

### 小程序认证是显式服务端扩展

Web 主线后端只实现 Cookie 会话。小程序需要后端新增 `/api/v1/auth/exchange`，在服务端
使用对应平台的凭据交换一次性 code，映射真实平台身份到业务 User，再签发可过期、可撤销的
业务 Token。客户端不能把 code 当 Token，也不能从 code 文本或请求体角色决定身份。

真实服务接入还需实现 Bearer Token 认证适配：`GET /auth/me` 返回同一业务身份，
`POST /auth/logout` 撤销该 Token；适配完成后复用原有 service 的 owner、预约与管理员
授权，不绕过 Web 的对象权限。Cookie 请求仍执行自己的 CSRF 检查。小程序 Capstone 内存
服务没有实现完整的真实 `me`/平台交换链，不能直接充当这一扩展。

小程序的预约列表、按幂等 key 查询等恢复接口也是该卷明确提出的后端扩展。接口、Token
生命周期、权限和跨账号测试完成前，只能验收教学适配层，不宣称与现有 Web API 直接互通；
具体契约见[小程序会话教程](../11-mini-program/05-auth/01-code-server-session.md)和
[领域与恢复接口](../11-mini-program/12-capstone/01-domain-service-tests.md)。

## 统一界面与阶段验收

列表需要初始、加载、空、失败、成功；表单需要输入保留、处理中、校验错误、登录失效、
无权限、冲突和成功。预约结果未知和已成功是不同状态。键盘、焦点、可访问名称和失败恢复
属于主路径。

| 阶段 | 可观察的完成证据 |
|---|---|
| HTML/CSS | 语义、表单、长内容、手机/桌面布局、键盘和减少动画 |
| JS/TS | 金额、UTC、非法响应、取消与迟到结果、错误实现被测试拒绝 |
| React/Vue | 同一业务用例、刷新深链、状态边界、会话失效与预约冲突 |
| 工程化 | 冻结锁安装、格式/类型/测试/构建分别通过，错误门禁能变红 |
| 后端 | 两用户越权、真实数据库并发、事务回滚、重启持久化 |
| 交付 | 新机器恢复运行、回滚、备份恢复、监控与故障解释 |
| 进阶三卷 | 各卷结业项目、平台差异、注入/权限/恢复负例与独立修改 |

各基础阶段按下表计满分 100 分；只为当前阶段已经要求的能力计分：

| 阶段 | 分项权重 |
|---|---|
| HTML/CSS | 语义 25、布局 25、表单 20、无障碍 20、解释 10 |
| JS/TS | 正确性 30、异步 20、类型 20、测试 20、解释 10 |
| React、Vue（各自） | 功能 30、状态 20、路由数据 20、测试无障碍 20、解释 10 |
| 工程化 | 复现 25、质量 25、构建 20、测试 20、说明 10 |
| 后端 | 建模 20、权限 25、事务 20、接口测试 25、日志 10 |
| 交付 | 部署 20、回滚 20、恢复 20、监控 20、答辩 20 |

基础阶段至少 80 分且无核心阻断项。结业按[评分与独立修改](../09-fullstack/06-graduation-project/02-scoring-review-independent-change.md)
实施；越权、凭据泄漏、重复预约破坏数据、失败假报成功、无法恢复数据均不能被其他分数抵消。

**自测题：为什么收藏设置目标状态，预约还需要幂等 key？**
收藏 PUT/DELETE 的重复目标可自然保持一致；预约会创建资源，需要服务端辨认同一意图及
请求摘要，并保留可查询结果。两者都需要真实身份和对象权限。

[学习路线](learning-path.md) · [全书目录](../README.md) ·
[全栈契约实现](../09-fullstack/01-contract-integration/01-workspace-contract-runtime-validation.md)
