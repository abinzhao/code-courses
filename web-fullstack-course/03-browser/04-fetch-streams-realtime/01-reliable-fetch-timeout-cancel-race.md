# 可靠 Fetch：超时、取消、竞态与有限重试

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个能区分 HTTP 错误、网络错误、超时和主动取消的商品搜索页 |
| 文件 | `browser-lab/server.mjs`、`browser-lab/public/index.html`、`browser-lab/public/main.js` |
| 运行方式 | 在 `browser-lab` 执行 `node server.mjs ./public`，访问 `http://127.0.0.1:3300` |
| 可观察证据 | Network 状态码与耗时、页面状态文本、Console 中的请求序号 |
| 业务约束 | 价格传输为整数分；示例数据公开；读取请求最多重试一次 |
| 证据边界 | 本课只验证本地同源 GET，不证明公网可靠性、写请求幂等性或服务端已停止工作 |
| 建议时间 | 阅读 35 分钟，实验 45 分钟，练习 30 分钟 |

## 1. 任务背景

邻里集市的用户先搜索“自行车”，紧接着搜索“咖啡机”。前一个请求较慢，后一个请求较快。如果页面按响应到达顺序更新，界面会先显示咖啡机，随后又倒退成自行车。网络完成顺序不等于用户意图顺序。

可靠读取需要同时回答五个问题：

1. `fetch()` 成功兑现是否就代表 HTTP 成功？
2. 请求多长时间后应停止等待？
3. 新搜索开始后，旧搜索如何取消？
4. 取消发出后，旧结果还能否写入页面？
5. 哪些失败允许重试，重试预算是多少？

取消和版本检查是两层保护。取消减少无效工作；版本检查保护状态提交。只做其中一个都不完整。

## 2. 学习目标

完成本课后，你能够：

- 解释 Fetch Promise 在网络失败和 HTTP `4xx/5xx` 下的不同结果；
- 在读取完响应体之前保持超时有效，并区分超时与用户取消；
- 用 `AbortController` 取消旧请求，用单调递增版本阻止旧结果提交；
- 只对幂等读取和可恢复状态执行有限重试；
- 验证响应外壳，而不是用 TypeScript 断言替代运行时检查；
- 用固定输入、延迟和状态码留下可复验诊断记录。

## 3. 预备知识

开始前应会：

- 启动 Node.js 脚本并用 `Ctrl+C` 停止；
- 使用 `async` / `await`、`try` / `catch` / `finally`；
- 读取表单事件和更新 DOM；
- 在 DevTools Network 查看请求 URL、状态码、Timing 和 Initiator。

本课沿用[浏览器卷实验契约](../README.md#多文件实验怎样启动)，但提供完整服务文件，便于独立复现。端口被占用时先找到占用进程，不要随意终止不属于本实验的进程。

## 4. 核心理论

### 4.1 Fetch 的完成模型

`fetch(url)` 返回的 Promise 在“已获得响应头”时兑现为 `Response`。服务器返回 `404`、`429` 或 `503` 时，网络交换仍然成功，所以 Promise 通常兑现；调用方必须检查 `response.ok` 或 `response.status`。

Promise 常在以下情况拒绝：

- DNS、连接或 TLS 等网络层无法完成；
- 浏览器因同源/CORS等策略不向脚本暴露响应；
- 关联的 `AbortSignal` 被中止；
- 请求构造本身非法。

因此错误分类顺序是：

```text
Promise 拒绝？
  ├─ signal 已中止 → 超时或主动取消
  └─ 其他 → 网络/策略错误
Promise 兑现？
  ├─ response.ok → 解析并验证响应体
  └─ 非 2xx → HTTP 错误，按状态决定是否重试
```

### 4.2 超时必须覆盖响应体

只在 `await fetch()` 外围设置定时器，然后立刻清理，会漏掉慢响应体。响应头可能已经到达，但 `await response.json()` 仍在等待字节。实验中的定时器直到 JSON 读取和结构验证完成后才清理。

超时不是协议事实，而是调用方预算。500 ms 适合本地故障实验，不代表生产默认值。真实值应来自交互目标、网络分布和服务端 SLO。

### 4.3 取消不是业务回滚

浏览器发出取消后：

- 客户端可以停止读取；
- 服务端可能尚未收到请求，也可能正在处理，甚至已经提交变更；
- 中间代理也可能继续转发。

所以 GET 可以安全地丢弃结果；POST 预约不能仅凭 `AbortError` 断言“预约未发生”。写操作还需要幂等键、唯一约束和权威状态查询。

### 4.4 竞态保护是提交协议

设每次搜索获得版本号 `v`，页面只允许当前最大版本提交：

```text
开始请求：currentVersion = currentVersion + 1
捕获本次：myVersion = currentVersion
响应到达：仅当 myVersion === currentVersion 时写入 UI
```

版本检查必须放在每个可见提交前，包括成功、空结果和错误状态。否则旧请求虽不能覆盖列表，仍可能覆盖“搜索完成”提示。

### 4.5 重试是有预算的策略

本课只对 GET 的 `429/502/503/504` 最多重试一次，并加入短暂退避。`400/401/403/404` 通常不是瞬态故障。用户主动取消不重试。写请求若没有幂等协议，不得套用同一策略。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 本课边界 |
| --- | --- | --- |
| `fetch()` | 发起请求并返回 `Response` | 不因 `4xx/5xx` 自动拒绝 |
| `Response.ok` | 判断状态是否为 `200–299` | 不能代替业务响应验证 |
| `Response.json()` | 消费响应体并解析 JSON | 响应体通常只能消费一次 |
| `AbortController` | 主动触发取消 | 不保证服务端回滚 |
| `AbortSignal.reason` | 记录取消原因 | 旧浏览器可能只给通用 `AbortError` |
| `URLSearchParams` | 结构化构造查询参数 | 避免手工拼接与漏编码 |
| `credentials: "same-origin"` | 同源时携带凭据 | 本实验没有真实会话 |
| `Accept` | 声明期望 JSON | 不强制服务端一定返回 JSON |
| `Retry-After` | 服务端建议稍后重试 | 本实验用固定退避演示 |
| `requestVersion` | 客户端意图序号 | 只在当前页面实例内有效 |

## 6. 最小可运行案例

创建 `browser-lab/public`，按下面路径保存三个完整文件。

### 6.1 `server.mjs`

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(process.argv[2] ?? "./public");
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};
const listings = [
  { id: "listing-1", title: "自行车", priceCents: 28000 },
  { id: "listing-2", title: "咖啡机", priceCents: 19900 },
  { id: "listing-3", title: "阅读台灯", priceCents: 3900 },
];
const flakyAttempts = new Map();

function send(res, status, type, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/api/v1/listings") {
      const q = url.searchParams.get("q") ?? "";
      const requestedDelay = Number(url.searchParams.get("delay"));
      const delay = Number.isFinite(requestedDelay)
        ? Math.max(0, Math.min(requestedDelay, 3000))
        : q.includes("自行车") ? 900 : 100;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
      if (res.destroyed) return;

      if (url.searchParams.get("fail") === "1") {
        send(res, 503, "application/json; charset=utf-8", JSON.stringify({
          code: "LAB_FAILURE",
          message: "本地演示持续失败",
          requestId: "fetch-lab",
        }), { "Retry-After": "1" });
        return;
      }

      if (url.searchParams.get("flaky") === "1") {
        const key = q || "(empty)";
        const attempts = (flakyAttempts.get(key) ?? 0) + 1;
        flakyAttempts.set(key, attempts);
        if (attempts % 2 === 1) {
          send(res, 503, "application/json; charset=utf-8", JSON.stringify({
            code: "TRY_AGAIN",
            message: "第一次请求故意失败",
            requestId: "fetch-lab",
          }));
          return;
        }
      }

      const items = listings.filter((item) => item.title.includes(q));
      send(res, 200, "application/json; charset=utf-8", JSON.stringify({
        items,
        page: 1,
        pageSize: 20,
        total: items.length,
      }));
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, "." + (
      pathname.endsWith("/") ? `${pathname}index.html` : pathname
    ));
    const type = contentTypes[extname(file)];
    if (!file.startsWith(root + sep) || !type) {
      send(res, 404, "text/plain; charset=utf-8", "资源不存在");
      return;
    }
    send(res, 200, type, await readFile(file));
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 400;
    send(res, status, "text/plain; charset=utf-8", "无法读取实验资源");
  }
}).listen(3300, "127.0.0.1", () => {
  console.log(`实验根目录：${root}`);
  console.log("打开 http://127.0.0.1:3300");
});
```

### 6.2 `public/index.html`

```html
<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width">
<title>可靠商品搜索</title>
<main>
  <h1>邻里集市商品搜索</h1>
  <form id="search-form">
    <label for="q">商品名</label>
    <input id="q" name="q" type="search" autocomplete="off">
    <label>
      <input id="flaky" type="checkbox">
      首次返回 503，验证一次重试
    </label>
    <label>
      <input id="fail" type="checkbox">
      持续返回 503
    </label>
    <button type="submit">搜索</button>
    <button id="cancel" type="button">取消当前请求</button>
  </form>
  <p id="status" role="status">尚未搜索</p>
  <ul id="results"></ul>
</main>
<script type="module" src="./main.js"></script>
</html>
```

### 6.3 `public/main.js`

```js
const form = document.querySelector("#search-form");
const input = document.querySelector("#q");
const flaky = document.querySelector("#flaky");
const fail = document.querySelector("#fail");
const cancelButton = document.querySelector("#cancel");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const money = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY",
});

let activeController;
let requestVersion = 0;

class HttpError extends Error {
  constructor(response, body) {
    super(`HTTP ${response.status}：${body?.message ?? "请求失败"}`);
    this.name = "HttpError";
    this.status = response.status;
  }
}

function createDeadline(parentSignal, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new DOMException("请求超时", "TimeoutError"));
  }, timeoutMs);
  const forwardAbort = () => {
    controller.abort(
      parentSignal.reason ?? new DOMException("用户取消", "AbortError"),
    );
  };
  if (parentSignal.aborted) {
    forwardAbort();
  } else {
    parentSignal.addEventListener("abort", forwardAbort, { once: true });
  }
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timeout);
      parentSignal.removeEventListener("abort", forwardAbort);
    },
  };
}

function validateList(data) {
  if (
    typeof data !== "object" ||
    data === null ||
    !Array.isArray(data.items) ||
    !Number.isInteger(data.page) ||
    !Number.isInteger(data.total)
  ) {
    throw new TypeError("列表响应外壳不合法");
  }
  for (const item of data.items) {
    if (
      typeof item?.id !== "string" ||
      typeof item.title !== "string" ||
      !Number.isSafeInteger(item.priceCents) ||
      item.priceCents < 0
    ) {
      throw new TypeError("商品字段不合法");
    }
  }
  return data;
}

async function requestOnce(url, parentSignal) {
  const deadline = createDeadline(parentSignal, 1200);
  try {
    const response = await fetch(url, {
      signal: deadline.signal,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new HttpError(response, body);
    return validateList(body);
  } finally {
    deadline.dispose();
  }
}

async function getListings(params, signal) {
  const url = `/api/v1/listings?${new URLSearchParams(params)}`;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestOnce(url, signal);
    } catch (error) {
      const retryable = (
        error instanceof HttpError &&
        [429, 502, 503, 504].includes(error.status)
      );
      if (!retryable || attempt === 1 || signal.aborted) throw error;
      await new Promise((resolveDelay, rejectDelay) => {
        const timer = setTimeout(resolveDelay, 250);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          rejectDelay(signal.reason);
        }, { once: true });
      });
    }
  }
  throw new Error("不可达分支");
}

function render(items) {
  results.replaceChildren(...items.map((item) => {
    const row = document.createElement("li");
    row.textContent = `${item.title}，${money.format(item.priceCents / 100)}`;
    return row;
  }));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  activeController?.abort(new DOMException("被新搜索替代", "AbortError"));
  const controller = new AbortController();
  activeController = controller;
  const myVersion = ++requestVersion;
  const q = input.value.trim();
  status.textContent = `第 ${myVersion} 次搜索进行中`;
  console.info("开始请求", { myVersion, q });

  try {
    const data = await getListings({
      q,
      flaky: flaky.checked ? "1" : "0",
      fail: fail.checked ? "1" : "0",
    }, controller.signal);
    if (myVersion !== requestVersion) return;
    render(data.items);
    status.textContent = data.total ? `找到 ${data.total} 件` : "没有匹配商品";
  } catch (error) {
    if (myVersion !== requestVersion) return;
    if (controller.signal.aborted) {
      status.textContent = "请求已取消，没有改变现有结果";
    } else if (error?.name === "TimeoutError") {
      status.textContent = "请求超时，请稍后重试";
    } else {
      status.textContent = `搜索失败：${error.message}`;
    }
  } finally {
    if (activeController === controller) activeController = undefined;
  }
});

cancelButton.addEventListener("click", () => {
  activeController?.abort(new DOMException("用户取消", "AbortError"));
});
```

运行：

```bash
cd browser-lab
node server.mjs ./public
```

先搜索“咖啡机”，应看到 `¥199.00`。勾选“首次返回 503”并换一个查询词，应在 Network 看到第一次 `503`、第二次 `200`。勾选持续失败，应在两次 `503` 后显示失败。用 `delay=1500` 的思路把服务默认延迟调大，可复现超时。

## 7. 邻里集市集成案例

集成时不要把实验函数直接扩成“万能请求库”。按业务动作写窄接口：

```js
export async function searchAvailableListings(query, options) {
  return getListings({
    q: query,
    page: "1",
    pageSize: "20",
  }, options.signal);
}
```

页面状态至少区分：

```text
idle → pending → success(empty | populated)
               ↘ failure(network | http | invalid-data | timeout)
pending → canceled（通常不弹错误）
```

商品价格继续以 `priceCents` 整数传输，只在显示边界除以 100。集成真实身份后，前端携带 Cookie 只证明会话可能存在；服务端仍须按当前用户做对象授权。不要在日志中打印 Cookie、Authorization 或私人商品描述。

离线时可以保留最近一次公开搜索快照并明确标注时间，但不能把缓存中的 `available` 当成当前可预约状态。性能上，输入事件应增加防抖或显式提交，避免每个字符都创建无意义请求；是否防抖要用请求量和交互目标验证。

## 8. 常见错误与排查路径

### 错误示例：把兑现当成功

```js
// 错误：503 也会进入 json()，随后被当成正常列表使用。
const data = await fetch("/api/v1/listings?fail=1").then((res) => res.json());
render(data.items);
```

### 错误示例：只取消，不检查版本

```js
// 错误：取消只是请求信号，不是 UI 提交锁。
controller?.abort();
controller = new AbortController();
const data = await getListings({ q }, controller.signal);
render(data.items);
```

### 诊断记录

| 字段 | 记录 |
| --- | --- |
| 现象 | 连续搜索“自行车”和“咖啡机”后，结果偶尔倒退成自行车 |
| 证据 | Network 显示自行车请求耗时约 900 ms，咖啡机约 100 ms；Console 中版本 2 先完成 |
| 原因 | 页面按完成顺序提交结果，没有校验请求是否仍代表最新意图 |
| 修复 | 新请求取消旧控制器，并在所有 UI 提交前比较 `myVersion` 与 `requestVersion` |
| 复验 | 相同输入顺序重复 10 次，最终均为咖啡机；旧请求取消不显示错误 |

排查顺序：

1. Network 中确认请求是否发出、状态和耗时；
2. 查看 Initiator，确认不是重复绑定事件；
3. 检查 `response.ok` 后再看响应体；
4. 检查取消原因和请求版本；
5. 用固定延迟重现，不依赖偶然慢网；
6. 修复后重复相同输入序列。

## 9. 课后题

1. **为什么 `fetch()` 收到 `404` 通常不会进入 `catch`？**
   答：HTTP 交换已成功得到响应；Fetch 只把它表示为 `ok === false` 的 `Response`。
2. **请求取消后，能否断言服务端没有创建预约？**
   答：不能。取消只描述客户端读取状态；写操作要靠幂等键、唯一约束和状态查询确认。
3. **为什么超时定时器要在读取响应体后清理？**
   答：`fetch()` 在响应头到达时即可兑现，响应体仍可能长时间未完成。
4. **为什么版本号不能只在成功分支检查？**
   答：旧请求的错误或空状态也可能覆盖新请求的可见状态。
5. **什么时候不应自动重试？**
   答：用户取消、确定性的客户端错误、无幂等保证的写请求，以及已经耗尽预算时。

## 10. 实践练习

### 基础：补充空结果

搜索“不存在”，让列表清空并显示“没有匹配商品”。

**验收答案：**`results` 没有旧节点；状态文本明确为空；Network 为 `200` 而不是错误。

### 进阶：尊重 `Retry-After`

让服务在 `503` 返回 `Retry-After: 1`，客户端解析整数秒，并把等待限制在 2 秒以内。

**验收答案：**只对允许状态使用该值；非法或过大值回退到本地预算；取消时等待立即结束。

### 故障注入：慢旧请求覆盖

先搜索“自行车”，100 ms 内再搜索“咖啡机”，在 DevTools 保留日志。

**验收答案：**最终只显示咖啡机；自行车请求可显示为 canceled；Console 没有未处理拒绝；连续 10 次结果一致。

## 11. 阶段验收

- [ ] 三个文件可从空目录按命令启动；
- [ ] 正常、空结果、`503`、一次重试、超时和主动取消均有不同可见结果；
- [ ] 连续搜索不会被旧响应覆盖；
- [ ] 响应逐项验证 `id`、`title` 与非负安全整数 `priceCents`；
- [ ] Network 能给出状态码、耗时和请求序号证据；
- [ ] 能说明本地成功不代表公网、跨源、生产会话或写入幂等已验证；
- [ ] 页面不输出凭据和私人数据，缓存状态不冒充权威库存。

## 12. 常见问题

**可以统一把所有失败重试三次吗？**
不可以。重试会放大负载和延迟，并可能重复写入。策略要按方法、状态、幂等能力和总预算决定。

**`AbortSignal.timeout()` 是否更简单？**
支持环境中可以使用。仍要决定超时覆盖哪段工作、如何和用户取消组合，以及怎样向用户区分原因。

**`response.clone()` 能解决响应体只能读取一次吗？**
它允许两个消费者读取，但可能增加缓冲和内存成本。优先只解析一次，并把需要的结构化结果传给后续逻辑。

**TypeScript 的 `as Listing[]` 可以省略验证吗？**
不可以。类型断言不检查网络字节。运行时边界仍需验证。

## 13. 扩展阅读

- [Fetch Standard](https://fetch.spec.whatwg.org/)
- [MDN: Using the Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
- [MDN: AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [HTTP Semantics: Idempotent Methods](https://httpwg.org/specs/rfc9110.html#idempotent.methods)
- [MDN: Retry-After](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Retry-After)

资料快照日期：2026-10-11。兼容性以目标浏览器当日实现和 MDN Browser Compatibility Data 为准；本课未在 Safari、Firefox、真实移动网络或生产代理上复测。

## 我现在能做到什么

我能把商品读取写成可取消、可超时、可分类失败且不会提交旧结果的操作；我也能说明取消、重试和业务幂等之间的边界，并用固定延迟与状态码留下可复验记录。

## 单元导航

[上一课：存储与安全边界](../03-storage-security.md) · [本章入口](../04-fetch-streams-realtime.md) · [下一课：可读流与增量解析](02-readable-stream-incremental-parsing.md)
