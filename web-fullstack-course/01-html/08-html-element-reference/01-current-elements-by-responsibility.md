# 现行元素职责索引：从内容需求选择 HTML

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 从内容职责、内容类别和内容模型反查现行元素，并区分空内容模型与语法。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `HIS-001`、`HIS-004` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

从内容职责、内容类别和内容模型反查现行元素，并区分空内容模型与语法。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 HIS-001（现行元素按职责检索）、HIS-004（SVG、MathML 根入口与自定义元素）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 从职责到实现的七步检索

```text
需求
  ↓
内容/操作职责
  ↓
候选原生元素
  ↓
允许上下文与内容模型
  ↓
专属属性、全局属性与 ARIA 边界
  ↓
DOM 接口和默认行为
  ↓
兼容数据、目标环境实测与恢复路径
```

“语义更具体”不表示名称更长，而表示它更准确地描述内容。例如，可独立分发的一条商品信息适合 `article`；有标题的主题分节适合 `section`；只为布局分组且没有额外含义时才使用 `div`。

### 4.2 内容类别不是可随意组合的标签集合

常见类别包括：

- **元数据内容**：通常进入 `head`，例如 `title`、`meta`、`link`；
- **流内容**：大多数正文结构；
- **分节内容**：`article`、`aside`、`nav`、`section`；
- **标题内容**：`h1` 至 `h6` 与 `hgroup`；
- **短语内容**：可参与段落文本流的文字级内容；
- **嵌入内容**：图片、媒体、子文档、图形；
- **交互内容**：链接、按钮、表单控件等；
- **脚本支持内容**：`script` 与 `template`，可出现在某些特殊内容模型中。

三个容易误判的边界：

1. `p` 只接受短语内容，不能用它包住 `div`、`section` 或 `table`。
2. `ul`、`ol`、`menu` 的项目是 `li`；子列表应进入某个 `li`，不能与 `li` 并列。
3. `table`、`select`、`picture`、`details` 等有专门内部语法，不能因为子元素“能显示”就认为父子关系有效。

### 4.3 空内容模型不等于空元素语法

HTML 空元素是：

`area`、`base`、`br`、`col`、`embed`、`hr`、`img`、`input`、`link`、`meta`、`source`、`track`、`wbr`。

它们没有结束标签。其他元素即使当前内容模型为空，也不自动成为空元素。例如 `selectedcontent` 的内容由浏览器镜像，作者仍不能把它写成通用“自闭合标签”。HTML 中的尾部 `/` 不会把普通元素变成 XML 式自闭合元素。

## 5. 元素、属性、API 或配置清单

### 5.1 文档根、元信息与资源

| 元素组 | 用途与允许上下文/内容边界 | 关键属性 | DOM 接口与默认行为 | 主教程 | 最小写法 | 兼容性说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `html`、`head`、`body` | `html` 是文档根，通常包含一个 `head` 和一个 `body`；`head` 接受元数据内容，`body` 接受流内容 | `html[lang]`、`dir`、全局属性 | `HTMLHtmlElement`、`HTMLHeadElement`、`HTMLBodyElement`；解析器可补缺失节点，但源码仍应显式完整 | [解析与文档模型](../01-document-text/01-html-parser-dom.md) | `<html lang="zh-CN"><head>…</head><body>…</body></html>` | 稳定基线；错误恢复不等于作者写法有效 |
| `title` | 只在 `head` 中；内容是文档标题文本，不是正文标题 | 全局属性；正文标题另用 `h1`–`h6` | `HTMLTitleElement`；同步浏览器标签、历史等文档标题界面，`document.title` 可读写 | [head 与资源](../01-document-text/03-head-metadata-base.md) | `<title>竹篮 · 邻里集市</title>` | 稳定；搜索展示仍由搜索引擎决定 |
| `base` | 只在 `head`；整份文档最多一个 `href` 和一个 `target` 基准入口 | `href`、`target` | `HTMLBaseElement`；改变相对 URL 与默认导航目标 | [head 与资源](../01-document-text/03-head-metadata-base.md) | `<base href="https://market.example/">` | 稳定但副作用全局；片段链接也可能被改写 |
| `meta` | 通常在 `head`；空元素，表达字符集、命名元数据或有限 pragma | `charset`，或 `name` + `content`，或 `http-equiv` + `content`，以及 `media` | `HTMLMetaElement`；不显示普通正文，也不能模拟任意 HTTP 响应头 | [head 与资源](../01-document-text/03-head-metadata-base.md) | `<meta charset="utf-8">` | 稳定；SEO 与安全效果需要对应消费方和真实响应验证 |
| `link` | 通常在 `head`；空元素，声明文档与外部资源/URL 的关系 | `rel`、`href`、`as`、`media`、`type`、`crossorigin`、`integrity`、`referrerpolicy`、`fetchpriority` | `HTMLLinkElement`；可触发样式、预加载、图标或关系处理 | [head 与资源](../01-document-text/03-head-metadata-base.md) | `<link rel="stylesheet" href="market.css">` | 关系类型和加载属性分别核验；提示不保证下载或排名 |
| `style` | 在 `head` 中提供当前文档样式文本；不承担内容语义 | `media`、`blocking` | `HTMLStyleElement`；参与 CSS 级联和可能的渲染阻塞 | [head 与资源](../01-document-text/03-head-metadata-base.md) | `<style>body { color: #222; }</style>` | CSS 能力另查 CSS 规范；`blocking` 等子特性需查目标环境 |
| `script`、`noscript` | `script` 可在元数据、流或短语/脚本支持位置嵌入脚本/数据；`noscript` 的允许内容取决于是否在 `head` 及脚本是否启用 | `script[src]`、`type`、`defer`、`async`、`nomodule`、`integrity`、`crossorigin`、`referrerpolicy`、`fetchpriority` | `HTMLScriptElement` 与 `HTMLElement`；脚本模式改变下载、解析阻塞与执行顺序 | [head 与资源](../01-document-text/03-head-metadata-base.md) | `<script type="module" src="market.js"></script>` | 稳定基础，执行顺序和 CSP/网络失败必须实测；`noscript` 不是任意 API 回退 |

### 5.2 分节、地标与标题

| 元素组 | 用途与允许上下文/内容边界 | 关键属性 | DOM 接口与默认行为 | 主教程 | 最小写法 | 兼容性说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `header`、`footer` | 流内容中的页级或分节级开头/收尾；内部接受流内容，但嵌套边界受祖先语义限制 | 全局属性、必要时 `aria-label`/`aria-labelledby` | `HTMLElement`；页级通常映射 banner/contentinfo，分节内通常不重复成为同类地标 | [地标与标题](../02-structure-links-lists/01-landmarks-sectioning.md) | `<header><h1>邻里集市</h1></header>` | 稳定；地标映射要在实际树和辅助技术中检查 |
| `main` | 文档主体中的主导内容；接受流内容，文档中不应同时有多个可见且层级正确的主内容 | 全局属性 | `HTMLElement`；通常映射 main 地标 | [地标与标题](../02-structure-links-lists/01-landmarks-sectioning.md) | `<main>商品列表</main>` | 稳定；组件内部不要机械重复可见 `main` |
| `nav` | 重要导航链接分节；接受流内容 | `aria-label`、`aria-labelledby` | `HTMLElement`；通常映射 navigation 地标 | [地标与标题](../02-structure-links-lists/01-landmarks-sectioning.md) | `<nav aria-label="主导航"><a href="/">首页</a></nav>` | 稳定；多个导航应有可区分名称 |
| `article` | 可独立分发、复用或理解的完整内容；接受流内容，可嵌套相关文章 | 全局属性 | `HTMLElement`；提供内容边界，不自动保存或订阅 | [地标与标题](../02-structure-links-lists/01-landmarks-sectioning.md) | `<article><h2>竹篮</h2><p>九成新。</p></article>` | 稳定 |
| `section` | 通用主题分节；接受流内容，通常应有可识别标题 | 必要时 `aria-labelledby` | `HTMLElement`；有可访问名称时可能映射 region | [地标与标题](../02-structure-links-lists/01-landmarks-sectioning.md) | `<section><h2>交接规则</h2>…</section>` | 稳定；不要只为 CSS 分组使用 |
| `aside` | 与周围主体间接相关的补充内容；接受流内容 | 必要时地标名称 | `HTMLElement`；通常映射 complementary 地标 | [地标与标题](../02-structure-links-lists/01-landmarks-sectioning.md) | `<aside><h2>安全提醒</h2></aside>` | 稳定；“右栏”不是语义 |
| `address` | 最近 `article` 或 `body` 的作者/组织联系信息；接受流内容但不用于任意地址 | 全局属性 | `HTMLElement`；不自动创建地图或联系人 | [地标与标题](../02-structure-links-lists/01-landmarks-sectioning.md) | `<address>维护者：市场服务组</address>` | 稳定 |
| `search` | 包含搜索/筛选控件的流内容容器 | 可访问名称属性 | `HTMLElement`；现行 HTML 提供 search 区域语义 | [地标与标题](../02-structure-links-lists/01-landmarks-sectioning.md) | `<search><form>…</form></search>` | 元素现行；旧浏览器/辅助技术映射不齐时按目标环境评估 `role="search"`，不要无证据重复角色 |
| `h1`、`h2`、`h3`、`h4`、`h5`、`h6` | 在流内容、`legend` 或 `summary` 允许标题内容处表达六级显式标题；内部为短语内容 | `id` 常作片段和命名引用 | `HTMLHeadingElement`；进入标题导航，级别由元素名决定 | [地标与标题](../02-structure-links-lists/01-landmarks-sectioning.md) | `<h2 id="rules">交接规则</h2>` | 稳定；不要按默认字号选级别 |
| `hgroup` | 将一个 `h1`–`h6` 与配套段落组合为标题组；可位于流内容、`legend`、`summary` | 全局属性 | `HTMLElement`；不创建第二个同级标题 | [地标与标题](../02-structure-links-lists/01-landmarks-sectioning.md) | `<hgroup><h1>竹篮</h1><p>本周可取</p></hgroup>` | 现行；旧资料对内容模型描述可能过时，以 2026 Living Standard 和目标辅助技术为准 |

### 5.3 内容分组与列表

| 元素组 | 用途与允许上下文/内容边界 | 关键属性 | DOM 接口与默认行为 | 主教程 | 最小写法 | 兼容性说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `p`、`br`、`hr` | `p` 是只含短语内容的段落；`br` 是短语中的换行空元素；`hr` 是流内容中的主题转换空元素 | 全局属性 | `HTMLParagraphElement`、`HTMLBRElement`、`HTMLHRElement`；解析器遇到不允许的块状结构会结束 `p` | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<p>周六<br>南门交接</p><hr>` | 稳定；不用多个 `br` 或 `hr` 造间距 |
| `pre` | 流内容中的预格式化文本块；内部仍解析 HTML，只是保留文本空白 | 全局属性 | `HTMLPreElement`；默认保留空白与等宽呈现 | [列表与内容分组](../02-structure-links-lists/06-lists-descriptions-commands.md) | `<pre><code>priceCents: 3900</code></pre>` | 稳定；源码中的 `<` 仍需字符引用 |
| `blockquote` | 流内容中的块级引用，可包含流内容 | `cite` | `HTMLQuoteElement`；`cite` URL 通常不作为可见来源 | [列表与内容分组](../02-structure-links-lists/06-lists-descriptions-commands.md) | `<blockquote cite="https://example.test/rules"><p>当面验货。</p></blockquote>` | 稳定；另提供可见来源 |
| `div` | 通用流容器；也可在 `dl` 内包名称—值组，在可定制 `select` 中有条件使用 | 全局属性 | `HTMLDivElement`；无专门内容语义和默认操作行为 | [列表与内容分组](../02-structure-links-lists/06-lists-descriptions-commands.md) | `<div class="layout">…</div>` | 稳定；不要先选 `div` 再补造原生行为 |
| `figure`、`figcaption` | `figure` 包含可独立引用的内容；可有一个位于开头或结尾的 `figcaption` | 全局属性 | 均为 `HTMLElement`；图注不机械替代图片 `alt` | [列表与内容分组](../02-structure-links-lists/06-lists-descriptions-commands.md) | `<figure><img src="basket.jpg" alt="竹篮正面"><figcaption>现场照片</figcaption></figure>` | 稳定 |
| `ul`、`ol`、`menu`、`li` | 三种列表容器直接组织 `li`（及脚本支持元素）；`ol` 表示顺序有意义，`menu` 表示命令项目列表 | `ol[start]`、`reversed`、`type`，`li[value]` | `HTMLUListElement`、`HTMLOListElement`、`HTMLMenuElement`、`HTMLLIElement`；保留列表与编号语义 | [列表与内容分组](../02-structure-links-lists/06-lists-descriptions-commands.md) | `<ol start="2"><li>确认时间</li></ol>` | 稳定；`menu` 不自动提供桌面式菜单交互 |
| `dl`、`dt`、`dd` | `dl` 组织名称—值组；`dt` 与后续 `dd` 建立术语/名称和说明关系，可用 `div` 包组 | 全局属性 | `HTMLDListElement` 与通用 `HTMLElement`；不提供二维表头模型 | [列表与内容分组](../02-structure-links-lists/06-lists-descriptions-commands.md) | `<dl><dt>成色</dt><dd>九成新</dd></dl>` | 稳定 |

### 5.4 文本级语义、修订与国际化

| 元素组 | 用途与允许上下文/内容边界 | 关键属性 | DOM 接口与默认行为 | 主教程 | 最小写法 | 兼容性说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `strong`、`em` | 短语内容中分别表达重要性与重读强调，可嵌套提高程度 | 全局属性 | `HTMLElement`；默认常为粗体/斜体，但外观不是选择理由 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<strong>必须当面验货</strong>` | 稳定 |
| `b`、`i` | 短语内容中分别表达引起注意的关键词与不同语气/术语，不表示重要性或重读 | 常配合 `class`、`lang` | `HTMLElement`；有默认视觉样式但无 `strong`/`em` 含义 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<i lang="en">pickup only</i>` | 稳定 |
| `mark`、`small`、`s`、`u` | 分别表示上下文高亮、旁注、已不准确内容、非文本注释 | 全局属性 | `HTMLElement`；默认高亮、小字、删除线、下划线可由 CSS 改变 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<p><s>原价 59 元</s> 现价 39 元</p>` | 稳定；`u` 易与链接混淆，需谨慎设计 |
| `q`、`cite` | `q` 表示短引用并可带来源 URL；`cite` 表示作品标题，不是通用人名容器 | `q[cite]` | `HTMLQuoteElement` 与 `HTMLElement`；浏览器可能为 `q` 加引号 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<q>结实耐用</q>——<cite>社区修缮手册</cite>` | 稳定；引号样式和朗读实测 |
| `abbr`、`dfn` | `abbr` 表示缩写；`dfn` 标出当前段落的定义实例 | `abbr[title]` 可给展开形式 | `HTMLElement`；`title` 不能替代可见解释和触屏路径 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<p><dfn><abbr title="发光二极管">LED</abbr></dfn> 是光源。</p>` | 稳定 |
| `code`、`kbd`、`samp`、`var` | 分别表示代码、用户输入、程序输出和变量；均位于短语内容处 | 全局属性 | `HTMLElement`；默认常用等宽字体，不自动执行代码 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<p>按 <kbd>Enter</kbd>，输出 <samp>已预览</samp>。</p>` | 稳定 |
| `data`、`time` | 将可见文字关联到机器值；位于短语内容处 | `data[value]`、`time[datetime]` | `HTMLDataElement.value`、`HTMLTimeElement.dateTime`；不自动做货币或时区转换 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<data value="3900">39 元</data> <time datetime="2026-10-10T08:00:00Z">16:00</time>` | 稳定；业务仍需单位和时区契约 |
| `del`、`ins` | 透明内容模型中表示文档删除/新增记录；不能跨越不兼容的段落结构 | `cite`、`datetime` | `HTMLModElement`；表达修订，不等同于“现在不准确” | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<del datetime="2026-10-10T08:00:00Z">周五可取</del><ins>周六可取</ins>` | 稳定 |
| `sub`、`sup`、`span` | `sub`/`sup` 表达排版惯例中的上下标；`span` 是通用短语容器 | 全局属性 | `HTMLElement`/`HTMLSpanElement`；`span` 无专门语义 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<span>CO<sub>2</sub>，2<sup>3</sup></span>` | 稳定；不用上下标仅缩小文字 |
| `bdi`、`bdo` | `bdi` 隔离未知方向文本；`bdo` 明确覆盖双向算法；位于短语内容处 | `dir`，`bdo` 应明确 `ltr`/`rtl` | `HTMLElement`；方向处理不同于视觉右对齐 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<bdi>مريم</bdi> <bdo dir="rtl">ABC</bdo>` | 稳定；混合脚本内容需真实测试 |
| `ruby`、`rt`、`rp` | `ruby` 组织正文与注音；`rt` 是注音，`rp` 为旧式不支持环境提供括号文本 | 全局属性 | `HTMLElement`；浏览器执行 ruby 排版 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<ruby>篮<rp>(</rp><rt>lán</rt><rp>)</rp></ruby>` | 主流环境成熟；复杂排版与辅助技术朗读实测 |
| `wbr` | 短语内容中的可选断行机会；空元素 | 全局属性 | `HTMLElement`；只提供断行机会，不插入连字符 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `market<wbr>-listing<wbr>-2026` | 稳定 |

### 5.5 链接与导航目标

| 元素组 | 用途与允许上下文/内容边界 | 关键属性 | DOM 接口与默认行为 | 主教程 | 最小写法 | 兼容性说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `a` | 短语内容中的透明容器；有 `href` 时表示超链接，不能包住违反祖先内容模型的内容，也不要嵌套交互内容 | `href`、`target`、`rel`、`download`、`hreflang`、`type`、`referrerpolicy`、`ping` | `HTMLAnchorElement`；`href` 解析为 URL，激活时导航；无 `href` 时不是普通可用链接 | [URL 与链接](../02-structure-links-lists/03-url-resolution-fragments.md) | `<a href="/listings/basket">查看竹篮</a>` | 稳定；下载、外部处理程序、跨源和新窗口均有额外边界 |
| `link` | 文档与资源/URL 的元数据关系，不是正文可点击链接 | `rel`、`href` 及加载属性 | `HTMLLinkElement`；见元信息表 | [head 与资源](../01-document-text/03-head-metadata-base.md) | `<link rel="canonical" href="https://market.example/listings/basket">` | 关系是否被消费方采用需单独验证 |
| `area` | `map` 内的几何超链接或无链接区域；空元素 | `alt`、`shape`、`coords` 及链接属性 | `HTMLAreaElement`；有 `href` 时参与 `document.links` 和导航 | [嵌入、SVG 与 Canvas](../03-images-media-embedding/07-embedded-documents-image-maps.md) | `<area shape="rect" coords="0,0,80,80" href="#handle" alt="查看提手">` | 稳定语法；响应式坐标和可见文字替代需实测 |

### 5.6 图片、媒体、嵌入、SVG 与 MathML 根

| 元素组 | 用途与允许上下文/内容边界 | 关键属性 | DOM 接口与默认行为 | 主教程 | 最小写法 | 兼容性说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `img` | 短语/嵌入内容中的图片空元素；也可在 `picture` 内作为唯一回退图；使用新近 `controls` 时要求非空 `alt`，且图片成为交互内容 | `src`、`alt`、`width`、`height`、`srcset`、`sizes`、`loading`、`decoding`、`fetchpriority`、`crossorigin`、`referrerpolicy`、`usemap`；新近 `controls` | `HTMLImageElement`；暴露 `currentSrc`、`naturalWidth`、`complete`、`decode()`、`load/error`；`controls` 请求用户代理定义的控件，不保证特定“动画控制”界面 | [响应式图片](../03-images-media-embedding/01-image-semantics-alt-dimensions.md) | `<img src="basket.jpg" alt="竹篮正面" width="800" height="600">` | 元素稳定；格式、候选、懒加载、实现自定义 controls 和跨源结果需按子特性实测 |
| `picture`、图片 `source` | `picture` 在短语内容处组织零个或多个 `source`，最后是一个 `img`；`source` 为空元素 | `source[srcset]`、`sizes`、`media`、`type`、`width`、`height` | `HTMLPictureElement`、`HTMLSourceElement`；浏览器选择候选，真正绘制与替代文本仍由 `img` 承担 | [响应式图片](../03-images-media-embedding/01-image-semantics-alt-dimensions.md) | `<picture><source type="image/avif" srcset="basket.avif"><img src="basket.jpg" alt="竹篮"></picture>` | 结构稳定；格式支持和实际选择查看 `currentSrc` |
| `audio`、`video`、媒体 `source` | 在短语/嵌入位置创建媒体播放器；子 `source` 和 `track` 有专门顺序，回退内容不处理资源运行时失败 | `src`、`controls`、`preload`、`autoplay`、`muted`、`loop`、`crossorigin`、新近 `loading`；`video[poster]`、`playsinline`、尺寸 | `HTMLAudioElement`/`HTMLVideoElement` 继承 `HTMLMediaElement`；提供 `play()`、`pause()`、时间、网络和错误状态 | [音视频与字幕](../03-images-media-embedding/04-media-elements-sources-controls.md) | `<audio controls><source src="note.ogg" type="audio/ogg"></audio>` | 编码、自动播放、延迟加载、原生控件和移动端策略必须按子特性与目标环境实测 |
| `track` | `audio`/`video` 内的定时文本轨道空元素 | `kind`、`src`、`srclang`、`label`、`default` | `HTMLTrackElement`；提供 `track` 对象和 cue 状态 | [音视频与字幕](../03-images-media-embedding/04-media-elements-sources-controls.md) | `<track kind="captions" src="note.zh.vtt" srclang="zh" label="中文">` | 元素稳定；VTT、CORS 和辅助技术呈现需实测 |
| `iframe` | 短语/嵌入位置中的独立子文档，内容模型为空 | `src`、`srcdoc`、`title`、`sandbox`、`allow`、`referrerpolicy`、`loading`、`width`、`height` | `HTMLIFrameElement`；创建子导航上下文，跨源时父页不能直接读其 DOM | [嵌入、SVG 与 Canvas](../03-images-media-embedding/07-embedded-documents-image-maps.md) | `<iframe title="交接规则" src="rules.html" sandbox></iframe>` | 目标服务器可拒绝嵌入；权限策略、同源和沙箱令牌分别验证 |
| `object`、`embed` | 在短语/嵌入位置加载外部资源；`object` 可含透明回退内容，`embed` 是空元素 | `object[data]`、`type`、`name`、`form`、尺寸；`embed[src]`、`type`、尺寸 | `HTMLObjectElement`、`HTMLEmbedElement`；资源处理依赖类型和浏览器能力 | [嵌入、SVG 与 Canvas](../03-images-media-embedding/07-embedded-documents-image-maps.md) | `<object data="rules.pdf" type="application/pdf"><a href="rules.pdf">打开规则</a></object>` | 两者仍是现行元素，但旧插件生态不应成为新基线；始终提供普通链接/内容回退 |
| `map`、`area` | `map` 在短语位置提供透明内容和热点；`area` 只能在图像映射上下文中 | `map[name]`；`area[shape]`、`coords`、`alt`、`href` | `HTMLMapElement`、`HTMLAreaElement`；与 `img[usemap]` 按名称关联 | [嵌入、SVG 与 Canvas](../03-images-media-embedding/07-embedded-documents-image-maps.md) | `<img src="parts.png" alt="竹篮部件图" usemap="#parts"><map name="parts">…</map>` | 基础稳定；缩放后的几何命中、键盘和替代路径需测试 |
| `canvas` | 短语/嵌入位置中的脚本位图画布；透明回退内容应提供等价信息 | `width`、`height` | `HTMLCanvasElement`；`getContext()`、`toBlob()` 等；改位图尺寸会清空状态 | [嵌入、SVG 与 Canvas](../03-images-media-embedding/07-embedded-documents-image-maps.md) | `<canvas width="320" height="180">库存图另见数据表。</canvas>` | 2D 基础成熟；跨源污染、像素密度、上下文类型和替代内容单独验证 |
| SVG `svg` | HTML 短语/嵌入位置中的 SVG 命名空间根；内部元素和属性遵循 SVG，不属于 HTML 元素清单 | `viewBox`、尺寸及 SVG/ARIA 属性 | `SVGSVGElement`；内部图形进入 SVG DOM | [嵌入、SVG 与 Canvas](../03-images-media-embedding/07-embedded-documents-image-maps.md) | `<svg viewBox="0 0 10 10" role="img" aria-label="库存充足"><circle cx="5" cy="5" r="4"></circle></svg>` | 根入口现行；具体 SVG 特性、可访问名称和外部资源另查 SVG/浏览器支持 |
| MathML `math` | HTML 短语/嵌入位置中的 MathML 命名空间根；内部内容遵循 MathML Core | MathML 属性及适用全局属性 | 通用 `Element` 起点；内部数学节点不是 HTML 元素 | [文本语义](../01-document-text/05-text-structure-emphasis.md) | `<math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>` | 根入口现行；排版、字体、内部元素和辅助技术支持按 MathML Core 与目标环境实测 |

### 5.7 表格

| 元素组 | 用途与允许上下文/内容边界 | 关键属性 | DOM 接口与默认行为 | 主教程 | 最小写法 | 兼容性说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `table`、`caption` | `table` 位于流内容处表示二维数据；可含一个靠前的 `caption`、列组、行组或行 | 全局属性 | `HTMLTableElement`、`HTMLTableCaptionElement`；提供 `caption`、`tHead`、`tBodies`、`tFoot`、`rows` | [表格模型与表头](../04-tables-data/01-table-model-structure.md) | `<table><caption>商品比较</caption>…</table>` | 稳定；不用于页面布局 |
| `colgroup`、`col` | 只在 `table` 的行组之前定义连续列；`col` 是空元素，不创建数据格 | `span` | 均使用 `HTMLTableColElement`；只提供有限列级样式和结构信息 | [表格模型与表头](../04-tables-data/01-table-model-structure.md) | `<colgroup><col><col></colgroup>` | 稳定；不会自动建立复杂表头关联 |
| `thead`、`tbody`、`tfoot` | 只在 `table` 中组织 `tr` 行；可以有多个有真实意义的 `tbody` | 全局属性 | `HTMLTableSectionElement.rows`、`insertRow()`、`deleteRow()`；集合是实时的 | [响应式表格与 DOM](../04-tables-data/04-responsive-table-accessibility-print.md) | `<tbody><tr>…</tr></tbody>` | 稳定；打印重复表头和 CSS `display` 影响需实测 |
| `tr`、`th`、`td` | `tr` 位于表或行组中；只含表头/数据格及脚本支持内容；单元格包含流内容 | `th[scope]`、`abbr`、`headers`；`th/td[colspan]`、`rowspan`、`headers` | `HTMLTableRowElement.cells`，`HTMLTableCellElement`；行 API 可增删格，但 `insertCell()` 创建 `td` | [表格模型与表头](../04-tables-data/01-table-model-structure.md) | `<tr><th scope="row">竹篮</th><td><data value="3900">39 元</data></td></tr>` | 稳定；复杂表头关系必须用实际结构、辅助技术和人工推演验证 |

### 5.8 表单与当前 input 类型

| 元素组 | 用途与允许上下文/内容边界 | 关键属性 | DOM 接口与默认行为 | 主教程 | 最小写法 | 兼容性说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `form` | 流内容中的可提交表单，不能嵌套另一个 `form` | `action`、`method`、`enctype`、`target`、`accept-charset`、`autocomplete`、`novalidate`、`name` | `HTMLFormElement`；构造条目列表、约束验证并导航/提交；提供 `elements`、`requestSubmit()`、`reset()` | [提交与成功控件](../05-forms-validation/01-form-action-method-encoding.md) | `<form action="/search" method="get">…</form>` | 基础稳定；服务器必须重新验证、认证、授权并处理 CSRF/并发 |
| `label`、`input` | `label` 位于短语内容处并关联可标记控件；`input` 是短语内容中的空表单控件 | `label[for]`；`input[type]`、`name`、`value` 及类型专属属性 | `HTMLLabelElement.control`、`HTMLInputElement`；类型决定值状态、验证、选择器和激活行为 | [input 类型与值](../05-forms-validation/04-input-types-value-state.md) | `<label for="query">搜索</label><input id="query" name="q" type="search">` | 22 种现行类型见下表；未知 `type` 回退为 `text` |
| `textarea` | 短语内容中的多行文本控件；元素文本给初始值，不使用 `value` 内容属性 | `name`、`rows`、`cols`、`wrap`、`minlength`、`maxlength`、`placeholder`、`required`、`readonly` | `HTMLTextAreaElement`；`value`、`defaultValue`、选择区和验证 API | [控件与分组](../05-forms-validation/09-label-textarea.md) | `<textarea name="note" rows="4"></textarea>` | 稳定；源码缩进会进入初始值 |
| `button` | 短语/交互内容；内部为短语内容且不能再含交互后代；在可定制 `select` 中可作为第一个惰性按钮 | `type`、`name`、`value`、`disabled`、`form`、提交者覆盖属性、`popovertarget`、`commandfor`、`command` | `HTMLButtonElement`；表单中 Auto/缺省常成为提交按钮，激活可提交、重置或执行命令 | [控件与分组](../05-forms-validation/09-label-textarea.md) | `<button type="button">收藏</button>` | 基础稳定；`command`/`commandfor` 与可定制 `select` 属新近子特性，目标环境实测 |
| `select`、`option`、`optgroup` | `select` 位于短语内容；传统基线含 `option`/`optgroup`，2026 内容模型也容纳受约束的可定制结构；`option` 代表选项 | `select[name]`、`multiple`、`size`、`required`、`disabled`；`option[value]`、`selected`；`optgroup[label]` | `HTMLSelectElement`、`HTMLOptionElement`、`HTMLOptGroupElement`；提供 `options`、`selectedOptions`、`value`、`selectedIndex` | [控件与分组](../05-forms-validation/09-label-textarea.md) | `<select name="condition"><option value="used">二手</option></select>` | 传统结构稳定；可定制 `select` 的富内容与样式是有限支持子特性 |
| `selectedcontent` | 只能作为可定制 `select` 第一个 `button` 的后代；作者内容模型为空，镜像当前 `option` 内容 | 全局属性 | `HTMLSelectedContentElement`；浏览器克隆当前选项内容供关闭状态显示 | [控件与分组](../05-forms-validation/09-label-textarea.md)（传统基线） | `<select><button><selectedcontent></selectedcontent></button><option>二手</option></select>` | **现行但 Limited availability**；不能作为无回退的生产基线，动态选项同步也需实测 |
| `datalist` | 短语内容中的建议值容器，通常由 `input[list]` 引用；选项是建议而非白名单 | 自身 `id`，`input[list]` | `HTMLDataListElement.options`；浏览器可提供建议 UI | [控件与分组](../05-forms-validation/09-label-textarea.md) | `<input list="areas"><datalist id="areas"><option value="南门"></option></datalist>` | 基础支持广但 UI/无障碍差异明显；不能替代验证或 `select` |
| `fieldset`、`legend` | `fieldset` 在流内容中分组控件；首个 `legend` 为组标题，并参与 disabled 传播例外 | `fieldset[disabled]`、`form`、`name` | `HTMLFieldSetElement`、`HTMLLegendElement`；禁用会传播给后代控件，首个 `legend` 内有例外 | [控件与分组](../05-forms-validation/09-label-textarea.md) | `<fieldset><legend>交接方式</legend>…</fieldset>` | 稳定；传播和可访问名称应在真实结构中检查 |
| `output` | 短语内容中的计算结果，可标记、重置、关联表单，但不会自动计算 | `for`、`form`、`name` | `HTMLOutputElement.value/defaultValue`；通常不成为成功提交控件 | [控件与分组](../05-forms-validation/09-label-textarea.md) | `<output for="price">3900 分</output>` | 稳定；动态变化是否需要状态通知另行判断 |
| `progress`、`meter` | 均位于短语内容；`progress` 表任务进度，`meter` 表已知范围内测量；内部短语内容是可见回退文字 | `progress[value]`、`max`；`meter[value]`、`min`、`max`、`low`、`high`、`optimum` | `HTMLProgressElement`、`HTMLMeterElement`；原生状态和视觉由浏览器提供 | [控件与分组](../05-forms-validation/09-label-textarea.md) | `<progress value="2" max="5">2/5</progress>` | 稳定；颜色、朗读和动态更新不要只凭默认呈现判断 |

#### 22 种现行 input 类型

| 类型组 | 当前类型 | 适合的数据/操作 | 关键属性与 DOM 状态 | 默认与兼容边界 |
| --- | --- | --- | --- | --- |
| 字符串 | `text` | 通用单行文本 | `value`、`defaultValue`、`minlength`、`maxlength`、`pattern`、选择区 API | 缺省和未知类型回退状态；回退不代表拼写有效 |
| 字符串 | `search` | 搜索词 | 与 `text` 类似，可能有平台清除 UI | UI 与事件细节按浏览器实测 |
| 字符串 | `email` | 一个或多个邮箱地址 | `multiple`、`typeMismatch` | 只检查语法形态，不证明地址存在 |
| 字符串 | `url` | URL 字符串 | `typeMismatch`、URL 约束 | 通过不代表目标可信或可由服务器安全抓取 |
| 字符串 | `tel` | 电话标识 | `pattern`、`inputmode` | 没有统一国际格式验证 |
| 字符串 | `password` | 需要遮蔽显示的秘密文本 | `autocomplete`、长度/模式约束 | 不自动加密传输或安全保存 |
| 数值 | `number` | 可计算数量 | `min`、`max`、`step`、`valueAsNumber`、`stepUp()`/`stepDown()` | 不适合手机号、邮编、商品编号；本地化 UI 有差异 |
| 数值 | `range` | 有界近似数值 | `min`、`max`、`step`、`valueAsNumber` | 应另行显示当前值；默认中点需理解 |
| 日期时间 | `date` | 无时区日历日期 | `min`、`max`、`step`、`valueAsDate`/`valueAsNumber` | 选择器 UI 本地化，机器值格式固定 |
| 日期时间 | `time` | 无日期的本地时间 | `min`、`max`、`step`、`valueAsNumber` | 不包含时区 |
| 日期时间 | `datetime-local` | 本地日期时间 | `min`、`max`、`step`、`valueAsNumber` | 不含时区，不能直接追加 `Z` 冒充 UTC |
| 日期时间 | `month` | 年月 | `min`、`max`、`step` | `valueAsNumber` 语义不要类推为普通时间戳 |
| 日期时间 | `week` | 周编号 | `min`、`max`、`step` | 周年边界和选择器支持需实测 |
| 颜色 | `color` | 颜色选择 | `value`；新近 `alpha`、`colorspace` 子能力 | 基础 sRGB 选择较成熟；透明度和色彩空间有限支持，分能力检测 |
| 选择 | `checkbox` | 独立布尔/多选项 | `checked`、`defaultChecked`、`value` | 未选中时不产生表单条目 |
| 选择 | `radio` | 同名互斥单选 | `name`、`checked`、`defaultChecked`、`value` | 分组依赖名称和表单所有者 |
| 文件 | `file` | 用户授权选择本地文件 | `accept`、`multiple`、`files` | `accept` 只是提示；最终检查在服务端，脚本不能设置真实路径 |
| 隐藏 | `hidden` | 不显示但参与提交的数据 | `name`、`value` | 不可见不等于可信、保密或不可篡改 |
| 提交 | `submit` | 提交表单 | `name`、`value`、提交者覆盖属性 | 只有实际提交者的名称和值进入条目 |
| 提交 | `image` | 图片提交按钮 | `src`、`alt`、尺寸、提交者覆盖属性 | 提交坐标条目；必须有文本替代 |
| 命令 | `reset` | 恢复表单默认状态 | `value` | 可能造成误操作；重置不是清空所有业务状态 |
| 命令 | `button` | 无内建动作的输入按钮 | `value` | 本身不做事；通常优先使用内容更灵活的 `button` 元素 |

所有可验证控件都可能暴露 `willValidate`、`validity`、`validationMessage`、`checkValidity()`、`reportValidity()` 和 `setCustomValidity()`，但具体约束只适用于支持它的类型。详细状态见[约束验证与文件](../05-forms-validation/13-constraint-attributes-candidates.md)。

### 5.9 原生交互、脚本、模板、slot 与自定义元素

| 元素组 | 用途与允许上下文/内容边界 | 关键属性 | DOM 接口与默认行为 | 主教程 | 最小写法 | 兼容性说明 |
| --- | --- | --- | --- | --- | --- | --- |
| `details`、`summary` | `details` 位于流内容；第一个 `summary` 是披露标题，后接流内容 | `details[open]`、`name` | `HTMLDetailsElement.open`、`toggle`；`summary` 提供原生键盘激活 | [原生交互元素](../06-interactive-dom/01-details-summary-toggle.md) | `<details><summary>查看成色</summary><p>九成新。</p></details>` | 基础稳定；`details[name]` 命名组需按目标环境检测 |
| `dialog` | 流内容中的对话框容器，内部接受流内容 | `open` | `HTMLDialogElement.show()`、`showModal()`、`close()`、`requestClose()`、`returnValue`、`cancel/close` | [原生交互元素](../06-interactive-dom/01-details-summary-toggle.md) | `<dialog id="confirm"><button type="button">关闭</button></dialog>` | 主体能力成熟；关闭请求、焦点和新方法按子能力检测 |
| 任意支持 `popover` 的 HTML 元素 | `popover` 是全局属性，不是一个名为 popover 的元素；内容进入顶层但保持非模态 | `popover`、调用者的 `popovertarget`/`popovertargetaction` | `HTMLElement.showPopover()`、`hidePopover()`、`togglePopover()` 与 `beforetoggle/toggle` | [原生交互元素](../06-interactive-dom/01-details-summary-toggle.md) | `<div id="help" popover>价格为整数分。</div>` | 现行但扩展持续演进；auto/manual 和每个新值/调用属性分开检测 |
| `script`、`noscript` | 见文档元信息组；也可作为脚本支持内容进入多个专用模型 | 见 5.1 | `HTMLScriptElement`/`HTMLElement`；默认执行或展示回退取决于脚本模式与环境 | [head 与资源](../01-document-text/03-head-metadata-base.md) | `<noscript>核心商品信息仍可阅读。</noscript>` | 不用 `noscript` 代替任意 API 特性检测 |
| `template` | 元数据、流、短语或脚本支持位置中的惰性模板；普通子内容不直接进入活动文档树 | `shadowrootmode` 及声明式 Shadow DOM 相关属性 | `HTMLTemplateElement.content` 返回 `DocumentFragment`；克隆后才插入活动树 | [模板与组件](../06-interactive-dom/10-template-fragment-clone.md) | `<template id="card"><article>商品</article></template>` | 基础模板成熟；声明式 Shadow DOM 各属性按目标环境核验 |
| `slot` | Shadow tree 中的投影位置；透明内容模型，内部是未分配时的 fallback | `name` | `HTMLSlotElement.assignedElements()`、`assignedNodes()`、`slotchange` | [模板与组件](../06-interactive-dom/10-template-fragment-clone.md) | `<slot name="title">未命名商品</slot>` | 基础成熟；只在 Shadow DOM 分配关系中生效 |
| 自主自定义元素 | 作者定义的合法带连字符名称，不存在有限标签清单；可出现在流/短语位置，内容模型由组件契约决定 | 全局属性和组件作者定义的属性 | 作者类继承 `HTMLElement`；`customElements.define/get/whenDefined` 和生命周期回调 | [模板与组件](../06-interactive-dom/10-template-fragment-clone.md) | `<market-card></market-card>` | 主流现代浏览器支持自主元素；未定义时仍作为未知元素存在，核心内容应渐进增强 |
| customized built-in element | 通过 `is` 扩展内建元素，父子边界仍由被扩展元素决定 | 全局 `is` | 构造函数继承具体内建接口 | [模板与组件](../06-interactive-dom/10-template-fragment-clone.md) | `<button is="market-favorite">收藏</button>` | 现行模型但兼容性不一致；课程项目不作为基线 |

### 5.10 现行元素覆盖账本

以下账本与 **2026-10-09 HTML Living Standard 元素索引** 对照，用于检查本课没有遗漏现行名称。SVG 与 MathML 只列进入 HTML 的根；自主自定义元素列为开放类别，不伪造有限清单。

- 文档与资源：`html`、`head`、`body`、`title`、`base`、`meta`、`link`、`style`、`script`、`noscript`
- 分节与标题：`header`、`footer`、`main`、`nav`、`article`、`section`、`aside`、`address`、`search`、`h1`、`h2`、`h3`、`h4`、`h5`、`h6`、`hgroup`
- 分组与列表：`p`、`br`、`hr`、`pre`、`blockquote`、`div`、`figure`、`figcaption`、`ul`、`ol`、`menu`、`li`、`dl`、`dt`、`dd`
- 文本、修订与国际化：`abbr`、`dfn`、`strong`、`em`、`b`、`i`、`mark`、`small`、`s`、`u`、`q`、`cite`、`code`、`kbd`、`samp`、`var`、`data`、`time`、`del`、`ins`、`sub`、`sup`、`span`、`bdi`、`bdo`、`ruby`、`rt`、`rp`、`wbr`
- 链接：`a`
- 图片、媒体、嵌入与外部命名空间根：`img`、`picture`、`source`、`audio`、`video`、`track`、`iframe`、`object`、`embed`、`map`、`area`、`canvas`、SVG `svg`、MathML `math`
- 表格：`table`、`caption`、`colgroup`、`col`、`thead`、`tbody`、`tfoot`、`tr`、`th`、`td`
- 表单：`form`、`label`、`input`、`textarea`、`button`、`select`、`option`、`optgroup`、`selectedcontent`、`datalist`、`fieldset`、`legend`、`output`、`progress`、`meter`
- 交互与组件：`details`、`summary`、`dialog`、`template`、`slot`、自主自定义元素

账本有 **115 个固定现行入口名称**（把 `h1` 至 `h6` 分别计数，也计入 `svg`、`math`），另有开放的自主自定义元素类别。过时名称不计入这个数字。

## 6. 最小可运行案例

在个人练习目录中新建 `practice/01-current-elements-by-responsibility/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 HIS-001（现行元素按职责检索） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 HIS-004（SVG、MathML 根入口与自定义元素） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [属性、DOM API 与默认行为：连接标记和运行状态](02-attributes-dom-apis-default-behavior.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 HIS-001（现行元素按职责检索） 对应的元素、属性或状态；
- 在项目中实现并标出与 HIS-004（SVG、MathML 根入口与自定义元素） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`02-attributes-dom-apis-default-behavior.md`](02-attributes-dom-apis-default-behavior.md)。

## 8. 常见错误与排查路径

### 8.1 明确错误：把索引当成外观菜单

**错误示例：**

```html
<b class="large">交接规则</b>
<a href="#" onclick="saveFavorite()">收藏</a>
```

第一行看起来像标题但不进入标题层级；第二行声明导航却执行原地命令，还制造空片段导航。修复：

```html
<h2>交接规则</h2>
<button type="button">收藏</button>
```

### 8.2 明确错误：用索引代替详细教程

索引表中的 `<img alt>` 不足以教会装饰图、链接图、响应式候选、布局稳定、解码失败和 CORS。正确路径是：索引定位 → 打开主教程 → 运行最小案例 → 注入错误 → 记录恢复。

### 8.3 已填写的诊断与恢复记录

```text
现象：收藏文字变了，但按 Space 没有动作，辅助技术也不读为按钮。
输入：<div class="favorite" role="button">收藏</div>
职责：在当前页面执行收藏命令。
源码证据：使用 div，只添加 role。
DOM 证据：接口是 HTMLDivElement，没有原生按钮激活行为。
键盘证据：div 未进入自然 Tab 顺序，Space 没有按钮默认激活。
根因：索引只查了“button 角色”，没有选择原生 button 契约。
修复：改为 <button type="button" aria-pressed="false">收藏</button>。
复验：Tab 可达，Enter/Space 只触发一次 click；可见文字与 aria-pressed 同步。
边界：收藏仍只存在内存，刷新后消失；没有服务端授权或持久化。
未验证：Safari + VoiceOver 与 Firefox + NVDA。
```

## 9. 课后题

### 9.1 参考答案

1. `dl`/`dt`/`dd`，因为是单个对象的名称—值关系。
2. 导航使用 `a[href]`；原地收藏使用 `button type="button"`。
3. `picture` + 按格式排列的 `source[type][srcset]` + 最后的 `img[src][alt]`。
4. 任务完成度用 `progress`；已知范围测量用 `meter`。
5. 截至核验日期，它是 Living Standard 现行元素，但 MDN 标注 Limited availability。
6. 不是。`math` 是进入 MathML 命名空间的根，内部元素遵循 MathML Core。
7. `disabled` 是布尔属性，存在即真，字符串内容不是 JavaScript 布尔值。
8. 不会；脚本或应用逻辑必须计算并设置结果。
9. ARIA 改辅助技术语义，不自动补焦点、Space/Enter 激活、禁用、提交和状态同步。
10. 检查 `table.rows`、对应 `tbody.rows`、每行 `cells`、实时集合迭代、`th`/`scope` 或 `headers`/`id` 关系，以及删除后的焦点。

选择题答案依次为：`aside`、`nav`、`table`、modal `dialog`、`data`、`bdi`。答案成立的前提是题目给出的职责不变；布局位置或默认外观改变时，语义选择不随之改变。

## 10. 实践练习

### 10.1 基础：十项职责查询

从邻里集市页面中任选十项需求，每项填写第 3.3 节查询卡。至少覆盖：

- 一个文档元信息；
- 一个分节元素；
- 一个文本机器值；
- 一个链接或按钮；
- 一张图片；
- 一个表格关系；
- 三种不同 `input` 类型；
- 一个原生交互元素；
- 一个全局属性；
- 一个 ARIA 补充。

**答案标准：**

- 每项都有明确职责；
- 父元素和子内容有效；
- 属性属于该元素或对应全局/ARIA 规范；
- 写出接口或默认行为；
- 指向本课中的主教程；
- 有兼容性或实测结论，而不是“现代浏览器都支持”。

### 10.2 故障注入：让索引误用暴露

在第 6 节案例中依次注入：

1. 把 `button type="submit"` 改成无 `type` 的辅助按钮，并把它放进表单；
2. 把 `data[value="3900"]` 改成 `value="39.00"`，仍按整数分解析；
3. 把 `section` 放进 `p`；
4. 把预览写入改成 `output.innerHTML = note.value`；
5. 把 `aria-labelledby` 改成不存在的 ID；
6. 删除 `summary`，只保留 `details` 正文。

每个故障都提交：

```text
注入：
预期失败：
源代码证据：
DOM/API/Accessibility/Network 证据：
根因：
最小修复：
同一路径复验：
未验证环境：
```

**参考恢复：**

- 所有非提交按钮显式写 `type="button"`；
- 整数分机器值使用 `3900`，显示格式在边界转换；
- 让 `section` 成为 `p` 的兄弟节点；
- 用户文本使用 `textContent` 或文本节点；
- 恢复真实且唯一的标题 ID；
- 为 `details` 提供首个可操作 `summary`。

## 11. 阶段验收

### 11.1 索引覆盖

- [ ] 能解释七个索引字段；
- [ ] 能从职责定位九大元素组；
- [ ] 115 个固定现行入口名称都在覆盖账本；
- [ ] `search` 与 `selectedcontent` 被列为现行，并说明兼容边界；
- [ ] 过时和非标准名称没有混入现行账本；
- [ ] SVG/MathML 只把根入口列入 HTML 上下文，内部元素归所属规范；
- [ ] 自主自定义元素被视为开放类别，不是固定标签列表。

### 11.2 查阅能力

- [ ] 能在两分钟内为十个新需求找到候选元素和主教程；
- [ ] 每个选择都能排除至少一个外观相似但职责不同的候选；
- [ ] 遇到有限支持特性时先保留基线，再做特性检测和目标环境实测；
- [ ] 兼容结论记录浏览器、版本、设备和辅助技术，不只写“支持/不支持”；
- [ ] 无法验证的屏幕阅读器、Safari、Firefox 或 WebView 范围明确标记为未验证。

满足以上检查后，才算完成“可检索的现行索引”。背出标签名称但不能说明父子边界、默认行为或恢复路径，不通过本课验收。

## 12. 常见问题

### Q1：为什么不按字母排序？

字母排序适合已知元素名后的快速定位；开发时更常见的是只知道职责。本课按职责组织，并保留 5.10 节完整名称账本供全文搜索。

### Q2：只要验证器通过，元素就选对了吗？

不一定。验证器主要检查可机器判断的语法和内容模型，不知道你的业务内容究竟是导航、命令、修订还是测量，也不证明名称、替代文本和交互体验正确。

### Q3：默认样式能帮助选元素吗？

只能作为浏览器呈现线索，不能作为主要依据。CSS 可以把标题变小、链接变成按钮外观、表格去掉边框，但元素职责和默认行为不会因此互换。

### Q4：所有现行元素都可以直接用于生产吗？

不可以。规范现行性、浏览器实现、辅助技术映射和项目支持范围是不同维度。`selectedcontent` 就是现行但有限支持的例子。

### Q5：为什么 `embed` 还在现行表里？

现行索引仍定义该嵌入入口，但这不复活历史插件生态。新页面应先按内容选择图片、媒体、`iframe`、`object` 或普通链接，并保留可访问回退。

### Q14：为什么同一个元素在不同父元素中规则不同？

HTML 内容模型会根据上下文细化。例如 `source` 在 `picture` 与媒体元素中的属性职责不同，`button` 在普通短语内容与可定制 `select` 中的边界也不同。

### Q15：当前索引以后会过时吗？

会变化。HTML 是 Living Standard。本课记录核验日期、官方索引和有限支持项，后续应比较规范 diff、MDN BCD 与目标浏览器实测，不把日期当永久版本号。

## 13. 扩展阅读

以下资料已于 **2026-10-10** 对照本课核验。规范定义“应该是什么”，兼容数据和目标环境测试回答“当前在哪里可用”。

### 13.1 HTML、DOM 与元素索引

- [WHATWG HTML：现行元素与接口索引](https://html.spec.whatwg.org/multipage/indices.html#elements-3)：本课 115 个固定入口名称的主要依据；该索引只列 conforming elements and features。
- [WHATWG HTML：元素语义、内容模型与全局属性](https://html.spec.whatwg.org/multipage/dom.html)：核对内容类别、透明内容模型、全局属性和 DOM 映射。
- [WHATWG HTML：元素定义](https://html.spec.whatwg.org/multipage/dom.html#element-definitions)：核对允许上下文、内容模型、标签省略、属性与接口字段。
- [WHATWG DOM Standard](https://dom.spec.whatwg.org/)：核对 `Node`、`Element`、查询、树操作、属性与事件基础。
- [MDN：HTML elements reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements)：按职责查解释和兼容入口。
- [MDN：HTML global attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes)：查全局属性及其他标准扩展。

### 13.2 2026 Living Standard 新近项与不确定范围

以下项目“已进入现行规范”与“可作为跨浏览器基线”必须分别记录：

- `selectedcontent`、可定制 `select` 中的第一个 `button`、富 `option`/`optgroup` 内容：已出现在 2026-10-09 Living Standard；MDN 对 `selectedcontent` 仍标记 Limited availability，是本课最明确的不确定新增项。
- `headingoffset`、`headingreset`：已列入 2026-10-09 Living Standard 全局属性；目标浏览器与辅助技术支持不足时，继续使用清楚的显式标题层级。
- `button[commandfor][command]`、对话框关闭请求和持续演进的 popover 调用能力：按具体属性、方法和事件检测，不能只检测一个总开关。
- `input[type="color"]` 的 `alpha` 与 `colorspace`：规范已列出，不能从基础颜色选择器支持推断新色彩能力。
- `img[controls]` 与媒体元素的 `loading`：已出现在核验日期附近的现行索引；前者要求非空 `alt`、会让图片成为交互内容，具体控件由用户代理决定。它们都属于新近子能力，现有图片或媒体基础支持不能证明这些属性已实现。
- `search`：是现行元素；旧浏览器和旧辅助技术对地标映射可能不同，应记录实际支持矩阵。
- `hgroup`：现行内容模型会演进，旧文章可能描述已撤回或旧版规则；以核验日期的规范正文为准。

没有被 2026-10-09 conforming-elements 索引确认的提案，本课不把它列成现行元素。项目更新本索引时，应保存规范日期、元素索引差异、MDN BCD 结果和至少一个目标浏览器实测，而不是仅凭博客标题添加新标签。

## 我现在能做到什么

- 能解释并验证：从内容职责、内容类别和内容模型反查现行元素，并区分空内容模型与语法。
- `HIS-001`：现行元素按职责检索
- `HIS-004`：SVG、MathML 根入口与自定义元素
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[返回本章入口](../08-html-element-reference.md) · [下一课：属性、DOM API 与默认行为：连接标记和运行状态](02-attributes-dom-apis-default-behavior.md) · [返回 HTML 模块](../README.md)
