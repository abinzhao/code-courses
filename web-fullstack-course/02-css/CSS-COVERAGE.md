# CSS 教程覆盖矩阵

## 口径

本矩阵覆盖 Batch A 规定的 10 个 CSS 章节、30 篇详细教程。每行指向正文的六类可判定证据：

- **理论：**第 4 节机制推导；
- **最小案例：**第 6 节完整单文件与运行步骤；
- **项目案例：**第 7 节邻里集市集成；
- **错误诊断：**第 8 节明确错误及“现象、证据、原因、修复、复验”；
- **练习：**第 9 节有答案课后题与第 10 节基础/进阶/故障注入；
- **验收：**第 11 节检查项。

矩阵只做映射，不替代教程正文。兼容快照日期为 2026-10-10；Chromium 是主要自动验证环境，Safari、Firefox、真实移动设备、VoiceOver、NVDA、JAWS、真实打印机与低性能 GPU 必须按正文边界另行验证。

## 30 篇教程映射

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CSS-01 | token、规则解析、声明失效、三类样式入口与资源证据 | [规则、解析与样式入口](01-syntax-cascade-selectors/01-rules-parsing-entry-points.md) | §4 解析与错误恢复 | §6 独立页面 | §7 集市样式入口 | §8 错文件/无效声明 | §9–10 三档任务 | §11 |
| CSS-02 | 来源、重要性、上下文、layer、特异性、scope proximity 与源码顺序 | [层叠层与特异性](01-syntax-cascade-selectors/02-cascade-layers-specificity.md) | §4 决策顺序 | §6 胜者观察台 | §7 组件覆盖 | §8 层叠误判 | §9–10 决策练习 | §11 |
| CSS-03 | 类型/类/ID/属性/关系选择器、函数式伪类、伪元素与继承 | [选择器、伪类与继承](01-syntax-cascade-selectors/03-selectors-pseudo-classes-inheritance.md) | §4 匹配模型 | §6 选择器实验 | §7 商品状态 | §8 匹配失败 | §9–10 诊断练习 | §11 |
| CSS-04 | 指定值、计算值、使用值、实际值、绝对/相对单位与百分比参照 | [值阶段、单位与百分比](02-values-colors-units/01-value-stages-units-percentages.md) | §4 值阶段 | §6 Computed 实验 | §7 商品尺寸 | §8 百分比误判 | §9–10 值追踪 | §11 |
| CSS-05 | 字体/根字体/视口/容器单位，calc/min/max/clamp 与类型运算 | [字体、视口、容器单位与数学](02-values-colors-units/02-font-viewport-container-math.md) | §4 单位推导 | §6 尺寸观察台 | §7 响应式字号 | §8 单位混算 | §9–10 边界练习 | §11 |
| CSS-06 | sRGB、HSL、现代色彩空间、alpha、插值、系统色、对比与回退顺序 | [色彩空间、透明度与对比](02-values-colors-units/03-color-spaces-transparency-contrast.md) | §4 色彩模型 | §6 颜色观察台 | §7 主题状态 | §8 对比/alpha 误判 | §9–10 颜色练习 | §11 |
| CSS-07 | content/padding/border/margin、box-sizing、内在尺寸、替换元素与 overflow | [盒模型、内在尺寸与溢出](03-box-sizing-flow-position/01-box-model-intrinsic-sizing-overflow.md) | §4 盒尺寸推导 | §6 溢出页面 | §7 商品卡 | §8 裁切诊断 | §9–10 尺寸练习 | §11 |
| CSS-08 | 块/行内格式化、外边距折叠、float、BFC 与正常流阅读顺序 | [正常流、格式化上下文与外边距](03-box-sizing-flow-position/02-normal-flow-formatting-contexts-margins.md) | §4 格式化上下文 | §6 BFC 实验 | §7 图文卡片 | §8 折叠/浮动错误 | §9–10 流练习 | §11 |
| CSS-09 | 包含块、relative/absolute/fixed/sticky、z 轴、堆叠上下文与顶层 | [包含块、定位与堆叠](03-box-sizing-flow-position/03-containing-block-position-stacking.md) | §4 定位/堆叠推导 | §6 层级观察台 | §7 角标与工具栏 | §8 z-index 误判 | §9–10 定位练习 | §11 |
| CSS-10 | 字体族/字体面、加载、回退度量、可变字体与布局偏移 | [字体加载、回退与度量](04-typography-decoration/01-font-loading-fallback-metrics.md) | §4 字体选择/加载 | §6 无缺失资源案例 | §7 集市排版 | §8 字体失败诊断 | §9–10 加载练习 | §11 |
| CSS-11 | 行盒、间距、换行、断词、溢出、竖排、双向文本与可读性 | [换行、国际化与可读性](04-typography-decoration/02-line-breaking-i18n-readability.md) | §4 行布局 | §6 多语言页面 | §7 长标题 | §8 截断/方向错误 | §9–10 i18n 练习 | §11 |
| CSS-12 | 多层背景、边框、圆角、阴影、滤镜、mask/clip 与可访问替代 | [背景、边框、阴影与裁剪](04-typography-decoration/03-background-border-shadow-filter-clip.md) | §4 绘制层次 | §6 装饰观察台 | §7 商品状态 | §8 信息被遮蔽 | §9–10 绘制练习 | §11 |
| CSS-13 | Flex 主/交叉轴、方向、换行、gap 与对齐 | [Flex 轴、换行与对齐](05-flexbox/01-axes-wrapping-alignment.md) | §4 轴与余量 | §6 Flex 页面 | §7 商品行 | §8 轴向误判 | §9–10 对齐练习 | §11 |
| CSS-14 | base size、正负自由空间、grow/shrink、basis 与自动最小尺寸 | [Flex 伸缩与自动最小尺寸](05-flexbox/02-grow-shrink-basis-auto-minimum.md) | §4 分配推导 | §6 数值观察台 | §7 弹性商品卡 | §8 min-size 溢出 | §9–10 分配练习 | §11 |
| CSS-15 | 响应式工具栏/卡片行、DOM/焦点/阅读顺序与 320px 回归 | [响应式工具栏与阅读顺序](05-flexbox/03-responsive-toolbar-reading-order.md) | §4 顺序边界 | §6 完整工具栏 | §7 集市集成 | §8 order 误用 | §9–10 窄屏练习 | §11 |
| CSS-16 | 显式轨道、线、区域、fr、内在尺寸与轨道溢出 | [显式轨道、线与区域](06-grid/01-explicit-tracks-lines-areas.md) | §4 轨道算法 | §6 Grid 页面 | §7 集市目录 | §8 百分比/gap 溢出 | §9–10 轨道练习 | §11 |
| CSS-17 | 自动放置、dense 风险、隐式轨道、repeat、auto-fit/fill 与 minmax | [自动放置、隐式轨道与响应式重复](06-grid/02-auto-placement-implicit-responsive-repeat.md) | §4 放置算法 | §6 自适应目录 | §7 动态商品 | §8 dense/隐式错误 | §9–10 放置练习 | §11 |
| CSS-18 | Subgrid 对齐、支持检测、普通 Grid 回退与语义顺序 | [Subgrid、对齐与回退](06-grid/03-subgrid-alignment-fallback.md) | §4 subgrid 机制 | §6 卡片行对齐 | §7 集市卡片 | §8 父轨道/回退错误 | §9–10 降级练习 | §11 |
| CSS-19 | 移动优先媒体查询、内容断点、范围语法、视口与打印边界 | [媒体查询与内容断点](07-responsive-container/01-media-queries-content-breakpoints.md) | §4 内容驱动断点 | §6 响应式页面 | §7 集市页面 | §8 设备断点错误 | §9–10 断点练习 | §11 |
| CSS-20 | 查询容器、包含副作用、尺寸/样式查询与容器单位 | [容器查询与容器单位](07-responsive-container/02-container-queries-units.md) | §4 容器机制 | §6 双容器卡片 | §7 可嵌入组件 | §8 查询自身/回退 | §9–10 容器练习 | §11 |
| CSS-21 | 逻辑属性、书写模式、输入能力、安全区、动态视口与用户偏好 | [逻辑属性、输入能力、安全区与偏好](07-responsive-container/03-logical-properties-input-safe-area-preferences.md) | §4 环境映射 | §6 LTR/RTL 页面 | §7 集市环境集成 | §8 hover 唯一入口 | §9–10 偏好矩阵 | §11 |
| CSS-22 | transform 函数、参考盒、原点、矩阵、包含块与合成 | [变换、坐标系与合成](08-transforms-transitions-animation/01-transforms-coordinates-compositing.md) | §4 坐标/合成推导 | §6 变换观察台 | §7 卡片反馈 | §8 用 transform 布局 | §9–10 图层练习 | §11 |
| CSS-23 | transition 列表、离散行为、keyframes、fill/direction、中断与状态所有权 | [过渡、关键帧与可取消状态](08-transforms-transitions-animation/02-transitions-keyframes-cancelable-state.md) | §4 时间/状态模型 | §6 可取消页面 | §7 状态先行集成 | §8 等结束再提交 | §9–10 中断练习 | §11 |
| CSS-24 | WAAPI、scroll/view timeline、检测、Promise 取消与减少动作 | [WAAPI、滚动时间线与减少动作](08-transforms-transitions-animation/03-waapi-scroll-timeline-reduced-motion.md) | §4 对象/时间线 | §6 完整控制台 | §7 收藏反馈 | §8 未处理拒绝 | §9–10 生命周期练习 | §11 |
| CSS-25 | 自定义属性替换、无效值、继承、@property 与主题契约 | [自定义属性、@property 与主题](09-components-modern-css/01-custom-properties-property-themes.md) | §4 token 数据流 | §6 主题观察台 | §7 语义主题 | §8 类型错误 | §9–10 token 练习 | §11 |
| CSS-26 | @layer、原生 nesting、@scope、组件边界与特异性预算 | [层叠层、原生嵌套与作用域](09-components-modern-css/02-layers-nesting-scope.md) | §4 架构机制 | §6 组件页面 | §7 层契约 | §8 未分层热修复 | §9–10 架构练习 | §11 |
| CSS-27 | 表单控件、accent/appearance、验证时机、滚动、打印与 forced colors | [表单、滚动、打印与强制颜色](09-components-modern-css/03-forms-scroll-print-forced-colors.md) | §4 原生/系统边界 | §6 发布预览 | §7 集市表单 | §8 清空 appearance | §9–10 系统模式练习 | §11 |
| CSS-28 | 476 项稳定口径、模块索引、值、适用上下文与简写风险 | [稳定属性与模块索引](10-property-reference/01-stable-properties-module-index.md) | §4–5 属性审计 | §6 属性观察台 | §7 问题到模块 | §8 非法值 | §9–10 检索练习 | §11 |
| CSS-29 | at-rule、描述符、值函数、函数式选择器、合法上下文与主要教程 | [At-rule、函数与描述符](10-property-reference/02-at-rules-functions-descriptors.md) | §4–5 语法分类 | §6 分类观察台 | §7 审查流程 | §8 描述符错位 | §9–10 分类练习 | §11 |
| CSS-30 | 有限、实验、弃用、非标准能力的检测、回退、回滚与删除条件 | [有限支持、实验与回退登记](10-property-reference/03-limited-experimental-fallback-register.md) | §4–5 风险登记 | §6 渐进增强页 | §7 集成门禁 | §8 UA 开关错误 | §9–10 登记练习 | §11 |

## 横切边界

| ID | 知识点 | 主要教程 | 理论 | 最小案例 | 项目案例 | 错误诊断 | 练习 | 验收 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CSS-X01 | 版本与兼容证据：规范、固定 BCD、当前解析、真实行为分层 | [有限支持与回退](10-property-reference/03-limited-experimental-fallback-register.md) | §4.1–4.4 | §6 能力报告 | §7 采用门禁 | §8 UA/单检测误判 | §10 能力登记 | §11 |
| CSS-X02 | 无障碍与用户偏好：键盘、顺序、减少动作、强制颜色 | [逻辑属性与偏好](07-responsive-container/03-logical-properties-input-safe-area-preferences.md)、[表单与强制颜色](09-components-modern-css/03-forms-scroll-print-forced-colors.md) | 两课 §4 | 两课 §6 | 两课 §7 | 两课 §8 | 两课 §10 | 两课 §11 |
| CSS-X03 | 安全与业务边界：CSS 不承担认证、对象授权、服务端验证或交易成功 | [表单、滚动、打印与强制颜色](09-components-modern-css/03-forms-scroll-print-forced-colors.md) | §4.2–4.3 | §6 本地预览 | §7 前后端职责 | §8 伪禁用 | §9–10 状态练习 | §11 |
| CSS-X04 | 人工验证边界：Safari、Firefox、真机、辅助技术、打印机与低性能设备 | [有限支持与回退](10-property-reference/03-limited-experimental-fallback-register.md) | §4.2/4.7 | §6 当前引擎报告 | §7 采用门禁 | §8 证据越界 | §10 矩阵练习 | §11/§13 |

## 476 属性审计

| 项目 | 固定结果 |
| --- | --- |
| 审计文件 | [稳定属性与模块索引](10-property-reference/01-stable-properties-module-index.md) |
| 边界 | `PROPERTY-AUDIT-START` 到 `PROPERTY-AUDIT-END` |
| 提取口径 | 边界内 Markdown 表格首列反引号名称 |
| 顺序项 | 476 |
| 唯一项 | 476 |
| SHA-256 | `e38b0f5d2a6a12e1cf772cb89010279737f2b3814bb57732e4fa0f1139486734`；名称逐行拼接并保留末尾换行 |
| 基线对比 | 名称与顺序逐项一致 |

模块分布：

| 模块 | 项数 |
| --- | ---: |
| 层叠、显示与包含 | 13 |
| 尺寸、盒模型与逻辑边 | 38 |
| 定位、浮动与对象 | 21 |
| Flex 与通用对齐 | 20 |
| Grid 轨道与放置 | 15 |
| 字体与文字 | 69 |
| 背景、边框与轮廓 | 78 |
| 滤镜、遮罩和裁剪 | 20 |
| 动画与变换 | 46 |
| 滚动、溢出和交互 | 51 |
| 表格、多列、列表与生成内容 | 23 |
| 分页、容器与 SVG | 47 |
| 有限支持、实验和特殊呈现 | 35 |
| **合计** | **476** |

at-rule、描述符、函数、选择器、伪元素与 JavaScript API 不计入 476。属性口径任何增删、改名或重排都必须更新基线、哈希、本矩阵和参考章验收。
