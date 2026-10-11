# React Context 与 Vue Pinia 等价接入：共享语义，不共享框架生命周期

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | React Auth Context、Vue Pinia auth store、两套登录页、认证桥接、列表请求 Hook/Composable |
| 共同结果 | 匿名、恢复中、已登录、登录失败、退出失败、列表加载/空/失败/成功在两端语义等价 |
| 框架边界 | 共享 contracts/client；不共享组件、Hook、Composable、router 或响应式状态 |
| 可见证据 | 两端都显示真实 email，刷新恢复 session，错误密码不进入已登录状态 |
| 建议时间 | 210 分钟 |
| 环境标签 | 真实 API 的 **local** 浏览器联调；无 PostgreSQL 18 证据时不宣称持久化通过 |

本课拥有认证与列表接线文件。HTTP、CSRF、parser 仍由
[上一课](02-same-origin-session-csrf-client.md)唯一负责；框架层不得再保存第二份 token 或重新解释
错误响应。

## 1. 任务背景

“React 和 Vue 都能登录”不等于行为等价。一端可能把网络失败当退出，另一端可能在刷新时先闪出
“未登录”；一端在旧请求返回后覆盖新用户，另一端把错误密码保存在 URL。若只对比页面截图，这些
状态差异很容易遗漏。

等价集成要求两端接受同一外部状态机：

```text
booting -> anonymous
booting -> authenticated
booting -> error
anonymous -> authenticating -> authenticated / anonymous+error
authenticated -> signing-out -> anonymous / authenticated+error
```

实现方式保持框架自然：

- React 用 Context 提供跨路由身份，用 Effect cleanup 管理恢复请求；
- Vue 用 Pinia 管理身份，用 `ref/computed` 和显式 action 管理世代；
- 列表查询不塞入全局 auth store，React 使用 Hook，Vue 使用 Composable；
- 两端只共享领域类型、parser、金额规则和浏览器 client。

## 2. 学习目标

完成本课后，你能够：

1. 在 React Provider 和 Vue Pinia 中建立同一认证状态机；
2. 让 `/auth/me` 的 401 成为匿名，其他失败成为可重试错误；
3. 用 generation/epoch 和 AbortController 阻止旧恢复结果跨越登录；
4. 让错误登录保留 email、清空或不持久化密码，并关联可访问错误；
5. 让退出网络失败保留当前身份，不伪装成服务端已撤销；
6. 用 email 作为当前显示标签，不向 API `PublicUser` 添加 UI-only `name`；
7. 在 React Hook 与 Vue Composable 中处理列表 loading/empty/error/success；
8. 让搜索变化取消旧等待，只有当前查询可更新页面；
9. 用同一五条浏览器路径验收两端，而不是逐行翻译组件。

## 3. 预备知识

- 完成[同源 Session、CSRF 与共享客户端](02-same-origin-session-csrf-client.md)；
- React 已有 RouterProvider，Vue 已有 Vue Router 与 Pinia；
- 已学习 React 的 Context/Effect 和 Vue 的 `ref`/Pinia/watch；
- API 中已有一个虚构测试账号，密码只输入表单，不写教程、日志或 Git；
- 两个前端按顺序使用 `http://localhost:5173`。

先确认应用 manifest 直接依赖 `@market/contracts: "workspace:*"`。不要从
`apps/api/src/auth.ts` 导入浏览器代码；其中包含 Node/数据库职责。

## 4. 核心理论

### 4.1 状态语义先于框架 API

| 状态 | 页面可见行为 | 允许动作 | 禁止误导 |
| --- | --- | --- | --- |
| `booting` | “正在恢复会话” | 可等待/取消导航 | 不先显示匿名 |
| `anonymous` | 登录入口 | 提交登录 | 不显示旧用户名 |
| `authenticating` | 按钮禁用、状态提示 | 等当前提交 | 不重复发送密码 |
| `authenticated` | 显示真实 email | 访问登录后入口、退出 | 前端仍不授予对象权限 |
| `signing-out` | 退出进行中 | 等响应 | 不立即声称 session 已撤销 |
| `error` | 可读错误与重试 | 重试恢复 | 不把网络失败等同 401 |

Context/Pinia 负责“当前浏览器认为的身份状态”，但后端每次 mutation 仍重新认证和授权。即使页面
显示 owner，PATCH 仍可能因 session 过期、CSRF 或对象授权返回 401/403。

登录提交还需要页面级同步锁，不能只读取 `authenticating`。React 状态更新会在当前事件结束后批量
提交，两个同一时机到达的 submit handler 都可能读到旧状态并各发一条 POST。两条成功响应的
`Set-Cookie` 到达顺序与 JavaScript 处理响应、写入 generation 对应 CSRF token 的顺序不保证一致，
最终可能让 Cookie sid 与 CSRF token 分属两个 session。React 用 `useRef<boolean>`、Vue 用同步
`ref<boolean>` 在 handler 入口先检查并置锁，`finally` 再释放；响应式 `pending` 主要负责按钮展示，
不能替代同步互斥。

### 4.2 401 是业务事实，Fetch reject 是未知

初始化 `/auth/me`：

- 401：服务端明确说没有有效 session，转换为 anonymous；
- 403：可能是 Origin/策略错误，不应吞成匿名；
- 网络错误：不知道服务端 session 是否有效，显示恢复失败；
- abort：组件卸载或更新导致，不显示成用户错误。

退出同理。只有服务端成功清 session 和 Cookie 后才切 anonymous；网络失败时保留用户并显示
“退出结果未知，请重试”，避免用户以为已安全退出共享设备。

### 4.3 身份全局，查询局部

身份影响导航和多个路由，适合 Context/Pinia。列表查询由 URL 中的 page/q 决定，应随页面挂载和
参数变化请求，适合 Hook/Composable。把所有数据都放 auth store 会让缓存、取消和 owner 责任混乱。

auth 是身份的唯一 owner。恢复、登录、退出和重试开始时推进身份代际；当前操作接受身份结果前
再推进一次，防止操作期间发出的私有请求跨越身份提交。React 的稳定 `identity` 对象同步通知
订阅者，market 在 layout Effect 中订阅；Vue 暴露只读 `generation`，market 用
`watch(..., { flush: 'sync' })` 同步清收藏和锁，不能等下一次渲染再失效。
收藏的成功、错误和 `finally` 同时核对 auth generation 与本地 epoch，旧请求不能写新收藏或
释放新身份的同 ID 锁。market 只委托 auth 登录/退出，不在迟到退出后再次清理；
Vue 的 `user/sessionError` 用只读 computed 映射，私有清理不得反写 `auth.user`。
这与上一课 client 管理 CSRF token 的 generation 职责不同，框架仍不保存第二份 token。

### 4.4 等价不是同代码

等价标准看输入与输出：

- 相同 API 路径、Cookie/CSRF 客户端和 runtime parser；
- 相同状态语义与恢复文案意图；
- 相同数据结果和错误分类；
- 相同键盘路径、label、`role="alert"`/`role="status"`；
- React/Vue 各自使用自然机制，不共享生命周期函数。

### 4.5 密码与身份显示模型

密码只存在于受控表单内存，成功后清空，不写 URL、localStorage、日志或状态快照。`PublicUser`
只有 `id/email/role`；旧 UI 若需要 `name`，由上一课 adapter 映射 email。对象授权只使用后端从
session 读取的 actor，不相信显示名称或客户端 role。

## 5. API、配置与文件责任清单

| 名称 | React | Vue | 边界 |
| --- | --- | --- | --- |
| 身份容器 | Context Provider | Pinia setup store | 不保存 sid/CSRF |
| 恢复入口 | Provider Effect | `loadSession()` action | 401 与网络失败分开 |
| 世代保护 | `useRef<number>` | `epoch` ref | 不取消服务端事务 |
| 私有状态失效 | 稳定 identity 的同步通知 | 只读 generation + sync watch | auth 唯一 owner，market 只清收藏/锁 |
| 登录提交锁 | `useRef<boolean>` | 页面 `ref<boolean>` | handler 同步置锁，finally 释放 |
| 取消 | Effect cleanup controller | action 内 controller | 只取消客户端等待 |
| 登录页 | 本地 input state | 本地 refs | 密码不进全局 store |
| 显示身份 | `user.email` | `store.user?.email` | 不参与授权 |
| 列表请求 | `useListingPage` | `useListingPage` | 解析器在 shared client |
| router 接线 | route object + Provider | route record + `app.use(pinia)` | 直接深链仍由后端校验 |
| `ApiError.status` | 401 分匿名 | 401 分匿名 | 403/409 不吞掉 |

## 6. 最小可运行案例

### 6.1 两个应用的薄桥接文件

逻辑只存在 `@market/contracts/browser-api`。桥接保留最终 Capstone 的 parser 导出和
`api(path, parser, init)` 签名，避免页面/测试在覆盖后出现 TS2305 或 TS2554。

完整文件：`market/apps/react-web/src/api.ts`

```ts
export {
  api, ApiError, parseAck, parseListing, parseListingPage,
  parseReservation, parseUser, parseVoid, ResponseValidationError,
} from "@market/contracts/browser-api";
export type { User } from "@market/contracts/browser-api";
```

完整文件：`market/apps/vue-web/src/api.ts`

```ts
export {
  api, ApiError, parseAck, parseListing, parseListingPage,
  parseReservation, parseUser, parseVoid, ResponseValidationError,
} from "@market/contracts/browser-api";
export type { User } from "@market/contracts/browser-api";
```

两文件相同只因为它们是零逻辑桥接。任何请求、token、parser 或错误变更都必须回到 contracts 的
唯一 owner，不在桥接文件增加条件分支。

### 6.2 最小观察

先只接入 Provider/store，不接列表页。启动 API 与一个前端：

```bash
pnpm --filter @market/api start
pnpm --filter @market/react-web dev
```

打开 Network 并刷新。预期只有一个 `/auth/me`；无 Cookie 时 401，页面显示匿名；登录后显示 email。
停止 React，再启动 Vue重复。失败时先看 Network status/code/requestId，再看框架 DevTools 状态，
不能只读页面文案。

## 7. 邻里集市集成案例

### 7.1 React Auth Context

完整文件：`market/apps/react-web/src/auth/AuthProvider.tsx`

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { PropsWithChildren } from "react";
import { ApiError, api, parseUser, parseVoid } from "../api";
import type { User } from "../api";

type AuthStatus =
  | "booting"
  | "anonymous"
  | "authenticating"
  | "authenticated"
  | "signing-out"
  | "error";

type AuthValue = {
  user: User | null;
  status: AuthStatus;
  error: string;
  identity: {
    current(): number;
    subscribe(listener: () => void): () => void;
  };
  login(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
  retry(): void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("booting");
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const generation = useRef(0);
  const [identity] = useState(() => {
    const listeners = new Set<() => void>();
    return {
      current: () => generation.current,
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
      },
      advance() {
        generation.current += 1;
        for (const listener of listeners) listener();
        return generation.current;
      },
    };
  });

  useEffect(() => {
    const ownGeneration = identity.advance();
    const controller = new AbortController();
    setStatus("booting");
    setError("");
    api("/auth/me", parseUser, { signal: controller.signal })
      .then((nextUser) => {
        if (ownGeneration !== generation.current) return;
        identity.advance();
        setUser(nextUser);
        setStatus("authenticated");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted ||
            ownGeneration !== generation.current) return;
        if (reason instanceof ApiError && reason.status === 401) {
          identity.advance();
          setUser(null);
          setStatus("anonymous");
          return;
        }
        setStatus("error");
        setError(reason instanceof Error ? reason.message : "会话恢复失败");
      });
    return () => controller.abort();
  }, [retryKey, identity]);

  async function login(email: string, password: string) {
    const ownGeneration = identity.advance();
    setStatus("authenticating");
    setError("");
    try {
      const nextUser = await api("/auth/login", parseUser, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (ownGeneration !== generation.current) return;
      identity.advance();
      setUser(nextUser);
      setStatus("authenticated");
    } catch (reason) {
      if (ownGeneration === generation.current) {
        identity.advance();
        setUser(null);
        setStatus("anonymous");
        setError(reason instanceof Error ? reason.message : "登录失败");
      }
      throw reason;
    }
  }

  async function logout() {
    const ownGeneration = identity.advance();
    setStatus("signing-out");
    setError("");
    try {
      await api("/auth/logout", parseVoid, { method: "POST" });
      if (ownGeneration !== generation.current) return;
      identity.advance();
      setUser(null);
      setStatus("anonymous");
    } catch (reason) {
      if (ownGeneration === generation.current) {
        setStatus("authenticated");
        setError(reason instanceof Error
          ? `退出结果未知：${reason.message}`
          : "退出结果未知");
      }
      throw reason;
    }
  }

  const value: AuthValue = {
    user,
    status,
    error,
    identity,
    login,
    logout,
    retry: () => {
      identity.advance();
      setRetryKey((value) => value + 1);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
```

完整文件：`market/apps/react-web/src/auth/LoginPage.tsx`

```tsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "./AuthProvider";

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const submitting = useRef(false);
  const pending = auth.status === "authenticating";

  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setLocalError("");
    try {
      await auth.login(email, password);
      await navigate("/listings");
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : "登录失败");
    } finally {
      setPassword("");
      submitting.current = false;
    }
  }

  return (
    <main>
      <h1>登录邻里集市</h1>
      <form onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}>
        <label>
          邮箱
          <input
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          密码
          <input
            type="password"
            autoComplete="current-password"
            required
            minLength={12}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button disabled={pending}>
          {pending ? "正在登录" : "登录"}
        </button>
      </form>
      {localError && <p role="alert">{localError}</p>}
    </main>
  );
}
```

完整文件：`market/apps/react-web/src/auth/routes.tsx`

```tsx
import type { RouteObject } from "react-router";
import LoginPage from "./LoginPage";

export const authRoutes: RouteObject[] = [
  { path: "login", element: <LoginPage /> },
];
```

在现有根入口让 `AuthProvider` 包住 `RouterProvider`，在根 route 的 `children` 数组展开
`...authRoutes`。不要复制整份 router，也不要同时保留旧 `loginAction`，否则会有两条登录链路。

### 7.2 Vue Pinia auth store

完整文件：`market/apps/vue-web/src/stores/auth.ts`

```ts
import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { ApiError, api, parseUser, parseVoid } from "../api";
import type { User } from "../api";

type AuthStatus =
  | "booting"
  | "anonymous"
  | "authenticating"
  | "authenticated"
  | "signing-out"
  | "error";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const status = ref<AuthStatus>("booting");
  const error = ref("");
  const epoch = ref(0);
  let restoreController: AbortController | null = null;

  const authenticated = computed(() => status.value === "authenticated");

  async function loadSession() {
    restoreController?.abort();
    const controller = new AbortController();
    restoreController = controller;
    const ownEpoch = ++epoch.value;
    status.value = "booting";
    error.value = "";
    try {
      const nextUser = await api("/auth/me", parseUser, {
        signal: controller.signal,
      });
      if (ownEpoch !== epoch.value) return;
      epoch.value += 1;
      user.value = nextUser;
      status.value = "authenticated";
    } catch (reason) {
      if (controller.signal.aborted || ownEpoch !== epoch.value) return;
      if (reason instanceof ApiError && reason.status === 401) {
        epoch.value += 1;
        user.value = null;
        status.value = "anonymous";
        return;
      }
      status.value = "error";
      error.value = reason instanceof Error ? reason.message : "会话恢复失败";
    } finally {
      if (restoreController === controller) restoreController = null;
    }
  }

  async function login(email: string, password: string) {
    restoreController?.abort();
    const ownEpoch = ++epoch.value;
    status.value = "authenticating";
    error.value = "";
    try {
      const nextUser = await api("/auth/login", parseUser, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (ownEpoch !== epoch.value) return;
      epoch.value += 1;
      user.value = nextUser;
      status.value = "authenticated";
    } catch (reason) {
      if (ownEpoch === epoch.value) {
        epoch.value += 1;
        user.value = null;
        status.value = "anonymous";
        error.value = reason instanceof Error ? reason.message : "登录失败";
      }
      throw reason;
    }
  }

  async function logout() {
    restoreController?.abort();
    const ownEpoch = ++epoch.value;
    status.value = "signing-out";
    error.value = "";
    try {
      await api("/auth/logout", parseVoid, { method: "POST" });
      if (ownEpoch !== epoch.value) return;
      epoch.value += 1;
      user.value = null;
      status.value = "anonymous";
    } catch (reason) {
      if (ownEpoch === epoch.value) {
        status.value = "authenticated";
        error.value = reason instanceof Error
          ? `退出结果未知：${reason.message}`
          : "退出结果未知";
      }
      throw reason;
    }
  }

  return {
    user,
    status,
    error,
    generation: computed(() => epoch.value),
    authenticated,
    loadSession,
    login,
    logout,
  };
});
```

完整文件：`market/apps/vue-web/src/pages/LoginPage.vue`

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";

const auth = useAuthStore();
const router = useRouter();
const email = ref("");
const password = ref("");
const localError = ref("");
const submitting = ref(false);
const pending = computed(
  () => submitting.value || auth.status === "authenticating",
);

async function submit() {
  if (submitting.value) return;
  submitting.value = true;
  localError.value = "";
  try {
    await auth.login(email.value, password.value);
    await router.push("/listings");
  } catch (reason) {
    localError.value = reason instanceof Error ? reason.message : "登录失败";
  } finally {
    password.value = "";
    submitting.value = false;
  }
}
</script>

<template>
  <main>
    <h1>登录邻里集市</h1>
    <form @submit.prevent="submit">
      <label>
        邮箱
        <input
          v-model="email"
          type="email"
          autocomplete="username"
          required
          maxlength="254"
        />
      </label>
      <label>
        密码
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          minlength="12"
          maxlength="128"
        />
      </label>
      <button :disabled="pending">
        {{ pending ? "正在登录" : "登录" }}
      </button>
    </form>
    <p v-if="localError" role="alert">{{ localError }}</p>
  </main>
</template>
```

完整文件：`market/apps/vue-web/src/auth/routes.ts`

```ts
import type { RouteRecordRaw } from "vue-router";
import LoginPage from "../pages/LoginPage.vue";

export const authRoutes: RouteRecordRaw[] = [
  { path: "/login", name: "login", component: LoginPage },
];
```

在现有 `main.ts` 创建 Pinia 后先 `app.use(pinia)`，再挂 router；启动时调用一次
`useAuthStore(pinia).loadSession()`。现有 router 的 routes 数组展开 `...authRoutes`，删除旧的空正文
登录 action。

### 7.2.1 对最终 Capstone 的必要迁移

下面是对两卷唯一快照的局部补丁，不是第二份完整文件。在读者的 `market/` 根应用，
补丁不覆盖 manifest、样式、领域或 SSR 实验。React 原 `MarketProvider` 保留收藏，
Vue market store 保留收藏和兼容显示；身份只由本课 Provider/auth store 管理。
原列表 loader、发布、详情、预约及收藏继续使用三参数 API，经共享 runtime parser 校验。
不要另建第二个 router、删除原页面或保留空正文演示登录。
把各个 diff 块保存为读者 `/tmp` 下的补丁，从 `market/` 根用
`git apply --check --unidiff-zero /tmp/market-integration.patch` 先检查，再去掉 `--check` 应用。
若目标文件已有改动，先逐块比较，不强制覆盖；同一补丁只应用一次。

React 补丁：

```diff
diff --git a/apps/react-web/src/main.tsx b/apps/react-web/src/main.tsx
--- a/apps/react-web/src/main.tsx
+++ b/apps/react-web/src/main.tsx
@@ -5,0 +6 @@ import { MarketProvider } from "./MarketContext";
+import { AuthProvider } from "./auth/AuthProvider";
@@ -12,0 +14 @@ createRoot(root).render(
+    <AuthProvider>
@@ -15,0 +18 @@ createRoot(root).render(
+    </AuthProvider>

diff --git a/apps/react-web/src/App.tsx b/apps/react-web/src/App.tsx
--- a/apps/react-web/src/App.tsx
+++ b/apps/react-web/src/App.tsx
@@ -21,0 +22 @@ import type {
+import { authRoutes } from "./auth/routes";
@@ -28 +28,0 @@ import {
-  parseUser,
@@ -117,5 +116,0 @@ Promise<ActionResult> {
-async function loginAction() {
-  await api("/auth/login", parseUser, { method: "POST", body: "{}" });
-  return redirect("/listings");
-}
-
@@ -385,12 +379,0 @@ function NewPage() {
-function LoginPage() {
-  return (
-    <section>
-      <h2>教学登录</h2>
-      <p>仅创建本机演示会话，不收集真实密码。</p>
-      <Form method="post">
-        <button>以演示居民登录</button>
-      </Form>
-    </section>
-  );
-}
-
@@ -427 +410 @@ export const router = createBrowserRouter([
-      { path: "/login", action: loginAction, element: <LoginPage /> },
+      ...authRoutes,

diff --git a/apps/react-web/src/MarketContext.tsx b/apps/react-web/src/MarketContext.tsx
--- a/apps/react-web/src/MarketContext.tsx
+++ b/apps/react-web/src/MarketContext.tsx
@@ -1,13 +1,13 @@
 import {
   createContext,
   useContext,
-  useEffect,
+  useLayoutEffect,
   useReducer,
   useRef,
-  useState,
 } from "react";
 import type { ReactNode } from "react";
-import { api, ApiError, parseAck, parseUser } from "./api";
+import { api, ApiError, parseAck } from "./api";
+import { useAuth } from "./auth/AuthProvider";
 import {
   favoriteReducer,
   initialFavorites,
@@ -41,83 +41,50 @@
 }

 export function MarketProvider({ children }: { children: ReactNode }) {
-  const [user, setUser] = useState<User | null>(null);
-  const [sessionLoading, setSessionLoading] = useState(true);
-  const [sessionError, setSessionError] = useState("");
+  const auth = useAuth();
+  const user = auth.user;
+  const sessionLoading = ["booting", "authenticating", "signing-out"].includes(auth.status);
+  const sessionError = auth.error;
   const [favorites, dispatch] = useReducer(favoriteReducer, initialFavorites);
   const locks = useRef(new Set<string>());
   const epoch = useRef(0);

+  useLayoutEffect(() => auth.identity.subscribe(() => {
+    epoch.current += 1;
+    locks.current.clear();
+    dispatch({ type: "reset" });
+  }), [auth.identity]);
+
   function invalidate() {
     epoch.current += 1;
     locks.current.clear();
     dispatch({ type: "reset" });
-    setUser(null);
-    setSessionLoading(false);
   }

   async function refreshSession() {
-    const startedAt = epoch.current;
-    setSessionLoading(true);
-    setSessionError("");
-    try {
-      const next = await resolveCurrent(
-        api("/auth/me", parseUser),
-        startedAt,
-        () => epoch.current,
-      );
-      if (next) setUser(next);
-    } catch (error) {
-      if (startedAt !== epoch.current) return;
-      if (error instanceof ApiError && error.status === 401) invalidate();
-      else setSessionError(message(error, "会话读取失败。"));
-    } finally {
-      if (startedAt === epoch.current) setSessionLoading(false);
-    }
+    auth.retry();
   }

-  useEffect(() => {
-    const controller = new AbortController();
-    const startedAt = epoch.current;
-    resolveCurrent(
-      api("/auth/me", parseUser, { signal: controller.signal }),
-      startedAt,
-      () => epoch.current,
-    )
-      .then((next) => {
-        if (!controller.signal.aborted && next) {
-          setUser(next);
-        }
-      })
-      .catch((error: unknown) => {
-        if (controller.signal.aborted || startedAt !== epoch.current) return;
-        if (error instanceof ApiError && error.status === 401) setUser(null);
-        else setSessionError(message(error, "会话读取失败。"));
-      })
-      .finally(() => {
-        if (!controller.signal.aborted && startedAt === epoch.current) {
-          setSessionLoading(false);
-        }
-      });
-    return () => controller.abort();
-  }, []);
-
   async function setFavorite(id: string, selected: boolean) {
     if (locks.current.has(id)) return;
     locks.current.add(id);
     const startedAt = epoch.current;
+    const identityAtStart = auth.identity.current();
+    const current = () => startedAt === epoch.current &&
+      identityAtStart === auth.identity.current();
     dispatch({ type: "start", id });
     try {
       await api(`/favorites/${encodeURIComponent(id)}`, parseAck, {
         method: selected ? "PUT" : "DELETE",
       });
-      if (startedAt === epoch.current) {
+      if (current()) {
         dispatch({ type: "saved", id, selected });
       }
     } catch (error) {
-      if (startedAt !== epoch.current) return;
+      if (!current()) return;
       if (error instanceof ApiError && error.status === 401) {
         invalidate();
+        auth.retry();
       } else {
         dispatch({
           type: "failed",
@@ -126,15 +93,12 @@
         });
       }
     } finally {
-      if (startedAt === epoch.current) locks.current.delete(id);
+      if (current()) locks.current.delete(id);
     }
   }

   async function logout() {
-    await api("/auth/logout", parseAck, { method: "POST", body: "{}" });
-    invalidate();
-    setSessionError("");
-    setSessionLoading(false);
+    await auth.logout();
   }

   return (
```

Vue 补丁：

```diff
diff --git a/apps/vue-web/src/router.ts b/apps/vue-web/src/router.ts
--- a/apps/vue-web/src/router.ts
+++ b/apps/vue-web/src/router.ts
@@ -7,0 +8 @@ import MarketPage from './MarketPage.vue'
+import { authRoutes } from './auth/routes'
@@ -13 +14 @@ const routes: RouteRecordRaw[] = [
-  { path: '/login', name: 'login', component: MarketPage, meta: { title: '登录' } },
+  ...authRoutes,

diff --git a/apps/vue-web/src/main.ts b/apps/vue-web/src/main.ts
--- a/apps/vue-web/src/main.ts
+++ b/apps/vue-web/src/main.ts
@@ -5,0 +6 @@ import './style.css'
+import { useAuthStore } from './stores/auth'
@@ -7,2 +8,4 @@ import './style.css'
-createApp(App)
-  .use(createPinia())
+const pinia = createPinia()
+const app = createApp(App).use(pinia)
+void useAuthStore(pinia).loadSession()
+app

diff --git a/apps/vue-web/src/App.vue b/apps/vue-web/src/App.vue
--- a/apps/vue-web/src/App.vue
+++ b/apps/vue-web/src/App.vue
@@ -2 +2 @@
-import { onMounted, ref } from 'vue'
+import { ref } from 'vue'
@@ -9,4 +8,0 @@ const logoutError = ref('')
-onMounted(() => {
-  void store.loadSession()
-})
-

diff --git a/apps/vue-web/src/stores/market.ts b/apps/vue-web/src/stores/market.ts
--- a/apps/vue-web/src/stores/market.ts
+++ b/apps/vue-web/src/stores/market.ts
@@ -1,26 +1,29 @@
-import { computed, ref } from 'vue'
+import { computed, ref, watch } from 'vue'
 import { defineStore } from 'pinia'
 import {
   api,
   ApiError,
   parseAck,
-  parseUser,
-  parseVoid,
 } from '../api'
+import { useAuthStore } from './auth'

 export type UserSummary = { id: string; name: string }

 export const useMarketStore = defineStore('market', () => {
-  const user = ref<UserSummary | null>(null)
-  const sessionStatus = ref<'unknown' | 'loading' | 'ready' | 'error'>('unknown')
-  const sessionError = ref('')
+  const auth = useAuthStore()
+  const user = computed(() => auth.user)
+  const sessionStatus = computed(() =>
+    auth.status === 'error' ? 'error'
+      : ['booting', 'authenticating', 'signing-out'].includes(auth.status)
+        ? 'loading' : 'ready',
+  )
+  const sessionError = computed(() => auth.error)
   const favoriteIds = ref<string[]>([])
   const busyById = ref<Record<string, boolean>>({})
   const epoch = ref(0)
   const favoriteCount = computed(() => favoriteIds.value.length)

   function clearPrivateState() {
-    user.value = null
     favoriteIds.value = []
     busyById.value = {}
   }
@@ -30,90 +33,44 @@
     clearPrivateState()
   }

+  watch(() => auth.generation, resetClientSession, { flush: 'sync' })
+
   async function loadSession() {
-    if (sessionStatus.value === 'loading') return
-    const token = epoch.value
-    sessionStatus.value = 'loading'
-    sessionError.value = ''
-    try {
-      const result = await api('/auth/me', parseUser)
-      if (token !== epoch.value) return
-      user.value = result
-      sessionStatus.value = 'ready'
-    } catch (error) {
-      if (token !== epoch.value) return
-      if (error instanceof ApiError && error.status === 401) {
-        resetClientSession()
-        sessionStatus.value = 'ready'
-        return
-      }
-      sessionStatus.value = 'error'
-      sessionError.value = error instanceof Error ? error.message : '会话读取失败。'
-    }
+    await auth.loadSession()
   }

-  async function login() {
-    const token = epoch.value + 1
-    epoch.value = token
-    clearPrivateState()
-    sessionStatus.value = 'loading'
-    sessionError.value = ''
-    try {
-      const result = await api('/auth/login', parseUser, {
-        method: 'POST',
-        body: '{}',
-      })
-      if (token !== epoch.value) return
-      user.value = result
-      sessionStatus.value = 'ready'
-    } catch (error) {
-      if (token !== epoch.value) return
-      sessionStatus.value = 'error'
-      sessionError.value = error instanceof Error ? error.message : '登录失败。'
-      throw error
-    }
+  async function login(email: string, password: string) {
+    await auth.login(email, password)
   }

   async function logout() {
-    const token = epoch.value + 1
-    epoch.value = token
-    sessionStatus.value = 'loading'
-    sessionError.value = ''
-    try {
-      await api('/auth/logout', parseVoid, { method: 'POST', body: '{}' })
-      if (token !== epoch.value) return
-      clearPrivateState()
-      sessionStatus.value = 'ready'
-    } catch (error) {
-      if (token !== epoch.value) return
-      sessionStatus.value = 'error'
-      sessionError.value = error instanceof Error ? error.message : '退出失败。'
-      throw error
-    }
+    await auth.logout()
   }

   async function setFavorite(id: string, enabled: boolean) {
     if (!user.value) throw new Error('请先登录。')
     if (busyById.value[id]) return
     const token = epoch.value
+    const identityAtStart = auth.generation
+    const current = () => token === epoch.value && identityAtStart === auth.generation
     busyById.value = { ...busyById.value, [id]: true }
     try {
       await api(`/favorites/${encodeURIComponent(id)}`, parseAck, {
         method: enabled ? 'PUT' : 'DELETE',
       })
-      if (token !== epoch.value) return
+      if (!current()) return
       favoriteIds.value = enabled
         ? [...new Set([...favoriteIds.value, id])]
         : favoriteIds.value.filter(value => value !== id)
     } catch (error) {
-      if (token !== epoch.value) return
+      if (!current()) return
       if (error instanceof ApiError && error.status === 401) {
         resetClientSession()
-        sessionStatus.value = 'ready'
+        void auth.loadSession()
       }
       throw error
     } finally {
-      if (token === epoch.value) {
+      if (current()) {
         busyById.value = { ...busyById.value, [id]: false }
       }
     }
diff --git a/apps/vue-web/src/MarketPage.vue b/apps/vue-web/src/MarketPage.vue
--- a/apps/vue-web/src/MarketPage.vue
+++ b/apps/vue-web/src/MarketPage.vue
@@ -122,13 +121,0 @@ async function search() {
-async function login() {
-  pending.value = true
-  error.value = ''
-  try {
-    await store.login()
-    await router.push('/listings')
-  } catch (reason) {
-    error.value = message(reason)
-  } finally {
-    pending.value = false
-  }
-}
-
@@ -266,8 +252,0 @@ async function reserve() {
-    <section v-else-if="routeName === 'login'">
-      <h1 tabindex="-1">教学登录</h1>
-      <p>只创建本机演示会话，不输入真实密码。</p>
-      <button type="button" :disabled="pending" @click="login">
-        以演示居民登录
-      </button>
-    </section>
-
```

### 7.2.2 原测试的合法迁移

身份改由 auth owner 管理，原测试适配 Provider 包装、完整 User fixture 与有凭据登录；
Vue 初始身份 fixture 写入 auth owner，不给只读 market.user 赋值。
迟到响应/拒绝、收藏幂等、发布草稿均保留。parser 负例仍保留三个 Listing 和原复合分页输入，
但 fixture 的 id/ownerId 必须是合法虚构 UUID，先证明 Listing 和分页正例可解析；
金额、版本、UTC、page、total 各自只损坏一个字段，并同时断言错误类型和字段标签。
不能用任意 `toThrow` 让提前 UUID 错误掩盖目标字段失效。
mock API 返回或 auth owner 初始注入的显示 fixture 不是实际 HTTP 数据；
真实 session 的 UUID/email/role/token 形状仍由第 02 课桥接回归另行锁定。

```diff
diff --git a/apps/react-web/src/app.test.tsx b/apps/react-web/src/app.test.tsx
--- a/apps/react-web/src/app.test.tsx
+++ b/apps/react-web/src/app.test.tsx
@@ -11,6 +11,7 @@
 import { favoriteReducer, initialFavorites } from "./favorite-state";
 import { parsePrice } from "./form";
 import { MarketProvider, useMarket } from "./MarketContext";
+import { AuthProvider } from "./auth/AuthProvider";

 vi.mock("./api", async importOriginal => {
   const original = await importOriginal<typeof import("./api")>();
@@ -43,28 +44,35 @@

 it("runtime-response-parser-rejects-malformed-success", () => {
   const valid = {
-    id: "lamp-1",
+    id: "20000000-0000-4000-8000-000000000001",
     title: "台灯",
     description: "完整字段",
     priceCents: 3500,
     status: "available",
-    ownerId: "seller-1",
+    ownerId: "10000000-0000-4000-8000-000000000001",
     version: 1,
     createdAt: "2026-10-11T08:00:00.000Z",
   };
-  for (const invalid of [
-    { ...valid, priceCents: -1 },
-    { ...valid, version: 0 },
-    { ...valid, createdAt: "2026-10-11" },
-  ]) {
+  expect(parseListing(valid)).toEqual(valid);
+  const page = { items: [valid], page: 1, pageSize: 20, total: 1 };
+  expect(parseListingPage(page)).toEqual(page);
+  for (const [invalid, field] of [
+    [{ ...valid, priceCents: -1 }, "listing.priceCents"],
+    [{ ...valid, version: 0 }, "listing.version"],
+    [{ ...valid, createdAt: "2026-10-11" }, "listing.createdAt"],
+  ] as const) {
     expect(() => parseListing(invalid)).toThrow(ResponseValidationError);
+    expect(() => parseListing(invalid)).toThrow(`${field}:`);
   }
-  expect(() => parseListingPage({
-    items: [valid],
-    page: 0,
-    pageSize: 20,
-    total: -1,
-  })).toThrow(ResponseValidationError);
+  for (const [invalid, field] of [
+    [{ ...page, page: 0 }, "listingPage.page"],
+    [{ ...page, total: -1 }, "listingPage.total"],
+  ]) {
+    expect(() => parseListingPage(invalid)).toThrow(ResponseValidationError);
+    expect(() => parseListingPage(invalid)).toThrow(`${field}:`);
+  }
+  expect(() => parseListingPage({ ...page, page: 0, total: -1 }))
+    .toThrow(ResponseValidationError);
 });

 function SessionProbe() {
@@ -83,9 +91,9 @@
   request.mockReset();
   request.mockResolvedValueOnce({ id: "current-user", name: "当前会话" });
   render(
-    <MarketProvider>
+    <AuthProvider><MarketProvider>
       <SessionProbe />
-    </MarketProvider>,
+    </MarketProvider></AuthProvider>,
   );
   expect(await screen.findByLabelText("当前用户")).toHaveTextContent("当前会话");

@@ -112,9 +120,9 @@
   request.mockReset();
   request.mockResolvedValueOnce({ id: "current-user", name: "当前会话" });
   render(
-    <MarketProvider>
+    <AuthProvider><MarketProvider>
       <SessionProbe />
-    </MarketProvider>,
+    </MarketProvider></AuthProvider>,
   );
   expect(await screen.findByLabelText("当前用户")).toHaveTextContent("当前会话");

diff --git a/apps/vue-web/src/stores/market.test.ts b/apps/vue-web/src/stores/market.test.ts
--- a/apps/vue-web/src/stores/market.test.ts
+++ b/apps/vue-web/src/stores/market.test.ts
@@ -1,6 +1,7 @@
 import { createPinia, setActivePinia } from 'pinia'
 import { beforeEach, describe, expect, it, vi } from 'vitest'
 import { api } from '../api'
+import { useAuthStore } from './auth'
 import { useMarketStore } from './market'

 vi.mock('../api', async importOriginal => {
@@ -9,6 +10,12 @@
 })

 const request = vi.mocked(api)
+const userFixture = (id: string, name: string) => ({
+  id,
+  name,
+  email: `${id}@example.test`,
+  role: 'user' as const,
+})

 beforeEach(() => {
   setActivePinia(createPinia())
@@ -19,7 +26,7 @@
   it('重复设置已收藏不会重复 ID', async () => {
     request.mockResolvedValue({ ok: true })
     const store = useMarketStore()
-    store.user = { id: 'demo-buyer', name: '演示居民' }
+    useAuthStore().user = userFixture('demo-buyer', '演示居民')
     await store.setFavorite('lamp-1', true)
     await store.setFavorite('lamp-1', true)
     expect(store.favoriteIds).toEqual(['lamp-1'])
@@ -34,7 +41,7 @@
       new Promise(resolve => { finish = resolve }),
     )
     const store = useMarketStore()
-    store.user = { id: 'demo-buyer', name: '演示居民' }
+    useAuthStore().user = userFixture('demo-buyer', '演示居民')
     const oldWrite = store.setFavorite('lamp-1', true)
     request.mockResolvedValueOnce({ ok: true })
     await store.logout()
@@ -51,7 +58,7 @@
       new Promise(resolve => { finishLogin = resolve }),
     )
     const store = useMarketStore()
-    const oldLogin = store.login()
+    const oldLogin = store.login('buyer@example.test', 'example-only-password')
     request.mockResolvedValueOnce({ ok: true })
     await store.logout()
     finishLogin({ id: 'old-user', name: '旧居民' })
@@ -65,12 +72,12 @@
       new Promise(resolve => { finishLogout = resolve }),
     )
     const store = useMarketStore()
-    store.user = { id: 'old-user', name: '旧居民' }
+    useAuthStore().user = userFixture('old-user', '旧居民')
     const oldLogout = store.logout()
-    request.mockResolvedValueOnce({ id: 'new-user', name: '新居民' })
-    await store.login()
+    request.mockResolvedValueOnce(userFixture('new-user', '新居民'))
+    await store.login('buyer@example.test', 'example-only-password')
     finishLogout({ ok: true })
     await oldLogout
-    expect(store.user).toEqual({ id: 'new-user', name: '新居民' })
+    expect(store.user).toEqual(userFixture('new-user', '新居民'))
   })
 })

diff --git a/apps/vue-web/src/domain.test.ts b/apps/vue-web/src/domain.test.ts
--- a/apps/vue-web/src/domain.test.ts
+++ b/apps/vue-web/src/domain.test.ts
@@ -22,27 +22,34 @@

   it('畸形成功响应被运行时 parser 拒绝', () => {
     const valid = {
-      id: 'lamp-1',
+      id: '20000000-0000-4000-8000-000000000001',
       title: '台灯',
       description: '完整字段',
       priceCents: 3500,
       status: 'available',
-      ownerId: 'seller-1',
+      ownerId: '10000000-0000-4000-8000-000000000001',
       version: 1,
       createdAt: '2026-10-11T08:00:00.000Z',
     }
-    for (const invalid of [
-      { ...valid, priceCents: -1 },
-      { ...valid, version: 0 },
-      { ...valid, createdAt: '2026-10-11' },
-    ]) {
+    expect(parseListing(valid)).toEqual(valid)
+    const page = { items: [valid], page: 1, pageSize: 20, total: 1 }
+    expect(parseListingPage(page)).toEqual(page)
+    for (const [invalid, field] of [
+      [{ ...valid, priceCents: -1 }, 'listing.priceCents'],
+      [{ ...valid, version: 0 }, 'listing.version'],
+      [{ ...valid, createdAt: '2026-10-11' }, 'listing.createdAt'],
+    ] as const) {
       expect(() => parseListing(invalid)).toThrow(ResponseValidationError)
+      expect(() => parseListing(invalid)).toThrow(`${field}:`)
     }
-    expect(() => parseListingPage({
-      items: [valid],
-      page: 0,
-      pageSize: 20,
-      total: -1,
-    })).toThrow(ResponseValidationError)
+    for (const [invalid, field] of [
+      [{ ...page, page: 0 }, 'listingPage.page'],
+      [{ ...page, total: -1 }, 'listingPage.total'],
+    ]) {
+      expect(() => parseListingPage(invalid)).toThrow(ResponseValidationError)
+      expect(() => parseListingPage(invalid)).toThrow(`${field}:`)
+    }
+    expect(() => parseListingPage({ ...page, page: 0, total: -1 }))
+      .toThrow(ResponseValidationError)
   })
 })
```

原 E2E 的演示按钮、`lamp-1`、`q=__error` 是旧服务协议，保留文件为待迁移测试。
按本课/第 04 课使用真实注册账号、UUID、错误状态与冲突路径改写后才可登记全栈通过；
不能靠恢复 `devApi` 或 Mock 路由跑绿旧 E2E。对应矩阵仍见
[React 覆盖矩阵](../../05-react/REACT-COVERAGE.md)和
[Vue 覆盖矩阵](../../06-vue/VUE-COVERAGE.md)。

完成补丁后执行两端 `typecheck/test/build`，必须包含原 App、MarketContext/market store、
MarketPage、原测试与本课文件。第 04 课再增加编辑 route；只跑 contracts 不证明组装成功。

### 7.2.3 实际登录入口的身份隔离回归

以下测试挂载本课的真实 LoginPage，通过表单调用 `auth.login`，不改成 `market.login`，
也不 mock Provider/store。只 mock 三参数 API 边界以控制旧收藏、登录和退出的完成顺序；
完整虚构 User fixture 不代表真实 Cookie 或数据库证据。
身份操作开始时必须同步清收藏和锁；旧请求的 `finally` 也不能释放新身份的同 ID 锁。

完整文件：`market/apps/react-web/src/auth/identity.test.tsx`

```tsx
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { api } from "../api";
import { MarketProvider, useMarket } from "../MarketContext";
import { AuthProvider } from "./AuthProvider";
import LoginPage from "./LoginPage";

vi.mock("../api", async importOriginal => {
  const original = await importOriginal<typeof import("../api")>();
  return { ...original, api: vi.fn() };
});

const request = vi.mocked(api);
const userA = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "a@example.test",
  name: "a@example.test",
  role: "user" as const,
};
const userB = { ...userA, id: "10000000-0000-4000-8000-000000000002",
  email: "b@example.test", name: "b@example.test" };
const id = "20000000-0000-4000-8000-000000000001";
let market: ReturnType<typeof useMarket>;

function Probe() {
  market = useMarket();
  return <output aria-label="身份">{market.user?.name}</output>;
}

async function setup() {
  request.mockResolvedValueOnce(userA);
  render(
    <AuthProvider><MarketProvider><MemoryRouter>
      <Probe /><LoginPage />
    </MemoryRouter></MarketProvider></AuthProvider>,
  );
  await waitFor(() => expect(screen.getByLabelText("身份")).toHaveTextContent(userA.name));
}

function submitLogin() {
  fireEvent.change(screen.getByLabelText("邮箱"), { target: { value: userB.email } });
  fireEvent.change(screen.getByLabelText("密码"), { target: { value: "example-only-password" } });
  fireEvent.submit(screen.getByRole("button", { name: "登录" }).closest("form")!);
}

beforeEach(() => request.mockReset());

it("LoginPage invalidates old favorites and locks before login settles", async () => {
  await setup();
  request.mockResolvedValueOnce({});
  await act(async () => { await market.setFavorite(id, true); });
  let finishOld!: (value: unknown) => void;
  request.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  let oldWrite!: Promise<void>;
  await act(async () => { oldWrite = market.setFavorite(id, true); });
  let finishLogin!: (value: unknown) => void;
  request.mockImplementationOnce(() => new Promise(resolve => { finishLogin = resolve; }));
  submitLogin();
  expect(market.favorites).toMatchObject({ ids: [], pending: [], error: "" });
  await act(async () => { finishLogin(userB); });
  expect(screen.getByLabelText("身份")).toHaveTextContent(userB.name);
  let finishNew!: (value: unknown) => void;
  request.mockImplementationOnce(() => new Promise(resolve => { finishNew = resolve; }));
  let newWrite!: Promise<void>;
  await act(async () => { newWrite = market.setFavorite(id, true); });
  await act(async () => { finishOld({}); await oldWrite; });
  expect(market.favorites.ids).toEqual([]);
  expect(market.favorites.pending).toEqual([id]);
  const calls = request.mock.calls.length;
  await act(async () => { await market.setFavorite(id, true); });
  expect(request).toHaveBeenCalledTimes(calls);
  await act(async () => { finishNew({}); await newWrite; });
  expect(market.favorites).toMatchObject({ ids: [id], pending: [], error: "" });
});

it("late market logout cannot clear LoginPage's new identity or favorites", async () => {
  await setup();
  let finishLogout!: (value: unknown) => void;
  request.mockImplementationOnce(() => new Promise(resolve => { finishLogout = resolve; }));
  let oldLogout!: Promise<void>;
  await act(async () => { oldLogout = market.logout(); });
  request.mockResolvedValueOnce(userB);
  submitLogin();
  await waitFor(() => expect(screen.getByLabelText("身份")).toHaveTextContent(userB.name));
  request.mockResolvedValueOnce({});
  await act(async () => { await market.setFavorite(id, true); });
  await act(async () => { finishLogout(undefined); await oldLogout; });
  expect(market.user?.id).toBe(userB.id);
  expect(market.favorites.ids).toEqual([id]);
});
```

完整文件：`market/apps/vue-web/src/stores/identity.test.ts`

```ts
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, expect, it, vi } from 'vitest'
import { api } from '../api'
import LoginPage from '../pages/LoginPage.vue'
import { useAuthStore } from './auth'
import { useMarketStore } from './market'

vi.mock('../api', async importOriginal => {
  const original = await importOriginal<typeof import('../api')>()
  return { ...original, api: vi.fn() }
})

const request = vi.mocked(api)
const userA = {
  id: '10000000-0000-4000-8000-000000000001',
  email: 'a@example.test', name: 'a@example.test', role: 'user' as const,
}
const userB = { ...userA, id: '10000000-0000-4000-8000-000000000002',
  email: 'b@example.test', name: 'b@example.test' }
const id = '20000000-0000-4000-8000-000000000001'

async function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  const market = useMarketStore()
  request.mockResolvedValueOnce(userA)
  await auth.loadSession()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginPage },
      { path: '/listings', component: { template: '<p>Listings</p>' } },
    ],
  })
  await router.push('/login')
  const wrapper = mount(LoginPage, { global: { plugins: [pinia, router] } })
  async function submitLogin() {
    await wrapper.get('input[type="email"]').setValue(userB.email)
    await wrapper.get('input[type="password"]').setValue('example-only-password')
    await wrapper.get('form').trigger('submit')
  }
  return { auth, market, wrapper, submitLogin }
}

beforeEach(() => request.mockReset())

it('LoginPage synchronously clears old favorites and protects the new same-ID lock', async () => {
  const { auth, market, wrapper, submitLogin } = await setup()
  try {
    request.mockResolvedValueOnce({})
    await market.setFavorite(id, true)
    let finishOld!: (value: unknown) => void
    request.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
    const oldWrite = market.setFavorite(id, true)
    let finishLogin!: (value: unknown) => void
    request.mockImplementationOnce(() => new Promise(resolve => { finishLogin = resolve }))
    await submitLogin()
    expect(market.favoriteIds).toEqual([])
    expect(market.busyById).toEqual({})
    finishLogin(userB)
    await flushPromises()
    expect(auth.user?.id).toBe(userB.id)
    let finishNew!: (value: unknown) => void
    request.mockImplementationOnce(() => new Promise(resolve => { finishNew = resolve }))
    const newWrite = market.setFavorite(id, true)
    finishOld({})
    await oldWrite
    expect(market.favoriteIds).toEqual([])
    expect(market.busyById[id]).toBe(true)
    const calls = request.mock.calls.length
    await market.setFavorite(id, true)
    expect(request).toHaveBeenCalledTimes(calls)
    finishNew({})
    await newWrite
    expect(market.favoriteIds).toEqual([id])
    expect(market.busyById[id]).toBe(false)
  } finally { wrapper.unmount() }
})

it('late market logout cannot erase LoginPage auth.user or new favorites', async () => {
  const { auth, market, wrapper, submitLogin } = await setup()
  try {
    let finishLogout!: (value: unknown) => void
    request.mockImplementationOnce(() => new Promise(resolve => { finishLogout = resolve }))
    const oldLogout = market.logout()
    request.mockResolvedValueOnce(userB)
    await submitLogin()
    await flushPromises()
    request.mockResolvedValueOnce({})
    await market.setFavorite(id, true)
    finishLogout(undefined)
    await oldLogout
    expect(auth.user?.id).toBe(userB.id)
    expect(market.user?.id).toBe(userB.id)
    expect(market.favoriteIds).toEqual([id])
  } finally { wrapper.unmount() }
})
```

### 7.3 React 列表 Hook

完整文件：`market/apps/react-web/src/listings/useListingPage.ts`

```ts
import { useEffect, useState } from "react";
import type { ListingPage } from "@market/contracts";
import { listListings } from "@market/contracts/client";

type State =
  | { status: "loading"; data: null; error: "" }
  | { status: "ready"; data: ListingPage; error: "" }
  | { status: "error"; data: null; error: string };

export function useListingPage(page: number, q: string): State {
  const [state, setState] = useState<State>({
    status: "loading",
    data: null,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading", data: null, error: "" });
    listListings(page, 20, q, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setState({ status: "ready", data, error: "" });
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({
            status: "error",
            data: null,
            error: reason instanceof Error ? reason.message : "列表读取失败",
          });
        }
      });
    return () => controller.abort();
  }, [page, q]);

  return state;
}
```

### 7.4 Vue 列表 Composable

完整文件：`market/apps/vue-web/src/listings/useListingPage.ts`

```ts
import { readonly, ref, watch } from "vue";
import type { Ref } from "vue";
import type { ListingPage } from "@market/contracts";
import { listListings } from "@market/contracts/client";

export function useListingPage(page: Ref<number>, q: Ref<string>) {
  const status = ref<"loading" | "ready" | "error">("loading");
  const data = ref<ListingPage | null>(null);
  const error = ref("");

  watch([page, q], ([nextPage, nextQuery], _old, onCleanup) => {
    const controller = new AbortController();
    onCleanup(() => controller.abort());
    status.value = "loading";
    data.value = null;
    error.value = "";
    listListings(nextPage, 20, nextQuery, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        data.value = value;
        status.value = "ready";
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        error.value = reason instanceof Error ? reason.message : "列表读取失败";
        status.value = "error";
      });
  }, { immediate: true });

  return {
    status: readonly(status),
    data: readonly(data),
    error: readonly(error),
  };
}
```

两端渲染规则相同：loading 用 `role="status"`；ready 且 `items.length===0` 才显示空状态；error 用
`role="alert"` 和重试入口。不能在 loading 时用“暂无商品”代替。

### 7.5 可复核的验证口径

2026-10-12 本地验证从当前 Markdown 机械提取后端和两端最终 Capstone，所有迁移 diff 通过
真实 `git apply --unidiff-zero` 重放，不依赖先前生成的应用源码。补丁的空白上下文可写为 raw
空行；必须同时通过实际补丁重放与 `git diff --check`，不能只修教材的空白检查。

| 门禁 | 实际命令或范围 | 结果 |
| --- | --- | --- |
| React | `tsc6 --noEmit`、`vitest run`、`eslint . --max-warnings 0`、`vite build` | 全部退出 0；原 13 + 本课身份隔离 2 = 15/15 |
| Vue | `vue-tsc --noEmit -p tsconfig.json`、同上 test/lint/build | 全部退出 0；原 21（含 SSR 边界）+ 本课身份隔离 2 = 23/23 |
| contracts | `tsc -p tsconfig.json --noEmit`、`tsc6 -p tsconfig.json --noEmit`、`vitest run` | 双 TS 检查退出 0；runtime 8 + bridge 8 + edit 12 = 28/28 |
| parser 敏感性 | 仅在临时副本单独放宽 money/version/UTC/page/total | 每项使 React/Vue 原 parser 用例失败，共 10 次目标 RED；恢复后全绿 |
| HTTP 协议 | 当前 client/browser-api 经真实本地 fixture socket | 13/13；非 Nest、数据库或浏览器 Cookie 策略证据 |
| 浏览器小烟测 | 双端构建页真实登录表单，未 mock 网络 | API 未启动时受控失败；邮箱保留、密码清空，无页面异常 |

验证使用 **Node 24.19.0**，不是后端 `.node-version` 的 24.21.0；
复用既有精确依赖的独占 symlink farm，未进行冷安装、依赖降级或锁文件改写。
冷 frozen install 仍未验证，已有镜像缺 `@vue/language-core@3.3.13`。
小烟测使用实际绑定的 `http://127.0.0.1:5173`，上游日志为
`ECONNREFUSED 127.0.0.1:3000`；它不替代本课要求的 `localhost:5173` 成功同源验收。
真实 Nest/PostgreSQL 18 认证成功、持久化、对象授权、并发事务、成功浏览器登录/编辑/退出、
生产 TLS 与全栈 E2E 仍为未验证，旧演示 E2E 仍待迁移。

## 8. 常见错误与排查路径

### 明确错误：登录 action 与 Context 同时请求

```tsx
// 错误示例：router action 登录一次，页面又调用 Context 登录一次
{ path: "/login", action: loginAction, element: <LoginPage /> }
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | Network 出现两条 login，两个 session/token 先后创建 |
| 证据 | 两条 POST requestId 不同，Context 用户可能来自第一条而 token 来自第二条 |
| 原因 | 旧 router action 与新 Provider 同时拥有登录 |
| 修复 | 删除旧 action，只让登录页调用 `auth.login` |
| 复验 | 每次提交只有一条 POST，随后身份和写请求 token 属于同一 session |

### 快速定位表

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 刷新先闪匿名 | 初始 status 为 anonymous | 未建 booting 状态 | 初始 booting，me 完成后分流 | 慢网下不闪错误入口 |
| 错误密码后显示已登录 | catch 未清状态 | 沿用演示用户 | 失败回 anonymous + alert | 401 后无身份 |
| 退出失败却隐藏身份 | fetch reject 后 set null | 把未知当撤销成功 | 保留 user，显示结果未知 | API 恢复后可重试 |
| 快速搜索旧结果覆盖 | 旧 q 最后返回 | 未 abort/世代保护 | cleanup abort | 页面只显示最新 q |
| 新登录后旧收藏回写/退出清新用户 | LoginPage 调 auth，但 market 仅校验自己的 epoch | 身份与私有结果所有权分裂 | 同步订阅 auth generation，只读映射 user | 真实 LoginPage 回归与同 ID 锁用例通过 |
| parser 负例全绿却未测金额 | 第一个错误是 expected UUID | fixture 仍用演示 ID | 合法 UUID 正例和字段级负例 | 五个校验单独放宽均使双端原用例失败 |
| 快速双击/回车发两条登录 | 两条 POST，sid/token 可能来自不同 session | 只依赖批量更新后的 pending | handler 入口同步置锁，finally 释放 | 同一提交窗口只有一条 POST |
| Vue 状态不更新 | store 在 Pinia 安装前创建 | 实例归属错误 | `app.use(pinia)` 后取 store | DevTools 只见一个 auth store |
| React hook 在 Provider 外报错 | 组件树位置错误 | router 未被 Provider 包围 | Provider 包根 RouterProvider | 深链也能读取 Context |

## 9. 课后题

**1. 为什么退出失败时保留 user？**
参考答案：网络失败无法确认服务端是否删除 session 和 Cookie。保留身份并提示结果未知，比假报已退出
更诚实；恢复后再重试或读取 `/auth/me`。

**2. 为什么列表不放 auth store？**
参考答案：身份是跨路由单例，列表由 URL 查询决定并有独立取消/缓存生命周期。混在一起会扩大更新
范围和责任。

**3. React/Vue 文件为何不能抽成一个“通用组件”？**
参考答案：JSX、SFC、Effect、watch 和响应式生命周期不同。共享领域/HTTP 语义即可，强行共享会建立
脆弱框架适配层。

**4. 页面不显示编辑按钮，是否可省后端 owner 检查？**
参考答案：不可。直接 HTTP、旧页面或篡改脚本都能绕过 UI；后端对象授权是最终决定者。

## 10. 实践练习

### 基础：增加可访问 SessionBar

分别创建 React/Vue SessionBar，显示 booting、匿名、email、退出中和错误。文件放各自 `src/auth/`。
完成标准：键盘可触发登录/退出；动态状态使用 status；错误使用 alert；不展示 role 作为权限承诺。

### 进阶：五条等价路径

在 `market/evidence/dual-frontend-auth.md` 记录两端：

1. 首次匿名；
2. 登录与 email；
3. 刷新恢复；
4. 错误密码；
5. 退出与旧 Cookie 401。

每条保存 URL、Network status/code/requestId 摘要和可见状态。完成标准是结果等价，不要求组件代码
相同。登录路径还要在请求未完成时快速连续按 Enter/点击按钮，React/Vue 都只能观察到一条
`POST /auth/login`；成功后的 Cookie sid 与后续写请求使用的 CSRF generation 必须属于同一 session。

### 故障注入：搜索乱序

让 `q=自行车` 延迟 500 毫秒，随后输入 `q=台灯`。移除 cleanup 时先观察旧结果覆盖，再恢复
AbortController。完成标准：最终 query 与可见 items 一致，abort 不被显示成业务错误。

## 11. 阶段验收

- [ ] React 只有一个 AuthProvider，Vue 只有一个 Pinia auth store。
- [ ] 两个应用的 `api.ts` 只是 browser-api 薄桥接，没有第二份 token。
- [ ] 初始 booting、匿名、认证中、已认证、退出中、错误均可观察。
- [ ] `/auth/me` 的 401 与网络失败行为不同。
- [ ] React `useRef` 与 Vue 页面 `ref` 在 handler 入口同步置锁、`finally` 释放；快速双提交只有一条登录请求。
- [ ] 登录后的 Cookie sid 与 generation 对应 CSRF token 属于同一 session，密码不进入 URL、持久存储或日志。
- [ ] 刷新后显示真实 email，旧恢复结果不能覆盖新登录。
- [ ] 真实 LoginPage 直接调用 auth.login 时同步清收藏/锁，旧成功、错误和 finally 均不能跨身份代际。
- [ ] Vue market 只读映射 auth.user；旧 market.logout 不会清除新登录身份或新收藏。
- [ ] 原 React 13/Vue 21 场景保留；parser fixture 合法，money/version/UTC/page/total 单项变体各使双端原用例失败。
- [ ] 退出失败不伪装成成功，成功退出后旧 session 为 401。
- [ ] 列表区分 loading、empty、error、ready，响应通过 shared parser。
- [ ] 快速搜索不会让旧响应覆盖新查询。
- [ ] React/Vue 完成同一验收路径，同时保留框架特有实现。

## 12. 常见问题

**初始化一定要阻塞整个应用吗？**
至少依赖身份的导航和写入口要显示确定的 booting 状态。公共列表可并行读取，但不能在身份未知时闪出
错误的 owner 操作。

**可以在 Pinia/Context 保存 CSRF token 吗？**
不需要。唯一浏览器 client 已管理 token。复制到框架状态会增加泄漏与乱序来源。

**为什么错误密码后清空 password？**
减少秘密在内存和肩窥环境中的停留。email 可保留帮助修正，错误信息不得区分账号是否存在。

**两端必须文案逐字相同吗？**
关键恢复含义、状态和无障碍角色应相同；可在不误导的前提下保持各自产品表达。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [React Context](https://react.dev/learn/passing-data-deeply-with-context)：理解 Provider 与消费边界。
- [React Effect cleanup](https://react.dev/learn/synchronizing-with-effects)：核对请求清理与开发模式行为。
- [Pinia Core Concepts](https://pinia.vuejs.org/core-concepts/)：核对 setup store 与 action。
- [Vue Watchers](https://vuejs.org/guide/essentials/watchers.html)：核对 cleanup 和响应源。
- [Vue Router](https://router.vuejs.org/guide/)：核对 route records 与应用安装顺序。
- [WAI 表单教程](https://www.w3.org/WAI/tutorials/forms/)：复核 label、错误和状态反馈。

## 我现在能做到什么

我能用 React Context 和 Vue Pinia 实现同一认证状态机，用 Hook/Composable 管理可取消列表请求，并
用相同浏览器证据判断两端是否等价；我不会为了代码相同而共享框架生命周期，也不会让 UI 身份状态
替代后端认证与对象授权。

## 单元导航

[本章目录](../README.md#01-契约集成) ·
[上一课：同源 Session、CSRF 与共享客户端](02-same-origin-session-csrf-client.md) ·
[下一课：编辑冲突、竞态与端到端验收](04-edit-conflict-races-end-to-end.md) ·
[全栈交付卷目录](../README.md)
