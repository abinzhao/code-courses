# 知识覆盖地图：每项能力都要落到作品

本页用于学习前找路、阶段结束查漏。正文负责教学，索引负责定位；“知道有这个API”和“能够独立用它解决问题”是两个验收层次。

## 0. 全书覆盖矩阵总览

当前全书有 226 篇详细教程：HTML 既有 24 篇，本轮新增 202 篇。九个分卷覆盖矩阵共登记
578 个全局唯一 ID；起步卷的 6 篇实操教程由本页、章入口和 W1 验收直接治理，不另造矩阵。

| 范围 | 详细教程 | 覆盖 ID | 审计入口 |
|---|---:|---:|---|
| 00 起步实操 | 6 | 本页直接治理 | [起步卷目录](README.md) |
| 01 HTML | 24 | 173 | [HTML 覆盖矩阵](../01-html/HTML-COVERAGE.md) |
| 02 CSS | 30 | 34 | [CSS 覆盖矩阵](../02-css/CSS-COVERAGE.md) |
| 03 浏览器 | 18 | 44 | [浏览器覆盖矩阵](../03-browser/BROWSER-COVERAGE.md) |
| 04 JavaScript / TypeScript | 27 | 36 | [JS/TS 覆盖矩阵](../04-javascript-typescript/JS-TS-COVERAGE.md) |
| 05 React | 24 | 40 | [React 覆盖矩阵](../05-react/REACT-COVERAGE.md) |
| 06 Vue | 24 | 55 | [Vue 覆盖矩阵](../06-vue/VUE-COVERAGE.md) |
| 07 工程化 | 22 | 74 | [工程化覆盖矩阵](../07-engineering/ENGINEERING-COVERAGE.md) |
| 08 后端 | 31 | 54 | [后端覆盖矩阵](../08-backend/BACKEND-COVERAGE.md) |
| 09 全栈交付 | 20 | 68 | [全栈覆盖矩阵](../09-fullstack/FULLSTACK-COVERAGE.md) |

全书 316 篇正文、参考与覆盖矩阵的统计口径，以及静态/运行时/人工证据边界，见
[教材结构](07-course-structure.md)和[交付与验证说明](../VALIDATION.md)。矩阵链接存在只证明
知识点有归属；只有正文案例、练习、失败诊断和实际验收共同成立，才表示对应能力完成。

## 1. HTML 覆盖

| 知识组 | 内容 | 正文 | 验收证据 |
|---|---|---|---|
| 语法与文档 | 标签、元素、属性、嵌套、实体、doctype、lang、meta、title、link、style、script | [文档与文本](../01-html/01-document-text.md) | 能解释文档与DOM，不出现结构性嵌套错误 |
| 文本语义 | 标题、段落、强调、引用、代码、时间、双向文字、注音与修订 | 同上及[元素索引](../01-html/08-html-element-reference.md) | 商品描述有正确语义，不靠标签样式猜用途 |
| 内容组织 | header、nav、main、article、section、aside、footer、address、search、列表 | [结构与链接](../01-html/02-structure-links-lists.md) | 导航、商品和补充信息边界清楚 |
| URL与链接 | 相对/绝对URL、hash、download、target、rel | 同上 | 深链和外链行为可预测 |
| 媒体与嵌入 | img、picture、source、audio、video、track、map、area、iframe、object、embed | [媒体](../01-html/03-images-media-embedding.md) | 替代文本、字幕、尺寸、加载与权限合理 |
| SVG/Canvas | 矢量与像素绘制、上下文与方法、可访问替代 | 同上 | 能按用途选择，图形信息有文本替代 |
| 表格 | caption、colgroup、thead/tbody/tfoot、th/td、scope、headers | [表格](../01-html/04-tables-data.md) | 数据关系可读，不用表格强做页面布局 |
| 表单 | 现行input类型、label、name、autocomplete、约束、select、textarea与相关元素 | [表单](../01-html/05-forms-validation.md) | 键盘完成发布，错误与字段关联 |
| 方法与原生交互 | validity、FormData、focus、dialog、popover、details、template、slot | [交互与DOM](../01-html/06-interactive-dom.md) | 原生交互可打开、取消、恢复焦点 |
| 无障碍与SEO | 语义、可访问名称、键盘、焦点、ARIA、元信息、检索 | [无障碍](../01-html/07-accessibility-seo.md) | 不只鼠标可用，页面信息可辨认 |
| 全部元素类别 | 现行元素用途、关键属性、示例与限制；过时元素区别 | [完整元素索引](../01-html/08-html-element-reference.md) | 能按需求检索并正确应用 |

“HTML方法”来自DOM/Web API对象，而不是标签文本自身会执行函数。教程会区分内容属性、DOM属性、方法、事件和默认行为。

## 2. CSS 覆盖

| 知识组 | 内容 | 正文 |
|---|---|---|
| 规则与层叠 | 声明、继承、优先级、来源、layer、重要性、选择器与伪类/伪元素 | [语法与层叠](../02-css/01-syntax-cascade-selectors.md) |
| 值体系 | 长度、百分比、视口、容器单位、颜色、calc/min/max/clamp、变量与回退 | [值与单位](../02-css/02-values-colors-units.md) |
| 尺寸与流 | box-sizing、margin/padding/border、overflow、display、position、z-index、包含块与堆叠 | [盒与定位](../02-css/03-box-sizing-flow-position.md) |
| 视觉与文本 | 字体、行高、换行、装饰、背景、边框、阴影、filter、mask、clip-path | [字体与装饰](../02-css/04-typography-decoration.md) |
| 一维布局 | flex方向、wrap、grow/shrink/basis、对齐、gap、最小尺寸陷阱 | [Flexbox](../02-css/05-flexbox.md) |
| 二维布局 | grid轨道、区域、minmax、auto-fit/fill、隐式轨道与subgrid | [Grid](../02-css/06-grid.md) |
| 自适应 | 媒体与容器查询、逻辑属性、字体与内容响应式、触控、打印 | [响应式](../02-css/07-responsive-container.md) |
| 动效 | transform、transition、keyframes、timeline、WAAPI、3D、减少动画与降级 | [动画](../02-css/08-transforms-transitions-animation.md) |
| 现代组件样式 | @layer、嵌套、@property、主题、表单、滚动、支持检测 | [现代CSS](../02-css/09-components-modern-css.md) |
| 属性模块索引 | 模块化属性、关键值、行为、实例、罕见与实验特性边界 | [属性索引](../02-css/10-property-reference.md) |

CSS的“全部内容”需要理解为完整知识体系与可检索属性地图。各模块不断新增草案和厂商特性；主线教授可用的稳定机制，实验项明确标注。没有“背完CSS4即可毕业”这种完成标准。

CSS验收应包含长标题、空数据、字体变化、窄屏、200%缩放、键盘焦点与减少动画；只截一张桌面截图不够。

## 3. 浏览器与语言

| 能力 | 教材位置 | 可观察成果 |
|---|---|---|
| 请求、缓存、协议 | [浏览器01](../03-browser/01-network-http-cache.md) | 复现200/304，区分no-cache/no-store |
| 渲染与调度 | [浏览器02](../03-browser/02-rendering-event-loop.md) | 预测任务顺序，诊断长任务 |
| 存储与安全 | [浏览器03](../03-browser/03-storage-security.md) | 本地数据回退，解释Cookie/CORS/CSRF |
| Fetch与实时通信 | [浏览器04](../03-browser/04-fetch-streams-realtime.md) | 请求取消、竞态与断线恢复 |
| Worker与平台API | [浏览器05](../03-browser/05-workers-offline-webapis.md) | 消息统计、离线阅读、权限拒绝 |
| DevTools与性能 | [浏览器06](../03-browser/06-devtools-performance.md) | 提交有证据的诊断记录 |
| 基础编程 | [JS01—03](../04-javascript-typescript/README.md) | 函数、数组、对象与错误 |
| 模块与DOM | 同卷04—05 | 原生应用拆分与事件处理 |
| 异步 | 同卷06 | 失败、取消、顺序与恢复 |
| TypeScript | 同卷07—08 | strict、unknown、领域校验与泛型 |
| 测试与算法 | 同卷09 | 边界断言、复杂度与可定位错误 |

## 4. React 与 Vue 对等地图

| 能力 | React | Vue | 相同验收 |
|---|---|---|---|
| 项目与组件 | 01 JSX/组件 | 01 SFC/模板 | 卡片、列表、props与key |
| 事件与表单 | 02 state与表单 | 02响应式与v-model | 发布与金额输入 |
| 副作用与复用 | 03 Effect/Hook | 03生命周期/composable | 请求清理、不重复订阅 |
| 路由与数据 | 04路由/数据 | 04Router/数据 | 地址筛选、刷新详情、错误状态 |
| 状态架构 | 05Context/reducer | 05Pinia | 分清局部、URL、共享与服务端状态 |
| 测试与无障碍 | 06 | 06 | 同一键盘路径和边界用例 |
| 性能与进阶 | 07 | 07 | 基于证据优化，避免滥用缓存 |
| SSR与阶段实战 | 08 | 08 | 理解hydration，独立交付完整前端 |

入口：[React卷](../05-react/README.md) · [Vue卷](../06-vue/README.md)。

Vue正文不把“看完React后照着改”当教学。两卷独立解释其状态、生命周期、复用与生态，并用相同业务复杂度验收。

## 5. 工程化、后端与交付

| 能力 | 正文 | 证据 |
|---|---|---|
| 依赖、ESM与开发构建 | [工程01](../07-engineering/01-pnpm-vite-esm.md) | 固定版本、锁文件安装 |
| 质量规则 | [工程02](../07-engineering/02-lint-format-quality.md) | Flat config、TS检查、错误门禁 |
| 资源与构建 | [工程03](../07-engineering/03-build-assets-performance.md) | 分包、哈希、资源预算 |
| 工作区与组件库 | [工程04](../07-engineering/04-workspace-component-library.md) | 清晰exports与共享边界 |
| 测试体系 | [工程05](../07-engineering/05-unit-integration-e2e.md) | 单测、集成、E2E各负其责 |
| Git与CI | [工程06—07](../07-engineering/README.md) | 新机器复现、流水线发现错误 |
| Node与API | [后端01—02](../08-backend/README.md) | HTTP、Nest、校验、错误契约 |
| 数据库 | 后端03—05 | 模型、SQL、连接池、事务、索引、并发 |
| 身份与业务安全 | 后端06—07 | 会话、CSRF、对象权限、搜索上传 |
| 缓存与异步 | 后端08 | 缓存失效、任务幂等、重试与恢复 |
| 测试与可观测性 | 后端09—10 | 独立API验收、日志与健康检查 |
| 双前端集成 | [全栈01](../09-fullstack/01-contract-integration.md) | 相同认证与错误处理 |
| 本地与线上运行 | 全栈02—03 | Docker、Nginx、HTTPS、持久化 |
| 发布与恢复 | 全栈04—05 | CI、回滚、备份恢复、性能与安全 |
| 独立交付 | [结业](../09-fullstack/06-graduation-project.md) | 需求到运行，再到故障恢复 |

## 6. 不是主线毕业条件的扩展

Next/Nuxt的完整产品开发、GraphQL、Kubernetes、复杂微服务、真实支付、移动原生、小程序与AI应用可在基础完成后继续学习。本书讲SSR与系统边界，但不会把这些独立领域的简单介绍冒充全部掌握。

中级全栈能力首先看能否把一个明确范围的系统做好，而不是工具列表是否足够长。

## 7. 查漏练习

选一个功能“收藏商品”，画出：

```text
HTML按钮与名称
 → CSS状态与焦点
 → 框架事件与pending
 → HTTP幂等请求
 → 会话与权限
 → 数据唯一关系
 → 成功/失败更新
 → 测试与日志
```

如果某一层只写“交给库处理”，回到对应章节补充机制、输入和失败边界。参考答案不限定某个库，但必须说明各层职责。

## 8. 最终检查

每个主要知识组都应该有正文、练习和产出。索引完整不能代替示例运行；示例通过也不能代替跨层业务验收。结合[阶段评分](05-project-assessment.md)逐项提交证据。

[学习路线](01-learning-path.md) · [全书目录](../README.md)
