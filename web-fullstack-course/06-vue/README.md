# Vue：从 SFC 到可验证的邻里集市

> 面向有 HTML、CSS 和基础 JavaScript 经验，但没有 Vue 经验的学习者
> 主线项目：邻里集市的搜索、发布、详情、会话、收藏、预约与 SSR

本卷不要求先读 React，也不要求先安装真实数据库。主线使用 Vue 3 SFC、
`<script setup lang="ts">`、Composition API 和 TypeScript strict，从静态商品卡片逐步推进到
可重建的 SPA + SSR 教学应用。完成后，学习者不仅要让页面工作，还要解释状态所有权、请求竞争、
错误恢复、授权边界、水合不变量，以及证据没有覆盖什么。

## 本卷定位与教材结构

本 README 统筹章节顺序、依赖、阶段产出与本卷验收，学习路线直接连接每篇详细教程。
下方只示意导航与正文的职责分工，不表示当前目录中存在独立章节导航文件。

```text
卷入口 README
  ├── 稳定章入口
  │   └── 直达本章详细教程
  └── VUE-COVERAGE 覆盖矩阵

详细教程
  ├── 机制推导与 API 清单
  ├── 最小可运行案例
  ├── 邻里集市集成案例
  ├── 错误注入与诊断
  └── 练习、验收与导航
```

本 README 负责学习顺序、综合项目和本卷验收；详细教程负责理论、完整或聚焦代码、
诊断过程和可判定练习；[Vue 教材覆盖矩阵](./VUE-COVERAGE.md)负责把知识点映射到六类证据，
不替代正文。

学习时按章节表格依次完成正文、错误实验和阶段验收，再按本卷验收清单和唯一 Capstone 的场景
矩阵整合成果。

## 学习路线

### 第一章：SFC、模板与商品组件

| 顺序 | 详细教程 | 解决的问题 |
| --- | --- | --- |
| 1 | [SFC 结构、模板编译与安全输出](./01-sfc-templates/01-sfc-template-compiler.md) | `.vue` 如何经过编译成为 DOM，插值和 `v-html` 的边界在哪里 |
| 2 | [Props、插槽、指令与列表身份](./01-sfc-templates/02-props-slots-list-identity.md) | 父子组件怎样分工，稳定 key 怎样保持实例、草稿和焦点身份 |
| 3 | [Vite、TypeScript 与第一版集市](./01-sfc-templates/03-vite-typescript-first-market.md) | 怎样建立真实工作区、领域类型、类型门禁和两张静态商品卡片 |

阶段产出：可构建的静态集市，价格保持整数分、时间保持 UTC、危险文字安全显示。建议投入
4.5–6 小时。

### 第二章：响应式、事件与可提交表单

| 顺序 | 详细教程 | 解决的问题 |
| --- | --- | --- |
| 1 | [ref、reactive、computed 与更新队列](./02-reactivity-events-forms/01-ref-reactive-computed-updates.md) | 源状态、纯派生、更新批次和响应式解构怎样建立因果链 |
| 2 | [组件事件、v-model 与可恢复表单](./02-reactivity-events-forms/02-component-events-v-model-forms.md) | 金额字符串怎样严格转成整数分，失败后为何必须保留草稿 |
| 3 | [搜索、发布与状态所有权](./02-reactivity-events-forms/03-search-publish-state-ownership.md) | 搜索、筛选、发布和空状态应由谁拥有，刷新后为何复位 |

阶段产出：可搜索、可验证、可发布商品的浏览器内存应用。建议投入 5–6 小时。

### 第三章：生命周期、请求竞争与 Composable

| 顺序 | 详细教程 | 解决的问题 |
| --- | --- | --- |
| 1 | [生命周期、watch 与同步清理](./03-lifecycle-composables/01-lifecycle-watch-cleanup.md) | 组件如何拥有并对称释放监听器、计时器和失效任务 |
| 2 | [HTTP 错误、取消与资源状态](./03-lifecycle-composables/02-fetch-http-abort-resource-state.md) | 怎样区分非 2xx、取消、空数据和成功，并阻止旧响应覆盖新查询 |
| 3 | [Composable、重试与本机教学 API](./03-lifecycle-composables/03-composables-local-api-retry.md) | 怎样提取 `useListings`，接入本机协议并覆盖加载、错误、空和重试 |

阶段产出：连接同源教学 API、能够取消旧读请求并恢复 503 的列表页。建议投入约 6 小时。

### 第四章：路由、URL 与服务端数据

| 顺序 | 详细教程 | 解决的问题 |
| --- | --- | --- |
| 1 | [Router、URL 状态与导航恢复](./04-router-data/01-router-url-state-navigation.md) | 搜索、页码和商品 ID 如何支持刷新、分享、后退与前进 |
| 2 | [路由取数、取消与错误恢复](./04-router-data/02-route-data-fetch-cancellation-errors.md) | 组件复用时怎样跟随参数取数，并区分对象 404 与服务 503 |
| 3 | [教学登录、发布与预约冲突](./04-router-data/03-auth-publish-reservation-conflicts.md) | 怎样处理 401/403/404/409/400/503，以及两标签页预约冲突 |

阶段产出：可深链的列表和详情，以及登录、发布、预约和状态恢复主路径。建议投入 6–7 小时。

### 第五章：Pinia、依赖注入与状态架构

| 顺序 | 详细教程 | 解决的问题 |
| --- | --- | --- |
| 1 | [先分清所有者，再建立 Pinia Store](./05-pinia-architecture/01-state-ownership-pinia-store.md) | 哪些状态属于 URL、组件、服务端或跨路由客户端 store |
| 2 | [让会话与收藏在乱序响应中收敛](./05-pinia-architecture/02-session-favorites-concurrency.md) | 幂等目标、每 ID busy 和 epoch 怎样隔离晚到结果 |
| 3 | [用 provide/inject 传服务，并隔离每次 SSR 请求](./05-pinia-architecture/03-provide-inject-store-ssr.md) | 服务依赖与业务状态如何分开，每次 SSR 为何必须创建新 Pinia |

阶段产出：跨路由会话、保守收藏、显示服务和请求级状态隔离。建议投入约 10 小时。

### 第六章：测试、无障碍与错误恢复

| 顺序 | 详细教程 | 解决的问题 |
| --- | --- | --- |
| 1 | [用可控输入证明纯函数、组件与 Store 契约](./06-testing-accessibility/01-pure-component-store-tests.md) | 如何用 Vitest、Vue Test Utils、Pinia 和 deferred Promise 定位风险 |
| 2 | [在真实浏览器中验证路由、键盘、焦点与错误恢复](./06-testing-accessibility/02-router-browser-accessibility-errors.md) | 如何验证深链、两页冲突、焦点、窄屏、键盘和可恢复错误 |
| 3 | [把 Lint、类型、测试、构建与 E2E 变成可信门禁](./06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md) | 各命令证明什么，怎样避免脏服务器、假通过和证据越界 |

阶段产出：`lint → vue-tsc → unit/component/store → build → Chromium E2E` 质量链。建议投入约
12 小时。

### 第七章：性能证据与进阶 Vue

| 顺序 | 详细教程 | 解决的问题 |
| --- | --- | --- |
| 1 | [先测瓶颈，再选择浅层响应、分页或缓存](./07-performance-advanced-vue/01-performance-shallow-reactivity-measurement.md) | 如何分离网络、计算、DOM、布局与绘制成本，避免无证据优化 |
| 2 | [用 Teleport 与原生 Dialog 建立可恢复焦点的模态交互](./07-performance-advanced-vue/02-teleport-transition-dialog-accessibility.md) | Teleport、原生模态、Transition、Escape 和焦点恢复怎样协作 |
| 3 | [缓存组件实例时暂停资源，并为异步 Chunk 设计失败路径](./07-performance-advanced-vue/03-keepalive-async-components-lifecycle.md) | KeepAlive 如何保留草稿但暂停资源，异步组件如何处理失败和超时 |

阶段产出：三个相互隔离、可恢复主入口的测量与进阶交互实验。建议投入约 12 小时。

### 第八章：渲染模式、SSR 与结业验收

| 顺序 | 详细教程 | 解决的问题 |
| --- | --- | --- |
| 1 | [从渲染模式选择推导水合不变量](./08-ssr-capstone/01-rendering-modes-hydration-contract.md) | CSR、SSR、SSG 和混合模式如何选择，四类 mismatch 如何复现 |
| 2 | [建立每请求隔离、可安全序列化的 Vite Vue SSR](./08-ssr-capstone/02-vite-vue-ssr-serialization-isolation.md) | app/router/Pinia 如何按请求创建，initial JSON 和上游怎样受控 |
| 3 | [流式渲染、Nuxt 边界与邻里集市最终验收](./08-ssr-capstone/03-streaming-nuxt-capstone-acceptance.md) | 如何从唯一完整快照重建 SPA + SSR，并区分已执行与未执行证据 |

阶段产出：原始 HTML 可见、无 JavaScript 搜索可用、可安全水合的唯一结业快照。建议投入约
16 小时。

## 学习与运行

“零基础”指不要求 Vue、React、Pinia、Router 或 SSR 经验；仍建议先具备 HTML 语义、CSS 基础、
JavaScript 函数/对象/数组/Promise 和 ES module 概念。TypeScript 联合类型、泛型和 strict
边界会在案例中逐步解释。

每篇详细教程都按同一顺序提供任务卡、背景、目标、预备知识、理论、API 清单、最小案例、
邻里集市案例、诊断、课后题、三层练习、验收、FAQ、资料、能力总结和导航。建议采用以下循环：

1. 先预测最小案例结果，再创建文件。
2. 运行指定命令，保存实际版本、退出码和可观察结果。
3. 主动完成错误案例，按“现象、证据、原因、修复、复验”记录。
4. 把最小案例迁移到邻里集市，而不是复制第二套业务。
5. 完成基础、进阶、故障注入练习和正文阶段验收，再按本 README 与唯一 Capstone 综合验收。

只看到页面、只通过 Vite 转译或只复制答案，都不等于完成。遇到不熟悉的 HTML、浏览器或
TypeScript 机制，应回到对应前置卷，不需要先读 React 实现。

### 工作区、SFC 与阶段边界

教程中的应用路径属于学习者创建的项目，不是教材仓库：

```text
neighborhood-market/
├── apps/
│   └── vue-web/
└── packages/
    └── contracts/    # 综合阶段再抽取共享领域契约
```

教材仓库只保存 Markdown 中的源码块，不保存 `package.json`、锁文件、`node_modules`、
构建产物或验证工程。每章会说明新增或替换哪些文件；没有标为替换的文件沿用前章。不要把
同一组件的多个教学阶段并排拼进最终工程。

| 阶段 | 数据与入口 | 明确边界 |
| --- | --- | --- |
| 01–02 | 静态种子与浏览器内存 | 刷新丢失，不是持久化 |
| 03 | Vite 本机进程内教学 API | 只绑定回环地址，重启清空 |
| 04–05 | Router、教学 Cookie、Pinia | 前端状态不提供授权或事务 |
| 06 | 单元、组件、store 与浏览器证据 | 测试只证明穿过的层 |
| 07 | 独立实验组件/入口 | 完成后恢复业务主线 |
| 08 | 独立 SSR 路径与唯一完整快照 | 开发 SSR 不是生产双构建 |

本卷主线固定为 SFC、`<script setup lang="ts">` 和 Composition API。Options API、跨主版本
迁移和 Nuxt 工程化不是主线；Nuxt 只在结业课说明采用条件和迁移边界。

### 版本与工具链边界

精确技术选择、核验日期和 TypeScript 兼容线统一见
[版本基线](../00-guide/version-baseline.md)。语言主线、工具兼容线、锁文件与本机解析结果是
不同证据；先保存版本探针和 `pnpm list --depth 0`，再依据对应文档判断。Vite 构建不能替代
SFC 类型检查，历史输出也不能与当前锁文件拼成一个不存在的环境。

## 连续项目与边界

Vue 与 React 使用同一邻里集市业务复杂度、HTTP 语义、固定数据和验收场景，但不共享框架组件
源码。完整领域说明见[邻里集市统一项目契约](../00-guide/project-contract.md)。

主线商品形状固定为：

```ts
type ListingStatus = "available" | "reserved" | "sold";

interface Listing {
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

| 契约 | 两卷共同要求 |
| --- | --- |
| 金额 | 存储和传输使用整数分；`35.10 → 3510`；`0` 与 `1000000.00` 合法；负数、指数、前导零、三位小数和超上限拒绝 |
| 时间 | 持久化值使用 UTC ISO 8601；只在显示时本地化 |
| 列表 | `GET /api/v1/listings?page=1&pageSize=20&q=` 返回 `{items,page,pageSize,total}` |
| 写入 | 发布由服务端生成 ID；编辑携带 `version`；过期写入为 409 |
| 收藏 | `PUT` 表示已收藏，`DELETE` 表示未收藏；目标幂等，不使用“反转一次”接口 |
| 预约 | 浏览器不发送可信 `buyerId`；并发只能一个 201，其余为 409 |
| 错误 | `{code,message,requestId,details?}`；401、403、404、409、400、503 含义和恢复不同 |
| 会话 | 同源 HttpOnly Cookie；浏览器代码不读取、不记录、不持久化凭据 |
| 页面状态 | initial、loading、empty、error、success、unauthenticated、forbidden、not-found、validation、conflict 都有可见路径 |
| 请求竞争 | 旧读请求取消或忽略；晚到结果不得跨商品或会话 epoch 回写 |
| 无障碍 | label、键盘、可见焦点、status/alert、路由焦点恢复和 reduced motion 是功能要求 |
| SSR | 公开列表进入原始 HTML；安全序列化；每请求隔离；无 JS 搜索；水合后仍由 API 重新授权写操作 |

共享 API 前缀为 `/api/v1`：

| 方法与路径 | 成功语义 | 关键失败或边界 |
| --- | --- | --- |
| `GET /listings?page=1&pageSize=20&q=` | 返回分页列表 | query 规范化、固定排序、成功空态 |
| `GET /listings/:id` | 返回商品详情 | 不存在为 404 |
| `POST /listings` | 返回 201 和服务端生成商品 | 401、400；失败保留草稿 |
| `PATCH /listings/:id` | 按原 `version` 编辑 | 403、404、409、400 |
| `POST /listings/:id/reservations` | 返回 201 和预约结果 | 不能预约自己；并发冲突为 409 |
| `PUT /favorites/:listingId` | 收敛为已收藏 | 重复目标不增加副作用 |
| `DELETE /favorites/:listingId` | 收敛为未收藏 | 失败保持此前确认状态 |
| `POST /auth/register` | 创建用户 | 输入限制、重复账号 |
| `POST /auth/login` | 建立 Cookie 会话 | 无效凭据与速率限制由后端处理 |
| `GET /auth/me` | 返回当前用户摘要 | 无会话或过期为 401 |
| `POST /auth/logout` | 撤销会话 | Cookie 与服务端状态都要处理 |

此表是后端与全栈整合后的目标契约。本卷唯一前端快照只实现十个共享验收场景实际使用的
列表、详情、发布、预约、收藏、登录、会话查询和注销端点；编辑与注册由后端卷和全栈卷拥有，
不得计入当前 Capstone 的已执行证据。

固定数据用于让两卷结果可比：

| ID | 标题 / 身份 | 关键值 |
| --- | --- | --- |
| `lamp-1` | 九成新台灯 | `3500` 分、`available`、`seller-1` |
| `desk-1` | 折叠桌 | `8000` 分、`reserved`、`seller-2` |
| `demo-buyer` | 演示居民 | 教学会话用户 |
| 发布固定项 | 二手书架 | `12000` 分 |
| `__error` / `missing` | 故障输入 | 分别触发服务错误和资源不存在 |

共享验收场景固定为：

```text
price-and-draft-contract
failed-publish-keeps-draft
favorite-target-is-idempotent
late-session-result-is-ignored
search-empty-and-recovery
login-publish-favorite-logout
reservation-conflict-across-tabs
not-found-and-service-failure
keyboard-primary-path
ssr-html-and-hydration
```

场景名称相同表示业务结果相同，不要求两个框架逐行翻译实现或测试。

### 教学 API、安全与正式集成边界

第 3 章起使用的 Vite middleware 是本机教学 API：数据在单个 Vite 进程内存中，重启清空；
教学登录不验证真实密码；固定 Cookie/CSRF 值只演示协议形状；没有数据库、事务、多进程一致性、
速率限制、密钥管理或生产部署能力。

必须持续遵守以下边界：

- 前端隐藏或禁用按钮只改善体验，不提供对象授权。
- `fetch` 取消和客户端 busy 不回滚服务端写入，也不锁住其他客户端。
- CORS、CSRF、Cookie、CSP、TLS 和后端授权职责不同，不能互相替代。
- 泛型 `api<T>` 本身只是静态承诺；最终快照为每种成功响应传入运行时 parser。
- Pinia、KeepAlive 和 SSR seed 都不是持久化数据库。
- 本卷没有收藏查询接口，因此刷新后收藏恢复仍是显式契约缺口。
- 真实预约唯一性必须由后端事务和数据库约束保证。

正式整合时，Vue 工程是 `neighborhood-market/apps/vue-web`，后端卷的 `@market/api` 来自另一
教学 workspace。必须先对齐目录、共享 DTO、认证响应、动态 CSRF 来源、精确 Origin 和代理，
再按[契约联调与整合](../09-fullstack/01-contract-integration/01-workspace-contract-runtime-validation.md)操作。只删除教学插件不能证明联调
完成。

## 命令矩阵

命令默认在学习者工作区运行。章节增量工程与唯一快照的脚本略有不同，以所在教程为准：

| 阶段 / 目录 | 命令 | 证明什么 | 不证明什么 |
| --- | --- | --- | --- |
| 环境记录 | `node --version`、`pnpm --version` | 实际运行时与包管理器 | 依赖或业务可用 |
| 新建练习根 | `pnpm create vite@latest apps/vue-web --template vue-ts` | 生成阶段工程 | 已符合课程版本与契约 |
| `apps/vue-web` | `pnpm list --depth 0` | 当前直接依赖解析值 | 所有 API 都兼容 |
| 首次唯一快照重建 | `pnpm install`，随后 `pnpm install --frozen-lockfile` | 生成临时锁并证明可冻结复现 | 生产供应链已审核 |
| 开发 | `pnpm dev --host 127.0.0.1 --strictPort` | 本机开发入口和端口占用失败 | 生产服务器可用 |
| 增量章节类型 | `pnpm exec vue-tsc -b` | 阶段配置下的 TS/SFC 类型 | 浏览器行为正确 |
| 唯一快照类型 | `pnpm typecheck` | `vue-tsc --noEmit -p tsconfig.json` 通过 | 运行时 JSON 合法 |
| 静态规则 | `pnpm lint` | ESLint 10 flat config 规则 | 类型、功能或无障碍完整 |
| 程序测试 | `pnpm test` | Vitest 纯函数、组件和 store 契约 | 真实布局、网络和数据库 |
| 生产打包 | `pnpm build` | Vite 能生成生产资源 | SSR 双构建、部署和性能 |
| 生产预览 | `pnpm exec vite preview --host 127.0.0.1 --port 4175 --strictPort` | 静态产物可由本机预览 | API/SSR 生产拓扑 |
| 浏览器准备 | `pnpm exec playwright install chromium` | 当前 Playwright 有 Chromium | Safari、Firefox 或真实设备已测 |
| 浏览器验收 | `pnpm e2e` | 配置中的 Chromium 场景 | 屏幕阅读器或后端事务 |
| SSR 服务 | `pnpm ssr` | 本机 4174 SSR 实验启动 | 生产 Node 集群或 Nuxt 已完成 |
| SSR HTTP | `curl -i -G --data-urlencode 'q=台灯' 'http://127.0.0.1:4174/'` 等 | 原始状态、HTML 和恢复内容 | 水合后的交互正确 |

可信门禁顺序是 `lint → typecheck → test → build → e2e`；SSR 再独立检查 200/503/404、安全
序列化、禁用 JavaScript 搜索和水合。负向类型实验必须先失败、恢复后再通过，才能证明命令真的
检查了 SFC。

## 唯一 Capstone

第八章第三课是本卷唯一完整最终项目快照，拥有 SPA、教学 API、路由、Pinia、测试、Playwright
和 SSR 的全部“完整文件”块。前七章保留可独立观察的最小文件和聚焦片段，但不得再拼出第二份
最终项目。

重建时只把该课的完整文件提取到全新的
`/tmp/full-course-verification-batch-c-vue.XXXXXX/neighborhood-market/apps/vue-web`
等价临时路径，核对每个相对路径只出现一次、本地 import 都存在，再执行命令矩阵。临时项目、
锁文件、依赖、浏览器和构建产物不得进入教材目录。

最终 HTTP 最低验收为：

| 请求 | 预期 |
| --- | --- |
| `/?q=台灯` | 200，原始 HTML 含“九成新台灯” |
| `/?q=__error` | 503，含恢复入口 |
| `/?q=不存在` | 200，显示成功空态 |
| `/missing` | 404 |
| `/?q=xss` | initial JSON 不含字面 `</script>`，不得增加 script 元素 |

启用 JavaScript 后水合计数应从 0 变为 1，Console 不得出现 mismatch；禁用 JavaScript 后 GET
搜索仍应返回筛选 HTML。Nuxt、流式输出和生产双构建只按教程声明的范围讨论，不属于该 Vite
开发快照的已实现能力。

## Vue 与 React 的有意差异

两卷对齐业务结果和验收强度，不排名框架，也不共享组件源码：

| 关注点 | Vue 路线 | React 路线 |
| --- | --- | --- |
| 组件表达 | SFC 编译、模板指令、props/slots、`<script setup>` | JSX、函数组件、props/children、render/commit |
| 状态模型 | `ref`、`reactive`、纯 `computed`、更新队列 | render snapshot、state setter、reducer、不可变更新 |
| 生命周期同步 | `watch` / `watchEffect`、生命周期钩子、composable 清理 | Effect、依赖、cleanup、custom Hook |
| 路由取数 | Vue Router 导航后取数，精确 watch 参数并取消旧读 | React Router Data Mode loader/action、revalidation 与 request signal |
| 应用状态 | Pinia setup store、`storeToRefs`；`provide/inject` 传服务 | reducer/Context；外部状态使用 `useSyncExternalStore` 等明确边界 |
| 错误恢复 | 资源联合、路由状态、`onErrorCaptured` | route error element、action result、组件错误边界 |
| 性能与进阶 | `computed`、`shallowRef`、Teleport、Transition、KeepAlive、异步组件 | `memo`、`useMemo`、transition、Actions、Suspense、Activity、Compiler |
| SSR 工厂 | 每请求 `createSSRApp`、memory router 和 Pinia | 每请求创建 React 元素、router/state，并交给 React DOM server renderer |

这些差异服务于各自自然模型；例如 Vue 不需要模拟 loader 才算等价，React 也不需要照搬 watcher。
只要共享契约、失败状态和证据强度一致，两卷就保持业务对等。

## 验收

完成本卷时，学习者应能从空白目录独立完成：

- 建立 Vue 3 SFC + TypeScript strict 工程并解释编译、类型和构建三层职责；
- 实现共享业务契约中的搜索、分页、详情、登录、发布、收藏、预约和失败恢复；
- 证明旧读结果、晚到会话结果和两标签页预约不会制造虚假成功；
- 用 Pinia 和 `provide/inject` 放置真正需要共享的状态或服务，而不是全局化所有草稿；
- 用纯函数、组件、store、浏览器和 SSR 证据覆盖对应风险；
- 用键盘完成主路径，并说明焦点、状态语义、窄屏和 reduced motion 的人工边界；
- 从唯一 capstone 重建应用，区分当前执行结果、历史结果和未验证范围；
- 解释 Vue 与 React 为何业务等价但实现机制不同。

## 验证范围

本卷已完成阶段工程与唯一 Capstone 的代表性 SFC 类型检查、单元测试、构建、SSR 和 Chromium
路径验证；历史快照与当前工程使用过不同环境，不能合并为一次完整执行。Safari、Firefox、
真实移动设备、辅助技术、真实后端授权与事务、生产 SSR、托管 CI、部署与容量仍需单独验收。
精确数量、版本、运行结果和历史边界统一见[交付与验证说明](../VALIDATION.md)。

## 资料与导航

- [Vue 文档](https://vuejs.org/)
- [Vue Router](https://router.vuejs.org/)
- [Pinia](https://pinia.vuejs.org/)
- [Vue 教材覆盖矩阵](./VUE-COVERAGE.md)

[返回全书目录](../README.md) · [开始第一章](01-sfc-templates/01-sfc-template-compiler.md) ·
[进入工程化卷](../07-engineering/README.md)
