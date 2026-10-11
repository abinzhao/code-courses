# 同源 Session、CSRF 与共享客户端：只让一条链路管理浏览器凭据

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | React/Vue 等价 Vite 代理、共享 Fetch 客户端、认证兼容适配器 |
| 文件 owner | 两个 `vite.config.ts`、`packages/contracts/client.ts`、`browser-api.ts` |
| 可见结果 | `/api/v1/health/ready` 命中真实 Nest；刷新后恢复 session；HTML 502 成为受控错误 |
| 建议时间 | 180 分钟 |
| 安全主线 | same-origin HttpOnly Cookie；unsafe 请求使用当前 session 绑定的 CSRF token |
| 环境标签 | 浏览器 **local** 联调；不是 SSR 客户端，不证明生产 HTTPS |

本课不复制领域 parser。Listing、分页、session 与错误解析统一复用
[上一课](01-workspace-contract-runtime-validation.md)拥有的 `runtime.ts`。React Context 和 Vue Pinia
在下一课接入，不在本课加入框架状态。

## 1. 任务背景

两个前端在早期卷中使用过演示中间件。若只增加 Vite proxy，却保留 `devApi()`，浏览器仍可能收到
演示商品、固定 Cookie 和静态用户，真实 Nest 连一条请求日志都没有。页面看似成功，证据却来自错误
服务。

Cookie session 还有另一层难点：sid 是 HttpOnly，JavaScript 不应读取；浏览器会按同源规则自动
发送它。CSRF token 则由 `/auth/login` 或 `/auth/me` 返回，客户端只保存在当前页面内存。若 React
和 Vue 各写一套 Fetch 包装器、各存一份 token，刷新、401、退出和乱序响应会产生不同语义。

因此本课建立一个框架无关的浏览器客户端，统一处理：

- same-origin URL 与 `credentials`；
- session 恢复和 CSRF header；
- `204`、JSON、非 JSON 代理错误；
- `401` 世代失效、`403` 权限/CSRF、`409` 业务冲突；
- `AbortSignal` 传递；
- 外部响应的运行时解析。

## 2. 学习目标

完成本课后，你能够：

1. 删除模拟 API 插件，让 `/api` 保留完整路径代理到 Nest；
2. 解释 same-origin、same-site、CORS、Cookie 和 CSRF 的不同职责；
3. 使用 `credentials: "same-origin"`，不把 sid 复制到 localStorage；
4. 在首次 unsafe 请求前通过 `/auth/me` 恢复 CSRF token；
5. 用 session generation 阻止旧 `/auth/me` 覆盖新登录；
6. 把 `401`、`403`、`409` 和网络失败保留为不同证据；
7. 正确处理 `204 No Content` 与 Nginx/Vite 返回的 HTML 错误；
8. 将 `AbortSignal` 传到底层，同时说明 abort 不会回滚服务端事务；
9. 说明模块级 token 为什么不能用于多用户 SSR。

## 3. 预备知识

- 已完成[工作区契约与运行时校验](01-workspace-contract-runtime-validation.md)；
- 后端 API 支持 `/api/v1/auth/login`、`/auth/me`、`/auth/logout` 和健康接口；
- 后端 `APP_ORIGIN` 可设置为浏览器实际精确源；
- 已理解[Cookie Session、Origin 与 CSRF](../../08-backend/06-auth-sessions-rbac/02-cookie-sessions-origin-csrf.md)；
- React/Vue 应用原有 `vitest.config.ts` 与生产构建配置仍保留。

本章顺序运行两个前端，都使用 `http://localhost:5173`。不要一边用 `localhost` 打开页面，一边把
`APP_ORIGIN` 配成 `http://127.0.0.1:5173`；两者 host 不同。

## 4. 核心理论

### 4.1 same-origin 是浏览器入口契约

开发时浏览器只访问：

```text
http://localhost:5173/
http://localhost:5173/api/v1/...
```

Vite 在服务器内部把 `/api` 转发到 `http://127.0.0.1:3000`。浏览器不知道后端端口，因此请求
仍是同源，Cookie 可按 host/path 规则发送。代理不删除 `/api`，因为 Nest 已使用完整前缀。

`changeOrigin: false` 不等于关闭 CSRF。浏览器产生的 `Origin` 应与后端允许源精确匹配；反向代理
只负责转发，服务端仍验证 Origin、session 和 CSRF。

### 4.2 Cookie 与 CSRF token 分工

```text
HttpOnly sid Cookie
  浏览器自动发送，JS 不读取
             +
内存 csrfToken
  登录/me 返回，unsafe 请求放 X-CSRF-Token
             +
服务端精确 Origin
  判断请求来自允许的浏览器源
```

三者缺一不能用其他项代替。`SameSite=Lax` 是纵深防御，不是完整 CSRF 方案；CORS 控制脚本读取
跨源响应，不等于阻止所有跨站写请求；TLS 保护传输，不判断 actor 是否能编辑某个商品。

### 4.3 session generation 是结果所有权

设当前 generation 为 4：

1. 页面发出 `/auth/me`，记录 4；
2. 用户立刻登录，新 generation 为 5；
3. 旧 `/auth/me` 晚返回；
4. 客户端发现 4 不再是当前代，不写入 token。

generation 不取消网络和服务器工作，只决定结果是否仍属于当前会话。退出、重新登录或确定 401
都会推进 generation。

### 4.4 状态码对应不同恢复

| 结果 | 客户端含义 | 推荐恢复 |
| --- | --- | --- |
| `204` | 成功且无正文 | 返回 `undefined`，不调用 JSON parser |
| `400` | 输入不满足契约 | 保留表单，展示字段错误 |
| `401` | 当前 session 不成立 | 清内存 token，重新认证 |
| `403` | 已知身份无权，或 Origin/CSRF 被拒绝 | 不自动重试，查 code 和 requestId |
| `409` | version/预约等状态冲突 | 保留草稿，重新读取事实 |
| `5xx` JSON | 服务端受控失败 | 显示恢复入口与 requestId |
| HTML/空错误 | 代理或上游失败 | 生成受控 `HTTP_ERROR`，不泄露 HTML |
| Fetch reject | DNS、连接、TLS、abort 等 | 区分 `AbortError` 与未知结果 |

网络失败具有歧义：服务器可能在响应丢失前已经提交。客户端不能因为 `fetch` reject 就自动重发
非幂等 mutation。

### 4.5 浏览器模块状态不能进入 SSR

本课 `csrfToken` 是单个浏览器标签页的模块内状态。SSR Node 进程会同时处理多个用户；若复用同一
模块变量，用户甲 token 可能进入用户乙请求。SSR 必须为每个入站请求创建独立 client context，
显式传入该请求的 Cookie、Origin 和 token，且不能依赖浏览器 `credentials`。

## 5. API、配置与文件责任清单

| 名称 | 最小用法 | 作用 | 边界 |
| --- | --- | --- | --- |
| Vite `server.proxy` | `"/api"` -> API | 开发同源入口 | 生产由 Nginx 负责 |
| `strictPort` | `true` | 端口占用时直接失败 | 不自动解决冲突 |
| `changeOrigin` | `false` | 保留开发请求 host/origin 语义 | 服务端仍校验 Origin |
| `credentials` | `"same-origin"` | 允许同源 Cookie | JS 仍读不到 HttpOnly sid |
| `Headers` | 删除调用方 CSRF 后重设 | 防旧 helper 注入固定 token | 不能生成服务端 token |
| `AbortSignal` | 传给 `fetch` | 停止客户端等待 | 不回滚已提交事务 |
| `response.text()` | 先读取一次正文 | 兼容 204/JSON/HTML | 成功数据仍需 parser |
| `ApiFailure` | 保存 status/code/requestId | 框架分流恢复 | 不能暴露 stack/SQL |
| `/auth/me` | 恢复 user + token | 页面刷新后重建内存状态 | 无 Cookie 时应为 401 |
| session generation | 单调递增 number | 拒绝旧会话结果 | 不是服务端 session 版本 |

## 6. 最小可运行案例

### 6.1 完整 Vite 代理

先从两个应用配置中删除演示插件的 import 和 `devApi()` 调用。演示源码可留在历史练习，但最终
配置不能导入它。

完整文件：`market/apps/react-web/vite.config.ts`

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: false,
      },
    },
  },
});
```

完整文件：`market/apps/vue-web/vite.config.ts`

```ts
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: false,
      },
    },
  },
});
```

若 React 应用已验证 Compiler 插件，可在 `react()` 后保留它；本课的不可变要求是删除模拟 API、
保留 `/api` 前缀和固定实际 origin。`server.proxy` 服务开发模式，`preview.proxy` 服务构建页
验收，两者必须保持同一目标。修改配置后必须重启 Vite，热更新不足以重建代理。

### 6.2 观察真实上游

从 `market/` 依次启动：

```bash
APP_ORIGIN=http://localhost:5173 pnpm --filter @market/api start
pnpm --filter @market/react-web dev
curl -i http://localhost:5173/api/v1/health/ready
curl -i http://localhost:5173/api/v1/auth/me
```

预期健康接口为 200，Nest 出现对应请求日志；无 Cookie 的 `/auth/me` 为 401。停止 API 后再次请求
健康接口，必须得到代理连接失败，不能继续返回演示 200。停止 React，再用相同端口启动 Vue并重复。

失败证据：

- 404 且 Nest 日志路径缺 `/api`：代理 rewrite 错误；
- 页面仍返回“演示居民”且 Nest 无日志：模拟插件仍截获；
- Vite 自动换到 5174：`strictPort` 未生效或启动的不是当前配置；
- 写请求 403：检查页面实际 URL 与 `APP_ORIGIN` 的协议、host、端口。

## 7. 邻里集市集成案例

### 7.1 共享客户端完整文件

完整文件：`market/packages/contracts/client.ts`

```ts
import type { Listing, ListingPage, PublicUser } from "./index.js";
import {
  parseApiError,
  parseListing,
  parseListingPage,
  parseSession,
} from "./runtime.js";

const API_BASE = "/api/v1";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const PRE_SESSION_PATHS = new Set(["/auth/login", "/auth/register"]);

let csrfToken = "";
let sessionGeneration = 0;

export class ApiFailure extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string;

  constructor(status: number, code: string, message: string, requestId: string) {
    super(message);
    this.name = "ApiFailure";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

async function readUnknown(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (text.length === 0) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export async function request(
  path: string,
  init: RequestInit = {},
): Promise<unknown> {
  const method = (init.method ?? "GET").toUpperCase();
  const unsafe = !SAFE_METHODS.has(method);
  const beforeSession = PRE_SESSION_PATHS.has(path);

  if (unsafe && !beforeSession && csrfToken.length === 0) {
    await restoreSession(init.signal ?? undefined);
  }

  const generationAtStart = sessionGeneration;
  const headers = new Headers(init.headers);
  headers.delete("X-CSRF-Token");
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (unsafe && !beforeSession) {
    headers.set("X-CSRF-Token", csrfToken);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    method,
    headers,
    credentials: "same-origin",
  });
  const value = await readUnknown(response);

  if (!response.ok) {
    if (response.status === 401 && generationAtStart === sessionGeneration) {
      csrfToken = "";
      sessionGeneration += 1;
    }
    const data = parseApiError(
      value,
      response.headers.get("x-request-id") ?? "unavailable",
    );
    throw new ApiFailure(
      response.status,
      data.code,
      data.message,
      data.requestId,
    );
  }

  return value;
}

export async function login(
  email: string,
  password: string,
): Promise<PublicUser> {
  const ownGeneration = sessionGeneration + 1;
  sessionGeneration = ownGeneration;
  csrfToken = "";
  const session = parseSession(await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }));
  if (ownGeneration === sessionGeneration) csrfToken = session.csrfToken;
  return session.user;
}

export async function restoreSession(
  signal?: AbortSignal,
): Promise<PublicUser> {
  const ownGeneration = sessionGeneration;
  const session = parseSession(await request("/auth/me", {
    signal: signal ?? null,
  }));
  if (!signal?.aborted && ownGeneration === sessionGeneration) {
    csrfToken = session.csrfToken;
  }
  return session.user;
}

export async function logout(): Promise<void> {
  const ownGeneration = sessionGeneration;
  await request("/auth/logout", { method: "POST" });
  if (ownGeneration === sessionGeneration) {
    csrfToken = "";
    sessionGeneration += 1;
  }
}

export async function listListings(
  page = 1,
  pageSize = 20,
  q = "",
  signal?: AbortSignal,
): Promise<ListingPage> {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    q,
  });
  return parseListingPage(
    await request(`/listings?${query.toString()}`, {
      signal: signal ?? null,
    }),
  );
}

export async function getListing(
  id: string,
  signal?: AbortSignal,
): Promise<Listing> {
  return parseListing(await request(
    `/listings/${encodeURIComponent(id)}`,
    { signal: signal ?? null },
  ));
}

export async function updateListing(
  current: Listing,
  input: { title: string; description: string; priceCents: number },
  signal?: AbortSignal,
): Promise<Listing> {
  return parseListing(await request(
    `/listings/${encodeURIComponent(current.id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ ...input, version: current.version }),
      signal: signal ?? null,
    },
  ));
}

export async function reserveListing(id: string): Promise<unknown> {
  return request(
    `/listings/${encodeURIComponent(id)}/reservations`,
    { method: "POST" },
  );
}
```

调用方即使传入固定 `X-CSRF-Token`，客户端也会删除并使用当前 session token。客户端不保存 sid，
不手工设置 Origin，也不把 token 写入持久存储。

### 7.2 兼容旧框架 API 的唯一适配器

现有 Context/Pinia 可能期待扁平 `User` 和泛型 `api<T>`。适配器只兼容认证入口；商品必须调用
`listListings/getListing/updateListing`，不能使用泛型断言绕过 parser。

完整文件：`market/packages/contracts/browser-api.ts`

```ts
import type { PublicUser } from "./index.js";
import {
  ApiFailure,
  login,
  logout,
  request,
  restoreSession,
} from "./client.js";

export type User = PublicUser & { name: string };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string;

  constructor(status: number, code: string, message: string, requestId: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function displayUser(user: PublicUser): User {
  return { ...user, name: user.email };
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  try {
    const method = (init.method ?? "GET").toUpperCase();
    if (path === "/auth/me" && method === "GET") {
      return displayUser(
        await restoreSession(init.signal ?? undefined),
      ) as T;
    }
    if (path === "/auth/login" && method === "POST") {
      if (typeof init.body !== "string") {
        throw new TypeError("登录需要 JSON 正文");
      }
      const value: unknown = JSON.parse(init.body);
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("登录正文必须是对象");
      }
      const fields = value as Record<string, unknown>;
      if (typeof fields.email !== "string" ||
          typeof fields.password !== "string") {
        throw new TypeError("登录需要 email 和 password");
      }
      return displayUser(
        await login(fields.email, fields.password),
      ) as T;
    }
    if (path === "/auth/logout" && method === "POST") {
      await logout();
      return { ok: true } as T;
    }
    return await request(path, init) as T;
  } catch (error) {
    if (error instanceof ApiFailure) {
      throw new ApiError(
        error.status,
        error.code,
        error.message,
        error.requestId,
      );
    }
    throw error;
  }
}
```

`name` 只是现有 UI 的显示模型，映射自真实 email；它不回写 API 类型，也不参与授权。

### 7.3 顺序浏览器验收

注册一个虚构账号后，React 与 Vue 分别执行同一顺序：

1. 无 Cookie 打开页面，`/auth/me` 为 401，界面是匿名；
2. 登录，响应被 parser 验证，导航显示真实 email；
3. 刷新页面，sid 仍由浏览器发送，`/auth/me` 恢复 token；
4. 发一个收藏或编辑请求，Network 含当前 `X-CSRF-Token`，但日志不打印值；
5. 退出后旧 session 再访问 `/auth/me` 为 401；
6. 停止 API，代理失败成为受控错误，不显示演示数据。

两个前端顺序使用同一个 API origin。若要并行使用 5173/5174，必须让后端显式支持精确 allowlist，
不能把 Origin 放宽成任意值。

## 8. 常见错误与排查路径

### 明确错误：直接调用 `response.json()`

```ts
// 错误示例：502 HTML 会只留下 JSON 语法错误
const data = await response.json();
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | API 停止后页面显示 `Unexpected token '<'` |
| 证据 | Network 响应 Content-Type/正文是代理 HTML，Nest 没有对应请求完成日志 |
| 原因 | 客户端假设所有成功和失败响应都是 JSON |
| 修复 | 正文只读取一次；204 单独处理；JSON 失败转换为受控 `HTTP_ERROR` |
| 复验 | API 停止时显示“服务暂时不可用”和 requestId fallback；恢复后健康接口 200 |

### 快速定位表

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 写请求 403 | Origin 与配置不同 | localhost/127.0.0.1 或端口错 | 统一精确 origin | 同一路径成功，恶意 Origin 仍 403 |
| 刷新后首次写 403 | header 缺 token | 只在登录内存保存，未恢复 | 写前调用 `/auth/me` | 刷新后写请求含新 token |
| 退出后旧 me 覆盖新登录 | 时序中旧请求最后完成 | 没有 generation | 结果写入前比较世代 | 新用户不被旧响应替换 |
| 204 报 parser 错 | 空正文被当 JSON | 未分支处理状态 | 204 返回 undefined | logout 不再解析正文 |
| sid 出现在 localStorage | Application 面板有值 | 把 Cookie 复制进 JS | 只使用 HttpOnly Cookie | localStorage 无 sid |
| 409 自动连续 PATCH | Network 重复同 version | 把冲突当瞬时网络错 | 保留草稿并重读 | 用户明确采用新版本后才提交 |

## 9. 课后题

**1. `credentials: "same-origin"` 会让跨源 API 自动工作吗？**
参考答案：不会。它只在同源请求携带凭据；跨源需要不同 credentials/CORS/Cookie 设计。本课程用代理
保持浏览器同源。

**2. 为什么调用方不能自己传 `X-CSRF-Token`？**
参考答案：旧 helper 可能传固定演示值。唯一客户端必须拥有当前 session token，防止多个来源漂移。

**3. 401 与网络失败为何不能都清用户？**
参考答案：401 是服务端确认当前会话无效；网络失败无法确认会话状态。框架可显示离线/重试，不能把
未知事实伪装成服务器已注销。

**4. AbortController 能取消 PATCH 吗？**
参考答案：它能停止客户端等待和部分网络工作，但请求可能已到服务器并提交。恢复必须重新读取事实。

## 10. 实践练习

### 基础：证明真实代理

在个人 `evidence/proxy.md` 保存健康接口状态、Nest requestId/日志摘要和 API 停止后的失败。完成标准：
Nest 收到请求，停止后不再有演示 200，React/Vue 各执行一次。

### 进阶：覆盖响应边界

用现有测试工具 mock `fetch`，覆盖 204、合法 JSON、401 JSON、409 JSON、502 HTML 和 abort。
完成标准：只读一次 body；错误保留 status/code/requestId；HTML 不泄露正文；abort 仍是
`AbortError`。

### 故障注入：恢复请求晚于登录

让 `/auth/me` 延迟 500 毫秒，立即完成登录，再释放旧响应。记录文件为
`evidence/session-generation.md`。完成标准：旧响应不替换新用户或 token；移除 generation 比较时
测试先失败，恢复后通过。

## 11. 阶段验收

- [ ] 两个 Vite 配置都没有模拟 API plugin，`/api` 不 rewrite。
- [ ] React/Vue 顺序运行在精确 `http://localhost:5173`，真实 Nest 有请求证据。
- [ ] sid 只在 HttpOnly Cookie，CSRF token 只在内存和请求 header。
- [ ] 页面刷新通过 `/auth/me` 恢复 user 与 token。
- [ ] 204、401、403、409、JSON 5xx、HTML 错误和 abort 有不同结果。
- [ ] 所有 Listing 与 session 数据在进入状态前通过 runtime parser。
- [ ] 旧会话响应不能覆盖新登录，401 会推进 generation。
- [ ] mutation 网络失败不自动重发，不声称 abort 已回滚。
- [ ] 客户端被明确标为 browser-only，SSR 隔离仍是未实现边界。

## 12. 常见问题

**为什么 proxy target 用 `127.0.0.1`，页面却用 `localhost`？**
target 是 Vite 进程访问 API 的内部地址；浏览器 origin 由页面 URL 决定。本章固定浏览器使用
`localhost:5173`，后端按它校验。

**能把 CSRF token 放 localStorage 方便刷新吗？**
不需要。刷新后由 `/auth/me` 恢复。持久化扩大泄漏寿命，也不能替代 XSS 防护。

**为什么 `browser-api.ts` 还有泛型断言？**
它只用于兼容已有认证调用；session 已在内部解析。商品和分页禁止走该泛型入口，必须调用明确 parser
的函数。

**前端能设置 Origin header 吗？**
浏览器 Fetch 不允许脚本任意伪造受保护的 Origin。应用应配置并验证真实源，不在客户端造 header。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Vite server.proxy](https://vite.dev/config/server-options.html#server-proxy)：核对开发代理匹配与选项。
- [Fetch credentials](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials)：理解 Cookie 发送和响应 Cookie 接受条件。
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)：区分取消等待与服务端事务。
- [MDN：HTTP 204](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/204)：核对无正文成功语义。
- [MDN：HTTP 409](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/409)：理解状态冲突。
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)：复核 token、Origin 与纵深防御。

## 我现在能做到什么

我能让两个前端通过同一个浏览器 origin 访问真实 API，用唯一客户端恢复 Cookie session 的 CSRF
状态，并把状态码、非 JSON 错误和取消信号转换成可诊断结果；我也能说明这套模块状态只适用于单个
浏览器上下文，不能直接放进多用户 SSR。

## 单元导航

[章节 hub](../01-contract-integration.md) ·
[上一课：工作区契约与运行时校验](01-workspace-contract-runtime-validation.md) ·
[下一课：React Context 与 Vue Pinia 等价接入](03-react-vue-auth-data-integration.md) ·
[全栈交付卷目录](../README.md)
