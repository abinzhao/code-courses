# Provider 契约与本地 Profile：替换模型，不替换安全边界

## 任务卡

- **任务**：建立真实 Ollama adapter 和明确标记的 fixture adapter。
- **产出**：`labs/ag03a/provider.ts`、`labs/ag03a/provider.test.ts`。
- **运行**：README 环境，依赖第 02 章完整 probe 与 inventory 文件。
- **证据**：2 项测试；远程 profile 在创建 adapter 前拒绝。
- **边界**：BYOK 仅讲隔离设计，不实现、不调用远程 API，不读取秘密。
- **唯一 ID**：`AG-03A`。

## 1. 任务背景

直接把 fetch 写在 graph 节点里会耦合 provider 协议、业务状态和错误处理。
如果本地失败后自动切到云，用户以为资料没有离端，实际边界已改变。
adapter 应返回统一的文本与 usage，profile 决定能否创建连接。

## 2. 学习目标

定义统一输入输出；保留未知 usage；区分 fixture 与 local-model 证据；
确保远程开关不能仅靠一个环境变量悄悄生效。

## 3. 预备知识

接口、依赖注入、AbortSignal。先完成[本地 Chat 探针](../02-local-runtime/02-local-chat-capability-probe.md)。
独立运行要提取 inventory、probe，本篇不是把旧文件手工粘入同一目录。

<a id="ag-03a-s4"></a>
## 4. 核心理论

### 4.1 Adapter 只解决协议替换

模型选择、endpoint、输出格式和 usage 是协议层。工具权限、引用集合、审批不属于 provider。
统一接口让同一业务测试运行 fixture，但每次结果必须保留 mode，避免将 fixture 与模型
统计混在同一个通过率中。adapter 不应将异常转成一条貌似合理的答案。

### 4.2 本地 Profile 的拒绝优先

配置 parser 在网络调用前拒绝 remote；不读取 API key，也不建立连接。
远程 BYOK 若将来单独评审，应有不同 OS 用户/VM、配置根、数据库、日志、附件选择和销毁流程。
即使使用同一种 schema，也不能自动继承本地记忆、秘密或缓存。
本课的 `remote_byok_disabled` 是产品门禁，不是物理隔离验收。

### 4.3 Usage 是测量，不是猜测

Ollama token 计数不存在时保留 undefined。本地 monetary cost 不填写远程价格，
但可记录模型调用数、耗时和设备资源；电费估计需要独立功率证据。

## 5. 契约清单

| 字段 | 所有者 | 规则 |
| --- | --- | --- |
| `text` | 调用者 | 长度受限，非秘密演示文本 |
| `signal` | 任务管理器 | 取消贯穿 fetch |
| `mode` | adapter | fixture / local-model |
| `content` | provider | 后续业务 parser 必查 |
| `inputTokens` | runtime | 可未知，不填零 |

<a id="ag-03a-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag03a/provider.ts`：

<!-- file: labs/ag03a/provider.ts -->
```ts
import { z } from "zod";
import { localEndpoint } from "../ag02a/inventory.js";
import { limitedText } from "../ag02b/probe.js";

export interface Provider {
  generate(text: string, signal: AbortSignal): Promise<{
    mode: "fixture" | "local-model"; content: string;
    inputTokens?: number; outputTokens?: number;
  }>;
}
const Config = z.strictObject({
  mode: z.enum(["fixture", "local"]),
  model: z.string().min(1).max(120).optional(),
});
const Envelope = z.object({
  done: z.literal(true),
  message: z.object({ content: z.string().max(16_000) }),
  prompt_eval_count: z.number().int().nonnegative().optional(),
  eval_count: z.number().int().nonnegative().optional(),
});

export function createProvider(input: unknown, fixtureContent: string): Provider {
  if (input && typeof input === "object" && "mode" in input
      && input.mode === "remote") throw new Error("remote_byok_disabled");
  const config = Config.parse(input);
  return {
    async generate(text, signal) {
      signal.throwIfAborted();
      if (Buffer.byteLength(text) > 8192) throw new Error("input_too_large");
      if (config.mode === "fixture") {
        return { mode: "fixture", content: fixtureContent };
      }
      if (!config.model) throw new Error("select_installed_model");
      const response = await fetch(
        new URL("api/chat", localEndpoint("http://127.0.0.1:11434")), {
          method: "POST", redirect: "error", signal,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model: config.model, stream: false, format: "json",
            messages: [{ role: "user", content: text }],
            options: { temperature: 0, num_predict: 256 } }),
        },
      );
      if (!response.ok) throw new Error(`provider_http_${response.status}`);
      const raw: unknown = JSON.parse(await limitedText(response));
      const value = Envelope.parse(raw);
      signal.throwIfAborted();
      return { mode: "local-model", content: value.message.content,
        inputTokens: value.prompt_eval_count, outputTokens: value.eval_count };
    },
  };
}
```

传入 fixture 内容是测试构造方式，不接受用户控制它来跳过真实模型验收。
本 adapter 只要求 JSON，业务仍要调用第 01 章 parser；下一篇增加单次截止与重试预算。

<a id="ag-03a-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag03a/provider.test.ts`：

<!-- file: labs/ag03a/provider.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createProvider } from "./provider.js";
test("fixture mode is visible and cancellation is enforced", async () => {
  const provider = createProvider({ mode: "fixture" }, '{"status":"abstained"}');
  const signal = new AbortController().signal;
  assert.equal((await provider.generate("fixture question", signal)).mode, "fixture");
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(provider.generate("x", cancelled.signal));
});
test("remote and accidental secret fields are rejected before I/O", () => {
  assert.throws(() => createProvider({ mode: "remote" }, ""), /remote_byok_disabled/);
  assert.throws(() => createProvider({ mode: "local", apiKey: "EXAMPLE_ONLY" }, ""));
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist labs/ag03a/*.ts
node --test dist/ag03a/provider.test.js
```

预期 2 项通过，导入依赖也被编译到 dist；没有网络调用，测试退出即停止。
真实调用由 Capstone 显式选择 local，不因 fixture 通过就自动探测模型。

<a id="ag-03a-s8"></a>
## 8. 错误实验与排查

移除 signal.throwIfAborted，第一项取消分支红灯。恢复后复验。
如失败时 UI 显示“已使用备用云模型”，先停止任务，核对 profile 与调用链；
本课程没有备用云路径，不以兜底能力交换隐私承诺。

## 9. 课后题与答案

1. adapter 是否能授予工具权限？不能，权限属于应用执行器。
2. 相同 schema 能共享本地/远程数据库吗？不能，数据边界独立于结构。
3. fixture usage 为什么空缺？没有真实模型 token 测量。

<a id="ag-03a-s10"></a>
## 10. 三类练习与答案

**基础**：输入超过 8192 字节。答案：generate 拒绝 `input_too_large`，不会调用 fetch。

**进阶**：写 BYOK 评审表。答案：逐项列出 provider、发送预览、保留策略、成本、
不同配置根、DB、日志、OS 隔离与删除证据；本课保持 disabled，不填写假“通过”。

**故障注入**：fixture 返回一个带 shell 意图的 JSON。答案：adapter 可以返回文本，
业务 parser 应拒绝额外动作；协议层不执行该内容。

<a id="ag-03a-s11"></a>
## 11. 阶段验收

- [ ] 2 项测试通过。
- [ ] remote 在 I/O 前被拒绝，配置不接收秘密字段。
- [ ] mode 可追踪，未知 usage 不变为零。
- [ ] 本地失败没有远程 fallback。

## 12. 常见问题

**为什么不接所有 OpenAI-compatible 服务？** 相似协议不等于行为、usage 和取消一致。
先验证一个真实 runtime，新增 provider 必须有自己的契约测试与隔离评审。

## 13. 扩展阅读

[Ollama Chat](https://docs.ollama.com/api/chat)。核对日期 2026-10-12。
远程 BYOK 未实现、未测试；本篇不声称 provider 间质量可比。

## 我现在能做到什么

我能替换模型协议而不改变授权与隐私门禁，并保持 fixture 证据可辨识。

## 单元导航

- 上一单元：[Chat 探针](../02-local-runtime/02-local-chat-capability-probe.md)
- 下一单元：[重试、截止与资源预算](./02-retry-cancellation-budgets.md)
- 本卷入口：[README](../README.md)
