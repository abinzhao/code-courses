# 版本基线：新技术要有日期，也要有证据

> 原版本资料核验日期：**2026-10-11**。
> 本页保留该日期的版本快照，不将迁移日期写成重新核验日期，不预测未来发布。

## 任务卡

同伴拿到你的首页，问：“我的 Node.js 和你的版本不同，还能运行吗？”本页让你先记录实际环境，再判断它是否满足示例条件。

首周成果是一份真实环境记录：Node.js、Git、浏览器，以及包管理器是否已配置。建议学习 60–90 分钟。其余技术表先作为查阅资料，不要求现在安装。

## 1. 任务背景

今天和半年后运行同一条 `pnpm create vite@latest`，可能得到不同模板。模板是起点，锁文件才记录实际安装的依赖图。遇到示例不能运行，先比较版本，再分析代码。

“新”也不等于“适合生产”。Node.js 的 Current 与 LTS 都是正式发布，但生产主线一般选受支持的 LTS。浏览器新 API 则还需要检查不同引擎是否支持。

本页的版本快照、官方资料链接与项目运行记录是不同证据。官方存在某版本，不能推出任意组合都已实跑；一份历史记录也不能证明今天的注册表、镜像标签和发布页仍保持原样。

## 2. 学习目标

- 区分稳定版、Current、LTS 与预发布。
- 区分课程推荐版本、实际版本与验证结果。
- 记录工具不存在、版本不匹配和示例逻辑错误。
- 说明锁文件为何帮助复现。
- 解释类型支持、语言语法支持与浏览器 API 存在之间的差异。
- 为核心卷与进阶卷分别核对工具链，不直接套用另一卷的补丁版本。

## 3. 预备知识

先读[学习路线](learning-path.md)。命令不熟悉时，对照[终端、进程与端口](04-terminal-git-debugging/01-terminal-processes-ports.md)。首周只需要准备 Node.js 24 LTS、Git 和浏览器；后续框架、数据库和测试工具在对应教程配置。

## 4. 核心理论

### 4.1 版本表怎样阅读

“教材选择”是学习环境建议，“本机输出”是实际事实，“验证通过”是测试结论，三者不能互相替代。

```text
课程条件 → 本机工具输出 → 示例运行 → 记录验证范围
```

补丁版本不同不必立即全部升级；先确认示例使用的 API、官方支持范围与运行证据。

### 4.2 原核验日版本资料表

以下具体数值沿用 2026-10-11 原资料。它们不是本次重新访问官方站点或注册表的结果；“原记录”保留历史来源与候选组合，不自动继承为当前环境的兼容结论。

| 技术 | 原核验日记录 | 教材选择与证据边界 | 官方资料 |
|---|---|---|---|
| HTML | WHATWG Living Standard，持续更新 | 语义元素、原生表单与渐进增强；需按具体特性检查 | [WHATWG](https://html.spec.whatwg.org/) / [MDN 元素索引](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements) |
| CSS | 按模块与特性演进，不是单一“CSS4”版本 | Flex、Grid、逻辑属性、变量、容器查询与有降级的动效 | [MDN CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) / [W3C CSS](https://www.w3.org/Style/CSS/) |
| React | 原记录：官方版本页显示 **19.3**，链接 2026-09-09 发布说明 | React 19 函数组件、Hooks；不代表与所有插件兼容 | [React Versions](https://react.dev/versions) |
| Vue | 原记录：官方 releases 页显示稳定 **3.5.43** | Vue 3.5，SFC 与 Composition API | [Vue Releases](https://vuejs.org/about/releases.html) |
| Node.js | 原记录：24.21.0 为 LTS，26.11.1 为 Current | **24 LTS**；创建 Nest12 项目需满足其 CLI 最低版本 | [Node Releases](https://nodejs.org/en/about/previous-releases) |
| Vite | 原记录：8.0 于 2026-03-12 稳定发布；注册表返回 8.3.4 | **Vite 8**，Rolldown/Oxc；运行组合另查所在卷 | [Vite 8](https://vite.dev/blog/announcing-vite8) / [Getting Started](https://vite.dev/guide/) |
| TypeScript | 原记录：**7.0** 于 2026-07-08 正式发布，原生编译器；6.0 提供兼容 API | 教授 TS7 类型机制；编译器 API 工具按支持范围并行使用兼容包 | [TS 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) / [TS 下载](https://www.typescriptlang.org/download/) |
| ESLint | 原记录：**10.0** 于 2026-02-06 发布，旧配置体系移除 | ESLint 10 flat config；插件支持需另验 | [ESLint 10](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/) |
| NestJS | 原记录：迁移指南与注册表以 **12** 为稳定主版本；核心包为 12.1.2 | NestJS 12；核心包 ESM，应用模块格式显式选择 | [Nest Migration](https://docs.nestjs.com/migration-guide) / [Nest Releases](https://github.com/nestjs/nest/releases) |
| PostgreSQL | 原记录：官方支持表列出 **18 / 18.6** | PostgreSQL18、SQL 与参数化查询 | [PostgreSQL Versioning](https://www.postgresql.org/support/versioning/) |
| 应用与测试工具 | 原组合清单：React Router 8.4.0、Vue Router 5.3.1、Pinia 4.0.3、Vitest 5.0.3、Playwright 1.64.0、pnpm 12.11.2 | 原文称组合完成验证；须到对应卷和[验证说明](../VALIDATION.md)查命令、结果与范围，本表不独立证明 | [React Router](https://reactrouter.com/) / [Vue Router](https://router.vuejs.org/) / [Pinia](https://pinia.vuejs.org/) / [Vitest](https://vitest.dev/) / [Playwright](https://playwright.dev/) / [pnpm](https://pnpm.io/) |
| 数据与交付镜像 | 原清单：`pg` 8.23.1、Redis 8.6.2；Node 24.21.0、PostgreSQL 18.6、Nginx 1.30.5 | 原文记录标签/摘要审计；本表不含完整镜像 digest，发布须复核候选摘要 | [node-postgres](https://node-postgres.com/) / [Redis](https://redis.io/docs/latest/) / [Node image](https://hub.docker.com/_/node) / [PostgreSQL image](https://hub.docker.com/_/postgres) / [Nginx](https://nginx.org/en/download.html) |
| GitHub Actions | 原清单：checkout v7.0.1、setup-node v7.1.0、upload-artifact v7.0.2 | 原记录 SHA 见下文；固定 SHA 不等于托管流水线已运行 | [checkout releases](https://github.com/actions/checkout/releases) / [setup-node releases](https://github.com/actions/setup-node/releases) / [upload-artifact releases](https://github.com/actions/upload-artifact/releases) |

原 Actions tag 解析记录依次为：

- checkout：`3d3c42e5aac5ba805825da76410c181273ba90b1`。
- setup-node：`949feb2413d6458794dcd2491c4babbbce0c15c1`。
- upload-artifact：`cf430e030ddbb5b0abf93d22962f4752f3646cd9`。

表格不等于已经固定完整依赖图。对应卷仍要核对 engine、peer dependency、插件与测试运行器，再把成功验证的组合写入个人项目清单和锁文件。判断版本时同时查看官方发布或支持页、迁移说明与注册表元数据，不能只采用搜索摘要。没有命令、结果或可复核记录的组合标为待验证。

### TypeScript 7 与生态兼容

原资料按 TS 7.0 正式版且尚未提供编译器 API 的边界组织。`typescript-eslint`、Vue 语言工具等依赖编译器 API 的工具需要按各自支持范围选择版本。本书把“语言编译器”和“工具兼容 API”分开：原组合以 TS 7.0.2 提供 `tsc`，兼容包提供当前工具链需要的 API 与 `tsc6`。

原资料给出的并行配置：

```json
{
  "devDependencies": {
    "@typescript/native": "npm:typescript@^7.0.2",
    "typescript": "npm:@typescript/typescript6@^6.0.2"
  }
}
```

这段含范围声明的示例不是精确锁定结果。安装前查所在卷的实际清单与支持说明，安装后分别执行 `pnpm exec tsc --version` 和 `pnpm exec tsc6 --version`，确认命令指向。包装包版本与内部编译器版本可能不同：原注册表记录中的兼容包装包为 6.0.2，工程验证还要记录命令实际报告的内部版本。Vue 工具与 Lint 按真实支持范围测试，不能把依赖安装成功当作兼容证明。没有编译器 API 依赖的工程按所在卷选择 TS 7。

### 4.3 当前技术职责

| 范围 | 课程主线 | 责任边界 |
|---|---|---|
| SPA 开发与构建 | Vite 8 与框架稳定插件 | 打包器不替代路由、SSR 框架或服务端能力 |
| React | React 19 函数组件、Hooks | Compiler 等能力按官方稳定文档显式接入 |
| Vue | Vue 3.5 SFC、`script setup` 与 Composition API | 编译器和运行时保持兼容版本 |
| Lint | ESLint 10 flat config | ignores、全局和文件范围都在 `eslint.config.*` 中声明 |
| TypeScript 解析 | 浏览器打包与 Node 原生执行分别配置 | 模块解析策略匹配真实运行方式 |
| NestJS | NestJS 12，模块格式与测试/Lint 工具显式选择 | 脚手架默认值不能替代清单和验证 |
| 浏览器配置 | `VITE_*` 等客户端变量只保存公开配置 | 浏览器构建产物不能保存秘密 |
| 服务架构 | 先完成边界清楚、可测试和可观测的单体 | 只有明确扩展证据时才增加分布式复杂度 |

### 4.4 建立自己的环境快照

先安装 Node24 当前受支持补丁；本书不会自动替你修改电脑上的全局环境。检查：

```bash
node --version
npm --version
```

使用 pnpm 的教程会介绍安装和固定版本。建立项目后记录：

```bash
pnpm --version
pnpm list --depth 0
pnpm exec tsc --version
pnpm exec vite --version
```

这些命令从项目目录运行；没安装对应工具时，不能把“找不到命令”解释为代码错误。

建议把以下内容写入个人项目 README：

```text
Runtime: Node.js 24.x
Package manager: 本机验证通过的 pnpm 精确版本
Install: pnpm install --frozen-lockfile
Check: pnpm run typecheck / lint / test / build
Browsers: 项目实际验收的 Chrome、Firefox、Safari 版本
Database: PostgreSQL 18，明确补丁版本与镜像摘要
```

说明项需要在实际建立项目时填写真实值，不能原样当作完成的环境记录。其他卷若采用不同工具链，以该卷明确的清单和证据为准，不为了表格整齐强行统一。

### 4.5 浏览器兼容是三件事

**语言语法**：比如可选链，工具可以把部分新语法转换成旧语法。
**运行时 API**：比如 `Temporal`、`IntersectionObserver`，降级语法不一定产生这些 API。
**CSS/HTML 特性**：比如容器查询或 popover，需要独立检查支持与行为。

TS 有某个 API 的类型，并不证明用户浏览器存在它。可以先做特性检测：

```js
if ("IntersectionObserver" in window) {
  console.log("可以使用观察器优化加载");
} else {
  console.log("使用直接加载的基本方案");
}
```

CSS 用条件支持：

```css
.products {
  display: grid;
  grid-template-columns: 1fr;
}

@supports (container-type: inline-size) {
  .catalog {
    container-type: inline-size;
  }
}
```

`@supports` 只说明浏览器认识语法，不保证没有实现缺陷；必要时仍做目标浏览器测试。开发阶段使用受支持浏览器，生产支持范围由实际用户和项目目标决定。

### 4.6 三类升级

| 变化 | 常见风险 | 检查 |
|---|---|---|
| 补丁 | 修复通常较小，但可能影响边界 | Release notes 与相关回归 |
| 次版本 | 新 API、类型和工具默认可能变化 | 类型检查、构建与关键流程 |
| 主版本 | 删除旧 API、改变配置与默认行为 | 迁移指南、隔离分支、完整验收 |

语义版本是沟通约定，不是永不出错的保证。不要删锁文件、全部升到 latest，然后才开始定位问题。先保存当前证据，一次处理一个明确升级目标。

### 4.7 三卷进阶的版本入口

本页不为进阶卷复制补丁表、SDK 版本或验证结论。进入一卷时，从它的 README 核对真实前置、包清单、运行方式和已验证范围：

| 进阶卷 | 唯一版本与运行入口 | 必须区分的证据 |
|---|---|---|
| AI Agent | [AI Agent README](../10-ai-agent/README.md) | 本地替身、真实模型、工具调用与外部副作用不是同一种验证 |
| 小程序 | [小程序 README](../11-mini-program/README.md) | Node/组件、开发者工具、基础库与真机分别记录；H5 不替代小程序 |
| 浏览器插件 | [浏览器插件 README](../12-browser-extension/README.md) | 普通网页、扩展加载、后台恢复、权限与商店发布分别记录 |

实际操作：先在个人 `environment.md` 记录所选卷、README 声明的核验日期和本机原始输出；再按该卷完成最小运行与停止。通过标准是清单、锁文件、命令输出和实际结果一致，且明确未验证的平台。不自行填写“最新补丁”，也不把核心 React、TS 或 Node 的选择套进所有平台编译器。

## 5. 标签、属性、API 或配置清单

| 检查项 | 作用 | 首周用法 | 边界 |
|---|---|---|---|
| `node --version` | 运行时实际版本 | 在终端直接运行 | 输出不证明页面功能正确 |
| `git --version` | Git 是否可用 | 在终端直接运行 | 不检查项目状态 |
| `npm --version` | npm 实际版本 | 可选记录 | 当前无依赖服务不需安装包 |
| `pnpm --version` | 包管理器是否可用 | 已配置时记录 | 首周不以缺失阻塞 |
| 浏览器关于页面 | 浏览器名称与版本 | 菜单中查看 | 不能代表其他引擎 |
| 锁文件 | 固定解析后的依赖图 | 工程化阶段建立 | 首周无依赖示例不创建 |
| `@supports` | CSS 语法支持检测 | 后续 CSS 实验 | 不保证行为没有缺陷 |

## 6. 最小可运行案例

### 文件位置与命令

在个人学习项目中保存 `environment.md`，不要在教材仓库建立实验源码。打开终端执行只读检查：

```bash
node --version
git --version
```

预期分别得到 `v24.` 开头的运行时版本与 `git version`。若不符合，保留实际输出，不手工写成推荐值。已安装包管理器时可另运行 `npm --version` 与 `pnpm --version`；未安装时记录“未配置”。

浏览器版本从浏览器的“关于”页面查看，再用编辑器记录：

```markdown
# 首周环境记录

## 实际环境
记录日期：
操作系统：
Node.js 原始输出：
Git 原始输出：
浏览器名称与版本：
包管理器是否配置：

## 验证范围
启动命令：
首页请求结果：
错误路径请求结果：
尚未验证的环境：
```

空字段由学习者填写实际观测，不是完成证据。记录不需要安装依赖，关闭终端即可结束检查。

### 失败诊断

工具找不到：查看终端错误与工具安装位置。版本不同：对照示例条件和官方支持范围。页面失败：继续查具体路径与响应，不因为版本表不同就直接归因。最终记录包含实际结果和仍未确认的边界。

## 7. 项目集成案例

把环境记录与个人 README 放在一起，同伴拿到页面时能知道运行条件。W1 无第三方依赖，暂不需要锁文件；以后创建 React、Vue 和后端项目再加入精确依赖与安装命令。

每次增加一层工具，都扩展记录的验证范围，而不是把全课程版本表原样粘贴成“本机配置”。只运行过 Node.js 首页，就不能声称双框架和数据库已兼容。进阶卷另建环境段，注明真实模型、客户端或扩展环境尚缺的证据。

## 8. 常见错误与排查路径

| 现象 | 证据 | 原因 | 修复与复验 |
|---|---|---|---|
| 工具找不到 | 终端命令错误 | 未安装或 PATH 问题 | 核对安装位置，再运行版本检查 |
| 环境表全是推荐值 | 无原始输出 | 用建议替代观测 | 保存本机结果并逐项比较 |
| 新机器安装不同依赖 | 依赖树、锁文件或管理器不同 | 复现条件不完整 | 核对同一锁文件与工具版本 |
| 类型通过但 API 不存在 | 运行时异常 | 类型声明不是实现 | 查目标运行时，采用兼容方案 |
| 页面 404 就升级 Node | 服务已返回明确状态 | 错误归因 | 检查请求路径，复验正确 URL |
| 所有卷共用一张补丁表 | 平台插件依赖范围不同 | 忽略工具链边界 | 从所选卷 README 重建清单并运行其检查 |

## 9. 课后题

**问题：推荐 Node.js 24，实际输出是另一个仍受支持的 LTS，应该怎样记录？**
参考答案：记录原始输出，并写清与课程推荐不一致；是否支持示例要依据 engine、API 和实际验证，不能把本机版本改写成推荐版本。

**问题：首周没有锁文件，就完全无法复现吗？**
参考答案：首周只使用内置模块，文件、运行时与命令仍能明确记录；有依赖时才需要记录依赖图。

**问题：原记录写过“组合验证完成”，为何仍要找命令与结果？**
参考答案：结论有具体环境和范围。缺少相应记录时只能保留历史陈述，不能推出本机或新平台也通过。

## 10. 实践练习

**练习：一份博客说 Vue3.6 已经发布，你如何处理？**
参考答案：先看它指稳定版还是 beta；查看官方 releases、发布记录、包 dist-tags 和日期。若证据只支持预发布，就不改主线，并记录支持状态。

**练习：TS 不报错但浏览器出现 `Temporal is not defined`，原因是什么？**
参考答案：标准库声明提供类型，没有安装浏览器运行时实现；需要核对目标环境并采用兼容方案。

**练习：新机器安装后版本不同，第一步查什么？**
参考答案：Node、包管理器版本、锁文件是否存在、是否 frozen 安装、是否运行相同目录的脚本，再比较依赖树。

上述练习是阅读与推理，记录在个人 `environment.md`；不要求安装 Vue、TypeScript 或升级机器。

**基础：真实记录。**运行版本检查并保存原始结果，预期别人能区分已配置与未配置项；失败时保留错误信息，先查工具可用性。

**提升：比较两台环境。**使用同伴自愿提供的版本输出，对比差异与双方实际运行结果。记录在同一文件，完成标准是区分“环境不同”和“已经观察到不兼容”。

**故障：识别错误归因。**访问首周服务的 `/missing`，记录 404。无需改依赖；恢复首页后应为 200。若连接失败，先确认服务运行。解释为何 404 本身不证明 Node.js 太旧。

## 11. 阶段验收

能说明本页原版本快照采用什么日期，能找到对应官方资料；知道 LTS、稳定版、预发布、锁文件的区别；不会把“当前电脑能运行”直接当作“所有浏览器支持”。

- [ ] 环境记录包含真实输出与日期。
- [ ] 首周必要工具与后续工具分开。
- [ ] 能解释命令不存在与版本不匹配。
- [ ] 已记录运行验证与尚未验证的范围。
- [ ] 历史版本资料、课程建议和本机事实没有混写。

提交 `environment.md` 和一条版本判断依据。表中其他技术不需要在 W1 全部验证。

## 12. 常见问题

**首周必须安装 pnpm 吗？**
不必。无依赖 Node.js 示例直接运行；工程化阶段再固定包管理器。

**为什么版本命令成功，页面仍然失败？**
版本检查只证明工具能输出版本，不能证明文件、路径或业务逻辑正确。

**版本资料写了日期，就永远正确吗？**
不。发布和支持状态会变化，使用新版本时应重新查看官方来源并记录验证范围。迁移文档不算重新核验。

**进阶卷版本与核心卷不同，是否一定写错？**
不一定。平台编译器、插件和 SDK 有自己的兼容约束。先查该卷清单、官方支持范围与实跑结果，不擅自升级来强行一致。

## 13. 扩展阅读

- [Node.js 发布与支持](https://nodejs.org/en/about/previous-releases)：区分 Current 与 LTS。
- [Git 安装资料](https://git-scm.com/downloads)：核对平台安装方式。
- [pnpm 安装资料](https://pnpm.io/installation)：工程化阶段再核对版本与运行条件。
- [W1 综合验收](w01-checkpoint.md)：把工具事实连接到页面运行证据。
- [全书验证说明](../VALIDATION.md)：查实际验证范围，而不是由版本表推断通过。

## 我现在能做到什么

我能记录真实环境，比较课程条件与本机结果，并把历史版本判断、功能验证和未验证范围分开。进入新平台时，我会使用该卷的运行证据，不编造补丁版本或跨平台兼容结论。

## 单元导航

[上一页：学习路线](learning-path.md) · [下一课：文件、路径与编辑器](03-computer-first-page/01-files-paths-editors.md) · [起步卷目录](README.md) · [全书目录](../README.md)
