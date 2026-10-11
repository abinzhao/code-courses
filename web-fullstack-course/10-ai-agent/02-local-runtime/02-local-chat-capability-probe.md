# 本地 Chat 能力探针：格式通过不等于答案可靠

## 任务卡

- **任务**：对已有本地模型发送一个非敏感结构化问题。
- **产出**：`labs/ag02b/probe.ts`、`labs/ag02b/probe.test.ts`。
- **运行**：TypeScript；真实调用需 `AGENT_MODEL` 指向 `ollama list` 已存在项。
- **证据**：2 项协议测试；真实探针记录 schema、耗时、token usage，不保存 prompt。
- **边界**：服务不可用时停止，不切到云；fixture 不证明生成质量。
- **唯一 ID**：`AG-02B`。

## 1. 任务背景

支持 chat 不等于支持结构化输出或工具调用。探针应逐能力测试，并保存成功与失败样本数量。
私有资料项目首先只需要“短问题 → JSON 答案”，不要在首次测试中同时加入检索与审批。

## 2. 学习目标

调用真实 `/api/chat`；处理非流式响应；流式读取但限制总字节；将模型内容解析与响应包络解析分离。

## 3. 预备知识

完成[清单探针](./01-model-inventory-hardware-probe.md)。沿用其中 `localEndpoint()`。
本篇依赖该完整文件；独立运行时同时提取 `labs/ag02a/inventory.ts`。

<a id="ag-02b-s4"></a>
## 4. 核心理论

### 4.1 非流式是最小协议面

Ollama 默认 stream 为 true，本例显式 false，避免把 NDJSON 当单个 JSON。
响应包络有 `message.content` 和统计字段；content 内才是模型生成 JSON。
两层都从 unknown 解析。缺失 usage 不填 0，因为“未知”不等于“未消耗”。

### 4.2 探针需要隔离变量

固定问题、schema、temperature、输出上限、模型 digest。短输入成功之后再探测长上下文、
中文、拒答和工具参数。一次成功不构成 schema 通过率；至少记录总次数与失败类型。
temperature 0 仍不保证跨硬件、runtime、模型版本逐字一致。

### 4.3 输入与输出限额在不同层

请求长度在调用前检查，响应在 reader 每个 chunk 后累计。仅检查 Content-Length 会漏掉
分块编码；读取完后再检查也可能先消耗大量内存。截止信号贯穿 fetch 与 body 读取。
本例限制 64 KiB，取消 reader 后拒绝结果，不保留截断 JSON。

## 5. API 清单

| 项目 | 本例设置 | 原因 |
| --- | --- | --- |
| `stream` | false | 单响应包络 |
| `format` | JSON Schema | 限制形状，不证明事实 |
| `options` | temperature 0、num_predict 128 | 控制实验变量 |
| `redirect` | error | 防止 endpoint 跳转 |
| `keep_alive` | 0 | 探针后卸载，不作为性能优化 |

<a id="ag-02b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag02b/probe.ts`：

<!-- file: labs/ag02b/probe.ts -->
```ts
import { z } from "zod";
import { pathToFileURL } from "node:url";
import { localEndpoint } from "../ag02a/inventory.js";

const Envelope = z.object({
  done: z.literal(true),
  message: z.object({ role: z.literal("assistant"), content: z.string() }),
  prompt_eval_count: z.number().int().nonnegative().optional(),
  eval_count: z.number().int().nonnegative().optional(),
});
const Reply = z.strictObject({ answer: z.literal("4") });
export function parseProbe(input: unknown) {
  const envelope = Envelope.parse(input);
  const content: unknown = JSON.parse(envelope.message.content);
  return { reply: Reply.parse(content), inputTokens: envelope.prompt_eval_count,
    outputTokens: envelope.eval_count };
}
export async function limitedText(response: Response, limit = 65_536) {
  if (!response.body) throw new Error("missing_body");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error("response_too_large");
      }
      chunks.push(part.value);
    }
    return Buffer.concat(chunks).toString("utf8");
  } finally { reader.releaseLock(); }
}
export async function probe(model: string) {
  if (!model || model.length > 120) throw new Error("select_installed_model");
  const start = performance.now();
  const response = await fetch(new URL("api/chat", localEndpoint("http://127.0.0.1:11434")), {
    method: "POST", headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(30_000), redirect: "error",
    body: JSON.stringify({ model, stream: false, keep_alive: 0,
      messages: [{ role: "user", content: "What is 2 + 2? Return JSON with answer as a string." }],
      format: { type: "object", additionalProperties: false, required: ["answer"],
        properties: { answer: { type: "string", enum: ["4"] } } },
      options: { temperature: 0, num_predict: 128 } }),
  });
  if (!response.ok) throw new Error(`model_http_${response.status}`);
  const input: unknown = JSON.parse(await limitedText(response));
  const result = parseProbe(input);
  return { mode: "local-model", schemaPassed: true, elapsedMs: performance.now() - start,
    inputTokens: result.inputTokens, outputTokens: result.outputTokens };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  probe(process.env.AGENT_MODEL ?? "").then(
    (result) => console.log(JSON.stringify(result)),
    () => { console.error("probe_failed_no_cloud_fallback"); process.exitCode = 2; },
  );
}
```

此问题刻意简单，只验证协议链路。enum 强制 “4” 会降低难度，所以不得把它计为数学能力；
质量评测要使用不能被 schema 直接写死答案的测试集。

<a id="ag-02b-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag02b/probe.test.ts`：

<!-- file: labs/ag02b/probe.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProbe, limitedText } from "./probe.js";
test("both response envelope and content are checked", () => {
  assert.equal(parseProbe({ done: true,
    message: { role: "assistant", content: '{"answer":"4"}' } }).reply.answer, "4");
  assert.throws(() => parseProbe({ done: false, message: { content: "{}" } }));
  assert.throws(() => parseProbe({ done: true,
    message: { role: "assistant", content: '{"answer":"5"}' } }));
});
test("body limit also applies without content-length", async () => {
  assert.equal(await limitedText(new Response("abc"), 3), "abc");
  await assert.rejects(limitedText(new Response("abcd"), 3), /response_too_large/);
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist labs/ag02a/inventory.ts labs/ag02b/*.ts
node --test dist/ag02b/probe.test.js
AGENT_MODEL=reader-selected-installed-model node dist/ag02b/probe.js
```

替换最后命令模型名为已核实清单项。前两步预期 2 项通过；真实步骤成功输出 schemaPassed。
30 秒超时或 exit 2 后停止，检查清单、runtime 日志和内存。无常驻进程。

<a id="ag-02b-s8"></a>
## 8. 错误实验与排查

临时把 Reply 中 `"4"` 改成 `"5"`，第一项 fixture 应红灯，说明测试没有直接返回预设成功。
恢复后复验。真实探针如果得到围栏、空 content 或未结束包络，分别记录
`content_json`、`content_schema`、`envelope_schema`，不可全部写为模型质量差。

## 9. 课后题与答案

1. 为什么 stream 必须显式关闭？默认可能是多条 NDJSON，而非单 JSON。
2. enum 答案探针能计入数学得分吗？不能，schema 已经透露了唯一答案。
3. 缺 usage 时能填 0 吗？不能，应标记 unknown。

<a id="ag-02b-s10"></a>
## 10. 三类练习与答案

**基础**：给缺 message 的包络加测试。答案：parseProbe 抛 schema 错误。

**进阶**：建立 10 次格式探针记录。答案：每次保存 digest、参数、schema pass、
延迟与 usage，汇总 `pass / total`；失败也必须进入分母，不保存正文。

**故障注入**：取消 body 字节检查。答案：第二项应失败；恢复累计检查。
不靠大字符串压垮机器，4 字节与 3 字节上限已经能验证规则。

<a id="ag-02b-s11"></a>
## 11. 阶段验收

- [ ] 2 项协议测试通过。
- [ ] 响应包络和模型 content 分开解析。
- [ ] reader 超限会取消，不接收截断 JSON。
- [ ] 本地不可用时没有远程 fallback。
- [ ] 真实模型质量和硬件结果单独标注，不引用 fixture 得分。

## 12. 常见问题

**为什么暂不验证 tool calling？** 第 05 章先建立可授权工具契约，再在第 14 章完整项目
使用结构化工具意图。模型原生 tool calling 可以独立探测，但不改变授权边界。

## 13. 扩展阅读

[Ollama Chat API](https://docs.ollama.com/api/chat)、
[Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs)。
核对日期 2026-10-12，模型名由本机清单选择。

## 我现在能做到什么

我能运行受资源限制的本地协议探针，并解释它证明了什么、没有证明什么。

## 单元导航

- 上一单元：[清单与硬件](./01-model-inventory-hardware-probe.md)
- 下一单元：[Provider 契约与 BYOK 关闭](../03-provider-adapters/01-provider-contract-local-profile.md)
- 本卷入口：[README](../README.md)
