# Web 全栈工程师课程 · 60 单元知识地图

本文件是课程重构的唯一拆分契约。课程在原 24 周 48 单元基础上扩展为 **30 周 60 单元**：新增独立的「前端工程化」阶段（8 单元），前端阶段补入当前稳定版 Vue（4 单元）。每周 2 个知识单元；前后端与工程化目录隔离，公共能力前置，最后在全栈项目阶段汇合。

## 统一单元结构（强制）

每个单元文件必须且只能包含以下六个二级标题，顺序固定：

1. `## 目标`
2. `## 技术栈`
3. `## 详细的理论知识讲解和示例伪代码`
4. `## 课后题`
5. `## 实践练习题`
6. `## 阶段验收作业`

写作要求：中文教学；理论按认知顺序分 6-8 个编号小节，每节含定义、与 Web/工程的关系、围栏代码示例、常见误区；伪代码使用围栏代码块表达机制；课后题 8-10 题且至少 1/3 为场景分析；实践练习 3 个，含任务/步骤约束/提交物/验收标准；阶段验收含提交物清单、100 分评分表、强制不通过条件、目标到验收映射。不允许 TBD/TODO/待补充/待确认 等占位内容。

## 阶段一：公共基础（00-common，W1-W4，8 单元）

| 周 | 单元 | 文件名 | 核心范围 |
|---|---|---|---|
| W1 | U01 | 01-计算机如何运行Web程序.md | 硬件资源、OS、运行时、进程、PID、退出码 |
| W1 | U02 | 02-文件系统路径与Shell基础.md | 目录树、绝对/相对路径、元数据、Shell 心智模型、文件命令、node:path |
| W2 | U03 | 03-命令行进程端口与脚本自动化.md | 管道、重定向、进程/端口命令、退出码、shell 脚本、scripts |
| W2 | U04 | 04-环境变量权限与终端安全.md | 环境变量、密钥管理、文件权限、命令注入、最小权限 |
| W3 | U05 | 05-网络基础TCP-IP-DNS与请求链路.md | 分层模型、IP/端口、TCP、DNS、请求全链路 |
| W3 | U06 | 06-HTTP协议报文方法状态码与Header.md | 报文、方法语义、状态码、Header、内容协商 |
| W4 | U07 | 07-HTTPS-Cookie-CORS与HTTP缓存.md | TLS、证书、Cookie/Token、CORS、强/协商缓存 |
| W4 | U08 | 08-JavaScript与TypeScript语言基础.md | ES2022+、作用域闭包、异步/事件循环、ESM、TS 类型与泛型 |

## 阶段二：前端（01-frontend，W5-W14，20 单元）

### HTML/CSS 与浏览器（W5-W8，U09-U16）

| 周 | 单元 | 文件名 | 核心范围 |
|---|---|---|---|
| W5 | U09 | 09-HTML文档结构与语义化.md | 文档结构、语义标签、文档大纲、SEO、meta |
| W5 | U10 | 10-HTML表单与可访问性基础.md | 表单控件、label、原生校验、ARIA、键盘焦点 |
| W6 | U11 | 11-CSS盒模型与视觉格式化.md | 盒模型、选择器、层叠优先级、继承、定位 |
| W6 | U12 | 12-Flexbox与Grid布局.md | 一维/二维布局、对齐、轨道、典型布局 |
| W7 | U13 | 13-CSS响应式与设计Token.md | 移动优先、媒体/容器查询、现代单位、暗色模式 |
| W7 | U14 | 14-浏览器原理渲染流水线与多进程.md | 导航、解析、渲染树、布局、绘制、合成、进程模型 |
| W8 | U15 | 15-JavaScript-DOM操作与事件机制.md | DOM API、节点操作、事件机制、委托 |
| W8 | U16 | 16-浏览器存储DevTools调试与性能指标.md | 存储、断点调试、Network、LCP/CLS/INP |

### React 主线（W9-W12，U17-U24）

| 周 | 单元 | 文件名 | 核心范围 |
|---|---|---|---|
| W9 | U17 | 17-React心智模型组件与Props.md | UI=f(state)、函数组件、props、组合 |
| W9 | U18 | 18-React-Hooks与状态管理.md | Hooks、状态分类、派生、自定义 Hook |
| W10 | U19 | 19-React-Router单页路由.md | 路由映射、嵌套/动态路由、查询参数、404 |
| W10 | U20 | 20-服务端状态与TanStack-Query.md | query key、缓存、重试、mutation、失效 |
| W11 | U21 | 21-React复杂表单与校验.md | RHF、Zod、提交态、服务端错误回填 |
| W11 | U22 | 22-错误边界并发特性与性能优化.md | Error Boundary、Suspense、Transition、虚拟列表 |
| W12 | U23 | 23-React组件测试与Testing-Library.md | Vitest、RTL 查询、交互、MSW |
| W12 | U24 | 24-E2E测试与前端质量门禁.md | Playwright、trace、关键流程、门禁 |

### Vue 当前稳定版对照（W13-W14，U25-U28）

| 周 | 单元 | 文件名 | 核心范围 |
|---|---|---|---|
| W13 | U25 | 25-Vue3心智模型SFC与组合式API.md | createApp、SFC、script setup、指令、computed/watch |
| W13 | U26 | 26-Vue3响应式原理组件通信与Composables.md | Proxy 响应式、ref/reactive、组件通信、Composables |
| W14 | U27 | 27-Vue-Router与Pinia状态管理.md | Vue Router、导航守卫、Pinia |
| W14 | U28 | 28-Vue3表单请求测试与生态集成.md | v-model 校验、请求封装、Vue Test Utils、生态 |

## 阶段三：现代前端工程化（02-frontend-engineering，W15-W18，8 单元）

| 周 | 单元 | 文件名 | 核心范围 |
|---|---|---|---|
| W15 | U29 | 29-前端工程化总览工具链与质量体系.md | 工程化目标、工具链全景、模块图、脚手架、脚本体系 |
| W15 | U30 | 30-Vite深入开发服务器HMR与插件机制.md | Vite 双引擎、依赖预构建、HMR、插件 |
| W16 | U31 | 31-生产构建Rollup-Webpack存量与产物分析.md | Rollup、tree-shaking、代码分割、Webpack 存量、产物分析 |
| W16 | U32 | 32-ESLint9-Prettier代码规范与提交门禁.md | flat config、规则插件、Prettier、lint-staged/Husky |
| W17 | U33 | 33-环境变量多环境配置与构建模式.md | 构建期注入、.env 模式、多环境、配置校验 |
| W17 | U34 | 34-Monorepo工作区与pnpm进阶.md | workspace、幽灵依赖、任务编排缓存、共享配置 |
| W18 | U35 | 35-Node-CLI-npm包开发Changesets与发布.md | CLI、包入口与类型、Changesets、npm publish |
| W18 | U36 | 36-前端CI-CD微前端与模块联邦.md | 前端 CI、预览发布、微前端、模块联邦 |

## 阶段四：后端（03-backend，W19-W26，16 单元）

### Node 与 Web 框架（W19-W20，U37-U40）

| 周 | 单元 | 文件名 | 核心范围 |
|---|---|---|---|
| W19 | U37 | 37-Nodejs运行时与模块系统.md | 运行时架构、ESM/CJS、事件循环、TS on Node |
| W19 | U38 | 38-Nodejs文件系统Buffer与Stream.md | fs/path、Buffer、流、背压 |
| W20 | U39 | 39-Node-HTTP服务与Web框架入门.md | http 模块、框架演进、分层架构 |
| W20 | U40 | 40-Express中间件与RESTful-API设计.md | 中间件链、错误中间件、REST、幂等、统一响应 |

### 数据库与 ORM（W21-W22，U41-U44）

| 周 | 单元 | 文件名 | 核心范围 |
|---|---|---|---|
| W21 | U41 | 41-关系型数据库与SQL基础.md | 关系模型、DDL/DML、join、聚合、范式 |
| W21 | U42 | 42-PostgreSQL索引事务与查询计划.md | 索引、ACID、隔离级别、锁、EXPLAIN |
| W22 | U43 | 43-Prisma-ORM与数据建模.md | schema、模型关系、CRUD、类型安全 |
| W22 | U44 | 44-数据库迁移关系映射与查询优化.md | migrate、级联、N+1、事务、分页 |

### 认证授权与安全（W23-W24，U45-U48）

| 周 | 单元 | 文件名 | 核心范围 |
|---|---|---|---|
| W23 | U45 | 45-认证密码哈希JWT与Session.md | 哈希加盐、bcrypt/argon2、JWT/刷新、Session |
| W23 | U46 | 46-授权与RBAC权限模型.md | 角色权限、资源归属、组织隔离、越权防护 |
| W24 | U47 | 47-输入校验错误处理与全局异常.md | DTO 校验、错误模型、统一响应、422 |
| W24 | U48 | 48-API安全Helmet限流与依赖治理.md | 安全头、CORS、限流、注入防护、依赖审计 |

### 后端测试、运维与缓存队列（W25-W26，U49-U52）

| 周 | 单元 | 文件名 | 核心范围 |
|---|---|---|---|
| W25 | U49 | 49-后端单元测试与集成测试.md | Jest/Vitest、Mock、service 测试、supertest |
| W25 | U50 | 50-API-E2E测试与测试数据库.md | 测试库隔离、契约测试、flaky 治理 |
| W26 | U51 | 51-日志配置管理与环境隔离.md | 结构化日志、配置分层、12-factor、多环境 |
| W26 | U52 | 52-Redis缓存与异步任务队列.md | 缓存策略与一致性、穿透/击穿/雪崩、BullMQ |

## 阶段五：全栈集成与交付（04-fullstack-projects，W27-W30，8 单元）

| 周 | 单元 | 文件名 | 核心范围 |
|---|---|---|---|
| W27 | U53 | 53-API契约OpenAPI与接口协作.md | OpenAPI、契约优先、错误契约、版本化 |
| W27 | U54 | 54-前后端联调Mock与类型同步.md | 联调、凭证、MSW、类型生成 |
| W28 | U55 | 55-Docker容器化与Compose编排.md | Dockerfile、多阶段构建、多服务 Compose |
| W28 | U56 | 56-CICD流水线与自动化部署.md | Actions、质量阶段、镜像、自动部署 |
| W29 | U57 | 57-云服务器部署Nginx与HTTPS.md | 云主机、进程守护、Nginx、TLS |
| W29 | U58 | 58-可观测性监控日志与错误追踪.md | 指标、日志、错误追踪、健康检查、告警 |
| W30 | U59 | 59-全栈结业项目架构与实现.md | 工单系统需求、架构、模块边界、DoD |
| W30 | U60 | 60-全栈结业项目部署答辩与能力验收.md | 上线、演示、答辩、能力矩阵、最终清单 |

## 阶段里程碑

- **W4**：命令行与网络证据排查、HTTP/HTTPS 报文、类型正确的 JS/TS。
- **W14**：React 与 Vue 双框架交付能力，工单系统前端原型、测试与门禁。
- **W18**：完整工程化能力：Vite/构建/规范/多环境/Monorepo/包发布/前端 CI。
- **W26**：带数据库、认证授权、安全、测试、日志与队列的后端 API。
- **W30**：全栈系统契约一致、容器化、自动部署、HTTPS 可访问、可观测，答辩通过。
