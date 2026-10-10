# 显式轨道、网格线与区域：先推导尺寸，再放置商品

## 任务卡

邻里集市需要把筛选说明与商品结果并排展示，但固定像素列会在窄窗口溢出，平均百分比列又会被长标题撑坏。本课交付一个完整单文件页面：宽屏使用命名区域，窄屏回到单列，并能在 DevTools 中解释每条轨道的最终尺寸。

- **建议时间：**4–5 小时。
- **可见结果：**页面在 320px 下单列、48rem 以上两列，商品长标题不会撑出整页。
- **验收证据：**`index.html`、Grid overlay 截图、Computed 轨道值、一次非法 `minmax()` 的故障记录。

## 1. 任务背景

Grid 容器把直接子盒放进由行轨道和列轨道组成的二维网格。两列有三条列线；项目跨越的是线之间的轨道，不是“占用两个编号”。如果只记住 `display: grid` 而不理解轨道尺寸，常见结果是：

- 固定侧栏和内容列之和大于容器；
- `1fr` 被长内容的自动最小尺寸撑大；
- 两个 `50%` 再加 `gap`，总宽超过 100%；
- 区域图不是矩形，整条声明被忽略；
- 视觉位置改变后，误以为 HTML 语义也随之改变。

本课先让正常流提供可读单列，再在空间足够时建立显式网格。CSS 只改变呈现；商品身份、金额和状态仍来自内容与后续业务层。

## 2. 学习目标

完成后你应能：

- 区分网格容器、网格项、轨道、网格线、单元格与区域；
- 从固定轨道、`gap`、内在尺寸和剩余空间推导 `fr`；
- 解释 `auto`、`min-content`、`max-content`、`fit-content()` 与 `minmax()` 的边界；
- 使用正负线号、命名线和 `grid-area` 放置项目；
- 画出合法矩形 `grid-template-areas`；
- 识别默认自动最小尺寸造成的溢出，并选择 `minmax(0, 1fr)` 或 `min-inline-size: 0`；
- 用 DevTools 证明声明是无效、被覆盖还是计算后仍过宽。

## 3. 预备知识

先完成[盒模型、流与定位](../03-box-sizing-flow-position.md)和[Flexbox](../05-flexbox.md)，并能使用浏览器 Elements、Styles、Computed 与 Grid overlay。

个人练习只需浏览器和任意静态服务器。教程仓库不创建实验工程；文件放在个人目录：

```text
market-learning/practice/css-06-explicit-grid/index.html
```

## 4. 核心理论

### 4.1 轨道尺寸分三步理解

先扣除固定轨道与间隙，再满足内容的最小贡献，最后把可分配空间交给弹性轨道。直观模型是：

```text
容器可用行内尺寸
  - 固定轨道
  - gap
  - 不能再缩的内容贡献
  = 可分配空间
  → 按 fr 比例分配
```

因此 `1fr 2fr` 只描述相关剩余空间的份额，不承诺最终宽度永远严格 1:2。`1fr` 的隐含最小值常近似 `auto`；长 URL 或不可断文本可能把它撑大。`minmax(0, 1fr)` 明确允许轨道缩到 0，再由项目自己的断行与溢出规则处理内容。

### 4.2 内在尺寸不是固定宽度

- `min-content`：在可允许换行处尽量折行后的最小内在需求；
- `max-content`：不主动折行时的理想内在需求；
- `fit-content(20rem)`：在内在下限与指定上限之间约束，不等于固定 `20rem`；
- `auto`：依布局上下文与内容参与计算，不能等同于 `1fr`；
- `minmax(12rem, 1fr)`：下限 12rem、上限弹性；
- `minmax(1fr, 2fr)`：错误，弹性长度不能作为该函数的最小值。

### 4.3 网格线与区域

`grid-column: 1 / 3` 从第一条列线到第三条列线，跨两条轨道。`1 / -1` 到显式网格最后一条线；它不表示未来所有隐式轨道。命名线适合精确边界，命名区域适合表达页面块：

```css
.page {
  grid-template-areas:
    "intro intro"
    "filters results";
}
```

同名区域必须连成矩形，每行格数必须一致。区域名不创造 `main`、`aside` 等语义，HTML 结构仍负责文档意义和阅读顺序。

### 4.4 放置不会改变语义顺序

Grid 项可以视觉上被放到其他区域，但 DOM、键盘和多数辅助技术顺序仍来自 HTML。基础内容顺序应在没有 CSS 时也合理。本课在小屏使用正常流，在宽屏只把已有顺序映射到区域，不用坐标制造倒序。

## 5. 属性、值与观察清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `display` | 建立网格格式化上下文 | `display: grid` | 只让直接子盒成为网格项 |
| `grid-template-columns` | 定义显式列轨道 | `14rem minmax(0, 1fr)` | 内容仍可能在项目内部溢出 |
| `grid-template-rows` | 定义显式行轨道 | `auto 1fr` | 容器高度不确定时 `fr` 行需结合内容理解 |
| `grid-template-areas` | 用矩形区域图命名布局 | `"head head" "side main"` | 非矩形或格数不等会使声明无效 |
| `grid-column` | 设置列起止线 | `1 / -1` | `-1` 针对显式末线 |
| `grid-row` | 设置行起止线 | `span 2` | 可能触发隐式轨道 |
| `grid-area` | 指定区域名或四条线 | `grid-area: results` | 区域名不提供 HTML 语义 |
| `gap` | 设置轨道间距 | `gap: 1rem` | 不给容器外沿增加 padding |
| `minmax()` | 为轨道设置上下限 | `minmax(0, 1fr)` | `fr` 不能作为最小值 |
| `fit-content()` | 限制轨道增长 | `fit-content(18rem)` | 仍受最小内容约束 |
| `min-inline-size` | 允许网格项沿行内轴收缩 | `min-inline-size: 0` | 还需为长内容设计断行 |
| `overflow-wrap` | 允许长词在必要处断行 | `overflow-wrap: anywhere` | 不应全局破坏自然排版 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-06-explicit-grid/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>显式 Grid 轨道实验 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #20382a;
      background: #f5f8f5;
      font: 1rem/1.65 system-ui, sans-serif;
    }
    .page {
      inline-size: min(100% - 2rem, 64rem);
      margin-inline: auto;
      padding-block: 2rem;
    }
    .intro, .filters, .results {
      min-inline-size: 0;
      padding: 1rem;
      border: 1px solid #6c8573;
      background: #fff;
    }
    .intro { grid-area: intro; }
    .filters { grid-area: filters; }
    .results { grid-area: results; }
    .results h2, .listing h3, .listing p { margin-block-start: 0; }
    .listings {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: .75rem;
    }
    .listing {
      min-inline-size: 0;
      padding: 1rem;
      border: 1px solid #adc0b1;
      overflow-wrap: anywhere;
    }
    .price { font-weight: 700; }
    code { overflow-wrap: anywhere; }
    @media (width >= 48rem) {
      .page {
        display: grid;
        grid-template-columns:
          [page-start] fit-content(16rem)
          [content-start] minmax(0, 1fr) [page-end];
        grid-template-areas:
          "intro intro"
          "filters results";
        gap: 1rem;
      }
    }
    @media (width < 32rem) {
      .listings { grid-template-columns: minmax(0, 1fr); }
    }
    :focus-visible {
      outline: 3px solid #155fa0;
      outline-offset: 3px;
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="intro">
      <h1>邻里集市商品目录</h1>
      <p>宽屏把筛选说明和结果放入命名区域；窄屏保持自然阅读顺序。</p>
    </header>
    <aside class="filters" aria-labelledby="filter-heading">
      <h2 id="filter-heading">当前筛选</h2>
      <p>状态：可预约</p>
      <p>本页是静态 CSS 实验，没有发送查询请求。</p>
    </aside>
    <section class="results" aria-labelledby="result-heading">
      <h2 id="result-heading">2 件商品</h2>
      <div class="listings">
        <article class="listing">
          <h3>阅读台灯</h3>
          <p>暖光，灯罩有轻微使用痕迹。</p>
          <p class="price">39.00 元</p>
        </article>
        <article class="listing">
          <h3>适合小户型的木质收纳盒</h3>
          <p>长标识 ABCDEFGHIJKLMNOPQRSTUVWXYZ-2026 用于验证收缩和断行。</p>
          <p class="price">25.00 元</p>
        </article>
      </div>
    </section>
  </main>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-06-explicit-grid
python3 -m http.server 8000
```

打开 `http://localhost:8000/`。结束时按 `Control+C`。

预期结果：

- 小于 48rem 时三块按 DOM 顺序单列；
- 48rem 以上侧栏不超过 16rem，结果列接收剩余空间；
- 小于 32rem 时商品列表从两列变一列；
- 长标识断行，页面没有横向滚动。

打开 Layout 面板启用 Grid overlay；在 Computed 查看 `.page` 的 `grid-template-columns`。失败时先看 Styles 中声明是否被划掉，再看项目的 `min-inline-size` 和长内容断行。

## 7. 邻里集市集成案例

把完整文件作为 V1“装修”阶段的目录骨架：

1. 保留 `header → aside → section` 的 DOM 顺序，禁用 CSS 后仍先读背景、再读筛选和结果；
2. 后续真实筛选表单进入 `.filters`，结果数量与数据仍由业务层更新；
3. `priceCents: 3900` 只在数据层保存，CSS 页面展示 `39.00 元`，不从样式反推价格；
4. 空结果、加载和失败状态应替换 `.listings` 内容，不通过隐藏整个 `results` 假装成功；
5. 收藏与预约不由 Grid 决定；真实操作仍需要项目契约中的身份、授权和并发约束。

渐进扩展顺序：

```text
正常流可读页面
  → 商品内部两列
  → 48rem 页面命名区域
  → 长标题与长标识压力测试
  → Grid overlay 和无 CSS 阅读顺序复验
```

项目边界见[邻里集市契约](../../00-guide/05-project-assessment.md)。

## 8. 常见错误与排查路径

### 明确错误案例：百分比列加间隙

```css
.listings {
  display: grid;
  grid-template-columns: 50% 50%;
  gap: 1rem;
}
```

百分比轨道已经占满内容盒，`gap` 还要额外占空间，容易出现横向滚动。不要用 `overflow-x: hidden` 隐藏。

| 记录项 | 内容 |
| --- | --- |
| 现象 | 页面出现横向滚动条，第二张卡右边被截断 |
| 证据 | Grid overlay 显示两列外还有 1rem gap；`scrollWidth > clientWidth` |
| 原因 | 两列 50% 与 gap 总和超过容器 |
| 修复 | 改成 `repeat(2, minmax(0, 1fr))` |
| 复验 | 320px 与宽屏均无整页横向滚动，长标识仍可见 |

其他路径：

- 声明被划掉：先查语法，例如 `minmax(1fr, 2fr)`；
- 声明生效但仍溢出：查项目自动最小尺寸和不可断内容；
- 区域未出现：检查每行格数和同名区域是否矩形；
- `1 / -1` 没跨预期隐式列：确认你需要的是显式末线还是实际自动轨道；
- 页面顺序不合理：关闭 CSS，先修正 DOM，而不是继续加坐标。

## 9. 课后题

**问题 1：两列为什么有三条列线？**

<details>
<summary>参考答案</summary>

轨道由相邻边界围成。两条轨道需要起点、中间分界和终点三条线。`grid-column: 1 / 3` 因此跨两列。

</details>

**问题 2：`1fr 2fr` 是否总是严格 1:2？**

<details>
<summary>参考答案</summary>

不是。`fr` 分配相关剩余空间，还受固定轨道、间隙、内在最小贡献与其他尺寸约束影响。应在具体内容下查看计算轨道。

</details>

**问题 3：命名区域能否替代 `main` 和 `aside`？**

<details>
<summary>参考答案</summary>

不能。区域名只参与布局。文档语义、地标和阅读顺序仍由 HTML 元素与 DOM 决定。

</details>

## 10. 实践练习

### 基础：画线并跨列

- **文件：**`exercise-lines.html`。
- **操作：**建立三列 `10rem minmax(0, 1fr) 8rem`，让通知条 `grid-column: 1 / -1`。
- **运行：**同目录静态服务器。
- **预期：**通知条跨显式三列，正文列可收缩。
- **失败观察：**Grid overlay 与 Styles。
- **完成标准：**能标出四条列线并解释负线号。

### 进阶：区域重排但不倒序

- **文件：**`exercise-areas.html`。
- **操作：**小屏正常流，宽屏使用 `header/header`、`filters/results`；加入超长商品名。
- **预期：**两种宽度都按合理阅读顺序，长文本不撑宽。
- **失败观察：**禁用 CSS 后的 DOM 顺序和 `scrollWidth`。
- **完成标准：**区域图合法、无横向滚动、地标语义不依赖 CSS。

### 故障注入：非法最小轨道

- **文件：**`exercise-failure.md` 记录，故障在 `exercise-areas.html`。
- **操作：**将结果列改为 `minmax(1fr, 2fr)`。
- **预期：**整条轨道声明无效或回退，Styles 给出无效证据。
- **失败观察：**不要只看截图，保存被划掉的声明和 Computed。
- **完成标准：**恢复 `minmax(0, 1fr)` 后布局与无溢出证据同时恢复。

## 11. 阶段验收

- [ ] 完整文件从个人目录可直接运行；
- [ ] 320px 与 200% 缩放无整页横向滚动；
- [ ] 能在 overlay 中指出显式轨道与网格线；
- [ ] 能解释固定轨道、gap、内容下限和 `fr` 的计算关系；
- [ ] 区域图每行格数一致且同名区域为矩形；
- [ ] 长标题、长标识与空结果不会破坏页面骨架；
- [ ] 禁用 CSS 后内容顺序和地标仍合理；
- [ ] 错误案例含现象、证据、原因、修复和复验；
- [ ] 未把静态目录描述成真实筛选、收藏或预约。

提交路径、启动命令、浏览器版本、三档视口截图、Grid overlay、错误记录和未验证浏览器清单。

## 12. 常见问题

**Grid 会自动变成移动端单列吗？**<br>
不会。轨道规则按你给出的尺寸计算；需要内容驱动的重复或明确断点。

**为什么卡片已设 `width: 100%` 仍溢出？**<br>
轨道或项目的自动最小尺寸可能已超过容器。检查 `minmax(0, 1fr)`、`min-inline-size: 0` 和内容断行。

**可以用绝对定位替代区域吗？**<br>
不适合本例。绝对定位脱离正常流，长内容和缩放更难增长。区域保留轨道参与与自然高度。

**Grid overlay 是跨浏览器一致的产品能力吗？**<br>
它是开发工具证据，界面和功能随浏览器版本不同。页面本身不能依赖 overlay。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [CSS Grid Layout Module Level 2](https://www.w3.org/TR/css-grid-2/)：核对轨道、放置与区域的规范模型。
- [MDN：Grid 基础概念](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout)：带着“线、轨道、区域怎样区分”阅读。
- [MDN：网格模板区域](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Grid_template_areas)：核对矩形和格数规则。
- [MDN：minmax()](https://developer.mozilla.org/en-US/docs/Web/CSS/minmax)：核对允许的最小值与最大值。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对金额、状态与 CSS 阶段边界。

本课使用成熟 Grid 主线；不把 masonry 候选语法纳入可运行验收。Safari、Firefox、旧 WebView 和真实移动设备仍需在目标支持范围内人工复验。

## 我现在能做到什么

我能从内容约束推导显式轨道，使用线和区域放置页面块，并用 DevTools 区分无效语法、自动最小尺寸和真实溢出。下一课会让未显式定位的商品自动进入网格，并比较响应式重复策略。

## 单元导航

- [上一章：Flexbox](../05-flexbox.md)
- [返回第六章入口](../06-grid.md)
- [下一课：自动放置、隐式网格与响应式重复](02-auto-placement-implicit-responsive-repeat.md)
- [返回 CSS 模块](../README.md)
