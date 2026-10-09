# 12-Flexbox 与 Grid 布局

## 目标

完成本知识单元后，学员应能够把页面布局当作“沿轴排列项目”与“在网格中放置项目”两类问题来处理，拿到设计稿后先判断维度再选择工具，而不是用定位和浮动硬凑。学员应能够：

1. 把给定布局需求分解为一维排列或二维网格，说明判断依据，并能在同一页面中让两种技术各司其职。
2. 配置 Flex 容器的方向、换行与两条轴上的对齐方式，准确预测每个项目在主轴与交叉轴上的位置。
3. 使用 `flex-grow`、`flex-shrink`、`flex-basis` 及 `flex` 简写控制项目伸缩与尺寸，用 `gap` 和 margin 处理间距，避免外边距折叠带来的困扰。
4. 使用 `grid-template-columns`、`grid-template-rows`、`fr`、`repeat()`、`minmax()` 定义有弹性的轨道，并解释轨道尺寸的计算过程。
5. 通过线号、`span`、命名区域与 `grid-template-areas` 把项目放到指定单元格，使用对齐属性调整网格整体与项目个体的位置。
6. 独立实现导航栏、卡片墙、完全居中、经典分栏（含响应式变化）四类典型布局，并能识别和修复 Flex/Grid 的常见缺陷。

## 技术栈

本单元只使用原生 CSS 布局模块与浏览器开发者工具，不使用任何 UI 框架、CSS 框架或 npm 包。

| 工具或环境 | 用途 | 当前稳定版基线 |
|---|---|---|
| Flexbox | 一维弹性布局 | CSS Flexible Box Module Level 1（现行稳定，当前稳定版浏览器全面支持） |
| Grid | 二维网格布局 | CSS Grid Layout Module Level 1（现行稳定）；Level 2 的 subgrid 以当前稳定版支持为准 |
| Google Chrome / Edge | 布局预览与 Grid/Flex 调试器 | 当前稳定版 |
| Mozilla Firefox | 网格线可视化与跨核布局 | 当前稳定版 |
| Apple Safari | 核对 WebKit 与 subgrid 行为 | 当前稳定版 |
| VS Code | 编写 CSS | 当前稳定版 |
| 开发者工具 Layout 面板 | 可视化 flex 线、grid 轨道与区域 | 随浏览器当前稳定版发布 |
| Can I use | 查询特性支持范围 | 当前在线数据 |
| MDN Web Docs | 属性与取值查证 | 当前在线文档 |

学习要求与约定：

- 间距统一使用 `gap`（Flex 与 Grid 均支持）为主、margin 为辅，不再用 margin 折叠处理布局间隔。
- 布局容器使用语义标签：导航 `nav`、卡片 `article`、分栏用 `main`、`aside` 等，display 只改变布局不改变语义。
- 响应式以“让内容在窄屏自然重排”为底线，复杂断点体系在后续单元展开。
- 使用 subgrid、容器查询等新特性前先查 Can I use 上当前稳定版支持情况，必要时提供回退。
- 所有尺寸推导以开发者工具的网格高亮与 Computed 值为验证依据。

开始前检查环境：

```bash
mkdir -p layout-lab/styles && cd layout-lab
touch index.html styles/layout.css
```

预期观察：

- 开发者工具 Elements 面板中，`display: grid` 元素旁会出现 grid 标记，点击后页面上可见轨道线与尺寸标注。

## 详细的理论知识讲解和示例伪代码

### 1. 一维与二维：选择布局工具的心智模型

#### 1.1 定义

- Flexbox 是一维布局系统：项目沿一条主轴排列，需要时换行形成多条“独立计算”的线，每行各自分配空间。它解决的是“一排（或一列）东西怎么排、怎么对齐、怎么伸缩”。
- Grid 是二维布局系统：同时定义行与列，项目被放到行列交叉形成的区域中，横向与纵向的对齐由同一套网格统一控制。

判断问题维度的方法：

```text
内容是“一串项目沿单方向排列”，每行长度可以不同？
  → Flexbox
内容需要“同时按列对齐、按行对齐”，存在明确的横向轨道关系？
  → Grid
两者皆有（页面整体是网格，网格某格内部又是一排）？
  → 外层 Grid + 内层 Flex，嵌套使用
```

#### 1.2 与 Web 的关系

组件内部排列（导航项、按钮组、卡片内媒体与文字）绝大多数是一维问题，Flexbox 是首选；页面级骨架（头、侧栏、正文、尾）与卡片墙这类纵横都要对齐的结构是二维问题，Grid 更直接。Flex 与 Grid 取代了早年的 float 拼布局、table 布局，代码更少、语义更干净、响应式调整更容易。

#### 1.3 同一个页面两种工具

```html
<body class="page">
  <header class="page__header">
    <p>站点名</p>
    <nav class="main-nav">
      <a href="/">首页</a>
      <a href="/docs">文档</a>
      <a href="/blog">博客</a>
    </nav>
  </header>

  <main class="page__body">
    <section class="card-grid">
      <article class="card">
        <h2>卡片一</h2>
        <p>说明文字</p>
      </article>
      <article class="card">
        <h2>卡片二</h2>
        <p>说明文字</p>
      </article>
    </section>
  </main>
</body>
```

```css
/* 导航内部：一排项目 → Flex */
.main-nav {
  display: flex;
  gap: 16px;
}

/* 卡片集合：纵横对齐 → Grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}
```

#### 1.4 常见误区

> Flexbox 换行后就变成二维布局，可以当 Grid 用。

换行后的每条 flex 线独立计算尺寸与对齐，行间列位置没有严格对应关系；需要列对齐时应使用 Grid。

> 学了 Grid 就不该再用 Flexbox。

二者维度不同而非新旧替代。组件内部一维排列用 Flex 更简单，页面二维结构用 Grid 更清晰，现代页面几乎都同时使用。

### 2. Flex 容器、方向与换行

#### 2.1 定义

在元素上设置 `display: flex` 后，它成为 flex 容器（flex container），直接子元素成为 flex 项目（flex item）。关键容器属性：

- `flex-direction`：主轴方向。
  - `row`（默认）：主轴水平，从左到右；
  - `row-reverse`：水平反向；
  - `column`：主轴垂直，从上到下；
  - `column-reverse`：垂直反向。
- `flex-wrap`：是否换行。
  - `nowrap`（默认）：所有项目挤在一条线；
  - `wrap`：空间不足时换行；
  - `wrap-reverse`：反向换行。

两条轴随方向变化：主轴（main axis）是项目排列方向，交叉轴（cross axis）与其垂直。方向为 row 时主轴水平；方向为 column 时主轴垂直。

#### 2.2 与 Web 的关系

理解“轴随方向变化”是后续对齐属性不混淆的前提：`justify-content` 永远作用于主轴，`align-items` 永远作用于交叉轴。许多人把容器改成 `flex-direction: column` 后奇怪“为什么 justify-content 不再水平居中”——因为主轴变成了垂直方向。

#### 2.3 示例

```html
<ul class="toolbar">
  <li><button type="button">加粗</button></li>
  <li><button type="button">斜体</button></li>
  <li><button type="button">下划线</button></li>
  <li><button type="button">引用</button></li>
</ul>
```

```css
.toolbar {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 8px;
  list-style: none;
  border: 1px solid #ddd;
}
```

垂直堆叠的设置面板：

```css
.settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

#### 2.4 flex-wrap 与收缩

- `nowrap` 时项目即使总宽超过容器也不会自动换行，而是按 flex-shrink 规则被压缩（默认可以收缩），内容可能溢出。
- `wrap` 后每条线独立：第一行排不下的项目整体进入下一行，行高由该行最高项目决定。
- 需要换行时通常同时设置 `gap`，gap 对行列间距同时生效且不会产生“最后一项多出右边距”的问题。

#### 2.5 常见误区

> 设了 flex 容器，项目就不会溢出了。

默认 nowrap + 可收缩，遇到不能再缩的内容（长单词、固定宽元素）仍会溢出。要换行必须显式 `flex-wrap: wrap`。

> reverse 方向只是视觉效果，对可访问性没有影响。

`row-reverse`、`column-reverse` 只改变视觉排列，DOM 与读屏顺序不变，可能造成朗读顺序与视觉顺序不一致，应谨慎用于关键内容。

### 3. Flex 对齐：主轴、交叉轴与多行

#### 3.1 定义

四个对齐属性：

| 属性 | 作用轴 | 控制对象 | 常用值 |
|---|---|---|---|
| `justify-content` | 主轴 | 所有项目作为一组如何分布 | `flex-start`、`flex-end`、`center`、`space-between`、`space-around`、`space-evenly` |
| `align-items` | 交叉轴 | 每行内项目如何对齐（容器级） | `stretch`（默认）、`flex-start`、`flex-end`、`center`、`baseline` |
| `align-content` | 交叉轴 | 多条线（多行）作为整体如何分布 | 同 justify-content 的取值，仅多行时生效 |
| `align-self` | 交叉轴 | 单个项目覆盖容器的 align-items | 同 align-items |

`gap`（及 `row-gap`、`column-gap`）设置项目之间的固定间距，但不在容器边缘增加空隙。

#### 3.2 与 Web 的关系

导航栏常见结构“品牌靠左、菜单靠右”、按钮组居中、卡片内底部对齐，都由这些属性直接完成，不需要计算 margin。`margin: auto` 在 flex 项目上还会吸收全部剩余空间，可用于把某一项推到末端。

#### 3.3 示例

导航两端分布：

```css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
}
```

整组居中且项目等高拉伸改为顶端对齐：

```css
.feature-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-start;
  gap: 16px;
}
```

多行之间均匀分布：

```css
.wrap-row {
  display: flex;
  flex-wrap: wrap;
  align-content: space-between;
  gap: 12px;
  min-height: 300px;
}
```

单个项目特殊对齐：

```css
.feature-row .card--tall {
  align-self: stretch;
}
```

用 auto margin 分离项目：

```html
<div class="breadcrumb-bar">
  <a href="/">首页</a>
  <a href="/docs">文档</a>
  <button type="button" class="breadcrumb-bar__action">操作</button>
</div>
```

```css
.breadcrumb-bar {
  display: flex;
  gap: 12px;
}

.breadcrumb-bar__action {
  margin-left: auto;
}
```

#### 3.4 各 space 值的区别

```text
space-between   首项贴起点、末项贴终点，项目之间等距
space-around    每项两侧各分一份等距，首尾与容器边有半份间距
space-evenly    任意两个“空隙”完全相等，包括首尾
```

#### 3.5 常见误区

> align-content 在单行 flex 容器里也能控制项目对齐。

它控制的是“多条线”的分布，单行容器中不产生效果；单行内交叉轴对齐要用 align-items。

> 想让项目填满容器高度，align-items 必须写 stretch 才有效。

stretch 本是默认值，但项目若设置了固定 height 或交叉轴方向尺寸，拉伸会被该尺寸覆盖。

### 4. Flex 项目的伸缩：grow、shrink、basis 与 order

#### 4.1 定义

三个属性共同决定项目在主轴上占用的尺寸：

- `flex-basis`：分配剩余空间前的初始尺寸，默认 `auto`（取内容或 width）。
- `flex-grow`：有剩余空间时，项目按比例瓜分剩余空间的系数，默认 `0`（不扩张）。
- `flex-shrink`：空间不足时，项目按比例承担收缩的系数，默认 `1`（可收缩），`0` 表示拒绝收缩。

`flex` 简写最常用的组合：

| 写法 | 展开 | 含义 |
|---|---|---|
| `flex: initial` | 0 1 auto | 默认：不扩张、可收缩 |
| `flex: auto` | 1 1 auto | 可扩张也可收缩 |
| `flex: none` | 0 0 auto | 完全不伸缩 |
| `flex: 1` | 1 1 0% | 等分剩余空间，项目等宽 |
| `flex: 2` | 2 1 0% | 按 2:1 等比例分配 |

`order` 改变项目的视觉排列顺序（默认 0），数值越小越靠前，同样不改变 DOM 与朗读顺序。

#### 4.2 与 Web 的关系

主内容与侧栏按比例分栏、输入框填满按钮旁剩余空间、表单项标签固定而内容区自适应，都依赖 grow/shrink/basis 的组合。理解“先按 basis 占位，再分配剩余空间”的两步过程，才能解释为什么 `flex:1` 的项目会等宽、为什么 `flex:none` 的图标不被压扁。

#### 4.3 伸缩计算示例

```html
<div class="split">
  <aside class="split__side">侧栏</aside>
  <section class="split__main">主内容</section>
</div>
```

```css
.split {
  display: flex;
  gap: 16px;
}

.split__side {
  flex: 0 0 200px; /* 固定 200px，不伸缩 */
}

.split__main {
  flex: 1; /* 吃掉全部剩余空间 */
}
```

计算过程（容器宽 800px、gap 16px）：

```text
1. 先放 basis：侧栏占 200px，gap 占 16px，主内容 basis 0
2. 剩余空间 = 800 - 200 - 16 = 584px
3. grow 系数之和 = 1，主内容独得 584px
结果：侧栏 200px，主内容 584px
```

输入框与按钮：

```css
.search-form {
  display: flex;
  gap: 8px;
}

.search-form input {
  flex: 1;
  min-width: 0; /* 允许收缩到内容以下，防止 input 固有最小尺寸撑破容器 */
}

.search-form button {
  flex: none;
}
```

#### 4.4 min-width: 0 的关键细节

flex 项目沿主轴的默认最小尺寸是 `auto`，即“不小于内容的最小宽度”。长文本、长 URL 会因此拒绝收缩而撑破布局。需要项目能缩到很窄时，显式设置 `min-width: 0`（交叉轴方向对应 `min-height: 0`），这是最常见的“Flex 溢出”修复手段。

#### 4.5 常见误区

> `flex-grow: 2` 的项目宽度就是另一个的两倍。

grow 分配的是“剩余空间”，不是总宽度。只有在 basis 相同（常见为 0）时，宽度才按比例。`flex: 2` 与 `flex: 1` 等比是因为 basis 为 0。

> 收缩时 `flex-shrink` 大的项目一定更窄。

实际收缩量还与项目的 basis 尺寸加权有关，并非只看 shrink 系数。固定宽度不想被压应直接 `flex: none`。

### 5. Grid 轨道：fr、repeat 与 minmax

#### 5.1 定义

设置 `display: grid` 后，用下列属性定义轨道：

- `grid-template-columns`：定义列轨道尺寸。
- `grid-template-rows`：定义行轨道尺寸。
- `gap`（`row-gap` / `column-gap`）：轨道间间距。
- `grid-auto-rows` / `grid-auto-columns`：隐式轨道的尺寸（项目超出显式定义时自动生成）。

轨道尺寸取值：

- 固定值：`200px`、`16rem`；
- 百分比：`25%`；
- `fr`（fraction unit）：按比例瓜分“扣除固定轨道与 gap 后”的剩余空间；
- `repeat(n, size)`：重复轨道，`repeat(3, 1fr)` 等于 `1fr 1fr 1fr`；
- `minmax(min, max)`：轨道尺寸范围，如 `minmax(200px, 1fr)`；
- `auto`：由内容决定；
- `min-content` / `max-content`：按内容最小、最大需求取值。

#### 5.2 与 Web 的关系

`repeat(auto-fit, minmax(220px, 1fr))` 是响应式卡片墙的经典写法：浏览器按容器宽度自动决定列数，每列至少 220px、剩余空间均分，无需任何媒体查询即可在手机变一列、桌面变多列。

`fr` 与百分比的关键差别：fr 分配的是“剩余空间”，因此 `1fr` 的轨道不会把 gap 算过头而导致溢出；多个 fr 按比例分配剩余空间。

#### 5.3 示例

固定三栏：

```css
.layout-a {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  gap: 16px;
}
```

弹性卡片墙：

```css
.card-wall {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
```

行高规则与隐式行：

```css
.article-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: minmax(120px, auto);
  gap: 12px;
}
```

auto-fit 与 auto-fill 的区别：

```text
容器很宽、项目较少时：
auto-fill   保留空轨道（空列位置仍存在），项目不被拉伸去填满整行
auto-fit    空轨道坍缩，已有项目拉伸平分空间
卡片墙通常希望“少卡片也铺满” → auto-fit
```

#### 5.4 fr 的计算示例

```css
.dashboard {
  display: grid;
  grid-template-columns: 160px 2fr 1fr;
  gap: 16px;
}
```

容器宽 800px：

```text
1. 先扣除固定轨道与 gap：800 - 160 - 16×2 = 608px
2. fr 系数和 = 2 + 1 = 3
3. 每份 = 608 / 3 ≈ 202.67px
结果：160px、约 405.33px、约 202.67px
```

#### 5.5 常见误区

> `1fr 1fr 1fr` 永远等于三列等宽，哪怕内容长短不一。

fr 分配剩余空间，但轨道默认最小尺寸受内容影响（类似 flex 的 min-width:auto）。需要严格等宽可写 `minmax(0, 1fr)`，允许轨道收缩到内容以下。

> 用了 Grid 就必须把行和列全部显式写满。

行常交给 `grid-auto-rows` 按内容自动生成，只定义列、让行隐式增长是常见做法。

### 6. Grid 项目定位：线号、span、命名与 grid-template-areas

#### 6.1 定义

网格线从 1 开始编号，项目可用线号占位：

- `grid-column-start` / `grid-column-end`；
- `grid-row-start` / `grid-row-end`；
- 简写 `grid-column: 1 / 3`、`grid-row: 2 / span 2`；
- 更上层的 `grid-area` 一次给出行起、列起、行止、列止，或直接引用区域名。

`grid-template-areas` 用文字“画”出布局，配合 `grid-area` 放置项目，是可读性最强的整页布局方式。

#### 6.2 与 Web 的关系

整页骨架（头横跨、侧栏占一列、正文占剩余、页脚横跨）用 areas 描述时，CSS 本身就是一张布局图；响应式切换只需在不同宽度下重画这张图，HTML 完全不动。

#### 6.3 线号定位示例

```html
<div class="board">
  <header class="board__header">头部</header>
  <aside class="board__side">侧栏</aside>
  <main class="board__main">正文</main>
  <footer class="board__footer">页脚</footer>
</div>
```

```css
.board {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: auto 1fr auto;
  gap: 12px;
  min-height: 100vh;
}

.board__header {
  grid-column: 1 / 3; /* 从第 1 条线到第 3 条线，横跨两列 */
  grid-row: 1;
}

.board__side {
  grid-column: 1;
  grid-row: 2;
}

.board__main {
  grid-column: 2;
  grid-row: 2;
}

.board__footer {
  grid-column: 1 / 3;
  grid-row: 3;
}
```

#### 6.4 命名区域写法

```css
.board {
  display: grid;
  grid-template-columns: 200px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "header header"
    "side   main"
    "footer footer";
  gap: 12px;
}

.board__header {
  grid-area: header;
}

.board__side {
  grid-area: side;
}

.board__main {
  grid-area: main;
}

.board__footer {
  grid-area: footer;
}
```

窄屏重排，只需重画一张图：

```css
@media (max-width: 640px) {
  .board {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "main"
      "side"
      "footer";
  }
}
```

区域语法规则：每个区域必须形成完整矩形；同名区域要相连；未使用的单元格用 `.` 占位。

#### 6.5 常见误区

> 网格线编号从 0 开始。

显式网格线从 1 开始（0 与负数线可用于某些特殊指向，入门阶段按 1 开始计数）。

> grid-template-areas 画得不规整、区域呈 L 形也能工作。

每个命名区域必须是矩形，非法的 areas 声明会被整条丢弃，布局退回自动放置。

### 7. Grid 对齐与四类典型布局

#### 7.1 定义

Grid 复用与 Flex 同名的对齐体系：

- `justify-items` / `align-items`：所有项目在各自单元格内沿行轴、列轴对齐；
- `justify-content` / `align-content`：网格总尺寸小于容器时，整个轨道集合在容器内分布；
- 项目个体用 `justify-self`、`align-self` 覆盖。

默认值是 stretch：项目没有固定尺寸时填满单元格。

与 Web 的关系：真实网页中反复出现的只有少数几种结构——顶部导航、卡片集合、居中的浮层与提示、主内容与侧栏分栏。过去这些结构依赖浮动、定位和大量 hack 才能实现，且每改一次 HTML 就要重算偏移；Flex 与 Grid 用声明式的对齐体系直接描述“想让内容怎样分布”，浏览器负责计算，代码更短、重排更容易，也让语义元素在不借助布局表格的情况下恢复正确角色。

#### 7.2 典型布局 1：导航栏（Flex）

```css
.site-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
```

#### 7.3 典型布局 2：卡片墙（Grid）

```css
.card-wall {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
```

#### 7.4 典型布局 3：完全居中

Flex 写法：

```css
.centering {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}
```

Grid 更短的写法：

```css
.centering {
  display: grid;
  place-items: center; /* align-items 与 justify-items 的简写 */
  min-height: 60vh;
}
```

#### 7.5 典型布局 4：经典分栏（Grid + 响应式）

```css
.shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  grid-template-areas: "content aside";
  gap: 24px;
}

.shell__content {
  grid-area: content;
}

.shell__aside {
  grid-area: aside;
  align-self: start; /* 侧栏不随正文拉伸 */
}

@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
    grid-template-areas:
      "content"
      "aside";
  }
}
```

#### 7.6 对齐取值速查

| 想做的事 | Flex | Grid |
|---|---|---|
| 项目整体在主轴/行轴居中 | `justify-content: center` | `justify-content: center`（轨道组居中） |
| 项目在交叉轴/单元格内居中 | `align-items: center` | `align-items: center` |
| 单个项目特殊对齐 | `align-self` | `justify-self` / `align-self` |
| 项目之间固定间距 | `gap` | `gap` |
| 项目填满空间 | grow/basis | 默认 stretch |

#### 7.7 常见误区

> Grid 中 justify-content 和 justify-items 的区别可以忽略。

前者移动“整个网格轨道集合”，后者控制“项目在自己的单元格里”的位置，作用对象完全不同。

> 居中只需要 `justify-content: center`。

它只解决一条轴。二维居中要同时设置交叉轴对齐，或直接使用 `place-items: center`。

### 8. Flex 与 Grid 的决策及常见问题清单

#### 8.1 决策流程

```text
1. 先看这一层是一维还是二维
2. 一维 → Flex：先定 direction，再定 wrap，再写两条轴对齐，最后处理伸缩
3. 二维 → Grid：先定轨道（列优先），再定位项目，再写对齐
4. 局部需要层叠（徽章盖在图上）→ Grid 区域重叠或 position，不用整页定位
5. 写完检查：窄屏顺序、焦点顺序、最小尺寸、gap 是否符合预期
```

经验规则：

| 场景 | 推荐 |
|---|---|
| 导航、按钮组、面包屑 | Flex |
| 卡片内“图标+文字+按钮”排列 | Flex |
| 卡片墙、相册、仪表盘 | Grid |
| 整页骨架（头/侧/正文/尾） | Grid |
| 一行“标签固定、输入框撑满” | Flex（basis + grow） |
| 需要行列严格对齐的表单 | Grid |

与 Web 的关系：浏览器渲染 Flex 与 Grid 的过程，是把容器声明解析为“轴线与轨道”，再把项目按规则放置；开发者工具中的 flex/grid 高亮显示的正是这套计算结果。当页面表现异常时，理解这一机制的开发者会从“方向、换行、轴对齐、伸缩、轨道、最小尺寸”六个变量中定位问题，而不是随机改像素值或叠加定位。这也是现代前端布局调试与早年“试数值”调试的根本区别。

#### 8.2 常见 bug 与修复

| 症状 | 常见原因 | 修复 |
|---|---|---|
| Flex 项目不换行而被压扁 | 默认 nowrap | `flex-wrap: wrap` |
| 长文本撑破 flex/grid 轨道 | 最小尺寸 auto | 项目 `min-width: 0`，轨道 `minmax(0, 1fr)` |
| 改 column 后“水平居中”失效 | 主轴已变垂直 | 对齐属性按轴重新选择 |
| 多行项目行间分布不受控 | 误用 align-items 处理行间 | 多行整体用 align-content |
| Grid 项目全挤在第一列 | 只写了 row 定位或轨道未定义 | 检查 grid-template-columns 与自动放置 |
| 命名区域不生效 | 区域非矩形或未用 grid-area 引用 | 修正 areas 图形与 area 名 |
| 卡片墙少卡片时留大片空列 | 使用了 auto-fill | 需要铺满改用 auto-fit |
| 图标在窄屏被压扁 | 项目参与收缩 | 图标项 `flex: none` |
| 视觉顺序与读屏顺序不一致 | order / reverse / areas 重排 | 关键内容优先调整 DOM，而非仅视觉重排 |

#### 8.3 可访问性联动

- 布局容器应使用语义元素；display 改变不影响标题、导航、主内容等语义。
- 能用 DOM 顺序解决的导航顺序，不用 order 硬改，保证 Tab 与朗读顺序自然。
- 触控目标在换行重排后仍应足够大且互不重叠；gap 同时改善点击准确度。
- 网格中视觉跨行的内容要确认阅读顺序：读屏器按 DOM 顺序而非视觉位置朗读。

#### 8.4 常见误区

> 布局全用 Grid 一个元素搞定最现代。

维度错配时 Grid 写一维排列反而绕弯；组件内一维排列用 Flex、整页二维用 Grid，组合使用才是常态。

> 布局溢出先加 overflow:hidden 压住。

溢出通常来自最小尺寸、未换行或固定轨道。应先按第 8.2 节的症状表定位根因，裁切只是最后手段。

## 课后题

1. 请用自己的语言说明 Flexbox 与 Grid 的维度差异，并解释“Flex 换行后为什么仍不等于二维布局”。
2. 主轴与交叉轴如何确定？场景分析：把容器从 row 改成 column 后，原本水平居中的样式失效，请解释原因并给出修改。
3. 请分别说明 `justify-content`、`align-items`、`align-content`、`align-self` 的作用对象。场景分析：单行容器中设置 align-content 没有任何变化，是代码写错了吗？
4. 给定容器宽 900px、gap 16px，两个项目分别为 `flex: 0 0 220px` 与 `flex: 1`，请分步计算两个项目最终宽度。
5. 场景分析：Flex 行中一个含长 URL 的项目怎么都缩不小，撑破整行。请解释根因并写出修复代码。
6. 请解释 `flex: 1`、`flex: auto`、`flex: none` 的区别，并各举一个适用场景。
7. 请写出 `repeat(auto-fit, minmax(240px, 1fr))` 的含义。场景分析：同样空间下 auto-fill 与 auto-fit 在项目较少时表现有何不同？
8. 给定 `grid-template-columns: 160px 2fr 1fr`、容器宽 760px、gap 16px，请分步计算三列宽度。
9. 场景分析：用 grid-template-areas 写的整页布局全部失效、项目自动堆放。请列出至少三个可能原因与检查方法。
10. 场景分析：页面在窄屏时侧栏视觉上排到了正文之后，但读屏器仍先读侧栏。请解释原因，并说明保证视觉顺序与朗读顺序一致的优先做法。

## 实践练习题

### 练习 1：Flex 组件集合：导航、按钮组与分栏

#### 任务

创建 `flex-components.html` 与 `styles/flex.css`，在同一页实现三个纯 Flex 组件：两端分布且可换行的导航栏、居中的按钮组、“固定侧栏 + 自适应主内容”分栏。要求全部使用对齐与伸缩属性完成，不使用定位。

#### 步骤约束

1. 导航使用 `justify-content: space-between` 与 `align-items: center`，窄屏可换行。
2. 按钮组使用 `justify-content: center`，项目之间只用 gap。
3. 分栏侧栏 `flex: 0 0 200px`，主内容 `flex: 1` 且设置 `min-width: 0`。
4. 主内容放一段长 URL 文本验证不再撑破容器。
5. 在容器宽 900px 与 500px 两种状态下记录项目尺寸。
6. 用开发者工具 flex 高亮核对每条线的分布。

#### 提交物

- `flex-components.html`、`styles/flex.css`；
- 两种宽度下的尺寸记录表；
- 三个组件各自的属性选择说明。

#### 验收标准

- 三个组件行为符合描述，无定位 hack；
- 长文本不撑破布局，分栏在窄屏仍可读；
- 间距全部来自 gap，无 margin 折叠现象；
- 能解释每个 flex 简写的计算含义。

### 练习 2：Grid 仪表盘与卡片墙

#### 任务

创建 `grid-dashboard.html` 与 `styles/grid.css`，实现一个二维仪表盘：顶部信息条横跨、左侧一个统计块、中间主图表、右侧列表，下方接一个自适应卡片墙。要求用轨道与定位属性完成，并给出尺寸推导。

#### 步骤约束

1. 仪表盘区域显式定义行列轨道，至少一个轨道使用 minmax，项目通过线号或区域名放置。
2. 顶部条横跨全部列；主图表占据大空间并允许内容收缩（使用 minmax(0,1fr) 思路）。
3. 卡片墙使用 `repeat(auto-fit, minmax(220px, 1fr))`，至少放五张卡片。
4. 隐式行用 grid-auto-rows 给出统一最小高度。
5. 写出三个指定宽度（1000px、760px、420px）下列数与轨道宽度的推导表。
6. 用开发者工具网格高亮验证每个区域边界。

#### 提交物

- `grid-dashboard.html`、`styles/grid.css`；
- 三档宽度轨道推导表；
- 区域或线号定位说明。

#### 验收标准

- 二维区域边界准确，无项目错位或重叠；
- 卡片墙列数随容器自动变化，少卡片时能铺满；
- 轨道推导与实测一致；
- 内容收缩处理正确，不出现横向滚动条。

### 练习 3：响应式整页：Grid 骨架 + Flex 组件

#### 任务

创建 `responsive-page.html` 与 `styles/responsive.css`，综合两种技术完成一个真实页面：Grid 负责整页骨架（头、导航、正文、侧栏、页脚），Flex 负责导航项与卡片内部排列；在窄屏下重排为单列，且顺序与朗读顺序合理。

#### 步骤约束

1. 桌面骨架使用 grid-template-areas 绘制；窄屏用媒体查询重画 areas，不改动 HTML。
2. 导航内部与至少两张卡片内部使用 Flex。
3. 正文使用分栏或卡片墙展示至少三个内容块；侧栏 `align-self: start`。
4. 检查 Tab 顺序：areas 重排后确认 DOM 顺序使键盘流程仍然自然，必要时调整 DOM。
5. 在三档宽度下截图并记录：骨架区域、导航形态、卡片列数。
6. 首屏不强制 100vh，但页头如吸顶需与后续单元知识一致，不产生内容遮挡。

#### 提交物

- `responsive-page.html`、`styles/responsive.css`；
- 三档宽度截图或描述记录；
- 一份“外层为什么用 Grid、内层为什么用 Flex”的决策说明。

#### 验收标准

- 桌面为二维骨架、窄屏单列重排，布局无错位；
- 组件内部一维排列合理，间距统一；
- 键盘与读屏顺序在重排后仍然自然；
- 决策说明能准确对应维度判断；
- 全程不使用浮动布局、布局表格与 !important。

## 阶段验收作业

### 作业名称

响应式内容门户：Flex 与 Grid 综合布局实现

### 作业场景

你要交付一个内容门户页面：顶部有品牌与导航，主体一侧是文章流、一侧是推荐与订阅区，下方有标签卡片墙，底部有站点信息。产品会在手机、平板、桌面三类设备上查看，且团队要求代码可以直接交给下一位同学维护：每个布局容器为什么选 Flex 或 Grid、轨道怎么算、窄屏怎么重排，都要有书面依据。

### 提交物清单

```text
content-portal/
├── index.html
├── styles/
│   ├── base.css            # 盒模型、重置等
│   └── layout.css          # Flex 与 Grid 布局
├── evidence/
│   ├── decisions.md        # Flex/Grid 选择与轨道推导
│   ├── responsive.md       # 三档宽度记录
│   └── checks.md           # 校验、溢出与顺序检查
└── README.md
```

约束：

- 只使用原生 CSS，不使用框架与 npm 依赖；不使用浮动布局、布局表格与 !important。
- 布局容器使用语义标签；不出现真实密钥与个人信息。
- 卡片图片可使用占位示意地址（课程规定的图片生成接口或可公开访问的示意图），不得留空框。

### 必做内容

#### 1. 整页骨架

使用 grid-template-areas 完成“头 / 正文+侧栏 / 尾”骨架；窄屏重画为单列；至少两个区域之间使用 24px 以上 gap。

#### 2. Flex 组件

导航项、文章卡片内部（媒体、标题、元信息、操作按钮）至少三处使用 Flex，其中一处包含固定项与 `flex:1` 自适应项。

#### 3. Grid 内容区

文章流或标签区使用 Grid，轨道同时出现 fr、repeat、minmax 三种写法；至少一处 `minmax(0, 1fr)` 处理内容收缩。

#### 4. 典型布局覆盖

四类典型布局（导航、卡片墙、至少一个居中元素、分栏）必须全部出现并在 decisions 中标注。

#### 5. 验证证据

三档宽度记录、无横向溢出证明、DOM 顺序与 Tab 顺序检查、W3C 校验结果齐全。

### 验收演示流程

学员需要在 20 分钟内完成以下演示：

1. 口述整页骨架的 areas 图，指出每个区域与所用技术（4 分钟）。
2. 在桌面宽度下展示一个 Flex 组件的伸缩计算与一个 Grid 轨道推导（5 分钟）。
3. 现场把窗口缩到手机宽度，展示重排过程并说明 DOM 顺序为何仍合理（4 分钟）。
4. 用键盘走完导航与一张卡片的操作，说明顺序与焦点没有被布局破坏（4 分钟）。
5. 回答导师针对任一布局容器“为什么不用另一种技术”的追问（3 分钟）。

导师可临时要求增加一块“公告横幅”，学员需现场给出：放入哪个区域、用 Flex 还是 Grid、窄屏如何处理。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 布局技术选择 | 20 | 一维用 Flex、二维用 Grid，决策文档理由充分 |
| Grid 骨架与轨道 | 25 | areas 骨架正确，fr/repeat/minmax 用法到位，推导准确 |
| Flex 组件与伸缩 | 20 | 至少三处 Flex，对齐与伸缩正确，min-width 处理到位 |
| 响应式重排 | 15 | 三档宽度表现正确，窄屏单列且顺序合理 |
| 可访问性与规范 | 10 | 语义容器、Tab 顺序自然、无溢出、无 !important |
| 证据与表达 | 10 | 三类证据齐全，README 可复现 |

细分评分规则：

#### 布局技术选择：20 分

- 维度判断全部正确：8 分；
- 四类典型布局均出现：7 分；
- 决策文档说明清晰：5 分。

#### Grid 骨架与轨道：25 分

- areas 骨架与定位正确：8 分；
- 三种轨道写法齐全：7 分；
- 至少一处 minmax(0,1fr)：5 分；
- 轨道尺寸推导正确：5 分。

#### Flex 组件与伸缩：20 分

- 三处 Flex 组件：6 分；
- 对齐属性使用正确：6 分；
- grow/shrink/basis 组合合理：5 分；
- 长内容收缩处理正确：3 分。

#### 响应式重排：15 分

- 三档宽度记录完整：5 分；
- 窄屏单列且无错位：6 分；
- 重排后视觉与朗读顺序一致：4 分。

#### 可访问性与规范：10 分

- 语义标签与键盘顺序：5 分；
- 无横向溢出、无 !important 与浮动布局：5 分。

#### 证据与表达：10 分

- 证据文档齐全：6 分；
- README 可指导复现：4 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 整页主体退回浮动布局、布局表格或大量绝对定位拼凑。
2. 一维与二维技术系统性混用错位，且无法说明任一容器的选择理由。
3. 窄屏下内容重叠、横向溢出或关键按钮被遮挡。
4. 视觉顺序与键盘、读屏顺序冲突且未调整 DOM。
5. 轨道或伸缩推导与实测明显不符，经现场提示仍不能计算。
6. 使用多个 !important 压制布局，或图片缺失只留空框。
7. 只提交截图，没有 HTML、CSS 源文件与证据文档。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 判断布局维度并选择工具 | `decisions.md` 与现场问答 |
| 配置 Flex 方向、换行与对齐 | 页面组件与现场演示 |
| 控制 Flex 项目伸缩 | Flex 组件代码与尺寸推导 |
| 定义 Grid 轨道 | `layout.css` 与轨道计算记录 |
| 定位 Grid 项目 | areas 骨架与窄屏重画 |
| 实现四类典型布局 | 页面标注与演示 |
| 完成响应式与无障碍联动 | `responsive.md`、键盘走查 |

### 提交前自检

- [ ] 每个布局容器都能回答“为什么是 Flex / 为什么是 Grid”。
- [ ] 整页骨架使用 areas，窄屏重画后单列且顺序合理。
- [ ] 至少三处 Flex 组件，对齐与伸缩属性使用正确。
- [ ] Grid 轨道同时出现 fr、repeat、minmax，且有收缩处理。
- [ ] 四类典型布局全部出现并在文档中标注。
- [ ] 三档宽度均无横向溢出与内容重叠。
- [ ] DOM 顺序保证 Tab 与朗读顺序自然，未依赖 order 处理关键流程。
- [ ] 间距以 gap 为主，未出现 margin 折叠问题。
- [ ] 没有浮动布局、布局表格、!important 与空图片框。
- [ ] W3C 校验通过，证据与 README 齐全，不含敏感信息。
