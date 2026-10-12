# 02 — Zustand 实战指南

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[01 — 状态提升与 Context 注入](./01-状态提升与Context注入.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN Web Docs](https://developer.mozilla.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Zustand 的核心设计理念和与 Redux/Context 的根本区别
- 掌握 create() 创建 store、选择器、浅比较等基础用法
- 熟练使用 persist、devtools、immer 三大常用中间件
- 能在 store 中正确处理异步 Action
- 知道何时选 Zustand、何时选其他方案
- 能独立用 Zustand 重构一个完整的购物车

---

## 内容讲解

### 1. Zustand 的核心理念

Zustand（德语"状态"）的灵魂三原则：

- **简单**：不需要 Provider、不强迫 reducer、不绑定框架
- **基于 Hook**：用 `useStore(selector)` 消费，天然支持 React 并发特性
- **无 Boilerplate**：创建一个 store 就是调用一个函数，不需要 action types、action creators、dispatch

和 Redux 对比一下你就知道什么叫"简单"：

```js
// Redux Toolkit（已经有 Toolkit 加持）: ~30 行
const slice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1; },
    decrement: (state) => { state.value -= 1; },
  },
});
const store = configureStore({ reducer: { counter: slice.reducer } });
// 还要 Provider、useSelector、useDispatch...

// Zustand: ~10 行，不需要 Provider
const useCounter = create((set) => ({
  value: 0,
  increment: () => set((s) => ({ value: s.value + 1 })),
  decrement: () => set((s) => ({ value: s.value - 1 })),
}));
```

---

### 2. 创建 Store 与状态读写

```js
import { create } from 'zustand';

// create 的回调接收 set 和 get 两个参数
const useTodoStore = create((set, get) => ({
  // --- 状态 ---
  todos: [],
  filter: 'all',  // 'all' | 'active' | 'completed'

  // --- 派生数据（用函数而非 computed）---
  getFilteredTodos: () => {
    const { todos, filter } = get();
    if (filter === 'active') return todos.filter(t => !t.done);
    if (filter === 'completed') return todos.filter(t => t.done);
    return todos;
  },

  // --- Actions ---
  addTodo: (text) => set((state) => ({
    todos: [...state.todos, { id: Date.now(), text, done: false }]
  })),

  toggleTodo: (id) => set((state) => ({
    todos: state.todos.map(t => t.id === id ? { ...t, done: !t.done } : t)
  })),

  removeTodo: (id) => set((state) => ({
    todos: state.todos.filter(t => t.id !== id)
  })),

  setFilter: (filter) => set({ filter }),

  // 异步 Action（见第 5 节）
  fetchTodos: async () => { /* ... */ },
}));
```

**组件中的使用方式**：

```jsx
// 方式一：全量订阅 —— store 任意字段变化就重渲染
const store = useTodoStore();

// 方式二：选择器（推荐） —— 只订阅你关心的字段
const todos = useTodoStore((s) => s.todos);
const addTodo = useTodoStore((s) => s.addTodo);

// 方式三：多字段选择器 —— 注意浅比较
const { todos, filter } = useTodoStore((s) => ({
  todos: s.todos,
  filter: s.filter,
}));
```

---

### 3. 选择器与浅比较

Zustand 默认用 `Object.is` 做严格相等比较。当选择器返回对象/数组时，即使内容没变，每次也会创建新引用，导致组件误以为数据变了而重渲染。

```jsx
// ⚠️ 每次返回新对象，引用不等，组件每次重渲染
const { todos, filter } = useTodoStore((s) => ({
  todos: s.todos,
  filter: s.filter,
}));
```

**解法：`shallow` 比较**

```jsx
import { shallow } from 'zustand/shallow';

// ✅ 用 shallow 做浅层对比：字段值没变就不重渲染
const { todos, filter } = useTodoStore((s) => ({
  todos: s.todos,
  filter: s.filter,
}), shallow);
```

**另外两个场景不需要 shallow**：

1. 选择器返回原始值（`s.count`）→ `Object.is` 足够
2. 选择器返回 store 中已存在的对象引用 → store 不变则引用不变

**推荐写法**：大多数场景下，拆成多个独立选择器比合在一起然后用 `shallow` 更清晰：

```jsx
const todos = useTodoStore(s => s.todos);
const filter = useTodoStore(s => s.filter);
```

---

### 4. 三大常用中间件

Zustand 的中间件是**高阶函数**，用 `wrap` 模式组合：

```js
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        /* ... */
      })),
      { name: 'my-store' }  // persist 的配置
    ),
    { name: 'MyStore' }     // devtools 的配置
  )
);
```

包装顺序是从内到外：`immer` 先处理 `set`，然后 `persist` 加持久化，最后 `devtools` 加调试。对外暴露的 `set` 是被全部包装过的。

#### 4.1 persist — localStorage 持久化

```js
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set) => ({
      items: [],
      addItem: (item) => set((s) => ({ items: [...s.items, item] })),
      clearCart: () => set({ items: [] }),
    }),
    {
      name: 'cart-storage',          // localStorage 的 key
      partialize: (state) => ({       // 只持久化 items，不持久化方法（默认会过滤函数）
        items: state.items,
      }),
      // 可选：用 sessionStorage 替代 localStorage
      // getStorage: () => sessionStorage,
    }
  )
);
```

**关键细节**：
- `persist` 默认不持久化函数类型的字段（actions 自动排除）
- 如果你持久化了非函数、但不想持久化的字段（如 `loading`、`error`），用 `partialize`
- 刷新页面后 store 自动 hydrate，有一个 `onRehydrateStorage` 回调可以监听 hydration 完成

#### 4.2 devtools — Redux DevTools

```js
import { devtools } from 'zustand/middleware';

const useStore = create(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set((s) => ({ count: s.count + 1 }), false, 'increment'),
      //                                set 的第三个参数 → action 名称，出现在 DevTools 中
    }),
    { name: 'CounterStore' }  // DevTools 中显示的 store 名称
  )
);
```

#### 4.3 immer — 不可变更新简化

```js
import { immer } from 'zustand/middleware/immer';

const useStore = create(
  immer((set) => ({
    nested: { deep: { value: 0 } },
    users: [
      { id: 1, name: 'Alice', tags: ['admin'] },
    ],

    // 不用 immer 的写法：需要多层展开
    updateDeep: (v) => set((s) => ({
      nested: { ...s.nested, deep: { ...s.nested.deep, value: v } }
    })),

    // 用 immer 的写法：直接 mutate draft
    updateDeep_immer: (v) => set((s) => {
      s.nested.deep.value = v;
    }),

    addTag: (userId, tag) => set((s) => {
      const user = s.users.find(u => u.id === userId);
      if (user) user.tags.push(tag);  // 直接 push，immer 帮你保持不可变
    }),
  }))
);
```

---

### 5. 异步 Action

Zustand 对异步没有特殊语法——`set` 随时可调用：

```js
const useProductStore = create((set, get) => ({
  products: [],
  loading: false,
  error: null,

  fetchProducts: async (category) => {
    set({ loading: true, error: null });         // 请求前
    try {
      const res = await fetch(`/api/products?category=${category}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      set({ products: data, loading: false });    // 请求成功
    } catch (err) {
      set({ error: err.message, loading: false }); // 请求失败
    }
  },

  // 异步 Action 之间可以互相调用（通过 get）
  refreshProducts: async () => {
    const { fetchProducts } = get();
    await fetchProducts('all');
  },
}));
```

**状态机模式**（推荐）：用 `status: 'idle' | 'loading' | 'success' | 'error'` 代替 `loading` + `error` 两个独立字段，互斥状态天然保证不会有 `loading=true && error=xxx` 的矛盾。

---

### 6. Zustand vs Redux vs Context — 选型决策

| 维度 | Zustand | Redux Toolkit | React Context |
|---|---|---|---|
| 包体积 | ~2KB | ~12KB | 0（内建） |
| Boilerplate | 极少 | 中等（slice + store） | 中等（Provider + Hook） |
| 选择器性能 | 内置 shallow | useSelector + reselect | 无（手动 useMemo） |
| DevTools | 支持（中间件） | 原生支持 | 依赖 React DevTools |
| 中间件 | persist/devtools/immer | RTK Query / middleware | 无 |
| 脱离 React 使用 | ✅ | ✅ | ❌ |
| 学习曲线 | 很低 | 中高 | 低 |
| 适用场景 | 中小型项目、快速原型 | 大型团队、RTK Query 生态 | 低频全局配置 |

**决策流程**：

1. 状态是否需要脱离 React 使用？→ Zustand / Redux
2. 是否需要强大的数据获取层（RTK Query）？→ Redux Toolkit
3. 团队是否已有 Redux 积累？→ Redux Toolkit
4. 其他所有情况 → **Zustand**（首选）

---

### 7. 实战：购物车状态管理

```js
// stores/useCartStore.js
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { shallow } from 'zustand/shallow';

const useCartStore = create(
  devtools(
    persist(
      immer((set, get) => ({
        // --- 状态 ---
        items: [],  // [{ id, name, price, quantity }]

        // --- 派生数据 ---
        get totalCount() {
          return get().items.reduce((sum, item) => sum + item.quantity, 0);
        },
        get totalPrice() {
          return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        },

        // --- Actions ---
        addItem: (product) => set((state) => {
          const existing = state.items.find(i => i.id === product.id);
          if (existing) {
            existing.quantity += 1;   // immer 允许直接修改
          } else {
            state.items.push({ ...product, quantity: 1 });
          }
        }),

        removeItem: (productId) => set((state) => {
          state.items = state.items.filter(i => i.id !== productId);
        }),

        updateQuantity: (productId, delta) => set((state) => {
          const item = state.items.find(i => i.id === productId);
          if (!item) return;
          item.quantity += delta;
          if (item.quantity <= 0) {
            state.items = state.items.filter(i => i.id !== productId);
          }
        }),

        clearCart: () => set({ items: [] }),
      })),
      {
        name: 'cart',
        partialize: (state) => ({ items: state.items }),
      }
    ),
    { name: 'CartStore' }
  )
);

export default useCartStore;
```

```jsx
// components/Cart.jsx
import useCartStore from '../stores/useCartStore';

function Cart() {
  // 分别订阅不同字段，各自独立重渲染
  const items = useCartStore(s => s.items);
  const addItem = useCartStore(s => s.addItem);
  const removeItem = useCartStore(s => s.removeItem);
  const updateQuantity = useCartStore(s => s.updateQuantity);
  const clearCart = useCartStore(s => s.clearCart);

  // 派生数据：用 get() 而非选择器，避免 items 变化时双重渲染
  const totalCount = useCartStore(s =>
    s.items.reduce((sum, i) => sum + i.quantity, 0)
  );
  const totalPrice = useCartStore(s =>
    s.items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)
  );

  if (items.length === 0) {
    return <p>购物车是空的</p>;
  }

  return (
    <div>
      <h2>购物车 ({totalCount} 件)</h2>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            {item.name} - ¥{item.price} × {item.quantity}
            <button onClick={() => updateQuantity(item.id, 1)}>+</button>
            <button onClick={() => updateQuantity(item.id, -1)}>-</button>
            <button onClick={() => removeItem(item.id)}>删除</button>
          </li>
        ))}
      </ul>
      <p>总计：¥{totalPrice}</p>
      <button onClick={clearCart}>清空购物车</button>
    </div>
  );
}
```

刷新页面后购物车数据不丢失（localStorage 自动 hydrate）。

---

### 8. 多 Store 组合与切片模式

Zustand 不强制你只有一个 store。推荐模式：

```js
// stores/useAuthStore.js
export const useAuthStore = create((set) => ({
  user: null,
  login: (u) => set({ user: u }),
  logout: () => set({ user: null }),
}));

// stores/useCartStore.js（同上）

// 组件中自由组合
function Header() {
  const user = useAuthStore(s => s.user);
  const totalCount = useCartStore(s => s.items.length);
  // ...
}
```

**切片模式**（当你想逻辑内聚但物理分离时）：

```js
// stores/createFishSlice.js
export const createFishSlice = (set) => ({
  fishes: 0,
  addFish: () => set((s) => ({ fishes: s.fishes + 1 })),
});

// stores/createBearSlice.js
export const createBearSlice = (set) => ({
  bears: 0,
  addBear: () => set((s) => ({ bears: s.bears + 1 })),
  eatFish: () => set((s) => ({ fishes: s.fishes - 1 })), // 可以跨切片访问
});

// stores/index.js —— 组合成一个 store
import { create } from 'zustand';
import { createFishSlice } from './createFishSlice';
import { createBearSlice } from './createBearSlice';

export const useBoundStore = create((...args) => ({
  ...createBearSlice(...args),
  ...createFishSlice(...args),
}));
```

切片模式适用于：同一个 store 有多个业务域、需要跨域读写，但你希望文件层面保持分离。

---

## 常见问题

**Q1：Zustand 和 Redux Toolkit 到底怎么选？**
A：小团队 / 新项目 / 快速原型选 Zustand（简单到无语）。大团队 / 已有 Redux 生态 / 需要 RTK Query 数据获取层选 Redux Toolkit。两者都很好，只是复杂度不同。

**Q2：不用 Provider，Zustand 怎么做到跨组件共享的？**
A：Zustand 的 store 本质是一个发布订阅模式。`create()` 返回的是一个 Hook，但底层 store 是单例——只要你 import 的是同一个模块，读到的就是同一个 store 实例。Provider 只是 React 生态的习惯，Zustand 证明了你不需要它。

**Q3：选择器返回新对象怎么办？**
A：用 `shallow` 比较。或者把选择器拆成多个原始值选择器：`useStore(s => s.count)` + `useStore(s => s.name)`。

**Q4：Zustand 能在 React 外用吗？**
A：能，这是它和 Context 最大的区别之一。`useCartStore.getState()` 在任何地方都能读，`useCartStore.setState()` 在任何地方都能写，完全脱离 React。

**Q5：persist 中间件持久化了不想要的数据怎么办？**
A：用 `partialize` 只选择需要持久化的字段。默认函数不会被持久化，但如果你有 `loading`、`error` 等非函数状态，需要显式排除。

**Q6：immer 中间件会影响性能吗？**
A：immer 的 Proxy 创建有一定开销，但在大多数场景下可忽略。如果你有超高频更新（如拖拽、游戏），避免 immer，手动展开。建议：先上 immer，真遇到性能瓶颈再撤。

**Q7：多个 store 之间怎么通信？**
A：在 action 里直接调用别的 store：`useOtherStore.getState().someMethod()`。或者用 subscribe 监听变化：`useOtherStore.subscribe((state, prev) => { ... })`。

**Q8：和 Jotai / Recoil 这类原子化状态库的区别？**
A：Zustand 是"集中式"（一个/几个大 store），Jotai/Recoil 是"原子式"（无数个小原子）。集中式更接近传统思维，适合团队协作；原子式粒度更细，优化到极致但心智模型不同。选你团队更认的那一种。

---

## 实操作业

### 基础练习：收藏夹

用 Zustand 实现一个收藏夹：
- 添加/移除收藏项（每个项包含 id、title、url）
- 显示收藏总数
- 用 persist 持久化到 localStorage
- 用 devtools 中间件，在 DevTools 中能看到每个 action

### 进阶练习：购物车重构

把下面的需求用 Zustand 重构（假设原项目用的是 useState + props 传递）：
- 商品列表页（含加入购物车按钮）
- 购物车弹窗（修改数量、删除、总价）
- 优惠券功能：满 100 减 10，满 200 减 30
- 用 immer 处理嵌套状态
- 拆分 auth store 和 cart store，cart 中需要根据 auth store 的 user 显示不同折扣

### 挑战练习：多 store 订阅 + 重渲染分析

用 React Profiler 分析上面的购物车渲染行为：
- 在不使用 shallow 时，哪些不必要的重渲染发生了？截图记录
- 加 shallow 后，是否消除了？
- 用 `useSyncExternalStoreWithSelector` 手动实现一个选择器对比 Zustand 的默认选择器
- 写出你的分析结论（300 字以内）

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：按 ID 去重收藏，persist 加版本/校验，action 给 devtools 名称。刷新恢复，坏数据回退，退出账号清用户范围收藏；LocalStorage 不保存秘密。
- **进阶**：金额用整数分，优惠按最大满足门槛取一个，数量范围校验；auth/cart 明确订阅。100/200 门槛、角色变化和注销后折扣即时正确。
- **挑战**：selector 返回稳定值或 shallow 比较，记录 unrelated update 是否触发消费者。手写 selector 仅是实验；相等比较不能隐藏实际变化或无限制造新快照。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“Zustand 实战指南”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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
| 核心理念 | 极简、Hook 原生、无 Provider |
| 选择器 | `useStore(s => s.field)` + `shallow` 防重渲染 |
| 三中间件 | persist（持久化）、devtools（调试）、immer（简化更新） |
| 异步 Action | `set` 直接放在 `async` 函数中，无特殊语法 |
| 多 Store | 物理文件分离，逻辑通过 `getState()` 互调 |
| 选型 | 中小项目首选 Zustand，大型团队已有 Redux 用 RTK |

<!-- course-nav:start -->
---

[上一篇：01 — 状态提升与 Context 注入](./01-状态提升与Context注入.md) · [课程地图](../../README.md) · [下一篇：03 — Pinia 实战指南](./03-Pinia实战指南.md)
<!-- course-nav:end -->
