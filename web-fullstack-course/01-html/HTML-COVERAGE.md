# HTML 教学覆盖矩阵

本矩阵用于证明每个知识组不仅在索引中出现，还进入理论、案例、错误诊断、练习和验收。

## 1. 阅读方式

表格中的“是”表示对应详细教程已经落实该维度。全部主要教程均使用可点击链接；验收时应从每一行进入正文，抽查理论、案例、诊断、练习和验收证据，不能只凭文件存在判断完成。

| 标记 | 含义 |
| --- | --- |
| 理论 | 解释目的、语法、内容模型、默认行为或 DOM 映射 |
| 最小案例 | 存在可观察的正确用法 |
| 项目案例 | 进入邻里集市连续项目 |
| 错误诊断 | 有反例、证据、修复和复验 |
| 练习 | 学习者在新输入上独立完成 |
| 验收 | 有可观察的通过条件 |

## 2. 文档、解析与元信息

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DOC-001 | HTML 源代码、token、节点与 DOM | [解析与文档模型](01-document-text/01-parser-document-model.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-002 | 开始标签、结束标签、元素与合法嵌套 | [解析与文档模型](01-document-text/01-parser-document-model.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-003 | `<!doctype html>` 与标准模式 | [解析与文档模型](01-document-text/01-parser-document-model.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-004 | `html`、`head`、`body` 与解析器补节点 | [解析与文档模型](01-document-text/01-parser-document-model.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-005 | 空元素与错误的自闭合假设 | [解析与文档模型](01-document-text/01-parser-document-model.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-006 | 普通属性、引号和重复属性 | [解析与文档模型](01-document-text/01-parser-document-model.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-007 | 布尔属性的存在性语义 | [解析与文档模型](01-document-text/01-parser-document-model.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-008 | 字符引用、注释和空白折叠 | [解析与文档模型](01-document-text/01-parser-document-model.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-009 | 内容类别与允许的父子关系 | [解析与文档模型](01-document-text/01-parser-document-model.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-010 | 浏览器错误恢复和源文件/DOM 对照 | [解析与文档模型](01-document-text/01-parser-document-model.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-011 | `title` 与正文标题职责 | [head 与资源](01-document-text/02-head-metadata-resources.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-012 | `meta charset` 与文件编码 | [head 与资源](01-document-text/02-head-metadata-resources.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-013 | viewport、description、robots 元信息 | [head 与资源](01-document-text/02-head-metadata-resources.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-014 | `base` 与文档级 URL 副作用 | [head 与资源](01-document-text/02-head-metadata-resources.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-015 | `link` 资源关系及加载属性 | [head 与资源](01-document-text/02-head-metadata-resources.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-016 | `style` 与文档内样式边界 | [head 与资源](01-document-text/02-head-metadata-resources.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-017 | 普通脚本、`defer`、`async`、module | [head 与资源](01-document-text/02-head-metadata-resources.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-018 | `noscript` 在 head/body 中的边界 | [head 与资源](01-document-text/02-head-metadata-resources.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOC-019 | `http-equiv` 与真实 HTTP 响应头区别 | [head 与资源](01-document-text/02-head-metadata-resources.md) | 是 | 是 | 是 | 是 | 是 | 是 |

## 3. 文本语义与国际化

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TXT-001 | `h1` 至 `h6`、`p`、`br`、`hr` | [文本语义](01-document-text/03-text-semantics-i18n.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TXT-002 | `strong`、`em`、`b`、`i` 的语义差异 | [文本语义](01-document-text/03-text-semantics-i18n.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TXT-003 | `mark`、`small`、`s`、`u` | [文本语义](01-document-text/03-text-semantics-i18n.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TXT-004 | `q`、`blockquote`、`cite` | [文本语义](01-document-text/03-text-semantics-i18n.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TXT-005 | `abbr`、`dfn` | [文本语义](01-document-text/03-text-semantics-i18n.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TXT-006 | `code`、`kbd`、`samp`、`var` | [文本语义](01-document-text/03-text-semantics-i18n.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TXT-007 | `time`、`data` 与机器值 | [文本语义](01-document-text/03-text-semantics-i18n.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TXT-008 | `del`、`ins` 与修订元数据 | [文本语义](01-document-text/03-text-semantics-i18n.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TXT-009 | `sub`、`sup`、`span` | [文本语义](01-document-text/03-text-semantics-i18n.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TXT-010 | `lang`、`dir`、`bdi`、`bdo` | [文本语义](01-document-text/03-text-semantics-i18n.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TXT-011 | `ruby`、`rt`、`rp`、`wbr` | [文本语义](01-document-text/03-text-semantics-i18n.md) | 是 | 是 | 是 | 是 | 是 | 是 |

## 4. 页面结构、链接与内容分组

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| STR-001 | `header`、`footer` 的页面级与分节级职责 | [地标与标题](02-structure-links-lists/01-landmarks-headings-outline.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| STR-002 | `main` 与唯一主要内容 | [地标与标题](02-structure-links-lists/01-landmarks-headings-outline.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| STR-003 | `nav` 与重复地标命名 | [地标与标题](02-structure-links-lists/01-landmarks-headings-outline.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| STR-004 | `article` 的独立内容边界 | [地标与标题](02-structure-links-lists/01-landmarks-headings-outline.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| STR-005 | `section` 与 `div` 的选择 | [地标与标题](02-structure-links-lists/01-landmarks-headings-outline.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| STR-006 | `aside` 与间接相关内容 | [地标与标题](02-structure-links-lists/01-landmarks-headings-outline.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| STR-007 | `address` 的作者/组织联系范围 | [地标与标题](02-structure-links-lists/01-landmarks-headings-outline.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| STR-008 | `search` 搜索区域语义 | [地标与标题](02-structure-links-lists/01-landmarks-headings-outline.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| STR-009 | `h1` 至 `h6` 显式标题层级 | [地标与标题](02-structure-links-lists/01-landmarks-headings-outline.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| STR-010 | `hgroup` 与标题辅助文字 | [地标与标题](02-structure-links-lists/01-landmarks-headings-outline.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| STR-011 | DOM 阅读顺序与视觉位置 | [地标与标题](02-structure-links-lists/01-landmarks-headings-outline.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LNK-001 | URL 的协议、主机、端口、路径、查询、片段 | [URL 与链接](02-structure-links-lists/02-urls-links-navigation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LNK-002 | 文档基准 URL | [URL 与链接](02-structure-links-lists/02-urls-links-navigation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LNK-003 | 相对、根相对、绝对 URL | [URL 与链接](02-structure-links-lists/02-urls-links-navigation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LNK-004 | 同页与跨页片段导航 | [URL 与链接](02-structure-links-lists/02-urls-links-navigation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LNK-005 | `a[href]` 与原生链接行为 | [URL 与链接](02-structure-links-lists/02-urls-links-navigation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LNK-006 | `target`、`rel`、`noopener`、`noreferrer` | [URL 与链接](02-structure-links-lists/02-urls-links-navigation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LNK-007 | `download` 与跨源限制 | [URL 与链接](02-structure-links-lists/02-urls-links-navigation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LNK-008 | `hreflang`、`type`、`referrerpolicy`、`ping` | [URL 与链接](02-structure-links-lists/02-urls-links-navigation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LNK-009 | `mailto:`、`tel:` | [URL 与链接](02-structure-links-lists/02-urls-links-navigation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LNK-010 | 链接与按钮、安全 URL 方案 | [URL 与链接](02-structure-links-lists/02-urls-links-navigation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LST-001 | `ul`、`li` 与无序集合 | [列表与内容分组](02-structure-links-lists/03-lists-figures-content-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LST-002 | `ol`、`start`、`reversed`、`type`、`li[value]` | [列表与内容分组](02-structure-links-lists/03-lists-figures-content-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LST-003 | 嵌套列表父子关系 | [列表与内容分组](02-structure-links-lists/03-lists-figures-content-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LST-004 | `menu` 命令列表边界 | [列表与内容分组](02-structure-links-lists/03-lists-figures-content-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LST-005 | `dl`、`dt`、`dd` 名称值关系 | [列表与内容分组](02-structure-links-lists/03-lists-figures-content-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LST-006 | `figure`、`figcaption` | [列表与内容分组](02-structure-links-lists/03-lists-figures-content-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LST-007 | `blockquote`、`pre`、`hr` | [列表与内容分组](02-structure-links-lists/03-lists-figures-content-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| LST-008 | 列表、描述列表、表格与分节的选择 | [列表与内容分组](02-structure-links-lists/03-lists-figures-content-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |

## 5. 媒体与嵌入

以下教程已在 B 批交付：

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MED-001 | `img` 的 `src`、`alt`、固有尺寸 | [响应式图片](03-images-media-embedding/01-images-responsive-performance.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-002 | 装饰图、信息图和链接图替代文本 | [响应式图片](03-images-media-embedding/01-images-responsive-performance.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-003 | `srcset`、`sizes` 与 `currentSrc` | [响应式图片](03-images-media-embedding/01-images-responsive-performance.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-004 | `picture` 与图片 `source` | [响应式图片](03-images-media-embedding/01-images-responsive-performance.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-005 | `loading`、`decoding`、`fetchpriority` | [响应式图片](03-images-media-embedding/01-images-responsive-performance.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-006 | 图片 CORS、referrer 与解码失败 | [响应式图片](03-images-media-embedding/01-images-responsive-performance.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-007 | `audio`、`video` 与媒体 `source` | [音视频与字幕](03-images-media-embedding/02-audio-video-tracks.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-008 | controls、preload、autoplay、muted、poster、playsinline | [音视频与字幕](03-images-media-embedding/02-audio-video-tracks.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-009 | `track`、WebVTT、字幕、描述、章节 | [音视频与字幕](03-images-media-embedding/02-audio-video-tracks.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-010 | 媒体状态、事件和 `play()` Promise | [音视频与字幕](03-images-media-embedding/02-audio-video-tracks.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-011 | `iframe`、`object`、`embed` | [嵌入、SVG 与 Canvas](03-images-media-embedding/03-embedding-svg-canvas.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-012 | sandbox、allow、同源与嵌入拒绝 | [嵌入、SVG 与 Canvas](03-images-media-embedding/03-embedding-svg-canvas.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-013 | `map`、`area` 与文本替代 | [嵌入、SVG 与 Canvas](03-images-media-embedding/03-embedding-svg-canvas.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-014 | HTML 中的 SVG 与外部 SVG | [嵌入、SVG 与 Canvas](03-images-media-embedding/03-embedding-svg-canvas.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| MED-015 | Canvas 尺寸、像素、跨源污染与替代 | [嵌入、SVG 与 Canvas](03-images-media-embedding/03-embedding-svg-canvas.md) | 是 | 是 | 是 | 是 | 是 | 是 |

## 6. 表格

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TBL-001 | 二维数据与非表格内容选择 | [表格模型与表头](04-tables-data/01-table-model-headers-spans.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TBL-002 | `table`、`caption`、行组 | [表格模型与表头](04-tables-data/01-table-model-headers-spans.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TBL-003 | `tr`、`th`、`td` | [表格模型与表头](04-tables-data/01-table-model-headers-spans.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TBL-004 | `scope` 的 row/col/rowgroup/colgroup | [表格模型与表头](04-tables-data/01-table-model-headers-spans.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TBL-005 | `id`、`headers` 复杂关联 | [表格模型与表头](04-tables-data/01-table-model-headers-spans.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TBL-006 | `colspan`、`rowspan` 与网格位置 | [表格模型与表头](04-tables-data/01-table-model-headers-spans.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TBL-007 | `colgroup`、`col` | [表格模型与表头](04-tables-data/01-table-model-headers-spans.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TBL-008 | 小屏滚动、长内容和打印 | [响应式表格与 DOM](04-tables-data/02-table-accessibility-responsive-dom.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TBL-009 | 键盘、读屏与表头测试 | [响应式表格与 DOM](04-tables-data/02-table-accessibility-responsive-dom.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TBL-010 | HTMLTableElement 与 rows/cells 集合 | [响应式表格与 DOM](04-tables-data/02-table-accessibility-responsive-dom.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| TBL-011 | insert/delete row/cell 与安全生成 | [响应式表格与 DOM](04-tables-data/02-table-accessibility-responsive-dom.md) | 是 | 是 | 是 | 是 | 是 | 是 |

## 7. 表单

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FRM-001 | form action、method、target、accept-charset | [提交与成功控件](05-forms-validation/01-form-submission-successful-controls.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-002 | enctype 三种编码与文件上传 | [提交与成功控件](05-forms-validation/01-form-submission-successful-controls.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-003 | name、value、提交按钮和成功控件 | [提交与成功控件](05-forms-validation/01-form-submission-successful-controls.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-004 | 禁用、未选中、只读控件的提交行为 | [提交与成功控件](05-forms-validation/01-form-submission-successful-controls.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-005 | FormData、同名多值、getAll | [提交与成功控件](05-forms-validation/01-form-submission-successful-controls.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-006 | URLSearchParams 与 GET 查询 | [提交与成功控件](05-forms-validation/01-form-submission-successful-controls.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-007 | requestSubmit 与 submit | [提交与成功控件](05-forms-validation/01-form-submission-successful-controls.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-008 | text、search、email、url、tel、password | [input 类型和值](05-forms-validation/02-input-types-values.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-009 | number、range | [input 类型和值](05-forms-validation/02-input-types-values.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-010 | date、time、datetime-local、month、week | [input 类型和值](05-forms-validation/02-input-types-values.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-011 | color | [input 类型和值](05-forms-validation/02-input-types-values.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-012 | checkbox、radio | [input 类型和值](05-forms-validation/02-input-types-values.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-013 | file、hidden | [input 类型和值](05-forms-validation/02-input-types-values.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-014 | button、submit、reset、image | [input 类型和值](05-forms-validation/02-input-types-values.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-015 | 当前值、默认值、checked/defaultChecked | [input 类型和值](05-forms-validation/02-input-types-values.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-016 | valueAsNumber、valueAsDate、stepUp/stepDown | [input 类型和值](05-forms-validation/02-input-types-values.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-017 | label 与可见名称 | [控件与分组](05-forms-validation/03-form-controls-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-018 | textarea 的初始值、当前值、rows/cols/wrap | [控件与分组](05-forms-validation/03-form-controls-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-019 | select、option、optgroup、selectedOptions | [控件与分组](05-forms-validation/03-form-controls-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-020 | button 元素与 type/form/name/value | [控件与分组](05-forms-validation/03-form-controls-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-021 | fieldset、legend 与 disabled 传播 | [控件与分组](05-forms-validation/03-form-controls-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-022 | datalist 与建议值边界 | [控件与分组](05-forms-validation/03-form-controls-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-023 | output、progress、meter | [控件与分组](05-forms-validation/03-form-controls-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-024 | autocomplete、inputmode、enterkeyhint 等输入辅助 | [控件与分组](05-forms-validation/03-form-controls-groups.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-025 | required、长度、pattern | [约束验证与文件](05-forms-validation/04-constraint-validation-files.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-026 | min、max、step 与数值/日期约束 | [约束验证与文件](05-forms-validation/04-constraint-validation-files.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-027 | accept、multiple 与文件检查 | [约束验证与文件](05-forms-validation/04-constraint-validation-files.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-028 | ValidityState 全部相关状态 | [约束验证与文件](05-forms-validation/04-constraint-validation-files.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-029 | checkValidity、reportValidity、validationMessage | [约束验证与文件](05-forms-validation/04-constraint-validation-files.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-030 | setCustomValidity 与 customError 生命周期 | [约束验证与文件](05-forms-validation/04-constraint-validation-files.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-031 | invalid 事件、错误汇总与焦点 | [约束验证与文件](05-forms-validation/04-constraint-validation-files.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| FRM-032 | 浏览器校验、业务校验、服务端校验边界 | [约束验证与文件](05-forms-validation/04-constraint-validation-files.md) | 是 | 是 | 是 | 是 | 是 | 是 |

## 8. DOM、事件与原生交互

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| INT-001 | `details`、`summary`、open、toggle | [原生交互元素](06-interactive-dom/01-native-interactive-elements.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| INT-002 | `dialog`、show/showModal/close | [原生交互元素](06-interactive-dom/01-native-interactive-elements.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| INT-003 | cancel、close、method=dialog、焦点恢复 | [原生交互元素](06-interactive-dom/01-native-interactive-elements.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| INT-004 | popover 模式与 invoker 属性 | [原生交互元素](06-interactive-dom/01-native-interactive-elements.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOM-001 | getElementById、querySelector、querySelectorAll | [DOM 查询与修改](06-interactive-dom/02-dom-query-mutation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOM-002 | 静态 NodeList 与动态集合 | [DOM 查询与修改](06-interactive-dom/02-dom-query-mutation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOM-003 | 节点/元素导航、closest、matches | [DOM 查询与修改](06-interactive-dom/02-dom-query-mutation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOM-004 | createElement、createTextNode | [DOM 查询与修改](06-interactive-dom/02-dom-query-mutation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOM-005 | append、prepend、before、after | [DOM 查询与修改](06-interactive-dom/02-dom-query-mutation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOM-006 | remove、replaceWith、replaceChildren | [DOM 查询与修改](06-interactive-dom/02-dom-query-mutation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOM-007 | textContent 与 innerHTML 安全边界 | [DOM 查询与修改](06-interactive-dom/02-dom-query-mutation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOM-008 | classList | [DOM 查询与修改](06-interactive-dom/02-dom-query-mutation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOM-009 | dataset 与 data-* | [DOM 查询与修改](06-interactive-dom/02-dom-query-mutation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOM-010 | getAttribute、setAttribute、toggleAttribute | [DOM 查询与修改](06-interactive-dom/02-dom-query-mutation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| DOM-011 | 内容属性与 DOM 属性 | [DOM 查询与修改](06-interactive-dom/02-dom-query-mutation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| EVT-001 | addEventListener、removeEventListener、AbortSignal | [事件与委托](06-interactive-dom/03-events-forms-delegation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| EVT-002 | 捕获、目标、冒泡 | [事件与委托](06-interactive-dom/03-events-forms-delegation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| EVT-003 | target、currentTarget、closest | [事件与委托](06-interactive-dom/03-events-forms-delegation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| EVT-004 | preventDefault、stopPropagation、passive | [事件与委托](06-interactive-dom/03-events-forms-delegation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| EVT-005 | click、input、change | [事件与委托](06-interactive-dom/03-events-forms-delegation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| EVT-006 | submit、invalid | [事件与委托](06-interactive-dom/03-events-forms-delegation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| EVT-007 | toggle、close | [事件与委托](06-interactive-dom/03-events-forms-delegation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| EVT-008 | 事件委托与动态列表 | [事件与委托](06-interactive-dom/03-events-forms-delegation.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| INT-005 | `template`、DocumentFragment、cloneNode | [模板与组件](06-interactive-dom/04-templates-web-components.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| INT-006 | 自定义元素命名与 define | [模板与组件](06-interactive-dom/04-templates-web-components.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| INT-007 | connected/disconnected/attributeChanged 生命周期 | [模板与组件](06-interactive-dom/04-templates-web-components.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| INT-008 | Shadow DOM 封装边界 | [模板与组件](06-interactive-dom/04-templates-web-components.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| INT-009 | `slot`、fallback、assignedElements、slotchange | [模板与组件](06-interactive-dom/04-templates-web-components.md) | 是 | 是 | 是 | 是 | 是 | 是 |

## 9. 无障碍与 SEO

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A11Y-001 | 原生角色、地标和标题导航 | [名称、地标与键盘](07-accessibility-seo/01-accessible-name-landmarks-keyboard.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| A11Y-002 | 可访问名称来源 | [名称、地标与键盘](07-accessibility-seo/01-accessible-name-landmarks-keyboard.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| A11Y-003 | 描述、状态和可见标签一致性 | [名称、地标与键盘](07-accessibility-seo/01-accessible-name-landmarks-keyboard.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| A11Y-004 | 键盘激活、焦点顺序、焦点可见 | [名称、地标与键盘](07-accessibility-seo/01-accessible-name-landmarks-keyboard.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| A11Y-005 | 跳过导航与 tabindex 边界 | [名称、地标与键盘](07-accessibility-seo/01-accessible-name-landmarks-keyboard.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| A11Y-006 | ARIA 优先级与误用 | [名称、地标与键盘](07-accessibility-seo/01-accessible-name-landmarks-keyboard.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| A11Y-007 | status、alert、live region、aria-busy | [动态状态与替代](07-accessibility-seo/02-dynamic-status-focus-media.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| A11Y-008 | 表单错误汇总与焦点 | [动态状态与替代](07-accessibility-seo/02-dynamic-status-focus-media.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| A11Y-009 | 对话框和动态列表焦点恢复 | [动态状态与替代](07-accessibility-seo/02-dynamic-status-focus-media.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| A11Y-010 | 图片、字幕、音频描述和图表替代 | [动态状态与替代](07-accessibility-seo/02-dynamic-status-focus-media.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| A11Y-011 | 缩放、触控、颜色与减少动效 | [动态状态与替代](07-accessibility-seo/02-dynamic-status-focus-media.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| SEO-001 | title、description 与真实正文 | [SEO 与结构化数据](07-accessibility-seo/03-metadata-seo-structured-data.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| SEO-002 | canonical 与 URL 规范化边界 | [SEO 与结构化数据](07-accessibility-seo/03-metadata-seo-structured-data.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| SEO-003 | robots meta 与 robots.txt 边界 | [SEO 与结构化数据](07-accessibility-seo/03-metadata-seo-structured-data.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| SEO-004 | sitemap、有效链接与 HTTP 状态 | [SEO 与结构化数据](07-accessibility-seo/03-metadata-seo-structured-data.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| SEO-005 | 抓取与索引差异 | [SEO 与结构化数据](07-accessibility-seo/03-metadata-seo-structured-data.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| SEO-006 | Microdata、JSON-LD 与可见内容一致 | [SEO 与结构化数据](07-accessibility-seo/03-metadata-seo-structured-data.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| SEO-007 | 客户端渲染、SSR 和预渲染边界 | [SEO 与结构化数据](07-accessibility-seo/03-metadata-seo-structured-data.md) | 是 | 是 | 是 | 是 | 是 | 是 |

## 10. 元素参考、历史与迁移

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HIS-001 | 现行元素按职责检索 | [元素、属性与 API 索引](08-html-element-reference/01-element-attribute-api-index.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| HIS-002 | 全局属性与元素专属属性 | [元素、属性与 API 索引](08-html-element-reference/01-element-attribute-api-index.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| HIS-003 | DOM 接口和关键默认行为 | [元素、属性与 API 索引](08-html-element-reference/01-element-attribute-api-index.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| HIS-004 | SVG、MathML 根入口与自定义元素 | [元素、属性与 API 索引](08-html-element-reference/01-element-attribute-api-index.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| HIS-005 | 废弃呈现元素与 CSS 替代 | [历史与迁移](08-html-element-reference/02-deprecated-history-migration.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| HIS-006 | frameset/frame/noframes 与现代页面 | [历史与迁移](08-html-element-reference/02-deprecated-history-migration.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| HIS-007 | applet/embed 旧插件历史与当前嵌入 | [历史与迁移](08-html-element-reference/02-deprecated-history-migration.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| HIS-008 | marquee/blink 与可访问动效替代 | [历史与迁移](08-html-element-reference/02-deprecated-history-migration.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| HIS-009 | align/bgcolor/border/cellpadding/cellspacing | [历史与迁移](08-html-element-reference/02-deprecated-history-migration.md) | 是 | 是 | 是 | 是 | 是 | 是 |
| HIS-010 | 浏览器容错与新代码标准的区别 | [历史与迁移](08-html-element-reference/02-deprecated-history-migration.md) | 是 | 是 | 是 | 是 | 是 | 是 |

## 11. 阶段完成检查

覆盖矩阵最终验收时必须满足：

1. 所有“主要教程”均为可点击且存在的相对链接；
2. 每个 ID 能在主要教程中找到对应理论与案例；
3. 所有“是”都有正文证据，不能仅由本表声明；
4. 元素参考负责检索，主要知识仍由详细教程负责教学；
5. 未完成的浏览器、读屏、字幕和真实媒体检查在模块验收中明确记录。

[返回 HTML 模块](README.md) · [开始解析教程](01-document-text/01-parser-document-model.md)
