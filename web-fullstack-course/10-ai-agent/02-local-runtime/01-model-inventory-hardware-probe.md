# 本地模型清单与硬件探针：先证明运行条件

## 任务卡

- **任务**：读取 loopback Ollama 清单，产出不含正文的运行基线。
- **产出**：`labs/ag02a/inventory.ts`、`labs/ag02a/inventory.test.ts`。
- **运行**：README 固定 TypeScript 环境；真实探针仅访问 `127.0.0.1:11434`。
- **完成证据**：2 项离线测试；真实机器另记录服务版本、模型 digest、大小和运行结果。
- **边界**：不自动安装 runtime、下载模型或访问远程 provider。
- **唯一 ID**：`AG-02A`。

## 1. 任务背景

模型名称不是可复现标识。相同 tag 可指向不同内容；GPU 驱动、量化、上下文参数也会
改变延迟与可用内存。先保存模型 digest 与机器条件，才能解释后续质量回归。
本地优先不意味着“机器上有模型文件就算完成”：服务监听地址与外连行为也需检查。

## 2. 学习目标

核验 endpoint 边界；读取模型清单；区分磁盘大小与推理内存；
为硬件实验定义失败条件，避免 OOM 后盲目重复。

## 3. 预备知识

了解 URL、fetch、超时和[结构化输出](../01-llm-foundations/01-token-context-structured-output.md)。
机器若没有 Ollama，先完成离线 parser 测试，再在读者选定、可信的 runtime 上实施真实实验。
本教程不固定一个未经本机验证的模型名称。

<a id="ag-02a-s4"></a>
## 4. 核心理论

### 4.1 参数量与量化不是内存承诺

权重占用约受参数量与每参数位数影响，但实际内存还包含 KV cache、运行缓冲和框架开销。
上下文越长，KV cache 通常越大；量化减小权重未必同比减小全部内存。
先用短输入、单并发和小输出探测，再逐项扩大，不能同时改模型、量化和上下文。

### 4.2 模型清单是配置证据

记录 tag、digest、文件 size、runtime 版本、OS/内存、实际 generation 参数。
不要把 `details.parameter_size` 解析成精确 GPU 显存需求。不存在的能力应记为
“未探测”，而非根据名字推断 tool calling 支持。

### 4.3 Loopback 是地址门禁，不是物理隔离

只允许固定 IP 与固定端口、拒绝 credentials 和非 HTTP 协议、禁止 redirect，避免
“初始地址本地，最终请求到云”。但本地代理/runtime 仍可能外连；只有 OS 网络策略、
独立用户/虚拟机及断网实测才能证明 egress 被阻断。

## 5. API 与现场清单

| 项目 | 用途 | 记录 |
| --- | --- | --- |
| `GET /api/tags` | 已安装模型 | name、digest、size |
| `GET /api/version` | runtime 版本 | 单独核对，不替代包版本 |
| `AbortSignal.timeout` | 探针截止 | 本例 3 秒 |
| `redirect: "error"` | 禁止跳转 | 不证明 runtime 无外连 |
| `vm_stat` / 活动监视器 | macOS 内存观测 | 不把压缩内存当空闲内存 |

<a id="ag-02a-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag02a/inventory.ts`：

<!-- file: labs/ag02a/inventory.ts -->
```ts
import { z } from "zod";
import { pathToFileURL } from "node:url";

export function localEndpoint(raw: string): URL {
  const url = new URL(raw);
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1"
      || url.port !== "11434" || url.username || url.password
      || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("endpoint_denied");
  }
  return url;
}

export const Inventory = z.object({
  models: z.array(z.object({
    name: z.string().min(1), digest: z.string().min(1),
    size: z.number().int().nonnegative(),
  })).max(100),
});

export async function inventory(endpoint: string) {
  const url = new URL("api/tags", localEndpoint(endpoint));
  const response = await fetch(url, {
    signal: AbortSignal.timeout(3000), redirect: "error",
  });
  if (!response.ok) throw new Error(`runtime_http_${response.status}`);
  const raw = await response.text();
  if (Buffer.byteLength(raw) > 262_144) throw new Error("inventory_too_large");
  const value: unknown = JSON.parse(raw);
  return Inventory.parse(value).models.map(({ name, digest, size }) => ({
    name, digest, diskBytes: size,
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  inventory("http://127.0.0.1:11434").then(
    (models) => console.log(JSON.stringify({ mode: "local", models })),
    () => { console.error("local_runtime_unavailable"); process.exitCode = 2; },
  );
}
```

响应大小检查在读取后实施，仅适用于可信本地 runtime 的小清单；对不可信大流量应像
下一篇一样流式限额。`z.object` 允许官方清单增加元数据，本应用只取固定字段。
这里不是模型动作 schema，不将额外字段带入执行器。

<a id="ag-02a-s7"></a>
## 7. 集成、命令与停止条件

完整文件 `labs/ag02a/inventory.test.ts`：

<!-- file: labs/ag02a/inventory.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { localEndpoint, Inventory } from "./inventory.js";
test("only the selected loopback origin is accepted", () => {
  assert.equal(localEndpoint("http://127.0.0.1:11434").hostname, "127.0.0.1");
  for (const url of ["https://example.com", "http://localhost:11434",
    "http://127.0.0.1:11434@evil.example", "http://127.0.0.1:11434/api/chat"]) {
    assert.throws(() => localEndpoint(url), /endpoint_denied/);
  }
});
test("inventory keeps an exact artifact identity", () => {
  const result = Inventory.parse({ models: [
    { name: "reader-selected", digest: "fixture-digest", size: 1024, details: {} },
  ] });
  assert.equal(result.models[0]?.digest, "fixture-digest");
  assert.throws(() => Inventory.parse({ models: [{ name: "x", size: -1 }] }));
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag02a labs/ag02a/*.ts
node --test dist/ag02a/inventory.test.js
node dist/ag02a/inventory.js
```

前两条预期 2 tests/pass 2。最后一条只有模型服务可用才返回清单；不可用返回
`local_runtime_unavailable`、exit 2，并自行退出。这是硬件缺口，不是离线测试失败。
真实实验先运行 `ollama --version`、`ollama list`，只选择已有模型；不要自动 pull。

<a id="ag-02a-s8"></a>
## 8. 错误实验与排查

把 endpoint 检查改为 `raw.includes("127.0.0.1")`，用户信息段的伪本地 URL 会通过。
endpoint 测试必须红灯。恢复结构化 URL 检查，检查实际 hostname 而非显示字符串。

OOM 时先停止 generation、释放已加载模型、记录输入规模和峰值内存。第二次仍失败
则停止扩大实验，缩小 context/并发或改用读者选定的小模型，不宣称“调低量化即可解决”。

## 9. 课后题与答案

1. tag 与 digest 哪个用于回归身份？digest；tag 便于选择但可变。
2. 磁盘 4 GB 是否等于内存 4 GB？不是，还有 cache 和缓冲。
3. 绑定 loopback 能证明无外连吗？不能，runtime 或工具仍可能访问外部。

<a id="ag-02a-s10"></a>
## 10. 三类练习与答案

**基础**：测试负数 size。答案：Inventory.parse 必须抛错，不能绝对值纠正错误。

**进阶**：制作硬件基线表。答案：逐行记录 OS、内存、runtime、digest、context、
并发、冷启动和热启动耗时；没有测到的字段写“未验证”。

**故障注入**：让本地 fixture 返回 302 到外部 URL。答案：fetch 用 `redirect: "error"`
失败，测试服务器只绑定 loopback，不实际访问外部目标。

<a id="ag-02a-s11"></a>
## 11. 阶段验收

- [ ] 2 项离线测试通过，恶意 URL 被拒绝。
- [ ] 清单记录 digest 而非仅名称。
- [ ] 本地探针成功或明确记录不可用，不混入模型质量计数。
- [ ] 无模型下载、云账户、远程调用或凭据输出。

## 12. 常见问题

**为什么不允许 localhost？** 固定 IP 让课程基线不依赖 DNS/hosts 和 IPv6 选择。
真实产品可显式支持 `::1`，需增加独立测试，不能放开整个地址范围。

**什么时候做无网络验收？** runtime 与模型已安装后，在独立隔离配置中断开 egress，
用相同任务实测。依赖下载期间联网不等于 Agent 运行期间隔离。

## 13. 扩展阅读

[Ollama API](https://docs.ollama.com/api)、
[Ollama FAQ](https://docs.ollama.com/faq)。核对日期 2026-10-12。
具体模型、GPU 与量化效果以读者本机证据为准。

## 我现在能做到什么

我能建立可重现的模型与硬件基线，并明确区分地址限制、服务可用性和物理隔离。

## 单元导航

- 上一单元：[受限循环](../01-llm-foundations/02-bounded-reasoning-uncertainty.md)
- 下一单元：[结构化能力探针](./02-local-chat-capability-probe.md)
- 本卷入口：[README](../README.md)
