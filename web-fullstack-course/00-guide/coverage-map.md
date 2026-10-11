# 知识覆盖地图：每项能力都要落到作品

本页用于学习前找路、阶段结束查漏。正文负责教学，索引负责定位；“知道有这个 API”和“能够独立用它解决问题”是两个验收层次。目标读者是准备安排补练的学习者，以及需要核对理论、实践与证据是否对应的教材维护者。

## 0. 全书覆盖矩阵总览

起步卷由[六篇实操与综合验收](README.md)治理；其余十二卷各有学习入口和覆盖矩阵。具体文件数量、矩阵规模和统计口径统一由[交付与验证说明](../VALIDATION.md)维护，本页不重复维护数量。

| 范围 | 直接学习入口 | 能力审计入口 |
|---|---|---|
| 01 HTML | [HTML README](../01-html/README.md) | [HTML 覆盖矩阵](../01-html/HTML-COVERAGE.md) |
| 02 CSS | [CSS README](../02-css/README.md) | [CSS 覆盖矩阵](../02-css/CSS-COVERAGE.md) |
| 03 浏览器 | [浏览器 README](../03-browser/README.md) | [浏览器覆盖矩阵](../03-browser/BROWSER-COVERAGE.md) |
| 04 JavaScript / TypeScript | [JS/TS README](../04-javascript-typescript/README.md) | [JS/TS 覆盖矩阵](../04-javascript-typescript/JS-TS-COVERAGE.md) |
| 05 React | [React README](../05-react/README.md) | [React 覆盖矩阵](../05-react/REACT-COVERAGE.md) |
| 06 Vue | [Vue README](../06-vue/README.md) | [Vue 覆盖矩阵](../06-vue/VUE-COVERAGE.md) |
| 07 工程化 | [工程化 README](../07-engineering/README.md) | [工程化覆盖矩阵](../07-engineering/ENGINEERING-COVERAGE.md) |
| 08 后端 | [后端 README](../08-backend/README.md) | [后端覆盖矩阵](../08-backend/BACKEND-COVERAGE.md) |
| 09 全栈交付 | [全栈 README](../09-fullstack/README.md) | [全栈覆盖矩阵](../09-fullstack/FULLSTACK-COVERAGE.md) |
| 10 AI Agent | [AI Agent README](../10-ai-agent/README.md) | [Agent 覆盖矩阵](../10-ai-agent/AGENT-COVERAGE.md) |
| 11 小程序 | [小程序 README](../11-mini-program/README.md) | [小程序覆盖矩阵](../11-mini-program/MINI-PROGRAM-COVERAGE.md) |
| 12 浏览器插件 | [插件 README](../12-browser-extension/README.md) | [插件覆盖矩阵](../12-browser-extension/EXTENSION-COVERAGE.md) |

矩阵链接存在只证明知识点有归属；只有正文案例、练习、失败诊断和实际验收共同成立，才表示对应能力完成。分卷 README 直接安排详细教程，本页的第一课链接用于定位知识组，不意味着学完第一课就完成整组。

## 1. HTML 覆盖

| 知识组 | 内容 | 实作起点 | 验收证据 |
|---|---|---|---|
| 语法与文档 | 标签、元素、属性、嵌套、实体、doctype、lang、meta、title、link、style、script | [解析器与 DOM](../01-html/01-document-text/01-html-parser-dom.md) | 能解释文档与 DOM，不出现结构性嵌套错误 |
| 文本语义 | 标题、段落、强调、引用、代码、时间、双向文字、注音与修订 | [文本结构与强调](../01-html/01-document-text/05-text-structure-emphasis.md) | 商品描述有正确语义，不靠标签样式猜用途 |
| 内容组织 | header、nav、main、article、section、aside、footer、address、search、列表 | [地标与分区](../01-html/02-structure-links-lists/01-landmarks-sectioning.md) | 导航、商品和补充信息边界清楚 |
| URL 与链接 | 相对/绝对 URL、hash、download、target、rel | [URL 解析与片段](../01-html/02-structure-links-lists/03-url-resolution-fragments.md) | 深链和外链行为可预测 |
| 媒体与嵌入 | img、picture、source、audio、video、track、map、area、iframe、object、embed | [图片语义与尺寸](../01-html/03-images-media-embedding/01-image-semantics-alt-dimensions.md) | 替代文本、字幕、尺寸、加载与权限合理 |
| SVG/Canvas | 矢量与像素绘制、上下文与方法、可访问替代 | [SVG 与 Canvas](../01-html/03-images-media-embedding/08-svg-canvas-graphics.md) | 能按用途选择，图形信息有文本替代 |
| 表格 | caption、colgroup、thead/tbody/tfoot、th/td、scope、headers | [表格模型](../01-html/04-tables-data/01-table-model-structure.md) | 数据关系可读，不用表格强做页面布局 |
| 表单 | 现行 input 类型、label、name、autocomplete、约束、select、textarea | [表单请求与编码](../01-html/05-forms-validation/01-form-action-method-encoding.md) | 键盘完成发布，错误与字段关联 |
| 方法与原生交互 | validity、FormData、focus、dialog、popover、details、template、slot | [details 与 toggle](../01-html/06-interactive-dom/01-details-summary-toggle.md) | 原生交互可打开、取消、恢复焦点 |
| 无障碍与 SEO | 语义、名称、键盘、焦点、ARIA、元信息、检索 | [语义、角色与地标](../01-html/07-accessibility-seo/01-semantic-roles-landmarks-headings.md) | 不只鼠标可用，页面信息可辨认 |
| 元素类别 | 现行元素用途、关键属性、示例与限制 | [按职责检索元素](../01-html/08-html-element-reference/01-current-elements-by-responsibility.md) | 能按需求检索并正确应用 |

“HTML 方法”来自 DOM/Web API 对象，而不是标签文本自身会执行函数。教程会区分内容属性、DOM 属性、方法、事件和默认行为。

## 2. CSS 覆盖

| 知识组 | 内容 | 实作起点 |
|---|---|---|
| 规则与层叠 | 声明、继承、优先级、来源、layer、重要性、选择器与伪类/伪元素 | [规则与解析入口](../02-css/01-syntax-cascade-selectors/01-rules-parsing-entry-points.md) |
| 值体系 | 长度、百分比、视口、容器单位、颜色、calc/min/max/clamp、变量与回退 | [值阶段、单位与百分比](../02-css/02-values-colors-units/01-value-stages-units-percentages.md) |
| 尺寸与流 | box-sizing、margin/padding/border、overflow、display、position、z-index、包含块与堆叠 | [盒模型与内在尺寸](../02-css/03-box-sizing-flow-position/01-box-model-intrinsic-sizing-overflow.md) |
| 视觉与文本 | 字体、行高、换行、装饰、背景、边框、阴影、filter、mask、clip-path | [字体加载与回退](../02-css/04-typography-decoration/01-font-loading-fallback-metrics.md) |
| 一维布局 | flex 方向、wrap、grow/shrink/basis、对齐、gap、最小尺寸陷阱 | [轴、换行与对齐](../02-css/05-flexbox/01-axes-wrapping-alignment.md) |
| 二维布局 | grid 轨道、区域、minmax、auto-fit/fill、隐式轨道与 subgrid | [显式轨道、线与区域](../02-css/06-grid/01-explicit-tracks-lines-areas.md) |
| 自适应 | 媒体与容器查询、逻辑属性、字体与内容响应式、触控、打印 | [媒体查询与内容断点](../02-css/07-responsive-container/01-media-queries-content-breakpoints.md) |
| 动效 | transform、transition、keyframes、timeline、WAAPI、3D、减少动画与降级 | [坐标与合成](../02-css/08-transforms-transitions-animation/01-transforms-coordinates-compositing.md) |
| 现代组件样式 | @layer、嵌套、@property、主题、表单、滚动、支持检测 | [变量与主题](../02-css/09-components-modern-css/01-custom-properties-property-themes.md) |
| 属性模块索引 | 稳定属性、关键值、行为、实例与目标浏览器边界 | [稳定属性模块索引](../02-css/10-property-reference/01-stable-properties-module-index.md) |

CSS 的“完整内容”是知识体系与可检索属性地图，不是背诵条目。课程按有规范、兼容数据和目标环境依据的机制组织主线；尚未验证的能力明确标注边界，没有“背完 CSS4 即可毕业”的完成标准。

CSS 验收应包含长标题、空数据、字体变化、窄屏、200% 缩放、键盘焦点与减少动画；只截一张桌面截图不够。

## 3. 浏览器与语言

| 能力 | 实作起点 | 可观察成果 |
|---|---|---|
| 请求、缓存、协议 | [URL、DNS、连接与 TLS](../03-browser/01-network-http-cache/01-url-dns-connections-tls.md) | 复现 200/304，区分 no-cache/no-store |
| 渲染与调度 | [DOM 到画面](../03-browser/02-rendering-event-loop/01-dom-cssom-layout-paint-composite.md) | 预测任务顺序，诊断长任务 |
| 存储与安全 | [内存、Web Storage 与跨标签页](../03-browser/03-storage-security/01-memory-web-storage-cross-tab.md) | 本地数据回退，解释 Cookie/CORS/CSRF |
| Fetch 与实时通信 | [超时、取消与竞态](../03-browser/04-fetch-streams-realtime/01-reliable-fetch-timeout-cancel-race.md) | 请求取消、竞态与断线恢复 |
| Worker 与平台 API | [Worker 消息与取消](../03-browser/05-workers-offline-webapis/01-web-worker-messaging-transfer-cancel.md) | 消息统计、离线阅读、权限拒绝 |
| DevTools 与性能 | [请求、性能与内存证据](../03-browser/06-devtools-performance/01-network-performance-memory-evidence.md) | 提交有证据的诊断记录 |
| 基础编程 | [值、变量与转换](../04-javascript-typescript/01-values-control-flow/01-values-variables-types-conversion.md) | 函数、数组、对象与错误 |
| 模块与 DOM | [JS/TS 卷学习顺序](../04-javascript-typescript/README.md) | 原生应用拆分与事件处理 |
| 异步 | [Promise 与 async](../04-javascript-typescript/06-async-fetch-event-loop/01-promises-async-event-loop.md) | 失败、取消、顺序与恢复 |
| TypeScript | [推断与 strict 配置](../04-javascript-typescript/07-typescript-core/01-inference-annotations-strict-config.md) | strict、unknown、领域校验与泛型 |
| 测试与算法 | [Node 测试与断言](../04-javascript-typescript/09-testing-debugging-algorithms/01-node-test-assertions-tdd-boundaries.md) | 边界断言、复杂度与可定位错误 |

语言层应能画出输入、状态和输出；浏览器层应能指出请求、任务或存储的真实证据。TypeScript 类型通过不能替代外部输入解析，取消客户端等待也不能推出服务端业务已回滚。

## 4. React 与 Vue 对等地图

| 能力 | React 知识组 | Vue 知识组 | 相同验收 |
|---|---|---|---|
| 项目与组件 | 01 JSX/组件 | 01 SFC/模板 | 卡片、列表、props 与 key |
| 事件与表单 | 02 state 与表单 | 02 响应式与 v-model | 发布与金额输入 |
| 副作用与复用 | 03 Effect/Hook | 03 生命周期/composable | 请求清理、不重复订阅 |
| 路由与数据 | 04 路由/数据 | 04 Router/数据 | 地址筛选、刷新详情、错误状态 |
| 状态架构 | 05 Context/reducer | 05 Pinia | 分清局部、URL、共享与服务端状态 |
| 测试与无障碍 | 06 | 06 | 同一键盘路径和边界用例 |
| 性能与进阶 | 07 | 07 | 基于证据优化，避免滥用缓存 |
| SSR 与阶段实战 | 08 | 08 | 理解 hydration，独立交付完整前端 |

入口：[React 卷](../05-react/README.md) · [Vue 卷](../06-vue/README.md)。

Vue 正文不把“看完 React 后照着改”当教学。两卷独立解释状态、生命周期、复用与生态，并用相同业务复杂度验收。对等指业务契约和测试目标相同，不要求两种框架的代码结构完全一样。

## 5. 工程化、后端与交付

| 能力 | 实作起点 | 证据 |
|---|---|---|
| 依赖、ESM 与开发构建 | [运行时、清单与锁文件](../07-engineering/01-pnpm-vite-esm/01-node-pnpm-manifests-lockfiles.md) | 固定版本、锁文件安装 |
| 质量规则 | [格式范围](../07-engineering/02-lint-format-quality/01-prettier-format-scope.md) | flat config、TS 检查、错误门禁 |
| 资源与构建 | [构建图与分块](../07-engineering/03-build-assets-performance/01-vite-build-graph-chunks-dynamic-import.md) | 分包、哈希、资源预算 |
| 工作区与组件库 | [工作区依赖图](../07-engineering/04-workspace-component-library/01-pnpm-workspace-dependency-graph.md) | 清晰 exports 与共享边界 |
| 测试体系 | [领域单测边界](../07-engineering/05-unit-integration-e2e/01-vitest-unit-domain-boundaries.md) | 单测、集成、E2E 各负其责 |
| Git 与 CI | [工程卷学习顺序](../07-engineering/README.md) | 新机器复现、流水线发现错误 |
| Node 与 API | [后端卷学习顺序](../08-backend/README.md) | HTTP、Nest、校验、错误契约 |
| 数据库 | [关系模型](../08-backend/03-sql-modeling/01-domain-to-relational-model.md) | SQL、连接池、事务、索引、并发 |
| 身份与业务安全 | [账号与密码边界](../08-backend/06-auth-sessions-rbac/01-password-hashing-account-boundaries.md) | 会话、CSRF、对象权限、搜索上传 |
| 缓存与异步 | [缓存失效与击穿](../08-backend/08-redis-queues-reliability/01-cache-invalidation-stampede-control.md) | 任务幂等、重试与恢复 |
| 测试与可观测性 | [后端验收顺序](../08-backend/README.md) | 独立 API 验收、日志与健康检查 |
| 双前端集成 | [工作区契约与运行时校验](../09-fullstack/01-contract-integration/01-workspace-contract-runtime-validation.md) | 相同认证与错误处理 |
| 本地与线上运行 | [全栈交付顺序](../09-fullstack/README.md) | Docker、Nginx、HTTPS、持久化 |
| 发布与恢复 | [全栈交付顺序](../09-fullstack/README.md) | CI、回滚、备份恢复、性能与安全 |
| 独立交付 | [结业范围与业务证据](../09-fullstack/06-graduation-project/01-capstone-scope-business-evidence.md) | 需求到运行，再到故障恢复 |

## 6. 三卷进阶能力地图

三卷是完整独立路线，时间安排见[学习路线](learning-path.md)。它们复用底层能力，但必须重新验证自己的运行时、权限与交付边界。

| 领域 | 理论与机制 | 实际场景 | 可观察验收 |
|---|---|---|---|
| AI Agent | 本地模型探针、结构化输出、Provider、显式图、MCP 与持久状态 | 用户导入帮助资料，助手按来源回答或拒答 | 非法输出被拒绝；取消、步数、恢复与模型/替身结果分开 |
| Agent 治理 | 来源、注入防护、授权、确认、幂等、评测与资源预算 | 导入资料包含不可信指令，助手申请读取或写本地任务 | 文本不能提高权限；越权拒绝，本地写需确认；不修改商品/预约，不启用远程兜底 |
| 小程序运行时 | 原生逻辑/视图层、生命周期、路由、分包与渲染预算 | 从分享链接冷启商品详情，再返回列表 | 生命周期轨迹、包体、页面恢复与真机渲染分别记录 |
| 小程序业务 | 请求解析、结果不确定、code 交换、草稿隔离、权限与平台适配 | 弱网预约、账号切换、拒绝位置或相册 | 同键恢复不重复预约；用户不混草稿；拒绝仍可继续基本流程 |
| 插件运行时 | manifest、上下文隔离、消息验证、后台生命周期与存储 | 用户触发读取当前页商品，后台暂停后恢复 | 权限最小且有用途；伪造消息被拒绝；恢复不依赖常驻内存 |
| 插件交付 | CSP、隐私、目标浏览器差异、测试、打包与安装卸载 | 用户拒绝站点权限，重新启用或卸载插件 | 拒绝与恢复可解释；只清理自有数据；真实扩展环境与网页替身分开 |

学习入口分别为 [AI Agent](../10-ai-agent/README.md)、[小程序](../11-mini-program/README.md)、[浏览器插件](../12-browser-extension/README.md)。不在这里复制 SDK 版本、精确包清单或自动宣称真机/商店验证通过。

## 7. 学术能力怎样形成证据

技术名称覆盖只是第一层。每个知识组都应把知识解释、应用、分析、评价和独立设计连起来：

| 能力层次 | 邻里集市场景中的动作 | 证据 |
|---|---|---|
| 理解 | 解释缓存、类型、事务或工具授权的机制 | 用准确术语画输入、状态与输出；说明不保证什么 |
| 应用 | 按当前任务实现一个最小完整版本 | 文件、命令、正常输出和停止方法可复现 |
| 分析 | 注入故障，沿调用链或状态变化定位原因 | 稳定复现、可证伪假设、变量/请求/数据库观察 |
| 评价 | 在两种方案之间说明取舍 | 比较复杂度、性能、兼容与风险，而不是只说“更先进” |
| 创造与迁移 | 不看示例完成一个相邻需求或换运行时 | 独立实现、回归矩阵、交接和剩余风险 |

操作：选一个已完成知识组，遮住示例，先预测三个边界输入，再实现一个相邻需求。通过标准是结果能被原始证据解释，错误实现会被检查发现；只会复述术语时回到详细教程补实验。

Next/Nuxt 的完整产品开发、GraphQL、Kubernetes、复杂微服务、真实支付和移动原生仍是另行扩展领域。SSR 实验不等于完整掌握这些产品栈；三卷进阶通过也不等于所有平台或模型都可靠。

## 8. 查漏练习

选一个功能“收藏商品”，画出：

```text
HTML 按钮与名称
 → CSS 状态与焦点
 → 框架事件与 pending
 → HTTP 幂等请求
 → 会话与权限
 → 数据唯一关系
 → 成功/失败更新
 → 测试与日志
```

在个人 `learning-log.md` 给每层注明真实源码、运行方式、一个失败输入和复验结果。如果某一层只写“交给库处理”，回到对应教程补充机制、输入和失败边界。参考答案不限定某个库，但必须说明各层职责。

进阶练习：小程序标出平台登录与恢复接口，插件标出用户触发读取和扩展消息边界。Agent 读取用户明确导入的收藏帮助资料，解释规则或经审批创建本地提醒；不调用商品、收藏或预约写接口。所选卷若只实现本地偏好，应诚实写为本地收藏，不以 API 或数据库箭头冒充已经集成。

## 9. 最终检查

- [ ] 当前能力在分卷 README 与矩阵中能定位到真实详细教程。
- [ ] 理论能解释正常和边界输入，不只背术语。
- [ ] 实作含运行、停止、失败记录和相同步骤复验。
- [ ] 局部示例与[项目契约](project-contract.md)一致；进阶扩展注明所在卷的规则。
- [ ] 替身、浏览器、数据库、平台客户端与外部发布结果分开记录。
- [ ] 未运行的环境和缺失证据明确列出，不用索引完整代替验证。

每个主要知识组都应该有正文、练习和产出。索引完整不能代替示例运行；示例通过也不能代替跨层业务验收。结合[项目阶段评分](project-contract.md)提交证据，数量与全书自检结论只查 [VALIDATION](../VALIDATION.md)。

[学习路线](learning-path.md) · [起步卷目录](README.md) · [全书目录](../README.md)
