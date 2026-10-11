# Vite SSR、序列化与请求隔离：HTML 不能泄漏跨用户状态

## 任务卡

- **任务**：实现安全初始 JSON、可信上游、超时、状态码和每请求状态工厂。
- **产出**：完整 `serialize.ts` 最小实验与 Vite middleware SSR 聚焦接线。
- **运行**：Node.js 24、Vite 8、React 19.3；curl 验证 200/503/404 与 `</script>`。
- **完成证据**：恶意标题不会生成第二个 script，两个请求状态隔离，错误状态不伪装成功。
- **边界**：开发 middleware server 不是生产部署；生产双构建、进程管理和 CDN 未在本课实现。

## 1. 任务背景

React 会转义组件文本，但手工把 `JSON.stringify(initial)` 拼进 `<script>` 是另一条边界。
JSON 字符串中的 `</script>` 会被 HTML parser 当成结束标签，即使 type 是
`application/json`。SSR 还运行在长生命周期 Node 进程，模块级用户状态可能跨请求泄漏。

本课把“可序列化”与“可安全嵌入 HTML”分开，并让每个请求拥有新状态。

## 2. 学习目标

完成后你能：

1. 安全转义嵌入 HTML 的 JSON；
2. 限制 SSR fetch 到可信 API origin；
3. 用超时和 response/schema 检查区分上游失败；
4. 返回真实 200/503/404；
5. 为每个请求创建 store/router/cache 作用域。

## 3. 预备知识

复用上一课 `InitialData` 与 App。公开列表允许进入 HTML；cookie、CSRF token、密码、私有
User、数据库字段和环境密钥不进入快照。外部 JSON 在 render 前要解析，TypeScript 断言不
是运行时验证。

## 4. 核心理论

### 4.1 HTML 安全编码是独立步骤

`JSON.stringify` 生成 JSON，不理解 HTML parser。至少转义 `<`、U+2028、U+2029；客户端
从 `textContent` 读取后 JSON.parse，语义保持不变。

### 4.2 API origin 是服务器配置，不是请求输入

不能使用用户 Host、query 或任意 URL 决定 SSR fetch，否则可能产生 SSRF。部署配置给出
允许 origin，使用 `new URL("/api/v1/listings", apiOrigin)`，并限制协议/主机。

### 4.3 状态码在发送首字节前决定

上游失败可返回 503 与恢复页面，缺失路由返回 404，空搜索仍是 200。不能所有情况都 200，
也不能把 503 当“没有商品”。

### 4.4 缓存先区分公开与私有

公开列表也需按 q/page/language 建键并考虑更新；含用户数据的 HTML 使用 private/no-store，
不得进入共享 CDN。最简单安全基线是教学 server `Cache-Control: no-store`。

## 5. 元素、属性、API 或配置清单

| API / 配置 | 用途 | 边界 |
| --- | --- | --- |
| `JSON.stringify` | 生成 JSON | 不是 HTML 安全编码 |
| `textContent` | 读取 data script 文本 | 仍需 JSON.parse |
| `replaceAll("<", "\\u003c")` | 阻止 script 提前闭合 | 还需处理 U+2028/U+2029 |
| `AbortSignal.timeout` | 限制上游等待 | 超时不回滚上游事务 |
| `new URL(path, origin)` | 构造可信绝对 URL | origin 不来自用户 |
| `response.ok` | 区分 HTTP 失败 | body 仍需 schema |
| `Cache-Control` | 缓存范围 | 不能补救已泄漏 HTML |
| store factory | 每请求隔离 | 模块级 singleton 不可存用户态 |

## 6. 最小可运行案例

**完整文件：`apps/react-web/ssr-lab/src/serialize.ts`**

```ts
export function serializeForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

const fixture = {
  title: "</script><script>globalThis.injected=true</script>",
  separator: "\u2028",
};
const encoded = serializeForHtml(fixture);

if (encoded.includes("</script>")) throw new Error("unsafe closing tag");
const decoded = JSON.parse(encoded) as typeof fixture;
if (decoded.title !== fixture.title) throw new Error("round trip failed");
console.log(encoded);
```

**命令：在 `apps/react-web/ssr-lab` 执行**

```bash
pnpm exec tsc --strict --target ES2022 --module NodeNext \
  --moduleResolution NodeNext src/serialize.ts
node src/serialize.js
```

预期输出含 `\u003c/script>`，解析后标题仍是原字符串。渐进扩展：把 encoded 放进一个
`application/json` script，用 DOM parser 断言页面仍只有一个 data script。

## 7. 邻里集市集成案例

请求内工厂：

**关键片段：`apps/react-web/ssr-lab/src/entry-server.tsx`**

```tsx
export async function render(requestUrl: string) {
  const requestStore = createFavoriteStore();
  const url = new URL(requestUrl, "http://localhost");
  const q = url.searchParams.get("q") ?? "";
  const initial = await loadPublicListings(q);
  const html = renderToString(
    <FavoriteStoreContext value={requestStore}>
      <App initial={initial} />
    </FavoriteStoreContext>,
  );
  return { html, initial, status: initial.error ? 503 : 200 };
}
```

可信上游：

**关键片段：`apps/react-web/ssr-lab/src/load-public-listings.ts`**

```ts
const apiOrigin = new URL(process.env.API_ORIGIN ?? "http://127.0.0.1:3000");
if (!["http:", "https:"].includes(apiOrigin.protocol)) {
  throw new Error("unsupported API_ORIGIN");
}

export async function loadPublicListings(q: string): Promise<InitialData> {
  const url = new URL("/api/v1/listings", apiOrigin);
  url.searchParams.set("page", "1");
  url.searchParams.set("pageSize", "20");
  url.searchParams.set("q", q);
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { accept: "application/json" },
    });
    if (!response.ok) return { q, items: [], error: `上游 ${response.status}` };
    return parseInitialData(q, await response.json());
  } catch {
    return { q, items: [], error: "商品服务暂不可用" };
  }
}
```

`parseInitialData` 必须检查分页响应和每个 Listing，不可只 `as Page<Listing>`。

Vite server 的关键分支：

```js
const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
if (pathname !== "/") {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("页面不存在");
  return;
}
const result = await render(req.url ?? "/");
const output = template
  .replace("<!--app-html-->", () => result.html)
  .replace("<!--app-data-->", () => serializeForHtml(result.initial));
res.writeHead(result.status, {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
});
res.end(output);
```

函数替换避免 `$&` 等 replacement 字符解释。404 在 render 前返回；503 仍返回可恢复 HTML。

## 8. 常见错误与排查路径

**明确错误示例：**

```js
html.replace("<!--app-data-->", JSON.stringify(initial));
```

标题可闭合 script 并注入新标签。

| 项目 | 记录 |
| --- | --- |
| 现象 | DOM 中出现第二个 script，或初始 JSON 解析失败 |
| 证据 | raw response 含未转义 `</script>` |
| 原因 | 把 JSON 序列化误当 HTML 安全编码 |
| 修复 | 对 `<`、U+2028、U+2029 转义；从 textContent 解析 |
| 复验 | raw HTML 无 literal `</script>` 数据，DOM 只有一个 data script，round-trip 相等 |

若两个请求互相看到收藏，检查模块顶层 store/cache。移入 `render()` 工厂并并行请求复验。

## 9. 课后题

1. React 文本转义为何不保护手工 data script？
2. API origin 为什么不能直接用请求 Host？
3. `response.ok` 通过是否意味着 JSON 是 Listing？
4. q=不存在为何应是 200，而 q=__error 是 503？

答案：

1. 组件文本和手工模板替换是不同输出边界。
2. 用户可控制 Host/URL，可能让服务器访问非预期地址。
3. 不能；外部 JSON 仍需运行时 schema 检查。
4. 前者是成功空结果，后者是数据源失败，恢复语义不同。

## 10. 实践练习

**基础**：序列化含 `</script>`、U+2028、U+2029 的 fixture，验证 round-trip。

**进阶**：并行发两个 q 请求，每个 render 内 store 写不同测试 ID。验收：响应只含自身 ID。

**故障注入**：把 store 移到模块顶层，先复现跨请求污染；恢复每请求工厂后通过。再把上游
延迟超过 5 秒，确认返回 503 恢复页而不是无限等待。

## 11. 阶段验收

- [ ] data script 安全转义且 round-trip 不丢语义。
- [ ] initial JSON 不含 cookie、CSRF、密码、私有用户或密钥。
- [ ] API origin 来自受控配置，协议受限。
- [ ] fetch 有超时、HTTP 检查和运行时解析。
- [ ] 200、empty 200、503、404 可区分。
- [ ] 每请求新建 store/router/cache 作用域。
- [ ] 私有响应不使用公共缓存。
- [ ] 开发 middleware 未描述成生产部署。

## 12. 常见问题

**能用 `<script>window.__DATA__=...</script>` 吗？**

仍需安全编码，并扩大可执行脚本面。`application/json` 配合 textContent 更清晰，但也必须转义。

**JSON 中函数、Map、Error 怎么办？**

转换为明确普通数据结构；不要隐式丢字段后让两端理解不同。

**公开列表可以 CDN 缓存吗？**

可以设计，但要定义 q/page/language/cache key、更新与库存时效；本实验先 no-store。

## 13. 扩展阅读

资料快照：2026-10-11。

- [Vite：Server-Side Rendering](https://vite.dev/guide/ssr)
- [React：Server APIs](https://react.dev/reference/react-dom/server)
- [MDN：The script element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script)
- [MDN：AbortSignal.timeout](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static)
- [OWASP：Server Side Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN：Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)

兼容边界：`AbortSignal.timeout` 需目标 Node 支持；课程基线为 Node 24。反向代理、生产静态
资源、集群缓存和负载测试未在本课执行。

## 我现在能做到什么

我能把公开初始数据安全嵌入 HTML，限制 SSR 上游并返回真实状态码，同时让每个请求拥有
独立状态，避免模块 singleton 泄漏用户数据。

## 单元导航

- 上一单元：[渲染模式与水合契约](./01-rendering-modes-hydration-contract.md)
- 下一单元：[流式、RSC 与综合验收](./03-streaming-rsc-capstone-acceptance.md)
- 分卷目录：[React](../README.md)
