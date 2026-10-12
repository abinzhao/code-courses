# 03-Worker Threads 与集群

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L4 全栈与服务端
> - 先修：[02-Stream API 与缓冲](./02-Stream-API与缓冲.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Node.js](https://nodejs.org/docs/latest-v24.x/api/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Node.js 单线程模型的边界：I/O 强、CPU 弱
- 区分多进程与多线程方案：`child_process` vs `worker_threads`
- 掌握 Worker Threads 的创建、通信和销毁机制
- 理解 `SharedArrayBuffer` + `Atomics` 的共享内存模式
- 掌握 `cluster` 模块的多进程负载均衡
- 了解 PM2 在生产环境中的进程管理能力
- 实战：用 Worker Threads 实现图片批量处理
- 实战：用 cluster 搭建多核 HTTP 服务器

---

## 内容讲解

### 一、Node.js 单线程的限制

Node.js 的 JavaScript 执行是单线程的——这个设计对于 I/O 密集型任务（文件、网络、数据库操作）非常高效：libuv 的线程池接管了异步 I/O，JS 主线程几乎不阻塞。

但 CPU 密集型任务（加密、压缩、图像处理、大量数学计算）会直接占满 JS 主线程：

```javascript
// 危险：这段代码会阻塞整个 Node.js 进程
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n) + fibonacci(n - 1);
}

// 如果这是一个 HTTP 服务器的请求处理器：
// 一个客户端请求 fib(45)，所有其他请求都得等它算完
const http = require('node:http');
http.createServer((req, res) => {
  const result = fibonacci(45); // 阻塞 10+ 秒
  res.end(`结果: ${result}`);
}).listen(3000);
```

**解决方案**：把 CPU 密集型任务拆到独立线程或独立进程中执行，主线程只负责任务调度和 I/O。

### 二、多进程 vs 多线程：`child_process` vs `worker_threads`

Node.js 提供了两种「并行执行」方案，选择取决于你的需求：

| 维度 | `child_process` | `worker_threads` |
|------|----------------|-------------------|
| **本质** | 完全独立的操作系统进程 | V8 隔离（Isolate）内的独立线程 |
| **内存** | 进程间内存隔离，各自有独立堆 | 可共享 `SharedArrayBuffer` |
| **通信** | IPC 管道（序列化后传输） | `postMessage`（结构化克隆或转移所有权） |
| **开销** | ~30MB+ 内存 / 进程，启动慢 | ~2MB 内存 / 线程，启动快 |
| **安全性** | 进程崩溃不影响主进程 | 线程崩溃会影响整个进程 |
| **适用场景** | 执行外部命令、隔离风险任务 | 并行计算、数据处理 |

```
child_process 模型：                     worker_threads 模型：
┌─────────┐  ┌──────────┐               ┌─────────────────────────┐
│ 主进程   │  │ 子进程     │               │      单进程              │
│ V8 实例  │  │ V8 实例    │               │  ┌───────┐ ┌───────┐  │
│ 30MB 堆  │  │ 30MB 堆    │               │  │主线程  │ │工作线程│  │
└─────────┘  └──────────┘               │  │  堆    │ │  堆    │  │
    ↕ IPC 管道                             │  └───────┘ └───────┘  │
                                         │    ↕ SharedArrayBuffer  │
                                         └─────────────────────────┘
```

### 三、Worker Threads：创建和通信

Node.js 10.5 引入的 `worker_threads` 模块让 JavaScript 代码跑在独立线程中。每个 Worker 有自己的 V8 Isolate 和事件循环。

```javascript
// ===== main.js（主线程） =====
const { Worker } = require('node:worker_threads');
const path = require('node:path');

// 创建 Worker，传入工作文件路径和初始数据
const worker = new Worker(path.resolve(__dirname, 'worker.js'), {
  workerData: { numbers: Array.from({ length: 10 }, (_, i) => i * 100_000) },
});

// 接收 Worker 发回的消息
worker.on('message', (result) => {
  console.log('主线程收到结果:', result);
});

// 监听 Worker 错误
worker.on('error', (err) => {
  console.error('Worker 执行错误:', err.message);
});

// Worker 退出事件（exitCode !== 0 表示异常退出）
worker.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Worker 异常退出，退出码: ${code}`);
  }
});

// 你也可以主动给 Worker 发消息
// worker.postMessage({ cmd: 'stop' });
```

```javascript
// ===== worker.js（工作线程） =====
const { parentPort, workerData } = require('node:worker_threads');

console.log(`Worker 启动，收到数据: ${workerData.numbers.length} 个数字`);

// 执行 CPU 密集型计算
function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2, sqrt = Math.sqrt(n); i <= sqrt; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

// 处理数据
const results = workerData.numbers.map((n) => ({
  number: n,
  isPrime: isPrime(n),
}));

// 通过 parentPort 把结果发回主线程
parentPort.postMessage(results);
```

**通信机制的关键细节：**

```javascript
// ① 结构化克隆（默认）：数据被深拷贝，两个线程不共享引用
worker.postMessage({ data: largeArray });  // largeArray 会被整体拷贝

// ② 转移所有权（TransferList）：原线程失去访问权，零拷贝
const buffer = new ArrayBuffer(1024 * 1024); // 1MB
worker.postMessage(buffer, [buffer]);
// 此后主线程不能再用 buffer，所有权已转移到 Worker

// ③ SharedArrayBuffer：两个线程共享同一块内存
const shared = new SharedArrayBuffer(1024);
worker.postMessage(shared);  // 共享引用，不是拷贝
```

### 四、SharedArrayBuffer 和 Atomics

共享内存是最快的线程间通信方式，但需要同步机制防止数据竞争：

```javascript
// ===== main.js =====
const { Worker } = require('node:worker_threads');

// 创建 1KB 共享内存，用 Int32Array 视图操作
const sharedBuffer = new SharedArrayBuffer(1024);
const sharedArray = new Int32Array(sharedBuffer);

// 创建 4 个 Worker，每个操作共享数组的不同位置
const workers = [];
for (let i = 0; i < 4; i++) {
  const worker = new Worker('./worker-shared.js', {
    workerData: { sharedBuffer, workerId: i },
  });
  workers.push(worker);
}

// 等待所有 Worker 完成
Promise.all(
  workers.map(
    (w) => new Promise((resolve) => w.on('exit', resolve))
  )
).then(() => {
  console.log('共享数组最终值:', Array.from(sharedArray.slice(0, 4)));
});
```

```javascript
// ===== worker-shared.js =====
const { workerData } = require('node:worker_threads');

const { sharedBuffer, workerId } = workerData;
const sharedArray = new Int32Array(sharedBuffer);

// 模拟每个 Worker 在自己的槽位累加 100 万次
for (let i = 0; i < 1_000_000; i++) {
  // ❌ 直接赋值不安全：sharedArray[workerId]++ 不是原子操作
  // ✅ 使用 Atomics：保证读-改-写三步不可分割
  Atomics.add(sharedArray, workerId, 1);
}

// Atomics 还提供了同步等待/唤醒能力
// Atomics.wait(sharedArray, 0, 0);     // 阻塞等待直到该位置值改变
// Atomics.notify(sharedArray, 0, 1);   // 唤醒一个等待该位置的线程
```

**Atomics 常用方法：**

| 方法 | 作用 |
|------|------|
| `Atomics.add(array, index, value)` | 原子加法 |
| `Atomics.sub(array, index, value)` | 原子减法 |
| `Atomics.compareExchange(array, index, expected, replacement)` | CAS 操作 |
| `Atomics.load(array, index)` | 原子读取 |
| `Atomics.store(array, index, value)` | 原子写入 |
| `Atomics.wait(array, index, value)` | 阻塞等待 |
| `Atomics.notify(array, index, count)` | 唤醒等待线程 |

### 五、cluster 模块：多进程负载均衡

Worker Threads 解决 CPU 密集型计算，`cluster` 模块则解决另一个问题：**如何利用多核 CPU 处理更多 HTTP 请求？**

`cluster` 利用 `child_process.fork()` 创建多个进程，共享同一个服务器端口（通过操作系统级别的 SO_REUSEPORT 或主进程分发）：

```javascript
// cluster-server.js —— 多核 HTTP 服务器
const cluster = require('node:cluster');
const http = require('node:http');
const os = require('node:os');

const numCPUs = os.availableParallelism(); // 获取可用 CPU 核心数（Node.js 19+）

if (cluster.isPrimary) {
  // ===== 主进程 =====
  console.log(`主进程 PID: ${process.pid}`);

  // 为每个 CPU 核心 fork 一个工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // 监听工作进程退出，自动重启
  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 已退出（code: ${code}），正在重启...`);
    cluster.fork(); // 自动重启，保证服务可用
  });

  // 工作进程上线通知
  cluster.on('online', (worker) => {
    console.log(`工作进程已上线: PID ${worker.process.pid}`);
  });

} else {
  // ===== 工作进程 =====
  // 所有工作进程监听同一个端口，由操作系统或主进程做负载均衡
  const server = http.createServer((req, res) => {
    // 模拟一个有一定计算量的请求
    let result = 0;
    for (let i = 0; i < 1_000_000; i++) {
      result += Math.sqrt(i);
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`处理请求的工作进程 PID: ${process.pid}\n计算结果: ${result.toFixed(2)}\n`);
  });

  server.listen(3000, () => {
    console.log(`工作进程 ${process.pid} 已启动，监听端口 3000`);
  });
}
```

运行效果：

```bash
$ node cluster-server.js
主进程 PID: 12345
工作进程已上线: PID 12346
工作进程已上线: PID 12347
工作进程已上线: PID 12348
工作进程已上线: PID 12349
...
工作进程已上线: PID 12357   # 10 核 CPU 产生 10 个工作进程
```

**主进程与工作进程的通信：**

```javascript
// ===== 主进程侧 =====
cluster.on('message', (worker, message) => {
  console.log(`收到来自 PID ${worker.process.pid} 的消息:`, message);
  worker.send({ reply: '已收到' });  // 回复特定工作进程
});

// 群发给所有工作进程
for (const id in cluster.workers) {
  cluster.workers[id].send({ type: 'reload-config' });
}

// ===== 工作进程侧 =====
process.on('message', (msg) => {
  console.log(`PID ${process.pid} 收到主进程消息:`, msg);
});
process.send({ type: 'ready', pid: process.pid });
```

**负载均衡策略（Node.js 24 LTS 默认）：**

Node.js 默认使用 **Round-Robin** 调度：主进程接收连接，按顺序分发给工作进程。不同操作系统下行为不同——Linux 上用 Round-Robin，Windows 上用操作系统级别的端口共享。你也可以通过 `cluster.schedulingPolicy` 切换：

```javascript
cluster.schedulingPolicy = cluster.SCHED_RR;      // 轮询（默认）
cluster.schedulingPolicy = cluster.SCHED_NONE;    // 操作系统决定
```

### 六、PM2 进程管理入门

`cluster` 提供了基础的多进程能力，但在生产环境还需要：自动重启、日志管理、零停机重启、负载监控。PM2 是 Node.js 生态环境中最成熟的进程管理器。

```bash
# 安装 PM2
npm install -g pm2

# 启动应用（PM2 自动检测 CPU 核心数，启用 cluster 模式）
pm2 start app.js -i max

# 常用命令
pm2 list              # 查看所有进程状态
pm2 logs              # 实时日志
pm2 monit             # 实时监控面板（CPU + 内存）
pm2 reload all        # 零停机重载（逐个重启工作进程）
pm2 stop all          # 停止所有进程
pm2 delete all        # 删除所有进程
pm2 startup           # 设置开机自启
pm2 save              # 保存当前进程列表（配合 startup 使用）
```

PM2 进程配置文件：

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'my-api',
    script: './server.js',
    instances: 'max',      // 使用全部 CPU 核心
    exec_mode: 'cluster',  // 集群模式
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    // 内存超过 500MB 自动重启
    max_memory_restart: '500M',
    // 日志配置
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    // 监听文件变化自动重启（开发用）
    watch: false,
  }],
};
```

### 七、实战：用 Worker Threads 实现图片批量处理

下面是一个完整的图片批量压缩工具，使用 `sharp` 库和 Worker Threads 并行处理：

```javascript
// image-processor.js —— 主调度器
// 用法：node image-processor.js ./input ./output
const { Worker } = require('node:worker_threads');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

// 扫描目录，收集所有图片文件
async function collectImages(dirPath) {
  const exts = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && exts.has(path.extname(e.name).toLowerCase()))
    .map((e) => path.join(dirPath, e.name));
}

// 把文件列表均匀分配给 Worker
function splitTasks(files, workerCount) {
  const chunks = Array.from({ length: workerCount }, () => []);
  files.forEach((file, i) => chunks[i % workerCount].push(file));
  return chunks;
}

async function main() {
  const inputDir = process.argv[2];
  const outputDir = process.argv[3];

  if (!inputDir || !outputDir) {
    console.error('用法：node image-processor.js <输入目录> <输出目录>');
    process.exit(1);
  }

  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    await fsp.mkdir(outputDir, { recursive: true });
  }

  const images = await collectImages(inputDir);
  if (images.length === 0) {
    console.log('没有找到图片文件');
    return;
  }

  const workerCount = os.availableParallelism();
  const chunks = splitTasks(images, workerCount);

  console.log(
    `发现 ${images.length} 张图片，使用 ${workerCount} 个 Worker 并行处理\n`
  );

  const startTime = performance.now();

  // 启动所有 Worker
  const workerPromises = chunks.map(
    (chunk, index) =>
      new Promise((resolve, reject) => {
        if (chunk.length === 0) return resolve({ processed: 0, totalSize: 0, outputSize: 0 });

        const worker = new Worker(path.resolve(__dirname, 'image-worker.js'), {
          workerData: { files: chunk, outputDir, workerId: index + 1 },
        });

        worker.on('message', (msg) => {
          if (msg.type === 'progress') {
            // 格式化打印文件大小
            const inputKB = (msg.inputSize / 1024).toFixed(1);
            const outputKB = (msg.outputSize / 1024).toFixed(1);
            const ratio = ((1 - msg.outputSize / msg.inputSize) * 100).toFixed(1);
            console.log(
              `[Worker ${msg.workerId}] ${path.basename(msg.file)}  ${inputKB}KB → ${outputKB}KB (${ratio}%)`
            );
          }
        });

        worker.on('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Worker ${index} 退出码: ${code}`));
        });

        worker.on('error', reject);
      })
  );

  await Promise.all(workerPromises);

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ 全部处理完成，总耗时：${elapsed}s`);
}

main().catch((err) => {
  console.error('执行失败:', err.message);
  process.exit(1);
});
```

```javascript
// image-worker.js —— 工作线程（实际处理图片）
// 依赖：npm install sharp
const { parentPort, workerData } = require('node:worker_threads');
const sharp = require('sharp');
const path = require('node:path');
const fs = require('node:fs/promises');

async function compressImage(filePath, outputDir, workerId) {
  const fileName = path.basename(filePath);
  const outputPath = path.join(outputDir, fileName);

  const { size: inputSize } = await fs.stat(filePath);

  // 使用 sharp 流式处理：读取 → 缩放 → 压缩 → 写入
  await sharp(filePath)
    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true }) // 限制最大尺寸
    .jpeg({ quality: 80, progressive: true })                         // 转为 JPEG 80% 质量
    .toFile(outputPath);

  const { size: outputSize } = await fs.stat(outputPath);

  // 汇报进度给主线程
  parentPort.postMessage({
    type: 'progress',
    file: fileName,
    inputSize,
    outputSize,
    workerId,
  });
}

async function main() {
  const { files, outputDir, workerId } = workerData;

  for (const file of files) {
    try {
      await compressImage(file, outputDir, workerId);
    } catch (err) {
      console.error(`[Worker ${workerId}] 处理失败: ${file} —— ${err.message}`);
    }
  }
}

main();
```

### 八、实战：用 cluster 模块搭建多核 HTTP 服务器

把上一节的 `cluster-server.js` 补全为一个可投入生产的基础模板：

```javascript
// production-server.js —— 生产级 cluster HTTP 服务器
const cluster = require('node:cluster');
const http = require('node:http');
const os = require('node:os');

const PORT = process.env.PORT || 3000;
const WORKER_COUNT = parseInt(process.env.WORKER_COUNT, 10) || os.availableParallelism();

if (cluster.isPrimary) {
  console.log(`[主进程 PID:${process.pid}] 启动 ${WORKER_COUNT} 个工作进程`);

  // 创建工作进程
  for (let i = 0; i < WORKER_COUNT; i++) {
    cluster.fork();
  }

  // 工作进程上线
  cluster.on('online', (worker) => {
    console.log(`[工作进程 PID:${worker.process.pid}] 已上线`);
  });

  // 工作进程退出：自动重启，但防止无限重启风暴
  const restartMap = new Map();
  cluster.on('exit', (worker, code, signal) => {
    const pid = worker.process.pid;
    const now = Date.now();
    const restartCount = (restartMap.get(pid) || 0) + 1;

    // 如果 5 秒内重启超过 3 次，停止尝试
    if (restartCount > 3) {
      console.error(`[工作进程 PID:${pid}] 频繁崩溃，停止重启`);
      restartMap.delete(pid);
      return;
    }

    restartMap.set(pid, restartCount);
    setTimeout(() => restartMap.delete(pid), 5000);

    console.log(`[工作进程 PID:${pid}] 退出（code:${code} signal:${signal}），重启中...`);
    cluster.fork();
  });

  // 优雅退出：收到 SIGTERM 时通知所有工作进程
  process.on('SIGTERM', () => {
    console.log('[主进程] 收到 SIGTERM，开始优雅退出...');
    for (const id in cluster.workers) {
      cluster.workers[id].send('shutdown');
    }
  });

} else {
  // ===== 工作进程 =====
  const pid = process.pid;

  // 请求计数器
  let requestCount = 0;

  const server = http.createServer((req, res) => {
    requestCount++;
    const url = new URL(req.url, `http://${req.headers.host}`);

    // 健康检查端点
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ pid, uptime: process.uptime(), requests: requestCount }));
      return;
    }

    // 常规业务路由
    if (url.pathname === '/api/compute') {
      // 模拟中等计算：用 Worker Thread 隔离（生产环境建议这样做）
      let sum = 0;
      for (let i = 0; i < 500_000; i++) sum += Math.sqrt(i);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ pid, result: sum.toFixed(2), requests: requestCount }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<h1>PID: ${pid}</h1><p>已处理 ${requestCount} 个请求</p>`);
  });

  server.listen(PORT, () => {
    console.log(`[工作进程 PID:${pid}] 监听端口 ${PORT}`);
  });

  // 优雅退出处理
  let shuttingDown = false;

  process.on('message', (msg) => {
    if (msg === 'shutdown' && !shuttingDown) {
      shuttingDown = true;
      console.log(`[工作进程 PID:${pid}] 正在优雅退出（不再接受新请求）...`);

      // 停止接收新连接，但等待已有请求处理完
      server.close(() => {
        console.log(`[工作进程 PID:${pid}] 已退出`);
        process.exit(0);
      });

      // 超时强制退出
      setTimeout(() => {
        console.error(`[工作进程 PID:${pid}] 超时，强制退出`);
        process.exit(1);
      }, 10000);
    }
  });
}
```

**压测对比（单进程 vs cluster）：**

```bash
# 单进程
$ node server-single.js    # 一个进程，CPU 利用率 ~12%（8 核机器只有一核在工作）

# Cluster 模式
$ node production-server.js # 8 个进程，CPU 利用率 ~95%
```

---

## 常见问题

### Q1：Worker Threads 和 Web Workers 有什么不同？

API 设计灵感相同但实现不同：
- Web Workers 在浏览器中运行，不能访问 `fs`、`crypto` 等 Node.js API
- Worker Threads 是 Node.js 特有实现，可访问 Node.js 的完整 API（但有独立的 V8 Isolate）
- Worker Threads 支持 `SharedArrayBuffer`（Web Workers 也支持，但浏览器有安全限制）

### Q2：什么时候用 `child_process`，什么时候用 `worker_threads`？

- 执行非 Node.js 程序（Python 脚本、Shell 命令、ffmpeg）→ `child_process`
- 并行计算 JS 逻辑、数据处理、图像处理 → `worker_threads`（内存开销更小）
- 需要强隔离（子任务可能崩溃的情况下）→ `child_process`（进程级隔离）

### Q3：cluster 模式的请求是真的并行处理吗？

是的。每个工作进程有独立的 V8 实例和事件循环，多个工作进程同时在各自的 CPU 核心上执行。一个进程的阻塞计算不会影响其他进程处理请求。

### Q4：PM2 和 Docker 的进程管理怎么配合？

通常分两层：
- **Docker 层**：一个容器运行一个 PM2 实例
- **PM2 层**：在容器内 fork 多个进程利用多核

或者直接用 Docker Compose / K8s 的 `replicas` 替代 PM2 的多进程管理。**容器化部署中通常不需要 PM2**，K8s 本身提供重启、伸缩、零停机和健康检查。

### Q5：`workerData` 里的数据是拷贝还是引用？

默认是**结构化克隆（深拷贝）**。如果你传递了一个 `SharedArrayBuffer`，则是共享引用。你也可以通过 `TransferList` 转移所有权（零拷贝，但原线程失去访问权）。

### Q6：如何在 Worker Thread 中使用 TypeScript？

方案一：用 `ts-node` / `tsx` 的 `--loader` 配合 `worker_threads`。方案二（推荐）：先编译 TS → JS，Worker 文件指向编译后的 JS 文件。方案三：使用 `ts-node/esm` 的 register API。

```javascript
// worker_threads 中注册 ts-node（开发环境用）
const { Worker } = require('node:worker_threads');
require('ts-node').register();
const worker = new Worker('./worker.ts');
```

### Q7：cluster 主进程挂了怎么办？

`cluster` 不解决主进程挂掉的问题。生产环境需要用 PM2 或 Systemd 守护主进程，或者用 Docker/K8s 的 `restart: always` 策略。

### Q8：连接数能否超过 CPU 核心数？

可以，而且必须可以。Node.js 的事件循环本身就是异步非阻塞的——即使只有 4 个核心，4 个进程通过事件循环可以同时处理上万个并发连接（前提是这些连接主要是 I/O 操作而非 CPU 计算）。`cluster` 的 `-i max` 按 CPU 核心数创建进程是基于「CPU 密集型任务需要核心隔离」的考量，而非 I/O 并发度限制。

---

## 实操作业

### 基础练习：Worker 字符串摘要工具

写一个 CLI 工具，接收虚构字符串文件（每行一个字符串），用 Worker Threads 并行计算 SHA-256 摘要并输出结果文件。这个实验演示计算调度，不能用于密码存储；密码应使用 Argon2id、scrypt 等慢哈希并配置盐和成本。要求：

- 文件行数超过 CPU 核心数时平均分配给每个 Worker
- Worker 使用 `crypto` 模块（Worker 中可以正常使用）
- 主线程汇总并写入结果文件

```bash
node hash-lines.js fixtures.txt hashed.txt
```

### 进阶练习：cluster + Worker 混合架构

搭建一个 HTTP 服务，架构如下：

```
                    ┌──────────────────┐
    请求 →         │  cluster 主进程     │
                    └──┬───┬───┬───┬──┘
                    ┌──┘   │   │   └──┐
                    ▼      ▼   ▼      ▼
                Worker  Worker ...  Worker  (最多 4 个)
                    │
                    ▼
              计算交给 Worker Thread
              （不阻塞 HTTP 事件循环）
```

- 用 cluster 创建多个 HTTP 工作进程
- 每个工作进程内部再维护一个 Worker Thread 池（最多 4 个线程）
- 提供 `/compute?n=42` 端点：接收一个数字 n，用 Worker Thread 计算斐波那契数列第 n 项
- Worker 池满时，请求排队等待（用 Promise 队列实现）

### 挑战练习：实时图片处理服务

用 cluster + Worker Threads 实现一个图片处理 HTTP 服务，要求：

- `/upload` 端点：接收图片上传，返回任务 ID
- `/status/:id` 端点：查询处理进度（用 SharedArrayBuffer 或主从通信实现进度汇报）
- `/result/:id` 端点：下载处理结果
- 处理流程：缩放 → 锐化 → 添加水印 → 转 WebP
- 使用 Worker Thread 池异步处理，不阻塞 HTTP 事件循环

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：使用虚构普通字符串计算摘要演示并行，按索引汇总顺序；SHA-256 不用于密码存储。空行/坏输入与 worker 退出有明确失败，线程数和总量受限。
- **进阶**：cluster 进程与线程池共享总 CPU/队列预算；校验 n 且上限有界。队列满返回 429/503，客户端取消释放任务，不能每请求新建 worker 或无界排队。
- **挑战**：上传校验内容/体积，任务 ID 绑定身份，状态与结果需跨进程共享。重启、任务失败、未知/他人 ID 和结果清理均验证；进程内 Map 不能代表多实例可靠任务状态。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L4 里程碑](../../projects/atlas/milestones/L4.md)
- 本课任务：按 L4 里程碑把“Worker Threads 与集群”接入 Atlas 全栈版本，明确服务端信任边界、数据契约、失败响应和回滚方式。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

Node.js 单线程模型对 I/O 密集型任务很高效，但 CPU 密集型任务需要「借用外力」。三种并行方案的选择：

| 场景 | 方案 |
|------|------|
| 执行外部命令、隔离风险 | `child_process.spawn` / `fork` |
| JS 并行计算，低开销 | `worker_threads`（支持共享内存） |
| 多核 HTTP 服务 | `cluster` / PM2 |

关键原则：

1. **默认单线程够用**：Node.js 的 I/O 天然非阻塞，不要过早引入并行
2. **计算密集才用 Worker**：把重计算隔离到独立线程，保护事件循环不被阻塞
3. **生产用 PM2 或 K8s**：`cluster` 是基础能力，PM2/K8s 提供完整的进程生命周期管理
4. **通信优先用 postMessage**，只在性能敏感且需要极低延迟的场景才用 `SharedArrayBuffer`+`Atomics`

至此，你已掌握 Node.js 后端的三大核心能力：事件循环与文件 I/O（01）、流式数据处理（02）、并行与集群（03）。

<!-- course-nav:start -->
---

[上一篇：02-Stream API 与缓冲](./02-Stream-API与缓冲.md) · [课程地图](../../README.md) · [下一篇：HTTP 服务、请求边界与超时](./04-HTTP服务-请求边界与超时.md)
<!-- course-nav:end -->
