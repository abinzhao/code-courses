# 可读流与增量解析：从任意字节块恢复业务消息

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个逐条显示商品的 NDJSON 流读取器，能处理 UTF-8 跨块、残行、畸形行和取消 |
| 文件 | `browser-lab/server.mjs`、`browser-lab/public/index.html`、`browser-lab/public/main.js` |
| 运行方式 | `node server.mjs ./public` 后访问 `http://127.0.0.1:3300` |
| 可观察证据 | Network 流式请求、页面逐条新增、Console 的块大小与行号 |
| 协议 | UTF-8 编码的 NDJSON；每行一个 JSON 对象；最终允许换行 |
| 资源边界 | 单行最多 64 KiB、列表最多 1000 条、错误后取消 reader |
| 安全边界 | 流中的每一帧都不可信；限制类型、字段、单行和总条数，不输出私人内容 |
| 证据边界 | 本地分块只证明解析器不依赖块边界，不代表公网代理一定逐块转发 |
| 建议时间 | 阅读 35 分钟，实验 50 分钟，练习 30 分钟 |

## 1. 任务背景

邻里集市导出或搜索大量商品时，一次等待完整 JSON 数组会延迟首条结果，并要求客户端同时保留整个响应。流式响应可以更早处理数据，但它不会自动给出“每次回调正好一条商品”。

底层到达的是字节块。一个 UTF-8 汉字可能被切成两块；一行 JSON 可能跨三块；一个块也可能含五行。业务协议必须自己定义消息边界。本课使用 NDJSON：每行是一个完整 JSON 值，换行符是帧边界。

## 2. 学习目标

完成本课后，你能够：

- 解释 `Response.body`、reader、解码器和业务帧的层次；
- 使用流式 `TextDecoder` 正确恢复跨块 UTF-8 字符；
- 缓存未完成残行，逐行解析 NDJSON，并处理最后一行；
- 用大小、条数和类型验证限制不可信流；
- 理解浏览器 reader 的拉取节奏与服务端写入背压；
- 记录首条结果时间、总耗时和峰值缓冲边界，而不是只说“更快”。

## 3. 预备知识

需要理解 Promise、异步迭代思路、JSON 和 Fetch 的 `Response.ok`。请先完成[可靠 Fetch](01-reliable-fetch-timeout-cancel-race.md)，复用其中的 HTTP 错误与取消边界。

实验使用 Node.js 内置 HTTP，不需要第三方包。不要用 `file:` 打开页面；模块脚本和流请求都应经过同源 HTTP 服务。

## 4. 核心理论

### 4.1 四层边界不能混淆

```text
TCP/HTTP 传输字节
  ↓ 浏览器暴露 Uint8Array 块（边界不稳定）
TextDecoder 恢复 Unicode 文本
  ↓ 协议解析器按换行恢复 NDJSON 帧
JSON.parse 恢复对象
  ↓ 领域验证确认商品字段
页面提交可信的显示模型
```

任何两层都不能合并成“每块一个对象”。压缩、代理缓冲、网络拥塞和实现策略都会改变块大小。

### 4.2 流式解码为何需要状态

UTF-8 用一到四个字节表示一个码点。如果块在多字节序列中间结束，`decoder.decode(chunk)` 默认会把该块视为结束，可能产生替换字符。应使用：

```js
decoder.decode(chunk, { stream: true });
```

它让解码器保留未完成字节。读取结束后再调用一次 `decoder.decode()` 刷出剩余状态。

### 4.3 残片缓冲与帧上限

每次文本到达后拼到 `buffer`，只处理完整换行之前的部分，最后一段继续保留。若对方永远不发换行，无上限缓冲会耗尽内存，所以必须限制残片长度。限制值属于协议契约，应同时出现在服务端与客户端。

`buffer.length` 统计 UTF-16 code unit，不是网络字节数。中文、emoji 等内容可能让“字符数未超限”但 UTF-8 字节早已超限。完整案例同时维护尚未消费的原始字节数：每收到一个 `Uint8Array` 就累加 `byteLength`，处理一帧后减去该帧重新编码后的 UTF-8 字节数。结尾没有换行的最后一帧也必须执行同样的字节、条数和 JSON 校验。

### 4.4 背压不是“永远不积压”

浏览器只有在调用 `reader.read()` 时才继续消费；Stream 实现可据此调节内部队列。Node 的 `res.write()` 返回 `false` 表示写缓冲达到高水位，生产者应等待 `drain`。

背压只能沿支持它的链路传播。中间代理可能缓冲，UI 也可能因渲染太慢积压。因此客户端还要限制总条数，并批量更新复杂 DOM。

### 4.5 流式并不天然省内存

如果读取后仍把每个原始块、每一行文本和全部对象分别保存，峰值可能比一次 JSON 更高。真正的流式处理应尽快验证、转换、消费并释放中间表示。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 关键边界 |
| --- | --- | --- |
| `Response.body` | 暴露 `ReadableStream<Uint8Array>` | 某些响应或环境可能没有 body |
| `getReader()` | 锁定流并逐块读取 | 用完释放锁；错误时取消 |
| `reader.read()` | 返回 `{ value, done }` | `value` 不是业务帧 |
| `reader.cancel()` | 通知不再需要后续数据 | 不保证服务端业务回滚 |
| `TextDecoder` | 把 UTF-8 字节恢复成文本 | 跨块时用 `{ stream: true }` |
| `Content-Type` | 声明 `application/x-ndjson` | 客户端仍需验证实际内容 |
| `res.write()` | Node 分块写响应 | `false` 时等待 `drain` |
| `AbortController` | 用户停止读取 | UI 要保留明确的已取消状态 |
| `JSON.parse()` | 解析单行 | 解析成功不代表字段可信 |
| NDJSON 换行 | 业务帧边界 | JSON 字符串中的换行必须转义 |

## 6. 最小可运行案例

创建并保存以下完整文件。服务会故意按不规则字节长度发送，确保“阅读台灯”等 UTF-8 内容可能跨块。

### 6.1 `server.mjs`

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { once } from "node:events";

const root = resolve(process.argv[2] ?? "./public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};
const listings = [
  { id: "listing-1", title: "自行车", priceCents: 28000, version: 1 },
  { id: "listing-2", title: "咖啡机", priceCents: 19900, version: 1 },
  { id: "listing-3", title: "阅读台灯", priceCents: 3900, version: 2 },
  { id: "listing-4", title: "儿童书架", priceCents: 7600, version: 1 },
];

function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

async function writeChunk(res, chunk) {
  if (!res.write(chunk)) await once(res, "drain");
}

async function streamListings(url, res) {
  const malformed = url.searchParams.get("malformed") === "1";
  const delay = Math.min(
    500,
    Math.max(0, Number(url.searchParams.get("delay")) || 120),
  );
  const lines = listings.map((item) => JSON.stringify(item));
  if (malformed) lines.splice(2, 0, "{\"id\":\"broken\",");
  const payload = Buffer.from(`${lines.join("\n")}\n`, "utf8");
  const chunkSizes = [1, 2, 5, 3, 8, 1, 13, 4, 7];

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });

  let offset = 0;
  let index = 0;
  while (offset < payload.length && !res.destroyed) {
    const size = chunkSizes[index % chunkSizes.length];
    const next = payload.subarray(offset, Math.min(offset + size, payload.length));
    await writeChunk(res, next);
    offset += next.length;
    index += 1;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
  }
  if (!res.destroyed) res.end();
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end();
      return;
    }
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/api/v1/listings.ndjson") {
      await streamListings(url, res);
      return;
    }

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
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    const status = error?.code === "ENOENT" ? 404 : 500;
    send(res, status, "text/plain; charset=utf-8", "实验服务失败");
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
<title>NDJSON 商品流</title>
<main>
  <h1>邻里集市增量商品流</h1>
  <p>服务会故意切碎 UTF-8 字节和 JSON 行。</p>
  <label>
    <input id="malformed" type="checkbox">
    在第三条前注入畸形 JSON
  </label>
  <button id="start" type="button">开始读取</button>
  <button id="cancel" type="button">停止读取</button>
  <p id="status" role="status">尚未开始</p>
  <ol id="results"></ol>
</main>
<script type="module" src="./main.js"></script>
</html>
```

### 6.3 `public/main.js`

```js
const startButton = document.querySelector("#start");
const cancelButton = document.querySelector("#cancel");
const malformed = document.querySelector("#malformed");
const status = document.querySelector("#status");
const results = document.querySelector("#results");

const MAX_LINE_BYTES = 64 * 1024;
const MAX_ITEMS = 1000;
let controller;

function validateListing(value, lineNumber) {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    !Number.isSafeInteger(value.priceCents) ||
    value.priceCents < 0 ||
    !Number.isInteger(value.version) ||
    value.version < 1
  ) {
    throw new TypeError(`第 ${lineNumber} 行不是合法商品`);
  }
  return value;
}

async function* parseNdjson(response, signal) {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.body) throw new Error("当前响应没有可读流");
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/x-ndjson")) {
    throw new TypeError(`意外的 Content-Type：${type || "(空)"}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const encoder = new TextEncoder();
  let buffer = "";
  let pendingByteCount = 0;
  let lineNumber = 0;
  let itemCount = 0;

  try {
    while (true) {
      if (signal.aborted) throw signal.reason;
      const { value, done } = await reader.read();
      if (done) break;
      console.info("收到字节块", value.byteLength);
      pendingByteCount += value.byteLength;
      buffer += decoder.decode(value, { stream: true });
      if (pendingByteCount > MAX_LINE_BYTES && !buffer.includes("\n")) {
        throw new RangeError("单行超过 64 KiB，停止读取");
      }

      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const frame = buffer.slice(0, newline + 1);
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        pendingByteCount -= encoder.encode(frame).byteLength;
        lineNumber += 1;
        if (!line) continue;
        if (encoder.encode(line).byteLength > MAX_LINE_BYTES) {
          throw new RangeError(`第 ${lineNumber} 行过长`);
        }
        let valueFromLine;
        try {
          valueFromLine = JSON.parse(line);
        } catch {
          throw new SyntaxError(`第 ${lineNumber} 行不是完整 JSON`);
        }
        itemCount += 1;
        if (itemCount > MAX_ITEMS) {
          throw new RangeError(`商品超过 ${MAX_ITEMS} 条`);
        }
        yield validateListing(valueFromLine, lineNumber);
      }

      if (pendingByteCount > MAX_LINE_BYTES) {
        throw new RangeError("当前残片超过 64 KiB，停止读取");
      }
    }

    buffer += decoder.decode();
    const finalLine = buffer.replace(/\r$/, "");
    if (finalLine) {
      lineNumber += 1;
      if (pendingByteCount > MAX_LINE_BYTES) {
        throw new RangeError(`第 ${lineNumber} 行过长`);
      }
      let valueFromLine;
      try {
        valueFromLine = JSON.parse(finalLine);
      } catch {
        throw new SyntaxError(`第 ${lineNumber} 行不是完整 JSON`);
      }
      itemCount += 1;
      if (itemCount > MAX_ITEMS) {
        throw new RangeError(`商品超过 ${MAX_ITEMS} 条`);
      }
      yield validateListing(valueFromLine, lineNumber);
    }
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function appendListing(item) {
  const row = document.createElement("li");
  row.textContent = `${item.title}，${item.priceCents} 分，版本 ${item.version}`;
  results.append(row);
}

startButton.addEventListener("click", async () => {
  controller?.abort(new DOMException("重新开始", "AbortError"));
  controller = new AbortController();
  const myController = controller;
  results.replaceChildren();
  status.textContent = "连接中";
  const startedAt = performance.now();
  let count = 0;

  try {
    const query = new URLSearchParams({
      malformed: malformed.checked ? "1" : "0",
      delay: "80",
    });
    const response = await fetch(`/api/v1/listings.ndjson?${query}`, {
      signal: myController.signal,
      headers: { Accept: "application/x-ndjson" },
    });
    for await (const item of parseNdjson(response, myController.signal)) {
      count += 1;
      appendListing(item);
      status.textContent = count === 1
        ? `首条已到达：${Math.round(performance.now() - startedAt)} ms`
        : `已读取 ${count} 条`;
    }
    status.textContent =
      `完成 ${count} 条，总耗时 ${Math.round(performance.now() - startedAt)} ms`;
  } catch (error) {
    status.textContent = myController.signal.aborted
      ? `已停止，保留前 ${count} 条`
      : `第 ${count + 1} 条附近失败：${error.message}`;
  } finally {
    if (controller === myController) controller = undefined;
  }
});

cancelButton.addEventListener("click", () => {
  controller?.abort(new DOMException("用户停止读取", "AbortError"));
});
```

运行：

```bash
cd browser-lab
node server.mjs ./public
```

点击“开始读取”，商品应逐条出现，中文完整无替换字符。勾选畸形 JSON 后重试，前两条保留，第三条附近出现明确失败。读取中点击停止，应显示已保留条数，Network 请求提前结束。

## 7. 邻里集市集成案例

真实列表流要先写协议契约：

```text
Endpoint: GET /api/v1/listings/export.ndjson
Content-Type: application/x-ndjson; charset=utf-8
每行字段: id, title, priceCents, version, createdAt
单行上限: 64 KiB
总条数上限: 由查询和权限共同限制
错误策略: HTTP 头发出前返回结构化错误；流开始后的错误终止连接
```

集成时把“传输对象”和“页面对象”分开。公开商品可增量显示；包含联系方式的字段必须经过服务端对象授权，不能因为流式导出而绕过权限。日志只记录行号、请求 ID 和错误类别，不记录私人描述全文。

离线导出应保存为带 `exportedAt` 的快照，重新联网后不能据此确认库存。性能结论至少记录：

- 首条商品到达时间；
- 全部商品完成时间；
- 最大残片长度；
- DOM 更新次数；
- 取消后是否继续积累内存。

若页面最终必须排序全部商品，仍可能需要完整集合；流的收益是更早反馈和限制中间缓冲，不会消除业务算法的内存需求。

## 8. 常见错误与排查路径

### 错误示例：每个块直接解析

```js
// 错误：value 可能只有半个汉字或半行 JSON。
const reader = response.body.getReader();
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  const item = JSON.parse(new TextDecoder().decode(value));
  console.log(item);
}
```

### 错误示例：无上限累积

```js
// 错误：这只是把整个响应重新缓存到内存。
const chunks = [];
for await (const chunk of response.body) chunks.push(chunk);
```

### 诊断记录

| 字段 | 记录 |
| --- | --- |
| 现象 | 偶尔出现 `Unexpected end of JSON input`，中文还会显示 `�` |
| 证据 | Console 显示块大小为 1、2、5 字节；错误块不包含完整换行 |
| 原因 | 把传输块误当业务帧，并对每块独立结束 UTF-8 解码 |
| 修复 | 使用有状态 `TextDecoder`，保留残行，按换行后再 `JSON.parse` |
| 复验 | 固定不规则分块下重复 20 次，四条商品完整；畸形行稳定报告行号 |

排查时按顺序确认：

1. `Content-Type` 是否为约定协议；
2. Network 是否被代理缓冲到最后才出现；
3. 解码器是否使用流式状态并在末尾 flush；
4. 是否保留最后一个不完整帧；
5. 是否限制单行、总条数和 DOM 提交；
6. 错误后是否取消 reader 并释放锁。

## 9. 课后题

1. **为什么 HTTP chunk 边界不能当作 NDJSON 行边界？**
   答：传输分块由网络栈、压缩、代理和实现决定，与应用消息无稳定一一对应关系。
2. **为什么 `TextDecoder` 要在结束时无参数调用一次？**
   答：用于冲刷内部保留的未完成解码状态；`fatal` 模式下还能暴露截断编码。
3. **有背压是否就不需要总条数限制？**
   答：不是。背压控制生产节奏，不限制业务总量和页面最终保留对象数量。
4. **JSON 解析成功是否可以直接渲染？**
   答：不可以。还要验证对象形状、价格整数分、版本和权限可见字段。
5. **流式响应开始后服务端发现错误，怎样表达？**
   答：状态码通常已经发出，只能按应用协议发送错误帧或终止流；客户端必须定义对应处理。

## 10. 实践练习

### 基础：显示首条与总耗时

分别记录第一条到达和全部完成的 `performance.now()` 差值。

**验收答案：**两者测量起点相同；首条时间小于总时间；记录说明仅适用于本机固定分块实验。

### 进阶：批量提交 DOM

每累积 20 条或每个动画帧批量追加 `DocumentFragment`，避免每条都触发复杂页面更新。

**验收答案：**不改变协议解析；取消后不再调度提交；Performance 中 DOM 操作次数下降，商品顺序不变。

### 故障注入：超长无换行帧

让服务发送超过 64 KiB 且没有换行的内容。

**验收答案：**客户端在达到上限后失败并取消 reader；页面不冻结；错误明确为帧过长；Memory 不持续增长。

## 11. 阶段验收

- [ ] Node、HTML、JS 三个文件可独立启动；
- [ ] 固定不规则字节块下中文和四条 JSON 均正确；
- [ ] 畸形 JSON 能稳定报告行号并停止后续提交；
- [ ] 用户取消保留已确认条目，不显示“全部完成”；
- [ ] 有单行、总条数、字段和响应类型边界；
- [ ] 能说明本地流式到达不证明生产代理不会缓冲；
- [ ] 能区分传输背压、解析缓冲和 DOM/业务内存。

## 12. 常见问题

**可以直接用 `response.body.pipeThrough(new TextDecoderStream())` 吗？**
可以，支持环境中能简化解码层；仍要实现帧缓冲、大小限制、JSON 错误和取消。

**SSE 也是按行，能共用这个解析器吗？**
不能直接共用。SSE 有 `data:`、`id:`、`event:`、空行结束事件等专门语法，应交给 `EventSource` 或合规解析器。

**为什么不用一个巨大 JSON 数组？**
小响应完全可以。只有首条延迟、内存或持续生成确有问题时，流式协议才值得增加复杂度。

**压缩会破坏 NDJSON 吗？**
不会破坏解压后的文本协议，但压缩器和代理可能改变可观察分块与刷新时机，需在真实链路验证。

## 13. 扩展阅读

- [Streams Standard](https://streams.spec.whatwg.org/)
- [Encoding Standard: TextDecoder](https://encoding.spec.whatwg.org/#interface-textdecoder)
- [MDN: Using readable streams](https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams)
- [Node.js HTTP response.write](https://nodejs.org/api/http.html#responsewritechunk-encoding-callback)
- [NDJSON specification](https://github.com/ndjson/ndjson-spec)

资料快照日期：2026-10-11。实验未验证生产 CDN/反向代理缓冲、HTTP/2/HTTP/3 分帧差异、Safari/Firefox 或超大真实数据集。

## 我现在能做到什么

我能从任意字节块恢复 UTF-8 文本和 NDJSON 消息，用边界限制抵御异常流，并通过首条时间、总耗时和缓冲上限描述性能，而不把一次本地分块现象误写成网络保证。

## 单元导航

[上一课：可靠 Fetch](01-reliable-fetch-timeout-cancel-race.md) · [本章目录](../README.md#04-请求流与实时通信) · [下一课：SSE、WebSocket 与轮询](03-sse-websocket-polling-recovery.md)
