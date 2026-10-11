# 流式、RSC 与综合验收：唯一完整 React 项目快照

## 任务卡

- **任务**：理解流式/RSC 边界，从本课唯一快照重建 React SPA 与 SSR 实验并执行验收。
- **产出**：`neighborhood-market/apps/react-web` 的完整教学快照、共享场景矩阵和验证记录。
- **运行**：Node.js 24、React 19.3、Vite 8、TS6 兼容编译器、Vitest、Chromium。
- **完成证据**：lint/type/test/build 通过；SSR 200/503/404、安全 JSON、无 JS 与水合可观察。
- **边界**：教学 API 为单进程内存数据；生产 RSC、数据库、事务、部署、负载均未由此证明。

## 1. 任务背景

前面各课提供阶段文件和聚焦片段。如果每章都保存一份“最终项目”，金额、路由和会话修复
很快漂移。本课是 React 卷唯一完整快照：重建时只以这里的完整文件为准，前文用于理解演进。

快照包含 SPA 教学 API、路由、会话、收藏、发布、预约、单元/组件测试和隔离 SSR 实验。
它是可运行教材，不是生产模板；内存重启即丢数据，Cookie/CSRF 仅供本机观察。

## 2. 学习目标

完成后你能：

1. 区分 streaming SSR、RSC、Client Component 与 Server Function；
2. 解释 shell ready、shell error、render error 和 abort；
3. 从 Markdown 完整文件块重建唯一快照；
4. 执行类型、测试、构建、HTTP、无 JS 与水合验收；
5. 用矩阵区分已执行、未执行和跨层保证。

## 3. 预备知识

先完成前七章和本章前两课。创建全新的临时目录，不复用历史
`/tmp/fullstack-react-20261010-verification`。应用路径固定为
`neighborhood-market/apps/react-web`；教材仓库不创建 package、lock、dist 或 node_modules。

安装后记录实际版本，不静默升级 canary。TS7 语言主线与工具链 TS6 兼容命令分开。

## 4. 核心理论

### 4.1 流式 SSR 的状态码窗口

`renderToPipeableStream` 可在 shell ready 后开始发送。`onShellError` 发生在没有可用 shell
时，可返回 500；首字节发出后状态码通常已固定，后续 `onError` 只能记录并让边界恢复。
必须处理客户端断开和超时 abort，避免无限占用资源。

### 4.2 RSC 与 SSR 不是同一层

SSR 输出 HTML；RSC 输出组件树协议，使部分组件代码不进入客户端 bundle。Client Component
也可参与服务器预渲染，不等于“只在浏览器”。普通 Vite 加 `'use client'`/`'use server'`
不会实现 RSC 编译图和传输协议。

### 4.3 Server Function 仍接收不可信输入

Server Function 必须重新认证、对象授权、运行时校验、CSRF 评估和事务处理。函数位于服务器
不代表调用者可信。预约唯一性仍由数据库约束/事务保证。

### 4.4 cache 作用域必须明确

`cache` 可在服务器渲染工作内去重读取，不是自动的跨用户长期缓存。授权结果或私有响应若
跨请求共享，可能泄漏数据。缓存键、请求隔离和失效策略必须一起设计。

## 5. 元素、属性、API 或配置清单

| API / 文件 | 责任 | 生产边界 |
| --- | --- | --- |
| `renderToPipeableStream` | Node 流式 HTML | 状态码、abort、反压 |
| `onShellReady` | shell 可发送 | 不代表全部内容完成 |
| `onShellError` | shell 前失败 | 可选择错误状态页 |
| `onError` | 渲染错误记录 | 首字节后难改状态码 |
| `abort()` | 超时/断开终止渲染 | 不撤销上游事务 |
| RSC | 服务器组件树协议 | 需要框架/构建支持 |
| `'use client'` | 客户端模块边界 | 边界以下进入客户端图 |
| `'use server'` | Server Function 标记 | 仍需授权校验 |
| `cache` | 渲染数据去重 | 不等于公共持久缓存 |
| `server.mjs` | 教学 Vite middleware SSR | 不是生产进程方案 |

## 6. 最小可运行案例

先用纯状态模型理解“发送 shell 后不能改状态码”。

**完整文件：`stream-lab/stream-state.ts`**

```ts
type StreamState =
  | { phase: "waiting"; status: number }
  | { phase: "streaming"; status: number }
  | { phase: "aborted"; status: number; reason: string };

function shellReady(state: StreamState): StreamState {
  return state.phase === "waiting"
    ? { phase: "streaming", status: state.status }
    : state;
}

function fail(state: StreamState, reason: string): StreamState {
  return state.phase === "waiting"
    ? { phase: "aborted", status: 500, reason }
    : { phase: "aborted", status: state.status, reason };
}

const beforeShell = fail({ phase: "waiting", status: 200 }, "shell-error");
const afterShell = fail(
  shellReady({ phase: "waiting", status: 200 }),
  "late-error",
);
if (beforeShell.status !== 500) throw new Error("shell error status");
if (afterShell.status !== 200) throw new Error("status changed after flush");
console.log("stream-boundaries-ok");
```

**命令：在 `stream-lab` 执行**

```bash
pnpm exec tsc --strict --target ES2022 --module NodeNext \
  --moduleResolution NodeNext stream-state.ts
node stream-state.js
```

预期输出 `stream-boundaries-ok`。真实流式实现还要接 Node response、错误边界、超时和客户端
断开；本快照使用 `renderToString`，让验证重点保持在安全水合和状态码。

## 7. 邻里集市集成案例

以下完整文件共同组成唯一最终快照。同一路径在本课只出现一次。

### 7.1 工具与配置

**完整文件：`neighborhood-market/apps/react-web/package.json`**

```json
{
  "name": "react-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc6 --noEmit",
    "test": "vitest run",
    "build": "pnpm typecheck && vite build",
    "e2e": "playwright test",
    "ssr": "node ssr-lab/server.mjs"
  },
  "dependencies": {
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "react-router": "8.4.0"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@playwright/test": "1.64.0",
    "@testing-library/jest-dom": "7.0.1",
    "@testing-library/react": "16.3.3",
    "@testing-library/user-event": "14.6.7",
    "@types/node": "24.19.2",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "eslint": "10.12.0",
    "eslint-plugin-react-hooks": "7.1.1",
    "globals": "17.13.0",
    "jsdom": "30.1.1",
    "typescript": "npm:@typescript/typescript6@6.0.2",
    "typescript-eslint": "8.71.1",
    "vite": "8.3.4",
    "vitest": "5.0.3"
  }
}
```

**完整文件：`neighborhood-market/apps/react-web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vite/client", "node"]
  },
  "include": [
    "src",
    "e2e",
    "ssr-lab/src",
    "*.ts",
    "*.mjs"
  ]
}
```

**完整文件：`neighborhood-market/apps/react-web/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import devApi from "./dev-api.ts";

export default defineConfig({
  plugins: [react(), devApi()],
});
```

**完整文件：`neighborhood-market/apps/react-web/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>邻里集市 React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**完整文件：`neighborhood-market/apps/react-web/eslint.config.mjs`**

```js
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: { "react-hooks": hooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { "argsIgnorePattern": "^_" }
      ],
      "no-debugger": "error"
    }
  },
  {
    files: ["**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node }
  }
]);
```

**完整文件：`neighborhood-market/apps/react-web/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
```

**完整文件：`neighborhood-market/apps/react-web/playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5183" },
  webServer: {
    command: "pnpm dev --host 127.0.0.1 --port 5183 --strictPort",
    url: "http://127.0.0.1:5183",
    reuseExistingServer: false,
  },
});
```

### 7.2 领域、表单与 HTTP

**完整文件：`neighborhood-market/apps/react-web/src/domain.ts`**

```ts
export type ListingStatus = "available" | "reserved" | "sold";

export type Listing = Readonly<{
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: ListingStatus;
  ownerId: string;
  version: number;
  createdAt: string;
}>;

export type Page<T> = Readonly<{
  items: readonly T[];
  page: number;
  pageSize: number;
  total: number;
}>;

export type Reservation = Readonly<{
  id: string;
  listingId: string;
  buyerId: string;
  status: "pending" | "confirmed" | "cancelled";
  createdAt: string;
}>;

export const money = (cents: number) =>
  new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(cents / 100);

export const seed: Listing[] = [
  {
    id: "lamp-1",
    title: "九成新台灯",
    description: "暖光，功能正常，可在社区门口当面验货。",
    priceCents: 3500,
    status: "available",
    ownerId: "seller-1",
    version: 1,
    createdAt: "2026-10-01T08:00:00.000Z",
  },
  {
    id: "desk-1",
    title: "折叠桌",
    description: "适合小阳台，桌面有一处轻微划痕。",
    priceCents: 8000,
    status: "reserved",
    ownerId: "seller-2",
    version: 1,
    createdAt: "2026-10-02T08:00:00.000Z",
  },
];
```

**完整文件：`neighborhood-market/apps/react-web/src/form.ts`**

```ts
export type Draft = Readonly<{
  title: string;
  description: string;
  price: string;
}>;

export type ListingInput = Readonly<{
  title: string;
  description: string;
  priceCents: number;
}>;

export function parsePrice(text: string): number | null {
  const match = /^(0|[1-9]\d{0,6})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const cents =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  return Number.isSafeInteger(cents) &&
    cents >= 0 &&
    cents <= 100_000_000
    ? cents
    : null;
}

export function validateDraft(draft: Draft):
  | { ok: true; value: ListingInput }
  | { ok: false; message: string } {
  const title = draft.title.trim();
  const description = draft.description.trim();
  const priceCents = parsePrice(draft.price);
  if (title.length < 2 || title.length > 60) {
    return { ok: false, message: "标题需要 2 到 60 个字符。" };
  }
  if (description.length < 5 || description.length > 500) {
    return { ok: false, message: "描述需要 5 到 500 个字符。" };
  }
  if (priceCents === null) {
    return {
      ok: false,
      message: "价格需为 0 至 1000000 元，最多两位小数。",
    };
  }
  return { ok: true, value: { title, description, priceCents } };
}
```

**完整文件：`neighborhood-market/apps/react-web/src/api.ts`**

```ts
import type { Listing, Page, Reservation } from "./domain";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId: string,
  ) {
    super(message);
  }
}

export class ResponseValidationError extends Error {}

type RecordValue = Record<string, unknown>;

function record(value: unknown, label: string): RecordValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ResponseValidationError(`${label} 不是对象。`);
  }
  return value as RecordValue;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new ResponseValidationError(`${label} 不是字符串。`);
  }
  return value;
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new ResponseValidationError(`${label} 不是安全整数。`);
  }
  return value as number;
}

function nonNegativeInteger(value: unknown, label: string): number {
  const parsed = integer(value, label);
  if (parsed < 0) {
    throw new ResponseValidationError(`${label} 不能为负数。`);
  }
  return parsed;
}

function positiveInteger(value: unknown, label: string): number {
  const parsed = integer(value, label);
  if (parsed < 1) {
    throw new ResponseValidationError(`${label} 必须为正整数。`);
  }
  return parsed;
}

function utcInstant(value: unknown, label: string): string {
  const parsed = text(value, label);
  const date = new Date(parsed);
  if (Number.isNaN(date.valueOf()) || date.toISOString() !== parsed) {
    throw new ResponseValidationError(`${label} 不是规范 UTC 时间。`);
  }
  return parsed;
}

export function parseUser(value: unknown) {
  const data = record(value, "用户响应");
  return { id: text(data.id, "user.id"), name: text(data.name, "user.name") };
}

export function parseListing(value: unknown): Listing {
  const data = record(value, "商品响应");
  const status = text(data.status, "listing.status");
  if (!["available", "reserved", "sold"].includes(status)) {
    throw new ResponseValidationError("listing.status 非法。");
  }
  return {
    id: text(data.id, "listing.id"),
    title: text(data.title, "listing.title"),
    description: text(data.description, "listing.description"),
    priceCents: nonNegativeInteger(data.priceCents, "listing.priceCents"),
    status: status as Listing["status"],
    ownerId: text(data.ownerId, "listing.ownerId"),
    version: positiveInteger(data.version, "listing.version"),
    createdAt: utcInstant(data.createdAt, "listing.createdAt"),
  };
}

export function parseListingPage(value: unknown): Page<Listing> {
  const data = record(value, "分页响应");
  if (!Array.isArray(data.items)) {
    throw new ResponseValidationError("page.items 不是数组。");
  }
  return {
    items: data.items.map(parseListing),
    page: positiveInteger(data.page, "page.page"),
    pageSize: positiveInteger(data.pageSize, "page.pageSize"),
    total: nonNegativeInteger(data.total, "page.total"),
  };
}

export function parseReservation(value: unknown): Reservation {
  const data = record(value, "预约响应");
  const status = text(data.status, "reservation.status");
  if (!["pending", "confirmed", "cancelled"].includes(status)) {
    throw new ResponseValidationError("reservation.status 非法。");
  }
  return {
    id: text(data.id, "reservation.id"),
    listingId: text(data.listingId, "reservation.listingId"),
    buyerId: text(data.buyerId, "reservation.buyerId"),
    status: status as Reservation["status"],
    createdAt: utcInstant(data.createdAt, "reservation.createdAt"),
  };
}

export function parseAck(value: unknown): RecordValue {
  return record(value, "确认响应");
}

export async function api<T>(
  path: string,
  parse: (value: unknown) => T,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("Content-Type", "application/json");
  if (init.method && init.method !== "GET") {
    headers.set("X-CSRF-Token", "demo-csrf");
  }
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  if (response.status === 204 && response.ok) return parse(undefined);
  const value: unknown = await response.json();
  if (!response.ok) {
    const body = record(value, "错误响应");
    throw new ApiError(
      response.status,
      typeof body.code === "string" ? body.code : "HTTP_ERROR",
      typeof body.message === "string" ? body.message : "请求失败。",
      typeof body.requestId === "string" ? body.requestId : "unknown",
    );
  }
  return parse(value);
}
```

### 7.3 收藏与会话

**完整文件：`neighborhood-market/apps/react-web/src/favorite-state.ts`**

```ts
export type FavoriteState = Readonly<{
  ids: readonly string[];
  pending: readonly string[];
  error: string;
}>;

export type FavoriteAction =
  | { type: "start"; id: string }
  | { type: "saved"; id: string; selected: boolean }
  | { type: "failed"; id: string; message: string }
  | { type: "reset" };

export const initialFavorites: FavoriteState = {
  ids: [],
  pending: [],
  error: "",
};

export function favoriteReducer(
  state: FavoriteState,
  action: FavoriteAction,
): FavoriteState {
  switch (action.type) {
    case "start":
      return {
        ...state,
        pending: [...new Set([...state.pending, action.id])],
        error: "",
      };
    case "saved":
      return {
        ids: action.selected
          ? [...new Set([...state.ids, action.id])]
          : state.ids.filter((id) => id !== action.id),
        pending: state.pending.filter((id) => id !== action.id),
        error: "",
      };
    case "failed":
      return {
        ...state,
        pending: state.pending.filter((id) => id !== action.id),
        error: action.message,
      };
    case "reset":
      return initialFavorites;
  }
}
```

**完整文件：`neighborhood-market/apps/react-web/src/MarketContext.tsx`**

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api, ApiError, parseAck, parseUser } from "./api";
import {
  favoriteReducer,
  initialFavorites,
  type FavoriteState,
} from "./favorite-state";

type User = Readonly<{ id: string; name: string }>;
type MarketValue = Readonly<{
  user: User | null;
  sessionLoading: boolean;
  sessionError: string;
  favorites: FavoriteState;
  setFavorite: (id: string, selected: boolean) => Promise<void>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}>;

const MarketContext = createContext<MarketValue | null>(null);

function message(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function resolveCurrent<T>(
  request: Promise<T>,
  startedAt: number,
  currentEpoch: () => number,
): Promise<T | null> {
  const value = await request;
  return startedAt === currentEpoch() ? value : null;
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [favorites, dispatch] = useReducer(favoriteReducer, initialFavorites);
  const locks = useRef(new Set<string>());
  const epoch = useRef(0);

  function invalidate() {
    epoch.current += 1;
    locks.current.clear();
    dispatch({ type: "reset" });
    setUser(null);
    setSessionLoading(false);
  }

  async function refreshSession() {
    const startedAt = epoch.current;
    setSessionLoading(true);
    setSessionError("");
    try {
      const next = await resolveCurrent(
        api("/auth/me", parseUser),
        startedAt,
        () => epoch.current,
      );
      if (next) setUser(next);
    } catch (error) {
      if (startedAt !== epoch.current) return;
      if (error instanceof ApiError && error.status === 401) invalidate();
      else setSessionError(message(error, "会话读取失败。"));
    } finally {
      if (startedAt === epoch.current) setSessionLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const startedAt = epoch.current;
    resolveCurrent(
      api("/auth/me", parseUser, { signal: controller.signal }),
      startedAt,
      () => epoch.current,
    )
      .then((next) => {
        if (!controller.signal.aborted && next) {
          setUser(next);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || startedAt !== epoch.current) return;
        if (error instanceof ApiError && error.status === 401) setUser(null);
        else setSessionError(message(error, "会话读取失败。"));
      })
      .finally(() => {
        if (!controller.signal.aborted && startedAt === epoch.current) {
          setSessionLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  async function setFavorite(id: string, selected: boolean) {
    if (locks.current.has(id)) return;
    locks.current.add(id);
    const startedAt = epoch.current;
    dispatch({ type: "start", id });
    try {
      await api(`/favorites/${encodeURIComponent(id)}`, parseAck, {
        method: selected ? "PUT" : "DELETE",
      });
      if (startedAt === epoch.current) {
        dispatch({ type: "saved", id, selected });
      }
    } catch (error) {
      if (startedAt !== epoch.current) return;
      if (error instanceof ApiError && error.status === 401) {
        invalidate();
      } else {
        dispatch({
          type: "failed",
          id,
          message: message(error, "收藏失败。"),
        });
      }
    } finally {
      if (startedAt === epoch.current) locks.current.delete(id);
    }
  }

  async function logout() {
    await api("/auth/logout", parseAck, { method: "POST", body: "{}" });
    invalidate();
    setSessionError("");
    setSessionLoading(false);
  }

  return (
    <MarketContext value={{
      user,
      sessionLoading,
      sessionError,
      favorites,
      setFavorite,
      refreshSession,
      logout,
    }}>
      {children}
    </MarketContext>
  );
}

export function useMarket() {
  const value = useContext(MarketContext);
  if (value === null) {
    throw new Error("useMarket 必须在 MarketProvider 内使用");
  }
  return value;
}
```

### 7.4 页面、路由与样式

**完整文件：`neighborhood-market/apps/react-web/src/App.tsx`**

```tsx
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  createBrowserRouter,
  Form,
  isRouteErrorResponse,
  Link,
  Outlet,
  redirect,
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  useNavigationType,
  useRouteError,
} from "react-router";
import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
} from "react-router";
import {
  api,
  ApiError,
  parseListing,
  parseListingPage,
  parseReservation,
  parseUser,
} from "./api";
import type { Listing } from "./domain";
import { money } from "./domain";
import type { ListingInput } from "./form";
import { validateDraft } from "./form";
import { useMarket } from "./MarketContext";

function routeTitle(pathname: string) {
  if (pathname === "/new") return "发布商品";
  if (pathname === "/login") return "教学登录";
  if (pathname.startsWith("/listings/")) return "商品详情";
  return "商品列表";
}

function positiveInt(text: string | null, fallback: number) {
  return text && /^\d+$/.test(text) && Number(text) > 0
    ? Number(text)
    : fallback;
}

async function listLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const page = positiveInt(url.searchParams.get("page"), 1);
  const params = new URLSearchParams({ q, page: String(page), pageSize: "20" });
  try {
    const result = await api(`/listings?${params}`, parseListingPage, {
      signal: request.signal,
    });
    if (result.page !== page) {
      params.set("page", String(result.page));
      throw redirect(`/listings?${params}`);
    }
    return { result, q };
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
}

async function detailLoader({ params, request }: LoaderFunctionArgs) {
  try {
    return await api(
      `/listings/${encodeURIComponent(params.id ?? "")}`,
      parseListing,
      { signal: request.signal },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      throw new Response(error.message, { status: error.status });
    }
    throw error;
  }
}

type ActionResult = Readonly<{
  error?: string;
  success?: string;
  status?: number;
  code?: string;
  requestId?: string;
}>;

async function reserveAction({ params, request }: ActionFunctionArgs):
Promise<ActionResult> {
  const form = await request.formData();
  if (form.get("intent") !== "reserve") return { error: "未知操作。" };
  try {
    const reservation = await api(
      `/listings/${encodeURIComponent(params.id ?? "")}/reservations`,
      parseReservation,
      { method: "POST", body: "{}" },
    );
    return { success: `预约成功，预约编号：${reservation.id}` };
  } catch (error) {
    return error instanceof ApiError
      ? {
          error: error.message,
          status: error.status,
          code: error.code,
          requestId: error.requestId,
        }
      : { error: error instanceof Error ? error.message : "预约失败。" };
  }
}

async function loginAction() {
  await api("/auth/login", parseUser, { method: "POST", body: "{}" });
  return redirect("/listings");
}

function ListingCard(props: { listing: Listing; children?: ReactNode }) {
  const status = {
    available: "可预约",
    reserved: "已预约",
    sold: "已售出",
  } satisfies Record<Listing["status"], string>;
  return (
    <article aria-labelledby={`title-${props.listing.id}`}>
      <h2 id={`title-${props.listing.id}`}>{props.listing.title}</h2>
      <p>{props.listing.description}</p>
      <p>
        <strong>{money(props.listing.priceCents)}</strong>
        {" · "}
        {status[props.listing.status]}
      </p>
      {props.children}
    </article>
  );
}

function FavoriteButton({ id }: { id: string }) {
  const { favorites, setFavorite, user } = useMarket();
  const selected = favorites.ids.includes(id);
  const pending = favorites.pending.includes(id);
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={pending || user === null}
      onClick={() => void setFavorite(id, !selected)}
    >
      {pending ? "正在保存" : selected ? "取消收藏" : "收藏"}
    </button>
  );
}

function SessionBar() {
  const market = useMarket();
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    setError("");
    try {
      await action();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "会话操作失败。");
    }
  }
  return (
    <section aria-label="会话与收藏">
      <p>
        {market.sessionLoading
          ? "正在确认会话"
          : market.user
            ? `你好，${market.user.name}`
            : "尚未登录"}
      </p>
      <p role="status">本次会话收藏 {market.favorites.ids.length} 件</p>
      <button type="button" onClick={() => void run(market.refreshSession)}>
        登录后刷新会话
      </button>
      {market.user && (
        <button type="button" onClick={() => void run(market.logout)}>
          注销
        </button>
      )}
      {(error || market.sessionError || market.favorites.error) && (
        <p role="alert">
          {error || market.sessionError || market.favorites.error}
        </p>
      )}
    </section>
  );
}

export function ListingForm(props: {
  onSave: (input: ListingInput) => void | Promise<void>;
}) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [phase, setPhase] =
    useState<"idle" | "pending" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (phase === "pending") return;
    const result = validateDraft({ title, description, price });
    if (!result.ok) {
      setPhase("error");
      setMessage(result.message);
      return;
    }
    setPhase("pending");
    setMessage("正在发布……");
    try {
      await props.onSave(result.value);
      setTitle("");
      setDescription("");
      setPrice("");
      setPhase("success");
      setMessage("发布成功。");
    } catch (error) {
      setPhase("error");
      setMessage(error instanceof Error ? error.message : "发布失败。");
    }
  }

  return (
    <form onSubmit={submit} aria-label="发布商品" aria-busy={phase === "pending"}>
      <h2>发布闲置</h2>
      <label htmlFor={`${id}-title`}>标题</label>
      <input
        id={`${id}-title`}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <label htmlFor={`${id}-description`}>描述</label>
      <textarea
        id={`${id}-description`}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        required
      />
      <label htmlFor={`${id}-price`}>价格（元）</label>
      <input
        id={`${id}-price`}
        inputMode="decimal"
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        required
      />
      <button disabled={phase === "pending"}>
        {phase === "pending" ? "正在发布" : "发布"}
      </button>
      <p role={phase === "error" ? "alert" : "status"}>{message}</p>
    </form>
  );
}

function Layout() {
  const navigation = useNavigation();
  const navigationType = useNavigationType();
  const location = useLocation();
  const heading = useRef<HTMLHeadingElement>(null);
  const previousPath = useRef(location.pathname);
  const mounted = useRef(false);
  useEffect(() => {
    document.title = `${routeTitle(location.pathname)} · 邻里集市`;
    if (!mounted.current && navigationType !== "POP") {
      heading.current?.focus();
    } else if (mounted.current && previousPath.current !== location.pathname) {
      heading.current?.focus();
    }
    mounted.current = true;
    previousPath.current = location.pathname;
  }, [location.pathname, navigationType]);
  return (
    <main>
      <h1 ref={heading} tabIndex={-1}>邻里集市</h1>
      <nav aria-label="主导航">
        <Link to="/listings">商品</Link>{" · "}
        <Link to="/new">发布</Link>{" · "}
        <Link to="/login">登录</Link>
      </nav>
      {navigation.state !== "idle" && <p role="status">正在切换页面……</p>}
      <SessionBar />
      <Outlet />
    </main>
  );
}

function ListPage() {
  const { result, q } = useLoaderData<typeof listLoader>();
  const navigation = useNavigation();
  const searchInput = useRef<HTMLInputElement>(null);
  const restoreSearchFocus = useRef(false);
  useEffect(() => {
    if (navigation.state !== "idle" && navigation.formMethod === "GET") {
      restoreSearchFocus.current = true;
    } else if (restoreSearchFocus.current) {
      restoreSearchFocus.current = false;
      searchInput.current?.focus();
    }
  }, [navigation.formMethod, navigation.state]);
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  function href(page: number) {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    query.set("page", String(page));
    return `/listings?${query}`;
  }
  return (
    <section aria-label="商品列表">
      <Form method="get">
        <label htmlFor="q">搜索标题</label>
        <input ref={searchInput} id="q" name="q" defaultValue={q} />
        <button>筛选</button>
      </Form>
      <p role="status">找到 {result.total} 件商品</p>
      {result.items.length === 0
        ? <p>没有匹配商品。</p>
        : result.items.map((item) => (
          <ListingCard key={item.id} listing={item}>
            <Link to={`/listings/${encodeURIComponent(item.id)}`}>
              查看详情
            </Link>{" "}
            <FavoriteButton id={item.id} />
          </ListingCard>
        ))}
      <nav aria-label="分页">
        {result.page > 1 && <Link to={href(result.page - 1)}>上一页</Link>}
        <span> 第 {result.page} / {pageCount} 页 </span>
        {result.page < pageCount &&
          <Link to={href(result.page + 1)}>下一页</Link>}
      </nav>
    </section>
  );
}

function DetailPage() {
  const listing = useLoaderData<typeof detailLoader>();
  const result = useActionData<typeof reserveAction>();
  const navigation = useNavigation();
  return (
    <section aria-label="商品详情">
      <ListingCard listing={listing} />
      <FavoriteButton id={listing.id} />
      <Form method="post">
        <input type="hidden" name="intent" value="reserve" />
        <button
          disabled={
            navigation.state !== "idle" || listing.status !== "available"
          }
        >
          预约
        </button>
      </Form>
      {result?.error && (
        <p role="alert">
          {result.status} {result.code}：{result.error}
          {result.requestId && `（请求 ${result.requestId}）`}
        </p>
      )}
      {result?.success && <p role="status">{result.success}</p>}
    </section>
  );
}

function NewPage() {
  const navigate = useNavigate();
  async function save(input: ListingInput) {
    const created = await api("/listings", parseListing, {
      method: "POST",
      body: JSON.stringify(input),
    });
    await navigate(`/listings/${encodeURIComponent(created.id)}`);
  }
  return <ListingForm onSave={save} />;
}

function LoginPage() {
  return (
    <section>
      <h2>教学登录</h2>
      <p>仅创建本机演示会话，不收集真实密码。</p>
      <Form method="post">
        <button>以演示居民登录</button>
      </Form>
    </section>
  );
}

function RouteError() {
  const error = useRouteError();
  const text = isRouteErrorResponse(error)
    ? `${error.status}：${String(error.data)}`
    : error instanceof Error
      ? error.message
      : "页面加载失败。";
  return (
    <section role="alert">
      <h2>暂时无法显示页面</h2>
      <p>{text}</p>
      <Link to="/listings">返回商品列表</Link>
    </section>
  );
}

export const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: "/", loader: () => redirect("/listings") },
      { path: "/listings", loader: listLoader, element: <ListPage /> },
      {
        path: "/listings/:id",
        loader: detailLoader,
        action: reserveAction,
        element: <DetailPage />,
      },
      { path: "/new", element: <NewPage /> },
      { path: "/login", action: loginAction, element: <LoginPage /> },
      { path: "*", element: <p role="alert">404：页面不存在。</p> },
    ],
  },
]);
```

`Layout` 使用 pathname Effect 更新 `document.title`，并在客户端首次挂载之后的导航或错误恢复重挂载时聚焦主标题；初次水合不主动抢走浏览器焦点。更大的应用可把它封装成独立 `RouteFocus`。它没有读取私有数据，也不在 render 中修改 DOM 或 React state。

**完整文件：`neighborhood-market/apps/react-web/src/main.tsx`**

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./App";
import { MarketProvider } from "./MarketContext";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("缺少 #root");

createRoot(root).render(
  <StrictMode>
    <MarketProvider>
      <RouterProvider router={router} />
    </MarketProvider>
  </StrictMode>,
);
```

**完整文件：`neighborhood-market/apps/react-web/src/styles.css`**

```css
:root {
  color: #172033;
  background: #f5f7fb;
  font-family: system-ui, sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

main {
  width: min(70rem, 100% - 2rem);
  margin: 0 auto;
  padding: 1rem 0 3rem;
}

nav,
form,
section,
article {
  margin-block: 1rem;
}

article {
  padding: 1rem;
  border: 1px solid #c8d0df;
  border-radius: 0.75rem;
  background: white;
}

label,
input,
textarea,
button {
  display: block;
  max-width: 100%;
  margin-block: 0.5rem;
}

input,
textarea {
  width: min(32rem, 100%);
  padding: 0.65rem;
}

button {
  padding: 0.6rem 0.9rem;
}

:focus-visible {
  outline: 3px solid #155eef;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 7.5 本机教学 API

**完整文件：`neighborhood-market/apps/react-web/dev-api.ts`**

```ts
import type { IncomingMessage } from "node:http";
import type { Plugin } from "vite";
import { seed } from "./src/domain.ts";
import { validateDraft } from "./src/form.ts";

async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
  let text = "";
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 16_384) throw new Error("请求体过大");
  }
  const value: unknown = text ? JSON.parse(text) : {};
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("请求体必须为对象");
  }
  return value as Record<string, unknown>;
}

export default function devApi(): Plugin {
  let items = structuredClone(seed);
  const favorites = new Set<string>();
  return {
    name: "neighborhood-dev-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        if (!url.pathname.startsWith("/api/v1/")) return next();
        const path = url.pathname.slice("/api/v1".length);
        const method = req.method ?? "GET";
        const loggedIn = /(?:^|;\s*)demo_session=buyer(?:;|$)/.test(
          req.headers.cookie ?? "",
        );
        const send = (status: number, data: unknown) => {
          res.statusCode = status;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(data));
        };
        const fail = (status: number, code: string, message: string) =>
          send(status, { code, message, requestId: crypto.randomUUID() });

        try {
          await new Promise((resolve) => setTimeout(resolve, 100));
          if (method === "GET" && path === "/auth/me") {
            return loggedIn
              ? send(200, { id: "demo-buyer", name: "演示居民" })
              : fail(401, "SESSION_EXPIRED", "请先登录。");
          }
          if (method !== "GET" && req.headers["x-csrf-token"] !== "demo-csrf") {
            return fail(403, "CSRF", "缺少教学 CSRF 标记。");
          }
          if (method === "POST" && path === "/auth/login") {
            await body(req);
            res.setHeader(
              "Set-Cookie",
              "demo_session=buyer; HttpOnly; SameSite=Lax; Path=/",
            );
            return send(200, { id: "demo-buyer", name: "演示居民" });
          }
          if (method === "POST" && path === "/auth/logout") {
            favorites.clear();
            res.setHeader(
              "Set-Cookie",
              "demo_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
            );
            return send(200, { ok: true });
          }
          if (method === "GET" && path === "/listings") {
            const q = url.searchParams.get("q") ?? "";
            if (q === "__error") {
              return fail(503, "DEMO_FAILURE", "演示服务故障。");
            }
            const requestedPage =
              Math.max(1, Number(url.searchParams.get("page")) || 1);
            const pageSize = Math.min(
              100,
              Math.max(1, Number(url.searchParams.get("pageSize")) || 20),
            );
            const filtered = items.filter((item) => item.title.includes(q));
            const pageCount =
              Math.max(1, Math.ceil(filtered.length / pageSize));
            const page = Math.min(requestedPage, pageCount);
            return send(200, {
              items: filtered.slice((page - 1) * pageSize, page * pageSize),
              page,
              pageSize,
              total: filtered.length,
            });
          }

          const listingMatch = /^\/listings\/([^/]+)$/.exec(path);
          const reservationMatch =
            /^\/listings\/([^/]+)\/reservations$/.exec(path);
          const favoriteMatch = /^\/favorites\/([^/]+)$/.exec(path);
          const id = decodeURIComponent(
            (listingMatch ?? reservationMatch ?? favoriteMatch)?.[1] ?? "",
          );
          const item = items.find((value) => value.id === id);

          if (listingMatch && method === "GET") {
            return item
              ? send(200, item)
              : fail(404, "NOT_FOUND", "商品不存在。");
          }
          if (!loggedIn) {
            return fail(401, "SESSION_EXPIRED", "请先登录。");
          }
          if (method === "POST" && path === "/listings") {
            const data = await body(req);
            const cents = data.priceCents;
            if (typeof cents !== "number" || !Number.isSafeInteger(cents)) {
              return fail(400, "VALIDATION", "价格必须为整数分。");
            }
            const result = validateDraft({
              title: String(data.title ?? ""),
              description: String(data.description ?? ""),
              price: (cents / 100).toFixed(2),
            });
            if (!result.ok) return fail(400, "VALIDATION", result.message);
            const created = {
              ...result.value,
              id: crypto.randomUUID(),
              status: "available" as const,
              ownerId: "demo-buyer",
              version: 1,
              createdAt: new Date().toISOString(),
            };
            items = [created, ...items];
            return send(201, created);
          }
          if (!item) return fail(404, "NOT_FOUND", "商品不存在。");
          if (reservationMatch && method === "POST") {
            if (item.ownerId === "demo-buyer") {
              return fail(403, "FORBIDDEN", "不能预约自己的商品。");
            }
            if (item.status !== "available") {
              return fail(409, "RESERVATION_CONFLICT", "商品已被预约。");
            }
            items = items.map((value) => value.id === id
              ? { ...value, status: "reserved", version: value.version + 1 }
              : value);
            return send(201, {
              id: crypto.randomUUID(),
              listingId: id,
              buyerId: "demo-buyer",
              status: "pending",
              createdAt: new Date().toISOString(),
            });
          }
          if (favoriteMatch && ["PUT", "DELETE"].includes(method)) {
            if (method === "PUT") favorites.add(id);
            else favorites.delete(id);
            return send(200, { ok: true });
          }
          return fail(405, "METHOD_NOT_ALLOWED", "不支持此方法。");
        } catch {
          return fail(400, "BAD_REQUEST", "请求格式错误。");
        }
      });
    },
  };
}
```

此 API 明确是 localhost 单进程内存实现：重启清空，不存密码，无数据库事务、跨实例隔离、
生产 CSRF 或真实收藏查询。正式联调时删除插件并代理到后端。

### 7.6 单元、组件与浏览器测试

**完整文件：`neighborhood-market/apps/react-web/src/test-setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);
```

**完整文件：`neighborhood-market/apps/react-web/src/app.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ListingForm } from "./App";
import {
  api,
  parseListing,
  parseListingPage,
  ResponseValidationError,
} from "./api";
import { favoriteReducer, initialFavorites } from "./favorite-state";
import { parsePrice } from "./form";
import { MarketProvider, useMarket } from "./MarketContext";

vi.mock("./api", async importOriginal => {
  const original = await importOriginal<typeof import("./api")>();
  return { ...original, api: vi.fn() };
});

const request = vi.mocked(api);

describe("price-and-draft-contract", () => {
  it.each([
    ["35.10", 3510],
    ["0", 0],
    ["1000000.00", 100000000],
    ["-1", null],
    ["3e2", null],
    ["01", null],
    ["35.001", null],
    ["1000000.01", null],
  ])("parsePrice(%s)", (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });
});

it("favorite-target-is-idempotent", () => {
  const action = { type: "saved", id: "lamp-1", selected: true } as const;
  const once = favoriteReducer(initialFavorites, action);
  expect(favoriteReducer(once, action).ids).toEqual(["lamp-1"]);
  expect(initialFavorites.ids).toEqual([]);
});

it("runtime-response-parser-rejects-malformed-success", () => {
  const valid = {
    id: "lamp-1",
    title: "台灯",
    description: "完整字段",
    priceCents: 3500,
    status: "available",
    ownerId: "seller-1",
    version: 1,
    createdAt: "2026-10-11T08:00:00.000Z",
  };
  for (const invalid of [
    { ...valid, priceCents: -1 },
    { ...valid, version: 0 },
    { ...valid, createdAt: "2026-10-11" },
  ]) {
    expect(() => parseListing(invalid)).toThrow(ResponseValidationError);
  }
  expect(() => parseListingPage({
    items: [valid],
    page: 0,
    pageSize: 20,
    total: -1,
  })).toThrow(ResponseValidationError);
});

function SessionProbe() {
  const market = useMarket();
  return (
    <>
      <output aria-label="当前用户">{market.user?.name ?? "anonymous"}</output>
      <p role="alert">{market.sessionError}</p>
      <button onClick={() => void market.refreshSession()}>刷新会话</button>
      <button onClick={() => void market.logout()}>注销会话</button>
    </>
  );
}

it("late-session-result-is-ignored-after-real-logout", async () => {
  request.mockReset();
  request.mockResolvedValueOnce({ id: "current-user", name: "当前会话" });
  render(
    <MarketProvider>
      <SessionProbe />
    </MarketProvider>,
  );
  expect(await screen.findByLabelText("当前用户")).toHaveTextContent("当前会话");

  let finish!: (value: { id: string; name: string }) => void;
  request.mockImplementationOnce(() =>
    new Promise(resolve => {
      finish = resolve;
    })
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "刷新会话" }));
  request.mockResolvedValueOnce({ ok: true });
  await user.click(screen.getByRole("button", { name: "注销会话" }));
  await waitFor(() =>
    expect(screen.getByLabelText("当前用户")).toHaveTextContent("anonymous")
  );
  finish({ id: "old-user", name: "旧会话" });
  await waitFor(() =>
    expect(screen.getByLabelText("当前用户")).toHaveTextContent("anonymous")
  );
});

it("late-session-rejection-does-not-cross-logout", async () => {
  request.mockReset();
  request.mockResolvedValueOnce({ id: "current-user", name: "当前会话" });
  render(
    <MarketProvider>
      <SessionProbe />
    </MarketProvider>,
  );
  expect(await screen.findByLabelText("当前用户")).toHaveTextContent("当前会话");

  let reject!: (reason: unknown) => void;
  request.mockImplementationOnce(() =>
    new Promise((_resolve, onReject) => {
      reject = onReject;
    })
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "刷新会话" }));
  request.mockResolvedValueOnce({ ok: true });
  await user.click(screen.getByRole("button", { name: "注销会话" }));
  reject(new Error("旧请求失败"));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("")
  );
});

it("failed-publish-keeps-draft", async () => {
  const user = userEvent.setup();
  const onSave = vi.fn().mockRejectedValue(new Error("服务暂不可用"));
  render(<ListingForm onSave={onSave} />);
  await user.type(screen.getByLabelText("标题"), "二手书架");
  await user.type(screen.getByLabelText("描述"), "可拆卸，配件齐全。");
  await user.type(screen.getByLabelText("价格（元）"), "120.00");
  await user.click(screen.getByRole("button", { name: "发布" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("服务暂不可用");
  expect(screen.getByLabelText("标题")).toHaveValue("二手书架");
  expect(onSave).toHaveBeenCalledWith({
    title: "二手书架",
    description: "可拆卸，配件齐全。",
    priceCents: 12000,
  });
});
```

**完整文件：`neighborhood-market/apps/react-web/e2e/market.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test("search-empty-and-recovery", async ({ page }) => {
  await page.goto("/listings?q=不存在");
  await expect(page.getByText("没有匹配商品。")).toBeVisible();
  await page.goto("/listings?q=__error");
  await expect(page.getByRole("alert")).toContainText("503");
  await page.getByRole("link", { name: "返回商品列表" }).click();
  await expect(page.getByRole("heading", { name: "邻里集市" })).toBeFocused();
  await expect(page).toHaveTitle("商品列表 · 邻里集市");
});

test("login-publish-favorite-logout", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "以演示居民登录" }).click();
  await expect(page).toHaveURL(/\/listings$/);
  await page.getByRole("button", { name: "登录后刷新会话" }).click();
  await expect(page.getByText("你好，演示居民")).toBeVisible();
  await page.getByRole("link", { name: "发布" }).click();
  await expect(page).toHaveURL(/\/new$/);
  await page.getByLabel("标题", { exact: true }).fill("二手书架");
  await page.getByLabel("描述").fill("可拆卸，配件齐全。");
  await page.getByLabel("价格（元）").fill("120.00");
  await page.getByRole("button", { name: "发布", exact: true }).click();
  await expect(page.getByRole("heading", { name: "二手书架" })).toBeVisible();
  await page.getByRole("button", { name: "收藏", exact: true }).click();
  await expect(page.getByRole("button", { name: "取消收藏" }))
    .toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "注销" }).click();
  await expect(page.getByText("尚未登录")).toBeVisible();
});

test("not-found-and-service-failure", async ({ page }) => {
  await page.goto("/listings/missing");
  await expect(page.getByRole("alert")).toContainText("404");
  await page.goto("/listings?q=__error");
  await expect(page.getByRole("alert")).toContainText("503");
});

test("keyboard-primary-path", async ({ page }) => {
  await page.goto("/listings");
  await page.getByLabel("搜索标题").focus();
  await page.keyboard.type("台灯");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByText("九成新台灯")).toBeVisible();
  await expect(page.getByLabel("搜索标题")).toBeFocused();
});

test("pagination-normalizes-an-out-of-range-page", async ({ page }) => {
  await page.goto("/listings?page=999");
  await expect(page).toHaveURL(/page=1/);
  await expect(page.getByRole("navigation", { name: "分页" }))
    .toContainText("第 1 / 1 页");
});

test("reservation-conflict-across-tabs", async ({ browser }) => {
  const context = await browser.newContext();
  const first = await context.newPage();
  const second = await context.newPage();
  for (const page of [first, second]) {
    await page.goto("/login");
    await page.getByRole("button", { name: "以演示居民登录" }).click();
    await expect(page).toHaveURL(/\/listings$/);
    await page.goto("/listings/lamp-1");
  }
  await Promise.all([
    first.getByRole("button", { name: "预约" }).click(),
    second.getByRole("button", { name: "预约" }).click(),
  ]);
  await expect.poll(async () => {
    const combined = [
      ...(await first.locator('[role="status"],[role="alert"]').allTextContents()),
      ...(await second.locator('[role="status"],[role="alert"]').allTextContents()),
    ].join(" ");
    return /预约成功/.test(combined) &&
      /409 RESERVATION_CONFLICT/.test(combined) &&
      /请求 [0-9a-f-]{36}/.test(combined);
  }).toBe(true);
});
```

### 7.7 SSR 实验

**完整文件：`neighborhood-market/apps/react-web/ssr-lab/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } },
});
```

**完整文件：`neighborhood-market/apps/react-web/ssr-lab/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>邻里集市 SSR</title>
  </head>
  <body>
    <div id="root"><!--app-html--></div>
    <script id="initial-data" type="application/json"><!--app-data--></script>
    <script type="module" src="/src/entry-client.tsx"></script>
  </body>
</html>
```

**完整文件：`neighborhood-market/apps/react-web/ssr-lab/src/types.ts`**

```ts
import type { Listing } from "../../src/domain";

export type InitialData = Readonly<{
  q: string;
  items: readonly Listing[];
  error: string;
}>;
```

**完整文件：`neighborhood-market/apps/react-web/ssr-lab/src/App.tsx`**

```tsx
import { useState } from "react";
import { money } from "../../src/domain";
import type { InitialData } from "./types";

export default function App({ initial }: { initial: InitialData }) {
  const [count, setCount] = useState(0);
  return (
    <main>
      <h1>邻里集市 SSR</h1>
      <form action="/" method="get">
        <label>
          搜索标题
          <input name="q" defaultValue={initial.q} />
        </label>
        <button type="submit">筛选</button>
      </form>
      {initial.error ? (
        <section role="alert">
          <p>{initial.error}</p>
          <a href="/">重新加载列表</a>
        </section>
      ) : initial.items.length === 0 ? (
        <p>没有匹配商品。</p>
      ) : (
        initial.items.map((item) => (
          <article key={item.id}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
            <p>{money(item.priceCents)}</p>
          </article>
        ))
      )}
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        水合检查：{count}
      </button>
    </main>
  );
}
```

**完整文件：`neighborhood-market/apps/react-web/ssr-lab/src/entry-server.tsx`**

```tsx
import { renderToString } from "react-dom/server";
import { seed } from "../../src/domain";
import App from "./App";
import type { InitialData } from "./types";

export function render(requestUrl: string) {
  const q = new URL(requestUrl, "http://localhost").searchParams.get("q") ?? "";
  const xssFixture = {
    ...seed[0],
    id: "xss-1",
    title: "</script><script>globalThis.pwned=true</script>",
  };
  const initial: InitialData = {
    q,
    items: q === "__error"
      ? []
      : q === "xss"
        ? [xssFixture]
        : seed.filter((item) => item.title.includes(q)),
    error: q === "__error" ? "演示数据源不可用。" : "",
  };
  return {
    html: renderToString(<App initial={initial} />),
    initial,
    status: initial.error ? 503 : 200,
  };
}
```

**完整文件：`neighborhood-market/apps/react-web/ssr-lab/src/entry-client.tsx`**

```tsx
import { hydrateRoot } from "react-dom/client";
import App from "./App";
import type { InitialData } from "./types";

const root = document.getElementById("root");
const data = document.getElementById("initial-data");
if (!root || !data?.textContent) throw new Error("缺少 SSR 快照");
const initial = JSON.parse(data.textContent) as InitialData;

hydrateRoot(root, <App initial={initial} />, {
  onRecoverableError(error) {
    console.error("hydration-recovery", error);
  },
});
```

**完整文件：`neighborhood-market/apps/react-web/ssr-lab/server.mjs`**

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";

const root = fileURLToPath(new URL(".", import.meta.url));
const vite = await createViteServer({
  root,
  configFile: fileURLToPath(new URL("./vite.config.ts", import.meta.url)),
  server: {
    middlewareMode: true,
    ws: { port: Number(process.env.HMR_PORT ?? 24678) },
  },
  appType: "custom",
});

function serialize(value) {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

const server = createServer((req, res) => {
  vite.middlewares(req, res, async () => {
    try {
      const url = req.url ?? "/";
      const pathname = new URL(url, "http://localhost").pathname;
      if (pathname !== "/") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("页面不存在");
        return;
      }
      let template = await readFile(new URL("./index.html", import.meta.url), "utf8");
      template = await vite.transformIndexHtml(url, template);
      const module = await vite.ssrLoadModule("/src/entry-server.tsx");
      const result = await module.render(url);
      const output = template
        .replace("<!--app-html-->", () => result.html)
        .replace("<!--app-data-->", () => serialize(result.initial));
      res.writeHead(result.status, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(output);
    } catch (error) {
      if (error instanceof Error) vite.ssrFixStacktrace(error);
      console.error(error);
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("渲染失败，请稍后重试");
    }
  });
});

const port = Number(process.env.PORT ?? 4173);
server.listen(port, "127.0.0.1", () => {
  console.log(`SSR lab: http://127.0.0.1:${port}`);
});
```

### 7.8 重建与命令

把以上完整文件按路径提取到新的临时根。确认每个路径只出现一次、每个本地 import 有目标，
然后在 `neighborhood-market/apps/react-web` 执行：

```bash
node --version
pnpm --version
pnpm install
pnpm list --depth 0
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm e2e
pnpm ssr
```

SSR 另开终端：

```bash
curl -iG --data-urlencode 'q=台灯' 'http://127.0.0.1:4173/'
curl -iG --data-urlencode 'q=__error' 'http://127.0.0.1:4173/'
curl -iG --data-urlencode 'q=不存在' 'http://127.0.0.1:4173/'
curl -i 'http://127.0.0.1:4173/missing'
```

预期依次为 200+台灯、503+恢复、200+空提示、404。浏览器禁用 JavaScript 后 GET 搜索仍工作；
重新启用后点击计数 0→1，Console 无 `hydration-recovery`。

## 8. 常见错误与排查路径

**明确错误示例：**

```ts
export const sharedStore = createFavoriteStore();
```

若它位于 SSR 模块顶层，多个请求共享用户状态。

| 项目 | 记录 |
| --- | --- |
| 现象 | 第二个请求偶尔看到第一个请求的私有收藏，或水合后立即跳变 |
| 证据 | store 在模块顶层；两请求 `Object.is(storeA, storeB)` 为 true |
| 原因 | Node 模块缓存跨请求，私有状态未按请求创建 |
| 修复 | request handler 调用工厂；只序列化当前公开页面所需数据 |
| 复验 | 并行请求状态隔离；initial JSON 无私有字段；水合无 mismatch |

另一错误是看到 E2E 绿色就声称预约事务安全。开发 API 只在单进程中顺序修改内存，真实保证
仍需 PostgreSQL 约束和并发接口测试。

## 9. 课后题

1. streaming shell 发出后为什么不能可靠改 HTTP status？
2. RSC 与 SSR 的输出有何不同？
3. `'use server'` 是否自动完成鉴权？
4. 为什么本课只保留一个完整最终快照？

答案：

1. 响应头通常已发送，只能在内容边界恢复并记录错误。
2. SSR 输出 HTML；RSC 输出组件树协议并影响客户端模块图。
3. 否，参数来自不可信客户端，仍需全部安全检查。
4. 避免多个“最终版本”漂移，让重建和验证有唯一来源。

## 10. 实践练习

**基础**：重建快照并运行 type/test/build。验收：记录实际版本、退出码和测试数。

**进阶**：为 SSR fixture 加标题 `</script><script>bad()</script>`。验收：raw HTML 中数据
使用 `\u003c`，DOM 不产生第二个 script。

**故障注入**：把 Listing status 改为 `"draft"`，typecheck 必须失败；恢复后通过。再在 App
首帧加入 `Math.random()`，水合检查必须报错；改为 initial 快照后消失。

## 11. 阶段验收

共享矩阵必须逐项记录，不得把“教程中有代码”当执行通过：

| 场景名 | 自动/人工入口 | 合格输出 |
| --- | --- | --- |
| `price-and-draft-contract` | Vitest | 金额边界与整数分 DTO |
| `failed-publish-keeps-draft` | 组件测试 | 错误后输入保留 |
| `favorite-target-is-idempotent` | reducer/E2E | 不重复计数，DELETE 到目标态 |
| `late-session-result-is-ignored` | 可控 Promise | logout 后旧结果丢弃 |
| `search-empty-and-recovery` | E2E | empty 与 503 分开 |
| `login-publish-favorite-logout` | E2E | 会话主路径与清理 |
| `reservation-conflict-across-tabs` | 两 page | 一个成功、一个 409 |
| `not-found-and-service-failure` | E2E/curl | 404 与 503 可恢复 |
| `keyboard-primary-path` | Chromium/人工 | role/name、焦点、状态 |
| `ssr-html-and-hydration` | curl/Chromium | raw HTML、无 JS、0→1 |

- [ ] 完整文件路径无重复，本课是唯一最终快照。
- [ ] lint/type/test/build 使用新临时项目并记录真实结果。
- [ ] 负类型注入先失败、恢复后通过。
- [ ] SSR 200/503/404、空 200 与安全 JSON 正确。
- [ ] raw HTML 有商品，无 JavaScript GET 搜索可用。
- [ ] 水合 0→1 且无 recoverable error。
- [ ] 初始 JSON 无 cookie、CSRF、密码、私有用户和密钥。
- [ ] 教学 API 的内存、单进程和安全限制明确。

## 12. 常见问题

**为什么快照没有生产流式 server？**

本卷用可审计的字符串 SSR 固定水合基础；生产流式、静态资源和部署需要工程/全栈方案。

**可以直接把教学 API 部署吗？**

不可以。它无数据库、密码、事务、真实 CSRF、速率限制和多实例一致性。

**Next 是否是学习 RSC 的唯一选择？**

不是，但需要真正支持 RSC 的框架/构建系统。Next App Router 是可选综合路径，不替代原理。

**完整快照是否证明中级能力？**

不证明。还需独立实现、真实后端、部署、他人复核和故障恢复证据。

## 13. 扩展阅读

资料快照：2026-10-11。

- [React：renderToPipeableStream](https://react.dev/reference/react-dom/server/renderToPipeableStream)
- [React：Server Components](https://react.dev/reference/rsc/server-components)
- [React：Server Functions](https://react.dev/reference/rsc/server-functions)
- [React：cache](https://react.dev/reference/react/cache)
- [Vite：SSR Guide](https://vite.dev/guide/ssr)
- [React Router：Data Mode](https://reactrouter.com/start/data/installation)
- [Next.js：App Router](https://nextjs.org/docs/app)

兼容边界：快照版本固定于资料日期，安装解析结果仍需保存锁文件。生产双构建、Node 集群、
CDN、真实数据库、TLS、部署、负载、Safari/Firefox、VoiceOver/NVDA/JAWS 未在本课自动通过。

## 我现在能做到什么

我能解释 streaming、RSC 与 Server Function 的边界，从唯一快照重建 React SPA/SSR，并用
类型、测试、HTTP、无 JavaScript 和水合证据判断实际完成范围。

## 单元导航

- 上一单元：[Vite SSR、序列化与请求隔离](./02-vite-ssr-serialization-isolation.md)
- 返回：[第 08 章目录](../README.md#第八章ssr-与综合项目)
- 后续：[React 覆盖矩阵](../REACT-COVERAGE.md)
