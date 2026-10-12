# 高阶组件与自定义 Hooks

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[Compound Components 模式](./03-Compound-Components模式.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN Web Docs](https://developer.mozilla.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解高阶组件（HOC）的经典应用场景：日志注入、权限控制、Loading 包裹
- 掌握 HOC 的约定：透传 props、displayName、避免 props 冲突
- 深入理解 HOC 的缺点：嵌套地狱、静态方法丢失、ref 转发问题
- 掌握自定义 Hook 的理念：逻辑复用而非 UI 复用
- 熟练实现 7 个常用自定义 Hook（React）及其 Vue Composable 等效实现
- 能独立实现带缓存、重试、竞态保护的通用 API 请求 Hook

---

## 内容讲解

### 一、高阶组件回顾

高阶组件是 React 早期（Hooks 出现之前）逻辑复用的主要手段。它的定义很简单：

> **HOC 是一个函数，接收一个组件，返回一个新组件。**

```jsx
const EnhancedComponent = withSomething(WrappedComponent);
```

#### 1.1 经典应用场景

**日志注入** —— 给组件自动添加「已挂载/已卸载/已更新」日志：

```jsx
function withLogger(WrappedComponent) {
  function WithLogger(props) {
    useEffect(() => {
      const name = WrappedComponent.displayName || WrappedComponent.name || 'Component';
      console.log(`[${name}] 已挂载`);
      return () => console.log(`[${name}] 已卸载`);
    }, []);

    return <WrappedComponent {...props} />;
  }

  WithLogger.displayName = `withLogger(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithLogger;
}
```

**权限控制** —— 无权限时渲染替代 UI：

```jsx
function withAuth(WrappedComponent, requiredPermission) {
  function WithAuth(props) {
    const { permissions } = useContext(AuthContext);

    if (!permissions.includes(requiredPermission)) {
      return <div className="forbidden">您没有权限访问此功能</div>;
    }

    return <WrappedComponent {...props} />;
  }

  WithAuth.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithAuth;
}

// 使用
const AdminPanel = withAuth(Panel, 'admin');
```

**Loading 包裹** —— 根据 loading 状态自动切换 UI：

```jsx
function withLoading(WrappedComponent) {
  function WithLoading({ loading, ...props }) {
    if (loading) return <div className="spinner">加载中...</div>;
    return <WrappedComponent {...props} />;
  }

  WithLoading.displayName = `withLoading(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithLoading;
}
```

#### 1.2 HOC 的硬性约定

所有合格的 HOC 都必须遵守以下约定：

```jsx
function withXXX(WrappedComponent) {
  function Enhanced(props) {
    // 1. 透传所有 props —— 不吞掉任何 prop
    // 2. 不要修改原组件 —— HOC 是纯函数，不修改 WrappedComponent 的原型
    return <WrappedComponent {...props} />;
  }

  // 3. 设置 displayName —— 方便 React DevTools 调试
  Enhanced.displayName = `withXXX(${WrappedComponent.displayName || WrappedComponent.name})`;

  // 4. 复制静态方法（如果需要）
  // hoistNonReactStatic(Enhanced, WrappedComponent);

  return Enhanced;
}
```

#### 1.3 HOC 的三大硬伤

**硬伤一：嵌套地狱**

```jsx
// 真实项目中你可能见过这种代码
export default withRouter(
  withAuth(
    withLoading(
      withErrorBoundary(
        withTheme(MyComponent)
      )
    )
  )
);
```

在 React DevTools 中看到的是 `withRouter(withAuth(withLoading(withErrorBoundary(withTheme(MyComponent)))))`，调试非常痛苦。

**硬伤二：Props 冲突**

```jsx
// withAuth 注入了 auth prop
const Enhanced = withAuth(MyComponent);

// 使用时可能不小心覆盖
<Enhanced auth={myAuth} />  // 这个 auth 会覆盖 HOC 注入的 auth
```

HOC 无法保证它注入的 prop 名不被使用方占用。

**硬伤三：Ref 无法透传**

```jsx
const EnhancedInput = withLogger(Input);  // Input 内部有 ref
<EnhancedInput ref={inputRef} />          // ref 指向的是 WithLogger，不是真实的 Input！
```

必须额外使用 `React.forwardRef`，增加复杂度。

---

### 二、从 HOC 到自定义 Hook：思想转变

React 16.8 引入 Hooks 之后，你的思维模式应该从「包装组件」变为「抽取逻辑」。

| HOC 思维 | Hook 思维 |
|---|---|
|「这个组件需要什么能力？」→ 用 HOC 包裹它 |「这段逻辑能独立出来吗？」→ 抽成 Hook |
| 面向组件 | 面向逻辑 |
| 返回一个新组件 | 返回状态和方法 |
| 修改组件树结构 | 不修改组件树结构 |

**关键认知**：HOC 是**UI 复用**（把组件包起来变成新组件），Hook 是**逻辑复用**（把逻辑抽出来，多个组件各自调用）。Hook 解决的恰恰是 HOC 最大的痛点——你不必再创建新的组件层级。

---

### 三、React 自定义 Hooks 全解

#### 3.1 usePrevious —— 保存上一次的值

```jsx
import { useRef, useEffect } from 'react';

/**
 * 保存上一次渲染时的值
 * 典型场景：比较前后值的变化，决定是否执行副作用
 */
function usePrevious(value) {
  const ref = useRef();

  // useEffect 在渲染完成后执行，所以 ref.current 始终是「上一次」的值
  useEffect(() => {
    ref.current = value;
  });

  return ref.current;
}

// 使用
function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>当前：{count}，之前：{prevCount ?? '无'}</p>
      <p>变化方向：{count > prevCount ? '增加' : count < prevCount ? '减少' : '不变'}</p>
    </div>
  );
}
```

#### 3.2 useLocalStorage —— 持久化状态

```jsx
import { useState, useEffect } from 'react';

function useLocalStorage(key, initialValue) {
  // 惰性初始化：只在首次渲染时读取 localStorage
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue; // 解析失败时回退
    }
  });

  // 值变化时写回 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`写入 localStorage 失败 (${key}):`, err);
    }
  }, [key, value]);

  return [value, setValue];
}
```

#### 3.3 useDebounce —— 防抖

```jsx
import { useState, useEffect } from 'react';

function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // 每次 value 变化，设置一个定时器
    const timer = setTimeout(() => setDebouncedValue(value), delay);

    // 下次 effect 执行前清除上次的定时器（防抖核心）
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// 使用：搜索框防抖
function SearchBox() {
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 500);

  useEffect(() => {
    if (debouncedKeyword) {
      fetch(`/api/search?q=${debouncedKeyword}`);
    }
  }, [debouncedKeyword]);
}
```

#### 3.4 useThrottle —— 节流

```jsx
import { useState, useRef, useCallback } from 'react';

function useThrottle(fn, delay = 300) {
  const lastRun = useRef(0);
  const timer   = useRef(null);

  const throttledFn = useCallback((...args) => {
    const now = Date.now();

    if (now - lastRun.current >= delay) {
      // 距离上次执行已超过 delay，立即执行
      lastRun.current = now;
      fn(...args);
    } else {
      // 否则设置一个定时器，在剩余时间后执行
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        lastRun.current = Date.now();
        fn(...args);
      }, delay - (now - lastRun.current));
    }
  }, [fn, delay]);

  return throttledFn;
}
```

#### 3.5 useToggle —— 布尔切换

```jsx
import { useState, useCallback } from 'react';

function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const setTrue  = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return [value, { toggle, setTrue, setFalse }];
}
```

#### 3.6 useEventListener —— 事件监听

```jsx
import { useEffect, useRef } from 'react';

function useEventListener(eventName, handler, element = window) {
  // 用 ref 保存 handler，避免 effect 因 handler 引用变化而频繁重新绑定
  const savedHandler = useRef(handler);
  savedHandler.current = handler;

  useEffect(() => {
    const listener = (event) => savedHandler.current(event);
    element.addEventListener(eventName, listener);
    return () => element.removeEventListener(eventName, listener);
  }, [eventName, element]); // handler 变化不会触发重新绑定
}

// 使用
useEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
```

**设计要点**：`savedHandler` 模式让你在事件监听中**始终拿到最新的 handler 引用**，同时避免 effect 频繁重新绑定事件。

---

### 四、Vue Composables —— 等效实现

Vue 的 Composition API 原生支持逻辑抽取（Composable 就是 Vue 版的「自定义 Hook」）：

#### 4.1 useMouse

```js
// composables/useMouse.js
import { ref, onMounted, onUnmounted } from 'vue'

export function useMouse() {
  const x = ref(0)
  const y = ref(0)

  function update(e) {
    x.value = e.clientX
    y.value = e.clientY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }
}

// 使用
// const { x, y } = useMouse()
```

#### 4.2 useLocalStorage

```js
import { ref, watch } from 'vue'

export function useLocalStorage(key, initialValue) {
  const stored = localStorage.getItem(key)
  const value = ref(stored !== null ? JSON.parse(stored) : initialValue)

  watch(value, (newVal) => {
    localStorage.setItem(key, JSON.stringify(newVal))
  }, { deep: true })

  return value
}
```

#### 4.3 useDebounce

```js
import { ref, watch } from 'vue'

export function useDebounce(source, delay = 300) {
  const debounced = ref(source.value)
  let timer = null

  watch(source, (newVal) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      debounced.value = newVal
    }, delay)
  })

  return debounced
}

// 使用
// const keyword = ref('')
// const debouncedKeyword = useDebounce(keyword, 500)
```

#### 4.4 Vue 版 Composable 与 React Hook 的关键差异

| 维度 | React Hook | Vue Composable |
|---|---|---|
| 调用时机 | 每次渲染都执行，依赖依赖数组控制 | 只在 `setup` 中执行一次 |
| 响应式模型 | 手动声明依赖，值变化触发重新渲染 | 自动追踪依赖，值变化自动通知 |
| 清理机制 | `useEffect` 返回清理函数 | `onUnmounted` 生命周期钩子 |
| 心智模型 | 声明式 + 依赖数组 | 声明式 + 自动依赖追踪 |

---

### 五、实战：通用 API 请求 Hook

**需求**：实现一个 Hook/Composable，支持 `loading`、`error`、`data`、`retry`、`cache`、竞态保护。

#### React 实现

```jsx
import { useState, useEffect, useCallback, useRef } from 'react';

// 模块级缓存（所有使用本 Hook 的组件共享）
const cache = new Map();

/**
 * useFetch —— 通用数据获取 Hook
 *
 * @param {string} key     缓存键（通常就是 URL）
 * @param {function} fetcher 请求函数，返回 Promise<data>
 * @param {object} options
 * @param {boolean} options.enabled      是否启用（默认 true）
 * @param {number}  options.cacheTime    缓存有效期（毫秒，0 表示不缓存）
 * @param {number}  options.retryCount   重试次数（默认 0）
 * @param {number}  options.retryDelay   重试间隔（毫秒，默认 1000）
 * @returns {{ data, loading, error, retry, refresh }}
 */
function useFetch(key, fetcher, options = {}) {
  const {
    enabled = true,
    cacheTime = 0,
    retryCount = 0,
    retryDelay = 1000,
  } = options;

  const [data, setData]       = useState(() => {
    // 初始化时尝试从缓存读取
    if (cacheTime > 0 && cache.has(key)) {
      const cached = cache.get(key);
      if (Date.now() - cached.time < cacheTime) return cached.data;
      cache.delete(key);
    }
    return undefined;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  // 竞态保护：记录请求序号，只处理最新一次的响应
  const requestIdRef = useRef(0);

  const execute = useCallback(async (remainingRetries = retryCount) => {
    const currentRequestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();

      // 竞态保护：如果这不是最新请求，忽略结果
      if (currentRequestId !== requestIdRef.current) return;

      setData(result);
      setLoading(false);

      // 写入缓存
      if (cacheTime > 0) {
        cache.set(key, { data: result, time: Date.now() });
      }
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return;

      // 重试逻辑
      if (remainingRetries > 0) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        execute(remainingRetries - 1);
        return;
      }

      setError(err);
      setLoading(false);
    }
  }, [key, fetcher, retryCount, retryDelay, cacheTime]);

  // enabled 为 true 时自动请求
  useEffect(() => {
    if (enabled && key) {
      execute();
    }
  }, [key, enabled, execute]);

  // retry：手动重试（从头开始，不消耗剩余重试次数）
  const retry = useCallback(() => execute(retryCount), [execute, retryCount]);

  // refresh：强制刷新（跳过缓存）
  const refresh = useCallback(() => {
    if (cacheTime > 0) cache.delete(key);
    execute(retryCount);
  }, [key, cacheTime, execute, retryCount]);

  return { data, loading, error, retry, refresh };
}

// ============= 使用示例 =============

function UserProfile({ userId }) {
  const { data, loading, error, retry } = useFetch(
    `user-${userId}`,                          // 缓存键
    () => fetch(`/api/users/${userId}`).then(r => r.json()),
    { cacheTime: 60000, retryCount: 2 }       // 缓存1分钟，失败重试2次
  );

  if (loading) return <div>加载中...</div>;
  if (error)   return (
    <div className="error">
      <p>加载失败：{error.message}</p>
      <button onClick={retry}>重试</button>
    </div>
  );

  return (
    <div>
      <h2>{data.name}</h2>
      <p>{data.email}</p>
    </div>
  );
}
```

**设计要点详解**：

- **竞态保护**：如果快速切换 `key`（如切换标签页），旧的请求可能在新的请求之后返回，导致数据显示错乱。`requestIdRef` 递增序号确保只处理最新请求的响应。
- **缓存**：模块级 `Map` 保证同一 key 的请求在 `cacheTime` 内只发起一次网络请求。
- **重试**：`execute` 递归调用自身，每次消费 `remainingRetries`，直到用完或成功。
- **refresh vs retry**：`retry` 使用当前数据不重新请求，`refresh` 清除缓存后重新请求，语义不同。

#### Vue 实现

```js
// composables/useFetch.js
import { ref, watch, onUnmounted } from 'vue'

const cache = new Map()

export function useFetch(key, fetcher, options = {}) {
  const {
    enabled = true,
    cacheTime = 0,
    retryCount = 0,
    retryDelay = 1000,
  } = options

  const data = ref(undefined)
  const loading = ref(false)
  const error = ref(null)

  let requestId = 0

  // 初始化缓存读取
  if (cacheTime > 0 && cache.has(key.value ?? key)) {
    const cached = cache.get(key.value ?? key)
    if (Date.now() - cached.time < cacheTime) {
      data.value = cached.data
    } else {
      cache.delete(key.value ?? key)
    }
  }

  async function execute(remainingRetries = retryCount) {
    const currentRequestId = ++requestId
    loading.value = true
    error.value = null

    try {
      const result = await fetcher()
      if (currentRequestId !== requestId) return

      data.value = result
      loading.value = false

      const cacheKey = typeof key === 'function' ? key.value : key
      if (cacheTime > 0) {
        cache.set(cacheKey, { data: result, time: Date.now() })
      }
    } catch (err) {
      if (currentRequestId !== requestId) return

      if (remainingRetries > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        execute(remainingRetries - 1)
        return
      }

      error.value = err
      loading.value = false
    }
  }

  function retry() {
    execute(retryCount)
  }

  function refresh() {
    const cacheKey = typeof key === 'function' ? key.value : key
    if (cacheTime > 0) cache.delete(cacheKey)
    execute(retryCount)
  }

  // 自动请求
  watch(
    () => (typeof key === 'function' ? key.value : key),
    (newKey) => {
      if (enabled && newKey) execute()
    },
    { immediate: true }
  )

  onUnmounted(() => {
    requestId = -1 // 标记所有进行中的请求为无效
  })

  return { data, loading, error, retry, refresh }
}

// 使用示例
// const { data, loading, error, retry } = useFetch(
//   computed(() => `user-${userId.value}`),
//   () => fetch(`/api/users/${userId.value}`).then(r => r.json()),
//   { cacheTime: 60000, retryCount: 2 }
// )
```

---

## 常见问题

**Q1：HOC 和自定义 Hook 可以互换吗？**

大多数场景下 Hook 可以替代 HOC，但不是 100%。Hook 不能条件调用、不能在 class 组件中使用。如果项目仍有大量 class 组件，HOC 是必要的。另外，需要「包装组件返回新组件」的场景（如 `React.memo`），本质上就是 HOC。

**Q2：Hook 的依赖数组写错了会怎样？**

两种情况：
- **少写了依赖**：闭包捕获了过期值，逻辑判断基于旧状态
- **多写了依赖**：effect 执行次数超过必要，可能造成死循环

使用 `eslint-plugin-react-hooks` 的 `exhaustive-deps` 规则检测依赖缺失。先通过拆分 Effect、函数式更新、把非响应式逻辑移出组件或使用 Effect Event 等方式消除警告；确有外部系统订阅等特殊约束时，才做最小范围禁用，并写明依赖为何故意固定以及如何验证。

**Q3：为什么 useEventListener 用 ref 存 handler 而不是直接传？**

如果 `useEffect` 的依赖包含 `handler`，每次 handler 引用变化都会解绑旧监听器、绑定新监听器。对于内联的 handler（每次渲染都新建），频繁 rebind 有性能开销。`ref` 方案让 effect 只绑定一次，但始终能调用最新的 handler。

**Q4：Vue Composable 和 React Hook 哪个更容易写出 bug？**

React Hook 的闭包和依赖数组是常见缺陷来源。Vue Composable 会自动追踪同步执行期间读取的响应式依赖，减少手写依赖，但异步读取、失去响应性的解构和清理副作用仍可能出错。两个框架的风险位置不同，不能只凭依赖数组判断哪个更可靠。

**Q5：useFetch 的缓存应该在模块级还是组件级？**

示例中使用模块级缓存（`const cache = new Map()` 在模块顶层），这意味着**同一页面上所有组件共享缓存**。这是大多数场景（如列表和详情共享用户数据）的期望行为。如果需要组件级隔离，把 `cache` 声明为 `useRef(new Map())` 放在 Hook 内部即可。

**Q6：useDebounce 和 useThrottle 的核心区别是什么？**

- **防抖**：在连续触发中，只有最后一次触发之后等待 `delay` 才执行。如搜索框输入，等用户停止输入再发请求。
- **节流**：在连续触发中，保证每隔 `delay` 至少执行一次。如滚动事件、窗口 resize 事件。

**Q7：为什么我的自定义 Hook 导致了无限循环？**

最常见的原因：在 `useEffect` 中调用了 `setState`，而这个 `useEffect` 的依赖又包含这个 state。例如：

```jsx
// 无限循环！
useEffect(() => {
  setCount(count + 1);
}, [count]);
```

解决方案：用函数式更新 `setCount(c => c + 1)`，并从依赖中移除 `count`。

**Q8：一个 Hook 文件里应该导出几个 Hook？**

遵循「单一职责」原则。`useLocalStorage`、`useDebounce` 这类原子 Hook，一个文件一个。`useAuth`、`useForm` 这类需要组合多个原子 Hook 的业务 Hook，一个文件一个也可以，但内部应该由更小的 Hook 组成。

---

## 实操作业

### 基础练习：用自定义 Hook 替代 HOC

找到你项目中一个使用 HOC 的场景（如权限判断、Loading 状态），将其改写为自定义 Hook 实现：
- React：抽取为 `useAuth` / `useLoading`
- Vue：抽取为 Composable
- 对比改写前后代码行数、组件层级深度和可读性的变化

### 进阶练习：实现 usePolling

实现一个轮询 Hook：

```jsx
const { data, start, stop } = usePolling(
  () => fetch('/api/status').then(r => r.json()),
  { interval: 3000, enabled: true }
);
```

要求：
- 支持启动、停止、动态修改轮询间隔
- 组件卸载时自动停止
- 上次请求未完成时不发起新的请求（防止请求堆积）
- 出错时继续轮询（不要因为一次错误就停止）
- 分别实现 React 和 Vue 版本

### 挑战练习：请求去重与依赖请求链

基于本节 `useFetch` 扩展：
1. **请求去重**：如果同一 `key` 的请求正在进行中（非缓存阶段），第二个调用方应复用第一个的 Promise，而不是发起新请求
2. **依赖请求链**：支持「A 请求完成后再发起 B 请求」的声明式写法，类似：

```jsx
const { data: user } = useFetch('user-1', fetchUser);
const { data: orders } = useFetch(
  () => user ? `orders-${user.id}` : null,  // key 是函数，动态依赖 user
  () => fetchOrders(user.id),
  { enabled: !!user }  // user 存在时才发起
);
```

3. 将这套方案同时用 React Hook 和 Vue Composable 实现
4. 对比两个版本在「声明式依赖」上的实现差异

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“高阶组件与自定义 Hooks”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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

- **HOC** 是 React 早期逻辑复用的方案，本质是「包装组件返回新组件」
- **HOC 的三大硬伤**：嵌套地狱、props 冲突、ref 不透传
- **自定义 Hook** 是 HOC 的思想升级：从「复用 UI」变为「复用逻辑」，不修改组件树
- **7 个必会 Hook**：usePrevious、useLocalStorage、useDebounce、useThrottle、useToggle、useEventListener、useFetch
- **Vue Composable** 与 React Hook 本质相同（抽取逻辑），差异在于响应式模型（自动追踪 vs 手动依赖）
- **useFetch 的核心设计**：竞态保护（requestId）+ 缓存（模块级 Map）+ 重试（递归）+ refresh/retry 语义区分
- **原则**：能用 Hook 解决的场景，绝不写 HOC

<!-- course-nav:start -->
---

[上一篇：Compound Components 模式](./03-Compound-Components模式.md) · [课程地图](../../README.md) · [下一篇：01 — 状态提升与 Context 注入](../04-状态管理/01-状态提升与Context注入.md)
<!-- course-nav:end -->
