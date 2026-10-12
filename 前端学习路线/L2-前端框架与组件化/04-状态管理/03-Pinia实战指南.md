# 03 — Pinia 实战指南

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[02 — Zustand 实战指南](./02-Zustand实战指南.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN Web Docs](https://developer.mozilla.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Pinia 的设计理念和相比 Vuex 的核心改进
- 掌握 Option Store 和 Setup Store 两种写法并知道何时选哪种
- 正确使用 storeToRefs() 解构保持响应性
- 能处理异步 Action 和请求状态管理
- 理解 Pinia DevTools 的调试能力
- 独立用 Pinia 实现带筛选、分页、购物车的商品管理

---

## 内容讲解

### 1. Pinia 的核心理念

Pinia 是 Vue 3 官方的状态管理库，它在设计上吸取了 Vuex 多年来的教训，彻底简化了 API。

**和 Vuex 的核心差异**：

| 维度 | Vuex 4 | Pinia |
|---|---|---|
| mutations | 有（必须通过 commit） | 无（action 可直接改 state） |
| modules | 嵌套、命名空间 | 扁平化多 store |
| TypeScript | 需要额外类型声明 | 原生完美支持 |
| 创建方式 | `createStore()` | `defineStore()` |
| DevTools | 支持 | 支持（且更好） |
| 包体积 | ~10KB | ~5KB |

**一句话总结**：Pinia = 去掉了 mutations 的 Vuex + 原生 TypeScript + 扁平化多 store。

---

### 2. Option Store vs Setup Store

Pinia 提供两种写法，功能完全等价，选你顺手的：

#### Option Store（类 Vuex 风格）

```js
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', {
  // state：用函数返回初始对象（和 Vue 组件的 data 一样）
  state: () => ({
    count: 0,
    name: 'My Counter',
  }),

  // getters：和 Vue computed 一样，接收 state 作为第一个参数
  getters: {
    doubleCount: (state) => state.count * 2,
    // getter 之间可以互相调用（用 this，但必须显式标注返回类型）
    doublePlusOne(): number {
      return this.doubleCount + 1;  // this 指向 store 实例
    },
  },

  // actions：方法集合，可以异步
  actions: {
    increment() {
      this.count++;  // 直接 this.xxx 读写
    },
    async fetchAndSet() {
      const res = await fetch('/api/count');
      this.count = await res.json();
    },
  },
});
```

#### Setup Store（类 Composition API 风格）

```js
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useCounterStore = defineStore('counter', () => {
  // state → ref / reactive
  const count = ref(0);
  const name = ref('My Counter');

  // getters → computed
  const doubleCount = computed(() => count.value * 2);

  // actions → 普通函数
  function increment() {
    count.value++;
  }

  async function fetchAndSet() {
    const res = await fetch('/api/count');
    count.value = await res.json();
  }

  // 返回你想暴露的一切
  return { count, name, doubleCount, increment, fetchAndSet };
});
```

**怎么选？**

- 从 Vuex 迁移过来 → Option Store（心智负担最小）
- 喜欢 Composition API → Setup Store（和组件写法统一）
- 需要复杂的状态组合/工厂模式 → Setup Store（更灵活，能复用 composables）
- 团队习惯 → 保持一致即可，两种可以并存

---

### 3. storeToRefs() 正确解构

这是新手最容易踩的坑。

```vue
<script setup>
import { useCounterStore } from './stores/counter';

const store = useCounterStore();

// ❌ 直接解构会失去响应性！
const { count, doubleCount } = store;    // count 变成普通数字，不再响应式
</script>
```

**正确姿势：`storeToRefs()`**

```vue
<script setup>
import { storeToRefs } from 'pinia';
import { useCounterStore } from './stores/counter';

const store = useCounterStore();

// ✅ storeToRefs 只提取 state 和 getters，保持响应性
const { count, doubleCount } = storeToRefs(store);

// ✅ actions 直接解构，它们本来就不是响应式的
const { increment, fetchAndSet } = store;
</script>
```

**原理**：`storeToRefs()` 内部对每个 state/getter 调用了 `toRef()`，生成 ref，所以你解构出来的仍然是响应式引用。action 是函数，不需要保持响应性，直接解构。

**一个经典错误**：

```js
const { count } = storeToRefs(store);
// 在 template 中：
// ✅ {{ count }}         —— 自动解包，正确
// ❌ {{ count.value }}   —— template 中不需要 .value，但写了也不报错
// 在 script 中：
// ✅ count.value         —— script 中必须 .value
// ❌ count               —— 得到的是 RefImpl 对象，不是数字
```

---

### 4. 异步 Action 与请求状态管理

Pinia 对异步没有特殊语法，actions 可以任意 async/await：

```js
export const useProductStore = defineStore('product', () => {
  const products = ref([]);
  const status = ref('idle');  // 'idle' | 'loading' | 'success' | 'error'
  const error = ref(null);

  async function fetchProducts(category) {
    if (status.value === 'loading') return;  // 防重复请求

    status.value = 'loading';
    error.value = null;

    try {
      const res = await fetch(`/api/products?category=${category}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      products.value = await res.json();
      status.value = 'success';
    } catch (e) {
      error.value = e.message;
      status.value = 'error';
    }
  }

  // 派生状态：一个 getter 搞定所有 UI 状态的判断
  const isLoading = computed(() => status.value === 'loading');
  const isError = computed(() => status.value === 'error');

  return { products, status, error, isLoading, isError, fetchProducts };
});
```

**组件中消费**：

```vue
<script setup>
import { storeToRefs } from 'pinia';
import { useProductStore } from './stores/product';

const store = useProductStore();
const { products, isLoading, isError, error } = storeToRefs(store);
const { fetchProducts } = store;

onMounted(() => fetchProducts('electronics'));
</script>

<template>
  <div v-if="isLoading">加载中...</div>
  <div v-else-if="isError" class="error">{{ error }}</div>
  <ul v-else>
    <li v-for="p in products" :key="p.id">{{ p.name }} - ¥{{ p.price }}</li>
  </ul>
</template>
```

---

### 5. Pinia DevTools 调试体验

Pinia 天然集成 Vue DevTools，提供以下能力：

1. **Timeline（时间线）**：每个 action 调用都会记录，包含 payload 和调用前后 state 的快照
2. **Store 查看**：实时看到所有 store 的 state、getters 值
3. **State 编辑**：在 DevTools 中直接修改 state，UI 实时响应
4. **Action 追踪**：可以看到 action 是从哪个组件触发的

**设置 devtools**：

```js
import { createPinia } from 'pinia';

const pinia = createPinia();
// Pinia 默认开启 devtools，生产环境自动禁用
// 无需额外配置
```

**在 store 中加自定义调试信息（Option Store）**：

```js
actions: {
  async fetchProducts() {
    const res = await fetch('/api/products');
    // 中间的_set_internal_state不会被 DevTools 记录为 action
    this.products = await res.json();
  }
}
```

Setup Store 里函数名不以 `$` 或 `_` 开头就会出现在 DevTools 中。

---

### 6. Pinia vs Vuex — 迁移指南速查

| 要做的事 | Vuex 写法 | Pinia 写法 |
|---|---|---|
| 定义 store | `createStore({ modules })` | `defineStore(id, options)` |
| 读写 state | `store.state.xxx` | `store.xxx` |
| 触发 mutation | `store.commit('TYPE', payload)` | 不存在了，直接在 action 里改 |
| 读取 getter | `store.getters.xxx` | `store.xxx` |
| 分发 action | `store.dispatch('type', payload)` | `store.type(payload)` |
| 解构 state | `mapState()` | `storeToRefs()` |
| TypeScript | `createStore<State>()` | 原生推导，无需手动类型 |

**迁移要点**：

- mutations 直接合并到 actions 里
- 不需要 `rootState`、`rootGetters`（多 store 扁平化，直接 import 其他 store）
- `mapState` / `mapGetters` 废弃，用 `storeToRefs`
- modules 的命名空间概念消失，每个 store 独立、通过 id 区分

---

### 7. 实战：商品管理完整状态

```js
// stores/product.js
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useProductStore = defineStore('product', () => {
  // ============ 列表状态 ============
  const products = ref([]);
  const loading = ref(false);
  const error = ref(null);

  // ============ 筛选状态 ============
  const category = ref('all');       // 'all' | 'electronics' | 'clothing' | 'food'
  const searchKeyword = ref('');
  const sortBy = ref('default');     // 'default' | 'price-asc' | 'price-desc' | 'name'

  // ============ 分页状态 ============
  const currentPage = ref(1);
  const pageSize = ref(10);
  const total = ref(0);

  // ============ 派生数据 ============
  const filteredProducts = computed(() => {
    let result = [...products.value];

    // 1. 分类筛选
    if (category.value !== 'all') {
      result = result.filter(p => p.category === category.value);
    }

    // 2. 关键词搜索
    if (searchKeyword.value) {
      const kw = searchKeyword.value.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(kw));
    }

    // 3. 排序
    if (sortBy.value === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy.value === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy.value === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    total.value = result.length;
    return result;
  });

  // 当前页数据
  const pageProducts = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredProducts.value.slice(start, start + pageSize.value);
  });

  const totalPages = computed(() => Math.ceil(total.value / pageSize.value));

  // ============ 购物车状态 ============
  const cart = ref([]);  // [{ id, name, price, quantity }]

  const cartTotalCount = computed(() =>
    cart.value.reduce((sum, item) => sum + item.quantity, 0)
  );

  const cartTotalPrice = computed(() =>
    cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  // ============ Actions ============
  async function fetchProducts() {
    loading.value = true;
    error.value = null;
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      products.value = await res.json();
      currentPage.value = 1;  // 重新拉数据时重置页码
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  function setCategory(cat) {
    category.value = cat;
    currentPage.value = 1;   // 切换分类时回到第 1 页
  }

  function setSearch(kw) {
    searchKeyword.value = kw;
    currentPage.value = 1;   // 搜索时回到第 1 页
  }

  function setSort(sort) {
    sortBy.value = sort;
  }

  function goToPage(page) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  }

  function addToCart(product) {
    const existing = cart.value.find(i => i.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      cart.value.push({ ...product, quantity: 1 });
    }
  }

  function removeFromCart(productId) {
    cart.value = cart.value.filter(i => i.id !== productId);
  }

  function updateCartQuantity(productId, delta) {
    const item = cart.value.find(i => i.id === productId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      removeFromCart(productId);
    }
  }

  function clearCart() {
    cart.value = [];
  }

  return {
    // 状态
    products, loading, error,
    category, searchKeyword, sortBy,
    currentPage, pageSize, total,
    cart,
    // getters
    filteredProducts, pageProducts, totalPages,
    cartTotalCount, cartTotalPrice,
    // actions
    fetchProducts, setCategory, setSearch, setSort, goToPage,
    addToCart, removeFromCart, updateCartQuantity, clearCart,
  };
});
```

```vue
<!-- ProductList.vue —— 消费端 -->
<script setup>
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useProductStore } from './stores/product';

const store = useProductStore();

// 响应式状态：用 storeToRefs
const {
  pageProducts, loading, error,
  category, sortBy, currentPage, totalPages,
  cartTotalCount,
} = storeToRefs(store);

// 方法：直接解构
const {
  fetchProducts, setCategory, setSort, goToPage,
  addToCart,
} = store;

onMounted(() => fetchProducts());
</script>

<template>
  <div>
    <!-- 筛选栏 -->
    <div class="filters">
      <select :value="category" @change="setCategory(($event.target).value)">
        <option value="all">全部</option>
        <option value="electronics">电子产品</option>
        <option value="clothing">服装</option>
        <option value="food">食品</option>
      </select>
      <select :value="sortBy" @change="setSort(($event.target).value)">
        <option value="default">默认排序</option>
        <option value="price-asc">价格从低到高</option>
        <option value="price-desc">价格从高到低</option>
        <option value="name">名称 A-Z</option>
      </select>
      <span>购物车: {{ cartTotalCount }} 件</span>
    </div>

    <!-- 商品列表 -->
    <div v-if="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <ul v-else>
      <li v-for="p in pageProducts" :key="p.id">
        <strong>{{ p.name }}</strong>
        <span>¥{{ p.price }}</span>
        <button @click="addToCart(p)">加入购物车</button>
      </li>
    </ul>

    <!-- 分页 -->
    <div class="pagination">
      <button :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">上一页</button>
      <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">下一页</button>
    </div>
  </div>
</template>
```

---

## 常见问题

**Q1：Pinia 的 store 什么时候销毁？**
A：Pinia store 默认在创建后一直存在（单例）。页面卸载不会销毁 store。如果你需要页面级别的 store（离开路由就销毁），可以配合路由守卫手动 `$reset()` 或 `$dispose()`。

**Q2：action 里怎么访问另一个 store？**
A：直接 import 并使用：`const otherStore = useOtherStore(); otherStore.someMethod();`。因为 Pinia 的 store 是单例、扁平化的，相互引用没有循环问题（Pinia 内部处理了）。

**Q3：$reset() 是什么？**
A：Pinia 为每个 store 自动注入 `$reset()` 方法，可以把所有 state 恢复到初始值。注意：它只对 Option Store 生效；Setup Store 需要自己实现 `$reset()` 或手动重置每个 ref。

**Q4：Option Store 中 getter 用 this 有什么陷阱？**
A：`this` 在 getter 中指向 store 实例，你可以访问其他 getter、state、甚至其他 store。但使用 `this` 后 TypeScript 无法自动推导返回类型，必须显式标注。

**Q5：storeToRefs 和 toRefs 有什么区别？**
A：`storeToRefs` 只提取 state 和 getters，跳过 actions 和 Pinia 内建的 `$` 前缀方法。`toRefs` 会把所有属性（包括 actions）都转成 ref——actions 变成 Ref<Function>，会导致 template 调用出错。

**Q6：可以在组件外使用 Pinia 吗？**
A：可以，但必须在 `app.use(pinia)` 之后。在 setup 外（如 router 守卫），确保 Pinia 实例已经创建并传入：`useStore(piniaInstance)`。

**Q7：Pinia 支持订阅（subscribe）吗？**
A：支持。`store.$subscribe((mutation, state) => {...})` 可以监听 state 变化；`store.$onAction(({ name, store, args, after, onError }) => {...})` 可以监听 action 调用。适合做日志、持久化、中间件等。

**Q8：我有多个 store，怎么组织？**
A：推荐按业务域拆分（user、product、cart、order），每个 store 一个文件，放在 `src/stores/` 下。store 之间通过 `defineStore` 的 id 互不冲突，顶层 flat 结构比嵌套 modules 更清晰。

---

## 实操作业

### 基础练习：待办事项

用 Pinia 实现待办事项：
- 添加/删除/切换完成状态
- 三种筛选：全部、未完成、已完成
- 显示未完成数量
- 用 localStorage 持久化（提示：watch + JSON.parse/stringify 或 Pinia 插件）

### 进阶练习：电商后台

在以上商品管理的基础上扩展：
- 新建/编辑商品（弹窗表单，字段：名称、价格、分类、库存）
- 删除商品（二次确认）
- 批量操作（全选、批量删除、批量改分类）
- 数据异常时的错误提示和重试按钮
- 用 Pinia 的 `$subscribe` 实现在控制台记录每次状态变更

### 挑战练习：Pinia 插件

写一个 Pinia 插件，实现以下功能：
- 每个 store 创建时自动注入一个 `lastUpdated` 的 ref，记录最后一次修改时间
- 提供一个全局的撤销/重做功能（undo/redo），支持最多 10 步撤销
- 在 DevTools 中能看到 undo/redo 的 action

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“Pinia 实战指南”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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
| 两种写法 | Option Store 类 Vuex、Setup Store 类 Composition API |
| 解构 | `storeToRefs()` 解 state/getter，action 直接解构 |
| 异步 | action 里写 async/await，配合 status 字段管理请求状态 |
| DevTools | Timeline 记录每个 action，支持 state 热编辑 |
| vs Vuex | 去掉 mutations，扁平化 modules，原生 TS |
| 多 Store | 按业务域拆文件，直接 import 互调 |

<!-- course-nav:start -->
---

[上一篇：02 — Zustand 实战指南](./02-Zustand实战指南.md) · [课程地图](../../README.md) · [下一篇：04 — 服务端状态与 TanStack Query](./04-服务端状态与TanStack-Query.md)
<!-- course-nav:end -->
