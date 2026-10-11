# AI Agent 的版本、业务与证据基线

核验日期：2026-10-12。运行、依赖、模型质量和物理隔离分开判断；本表不预测未来发布。
正文使用 Node/TypeScript，不安装到教材目录。

## 固定兼容组合

| 项目 | 实际版本或范围 | 责任 |
|---|---|---|
| Node.js | 22.22.0 | 核心实验实际运行；`node:sqlite` 无需额外 flag |
| npm | 10.9.4 | 生成个人锁文件；相同 runtime 下 `npm ci` |
| TypeScript | 5.9.3 | strict、NodeNext，独立于 Web TS7 主线 |
| Node 类型 | 22.19.15 | 覆盖 SQLite/backup，类型不能代替 runtime |
| LangGraph JS | 1.4.21 | 显式图、状态 reducer、interrupt 与 checkpoint |
| SQLite saver | 1.0.4 | 持久图状态；依赖 native SQLite addon |
| MCP TypeScript SDK | 1.32.1 | 当前 stdio server/client；不混用其他主版本示例 |
| Zod | 4.6.6 | 外部输入、模型输出、工具与审批 parser |
| Ollama | 用户实际安装的 runtime 与模型 | 先探针，记录 digest/usage；未固定或自动下载模型 |

完整包清单与个人提取/编译命令见 [README](README.md#环境与独立运行)。
本次核心验证复用了固定依赖；此行为不证明一轮新的干净安装。

### Native addon 与 Node 版本

SQLite saver 的 native addon 必须与当前 Node ABI 一致。本次将 Node22 编译的依赖借给 Node24
曾出现 `ERR_DLOPEN_FAILED`（ABI 127 与 137 不符）；恢复 Node22 后同一正文全部通过。
这是依赖运行环境差异，不用删除 checkpoint 测试或关闭检查处理。

读者换 Node 主版本时，在新的个人项目以该 Node 安装/重建依赖，并重跑所有检查；
不得在多个正在运行的实验共享依赖上直接 rebuild。本卷不宣称全部 Node22 小版本可用：
`node:sqlite`、`backup` 和相关 SDK 均按本次 22.22.0 组合验收。

## 项目与权限

本卷处理明确导入的本地帮助资料和审批后的本地提醒任务，不操作集市商品或预约。
工具输入从 unknown 解析，actor、资料范围、工具版本和写资格由 Host 建立。
MCP server 自报名称、工具描述、资料内容、模型输出与审批摘要都不能替代身份认证。

| 内容 | 默认边界 |
|---|---|
| 模型 | fixture 或固定 loopback 本地模型；无 remote profile |
| 工具 | 窄只读检索与审批后的本地任务；无任意 Shell、URL、文件写或外部通知 |
| 来源 | 用户显式选择后限量导入；原行号、当前 hash、撤回标记与授权范围分别核对 |
| 写入 | 摘要绑定 actor/thread/toolVersion/title/sources/expiry，任务与 receipt 同事务 |
| 恢复 | 图 checkpoint 与业务回执分别查；未知结果不能创建新幂等 key 猜测重做 |
| Trace | 本地状态/耗时/分类，默认不记录 prompt、正文、密钥或原异常 |
| 删除 | 在线派生数据、来源 tombstone、备份账本分别处理，不承诺磁盘安全擦除 |

## 隔离不是一个布尔值

loopback allowlist、无远程工具和关闭遥测限制了本应用的 I/O 范围，不能证明操作系统禁止所有
出网。模型安装下载、依赖安装、其他进程、runtime 插件都可能有独立网络行为。
物理断网、独立 OS 用户/VM、挂载边界、egress 拒绝和销毁需在对应环境另行验收。
本地模型失败不会切到云端；远程 BYOK 需要新的独立数据/配置/审批设计，本卷没有实现。

PDF 需先本地提取成用户可核对的文本；本卷没有 PDF/OCR 或向量 embedding 依赖。
关键字检索是可测基线，向量扩展须比较召回、引用、删除和资源成本，不默认增加框架。

## 验收分层

确定性 fixture 检查 parser、图、预算与故障；MCP 检查真实协议/进程；SQLite 检查真实持久化；
HTTP/UI 检查产品状态和同源边界；真实模型另检查结构化率、引用支持度、拒答和硬件预算。
Token usage 未提供时记为未知，不以字符串长度估出可信 token 或填零。

实际环境与结果查 [SELF-CHECK](SELF-CHECK.md)。真实模型、物理断网、操作系统隔离、
加密备份、SSD 擦除、跨用户生产认证和外部模型服务未由 fixture 结果覆盖。

## 官方依据

- [LangGraph 状态图](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [LangGraph 持久化](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [MCP 架构](https://modelcontextprotocol.io/docs/learn/architecture)
- [Ollama API](https://docs.ollama.com/api/introduction)
- [Node22 SQLite](https://nodejs.org/docs/latest-v22.x/api/sqlite.html)
- [Node22 测试](https://nodejs.org/docs/latest-v22.x/api/test.html)

[卷入口](README.md) · [覆盖矩阵](AGENT-COVERAGE.md) · [实际自检](SELF-CHECK.md)
