# 05 并发渲染与 Suspense

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[04 Server Components 与 Server Actions](./04-Server-Components与Server-Actions.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[React](https://react.dev/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 React 18/19 并发渲染（Concurrent Rendering）的本质和设计动机
- 掌握 `Suspense` 的工作原理：声明式加载状态
- 掌握 `ErrorBoundary` 的兜底机制和正确用法
- 理解 React 19 的 `use()` Hook，掌握 Suspense + 数据请求模式
- 掌握 `useTransition` 实现非紧急更新
- 理解 `startTransition` 的使用场景
- 能实现带 Suspense 骨架屏和 ErrorBoundary 的完整数据展示页

---

## 内容讲解

### 1. 并发渲染的本质

#### 1.1 传统同步渲染的问题

在 React 18 之前，渲染是**不可中断**的：

```
用户输入 → React 开始渲染 → 必须全部渲染完 → 页面才能响应下一次输入
                            ↑ 如果渲染耗时长，用户会感到"卡顿"
```

#### 1.2 并发渲染的工作原理

并发渲染引入了**可中断的渲染**：

```
用户输入 → React 开始渲染组件树
         → 用户又输入了 → React 暂停当前渲染，优先处理新输入
         → 新输入处理完 → React 继续或丢弃之前的渲染
```

核心机制：React 在内存中维护两棵 Fiber 树（当前树和 work-in-progress 树），渲染过程可以被**时间切片（Time Slicing）**中断，让出主线程给更高优先级的更新。

> 并发渲染不改变组件的编写方式，改变的是 React 内部的调度策略。你写的组件代码看起来和以前一样，但底层的行为变"聪明"了。

---

### 2. Suspense：声明式加载状态

#### 2.1 基本使用

```jsx
import { Suspense } from 'react';

function App() {
  return (
    <div>
      <h1>我的应用</h1>
      {/* Suspense 捕获子树中组件的"挂起"状态 */}
      <Suspense fallback={<p>加载中...</p>}>
        <SlowComponent />
      </Suspense>
    </div>
  );
}
```

`Suspense` 的工作流程：

```
1. React 开始渲染 <Suspense> 的子组件
2. 子组件 "抛出一个 Promise"（表示数据还没准备好）
3. React 捕获这个 Promise，找到最近的 <Suspense> 边界
4. 显示 fallback 内容（骨架屏 / loading 文案）
5. Promise 完成后，React 重新渲染子组件，替换 fallback
```

| 传统方式 | Suspense 方式 |
|---------|--------------|
| `if (loading) return <Loader />` | `<Suspense fallback={<Loader />}>` |
| 每个组件自己处理 loading | 声明式、边界统一管理 |
| 条件判断散落在各处 | 集中在一个位置 |
| 没有优先级概念 | 配合并发特性，可中断、可优先 |

#### 2.2 多级 Suspense 嵌套

```jsx
function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      {/* 整体页面骨架屏 */}
      <Header />
      <Suspense fallback={<SidebarSkeleton />}>
        {/* 侧边栏独立骨架屏 */}
        <Sidebar />
      </Suspense>
      <Suspense fallback={<ContentSkeleton />}>
        {/* 内容区独立骨架屏 */}
        <Article />
      </Suspense>
    </Suspense>
  );
}
```

多级 Suspense 的好处：**哪个部分先加载完成，哪个部分先显示**。不需要等所有数据都加载完才能看到页面。

---

### 3. ErrorBoundary：优雅的错误兜底

```jsx
import { Component } from 'react';

// ErrorBoundary 目前必须用 class 组件实现
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // 捕获子组件抛出的错误
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // 可以在这里上报错误
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary 捕获到错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 可以提供重置功能
      return (
        <div className="error-fallback">
          <h2>出错了</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

使用组合：

```jsx
function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        <DataPage />
      </Suspense>
    </ErrorBoundary>
  );
}
```

| 捕获对象 | 工具 | 说明 |
|---------|------|------|
| 数据加载中的 Promise | `<Suspense>` | 声明式 loading 状态 |
| 组件渲染时的错误 | `<ErrorBoundary>` | 声明式 error 状态 |
| 事件处理中的错误 | try...catch | 仍然需要手动处理 |

> **避坑提示**：ErrorBoundary 不能捕获以下错误：(1) 事件处理器中的错误（需要 try...catch），(2) 异步代码中的错误（如 setTimeout），(3) 服务端渲染中的错误，(4) ErrorBoundary 自身抛出的错误。

---

### 4. React 19 的 `use()` Hook

`use()` 是 React 19 新增的 Hook，可以在组件中"解包" Promise 和 Context（取代 `useContext`）。

```jsx
import { use, Suspense } from 'react';

// 在组件外部定义 fetch 函数（不在渲染期间创建 Promise）
async function fetchUser(id) {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error('用户不存在');
  return res.json();
}

// 创建 Promise 缓存
const userCache = new Map();

function getUser(id) {
  if (!userCache.has(id)) {
    userCache.set(id, fetchUser(id));
  }
  return userCache.get(id);
}

function UserProfile({ userId }) {
  // use() 解包 Promise——如果 Promise 还没完成，
  // React 会"挂起"这个组件，显示最近的 Suspense fallback
  const user = use(getUser(userId));

  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<p>加载用户信息...</p>}>
      <UserProfile userId={1} />
    </Suspense>
  );
}
```

`use()` 和 `useContext()` 的对比：

```jsx
// 旧方式：只能用 useContext 读 Context
const theme = useContext(ThemeContext);

// 新方式：use() 同时支持 Promise 和 Context
const theme = use(ThemeContext);
const data = use(fetchPromise);
```

> **避坑提示**：不要在渲染期间创建新的 Promise！如果 `<UserProfile>` 每次渲染都调用 `use(fetch('/api/user'))`，会导致无限重新渲染。Promise 必须在组件外部创建并缓存。

---

### 5. useTransition：标记非紧急更新

```jsx
import { useState, useTransition } from 'react';

function TabContainer() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  const switchTab = (nextTab) => {
    // startTransition 标记内部的状态更新为"非紧急"
    startTransition(() => {
      setTab(nextTab);
    });
  };

  return (
    <div>
      <div className="tabs">
        {['home', 'profile', 'settings'].map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={tab === t ? 'active' : ''}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 切换期间显示 opacity 降低的过渡效果 */}
      <div style={{ opacity: isPending ? 0.5 : 1 }}>
        {tab === 'home' && <Home />}
        {tab === 'profile' && <Profile />}
        {tab === 'settings' && <Settings />}
      </div>
    </div>
  );
}
```

#### 普通 setState vs startTransition

| 维度 | `setState(x)` | `startTransition(() => setState(x))` |
|------|-------------|--------------------------------------|
| 优先级 | 紧急 | 非紧急 |
| 可被中断 | ❌ | ✅（可被更紧急的更新打断） |
| 触发 Suspense | 整个 Suspense 回退到 fallback | 保持显示旧内容直到新内容就绪 |
| 适用场景 | 输入框、按钮点击 | Tab 切换、路由跳转、筛选/排序 |

#### `isPending` 的妙用

```jsx
function SearchPage() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleChange = (e) => {
    // 输入框的值立即更新（不延迟）
    setQuery(e.target.value);

    // 搜索结果标记为非紧急
    startTransition(() => {
      setSearchQuery(e.target.value);
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />

      {/* isPending 期间保留旧结果，给一个视觉提示 */}
      <div style={{ opacity: isPending ? 0.7 : 1 }}>
        <SearchResults query={searchQuery} />
      </div>
    </div>
  );
}
```

---

### 6. startTransition（独立使用）

```jsx
import { startTransition } from 'react';

// 在组件外部或不能使用 hooks 的地方
function handleNavigation(path) {
  startTransition(() => {
    router.push(path);
  });
}
```

`startTransition` 和 `useTransition` 的区别只有一个：`startTransition` 没有 `isPending` 状态。

---

### 7. 实战：带骨架屏和错误兜底的数据展示页

```jsx
import { use, Suspense, useState, useTransition } from 'react';

// ===== 数据层 =====
const dataCache = new Map();

// 模拟异步数据获取
function fetchArticles(category) {
  const key = `articles-${category}`;
  if (!dataCache.has(key)) {
    dataCache.set(
      key,
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(
            Array.from({ length: 20 }, (_, i) => ({
              id: i + 1,
              title: `${category} 文章 #${i + 1}`,
              excerpt: `这是${category}分类下的第 ${i + 1} 篇文章摘要...`,
              date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
            }))
          );
        }, 1500);
      })
    );
  }
  return dataCache.get(key);
}

// ===== 骨架屏 =====
function ArticleSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

// ===== 错误兜底 =====
class ArticleErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center p-8">
          <h2 className="text-xl text-red-600 mb-2">加载失败</h2>
          <p className="text-gray-500 mb-4">{this.state.error?.message}</p>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => {
              dataCache.clear(); // 清除缓存重新请求
              this.setState({ hasError: false });
            }}
          >
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ===== 文章列表（数据组件）=====
function ArticleList({ category }) {
  // use() 解包 Promise，未完成时会"挂起"
  const articles = use(fetchArticles(category));

  return (
    <ul className="divide-y">
      {articles.map((article) => (
        <li key={article.id} className="py-3">
          <h3 className="font-bold text-lg">{article.title}</h3>
          <p className="text-gray-600">{article.excerpt}</p>
          <time className="text-sm text-gray-400">{article.date}</time>
        </li>
      ))}
    </ul>
  );
}

// ===== 分类切换器 =====
const categories = ['技术', '生活', '设计', '产品'];

function CategoryTabs({ current, onChange }) {
  const [isPending, startTransition] = useTransition();

  const handleChange = (cat) => {
    startTransition(() => onChange(cat));
  };

  return (
    <div className="flex gap-2 mb-4">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleChange(cat)}
          className={`px-4 py-2 rounded transition-colors ${
            cat === current
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
          disabled={isPending}
        >
          {cat}
        </button>
      ))}
      {/* 非紧急更新的视觉提示 */}
      {isPending && <span className="text-gray-400 self-center">切换中...</span>}
    </div>
  );
}

// ===== 主组件 =====
export default function ArticlePage() {
  const [category, setCategory] = useState('技术');

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">文章列表</h1>

      <CategoryTabs current={category} onChange={setCategory} />

      {/* ErrorBoundary 包裹 Suspense：先捕获错误，再处理加载 */}
      <ArticleErrorBoundary>
        <Suspense fallback={<ArticleSkeleton />}>
          <ArticleList category={category} />
        </Suspense>
      </ArticleErrorBoundary>
    </div>
  );
}
```

---

## 常见问题

**Q1：并发渲染是"多线程"渲染吗？**

不是。React 仍然运行在主线程上，并发渲染指的是 React 可以在渲染过程中"让出"主线程，让浏览器有时间处理用户输入和绘制。本质是**协作式多任务**，不是真正的多线程。

**Q2：`Suspense` 只能用于数据加载吗？**

不仅是数据加载。React 19 中 `Suspense` 还可以用于代码分割（`React.lazy`）、图片加载、甚至是任意"异步操作"的声明式管理。

**Q3：`use()` 和 `await` 的区别？**

`await` 只能在 async 函数中使用，会阻塞当前函数的执行直到 Promise 完成。`use()` 可以在普通组件函数中直接使用，会触发 Suspense 挂起机制——React 会"暂停"渲染，显示 fallback，等 Promise 完成后继续。`use()` 也可以用于读取 Context。

**Q4：ErrorBoundary 为什么不能用函数组件？**

因为 ErrorBoundary 依赖于 `componentDidCatch` 和 `getDerivedStateFromError` 这两个生命周期，目前函数组件还没有对应的 Hook。React 团队表示未来可能会添加。

**Q5：`useTransition` 和 `useDeferredValue` 的区别？**

`useTransition` 让你控制 **setState 的优先级**（标记某个状态更新为低优先级）。`useDeferredValue` 让你控制 **值的优先级**（延迟某个值的更新）。前者控制"触发时机"，后者控制"值的版本"。两者都利用并发特性，但粒度不同。

**Q6：什么时候不需要 `startTransition`？**

如果在 Suspense 中直接切换内容就已经满足了体验需求（比如 Tab 切换时显示旧内容直到新内容就绪），不需要额外包裹 `startTransition`。`startTransition` 主要用于需要"保持旧 UI 响应"的场景。

**Q7：多个 `Suspense` 嵌套的执行顺序？**

React 会**并行**尝试渲染所有子组件。如果一个子组件"挂起"，React 会渲染对应层级的 fallback，同时继续渲染其他子组件。这就是"哪个先加载好就先显示哪个"的原理。

**Q8：`use()` 和 `useContext()` 读 Context 有区别吗？**

都是从 Context 中读取值，但 `use()` 更灵活——它可以在条件语句和循环中使用（不需要遵守 Hook 规则），因为它不做任何内部的状态追踪。不过用 `use()` 读 Context 时，Context 变化同样会触发重渲染。

---

## 实操作业

### 基础：Suspense 加载卡片
实现一个带图片和文字的卡片组件，用 `Suspense` + `lazy` 实现组件层面的代码分割和懒加载。卡片的 fallback 显示灰色占位块。

### 进阶：多 Tab 数据看板
实现一个数据看板页面，包含 4 个 Tab（概览/分析/详情/设置）。每个 Tab 的内容通过 `use()` 异步加载，切换 Tab 时使用 `useTransition` 避免 UI 卡顿，每个 Tab 区域有独立的 `Suspense` 骨架屏。

### 挑战：流式渲染（Streaming）模拟
用 React 19 的 Suspense 模拟流式渲染效果：页面由一个"立即显示"的标题区域和三个"延迟加载"的内容块组成。三个内容块分别在不同时间点 resolve（1s/2s/3s），每块加载完成后立即显示，不等待其他块。

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：lazy 在模块顶层定义，fallback 保留卡片尺寸，并用 ErrorBoundary 处理导入失败。Suspense 等待组件代码，不自动等待 img 下载。
- **进阶**：Promise 由缓存/数据层稳定提供，不能每次 render 新建；Tab 切换用 transition 并分别设 Suspense。测试慢响应、失败与快速切换，旧 Tab 数据不串入新 Tab。
- **挑战**：给三个稳定 Promise 设 1/2/3s 延迟并独立边界，记录各块出现时间。客户端渐进显示属于教学模拟，真实 SSR streaming 还需服务端 HTML 流证据。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“并发渲染与 Suspense”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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

- 并发渲染让 React 的渲染可中断、可恢复、可丢弃，通过时间切片实现
- `Suspense` 是声明式"加载态"：`<Suspense fallback={...}>`
- `ErrorBoundary` 是声明式"错误态"：用 class 组件实现，捕获渲染错误
- React 19 的 `use()` Hook 统一了解包 Promise 和读取 Context 的 API
- `useTransition` 标记非紧急更新（`startTransition` + `isPending`）
- `startTransition` 是独立函数版本，无 `isPending`
- 最佳实践：ErrorBoundary 套 Suspense 套内容，三态（loading/error/success）集中管理

<!-- course-nav:start -->
---

[上一篇：04 Server Components 与 Server Actions](./04-Server-Components与Server-Actions.md) · [课程地图](../../README.md) · [下一篇：06 Ref、Context 与性能优化](./06-Ref-Context-性能优化.md)
<!-- course-nav:end -->
