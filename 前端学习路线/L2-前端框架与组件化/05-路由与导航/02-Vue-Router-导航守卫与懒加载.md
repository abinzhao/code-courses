# 02 — Vue Router 导航守卫与懒加载

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[01 — React Router 数据加载与嵌套路由](./01-React-Router-数据加载与嵌套路由.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Vue](https://vuejs.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 掌握 Vue Router 的核心概念：`createRouter`、`createWebHistory`、`createWebHashHistory`
- 熟练使用 `router-link`、`router-view` 构建路由骨架
- 理解 `$route.params` 与 `useRoute` 的关系和适用场景
- 能用嵌套路由和命名视图构建复杂页面布局
- 掌握编程式导航：`router.push`、`router.replace`、`router.go`
- 深入理解三级导航守卫体系并能在实战中正确使用
- 理解路由元信息（meta）的应用场景
- 会用动态 `import()` 实现路由级懒加载

---

## 内容讲解

### 一、Vue Router 的核心概念

Vue Router 4 完全为 Vue 3 设计，使用 Composition API 风格。和 React Router 一样，底层依赖浏览器的 History API，但在设计哲学上有鲜明差异：Vue Router 是**官方维护的、深度集成到 Vue 响应式系统中的路由方案**，路由参数天然是响应式的。

先看最小可运行的结构：

```js
// =================== router/index.js ===================
import { createRouter, createWebHistory } from 'vue-router';

// 路由配置：每条路由是一个对象，核心字段 path、component
const routes = [
  { path: '/', component: () => import('../views/Home.vue') },
  { path: '/about', component: () => import('../views/About.vue') },
];

// createRouter：创建路由实例
// createWebHistory：History 模式（干净 URL）
const router = createRouter({
  history: createWebHistory(),  // 等价于 React Router 的 BrowserRouter
  routes,                       // 简写，等价于 routes: routes
});

export default router;
```

```js
// =================== main.js ===================
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(router);   // 🚨 必须 .use(router)，否则整个路由系统不工作
app.mount('#app');
```

**Hash 模式 vs History 模式**：和 React Router 一致，区别在于创建方式：

```js
// Hash 模式 —— URL 带 #，不需要服务器配置
import { createWebHashHistory } from 'vue-router';
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// History 模式 —— URL 干净，需要服务器配置 fallback
import { createWebHistory } from 'vue-router';
const router = createRouter({
  history: createWebHistory(),
  routes,
});
```

---

### 二、router-link 和 router-view

```vue
<!-- ====== App.vue —— 路由的骨架 ====== -->
<template>
  <div id="app">
    <nav>
      <!--
        router-link 最终渲染为 <a> 标签
        to 可以是字符串路径，也可以是带参数的对象
        active-class / exact-active-class 控制激活态的 CSS 类名
      -->
      <router-link to="/" exact-active-class="text-blue-600">首页</router-link>
      <router-link to="/dashboard" active-class="font-bold">仪表盘</router-link>
      <router-link to="/users" active-class="font-bold">用户管理</router-link>
      <router-link
        :to="{ name: 'settings' }"
        active-class="font-bold"
      >
        设置
      </router-link>
    </nav>

    <!--
      router-view 是路由的"出口"
      当前匹配的路由组件渲染在这里
      相当于 React Router 的 Outlet，但比 Outlet 多了命名视图的能力
    -->
    <router-view />
  </div>
</template>
```

`router-link` 常用 props 一览：

| 属性 | 说明 | 示例 |
|------|------|------|
| `to` | 目标路由，字符串或对象 | `to="/users"` 或 `:to="{ name: 'user', params: { id: 1 } }"` |
| `replace` | 替换当前历史记录，不回退 | `to="/login" replace` |
| `active-class` | 匹配时激活的 CSS 类 | `active-class="active"` |
| `exact-active-class` | 精确匹配时激活的 CSS 类 | `exact-active-class="exact"` |
| `custom` | 自定义渲染内容 + `v-slot` | `custom v-slot="{ href, isActive, navigate }"` |

> ⚠️ **常见坑**：`router-link` 的 `to` 如果写成 `to="settings"` 会被当成相对路径拼接，而不是跳转到 `/settings`。始终以 `/` 开头写绝对路径，或使用命名路由 `:to="{ name: 'settings' }"`。

---

### 三、路由参数：$route.params 与 useRoute

Vue Router 提供两种方式访问当前路由信息：

```vue
<!-- ====== Options API：通过 this.$route 访问 ====== -->
<template>
  <div>
    <h1>用户详情 #{{ $route.params.id }}</h1>
    <p>来源页面：{{ $route.query.from }}</p>
  </div>
</template>

<script>
export default {
  created() {
    // $route.params 是响应式的——URL 变化，这里自动更新
    console.log('用户 ID:', this.$route.params.id);
  },
};
</script>
```

```vue
<!-- ====== Composition API：通过 useRoute 访问 ====== -->
<script setup>
import { useRoute } from 'vue-router';
import { computed } from 'vue';

// useRoute() 返回的是响应式 ref 包装的路由对象
const route = useRoute();

// 路径参数：/users/:id → route.params.id 是响应式的
const userId = computed(() => route.params.id);

// 查询参数：/users?page=2 → route.query.page 也是响应式的
const currentPage = computed(() => Number(route.query.page) || 1);
</script>

<template>
  <div>
    <h1>用户详情 #{{ userId }}</h1>
    <p>当前第 {{ currentPage }} 页</p>
  </div>
</template>
```

> ⚠️ **常见坑**：Options API 中不要解构 `this.$route`——`const { params } = this.$route` 会丢失响应性。Vue Router 4 推荐在 Composition API 中用 `useRoute()`，但也不要在 `setup` 的顶层直接解构，始终通过 `computed` 或直接 `route.params.xxx` 访问。

**路由配置中的 params 定义**：

```js
const routes = [
  // :id 是动态路径参数，匹配 /users/123、/users/abc 等
  { path: '/users/:id', component: UserDetail },

  // ? 表示可选参数——/users 和 /users/123 都匹配
  { path: '/users/:id?', component: UserDetail },

  // 正则约束：id 只能是数字
  { path: '/users/:id(\\d+)', component: UserDetail },

  // * 通配符：匹配任意路径
  { path: '/:pathMatch(.*)*', component: NotFound },
];
```

---

### 四、嵌套路由和命名视图

**嵌套路由**是 Vue Router 最核心的布局手段。和 React Router 的 `<Route>` 嵌套 + `<Outlet>` 完全同理，只是 Vue 用 `children` + `<router-view>`：

```js
// ====== router/index.js ======
const routes = [
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    children: [
      // /admin → AdminLayout 的 <router-view> 中渲染 Dashboard
      { path: '', component: () => import('../views/Dashboard.vue') },
      // /admin/users → 同上
      { path: 'users', component: () => import('../views/UserList.vue') },
      // /admin/users/:id → 同上
      { path: 'users/:id', component: () => import('../views/UserDetail.vue') },
    ],
  },
];
```

```vue
<!-- ====== layouts/AdminLayout.vue ====== -->
<template>
  <div class="admin-layout">
    <aside class="sidebar">
      <router-link to="/admin">仪表盘</router-link>
      <router-link to="/admin/users">用户管理</router-link>
    </aside>
    <main class="content">
      <router-view />  <!-- Dashboard / UserList / UserDetail 渲染在这里 -->
    </main>
  </div>
</template>
```

**命名视图**是 Vue Router 独有的能力：同一个路由同时渲染多个组件到不同的出口。典型场景是"侧边栏 + 主内容 + 底部栏"这种多区域布局：

```vue
<!-- ====== App.vue ====== -->
<template>
  <div class="app">
    <!-- name="sidebar" 对应路由里 components.sidebar -->
    <router-view name="sidebar" />

    <!-- 不写 name 等于 name="default"，对应 components.default -->
    <router-view />

    <router-view name="footer" />
  </div>
</template>
```

```js
// ====== router/index.js ======
const routes = [
  {
    path: '/',
    // components（复数）同时渲染多个视图
    components: {
      default: () => import('../views/Home.vue'),        // → 默认 <router-view>
      sidebar: () => import('../views/Sidebar.vue'),     // → <router-view name="sidebar">
      footer: () => import('../views/Footer.vue'),       // → <router-view name="footer">
    },
  },
];
```

> ⚠️ **常见坑**：命名视图和嵌套路由不要混淆。命名视图解决的是"同一层级多个出口"，嵌套路由解决的是"父子层级一个出口"。大多数场景用嵌套路由就够了，命名视图在仪表盘类多区域页面才有用武之地。

---

### 五、编程式导航

在 JS 代码中控制页面跳转：

```vue
<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

// 字符串路径
function goToHome() {
  router.push('/');
}

// 命名路由 + 参数（推荐，路径变化时不需要改代码）
function goToUser(id) {
  router.push({ name: 'user', params: { id } });
}

// 带查询参数：/users?page=2&sort=asc
function goToPage(page) {
  router.push({ name: 'users', query: { page, sort: 'asc' } });
}

// replace：替换当前历史记录（用户不能回退）
function goToLogin() {
  router.replace({ name: 'login' });
}

// 历史栈前进/后退
function goBack() {
  router.go(-1);  // 后退一页
}
function goForward() {
  router.go(1);   // 前进一页
}
</script>

<!-- Options API 中通过 this.$router 访问 -->
<script>
export default {
  methods: {
    goToHome() {
      this.$router.push('/');
    },
  },
};
</script>
```

**push 和 replace 的核心区别**：

| | router.push | router.replace |
|---|---|---|
| 浏览器历史记录 | 新增一条 | 替换当前这条 |
| 用户点"后退" | 回到上一页 | 跳回到 replace 之前的页面 |
| 典型场景 | 正常页面跳转 | 登录成功后的重定向、表单提交后跳转 |

---

### 六、导航守卫体系（核心重点）

Vue Router 的导航守卫是三级体系，覆盖了从全局到路由再到组件的所有拦截点。这是 Vue Router 相比 React Router 最强大的差异化能力。

整个导航解析流程如下（按触发顺序）：

```
导航触发
  ↓
① 组件内 beforeRouteLeave（离开当前组件前）
  ↓
② 全局 beforeEach（全局前置守卫）
  ↓
③ 路由独享 beforeEnter（目标路由配置中的守卫）
  ↓
④ 组件内 beforeRouteEnter（进入目标组件前）
  ↓
⑤ 全局 beforeResolve（全局解析守卫，组件已准备好）
  ↓
⑥ 全局 afterEach（导航完成后的钩子）
  ↓
⑦ DOM 更新完成
```

#### 6.1 全局守卫

```js
// ====== router/index.js ======
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({ /* ... */ });

/**
 * beforeEach —— 全局前置守卫
 * 最常用的守卫，用于权限校验、登录状态检查
 *
 * 参数：
 *   to     —— 目标路由对象（要去哪）
 *   from   —— 来源路由对象（从哪来）
 *   next   —— 可选回调（Vue Router 4 已不强制调用，返回 false/路径即可）
 *
 * 返回值：
 *   false       —— 取消导航
 *   路由路径     —— 重定向到指定路径
 *   undefined   —— 放行（什么都不返回就是放行）
 */
router.beforeEach((to, from) => {
  const token = localStorage.getItem('token');

  // 如果要去的页面需要登录，且没有 token → 重定向到登录页
  if (to.meta.requiresAuth && !token) {
    // 把当前路径作为 query 参数传给登录页，登录成功后可以跳回来
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // 已登录用户访问登录页 → 直接跳到首页
  if (to.name === 'login' && token) {
    return { name: 'dashboard' };
  }

  // 放行
  return true;
});

/**
 * afterEach —— 全局后置钩子
 * 导航已完成，用于页面标题设置、埋点上报等
 * 不接受 next，也不影响导航本身
 */
router.afterEach((to) => {
  // 设置页面标题（结合路由元信息）
  document.title = to.meta.title || '管理后台';

  // 滚动到页面顶部
  window.scrollTo(0, 0);

  // 埋点上报（仅示意）
  console.log(`[PV] 页面访问：${to.fullPath}`);
});
```

#### 6.2 路由独享守卫

`beforeEnter` 是定义在路由配置中的守卫，只在进入该路由时触发一次：

```js
const routes = [
  {
    path: '/admin',
    component: AdminLayout,
    // beforeEnter 只对 /admin 生效，子路由的导航不触发它
    beforeEnter: (to, from) => {
      const role = localStorage.getItem('role');
      if (role !== 'admin') {
        // 非管理员不能进入后台
        return { name: 'forbidden' };
      }
    },
    children: [
      { path: 'users', component: UserList },
      { path: 'settings', component: Settings },
      // 🚨 注意：/admin/users 的导航不会触发父路由的 beforeEnter
      // 如果需要对所有子路由做权限校验，用全局 beforeEach
    ],
  },
];
```

> ⚠️ **常见坑**：`beforeEnter` 只在进入**该路由本身**时触发，导航到它的子路由（如从 `/admin/users` 切到 `/admin/settings`）不会触发父路由的 `beforeEnter`。要把权限校验覆盖所有 admin 子路由，用 `beforeEach` + `to.matched.some()` 检查路由链。

#### 6.3 组件内守卫

组件内守卫直接在 `.vue` 组件中定义，提供了最精细的控制：

```vue
<script>
export default {
  /**
   * beforeRouteEnter —— 进入组件前调用
   * 🚨 关键：此时组件实例还没创建，this 不可用！
   * 需要通过 next 回调来访问实例
   */
  beforeRouteEnter(to, from, next) {
    // 可以在这里根据路由参数请求数据
    const isAuthenticated = localStorage.getItem('token');
    if (!isAuthenticated) {
      next({ name: 'login' });
    } else {
      // next 的回调在组件挂载后执行，可以拿到 vm 实例
      next(vm => {
        // vm 就是组件实例，等价于 this
        vm.fetchUserData(to.params.id);
      });
    }
  },

  /**
   * beforeRouteUpdate —— 路由参数变化但组件被复用时调用
   * 典型场景：/users/1 → /users/2，同一个 UserDetail 组件被复用
   */
  beforeRouteUpdate(to, from) {
    // 这里 this 可用（组件已存在）
    this.fetchUserData(to.params.id);
  },

  /**
   * beforeRouteLeave —— 离开当前组件前调用
   * 典型场景：表单有未保存数据时提示用户确认离开
   */
  beforeRouteLeave(to, from) {
    // 返回 false 可以阻止导航
    if (this.hasUnsavedChanges) {
      const answer = window.confirm('还有未保存的内容，确定离开吗？');
      if (!answer) return false;
    }
  },
};
</script>
```

**在 Composition API（`<script setup>`）中**，组件内守卫通过 `onBeforeRouteLeave` 和 `onBeforeRouteUpdate` 使用：

```vue
<script setup>
import { ref } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';

const hasUnsavedChanges = ref(false);

// 路由参数变化时重新加载数据
onBeforeRouteUpdate((to, from) => {
  loadUser(to.params.id);
});

// 离开前检查
onBeforeRouteLeave((to, from) => {
  if (hasUnsavedChanges.value) {
    const answer = window.confirm('还有未保存的内容，确定离开吗？');
    if (!answer) return false;
  }
});
</script>
```

> ⚠️ **常见坑**：`<script setup>` 中没有 `beforeRouteEnter`（因为 `setup` 执行时组件已创建，不存在"进入前还没实例"的阶段）。需要用 `beforeRouteEnter` 的场景，改为用 Options API 的 `export default { beforeRouteEnter() {} }` 写在单独的 `<script>` 块中。

---

### 七、路由元信息（meta）

`meta` 是路由配置中的一个自由字段，你可以往里面塞任何自定义数据。最常见的用途是配合 `beforeEach` 做权限控制、页面标题、面包屑等：

```js
const routes = [
  {
    path: '/dashboard',
    component: Dashboard,
    meta: {
      requiresAuth: true,       // 是否需要登录
      title: '仪表盘',          // 页面标题
      icon: 'dashboard',        // 侧栏图标标识
      breadcrumb: ['首页', '仪表盘'], // 面包屑层级
      roles: ['admin', 'editor'], // 允许的角色列表
    },
  },
  {
    path: '/admin/users',
    component: UserList,
    meta: {
      requiresAuth: true,
      title: '用户管理',
      roles: ['admin'],         // 只有 admin 角色可见
    },
  },
  {
    path: '/login',
    component: Login,
    meta: { title: '登录', requiresAuth: false },
  },
];
```

在 `beforeEach` 中使用 meta：

```js
router.beforeEach((to, from) => {
  // 设置页面标题（所有页面统一处理）
  document.title = to.meta.title || '默认标题';

  // 权限校验
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token');
    if (!token) {
      return { name: 'login', query: { redirect: to.fullPath } };
    }

    // 角色校验
    const userRole = localStorage.getItem('role');
    const requiredRoles = to.meta.roles;
    if (requiredRoles && !requiredRoles.includes(userRole)) {
      return { name: 'forbidden' };
    }
  }
});
```

---

### 八、懒加载路由

Vue Router 的懒加载和 React Router 一样，利用 ES 动态 `import()` 实现代码分割。Vue 生态中这几乎是零配置的——Vite / Webpack 会自动识别 `import()` 并将每个路由组件拆成独立 chunk：

```js
const routes = [
  // ❌ 静态导入：所有页面打包进一个 JS 文件
  // import Home from '../views/Home.vue';
  // { path: '/', component: Home },

  // ✅ 动态导入：每个页面独立 chunk，访问时按需下载
  { path: '/',         component: () => import('../views/Home.vue') },
  { path: '/dashboard',component: () => import('../views/Dashboard.vue') },
  { path: '/users',    component: () => import('../views/UserList.vue') },
  { path: '/settings', component: () => import('../views/Settings.vue') },
];
```

**给 chunk 加名字**（方便调试和缓存分析）：

```js
// webpack 的魔法注释，Vite 也支持
const Dashboard = () => import(/* webpackChunkName: "dashboard" */ '../views/Dashboard.vue');

// 把一组相关页面打包到一个 chunk 中
const UserList   = () => import(/* webpackChunkName: "user-module" */ '../views/UserList.vue');
const UserDetail = () => import(/* webpackChunkName: "user-module" */ '../views/UserDetail.vue');
```

**配合 Suspense（Vue 3 内置）**给懒加载加 loading 态：

```vue
<template>
  <Suspense>
    <template #default>
      <router-view />
    </template>
    <template #fallback>
      <div class="loading">
        <div class="spinner" />
        <p>页面加载中...</p>
      </div>
    </template>
  </Suspense>
</template>
```

> ⚠️ **常见坑**：懒加载组件配合 `<Suspense>` 使用的前提是该组件的 `<script setup>` 中使用了顶层 `await`。如果组件内部没有异步 setup，`<Suspense>` 不会显示 fallback，路由切换时可能出现短暂白屏。解决方案是在 `router.beforeEach` 中手动处理 loading 状态。

---

### 九、实战：搭建带登录权限校验的多页面管理后台

下面是完整的管理后台路由骨架，覆盖登录、仪表盘、用户管理、设置、404 五个页面。

```js
// =================== router/index.js ===================
import { createRouter, createWebHistory } from 'vue-router';

/**
 * 路由配置
 * meta.requiresAuth: true 表示需要登录才能访问
 * meta.title: 页面标题，afterEach 中统一设置
 * 所有路由组件均使用动态 import 做懒加载
 */
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录', requiresAuth: false },
  },
  {
    path: '/',
    // 根路径重定向到仪表盘
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { title: '仪表盘', requiresAuth: true },
    children: [
      {
        // /dashboard → AdminLayout 的 <router-view> 渲染 DashboardHome
        path: '',
        name: 'dashboard-home',
        component: () => import('../views/DashboardHome.vue'),
      },
    ],
  },
  {
    path: '/users',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, roles: ['admin'] },
    children: [
      {
        path: '',
        name: 'users',
        component: () => import('../views/UserList.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: ':id',
        name: 'user-detail',
        component: () => import('../views/UserDetail.vue'),
        meta: { title: '用户详情' },
      },
    ],
  },
  {
    path: '/settings',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'settings',
        component: () => import('../views/Settings.vue'),
        meta: { title: '系统设置' },
      },
    ],
  },
  {
    // 404 兜底——必须放在最后
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFound.vue'),
    meta: { title: '404 - 页面不存在' },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// ====== 全局前置守卫：权限校验 ======
router.beforeEach((to, from) => {
  const token = localStorage.getItem('token');

  // 1. 需要登录但没有 token → 跳到登录页，记住目标路径
  if (to.meta.requiresAuth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  // 2. 已经登录但去登录页 → 直接跳到仪表盘
  if (to.name === 'login' && token) {
    return { name: 'dashboard' };
  }

  // 3. 角色校验：检查当前用户角色是否在允许的角色列表中
  if (to.meta.roles) {
    const userRole = localStorage.getItem('role') || 'guest';
    if (!to.meta.roles.includes(userRole)) {
      return { name: 'dashboard' }; // 无权限 → 退回仪表盘
    }
  }

  // 4. 放行
  return true;
});

// ====== 全局后置钩子：页面标题 + 滚动重置 ======
router.afterEach((to) => {
  document.title = (to.meta.title || '管理后台') + ' | My Admin';

  // 路由切换时滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // 生产环境可以在这里接入埋点 SDK
  if (import.meta.env.PROD) {
    console.log('[PV]', to.fullPath);
  }
});

export default router;
```

```vue
<!-- =================== layouts/AdminLayout.vue =================== -->
<template>
  <div class="admin-layout">
    <!-- 顶部导航栏 -->
    <header class="topbar">
      <h1>📊 管理后台</h1>
      <div class="user-area">
        <span>{{ username }}</span>
        <button @click="handleLogout">退出登录</button>
      </div>
    </header>

    <div class="body">
      <!-- 侧栏导航 -->
      <aside class="sidebar">
        <router-link to="/dashboard" active-class="active">
          📈 仪表盘
        </router-link>
        <router-link to="/users" active-class="active">
          👥 用户管理
        </router-link>
        <router-link to="/settings" active-class="active">
          ⚙️ 系统设置
        </router-link>
      </aside>

      <!-- 主内容区域 -->
      <main class="main-content">
        <!-- 子路由渲染在这里 -->
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const username = ref(localStorage.getItem('username') || '管理员');

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('role');
  router.replace({ name: 'login' });
}
</script>
```

```vue
<!-- =================== views/Login.vue =================== -->
<template>
  <div class="login-page">
    <form @submit.prevent="handleLogin" class="login-form">
      <h2>登录管理后台</h2>
      <input v-model="username" placeholder="用户名" required />
      <input v-model="password" type="password" placeholder="密码" required />
      <small v-if="error" class="error">{{ error }}</small>
      <button type="submit">登录</button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const username = ref('');
const password = ref('');
const error = ref('');

/**
 * 模拟登录逻辑
 * 用户名 admin / 密码 123456 视为管理员
 * 其他非空输入视为普通用户
 */
function handleLogin() {
  if (!username.value || !password.value) {
    error.value = '用户名和密码不能为空';
    return;
  }

  error.value = '';

  // 模拟 token
  const fakeToken = btoa(`${username.value}:${Date.now()}`);
  localStorage.setItem('token', fakeToken);
  localStorage.setItem('username', username.value);

  // 简单角色模拟
  if (username.value === 'admin' && password.value === '123456') {
    localStorage.setItem('role', 'admin');
  } else {
    localStorage.setItem('role', 'user');
  }

  // 登录成功后跳回被拦截的目标页面，或默认到仪表盘
  const redirect = route.query.redirect || '/dashboard';
  router.replace(redirect);
}
</script>
```

```vue
<!-- =================== views/UserList.vue =================== -->
<template>
  <div>
    <h2>用户管理</h2>
    <table>
      <thead>
        <tr><th>ID</th><th>用户名</th><th>邮箱</th><th>操作</th></tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>{{ user.name }}</td>
          <td>{{ user.email }}</td>
          <td>
            <router-link :to="{ name: 'user-detail', params: { id: user.id } }">
              查看详情
            </router-link>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const users = ref([]);

onMounted(async () => {
  // 实际项目中从 API 获取
  const res = await fetch('https://jsonplaceholder.typicode.com/users');
  users.value = await res.json();
});
</script>
```

```vue
<!-- =================== views/NotFound.vue =================== -->
<template>
  <div class="not-found">
    <h1>404</h1>
    <p>你访问的页面不存在</p>
    <router-link to="/dashboard">← 返回仪表盘</router-link>
  </div>
</template>
```

---

## 常见问题

**Q1：`router.push`、`router.replace`、`router.go` 的区别是什么？**

`push` 在历史栈新增一条记录（用户可以"后退"），`replace` 替换当前记录（回退会跳过此页），`go(n)` 在已有历史栈中前进或后退 n 步。表单提交后跳结果页用 `replace`，正常页面跳转用 `push`。

**Q2：`beforeEach` 里返回 `false` 和返回一个路径有什么区别？**

`return false` 取消本次导航，URL 不变，页面不切换。`return { name: 'login' }` 是把导航重定向到登录页，URL 会变。大多数权限场景用后者。

**Q3：为什么 `beforeEach` 中 `to.meta` 是 `undefined`？**

检查路由配置中是否定义了 `meta` 字段。另外注意 `to.matched` 是一个数组，拿到的是整条匹配链，通过 `to.matched.some(record => record.meta.requiresAuth)` 可以递归检查嵌套路由的 meta。

**Q4：懒加载的页面切换时有一瞬间白屏怎么办？**

两个思路：① 用预加载——在 `router-link` 进入视口时提前加载：`router-link` 组件内置的 prefetch 默认关闭，需要手动开启或通过 `router.beforeResolve` 实现；② 使用 `<Suspense>` 提供 fallback 界面（但有限制，见上文避坑提示）。

**Q5：`beforeRouteEnter` 和 `<script setup>` 不兼容怎么办？**

`beforeRouteEnter` 的核心场景是"组件创建前获取数据"。在 `<script setup>` 中可以用顶层 `await` 替代（组件挂起直到数据就绪），或者把 `beforeRouteEnter` 写在单独的 Options API `<script>` 块中，和 `<script setup>` 共存。

**Q6：嵌套路由中为什么子路由匹配了但父组件没渲染？**

父路由的 `component` 字段里必须包含 `<router-view />`。如果父路由没有 `component`，只有 `children`，Vue Router 不知道该把子路由渲染到哪里。这和 React Router 的 `Outlet` 是同样的问题。

**Q7：命名视图和嵌套路由怎么选？**

嵌套路由是"父壳 + 子内容"的常规模式，用 `children` + 父组件的 `<router-view>`。命名视图是"同一层级多个区域各自渲染不同组件"的特殊模式，用 `components`（复数）。90% 的场景用嵌套路由，命名视图用于复杂仪表盘。

**Q8：`router.afterEach` 能做权限拦截吗？**

不能。`afterEach` 不接受 `next`，也不接受返回值，导航已经完成，无法阻止。需要阻止导航的逻辑全部放在 `beforeEach` 或 `beforeEnter` 或 `beforeRouteLeave` 中。

---

## 实操作业

### 🟢 基础：三页面的导航应用

用 Vue Router 搭一个三个页面的应用：首页（欢迎语）、产品列表页（从数组渲染 10 条产品数据）、产品详情页（根据 `:id` 对数组过滤后展示）。要求：① 用 `<router-link>` 做导航；② 详情页用 `useRoute` 获取 `:id`；③ 使用 Hash 模式；④ 所有页面组件使用动态 `import` 懒加载。

### 🟡 进阶：带完整导航守卫的管理后台

改造基础作业为管理后台应用，增加：① 登录页面（用户名非空即算登录成功，存 `localStorage`）；② 全局 `beforeEach` 守卫：未登录访问任何页面都重定向到登录页，已登录访问登录页则跳到首页；③ 路由元信息 `meta.title` 配合 `afterEach` 动态设置页面标题；④ 组件内 `beforeRouteLeave` 守卫：产品编辑页有未保存内容时，离开前弹出确认对话框；⑤ 产品编辑页的表单编辑后 URL 参数变化（如 `/products/1` 切到 `/products/2`），用 `beforeRouteUpdate` 重新加载数据。

### 🔴 挑战：角色权限 + 命名视图的管理后台

在进阶作业基础上：① 实现**角色权限**：管理员（admin）可见所有页面，普通用户（user）只能访问首页和产品列表，不能访问产品编辑页，用 `meta.roles` + `beforeEach` 实现；② 用**命名视图**改造首页布局——首页同时展示侧栏统计面板（`<router-view name="stats">`）和主内容区（默认 `<router-view>`）；③ 产品列表改为从 JSONPlaceholder 获取（`https://jsonplaceholder.typicode.com/posts`），详情页在路由守卫中判断 `id` 是否在 1-100 范围内，超出则重定向到 404；④ 给登录用户增加 **Session 模拟**：刷新页面时检查 `localStorage` 中的 token 是否存在且未过期（设置 30 分钟有效期）。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“Vue Router 导航守卫与懒加载”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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

- **Vue Router 4** 与 Vue 3 深度集成，路由参数天然响应式，不需要额外处理更新逻辑。
- **路由创建**：`createRouter` + `createWebHistory`（History 模式）或 `createWebHashHistory`（Hash 模式）。部署 History 模式务必配置服务器 fallback。
- **路由出口**：`<router-link>` 做导航链接，`<router-view>` 做组件出口。嵌套路由通过 `children` + 父组件中的 `<router-view>` 实现。
- **路由参数**：Options API 用 `$route.params`，Composition API 用 `useRoute().params`。参数变化时组件复用需要用 `beforeRouteUpdate` 或 `watch` 监听。
- **导航守卫**是 Vue Router 的核心竞争力：三级体系贯穿 `beforeEach`（全局）→ `beforeEnter`（路由级）→ `beforeRouteEnter/Update/Leave`（组件级），配合 `meta` 实现灵活的权限控制。
- **懒加载**：`component: () => import('...')` 零配置代码分割，Vite / Webpack 自动处理。
- **避坑核心**：别在 Options API 中解构 `$route`、`beforeRouteEnter` 中 `this` 不可用、`beforeEnter` 不覆盖子路由导航、History 模式部署要配 Nginx fallback、`<script setup>` 中不能用 `beforeRouteEnter`。

<!-- course-nav:start -->
---

[上一篇：01 — React Router 数据加载与嵌套路由](./01-React-Router-数据加载与嵌套路由.md) · [课程地图](../../README.md) · [下一篇：01-Vite 核心原理与配置](../../L3-工程化与质量保障/01-构建工具链/01-Vite-核心原理与配置.md)
<!-- course-nav:end -->
