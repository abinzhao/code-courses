# 02 表格无障碍、响应式与 DOM：在小屏和动态更新中保住二维关系

## 任务卡

邻里集市已经有一张语义正确的商品对比表，但真实使用还会遇到四类变化：

- 手机视口放不下全部列；
- 商品标题、卖家说明和编号可能很长；
- 用户会增加数量、删除商品或清空对比项；
- 页面可能被打印，或者由键盘与屏幕阅读器操作。

这次任务不是把表格“改造成卡片”，而是在保持 `table`、行、列和表头关系的前提下，为它增加水平滚动、打印样式和安全的 DOM 更新。

| 关卡 | 你要完成的结果 | 可观察证据 |
| --- | --- | --- |
| 保住二维模型 | 小屏只滚动外层容器，不拆散表格元素 | Elements 中仍是原生 `table` 结构 |
| 支持键盘 | 不用鼠标也能到达滚动区和行内按钮 | 清晰焦点、可横向滚动、无焦点陷阱 |
| 保住表头关系 | 动态生成行后，数据格仍关联列头和行头 | `scope`、`headers`、唯一 `id` 与读屏结果 |
| 安全生成行 | 用户数据只进入 `textContent` | 输入中的标签字符按文字显示 |
| 精确算金额 | 单价和合计始终以整数分计算 | 纯函数断言与页面合计一致 |
| 处理空状态 | 删除全部行后仍有清楚结果 | 空状态行、`aria-live` 消息、合计归零 |
| 留下诊断证据 | 先观察失败，再定位结构或数据根因 | 断言、Console、Elements 与打印预览记录 |

建议分四次完成：

1. 先运行最小案例，只观察水平滚动、长内容和打印预览。
2. 再在 Console 中读取 `caption`、`tHead`、`tBodies`、`rows` 与 `cells`。
3. 运行邻里集市完整案例，逐项执行增加数量、删除、清空和恢复。
4. 最后制造表头引用与不安全字符串拼接故障，按证据修复。

本课的商品数组只存在于当前页面内存中。刷新或关闭页面后，所有修改都会丢失；示例不包含持久化、认证、授权或并发控制，也不能作为真实交易系统的数据层。

## 1. 任务背景

表格响应式问题的根因不是“表格不适合手机”，而是二维数据需要同时保留多个列。窄视口无法凭空创造宽度，开发者必须在以下结果中做选择：

1. 保留全部列，让用户水平查看；
2. 在业务允许时减少非关键列；
3. 提供另一份针对小屏重新设计的摘要；
4. 强行把每个表格元素改成块级元素，丢失或模糊行列关系。

本课选择第一种作为通用基线：**让表格保持表格，让一个有名称的外层容器负责水平滚动。**

动态更新又带来第二层风险。静态 HTML 中写好的 `th`、`scope` 和 `headers` 不会自动复制到脚本新增的每一行；字符串拼接还可能把用户数据解释成 HTML。常见失败包括：

- 给 `table` 本身设置 `overflow-x: auto`，实际没有形成稳定滚动容器；
- 把 `thead`、`tbody`、`tr`、`th`、`td` 全部改成 `display: block`；
- 只在视觉上给每格添加“伪标签”，DOM 中却没有表头关系；
- 给滚动容器添加 `tabindex="0"` 后，没有焦点样式或可访问名称；
- 使用 `tbody.innerHTML += ...` 拼接用户提供的商品标题；
- 用 `19.9 * 3` 一类浮点计算货币，并直接显示未经舍入的结果；
- 遍历实时集合时一边向前走一边删除，结果隔行漏删；
- 删除最后一行后留下空白表格，没有空状态和状态通知；
- 动态重建行后，焦点消失到 `body`，键盘用户不知道发生了什么；
- 打印时仍保留裁切或滚动区域，右侧列没有出现在纸面上。

一条可重复的实现与诊断链是：

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

## 2. 学习目标

完成本课后，你应能独立做到：

- 解释为什么响应式滚动层应该包住表格，而不是拆散表格语义。
- 为水平滚动区选择是否添加 `tabindex="0"`，并说明增加 Tab 停靠点的代价。
- 使用可见标题或表格 `caption` 为滚动区域提供可访问名称。
- 在 320 CSS 像素宽度、200% 缩放和只用键盘的条件下检查表格。
- 处理长单词、长编号、长链接和多段说明，不让单个单元格无限撑宽。
- 比较 `table-layout: auto` 与 `table-layout: fixed` 的计算方式和适用边界。
- 编写打印样式，解除屏幕滚动裁切并隐藏只对屏幕交互有意义的按钮。
- 解释为什么对表格内部元素使用 `display: block`、`grid` 或 `flex` 可能破坏布局和无障碍关系。
- 在动态增加、删除和更新行时保留列头、行头与数据格的关联。
- 读取 `HTMLTableElement.caption`、`tHead`、`tBodies`、`tFoot` 和 `rows`。
- 读取 `HTMLTableSectionElement.rows` 与 `HTMLTableRowElement.cells`。
- 正确使用 `insertRow()`、`deleteRow()`、`insertCell()` 与 `deleteCell()`。
- 解释 `rows`、`cells`、`tBodies` 等实时集合为何会随 DOM 立即变化。
- 避免在向前遍历实时集合时删除元素导致漏项。
- 使用 `createElement()`、`textContent`、`append()` 和属性 API 安全生成动态内容。
- 明确承诺：用户数据绝不进入不安全的 `innerHTML` 字符串。
- 使用整数分计算每行小计和总计，并通过纯函数断言验证。
- 为动态表格实现空状态、更新消息、删除后的焦点恢复和失败断言。
- 说明本课内存数据与真实持久化、认证、授权和并发写入的边界。

## 3. 预备知识

开始前，你需要：

- 知道 `table`、`caption`、`thead`、`tbody`、`tfoot`、`tr`、`th` 和 `td` 的职责；
- 会使用 `scope="col"`、`scope="row"`，并理解复杂表格中的 `id`/`headers`；
- 会打开浏览器开发者工具的 Elements 和 Console；
- 知道 JavaScript 数组、对象、函数、事件监听和 `const`/`let` 的基本写法；
- 最好已经完成[上一课：表格模型、表头与跨行跨列](01-table-model-headers-spans.md)。

个人练习目录如下：

```text
practice/
└── html-04-responsive-table/
    ├── minimal.html
    └── market-table.html
```

这只是学习者在自己电脑上创建的练习目录，不是教材仓库需要增加的源码目录。

推荐使用本地静态服务器：

```bash
cd practice/html-04-responsive-table
python3 -m http.server 8000
```

然后访问：

```text
http://127.0.0.1:8000/minimal.html
http://127.0.0.1:8000/market-table.html
```

停止服务器时，在终端按 <kbd>Control</kbd> + <kbd>C</kbd>。

直接双击 HTML 文件也能完成大部分练习，但本地 HTTP 地址更接近普通网站环境，也更方便在开发者工具中重载与保留日志。

### 3.1 本课如何理解“可访问”

本课不会把“有 ARIA 属性”当成已经可访问。每个结论至少要经过三层检查：

| 层次 | 检查内容 | 主要工具 |
| --- | --- | --- |
| 结构 | 表格、行组、表头、数据格和引用是否存在 | Elements、Console |
| 操作 | 键盘能否到达、滚动、激活和离开 | Tab、Shift+Tab、方向键、Enter、Space |
| 输出 | 辅助技术是否读出表名、列头、行头与更新 | VoiceOver 或 NVDA 等真实读屏软件 |

自动断言可以证明某个 `headers` 指向存在的 ID，却不能证明所有浏览器和读屏组合都会以相同措辞播报。因此，本课把自动检查与人工范围检查分开记录。

### 3.2 数据边界

完整案例使用这样的内存对象：

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

关键约束：

- `id` 是本页内唯一的稳定标识，不是数组下标；
- `priceCents` 是非负安全整数，单位为分；
- `quantity` 是正安全整数；
- 行小计等于 `priceCents * quantity`；
- 页面刷新后数据恢复；
- 示例没有服务器，也没有跨标签页同步；
- 没有登录身份，任何按钮都不代表真实用户权限；
- 没有并发控制，无法处理多人同时修改同一商品；
- 删除只是删除当前数组中的对象，不会删除真实商品。

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

### 4.10 `HTMLTableElement` 的结构入口

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

### 4.11 行组的 `rows` 与行的 `cells`

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

### 4.12 `insertRow()` 和 `deleteRow()`

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

### 4.13 `insertCell()` 和 `deleteCell()`

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

### 4.14 实时集合中的删除陷阱

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

### 4.15 安全 DOM 生成：结构由代码创建，数据只作为文字

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

### 4.16 整数分与纯数据函数

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

### 4.17 更新、删除与焦点恢复

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

### 4.18 空状态仍然属于表格状态

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

### 5.2 表格 DOM 接口清单

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

### 5.3 选择 API 的快速判断

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

### 8.3 滚动区可以看见，却不能只用键盘操作

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

### 8.4 使用 `display: block` 后视觉正常，读屏关系混乱

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

### 8.5 `table-layout: fixed` 后文字重叠

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

### 8.6 打印只出现左半张表

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

### 8.7 动态行有数据，却没有行头

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

### 8.8 `headers` 指向不存在的 ID

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

### 8.9 向前删除实时集合导致隔行残留

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

### 8.10 删除行后焦点丢失

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

### 8.11 用浮点元计算金额

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

### 8.12 不安全 `innerHTML` 示例

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

### 8.13 清空后没有空状态

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

### 8.14 表格行数断言“多了一行”

先确认读取的是：

```js
table.rows.length;
```

还是：

```js
table.tBodies[0].rows.length;
```

前者包含 `thead`、`tbody` 和 `tfoot` 中的行。后者只包含指定 `tbody`。修复断言时要明确业务范围，不能为了得到期望数字随意减 2。

### 8.15 浏览器读出了列头，却没读出行头

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

### 9.4 实时集合

题目：为什么保存到变量中的 `const rows = tbody.rows` 会在插入行后自动改变长度？

<details>
<summary>参考答案</summary>

`rows` 是实时 `HTMLCollection`，反映当前 DOM，不是创建时的数组快照。`const` 只表示变量引用不重新赋值，不表示集合内容不可变。需要静态快照时使用 `Array.from(tbody.rows)`。

</details>

### 9.5 行头为什么不能用 `insertCell()`

题目：动态行第一格是商品名，为什么不直接 `row.insertCell(0)`？

<details>
<summary>参考答案</summary>

`insertCell()` 创建 `td`，而商品名在这张表中承担行头，应使用 `document.createElement("th")`，设置 `scope="row"`、唯一 ID 和文字，再插入行。视觉加粗不能把 `td` 变成行头。

</details>

### 9.6 删除实时集合

题目：有四行时，为什么 `for (let i = 0; i < rows.length; i++) deleteRow(i)` 可能只删除两行？

<details>
<summary>参考答案</summary>

删除后后续元素立即前移，而索引仍递增。删除原第 0 行后，原第 1 行变成新第 0 行，但循环转到 1，于是跳过它。可持续删除索引 0、从后向前删除，或先拍快照。

</details>

### 9.7 金额计算

题目：单价 66 元、数量 2，数据模型和显示边界分别保存什么？

<details>
<summary>参考答案</summary>

模型保存 `priceCents: 6600` 和 `quantity: 2`，小计为整数 `13200` 分。显示时才把 `13200 / 100` 交给人民币格式化器，得到类似 `¥132.00` 的本地化文字。显示字符串不再参与加总。

</details>

### 9.8 `headers` 的动态契约

题目：新增 `listing-desk` 行时，价格格至少应关联哪些表头？

<details>
<summary>参考答案</summary>

若行头 ID 为 `row-listing-desk`，列头 ID 为 `col-price`，价格格可写：

```html
<td headers="row-listing-desk col-price">¥88.00</td>
```

还要确保两个 ID 在文档中存在且唯一，行头是 `th scope="row"`。

</details>

### 9.9 为什么不能用 `innerHTML +=`

题目：除了注入风险，`tbody.innerHTML += ...` 还有什么维护问题？

<details>
<summary>参考答案</summary>

它会把字符串作为 HTML 解析，固定结构和数据边界混在一起；`+=` 还可能重新解析原子树，影响已有元素引用、状态或监听器。表头 ID、`headers`、按钮属性和转义规则也更难审查。应使用结构化 DOM API和 `textContent`。

</details>

### 9.10 空状态为什么保留一行

题目：数组为空时，`tbody.rows.length` 为什么可以是 1？

<details>
<summary>参考答案</summary>

实现可以放一条跨越全部列的空状态行，说明数据加载完成但没有商品。它没有 `data-listing-id`，不计入模型数据行。断言应分别检查数据行数量和总行数，而不是把所有 `tr` 都当商品。

</details>

### 9.11 打印为什么要重置 `overflow`

题目：屏幕滚动容器若保持 `overflow-x: auto`，打印会有什么风险？

<details>
<summary>参考答案</summary>

打印引擎可能只输出滚动盒当前可见宽度，右侧列被裁切。打印媒体中应恢复 `overflow: visible`，重置表格 `min-width`，选择合适布局并检查预览。纸张方向和分页仍需实测。

</details>

### 9.12 本课案例能否处理两个人同时删一件商品

题目：为什么不能？

<details>
<summary>参考答案</summary>

所有数据只在一个页面的 JavaScript 数组中，没有服务器、持久化、用户身份、版本号、事务或冲突检测。按钮只改变当前标签页。并发一致性必须由后端数据契约和授权流程实现，不能从这张教学表推导。

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

### 10.3 故障注入级：同时修复表头断链和不安全字符串

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

### 11.2 键盘人工范围检查

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

### 11.3 屏幕阅读器人工范围检查

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

### 11.4 自动与文件证据

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

### 11.5 一票否决项

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

### 11.6 自我讲解验收

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

### Q1：水平滚动是不是不够“响应式”？

不是。响应式的目标是让内容在不同条件下可读、可操作。二维比较数据无法在窄屏同时保留无限列宽，水平滚动是诚实保留关系的一种方案。是否改成摘要、分步比较或卡片，要由内容和任务决定。

### Q2：可以只给 `table` 写 `overflow-x: auto` 吗？

不建议把它作为基础方案。表格参与特殊布局，外层普通块容器更容易形成可约束、可聚焦、可命名的滚动盒。应以实际 `scrollWidth`、`clientWidth` 和目标浏览器测试为证据。

### Q3：每个滚动容器都要 `role="region"` 吗？

不要。区域过多会让辅助技术的区域导航变得嘈杂。只有重要、独立且有清楚名称的区域才考虑使用。普通装饰包装层不需要升级成 landmark。

### Q4：添加 `tabindex="0"` 会不会让容器变成按钮？

不会。它只让元素可顺序聚焦，不赋予按钮语义或 Enter/Space 点击行为。这里需要的是聚焦后操作滚动，不应添加 `role="button"`。

### Q5：表格内已经有按钮，滚动容器还需要聚焦吗？

按钮进入 Tab 顺序不一定让用户能横向查看没有按钮的列，而且焦点滚动行为因布局而异。应在目标环境中测试。如果内层控件已经提供可靠查看方式，显式容器停靠点的成本也要评估。

### Q6：能否把滚动说明放进 `aria-label`？

区域名称应简洁说明“它是什么”，操作提示更适合可见文字并通过 `aria-describedby` 关联。把长说明全部塞进 `aria-label` 会覆盖其他命名来源，并可能造成重复播报。

### Q7：`overflow-wrap: anywhere` 会改变数据吗？

不会。它改变视觉换行机会，不在字符串中插入永久字符。复制文本通常仍得到原内容。仍需检查特定浏览器、打印和复制场景。

### Q8：为什么不对所有格使用 `white-space: nowrap`？

它会让长标题和说明不断撑宽表格。只对金额、短日期等确实应保持一行的紧凑数据使用，并确保整体仍可读。

### Q9：`table-layout: fixed` 一定更快吗？

固定算法可以较早确定列宽，但实际性能取决于表格规模、样式和更新方式。不要为了理论上的速度牺牲可读性。先测量真实问题，再选择布局。

### Q10：打印时 `thead` 一定在每页重复吗？

不能对所有浏览器和打印引擎做绝对保证。`display: table-header-group` 表达期望，最终要在目标浏览器、纸张和导出 PDF 流程中检查。

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
- [OWASP Cross Site Scripting Prevention Cheat Sheet](https://owasp.org/www-community/xss-prevention)：输出上下文与安全 DOM API 边界。

查阅资料时区分：

1. HTML 和 DOM 规范定义的结构与接口；
2. CSS 规范和浏览器实现的布局、打印与焦点行为；
3. 辅助技术在特定版本组合中的实际播报；
4. 项目自己的数据、金额、授权和并发契约。

截至核验日期，本课选择保留原生表格、外层滚动、显式键盘测试和安全 DOM API 作为稳健基线。滚动容器的默认可聚焦行为、打印重复表头、CSS `display` 对可访问树的影响，以及不同读屏的表头播报仍需在目标环境实测，不能只凭单一浏览器结果做绝对兼容承诺。

## 我现在能做到什么

我能在不拆散表格语义的前提下，用有名称、可聚焦且焦点可见的外层容器解决小屏水平滚动；我能处理长内容、比较 `table-layout` 策略，并通过打印媒体查询避免右侧列被裁切。

我也能读取 `HTMLTableElement`、行组、行和单元格的实时集合，正确使用增删行列 API，并用 `createElement()` 与 `textContent` 安全生成商品行。我会用整数分、纯函数断言、渲染断言、空状态、状态消息和焦点恢复共同维护动态表格，同时明确这仍只是当前页面内存中的教学状态，不包含持久化、认证、授权或并发控制。

## 单元导航

| 方向 | 教材 |
| --- | --- |
| 上一课 | [01 表格模型、表头与跨行跨列](01-table-model-headers-spans.md) |
| 本章入口 | [04 表格与二维数据](../04-tables-data.md) |
| 下一章 | [05 表单与验证](../05-forms-validation.md) |
| 模块入口 | [HTML：邻里集市零基础教材](../README.md) |
