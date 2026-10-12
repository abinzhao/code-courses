# 02-Stream API 与缓冲

## 学习目标

- 理解流（Stream）设计的核心动机：用固定内存处理无限数据
- 掌握四种流类型：Readable / Writable / Duplex / Transform
- 区分流的两种模式：paused mode 和 flowing mode
- 理解 `pipe()` 和 `pipeline()` 的区别及为什么后者更安全
- 掌握背压（Backpressure）机制及其实践意义
- 实战：用 Transform Stream 实现压缩/解压工具
- 实战：对比流式读取与一次性读取的内存差异
- 掌握流式 HTTP 响应的实现方式

---

## 内容讲解

### 一、流的概念：为什么需要流？

先看一个反例——用 `fs.readFile` 读取大文件：

```javascript
const fs = require('node:fs');

// 危险：1GB 的文件会直接占用 1GB+ 内存
const data = fs.readFileSync('./big-file.csv', 'utf-8');
const lines = data.split('\n');

// 如果文件是 10GB？程序直接 OOM 崩溃
```

**流解决的核心问题：用固定的小块内存，处理任意大小的数据。**

```
readFile 方式：
┌─────────────────────┐
│  1GB 文件 → 1GB 内存  │  线性增长，O(n) 内存占用
└─────────────────────┘

Stream 方式：
┌──────┐  ┌──────┐  ┌──────┐
│64KB  │→ │64KB  │→ │64KB  │→ ...  固定 O(1) 内存占用
└──────┘  └──────┘  └──────┘
```

流的本质是**生产者-消费者模式**：数据源头不断产出数据块（chunk），消费者逐个处理，处理完的 chunk 即可被 GC 回收。流不仅用于文件，HTTP 请求/响应、数据库查询、压缩/解压、网络 Socket 都是流。

### 二、四种流类型

Node.js 的 `stream` 模块定义了四种抽象：

| 类型 | 可读 | 可写 | 典型场景 |
|------|------|------|----------|
| **Readable** | ✅ | ❌ | 文件读取、HTTP 请求体、数据库游标 |
| **Writable** | ❌ | ✅ | 文件写入、HTTP 响应、日志输出 |
| **Duplex** | ✅ | ✅ | TCP Socket、加密通道 |
| **Transform** | ✅ | ✅ | 压缩、加密、CSV→JSON 转换 |

```javascript
const stream = require('node:stream');

// Readable：数据生产者
const readable = stream.Readable.from(['hello', ' ', 'world']);

// Writable：数据消费者
const writable = new stream.Writable({
  write(chunk, encoding, callback) {
    console.log('写入:', chunk.toString());
    callback(); // 必须调用，告诉流"我处理完了"
  },
});

// Transform：数据转换器
const transform = new stream.Transform({
  transform(chunk, encoding, callback) {
    // 把收到的数据转大写后推给下游
    this.push(chunk.toString().toUpperCase());
    callback();
  },
});

// 串联：readable → transform → writable
readable.pipe(transform).pipe(writable);
// 输出：写入: HELLO → 写入:   → 写入: WORLD
```

### 三、流的两种模式

Readable 流有两种数据读取模式，**同一时刻只能处于一种**：

```
paused mode（暂停模式）              flowing mode（流动模式）
─────────────────────────          ─────────────────────────
  你必须主动 read() 拉取          数据自动推送，必须绑定
  数据，否则不会收到新数据           data 事件或 pipe 来消费

  stream.read()                    stream.on('data', ...)
  stream.on('readable', ...)       stream.pipe(...)

  默认模式                         添加 data 事件监听后
                                   自动切换到此模式
```

```javascript
const fs = require('node:fs');

// === paused mode：手动控制节奏 ===
const rs = fs.createReadStream('./data.txt', { highWaterMark: 16 });
// 关键：监听 readable 而非 data 事件
rs.on('readable', () => {
  let chunk;
  // 循环 read 直到返回 null（当前已无可读数据）
  while ((chunk = rs.read()) !== null) {
    console.log(`读取 ${chunk.length} 字节:`, chunk.toString());
    // 在这里可以做复杂处理，流会等待你 read 才继续
  }
});

// === flowing mode：自动推送 ===
rs.on('data', (chunk) => {
  console.log(`收到 ${chunk.length} 字节`);
  // 数据自动推送，你必须尽快处理，否则会积压
});
```

**如何切换模式？**

| 触发方式 | 效果 |
|---------|------|
| 添加 `'data'` 事件 | paused → flowing |
| `stream.pipe()` | paused → flowing |
| `stream.pause()` | flowing → paused |
| `stream.resume()` | paused → flowing（但不消费数据） |

### 四、`pipe()` vs `pipeline()`

`pipe()` 是流的经典方法，但有一个致命缺陷：

```javascript
const fs = require('node:fs');

// ❌ pipe 的隐患：如果中间出错，管道不会自动清理
source.pipe(transform).pipe(destination);
// transform 报错时，source 和 destination 都不会被销毁
// 导致文件句柄泄漏、内存泄漏

// ✅ pipeline 自动处理错误传播和资源清理
const { pipeline } = require('node:stream');

pipeline(source, transform, destination, (err) => {
  if (err) {
    console.error('管道失败:', err.message);
    // 所有流已被自动销毁，无需手动清理
  } else {
    console.log('管道处理完成');
  }
});

// 或者用 Promise 版本（Node.js 15+）
const { pipeline } = require('node:stream/promises');

async function processData() {
  try {
    await pipeline(source, transform, destination);
    console.log('处理完成');
  } catch (err) {
    console.error('管道失败:', err);
  }
}
```

> **新项目统一用 `pipeline`（Promise 版本）**，`pipe()` 仅在快速调试或教学场景中使用。

### 五、背压（Backpressure）机制

背压是流设计中最重要的概念之一。考虑这个场景：

```
生产者（读文件）→ 100MB/s
消费者（写数据库）→ 1MB/s

如果没有背压：消费者来不及处理的数据会在内存中越积越多，最终 OOM。
有了背压：消费者告诉生产者"慢一点"，生产者暂停读取，直到消费者消化完。
```

```javascript
const fs = require('node:fs');

// 模拟慢消费者：每个 chunk 处理 1 秒
const readable = fs.createReadStream('./data.txt', {
  highWaterMark: 16, // 每个 chunk 16 字节（调小方便观察）
});

const writable = new (require('node:stream').Writable)({
  write(chunk, encoding, callback) {
    console.log(`处理: ${chunk}`);
    // 模拟慢速处理：1 秒后才调用 callback
    setTimeout(() => {
      console.log('  完成');
      callback(); // callback 被调用，生产者才能继续读取
    }, 1000);
  },
});

readable.pipe(writable);
// 输出：
// 处理: <chunk1>
//   完成         ← 1 秒后
// 处理: <chunk2>
//   完成         ← 又 1 秒后
// ...
// 生产者自动暂停，等消费者 callback 后才继续
```

**背压工作原理：**

1. Writable 的 `write()` 返回 `false`，表示内部缓冲区已满
2. Readable 收到信号，暂停数据流
3. Writable 排空缓冲区后发出 `'drain'` 事件
4. Readable 恢复数据流

**但 `pipe()` 和 `pipeline()` 已经自动处理了背压**，你不需要手动编写这套逻辑——除非你在实现自定义流。

### 六、实战：用 Transform Stream 实现文件压缩/解压工具

```javascript
// compress.js —— 使用 Node.js 内置 zlib + pipeline 实现文件压缩
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream/promises');

async function compressFile(inputPath, outputPath) {
  const source = fs.createReadStream(inputPath);       // 可读流：源文件
  const gzip = zlib.createGzip();                      // Transform 流：压缩
  const destination = fs.createWriteStream(outputPath); // 可写流：目标文件

  const startTime = performance.now();

  // pipeline 自动处理背压、错误和资源清理
  await pipeline(source, gzip, destination);

  const elapsed = (performance.now() - startTime).toFixed(0);

  const { size: rawSize } = await fs.promises.stat(inputPath);
  const { size: compressedSize } = await fs.promises.stat(outputPath);
  const ratio = ((1 - compressedSize / rawSize) * 100).toFixed(1);

  console.log(`✅ 压缩完成：${path.basename(inputPath)}`);
  console.log(`   原始大小：${(rawSize / 1024).toFixed(1)} KB`);
  console.log(`   压缩后：${(compressedSize / 1024).toFixed(1)} KB`);
  console.log(`   压缩率：${ratio}% | 耗时：${elapsed}ms`);
}

// 支持命令行调用：node compress.js input.txt output.gz
const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.log('用法：node compress.js <输入文件> <输出文件>');
  process.exit(1);
}
compressFile(input, output).catch((err) => console.error('失败:', err.message));
```

### 七、实战：大文件读取的流式方案 vs 一次性加载

下面是一个真实的对比实验——统计一个 CSV 文件中 `status=error` 的行数：

```javascript
// compare.js —— 内存占用对比
const fs = require('node:fs');
const readline = require('node:readline');

// ===== 方案 A：readFile 一次性加载 =====
async function countWithReadFile(filePath) {
  const memBefore = process.memoryUsage().heapUsed;
  const content = await fs.promises.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  let errorCount = 0;
  for (const line of lines) {
    if (line.includes('status=error')) errorCount++;
  }
  const memAfter = process.memoryUsage().heapUsed;
  return { count: errorCount, memDelta: (memAfter - memBefore) / 1024 / 1024 };
}

// ===== 方案 B：流式 + readline 逐行处理 =====
async function countWithStream(filePath) {
  const memBefore = process.memoryUsage().heapUsed;

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath), // 流式读取！
    crlfDelay: Infinity,                  // 正确处理 \r\n 和 \n
  });

  let errorCount = 0;
  for await (const line of rl) {
    if (line.includes('status=error')) errorCount++;
  }

  const memAfter = process.memoryUsage().heapUsed;
  return { count: errorCount, memDelta: (memAfter - memBefore) / 1024 / 1024 };
}

// 运行对比
async function main() {
  const filePath = process.argv[2] || './access.log';

  // 生成一个 500MB 测试文件（如果没有的话）
  try {
    await fs.promises.access(filePath);
  } catch {
    console.log('生成 500MB 测试文件...');
    const ws = fs.createWriteStream(filePath);
    for (let i = 0; i < 5_000_000; i++) {
      const status = i % 10 === 0 ? 'error' : 'ok';
      if (!ws.write(`[2026-01-${String(i % 28 + 1).padStart(2, '0')}] GET /api/data status=${status} user=user${i}\n`)) {
        // 手动背压：等 drain 再继续写
        await new Promise((resolve) => ws.once('drain', resolve));
      }
    }
    ws.end();
    console.log('测试文件生成完毕\n');
  }

  console.log('=== 方案 A：readFile ===');
  const resultA = await countWithReadFile(filePath);
  console.log(`  error 行数: ${resultA.count}`);
  console.log(`  内存增量: ${resultA.memDelta.toFixed(1)} MB\n`);

  console.log('=== 方案 B：Stream + readline ===');
  const resultB = await countWithStream(filePath);
  console.log(`  error 行数: ${resultB.count}`);
  console.log(`  内存增量: ${resultB.memDelta.toFixed(1)} MB`);
}

main().catch(console.error);
```

典型输出（500MB 文件）：

```
=== 方案 A：readFile ===
  error 行数: 500000
  内存增量: 512.3 MB          ← 文件多大，内存就多大

=== 方案 B：Stream + readline ===
  error 行数: 500000
  内存增量: 3.2 MB            ← 几乎不随文件大小增长
```

> **结论**：只要数据可能超过可用内存，就必须用流。

### 八、流式 HTTP 响应

Node.js 原生 `http` 模块的 `response` 对象就是一个 `Writable Stream`。你可以把文件、数据库结果、实时数据直接以流的方式返回给客户端：

```javascript
// stream-server.js —— 启动后访问 http://localhost:3000
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // 路由 1：流式返回大文件下载
  if (url.pathname === '/download') {
    const filePath = path.resolve(__dirname, 'big-file.zip');
    try {
      await fs.promises.access(filePath);
    } catch {
      res.writeHead(404);
      res.end('文件不存在');
      return;
    }

    const { size } = await fs.promises.stat(filePath);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="big-file.zip"',
      'Content-Length': size,
    });

    // 管道连接：文件流直接 pump 到 HTTP 响应
    // pipeline 内置背压——客户端下载慢时，文件读取会自动暂停
    return pipeline(fs.createReadStream(filePath), res);
  }

  // 路由 2：模拟 SSE（Server-Sent Events）实时推送
  if (url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    let count = 0;
    const interval = setInterval(() => {
      count++;
      // res 是 Writable Stream，write 返回 false 表示客户端消费慢了
      const ok = res.write(`data: ${JSON.stringify({ time: new Date().toISOString(), count })}\n\n`);
      if (!ok) {
        // 可以在这里暂停数据生产，等 drain 事件
        console.log('客户端读取速度慢，等待 drain...');
      }
      if (count >= 100) {
        clearInterval(interval);
        res.end();
      }
    }, 1000);

    // 客户端断开连接时清理
    req.on('close', () => {
      clearInterval(interval);
      console.log('客户端断开连接');
    });
    return;
  }

  // 路由 3：流式 JSON（适用于大数据量 API）
  if (url.pathname === '/stream-json') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      // 提示浏览器：数据会逐步到达，不要等整个响应完成
      'Transfer-Encoding': 'chunked',
    });

    res.write('['); // JSON 数组开头
    let first = true;
    for (let i = 0; i < 100_000; i++) {
      if (!first) res.write(',');
      first = false;
      res.write(JSON.stringify({ id: i, value: `item-${i}` }));
    }
    res.write(']');
    res.end();
    return;
  }

  // 默认路由
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <h1>流式 HTTP 示例</h1>
    <ul>
      <li><a href="/download">文件下载（流式）</a></li>
      <li><a href="/events">SSE 事件推送</a></li>
      <li><a href="/stream-json">流式 JSON</a></li>
    </ul>
  `);
});

server.listen(3000, () => {
  console.log('服务运行在 http://localhost:3000');
});
```

---

## 常见问题

### Q1：`pipe()` 还能用吗？什么场景不能用？

简单串联两个流（且上游错误不会影响下游的场景）可以用。但只要链上有 3 个或以上流，或存在 Transform 流，就用 `pipeline()` ——它确保任一环节出错时整个链被正确清理。

### Q2：`highWaterMark` 是什么？

每个流内部都有一个缓冲区，`highWaterMark` 定义了这个缓冲区的**上限（字节数）**。Readable 流的默认值是 64KB（对象模式为 16 个对象），Writable 流也是 64KB（对象模式为 16 个对象）。当缓冲数据超过这个值时，生产者会暂停。

```javascript
// 调整 chunk 大小
const rs = fs.createReadStream('./big.log', { highWaterMark: 4 * 1024 }); // 4KB per chunk
```

### Q3：如何自定义一个 Transform 流？

```javascript
const { Transform } = require('node:stream');

// 行反转 Transform：每行内容倒序输出
const reverseTransform = new Transform({
  transform(chunk, encoding, callback) {
    // chunk 是 Buffer，转字符串处理
    const reversed = chunk.toString().split('').reverse().join('');
    this.push(reversed);
    callback();
  },
});
```

### Q4：`readline` 模块和 `split2` 包选哪个？

内置的 `readline` 已经足够好用（`for await...of`），且零依赖。`split2` 是社区包，提供更灵活的 stream-based 行分割。优先用内置 `readline`。

### Q5：什么时候用 `stream.finished()`？

`finished()` 在流「结束」或「出错」时触发回调，适合需要知道流何时完全关闭的场景。`pipeline` 已经内置了这个逻辑，如果你只用 `pipe()`，则需要手动调用 `finished()` 来检测完成。

### Q6：流式处理时如何实现断点续传？

Readable 流可以通过 `start` 参数从指定位置开始读取：

```javascript
const rs = fs.createReadStream('./file.bin', { start: 1024 * 1024 }); // 从 1MB 处开始
```

配合 HTTP `Range` 请求头实现断点续传。

### Q7：`for await...of` 和 `on('data')` 哪个好？

`for await...of` 更好：代码线性可读，自动处理背压，错误处理更自然。`on('data')` 需要手动管理 `pause()/resume()`，只有需要极致性能的场景才考虑。

### Q8：Node.js 流和 Web Streams API 有什么关系？

Node.js 的流是自有实现，历史悠久。浏览器端的 Web Streams API（`ReadableStream` / `WritableStream`）是 W3C 标准。Node.js 18+ 支持 Web Streams，且 `stream.Readable.toWeb()` 和 `stream.Readable.fromWeb()` 可以互相转换。

---

## 实操作业

### 基础练习：CSV 转 JSON 流式工具

写一个 CLI 工具，用流式方式读取 CSV 文件，逐行转换为 JSON 对象，并以流式方式写入 JSON 文件。要求使用 `readline` + `Transform` 或 `pipeline`。

```bash
node csv2json.js data.csv output.json
```

### 进阶练习：HTTP 代理服务器

用 Node.js 原生 `http` 模块写一个简单的 HTTP 代理：收到客户端请求后，将请求体以流的方式转发给目标服务器，再将目标服务器的响应流式返回给客户端。要求正确传递状态码和关键响应头。

### 挑战练习：多级流管道——日志实时分析

实现一个日志分析管道，由三段 Transform 流组成：

1. **解析 Transform**：将原始日志行解析为 `{ timestamp, level, message }` 对象
2. **过滤 Transform**：只保留 `level=error` 的日志
3. **聚合 Transform**：按分钟粒度统计错误数

最终输出为一个按时间排序的错误统计报告。要求使用 `pipeline`（Promise 版本）串联。

---

## 本节小结

流是 Node.js 中最被低估的概念——你不需要在「是否有足够内存」和「文件有多大」之间做取舍，因为流保证了 O(1) 的内存使用。核心要点：

1. **四种流类型**：Readable（读）、Writable（写）、Duplex（双向）、Transform（转换）
2. **两种模式**：paused（手动 pull）和 flowing（自动 push），通过 `data` 事件或 `pipe` 触发切换
3. **`pipeline` 替代 `pipe`**：自动处理背压、错误传播和资源清理
4. **背压是自动的**：消费端 `callback()` 不调用，生产端自动暂停
5. **任何 I/O 都是流**：文件、HTTP、Socket、压缩——统一使用流式思维

下一节我们将面对 Node.js 的另一个棘手问题：单线程如何应对 CPU 密集型任务？答案是 Worker Threads 和集群。