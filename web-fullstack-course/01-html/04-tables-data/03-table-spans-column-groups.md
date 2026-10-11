# 合并单元格、网格坐标与列组

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 推演 colspan、rowspan 对坐标的影响，并用 colgroup 和 col 描述列结构。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `TBL-006`、`TBL-007` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

推演 colspan、rowspan 对坐标的影响，并用 colgroup 和 col 描述列结构。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 TBL-006（`colspan`、`rowspan` 与网格位置）、TBL-007（`colgroup`、`col`）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `colspan` 与 `rowspan`：跨度会预占后续坐标

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

### 4.2 `colgroup` 与 `col`：定义列，不承载单元格内容

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

### 4.3 从简单结构开始，复杂度只增不减

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

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `TBL-006`：`colspan`、`rowspan` 与网格位置
- `TBL-007`：`colgroup`、`col`

## 6. 最小可运行案例

### 6.1 逐步扩展：从单层表头到多级表头

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

### 6.2 单元格网格坐标推演

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

### 8.1 跨度造成缺格或错列

- **现象**：某一数据行的价格显示在状态列下方。
- **证据**：按坐标表计算后，该行没有完整覆盖网格，或重复占用了已被 `rowspan` 预占的位置。
- **原因**：只数源代码标签，没有计算跨度。
- **修复**：从第一行开始重画坐标矩阵，删除重复格或补齐缺失格。
- **复验**：每一行在考虑纵向预占后都完整覆盖同一网格宽度。

## 9. 课后题

1. TBL-006（`colspan`、`rowspan` 与网格位置）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

选择一件与教材不同的邻里商品，完成一次迁移练习：

1. 先写内容关系、机器值或交互目标，不先写标签；
2. 用 TBL-006（`colspan`、`rowspan` 与网格位置）、TBL-007（`colgroup`、`col`） 实现最小页面；
3. 制造一个本课错误并保留失败证据；
4. 修复后重复键盘或开发者工具检查；
5. 在记录中解释为什么没有选择一个视觉相似的替代写法。

## 11. 阶段验收

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

### Q8：浏览器显示正常，为什么还要检查网格？

浏览器会尽力呈现错误结构，视觉上正常不代表表格模型没有缺格、错列或断开的表头引用。应同时检查 Elements、坐标矩阵和引用目标。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：推演 colspan、rowspan 对坐标的影响，并用 colgroup 和 col 描述列结构。
- `TBL-006`：`colspan`、`rowspan` 与网格位置
- `TBL-007`：`colgroup`、`col`
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：表头关系、分组与显式关联](02-table-header-associations.md) · [下一课：响应式表格、键盘访问与打印](04-responsive-table-accessibility-print.md) · [返回 HTML 模块](../README.md)
