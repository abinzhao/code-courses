# Git 范围、审查与可回退提交

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个只包含金额修复与对应测试的本地提交证据包 |
| 建议时间 | 90 分钟 |
| 运行位置 | 读者拥有的一次性 `market-git-exercise` 仓库 |
| 安全边界 | 不改教材仓库，不推送，不连接真实外部资源 |
| 完成证据 | 状态、两类 diff、精确 staged 路径、提交对象与恢复演练 |

## 1. 任务背景

邻里集市修复了 `1990` 分显示错误，同时工作树里还有个人笔记和一次未完成的页面重排。若直接执行 `git add .`，提交会把三个意图混在一起；后续审查者不能确定测试针对哪项变化，回退也会误伤无关工作。

Git 管理的是文件快照。数据库、队列、浏览器存储、云账号和正在运行的服务不在 Git 提交里。分支或 worktree 隔离了文件视图，也不会自动隔离这些外部状态。

## 2. 学习目标

- 区分工作树、暂存区、提交、分支和 worktree。
- 同时阅读未暂存 diff 与 staged diff。
- 使用精确路径组成一个可审查提交。
- 识别生成文件、密钥与真实本地配置的处理边界。
- 在不丢失文件的前提下撤销错误暂存。
- 解释回退提交与数据库恢复为何是两件事。

## 3. 预备知识

先复制个人练习项目，不要在教材目录执行本课 Git 写操作：

```bash
cp -R market-engineering-capstone /tmp/market-git-exercise
cd /tmp/market-git-exercise
git init
git switch -c learning/reviewable-commit
git status --short
```

若源目录含 `node_modules`、`dist`、测试报告或真实 `.env`，复制前先移除这些可再生或敏感内容。本课只使用教学数据，不配置远端。

## 4. 核心理论

### 4.1 三个快照视图

工作树是磁盘上的当前文件；暂存区是下一次提交候选快照；`HEAD` 指向当前提交。`git diff` 比较工作树与暂存区，`git diff --cached` 比较暂存区与 `HEAD`。只读其中一个会漏掉另一类变化。

```text
HEAD --(git add 选择)--> index --(继续编辑)--> working tree
```

`git commit` 保存暂存区，不会自动收集所有未暂存变化。

### 4.2 分支、worktree 与外部状态

分支是提交引用。worktree 让不同分支拥有独立目录，适合避免两个任务修改同一文件；但两个目录仍可能连接同一 PostgreSQL、端口或对象存储。外部资源需要独立命名空间、测试账号或明确的只读约束。

### 4.3 可审查提交

一个提交应表达一个行为变化，并同时包含能证明它的测试。金额除数修复和测试属于同一范围；全仓格式化、编辑器配置和下一项功能不属于。小提交不是按行数机械切分，而是让“为什么改、如何证、怎样回退”保持一致。

锁文件是依赖图输入，清单变化时应审查并提交；`node_modules`、`dist`、覆盖率和浏览器报告是可再生产物，不提交。真实密钥一旦进入历史，仅删除文件不够，还要撤销和轮换凭据。

## 5. 元素、属性、API 或配置清单

| 命令或对象 | 作用 | 边界 |
| --- | --- | --- |
| `git status --short` | 紧凑显示 tracked/untracked/staged 状态 | 不展示具体内容 |
| `git diff -- path` | 查看未暂存变化 | 不含 staged 内容 |
| `git diff --cached -- path` | 查看下一提交候选 | 不含工作树后续编辑 |
| `git add -- path...` | 精确选择路径 | 不应默认收集无关文件 |
| `git restore --staged -- path` | 从暂存区移除，保留工作树 | 不等于删除文件 |
| `git diff --cached --check` | 检查 staged 空白错误 | 不证明业务正确 |
| `git commit` | 保存 index 快照 | 不保存外部资源 |
| `git show --stat --oneline HEAD` | 检查已提交范围 | 摘要不能替代完整 diff |
| `.gitignore` | 排除本地生成物 | 不是秘密存储机制 |
| `git worktree` | 为另一分支创建目录 | 不隔离数据库和账号 |

## 6. 最小可运行案例

在 `/tmp/market-git-exercise` 建立两个文件：

```bash
mkdir -p src tests notes
printf 'export const format = (cents) => (cents / 100).toFixed(2)\\n' > src/money.js
printf 'import { strict as assert } from "node:assert";\\nimport { format } from "../src/money.js";\\nassert.equal(format(1990), "19.90");\\n' > tests/money.test.js
printf '个人草稿，不属于本次提交\\n' > notes/idea.txt
git status --short
```

预期看到三个未跟踪路径。只选择源码与测试：

```bash
git add -- src/money.js tests/money.test.js
git diff --cached --name-only
git diff --cached --check
node tests/money.test.js
```

预期路径只有 `src/money.js` 和 `tests/money.test.js`，测试退出码为 `0`。提交前仍要执行：

```bash
git diff
git diff --cached
```

第一次提交需要真实使用者已有的 Git 身份。若本机未配置，不要编造身份绕过；可把 staged diff 作为本课证据，或按个人真实信息配置后执行：

```bash
git commit -m "fix: preserve integer-cent formatting"
git show --stat --oneline HEAD
```

## 7. 邻里集市集成案例

项目中金额修复涉及：

```text
packages/contracts/src/money.ts
packages/contracts/src/money.test.ts
```

先观察全局状态，再限定路径：

```bash
git status --short
git diff -- packages/contracts/src/money.ts packages/contracts/src/money.test.ts
git add -- packages/contracts/src/money.ts packages/contracts/src/money.test.ts
git diff --cached --name-only
git diff --cached --check
pnpm test -- packages/contracts/src/money.test.ts
git diff --cached
```

验收清单：

- `priceCents` 仍要求非负安全整数；
- `0` 显示 `0.00`，`1990` 显示 `19.90`；
- 测试期望值独立写出，没有调用实现计算期望；
- staged 列表不含 `.env`、`dist`、`node_modules`、报告或个人笔记；
- 未暂存变化被保留，没有为“干净”而覆盖。

## 8. 常见错误与排查路径

### 错误实验：误暂存个人笔记

```bash
git add -- notes/idea.txt
git diff --cached --name-only
```

- **现象**：候选提交多出 `notes/idea.txt`。
- **证据**：`git diff --cached --name-only` 显示三条路径。
- **原因**：路径选择超出金额修复范围。
- **修复**：执行 `git restore --staged -- notes/idea.txt`，不删除工作树文件。
- **复验**：再次运行 staged 路径和完整 staged diff，只剩源码与测试。

不要用 `git reset --hard` 或删除文件制造干净状态。遇到冲突时先读取两边意图；“总保留当前分支”会丢掉别人的有效改动。

## 9. 课后题

1. `git status` 干净能证明测试通过吗？
   **答案**：不能，只证明 tracked 文件相对当前提交无变化。
2. worktree 能否隔离共享测试数据库？
   **答案**：不能，需要独立数据库、schema、租户或明确清理策略。
3. 清单改变但锁文件没变可以直接提交吗？
   **答案**：应先解释原因并运行包管理器验证；通常清单与解析后的锁文件应一起审查。
4. 密钥从最新提交删除后是否安全？
   **答案**：否，应视为泄露，撤销、轮换并按团队流程处理历史。

## 10. 实践练习

- **基础**：创建一个无关 `notes.txt`，证明精确 `git add` 不会收集它。验收：staged 路径只有目标源码和测试。
- **进阶**：使用 `git worktree add /tmp/market-review <branch>` 建立审查目录。验收：能说明两个目录共享哪些 Git 对象、仍共享哪些外部资源。
- **故障注入**：误暂存生成的 `dist/app.js`，再用非破坏命令移出暂存。验收：文件仍在磁盘，但不在 staged diff。

## 11. 阶段验收

保存以下可观察证据：

```bash
git status --short
git diff --name-only
git diff --cached --name-only
git diff --cached --check
git show --stat --oneline HEAD
```

通过条件：每条 staged 路径都能关联到金额修复或测试；无敏感/生成文件；测试退出 `0`；能说明分支与外部状态的区别。若没有真实 Git 身份而未提交，应如实记录为“staged 范围已验证，提交对象未创建”。

## 12. 常见问题

**可以用 `git add -p` 吗？** 可以，但拆分同一文件的 hunk 前要确认所得中间状态仍完整可测；路径明确时优先精确路径。

**提交越小越好吗？** 不是。源码和证明该行为的测试通常应同行；机械拆散会让任何一个提交都无法独立解释。

**如何撤销已经公开的错误提交？** 共享历史通常用新的 revert 提交，是否改写历史取决于团队规则；本课不执行远端操作。

## 13. 扩展阅读

资料快照：2026-10-11。

- [Pro Git：记录更新到仓库](https://git-scm.com/book/zh/v2/Git-基础-记录每次更新到仓库)
- [git-diff 官方文档](https://git-scm.com/docs/git-diff)
- [git-restore 官方文档](https://git-scm.com/docs/git-restore)
- [git-worktree 官方文档](https://git-scm.com/docs/git-worktree)

## 我现在能做到什么

我能从混合工作树中选出一项完整行为变化，阅读 staged/unstaged 两个视图，在不破坏用户文件的前提下纠正误暂存，并说明 Git 无法覆盖的外部资源。

## 单元导航

- 章入口：[06 CI、Git 与发布](../06-ci-git-release.md)
- 上一课：[Playwright 构建页端到端测试](../05-unit-integration-e2e/03-playwright-built-page-e2e.md)
- 下一课：[可复现 CI 质量流水线](02-ci-reproducible-quality-pipeline.md)
