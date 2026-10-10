# 03 盒模型、常规流与定位：从几何约束解释布局

## 本章任务

为邻里集市建立不会因长文本、窄容器和浮层而失控的基础布局。你要能从盒模型、格式化上下文、包含块和堆叠上下文定位故障，而不是依赖固定高度、负边距或无限增大的 `z-index`。

## 产出与前置

- 产出：3 个布局观察台、3 个邻里集市完整页面、盒尺寸推导、常规流证据和堆叠树记录。
- 前置：完成值阶段与百分比参照，能用 DevTools Layout/Computed 面板读取盒尺寸。
- 边界：本章只使用原生文档流、float 与定位；Flexbox 和 Grid 分别在第 5、6 章系统展开。

## 学习路线

1. [盒模型、内在尺寸与溢出](./03-box-sizing-flow-position/01-box-model-intrinsic-sizing-overflow.md)
   推导 content/padding/border/margin，观察 min-content、替换元素和滚动容器。建议 120 分钟。
2. [常规流、格式化上下文与外边距](./03-box-sizing-flow-position/02-normal-flow-formatting-contexts-margins.md)
   分析块/行内格式化、margin collapse、float 和 BFC，不破坏阅读顺序。建议 120 分钟。
3. [包含块、定位与堆叠上下文](./03-box-sizing-flow-position/03-containing-block-position-stacking.md)
   找到 absolute/fixed/sticky 的参照，建立堆叠上下文树并区分 top layer。建议 150 分钟。

必须按顺序学习：盒尺寸决定流中占位，格式化上下文决定盒如何排列，定位与堆叠在此基础上改变参照或绘制顺序。

## 邻里集市综合任务

完成商品卡、筛选栏和帮助浮层：

- 全局 `border-box` 后仍能推导 content 与 border box；
- 长商品名、长 URL、替换媒体和 320px 容器不造成页面级横向滚动；
- 浮动缩略图被组件自己的格式化上下文包住，外边距行为有证据；
- sticky 筛选栏有明确滚动容器和 inset；
- 商品角标相对卡片定位，不遮挡标题；
- 浮层优先使用原生 top layer 能力，不以超大 z-index 模仿。

## 综合验收

- [ ] 能用公式与 DevTools 对账 content、padding、border、margin 四层尺寸。
- [ ] 能区分内容溢出、滚动容器、裁剪和页面级横向滚动。
- [ ] 能解释 margin collapse 是否发生以及 BFC 为何改变结果。
- [ ] 能为每个定位元素指出实际包含块和原流占位。
- [ ] 能画出相关堆叠上下文，解释子元素为何无法逃出父上下文。
- [ ] 320px、200% 缩放、长文本和键盘路径均有复验证据。

## 章节导航

- 上一章：[02 值、颜色与单位](./02-values-colors-units.md)
- 下一章：[04 字体、文本与视觉装饰](./04-typography-decoration.md)
