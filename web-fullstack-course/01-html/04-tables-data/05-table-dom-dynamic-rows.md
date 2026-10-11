# 表格 DOM、安全更新与动态状态

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 使用表格 DOM API 安全创建、更新和删除行，并维护整数分、空状态和焦点。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `TBL-010`、`TBL-011` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

使用表格 DOM API 安全创建、更新和删除行，并维护整数分、空状态和焦点。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 TBL-010（HTMLTableElement 与 rows/cells 集合）、TBL-011（insert/delete row/cell 与安全生成）；
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
确认数据确实是二维关系
  → 保留原生 table 与行组结构
  → 让外层容器承担水平滚动
  → 决定容器是否需要进入 Tab 顺序
  → 为长内容和打印建立独立策略
  → 用整数分维护数据模型
  → 用 DOM API 和 textContent 生成行
  → 恢复 scope / headers 关系
  → 更新空状态、合计、状态消息与焦点
  → 用键盘、读屏、Elements、断言和打印预览验证
```

## 4. 核心理论

### 4.1 `HTMLTableElement` 的结构入口

取得表格：

```js
const table = document.querySelector("#comparison-table");
```

若它是 `<table>`，浏览器暴露 `HTMLTableElement` 接口。常用属性：

| 属性 | 返回值 | 关键点 |
| --- | --- | --- |
| `caption` | `HTMLTableCaptionElement` 或 `null` | 当前表格的 `caption` |
| `tHead` | `HTMLTableSectionElement` 或 `null` | 当前 `thead` |
| `tBodies` | `HTMLCollection` | 全部 `tbody`，是实时集合 |
| `tFoot` | `HTMLTableSectionElement` 或 `null` | 当前 `tfoot` |
| `rows` | `HTMLCollection` | 按表头、各表体、表尾的表格模型顺序汇总全部行 |

观察：

```js
table.caption?.textContent
table.tHead?.rows.length
table.tBodies.length
table.tFoot?.rows.length
table.rows.length
```

`table.rows` 会跨越行组汇总行。若只想操作数据体，使用：

```js
const body = table.tBodies[0];
body.rows.length;
```

不要用 `table.rows[1]` 猜“第一条数据”。只要新增第二层表头、空状态、另一个 `tbody` 或 `tfoot`，硬编码索引就会失效。

对应创建与删除结构的方法还包括：

```js
table.createCaption();
table.deleteCaption();
table.createTHead();
table.deleteTHead();
table.createTFoot();
table.deleteTFoot();
```

这些方法会复用现有对应元素或按接口规则创建元素，但它们不会替你写标题文字、表头单元格、`scope` 或 `headers`。

### 4.2 行组的 `rows` 与行的 `cells`

`thead`、`tbody` 和 `tfoot` 都实现 `HTMLTableSectionElement`。它们各自有实时 `rows` 集合：

```js
const body = table.tBodies[0];
const firstDataRow = body.rows[0];
```

每个 `tr` 是 `HTMLTableRowElement`，其 `cells` 是由该行所有 `th` 和 `td` 组成的实时集合：

```js
firstDataRow.cells.length;
firstDataRow.cells[0].tagName;
```

`cells` 不是只包含 `td`。如果第一格是行头 `th`，它也在集合中。

这些集合是“实时”的：

```js
const rows = body.rows;
const before = rows.length;

body.insertRow(-1);

console.assert(rows.length === before + 1);
```

变量 `rows` 没有重新赋值，但长度已经变化，因为它指向的是实时 `HTMLCollection`，不是创建时的数组快照。

需要固定快照时：

```js
const rowSnapshot = Array.from(body.rows);
```

之后再修改 DOM，`rowSnapshot.length` 不会自动变化，其中已移除的元素对象仍可能保留在数组中。

### 4.3 `insertRow()` 和 `deleteRow()`

表格和行组都提供 `insertRow()`/`deleteRow()`，但作用范围不同。

行组上插入最明确：

```js
const row = table.tBodies[0].insertRow(-1);
```

`-1` 表示追加到该行组末尾。也可以给出从 `0` 开始的索引：

```js
table.tBodies[0].insertRow(0);
```

删除：

```js
table.tBodies[0].deleteRow(-1);
```

表格级方法以 `table.rows` 的汇总顺序为索引：

```js
table.insertRow(-1);
table.deleteRow(0);
```

表格中存在多个行组时，表格级插入位置更容易被误解。若目标明确属于某个 `tbody`、`thead` 或 `tfoot`，优先在对应行组调用。

非法索引会抛出 `IndexSizeError`。例如空 `tbody` 上执行：

```js
body.deleteRow(0);
```

不能靠 `try...catch` 吞掉所有错误来掩盖状态问题，应先检查业务条件：

```js
if (body.rows.length > 0) {
  body.deleteRow(-1);
}
```

### 4.4 `insertCell()` 和 `deleteCell()`

行对象提供：

```js
const row = body.insertRow(-1);
const cell = row.insertCell(-1);
cell.textContent = "照明";
```

`insertCell()` 创建的是 `td`，不能通过参数要求它创建 `th`。行头应显式创建：

```js
const rowHeader = document.createElement("th");
rowHeader.scope = "row";
rowHeader.textContent = "可调光阅读台灯";
row.append(rowHeader);
```

删除最后一个单元格：

```js
row.deleteCell(-1);
```

删除第一个单元格：

```js
row.deleteCell(0);
```

同样，非法索引会抛出 `IndexSizeError`。动态删除列还会改变所有行的网格位置和表头关系；它不是只调用一次 `deleteCell()` 就完成的功能。生产代码应统一更新 `colgroup`、列头、所有数据行、合计行、`colspan` 和 `headers`。

### 4.5 实时集合中的删除陷阱

错误写法：

```js
// 错误案例：每删除一行，后续行会立即前移，i 又继续增加。
for (let i = 0; i < body.rows.length; i += 1) {
  body.deleteRow(i);
}
```

假设原来有 A、B、C、D：

1. `i = 0` 删除 A，集合立即变成 B、C、D；
2. `i = 1` 删除当前索引 1，也就是 C；
3. 集合剩 B、D，循环结束；
4. B 和 D 被漏掉。

可靠方式一：始终删除第一行。

```js
while (body.rows.length > 0) {
  body.deleteRow(0);
}
```

可靠方式二：从后向前。

```js
for (let i = body.rows.length - 1; i >= 0; i -= 1) {
  body.deleteRow(i);
}
```

可靠方式三：若需要分析原元素，先拍快照。

```js
for (const row of Array.from(body.rows)) {
  row.remove();
}
```

完整案例使用第一种，明确展示实时集合。

### 4.6 安全 DOM 生成：结构由代码创建，数据只作为文字

安全基线：

```js
const cell = row.insertCell(-1);
cell.textContent = listing.title;
```

若需要创建按钮：

```js
const button = document.createElement("button");
button.type = "button";
button.textContent = "删除";
button.dataset.action = "delete";
button.dataset.id = listing.id;
cell.append(button);
```

这里有清楚的信任边界：

- 元素名、属性名和按钮类型由程序固定；
- 商品标题、卖家名称等数据只赋给 `textContent`；
- 数据中的 `<`、`>`、`&` 和引号按文字显示；
- 不解析事件属性、脚本元素或任意嵌套 HTML。

本课规定：**用户数据绝不进入不安全的 `innerHTML`。**

明确的错误示例：

```js
// 错误案例：listing.title 或 listing.seller 可能来自用户输入。
body.innerHTML += `
  <tr>
    <th scope="row">${listing.title}</th>
    <td>${listing.seller}</td>
  </tr>
`;
```

问题不只是一类脚本注入：

- 输入会被当成 HTML 解析；
- `+=` 会重新序列化和解析原有子树；
- 已有元素引用、表单状态或事件监听可能受影响；
- 表头 ID 与 `headers` 很容易在字符串中写错；
- 代码审查难以区分固定结构和不可信数据；
- Content Security Policy 不是允许不安全拼接的理由。

若业务确实要渲染受控富文本，需要独立的内容模型、经过审查的清理策略和明确允许列表；不能把“富文本需求”扩大成任意商品数据都可以进入 `innerHTML`。

### 4.7 整数分与纯数据函数

货币不要直接依赖二进制浮点表示：

```js
0.1 + 0.2 === 0.3; // false
```

本课以分存储：

```js
const priceCents = 1999;
const quantity = 3;
const subtotalCents = priceCents * quantity; // 5997
```

只在展示边界格式化：

```js
const moneyFormatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY"
});

moneyFormatter.format(5997 / 100);
```

数据函数应先于 DOM 验证：

```js
function lineTotalCents(listing) {
  return listing.priceCents * listing.quantity;
}

function grandTotalCents(listings) {
  return listings.reduce(
    (sum, listing) => sum + lineTotalCents(listing),
    0
  );
}
```

整数分只能解决表示和加总问题，不自动解决：

- 税费与折扣顺序；
- 不同币种；
- 汇率；
- 四舍五入规则；
- 退款与负数；
- 服务端最终价格；
- 并发改价。

这些都需要业务契约。本课合计只是当前内存对比项的教学结果。

### 4.8 更新、删除与焦点恢复

动态更新要同时处理四个状态：

1. **数据状态**：数组中的对象被替换或删除；
2. **DOM 状态**：行、合计与空状态重新生成；
3. **通知状态**：`aria-live` 区域说明发生了什么；
4. **焦点状态**：触发按钮消失后，焦点移动到合理位置。

增加数量后，可以把焦点放回同一商品的“数量加一”按钮。删除一行后，原按钮不存在，可优先选择：

- 下一行的删除按钮；
- 如果没有下一行，上一行的删除按钮；
- 如果表格为空，放到“恢复初始数据”或“加入商品”按钮。

状态文字示例：

```html
<p id="table-status" role="status" aria-live="polite"></p>
```

`role="status"` 已隐含礼貌播报语义，再写 `aria-live="polite"` 是为了教学上显式观察；生产代码可以按团队约定避免冗余。状态文字应说明结果，不要一次播报整张表。

### 4.9 空状态仍然属于表格状态

删除全部数据后，不应只剩表头和 `¥0.00`。可以在 `tbody` 中加入一行：

```html
<tr>
  <td colspan="8">当前没有用于对比的商品。</td>
</tr>
```

它告诉视觉用户表格加载完成但数据为空。完整案例还会：

- 把总计更新为 0；
- 禁用“清空全部”按钮；
- 通过状态区域播报；
- 保留表头，使用户知道这张表原本比较什么；
- 提供恢复或新增入口。

空状态行不是伪造的一条商品，因此不会添加 `data-listing-id`，断言也会把它与真实数据行区分。

## 5. 元素、属性、API 或配置清单

### 5.1 表格 DOM 接口清单

| 所属对象 | 属性或方法 | 返回或行为 | 关键边界 |
| --- | --- | --- | --- |
| `HTMLTableElement` | `caption` | `caption` 元素或 `null` | 读取标题，不自动创建文字 |
| `HTMLTableElement` | `tHead` | `thead` 或 `null` | 只表示当前表头行组 |
| `HTMLTableElement` | `tBodies` | 实时 `HTMLCollection` | 可有多个 `tbody` |
| `HTMLTableElement` | `tFoot` | `tfoot` 或 `null` | DOM 位置与视觉顺序都应核对 |
| `HTMLTableElement` | `rows` | 全表行的实时集合 | 包含各行组，不等于数据行 |
| `HTMLTableElement` | `insertRow(index)` | 插入并返回 `tr` | 多行组时优先在明确 section 上操作 |
| `HTMLTableElement` | `deleteRow(index)` | 删除汇总索引处的行 | 非法索引抛 `IndexSizeError` |
| `HTMLTableSectionElement` | `rows` | 当前行组实时集合 | 适合限定 `tbody` |
| `HTMLTableSectionElement` | `insertRow(index)` | 在当前行组插入 `tr` | `-1` 表示末尾 |
| `HTMLTableSectionElement` | `deleteRow(index)` | 删除当前行组的行 | 删除时集合立即变化 |
| `HTMLTableRowElement` | `cells` | 当前行 `th` 与 `td` 的实时集合 | 不只包含 `td` |
| `HTMLTableRowElement` | `insertCell(index)` | 插入并返回 `td` | 不能创建 `th` |
| `HTMLTableRowElement` | `deleteCell(index)` | 删除当前行单元格 | 改列时要同步整张表关系 |
| `Document` | `createElement(name)` | 创建指定元素 | 元素类型来自程序固定值 |
| `Node` | `textContent` | 读写纯文字 | 用户数据的安全默认入口 |
| `Element` | `setAttribute()` | 设置属性 | `headers` 等 token 要经过业务约束 |
| `Element` | `append()` | 追加节点或文字 | 不解析 HTML 字符串 |
| `Array.from()` | `Array.from(collection)` | 创建静态数组快照 | 快照不随 DOM 自动增删 |

### 5.2 选择 API 的快速判断

```text
要读取整张表的所有行？
  → table.rows

只操作商品数据体？
  → table.tBodies[0].rows

要在商品数据体末尾加行？
  → table.tBodies[0].insertRow(-1)

要创建普通数据格？
  → row.insertCell(-1)

要创建行头 th？
  → document.createElement("th") + row.append(...)

要清空实时 rows 集合？
  → while (body.rows.length > 0) body.deleteRow(0)

要把用户标题放入单元格？
  → cell.textContent = title

要注入一段用户提供的 HTML？
  → 本课不允许；先重新确认产品和安全模型
```

## 6. 最小可运行案例

在个人练习目录中新建 `practice/05-table-dom-dynamic-rows/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 TBL-010（HTMLTableElement 与 rows/cells 集合） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 TBL-011（insert/delete row/cell 与安全生成） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

### 7.1 案例范围与可观察契约

文件位置：

```text
practice/html-04-responsive-table/market-table.html
```

运行方式：

```bash
cd practice/html-04-responsive-table
python3 -m http.server 8000
```

访问：

```text
http://127.0.0.1:8000/market-table.html
```

这个单文件案例提供：

- 三条初始商品；
- 以整数分存储的单价和总计；
- 动态增加数量；
- 动态删除行；
- 清空后的表内空状态；
- 恢复初始数据；
- 加入一条固定的渐进扩展商品；
- `caption`、`thead`、`tbody` 和 `tfoot`；
- 每个动态数据格的 `headers` 关系；
- `createElement()`、`textContent`、`insertRow()` 与 `insertCell()`；
- 数据断言和渲染后断言；
- 删除和重绘后的焦点恢复；
- `role="status"` 更新消息；
- 屏幕滚动与打印样式。

它明确不提供：

- Local Storage、数据库或任何持久化；
- 用户登录、身份认证或操作授权；
- 库存锁、价格锁或多人并发；
- 网络请求、支付、下单或真实删除；
- 跨标签页同步。

刷新页面就是恢复初始状态，这不是数据可靠性方案。

### 7.2 完整代码

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="邻里集市响应式商品对比表与安全 DOM 更新练习。">
  <title>商品对比表 · 邻里集市</title>
  <style>
    :root {
      color-scheme: light;
      font-family: system-ui, sans-serif;
      line-height: 1.6;
    }

    body {
      max-width: 76rem;
      margin: 0 auto;
      padding: 1rem;
      color: #172033;
      background: #f8fafc;
    }

    button {
      min-height: 2.75rem;
      padding: 0.5rem 0.75rem;
      font: inherit;
      color: #172033;
      background: #ffffff;
      border: 1px solid #64748b;
      border-radius: 0.375rem;
      cursor: pointer;
    }

    button:hover {
      background: #f1f5f9;
    }

    button:focus-visible,
    .table-region:focus-visible {
      outline: 3px solid #0f766e;
      outline-offset: 0.2rem;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-block: 1rem;
    }

    .scroll-help {
      max-width: 70ch;
    }

    .table-region {
      max-width: 100%;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      background: #ffffff;
      border: 2px solid #94a3b8;
      border-radius: 0.625rem;
      box-shadow: 0 0.25rem 1rem rgb(15 23 42 / 0.08);
    }

    table {
      width: 100%;
      min-width: 72rem;
      border-collapse: collapse;
      table-layout: auto;
    }

    caption {
      padding: 1rem;
      font-size: 1.125rem;
      font-weight: 700;
      text-align: left;
    }

    th,
    td {
      padding: 0.75rem;
      border: 1px solid #cbd5e1;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }

    thead {
      color: #0f172a;
      background: #dbeafe;
    }

    tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    tbody th[scope="row"] {
      min-width: 13rem;
    }

    .money,
    .quantity {
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .actions {
      min-width: 12rem;
    }

    .action-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .empty-state {
      padding: 2rem;
      text-align: center;
      color: #475569;
    }

    #table-status {
      min-height: 1.6em;
      font-weight: 600;
      color: #0f766e;
    }

    .boundary-note {
      padding: 0.75rem 1rem;
      background: #fff7ed;
      border-inline-start: 0.3rem solid #c2410c;
    }

    @media print {
      body {
        max-width: none;
        padding: 0;
        color: #000000;
        background: #ffffff;
      }

      .screen-only,
      .actions {
        display: none;
      }

      .table-region {
        overflow: visible;
        border: 0;
        box-shadow: none;
      }

      table {
        width: 100%;
        min-width: 0;
        table-layout: fixed;
        font-size: 9pt;
      }

      th,
      td {
        padding: 0.35rem;
        overflow-wrap: anywhere;
      }

      thead {
        display: table-header-group;
      }

      tr {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <main>
    <h1>邻里集市商品对比</h1>

    <p class="boundary-note">
      本页数据只保存在当前内存中。刷新后会恢复；
      本示例不实现持久化、认证、授权、并发控制或真实交易。
    </p>

    <div class="toolbar screen-only" role="group" aria-label="表格操作">
      <button id="add-desk" type="button">加入折叠学习桌</button>
      <button id="clear-all" type="button">清空全部对比项</button>
      <button id="restore-all" type="button">恢复初始数据</button>
    </div>

    <p id="scroll-help" class="scroll-help screen-only">
      表格较宽时可以横向滚动。
      键盘用户可先聚焦表格区域，再使用方向键查看右侧列。
      Tab 会继续进入每行按钮，也可以继续离开表格。
    </p>

    <p id="table-status"
       class="screen-only"
       role="status"
       aria-live="polite"></p>

    <div class="table-region"
         tabindex="0"
         role="region"
         aria-labelledby="comparison-caption"
         aria-describedby="scroll-help">
      <table id="comparison-table">
        <caption id="comparison-caption">
          当前对比商品（价格单位：人民币）
        </caption>
        <colgroup>
          <col>
          <col>
          <col>
          <col>
          <col>
          <col>
          <col>
          <col class="actions">
        </colgroup>
        <thead>
          <tr>
            <th id="col-title" scope="col">商品</th>
            <th id="col-category" scope="col">分类</th>
            <th id="col-seller" scope="col">卖家</th>
            <th id="col-condition" scope="col">状态</th>
            <th id="col-price" scope="col">单价</th>
            <th id="col-quantity" scope="col">数量</th>
            <th id="col-subtotal" scope="col">小计</th>
            <th id="col-actions" class="actions" scope="col">操作</th>
          </tr>
        </thead>
        <tbody id="listing-rows"></tbody>
        <tfoot>
          <tr>
            <th id="summary-label"
                scope="row"
                colspan="6">
              当前内存合计
            </th>
            <td id="grand-total"
                class="money"
                headers="summary-label col-subtotal">
              ¥0.00
            </td>
            <td class="actions" headers="summary-label col-actions">
              不含支付
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </main>

  <script>
    "use strict";

    function invariant(condition, message) {
      if (!condition) {
        throw new Error(`断言失败：${message}`);
      }
    }

    function validateListing(listing) {
      invariant(
        typeof listing.id === "string" && listing.id.length > 0,
        "商品必须有稳定字符串 ID"
      );
      invariant(
        typeof listing.title === "string" && listing.title.length > 0,
        "商品标题不能为空"
      );
      invariant(
        Number.isSafeInteger(listing.priceCents) &&
          listing.priceCents >= 0,
        "单价必须是非负安全整数分"
      );
      invariant(
        Number.isSafeInteger(listing.quantity) &&
          listing.quantity > 0,
        "数量必须是正安全整数"
      );
      return listing;
    }

    function validateListings(listings) {
      const ids = new Set();

      for (const listing of listings) {
        validateListing(listing);
        invariant(!ids.has(listing.id), `商品 ID 重复：${listing.id}`);
        ids.add(listing.id);
      }

      return listings;
    }

    function lineTotalCents(listing) {
      validateListing(listing);
      const result = listing.priceCents * listing.quantity;
      invariant(
        Number.isSafeInteger(result),
        `商品 ${listing.id} 的小计超出安全整数范围`
      );
      return result;
    }

    function grandTotalCents(listings) {
      validateListings(listings);

      return listings.reduce((sum, listing) => {
        const next = sum + lineTotalCents(listing);
        invariant(
          Number.isSafeInteger(next),
          "总计超出安全整数范围"
        );
        return next;
      }, 0);
    }

    function updateListing(listings, id, patch) {
      let found = false;
      const nextListings = listings.map((listing) => {
        if (listing.id !== id) {
          return { ...listing };
        }

        found = true;
        return validateListing({ ...listing, ...patch });
      });

      invariant(found, `找不到要更新的商品：${id}`);
      return validateListings(nextListings);
    }

    function removeListing(listings, id) {
      const nextListings = listings
        .filter((listing) => listing.id !== id)
        .map((listing) => ({ ...listing }));

      invariant(
        nextListings.length === listings.length - 1,
        `找不到要删除的商品：${id}`
      );
      return validateListings(nextListings);
    }

    (function runModelAssertions() {
      const fixture = [
        {
          id: "a",
          title: "测试商品 A",
          category: "测试",
          seller: "甲",
          condition: "正常",
          priceCents: 1999,
          quantity: 3
        },
        {
          id: "b",
          title: "测试商品 B",
          category: "测试",
          seller: "乙",
          condition: "正常",
          priceCents: 1,
          quantity: 2
        }
      ];

      invariant(lineTotalCents(fixture[0]) === 5997, "行小计应为 5997 分");
      invariant(grandTotalCents(fixture) === 5999, "总计应为 5999 分");

      const updated = updateListing(fixture, "a", { quantity: 4 });
      invariant(updated[0].quantity === 4, "更新后的数量应为 4");
      invariant(fixture[0].quantity === 3, "更新不应修改原数组对象");
      invariant(grandTotalCents(updated) === 7998, "更新后的总计应为 7998 分");

      const removed = removeListing(updated, "b");
      invariant(removed.length === 1, "删除后应剩一条数据");
      invariant(removed[0].id === "a", "删除后应保留商品 a");
    })();
  </script>

  <script>
    "use strict";

    const initialListings = [
      {
        id: "listing-lamp",
        title: "可调光阅读台灯",
        category: "照明",
        seller: "林阿姨",
        condition: "九成新，灯臂可调",
        priceCents: 3900,
        quantity: 1
      },
      {
        id: "listing-keyboard",
        title: "紧凑型机械键盘",
        category: "数码",
        seller: "周同学",
        condition: "键帽有轻微使用痕迹，编号 NM-KEYBOARD-2026-000028",
        priceCents: 12800,
        quantity: 1
      },
      {
        id: "listing-books",
        title: "前端基础书籍套装",
        category: "图书",
        seller: "王老师",
        condition: "共 3 本，内页有少量铅笔批注",
        priceCents: 6600,
        quantity: 2
      }
    ];

    const deskListing = {
      id: "listing-desk",
      title: "折叠学习桌",
      category: "家具",
      seller: "赵师傅",
      condition: "桌腿锁扣正常，只支持线下自提",
      priceCents: 8800,
      quantity: 1
    };

    const moneyFormatter = new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY"
    });

    const table = document.querySelector("#comparison-table");
    const body = table.tBodies[0];
    const totalCell = document.querySelector("#grand-total");
    const status = document.querySelector("#table-status");
    const addDeskButton = document.querySelector("#add-desk");
    const clearButton = document.querySelector("#clear-all");
    const restoreButton = document.querySelector("#restore-all");

    let listings = initialListings.map((listing) => ({ ...listing }));

    function formatCents(cents) {
      invariant(
        Number.isSafeInteger(cents),
        "格式化金额前必须得到安全整数分"
      );
      return moneyFormatter.format(cents / 100);
    }

    function rowHeaderId(listingId) {
      invariant(
        /^[a-z0-9-]+$/.test(listingId),
        "教学示例的商品 ID 只能包含小写字母、数字和连字符"
      );
      return `row-${listingId}`;
    }

    function setHeaders(cell, rowId, columnId) {
      cell.setAttribute("headers", `${rowId} ${columnId}`);
    }

    function appendDataCell(row, text, rowId, columnId, className = "") {
      const cell = row.insertCell(-1);
      cell.textContent = text;
      setHeaders(cell, rowId, columnId);

      if (className) {
        cell.className = className;
      }

      return cell;
    }

    function createActionButton(label, action, listingId) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.dataset.action = action;
      button.dataset.id = listingId;
      return button;
    }

    function appendListingRow(listing) {
      validateListing(listing);

      const row = body.insertRow(-1);
      row.dataset.listingId = listing.id;

      const rowId = rowHeaderId(listing.id);
      const rowHeader = document.createElement("th");
      rowHeader.id = rowId;
      rowHeader.scope = "row";
      rowHeader.textContent = listing.title;
      row.append(rowHeader);

      appendDataCell(
        row,
        listing.category,
        rowId,
        "col-category"
      );
      appendDataCell(
        row,
        listing.seller,
        rowId,
        "col-seller"
      );
      appendDataCell(
        row,
        listing.condition,
        rowId,
        "col-condition"
      );
      appendDataCell(
        row,
        formatCents(listing.priceCents),
        rowId,
        "col-price",
        "money"
      );
      appendDataCell(
        row,
        String(listing.quantity),
        rowId,
        "col-quantity",
        "quantity"
      );
      appendDataCell(
        row,
        formatCents(lineTotalCents(listing)),
        rowId,
        "col-subtotal",
        "money"
      );

      const actionCell = row.insertCell(-1);
      actionCell.className = "actions";
      setHeaders(actionCell, rowId, "col-actions");

      const actionGroup = document.createElement("div");
      actionGroup.className = "action-group";
      actionGroup.append(
        createActionButton(
          `${listing.title} 数量加一`,
          "increase",
          listing.id
        ),
        createActionButton(
          `删除 ${listing.title}`,
          "delete",
          listing.id
        )
      );
      actionCell.append(actionGroup);
    }

    function appendEmptyState() {
      const row = body.insertRow(-1);
      const cell = row.insertCell(-1);
      cell.colSpan = table.tHead.rows[0].cells.length;
      cell.className = "empty-state";
      cell.textContent = "当前没有用于对比的商品。可以加入折叠学习桌或恢复初始数据。";
    }

    function clearRenderedRows() {
      while (body.rows.length > 0) {
        body.deleteRow(0);
      }
    }

    function assertRenderedTable() {
      const columnHeaders = table.tHead.rows[0].cells;
      const dataRows = body.querySelectorAll("tr[data-listing-id]");

      invariant(table.caption !== null, "表格必须保留 caption");
      invariant(table.tHead !== null, "表格必须保留 thead");
      invariant(table.tBodies.length === 1, "示例应有一个 tbody");
      invariant(table.tFoot !== null, "表格必须保留 tfoot");
      invariant(columnHeaders.length === 8, "表头应有 8 列");
      invariant(
        dataRows.length === listings.length,
        "数据行数必须与内存数组一致"
      );
      invariant(
        body.rows.length === Math.max(1, listings.length),
        "tbody 应包含数据行或一条空状态行"
      );

      const idElements = [...document.querySelectorAll("[id]")];
      const duplicateIds = idElements
        .map((element) => element.id)
        .filter((id, index, ids) => ids.indexOf(id) !== index);
      invariant(
        duplicateIds.length === 0,
        `页面存在重复 ID：${[...new Set(duplicateIds)].join(", ")}`
      );

      for (const row of dataRows) {
        invariant(row.cells.length === 8, "每条商品行必须有 8 格");
        invariant(
          row.cells[0].tagName === "TH" &&
            row.cells[0].scope === "row",
          "每条商品行第一格必须是行头"
        );
      }

      for (const cell of table.querySelectorAll("[headers]")) {
        const headerIds = cell
          .getAttribute("headers")
          .trim()
          .split(/\s+/);

        for (const headerId of headerIds) {
          const matches = [...table.querySelectorAll("[id]")].filter(
            (element) => element.id === headerId
          );
          invariant(
            matches.length === 1,
            `headers 必须引用本表唯一 ID：${headerId}`
          );
          invariant(
            matches[0].tagName === "TH" &&
              matches[0].closest("table") === table,
            `headers 必须引用同一表格内的 th：${headerId}`
          );
        }
      }

      invariant(
        totalCell.textContent === formatCents(grandTotalCents(listings)),
        "页面总计必须与整数分模型一致"
      );
    }

    function render() {
      validateListings(listings);
      clearRenderedRows();

      if (listings.length === 0) {
        appendEmptyState();
      } else {
        for (const listing of listings) {
          appendListingRow(listing);
        }
      }

      totalCell.textContent = formatCents(grandTotalCents(listings));
      clearButton.disabled = listings.length === 0;
      addDeskButton.disabled = listings.some(
        (listing) => listing.id === deskListing.id
      );

      assertRenderedTable();
    }

    function findActionButton(listingId, action) {
      return Array.from(
        body.querySelectorAll("button[data-action]")
      ).find((button) => {
        return (
          button.dataset.id === listingId &&
          button.dataset.action === action
        );
      }) ?? null;
    }

    function focusAfterDelete(deletedIndex) {
      if (listings.length === 0) {
        restoreButton.focus();
        return;
      }

      const nextIndex = Math.min(deletedIndex, listings.length - 1);
      const nextListing = listings[nextIndex];
      const nextButton = findActionButton(nextListing.id, "delete");

      if (nextButton) {
        nextButton.focus();
      } else {
        restoreButton.focus();
      }
    }

    body.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");

      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      const { action, id } = button.dataset;
      const listing = listings.find((item) => item.id === id);

      invariant(listing !== undefined, `事件引用了不存在的商品：${id}`);

      if (action === "increase") {
        listings = updateListing(listings, id, {
          quantity: listing.quantity + 1
        });
        render();
        status.textContent = `${listing.title} 的数量已增加到 ${
          listing.quantity + 1
        }，当前总计 ${formatCents(grandTotalCents(listings))}。`;
        findActionButton(id, "increase")?.focus();
        return;
      }

      if (action === "delete") {
        const deletedIndex = listings.findIndex((item) => item.id === id);
        listings = removeListing(listings, id);
        render();
        status.textContent = `已从当前内存对比中删除 ${listing.title}。`;
        focusAfterDelete(deletedIndex);
        return;
      }

      invariant(false, `未知操作：${action}`);
    });

    addDeskButton.addEventListener("click", () => {
      invariant(
        !listings.some((listing) => listing.id === deskListing.id),
        "折叠学习桌不能重复加入"
      );

      listings = [...listings, { ...deskListing }];
      render();
      status.textContent = `已把 ${deskListing.title} 加入当前内存对比。`;
      findActionButton(deskListing.id, "increase")?.focus();
    });

    clearButton.addEventListener("click", () => {
      const removedCount = listings.length;
      listings = [];
      render();
      status.textContent = `已清空 ${removedCount} 条内存对比数据。`;
      restoreButton.focus();
    });

    restoreButton.addEventListener("click", () => {
      listings = initialListings.map((listing) => ({ ...listing }));
      render();
      status.textContent = "已恢复三条初始内存数据。";
      document.querySelector(".table-region").focus();
    });

    render();
  </script>
</body>
</html>
```

### 7.3 首次运行的预期结果

加载完成后：

- Console 没有未捕获异常；
- 表格显示三条商品；
- `tbody.rows.length` 为 3；
- `table.rows.length` 为 5，即表头 1 行、数据 3 行、表尾 1 行；

先故意从一条错误验收记录开始：**“初始总计为 ¥338.00。”** 不要因为它写在文档里就直接相信。逐项读取模型：

- 台灯：3900 分；
- 键盘：12800 分；
- 书籍：6600 × 2 = 13200 分。

再执行精确加总：

```text
3900 + 12800 + 13200 = 29900 分 = ¥299.00
```

因此错误记录不能通过，页面的正确初始总计应为 **¥299.00**。若你看到 `¥338.00`，它就是失败证据，而不是可以接受的显示差异。查看 `grandTotalCents(listings)` 和 `#grand-total`，定位是数据错误还是渲染错误。

本案例代码中的模型断言与渲染断言应让页面显示 `¥299.00`。这就是故障优先的阅读方式：先写出可证伪预期，再用整数分逐项复算，不凭视觉印象通过。

### 7.4 交互路径与预期

按顺序执行：

| 操作 | 内存变化 | 页面变化 | 焦点与通知 |
| --- | --- | --- | --- |
| 点击台灯“数量加一” | 台灯数量 1 → 2 | 台灯小计变为 ¥78.00，总计 ¥338.00 | 焦点回到同一增加按钮，播报新数量和总计 |
| 删除键盘 | 数组移除 `listing-keyboard` | 键盘行消失，总计 ¥210.00 | 焦点移到相邻行删除按钮 |
| 加入折叠学习桌 | 追加 8800 分商品 | 新行出现，总计 ¥298.00 | 焦点移到新行增加按钮 |
| 清空全部 | 数组变为 `[]` | 出现空状态，总计 ¥0.00 | 焦点到恢复按钮，播报删除数量 |
| 恢复初始数据 | 重建三条对象 | 回到初始三行与 ¥299.00 | 焦点到表格区域，播报恢复结果 |
| 刷新页面 | 重新执行脚本 | 回到初始三行 | 证明数据没有持久化 |

金额序列以先完成“台灯数量加一”为前提。若跳过某一步，后续总计会不同；应根据当时数组重新计算，而不是硬套表格。

### 7.5 Console 结构检查

运行：

```js
const comparison = document.querySelector("#comparison-table");

({
  caption: comparison.caption.textContent.trim(),
  headRows: comparison.tHead.rows.length,
  bodies: comparison.tBodies.length,
  bodyRows: comparison.tBodies[0].rows.length,
  footRows: comparison.tFoot.rows.length,
  allRows: comparison.rows.length,
  firstDataCells: comparison.tBodies[0].rows[0].cells.length
});
```

初始预期：

```text
caption: "当前对比商品（价格单位：人民币）"
headRows: 1
bodies: 1
bodyRows: 3
footRows: 1
allRows: 5
firstDataCells: 8
```

检查实时集合：

```js
const liveBodyRows = comparison.tBodies[0].rows;
const before = liveBodyRows.length;

document.querySelector("#clear-all").click();

console.assert(before === 3);
console.assert(liveBodyRows.length === 1);
console.assert(
  liveBodyRows[0].cells[0].textContent.includes("当前没有")
);
```

清空后长度是 1，不是 0，因为实现保留了一条空状态行。恢复：

```js
document.querySelector("#restore-all").click();
console.assert(liveBodyRows.length === 3);
```

变量 `liveBodyRows` 仍然指向同一个实时集合。

### 7.6 表头关系自动检查

选中第一条数据行：

```js
const firstRow = comparison.tBodies[0].rows[0];

Array.from(firstRow.cells, (cell) => ({
  tag: cell.tagName,
  text: cell.textContent.trim(),
  scope: cell.getAttribute("scope"),
  headers: cell.getAttribute("headers")
}));
```

预期：

- 第一格是 `TH`；
- 第一格有 `scope="row"`；
- 第一格 ID 是 `row-listing-lamp`；
- 分类格有 `headers="row-listing-lamp col-category"`；
- 单价格有 `headers="row-listing-lamp col-price"`；
- 操作格有 `headers="row-listing-lamp col-actions"`。

运行完整引用检查：

```js
for (const cell of comparison.querySelectorAll("[headers]")) {
  for (const id of cell.headers.split(/\s+/)) {
    console.assert(
      document.getElementById(id),
      `缺少表头 ID：${id}`
    );
  }
}
```

页面脚本已经执行同类断言。手动再做一次，是为了学会读取证据，而不是只信任应用没有报错。

### 7.7 安全字符串实验

在 Console 中不要使用 `innerHTML`，只改变内存对象后重绘：

```js
listings = updateListing(listings, "listing-lamp", {
  title: "<strong>不是粗体</strong>"
});
render();
```

预期：

- 页面显示字面文字 `<strong>不是粗体</strong>`；
- Elements 中行头没有新增 `strong` 元素；
- 行头 ID 仍由稳定业务 ID 生成；
- 表头引用断言仍通过；
- 没有执行任何标签或事件属性。

恢复：

```js
document.querySelector("#restore-all").click();
```

这个实验只证明当前渲染路径把标题当文字。它不证明所有其他输入通道都安全，生产系统仍需逐个检查 URL、属性、富文本、服务端存储和输出编码边界。

### 7.8 渐进扩展：从固定新增走向受控输入

当前“加入折叠学习桌”使用代码内固定对象，避免在本课提前引入完整表单验证。下一步可以增加一个表单，但必须保持以下契约：

1. 标题、分类、卖家和状态从表单读取后仍只进入 `textContent`；
2. 元单位价格不能直接存为浮点数，应在表单边界转换并验证为整数分；
3. `id` 由受控规则生成或由可信数据层提供，不能直接把任意标题拼进元素 ID；
4. 重复 ID 必须被模型断言拒绝；
5. 新增后调用同一个 `render()`，不复制另一套字符串模板；
6. 焦点移到新行的第一个合理操作，状态区播报新增结果；
7. 表单错误在表单附近显示，不把失败对象加入数组；
8. 仍然明确是内存数据，不能暗示已发布到平台。

表单提交、约束验证和成功控件将在下一章学习。本课只规定表格接收一个已经通过数据边界验证的对象。

### 7.9 文件、运行、预期与失败证据清单

| 项目 | 记录内容 |
| --- | --- |
| 文件 | `practice/html-04-responsive-table/market-table.html` |
| 运行 | `python3 -m http.server 8000`，访问对应 URL |
| 初始预期 | 3 行商品、8 列、总计 ¥299.00、Console 无异常 |
| 更新预期 | 台灯数量加一后小计 ¥78.00、总计 ¥338.00 |
| 删除预期 | 行数、总计、状态消息和焦点同时变化 |
| 空状态预期 | 1 条空状态行、总计 ¥0.00、清空按钮禁用 |
| 安全预期 | 标签字符串按文字显示，Elements 无新增标签 |
| 结构失败证据 | 断言异常、`rows.length`、`cells.length`、缺失 ID |
| 数据失败证据 | 整数分计算结果与页面文字不一致 |
| 操作失败证据 | 焦点落到 `body`、Tab 无法离开、按钮不可激活 |
| 打印失败证据 | 预览缺列、操作按钮残留、表头未按预期出现 |
| 未验证范围 | 写明未测试的浏览器、读屏软件、纸张或输入设备 |

## 8. 常见错误与排查路径

### 8.1 故障优先诊断法

不要先盲改 CSS 或重写渲染函数。按下面顺序记录：

```text
1. 复现最小失败
2. 写下预期与实际
3. 判断属于数据、DOM、样式、键盘、读屏还是打印
4. 读取最靠近根因的证据
5. 只修改一个假设
6. 重复原步骤
7. 增加回归断言或人工检查项
```

例如“总计错了”：

```js
console.table(listings);
console.log(listings.map(lineTotalCents));
console.log(grandTotalCents(listings));
console.log(document.querySelector("#grand-total").textContent);
```

先判断模型错还是显示错。不要一上来在 `formatCents()` 中随意加减金额。

### 8.2 表格在手机上撑宽整个页面

检查：

```js
const region = document.querySelector(".table-region");
({
  clientWidth: region.clientWidth,
  scrollWidth: region.scrollWidth,
  pageClientWidth: document.documentElement.clientWidth,
  pageScrollWidth: document.documentElement.scrollWidth
});
```

理想状态：

- `region.scrollWidth > region.clientWidth`，说明区域内部可滚；
- 页面 `scrollWidth` 不应明显大于页面 `clientWidth`。

若整页滚动：

1. 确认表格确实在 `.table-region` 内；
2. 确认容器 `max-width: 100%` 和 `overflow-x: auto` 生效；
3. 检查父级 flex/grid 子项是否缺少合适的收缩条件；
4. 查找页面上其他长字符串或固定宽元素；
5. 不要立即删除 `table` 的 `min-width`，否则可能只是把列压到不可读。

### 8.3 动态行有数据，却没有行头

错误：

```js
const firstCell = row.insertCell(-1);
firstCell.textContent = listing.title;
```

`insertCell()` 创建 `td`，不会创建 `th`。

修复：

```js
const rowHeader = document.createElement("th");
rowHeader.scope = "row";
rowHeader.textContent = listing.title;
row.append(rowHeader);
```

再检查：

```js
console.assert(row.cells[0].tagName === "TH");
console.assert(row.cells[0].scope === "row");
```

### 8.4 `headers` 指向不存在的 ID

制造故障：

```js
document.querySelector("#col-price").id = "col-unit-price";
```

现有价格格仍引用 `col-price`。执行：

```js
assertRenderedTable();
```

预期抛出：

```text
断言失败：headers 必须引用本表唯一 ID：col-price
```

恢复：

```js
document.querySelector("#col-unit-price").id = "col-price";
assertRenderedTable();
```

生产修复不是关闭断言，而是统一更新表头 ID 和所有关联单元格，并用读屏复验。

### 8.5 向前删除实时集合导致隔行残留

错误：

```js
for (let i = 0; i < body.rows.length; i += 1) {
  body.deleteRow(i);
}
```

失败证据：

```js
console.log(body.rows.length);
console.log(Array.from(body.rows, (row) => row.textContent.trim()));
```

修复：

```js
while (body.rows.length > 0) {
  body.deleteRow(0);
}
```

然后重新渲染并断言数据行数。

### 8.6 删除行后焦点丢失

现象：键盘激活“删除”后，下一次 Tab 从页面开头或不可预测位置继续。

证据：

```js
console.log(document.activeElement);
```

根因：触发按钮随整行被删除，浏览器无法保留焦点。

修复策略：

- 删除前记录业务 ID 和数组位置；
- 重绘后优先聚焦相邻行的同类按钮；
- 表格为空时聚焦恢复或新增按钮；
- 状态区播报删除结果；
- 不把焦点强制移到一个不可见或禁用元素。

### 8.7 用浮点元计算金额

错误：

```js
const total = 19.99 * 3;
```

即使格式化后“看起来”是两位小数，中间计算和复杂折扣仍可能积累误差。

修复：

```js
const totalCents = 1999 * 3;
console.assert(totalCents === 5997);
```

输入“19.99 元”如何转换成 1999 分属于表单数据边界，必须验证格式、最大值和舍入规则，不能简单 `parseFloat(value) * 100` 后假设永远是整数。

### 8.8 不安全 `innerHTML` 示例

错误代码：

```js
function appendUnsafeListing(listing) {
  body.innerHTML += `
    <tr>
      <th scope="row">${listing.title}</th>
      <td>${listing.seller}</td>
    </tr>
  `;
}
```

使用无执行能力的测试文字：

```js
const testTitle = "<strong>这应该是普通文字</strong>";
```

在错误实现中，它会被解析成 `strong` 元素；在正确实现中：

```js
const rowHeader = document.createElement("th");
rowHeader.scope = "row";
rowHeader.textContent = testTitle;
```

Elements 应只看到文本节点。不要为了演示而运行真实攻击载荷；标签被意外解析已经足以证明信任边界错误。

### 8.9 清空后没有空状态

证据：

```js
console.log(listings.length);
console.log(body.rows.length);
console.log(totalCell.textContent);
```

正确空状态：

```text
listings.length === 0
body.rows.length === 1
空状态文字存在
总计为 ¥0.00
清空按钮禁用
恢复按钮可用
```

不要把空状态行计入商品数组，也不要伪造价格为 0 的商品。

### 8.10 表格行数断言“多了一行”

先确认读取的是：

```js
table.rows.length;
```

还是：

```js
table.tBodies[0].rows.length;
```

前者包含 `thead`、`tbody` 和 `tfoot` 中的行。后者只包含指定 `tbody`。修复断言时要明确业务范围，不能为了得到期望数字随意减 2。

### 8.11 浏览器读出了列头，却没读出行头

检查：

1. 第一格是否真的是 `th`；
2. 是否有 `scope="row"`；
3. 行头 ID 是否唯一；
4. 数据格 `headers` 是否包含行头 ID；
5. CSS 是否改写了表格内部显示角色；
6. 当前读屏是否处于表格浏览模式；
7. 测试组合、版本和按键是否记录正确。

若结构自动检查都通过但读屏结果不符合预期，不要随意堆叠 ARIA。先建立最小复现，比较另一浏览器/读屏组合，再查目标辅助技术的支持情况。

## 9. 课后题

### 9.1 实时集合

题目：为什么保存到变量中的 `const rows = tbody.rows` 会在插入行后自动改变长度？

<details>
<summary>参考答案</summary>

`rows` 是实时 `HTMLCollection`，反映当前 DOM，不是创建时的数组快照。`const` 只表示变量引用不重新赋值，不表示集合内容不可变。需要静态快照时使用 `Array.from(tbody.rows)`。

</details>

### 9.2 行头为什么不能用 `insertCell()`

题目：动态行第一格是商品名，为什么不直接 `row.insertCell(0)`？

<details>
<summary>参考答案</summary>

`insertCell()` 创建 `td`，而商品名在这张表中承担行头，应使用 `document.createElement("th")`，设置 `scope="row"`、唯一 ID 和文字，再插入行。视觉加粗不能把 `td` 变成行头。

</details>

### 9.3 删除实时集合

题目：有四行时，为什么 `for (let i = 0; i < rows.length; i++) deleteRow(i)` 可能只删除两行？

<details>
<summary>参考答案</summary>

删除后后续元素立即前移，而索引仍递增。删除原第 0 行后，原第 1 行变成新第 0 行，但循环转到 1，于是跳过它。可持续删除索引 0、从后向前删除，或先拍快照。

</details>

### 9.4 金额计算

题目：单价 66 元、数量 2，数据模型和显示边界分别保存什么？

<details>
<summary>参考答案</summary>

模型保存 `priceCents: 6600` 和 `quantity: 2`，小计为整数 `13200` 分。显示时才把 `13200 / 100` 交给人民币格式化器，得到类似 `¥132.00` 的本地化文字。显示字符串不再参与加总。

</details>

### 9.5 `headers` 的动态契约

题目：新增 `listing-desk` 行时，价格格至少应关联哪些表头？

<details>
<summary>参考答案</summary>

若行头 ID 为 `row-listing-desk`，列头 ID 为 `col-price`，价格格可写：

```html
<td headers="row-listing-desk col-price">¥88.00</td>
```

还要确保两个 ID 在文档中存在且唯一，行头是 `th scope="row"`。

</details>

### 9.6 为什么不能用 `innerHTML +=`

题目：除了注入风险，`tbody.innerHTML += ...` 还有什么维护问题？

<details>
<summary>参考答案</summary>

它会把字符串作为 HTML 解析，固定结构和数据边界混在一起；`+=` 还可能重新解析原子树，影响已有元素引用、状态或监听器。表头 ID、`headers`、按钮属性和转义规则也更难审查。应使用结构化 DOM API和 `textContent`。

</details>

### 9.7 空状态为什么保留一行

题目：数组为空时，`tbody.rows.length` 为什么可以是 1？

<details>
<summary>参考答案</summary>

实现可以放一条跨越全部列的空状态行，说明数据加载完成但没有商品。它没有 `data-listing-id`，不计入模型数据行。断言应分别检查数据行数量和总行数，而不是把所有 `tr` 都当商品。

</details>

### 9.8 本课案例能否处理两个人同时删一件商品

题目：为什么不能？

<details>
<summary>参考答案</summary>

所有数据只在一个页面的 JavaScript 数组中，没有服务器、持久化、用户身份、版本号、事务或冲突检测。按钮只改变当前标签页。并发一致性必须由后端数据契约和授权流程实现，不能从这张教学表推导。

</details>

## 10. 实践练习

### 10.1 故障注入级：同时修复表头断链和不安全字符串

先复制完整案例为 `exercise-fault.html`，再制造两个故障。

故障一：

```js
document.querySelector("#col-price").id = "price";
```

故障二，把 `appendListingRow()` 中的安全创建临时替换成：

```js
// 故障代码，只使用无执行能力的标签文字进行观察。
body.innerHTML += `
  <tr>
    <th scope="row">${listing.title}</th>
    <td>${listing.seller}</td>
  </tr>
`;
```

测试数据：

```js
const harmlessMarkupText = "<strong>应按文字显示</strong>";
```

要求留下：

1. `assertRenderedTable()` 的原始异常；
2. 找不到 `col-price` 的 DOM 证据；
3. Elements 中意外出现 `strong` 的证据；
4. 修复后的表头 ID 和 `headers`；
5. 改回 `createElement()`/`textContent` 的代码；
6. 修复后无 `strong` 子元素的断言；
7. 键盘更新、删除与打印预览回归结果。

#### 参考修复

恢复表头：

```js
document.querySelector("#price").id = "col-price";
```

恢复安全行头：

```js
const rowHeader = document.createElement("th");
rowHeader.id = rowHeaderId(listing.id);
rowHeader.scope = "row";
rowHeader.textContent = listing.title;
row.append(rowHeader);
```

验证：

```js
assertRenderedTable();

const renderedRowHeader = document.querySelector(
  `tr[data-listing-id="${listings[0].id}"] th[scope="row"]`
);

console.assert(renderedRowHeader.querySelector("strong") === null);
console.assert(
  renderedRowHeader.textContent.includes("<strong>")
);
```

上面的属性选择器只用于受控教学 ID。生产代码若把不可信值插入选择器，应使用结构化查找或正确的 CSS 转义，不能把 DOM 安全与选择器安全混为一谈。

#### 故障注入级完成标准

- 能说明两个故障属于不同边界：一个是关系完整性，一个是 HTML 解析；
- 没有通过删除断言来“修复”；
- 没有对测试字符串做手工替换或正则剥标签；
- 所有用户文字回到 `textContent`；
- 全部 `headers` token 都指向存在且唯一的表头；
- 更新、删除、空状态、焦点和打印均复验；
- 记录修复前后证据，而不是只交最终截图。

## 11. 阶段验收

### 11.1 必做成果

- [ ] 能解释为什么外层滚动不会改变内层表格语义。
- [ ] 表格保留 `caption`、`thead`、`tbody`、`tfoot`、`th` 和 `td`。
- [ ] 没有用 `display: block`、`grid` 或 `flex` 拆散表格内部结构。
- [ ] 在 320 CSS 像素附近，滚动发生在表格包装层而不是整页。
- [ ] 滚动层进入焦点顺序时，有清楚名称、说明和 `:focus-visible` 样式。
- [ ] Tab 可以进入，也可以离开滚动区域。
- [ ] 已记录方向键或目标环境实际可用的横向键盘滚动方式。
- [ ] 200% 缩放后文字可读、内容可达。
- [ ] 长标题、长编号或长 URL 不覆盖其他单元格。
- [ ] 能比较 `table-layout: auto` 与 `fixed`，并说明当前选择。
- [ ] 打印预览解除 `overflow` 裁切并显示全部关键列。
- [ ] 已检查打印表头、分页和隐藏操作列的结果。
- [ ] 能读取 `caption`、`tHead`、`tBodies`、`tFoot` 和全表 `rows`。
- [ ] 能区分 `table.rows`、section `rows` 和 row `cells`。
- [ ] 能演示实时集合随 DOM 修改立即变化。
- [ ] 使用 `insertRow()`/`deleteRow()` 增删行。
- [ ] 使用 `insertCell()`/`deleteCell()` 增删普通数据格。
- [ ] 行头通过 `createElement("th")` 创建，而不是把 `td` 画粗。
- [ ] 清空行时没有因向前删除实时集合而漏项。
- [ ] 所有用户数据通过 `textContent` 进入页面。
- [ ] 没有用不安全 `innerHTML` 生成用户数据。
- [ ] 单价、小计和总计均使用整数分。
- [ ] 纯模型断言覆盖小计、总计、更新、不修改原数组和删除。
- [ ] 渲染断言覆盖行数、格数、表头结构和 `headers` 引用。
- [ ] 删除最后一条数据后有空状态、零总计和状态通知。
- [ ] 删除或重绘后焦点移动到合理位置。
- [ ] 动态数据格保留列头和行头关系。
- [ ] 已完成真实键盘范围检查。
- [ ] 已完成至少一组真实屏幕阅读器范围检查，或明确记录未完成原因。
- [ ] 能说明页面刷新会丢失数据。
- [ ] 没有把示例描述成拥有持久化、认证、授权或并发控制。

### 11.2 屏幕阅读器人工范围检查

至少选择一组你实际可用的组合，例如：

- macOS + Safari + VoiceOver；
- Windows + Firefox 或 Chrome + NVDA。

不要把一种组合的结果写成所有环境的保证。

检查范围：

1. 进入区域时是否读出“当前对比商品”一类名称；
2. 进入表格时是否读出表格标题和大致行列信息；
3. 移动到单价格时是否能获得“单价”列头；
4. 移动到某商品价格时是否能获得对应商品行头；
5. 长说明是否按完整文字可读，而不是只有视觉省略；
6. “数量加一”和“删除”按钮名称是否包含商品名称；
7. 激活更新后，状态区是否播报数量和总计；
8. 删除行后，焦点位置是否可理解；
9. 清空后是否能读到空状态与零总计；
10. 恢复后表格导航是否仍有正确行列关系；
11. 若临时启用错误 `display` 覆盖，表格导航是否退化；
12. 恢复样式后是否回归。

记录模板：

```text
读屏软件与版本：
浏览器与版本：
区域名称：
表格标题和行列：
价格格播报的列头：
价格格播报的行头：
更新通知：
删除后的焦点：
空状态：
未符合预期的项目：
修复与复验：
```

### 11.3 自动与文件证据

应保留：

```text
练习文件路径：
启动命令：
访问 URL：
初始总计：
纯函数断言结果：
渲染断言结果：
table.rows / tbody.rows / row.cells：
缺失 headers 故障：
innerHTML 故障：
修复后 Elements：
320px 结果：
200% 缩放结果：
打印预览结果：
键盘检查：
读屏检查：
未验证范围：
```

### 11.4 一票否决项

出现以下任一项，不能判定本课通过：

- 小屏通过删除关键列、缩小到不可读字体或隐藏核心内容“解决”；
- 用块级重排拆散表格，却没有重新验证表头和读屏；
- 滚动区只能用鼠标或触控操作；
- 移除了所有焦点轮廓；
- 表头 ID 重复或 `headers` 指向不存在元素；
- 动态第一格只是视觉加粗的 `td`，却声称它是行头；
- 用户数据进入不安全的 `innerHTML`；
- 用正则替换尖括号冒充完整 HTML 安全方案；
- 金额用浮点元作为核心加总模型；
- 删除测试或放宽断言来掩盖错误；
- 空数组显示成“仍在加载”或完全空白，没有状态说明；
- 删除后焦点不可预测且未记录；
- 打印预览缺少关键列却仍宣称通过；
- 把刷新后丢失的内存数组描述成已保存；
- 声称示例已经实现认证、授权、支付、持久化或并发控制。

### 11.5 自我讲解验收

不看正文，用五分钟回答：

1. 为什么滚动容器在 `table` 外面？
2. `tabindex="0"` 解决了什么，又增加了什么成本？
3. 长内容、`table-layout` 和水平滚动如何配合？
4. 为什么打印媒体要解除 `overflow` 和 `min-width`？
5. `table.rows` 与 `tbody.rows` 有什么不同？
6. 为什么 `cells` 中可能包含 `th`？
7. 为什么向前删除实时集合会漏行？
8. `insertCell()` 为什么不能创建行头？
9. 动态价格格如何关联商品行头和价格列头？
10. 为什么 `textContent` 是用户文字的默认安全入口？
11. 为什么金额使用整数分？
12. 删除按钮自身消失后，焦点应该去哪里？
13. 空状态行为什么不属于商品数组？
14. 本课为什么不能处理两位用户同时修改？

任何一题只能背 API 名称，不能说明行为、证据和边界时，都应回到对应小节重新实验。

## 12. 常见问题

### Q2：可以只给 `table` 写 `overflow-x: auto` 吗？

不建议把它作为基础方案。表格参与特殊布局，外层普通块容器更容易形成可约束、可聚焦、可命名的滚动盒。应以实际 `scrollWidth`、`clientWidth` 和目标浏览器测试为证据。

### Q6：能否把滚动说明放进 `aria-label`？

区域名称应简洁说明“它是什么”，操作提示更适合可见文字并通过 `aria-describedby` 关联。把长说明全部塞进 `aria-label` 会覆盖其他命名来源，并可能造成重复播报。

### Q8：为什么不对所有格使用 `white-space: nowrap`？

它会让长标题和说明不断撑宽表格。只对金额、短日期等确实应保持一行的紧凑数据使用，并确保整体仍可读。

### Q11：浏览器会自动插入 `tbody` 吗？

HTML 解析器处理表格标记时可能在 DOM 中补出 `tbody`，即使源代码省略了它。为了结构清楚和脚本稳定，教材示例显式写出 `tbody`，脚本仍通过 `table.tBodies[0]` 取得真实 DOM。

### Q12：`table.rows` 的顺序为什么不能直接当数据数组？

它包含不同 section 的行，是 DOM 结构视图，不是业务数据模型。表头、表尾、空状态和多个 `tbody` 都会改变索引。业务对象应保存在独立数组中，以稳定 ID 连接 DOM。

### Q13：`HTMLCollection` 可以直接使用 `map()` 吗？

通常不可以直接当数组使用。可先转换：

```js
const texts = Array.from(body.rows, (row) => row.textContent.trim());
```

转换结果是静态数组，不再自动反映后续 DOM 变化。

### Q14：为什么不用 `innerText`？

`textContent` 直接处理节点文字，不依赖布局计算，也不会解析 HTML。`innerText` 更接近渲染后的可见文本，会受 CSS 和布局影响。安全写入普通用户文字时，`textContent` 是清楚的默认选择。

### Q15：`textContent` 能让所有属性都安全吗？

不能。它适合文本节点。URL、类名、ID、`data-*`、样式和其他属性各有自己的语法与信任边界。完整案例只允许受控 ID 格式，并把任意标题放进文字，不把标题拼进选择器或属性。

### Q16：为什么按钮的可访问名称包含商品标题？

表中重复出现多个“删除”时，只读按钮列表无法区分目标。`删除 可调光阅读台灯` 说明具体对象。视觉文案若只想显示“删除”，也可以用可见文字与屏幕阅读器专用文字组合，但必须验证名称。

### Q17：更新时重新渲染整张 `tbody` 是否浪费？

对三四行教学数据，它让状态和断言清楚。大型表格可能需要局部更新、虚拟化或服务端分页，但那些方案会引入焦点、读屏、行计数和缓存的新问题，应基于测量决定。本课不提前建立复杂框架。

### Q18：可以使用 `row.remove()` 代替 `deleteRow()` 吗？

可以删除该节点，但本课特意练习表格接口和实时集合。真实代码应选择最清楚、符合现有模式的 API，并确保数据模型、合计、空状态和焦点同步更新。

### Q19：空状态应该放在表格外还是表格内？

两种方案都可能合理。表内跨列行能在表格位置直接说明“当前无数据”；表外状态可以在完全不渲染表格时更简洁。关键是不要让用户看到无解释的空壳，并保持辅助技术能获得状态。当前案例选择保留表头和表内空状态。

### Q20：为什么更新使用新对象而不是原地改 `listing.quantity++`？

返回新数组和新对象使纯函数断言更容易证明原输入未被修改，也减少隐式共享状态。它不是所有项目的唯一写法，但适合本课把模型更新与 DOM 渲染分开。

### Q21：整数分能支持所有货币吗？

不能简单假设所有货币都是两位小数。不同币种有不同最小单位和业务舍入规则。本课固定为人民币教学数据，`priceCents` 契约只适用于这个范围。

### Q22：为什么断言不能代替屏幕阅读器测试？

断言能检查元素、属性、ID 和计算结果，不能完整模拟浏览器可访问树、读屏模式、播报顺序、快捷键冲突和用户体验。自动证据与真实辅助技术检查互补。

### Q23：能用 CSS `::before` 给每个格显示列名吗？

可以作为视觉辅助，但生成内容不应成为唯一表头。DOM 中仍需真实 `th`、`scope` 或 `headers`，并验证目标辅助技术。若视觉变成卡片，还要检查阅读顺序和重复内容。

### Q24：示例刷新后恢复，能否加 Local Storage？

那会引入序列化、版本迁移、跨标签页事件、隐私和数据过期等新课题。本课明确保持内存状态。持久化应在相应课程中按独立契约实现，而不是用一行 `localStorage` 假装完成数据层。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：使用表格 DOM API 安全创建、更新和删除行，并维护整数分、空状态和焦点。
- `TBL-010`：HTMLTableElement 与 rows/cells 集合
- `TBL-011`：insert/delete row/cell 与安全生成
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：响应式表格、键盘访问与打印](04-responsive-table-accessibility-print.md) · [下一章](../05-forms-validation.md) · [返回 HTML 模块](../README.md)
