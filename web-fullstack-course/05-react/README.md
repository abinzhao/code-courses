# React：从第一个组件到可解释的 SSR

> 面向零框架基础学习者的 React 完整教程
> 主线项目：邻里集市搜索、发布、预约、收藏与 SSR

本卷面向会写基础 HTML、CSS 和 JavaScript、但尚未写过框架应用的读者。代码主线使用
TypeScript strict、函数组件和 Hooks；不要求先学习 Vue，也不要求先安装真实数据库。若还
不熟悉函数、数组、模块、DOM 或异步请求，先完成 JavaScript / TypeScript 卷再返回。

学习目标不是记住 Hook 名称，而是能够解释状态归谁所有、请求为何过期、错误怎样恢复、
前端证据能证明什么，以及 SSR 的服务器首帧为什么必须与客户端首帧一致。

## 本卷定位与教材结构

本 README 统筹章节顺序、前置、阶段产出与本卷验收，学习路线直接连接每篇详细教程。
下方只示意导航与正文的职责分工，不表示当前目录中存在独立章节导航文件。

```text
章入口
  ├── 说明本章任务、必要前置、学习顺序与综合验收
  └── 连接本章详细教程

详细教程
  ├── 推导一个明确的 React 机制
  ├── 给出最小案例和逐步扩展
  ├── 制造并诊断错误
  ├── 接入邻里集市
  └── 用练习与阶段验收确认能力
```

本 README 负责路线和成果整合，不重复完整理论与源码。每篇详细教程按统一 13 节契约提供
理论、API 清单、最小案例、项目案例、诊断、练习和验收。学习时按章节表格依次完成正文，
再按本卷验收清单和唯一 Capstone 的场景矩阵综合验收。

全部知识点及其六类证据位置见 [React 教材覆盖矩阵](REACT-COVERAGE.md)。矩阵用于审计，
不能替代正文，也不能把“存在链接”解释成目标环境已经运行通过。

## 学习路线

### 第一章：JSX、组件与第一版集市

| 顺序 | 详细教程 | 你会解决的问题 |
| ---: | --- | --- |
| 1 | [JSX、渲染纯度与提交阶段](01-jsx-components/01-rendering-jsx-purity.md) | 区分 React 元素、render、commit 与 DOM，并验证不可信文本默认转义 |
| 2 | [组件边界、组合与列表身份](01-jsx-components/02-components-props-composition-list-identity.md) | 用只读 props、children 和稳定 key 保持组件职责与商品身份 |
| 3 | [用 Vite 与 TypeScript 建立第一版邻里集市](01-jsx-components/03-vite-typescript-first-market.md) | 从空目录建立可类型检查、构建并在 320px 阅读的静态应用 |

阶段产出：两张符合整数分和 UTC 契约的静态商品卡片。建议投入约 5 小时。

### 第二章：事件、状态与表单

| 顺序 | 详细教程 | 你会解决的问题 |
| ---: | --- | --- |
| 1 | [事件、状态快照与不可变更新](02-events-state-forms/01-events-state-snapshots-updates.md) | 解释批处理、函数式更新和旧快照，避免改写对象与数组 |
| 2 | [受控、非受控表单与金额验证](02-events-state-forms/02-controlled-uncontrolled-form-validation.md) | 把字符串草稿精确转换为整数分，并让失败保留输入 |
| 3 | [搜索、发布与状态所有权](02-events-state-forms/03-search-publish-state-ownership.md) | 建立可搜索、可筛选、可发布和可故障恢复的内存应用 |

阶段产出：刷新即重置、但交互和失败边界完整的本地集市。建议投入约 6 小时。

### 第三章：Effect、HTTP 与自定义 Hook

| 顺序 | 详细教程 | 你会解决的问题 |
| ---: | --- | --- |
| 1 | [Effect 生命周期、清理与 Strict Mode](03-effects-reuse/01-effects-lifecycle-cleanup-strict-mode.md) | 只为外部系统使用 Effect，并让 setup 与 cleanup 对称 |
| 2 | [HTTP 边界、请求取消与资源状态](03-effects-reuse/02-fetch-http-abort-resource-state.md) | 区分空结果、HTTP/网络/解析失败和过期请求 |
| 3 | [自定义 Hook、本机教学 API 与重试](03-effects-reuse/03-custom-hooks-local-api-retry.md) | 用 `useListings` 和同源 Vite API 观察取消、重试与状态码 |

阶段产出：正常、loading、empty、error、Offline 和快速搜索都可复现的列表。建议投入
7 至 8 小时。

### 第四章：Data Router 与服务端数据

| 顺序 | 详细教程 | 你会解决的问题 |
| ---: | --- | --- |
| 1 | [Data Router、URL 状态与导航语义](04-routing-data/01-data-router-url-state-navigation.md) | 让搜索、页码和详情 ID 可分享、刷新及前进后退 |
| 2 | [loader、action、错误边界与重新验证](04-routing-data/02-loaders-actions-errors-revalidation.md) | 统一路由读取、写入、pending、错误和成功后的重新验证 |
| 3 | [教学登录、发布、预约与冲突恢复](04-routing-data/03-auth-publish-reservation-conflicts.md) | 接通会话、服务端 ID、201/409 和状态特定恢复 |

阶段产出：可深链、可发布、可预约并区分 401/403/404/409/400/503 的 SPA。建议投入约
8 小时。

### 第五章：状态架构

| 顺序 | 详细教程 | 你会解决的问题 |
| ---: | --- | --- |
| 1 | [状态所有权、reducer 与 Context](05-state-architecture/01-state-ownership-reducer-context.md) | 区分 URL、草稿、服务器与共享客户端状态，并保持 reducer 纯净 |
| 2 | [会话、收藏命令与并发保护](05-state-architecture/02-session-favorites-concurrency.md) | 用 per-ID 锁和 session epoch 阻止重复及跨注销写回 |
| 3 | [外部 store、Context 性能与 SSR](05-state-architecture/03-external-store-context-performance-ssr.md) | 建立稳定快照、可清理订阅和每请求独立 store |

阶段产出：跨路由会话与收藏反馈模型，失败不伪装成功，迟到结果不越过注销。建议投入约
8 小时。

### 第六章：测试与无障碍

| 顺序 | 详细教程 | 你会解决的问题 |
| ---: | --- | --- |
| 1 | [纯函数与组件契约测试](06-testing-accessibility/01-pure-component-contract-tests.md) | 用 Vitest 和 Testing Library 固定金额、草稿、收藏与异步顺序 |
| 2 | [路由、浏览器、无障碍与错误恢复](06-testing-accessibility/02-router-browser-accessibility-errors.md) | 用 Chromium 验证 URL、冲突、键盘、焦点和状态语义 |
| 3 | [ESLint、CI 与证据边界](06-testing-accessibility/03-eslint-ci-test-evidence-boundaries.md) | 建立五级门禁，并用负向注入证明命令没有空跑 |

阶段产出：从纯函数到浏览器的风险分层证据，以及明确的跨浏览器和辅助技术缺口。建议投入
约 9 小时。

### 第七章：性能与现代 React

| 顺序 | 详细教程 | 你会解决的问题 |
| ---: | --- | --- |
| 1 | [性能测量、memo 与并发更新](07-performance-modern-react/01-performance-measurement-memo-concurrency.md) | 先区分网络、计算和 DOM 成本，再选择缓存、延迟或 transition |
| 2 | [Actions、乐观状态与表单状态](07-performance-modern-react/02-actions-optimistic-form-status.md) | 表达 pending 与乐观回滚，同时不把客户端 Action 当成授权 |
| 3 | [现代 Hooks、Compiler、Suspense 与 Activity](07-performance-modern-react/03-modern-hooks-compiler-suspense-activity.md) | 验证稳定资源、ref、Effect Event、Compiler 和隐藏生命周期边界 |

阶段产出：三组互相隔离、完成后可恢复主入口的现代 React 实验。建议投入约 9 小时。

### 第八章：SSR 与综合项目

| 顺序 | 详细教程 | 你会解决的问题 |
| ---: | --- | --- |
| 1 | [渲染模式与水合契约](08-ssr-capstone/01-rendering-modes-hydration-contract.md) | 比较 CSR/SSR/SSG/混合，并保持服务器与客户端首帧一致 |
| 2 | [Vite SSR、序列化与请求隔离](08-ssr-capstone/02-vite-ssr-serialization-isolation.md) | 安全嵌入公开 JSON，限制上游并返回真实 200/503/404 |
| 3 | [流式、RSC 与综合验收](08-ssr-capstone/03-streaming-rsc-capstone-acceptance.md) | 从唯一完整快照重建 SPA/SSR，并执行共享场景矩阵 |

阶段产出：原始 HTML、无 JavaScript GET 搜索、安全序列化、请求隔离和 0→1 水合证据。
建议投入约 11 小时。

## 学习与运行

每篇教程都按同一闭环完成：

1. **预测**：先写下渲染、状态、请求或错误的预期结果。
2. **复现**：在个人 workspace 创建教程指定文件，运行明确命令。
3. **观察**：保留页面、Console、Network、React DevTools 或测试输出。
4. **破坏**：执行教程中的错误案例或故障注入，先记录失败。
5. **恢复**：解释根因，实施最小修复并重复原路径。
6. **迁移**：不照抄答案完成基础、进阶和故障练习。
7. **验收**：记录代码路径、版本、命令、结果和未验证范围。

只复制最终代码不能证明掌握。能够预测、诊断、恢复并说明保证边界，才进入下一课。

### Workspace、版本与教学 API

#### Workspace

所有应用路径都相对学习者创建的 `neighborhood-market/`，不是本教材目录：

```text
neighborhood-market/
├── apps/
│   ├── react-web/
│   ├── vue-web/
│   └── api/               # 后续整合目标，不是本卷现成目录
└── packages/
    └── contracts/         # 后续抽取共享纯类型与契约
```

本卷从第一章的 `pnpm create vite` 开始，只在个人 workspace 生成 `package.json`、锁文件、
依赖和构建产物。入门阶段领域类型保存在 `apps/react-web/src/domain.ts`；完成两端后再按真实
复用需要抽到 `packages/contracts`。React 与 Vue 不共享组件源码。

章节明确写“替换”的文件使用当课最新整文件，写“新增”的文件另建。不要把同一路径的不同
阶段拼在一起，也不要自行把 `.tsx` 改成 `.ts` 或添加教材未声明的路径别名。

#### 版本

精确技术选择、核验日期和 TypeScript 兼容线统一见
[版本基线](../00-guide/version-baseline.md)。读者安装结果以版本探针、`pnpm list --depth 0`
和锁文件为准；Vite 转译不能替代项目类型检查，也不使用 canary、未发布 RFC 或只有新闻描述的
新接口。

#### 教学 API

第 1、2 章只使用静态或浏览器内存数据。第 3 章起，Vite middleware 在
`127.0.0.1` 提供同源 `/api/v1` 教学 API，供请求、路由、会话和冲突恢复练习。

教学 API 明确不具备以下生产能力：

- 进程重启后数据清空，没有数据库、迁移、备份或多进程一致性；
- 登录不验证真实密码，Cookie 和固定 CSRF 标记只用于本机观察；
- 没有真实对象授权、数据库事务、唯一约束、速率限制、审计、TLS 或公网部署能力；
- 两标签出现一条 201 和一条 409，只证明前端能按约定恢复，不证明生产并发安全。

接入 `apps/api` 时删除教学插件注册，配置 `/api` 代理，对齐真实 auth 响应、服务端签发的
CSRF、精确 Origin 和运行时 DTO 校验。不要把 Cookie 会话改成 localStorage token 来回避
适配。

## 连续项目与边界

两卷实现同一邻里集市业务复杂度和验收结果，但保留各自自然的组件模型。

| 契约 | 共同要求 |
| --- | --- |
| `Listing` | `id/title/description/priceCents/status/ownerId/version/createdAt` |
| 金额 | `35.10 -> 3510`；`0` 与 `1000000.00` 合法；拒绝负数、指数、前导零、三位小数和超限值 |
| 时间 | 持久化为 UTC ISO 8601，只在显示层本地化 |
| 状态 | `available \| reserved \| sold`；编辑携带 `version`，过期版本返回 409 |
| `Page<T>` | `{items,page,pageSize,total}`，页码不接受 0 或负数 |
| `Reservation` | 含商品、买家、状态和创建时间；一个商品只能有一个有效预约 |
| 会话 | 同源 HttpOnly Cookie；浏览器代码不读取或持久化凭据 |
| 错误 | `{code,message,requestId,details?}`；401/403/404/409/400/503 含义不同 |
| 页面状态 | initial、loading、empty、error、success、unauthenticated、forbidden、conflict |
| 并发 | 取消或忽略旧读取；迟到结果不能跨会话；预约冲突一成功一 409 |
| 无障碍 | label、键盘激活、可见焦点、status/alert、路由焦点恢复和 reduced-motion 边界 |
| SSR | 公开列表 HTML、安全序列化、请求隔离、真实状态码、无 JS 搜索和可交互水合 |

API 前缀统一为 `/api/v1`：

| 方法与路径 | 成功行为 | 关键边界 |
| --- | --- | --- |
| `GET /listings?page=1&pageSize=20&q=` | 返回分页商品 | 参数规范化、固定排序 |
| `GET /listings/:id` | 返回商品详情 | 不存在为 404 |
| `POST /listings` | 返回 201 和服务端商品 | 服务端生成 ID、owner、version 和时间 |
| `PATCH /listings/:id` | 更新商品 | 本人权限、携带 version、冲突为 409 |
| `POST /listings/:id/reservations` | 返回 201 和预约 | buyer 来自会话，不能预约自己的商品 |
| `PUT /favorites/:listingId` | 设置为已收藏 | 重试保持同一目标状态 |
| `DELETE /favorites/:listingId` | 设置为未收藏 | 不使用 toggle 语义 |
| `POST /auth/register`、`POST /auth/login` | 注册、建立会话 | 服务端验证、限速和 Cookie 策略 |
| `GET /auth/me`、`POST /auth/logout` | 查询、撤销会话 | 过期为 401，注销清理私有客户端状态 |

此表是后端与全栈整合后的目标契约。本卷唯一前端快照只实现十个共享验收场景实际使用的
列表、详情、发布、预约、收藏、登录、会话查询和注销端点；编辑与注册由后端卷和全栈卷拥有，
不得计入当前 Capstone 的已执行证据。

当前契约没有“查询全部收藏”端点，因此刷新后恢复收藏集合仍是后端契约缺口，不能用
localStorage 猜测服务端事实。前端禁用按钮只能减少误操作，不能提供授权、预约唯一性或
数据库事务。

React 与 Vue 共同使用以下十个场景名，结果语义不得降低：

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

## React 与 Vue 的有意差异

差异来自框架模型，不代表业务验收或安全要求不同，也不应逐行互译组件源码。

| 维度 | React 本卷 | Vue 对等卷 |
| --- | --- | --- |
| 视图模型 | JSX、函数组件、render/commit、props 快照 | SFC、模板编译、`script setup`、props/slots |
| 局部状态 | `useState` 快照、setter 队列、不可变更新 | `ref/reactive` 追踪、`computed`、`nextTick` |
| 生命周期同步 | Effect 依赖与 cleanup，Strict Mode 检查 | `watch/watchEffect`、生命周期钩子与同步清理注册 |
| 路由数据 | Data Router loader/action、错误元素、revalidation | Vue Router 导航、路由 watch、composable 读取与取消 |
| 应用状态 | reducer、Context、必要时 `useSyncExternalStore` | Pinia store、`storeToRefs`、provide/inject 服务 |
| 错误边界 | 资源状态、路由 `errorElement`、组件 Error Boundary | 资源状态、Router 错误、`onErrorCaptured` |
| 性能工具 | Profiler、memo、deferred/transition、Compiler、Activity | DevTools、computed、`shallowRef`、KeepAlive、异步组件 |
| SSR 工厂 | 每请求 router/store，`renderToString` / `hydrateRoot` | 每请求 app/router/Pinia，`createSSRApp` / mount |
| 进阶边界 | Suspense、Actions、RSC 与 Server Function | Teleport、Transition、server prefetch 与 Nuxt |

## 命令矩阵

命令必须在表中指定位置运行，并保存实际版本、退出码、测试数和失败证据。

| 阶段 | 运行位置 | 命令 | 证明范围 |
| --- | --- | --- | --- |
| 环境快照 | 准备创建项目的父目录 | `node --version`、`corepack --version`、`pnpm --version` | 工具实际可用，不证明应用正确 |
| 创建应用 | 个人练习目录 | `mkdir -p neighborhood-market/apps && cd neighborhood-market && pnpm create vite apps/react-web --template react-ts` | 建立 Vite React TS 起点 |
| 安装与依赖 | `neighborhood-market/apps/react-web` | `pnpm install`、`pnpm list --depth 0`、`pnpm exec tsc6 --version` | 记录真实解析结果和兼容编译器 |
| 日常开发 | workspace 根 / 应用目录 | `pnpm --filter react-web dev --host 127.0.0.1` / `pnpm dev --host 127.0.0.1` | 启动本机开发服务器 |
| 静态门禁 | `apps/react-web` | `pnpm lint`、`pnpm typecheck` | ESLint/Hooks 与 TSX 项目类型 |
| 单元与组件 | `apps/react-web` | `pnpm test` | 金额、reducer、组件和异步契约 |
| 生产图 | `apps/react-web` | `pnpm build` | 先 typecheck，再生成 Vite 生产资源 |
| 浏览器 | `apps/react-web` | `pnpm e2e` | 独立 5183 strictPort 的 Chromium 用户路径 |
| SSR | `apps/react-web` | `pnpm ssr` | 在 `127.0.0.1:4173` 启动隔离 SSR 实验 |
| SSR HTTP | 另一终端 | 对 `/?q=台灯`、`/?q=__error`、`/?q=不存在`、`/missing` 执行 `curl -i` | 分别观察 200 内容、503 恢复、空 200 和 404 |

已有锁文件的复现和 CI 使用 `pnpm install --frozen-lockfile`。全新证据使用新进程和未占用
端口；E2E 不复用已有服务器。仅运行 `vite build` 不等于类型检查通过。

## 唯一 Capstone 与源码所有权

第八章第 3 课拥有本卷唯一完整 React 最终快照，路径为
`08-ssr-capstone/03-streaming-rsc-capstone-acceptance.md`。上面的第八章路线已直达该教程。

| 内容 | 唯一所有者 |
| --- | --- |
| 最终 `package.json`、配置、SPA、教学 API 与测试 | 第八章第 3 课 |
| 最终 SSR lab、重建命令与共享验收矩阵 | 第八章第 3 课 |
| 水合不变量与 mismatch 故障实验 | 第八章第 1 课 |
| 序列化、可信上游、状态码与请求隔离 | 第八章第 2 课 |
| 阶段机制、最小文件和聚焦接线 | 前七章及第八章前两课 |
| 真实权限、事务、数据库与部署 | 后端卷和全栈卷 |

重建最终项目时只提取唯一快照中的完整文件，不把前文阶段文件拼成第二个“最终版本”。
使用全新临时目录，不复用 2026-10-10 的历史验证目录；教材仓库不保存应用包清单、锁文件、
`node_modules`、`dist`、coverage、Playwright 报告或验证日志。

## 验收

完成本卷时至少证明：

1. 能从空目录安装、启动、类型检查和构建，且类型检查不是只执行 Vite。
2. loading、error、empty、success 有不同 UI，故障可重试且不伪装空结果。
3. 搜索和页码保存在 URL，刷新、分享、后退与前进可恢复。
4. 非法标题和价格不能提交；成功后进入服务端生成的商品详情。
5. 详情 404 可恢复；两页面预约得到一次成功和一次 409。
6. 会话过期提示重新登录；收藏失败不伪装成功；取消收藏使用 DELETE。
7. 键盘可完成筛选、提交、收藏和预约；输入有 label，消息有可访问语义。
8. 测试断言用户可见行为；SSR 原始 HTML 有内容，无 JS 搜索可用，水合无 mismatch。

验收只对真实执行环境给出结论。教学演示通过不等于线上系统已经安全、可扩展或高可用。

## 验证范围

本卷已完成阶段工程与唯一 Capstone 的代表性类型检查、单元测试、构建、SSR 和 Chromium
路径验证；历史快照与当前工程使用过不同环境，不能合并为一次完整执行。Safari、Firefox、
真实移动设备、辅助技术、真实后端授权与事务、生产 SSR、托管 CI、部署与容量仍需单独验收。
精确数量、版本、运行结果和历史边界统一见[交付与验证说明](../VALIDATION.md)。

本卷应用与后端卷教学示例不应被假定为已经位于同一 workspace。正式整合需对齐目录、共享类型、
认证响应、动态 CSRF 与精确 Origin，并按
[契约联调与整合](../09-fullstack/01-contract-integration/01-workspace-contract-runtime-validation.md)操作。

## 资料与导航

- [React 文档](https://react.dev/)
- [React Router](https://reactrouter.com/)
- [React 教材覆盖矩阵](REACT-COVERAGE.md)

[返回全书目录](../README.md) · [开始第一章](01-jsx-components/01-rendering-jsx-purity.md) ·
[下一卷：Vue](../06-vue/README.md)
