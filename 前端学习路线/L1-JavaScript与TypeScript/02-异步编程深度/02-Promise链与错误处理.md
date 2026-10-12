# 02 — Promise 链与错误处理

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L1 JavaScript 与 TypeScript
> - 先修：[01 — 事件循环与任务队列](./01-事件循环与任务队列.md)
> - 建议用时：120-180 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[TypeScript](https://www.typescriptlang.org/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Promise 的本质：一个代表未来值的容器
- 掌握 Promise 三种状态（pending / fulfilled / rejected）及其不可逆性
- 能写出正确的 `.then()` 链，理解每一步 return 的值如何被下一个 `.then()` 接收
- 掌握 `.catch()` 的"穿透"机制和最佳放置位置
- 能根据场景选择正确的 Promise 静态方法（`Promise.all` / `allSettled` / `race` / `any`）
- 学会在 Promise 链中做正确的错误处理，避免"吞掉错误"或"重复处理"

---

## 内容讲解

### 1. Promise 到底是什么？

Promise 是一个**代表异步操作最终结果的对象**。它像一个快递单号——你拿到它的时候包裹可能还没到，但它承诺（Promise）你会有一个结果。

```
Promise 生命周期时间线：

  new Promise ──→ pending（进行中）
                  ├──→ resolve(value) ──→ fulfilled（已兑现）
                  └──→ reject(reason) ──→ rejected（已拒绝）

  状态一旦从 pending 变为 fulfilled 或 rejected，就永远不变（不可逆）
```

```javascript
// 创建一个 Promise
const p = new Promise((resolve, reject) => {
  // executor 函数是同步执行的！
  console.log('executor 同步运行');

  setTimeout(() => {
    const success = Math.random() > 0.5;
    if (success) {
      resolve('成功了');
    } else {
      reject(new Error('失败了'));
    }
  }, 1000);
});

// 此时 p 是 pending 状态
console.log(p); // Promise {<pending>}

// 1 秒后 p 的状态确定，触发 .then 或 .catch
p.then(value => console.log('结果:', value))
 .catch(err => console.log('错误:', err.message));
```

> **关键**：`new Promise(executor)` 里的 `executor` 函数是**同步**执行的，只有 `resolve/reject` 的回调（`.then/.catch`）才是异步（微任务）。

---

### 2. .then() 链的返回值传递规则

`.then()` 的核心规则只有两条，但很多人用错：

1. **`.then()` 总是返回一个新的 Promise**，所以可以一直 `.then().then().then()` 链下去
2. **下一个 `.then()` 收到的值 = 上一个 `.then()` 回调的 return 值**

```javascript
Promise.resolve(1)
  .then(v => {
    console.log(v);           // 1
    return v + 1;             // 返回普通值 → 包装成 Promise.resolve(2)
  })
  .then(v => {
    console.log(v);           // 2
    return Promise.resolve(v + 1); // 返回 Promise → 等它 resolve 后传值
  })
  .then(v => {
    console.log(v);           // 3
    // 不 return → 等价于 return undefined
  })
  .then(v => {
    console.log(v);           // undefined
  });
```

**返回值类型对照**：

| return 的类型 | 下一个 .then 收到的值 |
|--------------|---------------------|
| 普通值 `return 42` | `42` |
| Promise `return fetch(...)` | 等 Promise resolve 后的值 |
| thenable 对象 | 调用其 `.then()`，取结果 |
| 不写 return | `undefined` |
| throw Error | 走下一个 `.catch()` |

---

### 3. .catch() 的穿透机制

`.catch()` 是 `.then(undefined, onRejected)` 的语法糖。Promise 链中任何一个环节出错，错误都会**向下穿透**直到遇到最近的 `.catch()`：

```javascript
Promise.resolve()
  .then(() => {
    console.log('步骤 1');
    throw new Error('步骤 1 炸了');
  })
  .then(() => {
    // 这个 .then 不会执行，因为上一步抛出了错误
    console.log('步骤 2');
  })
  .catch(err => {
    console.log('捕获到:', err.message); // "捕获到: 步骤 1 炸了"
    return '恢复值';
  })
  .then(v => {
    console.log('继续执行，收到:', v);   // "继续执行，收到: 恢复值"
  });
```

**最佳实践：`.catch()` 放在链的末尾**：

```javascript
// ❌ 错误：中间 .catch 之后还继续 .then，错误被吞掉了
fetchUser(id)
  .catch(err => console.error(err))   // 打印后没有 return/rethrow
  .then(user => renderPage(user));    // user 可能是 undefined！

// ✅ 正确：.catch 放在末尾统一处理
fetchUser(id)
  .then(user => formatUser(user))
  .then(formatted => renderPage(formatted))
  .catch(err => {
    showErrorToast('加载失败');
    console.error(err);
  });
```

---

### 4. .finally() — 不管成败都要做的事

```javascript
showLoading(true);

fetch('/api/data')
  .then(res => res.json())
  .then(data => render(data))
  .catch(err => showError(err))
  .finally(() => {
    showLoading(false); // 无论成功还是失败，都要关掉 loading
  });
```

`.finally()` 的特点：
- 回调**不接受任何参数**（不知道是成功还是失败）
- 返回值不影响 Promise 链的结果（除非它在里面 throw）
- 适合做清理工作：关闭 loading、清除定时器、释放资源

---

### 5. Promise 静态方法全景

| 方法 | 行为 | 典型场景 |
|------|------|----------|
| `Promise.resolve(v)` | 返回一个 fulfilled 的 Promise | 包装同步值，统一处理 |
| `Promise.reject(e)` | 返回一个 rejected 的 Promise | 快速返回失败 |
| `Promise.all([p1, p2])` | **全部成功**才成功；任意一个失败就失败 | 并发请求多个独立接口 |
| `Promise.allSettled([p1, p2])` | **全部完成**后返回每个的结果（含成功和失败） | 批量操作，需要知道每个的状态 |
| `Promise.race([p1, p2])` | **第一个完成**的就返回（无论成败） | 超时控制 |
| `Promise.any([p1, p2])` | **第一个成功**的就返回；全部失败则 AggregateError | 从多个镜像/备用源获取 |

**对比示例**：

```javascript
const p1 = Promise.resolve('成功');
const p2 = Promise.reject('失败');
const p3 = new Promise(resolve => setTimeout(() => resolve('慢'), 1000));

// Promise.all：一个失败，整体失败
Promise.all([p1, p2, p3])
  .then(console.log)
  .catch(err => console.log('all 失败:', err)); // → all 失败: 失败

// Promise.allSettled：全部完成，告诉你每个的结果
Promise.allSettled([p1, p2, p3]).then(results => {
  // results = [
  //   { status: 'fulfilled', value: '成功' },
  //   { status: 'rejected',  reason: '失败' },
  //   { status: 'fulfilled', value: '慢' }
  // ]
});

// Promise.race：第一个（p1）完成就返回
Promise.race([p1, p2, p3]).then(console.log); // → 成功

// Promise.any：第一个成功的（p1）就返回
Promise.any([p2, p1, p3]).then(console.log); // → 成功

// Promise.any：全部失败
Promise.any([Promise.reject('A'), Promise.reject('B')])
  .catch(err => console.log(err.errors)); // → ['A', 'B']
```

---

### 6. 错误处理最佳实践

**原则 1：不要吞掉错误**

```javascript
// ❌ 坏习惯
fetchUser(id).catch(() => {}); // 错误被彻底吞掉

// ✅ 至少记录一下
fetchUser(id).catch(err => {
  console.error('fetchUser 失败:', err);
  throw err; // 继续传播，让上层决定
});
```

**原则 2：区分业务错误和程序错误**

```javascript
fetch('/api/user')
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(data => {
    if (data.code !== 0) throw new BusinessError(data.message);
    return data.result;
  })
  .catch(err => {
    if (err instanceof BusinessError) {
      showToast(err.message);     // 业务错误：提示用户
    } else {
      showToast('网络异常');      // 程序错误：通用提示
      reportError(err);           // 上报到监控系统
    }
  });
```

**原则 3：async 函数中用 try/catch**

```javascript
async function loadPage() {
  try {
    const user = await fetchUser();
    const posts = await fetchPosts(user.id);
    render(user, posts);
  } catch (err) {
    showErrorPage(err);
  }
}
```

---

### 7. 实战：带超时和重试的 fetch

```javascript
/**
 * 带超时和重试的 fetch 封装
 * @param {string} url     - 请求地址
 * @param {object} options - fetch 选项（含 retry 和 timeout）
 * @returns {Promise<Response>}
 */
function fetchWithRetry(url, options = {}) {
  const { retry = 3, timeout = 5000, ...fetchOptions } = options;

  // 创建一个带超时的 fetch
  function fetchWithTimeout(url, opts) {
    return new Promise((resolve, reject) => {
      // 超时控制器
      const timer = setTimeout(() => {
        reject(new Error(`请求超时 (${timeout}ms)`));
      }, timeout);

      fetch(url, opts)
        .then(res => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  // 递归重试
  function attempt(remainingRetries) {
    return fetchWithTimeout(url, fetchOptions).catch(err => {
      if (remainingRetries <= 0) {
        throw err; // 重试次数用完，抛出错误
      }
      console.log(`请求失败，剩余重试 ${remainingRetries} 次: ${err.message}`);
      return attempt(remainingRetries - 1);
    });
  }

  return attempt(retry);
}

// --- 使用示例 ---
fetchWithRetry('/api/data', { retry: 3, timeout: 3000 })
  .then(res => res.json())
  .then(data => console.log('数据:', data))
  .catch(err => console.error('最终失败:', err.message));
```

---

## 常见问题

**Q1：`.then(onFulfilled, onRejected)` 和 `.then(onFulfilled).catch(onRejected)` 有什么区别？**

前者只在对应的 `.then` 返回的 Promise 被 reject 时触发；但 `onFulfilled` 内部抛出的错误**不会被**同一个 `.then` 的 `onRejected` 捕获。后者能捕获前面所有链上的错误，是推荐写法。

---

**Q2：Promise 构造函数里的 `resolve` 和 `reject` 能否同时调用？**

能调用，但只有**第一次**生效。状态一旦确定就不可变，后续调用被忽略。

---

**Q3：`Promise.all` 失败了，其他请求还会继续吗？**

会继续（请求已经发出去了），但 Promise.all 立即 reject，不关心其他请求的结果。如果你想等所有请求都完成再判断，用 `Promise.allSettled`。

---

**Q4：如何在 `.then` 里跳过后续 `.then` 直接到 `.catch`？**

直接 `throw new Error(...)` 即可。错误会自动穿透到链上的最近 `.catch`。

---

**Q5：`Promise.resolve()` 和 `new Promise(resolve => resolve())` 一样吗？**

基本一样。但 `Promise.resolve()` 如果传入的是一个 Promise，会直接返回它（不会包装一层）。如果你需要一个"全新"的 Promise 包装，用 `new Promise`。

---

**Q6：`.finally` 里能改变返回值吗？**

不能。`.finally` 的回调返回值被忽略（除非它自身 throw）。链的返回值仍然是 `.finally` 之前那个 Promise 的值。

---

**Q7：为什么 `fetch` 的 404 状态码不会触发 `.catch`？**

因为 `fetch` 只把**网络错误**（断网、DNS 解析失败等）视为 reject。HTTP 4xx/5xx 状态码在 HTTP 层面是"成功响应"，需要自己检查 `res.ok`。

---

**Q8：多个 `.then` 链 vs 嵌套 `.then`，哪种更好？**

链式（扁平）更好。嵌套就是回调地狱的 Promise 版，失去了 Promise 的意义。

```javascript
// ❌ 嵌套：回到回调地狱
fetchUser().then(user => {
  fetchPosts(user.id).then(posts => { /* ... */ });
});

// ✅ 链式：清晰
fetchUser()
  .then(user => fetchPosts(user.id))
  .then(posts => { /* ... */ });
```

---

## 实操作业

### 基础：实现 Promise 链

用 Promise 链实现一个用户登录 → 获取资料 → 渲染页面的流程，要求每一步有 loading 状态和错误处理。

```javascript
// 模拟 API
function login(credentials) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (credentials.password === '123456') resolve({ token: 'abc' });
      else reject(new Error('密码错误'));
    }, 500);
  });
}

function fetchProfile(token) {
  return new Promise(resolve => {
    setTimeout(() => resolve({ name: '张三', avatar: '/avatar.png' }), 500);
  });
}
```

---

### 进阶：实现 Promise.all 的简化版

自己实现一个 `promiseAll(promises)` 函数，行为与 `Promise.all` 一致：全部成功才成功，有一个失败就失败，结果顺序与输入顺序一致。

```javascript
function promiseAll(promises) {
  // 你的实现
}

// 测试
promiseAll([
  Promise.resolve(1),
  new Promise(r => setTimeout(() => r(2), 100)),
  Promise.resolve(3),
]).then(console.log); // [1, 2, 3]
```

---

### 挑战：带并发限制的批量请求

编写一个 `batchRequest(urls, limit)` 函数，传入 URL 数组和最大并发数，同时最多发起 `limit` 个请求，一个完成就补上下一个，直到全部完成。

```javascript
function batchRequest(urls, limit) {
  // 你的实现
}

// 测试：10 个 URL，每次最多 3 个并发
batchRequest(urls, 3).then(results => console.log('全部完成', results));
```

提示：用一个索引记录"下一个该发的 URL"，每个请求完成时检查是否还有待发的 URL。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L1 里程碑](../../projects/atlas/milestones/L1.md)
- 本课任务：把“Promise 链与错误处理”落实为 Atlas 中可独立导入的模块或纯函数，补充正常、边界、异常三类自动测试。
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

- Promise 是异步操作的容器，状态从 pending 变为 fulfilled 或 rejected 后不可逆
- `.then()` 链的核心是"返回值传递"——下一个 `.then` 收到的永远是上一个 `.then` 回调的 return 值
- `.catch()` 放在链末尾处理整条链的错误，不要放在中间"吞错误"
- `Promise.all` 用于"全部成功才继续"，`Promise.allSettled` 用于"需要知道每个的结果"
- `Promise.race` 适合超时控制，`Promise.any` 适合多备用源取最快成功的
- 带超时和重试的请求是生产环境中几乎必用的模式

<!-- course-nav:start -->
---

[上一篇：01 — 事件循环与任务队列](./01-事件循环与任务队列.md) · [课程地图](../../README.md) · [下一篇：03 — async/await 原理与实践](./03-async-await原理与实践.md)
<!-- course-nav:end -->
