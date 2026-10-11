# AI Agent 当前正文与运行证据

核验日期：2026-10-12。正文、fixture、真实 MCP、SQLite、HTTP/UI、真实模型与隔离分别统计。
教材只保存 Markdown，实验、依赖、锁文件、数据库和日志在个人工作区或 `/tmp`。

## 课程与提取口径

14 模块、28 篇详细教程，另有 README、BASELINE、AGENT-COVERAGE 和本文件。
每篇包含任务卡、13 节、能力总结、导航及六维证据锚点。
完整运行文件用 `<!-- file: labs/... -->` 标记，一份文件只有一个正文 owner；
理论片段、故意错误与目录示意不计完整文件。

核心第 01—13 模块包含 26 篇、53 个完整文件。综合项目第 14 模块在此基础上接入唯一
应用入口与独立工具验收，不将各 lab 的通过简单等同于完整产品通过。
从当前 Markdown 重新提取的命令见 [README](README.md#环境与独立运行)。

## 核心实验实际复验

本次核心提取目录 `/tmp/course-agent-main-reverify-20261012`。
Node **22.22.0**、TypeScript **5.9.3**，复用已安装精确依赖；
LangGraph 1.4.21、SQLite saver 1.0.4、MCP SDK 1.32.1、Zod 4.6.6。
依赖复用不记为新的 clean install。

```bash
node /tmp/reverify-agent-core-20261012.mjs
```

该内部验证脚本只读第 01—13 模块，按正文 file marker 重新提取，执行 strict NodeNext 编译，
再运行全部 26 个原测试文件。读者无需依赖 `/tmp` 脚本，可按 README 的全量提取/编译方式复做。

| 检查 | 本次结果 | 范围 |
|---|---|---|
| 当前核心源码 strict 编译 | 退出 0 | 53 个文件中的 TypeScript |
| 当前核心 Node 测试 | 66/66；fail/skipped/cancelled 均 0 | 原 63 项及本轮 3 个必要回归 |
| 单课命令路径 | 24/24 TS 课通过 | 修复前独立复审逐课编译/运行；另外两课为 MJS |
| 真实 MCP stdio | 原 2/2 通过 | discovery、call、schema 拒绝与关闭 |
| SQLite 跨进程 | 不同 PID pause/resume/delete 与同 key receipt 同 ID | 核心独立复审，非综合应用验收 |
| 核心 fixture HTTP/UI | 创建、预览、批准、拒绝、取消、刷新、删除 | Chrome154 独立 fixture Backend |

核心复审完整报告位于本次临时证据目录
`/tmp/course-agent-checkpoint-review-20261012`；本表保留其环境与验证范围，
没有把 fixture HTTP/UI 写成综合项目或真实模型通过。

### 本轮核心缺陷与回归

1. Provider 同步取消并返回拒绝 Promise 时，外层停止等待但未消费底层拒绝，独立 Node 进程
   仍会异常退出。已在取消分支消费该 Promise，保留取消原因与有限重试；
   新独立进程用 `--unhandled-rejections=strict` 验证退出 0。
2. 较旧备份没有被撤回来源时，删除账本中的 UPDATE 无行可改，随后同 ID 可能重新导入。
   已用事务 UPSERT 留 tombstone，并测试重复重放、同身份重导入拒绝及其他身份隔离。
3. 增加真实备份/新目录恢复测试：重放备份中不存在来源的最新删除账本后，
   相同 actor/docId 不能复活。

测试数分别从预算 3→4、来源 3→4、备份 2→3，总计从 63→66。
不是放宽 parser、清空数据或删除测试取得通过。

### 运行环境失败证据

借用 Node22 编译的 `better-sqlite3` 给 Node24.21.0 后，两项 checkpoint 测试报
`ERR_DLOPEN_FAILED`，ABI 127 与 137 不一致。该次为环境失败，不作为本卷运行通过。
恢复本卷声明的 Node22.22.0 后，同一最新正文 66/66 通过；
未在共享依赖上 rebuild，也未跳过 SQLite 测试。

## 完整应用与独立工具验收

综合应用将用户输入、进程内受控检索、Provider、答案校验、LangGraph interrupt、审批摘要、
事务回执和本地 UI 接到同一入口。其运行结果须来自第 14 模块最终完整文件的当前提取物，
不能沿用本表核心 66 项或 fixture UI 的结论。
完整文件、启动/停止/重启及测试命令见 [AG-14A](14-capstone/01-private-agent-atomic-application.md)；
独立工具与交付见 [AG-14B](14-capstone/02-independent-tool-release-acceptance.md)。

当前两篇综合项目增加 6 个唯一完整文件，全卷总计 59 个。
从最终 Markdown 提取到 `/tmp/course-agent-readme-final-20261012`，
Node22.22.0 下综合 **17/17**（应用 11、入口 3、工具 3）、全卷 **83/83**；
综合与全量 strict 编译均退出 0，当前核心修复也包含在这一提取物中。
复用已安装依赖，未声称新的安装或另一 Node ABI 通过。

README 中的完整 `package.json/extract.mjs` 已直接提取到独立空目录复验：
59 个完整文件、strict 编译与 83/83 测试通过，再次向同目录提取以 `EEXIST` 拒绝覆盖。
证据目录为 `/tmp/course-agent-readme-final-20261012`。
首次辅助脚本传绝对 `/tmp` 源路径与 macOS `/private/tmp` rootDir 不一致而失败；
改用 README 规定的相对 `labs/` 参数后通过，没有修改正文源码或放宽类型检查。

真实 main 绑定 `127.0.0.1:18781`，Chrome154 独立 fixture 会话验证了显示来源与审批计划、
焦点后 Enter 批准、同一数据根重启查询 committed，数据库 task/receipt 各 1。
两次鼠标点击没有产生 decision 请求，未把鼠标路径记录为通过；
键盘提交确实经 UI 发请求，未通过 evaluate 代替用户操作。
首次终端强制结束留下 lock，确认进程退出后只处理实验根内遗留锁；
第二次 SIGTERM 正常结束并移除 lock。浏览器关闭、临时运行数据清理、端口无监听。

随后从最新正文独立复验鼠标：只读几何检查发现批准按钮在 633px 高视口下方，
`scrollintoview` 后鼠标点击产生 `/decision` 200，界面显示 committed，刷新保持同一 ID。
正常 SIGTERM 停止后 task/receipt 各 1，锁不存在；通过同一受控删除入口清零
task/checkpoint/trace，并清理专用实验根。没有修改 UI 或用 evaluate 触发操作。
证据：`/tmp/course-agent-mouse-final-20261012.md`。旧点击未成功的记录保留，
本轮补齐可见按钮的鼠标审批路径，不将工具未滚动归为应用逻辑缺陷。

独立工具在 registry 中验收 schema、授权与取消，不宣称已接为综合应用的 MCP transport；
综合应用仍使用进程内受控检索。真实模型、物理断网、自然语言语义质量和系统硬断电未验证。

### 综合项目删除恢复回归

独立复审在“业务 receipt 已提交、run/checkpoint 仍暂停”的恢复窗口发现：先删业务回执，
再遇 checkpoint 写锁或清理失败，会在重启后恢复旧审批并阻止同 ID 删除重试。
新增正文回归先以 `awaiting_approval` 不等于 `committed` 失败；最小修复改为先清
checkpoint/trace，最后同业务事务删除 task、receipt 与 runs。前两步失败保留权威回执，
重复批准只读已有任务，重启后同 ID 重试可清零。恢复用例属于新增的第 17 项综合测试，
没有删减既有用例或改变成功断言。原失败与真实 SQLite 子进程锁证据在
`/tmp/course-agent-final-review-20261012`，当前正文提取与修复运行在
`/tmp/course-agent-delete-fix-20261012`。

定向独立复审为 `PROCEED`：原六探针 6/6、真实 SQLite 子进程写锁 1/1、四种删除失败
补强断言 4/4。checkpoint、写锁、trace 或最终 run 删除失败时均保留权威回执；
重启后重复批准不增加任务，同 ID 删除重试最终清零 task/receipt/run/checkpoint/write/trace，
旧 digest 在删除后和再次重启后均拒绝。证据在
`/tmp/course-agent-delete-final-followup-20261012/final-review.md`。

## 已验证范围与未验证项

- 核心 parser、图预算、工具授权、stdio 协议、SQLite、删除账本、fixture 评测与同源 HTTP
  有本表对应实证；固定 fixture 不证明真实模型语义或引用支持度。
- 未运行真实本地模型质量/硬件预算、原生模型 tool calling、GPU/量化比较或人工语义评分。
- 未证明物理断网、独立 OS 用户/VM egress 拒绝、跨进程恶意程序隔离与全部挂载限制。
- 未执行云端 BYOK、外部遥测、通知、网络写工具、集市商品/预约 mutation 或远程部署。
- 未验证安全擦除、加密备份、SSD/WAL/崩溃副本清除、模型包升级回滚与多用户生产认证。
- 精确顶层依赖不冻结未来传递依赖；个人锁文件、同一 Node ABI 与重新运行仍是复现条件。

[卷入口](README.md) · [基线](BASELINE.md) · [逐篇覆盖](AGENT-COVERAGE.md) ·
[全书验证](../VALIDATION.md)
