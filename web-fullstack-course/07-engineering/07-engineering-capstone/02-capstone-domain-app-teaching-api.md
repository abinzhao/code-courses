# 领域、页面与本机教学 API：让未知数据安全进入可恢复界面

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 完成 contracts parser、整数分、tokens、应用清单、HTML、Vite 教学 API、搜索控制器和 DOM 入口 |
| 前置 | 第 01 课的 27 文件 expected tree、根脚本和 owner 契约 |
| 建议投入 | 3.5 小时实现与阅读，45 分钟数据/竞态故障实验 |
| 完整文件 owner | 本课独占 10 个路径；不重复第 01、03 课完整文件 |
| API 路径 | 查询键 `valid`、`free`、`delayed`、`empty`、`500`、`string-price` |
| UI 状态 | loading、success、empty、error；error 后发起 valid 查询完成 recovery |
| 竞态边界 | 新查询 abort 旧 signal；generation guard 阻止忽略取消的旧结果发布 |
| 环境标签 | **本机、只读、Vite 服务插件、内存教学数据、非真实后端、非生产** |

每个完整文件都按第 01 课 expected tree 使用唯一 header 和 marker。第 03 课只从公共路径导入本课
实现，不再给出这些文件的完整副本。

## 1. 任务背景

静态类型通过不代表 HTTP JSON 合法。服务可以返回 `"1990"`、不可能的日期、重复 ID 或分页
矛盾；类型断言会让这些值绕过检查。即使 parser 正确，页面还可能把 500 显示成“没有商品”，
让旧请求覆盖新查询，或在错误后失去恢复能力。

本课把数据流写成一条可观察链：

```text
浏览器表单
  -> URLSearchParams + GET + same-origin credentials + AbortSignal
  -> Vite 本机只读教学 API
  -> Response status
  -> response.json(): unknown
  -> parseListingPage
  -> SearchState
  -> textContent DOM
```

教学 API 只为本机开发与 production preview 提供固定数据。它不进入静态 `dist`，不读取
Cookie，不建立会话，不执行对象授权、CSRF、写事务或数据库约束。

## 2. 学习目标

完成本课后，你能够：

1. 用运行时 parser 把 `unknown` 转换为完整 `ListingPage`；
2. 拒绝负数、小数、不安全整数、字符串价格、非法 UTC、分页矛盾和重复 ID；
3. 用整数商和余数格式化 `1990` 与 `0`；
4. 通过包 `exports` 暴露 contracts 和 tokens，不深导入 `src/`；
5. 用 Vite `configureServer`/`configurePreviewServer` 安装同一只读教学 API；
6. 明确覆盖 valid、delayed、empty、500 与 string-price；
7. 用结构化查询、同源凭据、HTTP 状态和同一个 signal 建立读取边界；
8. 分别证明 abort 的资源协作职责和 generation 的发布权职责；
9. 把 loading、success、empty、error 和 recovery 映射为不同用户文案；
10. 使用 `textContent` 而不是把服务端字符串插入 HTML。

## 3. 预备知识

先确认第 01 课的 owner 表包含本课 10 个路径：

```text
packages/contracts/package.json
packages/contracts/src/index.ts
packages/ui/package.json
packages/ui/src/tokens.css
apps/lab-web/package.json
apps/lab-web/index.html
apps/lab-web/teaching-api.mjs
apps/lab-web/vite.config.mjs
apps/lab-web/src/search.ts
apps/lab-web/src/main.ts
```

回顾：

- [Package Exports 与运行时契约](../04-workspace-component-library/02-package-exports-contracts-publishing.md)；
- [Vitest HTTP 与请求竞态](../05-unit-integration-e2e/02-vitest-integration-http-races.md)；
- [Playwright 构建页 E2E](../05-unit-integration-e2e/03-playwright-built-page-e2e.md)。

此时不要安装。完整树还缺第 03 课的测试与预算文件，第 04 课会一次性机械提取。

## 4. 核心理论

### 4.1 `unknown` 是运行时信任边界

`response.json()` 能产生任意 JavaScript 值。正确类型流是：

```text
unknown -> record/array/value checks -> new Listing/Page objects
```

parser 必须创建新对象和数组，不能把输入 `as ListingPage` 原样返回。静态 `Listing` 适合受控
代码协作；parser 才能检查运行时形状和值域。两者都不负责身份或授权。

### 4.2 整数分和 UTC 需要值域检查

`number` 包含小数、`NaN`、Infinity 和不安全整数。金额条件是：

```text
typeof value === "number"
&& Number.isSafeInteger(value)
&& value >= 0
```

`createdAt` 先限制 `Z` 结尾形状，再解析、`toISOString()` 规范化并和补齐毫秒后的输入比较。
这样 `2026-02-30T08:00:00Z` 不会被日期进位悄悄接受。

### 4.3 HTTP 状态先于 JSON 业务解析

500 body 即使是合法 JSON，也不是列表成功。读取顺序必须是：

```text
await request -> if !response.ok throw -> await response.json as unknown
-> parseListingPage -> 核对请求分页
```

`credentials: "same-origin"` 允许同源 Cookie 策略；它不证明 Cookie 存在，也不替代服务端会话、
CSRF 和对象授权。

### 4.4 Abort 与 generation 解决不同问题

新查询调用 `abort()`，让支持取消的底层停止等待。读取器可能忽略 signal，或者旧操作已进入
不可取消阶段，因此还需单调 generation：

```text
查询 A generation=1 ─────────────晚完成──┐
查询 B generation=2 ───成功发布──────────┤
检查 current !== generation ─────────────┘ 丢弃 A
```

测试要分开证明旧 signal 已取消，以及忽略取消的旧 Promise 不能发布。

### 4.5 Empty 不是 Error，Recovery 不是新 phase

本课状态联合为 loading/success/empty/error。empty 是 HTTP 成功、parser 成功且没有项目；
error 是协议、JSON 或 parser 失败。recovery 是状态转换：error 后再次 loading，最终进入
success 或 empty。把 recovery 写成永久 phase 反而无法表达恢复后的真实终态。

### 4.6 Preview 插件不是生产 API

`configurePreviewServer` 让 Chromium 在 production build 页面上通过 HTTP 访问教学端点，
比浏览器 route mock 多验证一层网络和服务中间件，但仍缺少真实应用服务器、权限和数据库。
把 `dist` 上传到普通静态服务器后，这个 API 不会随文件出现。

## 5. 元素、属性、API 或配置清单

| 项目 | 本课用法 | 可观察证据 | 边界 |
| --- | --- | --- | --- |
| `exports` | contracts 根入口、UI tokens 子路径 | Vite/TS 从包名解析 | 不是保密或授权 |
| `Number.isSafeInteger` | 金额、版本、分页 | 小数/不安全整数被拒绝 | 还要检查最小值 |
| `Date.parse` + `toISOString` | UTC 日历验证与规范化 | 无毫秒输入补成 `.000Z` | 需先限制形状 |
| `URLSearchParams` | `page/pageSize/q` | 特殊字符不破坏查询 | 不验证服务端业务 |
| `Response.ok/status` | 500 在 body 解析前失败 | 错误不变成 empty | 不解析生产错误 DTO |
| `credentials` | `"same-origin"` | 请求配置可断言 | 不证明认证存在 |
| `AbortController` | 新查询取消旧 signal | 旧 signal `aborted` | 不撤销服务端写入 |
| generation | 单调整数 | 旧 Promise 无发布权 | 只属于当前控制器 |
| `dispose()` | 页面离开终止发布 | signal 取消、控制器不可复用 | 不清理服务端状态 |
| `configurePreviewServer` | preview 同源教学 API | 构建页走真实 HTTP | 不进入静态 dist |
| `strictPort` | dev `5173`、preview `4173` | 端口占用明确失败 | 不停止未知进程 |
| `textContent` | 渲染标题和金额 | 服务字符串不作 HTML | 仍需内容和 a11y 审查 |

## 6. 最小可运行案例

### 6.1 Contracts 包与完整 parser

**完整文件：`packages/contracts/package.json`**
<!-- CAPSTONE_FILE_BEGIN path="packages/contracts/package.json" owner="02" -->
```json
{
  "name": "@market/contracts",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```
<!-- CAPSTONE_FILE_END path="packages/contracts/package.json" -->

**完整文件：`packages/contracts/src/index.ts`**
<!-- CAPSTONE_FILE_BEGIN path="packages/contracts/src/index.ts" owner="02" -->
```ts
export type ListingStatus = "available" | "reserved" | "sold";

export type Listing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: ListingStatus;
  ownerId: string;
  version: number;
  createdAt: string;
};

export type ListingPage = {
  items: Listing[];
  page: number;
  pageSize: number;
  total: number;
};

function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path}: expected object`);
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "")) {
    throw new TypeError(`${path}: expected text`);
  }
  return value;
}

function safeInteger(value: unknown, path: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new TypeError(`${path}: expected safe integer >= ${minimum}`);
  }
  return value;
}

function utcTimestamp(value: unknown): string {
  const source = text(value, "createdAt");
  const shape = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
  if (!shape.test(source)) {
    throw new TypeError("createdAt: expected UTC ISO 8601");
  }

  const milliseconds = Date.parse(source);
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError("createdAt: invalid date");
  }

  const normalized = new Date(milliseconds).toISOString();
  const canonicalSource = source.includes(".") ? source : source.replace("Z", ".000Z");
  if (normalized !== canonicalSource) {
    throw new TypeError("createdAt: invalid calendar date");
  }
  return normalized;
}

export function formatCents(cents: number): string {
  const parsed = safeInteger(cents, "priceCents", 0);
  return `${Math.floor(parsed / 100)}.${String(parsed % 100).padStart(2, "0")}`;
}

export function parseListing(value: unknown): Listing {
  const source = record(value, "listing");
  const status = source.status;
  if (status !== "available" && status !== "reserved" && status !== "sold") {
    throw new TypeError("status: expected available, reserved or sold");
  }

  return {
    id: text(source.id, "id"),
    title: text(source.title, "title"),
    description: text(source.description, "description", true),
    priceCents: safeInteger(source.priceCents, "priceCents", 0),
    status,
    ownerId: text(source.ownerId, "ownerId"),
    version: safeInteger(source.version, "version", 1),
    createdAt: utcTimestamp(source.createdAt),
  };
}

export function parseListingPage(value: unknown): ListingPage {
  const source = record(value, "page");
  const page = safeInteger(source.page, "page", 1);
  const pageSize = safeInteger(source.pageSize, "pageSize", 1);
  const total = safeInteger(source.total, "total", 0);
  if (!Array.isArray(source.items)) {
    throw new TypeError("items: expected array");
  }

  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) {
    throw new TypeError("page: offset overflow");
  }
  const remaining = Math.max(0, total - offset);
  if (source.items.length > pageSize || source.items.length > remaining) {
    throw new TypeError("items: count contradicts pagination");
  }

  const items = source.items.map((item: unknown) => parseListing(item));
  if (new Set(items.map((item) => item.id)).size !== items.length) {
    throw new TypeError("items: duplicate listing id");
  }

  return { items, page, pageSize, total };
}
```
<!-- CAPSTONE_FILE_END path="packages/contracts/src/index.ts" -->

parser 返回新数组和新项目对象。`formatCents` 再次调用同一安全整数边界，避免展示层悄悄接受
非法领域值。

### 6.2 UI 包与语义 tokens

**完整文件：`packages/ui/package.json`**
<!-- CAPSTONE_FILE_BEGIN path="packages/ui/package.json" owner="02" -->
```json
{
  "name": "@market/ui",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    "./tokens.css": "./src/tokens.css"
  }
}
```
<!-- CAPSTONE_FILE_END path="packages/ui/package.json" -->

**完整文件：`packages/ui/src/tokens.css`**
<!-- CAPSTONE_FILE_BEGIN path="packages/ui/src/tokens.css" owner="02" -->
```css
:root {
  color-scheme: light;
  font-family: system-ui, sans-serif;
  color: #172126;
  background: #f4f7f6;
  --market-color-surface: #ffffff;
  --market-color-border: #9aabb1;
  --market-color-action: #075e54;
  --market-color-action-text: #ffffff;
  --market-color-error: #9f1d1d;
  --market-space: 1rem;
}

body {
  margin: 0;
}

main {
  max-width: 48rem;
  margin: 2rem auto;
  padding: var(--market-space);
}

form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

input,
button {
  padding: 0.5rem;
  font: inherit;
}

button {
  color: var(--market-color-action-text);
  background: var(--market-color-action);
  border: 2px solid transparent;
  border-radius: 0.375rem;
}

button:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
}

#status[data-phase="error"] {
  color: var(--market-color-error);
}

#listings {
  padding: 0;
  list-style: none;
}

#listings li {
  padding: var(--market-space);
  background: var(--market-color-surface);
  border-bottom: 1px solid var(--market-color-border);
}

@media (forced-colors: active) {
  button {
    color: ButtonText;
    background: ButtonFace;
    border-color: ButtonText;
  }

  button:focus-visible {
    outline-color: Highlight;
  }
}
```
<!-- CAPSTONE_FILE_END path="packages/ui/src/tokens.css" -->

tokens 提供基本可读界面，不构成完整设计系统验收。真实 forced colors、屏幕阅读器和跨浏览器仍是
人工缺口。

## 7. 邻里集市集成案例

### 7.1 应用清单与 HTML 入口

**完整文件：`apps/lab-web/package.json`**
<!-- CAPSTONE_FILE_BEGIN path="apps/lab-web/package.json" owner="02" -->
```json
{
  "name": "@market/lab-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1 --port 4173 --strictPort"
  },
  "dependencies": {
    "@market/contracts": "workspace:*",
    "@market/ui": "workspace:*"
  }
}
```
<!-- CAPSTONE_FILE_END path="apps/lab-web/package.json" -->

**完整文件：`apps/lab-web/index.html`**
<!-- CAPSTONE_FILE_BEGIN path="apps/lab-web/index.html" owner="02" -->
```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>邻里集市工程结业</title>
  </head>
  <body>
    <main>
      <h1>邻里集市</h1>
      <p>本机只读教学数据，不接入真实用户。</p>
      <form id="search">
        <label for="query">搜索商品</label>
        <input id="query" name="q" value="valid" autocomplete="off" />
        <button type="submit">搜索</button>
      </form>
      <p id="status" role="status" aria-live="polite">准备搜索。</p>
      <ul id="listings" aria-label="商品结果"></ul>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```
<!-- CAPSTONE_FILE_END path="apps/lab-web/index.html" -->

### 7.2 本机只读五路径教学 API

**完整文件：`apps/lab-web/teaching-api.mjs`**
<!-- CAPSTONE_FILE_BEGIN path="apps/lab-web/teaching-api.mjs" owner="02" -->
```js
const lamp = {
  id: "listing-1",
  title: "台灯",
  description: "本机教学数据，自提",
  priceCents: 1990,
  status: "available",
  ownerId: "user-1",
  version: 1,
  createdAt: "2026-10-11T08:00:00.000Z",
};

const shelf = {
  id: "listing-2",
  title: "书架",
  description: "本机教学数据，免费自提",
  priceCents: 0,
  status: "available",
  ownerId: "user-2",
  version: 1,
  createdAt: "2026-10-11T08:30:00.000Z",
};

function listingPage(items) {
  return { items, page: 1, pageSize: 20, total: items.length };
}

function send(response, status, body) {
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

export function teachingApi() {
  let delayedResponse;

  function install(server) {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (!url.pathname.startsWith("/api/")) {
        next();
        return;
      }

      const sendError = (status, code) => {
        send(response, status, {
          code,
          message: "Local teaching API error",
          requestId: `teaching-${status}`,
        });
      };

      if (url.pathname !== "/api/v1/listings") {
        sendError(404, "NOT_FOUND");
        return;
      }
      if (request.method !== "GET") {
        sendError(405, "READ_ONLY_TEACHING_API");
        return;
      }

      const page = Number(url.searchParams.get("page"));
      const pageSize = Number(url.searchParams.get("pageSize"));
      if (page !== 1 || pageSize !== 20) {
        sendError(400, "INVALID_PAGE");
        return;
      }

      const q = url.searchParams.get("q") ?? "";
      if (q === "500") {
        sendError(500, "TEACHING_FAILURE");
        return;
      }
      if (q === "string-price") {
        send(response, 200, listingPage([{ ...lamp, priceCents: "1990" }]));
        return;
      }
      if (q === "empty") {
        send(response, 200, listingPage([]));
        return;
      }
      if (q === "delayed") {
        delayedResponse = response;
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        });
        response.flushHeaders();
        response.once("close", () => {
          if (delayedResponse === response) {
            delayedResponse = undefined;
          }
        });
        return;
      }
      if (q === "free") {
        const previous = delayedResponse;
        delayedResponse = undefined;
        if (previous) {
          response.once("finish", () => {
            setImmediate(() => {
              if (!previous.destroyed && !previous.writableEnded) {
                previous.end(JSON.stringify(listingPage([{ ...lamp, title: "旧台灯" }])));
              }
            });
          });
        }
        send(response, 200, listingPage([shelf]));
        return;
      }
      if (q === "valid") {
        send(response, 200, listingPage([lamp]));
        return;
      }

      send(response, 200, listingPage([]));
    });
  }

  return {
    name: "market-local-read-only-teaching-api",
    configureServer: install,
    configurePreviewServer: install,
  };
}
```
<!-- CAPSTONE_FILE_END path="apps/lab-web/teaching-api.mjs" -->

`delayed` 先发送响应头但不结束 body；`free` 完成后才尝试结束旧 body。正常客户端会 abort 旧
请求，故旧 response 往往已关闭；第 03 课另用忽略取消的 deferred reader 独立证明 generation。

### 7.3 Vite 配置

**完整文件：`apps/lab-web/vite.config.mjs`**
<!-- CAPSTONE_FILE_BEGIN path="apps/lab-web/vite.config.mjs" owner="02" -->
```js
import { defineConfig } from "vite";
import { teachingApi } from "./teaching-api.mjs";

export default defineConfig({
  plugins: [teachingApi()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    sourcemap: false,
    chunkSizeWarningLimit: 200,
  },
});
```
<!-- CAPSTONE_FILE_END path="apps/lab-web/vite.config.mjs" -->

### 7.4 HTTP reader 与搜索控制器

**完整文件：`apps/lab-web/src/search.ts`**
<!-- CAPSTONE_FILE_BEGIN path="apps/lab-web/src/search.ts" owner="02" -->
```ts
import { parseListingPage } from "@market/contracts";
import type { ListingPage } from "@market/contracts";

export type SearchState =
  | { phase: "loading"; q: string }
  | { phase: "success"; q: string; page: ListingPage }
  | { phase: "empty"; q: string }
  | { phase: "error"; q: string; message: string };

export type Request = (url: string, init: RequestInit) => Promise<Response>;
export type ReadPage = (q: string, signal: AbortSignal) => Promise<ListingPage>;

export function createReadListingPage(request: Request = fetch): ReadPage {
  return async (q, signal) => {
    const query = new URLSearchParams({
      page: "1",
      pageSize: "20",
      q,
    });
    const response = await request(`/api/v1/listings?${query.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    });

    if (!response.ok) {
      throw new Error(`listings HTTP ${response.status}`);
    }

    const raw: unknown = await response.json();
    const page = parseListingPage(raw);
    if (page.page !== 1 || page.pageSize !== 20) {
      throw new Error("response pagination differs from request");
    }
    return page;
  };
}

export function createSearchController(readPage: ReadPage, publish: (state: SearchState) => void) {
  let active: AbortController | undefined;
  let generation = 0;
  let disposed = false;

  return {
    async search(q: string): Promise<void> {
      if (disposed) {
        throw new Error("search controller disposed");
      }

      const current = ++generation;
      active?.abort();
      const controller = new AbortController();
      active = controller;
      publish({ phase: "loading", q });

      try {
        const page = await readPage(q, controller.signal);
        if (disposed || current !== generation || controller.signal.aborted) {
          return;
        }
        if (page.items.length === 0) {
          publish({ phase: "empty", q });
        } else {
          publish({ phase: "success", q, page });
        }
      } catch (error) {
        if (disposed || current !== generation || controller.signal.aborted) {
          return;
        }
        publish({
          phase: "error",
          q,
          message: error instanceof Error ? error.message : "Request failed",
        });
      } finally {
        if (active === controller) {
          active = undefined;
        }
      }
    },

    dispose(): void {
      disposed = true;
      generation += 1;
      active?.abort();
      active = undefined;
    },
  };
}
```
<!-- CAPSTONE_FILE_END path="apps/lab-web/src/search.ts" -->

### 7.5 DOM 入口与显式状态

**完整文件：`apps/lab-web/src/main.ts`**
<!-- CAPSTONE_FILE_BEGIN path="apps/lab-web/src/main.ts" owner="02" -->
```ts
import { formatCents } from "@market/contracts";
import "@market/ui/tokens.css";
import { createReadListingPage, createSearchController } from "./search";

const form = document.querySelector<HTMLFormElement>("#search");
const query = document.querySelector<HTMLInputElement>("#query");
const status = document.querySelector<HTMLParagraphElement>("#status");
const list = document.querySelector<HTMLUListElement>("#listings");
if (!form || !query || !status || !list) {
  throw new Error("missing search page elements");
}

const search = createSearchController(createReadListingPage(), (state) => {
  list.replaceChildren();
  status.dataset.phase = state.phase;
  status.setAttribute("aria-busy", String(state.phase === "loading"));

  if (state.phase === "loading") {
    status.textContent = `加载中：${state.q}`;
    return;
  }
  if (state.phase === "error") {
    status.textContent = `加载失败：${state.message}；可以重新搜索。`;
    return;
  }
  if (state.phase === "empty") {
    status.textContent = "没有找到商品，可以调整搜索。";
    return;
  }

  status.textContent = `共 ${state.page.total} 件`;
  const fragment = document.createDocumentFragment();
  for (const item of state.page.items) {
    const row = document.createElement("li");
    row.textContent = `${item.title}：${formatCents(item.priceCents)} 元`;
    fragment.append(row);
  }
  list.append(fragment);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void search.search(query.value.trim());
});

window.addEventListener("pagehide", () => search.dispose(), { once: true });
void search.search(query.value);
```
<!-- CAPSTONE_FILE_END path="apps/lab-web/src/main.ts" -->

页面初始查询 `valid`，显示台灯；用户输入特殊教学键可观察各状态。失败后表单没有被锁死，再查
`valid` 就进入 loading 并恢复 success。

## 8. 常见错误与排查路径

### 明确错误：把 500 转成空成功

错误变更块，不是完整文件：

```ts
if (!response.ok) {
  return { items: [], page: 1, pageSize: 20, total: 0 };
}
```

| 五段 | 记录 |
| --- | --- |
| 现象 | 查询 `500` 后页面显示空态，用户不知道服务失败 |
| 证据 | Network 为 HTTP 500，但 DOM 文案是“没有找到商品” |
| 原因 | HTTP 协议失败被伪装成合法业务空结果 |
| 修复 | 恢复 `throw new Error(\`listings HTTP ${response.status}\`)` |
| 复验 | `500` 进入 error；`empty` 独立进入 empty；随后 `valid` 恢复 success |

### 竞态错误：只 abort，不检查 generation

错误变更块：

```ts
const page = await readPage(q, controller.signal);
publish({ phase: "success", q, page });
```

若注入 reader 忽略 signal，旧 Promise 晚完成后仍会发布。修复是恢复 disposed、generation 和
signal 三项终态检查，不是延长等待或让 API 更快。

### 排查表

| 现象 | 先看证据 | 常见原因 | 不接受的处理 |
| --- | --- | --- | --- |
| 字符串价格显示出来 | 原始 JSON、parser 调用链 | 使用断言绕过 `unknown` | `Number("1990")` 静默转换 |
| 不可能日期被接受 | 原文与 `toISOString()` | 只用 `Date.parse` | 删除日期测试 |
| 500 显示空态 | status 与页面 phase | 吞异常 | 把错误文案改为空文案 |
| 旧结果覆盖新结果 | signal、generation、发布序列 | 只依赖取消 | 增加任意 sleep |
| 页面输出 HTML | DOM 属性与服务文本 | 使用 `innerHTML` | 依赖“教学数据可信” |
| preview API 404 | Vite 配置与服务身份 | 静态服务器没有插件 | 把 mock 冒充生产后端 |

## 9. 课后题

**问题 1：为什么 `formatCents` 仍检查安全整数，parser 不是已经检查了吗？**

参考答案：格式函数是独立公共入口，也可能被受控代码直接调用；它应维护自己的输入契约。

**问题 2：为什么 empty 使用独立 phase？**

参考答案：空成功和错误的恢复建议不同。独立状态能让文案、监控和测试明确区分。

**问题 3：abort 成功后 generation 是否多余？**

参考答案：不多余。读取器可能忽略取消，或操作已完成；generation 独立限制发布权。

**问题 4：Vite preview 中间件经过 HTTP，为什么仍不是真实后端？**

参考答案：它没有真实应用服务、认证、授权、数据库、事务和生产部署，只是本机进程中的教学插件。

## 10. 实践练习

### 基础：增加保留字符查询

使用 HTTP 测试输入 `台灯 & 书`，让 request stub 解析 URL 后断言 `q` 仍为原文。

判定标准：原始 URL 含编码，`searchParams.get("q")` 等于原字符串；不手工拼 query。

### 进阶：增加第二页参数

扩展 reader 接收 page/pageSize，并核对响应一致。

判定标准：参数发送前是安全整数；响应页码不一致时失败；快速翻页仍同时使用 abort 和
generation；不要对第一页数组 `slice` 冒充服务器分页。

### 故障注入：移除 parser

临时把 `const page = parseListingPage(raw)` 改为类型断言。

判定标准：`string-price` 场景先错误通过或在更晚位置失败；恢复 parser 后字段级错误可见，
`valid/free` 继续正确；不得把字符串转数字来接受非法协议。

## 11. 阶段验收

- [ ] 本课 10 个路径与第 01 课 expected tree 完全一致。
- [ ] 每个完整文件 header、BEGIN、END 和 owner 均唯一。
- [ ] `valid` 显示 `19.90`，`free` 显示 `0.00`。
- [ ] `delayed` 提供受控旧响应，测试不依赖任意毫秒等待。
- [ ] `empty`、`500`、`string-price` 进入不同预期。
- [ ] parser 检查金额、UTC、分页和重复 ID，并返回新容器。
- [ ] reader 检查 HTTP status、结构化 query、same-origin credentials 和同一个 signal。
- [ ] controller 同时使用 abort、generation 和 dispose。
- [ ] DOM 明确渲染 loading、success、empty、error，并可 recovery。
- [ ] 教学 API 只读、内存、本机、非生产边界在页面和说明中可见。

## 12. 常见问题

**为什么状态里不保存 AbortController？**

它是控制器内部资源，不是用户可观察产品状态。暴露后会耦合 DOM 与并发实现。

**加载时为什么清空旧列表？**

这是本课明确的产品契约，避免旧内容看起来属于新查询。另一产品可以保留并标记 stale，但要
同步修改状态、文案和测试。

**为什么错误消息包含 parser 字段名？**

教学环境需要可定位证据；真实产品应把可信用户文案与内部诊断分开，并避免泄露敏感响应。

**能把 teaching API 部署到生产吗？**

不能按本课形态部署。真实服务需要独立架构、身份、授权、输入校验、日志、事务和运维证据。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [MDN `Number.isSafeInteger`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger)
- [MDN `Response`](https://developer.mozilla.org/docs/Web/API/Response)
- [MDN `URLSearchParams`](https://developer.mozilla.org/docs/Web/API/URLSearchParams)
- [MDN `Request.credentials`](https://developer.mozilla.org/docs/Web/API/Request/credentials)
- [MDN `AbortController`](https://developer.mozilla.org/docs/Web/API/AbortController)
- [Vite Plugin API](https://vite.dev/guide/api-plugin)
- [Node Package Exports](https://nodejs.org/api/packages.html#package-entry-points)

## 我现在能做到什么

我能让外部 JSON 从 `unknown` 经过 parser 进入领域对象，连接只读教学 HTTP、abort、generation
和 DOM 状态，并让正常、延迟、空、500、字符串价格与错误恢复都产生不同可观察结果，同时不把
本机插件冒充真实后端。

## 单元导航

[返回第 07 章入口](../07-engineering-capstone.md) ·
[上一课：结业项目契约与脚手架](01-capstone-contract-scaffold.md) ·
[下一课：测试、构建、预算与浏览器门禁](03-capstone-tests-build-budget-browser.md)
