# 01 — React Router 数据加载与嵌套路由

## 学习目标

- 理解前端路由的本质：Hash 模式 vs History 模式的区别与适用场景
- 掌握 React Router v6 核心组件：`BrowserRouter`、`Routes`、`Route`、`Link`、`NavLink`、`Navigate`、`Outlet`
- 熟练使用 `useParams`、`useSearchParams` 获取路由参数
- 能用 `Outlet` 实现嵌套路由和布局路由
- 掌握编程式导航：`useNavigate`、`redirect`
- 会写路由守卫（Protected Route）控制页面访问权限
- 掌握 `React.lazy` + `Suspense` 实现路由级代码分割
- 会用 loader / action 模式实现路由级数据加载与变更

---

## 内容讲解

### 一、前端路由的本质：Hash vs History

在 SPA 中，页面切换不会触发整页刷新，而是由 JS 监听 URL 变化后替换 DOM 内容。浏览器的 URL 变化方式有两种：

**Hash 模式**：URL 带 `#`，如 `https://example.com/#/article/123`。`#` 后面的部分叫 hash，它的变化不会向服务器发请求。JS 通过 `window.onhashchange` 监听变化。

```js
// Hash 模式的底层原理
window.addEventListener('hashchange', () => {
  console.log('当前 hash:', window.location.hash); // "/article/123"
});
```

**History 模式**：URL 更干净，没有 `#`，如 `https://example.com/article/123`。依赖 HTML5 History API 中的 `pushState` 和 `replaceState` 方法，配合 `popstate` 事件监听：

```js
// History 模式的底层原理
// 改变 URL 但不刷新页面
window.history.pushState({}, '', '/article/123');
// 监听浏览器前进/后退
window.addEventListener('popstate', () => {
  console.log('当前路径:', window.location.pathname);
});
```

关键区别和对比如下：

| 维度 | Hash 模式 | History 模式 |
|------|----------|-------------|
| URL 外观 | `/#/article/123` | `/article/123` |
| 服务器要求 | 不需要配置 | **必须配置 fallback**：所有路径都返回 index.html |
| 锚点定位 | 冲突，`#` 被占用 | 不影响页内锚点 |
| SEO | 较差（# 后内容不被爬虫识别） | 相对友好 |
| create 方法 | `createHashRouter` | `createBrowserRouter` |

> ⚠️ **常见坑**：用 History 模式部署到 Nginx 后刷新子路由页面报 404。这是因为刷新时浏览器向服务器请求 `/article/123`，服务器上不存在这个路径。Nginx 需要加 `try_files $uri $uri/ /index.html;`。

---

### 二、React Router 的核心组件

React Router v6 引入了声明式路由写法。先看一个最小可跑的例子：

```jsx
// main.jsx
import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
```

```jsx
// App.jsx —— 路由配置的核心
import { Routes, Route, Link, NavLink, Navigate, Outlet, useParams, useSearchParams, useNavigate } from 'react-router-dom';

// ------ 1. Link —— 声明式导航 ------
// Link 最终渲染为 <a> 标签，但点击不会刷新页面
function NavBar() {
  return (
    <nav>
      <Link to="/">首页</Link>
      {/* NavLink 比 Link 多一个 "active" 能力：当前匹配的链接自动加类名 */}
      <NavLink
        to="/articles"
        className={({ isActive }) => (isActive ? 'text-blue-600 font-bold' : '')}
      >
        文章列表
      </NavLink>
      <NavLink to="/about">关于</NavLink>
    </nav>
  );
}

// ------ 2. Navigate —— 声明式重定向 ------
// 渲染即跳转，常用于"兜底重定向"和"条件跳转"
// <Navigate to="/" replace />   replace 表示替换历史记录，用户回退不会回到此页

// ------ 3. Outlet —— 子路由的"占位符" ------
// 嵌套路由的子组件会渲染在 Outlet 所在的位置
function MainLayout() {
  return (
    <div>
      <NavBar />
      <main style={{ padding: 20 }}>
        <Outlet />  {/* 子路由的内容会出现在这里 */}
      </main>
    </div>
  );
}

// ------ 4. Routes + Route —— 路由表 ------
export default function App() {
  return (
    <Routes>
      {/* 嵌套路由：父路由不写 index，用 Outlet 承载子路由 */}
      <Route path="/" element={<MainLayout />}>
        {/* index = true 表示"父路径精确匹配时渲染的默认子路由" */}
        <Route index element={<HomePage />} />
        <Route path="articles" element={<ArticleListPage />} />
        <Route path="articles/:id" element={<ArticleDetailPage />} />
        <Route path="about" element={<AboutPage />} />
        {/* 兜底：匹配不到的路径 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* 独立路由（不属于 MainLayout 的布局） */}
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}
```

> ⚠️ **常见坑**：v5 中的 `<Switch>` 和 `component={...}` 已弃用。v6 用 `<Routes>` 替代 `<Switch>`，用 `element={...}` 替代 `component={...}`。如果你在掘金/CSDN 看到 `component={}` 写法，那是 v5 的过时内容。

---

### 三、路由参数：useParams 与 useSearchParams

React Router 提供两个 Hook 来读取 URL 中的参数：

```jsx
// ------ useParams —— 读取路径参数（:id） ------
import { useParams } from 'react-router-dom';

function ArticleDetailPage() {
  // 路由路径: "/articles/:id"
  // 访问 URL: "/articles/42"
  const { id } = useParams();  // id = "42"（注意：永远是字符串）
  console.log('文章 ID:', id);

  // 根据 id 请求数据
  const [article, setArticle] = useState(null);
  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then(res => res.json())
      .then(setArticle);
  }, [id]); // id 变化时重新请求

  if (!article) return <p>加载中...</p>;
  return <h2>{article.title}</h2>;
}

// ------ useSearchParams —— 读取查询字符串（?key=value） ------
import { useSearchParams } from 'react-router-dom';

function ArticleListPage() {
  // 访问 URL: "/articles?page=2&keyword=react"
  const [searchParams, setSearchParams] = useSearchParams();

  const page = searchParams.get('page') || '1';        // "2"
  const keyword = searchParams.get('keyword') || '';    // "react"

  // 修改查询参数（像 useState 一样使用 setter）
  const goToNextPage = () => {
    setSearchParams({ page: String(Number(page) + 1), keyword });
  };

  return (
    <div>
      <h2>文章列表 - 第 {page} 页</h2>
      {keyword && <p>搜索关键词：{keyword}</p>}
      <button onClick={goToNextPage}>下一页</button>
    </div>
  );
}
```

> ⚠️ **常见坑**：`useParams` 返回的 `id` 是字符串 `"42"`，不是数字 `42`。做比较时用 `Number(id)` 或 `=== "42"`，别直接用 `id === 42`，永远不成立。

---

### 四、嵌套路由和布局路由：Outlet

嵌套路由让你把共享的 UI 结构（头部、侧栏、底部）抽到父路由中，子路由只负责自身内容。这是减少代码重复的核心手段：

```jsx
function MainLayout() {
  return (
    <div className="app-container">
      <header className="app-header">🌐 我的博客</header>
      <div className="app-body">
        <aside className="sidebar">
          <NavLink to="/">首页</NavLink>
          <NavLink to="/articles">文章</NavLink>
        </aside>
        <main className="content">
          <Outlet />  {/* HomePage / ArticleListPage / ArticleDetailPage 轮流渲染 */}
        </main>
      </div>
      <footer>© 2026 My Blog</footer>
    </div>
  );
}

// 路由结构
<Route path="/" element={<MainLayout />}>
  <Route index element={<HomePage />} />
  <Route path="articles" element={<ArticleListPage />} />
  <Route path="articles/:id" element={<ArticleDetailPage />} />
  {/* 注意：:id 路由必须放在 articles 子路由后面，否则 "new" 会被当成 id */}
</Route>
```

> ⚠️ **常见坑**：`/articles/:id` 和 `/articles/new` 同时存在时，把 `/articles/new` 的路由放在 `/articles/:id` 前面。React Router v6 的匹配和 v5 不同——不再使用 `exact`，而是用更智能的排名算法，但动态参数 `:id` 依然可能吞掉静态路径。

**多层嵌套也是可以的**：

```jsx
<Route path="settings" element={<SettingsLayout />}>
  <Route index element={<ProfileSettings />} />
  <Route path="account" element={<AccountSettings />} />
</Route>
```

---

### 五、编程式导航：useNavigate 与 redirect

除了 `<Link>`，你还可以在代码中跳转：

```jsx
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    const success = await loginApi({ username, password });
    if (success) {
      // 登录成功后跳转到首页，replace = true 表示替换历史记录
      navigate('/', { replace: true });
    }
  };

  const goBack = () => {
    navigate(-1);  // 回退一页，等价于 window.history.back()
  };

  return (
    <div>
      <button onClick={handleLogin}>登录</button>
      <button onClick={goBack}>返回</button>
    </div>
  );
}
```

对于 loader 中无法使用 Hook 的场景，用 `redirect` 工具函数：

```jsx
import { redirect } from 'react-router-dom';

export function loader() {
  const user = getUserFromStorage();
  if (!user) {
    // loader 中不能调用 useNavigate，用 redirect 替代
    return redirect('/login');
  }
  return null;
}
```

> ⚠️ **常见坑**：在组件的 render 中写 `navigate('/')` 会导致无限循环重渲染。组件首次渲染 → navigate 触发 → 组件卸载再挂载 → 再次 navigate → 死循环。导航逻辑必须放在 `useEffect` 或事件回调里。

---

### 六、路由守卫：Protected Route

路由守卫保证未登录用户无法访问需要权限的页面。实现方式是把需要保护的路由包在一个检查组件里：

```jsx
import { Navigate, Outlet } from 'react-router-dom';

/**
 * ProtectedRoute —— 路由守卫组件
 * 检查是否有 token，没有就重定向到登录页，并记录"原本想去哪"
 */
function ProtectedRoute() {
  const token = localStorage.getItem('token');

  if (!token) {
    // state 传递当前路径，登录成功后可以跳回来
    return <Navigate to="/login" state={{ from: window.location.pathname }} replace />;
  }

  // 有 token，正常渲染子路由
  return <Outlet />;
}

// 在路由表中使用
<Routes>
  <Route path="/login" element={<LoginPage />} />

  {/* 需要登录才能访问的路由 */}
  <Route element={<ProtectedRoute />}>
    <Route path="/" element={<MainLayout />}>
      <Route index element={<HomePage />} />
      <Route path="articles" element={<ArticleListPage />} />
      <Route path="articles/:id" element={<ArticleDetailPage />} />
    </Route>
    <Route path="/settings" element={<SettingsPage />} />
  </Route>

  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

登录成功后跳回原页面：

```jsx
function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';  // 获取被拦截前的路径

  const handleLogin = async () => {
    const success = await loginApi(credentials);
    if (success) {
      localStorage.setItem('token', 'xxx');
      navigate(from, { replace: true }); // 跳回原本想去的页面
    }
  };
  // ...
}
```

---

### 七、懒加载路由：React.lazy + Suspense

大型应用中，把所有页面打包进一个 JS bundle 会导致首屏加载缓慢。用 `React.lazy` 和 `Suspense` 实现路由级别的代码分割，让每个页面按需加载：

```jsx
import { lazy, Suspense } from 'react';

// 每个页面独立 chunk，只有访问时才下载
const HomePage = lazy(() => import('./pages/HomePage'));
const ArticleListPage = lazy(() => import('./pages/ArticleListPage'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function App() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="articles" element={<ArticleListPage />} />
          <Route path="articles/:id" element={<ArticleDetailPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

// 加载占位：避免白屏，给用户一个视觉反馈
function LoadingSkeleton() {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <p>页面加载中...</p>
    </div>
  );
}
```

---

### 八、React Router 的 loader 和 action 模式

React Router v6.4 引入了 `createBrowserRouter` + `loader` / `action` 的模式。核心思想：**把数据请求从组件生命周期中抽出来，挂载到路由定义上**。好处是数据在组件渲染前就拿到了，不再需要 `useEffect` + loading 状态的手动管理。

```jsx
import { createBrowserRouter, RouterProvider, useLoaderData, useActionData, Form } from 'react-router-dom';

// ------ 定义 loader：组件挂载前自动调用，数据返回后才渲染组件 ------
async function articlesLoader() {
  const response = await fetch('/api/articles');
  // loader 可以做预判：如果请求失败，直接抛异常，由 errorElement 兜底
  if (!response.ok) throw new Response('获取文章列表失败', { status: 500 });
  return response.json();
}

async function articleDetailLoader({ params }) {
  // params 包含路径中 :id 的值
  const response = await fetch(`/api/articles/${params.id}`);
  if (!response.ok) throw new Response('文章不存在', { status: 404 });
  return response.json();
}

// ------ 定义 action：表单提交时触发，处理增删改操作 ------
async function createArticleAction({ request }) {
  const formData = await request.formData();
  const title = formData.get('title');
  const content = formData.get('content');

  const response = await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });

  if (!response.ok) return { error: '创建失败，请重试' };
  return redirect('/articles');  // action 中可以直接 redirect
}

// ------ 组件中使用 loader 数据 ------
function ArticleListPage() {
  const articles = useLoaderData();  // loader 返回的数据直接拿到，无需 useState+useEffect
  return (
    <ul>
      {articles.map(a => (
        <li key={a.id}><Link to={`/articles/${a.id}`}>{a.title}</Link></li>
      ))}
    </ul>
  );
}

function CreateArticlePage() {
  const actionData = useActionData(); // action 的返回值（比如错误信息）
  return (
    <Form method="post">  {/* <Form> 来自 react-router-dom，自动阻止默认提交 */}
      <input name="title" placeholder="文章标题" required />
      <textarea name="content" placeholder="文章内容" required />
      <button type="submit">发布</button>
      {actionData?.error && <p style={{ color: 'red' }}>{actionData.error}</p>}
    </Form>
  );
}

// ------ 使用 createBrowserRouter 注册 ------
const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    errorElement: <ErrorBoundary />,  // 路由级错误边界
    children: [
      { index: true, element: <HomePage /> },
      {
        path: 'articles',
        element: <ArticleListPage />,
        loader: articlesLoader,        // 👈 数据加载挂载在路由上
      },
      {
        path: 'articles/new',
        element: <CreateArticlePage />,
        action: createArticleAction,   // 👈 数据变更挂载在路由上
      },
      {
        path: 'articles/:id',
        element: <ArticleDetailPage />,
        loader: articleDetailLoader,
      },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
);
```

> ⚠️ **常见坑**：`createBrowserRouter` 和 `<BrowserRouter>` 是两套不同的 API，不能混用。如果你用 `createBrowserRouter`，就必须用 `<RouterProvider>` 渲染，不能再用 `<BrowserRouter>` 包一层。

**loader vs useEffect 什么时候用哪个？**

- loader 适合"渲染前必须拿到数据"的场景，如文章详情页。减少 loading 闪烁。
- useEffect 适合"数据不是页面必要条件"的场景，如侧边栏的推荐列表，加载失败不影响主内容。

---

### 九、实战：搭建带导航守卫和面包屑的多页面博客应用

下面是一个完整的博客 SPA 骨架，涵盖首页、文章列表、文章详情、关于、404 五个页面，带登录守卫和面包屑导航。

```jsx
// =================== main.jsx ===================
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const MainLayout = lazy(() => import('./layouts/MainLayout'));
const HomePage = lazy(() => import('./pages/HomePage'));
const ArticleListPage = lazy(() => import('./pages/ArticleListPage'));
const ArticleDetailPage = lazy(() => import('./pages/ArticleDetailPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));

import { articlesLoader, articleDetailLoader } from './loaders';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Suspense><LoginPage /></Suspense>,
  },
  {
    // ProtectedRoute 使用 Outlet 来渲染子路由，所以子路由可以嵌套在里面
    element: <Suspense><ProtectedRoute /></Suspense>,
    children: [
      {
        path: '/',
        element: <Suspense><MainLayout /></Suspense>,
        // errorElement 兜底当前路由树的未处理异常
        errorElement: <ErrorPage />,
        children: [
          { index: true, element: <Suspense><HomePage /></Suspense> },
          {
            path: 'articles',
            element: <Suspense><ArticleListPage /></Suspense>,
            loader: articlesLoader,
          },
          {
            path: 'articles/:id',
            element: <Suspense><ArticleDetailPage /></Suspense>,
            loader: articleDetailLoader,
          },
          {
            path: 'about',
            element: <Suspense><AboutPage /></Suspense>,
          },
          { path: '*', element: <Suspense><NotFoundPage /></Suspense> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')).render(
  <RouterProvider router={router} />
);
```

```jsx
// =================== components/Breadcrumb.jsx ===================
import { Link, useLocation } from 'react-router-dom';

/**
 * 面包屑组件
 * 根据当前路径自动生成面包屑层级
 * 例如 /articles/42 → 首页 > 文章列表 > 文章详情
 */
const PATH_MAP = {
  'articles': '文章列表',
  'about': '关于',
};

export default function Breadcrumb() {
  const location = useLocation();
  // 拆成片段 ["articles", "42"]
  const segments = location.pathname.split('/').filter(Boolean);

  // 动态构建面包屑
  const crumbs = [{ label: '首页', path: '/' }];
  let accumulatedPath = '';
  segments.forEach(seg => {
    accumulatedPath += `/${seg}`;
    // 如果当前段是纯数字，说明是文章 ID 段
    const label = /^\d+$/.test(seg) ? '文章详情' : (PATH_MAP[seg] || seg);
    crumbs.push({ label, path: accumulatedPath });
  });

  return (
    <nav aria-label="面包屑导航">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path}>
          {i > 0 && ' > '}
          {i === crumbs.length - 1 ? (
            <span>{crumb.label}</span>  // 最后一项不可点击
          ) : (
            <Link to={crumb.path}>{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
```

```jsx
// =================== components/ProtectedRoute.jsx ===================
import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute() {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    // 记录当前路径，登录后跳回
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
```

```jsx
// =================== layouts/MainLayout.jsx ===================
import { Outlet } from 'react-router-dom';
import Breadcrumb from '../components/Breadcrumb';
import NavBar from '../components/NavBar';

export default function MainLayout() {
  return (
    <div className="app">
      <NavBar />
      <Breadcrumb />
      <main style={{ padding: '24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
```

```jsx
// =================== pages/ArticleDetailPage.jsx ===================
import { useLoaderData, Link } from 'react-router-dom';

export default function ArticleDetailPage() {
  const article = useLoaderData(); // 来自 loader 的数据

  return (
    <article>
      <h1>{article.title}</h1>
      <p className="meta">作者：{article.author} | 发布于：{article.createdAt}</p>
      <div className="content">{article.content}</div>
      <Link to="/articles">← 返回文章列表</Link>
    </article>
  );
}
```

```jsx
// =================== loaders/index.js ===================
export async function articlesLoader() {
  const res = await fetch('/api/articles');
  if (!res.ok) throw new Response('加载文章列表失败', { status: res.status });
  return res.json();
}

export async function articleDetailLoader({ params }) {
  const res = await fetch(`/api/articles/${params.id}`);
  if (res.status === 404) throw new Response('文章不存在', { status: 404 });
  if (!res.ok) throw new Response('加载失败', { status: res.status });
  return res.json();
}

// =================== ErrorPage.jsx ===================
import { useRouteError, Link } from 'react-router-dom';

function ErrorPage() {
  const error = useRouteError();
  const status = error?.status || 500;
  const message = status === 404 ? '页面不存在' : '服务器出错了，请稍后重试';

  return (
    <div style={{ textAlign: 'center', padding: 60 }}>
      <h1>{status}</h1>
      <p>{message}</p>
      <Link to="/">← 回首页</Link>
    </div>
  );
}
```

---

## 常见问题

**Q1：Hash 模式和 History 模式到底该选哪个？**

大多数项目优先选 History 模式（URL 更干净）。但以下场景用 Hash：① 部署环境无法配置服务器（如 GitHub Pages 发布 demo）；② 需要兼容不支持 History API 的古董浏览器。

**Q2：为什么用了 `useParams` 取到的值是 `undefined`？**

检查两点：① 路由路径中是否定义了 `:param`（如 `/articles/:id`）；② 组件是否在对应 `<Route>` 内部——`useParams` 只能在 `<Route>` 的 `element` 中或其子组件里使用，在 `<Route>` 外面调用拿不到值。

**Q3：`NavLink` 和 `Link` 有什么区别？**

`NavLink` 是 `Link` 的增强版，多了 `className` / `style` 的回调形式，可以获取 `isActive` / `isPending` 状态来高亮当前激活的链接。纯跳转场景用 `Link` 即可，导航菜单用 `NavLink`。

**Q4：刷新后数据丢了怎么办？**

React Router 本身不负责状态持久化。你需要把关键数据存到 `localStorage`、`sessionStorage`，或者通过 URL 参数（`useSearchParams`）和路由参数（`useParams`）来"记忆"状态。loader 模式的好处是：每次访问路由都会重新执行 loader，数据自动刷新。

**Q5：嵌套路由还有没有更深的层级？可以有三级、四级嵌套吗？**

可以。`/settings/account/security` 对应三层嵌套，每一层父组件里放一个 `<Outlet />` 即可。不过太深的嵌套会让路由配置变得难以维护，通常 2-3 层是合理的。

**Q6：`useNavigate` 和 `<Navigate>` 什么时候用哪个？**

`<Navigate>` 适合声明式场景——渲染即跳转（如"未登录就渲染重定向"）。`useNavigate` 适合命令式场景——用户点击按钮、异步操作完成后跳转。

**Q7：`React.lazy` 和 loader 的数据加载有什么区别？**

`React.lazy` 管的是"JS 代码的下载"（代码分割），loader 管的是"数据的获取"（API 请求）。两者互不冲突——一个页面可以同时用 `lazy` 做代码分割 + loader 做数据预取。

**Q8：为什么用 `createBrowserRouter` 后页面一片空白？**

最常见的原因是忘记用 `<RouterProvider>` 渲染。`createBrowserRouter` 返回的 router 对象必须传给 `<RouterProvider router={router} />`，不能像 v5 那样包 `<BrowserRouter>`。

---

## 实操作业

### 🟢 基础：实现含路由的 Todo 应用

用 `createBrowserRouter` 搭一个三个页面的应用：首页（显示欢迎语）、Todo 列表页（展示预设的数组数据）、Todo 详情页（根据 `:id` 从数组中找到对应项展示）。要求：①侧栏导航用 `NavLink` 高亮当前项；②至少实现一级嵌套路由。

### 🟡 进阶：给上面的 Todo 应用加上完整功能

在基础作业之上添加：① 登录页面（不需真实鉴权，用户名 + 密码任一非空即算登录成功，存 `localStorage`）；② `ProtectedRoute` 守卫 Todo 列表和详情页，未登录重定向到登录页；③ 登录成功后跳回被拦截前的页面；④ 使用 `React.lazy` + `Suspense` 懒加载所有页面组件；⑤ `/todo/new` 页面用 `<Form>` + action 提交新 Todo（提交后存到 `localStorage`，列表页从 `localStorage` 读取即可）。

### 🔴 挑战：博客应用的数据驱动改造

基于进阶作业的架构，将 Todo 应用改造为博客应用，增加：① **面包屑导航**（首页 > 文章列表 > 文章详情）；② **loader 实战**：文章列表和详情改用 loader 从 JSONPlaceholder 获取（`https://jsonplaceholder.typicode.com/posts` 作为文章列表，`/posts/:id` 作为单篇详情）；③ **ErrorBoundary**：页面级别的 `errorElement`，加载失败时展示友好错误页；④ **布局切换**：文章编辑页 `/articles/edit/:id` 使用独立布局（无侧栏，全宽编辑区）。

---

## 本节小结

- **路由本质**：SPA 通过监听 URL 变化切换内容，Hash 模式不需要服务器配置，History 模式 URL 更干净但需要服务器 fallback。
- **React Router v6**：用 `<Routes>` + `<Route>` 声明路由树，用 `<Outlet>` 画嵌套插槽，用 `useParams` / `useSearchParams` 拿参数。
- **路由守卫**：包一层检查组件 + `<Navigate>` 重定向 + `location.state` 记住来路，是前端权限控制的最小实现。
- **懒加载**：`React.lazy(() => import('...'))` + `<Suspense fallback={...}>` 降低首屏 JS 体积。
- **loader / action 模式**：把数据请求从组件移回路由层，组件直接拿数据，告别手动 loading 管理。
- **避坑核心**：History 模式要配 Nginx fallback、useParams 返回值是字符串、navigate 不能放 render 里、createBrowserRouter 要配 RouterProvider。