# 独立工具：窄权限接入与最终交付验收

## 任务卡

- **任务**：独立接入一个受控文档搜索工具，不扩大综合应用的网络、文件或写权限。
- **产出**：`labs/ag14b/tool.ts`、`tool.test.ts`，全部源码在本篇；完整应用仍由 AG-14A 的 main 启动。
- **证据**：§7 的 3 项工具测试、综合 17 项测试，以及§11的交付矩阵。
- **边界**：进程内 typed tool 不是 MCP transport；真实 stdio server/client 已在第 06 模块覆盖。
- **唯一 ID**：`AG-14B`。

## 1. 任务背景

综合应用已经能从资料生成回答并审批一条本地提醒。独立接入不是加一个无限能力的
“万能工具”，而是证明读者能在不改 parser、授权、审批或取消语义的前提下接一项能力。

本篇把现有 sourceStore 的单文档查询接入第 05 模块 registry，工具仍叫 `search`：
host 固定 actor，host grant 明确允许的 docIds；模型只能提出 docId/query。
独立测试通过不表示该工具已经成为 AG-14A 的检索节点；AG-14A 仍直接做最多四片段
的关键字检索。本篇的接入验收对象是既有 registry，而不是虚构一个生产 MCP adapter。

## 2. 学习目标

你将能从输入 schema、可信授权、结果 schema、撤回、取消和资源上界验收一个工具；
区别“提出工具参数”和“授予工具权限”；为本地应用交付可重放的测试、数据清理范围、
模式说明和剩余风险，不把 fixture、协议测试或一次 UI 成功扩大成模型质量结论。

## 3. 预备知识

完成 [AG-05A registry](../05-tools/01-tool-registry-schema-authorization.md)、
[AG-06A stdio MCP](../06-mcp/01-stdio-server-client-contract.md)、
[来源库](../08-retrieval/01-source-index-citations.md)、
[AG-14A 应用](./01-private-agent-atomic-application.md)。
采用同一个抽取项目、Node 22.22.0 和精确依赖；不另建依赖框架或修改共享领域。

<a id="ag-14b-s4"></a>
## 4. 核心理论

### 4.1 工具契约不是自然语言描述

| 边界 | 当前契约 | 拒绝内容 |
| --- | --- | --- |
| 输入 | `name=search`、`args.docId/query` 严格对象 | Shell、路径、URL、额外 actor/endpoint |
| 授权 | hostActor 固定，grant.docIds 来自可信 host | 未授予文档、跨 actor |
| 数据 | actor+docId+未撤回条件在 SQL LIMIT 前 | 别人资料、tombstone 来源 |
| 输出 | 最多 5 hits，每项 docId/line/text | 错误 docId、额外字段、过长正文 |
| 取消 | 执行前后检查 signal | 已取消结果、迟到结果 |
| 副作用 | 只读，固定参数化 SQL | 业务 task、文件写、通知和网络请求 |

registry 不信任工具描述，也不信任实现返回值：从 unknown 解析结果，并再次核对每项
docId 属于请求文档。sourceStore 支持 2000 字符行，而 registry 只允许 1000 字符 hit；
长行将被输出 parser 拒绝，不偷偷截断为可能改变语义的结果。若需更长片段，
先明确契约版本和预算，再更新测试，而不是移除结果校验。

### 4.2 在 LIMIT 前收窄范围

先全库检索再在 JS filter 会出现召回饥饿：其他文档占满 LIMIT，授权文档被挤掉。
本例 SQL 同时限制 actor、docId、deleted=0，再排序并 LIMIT 5。
参数化 SQL 固定查询结构，query 不进入 SQL 语法，不从查询词构造文件路径。

工具输出含文本，仍是非可信资料，不等于可执行命令、审批计划或可直接展示的 HTML。
若后续用于回答，必须走 AG-14A 的来源快照和 GroundedSchema 验证，不能用 hits
直接跳到 commit。

### 4.3 Typed tool 和 MCP 的边界

进程内 adapter 最少移动部件，适合本地可信代码。MCP 解决跨进程工具协商与调用，
不自动解决身份、版本、actor、授权、正文保留和写操作确认。
本篇不增加新的 server/client，也不重复实现第 06 模块 transport。
未来移动工具到进程外，应先审查 server 构建/版本和发现结果，再保持同样的
schema/grant/result 校验；不能因用了 MCP 就允许任意发现的工具。

### 4.4 完成看证据，不看展示效果

把证据分为 fixture 控制流、真实 HTTP/SQLite/LangGraph、真实 stdio 协议、
真实本地模型、OS 物理隔离五类。每类只支持本类结论。
fixture 是合法的低资源完成路线，但它没有模型幻觉率、工具选择质量或硬件吞吐证据。
浏览器读到 committed 也不证明磁盘安全擦除或全机无外发。

## 5. 接入地图

`tool.ts` 只做 sourceStore 到 toolRegistry 的桥接，`tool.test.ts` 构造真实 SQLite
数据并调用 registry。输入/输出 schema、授权和结果范围复用 AG-05A；
source tombstone 与 actor 范围复用 AG-08A。不要修改其他模块去迁就工具。

课程产物只有这两个新增源码 owner，主服务入口仍是 `dist/ag14a/main.js`。
公开 fixture 文档没有秘密。HTTP 不提供工具注册或 grant 编辑接口，
模型也不能往 grant.docIds 添加来源。

<a id="ag-14b-s6"></a>
## 6. 最小可运行案例

完整 adapter，固定 hostActor 闭包。可信 host 为本次调用构造 grant，不能直接转发
模型给出的 actor 或文档集合。

<!-- file: labs/ag14b/tool.ts -->
```ts
import { z } from "zod";
import { toolRegistry, type Grant } from "../ag05a/tools.js";
import type { SourceStore } from "../ag08a/sources.js";
export function registerDocumentSearch(store: SourceStore, hostActor: string) {
  z.string().regex(/^[a-z0-9-]{1,40}$/).parse(hostActor);
  const registry = toolRegistry(async (docId, query, signal) => {
    signal.throwIfAborted();
    // Filter in SQL before LIMIT: an ungranted document cannot starve the granted one.
    const rows = store.db.prepare(`SELECT d.id AS docId,c.line,c.text
      FROM chunks c JOIN docs d ON d.actor=c.actor AND d.id=c.doc
      WHERE c.actor=? AND c.doc=? AND d.deleted=0 AND instr(lower(c.text),lower(?))>0
      ORDER BY c.line LIMIT 5`).all(hostActor, docId, query);
    signal.throwIfAborted();
    return { hits: rows };
  });
  return {
    async execute(input: unknown, grant: Grant, signal: AbortSignal) {
      if (grant.actor !== hostActor) throw new Error("actor_denied");
      return registry.execute(input, grant, signal);
    },
  };
}
```

集成示例只说明可信装配位置，不另注册一个 marker owner：

```ts
const registry = registerDocumentSearch(store, "local");
const result = await registry.execute(
  { name: "search", args: { docId: "doc:demo", query: "backup" } },
  { actor: "local", docIds: new Set(["doc:demo"]) },
  controller.signal,
);
```

其中 store 必须由 host 打开，controller 由任务生命周期拥有，grant 由 host 明确授予；
这不是可单独运行的入口。完整可运行用例是下一节测试，完整 UI 入口在上一课。

<a id="ag-14b-s7"></a>
## 7. 集成与运行

完整测试。第一项检查 actor、已授权文档和正常命中；第二项检查输入严格性、
取消和撤回；第三项用真实 registry 检查恶意 adapter 不能扩大结果范围。
它不是“断网测试”，整个工具实现没有网络路径但 OS 外发规则仍需独立验证。

<!-- file: labs/ag14b/tool.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { sourceStore } from "../ag08a/sources.js";
import { registerDocumentSearch } from "./tool.js";
test("reviewed search adapter reaches only the host-granted document and actor", async () => {
  const store = sourceStore(":memory:");
  try {
    store.select({ actor: "local", docId: "doc:demo", text: "backup: retain one closed backup" });
    store.select({ actor: "other", docId: "doc:demo", text: "backup: OTHER_ACTOR_ONLY" });
    store.select({ actor: "local", docId: "doc:hidden", text: "backup: UNGRANTED_ONLY" });
    const registry = registerDocumentSearch(store, "local");
    const grant = { actor: "local", docIds: new Set(["doc:demo"]) };
    const result = await registry.execute({ name: "search", args: {
      docId: "doc:demo", query: "backup",
    } }, grant, new AbortController().signal);
    assert.equal(result.hits.length, 1);
    assert.equal(result.hits[0].text, "backup: retain one closed backup");
    await assert.rejects(registry.execute({ name: "search", args: {
      docId: "doc:demo", query: "backup",
    } }, { ...grant, actor: "other" }, new AbortController().signal), /actor_denied/);
    await assert.rejects(registry.execute({ name: "search", args: {
      docId: "doc:hidden", query: "backup",
    } }, grant, new AbortController().signal), /denied/);
  } finally { store.close(); }
});
test("schema rejects additional actor, endpoint, tool and path; cancellation never yields stale hits", async () => {
  const store = sourceStore(":memory:");
  try {
    store.select({ actor: "local", docId: "doc:demo", text: "backup: public fixture" });
    const registry = registerDocumentSearch(store, "local");
    const grant = { actor: "local", docIds: new Set(["doc:demo"]) };
    for (const call of [
      { name: "shell", args: { docId: "doc:demo", query: "backup" } },
      { name: "search", actor: "other", args: { docId: "doc:demo", query: "backup" } },
      { name: "search", args: { docId: "doc:demo", query: "backup", endpoint: "https://example.invalid" } },
      { name: "search", args: { docId: "../hidden", query: "backup" } },
    ]) await assert.rejects(registry.execute(call, grant, new AbortController().signal));
    const cancelled = new AbortController(); cancelled.abort(new Error("cancelled"));
    await assert.rejects(registry.execute({ name: "search", args: {
      docId: "doc:demo", query: "backup",
    } }, grant, cancelled.signal), /cancelled/);
    store.withdraw("local", "doc:demo");
    const result = await registry.execute({ name: "search", args: {
      docId: "doc:demo", query: "backup",
    } }, grant, new AbortController().signal);
    assert.equal(result.hits.length, 0);
  } finally { store.close(); }
});
test("registry still rejects a malicious adapter output rather than widening the grant", async () => {
  const { toolRegistry } = await import("../ag05a/tools.js");
  const bad = toolRegistry(async () => ({ hits: [{ docId: "doc:hidden", line: 1, text: "backup" }] }));
  await assert.rejects(bad.execute({ name: "search", args: { docId: "doc:demo", query: "backup" } },
    { actor: "local", docIds: new Set(["doc:demo"]) }, new AbortController().signal), /result_scope/);
});
```

从卷 README 抽取最新 Markdown 后，在 Node 22.22.0 的同一依赖项目执行：

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --rootDir labs --outDir dist labs/ag14a/*.ts labs/ag14b/*.ts
node --test --test-timeout=15000 dist/ag14b/tool.test.js
node --test --test-timeout=15000 dist/ag14a/*.test.js dist/ag14b/*.test.js
```

预期工具 3 项、综合 17 项通过。三类红灯已建立：空 host 无法提供持久应用，
空工具不能返回授权命中或拒绝非法输入，空入口不能要求显式配置/读取受限文件。
绿灯不能靠删断言、吞错误或改 schema 放行实现。

运行 AG-14A UI 再走一遍：创建 → 查看来源 → 审批 → committed → 刷新 →
正常停止 → 同根重启 → 使用原 ID 查询。再创建一个任务并拒绝、一个并取消，
它们都不能出现业务 task。记录模式、Node、源码版本、测试命令、服务退出，
不把带正文的页面截图上传外部。

<a id="ag-14b-s8"></a>
## 8. 错误实验与排查

1. 请求 `doc:hidden`，grant 只有 `doc:demo`：必须 tool_denied，不能扩大 grant。
2. adapter 故意返回 `doc:hidden`：必须 result_scope_denied，不能跳过输出 parser。
3. 输入增加 endpoint 或 actor，或 name 改 shell：schema 拒绝，不能解释成新能力。
4. 撤回 doc:demo 后再次调用：hits 为空，不能重建来源覆盖 tombstone。
5. 注释 signal 检查并使用已取消控制器：回归应变红；恢复检查再提取编译。
6. 把 SQL docId 条件移到 JS filter：以未授权文档填满 LIMIT，授权命中可能消失；
   修复到 SQL 范围，不靠提升 LIMIT 掩盖问题。

读取状态或 trace 排查，不记录整个工具 hits/prompt。引用失败应区分“没有命中”
和“输出违反契约”；本课程不提供自然语言自由工具名或可执行代码生成。

## 9. 课后题与答案

1. 工具描述写“安全”能代替授权吗？不能，实际 schema、grant、SQL 和结果校验才有证据。
2. MCP server 宣称支持 search 就可调用吗？不能，还需 host 审查身份、版本和本次范围。
3. 为什么结果中的 docId 要再查一次？恶意或错误 adapter 可能返回其他文档。
4. 为什么不自动重试写工具？响应丢失时提交状态未知，先按 task ID/receipt 查询。
5. fixture 的通过率可写成模型准确率吗？不能，fixture 只验证控制流与安全门禁。

<a id="ag-14b-s10"></a>
## 10. 三类练习与答案

**基础**：给明确授权文档增加一行公开 backup 文本。答案：最多五条 hit，全部属于
该文档和固定 actor；撤回后零条，来源不因搜索自动恢复。

**进阶**：把工具接到回答链。答案：host 固定 grant，保留本次 docId/line/hash 快照，
转换到 GroundedAnswer 候选后校验引用；不直接信任 hits，也不让工具改用户标题。
本题改变 AG-14A 行为，必须新增实际端到端测试，不能把本篇的独立 registry 测试替代它。

**故障注入**：去掉 grant.docIds 检查、改成全 actor 搜索或允许 Shell。答案：原授权/
结果/输入测试必须失败；恢复最小权限实现后，重新提取源码并运行全卷回归。

<a id="ag-14b-s11"></a>
## 11. 阶段验收

| 交付项 | 可重复证据 | 未覆盖时怎么写 |
| --- | --- | --- |
| 主服务 | `main --mode fixture --demo`，固定 loopback UI | 只通过单测不能称完整运行 |
| 来源/回答 | 坏 JSON、未知引用、空/冲突、换版/撤回测试 | 语义质量仍需评测 |
| 审批/写 | digest、期限、拒绝、取消、重复批准、receipt | 不将 click/202 当提交 |
| 状态/恢复 | 真实 SQLite 关闭重开、双线程、同根锁 | crash window 是模拟，不是硬断电 |
| 工具 | 3 项 registry 正反例，actor/docId/取消/撤回 | 不冒充 MCP 调用 |
| 协议 | 第 06 模块真实 stdio 测试 | 不推论本应用 transport |
| 删除 | 单终态 task/checkpoint/trace，保留源和其他线程 | 备份/SSD 残留不在在线删除内 |
| 模型 | 第 02/10 模块实际 model/hash/质量数据 | 未跑则明确未验证 |
| 隔离 | OS/容器外发规则与目标环境测试 | loopback 不等于物理断网 |
| 交付 | 最终 Markdown 提取、固定 Node/依赖、正常退出 | 临时源码通过不能代替最终抽取 |

- [ ] 工具 3 项与综合 17 项通过，无未处理 rejection、无遗留 HTTP 进程。
- [ ] 浏览器状态与业务 receipt 一致，审批后重启不重复写，拒绝/取消路径无业务写入。
- [ ] 源码 owner 唯一，所有 import 有真实文件，启动不下载远端脚本或自动打开远程 profile。
- [ ] 无正文日志，未知 usage 未填 0，真实模型/物理隔离未跑就标明缺口。
- [ ] 正常停止并确认测试端口不再监听，清理仅针对本次专用测试根。

本卷索引与 SELF-CHECK 汇总最终证据；独立评分以本表可重放结果为准，
不把旧测试总数、截图、演示视频或模型的自评作为安全完成依据。

## 12. 常见问题

**工具输出能直接渲染 HTML 吗？** 不能。UI 用 textContent；检索文本仍不可信，
不得注入 DOM、执行脚本或变成工具授权。

**要生成长时间提醒和外部通知吗？** 本例只是一个本地 task 记录，不是调度服务。
时间触发、通知、重试、身份、联网和删除属于新的明确范围，不能藏在 search adapter。

**备份恢复会不会复活已撤回来源？** 可能，除非按第 13 模块删除账本在恢复后回放。
在线删除、备份管理和物理擦除是不同完成标准。

## 13. 扩展阅读

[MCP architecture](https://modelcontextprotocol.io/docs/learn/architecture)、
[LangGraph workflows and agents](https://docs.langchain.com/oss/javascript/langgraph/workflows-agents)、
[SQLite transactions](https://sqlite.org/lang_transaction.html)。
更换模型、工具契约或图版本前，复用 [升级回滚](../13-delivery/02-upgrade-model-rollback.md)
的隔离恢复与回归门禁。

## 我现在能做到什么

我能独立接入并验收一项窄权限只读工具，交付可重放的本地应用证据，
并明确模型质量、协议能力、隐私删除和物理隔离各自支持什么结论。

## 单元导航

- 上一单元：[私有资料原子应用](./01-private-agent-atomic-application.md)
- 下一单元：[全卷复验与剩余缺口](../SELF-CHECK.md)
- 本卷入口：[README](../README.md)
