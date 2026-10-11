# 教材交付与验证说明

当前检查日期：2026-10-12。Web 版本资料保留 2026-10-11 快照；三卷进阶分别记录本次核验版本。
第 3—5 节保留历史运行证据，不能将旧文件计数、旧提取物或旧测试结果当作本次全部通过。

## 1. 交付与计数口径

本次在当前目录中统计详细教程、卷入口、覆盖矩阵与治理文档。已删除的章入口不再计数，
README 直接链接详细教程。进阶三卷包含 AI Agent 28 篇、小程序 24 篇、浏览器扩展 24 篇，
共新增 76 篇；加上 Web 269 篇，实际交付 **345 篇详细教程**。
课程目录当前共有 **386 个 Markdown**：345 篇教程、14 个 README、12 个覆盖矩阵、
7 个起步参考、3 个进阶版本基线、4 个分卷自检与本文件，合计 `345+14+12+7+3+4+1=386`。

| 类型 | 数量 | 说明 |
|---|---:|---|
| Web 详细教程 | 269 | 起步 6、HTML 67、CSS 30、浏览器 18、JS/TS 27、React 24、Vue 24、工程化 22、后端 31、全栈 20 |
| AI Agent 详细教程 | 28 | 14 模块，每模块 2 篇 |
| 小程序详细教程 | 24 | 12 模块，每模块 2 篇 |
| 浏览器扩展详细教程 | 24 | 12 模块，每模块 2 篇 |
| 分卷覆盖矩阵 | 12 | 01—12 卷，起步由六篇实操与 W1 治理 |

教材仓库只保存 Markdown。应用源码、清单、锁文件、依赖、浏览器下载、证书、数据库、dump、
容器状态和构建产物只在读者工作区或 `/tmp/full-course-verification/` 中创建。

## 2. 全书结构与静态审计

本次静态检查覆盖当前全文、根入口与贡献指南；历史计数只保留在明确标日期的第 3 节。

| 检查 | 实际结果 |
|---|---|
| 详细教程契约 | 345/345：任务卡、`1..13`、能力总结与单元导航，全文围栏配对 |
| 覆盖矩阵 | 12 个矩阵、655 个全局唯一 ID；339 篇非起步教程均有主要归属和六维真实证据 |
| 相对 Markdown 链接 | 当前课程树 6,963 条，含 4,195 个锚点，零断链与断锚；根及其他跟踪 Markdown 另作检查 |
| 直接导航 | README 逐篇直达，单元末尾可返分卷及相邻教程 |
| 未完成标记 | 扫描未展开正文、include、占位与伪装成功的提示 |
| 围栏与空白 | 8,416 个围栏标记配对；`git diff --check` 及新教程文件级空白检查 |
| 课程树产物 | `web-fullstack-course` 内无 package/lock/env/key/cert/dump 或依赖、构建、覆盖率目录 |
| 学习周表 | 50 个周次连续且唯一；每周正文范围有可解析链接，HTML 分配 5 周 |
| 导航治理 | 保留已删除章入口的目录选择；起步七份职责页使用新路径，计数与事实由本文件统一维护 |

“链接存在”只证明本地目标可达；外部官方链接的长期可用性仍需按使用日期复核。覆盖 ID 和文件数
也不证明读者已经完成运行、练习或人工验收。

仓库全部 415 个跟踪或本次新增 Markdown（含计划/蓝图、根入口与贡献模板）也已检查：
6,989 条本地链接、4,197 个锚点，零断链与断锚。官方等外部地址共 1,157 个，
截至本次复验均返回 200 或重定向至 200；失效 URL 已替换，不检查未来可用性或全部网页语义。
全文 JSON 106 个通过，Bash 701 个语法通过，YAML 18 个解析通过；
Compose 专用 `!reset/!override` 只解析语法，不冒充 Compose runtime。

### 2.1 当前 Web 示例复验

所有源码从本次正文机械提取到 `/tmp`，未将旧工作树源码直接当作本次提取物。
使用 Node.js 24.21.0；已有依赖目录通过链接复用，因此这些结果不证明一次新的干净安装。

| 当前提取物 | 本次已执行结果 |
|---|---|
| W1 `index.html/server.mjs` | GET 200、错误路径 404、POST 405 与 `Allow: GET`；停止后端口释放 |
| HTML 现行选择课 | Chrome 154 实测标题/机器值/alt、点击与 Space 状态同步、刷新重置、320px 无横向溢出、无未捕获错误 |
| React 26 文件 | 13/13 测试、类型、Lint 与 Vite 构建通过 |
| Vue 33 文件 | 21/21 测试、类型、Lint 与 Vite 构建通过 |
| 工程化 27 文件 | 16/16 测试，TS7/TS6 双类型通过 |
| 全栈 contracts 与后端 index | 20/20 测试，TS7/TS6 双类型通过 |
| JavaScript/后端普通实验 52 文件 | 6/6 与 45/45 Node 测试、完整脚本语法检查通过 |
| 后端 Capstone 25 文件 | TypeScript 构建通过，未运行真实 PG18 |
| 预约 verifier | 4/4 纯拒绝/响应契约测试通过，未创建真实账号或写数据库 |

上述共 125 项测试通过。React/Vue 的独立结业项目与全栈整合后的应用是不同提取物，
整合命令顺序、API 桥接和已迁入页面的验证需另列结果，不能用本表替代。
本次没有重跑历史全部浏览器、SSR、缓存、Worker 与容器实验；这些保留为历史或未验证。

### 2.2 当前全栈整合路径复验

从后端 25 文件、React 26 文件、Vue 33 文件及全栈四篇正文重新提取，再应用正文提供的
明确迁移补丁；没有删除原回归用例或将真实 API 改成演示服务。

| 检查 | 本次结果与边界 |
|---|---|
| 第 1 课初始整合 | 按已创建文件执行；`--check --initial` 通过，默认完整检查在缺后续文件时明确拒绝 |
| 完整整合 | `--check` 要求全部 client、bridge、edit 文件，实际通过 |
| React 整合应用 | 15/15 测试、类型、Lint、构建通过；原 13 项与新增 2 个实际登录入口时序用例 |
| Vue 整合应用 | 23/23 测试、类型、Lint、构建通过；原 21 项与新增 2 个实际登录入口时序用例 |
| contracts 整合 | 新增 8 项桥接回归后为 28/28，TS7 与 TS6 双类型通过 |
| HTTP socket fixture | 13/13：认证/CSRF/旧会话、坏 parser、502、409、Abort 与 204；不证明 Nest/PG18 成功链 |
| 浏览器失败路径 | 两端构建预览的登录/编辑深链可达，真实 API 停止时显示受控错误，无 demo 回退 |

整合复验使用 Node.js **24.19.0**、pnpm 12.11.2 及已安装依赖；不是后端指定的
24.21.0 补丁证据。注册表缺少 `@vue/language-core@3.3.13`，本轮未通过完整工作区冷安装，
不将依赖复用记成 clean install。真实 Nest/PG18 登录、编辑、退出、事务与完整 E2E 仍未验证。
当前 contracts 的完整套件为 28 项；第 2.1 节 20 项是修复前同日独立提取的明确记录。

身份由 auth 统一拥有，私有收藏及其在途结果绑定同一身份代际；新身份不会被旧收藏或退出
结果覆盖。原 parser 负例改为合法 UUID 基线及字段级断言，金额、version、UTC、page、total
五种错误变体在双端分别使原测试变红，共 10 个故障检查；恢复后正式套件全绿。

### 2.3 三卷进阶的运行记录

三卷各自提供版本、覆盖矩阵、完整项目和实际自检：

- [AI Agent 实际自检](10-ai-agent/SELF-CHECK.md)：本地模型与 fixture、MCP、持久状态、检索、
  审批、评测、取消和恢复分别记账。
- [小程序实际自检](11-mini-program/SELF-CHECK.md)：Node/组件、三平台构建、开发者工具与真机
  分层；Web 后端的 Bearer/code 交换和恢复接口列为明确扩展。
- [浏览器扩展实际自检](12-browser-extension/SELF-CHECK.md)：24 个正文文件重建，11/11 测试、
  Chrome/Firefox MV3 构建、原生安装与 Chromium 五路径通过；Firefox/Safari 宿主未验证。

扩展的逐课 sink 实验已迁入测试目录，加入后 12/12 通过，生产类型检查仍通过；
产物脚本新增严格文件白名单，四个污染负例均拒绝。定向独立复审已放行。
核心 Agent 26 篇的最新提取物以 Node22.22.0 编译，66/66 测试通过，
其中三项覆盖同步取消的底层拒绝、缺失来源撤回标记和旧备份删除账本。
Agent 综合应用另外 17/17，全卷最终 83/83；真实 fixture UI 经键盘审批并重启查询，
任务与回执各 1，正常停止后锁和端口清理。检索使用进程内受控基线，真实 MCP 为独立协议实验。

Agent 综合删除先清 checkpoint/trace，最后同业务事务删除 task、receipt 与 runs；
清理失败仍保留权威回执并允许重启后同 ID 重试。新增回归先红后绿，
README 当前提取的 59 文件、strict 编译、83 项测试及重复提取拒绝覆盖均通过。
小程序最终正文提取 39 文件，47/47 测试、36/36 核心子集及 17/17 独立 Node 测试通过，
类型检查、微信/抖音/支付宝三平台构建与包预算通过。原 39 项测试保留；
新增 8 项发布生命周期回归覆盖在途重挂载、卸载回执、跨身份迟到成功、
未知结果跨重启保持锁和存储失败。平台真机与真实后端仍保留未验证。

最终定向独立复审均为 `PROCEED`：Agent 原六探针、真实 SQLite 子进程锁及四种删除失败
补强断言全部通过，删除后旧 digest 不可再批准；小程序原六边界、八项补充检查和五组
双进程恢复探针通过。此前发现的阻断全部在原范围复验关闭。

SDK/构建工具按所在卷已验证兼容组合固定，不强行套用 Web 主线的 TypeScript 或 React 版本。
教材仓库仍仅保存 Markdown；应用、锁文件、依赖、临时 profile 和候选安装包均在教材外。

## 3. 2026-10-11 分批验证历史

本节按当时目录保留运行事实；其中 372/359、81 个章入口等是删除前的历史统计，
不是本次课程数量。未改源码的历史记录可供比对，不能宣称全部步骤已在 2026-10-12 重跑。

### 3.1 HTML 拆分与治理基线

HTML 卷现有 8 个章入口、67 篇详细教程、77 个 Markdown 文件和 174 个覆盖 ID；1,832 条卷内
相对链接含 1,044 条锚点链接，零断链、零断锚。173 个原矩阵知识点和新增 `showPicker`
主归属均链接主要教程及 `§4/§6/§7/§8/§10/§11` 真实标题。

批次 7 按授权把第三篇元素参考课替换为
`03-current-selection-correction.md`，保留第三课位置与 `HIS-005`—`HIS-010` ID，改为现行
元素/属性/API 选择、解析恢复观察和确定性纠错；全部入链与相邻导航已更新，旧路径和目标词表
零命中。该授权替换改变了代码块集合，因此不再沿用拆分时对这一课的代码块哈希守恒结论；当前
HTML 卷 3,314 个围栏标记重新检查为成对。

拆分阶段的运行抽取证据仍覆盖未改动的 51 个 HTML、34 个 JavaScript、5 个 JSON、5 个 WebVTT
示例，以及 Chromium 键盘和原生交互烟测。项目状态契约修正后又在当前 Chromium 中实测
`Listing available → reserved` 与 `Reservation null → pending`，dialog 关闭、按钮禁用和焦点
恢复均符合教程。批次 7 又从新第三课当前正文抽取完整 HTML/JavaScript：Chrome 实测一个
`main`/`h1`、`lang=zh-CN`、整数分 `19900`、规范 UTC、具体图片替代文本和
`button[type=button]`；点击与 Space 均同步 `aria-pressed`/`output`，刷新后状态重置，
320 CSS px 无横向溢出且无未捕获 JavaScript 错误。图片 404 是用于验证替代文本的预期失败。

### 3.2 起步、CSS 与浏览器

- 本批审计 84 个 Markdown，其中 54 篇详细教程；1,021 条批次内相对链接和 404 条锚点链接
  零失败，结构、围栏、未完成标记和过时词表门禁均通过。CSS 与浏览器矩阵分别为 34、44 个
  唯一 ID，30/30 与 18/18 篇教程各有唯一主归属。
- CSS 属性索引按 MDN Browser Compatibility Data 8.1.5 复核为 452 项稳定标准属性，顺序、
  唯一性和 SHA-256 均匹配固定基线；索引正文 811 个可见行，未达到选择性拆分的 900 行门槛，
  因而保持单篇。第 6 节共提取 53 个 HTML、59 个 JavaScript、18 个 MJS 文件；77 个脚本在
  本机 Node.js 22.22.0 下通过语法检查，6 个 JSON 围栏可解析。
- W1 隔离服务实测首页 200、错误路径 404、非 GET 405 与 `Allow: GET`；停止后端口 3000 释放
  且请求失败。Node.js 22 运行结果没有被标记为课程目标 Node.js 24 证据。
- Google Chrome 154.0.8037.99 实测 320px 无横向溢出、键盘焦点、容器查询、减少动作、强制
  颜色，以及 640 CSS px / DPR 2 的 200% 等效重排；CDP 另验证 2 倍页面缩放。缓存 200→304、
  CORS 暴露 ETag、后发请求覆盖旧请求、直接取消 Fetch、事件循环顺序、IndexedDB v1→v2
  迁移与事务回滚、NDJSON 分块/畸形行、Worker 取消后重建与转移、SSE 重复抑制和快照端点、
  缺口恢复期事件缓冲与停止取消、Service Worker 离线外壳、草稿恢复、响应丢失后同键重试及
  Web Vitals/Long Task 均有运行证据。
- Chromium 运行发现并修复三处示例缺陷：提交后断连可能被浏览器透明重试，现改为发送不完整
  响应体后断开；异步回调不再延迟读取已失效的 `event.currentTarget`；SSE 快照恢复会缓冲期间
  到达的事件，并以取消信号和运行代次阻止停止后的过期提交。全新浏览器会话复验无未捕获
  JavaScript 错误。搜索页 900ms 内连续点击“搜索→取消”的 UI 时序未由自动化命令复现，取消
  证据来自同源 Fetch 的直接 `AbortController` 路径。
- 640 CSS px / DPR 2 与 CDP 缩放不替代真实浏览器 UI 缩放；Firefox、Safari、真实手机、真实
  打印、低性能设备和屏幕阅读器也没有被 Chromium 结果替代。

### 3.3 JavaScript / TypeScript

- 本批审计 38 个 Markdown、27 篇详细教程和 36 个唯一覆盖 ID；443 条相对链接与 216 条
  锚点链接零失败，27/27 篇教程均有矩阵主归属，没有教程达到 900 个可见行的拆分门槛。
- 从正文机械提取 55 个完整文件：41 个 MJS、8 个 TypeScript、4 个 HTML、2 个 JSON。
  Node.js 24.19.0 下 24 个代表入口通过，`node:test` 6/6 通过；事件循环顺序由运行时断言固定，
  Fetch 覆盖 12 组响应与关闭后的网络失败，包括正文中断、非法日期、重复 ID 和矛盾分页。
- pnpm 12.11.2 重建的临时项目锁定 TypeScript 7.0.2 与兼容包装包 6.0.2；`tsc6` 和编译器
  API 实际报告 6.0.3。两条 strict 类型检查、TS 7 构建及状态机运行通过；注入 `TS2322`
  后两条检查均非零退出，恢复源码后再次通过。
- Google Chrome 154.0.8037.99 实测浏览器 ESM 的三个模块均为 200 与
  `text/javascript`；DOM 商品页将带标签标题作为纯文本，表单发布、委托、稳定 toggle 名称、
  `aria-pressed`、筛选取消后的焦点恢复均通过，且无未捕获错误。
- 本轮运行环境不是 Node.js 24.21.0；24.19.0 结果只证明 Node 24 当前示例。Firefox、Safari、
  真实辅助技术与搜索页 900ms UI 取消时序仍未由本批结果覆盖。

### 3.4 React 与 Vue

- 本批审计 React、Vue 各 34 个 Markdown、8 个章入口和 24 篇详细教程；两卷 95 个覆盖 ID
  全局唯一，48/48 篇教程均有矩阵主归属。两卷合计 1,002 条相对链接零断链、零断锚，统一
  13 节结构、围栏、导航与禁用词扫描通过。
- 版本组合固定为 React 19.3.0、React Router 8.4.0、Vue 3.5.43、Vue Router 5.3.1、
  Pinia 4.0.3、Vite 8.3.4、Vitest 5.0.3、ESLint 10.12.0、TypeScript 6 兼容包装包
  6.0.2、`vue-tsc` 3.3.13 和 pnpm 12.11.2。React 依赖从默认镜像安装；Vue 因内部镜像尚未
  同步 `@vue/language-core` 3.3.13，临时验证改用公共 npm 注册表并完成 frozen lock 复验。
- 从两份唯一 Capstone 分别重建 26 个 React 文件和 33 个 Vue 文件；源 Markdown 再提取结果
  与已验证项目逐文件一致。Node.js 24.19.0 下，两端 lint、类型检查和构建通过；React
  Vitest 13/13、Playwright 6/6，Vue Vitest 21/21、Playwright 7/7。
- 两端成功响应都经过运行时 parser；畸形 2xx fixture 会失败。React 以可控 Promise 验证旧
  会话结果与错误都不能越过真实 Provider 注销，并保留预约错误的 status/code/requestId；
  Vue 验证三组会话乱序，最终快照还覆盖旧读取取消、精确 Cookie、CSRF 头、错误 requestId、
  Reservation 状态、越界页规范化和动作失败后保留详情。
- 两端分别注入非法 `draft` 状态，类型检查均以 TS2322 和退出码 2 失败；恢复后类型、测试、
  构建再次通过。失败发布保留草稿、幂等收藏、路由 404/503、键盘筛选、焦点恢复及两页预约
  一次成功一次 409 均有自动化证据。
- React/Vue SSR 均观察到筛选 200、数据源失败 503、成功空态 200 和错误路径 404；恶意
  `</script>` fixture 在 initial JSON 中转义为 `\u003c`。Chromium 水合计数均由 0 到 1，
  Console 无 hydration/mismatch 错误。
- 两个 Capstone 去除代码围栏后的可见内容分别为 343、356 行，低于 900 行门槛，且各自承担
  唯一完整项目与验收流，均记为 `KEEP-LONG`。Safari、Firefox、真实移动设备、屏幕阅读器、
  真实后端、数据库事务、生产 SSR、部署与负载仍未由本批证明。

### 3.5 工程化

- 32 个 Markdown、7 个章入口、22 篇详细教程和 74 个唯一覆盖 ID；725 条相对链接零断链，
  统一结构、围栏、禁用词、空白及课程树产物扫描通过。
- 干净 `/tmp` 工程机械提取 27 个完整文件，owner 为 `8/10/9`；Node 24.21.0、pnpm 12.11.2
  下首次安装后 frozen reinstall 锁摘要不变。Node 验证通过显式 PATH 指向校验过的临时官方
  二进制完成，不采用登录 shell 的默认 Node。
- Prettier 3.9.10、ESLint 10.12.0、TS 7.0.2、TS 6 CLI/API 6.0.3、Vitest 5.0.3、
  Vite 8.3.4、Playwright 1.64.0 和 Chromium 156.0.8078.4 均由真实探针记录。
- Vitest 16/16、Playwright 7/7、JS raw 4,294 B / gzip 1,992 B；最终 `pnpm verify`
  覆盖格式、Lint、双类型、测试、构建、预算和浏览器并退出 0。
- 锁漂移、格式、Lint、双类型、金额、parser、迟到结果、缺失导入、预算、缺失构建、端口占用
  和浏览器行为门均观察到非零退出，并在恢复后由同一 owner 门转绿。
- 当前 checkout、setup-node 与 upload-artifact 固定到版本基线中的已审查完整 SHA；未触发托管
  CI、上传制品、发布、部署或回滚。
- 详细证据见 [工程卷自检](07-engineering/SELF-CHECK.md)。

### 3.6 后端

- 本批审计 43 个 Markdown、10 个章入口、31 篇详细教程和 54 个唯一覆盖 ID；681 条卷内
  相对链接零断链、零断锚，31/31 篇教程均有矩阵主归属，10/10 个章入口均回链覆盖矩阵。
- 从正文机械重建 46 个普通示例文件和 Capstone 的 25 个唯一 owner 文件。Node.js 24.21.0
  对 45 个普通 MJS 与 3 个 Capstone MJS 完成语法检查；JSON、YAML、两个 env 模板和 OpenAPI
  3.0.3 子集解析通过。
- Capstone 在 pnpm 12.11.2 下首次安装、冻结锁复装和 TypeScript 6.0.3 构建通过；锁文件
  SHA-256 为 `e139fcf971c4d40748d75a09801d04fc002aa1b7d3a7b24049ee9464fb3868ba`。
  19 个普通测试文件共 45/45 通过，覆盖金额、UTC、参数化查询、事务 client、回滚、冲突、
  重试、密码、会话、CSRF、对象授权、分页、缓存、outbox 和脱敏；Capstone 另有 4/4 纯测试
  验证指定约束映射、自描述密码参数、认证尝试预算和 mutation 显式返回列。
- `pglast` 7.20 对 5 个完整 SQL 文件、38 条语句完成 PostgreSQL AST 解析；Capstone 依赖固定
  NestJS 12.1.2、`pg` 8.23.1 和 `class-validator` 0.15.1。
- Redis 8.6.2、BullMQ 6.3.12、ioredis 6.0.0 的 6389 隔离 demo 实际观察暂时错误第 3 次
  成功、永久错误第 1 次进入 failed，并输出 `demo_shutdown`；stdout/stderr 保存在批次临时
  证据日志中，服务随后停止且端口已释放。
- PostgreSQL 18 运行验证仍为环境阻塞：本机 `psql`、`postgres` 与 `pg_config` 均报告非目标
  主版本 16.13，且没有 Docker/Podman。未启动目标服务、未执行迁移、真实 HTTP/数据库、
  rollback、两客户端预约或重启持久化，也没有用非目标版本、Mock 或静态检查替代。
- Capstone 第 01 课去除代码围栏后为 533 个可见行，低于 900 行门槛，且 25 个文件组成一个
  原子 scaffold，选择性拆分结论为 `KEEP-LONG`。

### 3.7 全栈交付

- 本批审计 28 个 Markdown、6 个章入口和 20 篇详细教程；68 个覆盖 ID 全局唯一，20/20 篇
  教程均有矩阵主归属，6/6 个章入口均回链矩阵。706 条卷内相对链接含 408 条锚点链接，
  零断链、零断锚。
- 从当前正文机械重建 45 个完整文件。当前围栏重新抽取后，106 个 Bash、9 个 JSON、8 个 YAML、
  9 个 JavaScript 均通过对应语法或解析检查；19 个完整 TypeScript/TSX 文件通过 TypeScript
  编译器语法检查，2 个 Vue SFC 完成 script/template 编译，2 个 Dockerfile AST 与完整 Nginx
  配置的 Crossplane 解析通过。真实 `nginx -t` 仍属于环境缺口。
- TypeScript 7.0.2 与兼容 CLI/API 6.0.3 对 contracts 当前抽取物双检查通过；整数分、UTC、
  UUID、分页、session/CSRF、稳定冲突 code 和跨路由 operation lease 共 20/20 Vitest 通过。
  预约 verifier 的纯拒绝测试 4/4 通过，覆盖错误 409 code、空 requestId 和非法 version。
- 评分器现要求 exact 顶层字段、候选 label、规范 UTC `assessedAt`，并把输入 `sourceCommit`
  与受信 reviewer 参数精确绑定；基础 PASS 正例和 demo label、错误 commit、畸形时间三类负例
  通过。workspace integration 脚本保留既有 manifest 字段，并为 contracts 增加双类型、测试和
  build owner；本地、clean archive 和 hosted workflow 均显式执行该 owner。
- LibreSSL 3.3.6 实际生成并验证本地 CA、叶证书链、server purpose、精确 SAN
  `market.example.test`、证书/私钥匹配、目录 0700、私钥 0600 和证书 0644。该版本不支持
  `verify -verify_hostname`，因此未声称主机名负例已经运行，也未安装系统信任。
- 九类写前拒绝路径覆盖远程 load/health/API、替代 Compose 文件、错误 backup service/connected
  role、越界 restore、未知 rotation stage 和 mutable release tag。Compose 持久化脚本另固定
  project、当前 reader-owned 配置、container labels 与未发布数据库端口；这些仍是静态/负例
  证据，不是容器成功路径。
- 四个选择性拆分候选去除代码围栏后为 362、431、527、526 个可见行，均低于 900 行门槛，
  且分别只有一个 runbook、演练、Capstone 或 reviewer owner，结论均为 `KEEP-LONG`。
- 正确性、安全、运维、证据治理四个只读范围完成复审；正确性 6 项和运维 2 项阻塞修复后由原
  范围定向复验，四个最终结论均为 `PROCEED`。Docker/Compose、PG18、Nginx runtime、托管 CI、
  registry、发布、回滚、生产负载和灾难恢复没有运行。

### 3.8 全书治理与代表性回归

- 最终磁盘分类为 372 个 Markdown、11 个 README、81 个稳定编号入口/治理文档、269 篇详细教程、
  9 个覆盖矩阵、1 个 `VALIDATION.md` 和 1 个 `SELF-CHECK.md`；计入正文的口径仍为 359。
- 9 个矩阵共有 579 个唯一 ID。01—09 卷 263/263 篇教程均有主归属；每行只有一个主要教程，
  理论、最小案例、项目案例、错误诊断、练习和验收 6 个证据链接均回到同一教程真实标题。起步卷
  6 篇教程由章入口与 W1 验收直接治理。
- 50 周为 `01..50` 连续唯一，每周正文范围均有真实链接和可观察产出。22 小时是核心交付路径，
  完整参考索引、重复实验和扩展练习使用弹性周，不通过压缩验收制造“完成”。
- 全书 6,601 条相对链接含 3,491 条锚点链接，零断链、零断锚；8,068 个围栏标记成对；最终
  过时词表、未完成标记、课程树产物与空白扫描均为零。
- 当前代表性回归重新观察 HTML 新第三课 Chrome 键盘路径、CSS 452 项 hash、Browser 79 个
  JavaScript 围栏、JS/TS 3/3、React 13/13、Vue 21/21、工程化 16/16、全栈 contracts 20/20
  与预约 verifier 4/4；后端当前 TypeScript 构建通过，真实 HTTP/PG18 仍为环境阻塞。Vue 当前
  锁定测试退出 0，但注册表缺失一条新版本清单元数据，未据此声称 clean install 通过。
- 全书最终按 A（根/起步/HTML/CSS/浏览器）、B（JS/React/Vue/工程）、C（后端/全栈/版本与
  证据边界）、D（矩阵/链接/计数/周表/词表）四个不重叠范围复审。容量口径、HTML 语义残留、
  离线预约端点、Action SHA、矩阵单 owner 和计数口径修复后，四路最终均为 `PROCEED`。
- 在该历史快照中，移动端、小程序、AI Agent 和浏览器扩展 4 份蓝图位于 `docs/superpowers/specs/`，
  尚无对应教程，不属于当时 Web 372/359 计数。2026-10-12 已编写后三卷 76 篇，
  当前结果以第 1—2 节为准；移动原生仍保留蓝图。

## 4. 2026-10-10 历史运行快照

扩写前曾实际运行 Node HTTP、缓存 200→304、SSE、Worker、Service Worker、Clipboard、
HTML/CSS Chromium、JavaScript 金额与竞态、React/Vue 教学 API、SSR 和工程结业链路。历史结果
证明当时对应提取物在记录环境中通过，不自动证明 2026-10-11 新增的 202 篇教程逐篇、逐练习、
逐故障全部运行。

历史后端尝试使用本机非目标主版本，准备阶段遇到本机角色问题；PostgreSQL 18 本地启动又因
缺少动态库中止。这些失败继续作为环境证据保留，没有改写成数据库通过。

## 5. 2026-10-11 独立复审历史

2026-10-11 最终审计按互不重叠范围派发只读复审：

- 基础与导航组检查根目录、起步、HTML、CSS、浏览器，发现 CSS/全书 ID 计数和 HTML
  Reservation 状态归属问题；修复后复审 `PROCEED`。
- 前端与工程组检查 JavaScript/TypeScript、React、Vue、工程化，发现 Vue 矩阵 55/54 漂移和
  330 个裸节号；修复后复审 `PROCEED`。
- 后端与交付组检查后端、全栈、验证记录和总计划，确认 Docker/PG18/外部系统缺口没有被写成
  通过，并要求修正链接计数、Batch B 陈旧证据和最终计划状态。
- CSS/浏览器矩阵的 366 个新增证据锚点另经定向复审，结果 `PROCEED`；全栈卷在容器隔离修复后
  也完成整卷 `PROCEED`。
- 现代化批次 1 另按起步、CSS、浏览器三个互不重叠范围复审。起步卷补齐 W1 的跨平台
  200/404/405、连接失败和端口释放命令；浏览器卷补齐 SSE 快照恢复期缓冲与停止取消；CSS
  直接 `PROCEED`。两项修复均经原范围定向复验后 `PROCEED`。
- 现代化批次 2 按语言基础、DOM/异步、TypeScript/测试三个范围复审。修复 ESM 路径/MIME、
  Fetch 正文与契约分类、稳定 toggle 名称、任意 thrown value 的双失败清理、编辑状态机和迟到
  错误测试后，三个范围均定向复验为 `PROCEED`。
- 现代化批次 3 的 React、Vue 与对等契约复审，批次 4 的工具链、CI 与治理复审，以及批次 5 的
  事务、安全与治理复审，均在阻塞修复后取得 `PROCEED`。
- 现代化批次 6 按正确性、安全、运维与治理复审；contracts/评分 provenance、Compose 范围和
  backup connected role 等 8 项阻塞修复后，四路均为 `PROCEED`。
- 批次 7 的全书 A/B/C/D 四路复审最终均为 `PROCEED`；蓝图只在该 Web 门禁打开后创建。

所有阻塞问题均在原审查域复验；发现、修复和复验没有通过放宽断言或删除检查完成。

## 6. 尚未验证与禁止外推

- 本机没有 Docker/Compose 或 Nginx 可执行文件，只有 PostgreSQL 非目标主版本 client/server；因此未
  执行 Docker build、Compose runtime、`nginx -t`、PG18 迁移/并发/负载/备份恢复/轮换。
- 未触发托管 GitHub Actions、远程 registry、生产发布、线上回滚、公共 DNS/PKI、ACME、云主机
  或真实灾难恢复。教材 Git 提交与推送不作为应用部署或平台审核证据。
- 未完整覆盖 Firefox、Safari、真实移动设备、VoiceOver、NVDA、JAWS、打印和全部实验特性。
- 教学 API、Mock、内存状态、静态解析和 fake Docker 只证明其声明范围，不能作为生产认证、
  对象授权、真实事务、容量或故障恢复证据。
- 教程文档交付完成不等于学习者达到中级能力；结业仍以双前端、真实后端、自动化测试、
  容器交付、恢复证据、他人复核和独立修改为准。

[全书目录](README.md) · [版本基线](00-guide/version-baseline.md) ·
[覆盖地图](00-guide/coverage-map.md) ·
[结业标准](09-fullstack/06-graduation-project/01-capstone-scope-business-evidence.md)
