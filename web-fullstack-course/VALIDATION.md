# 教材交付与验证说明

检查日期：2026-10-11。技术资料快照只覆盖该日可核验内容。

## 1. 交付与计数口径

全书物理上有 329 个 Markdown 文件。正文统计排除 11 个导航 `README.md`、本文件和工程卷
`SELF-CHECK.md`，得到 **316 篇正文、参考与覆盖矩阵**：

| 类型 | 数量 | 说明 |
|---|---:|---|
| 稳定编号入口与治理文档 | 81 | 包含 66 个本轮目标章入口、8 个 HTML 章入口和 7 个起步治理文档 |
| 详细教程 | 226 | HTML 既有 24 篇，本轮新增 202 篇 |
| 分卷覆盖矩阵 | 9 | HTML 既有 1 个，本轮新增 8 个 |
| **计入正文的总数** | **316** | `81 + 226 + 9` |

教材仓库只保存 Markdown。应用源码、清单、锁文件、依赖、浏览器下载、证书、数据库、dump、
容器状态和构建产物只在读者工作区或 `/tmp/full-course-verification/` 中创建。

## 2. 全书结构与静态审计

以下结果来自 2026-10-11 当前工作树，不是历史文件数量的推算：

| 检查 | 实际结果 |
|---|---|
| 新增详细教程契约 | 202/202 均含任务卡、`1..13`、能力总结和单元导航 |
| 覆盖矩阵 | 9 个矩阵、578 个全局唯一 ID；本轮新增矩阵 8 个 |
| 相对 Markdown 链接 | 5,098 条本地相对链接，零断链 |
| 计数口径 | 329 个物理 Markdown，排除 11 个 README 与 2 份验证记录后为 316 |
| 未完成标记 | 计划占位词与未完成提示扫描为零 |
| 围栏与空白 | Markdown 围栏状态检查通过；`git diff --check` 零发现 |
| 仓库产物 | 无 `labs/node_modules/dist/coverage`，无 package/lock/env/key/cert/dump |

“链接存在”只证明本地目标可达；外部官方链接的长期可用性仍需按使用日期复核。覆盖 ID 和文件数
也不证明读者已经完成运行、练习或人工验收。

## 3. 本轮分批验证

### 3.1 HTML 既有基线

HTML 卷保持 8 个章入口、24 篇详细教程和 173 个覆盖 ID。既有验证覆盖 748 条模块相对链接、
51 个 HTML、34 个 JavaScript、5 个 JSON、5 个 WebVTT 示例，以及 Chromium 键盘和原生交互
烟测。项目状态契约修正后又在当前 Chromium 中实测
`Listing available → reserved` 与 `Reservation null → pending`，dialog 关闭、按钮禁用和焦点
恢复均符合教程；详情保留在 [HTML 卷说明](01-html/README.md)。

### 3.2 起步、CSS 与浏览器

- 新增 54 篇详细教程，CSS 与浏览器矩阵分别为 34、44 个 ID。
- 代表性 HTML/CSS、Node HTTP、Worker、Service Worker、流、存储与 DevTools 示例已提取验证。
- Chromium 实跑过表单 invalid→valid、Dialog/Popover、响应式布局、请求竞态、Worker、离线缓存
  和键盘主路径。
- Firefox、Safari、真实手机和屏幕阅读器没有被 Chromium 结果替代。

### 3.3 JavaScript / TypeScript

- 27 篇详细教程与 36 个覆盖 ID 通过结构、链接和代码提取检查。
- Node 语法、`node:test`、TypeScript 7 主线与 TypeScript 6 兼容线均有实际通过证据。
- 金额、UTC、运行时 `unknown` 校验、取消、竞态、分页与复杂度示例包含失败断言。

### 3.4 React 与 Vue

- React、Vue 各 24 篇详细教程；覆盖 ID 分别为 40、55。
- 两个独立临时工程完成类型检查、单元测试、构建、SSR 与代表性 Chromium E2E。
- React 金额相关 16/16、Vue 18/18 测试通过；两端均注入过类型错误并观察到非零退出。
- 历史框架运行使用过 Node 22；后续 Node 24 复验覆盖类型、构建和金额相关测试，不能外推为
  两卷所有练习都在单一 Node 24 环境重新执行。

### 3.5 工程化

- 22 篇详细教程、74 个覆盖 ID；干净 `/tmp` 工程机械提取 27 个完整文件。
- Node 24.21.0、pnpm 12.10.1 下，格式、ESLint、TS 7、TS 6、Vitest、Vite 构建、gzip 预算和
  Chromium E2E 聚合门通过。
- Vitest 16/16、Playwright 7/7；锁漂移、格式、Lint、类型、金额、竞态、预算、构建和端口故障
  均观察到预期失败并恢复。
- 详细证据见 [工程卷自检](07-engineering/SELF-CHECK.md)。

### 3.6 后端

- 31 篇详细教程、54 个覆盖 ID、668 条卷内相对链接通过。
- Node 24 下原生 HTTP、TypeScript 6/7 编译、13 条纯领域测试、SQL/OpenAPI 静态检查通过。
- Redis 8.6.2、BullMQ 6.3.12、ioredis 6.0.0 的隔离 demo 实际观察暂时错误第 3 次成功、永久
  错误进入 failed，并完成有序关闭。
- 本机只有 PostgreSQL 16.13，未把补充 SQL/权限烟测冒充 PostgreSQL 18 迁移、锁竞争或真实
  HTTP/数据库验收。

### 3.7 全栈交付

- 20 篇详细教程、68 个覆盖 ID、696 条卷内相对链接通过。
- 42 个完整文件重新抽取；106 个 Bash、8 个 JSON、8 个 YAML、8 个 JavaScript 围栏通过可用
  语法检查。
- TypeScript 7.0.2 与 6.0.3 双检查通过，整数分、UTC、UUID、分页、CSRF 和编辑规则 18/18
  Vitest 通过；2 个 Vue SFC、2 个 Dockerfile AST 与完整 Nginx 配置解析通过。
- LibreSSL 3.3.6 实际生成并验证本地 CA、叶证书、SAN `market.example.test` 和私钥权限。
- 发布、负载、备份、恢复、轮换与评分器的拒绝路径通过。预约 verifier 的 fake Docker runbook
  覆盖 44 个写前拒绝调用，最终 `GET=1`、`POST=0`。
- 容器隔离经多轮只读复审，修正 Unix Docker context、固定 IPv4 internal bridge、宿主 `INPUT`
  profile、immutable gateway probe、host device/mount/capability 与数值 UID:GID 后取得
  `PROCEED`；整卷复审再次 `PROCEED`。

## 4. 2026-10-10 历史运行快照

扩写前曾实际运行 Node HTTP、缓存 200→304、SSE、Worker、Service Worker、Clipboard、
HTML/CSS Chromium、JavaScript 金额与竞态、React/Vue 教学 API、SSR 和工程结业链路。历史结果
证明当时对应提取物在记录环境中通过，不自动证明 2026-10-11 新增的 202 篇教程逐篇、逐练习、
逐故障全部运行。

历史后端尝试使用 PostgreSQL 16.13，准备阶段遇到本机角色问题；PostgreSQL 18 本地启动又因
缺少动态库中止。这些失败继续作为环境证据保留，没有改写成数据库通过。

## 5. 独立复审

2026-10-11 最终审计按互不重叠范围派发只读复审：

- 基础与导航组检查根目录、起步、HTML、CSS、浏览器，发现 CSS/全书 ID 计数和 HTML
  Reservation 状态归属问题；修复后复审 `PROCEED`。
- 前端与工程组检查 JavaScript/TypeScript、React、Vue、工程化，发现 Vue 矩阵 55/54 漂移和
  330 个裸节号；修复后复审 `PROCEED`。
- 后端与交付组检查后端、全栈、验证记录和总计划，确认 Docker/PG18/外部系统缺口没有被写成
  通过，并要求修正链接计数、Batch B 陈旧证据和最终计划状态。
- CSS/浏览器矩阵的 366 个新增证据锚点另经定向复审，结果 `PROCEED`；全栈卷在容器隔离修复后
  也完成整卷 `PROCEED`。

所有阻塞问题均在原审查域复验；发现、修复和复验没有通过放宽断言或删除检查完成。

## 6. 尚未验证与禁止外推

- 本机没有 Docker/Compose 或 Nginx 可执行文件，只有 PostgreSQL 16.13 client/server；因此未
  执行 Docker build、Compose runtime、`nginx -t`、PG18 迁移/并发/负载/备份恢复/轮换。
- 未触发托管 GitHub Actions、远程 registry、生产发布、线上回滚、公共 DNS/PKI、ACME、云主机
  或真实灾难恢复；也未进行任何远端推送或部署。
- 未完整覆盖 Firefox、Safari、真实移动设备、VoiceOver、NVDA、JAWS、打印和全部实验特性。
- 教学 API、Mock、内存状态、静态解析和 fake Docker 只证明其声明范围，不能作为生产认证、
  对象授权、真实事务、容量或故障恢复证据。
- 316 篇文档交付完成不等于学习者达到中级能力；结业仍以双前端、真实后端、自动化测试、
  容器交付、恢复证据、他人复核和独立修改为准。

[全书目录](README.md) · [版本基线](00-guide/02-version-baseline.md) ·
[覆盖地图](00-guide/06-coverage-map.md) · [结业标准](09-fullstack/06-graduation-project.md)
