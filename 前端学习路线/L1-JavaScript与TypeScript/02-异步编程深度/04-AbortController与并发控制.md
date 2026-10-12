# 04 — AbortController 与并发控制

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L1 JavaScript 与 TypeScript
> - 先修：[03 — async/await 原理与实践](./03-async-await原理与实践.md)
> - 建议用时：120-180 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[TypeScript](https://www.typescriptlang.org/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 AbortController 和 AbortSignal 是什么，为什么需要它们
- 掌握取消 fetch 请求的标准方式（`signal` 参数）
- 学会用 `AbortSignal` 的 `abort` 事件取消普通 Promise
- 掌握 `AbortSignal.timeout()` 实现超时控制
- 能识别并解决竞态条件（Race Condition）
- 实现防抖（debounce）+ AbortController 的可取消搜索建议

---

## 内容讲解

### 1. 为什么需要 AbortController？

先看一个真实的场景：

```
用户输入 "react"，开始请求 react 的搜索建议 → 出发: 请求 A

用户继续输入 "react h"，上一个请求还没返回 → 出发: 请求 B

用户输入完 "react hooks"，请求 B 也没返回  → 出发: 请求 C

然后：请求 A 返回了"react 旧结果"，请求 B 返回了"react h* 中间结果"，
     请求 C 返回了"react hooks 最终结果"

结果：页面快速闪烁，先显示 A 的结果，再 B，再 C
     用户看到的是三次不同结果快速切换——这就是"竞态条件"
```

**AbortController 解决的核心问题**：让你能主动取消一个正在进行的异步操作，避免旧请求覆盖新请求。

---

### 2. AbortController 基本用法

```javascript
// 创建一个控制器
const controller = new AbortController();

// controller.signal 是信号对象，传给需要取消的操作
const signal = controller.signal;

// 发起一个可取消的 fetch 请求
fetch('/api/data', { signal })
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('请求被取消了');
    } else {
      console.error('其他错误:', err);
    }
  });

// 在某个时机取消请求
controller.abort(); // → fetch 立即 reject，抛出一个 AbortError
```

**核心概念**：

| 对象 | 角色 |
|------|------|
| `AbortController` | 控制器，拥有 `signal` 属性和 `abort()` 方法 |
| `AbortSignal` | 信号，被传给异步操作。`aborted` 属性表示是否已取消 |
| `abort()` | 发出取消信号，可以传原因：`controller.abort('不再需要')` |
| `AbortError` | 取消后抛出的错误类型 `name` |

---

### 3. 取消 fetch 请求

```javascript
async function fetchWithCancel(url) {
  const controller = new AbortController();

  // 同时启动请求和超时
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      console.log('请求超时或被取消');
    }
    throw err;
  }
}
```

**signal 一旦被 abort，就不能重用**。每次新请求都需要一个新的 AbortController。

```javascript
// ❌ 错误：复用同一个 signal
const controller = new AbortController();
fetch('/a', { signal: controller.signal });
controller.abort();
fetch('/b', { signal: controller.signal }); // 一发出就被取消！

// ✅ 正确：每次请求创建新的 controller
function createFetch(url) {
  const controller = new AbortController();
  const promise = fetch(url, { signal: controller.signal });
  return { promise, abort: () => controller.abort() };
}
```

---

### 4. 取消普通 Promise

不是只有 fetch 才能用 AbortController。你可以让任何 Promise 响应 abort 信号：

```javascript
/**
 * 创建一个可取消的 Promise
 * @param {Function} task    - 返回 Promise 的任务函数
 * @param {AbortSignal} signal - 取消信号
 */
function abortable(task, signal) {
  // 如果已经取消了，直接返回 rejected
  if (signal.aborted) {
    return Promise.reject(signal.reason || new DOMException('已取消', 'AbortError'));
  }

  return new Promise((resolve, reject) => {
    // 监听 abort 事件
    const onAbort = () => reject(signal.reason || new DOMException('已取消', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });

    // 执行实际任务
    task()
      .then(resolve, reject)
      .finally(() => {
        // 清理监听器，避免内存泄漏
        signal.removeEventListener('abort', onAbort);
      });
  });
}

// --- 使用 ---
const controller = new AbortController();

abortable(
  () => new Promise(resolve => setTimeout(() => resolve('完成'), 3000)),
  controller.signal
).then(console.log).catch(err => console.log(err.message));

setTimeout(() => controller.abort(), 500); // 0.5 秒后取消
// → 输出: 已取消
```

---

### 5. AbortSignal.timeout() — 现代超时控制

`AbortSignal.timeout(ms)` 是较新的语法（Chrome 103+），创建一个在指定时间后自动取消的信号：

```javascript
// 旧方式：手动创建 controller + setTimeout
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);
fetch('/api', { signal: controller.signal });

// 新方式：一行搞定
fetch('/api', { signal: AbortSignal.timeout(5000) });
```

**组合多个信号**：`AbortSignal.any([signal1, signal2])`（Chrome 116+）：

```javascript
// 同时满足"手动取消"和"超时取消"两个条件
const userCancel = new AbortController();
const combinedSignal = AbortSignal.any([
  userCancel.signal,                    // 用户点击取消按钮
  AbortSignal.timeout(10000),           // 10 秒超时
]);

fetch('/api/data', { signal: combinedSignal })
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('被取消或超时');
    }
  });

// 用户可以手动取消
cancelButton.onclick = () => userCancel.abort();
```

---

### 6. 竞态条件（Race Condition）的解决方案

竞态条件是指"多个异步操作的结果到达顺序不确定，导致旧结果覆盖新结果"。

**方案一：AbortController（推荐）**

```javascript
let currentController = null;

async function search(query) {
  // 取消上一次搜索
  currentController?.abort();

  // 创建新的控制器
  const controller = new AbortController();
  currentController = controller;

  try {
    const res = await fetch(`/api/search?q=${query}`, {
      signal: controller.signal,
    });
    const results = await res.json();
    renderResults(results);
  } catch (err) {
    if (err.name === 'AbortError') return; // 被取消了，忽略
    console.error(err);
  }
}
```

**方案二：使用唯一标记（不需要 AbortController 的环境）**

```javascript
let requestId = 0;

async function search(query) {
  const id = ++requestId; // 每次请求分配唯一 ID

  const res = await fetch(`/api/search?q=${query}`);
  const results = await res.json();

  // 只有最新请求的结果才生效
  if (id === requestId) {
    renderResults(results);
  }
}
```

两者对比：
- **AbortController**：真正取消请求（浏览器停止接收数据），节省带宽
- **唯一标记**：请求仍在传输，只是丢弃旧结果，实现更简单

---

### 7. 实战：可取消的搜索建议输入框

结合防抖（debounce）和 AbortController，实现一个完整的搜索建议功能：

```javascript
/**
 * 创建可取消的搜索建议控制器
 * @param {Function} fetcher - 请求函数，接收 query 和 signal
 * @param {number}   debounceMs - 防抖延迟（毫秒）
 */
function createSearchController(fetcher, debounceMs = 300) {
  let controller = null;    // 当前请求的 AbortController
  let debounceTimer = null; // 防抖定时器

  return {
    /**
     * 触发搜索
     * @param {string} query - 搜索关键词
     */
    async search(query) {
      // 清除上一次的防抖定时器
      clearTimeout(debounceTimer);

      // 如果 query 为空，取消当前请求并清空结果
      if (!query.trim()) {
        controller?.abort();
        return [];
      }

      // 每次都取消上一次请求
      controller?.abort();

      // 防抖：等用户停止输入 debounceMs 毫秒后再发起请求
      return new Promise((resolve, reject) => {
        debounceTimer = setTimeout(async () => {
          const currentController = new AbortController();
          controller = currentController;

          try {
            const results = await fetcher(query, currentController.signal);
            resolve(results);
          } catch (err) {
            if (err.name === 'AbortError') return; // 被取消，不处理
            reject(err);
          }
        }, debounceMs);
      });
    },

    /** 销毁控制器，清理所有资源 */
    destroy() {
      controller?.abort();
      clearTimeout(debounceTimer);
      controller = null;
      debounceTimer = null;
    }
  };
}

// --- 使用示例 ---
const searchCtrl = createSearchController(
  async (query, signal) => {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
    if (!res.ok) throw new Error(`搜索失败: ${res.status}`);
    return res.json();
  },
  300 // 300ms 防抖
);

// 绑定到 input 事件
const input = document.getElementById('search-input');
const resultsDiv = document.getElementById('results');

input.addEventListener('input', async (e) => {
  try {
    resultsDiv.textContent = '搜索中...';
    const results = await searchCtrl.search(e.target.value);
    if (results) {
      resultsDiv.innerHTML = results.map(item => `<li>${item.title}</li>`).join('');
    }
  } catch (err) {
    resultsDiv.textContent = `错误: ${err.message}`;
  }
});

// 组件卸载时清理
// searchCtrl.destroy();
```

**执行流程时间线**：

```
用户输入 "r"         → 启动防抖 300ms
用户输入 "re"        → 清除上一定时器，重新启动 300ms（未发请求）
用户输入 "rea"       → 同上
用户输入 "reac"      → 同上
300ms 内无输入       → 发起请求 A (query="reac")
用户输入 "react"     → controller.abort() 取消请求 A，启动新防抖
300ms 内无输入       → 发起请求 B (query="react")
请求 B 返回          → 显示结果

只有请求 B 的结果会显示，请求 A 被优雅取消
```

---

## 常见问题

**Q1：AbortController 能取消 WebSocket 吗？**

不能直接取消。`AbortController` 主要用于 fetch 和自定义封装。WebSocket 有自己的 `close()` 方法。

---

**Q2：被 abort 的 fetch 会报什么错误？**

`DOMException`，`name` 属性为 `'AbortError'`。你应该在 catch 中检查 `err.name === 'AbortError'` 来区分"故意取消"和"真正的错误"。

---

**Q3：同一个 AbortController 能用于多个 fetch 请求吗？**

可以。调用 `controller.abort()` 会同时取消所有共享这个 signal 的请求。这在需要"一键取消所有请求"时很有用。

---

**Q4：`AbortSignal.timeout()` 的兼容性如何？**

Chrome 103+、Edge 103+、Safari 16.4+、Firefox 不支持。生产环境建议先检查可用性：

```javascript
const signal = AbortSignal.timeout
  ? AbortSignal.timeout(5000)
  : (() => { const c = new AbortController(); setTimeout(() => c.abort(), 5000); return c.signal; })();
```

---

**Q5：能取消 `setTimeout` 吗？**

`setTimeout` 有自己的 `clearTimeout`。但如果你想用 AbortSignal 统一管理，可以封装：

```javascript
function abortableTimeout(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('已取消', 'AbortError'));
    const id = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(id); reject(new DOMException('已取消', 'AbortError')); }, { once: true });
  });
}
```

---

**Q6：如何检测当前环境是否支持 AbortController？**

```javascript
const supportsAbort = typeof AbortController !== 'undefined';
```

AbortController 在 IE 上不支持，但所有现代浏览器（包括 Safari）都支持。

---

**Q7：如果用户快速点击"取消"按钮多次，会出问题吗？**

多次调用 `controller.abort()` 是安全的——第二次及之后的调用不会有任何效果（signal 已经是 aborted 状态）。

---

**Q8：事件监听用的 `{ once: true }` 是什么？**

它表示监听器触发一次后自动移除。在 AbortController 场景中很重要：如果不加 `once: true`，监听器会一直保留引用，可能导致内存泄漏。

---

## 实操作业

### 基础：为 fetch 封装超时功能

封装一个 `fetchWithTimeout(url, timeout)` 函数，使用 AbortController 实现超时控制：

```javascript
async function fetchWithTimeout(url, timeout = 5000) {
  // 你的实现
  // 要求：超时后抛出有意义的错误信息
}

// 测试
fetchWithTimeout('/api/slow', 1000)
  .then(res => res.json())
  .then(console.log)
  .catch(err => console.error(err.message));
```

---

### 进阶：实现一个支持切换 Tab 取消请求的数据加载 Hook

假设你在 React/Vue 中有一个多 Tab 页，切换 Tab 时上一个 Tab 的数据请求应该被取消：

```javascript
/**
 * 创建一个 Tab 切换安全的数据加载器
 * 切换 Tab 时自动取消旧请求
 */
function createTabLoader(fetcher) {
  let controller = null;

  return {
    async loadTab(tabId, params) {
      // 你的实现
      // 1. 取消上一次请求
      // 2. 发起新请求
      // 3. 返回请求结果
    },
    destroy() {
      // 清理
    }
  };
}

// 测试
const loader = createTabLoader((params, signal) =>
  fetch(`/api/tab-data?tab=${params.tab}`, { signal }).then(r => r.json())
);

loader.loadTab('tab1', { tab: 1 });
setTimeout(() => loader.loadTab('tab2', { tab: 2 }), 100); // tab1 的请求应被取消
```

---

### 挑战：上传文件时支持暂停/恢复/取消

实现一个带进度、支持暂停和取消的文件上传函数：

```javascript
/**
 * 支持暂停/恢复/取消的分片上传
 * @param {File} file            - 要上传的文件
 * @param {string} uploadUrl     - 上传接口地址
 * @param {number} chunkSize     - 每片大小（字节），默认 1MB
 * @param {Function} onProgress  - 进度回调
 */
function createResumableUpload(file, uploadUrl, chunkSize = 1024 * 1024, onProgress) {
  const controller = new AbortController();
  let isPaused = false;
  let resumeResolve = null;

  // 你的实现
  return {
    start()   { /* 开始上传 */ },
    pause()   { /* 暂停上传 */ },
    resume()  { /* 恢复上传 */ },
    cancel()  { /* 取消上传 */ },
  };
}
```

提示：将文件切片（`file.slice()`），逐个上传每一片。暂停时停止发送下一片，恢复时继续。

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：设 controller 与 timer，finally 清 timer，保留原有 signal 的取消。区分 timeout 与用户取消；HTTP 500 不等于 fetch 网络拒绝，仍需 response.ok 检查。
- **进阶**：切 Tab 时 abort 旧请求并递增序号；返回前核对当前 Tab/序号。A 慢 B 快时只显示 B，卸载后不更新，错误和 loading 都遵循同一守卫。
- **挑战**：每个分片有 ID/大小/摘要和重试状态，暂停停止新调度，取消 abort 在途请求。恢复先核对服务端清单，重复片幂等，最终合并由服务端重新验证完整文件。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L1 里程碑](../../projects/atlas/milestones/L1.md)
- 本课任务：把“AbortController 与并发控制”落实为 Atlas 中可独立导入的模块或纯函数，补充正常、边界、异常三类自动测试。
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

- `AbortController` 让异步操作可以被主动取消——不再被动等待
- `fetch(url, { signal })` 是取消网络请求的标准方式
- `AbortSignal.abort` 事件可以监听任何 Promise 的取消，不只是 fetch
- `AbortSignal.timeout()` 能让超时控制变得简洁优雅
- 竞态条件的本质是"旧结果覆盖新结果"，AbortController 可以真正取消旧请求
- 搜索建议输入框 = debounce（防抖）+ AbortController（取消旧请求），是前端最高频的组合模式
- 复用 AbortController 会出错：每次新请求都必须创建新的实例

<!-- course-nav:start -->
---

[上一篇：03 — async/await 原理与实践](./03-async-await原理与实践.md) · [课程地图](../../README.md) · [下一篇：01-迭代器与生成器](../03-JavaScript进阶机制/01-迭代器与生成器.md)
<!-- course-nav:end -->
