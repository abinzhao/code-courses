# HTML：让内容、关系和交互具有意义

> 面向零基础学习者的 HTML 完整教程
> 主线项目：邻里集市商品发布与浏览体验
> 技术资料核验日期：2026-10-10

HTML 不是一份标签名称清单。浏览器会读取源文件、修复部分错误、建立 DOM，再根据元素、属性和默认行为提供导航、表单、媒体与交互能力。

本卷的目标是让你能够回答：

- 为什么应该使用这个元素，而不是视觉上相似的另一个元素？
- 浏览器解析后得到的 DOM 是否与源文件相同？
- 属性写在 HTML 中以后，默认行为和 DOM 属性怎样变化？
- 鼠标、键盘、读屏软件和搜索工具会怎样理解页面？
- 页面“看起来正常”时，还需要检查哪些错误、安全和兼容边界？

## 1. 教材结构

HTML 模块采用两层结构：

```text
章入口
  ├── 说明本章任务、学习顺序与综合验收
  └── 连接 2 至 4 篇详细教程

详细教程
  ├── 推导一个明确知识组
  ├── 给出最小案例和逐步扩展
  ├── 制造并诊断错误
  ├── 接入邻里集市
  └── 用练习与验收确认能力
```

章入口不是正文摘要的替代品。学习时先打开章入口，再按顺序完成其中的详细教程，最后回到章入口完成综合任务。

全部知识点及其理论、案例、诊断、练习和验收位置，见 [HTML 教学覆盖矩阵](HTML-COVERAGE.md)。

## 2. 八章学习路线

### 第一章：文档、解析与文本

章入口：[文档、解析与文本](01-document-text.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [HTML 解析、文档模型与错误恢复](01-document-text/01-parser-document-model.md) | 为什么源文件和 Elements 中的 DOM 可能不同 |
| 2 | [head、元信息与资源加载](01-document-text/02-head-metadata-resources.md) | 页面怎样获得标题、编码、视口和资源关系 |
| 3 | [文本语义、时间与国际化](01-document-text/03-text-semantics-i18n.md) | 怎样把聊天消息整理成机器和人都能理解的商品说明 |

阶段产出：一份结构可解释、机器值正确、能观察解析结果的商品说明。建议投入 12–16 小时。

### 第二章：页面结构、链接与列表

章入口：[页面结构、链接与列表](02-structure-links-lists.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [地标、标题与页面结构](02-structure-links-lists/01-landmarks-headings-outline.md) | 怎样让长页面可以按区域和标题导航 |
| 2 | [URL、链接与安全导航](02-structure-links-lists/02-urls-links-navigation.md) | 怎样预测一个链接最终会去哪里 |
| 3 | [列表、图注与内容分组](02-structure-links-lists/03-lists-figures-content-groups.md) | 怎样表达集合、步骤、名称值和可引用内容 |

阶段产出：可以通过目录、键盘和跨页链接访问的商品详情与帮助页。建议投入 12–16 小时。

### 第三章：图片、媒体与嵌入

章入口：[图片、媒体与嵌入](03-images-media-embedding.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [图片、响应式候选与加载性能](03-images-media-embedding/01-images-responsive-performance.md) | 图片替代、响应式候选、尺寸与加载性能 |
| 2 | [音频、视频、字幕与播放状态](03-images-media-embedding/02-audio-video-tracks.md) | 音视频、播放状态、字幕和失败恢复 |
| 3 | [嵌入、图像地图、SVG 与 Canvas](03-images-media-embedding/03-embedding-svg-canvas.md) | 嵌入安全、图像热点、SVG 与 Canvas 选择 |

阶段产出：带有真实替代信息、媒体状态和安全嵌入边界的商品媒体页。建议投入 14–18 小时。

### 第四章：表格与二维数据

章入口：[表格与二维数据](04-tables-data.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [表格模型、表头关系与跨格](04-tables-data/01-table-model-headers-spans.md) | 表头、网格、跨行跨列和复杂关联 |
| 2 | [表格无障碍、响应式与 DOM 操作](04-tables-data/02-table-accessibility-responsive-dom.md) | 响应式表格、键盘、读屏和 DOM 生成 |

阶段产出：可以比较商品、保持表头关系并正确汇总整数分的商品表。建议投入 10–14 小时。

### 第五章：表单与验证

章入口：[表单、提交与验证](05-forms-validation.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [表单提交与成功控件](05-forms-validation/01-form-submission-successful-controls.md) | 表单数据怎样被命名、编码和提交 |
| 2 | [input 类型与值状态](05-forms-validation/02-input-types-values.md) | 现行 input 类型、当前值与默认值 |
| 3 | [表单控件、选择与分组](05-forms-validation/03-form-controls-groups.md) | 标签、选择、分组、输出、进度与测量 |
| 4 | [约束验证、错误恢复与文件](05-forms-validation/04-constraint-validation-files.md) | 原生约束、错误恢复、文件边界与服务端校验 |

阶段产出：键盘可用、错误可理解、可观察 FormData 的商品发布表单。建议投入 20–26 小时。

### 第六章：原生交互、DOM 与事件

章入口：[原生交互、DOM 与事件](06-interactive-dom.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [details、dialog 与 popover](06-interactive-dom/01-native-interactive-elements.md) | details、dialog 和 popover 的默认行为 |
| 2 | [DOM 查询、创建与修改](06-interactive-dom/02-dom-query-mutation.md) | 怎样查询、创建、修改和删除 DOM |
| 3 | [事件、表单与委托](06-interactive-dom/03-events-forms-delegation.md) | 事件传播、默认行为、提交与事件委托 |
| 4 | [template 与 Web Components](06-interactive-dom/04-templates-web-components.md) | template、Shadow DOM、slot 和组件边界 |

阶段产出：只保存在内存中的收藏与预约确认演示，并能解释事件和焦点变化。建议投入 20–26 小时。

### 第七章：无障碍、可发现性与质量

章入口：[无障碍、SEO 与质量](07-accessibility-seo.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [可访问名称、地标与键盘](07-accessibility-seo/01-accessible-name-landmarks-keyboard.md) | 名称、地标、键盘和焦点 |
| 2 | [动态状态、焦点与媒体替代](07-accessibility-seo/02-dynamic-status-focus-media.md) | 动态状态、表单错误和媒体替代 |
| 3 | [元信息、SEO 与结构化数据](07-accessibility-seo/03-metadata-seo-structured-data.md) | 元信息、抓取、索引和结构化数据 |

阶段产出：键盘可完成、动态状态可理解、元信息与可见内容一致的查询页。建议投入 14–18 小时。

### 第八章：元素参考、历史与迁移

章入口：[元素参考、历史与迁移](08-html-element-reference.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [元素、属性与 DOM API 索引](08-html-element-reference/01-element-attribute-api-index.md) | 按职责检索现行元素、属性和 DOM 接口 |
| 2 | [过时特性、历史兼容与迁移](08-html-element-reference/02-deprecated-history-migration.md) | 识别旧元素、理解历史并迁移到当前方案 |

阶段产出：能从需求找到合适语义，并把旧商品页迁移为现代结构。建议投入 10–14 小时。

## 3. 每篇详细教程怎样学习

建议按下面的顺序完成一篇教程：

1. **预测**：先看任务和最小代码，写下你认为会出现的结果。
2. **复现**：在个人练习目录创建教程指定文件，按说明打开或运行。
3. **观察**：至少保留页面、Elements，以及教程指定的 Console、Network 或 Accessibility 证据。
4. **破坏**：完成错误案例，先记录现象再修改代码。
5. **恢复**：解释原因，修复后重复原路径。
6. **迁移**：不看答案完成一项新商品练习。
7. **验收**：逐项提交代码路径、操作、结果和已知边界。

只复制完整案例不能证明掌握。能够预测、解释和迁移，才可以进入下一课。

## 4. 个人练习目录

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

## 5. 项目与安全边界

- 邻里集市主线不接入真实支付。
- 价格的业务存储单位是整数分，例如 39 元存为 `3900`。
- 存储时间使用 ISO 8601 UTC，显示时才按用户地区格式化。
- HTML 表单校验不能替代服务器字段、权限、CSRF 和事务校验。
- 隐藏按钮、隐藏字段、只读字段和禁用字段都不是授权机制。
- 本卷中的收藏、查询和预约状态只存在于当前页面内存，刷新后会丢失。
- 使用 `textContent`、DOM API 或结构化解析处理用户文字，不把不可信文本直接拼成 HTML。
- `iframe` 沙箱、CORS、ARIA、robots 和元信息各有独立职责，不能互相替代。

详细业务模型见[邻里集市项目契约](../00-guide/05-project-assessment.md)。

## 6. HTML 阶段验收

完成本卷时，需要从空白目录独立完成：

- 语义清楚的商品详情和帮助页；
- 有替代文本、尺寸信息和媒体回退的商品媒体；
- 表头关联正确的商品比较表；
- 标签、分组、原生校验和错误恢复完整的发布表单；
- 使用 DOM、事件委托和原生对话框实现的内存收藏/预约演示；
- 键盘、焦点、动态状态、缩放和元信息检查；
- 一次废弃 HTML 页面迁移记录。

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

## 7. 兼容性与资料边界

HTML 是 Living Standard，不使用“背完某个固定 HTML 版本”作为完成标准。现行元素、有限支持特性和历史元素需要分开判断。

本卷以 WHATWG、MDN 和 MDN Browser Compatibility Data 为主要资料源。基础元素成熟不等于其所有新属性都已跨浏览器一致实现。Popover、Dialog 新扩展、可定制 Select、颜色输入扩展、声明式 Shadow DOM 和组件注册扩展会分别标注支持范围。

ARIA、键盘、读屏、缩放、字幕和真实媒体质量不能只靠静态脚本完整验收。教程会明确自动检查与人工检查的边界。

## 8. 教材验证记录与手动缺口

截至 2026-10-10，教材已完成以下自动与浏览器检查：

- 34 个 HTML 模块 Markdown 文件齐全，24 篇详细教程均包含 13 个编号章节、任务卡、能力总结和单元导航；
- 173 个覆盖矩阵条目均连接到现有教程，模块内相对链接、同页片段、代码围栏、占位标记和空白检查通过；
- 51 个完整 HTML 示例通过解析、唯一 ID 和同页片段检查，34 个内嵌 JavaScript 示例通过语法检查；JSON 与 WebVTT 代码块通过对应解析检查；
- Chromium 代表性路径覆盖 DOM 修复、跨页片段、响应式图片失败回退、表单 invalid→valid、Dialog、Popover、事件委托、跳转链接、可访问名称、焦点恢复和 live status；
- 价格计算保持整数分，生成时间使用 UTC ISO 8601；收藏、预约和发布预览均明确为当前页面内存或本地教学状态。

以下项目仍需在采用本教材的真实目标环境中手动复测，不能由上述结果推导为已兼容：

- Safari、Firefox 以及项目声明支持的旧版浏览器；
- VoiceOver、NVDA、JAWS 等真实屏幕阅读器及其浏览器组合；
- 学习者自备图片、音频、视频、字幕和跨源嵌入资源的内容质量、授权、网络响应与服务端响应头；
- 旧浏览器中的 `details` 降级，以及 Popover、Dialog 扩展、颜色输入扩展、声明式 Shadow DOM 等有限支持特性。

[返回全书目录](../README.md) · [开始第一章](01-document-text.md) · [查看覆盖矩阵](HTML-COVERAGE.md)
