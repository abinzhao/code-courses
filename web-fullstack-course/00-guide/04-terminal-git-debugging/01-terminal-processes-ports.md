# 01 终端、进程与端口：知道命令在哪里、由谁运行

## 任务卡

邻里集市首页在你的电脑上运行正常，同伴却在另一个目录执行 `node server.mjs`，得到“找不到文件”；他又启动两次服务，第二次出现 `EADDRINUSE`。你的任务是从 Shell、当前目录、参数、退出状态一路追到进程和端口，并只停止自己确认过的服务。

| 关卡 | 可见成果 | 验收证据 |
| --- | --- | --- |
| 找到目录 | 命令在正确位置执行 | 当前目录与文件列表 |
| 读懂命令 | 含空格参数被正确引用 | 参数输出对照 |
| 运行进程 | 本机服务监听指定端口 | PID、地址与端口记录 |
| 安全停止 | 只终止自己的教学服务 | `Ctrl+C` 与端口释放复验 |

建议用 90～120 分钟。命令必须在个人练习目录执行，不要在教材仓库初始化项目或创建运行文件。

## 1. 任务背景

编辑器把文字保存为文件，终端把命令交给 Shell。Shell 解析命令名和参数，操作系统创建进程；进程读取文件、环境变量和当前目录，也可能监听端口。

```text
你输入命令
  → Shell 解析引号、参数和变量
  → 操作系统寻找可执行程序
  → 创建进程并继承环境与当前目录
  → 进程输出结果、监听端口或退出
  → Shell 得到退出状态
```

同一条 `node server.mjs` 在不同目录中可能读取不同文件或直接失败。端口占用也不是 HTML 错误，而是另一个进程已经拥有监听入口。先确认层次，再采取动作。

## 2. 学习目标

完成后，你应能：

- 区分终端、Shell、命令、参数和进程。
- 读取并改变当前工作目录，解释相对路径基准。
- 为含空格和特殊字符的参数正确加引号。
- 区分标准输出、标准错误和退出状态。
- 读取并临时设置环境变量，不把秘密写入命令记录。
- 解释前台进程、后台进程、PID 和信号。
- 查出 3000 端口由哪个进程监听。
- 优先使用 `Ctrl+C` 安全停止自己启动的服务。
- 识别 `ENOENT`、命令不存在、`EADDRINUSE` 和连接失败。
- 为邻里集市留下可交接的启动、停止和端口恢复记录。

## 3. 预备知识

先按[文件到请求路线](../README.md#从文件到请求证据)完成前三篇详细教程，保留个人目录：

```text
market-learning/
└── market-start/
    ├── index.html
    └── server.mjs
```

需要 Node.js 24 LTS。macOS 默认 Shell 常为 zsh，Windows 常用 PowerShell；本课分别给出命令。不要把 Bash/zsh 变量语法原样粘到 PowerShell，也不要反过来。

本课只操作自己创建的练习进程。遇到陌生 PID、系统服务或公司管理进程时停止操作，先确认归属。

## 4. 核心理论

### 4.1 终端与 Shell 不是同一个概念

终端提供输入输出界面，Shell 解释命令。macOS 的 Terminal、iTerm 或编辑器集成终端都可能运行 zsh；Windows Terminal 可以承载 PowerShell、命令提示符或其他 Shell。

先识别实际 Shell：

macOS / zsh：

```bash
echo "$SHELL"
```

PowerShell：

```powershell
$PSVersionTable.PSVersion
```

教程中的提示符符号不需要输入。命令输出也不是下一条命令。

### 4.2 当前工作目录决定相对路径

macOS / Linux：

```bash
pwd
ls -la
cd market-learning
```

PowerShell：

```powershell
Get-Location
Get-ChildItem -Force
Set-Location market-learning
```

运行：

```bash
node server.mjs
```

Node.js 会把 `server.mjs` 解释为相对当前目录的脚本路径。若当前目录是 `market-learning`，而脚本位于 `market-start`，命令会寻找错误位置。可以选择：

```bash
cd market-start
node server.mjs
```

或者从上级明确写：

```bash
node market-start/server.mjs
```

上一章的服务用 `import.meta.url` 定位同目录 `index.html`。这与 Shell 查找入口脚本的基准不同：

```text
Shell：从当前目录查找 server.mjs
server.mjs：从脚本自身 URL 查找 index.html
```

### 4.3 引号控制参数边界

假设目录名是 `my web practice`。错误示例：

```bash
cd my web practice
```

Shell 会把它拆成多个参数，`cd` 无法把整段当作一个目录。正确写法：

```bash
cd "my web practice"
```

PowerShell 同样可以使用：

```powershell
Set-Location "my web practice"
```

引号不是目录名的一部分，而是 Shell 语法。不要通过把空格改成反斜杠、删除任意字符或移动目录来掩盖对参数边界的误解。

还要区分单引号与双引号。zsh 中双引号通常允许变量展开，单引号通常按字面量处理：

```bash
name="邻里集市"
printf '%s\n' "$name"
printf '%s\n' '$name'
```

输出分别是变量值和字面量 `$name`。PowerShell 的单、双引号也有相似的插值差异，但具体转义规则应按 PowerShell 文档核对。

### 4.4 标准输出、标准错误与退出状态

进程通常有三条标准流：

| 名称 | 编号 | 用途 |
| --- | ---: | --- |
| 标准输入 | 0 | 接收输入 |
| 标准输出 | 1 | 正常结果 |
| 标准错误 | 2 | 诊断与错误 |

退出状态是进程结束后交给 Shell 的整数。约定上 0 表示成功，非 0 表示失败，但具体数值由程序定义。

macOS / zsh：

```bash
node --version
echo $?
```

PowerShell：

```powershell
node --version
$LASTEXITCODE
```

必须紧接着读取状态；再运行别的命令后，状态代表的是新命令。前台服务器持续运行时尚未退出，Shell 也就没有新的退出状态。

“终端出现文字”不等于成功。程序可以把错误写到标准错误，也可能错误地以 0 退出；要结合消息和状态判断。

### 4.5 环境变量是进程输入

环境变量由父进程传给子进程，适合配置端口、运行模式等。它不是自动保密机制；命令历史、进程检查、日志或截图都可能暴露值。

zsh 为单次命令设置：

```bash
MARKET_PORT=3200 node process-lab.mjs
```

PowerShell 当前会话设置并清理：

```powershell
$env:MARKET_PORT = "3200"
node process-lab.mjs
Remove-Item Env:MARKET_PORT
```

本课变量只有公开端口，不放密码、Token、Cookie 或真实个人数据。浏览器端环境变量以后还会有“构建后公开”的边界。

### 4.6 进程、PID 与前台运行

程序是磁盘上的可执行代码，进程是一次运行实例。每个进程有 PID。启动两个 Node.js 服务会创建两个 PID，即使入口文件相同。

前台运行时：

- 终端暂时不会出现新的 Shell 提示符；
- 标准输出和错误直接显示在当前终端；
- `Ctrl+C` 通常发送 `SIGINT`，让程序有机会清理后退出。

关闭终端窗口可能终止进程，也可能因终端和任务配置不同留下子进程。可复现说明应写清停止方式，而不是要求“关窗口试试”。

### 4.7 端口所有权来自监听进程

服务调用 `listen(3000, "127.0.0.1")` 后，操作系统为该进程建立监听入口。查看端口：

macOS：

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

PowerShell：

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

PowerShell 输出中的 `OwningProcess` 是 PID，再查询：

```powershell
Get-Process -Id 12345
```

`12345` 是教学示例，实际操作必须使用当前命令输出的 PID。macOS 的 `lsof` 会显示命令名和 PID。

调查顺序：

```text
确认端口
  → 找监听 PID
  → 查进程命令和启动来源
  → 确认是自己本次练习
  → 回原终端 Ctrl+C
  → 再查端口已释放
```

### 4.8 信号不是“强制关闭”的同义词

常见 Unix 信号：

| 信号 | 常见来源 | 程序机会 |
| --- | --- | --- |
| `SIGINT` | 终端 `Ctrl+C` | 可监听并做清理 |
| `SIGTERM` | 请求程序正常终止 | 可监听并做清理 |
| `SIGKILL` | 强制结束 | 无法捕获或清理 |

优先使用原终端的 `Ctrl+C`。确认是自己进程但原终端不可用时，macOS 可请求终止：

```bash
kill -TERM 12345
```

仍要替换为已核实的 PID。不要把 `kill -9`、`pkill node` 或“结束所有 Node”当常规修复；它可能中断其他项目并跳过清理。

Windows 可在确认归属后使用：

```powershell
Stop-Process -Id 12345
```

先不用 `-Force`，并在操作后复查端口。

### 4.9 错误消息指出故障层

| 关键字 | 常见含义 | 首查 |
| --- | --- | --- |
| `command not found` / 未识别命令 | Shell 找不到可执行程序 | 安装与 PATH |
| `MODULE_NOT_FOUND` | Node 找不到入口或导入模块 | 当前目录与路径 |
| `ENOENT` | 文件系统目标不存在 | 实际文件位置 |
| `EACCES` | 权限拒绝 | 文件/端口权限与归属 |
| `EADDRINUSE` | 地址端口已被监听 | 端口所有者 |
| `ERR_CONNECTION_REFUSED` | 没有服务接受连接 | 进程、地址和端口 |

不要看到任何错误都重装 Node.js。先读动作、错误码和具体目标。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `pwd` / `Get-Location` | 显示当前目录 | 运行前检查 | 不改变目录 |
| `ls -la` / `Get-ChildItem -Force` | 列出文件和隐藏项 | 检查脚本是否存在 | 输出不证明文件内容正确 |
| `cd` / `Set-Location` | 改变当前目录 | 进入练习目录 | 影响后续相对路径 |
| 引号 | 保持参数边界 | `"my web practice"` | 不属于实际路径名 |
| `$?` / `$LASTEXITCODE` | 读取退出状态 | 紧跟目标命令 | Shell 语义不同 |
| `process.cwd()` | Node 当前工作目录 | 记录运行基准 | 不等于脚本所在目录 |
| `import.meta.url` | 当前 ES 模块 URL | 定位同目录资源 | 不是终端当前目录 |
| `process.env` | 读取环境变量 | `process.env.MARKET_PORT` | 值来自外部且是字符串 |
| `process.pid` | 当前进程 PID | 输出到终端 | 每次运行通常不同 |
| `process.on` | 监听信号或事件 | 处理 `SIGINT` | `SIGKILL` 无法处理 |
| `server.listen` | 创建监听 | 指定 host 与 port | 地址占用会报错 |
| `server.close` | 停止接收新连接 | 信号处理时调用 | 活跃连接可能延迟退出 |
| `lsof` / `Get-NetTCPConnection` | 查看端口所有者 | 查询固定端口 | 结果需继续确认归属 |

## 6. 最小可运行案例

### 6.1 文件位置与完整代码

创建个人目录：

```text
market-learning/
└── process-lab/
    └── process-lab.mjs
```

`process-lab.mjs`：

```js
import { createServer } from "node:http";

const host = "127.0.0.1";
const portText = process.env.MARKET_PORT ?? "3200";
const port = Number(portText);

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error(
    `MARKET_PORT 必须是 1024 到 65535 的整数，当前值为 ${portText}`,
  );
  process.exitCode = 2;
} else {
  const server = createServer((request, response) => {
    const body = JSON.stringify({
      message: "process lab is running",
      pid: process.pid,
      method: request.method,
      url: request.url,
    });

    response.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(body);
  });

  server.on("error", (error) => {
    console.error("server-error", {
      code: error.code,
      message: error.message,
    });
    process.exitCode = 1;
  });

  process.on("SIGINT", () => {
    console.log("收到 SIGINT，停止接收新请求");
    server.close(() => {
      console.log("服务已安全停止");
      process.exitCode = 0;
    });
  });

  server.listen(port, host, () => {
    console.log("process-lab-started", {
      pid: process.pid,
      cwd: process.cwd(),
      script: import.meta.url,
      address: `http://${host}:${port}/`,
    });
  });
}
```

### 6.2 运行方式

终端先进入 `process-lab`，核对目录和文件。

zsh：

```bash
pwd
ls -la
MARKET_PORT=3200 node process-lab.mjs
```

PowerShell：

```powershell
Get-Location
Get-ChildItem -Force
$env:MARKET_PORT = "3200"
node process-lab.mjs
```

打开 `http://127.0.0.1:3200/`，页面应显示 JSON，其中 PID 与终端启动日志一致。

### 6.3 预期结果

- 启动日志包含 PID、当前目录、脚本 URL 和访问地址。
- 浏览器得到状态 200 和 JSON MIME。
- 终端保持前台运行。
- 按 `Ctrl+C` 后依次出现收到信号和安全停止消息。
- 再刷新浏览器会连接失败。

PowerShell 实验结束后清理变量：

```powershell
Remove-Item Env:MARKET_PORT
```

zsh 的单次命令变量只影响该次 `node` 进程，无需额外清理。

### 6.4 退出状态实验

把端口设置为无效值：

zsh：

```bash
MARKET_PORT=abc node process-lab.mjs
echo $?
```

PowerShell：

```powershell
$env:MARKET_PORT = "abc"
node process-lab.mjs
$LASTEXITCODE
Remove-Item Env:MARKET_PORT
```

预期错误写到标准错误，退出状态为 2，没有进程监听 3200。恢复为合法端口后服务可启动。

### 6.5 明确错误示例：重复监听

保持第一个服务运行，在第二个终端再次执行相同启动命令。第二个进程应输出 `EADDRINUSE` 并以非 0 状态结束。不要先终止全部 Node 进程；用端口命令确认监听 PID与第一个终端日志一致，再回第一个终端按 `Ctrl+C`。

## 7. 邻里集市集成案例

把同样的方法用于上一章 `market-start/server.mjs`。

### 7.1 建立启动记录

进入个人 `market-start`：

```bash
node server.mjs
```

记录：

```text
当前目录：个人 market-learning/market-start 的绝对路径
脚本：server.mjs
监听：http://127.0.0.1:3000/
页面：邻里集市九成新自行车
停止：原终端 Ctrl+C
边界：本机静态教学服务
```

不要在记录中复制操作系统用户名、公司目录或其他无关隐私；共享时可只保留从 `market-learning` 开始的相对路径。

### 7.2 证明端口归属

保持服务运行，另开终端：

macOS：

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

PowerShell：

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
```

核对 PID 后，访问首页并在 Network 确认 200。回原终端 `Ctrl+C`，再次执行端口查询。预期不再出现本次监听。

### 7.3 区分三个路径

| 路径 | 含义 | 示例 |
| --- | --- | --- |
| 文件系统路径 | Shell 与 Node 找脚本/文件 | `market-start/server.mjs` |
| URL 路径 | HTTP 服务匹配请求 | `/index.html` |
| 模块资源 URL | 脚本定位同目录资源 | `new URL("./index.html", import.meta.url)` |

把浏览器的 `/index.html` 输入 `cd` 不会进入磁盘目录；把磁盘绝对路径直接当 HTTP URL 也不会自动由服务提供。

### 7.4 故障复盘：端口占用

| 阶段 | 内容 |
| --- | --- |
| 现象 | 第二次启动报 `EADDRINUSE` |
| 证据 | 错误目标为 `127.0.0.1:3000`；端口查询显示第一个 Node PID |
| 原因 | 第一个教学服务仍在监听同一入口 |
| 修复 | 回第一个终端按 `Ctrl+C`，等待进程结束 |
| 复验 | 端口查询无监听；重新启动一次成功；首页返回 200 |

## 8. 常见错误与排查路径

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 找不到 `server.mjs` | 当前目录列表中无文件 | 运行目录错误 | 进入正确目录或写清相对路径 | 服务启动 |
| 命令不存在 | Shell 找不到 `node` | 未安装或 PATH 未配置 | 核对安装和新终端环境 | `node --version` 成功 |
| 路径含空格失败 | 命令被拆成多个参数 | 缺少引号 | 引用完整路径 | 当前目录正确 |
| 无效端口 | 脚本输出校验错误，状态 2 | 环境变量不是合法整数 | 使用合法端口 | 监听成功 |
| `EADDRINUSE` | 端口已有 LISTEN PID | 重复服务 | 确认并停止自己的旧进程 | 端口释放后启动成功 |
| 连接失败 | 无监听结果 | 服务没运行或地址不一致 | 启动并核对 host/port | Network 得到 200 |
| `Ctrl+C` 无效 | 焦点不在服务终端 | 信号未发给目标进程 | 激活原终端再发送 | 出现安全停止日志 |

固定排查顺序：

```text
确认 Shell
  → 确认当前目录
  → 确认命令与参数
  → 读取完整错误和退出状态
  → 查询进程与端口
  → 只处理已确认归属的进程
  → 重复原命令复验
```

## 9. 课后题

<details>
<summary>1. 为什么同一条 node server.mjs 在不同目录可能结果不同？</summary>

入口脚本是相对路径，Shell 从当前工作目录解析。当前目录不同，可能找到另一份同名文件或完全找不到目标。

</details>

<details>
<summary>2. `process.cwd()` 与 `import.meta.url` 分别表示什么？</summary>

`process.cwd()` 是进程当前工作目录，通常继承自启动它的 Shell；`import.meta.url` 是当前 ES 模块自身的位置。前者会随启动目录变化，后者跟脚本文件位置相关。

</details>

<details>
<summary>3. `EADDRINUSE` 为什么不是 HTML 错误？</summary>

错误发生在服务尝试监听地址和端口时，页面尚未参与响应。应查端口所有者，而不是改 HTML 标签。

</details>

<details>
<summary>4. 为什么不推荐 `pkill node`？</summary>

它可能匹配并终止所有 Node.js 进程，包括其他项目、编辑器插件或同伴任务。应先按端口找到 PID，确认归属，再优先从原终端正常停止。

</details>

<details>
<summary>5. 环境变量为什么不等于秘密保险箱？</summary>

它可能出现在 Shell 历史、进程环境、日志、截图或错误报告中。敏感值需要专门的凭据管理和最小暴露，不能仅靠“放在环境变量”就认为安全。

</details>

## 10. 实践练习

### 10.1 基础：从两个基准启动同一脚本

分别从 `market-learning` 和 `process-lab` 启动 `process-lab.mjs`。第一种写完整相对路径，第二种写文件名。记录两次 `process.cwd()` 和 `import.meta.url`。

预期：模块 URL 相同，当前目录不同。失败时先用目录命令定位。完成标准是能解释为什么脚本文件相同但 cwd 不同。

参考答案要点：从上级运行 `node process-lab/process-lab.mjs`；从子目录运行 `node process-lab.mjs`。

### 10.2 进阶：用环境变量切换端口

依次在 3201 和 3202 启动实验服务，每次先安全停止再切换。记录浏览器地址与端口查询。

预期：同一时间只有一个本课监听；切换后旧端口连接失败，新端口返回 JSON。完成标准是没有修改源码常量，也没有遗留后台进程。

参考答案要点：环境变量是字符串，脚本已转换并校验；每次 `Ctrl+C` 后复查旧端口。

### 10.3 故障注入：重复启动并恢复

在两个终端以 3200 启动服务，保留第二个的 `EADDRINUSE` 和退出状态。查询监听 PID，确认属于第一个终端，正常停止后重新启动第二个。

预期：第一个服务正常，第二个先失败；端口释放后第二个成功。完成标准是五阶段记录中包含 PID 归属和释放后的复查，且未使用全局杀进程命令。

参考答案要点：错误发生在监听阶段；修复对象是已确认的旧服务，不是 HTML、Node 安装或浏览器缓存。

## 11. 阶段验收

- [ ] 能说出实际终端和 Shell。
- [ ] 能显示当前目录并列出隐藏文件。
- [ ] 能从两个不同基准写出正确脚本路径。
- [ ] 能正确引用含空格的参数。
- [ ] 能区分标准输出、标准错误和退出状态。
- [ ] 能设置公开端口环境变量并在实验后清理。
- [ ] 能记录 Node 进程 PID、cwd、脚本 URL 和监听地址。
- [ ] 能查询 3000 或 3200 端口的监听进程。
- [ ] 能优先用 `Ctrl+C` 安全停止自己的服务。
- [ ] 能解释 `EADDRINUSE` 与连接失败的差异。
- [ ] 操作中没有终止陌生进程或使用全局杀进程命令。

提交证据：目录与文件列表、一次合法启动、一次退出状态 2、一次端口查询、一次安全停止和完整端口冲突复盘。

## 12. 常见问题

**服务运行时为什么不能继续在同一提示符输入命令？**

前台进程占用该终端会话。另开终端做只读查询，或停止服务后再输入下一条命令。

**端口号能随便选吗？**

需在有效范围内并避免已占用或受保护端口。本课限制为 1024～65535，仍要用查询确认是否可用。

**关闭浏览器会停止 Node 服务吗？**

不会。浏览器是客户端，Node 是独立进程。回运行服务的终端停止它。

**为什么退出状态有时读不到？**

服务仍在运行时尚未退出；或者你在读取状态前执行了别的命令。先结束目标进程，再立即读取 Shell 对应状态。

**能把端口写进 `.env` 吗？**

以后工具链会介绍配置文件。本课没有依赖和加载器，Node 不会因为文件名叫 `.env` 就自动读取它；直接使用当前 Shell 的公开环境变量即可。

## 13. 扩展阅读

以下官方资料于 **2026-10-11** 核验：

- [Node.js Process](https://nodejs.org/api/process.html)：查 `cwd`、`env`、PID、退出状态与信号事件。
- [Node.js HTTP](https://nodejs.org/api/http.html)：查服务监听、错误事件和关闭行为。
- [PowerShell about Quoting Rules](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_quoting_rules)：查单引号、双引号与变量展开。
- [PowerShell Get-NetTCPConnection](https://learn.microsoft.com/powershell/module/nettcpip/get-nettcpconnection)：查 Windows 端口和 OwningProcess。
- [POSIX Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)：查 Shell 词法、引用和退出状态基础。
- [Apple Terminal User Guide](https://support.apple.com/guide/terminal/welcome/mac)：查 macOS 终端操作。

## 我现在能做到什么

我能从当前目录、参数和环境解释一条命令怎样创建进程，能读取退出状态并证明端口由哪个 PID 监听。我也能安全停止自己启动的邻里集市服务，而不是通过终止所有进程制造新的问题。

## 单元导航

[上一课：DevTools 与第一份请求证据](../03-computer-first-page/03-devtools-first-request-evidence.md) · [下一课：Git 三棵树、提交与分支](02-git-three-trees-commits-branches.md) · [运行到修复路线](../README.md#从运行现场到可追踪修复) · [起步实操目录](../README.md)
