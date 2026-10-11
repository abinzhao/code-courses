# 二维数据模型与表格基础结构

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 判断二维数据需求，建立 caption、行组、行和单元格组成的完整网格。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `TBL-001`、`TBL-002`、`TBL-003` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

判断二维数据需求，建立 caption、行组、行和单元格组成的完整网格。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 TBL-001（二维数据与非表格内容选择）、TBL-002（`table`、`caption`、行组）、TBL-003（`tr`、`th`、`td`）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

### 3.1 预备材料 1

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

### 4.5 `caption`、可见说明与表格复杂度

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

### 4.6 明确反例：表格不能用于页面布局

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

本课没有新增 JavaScript API。[本章第 5 课](05-table-dom-dynamic-rows.md)会处理 `HTMLTableElement`、行列集合和安全 DOM 生成。

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

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [合并单元格、网格坐标与列组](03-table-spans-column-groups.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 TBL-001（二维数据与非表格内容选择） 对应的元素、属性或状态；
- 在项目中实现并标出与 TBL-002（`table`、`caption`、行组） 对应的元素、属性或状态；
- 在项目中实现并标出与 TBL-003（`tr`、`th`、`td`） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`03-table-spans-column-groups.md`](03-table-spans-column-groups.md)。

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

## 9. 课后题

### 9.1 结构选择题

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

### 9.2 网格推理题

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

### 9.3 诊断题

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

## 11. 阶段验收

- [ ] `TBL-001`：二维数据与非表格内容选择
- [ ] `TBL-002`：`table`、`caption`、行组
- [ ] `TBL-003`：`tr`、`th`、`td`
- [ ] 能从空白文件独立复现本课最小案例；
- [ ] 至少保存一条浏览器证据和一次故障恢复记录；
- [ ] 能说明自动检查、人工检查与未验证环境的边界；
- [ ] 项目增量没有复制其他课程拥有的完整应用。

## 12. 常见问题

### Q2：每张表都必须有 `thead`、`tbody` 和 `tfoot` 吗？

不是。`tfoot` 只有确有汇总或尾部信息时才需要。简单表也可以省略部分行组，但教材和业务代码常显式写 `thead`、`tbody`，让结构和 DOM 更容易检查。

### Q5：`caption` 可以用 `aria-label` 代替吗？

不应把可见标题无理由替换为只在无障碍 API 中出现的名称。`caption` 对所有读者可见，并直接属于表格。复杂说明还可以使用可见段落和描述关系补充。

### Q7：为什么不给每张复杂表都加 ARIA `grid`？

普通数据表使用原生 `table` 语义。ARIA `grid` 是具有特定键盘交互和状态管理要求的复合控件，不是“更高级的表格皮肤”。错误添加会制造额外行为义务。

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
- [邻里集市项目契约](../../00-guide/project-contract.md)：核对整数分、UTC 时间和静态教学边界。

阅读规范时重点区分三类结论：

- **结构规则**：元素顺序、跨度和 ID 引用可以通过静态检查验证；
- **实现支持**：浏览器和辅助技术组合需要查兼容资料并实际测试；
- **用户体验**：即使结构合规，过度复杂的表仍可能难以理解，拆表常常更好。

## 我现在能做到什么

- 能解释并验证：判断二维数据需求，建立 caption、行组、行和单元格组成的完整网格。
- `TBL-001`：二维数据与非表格内容选择
- `TBL-002`：`table`、`caption`、行组
- `TBL-003`：`tr`、`th`、`td`
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[返回本章目录](../README.md#第四章表格与二维数据) · [下一课：表头关系、分组与显式关联](02-table-header-associations.md) · [返回 HTML 模块](../README.md)
