# 02 Git 三棵树、提交与分支：让每次变化都能被解释

## 任务卡

邻里集市首页已经能运行，但同伴把临时日志、未完成价格和正式页面一次性提交，之后没人知道哪个版本通过了验证。本课要建立一个只属于个人练习的 Git 仓库，观察工作区、暂存区和本地仓库三份状态，完成范围清楚的提交、分支实验、冲突恢复和忽略规则验证。

| 关卡 | 可见成果 | 验收证据 |
| --- | --- | --- |
| 三棵树 | 能指出同一文件的三个版本 | working diff、cached diff、HEAD 内容 |
| 清楚提交 | 一次提交只含预期文件 | 暂存清单与提交详情 |
| 分支实验 | 两条轨迹各有提交 | `git log --graph` |
| 冲突恢复 | 能中止或正确解决冲突 | status、标记清理、最终提交 |

建议用 120～150 分钟。所有 Git 写操作在新建的个人 `git-lab` 中执行，不在教材仓库练习，不推送远端。

## 1. 任务背景

编辑器保存只把变化写到磁盘；Git 不会自动记录每次保存。一次 Git 提交来自暂存区，而不是“当前目录里所有看得见的内容”。

```text
工作区 working tree
  -- git add -->
暂存区 index
  -- git commit -->
本地仓库 repository / HEAD
```

分支让提交轨迹分开推进，合并把两条轨迹的变化组合起来。冲突不是 Git 损坏文件，而是 Git 无法替人决定同一位置的最终业务内容。

## 2. 学习目标

完成后，你应能：

- 解释工作区、暂存区、本地仓库和 HEAD。
- 用 `status`、working diff、cached diff 查看不同状态。
- 指定路径暂存，提交前核对实际内容。
- 解释未跟踪文件为什么通常不出现在普通 diff 中。
- 编写只适用于未跟踪文件的 `.gitignore` 规则。
- 创建、切换和比较分支，不把分支理解为文件夹副本。
- 制造并识别一次文本合并冲突。
- 使用 `git merge --abort` 非破坏性回到合并前状态。
- 正确解决冲突并验证没有遗留标记。
- 使用分支、暂存区撤销和 stash 保护现有工作，而不是重置或强制覆盖。
- 为邻里集市提交一次范围明确、可运行的本地快照。

## 3. 预备知识

先完成[终端、进程与端口](01-terminal-processes-ports.md)，会确认当前目录。准备 Git：

```bash
git --version
```

本课创建新的 `market-learning/git-lab`。执行 `git init` 前必须再次确认：

```bash
pwd
ls -la
```

PowerShell 使用 `Get-Location` 与 `Get-ChildItem -Force`。若目录中已经有 `.git`，不要继续初始化；换一个明确的新练习目录。

本课不要求 GitHub、GitLab、Codebase 或其他远端，不执行 `push`、`pull`、`reset --hard`、`clean -fd` 或强制操作。

## 4. 核心理论

### 4.1 Git 记录快照与关系

提交保存项目已选择内容的快照，并记录：

- 父提交；
- 作者与提交者信息；
- 时间；
- 提交说明；
- 对应树对象。

Git 会复用相同内容，不是每次都机械复制整个目录。初学阶段最重要的模型仍是：提交代表暂存区在某一时刻的状态。

`HEAD` 通常指向当前分支的最新提交：

```text
HEAD → main → commit C
```

切换分支会改变 HEAD 所在轨迹，并尝试让工作区匹配目标提交。工作区有未保存到 Git 的变化时，Git 可能拒绝切换以避免覆盖。

### 4.2 工作区、暂存区与 HEAD

同一个 `index.html` 可以同时存在三个版本：

```text
HEAD：280 元
暂存区：260 元
工作区：240 元
```

查看命令：

| 比较 | 命令 | 本例看到什么 |
| --- | --- | --- |
| 工作区 vs 暂存区 | `git diff` | 260 → 240 |
| 暂存区 vs HEAD | `git diff --cached` | 280 → 260 |
| HEAD 文件 | `git show HEAD:index.html` | 280 元 |
| 综合状态 | `git status` | 同一文件同时 staged 和 modified |

此时直接提交只会记录暂存区的 260 元，工作区 240 元仍留在磁盘。提交不是“取最新编辑器画面”，而是记录已选择的 index。

### 4.3 未跟踪文件为什么容易漏查

新文件还没有 Git 基线，普通 `git diff` 默认不会显示其完整内容。`git status` 会把它列为 untracked。

提交前至少检查：

```bash
git status --short
git diff
git diff --cached
```

暂存新文件后，cached diff 才会显示其全部内容。只运行普通 diff 然后说“没有变化”是不完整的检查。

### 4.4 精确暂存比盲目全选更可审计

推荐：

```bash
git add index.html README.md
git diff --cached
```

明确错误习惯：

```bash
git add .
git commit -m "update"
```

这两条命令语法有效，但如果没有先检查，会把日志、环境文件、调试截图和无关变化一起选入提交。问题不是 `git add .` 永远禁止，而是范围不清时无法证明选择是有意的。

提交说明应描述一个完成的变化：

```text
feat: add static market listing page
docs: document local startup steps
fix: align listing price display and machine value
```

说明不应声称尚未实现的登录、预约或真实交易。

### 4.5 `.gitignore` 只影响匹配的未跟踪文件

本课使用：

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
*.log
```

验证某文件为何被忽略：

```bash
git check-ignore -v debug.log
```

若文件已经被 Git 跟踪，后来加入 ignore 不会让历史自动消失。不要通过改 ignore 伪装敏感文件从未提交；真实泄露需要撤销凭据、评估历史和按团队流程处理。

`.gitignore` 也不是安全边界。真实密码和 Token 不应进入练习文件、提交、截图或文档。

### 4.6 提交前后分别验证

提交前：

```bash
git status
git diff
git diff --cached
git diff --cached --check
```

提交后：

```bash
git show --stat --oneline HEAD
git show --format=fuller --no-ext-diff HEAD
git status
```

`git status` 干净只表示工作区与 index 相对当前提交没有变化，不证明页面功能正确。仍需运行服务和请求首页。

### 4.7 分支是提交指针，不是文件夹副本

创建分支：

```bash
git switch -c practice/lower-price
```

它建立一个新分支指向当前提交，并让 HEAD 指向该分支。提交后：

```text
main                 → commit A
practice/lower-price → commit B
```

两个分支共享历史 A，B 只在实验分支。切回：

```bash
git switch main
```

工作区会按 main 的快照更新，但未提交变化可能阻止切换。先保存到提交、stash 或单独分支，不要强制覆盖。

### 4.8 合并冲突要求人做业务决定

若 main 和实验分支都修改 `listing.txt` 同一行，合并会把两侧内容放在一组冲突标记之间。标记顺序为：

1. 当前侧起点：`<<<<<<< HEAD`；
2. 当前侧内容：`priceCents=27000`；
3. 两侧分隔：`=======`；
4. 待合并侧内容：`priceCents=26000`；
5. 待合并侧终点：`>>>>>>> practice/lower-price`。

- `<<<<<<< HEAD` 到 `=======` 是当前分支一侧；
- `=======` 到 `>>>>>>> practice/lower-price` 是待合并分支一侧；
- 这些标记只是待解决现场，不能留进正式文件。

有两条安全路径：

1. 暂时不解决：`git merge --abort`，回到合并前。
2. 理解业务后编辑最终内容，删除全部标记，暂存并提交合并。

不能机械保留两行，因为同一商品不能同时有两个权威 `priceCents`。

### 4.9 非破坏性恢复工具

| 场景 | 优先动作 | 保留什么 |
| --- | --- | --- |
| 暂存错文件 | `git restore --staged path` | 工作区内容保留 |
| 临时变化阻止切分支 | `git stash push -u -m "说明"` | 已跟踪与未跟踪变化进入 stash |
| 合并方向不清 | `git merge --abort` | 回到合并前状态 |
| 想保护当前实验 | `git switch -c rescue/topic` 后提交 | 建立可追踪分支 |
| 查找误操作前位置 | `git reflog` | 只读查看 HEAD 移动历史 |

`git restore path` 会用 index 内容覆盖工作区，可能丢弃未保存到 Git 的修改；`git reset --hard` 和 `git clean -fd` 影响更大。本课不把这些命令作为恢复练习。

使用 stash 后查看：

```bash
git stash list
git stash show --stat stash@{0}
```

zsh 可能把花括号解释为语法，必要时引用：

```bash
git stash show --stat "stash@{0}"
```

恢复前先确认目标分支和工作区状态。

## 5. 元素、属性、API 或配置清单

| 命令或配置 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `git init -b main` | 初始化本地仓库 | 在新练习目录运行 | 不创建远端 |
| `git status --short --branch` | 查看分支和文件状态 | 每次操作前后运行 | 不展示完整内容 |
| `git diff` | 工作区对暂存区 | 提交前检查 | 默认不展开未跟踪文件 |
| `git diff --cached` | 暂存区对 HEAD | 核对下一提交 | 首次提交时对空基线 |
| `git add 路径` | 把指定内容写入 index | 精确选择文件 | 后续编辑不会自动更新 index |
| `git restore --staged 路径` | 撤销暂存 | 保留工作区文件 | 不是删除文件 |
| `git commit -m` | 创建本地提交 | 描述一个完整变化 | 不自动推送 |
| `git show` | 查看提交 | `git show HEAD` | 大文件输出可能很长 |
| `git switch -c` | 创建并切换分支 | `practice/topic` | 未提交变化可能影响切换 |
| `git merge` | 合并另一分支 | 在目标分支运行 | 冲突需人工决定 |
| `git merge --abort` | 中止冲突合并 | 冲突期间运行 | 复杂预存变化需先看状态 |
| `.gitignore` | 忽略匹配的未跟踪文件 | 每行一条规则 | 不移除已跟踪历史 |
| `git stash push -u` | 暂存临时工作 | 带清楚说明 | 恢复时仍可能冲突 |
| `git reflog` | 查看引用移动记录 | 只读调查 | 不是永久备份承诺 |

## 6. 最小可运行案例

### 6.1 创建独立练习目录

在个人学习区创建：

```text
market-learning/
└── git-lab/
    ├── .gitignore
    ├── README.md
    ├── index.html
    └── listing.txt
```

再次确认 `git-lab` 是新目录且没有 `.git`，然后：

```bash
git init -b main
git config user.name "Learning Developer"
git config user.email "learner@example.invalid"
```

配置不加 `--global`，只作用于本练习仓库。

### 6.2 完整文件

`.gitignore`：

```gitignore
node_modules/
dist/
.env
.env.*
!.env.example
*.log
```

`README.md`：

```markdown
# Git 状态实验

这是个人 Git 练习，不连接远端。

打开方式：用浏览器直接打开 index.html。
业务边界：静态商品说明，没有登录、预约、支付或持久化。
```

`listing.txt`：

```text
id=bike-001
title=九成新自行车
priceCents=28000
status=available
createdAt=2026-10-11T02:00:00Z
```

`index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Git 状态实验 · 邻里集市</title>
</head>
<body>
  <main>
    <h1>九成新自行车</h1>
    <p>价格：<data value="28000">280 元</data></p>
    <p>
      发布时间：
      <time datetime="2026-10-11T02:00:00Z">
        2026年10月11日 10:00（北京时间）
      </time>
    </p>
    <p>静态练习页，不创建真实预约。</p>
  </main>
</body>
</html>
```

### 6.3 首次提交

检查并精确暂存：

```bash
git status --short --branch
git add .gitignore README.md index.html listing.txt
git diff --cached --check
git diff --cached
git commit -m "feat: add static market listing"
git status --short --branch
git log --oneline -1
```

预期首次提交包含四个文件，最后状态没有未提交变化。双击 `index.html`，页面仍可运行；Git 验证与功能验证要分别完成。

### 6.4 三棵树观察

用编辑器把 `listing.txt` 的价格改为 `26000`，保存并暂存：

```bash
git add listing.txt
```

再把工作区同一行改为 `24000`，保存但不要再次暂存。运行：

```bash
git status
git diff
git diff --cached
git show HEAD:listing.txt
```

预期：

- working diff 显示 26000 → 24000；
- cached diff 显示 28000 → 26000；
- HEAD 仍显示 28000；
- status 把 `listing.txt` 同时列在待提交和未暂存变化中。

不要在不了解状态时提交。先把 24000 改回 26000，使工作区与 index 一致，再提交：

```bash
git diff
git diff --cached
git commit -m "feat: lower practice listing price"
```

### 6.5 暂存错误的非破坏性恢复

修改 `README.md`，故意暂存：

```bash
git add README.md
git diff --cached
git restore --staged README.md
git status --short
```

预期 README 仍保留在工作区，只是不再属于下一提交。此实验不使用 `git restore README.md`，避免覆盖尚未提交的文字。确认观察后，可手动撤销本次练习文字或把它作为单独文档提交。

## 7. 邻里集市集成案例

### 7.1 为上一章项目建立本地历史

只在个人 `market-learning` 根目录执行，不在教材仓库执行：

```bash
git init -b main
git config user.name "Learning Developer"
git config user.email "learner@example.invalid"
git status
```

创建 `.gitignore` 与 `README.md`，再精确选择：

```bash
git add .gitignore README.md \
  market-start/index.html \
  market-start/server.mjs \
  learning-log.md
git diff --cached --check
git diff --cached
git commit -m "feat: add first local market page"
```

若 PowerShell 不使用反斜杠续行，可把路径写在同一行。提交前必须确认没有真实环境文件、日志、截图隐私或其他练习目录。

### 7.2 运行验证与 Git 验证分开

提交后：

```bash
git status --short --branch
git show --stat --oneline HEAD
```

再进入 `market-start` 运行：

```bash
node server.mjs
```

首页应为 200，`/missing` 应为 404。Git 状态干净不能替代这次运行检查；运行成功也不能证明提交范围正确。

### 7.3 完整分支与冲突实验

冲突实验只在第 6 节的 `git-lab` 执行。

确保 `listing.txt` 当前提交中的价格是 `26000`。创建实验分支：

```bash
git switch -c practice/sale-price
```

把 `listing.txt` 的 `priceCents` 改为 `25000`，提交：

```bash
git add listing.txt
git diff --cached
git commit -m "feat: propose sale price"
```

切回 main，把同一行改为 `27000` 并提交：

```bash
git switch main
git add listing.txt
git commit -m "feat: record negotiated price"
```

此时两条分支修改同一行。合并：

```bash
git merge practice/sale-price
```

预期出现冲突。先查看：

```bash
git status
git diff
```

第一次先练习安全退出：

```bash
git merge --abort
git status
```

两个分支的提交都保留，main 回到合并前。再次合并，人工决定最终价格为 25000 分，并把 `listing.txt` 完整恢复为：

```text
id=bike-001
title=九成新自行车
priceCents=25000
status=available
createdAt=2026-10-11T02:00:00Z
```

验证没有冲突标记：

```bash
git diff --check
git add listing.txt
git diff --cached
git commit -m "merge: resolve practice sale price"
git log --oneline --graph --decorate --all -8
git status
```

最终选择 25000 是本练习明确给出的业务决定，不是“总选较小数字”的通用规则。真实冲突需要产品与数据依据。

## 8. 常见错误与排查路径

### 8.1 完整故障记录：提交了旧暂存版本

| 阶段 | 内容 |
| --- | --- |
| 现象 | 页面工作区显示 240 元，提交却记录 260 元 |
| 证据 | 提交前 cached diff 是 26000；working diff 是 24000 |
| 原因 | 暂存后再次编辑，没有重新选择工作区变化 |
| 修复 | 不改写既有提交；先决定 24000 是否属于新变化，再单独暂存和提交 |
| 复验 | `git show HEAD` 与预期提交一致；工作区变化仍可见且未丢失 |

### 8.2 错误矩阵

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 普通 diff 为空但有新文件 | status 显示 `??` | 文件未跟踪 | 检查内容后精确 add | cached diff 显示文件 |
| ignore 不生效 | status 显示文件已 tracked | 规则只影响未跟踪文件 | 停止并按真实仓库流程处理 | `check-ignore` 与状态符合预期 |
| 切分支被拒绝 | Git 提示会覆盖变化 | 工作区未保护 | 提交到实验分支或 stash | 变化仍可恢复 |
| 合并后文件有标记 | 搜索到 `<<<<<<<` | 冲突未解决完整 | 做业务决定并删除全部标记 | `git diff --check` 通过 |
| status 干净但页面坏 | 运行结果失败 | 错误已被提交 | 建立修复提交并运行验证 | Git 与功能证据都通过 |
| 身份不正确 | `git config --local --list` | 使用了不合适配置 | 修改本仓库配置 | 新提交作者正确 |

### 8.3 明确错误示例

不要在有未知改动时执行：

```bash
git reset --hard
git clean -fd
```

前者会覆盖工作区与 index，后者会删除未跟踪文件。它们不是“让状态变绿”的普通清理命令。本课使用分支、精确暂存、`restore --staged`、stash 和 `merge --abort` 保留工作。

## 9. 课后题

<details>
<summary>1. 保存、暂存、提交分别改变哪一层？</summary>

保存把编辑器缓冲区写入工作区文件；`git add` 把选择内容写入暂存区；`git commit` 根据暂存区创建本地仓库提交。

</details>

<details>
<summary>2. 暂存 260 元后工作区改成 240 元，直接提交会记录什么？</summary>

提交记录暂存区的 260 元。240 元仍在工作区，除非再次暂存。应同时查看 working diff 和 cached diff。

</details>

<details>
<summary>3. 为什么新文件通常不显示在普通 git diff？</summary>

未跟踪文件还没有 Git 中的比较基线。`git status` 会显示它，暂存后 `git diff --cached` 才能展示它将进入提交的完整内容。

</details>

<details>
<summary>4. `.gitignore` 能删除已经提交的秘密吗？</summary>

不能。ignore 只影响匹配的未跟踪文件，不改写历史。秘密泄露还需要立即撤销或轮换凭据，并按仓库安全流程处理历史。

</details>

<details>
<summary>5. 合并冲突时为什么不能保留两边价格？</summary>

同一商品字段需要一个最终权威值。冲突标记要求人根据业务决定结果；机械保留两行会产生重复字段或语义矛盾。

</details>

<details>
<summary>6. `git merge --abort` 会删除两个分支的提交吗？</summary>

不会。它尝试把工作区和 index 恢复到合并开始前，两个分支已有提交仍存在。复杂的预存变化可能影响恢复，所以合并前仍应检查状态。

</details>

## 10. 实践练习

### 10.1 基础：完成一个双文件提交

在 `git-lab` 中同步修改 `index.html` 和 `listing.txt`，把价格改为 255 元与 25500 分。只暂存这两个文件，检查 cached diff 后提交。

运行：浏览器打开 HTML；Git 查看提交。预期显示和机器值一致，提交不含 README 或日志。失败时比较两份 diff。完成标准是功能与提交范围都通过。

参考答案要点：`git add index.html listing.txt`；提交前运行 `git diff --cached --check`；提交说明描述价格同步。

### 10.2 进阶：保护一次未完成实验

修改 README 并新建 `notes.txt`，使用带 `-u` 的 stash 保存；确认工作区干净后创建 `practice/readme` 分支，再恢复 stash。

预期 tracked 与 untracked 变化都可恢复。失败时先用 `git stash list` 和 `git stash show --stat` 定位，不执行清理命令。完成标准是文件内容未丢失且最终位于实验分支。

参考答案要点：`git stash push -u -m "wip: readme exercise"`，切分支后用 `git stash apply` 保留 stash 作为额外保险；确认成功后再决定是否删除 stash。

### 10.3 故障注入：冲突、中止、再解决

按第 7 节创建同一价格行冲突。第一次合并后记录标记并 `git merge --abort`；第二次合并选择明确最终值，清理标记并提交。

预期第一次回到合并前，第二次产生合并提交，历史图保留两条轨迹。完成标准是 `git status` 干净、`git diff --check` 通过、`rg '^(<<<<<<<|=======|>>>>>>>)'` 没有命中练习文件。

参考答案标准：记录必须说明最终价格依据，不能以“Git 选的”为理由。

## 11. 阶段验收

- [ ] 练习仓库位于个人 `git-lab`，与教材仓库分开。
- [ ] 用户身份只配置在本练习仓库。
- [ ] 能画出工作区、暂存区、HEAD 的状态流。
- [ ] 能用 working diff 与 cached diff 指出两份不同变化。
- [ ] 能解释未跟踪文件与 ignore 的边界。
- [ ] 提交前检查精确路径和空白错误。
- [ ] 提交后同时验证 Git 历史与页面行为。
- [ ] 能创建分支并读取历史图。
- [ ] 能制造冲突、识别标记并安全中止。
- [ ] 能再次合并、做业务决定并清除全部标记。
- [ ] 没有使用硬重置、强制清理、远端推送或全局身份修改。

提交证据：三棵树对照、首次提交详情、ignore 验证、分支图、冲突前后 status、`merge --abort` 记录和最终合并复验。

## 12. 常见问题

**Git status 干净就是作业完成吗？**

不是。它只说明当前文件状态相对提交没有变化。仍要运行页面、检查 200/404 和业务值。

**每次都不能使用 `git add .` 吗？**

命令本身合法，但必须先确认整个目录都是本次范围。初学阶段精确路径更容易建立审计习惯。

**提交错说明要立即改写历史吗？**

个人尚未共享的练习可学习更正，但本课优先保留记录并建立清楚的新提交。共享历史的修改要遵循团队规则，不能擅自强推。

**分支会复制一套文件占双倍空间吗？**

分支主要是指向提交的引用，共享相同历史对象。切换时工作区呈现目标快照，不等于手工复制目录。

**冲突标记删掉就完成了吗？**

不够。必须确认最终业务内容、运行检查、暂存解决结果并提交。删除标记但保留错误价格仍是错误修复。

## 13. 扩展阅读

以下官方资料于 **2026-10-11** 核验：

- [Pro Git：Recording Changes](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)：查 tracked、staged、commit 与 ignore。
- [Pro Git：Git Branching](https://git-scm.com/book/en/v2/Git-Branching-Branches-in-a-Nutshell)：查分支指针和 HEAD。
- [Pro Git：Basic Branching and Merging](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)：查合并和冲突。
- [git status](https://git-scm.com/docs/git-status)：查短格式与状态含义。
- [git diff](https://git-scm.com/docs/git-diff)：查工作区、index 和提交之间的比较。
- [git restore](https://git-scm.com/docs/git-restore)：查 working tree 与 staged 的不同恢复目标。
- [git stash](https://git-scm.com/docs/git-stash)：查 `-u`、apply 与冲突边界。
- [gitignore](https://git-scm.com/docs/gitignore)：查模式优先级和已跟踪文件边界。

## 我现在能做到什么

我能指出一个文件在工作区、暂存区和 HEAD 中的不同版本，能提交精确范围并用分支保护实验。我也能把合并冲突当作业务决定现场，先安全中止，再在证据充分时解决，而不会用破坏性命令换取表面干净。

## 单元导航

[上一课：终端、进程与端口](01-terminal-processes-ports.md) · [下一课：证据驱动的调试闭环](03-evidence-driven-debugging-loop.md) · [运行到修复路线](../README.md#从运行现场到可追踪修复) · [起步实操目录](../README.md)
