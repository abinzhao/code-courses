# 04-Web Workers 与多线程

## 学习目标

- 理解 Web Workers 的作用：把计算密集型任务从主线程剥离，避免 UI 卡顿
- 掌握专用 Worker 的创建、通信和销毁
- 理解 `postMessage` 底层的数据传递机制：结构化克隆 vs 零拷贝
- 知道 Shared Worker 的存在及其使用场景（多页面共享状态）
- 了解 Service Worker 的核心能力：拦截请求、缓存、离线访问
- 能把 Worker 应用到实际场景：大文件哈希计算、大数据排序、Canvas 离屏渲染

---

## 内容讲解

### 一、为什么需要 Web Workers？

你写的所有 JS 默认跑在**主线程**上——这也是 UI 渲染的线程。两者共享同一个线程意味着：

> **长时间的 JS 计算会直接阻塞页面渲染和用户交互。**

```javascript
// 反例：主线程做密集计算——页面假死
document.getElementById('btn').addEventListener('click', () => {
  // 模拟耗时计算
  let sum = 0;
  for (let i = 0; i < 1e9; i++) sum += i; // 主线程被占满
  console.log(sum);
});
// 点击按钮后，整个页面冻结 3-5 秒，滚动、点击全部无效
```

Web Worker 就是为这种场景设计的——让你把耗时计算**搬到独立的后台线程**中执行，不占用主线程。

```
┌─────────────────┐     postMessage      ┌──────────────────┐
│   主线程（UI）    │ ◄──────────────────► │  Worker 线程      │
│  · DOM 渲染      │    结构化克隆/转移    │  · 密集计算       │
│  · 事件处理      │                      │  · 大文件处理     │
│  · 用户交互      │                      │  · 数据处理       │
└─────────────────┘                      └──────────────────┘
```

**Worker 的限制**（设计取舍，不是缺陷）：
- **不能操作 DOM**（没有 `window` 和 `document` 对象）
- **不能直接共享变量**（线程间通过消息通信，数据拷贝传递）
- 受**同源策略**限制（Worker 脚本必须同源）
- 可以访问部分 Web API：`fetch`、`setTimeout`、`console`、`navigator`、`indexedDB`、`WebSocket` 等

### 二、专用 Worker（Dedicated Worker）：一对一通信

#### 2.1 创建和通信

```javascript
// ===== main.js（主线程） =====
// 创建 Worker，传入 JS 文件路径
const worker = new Worker('worker.js');

// 发送消息给 Worker
worker.postMessage({ type: 'CALCULATE', data: [1, 2, 3, 4, 5] });

// 接收 Worker 的回复
worker.onmessage = (event) => {
  console.log('Worker 计算结果：', event.data);
};

// 接收 Worker 的错误
worker.onerror = (error) => {
  console.error('Worker 出错：', error.message);
};

// 用完记得销毁
// worker.terminate(); // 立即终止 Worker 线程
```

```javascript
// ===== worker.js（Worker 线程） =====
// 接收主线程消息
self.onmessage = (event) => {
  const { type, data } = event.data;

  if (type === 'CALCULATE') {
    const sum = data.reduce((acc, num) => acc + num, 0);
    // 把结果发回主线程
    self.postMessage({ result: sum });
  }
};
```

#### 2.2 `postMessage` 的数据传递机制

`postMessage` 传数据时，默认使用**结构化克隆算法（Structured Clone Algorithm）**：

```javascript
// 主线程
const bigArray = new Uint8Array(100 * 1024 * 1024); // 100MB
worker.postMessage({ data: bigArray });
// ↑ 实际会拷贝一整份 100MB 数据到 Worker 线程
```

结构化克隆的核心特点：
- **深拷贝**：Worker 收到的数据是独立副本，修改互不影响
- **耗时**：大数据的拷贝开销不可忽略
- **支持的类型**：基本类型、Array、Object、Date、RegExp、Map、Set、ArrayBuffer、TypedArray、Blob、File 等
- **不支持的类型**：函数、DOM 节点、Symbol、Error 对象的 `stack` 属性会丢失

#### 2.3 Transferable Objects：零拷贝传输

对于 `ArrayBuffer` 和 `MessagePort`，可以用**可转移对象（Transferable Objects）**实现零拷贝：

```javascript
// Transferable：所有权转移，发送后主线程不能再使用原对象
const buffer = new ArrayBuffer(100 * 1024 * 1024); // 100MB
worker.postMessage({ data: buffer }, [buffer]);
//                                           ↑
//                         第二个参数：要转移所有权的对象列表
// 这行之后，主线程的 buffer 的 byteLength 变为 0（所有权已转移）
console.log(buffer.byteLength); // 0 ⚠️
```

```
结构化克隆 vs Transferable：

结构化克隆：          Transferable：
┌──────┐             ┌──────┐
│主线程 │ ──深拷贝──► │Worker│    │主线程 │ ──所有权转移──► │Worker│
│100MB │             │100MB │    │100MB │   (零拷贝)      │100MB │
└──────┘             └──────┘    │(作废) │                └──────┘
  慢 + 内存翻倍                    快 + 内存不变
```

**使用原则**：处理大块二进制数据时，优先使用 Transferable；小数据用结构化克隆（更安全，不会不小心让原对象失效）。

### 三、Shared Worker：多页面共享一个 Worker

专用 Worker 和标签页是**一对一**的：每个标签页创建自己的 Worker 实例。Shared Worker 则是**多对一**：同一域名下的多个标签页可以共享一个 Worker。

```javascript
// ===== shared-worker.js =====
// 存储所有连接的页面
const connections = [];

self.onconnect = (event) => {
  // event.ports[0] 是与发起连接的页面的通信端口
  const port = event.ports[0];
  connections.push(port);

  port.onmessage = (e) => {
    console.log('收到页面消息：', e.data);
    // 广播给所有连接的页面
    connections.forEach(p => p.postMessage(e.data));
  };

  port.start(); // 必须调用，启用端口通信
};
```

```javascript
// ===== 主线程（任意页面） =====
const worker = new SharedWorker('shared-worker.js');
// SharedWorker 通过 port 通信
worker.port.postMessage('来自页面 A 的消息');
worker.port.onmessage = (event) => {
  console.log('SharedWorker 广播：', event.data);
};
```

**典型场景**：多标签页的状态同步（如 WebSocket 连接的复用——只用一个 Worker 维护一条 WebSocket 连接，广播给所有页面）。

> **避坑提示**：Shared Worker 在所有连接它的标签页关闭后会被销毁。但如果有页面意外崩溃而不是正常关闭，Worker 可能不会立即销毁。用 `beforeunload` 事件主动调用 `worker.port.close()`。

### 四、Service Worker：独立于页面的网络代理

Service Worker 是一个特殊的 Worker，它位于**浏览器和网络之间**，可以拦截和处理网络请求。

```
页面 ←→ Service Worker ←→ 网络（或 Cache Storage）
```

它的核心能力：
- **离线缓存**：拦截请求，从本地 Cache 返回数据
- **后台同步**：在连接恢复时发送排队的数据
- **推送通知**：即使页面未打开也能接收推送

```javascript
// ===== sw.js（Service Worker） =====
// 安装阶段：预缓存静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('v1').then((cache) => {
      return cache.addAll(['/', '/styles.css', '/app.js']);
    })
  );
});

// 拦截所有网络请求
self.addEventListener('fetch', (event) => {
  event.respondWith(
    // 优先从缓存返回，缓存未命中时走网络
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
```

```javascript
// ===== 主线程：注册 Service Worker =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    console.log('SW 注册成功：', registration.scope);
  }).catch((err) => {
    console.error('SW 注册失败：', err);
  });
}
```

> **避坑提示**：Service Worker 只能在 HTTPS 或 localhost 下使用（安全策略）。它的生命周期独立于页面——页面关闭后 SW 仍然存活，直到浏览器判定它空闲并终止。

### 五、实战：用 Worker 处理大文件分片上传的哈希计算

这是一个真实场景：大文件上传前需要在浏览器端计算文件的哈希值（用于秒传/断点续传校验）。用主线程计算 1GB 文件的 MD5 会让页面卡死 5-10 秒。正确做法是把计算丢给 Worker。

```javascript
// ===== hash-worker.js =====
// 注意：Worker 中无法直接使用 spark-md5 的同步版本
// 这里演示增量哈希的核心逻辑

self.onmessage = async (event) => {
  const { file, chunkSize } = event.data; // file 是 File 对象引用
  const totalChunks = Math.ceil(file.size / chunkSize);

  // 在 Worker 中使用 SubtleCrypto 计算 SHA-256（浏览器原生支持，无需第三方库）
  const chunks = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);

    // 读取分片为 ArrayBuffer
    const buffer = await blob.arrayBuffer();
    chunks.push(buffer);

    // 上报进度
    const progress = Math.round(((i + 1) / totalChunks) * 100);
    self.postMessage({ type: 'progress', progress });
  }

  // 合并所有分片并计算最终哈希
  const combined = new Uint8Array(file.size);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }

  const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  self.postMessage({ type: 'complete', hash: hashHex });
};
```

```javascript
// ===== main.js =====
const fileInput = document.getElementById('fileInput');
const progressBar = document.getElementById('progress');

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const worker = new Worker('hash-worker.js');

  worker.onmessage = (event) => {
    const { type, progress, hash } = event.data;
    if (type === 'progress') {
      progressBar.value = progress;
    }
    if (type === 'complete') {
      console.log('文件哈希 (SHA-256)：', hash);
      worker.terminate(); // 计算完成，销毁 Worker
    }
  };

  worker.onerror = (err) => {
    console.error('哈希计算出错：', err.message);
    worker.terminate();
  };

  // 启动计算
  worker.postMessage({ file, chunkSize: 5 * 1024 * 1024 }); // 5MB 每片
});
```

### 六、Worker 的其他使用场景

| 场景 | 说明 |
|------|------|
| **大 JSON 解析** | 几十 MB 的 JSON 在主线程解析会卡死，丢给 Worker |
| **图片滤镜/处理** | 用 `createImageBitmap` + Canvas 在 Worker 中处理（OffscreenCanvas） |
| **数据排序/搜索** | 大量数据的排序、过滤、聚合 |
| **Excel 导出** | 生成几万行的 Excel 不阻塞交互 |
| **WebSocket 连接复用** | Shared Worker 维护一条连接，广播给所有页面 |

---

## 常见问题

**Q1：Worker 能和主线程共享变量吗？**

不能。Worker 和主线程是独立的 JS 运行时，有各自的内存空间。唯一的数据交换方式是 `postMessage`——数据被**拷贝**（结构化克隆）或**转移**（Transferable）。

**Q2：什么时候应该用 Transferable，什么时候用结构化克隆？**

数据量大（几十 MB 以上）且是 `ArrayBuffer` 时用 Transferable。小数据或包含复杂对象（Date、RegExp、嵌套引用）时用结构化克隆。记住：Transferable 会让原对象失效，别转完了还在主线程用它。

**Q3：Worker 中能发 AJAX 请求吗？**

可以。Worker 有 `fetch` 和 `XMLHttpRequest`，且请求不受页面导航影响。但响应数据同样需要通过 `postMessage` 传回主线程。

**Q4：一个页面能创建多少个 Worker？**

理论上没有硬性上限，但每个 Worker 有自己的内存空间和线程。通常建议不超过当前 CPU 核心数。可以用 `navigator.hardwareConcurrency` 获取可用核心数做参考。

**Q5：Service Worker 和 Web Worker 的主要区别？**

Web Worker 生命周期与页面绑定（页面关闭则销毁），Service Worker 生命周期独立于页面。SW 可以拦截网络请求、做缓存，但它不能访问 DOM，也不能使用 `localStorage`（可以用 `IndexedDB` 或 `Cache API`）。

**Q6：Worker 线程中报错会怎样？会崩溃吗？**

Worker 中的未捕获错误会触发主线程的 `worker.onerror` 事件，不会影响主线程的运行。但 Worker 线程自身可能终止。你应在 Worker 内部做好错误处理。

**Q7：inline Worker（Blob URL）和独立文件的 Worker 有什么区别？**

```javascript
// inline Worker：不需要独立文件，适合 demo 和简单场景
const code = `self.onmessage = (e) => self.postMessage(e.data * 2)`;
const blob = new Blob([code], { type: 'application/javascript' });
const worker = new Worker(URL.createObjectURL(blob));
```

Blob URL 创建的 Worker 无法使用 `importScripts` 加载相对路径脚本。独立文件更规范，可维护性更好。

**Q8：为什么不用 `setTimeout` 分片来代替 Worker？**

`setTimeout(fn, 0)` 可以把长任务切成小块，但它仍然在主线程上执行，只是不连续而已。Worker 在独立线程上执行，从根本上避免了与 UI 渲染争抢 CPU 的问题。真正计算密集的任务，Worker 效果远超时间分片。

---

## 实操作业

### 基础练习：用 Worker 实现防卡死的斐波那契计算器

界面有输入框（n 的值）和计算按钮。用 Worker 计算第 n 个斐波那契数，计算过程中主线程按钮可正常点击、页面可正常滚动。

```html
<!-- 目标效果 -->
<input id="input" type="number" placeholder="输入 n" />
<button id="calc">计算斐波那契</button>
<div id="result">结果：--</div>
```

### 进阶练习：Worker 实现多线程归并排序

将一个大数组（1000 万个随机数）分片并发排序：
1. 根据 `navigator.hardwareConcurrency` 创建对应数量的 Worker
2. 每个 Worker 排序自己的那一份子数组
3. 主线程收集所有结果，执行归并（merge）
4. 对比同数据量下纯主线程排序的耗时

### 挑战练习：大文件分片上传系统

实现一个完整的大文件上传系统：

1. Worker 中计算文件 SHA-256（参考实战代码）
2. 调用后端接口 `/api/check` 查询已上传的分片（秒传校验）
3. 上传未完成的分片，每个分片上传时支持重试（最多 3 次）
4. 所有分片上传完成后，调用 `/api/merge` 通知后端合并
5. 主线程展示：进度条、上传速度、预计剩余时间

```javascript
// 核心状态管理示例
const uploadState = {
  fileHash: '',           // Worker 计算得出
  totalChunks: 0,
  completedChunks: new Set(),
  retryMap: new Map(),    // chunkIndex → retryCount
  startTime: 0,
};
```

---

## 本节小结

- Web Worker 的本质是**在独立线程运行 JS**，解决主线程被计算任务阻塞导致的 UI 卡顿
- Worker 和主线程通过 `postMessage` 通信，默认深拷贝（结构化克隆），大块 `ArrayBuffer` 可用 Transferable 零拷贝
- Worker **不能访问 DOM**、不能共享变量——这是设计取舍，换来的是线程安全
- Shared Worker 让多个标签页共享同一个 Worker 实例，适合复用 WebSocket 等连接
- Service Worker 是网络代理层，核心能力是拦截请求和缓存，支持离线访问
- 真实场景中，Worker 最适合大文件哈希、大批量排序/搜索、图片处理、Excel 生成等计算密集型任务
- 用完的 Worker 应及时 `terminate()`，避免空闲 Worker 占用内存