# HTML：让内容、关系和交互具有意义

> 面向零基础学习者的 HTML 完整教程
> 主线项目：邻里集市商品发布与浏览体验

HTML 不是一份标签名称清单。浏览器会读取源文件、修复部分错误、建立 DOM，再根据元素、属性和默认行为提供导航、表单、媒体与交互能力。

本卷的目标是让你能够回答：

- 为什么应该使用这个元素，而不是视觉上相似的另一个元素？
- 浏览器解析后得到的 DOM 是否与源文件相同？
- 属性写在 HTML 中以后，默认行为和 DOM 属性怎样变化？
- 鼠标、键盘、读屏软件和搜索工具会怎样理解页面？
- 页面“看起来正常”时，还需要检查哪些错误、安全和兼容边界？

## 本卷定位与教材结构

本 README 统筹章节顺序、阶段产出与本卷验收，学习路线直接连接每篇详细教程。
下方只示意导航与正文的职责分工，不表示当前目录中存在独立章节导航文件。

```text
章入口
  ├── 说明本章任务、学习顺序与综合验收
  └── 连接本章详细教程

详细教程
  ├── 推导一个明确知识组
  ├── 给出最小案例和逐步扩展
  ├── 制造并诊断错误
  ├── 接入邻里集市
  └── 用练习与验收确认能力
```

学习时按本 README 的章节表格逐篇完成详细教程及其练习、阶段验收，再按本卷验收清单整合成果。

全部知识点及其理论、案例、诊断、练习和验收位置，见 [HTML 教学覆盖矩阵](HTML-COVERAGE.md)。

## 学习路线

### 第一章：文档、解析与文本

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [HTML 解析与 DOM](01-document-text/01-html-parser-dom.md) | 追踪字符、token、节点与 DOM 的形成过程，并用源文件和 Elements 证据解释错误恢复。 |
| 2 | [HTML 语法与内容模型](01-document-text/02-html-syntax-content-models.md) | 区分标签、元素、属性和内容模型，建立可预测的嵌套、布尔属性与字符处理规则。 |
| 3 | [文档头与元信息](01-document-text/03-head-metadata-base.md) | 用 title、字符编码、视口、描述、robots 和 base 建立可解释的文档身份与 URL 基准。 |
| 4 | [资源与脚本加载](01-document-text/04-resources-scripts-loading.md) | 解释资源关系、加载属性与脚本执行时机，并通过 Network 和执行顺序证据定位失败。 |
| 5 | [文本层次与强调语义](01-document-text/05-text-structure-emphasis.md) | 依据内容关系选择标题、段落、换行、主题转换、强调和注意类元素。 |
| 6 | [引用、机器值与修订](01-document-text/06-quotes-machine-values-edits.md) | 表达引用、术语、计算机文本、机器值和编辑记录，并保持价格与时间契约一致。 |
| 7 | [语言、双向文本与注音](01-document-text/07-language-bidi-ruby.md) | 声明语言和书写方向，隔离未知方向文字，并为注音和长标识提供正确结构。 |

阶段产出：一份结构可解释、机器值正确、能观察解析结果的商品说明。建议投入 12–16 小时。

### 第二章：页面结构、链接与列表

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [页面地标与分节](02-structure-links-lists/01-landmarks-sectioning.md) | 使用页级、文章级地标和分节元素表达区域边界，并让重复地标可以区分。 |
| 2 | [标题大纲、阅读顺序与 ARIA](02-structure-links-lists/02-headings-reading-order-aria.md) | 用显式标题层级和 DOM 顺序表达内容关系，并把 ARIA 限制在原生语义无法覆盖的边界。 |
| 3 | [URL 解析与片段导航](02-structure-links-lists/03-url-resolution-fragments.md) | 拆解 URL、来源和文档基准，计算相对地址、查询和片段的最终目标。 |
| 4 | [原生链接与页面导航](02-structure-links-lists/04-native-links-navigation.md) | 使用 a[href]、外部协议和浏览上下文完成可预测导航，并区分链接与按钮。 |
| 5 | [链接安全、隐私与下载边界](02-structure-links-lists/05-link-security-privacy-downloads.md) | 控制新窗口关系、来源信息和下载提示，并拒绝不可信的可执行 URL 方案。 |
| 6 | [列表、描述关系与命令集合](02-structure-links-lists/06-lists-descriptions-commands.md) | 依据顺序、层级和名称值关系选择 ul、ol、menu 或 dl，并保持合法父子结构。 |
| 7 | [图注、引用与内容分组](02-structure-links-lists/07-figures-quotes-content-groups.md) | 使用 figure、引用、预格式文本和中性容器组织可引用或需要保留格式的内容。 |

阶段产出：可以通过目录、键盘和跨页链接访问的商品详情与帮助页。建议投入 12–16 小时。

### 第三章：图片、媒体与嵌入

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [图片语义、替代文本与尺寸](03-images-media-embedding/01-image-semantics-alt-dimensions.md) | 根据图片职责编写替代文本，并用固有尺寸与宽高属性减少布局偏移。 |
| 2 | [响应式图片选源与艺术指导](03-images-media-embedding/02-responsive-image-selection.md) | 使用 srcset、sizes、picture 和 currentSrc 解释浏览器的图片候选选择。 |
| 3 | [图片加载、解码、性能与失败恢复](03-images-media-embedding/03-image-loading-state-failures.md) | 区分加载、解码和跨源状态，并通过事件、DOM 属性和 Network 证据恢复失败。 |
| 4 | [音频、视频、来源与原生控件](03-images-media-embedding/04-media-elements-sources-controls.md) | 声明 audio、video 和 source 资源，配置原生控件与加载属性并验证回退。 |
| 5 | [媒体播放状态、事件与故障恢复](03-images-media-embedding/05-media-playback-state-events.md) | 观察媒体状态与事件，处理 play() Promise、暂停、重载和策略拒绝。 |
| 6 | [文本轨道、WebVTT 与媒体可访问性](03-images-media-embedding/06-media-text-tracks-webvtt.md) | 使用 track 和 WebVTT 提供字幕、描述与章节，并明确性能、隐私和无障碍边界。 |
| 7 | [嵌入文档、安全边界与图像映射](03-images-media-embedding/07-embedded-documents-image-maps.md) | 选择 iframe、object、embed 或图像映射，并解释 sandbox、权限策略、同源与嵌入拒绝。 |
| 8 | [SVG、Canvas 与可访问图形](03-images-media-embedding/08-svg-canvas-graphics.md) | 在可缩放图形和像素表面之间做选择，为 Canvas 提供尺寸、高清绘制与等价替代。 |

阶段产出：带有真实替代信息、媒体状态和安全嵌入边界的商品媒体页。建议投入 14–18 小时。

### 第四章：表格与二维数据

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [二维数据模型与表格基础结构](04-tables-data/01-table-model-structure.md) | 判断二维数据需求，建立 caption、行组、行和单元格组成的完整网格。 |
| 2 | [表头关系、分组与显式关联](04-tables-data/02-table-header-associations.md) | 使用 scope、id 和 headers 建立简单、分组与复杂表头关系。 |
| 3 | [合并单元格、网格坐标与列组](04-tables-data/03-table-spans-column-groups.md) | 推演 colspan、rowspan 对坐标的影响，并用 colgroup 和 col 描述列结构。 |
| 4 | [响应式表格、键盘访问与打印](04-tables-data/04-responsive-table-accessibility-print.md) | 在窄屏、键盘、读屏与打印场景中保持二维关系和可见事实。 |
| 5 | [表格 DOM、安全更新与动态状态](04-tables-data/05-table-dom-dynamic-rows.md) | 使用表格 DOM API 安全创建、更新和删除行，并维护整数分、空状态和焦点。 |

阶段产出：可以比较商品、保持表头关系并正确汇总整数分的商品表。建议投入 10–14 小时。

### 第五章：表单与验证

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [表单目标、方法与编码](05-forms-validation/01-form-action-method-encoding.md) | 配置 action、method、enctype、target 和验证入口，预测浏览器如何发送表单。 |
| 2 | [成功控件、提交者与名称值](05-forms-validation/02-successful-controls-submitter-values.md) | 从控件树构造有序条目，区分 id、name、value、disabled、readonly 与提交者覆盖。 |
| 3 | [FormData、查询串与程序化提交](05-forms-validation/03-formdata-query-programmatic-submit.md) | 观察 GET 与 POST 数据，保留 FormData 多值，并区分 requestSubmit() 与 submit()。 |
| 4 | [input 类型与值状态模型](05-forms-validation/04-input-types-value-state.md) | 按输入任务选择 type，并区分当前值、默认值、脏值、checked 与 defaultChecked。 |
| 5 | [文本、数值与范围输入](05-forms-validation/05-text-number-range-inputs.md) | 为文本、邮箱、URL、搜索、电话、密码、数值和范围任务选择正确输入模型。 |
| 6 | [日期、时间、颜色与类型化值 API](05-forms-validation/06-date-time-color-inputs.md) | 处理日期时间和颜色输入的机器值、地区化界面与类型化 DOM API。 |
| 7 | [选择、文件、隐藏与命令输入](05-forms-validation/07-choice-file-command-inputs.md) | 配置 checkbox、radio、file、hidden、button 和提交类输入的名称值与默认行为。 |
| 8 | [showPicker 与渐进增强](05-forms-validation/08-showpicker-progressive-enhancement.md) | 把 showPicker() 作为可检测增强，并在不支持、拒绝或无脚本时保留原生输入基线。 |
| 9 | [标签、可见名称与 textarea](05-forms-validation/09-label-textarea.md) | 建立 label 与控件的可靠关联，并区分 textarea 的初始文本、当前值和换行。 |
| 10 | [选择控件、选项与按钮](05-forms-validation/10-select-option-button.md) | 处理 select、option、optgroup、多选状态和 button 的可见文字与提交值。 |
| 11 | [分组、建议、输出、进度与测量](05-forms-validation/11-fieldset-datalist-output-progress-meter.md) | 使用 fieldset、legend、datalist、output、progress 和 meter 表达分组与状态。 |
| 12 | [输入辅助、表单所有者与状态](05-forms-validation/12-input-assistance-form-state.md) | 配置输入辅助属性和 form 所有者，并区分内容属性、默认状态与当前状态。 |
| 13 | [约束属性与验证候选者](05-forms-validation/13-constraint-attributes-candidates.md) | 判断 willValidate 候选者，并使用 required、长度、pattern、min、max、step 和文件提示约束。 |
| 14 | [ValidityState、自定义错误与 invalid](05-forms-validation/14-validity-custom-errors-invalid.md) | 读取 ValidityState，管理 validationMessage 与 setCustomValidity() 生命周期，并处理 invalid 事件。 |
| 15 | [文件检查与服务端信任边界](05-forms-validation/15-file-checks-server-boundaries.md) | 分层处理文件提示、前端预检查和服务端最终检查，并区分验证、认证、授权与 CSRF。 |

阶段产出：键盘可用、错误可理解、可观察 FormData 的商品发布表单。建议投入 20–26 小时。

### 第六章：原生交互、DOM 与事件

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [details、summary 与 toggle](06-interactive-dom/01-details-summary-toggle.md) | 复用 details、summary 的展开契约，观察 open、toggle 和命名组行为。 |
| 2 | [Dialog 模式、结果与焦点恢复](06-interactive-dom/02-dialog-modal-focus-results.md) | 区分 dialog 状态、顶层和模态行为，处理关闭结果、取消、初始焦点与恢复。 |
| 3 | [Popover、调用者与回退](06-interactive-dom/03-popover-invokers-fallback.md) | 使用 Popover、声明式调用者和脚本 API，并按能力检测提供可见回退。 |
| 4 | [DOM 查询、集合与导航](06-interactive-dom/04-dom-query-collections-navigation.md) | 查询当前 DOM，区分静态与动态集合，并沿节点和元素关系导航。 |
| 5 | [节点创建、移动、删除与安全文本](06-interactive-dom/05-dom-create-move-remove-safe-text.md) | 创建、插入、移动、替换和删除节点，并用 textContent 守住不可信文本边界。 |
| 6 | [属性、dataset 与状态同步](06-interactive-dom/06-dom-attributes-dataset-state-sync.md) | 同步 class、data-*、普通与布尔属性、ARIA、文字和可用性状态。 |
| 7 | [监听器生命周期与事件传播](06-interactive-dom/07-event-listener-lifecycle-propagation.md) | 注册和移除事件监听器，使用 once 与 AbortSignal，并预测捕获、目标和冒泡顺序。 |
| 8 | [事件目标、默认行为与语义事件](06-interactive-dom/08-event-target-defaults-semantic-events.md) | 区分 target 与 currentTarget、传播与默认行为，并按元素语义选择事件。 |
| 9 | [事件委托与合成事件](06-interactive-dom/09-event-delegation-synthetic-events.md) | 在稳定祖先上委托动态列表事件，并区分合成事件与真实用户操作。 |
| 10 | [Template、DocumentFragment 与克隆](06-interactive-dom/10-template-fragment-clone.md) | 解析但暂不激活 template 内容，使用 DocumentFragment 和 cloneNode() 安全复用结构。 |
| 11 | [自定义元素生命周期与属性同步](06-interactive-dom/11-custom-elements-lifecycle-attributes.md) | 注册自主自定义元素，管理连接、断开、采用和属性变化生命周期。 |
| 12 | [Shadow DOM、slot 与渐进增强](06-interactive-dom/12-shadow-dom-slots-progressive-enhancement.md) | 封装 Shadow DOM，分配 Light DOM 内容并观察 slot 变化，同时保留定义失败时的内容基线。 |

阶段产出：只保存在内存中的收藏与预约确认演示，并能解释事件和焦点变化。建议投入 20–26 小时。

### 第七章：无障碍、可发现性与质量

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [语义角色、地标与标题](07-accessibility-seo/01-semantic-roles-landmarks-headings.md) | 从语义元素、角色、地标和标题建立辅助技术可导航的页面结构。 |
| 2 | [可访问名称、描述与状态](07-accessibility-seo/02-accessible-names-descriptions-states.md) | 计算可访问名称，区分描述、状态和值，并保持可见标签与名称一致。 |
| 3 | [键盘、焦点与 ARIA](07-accessibility-seo/03-keyboard-focus-skip-links-aria.md) | 保持语义键盘行为、DOM 焦点顺序、可见焦点和跳过链接，并遵守 ARIA 第一规则。 |
| 4 | [动态通知与忙碌状态](07-accessibility-seo/04-live-regions-status-busy.md) | 使用 status、alert、live region、atomic、relevant 和 busy 公布动态结果。 |
| 5 | [表单、对话框与列表焦点](07-accessibility-seo/05-form-dialog-list-focus-recovery.md) | 在表单错误、Dialog 关闭和动态列表删除后选择可解释的焦点恢复路径。 |
| 6 | [图片、媒体与图表替代](07-accessibility-seo/06-images-media-chart-alternatives.md) | 为图片、字幕、文字稿、音频描述和 Canvas 图表提供任务等价信息。 |
| 7 | [缩放、触控、颜色与动效](07-accessibility-seo/07-zoom-touch-color-motion.md) | 验证文字缩放、回流、触控目标、非颜色渠道和减少动效偏好。 |
| 8 | [页面元信息与 Canonical](07-accessibility-seo/08-page-metadata-canonical-urls.md) | 编写可脱离上下文识别的 title 和 description，并声明与内容一致的 canonical。 |
| 9 | [抓取、索引、HTTP 与渲染](07-accessibility-seo/09-crawling-indexing-http-rendering.md) | 区分发现、抓取与索引，结合 robots、sitemap、链接、HTTP 状态和渲染策略交付事实。 |
| 10 | [结构化数据与可见内容](07-accessibility-seo/10-structured-data-visible-content.md) | 用 Microdata 或 JSON-LD 表达与可见内容一致的结构化事实，并拒绝虚构富结果。 |

阶段产出：键盘可完成、动态状态可理解、元信息与可见内容一致的查询页。建议投入 14–18 小时。

### 第八章：元素参考、选择与纠错

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [现行元素职责索引](08-html-element-reference/01-current-elements-by-responsibility.md) | 从内容职责、内容类别和内容模型反查现行元素，并区分空内容模型与语法。 |
| 2 | [属性、DOM API 与默认行为](08-html-element-reference/02-attributes-dom-apis-default-behavior.md) | 区分内容属性、IDL 属性和运行状态，并把默认行为与项目兼容基线一并核对。 |
| 3 | [现行选择与确定性纠错](08-html-element-reference/03-current-selection-correction.md) | 从需求职责选择现行元素、属性与 API，并对照源文件、DOM 和默认行为完成纠错。 |

阶段产出：能从需求找到合适语义，并用源文件、DOM、可访问性和默认行为证据完成确定性纠错。
建议投入 10–14 小时。

## 学习与运行

建议按下面的顺序完成一篇教程：

1. **预测**：先看任务和最小代码，写下你认为会出现的结果。
2. **复现**：在个人练习目录创建教程指定文件，按说明打开或运行。
3. **观察**：至少保留页面、Elements，以及教程指定的 Console、Network 或 Accessibility 证据。
4. **破坏**：完成错误案例，先记录现象再修改代码。
5. **恢复**：解释原因，修复后重复原路径。
6. **迁移**：不看答案完成一项新商品练习。
7. **验收**：逐项提交代码路径、操作、结果和已知边界。

只复制完整案例不能证明掌握。能够预测、解释和迁移，才可以进入下一课。

### 个人练习目录

教程交付物是 Markdown，不附带独立实验源码。学习者在个人项目中创建：

```text
market-learning/
└── practice/
    ├── html-01-parser/
    ├── html-02-head/
    ├── html-03-text/
    ├── html-04-structure/
    └── ...
```

每篇教程会给出实际目录与文件名。目录编号服务于学习顺序，不是商品业务 ID。

照片、音视频、PDF 和字幕练习需要学习者准备有权使用的真实资源。教程中的资源名只说明路径契约，不把不存在的文件描述成成功结果。

## 连续项目与边界

- 邻里集市主线不接入真实支付。
- 价格的业务存储单位是整数分，例如 39 元存为 `3900`。
- 存储时间使用 ISO 8601 UTC，显示时才按用户地区格式化。
- HTML 表单校验不能替代服务器字段、权限、CSRF 和事务校验。
- 隐藏按钮、隐藏字段、只读字段和禁用字段都不是授权机制。
- 本卷中的收藏、查询和预约状态只存在于当前页面内存，刷新后会丢失。
- 使用 `textContent`、DOM API 或结构化解析处理用户文字，不把不可信文本直接拼成 HTML。
- `iframe` 沙箱、CORS、ARIA、robots 和元信息各有独立职责，不能互相替代。

详细业务模型见[邻里集市项目契约](../00-guide/project-contract.md)。

## 验收

完成本卷时，需要从空白目录独立完成：

- 语义清楚的商品详情和帮助页；
- 有替代文本、尺寸信息和媒体回退的商品媒体；
- 表头关联正确的商品比较表；
- 标签、分组、原生校验和错误恢复完整的发布表单；
- 使用 DOM、事件委托和原生对话框实现的内存收藏/预约演示；
- 键盘、焦点、动态状态、缩放和元信息检查；
- 一次源文件、DOM、可访问性与默认行为的确定性纠错记录。

验收材料至少包含：

```text
个人代码路径
打开或运行方式
正常结果
错误输入和故障证据
修复动作与复验
键盘操作记录
未验证的浏览器或辅助技术
为什么选择这些元素和属性
```

不能通过删除默认焦点、关闭验证、隐藏错误、伪造媒体文件或声称前端已经完成服务端权限来获得“通过”。

## 验证范围

HTML 是 Living Standard，不使用“背完某个固定 HTML 版本”作为完成标准。现行元素、有限支持特性和历史元素需要分开判断。

精确资料快照、课程选择和兼容原则统一见[版本基线](../00-guide/version-baseline.md)。基础元素
成熟不等于其所有新属性都已跨浏览器一致实现。Popover、Dialog 新扩展、可定制 Select、
颜色输入扩展、声明式 Shadow DOM 和组件注册扩展会分别标注支持范围。

ARIA、键盘、读屏、缩放、字幕和真实媒体质量不能只靠静态脚本完整验收。教程会明确自动检查与人工检查的边界。

本卷已完成结构、链接、代码解析和代表性 Chromium 交互验证；Safari、Firefox、真实移动设备、
屏幕阅读器、自备媒体与跨源资源仍需在目标环境复测。精确数量、执行结果和人工缺口统一见
[交付与验证说明](../VALIDATION.md)。

## 资料与导航

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](HTML-COVERAGE.md)

[返回全书目录](../README.md) · [开始第一章](01-document-text/01-html-parser-dom.md) ·
[下一卷：CSS](../02-css/README.md)
