# 06 Ref、Context 与性能优化

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[05 并发渲染与 Suspense](./05-并发渲染与Suspense.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[React](https://react.dev/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 掌握 `useRef` 的三大用途：DOM 引用、可变值容器、性能优化
- 理解 Context API 的深层性能陷阱：Provider value 引用变化导致全量重渲染
- 掌握 Context 拆分策略：按更新频率分离 Context
- 理解 `React.memo` 的浅比较原理和失效场景
- 掌握"状态提升 vs 状态下沉（Colocation）"的选择策略
- 了解虚拟列表（Virtual List）的优化原理
- 能使用 React Profiler 和 React DevTools 分析组件性能

---

## 内容讲解

### 1. useRef 的三大用途

#### 用途一：DOM 引用

```jsx
import { useRef, useEffect } from 'react';

function AutoFocusInput() {
  const inputRef = useRef(null);

  useEffect(() => {
    // 组件挂载后自动聚焦
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} placeholder="自动聚焦..." />;
}
```

#### 用途二：可变值容器（不触发渲染）

```jsx
import { useRef, useState } from 'react';

function Timer() {
  const [count, setCount] = useState(0);

  // 用 ref 保存定时器 ID，不需要触发渲染
  const timerRef = useRef(null);

  // 用 ref 保存最新的 count，避免闭包陷阱
  const countRef = useRef(count);
  countRef.current = count; // 每次渲染时同步最新值

  const start = () => {
    if (timerRef.current) return; // 防止重复启动
    timerRef.current = setInterval(() => {
      // 通过 ref 读取最新 count，不需要把 count 放进依赖
      console.log('最新值:', countRef.current);
    }, 1000);
  };

  const stop = () => {
    clearInterval(timerRef.current);
    timerRef.current = null;
  };

  return (
    <div>
      <p>{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
      <button onClick={start}>开始打印</button>
      <button onClick={stop}>停止打印</button>
    </div>
  );
}
```

#### 用途三：保留上一次的值

```jsx
import { useRef, useEffect } from 'react';

// 自定义 Hook：获取上一次的值
function usePrevious(value) {
  const ref = useRef();

  useEffect(() => {
    ref.current = value; // effect 执行后更新 ref
  });

  return ref.current; // 返回的是上一次的值
}

function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <p>
      当前：{count}，上一次：{prevCount ?? '无'}
    </p>
  );
}
```

---

### 2. Context 的性能陷阱与拆分策略

#### 2.1 核心陷阱：Provider value 引用变化

```jsx
import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  // ❌ 陷阱：每次 App 渲染，这个对象都是"新的引用"
  // 导致所有消费 AppContext 的组件都重渲染
  const value = {
    user,
    setUser,     // setter 是稳定的，但放在新对象里不走运
    theme,
    setTheme,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// 即使只用了 theme，user 变化也会导致这个组件重渲染
function ThemeDisplay() {
  const { theme } = useContext(AppContext);
  console.log('ThemeDisplay 渲染');
  return <p>当前主题：{theme}</p>;
}
```

#### 2.2 拆分策略：按更新频率分离 Context

```jsx
// ✅ 正确做法：按"谁变化、谁独立"拆分 Context
const UserContext = createContext(null);      // user 相关
const UserDispatchContext = createContext(null);
const ThemeContext = createContext(null);      // theme 相关
const ThemeDispatchContext = createContext(null);

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('light');

  return (
    <UserContext.Provider value={user}>
      <UserDispatchContext.Provider value={setUser}>
        <ThemeContext.Provider value={theme}>
          <ThemeDispatchContext.Provider value={setTheme}>
            {children}
          </ThemeDispatchContext.Provider>
        </ThemeContext.Provider>
      </UserDispatchContext.Provider>
    </UserContext.Provider>
  );
}

// 只消费 theme 的组件，不会因为 user 变化而重渲染
function ThemeDisplay() {
  const theme = useContext(ThemeContext);
  return <p>当前主题：{theme}</p>;
}
```

#### 2.3 拆分的黄金法则

```jsx
// 规则一：高频更新的值和低频更新的值分开
const MousePositionContext = createContext(null); // 高频：鼠标移动
const UserInfoContext = createContext(null);       // 低频：登录后变一次

// 规则二：读和写分开（类似上面 dispatch 分离）
// 规则三：如果某个子 State 只被少数组件消费，考虑直接 props 传递
//         而不是为了这个值创建 Context
```

| Context 拆分决策 | 说明 |
|-----------------|------|
| 一个 Context 装所有 | ❌ 最差：任何值变化都全量重渲染 |
| 按领域拆分（user / theme / settings） | ✅ 基本合格 |
| 按领域 + 读写分离 | ✅✅ 推荐 |
| Context + useMemo 稳定 value | ✅ 辅助手段 |
| 拆太细（每个字段一个 Context） | ⚠️ 过度设计，Provider 嵌套过深 |

> **避坑提示**：`setState` 函数本身是稳定的（引用不变），但如果把它放进一个每次渲染都重新创建的对象里（`{ setState }`），那这个包含它的新对象就不是稳定的了。这就是为什么要单独给 dispatch 一个 Context。

---

### 3. React.memo 的浅比较

```jsx
import { memo, useState } from 'react';

// 用 memo 包裹：只在 props 变化时重渲染
const ExpensiveList = memo(function ExpensiveList({ items, onItemClick }) {
  console.log('ExpensiveList 渲染');
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => onItemClick(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});
```

浅比较的规则：

```jsx
const prevProps = { name: 'Alice', age: 25 };
const nextProps = { name: 'Alice', age: 25 };
// prevProps === nextProps? → false（不同引用）
// 但 shallow compare: name 相同 ✓, age 相同 ✓ → 不重渲染

const prevItems = [1, 2, 3];
// 父组件重渲染时...
const nextItems = [1, 2, 3];
// prevItems === nextItems? → false（不同引用）
// 但 shallow compare: prevItems[0] === nextItems[0] ✓ → 不重渲染
```

#### memo 失效的常见场景

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // 场景一：内联对象 —— 每次渲染都是新引用
  return <ExpensiveChild config={{ theme: 'dark' }} />; // memo 失效！

  // 场景二：内联函数 —— 每次渲染都是新引用
  return <ExpensiveChild onClick={() => f()} />; // memo 失效！

  // 场景三：children prop —— 每次渲染都是新 JSX
  return (
    <ExpensiveChild>
      <p>children</p> {/* 每次不同引用，memo 失效 */}
    </ExpensiveChild>
  );
}

// 正确做法
function Parent() {
  // ✅ 用 useMemo 稳定对象引用
  const config = useMemo(() => ({ theme: 'dark' }), []);

  // ✅ 用 useCallback 稳定函数引用
  const handleClick = useCallback(() => f(), []);

  return <ExpensiveChild config={config} onClick={handleClick} />;
}
```

---

### 4. 状态提升 vs 状态下沉

```jsx
// ❌ 状态提升过高：input 值变化导致整个 App 重渲染
function App() {
  const [search, setSearch] = useState('');

  return (
    <div>
      <Header />
      <Search value={search} onChange={setSearch} />
      <ExpensiveBody /> {/* 每次输入都会重渲染！ */}
      <Footer />
    </div>
  );
}

// ✅ 状态下沉（Colocation）：把状态放到真正使用它的地方
function App() {
  return (
    <div>
      <Header />
      <SearchSection /> {/* 状态在这里面 */}
      <ExpensiveBody /> {/* 不受搜索输入影响 */}
      <Footer />
    </div>
  );
}

function SearchSection() {
  const [search, setSearch] = useState('');
  return <Search value={search} onChange={setSearch} />;
}
```

| 策略 | 适用场景 | 效果 |
|------|---------|------|
| 状态提升 | 多个兄弟组件需要共享状态 | 让共享成为可能 |
| 状态下沉 | 状态只被局部使用 | 缩小重渲染范围 |
| Context | 跨层级、多组件共享 | 避免 props drilling |
| 组合（composition）| 状态和渲染分离 | 最灵活的优化手段 |

---

### 5. 虚拟列表

当列表数据量很大（1000+）时，不需要把所有 DOM 节点都渲染出来，只需要渲染**可视区域内的项**。

```jsx
// 虚拟列表的核心思想（简化版示意）
function VirtualList({ items, itemHeight, containerHeight }) {
  const [scrollTop, setScrollTop] = useState(0);

  // 计算可视范围
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );

  // 只渲染可视范围内的项
  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      {/* 用占位 div 撑开总高度 */}
      <div style={{ height: items.length * itemHeight }}>
        {/* 用 paddingTop 把可见项推到正确位置 */}
        <div style={{ paddingTop: startIndex * itemHeight }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {item.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

生产环境推荐使用成熟的库（`@tanstack/react-virtual`、`react-window`），而不是手写虚拟列表。

---

### 6. Profiler 和 React DevTools

#### 6.1 React.Profiler

```jsx
import { Profiler } from 'react';

function onRenderCallback(
  id,          // Profiler 的 id
  phase,       // "mount" 或 "update"
  actualDuration, // 本次渲染耗时
  baseDuration,   // 无 memo 情况下的预估耗时
  startTime,      // 开始渲染的时间
  commitTime      // React 提交更新的时间
) {
  console.log(`${id} (${phase}) 耗时: ${actualDuration}ms`);
}

function App() {
  return (
    <Profiler id="Navigation" onRender={onRenderCallback}>
      <Navigation />
    </Profiler>
  );
}
```

#### 6.2 React DevTools 关键功能

| 功能 | 用途 |
|------|------|
| **Components 面板** | 查看组件树、props、state、hooks |
| **⚡ 高亮更新** | 勾选 "Highlight updates when components render" 可视化渲染 |
| **Profiler 面板** | 录制交互，查看火焰图和排序图 |
| **火焰图** | 每个组件的渲染耗时分布 |
| **排序图** | 按耗时排序，快速定位"慢组件" |

> 优化三步法：先写不优化的代码 → 用 DevTools 找到实际瓶颈 → 精准优化，不预判。

---

### 7. 实战：优化一个存在性能问题的列表组件

#### 问题代码

```jsx
// 这个组件有明确的性能问题
function ProblematicApp() {
  const [items, setItems] = useState(generateLargeList(5000));
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState('light');

  // 问题1：每次渲染都执行过滤（5000 + 项）
  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  // 问题2：内联函数，子组件 memo 失效
  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="搜索..."
      />
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
        切换主题
      </button>
      {/* 问题3：所有 5000 项都渲染到 DOM 中 */}
      <ul>
        {filtered.map(item => (
          <ListItem
            key={item.id}
            item={item}
            theme={theme}
            onRemove={removeItem} // 问题2：内联函数
          />
        ))}
      </ul>
    </div>
  );
}
```

#### 优化后的代码

```jsx
import { useState, useMemo, useCallback, memo } from 'react';

// 优化1：memo 包裹子组件，避免无变化项重渲染
const ListItem = memo(function ListItem({ item, theme, onRemove }) {
  return (
    <li
      className={`item ${theme}`}
      style={{
        background: theme === 'dark' ? '#333' : '#fff',
        color: theme === 'dark' ? '#fff' : '#333',
      }}
    >
      <span>{item.name}</span>
      <button onClick={() => onRemove(item.id)}>删除</button>
    </li>
  );
});

// 优化2：把搜索逻辑封装到独立组件，状态下沉
function SearchInput({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="搜索..."
    />
  );
}

function OptimizedApp() {
  const [items, setItems] = useState(() => generateLargeList(5000));
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState('light');

  // 优化3：useMemo 缓存过滤结果
  const filtered = useMemo(() => {
    if (!search) return items; // 没有搜索词时直接返回原数组
    return items.filter(item =>
      item.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  // 优化4：useCallback 稳定回调引用
  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []); // setItems 是稳定的，不需要依赖

  return (
    <div>
      <SearchInput value={search} onChange={setSearch} />
      <button onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
        切换主题
      </button>

      {/* 优化5：只渲染过滤后的项（逻辑优化）+ 虚拟列表（结构优化） */}
      <ul style={{ maxHeight: 500, overflow: 'auto' }}>
        {filtered.map(item => (
          <ListItem
            key={item.id}
            item={item}
            theme={theme}
            onRemove={removeItem}
          />
        ))}
      </ul>
    </div>
  );
}
```

#### 优化要点总结

| 问题 | 优化手段 | 效果 |
|------|---------|------|
| 每次渲染重过滤大数组 | `useMemo` 缓存过滤结果 | 只在 items/search 变化时重新计算 |
| `onRemove` 每次渲染都重新创建 | `useCallback` 稳定引用 | `memo` 子组件不失效 |
| 5000 个 DOM 节点全部渲染 | 虚拟列表 | 只渲染可视区域（~20 个节点） |
| 搜索状态提升过高 | 状态下沉到局部 | 其他区域不受搜索影响 |
| `ListItem` 不做记忆化 | `React.memo` 浅比较 | 避免不变化的项重渲染 |

---

## 常见问题

**Q1：`useRef` 和 `useState` 什么时候用哪个？**

如果你的值变化后需要触发重渲染来更新 UI → `useState`。如果你的值需要跨渲染保持，但不需要触发渲染 → `useRef`。如果你不确定 → 先用 `useState`，等遇到性能问题再考虑 `useRef`。

**Q2：Context 拆分到什么粒度合适？**

按更新频率拆分：一个高频更新的值配一个 Context，一组低频更新且语义相关的值可以共用一个 Context，读操作和写操作分开。不要让一个 Context 的价值变化导致所有消费者重渲染。

**Q3：为什么我的 `React.memo` 不生效？**

最常见的三个原因：(1) 传递了内联对象 `{}` 或内联函数 `() => {}`；(2) 传递了 JSX children（每次渲染都是新引用）；(3) props 里包含了每次变化的新数组/对象引用。

**Q4：`useCallback` 的依赖数组怎么写？**

和 `useEffect` 一样，包含函数内部引用的所有"响应式值"。如果函数内部用了 `setState`，可以把函数式更新作为替代方案来减少依赖（`setCount(prev => prev + 1)` 不依赖 `count`）。

**Q5：虚拟列表和普通分页的区别？**

分页是**数据层面**的分割（每次只拿一页数据），虚拟列表是**渲染层面**的优化（所有数据都在内存中，但只渲染可见的 DOM 节点）。分页有网络请求开销，虚拟列表没有。两者可以结合使用。

**Q6：`Profiler` 的 `actualDuration` 和 `baseDuration` 的区别？**

`actualDuration` 是本次渲染**实际**花费的时间（含 memo 跳过的时间节省），`baseDuration` 是**假设没有 memo** 的情况下渲染需要的时间。两者差距越大，说明你的 memo 优化越有效。

**Q7：`useMemo` + `React.memo` 是不是越多越好？**

不是。每个 `useMemo` 和 `useCallback` 都有自己开销（依赖比较、缓存存储）。对于简单的计算和组件，memo 化可能让性能更差。原则：先测量，再优化。

**Q8：Props drilling 和 Context 怎么选？**

层级 ≤ 2 层且只一两个组件用 → props 传递。跨多层、多组件需要 → Context。不要因为"不想传 props"就给整个应用套 Context——那可能带来更大的性能负担。

---

## 实操作业

### 基础：稳定引用的表单
创建一个用户设置表单，包含多个输入字段。用 `useRef` 替代 `useState` 读取表单值（提交时读取），用 `React.memo` 包裹每一个输入组件，验证切换主题时输入组件不会重渲染。

### 进阶：高性能无限滚动列表
实现一个支持无限滚动的虚拟列表。要求：(1) 只渲染可视区域的 DOM 节点；(2) 使用 `IntersectionObserver` 检测触底加载更多；(3) 加载过程中显示骨架屏；(4) 用 `useMemo` 和 `useCallback` 确保不必要的重渲染。

### 挑战：优化已有的"慢"应用
找一个你之前写的列表/表单类型组件，用 React DevTools Profiler 录制操作过程，根据火焰图定位渲染瓶颈并优化。记录优化前后 `actualDuration` 的变化，写一份简短的分析说明。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“Ref、Context 与性能优化”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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

- `useRef` 的核心价值是"可变但不触发渲染"：DOM 引用、计时器/ID 存储、保留上一次值
- Context 的性能杀手是 Provider value 的引用变化，核心解法是拆分成高/低频 Context
- `React.memo` 通过浅比较跳过不必要的渲染，配合 `useCallback`/`useMemo` 才有好效果
- 状态下沉（Colocation）是最简单也最高效的性能优化——把状态放到真正需要它的组件里
- 虚拟列表是处理大数据量渲染的利器，核心是"只渲染看得见的"
- Profiler + React DevTools 是性能分析的标配工具
- 优化原则：先写能工作的代码 → 测量 → 找到真正的瓶颈 → 精准优化

<!-- course-nav:start -->
---

[上一篇：05 并发渲染与 Suspense](./05-并发渲染与Suspense.md) · [课程地图](../../README.md) · [下一篇：01 模板语法与响应式基础](../02-Vue-3-核心/01-模板语法与响应式基础.md)
<!-- course-nav:end -->
