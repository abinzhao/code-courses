# 37-Node.js 运行时与模块系统

## 目标

从本单元开始进入服务端开发。公共课已经建立了“源代码 → Node.js 运行时 → 进程 → 系统资源”的宏观模型，本单元要把镜头推近到 Node.js 内部：它由什么组成、如何在单线程内调度成千上万的并发任务、模块如何被解析和执行，以及如何用 TypeScript 写出可维护的 Node 程序。

完成本知识单元后，学员应能够：

1. 说明 Node.js 的组成（V8、libuv、内置模块）与定位，准确比较 Node.js 与浏览器在 API、能力和安全边界上的差异。
2. 解释“单线程 + 事件循环”的并发模型，能按执行顺序推演定时器、I/O 回调、`setImmediate`、Promise 微任务与 `process.nextTick` 的输出。
3. 说明 libuv 如何利用操作系统事件通知与线程池实现非阻塞 I/O，并能判断哪些内置操作会占用线程池。
4. 熟练使用 ESM，读懂 CommonJS，解释 `package.json` 的 `type` 字段、`.mjs`/`.cjs` 后缀以及两套模块系统的互操作规则。
5. 描述模块解析过程（相对路径、裸包说明符、`node:` 协议、`exports` 字段），并能正确使用 `process`、`globalThis`、`import.meta` 等全局能力。
6. 使用 TypeScript 在 Node.js 上开发：用 `tsx` 运行开发代码、用 `tsc` 构建生产产物、配置 `@types/node`，并能依据 LTS 策略选择 Node.js 版本。

本单元保持概念级深度：要求“能解释、能推演、能排错”，不要求记忆 libuv 源码或 V8 的垃圾回收算法。

## 技术栈

| 工具或环境 | 版本线 | 用途 | 学习要求 |
|---|---|---|---|
| Node.js | 当前 LTS（偶数版本线） | JavaScript 服务端运行时 | 理解其组成、事件循环与内置 API |
| TypeScript | 5.x 稳定版 | 类型系统与开发语言 | 配置 NodeNext 模块选项，通过类型检查 |
| pnpm | 当前稳定版 | 包管理与脚本入口 | 安装依赖、执行 `package.json` 脚本 |
| tsx | 当前稳定版 | 开发期直接运行 TS/ESM | 理解其定位是开发工具而非生产运行时 |
| tsc（typescript） | 随 TypeScript 发布 | 类型检查与构建 | 产出可部署的 JavaScript |
| @types/node | 与 Node LTS 对应的大版本 | Node.js 内置 API 类型声明 | 理解类型声明与运行时是两回事 |
| Visual Studio Code | 当前稳定版 | 调试与编辑 | 会用调试器单步观察事件循环回调 |

约定：

- 生产与教学环境一律使用 Node.js 当前 LTS，不使用已过维护期的版本，也不追最新奇数版本的实验特性。
- 新项目模块格式以 ESM 为主：`package.json` 设置 `"type": "module"`；能读懂存量项目的 CommonJS。
- 内置模块一律使用 `node:` 协议导入，例如 `node:fs/promises`、`node:path`，与第三方包明确区分。
- 版本号不在示例中写死小版本，以本机 `node -v` 与包管理器当前解析结果为准。

## 详细的理论知识讲解和示例伪代码

### 1. Node.js 的定位与内部组成

#### 1.1 定义

Node.js 是基于 V8 引擎的 JavaScript 运行时，它让 JavaScript 脱离浏览器，运行在服务器、个人电脑和容器中。Node.js 本身不是一门语言，也不是一个 Web 框架，它由三层组成：

```text
┌─────────────────────────────────────────────┐
│  应用代码（你的 JS/TS）与 npm 生态（Express 等） │
├─────────────────────────────────────────────┤
│  Node.js 内置模块：http、fs、path、process、url  │
├──────────────┬──────────────────────────────┤
│   V8 引擎     │  JavaScript 的解析与执行        │
│  libuv       │  事件循环与非阻塞 I/O 抽象       │
│  其他 C/C++ 库 │  zlib、c-ares、OpenSSL 等      │
├──────────────┴──────────────────────────────┤
│        操作系统（macOS / Linux / Windows）     │
└─────────────────────────────────────────────┘
```

- V8 负责执行 JavaScript：解析源码、生成机器码、管理 JavaScript 堆。
- libuv 提供事件循环和跨平台 I/O 抽象：网络、文件、定时器、线程池。
- 内置模块用 JavaScript 和 C++ 绑定写成，把操作系统能力暴露成 `http`、`fs` 等 API。

Express、Fastify 这类框架是运行在 Node.js 之上的 npm 包；Node.js 又运行在操作系统之上。三层不能混为一谈。

#### 1.2 与 Web/后端的关系

理解组成直接决定排错方向：接口响应慢，可能是 V8 在执行大段计算（CPU 问题），可能是 libuv 在等待磁盘或网络（I/O 问题），也可能是框架层中间件写错。知道“谁负责什么”，才能把现象对应到正确的层级。

Node.js 适合的典型场景：

```text
Web API 与 BFF（为前端聚合数据的后端）
实时服务（WebSocket、消息推送）
前后端同构的服务端渲染
CLI 与构建工具（Vite、esbuild 的调度层）
文件批处理、代码生成、Mock 服务
```

它不是万能的：长时间阻塞主线程的重型 CPU 计算（大规模视频转码、科学计算）通常应交给专门的计算服务或工作线程。

#### 1.3 与浏览器的差异

同一门 JavaScript，两套“宿主环境”。宿主决定了全局对象和可用 API：

| 维度 | 浏览器 | Node.js |
|---|---|---|
| 入口全局对象 | `window`、`document` | 无 DOM；全局对象是 `globalThis` |
| 主要职责 | 界面渲染、交互 | 提供 API、读写文件、访问网络资源 |
| I/O 能力 | 受同源策略严格限制 | 可访问本机文件、任意网络端口（受系统权限约束） |
| 模块格式 | ESM（由 HTML 加载） | ESM 与 CommonJS 并存 |
| 生命周期 | 跟随标签页 | 跟随进程，常驻服务可长期运行 |
| 内置网络客户端 | `fetch`、XHR | `fetch`（现代版本内置）与 `http`/`https` 模块 |

浏览器专属 API 在 Node.js 中不存在：

```js
// 这段代码只能运行在浏览器中
const button = document.querySelector('#submit');
button.addEventListener('click', () => {
  console.log(window.location.href);
});
```

Node.js 中应使用服务端 API：

```ts
// Node.js 环境：读取环境变量、访问进程信息
const port = Number(process.env.PORT ?? 3000);
console.log(`当前进程 PID=${process.pid}，计划监听端口 ${port}`);
```

反过来，Node 程序能直接读取文件、拿到环境变量——这种能力绝不能出现在前端代码里，因为前端源码对用户完全可见。

#### 1.4 常见误区

> Node.js 是单门语言 / 是一个后端框架。

Node.js 是运行时；JavaScript/TypeScript 才是语言，Express 才是框架。写简历和文档时应准确区分。

> 浏览器和 Node 都能跑 JavaScript，所以代码可以直接互相复制。

语言语法通用，但宿主 API 不通用：`document`、`window`、`localStorage` 在 Node 中不存在；`process`、`fs` 在浏览器中不存在。现代 Node 内置了 `fetch`、`URL`、`AbortController` 等跨平台 API，这些是两套环境中少有的“共同语言”。

> 后端代码用户看不到，所以可以把数据库密码硬编码进去。

代码可能进入日志、错误堆栈、npm 包或被部署系统泄漏。密钥必须通过环境变量或密钥管理服务注入，不能写进源码。

### 2. 单线程进程模型

#### 2.1 定义：单线程指的是什么

Node.js 的“单线程”是指：执行你写的 JavaScript 代码的主线程只有一个。在任意一个瞬间，主线程上只有一段 JavaScript 在执行。这与 Java、C# 默认每个请求分配一个线程的多线程模型形成鲜明对比。

```text
一个 Node.js 进程内部（简化视角）

  主线程（唯一执行 JS 的线程）
  ┌──────────────────────────────────────┐
  │ 执行 JS 代码 ←→ 事件循环 ←→ 等待 I/O    │
  └──────────────────────────────────────┘
        │ libuv 在需要时调度
        ▼
  线程池（默认 4 个工作线程，处理特定阻塞操作）
  + 操作系统层面由内核管理的 I/O 事件通知
```

需要精确理解三点：

1. “单线程”不等于“整个进程只有一个线程”。libuv 维护工作线程池，V8 也有后台线程做垃圾回收。
2. “单线程”不等于“不能并发”。一个 Node 进程可以同时挂起数万个等待中的网络连接，因为等待不需要占用主线程。
3. 并发性（concurrently 处理很多任务的等待阶段）不等于并行性（parallelly 同时执行多段计算）。JS 计算永远无法在主线程上并行。

#### 2.2 与 Web/后端的关系

Web 服务大多是 I/O 密集型的：请求进来，查数据库、调其他服务、写文件，真正花在计算上的比例很小。单线程事件循环模型让一个进程用极少的内存就能扛住大量并发连接，省掉了多线程上下文切换和锁的复杂度。

但代价同样明确：一旦某段代码长时间占住主线程，所有其他请求、定时器、I/O 回调都得排队。

```js
// 危险示例：占用主线程 3 秒，期间整个服务无法响应任何请求
function blockForThreeSeconds() {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    // 纯 CPU 空转，事件循环完全没有机会运行
  }
}

blockForThreeSeconds();
console.log('主线程被阻塞了 3 秒');
```

正确的“等待”姿势是把时间交给事件循环：

```ts
// 让出主线程 3 秒：等待期间服务可以处理其他请求
function waitThreeSeconds(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 3000));
}

await waitThreeSeconds();
console.log('等待了 3 秒，但主线程没有被阻塞');
```

两段代码耗时相同，外部表现却完全不同：前者服务卡死，后者服务照常响应。

#### 2.3 需要并行计算时怎么办

概念上有三个层级的方案：

```text
问题：确实有 CPU 密集任务（压缩、图像处理、批量解析）

方案一（最简单）：任务拆分，每处理一小块就用 setImmediate() 让出主线程
方案二（同进程多线程）：worker_threads，每个工作线程有独立 V8 实例，通过消息通信
方案三（多进程）：child_process / cluster，或部署多个 Node 进程由负载均衡分流
```

`worker_threads` 适合可以切分的计算任务，线程间共享内存需要显式的 `SharedArrayBuffer`，不会自动共享 JS 对象——这恰好避免了多线程锁问题。

#### 2.4 常见误区

> 单线程性能差，扛不住并发。

恰好相反：对 I/O 密集型 Web 服务，单线程事件循环用更少的资源承载了更高的连接数。瓶颈不在“几个线程”，而在“主线程被阻塞多久”。

> Node.js 不能利用多核 CPU。

单个进程默认只用一个核跑 JS，但可以通过多进程部署（每个核一个实例）或工作线程利用多核。

> `await` 会让代码在另一个线程执行。

`await` 只是让出主线程并登记回调，后续逻辑仍然回到主线程执行。`await` 不创造线程。

### 3. 事件循环深入：阶段、微任务与执行顺序

#### 3.1 定义

事件循环是 Node.js 调度异步任务的机制。它不是一个队列，而是一组按固定顺序反复执行的阶段（phase）。每个阶段有自己的回调队列：

```text
        ┌───────────────────────┐
   ┌──→ │ 1. timers            │  执行 setTimeout/setInterval 到期回调
   │    ├───────────────────────┤
   │    │ 2. pending callbacks │  执行推迟到下一轮的系统级回调（如部分 TCP 错误）
   │    ├───────────────────────┤
   │    │ 3. idle/prepare       │  仅供内部使用
   │    ├───────────────────────┤
   │    │ 4. poll              │  取回新的 I/O 事件；必要时在此等待
   │    ├───────────────────────┤
   │    │ 5. check             │  执行 setImmediate 回调
   │    ├───────────────────────┤
   │    │ 6. close callbacks   │  执行 'close' 事件等
   │    └───────────────────────┘
   │              │
   └──────────────┘  每个阶段之间都会清空微任务队列
```

两个阶段需要特别理解：

- poll 阶段：事件循环在这里等待并取出已完成的 I/O 事件（文件读完、socket 来数据）。如果没有到期的定时器，它会为 I/O 事件阻塞等待一段时间。
- check 阶段：专门执行 `setImmediate`，它在当前轮次 poll 结束后立刻运行。

#### 3.2 微任务：两个高优先级队列

在阶段之间（以及当前 JS 执行栈清空后），事件循环会清空微任务队列。Node.js 有两类微任务来源：

1. Promise 回调（`.then`/`catch`/`finally`）、`queueMicrotask()`、`await` 的后续代码。
2. `process.nextTick()` 的回调，它有独立队列，优先级高于 Promise 微任务。

清空规则可以概括为：

```text
每当一段同步代码执行完毕：
    先清空 nextTickQueue（直到为空）
    再清空 Promise 微任务队列（直到为空）
    然后才进入下一个事件循环阶段

微任务执行过程中又加入的微任务，也会在当前轮次被继续清空
```

这意味着递归提交微任务会让事件循环“饿死”：定时器和 I/O 回调永远轮不到。

#### 3.3 与 Web/后端的关系

理解执行顺序能解释大量真实问题：为什么“先写的日志后出现”、为什么定时器不精确、为什么数据库回调比 `setImmediate` 晚、为什么递归 `nextTick` 会让服务假死。推演顺序是后端排错的基本功。

定时器的最小延迟并不精确：`setTimeout(fn, 0)` 也至少要等到下一轮 timers 阶段，且受主线程是否被阻塞影响。I/O 回调在 poll 阶段执行，而 `setCompute` 在 check 阶段，因此在同一个 I/O 回调内安排的两者，`setImmediate` 通常先于 `setTimeout(fn, 0)`。

#### 3.4 推演示例

下面是必须能手推的经典顺序题：

```js
import { readFile } from 'node:fs/promises';

setTimeout(() => console.log('1. setTimeout'), 0);

setImmediate(() => console.log('2. setImmediate'));

Promise.resolve().then(() => console.log('3. promise'));

process.nextTick(() => console.log('4. nextTick'));

readFile(new URL(import.meta.url)).then(() => {
  console.log('5. io 回调内开始');
  setTimeout(() => console.log('6. io 内 setTimeout'), 0);
  setImmediate(() => console.log('7. io 内 setImmediate'));
  Promise.resolve().then(() => console.log('8. io 内 promise'));
  process.nextTick(() => console.log('9. io 内 nextTick'));
});

console.log('0. 同步代码');
```

推演过程：

```text
第一轮：
  同步代码先执行            → 输出 0
  清空 nextTick             → 输出 4
  清空 Promise 微任务        → 输出 3
  timers 阶段               → 输出 1
  poll 阶段等待 I/O：I/O 完成后在 poll 执行其回调
    输出 5，登记 6/7/8/9
    清空 nextTick → 9，清空 Promise → 8
  check 阶段                → 输出 7（I/O 回调里的 setImmediate）
  下一轮 timers 阶段         → 输出 6

顶层的 1 与 2 的先后：在主模块中取决于进程启动时序，不保证；
但在同一个 I/O 回调内部，7 必然先于 6。
```

用 TypeScript 给微任务加上类型化负载，可以看到调度与类型正交：

```ts
type MicroJob = { name: string; run: () => void };

function enqueueMicro(job: MicroJob): void {
  queueMicrotask(() => {
    job.run();
  });
}

enqueueMicro({ name: 'audit', run: () => console.log('记录审计日志') });
```

#### 3.5 常见误区

> `setTimeout(fn, 0)` 是“零延迟、立刻执行”。

它只是“最早也要等到下一轮 timers 阶段”，实际延迟受事件循环当前位置和主线程占用影响。

> `setImmediate` 一定比 `setTimeout(fn, 0)` 先执行。

在主模块顶层两者顺序不保证；在同一个 I/O 回调内，`setImmediate` 才稳定先执行。要保证顺序，应把两者放进同一回调，或改用微任务。

> `nextTick` 是“下一个 tick”，所以属于事件循环的某个阶段。

`process.nextTick` 不属于任何阶段，它在阶段切换时优先清空，优先级比 Promise 还高，递归使用会饿死事件循环。代码中应优先使用 `queueMicrotask` 或 `Promise.resolve()`，把 `nextTick` 留给确有需要的库作者。

> 微任务里出错会像普通回调一样被吞掉。

微任务中的 reject 如果没有处理，会触发 `process` 的 `unhandledRejection`；现代 Node.js 默认可能使进程退出。异步错误必须显式处理。

### 4. libuv 与非阻塞 I/O

#### 4.1 定义：非阻塞是怎么做到的

“非阻塞 I/O”指：发起 I/O 后，主线程不等待结果，继续执行后续代码；I/O 完成后，由 libuv 把结果和回调放入事件循环，在合适的阶段执行。libuv 根据操作系统选择不同的底层机制：

```text
网络 I/O（socket、TCP）：
  直接利用操作系统的事件通知接口
  macOS 用 kqueue，Linux 用 epoll，Windows 用 IOCP
  → 一个线程可以同时监视大量连接，几乎不占额外线程

无法天然事件化的操作：
  放入 libuv 线程池（默认 4 个线程，可用 UV_THREADPOOL_SIZE 调整）
  → 文件系统全部操作、dns.lookup、部分 crypto（随机数、pbkdf2、scrypt）、zlib
```

一次“非阻塞读文件”的完整旅程：

```text
1. JS 调用 fs.readFile，Node 把请求封装成请求对象
2. 请求被送入 libuv 线程池，某个工作线程执行阻塞式 read 系统调用
3. 主线程立即拿到控制权，继续执行后面的代码
4. 工作线程读完，把完成事件交回主线程
5. 事件循环在 poll 阶段取到事件，执行 JS 回调，传入数据或错误
```

“非阻塞”对调用方成立：JS 主线程没有等。底层文件读取在线程池里其实仍然是阻塞调用，只是被隔离到了工作线程。

#### 4.2 与 Web/后端的关系

这一模型解释了 Node.js 的核心优势：监听一万个网络连接不需要一万个线程，因为网络 I/O 直接走内核事件通知。它也解释了隐蔽的性能坑：

- 文件操作走 4 线程的线程池。如果同时发起 100 个大文件读，第 5 个开始必须排队，等待时间变长，但 CPU 依然很低——这正是“慢但不占 CPU”的典型来源。
- `dns.lookup` 默认调用系统的 `getaddrinfo`，占用线程池；而 `dns.resolve*` 系列直接发 DNS 协议报文，走网络事件通道。高并发下解析域名卡住，常是线程池耗尽。

```js
import { lookup, resolve4 } from 'node:dns';

// 占用 libuv 线程池（调用系统 getaddrinfo）
lookup('example.com', (err, address) => {
  if (err) throw err;
  console.log('lookup 结果：', address);
});

// 走网络通道，不占线程池
resolve4('example.com', (err, addresses) => {
  if (err) throw err;
  console.log('resolve4 结果：', addresses);
});
```

TypeScript 示例展示“并发发起、统一收集”的非阻塞模式：

```ts
import { readFile } from 'node:fs/promises';

async function readAll(paths: string[]): Promise<string[]> {
  // Promise.all 立即并发发起所有读取；线程池负责排队，主线程不阻塞
  return Promise.all(paths.map((p) => readFile(p, 'utf8')));
}

const contents = await readAll(['./a.txt', './b.txt', './c.txt']);
console.log(`读到 ${contents.length} 个文件`);
```

#### 4.3 常见误区

> 所有 I/O 都是纯异步、零线程开销。

网络 I/O 基本如此；文件系统和少数操作仍占用固定大小的线程池，并发过高时会排队。

> 调大 `UV_THREADPOOL_SIZE` 就能解决一切 I/O 慢。

线程池过大反而增加上下文切换；如果瓶颈在磁盘本身或下游服务，加线程无济于事。先定位等待点，再决定是否调整。

> 回调里拿到的结果一定成功。

每个 I/O 回调的第一个参数都是可能的错误（error-first 风格）；Promise 风格则需要 `try/catch`。文件不存在、权限不足、连接重置都会以错误形式返回。

### 5. ESM、CommonJS 与 package.json 的 type

#### 5.1 定义：两套模块系统

Node.js 历史上有两套模块系统：

- CommonJS（CJS）：Node.js 原生的传统模块系统，使用 `require()` 同步加载，`module.exports` 导出。运行时加载，可以动态 `require`。
- ECMAScript Modules（ESM）：语言标准模块系统，使用 `import`/`export`。导入在加载阶段静态分析，天然支持静态分析、tree-shaking 和顶层 `await`（在 ESM 文件中）。

CommonJS 示例：

```js
// cjs 写法：math.cjs
function add(a, b) {
  return a + b;
}
module.exports = { add };

// 使用方
const { add } = require('./math.cjs');
console.log(add(1, 2));
```

ESM 示例：

```js
// esm 写法：math.js（在 type: module 的项目中）
export function add(a: number, b: number): number {
  return a + b;
}

// 使用方：静态导入，必须写在顶层
import { add } from './math.js';
console.log(add(1, 2));
```

ESM 还支持动态导入：

```ts
// 按需加载，返回 Promise，可出现在条件分支中
async function loadFormatter(kind: 'json' | 'csv') {
  if (kind === 'csv') {
    const mod = await import('./formatters/csv.js');
    return mod.formatCsv;
  }
  const mod = await import('./formatters/json.js');
  return mod.formatJson;
}
```

#### 5.2 type 字段与文件后缀

Node.js 如何判定一个 `.js` 文件是 ESM 还是 CJS？规则如下：

```text
文件后缀优先级：
  .mjs  → 永远是 ESM
  .cjs  → 永远是 CommonJS
  .js   → 看最近的 package.json：
          "type": "module"  → ESM
          没有 type 或 "type": "commonjs" → CommonJS（默认）
```

一个最小的现代 ESM 项目清单：

```json
{
  "name": "backend-demo",
  "type": "module",
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js"
  }
}
```

`engines` 声明项目期望的 Node 版本范围，部署平台会据此选择运行时。

#### 5.3 互操作规则

两套系统混用是最常见的报错来源，必须记住四条规则：

```text
规则 1：ESM 可以导入 CJS
  import pkg from 'some-cjs-package';        // 默认导入拿到整个 module.exports
  打包器/Node 会做静态分析，部分具名导入（import { x }）可能可用，但不保证

规则 2：CJS 不能用 require() 同步加载 ESM
  因为 ESM 是异步加载的；需要在 CJS 中使用 (async () => { const m = await import('./x.js') })()
  较新的 Node.js 已开始支持 require() 加载不含顶层 await 的 ESM，但跨版本行为在演进，
  稳妥可移植的写法仍然是动态 import()

规则 3：ESM 中没有 require、module、exports、__dirname、__filename
  需要路径时用：fileURLToPath(import.meta.url)
  需要目录时用：dirname(fileURLToPath(import.meta.url))

规则 4：ESM 的相对导入必须带完整后缀
  import './math.js' 正确；import './math' 在 Node ESM 中报错
```

ESM 中模拟 `__dirname`：

```ts
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const configPath = join(__dirname, 'config.json');
console.log('配置文件路径：', configPath);
```

#### 5.4 与 Web/后端的关系

模块系统决定了代码如何被加载、打包和 tree-shake。前端浏览器只认 ESM；后端长期以 CJS 为主、近年全面转向 ESM。全栈项目里选 ESM 可以让前后端模块规则统一，也让 Vitest、tsx、现代构建链行为一致。

CJS 中“默认导出一个函数”和“挂载具名属性”的写法在 ESM 互操作时行为不同，这是阅读老代码必须掌握的事实：

```js
// 老 CJS 包的三种导出形态
module.exports = function createApp() {};            // 形态一：默认导出是函数
module.exports = { version: '1' };                  // 形态二：默认导出是对象
exports.helper = function helper() {};              // 形态三：exports 是 module.exports 的引用
```

#### 5.5 常见误区

> 设了 `"type": "module"` 就万事大吉，所有文件都变成 ESM。

`.cjs` 文件永远是 CJS，`node_modules` 里的包各自遵循自己的 `package.json`。`type` 只影响本包及子目录中没有后缀区分的 `.js` 文件。

> ESM 里可以继续用 `__dirname`。

ESM 没有这些 CJS 注入变量，要用 `import.meta.url` 转换。

> ESM 导入可以省略扩展名。

浏览器和 Node 的原生 ESM 都要求完整相对路径说明符（构建工具可能允许省略，但那是工具层的解析）。

> `import x from 'cjs-pkg'` 和 `const x = require('cjs-pkg')` 行为完全一样。

默认导入通常等于 `module.exports`；但具名导入依赖对 CJS 文件的静态分析，动态生成的导出无法被识别。

### 6. 模块解析算法与 package.json 高级字段

#### 6.1 定义：说明符与解析

`import` 后面的字符串叫模块说明符（specifier），分三类：

```text
相对说明符： './math.js'、'../config/index.js'  → 相对当前文件 URL 解析
绝对说明符： 'file:///opt/app/config.js'        → 直接按 URL 解析
裸说明符：   'express'、'lodash-es'、'@scope/x' → 在 node_modules 中查找
内置说明符： 'node:fs'、'node:http'             → 直接映射到 Node 内置模块
```

裸说明符的查找过程（以 `import 'express'` 为例）：

```text
1. 从当前文件所在目录开始，逐级向上查找 node_modules/express
2. 找到包目录后读取其 package.json
3. 优先使用 exports 字段决定入口；没有 exports 时回退到 main（CJS）或 module（打包器约定）
4. exports 可以根据 import/require/node/default 等条件返回不同文件
```

逐级向上意味着：`/a/b/c/node_modules` → `/a/b/node_modules` → `/a/node_modules` → `/node_modules`，直到根目录。pnpm 正是利用这一规则，用符号链接构造出扁平但隔离的依赖树。

#### 6.2 exports 字段与条件导出

现代包用 `exports` 精确控制入口，它同时是“入口声明”和“封装边界”——未在 exports 中暴露的内部路径，包外无法导入。

```json
{
  "name": "@demo/core",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "default": "./dist/index.js"
    },
    "./utils": {
      "import": "./dist/utils.js"
    }
  }
}
```

条件按顺序匹配：`types` 给 TS，`import` 给 ESM 加载器，`require` 给 CJS，`default` 兜底。这让同一个包能同时服务两套模块系统。

`node:` 协议是 Node 内置模块的显式写法：

```ts
import { readFile } from 'node:fs/promises';
import http from 'node:http';

// 推荐写 node:fs 而不是裸写 'fs'：语义清晰，避免与同名第三方包冲突，
// 也让读代码的人立刻知道这是内置模块。
```

在 ESM 中偶尔需要 CJS 的解析能力时（例如调试“某个裸包究竟解析到了哪个文件”），可以用 `createRequire` 拿到一个绑定到当前模块位置的 `require`，再调用其 `resolve`：

```js
import { createRequire } from 'node:module';

// require 的解析起点是当前模块所在目录，与手写 import 的裸包解析规则一致
const require = createRequire(import.meta.url);
const resolved = require.resolve('express');
console.log('express 实际入口文件：', resolved);
```

#### 6.3 与 Web/后端的关系

解析规则决定了“为什么这个导入能找到、那个找不到”。后端项目常见报错——`ERR_MODULE_NOT_FOUND`、`ERR_PACKAGE_PATH_NOT_EXPORTED`——都对应具体规则：前者是说明符或后缀不对，后者是尝试深导入一个被 `exports` 封装的内部文件。

目录结构建议（在第 39 单元会进一步扩展）：

```text
backend-demo/
├── package.json
├── tsconfig.json
├── src/
│   ├── main.ts              # 入口：启动服务
│   ├── app.ts               # 组装应用与路由
│   ├── routes/              # 路由层
│   ├── services/            # 业务逻辑层
│   └── repositories/        # 数据访问层
└── dist/                    # tsc 构建产物，不手写
```

#### 6.4 常见误区

> 装了包就能 `import 'pkg/internal/secret.js'` 深导入任意文件。

如果包声明了 `exports`，白名单之外的路径一律拒绝。要使用内部文件，只能让包作者在 exports 中开放。

> `main` 和 `exports` 效果相同。

`exports` 优先级更高且同时承担封装；`main` 是没有 exports 时的历史回退字段。

> 删除 `node_modules` 后模块还能从全局缓存加载。

Node 解析只看逐级 `node_modules`，不看全局安装目录（全局包主要用于提供 CLI 命令）。

### 7. 全局 API、TypeScript on Node 与 LTS 策略

#### 7.1 定义：常用全局能力

不依赖任何模块即可使用的 API 由宿主注入。Node.js 中常用的有：

| 全局 API | 作用 |
|---|---|
| `process` | 当前进程：`env` 环境变量、`argv` 参数、`pid`、`cwd()`、`exit(code)` |
| `globalThis` | 统一的全局对象引用（浏览器/Node 通用） |
| `console` | 标准输出/错误输出 |
| `setTimeout`/`setInterval`/`setImmediate` | 定时器 |
| `fetch`/`Request`/`Response`/`Headers` | 现代版本内置的 Web 标准 HTTP 客户端 |
| `URL`/`URLSearchParams` | URL 与查询串解析 |
| `AbortController` | 取消异步操作（配合 fetch、定时器） |
| `structuredClone` | 深拷贝可结构化克隆的值 |

配置读取的标准模式：环境变量优先，缺省值兜底，并做显式校验：

```ts
const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT 必须是 1-65535 的整数');
  process.exit(1);
}

console.log(`进程 ${process.pid} 将监听 ${port}`);
```

`import.meta` 只在 ESM 中存在，包含模块自身的元信息：

```text
import.meta.url        当前模块的 file:// URL
import.meta.filename   部分新版本支持的文件名（等价于 fileURLToPath 转换）
import.meta.dirname    部分新版本支持的目录名
```

`URL` 和 `URLSearchParams` 是跨环境的全局 API，组织查询串时不需要手工拼 `&` 和转义：

```js
const url = new URL('https://api.example.com/v1/search');
url.searchParams.set('q', 'node 运行时'); // 空格与中文自动百分号编码
url.searchParams.set('page', '2');
console.log(url.toString());
// https://api.example.com/v1/search?q=node%20%E8%BF%90%E8%A1%8C%E6%97%B6&page=2
```

取消一个超时请求：

```ts
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 2000);

try {
  const res = await fetch('https://api.example.com/data', {
    signal: controller.signal,
  });
  const data = await res.json();
  console.log(data);
} catch (err) {
  if (err instanceof Error && err.name === 'AbortError') {
    console.log('请求因超时被取消');
  } else {
    throw err;
  }
} finally {
  clearTimeout(timer);
}
```

#### 7.2 TypeScript on Node

Node.js 不原生执行 TypeScript，需要“开发期转译 + 构建期编译”两条链路：

```text
开发：tsx（基于 esbuild）直接运行 .ts，启动快、免构建，watch 模式自动重启
     用途：本地开发、跑脚本、调试
     注意：tsx 只做类型擦除式转译，不做类型检查

构建：tsc 做完整类型检查并输出 .js 到 dist/
     用途：CI 门禁与生产部署
     生产运行的是 dist/ 中的 JS，由 node 直接执行，不依赖 tsx
```

一个面向 Node ESM 的 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "sourceMap": true,
    "declaration": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts"]
}
```

关键点：`module` 与 `moduleResolution` 都设为 `NodeNext`，TS 会严格按 Node 的真实规则解析（要求后缀、识别 package.json type），编译期就能发现模块问题；`@types/node` 提供 `process` 等内置 API 的类型，它只影响编译期，运行时由 Node 本体提供。

类型化的环境配置示例：

```ts
// src/config.ts
type Env = 'development' | 'test' | 'production';

interface AppConfig {
  env: Env;
  port: number;
}

function loadConfig(): AppConfig {
  const rawEnv = process.env.NODE_ENV ?? 'development';
  if (rawEnv !== 'development' && rawEnv !== 'test' && rawEnv !== 'production') {
    throw new Error(`未知的 NODE_ENV: ${rawEnv}`);
  }
  return {
    env: rawEnv,
    port: Number(process.env.PORT ?? 3000),
  };
}

export const config = loadConfig();
```

#### 7.3 LTS 版本策略

Node.js 的发布节奏是可预测的：

```text
- 每年 4 月发布一个偶数大版本，同年 10 月进入 Active LTS
- Active LTS：长期支持，适合生产，bug 与安全修复持续合入
- 之后进入 Maintenance LTS：只修严重问题与安全问题
- 奇数版本（如 21、23）只存在约半年，用于试验新特性，不建议用于生产
- 课程以“当前 LTS”为准：具体大版本以开课年份 Node.js 官方发布日程为准
```

团队实践：

- 本地、CI、生产使用同一大版本，可用版本管理工具锁定。
- 升级 LTS 大版本前先过一遍测试和废弃 API 警告。
- 依赖中的原生模块和 `@types/node` 大版本要与 Node 大版本对齐。

#### 7.4 与 Web/后端的关系

类型系统在后端的收益比前端更直接：请求体、数据库行、配置和环境变量都跨边界流动，一个 `interface` 就能让“字段名拼错”在编译期暴露。统一配置模块（`config.ts`）是所有后端服务的起点，避免在各文件里散落 `process.env` 读取。

#### 7.5 常见误区

> tsx 能跑就说明类型没问题。

tsx 默认不做完整类型检查；类型错误必须由 `tsc --noEmit` 在门禁中拦截。

> 生产环境可以直接用 tsx 启动以省掉构建。

课程与工程基线要求生产运行编译后的 JS：启动更快、行为可预测、不依赖转译器。

> `@types/node` 装了，运行时就有对应 API。

类型声明只在编译期提供类型；API 是否存在取决于实际 Node 版本。

> 环境变量都是字符串，所以不需要校验。

正因为全是字符串，更要显式转换和校验：`Number('abc')` 得到 `NaN`，不校验会在运行深处才炸。

## 课后题

1. 画出 Node.js 的三层组成，并说明一次 API 请求在 V8、libuv、内置模块之间是如何流动的。
2. 从“宿主环境”角度列举 Node.js 与浏览器至少四处差异。为什么内置 `fetch` 的存在没有消除这些差异？
3. “单线程”到底单的是什么？它与“进程内有多个线程”矛盾吗？请结合 libuv 线程池说明。
4. 场景分析：某 Express 服务平均每秒处理 200 个请求，某天有人加了一个在请求路径里同步压缩 50 MB 数据的功能，此后服务整体超时率飙升。请解释发生了什么，给出两种修复方向。
5. 写出事件循环六个阶段的名称与各自职责。微任务队列在什么时候被清空？`process.nextTick` 与 Promise 微任务谁先执行？
6. 场景分析：在主模块顶层同时安排 `setTimeout(fn, 0)` 和 `setImmediate(fn)`，连续运行十次，发现两者先后不稳定；把同样两行放进一个文件读取回调里，顺序却稳定了。请解释原因，并说出稳定时谁先谁后。
7. 场景分析：某服务同时发起 60 个 `fs.readFile`，观察到前 4 个几乎同时完成，之后每批完成 4 个，CPU 全程很低。请用 libuv 的机制解释，并说明调大线程池是否一定有效。
8. `dns.lookup` 与 `dns.resolve4` 在底层资源占用上有什么差别？高并发服务域名解析间歇性卡住时，应优先怀疑什么？
9. 写出判定一个 `.js` 文件模块格式的完整规则。ESM 中如何获得当前文件的目录路径？
10. 场景分析：一个 CJS 老项目想使用一个只发布 ESM 的新库，开发者直接写 `const lib = require('new-esm-lib')` 后报错。请解释报错根因，给出可移植的改写方式，并指出 ESM 导入 CJS 时默认导入拿到的是什么。

## 实践练习题

### 练习 1：事件循环顺序实验台

#### 任务

创建 ESM 项目 `event-loop-lab`，编写 `order.mjs`，在一份文件中安排同步日志、`setTimeout`、`setImmediate`、Promise、`queueMicrotask`、`process.nextTick` 以及一个文件读取回调，回调内部再安排前四类任务。

程序运行后，先在 README 中手写“预测输出顺序”，再实际运行对比，逐条解释偏差。

#### 步骤约束

1. 使用 `pnpm init` 初始化，并在 `package.json` 设置 `"type": "module"`。
2. 顶层的 `setTimeout` 延迟设为 0；文件读取使用 `node:fs/promises` 读取自身文件。
3. 先提交“预测”再运行，不允许先运行后补预测。
4. 连续运行至少 5 次，记录顶层两个定时器的先后是否稳定。
5. 追加一个实验：在微任务中递归提交微任务（设置安全上限，如 1000 次），观察对后续阶段的影响，并解释“饿死”现象。
6. 使用 VS Code 调试器在回调处设置断点，单步观察回调触发时机。

#### 提交物

- `order.mjs`；
- `package.json`；
- 预测顺序与实际输出对照文档；
- 5 次运行记录与递归微任务实验结论。

#### 验收标准

- 能正确解释每一行输出对应的阶段或微任务队列；
- 能准确指出 I/O 回调内 `setImmediate` 先于 `setTimeout` 的原因；
- 能解释递归微任务为何会推迟后续阶段；
- 预测与实际的偏差有合理解释，而非修改预测“凑答案”。

### 练习 2：ESM/CJS 互操作沙盘

#### 任务

在 `module-lab` 中实现四种组合并验证互操作：ESM 导入 CJS、CJS 中通过动态 `import()` 使用 ESM、`.mjs`/`.cjs` 后缀对格式的强制作用，以及一个使用 `exports` 条件导出的本地包。

#### 步骤约束

1. 建立两个子目录：`pkg-esm`（ESM 包）与 `pkg-cjs`（CJS 包），通过相对路径或 `pnpm link` 方式互相引用，不发布到任何远端仓库。
2. CJS 入口模块中使用异步 IIFE 调用动态 `import()` 使用 ESM 包，并正确处理退出码。
3. 在一个包的 `package.json` 中声明 `exports`，同时提供 `import` 与 `require` 条件入口。
4. 尝试深导入 exports 未暴露的内部文件，记录错误码并解释。
5. 在 ESM 文件中用 `import.meta.url` 计算当前目录，读取同目录一个 JSON 文件。
6. 故意把 ESM 的相对导入省略后缀，记录报错并修正。

#### 提交物

- 两个包的全部源码与 `package.json`；
- 四种互操作组合的运行日志；
- 两个故意触发的错误记录（深导入、缺后缀）及解释；
- 一份“互操作速查表”。

#### 验收标准

- 四种组合均可运行，结论与本单元规则一致；
- 能说出 ESM 默认导入 CJS 时拿到的对象；
- 能解释 `exports` 的封装作用；
- CJS 异步使用 ESM 后退出码正确，不因异步未捕获错误而异常。

### 练习 3：TypeScript 化的配置与启动骨架

#### 任务

创建 `ts-node-skeleton`，用 TypeScript 编写一个不依赖框架的命令行程序：读取并校验环境变量（端口、环境名、日志级别），打印结构化启动信息；使用 `tsx` 开发、`tsc` 构建、`node` 运行产物。

#### 步骤约束

1. `package.json` 设置 `"type": "module"`，脚本包含 `dev`（tsx watch）、`typecheck`（tsc --noEmit）、`build`（tsc）、`start`（node dist/main.js）。
2. `tsconfig.json` 使用 `NodeNext` 模块选项并开启 `strict`。
3. 配置模块必须对端口范围和枚举值做运行时校验，非法配置以非零退出码退出。
4. 故意制造一个类型错误，演示 `tsx` 仍能运行但 `tsc` 会拦截，再修复。
5. 构建后检查 `dist/` 中的输出为 ESM JavaScript，且 `node dist/main.js` 可独立运行。
6. 全部源码与配置中不得出现任何真实密钥；需要演示的敏感值使用环境变量占位。

#### 提交物

- 完整项目源码、`package.json`、`tsconfig.json`；
- 校验失败场景的日志与退出码记录；
- `tsx` 与 `tsc` 行为差异的演示记录；
- 构建产物目录结构截图或文本树。

#### 验收标准

- 配置校验覆盖非法端口与非法环境名；
- 生产链路不依赖 tsx；
- 能解释类型声明与运行时 API 的区别；
- 模块选项与 Node 真实解析规则一致，构建产物可直接运行。

## 阶段验收作业

### 作业名称

Node.js 运行时探秘与 TS 后端骨架

### 作业场景

团队要启动一个新的后端服务，要求你证明自己不仅能复制模板，还真正理解运行时：服务为什么能用单进程扛并发、异步任务按什么顺序执行、模块如何被解析，以及如何把 TypeScript 工程可靠地交付到生产形态。你需要提交一个可复现的实验与工程骨架，并在现场完成导师的顺序推演追问。

### 提交物

```text
runtime-final/
├── event-loop-lab/            # 来自实践练习 1，补全实验记录
│   ├── order.mjs
│   └── order-report.md
├── module-lab/                # 来自实践练习 2
│   ├── pkg-esm/
│   ├── pkg-cjs/
│   └── interop-cheatsheet.md
├── ts-node-skeleton/          # 来自实践练习 3，扩展为可启动的服务骨架
│   ├── src/
│   │   ├── main.ts
│   │   ├── config.ts
│   │   └── runtime-info.ts    # 输出进程、Node 版本、事件循环观察信息
│   ├── test/                  # 配置校验的测试
│   ├── package.json
│   └── tsconfig.json
├── diagrams/
│   └── event-loop-and-runtime.md   # 运行时组成图与事件循环流程图
└── README.md
```

### 演示步骤

学员在 20 分钟内完成：

1. 用自己的图讲解 Node.js 三层组成与单线程模型。
2. 现场运行 `order.mjs`，按导师随机指定的任务组合（例如加入一个 Promise 链）口述输出顺序，再运行验证。
3. 演示 ESM 导入 CJS 与 CJS 动态导入 ESM，并解释 `type`/后缀规则。
4. 展示非法配置被拒绝时的退出码，以及合法配置下的启动信息。
5. 依次运行 `typecheck`、`build`，用 `node dist/main.js` 启动，证明生产链路不依赖 tsx。
6. 回答导师关于 LTS 选择和 libuv 线程池的追问。

### 评分标准（合计 100 分）

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 运行时机制理解 | 25 | 组成、单线程、libuv 与 LTS 解释准确，术语不混用 |
| 事件循环推演 | 25 | 阶段/微任务/nextTick 顺序推演正确，能解释边界情形 |
| 模块系统与互操作 | 20 | ESM/CJS、type、后缀、exports 与解析规则掌握扎实 |
| TS 工程交付 | 15 | 配置校验完整，tsx/tsc/node 链路清晰可运行 |
| 可复现性与规范 | 10 | README 完整，他人可复现；无敏感信息，无写死 PID/路径 |
| 表达与复盘 | 5 | 图表清晰，结论与证据对应，能区分事实与推断 |

细分规则：

- 运行时机制（25 分）：三层组成 7 分；单线程准确含义 6 分；libuv 线程池与网络事件通道区分 7 分；LTS 策略 5 分。
- 事件循环推演（25 分）：六阶段职责 8 分；微任务清空规则 7 分；I/O 回调内定时器顺序 5 分；现场随机组合推演 5 分。
- 模块系统（20 分）：ESM/CJS 语法与 type 规则 6 分；互操作四规则 6 分；裸包解析与 exports 5 分；`node:` 与后缀细节 3 分。
- TS 工程（15 分）：tsconfig NodeNext 4 分；配置运行时校验 5 分；构建产物可独立运行 4 分；测试存在且通过 2 分。
- 可复现性与规范（10 分）：README 可指导复现 5 分；脱敏与无写死值 3 分；目录整洁、产物与源码分离 2 分。
- 表达与复盘（5 分）：图与文字 2 分；事实/推断区分 2 分；复盘含改进项 1 分。

70 分及以上通过。

### 强制不通过条件

出现以下任一情况即不通过，修正后重新验收：

1. 把 Node.js 称为语言或框架，或无法说清 V8、libuv、内置模块各自职责。
2. 无法正确清空微任务规则，或认为 `await`/`setTimeout` 会创造新线程。
3. 在解释顺序时坚持“`setImmediate` 在任何情况下都先于 `setTimeout(fn, 0)`”。
4. 项目无法按 README 在另一台安装当前 LTS 的机器上复现。
5. 生产启动链路依赖 tsx，或构建产物无法由 node 直接运行。
6. 提交真实密码、令牌、私钥，或把密钥硬编码进源码。
7. 只交截图与运行日志，缺少可运行源码和规则解释。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 说明 Node.js 组成与定位，比较与浏览器差异 | `event-loop-and-runtime.md` 图与现场讲解 |
| 解释单线程并发模型 | 组成图、主线程阻塞讨论与演示问答 |
| 推演事件循环与微任务顺序 | `order.mjs` 现场推演与随机组合验证 |
| 理解 libuv 非阻塞 I/O | 线程池/网络通道问答与 `dns` 实验 |
| 掌握 ESM/CJS 互操作与 type 规则 | module-lab 四组合与速查表 |
| 描述模块解析与 exports | 深导入错误实验与条件导出演示 |
| 用 TS 在 Node 上开发与构建 | ts-node-skeleton 的 typecheck/build/start 全链路 |
| 依据 LTS 选择版本 | README 版本说明与现场追问 |

### 提交前自检

- [ ] 八个学习目标均有对应证据。
- [ ] 不看答案能独立手推 `order.mjs` 的输出。
- [ ] 所有项目均为 ESM（含 type 声明），CJS 只出现在互操作实验中。
- [ ] 内置模块导入均使用 `node:` 协议，相对导入均带后缀。
- [ ] `tsc --noEmit` 零错误，`dist/` 产物可用 node 直接启动。
- [ ] 非法配置以非零退出码退出，且错误信息可指导修正。
- [ ] README 不含真实用户名、绝对路径、固定 PID、密码或令牌。
- [ ] 结论中明确区分已观察事实、合理推断与仍需验证的假设。
