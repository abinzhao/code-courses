# 27-Vue Router 与 Pinia 状态管理

## 目标

完成本知识单元后，学员应能把前面完成的组件与响应式状态组织成一个多页面单页应用，并让跨页面共享的客户端状态有明确归属，而不是用组件内开关或全局变量硬拼页面。

学员应能够：

1. 解释单页应用如何借助浏览器 history API 在不整页刷新的前提下管理 URL，并与 React Router 的同类能力对照。
2. 使用 `createRouter` 创建路由实例，选择 HTML5 history 或 hash 模式，并说明生产环境服务器回退配置的必要性。
3. 设计路由表，实现嵌套路由、布局路由、索引路由、路由懒加载与 404 兜底，在布局中正确使用 `RouterView`。
4. 使用动态路由参数与 `useRoute`、`useRouter` 完成详情展示与命令式导航，并把筛选、分页放进查询参数。
5. 使用全局守卫、路由独享守卫与组件内守卫控制访问，处理未登录拦截与登录后回跳。
6. 使用 Pinia 的 `defineStore` 组织 state、getters、actions，能同时读懂选项式与组合式两种写法，并说明何时需要持久化。

本单元以一个“工单（ticket）管理模块”为贯穿案例，包含工单列表、详情、新建、编辑、登录与偏好设置。后端接口尚未接入，数据先用本地模拟。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Vue 当前稳定版（3.5+，开课确认最新） | 界面与组件基础 | 能在页面与组件中使用路由 API |
| Vue Router 当前稳定版（4.x） | 单页路由 | 掌握 createRouter、路由表、嵌套路由、守卫 |
| Pinia 当前稳定版（2.x） | 集中式客户端状态管理 | 掌握 defineStore、state/getters/actions、组合式写法 |
| TypeScript 当前稳定版 | 类型检查 | 能为路由参数、store 状态与动作标注类型 |
| Vite 当前稳定版 | 开发与构建 | 能配置懒加载并通过类型检查与构建 |
| pinia-plugin-persistedstate 当前稳定版 | Pinia 持久化插件（了解） | 理解持久化适用范围与脏数据处理 |
| Vue DevTools 当前稳定版 | 观察路由与 store | 能查看路由切换、Pinia 状态与动作记录 |
| Node.js 当前 LTS 与 npm | 运行工具链 | 能安装依赖与执行脚本 |

安装命令：

```bash
npm install vue-router pinia
npm install pinia-plugin-persistedstate
```

说明：

- Vue Router 4 只与 Vue 3 配合；维护 Vue 2 项目时见到的是旧版路由，本课程不作为主线。
- Pinia 是 Vue 官方推荐的集中状态库，取代 Vue 2 时代的 Vuex 作为新项目主线；Vuex 只要求能识别概念。
- 不写死小版本号；API 行为以当前安装版本文档为准。

## 详细的理论知识讲解和示例伪代码

### 1. SPA 与前端路由：再看 history API

#### 1.1 定义

单页应用（SPA）只有一个 HTML 入口。用户在应用内跳转时，浏览器不整页刷新，由 JavaScript 根据 URL 选择要渲染的页面组件。多页应用（MPA）每次跳转都发起新的文档请求，浏览器销毁旧页面再渲染新页面。

```text
MPA：点击链接 → 请求新 HTML → 整页重建 → 可能白屏闪烁
SPA：点击链接 → 不刷新页面 → 修改 URL → 交换路由组件
```

前端路由依赖浏览器 History API：

- `history.pushState`：不发起请求地新增一条历史记录并改变地址栏。
- `history.replaceState`：替换当前历史记录，后退不会回到旧地址。
- `popstate` 事件：用户点击前进、后退时触发，路由库据此重新匹配。

#### 1.2 与 Web 的关系

前端路由让 SPA 保留真实 URL：页面可以收藏、分享，浏览器前进后退仍然有效，同时跳转时不打断正在进行的播放、不丢失客户端内存状态。与 React Router 一样，这是路由库存在的根本理由。

```text
用户点击 <RouterLink to="/tickets/42">
        ↓
路由库调用 pushState，把地址改为 /tickets/42
        ↓
地址栏变化，但没有网络请求、没有整页刷新
        ↓
路由表匹配新 URL，在 RouterView 位置渲染详情组件
        ↓
用户点后退，触发 popstate，路由库匹配上一个 URL
```

概念伪代码（真实项目由路由库完成，不需要手写）：

```text
function renderByUrl(pathname: string):
    if pathname === '/tickets':
        渲染工单列表
    else if pathname.startsWith('/tickets/'):
        渲染工单详情
    else:
        渲染首页
```

不借助任何库，直接使用浏览器 API 复现一次“不刷新改地址”的过程：

```ts
// 原理演示：真实项目中由 vue-router 内部完成
window.history.pushState({ view: 'detail' }, '', '/tickets/42');

window.addEventListener('popstate', (event) => {
  console.log('前进或后退后状态为', event.state, '地址为', window.location.pathname);
});

// pushState 本身不触发 popstate；只有浏览器前进、后退才触发
```

#### 1.3 常见误区

> SPA “只有一个页面”，所以不需要多个网址。

SPA 为每个视图维护真实 URL，只是切换不经过整页刷新。凡是用户认为“这是一页”的视图，都应能通过 URL 到达。

> 地址栏变化一定意味着浏览器请求了服务器。

通过 `pushState` 改 URL 不发起请求；只有刷新、直接输入地址或点击触发文档导航的普通链接才会请求服务器。

> 用一个 `currentPage` 状态切换视图就够了。

状态切换不改地址栏，无法分享、刷新即丢、历史失效。页面视图必须与 URL 对应；纯临时状态（如弹窗开合）才只放组件状态。

### 2. createRouter：创建路由实例与 history 模式

#### 2.1 定义

`createRouter` 接收路由历史与路由表，返回路由实例；在应用实例上 `app.use(router)` 安装后，组件中即可使用路由能力。路由历史由两个工厂创建：

- `createWebHistory`：HTML5 history 模式，URL 干净，如 `/tickets/42`，是新项目默认选择。
- `createWebHashHistory`：hash 模式，URL 中带 `#`，如 `/#/tickets/42`，兼容不支持 history 回退配置的静态托管。

```ts
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('../pages/HomePage.vue') },
      { path: 'tickets', name: 'ticket-list', component: () => import('../pages/TicketListPage.vue') },
    ],
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});
```

入口文件安装路由与 Pinia：

```ts
// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import './style.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.mount('#app');
```

根组件只保留一个路由出口：

```vue
<!-- src/App.vue -->
<template>
  <RouterView />
</template>
```

#### 2.2 与 Web 的关系与服务器回退

HTML5 history 模式下，用户在 `/tickets/42` 直接刷新，浏览器会向服务器请求该路径。静态服务器默认找不到对应文件，就会返回 404。生产部署必须把未匹配的路径回退到 `index.html`，再由前端路由接管。这是部署配置问题，不是前端代码缺陷。

```text
Nginx：try_files $uri $uri/ /index.html;
静态托管平台：在控制台开启 SPA 回退选项
Vite 开发服务器：默认已支持回退
```

无法修改服务器配置时，才使用 hash 模式：`#` 之后的内容不会发送给服务器，因此任何路径刷新都返回同一个 `index.html`，代价是 URL 不够干净、部分服务端分析与 SEO 场景受限。

与 React 对照：

```text
React：createBrowserRouter(routes) 后用 RouterProvider 挂载
Vue  ：createRouter({ history, routes }) 后 app.use(router)
两者都需要在生产环境配置 history 回退
```

#### 2.3 常见误区

> hash 模式是“过时模式”，任何项目都不该用。

在无法配置服务器回退、嵌入特殊容器或需要规避路由重写的场景，hash 模式仍然有效。新项目默认 history，但应理解 hash 的适用条件。

> 先 `mount` 再 `app.use(router)` 也能工作。

应在挂载前安装插件，保证根组件首次渲染时路由已就绪。

### 3. 路由表、嵌套路由、布局与懒加载

#### 3.1 定义

路由表是 URL 与组件对应关系的集中声明，类型为 `RouteRecordRaw[]`。嵌套路由让子路径在父组件内部的 `RouterView` 中渲染；只承担外壳与出口的父路由称为布局路由。`path: ''` 表示父路径本身的索引内容。

```text
RouterLink：声明式导航，渲染为 <a>，点击不整页刷新
RouterView：嵌套路由的渲染出口，类似 React Router 的 Outlet
```

#### 3.2 与 Web 的关系

工单系统是典型的“顶部栏加侧边栏加内容区”结构。切换页面时外壳不应重建，布局路由让外壳只写一次，内容区随子路由交换。

```ts
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'layout',
    component: () => import('../layouts/AppLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('../pages/HomePage.vue'),
      },
      {
        path: 'tickets',
        name: 'ticket-list',
        component: () => import('../pages/TicketListPage.vue'),
      },
      {
        path: 'tickets/new',
        name: 'ticket-create',
        component: () => import('../pages/TicketEditPage.vue'),
      },
      {
        path: 'tickets/:id',
        name: 'ticket-detail',
        component: () => import('../pages/TicketDetailPage.vue'),
        props: true,
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../pages/SettingsPage.vue'),
      },
    ],
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../pages/LoginPage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../pages/NotFoundPage.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});
```

布局组件：

```vue
<!-- src/layouts/AppLayout.vue -->
<script setup lang="ts">
import AppHeader from '../components/AppHeader.vue';
import SideNav from '../components/SideNav.vue';
</script>

<template>
  <div class="app-shell">
    <AppHeader />
    <div class="app-body">
      <SideNav />
      <main class="app-content">
        <RouterView v-slot="{ Component }">
          <component :is="Component" />
        </RouterView>
      </main>
    </div>
  </div>
</template>
```

使用带 `v-slot` 的 `RouterView` 还可以配合 `<Transition>`、`<KeepAlive>` 做过渡与缓存：

```vue
<RouterView v-slot="{ Component }">
  <Transition name="fade" mode="out-in">
    <component :is="Component" />
  </Transition>
</RouterView>
```

导航使用 `RouterLink`，当前路由可用 `router-link-active` / `router-link-exact-active` 类高亮，也可用自定义类名：

```vue
<template>
  <nav aria-label="工单导航">
    <RouterLink to="/" exact-active-class="nav-current">首页</RouterLink>
    <RouterLink to="/tickets" active-class="nav-current">工单列表</RouterLink>
    <RouterLink to="/tickets/new" active-class="nav-current">新建工单</RouterLink>
    <RouterLink to="/settings" active-class="nav-current">偏好设置</RouterLink>
  </nav>
</template>
```

#### 3.3 路由懒加载与分包

`() => import('../pages/TicketListPage.vue')` 是动态导入，构建时会把每个页面拆成独立 chunk，进入该路由时才下载，从而控制首屏包体。静态导入适合首屏必定出现的布局。

```text
静态 import：打进主包，立即可用，适合布局与首屏
动态 import：独立 chunk，按需加载，适合次要页面
```

可给动态导入命名分包，也可配合加载态处理弱网；入门阶段使用默认动态导入即可。

#### 3.4 常见误区

> 嵌套路由配了但子页面不显示，是路由库问题。

父布局中必须放置 `RouterView`，否则子路由没有出口，这是最常见遗漏。

> 子路由路径以 `/` 开头更明确。

以 `/` 开头变成绝对路径；子路由一般写相对路径，如 `tickets`、`:id`。

> 所有页面都懒加载，首屏一定最快。

懒加载过多会在首次进入各页面时产生额外请求与等待。应根据真实访问路径权衡，首屏关键页面可静态引入。

### 4. 动态路由、useRoute、useRouter 与查询参数

#### 4.1 定义

路由路径中以冒号标记的分段是动态参数，例如 `tickets/:id` 匹配 `tickets/42`。组件中：

- `useRoute()`：返回当前路由信息对象，读取 `params`、`query`、`name`、`meta` 等。
- `useRouter()`：返回路由实例，用于命令式导航（`push`、`replace`、`back`）。
- 路由记录设置 `props: true` 后，动态参数会作为 props 传入组件，减少组件对路由对象的耦合。

#### 4.2 与 Web 的关系

工单详情是动态参数的典型场景：同一个详情组件依据 URL 中的 id 显示不同工单，页面可刷新、可分享。筛选与分页放入查询参数，可保留搜索状态并通过链接复现。

通过 props 接收 id 的详情页：

```vue
<!-- src/pages/TicketDetailPage.vue -->
<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  id: string;
}>();

const ticket = computed(() => {
  return mockTickets.find((item) => item.id === Number(props.id));
});

import { mockTickets } from '../data/tickets';
</script>

<template>
  <article v-if="ticket">
    <h1>{{ ticket.title }}</h1>
    <p>{{ ticket.description }}</p>
  </article>
  <section v-else>
    <h1>工单不存在</h1>
    <p>id 为 {{ id }} 的工单可能已被删除。</p>
    <RouterLink to="/tickets">返回列表</RouterLink>
  </section>
</template>
```

使用 `useRoute` 直接读取：

```vue
<script setup lang="ts">
import { useRoute } from 'vue-router';

const route = useRoute();
const id = route.params.id;
</script>
```

一个路由可声明多个参数：

```text
/teams/:teamId/tickets/:ticketId
匹配 /teams/7/tickets/128
params = { teamId: '7', ticketId: '128' }
```

列表页读取查询参数驱动筛选：

```vue
<!-- src/pages/TicketListPage.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { mockTickets } from '../data/tickets';

const route = useRoute();
const router = useRouter();

const keyword = typeof route.query.keyword === 'string' ? route.query.keyword : '';
const status = typeof route.query.status === 'string' ? route.query.status : '';

const filteredTickets = computed(() => {
  return mockTickets.filter((ticket) => {
    const matchKeyword = keyword ? ticket.title.includes(keyword) : true;
    const matchStatus = status ? ticket.status === status : true;
    return matchKeyword && matchStatus;
  });
});

function updateStatus(next: string) {
  const query = { ...route.query };
  if (next) {
    query.status = next;
  } else {
    delete query.status;
  }
  router.push({ name: 'ticket-list', query });
}
</script>

<template>
  <section>
    <h1>工单列表</h1>
    <label>
      状态筛选
      <select :value="status" @change="updateStatus(($event.target as HTMLSelectElement).value)">
        <option value="">全部</option>
        <option value="open">待处理</option>
        <option value="closed">已关闭</option>
      </select>
    </label>
    <p v-if="filteredTickets.length === 0" class="empty">没有符合条件的工单</p>
    <ul v-else>
      <li v-for="ticket in filteredTickets" :key="ticket.id">
        <RouterLink :to="{ name: 'ticket-detail', params: { id: ticket.id } }">
          {{ ticket.title }}
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
```

命令式导航常见于动作完成之后：

```ts
import { useRouter } from 'vue-router';

const router = useRouter();

async function handleCreate() {
  const created = await saveTicket();
  router.push({ name: 'ticket-detail', params: { id: created.id } });
}

function back() {
  router.back();
}

function replaceToLogin() {
  router.replace({ name: 'login' });
}

async function saveTicket() {
  return { id: 1 };
}
```

#### 4.3 参数变化与组件复用

从 `/tickets/1` 导航到 `/tickets/2` 时，若匹配同一路由，组件实例会被复用，只是 props 与 params 变化。需要响应 id 变化重新取数，应侦听 props（本单元使用模拟数据时用 `computed` 即可），而不是依赖组件“重新挂载”。

```ts
import { computed } from 'vue';

const props = defineProps<{ id: string }>();

const ticket = computed(() => mockTickets.find((item) => item.id === Number(props.id)));
```

#### 4.4 常见误区

> `params` 取出来就是确定字符串，不用处理 `undefined`。

参数可能缺失或类型为字符串数组，必须做存在性检查与转换；非法 id 页面要有兜底，不能白屏。

> 查询参数直接当数字用安全。

查询参数本质是字符串，可能缺失或非法，需要转换并用 `Number.isFinite` 等校验。

> 搜索词同时存一份到组件 ref，输入更顺滑。

同一份筛选条件在 URL 与组件状态中双写，前进后退时必然不一致。查询条件以 URL 为单一来源。

### 5. 导航守卫：鉴权、拦截与回跳

#### 5.1 定义

导航守卫是在路由发生变化的各个时机插入的控制函数。Vue Router 提供三类：

- 全局守卫：`router.beforeEach`、`router.beforeResolve`、`router.afterEach`。
- 路由独享守卫：在路由记录中配置 `beforeEnter`。
- 组件内守卫：`onBeforeRouteLeave`、`onBeforeRouteUpdate`。

守卫通过返回值控制导航：

```text
返回 true 或 undefined：放行
返回 false：取消导航
返回一个路由地址（如 { name: 'login' }）：重定向到该地址
```

#### 5.2 与 Web 的关系

工单系统的设置页与部分工单操作只对登录用户开放。全局守卫在渲染目标页面前检查登录状态，未登录时重定向到登录页，并通过 `redirect` 查询参数记录来源，登录成功后回跳。

```ts
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../layouts/AppLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('../pages/HomePage.vue') },
      { path: 'tickets', name: 'ticket-list', component: () => import('../pages/TicketListPage.vue') },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('../pages/SettingsPage.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },
  { path: '/login', name: 'login', component: () => import('../pages/LoginPage.vue') },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../pages/NotFoundPage.vue') },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    };
  }

  return true;
});
```

`auth` store 将在下一节定义。登录页读取 `redirect` 并在成功后回跳：

```vue
<!-- src/pages/LoginPage.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const redirect = computed(() => {
  return typeof route.query.redirect === 'string' ? route.query.redirect : '/';
});

async function handleLogin() {
  await auth.login();
  router.push(redirect.value);
}
</script>

<template>
  <section>
    <h1>登录</h1>
    <button type="button" @click="handleLogin">使用测试账号登录</button>
  </section>
</template>
```

路由独享守卫只在进入某一条记录时触发：

```ts
{
  path: 'tickets/new',
  name: 'ticket-create',
  component: () => import('../pages/TicketEditPage.vue'),
  beforeEnter: () => {
    const auth = useAuthStore();
    return auth.canCreate ? true : { name: 'ticket-list' };
  },
}
```

组件内守卫适合处理本组件相关的导航：

```vue
<script setup lang="ts">
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';

onBeforeRouteLeave((to) => {
  if (hasUnsavedDraft.value && to.name === 'ticket-list') {
    const allowLeave = window.confirm('有未保存的工单草稿，确定离开吗？');
    return allowLeave;
  }
  return true;
});

onBeforeRouteUpdate((to) => {
  console.log('同一组件内参数更新为', to.params.id);
});

import { ref } from 'vue';

const hasUnsavedDraft = ref(true);
</script>
```

#### 5.3 安全边界

前端守卫只改善体验：用户可以修改本地运行环境、直接调用接口。真正的权限控制必须由后端在每个接口执行；前端隐藏入口、拦截无意义页面与后端鉴权缺一不可。守卫保障的是“不把用户放进一个注定无法使用的页面”，不是数据安全本身。

#### 5.4 常见误区

> 守卫拦住了页面，数据就安全了。

接口仍可被直接调用，后端必须独立鉴权。

> `afterEach` 也能取消导航。

`afterEach` 在导航确认后运行，没有 next 控制权，不能拦截；拦截逻辑放在 `beforeEach` 或其他前置守卫。

> 未登录访问设置页，登录后固定回首页即可。

应记录并回跳来源地址，避免用户登录后还要重新寻找目标页面。

### 6. Pinia：defineStore 与 state/getters/actions

#### 6.1 定义

Pinia 是 Vue 官方推荐的集中状态管理库。一个 store 通过 `defineStore` 定义，包含三个概念：

- state：存储的响应式数据。
- getters：由 state 派生的只读计算值，等价于 store 内的 computed。
- actions：修改 state 或执行异步流程的方法。

store 需要一个唯一 id，既可以作为第一个参数，也可以用 id 字段。

#### 6.2 与 Web 的关系

适合放进 Pinia 的是跨页面、跨区域共享的客户端状态：登录用户与权限、全局主题与密度、工单草稿中需要跨页面保留的部分。组件自己的弹窗开合、可由 URL 推导的筛选条件、服务端远程数据不应放进 store。

选项式写法（结构与 Vuex 类似，便于读懂存量项目）：

```ts
// src/stores/auth.ts
import { defineStore } from 'pinia';

type User = {
  id: number;
  name: string;
  roles: string[];
};

type AuthState = {
  user: User | null;
  token: string;
};

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: '',
  }),

  getters: {
    isLoggedIn: (state): boolean => Boolean(state.token),
    canCreate: (state): boolean => state.user?.roles.includes('editor') ?? false,
  },

  actions: {
    async login() {
      // 当前阶段模拟登录；真实项目在此请求后端并写入返回结果
      this.user = { id: 1, name: '测试同学', roles: ['editor'] };
      this.token = 'mock-session-token';
    },

    logout() {
      this.user = null;
      this.token = '';
    },
  },
});
```

在组件中使用：

```vue
<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();

// 保持解构后的响应性
const { isLoggedIn, canCreate } = storeToRefs(auth);

function handleLogout() {
  auth.logout();
}
</script>

<template>
  <p v-if="isLoggedIn">
    欢迎，{{ auth.user?.name }}
    <button v-if="canCreate" type="button" @click="handleLogout">退出登录</button>
  </p>
</template>
```

工单 store 的选项式示例：

```ts
// src/stores/tickets.ts
import { defineStore } from 'pinia';

type TicketStatus = 'open' | 'closed';

type Ticket = {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  assignee: string;
};

type TicketState = {
  tickets: Ticket[];
  loading: boolean;
};

export const useTicketStore = defineStore('tickets', {
  state: (): TicketState => ({
    tickets: [],
    loading: false,
  }),

  getters: {
    openCount: (state): number => state.tickets.filter((ticket) => ticket.status === 'open').length,
    byAssignee: (state) => {
      return (name: string) => state.tickets.filter((ticket) => ticket.assignee === name);
    },
  },

  actions: {
    setTickets(next: Ticket[]) {
      this.tickets = next;
    },

    closeTicket(id: number) {
      const target = this.tickets.find((ticket) => ticket.id === id);
      if (target) {
        target.status = 'closed';
      }
    },
  },
});
```

getter 中需要传参时，返回一个函数（如 `byAssignee`），该函数形式不会被缓存，只在需要参数查询时使用。

#### 6.3 修改 state 的方式

```ts
const ticketStore = useTicketStore();

// 通过 action 修改，最规范
ticketStore.closeTicket(1);

// 直接修改具体属性
ticketStore.loading = true;

// 批量修改
ticketStore.$patch({ loading: false });

// 函数式补丁，适合复杂变化
ticketStore.$patch((state) => {
  state.tickets.push({
    id: 2,
    title: '新增工单',
    description: '',
    status: 'open',
    assignee: '测试同学',
  });
});

// 重置为初始 state
ticketStore.$reset();
```

推荐默认通过 actions 表达业务修改，便于在 DevTools 中追踪，也为异步与复用预留位置；`$reset` 在组合式 store 中需要插件或自行实现，默认选项式 store 支持。

#### 6.4 常见误区

> 把工单列表的服务端数据永久缓存在 Pinia 里，刷新就重新赋值。

远程数据涉及缓存、失效、重新验证、去重，应由第 28 单元介绍的请求层或 Vue Query 类工具负责；Pinia 存客户端状态，不充当服务端缓存。

> 直接解构 store 很方便。

普通解构得到普通值，失去响应性；需要解构时使用 `storeToRefs`，但 action 可以直接解构使用。

> 一个 store 管全部数据最简单。

应按领域拆分 store（auth、tickets、preference），职责清晰，避免单文件膨胀与循环依赖。

### 7. Pinia 组合式写法、组件协作与持久化

#### 7.1 定义

组合式写法与在组件中编写 setup 逻辑一致：用 `ref` 表达 state、`computed` 表达 getters、普通函数表达 actions，并返回需要对外暴露的内容。它与 Composable 的组织方式统一，是本课程推荐的新代码主线。

```ts
// src/stores/preference.ts
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

type Theme = 'light' | 'dark';
type Density = 'comfortable' | 'compact';

export const usePreferenceStore = defineStore('preference', () => {
  const theme = ref<Theme>('light');
  const density = ref<Density>('comfortable');
  const defaultAssignee = ref('');

  const isDark = computed(() => theme.value === 'dark');

  function setTheme(next: Theme) {
    theme.value = next;
  }

  function toggleTheme() {
    theme.value = isDark.value ? 'light' : 'dark';
  }

  function setDensity(next: Density) {
    density.value = next;
  }

  return {
    theme,
    density,
    defaultAssignee,
    isDark,
    setTheme,
    toggleTheme,
    setDensity,
  }, {
    persist: true,
  });
});
```

末项是持久化选项，需要在创建 Pinia 时注册 `pinia-plugin-persistedstate` 插件：

```ts
// src/main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
import { router } from './router';
import './style.css';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const app = createApp(App);
app.use(pinia);
app.use(router);
app.mount('#app');
```

在设置页消费与修改偏好：

```vue
<!-- src/pages/SettingsPage.vue -->
<script setup lang="ts">
import { usePreferenceStore } from '../stores/preference';

const preference = usePreferenceStore();
</script>

<template>
  <section>
    <h1>偏好设置</h1>

    <fieldset>
      <legend>主题</legend>
      <label>
        <input
          type="radio"
          name="theme"
          value="light"
          :checked="preference.theme === 'light'"
          @change="preference.setTheme('light')"
        />
        浅色
      </label>
      <label>
        <input
          type="radio"
          name="theme"
          value="dark"
          :checked="preference.theme === 'dark'"
          @change="preference.setTheme('dark')"
        />
        深色
      </label>
    </fieldset>

    <label>
      列表密度
      <select
        :value="preference.density"
        @change="preference.setDensity(($event.target as HTMLSelectElement).value as 'comfortable' | 'compact')"
      >
        <option value="comfortable">舒适</option>
        <option value="compact">紧凑</option>
      </select>
    </label>
  </section>
</template>
```

#### 7.2 与 Web 的关系：组合式 store 使用规则

- 返回的 `ref`/`computed` 在组件通过 store 访问时自动解包：写 `preference.theme` 即可，不需要 `.value`；脚本中如需解构保持响应性，使用 `storeToRefs`。
- 只返回需要对外暴露的状态与方法；内部辅助状态可以保留在闭包中。
- 需要异步 action 时直接写 `async` 函数，在其中修改各个 ref。

```ts
// src/stores/tickets-setup.ts
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

type Ticket = { id: number; title: string; status: 'open' | 'closed' };

export const useTicketSetupStore = defineStore('tickets-setup', () => {
  const tickets = ref<Ticket[]>([]);
  const loading = ref(false);

  const openTickets = computed(() => tickets.value.filter((ticket) => ticket.status === 'open'));

  async function loadTickets(fetcher: () => Promise<Ticket[]>) {
    loading.value = true;
    try {
      tickets.value = await fetcher();
    } finally {
      loading.value = false;
    }
  }

  return { tickets, loading, openTickets, loadTickets };
});
```

#### 7.3 持久化的适用范围与脏数据

```text
适合持久化：主题、密度、语言、非敏感的界面偏好
不适合持久化：登录凭证（应由更安全的会话机制管理）、敏感权限、服务端数据快照
```

持久化到本地存储后，刷新会读取历史值。存储内容可能被用户改坏或来自旧版本，因此：

- 读取后应做结构与枚举值校验，非法值回退到默认。
- 可给持久化配置版本号或在 schema 变化时清理旧键。
- 不要把令牌、密钥写进可被轻易读取的持久化状态。

持久化配置可指定 key、存储介质与需要持久化的字段：

```ts
defineStore('preference', () => {
  // 状态与动作同前
  return { theme: ref('light'), density: ref('comfortable') };
}, {
  persist: {
    key: 'ticket-app:preference',
    pick: ['theme', 'density'],
  },
});
```

#### 7.4 store 与组件通信、provide/inject 的分工

```text
父子、少量层级：props/emits
明确的局部上下文：provide/inject
跨页面、跨区域、需要 DevTools 与持久化：Pinia
URL 可表达的筛选分页：路由查询参数
能从数据直接算出：computed，不存储
```

使用 store 后，不再需要为了把数据送到远处组件而层层透传 props，也不应把 store 当成逃避组件局部状态的万能容器。

#### 7.5 常见误区

> 组合式 store 和普通 Composable 完全一样。

两者写法相似，但 store 在整个应用中是单例：任意组件调用同一个 `useXxxStore` 拿到的是同一份状态；普通 Composable 每次调用独立。需要全局共享才使用 store。

> persist 一开，所有状态都该持久化。

应只持久化确实需要跨会话保留、且非敏感的偏好，并校验恢复出的数据。

## 课后题

1. SPA 与 MPA 的跳转有什么区别？前端路由依赖哪些浏览器能力保证前进后退有效？
2. `createWebHistory` 与 `createWebHashHistory` 有什么差异？为什么 HTML5 history 模式生产环境必须配置服务器回退？
3. 场景分析：部署后首页正常，进入 `/tickets/42` 直接刷新却出现服务器 404。请说明根因与三种常见托管环境下的修复方向。
4. 嵌套路由中子页面没有出现在内容区，最先检查什么？`RouterView` 与 React Router 的哪个概念对应？
5. 场景分析：同事把“工单详情”写成组件内 `currentTicketId` 状态，刷新后总回列表，也无法把详情链接发给别人。请指出问题并给出路由设计。
6. `useRoute` 与 `useRouter` 分别负责什么？请各写一个使用场景，并解释 `props: true` 带来的好处。
7. 场景分析：从 `/tickets/1` 导航到 `/tickets/2`，页面上的本地草稿没有清空，同事要求强制重挂载组件。请分析组件复用机制，给出更合理的响应参数变化的方式。
8. 全局守卫、路由独享守卫与组件内守卫分别适合什么场景？守卫有哪几种返回值含义？
9. 场景分析：未登录用户访问 `/settings`，被重定向到登录页。请写出包含来源记录与登录回跳的实现思路，并解释为什么后端接口仍然必须独立鉴权。
10. Pinia 的 state、getters、actions 分别对应组件中的什么概念？选项式与组合式写法有何差异？请说明哪些状态不应放入 Pinia。

## 实践练习题

### 练习 1：工单应用路由骨架

#### 任务

使用 Vite 创建 Vue 3 加 TypeScript 项目并接入 Vue Router，实现带顶部栏与侧边栏的后台布局，至少包含首页、工单列表、新建工单、偏好设置与 404 页面。

#### 步骤约束

1. 使用 `createRouter` 与 `createWebHistory`，在入口先安装 Pinia 与路由再挂载。
2. 布局组件包含顶部栏、侧边栏与内容区，内容区必须使用 `RouterView`。
3. 首页使用索引路由，其余页面使用相对路径；页面组件统一使用动态导入实现懒加载。
4. 侧边导航使用 `RouterLink`，当前页通过 active class 高亮。
5. 输入不存在路径展示 404，并提供返回首页入口。
6. 在 README 中写明生产环境服务器回退配置。

#### 提交物

- 完整项目；
- 路由表代码；
- 各页面与 404 截图；
- 路由结构文本图。

#### 验收标准

- 页面切换不整页刷新，外壳保持不变；
- 导航高亮正确；
- 错误路径进入 404；
- 前进后退正常；
- 构建通过，README 回退说明完整。

### 练习 2：工单列表与详情联动

#### 任务

实现工单列表与详情：列表点击进入详情，详情通过动态参数与 `props: true` 显示数据，筛选与分页写入查询参数。

#### 步骤约束

1. 准备不少于 10 条带 id、标题、描述、状态、处理人的模拟工单。
2. 列表项使用 `RouterLink` 指向命名路由，详情页通过 props 接收 id。
3. id 不存在时显示“工单不存在”，不允许白屏。
4. 状态筛选写入 `query.status`，空选择时删除该参数；筛选结果通过 computed 派生。
5. 详情页提供“返回列表”按钮，使用 `useRouter` 实现。
6. 所有参数读取包含存在性、类型与数值校验。

#### 提交物

- 列表页、详情页与数据文件；
- 正常详情与非法 id 截图；
- 不同筛选状态的 URL 截图；
- 参数与导航逻辑说明。

#### 验收标准

- 详情内容随 id 正确变化；
- 非法 id 有兜底；
- 查询参数可刷新、可分享；
- 空筛选结果有空态；
- 无类型错误。

### 练习 3：登录守卫、Pinia 与偏好持久化

#### 任务

接入 Pinia：实现 auth store 与 preference store，用守卫保护设置页，并把主题与密度持久化。

#### 步骤约束

1. auth store 包含登录用户、令牌、`isLoggedIn` getter 与登录退出 actions；登录当前阶段为模拟实现。
2. preference store 使用组合式写法，包含主题、密度及对应 getters/actions，并启用持久化，仅持久化非敏感字段。
3. 设置页路由配置 `meta.requiresAuth`，全局守卫未登录时跳转 `/login` 并记录 `redirect`。
4. 登录成功后准确回跳来源页；提供退出登录入口。
5. 手动写入非法持久化值验证恢复逻辑：非法枚举必须回退默认，不能导致页面崩溃。
6. README 说明前端守卫与后端鉴权分工。

#### 提交物

- 两个 store、守卫、登录页与设置页代码；
- 拦截与回跳演示记录；
- 刷新恢复与非法值处理截图；
- store 设计说明。

#### 验收标准

- 未登录不能进入设置页，登录后准确回跳；
- 偏好刷新后恢复，脏数据被安全处理；
- store 状态在 DevTools 中可见，动作可追踪；
- 服务端状态没有被错误地长期塞入 store；
- 构建通过。

## 阶段验收作业

### 作业名称

多路由“工单管理后台”前端版

### 作业场景

团队需要一个可演示的工单管理后台：包含仪表盘、工单列表、工单详情、新建工单、登录与受保护的偏好设置。后端尚未就绪，本阶段重点验证你是否真正掌握 SPA 路由与集中状态管理：URL 是否表达页面、布局是否复用、查询参数是否可分享、权限守卫是否完整、Pinia 状态归属是否清晰。

### 提交物

```text
ticket-admin-vue/
├── src/
│   ├── layouts/
│   │   └── AppLayout.vue
│   ├── pages/
│   │   ├── HomePage.vue
│   │   ├── TicketListPage.vue
│   │   ├── TicketDetailPage.vue
│   │   ├── TicketEditPage.vue
│   │   ├── SettingsPage.vue
│   │   ├── LoginPage.vue
│   │   └── NotFoundPage.vue
│   ├── components/
│   │   ├── AppHeader.vue
│   │   ├── SideNav.vue
│   │   └── StatusFilter.vue
│   ├── stores/
│   │   ├── auth.ts
│   │   ├── tickets.ts
│   │   └── preference.ts
│   ├── data/
│   │   └── tickets.ts
│   ├── router/
│   │   └── index.ts
│   ├── App.vue
│   └── main.ts
├── routing-and-state.md
└── README.md
```

必做内容：

1. 使用 Vue Router 组织全部路由，AppLayout 作为布局路由，含顶部栏与侧边栏，页面组件懒加载。
2. 列表页支持关键词与状态筛选，条件写入查询参数，刷新与新标签页打开结果一致。
3. 详情页通过 `props: true` 接收动态参数，非法 id 有明确兜底。
4. 新建页提交（模拟）成功后命令式跳转到新工单详情。
5. 设置页受 `meta.requiresAuth` 与全局守卫保护，未登录跳登录页并在登录后回跳。
6. Pinia 至少包含 auth、tickets、preference 三个 store；preference 组合式写法并持久化非敏感偏好，脏数据安全恢复。
7. `routing-and-state.md` 包含完整路由表、URL 示例、守卫流程、store 职责表与一条 history 原理解释。

### 演示步骤

学员在 15 分钟内完成：

1. 从 `/` 开始演示各页面切换，指出外壳未重建。
2. 在列表页设置关键词与状态筛选，刷新页面并把链接复制到新标签页打开。
3. 使用浏览器前进后退展示筛选状态切换。
4. 打开一个存在的详情，再输入非法 id 演示兜底。
5. 退出登录后直接访问 `/settings`，演示拦截、登录与回跳。
6. 修改主题与密度后刷新，展示持久化；再演示一条非法持久化值被安全恢复。
7. 访问不存在路径演示 404，并讲解 routing-and-state.md 中一条路由的匹配层级。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| SPA 与 history 理解 | 10 | 能解释不刷新跳转原理、模式差异与服务器回退配置 |
| 路由表与布局 | 25 | createRouter 正确，嵌套、索引、相对路径、RouterView、懒加载全部规范 |
| 参数与查询状态 | 20 | 动态参数兜底完整，查询参数单一来源，URL 可分享 |
| 导航与守卫 | 20 | RouterLink/useRouter 场景正确，全局/独享/组件内守卫完整，回跳准确 |
| Pinia 状态管理 | 20 | state/getters/actions 清晰，组合式写法正确，持久化范围与脏数据处理合理 |
| 文档与工程 | 5 | 设计文档完整，构建通过，README 可复现 |

细分评分：

- SPA 与 history：原理 5 分，模式与回退配置 5 分。
- 路由表与布局：实例与安装 5 分，嵌套与索引 8 分，RouterView 7 分，懒加载 5 分。
- 参数与查询状态：动态参数与 props 7 分，查询参数单一来源 8 分，分享与刷新 5 分。
- 导航与守卫：导航 API 5 分，全局守卫 7 分，独享/组件内守卫 4 分，回跳 4 分。
- Pinia：store 拆分与职责 6 分，getters/actions 6 分，组合式写法 4 分，持久化与脏数据 4 分。
- 文档与工程：设计文档 2 分，构建 2 分，README 1 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过：

1. 页面切换通过普通 `<a>` 或 `window.location` 赋值导致整页刷新。
2. 页面只靠组件状态切换，没有真实 URL，详情与筛选无法通过链接复现。
3. 嵌套路由遗漏 RouterView 导致子页面无法渲染。
4. 筛选条件在组件状态与 URL 中双写，前进后退时界面不一致。
5. 详情页不处理非法或缺失参数，出现白屏或运行时错误。
6. 受保护页面未登录可直接进入，或登录后不能回跳来源页；认为前端守卫可以替代后端鉴权。
7. 把全部状态塞进单一 store 或把服务端数据长期缓存在 Pinia，且经询问无法说明理由。
8. 持久化保存敏感凭证，或非法持久化值导致页面崩溃。
9. 项目无法按 README 启动，或生产构建未通过。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解 SPA 与 history | routing-and-state.md 与现场讲解 |
| 掌握 createRouter 与 history 模式 | router 目录、模式选择与回退说明 |
| 设计路由表与布局 | AppLayout、嵌套/索引路由、RouterView、懒加载 |
| 处理动态参数与查询参数 | TicketDetailPage、StatusFilter、可分享链接 |
| 正确使用导航 API | SideNav、新建页跳转代码 |
| 实现导航守卫与登录回跳 | meta、beforeEach、LoginPage 演示 |
| 掌握 Pinia 核心概念 | auth/tickets/preference store 与 DevTools |
| 掌握组合式 store 与持久化 | preference store、刷新恢复与脏数据演示 |

### 提交前自检

- [ ] 全部学习目标均有对应证据。
- [ ] 所有内部导航使用 RouterLink 或路由实例方法，没有整页刷新。
- [ ] 每个页面视图都有对应 URL，布局中 RouterView 已放置，索引路由已声明。
- [ ] 页面组件按需懒加载，首屏关键布局静态引入。
- [ ] 详情参数有存在性检查、数值转换与兜底 UI。
- [ ] 筛选条件只存于 URL，刷新、分享、前进后退均正确。
- [ ] 命令式导航仅用于动作完成后的跳转。
- [ ] 未登录访问受保护页被拦截，登录后准确回跳。
- [ ] Pinia 按领域拆分，服务端数据没有被长期缓存到 store。
- [ ] 持久化只包含非敏感偏好，非法存储值可安全恢复。
- [ ] README 包含服务器 history 回退与前后端鉴权分工说明。
- [ ] `npm run build` 无错误。
