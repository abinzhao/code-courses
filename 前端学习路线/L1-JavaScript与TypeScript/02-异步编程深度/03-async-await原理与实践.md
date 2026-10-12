# 03 — async/await 原理与实践

## 学习目标

- 理解 `async` 函数的本质：它只是返回 Promise 的语法糖
- 掌握 `await` 的真实行为——暂停的是当前 async 函数，不是 JS 线程
- 能用 try/catch 正确处理 async 函数中的错误
- 知道哪种循环可以用 `await`（`for...of`），哪种不行（`forEach`）
- 能区分"串行 await"和"并行 Promise.all"的场景
- 掌握顶层 await（Top-level await）的使用条件
- 实现并发请求的数量控制

---

## 内容讲解

### 1. async 函数的本质

`async` 关键字做的事只有一件：**让函数始终返回一个 Promise**。

```javascript
// 这个函数
async function greet() {
  return '你好';
}

// 等价于
function greet() {
  return Promise.resolve('你好');
}

// 验证
greet().then(console.log); // → 你好
console.log(greet());      // → Promise {<fulfilled>: '你好'}
```

三条铁律：
1. 返回普通值 → 自动包装成 `Promise.resolve(值)`
2. 返回 Promise → 原样返回
3. 抛出异常 → 等价于 `Promise.reject(异常)`

```javascript
async function demo(shouldThrow) {
  if (shouldThrow) throw new Error('炸了');
  return '成功';
}

demo(false).then(console.log);                 // → 成功
demo(true).then(console.log).catch(console.error); // → Error: 炸了
```

---

### 2. await 的行为：暂停，而非阻塞

这是最容易误解的概念。`await` 会让**当前 async 函数**暂停执行，等待 Promise 解决。但 JS 线程不会被阻塞——其他代码照常运行。

```javascript
console.log('A');

async function run() {
  console.log('B');
  const result = await Promise.resolve('C'); // 暂停 run，但 JS 线程继续
  console.log(result);                       // 微任务中输出
  console.log('D');
}

run();
console.log('E');

// 输出顺序: A → B → E → C → D
//
// 执行时间线:
// 同步: log('A') → log('B') → 遇到 await，run 暂停，Promise.resolve('C') 的 .then 进入微任务队列
// 同步: log('E')
// 微任务: log('C') → log('D')
```

**关键认知**：

```
await 某个 Promise

不是"JS 线程等着它完成"
而是"当前 async 函数暂停，把控制权还给事件循环"
Promise 完成后，后续代码作为微任务继续执行
```

`await` 实质上等价于 `.then()`：

```javascript
// 这两段代码行为一致
async function a() {
  const x = await fetchData();
  const y = await processData(x);
  return y;
}

function a() {
  return fetchData()
    .then(x => processData(x))
    .then(y => y);
}
```

---

### 3. async/await vs .then() 链

| 维度 | async/await | .then() 链 |
|------|------------|-----------|
| 可读性 | 像同步代码，从上到下 | 链式调用，多步骤时嵌套深 |
| 错误处理 | try/catch，语法自然 | .catch() 在链末尾 |
| 调试 | 断点友好，有调用栈 | 断点困难，堆栈不完整 |
| 条件分支 | 直接 if/else | 要在 .then 里写 if，不够直观 |
| 循环 | for...of 天然支持 | 需要递归或 reduce 拼接 |

**场景对比**：

```javascript
// .then 链版本：条件分支很别扭
function process(data) {
  return fetch('/api')
    .then(res => res.json())
    .then(result => {
      if (result.needExtra) {
        return fetch('/api/extra')
          .then(res => res.json())
          .then(extra => ({ ...result, extra }));
      }
      return result;
    });
}

// async/await 版本：像普通同步代码
async function process(data) {
  const res = await fetch('/api');
  const result = await res.json();
  if (result.needExtra) {
    const extraRes = await fetch('/api/extra');
    const extra = await extraRes.json();
    return { ...result, extra };
  }
  return result;
}
```

---

### 4. 错误处理：try/catch

```javascript
async function loadUser(id) {
  try {
    const res = await fetch(`/api/user/${id}`);
    if (!res.ok) {
      throw new Error(`请求失败: ${res.status}`);
    }
    const user = await res.json();
    return user;
  } catch (err) {
    // 捕获 fetch 失败、res.json() 失败、手动 throw 的错误
    console.error('加载用户失败:', err.message);
    // 返回默认值或重新抛出
    throw err; // 让调用方也能感知错误
  }
}
```

**一个常见陷阱**：忘记处理 fetch 的 HTTP 错误码：

```javascript
// ❌ 错误：404 不会进 catch
async function getData() {
  try {
    const res = await fetch('/api/not-exist');
    const data = await res.json(); // res.ok 是 false，但 json() 也能执行
    return data;
  } catch (err) {
    // 抓不到 404！
  }
}

// ✅ 正确：手动检查
async function getData() {
  const res = await fetch('/api/not-exist');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data;
}
```

---

### 5. 循环中 await 的陷阱

**forEach 不能用 await**：

```javascript
// ❌ 错误：forEach 的回调是普通函数，await 不起作用
async function processItems(items) {
  items.forEach(async (item) => {
    const result = await fetchData(item); // 这些 await 是并发的！
    console.log(result);
  });
  console.log('done'); // 这行会先打印！
}

// ✅ 正确：用 for...of
async function processItems(items) {
  for (const item of items) {
    const result = await fetchData(item); // 真正的串行：等一个完成再下一个
    console.log(result);
  }
  console.log('done'); // 全部处理完才打印
}
```

**为什么 forEach 不行？** `forEach` 只会同步调用回调函数，每个回调返回的 Promise 被丢弃了。它不等你。

**各种循环对 await 的支持**：

| 循环方式 | await 行为 | 说明 |
|---------|-----------|------|
| `for...of` | 串行 | 每次迭代真正等待 |
| 普通 `for` | 串行 | 同 for...of |
| `forEach` | 不等待 | 回调被丢弃 |
| `map` | 返回 Promise 数组 | 配合 Promise.all 可实现并行 |
| `reduce` | 串行（链式） | 可模拟串行 await |

---

### 6. 并行 vs 串行

```javascript
// ❌ 串行——总耗时 = 三次请求之和
async function loadSerial() {
  const user  = await fetchUser();   // 等 200ms
  const posts = await fetchPosts();  // 等 300ms
  const tags  = await fetchTags();   // 等 150ms
  // 总计 ≈ 650ms
}

// ✅ 并行——总耗时 = 最慢的那一个
async function loadParallel() {
  const [user, posts, tags] = await Promise.all([
    fetchUser(),   // 200ms
    fetchPosts(),  // 300ms
    fetchTags(),   // 150ms
  ]);
  // 总计 ≈ 300ms
}
```

**判断标准**：如果请求之间没有依赖关系，就用并行。

```javascript
// 混合场景：先查用户，再根据用户 ID 并行查他的帖子列表和收藏夹
async function loadDashboard(userId) {
  const user = await fetchUser(userId);            // 先串行
  const [posts, favorites] = await Promise.all([   // 再并行
    fetchPosts(user.id),
    fetchFavorites(user.id),
  ]);
  return { user, posts, favorites };
}
```

---

### 7. 顶层 await（Top-level await）

在 ES 模块（`<script type="module">` 或 `.mjs`）中，可以直接在模块顶层使用 `await`：

```javascript
// module.mjs
const config = await fetch('/config.json').then(r => r.json());
export { config };
```

```javascript
// main.mjs
import { config } from './module.mjs';
// 此时 config 已经加载完成——模块会等顶层 await 完成再执行依赖它的模块
console.log(config);
```

**限制**：顶层 await 只能在 ES Module 中使用。普通 `<script>` 标签和 CommonJS（`require`）不支持。

---

### 8. 实战：并发请求控制（限制最大并发数）

实际开发中，不能一次性对 100 个 URL 发 `Promise.all`——可能压垮服务器或触发频率限制。需要控制并发数：

```javascript
/**
 * 带并发限制的批量请求
 * @param {string[]} urls    - 请求地址数组
 * @param {number}   limit   - 最大并发数
 * @param {Function} fetcher - 请求函数，默认 fetch + json
 * @returns {Promise<any[]>} - 结果数组（顺序与 urls 一致）
 */
async function batchRequest(urls, limit = 5, fetcher = url => fetch(url).then(r => r.json())) {
  const results = new Array(urls.length); // 预分配，保证结果顺序
  let nextIndex = 0;                       // 下一个该发的 URL 索引

  // 单个 worker：拿一个 URL → 请求 → 拿下一个，直到全部完成
  async function worker() {
    while (nextIndex < urls.length) {
      const index = nextIndex++;          // 原子操作：取当前索引后自增
      try {
        results[index] = await fetcher(urls[index]);
        console.log(`[完成] ${urls[index]}`);
      } catch (err) {
        results[index] = { error: err.message };
        console.log(`[失败] ${urls[index]}: ${err.message}`);
      }
    }
  }

  // 启动 limit 个 worker 并发工作
  const workers = Array.from({ length: Math.min(limit, urls.length) }, () => worker());
  await Promise.all(workers); // 等所有 worker 干完

  return results;
}

// --- 使用示例：模拟 20 个请求，最多 3 个并发 ---
const urls = Array.from({ length: 20 }, (_, i) => `/api/item/${i}`);
batchRequest(urls, 3).then(results => {
  console.log('全部完成:', results);
});
```

**并发控制示意图**：

```
urls = [A, B, C, D, E, F], limit = 3

时间 →
worker1: [A]══════[D]══════
worker2: [B]══════════[E]══
worker3: [C]══════[F]══════

同一时间最多 3 个请求在进行，A 完成后 worker1 立刻接 D
```

---

## 常见问题

**Q1：`await` 只能在 `async` 函数里用吗？**

在大多数环境（非模块脚本）中是。但在 ES Module 中，顶层 await 可以直接用于模块的顶层作用域。

---

**Q2：async 函数里面不写 await，会怎样？**

函数仍然返回 Promise。如果你不 await 任何东西，就只是把同步逻辑包了一层 Promise，没有实际意义（但有时是接口要求的）。

---

**Q3：为什么我的 `for` 循环里 `await` 还是并行的？**

检查你是不是用了 `map` 或 `forEach` 加上 `async` 回调。这两种方式不会真正等待。改成 `for...of` 或 `for (let i = 0; ...)`。

---

**Q4：try/catch 能抓到 async 函数内部所有错误吗？**

能抓到 `await` 产生的 reject 和同步 `throw`。但如果在 async 函数内部调用了另一个不加 `await` 的异步操作，它的错误不会被捕获——因为没被"连接"到当前 Promise 链。

---

**Q5：`await` 和 `return await` 有什么区别？**

在 async 函数中，`return await x` 和 `return x` 大部分情况下结果相同。区别在于：
- `return await x` 会在返回前多一个微任务 tick
- 如果 `x` 被 try/catch 包围，`return await x` 能捕获 reject，`return x` 不能

---

**Q6：顶层 await 会阻塞模块加载吗？**

会。依赖这个模块的其他模块会等待它完成。这就是它的设计目的——确保导入模块时数据已就绪。但不影响 HTML 解析和其他脚本。

---

**Q7：为什么我 async 函数的结果是 `Promise {<pending>}` 而不是实际值？**

因为你忘了 `await` 或者 `.then()`。async 函数总是返回 Promise，要拿到值就必须等它 resolve。

---

**Q8：`await Promise.all` 中一个失败会怎样？**

整体立即失败（reject）。如果你想"部分成功也接受"，用 `Promise.allSettled` 代替。

---

## 实操作业

### 基础：将 .then 链改写为 async/await

把下面的 `.then` 链改写为 async/await，并加上 try/catch 错误处理：

```javascript
function loadUserPage(userId) {
  return fetch(`/api/user/${userId}`)
    .then(res => {
      if (!res.ok) throw new Error('用户不存在');
      return res.json();
    })
    .then(user => {
      return fetch(`/api/posts?userId=${user.id}`);
    })
    .then(res => res.json())
    .then(posts => {
      return { user: {}, posts }; // 注意这里 user 已经拿不到了——请修复这个问题
    })
    .catch(err => {
      console.error(err);
      return { user: null, posts: [] };
    });
}
```

---

### 进阶：实现 sleep 函数和带重试的请求

```javascript
// 1. 实现 sleep(ms)，返回一个在 ms 毫秒后 resolve 的 Promise
function sleep(ms) {
  // 你的实现
}

// 2. 实现 retry(fn, times, delay)，失败后延迟重试
//    fn 返回 Promise，最多重试 times 次，每次重试前等待 delay 毫秒
async function retry(fn, times = 3, delay = 1000) {
  // 你的实现
}

// 测试
retry(() => fetch('/api/unstable'), 3, 500)
  .then(res => res.json())
  .then(console.log)
  .catch(err => console.error('重试全部失败:', err));
```

---

### 挑战：实现任务队列（支持优先级）

实现一个带优先级的异步任务队列，支持并发控制和任务优先级：

```javascript
class PriorityQueue {
  constructor(concurrency = 3) {
    // 你的实现
  }
  
  // 添加任务，priority 越高越优先执行
  add(task, priority = 0) {
    // task 是一个返回 Promise 的函数
    // 返回一个 Promise，在 task 执行完成后 resolve
  }
}

// 测试
const queue = new PriorityQueue(2);

// 高优先级的任务应该插队
queue.add(() => fetch('/api/urgent'),     10).then(() => console.log('紧急'));
queue.add(() => fetch('/api/normal-1'),    0).then(() => console.log('普通1'));
queue.add(() => fetch('/api/normal-2'),    0).then(() => console.log('普通2'));
queue.add(() => fetch('/api/important'),   5).then(() => console.log('重要'));
```

---

## 本节小结

- `async` 函数本质是返回 Promise 的语法糖——函数内部 return 的值自动变成 `Promise.resolve(值)`
- `await` 暂停的是当前 async 函数，不是 JS 线程；暂停期间事件循环继续运转
- async/await 让异步代码看起来像同步代码，大大提升可读性和调试体验
- 错误处理用 try/catch，它等价于 Promise 链的 `.catch()`
- 循环中想串行 await，用 `for...of`；`forEach` 不支持 await
- 没有依赖关系的多个 await 应该用 `Promise.all` 并行执行
- 并发请求数量控制（batchRequest 模式）是生产环境中的常见需求