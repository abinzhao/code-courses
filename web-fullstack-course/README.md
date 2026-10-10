# NoteFlow 全栈工程师课程

> 从“浏览器为什么能显示页面”开始，走到“一个团队知识库如何测试、部署和持续演进”。

## 这门课要带你走到哪里

你会以 NoteFlow 新成员的身份加入一个产品团队。第一周，你要学会观察页面是如何出现的，并建立一个可以被别人复现的学习仓库。之后，同一个产品会逐渐拥有语义化内容页、响应式视觉、原生交互、React 与 Vue 管理后台、NestJS API、PostgreSQL 数据库、认证授权、异步任务和部署流水线。

课程的目标不是记住一堆 API，而是能够把一个需求拆成：

```text
页面 -> 状态 -> 请求 -> 数据 -> 权限 -> 测试 -> 发布证据
```

## 学习方式

每个知识单元都沿着同一条路线前进：

1. **任务卡**：先知道这次要交付什么。
2. **先看结果**：运行一个最小案例，看到页面、终端输出或 DevTools 证据。
3. **拆开看**：解释浏览器、语言、框架或基础设施背后的机制。
4. **故意出错**：制造一个可控故障，用证据而不是猜测定位问题。
5. **接入 NoteFlow**：把知识放回连续项目。
6. **阶段验收**：提交代码、运行证据、设计说明和测试结果。

建议每周投入 20–25 小时：

| 活动 | 建议投入 | 你要留下的证据 |
| --- | ---: | --- |
| 理论与阅读 | 4–6 小时 | 关键术语卡片、流程图或解释记录 |
| 跟做实验 | 6–8 小时 | 可运行代码、命令输出、截图或录屏 |
| NoteFlow 集成 | 5–7 小时 | 项目变更、Git 提交和验收记录 |
| 练习与复盘 | 3–4 小时 | 错误复现、排查记录和改进计划 |

## 课程地图

| 阶段 | 周次 | 主题 | 阶段成果 |
| --- | --- | --- | --- |
| 01 | W1–W4 | Web、HTML、语义化与可访问性 | 可访问的内容页和表单 |
| 02 | W5–W12 | CSS 全体系、响应式、现代 CSS 与动画 | 多端适配的 NoteFlow 视觉层 |
| 03 | W13–W16 | 浏览器原理、DOM 与 Web API | 不依赖框架的原生交互应用 |
| 04 | W17–W20 | JavaScript、TypeScript 与构建工具 | 类型安全的前端项目 |
| 05 | W21–W26 | React 完整课程 | React 团队管理后台 |
| 06 | W27–W32 | Vue 3 完整课程 | Vue 团队管理后台 |
| 07 | W33–W37 | 现代前端工程化 | Monorepo、质量门禁和 CI |
| 08 | W38–W43 | Node.js、NestJS、PostgreSQL、Prisma | 认证、组织隔离和 RBAC API |
| 09 | W44–W48 | 全栈集成、测试、部署与毕业项目 | NoteFlow 1.0 上线与答辩 |

详细路线见[学习路径](./00-course-map/01-learning-path.md)。

## NoteFlow 主线

NoteFlow 是一个面向小型团队的知识库和内容发布平台：

- **公共内容侧**：文章、标签、分类、搜索、评论、SEO 和 SSR。
- **团队协作侧**：组织、工作区、成员、角色、文档、审核和操作日志。
- **平台工程侧**：认证、权限、文件、缓存、队列、测试、部署和可观测性。

产品会按能力逐步长大，而不是每周换一个毫不相关的练习。查看[NoteFlow 演进地图](./00-course-map/02-noteflow-evolution.md)。

## W1 快速开始

第一周只需要浏览器、终端、Node.js 和 Git。pnpm 从 W1 开始做环境检查，但不会阻塞 U01 的浏览器实验。

1. 阅读[U01：Web 应用、浏览器和服务器是什么](./00-common/W01-web-foundations/01-web-app-browser-server.md)。
2. 运行[U01 Web 运行时实验](./labs/W01/U01-web-runtime/README.md)。
3. 阅读[U02：终端、文件系统、Git 与开发环境](./00-common/W01-web-foundations/02-terminal-filesystem-git.md)。
4. 运行[U02 开发环境实验](./labs/W01/U02-dev-environment/README.md)。
5. 按[第一周验收清单](./00-common/README.md#w1-阶段验收)提交证据。

## 文档导航

### 课程地图

- [学习路径与 48 周里程碑](./00-course-map/01-learning-path.md)
- [NoteFlow 演进地图](./00-course-map/02-noteflow-evolution.md)
- [考核与毕业标准](./00-course-map/03-assessment.md)
- [版本基线与发布前核验](./00-course-map/04-version-baseline.md)

### 设计资料

- [课程蓝图](../00-course-blueprint.md)
- [48 周详细路线图](../01-48-week-roadmap.md)
- [NoteFlow 项目规格](../02-noteflow-project-spec.md)
- [技术版本基线](../03-technology-version-manifest.md)
- [考核与毕业标准原文](../04-assessment-rubric.md)

### 已完成阶段

- [00 Web 与 HTML 基础](./00-common/README.md)
- [01 CSS 全体系](./01-css/README.md)
- [02 浏览器、DOM 与 JavaScript](./02-browser-javascript/README.md)
- [03 TypeScript 与工具基础](./03-typescript-tooling/README.md)
- [04 React](./04-react/README.md)
- [05 Vue 3](./05-vue/README.md)
- [06 前端工程化](./06-frontend-engineering/README.md)
- [07 后端与数据库](./07-backend/README.md)
- [08 全栈交付](./08-fullstack-delivery/README.md)

阶段目录会随着正文完成状态更新。没有正文的阶段只展示学习边界和计划，不代表该阶段已经完成。

## 每个单元的固定结构

每篇教程都包含：

1. 任务背景
2. 学习目标
3. 预备知识
4. 核心理论
5. 标签、属性、API 或配置清单
6. 最小可运行案例
7. NoteFlow 集成案例
8. 常见错误与排查路径
9. 课后题
10. 实践练习
11. 阶段验收
12. 常见问题
13. 扩展阅读

正文中的代码会注明文件位置、运行命令、预期结果和失败诊断方式。单元写作规范见[单元模板](./templates/unit-template.md)。

## 新增内容的规则

新增一个单元时，按以下顺序操作：

1. 在对应阶段和周次目录建立正文文件。
2. 在 `labs/` 下建立同名实验目录。
3. 根据模板补齐 13 个固定章节。
4. 在阶段 README、学习路径和课程入口添加链接。
5. 为可运行代码写启动说明和失败诊断。
6. 运行课程校验脚本。

校验命令：

```bash
node scripts/check-course-links.js
```

## 当前版本边界

课程设计资料的版本快照日期为 2026-10-10。正式实验以锁文件和版本清单为准；第一周只要求浏览器、Node.js、Git 和 pnpm 命令可观察，暂不引入 React、Vue、数据库或容器。

## 你会留下什么

每周结束时，仓库里都应该多出一件可以演示、解释和复现的东西：

- 一次浏览器 Network 观察记录；
- 一页能访问的 NoteFlow 内容；
- 一次可复现的 Git 提交；
- 一条由证据驱动的故障排查；
- 一个通过阶段验收的项目切片。

当这些切片连接起来，NoteFlow 才会从一张草图变成一个真正可交付的系统。
