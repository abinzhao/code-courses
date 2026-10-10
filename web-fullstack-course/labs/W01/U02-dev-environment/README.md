# U02 实验：建立 NoteFlow 学习工作区

## 实验目标

你会从一个空工作区开始，练习：

- 终端导航和文件操作；
- 查看进程、端口和命令版本；
- 判断 Node.js、pnpm 和 Git 是否可用；
- 在一个临时复制品中初始化 Git；
- 完成第一次可恢复的提交；
- 记录一次真实的环境故障。

完整解释见[U02 教程：终端、文件系统、Git 与开发环境](../../../00-common/W01-web-foundations/02-terminal-filesystem-git.md)。

## 1. 检查当前目录

从仓库根目录执行：

```bash
pwd
ls
cd web-fullstack-course/labs/W01/U02-dev-environment
pwd
ls
```

你应该能看到：

```text
README.md
check-env.mjs
noteflow-workspace
```

`pwd` 是证据：它告诉你当前命令作用在哪个目录。不要只凭终端提示符猜测路径。

## 2. 检查运行环境

在当前实验目录执行：

```bash
node --check check-env.mjs
node check-env.mjs
```

成功时会看到类似：

```text
NoteFlow W1 开发环境检查
========================
PASS Node.js: v24.21.0（需要主版本 24）
PASS pnpm: 12.11.0（需要主版本 12）
PASS Git: git version 2.45.0

检查通过：Node.js、pnpm 和 Git 满足 W1 基线。
```

当前环境如果出现 `FAIL`，不要删除输出。失败输出本身就是本实验要求提交的诊断证据。

## 3. 使用临时复制品练习 Git

课程仓库已经有自己的 Git 历史，不要在课程仓库内部再次执行 `git init`。把练习工作区复制到系统临时目录：

```bash
rm -rf /tmp/noteflow-w1-workspace
mkdir -p /tmp/noteflow-w1-workspace
cp -R noteflow-workspace/. /tmp/noteflow-w1-workspace/
cd /tmp/noteflow-w1-workspace
```

如果你的系统没有 `cp`，可以在 Finder 中复制 `noteflow-workspace` 到临时目录，再从终端进入复制品。

初始化 Git：

```bash
git init
git status
git add README.md
git status
git commit -m "docs: initialize NoteFlow learning workspace"
git log --oneline -1
```

预期结果：

- 第一次 `git status` 显示 `README.md` 尚未跟踪。
- `git add README.md` 后，文件进入暂存区。
- `git commit` 创建一次本地提交。
- `git log --oneline -1` 显示刚才的提交标题。

## 4. 观察进程和端口

在另一个终端窗口执行：

```bash
ps -p $$ -o pid,ppid,comm=
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

如果 U01 服务器已经停止，第二条命令可能没有输出。这不是错误，它说明当前没有进程监听 4173。

启动 U01 服务器后，再执行：

```bash
lsof -nP -iTCP:4173 -sTCP:LISTEN
```

你会看到 Node.js 进程和监听端口。按 `Ctrl-C` 停止服务器后再次执行，观察端口如何释放。

## 5. 常见错误

### Node.js 版本不满足

脚本会显示当前 Node.js 主版本和课程要求。记录：

- 实际版本；
- 课程要求；
- 是否可以继续完成浏览器实验；
- 迁移到 Node.js 24 LTS 的计划。

### pnpm 命令不可用

如果输出中出现 Corepack、缓存路径或 `command not found`，先把它归类为“命令不可用”，不要直接把它写成“pnpm 版本太低”。版本未知和版本过低是两种不同问题。

可选修复方向：

```bash
corepack enable
corepack prepare pnpm@12.11.0 --activate
pnpm --version
```

执行修复前先确认 Node.js 已满足课程基线，并保留修复前后的命令输出。

### Git 提交要求配置作者

如果 Git 提示缺少用户名或邮箱，只为当前实验工作区配置，不要在不了解影响的情况下覆盖全局配置：

```bash
git config user.name "NoteFlow Learner"
git config user.email "learner@example.invalid"
```

然后重新运行 `git commit`。示例邮箱不会发送邮件，它只是本地提交元数据。

### `git status` 没有显示你刚改的文件

按顺序检查：

1. `pwd` 是否在预期工作区；
2. 文件是否真的保存；
3. 是否已经执行 `git add`；
4. 是否误把文件写入另一个目录。

不要先执行 `git reset --hard` 或删除目录，因为这些动作会丢失你正在学习的证据。

## 6. 实验提交

将以下内容记录在自己的 W1 验收文档中：

```text
工作区路径：
Node.js 输出：
pnpm 输出：
Git 输出：
首次提交标题：
首次提交短哈希：
一个失败现象：
失败证据：
原因判断：
修复动作：
复验结果：
```

实验结束后回到课程仓库：

```bash
cd /path/to/web-code-docs
```

把 `/path/to/web-code-docs` 替换成你自己的仓库路径，不要把临时目录当成课程仓库继续使用。
