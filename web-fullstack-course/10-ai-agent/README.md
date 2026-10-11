# 本地优先 AI Agent：从模型输出到可恢复的受控任务

面向已掌握 TypeScript、HTTP、授权、持久化和测试的学习者。本卷使用本地资料助手持续项目，
按 14 个模块、28 篇教程建立模型、图、工具、MCP、检索、审批、评测、UI 与交付的完整路径。
建议独立安排 16 周、每周 18–22 小时；不压缩原 Web 50 周。

## 目标与业务边界

用户明确选择帮助资料，助手按来源回答或拒答，再经用户审批创建一条本地提醒任务。
模型不决定身份、文件路径或权限；本卷不调用邻里集市商品、收藏、预约写接口。

- 默认 fixture 与本地模型两个模式；远程 BYOK 在 I/O 前拒绝，没有云端兜底。
- 不开放任意 Shell、文件写入、URL 或外部通知工具；本地任务写入有审批、期限与幂等回执。
- 回答从未知字符串解析，来源、行号、当前内容版本及审批摘要分别校验。
- SQLite checkpoint、业务事务回执与 UI 观察是不同事实；重启、取消和响应丢失都需查权威状态。
- 引用正确不代表语义正确；确定性 fixture 不证明模型质量、物理断网或操作系统隔离。
- Markdown 资料在用户选择后限量导入；PDF 需要先在本地提取为文本，本卷不附 PDF 解码器。

共享规则见[项目契约](../00-guide/project-contract.md)；精确兼容组合见[基线](BASELINE.md)，
实际运行范围见[自检](SELF-CHECK.md)。

## 课序与十四模块

| 模块 | 第一篇 | 第二篇 | 可观察成果 |
|---|---|---|---|
| 01 LLM 基础 | [AG-01A Token、上下文与输出](01-llm-foundations/01-token-context-structured-output.md) | [AG-01B 受限推理与不确定性](01-llm-foundations/02-bounded-reasoning-uncertainty.md) | 非法输出拒绝、有限停止与拒答 |
| 02 本地运行 | [AG-02A 模型与硬件探针](02-local-runtime/01-model-inventory-hardware-probe.md) | [AG-02B Chat 能力探针](02-local-runtime/02-local-chat-capability-probe.md) | 已安装模型、格式、usage 与设备限制 |
| 03 Provider | [AG-03A 契约与本地 Profile](03-provider-adapters/01-provider-contract-local-profile.md) | [AG-03B 重试、取消与预算](03-provider-adapters/02-retry-cancellation-budgets.md) | 拒绝远程、有限重试、消费迟到拒绝 |
| 04 状态图 | [AG-04A 显式 LangGraph](04-state-graphs/01-langgraph-explicit-workflow.md) | [AG-04B 图预算、取消与失败](04-state-graphs/02-graph-budgets-cancellation-failure.md) | 状态、条件边、调用上限与终止原因 |
| 05 工具 | [AG-05A 双向 parser 与授权](05-tools/01-tool-registry-schema-authorization.md) | [AG-05B 幂等与提交边界](05-tools/02-tool-idempotency-timeout-commit.md) | 未授权调用拒绝，任务/回执同事务 |
| 06 MCP | [AG-06A stdio Server/Client](06-mcp/01-stdio-server-client-contract.md) | [AG-06B Host 信任与版本](06-mcp/02-host-trust-discovery-versioning.md) | 真实进程边界、能力快照、关闭子进程 |
| 07 状态记忆 | [AG-07A checkpoint 与恢复](07-state-memory/01-sqlite-checkpoint-interrupt-resume.md) | [AG-07B 保留与删除](07-state-memory/02-memory-retention-deletion.md) | 中断恢复、身份范围与撤回 |
| 08 检索 | [AG-08A 来源与版本](08-retrieval/01-source-index-citations.md) | [AG-08B 召回、冲突与引用](08-retrieval/02-recall-conflicts-deletion.md) | 当前行/摘要核对，删除账本阻止复活 |
| 09 安全审批 | [AG-09A 注入与能力边界](09-security/01-injection-capability-boundaries.md) | [AG-09B 摘要与重放](09-security/02-approval-digest-replay.md) | 不可信资料不能提高权限，过期/改版拒绝 |
| 10 评测 | [AG-10A 数据集与判定器](10-evaluation/01-dataset-judges-regression.md) | [AG-10B 红队与突变门禁](10-evaluation/02-redteam-mutation-gates.md) | 固定分母、错误实现使检查变红 |
| 11 可观测性 | [AG-11A 本地 Trace](11-observability/01-local-trace-no-content.md) | [AG-11B 指标与预算](11-observability/02-metrics-budgets-retention.md) | 不记录正文，未知 usage 不填零 |
| 12 本地产品 | [AG-12A HTTP 任务生命周期](12-local-product/01-loopback-api-task-lifecycle.md) | [AG-12B UI、取消与恢复](12-local-product/02-ui-progress-cancel-recovery.md) | 同源写入、进度、失败、刷新及删除 |
| 13 交付 | [AG-13A 备份与删除账本](13-delivery/01-backup-restore-deletion-ledger.md) | [AG-13B 升级与模型回滚](13-delivery/02-upgrade-model-rollback.md) | 新目录恢复、摘要/版本门禁 |
| 14 综合项目 | [AG-14A 原子应用](14-capstone/01-private-agent-atomic-application.md) | [AG-14B 独立工具与验收](14-capstone/02-independent-tool-release-acceptance.md) | 输入到审批/提交/重启恢复，独立修改 |

前 14 周完成机制、失败实验和对应项目增量，最后两周整合、独立工具与答辩。
每篇都包含任务卡、13 节、案例、故障、练习答案、能力总结和相邻导航。
不要把“知道有 MCP/Agent”当作该模块完成。

## 环境与独立运行

实际基线是 Node **22.22.0**、npm **10.9.4** 与 TypeScript **5.9.3**。
使用 `node:sqlite` 和 native SQLite addon：换 Node 主版本时必须在个人项目重新安装依赖，
不能借用另一版本编译的 `node_modules`。完整说明见[版本基线](BASELINE.md)。

在个人新目录建立 `package.json`：

```json
{
  "name": "private-agent-learning",
  "private": true,
  "type": "module",
  "dependencies": {
    "@langchain/langgraph": "1.4.21",
    "@langchain/langgraph-checkpoint-sqlite": "1.0.4",
    "@modelcontextprotocol/sdk": "1.32.1",
    "zod": "4.6.6"
  },
  "devDependencies": {
    "@types/node": "22.19.15",
    "typescript": "5.9.3"
  }
}
```

```bash
node --version
npm --version
npm install
```

首次安装由 npm 生成个人锁文件，复做使用同一 Node 与 `npm ci`。
工具链不使用其他卷的 TS7/TS6 API 组合；不要在教材目录安装或运行。

逐篇创建 `<!-- file: labs/... -->` 后的完整文件，先完成所依赖的前课文件，再执行该篇 §7。
不把理论片段、故意错误或不同项目的同名文件一起覆盖。全量复建使用下列提取器，
保存为个人目录的 `extract.mjs`，传入本卷的真实绝对路径。

```js
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
const course = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("usage: node extract.mjs COURSE_DIRECTORY");
const output = resolve(".");
if (course === output || !relative(course, output).startsWith("..")) {
  throw new Error("use a separate personal output directory");
}
const paths = [];
async function walk(root) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith(".md")) paths.push(path);
  }
}
await walk(course);
const names = new Set();
for (const path of paths.sort()) {
  const text = await readFile(path, "utf8");
  for (const match of text.matchAll(/<!-- file: ([\w./-]+) -->\n```[^\n]*\n([\s\S]*?)\n```/g)) {
    const [, name, body] = match;
    if (!name.startsWith("labs/") || name.includes("..") || names.has(name)) {
      throw new Error(`unsafe or duplicate file: ${name}`);
    }
    names.add(name);
    const target = resolve(output, name);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, body + "\n", { flag: "wx" });
  }
}
if (!names.size) throw new Error("no complete source files found");
console.log(`extracted ${names.size} files; compile and test before starting`);
```

输出目录首次提取前不得存在同名 `labs/` 文件；`wx` 会拒绝覆盖。
更新教程时使用另一空目录并保留原锁文件，不删除已验收源码或数据库来掩盖错误。

全量编译与测试：

```bash
node extract.mjs /absolute/path/to/web-fullstack-course/10-ai-agent
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext \
  --strict --skipLibCheck --rootDir labs --outDir dist \
  $(find labs -name '*.ts' -type f)
node --test --test-timeout=15000 \
  $(find dist -name '*.test.js' -type f) \
  $(find labs -name '*.test.mjs' -type f)
```

命令从个人项目根运行。没有模型时仍可完成 fixture、真实 MCP、SQLite 和 HTTP 机制验收；
运行本地模型先做第 02 模块探针。没有 cloud profile，不提供静默下载模型的命令。
Windows 使用终端的文件枚举能力传相同文件列表，不将 POSIX `find` 写成平台 API 保证。
综合项目的启动、审批、停止、重启和清理命令以 [AG-14A](14-capstone/01-private-agent-atomic-application.md)
的完整入口为准。

## 综合验收与证据

至少演示一条有依据回答、一次无依据拒答、一次不可信资料注入、一次越权拒绝、
审批改版/过期拒绝、取消、重复批准、断点恢复和删除账本重放。
fixture、本地模型、真实工具、HTTP/浏览器、操作系统隔离分别记录。

提交个人 README、锁摘要、图版本、模型或 fixture 标识、测试/评测、脱敏 trace、
审批回执和失败复验。缺少模型、设备或隔离环境时准确注明；不以文本完整替代真实环境验收。

## 查阅与导航

- [逐篇覆盖矩阵](AGENT-COVERAGE.md)：28 个 ID 的六维证据与蓝图对应。
- [版本、领域与隔离基线](BASELINE.md)：SDK、runtime、native addon 与权限边界。
- [实际自检](SELF-CHECK.md)：本次运行结果及尚缺的模型、平台与隔离证据。
- [LangGraph](https://docs.langchain.com/oss/javascript/langgraph/overview)、
  [MCP](https://modelcontextprotocol.io/docs/learn/architecture)、
  [Ollama](https://docs.ollama.com/)：使用前核对当前版本与能力。

[全书目录](../README.md) · [学习路线](../00-guide/learning-path.md) ·
[第一篇](01-llm-foundations/01-token-context-structured-output.md)
