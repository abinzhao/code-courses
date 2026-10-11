# MCP stdio Server 与 Client：协议边界不是授权边界

## 任务卡

- **任务**：使用真实 MCP TypeScript SDK 通过 stdio 调用一个只读工具。
- **产出**：`labs/ag06a/server.ts`、`labs/ag06a/client.test.ts`。
- **运行**：SDK `1.32.1`，固定 v1 维护线 API，不套用 v2 包名。
- **证据**：2 项真实子进程协议测试；发现工具、调用、schema 拒绝与关闭。
- **边界**：stdio 没有 TCP 端口，但子进程不是 OS 沙箱；示例数据为非敏感 fixture。
- **唯一 ID**：`AG-06A`。

## 1. 任务背景

进程内工具不能直接复用到独立产品。MCP 统一 host、client、server 与发现调用，
但 server 宣称只读不代表它可信。先通过最小 stdio server 建立协议证据，再加 host 信任配置。

## 2. 学习目标

注册工具与 input/output schema；只向 stdout 写协议；创建 StdioClientTransport；
处理 isError 与 structuredContent；关闭客户端和子进程。

## 3. 预备知识

完成[工具注册](../05-tools/01-tool-registry-schema-authorization.md)。安装本卷固定 SDK。
官方仓库当前区分 v1/v2，本实验明确使用 `@modelcontextprotocol/sdk` v1；
升级必须独立重跑协议契约，不把不同主版本示例混写。

<a id="ag-06a-s4"></a>
## 4. 核心理论

### 4.1 Host、Client、Server 分工

host 是用户应用，决定可启动哪些 server、哪些工具可调用；client 管一个协议连接；
server 提供能力。initialize 协商协议版本与 capabilities，listTools 返回工具说明。
这些是能力发现，不是用户授权。host 要在 callTool 前检查 grant。

### 4.2 stdio 的生命周期

client 启动指定命令，与子进程 stdin/stdout 交换 JSON-RPC。stdout 的普通 console.log
会破坏协议，诊断只用 stderr 且不写敏感内容。关闭 client 时应关闭 transport 和子进程，
不要在测试后留下 server。launch command 必须来自 host 固定配置，不能来自模型。

### 4.3 结果双通道

text content 便于兼容展示，structuredContent 便于业务 parser。outputSchema 由 SDK
辅助校验，但 host 仍解析自己的契约，因为 server 可能变化或恶意。
isError 是工具调用失败，不是可正常展示的成功答案。

## 5. API 清单

| API | 用途 | 安全责任 |
| --- | --- | --- |
| `McpServer.registerTool` | 注册 schema 与 handler | server 输入校验 |
| `StdioServerTransport` | server 协议管道 | stdout 只写协议 |
| `Client.listTools` | 能力发现 | 不自动允许全部工具 |
| `Client.callTool` | 工具调用 | host grant 在调用前 |
| `Client.close` | 生命周期结束 | 必须 finally |

<a id="ag-06a-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag06a/server.ts`：

<!-- file: labs/ag06a/server.ts -->
```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "course-readonly", version: "1.0.0" });
server.registerTool("lookup", {
  description: "Read a selected fixture document; no filesystem or network access.",
  inputSchema: { docId: z.literal("doc:guide") },
  outputSchema: { docId: z.literal("doc:guide"), line: z.number().int().positive(),
    text: z.string().max(1000) },
  annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
}, async () => {
  const result = { docId: "doc:guide" as const, line: 1, text: "Keep a verified local backup." };
  return { content: [{ type: "text", text: JSON.stringify(result) }],
    structuredContent: result };
});
await server.connect(new StdioServerTransport());
```

Server 不访问 filesystem，没有根据 query 拼命令。正式资料工具由 Capstone 使用只读
SQLite 连接提供，host 仍验证授权文档集合。

<a id="ag-06a-s7"></a>
## 7. 真正 Client 集成测试

完整文件 `labs/ag06a/client.test.ts`：

<!-- file: labs/ag06a/client.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";
const Output = z.strictObject({
  docId: z.literal("doc:guide"), line: z.number().int().positive(), text: z.string(),
});
async function connect() {
  const client = new Client({ name: "course-host", version: "1.0.0" });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL("./server.js", import.meta.url))],
    env: { PATH: process.env.PATH ?? "" }, stderr: "pipe",
  });
  await client.connect(transport);
  return client;
}
test("real stdio discovery and structured result", async () => {
  const client = await connect();
  try {
    assert.deepEqual((await client.listTools()).tools.map((tool) => tool.name), ["lookup"]);
    const result = await client.callTool({ name: "lookup", arguments: { docId: "doc:guide" } });
    assert.notEqual(result.isError, true);
    assert.equal(Output.parse(result.structuredContent).line, 1);
  } finally { await client.close(); }
});
test("server schema rejects unselected document", async () => {
  const client = await connect();
  try {
    const result = await client.callTool({ name: "lookup", arguments: { docId: "doc:private" } });
    assert.equal(result.isError, true);
  } finally { await client.close(); }
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag06a labs/ag06a/*.ts
node --test --test-timeout=10000 dist/ag06a/client.test.js
```

预期 2 项通过，finally 关闭协议进程。手动 `node dist/ag06a/server.js` 会等待 stdin，
用 Ctrl+C 停止；日常不要单独启动它，它由 client 管理。

<a id="ag-06a-s8"></a>
## 8. 错误实验与排查

把 outputSchema 的 line 改成 string，而 handler 仍返回 number，调用应失败。
恢复后复验。若发现 `Unexpected token`，先核对 stdout 是否有普通日志、JSON-RPC
消息是否完整，再查输入 schema，不能把 stderr 全部拼进模型上下文。

## 9. 课后题与答案

1. readOnlyHint 能授权吗？不能，是提示而非强制能力。
2. stdio 是否无网络沙箱？不是，子进程仍可外连。
3. listTools 新增工具要自动启用吗？不能，host 需要重新评审 allowlist。

<a id="ag-06a-s10"></a>
## 10. 三类练习与答案

**基础**：测试不存在工具名。答案：调用被拒绝，不调用任何本地 fallback。

**进阶**：增加 host 结果长度上限。答案：Output 对 text.max(1000)，恶意长结果
在进入上下文前拒绝，不能只截断展示层。

**故障注入**：handler 返回 isError true。答案：host 不解析为成功来源，报告工具失败码。

<a id="ag-06a-s11"></a>
## 11. 阶段验收

- [ ] 2 项真实 stdio 测试通过。
- [ ] stdout 仅协议，env 不继承秘密。
- [ ] host 解析 structuredContent，isError 不当成功。
- [ ] 测试结束 client 和子进程退出。
- [ ] 未声称 stdio 已实现物理隔离。

## 12. 常见问题

**为什么固定 v1？** 当前安装与测试的契约是 v1。官方 v2 使用独立 client/server 包，
迁移涉及 API 和协议版本，必须另做升级实验，不在本次教材偷偷换主线。

## 13. 扩展阅读

[MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture)、
[SDK v1 维护线](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x)。
核对日期 2026-10-12；新版能力未验证。

## 我现在能做到什么

我能建立并关闭真实 MCP stdio 连接，区分协议能力、提示元数据和应用授权。

## 单元导航

- 上一单元：[工具幂等](../05-tools/02-tool-idempotency-timeout-commit.md)
- 下一单元：[MCP 信任、发现与版本](./02-host-trust-discovery-versioning.md)
- 本卷入口：[README](../README.md)
