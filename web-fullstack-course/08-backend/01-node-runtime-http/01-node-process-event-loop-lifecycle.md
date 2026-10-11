# Node 进程、事件循环与生命周期：先知道谁拥有退出

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 从模块求值开始观察 Node 进程，复现事件循环阻塞，并画出启动与退出责任 |
| 练习目录 | `$HOME/code/market-backend-lab/node-http` |
| 运行条件 | Node.js 24 LTS，只使用标准库 |
| 主要产物 | `src/order-probe.mjs`、`src/blocking-probe.mjs`、`evidence/runtime.md` |
| 成功证据 | 微任务先于后续计时器执行；正常探针退出码为 0；移除忙循环后漂移恢复 |
| 失败证据 | 同步忙循环使 50 ms 计时器出现至少约 200 ms 的额外延迟 |
| 环境边界 | 本课不监听端口、不发 HTTP、不证明数据库或并发请求正确 |

## 1. 任务背景

后端进程不是“从第一行一直跑到最后一行”的脚本。入口模块先被解析和求值；顶层代码可以注册计时器、
启动网络监听或排队微任务；只要仍有被引用的句柄，事件循环就会继续工作。终端按下
`Ctrl+C`、编排系统发送 SIGTERM、某个 Promise 未处理拒绝，也都会改变进程生命周期。

如果不知道谁启动资源、谁停止资源，就容易出现两种相反错误：

- 进程过早退出，端口还没来得及监听；
- 进程永远不退出，测试或发布一直等待残留计时器和连接。

本课先用可观察探针建立模型。HTTP 服务放到后两课，避免把路由错误、网络错误和进程错误混在一起。

## 2. 学习目标

完成本课后，你能够：

1. 区分模块解析/求值、当前调用栈、微任务、计时器和 I/O 回调；
2. 解释 `async` 为什么不会自动把 CPU 计算移到其他线程；
3. 用计时器漂移复现同步阻塞，而不是凭感觉判断“卡”；
4. 区分 `process.exitCode` 与立即 `process.exit()`；
5. 说明 `beforeExit`、`exit`、SIGINT、SIGTERM 的用途和边界；
6. 为每个长生命周期资源指定启动者、停止者和硬截止时间；
7. 记录实际 Node 版本、命令、退出码与未验证范围。

## 3. 预备知识

先阅读[版本基线](../../00-guide/version-baseline.md)和
[邻里集市统一项目契约](../../00-guide/project-contract.md)。本课只使用源码内探针，
没有商品 JSON 输入；第二课一旦接收 HTTP 正文，就必须先保持为 `unknown` 再解析。

创建读者自己的目录：

```bash
mkdir -p "$HOME/code/market-backend-lab/node-http/src"
mkdir -p "$HOME/code/market-backend-lab/node-http/evidence"
cd "$HOME/code/market-backend-lab/node-http"
node --version
```

预期主版本为 `v24`。把实际完整输出写入 `evidence/runtime.md`，不要把教材版本表复制成机器证据。

## 4. 核心理论

### 4.1 入口模块先完成同步求值

Node 载入 ESM 时先解析依赖图，再按依赖顺序求值。顶层同步代码仍会占用当前 JavaScript 线程。
顶层 `await` 可以暂停依赖模块的完成，但也会让导入它的模块等待；它不是后台任务。

```text
解析模块图 -> 求值依赖 -> 求值入口
                         -> 注册异步工作
                         -> 当前调用栈清空
                         -> 事件循环继续调度
```

不要在模块顶层执行大文件同步读取、昂贵密码计算或长循环。它们会推迟所有路由和健康检查启动。

### 4.2 微任务与事件循环阶段

Promise 回调与 `queueMicrotask` 进入微任务队列；计时器、I/O 和 `setImmediate` 在事件循环的不同阶段被处理。
当前 JavaScript 回调结束后，Node 会清空相关微任务，再继续后续阶段。

`setTimeout(fn, 0)` 不是“立刻执行”，只表示达到最小等待条件后有资格进入计时器阶段。
在主模块、I/O 回调和不同平台负载下，零延时计时器与 `setImmediate` 的先后不应被业务依赖。

`process.nextTick` 还有 Node 特有队列。递归排入 `nextTick` 会饿死 I/O，因此普通业务优先使用
Promise/`queueMicrotask` 表达微任务，并避免无界递归。

### 4.3 异步 I/O不等于 CPU 并行

网络、文件和部分系统工作可由操作系统或 libuv 协助等待；回调最终仍回到事件循环执行 JavaScript。
下面的函数即使标记 `async`，忙循环仍在主线程同步运行：

```js
async function wrong() {
  while (performance.now() < deadline) {
    // 仍然阻塞。
  }
}
```

CPU 密集任务需要先测量，再考虑 Worker Threads、独立任务进程或算法改进。把函数加上 `async`
不会改变其同步部分。

### 4.4 什么让进程继续存活

监听中的服务器、活动 socket、被引用的计时器等句柄会让事件循环继续。`timer.unref()` 表示该计时器
不应单独阻止进程退出；它不取消计时器，也不保证回调一定执行。

当没有更多被引用工作时，Node 可能触发 `beforeExit`。如果监听器又安排异步工作，进程会继续；
所以不能把它当可靠的服务停机信号。`exit` 事件发生时只能做同步收尾，不能期望新的异步 I/O 完成。

### 4.5 信号不是异常

SIGINT 常来自交互终端的 `Ctrl+C`，SIGTERM 常来自服务管理器。注册监听器后，应用接管默认退出行为，
必须自己停止资源并设置结果。信号可能重复到达，所以停机函数应幂等。

致命程序错误与正常信号不同。`uncaughtException` 后进程状态可能不可信，不能记录后继续长期服务。
可以用 `uncaughtExceptionMonitor` 补充脱敏日志，让默认致命行为仍然发生；真正的资源排空策略要在
进程管理和服务启动器中设计。

### 4.6 生命周期所有权表

每个长生命周期资源至少回答：

| 资源 | 谁创建 | 正常停止 | 强制停止 | 证据 |
| --- | --- | --- | --- | --- |
| HTTP server | `server.mjs` | `server.close()` | 截止时关闭剩余连接 | 信号日志与退出码 |
| 空闲连接 | Node HTTP server | `closeIdleConnections()` | `closeAllConnections()` | 新请求被拒、旧请求结束 |
| 数据库池 | 后续数据访问模块 | `pool.end()` | 进程硬截止 | 池状态与无泄漏测试 |
| 队列 worker | 后续可靠性模块 | 停止取新任务并等待当前任务 | 超时中止 | job 状态 |
| 普通计时器 | 创建它的模块 | `clearTimeout()` | 进程退出 | 活动句柄检查 |

本章只真实实现前两项，其余是后续章节的责任，不能提前写成已完成。

## 5. 元素、属性、API 或配置清单

| API / 项目 | 用途 | 可观察证据 | 边界 |
| --- | --- | --- | --- |
| `process.argv` | 读取入口参数 | 探针打印受控参数 | 参数仍需解析 |
| `process.env` | 读取环境字符串 | 值为 `string \| undefined` | 不是可信配置对象 |
| `process.exitCode` | 让自然排空后带状态退出 | shell 的 `$?` | 不会立刻退出 |
| `process.exit()` | 立即终止 | 可能截断输出 | 服务正常停机不首选 |
| `queueMicrotask` | 排入微任务 | 位于同步日志之后、计时器之前 | 无界递归会饿死后续工作 |
| `setTimeout` | 到期后安排回调 | 可测漂移 | 不是精确实时调度器 |
| `setImmediate` | 在 check 阶段安排回调 | 与 timer 都在同步栈后 | 不依赖跨上下文固定顺序 |
| `process.hrtime.bigint()` | 单调高精度测量 | 计算耗时 | 不是日历时间 |
| `performance.now()` | 单调毫秒测量 | 漂移与耗时 | 不持久化为业务时间 |
| `SIGINT` / `SIGTERM` | 请求进程停止 | 信号名、停机阶段 | 可能重复到达 |
| `beforeExit` | 事件循环将自然结束 | 短脚本可观察 | 不是容器停机钩子 |
| `exit` | 最终同步通知 | 只做同步记录 | 异步操作不会完成 |
| `uncaughtExceptionMonitor` | 观察致命错误 | 脱敏错误类别 | 不表示可以继续服务 |

## 6. 最小可运行案例

创建完整文件 `src/order-probe.mjs`：

```js
const events = [];

function record(name) {
  events.push(name);
  console.log(name);
}

record("1 module:start");

queueMicrotask(() => record("3 microtask:queueMicrotask"));
Promise.resolve().then(() => record("4 microtask:promise"));

setTimeout(() => {
  record("timer:setTimeout");
  console.log(JSON.stringify({ events }));
}, 0);

setImmediate(() => record("check:setImmediate"));

record("2 module:end");
```

运行：

```bash
cd "$HOME/code/market-backend-lab/node-http"
node src/order-probe.mjs
printf 'exit=%s\n' "$?"
```

可判定结果：

- `1 module:start` 和 `2 module:end` 最先按顺序出现；
- 两个微任务都在 timer/immediate 前出现；
- timer 与 immediate 的相对顺序只记录实际值，不作为跨环境断言；
- 进程自然退出，退出码为 `0`。

这个案例观察调度顺序，不代表多请求吞吐量，也不包含 HTTP。

## 7. 邻里集市集成案例

### 7.1 建立配置解析边界

即使是本地 API，端口也不应直接相信环境字符串。创建完整文件 `src/runtime-config.mjs`：

```js
/**
 * @param {unknown} raw
 * @returns {number}
 */
export function parsePort(raw) {
  if (raw === undefined) return 3000;
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) {
    throw new Error("PORT must contain decimal digits");
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("PORT must be an integer from 1024 to 65535");
  }
  return port;
}

export const runtimeConfig = Object.freeze({
  host: "127.0.0.1",
  port: parsePort(process.env.PORT),
});
```

环境变量来自进程外部，因此在 `parsePort` 入口按 `unknown` 对待。它通过结构检查后才成为数字。
本课程监听 `127.0.0.1`，只允许本机实验；容器章节会解释为何容器常监听 `0.0.0.0`，
但监听地址从来不能替代认证或授权。

验证：

```bash
node -e 'import("./src/runtime-config.mjs").then(m => console.log(m.runtimeConfig))'
PORT=3100 node -e 'import("./src/runtime-config.mjs").then(m => console.log(m.runtimeConfig))'
PORT=19.9 node -e 'import("./src/runtime-config.mjs")'
```

前两条预期分别含端口 `3000`、`3100`；第三条应非零退出并说明端口格式错误。
不要通过 `parseInt("19.9")` 静默得到另一个合法端口。

### 7.2 记录生命周期责任

在 `evidence/runtime.md` 记录：

```markdown
# Node 运行时证据

- 日期：
- `node --version` 原始输出：
- `order-probe` 命令与退出码：
- 实际 timer/immediate 顺序：
- 有效 PORT 结果：
- 非法 PORT 错误摘要与退出码：
- 当前没有启动的资源：HTTP、数据库、队列
```

空字段必须由学习者填写实际结果。模板本身不是通过证据。

## 8. 常见错误与排查路径

### 8.1 明确错误示例：把同步忙循环包装成 `async`

创建完整文件 `src/blocking-probe.mjs`：

```js
import { performance } from "node:perf_hooks";

const timerStartedAt = performance.now();

setTimeout(() => {
  const elapsedMs = performance.now() - timerStartedAt;
  console.log(JSON.stringify({
    expectedMs: 50,
    actualMs: Math.round(elapsedMs),
    driftMs: Math.round(elapsedMs - 50),
  }));
}, 50);

async function pretendAsyncCpuWork(durationMs) {
  const deadline = performance.now() + durationMs;
  while (performance.now() < deadline) {
    // 故意阻塞：仅用于本地故障实验。
  }
}

await pretendAsyncCpuWork(300);
console.log("busy loop finished");
```

运行：

```bash
node src/blocking-probe.mjs
```

五段记录：

| 项目 | 判断 |
| --- | --- |
| 现象 | 50 ms 计时器大约 300 ms 后才执行 |
| 证据 | `actualMs` 与 `driftMs` 明显高于目标；保留实际值 |
| 原因 | `async` 函数在第一个真正让出点之前仍同步执行，忙循环占用 JavaScript 线程 |
| 修复 | 删除请求线程中的忙循环；真实 CPU 工作先测量，再拆分或交给 Worker/任务进程 |
| 复验 | 注释 `await pretendAsyncCpuWork(300)` 后重跑，漂移应显著下降 |

不要把阈值写成每台机器都精确 `300`。调度负载会变化，本实验判断的是“故障前后有明显差异”。

### 8.2 用 `process.exit()` 强行让测试变绿

**现象：** 最后一行日志偶尔缺失，文件或响应写入被截断。
**证据：** 把 `process.exit(0)` 删除后，自然排空能输出完整内容。
**原因：** 立即退出没有等待异步缓冲和资源收尾。
**修复：** 设置 `process.exitCode`，停止资源，让事件循环自然排空。
**复验：** shell 退出码正确，末尾日志稳定存在。

### 8.3 在 `exit` 事件里启动异步清理

**现象：** `exit` 回调运行了，但其中的 Promise/计时器没有完成。
**证据：** 同步日志存在，异步日志缺失。
**原因：** `exit` 阶段不能继续事件循环。
**修复：** 在 SIGTERM/SIGINT 处理器中提前执行异步停机。
**复验：** 第三课发送信号后能观察到排空完成。

### 8.4 递归 `process.nextTick`

**现象：** 计时器和 I/O 长时间不执行。
**证据：** 停止递归排队后后续回调恢复。
**原因：** nextTick 队列持续补充，事件循环无法进入其他阶段。
**修复：** 删除无界递归，按批次让出，或重设算法边界。
**复验：** 计时器漂移回到可接受范围。

## 9. 课后题

**问题 1：`async function` 是否一定异步？**
答案标准：指出调用立即返回 Promise，但函数在第一个实际等待/让出点前仍同步执行；CPU 忙循环仍阻塞。

**问题 2：为什么不能依赖零延时 timer 永远先于 `setImmediate`？**
参考答案：两者属于不同阶段，调用上下文和系统调度会影响顺序；业务应只依赖明确的因果关系。

**问题 3：`process.exitCode = 1` 与 `process.exit(1)` 的关键区别是什么？**
参考答案：前者允许已有工作自然排空后以 1 退出；后者立即终止，可能截断异步输出和清理。

**问题 4：为什么 `beforeExit` 不是可靠的服务停机钩子？**
参考答案：它只在事件循环将自然结束时触发；监听端口的服务通常不会自然空闲，SIGTERM 也有独立语义。

## 10. 实践练习

### 基础：增加命令行参数探针

让 `order-probe.mjs` 输出 `process.argv.slice(2)`，以
`node src/order-probe.mjs listing-1` 运行。

可判定标准：

- 输出只含业务参数 `listing-1`，不把 Node 路径和脚本路径误当参数；
- 原有微任务顺序断言仍成立；
- 退出码为 0。

### 进阶：按批次让出长计算

把 300 ms 工作拆成多个小批次，每批后通过 `setImmediate` 让出，再记录计时器漂移。

可判定标准：

- 总工作仍完成；
- 计时器漂移显著小于同步忙循环版本；
- 没有声称这比 Worker 更适合所有 CPU 任务；
- 记录两次实际数据，而不是只写“更快”。

### 故障注入：非法环境配置

依次使用 `PORT=0`、`PORT=65536`、`PORT=abc` 导入配置。

可判定标准：

1. 三条命令都非零退出；
2. 默认未设置时为 3000；
3. `PORT=3100` 成功；
4. 没有通过 `Number(raw) || 3000` 把非法值静默改成默认值；
5. 记录现象、证据、原因、修复和复验。

## 11. 阶段验收

按顺序执行并填写 `evidence/runtime.md`：

```bash
cd "$HOME/code/market-backend-lab/node-http"
node --version
node src/order-probe.mjs
node src/blocking-probe.mjs
PORT=3100 node -e 'import("./src/runtime-config.mjs").then(m => console.log(m.runtimeConfig))'
PORT=bad node -e 'import("./src/runtime-config.mjs")'
```

通过标准：

- 记录了真实 Node 24 补丁版本；
- 同步日志、微任务和后续阶段的关系符合理论；
- 阻塞探针有可比较漂移，恢复后漂移明显下降；
- 有效/非法端口分支都有退出码证据；
- 能给 HTTP server、连接和计时器指定生命周期拥有者；
- 没有把本课写成 HTTP、数据库或生产停机已通过。

## 12. 常见问题

**微任务是否越多越高效？**
不是。微任务会在进入后续阶段前被清空，无界微任务同样可能延迟 I/O。

**可以用 `Date.now()` 测耗时吗？**
能粗略观察，但系统时钟可能调整。持续时间优先使用 `performance.now()` 或 `hrtime`；
业务时间才使用 UTC 时间点。

**捕获 `uncaughtException` 后继续运行可以提升可用性吗？**
通常不可以。未知错误可能破坏进程状态；应脱敏记录、停止接流量、由进程管理器拉起新实例。

**怎样知道还有哪些句柄阻止退出？**
先审查自己创建的服务器、socket、计时器、池和 worker。测试工具可辅助报告 open handles，
但不要依赖未公开内部 API 作为生产逻辑。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Node.js Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)：阶段与调度概览。
- [Node.js ESM](https://nodejs.org/api/esm.html)：模块解析、求值与顶层 await。
- [Node.js Process](https://nodejs.org/api/process.html)：退出码、信号与进程事件。
- [Node.js Timers](https://nodejs.org/api/timers.html)：timer、immediate、ref 与 unref。
- [Node.js Worker Threads](https://nodejs.org/api/worker_threads.html)：CPU 并行边界。
- [Node.js Diagnostics](https://nodejs.org/api/perf_hooks.html)：单调计时与事件循环诊断接口。

## 我现在能做到什么

我能从模块求值开始解释 Node 进程，使用可复验的计时器漂移识别同步阻塞，区分自然退出、信号停机和
致命错误，并为后续 HTTP server、连接和计时器明确启动者与停止者。

## 单元导航

[返回章目录](../README.md#01-node-运行时与-http) ·
[上一单元：工程化综合验收](../../07-engineering/07-engineering-capstone/04-clean-room-verification-evidence.md) ·
[下一课：HTTP 请求、响应、流与背压](02-http-request-response-streams.md)
