# 自动放置、隐式网格与响应式重复：让列数跟随内容空间

## 任务卡

邻里集市商品数量会变化，不能为每张卡手写坐标，也不能为每个设备名称维护一套固定列数。本课交付一个可切换 `auto-fit`、`auto-fill` 和 `dense` 的完整页面，用可见编号证明自动放置与业务顺序是两回事。

- **建议时间：**4–5 小时。
- **可见结果：**列数随容器空间变化；一件商品时 `auto-fit` 与 `auto-fill` 的空轨道行为可比较。
- **验收证据：**完整 `index.html`、三种模式截图、隐式行 overlay、`dense` 视觉回填诊断记录。

## 1. 任务背景

没有显式线位置的网格项会进入自动放置算法。算法按 `grid-auto-flow` 扫描可用单元格；若现有显式轨道放不下，就创建隐式轨道。它解决“放到哪里”，不负责：

- 按价格或发布时间排序商品；
- 改变 DOM 与键盘顺序；
- 分页、虚拟列表或数据加载；
- 判断一件商品是否应该跨两列；
- 保证固定最小轨道能塞进最窄手机。

本课先保持 DOM 为唯一业务顺序，再把列数交给 `repeat()` 与 `minmax()`，最后故意启用 `dense` 观察风险。

## 2. 学习目标

完成后你应能：

- 预测 `grid-auto-flow: row` 与 `column` 的扫描方向；
- 解释显式轨道与 `grid-auto-rows`、`grid-auto-columns` 创建的隐式轨道；
- 识别远端线号或跨轨道项目造成的意外隐式网格；
- 使用 `repeat()` 消除重复轨道声明；
- 比较 `auto-fit` 与 `auto-fill` 在空轨道上的差异；
- 使用 `minmax(min(100%, 14rem), 1fr)` 避免最小轨道宽于容器；
- 证明 `dense` 只回填视觉空洞，不是排序；
- 用 DOM 编号、键盘 Tab 顺序和 Grid overlay 审计阅读顺序。

## 3. 预备知识

先完成[显式轨道、网格线与区域](01-explicit-tracks-lines-areas.md)。需要理解 `fr`、`minmax()`、显式末线与 DOM 顺序。

个人练习路径：

```text
market-learning/practice/css-06-auto-grid/index.html
```

只需浏览器和静态服务器；页面中的按钮只改变演示类名，不发送请求。

## 4. 核心理论

### 4.1 自动放置按占用情况扫描

默认 `grid-auto-flow: row` 先沿行内方向寻找空位，放满后进入下一行。`column` 先沿列推进；若没有可用显式行，可能创建隐式行或列。已经显式放置的项目先占据位置，其余项目绕开它们。

```text
读取 DOM 项
  → 处理明确放置项
  → 按 auto-flow 扫描空位
  → 空间不足时创建隐式轨道
```

`grid-auto-rows` 与 `grid-auto-columns` 为这些隐式轨道提供尺寸。未指定时使用 `auto`，由内容参与尺寸计算。

### 4.2 `dense` 回填不改变来源顺序

`grid-auto-flow: row dense` 会回头寻找早先留下的空洞，后面的窄项目可能出现在前面。DOM、焦点和多数朗读顺序不随之改变。商品卡有按钮时，用户看到“第 4 件”在“第 2 件”前，却按 Tab 仍先进入第 2 件，容易迷失。

所以 `dense` 适合无顺序意义、无交互或已充分验证的装饰集合，不适合承担价格排序、推荐优先级或时间顺序。

### 4.3 `repeat()` 负责重复，自动重复负责列数

```css
grid-template-columns: repeat(3, minmax(0, 1fr));
```

固定重复三次。自动重复则先根据容器空间计算可容纳多少条轨道：

```css
repeat(auto-fit, minmax(min(100%, 14rem), 1fr))
```

- `auto-fill` 保留生成后未被占用的空轨道；
- `auto-fit` 折叠空轨道，让已有项目扩展到释放的空间；
- 商品足以填满时，两者可能视觉一致；
- 两者都不会新增、删除或分页 DOM 项。

### 4.4 最小轨道必须允许窄于设计目标

`minmax(14rem, 1fr)` 在容器小于 14rem 时仍要求至少 14rem。外层还有 padding 时，320px 页面可能溢出。`min(100%, 14rem)` 让轨道下限不超过当前可用宽度：

```css
minmax(min(100%, 14rem), 1fr)
```

卡片内部仍需 `min-inline-size: 0` 和断行策略。

## 5. 属性、函数与观察清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `grid-auto-flow` | 设置自动放置方向及回填 | `row`、`column dense` | `dense` 可造成视觉与 DOM 顺序不一致 |
| `grid-auto-rows` | 设置隐式行尺寸 | `minmax(8rem, auto)` | 固定高度可能裁切长内容 |
| `grid-auto-columns` | 设置隐式列尺寸 | `12rem` | 远线号可生成大量隐式列 |
| `repeat()` | 重复轨道片段 | `repeat(3, 1fr)` | 自动重复有嵌套和尺寸语法限制 |
| `auto-fit` | 生成轨道并折叠空轨道 | `repeat(auto-fit, ...)` | 项目填满时可能看不出差别 |
| `auto-fill` | 生成并保留空轨道 | `repeat(auto-fill, ...)` | 空轨道仍占轨道空间 |
| `minmax()` | 设置轨道上下限 | `minmax(12rem, 1fr)` | 固定下限可能比容器宽 |
| `min()` | 选择较小值 | `min(100%, 14rem)` | 百分比参照必须结合上下文 |
| `grid-column` | 显式跨列制造占用 | `span 2` | 会影响后续自动放置 |
| `order` | 视觉排序参与项顺序 | `order: 1` | 不改变 DOM，不用于业务排序 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-06-auto-grid/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>自动放置实验 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #20382a;
      font: 1rem/1.6 system-ui, sans-serif;
    }
    main {
      inline-size: min(100% - 2rem, 68rem);
      margin: 2rem auto;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: .5rem;
      margin-block: 1rem;
    }
    button {
      min-block-size: 2.75rem;
      padding-inline: .8rem;
      font: inherit;
    }
    .catalog {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
      grid-auto-rows: minmax(9rem, auto);
      grid-auto-flow: row;
      gap: 1rem;
      padding: 1rem;
      border: 2px solid #567761;
    }
    .catalog[data-repeat="fill"] {
      grid-template-columns:
        repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
    }
    .catalog[data-dense="true"] { grid-auto-flow: row dense; }
    .listing {
      min-inline-size: 0;
      padding: 1rem;
      border: 1px solid #a6b9aa;
      overflow-wrap: anywhere;
    }
    .listing.featured { grid-column: span 2; }
    .listing h2 { margin-block-start: 0; font-size: 1.2rem; }
    .sequence { font-weight: 700; }
    #report { white-space: pre-wrap; overflow-wrap: anywhere; }
    :focus-visible {
      outline: 3px solid #155fa0;
      outline-offset: 3px;
    }
    @media (width < 32rem) {
      .listing.featured { grid-column: auto; }
    }
  </style>
</head>
<body>
  <main>
    <h1>邻里集市自动放置观察台</h1>
    <p>商品编号就是 DOM 顺序。模式切换只改变轨道，不改变数据排序。</p>
    <div class="controls">
      <button id="repeat" type="button" aria-pressed="false">
        当前 auto-fit，切换 auto-fill
      </button>
      <button id="dense" type="button" aria-pressed="false">
        当前 sparse，切换 dense
      </button>
      <button id="single" type="button" aria-pressed="false">
        只显示第一件
      </button>
    </div>
    <section
      id="catalog"
      class="catalog"
      data-repeat="fit"
      data-dense="false"
      aria-label="商品目录"
    >
      <article class="listing featured" tabindex="0">
        <h2><span class="sequence">1.</span> 阅读台灯</h2>
        <p>精选卡在宽屏跨两列，制造可观察空洞。</p>
      </article>
      <article class="listing" tabindex="0">
        <h2><span class="sequence">2.</span> 收纳盒</h2>
        <p>25.00 元，可预约。</p>
      </article>
      <article class="listing featured" tabindex="0">
        <h2><span class="sequence">3.</span> 折叠桌</h2>
        <p>宽卡再次跨两列。</p>
      </article>
      <article class="listing" tabindex="0">
        <h2><span class="sequence">4.</span> 阅读支架</h2>
        <p>dense 可能把这张后来的窄卡回填到前面。</p>
      </article>
      <article class="listing" tabindex="0">
        <h2><span class="sequence">5.</span> 软木公告板</h2>
        <p>页面仅做静态布局实验。</p>
      </article>
    </section>
    <pre id="report" aria-label="网格放置报告"></pre>
  </main>
  <script>
    const catalog = document.querySelector("#catalog");
    const cards = [...catalog.children];
    const repeatButton = document.querySelector("#repeat");
    const denseButton = document.querySelector("#dense");
    const singleButton = document.querySelector("#single");

    function report() {
      const style = getComputedStyle(catalog);
      document.querySelector("#report").textContent = [
        `repeat: auto-${catalog.dataset.repeat}`,
        `auto-flow: ${style.gridAutoFlow}`,
        `可见商品: ${cards.filter(card => !card.hidden).length}`,
        `计算列轨道: ${style.gridTemplateColumns}`,
        "Tab 顺序仍按 1→2→3→4→5"
      ].join("\n");
    }

    repeatButton.addEventListener("click", () => {
      const fill = catalog.dataset.repeat !== "fill";
      catalog.dataset.repeat = fill ? "fill" : "fit";
      repeatButton.setAttribute("aria-pressed", String(fill));
      repeatButton.textContent = fill
        ? "当前 auto-fill，切换 auto-fit"
        : "当前 auto-fit，切换 auto-fill";
      report();
    });

    denseButton.addEventListener("click", () => {
      const dense = catalog.dataset.dense !== "true";
      catalog.dataset.dense = String(dense);
      denseButton.setAttribute("aria-pressed", String(dense));
      denseButton.textContent = dense
        ? "当前 dense，切换 sparse"
        : "当前 sparse，切换 dense";
      report();
    });

    singleButton.addEventListener("click", () => {
      const single = singleButton.getAttribute("aria-pressed") !== "true";
      cards.slice(1).forEach(card => { card.hidden = single; });
      singleButton.setAttribute("aria-pressed", String(single));
      singleButton.textContent = single ? "恢复全部商品" : "只显示第一件";
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
cd market-learning/practice/css-06-auto-grid
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

观察顺序：

1. 调整窗口，记录计算列轨道数量；
2. 只显示第一件，在宽容器比较 `auto-fit` 与 `auto-fill`；
3. 恢复全部商品，切换 `dense`；
4. 观察可见编号是否仍严格从左到右、从上到下；
5. 连续按 Tab，确认焦点仍按 DOM 的 1→2→3→4→5；
6. 用 Grid overlay 查看自动列和隐式行。

## 7. 邻里集市集成案例

真实目录应先由数据层确定顺序，再让 Grid 布局：

```text
API/内存数组按明确规则排序
  → DOM 按该顺序生成 article
  → CSS 自动决定每行列数
  → 视觉、阅读与键盘顺序保持一致
```

集成要求：

- 价格、发布时间或推荐顺序在数据层排序，不使用 `dense`、`order` 或线号；
- 加载更多商品只追加真实 DOM 项，`auto-fill` 不代表空数据；
- 空列表显示文字恢复路径，不保留一堆空轨道假装有数据；
- 精选卡跨列只是呈现，不改变 `Listing.status` 或权限；
- 宽卡在 32rem 以下取消跨列，防止单条隐式列被撑宽；
- 收藏按钮若后续加入，仍按 DOM 顺序可键盘访问，且状态标明仅内存或等待服务器确认。

## 8. 常见错误与排查路径

### 明确错误案例：用 `dense` 排序

```css
.catalog {
  display: grid;
  grid-auto-flow: row dense;
}
.featured { grid-column: span 2; }
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | 编号 4 可能视觉出现在编号 3 之前留下的空位 |
| 证据 | 页面编号顺序与连续 Tab 焦点顺序不一致 |
| 原因 | `dense` 回头填洞，但 DOM 没有重排 |
| 修复 | 对交互商品使用默认 sparse；业务排序先处理数据/DOM |
| 复验 | 视觉、DOM 编号和 Tab 顺序都为 1→2→3→4→5 |

其他故障：

- 固定 `minmax(20rem, 1fr)` 在 320px 溢出：将下限限制为 `min(100%, 20rem)`；
- 一件商品时 fit/fill 看不出差别：确保容器足够宽并查看 overlay，而不只看卡宽；
- 出现意外横向轨道：检查 `grid-auto-flow: column`、远端线号与 `grid-auto-columns`；
- 隐式行过矮：不要固定高度裁切，使用 `minmax(9rem, auto)`；
- 以为隐藏商品被 Grid 删除：检查 DOM 的 `hidden` 状态，布局不负责数据生命周期。

## 9. 课后题

**问题 1：`auto-fit` 会删除多余商品吗？**

<details>
<summary>参考答案</summary>

不会。它只在自动重复中折叠未被项目占用的空轨道。DOM 项数量、数据和分页不受它管理。

</details>

**问题 2：为什么商品足够多时 fit 与 fill 看起来一样？**

<details>
<summary>参考答案</summary>

因为生成的轨道都被项目占用，没有空轨道可供 `auto-fit` 折叠。减少到一两件并在宽容器查看更容易观察。

</details>

**问题 3：`grid-auto-rows` 会改变显式行吗？**

<details>
<summary>参考答案</summary>

它主要为自动创建的隐式行给出尺寸。`grid-template-rows` 定义的显式行仍按自己的轨道列表计算。

</details>

## 10. 实践练习

### 基础：fit/fill 对照

- **文件：**`exercise-repeat.html`。
- **操作：**并排放两个同宽容器，各只有一张卡，分别使用 fit 与 fill。
- **预期：**宽屏 overlay 显示空轨道处理不同。
- **失败观察：**Computed 的列轨道与容器实际宽度。
- **完成标准：**能解释卡宽差异来自空轨道折叠，不是 DOM 数量。

### 进阶：隐式轨道审计

- **文件：**`exercise-implicit.html`。
- **操作：**建立两条显式列，把一项放到 `grid-column: 4`，设置 `grid-auto-columns: 8rem`。
- **预期：**overlay 显示为到达第 4 列而创建的隐式轨道。
- **失败观察：**横向滚动和远端线号。
- **完成标准：**恢复自动放置后无意外列，记录显式与隐式轨道数。

### 故障注入：dense 顺序

- **文件：**`exercise-dense.md` 和本课完整页面副本。
- **操作：**启用 dense，逐项记录视觉位置和 Tab 位置。
- **预期：**至少制造一次后项视觉回填。
- **失败观察：**若未出现，调整跨列卡与容器列数，不伪造结论。
- **完成标准：**关闭 dense 后三种顺序一致，并保留修复前后证据。

## 11. 阶段验收

- [ ] 能指出哪些轨道显式、哪些轨道隐式；
- [ ] 能预测默认 row 自动放置的下一空位；
- [ ] 一件商品时能观察 fit/fill 差异；
- [ ] 320px 下固定设计下限不会撑出页面；
- [ ] 业务排序在 DOM 前完成，CSS 不承担数据排序；
- [ ] 连续 Tab 与可见编号保持一致；
- [ ] `dense` 故障有截图、焦点证据和修复复验；
- [ ] 页面切换不发送网络请求，也不声称改变商品数据；
- [ ] 已记录浏览器版本和未验证的真实设备。

## 12. 常见问题

**固定三列加媒体查询是否一定错误？**<br>
不一定。列数若来自明确设计约束可以固定；内容变化频繁的卡片目录通常更适合自动重复。选择依据是内容与验收，不是语法新旧。

**`auto-fill` 的空轨道能放占位卡吗？**<br>
空轨道只是布局空间，不是 DOM 内容。占位、加载骨架和空状态必须有真实元素与状态语义。

**能否给每个商品不同 `order` 做推荐排序？**<br>
不应。视觉顺序会脱离 DOM。先按推荐规则排序数据，并保留稳定、可解释的业务排序。

**Grid 自动放置会跨过 `display: none` 项吗？**<br>
不生成盒的项不参与同样的网格放置；但隐藏策略仍需考虑语义、焦点和业务状态，不能只看空位。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [CSS Grid 2：Placement Algorithm](https://www.w3.org/TR/css-grid-2/#placement-algorithm)：核对自动放置的规范步骤。
- [MDN：Grid 自动放置](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Auto-placement_in_grid_layout)：观察显式项与自动项怎样共同占位。
- [MDN：repeat()](https://developer.mozilla.org/en-US/docs/Web/CSS/repeat)：核对固定与自动重复语法。
- [MDN：minmax()](https://developer.mozilla.org/en-US/docs/Web/CSS/minmax)：核对轨道上下限。
- [WCAG：Meaningful Sequence](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html)：理解视觉回填与阅读顺序风险。

`auto-fit`、`auto-fill` 和基础自动放置属于现代 Grid 主线，但具体 DevTools 展示和边缘布局缺陷
仍需在目标浏览器验证。未通过稳定状态门禁的候选布局能力不进入本课。

## 我现在能做到什么

我能让列数随容器空间变化，区分显式与隐式轨道，并用编号、焦点与 overlay 证明自动放置没有替代业务排序。下一课会让嵌套商品卡共享父级行轨道。

## 单元导航

- [上一课：显式轨道、网格线与区域](01-explicit-tracks-lines-areas.md)
- [返回第六章目录](../README.md#第六章grid-与-subgrid)
- [下一课：Subgrid、对齐与回退](03-subgrid-alignment-fallback.md)
- [返回 CSS 模块](../README.md)
