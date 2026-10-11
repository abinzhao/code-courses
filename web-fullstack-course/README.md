# 从第一张网页到独立交付：全栈工程师成长手册

> 面向零前端基础 · React 与 Vue 双主线 · Node.js 后端 · AI Agent · 小程序 · 浏览器扩展<br>
> Web 技术资料快照：**2026 年 10 月 11 日**；进阶卷核验日期见各卷运行记录。

全书按“起步 → Web 基础 → 编程语言 → 双框架 → 工程化 → 后端 → 全栈交付 → 进阶开发”组织。目录只负责导航，具体文件数量、覆盖矩阵规模和验证结果统一见[交付与验证说明](VALIDATION.md)，不在多个入口重复维护。

第一次写网页时，你只需要让一句“你好，邻居”出现在浏览器里。到最后，你要能在明确容量目标下安全地发布物品、预约交易，而且在服务器出故障时找到原因、恢复服务。这两件事之间的距离，就是本书的学习路线。

本书以 **邻里集市** 为持续演进的项目：一个社区闲置物品与活动平台。你先搭一个静态摊位，再给它加入搜索和收藏，用 React 和 Vue 各做一套等价界面，最后连接真实的业务后端、数据库与部署系统。项目不接入真实支付，价格统一用整数分存储。

## 先选起点

| 你的情况 | 从这里开始 |
|---|---|
| 不知道代码文件怎么运行 | [第一课：文件、路径与编辑器](00-guide/03-computer-first-page/01-files-paths-editors.md) |
| 能打开 HTML，但不懂标签和样式 | [HTML 完整教程](01-html/README.md) → [CSS 完整教程](02-css/README.md) |
| 会静态页面，但不会编程 | [JavaScript 与 TypeScript](04-javascript-typescript/README.md) |
| 已掌握 JavaScript，准备学框架 | [React](05-react/README.md) 与 [Vue](06-vue/README.md) |
| 会做页面，但不会独立交付 | [工程化](07-engineering/README.md) → [后端](08-backend/README.md) → [全栈交付](09-fullstack/README.md) |
| 已能独立交付 Web，准备开发 AI 工具 | [本地优先 AI Agent](10-ai-agent/README.md) |
| 准备将业务搬到手机小程序 | [小程序开发](11-mini-program/README.md) |
| 准备开发网页采集与浏览辅助工具 | [浏览器扩展开发](12-browser-extension/README.md) |

零基础读者按顺序走。已有经验的人可以先做阶段验收；能够独立完成后，再跳过对应章节。

## 全书地图

| 卷 | 学习内容 | 你会做出的东西 | 审计入口 |
|---|---|---|---|
| [00 学习与开发起步](00-guide/README.md) | 计算机、文件、终端、Git、学习方法、版本基线 | 第一个能访问的本地网站 | [全书覆盖地图](00-guide/coverage-map.md) |
| [01 HTML：让内容有意义](01-html/README.md) | 文档、全部现行元素类别、属性、表单、媒体、原生交互、无障碍 | 语义正确的商品详情与发布页 | [HTML 覆盖矩阵](01-html/HTML-COVERAGE.md) |
| [02 CSS：让页面有秩序](02-css/README.md) | 选择器、层叠、属性体系、布局、响应式、字体、动画、现代 CSS | 手机与桌面都好用的集市界面 | [CSS 覆盖矩阵](02-css/CSS-COVERAGE.md) |
| [03 浏览器与 Web 平台](03-browser/README.md) | HTTP、渲染、事件循环、存储、网络安全、Web API、性能诊断 | 会解释、会排查的网页 | [浏览器覆盖矩阵](03-browser/BROWSER-COVERAGE.md) |
| [04 JavaScript 与 TypeScript](04-javascript-typescript/README.md) | 编程基础、对象、函数、模块、DOM、异步、类型、算法与测试 | 能搜索、排序、收藏的原生应用 | [JS/TS 覆盖矩阵](04-javascript-typescript/JS-TS-COVERAGE.md) |
| [05 React 应用开发](05-react/README.md) | JSX、组件、Hooks、状态、路由、数据、测试、性能、SSR | React 版邻里集市 | [React 覆盖矩阵](05-react/REACT-COVERAGE.md) |
| [06 Vue 应用开发](06-vue/README.md) | SFC、响应式、组合式 API、路由、Pinia、测试、性能、SSR | Vue 版邻里集市 | [Vue 覆盖矩阵](06-vue/VUE-COVERAGE.md) |
| [07 现代前端工程化](07-engineering/README.md) | pnpm、Vite、ESM、质量门禁、构建、工作区、测试、CI | 可维护、可重复构建的双前端工作区 | [工程化覆盖矩阵](07-engineering/ENGINEERING-COVERAGE.md) |
| [08 Node.js 业务后端](08-backend/README.md) | NestJS、SQL、PostgreSQL、事务、会话、权限、缓存、队列、接口测试 | 能防越权与并发错误的真实 API | [后端覆盖矩阵](08-backend/BACKEND-COVERAGE.md) |
| [09 全栈集成与交付](09-fullstack/README.md) | 契约、Docker、Nginx、HTTPS、发布、回滚、监控、备份、结业 | 可以部署、诊断和持续维护的系统 | [全栈覆盖矩阵](09-fullstack/FULLSTACK-COVERAGE.md) |
| [10 本地优先 AI Agent](10-ai-agent/README.md) | 本地模型、结构化输出、状态图、工具、MCP、记忆、检索、审批、评测、恢复 | 私有资料与任务 Agent | [Agent 覆盖矩阵](10-ai-agent/AGENT-COVERAGE.md) |
| [11 小程序开发](11-mini-program/README.md) | Taro、生命周期、组件、路由、登录、网络、草稿、权限、图片、多平台、提审 | 邻里集市小程序 | [小程序覆盖矩阵](11-mini-program/MINI-PROGRAM-COVERAGE.md) |
| [12 浏览器扩展开发](12-browser-extension/README.md) | MV3、后台、内容脚本、消息、存储、权限、CSP、WXT、多浏览器、打包 | 邻里集市浏览助手 | [扩展覆盖矩阵](12-browser-extension/EXTENSION-COVERAGE.md) |

常用入口：[50 周学习路线与进阶安排](00-guide/learning-path.md) · [版本与兼容说明](00-guide/version-baseline.md) · [项目契约与阶段作业](00-guide/project-contract.md) · [知识覆盖与验收地图](00-guide/coverage-map.md) · [教材结构](00-guide/course-structure.md) · [交付与验证说明](VALIDATION.md)

## 进阶开发怎样接续

三套进阶教程使用 Web 主线已经建立的 TypeScript、运行时校验、异步取消、权限、幂等、测试
与交付能力。Web 50 周保持独立；Agent 建议另排 16 周、小程序 12 周、扩展 10 周，每周
18–22 小时。可依据目标选一卷先走，完整学习三卷时累计增加 38 周，硬件实验与真实平台
验收还需弹性时间。

Agent 默认在本机处理用户选择的资料，模型输出和工具调用都经过校验与授权；写操作先预览
再审批。小程序共享领域契约，分别核对微信、抖音和支付宝的平台行为。扩展先手写原生 MV3，
再用 WXT 组织入口，按浏览器逐项复核权限、后台恢复与安装行为。

每卷都从机制实验走到完整结业项目。确定性 fixture、模拟 API、编译和 Node 测试的证明范围
各不相同；真实模型质量、小程序真机、其他浏览器、商店审核和发布均需要对应运行证据。

## 怎样使用每一课

每课都包含目标、必要前置、情景与解释、代码、错误实验、练习、参考答案和验收。代码是教学的一部分：先预测运行结果，再运行，再改一个条件观察结果。只复制一遍，记忆通常很快消失。

推荐一次学习这样安排：

1. **理解 30 分钟**：读情景与理论，在纸上画出数据流。
2. **复现 45 分钟**：亲手输入示例，确认页面或终端输出。
3. **破坏 15 分钟**：删掉一个属性、改变一个输入、模拟一次失败。
4. **实现 60 分钟**：不看答案完成练习。
5. **复盘 15 分钟**：写下现象、原因、验证方法，而不是抄定义。

表格中的参考属性用于查阅，不要求背诵所有名称。核心概念必须通过实验掌握：例如 `min-width: 0` 解决什么问题、为什么前端隐藏按钮不能代替后端权限判断。

## “中级”怎样判定

读完文档并不自动获得中级能力。本书把目标定义为：在明确业务范围内，能独立拆需求、建模、实现、测试、部署，能说明关键取舍，并能根据证据修复问题。

你需要交付两套前端、一个真实后端、一份迁移与恢复记录、一套自动化测试，以及一次从故障到恢复的演示。最终依据[结业项目与证据](09-fullstack/06-graduation-project/01-capstone-scope-business-evidence.md)评估，而不是按读完的页数计分。

## 关于“完整”与“最新”

HTML 与 CSS 是持续发展的平台。本书系统教授现行元素类别、常用和进阶属性、动画与兼容策略，并提供索引；不会把过时标签或实验中的机制作为默认生产方案。每个新特性都应同时看语义、支持范围和降级。

Web 版本快照覆盖 **2026-10-11 已能核验的资料**，进阶卷另记录核验日期，不代表 10 月余下日期的发布信息。安装时 `latest` 会变化：先核对[版本基线](00-guide/version-baseline.md)，再固定依赖和锁文件。教程中的局部示例不等于已经经过完整生产认证的应用，章节会说明运行条件与验证范围。

教材验证情况见[交付与验证说明](VALIDATION.md)，包括实际运行结果和仍需在目标设备、真实后端与部署环境复核的范围。
