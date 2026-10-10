# HTML 模块教材级重写设计

## 1. 目标

将 `web-fullstack-course/01-html/` 从“知识概览与集中示例”重写为零基础学习者可以独立完成的教材级 HTML 模块。

完成后的 HTML 模块必须做到：

- 系统覆盖现行 HTML 文档、元素、属性、默认行为、DOM 映射和浏览器解析结果；
- 每个重要知识点不仅被提及，还包含机制解释、可运行案例、反例、故障诊断、练习和验收；
- 使用“邻里集市”持续项目连接商品详情、媒体、数据表、发布表单、收藏与预约等真实场景；
- 保留现有 8 个章节入口路径，避免破坏全书导航和覆盖地图；
- 只交付 Markdown 教程，不创建 `labs/`、独立源码项目、依赖配置或锁文件。

## 2. 已确认问题

当前 HTML 模块包含 8 个正文文件和 1 个模块 README。现有材料具有以下基础：

- 已建立邻里集市主线；
- 已包含较完整的元素参考；
- 已提供部分完整 HTML/JavaScript 示例；
- 已说明静态演示、内存状态、服务端权限等边界。

但当前形态仍不足以作为完整教程：

- 单章同时承载过多知识，很多知识点只有一至三句定义；
- 大型完整示例集中在章节后部，缺少从最小行为到综合结果的渐进构建；
- 元素、属性、默认行为、内容属性与 DOM 属性之间的关系没有逐项展开；
- 反例和排错数量不足，学习者难以形成“现象到根因”的判断；
- 媒体、表格、表单、DOM、无障碍等六章尚未统一采用完整教学结构；
- 元素索引解决了“查得到”，但没有解决“为什么这样用、怎样验证、何时不能用”。

因此，本次重写不以增加标题或行数为主要目标，而以知识点能否被解释、运行、破坏、修复和验收为完成标准。

## 3. 读者与学习边界

### 3.1 目标读者

- 没有前端开发经验；
- 能创建和保存文本文件；
- 已完成起步卷的第一张网页与终端基础；
- 不了解框架、数据库和复杂 JavaScript。

### 3.2 教学边界

- HTML 模块允许使用少量原生 CSS 和 JavaScript观察默认行为；
- JavaScript 代码必须逐段解释输入、状态和输出，不假设学习者已经掌握语言细节；
- 框架、后端、数据库和部署只说明职责边界，不提前作为练习前置；
- 静态页面、内存收藏和内存预约必须明确标为教学状态；
- 真实认证、授权、并发预约和数据持久化留到对应后续模块。

## 4. 内容架构

采用“8 个章入口 + 24 篇详细教程 + 1 份覆盖矩阵”的结构。

### 4.1 章入口

保留现有路径：

```text
01-document-text.md
02-structure-links-lists.md
03-images-media-embedding.md
04-tables-data.md
05-forms-validation.md
06-interactive-dom.md
07-accessibility-seo.md
08-html-element-reference.md
```

每个章入口负责：

- 说明本章解决的用户问题；
- 展示详细教程学习顺序；
- 给出本章知识地图和前置依赖；
- 串联邻里集市的阶段成果；
- 提供章节综合任务和总验收；
- 导航到上一章、下一章和模块入口。

章入口不再用短段落代替详细教学。核心理论、分步案例和专项练习全部进入详细教程。

### 4.2 24 篇详细教程

#### 第一章：文档、解析与文本

目录：`01-document-text/`

1. `01-parser-document-model.md`
   - HTML 语法、标签、元素、属性、内容类别；
   - `doctype`、`html`、`head`、`body`；
   - 源文件、token、解析、错误恢复、DOM；
   - 空元素、布尔属性、字符引用、注释和空白折叠。
2. `02-head-metadata-resources.md`
   - `title`、`meta`、`base`、`link`、`style`、`script`、`noscript`；
   - 字符编码、视口、描述、资源关系；
   - 普通脚本、`defer`、`async`、module 的加载顺序；
   - `base` 对相对 URL 和片段的影响。
3. `03-text-semantics-i18n.md`
   - 标题、段落、换行、主题分隔；
   - 强调、引用、术语、代码、键盘输入和程序输出；
   - `time`、`data`、`abbr`、修订元素；
   - `lang`、`dir`、`bdi`、`bdo`、`ruby`、`wbr`。

#### 第二章：页面结构、链接与列表

目录：`02-structure-links-lists/`

4. `01-landmarks-headings-outline.md`
   - `header`、`nav`、`main`、`section`、`article`、`aside`、`footer`、`address`、`search`；
   - `h1` 至 `h6`、标题层级和地标；
   - 页面级结构与文章内部结构；
   - 屏幕阅读器导航和常见误用。
5. `02-urls-links-navigation.md`
   - URL 的协议、主机、端口、路径、查询和片段；
   - 相对、根相对和绝对 URL；
   - `a` 的 `href`、`target`、`rel`、`download`、`hreflang`、`type`、`referrerpolicy`；
   - 链接与按钮、安全跳转、跨源边界。
6. `03-lists-figures-content-groups.md`
   - `ul`、`ol`、`li`、`menu`、`dl`、`dt`、`dd`；
   - `div`、`figure`、`figcaption`、`blockquote`、`pre`；
   - 嵌套列表、编号、名称值关系和内容分组选择。

#### 第三章：图片、媒体与嵌入

目录：`03-images-media-embedding/`

7. `01-images-responsive-performance.md`
   - `img`、`picture`、图片用 `source`；
   - `alt`、`width`、`height`、`srcset`、`sizes`；
   - `loading`、`decoding`、`fetchpriority`、`crossorigin`、`referrerpolicy`；
   - 响应式图片、布局偏移、解码和失败判断。
8. `02-audio-video-tracks.md`
   - `audio`、`video`、媒体用 `source`、`track`；
   - `controls`、`preload`、`autoplay`、`muted`、`poster`、`playsinline`；
   - 字幕、章节、描述和 WebVTT；
   - `play()` Promise、媒体状态和事件。
9. `03-embedding-svg-canvas.md`
   - `iframe`、`object`、`embed`；
   - `sandbox`、`allow`、跨源和嵌入拒绝；
   - `map`、`area`；
   - HTML 中的 SVG、Canvas 和文本替代。

#### 第四章：表格与二维数据

目录：`04-tables-data/`

10. `01-table-model-headers-spans.md`
    - `table`、`caption`、`thead`、`tbody`、`tfoot`、`tr`、`th`、`td`；
    - 行表头、列表头、`scope`、`headers`；
    - `colspan`、`rowspan`、`colgroup`、`col`；
    - 表格网格模型和复杂表头拆分。
11. `02-table-accessibility-responsive-dom.md`
    - 小屏滚动、长内容、打印和表格外观边界；
    - 键盘、读屏与表头关联测试；
    - `HTMLTableElement`、行与单元格集合、插入删除 API；
    - 从内存数据安全生成表格。

#### 第五章：表单与验证

目录：`05-forms-validation/`

12. `01-form-submission-successful-controls.md`
    - `form` 的 `action`、`method`、`enctype`、`target`、`autocomplete`、`novalidate`；
    - `name`、`value`、成功控件和提交按钮；
    - GET、POST、查询参数和请求体；
    - `FormData`、同名多值、禁用控件与文件。
13. `02-input-types-values.md`
    - 现行 `input` 类型逐类讲解；
    - 文本、搜索、邮箱、URL、电话、密码；
    - 数字、范围、日期、时间、月、周、颜色；
    - checkbox、radio、file、hidden 和各类按钮；
    - 当前值、默认值、`checked`、`selected` 和 DOM 属性。
14. `03-form-controls-groups.md`
    - `label`、`textarea`、`select`、`option`、`optgroup`；
    - `button`、`fieldset`、`legend`、`datalist`；
    - `output`、`progress`、`meter`；
    - `disabled`、`readonly`、`multiple` 和分组行为。
15. `04-constraint-validation-files.md`
    - `required`、`pattern`、`min`、`max`、`step`、长度约束；
    - `accept`、`multiple`、文件类型和大小边界；
    - ValidityState、`checkValidity()`、`reportValidity()`、`setCustomValidity()`；
    - 原生提示、自定义错误、业务校验和服务端校验边界。

#### 第六章：原生交互、DOM 与事件

目录：`06-interactive-dom/`

16. `01-native-interactive-elements.md`
    - `details`、`summary`、`dialog`、popover；
    - 模态与非模态、顶层、关闭请求和焦点恢复；
    - 原生默认行为、特性检测与降级。
17. `02-dom-query-mutation.md`
    - `getElementById`、`querySelector`、`querySelectorAll`；
    - `createElement`、`createTextNode`、`append`、`prepend`、`remove`、`replaceChildren`；
    - `classList`、`dataset`、`getAttribute`、`setAttribute`；
    - 属性、DOM 属性、状态和界面同步。
18. `03-events-forms-delegation.md`
    - `addEventListener`、事件对象、默认行为；
    - 捕获、目标、冒泡；
    - `target`、`currentTarget`、`closest` 和事件委托；
    - click、input、change、submit、invalid、toggle、close。
19. `04-templates-web-components.md`
    - `template`、DocumentFragment、克隆和安全文本插入；
    - 自定义元素生命周期；
    - Shadow DOM、`slot`、投影和 `slotchange`；
    - 组件边界与浏览器兼容性。

#### 第七章：无障碍、可发现性与质量

目录：`07-accessibility-seo/`

20. `01-accessible-name-landmarks-keyboard.md`
    - 原生语义、角色、地标和标题导航；
    - 可访问名称、描述、状态；
    - 键盘模式、焦点顺序、焦点可见和跳过导航；
    - ARIA 的适用边界。
21. `02-dynamic-status-focus-media.md`
    - `status`、`alert`、live region、`aria-busy`；
    - 表单错误、动态列表、对话框焦点恢复；
    - 图片替代、字幕、图表文字和 Canvas 替代；
    - 缩放、触控、颜色和减少动效的跨模块要求。
22. `03-metadata-seo-structured-data.md`
    - 标题、描述、canonical、robots、站点地图和有效链接；
    - 正确 HTTP 状态、抓取与索引的差异；
    - Microdata、JSON-LD 和可见内容一致性；
    - SSR/客户端渲染只讲边界，不提前实现框架。

#### 第八章：元素参考、历史与迁移

目录：`08-html-element-reference/`

23. `01-element-attribute-api-index.md`
    - 现行元素按职责检索；
    - 全局属性、元素专属属性、DOM 接口和关键默认行为；
    - 使用条件、内容模型、兼容标记和对应教程链接。
24. `02-deprecated-history-migration.md`
    - 废弃与非标准元素、属性的历史用途；
    - `font`、`center`、`frameset`、`marquee` 等旧写法；
    - 当前替代方案和迁移步骤；
    - “浏览器仍能显示”与“适合新代码”的区别。

## 5. 详细教程的固定结构

每篇详细教程使用 13 个固定板块：

1. 任务背景；
2. 学习目标；
3. 预备知识；
4. 核心理论；
5. 元素、属性、API 或配置清单；
6. 最小可运行案例；
7. 邻里集市集成案例；
8. 常见错误与排查路径；
9. 课后题；
10. 实践练习；
11. 阶段验收；
12. 常见问题；
13. 扩展阅读。

在固定板块之外，每篇还必须包含任务卡、“我现在能做到什么”和前后导航。

## 6. 知识点深度契约

一个知识点只有同时满足以下项目，才算完成教学覆盖：

1. **目的**：解决什么内容或交互问题；
2. **语法**：最小正确写法和允许出现的位置；
3. **模型**：浏览器怎样解析、映射为 DOM 或执行默认行为；
4. **属性/API**：当前值、默认值、相关方法和事件；
5. **正确案例**：可以直接观察的最小案例；
6. **反例**：看似有效但语义、行为、安全或可访问性有问题的写法；
7. **诊断**：通过 Elements、Accessibility、Console、Network 或命令找到证据；
8. **项目应用**：它如何进入邻里集市；
9. **边界**：兼容性、无障碍、安全、性能或服务端职责；
10. **练习与验收**：学习者能在新场景独立完成并解释。

仅在表格中出现名称、只给一句定义、只在大型示例中使用，都不算完成详细教学。

## 7. 案例设计标准

### 7.1 每篇教程的案例

每篇详细教程至少包含：

- 一个最小行为案例；
- 一个逐步扩展案例；
- 一个邻里集市集成案例；
- 一个错误案例；
- 一个恢复或复验案例。

案例代码必须注明：

- 学习者个人练习目录中的文件位置；
- 打开或运行方式；
- 预期页面、DOM、请求、日志或控制台结果；
- 停止或恢复方式；
- 失败时优先查看的证据。

### 7.2 代码完整性

- 主流程给完整、可复制的文件；
- 局部片段明确插入位置和依赖；
- 错误代码与正确代码分开标记；
- JavaScript 使用当前章节已经解释的语言能力；
- 用户输入使用 `textContent`、DOM API 或结构化解析，不直接拼入不可信 HTML；
- 示例不包含真实密钥、真实个人信息和生产数据。

### 7.3 项目连续性

HTML 模块中的邻里集市按下列顺序演进：

```text
商品说明
  -> 可导航详情
  -> 商品媒体
  -> 商品数据表
  -> 发布表单
  -> 收藏与预约确认
  -> 可访问查询页
  -> HTML 阶段综合验收
```

每章复用上一章成果，但详细教程仍应能独立阅读，不能用“与上一章类似”省略关键代码或运行条件。

## 8. 覆盖矩阵

新增 `web-fullstack-course/01-html/HTML-COVERAGE.md`。

每一行记录：

| 字段 | 含义 |
| --- | --- |
| ID | 稳定知识点编号 |
| 知识点 | 元素、属性、API、默认行为或历史替代 |
| 主要教程 | 负责完整解释的详细教程 |
| 理论 | 是否解释目的、语法和运行模型 |
| 最小案例 | 是否存在可观察的正确案例 |
| 项目案例 | 是否进入邻里集市 |
| 错误诊断 | 是否包含反例和排查 |
| 练习 | 是否有新场景练习 |
| 验收 | 是否有可观察通过条件 |

覆盖矩阵必须至少包含：

- 文档、元信息和文本元素；
- 页面结构、地标和标题；
- 列表、链接、表格；
- 图片、媒体、嵌入、SVG、Canvas；
- 全部现行 input 类型和表单元素；
- 蓝图列出的表单属性；
- DOM 查询、创建、修改、删除、类、数据属性和事件；
- 表单提交、FormData、事件冒泡和事件委托；
- ARIA、键盘、焦点和动态状态；
- 废弃元素与现代替代。

元素参考与覆盖矩阵职责不同：元素参考服务于查阅，覆盖矩阵服务于质量验收。

## 9. 章入口重写标准

现有 8 个章入口将被重写，但保留路径。

每个入口包含：

- 本章任务和阶段成果；
- 详细教程目录；
- 知识点依赖图；
- 推荐学习时间；
- 综合案例说明；
- 章级练习和验收清单；
- 与上一章和下一章的衔接。

章入口不得再次复制详细教程全文，也不得将知识点压缩成几句后称为已经教学完成。

## 10. 分批实施

### A 批：文档基础

范围：

- 模块 README；
- 第一、第二章入口；
- 详细教程 1–6；
- 覆盖矩阵基础部分。

成果：

- 完整的商品说明；
- 页面结构和标题导航；
- URL、链接、列表和内容分组。

### B 批：资源、数据与输入

范围：

- 第三、第四、第五章入口；
- 详细教程 7–15；
- 覆盖矩阵媒体、表格和表单部分。

成果：

- 响应式商品媒体；
- 可访问商品数据表；
- 完整发布表单、原生校验和 FormData 观察。

### C 批：交互、质量与参考

范围：

- 第六、第七、第八章入口；
- 详细教程 16–24；
- 完整覆盖矩阵；
- HTML 阶段综合验收。

成果：

- DOM 与事件驱动的收藏/预约演示；
- 键盘、焦点、动态状态和 SEO 检查；
- 完整元素、属性、API 与历史迁移参考。

每批完成后执行独立校验，再进入下一批。批次用于控制质量，不改变最终需要完整重写 8 章的目标。

## 11. 验收与自动检查

### 11.1 结构检查

- 24 篇详细教程全部存在；
- 每篇包含 13 个固定板块、任务卡、总结和导航；
- 8 个章入口全部指向实际教程；
- 模块 README、覆盖矩阵和前后导航没有断链；
- 正文不包含未完成标记、“略写”或要求读者自行填补正文的空白指令。

### 11.2 知识覆盖检查

- 覆盖矩阵每一项均有主要教程；
- 关键知识点不能只由元素索引负责；
- 蓝图要求的标签、属性、DOM API 和事件全部有理论、案例、练习和验收；
- 每个废弃案例给出当前替代方案。

### 11.3 示例检查

- 提取完整 HTML 示例，检查标签闭合、重复 ID、片段目标和基本结构；
- 提取 JSON 示例并使用结构化解析验证；
- 提取可独立执行的 JavaScript，运行语法检查；
- 对纯内存示例验证关键断言；
- 对需要媒体、浏览器或辅助技术的示例明确人工验收范围。

### 11.4 内容一致性检查

- 价格统一使用整数分作为业务存储；
- 时间统一说明 UTC 存储与本地展示；
- HTML 演示不宣称已实现登录、支付、服务端预约或并发控制；
- React、Vue 和后端的职责不被 HTML 例子提前替代；
- 版本和兼容性结论附官方来源与核验日期。

### 11.5 最终人工验收

- 使用键盘完成章节关键路径；
- 在至少一个现代 Chromium 浏览器观察 DOM、Network 和 Accessibility；
- 对字幕、读屏、Safari/Firefox 差异和实验特性标明未验证项；
- 随机选择知识点，能够从覆盖矩阵进入理论、案例、练习和验收。

## 12. 非目标

本次重写不包含：

- 创建 `labs/` 或独立课程源码仓库；
- 为 HTML 示例引入构建工具或第三方依赖；
- 重写 CSS、JavaScript、React、Vue、后端或部署模块；
- 接入真实账号、支付、数据库、对象存储或邮件；
- 将实验性特性写成所有浏览器都可用的生产基线；
- 通过机械增加行数制造“详细”。

## 13. 完成定义

HTML 模块完成需要同时满足：

1. 8 个章入口、24 篇详细教程和覆盖矩阵全部交付；
2. 蓝图中的 HTML 元素、属性、默认行为、DOM API、事件、兼容历史均有明确落点；
3. 每个主要知识点满足知识点深度契约；
4. 邻里集市 HTML 阶段可以从商品说明持续演进到可访问的发布与查询体验；
5. 自动检查通过，人工未验证项被明确记录；
6. 学习者不依赖外部口头说明即可按照教程完成、破坏、修复和验收案例。
