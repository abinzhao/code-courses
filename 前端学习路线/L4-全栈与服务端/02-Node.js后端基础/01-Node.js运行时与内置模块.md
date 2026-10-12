# 01-Node.js 运行时与内置模块

## 学习目标

- 理解 Node.js 的底层架构：V8 引擎 + libuv 事件循环
- 掌握 Node.js 事件循环的 6 个阶段及其与浏览器事件循环的关键区别
- 区分 `process.nextTick` 和 `setImmediate` 的执行时机
- 熟练使用 `fs`、`path`、`os`、`crypto` 等核心内置模块
- 理解 `path.join` 与 `path.resolve` 的差异并正确选用
- 了解 `Buffer` 的概念和典型使用场景
- 能用 `child_process` 管理子进程
- 实战：从零写一个命令行文件处理工具

---

## 内容讲解

### 一、Node.js 是什么：V8 + libuv 的架构概览

Node.js 不是一门语言，它是 **JavaScript 的服务器端运行时**。核心由两部分组成：

```
┌─────────────────────────────────────────┐
│           Node.js 标准库（JS 层）          │
│    fs / http / crypto / path / stream    │
├─────────────────────────────────────────┤
│         C++ 桥接层（node_binding）        │
├──────────────────┬──────────────────────┤
│    V8 引擎        │      libuv           │
│    （执行 JS）     │   （事件循环 + 线程池）  │
├──────────────────┴──────────────────────┤
│         操作系统（Linux / macOS / Windows）│
└─────────────────────────────────────────┘
```

- **V8**：Google 开发的高性能 JS 引擎，负责解析和执行 JavaScript 代码
- **libuv**：跨平台的异步 I/O 库，提供事件循环（Event Loop）和线程池

Node.js 的单线程指的是 **JavaScript 代码在单个主线程上执行**。但 I/O 操作（文件读写、网络请求）由 libuv 的线程池异步处理，不会阻塞 JS 线程。

```javascript
// 这段代码演示了 Node.js 的异步本质
const fs = require('node:fs');

console.log('1. 开始');

// 文件读取被 libuv 线程池接管，不会阻塞 JS 主线程
fs.readFile('/tmp/test.txt', 'utf-8', (err, data) => {
  console.log('3. 文件读取完成:', data);
});

console.log('2. 继续执行');
// 输出顺序：1 → 2 → 3
```

### 二、Node.js 事件循环的 6 个阶段

浏览器的事件循环只有 **宏任务队列** 和 **微任务队列** 两层。Node.js 的事件循环更精细，分为 6 个阶段，每个阶段维护一个 FIFO 回调队列：

```
   ┌───────────────────────────┐
┌─>│        timers（定时器）      │  setTimeout / setInterval 的回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │   pending callbacks（待定）  │  延迟到下一轮迭代的 I/O 回调（如 TCP 错误）
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     idle, prepare（闲置）    │  内部使用，你接触不到
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │        poll（轮询）          │  检索新的 I/O 事件；执行 I/O 相关回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │        check（检查）         │  setImmediate 的回调在这里执行
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤     close callbacks（关闭）   │  socket.on('close') 等关闭事件
   └───────────────────────────┘
```

**每个阶段在执行完后、切换到下一阶段之前，都会清空微任务队列**（`process.nextTick` 回调和其他微任务如 `Promise.then`）。

#### 关键对比：`process.nextTick` vs `setImmediate`

```javascript
// 执行这段代码，观察输出顺序
setTimeout(() => console.log('setTimeout'), 0);
setImmediate(() => console.log('setImmediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('Promise'));

// 输出：
// nextTick        ← 微任务，当前阶段结束后立即执行
// Promise         ← 微任务，排在 nextTick 之后
// setTimeout      ← 进入 timers 阶段执行
// setImmediate    ← 进入 check 阶段执行
```

| 特性 | `process.nextTick` | `setImmediate` |
|------|-------------------|----------------|
| 执行阶段 | 微任务，当前操作完成后立即执行 | check 阶段 |
| 优先级 | 高于所有 Promise | 正常宏任务优先级 |
| 用途 | 确保回调在当前事件循环中立即执行 | 让回调在 I/O 事件之后尽快执行 |
| 递归风险 | 递归调用会导致 I/O 饥饿 | 每个阶段其他事件也有机会执行 |

```javascript
// 关键区别：在 I/O 回调中的表现
const fs = require('node:fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('setTimeout'), 0);
  setImmediate(() => console.log('setImmediate'));

  // 在 I/O 回调（poll 阶段）中：
  // 输出：setImmediate → setTimeout
  // 因为 poll → check（setImmediate）→ 回到 timers（setTimeout）
});
```

### 三、全局对象

Node.js 中没有浏览器环境的 `window`，但有自己的一组全局对象：

| CJS 中的全局对象 | 说明 | ESM 中的替代方案 |
|---|---|---|
| `global` | Node.js 全局作用域对象 | `globalThis`（标准，CJS 和 ESM 都可用） |
| `process` | 进程信息对象 | `process`（ESM 中同样可用） |
| `__dirname` | 当前文件所在目录的绝对路径 | `import.meta.dirname`（Node.js 22+） |
| `__filename` | 当前文件的绝对路径 | `import.meta.filename`（Node.js 22+） |
| `require` | 加载 CJS 模块 | `import` / `import()` 动态导入 |
| `module` / `exports` | CJS 模块导出 | `export` / `export default` |

```javascript
// CJS 风格
console.log(__dirname);   // /Users/me/project/src
console.log(__filename);  // /Users/me/project/src/app.js

// ESM 风格（.mjs 文件或 package.json 中 "type": "module"）
console.log(import.meta.dirname);   // /Users/me/project/src
console.log(import.meta.filename);  // /Users/me/project/src/app.mjs

// process 在两个模块系统中都可用
console.log(process.cwd());     // 进程工作目录（可变）
console.log(process.version);   // 当前 Node.js 版本，如 v24.0.0
console.log(process.env.NODE_ENV); // 环境变量
console.log(process.memoryUsage()); // 内存使用情况
```

> **`process.cwd()` vs `__dirname`**：前者是 Shell 当前目录（可被 `cd` 改变），后者是文件所在目录（固定不变）。

### 四、常用内置模块

Node.js 提供了 40+ 个内置模块，你不需要 `npm install` 就能直接使用。下面是前端转后端最常接触的几个：

#### 4.1 `fs`（文件系统）

`fs` 模块对每个 API 提供了三种调用方式：

| 风格 | 签名 | 线程 | 适用场景 |
|------|------|------|----------|
| 同步 (Sync) | `fs.readFileSync(path)` | 阻塞主线程 | 脚本启动时读取配置文件 |
| 回调 (Callback) | `fs.readFile(path, cb)` | 非阻塞 | 早期 Node.js，不推荐新项目 |
| Promise | `fs.promises.readFile(path)` | 非阻塞 | **推荐**：现代 async/await 风格 |

```javascript
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

// ① 同步：脚本启动时读取配置文件，阻塞可接受
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));

// ② 回调：不推荐在新项目中使用，回调地狱警告
fs.readFile('./data.txt', 'utf-8', (err, data) => {
  if (err) return console.error('读取失败:', err);
  console.log(data);
});

// ③ Promise（推荐）：清晰的 async/await 流控
async function processFile() {
  try {
    const data = await fsp.readFile('./data.txt', 'utf-8');
    const processed = data.toUpperCase();
    await fsp.writeFile('./output.txt', processed);
    console.log('处理完成');
  } catch (err) {
    console.error('操作失败:', err.message);
  }
}
```

#### 4.2 `path`（路径处理）

这是前端开发最容易用错的模块，核心在于 `join` 和 `resolve` 的区别：

```javascript
const path = require('node:path');

// path.join：纯粹拼接路径片段，用平台分隔符连接
path.join('/a', '/b', 'c');      // → '/a/b/c'
path.join('/a', '../b', 'c');    // → '/b/c'（会规范化 ..）

// path.resolve：从右到左拼接，直到构造出绝对路径
// 如果拼接后不是绝对路径，就用 process.cwd() 作为前缀
path.resolve('a', 'b');           // → '/Users/me/project/a/b'
path.resolve('/a', 'b');          // → '/a/b'（遇到 /a 已经是绝对路径）
path.resolve('a', '/b');          // → '/b'（/b 在右边，直接把左边吞了！）
path.resolve('/a', '../b');       // → '/b'
```

> **口诀**：`join` 就是拼接，`resolve` 是「解析成绝对路径」。不确定用哪个时，把参数传成 `path.resolve(__dirname, './dist')` 最安全。

其他实用 API：

```javascript
path.basename('/a/b/c.html');       // → 'c.html'
path.basename('/a/b/c.html', '.html'); // → 'c'
path.dirname('/a/b/c.html');        // → '/a/b'
path.extname('/a/b/c.html');        // → '.html'
path.parse('/a/b/c.html');
// → { root: '/', dir: '/a/b', base: 'c.html', ext: '.html', name: 'c' }
path.format(path.parse('/a/b/c.html')); // → '/a/b/c.html'
```

#### 4.3 `os`（系统信息）

```javascript
const os = require('node:os');

os.platform();      // 'darwin'（macOS）/ 'linux' / 'win32'
os.arch();          // 'arm64' / 'x64'
os.cpus();          // CPU 核心信息数组，length 就是核心数
os.totalmem();      // 总内存（字节）
os.freemem();       // 空闲内存
os.homedir();       // 用户主目录
os.tmpdir();        // 临时目录
os.networkInterfaces(); // 网络接口信息
os.uptime();        // 系统运行时间（秒）
```

#### 4.4 `crypto`（加密与哈希）

```javascript
const crypto = require('node:crypto');

// ① 哈希：生成文件指纹、数据完整性校验
const hash = crypto.createHash('sha256').update('hello').digest('hex');
console.log(hash); // 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824

// ② 随机 ID 生成（比 Math.random() 安全）
const id = crypto.randomUUID();  // 如 '3a8b7c5d-...'
const bytes = crypto.randomBytes(16).toString('hex'); // 32 位十六进制随机串

// ③ 加密/解密（AES-256-GCM 示例）
function encrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { iv: iv.toString('hex'), encrypted: encrypted.toString('hex'), authTag: authTag.toString('hex') };
}

function decrypt(encryptedData, key) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(encryptedData.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData.encrypted, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf-8');
}
```

### 五、Buffer 的概念和使用

JavaScript 原生只有字符串，没有二进制类型。Node.js 的 `Buffer` 填补了这个空白——它表示**一块固定长度的原始二进制数据**。

```javascript
// Buffer 的四种创建方式
Buffer.alloc(10);                // 分配 10 字节，自动清零（安全）
Buffer.allocUnsafe(10);          // 分配 10 字节，不初始化（快但可能含旧数据）
Buffer.from([0x48, 0x65, 0x6c]); // 从字节数组创建 → 'Hel'
Buffer.from('你好', 'utf-8');     // 从字符串创建，指定编码

// Buffer 与字符串互转
const buf = Buffer.from('Hello 世界');
console.log(buf);               // <Buffer 48 65 6c 6c 6f 20 e4 b8 96 e7 95 8c>
console.log(buf.toString());    // 'Hello 世界'
console.log(buf.toString('hex')); // '48656c6c6f20e4b896e7958c'
console.log(buf.toString('base64')); // 'SGVsbG8g5LiW55WM'

// 典型场景：文件分片读取
const header = Buffer.alloc(16);
const fd = fs.openSync('./image.png', 'r');
fs.readSync(fd, header, 0, 16, 0); // 只读前 16 字节的文件头
fs.closeSync(fd);
```

### 六、child_process：子进程管理入门

当你需要执行系统命令、调用 Python 脚本或并行处理 CPU 密集型任务时，`child_process` 提供四种启动方式：

```javascript
const { exec, execFile, spawn, fork } = require('node:child_process');

// ① exec：执行完整 Shell 命令，适合简单脚本
exec('ls -la', (err, stdout, stderr) => {
  console.log(stdout);
});

// ② spawn：流式启动进程，适合长时间运行或大量输出
const child = spawn('git', ['log', '--oneline', '-5']);
child.stdout.on('data', (data) => console.log(`输出：${data}`));
child.stderr.on('data', (data) => console.error(`错误：${data}`));
child.on('close', (code) => console.log(`退出码：${code}`));

// ③ fork：专门用于启动 Node.js 模块（自带 IPC 通道）
const nodeChild = fork('./worker.js');
nodeChild.send({ task: 'process' });
nodeChild.on('message', (msg) => console.log('子进程结果:', msg));
```

| 方法 | 适用场景 | 输出方式 |
|------|---------|---------|
| `exec` | 简单命令，输出量小 | 缓冲后一次性返回 |
| `spawn` | 长时间进程，流式输出 | 流式返回 |
| `fork` | Node.js 子进程，需 IPC 通信 | 消息通道 |
| `execFile` | 直接执行可执行文件（不用 Shell） | 缓冲返回 |

### 七、实战：命令行文件处理工具

下面是一个可直接运行的 CLI 工具：读取指定目录下的所有 `.md` 文件，统计字数，生成报告。

```javascript
// cli-word-count.js
// 用法：node cli-word-count.js ./docs
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');

// 递归扫描目录，收集所有指定扩展名的文件
async function collectFiles(dirPath, ext = '.md') {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      // 递归进入子目录
      files.push(...(await collectFiles(fullPath, ext)));
    } else if (entry.isFile() && path.extname(entry.name) === ext) {
      files.push(fullPath);
    }
  }
  return files;
}

// 分析单个文件：行数、字数、字符数
async function analyzeFile(filePath) {
  const content = await fsp.readFile(filePath, 'utf-8');
  const lines = content.split('\n');
  const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
  return {
    path: filePath,
    lines: lines.length,
    chars: content.length,
    chineseChars,
  };
}

// 主流程
async function main() {
  const targetDir = process.argv[2] || '.';
  const absDir = path.resolve(targetDir);

  if (!fs.existsSync(absDir)) {
    console.error(`错误：目录不存在 —— ${absDir}`);
    process.exit(1);
  }

  console.log(`📂 扫描目录：${absDir}\n`);

  const files = await collectFiles(absDir);
  if (files.length === 0) {
    console.log('没有找到 .md 文件');
    return;
  }

  let totalLines = 0;
  let totalChars = 0;
  let totalChinese = 0;
  const results = [];

  for (const file of files) {
    const stat = await analyzeFile(file);
    results.push(stat);
    totalLines += stat.lines;
    totalChars += stat.chars;
    totalChinese += stat.chineseChars;
  }

  // 生成报告
  const report = [
    `# 文档字数统计报告`,
    `> 生成时间：${new Date().toISOString()}`,
    ``,
    `| 文件 | 行数 | 总字符 | 中文字数 |`,
    `|------|------|--------|----------|`,
    ...results.map((r) =>
      `| ${path.relative(absDir, r.path)} | ${r.lines} | ${r.chars} | ${r.chineseChars} |`
    ),
    ``,
    `## 合计`,
    `- 文件数：${files.length}`,
    `- 总行数：${totalLines}`,
    `- 总字符：${totalChars}`,
    `- 中文字数：${totalChinese}`,
  ].join('\n');

  const reportPath = path.join(absDir, 'word-count-report.md');
  await fsp.writeFile(reportPath, report, 'utf-8');
  console.log(`✅ 报告已生成：${reportPath}`);
  console.log(`   文件数：${files.length} | 总行数：${totalLines} | 中文字数：${totalChinese}`);
}

main().catch((err) => {
  console.error('执行失败:', err.message);
  process.exit(1);
});
```

运行效果：

```bash
$ node cli-word-count.js ./前端学习路线

📂 扫描目录：/Users/me/project/前端学习路线

✅ 报告已生成：/Users/me/project/前端学习路线/word-count-report.md
   文件数：74 | 总行数：28901 | 中文字数：183400
```

---

## 常见问题

### Q1：`process.nextTick` 和 `Promise.then` 谁先执行？

`process.nextTick` 先执行。Node.js 的微任务队列有两层：`nextTick` 队列优先级高于 `Promise` 队列。每执行完一个「宏任务阶段」，先清空所有 `nextTick`，再清空所有 Promise 微任务。

### Q2：ESM 中怎么获取 `__dirname`？

Node.js 22+ 直接使用 `import.meta.dirname` 和 `import.meta.filename`。更早版本需要手动构造：

```javascript
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const __dirname = dirname(fileURLToPath(import.meta.url));
```

### Q3：`fs.readFile` 和 `fs.createReadStream` 有什么区别？

`readFile` 一次性把文件全部加载到内存，适合小文件（<100MB）。`createReadStream` 流式读取，逐块处理，适合大文件（下一节会详细讲 Stream）。

### Q4：`Buffer.alloc` 和 `Buffer.allocUnsafe` 怎么选？

`alloc` 会清零内存（安全但稍慢），`allocUnsafe` 不初始化（快但可能泄漏旧内存数据）。**外部输入场景用 `alloc`**，性能热点且立即覆盖全部字节的场景可以用 `allocUnsafe`。

### Q5：`fork` 和 `spawn` 的区别？

`fork` 是 `spawn` 的特化版本，专用于启动 Node.js 模块，自动建立 IPC 通道（`child.send()` / `child.on('message')`）。`spawn` 更通用，可启动任意可执行文件，通过 `stdio` 管道通信。

### Q6：为什么 `setTimeout(fn, 0)` 不是真的 0ms？

Node.js（和浏览器）的 `setTimeout` 有最小延迟限制：当嵌套层级 > 5 时，最小延迟为 4ms。`setTimeout(fn, 0)` 的实际延迟是 1ms（Node.js 的默认最小值）。

### Q7：`path.resolve` 在生产配置中怎么用最安全？

```javascript
// 推荐：以 __dirname 为基准，不会因 cwd 变化而出错
const distPath = path.resolve(__dirname, '../dist');

// 不推荐：依赖 cwd，不同目录下运行结果不同
const distPath = path.resolve('../dist');
```

### Q8：Node.js 中怎么检测当前是 CJS 还是 ESM 模块？

```javascript
// CJS 中检查
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  console.log('当前是 CJS 模块');
}

// ESM 中无法直接访问 require（会报 ReferenceError），
// 可以用 try-catch 或者通过 process 环境判断
```

---

## 实操作业

### 基础练习：文件批量重命名工具

写一个 CLI 脚本 `rename.js`，接收目录路径和前缀参数，将该目录下所有文件加上前缀：

```bash
node rename.js ./images photo_
# ./images/a.png → ./images/photo_a.png
# ./images/b.jpg → ./images/photo_b.jpg
```

要求：使用 `fs.promises` API + `path` 模块，处理不存在的目录时给出友好提示。

### 进阶练习：配置文件加密器

写一个命令行工具，功能：
- 读取 `.env` 文件，用 `crypto` 的 AES-256-GCM 加密
- 提供 `encrypt` 和 `decrypt` 两个子命令
- 加密密钥从环境变量 `SECRET_KEY` 读取，不存在时用 `crypto.randomBytes(32)` 生成并打印

```bash
node secret.js encrypt .env .env.enc
node secret.js decrypt .env.enc .env
```

### 挑战练习：多进程图片压缩

用 `child_process.fork` 实现：扫描一个目录下的所有 `.png` 文件，将文件列表分发给多个子进程并行处理（调用系统的图片压缩工具如 `pngquant` 或 `sharp` 库）。主进程汇总每个子进程的处理结果，打印总耗时和每个文件的压缩率。

---

## 本节小结

Node.js 的核心竞争力来自「V8 执行 JS + libuv 驱动异步 I/O」的双引擎架构。你需要重点掌握：

1. **事件循环 6 阶段**：timers → pending → idle/prepare → poll → check → close，每个阶段结束后清空微任务
2. **`nextTick` 优先于 `Promise`**，两者都在每个宏任务阶段之间执行
3. **`fs` 三种 API 风格**：新项目统一用 `fs/promises`
4. **`path.join` 拼接、`path.resolve` 解析**，后者用 `__dirname` 做基准最安全
5. **`Buffer` 是 Node.js 处理二进制的核心**，所有 I/O 操作底层都是 Buffer

下一节我们将深入 Stream API，理解 Node.js 为何被称为「流式数据处理之王」。