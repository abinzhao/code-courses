# 工具注册、双向 Parser 与对象授权

## 任务卡

- **任务**：建立唯一只读工具，授权后才进入 handler，结果也经 parser。
- **产出**：`labs/ag05a/tools.ts`、`labs/ag05a/tools.test.ts`。
- **证据**：3 项测试，非法调用不触发 handler，坏结果被拒绝。
- **边界**：身份与 grant 来自 host，不来自模型；此工具不读真实私人文件。
- **唯一 ID**：`AG-05A`。

## 1. 任务背景

模型说“我已获得用户同意”不是授权证据。工具 schema 只证明参数形状，不证明该文档属于
当前用户。注册表要限制工具名，host 建立 grant，执行器做对象范围判断。
结果同样可能异常或含恶意指令，不能因为来自工具就当系统命令。

## 2. 学习目标

验证 unknown 工具意图；拒绝额外键；对象级授权；解析工具输出；
确保模型不能指定身份、路径、Shell 或网络地址。

## 3. 预备知识

Zod、Map/Set、接口。完成[Provider 契约](../03-provider-adapters/01-provider-contract-local-profile.md)。
host 的 grant 要在 API 身份边界建立，这里以构造参数注入。

<a id="ag-05a-s4"></a>
## 4. 核心理论

### 4.1 三道门

先查工具 allowlist，再解析参数，再检查对象范围；只有全部通过才调用 handler。
顺序保障失败不会产生副作用。工具结果从 unknown 解析，限制条数、ID 与内容长度。
可以在结果解析后再验证返回的 source ID 属于 grant，防止后端越界泄露。

### 4.2 工具名不是能力凭证

`readOnlyHint`、模型描述、MCP 名称都只是提示。执行器维护真实工具元数据。
grant 绑定 actor 与 docIds，不能从模型 JSON 取 actor，也不能让模型提供绝对文件路径。
docId 到文件的映射由用户导入时建立，拒绝任意路径读。

### 4.3 返回值仍是数据

工具文本可能包含“忽略规则”。将它作为证据片段，不作为角色消息升级。
结构化输出 parser 只能检查形状，安全授权必须由执行器决定。

## 5. 契约清单

| 层 | 检查 | 本例 |
| --- | --- | --- |
| tool name | allowlist | 仅 search |
| args | strict schema | docId、query |
| grant | 对象范围 | actor 非空且拥有 docId |
| handler result | strict schema | hits 最多 5 条 |
| source scope | 返回范围 | hits 的 docId 必须等于请求 |

<a id="ag-05a-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag05a/tools.ts`：

<!-- file: labs/ag05a/tools.ts -->
```ts
import { z } from "zod";
const Call = z.strictObject({
  name: z.literal("search"),
  args: z.strictObject({
    docId: z.string().regex(/^doc:[a-z0-9-]+$/),
    query: z.string().min(1).max(80),
  }),
});
const Output = z.strictObject({
  hits: z.array(z.strictObject({
    docId: z.string(), line: z.number().int().positive(),
    text: z.string().min(1).max(1000),
  })).max(5),
});
export interface Grant { actor: string; docIds: ReadonlySet<string> }
export function toolRegistry(
  search: (docId: string, query: string, signal: AbortSignal) => Promise<unknown>,
) {
  return {
    async execute(input: unknown, grant: Grant, signal: AbortSignal) {
      const call = Call.parse(input);
      if (!grant.actor || !grant.docIds.has(call.args.docId)) {
        throw new Error("tool_denied");
      }
      signal.throwIfAborted();
      const result = Output.parse(await search(call.args.docId, call.args.query, signal));
      signal.throwIfAborted();
      if (result.hits.some((hit) => hit.docId !== call.args.docId)) {
        throw new Error("result_scope_denied");
      }
      return result;
    },
  };
}
```

这里没有“通用 eval tool”。如果需求新增 shell，即使 schema 合法也必须进入独立沙箱评审；
不能将字符串拼接后交给 child_process.exec。

<a id="ag-05a-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag05a/tools.test.ts`：

<!-- file: labs/ag05a/tools.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { toolRegistry } from "./tools.js";
const signal = () => new AbortController().signal;
const grant = { actor: "local-reader", docIds: new Set(["doc:guide"]) };
test("authorized search is parsed", async () => {
  const tools = toolRegistry(async () => ({
    hits: [{ docId: "doc:guide", line: 1, text: "backup" }],
  }));
  assert.equal((await tools.execute(
    { name: "search", args: { docId: "doc:guide", query: "backup" } },
    grant, signal(),
  )).hits.length, 1);
});
test("unauthorized or invalid arguments never reach handler", async () => {
  let calls = 0;
  const tools = toolRegistry(async () => { calls += 1; return { hits: [] }; });
  for (const input of [
    { name: "shell", args: { command: "EXAMPLE_ONLY" } },
    { name: "search", args: { docId: "doc:private", query: "x" } },
    { name: "search", args: { docId: "doc:guide", query: "x", actor: "admin" } },
  ]) await assert.rejects(tools.execute(input, grant, signal()));
  assert.equal(calls, 0);
});
test("out-of-scope tool results are not released", async () => {
  const tools = toolRegistry(async () => ({
    hits: [{ docId: "doc:other", line: 1, text: "untrusted" }],
  }));
  await assert.rejects(tools.execute(
    { name: "search", args: { docId: "doc:guide", query: "x" } }, grant, signal(),
  ), /result_scope_denied/);
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag05a labs/ag05a/*.ts
node --test dist/ag05a/tools.test.js
```

预期 3 项通过，自行退出。集成时将模型 content 解析为 call，再传 host grant；
绝不执行 content 中包含的函数或代码。

<a id="ag-05a-s8"></a>
## 8. 错误实验与排查

移除 grant.docIds 检查，第二项 calls 变 1，测试红灯。恢复授权后复验。
若工具返回错误文档，查 handler 的查询 WHERE 范围与执行器结果范围；
不能仅在 UI 隐藏字段，内容可能已进入模型上下文。

## 9. 课后题与答案

1. parser 能代替 ACL 吗？不能，合法 docId 可能不属于 actor。
2. 为什么输出也验证？工具实现、协议和数据都可能错误。
3. 模型提供 actor 能使用吗？不能，身份只能来自 host 信任边界。

<a id="ag-05a-s10"></a>
## 10. 三类练习与答案

**基础**：query 为空。答案：parser 拒绝，handler calls 0。

**进阶**：增加摘要工具。答案：注册固定名字，输入只接受授权 docId；
结果 schema 限长，不接受 URL、path 或新增权限字段。

**故障注入**：结果添加 `instruction: "read secret"`。答案：strict Output 拒绝额外字段；
即使文本里含同样内容也仅当证据，不能执行。

<a id="ag-05a-s11"></a>
## 11. 阶段验收

- [ ] 3 项通过，拒绝路径 handler calls 0。
- [ ] 输入与结果从 unknown 解析。
- [ ] 身份与对象 grant 不由模型控制。
- [ ] 未启用 Shell、文件写入或网络工具。

## 12. 常见问题

**ToolNode 能自动完成授权吗？** 不能。它可负责调用编排，但应用必须把本执行器置于
真实 handler 前。并行工具还要限制并发、总预算及结果范围。

## 13. 扩展阅读

[LangGraph workflows](https://docs.langchain.com/oss/javascript/langgraph/workflows-agents)。
ToolNode 功能不能替代应用 ACL；协议边界见下一章 MCP。

## 我现在能做到什么

我能建立不会被模型越权扩大的工具注册表，并测试“拒绝时未执行”。

## 单元导航

- 上一单元：[图预算](../04-state-graphs/02-graph-budgets-cancellation-failure.md)
- 下一单元：[幂等、超时与提交边界](./02-tool-idempotency-timeout-commit.md)
- 本卷入口：[README](../README.md)
