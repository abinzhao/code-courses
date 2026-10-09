<div align="center">

# 🎓 Code Courses

### Project-Driven Programming Curricula, From Zero to Shipping Real Products

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Courses](https://img.shields.io/badge/courses-2%20live%20%C2%B7%203%20planned-orange)]()
[![Made with Love](https://img.shields.io/badge/Made%20with-%E2%9D%A4-red)]()

**A continuously growing collection of systematic, project-driven programming courses.**
Every course lives in its own directory, is built around one evolving real-world project, and is measured by **runnable code, reviewable commits, and demonstrable results** — not by "I watched the tutorial."

**English** · [**简体中文**](./README.zh-CN.md)

</div>

---

## 📚 Courses

| Course | Status | Duration | Capstone Project | What You'll Learn |
|---|---|---|---|---|
| [Web Fullstack Engineer Course](./web-fullstack-course/) | 🟢 Live | 30 weeks · 60 units | Team Collaboration Ticket System | Computer & networking basics, HTML/CSS, React, Vue, modern frontend engineering, Node.js, PostgreSQL, auth, testing, and cloud deployment — graduate able to ship a complete full-stack web system |
| [WeChat Mini Program Course](./miniprogram-course/) | 🟢 Live | 16 weeks · 32 units | "Foodie Guide" Local-Life App | Native WeChat + TypeScript, the dual-thread model, CloudBase, a custom Node backend, login, maps, scanning, WeChat Pay, subscribe messages, performance, engineering and release — with a Taro/uni-app cross-platform extension |
| Cross-Platform Development | 🚧 Planned | — | — | Selecting, understanding, and shipping with Taro, uni-app, React Native, and Flutter |
| Native Development | 🚧 Planned | — | — | iOS / Android native and desktop system capabilities and engineering practices |
| Game Development | 🚧 Planned | — | — | Browser games, game engines (e.g. Godot), game loops, physics, and publishing |

> Course status is updated continuously and more tracks are on the roadmap. Suggest a track you'd love to see via [Issues](https://github.com/abinzhao/code-courses/issues).

## 🗂 Repository Structure

```text
code-courses/
├── README.md                        # You are here (English overview)
├── README.zh-CN.md                  # Chinese overview
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

## 🧭 How to Learn

**Step 1 — Pick a course.** Open its directory and read the README, syllabus, and weekly plan to understand the goals, stage path, and weekly rhythm.

**Step 2 — Move unit by unit.** Every unit follows the same six-part loop:

1. **Goals** — what you should be able to do (behavioral, observable)
2. **Tech Stack** — tools and stable-version baseline used
3. **In-depth Theory & Sample Code** — understand the mechanism, then the example
4. **Review Questions** — check conceptual understanding, with scenario questions
5. **Hands-on Exercises** — progressive coding practice
6. **Stage Assessment** — prove mastery with runnable results and a rubric

**Step 3 — Build the project.** Weave the knowledge points into a complete system around the capstone, using Git branches, code review, and stage milestones to mirror real-world team collaboration.

## 🧱 Design Principles

- **Mechanism over API** — explain the underlying principle before the framework abstraction.
- **Project-driven** — every concept lands in code; every stage produces a demoable artifact.
- **Built-in engineering & quality** — Git, lint, type checking, automated testing, and CI gates throughout.
- **Security by default** — secrets via environment variables, least privilege, input validation, rate limiting, and security headers from day one.
- **Up-to-date versions** — current LTS/stable releases, never deprecated tech as the main track.
- **Evidence-based learning** — completion is defined by test results, live demos, and acceptance criteria, not by gut feeling.

## 🤝 Contributing

Found an error, outdated content, or have an improvement? Issues and pull requests are warmly welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and the [Code of Conduct](./CODE_OF_CONDUCT.md) first, and use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:` / `fix:` / `docs:` / `test:`).

## 📄 License

Released under the [MIT License](./LICENSE). Learn, share, and build upon it — attribution is appreciated.

<div align="center">

⭐ If these courses help you, please consider giving a star — it really helps!

</div>
