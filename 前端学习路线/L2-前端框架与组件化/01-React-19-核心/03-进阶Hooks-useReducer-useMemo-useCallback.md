# 03 进阶 Hooks：useReducer、useMemo、useCallback 等

## 学习目标

- 掌握 `useReducer` 的用法，知道什么时候用它替代多个 `useState`
- 理解 `useMemo` 和 `useCallback` 的正确使用场景与滥用警告
- 掌握 `useCallback` + `React.memo` 的配合使用方式
- 掌握 `useRef` 的两大核心用途：DOM 引用和保持可变值
- 理解 `useImperativeHandle` + `forwardRef` 的使用场景
- 搞清 `useLayoutEffect` 和 `useEffect` 的区别
- 了解 `useId`、`useDeferredValue`、`useTransition` 的用途
- 能用 `useReducer` + `Context` 实现小型全局状态管理

---

## 内容讲解

### 1. useReducer：复杂状态逻辑的容器

当组件的状态更新逻辑复杂，或者多个状态相互关联时，`useReducer` 比多个 `useState` 更清晰。

```jsx
import { useReducer } from 'react';

// Step 1：定义 reducer
function todoReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, { id: Date.now(), text: action.text, done: false }];
    case 'TOGGLE':
      return state.map(todo =>
        todo.id === action.id ? { ...todo, done: !todo.done } : todo
      );
    case 'DELETE':
      return state.filter(todo => todo.id !== action.id);
    case 'CLEAR_DONE':
      return state.filter(todo => !todo.done);
    default:
      return state;
  }
}

function TodoApp() {
  // Step 2：使用 useReducer
  const [todos, dispatch] = useReducer(todoReducer, []);

  // dispatch 是稳定的，不会在渲染间变化
  // 所以不需要放进 useEffect 的依赖数组
  return (
    <div>
      <button onClick={() => dispatch({ type: 'ADD', text: '新任务' })}>
        添加任务
      </button>
      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            <span
              style={{ textDecoration: todo.done ? 'line-through' : 'none' }}
              onClick={() => dispatch({ type: 'TOGGLE', id: todo.id })}
            >
              {todo.text}
            </span>
            <button onClick={() => dispatch({ type: 'DELETE', id: todo.id })}>
              删除
            </button>
          </li>
        ))}
      </ul>
      <button onClick={() => dispatch({ type: 'CLEAR_DONE' })}>
        清除已完成
      </button>
    </div>
  );
}
```

#### useState vs useReducer 对比

| 维度 | useState | useReducer |
|------|---------|------------|
| 适用场景 | 简单、独立的状态值 | 复杂、相互关联的状态逻辑 |
| 更新方式 | `setX(newValue)` | `dispatch({ type: 'X', payload })` |
| 下一个状态依赖上一个 | 需要函数式更新 | reducer 自然接收 (prev, action) |
| dispatch 稳定性 | setter 稳定 | dispatch 稳定 |
| 可测试性 | 一般 | reducer 是纯函数，极易单独测试 |
| 学习成本 | 低 | 中 |

> **避坑提示**：不是所有状态都要上 `useReducer`。单个布尔值、简单数字直接用 `useState` 更直观。当你在一个函数里连续写了 3 个以上 `setXxx` 时，就该考虑 `useReducer` 了。

---

### 2. useMemo：缓存计算结果

```jsx
import { useMemo, useState } from 'react';

function ProductList({ products }) {
  const [sortBy, setSortBy] = useState('price');

  // 昂贵的排序计算，只在 products 或 sortBy 变化时重新执行
  const sortedProducts = useMemo(() => {
    console.log('重新排序...');   // 验证是否真的重新计算了
    return [...products].sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [products, sortBy]); // 依赖项

  return (
    <ul>
      {sortedProducts.map(p => (
        <li key={p.id}>{p.name} - ¥{p.price}</li>
      ))}
    </ul>
  );
}
```

#### useMemo 的滥用警告

```jsx
// ❌ 滥用：这个计算几乎不花时间，memo 的开销比计算本身大
const fullName = useMemo(() => `${firstName} ${lastName}`, [firstName, lastName]);

// ✅ 不需要 memo，直接计算即可
const fullName = `${firstName} ${lastName}`;

// ❌ 滥用：JSX 的创建开销极小
const header = useMemo(() => <Header title={title} />, [title]);

// ✅ 适合 memo：大数组的过滤、排序、聚合
const filtered = useMemo(() => data.filter(complexFilter), [data, complexFilter]);
```

| 什么时候用 useMemo | 什么时候不用 |
|-------------------|-------------|
| 大数组的 map/filter/sort（> 1000 项） | 简单字符串拼接 |
| 递归/嵌套的计算（如树形遍历） | 基本算术运算 |
| 引用类型的派生值（传给了 memo 子组件） | 直接渲染的简单 JSX |
| 在渲染中频繁被触发的昂贵计算 | 几乎不变的值 |

> **避坑提示**：`useMemo` 本身也有开销（缓存查找、依赖比较）。对简单值使用 `useMemo` 可能让性能更差。优化三步法：先写不优化的代码 → 用 Profiler 找到瓶颈 → 精准 memo。

---

### 3. useCallback + React.memo

#### 3.1 React.memo

```jsx
// ExpensiveChild 用 memo 包裹后，只有在 props 变化时才重渲染
const ExpensiveChild = React.memo(function ExpensiveChild({ onClick, label }) {
  console.log('ExpensiveChild 渲染');
  return <button onClick={onClick}>{label}</button>;
});
```

`React.memo` 对 props 做**浅比较**：只有当 props 中的某个值的引用发生变化，才会重渲染。

#### 3.2 问题：函数引用每次都变

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // count 变化 → Parent 重渲染 → handleClick 是一个"新函数"
  // → ExpensiveChild 的 onClick prop 引用变了 → memo 失效！
  const handleClick = () => console.log('clicked');

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <ExpensiveChild onClick={handleClick} label="点我" />
    </div>
  );
}
```

#### 3.3 解决方案：useCallback

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // useCallback 保证 handleClick 引用不变（依赖数组为空）
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []); // 空依赖 → 引用永远不变

  // 如果需要读取最新的 count
  const handleClickWithCount = useCallback(() => {
    setCount(prev => prev + 1); // 用函数式更新绕开闭包
  }, []);

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <ExpensiveChild onClick={handleClick} label="点我" />
    </div>
  );
}
```

> **避坑提示**：`useCallback(fn, [])` 和 `useMemo(() => fn, [])` 是等价的。`useCallback` 本质就是 `useMemo` 的语法糖。

---

### 4. useRef：跨越渲染的"盒子"

```jsx
import { useRef, useEffect, useState } from 'react';

function RefDemo() {
  // 用途一：DOM 引用
  const inputRef = useRef(null);

  useEffect(() => {
    // 组件挂载后，自动聚焦
    inputRef.current.focus();
  }, []);

  // 用途二：保存可变值，不触发重渲染
  const renderCount = useRef(0);
  renderCount.current += 1; // 每次渲染加 1，但不触发新的渲染

  // 对比：如果用 useState，每次 setState 都会触发重渲染 → 无限循环

  const [name, setName] = useState('');

  return (
    <div>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="输入名字"
      />
      <p>这是第 {renderCount.current} 次渲染</p>
    </div>
  );
}
```

| 特性 | useState | useRef |
|------|---------|--------|
| 值变化触发重渲染 | ✅ | ❌ |
| 值在渲染间保持 | ✅ | ✅ |
| 值可变 | ❌（只能通过 setter） | ✅（直接修改 .current） |
| 常用于 | UI 状态 | DOM 引用、计时器 ID、上次的值 |

---

### 5. useImperativeHandle + forwardRef

让父组件可以调用子组件暴露的方法（尽量少用，优先通过 props 驱动）。

```jsx
import { forwardRef, useImperativeHandle, useRef } from 'react';

// 子组件用 forwardRef 包裹
const FancyInput = forwardRef(function FancyInput(props, ref) {
  const inputRef = useRef(null);

  // 自定义暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
    clear: () => { inputRef.current.value = ''; },
    getValue: () => inputRef.current.value,
  }));

  return <input ref={inputRef} {...props} />;
});

// 父组件
function Parent() {
  const fancyRef = useRef(null);

  return (
    <div>
      <FancyInput ref={fancyRef} placeholder="输入内容" />
      <button onClick={() => fancyRef.current.focus()}>聚焦</button>
      <button onClick={() => console.log(fancyRef.current.getValue())}>
        打印值
      </button>
    </div>
  );
}
```

> **避坑提示**：能用 props 和 state 解决的，不要用 `useImperativeHandle`。它破坏了 React 的单向数据流，增加了心智负担。

---

### 6. useLayoutEffect vs useEffect

```jsx
import { useLayoutEffect, useEffect, useRef, useState } from 'react';

function LayoutVsEffect() {
  const [width, setWidth] = useState(0);
  const divRef = useRef(null);

  // DOM 更新了，但浏览器还没绘制
  useLayoutEffect(() => {
    // 在绘制前同步读取 DOM 尺寸
    const measured = divRef.current.getBoundingClientRect().width;
    setWidth(measured); // 同步触发重渲染，但用户不会看到"闪烁"
  }, []);

  useEffect(() => {
    // 在绘制后执行，如果在这里 setState，用户会看到一帧闪烁
    console.log('effect 执行，页面已经画好了');
  }, []);

  return (
    <div>
      <div ref={divRef} style={{ width: '50%', background: '#eee' }}>
        我的宽度：
      </div>
      <p>测量结果：{width}px</p>
    </div>
  );
}
```

---

### 7. React 19 新增 Hooks 速览

#### 7.1 useId：生成唯一 ID

```jsx
import { useId } from 'react';

function FormField({ label }) {
  // 生成跨服务端/客户端一致的唯一 ID
  const id = useId();

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" />
    </div>
  );
}
```

#### 7.2 useDeferredValue：延迟更新

```jsx
import { useState, useDeferredValue, useMemo } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  // query 立即更新（输入框不卡顿），deferredQuery 延迟更新（列表可以慢慢渲染）
  const deferredQuery = useDeferredValue(query);

  // 用 deferredQuery 做耗时的列表筛选
  const filteredList = useMemo(() => {
    return hugeList.filter(item =>
      item.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [deferredQuery]);

  return (
    <>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="搜索..."
      />
      {/* 输入时，旧列表会保持显示直到新列表计算完毕 */}
      <ResultList items={filteredList} />
    </>
  );
}
```

#### 7.3 useTransition：标记非紧急更新

```jsx
import { useState, useTransition } from 'react';

function TabSwitcher() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  const switchTab = (newTab) => {
    // 标记 tab 切换为"非紧急更新"
    // 如果新 tab 的内容渲染很慢，用户点击其他 tab 可以立即中断
    startTransition(() => {
      setTab(newTab);
    });
  };

  return (
    <div>
      <button onClick={() => switchTab('home')} disabled={isPending}>
        {isPending ? '切换中...' : '首页'}
      </button>
      <button onClick={() => switchTab('profile')} disabled={isPending}>
        {isPending ? '切换中...' : '个人'}
      </button>
      <div>{tab === 'home' ? <Home /> : <Profile />}</div>
    </div>
  );
}
```

---

### 8. 实战：useReducer + Context 小型全局状态管理

```jsx
import { createContext, useContext, useReducer } from 'react';

// ============ 1. 定义状态和 Action ============
const initialState = { user: null, theme: 'light', notifications: [] };

function appReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.user };
    case 'LOGOUT':
      return { ...state, user: null };
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.message],
      };
    default:
      return state;
  }
}

// ============ 2. 创建 Context ============
const AppContext = createContext(null);
const AppDispatchContext = createContext(null);

// ============ 3. Provider 组件 ============
function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppContext.Provider>
  );
}

// ============ 4. 自定义 Hook（封装消费逻辑） ============
function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState 必须在 AppProvider 内使用');
  return ctx;
}

function useAppDispatch() {
  const ctx = useContext(AppDispatchContext);
  if (!ctx) throw new Error('useAppDispatch 必须在 AppProvider 内使用');
  return ctx;
}

// ============ 5. 使用 ============
function Header() {
  const { user, theme } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <header>
      <span>当前主题：{theme}</span>
      <button onClick={() => dispatch({ type: 'TOGGLE_THEME' })}>
        切换主题
      </button>
      {user ? (
        <span>欢迎，{user.name}</span>
      ) : (
        <button
          onClick={() =>
            dispatch({ type: 'LOGIN', user: { name: '张三' } })
          }
        >
          登录
        </button>
      )}
    </header>
  );
}

// 根组件
export default function App() {
  return (
    <AppProvider>
      <Header />
      {/* 其他组件 */}
    </AppProvider>
  );
}
```

---

## 常见问题

**Q1：`useCallback` 和 `useMemo` 本质区别是什么？**

`useCallback(fn, deps)` 等价于 `useMemo(() => fn, deps)`。前者缓存函数，后者缓存值（包括函数返回值）。选哪个取决于你要缓存的是函数本身还是计算结果。

**Q2：为什么 `useReducer` 的 `dispatch` 是稳定的？**

React 内部保证 `dispatch` 函数在组件整个生命周期内引用不变。所以你不需要把它放进 `useEffect` 或 `useCallback` 的依赖数组里。

**Q3：`React.memo` 和 `useMemo` 有什么区别？**

`React.memo` 是一个**高阶组件**，用于包裹整个组件，阻止不必要的重渲染。`useMemo` 是一个**Hook**，用于在组件内部缓存计算结果。两者名字都有 "memo" 但功能完全不同。

**Q4：`useRef` 的值变了为什么组件不重渲染？**

因为这是设计目标——`useRef` 就是用来存储"不需要触发渲染"的可变值。React 不会追踪 `.current` 的变化。如果你需要渲染，用 `useState`。

**Q5：`useLayoutEffect` 会阻塞渲染吗？**

会。它在浏览器绘制之前同步执行，如果里面的代码执行太久，页面会"卡住"。绝大多数情况下用 `useEffect` 就够了。

**Q6：多个 Context 的 Provider 嵌套会不会有性能问题？**

不会因为嵌套本身有性能问题。但单个 Context 的 value 对象如果在每次渲染时都重新创建，会导致所有消费该 Context 的组件都重渲染——这是真正的性能杀手。详见第 06 篇。

**Q7：`useDeferredValue` 和防抖（debounce）的区别？**

防抖有固定的延迟时间（如 500ms），`useDeferredValue` 没有固定延迟——它会等待 React 空闲时自动更新，在并发模式下可以被更紧急的更新中断。防抖是时间维度的延迟，defer 是优先级维度的降级。

**Q8：什么时候该拆分 Context？**

按更新频率拆分是核心原则：高频更新的值（如主题、用户信息）和低频更新的值分到不同的 Context。更详细的分析见第 06 篇。

---

## 实操作业

### 基础：评论列表
用 `useReducer` 管理评论列表状态，支持添加评论、点赞、删除。注意直接在 reducer 中处理所有状态变更。

### 进阶：搜索 + 虚拟展示
实现一个搜索页：输入框使用 `useDeferredValue` 处理延迟，搜索结果列表用 `useMemo` 缓存。同时用 `React.memo` + `useCallback` 优化子组件渲染。

### 挑战：微型 Redux
用 `useReducer` + `Context` 实现一个具备中间件（middleware）机制的微型状态管理库。要求：支持 `combineReducers` 合并多个 reducer、支持日志中间件（打印每次 action 和前后状态）。

---

## 本节小结

- `useReducer` 是复杂状态逻辑的最佳容器，reducer 是纯函数，天然可测试
- `useMemo` / `useCallback` 是性能优化工具，不是必需品——先用 Profiler 找瓶颈再优化
- `useRef` 的核心价值是"可变但不触发渲染"，常用场景：DOM 引用、计时器 ID、保留上一次的值
- `React.memo` 做浅比较，配合 `useCallback` 才能真正生效
- `useImperativeHandle` 暴露子组件方法，但应优先使用 props + state
- `useLayoutEffect` 同步执行在绘制前，`useEffect` 异步执行在绘制后
- `useDeferredValue` / `useTransition` 是 React 并发特性的入口，标记非紧急更新