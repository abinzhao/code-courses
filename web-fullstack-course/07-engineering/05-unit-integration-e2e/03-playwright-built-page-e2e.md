# Playwright 1.64：验收生产构建页面

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | strict-port production preview、只读教学 API、页面入口、8 条 Chromium E2E |
| 练习目录 | 沿用 `market-engineering-lab/` |
| 固定版本 | Vite 8.3.4、Playwright 1.64.0、匹配版本 Chromium |
| 核心命令 | `pnpm test:e2e` |
| 成功证据 | 1 条构建页烟测 + 7 条产品场景通过，preview 自动启动并停止 |
| 失败证据 | 占用 4173 时启动失败；删除行为后对应自动断言超时并保留 trace |
| 环境标签 | **本机 production preview、本机只读教学 API、非生产、非真实后端** |

七个产品场景是：合法 `19.90`、免费 `0.00`、HTTP 500、字符串价格拒绝、空成功、
旧结果防护、失败后恢复。测试不调用 `page.route()`；浏览器通过 HTTP 访问 Vite preview
插件提供的明确教学端点，但这仍不是 Nest 服务、数据库或生产环境。

## 1. 任务背景

Vitest 已证明领域和连接逻辑，但用户不会直接调用 `parseListingPage()`。用户加载构建后的
HTML，使用标签找到输入框，点击搜索，并观察列表、空态或错误状态。开发服务器能运行也不
表示生产资源路径正确；调用函数成功也不表示 DOM 文案和可访问名称正确。

E2E 的价值来自跨边界观察，但范围越大，定位成本越高。本课只保留七个必须由浏览器确认的
用户场景，不把每个金额非法值都重复一遍。页面访问的是 Vite `build` 产物，再由
`vite preview` 托管；preview 端口不允许自动漂移，避免测试在一个 URL 等待，服务却悄悄
跑到另一个端口。

请求竞态也必须可重复。测试不会 `waitForTimeout(500)` 猜旧请求是否到达。教学 API 对
“旧请求”先发送响应头、暂不结束 body；Playwright 等到该响应事件后再发新查询，从而建立
明确的先后关系。

## 2. 学习目标

完成本课后，你能够：

1. 安装与 Playwright 1.64.0 匹配的 Chromium；
2. 让 Playwright 启动严格端口的 Vite production preview；
3. 使用 role/name locator 和自动重试断言操作真实构建页面；
4. 区分 HTTP 500、解析失败、空成功和恢复状态；
5. 在没有任意 sleep 的情况下复现旧请求晚完成；
6. 配置失败时保留 trace，并说明其中的隐私与证据限制；
7. 明确本机教学 API、浏览器路由 mock 和真实后端的差异。

## 3. 预备知识

先完成：

- [领域边界单元测试](01-vitest-unit-domain-boundaries.md)；
- [HTTP 与竞态集成测试](02-vitest-integration-http-races.md)；
- [Vite 构建、资源与 preview](../03-build-assets-performance.md)。

保留前两课创建的 `src/domain/`、`src/http/` 和 `src/state/`。在练习根目录执行：

```bash
pnpm add -D -E @playwright/test@1.64.0
pnpm exec playwright --version
pnpm exec playwright install chromium
mkdir -p tests/e2e
```

预期版本输出为 `Version 1.64.0`。`playwright install chromium` 下载匹配测试二进制，
不升级用户日常浏览器。Linux CI 可能需要官方的
`pnpm exec playwright install --with-deps chromium`；macOS 本课不执行 Linux 系统依赖
安装命令。

把练习工程 `package.json` 的 `scripts` 对象合并以下增量，保留已有 `test`、`quality` 和
类型检查脚本：

```json
{
  "build": "pnpm quality && vite build",
  "preview": "vite preview --host 127.0.0.1 --port 4173 --strictPort",
  "test:e2e": "pnpm build && playwright test"
}
```

`test:e2e` 先构建，再由 Playwright 启动 preview。不要把 `vite dev` 改名为 preview；
开发模块图不是本课要验收的生产产物。

## 4. 核心理论

### 4.1 E2E 选择用户可观察边界

浏览器场景应该描述用户行为和结果：

```text
通过“搜索商品”输入框输入“台灯”
点击名称为“搜索”的按钮
看到“台灯：19.90 元”
```

它不需要断言内部调用了几次 `formatCents`。内部结构可重构，只要用户契约不变；若可见行为
被删除，断言必须失败。

### 4.2 Production preview 的证据与限制

`vite build` 生成优化后的 HTML、JavaScript 和 CSS，`vite preview` 在本机托管这些文件。
这能发现开发模式未暴露的 base、资源路径和构建后运行错误，但 preview 不是生产服务器：

- 没有生产 TLS、CDN、反向代理和缓存头治理；
- 没有真实身份、授权或数据库；
- 本课 API 来自本机 Vite 插件，静态 `dist/` 单独部署后不会自动拥有它；
- 通过 preview 不能声称生产发布或回滚成功。

### 4.3 `strictPort` 是可诊断性配置

没有 strict port 时，4173 被占用后 Vite 可能选择 4174，而 Playwright 的 `baseURL` 仍指向
4173。测试会出现难以解释的旧服务或连接错误。严格端口让启动立刻非零失败，错误归属清楚。

`reuseExistingServer: false` 同样防止测试复用来源未知的旧进程。验收应由当前源码启动当前
构建产物。

### 4.4 Role/name locator 同时检查交互语义

`getByRole("textbox", { name: "搜索商品" })` 依赖 `<label>` 与输入框的可访问名称；
`getByRole("button", { name: "搜索" })` 对应用户理解的控制。相比 `.search > input`，
角色定位更接近使用方式，也会在标签丢失时暴露问题。

这不等于完成屏幕阅读器人工验收。焦点顺序、朗读细节、不同辅助技术仍需专门验证。

### 4.5 自动等待不是固定等待

Playwright 的 `toBeVisible()`、`toHaveText()` 会在超时上限内重试条件。成功时立即继续，
失败时给出预期、实际和定位器信息。`waitForTimeout(500)` 无论页面是否完成都等待固定时长，
快机器浪费时间，慢机器仍可能失败。

竞态场景需要事件边界时，使用 `page.waitForResponse()` 等待特定响应头，而不是猜测服务器
多少毫秒后收到请求。

### 4.6 七个场景为什么属于浏览器层

| 场景 | 浏览器层新增证据 |
| --- | --- |
| `19.90` | 领域结果真正进入构建页可见文本 |
| `0.00` | 页面没有把零误判为空值 |
| HTTP 500 | 错误状态不伪装成“共 0 件” |
| 字符串价格 | parser 错误能到达可恢复 UI |
| 空成功 | 合法空态与失败状态区分 |
| 旧结果防护 | 用户快速改变目标后页面保留最新结果 |
| 恢复 | 错误不会让表单永久失效 |

纯函数的所有输入组合仍由 Vitest 负责；E2E 只保留跨 DOM、网络边界和构建产物的代表路径。

### 4.7 Trace 是失败证据，也可能是敏感数据

`trace: "retain-on-failure"` 只为失败测试保留现场，避免每次运行都积累报告。trace 可能包含
DOM、请求 URL、响应和截图。真实项目要设置最小保留期、访问控制和脱敏策略，不把含会话或
个人信息的 trace 上传到公开附件。本课只使用明确教学数据。

## 5. 元素、属性、API 或配置清单

| API / 配置 | 本课值 | 作用 | 边界 |
| --- | --- | --- | --- |
| `@playwright/test` | `1.64.0` | 浏览器测试运行器 | 浏览器需另行安装 |
| `playwright install chromium` | 匹配当前包 | 固定测试浏览器 | 不代表 Firefox/WebKit |
| `baseURL` | `http://127.0.0.1:4173` | 统一页面入口 | 仅本机 |
| `webServer.command` | `pnpm preview` | 自动启动生产预览 | build 已由脚本先执行 |
| `reuseExistingServer` | `false` | 拒绝未知旧服务 | 运行会独占端口 |
| `strictPort` | `true` / CLI `--strictPort` | 端口冲突立即失败 | 不负责释放其他进程 |
| `trace` | `retain-on-failure` | 保存失败步骤与网络现场 | 可能含敏感数据 |
| `screenshot` | `only-on-failure` | 保存失败画面 | 不替代可执行断言 |
| `workers` | `1` | 隔离本课有状态教学竞态端点 | 真实服务应设计并行隔离 |
| `getByRole` | role + accessible name | 面向用户定位 | 不等于完整无障碍审计 |
| `toHaveText` / `toBeVisible` | 自动等待断言 | 观察最终状态 | 超时上限不是预设 sleep |
| `waitForResponse` | 等旧请求响应头 | 建立确定事件顺序 | 不读取生产私有流量 |
| `configurePreviewServer` | 安装教学中间件 | preview 上提供只读 API | 不是构建产物或生产 API |

### 5.1 工具版本、命令与文件职责

| 项目 | 固定值或命令 | 文件职责 / 输出 |
| --- | --- | --- |
| Node.js / pnpm | `24.21.0` / `12.11.2` | 执行构建、preview 与测试脚本 |
| Vite | `8.3.4` | 生成生产产物并以 strict port preview 托管 |
| Playwright | `1.64.0` | `pnpm exec playwright --version` 核对入口 |
| Chromium | 与 Playwright 1.64.0 匹配 | `pnpm exec playwright install chromium` 安装 |
| `vite.config.mjs` | `preview.port: 4173`、`strictPort: true` | 固定构建页和教学 API 服务入口 |
| `playwright.config.mjs` | `baseURL`、`webServer`、`trace` | 定义浏览器、服务和失败证据策略 |
| `teaching-api.mjs` | 本机只读服务插件 | 提供七场景的 HTTP 教学响应 |
| `tests/e2e/preview-smoke.spec.ts` | 构建页烟测 | 证明当前 preview 能加载当前页面 |
| `tests/e2e/market.spec.ts` | 产品 E2E | 保存七个用户可观察场景 |
| 完整命令 | `pnpm test:e2e` | 先 build，再运行 8 条 Chromium 测试 |

## 6. 最小可运行案例

### 6.1 Playwright 配置

创建完整文件 `playwright.config.mjs`：

```js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "pnpm preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
```

本课教学 API 在进程内保存一个受控旧响应，因此固定单 worker，避免不同测试共享该状态。
真实 E2E 应让账号和后端数据按 worker 隔离，再评估并行。

### 6.2 构建页烟测

创建完整文件 `tests/e2e/preview-smoke.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("loads the built page through Vite production preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "邻里集市", exact: true })).toBeVisible();
  await expect(page.getByText("本机只读教学数据，不接入真实用户。", { exact: true }))
    .toBeVisible();
});
```

先完成下一节的页面和 Vite 配置，再运行：

```bash
pnpm test:e2e -- tests/e2e/preview-smoke.spec.ts
```

预期 build 成功、preview 在 4173 启动、Chromium 烟测通过，随后服务由 Playwright 停止。
如果测试直接连接开发端口 5173，说明命令或 baseURL 配错；不能把测试 URL 改成开发端口来
绕过 production preview。

## 7. 邻里集市集成案例

### 7.1 完整页面

用以下完整内容替换练习根目录 `index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>邻里集市测试实验</title>
  </head>
  <body>
    <main>
      <h1>邻里集市</h1>
      <p>本机只读教学数据，不接入真实用户。</p>
      <form id="search">
        <label for="query">搜索商品</label>
        <input id="query" name="q" autocomplete="off">
        <button type="submit">搜索</button>
      </form>
      <p id="status" role="status" aria-live="polite">请输入搜索词。</p>
      <ul id="listings" aria-label="商品结果"></ul>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

用以下完整内容替换 `src/main.ts`：

```ts
import { formatCents } from "./domain/money";
import { createReadListingPage } from "./http/read-listing-page";
import { createSearchController } from "./state/search-controller";

const form = document.querySelector<HTMLFormElement>("#search");
const query = document.querySelector<HTMLInputElement>("#query");
const status = document.querySelector<HTMLParagraphElement>("#status");
const list = document.querySelector<HTMLUListElement>("#listings");
if (!form || !query || !status || !list) {
  throw new Error("missing search page elements");
}

const search = createSearchController(createReadListingPage(), (state) => {
  list.replaceChildren();
  if (state.phase === "loading") {
    status.textContent = `加载中：${state.q}`;
    return;
  }
  if (state.phase === "error") {
    status.textContent = `加载失败：${state.message}；可以重新搜索。`;
    return;
  }

  status.textContent = `共 ${state.page.total} 件`;
  for (const item of state.page.items) {
    const row = document.createElement("li");
    row.textContent = `${item.title}：${formatCents(item.priceCents)} 元`;
    list.append(row);
  }
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void search.search(query.value.trim());
});

window.addEventListener("pagehide", () => search.dispose(), { once: true });
```

DOM 使用 `textContent`，不会把服务字符串作为 HTML 执行。加载会清空旧列表；失败显示重试
语义；合法空分页显示 `共 0 件`。

### 7.2 确定性本机教学 API

创建完整文件 `teaching-api.mjs`：

```js
const lamp = {
  id: "listing-1",
  title: "台灯",
  description: "本机教学数据，自提",
  priceCents: 1990,
  status: "available",
  ownerId: "user-1",
  version: 1,
  createdAt: "2026-10-10T08:00:00.000Z",
};

const shelf = {
  id: "listing-2",
  title: "书架",
  description: "本机教学数据，免费自提",
  priceCents: 0,
  status: "available",
  ownerId: "user-2",
  version: 1,
  createdAt: "2026-10-10T08:30:00.000Z",
};

function page(items) {
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
  let heldOldResponse;

  function install(server) {
    server.middlewares.use((request, response, next) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      if (!url.pathname.startsWith("/api/")) {
        next();
        return;
      }

      const error = (status, code) => {
        send(response, status, {
          code,
          message: "Local teaching API error",
          requestId: `teaching-${status}`,
        });
      };

      if (url.pathname !== "/api/v1/listings") {
        error(404, "NOT_FOUND");
        return;
      }
      if (request.method !== "GET") {
        error(405, "READ_ONLY_TEACHING_API");
        return;
      }

      const pageNumber = Number(url.searchParams.get("page"));
      const pageSize = Number(url.searchParams.get("pageSize"));
      if (pageNumber !== 1 || pageSize !== 20) {
        error(400, "INVALID_PAGE");
        return;
      }

      const q = url.searchParams.get("q") ?? "";
      if (q === "fail") {
        error(500, "TEACHING_FAILURE");
        return;
      }
      if (q === "bad") {
        send(response, 200, page([{ ...lamp, priceCents: "1990" }]));
        return;
      }
      if (q === "empty") {
        send(response, 200, page([]));
        return;
      }

      if (q === "旧请求") {
        heldOldResponse = response;
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
        });
        response.flushHeaders();
        response.once("close", () => {
          if (heldOldResponse === response) {
            heldOldResponse = undefined;
          }
        });
        return;
      }

      if (q === "书架") {
        const oldResponse = heldOldResponse;
        heldOldResponse = undefined;
        if (oldResponse) {
          response.once("finish", () => {
            setImmediate(() => {
              if (!oldResponse.destroyed && !oldResponse.writableEnded) {
                oldResponse.end(JSON.stringify(page([{ ...lamp, title: "旧台灯" }])));
              }
            });
          });
        }
        send(response, 200, page([shelf]));
        return;
      }

      if (q === "台灯") {
        send(response, 200, page([lamp]));
        return;
      }

      send(response, 200, page([]));
    });
  }

  return {
    name: "market-local-read-only-teaching-api",
    configureServer: install,
    configurePreviewServer: install,
  };
}
```

“旧请求”立即发 200 响应头，但不结束 JSON body。E2E 可以等待响应事件，确认请求已进入
教学 API；“书架”响应完成后才尝试结束旧 body。这里使用响应 `finish` 事件和下一事件循环
阶段，不使用任意毫秒延迟。正常控制器会先 abort 旧请求；若故障实验同时删除 abort 和
generation guard，旧 body 将晚完成并错误覆盖书架。

这个插件明确是本机只读教学 API：

- 只接受 GET；
- 数据在内存中固定；
- 不读取 Cookie，不建立会话；
- 不执行授权、事务或数据库操作；
- 静态 `dist/` 不包含它。

### 7.3 Vite 生产预览配置

创建完整文件 `vite.config.mjs`：

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
  },
});
```

`configurePreviewServer` 让构建页在本机同源访问教学 API。它不是把 API 打包进浏览器，也不
应复制到生产静态服务器冒充后端。

### 7.4 七场景完整 E2E

创建完整文件 `tests/e2e/market.spec.ts`：

```ts
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function search(page: Page, q: string): Promise<void> {
  await page.getByRole("textbox", { name: "搜索商品" }).fill(q);
  await page.getByRole("button", { name: "搜索", exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "邻里集市", exact: true })).toBeVisible();
});

test("scenario 1: displays 1990 integer cents as 19.90", async ({ page }) => {
  await search(page, "台灯");
  await expect(page.getByText("台灯：19.90 元", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("共 1 件");
});

test("scenario 2: keeps zero cents as a visible free price", async ({ page }) => {
  await search(page, "书架");
  await expect(page.getByText("书架：0.00 元", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("共 1 件");
});

test("scenario 3: shows HTTP 500 as an error instead of empty success", async ({ page }) => {
  await search(page, "fail");
  await expect(page.getByRole("status")).toContainText("listings HTTP 500");
  await expect(page.getByRole("status")).not.toHaveText("共 0 件");
  await expect(page.getByRole("list", { name: "商品结果" }).getByRole("listitem")).toHaveCount(0);
});

test("scenario 4: rejects a string price at the runtime parser", async ({ page }) => {
  await search(page, "bad");
  await expect(page.getByRole("status")).toContainText("priceCents");
  await expect(page.getByText("台灯：19.90 元", { exact: true })).toHaveCount(0);
});

test("scenario 5: distinguishes an empty success from a failure", async ({ page }) => {
  await search(page, "empty");
  await expect(page.getByRole("status")).toHaveText("共 0 件");
  await expect(page.getByRole("list", { name: "商品结果" }).getByRole("listitem")).toHaveCount(0);
});

test("scenario 6: keeps the fresh result when the old request finishes later", async ({ page }) => {
  const oldHeaders = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/v1/listings" && url.searchParams.get("q") === "旧请求";
  });

  await search(page, "旧请求");
  await oldHeaders;
  await expect(page.getByRole("status")).toHaveText("加载中：旧请求");

  await search(page, "书架");
  await expect(page.getByText("书架：0.00 元", { exact: true })).toBeVisible();
  await expect(page.getByText("旧台灯：19.90 元", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("共 1 件");
});

test("scenario 7: recovers from a failure with a later valid search", async ({ page }) => {
  await search(page, "fail");
  await expect(page.getByRole("status")).toContainText("listings HTTP 500");

  await search(page, "台灯");
  await expect(page.getByText("台灯：19.90 元", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("共 1 件");
  await expect(page.getByRole("status")).not.toContainText("加载失败");
});
```

所有定位器都来自角色、名称或精确可见文本；所有等待都对应页面条件或响应事件。没有
`waitForTimeout`，也没有用请求拦截直接返回夹具。

### 7.5 运行与预期

执行：

```bash
pnpm exec playwright --version
pnpm test:e2e
```

预期：

```text
Version 1.64.0
8 passed
```

实际耗时与机器有关，不把固定秒数写成验收。命令应先显示 Vite production build 成功，再
启动 `http://127.0.0.1:4173`；结束后该端口不再监听。失败时查看首个断言、浏览器控制台、
请求状态和 `test-results/` 中保留的 trace，不先增加 sleep。

## 8. 常见错误与排查路径

### 8.1 故意错误：4173 已被占用

终端 A 运行一个明确的临时占用进程：

```bash
node -e '
  require("node:http")
    .createServer((_request, response) => {
      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("occupied");
    })
    .listen(4173, "127.0.0.1", () => console.log("4173 occupied"));
'
```

看到 `4173 occupied` 后，在终端 B 执行：

```bash
pnpm test:e2e
```

预期 preview 因 strict port 非零退出，而不是改用 4174。回到终端 A 按 `Ctrl+C`，再运行
`pnpm test:e2e` 应恢复 8 条通过。

**五段错误记录**

- **现象：** Playwright 的 web server 无法启动，产品断言尚未执行。
- **证据：** Vite 日志明确指出 4173 被占用；端口进程由终端 A 可见。
- **原因：** 当前测试要求固定 baseURL，另一个进程已经持有该端口。
- **修复：** 确认进程归属并停止本次临时占用，不启用自动换端口或复用未知服务。
- **复验：** 同一 `pnpm test:e2e` 在 4173 启动当前 preview，8 条测试通过且结束后服务停止。

### 8.2 使用 route mock 后声称真实后端通过

下面写法可以用于孤立前端状态，但不能证明本课教学 API 或真实服务：

```ts
await page.route("**/api/v1/listings**", async (route) => {
  await route.fulfill({ json: { items: [], page: 1, pageSize: 20, total: 0 } });
});
```

若采用它，证据名称必须是“浏览器路由模拟下的 UI”。本课不使用该代码；修复错误声称的方法
是连接明确服务并记录其身份，而不是把 mock 数据改得更像生产。

### 8.3 用 `waitForTimeout` 修复竞态失败

固定等待只能改变概率，无法证明旧请求已进入目标阶段。使用 `waitForResponse` 等待带特定
查询值的响应头，再触发新搜索。若失败，检查事件谓词、控制器 signal 和教学 API 的 body
完成顺序。

### 8.4 删除行为后只断言按钮存在

临时移除表单 `submit` 监听器，场景 1 应在可见金额断言失败并留下 trace。正确修复是恢复搜索
行为；把测试改成“按钮可见”只证明静态 HTML 存在，不能验收用户任务。

### 8.5 同时移除取消与 generation guard

在 `search-controller.ts` 中临时移除 `active?.abort()`，并让成功分支不检查 current。
场景 6 中“旧台灯”会在书架之后发布，测试应失败。恢复两层保护后指定运行：

```bash
pnpm test:e2e -- tests/e2e/market.spec.ts -g "scenario 6"
pnpm test:e2e
```

先验证目标场景，再跑全套。不要缩短教学 API 的受控顺序或删除旧结果断言。

### 8.6 Trace 无法打开或包含不应共享的数据

先确认是失败运行且 `test-results/` 尚未清理，再使用：

```bash
pnpm exec playwright show-trace test-results/<失败目录>/trace.zip
```

尖括号表示从实际失败输出读取目录名，不是固定命令参数。真实数据环境中先按团队权限和保留
策略处理；不能为了调试把会话 trace 上传到公开位置。

## 9. 课后题

**问题 1：为什么 `pnpm build` 成功后仍要 E2E？**

参考答案：构建只证明工具生成产物，不证明浏览器能加载正确路径、用户操作触发行为、运行时
解析失败可见或竞态状态正确。

**问题 2：本机教学 API 比 route mock 多了什么证据？**

参考答案：请求经过浏览器 HTTP、Vite preview 中间件、真实状态码和 body 流；但仍没有真实
应用服务器、认证、授权、事务或数据库。

**问题 3：为什么空成功不能只断言列表项为 0？**

参考答案：错误也可能清空列表。还要断言状态是 `共 0 件`，并确认不是错误文案。

**问题 4：为什么 trace 不是可以永久公开的普通测试日志？**

参考答案：它可能包含页面快照、网络请求、响应和截图，在真实系统中可能带会话或个人数据。

## 10. 实践练习

### 基础：增加可访问名称失败实验

临时删除 `<label for="query">` 的 `for`，保持输入没有其他可访问名称。可判定标准：

- `getByRole("textbox", { name: "搜索商品" })` 无法定位；
- 恢复 label 关联后测试通过；
- 不把 locator 改成 `#query` 来绕过语义退化。

### 进阶：增加分页第二页场景

扩展页面控件和教学 API，使第二页能返回一个不同商品。可判定标准：

- 用户通过有名称的按钮切换页；
- URL 包含请求页码；
- 响应页码由客户端核对；
- 快速切页仍取消旧请求并保护 generation；
- E2E 只断言用户可见页与商品，不读取控制器私有变量。

### 故障注入：破坏错误恢复

临时在错误后禁用搜索按钮且不恢复。可判定标准：

1. 场景 7 先在第二次搜索行为或最终金额断言失败；
2. trace 能显示按钮状态与最后页面；
3. 修复错误分支的可恢复行为；
4. 指定场景和完整 8 条测试均转绿；
5. 不增加固定等待，不删除恢复断言。

## 11. 阶段验收

- [ ] `pnpm exec playwright --version` 输出 `Version 1.64.0`。
- [ ] 使用官方命令安装与当前包匹配的 Chromium。
- [ ] `test:e2e` 先 build，再访问严格端口 4173 的 production preview。
- [ ] `reuseExistingServer` 为 false，端口冲突会明确失败。
- [ ] 烟测和七个产品场景共 8 条测试通过。
- [ ] 七场景逐项覆盖 `19.90`、`0.00`、500、字符串价格、空成功、旧结果、恢复。
- [ ] locator 使用 role/name，断言使用自动等待。
- [ ] 旧请求通过响应事件建立顺序，没有任意 sleep。
- [ ] E2E 未使用 route mock 替换教学 API。
- [ ] 失败保留 trace，且能说明真实项目的访问控制和保留风险。
- [ ] 4173 占用实验先失败，释放后同一命令通过。
- [ ] 明确记录 Firefox、WebKit、真实移动设备、生产缓存/TLS/部署和真实后端均未验证。

## 12. 常见问题

**为什么只跑 Chromium？**

它是本卷固定的主要自动化环境。Firefox、WebKit 和真实移动设备仍是明确缺口，不能从
Chromium 结果外推。

**为什么 E2E 固定单 worker？**

本课教学 API 用一个受控旧响应演示竞态，单 worker 保证测试隔离。生产测试应让数据和账号
支持并行，而不是永久牺牲速度。

**为什么测试不检查内部 fetch 调用次数？**

集成课已经检查请求协议；E2E 关注用户行为。只要用户契约成立，内部实现可以重构。

**preview 插件能部署吗？**

它是 Vite 本机服务钩子，不进入静态 dist。真实部署需要独立后端或经过明确架构设计的服务，
不能复制本课插件后声称生产 API 已完成。

**失败后页面保留旧列表还是清空更好？**

这是产品状态契约。本课选择加载时清空并显示明确错误；若项目选择保留旧内容，必须标记陈旧
状态并修改相应验收，不能让失败看起来像新成功。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Playwright 安装](https://playwright.dev/docs/intro)：测试包与匹配浏览器。
- [Playwright Locators](https://playwright.dev/docs/locators)：role/name 与用户可观察定位。
- [Playwright 自动等待断言](https://playwright.dev/docs/test-assertions)：重试断言语义。
- [Playwright Web Server](https://playwright.dev/docs/test-webserver)：服务启动、URL 和复用策略。
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)：失败现场查看与网络证据。
- [Vite Preview Options](https://vite.dev/config/preview-options)：host、port 与 strict port。
- [Vite Plugin API](https://vite.dev/guide/api-plugin)：开发和 preview 服务钩子。

## 我现在能做到什么

我能让 Playwright 1.64 在严格端口的 Vite production preview 上验收构建页，用可访问定位器
覆盖七个用户场景，并以响应事件和自动断言替代任意等待；我也能准确界定本机教学 API 证据
不等于真实后端、生产部署或跨浏览器验收。

## 单元导航

[本章入口](../05-unit-integration-e2e.md) ·
[上一课：集成 HTTP、解析器与请求竞态](02-vitest-integration-http-races.md) ·
[下一课：Git 范围、审查与可回退提交](../06-ci-git-release/01-git-scope-reviewable-commits.md)
