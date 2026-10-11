# Vitest 5：集成 HTTP、解析器与请求竞态

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 列表读取客户端、搜索控制器、HTTP 集成测试、确定性竞态测试 |
| 练习目录 | 沿用 `market-engineering-lab/` |
| 固定版本 | Node.js 24.21.0、pnpm 12.11.2、Vitest 5.0.3 |
| 核心命令 | `pnpm test -- tests/integration` 与 `pnpm test` |
| 成功证据 | 新增 2 个测试文件、8 条集成测试通过；全章累计 16 条测试通过 |
| 失败证据 | 删除状态检查或 generation guard 后，目标断言非零退出 |
| 环境标签 | **本机、真实 Web `Response`、注入传输、无真实网络、无真实后端** |

本课不会把 request mock 称为真实服务。注入函数只替代网络传输；真实 `Response`、HTTP
状态分支、JSON 消费、运行时解析器和状态控制器全部执行。身份 Cookie、CORS、服务端日志、
授权和事务仍不在证据范围内。

## 1. 任务背景

纯解析器通过后，页面仍可能在连接处出错：

- 查询词 `台灯 & 书` 被字符串拼接破坏；
- 请求漏传 `credentials: "same-origin"` 或 `AbortSignal`；
- HTTP 500 的错误对象被当作空分页；
- 外部 JSON 未经解析就进入成功状态；
- 旧请求晚完成，覆盖用户已经看到的新结果；
- 页面销毁后仍发布状态。

这些错误横跨请求构造、协议判断、解析器和状态控制，不适合只测一个纯函数。但若测试把
`fetch`、`Response`、解析器和控制器全部 mock 掉，也只剩“某个替身按预设返回”的证据。
合理的集成测试只替换当前环境无法或不应承担的网络传输，保留本层真正需要验证的连接。

异步竞态不能用“等 100 毫秒看看”来证明。机器负载会改变定时器顺序，测试可能偶尔绿、偶尔
红。本课用 deferred promise 让测试代码决定哪个请求先完成，因此结果与电脑速度无关。

## 2. 学习目标

完成本课后，你能够：

1. 用 Node 24 的真实 `Response` 验证 HTTP 成功与失败分支；
2. 用 `URLSearchParams` 保留查询特殊字符并验证实际解码结果；
3. 断言 `credentials` 和同一个 `AbortSignal` 到达请求边界；
4. 保持 JSON 为 `unknown`，调用上一课真实解析器后才返回领域对象；
5. 分别证明“旧请求已取消”和“忽略取消时旧结果仍不能发布”；
6. 用 generation guard、`dispose()` 和 deferred promise 写出确定性竞态测试；
7. 证明当前失败会发布错误，而后续成功可以恢复。

## 3. 预备知识

先完成[上一课](01-vitest-unit-domain-boundaries.md)，并保留这些完整文件：

```text
src/domain/money.ts
src/domain/listing-page.ts
tests/fixtures/listing-page.ts
tests/unit/money.test.ts
tests/unit/listing-page.test.ts
```

在练习根目录检查：

```bash
node -e 'console.log(typeof Response, typeof AbortController)'
pnpm exec vitest --version
mkdir -p src/http src/state tests/integration
```

Node 24 预期输出 `function function`，Vitest 输出 `vitest/5.0.3`。若旧 Node 没有全局
`Response`，应切换到课程固定运行时；本课不额外安装一个行为不同的 HTTP polyfill 来掩盖
环境偏差。

把 `vitest.config.mjs` 完整更新为：

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    restoreMocks: true,
  },
});
```

新增的是 `tests/integration` 发现范围。若只运行指定目录，单元测试不会执行；交付前仍要运行
无路径参数的 `pnpm test`。

## 4. 核心理论

### 4.1 HTTP 成功必须先由状态码决定

`Response.json()` 能成功解析，不表示请求成功。500 响应也可以有合法 JSON；204 响应反而
通常没有 body。读取列表的顺序应是：

```text
发出请求 → 检查 response.ok/status → 消费 JSON 为 unknown
→ 运行时解析 → 核对请求与响应分页 → 返回领域对象
```

本课先检查 `response.ok`，让错误响应不会进入分页解析。统一错误对象的解析属于更完整的 API
错误契约，但不能改变非 2xx 的失败语义。

### 4.2 查询编码应交给结构化 API

直接拼接 `?q=${q}` 会让 `&` 被误解为下一个参数，`#` 可能变成片段。`URLSearchParams`
按查询语法编码；测试再通过 `URL` 解码，确认服务端看到的值仍是 `台灯 & 书`。断言业务解码
结果比硬编码整段百分号文本更稳定，同时可补一条原始 URL 确认真正发生编码。

### 4.3 `credentials` 与 `AbortSignal` 是两个独立协议属性

邻里集市主线使用同源 HttpOnly Cookie，因此读取请求显式使用
`credentials: "same-origin"`。这不证明服务器已经设置安全 Cookie，也不提供 CSRF 或授权。

`AbortSignal` 必须是调用方传入的同一个对象。客户端若新建另一个 signal 或完全漏传，控制器
调用 `abort()` 也不能中止对应等待。取消是本地协作信号，不保证服务器撤销已经完成的操作。

### 4.4 取消与过期保护解决不同故障

`AbortController` 尽量停止旧工作，减少资源消耗；generation guard 决定谁有权发布。读取器
可能忽略 signal，底层操作也可能在取消前已经完成，因此只依赖取消不够：

```text
search A: generation 1 ───────────────┐
search B: generation 2 ───────成功发布│
search A: 晚完成 ─ generation 不匹配 ─┘ 丢弃
```

两种机制要分别断言。只检查 `abort()` 被调用，不能证明旧结果没有显示；只检查最终状态，也
不能证明旧请求获得了取消信号。

### 4.5 `dispose()` 是生命周期边界

页面离开或组件卸载后，不应再发布成功或错误。`dispose()` 要同时：

1. 标记控制器不可再使用；
2. 增加 generation，使在途结果过期；
3. 取消当前 signal；
4. 清除活动控制器引用。

测试在 dispose 后主动完成 promise，才能证明晚到结果被忽略。仅断言 `abort()` 不足以验证
状态发布边界。

### 4.6 Deferred promise 替代任意等待

deferred 把 `resolve` 和 `reject` 暴露给测试。生产代码仍只看到普通 Promise；测试可以按
“新请求成功 → 旧请求成功”精确结算。整个过程不需要 `setTimeout`、`sleep` 或扩大超时。

这种控制不是在模拟真实延迟长度，而是在枚举完成顺序。竞态规则只关心顺序时，它比猜一个
毫秒数更直接。

## 5. 元素、属性、API 或配置清单

| API / 配置 | 本课用法 | 可观察证据 | 边界 |
| --- | --- | --- | --- |
| `Response` | 创建 200、500 和非法 JSON 响应 | `ok`、`status`、`json()` 真实执行 | 没有真实网络栈 |
| `response.ok` | 在读 body 前检查 | 500 直接抛 `HTTP 500` | 不解析统一错误 DTO |
| `URLSearchParams` | 编码 `page/pageSize/q` | `URL.searchParams.get("q")` 保持原值 | 不验证服务器查询实现 |
| `credentials: "same-origin"` | 同源 Cookie 策略 | `RequestInit` 精确断言 | 不证明 Cookie 或认证存在 |
| `AbortController` | 新搜索取消旧 signal | 旧 signal 的 `aborted === true` | 不撤销已完成服务端写入 |
| `AbortSignal` | 透传到 request | 对象身份 `toBe` | 读取器可能忽略它 |
| `unknown` | `response.json()` 的边界类型 | 字符串价格被解析器拒绝 | 类型标注本身不校验 |
| `parseListingPage` | 真实运行时解析 | 返回新领域对象或抛字段错误 | 不提供授权 |
| generation | 单调递增请求编号 | 只有当前编号可发布 | 进程重启后不持久化 |
| `dispose()` | 生命周期结束 | signal 取消且无终态发布 | 不再允许复用控制器 |
| deferred promise | 测试控制完成顺序 | 无固定等待的竞态复现 | 只属于测试夹具 |
| `expect(...).rejects` | 异步错误断言 | Promise 必须被 `await` | 漏 `await` 会丢失完成边界 |

### 5.1 工具版本、命令与文件职责

| 项目 | 固定值或命令 | 文件职责 / 输出 |
| --- | --- | --- |
| Node.js | `24.21.0` | 提供真实 `Response`、`Headers`、`URL` 与 `AbortController` |
| pnpm | `12.11.2` | 从练习工程执行固定脚本 |
| Vitest | `5.0.3` | 在 Node 环境运行异步集成断言 |
| `vitest.config.mjs` | 同时 include `unit` 与 `integration` | 发现本章两层测试 |
| `src/http/read-listing-page.ts` | HTTP 客户端 | 连接查询、状态、body 和解析器 |
| `src/state/search-controller.ts` | 状态控制 | 管理取消、generation、发布和 dispose |
| `tests/fixtures/deferred.ts` | 测试夹具 | 由测试决定 Promise 的完成顺序 |
| `tests/integration/*.test.ts` | 集成证据 | 验证协议连接与竞态状态 |
| 最小集成命令 | `pnpm test -- tests/integration` | 运行 2 个集成文件、8 条测试 |
| 全章命令 | `pnpm test` | 连同上一课运行 4 个文件、16 条测试 |

## 6. 最小可运行案例

### 6.1 列表读取客户端

创建完整文件 `src/http/read-listing-page.ts`：

```ts
import { parseListingPage } from "../domain/listing-page";
import type { ListingPage } from "../domain/listing-page";

export type Request = (url: string, init: RequestInit) => Promise<Response>;

export function createReadListingPage(request: Request = fetch) {
  return async function readListingPage(
    q: string,
    signal: AbortSignal,
  ): Promise<ListingPage> {
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
```

默认 request 是全局 `fetch`，测试注入同签名函数。注入点没有跳过 `Response`、状态分支、
JSON 或解析器。

### 6.2 HTTP 集成测试

创建完整文件 `tests/integration/read-listing-page.test.ts`：

```ts
import { expect, test } from "vitest";
import { createReadListingPage } from "../../src/http/read-listing-page";
import { listingPageFixture } from "../fixtures/listing-page";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

test("encodes query and preserves credentials and AbortSignal", async () => {
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
  expect(page.items[0]?.createdAt).toBe("2026-10-10T08:00:00.000Z");
});

test("rejects HTTP 500 before trying to parse its body as a page", async () => {
  const readPage = createReadListingPage(
    async () => new Response("not a listing page", { status: 500 }),
  );

  await expect(readPage("", new AbortController().signal)).rejects.toThrow(
    "listings HTTP 500",
  );
});

test("keeps JSON unknown until the real parser rejects a string price", async () => {
  const source = listingPageFixture();
  const raw = {
    ...source,
    items: [{ ...source.items[0], priceCents: "1990" }],
  };
  const readPage = createReadListingPage(async () => jsonResponse(raw));

  await expect(readPage("", new AbortController().signal)).rejects.toThrow("priceCents");
});

test("rejects pagination that differs from the request", async () => {
  const responsePage = {
    items: [],
    page: 2,
    pageSize: 20,
    total: 0,
  };
  const readPage = createReadListingPage(async () => jsonResponse(responsePage));

  await expect(readPage("", new AbortController().signal)).rejects.toThrow(
    "pagination differs",
  );
});
```

运行最小集成范围：

```bash
pnpm test -- tests/integration/read-listing-page.test.ts
```

预期 1 个文件、4 条测试通过。第二条响应 body 故意不是分页 JSON；若实现错误地先读或解析
body，失败信息会偏离 `HTTP 500`，从而暴露协议顺序错误。

## 7. 邻里集市集成案例

### 7.1 搜索状态控制器

创建完整文件 `src/state/search-controller.ts`：

```ts
import type { ListingPage } from "../domain/listing-page";

export type SearchState =
  | { phase: "loading"; q: string }
  | { phase: "success"; q: string; page: ListingPage }
  | { phase: "error"; q: string; message: string };

export type ReadPage = (q: string, signal: AbortSignal) => Promise<ListingPage>;

export function createSearchController(
  readPage: ReadPage,
  publish: (state: SearchState) => void,
) {
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
        publish({ phase: "success", q, page });
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

`publish` 是状态出口。测试收集真实状态对象，浏览器课再把它连接到 DOM。控制器不会把取消
当作错误发布，因为旧编号、已取消 signal 或 disposed 状态会先返回。

### 7.2 确定性 deferred 夹具

创建完整文件 `tests/fixtures/deferred.ts`：

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

Promise executor 在构造期间同步执行，所以返回前两个函数已经赋值。这个局部确定性是非空
断言的依据，不应把同样写法用于无法证明初始化顺序的外部状态。

### 7.3 请求竞态测试

创建完整文件 `tests/integration/search-controller.test.ts`：

```ts
import { expect, test } from "vitest";
import type { ListingPage } from "../../src/domain/listing-page";
import { createSearchController } from "../../src/state/search-controller";
import type { SearchState } from "../../src/state/search-controller";
import { deferred } from "../fixtures/deferred";

const emptyPage: ListingPage = {
  items: [],
  page: 1,
  pageSize: 20,
  total: 0,
};

test("aborts the older request when a new search starts", async () => {
  const old = deferred<ListingPage>();
  const fresh = deferred<ListingPage>();
  const signals: AbortSignal[] = [];
  const controller = createSearchController((q, signal) => {
    signals.push(signal);
    return q === "台灯" ? old.promise : fresh.promise;
  }, () => {});

  const first = controller.search("台灯");
  const second = controller.search("书架");
  expect(signals[0]?.aborted).toBe(true);
  expect(signals[1]?.aborted).toBe(false);

  fresh.resolve(emptyPage);
  old.resolve(emptyPage);
  await Promise.all([first, second]);
  controller.dispose();
});

test("blocks an old result even when the injected reader ignores cancellation", async () => {
  const old = deferred<ListingPage>();
  const fresh = deferred<ListingPage>();
  const states: SearchState[] = [];
  const controller = createSearchController(
    (q) => (q === "台灯" ? old.promise : fresh.promise),
    (state) => states.push(state),
  );

  const first = controller.search("台灯");
  const second = controller.search("书架");
  fresh.resolve(emptyPage);
  await second;
  old.resolve(emptyPage);
  await first;

  expect(states.filter((state) => state.phase === "success")).toEqual([
    { phase: "success", q: "书架", page: emptyPage },
  ]);
  controller.dispose();
});

test("dispose aborts active work and prevents every later publication", async () => {
  const pending = deferred<ListingPage>();
  const states: SearchState[] = [];
  let signal: AbortSignal | undefined;
  const controller = createSearchController((_q, currentSignal) => {
    signal = currentSignal;
    return pending.promise;
  }, (state) => states.push(state));

  const search = controller.search("离开页面");
  controller.dispose();
  expect(signal?.aborted).toBe(true);
  pending.resolve(emptyPage);
  await search;

  expect(states).toEqual([{ phase: "loading", q: "离开页面" }]);
  await expect(controller.search("不能复用")).rejects.toThrow("disposed");
});

test("publishes a current error and recovers on the next successful search", async () => {
  const failure = deferred<ListingPage>();
  const recovery = deferred<ListingPage>();
  const states: SearchState[] = [];
  const controller = createSearchController(
    (q) => (q === "fail" ? failure.promise : recovery.promise),
    (state) => states.push(state),
  );

  const first = controller.search("fail");
  failure.reject(new Error("listings HTTP 500"));
  await first;
  expect(states.at(-1)).toEqual({
    phase: "error",
    q: "fail",
    message: "listings HTTP 500",
  });

  const second = controller.search("台灯");
  recovery.resolve(emptyPage);
  await second;
  expect(states.at(-1)).toEqual({
    phase: "success",
    q: "台灯",
    page: emptyPage,
  });
  controller.dispose();
});
```

第一条只证明取消信号；第二条故意让 reader 完全忽略 signal，只靠 generation guard 证明
发布权；第三条专测生命周期；第四条区分当前失败与后续恢复。四种职责没有被一个调用次数断言
混在一起。

执行：

```bash
pnpm test -- tests/integration
pnpm test
```

第一条命令预期 2 个文件、8 条集成测试通过。第二条命令连同上一课共 4 个文件、16 条测试
通过。所有 Promise 都由测试显式结算，没有固定时长等待。

## 8. 常见错误与排查路径

### 8.1 故意错误：删除 HTTP 状态检查

临时删除：

```ts
if (!response.ok) {
  throw new Error(`listings HTTP ${response.status}`);
}
```

执行：

```bash
pnpm test -- tests/integration/read-listing-page.test.ts
```

**五段错误记录**

- **现象：** “500 在解析 body 前失败”的测试不再得到 `listings HTTP 500`，而是 JSON 解析错误。
- **证据：** 真实 `Response` 的 `status` 为 500，但实现继续调用 `response.json()`。
- **原因：** 代码把“body 能否解析”和“HTTP 是否成功”混成同一判断，破坏协议层顺序。
- **修复：** 在消费 body 前恢复 `response.ok/status` 检查，不把 500 改成空分页。
- **复验：** 指定 HTTP 文件 4 条测试转绿，再运行完整 `pnpm test`。

### 8.2 故意错误：移除 generation guard

临时把成功分支改成无条件发布，并同时注释 `active?.abort()`，模拟既不取消也不检查过期：

```ts
const page = await readPage(q, controller.signal);
publish({ phase: "success", q, page });
```

运行旧结果测试，预期成功状态数组同时出现书架和台灯，命令非零退出。恢复取消与 generation
判断后转绿。不要把期望数组改成允许两个成功状态。

### 8.3 忘记 `await expect(...).rejects`

错误写法：

```ts
expect(readPage("", new AbortController().signal)).rejects.toThrow("HTTP 500");
```

缺少 `await` 时测试函数可能先结束。修复为 `await expect(...)`，让 Promise 完成成为测试退出
边界。若项目启用检查未处理 Promise 的类型感知 Lint 规则，它还能提供额外静态证据，但不能
替代运行断言。

### 8.4 捕获所有错误后发布空成功

把 500、JSON 语法错和字段错都转换成 `{ items: [], total: 0 }` 会让页面误报“没有商品”。
测试应分别保留 error 与 empty success。修复错误映射后，检查 500 测试、字符串价格测试和
空分页测试属于不同预期。

### 8.5 Deferred 没有结算

症状是测试超时而非断言失败。检查每个 `search()` 返回的 Promise 是否最终对应
`resolve/reject`，并确保结算后 `await`。修复测试控制流程，不增加任意等待或全局超时来
掩盖未完成的 Promise。

## 9. 课后题

**问题 1：使用真实 `Response` 是否等于使用真实后端？**

参考答案：不等于。它验证标准 Response 的状态和 body 消费语义，但请求函数仍在进程内注入，
没有经过 DNS、网络、服务器中间件、Cookie 存储、认证或数据库。

**问题 2：既然新搜索会 abort，为什么仍要 generation？**

参考答案：读取器可能忽略 signal，操作可能已完成，或者非 fetch 边界不支持取消。generation
独立决定旧结果无权发布。

**问题 3：为什么 500 不能映射为空列表？**

参考答案：空列表是成功业务结果，500 是服务失败。混合后用户无法判断该调整筛选还是重试，
监控也失去错误证据。

**问题 4：`credentials: "same-origin"` 证明了什么？**

参考答案：只证明请求配置允许同源凭据策略；不证明 Cookie 存在、会话有效、CSRF 已防护或
对象授权正确。

## 10. 实践练习

### 基础：增加 401 协议测试

让注入 request 返回真实 `Response`，状态为 401，body 为统一错误 JSON。可判定标准：

- `readPage` 拒绝并包含 `HTTP 401`；
- 不返回空分页；
- 测试没有 mock `parseListingPage`；
- 指定 HTTP 测试文件通过。

### 进阶：让页码成为显式请求参数

把读取函数扩展为接收 `{ q, page, pageSize }`，并核对响应分页与请求一致。可判定标准：

- `URLSearchParams` 中三个值都来自输入；
- 非法请求参数在发送前被拒绝；
- 响应页码不一致时失败；
- 第二页空结果仍可合法；
- 原有 credentials、signal 和 parser 断言保留。

### 故障注入：只移除 disposed 判断

保留 abort 与 generation 的其他逻辑，临时让 `dispose()` 不增加 generation，并让成功分支
忽略 disposed。使用现有 deferred 完成在途请求。可判定标准：

1. dispose 测试先出现不应有的 success 或 error；
2. 恢复生命周期判断；
3. 指定竞态文件与完整 `pnpm test` 都转绿；
4. 记录五段错误证据，不用延长等待时间制造通过。

## 11. 阶段验收

- [ ] Node 环境确认全局 `Response` 与 `AbortController` 可用。
- [ ] HTTP 测试使用真实 `Response`，没有把状态和解析器 mock 成固定成功。
- [ ] 查询 `台灯 & 书` 经结构化编码后能还原原值。
- [ ] `method`、`Accept`、`credentials` 和同一个 signal 有明确断言。
- [ ] 500 在消费分页 body 前失败，字符串价格由真实解析器拒绝。
- [ ] 旧 signal 的取消和旧结果的禁止发布由两条独立测试证明。
- [ ] dispose 后完成 Promise 不产生 success/error，控制器不可复用。
- [ ] 当前错误可见，下一次成功能恢复。
- [ ] 集成范围 8 条测试、全章累计 16 条测试通过。
- [ ] 全部竞态由 deferred 控制，无 `sleep`、`waitForTimeout` 或猜测毫秒数。
- [ ] 能准确说明注入传输不是真实后端。

## 12. 常见问题

**为什么不直接启动一个 HTTP 服务器做 Vitest 集成？**

本课目标是请求构造、Response、解析和控制器连接，进程内注入能提供更快、更确定的证据。
第三课会通过浏览器访问本机 HTTP 教学 API；真实后端契约测试留给后端卷。

**是否应该断言完整百分号 URL？**

通常优先解析 URL 后断言业务值和参数；补充 `%26` 可以证明 `&` 未裸露。把空格究竟编码为
`+` 还是 `%20` 写成唯一业务预期会过度绑定序列化细节。

**为什么 dispose 后选择拒绝新搜索？**

它使生命周期结束不可逆，能暴露卸载后误用。若产品需要复用，应建立新的控制器实例，而不是
悄悄复活已销毁对象。

**AbortError 为什么没有显示给用户？**

旧请求的 signal 已取消或 generation 已过期，控制器在 catch 中先返回。当前真实网络错误仍
进入 error 状态，不会被统一吞掉。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Vitest 异步测试](https://vitest.dev/guide/)：Promise、异步断言和测试完成边界。
- [Vitest Expect API](https://vitest.dev/api/expect.html)：`rejects`、对象身份和数组断言。
- [MDN Response](https://developer.mozilla.org/docs/Web/API/Response)：状态、body 与 JSON 消费。
- [MDN URLSearchParams](https://developer.mozilla.org/docs/Web/API/URLSearchParams)：结构化查询编码。
- [MDN Request.credentials](https://developer.mozilla.org/docs/Web/API/Request/credentials)：凭据模式语义。
- [MDN AbortController](https://developer.mozilla.org/docs/Web/API/AbortController)：取消信号与 fetch 协作。

## 我现在能做到什么

我能用真实 `Response` 连接 HTTP 状态、查询编码、同源凭据、`AbortSignal` 和运行时解析器，
并用 deferred promise 分别证明取消、generation guard、dispose 和恢复行为，不依赖任意等待。

## 单元导航

[本章目录](../README.md#05-单元集成与端到端测试) ·
[上一课：用单元测试锁定领域边界](01-vitest-unit-domain-boundaries.md) ·
[下一课：Playwright 验收生产构建页面](03-playwright-built-page-e2e.md)
