# 04 — 服务端状态与 TanStack Query

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[03 — Pinia 实战指南](./03-Pinia实战指南.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN Web Docs](https://developer.mozilla.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 分清客户端状态和服务端状态的根本区别
- 理解 TanStack Query 的缓存策略：staleTime、gcTime、自动后台刷新
- 掌握 useQuery、useMutation 的核心用法
- 能实现乐观更新（Optimistic Update）和失效回滚
- 学会设计可维护的查询键（Query Key）
- 能用 useInfiniteQuery 实现分页和无限滚动
- 能用 React Query 和 Vue Query 各实现一遍

---

## 内容讲解

### 1. 客户端状态 vs 服务端状态

这是理解现代状态管理最关键的一步。先看一个典型组件的状态：

```jsx
function ProductList() {
  const [products, setProducts] = useState([]);      // ← 来自服务端
  const [loading, setLoading] = useState(false);     // ← 来自服务端
  const [error, setError] = useState(null);          // ← 来自服务端
  const [page, setPage] = useState(1);               // ← 来自服务端
  const [sortBy, setSortBy] = useState('default');   // ← 客户端 UI 状态
  const [isModalOpen, setIsModalOpen] = useState(false); // ← 客户端 UI 状态
  // + useEffect 发起请求
  // + 手动处理 loading、错误、缓存、竞态...

  return (/* ... */);
}
```

注意到没？上面 7 个 state 中，前 4 个其实不是你自己的数据——它们是**服务端数据的一个快照**。你真正拥有的只有 `sortBy` 和 `isModalOpen`。

**核心定义**：

| | 客户端状态 | 服务端状态 |
|---|---|---|
| 数据的真实来源 | 浏览器内存 | 远端服务器 |
| 谁拥有 | 你（前端） | 服务端 |
| 典型例子 | 表单输入、UI 开关、主题 | 商品列表、用户信息、订单 |
| 更新方式 | `setState` | 网络请求 |
| 缓存策略 | 不需要 | 必须（减少请求、提升体验） |

**问题来了**：你用 useState + useEffect 管理服务端状态，等于在手写一个缓存层——手写竞态处理、手写 loading/error、手写重复请求去重、手写缓存失效。这些 TanStack Query 全帮你做了。

---

### 2. TanStack Query 的核心理念

```
"服务端状态是一份缓存的快照，不是你的本地状态。"
```

TanStack Query（原名 React Query）接管了所有与服务端数据相关的"脏活"：

- ✅ **自动缓存**：相同 queryKey 的请求只发一次
- ✅ **后台刷新**：数据过期自动重新拉取
- ✅ **请求去重**：多个组件同时请求同一数据，只发一个网络请求
- ✅ **竞态处理**：重新请求时自动忽略旧请求的响应
- ✅ **窗口焦点刷新**：切回浏览器标签时自动刷新
- ✅ **重试与错误重试**：请求失败按指数退避重试
- ✅ **乐观更新**：先更新 UI，失败再回滚
- ✅ **分页/无限滚动**：内置 useInfiniteQuery

**架构示意**：

```
组件 → useQuery/useMutation → QueryClient（缓存层） → fetch / axios → 服务端
```

你的组件不再持有真实的服务端数据，而是持有**缓存的一份引用**。你只需要告诉 Query："我需要这个 key 对应的数据，过期时间是 30 秒"，它会自动帮你管理一切。

---

### 3. useQuery 基础与缓存策略

```jsx
import { useQuery } from '@tanstack/react-query';

function ProductList() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['products', { category: 'electronics' }],  // 唯一标识
    queryFn: () => fetch('/api/products?category=electronics').then(r => r.json()),
    staleTime: 30 * 1000,   // 数据 30 秒内视为"新鲜"，不会重新请求
    gcTime: 5 * 60 * 1000,  // 缓存未被使用时，5 分钟后被垃圾回收
  });

  if (isLoading) return <div>加载中...</div>;
  if (isError) return <div>出错了：{error.message}</div>;

  return (
    <ul>
      {data.map(p => <li key={p.id}>{p.name}</li>)}
    </ul>
  );
}
```

**两个关键时间参数**：

| 参数 | 含义 | 默认值 | 推荐值 |
|---|---|---|---|
| `staleTime` | 数据"新鲜"多久。新鲜期内不发请求 | 0（立即过期） | 列表 30s，详情 5min，静态数据 Infinity |
| `gcTime` | 缓存闲置多久后被垃圾回收 | 5 min | 一般默认即可 |

**理解 staleTime 的决策表**：

| 数据特点 | staleTime | 原因 |
|---|---|---|
| 实时数据（股票、聊天） | 0 | 每次都要最新的 |
| 普通列表 | 30s - 2min | 没必要每毫秒刷新 |
| 详情页 | 5min | 详情变化不频繁 |
| 静态数据（配置、字典） | Infinity | 永远不会变 |

**useQuery 返回的关键字段**：

```js
const {
  data,           // 成功的响应数据（初始为 undefined）
  isLoading,      // 第一次加载中（没有缓存数据）
  isFetching,     // 正在请求中（包括后台刷新）
  isError,        // 请求出错
  error,          // 错误对象
  isSuccess,      // 请求成功
  refetch,        // 手动重新请求
  isStale,        // 数据是否已过期
} = useQuery({ queryKey, queryFn });
```

**一个常见的 UI 状态区分**：

```jsx
// isLoading 和 isFetching 的区别非常重要
if (isLoading) return <Spinner />;              // 首次加载：全屏 loading
if (isFetching) return <div>后台刷新中...</div>; // 有缓存的后台刷新：轻量提示
if (isError) return <ErrorBox error={error} />;
return <ProductGrid data={data} />;
```

---

### 4. useMutation 与乐观更新

Mutation 用于创建、更新、删除——改变服务端数据的操作：

```jsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

function AddProductForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newProduct) =>
      fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      }).then(r => r.json()),

    // 成功后自动失效缓存，触发列表重新拉取
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutation.mutate({ name: '新品', price: 99 });
    }}>
      <button disabled={mutation.isPending}>
        {mutation.isPending ? '提交中...' : '添加商品'}
      </button>
      {mutation.isError && <p>错误：{mutation.error.message}</p>}
    </form>
  );
}
```

**乐观更新（Optimistic Update）**：先更新 UI，请求失败再回滚——让用户感觉操作是"瞬间完成"的。

```jsx
const mutation = useMutation({
  mutationFn: (productId) => fetch(`/api/products/${productId}`, { method: 'DELETE' }),

  // 1. 请求发出前，乐观地从缓存中移除
  onMutate: async (productId) => {
    // 取消正在进行的列表请求，防止它们覆盖我们的乐观更新
    await queryClient.cancelQueries({ queryKey: ['products'] });

    // 保存旧数据用于回滚
    const previousProducts = queryClient.getQueryData(['products']);

    // 乐观地更新缓存：移除该商品
    queryClient.setQueryData(['products'], (old) =>
      old.filter(p => p.id !== productId)
    );

    // 返回快照上下文，onError 中用于回滚
    return { previousProducts };
  },

  // 2. 请求失败：用快照回滚
  onError: (_err, _productId, context) => {
    queryClient.setQueryData(['products'], context.previousProducts);
  },

  // 3. 无论成功失败，最后都重新拉取以保持与服务端一致
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  },
});
```

**乐观更新的三个步骤**：

```
onMutate：取消旧请求 → 保存快照 → 立即改缓存 → 返回 context
  ↓
mutationFn 执行（网络请求）
  ↓
成功 → onSuccess（可选收尾）→ 自动刷新 in onSettled
失败 → onError：用 context 回滚缓存
```

---

### 5. 查询键（Query Key）设计模式

Query Key 就像缓存的"key"，设计好了事半功倍。

**基本原则**：从通用到具体，数组元素越多越精确。

```js
// ❌ 随意的字符串
useQuery({ queryKey: ['products'], ... })

// ✅ 结构化：['资源类型', '范围', { 参数 }]
useQuery({ queryKey: ['products', 'list', { category, page, sortBy }] })

// ✅ 层级化失效：失效 ['products'] 会使所有以 products 开头的 key 都失效
queryClient.invalidateQueries({ queryKey: ['products'] });               // 失效所有商品缓存
queryClient.invalidateQueries({ queryKey: ['products', 'list'] });       // 只失效列表
queryClient.invalidateQueries({ queryKey: ['products', 'detail', id] }); // 只失效某个详情
```

**推荐的结构模式**：

| 场景 | Query Key 设计 | 失效范围 |
|---|---|---|
| 列表 | `['products', 'list', { category, page }]` | `['products']` 全失效 |
| 详情 | `['products', 'detail', productId]` | `['products']` 全失效 |
| 用户 | `['users', 'me']` | `['users']` 全失效 |
| 订单 | `['orders', { status, page }]` | `['orders']` 全失效 |

**一个实践技巧**：把 queryKey 工厂函数抽出来：

```js
// api/queryKeys.js
export const productKeys = {
  all:    ['products'],
  lists:  () => [...productKeys.all, 'list'],
  list:   (filters) => [...productKeys.lists(), filters],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), id],
};

// 使用
useQuery({ queryKey: productKeys.list({ category: 'elec', page: 1 }), ... });
queryClient.invalidateQueries({ queryKey: productKeys.lists() }); // 只失效所有列表
```

---

### 6. 分页与无限滚动

#### 6.1 useInfiniteQuery — 无限滚动 / "加载更多"

```jsx
import { useInfiniteQuery } from '@tanstack/react-query';

function InfiniteProductList() {
  const {
    data,
    fetchNextPage,        // 加载下一页
    hasNextPage,          // 是否还有下一页
    isFetchingNextPage,   // 下一页是否正在加载
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['products', 'infinite'],
    queryFn: ({ pageParam = 1 }) =>
      fetch(`/api/products?page=${pageParam}&size=20`).then(r => r.json()),

    // 从最后一条数据中提取下一页的 pageParam
    getNextPageParam: (lastPage) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1;  // 返回下一页的 pageParam
      }
      return undefined;  // 没有更多了
    },

    // 初始值
    initialPageParam: 1,
  });

  if (isLoading) return <div>加载中...</div>;

  return (
    <div>
      {/* data.pages 是二维数组：[[第1页], [第2页], ...] */}
      {data.pages.map((page, i) => (
        <div key={i}>
          {page.items.map(product => (
            <div key={product.id}>{product.name}</div>
          ))}
        </div>
      ))}

      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? '加载中...' : hasNextPage ? '加载更多' : '没有更多了'}
      </button>
    </div>
  );
}
```

#### 6.2 传统分页 — 保持 useQuery + keepPreviousData

```jsx
function PaginatedList() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['products', 'paginated', page],
    queryFn: () => fetch(`/api/products?page=${page}`).then(r => r.json()),
    placeholderData: keepPreviousData,  // 翻页时保留旧数据，避免闪烁
  });

  return (
    <>
      <ul>
        {data?.items.map(p => <li key={p.id}>{p.name}</li>)}
      </ul>

      {/* 翻页时列表不闪烁，因为 placeholderData 保留了旧数据 */}
      <button onClick={() => setPage(p => p - 1)} disabled={page === 1}>上一页</button>
      <span>第 {page} 页</span>
      <button onClick={() => setPage(p => p + 1)}>下一页</button>
    </>
  );
}
```

`placeholderData: keepPreviousData` 是分页体验的关键——切换页面时，它先展示旧页数据，等新数据到了再替换，不会出现"列表闪烁变空白"的情况。

---

### 7. Vue Query（@tanstack/vue-query）

API 几乎一模一样，只是把 Hook 换成 composable，把 JSX 换成 template：

```vue
<script setup>
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';

const queryClient = useQueryClient();

// 列表查询
const { data, isLoading, isError, error } = useQuery({
  queryKey: ['products'],
  queryFn: () => fetch('/api/products').then(r => r.json()),
  staleTime: 30 * 1000,
});

// 创建 mutation
const mutation = useMutation({
  mutationFn: (newProduct) =>
    fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct),
    }).then(r => r.json()),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  },
});

function handleAdd(name, price) {
  mutation.mutate({ name, price });
}
</script>

<template>
  <div v-if="isLoading">加载中...</div>
  <div v-else-if="isError">出错了: {{ error?.message }}</div>
  <ul v-else>
    <li v-for="p in data" :key="p.id">{{ p.name }} - ¥{{ p.price }}</li>
  </ul>
</template>
```

**React Query vs Vue Query 差异**：

| 维度 | React Query | Vue Query |
|---|---|---|
| 响应式 | 基于 Hook + 选择器 | 基于 Vue 响应式，QueryKey 自动追踪 ref |
| staleTime | 毫秒数 | 毫秒数（ComputedRef 也支持） |
| 查询启用 | `enabled: boolean` | `enabled: boolean \| ComputedRef<boolean>` |
| 插件 | `QueryClientProvider` | `VueQueryPlugin` |

**Vue Query 特有的 QueryKey 响应式追踪**：

```js
// Vue 中如果 queryKey 用到了 ref，它会自动追踪并重新查询
const category = ref('all');

const { data } = useQuery({
  queryKey: ['products', category],  // category 变了自动重新查
  queryFn: () => fetch(`/api/products?category=${category.value}`).then(r => r.json()),
});
// category.value = 'electronics' → queryFn 自动重新执行！
```

---

### 8. 实战：用 TanStack Query 重构 API 层（React）

```jsx
// api/products.js —— API 函数集中管理
const BASE = '/api/products';

export const fetchProducts = (filters = {}) => {
  const params = new URLSearchParams(filters).toString();
  return fetch(`${BASE}?${params}`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
};

export const fetchProduct = (id) =>
  fetch(`${BASE}/${id}`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export const createProduct = (data) =>
  fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export const updateProduct = ({ id, ...data }) =>
  fetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

export const deleteProduct = (id) =>
  fetch(`${BASE}/${id}`, { method: 'DELETE' }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  });
```

```jsx
// hooks/useProducts.js —— Query Hooks 封装
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/products';

// 查询键工厂
export const productKeys = {
  all:    ['products'],
  lists:  () => [...productKeys.all, 'list'],
  list:   (filters) => [...productKeys.lists(), filters],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), id],
};

// ---- 列表 ----
export function useProducts(filters) {
  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: () => api.fetchProducts(filters),
    staleTime: 30 * 1000,
  });
}

// ---- 详情 ----
export function useProduct(id) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => api.fetchProduct(id),
    enabled: !!id,  // id 为 null/undefined 时不查询
    staleTime: 5 * 60 * 1000,
  });
}

// ---- 创建 ----
export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

// ---- 更新（乐观更新） ----
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateProduct,
    onMutate: async (updatedProduct) => {
      await queryClient.cancelQueries({ queryKey: productKeys.detail(updatedProduct.id) });
      const previous = queryClient.getQueryData(productKeys.detail(updatedProduct.id));
      queryClient.setQueryData(productKeys.detail(updatedProduct.id), (old) => ({
        ...old,
        ...updatedProduct,
      }));
      return { previous };
    },
    onError: (_err, updatedProduct, context) => {
      queryClient.setQueryData(productKeys.detail(updatedProduct.id), context.previous);
    },
    onSettled: (_, __, updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: productKeys.detail(updatedProduct.id) });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}

// ---- 删除 ----
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteProduct,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: productKeys.lists() });
      const previous = queryClient.getQueryData(productKeys.lists());
      queryClient.setQueryData(productKeys.lists(), (old) =>
        old?.filter(p => p.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(productKeys.lists(), context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
  });
}
```

```jsx
// pages/ProductListPage.jsx —— 消费端干净到令人发指
function ProductListPage() {
  const [category, setCategory] = useState('all');
  const { data: products, isLoading, isError } = useProducts({ category });
  const createProduct = useCreateProduct();
  const deleteProduct = useDeleteProduct();

  if (isLoading) return <div>加载中...</div>;
  if (isError) return <div>加载失败</div>;

  return (
    <div>
      <button onClick={() => createProduct.mutate({ name: '新品', price: 99 })}>
        添加商品
      </button>
      <ul>
        {products?.map(p => (
          <li key={p.id}>
            {p.name}
            <button onClick={() => deleteProduct.mutate(p.id)}>删除</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**对比之前手写版**：loading、error、缓存、竞态、重试——全部不见了。你的组件从"状态管理 + 副作用 + UI"瘦身到只剩"声明数据依赖 + UI"。

---

### 9. 实战：Vue Query 等价实现

```js
// composables/useProducts.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { ref, computed, unref } from 'vue';
import * as api from '../api/products';

// 查询键工厂 —— 同 React 版
export const productKeys = {
  all:    ['products'],
  lists:  () => [...productKeys.all, 'list'],
  list:   (filters) => [...productKeys.lists(), computed(() => unref(filters))],
  details: () => [...productKeys.all, 'detail'],
  detail: (id) => [...productKeys.details(), computed(() => unref(id))],
};

export function useProducts(filtersRef) {
  return useQuery({
    queryKey: productKeys.list(filtersRef),  // filtersRef 变化自动重新查
    queryFn: () => api.fetchProducts(unref(filtersRef)),
    staleTime: 30 * 1000,
  });
}

export function useProduct(idRef) {
  return useQuery({
    queryKey: productKeys.detail(idRef),
    queryFn: () => api.fetchProduct(unref(idRef)),
    enabled: computed(() => !!unref(idRef)),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.lists() }),
  });
}
```

```vue
<!-- ProductList.vue -->
<script setup>
import { ref } from 'vue';
import { useProducts, useCreateProduct, useDeleteProduct } from '../composables/useProducts';

const category = ref('all');
const { data: products, isLoading, isError } = useProducts(category);
const createProduct = useCreateProduct();
const deleteProduct = useDeleteProduct();
</script>

<template>
  <div>
    <button @click="createProduct.mutate({ name: '新品', price: 99 })" :disabled="createProduct.isPending.value">
      {{ createProduct.isPending.value ? '提交中...' : '添加商品' }}
    </button>
    <!-- 注意 Vue Query 中 mutation 的 .isPending 是 ComputedRef，需要 .value -->
    <div v-if="isLoading">加载中...</div>
    <div v-else-if="isError">加载失败</div>
    <ul v-else>
      <li v-for="p in products" :key="p.id">
        {{ p.name }}
        <button @click="deleteProduct.mutate(p.id)">删除</button>
      </li>
    </ul>
  </div>
</template>
```

---

## 常见问题

**Q1：什么时候该用 TanStack Query，什么时候该用 Zustand/Pinia？**
A：服务端数据（需要网络请求获取的）→ TanStack Query；客户端 UI 状态（表单、弹窗开关、主题）→ Zustand/Pinia/Context。TanStack Query + Zustand 是 React 项目的经典组合。

**Q2：staleTime 和 gcTime 怎么配？**
A：staleTime 决定"多久重新请求"，gcTime 决定"缓存闲置多久后被清理"。staleTime 设置为数据可能变化的频率（列表 30s，详情 5min）；gcTime 一般不用改，默认 5min 足够。

**Q3：多个组件同时请求同一数据，会发多个请求吗？**
A：不会。TanStack Query 内部会去重——相同的 queryKey，只要第一个请求还在进行中，后续组件会直接等待同一个 Promise。请求完成后，所有组件同时收到数据。

**Q4：乐观更新失败了怎么办？**
A：在 onMutate 中保存旧数据快照，在 onError 中用 `queryClient.setQueryData(key, context.previous)` 回滚缓存，同时在 onSettled 中 `invalidateQueries` 以确保最终与服务端一致。上面的代码示例已经是完整的三步。

**Q5：查询键里放对象会不会导致无限重新请求？**
A：不会仅因为对象引用变化就重新请求。TanStack Query 会对可序列化的 queryKey 做确定性哈希，因此 `['products', { category: 'elec' }]` 在对象值相同时会得到相同键，对象属性顺序也不影响结果；数组项的顺序则会影响。避免把函数、DOM 节点等不可稳定序列化的值放进查询键，并把所有会改变查询结果的参数都纳入键。

**Q6：useInfiniteQuery 和传统分页怎么选？**
A：移动端 / 社交媒体式"下拉加载更多"→ useInfiniteQuery；后台管理系统式"页码 + 上一页/下一页" → useQuery + placeholderData: keepPreviousData。前者适合探索式浏览，后者适合精确定位。

**Q7：Vue Query 和 React Query 的 API 有差异吗？**
A：两者共享 query、mutation、缓存失效等核心概念，但框架适配层的包名、响应式类型、选项签名和版本迁移细节并非完全一致。Vue Query 的 queryKey 可包含 `ref`/`computedRef` 并自动追踪，返回状态通常是 Ref/ComputedRef；template 中会自动解包，script 中需要 `.value`。跨框架迁移时要核对对应版本文档和类型定义。

**Q8：已经用了 Redux，还需要 TanStack Query 吗？**
A：不一定。如果已经使用 RTK Query，通常不必再引入另一套服务端缓存。普通 Redux 也能管理请求状态，但需要自行设计缓存、去重、失效和重试；当这些成本变高时，再评估 TanStack Query 或迁移到 RTK Query，避免在同一数据域并存两套缓存。

---

## 实操作业

### 基础练习：博客文章列表

用 TanStack Query 实现一个博客系统：
- 文章列表（useQuery，staleTime 1min）
- 文章详情（useQuery，staleTime 5min）
- 创建文章（useMutation，成功后自动刷新列表）
- 删除文章（乐观更新）
- 抽离 queryKey 工厂函数

### 进阶练习：无限滚动 + 搜索

在基础练习上扩展：
- 文章列表改为无限滚动（useInfiniteQuery）
- 顶部的搜索框输入关键词 500ms 后自动触发查询（debounce 后的 queryKey 变化）
- 搜索时重置滚动位置、清空已有数据
- 网络错误时显示"重试"按钮

### 挑战练习：两框架对比

用 React Query 和 Vue Query 各实现一遍进阶练习的完整功能，写一份 300 字以内的对比总结，重点回答：
- 哪个框架写起来更顺手？为什么？
- 乐观更新的写法有什么不同？
- Vue Query 的 ComputedRef 对 queryKey 的自动追踪是加分还是困惑来源？

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：queryKey 工厂区分列表参数和详情 ID，mutation 成功 invalidate；乐观删除先取消查询并保存快照。失败恢复正确项，不能用一份旧列表覆盖其他并发成功。
- **进阶**：queryKey 包含 debounce 后关键词，getNextPageParam 依据服务端 cursor。切关键词清相应列表位置，末页停止，断网重试不重复条目。
- **挑战**：两框架共用 API/key 工厂和同样失败用例；Vue Query 的响应式 key 与 React 重新渲染传 key 分开解释。乐观对账契约应一致，不以框架差异忽略并发。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“服务端状态与 TanStack Query”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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
| 核心认知 | 服务端数据是缓存快照，不是你的本地状态 |
| useQuery | queryKey 标识 + queryFn 获取 + staleTime 控制新鲜度 |
| useMutation | 创建/更新/删除，配合 onMutate/onError/onSettled 做乐观更新 |
| Query Key | 从通用到具体：`['资源', '范围', 参数]`，层级化失效 |
| 分页 | useInfiniteQuery（无限滚动）或 useQuery + keepPreviousData（传统分页） |
| React vs Vue | API 一致，Vue 版 queryKey 支持 ComputedRef 自动追踪 |
| 架构建议 | TanStack Query（服务端） + Zustand/Pinia（客户端）= 黄金组合 |

<!-- course-nav:start -->
---

[上一篇：03 — Pinia 实战指南](./03-Pinia实战指南.md) · [课程地图](../../README.md) · [下一篇：01 — React Router 数据加载与嵌套路由](../05-路由与导航/01-React-Router-数据加载与嵌套路由.md)
<!-- course-nav:end -->
