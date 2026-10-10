# 05 Flexbox：在一维空间中分配、换行与对齐

## 本章任务

为邻里集市构建可换行操作栏和商品卡行。你要能从主轴、flex base size、自由空间与自动最小尺寸推导结果，并保证窄屏视觉重排不改变 DOM、阅读和焦点顺序。

## 产出与前置

- 产出：3 个 Flex 算法观察台、3 个邻里集市完整页面、正/负自由空间算式和 320px 验收记录。
- 前置：掌握内在尺寸、溢出、常规流、逻辑轴和可见焦点。
- 边界：Flexbox 负责一维行或列；需要同时控制行列轨道时使用第 6 章 Grid，不把 Flex 强行模拟二维表格。

## 学习路线

1. [轴、换行与对齐](./05-flexbox/01-axes-wrapping-alignment.md)
   区分主轴/交叉轴、direction、wrap、gap 与每行对齐。建议 120 分钟。
2. [增长、收缩、基准与自动最小尺寸](./05-flexbox/02-grow-shrink-basis-auto-minimum.md)
   推导 flex base size、正负自由空间、冻结循环和长内容溢出。建议 150 分钟。
3. [响应式工具栏与阅读顺序](./05-flexbox/03-responsive-toolbar-reading-order.md)
   在 320px 构建可换行筛选/操作区，验证 DOM、Tab、朗读与视觉顺序。建议 120 分钟。

第二篇依赖第一篇的轴与行概念；第三篇必须用前两篇的算法解释，不以“调到不溢出”为验收。

## 邻里集市综合任务

- 筛选栏与操作按钮允许换行，gap 负责同组间距；
- 文本输入、标题和按钮在 320px 下不因自动最小尺寸造成页面横滚；
- 能计算两个商品卡在给定容器中的 grow/shrink 分配；
- `flex-basis: auto/0/content` 的选择有业务理由；
- 不用 `order`、`row-reverse` 改变任务流程，不把视觉顺序与 DOM/Tab 顺序分离；
- 200% 缩放、长中文/英文标签和键盘操作均可用。

## 综合验收

- [ ] 能为每个容器指出主轴、交叉轴、方向和换行后每条 flex line。
- [ ] 能区分 justify-content、align-items、align-content 与 align-self。
- [ ] 正/负自由空间分配有逐项算式，并说明 min/max 冻结边界。
- [ ] 能复现并修复 `min-inline-size: auto` 导致的长内容溢出。
- [ ] 320px 和 200% 缩放下页面无横向滚动，按钮可见且可聚焦。
- [ ] DOM、视觉主流程和 Tab 顺序一致，没有用 order 掩盖结构问题。

## 章节导航

- 上一章：[04 字体、文本与视觉装饰](./04-typography-decoration.md)
- 下一章：[06 Grid 与 Subgrid](./06-grid.md)
