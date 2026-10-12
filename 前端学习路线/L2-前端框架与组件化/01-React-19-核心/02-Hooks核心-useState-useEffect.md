# 02 Hooks 核心：useState 与 useEffect 深度解析

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[01 JSX、组件、Props 与 State](./01-JSX-组件-Props-State.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[React](https://react.dev/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 掌握 `useState` 的函数式更新和惰性初始化
- 理解 `useEffect` 的生命周期对标：mount → update → unmount
- 掌握依赖数组的书写规则，能识别和修复闭包陷阱
- 理解清理函数（cleanup）的必要性和执行时机
- 搞懂 `useEffect` 的执行时机：Layout → DOM 更新 → Effect
- 能够用 `useEffect` 实现窗口监听、定时器、数据请求等常见场景

---

## 内容讲解

### 1. useState 深度

#### 1.1 惰性初始化

当初始状态需要复杂计算时，传入一个函数：

```jsx
// ❌ 不好的写法：每次渲染都执行 getInitialCount()
const [count, setCount] = useState(getInitialCount());

// ✅ 惰性初始化：getInitialCount 只在首次渲染时执行一次
const [count, setCount] = useState(() => getInitialCount());

// 典型场景：从 localStorage 读取
const [user, setUser] = useState(() => {
  const saved = localStorage.getItem('user');
  return saved ? JSON.parse(saved) : null;
});
```

| 惰性初始化的常见场景 | 示例 |
|------------------|------|
| 从 localStorage 读取 | `() => JSON.parse(localStorage.getItem('key') \|\| 'default')` |
| 从 URL 参数解析 | `() => new URLSearchParams(location.search).get('tab')` |
| 复杂计算 | `() => expensiveComputation(props.data)` |

#### 1.2 函数式更新的本质

```jsx
// 函数式更新接收的不是新值，而是一个转换函数
setCount(prev => prev + 1);

// 等价关系：
// setCount(c => c + 1)  ≈  把状态从 prev 变成 prev + 1
```

必须用函数式更新的场景：

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  // 场景一：基于旧值的批量更新
  const batchUpdate = () => {
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
    setCount(prev => prev + 1);
    // count 会从 0 → 3
  };

  // 场景二：useEffect 中使用（避免闭包陷阱）
  useEffect(() => {
    const timer = setInterval(() => {
      // ✅ 不需要把 count 放进依赖数组
      setCount(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []); // 空依赖，定时器只创建一次

  return <p>{count}</p>;
}
```

#### 1.3 对象型 State 的更新策略

```jsx
// ❌ 误区：以为 setState 会"浅合并"（只有 class 组件的 setState 才会）
const [user, setUser] = useState({ name: '张三', age: 25 });

// 函数组件的 useState 是替换，不是合并！
setUser({ age: 26 }); // user 变成 { age: 26 }，name 丢了！

// ✅ 正确：手动合并
setUser(prev => ({ ...prev, age: 26 }));
```

---

### 2. useEffect 的生命周期对标

`useEffect` 把 class 组件的 `componentDidMount`、`componentDidUpdate`、`componentWillUnmount` 三合一。

```jsx
useEffect(() => {
  // === mount 时执行 ===
  // === update 时（依赖变化后）执行 ===
  console.log('副作用执行');

  return () => {
    // === 下一次 effect 执行前 或 unmount 时执行 ===
    // 这是"清理函数"
    console.log('清理上一次副作用');
  };
}, [依赖数组]);
```

三者的生命周期对照：

| 阶段 | Class 组件 | useEffect |
|------|-----------|-----------|
| 挂载后 | `componentDidMount` | `useEffect(() => {...}, [])` 的 effect 函数 |
| 更新后 | `componentDidUpdate` | `useEffect(() => {...}, [dep])` |
| 卸载前 | `componentWillUnmount` | effect 中 return 的清理函数 |
| 每次渲染后 | 无直接对应 | `useEffect(() => {...})`（无依赖数组） |

---

### 3. 依赖数组

依赖数组告诉 React："当这些值变了，重新执行 effect"。

```jsx
function SearchResults({ query, page }) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    // query 或 page 变化时，重新请求数据
    let cancelled = false;
    fetch(`/api/search?q=${query}&page=${page}`)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setResults(data);
      });
    return () => { cancelled = true; }; // 防止组件卸载后 setState
  }, [query, page]);

  // ...
}
```

#### 3.1 依赖数组的四种形态

| 写法 | 行为 |
|------|------|
| `useEffect(fn, [a, b])` | a 或 b 变化时执行 |
| `useEffect(fn, [])` | 仅在 mount 时执行一次 |
| `useEffect(fn)` | 每次渲染后都执行（极少用） |
| `useEffect` 无第二个参数 | 同上 |

#### 3.2 闭包陷阱

```jsx
function BrokenTimer() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      // ❌ 闭包陷阱：这里的 count 永远是首次渲染时的 0
      console.log(count);
      setCount(count + 1); // 永远 setCount(1)
    }, 1000);
    return () => clearInterval(timer);
  }, []); // 空依赖

  // 表现：count 变成 1 后就不再增长
}
```

**为什么会这样？** 每次渲染都会创建一个新的函数作用域。`useEffect` 捕获了**首次渲染时**的 `count`（值为 0）。虽然 `setCount` 改变了状态，但定时器里的 `count` 始终是那个"旧闭包"里的 0。

两种修复方式：

```jsx
// 方案一：函数式更新（推荐，不需要 count 做依赖）
useEffect(() => {
  const timer = setInterval(() => {
    setCount(prev => prev + 1); // prev 始终是最新值
  }, 1000);
  return () => clearInterval(timer);
}, []);

// 方案二：把 count 放进依赖（但定时器会不断重建，不够优雅）
useEffect(() => {
  const timer = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(timer);
}, [count]);
```

> **避坑提示**：不要再"骗" ESLint 来跳过依赖检查（`// eslint-disable-next-line`），大多数时候你只是没理解问题的真正解法。

---

### 4. 清理函数（Cleanup）

清理函数解决的核心问题：**防止副作用积累和内存泄漏**。

```jsx
function ChatRoom({ roomId }) {
  useEffect(() => {
    console.log(`进入房间 ${roomId}`);

    // 建立连接
    const connection = createConnection(roomId);
    connection.connect();

    // 清理函数：下次 effect 执行前 / 组件卸载时调用
    return () => {
      console.log(`离开房间 ${roomId}`);
      connection.disconnect();
    };
  }, [roomId]);

  // 执行顺序示例（roomId 从 A 变成 B）：
  // 1. 执行上次的清理函数 → "离开房间 A"
  // 2. 执行新的 effect      → "进入房间 B"
}
```

清理函数的执行时机总结：

| 触发条件 | 执行什么 |
|---------|---------|
| 组件首次挂载 | 执行 effect，不执行清理 |
| 依赖项变化（更新） | 先执行**上一次**的清理，再执行**新** effect |
| 组件卸载 | 执行最后一次的清理 |

---

### 5. useEffect 的执行时机

React 19 中渲染到屏幕的流程：

```
1. React 执行组件函数，计算 VNode（Render 阶段）
2. React Diff，提交到真实 DOM（Commit 阶段）
   ├── 2a. useLayoutEffect 同步执行（在浏览器绘制之前）
   └── 2b. 浏览器绘制像素到屏幕
3. useEffect 异步执行（在浏览器绘制之后）
```

```jsx
function TimingDemo() {
  useLayoutEffect(() => {
    // 在浏览器绘制之前同步执行
    // 操作 DOM 如果闪烁，用这个
    console.log('1. useLayoutEffect');
  });

  useEffect(() => {
    // 在浏览器绘制之后异步执行
    console.log('2. useEffect');
  });

  console.log('0. Render');
  return <div>Hello</div>;
}

// 控制台输出顺序：
// 0. Render
// 1. useLayoutEffect
// 2. useEffect
```

为什么 effect 要放在绘制之后？因为 effect 通常不需要阻塞用户看到画面——数据请求、订阅、手动 DOM 操作都不应该让用户多等。

---

### 6. 实战场景

#### 6.1 窗口大小监听

```jsx
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    // 防抖：避免频繁调用
    let timerId;
    const handleResize = () => {
      clearTimeout(timerId);
      timerId = setTimeout(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    // 清理：组件卸载时移除监听
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timerId);
    };
  }, []);

  return size;
}

function App() {
  const { width, height } = useWindowSize();
  return <p>窗口宽度: {width}px, 高度: {height}px</p>;
}
```

#### 6.2 定时器

```jsx
function Countdown({ from = 60 }) {
  const [seconds, setSeconds] = useState(from);

  useEffect(() => {
    // from 为 0 或负数时不需要计时器
    if (seconds <= 0) return;

    const timerId = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, []); // 空依赖，配合函数式更新

  return <p>剩余 {seconds} 秒</p>;
}
```

#### 6.3 数据请求

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 用于竞态处理：防止旧请求覆盖新请求结果
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetch(`/api/users/${userId}`)
      .then(res => {
        if (!res.ok) throw new Error('请求失败');
        return res.json();
      })
      .then(data => {
        if (!cancelled) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true; // 组件卸载或 userId 变化时，废弃本次请求
    };
  }, [userId]);

  if (loading) return <p>加载中...</p>;
  if (error) return <p>出错了：{error}</p>;
  if (!user) return <p>用户不存在</p>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

> **避坑提示**：`useEffect` 中的异步函数不能用 `async/await` 直接写在 effect 函数里，因为 effect 函数不能返回 Promise（只能返回清理函数）。正确的做法是在 effect 内部定义一个 async 函数再调用它，或者用 `.then()` 链。

---

## 常见问题

**Q1：为什么 `useEffect` 的回调不能用 `async`？**

因为 `useEffect` 期望回调返回 `undefined` 或一个清理函数。`async` 函数返回的是 `Promise`，React 无法区分你想返回的是清理函数还是一个 Promise。正确写法是在 effect 内部定义一个 async 函数然后调用它。

**Q2：依赖数组里应该放什么？**

放 effect 内部引用的所有"响应式值"（reactive values）——即 `props`、`state` 以及由它们计算出的值。如果 ESLint 的 `react-hooks/exhaustive-deps` 规则提示缺少依赖，认真对待，不要随意忽略。

**Q3：多个 `useEffect` 的执行顺序是怎样的？**

按照它们在组件中**出现的顺序**依次执行。一个组件内如果有三个 `useEffect`，它们的 effect 函数按顺序执行，清理函数也按顺序执行。

**Q4：什么时候用 `useLayoutEffect`？**

只在需要**同步**读取或修改 DOM 布局且不能有闪烁时使用。典型场景：读取元素位置后立刻设置滚动、测量 DOM 尺寸后调整布局。绝大多数场景用 `useEffect` 就够了。

**Q5：如何避免在 effect 中读取过期的 state？**

两种方式：(1) 使用函数式更新 `setState(prev => ...)`，(2) 使用 `useRef` 保存最新的值（下一章会讲）。

**Q6：`StrictMode` 下 effect 为什么会执行两次？**

React 18/19 的 Strict Mode 在**开发环境**下会故意挂载→卸载→再挂载组件，用来帮你提前发现缺少清理函数的 bug。生产环境不会这样。如果你的 effect 在 Strict Mode 下有 bug，说明你的清理函数写得不完整。

**Q7：可以在 effect 里直接操作 DOM 吗？**

可以，但要谨慎。React 在 commit 阶段已经更新了 DOM，effect 执行时 DOM 已经是最新的。但如果你需要"读取布局信息然后同步设置"，应该用 `useLayoutEffect`。

**Q8：`useEffect(fn, [ref.current])` 为什么不起作用？**

因为 `ref.current` 的变化不会触发重渲染，所以 effect 不会重新执行。依赖数组里的值必须是能触发渲染的值（state、props、或者由它们派生的变量）。

---

## 实操作业

### 基础：数字时钟
实现一个实时更新的数字时钟（显示 HH:MM:SS），使用 `useEffect` 管理定时器，组件卸载时清理。

### 进阶：搜索防抖
实现一个搜索框，用户停止输入 500ms 后自动发起请求（用 `setTimeout` 模拟 API），展示搜索结果列表。正确处理：竞态条件、组件卸载清理、loading 和 error 状态。

### 挑战：自定义 Hook 封装
把窗口大小监听、定时器、数据请求分别封装为自定义 Hook：`useWindowSize`、`useInterval`、`useFetch`。要求类型安全、正确处理清理、支持依赖变化自动刷新。

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：effect 创建 interval 并返回 clearInterval；状态从新 Date 读取真实时间。卸载再挂载只有一个有效 timer；后台节流后恢复不能按 tick 次数累加误报时间。
- **进阶**：500ms timer 清理，请求采用 signal 或序号守卫；query 更新时旧结果与旧 finally 都不可覆盖新状态。慢旧请求、快新请求、卸载与失败分别验证。
- **挑战**：监听、计时和请求 Hook 各有清理；useInterval 的最新 callback 与调度周期分开管理。依赖改变重订阅，卸载后无监听/timer，泛型请求另做运行时数据校验。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“Hooks 核心：useState 与 useEffect 深度解析”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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

- `useState` 的函数式更新 (`prev => newVal`) 是解决闭包陷阱的关键
- 惰性初始化 `useState(() => heavyCalc())` 只在首次渲染执行
- `useEffect` 对标 mount + update + unmount，通过依赖数组控制重执行
- 闭包陷阱的根因是"每次渲染创建新闭包，effect 捕获了旧闭包的变量"
- 清理函数保证订阅/定时器/事件监听不会泄漏
- 执行时机：Render → LayoutEffect（同步）→ 浏览器绘制 → Effect（异步）

<!-- course-nav:start -->
---

[上一篇：01 JSX、组件、Props 与 State](./01-JSX-组件-Props-State.md) · [课程地图](../../README.md) · [下一篇：03 进阶 Hooks：useReducer、useMemo、useCallback 等](./03-进阶Hooks-useReducer-useMemo-useCallback.md)
<!-- course-nav:end -->
