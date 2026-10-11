# JavaScript 与 TypeScript：从第一条语句到可靠业务逻辑

> 面向零基础学习者的 JavaScript / TypeScript 完整教程
> 主线项目：邻里集市原生应用与可信数据边界

本卷不要求你提前理解函数、对象、终端或类型。你会从可观察的值和控制流程开始，
逐步建立金额函数、商品集合、ESM、DOM 交互、异步搜索、严格类型、领域解析器和自动化测试。

完成本卷后，你应能回答：

- 一段 JavaScript 为什么产生当前输出，失败又从哪一层开始？
- 浏览器状态、服务端数据和 TypeScript 类型分别能保证什么？
- 怎样让旧请求、非法 JSON、金额精度和版本冲突不能静默污染界面？
- 哪些结果已由 Node、TypeScript 或 Chromium 验证，哪些仍需要目标环境复测？

## 本卷定位与教材结构

本 README 统筹章节顺序、前置、阶段产出与本卷验收，学习路线直接连接每篇详细教程。
下方只示意导航与正文的职责分工，不表示当前目录中存在独立章节导航文件。

```text
章入口
  ├── 说明本章任务、前置、学习顺序与综合验收
  └── 直接连接本章详细教程

详细教程
  ├── 推导一个明确的语言、平台或类型知识组
  ├── 给出最小案例和邻里集市集成案例
  ├── 制造并诊断错误
  └── 用练习与阶段验收确认能力
```

学习时按本 README 的章节表格逐篇完成详细教程及其练习、阶段验收，再按本卷验收清单整合成果。
全部知识点及其理论、案例、诊断、练习和验收位置，见
[JavaScript / TypeScript 教材覆盖矩阵](JS-TS-COVERAGE.md)。覆盖矩阵用于审计，不替代正文或运行证据。

## 学习路线

### 第一章：值、运算与控制流程

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [值、变量、类型与显式转换](01-values-control-flow/01-values-variables-types-conversion.md) | 怎样从执行顺序、值和单位解释第一组程序输出 |
| 2 | [运算符、条件分支与短路求值](01-values-control-flow/02-operators-conditions-short-circuit.md) | 怎样保留合法 0 分并拒绝非法折扣 |
| 3 | [循环、迭代与状态追踪](01-values-control-flow/03-loops-iteration-state-tracing.md) | 怎样保证循环终止并记录每次整数分累计 |

阶段产出：带输入校验、溢出保护和状态轨迹的购物车计算程序。建议投入 5–6 小时。

### 第二章：函数、作用域与可解释错误

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [函数契约、参数与返回值](02-functions-scope-errors/01-function-contracts-parameters-returns.md) | 怎样让元转分、格式化和折扣函数不混淆单位 |
| 2 | [作用域、闭包与生命周期](02-functions-scope-errors/02-scope-closures-lifetime.md) | 怎样让状态有明确所有者，并在释放后使旧操作失效 |
| 3 | [错误、堆栈与清理边界](02-functions-scope-errors/03-errors-stacks-cleanup-boundaries.md) | 怎样传播失败、读取堆栈并完成不吞错的清理 |

阶段产出：可复用的金额函数、独立闭包状态和可诊断错误边界。建议投入约 6 小时。

### 第三章：对象、数组与数据边界

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [对象、引用与定向不可变更新](03-objects-arrays-data/01-objects-references-immutable-updates.md) | 怎样按稳定 ID 更新商品而不破坏旧记录 |
| 2 | [数组、集合变换与分页](03-objects-arrays-data/02-arrays-collections-pagination.md) | 怎样正确组合筛选、排序、合计、total 和分页 |
| 3 | [JSON、序列化与数据边界](03-objects-arrays-data/03-json-serialization-data-boundaries.md) | 怎样把任意 JSON 逐字段准入为完整商品页 |

阶段产出：不修改源集合的商品分页管道和完整 Listing 运行时解析器。建议投入约 7 小时。

### 第四章：原型、类与 ECMAScript 模块

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [原型链、`this` 与类的适用边界](04-prototypes-modules/01-prototype-chain-this-classes.md) | 属性从哪里来，调用形式为何改变 `this` |
| 2 | [ESM 导入、导出与路径解析](04-prototypes-modules/02-esm-import-export-resolution.md) | 怎样建立 Node 与浏览器都能解释的显式模块契约 |
| 3 | [模块图、共享状态与动态导入](04-prototypes-modules/03-module-graphs-state-dynamic-import.md) | 模块何时求值，状态和副作用应该由谁拥有 |

阶段产出：职责单向、无内置原型修改和共享可变目录的 ESM 模块图。建议投入约 4 小时。

### 第五章：DOM、事件与可访问状态

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [DOM 查询、节点创建与安全渲染](05-dom-events/01-dom-query-create-safe-rendering.md) | 怎样从状态创建节点并避免不可信文本进入 HTML 解析 |
| 2 | [事件、表单提交与委托](05-dom-events/02-events-forms-delegation.md) | 怎样保留提交语义并用一次监听处理动态动作 |
| 3 | [内存状态、焦点与可访问交互](05-dom-events/03-state-focus-accessible-interactions.md) | 怎样在重渲染、筛选和删除后保持反馈与焦点连续 |

阶段产出：支持发布、收藏、筛选、移除、状态播报和焦点恢复的内存商品页。建议投入约 5 小时。

### 第六章：异步、Fetch 与事件循环

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [Promise、`async` 与事件循环](06-async-fetch-event-loop/01-promises-async-event-loop.md) | 同步栈、微任务、计时器和异步函数怎样安排执行 |
| 2 | [Fetch、HTTP 错误与运行时校验](06-async-fetch-event-loop/02-fetch-http-errors-runtime-validation.md) | 怎样区分网络、HTTP、正文解析和契约失败 |
| 3 | [取消、竞态与并发决策](06-async-fetch-event-loop/03-cancellation-races-concurrency.md) | 怎样取消旧工作并阻止过期结果覆盖最新状态 |

阶段产出：可取消、可释放、能分类协议失败且只提交最新结果的搜索控制器。建议投入约 5.5 小时。

### 第七章：TypeScript 核心

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [推断、注解与严格配置](07-typescript-core/01-inference-annotations-strict-config.md) | 怎样区分类型检查、生成 JavaScript 和执行结果 |
| 2 | [联合、收窄与状态建模](07-typescript-core/02-unions-narrowing-state-modeling.md) | 怎样让未知输入和界面状态只能进入合法组合 |
| 3 | [泛型、工具类型与健全性边界](07-typescript-core/03-generics-utility-types-soundness.md) | 怎样保存类型关系而不伪造运行时事实 |

阶段产出：由 TS 7 主线和 TS 6 兼容线分别检查的严格分页与状态程序。建议投入 6–7 小时。

### 第八章：TypeScript 领域设计

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [领域契约、品牌值与 DTO](08-typescript-domain-design/01-domain-contracts-branded-values-dtos.md) | 怎样区分表单草稿、有效命令、完整资源、补丁和投影 |
| 2 | [`unknown`、运行时解析器与错误路径](08-typescript-domain-design/02-unknown-runtime-parsers-errors.md) | 怎样把未知响应变成带精确错误路径的可信领域值 |
| 3 | [状态机、版本冲突与授权边界](08-typescript-domain-design/03-state-machines-conflicts-authorization.md) | 怎样表达保存、409 冲突、身份失败和恢复路径 |

阶段产出：完整领域契约、唯一数据准入通道和保留冲突信息的保存状态机。建议投入约 8 小时。

### 第九章：测试、调试与算法

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [Node 测试、断言与 TDD 边界](09-testing-debugging-algorithms/01-node-test-assertions-tdd-boundaries.md) | 怎样先证明测试会失败，再固定金额规则 |
| 2 | [确定性异步测试与系统调试](09-testing-debugging-algorithms/02-deterministic-async-testing-debugging.md) | 怎样控制异步完成顺序并稳定复现竞态 |
| 3 | [数据结构、复杂度、搜索与排序](09-testing-debugging-algorithms/03-data-structures-complexity-search-sort.md) | 怎样先声明算法前提，再比较时间、空间和维护成本 |

阶段产出：6 项 Node 测试、可复现调试记录，以及不修改来源的搜索与排序演示。建议投入约 7.5 小时。

## 学习与运行

1. **预测**：先写下输出、状态变化或类型诊断，再运行命令。
2. **复现**：在个人练习目录创建教程标注的完整文件，不把围栏或终端提示符写入源码。
3. **观察**：保存 stdout、stderr、堆栈、测试摘要，或浏览器 Elements、Console、Network 和焦点位置。
4. **破坏**：执行教程指定的错误实验，先记录现象和证据，不直接改预期结果。
5. **恢复**：写清原因、修复和复验，不用删校验、放宽断言、类型断言或空 `catch` 制造成功。
6. **迁移**：不看答案完成基础、进阶和故障注入练习。
7. **验收**：按正文阶段验收和本 README 验收清单提交路径、命令、正常结果、失败证据和仍未验证的边界。

### 运行目录与服务约定

### Node 与 `js-lab/`

- 运行时选择见[版本基线](../00-guide/version-baseline.md)。先运行 `node --version` 并保存
  实际输出；版本不符时记录差异，不虚报基线。
- `js-lab/` 是读者在个人练习工作区创建的目录，不属于教材仓库。教材不附带 `labs/`、依赖目录、包清单或锁文件。
- `.mjs` 明确使用 ESM。命令从教程指定的 `js-lab/` 根目录运行，相对导入路径以导入文件的位置解析。
- Node 与浏览器共享 JavaScript 语言和部分 Web API，但 Node 没有页面 `document`，浏览器也不能直接使用 `node:http` 等内置模块。
- 第 9 章使用 `node:test` 与 `node:assert/strict`，无需安装第三方测试框架。

### DOM、ESM 与本地服务

- DOM 和浏览器 ESM 页面必须通过 HTTP 打开，不能用 `file://` 的结果推断真实加载行为。
- 完整 DOM 应用从 `js-lab/` 运行 `node dom-market/server.mjs`，访问 `http://127.0.0.1:4173`，结束时按 `Control-C`。
- 其他 DOM 小实验也使用只监听 `127.0.0.1` 的教学静态服务；若端口被占用，先停止旧服务再复验。
- Fetch 教程的本地 API 使用进程内存和临时端口，场景结束后自行关闭。它不是生产 API，也不执行真实写事务。

### TypeScript 与 `ts-lab/`

- `ts-lab/` 同样由读者在个人练习工作区创建。依赖、锁文件和 `dist/` 只存在于该练习目录或临时验证目录。
- 首次安装生成锁文件后，以 `pnpm install --frozen-lockfile` 复验；实际运行时和包管理器版本
  必须单独记录。
- `pnpm typecheck:all` 运行两条编译器检查线；`pnpm build` 只由 TS 7 主线生成 JavaScript；最后再用 Node 执行 `dist/`。
- Vitest、Playwright、workspace 和完整质量流水线由工程卷负责，本卷不提前建立仓库级工程。

### TypeScript 主线与兼容边界

语言主线与旧编译器 API 兼容线的精确包名、版本和并行配置统一见
[版本基线](../00-guide/version-baseline.md)。安装后分别运行课程指定的主线与兼容命令，
确认它们实际指向；两条类型检查都通过，只证明源码满足两套静态规则，不证明外部 JSON、
金额值域、浏览器 API、身份或授权正确。

## 连续项目与边界

- **整数分**：`priceCents` 是非负安全整数，单位为分。表单中的“元”必须先完整校验再转换；`parseFloat`、真假判断、截断和最终钳制都不是修复。
- **UTC**：持久化时间使用有效的 ISO 8601 UTC 字符串，显示时才本地化。课程解析器采用比完整 RFC 3339 更窄的领域格式，并检查日历往返。
- **完整资源**：`Listing` 固定包含 `id`、`title`、`description`、`priceCents`、`status`、`ownerId`、`version`、`createdAt`；状态仅允许 `available`、`reserved`、`sold`。
- **分页契约**：正式列表路径为 `/api/v1/listings?page=1&pageSize=20&q=`，响应为 `{ items, page, pageSize, total }`。空页可以合法，响应不能直接当数组使用。
- **外部输入**：JSON、表单和存储值先保持为 `unknown` 或草稿，经运行时解析后才能进入领域状态。泛型、断言和品牌类型不会在运行时自动校验。
- **内存状态**：本卷的商品、收藏、筛选、模拟响应和本地 API 均为教学内存数据；刷新或进程退出后可以丢失，不代表数据库保存成功。
- **异步边界**：取消请求与阻止旧结果渲染是两件事；客户端取消不等于服务端事务回滚，防抖也不保证结果新鲜。
- **身份与授权**：主线身份机制是同源 HttpOnly Cookie，会话 Cookie 不供前端读取。隐藏或禁用按钮、前端类型和 401 处理都不能授予对象权限。
- **跨层保证**：对象授权和版本原子比较由后端执行，有效预约唯一性由事务和数据库约束保证；CORS、CSRF、Cookie、认证和授权不能互相替代。

详细模型见[邻里集市统一项目契约](../00-guide/project-contract.md)，版本选择见
[课程版本基线](../00-guide/version-baseline.md)。

## 验收

完成本卷时，应能从空白个人练习目录独立交付：

- 使用整数分、明确单位和值域的金额解析、格式化、折扣和合计函数；
- 不修改源集合的商品更新、筛选、排序、分页，以及完整 Listing 页运行时解析器；
- 职责单向的 ESM 模块图和可恢复的动态导入；
- 通过 HTTP 运行、支持键盘、状态播报和焦点恢复的原生 DOM 内存商品页；
- 能区分网络、HTTP、正文和契约失败，并用取消与代次守卫保护最新搜索；
- 由 TS 7 主线构建、经 TS 6 兼容线检查的严格领域程序；
- 能保留草稿和服务端当前版本的 409 冲突状态机；
- 3 项金额测试、2 项竞态与释放测试、1 项唯一 ID 测试，合计 tests 6、pass 6、fail 0。

验收材料至少包含：

```text
个人代码路径与实际运行环境
创建、安装、检查、构建和运行命令
正常输出、测试摘要或浏览器操作结果
错误输入、失败堆栈和五段诊断
TS 7 与 TS 6 分开的版本和检查结果
Chromium 键盘路径、焦点、Console 与 Network 记录
整数分、UTC、内存、身份和授权边界说明
未验证的浏览器、辅助技术与真实服务范围
```

不能通过删除测试、放宽断言、吞掉异常、双重断言、关闭浏览器安全策略，
或把前端内存成功描述成服务端持久化与授权成功来获得“通过”。

## 验证范围

本卷已完成代表性 JavaScript 运行、Node 测试、TypeScript 双线检查、教学 API 和 Chromium
主路径验证；这些结果不能外推为全部解释片段、练习变体或生产环境均已运行。Safari、Firefox、
真实移动设备、辅助技术、真实弱网、生产身份/授权、数据库并发与工具生态兼容仍需单独复测。
精确数量、版本、结果和缺口统一见[交付与验证说明](../VALIDATION.md)；工程化细节证据见
[工程卷自检](../07-engineering/SELF-CHECK.md)。

## 资料与导航

- [ECMAScript](https://tc39.es/ecma262/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [JavaScript / TypeScript 教材覆盖矩阵](JS-TS-COVERAGE.md)

[上一卷：浏览器](../03-browser/README.md) · [返回全书目录](../README.md) ·
[下一卷：React](../05-react/README.md)
