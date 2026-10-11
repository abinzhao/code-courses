# 稳定属性与模块索引：按值、行为和适用上下文检索

## 任务卡

邻里集市样式进入维护阶段后，开发者需要从问题反查模块，而不是背诵属性名。本课维护审计日
确认处于标准轨道且未标记实验或弃用的 452 项属性，提供值、最小声明和边界说明，再用观察台
验证“声明被接受”与“行为正确”不是同一结论。

- **建议时间：**8–10 小时，按模块分段查阅。
- **可见结果：**可从布局、文字、绘制、动画、交互、分页与 SVG 模块定位属性。
- **验收证据：**452 项顺序/唯一/hash 审计、完整观察台、无效值诊断和模块检索记录。

## 1. 任务背景

CSS 参考最容易出现两种失真：

1. 只列名字，不说明值、适用上下文和副作用；
2. 把新提案、描述符、函数、JavaScript API 和成熟属性混成一个数量。

本课口径来自 2026-10-11 的 MDN Browser Compatibility Data 8.1.5。它只收录
`standard_track: true`、`experimental: false`、`deprecated: false` 的属性，并排除 at-rule、
描述符、函数、选择器、伪元素和 JavaScript API。第二课负责语法分类，第三课负责稳定能力的
目标浏览器验证与渐进增强。

## 2. 学习目标

完成后你应能：

- 按 CSS 模块而不是字母顺序定位属性；
- 从值语法、适用元素、继承和简写重置推导行为；
- 区分指定值、计算值、使用值和实际值；
- 识别物理属性与逻辑属性的冲突；
- 识别简写会重置哪些未写长属性；
- 区分布局、绘制、合成和交互职责；
- 判断属性名被解析不等于目标组合可用；
- 为目标浏览器覆盖不同的稳定属性保留正常流或静态回退；
- 机械复核 452 项名称、顺序和唯一性；
- 把属性检索结果带回邻里集市的真实上下文验证。

## 3. 预备知识

先完成 CSS 前九章，尤其是[值阶段](../02-values-colors-units/01-value-stages-units-percentages.md)、[层叠](../01-syntax-cascade-selectors/02-cascade-layers-specificity.md)与[现代组件](../09-components-modern-css.md)。个人路径：

```text
market-learning/practice/css-10-properties/index.html
```

本课不是从零开始的语法课。遇到属性时先回到其主要教程，再把本索引用于查值和边界。

## 4. 核心理论

### 4.1 用五个问题检索

对任一属性依次问：

1. 它属于哪个模块，解决布局、绘制还是交互问题？
2. 它适用于什么元素或格式化上下文？
3. 它是否继承，百分比和相对单位参照什么？
4. 它是简写还是长属性，会重置什么？
5. 目标浏览器接受声明后，实际组合是否经过验证？

### 4.2 值阶段决定最终结果

源码声明先参与层叠，再经过指定值、计算值、使用值和实际值。百分比可能到布局阶段才有参照，字体与视口单位会在计算中转换，设备像素舍入又可能影响实际结果。

Styles 面板看到声明不代表它获胜；Computed 有值也不代表内容不溢出；`CSS.supports()` 返回 true 也不代表可访问性、组合语法和低端设备性能通过。

### 4.3 简写和逻辑映射

`background`、`font`、`grid`、`animation` 等简写会把未写部分重置为初始值。修改一个视觉片段前先查它是否覆盖已有长属性。

逻辑属性随 writing mode 与 direction 映射。同一物理边同时受 `margin-left` 与 `margin-inline-start` 控制时，仍按层叠比较，不会自动选择“更现代”的写法。

### 4.4 口径审计

以下审计区内，机械提取每个 Markdown 表格首列反引号名称，必须得到：

- 顺序项：452；
- 唯一项：452；
- SHA-256：`9c0bb7817c617cffc60788a71ed223ce7370439596926fbcc51854c478063deb`。

哈希输入按表格顺序把 452 个名称各写一行，并在最后一个名称后保留换行，即
`"\n".join(names) + "\n"` 的 UTF-8 字节。省略末尾换行会得到不同哈希，不能据此判断属性清单
变化。

修改解释文字时不得改变首列名称或顺序。每次更新先用当前 BCD 状态重新生成候选清单；任何
名称增删、改名或重排都要单独评审并同步覆盖矩阵，不能静默“顺手修正”。

## 5. 属性、值与模块索引

<!-- PROPERTY-AUDIT-START -->

### 5.1 层叠、显示与包含

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `all` | initial/inherit/unset/revert/revert-layer，批量重置多数属性 | `all: revert`；不重置自定义属性、direction、unicode-bidi |
| `display` | block/inline/inline-block/flex/grid/flow-root/none/contents 等，控制盒和内部布局 | `display: grid`；contents 的语义呈现需测试 |
| `visibility` | visible/hidden/collapse，控制可见性 | `visibility: hidden`；通常仍留布局空间，collapse 对不同布局有不同规则 |
| `opacity` | 0至1的数字或百分比，整个元素合成透明 | `opacity: .8`；后代也被淡化，0仍可能可交互 |
| `isolation` | auto/isolate，控制堆叠隔离 | `isolation: isolate`；组件内部 z-index 不跨越外部上下文 |
| `contain` | none/size/inline-size/layout/style/paint/strict/content 等，限制影响范围 | `contain: layout paint`；可能裁剪、建立包含块，size 需尺寸设计 |
| `content-visibility` | visible/auto/hidden，控制内容渲染跳过 | `content-visibility: auto`；不是安全隐藏，焦点与查找需测试 |
| `contain-intrinsic-size` | 一或两尺寸、auto 长度，为包含或跳过区域提供替代尺寸 | `contain-intrinsic-size: auto 20rem`；估值不准会影响滚动位置 |
| `contain-intrinsic-width` | none/长度/auto 长度，替代物理宽度 | `contain-intrinsic-width: 30rem`；不是普通 width |
| `contain-intrinsic-height` | none/长度/auto 长度，替代物理高度 | `contain-intrinsic-height: auto 20rem`；需配合包含机制 |
| `contain-intrinsic-inline-size` | 逻辑行内替代尺寸 | `contain-intrinsic-inline-size: 30rem`；随书写方向 |
| `contain-intrinsic-block-size` | 逻辑块替代尺寸 | `contain-intrinsic-block-size: auto 20rem`；需验证跳过状态 |
| `will-change` | auto/属性列表/scroll-position/contents，提示将有变化 | `will-change: transform`；不保证优化，避免全页永久设置 |

普通元素属性不会“关闭浏览器校验”；授权、会话与并发不属于本表。`content-visibility` 基础快照 C85/F125/S18，不能扩展为所有包含组合均无差异。

### 5.2 尺寸、盒模型与逻辑边

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `box-sizing` | content-box/border-box，指定尺寸包含哪些层 | `box-sizing: border-box`；margin 始终在外 |
| `width` | auto/长度/百分比/min-content/max-content/fit-content 等 | `width: min(100%, 40rem)`；百分比看包含块 |
| `height` | auto/长度/百分比/内在尺寸 | `height: auto`；百分比高度需确定参照条件 |
| `min-width` | auto/长度/百分比/内在尺寸，限制最小宽度 | `min-width: 0`；常用于可收缩 Flex/Grid 子项 |
| `min-height` | auto/长度/百分比/内在尺寸，限制最小高度 | `min-height: 0`；column 内滚动项常需它 |
| `max-width` | none/长度/百分比/内在尺寸，限制最大宽度 | `max-width: 100%`；图片仍需 height:auto |
| `max-height` | none/长度/百分比/内在尺寸，限制最大高度 | `max-height: 12rem`；配 overflow 保持可访问 |
| `inline-size` | 行内方向尺寸，接受对应尺寸值 | `inline-size: 30rem`；横排常对应 width |
| `block-size` | 块方向尺寸 | `block-size: auto`；竖排不等于 height |
| `min-inline-size` | 最小行内尺寸 | `min-inline-size: 0`；允许内容列收缩 |
| `min-block-size` | 最小块尺寸 | `min-block-size: 100svh`；长内容仍可增长 |
| `max-inline-size` | 最大行内尺寸 | `max-inline-size: 42rem`；限制阅读行宽 |
| `max-block-size` | 最大块尺寸 | `max-block-size: 12rem`；考虑键盘滚动 |
| `aspect-ratio` | auto/宽高比例，提供优先比例 | `aspect-ratio: 4 / 3`；不是无条件固定高度 |
| `margin` | 一至四长度/百分比/auto，设置外间距 | `margin: 1rem auto`；普通纵向块可能折叠 |
| `margin-top` | 长度/百分比/auto，物理上外间距 | `margin-top: 1rem`；可能与相邻块折叠 |
| `margin-right` | 长度/百分比/auto，物理右外间距 | `margin-right: .5rem`；不会随 RTL 自动镜像 |
| `margin-bottom` | 长度/百分比/auto，物理下外间距 | `margin-bottom: 1rem`；不是父级 padding |
| `margin-left` | 长度/百分比/auto，物理左外间距 | `margin-left: auto`；可吸收某些剩余空间 |
| `margin-inline` | 一或两值，行内起止外间距 | `margin-inline: auto`；常配限制宽度居中 |
| `margin-block` | 一或两值，块起止外间距 | `margin-block: 1rem 2rem`；逻辑不等于永远上下 |
| `margin-inline-start` | 行内起侧外间距 | `margin-inline-start: auto`；Flex 中可推开操作 |
| `margin-inline-end` | 行内末侧外间距 | `margin-inline-end: .5rem`；随方向 |
| `margin-block-start` | 块起侧外间距 | `margin-block-start: 1rem`；仍有折叠条件 |
| `margin-block-end` | 块末侧外间距 | `margin-block-end: 1.5rem`；保持结构间距 |
| `padding` | 一至四非负长度/百分比，内间距 | `padding: 1rem 1.5rem`；不接受负值或 auto |
| `padding-top` | 非负长度/百分比，上内间距 | `padding-top: 1rem`；百分比并非按自身高度 |
| `padding-right` | 非负长度/百分比，右内间距 | `padding-right: .75rem`；计入 border-box |
| `padding-bottom` | 非负长度/百分比，下内间距 | `padding-bottom: 1rem`；可为固定栏预留 |
| `padding-left` | 非负长度/百分比，左内间距 | `padding-left: .75rem`；不是缩进文字的语义 |
| `padding-inline` | 一或两非负值，行内内间距 | `padding-inline: 1rem`；方向友好 |
| `padding-block` | 一或两非负值，块内间距 | `padding-block: .5rem 1rem`；不会折叠 |
| `padding-inline-start` | 行内起侧内间距 | `padding-inline-start: 1rem`；适合导航入口 |
| `padding-inline-end` | 行内末侧内间距 | `padding-inline-end: 1rem`；不写死 right |
| `padding-block-start` | 块起侧内间距 | `padding-block-start: 3rem`；可预留角标 |
| `padding-block-end` | 块末侧内间距 | `padding-block-end: 1rem`；保留内容呼吸空间 |
| `box-decoration-break` | slice/clone，跨行或跨片段盒装饰处理 | `box-decoration-break: clone`；逐目标浏览器验证 |
| `margin-trim` | none/block，裁去容器块边缘部分外间距 | `margin-trim: block`；不代替基础 gap |

稳定尺寸关键词也要按消费属性和目标浏览器核对。逻辑属性与物理属性同时设置同一边时仍按层叠比较，不会自动择优。

### 5.3 定位、浮动与对象

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `position` | static/relative/absolute/fixed/sticky，定位机制 | `position: sticky`；还需 inset 与滚动空间 |
| `top` | auto/长度/百分比，物理上偏移 | `top: 0`；static 不按定位盒生效 |
| `right` | auto/长度/百分比，物理右偏移 | `right: 1rem`；absolute 参照包含块 |
| `bottom` | auto/长度/百分比，物理下偏移 | `bottom: 0`；固定栏可能遮内容 |
| `left` | auto/长度/百分比，物理左偏移 | `left: 50%`；不是自身一半 |
| `inset` | 一至四偏移值，简写物理四侧 | `inset: 0`；常使定位覆盖盒填满 |
| `inset-inline` | 一或两值，行内起止偏移 | `inset-inline: 1rem`；与宽度约束组合 |
| `inset-block` | 一或两值，块起止偏移 | `inset-block: 0`；别与普通 margin 混淆 |
| `inset-inline-start` | 行内起偏移 | `inset-inline-start: .5rem`；随 RTL |
| `inset-inline-end` | 行内末偏移 | `inset-inline-end: .5rem`；适合状态角标 |
| `inset-block-start` | 块起偏移 | `inset-block-start: 0`；sticky 阈值 |
| `inset-block-end` | 块末偏移 | `inset-block-end: 0`；方向相关 |
| `z-index` | auto/整数，堆叠排序 | `z-index: 2`；子上下文不能无限跨父 |
| `float` | none/left/right/inline-start/inline-end，浮动绕排 | `float: inline-start`；主布局优先 Flex/Grid |
| `clear` | none/left/right/both/逻辑边，避开相应浮动 | `clear: both`；不等于包含父级浮动 |
| `object-fit` | fill/contain/cover/none/scale-down，替换元素内容适配 | `object-fit: cover`；可能裁切照片 |
| `object-position` | 位置，控制替换内容对齐 | `object-position: center top`；需要可用盒尺寸 |
| `vertical-align` | baseline/middle/top/bottom/长度/百分比等 | `vertical-align: middle`；用于行内和表格单元，不是 Flex 居中 |
| `shape-outside` | none/基础形状/图像/盒，定义浮动绕排区域 | `shape-outside: circle(50%)`；需浮动，clip-path 不替代它 |
| `shape-margin` | 非负长度/百分比，绕排外扩 | `shape-margin: .75rem`；只对有效 shape 生效 |
| `shape-image-threshold` | 0至1，图像 alpha 阈值 | `shape-image-threshold: .5`；跨源图像需条件 |

float 仍适合插图旁正文绕排，不能因为 Grid 出现就说它已过时。绝对定位包含块也可能由 transform/contain 等建立，不只看 position。

### 5.4 Flex 与通用对齐

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `flex-direction` | row/row-reverse/column/column-reverse，主轴方向 | `flex-direction: column`；reverse 不改 DOM 顺序 |
| `flex-wrap` | nowrap/wrap/wrap-reverse，是否多行 | `flex-wrap: wrap`；长词仍可能撑宽 |
| `flex-flow` | direction 与 wrap 简写 | `flex-flow: row wrap`；省略项回默认 |
| `flex-grow` | 非负数字，正余量权重 | `flex-grow: 2`；不等于宽度占 2/3 |
| `flex-shrink` | 非负数字，负余量收缩权重 | `flex-shrink: 1`；还按基准尺寸加权 |
| `flex-basis` | auto/长度/百分比/内容尺寸，主轴基准 | `flex-basis: 12rem`；不保证最终尺寸 |
| `flex` | grow shrink basis 简写，或 auto/none/initial | `flex: 1 1 0`；常还需 min-inline-size:0 |
| `order` | 整数，视觉排序 | `order: 1`；不用于真实商品排序 |
| `justify-content` | start/end/center/space-between 等，分配整体行内或主轴余量 | `justify-content: space-between`；无余量则难见效果 |
| `align-content` | start/end/center/stretch/space-* 等，分配轨道或多行余量 | `align-content: start`；Flex 单行不同 |
| `justify-items` | stretch/start/end/center/baseline 等，项行内对齐 | `justify-items: start`；主要在 Grid，Flex 不按同样方式使用 |
| `align-items` | stretch/start/end/center/baseline 等，项交叉或块轴对齐 | `align-items: center`；不是固定垂直 |
| `justify-self` | auto/stretch/start/end/center 等，单项行内对齐 | `justify-self: end`；Flex 主轴通常无效 |
| `align-self` | auto/stretch/start/end/center/baseline 等 | `align-self: start`；覆盖容器对齐 |
| `place-content` | align-content/justify-content 简写 | `place-content: center`；整组轨道 |
| `place-items` | align-items/justify-items 简写 | `place-items: center`；Grid 常用于局部居中 |
| `place-self` | align-self/justify-self 简写 | `place-self: start end`；单项两个方向 |
| `gap` | 一或两非负长度/百分比，行列间距 | `gap: 1rem .75rem`；不为两端加 padding |
| `row-gap` | 非负长度/百分比/normal，行间距 | `row-gap: 1rem`；normal 随模块不同 |
| `column-gap` | 非负长度/百分比/normal，列间距 | `column-gap: 1rem`；Multi-column 的 normal 不等于零 |

基线、safe/unsafe 和 last baseline 等具体值支持需按场景验证。通用对齐名相同，并不代表所有布局模式接受和呈现完全一样。

### 5.5 Grid 轨道与放置

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `grid-template-columns` | 轨道列表/none/subgrid，显式列 | `grid-template-columns: repeat(2, minmax(0, 1fr))` |
| `grid-template-rows` | 轨道列表/none/subgrid，显式行 | `grid-template-rows: auto 1fr auto`；subgrid 需跨父行 |
| `grid-template-areas` | none/字符串区域图 | `grid-template-areas: "head head" "side body"`；区域必须矩形 |
| `grid-template` | rows/columns/areas 的简写 | `grid-template: auto 1fr / 12rem 1fr`；理解斜线两侧 |
| `grid-auto-columns` | 隐式列轨道尺寸 | `grid-auto-columns: 10rem`；越界放置会生成列 |
| `grid-auto-rows` | 隐式行轨道尺寸 | `grid-auto-rows: minmax(8rem, auto)`；允许长内容 |
| `grid-auto-flow` | row/column，可附 dense | `grid-auto-flow: row`；dense 可能视觉倒序 |
| `grid` | 显式与隐式网格简写 | `grid: auto-flow / 1fr 1fr`；可能重置未写的轨道属性 |
| `grid-column-start` | auto/线号/线名/span | `grid-column-start: 2`；2是线不是第二格宽 |
| `grid-column-end` | auto/线号/线名/span | `grid-column-end: span 2`；跨两轨道 |
| `grid-row-start` | auto/线号/线名/span | `grid-row-start: 1`；过远线生成隐式行 |
| `grid-row-end` | auto/线号/线名/span | `grid-row-end: 4`；从1到4跨三行 |
| `grid-column` | start/end 简写 | `grid-column: 1 / -1`；-1针对显式网格末线 |
| `grid-row` | start/end 简写 | `grid-row: span 3`；Subgrid 卡片可共享三行 |
| `grid-area` | 区域名或四线值 | `grid-area: body`；命名不提供 HTML 语义 |

Subgrid 为稳定增强；未通过状态门禁的候选轨道语法不进入索引。Grid gap 与百分比轨道相加
溢出时，优先改 fr 而非裁切整个页面。

### 5.6 字体与文字

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `font-family` | 字体名列表和通用族 | `font-family: system-ui, sans-serif`；逐字回退 |
| `font-size` | 长度/百分比/字号关键词 | `font-size: 1rem`；保留缩放能力 |
| `font-weight` | normal/bold/数值等，字重请求 | `font-weight: 700`；真实字体可能合成 |
| `font-style` | normal/italic/oblique 可附角度 | `font-style: italic`；不等于强调语义 |
| `font-stretch` | 百分比/字宽关键词 | `font-stretch: condensed`；字体需对应支持 |
| `font-width` | 新字宽命名方向，百分比/关键词 | `font-width: 90%`；与 font-stretch 演进关系和支持独立检查 |
| `font` | 多个字体设置简写 | `font: 1rem/1.7 sans-serif`；省略的变体等可能重置 |
| `line-height` | normal/数字/长度/百分比 | `line-height: 1.7`；无单位继承更适合不同字号 |
| `font-size-adjust` | none/数字等，按字体度量调整 | `font-size-adjust: .5`；扩展语法独立核对 |
| `font-kerning` | auto/normal/none，字偶距 | `font-kerning: normal`；字体必须含相关数据 |
| `font-optical-sizing` | auto/none，可变字体光学尺寸 | `font-optical-sizing: auto`；需 opsz 轴 |
| `font-feature-settings` | normal/特性标签列表 | `font-feature-settings: "liga" 0`；优先高层 variant |
| `font-variation-settings` | normal/轴标签与数值 | `font-variation-settings: "wght" 650`；轴范围看字体 |
| `font-language-override` | normal/语言标签 | `font-language-override: normal`；罕见，优先 HTML lang |
| `font-palette` | normal/light/dark/自定义标识 | `font-palette: dark`；需彩色字体与支持 |
| `font-variant` | 多类字体变体简写 | `font-variant: small-caps`；不改变 DOM 文本 |
| `font-variant-caps` | normal/small-caps/all-small-caps 等 | `font-variant-caps: small-caps`；字体缺失可能合成 |
| `font-variant-numeric` | tabular-nums/lining-nums 等组合 | `font-variant-numeric: tabular-nums`；价格对齐 |
| `font-variant-ligatures` | normal/none/common-ligatures 等 | `font-variant-ligatures: none`；可读性按实际字体 |
| `font-variant-east-asian` | jis*/simplified/traditional/ruby 等 | `font-variant-east-asian: proportional-width`；不翻译简繁 |
| `font-variant-position` | normal/sub/super，字形位置 | `font-variant-position: super`；不替代 sub/sup 语义 |
| `font-variant-alternates` | normal/字体替代函数 | `font-variant-alternates: historical-forms`；罕见，字体和浏览器需测试 |
| `font-variant-emoji` | normal/text/emoji/unicode，emoji 呈现偏好 | `font-variant-emoji: text`；较新且支持不一致 |
| `font-synthesis` | none/weight/style/small-caps 等 | `font-synthesis: none`；可能使缺字体效果不同 |
| `font-synthesis-weight` | auto/none，合成粗体开关 | `font-synthesis-weight: none`；独立支持检查 |
| `font-synthesis-style` | auto/none，合成斜体开关 | `font-synthesis-style: none`；真实斜体仍可用 |
| `font-synthesis-small-caps` | auto/none，合成小型大写 | `font-synthesis-small-caps: none`；罕见，独立支持 |
| `color` | 颜色，文字前景与 currentColor 来源 | `color: #233d2e`；需要实际对比 |
| `letter-spacing` | normal/长度，字距 | `letter-spacing: .02em`；过度负值会重叠 |
| `word-spacing` | normal/长度等，词间距 | `word-spacing: .1em`；中文不总有空格词 |
| `text-align` | start/end/left/right/center/justify 等 | `text-align: start`；不让块自身居中 |
| `text-align-last` | auto/start/end/center/justify 等，末行对齐 | `text-align-last: start`；避免末行强制拉伸 |
| `text-indent` | 长度/百分比，可有扩展标记 | `text-indent: 2em`；不插入真实空格 |
| `text-transform` | none/uppercase/lowercase/capitalize 等 | `text-transform: uppercase`；不改变实际值 |
| `white-space` | normal/nowrap/pre/pre-wrap/pre-line/break-spaces 等 | `white-space: pre-wrap`；保留输入换行 |
| `white-space-collapse` | collapse/preserve/preserve-breaks/break-spaces 等 | `white-space-collapse: preserve`；新长属性需检查 |
| `text-wrap` | wrap/nowrap 与 style 的简写演进 | `text-wrap: balance`；值支持不能一概而论 |
| `text-wrap-mode` | wrap/nowrap，软换行开关 | `text-wrap-mode: wrap`；新长属性 |
| `text-wrap-style` | auto/balance/pretty/stable 等 | `text-wrap-style: balance`；pretty 非本书共同基线 |
| `overflow-wrap` | normal/break-word/anywhere，长词断行 | `overflow-wrap: anywhere`；影响内在最小尺寸 |
| `word-break` | normal/break-all/keep-all 等 | `word-break: normal`；避免全页 break-all |
| `line-break` | auto/loose/normal/strict/anywhere，东亚断行规则 | `line-break: strict`；语言与字体仍需测试 |
| `hyphens` | none/manual/auto，断词 | `hyphens: auto`；依赖 lang 与词典 |
| `hyphenate-character` | auto/字符串，断词字符 | `hyphenate-character: "-"`；较少使用，独立核对 |
| `hyphenate-limit-chars` | auto/整数列表，断词长度限制 | `hyphenate-limit-chars: 6 3 2`；支持差异，必须回退 |
| `tab-size` | 非负数字/长度，制表宽度 | `tab-size: 2`；主要配合保留空白 |
| `text-overflow` | clip/ellipsis，可有扩展值 | `text-overflow: ellipsis`；还需受限盒与溢出处理 |
| `text-shadow` | none/阴影列表，文字投影 | `text-shadow: 0 1px 2px #ccc`；不能救低对比正文 |
| `text-decoration` | line/style/color/thickness 简写 | `text-decoration: underline solid #164a82`；保留链接线索 |
| `text-decoration-line` | none/underline/overline/line-through 等 | `text-decoration-line: line-through`；仅视觉，删除语义用 del |
| `text-decoration-style` | solid/double/dotted/dashed/wavy | `text-decoration-style: wavy`；错误还需文字 |
| `text-decoration-color` | 颜色 | `text-decoration-color: currentColor`；跟随文字 |
| `text-decoration-thickness` | auto/from-font/长度/百分比 | `text-decoration-thickness: .08em`；检查字号变化 |
| `text-decoration-skip-ink` | auto/none/all 等 | `text-decoration-skip-ink: auto`；具体扩展值独立检查 |
| `text-underline-offset` | auto/长度/百分比 | `text-underline-offset: .2em`；不要远离链接造成混淆 |
| `text-underline-position` | auto/from-font/under/left/right 等 | `text-underline-position: under`；竖排方向需测试 |
| `text-emphasis` | style/color 简写，东亚着重号 | `text-emphasis: filled dot #263d30`；不是 strong 替代 |
| `text-emphasis-style` | none/filled/open/形状/字符串 | `text-emphasis-style: filled sesame`；阅读效果需测试 |
| `text-emphasis-color` | 颜色 | `text-emphasis-color: currentColor`；保持可读 |
| `text-emphasis-position` | over/under 与 right/left 组合 | `text-emphasis-position: over right`；随书写方向 |
| `text-combine-upright` | none/all 等，竖排合字 | `text-combine-upright: all`；用于短数字而非整段 |
| `text-rendering` | auto/optimizeSpeed/optimizeLegibility/geometricPrecision | `text-rendering: auto`；实现提示，不保证速度或字形一致 |
| `writing-mode` | horizontal-tb/vertical-rl/vertical-lr 等 | `writing-mode: vertical-rl`；重新检查逻辑尺寸 |
| `direction` | ltr/rtl，方向 | `direction: rtl`；文档语义优先 HTML dir |
| `unicode-bidi` | normal/isolate/embed/bidi-override 等 | `unicode-bidi: isolate`；用户文字优先 bdi，勿乱覆盖顺序 |
| `ruby-align` | start/center/space-between/space-around | `ruby-align: center`；需 ruby 结构 |
| `ruby-position` | over/under/inter-character 等 | `ruby-position: over`；具体值跨浏览器差异 |

`line-clamp`、`text-box`、`initial-letter` 等专门机制见稳定增强表。字体文件的 `src`、
`font-display` 等位于 `@font-face` 内，是描述符而非普通元素属性。

### 5.7 背景、边框与轮廓

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `background` | 颜色、图层位置尺寸等简写 | `background: #eef5ef`；会重置此前图层 |
| `background-color` | 颜色，最底背景 | `background-color: #fff`；背景透明不淡化文字 |
| `background-image` | none/图像列表 | `background-image: linear-gradient(#fff, #e6efe8)`；信息图片用 img |
| `background-position` | 一组或多组位置 | `background-position: center top`；百分比基于图片与盒差 |
| `background-position-x` | 横向位置列表 | `background-position-x: 50%`；物理横轴 |
| `background-position-y` | 纵向位置列表 | `background-position-y: 0`；不要与多层顺序混淆 |
| `background-size` | auto/长度百分比/cover/contain | `background-size: cover`；可能裁切 |
| `background-repeat` | repeat/no-repeat/space/round 等 | `background-repeat: no-repeat`；多层用逗号 |
| `background-attachment` | scroll/fixed/local | `background-attachment: scroll`；fixed 移动端差异 |
| `background-origin` | border-box/padding-box/content-box | `background-origin: content-box`；定位区域 |
| `background-clip` | border-box/padding-box/content-box/text 等 | `background-clip: padding-box`；text 需颜色回退 |
| `background-blend-mode` | normal/multiply/screen/overlay 等 | `background-blend-mode: multiply`；图层与底色混合 |
| `mix-blend-mode` | normal/multiply/screen 等 | `mix-blend-mode: normal`；跨背景效果影响可读性 |
| `border` | 宽度/样式/颜色简写 | `border: 1px solid #567761`；不接受任意排序的多个边组 |
| `border-width` | 一至四长度/thin/medium/thick | `border-width: 1px 2px`；样式 none 时不可见 |
| `border-style` | 一至四 none/solid/dashed/dotted/double 等 | `border-style: solid`；决定是否实际绘边 |
| `border-color` | 一至四颜色 | `border-color: currentColor`；不同边按展开规则 |
| `border-top` | 上边宽样式颜色 | `border-top: 2px solid #567761`；物理边 |
| `border-right` | 右边宽样式颜色 | `border-right: 1px dashed #567761`；不自动镜像 |
| `border-bottom` | 下边宽样式颜色 | `border-bottom: 1px solid currentColor`；不是语义 hr |
| `border-left` | 左边宽样式颜色 | `border-left: 3px solid #175ca2`；错误还要文字 |
| `border-top-width` | 长度/粗细关键词 | `border-top-width: 2px`；需非 none 样式 |
| `border-right-width` | 长度/粗细关键词 | `border-right-width: 1px`；参与盒尺寸 |
| `border-bottom-width` | 长度/粗细关键词 | `border-bottom-width: 2px`；不含 margin |
| `border-left-width` | 长度/粗细关键词 | `border-left-width: 3px`；逻辑边另设 |
| `border-top-style` | 边框样式 | `border-top-style: solid`；none 不绘制 |
| `border-right-style` | 边框样式 | `border-right-style: dashed`；渲染细节有差异 |
| `border-bottom-style` | 边框样式 | `border-bottom-style: double`；需足够宽 |
| `border-left-style` | 边框样式 | `border-left-style: solid`；不要作唯一状态 |
| `border-top-color` | 颜色 | `border-top-color: #567761`；不自行创建边框 |
| `border-right-color` | 颜色 | `border-right-color: currentColor`；跟随前景 |
| `border-bottom-color` | 颜色 | `border-bottom-color: #567761`；对比需检查 |
| `border-left-color` | 颜色 | `border-left-color: #175ca2`；状态还需语义 |
| `border-inline` | 行内两边宽样式颜色 | `border-inline: 1px solid #567761`；逻辑 |
| `border-block` | 块两边宽样式颜色 | `border-block: 1px solid #567761`；逻辑 |
| `border-inline-start` | 行内起边简写 | `border-inline-start: 3px solid #175ca2` |
| `border-inline-end` | 行内末边简写 | `border-inline-end: 1px solid #567761` |
| `border-block-start` | 块起边简写 | `border-block-start: 2px solid #567761` |
| `border-block-end` | 块末边简写 | `border-block-end: 1px solid #567761` |
| `border-inline-width` | 一或两宽度 | `border-inline-width: 1px 2px`；起末展开 |
| `border-block-width` | 一或两宽度 | `border-block-width: 1px 2px` |
| `border-inline-style` | 一或两样式 | `border-inline-style: solid dashed` |
| `border-block-style` | 一或两样式 | `border-block-style: solid` |
| `border-inline-color` | 一或两颜色 | `border-inline-color: #567761 #175ca2` |
| `border-block-color` | 一或两颜色 | `border-block-color: currentColor` |
| `border-inline-start-width` | 起边宽度 | `border-inline-start-width: 2px` |
| `border-inline-end-width` | 末边宽度 | `border-inline-end-width: 1px` |
| `border-block-start-width` | 块起宽度 | `border-block-start-width: 2px` |
| `border-block-end-width` | 块末宽度 | `border-block-end-width: 1px` |
| `border-inline-start-style` | 起边样式 | `border-inline-start-style: solid` |
| `border-inline-end-style` | 末边样式 | `border-inline-end-style: dashed` |
| `border-block-start-style` | 块起样式 | `border-block-start-style: solid` |
| `border-block-end-style` | 块末样式 | `border-block-end-style: solid` |
| `border-inline-start-color` | 起边颜色 | `border-inline-start-color: #175ca2` |
| `border-inline-end-color` | 末边颜色 | `border-inline-end-color: currentColor` |
| `border-block-start-color` | 块起颜色 | `border-block-start-color: #567761` |
| `border-block-end-color` | 块末颜色 | `border-block-end-color: #567761` |
| `border-radius` | 一至四半径，可用斜线分椭圆两轴 | `border-radius: .75rem`；大值按规则缩小 |
| `border-top-left-radius` | 一或两半径 | `border-top-left-radius: 1rem .5rem` |
| `border-top-right-radius` | 一或两半径 | `border-top-right-radius: .5rem` |
| `border-bottom-left-radius` | 一或两半径 | `border-bottom-left-radius: .5rem` |
| `border-bottom-right-radius` | 一或两半径 | `border-bottom-right-radius: .5rem` |
| `border-start-start-radius` | 块起、行内起角半径 | `border-start-start-radius: .75rem`；随方向映射 |
| `border-start-end-radius` | 块起、行内末角半径 | `border-start-end-radius: .75rem` |
| `border-end-start-radius` | 块末、行内起角半径 | `border-end-start-radius: .75rem` |
| `border-end-end-radius` | 块末、行内末角半径 | `border-end-end-radius: .75rem` |
| `border-image` | source/slice/width/outset/repeat 简写 | `border-image: linear-gradient(#326747, #9ec4aa) 1`；有普通边框回退 |
| `border-image-source` | none/图像 | `border-image-source: linear-gradient(#326747, #9ec4aa)` |
| `border-image-slice` | 数字/百分比，可含 fill | `border-image-slice: 20`；不是20px |
| `border-image-width` | 数字/长度/百分比/auto | `border-image-width: 2`；数值乘边框宽 |
| `border-image-outset` | 数字/长度 | `border-image-outset: 1`；可画到边界外 |
| `border-image-repeat` | stretch/repeat/round/space | `border-image-repeat: round`；需真实图案检查 |
| `outline` | width/style/color 简写 | `outline: 3px solid #175ca2`；不占普通布局尺寸 |
| `outline-width` | 长度/粗细关键词 | `outline-width: 3px`；避免细到不可辨 |
| `outline-style` | auto/none/solid 等 | `outline-style: solid`；不无条件删焦点 |
| `outline-color` | 颜色/auto 等演进值 | `outline-color: #175ca2`；新值独立检查 |
| `outline-offset` | 长度 | `outline-offset: 3px`；可能被祖先裁剪 |
| `box-shadow` | none/多层偏移模糊扩展阴影 | `box-shadow: 0 .3rem 1rem rgb(0 0 0 / 12%)`；大模糊有绘制成本 |

### 5.8 滤镜、遮罩和裁剪

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `filter` | none/滤镜函数/url，处理元素内容 | `filter: grayscale(1) contrast(1.1)`；顺序影响结果 |
| `backdrop-filter` | none/滤镜列表，处理背后内容 | `backdrop-filter: blur(6px)`；保留实色回退 |
| `clip-path` | none/基础形状/url/盒 | `clip-path: circle(45%)`；裁剪不重排正文 |
| `mask` | 多个遮罩属性简写 | `mask: linear-gradient(#000, transparent)`；会重置子属性 |
| `mask-image` | none/图像列表 | `mask-image: linear-gradient(#000, transparent)`；不要遮必要文字 |
| `mask-mode` | match-source/alpha/luminance | `mask-mode: alpha`；决定 alpha 或亮度解释 |
| `mask-position` | 位置列表 | `mask-position: center`；与尺寸协作 |
| `mask-size` | auto/长度百分比/cover/contain | `mask-size: cover`；遮罩可能被裁切 |
| `mask-repeat` | repeat/no-repeat/space/round 等 | `mask-repeat: no-repeat`；多层对应 |
| `mask-origin` | border-box/padding-box/content-box 等 | `mask-origin: border-box`；SVG 盒值另验 |
| `mask-clip` | 盒/no-clip 等 | `mask-clip: border-box`；绘制范围 |
| `mask-composite` | add/subtract/intersect/exclude | `mask-composite: intersect`；多层顺序需逐目标验证 |
| `mask-type` | luminance/alpha，SVG mask 解释 | `mask-type: alpha`；针对 SVG mask，不替代所有 mask-mode |
| `mask-border` | 遮罩边框简写 | `mask-border: none`；罕见且支持不足，不作为必要边框 |
| `mask-border-source` | none/图像 | `mask-border-source: linear-gradient(#000, #777)`；有限支持 |
| `mask-border-slice` | 数字/百分比，可含 fill | `mask-border-slice: 20`；有限支持 |
| `mask-border-width` | 数字/长度百分比/auto | `mask-border-width: 2`；有限支持 |
| `mask-border-outset` | 数字/长度 | `mask-border-outset: 1`；有限支持 |
| `mask-border-repeat` | stretch/repeat/round/space | `mask-border-repeat: round`；有限支持 |
遮罩边框的例值用于理解当前标准模型，不意味着所有目标浏览器和组合已经通过。必要内容仍使用
普通边框或文本呈现，遮罩只承担增强。

### 5.9 动画与变换

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `transform` | none/变换函数列表 | `transform: translateY(-2px) scale(1.02)`；不释放流占位 |
| `transform-origin` | 位置及可选 z 长度 | `transform-origin: left center`；决定旋转中心 |
| `transform-box` | content-box/border-box/fill-box/stroke-box/view-box | `transform-box: border-box`；SVG 参照不同 |
| `transform-style` | flat/preserve-3d | `transform-style: preserve-3d`；分组属性可强制扁平 |
| `translate` | none/一至三长度百分比 | `translate: 0 -2px`；独立变换有固定组合顺序 |
| `rotate` | none/角度/轴与角度 | `rotate: 15deg`；三维轴值另验 |
| `scale` | none/一至三数字等 | `scale: 1.05`；不要让文字长期放大模糊 |
| `perspective` | none/正长度 | `perspective: 600px`；作用于后代三维空间 |
| `perspective-origin` | 位置 | `perspective-origin: center`；观察中心 |
| `backface-visibility` | visible/hidden | `backface-visibility: hidden`；仍需不可见面焦点管理 |
| `transition` | 属性、时长、缓动、延迟、行为简写 | `transition: opacity 160ms ease`；不自动改变状态 |
| `transition-property` | none/all/属性列表 | `transition-property: opacity, transform`；避免无界 all |
| `transition-duration` | 非负时间列表 | `transition-duration: 160ms`；0时不依赖end事件 |
| `transition-timing-function` | ease/linear/steps/cubic-bezier 等 | `transition-timing-function: ease-out`；新 linear() 另验 |
| `transition-delay` | 时间列表，可负 | `transition-delay: 0s`；负值进入过程后段 |
| `transition-behavior` | normal/allow-discrete | `transition-behavior: allow-discrete`；离散组合需实测 |
| `animation` | 多个动画控制简写 | `animation: pulse 220ms ease-out 1`；新时间线值可能被重置 |
| `animation-name` | none/关键帧名列表 | `animation-name: pulse`；需对应 keyframes |
| `animation-duration` | 非负时间/auto 等 | `animation-duration: 220ms`；auto 的滚动语义需支持 |
| `animation-timing-function` | 缓动列表 | `animation-timing-function: linear`；关键帧区间作用 |
| `animation-delay` | 时间列表，可负 | `animation-delay: -100ms`；不是过去发生业务 |
| `animation-iteration-count` | 非负数字/infinite | `animation-iteration-count: 1`；无限动作需暂停 |
| `animation-direction` | normal/reverse/alternate/alternate-reverse | `animation-direction: alternate`；不倒排 DOM |
| `animation-fill-mode` | none/forwards/backwards/both | `animation-fill-mode: none`；forwards 不写业务状态 |
| `animation-play-state` | running/paused | `animation-play-state: paused`；暂停不等于取消 |
| `animation-composition` | replace/add/accumulate | `animation-composition: replace`；具体组合和支持需验 |
| `animation-timeline` | auto/none/命名/scroll()/view() | `animation-timeline: scroll()`；有限支持，放简写后 |
| `animation-range` | start/end 范围简写 | `animation-range: entry 0% cover 50%`；有限支持 |
| `animation-range-start` | normal/范围名与偏移 | `animation-range-start: entry 0%`；需视图时间线 |
| `animation-range-end` | normal/范围名与偏移 | `animation-range-end: cover 50%`；有限支持 |
| `scroll-timeline` | 名称/轴简写 | `scroll-timeline: --catalog block`；有限支持 |
| `scroll-timeline-name` | none/虚线标识列表 | `scroll-timeline-name: --catalog`；命名作用域需明确 |
| `scroll-timeline-axis` | block/inline/x/y | `scroll-timeline-axis: block`；方向不是永远 y |
| `view-timeline` | 名称/轴简写 | `view-timeline: --card block`；有限支持 |
| `view-timeline-name` | none/虚线标识列表 | `view-timeline-name: --card`；需主体元素 |
| `view-timeline-axis` | block/inline/x/y | `view-timeline-axis: block` |
| `view-timeline-inset` | auto/一或两长度百分比 | `view-timeline-inset: 10% 10%`；缩进可视范围 |
| `timeline-scope` | none/名称列表/all 等 | `timeline-scope: --card`；新扩展，独立支持 |
| `offset` | 路径运动属性简写 | `offset: path("M0,0 L100,0") 0%`；路径运动需减少动作 |
| `offset-path` | none/path()/ray()/基础形状/url 等 | `offset-path: path("M0,0 L100,0")`；具体函数支持不同 |
| `offset-distance` | 长度/百分比，沿路径进度 | `offset-distance: 50%`；不是布局 margin |
| `offset-rotate` | auto/reverse/角度组合 | `offset-rotate: auto`；沿路径方向旋转 |
| `offset-anchor` | auto/位置，路径锚点 | `offset-anchor: center`；参照盒需验 |
| `offset-position` | normal/auto/位置 | `offset-position: center`；较新值与实现差异 |
| `view-transition-name` | none/自定义名/match-element 等演进值 | `view-transition-name: listing-title`；名字需唯一，其他值另验 |
| `view-transition-class` | none/类名列表 | `view-transition-class: listing`；新扩展，非基础转场同等支持 |

WAAPI 的 animate/pause/cancel 是 JavaScript 方法，不在 CSS 属性数量中。滚动 timeline/range 在固定快照中 Firefox 仍为 preview，保留普通阅读和无动画路径。

### 5.10 滚动、溢出和交互

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `overflow` | visible/hidden/clip/auto/scroll，一或两轴 | `overflow: auto`；hidden 与 clip 滚动机制不同 |
| `overflow-x` | 对物理横轴控制 | `overflow-x: auto`；表格可局部滚动 |
| `overflow-y` | 对物理纵轴控制 | `overflow-y: auto`；组合值会影响计算 |
| `overflow-clip-margin` | 盒与非负长度等，扩展 clip 边缘 | `overflow-clip-margin: 4px`；不等于 padding，独立支持 |
| `overflow-anchor` | auto/none，滚动锚定 | `overflow-anchor: none`；不要全页关闭自然位置保持 |
| `overscroll-behavior` | auto/contain/none，一或两轴 | `overscroll-behavior: contain`；限制滚动链 |
| `overscroll-behavior-x` | 横轴回弹/链行为 | `overscroll-behavior-x: contain` |
| `overscroll-behavior-y` | 纵轴回弹/链行为 | `overscroll-behavior-y: contain` |
| `overscroll-behavior-inline` | 行内轴行为 | `overscroll-behavior-inline: contain` |
| `overscroll-behavior-block` | 块轴行为 | `overscroll-behavior-block: contain` |
| `scroll-behavior` | auto/smooth，部分导航滚动行为 | `scroll-behavior: auto`；减少动作用auto |
| `scrollbar-gutter` | auto/stable，可含 both-edges | `scrollbar-gutter: stable`；覆盖滚动条未必占空间 |
| `scrollbar-width` | auto/thin/none | `scrollbar-width: auto`；none需替代提示 |
| `scrollbar-color` | auto/滑块与轨道颜色 | `scrollbar-color: #567761 #edf3ee`；强制颜色可能覆盖 |
| `scroll-snap-type` | none/轴与 proximity或mandatory | `scroll-snap-type: x proximity`；别困住长内容 |
| `scroll-snap-align` | none/start/end/center，一或两轴 | `scroll-snap-align: start`；目标项设置 |
| `scroll-snap-stop` | normal/always | `scroll-snap-stop: normal`；操作体验需真实测试 |
| `scroll-margin` | 一至四长度，目标滚动外扩 | `scroll-margin: 1rem`；不改变普通布局 margin |
| `scroll-margin-top` | 上侧长度 | `scroll-margin-top: 4rem`；避免 sticky 遮目标 |
| `scroll-margin-right` | 右侧长度 | `scroll-margin-right: 1rem` |
| `scroll-margin-bottom` | 下侧长度 | `scroll-margin-bottom: 1rem` |
| `scroll-margin-left` | 左侧长度 | `scroll-margin-left: 1rem` |
| `scroll-margin-inline` | 行内一或两长度 | `scroll-margin-inline: 1rem` |
| `scroll-margin-block` | 块一或两长度 | `scroll-margin-block: 4rem 1rem` |
| `scroll-margin-inline-start` | 行内起长度 | `scroll-margin-inline-start: 1rem` |
| `scroll-margin-inline-end` | 行内末长度 | `scroll-margin-inline-end: 1rem` |
| `scroll-margin-block-start` | 块起长度 | `scroll-margin-block-start: 4rem` |
| `scroll-margin-block-end` | 块末长度 | `scroll-margin-block-end: 1rem` |
| `scroll-padding` | 一至四长度百分比/auto，滚动可视区内缩 | `scroll-padding: 1rem`；容器设置 |
| `scroll-padding-top` | 上侧长度百分比/auto | `scroll-padding-top: 4rem` |
| `scroll-padding-right` | 右侧长度百分比/auto | `scroll-padding-right: 1rem` |
| `scroll-padding-bottom` | 下侧长度百分比/auto | `scroll-padding-bottom: 1rem` |
| `scroll-padding-left` | 左侧长度百分比/auto | `scroll-padding-left: 1rem` |
| `scroll-padding-inline` | 行内一或两值 | `scroll-padding-inline: 1rem` |
| `scroll-padding-block` | 块一或两值 | `scroll-padding-block: 4rem 1rem` |
| `scroll-padding-inline-start` | 行内起值 | `scroll-padding-inline-start: 1rem` |
| `scroll-padding-inline-end` | 行内末值 | `scroll-padding-inline-end: 1rem` |
| `scroll-padding-block-start` | 块起值 | `scroll-padding-block-start: 4rem` |
| `scroll-padding-block-end` | 块末值 | `scroll-padding-block-end: 1rem` |
| `cursor` | auto/pointer/text/not-allowed 等，可有 url 回退 | `cursor: pointer`；不提供按钮语义 |
| `pointer-events` | auto/none，以及 SVG 专用值 | `pointer-events: none`；不能可靠禁用键盘或授权 |
| `touch-action` | auto/none/pan-x/pan-y/manipulation 等 | `touch-action: pan-y`；不要全页 none 阻止缩放 |
| `user-select` | auto/text/none/all | `user-select: text`；避免禁止复制商品说明 |
| `resize` | none/both/horizontal/vertical 等 | `resize: vertical`；需相关 overflow 条件 |
| `appearance` | auto/none/原生控件特定值 | `appearance: auto`；none需补齐状态与焦点 |
| `accent-color` | auto/颜色，原生控件强调色 | `accent-color: #326747`；不统一所有控件外观 |
| `caret-color` | auto/颜色，输入光标 | `caret-color: #175ca2`；保证对比 |
| `color-scheme` | normal/light/dark/only 等 | `color-scheme: light dark`；不自动设计正文主题 |
| `forced-color-adjust` | auto/none | `forced-color-adjust: auto`；不要全页强制 none |
| `print-color-adjust` | economy/exact | `print-color-adjust: economy`；打印设置仍可覆盖 |
| `image-rendering` | auto/crisp-edges/pixelated 等 | `image-rendering: auto`；像素图才考虑 pixelated |

CSS pointer-events 不替代 disabled，更不能阻止绕过页面直接发送请求。`field-sizing` 等稳定增强
在后面的目标浏览器表单独说明。

### 5.11 表格、多列、列表与生成内容

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `table-layout` | auto/fixed，表格列布局算法 | `table-layout: fixed`；通常需表格确定宽度并处理长内容 |
| `border-collapse` | separate/collapse，表格边框合并 | `border-collapse: collapse`；仅表格相关 |
| `border-spacing` | 一或两非负长度，分离边框间距 | `border-spacing: .5rem`；collapse下无同样效果 |
| `caption-side` | top/bottom 等 | `caption-side: top`；标题仍在HTML caption |
| `empty-cells` | show/hide，空单元边框背景 | `empty-cells: show`；主要分离边框模型 |
| `columns` | column-width/count 简写 | `columns: 16rem 2`；多列阅读顺序沿列 |
| `column-width` | auto/正长度，理想列宽 | `column-width: 16rem`；最终列宽随可用空间 |
| `column-count` | auto/正整数，列数 | `column-count: 2`；不是Grid二维卡片 |
| `column-fill` | auto/balance/balance-all 等 | `column-fill: balance`；具体值和高度需测试 |
| `column-span` | none/all，跨多列 | `column-span: all`；不等于grid span |
| `column-rule` | width/style/color 简写 | `column-rule: 1px solid #567761`；不占额外轨道宽 |
| `column-rule-width` | 长度/粗细关键词 | `column-rule-width: 1px` |
| `column-rule-style` | none/solid/dashed 等 | `column-rule-style: solid` |
| `column-rule-color` | 颜色 | `column-rule-color: #567761` |
| `list-style` | type/position/image 简写 | `list-style: disc outside`；去标记后仍检查语义 |
| `list-style-type` | disc/decimal/none/计数样式/字符串等 | `list-style-type: decimal`；有序步骤应使用ol |
| `list-style-position` | inside/outside | `list-style-position: outside`；换行缩进不同 |
| `list-style-image` | none/图像 | `list-style-image: none`；资源失败应有类型回退 |
| `content` | normal/none/文字/图像/计数器等 | `content: counter(step) ". "`；不承载唯一关键条款 |
| `quotes` | auto/none/引号字符串对 | `quotes: "“" "”" "‘" "’"`；与open-quote配合 |
| `counter-reset` | none/计数名与整数 | `counter-reset: step`；建立计数作用域 |
| `counter-increment` | none/计数名与整数 | `counter-increment: step`；不改变数据排序 |
| `counter-set` | none/计数名与整数 | `counter-set: step 3`；设置已有或相关计数 |

`::marker { color: #326747; }` 为列表标记着色；支持属性集合比普通元素有限。生成序号可装饰文档，真正的步骤关系仍应有 ol/li 语义。

### 5.12 分页、容器与 SVG

| 属性 | 值与行为 | 最小示例、注意点 |
| --- | --- | --- |
| `break-before` | auto/avoid/page/column/left/right 等 | `break-before: page`；打印前分页 |
| `break-after` | auto/avoid/page/column 等 | `break-after: avoid`；保留标题与后文的倾向 |
| `break-inside` | auto/avoid/avoid-page/avoid-column | `break-inside: avoid`；过长内容仍可能必须拆开 |
| `orphans` | 正整数，页或列末最少行 | `orphans: 3`；主要影响块内行 |
| `widows` | 正整数，页或列首最少行 | `widows: 3`；打印实现需预览 |
| `page` | auto/页面名，选择命名页 | `page: report`；需对应@page，支持有差异 |
| `container-type` | normal/inline-size/size | `container-type: inline-size`；根据查询轴选择包含范围 |
| `container-name` | none/自定义名列表 | `container-name: card`；必须有合适查询能力 |
| `container` | 名称/类型简写 | `container: card / inline-size`；查询改变后代 |
| `fill` | none/颜色/绘制源 | `fill: #326747`；主要SVG图形 |
| `fill-opacity` | 数字/百分比，填充透明度 | `fill-opacity: .8`；不淡化整个父组 |
| `fill-rule` | nonzero/evenodd，填充判定 | `fill-rule: evenodd`；影响复杂路径孔洞 |
| `stroke` | none/颜色/绘制源 | `stroke: currentColor`；SVG描边 |
| `stroke-width` | 长度/百分比等，描边宽 | `stroke-width: 2`；SVG用户单位规则 |
| `stroke-opacity` | 数字/百分比 | `stroke-opacity: .8` |
| `stroke-linecap` | butt/round/square | `stroke-linecap: round`；线端形状 |
| `stroke-linejoin` | miter/round/bevel 等 | `stroke-linejoin: round`；新值另验 |
| `stroke-miterlimit` | 大于等于1数字 | `stroke-miterlimit: 4`；控制尖角限度 |
| `stroke-dasharray` | none/长度数字列表 | `stroke-dasharray: 4 2`；虚线周期 |
| `stroke-dashoffset` | 长度/百分比等 | `stroke-dashoffset: 2`；沿虚线偏移 |
| `paint-order` | normal/fill stroke markers 顺序 | `paint-order: stroke fill`；描边与填充层序 |
| `vector-effect` | none/non-scaling-stroke 等 | `vector-effect: non-scaling-stroke`；具体值支持不同 |
| `marker` | none/url，三种路径标记简写 | `marker: none`；不等于HTML列表marker |
| `marker-start` | none/url | `marker-start: url(#arrow)`；需真实SVG定义 |
| `marker-mid` | none/url | `marker-mid: url(#dot)`；无定义不显示 |
| `marker-end` | none/url | `marker-end: url(#arrow)`；箭头需defs |
| `stop-color` | 颜色，SVG渐变停止点 | `stop-color: #326747`；作用于stop |
| `stop-opacity` | 数字/百分比 | `stop-opacity: .8`；渐变通道 |
| `flood-color` | 颜色，SVG滤镜填充 | `flood-color: #326747`；不是普通HTML背景 |
| `flood-opacity` | 数字/百分比 | `flood-opacity: .5`；作用于相关滤镜 |
| `lighting-color` | 颜色，SVG光照滤镜 | `lighting-color: #fff`；仅相关滤镜 |
| `clip-rule` | nonzero/evenodd | `clip-rule: evenodd`；SVG剪裁路径 |
| `color-interpolation` | auto/sRGB/linearRGB | `color-interpolation: sRGB`；SVG插值，不等于color-mix语法 |
| `color-interpolation-filters` | auto/sRGB/linearRGB | `color-interpolation-filters: linearRGB`；滤镜色空间 |
| `shape-rendering` | auto/optimizeSpeed/crispEdges/geometricPrecision | `shape-rendering: geometricPrecision`；实现提示 |
| `dominant-baseline` | auto/alphabetic/middle/hanging 等 | `dominant-baseline: middle`；SVG文字基线，字体差异 |
| `alignment-baseline` | baseline/middle 等 | `alignment-baseline: baseline`；支持和适用上下文需验 |
| `baseline-shift` | sub/super | `baseline-shift: super`；不替代文本语义 |
| `text-anchor` | start/middle/end | `text-anchor: middle`；SVG文字锚定 |
| `d` | none/path()，SVG路径几何 | `d: path("M0 0 L20 20")`；CSS设置d支持需单独查 |
| `x` | 长度百分比等，SVG水平位置 | `x: 10px`；不用于普通div定位 |
| `y` | 长度百分比等，SVG垂直位置 | `y: 10px`；几何属性支持需查 |
| `cx` | 长度百分比等，圆/椭圆中心x | `cx: 20px`；SVG几何 |
| `cy` | 长度百分比等，圆/椭圆中心y | `cy: 20px` |
| `r` | 非负长度百分比，圆半径 | `r: 10px` |
| `rx` | auto/非负长度百分比，椭圆x半径等 | `rx: 10px`；适用元素不同 |
| `ry` | auto/非负长度百分比，椭圆y半径等 | `ry: 8px` |

SVG 几何属性同时有 HTML/SVG 标记属性路径，不能将 CSS 支持不足误写为 SVG 本身不可用。
分页主线使用 `break-*`，并在目标打印引擎中验证。

### 5.13 稳定增强与特殊呈现

以下属性均通过当前标准状态门禁，但目标浏览器覆盖和组合行为可能不同。基础路径继续使用正常流、
静态信息、完整正文或原生控件；增强只有在目标矩阵和真实行为通过后才启用。

| 属性或机制 | 值、行为与最小示例 | 支持与回退 |
| --- | --- | --- |
| `anchor-name` | `anchor-name: --help`；让元素成为命名锚点 | Anchor positioning 新能力，先核对每个目标引擎；回退正常流说明 |
| `position-anchor` | `position-anchor: --help`；定位盒选择锚点 | 不仅检测anchor-name，具体值需验 |
| `position-area` | `position-area: top`；按锚点区域放置 | 保留 absolute 或正常流基础路径 |
| `position-try` | `position-try: flip-block`；溢出时尝试替代位置 | 新简写，回退可见且不出屏的基础布局 |
| `position-try-fallbacks` | `position-try-fallbacks: flip-block, flip-inline` | 各项支持与组合需实测 |
| `position-try-order` | `position-try-order: most-height`；候选尝试排序 | 非共同基础，不能只靠它防遮挡 |
| `position-visibility` | `position-visibility: no-overflow`；控制溢出时显示 | 与锚点组合行为需验，回退普通可见内容 |
| `anchor-scope` | `anchor-scope: --help`；限制锚点名字范围 | 较新范围机制，独立支持 |
| `field-sizing` | `field-sizing: content`；控件按内容计算优先尺寸 | 回退明确 width/min/max 和 resize |
| `line-clamp` | `line-clamp: 3`；限制块行数 | 核心条款保留完整正文或显式展开路径 |
| `text-box` | `text-box: trim-both cap alphabetic`；文字边缘修整简写 | 跨字体和目标引擎单独测试 |
| `text-box-trim` | `text-box-trim: trim-both`；修整首尾文字盒边缘 | 普通 line-height 回退 |
| `text-box-edge` | `text-box-edge: cap alphabetic`；度量边缘 | 不保证所有中文字库相同视觉效果 |
| `initial-letter` | `initial-letter: 2`；首字下沉或上升 | 普通首字样式回退，逐字体和引擎验证 |

上表不能用来承诺每个组合已经覆盖全部浏览器。采用时必须记录目标版本、解析与行为结果，并
证明禁用增强后同一核心任务仍可完成。无障碍主线使用正确 HTML、名称、状态和键盘流程。

<!-- PROPERTY-AUDIT-END -->

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-10-properties/index.html`。示例只从固定集合选择布局，不拼接不可信 CSS 文本：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>属性观察台 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #263d30;
      background: #f3f7f3;
      font: 1rem/1.7 system-ui, sans-serif;
    }
    main {
      width: min(100% - 2rem, 48rem);
      margin: 2rem auto;
    }
    select {
      min-height: 2.75rem;
      padding: .5rem;
      color: inherit;
      font: inherit;
    }
    .catalog {
      gap: 1rem;
      margin-block: 1rem;
      padding: 1rem;
      border: 2px solid #567761;
      background: #fff;
    }
    .catalog[data-layout="block"] { display: block; }
    .catalog[data-layout="flex"] {
      display: flex;
      flex-wrap: wrap;
    }
    .catalog[data-layout="grid"] {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
    }
    .listing {
      min-width: 0;
      padding: 1rem;
      overflow-wrap: anywhere;
      background: #eaf3ec;
    }
    .catalog[data-layout="block"] .listing + .listing { margin-top: 1rem; }
    .catalog[data-layout="flex"] .listing { flex: 1 1 12rem; }
    .listing h2 { margin-top: 0; font-size: 1.2rem; }
    pre {
      padding: .75rem;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      color: #edf4ee;
      background: #17251c;
    }
    :focus-visible {
      outline: 3px solid #175ca2;
      outline-offset: 3px;
    }
  </style>
</head>
<body>
  <main>
    <h1>CSS 属性观察台</h1>
    <label for="layout">选择商品布局</label>
    <select id="layout">
      <option value="block">正常块流</option>
      <option value="flex">Flex</option>
      <option value="grid">Grid</option>
    </select>
    <div class="catalog" id="catalog" data-layout="block">
      <article class="listing">
        <h2>阅读台灯</h2>
        <p>39.00 元，可预约。</p>
      </article>
      <article class="listing">
        <h2>木质收纳盒</h2>
        <p>25.00 元，已售。</p>
      </article>
    </div>
    <pre id="report" aria-label="属性查询报告"></pre>
    <p>CSS 只改变呈现，本页没有发布、预约或支付请求。</p>
  </main>
  <script>
    const catalog = document.querySelector("#catalog");
    const select = document.querySelector("#layout");
    const allowedLayouts = new Set(["block", "flex", "grid"]);

    function report() {
      const style = getComputedStyle(catalog);
      document.querySelector("#report").textContent = JSON.stringify({
        requestedLayout: catalog.dataset.layout,
        computedDisplay: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        visualWidth: catalog.getBoundingClientRect().width,
        subgridSyntax: CSS.supports("grid-template-rows", "subgrid"),
        scrollTimelineSyntax: CSS.supports("animation-timeline", "scroll()"),
        note: "语法检测不证明组合行为、可访问性或其他浏览器支持"
      }, null, 2);
    }

    select.addEventListener("change", () => {
      if (!allowedLayouts.has(select.value)) return;
      catalog.dataset.layout = select.value;
      report();
    });
    addEventListener("resize", report);
    report();
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-10-properties
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

验证：

1. block、flex、grid 三种状态的 computed display 与请求值一致；
2. grid 轨道随容器宽度改变，flex 下不能只看残留的 grid 计算文本判断布局；
3. 320px、长标题与 200% 缩放下内容不被裁切；
4. 支持检测结果只描述当前引擎语法接受，不升级为跨浏览器结论；
5. Console 无错误，商品状态仍只是静态教学文本。

## 7. 邻里集市集成案例

项目中查属性采用“问题到模块”的路径：

- 商品卡横向溢出：先查内在尺寸、`min-width`、Grid/Flex 和长词；
- 角标错位：先查包含块、逻辑 inset、堆叠上下文；
- 主题文字不可读：先查 color、background、强制颜色与对比；
- 动画取消后状态错乱：回到状态机，不在属性表里寻找业务修复；
- 打印遮挡：查定位、overflow、break 与 print 媒体；
- SVG 图标不随色：查 fill/stroke 与 `currentColor`，不套普通背景属性；
- 某稳定增强无效：进入第三课的目标矩阵与回滚检查，不添加未经课程门禁的语法；
- 找到属性后回链主要教程，验证完整上下文而不是复制一行声明。

452 项是课程审计口径，不是要求一个页面全部使用。未使用属性不等于缺陷，按需求选择最小集合。

## 8. 常见错误与排查路径

### 明确错误案例：合法属性配非法值

```css
.catalog {
  padding: -1rem;
  grid-template-columns: repeat(2, minmax(1fr, 2fr));
}
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | padding 与轨道声明被忽略，页面退回其他获胜值或单列 |
| 证据 | Styles 面板标记无效；Computed 没有预期负内边距或两列 |
| 原因 | padding 不接受负值；`minmax()` 最小值不能使用 flex 值 |
| 修复 | 改为非负 padding 与 `minmax(0, 1fr)` |
| 复验 | 声明不再被划除，Computed 和 Grid overlay 与预期一致 |

其他故障：

- 属性存在但不生效：检查适用上下文、display、层叠胜者和资源条件；
- 简写后长属性消失：查看简写重置列表和源码顺序；
- logical/physical 同边冲突：根据 writing mode 映射后再比较层叠；
- `gap` 在普通 block 中无预期：先建立支持 gap 的布局上下文；
- `z-index: 999999` 仍被遮挡：沿祖先查堆叠上下文；
- `CSS.supports()` 为 true 但页面失败：补真实行为、边界状态和浏览器矩阵。

## 9. 课后题

**问题 1：452 是否代表浏览器支持的全部 CSS 属性？**

<details>
<summary>参考答案</summary>

不是。它是本次稳定状态门禁后的课程索引，并把 at-rule、描述符、函数和 API 分开。浏览器实现
集合会随版本变化，项目仍要执行目标矩阵。

</details>

**问题 2：为什么简写值正确仍可能破坏组件？**

<details>
<summary>参考答案</summary>

简写会把未写长属性重置为初始值。例如后写 `background`、`font` 或 `animation` 可能清除先前图层、字体变体或时间线配置。

</details>

**问题 3：`fill` 为什么不能直接当普通 div 背景？**

<details>
<summary>参考答案</summary>

它主要适用于 SVG 绘制元素和相应上下文。普通 HTML 盒背景使用 background 系列；同名视觉概念不代表适用模型相同。

</details>

## 10. 实践练习

### 基础：模块检索卡

- **文件：**`exercise-module-lookup.md`。
- **操作：**为“长标题溢出”“RTL 角标”“打印分页”各找三项候选属性。
- **预期：**每项记录模块、适用上下文、值和主要教程链接。
- **失败观察：**标出名称相关但上下文不适用的候选。
- **完成标准：**最终方案是最小组合，不堆叠无关属性。

### 进阶：简写重置实验

- **文件：**`exercise-shorthand-reset.html`。
- **操作：**分别观察 background、font、grid、animation 简写前后 Computed。
- **预期：**能列出被重置的关键长属性并调整声明顺序。
- **失败观察：**保存 Styles 差异和视觉结果。
- **完成标准：**不以“浏览器 bug”解释规范重置。

### 故障注入：支持检测误判

- **文件：**`exercise-support-failure.md`。
- **操作：**只凭一个属性的 `CSS.supports()` 显示“全部支持”，再测试完整组合和回退。
- **预期：**发现解析、组合、行为和可访问性证据层级不同。
- **失败观察：**记录检测值、Computed、交互和未验证浏览器。
- **完成标准：**恢复精确文案，并保留基础可用路径。

## 11. 阶段验收

- [ ] 审计区顺序项为 452；
- [ ] 审计区唯一项为 452；
- [ ] 名称顺序 SHA-256 与基线一致；
- [ ] 能按模块定位而不是只全文猜词；
- [ ] 能说明至少四个简写的重置风险；
- [ ] 能区分物理边与逻辑边；
- [ ] 能区分属性解析、计算值和行为验证；
- [ ] 目标覆盖不同的稳定项不承担必要内容；
- [ ] SVG、打印和交互属性按适用上下文使用；
- [ ] 示例没有外部缺失资源或真实交易行为。

## 12. 常见问题

**为什么不按字母排序？**<br>
模块顺序让同一机制的长属性、简写和上下文相邻，更适合从问题推理。编辑器自动补全可承担字母检索。

**表里的最小声明可以直接复制上线吗？**<br>
不可以直接假定。它只展示值形态；仍需结合层叠、DOM、内容、浏览器矩阵、可访问性和性能验证。

**属性名没出现在 452 中是否就不能用？**<br>
先判断它是描述符、函数、选择器、状态门禁未通过的能力，还是录入遗漏，再查当前规范与 BCD。
不要为守数量拒绝稳定标准演进，也不要静默改基线。

**为什么稳定属性仍要保留基础路径？**<br>
稳定状态不等于所有目标版本、组合和辅助技术已经验证。基础路径保证增强关闭时同一核心任务仍
能完成。

## 13. 扩展阅读

资料核验日期：2026-10-11；状态元数据使用 MDN BCD 8.1.5。

- [MDN CSS 参考总索引](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference)：属性、选择器、规则与数据类型入口。
- [MDN CSS 模块](https://developer.mozilla.org/en-US/docs/Web/CSS)：按模块查主要概念。
- [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data)：版本化状态与兼容审计来源。
- [CSSWG 现行规范索引](https://www.w3.org/Style/CSS/current-work)：规范成熟度与模块链接。
- [CSS Cascade Level 5](https://www.w3.org/TR/css-cascade-5/)：值处理、层与简写相关机制。
- [CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/)：值定义、数学和单位。

索引中的稳定项不代表所有值在全部目标浏览器一致；5.13 项尤其需要项目矩阵。Safari、Firefox、
真实打印、SVG 辅助技术和低性能设备未在本课自动验证。

## 我现在能做到什么

我能按模块检索 452 项稳定属性，解释值、适用上下文和简写风险，并用机械审计保护名称口径。
下一课会把 at-rule、描述符、函数和语法位置从普通属性中分离出来。

## 单元导航

- [返回第十章入口](../10-property-reference.md)
- [下一课：At-rule、函数与描述符](02-at-rules-functions-descriptors.md)
- [上一章：现代 CSS 组件](../09-components-modern-css.md)
- [返回 CSS 模块](../README.md)
