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
| 登录提交锁 | `useRef<boolean>` | 页面 `ref<boolean>` | handler 同步置锁，finally 释放 |
| 取消 | Effect cleanup controller | action 内 controller | 只取消客户端等待 |
| 登录页 | 本地 input state | 本地 refs | 密码不进全局 store |
| 显示身份 | `user.email` | `store.user?.email` | 不参与授权 |
| 列表请求 | `useListingPage` | `useListingPage` | 解析器在 shared client |
| router 接线 | route object + Provider | route record + `app.use(pinia)` | 直接深链仍由后端校验 |
| `ApiError.status` | 401 分匿名 | 401 分匿名 | 403/409 不吞掉 |

## 6. 最小可运行案例

### 6.1 两个应用的薄桥接文件

逻辑只存在 `@market/contracts/browser-api`。应用文件保持一行公共入口，避免两套 token 漂移。

完整文件：`market/apps/react-web/src/api.ts`

```ts
export { api, ApiError } from "@market/contracts/browser-api";
export type { User } from "@market/contracts/browser-api";
```

完整文件：`market/apps/vue-web/src/api.ts`

```ts
export { api, ApiError } from "@market/contracts/browser-api";
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
import { ApiError, api } from "../api";
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

  useEffect(() => {
    const ownGeneration = ++generation.current;
    const controller = new AbortController();
    setStatus("booting");
    setError("");
    api<User>("/auth/me", { signal: controller.signal })
      .then((nextUser) => {
        if (ownGeneration !== generation.current) return;
        setUser(nextUser);
        setStatus("authenticated");
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted ||
            ownGeneration !== generation.current) return;
        if (reason instanceof ApiError && reason.status === 401) {
          setUser(null);
          setStatus("anonymous");
          return;
        }
        setStatus("error");
        setError(reason instanceof Error ? reason.message : "会话恢复失败");
      });
    return () => controller.abort();
  }, [retryKey]);

  async function login(email: string, password: string) {
    const ownGeneration = ++generation.current;
    setStatus("authenticating");
    setError("");
    try {
      const nextUser = await api<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (ownGeneration !== generation.current) return;
      setUser(nextUser);
      setStatus("authenticated");
    } catch (reason) {
      if (ownGeneration === generation.current) {
        setUser(null);
        setStatus("anonymous");
        setError(reason instanceof Error ? reason.message : "登录失败");
      }
      throw reason;
    }
  }

  async function logout() {
    const ownGeneration = ++generation.current;
    setStatus("signing-out");
    setError("");
    try {
      await api<{ ok: true }>("/auth/logout", { method: "POST" });
      if (ownGeneration !== generation.current) return;
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
    login,
    logout,
    retry: () => setRetryKey((value) => value + 1),
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
import { ApiError, api } from "../api";
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
      const nextUser = await api<User>("/auth/me", {
        signal: controller.signal,
      });
      if (ownEpoch !== epoch.value) return;
      user.value = nextUser;
      status.value = "authenticated";
    } catch (reason) {
      if (controller.signal.aborted || ownEpoch !== epoch.value) return;
      if (reason instanceof ApiError && reason.status === 401) {
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
      const nextUser = await api<User>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (ownEpoch !== epoch.value) return;
      user.value = nextUser;
      status.value = "authenticated";
    } catch (reason) {
      if (ownEpoch === epoch.value) {
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
      await api<{ ok: true }>("/auth/logout", { method: "POST" });
      if (ownEpoch !== epoch.value) return;
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

[章节 hub](../01-contract-integration.md) ·
[上一课：同源 Session、CSRF 与共享客户端](02-same-origin-session-csrf-client.md) ·
[下一课：编辑冲突、竞态与端到端验收](04-edit-conflict-races-end-to-end.md) ·
[全栈交付卷目录](../README.md)
