# CSS：让样式结果可以推导、适配和验证

> 面向零基础学习者的 CSS 完整教程
> 主线项目：邻里集市商品目录、详情、收藏反馈与发布预览

CSS 不只是“把页面变好看”。浏览器会解析规则、筛选候选声明、执行层叠、计算值、建立格式化上下文，再完成布局、绘制和可能的合成。一个页面看起来正确，不代表它在窄屏、缩放、长文字、键盘、打印或用户偏好下仍然可用。

本卷的目标是让你能够回答：

- 为什么某条声明被忽略、失效、继承或覆盖？
- 一个相对尺寸、百分比、颜色和布局结果依据什么计算？
- Flex、Grid、定位和响应式机制分别解决什么问题？
- 动画、主题和新 CSS 能力失效时，核心内容与操作是否仍然成立？
- 页面“看起来正常”时，还需要保留哪些 DevTools、兼容性和人工验证证据？

## 本卷定位与教材结构

CSS 模块采用与 HTML 模块一致的两层结构：

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

章入口不是正文摘要的替代品。学习时先打开章入口，再按顺序完成其中的三篇详细教程，最后回到章入口完成综合任务。

全部知识点及其理论、案例、诊断、练习和验收位置，见 [CSS 教学覆盖矩阵](CSS-COVERAGE.md)。
第十章另有 452 项稳定属性审计，at-rule、描述符、函数、选择器、伪元素和 JavaScript API
不混入这一数量。

## 学习路线

### 第一章：语法、层叠与选择器

章入口：[CSS 语法、层叠与选择器](01-syntax-cascade-selectors.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [规则、解析与样式入口](01-syntax-cascade-selectors/01-rules-parsing-entry-points.md) | 怎样区分资源未加载、语法错误、无效声明和计算值阶段失效 |
| 2 | [层叠层、特异性与确定性决策](01-syntax-cascade-selectors/02-cascade-layers-specificity.md) | 多条声明竞争时，怎样按固定顺序推导唯一胜者 |
| 3 | [选择器、伪类与继承](01-syntax-cascade-selectors/03-selectors-pseudo-classes-inheritance.md) | 怎样依据真实 DOM 表达结构和状态，并区分匹配、层叠与继承 |

阶段产出：可解释样式入口、层叠决策和商品状态选择器的观察台。建议投入约 5.5 小时。

### 第二章：值、颜色与单位

章入口：[值、颜色与单位](02-values-colors-units.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [值阶段、单位与百分比](02-values-colors-units/01-value-stages-units-percentages.md) | 怎样从指定值追踪到实际值，并找准每个百分比的参照 |
| 2 | [字体、视口、容器单位与数学函数](02-values-colors-units/02-font-viewport-container-math.md) | 怎样为字号、视口和组件空间建立有上下界的响应尺寸 |
| 3 | [颜色空间、透明度与对比度](02-values-colors-units/03-color-spaces-transparency-contrast.md) | 怎样组合现代颜色、sRGB 回退、透明叠加和对比证据 |

阶段产出：能追踪值阶段、适应缩放并保留颜色回退的商品摘要。建议投入约 6 小时。

### 第三章：盒模型、常规流与定位

章入口：[盒模型、常规流与定位](03-box-sizing-flow-position.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [盒模型、内在尺寸与溢出](03-box-sizing-flow-position/01-box-model-intrinsic-sizing-overflow.md) | 怎样推导盒尺寸并修复长内容、媒体和局部滚动故障 |
| 2 | [常规流、格式化上下文与外边距](03-box-sizing-flow-position/02-normal-flow-formatting-contexts-margins.md) | 外边距为什么折叠，浮动为什么越出父级，BFC 改变了什么 |
| 3 | [包含块、定位与堆叠](03-box-sizing-flow-position/03-containing-block-position-stacking.md) | 怎样找到定位参照、滚动祖先、堆叠上下文和 top layer |

阶段产出：长内容不失控、sticky 与角标参照清楚、浮层层级可解释的商品页。建议投入约 6.5 小时。

### 第四章：字体、文本与视觉装饰

章入口：[字体、文本与视觉装饰](04-typography-decoration.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [字体加载、回退与度量](04-typography-decoration/01-font-loading-fallback-metrics.md) | 字体选择和加载怎样改变字形度量、换行与布局偏移 |
| 2 | [换行、国际化与可读性](04-typography-decoration/02-line-breaking-i18n-readability.md) | 怎样处理长 URL、中英混排、双向文本、竖排和放大文字 |
| 3 | [背景、边框、阴影、滤镜与裁剪](04-typography-decoration/03-background-border-shadow-filter-clip.md) | 怎样分层装饰，并保证装饰失效后信息和焦点仍然成立 |

阶段产出：字体可回退、长文字可阅读、关闭装饰仍能理解的商品阅读页。建议投入约 6.5 小时。

### 第五章：Flexbox

章入口：[Flexbox](05-flexbox.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [Flex 轴、换行与对齐](05-flexbox/01-axes-wrapping-alignment.md) | 怎样确定主轴、交叉轴、flex line 和各类对齐属性的作用对象 |
| 2 | [Flex 增长、收缩、基准与自动最小尺寸](05-flexbox/02-grow-shrink-basis-auto-minimum.md) | 怎样手算自由空间，并修复长内容导致的自动最小尺寸溢出 |
| 3 | [响应式工具栏与阅读顺序](05-flexbox/03-responsive-toolbar-reading-order.md) | 怎样在 320px 下换行，同时保持 DOM、视觉和 Tab 主流程一致 |

阶段产出：可收缩、可换行且不改变任务顺序的搜索栏与商品操作区。建议投入约 6.5 小时。

### 第六章：Grid 与 Subgrid

章入口：[Grid 与 Subgrid](06-grid.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [显式轨道、网格线与区域](06-grid/01-explicit-tracks-lines-areas.md) | 固定值、内容下限、间隙和剩余空间怎样共同决定轨道 |
| 2 | [自动放置、隐式网格与响应式重复](06-grid/02-auto-placement-implicit-responsive-repeat.md) | 商品怎样自动进入网格，列数怎样随空间变化而不承担业务排序 |
| 3 | [Subgrid、对齐与回退](06-grid/03-subgrid-alignment-fallback.md) | 嵌套卡片怎样共享父轨道，并为不支持环境保留普通 Grid |

阶段产出：从单列扩展到多列、顺序稳定且有 Subgrid 回退的商品目录。建议投入 12–15 小时。

### 第七章：响应式布局与容器查询

章入口：[响应式布局与容器查询](07-responsive-container.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [媒体查询与内容断点](07-responsive-container/01-media-queries-content-breakpoints.md) | 怎样从内容拥挤证据选择断点，并保留打印路径 |
| 2 | [容器查询与容器单位](07-responsive-container/02-container-queries-units.md) | 同一组件怎样按嵌入空间而不是整个视口改变布局 |
| 3 | [逻辑属性、输入能力、安全区与偏好](07-responsive-container/03-logical-properties-input-safe-area-preferences.md) | 怎样覆盖方向、输入能力、动态视口、安全区和用户偏好 |

阶段产出：在宽窄宿主、LTR/RTL、不同输入和系统偏好中均可用的商品卡。建议投入 13–16 小时。

### 第八章：变换、过渡与可取消动画

章入口：[变换、过渡与可取消动画](08-transforms-transitions-animation.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [变换、坐标系与合成](08-transforms-transitions-animation/01-transforms-coordinates-compositing.md) | 怎样从参考盒、原点和函数顺序推导视觉几何与层级副作用 |
| 2 | [过渡、关键帧与可取消状态](08-transforms-transitions-animation/02-transitions-keyframes-cancelable-state.md) | 怎样让动作服从组件状态机，并处理中断、取消和重复触发 |
| 3 | [WAAPI、滚动时间线与减少动作](08-transforms-transitions-animation/03-waapi-scroll-timeline-reduced-motion.md) | 怎样管理动画对象生命周期，并把新时间线限制为渐进增强 |

阶段产出：状态先行、可中断、减少动作下有等价静态结果的收藏反馈。建议投入 14–17 小时。

### 第九章：现代 CSS 组件与系统环境

章入口：[现代 CSS 组件与系统环境](09-components-modern-css.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [自定义属性、@property 与主题](09-components-modern-css/01-custom-properties-property-themes.md) | 主题 token 怎样替换、继承、失效、注册和跨主题覆盖 |
| 2 | [层叠层、原生嵌套与作用域](09-components-modern-css/02-layers-nesting-scope.md) | 组件样式怎样控制优先级、特异性预算和匹配边界 |
| 3 | [表单、滚动、打印与强制颜色](09-components-modern-css/03-forms-scroll-print-forced-colors.md) | 原生控件和系统模式怎样保持可操作、可读和可打印 |

阶段产出：主题可降级、样式边界可审计、系统模式可用的商品发布预览。建议投入 15–18 小时。

### 第十章：属性、语法与兼容参考

章入口：[CSS 属性、语法与兼容参考](10-property-reference.md)

| 顺序 | 详细教程 | 你会解决的问题 |
| --- | --- | --- |
| 1 | [稳定属性与模块索引](10-property-reference/01-stable-properties-module-index.md) | 怎样按模块检索并机械保护 452 项稳定属性口径 |
| 2 | [At-rule、函数与描述符](10-property-reference/02-at-rules-functions-descriptors.md) | 各类 CSS 语法应该出现在哪个上下文，为什么不能混算为属性 |
| 3 | [稳定兼容性与渐进增强](10-property-reference/03-stable-compatibility-progressive-enhancement.md) | 怎样用目标矩阵、基础路径、行为验收和回滚管理稳定增强 |

阶段产出：可检索的稳定属性索引、语法分类表和可执行的兼容验收记录。建议投入 18–24 小时。

## 学习与运行

建议按下面的顺序完成一篇教程：

1. **预测**：先看任务和最小代码，写下预期布局、计算值或状态。
2. **复现**：在个人练习目录创建教程指定文件，按说明直接打开或启动本地 HTTP 服务。
3. **观察**：至少保留页面、Elements、Styles 和 Computed；按教程补充 Network、Layout、Accessibility、Performance 或打印证据。
4. **破坏**：完成明确错误案例，先记录现象再修改代码。
5. **恢复**：写出原因，实施最小修复并重复原路径。
6. **迁移**：不看答案完成基础、进阶和故障注入练习。
7. **验收**：逐项提交代码路径、操作、结果、复验和未验证边界。

只复制完整案例不能证明掌握。能够预测值与布局、解释机制、诊断失败并迁移到新组件，才可以进入下一课。

### 个人练习目录

教程交付物是 Markdown，不附带独立实验源码。学习者在个人项目中创建：

```text
market-learning/
└── practice/
    ├── css-01-01/
    ├── css-01-02/
    ├── css-01-03/
    ├── css-02-01/
    └── ...
```

多数完整案例是包含 `<style>` 和少量脚本的单个 HTML 文件，可直接打开；需要观察 HTTP 状态、MIME 或外部样式表时，教程会明确要求本地服务。完整案例不依赖外部图片、字体、构建工具、账号或真实 API。

字体、背景图片、SVG、打印机、安全区和跨源资源等局部片段有真实环境条件，不能把占位路径或当前浏览器模拟描述成成功结果。

## 连续项目与边界

- CSS 负责呈现和布局，不负责 HTML 语义、身份认证、对象授权、支付、事务或服务端验证。
- 商品价格的业务存储与传输单位始终是整数分，例如 39 元存为 `3900`；CSS 只呈现已经格式化的金额。
- 收藏、筛选、预约反馈、主题切换和发布预览只存在于当前页面内存或 DOM 中，刷新后恢复；它们没有发送请求或完成持久化。
- 动画结束、颜色变化、按钮隐藏、`disabled` 外观和校验伪类都不能证明服务器操作成功或用户有权限。
- CSS 选择器、生成内容和自定义属性不能存放敏感数据，也不能替代可信的数据状态。
- 不通过 `overflow-x: hidden` 裁掉故障、移除焦点、禁止缩放、只保留 hover 或删除错误断言获得“通过”。
- 图形装饰使用 CSS 形状与渐变时，只承担装饰职责，不冒充商品照片、状态文字或操作名称。

详细业务模型见[邻里集市项目契约](../00-guide/05-project-assessment.md)。

## 验收

完成本卷时，需要从空白练习目录独立完成：

- 一套能解释解析、层叠、选择器匹配、继承和值阶段的基础样式；
- 在 320px、768px、宽屏、200% 缩放和长文字下不丢内容的商品详情与目录；
- 分别使用 Flex 和 Grid 的适当布局，并为 Subgrid 与容器查询保留基础回退；
- 字体失败、装饰关闭、RTL、键盘、无 hover、减少动作和强制颜色下仍可理解的组件；
- 状态先于动作更新、可连续触发和取消的收藏反馈；
- 标签、错误文字、打印边界和“未发送请求”说明完整的发布预览；
- 一次从 452 项稳定属性索引反查模块、区分 at-rule/描述符/函数并建立目标矩阵的审计。

验收材料至少包含：

```text
个人代码路径
打开或运行方式
浏览器与视口/缩放条件
正常结果和 DevTools 证据
错误注入和故障证据
修复动作与复验
键盘、偏好与打印记录
未验证的浏览器、设备或辅助技术
为什么选择该布局、属性和回退
```

不能以单张截图、单一 Chromium 的语法接受、属性数量或“在我的电脑上正常”替代上述证据。

## 验证范围

CSS 是持续演进的规范集合，不使用“背完固定 CSS 版本”作为完成标准。课程主线只收录核验日
通过稳定状态门禁的机制；项目再通过目标浏览器矩阵和真实行为决定是否启用增强。

精确资料快照、课程选择和兼容原则统一见[版本基线](../00-guide/02-version-baseline.md)。
`CSS.supports()`、CSSOM 中出现规则或当前浏览器解析成功，只能证明对应层级，不能单独证明
布局、交互、性能和跨浏览器行为正确。

Subgrid、尺寸容器查询、`@layer`、自定义属性、滚动时间线、锚点定位、`@scope` 等稳定机制
仍需按产品浏览器基线核对具体值与组合，并保留完成同一核心任务的基础路径。

本卷已完成结构、链接、围栏、属性索引和代表性浏览器路径验证；Safari、Firefox、WebView、
真实移动设备、辅助技术、打印与有限支持特性的组合行为仍需在目标环境复测。精确数量、执行结果
和人工缺口统一见[交付与验证说明](../VALIDATION.md)。

## 资料与导航

- [CSSWG](https://www.w3.org/Style/CSS/)
- [MDN CSS](https://developer.mozilla.org/docs/Web/CSS)
- [CSS 教学覆盖矩阵](CSS-COVERAGE.md)

[上一卷：HTML](../01-html/README.md) · [返回全书目录](../README.md) ·
[开始第一章](01-syntax-cascade-selectors.md) · [下一卷：浏览器](../03-browser/README.md)
