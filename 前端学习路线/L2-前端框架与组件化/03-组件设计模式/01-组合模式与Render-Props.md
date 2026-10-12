# 组合模式与 Render Props

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[04 组件通信与插槽](../02-Vue-3-核心/04-组件通信与插槽.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN Web Docs](https://developer.mozilla.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解「组合优于继承」的设计原则及其在前端组件设计中的体现
- 掌握 React 中 `children`、slots 模式与 render props 三种组合方式
- 掌握 Vue 中默认插槽、具名插槽、作用域插槽的组合方式
- 理解 Vue 作用域插槽与 React Render Props 的本质等价关系
- 了解高阶组件（HOC）的适用场景与缺点
- 能独立实现可复用的数据获取组件

---

## 内容讲解

### 一、为什么组合优于继承

面向对象编程中，我们习惯用「继承」来复用代码——子类继承父类，获得父类的属性和方法。但在 UI 组件设计中，继承几乎从来不是正确的答案。

想象一个场景：你有一个 `BaseButton`，然后想做一个带图标的 `IconButton` 和一个带下拉菜单的 `DropdownButton`。用继承的思路：

```
BaseButton → IconButton
BaseButton → DropdownButton
```

但如果再来一个 **带图标且带下拉菜单** 的按钮呢？IconDropdownButton 该继承谁？菱形继承问题就来了。

**组合**的思路完全不同：把 UI 拆成「插槽」，由使用方决定插槽里放什么。React 官方文档开宗明义：

> React has a powerful composition model, and we recommend using composition instead of inheritance to reuse code between components.

**核心原则**：组件不知道子内容是什么，只提供「框架」和「数据」，内容由使用者自由组装。

---

### 二、React 的组合模式

#### 2.1 children prop —— 最基础的组合

`children` 是 React 内置的隐式 prop，任何 JSX 的嵌套内容都会自动传入：

```jsx
// Card.jsx —— 只负责框架
function Card({ children, title }) {
  return (
    <div className="card">
      {title && <div className="card-header">{title}</div>}
      <div className="card-body">{children}</div>
    </div>
  );
}

// 使用方 —— 自由决定内容
<Card title="用户信息">
  <p>姓名：张三</p>
  <p>邮箱：zhangsan@example.com</p>
  <button>编辑</button>
</Card>
```

**要点**：`Card` 不知道 `children` 里有什么，只负责给它们套上样式和结构。

#### 2.2 Slots 模式 —— 多个「洞」

单 `children` 不够用？你需要多个插槽。React 没有原生的「具名插槽」，但可以通过多个 props 模拟：

```jsx
// Layout.jsx —— 多插槽布局
function Layout({ header, sidebar, main, footer }) {
  return (
    <div className="layout">
      <header className="layout-header">{header}</header>
      <div className="layout-body">
        <aside className="layout-sidebar">{sidebar}</aside>
        <main className="layout-main">{main}</main>
      </div>
      <footer className="layout-footer">{footer}</footer>
    </div>
  );
}

// 使用方
<Layout
  header={<h1>后台管理系统</h1>}
  sidebar={<nav>导航菜单</nav>}
  main={<Dashboard />}
  footer={<p>© 2026</p>}
/>
```

#### 2.3 Render Props —— 把渲染逻辑交给使用方

Render props 是组合模式的进阶形态：**把「如何渲染」作为函数 prop 传递给组件，组件提供数据，使用方决定渲染方式**。

```jsx
// MouseTracker.jsx —— 只追踪鼠标位置，不负责渲染
function MouseTracker({ render }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  // 调用 render 函数，传入数据，由使用方决定怎么画
  return <>{render(position)}</>;
}

// 使用方 A：渲染一个跟随鼠标的圆
<MouseTracker render={({ x, y }) => (
  <div className="cursor-circle" style={{ left: x, top: y }} />
)} />

// 使用方 B：渲染坐标文本
<MouseTracker render={({ x, y }) => (
  <p>鼠标位置：({x}, {y})</p>
)} />
```

`render` prop 本质上是一个**回调函数**，它接收组件的内部数据，返回一个 React 元素。组件的职责从「渲染 UI」变成了「管理逻辑 + 提供数据」。

---

### 三、Vue 的组合模式

Vue 的组合模型以**插槽**为核心，比 React 的 children/props 模式更加声明式。

#### 3.1 默认插槽 —— 等价于 React 的 children

```vue
<!-- Card.vue -->
<template>
  <div class="card">
    <div v-if="title" class="card-header">{{ title }}</div>
    <div class="card-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({ title: String })
</script>
```

使用：

```vue
<Card title="用户信息">
  <p>姓名：张三</p>
  <p>邮箱：zhangsan@example.com</p>
  <button>编辑</button>
</Card>
```

#### 3.2 具名插槽 —— 多插槽场景

```vue
<!-- Layout.vue -->
<template>
  <div class="layout">
    <header><slot name="header" /></header>
    <div class="body">
      <aside><slot name="sidebar" /></aside>
      <main><slot /></main>
    </div>
    <footer><slot name="footer" /></footer>
  </div>
</template>
```

```vue
<Layout>
  <template #header><h1>后台</h1></template>
  <template #sidebar><nav>导航</nav></template>
  <!-- 未命名的内容自动落入默认插槽 -->
  <Dashboard />
  <template #footer><p>© 2026</p></template>
</Layout>
```

#### 3.3 作用域插槽 —— 等价于 Render Props

作用域插槽是 Vue 最强大的组合机制：**父组件定义插槽的渲染方式，子组件通过 slot props 向上传递数据**。

```vue
<!-- MouseTracker.vue -->
<template>
  <slot :x="position.x" :y="position.y" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const position = ref({ x: 0, y: 0 })

function handleMove(e) {
  position.value = { x: e.clientX, y: e.clientY }
}

onMounted(() => window.addEventListener('mousemove', handleMove))
onUnmounted(() => window.removeEventListener('mousemove', handleMove))
</script>
```

```vue
<!-- 使用方 A：跟随鼠标的圆 -->
<MouseTracker v-slot="{ x, y }">
  <div class="cursor-circle" :style="{ left: x + 'px', top: y + 'px' }" />
</MouseTracker>

<!-- 使用方 B：坐标文本 -->
<MouseTracker v-slot="{ x, y }">
  <p>鼠标位置：({{ x }}, {{ y }})</p>
</MouseTracker>
```

**本质等价关系**：

| React Render Props | Vue 作用域插槽 |
|---|---|
| `<Comp render={(data) => <UI />} />` | `<Comp v-slot="data"><UI /></Comp>` |
| 回调函数返回 JSX | 模板片段使用绑定的数据 |
| 命令式 | 声明式 |

两者解决的是同一个问题：**数据的提供方（子组件）和渲染方（父组件）的分离**。

---

### 四、高阶组件（HOC）

HOC 是 React 生态中曾广泛使用的逻辑复用模式。它本质上是一个**函数，接收一个组件，返回一个新组件**：

```jsx
// withAuth.jsx —— 给组件注入 auth 信息
function withAuth(WrappedComponent) {
  function WithAuth(props) {
    const auth = useContext(AuthContext);
    return <WrappedComponent {...props} auth={auth} />;
  }
  WithAuth.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  return WithAuth;
}

// 使用
const DashboardWithAuth = withAuth(Dashboard);
```

**HOC 的优点**：
- 逻辑复用：抽取跨组件的通用逻辑（如鉴权、日志、Loading）
- 不侵入原组件：原组件不感知 HOC 的存在

**HOC 的缺点**：
- **嵌套地狱**：多个 HOC 嵌套导致 `withB(withA(withC(Comp)))`，调试困难
- **Props 冲突**：HOC 注入的 prop 可能与传递的 prop 或原组件自身的 prop 重名
- **类型不安全**：在 TypeScript 中，多层 HOC 的类型推导容易出错
- **静态方法丢失**：原组件的静态方法不会被自动复制

**现在 HOC 的地位**：在 React 16.8 引入 Hooks 之后，自定义 Hook 已经取代了 HOC 的大部分使用场景。HOC 仍然存在于老旧代码库中，但新代码应优先使用 Hook。

---

### 五、实战：可复用数据获取组件

**需求**：实现一个组件，接收 `url`，自动发起请求，并将 `loading`、`error`、`data` 暴露给使用方，由使用方决定如何渲染三种状态。

#### React 实现（Render Props）

```jsx
import { useState, useEffect } from 'react';

/**
 * DataFetcher —— 只负责获取数据，不负责渲染
 * @param {string} url       请求地址
 * @param {function} children render prop，接收 { loading, error, data }
 */
function DataFetcher({ url, children }) {
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [data, setData]     = useState(null);

  useEffect(() => {
    let cancelled = false; // 防止组件卸载后 setState
    setLoading(true);
    setError(null);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [url]);

  // 调用 children 函数，传入数据，由使用方决定怎么渲染
  return <>{children({ loading, error, data })}</>;
}

// ============= 使用示例 =============

function UserList() {
  return (
    <DataFetcher url="/api/users">
      {({ loading, error, data }) => {
        if (loading) return <div className="spinner">加载中...</div>;
        if (error)   return <div className="error">出错了：{error}</div>;
        return (
          <ul>
            {data.map((user) => (
              <li key={user.id}>{user.name}</li>
            ))}
          </ul>
        );
      }}
    </DataFetcher>
  );
}
```

**设计要点**：
- `cancelled` 标志位防止组件卸载后调用 `setState`（内存泄漏保护）
- `children` 作为 render prop 使用（`children({ loading, error, data })`），这是 React 社区的常见写法
- 三种状态（loading / error / data）全部交给使用方决定渲染方式

#### Vue 实现（作用域插槽）

```vue
<!-- DataFetcher.vue -->
<template>
  <slot :loading="loading" :error="error" :data="data" />
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps({
  url: { type: String, required: true }
})

const loading = ref(true)
const error = ref(null)
const data = ref(null)
let abortController = null

async function fetchData() {
  loading.value = true
  error.value = null
  abortController?.abort()
  abortController = new AbortController()

  try {
    const res = await fetch(props.url, { signal: abortController.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    data.value = await res.json()
  } catch (err) {
    // 忽略 AbortError（由组件切换 URL 导致）
    if (err.name !== 'AbortError') {
      error.value = err.message
    }
  } finally {
    loading.value = false
  }
}

watch(() => props.url, fetchData, { immediate: true })
onUnmounted(() => abortController?.abort())
</script>
```

使用：

```vue
<template>
  <DataFetcher url="/api/users" v-slot="{ loading, error, data }">
    <div v-if="loading" class="spinner">加载中...</div>
    <div v-else-if="error" class="error">出错了：{{ error }}</div>
    <ul v-else>
      <li v-for="user in data" :key="user.id">{{ user.name }}</li>
    </ul>
  </DataFetcher>
</template>
```

**设计要点**：
- 使用 `AbortController` 管理请求取消（Vue 的声明式风格更适合此方式）
- `watch` + `immediate: true` 等价于 `useEffect` 的挂载 + 重请求逻辑
- 作用域插槽和 render props 在**思想上完全等价**：都是「你给我渲染函数/模板，我给你数据」

---

## 常见问题

**Q1：children 和 render prop 有什么区别？**

`children` 是静态的组件嵌套内容；render prop 是一个**函数**，它接收组件内部数据并返回 UI。`children` 本身也可以作为 render prop 使用：`<Comp>{data => <UI />}</Comp>`。

**Q2：React 的 render props 和 Vue 的作用域插槽哪个更好？**

没有绝对的好坏。Render props 更灵活（可以在回调中做任意计算），Vue 作用域插槽更声明式（模板编译时优化，阅读更直观）。本质上解决同一个问题，选型取决于框架。

**Q3：HOC 还能用吗？什么时候用？**

维护老项目时理解它就够了。新项目中，能用自定义 Hook（React）或 Composable（Vue）解决的场景，不要写 HOC。唯一的例外：需要「包装组件返回新组件」的场景（如 React-Redux 的 `connect`，虽然后来也被 `useSelector` 取代了）。

**Q4：组合模式下如何组织大型组件？**

按职责拆分子组件，通过插槽/children 组装。一个页面组件可能是这样：

```jsx
<PageLayout>
  <PageHeader><Breadcrumb /> <Actions /></PageHeader>
  <PageSidebar><Menu /></PageSidebar>
  <PageContent><Table /></PageContent>
</PageLayout>
```

每个子组件独立开发、独立测试，最后通过插槽拼装。

**Q5：多个 render prop 嵌套怎么办？**

这确实是 render props 的痛点（「回调地狱」）。解决方案：
- 组合多个数据源到一个组件中
- 使用自定义 Hook 替代（推荐）
- React 的 Suspense + ErrorBoundary 也可以分担 loading/error 的嵌套

**Q6：Vue 的插槽可以带默认内容吗？**

可以。在 `<slot>` 标签内写入的内容即为默认内容，当父组件没有提供对应插槽时渲染：

```vue
<slot name="footer">默认页脚 © 2026</slot>
```

**Q7：作用域插槽中 `v-slot` 可以用于多个插槽吗？**

可以，用对象解构给每个具名插槽绑定各自的 slot props：

```vue
<Comp>
  <template #header="headerProps">{{ headerProps.title }}</template>
  <template #default="defaultProps">{{ defaultProps.body }}</template>
</Comp>
```

---

## 实操作业

### 基础练习：重构卡片组件

你接手了一个项目，发现 `UserCard`、`ProductCard`、`ArticleCard` 三个组件有大量重复的卡片框架代码。请用组合模式重构：
- React：用 `children` + 多 prop slots 实现 `<Card>` 组件
- Vue：用默认插槽 + 具名插槽实现 `<Card>` 组件
- 要求：三种卡片都能用同一个 `<Card>` 组件渲染

### 进阶练习：实现通用列表组件

参考本节 `DataFetcher` 的设计，实现一个 `<ListManager>` 组件：
- 接收 `fetchItems` 函数和 `renderItem` 函数作为 props
- 管理 loading / error / empty / data 四种状态
- 支持下拉刷新和分页加载
- 所有 UI 渲染由使用方通过 render props（React）/ 作用域插槽（Vue）决定

### 挑战练习：可组合的搜索面板

设计一套搜索面板的组合组件：
- `<SearchPanel>` 提供布局框架
- 通过插槽允许使用方插入筛选条件（Filter）、排序（Sorter）、结果列表（Results）
- 状态管理集中在 `<SearchPanel>` 内部（搜索关键词、筛选条件、排序方式）
- 这些状态通过作用域插槽 / render props 暴露给子插槽
- 实现后，用同一个 `<SearchPanel>` 渲染「用户搜索」和「订单搜索」两个完全不同的页面

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“组合模式与 Render Props”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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

- **组合优于继承**是前端组件设计的核心原则，一切 UI 都可以拆成「框架 + 插槽」
- React 通过 `children`、多 prop slots、render props 三种方式实现组合
- Vue 通过默认插槽、具名插槽、作用域插槽实现组合，后者与 render props 本质等价
- HOC 是 React 早期逻辑复用的方案，在 Hooks 时代已被自定义 Hook 替代，了解即可
- 核心思想永远是：**组件管逻辑和数据，使用方管渲染**

<!-- course-nav:start -->
---

[上一篇：04 组件通信与插槽](../02-Vue-3-核心/04-组件通信与插槽.md) · [课程地图](../../README.md) · [下一篇：受控与非受控组件](./02-受控与非受控组件.md)
<!-- course-nav:end -->
