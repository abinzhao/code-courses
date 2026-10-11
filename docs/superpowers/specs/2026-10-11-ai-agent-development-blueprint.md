# 本地优先 AI Agent 开发课程蓝图

> 状态：仅供方向评审，不创建 Agent 教程、模型服务或外部账号资源。
> 默认约束：数据不离端、物理隔离优先、低初期预算；远程 BYOK 是关闭状态的可选模式。

## 培养目标

面向完成 Web 全栈主线、具备 TypeScript、后端、测试、安全和本地部署能力的学习者。完成后应能
交付一个可审计的本地 Agent：模型、工具、状态、记忆、权限、评测和可观测性边界清晰；失败可
重放；写操作需要确认；任何远程模型调用都可被完全关闭。

能力结果：

- 区分确定性 workflow、受限 Agent 和开放循环；
- 用结构化 schema 定义模型输出和工具输入/输出；
- 在本地模型、BYOK provider 和工具实现之间建立可替换 adapter；
- 设计会话状态、长期记忆、来源、保留和删除；
- 防止 prompt injection、越权工具调用、秘密泄露和无限循环；
- 建立离线评测集、回归、人工审批和成本/延迟预算；
- 用 trace 解释一次决策，而不是只展示最终回答。

## 前置知识

- TypeScript strict、运行时 parser、状态机和异步取消；
- Node/Nest、SQLite 或 PostgreSQL、HTTP、进程和文件权限；
- 对象授权、最小权限、CSRF/SSRF、日志脱敏和秘密管理；
- 单测、集成、E2E、性能、发布与恢复；
- 能在个人机器运行本地模型；硬件不足时允许小模型或规则 fixture，但不能伪造质量结论。

## 技术选型

| 层 | 选项 | 取舍 | 默认 |
|---|---|---|---|
| 模型运行 | 本地 OpenAI-compatible runtime、Ollama、llama.cpp | 本地满足数据不离端；能力受硬件/模型限制 | 本地 runtime |
| 远程模型 | 各 provider BYOK | 能力更强，但数据离端、成本和合规边界变化 | 默认关闭 |
| 编排 | 自写循环、LangGraph、provider Agent SDK | LangGraph 提供状态图、持久执行和 human-in-the-loop；开放 Agent 自主性更高、风险也更大。[cite:1][cite:2] | LangGraph JS 的显式状态图 |
| 工具协议 | 进程内 typed tool、MCP | MCP 统一 host/client/server 与能力协商，仍需独立授权。[cite:3] | 进程内优先，MCP 作边界 |
| 状态/记忆 | 内存、SQLite、向量索引 | SQLite 易备份和删除；向量检索需额外来源/召回评测 | SQLite + 可选本地索引 |
| 可观测性 | 自定义 JSON、OpenTelemetry | OTel 有 GenAI 语义约定，但内容字段需默认关闭/脱敏。[cite:5] | 本地 OTel/JSON |

### 推荐默认

采用 **TypeScript + LangGraph JS + 本地模型 runtime + SQLite + MCP TypeScript SDK**：

- 核心业务用显式图和有限状态，不使用无界 while-agent；
- ToolNode 一类工具执行节点提供并行、错误和状态注入能力，但每个工具仍由本应用做 schema、授权和
  审批。[cite:1]
- 本地模型支持 tool calling 时仍必须解析和验证模型给出的参数；模型决定“想调用什么”，应用决定
  “是否允许调用”。[cite:4]
- MCP 只用于进程/产品边界，不把 server 名称当可信身份；
- 远程 BYOK profile 与本地 profile 使用不同配置根、数据库、日志和网络开关。

## 隐私与物理隔离

默认 profile：

```text
network egress: denied
model endpoint: loopback only
tools: local allowlist
storage: reader-owned local directory
telemetry export: disabled
prompt/content logging: disabled
```

远程 BYOK profile 必须显式创建，展示即将发送的内容、provider、模型、保留策略和预计成本。启用
前执行脱敏；不得从本地 profile 自动继承秘密、记忆或附件。物理隔离要求不同 OS 用户/容器/虚拟机
时，应把隔离环境、挂载、网络和销毁动作写入验收，而不是只设一个布尔变量。

## 模块结构

1. LLM 基础、token、上下文、结构化输出和不确定性；
2. 本地模型运行、模型清单、硬件、量化和能力探针；
3. Provider adapter、BYOK、重试、速率、成本和取消；
4. Workflow/Agent 边界、状态图、停止条件和恢复；
5. Tool schema、注册、结果 parser、超时和幂等；
6. MCP host/client/server、能力发现、信任和版本；
7. 会话、checkpoint、短期状态和长期记忆；
8. 检索、来源、引用、召回与删除；
9. Prompt injection、数据外泄、SSRF、代码执行和审批；
10. 离线评测集、判定器、回归、人工评分和红队；
11. Trace、指标、日志、成本、隐私和保留；
12. 本地 UI/API、任务进度、取消、失败恢复；
13. 打包、备份、恢复、升级和模型回滚；
14. Capstone 与独立工具接入。

## 连续项目

“私有资料与任务 Agent”：

- 索引用户明确选择的本地 Markdown/PDF 文本；
- 回答必须给出本地来源和片段位置；
- 提供只读搜索、摘要和任务拆解工具；
- 文件写入、Shell、网络或外部通知均默认禁用；
- 启用写工具时先预览计划、目标和 diff，再由用户确认；
- 每轮记录状态转移、模型/工具耗时、错误和终止原因；
- 支持断点恢复、取消、记忆删除和本地备份恢复；
- 可选 BYOK 只处理用户明确勾选的脱敏内容。

项目不以“像人聊天”为完成条件，而以可重复任务、来源正确率、工具安全和失败恢复验收。

## 评测与证据

- 固定本地评测集：正常、空文档、矛盾来源、恶意内容和越权请求；
- 结构化结果 schema 通过率、来源命中、拒答和工具选择；
- 所有写工具的允许/拒绝/确认/取消矩阵；
- prompt injection 不得改变系统权限或读取未授权文件；
- 最大步数、token、时间、工具并发和重试预算；
- 模型/提示/工具版本、随机性参数和 fixture hash；
- trace 中不保存默认 prompt、附件、密钥和完整工具结果；
- 备份恢复后记忆数量、来源、索引和删除标记一致；
- 本地模型结果不外推到远程模型，反之亦然。

## 验收标准

- 无网络环境完成至少一条端到端任务；
- 状态图有明确终止、取消、失败和恢复路径；
- 模型输出和工具参数均从 `unknown` 解析；
- 工具使用最小权限，写操作必须审批且可预览；
- 本地/远程 profile 数据、日志、秘密和网络物理分离；
- 回答来源可追踪，矛盾来源不会被静默合并；
- 评测能稳定抓住删除授权、放宽 schema 和无限循环错误；
- trace 能解释模型、工具、状态和耗时而不泄露内容；
- SQLite/索引/配置完成备份、恢复与版本回滚；
- 未验证模型、硬件、provider 和外部工具明确列为缺口。

## 复用关系

| Web 能力 | Agent 复用 | 新增边界 |
|---|---|---|
| TypeScript/runtime parser | 消息、tool call、schema | 非确定性模型输出 |
| 状态机/并发 | graph、取消、幂等 | 多步 checkpoint |
| 后端授权 | 工具 ACL、对象范围 | 模型不是可信 actor |
| 数据库/队列 | 状态、任务、outbox | 记忆与向量索引 |
| 工程化测试 | fixture、回归、CI | eval 与人工 judge |
| 可观测性 | trace/metric/log | 内容隐私和模型成本 |
| 全栈交付 | 本地 UI/API、恢复 | 模型包与 provider adapter |

## 建议周数

建议 **16 周，每周 18–22 小时**：

- 1–2：LLM、本地 runtime、结构化输出；
- 3–4：provider adapter、状态图；
- 5–6：工具与 MCP；
- 7–8：checkpoint、记忆、检索；
- 9–10：安全、审批和隔离；
- 11–12：评测、红队、可观测性；
- 13：本地 UI/API 与任务恢复；
- 14：备份、升级和回滚；
- 15–16：Capstone、独立工具和答辩。

硬件与模型实验另设弹性周，不降低安全/评测门禁。

## 实施顺序

1. 冻结本地优先、网络、工具、文件和数据范围；
2. 建立模型能力探针与完全离线的结构化回答；
3. 实现确定性单工具 workflow，再引入状态图；
4. 加入 checkpoint、取消、超时、幂等和恢复；
5. 接入只读 MCP server，完成能力/授权验证；
6. 建立记忆、来源、删除和备份；
7. 建立 injection/越权/泄漏测试与人工审批；
8. 建立离线 eval、trace 和预算；
9. 最后才评审远程 BYOK profile；
10. 四类独立复审通过后再编写教程计划。

## 风险与决策门

- 小模型工具调用不稳定时，退回结构化 workflow，不用放宽 parser；
- 需要代码执行时使用独立 sandbox 和一次性工作区，不在主进程运行；
- 向量检索必须证明比关键字基线更好，否则保持简单；
- 任何云端模型、遥测、同步和评测服务都改变“数据不离端”结论，需单独批准。

## Sources

- [cite:1] [LangGraph workflows and agents](https://docs.langchain.com/oss/javascript/langgraph/workflows-agents)
- [cite:2] [LangChain open-source JavaScript build overview](https://docs.langchain.com/oss/javascript/build-overview)
- [cite:3] [Model Context Protocol architecture](https://modelcontextprotocol.io/docs/learn/architecture)
- [cite:4] [Ollama tool calling](https://docs.ollama.com/capabilities/tool-calling)
- [cite:5] [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/)
