# U02：终端、文件系统、Git 与开发环境

> 所属阶段：Web 与 HTML 基础
> 所属周次：W1
> 建议学习时间：10–12 小时
> 主线成果：建立一个可复现的 NoteFlow 学习工作区，并留下第一条可靠的 Git 提交

## 任务卡

U01 让你看见了浏览器和服务器之间的请求。现在你要接手一个陌生的 NoteFlow 学习仓库。

你收到的交接信息只有一句话：

> “代码在项目目录里，环境可能有问题，先不要改业务，确认你能找到文件、启动命令和历史记录。”

这次任务的重点不是输入更多命令，而是掌握每条命令的作用范围：

- 你当前在哪个目录？
- 这条命令会读取或修改哪个文件？
- 运行中的 Node.js 是哪个进程？
- 哪个进程占用了 4173 端口？
- 你的改动是在工作区、暂存区，还是已经进入 Git 提交？
- 版本检查失败时，究竟是版本不满足，还是命令根本不可用？

本单元会从终端和文件系统开始，最后在一个临时复制品中完成 Git 首次提交，不污染课程仓库本身。

**本单元成果**

- [ ] 能使用终端确认当前目录和目录内容
- [ ] 能区分文件、目录、进程、PID 和端口
- [ ] 能运行 Node.js、pnpm 和 Git 环境检查
- [ ] 能解释 Git 工作区、暂存区和本地仓库
- [ ] 能在临时 NoteFlow 工作区完成首次提交
- [ ] 能留下一个真实环境故障的排查记录

## 1. 任务背景

很多初学者第一次遇到项目问题时，会把终端当成“黑色的网页”，把命令当成需要背下来的咒语：

```text
输入命令 -> 等待神奇结果
```

这种方式很快会遇到三个问题：

1. 同一条命令在不同目录下可能作用完全不同。
2. 命令报错时不知道输出是现象、原因还是建议。
3. 修改了文件，却不知道改动是否被 Git 记录。

工程师使用终端，是因为它可以把动作、路径和结果说清楚。工程师使用 Git，是因为它可以把变更、时间和作者记录下来。两者配合后，你不需要依赖“我记得刚才改了什么”，而可以回到证据。

NoteFlow 后续会变成一个包含前端、后端、数据库和部署配置的项目。如果第一周没有建立目录意识、版本意识和提交意识，后面每增加一种技术，排错成本都会一起上升。

## 2. 学习目标

完成本单元后，你应能：

- 使用 `pwd`、`ls`、`cd`、`mkdir`、`cp`、`mv` 和 `find` 定位和整理文件。
- 区分绝对路径、相对路径、当前目录、父目录和隐藏文件。
- 解释标准输出、标准错误、退出状态和命令链之间的关系。
- 使用 `ps` 和 `lsof` 观察进程、PID 和端口监听。
- 判断 Node.js、pnpm 和 Git 是版本不满足，还是命令本身不可用。
- 解释 Git 工作区、暂存区、本地仓库和远程仓库的关系。
- 使用 `git status`、`git diff`、`git add`、`git commit` 和 `git log` 完成一条可追踪变更。
- 在不泄露密钥、不覆盖无关文件的前提下建立可复现的学习工作区。
- 将一次命令失败整理成“现象、证据、原因、修复、复验”。

## 3. 预备知识

开始前，建议先完成：

- [U01：Web 应用、浏览器和服务器是什么](./01-web-app-browser-server.md)
- [U01 Web 运行时实验](../../labs/W01/U01-web-runtime/README.md)

你需要：

- 能打开终端；
- 能复制文本和切换窗口；
- 能阅读英文命令和错误中的路径；
- 有一个用于练习的临时目录。

本单元的命令以 macOS/Linux 为主。Windows 学习者可以使用 WSL，或将命令映射为 PowerShell 等价写法；关键概念不依赖某一种终端界面。

## 4. 核心理论

### 先看结果

进入 U02 实验目录：

```bash
cd web-fullstack-course/labs/W01/U02-dev-environment
pwd
ls
```

运行环境检查：

```bash
node --check check-env.mjs
node check-env.mjs
```

理想状态下，你会看到：

```text
NoteFlow W1 开发环境检查
========================
PASS Node.js: v24.21.0（需要主版本 24）
PASS pnpm: 12.11.0（需要主版本 12）
PASS Git: git version 2.45.0

检查通过：Node.js、pnpm 和 Git 满足 W1 基线。
```

如果你的机器不是这个结果，也不要手工修改输出。比如：

```text
FAIL Node.js: v22.22.0（需要主版本 24）
FAIL pnpm: 命令不可用：...
PASS Git: git version 2.39.5
```

这不是“实验失败所以不能学习”，而是一份环境事实：Node.js 是可用的但版本不满足，pnpm 命令无法正常执行，Git 可以使用。你要做的是分辨问题，再决定是否修复。

### 4.1 终端、Shell 和命令

**终端**是你与命令行程序交互的窗口。**Shell**是解释并执行命令的程序，例如 zsh、bash 或 PowerShell。命令是被 Shell 找到并运行的程序或内建动作。

可以用一个简单模型理解：

```text
键盘输入 -> 终端窗口 -> Shell 解析 -> 命令程序 -> 输出/退出状态
```

当你输入：

```bash
pwd
```

Shell 找到 `pwd`，命令读取当前工作目录，然后把路径输出到标准输出。这个命令不会修改文件。

当你输入：

```bash
mkdir -p reports/week-01
```

Shell 找到 `mkdir`，命令在当前目录下创建目录。它会修改文件系统，所以执行前必须知道当前目录。

### 4.2 当前目录决定命令的作用范围

先看当前位置：

```bash
pwd
```

再看当前位置下的内容：

```bash
ls
ls -la
```

- `pwd` 展示绝对路径。
- `ls` 展示普通文件和目录。
- `ls -la` 同时展示隐藏文件、权限和更多元数据。

切换目录：

```bash
cd web-fullstack-course
cd ..
cd -
```

- `cd web-fullstack-course` 进入子目录。
- `cd ..` 返回父目录。
- `cd -` 返回上一次所在目录。

相对路径依赖当前目录：

```text
当前目录：/Users/you/web-code-docs
相对路径：web-fullstack-course/README.md
绝对路径：/Users/you/web-code-docs/web-fullstack-course/README.md
```

同一条命令在不同当前目录下可能指向不同文件。工程排错的第一条习惯就是：在运行重要命令前先看 `pwd`。

### 4.3 文件、目录和隐藏文件

文件保存内容，目录组织路径。目录本身也可以包含目录：

```text
web-fullstack-course/
├── 00-common/
│   └── W01-web-foundations/
├── labs/
│   └── W01/
└── README.md
```

常见操作：

```bash
mkdir -p labs/W01/U02
touch labs/W01/U02/notes.md
cp labs/W01/U02/notes.md /tmp/notes-copy.md
mv /tmp/notes-copy.md /tmp/notes-renamed.md
find labs/W01 -maxdepth 2 -type f
```

- `mkdir -p` 创建目录，父目录不存在时一起创建。
- `touch` 创建空文件或更新文件时间。
- `cp` 复制文件。
- `mv` 移动或重命名文件。
- `find` 按条件搜索文件。

以 `.` 开头的文件通常是隐藏配置，例如 `.gitignore`。隐藏不代表不重要，只是默认列表中不显示。`.git` 目录保存 Git 的本地数据库，不能随意编辑其中的文件。

### 4.4 标准输出、标准错误和退出状态

一个命令通常有三个重要结果：

1. 标准输出：正常结果。
2. 标准错误：诊断或错误信息。
3. 退出状态：告诉调用方成功还是失败，`0` 通常表示成功，非 `0` 表示失败。

例如：

```bash
node --version
echo $?
```

如果命令成功，`echo $?` 通常输出 `0`。检查不存在的文件：

```bash
ls does-not-exist
echo $?
```

你会看到错误信息，退出状态通常不是 `0`。

这就是为什么自动化脚本不能只打印“看起来正确”的文本。它还需要设置正确的退出状态，CI 或其他命令才能知道检查是否通过。

### 4.5 进程、PID 和端口

**进程**是正在运行的程序实例。每个进程通常有一个 PID：

```bash
ps -p $$ -o pid,ppid,comm=
```

这里的 `$$` 是当前 Shell 的 PID。你也可以用：

```bash
ps aux | head
```

观察系统中的一部分进程。

**端口**是网络连接进入进程的编号。启动 U01 服务器后：

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

你会看到某个 Node.js 进程正在监听 4173。浏览器访问 `localhost:4173` 时，操作系统会把连接交给这个监听进程。

于是一个“端口被占用”的错误可以被拆开：

```text
现象：Node.js 启动时报告 EADDRINUSE
证据：lsof 显示已有进程监听 4173
原因：两个进程不能同时绑定同一个本地端口
修复：停止旧进程或换用另一个端口
复验：新端口能返回 200，旧端口状态符合预期
```

进程和端口不是同一个概念：PID 标识进程，端口标识网络入口。一个进程可以监听多个端口，一个端口在同一时间通常只能由一个监听者负责。

### 4.6 版本检查不是“看起来有命令”

执行：

```bash
node --version
pnpm --version
git --version
```

至少要区分三种状态：

| 状态 | 示例 | 结论 |
| --- | --- | --- |
| 可用且版本满足 | `v24.21.0` | 可以按课程基线继续 |
| 可用但版本不满足 | `v22.22.0` | 命令存在，需要升级或切换运行时 |
| 命令不可用 | Corepack 找不到文件 | 不能判断版本，先修复命令链 |

U02 的 `check-env.mjs` 使用子进程执行命令，并根据退出状态判断命令是否成功。它不会只用字符串比较，因为版本输出可能包含 `v` 前缀、额外文字或错误信息。

#### Node.js

Node.js 是本课程前端工具、原生服务器和 NestJS 的运行时。正式课程基线使用 Node.js 24 LTS。W1 的 U01 只要求 Node.js 18 或更高版本能够运行实验，但 U02 会提醒你与课程主线基线的差异。

#### pnpm

pnpm 是后续 Workspace 和 Monorepo 的包管理器。`pnpm --version` 失败时，不要把错误自动归类为“版本低”。如果命令根本没有成功执行，就没有可信的版本号。

#### Git

Git 记录项目变更历史。W1 只检查命令是否可用，不把 Git 补丁版本锁死；不同平台的 Git 版本差异通常不会影响本单元的基本流程。

### 4.7 Git 的四个位置

Git 初学阶段最容易混淆的是“文件已经改了”和“提交已经记录了”之间的差异。先看四个位置：

```text
工作目录
  -> git add
暂存区
  -> git commit
本地仓库
  -> git push
远程仓库
```

- **工作目录**：你直接编辑的文件。
- **暂存区**：你明确选择、准备放进下一次提交的变更。
- **本地仓库**：已经提交、可以被 `git log` 查看和恢复的历史。
- **远程仓库**：团队共享的服务器副本。

U02 只做到本地仓库，不要求连接 GitHub 或其他远程服务。学习者应该先理解本地历史，再学习协作和发布。

### 4.8 用 Git 命令观察变更

初始化练习工作区：

```bash
git init
git status
```

查看文件改动：

```bash
git diff
```

把特定文件放入暂存区：

```bash
git add README.md
git status
```

查看暂存区内容：

```bash
git diff --cached
```

创建提交：

```bash
git commit -m "docs: initialize NoteFlow learning workspace"
git log --oneline -1
```

每条命令都对应一个观察问题：

| 命令 | 你应该问自己 |
| --- | --- |
| `git status` | 当前有哪些未提交状态？ |
| `git diff` | 工作区相对于上一次提交改了什么？ |
| `git add` | 我明确选择了哪些变更？ |
| `git diff --cached` | 下一次提交将包含什么？ |
| `git commit` | 我为这组变更留下了什么说明？ |
| `git log` | 本地历史里是否能找到这次提交？ |

### 4.9 一次提交应该表达一个变化

提交不是“按一下保存按钮”，而是一条可理解的项目历史。好的第一条提交：

```text
docs: initialize NoteFlow learning workspace
```

它说明：

- 这是文档/项目初始化；
- 提交的对象是 NoteFlow 学习工作区；
- 未来的人可以从历史中理解它的目的。

如果一次提交同时混入环境修复、无关格式化和临时日志，后续排查会很困难。初学阶段先练习“小而清楚”的提交，之后再学习分支、合并和代码评审。

### 4.10 不把秘密交给 Git

项目文件可能包含：

- API Token；
- 数据库密码；
- 私钥；
- 本地环境变量；
- 用户导出的真实数据。

Git 能记录任何被 `git add` 的文件，它不会自动识别“这是秘密”。`.gitignore` 可以帮助你避免常见误提交，但它不是安全边界：

```gitignore
.env
.env.*
!.env.example
node_modules/
dist/
coverage/
```

真实秘密一旦提交，即使后来删除当前文件，也可能仍在 Git 历史中。W1 不需要任何真实配置；后续课程会使用占位值和环境变量校验。

### 常见反例：在错误目录里运行正确命令

下面的命令本身没有错：

```bash
git add README.md
```

但如果你在另一个目录运行，它可能：

- 找不到 `README.md`；
- 把另一份 README 放进暂存区；
- 把不应该提交的文件加入历史。

解决方法不是记住更多 Git 参数，而是运行前先确认：

```bash
pwd
git rev-parse --show-toplevel
git status --short
```

命令必须和它作用的目录一起理解。

## 5. 标签、属性、API 或配置清单

| 名称 | 作用 | 最小示例 | 常见边界 |
| --- | --- | --- | --- |
| `pwd` | 输出当前目录 | `pwd` | 只说明位置，不说明 Git 状态 |
| `ls -la` | 查看文件和隐藏文件 | `ls -la` | 不会递归查看全部子目录 |
| `cd` | 切换当前目录 | `cd labs` | 路径错误会导致后续命令作用错位 |
| `mkdir -p` | 创建目录层级 | `mkdir -p labs/W01` | 只在明确目标目录时执行 |
| `cp` | 复制文件或目录 | `cp README.md /tmp/` | 目标路径要先确认 |
| `mv` | 移动或重命名 | `mv old.md new.md` | 可能覆盖同名目标，先检查 |
| `find` | 按条件搜索文件 | `find labs -type f` | 范围过大时输出会很多 |
| `ps` | 查看进程 | `ps -p $$` | 不等于查看端口 |
| `lsof` | 查看文件/端口占用 | `lsof -iTCP:4173` | 不同系统参数可能有差异 |
| `node --version` | 查看 Node.js 版本 | `node --version` | 可用不等于满足课程基线 |
| `pnpm --version` | 查看 pnpm 版本 | `pnpm --version` | Corepack 失败时版本未知 |
| `git init` | 初始化本地仓库 | `git init` | 不要在已有课程仓库内嵌套初始化 |
| `git status` | 查看工作区和暂存区状态 | `git status --short` | 状态不是提交历史 |
| `git diff` | 查看未暂存差异 | `git diff` | 暂存区差异要用 `--cached` |
| `git add` | 选择下一次提交的内容 | `git add README.md` | 不要盲目 `git add .` |
| `git commit` | 创建本地历史节点 | `git commit -m "..."` | 提交前先看暂存区 |
| `git log` | 查看提交历史 | `git log --oneline -1` | 本地历史不等于远程已发布 |
| `.gitignore` | 排除常见不应跟踪的文件 | `.env` | 不能撤回已经提交的秘密 |
| PID | 标识运行中的进程 | `ps -p 1234` | PID 会随进程重新启动变化 |
| 端口 | 进程接收网络连接的入口 | `localhost:4173` | 同一端口不能被多个监听者占用 |

## 6. 最小可运行案例

### 文件位置

```text
web-fullstack-course/labs/W01/U02-dev-environment/
├── README.md
├── check-env.mjs
└── noteflow-workspace/
    ├── README.md
    └── .gitkeep
```

### 运行命令

从仓库根目录执行：

```bash
cd web-fullstack-course/labs/W01/U02-dev-environment
node --check check-env.mjs
node check-env.mjs
```

然后准备一个不会污染课程仓库的 Git 练习副本：

```bash
rm -rf /tmp/noteflow-w1-workspace
mkdir -p /tmp/noteflow-w1-workspace
cp -R noteflow-workspace/. /tmp/noteflow-w1-workspace/
cd /tmp/noteflow-w1-workspace
git init
git status
git add README.md
git diff --cached
git commit -m "docs: initialize NoteFlow learning workspace"
git log --oneline -1
```

`rm -rf` 在这里仅指向明确命名的 `/tmp/noteflow-w1-workspace` 实验目录。执行前仍然应该用 `pwd` 和 `ls` 确认位置；不确定时不要执行删除命令。

### 关键代码

环境检查脚本位于：

```text
web-fullstack-course/labs/W01/U02-dev-environment/check-env.mjs
```

它用 Node.js 的 `execFileSync` 执行固定命令，而不是拼接用户输入：

```js
const output = execFileSync(command, args, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
});
```

执行失败时，脚本会保留标准输出和标准错误，并以非零状态退出。这样你既能看到原因，也能让自动化工具知道检查没有通过。

Git 最小流程可以画成：

```text
README.md 被编辑
    |
    v
git status 发现变更
    |
    v
git add README.md 放入暂存区
    |
    v
git diff --cached 检查提交内容
    |
    v
git commit 创建本地历史
```

### 预期结果

环境检查的结果可能有两种：

**基线满足：**

```text
PASS Node.js: v24.x（需要主版本 24）
PASS pnpm: 12.x（需要主版本 12）
PASS Git: git version 2.x
```

**部分环境需要修复：**

```text
FAIL Node.js: v22.x（需要主版本 24）
FAIL pnpm: 命令不可用：...
PASS Git: git version 2.x
```

无论哪种结果，都要把实际输出保留下来。环境诊断不是为了把所有机器变成同一个数字，而是为了让团队知道当前机器能可靠执行什么。

Git 首次提交后：

```text
git log --oneline -1
```

应显示一条以 `docs: initialize NoteFlow learning workspace` 开头的提交。

### 失败时的诊断

1. **现象**：`cd` 报告目录不存在。
   **证据**：`pwd` 的当前路径和 `ls` 的目录内容。
   **原因**：命令从错误目录执行，或路径拼写不一致。
   **修复**：回到仓库根目录，再使用课程给出的相对路径。
   **复验**：`pwd` 位于 `.../web-fullstack-course/labs/W01/U02-dev-environment`。
2. **现象**：环境脚本报告 Node.js `FAIL`。
   **证据**：实际版本输出和要求主版本。
   **原因**：Node.js 可用但主版本不是 24。
   **修复**：使用团队认可的版本管理工具切换到 Node.js 24 LTS；不要在教程中静默降低门槛。
   **复验**：重新运行 `node check-env.mjs`，记录新输出。
3. **现象**：环境脚本报告 pnpm 命令不可用。
   **证据**：命令退出错误、Corepack 路径或 Shell 的 `command not found`。
   **原因**：pnpm shim、缓存或 PATH 配置异常；这不是“版本低”的充分证据。
   **修复**：先确认 Node.js 版本，再按项目约定修复 Corepack 或 pnpm 安装。
   **复验**：`pnpm --version` 能返回一个可解析的 12.x 版本。
4. **现象**：`git add README.md` 后仍然看不到暂存变化。
   **证据**：`pwd`、`git status --short` 和 `git diff --cached`。
   **原因**：目录错误、文件未保存或目标文件不在当前仓库。
   **修复**：确认 Git 根目录和文件路径，按文件名重新执行 `git add`。
   **复验**：`git diff --cached` 显示 README 内容。
5. **现象**：`git commit` 提示无法识别作者。
   **证据**：Git 的完整错误输出。
   **原因**：当前仓库没有配置本地提交身份。
   **修复**：只为临时实验仓库配置示例用户名和无效域名邮箱。
   **复验**：提交成功，`git log --oneline -1` 可见。
6. **现象**：U01 启动时报端口占用。
   **证据**：`lsof -nP -iTCP:4173 -sTCP:LISTEN`。
   **原因**：已有 Node.js 进程监听端口。
   **修复**：停止你确认属于本次实验的进程，或设置 `PORT=4174`。
   **复验**：新端口返回首页 `200`，并且没有误杀其他进程。

## 7. NoteFlow 集成案例

### 7.1 为什么建立临时复制品

课程仓库本身已经包含导航、教程和实验。直接在里面运行 `git init` 会创建嵌套仓库，让学习者不容易分辨：

```text
课程仓库的历史
和
NoteFlow 学习工作区的历史
```

所以 U02 提供一个 `noteflow-workspace/` 起始目录，先复制到 `/tmp`，再在那里初始化 Git。这个动作模拟了真实工作中的“从空目录创建一个新项目”，同时保护当前课程仓库。

### 7.2 第一条 NoteFlow 提交

第一条提交只包含项目说明：

```text
docs: initialize NoteFlow learning workspace
```

它没有业务功能，却完成了三个重要动作：

1. 项目有了明确的根目录。
2. 项目运行和扩展方向有了文字说明。
3. 后续变更有了可以比较的起点。

真正的 NoteFlow 会在后续阶段增加：

```text
README
-> HTML 内容页
-> CSS 主题
-> 原生交互
-> React/Vue 应用
-> API 与数据库
```

每一步都可以通过 Git 差异看见，而不是把所有文件一次性丢进一个“初始版本”。

### 7.3 可复现是什么意思

“我电脑上能跑”不是可复现。可复现至少要说明：

- 从哪个目录执行；
- 依赖哪些工具；
- 版本要求是什么；
- 输入了什么命令；
- 应该看到什么结果；
- 如果失败，先看哪条证据。

U02 的实验 README 正在练习这个格式。后面的 React、NestJS、Docker 和 CI 教程会把它提升为项目级启动契约。

## 8. 常见错误与排查路径

### 错误一：把命令当作全局动作

- **现象**：在不同目录执行相同命令，得到不同文件或不同错误。
- **证据**：`pwd` 输出不同，命令使用了相对路径。
- **原因**：相对路径从当前目录开始解析。
- **修复**：执行前先确认 `pwd`，必要时切换到仓库根目录。
- **复验**：用 `ls` 和 `git rev-parse --show-toplevel` 确认目标一致。

### 错误二：用 `git add .` 代替检查

- **现象**：一次提交包含了日志、构建文件或本地配置。
- **证据**：`git diff --cached --stat` 和 `git diff --cached`。
- **原因**：没有先看状态，也没有维护忽略规则。
- **修复**：取消错误暂存，按文件或明确目录重新添加；对本地文件补充 `.gitignore`。
- **复验**：暂存差异只包含本次任务相关文件。

### 错误三：把版本错误和命令错误混在一起

- **现象**：看到 pnpm 命令报错，就说“pnpm 版本太低”。
- **证据**：错误输出没有可信版本号，可能是 shim 或 PATH 失败。
- **原因**：命令没有成功执行，版本检查没有完成。
- **修复**：先恢复命令可用，再判断主版本。
- **复验**：`pnpm --version` 返回版本数字，脚本可以进行主版本比较。

### 错误四：直接覆盖全局 Git 配置

- **现象**：为了让一次提交通过，修改了所有项目的作者身份。
- **证据**：`git config --global --list` 出现不熟悉的配置。
- **原因**：没有区分当前仓库配置和全局配置。
- **修复**：临时练习只使用仓库级配置，并使用无效域名示例。
- **复验**：`git config --local --list` 能看到实验配置，全局配置没有被无意改变。

### 错误五：用 `kill` 结束不确定的进程

- **现象**：为了释放端口，误终止了其他项目进程。
- **证据**：没有先查看 PID、命令和启动目录。
- **原因**：只看到了端口，没有确认进程归属。
- **修复**：先用 `lsof` 和 `ps` 查看完整信息；不确定时改用新端口。
- **复验**：目标实验可以运行，其他项目仍然正常。

## 9. 课后题

### 理解题

1. 为什么执行 `git add` 后，文件还没有进入本地提交历史？
2. 工作区、暂存区和本地仓库分别保存什么状态？
3. 为什么 `pwd` 是排查相对路径错误的重要证据？
4. PID 和端口分别解决什么识别问题？
5. 为什么“命令执行失败”和“版本太低”不能直接等价？

### 推理题

你执行：

```bash
cd /tmp
git add README.md
```

终端提示找不到文件。请不要直接修改命令，先写出：

```text
当前目录：
Git 根目录：
目标文件的预期位置：
下一条观察命令：
可能原因：
```

### Git 状态题

依次执行：

```bash
echo "one" >> README.md
git status --short
git add README.md
echo "two" >> README.md
git status --short
git diff
git diff --cached
```

预测每一步中工作区和暂存区分别包含什么，再实际运行验证。

## 10. 实践练习

### 基础练习：建立自己的第一条提交

在 `/tmp/noteflow-w1-workspace` 的复制品中：

1. 修改 README，增加一段“我本周要解决的产品问题”。
2. 使用 `git diff` 检查工作区差异。
3. 使用 `git add README.md` 暂存。
4. 使用 `git diff --cached` 检查提交内容。
5. 创建提交并查看 `git log --oneline -2`。

### 提升练习：记录环境快照

在临时工作区创建 `environment-notes.md`，记录：

- `node --version`；
- `pnpm --version`；
- `git --version`；
- 当前系统；
- 检查日期；
- 未通过项和原因。

不要把完整的用户目录、Token、环境变量值或私有路径复制进文档。提交后用 `git show --stat --oneline HEAD` 检查提交摘要。

### 故障练习：修复错误路径

故意在错误目录执行：

```bash
cd /tmp
git status
```

再根据输出找到正确的实验副本。写下：

```text
错误动作：
看到的证据：
正确目录：
恢复命令：
复验结果：
```

### 进程练习：识别一个端口占用者

启动 U01 服务器，使用 `lsof` 找出 4173 的 PID，再用 `ps` 查看该 PID 的命令。停止服务器后重复观察，说明端口释放前后有什么变化。

### 安全练习：设计忽略规则

为临时工作区新增一个 `.gitignore`，让 `.env`、`node_modules/` 和 `dist/` 不进入 Git 状态。创建一个名为 `.env` 的文件，验证它不会出现在待提交列表中。再说明为什么 `.gitignore` 不能清除已经提交过的秘密。

## 11. 阶段验收

### 功能验收

- [ ] 能从课程仓库进入 U02 实验目录。
- [ ] `node --check check-env.mjs` 通过。
- [ ] `node check-env.mjs` 能给出 Node.js、pnpm 和 Git 的逐项结果。
- [ ] 能在临时复制品中执行 `git init`。
- [ ] 能完成 `git status`、`git add`、`git diff --cached`、`git commit` 和 `git log`。
- [ ] 没有把临时工作区的 `.git` 目录初始化在课程仓库内部。

### 解释验收

- [ ] 能解释当前目录和相对路径如何影响命令。
- [ ] 能区分文件、目录、进程、PID 和端口。
- [ ] 能区分命令不可用、版本不满足和业务代码错误。
- [ ] 能画出工作区、暂存区、本地仓库和远程仓库的关系。
- [ ] 能解释为什么提交前要看 `git diff --cached`。

### 提交材料

- **代码路径**：`web-fullstack-course/labs/W01/U02-dev-environment/`
- **环境证据**：`node check-env.mjs` 的完整输出
- **Git 证据**：首次提交标题、短哈希、`git status` 和 `git log`
- **路径证据**：一次 `pwd`、`ls` 或 `git rev-parse` 输出
- **进程证据**：一次 PID 或端口观察
- **排查记录**：一个版本、命令、路径或端口问题的完整记录
- **已知问题**：课程环境基线可能与当前机器不一致，需要在后续项目初始化前修复
- **下一步改进**：把环境约束写入项目的 `engines`、版本文件和安装文档

## 12. 常见问题

### 终端和 Shell 是同一个东西吗？

不是。终端通常是显示输入输出的窗口或程序，Shell 负责解释命令。你可以在不同终端窗口中运行同一种 Shell，也可以在同一个终端应用里选择不同 Shell。

### Git 是 GitHub 吗？

不是。Git 是本地版本控制工具；GitHub、GitLab 等是可以存放远程仓库和协作功能的平台。W1 只要求掌握本地 Git 历史，不要求账号登录或远程推送。

### 为什么不直接在课程仓库里 `git init`？

课程仓库已经有自己的历史。嵌套 Git 会让学习者难以判断当前命令操作的是哪个仓库，也可能影响后续文件收集。复制到临时目录能保留练习目标，又避免污染课程材料。

### `git add` 是把文件上传了吗？

不是。`git add` 只把变更放入本地暂存区。`git commit` 写入本地历史，`git push` 才会把本地提交发送到远程仓库。

### 为什么提交信息要写动词或变化？

提交历史应该帮助未来的你理解“这次变更做了什么”。`docs: initialize NoteFlow learning workspace` 比“第一次提交”更能说明对象和目的。

### 环境检查失败，我还能学 U01 吗？

通常可以。U01 只要求 Node.js 能启动静态服务器，U02 还会检查课程主线版本。你可以先完成浏览器、HTTP 和 Git 概念，同时把版本差异和命令问题记录下来，再在引入更复杂依赖前修复。

### 为什么脚本不能自动帮我修复 pnpm？

环境修复可能改变 PATH、Corepack 版本或其他项目的包管理器。教学脚本负责给出证据和诊断边界，不在学习者没有确认的情况下修改全局环境。

## 13. 扩展阅读

- [Git 官方文档](https://git-scm.com/doc)
- [Git Book：Git 基础](https://git-scm.com/book/zh/v2)
- [Node.js 发布和支持策略](https://nodejs.org/en/about/previous-releases)
- [Node.js 下载页面](https://nodejs.org/en/download)
- [pnpm 文档](https://pnpm.io/)
- [Corepack 文档](https://nodejs.org/api/corepack.html)
- [POSIX 进程概念](https://pubs.opengroup.org/onlinepubs/9699919799/functions/exec.html)

## 我现在能做到什么

完成本单元后，我能够：

- 先确认当前目录，再执行会影响文件的命令。
- 用 `ps`、`lsof` 和终端输出判断进程、PID 和端口状态。
- 区分工具版本不满足、命令不可用和项目代码错误。
- 用 Git 暂存并提交一组可解释的变更。
- 在不污染主仓库、不提交秘密的前提下建立学习工作区。

## 单元导航

- [上一单元：Web 应用、浏览器和服务器是什么](./01-web-app-browser-server.md)
- 下一单元：W2 将进入 HTML 文档结构和元信息。
- [返回 Web 与 HTML 基础](../README.md)
