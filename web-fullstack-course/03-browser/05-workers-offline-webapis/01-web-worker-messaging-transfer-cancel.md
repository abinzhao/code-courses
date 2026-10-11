# Web Worker：消息、所有权转移与可取消计算

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个在 Worker 中统计整数分价格、支持请求关联和立即取消的商品分析页 |
| 文件 | `browser-lab/server.mjs`、`public/index.html`、`public/main.js`、`public/stats-worker.js` |
| 运行方式 | `node server.mjs ./public`，访问 `http://127.0.0.1:3300` |
| 可观察证据 | 计算时输入框仍响应、转移后主线程 buffer 变为 0 字节、取消后旧结果不提交 |
| 数据约束 | 价格为非负 `Int32` 整数分；结果提交前校验请求 ID |
| 性能边界 | Worker 降低主线程阻塞风险，但启动、消息和复制/转移都有成本 |
| 安全边界 | Worker 与页面同源加载；消息仍是不可信边界，不处理私人数据 |
| 证据边界 | 本机输入仍响应只证明该场景主线程未被计算占满，不代表所有设备收益 |
| 建议时间 | 阅读 35 分钟，实验 45 分钟，练习 30 分钟 |

## 1. 任务背景

邻里集市导入大量商品后要计算平均价格。直接在主线程遍历几百万条记录会占用事件循环，输入和点击无法及时处理。Web Worker 提供独立执行环境，可以把纯计算移出主线程。

Worker 不是“让算法免费变快”。它不能直接访问 DOM，页面和 Worker 要通过消息交换数据。默认结构化克隆可能复制大缓冲；Transferable 可以转移所有权，但转移后发送方不应继续使用原缓冲。

## 2. 学习目标

- 区分主线程职责、Worker 全局环境和消息边界；
- 用请求 ID 关联结果，拒绝迟到消息；
- 比较结构化克隆与 `ArrayBuffer` 所有权转移；
- 正确处理 `message`、`error`、`messageerror` 和 `terminate()`；
- 解释为什么取消消息不能立即打断 Worker 内长同步循环；
- 用同条件测量判断 Worker 是否值得引入。

## 3. 预备知识

需要会使用 ES 模块、TypedArray、事件监听和页面生命周期。Worker 脚本必须通过 HTTP 加载，不能假定任意 `file:` URL 可运行。

先按[浏览器卷实验契约](../README.md#多文件实验怎样启动)创建目录。本课提供独立静态服务；端口冲突时先确认占用者。

## 4. 核心理论

### 4.1 Worker 隔离了执行环境

Dedicated Worker 由一个页面创建，拥有独立全局对象和事件循环。它能使用计时器、Fetch 和部分 Web API，但没有 `document`，不能直接修改页面。

```text
页面：收集输入 → 校验 → postMessage
Worker：解析消息 → 计算 → postMessage
页面：校验请求 ID 与结果 → 更新 DOM
```

隔离减少主线程计算时间，不减少总 CPU。低端设备上过多 Worker 还会争用核心与内存。

### 4.2 结构化克隆不是 JSON

`postMessage` 使用结构化克隆算法，支持 TypedArray、Map、Date 等类型，也能保留部分循环引用；函数、DOM 节点等不能任意克隆。克隆大缓冲会复制字节。

将 `buffer` 放入 transfer list 后，底层内存所有权交给接收端。发送端的 `ArrayBuffer.byteLength` 变为 0，这叫 detached，不是故障。

### 4.3 请求关联防止旧结果

取消、重启或多次计算都可能产生迟到消息。页面维护 `activeRequestId`，只接受当前 ID。Worker 也回传同一 ID；未知类型和非法字段直接返回结构化错误。

### 4.4 取消模型

长同步循环运行期间，Worker 事件循环无法处理后续 `cancel` 消息。可靠选择有：

- 把计算分片，在片间检查取消标志；
- 使用 `SharedArrayBuffer` + Atomics，但需要跨源隔离和更复杂协议；
- 直接 `terminate()`，丢弃整个 Worker，再按需重建。

本课采用第三种，语义明确：取消当前所有 Worker 工作。

### 4.5 是否使用 Worker 要测量

比较同一数据量下：

- 主线程长任务与输入延迟；
- Worker 启动到结果总耗时；
- 克隆或转移耗时；
- 峰值内存；
- 取消和重建成本。

若计算只需 2 ms，Worker 往返成本可能更高。

## 5. 元素、属性、API 或配置清单

| API / 状态 | 作用 | 边界 |
| --- | --- | --- |
| `new Worker(url, { type: "module" })` | 创建模块 Worker | URL 应由同源服务提供 |
| `worker.postMessage(value, transfer)` | 发送克隆数据并可转移所有权 | 转移后发送方 buffer detached |
| `message` | 接收成功反序列化的消息 | 仍需验证结构和请求 ID |
| `messageerror` | 消息反序列化失败 | 应恢复按钮和可见状态 |
| `error` | Worker 脚本或运行错误 | 不应留下永久 pending |
| `worker.terminate()` | 立即终止 Worker | 不执行 Worker 内 finally |
| `self.close()` | Worker 自行结束 | 由 Worker 决定 |
| `Int32Array` | 存放整数分 | 上限约 21 亿分；总和另行检查 |
| `ArrayBuffer.byteLength` | 检查转移后状态 | 变为 0 表示所有权已转移 |

## 6. 最小可运行案例

### 6.1 `server.mjs`

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? "./public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, "." + (
      pathname.endsWith("/") ? `${pathname}index.html` : pathname
    ));
    const type = types[extname(file)];
    if (!file.startsWith(root + sep) || !type) {
      send(res, 404, "text/plain; charset=utf-8", "资源不存在");
      return;
    }
    send(res, 200, type, await readFile(file));
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 500;
    send(res, status, "text/plain; charset=utf-8", "无法读取实验资源");
  }
}).listen(3300, "127.0.0.1", () => {
  console.log(`实验根目录：${root}`);
  console.log("打开 http://127.0.0.1:3300");
});
```

### 6.2 `public/index.html`

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>Worker 商品统计</title>
<main>
  <h1>邻里集市价格统计</h1>
  <label for="count">模拟商品数量</label>
  <select id="count">
    <option value="100000">10 万</option>
    <option value="2000000" selected>200 万</option>
    <option value="8000000">800 万</option>
  </select>
  <button id="run" type="button">开始统计</button>
  <button id="cancel" type="button">取消统计</button>
  <label for="note">计算时尝试输入</label>
  <input id="note" autocomplete="off">
  <p id="status" role="status">准备就绪</p>
  <p>转移后主线程 buffer：<output id="buffer-size">尚未发送</output></p>
</main>
<script type="module" src="./main.js"></script>
</html>
```

### 6.3 `public/main.js`

```js
const countSelect = document.querySelector("#count");
const runButton = document.querySelector("#run");
const cancelButton = document.querySelector("#cancel");
const status = document.querySelector("#status");
const bufferSize = document.querySelector("#buffer-size");

let worker;
let nextRequestId = 1;
let activeRequestId = 0;

function setIdle(message) {
  runButton.disabled = false;
  status.textContent = message;
}

function createWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./stats-worker.js", import.meta.url), {
    type: "module",
  });
  worker.addEventListener("message", (event) => {
    const result = event.data;
    if (result?.requestId !== activeRequestId) return;
    activeRequestId = 0;
    if (result.ok) {
      setIdle(
        `有效商品 ${result.count} 件，平均 ${result.averageCents} 分，` +
        `Worker 计算 ${result.durationMs.toFixed(1)} ms`,
      );
    } else {
      setIdle(`统计失败：${result.error}`);
    }
  });
  worker.addEventListener("messageerror", () => {
    activeRequestId = 0;
    setIdle("Worker 消息无法解析，已停止本次统计");
  });
  worker.addEventListener("error", () => {
    activeRequestId = 0;
    worker?.terminate();
    worker = undefined;
    setIdle("Worker 运行错误，下一次会重建");
  });
  return worker;
}

runButton.addEventListener("click", () => {
  if (activeRequestId) return;
  const count = Number(countSelect.value);
  const seed = new Int32Array([100]);
  const requestId = nextRequestId;
  nextRequestId += 1;
  activeRequestId = requestId;
  runButton.disabled = true;
  status.textContent = `正在统计 ${count} 件，可继续输入`;
  const buffer = seed.buffer;
  createWorker().postMessage({
    type: "sum-generated-prices",
    requestId,
    count,
    seedBuffer: buffer,
  }, [buffer]);
  bufferSize.value = `${buffer.byteLength} 字节（0 表示种子已转移）`;
});

cancelButton.addEventListener("click", () => {
  if (!activeRequestId) return;
  activeRequestId = 0;
  worker?.terminate();
  worker = undefined;
  setIdle("统计已取消；Worker 已终止，旧结果不会提交");
});

window.addEventListener("pagehide", () => {
  activeRequestId = 0;
  worker?.terminate();
  worker = undefined;
});
```

### 6.4 `public/stats-worker.js`

```js
self.addEventListener("message", (event) => {
  const message = event.data;
  if (
    message?.type !== "sum-generated-prices" ||
    !Number.isInteger(message.requestId) ||
    message.requestId < 1 ||
    !Number.isInteger(message.count) ||
    message.count < 0 ||
    !(message.seedBuffer instanceof ArrayBuffer)
  ) {
    self.postMessage({
      requestId: message?.requestId ?? 0,
      ok: false,
      error: "消息结构不合法",
    });
    return;
  }

  const seed = new Int32Array(message.seedBuffer);
  if (seed.length !== 1 || seed[0] < 0) {
    self.postMessage({
      requestId: message.requestId,
      ok: false,
      error: "价格种子不合法",
    });
    return;
  }

  const startedAt = performance.now();
  let total = 0;
  for (let index = 0; index < message.count; index += 1) {
    const priceCents = seed[0] + (index % 50000);
    total += priceCents;
    if (!Number.isSafeInteger(total)) {
      self.postMessage({
        requestId: message.requestId,
        ok: false,
        error: "总价超出安全整数范围",
      });
      return;
    }
  }

  self.postMessage({
    requestId: message.requestId,
    ok: true,
    count: message.count,
    averageCents: message.count ? Math.round(total / message.count) : 0,
    durationMs: performance.now() - startedAt,
  });
});
```

运行：

```bash
cd browser-lab
node server.mjs ./public
```

选择 200 万后开始，立即在输入框打字；输入应保持响应。页面显示种子 buffer 为 0 字节。
数百万条价格的生成与统计都在 Worker 内完成。选择 800 万后快速取消，状态应立即恢复；再次
开始会创建新 Worker，旧结果不会出现。

## 7. 邻里集市集成案例

适合移入 Worker 的是纯计算，例如公开商品价格分布、客户端导入预检、图片像素处理。网络请求、DOM 更新和对象授权不应因为“用了 Worker”而混在计算协议里。

推荐消息契约：

```text
请求: { type, requestId, schemaVersion, payload/buffer }
成功: { requestId, ok: true, result, durationMs }
失败: { requestId, ok: false, errorCode, safeMessage }
```

页面在发送前移除不需要的私人字段。Worker 脚本仍属于应用代码，不能获得本不应暴露给前端的数据。离线时 Worker 可以分析已有快照，但不能把结果当成服务端库存或授权结论。

性能报告至少比较“主线程直接计算”和“Worker + 消息往返”的总耗时、Long Task、输入响应与
内存；Worker 内 `durationMs` 已包含数据生成和统计，但仍不包含启动与消息往返。

## 8. 常见错误与排查路径

### 错误示例：发送取消消息后等待同步循环处理

```js
// 错误：Worker 正在长循环时不能及时处理这条消息。
worker.postMessage({ type: "cancel", requestId });
```

### 错误示例：转移后继续读取

```js
worker.postMessage({ buffer: prices.buffer }, [prices.buffer]);
console.log(prices[0]); // 所有权已转移，不能依赖该视图继续工作。
```

### 诊断记录

| 字段 | 记录 |
| --- | --- |
| 现象 | 点击取消后仍过几秒显示旧统计结果 |
| 证据 | 旧 Worker 完成消息的 requestId 小于当前 activeRequestId |
| 原因 | 只修改按钮状态，没有终止计算，也没有校验结果归属 |
| 修复 | `terminate()` 旧 Worker、清空 active ID，提交前比较 requestId |
| 复验 | 800 万条开始后立即取消 10 次，旧结果均不出现，再次统计可成功 |

排查顺序：先看 Worker 脚本是否 200，再看 Console 的 `error`，然后核对消息结构、请求 ID、buffer 是否 detached、按钮是否在所有失败分支恢复。

## 9. 课后题

1. **Worker 为什么不能直接更新 DOM？**
   答：它运行在独立全局环境，没有页面 `document`；DOM 所有权留在主线程。
2. **结构化克隆和 Transferable 的主要差别是什么？**
   答：前者复制可克隆值，后者把特定底层资源所有权移交，减少复制但使发送方资源失效。
3. **为何取消消息不能立刻中断同步循环？**
   答：Worker 要等当前任务结束才能处理下一条消息。
4. **请求 ID 解决什么问题？**
   答：关联响应与当前意图，阻止旧 Worker 或旧任务结果提交。
5. **Worker 能代替服务端对象授权吗？**
   答：不能。客户端代码和数据都不可信，授权必须由后端执行。

## 10. 实践练习

### 基础：统计最小值与最大值

在同一次遍历中返回最低和最高整数分。

**验收答案：**空数组有明确定义；不增加第二次全量遍历；页面验证返回值为安全整数。

### 进阶：分片协作取消

把循环改为每处理 10 万条后让出一次任务，并检查 Worker 内取消集合。

**验收答案：**取消消息能在分片间生效；完成与取消只提交一次；总结果与同步算法一致。

### 故障注入：价格种子不合法

发送长度不为 1 或值为负数的 `Int32Array` 种子。

**验收答案：**Worker 返回结构化失败，页面恢复按钮，不开始大循环、不崩溃、不提交部分结果。

## 11. 阶段验收

- [ ] 四个文件可运行，计算期间输入仍可操作；
- [ ] 转移后主线程 buffer 显示 0 字节；
- [ ] 取消会终止并在下次重建 Worker；
- [ ] `message`、`messageerror`、`error` 都有恢复路径；
- [ ] 价格与总和验证整数和安全范围；
- [ ] 能说明 Worker 总成本、离线快照和服务端授权边界；
- [ ] 未把本机输入可响应写成所有设备上的性能结论。

## 12. 常见问题

**一个页面应创建多少 Worker？**
没有固定答案。按 CPU 核心、任务粒度、内存和真实测量决定；不要每个列表项一个。

**转移 TypedArray 后还能转回来吗？**
可以把同一 buffer 在结果消息中再次转移，但每次只有一方拥有可用底层内存。

**SharedWorker 是否更适合跨标签页？**
它可共享执行环境，但支持、生命周期和调试更复杂；先确认跨页共享确有价值。

**Worker 一定让总耗时更短吗？**
不一定。它主要保护主线程响应性，总耗时可能因启动和通信增加。

## 13. 扩展阅读

- [HTML Standard: Web workers](https://html.spec.whatwg.org/multipage/workers.html)
- [MDN: Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [MDN: Structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
- [MDN: Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)

资料快照日期：2026-10-11。实验未验证低端真实设备、跨源隔离、SharedArrayBuffer、Safari/Firefox 或生产构建的 Worker 打包行为。

## 我现在能做到什么

我能为纯计算建立有版本的 Worker 消息协议，选择克隆或转移，处理异常与取消，并用主线程响应性和总成本而非单一计算时间判断收益。

## 单元导航

[上一章：请求、流与实时通信](../README.md#04-请求流与实时通信) · [本章目录](../README.md#05-worker离线与平台能力) · [下一课：Service Worker 生命周期与缓存](02-service-worker-lifecycle-cache.md)
