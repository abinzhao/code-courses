# 表头关系、分组与显式关联

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 使用 scope、id 和 headers 建立简单、分组与复杂表头关系。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `TBL-004`、`TBL-005` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

使用 scope、id 和 headers 建立简单、分组与复杂表头关系。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 TBL-004（`scope` 的 row/col/rowgroup/colgroup）、TBL-005（`id`、`headers` 复杂关联）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 简单关联：`scope="row"` 与 `scope="col"`

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

### 4.2 分组关联：`scope="rowgroup"` 与 `scope="colgroup"`

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

### 4.3 复杂关联：`id` 与 `headers`

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

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `TBL-004`：`scope` 的 row/col/rowgroup/colgroup
- `TBL-005`：`id`、`headers` 复杂关联

## 6. 最小可运行案例

### 6.1 故障实验：破坏 `headers` 与 `id`

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

本章的完整项目代码集中在 [合并单元格、网格坐标与列组](03-table-spans-column-groups.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 TBL-004（`scope` 的 row/col/rowgroup/colgroup） 对应的元素、属性或状态；
- 在项目中实现并标出与 TBL-005（`id`、`headers` 复杂关联） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`03-table-spans-column-groups.md`](03-table-spans-column-groups.md)。

## 8. 常见错误与排查路径

### 8.1 `scope` 的分组值没有真实分组

- **现象**：任意跨两行的表头都写 `scope="rowgroup"`，但所有数据只有一个混合 `tbody`。
- **证据**：业务分组边界与行组结构不一致。
- **原因**：把 `rowspan` 等同于行组。
- **修复**：先按真实业务组拆分 `tbody`，再让组表头位于对应行组；没有组时使用更简单结构。
- **复验**：每个行组表头只解释其所在组。

### 8.2 `headers` 拼错、缺失或跨表

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

### 8.3 重复 ID

- **现象**：两个列表头都使用 `id="price"`。
- **证据**：`document.querySelectorAll("#price").length` 大于 1。
- **原因**：误以为 ID 只需在各自表格内唯一。
- **修复**：使用带表格前缀的唯一 ID，并同步更新所有 `headers`。
- **复验**：全部 `[id]` 数量等于 ID 集合大小，所有引用仍有目标。

### 8.4 对 `col` 的样式能力期望过高

- **现象**：给 `col` 设置 `padding` 和 `text-align`，单元格没有变化。
- **证据**：Elements 显示 `td`/`th` 不是 `col` 的后代。
- **原因**：把列定义误当成单元格父容器。
- **修复**：直接选中目标单元格设置内边距和对齐；只把 `col` 用于适合的列背景、宽度等能力。
- **复验**：样式规则实际匹配 `th`/`td`，结构列数仍正确。

### 8.5 把结构正确等同于所有辅助技术表现一致

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

## 10. 实践练习

### 10.1 进阶：加入行组与多级列表头

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

### 10.2 故障注入：制造三类静默错误

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

## 12. 常见问题

### Q3：有 `th` 以后还要写 `scope` 吗？

用户代理可以对部分简单表推断关联，但明确的 `scope="row"`/`scope="col"` 能表达作者意图，也便于审查。复杂表则需要根据实际结构选择分组 `scope` 或显式 `headers`，不能机械套用。

### Q4：能同时使用 `scope` 和 `headers` 吗？

可以，但应有明确理由。`scope` 表达表头覆盖方向或分组，`headers` 显式列出关联目标。不要让两者互相矛盾，也不要在简单表里无目的地重复所有信息。

### Q6：`colgroup` 会自动把多级表头关联好吗？

不会。它定义列组；还需要正确的表头单元格、跨度和 `scope`，复杂情况再使用 `id`/`headers`。列定义也不会替你补齐缺失单元格。

### Q9：`scope` 和 `headers` 写对后，表格就完全无障碍了吗？

不能这样下结论。它们解决的是结构关联的一部分。表格仍需清楚标题、可理解说明、合理复杂度、可读内容和目标辅助技术测试；小屏、键盘滚动、缩放与打印将在[本章第 4 课](04-responsive-table-accessibility-print.md)继续处理。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：使用 scope、id 和 headers 建立简单、分组与复杂表头关系。
- `TBL-004`：`scope` 的 row/col/rowgroup/colgroup
- `TBL-005`：`id`、`headers` 复杂关联
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：二维数据模型与表格基础结构](01-table-model-structure.md) · [下一课：合并单元格、网格坐标与列组](03-table-spans-column-groups.md) · [返回 HTML 模块](../README.md)
