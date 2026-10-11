# 超时、错误与优雅停机：停止接流量，再排空连接

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 为原生 HTTP API 增加分层超时、协议错误处理、幂等信号停机和强制截止 |
| 练习目录 | `$HOME/code/market-backend-lab/node-http` |
| 主要产物 | 最终 `src/server.mjs`、`evidence/shutdown.md` |
| 成功证据 | 正常请求不受影响；SIGTERM 后停止接新连接，已有短请求排空，进程退出 0 |
| 失败证据 | 半开请求、占用端口、重复信号和超过截止时间的连接有明确非成功证据 |
| 环境标签 | **本机 HTTP、内存教学数据、无 TLS/代理/数据库** |

## 1. 任务背景

开发服务器常靠 `Ctrl+C` 结束，生产服务却可能在发布、缩容、机器维护和故障恢复时收到 SIGTERM。
如果进程立即退出，正在返回的响应会被截断；如果只调用 `server.close()` 却没有截止时间，
恶意或故障连接可能让旧实例迟迟不退出。

超时也不是一个数字解决全部问题：

- 请求头可以极慢；
- 正文可以迟迟不结束；
- 已接收请求的业务处理可能等待下游；
- 空闲 keep-alive 连接可能占着资源；
- 停机排空需要比平台强杀窗口更短的截止时间。

本课把每个预算的责任写清，并完成以下停机状态机：

```text
RUNNING
  --SIGTERM/SIGINT-->
CLOSING: 标记不健康/停止接受新连接
  -> 关闭空闲连接
  -> 等待在途短请求
  -> 正常排空：退出 0
  -> 超过截止：销毁剩余连接，记录超时，再退出
```

## 2. 学习目标

完成本课后，你能够：

1. 区分 headers、request body、socket inactivity、下游调用和 shutdown timeout；
2. 解释为什么 Node server 的请求超时不自动限制全部业务处理；
3. 为坏请求、客户端中断和未知程序错误选择不同处理；
4. 在信号到达时先停止接流量，再排空连接；
5. 让重复 SIGTERM 复用同一个停机 Promise；
6. 使用硬截止防止无限等待，并记录强制断开的事实；
7. 避免在致命异常后长期继续提供服务；
8. 用命令、PID、时间、退出码和客户端结果证明停机行为。

## 3. 预备知识

先完成[上一课](02-http-request-response-streams.md)，确保以下文件存在：

```text
src/runtime-config.mjs
src/http-app.mjs
src/dev-server.mjs
```

保留 `dev-server.mjs` 作为第二课的最小启动记录；本课创建正式 `server.mjs`，以后只用后者验收。
检查端口和工具：

```bash
cd "$HOME/code/market-backend-lab/node-http"
node --version
curl --version
lsof -nP -iTCP:3000 -sTCP:LISTEN || true
```

`nc`/`netcat` 只用于可选的慢头故障实验；本机没有该工具时记录“未执行”，不要安装未知脚本或伪造结果。

## 4. 核心理论

### 4.1 超时必须对应一个等待阶段

| 预算 | 防护对象 | 不能替代 |
| --- | --- | --- |
| `headersTimeout` | 完整请求头迟迟不到 | 正文大小限制 |
| `requestTimeout` | 整个请求（含正文）迟迟未接收完 | 业务处理/数据库查询截止 |
| socket inactivity timeout | 连接一段时间没有活动 | 端到端请求 SLA |
| `keepAliveTimeout` | 响应后空闲 keep-alive | 在途请求排空 |
| 下游 deadline | fetch/数据库/队列等待 | server 接收超时 |
| shutdown deadline | 旧实例最多排空多久 | 每个请求自己的预算 |

预算要满足外层大于内层并留出清理时间。例如平台给 20 秒，应用可在 12 秒强制断开，留下日志刷新和进程退出窗口。
本文数字是教学起点，不是所有生产系统的通用答案。

### 4.2 客户端错误与程序错误

客户端坏 JSON、未知路由、超限正文属于预期协议错误，映射为 4xx。端口占用、磁盘损坏、
不变量被破坏或未知异常属于服务端问题，不能把内部错误文本回给用户。

请求级 `try/catch` 可以隔离预期错误，但不能把所有 `Error` 都变成 200。致命未捕获异常表示程序状态未知；
记录允许字段后让进程终止，由外部管理器替换实例更稳妥。

### 4.3 `server.close()` 的语义

`server.close()` 停止接受新连接，并在符合 Node 当前语义的连接关闭后调用回调。
仍可能有长请求、升级连接或应用自己持有的其他资源。`closeIdleConnections()` 可主动关闭空闲 keep-alive；
`closeAllConnections()` 或显式销毁 socket 是截止时的最后手段，不应一收到信号就调用。

停机过程必须幂等：第二个信号只记录“已在停止”，不能重复关闭池、重复结束响应或创建多个截止计时器。

### 4.4 readiness 与 liveness 不同

liveness 回答“进程是否还活着”，readiness 回答“是否应该继续接收新业务流量”。
本章只实现 `/health/live`，并在 handler 的 `isClosing()` 分支对已有 keep-alive 新请求返回 503。
完整部署还应提供 readiness 并让负载均衡器先摘流；没有代理环境时不能宣称摘流已经验证。

### 4.5 不用日志制造数据泄露

停机日志需要阶段、信号、连接数、耗时和 requestId，不需要 Cookie、Authorization、请求正文或完整环境变量。
错误对象也不能直接 `JSON.stringify(error)` 期待得到安全且完整的结果；显式选择 `name/message/code`
并对生产消息脱敏。

## 5. 元素、属性、API 或配置清单

| API / 配置 | 教学值 | 责任与证据 |
| --- | ---: | --- |
| `server.headersTimeout` | 5,000 ms | 限制完整请求头等待 |
| `server.requestTimeout` | 10,000 ms | 限制请求接收总时长 |
| `server.keepAliveTimeout` | 2,000 ms | 限制响应后的空闲复用 |
| `server.setTimeout` | 15,000 ms | socket 无活动时销毁 |
| `server.close()` | 信号后调用一次 | 停止新连接并等待排空 |
| `closeIdleConnections()` | 进入停机后调用 | 关闭空闲 keep-alive |
| `closeAllConnections()` | 12,000 ms 截止时调用 | 强制结束残留 HTTP 连接 |
| `connection` 事件 | 维护 socket 集合 | 观察/销毁残留连接 |
| `clientError` 事件 | 处理解析层坏请求 | 返回最小 400 或断开 |
| `AbortSignal.timeout()` | 后续下游调用预算 | 不会自动取消任意库 |
| `process.once` | 监听 SIGINT/SIGTERM | 每类信号最多触发一次监听器 |
| 停机 Promise | 模块内单例 | 重复信号复用相同过程 |
| `uncaughtExceptionMonitor` | 只记录允许字段 | 不阻止默认致命退出 |
| `process.exitCode` | 正常/失败退出状态 | 允许事件循环完成收尾 |

## 6. 最小可运行案例

用下面完整文件替代临时启动职责，创建 `src/server.mjs`：

```js
import http from "node:http";
import { createRequestHandler } from "./http-app.mjs";
import { runtimeConfig } from "./runtime-config.mjs";

const SHUTDOWN_DEADLINE_MS = 12_000;
const sockets = new Set();
let closing = false;
let shutdownPromise;

const log = (record) => console.log(JSON.stringify({
  time: new Date().toISOString(),
  ...record,
}));

const server = http.createServer(createRequestHandler({
  isClosing: () => closing,
  log,
}));

server.headersTimeout = 5_000;
server.requestTimeout = 10_000;
server.keepAliveTimeout = 2_000;
server.setTimeout(15_000, (socket) => {
  log({ event: "socket_timeout" });
  socket.destroy();
});

server.on("connection", (socket) => {
  sockets.add(socket);
  socket.once("close", () => sockets.delete(socket));
});

server.on("clientError", (error, socket) => {
  log({
    event: "client_error",
    code: typeof error.code === "string" ? error.code : "UNKNOWN",
  });
  if (socket.writable) {
    socket.end(
      "HTTP/1.1 400 Bad Request\r\n" +
      "Connection: close\r\n" +
      "Content-Length: 0\r\n\r\n",
    );
  } else {
    socket.destroy();
  }
});

server.on("error", (error) => {
  log({
    event: "server_error",
    code: typeof error.code === "string" ? error.code : "UNKNOWN",
  });
  process.exitCode = 1;
});

function shutdown(signal) {
  if (shutdownPromise !== undefined) {
    log({ event: "shutdown_already_started", signal });
    return shutdownPromise;
  }

  closing = true;
  const startedAt = performance.now();
  log({ event: "shutdown_started", signal, openSockets: sockets.size });

  shutdownPromise = new Promise((resolve) => {
    let deadlineExceeded = false;
    const deadline = setTimeout(() => {
      deadlineExceeded = true;
      log({
        event: "shutdown_deadline_exceeded",
        openSockets: sockets.size,
      });
      server.closeAllConnections();
      for (const socket of sockets) socket.destroy();
      process.exitCode = 1;
      resolve();
    }, SHUTDOWN_DEADLINE_MS);
    deadline.unref();

    server.close((error) => {
      clearTimeout(deadline);
      if (error) {
        log({ event: "shutdown_close_error", message: error.message });
        process.exitCode = 1;
      } else if (deadlineExceeded) {
        log({
          event: "shutdown_forced_connections_closed",
          durationMs: Math.round(performance.now() - startedAt),
        });
      } else {
        log({
          event: "shutdown_completed",
          durationMs: Math.round(performance.now() - startedAt),
        });
      }
      resolve();
    });
    server.closeIdleConnections();
  });

  return shutdownPromise;
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("uncaughtExceptionMonitor", (error, origin) => {
  log({
    event: "uncaught_exception",
    origin,
    name: error.name,
    message: "fatal application error",
  });
});

server.listen(runtimeConfig.port, runtimeConfig.host, () => {
  log({
    event: "listening",
    url: `http://${runtimeConfig.host}:${runtimeConfig.port}`,
  });
});
```

运行：

```bash
node src/server.mjs
```

另一个终端执行：

```bash
curl -i http://127.0.0.1:3000/api/v1/health/live
curl -i http://127.0.0.1:3000/api/v1/missing
```

预期仍为 200 和 404。日志包含 UTC 时间、事件或请求允许字段，不含请求正文及凭证。

## 7. 邻里集市集成案例

### 7.1 正常信号停机

在一个终端后台启动并保存该 shell 创建的 PID：

```bash
cd "$HOME/code/market-backend-lab/node-http"
node src/server.mjs > evidence/server.log 2>&1 &
SERVER_PID=$!
printf 'pid=%s\n' "$SERVER_PID"
curl -i http://127.0.0.1:3000/api/v1/listings
kill -TERM "$SERVER_PID"
wait "$SERVER_PID"
printf 'exit=%s\n' "$?"
```

这是练习目录中的运行日志，不应提交到教材仓库。正常无在途请求时，预期：

- `shutdown_started` 只出现一次；
- `shutdown_completed` 在 12 秒前出现；
- shell 退出码为 0；
- 停机后新 curl 连接失败，而不是得到伪造 200。

连接失败是“实例已停止”的预期证据，不要把它记录成 API 404。

### 7.2 重复信号

服务运行时快速发送两种信号：

```bash
kill -TERM "$SERVER_PID"
kill -INT "$SERVER_PID" 2>/dev/null || true
```

第二条可能因进程已经退出而失败，也可能记录 `shutdown_already_started`。两种都要按实际结果记录。
可判定目标是没有重复创建停机流程、没有未处理异常、没有把不存在的输出写成通过。

### 7.3 端口占用

保持一个实例运行，再从另一终端启动第二个：

```bash
node src/server.mjs
printf 'exit=%s\n' "$?"
```

第二个实例预期记录 `EADDRINUSE` 并非零退出。修复是停止自己拥有的旧实例或选择明确新端口，
不是随机杀死占用端口的未知进程。

### 7.4 证据模板

`evidence/shutdown.md`：

```markdown
# 停机证据

- 日期与 Node 版本：
- 启动命令、PID、监听端口：
- SIGTERM 发送时间：
- shutdown_started / completed 实际时间：
- 停机期间客户端观察：
- 进程退出码：
- 重复信号结果：
- 端口占用结果：
- 未执行的慢头/强制截止实验及原因：
- 未验证：代理摘流、TLS、数据库池、容器强杀窗口
```

## 8. 常见错误与排查路径

### 8.1 明确错误：收到 SIGTERM 立即 `process.exit(0)`

错误写法：

```js
process.on("SIGTERM", () => process.exit(0));
```

| 项目 | 记录 |
| --- | --- |
| 现象 | 在途 curl 得到截断响应或连接重置 |
| 证据 | 客户端非零退出，服务端没有 `shutdown_completed` |
| 原因 | 进程没有停止接流量和等待现有响应完成 |
| 修复 | 标记 closing，调用 `server.close()` 与 `closeIdleConnections()`，设置硬截止 |
| 复验 | 短请求完成，新连接失败，进程在截止时间内自然退出 |

### 8.2 只有 `server.close()`，没有硬截止

**现象：** 发布一直等待旧进程退出。
**证据：** PID 长时间存在，仍有活动 socket。
**原因：** 长连接或故障客户端没有结束。
**修复：** 外层提供比平台窗口短的 shutdown deadline，截止时记录并销毁残留连接。
**复验：** 故障连接最多存活到截止；退出码/日志表明发生了强制阶段。

### 8.3 用一个 10 秒数字声称覆盖全部超时

**现象：** 请求头能限制，但下游 fetch/数据库查询仍无限等待。
**证据：** server 请求已完整接收，handler 卡在另一个 Promise。
**原因：** 接收超时和业务下游 deadline 属于不同阶段。
**修复：** 为支持取消的下游传入独立 `AbortSignal.timeout()`，事务和查询使用各自预算。
**复验：** 故障下游在预算内失败并映射为可观察错误；本章不虚构数据库结果。

### 8.4 捕获致命异常后继续服务

**现象：** 进程打印错误后仍接请求，但内存状态可能不完整。
**证据：** 注册 `uncaughtException` 监听器吞掉异常。
**原因：** 把未知程序错误当可恢复业务错误。
**修复：** 请求边界只映射已知错误；致命错误脱敏记录后退出并由外部替换。
**复验：** 独立故障进程非零退出，不继续监听端口。

### 8.5 可选慢头实验

若本机有 `nc`，连接后只输入不完整请求头并等待超过 5 秒。预期连接被关闭或收到 408，具体行为取决于
Node 24 补丁与客户端。记录原始字节和版本，不把某一种文本写成跨版本保证。

## 9. 课后题

**问题 1：为什么 `requestTimeout` 不能替代数据库查询超时？**
参考答案：它约束请求接收阶段；正文已收完后，handler 等数据库属于另一个等待，需要独立 deadline。

**问题 2：为什么强制关闭连接应放在截止时间，而不是信号一到就执行？**
参考答案：先给在途短请求完成机会，减少用户可见失败；只有超过预算才牺牲残留连接保证发布可结束。

**问题 3：正常停机时 readiness 应怎样变化？**
答案标准：先变为不可接流量，再等待代理摘流和本地连接排空；liveness 可在进程仍活着时保持不同语义。

**问题 4：重复 SIGTERM 为什么必须幂等？**
参考答案：平台、人和超时机制都可能重复发信号；重复关闭资源会引发异常、提前断开或覆盖证据。

## 10. 实践练习

### 基础：增加 readiness

增加 `GET /api/v1/health/ready`，正常返回 200，`closing` 后在已有 keep-alive 请求上返回 503。

可判定标准：

- liveness 与 readiness 不是同一字段改名；
- readiness 不检查尚不存在的数据库；
- 关闭后不再宣称可接流量；
- 明确说明没有负载均衡器时只验证应用状态。

### 进阶：给一个可取消下游添加预算

创建只在练习中使用的 `fetchWithDeadline`，使用 `AbortSignal.timeout(200)` 请求一个可控慢本地端点。

可判定标准：

- 超时映射为稳定服务错误，而不是永远等待；
- 调用方 signal 与超时 signal 的组合策略写清；
- 正常请求仍成功；
- 没有把取消写成“远端一定回滚”。

### 故障注入：保持一个连接超过停机截止

仅在读者自有本机实验中建立不结束的连接，再发送 SIGTERM。

可判定标准：

1. `shutdown_started` 后进程仍短暂存在；
2. 约 12 秒到达截止并记录 `shutdown_deadline_exceeded`；
3. 残留连接被销毁；
4. 退出结果明确标为强制阶段，不伪装正常排空；
5. 恢复普通请求后正常停机仍为 0。

## 11. 阶段验收

- [ ] Node 24 实际补丁版本已记录。
- [ ] 正常健康、列表、创建、404 和 413 行为未因启动器重构而回归。
- [ ] headers、request、socket、keep-alive、下游和 shutdown 六类预算责任可区分。
- [ ] SIGTERM 停机先标记 closing，再 close server，再关空闲连接。
- [ ] 正常短请求能排空，超过截止的连接会被强制销毁并留下证据。
- [ ] 重复信号不会创建第二套停机流程。
- [ ] 端口占用非零退出，不误杀未知进程。
- [ ] 日志不含 Cookie、Authorization、正文、连接字符串或堆栈。
- [ ] 致命异常不会被吞掉后继续长期服务。
- [ ] 未验证的代理摘流、TLS、数据库池、容器窗口被明确列出。

## 12. 常见问题

**为什么截止计时器要 `unref()`？**
它不应在所有资源已正常关闭后单独阻止进程退出；仍有 socket 时，其他句柄会让进程活到截止。

**`closeAllConnections()` 是否覆盖 WebSocket？**
不要这样假设。升级连接需要应用显式追踪和关闭；本章没有实现 WebSocket。

**收到 SIGKILL 能否优雅停机？**
不能。SIGKILL 不能被进程捕获。平台必须先给 SIGTERM 窗口，数据一致性也不能依赖最终一定执行清理。

**日志输出完成是否等于日志平台已持久化？**
不等于。stdout、采集代理和远端存储还有各自缓冲；生产需要单独验证日志链路。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Node.js HTTP Server](https://nodejs.org/api/http.html#class-httpserver)：超时、连接关闭与 server 事件。
- [Node.js Process Signals](https://nodejs.org/api/process.html#signal-events)：信号与默认退出行为。
- [Node.js Errors](https://nodejs.org/api/errors.html)：系统错误码和未捕获异常。
- [Node.js AbortSignal](https://nodejs.org/api/globals.html#class-abortsignal)：timeout 与取消协作。
- [RFC 9112](https://www.rfc-editor.org/rfc/rfc9112)：HTTP/1.1 消息与连接管理。
- [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)：仅作后续停机窗口参考，本课未运行 Kubernetes。

## 我现在能做到什么

我能为 HTTP 接收、空闲连接、下游调用和停机分别设置责任清楚的预算，处理坏请求而不泄露内部信息，
并用幂等信号流程停止接流量、排空短请求、在硬截止销毁残留连接，同时如实记录尚未验证的部署边界。

## 单元导航

[返回本章 Hub](../01-node-runtime-http.md) ·
[上一课：HTTP 请求、响应、流与背压](02-http-request-response-streams.md) ·
[下一章：Nest API 与输入验证](../02-nest-api-validation.md)
