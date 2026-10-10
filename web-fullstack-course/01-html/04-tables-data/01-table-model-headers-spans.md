# 数据表、表头与合并单元格：先建立二维关系，再画出网格

> 所属章节：表格与数据
> 建议学习时间：5–7 小时
> 阶段成果：为商品比较数据建立可解释、可检查的行列关系

## 任务卡

邻里集市要同时展示阅读台灯、折叠自行车和木椅。三件商品都有价格、状态和发布时间。如果把它们写成三张卡片，读者可以逐件浏览，却很难沿同一列快速比较价格；如果只用带边框的 `div`，浏览器也不知道哪些文字是表头。

你的任务不是先“把边框画整齐”，而是回答三个问题：

1. 这些内容是否真的是二维数据？
2. 每个数据单元格由哪些行表头、列表头或分组表头解释？
3. `rowspan` 和 `colspan` 之后，所有单元格实际落在哪个网格坐标？

**完成本课后，你将交付：**

- 一张最小商品比较表；
- 一张从单层表头逐步扩展出的多级表头表；
- 一份合并单元格坐标推演记录；
- 一份 `headers` 与 `id` 断链的诊断和恢复记录；
- 一张完整的邻里集市商品比较表；
- 一份能说明何时改用 `dl`、列表或卡片的结构选择依据。

本课只处理静态 HTML 表格模型。响应式滚动、键盘滚动区、打印、表格 DOM API 和动态生成留到下一课。

## 1. 任务背景

一张数据表至少有两个维度。以商品比较为例：

- 每一行代表一件商品；
- 每一列代表所有商品共享的一种属性；
- 行与列的交点保存某件商品的某项属性。

“阅读台灯 × 价格”的交点是 3900 分，“木椅 × 状态”的交点是“已预约”。读者会沿行了解一件商品，也会沿列比较多件商品。这个交叉阅读任务正是 `table` 要表达的关系。

但“左边一个标题、右边一段文字”并不自动等于二维数据：

- 一件商品的“名称—值”信息通常适合 `dl`；
- 三条无顺序特点适合 `ul`；
- 四步交接流程适合 `ol`；
- 每件商品都需要图片、按钮和长描述，且主要任务是逐件浏览时，`article` 卡片更合适；
- 页面左右栏、页头和页脚只是布局，应该交给 CSS，不得用表格搭建。

错误选择会制造两类问题。第一类是阅读问题：视觉用户难以比较，辅助技术拿不到可靠表头。第二类是维护问题：开发者为了改变布局而修改数据结构，合并单元格很快失去控制。

因此，本课按下面的顺序工作：

```text
确认用户是否需要交叉比较
        ↓
确定每一行和每一列代表什么
        ↓
先写不合并的简单表
        ↓
必要时增加行组、列组和多级表头
        ↓
计算每个跨行、跨列单元格占用的网格位置
        ↓
检查表头关联和失败证据
```

## 2. 学习目标

完成本课后，你应能：

- 根据用户任务判断内容是否属于二维数据；
- 解释 `table`、`caption`、`thead`、`tbody`、`tfoot` 的结构职责；
- 使用 `tr` 建立行，使用 `th` 和 `td` 区分表头与数据；
- 用 `scope="row"` 和 `scope="col"` 标记简单行列表头；
- 说明 `scope="rowgroup"` 和 `scope="colgroup"` 依赖真实行组与列组；
- 在复杂表格中使用文档内唯一的 `id` 和空格分隔的 `headers`；
- 说明 `scope`、`headers` 提供程序化关系，但不保证每一种辅助技术组合产生完全相同的输出；
- 计算 `colspan`、`rowspan` 对后续单元格坐标的影响；
- 正确放置 `colgroup` 和 `col`，并说明它们不会创建数据单元格；
- 解释为什么 `col` 不能承担任意单元格样式；
- 识别并替换布局表格；
- 在 Elements、Console 和页面内容之间建立可复验的故障证据。

## 3. 预备知识

开始前建议完成：

- [列表、图注与内容分组](../02-structure-links-lists/03-lists-figures-content-groups.md)；
- [图片、媒体与嵌入](../03-images-media-embedding.md)。

你需要能够：

- 创建并保存完整 HTML 文档；
- 用浏览器打开本地文件；
- 使用 DevTools 的 Elements 和 Console；
- 理解 `id` 应在同一文档中保持唯一；
- 理解 `<data value="3900">39.00 元</data>` 可以同时提供机器值和人类可读文本；
- 理解 `<time datetime="2026-10-10T08:00:00Z">...</time>` 中的 `Z` 表示 UTC。

本课不要求：

- JavaScript；
- CSS Grid 或 Flexbox 的详细知识；
- 真实数据库、登录、预约或支付功能；
- 真实屏幕阅读器操作经验。

如果你暂时没有屏幕阅读器，可以先验证 DOM、属性和表格结构，但必须把真实辅助技术输出标记为“未验证”，不能由代码结构推断出确定朗读句子。

## 4. 核心理论

### 4.1 先判断是否存在二维数据

可以用四个问题做结构选择：

1. 是否有多个同类记录？
2. 这些记录是否共享同一组属性？
3. 用户是否需要沿行和列交叉比较？
4. 某个单元格的含义是否依赖行标签和列标签？

四个问题大多回答“是”时，数据表通常合适。

| 内容 | 首选结构 | 判断依据 |
| --- | --- | --- |
| 三件商品的价格、状态、发布时间 | `table` | 多个记录共享属性，需要横向和纵向比较 |
| 一件商品的价格、状态、发布时间 | `dl` | 主要是名称与说明，没有多记录交叉比较 |
| 商品的三个特点 | `ul` | 同一集合，顺序通常不影响含义 |
| 商品交接的四个步骤 | `ol` | 顺序参与含义 |
| 带图片、长描述和操作按钮的商品浏览流 | `article` 卡片列表 | 主要任务是逐件浏览和操作，不是密集比较 |
| 页面页头、侧栏和正文布局 | 语义元素加 CSS | 这些区域不是数据的行列交点 |

卡片和表格不是互相替代的视觉皮肤。同一批商品可以在“浏览商品”页面使用卡片，在“比较商品”页面使用表格。选择依据是当前用户任务，而不是设计稿有没有边框。

### 4.2 表格是一张必须被完整覆盖的网格

`table` 表示多于一个维度的数据。行和列形成网格，单元格应完整覆盖网格，不能互相重叠，也不应留下由错误跨度造成的空洞。

表格常见结构顺序是：

```text
table
├── caption（可选，若存在则放在最前）
├── colgroup（零个或多个）
├── thead（可选，最多一个）
├── tbody（零个或多个）或直接 tr
└── tfoot（可选，最多一个）
```

教材示例会显式写 `tbody`。浏览器解析某些省略结构时可能自动建立 `tbody`，显式写出可以减少“源代码里没有，Elements 里却出现了”的困惑。

`caption` 是表格自身的标题。它回答“这张表比较什么”，而不是某一列叫什么。复杂表还可以在表格前后用普通段落解释阅读方向和特殊单位。

### 4.3 行组：`thead`、`tbody`、`tfoot`

三个行组承担不同职责：

- `thead`：列标签和多级列表头；
- `tbody`：主体数据，可以有多个，以表达真实数据分组；
- `tfoot`：合计、备注或结果行。

行组不是为了“让背景色不同”才存在。样式可以跟随结构，但结构首先表达数据角色。

```html
<table>
  <caption>商品标价汇总</caption>
  <thead>
    <tr>
      <th scope="col">商品</th>
      <th scope="col">价格</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">阅读台灯</th>
      <td>39.00 元</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <th scope="row">合计</th>
      <td>39.00 元</td>
    </tr>
  </tfoot>
</table>
```

`tfoot` 不会自动计算合计，`thead` 也不会自动排序。它们只提供结构；计算和交互是另一个职责。

### 4.4 行与单元格：`tr`、`th`、`td`

`tr` 表示一行。`th` 是表头单元格，`td` 是数据单元格。

下面两段代码可能默认都显示粗体文字，但含义不同：

```html
<th scope="row">阅读台灯</th>
```

```html
<td><strong>阅读台灯</strong></td>
```

第一段说明“阅读台灯”是这一行的数据标签。第二段只有视觉强调，仍是普通数据单元格。反过来，也不要为了得到默认粗体而把普通金额写成 `th`。

选择规则是：

- 这个单元格是否标识一行、一列或一组数据？使用 `th`；
- 这个单元格是否保存被这些标签解释的值？使用 `td`。

### 4.5 简单关联：`scope="row"` 与 `scope="col"`

简单表格通常只需要一层列表头和一层行表头：

```html
<table>
  <caption>两件商品比较</caption>
  <thead>
    <tr>
      <th scope="col">商品</th>
      <th scope="col">价格</th>
      <th scope="col">状态</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">阅读台灯</th>
      <td>39.00 元</td>
      <td>可预约</td>
    </tr>
    <tr>
      <th scope="row">木椅</th>
      <td>25.00 元</td>
      <td>已预约</td>
    </tr>
  </tbody>
</table>
```

- `scope="col"` 表示这个 `th` 是列方向的表头；
- `scope="row"` 表示这个 `th` 是行方向的表头。

`scope` 应写在 `th` 上。把它写在 `td` 上不能把普通数据格变成表头。

简单表格优先保持简单。不要因为刚学会 `headers`，就给每个格子添加一串难以维护的 ID。

### 4.6 分组关联：`scope="rowgroup"` 与 `scope="colgroup"`

当一个表头解释一整组行或一整组列时，可以使用分组值，但必须先有真实分组。

#### 行组表头

下面每个 `tbody` 是一个状态组，第一列的表头解释所在 `tbody` 中的一组商品：

```html
<table>
  <caption>按状态分组的商品</caption>
  <thead>
    <tr>
      <th scope="col">状态组</th>
      <th scope="col">商品</th>
      <th scope="col">价格</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th rowspan="2" scope="rowgroup">可预约</th>
      <th scope="row">阅读台灯</th>
      <td>39.00 元</td>
    </tr>
    <tr>
      <th scope="row">折叠自行车</th>
      <td>180.00 元</td>
    </tr>
  </tbody>
  <tbody>
    <tr>
      <th scope="rowgroup">已预约</th>
      <th scope="row">木椅</th>
      <td>25.00 元</td>
    </tr>
  </tbody>
</table>
```

`rowspan="2"` 让“可预约”在视觉和网格上跨两行，`scope="rowgroup"` 表明它解释当前行组。仅仅给任意单元格写 `scope="rowgroup"`，却没有合理的行组边界，不会让数据自动形成业务分组。

#### 列组表头

列组先由 `colgroup` 定义，再由跨列的 `th` 标识：

```html
<table>
  <caption>线上与线下价格比较</caption>
  <colgroup span="1"></colgroup>
  <colgroup span="2"></colgroup>
  <colgroup span="2"></colgroup>
  <thead>
    <tr>
      <th rowspan="2" scope="col">商品</th>
      <th colspan="2" scope="colgroup">线下交接</th>
      <th colspan="2" scope="colgroup">社区配送</th>
    </tr>
    <tr>
      <th scope="col">标价</th>
      <th scope="col">服务费</th>
      <th scope="col">标价</th>
      <th scope="col">服务费</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">阅读台灯</th>
      <td>39.00 元</td>
      <td>0.00 元</td>
      <td>39.00 元</td>
      <td>8.00 元</td>
    </tr>
  </tbody>
</table>
```

三个 `colgroup` 分别覆盖 1、2、2 列。第一行的两个分组表头也各跨两列。结构分组、表头跨度和实际数据列数必须一致。

### 4.7 复杂关联：`id` 与 `headers`

当一格数据同时受多个层级表头解释，且单靠严格水平或垂直方向难以表达时，可以显式关联：

1. 为相关 `th` 设置文档内唯一的 `id`；
2. 在 `td` 或需要显式关联的 `th` 上写 `headers`；
3. `headers` 的值是由 ASCII 空格分隔的表头 ID；
4. 每个 ID 应指向同一张表中的 `th`。

```html
<table>
  <caption>周末商品统计</caption>
  <thead>
    <tr>
      <th id="stat-category" rowspan="2" scope="col">类别</th>
      <th id="stat-weekend" colspan="2" scope="colgroup">周末</th>
    </tr>
    <tr>
      <th id="stat-count" scope="col">数量</th>
      <th id="stat-total" scope="col">总价</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th id="stat-lighting" scope="row">照明</th>
      <td headers="stat-lighting stat-weekend stat-count">1</td>
      <td headers="stat-lighting stat-weekend stat-total">39.00 元</td>
    </tr>
  </tbody>
</table>
```

总价格子的 `headers` 可以逐项解释为：

```text
stat-lighting → 行表头“照明”
stat-weekend  → 列组表头“周末”
stat-total    → 叶子列表头“总价”
```

`id` 的唯一范围是整个 HTML 文档，不只是当前表格。两张表都写 `id="price"` 仍然是重复 ID。建议使用稳定前缀，例如 `compare-price`、`inventory-price`，而不是依赖过于通用的名称。

`headers` 不是可见文字查找。写成 `headers="总价"` 不会因为页面上有“总价”就自动关联；这里必须填写确切 ID。

#### 无障碍能力边界

正确的 `th`、`scope`、`id` 和 `headers` 能让表头关系被程序化确定，是无障碍数据表的重要基础，但不能据此承诺：

- 每个屏幕阅读器都会按同一顺序朗读所有表头；
- 每种浏览器与辅助技术组合都同样支持复杂关联；
- 浏览模式、表格导航模式和焦点模式输出完全一致；
- 写上属性就能弥补本身过度复杂的数据设计。

复杂表格应先考虑拆成更小的简单表，并提供可见阅读说明。最终输出必须在目标浏览器和辅助技术组合中人工验证。

### 4.8 `colspan` 与 `rowspan`：跨度会预占后续坐标

`colspan="2"` 表示当前单元格覆盖连续两个列位置；`rowspan="2"` 表示覆盖当前行和下一行的同一列位置。

浏览器按行从上到下、按源代码从左到右放置单元格。每次遇到一个单元格：

1. 找到当前行尚未被前面跨度占用的最左列；
2. 把单元格的左上角放到该位置；
3. 根据 `colspan` 和 `rowspan` 标记它覆盖的矩形；
4. 后续单元格跳过所有已被占用的位置。

看下面的表头：

```html
<thead>
  <tr>
    <th rowspan="2" scope="col">商品</th>
    <th colspan="2" scope="colgroup">线下交接</th>
    <th colspan="2" scope="colgroup">社区配送</th>
  </tr>
  <tr>
    <th scope="col">标价</th>
    <th scope="col">服务费</th>
    <th scope="col">标价</th>
    <th scope="col">服务费</th>
  </tr>
</thead>
```

它形成五列。坐标推演如下：

| 源单元格 | 左上角坐标 | 覆盖位置 |
| --- | --- | --- |
| 商品 | 第 1 行第 1 列 | `(1,1)`、`(2,1)` |
| 线下交接 | 第 1 行第 2 列 | `(1,2)`、`(1,3)` |
| 社区配送 | 第 1 行第 4 列 | `(1,4)`、`(1,5)` |
| 第二行第一个“标价” | 第 2 行第 2 列 | `(2,2)` |
| 第二行第一个“服务费” | 第 2 行第 3 列 | `(2,3)` |
| 第二行第二个“标价” | 第 2 行第 4 列 | `(2,4)` |
| 第二行第二个“服务费” | 第 2 行第 5 列 | `(2,5)` |

第二行源代码只有四个 `th`，但它仍有五个网格位置，因为 `(2,1)` 已被第一行的“商品”占用。

不要用“这一行写了几个标签”判断列数。应计算跨度之后的网格宽度。

`rowspan="0"` 在当前 HTML 表格模型中表示跨到所在行组的末尾，但它容易增加推演难度。初学项目优先写明确的正整数，并确保跨度不跨越不合理的行组边界。

### 4.9 `colgroup` 与 `col`：定义列，不承载单元格内容

`colgroup` 表示一组连续列，`col` 表示其中一列或连续若干列：

```html
<table>
  <caption>商品比较</caption>
  <colgroup>
    <col class="product-column">
  </colgroup>
  <colgroup>
    <col span="2" class="detail-columns">
  </colgroup>
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

关键限制如下：

- `colgroup` 位于 `caption` 之后、`thead`/`tbody`/`tfoot`/`tr` 之前；
- `colgroup[span]` 的值是大于 0 的整数；
- 一个 `colgroup` 若使用 `span`，就不再放子 `col`；
- 一个 `colgroup` 若包含 `col`，就不要再给该 `colgroup` 写 `span`；
- `col[span]` 表示这个 `col` 定义连续多少列，不会生成多个数据格；
- `col` 是空元素，不能把“价格”或“状态”文字放进去；
- 所有列定义的跨度总和应与表格实际列数一致；
- 单元格不是 `col` 的 DOM 子元素，不会从 `col` 继承任意 CSS。

只有一部分 CSS 会对列和列组产生效果，常用的是背景、宽度，以及特定边框合并条件下的边框。不要期待下面的代码给每个数据格增加内边距或设置文本对齐：

```css
/* 错误预期：td/th 不是 col 的子元素 */
col.price-column {
  padding: 1rem;
  text-align: right;
}
```

内边距和文本对齐应直接设置到相应 `th`、`td`，或使用能够选中这些单元格的选择器。列背景也可能被行组、行或单元格自身的不透明背景覆盖。

### 4.10 `caption`、可见说明与表格复杂度

`caption` 给表格命名：

```html
<table>
  <caption>邻里集市三件商品比较</caption>
  ...
</table>
```

复杂结构还需要可见说明：

```html
<p id="comparison-help">
  每件商品占一行；“商品信息”和“交易信息”各包含两个子列。
</p>
<table aria-describedby="comparison-help">
  ...
</table>
```

说明应该帮助所有读者理解：

- 每行和每列代表什么；
- 金额单位和时间标准；
- 分组如何组织；
- 哪些空值有业务含义。

不要依赖历史的 `summary` 属性。它已经不是现代 HTML 的合规作者方案。使用可见文字、`caption` 和必要的描述关系。

### 4.11 明确反例：表格不能用于页面布局

下面是错误案例：

```html
<!-- 错误案例：用数据表结构搭建整页布局 -->
<table>
  <tr>
    <td>
      <nav>
        <a href="/listings">商品</a>
        <a href="/help">帮助</a>
      </nav>
    </td>
    <td>
      <main>
        <h1>邻里集市</h1>
        <p>浏览社区闲置商品。</p>
      </main>
    </td>
  </tr>
</table>
```

这里不存在“记录 × 属性”的二维数据。数据提取工具可能把导航和正文当成两个数据格，辅助技术的表格导航也可能报告一张没有意义的表。

应保留真实页面结构，再用 CSS 处理布局：

```html
<div class="page-layout">
  <nav aria-label="主导航">
    <a href="/listings">商品</a>
    <a href="/help">帮助</a>
  </nav>
  <main>
    <h1>邻里集市</h1>
    <p>浏览社区闲置商品。</p>
  </main>
</div>
```

```css
.page-layout {
  display: grid;
  grid-template-columns: 12rem 1fr;
  gap: 1.5rem;
}
```

`role="presentation"` 不是继续使用布局表格的许可证，也不应加到真实数据表上清除其语义。新代码直接选择正确结构。

### 4.12 从简单结构开始，复杂度只增不减

推荐演进顺序：

```text
第一步：caption + 一层列表头 + 行表头
第二步：确认确有分组需求
第三步：加入 colgroup / 多个 tbody
第四步：加入 colspan / rowspan
第五步：scope 仍足够时停下
第六步：只有复杂关联无法可靠表达时才加入 id / headers
第七步：目标辅助技术人工验证
```

如果第五步之后已经很难向同伴解释某个格子的所有表头，优先拆表，而不是继续堆属性。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 最小示例 | 边界与检查点 |
| --- | --- | --- | --- |
| `table` | 表示多维数据表 | `<table>...</table>` | 不用于页面布局 |
| `caption` | 表格可见标题 | `<caption>商品比较</caption>` | 若存在，置于表格结构最前 |
| `thead` | 表头行组 | `<thead><tr>...</tr></thead>` | 不自动排序 |
| `tbody` | 主体数据行组 | `<tbody><tr>...</tr></tbody>` | 可以有多个，分组应有真实含义 |
| `tfoot` | 汇总或尾部行组 | `<tfoot><tr>...</tr></tfoot>` | 不自动计算 |
| `tr` | 一行单元格 | `<tr>...</tr>` | 计算跨度后应覆盖同一网格 |
| `th` | 表头单元格 | `<th scope="row">台灯</th>` | 不是为了默认粗体 |
| `td` | 数据单元格 | `<td>39.00 元</td>` | 不用 `strong` 模拟表头语义 |
| `scope="row"` | 当前 `th` 标识一行 | `<th scope="row">台灯</th>` | 用于简单行表头 |
| `scope="col"` | 当前 `th` 标识一列 | `<th scope="col">价格</th>` | 用于简单列表头 |
| `scope="rowgroup"` | 当前 `th` 标识所在行组 | `<th scope="rowgroup">可预约</th>` | 依赖合理的行组边界 |
| `scope="colgroup"` | 当前 `th` 标识所在列组 | `<th scope="colgroup" colspan="2">交易</th>` | 结构列组与跨度应一致 |
| `id` | 为表头提供唯一引用目标 | `<th id="cmp-price">价格</th>` | 整个文档唯一，不能含空格 |
| `headers` | 显式列出相关表头 ID | `<td headers="cmp-lamp cmp-price">39.00 元</td>` | 空格分隔，目标应是同表 `th` |
| `colspan` | 横跨连续列 | `<th colspan="2">交易</th>` | 影响本行后续单元格坐标 |
| `rowspan` | 纵跨连续行 | `<th rowspan="2">可预约</th>` | 影响后续行的可用坐标 |
| `colgroup` | 定义连续列组 | `<colgroup span="2"></colgroup>` | 位于行组之前；有 `span` 时不含 `col` |
| `col` | 定义一列或若干连续列 | `<col span="2">` | 空元素，不创建格子，CSS 能力有限 |
| `data[value]` | 保存机器可读金额 | `<data value="3900">39.00 元</data>` | 本项目业务金额使用整数分 |
| `time[datetime]` | 保存机器可读时间 | `<time datetime="2026-10-10T08:00:00Z">...</time>` | 本项目存储时间使用 UTC |

本课没有新增 JavaScript API。下一课会处理 `HTMLTableElement`、行列集合和安全 DOM 生成。

## 6. 最小可运行案例

### 6.1 文件位置

在个人练习项目中创建：

```text
market-learning/
└── practice/
    └── html-07-table-model/
        └── index.html
```

本教材只在 Markdown 中提供代码，不要求在课程仓库新增 `labs`、源码目录或包配置。请把下一节的完整文件保存为自己的 `index.html`。

### 6.2 最小商品比较表：完整文件

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>最小商品比较表 · 邻里集市</title>
    <style>
      body {
        font-family: sans-serif;
        margin: 2rem;
      }

      table {
        border-collapse: collapse;
      }

      caption {
        font-weight: 700;
        margin-bottom: 0.5rem;
        text-align: left;
      }

      th,
      td {
        border: 1px solid #66766d;
        padding: 0.6rem 0.8rem;
        text-align: left;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>商品比较</h1>
      <table>
        <caption>两件社区闲置商品</caption>
        <thead>
          <tr>
            <th scope="col">商品</th>
            <th scope="col">价格</th>
            <th scope="col">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">阅读台灯</th>
            <td><data value="3900">39.00 元</data></td>
            <td>可预约</td>
          </tr>
          <tr>
            <th scope="row">木椅</th>
            <td><data value="2500">25.00 元</data></td>
            <td>已预约</td>
          </tr>
        </tbody>
      </table>
    </main>
  </body>
</html>
```

这个案例只包含最必要的关系：

- 表格主题由 `caption` 给出；
- 三个 `scope="col"` 标识三列；
- 两个 `scope="row"` 标识两行；
- 价格的人类可读单位是元，机器值仍是整数分；
- 没有为了练习属性而加入不必要的 `id` 和 `headers`。

### 6.3 打开方式、预期结果与失败证据

打开方式：

1. 保存 `index.html`；
2. 用现代浏览器直接打开本地文件；
3. 打开 DevTools 的 Elements；
4. 展开 `table`、`thead` 和 `tbody`；
5. 选中“阅读台灯”和“价格”对应的 `th` 检查 `scope`；
6. 选中 39.00 元对应的 `data` 检查 `value="3900"`。

预期结果：

- 页面显示一张 2 行 × 3 列的数据表，不把表头行计入商品数量；
- 表格标题为“两件社区闲置商品”；
- “阅读台灯”和“木椅”是行表头；
- “商品、价格、状态”是列表头；
- 页面断网后仍可打开，因为没有外部依赖；
- 39.00 元的机器值是整数 `3900`。

失败证据：

- Elements 中没有 `caption`，读者只能从页面大标题猜测表格主题；
- 商品名是 `td` 或只有 `strong`，没有显式行表头；
- `scope` 写在 `td` 上；
- 价格的 `value` 写成 `39.00`，与项目“整数分”契约冲突；
- 为了对齐页面而在数据表外又套了一张布局表。

本例不包含链接、脚本和网络请求。关闭浏览器标签页即可结束观察。

### 6.4 逐步扩展：从单层表头到多级表头

现在需求增加为“比较线下交接和社区配送两种方式下的标价与服务费”。先保留“商品”列，再把四个数值列分成两个列组：

```html
<table>
  <caption>不同交接方式的费用比较</caption>
  <colgroup span="1"></colgroup>
  <colgroup span="2"></colgroup>
  <colgroup span="2"></colgroup>
  <thead>
    <tr>
      <th id="cost-product" rowspan="2" scope="col">商品</th>
      <th id="cost-offline" colspan="2" scope="colgroup">线下交接</th>
      <th id="cost-delivery" colspan="2" scope="colgroup">社区配送</th>
    </tr>
    <tr>
      <th id="cost-offline-price" scope="col">标价</th>
      <th id="cost-offline-fee" scope="col">服务费</th>
      <th id="cost-delivery-price" scope="col">标价</th>
      <th id="cost-delivery-fee" scope="col">服务费</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th id="cost-lamp" scope="row">阅读台灯</th>
      <td headers="cost-lamp cost-offline cost-offline-price">39.00 元</td>
      <td headers="cost-lamp cost-offline cost-offline-fee">0.00 元</td>
      <td headers="cost-lamp cost-delivery cost-delivery-price">39.00 元</td>
      <td headers="cost-lamp cost-delivery cost-delivery-fee">8.00 元</td>
    </tr>
    <tr>
      <th id="cost-chair" scope="row">木椅</th>
      <td headers="cost-chair cost-offline cost-offline-price">25.00 元</td>
      <td headers="cost-chair cost-offline cost-offline-fee">0.00 元</td>
      <td headers="cost-chair cost-delivery cost-delivery-price">25.00 元</td>
      <td headers="cost-chair cost-delivery cost-delivery-fee">12.00 元</td>
    </tr>
  </tbody>
</table>
```

扩展过程没有改变“一行一件商品”的模型，只把列维度细分为：

```text
线下交接
├── 标价
└── 服务费

社区配送
├── 标价
└── 服务费
```

这里用 `headers` 显式展示每个金额的三层上下文。实际项目是否需要显式关联，应根据表格复杂度和目标辅助技术测试决定。即使属性完全正确，也不要预写“屏幕阅读器一定会朗读某个固定句子”的验收结果。

### 6.5 单元格网格坐标推演

把上例前两行画成坐标：

```text
              第 1 列       第 2 列       第 3 列       第 4 列       第 5 列
第 1 行       商品          线下交接      线下交接      社区配送      社区配送
              └跨到第2行    └──── colspan=2 ────┘      └──── colspan=2 ────┘

第 2 行       已被商品占用  标价           服务费         标价           服务费
```

逐格放置记录：

1. “商品”从 `(1,1)` 开始，`rowspan="2"` 同时占用 `(2,1)`；
2. “线下交接”找到 `(1,2)`，`colspan="2"` 再占用 `(1,3)`；
3. “社区配送”下一个空位是 `(1,4)`，并占用 `(1,5)`；
4. 第二行开始时 `(2,1)` 已占用，所以第一个“标价”放在 `(2,2)`；
5. 后续三个表头依次放在 `(2,3)`、`(2,4)`、`(2,5)`；
6. 每个商品数据行必须提供一个行表头加四个数据格，合计覆盖五列。

如果误删第二行最后一个“服务费”，第二行只覆盖到第 4 列。视觉边框可能仍让错误不够醒目，但网格已经与数据行的五列模型不一致。

### 6.6 故障实验：破坏 `headers` 与 `id`

先把上例中两个表头改成重复 ID，并把一个数据格写成不存在的 ID：

```html
<!-- 错误案例 -->
<th id="cost-price" scope="col">线下标价</th>
<th id="cost-price" scope="col">配送标价</th>
<td headers="cost-lamp cost-delivery cost-price-cents">39.00 元</td>
```

**现象：**视觉表格仍可能和之前一样，肉眼无法直接发现关联断裂。

**证据：**

```js
document.querySelectorAll("#cost-price").length
```

结果为 `2`，证明 ID 重复。

```js
document.getElementById("cost-price-cents")
```

结果为 `null`，证明 `headers` 引用了不存在的目标。

**原因：**`headers` 按 ID 关联，不按文字相似度猜测；重复 ID 又使引用目标不再唯一。

**修复：**

```html
<th id="cost-offline-price" scope="col">线下标价</th>
<th id="cost-delivery-price" scope="col">配送标价</th>
<td headers="cost-lamp cost-delivery cost-delivery-price">39.00 元</td>
```

**复验：**

```js
document.querySelectorAll("[id]").length ===
  new Set([...document.querySelectorAll("[id]")].map((element) => element.id)).size
```

结果应为 `true`。再逐个拆分 `headers`，确认每个 ID 存在、目标是同一张表里的 `th`。这个静态检查只能证明引用结构成立；目标辅助技术中的实际输出仍需人工测试。

## 7. 邻里集市集成案例

### 7.1 数据模型与阅读方向

完整比较页采用七列：

```text
状态组 | 商品 | 类别 | 成色 | 标价 | 交接方式 | 发布时间
```

其中：

- 每件商品是一行；
- “类别、成色”属于“商品信息”列组；
- “标价、交接方式”属于“交易信息”列组；
- “可预约”跨两行并标识一个 `tbody` 行组；
- 价格机器值统一使用整数分；
- 时间机器值统一使用带 `Z` 的 UTC ISO 8601；
- 可见时间也明确标注 UTC，避免把机器时间误读为本地时间；
- `tfoot` 汇总三件商品标价，但不声称已经产生订单或支付。

### 7.2 文件位置与完整页面

在个人练习项目中保存为：

```text
market-learning/practice/html-07-table-model/neighbor-market-comparison.html
```

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>商品结构化比较 · 邻里集市</title>
    <style>
      body {
        color: #24332c;
        font-family: sans-serif;
        margin: 2rem;
      }

      table {
        border-collapse: collapse;
        width: 100%;
      }

      caption {
        font-size: 1.2rem;
        font-weight: 700;
        margin-bottom: 0.75rem;
        text-align: left;
      }

      th,
      td {
        border: 1px solid #66766d;
        padding: 0.65rem;
        text-align: left;
        vertical-align: top;
      }

      thead,
      tfoot {
        background: #e8f0ea;
      }

      col.status-column {
        width: 7rem;
      }

      col.product-column {
        width: 10rem;
      }

      col.price-column {
        background: #fff7df;
        width: 8rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>邻里集市商品比较</h1>
      <p id="market-table-guide">
        每件商品占一行；商品信息和交易信息各分为两个子列。
        金额机器值使用人民币分，时间机器值和可见时间均使用 UTC。
      </p>

      <table aria-describedby="market-table-guide">
        <caption>三件教学商品的价格、状态与发布时间</caption>

        <colgroup>
          <col class="status-column">
        </colgroup>
        <colgroup>
          <col class="product-column">
        </colgroup>
        <colgroup span="2"></colgroup>
        <colgroup>
          <col class="price-column">
          <col>
        </colgroup>
        <colgroup span="1"></colgroup>

        <thead>
          <tr>
            <th id="market-status" rowspan="2" scope="col">状态组</th>
            <th id="market-product" rowspan="2" scope="col">商品</th>
            <th id="market-product-info" colspan="2" scope="colgroup">
              商品信息
            </th>
            <th id="market-trade-info" colspan="2" scope="colgroup">
              交易信息
            </th>
            <th id="market-published" rowspan="2" scope="col">
              发布时间（UTC）
            </th>
          </tr>
          <tr>
            <th id="market-category" scope="col">类别</th>
            <th id="market-condition" scope="col">成色</th>
            <th id="market-price" scope="col">标价</th>
            <th id="market-handoff" scope="col">交接方式</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <th id="market-available" rowspan="2" scope="rowgroup">
              可预约
            </th>
            <th id="market-lamp" scope="row">阅读台灯</th>
            <td headers="market-available market-lamp market-product-info market-category">
              家居照明
            </td>
            <td headers="market-available market-lamp market-product-info market-condition">
              灯罩有浅划痕，开关正常
            </td>
            <td headers="market-available market-lamp market-trade-info market-price">
              <data value="3900">39.00 元</data>
            </td>
            <td headers="market-available market-lamp market-trade-info market-handoff">
              社区门厅当面检查
            </td>
            <td headers="market-available market-lamp market-published">
              <time datetime="2026-10-10T08:00:00Z">
                2026-10-10 08:00 UTC
              </time>
            </td>
          </tr>
          <tr>
            <th id="market-bike" scope="row">儿童滑步车</th>
            <td headers="market-available market-bike market-product-info market-category">
              儿童出行
            </td>
            <td headers="market-available market-bike market-product-info market-condition">
              车架稳定，轮胎有正常使用痕迹
            </td>
            <td headers="market-available market-bike market-trade-info market-price">
              <data value="1800">18.00 元</data>
            </td>
            <td headers="market-available market-bike market-trade-info market-handoff">
              社区活动室当面检查
            </td>
            <td headers="market-available market-bike market-published">
              <time datetime="2026-10-10T09:15:00Z">
                2026-10-10 09:15 UTC
              </time>
            </td>
          </tr>
        </tbody>

        <tbody>
          <tr>
            <th id="market-reserved" scope="rowgroup">已预约</th>
            <th id="market-chair" scope="row">木椅</th>
            <td headers="market-reserved market-chair market-product-info market-category">
              家具
            </td>
            <td headers="market-reserved market-chair market-product-info market-condition">
              椅脚稳定，坐面有轻微磨损
            </td>
            <td headers="market-reserved market-chair market-trade-info market-price">
              <data value="2500">25.00 元</data>
            </td>
            <td headers="market-reserved market-chair market-trade-info market-handoff">
              社区服务站当面检查
            </td>
            <td headers="market-reserved market-chair market-published">
              <time datetime="2026-10-10T10:00:00Z">
                2026-10-10 10:00 UTC
              </time>
            </td>
          </tr>
        </tbody>

        <tfoot>
          <tr>
            <th id="market-total" colspan="4" scope="row">
              三件商品标价合计
            </th>
            <td headers="market-total market-trade-info market-price">
              <data value="8200">82.00 元</data>
            </td>
            <td headers="market-total market-trade-info market-handoff">
              仅为静态清单汇总
            </td>
            <td headers="market-total market-published">
              截至
              <time datetime="2026-10-10T10:00:00Z">
                2026-10-10 10:00 UTC
              </time>
            </td>
          </tr>
        </tfoot>
      </table>

      <p>
        本页只展示教学数据，不创建预约、订单、支付或持久化记录。
      </p>
    </main>
  </body>
</html>
```

### 7.3 打开、观察与失败证据

打开方式：

1. 用浏览器打开 `neighbor-market-comparison.html`；
2. 在 Elements 中确认 `caption` 后依次是五个 `colgroup`、`thead`、两个 `tbody` 和 `tfoot`；
3. 选中“可预约”，确认它位于第一个 `tbody` 且 `rowspan="2"`；
4. 选中台灯价格格，把 `headers` 拆成四个 ID；
5. 在 Elements 中逐一搜索这四个 ID，确认目标都是同表 `th`；
6. 检查三个 `data[value]` 是否为 `3900`、`1800`、`2500`，汇总是否为 `8200`；
7. 检查所有 `time[datetime]` 是否以 `Z` 结尾。

预期结果：

- 表格共有七列；
- “商品信息”和“交易信息”各跨两列；
- “可预约”覆盖两件商品所在的同一个 `tbody`；
- “已预约”只解释木椅所在的第二个 `tbody`；
- 三个价格的整数分相加等于 8200 分；
- 页面明确展示 82.00 元，而不是 8200 元；
- 机器时间和可见时间都明确采用 UTC；
- 关闭 CSS 后，表格仍保留 caption、行组、列组和表头关系。

失败证据：

- 列定义跨度总和不是七，或表头行跨度计算不出七列；
- 第二行把被“状态组”或“商品”占用的位置又写了一次，造成错列；
- 某个 `headers` ID 搜索结果为 0 个或多于 1 个；
- `headers` 指向同文档另一张表，或指向 `td`；
- `<data value>` 使用小数元，破坏整数分契约；
- `datetime` 没有时区，或可见文字声称本地时间但未说明转换规则；
- 用 `tfoot` 的合计暗示已经收费、下单或支付。

### 7.4 项目边界

完整页面展示的是静态教学状态：

- `available` 与 `reserved` 的可见文字不证明服务器实时状态；
- 合计只是三个标价相加，不是订单总额；
- 页面没有认证、授权、支付、数据库持久化或并发控制；
- HTML 表头关系不能替代后端字段契约；
- 本课没有实现小屏滚动、排序、筛选或动态更新。

## 8. 常见错误与排查路径

### 8.1 用表格做页面布局

- **现象**：导航、正文和侧栏分别塞进 `td`。
- **证据**：表格中没有共享属性和同类记录，只有页面区域。
- **原因**：根据视觉行列选择了数据结构。
- **修复**：恢复 `nav`、`main`、`aside` 等结构，用 CSS Grid 或 Flexbox 布局。
- **复验**：数据表导航不再把页面区域报告为单元格。

### 8.2 把 `th` 当作粗体样式

- **现象**：金额为了加粗而使用 `th`，商品名却使用 `td`。
- **证据**：询问“它标识哪一行或哪一列”时无法回答。
- **原因**：根据浏览器默认外观选择元素。
- **修复**：商品名改为行表头，金额恢复为数据格；视觉强调交给 CSS。
- **复验**：每个 `th` 都能指出自己解释的数据范围。

### 8.3 缺少 `caption` 或用页面标题代替

- **现象**：页面有 `h1`，表格本身没有名称。
- **证据**：同页出现第二张表后，无法仅靠表格结构区分主题。
- **原因**：混淆页面标题和表格标题。
- **修复**：为每张表提供具体 `caption`。
- **复验**：表格离开周围版面后仍能知道比较主题。

### 8.4 `scope` 的分组值没有真实分组

- **现象**：任意跨两行的表头都写 `scope="rowgroup"`，但所有数据只有一个混合 `tbody`。
- **证据**：业务分组边界与行组结构不一致。
- **原因**：把 `rowspan` 等同于行组。
- **修复**：先按真实业务组拆分 `tbody`，再让组表头位于对应行组；没有组时使用更简单结构。
- **复验**：每个行组表头只解释其所在组。

### 8.5 `headers` 拼错、缺失或跨表

按固定顺序诊断，不要先改 CSS：

1. 从错误数据格复制 `headers` 原值；
2. 按 ASCII 空格拆分；
3. 对每个 ID 执行 `document.getElementById(id)`；
4. 确认结果不是 `null`；
5. 确认结果的标签名是 `TH`；
6. 确认 `result.closest("table") === cell.closest("table")`；
7. 确认 ID 在文档中只出现一次；
8. 修复后重新执行所有检查。

不要通过删除 `headers` 让检查“安静下来”。只有确认表格已经简化到 `scope` 足够表达关系时，才可以有依据地移除显式关联。

### 8.6 重复 ID

- **现象**：两个列表头都使用 `id="price"`。
- **证据**：`document.querySelectorAll("#price").length` 大于 1。
- **原因**：误以为 ID 只需在各自表格内唯一。
- **修复**：使用带表格前缀的唯一 ID，并同步更新所有 `headers`。
- **复验**：全部 `[id]` 数量等于 ID 集合大小，所有引用仍有目标。

### 8.7 跨度造成缺格或错列

- **现象**：某一数据行的价格显示在状态列下方。
- **证据**：按坐标表计算后，该行没有完整覆盖网格，或重复占用了已被 `rowspan` 预占的位置。
- **原因**：只数源代码标签，没有计算跨度。
- **修复**：从第一行开始重画坐标矩阵，删除重复格或补齐缺失格。
- **复验**：每一行在考虑纵向预占后都完整覆盖同一网格宽度。

### 8.8 对 `col` 的样式能力期望过高

- **现象**：给 `col` 设置 `padding` 和 `text-align`，单元格没有变化。
- **证据**：Elements 显示 `td`/`th` 不是 `col` 的后代。
- **原因**：把列定义误当成单元格父容器。
- **修复**：直接选中目标单元格设置内边距和对齐；只把 `col` 用于适合的列背景、宽度等能力。
- **复验**：样式规则实际匹配 `th`/`td`，结构列数仍正确。

### 8.9 把结构正确等同于所有辅助技术表现一致

- **现象**：文档声称“加上 `headers` 后任何读屏都会依次朗读四个表头”。
- **证据**：没有记录浏览器、辅助技术、版本和阅读模式。
- **原因**：把程序化关系误当成跨实现输出保证。
- **修复**：把结论改为“关联可由程序确定”，并在目标组合做人工测试。
- **复验**：测试记录包含环境、操作、实际输出和未验证范围。

## 9. 课后题

### 9.1 理解题

1. 为什么一件商品的“价格、状态、发布时间”通常适合 `dl`，三件商品比较则适合 `table`？
2. `th` 与加粗的 `td` 有什么本质区别？
3. 为什么第二个表头行只有四个 `th`，整张表却可以有五列？
4. `headers="lamp price"` 中的两个词是什么？
5. 为什么正确使用 `headers` 也不能保证每个屏幕阅读器说出完全相同的话？

<details>
<summary>查看理解题答案</summary>

1. 单件商品主要是名称与说明；多件商品共享属性并需要行列交叉比较。
2. `th` 是表头单元格，能参与表头关联；`strong` 只强调文字，不会把 `td` 变成表头。
3. 第一行的一个 `th` 用 `rowspan="2"` 占用了第二行第 1 列，第二行源代码从第 2 列开始放置。
4. 它们是同一张表中相关 `th` 的 ID，由空格分隔，不是可见表头文字。
5. 属性提供程序化关系，但浏览器、辅助技术、版本和阅读模式仍可能影响输出；复杂表还可能超出用户易于理解的范围。

</details>

### 9.2 结构选择题

为下面内容选择首选结构，并说明判断依据：

```text
A：商品的一组无顺序特点
B：单件商品的名称与值
C：十件商品的价格、状态和发布时间比较
D：由图片、描述和收藏按钮组成的商品浏览流
E：页面左侧导航与右侧正文
```

<details>
<summary>查看结构选择答案</summary>

- A 使用 `ul`，因为它是无顺序集合。
- B 使用 `dl`，因为它是名称与说明。
- C 使用 `table`，因为多个同类记录共享属性并需要交叉比较。
- D 使用 `article` 卡片列表，因为主要任务是逐件浏览和操作。
- E 使用语义区域加 CSS 布局，因为页面区域不是二维数据。

</details>

### 9.3 网格推理题

给定：

```html
<tr>
  <th rowspan="3">状态</th>
  <th colspan="2">商品信息</th>
</tr>
<tr>
  <th>名称</th>
  <th>类别</th>
</tr>
```

回答：

1. 第一行有几个网格列位置？
2. 第二行第一个 `th` 的坐标是什么？
3. “状态”还会占用第三行哪个位置？

<details>
<summary>查看网格推理答案</summary>

1. 三列。“状态”占第 1 列，“商品信息”跨第 2、3 列。
2. `(2,2)`，因为 `(2,1)` 已被“状态”占用。
3. `(3,1)`。

</details>

### 9.4 诊断题

一个数据格写着：

```html
<td headers="offer-chair offer-trade offer-prcie">25.00 元</td>
```

页面中只有 `id="offer-price"`。应如何证明并修复问题？

答案标准：

- 用 `document.getElementById("offer-prcie")` 得到 `null` 作为失败证据；
- 把拼错的 `offer-prcie` 改为 `offer-price`；
- 确认 `offer-chair`、`offer-trade`、`offer-price` 都是同表且唯一的 `th`；
- 不以“视觉没变化”作为修复失败；
- 不声称静态引用修复已经证明所有辅助技术输出一致。

## 10. 实践练习

### 10.1 基础：三件商品简单比较

文件位置：

```text
practice/html-07-table-model/basic-comparison.html
```

要求：

- 使用完整 HTML 文档；
- 使用 `caption`、`thead`、`tbody`、`tfoot`；
- 列为“商品、价格、状态”；
- 商品名使用 `th scope="row"`；
- 列标签使用 `th scope="col"`；
- 三个价格机器值分别为 `4200`、`1750`、`6300`；
- `tfoot` 显示合计 122.50 元，机器值为 `12250`；
- 页面明确说明只是静态比较。

答案标准：

- 表格模型为三列，每个主体行完整覆盖三列；
- 价格存储值全部是整数分，可见值才使用元；
- `tfoot` 结构不被描述为自动计算；
- 不使用 `id`/`headers` 增加无必要复杂度；
- 关闭 CSS 后仍能理解表格。

### 10.2 进阶：加入行组与多级列表头

文件位置：

```text
practice/html-07-table-model/advanced-groups.html
```

要求：

- 使用两个 `tbody` 表达“可预约”和“已预约”；
- 使用 `scope="rowgroup"` 的状态组表头；
- 创建“商品信息”和“交易信息”两个列组表头；
- 两个分组表头都使用 `scope="colgroup"`；
- 至少一个组表头使用 `colspan="2"`；
- 为复杂数据格建立唯一 `id` 与 `headers`；
- 在表格前用可见文字解释行列结构；
- 画出两行表头的坐标矩阵。

答案标准：

- `colgroup` 跨度总和等于实际列数；
- 行组表头位于自己解释的 `tbody`；
- 每个 `headers` 标记都能解析到同表唯一 `th`；
- 坐标矩阵能解释第二行起始列；
- 若结构已经难以清楚讲解，允许拆成两张简单表，但要说明取舍；
- 辅助技术输出只记录实际测试结果，不预设固定朗读文本。

### 10.3 故障注入：制造三类静默错误

在 `advanced-groups.html` 的副本中依次制造：

1. 两个 `th` 使用相同 ID；
2. 一个 `headers` 引用不存在的 ID；
3. 删除多级表头第二行的最后一个 `th`，形成网格不一致。

每次只制造一个错误，并按下面模板记录：

```text
错误类型：
可见现象：
Elements 或 Console 证据：
网格坐标证据：
根因：
最小修复：
复验结果：
辅助技术未验证范围：
```

答案标准：

- 重复 ID 用选择器计数证明；
- 缺失目标用 `getElementById()` 的 `null` 证明；
- 网格错误用坐标矩阵证明，不能只说“看起来歪了”；
- 修复后重新检查全部 ID 和引用，不能只检查改动的一个格子；
- 不删除表头、`headers` 或测试步骤来制造通过。

## 11. 阶段验收

### 功能与结构

- [ ] 能用“记录 × 共享属性 × 交叉比较”解释为什么选择表格；
- [ ] 能说明同一内容在浏览任务中可能用卡片，在比较任务中可能用表格；
- [ ] `caption`、`colgroup`、行组顺序合法；
- [ ] `thead`、`tbody`、`tfoot` 职责清楚；
- [ ] `th` 与 `td` 根据数据角色选择，而不是根据默认粗体；
- [ ] 简单表使用 `scope="row"` 和 `scope="col"`；
- [ ] 分组表头对应真实 `tbody` 或 `colgroup`；
- [ ] 所有 `id` 在整个文档中唯一；
- [ ] 所有 `headers` 目标存在、唯一、位于同一张表且为 `th`；
- [ ] `colspan`/`rowspan` 后没有重叠或缺格；
- [ ] `colgroup`/`col` 的跨度总和与网格列数一致；
- [ ] 没有使用表格进行页面布局。

### 数据与边界

- [ ] 业务金额机器值使用整数分；
- [ ] 存储时间使用带 `Z` 的 UTC ISO 8601；
- [ ] 可见时间的时区含义明确；
- [ ] 静态合计没有被描述为订单或支付；
- [ ] 页面没有声称实现认证、授权、持久化或并发控制；
- [ ] 没有把 `scope`/`headers` 描述成所有辅助技术输出保证。

### 运行证据

```text
个人练习路径：
浏览器与版本：
最小表截图：
Elements 中的行组和列组：
网格坐标推演：
重复 ID 检查：
headers 目标检查：
整数分与 UTC 检查：
错误实验与恢复：
真实辅助技术测试环境：
未验证范围：
```

完成标准不是“边框显示出来”，而是每个数据格都能回答“我在哪个网格位置，由哪些表头解释”，且失败证据能够被另一个人复现。

## 12. 常见问题

### Q1：只有两列也能用表格吗？

可以，关键不是列数，而是是否存在需要交叉读取的二维关系。若只是单个对象的一组名称和值，`dl` 往往更直接；若多条记录共享两列并需要比较，表格可以合理。

### Q2：每张表都必须有 `thead`、`tbody` 和 `tfoot` 吗？

不是。`tfoot` 只有确有汇总或尾部信息时才需要。简单表也可以省略部分行组，但教材和业务代码常显式写 `thead`、`tbody`，让结构和 DOM 更容易检查。

### Q3：有 `th` 以后还要写 `scope` 吗？

用户代理可以对部分简单表推断关联，但明确的 `scope="row"`/`scope="col"` 能表达作者意图，也便于审查。复杂表则需要根据实际结构选择分组 `scope` 或显式 `headers`，不能机械套用。

### Q4：能同时使用 `scope` 和 `headers` 吗？

可以，但应有明确理由。`scope` 表达表头覆盖方向或分组，`headers` 显式列出关联目标。不要让两者互相矛盾，也不要在简单表里无目的地重复所有信息。

### Q5：`caption` 可以用 `aria-label` 代替吗？

不应把可见标题无理由替换为只在无障碍 API 中出现的名称。`caption` 对所有读者可见，并直接属于表格。复杂说明还可以使用可见段落和描述关系补充。

### Q6：`colgroup` 会自动把多级表头关联好吗？

不会。它定义列组；还需要正确的表头单元格、跨度和 `scope`，复杂情况再使用 `id`/`headers`。列定义也不会替你补齐缺失单元格。

### Q7：为什么不给每张复杂表都加 ARIA `grid`？

普通数据表使用原生 `table` 语义。ARIA `grid` 是具有特定键盘交互和状态管理要求的复合控件，不是“更高级的表格皮肤”。错误添加会制造额外行为义务。

### Q8：浏览器显示正常，为什么还要检查网格？

浏览器会尽力呈现错误结构，视觉上正常不代表表格模型没有缺格、错列或断开的表头引用。应同时检查 Elements、坐标矩阵和引用目标。

### Q9：`scope` 和 `headers` 写对后，表格就完全无障碍了吗？

不能这样下结论。它们解决的是结构关联的一部分。表格仍需清楚标题、可理解说明、合理复杂度、可读内容和目标辅助技术测试；小屏、键盘滚动、缩放与打印将在下一课继续处理。

## 13. 扩展阅读

资料与兼容性说明核验日期：2026-10-10。

- [WHATWG HTML Living Standard：Tabular data](https://html.spec.whatwg.org/multipage/tables.html)：核对表格内容模型、网格形成、表头关联、跨度和列组规则。
- [W3C WAI：Tables Tutorial](https://www.w3.org/WAI/tutorials/tables/)：理解数据表结构与可访问关系的整体方法。
- [W3C WAI：Tables with two headers](https://www.w3.org/WAI/tutorials/tables/two-headers/)：复习简单行表头和列表头。
- [W3C WAI：Tables with irregular headers](https://www.w3.org/WAI/tutorials/tables/irregular/)：核对 `rowgroup`、`colgroup` 与不规则表头。
- [W3C WAI：Tables with multi-level headers](https://www.w3.org/WAI/tutorials/tables/multi-level/)：核对唯一 `id` 和空格分隔的 `headers`，并比较拆表方案。
- [W3C WCAG 2.2：Understanding 1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)：理解为什么视觉关系还需要程序化确定。
- [MDN：`colgroup`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/colgroup)：核对放置顺序、`span` 内容限制和可作用的 CSS 范围。
- [MDN：`th`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/th)：复习 `scope`、`headers`、`colspan` 与 `rowspan`。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对整数分、UTC 时间和静态教学边界。

阅读规范时重点区分三类结论：

- **结构规则**：元素顺序、跨度和 ID 引用可以通过静态检查验证；
- **实现支持**：浏览器和辅助技术组合需要查兼容资料并实际测试；
- **用户体验**：即使结构合规，过度复杂的表仍可能难以理解，拆表常常更好。

## 我现在能做到什么

我能先判断内容是否真的需要行列交叉比较，再使用 `caption`、行组、表头和数据格建立表格。我还能计算合并单元格的实际坐标，用 `scope` 或唯一 `id`/`headers` 表达表头关系，并通过 DOM 证据定位重复 ID、断开引用和网格错位，而不会把属性存在误说成所有辅助技术输出一致。

## 单元导航

- [上一章：图片、媒体与嵌入](../03-images-media-embedding.md)
- [返回第四章入口](../04-tables-data.md)
- [下一课：表格无障碍、响应式与 DOM](02-table-accessibility-responsive-dom.md)
- [返回 HTML 模块](../README.md)
