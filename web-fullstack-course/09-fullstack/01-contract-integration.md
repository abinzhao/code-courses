# 01 契约联调：让 React、Vue 与 API 共享事实

## 本章任务

把后端第 10 章的 `market/` 扩展为一个 API、React、Vue 和 contracts 共存的 pnpm workspace，并让
两个前端顺序连接同一个真实 API origin。完成后，登录恢复、列表读取、整数分编辑、对象授权、
version 冲突和预约冲突都应有可观察证据；演示中间件、静态用户或 Mock 成功不能计入本章验收。

本章保持以下全书契约：

- 金额存储与传输为 `0..100000000` 的安全整数分；
- 持久化和传输时间为 UTC ISO 8601，显示时才本地化；
- 浏览器主线为 same-origin HttpOnly Cookie session；
- unsafe 请求同时接受服务端 Origin 与 CSRF 校验；
- 认证只建立身份，后端继续执行对象授权和 RBAC；
- PATCH 携带读取到的 `version`，冲突明确返回 `409`；
- 原子预约由后端事务和数据库约束完成；
- 外部 JSON 在解析前保持 `unknown`；
- `mock`、`static`、`local` 证据按真实范围标记。

## 必要前置

- 完成[工程化卷](../07-engineering/README.md)和[后端卷 API 综合项目](../08-backend/10-api-capstone.md)；
- 阅读[版本基线](../00-guide/02-version-baseline.md)与
  [邻里集市项目契约](../00-guide/05-project-assessment.md)；
- 准备后端 `market/`、React 最终应用和 Vue 最终应用三个独立工作副本；
- 目标工具为 Node.js 24 LTS、pnpm `12.10.1`、React `19.3`、Vue `3.5.43`、NestJS `12.1.1`；
- PostgreSQL 18 不可用时，只能完成结构、类型和静态检查，不能声称持久化、事务或并发通过。

## 四课路线

| 顺序 | 教程 | 单一责任 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [工作区契约与运行时校验](01-contract-integration/01-workspace-contract-runtime-validation.md) | 无覆盖迁移、manifest、唯一锁文件、领域单位与 `unknown` parser | 180 分钟 |
| 2 | [同源 Session、CSRF 与共享客户端](01-contract-integration/02-same-origin-session-csrf-client.md) | 真实 Vite proxy、Cookie/CSRF、状态码、取消与非 JSON 错误 | 180 分钟 |
| 3 | [React Context 与 Vue Pinia 等价接入](01-contract-integration/03-react-vue-auth-data-integration.md) | 双框架认证状态机、登录页、列表 loading/error/race | 210 分钟 |
| 4 | [编辑冲突、竞态与端到端验收](01-contract-integration/04-edit-conflict-races-end-to-end.md) | 整数分编辑、owner、version `409`、草稿保护与双端 E2E | 240 分钟 |

依赖顺序不可交换：

```text
唯一 workspace + runtime contract
  -> 唯一 browser client + same-origin proxy
  -> React/Vue 各自状态接线
  -> 编辑冲突、竞态与端到端证据
```

第 1 课保留后端 contracts 类型为唯一来源；第 2 课唯一管理浏览器 token；第 3 课不复制 HTTP
逻辑；第 4 课不复制 router 或 client。完整文件只能由表中对应教程拥有，其他教程只做最小接线。

## 章级邻里集市任务

在读者自己的 `market/` 完成：

1. 先 dry-run，再把 React/Vue 应用目录迁入后端 workspace；不复制旧根 manifest、锁文件、
   `node_modules`、`dist`、`.env` 或模拟 API。
2. 用结构化脚本保留原 scripts/dependencies/exports，生成并审查唯一根锁文件。
3. 两端删除演示中间件，通过 `/api/v1` 同源路径命中真实 Nest。
4. React 验收后停止它，再让 Vue 使用同一个 `http://localhost:5173`；除非后端显式配置多个精确
   origin，否则不并行改变端口。
5. 两端分别完成匿名、登录、刷新恢复、错误密码、退出、列表加载/空/失败/成功。
6. owner 保存 `0` 和 `100000000` 分，响应 version 递增；非 owner 绕过 UI 仍为 403。
7. 两窗口制造 version 冲突：409 后草稿保留，重读展示 latest，用户明确采用后才再次 PATCH。
8. 两买家并发预约：真实环境中一个 201、一个 409，数据库最终只有一个有效预约。
9. 快速切路由/搜索时，旧响应不覆盖新状态；停止 API 时显示受控上游失败。

两个前端的业务结果、恢复语义和无障碍状态必须等价，但组件、Hook、Composable、router 和框架状态
各自实现。

## 综合验收与证据

总分 **100 分**，达到 **80 分**且无阻断项才通过。所有分值均为整数。

| 维度 | 分值 | 必需证据 |
| --- | ---: | --- |
| 工作区与契约 | 20 | dry-run、四成员、唯一锁文件、frozen 安装、整数分/UTC/parser 损坏输入测试 |
| 同源与会话 | 20 | Nest 请求日志、Cookie session、CSRF 恢复、204/401/403/409/HTML 错误分流 |
| 双框架等价 | 20 | React/Vue 五条认证路径及列表 loading/empty/error/success，旧响应不覆盖 |
| 编辑与权限 | 25 | owner 成功、非 owner 403 且 DB 不变、409 保稿、显式 latest/采用、未知结果重读 |
| 原子预约与说明 | 15 | 一 201、一 409、最终 count=1；能解释 abort/UI 锁/对象授权/事务边界 |

阻断项：

- 用浮点元替代整数分，或提交字符串金额而后端静默转换；
- sid/CSRF/密码进入 localStorage、日志、URL 或 Git；
- 保留演示中间件却把 Mock 响应写成真实 API 通过；
- 前端隐藏按钮替代后端对象授权；
- 409 自动覆盖草稿或无限重试；
- 把 abort 写成数据库回滚；
- 两个有效预约同时存在；
- 用类型断言信任外部 JSON；
- PostgreSQL 18、浏览器或真实 HTTP 未执行却报告为通过。

建议证据命令：

```bash
node scripts/integrate-workspace.mjs --check
pnpm --version
pnpm install --frozen-lockfile
pnpm list -r --depth -1
pnpm --filter @market/api build
pnpm --filter @market/react-web typecheck
pnpm --filter @market/vue-web typecheck
pnpm build:all
curl -i http://localhost:5173/api/v1/health/ready
```

浏览器证据还应保存 Network status/code/requestId 摘要、可见状态、失败前后步骤和数据库最终断言。
不得保存 Cookie、CSRF token、密码或连接串原文。

## 运行边界

本章只在个人本地工作区执行。当前主环境若没有 PostgreSQL 18，则 contracts/TS/Vue/配置静态检查
仍可执行，但真实 session 持久化、owner 数据断言、原子预约和并发结果必须标为
`blocked-by-environment`，不能借用 PostgreSQL 16 或 Mock 结果冒充。

生产 HTTPS、Nginx、容器、托管 CI、镜像发布和恢复属于后续章节。本章 Vite proxy 是开发入口，
不是生产反向代理。

## 章节导航

[上一卷：后端与 API 工程](../08-backend/README.md) ·
[开始第 1 课](01-contract-integration/01-workspace-contract-runtime-validation.md) ·
[下一章：Docker Compose](02-docker-compose.md) ·
[全栈交付卷目录](README.md)
