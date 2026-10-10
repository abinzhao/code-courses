# 学习路径与 48 周里程碑

## 如何使用这张地图

这张地图回答“什么时候学什么、学完应该能交付什么”。具体知识点以[课程蓝图](../../00-course-blueprint.md)为准，具体任务以每周教程为准。

每周建议保持四个动作：

```text
理解机制 -> 跟做实验 -> 接入 NoteFlow -> 提交验收证据
```

## 阶段总览

| 阶段 | 周次 | 主要问题 | 阶段成果 |
| --- | --- | --- | --- |
| 01 | W1–W4 | 页面为什么能被浏览器理解？ | 语义化、可访问的内容页与表单 |
| 02 | W5–W12 | 页面如何稳定适配不同屏幕？ | 响应式视觉系统和可控动效 |
| 03 | W13–W16 | 浏览器如何执行交互？ | 原生 DOM、事件与 Web API 应用 |
| 04 | W17–W20 | JavaScript 如何组织复杂行为？ | 类型安全、可测试的前端项目 |
| 05 | W21–W26 | React 如何管理组件和异步状态？ | React 团队管理后台 |
| 06 | W27–W32 | Vue 的响应式模型如何解决同一问题？ | Vue 团队管理后台与框架对照 |
| 07 | W33–W37 | 多包项目如何保持可维护？ | Monorepo、测试、CI 和发布门禁 |
| 08 | W38–W43 | 数据、认证和权限如何落地？ | NestJS API、PostgreSQL、认证与 RBAC |
| 09 | W44–W48 | 前后端如何形成可交付系统？ | 测试、部署、监控和 NoteFlow 1.0 |

## 周次路线

### 第一阶段：Web 与 HTML

| 周次 | 单元一 | 单元二 | 周成果 |
| --- | --- | --- | --- |
| W1 | Web 应用、浏览器和服务器是什么 | 终端、文件系统、Git 与开发环境 | 建立本地开发环境，提交第一个项目 |
| W2 | HTML 文档结构、`head` 与元信息 | 标题、段落、文本语义和标题层级 | 完成 NoteFlow 公共首页骨架 |
| W3 | 列表、链接、表格和数据表达 | 图片、音视频、iframe、canvas | 完成内容目录和媒体展示页 |
| W4 | 表单元素、输入类型和完整属性 | `details`、`dialog`、`template`、ARIA | 完成文章编辑表单和键盘验收 |

第一阶段入口：[Web 与 HTML 基础](../00-common/README.md)。

### 第二阶段：CSS 全体系

| 周次 | 单元一 | 单元二 | 周成果 |
| --- | --- | --- | --- |
| W5 | CSS 语法、选择器、继承与层叠 | 盒模型、尺寸、溢出、背景和边框 | 文章卡片和主题变量 |
| W6 | 普通流、`display`、浮动与定位 | Flexbox 核心属性和布局模式 | 导航栏、工具栏和响应式表单 |
| W7 | Grid 网格、轨道、区域和对齐 | 层叠上下文、`z-index`、粘性定位 | SaaS 后台两栏布局 |
| W8 | 字体、文本、颜色、阴影和滤镜 | `calc`、`min`、`max`、`clamp` 和自定义属性 | NoteFlow 视觉基础层 |
| W9 | 媒体查询、移动优先和打印样式 | 容器查询、逻辑属性、RTL 和安全区 | 手机、平板和桌面适配 |
| W10 | `:is()`、`:where()`、`:has()` 与 `@layer` | 函数、渐变、遮罩、裁剪和混合模式 | 可主题化内容页面 |
| W11 | transition、timing-function 和状态过渡 | keyframes、transform、3D 和交错动画 | 加载、弹窗和列表动画 |
| W12 | 滚动驱动动画和 View Transitions | 动画性能、减少动效与 DevTools 排错 | NoteFlow 公开首页视觉版 |

第二阶段入口：[CSS 全体系](../01-css/README.md)。

### 第三阶段：浏览器、DOM 与 Web API

| 周次 | 单元一 | 单元二 | 周成果 |
| --- | --- | --- | --- |
| W13 | 浏览器进程、渲染管线和页面生命周期 | DOM、CSSOM、布局、绘制和合成 | 能解释代码到像素的过程 |
| W14 | DOM 查询、创建、修改和销毁 | 事件模型、冒泡、捕获、委托和表单事件 | 原生文章列表交互 |
| W15 | Storage、URL、History、Clipboard、File | Fetch、Headers、Request、Response、FormData | 无框架搜索和上传模拟 |
| W16 | Worker、Service Worker 和观察器 API | 执行模型、类型、变量和控制流 | 原生阅读清单页面 |

第三阶段入口：[浏览器、DOM 与 JavaScript](../02-browser-javascript/README.md)。

### 第四阶段：JavaScript、TypeScript 与工具

| 周次 | 单元一 | 单元二 | 周成果 |
| --- | --- | --- | --- |
| W17 | 函数、闭包、作用域、`this` 和高阶函数 | 原型链、`class`、Map、Set、迭代器和正则 | 可复用原生数据处理模块 |
| W18 | Promise、async/await、并发控制和取消 | 事件循环、错误传播、重试和退避 | 可取消的搜索聚合器 |
| W19 | ESM、CommonJS、动态导入和 `package.json` | Node.js 文件、HTTP、Stream、CLI 和调试 | 命令行内容查询工具 |
| W20 | TypeScript 基础、高级类型和类型收窄 | pnpm、Vite、环境变量、声明文件和构建产物 | 类型安全前端项目 |

第四阶段入口：[TypeScript 与工具基础](../03-typescript-tooling/README.md)。

### 第五阶段：React

| 周次 | 单元一 | 单元二 | 周成果 |
| --- | --- | --- | --- |
| W21 | JSX、组件、Props、组合和条件渲染 | 列表、Key、事件和受控组件 | 文章列表组件 |
| W22 | `useState`、状态设计和状态提升 | 表单、校验、文件选择和错误状态 | 文章编辑器 |
| W23 | `useEffect`、`useRef`、`useMemo`、`useCallback` | Context、Reducer、自定义 Hook | 编辑器状态层 |
| W24 | React Router、嵌套路由和权限路由 | TanStack Query、缓存、重试和失效 | 接入 NoteFlow API Mock |
| W25 | Zustand、模块边界和持久化 | 组件测试、Hook 测试和可访问性测试 | React 团队后台 |
| W26 | 性能分析、懒加载、虚拟列表和错误边界 | React 19.3、Compiler 和现代渲染模型 | React 阶段验收 |

第五阶段入口：[React](../04-react/README.md)。

### 第六阶段：Vue 3

| 周次 | 单元一 | 单元二 | 周成果 |
| --- | --- | --- | --- |
| W27 | SFC、模板语法和响应式基础 | `ref`、`reactive`、`computed` 和 `watch` | Vue 文章列表 |
| W28 | Props、Emits、生命周期和模板 Ref | Slots、动态组件、异步组件和 Teleport | Vue 编辑器组件 |
| W29 | Composition API 与 composable | 表单、校验、文件上传和错误状态 | 可复用表单系统 |
| W30 | Vue Router、嵌套路由和导航守卫 | Pinia、store 设计和持久化 | Vue 团队管理后台 |
| W31 | VueUse、服务端状态和请求封装 | Vue Test Utils、Vitest 和组件测试 | Vue 测试基线 |
| W32 | Vue 性能、异步组件、虚拟列表和调试 | Nuxt SSR、SEO、Hydration 和渲染边界 | Vue 阶段验收 |

第六阶段入口：[Vue 3](../05-vue/README.md)。

### 第七阶段：现代前端工程化

| 周次 | 单元一 | 单元二 | 周成果 |
| --- | --- | --- | --- |
| W33 | pnpm Workspace、Monorepo 和依赖边界 | 共享类型、组件包、工具包和变更管理 | NoteFlow 多包仓库 |
| W34 | ESLint Flat Config、Prettier 和提交检查 | TypeScript 多项目配置和路径解析 | 统一质量门禁 |
| W35 | 设计令牌、组件库、CSS 架构和可访问性 | 组件工作台与文档 | UI 基础包 |
| W36 | 单元、组件、接口 Mock、E2E 和视觉回归 | 测试数据、隔离、并发和 flaky 排查 | 自动化测试体系 |
| W37 | Bundle、Core Web Vitals 和资源优化 | CI 缓存、依赖安全、制品和回滚 | 持续交付能力 |

第七阶段入口：[前端工程化](../06-frontend-engineering/README.md)。

### 第八阶段：Node.js、NestJS 与数据库

| 周次 | 单元一 | 单元二 | 周成果 |
| --- | --- | --- | --- |
| W38 | Node.js 运行时、ESM、进程和环境变量 | NestJS 模块、Controller、Provider 和 DI | NoteFlow API |
| W39 | REST 资源设计、状态码和错误响应 | Zod、Standard Schema、DTO 和 OpenAPI | 用户与文章 API |
| W40 | PostgreSQL 表、关系、约束和 SQL | 查询、分页、排序、筛选和全文搜索 | 核心数据模型 |
| W41 | Prisma Schema、迁移和 Driver Adapter | Prisma 查询、事务、索引和 N+1 | PostgreSQL API |
| W42 | 密码哈希、认证、Cookie 和 Token 轮换 | CORS、CSRF、限流、审计和安全日志 | 登录与会话系统 |
| W43 | 组织隔离、工作区和 RBAC | 成员邀请、角色变更和权限测试 | SaaS 权限验收 |

第八阶段入口：[后端与数据库](../07-backend/README.md)。

### 第九阶段：全栈集成、部署与毕业项目

| 周次 | 单元一 | 单元二 | 周成果 |
| --- | --- | --- | --- |
| W44 | Next.js App Router、Server Components 和 Metadata | SSR、缓存、重新验证和 Hydration | 公共内容侧真实 API |
| W45 | Redis 缓存和失效策略 | BullMQ、重试、幂等和死信任务 | 通知与统计异步任务 |
| W46 | 文件上传、对象存储和内容安全 | Nest E2E、Playwright 和测试数据库 | 全链路回归测试 |
| W47 | Docker Compose、多阶段构建和 Nginx | GitHub Actions、健康检查和云服务器部署 | 可重复部署 |
| W48 | 性能、安全和可观测性复盘 | 毕业答辩、故障演练和职业能力评估 | NoteFlow 1.0 |

第九阶段入口：[全栈交付](../08-fullstack-delivery/README.md)。

## 里程碑

| 里程碑 | 通过条件 |
| --- | --- |
| M1 W4 | 使用原生 HTML/CSS/JS 完成可访问页面 |
| M2 W12 | 解释浏览器运行机制并完成原生 Web 应用 |
| M3 W20 | 独立搭建类型安全的现代前端项目 |
| M4 W26 | React 团队后台通过功能和测试验收 |
| M5 W32 | Vue 团队后台通过功能和测试验收 |
| M6 W37 | Monorepo、质量门禁和 CI 稳定运行 |
| M7 W43 | NestJS API、PostgreSQL、认证和 RBAC 完成 |
| M8 W48 | 全栈系统部署并通过答辩 |

学习地图不会替代单元正文。它的作用是让学习者在进入一个知识点前知道它会如何连接到后面的产品能力。
