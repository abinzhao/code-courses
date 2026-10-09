<div align="center">

# 🎓 Code Courses

### 项目驱动的编程实战课程，从零基础到独立交付真实产品

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Courses](https://img.shields.io/badge/courses-2%20live%20%C2%B7%203%20planned-orange)]()
[![Made with Love](https://img.shields.io/badge/Made%20with-%E2%9D%A4-red)]()

**一套持续更新的系统化、项目驱动编程课程集合。**
每门课程位于独立目录，围绕一个持续演进的真实项目展开，以**可运行代码、可评审提交、可演示成果**为衡量标准——“看过教程”不等于“学会”。

[**English**](./README.md) · **简体中文**

</div>

---

## 📚 课程目录

| 课程 | 状态 | 周期 | 主线项目 | 简介 |
|---|---|---|---|---|
| [前端全栈工程师培养课程](./web-fullstack-course/) | 🟢 已上线 | 30 周 · 60 单元 | 团队协作工单系统 | 从计算机与网络基础出发，系统掌握 HTML/CSS、React、Vue、现代前端工程化、Node.js、PostgreSQL、认证授权、测试与云端部署，结业可独立交付完整 Web 全栈系统 |
| [微信小程序开发课程](./miniprogram-course/) | 🟢 已上线 | 16 周 · 32 单元 | 「逛吃指南」本地生活 | 微信原生 + TypeScript 打透双线程模型，云开发起步、自建 Node 后端收尾，覆盖登录、地图、扫码、微信支付、订阅消息、性能优化、工程化发布与上架运营，含 Taro/uni-app 跨端拓展 |
| 跨端开发课程 | 🚧 规划中 | — | — | Taro、uni-app、React Native、Flutter 等方案的选型、原理与多端交付 |
| 原生开发课程 | 🚧 规划中 | — | — | iOS / Android 原生、桌面端的系统能力与工程实践 |
| 游戏开发课程 | 🚧 规划中 | — | — | 浏览器游戏、游戏引擎（如 Godot）、游戏循环、物理与发布 |

> 课程状态持续更新，更多方向规划中。欢迎通过 [Issues](https://github.com/abinzhao/code-courses/issues) 提出你想学的方向。

## 🗂 仓库结构

```text
code-courses/
├── README.md                        # 英文总览（默认）
├── README.zh-CN.md                  # 本文件：中文总览
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

## 🧭 如何学习

**第一步 · 选课程。** 进入对应目录，先读 README、课程总纲与教学计划，了解培养目标、阶段路径与每周节奏。

**第二步 · 按单元推进。** 每个单元采用统一的六段闭环结构：

1. **目标** —— 学完应能做出什么（行为化、可观察）
2. **技术栈** —— 本单元用到的工具与稳定版基线
3. **详细理论与示例代码** —— 先理解机制，再看示例
4. **课后题** —— 检验概念理解，含场景分析题
5. **实践练习题** —— 递进式编码训练
6. **阶段验收作业** —— 用可运行成果和评分表证明真正掌握

**第三步 · 做项目。** 围绕主线项目把知识点串成完整系统，以 Git 分支、提交评审、阶段里程碑推进，模拟真实企业协作。

## 🧱 设计原则

- **机制优先于 API**：先讲清底层原理，再使用框架封装。
- **项目驱动**：每个知识点都有代码落地，每个阶段都有可演示作品。
- **工程化与质量内建**：Git、Lint、类型检查、自动化测试、CI 门禁贯穿全程。
- **安全默认内置**：密钥只走环境变量，最小权限、输入校验、限流与安全头从第一个项目开始。
- **版本与时俱进**：统一使用当前 LTS / 稳定版本，不以被放弃的旧技术为主线。
- **证据化学习**：完成由测试结果、运行演示与验收标准定义，而非自我感觉。

## 🤝 参与贡献

发现内容错误、过时或有改进建议，欢迎提交 Issue 或 Pull Request。请先阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 与[行为准则](./CODE_OF_CONDUCT.md)，提交信息遵循[约定式格式](https://www.conventionalcommits.org/zh-hans/)（`feat:` / `fix:` / `docs:` / `test:`）。

## 📄 开源协议

基于 [MIT License](./LICENSE) 开源，欢迎学习、转发与在此基础上改进，转载请注明出处。

<div align="center">

⭐ 如果这些课程对你有帮助，欢迎点个 Star，这是对我们最大的鼓励！

</div>
