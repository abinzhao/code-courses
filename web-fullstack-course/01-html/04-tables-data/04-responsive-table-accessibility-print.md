# 响应式表格、键盘访问与打印

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 在窄屏、键盘、读屏与打印场景中保持二维关系和可见事实。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `TBL-008`、`TBL-009` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

在窄屏、键盘、读屏与打印场景中保持二维关系和可见事实。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 TBL-008（小屏滚动、长内容和打印）、TBL-009（键盘、读屏与表头测试）；
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
practice/
└── html-04-responsive-table/
    ├── minimal.html
    └── market-table.html
```

### 3.2 预备材料 2

```bash
cd practice/html-04-responsive-table
python3 -m http.server 8000
```

### 3.3 预备材料 3

```text
http://127.0.0.1:8000/minimal.html
http://127.0.0.1:8000/market-table.html
```

### 3.4 预备材料 4

```js
{
  id: "listing-lamp",
  title: "可调光阅读台灯",
  category: "照明",
  seller: "林阿姨",
  condition: "九成新",
  priceCents: 3900,
  quantity: 1
}
```

## 4. 核心理论

### 4.1 响应式不是把表格伪装成卡片

一张商品对比表的意义来自两个方向：

- 横向：同一列中的值共享一个列头，例如“单价”；
- 纵向：同一行中的值属于同一件商品，并可能共享一个行头，例如“可调光阅读台灯”。

如果把 `tr` 和 `td` 全部设为 `display: block`，视觉上可能得到一叠卡片，但浏览器的表格布局算法不再按原方式工作。更严重的是：

- 视觉顺序可能与 DOM 中的行列关系不一致；
- CSS `::before { content: "单价" }` 生成的文字不等于可靠的表头关联；
- 不同浏览器与辅助技术对改写 `display` 后的可访问树处理可能不同；
- 合并单元格、复杂表头和打印重复表头更难保持；
- 每个断点都需要重新证明内容顺序和表头关系。

因此，通用基线是：

```html
<div class="table-region">
  <table>
    ...
  </table>
</div>
```

CSS 让 `.table-region` 滚动：

```css
.table-region {
  overflow-x: auto;
}

.table-region table {
  min-width: 48rem;
}
```

`table` 仍然是表格，滚动只是查看它的方式。

如果业务最终决定在小屏提供卡片视图，应把它当成另一份经过内容设计与无障碍验证的呈现，而不是用几条 CSS 声称原表格已经等价转换。还要避免让表格和卡片两份内容同时被辅助技术读取。

### 4.2 为什么滚动的是外层容器

`overflow-x` 只有在元素形成受约束的滚动盒时才会产生预期结果。表格自身参与特殊的表格布局，把滚动职责放在外层普通块容器上更清楚：

```css
.table-region {
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
}
```

外层容器承担：

- 限制可见宽度；
- 提供横向滚动条；
- 接收键盘焦点；
- 显示焦点轮廓；
- 在需要时提供“可横向滚动”的说明。

内层表格承担：

- 保持行、列、表头与数据格；
- 计算列宽；
- 在桌面和打印中继续使用表格布局；
- 向辅助技术暴露二维结构。

不要给表格加 `role="presentation"` 或 `role="none"` 来“修复”布局。那会主动移除表格语义。

### 4.3 滚动容器是否应该有 `tabindex="0"`

只用键盘的用户必须有办法横向移动滚动区域。显式添加 `tabindex="0"` 是一种可预测的做法：

```html
<div class="table-region"
     tabindex="0"
     role="region"
     aria-labelledby="comparison-caption"
     aria-describedby="scroll-help">
  <table>
    <caption id="comparison-caption">邻里集市商品对比</caption>
    ...
  </table>
</div>
```

它的收益是：

- 容器进入顺序焦点导航；
- 聚焦后，浏览器通常允许使用方向键或 Shift+滚轮滚动；
- `:focus-visible` 可以明确当前操作对象；
- 区域名称和说明可以提示“这是哪张表、如何查看右侧内容”。

它也有成本：

- 页面多一个 Tab 停靠点；
- 表格内还有按钮时，用户会先停在容器，再停到每个按钮；
- 用同一个 `caption` 同时命名区域和表格，进入区域再进入表格时可能重复听到标题；
- `role="region"` 过多会让读屏的区域列表变得嘈杂；
- 某些平台、浏览器和辅助技术的滚动键行为不同，必须实测；
- 添加焦点不等于自动宣布滚动位置或列数。

决策方法：

1. 若表格在目标尺寸下确实会横向溢出，并且键盘没有其他可靠滚动方式，给容器添加 `tabindex="0"`。
2. 为它提供清晰的 `:focus-visible` 样式。
3. 使用已有可见文字命名区域，优先 `aria-labelledby`，不要凭空重复一段冗长 `aria-label`。
4. 只有重要的独立区域才使用 `role="region"`。
5. 实测 Tab 能进入，也能继续 Tab 离开；不要监听按键并阻止默认行为形成焦点陷阱。
6. 如果目标浏览器已经让该滚动区域以合适方式可聚焦，也要评估显式 `tabindex` 是否产生重复停靠；以目标环境证据为准。

若实际读屏测试出现重复标题，可让区域引用表格上方的简短可见标题，`caption` 继续准确命名表格；不要通过删除 `caption` 消除重复。

辅助说明应保持简短：

```html
<p id="scroll-help">
  表格较宽时可横向滚动；键盘用户聚焦表格区域后可使用方向键。
</p>
```

说明本身不能代替可操作性。

### 4.4 焦点样式和滚动边界

可聚焦容器必须看得见焦点：

```css
.table-region:focus-visible {
  outline: 3px solid #0f766e;
  outline-offset: 0.25rem;
}
```

不要全局写：

```css
/* 错误案例：移除证据，却没有等价替代 */
*:focus {
  outline: none;
}
```

`overscroll-behavior-inline: contain` 可以减少横向滚动到边缘时把外层页面一起带动的现象，但它不是所有输入设备的一致保证。触控板、触屏、滚轮和键盘都要分别观察。

若左侧行头在滚动中必须持续可见，可以评估 `position: sticky`，但这会增加：

- 堆叠上下文和背景遮盖问题；
- 放大时可视区域过窄；
- 阴影或边框重叠；
- 打印样式恢复成本。

本课不把粘性列作为基础要求。先让所有内容可达，再决定是否需要增强。

### 4.5 长内容：允许换行，而不是隐藏事实

长标题、URL、订单号和连续字符可能撑宽一整列。基础策略是：

```css
th,
td {
  overflow-wrap: anywhere;
}
```

`overflow-wrap: anywhere` 允许浏览器在正常断词点不足时换行。它比对全部内容使用 `word-break: break-all` 更克制；后者可能在任意字符间断开中文以外的词、编号和代码，使阅读困难。

还可以按内容类型处理：

| 内容 | 推荐策略 | 不推荐策略 |
| --- | --- | --- |
| 自然语言标题 | 正常换行，必要时 `overflow-wrap` | 全部 `white-space: nowrap` |
| 可读 URL | 提供短而有意义的链接文字 | 把完整追踪 URL 塞进单元格 |
| 长编号 | 在可接受边界插入 `<wbr>` 或允许换行 | 缩小字体到不可读 |
| 金额 | 可对金额单元格 `white-space: nowrap` | 给整张表禁止换行 |
| 核心说明 | 展示完整文字 | 只用省略号并依赖 `title` |

`text-overflow: ellipsis` 会隐藏内容。`title` 属性在触屏、键盘和辅助技术中的可用性不稳定，不能作为访问完整核心数据的唯一方式。若产品必须截断，应提供可聚焦的展开机制或详情入口，并验证完整内容可达。

### 4.6 `table-layout: auto` 与 `fixed`

默认布局：

```css
table {
  table-layout: auto;
}
```

浏览器会综合单元格内容、列约束和可用宽度计算列宽。优点是内容驱动、自然；代价是长内容可能显著影响整表宽度，加载新行时列宽也可能变化。

固定布局：

```css
table {
  width: 100%;
  table-layout: fixed;
}
```

固定算法主要依据表格宽度、列宽提示和首行信息分配列宽，通常更快、更稳定。但它不是“自动防溢出”：

- 需要一个可计算的表格宽度；
- 长内容仍可能溢出；
- 必须同时定义换行或裁切策略；
- 各列平均分配未必符合业务重要性；
- `min-width` 和容器宽度会共同影响最终结果。

可以用 `colgroup` 给列提供宽度意图：

```html
<colgroup>
  <col class="column-title">
  <col class="column-price">
  <col class="column-actions">
</colgroup>
```

```css
.column-title {
  width: 34%;
}

.column-price {
  width: 8rem;
}

.column-actions {
  width: 11rem;
}
```

选择原则：

- 列数少、内容差异大、希望自然适配：先用 `auto`。
- 列宽必须稳定、已有明确宽度分配：评估 `fixed`。
- 小屏仍需容纳很多列：无论哪种算法，都可能需要外层水平滚动。
- 不要为追求“没有滚动条”把文字压缩到不可读。

### 4.7 打印不是截取屏幕滚动盒

屏幕上的滚动容器在打印时可能裁掉右侧内容。打印样式应解除滚动限制：

```css
@media print {
  .table-region {
    overflow: visible;
    border: 0;
  }

  table {
    width: 100%;
    min-width: 0;
    table-layout: fixed;
  }

  th,
  td {
    overflow-wrap: anywhere;
  }

  thead {
    display: table-header-group;
  }

  tr {
    break-inside: avoid;
  }

  .screen-only {
    display: none;
  }
}
```

需要理解边界：

- 打印引擎、纸张、页边距和缩放设置会影响分页；
- `break-inside: avoid` 是分页提示，不保证每个超高行都不拆分；
- 浏览器常会重复 `thead`，但仍要在目标浏览器打印预览中确认；
- `tfoot` 是否在每页重复、重复到哪里，存在实现差异；
- 隐藏操作按钮后，表头也应避免留下无意义的“操作”空列；
- 颜色和背景可能因用户关闭“打印背景”而消失；
- 打印不能依赖滚动、悬停或点击展开才能看到核心数据。

完整案例使用 `colgroup` 和 `.actions` 类，在打印时隐藏操作列，并通过 `colspan` 的现有结构保留合计。若生产表格需要严谨票据排版，应单独设计打印文档，而不是只给交互页面加几条样式。

### 4.8 不要随意覆盖表格内部 `display`

这些元素有内部表格显示角色：

| HTML 元素 | 常见 CSS 内部角色 |
| --- | --- |
| `table` | `table` |
| `thead` | `table-header-group` |
| `tbody` | `table-row-group` |
| `tfoot` | `table-footer-group` |
| `tr` | `table-row` |
| `th`、`td` | `table-cell` |

以下“响应式技巧”风险很高：

```css
/* 错误案例：视觉重排不再保持原表格布局模型 */
@media (max-width: 40rem) {
  table,
  thead,
  tbody,
  tr,
  th,
  td {
    display: block;
  }
}
```

CSS `display` 与可访问树的关系受浏览器实现影响，不能简单断言“改了 display 就一定彻底失去语义”，也不能反过来假设“HTML 标签还在就一定完全正常”。可靠做法是：

1. 基础方案不覆盖内部显示角色；
2. 若确有视觉重排需求，重新检查 DOM 顺序、表头关系、读屏导航与打印；
3. 不用 `role="table"`、`role="row"`、`role="cell"` 给已经被任意重排的结构草率打补丁；
4. 在真实浏览器和辅助技术组合中验证，而不是只看开发者工具标签名。

### 4.9 保持 `caption` 和表头关系

`caption` 是表格的标题，不只是视觉装饰：

```html
<table>
  <caption>邻里集市商品对比（价格单位：人民币）</caption>
  ...
</table>
```

简单表格优先使用：

```html
<th scope="col">单价</th>
<th scope="row">可调光阅读台灯</th>
```

当表格有多级表头、合并格，或需要明确可审计的关联时，使用唯一表头 ID 和 `headers`：

```html
<th id="col-price" scope="col">单价</th>
<th id="row-listing-lamp" scope="row">可调光阅读台灯</th>
<td headers="row-listing-lamp col-price">¥39.00</td>
```

动态增加一行时，必须同时生成：

1. 唯一的行头 `id`；
2. 行头上的 `scope="row"`；
3. 每个数据格引用当前行头和对应列头的 `headers`；
4. 不与已有元素冲突的 ID；
5. 与 DOM 中真实列顺序一致的引用。

只更新文字、不改变列结构时，不要删除原表头。排序只改变行顺序时，行头 ID 可以跟着同一业务对象移动；不要用当前数组下标生成不稳定 ID。

## 5. 元素、属性、API 或配置清单

### 5.1 响应式与无障碍清单

| 名称 | 最小写法 | 作用 | 关键边界 |
| --- | --- | --- | --- |
| 滚动包装层 | `<div class="table-region">` | 把滚动职责与表格语义分开 | 不要替代 `table` |
| `overflow-x` | `overflow-x: auto` | 需要时显示横向滚动 | 打印时通常应恢复 `visible` |
| `max-width` | `max-width: 100%` | 不超过父容器可用宽度 | 不能代替表格自身宽度策略 |
| `min-width` | `table { min-width: 52rem; }` | 保住各列最低可读空间 | 小屏会触发滚动，打印时需重置 |
| `tabindex` | `tabindex="0"` | 让滚动区进入 Tab 顺序 | 多一个停靠点，必须有焦点样式并实测 |
| `role="region"` | `role="region"` | 把重要滚动区暴露为命名区域 | 不要给每个普通容器都加 |
| `aria-labelledby` | `aria-labelledby="caption-id"` | 使用已有文字命名区域 | 引用 ID 必须存在且唯一 |
| `aria-describedby` | `aria-describedby="scroll-help"` | 关联简短操作说明 | 不能代替实际键盘支持 |
| `caption` | `<caption id="...">` | 给表格命名 | 不要只用旁边普通段落替代 |
| `scope` | `scope="col"` / `"row"` | 简单表格的表头方向 | 复杂表格可能需要 `headers` |
| `headers` | `headers="row-a col-price"` | 显式列出关联表头 ID | 每个 token 都必须指向真实表头 |
| `overflow-wrap` | `overflow-wrap: anywhere` | 长连续内容必要时换行 | 不等于隐藏或截断 |
| `table-layout` | `auto` / `fixed` | 选择列宽算法 | `fixed` 仍需宽度和溢出策略 |
| `@media print` | `@media print { ... }` | 为纸张解除屏幕裁切 | 必须看打印预览 |
| `:focus-visible` | `.table-region:focus-visible` | 显示键盘焦点 | 不要无替代地移除轮廓 |
| `role="status"` | `<p role="status">` | 播报更新结果 | 不要塞入整张表或频繁噪声 |

## 6. 最小可运行案例

### 6.1 案例目标、文件与运行方式

这个案例只验证四件事：

1. 窄视口时滚动外层容器；
2. 表格内部元素保持原生显示角色；
3. 长内容可以换行；
4. 打印时解除滚动裁切。

文件位置：

```text
practice/html-04-responsive-table/minimal.html
```

运行方式：

```bash
cd practice/html-04-responsive-table
python3 -m http.server 8000
```

访问：

```text
http://127.0.0.1:8000/minimal.html
```

完整代码：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>响应式表格最小观察</title>
  <style>
    body {
      font-family: sans-serif;
      line-height: 1.6;
      max-width: 64rem;
      margin: 0 auto;
      padding: 1rem;
    }

    .table-region {
      max-width: 100%;
      overflow-x: auto;
      border: 2px solid #94a3b8;
      border-radius: 0.5rem;
    }

    .table-region:focus-visible {
      outline: 3px solid #0f766e;
      outline-offset: 0.25rem;
    }

    table {
      width: 100%;
      min-width: 48rem;
      border-collapse: collapse;
    }

    caption {
      padding: 0.75rem;
      font-weight: 700;
      text-align: left;
    }

    th,
    td {
      border: 1px solid #94a3b8;
      padding: 0.75rem;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }

    thead {
      background: #e2e8f0;
    }

    .money {
      white-space: nowrap;
    }

    @media print {
      .scroll-help {
        display: none;
      }

      .table-region {
        overflow: visible;
        border: 0;
      }

      table {
        min-width: 0;
        table-layout: fixed;
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
    <h1>商品对比</h1>
    <p id="scroll-help" class="scroll-help">
      视口较窄时，聚焦下方表格区域后可使用方向键横向滚动。
    </p>

    <div class="table-region"
         tabindex="0"
         role="region"
         aria-labelledby="minimal-caption"
         aria-describedby="scroll-help">
      <table id="minimal-table">
        <caption id="minimal-caption">
          邻里集市商品对比（价格单位：人民币）
        </caption>
        <thead>
          <tr>
            <th scope="col">商品</th>
            <th scope="col">分类</th>
            <th scope="col">状态</th>
            <th scope="col">卖家说明</th>
            <th scope="col">单价</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">可调光阅读台灯</th>
            <td>照明</td>
            <td>九成新</td>
            <td>
              灯臂可调，编号为
              NM-LIGHT-2026-VERY-LONG-IDENTIFIER-0001，
              建议在社区公共区域通电检查。
            </td>
            <td class="money">¥39.00</td>
          </tr>
          <tr>
            <th scope="row">折叠学习桌</th>
            <td>家具</td>
            <td>有使用痕迹</td>
            <td>桌腿锁扣正常；展开后宽 80 厘米，不提供邮寄。</td>
            <td class="money">¥88.00</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</body>
</html>
```

### 6.2 屏幕预期结果

把浏览器内容区缩到约 320 CSS 像素宽，或者在响应式设备工具中选择相近宽度：

- 页面本身不应因为表格而产生明显的整页横向滚动；
- `.table-region` 内出现横向滚动能力；
- 表格仍有五列，没有被拆成一列卡片；
- Tab 可以聚焦滚动区域；
- 焦点处出现清晰绿色轮廓；
- 聚焦后，左右方向键在常见桌面浏览器中应能改变横向位置；
- 再按 Tab 能离开容器，不出现焦点陷阱；
- 长编号能换行，不覆盖相邻单元格；
- 金额保持在一行。

若方向键被浏览器、系统或读屏快捷键占用，记录环境与实际结果，再尝试 Shift+滚轮、触控板或读屏的交互/浏览模式。验收要求是键盘用户有经过实测的可达方式，不是假设所有组合按键完全一致。

### 6.3 DOM 观察

在 Console 输入：

```js
const table = document.querySelector("#minimal-table");

console.log(table instanceof HTMLTableElement);
console.log(table.caption.textContent.trim());
console.log(table.tHead.rows.length);
console.log(table.tBodies.length);
console.log(table.tBodies[0].rows.length);
console.log(table.tFoot);
console.log(table.rows.length);
console.log(table.tBodies[0].rows[0].cells.length);
```

预期：

```text
true
邻里集市商品对比（价格单位：人民币）
1
1
2
null
3
5
```

`table.rows.length` 是 3，因为它包含 1 行表头和 2 行数据；`tbody.rows.length` 才是 2。

继续观察实时集合：

```js
const body = table.tBodies[0];
const liveRows = body.rows;
const addedRow = body.insertRow(-1);

const rowHeader = document.createElement("th");
rowHeader.scope = "row";
rowHeader.textContent = "临时测试商品";
addedRow.append(rowHeader);

for (const value of ["测试分类", "测试状态", "测试说明", "¥1.00"]) {
  const cell = addedRow.insertCell(-1);
  cell.textContent = value;
}

console.assert(liveRows.length === 3);
console.assert(addedRow.cells.length === 5);

addedRow.deleteCell(-1);
console.assert(addedRow.cells.length === 4);

body.deleteRow(-1);
console.assert(liveRows.length === 2);
```

预期结果：

- 临时行短暂出现在表格末尾；
- `liveRows` 无需重新查询就从 2 变为 3，再回到 2；
- `insertCell()` 创建数据格；
- `deleteCell(-1)` 删除临时行最后一格；
- `deleteRow(-1)` 删除临时行；
- 最终页面恢复为两条商品。

### 6.4 打印预期结果

打开浏览器打印预览，不必真的使用纸张：

1. 表格不再显示滚动边框和滚动裁切；
2. 五列都进入可打印区域；
3. 操作提示段落被隐藏；
4. 长编号换行；
5. 表头在发生分页时应检查是否重复；
6. 没有哪一列只能通过“横向滚动”查看。

打印预览受纸张方向、边距和缩放影响。若纵向放不下五列，可先记录失败，再比较横向纸张；不要为了通过而删除数据列。

### 6.5 失败证据与恢复

| 现象 | 优先证据 | 常见根因 | 恢复 |
| --- | --- | --- | --- |
| 整个页面横向滚动 | Elements 查看谁的 `scrollWidth > clientWidth` | 包装层没有约束，或表格不在包装层中 | 确认 `max-width: 100%` 与 `overflow-x: auto` |
| Tab 跳过滚动区 | Elements 检查 `tabindex` | 属性缺失、拼写错误或元素被隐藏 | 恢复 `tabindex="0"` 并刷新 |
| 聚焦后看不见位置 | Styles 查看焦点规则 | 删除了 outline，没有替代 | 添加 `:focus-visible` 轮廓 |
| 长编号覆盖下一列 | Computed 查看换行属性 | 使用 `white-space: nowrap` 或无断行策略 | 对普通单元格使用 `overflow-wrap: anywhere` |
| 打印缺少右侧列 | 打印媒体下查看 `.table-region` | `overflow` 仍裁切，`min-width` 未重置 | 在 `@media print` 中恢复可见并重置宽度 |
| Console 的行数比预想多 1 | 对比 `table.rows` 与 `tbody.rows` | 把表头行当成数据行 | 限定到目标行组 |
| 临时行只有 4 格 | 检查是否执行了删除单元格实验 | `deleteCell(-1)` 已运行 | 继续执行 `deleteRow(-1)` 恢复整行 |

恢复完成后，重新加载 `minimal.html`，确认 Console 没有异常，表格仍是两条数据。

### 6.6 渐进扩展：比较 `auto` 与 `fixed`

先在默认状态记录每列宽度：

```js
Array.from(
  document.querySelector("#minimal-table").tHead.rows[0].cells,
  (cell) => Math.round(cell.getBoundingClientRect().width)
);
```

然后临时添加：

```css
table {
  table-layout: fixed;
}
```

重新加载并记录同一数组。比较：

- 长说明是否还主导列宽；
- 商品名称是否变得过窄；
- 长编号是否换行；
- 320 CSS 像素视口下滚动宽度是否改变；
- 打印预览是否更稳定。

没有一组固定像素是通用正确答案。完成标准是能用测量结果说明两种算法的差异，并选择与当前内容匹配的方案。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [表格 DOM、安全更新与动态状态](05-table-dom-dynamic-rows.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 TBL-008（小屏滚动、长内容和打印） 对应的元素、属性或状态；
- 在项目中实现并标出与 TBL-009（键盘、读屏与表头测试） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`05-table-dom-dynamic-rows.md`](05-table-dom-dynamic-rows.md)。

## 8. 常见错误与排查路径

### 8.1 滚动区可以看见，却不能只用键盘操作

证据：

- Tab 顺序是否到达容器；
- `document.activeElement` 是否是 `.table-region`；
- `scrollLeft` 在按键前后是否变化；
- 焦点轮廓是否可见；
- 是否有脚本对 `keydown` 调用了不必要的 `preventDefault()`。

Console：

```js
const region = document.querySelector(".table-region");
region.focus();
console.log(document.activeElement === region);
console.log(region.scrollLeft, region.scrollWidth, region.clientWidth);
```

修复：

- 在确有溢出时使用 `tabindex="0"`；
- 添加 `:focus-visible`；
- 保留原生按键默认行为；
- 提供简短说明；
- 在目标浏览器与读屏模式中实测。

不要实现左右箭头“焦点陷阱”，也不要让 Tab 永远困在表格里。

### 8.2 使用 `display: block` 后视觉正常，读屏关系混乱

失败样式：

```css
thead,
tbody,
tr,
th,
td {
  display: block;
}
```

诊断：

1. 在 Styles 中禁用这些规则；
2. 观察浏览器无障碍树中的角色是否变化；
3. 用读屏的表格导航命令检查行列数；
4. 移动到价格格，检查是否读出商品行头和价格列头；
5. 打印预览检查表头和列对齐。

基础修复是恢复内部表格显示角色，让外层容器滚动。若产品必须使用卡片，应作为独立视图重新设计和验证，不把 CSS 伪元素当表头。

### 8.3 `table-layout: fixed` 后文字重叠

根因通常不是固定布局“坏了”，而是只改变算法，没有定义内容策略。

检查：

- 表格是否有明确 `width`；
- 单元格是否有 `white-space: nowrap`；
- 是否缺少 `overflow-wrap`；
- 某些列是否需要 `colgroup` 宽度；
- 是否把操作按钮塞进过窄列。

修复选择：

- 恢复 `auto`；
- 为关键列分配宽度；
- 允许普通文字换行；
- 把非关键操作移出表格或减少按钮文案；
- 仍然过宽时保留水平滚动。

### 8.4 打印只出现左半张表

先在打印媒体模拟或打印预览中检查：

```text
.table-region 的 overflow
table 的 min-width
纸张方向和边距
操作列是否隐藏
长内容是否允许换行
```

修复：

```css
@media print {
  .table-region {
    overflow: visible;
  }

  table {
    min-width: 0;
    width: 100%;
    table-layout: fixed;
  }
}
```

如果列仍太多，记录业务决策：横向纸张、分拆打印表、减少打印列或提供专用导出。不要悄悄让右侧列消失。

## 9. 课后题

### 9.1 为什么滚动层放在表格外面

题目：为什么不直接把所有 `td` 改成块级元素来适配手机？

<details>
<summary>参考答案</summary>

二维数据依赖行列关系。外层滚动容器只改变查看方式，内部仍保留原生表格布局、`caption`、表头和单元格关系。把内部元素改成块级会重排行列，CSS 伪标签不等于可靠表头，还要重新验证读屏、DOM 顺序和打印。若需要卡片，应把它作为独立视图设计。

</details>

### 9.2 `tabindex="0"` 的收益与成本

题目：给滚动容器加 `tabindex="0"` 后，为什么仍不能直接宣布“键盘无障碍完成”？

<details>
<summary>参考答案</summary>

它让容器进入 Tab 顺序，但还要验证焦点可见、按键能实际滚动、Tab 能离开、区域有名称、没有过多停靠点，并在目标浏览器和读屏模式中测试。表格内有按钮时还会多一次停靠，这是可用性成本。

</details>

### 9.3 `auto` 与 `fixed`

题目：`table-layout: fixed` 是否能自动解决长内容溢出？

<details>
<summary>参考答案</summary>

不能。固定算法使列宽更多依赖表格宽度、列提示和首行，但长字符串仍可能溢出。还需要明确宽度、`overflow-wrap`、列宽分配或滚动策略。内容主导且列宽差异大时，`auto` 可能更合适。

</details>

### 9.4 打印为什么要重置 `overflow`

题目：屏幕滚动容器若保持 `overflow-x: auto`，打印会有什么风险？

<details>
<summary>参考答案</summary>

打印引擎可能只输出滚动盒当前可见宽度，右侧列被裁切。打印媒体中应恢复 `overflow: visible`，重置表格 `min-width`，选择合适布局并检查预览。纸张方向和分页仍需实测。

</details>

## 10. 实践练习

所有练习都在个人目录 `practice/html-04-responsive-table/` 中完成。保留一份能工作的版本；故障注入后必须恢复并重复原检查。

### 10.1 基础级：建立可滚动的静态对比表

要求：

1. 创建 `exercise-basic.html`；
2. 至少包含 4 列、3 条商品；
3. 有 `caption`、列头和每行行头；
4. 外层容器负责 `overflow-x: auto`；
5. 表格最小宽度大于 40rem；
6. 容器可聚焦、有可访问名称和可见焦点；
7. 一条商品说明包含至少 60 个连续英文字符；
8. 长内容不覆盖邻列；
9. 打印媒体解除滚动裁切；
10. 提交 320 CSS 像素、200% 缩放和打印预览三类证据。

#### 参考实现骨架

```html
<p id="exercise-help">
  表格较宽时，聚焦区域后可横向滚动。
</p>

<div class="table-region"
     tabindex="0"
     role="region"
     aria-labelledby="exercise-caption"
     aria-describedby="exercise-help">
  <table>
    <caption id="exercise-caption">练习商品对比</caption>
    <thead>
      <tr>
        <th scope="col">商品</th>
        <th scope="col">分类</th>
        <th scope="col">说明</th>
        <th scope="col">单价</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">阅读灯</th>
        <td>照明</td>
        <td>LONG-CONTENT-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789-TEST</td>
        <td>¥39.00</td>
      </tr>
    </tbody>
  </table>
</div>
```

```css
.table-region {
  max-width: 100%;
  overflow-x: auto;
}

.table-region:focus-visible {
  outline: 3px solid #0f766e;
}

table {
  min-width: 44rem;
  border-collapse: collapse;
}

th,
td {
  overflow-wrap: anywhere;
}

@media print {
  .table-region {
    overflow: visible;
  }

  table {
    width: 100%;
    min-width: 0;
    table-layout: fixed;
  }
}
```

#### 基础级完成标准

- Elements 中内部仍是原生表格结构；
- Tab 能进入和离开滚动区；
- `document.activeElement` 能证明容器获得焦点；
- 区域内部滚动，不造成整页明显横向滚动；
- 长字符串换行；
- 每个数据格可以根据 `scope` 找到列头和行头；
- 打印预览中所有列可见；
- 记录浏览器和版本。

### 10.2 进阶级：增加排序但保持稳定关系

在完整案例中增加“按小计从高到低排序”按钮。

要求：

1. 排序返回新数组，不原地修改初始数据；
2. 使用 `lineTotalCents()` 比较整数分；
3. 总计排序前后不变；
4. 行头 ID 仍来自稳定商品 ID，不使用数组下标；
5. 每格 `headers` 仍指向真实 ID；
6. 排序后把焦点放回排序按钮；
7. 状态区播报“已按小计从高到低排序”；
8. 连续排序不会生成重复行或重复 ID；
9. 刷新后恢复初始顺序，明确没有持久化。

#### 参考答案

HTML：

```html
<button id="sort-by-subtotal" type="button">
  按小计从高到低排序
</button>
```

JavaScript：

```js
const sortButton = document.querySelector("#sort-by-subtotal");

sortButton.addEventListener("click", () => {
  const totalBefore = grandTotalCents(listings);

  listings = [...listings].sort((left, right) => {
    return lineTotalCents(right) - lineTotalCents(left);
  });

  invariant(
    grandTotalCents(listings) === totalBefore,
    "排序不能改变总计"
  );

  render();
  status.textContent = "已按小计从高到低排序。";
  sortButton.focus();
});
```

#### 进阶级完成标准

- 排序结果与每行小计一致；
- 总计不变；
- `new Set(listings.map(item => item.id)).size === listings.length`；
- `assertRenderedTable()` 通过；
- 读屏移动到排序后的价格格时仍能获得正确行头与列头；
- 焦点不丢失；
- 打印预览按新顺序展示，但刷新后恢复。

## 11. 阶段验收

### 11.1 键盘人工范围检查

记录浏览器、版本、操作系统、输入设备和视口。按下面顺序执行：

1. 从地址栏或页面开头开始，只按 Tab。
2. 确认三个工具栏按钮按 DOM 顺序获得焦点。
3. 确认滚动容器获得焦点且轮廓可见。
4. 记录 `scrollLeft`，使用目标环境支持的按键横向移动，再记录一次。
5. 继续 Tab，确认进入第一行“数量加一”和“删除”按钮。
6. 用 Enter 激活“数量加一”，确认焦点回到同一业务操作。
7. 用 Space 激活一个按钮，确认不会滚动页面代替按钮行为。
8. 删除中间行，确认焦点移到相邻行而不是页面开头。
9. Shift+Tab 返回上一个控件。
10. 清空全部，确认焦点到恢复按钮。
11. 恢复数据，确认焦点到表格区域。
12. 继续 Tab 离开表格，证明没有焦点陷阱。
13. 在 200% 缩放与约 320 CSS 像素宽度重复关键路径。

记录模板：

```text
浏览器与版本：
操作系统：
视口与缩放：
聚焦滚动区：
横向滚动按键与结果：
更新后焦点：
删除后焦点：
空状态后焦点：
能否离开表格：
失败与修复：
```

## 12. 常见问题

### Q1：水平滚动是不是不够“响应式”？

不是。响应式的目标是让内容在不同条件下可读、可操作。二维比较数据无法在窄屏同时保留无限列宽，水平滚动是诚实保留关系的一种方案。是否改成摘要、分步比较或卡片，要由内容和任务决定。

### Q3：每个滚动容器都要 `role="region"` 吗？

不要。区域过多会让辅助技术的区域导航变得嘈杂。只有重要、独立且有清楚名称的区域才考虑使用。普通装饰包装层不需要升级成 landmark。

### Q4：添加 `tabindex="0"` 会不会让容器变成按钮？

不会。它只让元素可顺序聚焦，不赋予按钮语义或 Enter/Space 点击行为。这里需要的是聚焦后操作滚动，不应添加 `role="button"`。

### Q5：表格内已经有按钮，滚动容器还需要聚焦吗？

按钮进入 Tab 顺序不一定让用户能横向查看没有按钮的列，而且焦点滚动行为因布局而异。应在目标环境中测试。如果内层控件已经提供可靠查看方式，显式容器停靠点的成本也要评估。

### Q7：`overflow-wrap: anywhere` 会改变数据吗？

不会。它改变视觉换行机会，不在字符串中插入永久字符。复制文本通常仍得到原内容。仍需检查特定浏览器、打印和复制场景。

### Q9：`table-layout: fixed` 一定更快吗？

固定算法可以较早确定列宽，但实际性能取决于表格规模、样式和更新方式。不要为了理论上的速度牺牲可读性。先测量真实问题，再选择布局。

### Q10：打印时 `thead` 一定在每页重复吗？

不能对所有浏览器和打印引擎做绝对保证。`display: table-header-group` 表达期望，最终要在目标浏览器、纸张和导出 PDF 流程中检查。

## 13. 扩展阅读

资料与兼容性说明核验日期：**2026-10-10**。

- [WHATWG HTML：The table element](https://html.spec.whatwg.org/multipage/tables.html#the-table-element)：`caption`、行组、行、单元格和表头模型。
- [WHATWG HTML：APIs for tables](https://html.spec.whatwg.org/multipage/tables.html#table-processing-model)：`HTMLTableElement`、section、row 与 cell 相关接口。
- [WHATWG DOM：Collections](https://dom.spec.whatwg.org/#old-style-collections)：`HTMLCollection` 的实时集合模型。
- [W3C WAI Tutorials：Tables](https://www.w3.org/WAI/tutorials/tables/)：简单与复杂数据表的表头关系。
- [WCAG 2.2：1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)：以程序可确定方式保留表格关系。
- [WCAG 2.2：1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)：放大和窄视口下的重排要求及二维内容例外。
- [WCAG 2.2：2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)：键盘可操作要求。
- [WCAG 2.2：2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)：可见键盘焦点。
- [MDN：`<table>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/table)：表格结构、可访问性和展示示例。
- [MDN：`HTMLTableElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableElement)：表格 DOM 属性与方法。
- [MDN：`HTMLTableSectionElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableSectionElement)：行组 `rows`、`insertRow()` 和 `deleteRow()`。
- [MDN：`HTMLTableRowElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLTableRowElement)：`cells`、`insertCell()` 和 `deleteCell()`。
- [MDN：`HTMLCollection`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCollection)：实时集合与转数组方式。
- [MDN：`table-layout`](https://developer.mozilla.org/en-US/docs/Web/CSS/table-layout)：自动与固定表格布局算法。
- [MDN：Printing](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Printing)：打印媒体查询与打印样式。
- [MDN：`textContent`](https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent)：文字读写与 `innerHTML` 的区别。
- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)：输出上下文与安全 DOM API 边界。

查阅资料时区分：

1. HTML 和 DOM 规范定义的结构与接口；
2. CSS 规范和浏览器实现的布局、打印与焦点行为；
3. 辅助技术在特定版本组合中的实际播报；
4. 项目自己的数据、金额、授权和并发契约。

截至核验日期，本课选择保留原生表格、外层滚动、显式键盘测试和安全 DOM API 作为稳健基线。滚动容器的默认可聚焦行为、打印重复表头、CSS `display` 对可访问树的影响，以及不同读屏的表头播报仍需在目标环境实测，不能只凭单一浏览器结果做绝对兼容承诺。

## 我现在能做到什么

- 能解释并验证：在窄屏、键盘、读屏与打印场景中保持二维关系和可见事实。
- `TBL-008`：小屏滚动、长内容和打印
- `TBL-009`：键盘、读屏与表头测试
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：合并单元格、网格坐标与列组](03-table-spans-column-groups.md) · [下一课：表格 DOM、安全更新与动态状态](05-table-dom-dynamic-rows.md) · [返回 HTML 模块](../README.md)
