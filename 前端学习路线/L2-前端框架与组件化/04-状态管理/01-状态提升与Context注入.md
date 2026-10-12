# 01 — 状态提升与 Context 注入

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[高阶组件与自定义 Hooks](../03-组件设计模式/04-高阶组件与自定义Hooks.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN Web Docs](https://developer.mozilla.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 判断何时该提升状态、何时该让状态留在原地
- 掌握状态下沉（Colocation）原则，避免不必要的数据上浮
- 熟练使用 React Context（createContext / Provider / useContext）
- 认清 Context 的性能陷阱并学会拆分优化
- 理解 Vue provide/inject 机制及其与 Context 的异同
- 能独立实现主题切换 + 用户认证的组合 Context 方案

---

## 内容讲解

### 1. 状态提升（Lifting State Up）

**一句话定义**：当两个兄弟组件需要共享同一份状态时，把状态移动到它们最近的公共祖先组件，然后通过 props 向下传递。

这是 React 官方文档里最早教你的模式。核心思路很简单——React 数据流是单向的（父 → 子），所以需要共享的数据必须放在"够高"的地方。

```jsx
// ❌ 错误：两个组件各自持有一份 count，互不相通
function LeftPanel() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
function RightPanel() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>+1</button>;
}

// ✅ 正确：把状态提升到公共父组件
function Parent() {
  const [count, setCount] = useState(0);   // 状态在这里
  return (
    <>
      <LeftPanel count={count} />           {/* 通过 props 往下传 */}
      <RightPanel count={count} onAdd={() => setCount(c => c + 1)} />
    </>
  );
}
```

**什么时候该提升？** 满足下面两个条件：

1. 多个组件需要**读取同一份数据**
2. 任意一个组件对数据的**修改**需要立刻反映到其他组件

**什么时候不该提升？** 这个更重要——很多人一上来就把所有状态扔到顶层，形成"上帝组件"：

- 只有一个组件用到的状态 → 留在本地
- 父子通信可以用回调，不需要提升给爷爷
- 跨层级很深的共享 → 提升也救不了你，是时候上 Context 或状态管理库了

---

### 2. 状态下沉（State Colocation）

这是和"状态提升"互补的黄金法则：**状态离使用它的组件越近越好**。

```jsx
// ❌ 反模式：把搜索关键词放在顶层 App，但 Form 的子组件完全不需要它
function App() {
  const [keyword, setKeyword] = useState('');
  return (
    <>
      <Header keyword={keyword} />           {/* 需要 keyword */}
      <SearchForm setKeyword={setKeyword} />  {/* 需要 setKeyword */}
      <Footer />                              {/* 完全不需要！但 App 重渲染它也跟着重渲染 */}
    </>
  );
}

// ✅ 改进：把 keyword 下沉到真正需要它的位置
function App() {
  return (
    <>
      <HeaderWithSearch />   {/* keyword 被封在这个组件内部 */}
      <Footer />             {/* 不受任何影响 */}
    </>
  );
}
```

**核心收益**：减少不必要的重渲染。React 中父组件更新会导致所有子组件重新 render（不考虑 memo），状态下沉等于手动把渲染范围控制在最小。

**一条判断口诀**：如果一个状态你打算提升到某个层级，先问自己——在这个层级下，有多少子组件真正需要它？如果少于一半，大概率不该提升到这里。

---

### 3. React Context 基础

当 props 传递超过 2-3 层时（俗称"prop drilling"），Context 提供了捷径。

```jsx
import { createContext, useContext, useState } from 'react';

// 1. 创建 Context
const ThemeContext = createContext(null);

// 2. Provider 提供数据
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 3. 消费者用 useContext 读取
function ThemedButton() {
  const { theme, toggle } = useContext(ThemeContext);
  return (
    <button onClick={toggle} style={{ background: theme === 'dark' ? '#333' : '#fff' }}>
      当前主题: {theme}
    </button>
  );
}

// 4. 组装
function App() {
  return (
    <ThemeProvider>
      <ThemedButton />
    </ThemeProvider>
  );
}
```

看起来很简单，但魔鬼在细节里。

---

### 4. Context 的性能陷阱

**陷阱一：Provider value 引用变化导致全局重渲染**

```jsx
// ⚠️ 致命错误：每次 ThemeProvider 渲染，value 都是新对象
//    所有消费者全部重渲染，不管 theme 有没有变！
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>  {/* 每次创建新对象！ */}
      {children}
    </ThemeContext.Provider>
  );
}
```

**修复方式**：用 `useMemo` 稳定引用，或把 value 拆成两个 Context。

```jsx
// ✅ 修复 1：useMemo 稳定引用
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');
  const value = useMemo(() => ({ theme, setTheme }), [theme]); // theme 不变，引用就不变
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ✅ 修复 2（推荐）：拆分 Context（见下一节）
```

**陷阱二：中间组件没有用 `React.memo` 时，Context 优化等于白做**

Context 消费者重渲染后，它下面的所有子组件也会重渲染（除非是 memo 组件）。这是 React 渲染机制决定的，不是 Context 的 bug。

**一个毫秒级的修复建议**：对于高频更新的 Context（如主题、语言、用户信息），把消费者尽量放在组件树的**叶子节点**，中间层都用 `React.memo` 包裹。

---

### 5. Context 拆分优化

把"很少变的数据"和"经常变的数据"放进不同的 Context。

```jsx
// 用户信息：登录后几乎不变
const AuthStateContext = createContext(null);   // { user, isLogin }
const AuthActionContext = createContext(null);  // { login, logout }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // 很少变的数据，useMemo 让它更稳定
  const stateValue = useMemo(() => ({ user, isLogin: !!user }), [user]);

  // 函数引用始终不变（useState 的 setter 引用是稳定的）
  const login = (u) => setUser(u);
  const logout = () => setUser(null);
  const actionValue = useMemo(() => ({ login, logout }), []);

  return (
    <AuthStateContext.Provider value={stateValue}>
      <AuthActionContext.Provider value={actionValue}>
        {children}
      </AuthActionContext.Provider>
    </AuthStateContext.Provider>
  );
}

// 用法：不需要 action 的组件只订阅 state，不受 action 变化影响
function UserAvatar() {
  const { user } = useContext(AuthStateContext); // 只订阅这一个 Context
  return <img src={user?.avatar} />;
}
```

**通用拆分策略**：

| Context 类型 | 更新频率 | 示例 |
|---|---|---|
| 状态 Context | 低 | 用户信息、主题、语言、权限 |
| 动作 Context | 几乎不变 | login/logout、switchTheme |
| 派生数据 Context | 中 | 通知计数、购物车数量 |

---

### 6. Vue 的 provide / inject 机制

Vue 3 中的等价方案，但原理不同：

- React Context 基于组件树 + Fiber，是"渲染期的依赖注入"
- Vue provide/inject 基于响应式系统，是"真正的依赖注入"

```vue
<script setup>
import { provide, ref, readonly } from 'vue';

// 提供方
const theme = ref('light');
const toggle = () => { theme.value = theme.value === 'light' ? 'dark' : 'light'; };

provide('theme', readonly(theme));  // 提供只读版本
provide('toggleTheme', toggle);     // 提供切换方法

// 子组件 (任意深度)
import { inject } from 'vue';
const theme = inject('theme');
const toggle = inject('toggleTheme');
</script>
```

**Vue provide/inject 优势**：

- 天然响应式，没有 Provider value 引用问题
- 默认只在 `setup` 阶段解析一次，不走渲染比对
- `readonly()` 可以直接限制子组件修改权限

**Vue provide/inject 注意事项**：

- 尽量在 provide 处用 `readonly` 包裹，强制单向数据流
- 如果需要 provide 的值来自异步数据，用 `computed` 保持响应性
- 和 React Context 一样，不适用于大规模高频状态 → 这种情况上 Pinia

**React Context vs Vue provide/inject 速查**：

| 维度 | React Context | Vue provide/inject |
|---|---|---|
| 实现原理 | Fiber 树查找 + 订阅渲染 | 响应式依赖收集 |
| 性能风险 | Provider value 引用变化 | 几乎无（响应式自动追踪） |
| 使用方式 | JSX 包裹 Provider | setup 内调用函数 |
| 限制 | 需要组件在 Provider 子树内 | 同 |
| 调试 | React DevTools Components 面板 | Vue DevTools 组件面板 |

---

### 实战：React 主题切换 + 用户认证双 Context

```jsx
// contexts/ThemeContext.jsx
import { createContext, useContext, useState, useMemo, useCallback } from 'react';

// ---- 按更新频率拆成两个 Context ----
const ThemeStateContext = createContext(null);   // 当前主题
const ThemeActionContext = createContext(null);  // 切换方法

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  // 状态对象：只有 theme 变了才重建
  const state = useMemo(() => ({ theme }), [theme]);

  // 动作：引用永远不变
  const actions = useMemo(() => ({
    toggle: () => setTheme(t => t === 'light' ? 'dark' : 'light'),
    setLight: () => setTheme('light'),
    setDark: () => setTheme('dark'),
  }), []);

  return (
    <ThemeStateContext.Provider value={state}>
      <ThemeActionContext.Provider value={actions}>
        {children}
      </ThemeActionContext.Provider>
    </ThemeStateContext.Provider>
  );
}

// 自定义 Hook 封装消费者，增加可读性 + 错误提示
export function useThemeState() {
  const ctx = useContext(ThemeStateContext);
  if (!ctx) throw new Error('useThemeState 必须在 ThemeProvider 内使用');
  return ctx;
}

export function useThemeActions() {
  const ctx = useContext(ThemeActionContext);
  if (!ctx) throw new Error('useThemeActions 必须在 ThemeProvider 内使用');
  return ctx;
}
```

```jsx
// contexts/AuthContext.jsx — 同理拆分
import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const AuthStateContext = createContext(null);
const AuthActionContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const state = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    loading,
  }), [user, loading]);

  // 模拟异步登录
  const actions = useMemo(() => ({
    async login(username, password) {
      setLoading(true);
      // 模拟网络请求
      await new Promise(r => setTimeout(r, 1000));
      setUser({ name: username, role: 'member' });
      setLoading(false);
    },
    logout() {
      setUser(null);
    },
  }), []);

  return (
    <AuthStateContext.Provider value={state}>
      <AuthActionContext.Provider value={actions}>
        {children}
      </AuthActionContext.Provider>
    </AuthStateContext.Provider>
  );
}

// 同样暴露两个 Hook
export function useAuthState() {
  const ctx = useContext(AuthStateContext);
  if (!ctx) throw new Error('useAuthState 必须在 AuthProvider 内使用');
  return ctx;
}
export function useAuthActions() {
  const ctx = useContext(AuthActionContext);
  if (!ctx) throw new Error('useAuthActions 必须在 AuthProvider 内使用');
  return ctx;
}
```

```jsx
// App.jsx — 使用端干净整洁
import { ThemeProvider, useThemeState, useThemeActions } from './contexts/ThemeContext';
import { AuthProvider, useAuthState, useAuthActions } from './contexts/AuthContext';

function Header() {
  const { theme } = useThemeState();       // 只订阅 theme
  const { user } = useAuthState();          // 只订阅 user
  const { logout } = useAuthActions();      // 只订阅 logout
  const { toggle } = useThemeActions();     // 只订阅 toggle

  return (
    <header style={{ background: theme === 'dark' ? '#1a1a1a' : '#f0f0f0', padding: 16 }}>
      <button onClick={toggle}>切换主题 ({theme})</button>
      {user
        ? <span>欢迎, {user.name} <button onClick={logout}>退出</button></span>
        : <span>未登录</span>
      }
    </header>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Header />
      </AuthProvider>
    </ThemeProvider>
  );
}
```

注意：Header 同时消费了 4 个 Hook，但分属 4 个 Context。当 toggle 触发时，只有 ThemeStateContext 的消费者重渲染，AuthStateContext 的消费者不受影响——这就是拆分 Context 带来的精确重渲染。

---

### 实战：Vue provide/inject 等价实现

```vue
<!-- composables/useTheme.js -->
<script setup>
import { provide, inject, ref, readonly } from 'vue';

const ThemeSymbol = Symbol('theme');

export function createTheme() {
  const theme = ref('light');
  const toggle = () => { theme.value = theme.value === 'light' ? 'dark' : 'light'; };

  // 同时 provide 状态和动作，子组件自由选择订阅哪个
  provide(ThemeSymbol, {
    theme: readonly(theme),   // 只读，防止子组件直接改
    toggle,
  });

  return { theme, toggle };
}

export function useTheme() {
  const ctx = inject(ThemeSymbol);
  if (!ctx) throw new Error('useTheme 必须在 createTheme 调用的组件内使用');
  return ctx;
}
</script>
```

```vue
<!-- composables/useAuth.js —— 同理 -->
<script setup>
import { provide, inject, ref, computed, readonly } from 'vue';

const AuthSymbol = Symbol('auth');

export function createAuth() {
  const user = ref(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!user.value);

  async function login(username, _password) {
    loading.value = true;
    await new Promise(r => setTimeout(r, 1000));
    user.value = { name: username, role: 'member' };
    loading.value = false;
  }

  function logout() { user.value = null; }

  provide(AuthSymbol, {
    user: readonly(user),
    isAuthenticated,
    loading: readonly(loading),
    login,
    logout,
  });

  return { user, isAuthenticated, loading, login, logout };
}

export function useAuth() {
  const ctx = inject(AuthSymbol);
  if (!ctx) throw new Error('useAuth 必须在 createAuth 调用的组件内使用');
  return ctx;
}
</script>
```

```vue
<!-- App.vue -->
<script setup>
import { createTheme, useTheme } from './composables/useTheme';
import { createAuth, useAuth } from './composables/useAuth';

// 根组件调用一次 "create"，子孙组件只管 "use"
createTheme();
createAuth();
</script>
```

```vue
<!-- Header.vue -->
<script setup>
import { useTheme } from './composables/useTheme';
import { useAuth } from './composables/useAuth';

const { theme, toggle } = useTheme();
const { user, login, logout } = useAuth();
</script>

<template>
  <header :style="{ background: theme === 'dark' ? '#1a1a1a' : '#f0f0f0' }">
    <button @click="toggle">切换主题 ({{ theme }})</button>
    <span v-if="user">欢迎, {{ user.name }} <button @click="logout">退出</button></span>
    <span v-else>未登录</span>
  </header>
</template>
```

Vue 版本天然没有 Context 拆分问题——响应式系统只追踪你实际访问的属性，不访问就不依赖。

---

## 常见问题

**Q1：状态提升到多高算合适？**
A：**只提升到需要这状态的组件的最近公共祖先**。不要一上来就放 App 层。判断标准：在祖先组件中，有多少直接子组件需要这个状态？如果不到一半，考虑拆出中间层容器组件。

**Q2：Context 和 Redux/Zustand 有什么区别？**
A：Context 是 React 内建的依赖注入机制，适合低频率的全局配置（主题、语言、用户信息）。Redux/Zustand 是专门的状态管理库，有选择器、中间件、DevTools 等完整生态，适合高频更新的业务状态。

**Q3：useMemo 优化 Context value 一定能解决问题吗？**
A：不。`useMemo` 只能在依赖不变时复用 value 引用，减少无关的 Context 广播；真正需要读取已变化值的消费者仍会渲染。根据更新频率拆分 Context、缩小消费者范围、使用选择器型状态库，或在昂贵子树上有证据地使用 `memo`，都可能是方案。

**Q4：Vue 的 provide/inject 有没有类似 Context 的性能陷阱？**
A：机制不同。注入同一个 `reactive` 对象的组件只会因渲染期间实际读取的响应式属性变化而更新，并非对象任一属性变化都让所有注入者重渲染。但过大的共享对象仍会模糊所有权和依赖边界，建议按功能拆分 key，并让提供方集中维护修改逻辑。

**Q5：为什么我的 Context 消费者不更新？**
A：Context 更新不会被中间组件的 `shouldComponentUpdate` 或 `React.memo` 阻断。先检查消费者是否读取了同一个 Context 实例、Provider 的 `value` 是否真的按 `Object.is` 比较发生变化，以及是否原地修改对象后仍传回同一引用。若消费者更新但昂贵子组件没变化，再检查子组件自己的 props 与 memo 比较逻辑。

**Q6：能不能用 Context 替代 props？**
A：不推荐。props 是最简单、最可预测的数据传递方式。Context 滥用会导致组件耦合、测试困难、重构成本高。用这个优先级：本地 state → props 传递 → 状态下沉 → Context → 状态管理库。

**Q7：provide/inject 的数据没了怎么办？**
A：用 `inject` 的第二个参数设置默认值：`inject('key', defaultValue)`。如果你希望这个默认值是指定类型之外的，说明你的默认值策略不清晰——检查是不是缺少上层的 provide。

**Q8：多个 Context Provider 怎么嵌套顺序？**
A：没有硬性规定，但一般把"更基础、更全局"的放外层。例如 AuthProvider 放 ThemeProvider 外面，因为用户状态比主题状态更底层。另一个考量：外层的 Provider 每次变化时，里层 Provider 的 value 是否会被重建——如果你发现内层 Provider 的 value 也频繁变化，可能需要调整嵌套层级。

---

## 实操作业

### 基础练习：通知中心 Context

实现一个 `NotificationContext`：
- 支持 `addNotification({ type: 'success' | 'error' | 'info', message })`
- 支持 `removeNotification(id)`
- 通知 3 秒后自动消失
- Header 组件显示未读通知数量
- Toast 组件渲染所有活跃通知

**要求**：按"状态 Context + 动作 Context"拆分，给一个消费通知列表的组件和只消费未读数量的组件各自精准更新。

### 进阶练习：表单 + 权限联动

在基础练习的基础上叠加 `PermissionContext`：
- 用户角色分 `admin` / `editor` / `viewer`
- `viewer` 看到的所有表单控件为 disabled
- `editor` 可以编辑但看不到"删除"按钮
- `admin` 拥有全部权限
- 要求任何角色切换不导致不相关组件重渲染

### 挑战练习：跨框架对比

用 React Context 和 Vue provide/inject 各实现一遍以上两个练习包（通知 + 权限），写一个 200 字以内的架构对比总结，重点说明你在两个框架中遇到的不同问题。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“状态提升与 Context 注入”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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

| 要点 | 一句话 |
|---|---|
| 状态提升 | 兄弟共享数据 → 放最近公共祖先 |
| 状态下沉 | 状态离使用者越近越好，减少重渲染 |
| React Context | 全局注入利器，但小心 value 引用 |
| 拆分策略 | 按更新频率拆 Context：状态 / 动作 / 派生 |
| Vue provide/inject | 天然响应式，无引用问题，用 readonly 强制单向流 |
| 选型优先级 | 本地 state → props → 下沉 → Context → 状态库 |

<!-- course-nav:start -->
---

[上一篇：高阶组件与自定义 Hooks](../03-组件设计模式/04-高阶组件与自定义Hooks.md) · [课程地图](../../README.md) · [下一篇：02 — Zustand 实战指南](./02-Zustand实战指南.md)
<!-- course-nav:end -->
