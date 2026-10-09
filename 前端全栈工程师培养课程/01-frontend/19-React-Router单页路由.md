# 19-React Router 单页路由

## 目标

完成本知识单元后，学员应理解单页应用如何在不整页刷新的前提下管理 URL 与页面，并能使用 React Router 当前稳定版本组织完整的页面结构。

学员应能够：

1. 解释 SPA 与传统多页应用的区别，说明前端路由如何借助 history API 工作。
2. 说明当前稳定版 React Router 的两种路由写法，并基于 data router（`createBrowserRouter` + `RouterProvider`）完成项目。
3. 设计路由表，实现嵌套路由、布局路由、索引路由和 404 兜底。
4. 使用 `useParams` 处理动态参数，使用 `Link`、`NavLink`、`useNavigate` 完成各类导航。
5. 使用 `useSearchParams` 把搜索、筛选、分页放进 URL，理解 loader 的数据加载定位。
6. 实现受保护路由，处理未登录访问与登录后回跳。

本单元只讨论浏览器端路由。服务端路由、接口路径与前端路由的协作在后端单元展开。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| React 19 | 界面基础 | 能在组件中使用路由 Hooks |
| React Router 当前稳定主版本 | 单页路由库 | 掌握 data router、嵌套路由、参数与导航 |
| TypeScript | 类型检查 | 能为 loader 返回值与路由参数提供类型 |
| Vite | 开发与构建 | 能配置本地开发与生产构建 |
| Node.js 当前 LTS 与 npm | 运行工具链 | 能安装依赖与执行脚本 |
| React DevTools | 观察路由组件 | 能查看页面切换时的组件状态 |

安装命令：

```bash
npm install react-router
```

说明：

- 当前稳定主版本以库方式使用时，API 从 `react-router` 包导入。
- 维护 v6 存量项目时，导入路径常写作 `react-router-dom`，本单元讲解的 API 形态基本一致，遇到差异以当前安装版本文档为准。
- 不写死小版本号；不使用已停止维护的旧版路由 API 作为新代码主线。

## 详细的理论知识讲解和示例伪代码

### 1. SPA 与多页应用

#### 1.1 定义

多页应用（MPA）中，每次跳转都由浏览器发起新的 HTTP 请求，服务器返回一整页新 HTML，浏览器销毁旧页面再渲染新页面。单页应用（SPA）只有一个 HTML 入口，跳转时浏览器不整页刷新，由 JavaScript 根据 URL 切换组件。

```text
MPA：点击链接 → 请求新 HTML → 整页重建 → 白屏闪烁 → 新页面
SPA：点击链接 → 不刷新页面 → history 改 URL → 交换路由组件 → 新页面
```

#### 1.2 与 Web 的关系

SPA 保留了浏览器页面的 JavaScript 运行时：正在播放的音乐不会中断、全局客户端状态可以保留、切换通常更流畅。代价是首屏要下载和执行 JS 包，且需要自己处理“URL 与组件的对应关系”，这正是路由库的工作。

```tsx
// 概念伪代码：SPA 切换页面时，变化的只是挂载哪个页面组件
function appConcept(url: string) {
  if (url === '/items') {
    return <ItemListPage />;
  }

  if (url.startsWith('/items/')) {
    return <ItemDetailPage />;
  }

  return <HomePage />;
}
```

真实项目不需要手写上面的判断，React Router 根据声明式的路由表完成同样的工作。

#### 1.3 SPA 的代价与应对

- 首屏体积：用代码分割、路由懒加载控制首屏包体。
- SEO 与分享：根据业务需要配合服务端渲染或预渲染，本课程主线是客户端渲染。
- 前进后退：必须使用 history API，保证浏览器按钮仍然有效。

#### 1.4 常见误区

> SPA 就是“只有一个页面”，所以不能有多个网址。

SPA 仍然为每个视图维护真实 URL，可以收藏、分享、前进后退，只是切换过程不经过整页刷新。

> 用 state 切换页面和用路由切换没有区别。

state 切换不改变地址栏，无法分享、刷新丢失、浏览器历史失效。凡是用户认为“这是一页”的视图，都应有对应 URL。

### 2. history API：前端路由的底层原理

#### 2.1 定义

浏览器提供 History API：`history.pushState` 可以在不发起请求的情况下改变地址栏 URL，`history.replaceState` 替换当前记录，用户点击前进后退时触发 `popstate` 事件。前端路由库就是基于这些能力监听 URL 并匹配组件。

```text
用户点击 <Link to="/items/42">
        ↓
路由库调用 history.pushState({}, '', '/items/42')
        ↓
地址栏变化，但没有网络请求、没有整页刷新
        ↓
路由库匹配新 URL，渲染对应路由组件
        ↓
用户点浏览器后退
        ↓
触发 popstate，路由库重新匹配到上一个 URL
```

#### 2.2 与 Web 的关系

理解 history 可以解释两个常见现象：

- 为什么前端跳转不刷新页面，但地址栏确实变了。
- 为什么在 SPA 的子路径直接刷新会向服务器请求该 URL，服务器需要配置回退到入口 HTML（否则返回 404）。

```js
// 原理演示，真实项目由路由库内部完成
window.history.pushState({ page: 'detail' }, '', '/items/42');

window.addEventListener('popstate', () => {
  console.log('用户前进或后退到了', window.location.pathname);
});
```

pushState 与 replaceState 的区别：

```text
pushState：新增一条历史记录，用户可以后退回来
replaceState：替换当前记录，后退不会回到旧地址
适合场景：登录后替换掉登录页、重定向、修正不规范 URL
```

#### 2.3 服务器回退配置

Vite 开发服务器默认支持 history 回退；生产部署时，静态服务器需要把未匹配的路径回退到 `index.html`，否则用户刷新深层链接会得到服务器 404。这是部署配置问题，不是前端代码 bug。

#### 2.4 常见误区

> 只要地址栏变了，浏览器一定请求了服务器。

通过 pushState 改变 URL 不会发起请求；只有刷新、直接输入地址或点击普通 `<a>` 标签才会发起文档请求。

> popstate 在 pushState 时也会触发。

pushState 和 replaceState 本身不触发 popstate，只有前进、后退等浏览器动作才触发；路由库内部自行维护监听与匹配。

### 3. React Router 接入与写法选择

#### 3.1 定义

当前稳定版 React Router 有两类常见写法：

- data router：使用 `createBrowserRouter` 创建路由实例，`RouterProvider` 挂载，支持 loader、action 等数据 API，是本课程主线。
- 组件式路由：使用 `BrowserRouter` 加 `Routes`、`Route` 以纯组件方式声明，写法直观，但不具备 data router 的数据加载能力。

本单元统一选择 data router，后续 loader 讲解都建立在它之上。两种思路解决同样的匹配问题，团队中遇到旧写法要能读懂。

#### 3.2 与 Web 的关系

data router 在路由变化时先完成数据相关工作再渲染页面，使“路由”同时承担“URL 匹配”和“页面数据入口”两个职责。

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router';

const router = createBrowserRouter([
  {
    path: '/',
    element: <div>首页</div>,
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

组件式写法对照（读懂即可）：

```tsx
import { BrowserRouter, Routes, Route } from 'react-router';

function AppAsComponents() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>首页</div>} />
      </Routes>
    </BrowserRouter>
  );
}
```

#### 3.3 路由匹配的基本规则

- 路由按声明的结构匹配 URL 的路径分段。
- 更具体的路径优先匹配，`:param` 匹配单个动态分段。
- 通配路由 `*` 匹配剩余所有路径，常用于 404。
- 路由可以嵌套，匹配结果决定渲染哪一层。

#### 3.4 常见误区

> data router 和组件式写法可以混用在同一棵树里。

两者是不同的挂载模型，新项目应选定一种；混用会导致部分 API 无可用上下文。

> RouterProvider 里面还可以再包一层 BrowserRouter。

RouterProvider 已经包含路由上下文，再套 BrowserRouter 没有意义，还可能产生嵌套混乱。

### 4. 路由表、嵌套路由与布局路由

#### 4.1 定义

路由表是 URL 与组件对应关系的集中声明。嵌套路由让子路径在父路由的组件内部渲染；父路由通过 `Outlet` 声明子内容的位置。只承担“外壳 + Outlet”的父路由称为布局路由。

#### 4.2 与 Web 的关系

绝大多数后台系统是“顶部栏 + 侧边栏 + 内容区”结构，切换页面时外壳不应重建。布局路由让外壳只写一次，内容区随子路由交换。

```tsx
import { createBrowserRouter, Outlet, RouterProvider } from 'react-router';

function AppLayout() {
  return (
    <div className="layout">
      <header className="topbar">知识管理系统</header>
      <div className="body">
        <aside className="sidebar">导航菜单</aside>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <div>仪表盘</div> },
      { path: 'items', element: <div>条目列表</div> },
      { path: 'settings', element: <div>系统设置</div> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

说明：

- `index: true` 表示父路径本身（如 `/`）时渲染的默认子路由。
- 子路由的 `path` 相对于父路径，`items` 实际匹配 `/items`。
- 布局路由也可以不写 `path`，仅用于给一组子路由加外壳。

#### 4.3 多层嵌套

```tsx
const routerWithNesting = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        path: 'items',
        element: <Outlet />,
        children: [
          { index: true, element: <div>列表页</div> },
          { path: ':id', element: <div>详情页</div> },
          { path: 'new', element: <div>新建页</div> },
        ],
      },
    ],
  },
]);
```

访问 `/items/42` 时，外层 AppLayout 保持不变，items 层的 Outlet 中渲染详情页。

#### 4.4 常见误区

> 嵌套路由的组件写了但页面没变化，是库出问题。

父路由组件中必须放置 `Outlet`，否则子路由没有渲染出口。这是嵌套路由最常见的遗漏。

> 子路由路径要以 `/` 开头。

以 `/` 开头会变成绝对路径，子路由一般写相对路径，如 `items`、`:id`。

### 5. 动态参数与 useParams

#### 5.1 定义

路由路径中以冒号标记的分段是动态参数，例如 `items/:id` 可以匹配 `items/42` 和 `items/abc`。组件通过 `useParams` 读取匹配到的值。

#### 5.2 与 Web 的关系

详情页是动态参数最典型的场景：同一个详情组件，依据 URL 中的 id 展示不同资源。把 id 放进 URL 使详情页可分享、可刷新。

```tsx
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  useParams,
} from 'react-router';

type ItemDetailParams = {
  id: string;
};

function ItemDetailPage() {
  const params = useParams<ItemDetailParams>();

  return (
    <article>
      <h1>条目详情</h1>
      <p>当前条目 id：{params.id}</p>
    </article>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <div>
        <Outlet />
      </div>
    ),
    children: [
      { path: 'items/:id', element: <ItemDetailPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

一个路由可以声明多个参数：

```text
/teams/:teamId/members/:memberId
匹配 /teams/7/members/128
参数为 { teamId: '7', memberId: '128' }
```

#### 5.3 参数变化与组件复用

从 `/items/1` 导航到 `/items/2` 时，如果两个 URL 匹配同一路由，组件实例会被复用而不是重建，只是 params 变化。需要响应参数变化（例如重新取详情）应由数据层基于参数处理，而不是依赖组件“重新挂载”。

#### 5.4 常见误区

> 从 useParams 取出的值一定是 string，所以不用考虑 undefined。

类型上参数可能为 `undefined`（例如路由不匹配该分段时），应做存在性检查或提供兜底；TypeScript 中也可以据此收窄类型。

> 详情 id 放 state 里更方便。

id 放在 state 中刷新即丢失、无法分享。资源标识属于 URL 的天然内容。

### 6. 导航：Link、NavLink 与 useNavigate

#### 6.1 定义

- `Link`：渲染可访问的链接，点击执行前端跳转，不整页刷新。
- `NavLink`：Link 的增强版，可根据是否处于当前路由设置样式，适合导航菜单。
- `useNavigate`：在事件逻辑中以代码方式跳转，例如提交成功后跳转。

#### 6.2 与 Web 的关系

可分享的页面入口应使用链接而不是按钮加脚本跳转：链接支持右键新开页签、复制地址和辅助技术朗读。只有“完成某个动作之后再决定去哪”的场景才用命令式导航。

```tsx
import { Link, NavLink } from 'react-router';

function SidebarNav() {
  return (
    <nav aria-label="主导航">
      <ul>
        <li>
          <NavLink
            to="/items"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            条目管理
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/settings"
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            系统设置
          </NavLink>
        </li>
      </ul>
      <Link to="/items/new">+ 新建条目</Link>
    </nav>
  );
}
```

命令式导航：

```tsx
import { useNavigate } from 'react-router';

function CreateItemForm() {
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await saveItemFromForm(event.currentTarget);
    navigate(`/items/${created.id}`);
  };

  return <form onSubmit={handleSubmit}>表单内容</form>;
}

async function saveItemFromForm(_form: HTMLFormElement) {
  return { id: '42' };
}
```

#### 6.3 相对路径与替换历史

```tsx
import { Link, useNavigate } from 'react-router';

function ItemToolbar() {
  const navigate = useNavigate();

  return (
    <>
      {/* 相对于当前路由：在 /items/42 下指向 /items/42/edit */}
      <Link to="edit">编辑</Link>

      {/* replace: true 替换历史记录，登录页等场景使用 */}
      <button type="button" onClick={() => navigate('/items', { replace: true })}>
        返回列表且不留历史
      </button>
    </>
  );
}
```

#### 6.4 常见误区

> 用 `<a href>` 也能配合 SPA。

普通 `<a>` 会触发整页文档请求，应用被整体重启。内部跳转应使用 Link；跳向外部站点才使用普通链接。

> 表单提交、删除成功后的跳转也用 Link 包按钮。

动作结果驱动的跳转属于事件逻辑，应在处理函数中使用 navigate，避免“先跳转再请求”的错误顺序。

### 7. useSearchParams：把查询状态放进 URL

#### 7.1 定义

URL 的查询字符串（如 `/items?keyword=react&page=2`）用于存放搜索词、筛选条件、分页等。`useSearchParams` 提供读取和更新查询参数的能力，写法类似 `URLSearchParams`。

#### 7.2 与 Web 的关系

筛选条件放在查询参数中有三个好处：刷新后条件仍在；链接可以发给同事，对方打开看到同样结果；浏览器前进后退能在不同筛选状态间切换。

```tsx
import { useSearchParams } from 'react-router';

function ItemFilterBar() {
  const [searchParams, setSearchParams] = useSearchParams();

  const keyword = searchParams.get('keyword') ?? '';
  const tag = searchParams.get('tag') ?? '';

  const updateKeyword = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set('keyword', value);
    } else {
      next.delete('keyword');
    }
    setSearchParams(next);
  };

  return (
    <div>
      <input
        type="search"
        value={keyword}
        onChange={(event) => updateKeyword(event.target.value)}
        aria-label="关键词"
        placeholder="搜索条目"
      />
      {tag && <span>当前标签：{tag}</span>}
    </div>
  );
}
```

读取分页参数并提供默认值：

```tsx
function PaginationReader() {
  const [searchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');
  const pageSize = Number(searchParams.get('pageSize') ?? '20');

  return (
    <p>
      第 {page} 页，每页 {pageSize} 条
    </p>
  );
}
```

#### 7.3 查询参数即状态

使用 useSearchParams 后，不要再额外用 useState 保存同一份搜索词，否则两份数据会不一致。输入框的值直接从参数读取，更新时写回参数。

#### 7.4 常见误区

> 所有表单状态都应放进 URL。

URL 适合可分享、可回退的查询条件；敏感字段、长篇草稿、临时展开状态不应放进地址栏。

> 参数是数字类型，取出来直接参与计算一定安全。

查询参数本质是字符串，可能缺失或非法，需要转换与校验，例如用 `Number.isFinite` 检查页码。

### 8. loader、404 与受保护路由

#### 8.1 loader 的定义

loader 是路由级的数据加载函数，在路由元素渲染前执行，组件通过 `useLoaderData` 读取其返回值。它把“进入这一页需要什么数据”与路由声明放在一起。

本课程主线中服务端状态统一交给 TanStack Query，loader 只要求理解定位：它是路由提供的数据入口，可以做页面必需数据的预取与权限前置判断。

```tsx
import {
  createBrowserRouter,
  RouterProvider,
  useLoaderData,
} from 'react-router';

type Item = {
  id: string;
  title: string;
};

async function itemsLoader(): Promise<{ items: Item[] }> {
  const response = await fetch('/api/items');
  if (!response.ok) {
    throw new Response('加载失败', { status: response.status });
  }
  const items = (await response.json()) as Item[];
  return { items };
}

function ItemsPage() {
  const data = useLoaderData() as Awaited<ReturnType<typeof itemsLoader>>;

  return (
    <ul>
      {data.items.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}

const router = createBrowserRouter([
  {
    path: '/items',
    element: <ItemsPage />,
    loader: itemsLoader,
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
```

#### 8.2 404 兜底路由

使用通配路径 `*` 匹配所有未命中的地址，提供可返回首页的页面：

```tsx
function NotFoundPage() {
  return (
    <section>
      <h1>404</h1>
      <p>页面不存在，可能已被移动或地址输入有误。</p>
      <a href="/">返回首页</a>
    </section>
  );
}

const routerWithFallback = createBrowserRouter([
  {
    path: '/',
    element: <div>外壳</div>,
    children: [
      { path: 'items', element: <div>列表</div> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
```

#### 8.3 受保护路由

受保护路由在渲染目标页面前检查登录状态，未登录时重定向到登录页，并记录来源地址，登录成功后回跳。

```tsx
import { Navigate, Outlet, useLocation } from 'react-router';

function RequireAuth({ isLoggedIn }: { isLoggedIn: boolean }) {
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

const protectedRouter = createBrowserRouter([
  {
    path: '/',
    element: <RequireAuth isLoggedIn={checkLogin()} />,
    children: [
      { path: 'items', element: <div>受保护的列表页</div> },
      { path: 'settings', element: <div>受保护的设置页</div> },
    ],
  },
  { path: '/login', element: <div>登录页</div> },
  { path: '*', element: <NotFoundPage /> },
]);

function checkLogin() {
  return false;
}
```

登录页读取来源地址并在成功后回跳：

```tsx
import { useLocation, useNavigate } from 'react-router';

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null)?.from ?? '/items';

  const handleLogin = async () => {
    await performLogin();
    navigate(from, { replace: true });
  };

  return (
    <button type="button" onClick={handleLogin}>
      登录
    </button>
  );
}

async function performLogin() {
  return undefined;
}
```

#### 8.4 安全边界提醒

前端的受保护路由只改善体验，用户可以修改本地运行环境。真正的权限控制必须由后端在每个接口执行；前端隐藏入口与后端鉴权缺一不可。

#### 8.5 常见误区

> 路由守卫拦住了页面，就等于数据安全了。

接口仍然可以被直接调用，后端必须独立鉴权；前端守卫防止的是“用户看到无意义页面”。

> 404 路由放在 children 外面更保险。

通配路由放在布局的 children 内可以保留站点外壳；放在根级则整页只有 404。按设计选择，放置位置决定最终展示形态。

## 课后题

1. SPA 与 MPA 的跳转过程有什么区别？SPA 获得了什么、代价是什么？
2. 请解释 `pushState`、`replaceState` 与 `popstate` 的关系。为什么 pushState 后页面不刷新？
3. 场景分析：同事把页面切换实现成一个 `currentPage` 的 useState，刷新后总是回到首页，也无法把某个详情页链接发给别人。请说明问题并给出改造方向。
4. React Router 当前稳定版的两种写法分别是什么？本课程为什么选择 data router？
5. 嵌套路由中子页面没有出现在预期位置，最先应该检查什么？请说明 Outlet 的作用。
6. 场景分析：用户从 `/items/1` 点到 `/items/2`，页面组件里的本地表单草稿没有清空，同事认为是 bug 要求强制刷新。请分析组件复用机制，说明更合理的处理方式。
7. `Link` 与普通 `<a>` 的区别是什么？什么场景应该使用 `useNavigate` 而不是 Link？
8. 场景分析：搜索框的关键词同时存在于 useState 和 URL 查询参数中，用户前进后退时输入框与结果列表不一致。请分析原因并修复。
9. loader 的定位是什么？在“TanStack Query 管理服务端状态”的技术栈中，loader 可以承担什么角色？
10. 场景分析：未登录用户直接访问 `/settings`，被重定向到登录页，登录成功后应回到哪里？请写出包含来源记录与回跳的实现思路，并说明为什么后端仍要鉴权。

## 实践练习题

### 练习 1：搭建带布局的路由骨架

#### 任务

使用 Vite 创建 React + TypeScript 项目并接入 React Router，实现一个带顶部栏和侧边栏的后台布局，至少包含首页、条目列表、设置三个可切换页面和 404 页面。

#### 步骤约束

1. 使用 `createBrowserRouter` 与 `RouterProvider`，不使用组件式写法。
2. 布局组件包含顶部栏、侧边栏和内容区，内容区必须使用 `Outlet`。
3. 首页使用索引路由，列表和设置使用相对路径声明。
4. 侧边栏导航使用 `NavLink`，当前页高亮。
5. 输入一个不存在的路径，展示 404 页面并提供返回首页入口。
6. 通过构建检查，无 TypeScript 报错。

#### 提交物

- 完整项目；
- 路由表代码；
- 三个页面与 404 页面截图；
- 路由结构说明文本图。

#### 验收标准

- 页面切换不整页刷新，外壳保持不变；
- NavLink 高亮正确；
- 错误路径能进入 404；
- 前进后退正常工作；
- 构建通过。

### 练习 2：条目列表与详情联动

#### 任务

实现条目列表页和详情页：列表点击进入详情，详情页通过动态参数展示数据，并支持命令式导航和来源回跳。

#### 步骤约束

1. 准备不少于 10 条带 id、标题、内容的模拟数据。
2. 列表项使用 `Link` 指向 `/items/:id`，详情页用 `useParams` 读取 id。
3. id 不存在时展示“条目不存在”的提示，不允许白屏。
4. 详情页提供“模拟删除后返回列表”按钮，在事件处理中使用 `useNavigate` 返回。
5. 列表页支持从详情页返回时仍停留在原滚动位置附近（记录你的实现方式）。
6. 所有参数读取包含存在性与类型检查。

#### 提交物

- 列表页与详情页代码；
- 数据文件；
- 正常详情与不存在 id 两种截图；
- 参数检查与导航逻辑说明。

#### 验收标准

- 详情内容随 id 正确变化；
- 非法 id 有兜底；
- 命令式导航路径正确；
- URL 可直接复制打开详情；
- 无类型错误。

### 练习 3：URL 驱动的筛选与受保护设置页

#### 任务

为列表页增加关键词和标签筛选，条件同步到查询参数；再把设置页改造为受保护路由，实现登录页与登录后回跳。

#### 步骤约束

1. 搜索框和标签筛选的值只从 `useSearchParams` 读取，不再用 useState 复制。
2. 空关键词时删除对应参数，保持地址栏整洁。
3. 筛选结果通过派生计算，空结果展示空态。
4. 设置页使用 `RequireAuth` 包裹，未登录访问时跳转 `/login` 并记录来源。
5. 登录页提供模拟登录按钮，成功后回跳来源页。
6. README 中说明生产部署时服务器 history 回退配置的必要性。

#### 提交物

- 筛选栏、列表、登录页、受保护路由代码；
- 不同筛选状态的 URL 与截图；
- 未登录访问与登录回跳的演示记录；
- 部署回退说明。

#### 验收标准

- 刷新后筛选条件不丢失，链接可分享；
- 前进后退能在筛选状态间切换；
- 空态正确；
- 未登录不能进入设置页，登录后准确回跳；
- 能说明前端守卫与后端鉴权的分工。

## 阶段验收作业

### 作业名称

多路由“知识管理后台”前端版

### 作业场景

团队需要一个可演示的知识管理后台前端：包含仪表盘、条目列表、条目详情、新建条目、登录与受保护设置。本阶段不接入真实后端，重点验证你是否真正掌握 SPA 路由：URL 是否表达页面、布局是否复用、查询参数是否可分享、权限路由是否完整。

### 提交物

```text
knowledge-router/
├── src/
│   ├── layouts/
│   │   └── AppLayout.tsx
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── ItemListPage.tsx
│   │   ├── ItemDetailPage.tsx
│   │   ├── ItemCreatePage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── LoginPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── components/
│   │   ├── SidebarNav.tsx
│   │   ├── ItemFilterBar.tsx
│   │   └── RequireAuth.tsx
│   ├── data/
│   │   └── mockItems.ts
│   ├── router/
│   │   └── index.tsx
│   ├── App.tsx
│   └── main.tsx
├── routing-design.md
└── README.md
```

必做内容：

1. 使用 data router 组织全部路由，AppLayout 作为布局路由，含顶部栏与侧边栏。
2. 列表页支持关键词与标签筛选，条件写入查询参数，刷新与分享后结果一致。
3. 详情页读取动态参数，非法 id 有明确提示。
4. 新建页提交（模拟）成功后命令式跳转到新条目详情。
5. 设置页受保护，未登录跳转登录页并在登录后回跳。
6. `routing-design.md` 包含完整路由表说明、URL 示例清单和一条“history 原理”解释。

### 演示步骤

学员在 15 分钟内完成：

1. 从 `/` 开始演示各页面切换，指出外壳未重建。
2. 在列表页设置关键词与标签筛选，刷新页面并把链接复制到新标签页打开。
3. 使用浏览器前进后退，展示筛选状态切换。
4. 打开一个存在的详情，再输入一个非法 id，演示兜底。
5. 退出登录后直接访问 `/settings`，演示拦截、登录与回跳。
6. 访问不存在路径，演示 404。
7. 讲解 routing-design.md 中一条路由的匹配与渲染层级。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| SPA 与 history 理解 | 15 | 能解释不刷新跳转原理与服务器回退配置 |
| 路由表与布局 | 25 | data router 使用正确，嵌套、索引、相对路径、Outlet 全部规范 |
| 参数与查询状态 | 25 | useParams 兜底完整，useSearchParams 单一数据源，URL 可分享 |
| 导航 | 15 | Link/NavLink/useNavigate 场景选择正确，无整页刷新 |
| 404 与权限 | 10 | 通配兜底与受保护路由、登录回跳完整 |
| 文档与工程 | 10 | routing-design 清晰，构建通过，README 可复现 |

细分评分：

- SPA 与 history：原理 8 分，回退配置 7 分。
- 路由表与布局：RouterProvider 接入 7 分，嵌套与索引 10 分，Outlet 8 分。
- 参数与查询状态：动态参数 8 分，查询参数单一来源 10 分，分享与刷新 7 分。
- 导航：NavLink 5 分，Link 5 分，useNavigate 5 分。
- 404 与权限：404 4 分，受保护与回跳 6 分。
- 文档与工程：设计文档 5 分，构建 3 分，README 2 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过：

1. 页面切换通过普通 `<a>` 或手动 `window.location` 赋值导致整页刷新。
2. 页面只靠 useState 切换，没有真实 URL，详情与筛选无法通过链接复现。
3. 嵌套路由遗漏 Outlet 导致子页面无法渲染。
4. 筛选条件在 state 与 URL 中双写，前进后退时界面不一致。
5. 详情页不处理非法或缺失参数，出现白屏或运行时报错。
6. 受保护页面未登录可直接进入，或登录后不能回跳来源页。
7. 项目无法按 README 启动，或生产构建未通过。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解 SPA 与 history | routing-design.md 与现场原理讲解 |
| 掌握 data router 接入 | router 目录与 RouterProvider 代码 |
| 设计路由表与布局 | AppLayout、嵌套与索引路由、Outlet |
| 处理动态参数 | ItemDetailPage 与非法 id 演示 |
| 正确使用导航组件 | SidebarNav 与新建页跳转代码 |
| 查询参数即状态 | ItemFilterBar 与可分享链接演示 |
| 理解 loader 定位 | routing-design.md 中的说明与代码 |
| 实现 404 与受保护路由 | NotFoundPage、RequireAuth、登录回跳演示 |

### 提交前自检

- [ ] 全部内部跳转使用 React Router，没有整页刷新。
- [ ] 每个“页面视图”都有对应 URL。
- [ ] 布局路由中 Outlet 已放置，索引路由已声明。
- [ ] 详情参数包含存在性检查与兜底 UI。
- [ ] 筛选条件只存于 URL，刷新、分享、前进后退均正确。
- [ ] 命令式导航仅用于动作完成后的跳转。
- [ ] 未登录访问受保护页会被拦截，登录后准确回跳。
- [ ] 404 页面可在任意错误路径出现。
- [ ] README 包含服务器 history 回退的部署说明。
- [ ] `npm run build` 无错误。
