# MCP Host 信任、能力发现与版本漂移

## 任务卡

- **任务**：给固定 server 启动文件和工具清单建立信任快照。
- **产出**：`labs/ag06b/trust.ts`、`labs/ag06b/trust.test.ts`。
- **证据**：2 项测试，文件变化与新工具使连接门禁失败。
- **边界**：hash 是本地批准快照，不是签名、OS 沙箱或依赖供应链完整证明。
- **唯一 ID**：`AG-06B`。

## 1. 任务背景

MCP server 名称可随意声明。把“名字相同”当同一个可信程序，会让替换后的 server
继承旧权限。升级也可能新增写工具，而 host 若自动启用 listTools 全部能力就产生越权。
本篇在启动前核验文件，发现后核验工具名与输入 schema 快照。

## 2. 学习目标

固定启动路径和摘要；对能力列表做 canonical hash；拒绝重复工具名；
处理 tools/list_changed 与升级，不将发现当授权。

## 3. 预备知识

完成[真实 MCP 协议](./01-stdio-server-client-contract.md)。本篇纯函数 tests 验证策略，
与前篇真实 client 结合时，必须先 checkLaunch 再 connect，然后 verifyDiscovery。

<a id="ag-06b-s4"></a>
## 4. 核心理论

### 4.1 名称、版本和内容身份不同

serverInfo.name/version 是远端声明。启动文件 digest 是 host 自己对批准内容计算的证据；
它不覆盖依赖树，因此完整部署还需要 package-lock 和构建产物清单。
绝对路径要由 realpath 核验，模型只能选择 host 已配置的 server ID，不能提供 executable。

### 4.2 能力快照与权限快照分离

能力快照记录工具名与 inputSchema。permissions 是用户批准的 allowlist，可能只是能力子集。
本例要求完整发现清单与批准快照一致，适合小型本地 server。变化时停止任务并重新评审，
不根据工具 description 自动推导权限。description 也是不可信文本，不进入系统角色。

### 4.3 协议版本变化是独立门

SDK initialize 会协商支持版本，但协商成功不代表业务兼容。升级后必须重新跑拒绝矩阵、
结果 parser、取消和关闭测试。v1 到 v2 包与协议都变化，本卷默认不升级。
收到 list_changed 通知时撤销当前能力缓存，重新发现且重新校验；不能静默增加工具。

## 5. 信任清单

| 项目 | 来源 | 失配动作 |
| --- | --- | --- |
| entry realpath | host 固定配置 | 拒绝启动 |
| entry SHA-256 | 批准时计算 | 拒绝启动 |
| tools/schema digest | 已评审清单 | 暂停、重新评审 |
| actor/doc grant | 当前任务 | 每次调用检查 |
| dependency lock | 构建记录 | 升级后重跑契约 |

<a id="ag-06b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag06b/trust.ts`：

<!-- file: labs/ag06b/trust.ts -->
```ts
import { readFile, realpath } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";

const Tool = z.object({ name: z.string().min(1), inputSchema: z.record(z.string(), z.unknown()) });
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) =>
    `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}
export function digest(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex");
}
export function toolsDigest(input: unknown) {
  const tools = z.array(Tool).max(20).parse(input);
  if (new Set(tools.map((tool) => tool.name)).size !== tools.length) {
    throw new Error("duplicate_tool_name");
  }
  return digest(canonical(tools
    .map(({ name, inputSchema }) => ({ name, inputSchema }))
    .sort((a, b) => a.name.localeCompare(b.name))));
}
export async function checkLaunch(entry: string, approvedPath: string, approvedHash: string) {
  if (await realpath(entry) !== approvedPath) throw new Error("launch_path_changed");
  if (digest(await readFile(entry)) !== approvedHash) throw new Error("launch_content_changed");
}
export function verifyDiscovery(input: unknown, approvedToolsDigest: string) {
  if (toolsDigest(input) !== approvedToolsDigest) throw new Error("capability_changed");
}
```

输入为 SDK 已反序列化 JSON，canonical 不用于任意带循环对象；host 需在协议层限制消息规模。
源码注解不作可信身份，批准摘要应来自读者实际审查过的构建文件。

<a id="ag-06b-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag06b/trust.test.ts`：

<!-- file: labs/ag06b/trust.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkLaunch, digest, toolsDigest, verifyDiscovery } from "./trust.js";
test("launch content cannot inherit trust after replacement", async () => {
  const root = await mkdtemp(join(tmpdir(), "agent-trust-"));
  const entry = join(root, "server.mjs");
  try {
    await writeFile(entry, "export const approved = true;\n");
    const approved = await realpath(entry);
    await checkLaunch(entry, approved, digest("export const approved = true;\n"));
    await writeFile(entry, "export const approved = false;\n");
    await assert.rejects(checkLaunch(entry, approved,
      digest("export const approved = true;\n")), /launch_content_changed/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("discovery is canonical but additions require approval", () => {
  const baseline = [{ name: "lookup", inputSchema: { type: "object", properties: {} } }];
  const approved = toolsDigest(baseline);
  verifyDiscovery([{ name: "lookup", inputSchema: { properties: {}, type: "object" } }], approved);
  assert.throws(() => verifyDiscovery([...baseline,
    { name: "write", inputSchema: {} }], approved), /capability_changed/);
  assert.throws(() => toolsDigest([...baseline, ...baseline]), /duplicate_tool_name/);
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag06b labs/ag06b/*.ts
node --test dist/ag06b/trust.test.js
```

预期 2 项通过。测试仅改写自己 mkdtemp 的文件并清理，无用户文件修改。
真实 host 把 approvedPath/hash 写在自己专用配置根，不从模型输出读取。

<a id="ag-06b-s8"></a>
## 8. 错误实验与排查

将 verifyDiscovery 改成仅比较工具数量。第二项添加 write 时数量改变仍能拦住，
所以再把 lookup 改名为 write、维持一项，必须红灯。正确修复比较名称与 schema 摘要，
不能只看 count。此实验说明测试也要覆盖同数量替换，不只新增。

## 9. 课后题与答案

1. digest 是签名吗？不是，需可信批准来源；hash 不证明作者身份。
2. 名字和版本相同代表程序相同吗？不代表。
3. list_changed 要怎么办？使缓存失效，重新发现校验，失配暂停。

<a id="ag-06b-s10"></a>
## 10. 三类练习与答案

**基础**：加入同数量工具改名测试。答案：verifyDiscovery 必须报 capability_changed。

**进阶**：审批能力子集。答案：保留完整能力快照，同时独立 allowedNames；
每次调用名必须在子集内，不能由 discovery 自动写 allowlist。

**故障注入**：跳过 checkLaunch，仅相信 serverInfo.version。答案：文件替换测试失效，
恢复 realpath/hash；依赖锁与 OS 网络隔离仍另行验收。

<a id="ag-06b-s11"></a>
## 11. 阶段验收

- [ ] 2 项通过，文件变化与能力变化拒绝。
- [ ] schema 键顺序不同不误报，重复工具名拒绝。
- [ ] 启动命令和 env 不来自模型。
- [ ] 明确 hash 不等于完整供应链和物理隔离证明。

## 12. 常见问题

**stdio 仍要 OAuth 吗？** 此主线是同用户启动的本地进程，不实现远程 OAuth。
若改 Streamable HTTP，就需独立认证、origin、DNS rebinding、网络和协议评审。

## 13. 扩展阅读

[MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture)、
[SDK v1](https://github.com/modelcontextprotocol/typescript-sdk/tree/v1.x)。
协议之外的信任由本地 host 承担。

## 我现在能做到什么

我能在 MCP 程序与能力变化时撤销旧信任，而不是按名字继承权限。

## 单元导航

- 上一单元：[stdio 契约](./01-stdio-server-client-contract.md)
- 下一单元：[SQLite Checkpoint 与恢复](../07-state-memory/01-sqlite-checkpoint-interrupt-resume.md)
- 本卷入口：[README](../README.md)
