# 第六章：Grid 与 Subgrid

> 用二维轨道组织邻里集市商品目录，并在不改变语义顺序的前提下共享卡片内部行。

## 本章任务

为邻里集市制作一个可从单列扩展到多列的商品目录。先画显式轨道和命名区域，再观察自动放置与隐式轨道，最后用 Subgrid 对齐卡片标题、描述和操作区，同时保留普通 Grid 回退。

## 学习成果

完成本章后，你能够：

- 根据内容约束推导 `fr`、内在尺寸和 `minmax()` 的实际轨道；
- 用网格线与命名区域表达页面结构，并识别轨道溢出；
- 预测自动放置、隐式轨道、`auto-fit` 与 `auto-fill` 的结果；
- 解释 `dense` 为什么不能承担商品排序；
- 用 Subgrid 共享父轨道，并为不支持环境保留普通 Grid；
- 用 Grid overlay、Computed 与 320px 视口留下复验证据。

## 详细教程

| 顺序 | 教程 | 核心问题 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [显式轨道、网格线与区域](06-grid/01-explicit-tracks-lines-areas.md) | 轨道尺寸怎样由固定值、内容和剩余空间共同决定 | 4–5 小时 |
| 2 | [自动放置、隐式网格与响应式重复](06-grid/02-auto-placement-implicit-responsive-repeat.md) | 未定位项目怎样进入网格，列数怎样随空间变化 | 4–5 小时 |
| 3 | [Subgrid、对齐与回退](06-grid/03-subgrid-alignment-fallback.md) | 嵌套卡片怎样共享行且不破坏阅读顺序 | 4–5 小时 |

预计总学习时间：12–15 小时。

## 知识依赖

```text
盒模型与内在尺寸
  → 显式列/行与网格线
  → 自动放置与隐式轨道
  → repeat()/minmax()/auto-fit/auto-fill
  → Subgrid 共享父轨道
  → 普通 Grid 回退与语义顺序审计
```

前置：[盒模型、流与定位](03-box-sizing-flow-position.md)、[Flexbox](05-flexbox.md)。Grid 是二维布局工具，不替代 HTML 语义，也不替代适合一维分配的 Flex。

## 章级综合任务

在个人学习目录创建 `practice/css-06-market/index.html`，组合三课成果：

1. 页面外层用命名区域组织标题、筛选说明和商品目录；
2. 商品目录用 `repeat(auto-fit, minmax(min(100%, 15rem), 1fr))`；
3. 至少四件商品，标题和描述长度明显不同；
4. 支持 Subgrid 时，卡片跨三条父行并共享标题、描述、操作行；
5. 不支持 Subgrid 时，每张卡仍用 `auto 1fr auto`，内容与按钮全部可用；
6. DOM 中的商品顺序与键盘顺序保持业务顺序，不用 `dense` 或大行号重排；
7. 价格仍以整数分作为数据边界，页面只显示格式化金额；
8. 收藏按钮只改变当前页内存状态，不声称已持久化。

## 综合故障演练

依次制造并恢复：

- 两列各 `50%` 后再加 `gap`，记录整页横向溢出；
- `minmax(1fr, 2fr)` 导致声明无效，记录 Styles 面板证据；
- `grid-auto-flow: dense` 让后项视觉回填，比较 DOM 与视觉顺序；
- 只写 `grid-template-rows: subgrid` 却不跨父行，记录共享失败；
- 关闭 `@supports` 增强，确认普通 Grid 仍可阅读和操作。

每次记录“现象、证据、原因、修复、复验”，不要通过 `overflow-x: hidden` 遮住根因。

## 本章验收

- [ ] 320px、768px、1280px 下没有整页横向滚动；
- [ ] 能用 Grid overlay 指出轨道、网格线、区域和隐式轨道；
- [ ] 能解释 `1fr` 为什么不是容器总宽度的固定百分比；
- [ ] 能通过一两件商品演示 `auto-fit` 与 `auto-fill` 的差别；
- [ ] 商品视觉顺序、DOM 顺序和键盘顺序一致；
- [ ] Subgrid 支持路径中同组卡片操作行对齐；
- [ ] 关闭 Subgrid 后内容、价格和按钮仍完整；
- [ ] Console 无未解释错误，收藏状态明确标为仅内存；
- [ ] 已保存正常截图、故障证据、修复后截图和未验证浏览器范围。

## 进入下一章前

如果你仍靠固定列数覆盖所有宽度、用 `dense` 模拟业务排序，或无法说明 Subgrid 共享的是哪一段父轨道，应先重做对应实验。下一章会把布局判断从页面视口扩展到组件容器和用户偏好。

[上一章：Flexbox](05-flexbox.md) · [开始第一课](06-grid/01-explicit-tracks-lines-areas.md) · [下一章：响应式与容器查询](07-responsive-container.md) · [返回 CSS 模块](README.md)
