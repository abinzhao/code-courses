# Loopback API：任务生命周期与同源写入边界

## 任务卡

- **任务**：为本地 Agent 定义创建、查询、审批、取消、删除接口。
- **产出**：`labs/ag12a/api.ts`、`labs/ag12a/api.test.ts`。
- **证据**：3 项真实 HTTP 测试，状态解析、Origin/Host、体积与安全错误。
- **边界**：单一 OS 用户本地产品，不是多用户认证服务；同机恶意进程仍在威胁边界外。
- **唯一 ID**：`AG-12A`。

## 1. 任务背景

本地服务也可能被恶意网页诱导请求。监听 loopback 只限制网卡，不能自动防 CSRF、
DNS rebinding 或同机用户访问。本课固定数字 Host，对写请求检查精确 Origin，
不加通配 CORS，不把模型提供的 actor 当身份。

## 2. 学习目标

定义可信 backend 适配；从 unknown 解析请求和响应；限制 body；
固定 loopback/Host/Origin；暴露真实终态；关闭服务与连接。

## 3. 预备知识

Node HTTP、同源策略、取消和 parser。API 只接受 question/title、task ID 与 decision，
不接收文件路径、actor、endpoint 或工具名。身份固定为启动此本地产品的 OS 用户，
Capstone host 内部绑定 actor=local，不提供“传谁读谁”接口。

<a id="ag-12a-s4"></a>
## 4. 核心理论

### 4.1 API 是可信 host 的外部边界

Backend 管图、DB、权限与实际状态；HTTP handler 只解析与路由，不直接操作工具。
创建返回任务 ID 不代表任务完成。查询返回 running/awaiting_approval/completed/
committed/rejected/cancelled/failed，审批 preview 与 digest 可见。
无写入的完成回答和已提交任务分别显示，客户端不能靠按钮点击推断结果。

### 4.2 Host 与 Origin 的职责不同

Host 防 DNS rebinding 指向服务却携带攻击域名；Origin 防浏览器跨站发起写请求。
写请求没有 Origin 也拒绝，CLI 用明确 Origin header。没有 CORS header 不等于服务器
不执行请求，所以必须在读取/执行前拒绝。GET 无 Origin 可供 curl，但错误 Host 拒绝。
同机进程能伪造 Origin，因此这不是身份认证或多用户安全方案。

### 4.3 内容、连接和资源同时限量

stream 逐块限制 body，即使 Content-Length 缺失也不能绕过。严格对象拒绝额外字段。
固定错误响应不含 SQL、stack、secret；客户端保留状态码与 code。
headersTimeout/requestTimeout 不等于模型预算，backend 单独实施模型和审批期限。

## 5. HTTP 契约

| 方法路径 | 用途 | 成功 |
| --- | --- | --- |
| POST `/task` | question、title 创建 | 202 Snapshot |
| GET `/task/:id` | 查询权威状态 | 200 Snapshot |
| POST `/decision` | id、action、digest | 200 Snapshot |
| POST `/cancel` | 取消未提交任务 | 200 Snapshot |
| POST `/delete` | 删除线程/本地任务记录 | 200 deleted |
| GET `/`、`/ui.js` | 同源 UI | 固定内容 |

<a id="ag-12a-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag12a/api.ts`：

<!-- file: labs/ag12a/api.ts -->
```ts
import { createServer, type IncomingMessage } from "node:http";
import { z } from "zod";
import { DecisionSchema } from "../ag09b/approval.js";
export const SnapshotSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,80}$/),
  status: z.enum(["running", "awaiting_approval", "completed", "committed",
    "rejected", "cancelled", "failed"]),
  answer: z.string().max(2000).optional(), preview: z.string().max(4000).optional(),
  digest: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  error: z.enum(["task_failed", "cancelled"]).optional(),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;
export interface Backend {
  start(question: string, title: string): Promise<Snapshot>;
  get(id: string): Promise<Snapshot>;
  decision(id: string, decision: z.infer<typeof DecisionSchema>): Promise<Snapshot>;
  cancel(id: string): Promise<Snapshot>;
  delete(id: string): Promise<void>;
}
const Create = z.strictObject({ question: z.string().trim().min(2).max(80),
  title: z.string().trim().min(1).max(120) });
const Id = z.string().regex(/^[a-z0-9-]{1,80}$/);
const IdBody = z.strictObject({ id: Id });
const Approval = z.strictObject({ id: Id, decision: DecisionSchema });
async function body(request: IncomingMessage): Promise<unknown> {
  if (request.headers["content-type"] !== "application/json") throw new Error("invalid_input");
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const raw of request) {
    const chunk = Buffer.from(raw);
    bytes += chunk.length;
    if (bytes > 8192) throw new Error("body_limit");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
export async function localAPI(backend: Backend, pages = { html: "", js: "" }, port = 0) {
  let origin = "";
  const server = createServer(async (request, response) => {
    const send = (status: number, value: unknown) => {
      response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify(value));
    };
    if (request.headers.host !== new URL(origin).host) { send(403, { code: "host_denied" }); return; }
    if (request.method !== "GET" && request.headers.origin !== origin) {
      send(403, { code: "origin_denied" }); return;
    }
    try {
      const path = new URL(request.url ?? "/", origin).pathname;
      if (request.method === "GET" && (path === "/" || path === "/ui.js")) {
        response.writeHead(200, { "content-type": path === "/" ? "text/html; charset=utf-8"
          : "text/javascript; charset=utf-8", "cache-control": "no-store",
          "content-security-policy": "default-src 'none'; script-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
          "x-content-type-options": "nosniff" });
        response.end(path === "/" ? pages.html : pages.js); return;
      }
      let snapshot: Snapshot;
      let status = 200;
      if (request.method === "POST" && path === "/task") {
        const input = Create.parse(await body(request));
        snapshot = await backend.start(input.question, input.title); status = 202;
      } else if (request.method === "GET" && path.startsWith("/task/")) {
        snapshot = await backend.get(Id.parse(path.slice(6)));
      } else if (request.method === "POST" && path === "/decision") {
        const input = Approval.parse(await body(request));
        snapshot = await backend.decision(input.id, input.decision);
      } else if (request.method === "POST" && (path === "/cancel" || path === "/delete")) {
        const input = IdBody.parse(await body(request));
        if (path === "/delete") { await backend.delete(input.id); send(200, { deleted: true }); return; }
        snapshot = await backend.cancel(input.id);
      } else { send(404, { code: "not_found" }); return; }
      send(status, SnapshotSchema.parse(snapshot));
    } catch (error) {
      const safe = error instanceof z.ZodError || error instanceof SyntaxError
        || (error instanceof Error && ["invalid_input", "body_limit"].includes(error.message));
      send(safe ? 400 : 409, { code: safe ? "invalid_input" : "operation_rejected" });
    }
  });
  server.headersTimeout = 5000;
  server.requestTimeout = 10_000;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject); server.listen(port, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("listen_failed");
  origin = `http://127.0.0.1:${address.port}`;
  return { origin, close: () => new Promise<void>((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve()); server.closeAllConnections();
  }) };
}
```

已知 operation_rejected 用 409 表示本地操作未被接受，未暴露堆栈。
正式服务可细分 404/403/409/500 的有限错误码，本例保守拒绝，不能据此声称完整生产错误体系。

<a id="ag-12a-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag12a/api.test.ts`：

<!-- file: labs/ag12a/api.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { localAPI, SnapshotSchema, type Backend } from "./api.js";
function fixture(): Backend {
  return {
    async start() { return { id: "task-1", status: "running" }; },
    async get() { return { id: "task-1", status: "awaiting_approval", digest: "a".repeat(64) }; },
    async decision() { return { id: "task-1", status: "committed" }; },
    async cancel() { return { id: "task-1", status: "cancelled" }; },
    async delete() {},
  };
}
test("actual HTTP returns parsed task state", async () => {
  const api = await localAPI(fixture());
  try {
    const result = await fetch(`${api.origin}/task`, { method: "POST",
      headers: { origin: api.origin, "content-type": "application/json" },
      body: JSON.stringify({ question: "backup", title: "Make backup" }) });
    assert.equal(result.status, 202);
    assert.equal(SnapshotSchema.parse(await result.json()).status, "running");
    const current = await fetch(`${api.origin}/task/task-1`);
    assert.equal(SnapshotSchema.parse(await current.json()).status, "awaiting_approval");
  } finally { await api.close(); }
});
test("foreign origin, absent origin and rebinding Host cannot invoke writes", async () => {
  let calls = 0;
  const backend = fixture();
  backend.start = async () => { calls++; return { id: "task-1", status: "running" }; };
  const api = await localAPI(backend);
  try {
    for (const origin of ["https://example.invalid", ""]) {
      const result = await fetch(`${api.origin}/task`, { method: "POST",
        headers: { origin, "content-type": "application/json" }, body: "{}" });
      assert.equal(result.status, 403);
    }
    const rebindingStatus = await new Promise<number>((resolve, reject) => {
      const raw = request(api.origin, { headers: { host: "example.invalid" } }, response => {
        response.resume(); response.on("end", () => resolve(response.statusCode!));
      });
      raw.on("error", reject); raw.end();
    });
    assert.equal(rebindingStatus, 403);
    assert.equal(calls, 0);
  } finally { await api.close(); }
});
test("invalid bodies and backend errors do not leak internals", async () => {
  const backend = fixture();
  backend.get = async () => { throw new Error("EXAMPLE_ONLY_SQL_SECRET"); };
  const api = await localAPI(backend);
  try {
    const response = await fetch(`${api.origin}/task/task-1`);
    assert.equal(response.status, 409);
    assert.equal((await response.text()).includes("SECRET"), false);
    const bad = await fetch(`${api.origin}/task`, { method: "POST",
      headers: { origin: api.origin, "content-type": "application/json" },
      body: JSON.stringify({ question: "backup", title: "Task", actor: "bob" }) });
    assert.equal(bad.status, 400);
    const large = await fetch(`${api.origin}/task`, { method: "POST",
      headers: { origin: api.origin, "content-type": "application/json" },
      body: JSON.stringify({ question: "x".repeat(9000) }) });
    assert.equal(large.status, 400);
  } finally { await api.close(); }
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --rootDir labs --outDir dist labs/ag12a/*.ts
node --test dist/ag12a/api.test.js
```

预期 3 项真实 HTTP 测试通过，端口由 OS 随机分配且仅 loopback。finally 关闭服务，
fixture backend 只证明 HTTP 路由，不代表真实图已经执行；Capstone 替换这个适配。

<a id="ag-12a-s8"></a>
## 8. 错误实验与排查

移除 Origin 检查，第二项失败且 calls 不再为零。恢复后复验。
从 localhost 打开会因 Host 拒绝，使用启动输出的精确 `127.0.0.1` origin；
不要改监听为 `0.0.0.0` 来解决地址输入错误。

## 9. 课后题与答案

1. 无 CORS 能阻止写入吗？不能，必须服务器拒绝 Origin。
2. 同机 curl 能伪造 Origin 吗？能，所以不是认证。
3. task 202 代表成功吗？只代表接受任务，后续查询真实状态。
4. 为什么不开放 actor 参数？身份不能由请求或模型自报。

<a id="ag-12a-s10"></a>
## 10. 三类练习与答案

**基础**：POST 不带 content-type。答案：400 invalid_input，不调用 backend。

**进阶**：改为多用户服务。答案：增加可信会话、对象授权、CSRF、用户存储隔离、
HTTPS 与退出撤销，不能只加 actor 字段；这改变本地产品范围，应独立实现验收。

**故障注入**：backend 直接返回任意 status。答案：SnapshotSchema 拒绝，
客户端不将非法状态显示成成功。错误响应保持有限 code，不能返回 error.message。

<a id="ag-12a-s11"></a>
## 11. 阶段验收

- [ ] 3 项通过，真实监听只在 127.0.0.1。
- [ ] Origin/Host、额外字段、体积上限在业务调用前生效。
- [ ] 返回值再次解析，错误不含内部信息。
- [ ] 启动与关闭成对，同机威胁与多用户认证未冒充已解决。

## 12. 常见问题

**能用手机访问吗？** 本课不开放局域网。跨设备访问需要新的认证、TLS、网络与数据边界，
不能直接把地址改为所有网卡。

## 13. 扩展阅读

[Node HTTP](https://nodejs.org/docs/latest-v22.x/api/http.html)、
[Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)。

## 我现在能做到什么

我能把任务操作暴露给同源本地 UI，并明确其不是公网认证服务。

## 单元导航

- 上一单元：[指标预算](../11-observability/02-metrics-budgets-retention.md)
- 下一单元：[UI 进度与恢复](./02-ui-progress-cancel-recovery.md)
- 本卷入口：[README](../README.md)
