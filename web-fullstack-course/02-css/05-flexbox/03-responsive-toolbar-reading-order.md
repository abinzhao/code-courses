# 响应式工具栏与阅读顺序：重排外观不重排任务

## 任务卡

- **任务**：构建 320px 可用的筛选工具栏与商品操作行，并验证视觉、DOM、Tab 和朗读主流程一致。
- **产出**：`practice/css-05-03/minimal.html` 与 `practice/css-05-03/market.html`。
- **运行**：直接打开，用 Tab 走完整路径，再在 320px/200% 缩放复验。
- **完成证据**：焦点顺序日志、根滚动宽度、长文案状态和错误 order 诊断。
- **边界**：自动化只能读取 DOM/焦点序列，真实屏幕阅读器、触屏和语音控制仍需人工验证。

## 1. 任务背景

桌面设计常把“发布商品”放右侧，把筛选放左侧；移动设计又可能把主按钮挪到顶部。用 `order: -1` 或 `row-reverse` 能快速实现视觉图，却让键盘仍按 DOM 顺序移动，视觉用户会看到焦点跳跃，屏幕阅读器与语音编号也可能不一致。

响应式设计应先确定任务顺序，再让正确 DOM 自然换行。若移动与桌面任务优先级真的不同，应重新审视信息架构，而不是只改视觉序号。

## 2. 学习目标

完成后你能：

1. 设计从窄屏开始、允许内容增长的 Flex 工具栏；
2. 使用 basis、wrap、gap 和 auto margin 实现分组；
3. 解释 `order` 与 reverse 对视觉和 DOM/Tab 的分离；
4. 验证 320px、200% 缩放、长标签、RTL 和键盘路径；
5. 判断何时应换用 Grid、普通流或重构 DOM。

## 3. 预备知识

需要完成前两篇，能解释 line 和自由空间。先写出任务顺序：搜索 → 状态 → 应用 → 清空 → 发布；再决定哪些控件可在同一组内并排。不要用 tabindex 正数“修复” CSS order，它会创建另一套难维护顺序。

目标最小视口 320 CSS px 是本章代表性门槛，不等于覆盖所有设备。文本放大测试应保持浏览器缩放，而不是只缩小 DevTools 视口。

## 4. 核心理论

移动优先 Flex 工具栏可从单列/换行开始：

```css
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: .75rem;
}
.search { flex: 1 1 16rem; min-inline-size: 0; }
.actions { display: flex; flex: 1 1 auto; flex-wrap: wrap; }
```

`flex-basis` 表达首选尺寸，wrap 处理不足空间，min-inline-size 0 允许输入组缩小。控件仍需自身 `max-inline-size: 100%` 与内容换行。

Auto margin 会在对应轴吸收正自由空间：

```css
.publish { margin-inline-start: auto; }
```

在多行容器中，它只影响所在 flex line。换行后结果可能不是设计者想象的“全局靠右”；应在各宽度观察，不把 auto margin 当 Grid 列。

`order` 默认为 0，只改变 Flex/Grid 视觉排序。规范明确源顺序不能仅为非视觉媒体依赖 order 修复；Tab 顺序通常仍遵循 DOM 与 tabindex。`row-reverse` 也产生同样风险。正确策略：

1. DOM 按语义与任务顺序；
2. 用 wrap/basis 改变每行数量；
3. 分组容器保持组内顺序；
4. 若两个视图要求完全不同任务流，评估是否需要不同但不重复交互的结构，避免同一控件复制两份。

按钮与输入必须允许文案增长。不要固定 width/height 裁切；使用 min-block-size 与 padding。Zoom 200% 后 CSS 视口变窄，Flex 应重新换行，不应覆盖内容。

一维工具栏适合 Flex；若要求跨多行严格共享“标签列/控件列”或卡片二维轨道，Grid 更合适。选择布局系统不是能力高低，而是约束维度。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 风险/边界 |
| --- | --- | --- |
| `flex-wrap` | 空间不足时创建新 line | 行间不共享列宽 |
| `flex-basis` | 表达首选主尺寸 | 仍受内容 min-size |
| `margin-inline-start: auto` | 吸收当前 line 正自由空间 | 多行时不是全局对齐 |
| `order` | 改变视觉排序 | 不改 DOM/默认 Tab，谨慎避免 |
| `row-reverse` | 反转视觉主轴 | 方向与焦点顺序可能分离 |
| `min-block-size` | 提供控件最低块尺寸 | 内容增长仍应撑开 |
| `tabindex` | 参与焦点顺序 | 禁止用正数重建顺序 |
| `:focus-visible` | 显示键盘焦点 | 不能被 overflow 裁掉 |
| `document.activeElement` | 读取当前焦点 | 自动日志不代表屏幕阅读器体验 |
| `scrollWidth/clientWidth` | 检查页面横滚 | 还要检查内容裁切 |

## 6. 最小可运行案例

创建 `practice/css-05-03/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>工具栏顺序观察台</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 2rem; font: 1rem/1.6 system-ui, sans-serif; }
    .toolbar { display: flex; flex-wrap: wrap; gap: .75rem; max-inline-size: 32rem; padding: .75rem; border: 2px solid #718078; }
    label { display: flex; flex: 1 1 14rem; flex-direction: column; gap: .25rem; min-inline-size: 0; }
    input, button { min-block-size: 2.75rem; max-inline-size: 100%; font: inherit; }
    input { inline-size: 100%; }
    button { flex: 1 1 7rem; padding-inline: .75rem; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
    output { display: block; margin-block-start: 1rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>工具栏顺序观察台</h1>
    <form class="toolbar" action="#" onsubmit="return false">
      <label>搜索<input id="search" name="query"></label>
      <button id="apply" type="submit">应用</button>
      <button id="clear" type="reset">清空</button>
    </form>
    <output id="report">请按 Tab，顺序应为搜索、应用、清空。</output>
  </main>
  <script>
    const ids = [];
    const output = document.querySelector("#report");
    document.querySelector(".toolbar").addEventListener("focusin", (event) => {
      ids.push(event.target.id);
      output.textContent = `已观察焦点顺序：${ids.join(" → ")}`;
    });
  </script>
</body>
</html>
```

无论按钮是否换行，焦点按 DOM 的搜索、应用、清空移动。缩窄视口后，项目通过 basis 与 wrap 重排到新行，不改变 order。完整测试应从地址栏或页面前一个焦点点开始，而不是只用脚本调用 focus。

逐步扩展：

1. 将文案改成更长的“应用所有筛选条件”，确认按钮增高/换行；
2. 临时给 apply `order: -1`，观察视觉第一但 Tab 仍在搜索之后；
3. 撤销 order，恢复一致顺序；
4. 设置 `dir="rtl"`，确认逻辑间距与内容方向适配，任务顺序仍按 DOM。

## 7. 邻里集市集成案例

创建 `practice/css-05-03/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市响应式工具栏</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font: 1rem/1.65 system-ui, sans-serif; color: #26352d; }
    .market { inline-size: min(64rem, 100% - 2rem); margin: 2rem auto; }
    .toolbar, .toolbar-group, .card-actions { display: flex; flex-wrap: wrap; gap: .75rem; }
    .toolbar { align-items: end; padding: 1rem; border: 1px solid #78877e; background: #eef5f0; }
    .search { display: flex; flex: 1 1 18rem; flex-direction: column; gap: .25rem; min-inline-size: 0; }
    .toolbar-group { flex: 1 1 auto; align-items: end; }
    input, select, button { min-block-size: 2.75rem; max-inline-size: 100%; font: inherit; }
    input { inline-size: 100%; min-inline-size: 0; }
    button, select { padding-inline: .75rem; }
    .publish { margin-inline-start: auto; }
    .cards { display: flex; flex-wrap: wrap; gap: 1rem; padding: 0; list-style: none; }
    .listing { display: flex; flex: 1 1 18rem; flex-direction: column; min-inline-size: 0; padding: 1rem; border: 1px solid #78877e; border-radius: .5rem; }
    .listing h2 { margin-block-start: 0; overflow-wrap: anywhere; }
    .price { color: #185c3b; font-weight: 700; }
    .card-actions { margin-block-start: auto; padding-block-start: 1rem; }
    .card-actions button { flex: 1 1 8rem; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
    output { display: block; margin-block-start: 1rem; }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p>静态演示：筛选、收藏、预约和发布都不写入数据。</p>
    <form class="toolbar" action="#" onsubmit="return false">
      <label class="search">搜索商品
        <input id="query" name="query" value="书架">
      </label>
      <div class="toolbar-group">
        <label>状态
          <select id="status" name="status"><option>全部</option><option>可预约</option></select>
        </label>
        <button id="apply" type="submit">应用筛选</button>
        <button id="clear" type="reset">清空</button>
        <button id="publish" class="publish" type="button">发布商品</button>
      </div>
    </form>
    <ul class="cards">
      <li class="listing">
        <h2>窄边四层书架</h2>
        <p>适合小空间，长描述会让卡片自然增高。</p>
        <p class="price" data-price-cents="9600">96.00 元</p>
        <div class="card-actions">
          <button type="button">模拟收藏</button>
          <button type="button">查看说明</button>
        </div>
      </li>
      <li class="listing">
        <h2>Neighborhood-Market-Extra-Long-Product-Name</h2>
        <p>用于验证英文长名称和按钮换行。</p>
        <p class="price" data-price-cents="4500">45.00 元</p>
        <div class="card-actions"><button type="button">查看说明</button></div>
      </li>
    </ul>
    <output id="evidence" aria-live="polite"></output>
  </main>
  <script>
    const output = document.querySelector("#evidence");
    const focusOrder = [];
    document.querySelector("main").addEventListener("focusin", (event) => {
      const name = event.target.textContent.trim() || event.target.id;
      focusOrder.push(name);
      output.textContent =
        `页面横向溢出：${document.documentElement.scrollWidth > document.documentElement.clientWidth ? "是" : "否"}；` +
        `最近焦点：${focusOrder.slice(-5).join(" → ")}`;
    });
  </script>
</body>
</html>
```

DOM 先工具栏任务，再商品列表；工具栏内部是搜索、状态、应用、清空、发布。auto margin 只在 publish 所在线且有正空间时推开它，窄屏换行后仍保持 DOM 顺序。卡片使用 column Flex，`margin-block-start: auto` 把操作推向卡片末端，但不固定卡片高度。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
@media (max-width: 30rem) {
  .publish { order: -1; }
  .toolbar { flex-direction: row-reverse; }
}
```

发布按钮视觉上先出现，DOM 与 Tab 却仍在后面；row-reverse 又反转一层，视觉序号更难预测。

排查路径：

1. 列出 DOM 中可聚焦元素顺序；
2. 截图标注视觉顺序；
3. 实际按 Tab 记录 activeElement；
4. 检查 order、reverse 和正 tabindex；
5. 删除视觉重排，改用正确 DOM、分组与换行；
6. 在窄屏、放大、RTL 下复验，并纳入真实语音控制与屏幕阅读器测试。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 移动端发布按钮视觉在最上方，按 Tab 却最后才到达 |
| 证据 | CSS 为 publish 设置 order -1；DOM 中它位于筛选按钮之后 |
| 原因 | order 只改视觉排列，不改 DOM 和默认焦点顺序 |
| 修复 | 以真实任务顺序重审 DOM；本例保留发布在筛选之后并允许自然换行 |
| 复验 | 320px 视觉主流程与 Tab 一致，无正 tabindex、reverse 或 order |

## 9. 课后题

1. `order` 会改变屏幕阅读器读取 DOM 的顺序吗？
2. 为什么不能用正 tabindex 配合视觉 order？
3. auto margin 在多行 Flex 中是全容器对齐吗？
4. 200% 缩放为何也是响应式测试？
5. 卡片跨行需要共享列宽时应继续用 Flex 吗？

答案：

1. 通常不会，读取与焦点主要基于 DOM；这正是风险。
2. 它建立第三套人工焦点顺序，DOM 变化后很容易失效，并造成维护和辅助技术问题。
3. 不是，只吸收所在 flex line 对应轴的正自由空间。
4. 放大通常减少 CSS 视口可用空间并增大内容需求，会触发布局换行。
5. 应评估 Grid；Flex 每条 line 独立，不共享二维轨道。

## 10. 实践练习

**基础**：用 Tab 记录集成页所有控件顺序，与 DOM 对账。
验收：没有跳跃、隐藏焦点或正 tabindex。

**进阶**：把工具栏切换 `dir="rtl"`，仅使用逻辑属性修复间距。
验收：任务顺序仍由 DOM 表达，控件标签与焦点完整。

**故障注入**：给发布 order -1、toolbar row-reverse。
验收：记录视觉/焦点分离；撤销后用 wrap/basis/分组实现 320px 布局。

## 11. 阶段验收

- [ ] 320px 与 200% 缩放下根无横向滚动。
- [ ] 长中英文标题和按钮文案不被固定高度裁切。
- [ ] 视觉、DOM 与 Tab 主流程一致。
- [ ] 无 order、reverse 和正 tabindex 参与任务重排。
- [ ] auto margin 与每条 line 的作用能够解释。
- [ ] 真实屏幕阅读器、触屏、语音控制与 Safari/Firefox 缺口已记录。

## 12. 常见问题

**移动端主按钮必须最先显示怎么办？**
先确认它是否也应在语义与任务上最先。若是，调整 DOM 并让桌面布局也围绕正确顺序设计；不要只做视觉提前。

**可以复制一套桌面按钮和一套移动按钮吗？**
通常不应，重复可聚焦控件会造成状态、ID 和辅助技术问题。优先一个 DOM 与响应布局。

**卡片等高一定要固定高度吗？**
不需要。容器可 stretch 项目，卡片内部 column Flex 用 auto margin 对齐操作；内容仍可让整行高度增长。

**自动化 focus 日志足够吗？**
不够。它证明 DOM 焦点序列，真实屏幕阅读器、语音控制和视觉焦点仍需人工验证。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Flexbox：Ordering and Orientation](https://www.w3.org/TR/css-flexbox-1/#flow-order)
- [CSS Display：Order-modified document order](https://www.w3.org/TR/css-display-3/#order-modified-document-order)
- [MDN：Ordering flex items](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Ordering_flex_items)
- [WAI：Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
- [WAI：Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

兼容边界：基础 Flex 响应布局稳定；阅读顺序相关的新 CSS 能力不应在未建立目标辅助技术支持前作为基础。Safari、Firefox、VoiceOver、NVDA、语音控制与真实移动设备未实测。

## 我现在能做到什么

我能用 wrap、basis、gap 和分组构建窄屏工具栏，在不改变 DOM/焦点顺序的前提下响应内容，并知道何时改用 Grid 或重构任务流。

## 单元导航

- 上一单元：[增长、收缩、基准与自动最小尺寸](./02-grow-shrink-basis-auto-minimum.md)
- 下一单元：[06 Grid 与 Subgrid 章入口](../06-grid.md)
