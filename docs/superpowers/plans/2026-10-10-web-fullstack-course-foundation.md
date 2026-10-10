# Web 全栈课程骨架与第一周 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可持续扩展的 NoteFlow 全栈课程目录，并交付 W1 两个可运行、可验收的完整教程单元。

**Architecture:** 课程导航、阶段索引、单元模板和质量脚本放在 `web-fullstack-course/` 内；教程正文按阶段/周/单元拆分，实验代码放在同级 `labs/` 目录。U01 使用静态 HTML 与 Node.js 原生静态服务器观察浏览器请求，U02 使用 Node.js 环境检查脚本和 Git 工作流建立可复现学习仓库。

**Tech Stack:** Markdown, Node.js 24 LTS, Node.js built-in `http`/`fs`/`process`, Git, pnpm, browser DevTools.

---

## 文件职责总览

课程文件全部位于：

```text
web-fullstack-course/
├── README.md
├── 00-course-map/
│   ├── 01-learning-path.md
│   ├── 02-noteflow-evolution.md
│   ├── 03-assessment.md
│   └── 04-version-baseline.md
├── 00-common/
│   ├── README.md
│   └── W01-web-foundations/
│       ├── 01-web-app-browser-server.md
│       └── 02-terminal-filesystem-git.md
├── 01-css/README.md
├── 02-browser-javascript/README.md
├── 03-typescript-tooling/README.md
├── 04-react/README.md
├── 05-vue/README.md
├── 06-frontend-engineering/README.md
├── 07-backend/README.md
├── 08-fullstack-delivery/README.md
├── labs/W01/U01-web-runtime/
│   ├── index.html
│   ├── article.html
│   ├── styles.css
│   ├── server.mjs
│   └── README.md
├── labs/W01/U02-dev-environment/
│   ├── check-env.mjs
│   ├── README.md
│   └── noteflow-workspace/
│       ├── README.md
│       └── .gitkeep
├── templates/unit-template.md
└── scripts/check-course-links.js
```

根目录已有的蓝图、路线图、NoteFlow 规格、版本清单和评分标准保持不改，只在课程入口中建立链接。

### Task 1: 建立课程入口和阶段导航

**Files:**
- Create: `web-fullstack-course/README.md`
- Create: `web-fullstack-course/00-course-map/01-learning-path.md`
- Create: `web-fullstack-course/00-course-map/02-noteflow-evolution.md`
- Create: `web-fullstack-course/00-course-map/03-assessment.md`
- Create: `web-fullstack-course/00-course-map/04-version-baseline.md`
- Create: `web-fullstack-course/00-common/README.md`
- Create: `web-fullstack-course/01-css/README.md`
- Create: `web-fullstack-course/02-browser-javascript/README.md`
- Create: `web-fullstack-course/03-typescript-tooling/README.md`
- Create: `web-fullstack-course/04-react/README.md`
- Create: `web-fullstack-course/05-vue/README.md`
- Create: `web-fullstack-course/06-frontend-engineering/README.md`
- Create: `web-fullstack-course/07-backend/README.md`
- Create: `web-fullstack-course/08-fullstack-delivery/README.md`

- [ ] **Step 1: 创建阶段目录和索引文件**

每个阶段 README 必须包含：阶段目标、对应周次、能力成果、当前已完成单元、下一步入口。未完成阶段只列出来自路线图的主题，不创建正文占位文件。

- [ ] **Step 2: 编写课程入口**

`web-fullstack-course/README.md` 必须包含：课程定位、NoteFlow 主线、48 周阶段表、学习循环、文档导航、W1 快速开始和扩展规则。W1 快速开始依次链接 U01、U02 和 W1 验收。

- [ ] **Step 3: 写入课程地图**

`01-learning-path.md` 复用根目录路线图的 9 个阶段和 48 周里程碑；`02-noteflow-evolution.md` 按公共内容侧、团队协作侧、后端与交付侧描述产品复杂度递进；`03-assessment.md` 链接并提炼根目录评分标准；`04-version-baseline.md` 链接当前版本清单并说明实验只依赖 Node.js、Git、pnpm 和浏览器。

- [ ] **Step 4: 验证导航目标均已创建**

运行：

```bash
find web-fullstack-course -type f | sort
```

Expected: 入口、4 个课程地图文件、9 个阶段 README 和 W1 文件目录全部存在。

### Task 2: 建立可复用单元模板

**Files:**
- Create: `web-fullstack-course/templates/unit-template.md`

- [ ] **Step 1: 写入 13 个固定章节**

模板按以下顺序提供可复制的标题：任务背景、学习目标、预备知识、核心理论、标签/属性/API/配置清单、最小可运行案例、NoteFlow 集成案例、常见错误与排查路径、课后题、实践练习、阶段验收、常见问题、扩展阅读。

- [ ] **Step 2: 写入统一学习节奏**

模板在正文前包含任务卡和成果清单，在理论中包含“先看结果”和“拆开看”，在结尾包含“我现在能做到什么”。模板示例使用中性示例，不伪造未提供的业务结果。

- [ ] **Step 3: 写入代码示例契约**

模板要求每段代码标注文件路径、运行命令、预期结果和失败诊断；验收部分要求提交运行证据、解释记录和 Git 记录。

### Task 3: 建立课程质量校验脚本

**Files:**
- Create: `web-fullstack-course/scripts/check-course-links.js`

- [ ] **Step 1: 实现 Markdown 链接检查**

脚本递归扫描 `web-fullstack-course/` 下的 `.md` 文件，提取相对链接，忽略 `http://`、`https://`、锚点和代码块中的链接，按 Markdown 文件所在目录解析目标，并对不存在目标输出文件和行号。

- [ ] **Step 2: 实现单元章节检查**

脚本把 `00-common/W01-web-foundations/` 下的两个正文视为已完成单元，检查 13 个必需章节标题全部出现；阶段 README 和课程地图不参与单元章节检查。

- [ ] **Step 3: 实现失败退出和成功摘要**

发现断链或缺少章节时以非零状态退出，并列出每条错误；全部通过时输出扫描 Markdown 文件数、链接数和已检查单元数。

- [ ] **Step 4: 运行脚本验证初始导航**

运行：

```bash
node web-fullstack-course/scripts/check-course-links.js
```

Expected: 在教程正文创建前，脚本至少能扫描导航、模板和已有 W1 文件；不存在断链或章节缺失。

### Task 4: 实现 U01 Web 运行时实验

**Files:**
- Create: `web-fullstack-course/labs/W01/U01-web-runtime/index.html`
- Create: `web-fullstack-course/labs/W01/U01-web-runtime/article.html`
- Create: `web-fullstack-course/labs/W01/U01-web-runtime/styles.css`
- Create: `web-fullstack-course/labs/W01/U01-web-runtime/server.mjs`
- Create: `web-fullstack-course/labs/W01/U01-web-runtime/README.md`

- [ ] **Step 1: 创建最小公共首页**

`index.html` 使用有效 HTML 文档结构，页面标题为 `NoteFlow | W1 Web Runtime Lab`，显示 NoteFlow 名称、任务标题、一个指向 `article.html` 的链接，并加载 `styles.css`。

- [ ] **Step 2: 创建文章响应页**

`article.html` 显示一篇静态文章的标题、作者、发布日期和返回首页链接，使用与首页相同的样式文件，确保能观察第二次文档请求和 CSS 请求。

- [ ] **Step 3: 创建原生静态服务器**

`server.mjs` 使用 `node:http`、`node:fs/promises`、`node:path` 和 `node:url`：

```js
const port = Number(process.env.PORT || 4173);
const root = new URL('.', import.meta.url);
const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
]);
```

服务器只允许解析实验目录内的文件；目录请求默认返回 `index.html`；未知文件返回 404；目录外路径拒绝访问并返回 403；请求日志包含方法、路径和状态码。启动后输出 `http://localhost:${port}`。

- [ ] **Step 4: 编写实验 README**

README 必须写明启动命令、访问地址、Network 面板观察点、预期状态码、停止服务器方式和常见错误。启动命令为：

```bash
node server.mjs
```

- [ ] **Step 5: 运行 U01 语法检查和 HTTP 验证**

运行：

```bash
node --check web-fullstack-course/labs/W01/U01-web-runtime/server.mjs
node web-fullstack-course/labs/W01/U01-web-runtime/server.mjs
curl -i http://localhost:4173/
curl -i http://localhost:4173/article.html
curl -i http://localhost:4173/missing.html
```

Expected: 首页和文章页返回 200，缺失文件返回 404，响应类型正确；验证结束后停止服务器。

### Task 5: 编写 U01 完整教程

**Files:**
- Create: `web-fullstack-course/00-common/W01-web-foundations/01-web-app-browser-server.md`

- [ ] **Step 1: 写入任务背景、目标和预备知识**

内容把学习者放入 NoteFlow 公共内容首页排查任务，目标必须覆盖 URL、浏览器、服务器、HTTP 请求/响应、状态码、静态资源和 Network 面板证据。

- [ ] **Step 2: 写入 Web 运行过程**

用一条请求链解释地址解析、连接、请求、响应、文档解析和资源加载；明确哪些步骤由浏览器负责、哪些由服务器负责；为 DNS、TCP/TLS 和 HTTP 标注本单元只建立运行直觉，细节在后续网络单元展开。

- [ ] **Step 3: 写入清单、最小案例和 NoteFlow 集成**

清单覆盖 URL 组成、HTTP 方法、常见状态码、响应头、MIME 类型和浏览器 Network 面板关键字段。最小案例链接 U01 实验并逐步解释 `index.html`、`article.html`、`styles.css` 和 `server.mjs`。

- [ ] **Step 4: 写入错误排查、练习和验收**

至少覆盖端口占用、404、CSS 未加载、访问 `file://` 与访问 `http://localhost` 的差异；每个错误都给出现象、证据、原因和修复动作。练习要求学习者添加一个静态页面并在 Network 面板完成记录。

- [ ] **Step 5: 写入 FAQ 和扩展阅读**

FAQ 回答浏览器是否等同于服务器、为什么 HTML 能打开但 CSS 失败、为什么状态码重要、静态服务器与后端 API 的边界。扩展阅读链接 MDN URL、HTTP、Network 面板和 Node.js HTTP 文档。

### Task 6: 实现 U02 开发环境实验

**Files:**
- Create: `web-fullstack-course/labs/W01/U02-dev-environment/check-env.mjs`
- Create: `web-fullstack-course/labs/W01/U02-dev-environment/README.md`
- Create: `web-fullstack-course/labs/W01/U02-dev-environment/noteflow-workspace/README.md`
- Create: `web-fullstack-course/labs/W01/U02-dev-environment/noteflow-workspace/.gitkeep`

- [ ] **Step 1: 实现环境检查脚本**

`check-env.mjs` 使用 `node:child_process` 的同步命令执行能力检查 `node --version`、`pnpm --version` 和 `git --version`，输出原始版本和是否满足 Node.js 24、pnpm 12 主版本要求。命令不存在时输出安装方向并以非零状态退出；Git 版本只检查命令可用，不锁定补丁版本。

- [ ] **Step 2: 准备可复制的 NoteFlow 工作区**

工作区 README 说明目标目录结构、初始化 Git 的命令、首个提交内容和复现方式；不提交真实配置、密钥或用户数据。

- [ ] **Step 3: 编写 U02 实验 README**

README 按“认识终端、操作文件、观察进程/端口、检查环境、初始化 Git、首次提交、制造并修复错误”的顺序组织命令。所有破坏性命令限定在实验目录内，不使用删除整个目录或强制重置历史的命令。

- [ ] **Step 4: 运行脚本验证**

运行：

```bash
node --check web-fullstack-course/labs/W01/U02-dev-environment/check-env.mjs
node web-fullstack-course/labs/W01/U02-dev-environment/check-env.mjs
```

Expected: 当前机器输出 Node.js、pnpm 和 Git 版本，并明确每项检查结果。

### Task 7: 编写 U02 完整教程

**Files:**
- Create: `web-fullstack-course/00-common/W01-web-foundations/02-terminal-filesystem-git.md`

- [ ] **Step 1: 写入任务背景、目标和预备知识**

内容把学习者放入“接手陌生 NoteFlow 仓库”的第一天，目标覆盖终端导航、文件系统、进程/端口、版本检查、Git 工作区/暂存区/提交和可复现命令。

- [ ] **Step 2: 写入终端、文件系统与进程理论**

解释当前目录、绝对/相对路径、文件与目录、标准输入/输出/错误、进程 PID 和端口；命令示例优先使用 macOS/Linux 通用命令，并为平台差异单独列出。

- [ ] **Step 3: 写入 Git 模型和最小案例**

用工作区 -> 暂存区 -> 本地仓库流程解释 `git status`、`git add`、`git commit`、`git log` 和 `git diff`；最小案例链接 U02 实验工作区，说明每条命令的可观察结果。

- [ ] **Step 4: 写入 NoteFlow 集成、错误排查、练习和验收**

集成成果为一个包含 README、目录说明和首个提交的学习仓库。至少覆盖目录错误、命令未找到、端口占用、未暂存变更、错误提交和忽略文件的排查；练习要求独立创建一条 Git 提交并提供历史证据。

- [ ] **Step 5: 写入 FAQ 和扩展阅读**

FAQ 回答终端与 Shell 的关系、Git 与 GitHub 的边界、为什么要分阶段提交、为什么不把密钥提交到仓库。扩展阅读链接 Git 官方文档、Node.js 下载/发布页面和 pnpm 文档。

### Task 8: 收口导航、验收和提交

**Files:**
- Modify: `web-fullstack-course/README.md`
- Modify: `web-fullstack-course/00-common/README.md`
- Modify: `web-fullstack-course/00-course-map/01-learning-path.md`
- Modify: `web-fullstack-course/00-course-map/02-noteflow-evolution.md`
- Modify: `web-fullstack-course/scripts/check-course-links.js`

- [ ] **Step 1: 补齐 W1 前后导航**

课程入口、公共基础阶段 README、路线图和 NoteFlow 演进地图均能相互跳转，并提供 U01 -> U02 -> W1 验收的阅读顺序。

- [ ] **Step 2: 运行自动化检查**

运行：

```bash
node web-fullstack-course/scripts/check-course-links.js
node --check web-fullstack-course/labs/W01/U01-web-runtime/server.mjs
node --check web-fullstack-course/labs/W01/U02-dev-environment/check-env.mjs
git diff --check
```

Expected: 链接、13 个章节、两份 Node.js 脚本语法和 Git 空白检查全部通过。

- [ ] **Step 3: 完成人工验收**

从 `web-fullstack-course/README.md` 进入两个单元；按 README 启动 U01，确认首页、文章页、CSS 和 404；运行 U02 环境检查；检查教程中的路径、命令和预期结果与实际文件一致。

- [ ] **Step 4: 审查最终差异并提交**

确认只包含课程骨架、W1 教程、W1 实验、模板、脚本和必要导航更新，不包含密钥、构建产物、运行日志或用户目录文件。提交：

```bash
git add web-fullstack-course
git commit -m "docs: add course skeleton and week one tutorials"
```

## Verification Checklist

- [ ] 规格中的课程骨架已创建，9 个阶段边界清晰。
- [ ] 课程入口能进入 W1 两个单元。
- [ ] 两个单元均包含 13 个固定章节。
- [ ] U01 静态页面、服务器、404 和 CSS 请求可验证。
- [ ] U02 环境检查、工作区说明和 Git 首次提交流程可复现。
- [ ] 链接、章节、Node.js 语法和 Git 空白检查通过。
- [ ] 最终差异不含无关文件、秘密、构建产物和运行日志。
