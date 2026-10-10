# NoteFlow W2-W48 全量课程生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在保留 W1 成果的基础上，完成 W2-W48 的 94 个知识单元、94 个实验入口、阶段导航和全量质量校验，使课程达到 96 单元完整交付标准。

**Architecture:** 使用 `progress/course-manifest.json` 作为 96 个单元的唯一索引，正文路径、实验路径、周次、阶段、前置单元和 NoteFlow 成果都从清单读取。正文按阶段和周次拆分，实验按单元拆分；校验脚本不生成伪正文，只检查每个清单记录是否有完整内容和可达入口。

**Tech Stack:** Markdown, JSON, Node.js 24, pnpm 12, HTML/CSS/JavaScript, TypeScript, React 19.3, Vue 3.5, Vite 8, Vitest 5, Playwright 1.64, NestJS 12, PostgreSQL 18, Prisma 7.10, Redis 8, BullMQ 6, Docker Compose v2.

---

## 执行约束

- 开始每个批次前执行：

```bash
. "$HOME/.nvm/nvm.sh"
nvm use 24
node --version
```

- Node.js 24 的补丁版本以当前 nvm 安装结果为准；正文依赖主版本契约。
- 不回退或覆盖 `web-fullstack-course/` 中已有 W1、课程地图、模板和用户改动。
- 不提交真实 Token、密码、私钥、生产数据、个人环境变量或外部服务凭据。
- 每个批次完成后运行校验、审查差异并单独提交。
- 不创建只有标题、空列表或“后续补充”文字的最终正文。

## 文件职责总览

- `progress/course-manifest.json`：96 个单元的结构化索引和验收元数据。
- `progress/README.md`：批次进度、生成顺序和维护规则。
- `scripts/check-course-completeness.js`：清单、正文、实验、章节、链接、ID 和导航检查。
- `scripts/check-course-links.js`：保留现有链接检查，并改为扫描全部课程正文。
- `00-course-map/01-learning-path.md`：48 周学习路线和单元入口。
- `00-course-map/02-noteflow-evolution.md`：产品成果和领域边界。
- `00-common/` 至 `08-fullstack-delivery/`：96 篇课程正文。
- `labs/WXX/UXX-<slug>/`：96 个实验入口、运行说明和实验文件。

## 单元正文文件规则

除已经存在的 W1 两篇正文外，新增正文统一使用：

```text
web-fullstack-course/<stage>/WXX/<unit-id>-<slug>.md
```

每个正文必须包含以下标题：

```text
## 1. 任务背景
## 2. 学习目标
## 3. 预备知识
## 4. 核心理论
## 5. 标签、属性、API 或配置清单
## 6. 最小可运行案例
## 7. NoteFlow 集成案例
## 8. 常见错误与排查路径
## 9. 课后题
## 10. 实践练习
## 11. 阶段验收
## 12. 常见问题
## 13. 扩展阅读
```

每个正文还必须包含：

- 任务卡；
- 本单元成果；
- “先看结果”；
- “拆开看”；
- 代码文件位置、运行命令、预期结果和失败诊断；
- 单元导航；
- “我现在能做到什么”。

每个实验目录必须包含 `README.md`，并根据主题至少包含以下一种真实材料：

- HTML/CSS/JavaScript 页面；
- Node.js/TypeScript 可执行脚本；
- React/Vue 可运行组件或页面；
- SQL/Prisma 迁移和查询；
- 测试文件和可复现测试数据；
- Docker/CI 配置和验证命令；
- DevTools、网络、性能或安全观察步骤。

---

### Task 1: 建立 96 单元清单与全量校验器

**Files:**
- Create: `web-fullstack-course/progress/course-manifest.json`
- Create: `web-fullstack-course/progress/README.md`
- Create: `web-fullstack-course/scripts/check-course-completeness.js`
- Modify: `web-fullstack-course/scripts/check-course-links.js`
- Modify: `web-fullstack-course/README.md`
- Modify: `web-fullstack-course/00-course-map/01-learning-path.md`
- Modify: `web-fullstack-course/00-course-map/02-noteflow-evolution.md`

- [ ] **Step 1: 写入 manifest 的字段契约**

每条记录使用以下字段：

```json
{
  "id": "U03",
  "week": "W2",
  "stage": "00-common",
  "title": "HTML 文档结构、head 与元信息",
  "slug": "html-document-head",
  "lesson": "00-common/W02-html-document/03-html-document-head.md",
  "lab": "labs/W02/U03-html-document-head",
  "previous": "U02",
  "next": "U04",
  "outcome": "完成 NoteFlow 公共首页文档头和元信息",
  "requiresNode24": false
}
```

W1 的 `lesson` 和 `lab` 使用现有路径；U04–U96 按本计划的路径规则写入。manifest 必须包含 U01–U96，ID、周次、阶段和正文路径不可重复。

- [ ] **Step 2: 实现全量检查器**

`check-course-completeness.js` 使用 Node.js 内置 `fs`、`path` 和 `url`，执行以下检查并输出文件和 ID：

1. 读取 manifest 并验证 96 条记录。
2. 验证 ID 从 U01 到 U96 连续且无重复。
3. 验证每周正好两个单元，W1–W48 无缺失。
4. 验证每条 lesson 和 lab 路径存在。
5. 验证正文 13 个标题、任务卡、最小案例、NoteFlow 集成、阶段验收、扩展阅读和单元导航存在。
6. 验证实验 README 含环境、运行命令、预期结果和失败诊断。
7. 验证 previous/next 与 manifest 互相一致。
8. 执行课程 Markdown 相对链接检查。
9. 扫描正文和实验 README，拒绝未完成占位表达、真实凭据模式和调试残留。

- [ ] **Step 3: 将链接检查改为全量扫描**

删除 `check-course-links.js` 对 W1 两篇文件的硬编码，让它读取课程根目录内全部 Markdown。保留现有代码块忽略、外链忽略和行号错误输出。

- [ ] **Step 4: 更新课程入口和进度说明**

课程入口增加 96 单元总览、批次入口、进度文件和全量检查命令；学习路径每个周次的两个单元改为可点击链接；NoteFlow 演进地图增加 U03–U96 的阶段成果引用。

- [ ] **Step 5: 运行 B0 检查**

在 W1 仍是唯一完整新增正文的状态下，检查器必须报告 manifest 结构正确，同时准确列出 U03–U96 的缺失正文/实验，不得把缺失内容误报为通过。

Run:

```bash
. "$HOME/.nvm/nvm.sh"
nvm use 24
node web-fullstack-course/scripts/check-course-completeness.js
```

Expected: manifest 的 96 单元、48 周和 9 阶段统计正确；由于后续正文尚未创建，命令以非零状态退出并列出缺失清单。

### Task 2: 完成 B1：W2-W4 HTML 与可访问性

**Files:**
- Create: `web-fullstack-course/00-common/W02-html-document/03-html-document-head.md`
- Create: `web-fullstack-course/00-common/W02-html-document/04-text-semantics-headings.md`
- Create: `web-fullstack-course/00-common/W03-html-content-media/05-lists-links-tables.md`
- Create: `web-fullstack-course/00-common/W03-html-content-media/06-images-audio-video-embed.md`
- Create: `web-fullstack-course/00-common/W04-html-forms-accessibility/07-forms-inputs-attributes.md`
- Create: `web-fullstack-course/00-common/W04-html-forms-accessibility/08-dialog-template-aria.md`
- Create: `web-fullstack-course/labs/W02/U03-html-document-head/README.md`
- Create: `web-fullstack-course/labs/W02/U04-text-semantics-headings/README.md`
- Create: `web-fullstack-course/labs/W03/U05-lists-links-tables/README.md`
- Create: `web-fullstack-course/labs/W03/U06-images-audio-video-embed/README.md`
- Create: `web-fullstack-course/labs/W04/U07-forms-inputs-attributes/README.md`
- Create: `web-fullstack-course/labs/W04/U08-dialog-template-aria/README.md`
- Create: W2-W4 experiment source files described by each lab README
- Modify: `web-fullstack-course/00-common/README.md`

- [ ] **Step 1: 完成 U03-U04**

U03 使用 NoteFlow 公共首页建立 `html/head/body/title/meta/base/link/style/script/noscript/template/slot` 的文档头实验，验证资源基准 URL、元信息和脚本加载边界。U04 使用文章标题、段落、强调、引用、代码、时间、缩写和 `h1-h6` 建立可访问标题层级，并用浏览器 Elements/Accessibility 面板验收。

- [ ] **Step 2: 完成 U05-U06**

U05 用文章目录、作者信息和版本记录覆盖 `ul/ol/li/dl/dt/dd/a/table/caption/thead/tbody/tfoot/tr/th/td`、链接安全属性、下载和表头关联。U06 用真实 NoteFlow 内容图、响应式 `picture/source`、音视频字幕、iframe、canvas 和资源加载观察完成媒体页。

- [ ] **Step 3: 完成 U07-U08**

U07 实现登录、搜索和文章编辑表单，覆盖输入类型、`name/value/autocomplete/required/pattern/min/max/step/accept/multiple/checked/selected/disabled/readonly`、原生校验和 `FormData`。U08 实现折叠说明、确认对话框、模板内容、ARIA 状态、焦点顺序和键盘验收。

- [ ] **Step 4: 运行 B1 验证**

每个 lab README 至少提供一个浏览器或 Node.js 运行入口；正文必须写明文件位置、命令、预期结果和失败诊断。运行：

```bash
. "$HOME/.nvm/nvm.sh"
nvm use 24
node web-fullstack-course/scripts/check-course-completeness.js
```

Expected: U01–U08 的正文、实验、13 个章节和前后导航通过；剩余 U09–U96 被准确列出。

### Task 3: 完成 B2：W5-W12 CSS

**Files:**
- Create: `web-fullstack-course/01-css/W05/09-css-selectors-cascade.md`
- Create: `web-fullstack-course/01-css/W05/10-box-model-sizing-overflow.md`
- Create: `web-fullstack-course/01-css/W06/11-flow-display-positioning.md`
- Create: `web-fullstack-course/01-css/W06/12-flexbox-layout.md`
- Create: `web-fullstack-course/01-css/W07/13-grid-layout.md`
- Create: `web-fullstack-course/01-css/W07/14-stacking-context-z-index.md`
- Create: `web-fullstack-course/01-css/W08/15-typography-color-effects.md`
- Create: `web-fullstack-course/01-css/W08/16-css-functions-custom-properties.md`
- Create: `web-fullstack-course/01-css/W09/17-media-queries-mobile-print.md`
- Create: `web-fullstack-course/01-css/W09/18-container-logical-rtl-safe-area.md`
- Create: `web-fullstack-course/01-css/W10/19-advanced-selectors-layers.md`
- Create: `web-fullstack-course/01-css/W10/20-gradients-masks-blending.md`
- Create: `web-fullstack-course/01-css/W11/21-transitions-timing-functions.md`
- Create: `web-fullstack-course/01-css/W11/22-keyframes-transform-3d.md`
- Create: `web-fullstack-course/01-css/W12/23-scroll-driven-view-transitions.md`
- Create: `web-fullstack-course/01-css/W12/24-motion-performance-accessibility.md`
- Create: `web-fullstack-course/labs/W05/U09-css-selectors-cascade/README.md`
- Create: `web-fullstack-course/labs/W05/U10-box-model-sizing-overflow/README.md`
- Create: `web-fullstack-course/labs/W06/U11-flow-display-positioning/README.md`
- Create: `web-fullstack-course/labs/W06/U12-flexbox-layout/README.md`
- Create: `web-fullstack-course/labs/W07/U13-grid-layout/README.md`
- Create: `web-fullstack-course/labs/W07/U14-stacking-context-z-index/README.md`
- Create: `web-fullstack-course/labs/W08/U15-typography-color-effects/README.md`
- Create: `web-fullstack-course/labs/W08/U16-css-functions-custom-properties/README.md`
- Create: `web-fullstack-course/labs/W09/U17-media-queries-mobile-print/README.md`
- Create: `web-fullstack-course/labs/W09/U18-container-logical-rtl-safe-area/README.md`
- Create: `web-fullstack-course/labs/W10/U19-advanced-selectors-layers/README.md`
- Create: `web-fullstack-course/labs/W10/U20-gradients-masks-blending/README.md`
- Create: `web-fullstack-course/labs/W11/U21-transitions-timing-functions/README.md`
- Create: `web-fullstack-course/labs/W11/U22-keyframes-transform-3d/README.md`
- Create: `web-fullstack-course/labs/W12/U23-scroll-driven-view-transitions/README.md`
- Create: `web-fullstack-course/labs/W12/U24-motion-performance-accessibility/README.md`
- Modify: `web-fullstack-course/01-css/README.md`

- [ ] **Step 1: 完成 W5-W8 样式基础**

每篇教程都用 NoteFlow 文章卡片、导航、表单或后台两栏布局作为案例，写清选择器与层叠、盒模型、格式化上下文、Flexbox、Grid、字体、颜色、阴影、滤镜和 CSS 函数的运行结果。

- [ ] **Step 2: 完成 W9-W10 响应式与现代 CSS**

实验必须包含窄屏、宽屏、打印或 RTL 中至少两种观察状态，并解释容器查询、逻辑属性、安全区、`:is()`、`:where()`、`:has()`、`@layer`、遮罩和混合模式的兼容边界。

- [ ] **Step 3: 完成 W11-W12 动画与性能**

每种动画写明使用场景、性能代价、`prefers-reduced-motion` 行为、关闭方式和 DevTools 验证。至少一个实验用 Performance 面板说明布局抖动、长任务或合成层。

- [ ] **Step 4: 运行 B2 验证**

验证 CSS 文件存在、Markdown 链接无断链、每个实验有视口/样式观察和失败诊断；运行 Node 24 下的完整检查器。

### Task 4: 完成 B3：W13-W20 浏览器、JavaScript、TypeScript 与工具

**Files:**
- Create: `web-fullstack-course/02-browser-javascript/W13/25-browser-rendering-lifecycle.md`
- Create: `web-fullstack-course/02-browser-javascript/W13/26-dom-cssom-layout-paint.md`
- Create: `web-fullstack-course/02-browser-javascript/W14/27-dom-query-create-update.md`
- Create: `web-fullstack-course/02-browser-javascript/W14/28-events-delegation-forms.md`
- Create: `web-fullstack-course/02-browser-javascript/W15/29-storage-url-history-file.md`
- Create: `web-fullstack-course/02-browser-javascript/W15/30-fetch-request-response-formdata.md`
- Create: `web-fullstack-course/02-browser-javascript/W16/31-workers-service-worker-observers.md`
- Create: `web-fullstack-course/02-browser-javascript/W16/32-js-execution-types-control-flow.md`
- Create: `web-fullstack-course/03-typescript-tooling/W17/33-functions-closures-this.md`
- Create: `web-fullstack-course/03-typescript-tooling/W17/34-prototypes-classes-collections.md`
- Create: `web-fullstack-course/03-typescript-tooling/W18/35-promises-concurrency-cancellation.md`
- Create: `web-fullstack-course/03-typescript-tooling/W18/36-event-loop-retry-race.md`
- Create: `web-fullstack-course/03-typescript-tooling/W19/37-esm-commonjs-package.md`
- Create: `web-fullstack-course/03-typescript-tooling/W19/38-node-files-http-stream-cli.md`
- Create: `web-fullstack-course/03-typescript-tooling/W20/39-typescript-types-narrowing.md`
- Create: `web-fullstack-course/03-typescript-tooling/W20/40-pnpm-vite-env-build.md`
- Create: `web-fullstack-course/labs/W13/U25-browser-rendering-lifecycle/README.md`
- Create: `web-fullstack-course/labs/W13/U26-dom-cssom-layout-paint/README.md`
- Create: `web-fullstack-course/labs/W14/U27-dom-query-create-update/README.md`
- Create: `web-fullstack-course/labs/W14/U28-events-delegation-forms/README.md`
- Create: `web-fullstack-course/labs/W15/U29-storage-url-history-file/README.md`
- Create: `web-fullstack-course/labs/W15/U30-fetch-request-response-formdata/README.md`
- Create: `web-fullstack-course/labs/W16/U31-workers-service-worker-observers/README.md`
- Create: `web-fullstack-course/labs/W16/U32-js-execution-types-control-flow/README.md`
- Create: `web-fullstack-course/labs/W17/U33-functions-closures-this/README.md`
- Create: `web-fullstack-course/labs/W17/U34-prototypes-classes-collections/README.md`
- Create: `web-fullstack-course/labs/W18/U35-promises-concurrency-cancellation/README.md`
- Create: `web-fullstack-course/labs/W18/U36-event-loop-retry-race/README.md`
- Create: `web-fullstack-course/labs/W19/U37-esm-commonjs-package/README.md`
- Create: `web-fullstack-course/labs/W19/U38-node-files-http-stream-cli/README.md`
- Create: `web-fullstack-course/labs/W20/U39-typescript-types-narrowing/README.md`
- Create: `web-fullstack-course/labs/W20/U40-pnpm-vite-env-build/README.md`
- Modify: `web-fullstack-course/02-browser-javascript/README.md`
- Modify: `web-fullstack-course/03-typescript-tooling/README.md`

- [ ] **Step 1: 完成浏览器与原生交互单元**

实验形成两个独立案例：原生阅读清单和可取消的搜索聚合器。正文必须覆盖 DOM、事件委托、Storage、Fetch、AbortController、观察器、同源策略、XSS/CSRF 基础和 DevTools 证据。

- [ ] **Step 2: 完成 JavaScript 运行时单元**

实验使用 Node.js 24 ESM 完成命令行内容查询工具，覆盖闭包、`this`、原型链、Promise 组合、并发限制、重试、退避、异步竞态、模块缓存和错误传播。

- [ ] **Step 3: 完成 TypeScript 与工具单元**

实验完成类型收窄、模块边界、声明文件、pnpm/Vite 环境变量和构建产物检查；每个命令注明 Node 24 和 pnpm 12 的前置条件。

- [ ] **Step 4: 运行 B3 验证**

运行脚本语法检查、原生案例启动、Node 24 CLI 运行、类型检查和链接/章节检查。不能用框架代码替代三个 JavaScript 必做案例。

### Task 5: 完成 B4：W21-W26 React

**Files:**
- Create: `web-fullstack-course/04-react/W21/41-jsx-components-composition.md`
- Create: `web-fullstack-course/04-react/W21/42-lists-events-controlled-components.md`
- Create: `web-fullstack-course/04-react/W22/43-usestate-state-lifting.md`
- Create: `web-fullstack-course/04-react/W22/44-forms-validation-file-errors.md`
- Create: `web-fullstack-course/04-react/W23/45-effects-refs-memo.md`
- Create: `web-fullstack-course/04-react/W23/46-context-reducer-custom-hooks.md`
- Create: `web-fullstack-course/04-react/W24/47-router-nested-permission-routes.md`
- Create: `web-fullstack-course/04-react/W24/48-tanstack-query-server-state.md`
- Create: `web-fullstack-course/04-react/W25/49-zustand-persistence-boundaries.md`
- Create: `web-fullstack-course/04-react/W25/50-component-hook-a11y-testing.md`
- Create: `web-fullstack-course/04-react/W26/51-performance-lazy-virtual-error-boundary.md`
- Create: `web-fullstack-course/04-react/W26/52-react-19-rendering-model.md`
- Create: `web-fullstack-course/labs/W21/U41-jsx-components-composition/README.md`
- Create: `web-fullstack-course/labs/W21/U42-lists-events-controlled-components/README.md`
- Create: `web-fullstack-course/labs/W22/U43-usestate-state-lifting/README.md`
- Create: `web-fullstack-course/labs/W22/U44-forms-validation-file-errors/README.md`
- Create: `web-fullstack-course/labs/W23/U45-effects-refs-memo/README.md`
- Create: `web-fullstack-course/labs/W23/U46-context-reducer-custom-hooks/README.md`
- Create: `web-fullstack-course/labs/W24/U47-router-nested-permission-routes/README.md`
- Create: `web-fullstack-course/labs/W24/U48-tanstack-query-server-state/README.md`
- Create: `web-fullstack-course/labs/W25/U49-zustand-persistence-boundaries/README.md`
- Create: `web-fullstack-course/labs/W25/U50-component-hook-a11y-testing/README.md`
- Create: `web-fullstack-course/labs/W26/U51-performance-lazy-virtual-error-boundary/README.md`
- Create: `web-fullstack-course/labs/W26/U52-react-19-rendering-model/README.md`
- Modify: `web-fullstack-course/04-react/README.md`

- [ ] **Step 1: 按相同 NoteFlow 页面推进组件能力**

React 实验依次完成文章列表、编辑器、权限路由、服务端状态和团队后台，不把示例拆成互不相关的计数器。

- [ ] **Step 2: 覆盖状态、测试与性能**

每篇正文说明本地状态、派生状态、服务端状态和错误恢复边界；测试单元包含组件、Hook、可访问性和 Playwright 主流程；性能单元提供 Profiler 或浏览器性能证据。

- [ ] **Step 3: 运行 B4 验证**

在 Node 24/pnpm 12 环境中运行安装、类型检查、测试、构建和课程检查。依赖下载失败时记录环境问题，不通过删除测试或放宽断言制造成功。

### Task 6: 完成 B5：W27-W32 Vue 3

**Files:**
- Create: `web-fullstack-course/05-vue/W27/53-sfc-template-reactivity.md`
- Create: `web-fullstack-course/05-vue/W27/54-ref-reactive-computed-watch.md`
- Create: `web-fullstack-course/05-vue/W28/55-props-emits-lifecycle-template-ref.md`
- Create: `web-fullstack-course/05-vue/W28/56-slots-dynamic-async-teleport.md`
- Create: `web-fullstack-course/05-vue/W29/57-composition-api-composables.md`
- Create: `web-fullstack-course/05-vue/W29/58-forms-validation-file-errors.md`
- Create: `web-fullstack-course/05-vue/W30/59-router-nested-navigation-guards.md`
- Create: `web-fullstack-course/05-vue/W30/60-pinia-store-persistence.md`
- Create: `web-fullstack-course/05-vue/W31/61-vueuse-server-state-requests.md`
- Create: `web-fullstack-course/05-vue/W31/62-vue-test-utils-vitest.md`
- Create: `web-fullstack-course/05-vue/W32/63-performance-async-virtual-debug.md`
- Create: `web-fullstack-course/05-vue/W32/64-nuxt-ssr-seo-hydration.md`
- Create: `web-fullstack-course/labs/W27/U53-sfc-template-reactivity/README.md`
- Create: `web-fullstack-course/labs/W27/U54-ref-reactive-computed-watch/README.md`
- Create: `web-fullstack-course/labs/W28/U55-props-emits-lifecycle-template-ref/README.md`
- Create: `web-fullstack-course/labs/W28/U56-slots-dynamic-async-teleport/README.md`
- Create: `web-fullstack-course/labs/W29/U57-composition-api-composables/README.md`
- Create: `web-fullstack-course/labs/W29/U58-forms-validation-file-errors/README.md`
- Create: `web-fullstack-course/labs/W30/U59-router-nested-navigation-guards/README.md`
- Create: `web-fullstack-course/labs/W30/U60-pinia-store-persistence/README.md`
- Create: `web-fullstack-course/labs/W31/U61-vueuse-server-state-requests/README.md`
- Create: `web-fullstack-course/labs/W31/U62-vue-test-utils-vitest/README.md`
- Create: `web-fullstack-course/labs/W32/U63-performance-async-virtual-debug/README.md`
- Create: `web-fullstack-course/labs/W32/U64-nuxt-ssr-seo-hydration/README.md`
- Modify: `web-fullstack-course/05-vue/README.md`

- [ ] **Step 1: 用同一业务页面完成 Vue 主线**

Vue 实验实现与 React 对应的登录、列表、搜索筛选、编辑表单、权限状态和后台首页，明确对应组件和数据流。

- [ ] **Step 2: 覆盖响应式、Pinia、Router、测试和 Nuxt**

正文必须解释 Options API 与 Composition API、响应式依赖、slots、composable、Pinia 持久化、导航守卫、Vitest、Hydration 边界和错误恢复。

- [ ] **Step 3: 运行 B5 验证**

运行 Vue 类型检查、Vitest、构建、关键页面启动和课程检查；在课程地图中增加 React/Vue 对照入口。

### Task 7: 完成 B6：W33-W37 前端工程化

**Files:**
- Create: `web-fullstack-course/06-frontend-engineering/W33/65-pnpm-workspace-monorepo-boundaries.md`
- Create: `web-fullstack-course/06-frontend-engineering/W33/66-shared-types-components-tools.md`
- Create: `web-fullstack-course/06-frontend-engineering/W34/67-eslint-flat-config-prettier-hooks.md`
- Create: `web-fullstack-course/06-frontend-engineering/W34/68-typescript-project-references-paths.md`
- Create: `web-fullstack-course/06-frontend-engineering/W35/69-design-tokens-component-css-a11y.md`
- Create: `web-fullstack-course/06-frontend-engineering/W35/70-component-workbench-docs.md`
- Create: `web-fullstack-course/06-frontend-engineering/W36/71-unit-component-mock-e2e-visual.md`
- Create: `web-fullstack-course/06-frontend-engineering/W36/72-test-data-isolation-flaky.md`
- Create: `web-fullstack-course/06-frontend-engineering/W37/73-bundle-vitals-resource-optimization.md`
- Create: `web-fullstack-course/06-frontend-engineering/W37/74-ci-cache-security-artifacts-rollback.md`
- Create: `web-fullstack-course/labs/W33/U65-pnpm-workspace-monorepo-boundaries/README.md`
- Create: `web-fullstack-course/labs/W33/U66-shared-types-components-tools/README.md`
- Create: `web-fullstack-course/labs/W34/U67-eslint-flat-config-prettier-hooks/README.md`
- Create: `web-fullstack-course/labs/W34/U68-typescript-project-references-paths/README.md`
- Create: `web-fullstack-course/labs/W35/U69-design-tokens-component-css-a11y/README.md`
- Create: `web-fullstack-course/labs/W35/U70-component-workbench-docs/README.md`
- Create: `web-fullstack-course/labs/W36/U71-unit-component-mock-e2e-visual/README.md`
- Create: `web-fullstack-course/labs/W36/U72-test-data-isolation-flaky/README.md`
- Create: `web-fullstack-course/labs/W37/U73-bundle-vitals-resource-optimization/README.md`
- Create: `web-fullstack-course/labs/W37/U74-ci-cache-security-artifacts-rollback/README.md`
- Modify: `web-fullstack-course/06-frontend-engineering/README.md`

- [ ] **Step 1: 创建可复现 Monorepo 实验**

实验使用 Node 24 和 pnpm 12，展示 workspace 依赖边界、共享类型、组件包和工具包；命令必须包含安装、构建和类型检查。

- [ ] **Step 2: 建立质量和测试门禁案例**

教程覆盖 ESLint Flat Config、Prettier、提交检查、测试隔离、接口 Mock、E2E、视觉回归和 flaky 排查，且每篇都有 CI 或本地命令证据。

- [ ] **Step 3: 完成性能与发布单元**

实验使用 Bundle 分析或构建产物检查解释资源优化、Core Web Vitals、CI 缓存、依赖安全、制品和回滚。

- [ ] **Step 4: 运行 B6 验证**

运行 workspace 安装、类型检查、Lint、单元测试、构建和校验器；记录不能连接外部服务时的本地替代验证。

### Task 8: 完成 B7：W38-W43 后端与数据库

**Files:**
- Create: `web-fullstack-course/07-backend/W38/75-node-runtime-esm-process-env.md`
- Create: `web-fullstack-course/07-backend/W38/76-nest-modules-controllers-providers-di.md`
- Create: `web-fullstack-course/07-backend/W39/77-rest-resources-status-errors.md`
- Create: `web-fullstack-course/07-backend/W39/78-zod-dto-openapi.md`
- Create: `web-fullstack-course/07-backend/W40/79-postgresql-tables-relations-constraints.md`
- Create: `web-fullstack-course/07-backend/W40/80-query-pagination-filter-search.md`
- Create: `web-fullstack-course/07-backend/W41/81-prisma-schema-migrations-adapter.md`
- Create: `web-fullstack-course/07-backend/W41/82-prisma-query-transactions-indexes-n-plus-one.md`
- Create: `web-fullstack-course/07-backend/W42/83-password-auth-cookie-token-rotation.md`
- Create: `web-fullstack-course/07-backend/W42/84-cors-csrf-rate-limit-audit.md`
- Create: `web-fullstack-course/07-backend/W43/85-organization-isolation-rbac.md`
- Create: `web-fullstack-course/07-backend/W43/86-membership-invitation-permission-tests.md`
- Create: `web-fullstack-course/labs/W38/U75-node-runtime-esm-process-env/README.md`
- Create: `web-fullstack-course/labs/W38/U76-nest-modules-controllers-providers-di/README.md`
- Create: `web-fullstack-course/labs/W39/U77-rest-resources-status-errors/README.md`
- Create: `web-fullstack-course/labs/W39/U78-zod-dto-openapi/README.md`
- Create: `web-fullstack-course/labs/W40/U79-postgresql-tables-relations-constraints/README.md`
- Create: `web-fullstack-course/labs/W40/U80-query-pagination-filter-search/README.md`
- Create: `web-fullstack-course/labs/W41/U81-prisma-schema-migrations-adapter/README.md`
- Create: `web-fullstack-course/labs/W41/U82-prisma-query-transactions-indexes-n-plus-one/README.md`
- Create: `web-fullstack-course/labs/W42/U83-password-auth-cookie-token-rotation/README.md`
- Create: `web-fullstack-course/labs/W42/U84-cors-csrf-rate-limit-audit/README.md`
- Create: `web-fullstack-course/labs/W43/U85-organization-isolation-rbac/README.md`
- Create: `web-fullstack-course/labs/W43/U86-membership-invitation-permission-tests/README.md`
- Modify: `web-fullstack-course/07-backend/README.md`

- [ ] **Step 1: 完成 Node.js、NestJS、REST 和 OpenAPI**

实验建立 NoteFlow API 的模块、控制器、应用服务和统一错误结构；正文必须解释 HTTP 状态码、输入校验、DTO、OpenAPI 和数据库异常不可直接外泄。

- [ ] **Step 2: 完成 PostgreSQL 与 Prisma**

实验提供表结构、约束、迁移、Seed、分页、筛选、索引、事务、连接池和 `EXPLAIN` 证据；N+1 必须有可观察的查询差异。

- [ ] **Step 3: 完成认证、组织隔离和 RBAC**

实验覆盖密码哈希、短时 Access Token、HttpOnly Refresh Token、轮换/撤销、CORS、CSRF、限流、审计、组织成员关系和角色权限测试。

- [ ] **Step 4: 运行 B7 验证**

在本地 PostgreSQL/Redis 可用时运行迁移、Seed、API 测试和权限测试；服务不可用时，至少运行 schema、静态检查和不依赖外部服务的单元测试，并明确未运行项。

### Task 9: 完成 B8：W44-W48 全栈交付

**Files:**
- Create: `web-fullstack-course/08-fullstack-delivery/W44/87-next-app-router-server-components-metadata.md`
- Create: `web-fullstack-course/08-fullstack-delivery/W44/88-ssr-cache-revalidation-hydration.md`
- Create: `web-fullstack-course/08-fullstack-delivery/W45/89-redis-cache-invalidation-session.md`
- Create: `web-fullstack-course/08-fullstack-delivery/W45/90-bullmq-retry-idempotency-dead-letter.md`
- Create: `web-fullstack-course/08-fullstack-delivery/W46/91-file-upload-object-storage-safety.md`
- Create: `web-fullstack-course/08-fullstack-delivery/W46/92-nest-e2e-playwright-test-db.md`
- Create: `web-fullstack-course/08-fullstack-delivery/W47/93-docker-compose-multistage-nginx.md`
- Create: `web-fullstack-course/08-fullstack-delivery/W47/94-github-actions-health-deploy.md`
- Create: `web-fullstack-course/08-fullstack-delivery/W48/95-performance-security-observability.md`
- Create: `web-fullstack-course/08-fullstack-delivery/W48/96-graduation-defense-fault-drill.md`
- Create: `web-fullstack-course/labs/W44/U87-next-app-router-server-components-metadata/README.md`
- Create: `web-fullstack-course/labs/W44/U88-ssr-cache-revalidation-hydration/README.md`
- Create: `web-fullstack-course/labs/W45/U89-redis-cache-invalidation-session/README.md`
- Create: `web-fullstack-course/labs/W45/U90-bullmq-retry-idempotency-dead-letter/README.md`
- Create: `web-fullstack-course/labs/W46/U91-file-upload-object-storage-safety/README.md`
- Create: `web-fullstack-course/labs/W46/U92-nest-e2e-playwright-test-db/README.md`
- Create: `web-fullstack-course/labs/W47/U93-docker-compose-multistage-nginx/README.md`
- Create: `web-fullstack-course/labs/W47/U94-github-actions-health-deploy/README.md`
- Create: `web-fullstack-course/labs/W48/U95-performance-security-observability/README.md`
- Create: `web-fullstack-course/labs/W48/U96-graduation-defense-fault-drill/README.md`
- Modify: `web-fullstack-course/08-fullstack-delivery/README.md`

- [ ] **Step 1: 完成公共内容侧和缓存**

实验说明 Next.js App Router、Server Components、Metadata、SSR、缓存和重新验证如何接入 NoteFlow 已有 API，并明确 Hydration 边界。

- [ ] **Step 2: 完成队列、文件和全链路测试**

实验实现 Redis 缓存失效、BullMQ 重试/幂等/死信、文件上传安全、Nest E2E、Playwright 主流程和测试数据库隔离。

- [ ] **Step 3: 完成 Docker、CI、可观测性和答辩**

实验提供 Compose、多阶段镜像、Nginx、健康检查、GitHub Actions、云服务器部署说明、故障日志和回滚证据；毕业单元给出完整答辩清单。

- [ ] **Step 4: 运行 B8 验证**

在本地 Docker 可用时启动完整系统并运行健康检查、E2E 和关键路径；部署不执行到真实远端，只验证配置、构建和本地回滚演练。

### Task 10: 全量收口与最终验收

**Files:**
- Modify: `web-fullstack-course/README.md`
- Modify: `web-fullstack-course/00-course-map/01-learning-path.md`
- Modify: `web-fullstack-course/00-course-map/02-noteflow-evolution.md`
- Modify: `web-fullstack-course/00-course-map/03-assessment.md`
- Modify: `web-fullstack-course/00-course-map/04-version-baseline.md`
- Modify: `web-fullstack-course/00-common/README.md`
- Modify: `web-fullstack-course/01-css/README.md`
- Modify: `web-fullstack-course/02-browser-javascript/README.md`
- Modify: `web-fullstack-course/03-typescript-tooling/README.md`
- Modify: `web-fullstack-course/04-react/README.md`
- Modify: `web-fullstack-course/05-vue/README.md`
- Modify: `web-fullstack-course/06-frontend-engineering/README.md`
- Modify: `web-fullstack-course/07-backend/README.md`
- Modify: `web-fullstack-course/08-fullstack-delivery/README.md`
- Modify: `web-fullstack-course/progress/README.md`

- [ ] **Step 1: 更新所有阶段入口**

每个阶段 README 列出对应周次、单元标题、实验入口、阶段成果和验收条件；课程入口能到达所有阶段和全量检查命令。

- [ ] **Step 2: 运行全量结构检查**

```bash
. "$HOME/.nvm/nvm.sh"
nvm use 24
node web-fullstack-course/scripts/check-course-completeness.js
node web-fullstack-course/scripts/check-course-links.js
git diff --check
```

Expected:

```text
课程阶段：9
课程周次：48
单元正文：96
实验入口：96
固定章节完整：96/96
相对链接通过：是
重复单元 ID：0
缺失阶段/周次：0
```

- [ ] **Step 3: 运行可执行实验检查**

按 manifest 找出 `requiresNode24` 为真的实验，逐个运行 README 中的语法检查、类型检查、测试或启动命令。对依赖 PostgreSQL、Redis、浏览器或 Docker 的实验，先检查本地服务状态，未启动的服务不能被写成“通过”。

- [ ] **Step 4: 做内容和安全审查**

检查：

- 每篇正文不是模板原文复制；
- 每篇有独立的 NoteFlow 场景和失败案例；
- 没有真实凭据、生产数据、调试输出和构建产物；
- React/Vue 功能对照一致；
- 权限、组织隔离、数据库迁移、测试和部署门禁在正文与验收中出现；
- 当前工作区没有无关文件被暂存。

- [ ] **Step 5: 提交最终批次**

```bash
git add web-fullstack-course
git commit -m "docs: complete 48-week fullstack course"
```

提交前输出最终统计，提交后再次运行结构检查并记录提交号。

## Verification Checklist

- [ ] manifest 包含 U01–U96，96 个 ID 无重复。
- [ ] W1–W48 每周恰好两个单元。
- [ ] 96 篇正文均包含 13 个固定章节。
- [ ] 96 个实验入口均存在并有运行说明。
- [ ] 课程入口、阶段 README、周次地图和单元前后导航无断链。
- [ ] W1 已有内容和用户修改未被回退。
- [ ] Node.js 24 下全量校验通过。
- [ ] 依赖外部服务的验证项有真实状态记录。
- [ ] 没有秘密、构建产物、运行日志或无关文件。
- [ ] 最终提交只包含课程全量交付所需文件。
