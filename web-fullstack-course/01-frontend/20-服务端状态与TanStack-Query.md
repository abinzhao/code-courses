# 20-服务端状态与 TanStack Query

## 目标

完成本知识单元后，学员应能区分服务端状态与客户端状态，并使用 TanStack Query 当前稳定版本完成查询、变更、缓存与并发处理。

学员应能够：

1. 说明服务端状态的特征，解释为什么不应用普通客户端 store 手写远程数据缓存。
2. 接入 `QueryClient` 与 `QueryClientProvider`，使用 DevTools 观察缓存。
3. 使用 `useQuery` 设计层级化 queryKey，正确配置 `staleTime`、`gcTime`、`retry`。
4. 完整处理 pending、error、empty 三态，错误信息面向用户并提供重试。
5. 使用 `useMutation` 变更数据并通过 `invalidateQueries` 刷新相关缓存。
6. 实现乐观更新、预取、请求取消与竞态处理，并使用分页与无限查询的基础能力。

本单元需要一个返回 JSON 的接口作为练习对象，可使用课程提供的 Mock 服务或 Mock 工具，但代码示例均按真实接口契约书写。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| React 19 | 界面基础 | 能在组件中组合查询与变更 |
| TanStack Query 当前稳定主版本 | 服务端状态管理 | 掌握 useQuery、useMutation、缓存与失效 |
| TanStack Query DevTools | 观察缓存状态 | 能查看数据新鲜度与查询键 |
| TypeScript | 类型检查 | 能为接口数据、queryKey、mutation 入参标注类型 |
| Fetch API | 发起请求 | 能配合 signal 支持取消 |
| Vite | 开发与构建 | 能运行项目并通过构建 |
| Node.js 当前 LTS 与 npm | 运行工具链 | 能安装依赖与执行脚本 |

安装命令：

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

说明：

- 课程使用当前稳定主版本的 API 形态；不写死小版本号。
- 示例使用 Fetch API，团队统一使用 Axios 时查询函数内部替换即可，TanStack Query 的配置与缓存能力不变。
- 接口 Base URL 通过环境变量注入，代码中不出现真实主机地址与密钥。

## 详细的理论知识讲解和示例伪代码

### 1. 服务端状态与客户端状态

#### 1.1 定义

客户端状态是完全由当前页面控制、同步存在于浏览器内存中的状态，例如弹窗开关、输入草稿、当前 Tab。服务端状态是数据的“远程副本”：真实数据保存在服务器，前端拿到的只是某一时刻的快照。

服务端状态有四个鲜明特征：

1. 异步获取，存在等待与失败。
2. 可能被其他用户、其他客户端、定时任务修改，本地副本随时可能过期。
3. 需要缓存，多个组件使用同一数据时不应重复请求。
4. 涉及分页、详情等大量相同结构的数据，存在更新后失效问题。

#### 1.2 与 Web 的关系

如果用普通 state 或全局 store 管理远程数据，每个团队都会重复手写：loading 标志、错误对象、缓存命中、过期重取、重复请求去重、变更后刷新。这些正是 TanStack Query 内建的能力。

```tsx
// 手写思路概念：每个使用数据的组件都要维护这一套
type ManualRemoteState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};
```

```tsx
// TanStack Query 思路：声明“要什么数据”，缓存与状态由库管理
import { useQuery } from '@tanstack/react-query';

function ProfilePanel() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });

  if (isPending) {
    return <p>加载中…</p>;
  }

  if (isError) {
    return <p role="alert">资料加载失败</p>;
  }

  return <h1>{data.name}</h1>;
}

async function fetchProfile() {
  const response = await fetch('/api/profile');
  if (!response.ok) {
    throw new Error('profile request failed');
  }
  return response.json() as Promise<{ name: string }>;
}
```

#### 1.3 职责边界

- TanStack Query 负责：远程数据的获取、缓存、重试、失效、请求状态。
- 客户端 state 仍负责：本地临时 UI，且只在需要时使用。
- 不要把弹窗开关这类纯本地状态塞进 query 缓存，也不要把接口数据只存在 useState 里手写刷新。

#### 1.4 常见误区

> 用了全局 store 加几个 reducer 就等于有了服务端状态方案。

没有缓存失效、过期重取与去重机制的 store 只是“把旧数据存到全局”，无法保证数据新鲜。

> 服务端状态拿到以后就一直有效。

数据可能在返回后立刻被他人修改，因此需要“新鲜度”概念与重新获取策略，这正是后续配置项要解决的问题。

### 2. QueryClient 与 Provider 接入

#### 2.1 定义

`QueryClient` 是缓存与配置的核心实例，`QueryClientProvider` 把它注入组件树。所有 `useQuery`、`useMutation` 都从上下文中找到这个客户端。

#### 2.2 与 Web 的关系

整个 SPA 通常只创建一个 QueryClient，配合路由在整站共享缓存：列表页请求过的数据进入详情页可直接复用，返回列表时不必重新加载。

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app">应用内容</div>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

入口文件挂载：

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

#### 2.3 全局默认与单条覆盖

`defaultOptions` 中的配置作为全站默认值，某条查询可以单独覆盖。应先设置合理的全站默认（例如重试次数、过期时间），再为特殊接口调整，避免每条查询重复写长串配置。

DevTools 的用途：

- 查看每条 query 的 key、数据、状态；
- 区分新鲜（fresh）、过期（stale）、正在请求等状态；
- 手动触发失效，观察重取；
- 观察缓存回收时机。

#### 2.4 常见误区

> 在组件内部 `new QueryClient()` 再提供给 Provider。

每次渲染创建新客户端会清空缓存、不断重建状态。客户端应在模块作用域或组件外创建一次。

> DevTools 只在出错时才需要打开。

DevTools 是理解缓存行为的教学工具，做查询练习时应同步观察 key 与状态变化。

### 3. useQuery 与 queryKey 设计

#### 3.1 定义

`useQuery` 声明一条只读查询：`queryKey` 是缓存中唯一标识，`queryFn` 负责真正获取数据。key 变化会触发新查询。

```text
useQuery({
  queryKey: 查询身份数组,
  queryFn: 获取数据的异步函数,
})
```

#### 3.2 与 Web 的关系

queryKey 不只是技术标识，它表达“这份数据由哪些参数决定”。列表筛选、分页、详情 id 都必须进入 key，否则不同条件会错误共享同一份缓存。

层级化 key 设计：

```text
['items']                      全部条目相关数据的根
['items', 'list', filters]     某条件下列表
['items', itemId]              某条详情
['items', itemId, 'comments']  某条的评论
```

```tsx
import { useQuery } from '@tanstack/react-query';

type ItemListFilters = {
  keyword: string;
  tag: string;
  page: number;
};

async function fetchItems(
  filters: ItemListFilters,
  signal?: AbortSignal,
): Promise<{ items: Array<{ id: string; title: string }> }> {
  const url = new URL('/api/items', window.location.origin);
  url.searchParams.set('keyword', filters.keyword);
  url.searchParams.set('tag', filters.tag);
  url.searchParams.set('page', String(filters.page));

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`items request failed: ${response.status}`);
  }
  return response.json();
}

function ItemList({ filters }: { filters: ItemListFilters }) {
  const { data } = useQuery({
    queryKey: ['items', 'list', filters],
    queryFn: ({ signal }) => fetchItems(filters, signal),
  });

  return (
    <ul>
      {data?.items.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}
```

详情查询：

```tsx
function ItemDetail({ itemId }: { itemId: string }) {
  const { data } = useQuery({
    queryKey: ['items', itemId],
    queryFn: async () => {
      const response = await fetch(`/api/items/${itemId}`);
      if (!response.ok) {
        throw new Error('detail request failed');
      }
      return response.json() as Promise<{ id: string; title: string; content: string }>;
    },
  });

  return data ? <article>{data.content}</article> : null;
}
```

#### 3.3 key 设计原则

- 使用数组，字符串段做命名空间，参数放末尾。
- 参数对象可直接放入，库会做稳定序列化。
- 所有影响结果的入参都要进 key：id、筛选、分页、语言、地区。
- 同一资源在列表和详情中保持相同命名空间前缀，便于成批失效。

#### 3.4 常见误区

> 把参数拼进字符串 key，如 `` `items-${page}` ``。

字符串拼接会丢失层级，成批失效困难；数组结构配合前缀匹配才是推荐方式。

> key 里省略 page，反正接口里带了。

queryFn 相同 key 下只会取一次缓存，翻页后仍显示第一页；参数必须体现在 key 中。

### 4. staleTime、gcTime、retry 与重取时机

#### 4.1 定义

- `staleTime`：数据在多久内被视为新鲜；新鲜数据挂载时不重新请求。
- `gcTime`：没有组件使用后，缓存保留多久再被回收。
- `retry`：失败后自动重试次数或重试策略。
- 重取时机：挂载、窗口重新聚焦、网络恢复、key 变化、手动失效。

```text
请求成功 → fresh（staleTime 内） → stale（过期但仍在缓存）
组件卸载 → 无人观察 → 等待 gcTime → 缓存删除
```

#### 4.2 与 Web 的关系

不同数据对新鲜度要求不同：实时通知需要很短的 staleTime，变更频率低的字典、配置可以缓存更久。配置应匹配业务，而不是全部用默认值。

```tsx
import { useQuery } from '@tanstack/react-query';

function LiveNotifications() {
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    retry: 2,
    refetchOnWindowFocus: true,
  });

  return notifications.data ? <p>{notifications.data.length} 条通知</p> : null;
}

async function fetchNotifications() {
  const response = await fetch('/api/notifications');
  if (!response.ok) {
    throw new Error('notifications request failed');
  }
  return response.json() as Promise<Array<{ id: string; text: string }>>;
}
```

低频字典使用较长新鲜期：

```tsx
function IndustryOptions() {
  const { data } = useQuery({
    queryKey: ['dictionaries', 'industries'],
    queryFn: fetchIndustries,
    staleTime: 60 * 60_000,
    gcTime: 24 * 60 * 60_000,
    retry: 1,
  });

  return (
    <select aria-label="行业">
      {data?.map((item) => (
        <option key={item.code} value={item.code}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

async function fetchIndustries() {
  const response = await fetch('/api/dictionaries/industries');
  if (!response.ok) {
    throw new Error('industries request failed');
  }
  return response.json() as Promise<Array<{ code: string; label: string }>>;
}
```

#### 4.3 重试的边界

- 网络抖动适合自动重试。
- 4xx（参数错误、无权限）通常重试无意义，可针对状态码关闭重试。
- 提交类操作要谨慎重试，需接口幂等，避免重复创建。

#### 4.4 常见误区

> staleTime 表示“数据只保留这么久”。

staleTime 控制“多久算过期”，过期后数据仍在缓存中，只是重新挂载等时机会重取；真正删除由 gcTime 控制。

> 重试越多越可靠。

对用户而言持续重试意味着长时间等待与重复操作；重试次数与间隔要克制，并保证错误最终可见。

### 5. pending、error、empty 三态处理

#### 5.1 定义

每条查询都要回答三个问题：请求进行中显示什么、失败显示什么、成功但数据为空显示什么。只写成功态的页面在真实网络下必然出现问题。

状态字段：

- `isPending`：首次请求尚无数据。
- `isError` 与 `error`：请求失败。
- 成功后依据数据长度判断 empty。
- `isFetching`：后台正在请求（包括已有数据时的重新验证）。

#### 5.2 与 Web 的关系

三态设计直接决定用户在弱网和接口异常时看到什么。错误文案应说明发生了什么、下一步能做什么，并提供重试入口。

```tsx
import { useQuery } from '@tanstack/react-query';

type Item = { id: string; title: string };

function ItemList({ filters }: { filters: { keyword: string } }) {
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['items', 'list', filters],
    queryFn: () => fetchItemList(filters),
  });

  if (isPending) {
    return (
      <div className="state" aria-live="polite">
        正在加载条目…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="state state-error" role="alert">
        <p>条目加载失败：{error instanceof Error ? error.message : '未知错误'}</p>
        <button type="button" onClick={() => refetch()}>
          重新加载
        </button>
      </div>
    );
  }

  if (data.items.length === 0) {
    return <div className="state">没有匹配的条目，试试更换关键词</div>;
  }

  return (
    <section aria-busy={isFetching}>
      <ul>
        {data.items.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </section>
  );
}

async function fetchItemList(filters: { keyword: string }) {
  const url = new URL('/api/items', window.location.origin);
  url.searchParams.set('keyword', filters.keyword);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`服务器返回 ${response.status}`);
  }
  return response.json() as Promise<{ items: Item[] }>;
}
```

#### 5.3 后台刷新中的体验

已有数据时触发重取不需要回到全屏加载态，可以在内容区显示细微的刷新指示（`isFetching`），避免列表闪烁。这就是“缓存数据先显示，同时后台验证”的体验。

#### 5.4 常见误区

> 有缓存数据就不用处理 error。

后台验证失败也应给出可感知提示，例如顶部一条轻提示，而不是悄无声息地展示可能过期的数据。

> 空数据和加载中可以共用一个转圈。

用户无法区分“正在加载”与“没有数据”，两者必须是不同界面与文案。

### 6. useMutation 与 invalidateQueries

#### 6.1 定义

`useMutation` 用于会改变服务器数据的操作：创建、更新、删除。mutation 不按 key 自动缓存结果，成功后通常让相关查询失效，触发重新获取。

```text
用户提交 → mutationFn 发请求 → 成功 → invalidateQueries 标记过期
        ↓                            → 相关组件自动重取 → 界面更新
      失败 → 展示错误，保留用户输入
```

#### 6.2 与 Web 的关系

变更后界面更新有两种方式：让查询失效重取（简单、与服务器一致），或直接写入缓存（减少一次请求）。初学阶段统一使用失效重取，保证数据与后端一致。

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query';

type CreateItemInput = {
  title: string;
  content: string;
};

function CreateItemForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (input: CreateItemInput) => createItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
    onError: (error) => {
      console.error('创建失败', error);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    mutation.mutate({
      title: String(form.get('title') ?? ''),
      content: String(form.get('content') ?? ''),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? '提交中…' : '创建条目'}
      </button>
      {mutation.isError && (
        <p role="alert">创建失败，请调整后重试</p>
      )}
    </form>
  );
}

async function createItem(input: CreateItemInput) {
  const response = await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`create failed: ${response.status}`);
  }
  return response.json() as Promise<{ id: string }>;
}
```

删除后失效列表与详情：

```tsx
function useDeleteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => deleteItem(itemId),
    onSuccess: (_data, itemId) => {
      queryClient.invalidateQueries({ queryKey: ['items', 'list'] });
      queryClient.removeQueries({ queryKey: ['items', itemId] });
    },
  });
}

async function deleteItem(itemId: string) {
  const response = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`delete failed: ${response.status}`);
  }
}
```

#### 6.3 失效的范围

- 精确失效：只让当前列表条件失效。
- 前缀失效：`['items']` 让所有条目相关查询（列表、详情）一起重取，最常用。
- 变更影响范围不确定时，宁可多失效相关查询，也不要展示确定过期的数据。

#### 6.4 防重复提交

提交中禁用按钮并给表单加上提交指示；接口应设计为幂等或在服务端防重复。前端 loading 与后端防护缺一不可。

#### 6.5 常见误区

> mutation 成功后手动 set 一个本地 state 更新列表。

这样绕过缓存，其他使用该数据的组件不会更新。应通过失效或缓存写入，让所有观察者统一响应。

> 失效只写一个字符串，如 invalidateQueries('items')。

当前稳定版接收查询过滤对象，配合数组 key 使用；写法应与 key 结构对应。

### 7. 乐观更新

#### 7.1 定义

乐观更新是在服务器响应到达前，先假定操作成功并立即更新界面；请求失败时再回滚。适合高频、成功率高的交互，例如点赞、收藏、拖拽排序。

```text
onMutate：取消相关查询 → 保存旧值快照 → 立即写入预期新值
onError：用快照回滚
onSettled：无论成功失败都让查询失效，与服务器对齐
```

#### 7.2 与 Web 的关系

乐观更新消除网络等待感，是现代 Web 交互流畅的重要手段。但必须有完整的回滚路径，否则用户会在失败时看到“假成功”。

```tsx
import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query';

type Item = { id: string; favorite: boolean };

function useFavoriteItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { itemId: string; favorite: boolean }) =>
      setFavorite(variables.itemId, variables.favorite),

    onMutate: async (variables) => {
      const key: QueryKey = ['items', variables.itemId];

      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Item>(key);

      queryClient.setQueryData<Item>(key, (old) =>
        old ? { ...old, favorite: variables.favorite } : old,
      );

      return { previous, key };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },

    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items', variables.itemId] });
    },
  });
}

async function setFavorite(itemId: string, favorite: boolean) {
  const response = await fetch(`/api/items/${itemId}/favorite`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ favorite }),
  });
  if (!response.ok) {
    throw new Error(`favorite failed: ${response.status}`);
  }
}
```

#### 7.3 乐观更新的使用条件

- 操作结果高度可预测，且失败可明确提示。
- 界面更新逻辑简单，回滚成本低。
- 涉及资金、权限、不可逆删除时不应默认“假成功”，应等待服务端确认。

#### 7.4 常见误区

> 只写界面更新，不写回滚。

请求失败后用户界面与服务器长期不一致。onError 回滚和 onSettled 失效是乐观更新不可分割的一部分。

> 乐观更新后不需要再与服务器同步。

本地写入只是推测，最终必须通过失效重取拿到服务器确认结果。

### 8. 预取、取消竞态与分页无限查询

#### 8.1 预取

在用户真正点击前提前获取数据，例如鼠标悬停链接时预取详情，点开即见数据。

```tsx
import { useQueryClient } from '@tanstack/react-query';

type ItemDetail = { id: string; title: string; content: string };

function ItemLink({ itemId }: { itemId: string }) {
  const queryClient = useQueryClient();

  const prefetchDetail = () => {
    queryClient.prefetchQuery({
      queryKey: ['items', itemId],
      queryFn: () => fetchItemDetail(itemId),
      staleTime: 30_000,
    });
  };

  return (
    <a href={`/items/${itemId}`} onMouseEnter={prefetchDetail}>
      查看条目 {itemId}
    </a>
  );
}

async function fetchItemDetail(itemId: string): Promise<ItemDetail> {
  const response = await fetch(`/api/items/${itemId}`);
  if (!response.ok) {
    throw new Error('prefetch failed');
  }
  return response.json();
}
```

#### 8.2 取消与竞态

用户快速切换筛选时，旧请求可能比新请求晚返回。TanStack Query 以最新 key 的结果为准，并通过查询函数接收的 `signal` 在请求过期时自动中止底层 fetch。

```tsx
import { useQuery } from '@tanstack/react-query';

function SearchResults({ keyword }: { keyword: string }) {
  const { data } = useQuery({
    queryKey: ['search', keyword],
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}`, {
        signal,
      });
      if (!response.ok) {
        throw new Error('search failed');
      }
      return response.json() as Promise<{ items: Array<{ id: string; title: string }> }>;
    },
  });

  return (
    <ul>
      {data?.items.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}
```

竞态处理要点：

- key 隔离：每个条件是独立查询，天然不会串数据。
- signal 取消：过期请求被中止，不再消耗更新。
- 不要用 useEffect 加“请求序号”手写竞态防护，查询库已经内建。

#### 8.3 分页基础

翻页时保留上一页数据，避免页面闪烁：

```tsx
import { keepPreviousData, useQuery } from '@tanstack/react-query';

function PagedItems({ page }: { page: number }) {
  const { data, isPlaceholderData } = useQuery({
    queryKey: ['items', 'page', page],
    queryFn: () => fetchPage(page),
    placeholderData: keepPreviousData,
  });

  return (
    <section style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
      <ul>
        {data?.items.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </section>
  );
}

async function fetchPage(page: number) {
  const response = await fetch(`/api/items?page=${page}`);
  if (!response.ok) {
    throw new Error('page request failed');
  }
  return response.json() as Promise<{ items: Array<{ id: string; title: string }> }>;
}
```

#### 8.4 无限查询

“加载更多”式列表使用 `useInfiniteQuery`，每一页作为数组中的一个 page 保存。

```tsx
import { useInfiniteQuery } from '@tanstack/react-query';

type FeedPage = {
  items: Array<{ id: string; title: string }>;
  nextCursor: string | null;
};

function InfiniteFeed() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  return (
    <div>
      {data?.pages.map((page, pageIndex) => (
        <ul key={pageIndex}>
          {page.items.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      ))}
      <button
        type="button"
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? '加载中…' : hasNextPage ? '加载更多' : '没有更多了'}
      </button>
    </div>
  );
}

async function fetchFeedPage(cursor: string | null): Promise<FeedPage> {
  const url = new URL('/api/feed', window.location.origin);
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('feed request failed');
  }
  return response.json();
}
```

#### 8.5 常见误区

> 预取越多越好，整站数据都在挂载时预取。

预取也消耗带宽与服务器资源，应针对“用户很可能下一步访问”的数据，并受 staleTime 约束。

> 翻页时出现旧数据闪烁是网络问题，无法解决。

使用 `placeholderData: keepPreviousData` 可保留上一页数据，这是查询库内建能力，不需要手写缓存。

> 无限查询的数据结构和普通分页完全一样。

无限查询按 pages 数组组织，渲染时要展开所有 page，并通过游标而不是只靠页码请求下一批。

## 课后题

1. 服务端状态与客户端状态有什么区别？请列出服务端状态的四个特征。
2. 为什么不建议用普通全局 store 手写接口数据缓存？至少说出四项会被重复编写的能力。
3. 场景分析：QueryClient 被写在了 App 组件函数内部，用户每次切换页面都感觉缓存“丢了”。请解释原因并修复。
4. queryKey 为什么要设计成层级化数组？请为“某用户在某条目下的评论分页”设计一个 key。
5. 场景分析：列表翻到第 3 页后，同事发现界面仍显示第 1 页数据，检查发现 queryKey 是 `['items']`、page 只传给了接口。请解释并修复。
6. `staleTime`、`gcTime` 分别控制什么？数据过期后是否立刻从内存删除？
7. 场景分析：某接口在用户每次切换浏览器标签回来时都重新请求，造成列表闪烁，但这是一份几乎不变的行业字典。请给出配置方案。
8. useMutation 成功后为什么要 invalidate？只更新本地一个 state 会有什么问题？
9. 场景分析：收藏按钮点击后立即变红，但网络其实失败了，界面一直保持红色。请指出缺少哪些步骤，并写出完整的乐观更新流程。
10. 场景分析：用户在搜索框快速输入“r、re、rea、react”，前几个请求比最后一个晚返回。请说明 TanStack Query 如何保证不出现旧结果，代码层面要配合什么。

## 实践练习题

### 练习 1：接入 QueryClient 并实现条目列表查询

#### 任务

在 React + TypeScript 项目中接入 TanStack Query，对接一个条目列表接口，完成第一条查询并通过 DevTools 观察缓存。

#### 步骤约束

1. 在组件外创建唯一 QueryClient，设置合理的默认 staleTime 与 retry，并用 Provider 包裹应用。
2. 安装并挂载 DevTools。
3. 使用 `useQuery` 请求列表，queryKey 为层级化数组。
4. 为接口响应定义 TypeScript 类型，不使用 any。
5. 截图 DevTools 中该查询的 key、数据与状态。
6. 反复挂载卸载列表组件，记录请求次数与缓存命中情况。

#### 提交物

- QueryClient 与列表代码；
- DevTools 截图；
- 请求次数观察记录；
- 接口类型定义。

#### 验收标准

- 只有一个 QueryClient 实例；
- 缓存命中时不重复请求；
- 类型完整；
- 能在 DevTools 中指出查询状态；
- 构建通过。

### 练习 2：三态完整的列表与详情

#### 任务

完善列表页并新增详情页，完整实现 pending、error、empty 三态，错误可重试，详情通过 id 查询。

#### 步骤约束

1. 列表首次加载显示加载态，失败显示错误文案与“重新加载”按钮。
2. 构造空结果场景并展示空态。
3. 后台刷新时使用 isFetching 提供轻提示，不清空已有列表。
4. 点击列表项进入详情，详情使用独立 key 与类型。
5. 详情接口失败或 id 非法时有明确兜底。
6. 至少通过 Mock 或手动断网演示一次错误态。

#### 提交物

- 列表与详情代码；
- 五种状态（加载/错误/空/成功/后台刷新）截图；
- 错误演示记录；
- 状态处理说明。

#### 验收标准

- 三态齐全且文案可区分；
- 错误态可重试；
- 空态不与加载态混淆；
- 详情非法 id 不白屏；
- 体验上后台验证不闪烁。

### 练习 3：变更、失效与乐观更新

#### 任务

实现创建条目和收藏切换：创建成功后失效列表；收藏使用乐观更新并具备回滚；再为列表增加分页。

#### 步骤约束

1. 创建表单使用 useMutation，提交中禁用按钮防止重复提交。
2. 创建成功后用前缀失效让条目相关查询重取。
3. 收藏操作实现 onMutate、onError 回滚、onSettled 失效完整流程。
4. 模拟收藏接口失败，证明界面自动回滚并给出提示。
5. 列表分页使用 queryKey 包含页码，并配置 keepPreviousData。
6. 在 README 中用一张时序图描述“乐观更新到最终失效”的全过程。

#### 提交物

- 创建、收藏、分页代码；
- 成功与失败回滚演示截图；
- 分页翻页记录；
- 时序图与缓存说明。

#### 验收标准

- 创建后列表自动更新；
- 乐观更新即时响应，失败可靠回滚；
- 最终数据与服务器对齐；
- 翻页不闪旧数据；
- 无重复提交问题。

## 阶段验收作业

### 作业名称

TanStack Query 驱动的“知识条目数据台”

### 作业场景

后端已提供条目列表、详情、创建、删除、收藏等接口。团队要求你用 TanStack Query 完成一个数据可靠、体验流畅的前端：任何接口数据都不手写缓存，三态完整，变更后界面一致，并在慢网与快速操作下依然正确。

### 提交物

```text
knowledge-query/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   └── items.ts
│   ├── components/
│   │   ├── ItemList.tsx
│   │   ├── ItemCard.tsx
│   │   ├── ItemDetail.tsx
│   │   ├── CreateItemForm.tsx
│   │   ├── FavoriteButton.tsx
│   │   └── StateView.tsx
│   ├── pages/
│   │   └── ItemsPage.tsx
│   ├── query/
│   │   ├── queryClient.ts
│   │   └── keys.ts
│   ├── types/
│   │   └── item.ts
│   ├── App.tsx
│   └── main.tsx
├── query-design.md
└── README.md
```

必做内容：

1. 统一查询 key 管理，列表筛选与分页全部进入 key。
2. 列表三态完整，支持关键词筛选与分页，翻页保留前页数据。
3. 详情页可由列表进入，非法 id 与请求失败均有兜底。
4. 创建与删除使用 mutation，成功后正确失效或移除缓存。
5. 收藏使用乐观更新，慢网失败时回滚并有提示。
6. 至少实现一个悬停预取场景。
7. `query-design.md` 包含 key 清单、缓存配置表、竞态处理说明和一张完整数据流图。

### 演示步骤

学员在 15 分钟内完成：

1. 展示 QueryClient 配置与 DevTools 中的全部查询。
2. 打开列表，依次演示加载、成功、空结果、错误重试。
3. 设置筛选并翻页，刷新页面说明 key 与缓存行为。
4. 创建一条条目，展示列表自动更新。
5. 在慢网模拟下点击收藏再让其失败，演示乐观更新与回滚。
6. 鼠标悬停条目后快速进入，展示预取命中。
7. 快速连续输入搜索词，说明旧请求如何被取消。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 状态认知与接入 | 15 | 正确区分两类状态，QueryClient 唯一且配置合理 |
| 查询与 key 设计 | 20 | key 层级完整，参数齐全，命名空间可成批失效 |
| 缓存配置 | 15 | staleTime/gcTime/retry 与业务匹配，能解释行为 |
| 三态处理 | 20 | pending/error/empty 完整，错误可重试，后台刷新不闪烁 |
| Mutation 与失效 | 15 | 变更后失效正确，防重复提交，缓存无过期残留 |
| 乐观/预取/竞态/分页 | 10 | 乐观可回滚，预取命中，竞态正确，分页流畅 |
| 文档与工程 | 5 | 设计文档完整，构建通过，README 可复现 |

细分评分：

- 状态认知与接入：两类状态区分 7 分，客户端接入 8 分。
- 查询与 key：层级 7 分，参数完整 7 分，集中管理 6 分。
- 缓存配置：三项配置 9 分，行为解释 6 分。
- 三态处理：pending 5 分，error 6 分，empty 4 分，后台刷新体验 5 分。
- Mutation 与失效：mutation 写法 5 分，失效范围 5 分，防重复 5 分。
- 高级能力：乐观更新 3 分，预取 2 分，竞态 2 分，分页 3 分。
- 文档与工程：query-design 3 分，构建 2 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过：

1. 接口数据只保存在 useState 中并手写 loading 与刷新，未使用 TanStack Query 管理服务端状态。
2. queryKey 遗漏筛选、分页或 id 参数，导致缓存串数据。
3. 只实现成功态，加载、错误、空态任一缺失。
4. mutation 成功后不失效相关查询，界面展示过期数据。
5. 乐观更新没有回滚逻辑，失败后界面与服务器不一致。
6. 快速切换筛选时出现旧请求覆盖新结果的竞态问题。
7. 项目无法按 README 启动，或存在未处理的 TypeScript 错误。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 区分服务端与客户端状态 | query-design.md 与现场说明 |
| 接入 QueryClient | queryClient.ts、Provider 与 DevTools 演示 |
| 设计 queryKey | keys.ts 及列表、详情代码 |
| 配置缓存策略 | 配置表与刷新/聚焦重取行为演示 |
| 处理三态 | StateView 及五种状态演示 |
| 使用 mutation 与失效 | CreateItemForm、删除逻辑演示 |
| 实现乐观更新 | FavoriteButton 失败回滚演示 |
| 预取、取消竞态、分页 | 悬停预取、快速输入、翻页演示 |

### 提交前自检

- [ ] 所有远程数据均由 TanStack Query 管理。
- [ ] QueryClient 全局唯一，默认配置与业务匹配。
- [ ] 影响结果的参数全部进入 queryKey。
- [ ] 三态在每个使用查询的页面都完整。
- [ ] mutation 成功后失效范围正确，提交中防重复。
- [ ] 乐观更新具备快照、回滚与最终失效。
- [ ] 查询函数使用 signal，快速切换无竞态问题。
- [ ] 至少一个预取场景可演示，分页使用 keepPreviousData。
- [ ] DevTools 中展示的缓存与设计文档一致。
- [ ] `npm run build` 无错误，README 包含环境变量说明与启动步骤。
