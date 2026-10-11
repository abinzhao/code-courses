# 测试、构建、预算与浏览器门禁：让每层失败都能归属

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 提供完整 Vitest、领域/HTTP/搜索测试、Playwright 七场景与递归 gzip 预算 |
| 前置 | 第 01 课根脚本与第 02 课完整实现 |
| 建议投入 | 3.5 小时实现与阅读，60 分钟红绿故障实验 |
| 完整文件 owner | 本课独占 9 个路径；全项目完整文件到此达到 27 个 |
| Vitest 范围 | 金额、UTC、分页、唯一性、不可变、Response、查询、signal、abort、generation、dispose、恢复 |
| Playwright 范围 | `19.90`、`0.00`、500、字符串价格、empty、旧结果防护、recovery |
| 预算 | 递归 JavaScript；每文件 raw/gzip；单文件 `81920`、总 gzip `184320` |
| 环境标签 | **Vitest 为 Node/内存/注入传输；Playwright 为本机 preview + 教学 API；均非生产** |

根脚本已连接为：

```text
quality -> build -> budget -> Playwright -> test:e2e -> verify
```

其中每个子门仍可单独运行。聚合成功只证明日志中实际执行的步骤，不把未运行的生产系统写成
通过。

## 1. 任务背景

一个长 E2E 可以点击所有按钮，却很难定位金额算法、HTTP 顺序和竞态发布权；一组纯函数测试
可以覆盖 parser，却不能证明构建页能加载和恢复。合理的测试分层把规则放到最小充分层：

```text
Vitest 领域：纯值和值域
Vitest HTTP：真实 Response + 注入传输 + parser
Vitest 搜索：deferred Promise + 状态发布
Playwright：生产构建 + 本机 HTTP + 用户可见 DOM
预算：构建产物字节门禁
```

门禁还必须能失败。金额除数、HTTP 状态检查、stale guard、Vite import、预算阈值和浏览器行为
都需要可恢复故障实验；不能用删除断言、关闭规则或吞异常制造绿色。

## 2. 学习目标

完成本课后，你能够：

1. 用 Vitest 5 Node 环境运行领域和集成测试；
2. 从业务规则独立写出金额预期，而不是调用实现生成预期；
3. 测试 UTC 规范化、不可能日期、分页矛盾、重复 ID 和输入不可变；
4. 使用真实 `Response` 连接 status、JSON、parser 和分页核对；
5. 断言查询编码、same-origin credentials 和同一个 `AbortSignal`；
6. 用 deferred Promise 分别证明 abort 与 generation guard；
7. 测试 empty、dispose、当前 error 和下一次 recovery；
8. 用 role/name locator 和自动等待完成七个浏览器场景；
9. 用递归脚本拒绝缺失构建、零 JavaScript 和超限；
10. 解释全部构建 JS、本地 gzip、首屏请求和生产传输为何不同。

## 3. 预备知识

本课只引用第 02 课公开路径：

```text
@market/contracts
apps/lab-web/src/search.ts
apps/lab-web/index.html
```

测试不复制 parser 或控制器实现。先回顾：

- [Vitest 领域单元边界](../05-unit-integration-e2e/01-vitest-unit-domain-boundaries.md)；
- [Vitest HTTP 与竞态](../05-unit-integration-e2e/02-vitest-integration-http-races.md)；
- [Playwright 构建页 E2E](../05-unit-integration-e2e/03-playwright-built-page-e2e.md)；
- [递归资源预算](../03-build-assets-performance/03-asset-budget-production-preview.md)。

不要在教材树运行安装。本课完成后由第 04 课统一提取到 `/tmp`。

## 4. 核心理论

### 4.1 预期值必须独立于实现

金额测试直接写：

```text
0 -> "0.00"
1 -> "0.01"
100 -> "1.00"
1990 -> "19.90"
```

测试不执行 `/ 100`，因此实现把除数改为 `1000` 时会变红。类型检查仍会接受错误的
`number -> string`，这正说明行为测试不可替代。

### 4.2 Parser 测关系，不只测字段

分页测试同时检查：

- `page/pageSize/total` 是安全整数；
- offset 不溢出；
- items 不超过页容量和剩余总数；
- 超出末页的空列表可合法；
- 同页 ID 不重复；
- 输出不复用输入数组和项目引用。

这些断言保证 parser 真的创建领域对象，而不是用类型断言转交原始缓存。

### 4.3 HTTP 集成只替换网络传输

测试注入 request 函数，但返回 Node 24 的真实 `Response`。实现仍执行：

- URLSearchParams；
- method、Accept、credentials 和 signal；
- `response.ok/status`；
- `response.json()`；
- 真实 parser；
- 响应分页与请求核对。

这不是网络或后端测试。DNS、Cookie jar、CORS、服务器中间件、认证、数据库和日志都未进入。

### 4.4 Deferred 让竞态顺序确定

测试创建两个未完成 Promise，先结算新请求，再结算旧请求。没有 `setTimeout` 和任意 sleep。
其中两条独立规则是：

1. 新搜索开始时旧 signal 变成 aborted；
2. reader 忽略 signal 时，旧结果仍不能发布。

第二条才是 generation guard 的直接证据。

### 4.5 E2E 只保留跨边界用户场景

七场景分别锁定构建页可见行为。E2E 不重复所有非法日期和分页组合，也不读取控制器私有变量。
`waitForResponse` 为 delayed 请求建立事件顺序；`toHaveText` 等断言自动重试页面条件，不使用
`waitForTimeout`。

### 4.6 预算门禁定义精确口径

脚本递归查找 `.js/.mjs/.cjs`，每个文件独立用 Node zlib level 9 gzip，再求和。它报告：

- 每文件 raw；
- 每文件 gzip；
- 单文件 PASS/FAIL；
- 全部 JavaScript raw/gzip；
- 总预算 PASS/FAIL。

它不等于首页下载量，因为动态 chunk 也进入总数；也不证明生产服务器使用 gzip。生产结论需要
目标 URL 的响应头、缓存状态和真实用户性能证据。

## 5. 元素、属性、API 或配置清单

| 项目 | 固定值/用法 | 证据 | 边界 |
| --- | --- | --- | --- |
| Vitest | `5.0.3`、Node environment | 测试文件/条数/退出码 | 无浏览器和真实网络 |
| `restoreMocks` | `true` | 测试间替换恢复 | 不替代状态清理 |
| `Response` | Node 24 标准对象 | status/body 真实语义 | 无服务器 |
| deferred | 暴露 resolve/reject | 确定完成顺序 | 只用于测试 |
| Playwright | `1.64.0` | Chromium 用户路径 | 不含 Firefox/WebKit |
| `workers` | `1` | 隔离持有旧响应的教学 API | 真实服务应支持并行隔离 |
| `reuseExistingServer` | `false` | 不复用未知 4173 服务 | 端口冲突会失败 |
| trace | `retain-on-failure` | 失败现场 | 真实 trace 可能含敏感数据 |
| `gzipSync` | `{ level: 9 }` | 本地可比压缩估算 | 不是响应 `Content-Encoding` |
| 单文件预算 | `81920` bytes | `>` 才失败 | 教学项目阈值 |
| 总预算 | `184320` bytes | 独立 gzip 后求和 | 不是首屏 |
| `process.exitCode` | 任一超限设 `1` | shell/CI 可阻断 | warning 不足以门禁 |

## 6. 最小可运行案例

### 6.1 Vitest 配置

**完整文件：`vitest.config.mjs`**
<!-- CAPSTONE_FILE_BEGIN path="vitest.config.mjs" owner="03" -->
```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/*.test.ts"],
    restoreMocks: true,
  },
});
```
<!-- CAPSTONE_FILE_END path="vitest.config.mjs" -->

E2E 位于 `tests/e2e/`，不会被 Vitest 的根级 glob 收集。

### 6.2 每次新建的领域夹具

**完整文件：`tests/fixtures/listing-page.ts`**
<!-- CAPSTONE_FILE_BEGIN path="tests/fixtures/listing-page.ts" owner="03" -->
```ts
export function listingPageFixture() {
  return {
    items: [
      {
        id: "listing-1",
        title: "台灯",
        description: "本机教学数据，自提",
        priceCents: 1990,
        status: "available",
        ownerId: "user-1",
        version: 1,
        createdAt: "2026-10-11T08:00:00Z",
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  };
}
```
<!-- CAPSTONE_FILE_END path="tests/fixtures/listing-page.ts" -->

### 6.3 完整领域测试

**完整文件：`tests/domain.test.ts`**
<!-- CAPSTONE_FILE_BEGIN path="tests/domain.test.ts" owner="03" -->
```ts
import { expect, test } from "vitest";
import { formatCents, parseListingPage } from "@market/contracts";
import { listingPageFixture } from "./fixtures/listing-page";

test("formats integer cents from independent literal expectations", () => {
  expect(formatCents(0)).toBe("0.00");
  expect(formatCents(1)).toBe("0.01");
  expect(formatCents(100)).toBe("1.00");
  expect(formatCents(1990)).toBe("19.90");
});

test("rejects negative, fractional, non-finite and unsafe cents", () => {
  const invalid = [-1, 19.9, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1];
  for (const value of invalid) {
    expect(() => formatCents(value), `value=${String(value)}`).toThrow("priceCents");
  }
});

test("normalizes a valid UTC instant", () => {
  const page = parseListingPage(listingPageFixture());
  expect(page.items[0]?.createdAt).toBe("2026-10-11T08:00:00.000Z");
});

test("rejects string prices and invalid UTC dates", () => {
  const source = listingPageFixture();
  expect(() =>
    parseListingPage({
      ...source,
      items: [{ ...source.items[0], priceCents: "1990" }],
    }),
  ).toThrow("priceCents");
  expect(() =>
    parseListingPage({
      ...source,
      items: [{ ...source.items[0], createdAt: "2026-02-30T08:00:00Z" }],
    }),
  ).toThrow("calendar");
  expect(() =>
    parseListingPage({
      ...source,
      items: [{ ...source.items[0], createdAt: "2026-10-11T16:00:00+08:00" }],
    }),
  ).toThrow("UTC");
});

test("rejects pagination contradictions and unsafe offsets", () => {
  const source = listingPageFixture();
  const second = { ...source.items[0], id: "listing-2" };
  const invalid = [
    { ...source, total: 0 },
    { ...source, items: [source.items[0], second], pageSize: 1, total: 2 },
    { ...source, items: [], page: Number.MAX_SAFE_INTEGER, pageSize: 20, total: 0 },
  ];
  for (const input of invalid) {
    expect(() => parseListingPage(input)).toThrow(/pagination|overflow/);
  }

  expect(parseListingPage({ items: [], page: 2, pageSize: 20, total: 1 })).toEqual({
    items: [],
    page: 2,
    pageSize: 20,
    total: 1,
  });
});

test("rejects duplicate listing IDs", () => {
  const source = listingPageFixture();
  expect(() =>
    parseListingPage({
      ...source,
      items: [source.items[0], { ...source.items[0] }],
      total: 2,
    }),
  ).toThrow("duplicate listing id");
});

test("does not mutate input or reuse mutable containers", () => {
  const input = listingPageFixture();
  const before = structuredClone(input);
  const parsed = parseListingPage(input);

  expect(input).toEqual(before);
  expect(parsed).not.toBe(input);
  expect(parsed.items).not.toBe(input.items);
  expect(parsed.items[0]).not.toBe(input.items[0]);

  if (parsed.items[0]) {
    parsed.items[0].title = "已解析结果";
  }
  expect(input.items[0]?.title).toBe("台灯");
});
```
<!-- CAPSTONE_FILE_END path="tests/domain.test.ts" -->

## 7. 邻里集市集成案例

### 7.1 Deferred 夹具

**完整文件：`tests/fixtures/deferred.ts`**
<!-- CAPSTONE_FILE_BEGIN path="tests/fixtures/deferred.ts" owner="03" -->
```ts
export type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}
```
<!-- CAPSTONE_FILE_END path="tests/fixtures/deferred.ts" -->

Promise executor 在构造期间同步执行，因此函数返回前两个回调已经赋值。该非空断言只基于这个
局部可证明顺序。

### 7.2 HTTP 完整测试

**完整文件：`tests/http.test.ts`**
<!-- CAPSTONE_FILE_BEGIN path="tests/http.test.ts" owner="03" -->
```ts
import { expect, test } from "vitest";
import { createReadListingPage } from "../apps/lab-web/src/search";
import { listingPageFixture } from "./fixtures/listing-page";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

test("encodes query and preserves method, credentials, headers and signal", async () => {
  const controller = new AbortController();
  let calls = 0;
  const readPage = createReadListingPage(async (url, init) => {
    calls += 1;
    expect(url).toContain("%26");
    const parsed = new URL(url, "http://market.test");
    expect(parsed.pathname).toBe("/api/v1/listings");
    expect(parsed.searchParams.get("page")).toBe("1");
    expect(parsed.searchParams.get("pageSize")).toBe("20");
    expect(parsed.searchParams.get("q")).toBe("台灯 & 书");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("same-origin");
    expect(new Headers(init.headers).get("Accept")).toBe("application/json");
    expect(init.signal).toBe(controller.signal);
    return jsonResponse(listingPageFixture());
  });

  const page = await readPage("台灯 & 书", controller.signal);
  expect(calls).toBe(1);
  expect(page.items[0]?.priceCents).toBe(1990);
  expect(page.items[0]?.createdAt).toBe("2026-10-11T08:00:00.000Z");
});

test("rejects HTTP 500 before parsing its body as a page", async () => {
  const readPage = createReadListingPage(
    async () => new Response("not a listing page", { status: 500 }),
  );
  await expect(readPage("", new AbortController().signal)).rejects.toThrow("listings HTTP 500");
});

test("keeps JSON unknown until the parser rejects a string price", async () => {
  const source = listingPageFixture();
  const raw = {
    ...source,
    items: [{ ...source.items[0], priceCents: "1990" }],
  };
  const readPage = createReadListingPage(async () => jsonResponse(raw));
  await expect(readPage("", new AbortController().signal)).rejects.toThrow("priceCents");
});

test("rejects response pagination that differs from the request", async () => {
  const readPage = createReadListingPage(async () =>
    jsonResponse({ items: [], page: 2, pageSize: 20, total: 0 }),
  );
  await expect(readPage("", new AbortController().signal)).rejects.toThrow("pagination differs");
});
```
<!-- CAPSTONE_FILE_END path="tests/http.test.ts" -->

### 7.3 搜索控制器完整测试

**完整文件：`tests/search.test.ts`**
<!-- CAPSTONE_FILE_BEGIN path="tests/search.test.ts" owner="03" -->
```ts
import { expect, test } from "vitest";
import type { ListingPage } from "@market/contracts";
import { createSearchController } from "../apps/lab-web/src/search";
import type { SearchState } from "../apps/lab-web/src/search";
import { deferred } from "./fixtures/deferred";

const emptyPage: ListingPage = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
};

test("aborts the older signal when a new search starts", async () => {
  const old = deferred<ListingPage>();
  const fresh = deferred<ListingPage>();
  const signals: AbortSignal[] = [];
  const controller = createSearchController(
    (q, signal) => {
      signals.push(signal);
      return q === "old" ? old.promise : fresh.promise;
    },
    () => undefined,
  );

  const first = controller.search("old");
  const second = controller.search("fresh");
  expect(signals[0]?.aborted).toBe(true);
  expect(signals[1]?.aborted).toBe(false);

  fresh.resolve(emptyPage);
  old.resolve(emptyPage);
  await Promise.all([first, second]);
  controller.dispose();
});

test("blocks an old result when the reader ignores cancellation", async () => {
  const old = deferred<ListingPage>();
  const fresh = deferred<ListingPage>();
  const states: SearchState[] = [];
  const controller = createSearchController(
    (q) => (q === "old" ? old.promise : fresh.promise),
    (state) => states.push(state),
  );

  const first = controller.search("old");
  const second = controller.search("fresh");
  fresh.resolve({
    ...emptyPage,
    items: [
      {
        id: "listing-fresh",
        title: "新结果",
        description: "",
        priceCents: 0,
        status: "available",
        ownerId: "user-2",
        version: 1,
        createdAt: "2026-10-11T08:30:00.000Z",
      },
    ],
    total: 1,
  });
  await second;
  old.resolve(emptyPage);
  await first;

  expect(states.filter((state) => state.phase === "success")).toHaveLength(1);
  expect(states.at(-1)?.phase).toBe("success");
  expect(states.at(-1)?.q).toBe("fresh");
  controller.dispose();
});

test("publishes an explicit empty state", async () => {
  const states: SearchState[] = [];
  const controller = createSearchController(
    async () => emptyPage,
    (state) => states.push(state),
  );
  await controller.search("empty");
  expect(states).toEqual([
    { phase: "loading", q: "empty" },
    { phase: "empty", q: "empty" },
  ]);
  controller.dispose();
});

test("publishes a current error and recovers on the next success", async () => {
  const states: SearchState[] = [];
  const controller = createSearchController(
    async (q) => {
      if (q === "500") throw new Error("listings HTTP 500");
      return {
        ...emptyPage,
        items: [
          {
            id: "listing-1",
            title: "台灯",
            description: "",
            priceCents: 1990,
            status: "available",
            ownerId: "user-1",
            version: 1,
            createdAt: "2026-10-11T08:00:00.000Z",
          },
        ],
        total: 1,
      };
    },
    (state) => states.push(state),
  );

  await controller.search("500");
  expect(states.at(-1)).toEqual({
    phase: "error",
    q: "500",
    message: "listings HTTP 500",
  });

  await controller.search("valid");
  expect(states.at(-1)?.phase).toBe("success");
  expect(states.at(-1)?.q).toBe("valid");
  controller.dispose();
});

test("dispose aborts active work, blocks publication and prevents reuse", async () => {
  const pending = deferred<ListingPage>();
  const states: SearchState[] = [];
  let signal: AbortSignal | undefined;
  const controller = createSearchController(
    (_q, currentSignal) => {
      signal = currentSignal;
      return pending.promise;
    },
    (state) => states.push(state),
  );

  const search = controller.search("leave");
  controller.dispose();
  expect(signal?.aborted).toBe(true);
  pending.resolve(emptyPage);
  await search;

  expect(states).toEqual([{ phase: "loading", q: "leave" }]);
  await expect(controller.search("again")).rejects.toThrow("disposed");
});
```
<!-- CAPSTONE_FILE_END path="tests/search.test.ts" -->

### 7.4 Playwright 配置

**完整文件：`playwright.config.mjs`**
<!-- CAPSTONE_FILE_BEGIN path="playwright.config.mjs" owner="03" -->
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
<!-- CAPSTONE_FILE_END path="playwright.config.mjs" -->

### 7.5 七场景完整 E2E

**完整文件：`tests/e2e/market.spec.ts`**
<!-- CAPSTONE_FILE_BEGIN path="tests/e2e/market.spec.ts" owner="03" -->
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
  await expect(page.getByText("台灯：19.90 元", { exact: true })).toBeVisible();
});

test("scenario 1: displays 1990 integer cents as 19.90", async ({ page }) => {
  await search(page, "valid");
  await expect(page.getByText("台灯：19.90 元", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("共 1 件");
});

test("scenario 2: keeps zero cents as a visible free price", async ({ page }) => {
  await search(page, "free");
  await expect(page.getByText("书架：0.00 元", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("共 1 件");
});

test("scenario 3: shows HTTP 500 as an error instead of empty", async ({ page }) => {
  await search(page, "500");
  await expect(page.getByRole("status")).toContainText("listings HTTP 500");
  await expect(page.getByRole("status")).not.toContainText("没有找到商品");
  await expect(page.getByRole("list", { name: "商品结果" }).getByRole("listitem")).toHaveCount(0);
});

test("scenario 4: rejects a string price at the runtime parser", async ({ page }) => {
  await search(page, "string-price");
  await expect(page.getByRole("status")).toContainText("priceCents");
  await expect(page.getByText("台灯：19.90 元", { exact: true })).toHaveCount(0);
});

test("scenario 5: distinguishes an empty success from an error", async ({ page }) => {
  await search(page, "empty");
  await expect(page.getByRole("status")).toHaveText("没有找到商品，可以调整搜索。");
  await expect(page.getByRole("status")).toHaveAttribute("data-phase", "empty");
  await expect(page.getByRole("list", { name: "商品结果" }).getByRole("listitem")).toHaveCount(0);
});

test("scenario 6: keeps the fresh result when a delayed request finishes later", async ({
  page,
}) => {
  const delayedHeaders = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/v1/listings" && url.searchParams.get("q") === "delayed";
  });

  await search(page, "delayed");
  await delayedHeaders;
  await expect(page.getByRole("status")).toHaveText("加载中：delayed");

  await search(page, "free");
  await expect(page.getByText("书架：0.00 元", { exact: true })).toBeVisible();
  await expect(page.getByText("旧台灯：19.90 元", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("status")).toHaveText("共 1 件");
});

test("scenario 7: recovers from an error with a later valid search", async ({ page }) => {
  await search(page, "500");
  await expect(page.getByRole("status")).toContainText("listings HTTP 500");

  await search(page, "valid");
  await expect(page.getByText("台灯：19.90 元", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("共 1 件");
  await expect(page.getByRole("status")).toHaveAttribute("data-phase", "success");
});
```
<!-- CAPSTONE_FILE_END path="tests/e2e/market.spec.ts" -->

### 7.6 递归 raw/gzip 预算

**完整文件：`scripts/check-assets.mjs`**
<!-- CAPSTONE_FILE_BEGIN path="scripts/check-assets.mjs" owner="03" -->
```js
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const DEFAULT_FILE_LIMIT = 80 * 1024;
const DEFAULT_TOTAL_LIMIT = 180 * 1024;

function positiveInteger(value, fallback, name) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return parsed;
}

async function requireBuildDirectory(directory) {
  let metadata;
  try {
    metadata = await stat(directory);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(`missing build directory: ${directory}; run the build first`, {
        cause: error,
      });
    }
    throw error;
  }
  if (!metadata.isDirectory()) {
    throw new Error(`build path is not a directory: ${directory}`);
  }
}

async function walkJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));

  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJavaScript(path)));
    } else if (entry.isFile() && /\.(?:c|m)?js$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

async function main() {
  const root = resolve(process.argv[2] ?? "apps/lab-web/dist");
  const fileLimit = positiveInteger(
    process.env.JS_FILE_GZIP_LIMIT_BYTES,
    DEFAULT_FILE_LIMIT,
    "JS_FILE_GZIP_LIMIT_BYTES",
  );
  const totalLimit = positiveInteger(
    process.env.JS_TOTAL_GZIP_LIMIT_BYTES,
    DEFAULT_TOTAL_LIMIT,
    "JS_TOTAL_GZIP_LIMIT_BYTES",
  );

  await requireBuildDirectory(root);
  const files = await walkJavaScript(root);
  if (files.length === 0) {
    throw new Error(`no built JavaScript found under: ${root}`);
  }

  let rawTotal = 0;
  let gzipTotal = 0;
  let failed = false;

  for (const file of files) {
    const raw = await readFile(file);
    const gzipBytes = gzipSync(raw, { level: 9 }).byteLength;
    const overFileLimit = gzipBytes > fileLimit;
    rawTotal += raw.byteLength;
    gzipTotal += gzipBytes;
    failed ||= overFileLimit;
    console.log(
      `${relative(root, file)} raw=${raw.byteLength} gzip=${gzipBytes} ` +
        `fileLimit=${fileLimit} status=${overFileLimit ? "FAIL" : "PASS"}`,
    );
  }

  const overTotalLimit = gzipTotal > totalLimit;
  failed ||= overTotalLimit;
  console.log(
    `TOTAL files=${files.length} raw=${rawTotal} gzip=${gzipTotal} ` +
      `totalLimit=${totalLimit} status=${overTotalLimit ? "FAIL" : "PASS"}`,
  );

  if (failed) {
    console.error("JavaScript asset budget exceeded");
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error(`[asset-budget] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
```
<!-- CAPSTONE_FILE_END path="scripts/check-assets.mjs" -->

## 8. 常见错误与排查路径

### 明确错误：金额除数改成 1000

精确故障变更，不是完整文件：

```diff
- return `${Math.floor(parsed / 100)}.${String(parsed % 100).padStart(2, "0")}`;
+ return `${Math.floor(parsed / 1000)}.${String(parsed % 100).padStart(2, "0")}`;
```

| 五段 | 记录 |
| --- | --- |
| 现象 | `formats integer cents` 测试失败，类型检查仍可通过 |
| 证据 | 期望 `19.90`，实际不是该字面量，Vitest 非零退出 |
| 原因 | 实现改变分到元的业务单位，静态签名仍是 `number -> string` |
| 修复 | 恢复除数 `100`，不修改测试接受错误金额 |
| 复验 | 指定领域测试转绿，再运行完整 `pnpm test` |

### Stale guard 故障

同时让成功分支忽略 generation/signal，注入 reader 已经故意忽略取消。旧结果测试应出现额外
终态并失败。恢复三项检查后转绿；不能让测试等待更久或删掉旧结果断言。

### HTTP 状态故障

删除 `response.ok` 检查后，500 用例会得到 JSON 解析错误，而不是 `listings HTTP 500`。
恢复协议顺序，不把错误 body 转成空分页。

### 浏览器行为故障

把 submit 处理临时改成总查询 `valid`，场景 2 输入 `free` 后仍显示台灯，自动断言失败并保留
trace。修复输入连接，不把 locator 改成只断言按钮存在。

### 排查表

| 失败 | 首要证据 | 根因类别 | 不接受的处理 |
| --- | --- | --- | --- |
| Vitest 金额 | 期望/实际字面量 | 领域算法 | 修改期望为错误值 |
| HTTP 500 | status 与首个错误 | 协议顺序 | 返回空页 |
| 搜索竞态 | 状态发布数组 | stale guard | 加 sleep |
| Vite build | unresolved import 路径 | 模块图 | 创建无职责空模块 |
| Budget | 超限文件/阈值/退出码 | 资源体积 | 无依据调高阈值 |
| Playwright | locator、页面实际、trace | 用户行为 | 删除断言 |
| 4173 占用 | webServer/Vite 日志 | 环境端口 | 自动换端口或复用未知服务 |

## 9. 课后题

**问题 1：为什么 E2E 不覆盖每个非法金额？**

参考答案：值域组合由快速领域测试充分覆盖；E2E 保留一个字符串价格代表跨 HTTP、parser、DOM
的连接证据。

**问题 2：真实 `Response` 是否证明真实后端？**

参考答案：不证明。它只保留标准 status/body 消费语义，request 仍由进程内函数注入。

**问题 3：为什么全部 JavaScript gzip 不等于首屏？**

参考答案：总数包含交互后或其他入口的 chunk；首屏要观察具体页面 Network 和缓存状态。

**问题 4：Playwright trace 为什么不能随意公开？**

参考答案：真实项目的 trace 可能包含 DOM、请求、响应、截图、会话和个人数据，需要访问控制和
短保留期。

## 10. 实践练习

### 基础：增加一分价格

为 `formatCents(1)` 保留独立字面量 `"0.01"`，运行领域测试。

判定标准：测试不调用任何格式函数生成预期；指定文件与完整 Vitest 都通过。

### 进阶：增加 401 HTTP 场景

注入真实 `Response` 状态 401 和统一错误 JSON。

判定标准：reader 拒绝并包含 `HTTP 401`，不返回 empty，不 mock parser；说明这仍未证明真实
会话。

### 故障注入：1 byte 与零 JavaScript

分别用环境变量把两个预算设为 1，并让脚本读取一个只含 CSS 的临时目录。

判定标准：前者报告超限，后者报告 `no built JavaScript`，都非零退出；恢复真实 dist 和默认
阈值后通过。

## 11. 阶段验收

- [ ] 本课 9 个完整路径与 expected tree 一致，header/marker/owner 唯一。
- [ ] `pnpm test` 执行 3 个测试文件和全部声明测试。
- [ ] 金额、UTC、分页、重复 ID 与输入不可变都有断言。
- [ ] HTTP 测试执行真实 Response、status、query、credentials、signal 和 parser。
- [ ] abort 与 generation 由不同测试证明。
- [ ] empty、error/recovery 与 dispose 都有确定性状态断言。
- [ ] Playwright 恰好七个产品场景，不使用 route mock 或固定 sleep。
- [ ] preview 固定 4173、`reuseExistingServer: false`、失败保留 trace。
- [ ] 预算递归、拒绝缺失/无 JS、报告 raw/gzip、1 byte 失败。
- [ ] `verify` 的完整顺序和生产缺口可解释。

## 12. 常见问题

**为什么 Playwright 固定单 worker？**

教学 API 持有一个 delayed response。单 worker 让该内存状态隔离；真实系统应给账号和数据按
worker 隔离后再并行。

**预算脚本为什么使用同步 gzip？**

构建后只有少量文件，顺序同步压缩让输出稳定清楚。大型项目可以受控并发，但要保持同一口径。

**E2E 是否要先单独启动 preview？**

不需要。Playwright webServer 从根 `pnpm preview` 启动并在结束时停止，避免遗留未知服务。

**为什么 `test:e2e` 又执行 build 和 budget？**

保证浏览器使用当前源码生成且预算通过的产物。诊断时仍可分别执行独立脚本。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [Vitest Guide](https://vitest.dev/guide/)
- [Vitest Expect API](https://vitest.dev/api/expect.html)
- [Playwright Locators](https://playwright.dev/docs/locators)
- [Playwright Assertions](https://playwright.dev/docs/test-assertions)
- [Playwright Web Server](https://playwright.dev/docs/test-webserver)
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Node.js zlib](https://nodejs.org/api/zlib.html)
- [Vite Build Options](https://vite.dev/config/build-options)

## 我现在能做到什么

我能把领域、HTTP、竞态、构建页和资源预算放到最小充分验证层，用确定性事件和真实失败退出码
发现错误，并让七个用户场景连接当前构建产物，而不会把 mock、preview、Chromium 或本地 gzip
扩大解释成真实后端和生产性能。

## 单元导航

[返回第 07 章入口](../07-engineering-capstone.md) ·
[上一课：领域、页面与本机教学 API](02-capstone-domain-app-teaching-api.md) ·
[下一课：干净环境重建与证据记录](04-clean-room-verification-evidence.md)
