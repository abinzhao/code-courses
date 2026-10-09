<div align="center">

# 🎓 Code Courses

### Project-Driven Programming Curricula, From Zero to Shipping Real Products

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Courses](https://img.shields.io/badge/courses-2%20live%20·%203%20planned-orange)]()
[![Made with Love](https://img.shields.io/badge/Made%20with-%E2%9D%A4-red)]()

**A continuously growing collection of systematic, project-driven programming courses.**
Every course lives in its own directory, is built around one evolving real-world project, and is measured by **runnable code, reviewable commits, and demonstrable results** — not by "I watched the tutorial."

[**English**](#-english) · [**中文**](#-中文)

</div>

---

## 🚀 English

### 📚 Courses

| Course | Status | Duration | Capstone Project | What You'll Learn |
|---|---|---|---|---|
| [Web Fullstack Engineer Course](./web-fullstack-course/) | 🟢 Live | 30 weeks · 60 units | Team Collaboration Ticket System | Computer & networking basics, HTML/CSS, React, Vue, modern frontend engineering, Node.js, PostgreSQL, auth, testing, and cloud deployment — graduate able to ship a complete full-stack web system |
| [WeChat Mini Program Course](./miniprogram-course/) | 🟢 Live | 16 weeks · 32 units | "Foodie Guide" Local-Life App | Native WeChat + TypeScript, the dual-thread model, CloudBase, a custom Node backend, login, maps, scanning, WeChat Pay, subscribe messages, performance, engineering and release — with a Taro/uni-app cross-platform extension |
| Cross-Platform Development | 🚧 Planned | — | — | Selecting, understanding, and shipping with Taro, uni-app, React Native, and Flutter |
| Native Development | 🚧 Planned | — | — | iOS / Android native and desktop system capabilities and engineering practices |
| Game Development | 🚧 Planned | — | — | Browser games, game engines (e.g. Godot), game loops, physics, and publishing |

> Course status is updated continuously and more tracks are on the roadmap. Suggest a track you'd love to see via [Issues](https://github.com/abinzhao/code-courses/issues).

### 🗂 Repository Structure

```text
code-courses/
├── README.md                        # You are here: course overview
├── CONTRIBUTING.md                  # How to contribute
├── CODE_OF_CONDUCT.md               # Community guidelines
├── web-fullstack-course/            # Course 1 (30 weeks · 60 units)
│   ├── README.md                    # Course intro & 60-unit navigation
│   ├── 00-课程总纲与培养标准.md       # Goals, competency standards, grading
│   ├── 01-三十周教学计划.md           # Weekly schedule & milestones
│   ├── 00-common/                   # W1-W4   Common foundations (8 units)
│   ├── 01-frontend/                 # W5-W14  Frontend (20 units)
│   ├── 02-frontend-engineering/     # W15-W18 Frontend engineering (8 units)
│   ├── 03-backend/                  # W19-W26 Backend (16 units)
│   └── 04-fullstack-projects/       # W27-W30 Integration & delivery (8 units)
├── miniprogram-course/              # Course 2 (16 weeks · 32 units)
│   ├── README.md                    # Course intro & 32-unit navigation
│   ├── 00-foundations/              # W1-W4   Foundations (8 units)
│   ├── 01-components-cloud/         # W5-W8   Components & CloudBase (8 units)
│   ├── 02-platform-commerce/        # W9-W12  Platform & commerce (8 units)
│   ├── 03-performance-growth/       # W13-W14 Performance & growth (4 units)
│   └── 04-engineering-graduation/   # W15-W16 Engineering & graduation (4 units)
└── .github/                         # Issue & pull request templates
```

### 🧭 How to Learn

**Step 1 — Pick a course.** Open its directory and read the README, syllabus, and weekly plan to understand the goals, stage path, and weekly rhythm.

**Step 2 — Move unit by unit.** Every unit follows the same six-part loop:

1. **Goals** — what you should be able to do (behavioral, observable)
2. **Tech Stack** — tools and stable-version baseline used
3. **In-depth Theory & Sample Code** — understand the mechanism, then the example
4. **Review Questions** — check conceptual understanding, with scenario questions
5. **Hands-on Exercises** — progressive coding practice
6. **Stage Assessment** — prove mastery with runnable results and a rubric

**Step 3 — Build the project.** Weave the knowledge points into a complete system around the capstone, using Git branches, code review, and stage milestones to mirror real-world team collaboration.

### 🧱 Design Principles

- **Mechanism over API** — explain the underlying principle before the framework abstraction.
- **Project-driven** — every concept lands in code; every stage produces a demoable artifact.
- **Built-in engineering & quality** — Git, lint, type checking, automated testing, and CI gates throughout.
- **Security by default** — secrets via environment variables, least privilege, input validation, rate limiting, and security headers from day one.
- **Up-to-date versions** — current LTS/stable releases, never deprecated tech as the main track.
- **Evidence-based learning** — completion is defined by test results, live demos, and acceptance criteria, not by gut feeling.

### 🤝 Contributing

Found an error, outdated content, or have an improvement? Issues and pull requests are warmly welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md) first, and use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:` / `fix:` / `docs:` / `test:`).

### 📄 License

Released under the [MIT License](./LICENSE). Learn, share, and build upon it — attribution is appreciated.

---

## 🇨🇳 中文

### 📚 课程目录

| 课程 | 状态 | 周期 | 主线项目 | 简介 |
|---|---|---|---|---|
| [前端全栈工程师培养课程](./web-fullstack-course/) | 🟢 已上线 | 30 周 · 60 单元 | 团队协作工单系统 | 从计算机与网络基础出发，系统掌握 HTML/CSS、React、Vue、现代前端工程化、Node.js、PostgreSQL、认证授权、测试与云端部署，结业可独立交付完整 Web 全栈系统 |
| [微信小程序开发课程](./miniprogram-course/) | 🟢 已上线 | 16 周 · 32 单元 | 「逛吃指南」本地生活 | 微信原生 + TypeScript 打透双线程模型，云开发起步、自建 Node 后端收尾，覆盖登录、地图、扫码、微信支付、订阅消息、性能优化、工程化发布与上架运营，含 Taro/uni-app 跨端拓展 |
| 跨端开发课程 | 🚧 规划中 | — | — | Taro、uni-app、React Native、Flutter 等方案的选型、原理与多端交付 |
| 原生开发课程 | 🚧 规划中 | — | — | iOS / Android 原生、桌面端的系统能力与工程实践 |
| 游戏开发课程 | 🚧 规划中 | — | — | 浏览器游戏、游戏引擎（如 Godot）、游戏循环、物理与发布 |

> 课程状态持续更新，更多方向规划中。欢迎通过 [Issues](https://github.com/abinzhao/code-courses/issues) 提出你想学的方向。

### 🗂 仓库结构

```text
code-courses/
├── README.md                        # 本文件：课程集总览
├── CONTRIBUTING.md                  # 贡献指南
├── CODE_OF_CONDUCT.md               # 社区行为准则
├── web-fullstack-course/            # 课程一（30 周 · 60 单元）
│   ├── README.md                    # 课程说明与 60 单元导航
│   ├── 00-课程总纲与培养标准.md       # 培养目标、能力标准、评分规范
│   ├── 01-三十周教学计划.md           # 逐周安排与里程碑
│   ├── 00-common/                   # W1-W4   公共基础（8 单元）
│   ├── 01-frontend/                 # W5-W14  前端（20 单元）
│   ├── 02-frontend-engineering/     # W15-W18 前端工程化（8 单元）
│   ├── 03-backend/                  # W19-W26 后端（16 单元）
│   └── 04-fullstack-projects/       # W27-W30 集成与交付（8 单元）
├── miniprogram-course/              # 课程二（16 周 · 32 单元）
│   ├── README.md                    # 课程说明与 32 单元导航
│   ├── 00-foundations/              # W1-W4   入门基础（8 单元）
│   ├── 01-components-cloud/         # W5-W8   组件与云开发（8 单元）
│   ├── 02-platform-commerce/        # W9-W12  平台与商业化（8 单元）
│   ├── 03-performance-growth/       # W13-W14 性能与增长（4 单元）
│   └── 04-engineering-graduation/   # W15-W16 工程化与结业（4 单元）
└── .github/                         # Issue 与 Pull Request 模板
```

### 🧭 如何学习

**第一步 · 选课程。** 进入对应目录，先读 README、课程总纲与教学计划，了解培养目标、阶段路径与每周节奏。

**第二步 · 按单元推进。** 每个单元采用统一的六段闭环结构：

1. **目标** —— 学完应能做出什么（行为化、可观察）
2. **技术栈** —— 本单元用到的工具与稳定版基线
3. **详细理论与示例代码** —— 先理解机制，再看示例
4. **课后题** —— 检验概念理解，含场景分析题
5. **实践练习题** —— 递进式编码训练
6. **阶段验收作业** —— 用可运行成果和评分表证明真正掌握

**第三步 · 做项目。** 围绕主线项目把知识点串成完整系统，以 Git 分支、提交评审、阶段里程碑推进，模拟真实企业协作。

### 🧱 设计原则

- **机制优先于 API**：先讲清底层原理，再使用框架封装。
- **项目驱动**：每个知识点都有代码落地，每个阶段都有可演示作品。
- **工程化与质量内建**：Git、Lint、类型检查、自动化测试、CI 门禁贯穿全程。
- **安全默认内置**：密钥只走环境变量，最小权限、输入校验、限流与安全头从第一个项目开始。
- **版本与时俱进**：统一使用当前 LTS / 稳定版本，不以被放弃的旧技术为主线。
- **证据化学习**：完成由测试结果、运行演示与验收标准定义，而非自我感觉。

### 🤝 参与贡献

发现内容错误、过时或有改进建议，欢迎提交 Issue 或 Pull Request。请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 与[行为准则](./CODE_OF_CONDUCT.md)，提交信息遵循[约定式格式](https://www.conventionalcommits.org/zh-hans/)（`feat:` / `fix:` / `docs:` / `test:`）。

### 📄 开源协议

基于 [MIT License](./LICENSE) 开源，欢迎学习、转发与在此基础上改进，转载请注明出处。

<div align="center">

⭐ If these courses help you, please consider giving a star — it really helps!

⭐ 如果这些课程对你有帮助，欢迎点个 Star，这是对我们最大的鼓励！

</div>
