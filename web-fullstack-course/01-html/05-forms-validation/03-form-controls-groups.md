# 表单控件、选择与分组：让名称、值和状态各司其职

> 所属章节：表单、提交与验证
> 建议学习时间：5–6 小时
> 阶段成果：完成一张可观察标签、分组、多选、计算结果、进度和测量值的商品发布表单

## 任务卡

邻里集市的商品发布页已经能收集普通 `input`，但新需求不只是“再放几个框”：

- 商品描述需要多行编辑，并能区分初始值与用户当前值；
- 分类需要按“家居、数码、图书”分组；
- 商品标签允许多选，不能只读到第一个值；
- 配送扩展默认关闭，但开关必须在禁用分组中仍可操作；
- 单价与数量要算出总价，金额始终使用整数分；
- 页面需要区分“已完成几项”和“当前资料质量”；
- 移动键盘、自动填充和回车键文案只能作为输入帮助，不能冒充校验。

你将先建立一个控件状态观察页，再完成一张分类商品发布表单。所有结果都只保存在当前页面内存中；刷新即消失，不会发送请求，也不会保存到服务器。

**完成本课后，你将交付：**

- 一份显式标签、隐式标签和可见名称边界说明；
- 一次 `textarea` 初始值、当前值、换行与选择区观察；
- 一次单选和多选 `select` 的当前选项取证；
- 一次 `button` 的 `type`、`form`、`name`、`value` 取证；
- 一次 `fieldset[disabled]` 与第一项 `legend` 例外实验；
- 一次 `datalist` 建议值越界实验；
- 一个以整数分计算的 `output`；
- 一组 `progress` 与 `meter` 的语义对照；
- 一份错误注入、诊断、修复和复验记录。

## 1. 任务背景

表单控件至少同时存在四种关系：

1. **名称关系**：用户看见“商品分类”，辅助技术也应得到可理解的控件名称；
2. **值关系**：源代码给出默认状态，用户操作形成当前状态，提交时再筛选成功控件；
3. **分组关系**：一组配送字段或一组分类选项需要共同标题；
4. **帮助关系**：建议值、说明文字、移动键盘提示和自动填充降低输入成本，但不自动保证数据正确。

如果把这四层混成一层，页面常出现以下问题：

- 用 `placeholder` 冒充标签，输入后字段名称消失；
- 在 `textarea` 上写无效的 `value` 属性；
- 多选框视觉上选了三个值，脚本却只读取 `.value`；
- 辅助按钮漏写 `type="button"`，意外提交整张表单；
- 禁用 `fieldset` 后，误以为其中所有后代都绝对不可操作；
- 把 `datalist` 当成只允许预设值的 `select`；
- 用小数元直接相乘，得到 `0.1 + 0.2` 一类浮点误差；
- 用 `progress` 表示库存健康度，或用 `meter` 表示文件上传进度。

本课先建立浏览器的控件模型，再写业务案例。约束验证、文件检查和错误焦点恢复会在下一课系统展开。

## 2. 学习目标

完成本课后，你应能：

- 使用 `label[for]` 建立显式关联，并解释隐式包裹关联；
- 区分可见标签、可访问名称、帮助文字和输入示例；
- 说明 `textarea` 文本内容、`defaultValue`、`value` 的关系；
- 解释 `rows`、`cols` 和 `wrap="soft|hard"` 的职责；
- 使用 `selectionStart`、`selectionEnd`、`setSelectionRange()` 观察文本选择；
- 解释 `option[value]`、文本后备值、`selected`、`defaultSelected` 和 `selected` 属性的关系；
- 使用 `select.value`、`selectedIndex`、`selectedOptions` 和 `FormData.getAll()`；
- 使用 `optgroup[label]` 给长选项集分组，并说明分组标签不是可选择值；
- 明确设置每个 `button` 的 `type`，并观察提交按钮的 `name/value`；
- 使用 `button[form]` 把表单外按钮关联到指定表单；
- 使用 `fieldset` 和第一项 `legend` 为相关控件命名；
- 预测 `fieldset[disabled]` 的传播，以及第一项 `legend` 后代的例外；
- 解释 `readonly` 与 `disabled` 的交互、提交和适用控件差异；
- 把 `datalist` 当作建议来源，而不是白名单；
- 使用 `output[for][form]` 展示脚本计算结果，并说明它不会自动计算或提交；
- 区分确定进度、未知进度和已知范围内的测量值；
- 正确设置 `autocomplete`、`inputmode`、`enterkeyhint`、`autocapitalize` 和 `spellcheck`；
- 为每个结论留下文件、打开方式、预期结果和失败证据。

## 3. 预备知识

开始前建议完成：

- [表单提交与成功控件](01-form-submission-successful-controls.md)；
- [input 类型与值状态](02-input-types-values.md)。

你需要能够：

- 创建完整 HTML 文档；
- 在浏览器中直接打开本地文件；
- 使用 DevTools 的 Elements 和 Console；
- 理解 `id` 用于页面内关联，`name` 用于表单数据字段；
- 理解 `FormData` 只收集成功控件；
- 理解布尔属性只要出现就启用，`disabled="false"` 仍是禁用。

本课的边界：

- 不向任何地址发送表单；
- 不使用数据库、接口、Cookie、`localStorage` 或 IndexedDB；
- 不把页面预览称为“发布成功”；
- 不把隐藏、只读或禁用状态当作权限；
- 不声称自动填充、移动键盘布局或原生控件外观在所有浏览器完全一致；
- 不用客户端状态替代服务端校验。

## 4. 核心理论

### 4.1 从“控件四层模型”理解表单

面对一个表单控件，可以依次问：

```text
1. 用户如何知道它是什么？
   → label、legend、按钮文字、可见说明

2. 浏览器当前保存什么状态？
   → value、selected、disabled、readOnly

3. 构造表单数据时会产生什么条目？
   → name + 当前值 + successful control 规则

4. 浏览器如何帮助输入？
   → autocomplete、inputmode、enterkeyhint、datalist
```

四层之间有关联，但不能互相替代：

- 有 `name` 不代表有可见名称；
- 有 `label` 不代表有提交字段名；
- 有 `datalist` 不代表当前值一定来自建议；
- 有 `inputmode="numeric"` 不代表输入一定是数字；
- 页面显示 `output` 不代表该值会进入 `FormData`；
- 控件被禁用不代表用户没有权限构造同名请求。

### 4.2 `label`：显式关联、隐式关联与可见名称边界

#### 显式关联

显式关联让 `label[for]` 的值精确匹配可标记控件的 `id`：

```html
<label for="listing-title">商品标题</label>
<input id="listing-title" name="title" type="text">
```

这里：

- `for="listing-title"` 建立标签关系；
- `id="listing-title"` 是页面内关联目标；
- `name="title"` 是提交字段名；
- 三者职责不同，不能因为文字相同就省略其中需要的一项。

显式形式允许标签和控件不互相嵌套，适合网格布局，也便于脚本检查。点击大多数标签文字会把焦点或激活行为转交给关联控件。

可以在 Console 中观察：

```js
const title = document.querySelector("#listing-title");
console.log(title.labels.length);
console.log(title.labels[0].control === title);
```

#### 隐式关联

隐式关联把控件放进 `label`：

```html
<label>
  <input name="negotiable" type="checkbox" value="yes">
  接受议价
</label>
```

这种写法不依赖 `for/id`，对短小的复选框或单选按钮很自然。复杂布局中，显式形式通常更容易维护。不要在同一个 `label` 中放入第二个可标记控件，也不要塞入链接、按钮等会与标签激活冲突的交互元素。

一个控件可以拥有多个标签，但重复名称可能造成冗长朗读。只有当多个可见入口确实都承担标签职责时才这样做。

#### 可见名称不是提示文字

以下内容各有职责：

| 内容 | 主要职责 | 能否稳定替代可见标签 |
| --- | --- | --- |
| `label` | 给单个控件命名，并扩大可点击区域 | 是，优先选择 |
| `legend` | 给一组 `fieldset` 控件命名 | 不能代替组内每个字段的标签 |
| 按钮文本 | 给 `button` 命名 | 只适用于该按钮 |
| `placeholder` | 在空控件中给输入示例 | 不能，输入后会消失 |
| `aria-label` | 在确实没有合适可见文字时提供名称 | 不能形成可见名称 |
| `aria-describedby` | 关联格式、单位、错误或帮助文字 | 是描述，不是名称 |
| `title` | 补充提示，触发方式和可见性不稳定 | 不能 |

可见文字“商品标题”和程序化名称应一致。不要让页面写“价格”，却用 `aria-label="商品编号"` 覆盖成另一个概念。语音输入用户通常按屏幕上的词操作；可见名称与可访问名称不一致会直接破坏这条路径。

`label` 可关联的对象包括大多数非 `hidden` 的 `input`、`textarea`、`select`、`button`、`output`、`progress` 和 `meter`。普通 `div` 不是因为拥有 `id` 就能成为标签目标。

### 4.3 `textarea`：初始值、当前值和换行

`textarea` 没有用于设置初始文本的 `value` 内容属性。开始标签与结束标签之间的文本才是初始值：

```html
<label for="description">商品描述</label>
<textarea id="description" name="description" rows="5" cols="36">灯臂可调，开关正常。</textarea>
```

加载后：

```js
console.log(description.defaultValue); // 源标记提供的初始值
console.log(description.value);        // 当前值，初始时通常相同
```

用户输入只改变当前值 `.value`。调用所属表单的 `reset()` 后，当前值回到 `.defaultValue`。脚本修改 `defaultValue` 会改变之后重置所回到的值；脚本修改 `value` 只改变当前编辑状态。

#### 缩进也可能成为值

下面的排版把换行和空格放进了初始值：

```html
<textarea name="description">
  灯臂可调。
</textarea>
```

如果不希望前导换行，应把初始文字紧贴开始标签，或者在脚本中明确赋值。不要为了“代码整齐”无意改变用户数据。

#### `rows` 与 `cols`

- `rows` 是期望显示的文本行数；
- `cols` 是期望显示的平均字符宽度；
- 它们帮助浏览器提供初始尺寸，不限制实际字符数量；
- 字符长度约束使用 `minlength`、`maxlength`，业务边界仍需服务端复验；
- CSS 可以改变最终尺寸，但不应让控件小到无法编辑。

#### `wrap`

`wrap` 主要影响换行处理：

- `soft`：默认状态；视觉上可以自动折行，但提交值不会因为视觉折行而额外插入这些换行；
- `hard`：浏览器在构造提交值时按控件换行宽度加入换行，规范要求同时给出 `cols`；
- 非标准值不应成为课程或生产合同。

用户亲自按 Enter 输入的换行与自动视觉折行不是一回事。需要保存原文时，应先明确产品是否允许浏览器按显示宽度改写换行；大多数自由描述使用默认 `soft` 更可预测。

#### 选择区 API

文本控件可以观察和修改选择区：

```js
const start = description.selectionStart;
const end = description.selectionEnd;
const direction = description.selectionDirection;

description.setSelectionRange(0, 2, "forward");
description.focus();
```

`selectionStart` 和 `selectionEnd` 是当前值中的索引，不是屏幕像素位置。脚本调整选择后通常还需聚焦，用户才能看见。不要在每次输入时强行重设选择区，否则会让光标跳动。

### 4.4 `select`、`option` 与 `optgroup` 的值模型

单选下拉的基本结构：

```html
<label for="category">商品分类</label>
<select id="category" name="category">
  <option value="">请选择分类</option>
  <optgroup label="家居">
    <option value="lighting">灯具</option>
    <option value="storage">收纳</option>
  </optgroup>
  <optgroup label="数码">
    <option value="computer-accessory">电脑配件</option>
  </optgroup>
</select>
```

`optgroup[label]` 是给一组选项的可见分组标题，它本身不能被选择，也不会成为字段值。分组太深时应重新设计信息架构，因为 `optgroup` 不能无限嵌套。

#### `option` 的机器值

有 `value` 属性时，选项机器值来自该属性：

```html
<option value="lighting">灯具</option>
```

没有 `value` 时，值来自选项文本内容。业务代码最好显式写稳定机器值，避免产品改文案时悄悄改掉接口数据。

#### 默认选中与当前选中

```html
<option value="lighting" selected>灯具</option>
```

- `selected` 内容属性提供默认选中线索；
- `option.defaultSelected` 反映 `selected` 内容属性；
- `option.selected` 表示当前选中状态；
- 用户改选通常改变 `.selected`，不会自动改写源标记中的 `selected`；
- 表单重置按默认选中状态恢复。

单选 `select` 常用状态：

```js
console.log(category.value);
console.log(category.selectedIndex);
console.log(category.selectedOptions[0]?.value);
```

对于单选控件，`.value` 是当前首个选中选项的值。没有可用选项时可能是空字符串，`selectedIndex` 可能是 `-1`。

`disabled` 可以写在整个 `select`、某个 `optgroup` 或某个 `option` 上。禁用选项不是“无权限的安全状态”，服务端不能因为界面没让选就信任请求。

### 4.5 `multiple`、`size` 与 `selectedOptions`

给 `select` 添加 `multiple` 后，用户可以选择零个或多个选项：

```html
<label for="tags">商品标签</label>
<select id="tags" name="tags" multiple size="5">
  <option value="local-pickup">仅限自提</option>
  <option value="tested">已测试</option>
  <option value="negotiable">可议价</option>
  <option value="with-box">有原包装</option>
  <option value="urgent">急出</option>
</select>
```

`size="5"` 表示希望同时显示五行选项。它不是最多允许选择五项，也不保证控件最终像素高度在所有平台一致。

这是常见但错误的读取：

```js
// 错误案例：multiple 仍只得到第一个选中值
const onlyOne = tags.value;
```

正确观察当前多选：

```js
const selectedValues = Array.from(
  tags.selectedOptions,
  (option) => option.value,
);
```

`selectedOptions` 是实时 `HTMLCollection`。如果之后还要稳定比较旧状态，应立即复制成数组。提交时，同一个 `name="tags"` 会产生多个同名条目：

```js
const data = new FormData(form);
console.log(data.getAll("tags"));
```

桌面多选列表常依赖 Ctrl、Command 或 Shift，触摸设备和辅助技术的交互也可能不同。选项很少且需要清楚展示时，一组同名复选框可能更易理解。不要因为 `multiple` 能节省视觉空间就忽略可发现性。

### 4.6 `button`：可见文字不是提交值

`button` 的元素内容负责可见名称，`value` 负责机器值：

```html
<button type="submit" name="intent" value="preview">
  生成本地预览
</button>
```

这里用户看见“生成本地预览”，提交按钮条目是 `intent=preview`。只有实际发起提交的提交按钮才贡献自己的 `name/value`。

三种常用类型：

| `type` | 行为 | 使用场景 |
| --- | --- | --- |
| `submit` | 请求提交关联表单 | 发布、搜索、生成预览 |
| `reset` | 恢复关联表单的默认状态 | 教学观察；生产表单应谨慎提供 |
| `button` | 没有默认表单动作 | 展开说明、读取当前状态、局部计算 |

位于表单中且没有明确类型的普通 `button` 通常会成为提交按钮。团队代码应显式写 `type`，让审查者不必依赖默认值。

表单外按钮可通过 `form` 指向表单 `id`：

```html
<form id="listing-form">
  <!-- 控件 -->
</form>

<button
  type="submit"
  form="listing-form"
  name="intent"
  value="preview-outside"
>
  从表单外生成预览
</button>
```

`form` 只建立所有者关系，不会把按钮视觉移动进表单。按钮文字中不要嵌套链接、输入框或另一个按钮。

### 4.7 `fieldset`、`legend` 与禁用传播

`fieldset` 把一组相关控件组成语义分组，第一项 `legend` 为这组内容命名：

```html
<fieldset>
  <legend>交接方式</legend>

  <label>
    <input type="radio" name="handoff" value="pickup">
    公共地点自提
  </label>

  <label>
    <input type="radio" name="handoff" value="delivery">
    同城配送
  </label>
</fieldset>
```

`legend` 不能代替每个控件自己的标签。它回答“这一组是什么”，单个 `label` 回答“这一项是什么”。

#### `fieldset[disabled]` 的传播

禁用 `fieldset` 时，其后代控件通常：

- 不能被用户编辑或激活；
- 不参与约束验证；
- 不进入 `FormData`；
- 仍存在于 DOM，脚本仍可能读取或改写属性。

关键例外：**第一项 `legend` 元素的后代不受这次禁用传播影响。**

```html
<fieldset id="delivery-group" disabled>
  <legend>
    配送扩展
    <label>
      <input id="delivery-enabled" type="checkbox">
      启用配送
    </label>
  </legend>

  <label for="delivery-area">配送区域</label>
  <select id="delivery-area" name="deliveryArea">
    <option value="nearby">邻近社区</option>
    <option value="district">本区</option>
  </select>
</fieldset>
```

初始状态下，`delivery-enabled` 仍可操作，因为它位于第一项 `legend` 内；`delivery-area` 被传播禁用。脚本可根据开关切换 `fieldset.disabled`。

如果还有第二个 `legend`，它的后代没有这项例外。例外只看第一项 `legend` 元素，不是看“文字像不像标题”。

#### `readonly` 不是通用替代品

`readonly` 主要用于文本型 `input` 和 `textarea`：

- 仍可聚焦和复制；
- 当前值通常仍会提交；
- 用户不能直接编辑；
- 不适用于 `select`、复选框、单选按钮和普通 `button`。

`disabled` 则让支持它的控件不可交互且不提交。两者都不是授权。若业务需要展示不可修改的服务器事实，应同时保留服务端事实来源，而不是依赖客户端字段。

### 4.8 `datalist`：建议，不是限制

`datalist` 自己不是输入控件，不产生表单条目。它通过输入控件的 `list` 属性提供建议：

```html
<label for="condition">成色描述</label>
<input id="condition" name="condition" list="condition-suggestions">

<datalist id="condition-suggestions">
  <option value="全新未拆封"></option>
  <option value="近全新"></option>
  <option value="有正常使用痕迹"></option>
</datalist>
```

用户仍可以输入“边角有轻微磕碰”。因此：

- `datalist` 适合“常用值优先，但允许自由输入”；
- `select` 适合“必须从有限集合选择”；
- 需要白名单时，必须另外验证当前值；
- 建议弹层的外观、匹配方式、键盘行为和辅助技术支持可能因浏览器而异；
- 原生建议弹层的样式控制有限，不应依赖某种固定视觉。

即使 `option` 有可见说明，输入控件最终保存的仍是用户当前字符串。不要把“显示过建议”当作“值已被认证”。

### 4.9 `output`：显示计算结果，但不会自己计算

`output` 表示计算或用户操作产生的结果：

```html
<label for="total-price">预计总价</label>
<output
  id="total-price"
  name="totalDisplay"
  for="unit-price quantity"
  form="listing-form"
>
  0.00 元
</output>
```

属性含义：

- `for` 是以空格分隔的相关控件 ID 列表，表达“结果由哪些输入产生”；
- `form` 指向表单 `id`，可在不嵌套时建立表单所有者；
- `name` 让它可以通过表单元素集合查找；
- `.value` 是当前结果；
- `.defaultValue` 是表单重置所恢复的默认结果。

浏览器不会因为写了 `for` 就自动相加。脚本必须读取输入、完成计算并设置：

```js
totalPrice.value = "78.00 元";
```

`output` 虽与表单关联，但它的值本身不随表单提交。需要发送可信计算输入时，应提交原始字段，由服务端重新计算；不要增加一个隐藏字段后就把客户端总价当成可信价格。

### 4.10 `progress`：任务进度与未知进度

`progress` 表示一个任务朝完成状态推进。

确定进度：

```html
<label for="form-progress">资料完成度</label>
<progress id="form-progress" value="3" max="5">3 / 5</progress>
```

浏览器用 `value / max` 得到比例。`max` 必须大于零；未写时默认上限是 1。`progress` 的下限固定为 0，没有 `min`。

未知进度：

```html
<label for="review-progress">审核进度教学示意</label>
<progress id="review-progress" max="100">耗时未知</progress>
```

没有 `value` 属性时是 indeterminate，即知道任务正在进行，但不知道完成比例。若脚本曾设置值，想恢复未知状态，应移除属性：

```js
reviewProgress.removeAttribute("value");
console.log(reviewProgress.position); // 未知状态为 -1
```

不要设置 `value="0"` 来表示未知；它表示确定地完成了 0。子文本是后备内容，不应取代可见标签和相邻状态说明。

### 4.11 `meter`：已知范围中的当前测量

`meter` 表示已知范围内的标量，例如资料质量、磁盘占用或评分，不表示任务执行到了哪一步：

```html
<label for="quality-meter">资料质量</label>
<meter
  id="quality-meter"
  min="0"
  max="100"
  low="40"
  high="75"
  optimum="100"
  value="72"
>
  72 / 100
</meter>
```

- `min` 和 `max` 定义范围，默认分别为 0 和 1；
- `value` 是当前测量；
- `low` 与 `high` 划分区间；
- `optimum` 指出更理想的区域；
- 当 `optimum` 靠近高端时，高值更理想；靠近低端时，低值更理想；
- 属性应满足 `min ≤ low ≤ high ≤ max`，`optimum` 也应落在范围中。

原生颜色不是跨浏览器业务合同。必须用文字说明“72/100，尚缺完整成色说明”，不要只用红、黄、绿表达结论。

对照判断：

| 问题 | 元素 |
| --- | --- |
| 已填写 5 项中的 3 项 | `progress` |
| 正在处理，但无法估计剩余时间 | 无 `value` 的 `progress` |
| 商品资料质量为 72/100 | `meter` |
| 库存还有 3 件，共 10 件 | 若表达范围占比可用 `meter`，若表达拣货任务完成度才用 `progress` |

### 4.12 输入辅助：`autocomplete`、`inputmode`、`enterkeyhint`

这些属性是提示，不是强制指令。

#### `autocomplete`

`autocomplete` 帮助浏览器识别字段含义：

```html
<input
  id="contact-name"
  name="contactName"
  autocomplete="section-handoff name"
>

<input
  id="contact-tel"
  name="contactTel"
  type="tel"
  autocomplete="section-handoff tel"
>
```

常见原则：

- 身份字段使用 `name`、`given-name`、`family-name`、`email`、`tel` 等标准令牌；
- 地址可用 `street-address`、`address-line1`、`postal-code` 等；
- `section-*` 令牌把重复的收货人与交接人字段分开；
- `shipping`、`billing` 可进一步说明地址用途；
- 商品标题不是用户身份资料，可以按产品需要使用 `off`，但浏览器不保证总是照做；
- 不要把不相关字段伪装成 `email` 或 `name` 来获得填充便利；
- 自动填充后仍需执行同样的客户端和服务端校验。

#### `inputmode`

`inputmode` 提示虚拟键盘布局：

```html
<input
  id="unit-price"
  name="unitPriceYuan"
  type="text"
  inputmode="decimal"
>
```

常见值包括 `text`、`decimal`、`numeric`、`tel`、`search`、`email`、`url`、`none`。它不会改变字段数据类型，也不会阻止用户粘贴其他字符。邮编、手机号和商品编号通常是标识符，不应仅因为“看起来是数字”就使用 `type="number"`；可以选择合适文本类型与输入模式。

#### `enterkeyhint`

`enterkeyhint` 提示虚拟键盘如何标记 Enter 键：

```html
<input enterkeyhint="next">
<textarea enterkeyhint="done"></textarea>
```

常见值有 `enter`、`done`、`go`、`next`、`previous`、`search`、`send`。它不自动移动焦点、不自动提交，也不改变 Enter 的事件逻辑。

#### 相关辅助属性

- `autocapitalize="sentences"`：提示句首自动大写，适合部分自然语言；
- `spellcheck="true"`：请求拼写检查，结果和语言资源因环境而异；
- `placeholder`：给短示例，不承担标签；
- `aria-describedby`：把格式、单位、限制或错误说明关联到控件；
- `lang`：帮助拼写、朗读和输入法理解语言；
- `dir` 或 `dirname`：在确有双向文本需求时保留方向信息。

提供帮助后仍要保留恢复路径。比如价格键盘没有小数点时，用户仍应能够切换键盘或粘贴合法值。

### 4.13 `form` 属性与视觉位置边界

`button`、`select`、`textarea`、`output` 等可重新关联的表单控件可以通过 `form="某个表单 id"` 指定表单所有者，即使它们不在表单后代树中。

这解决的是所有者关系，不是布局关系：

- 视觉上放在卡片底部的按钮仍可提交上方表单；
- 表单外 `output` 仍可关联到表单；
- 控件的 `form` 属性必须匹配同一文档中的 `form[id]`；
- `label[for]` 仍按控件 `id` 建立标签关系；
- 给 `fieldset` 设置 `form` 只关联 `fieldset` 本身，不会自动重写所有后代控件的表单所有者。

过度分散控件会让阅读顺序和错误恢复变难。只有布局确实需要时才使用表单外关联，并在键盘顺序中复验。

### 4.14 内容属性、默认状态与当前状态

可以把本课几个核心状态并排比较：

| 控件 | 源标记提供的默认状态 | 当前状态 API | 重置后的方向 |
| --- | --- | --- | --- |
| `textarea` | 元素文本内容 | `.value` | 回到 `.defaultValue` |
| `option` | `selected` 内容属性 | `.selected` | 按 `.defaultSelected` 恢复 |
| `select` | 各选项默认选中组合 | `.value`、`.selectedIndex`、`.selectedOptions` | 重新应用选项默认状态 |
| `output` | 初始文本/默认值 | `.value` | 回到 `.defaultValue` |
| `button` | `value` 内容属性 | `.value` 反映提交值 | 一般不是用户编辑状态 |
| `progress` | `value` 内容属性是否存在 | `.value`、`.position` | 不由表单重置管理 |
| `meter` | `value` 内容属性 | `.value` | 不由表单重置管理 |

“DOM 属性当前看到什么”和“下一次表单提交会产生什么”仍是两个问题。提交还要考虑 `name`、禁用状态、提交者以及控件是否属于可提交类别。

### 4.15 控件选择速查

| 需求 | 优先选择 | 不要误用 |
| --- | --- | --- |
| 一段自由多行描述 | `textarea` | 多个单行 `input` 拼接 |
| 必须从一个有限集合选一项 | 单选 `select` 或 radio | `datalist` |
| 必须从少量集合选多项 | checkbox 组 | 难发现的多选列表 |
| 从较长集合选多项 | `select[multiple]`，并写操作说明 | 只读取 `.value` |
| 常用建议但允许自由输入 | `input[list]` + `datalist` | 把建议当白名单 |
| 给一组字段命名 | `fieldset` + 第一项 `legend` | 普通加粗段落 |
| 显示脚本计算结果 | `output` | 可编辑输入框伪装结果 |
| 任务完成比例 | `progress` | `meter` |
| 已知范围的当前水平 | `meter` | `progress` |
| 防止用户编辑文本但仍提交 | 支持类型上的 `readonly` | 对所有控件机械使用 `disabled` |

## 5. 元素、属性、API 或配置清单

### 5.1 元素与关键属性

| 名称 | 作用 | 关键属性 | 主要边界 |
| --- | --- | --- | --- |
| `label` | 给可标记控件命名 | `for` | `for` 匹配控件 `id`，不是 `name` |
| `textarea` | 多行纯文本输入 | `name`、`rows`、`cols`、`wrap`、`readonly`、`form` | 初始值写在元素内容中 |
| `select` | 有限选项选择 | `name`、`multiple`、`size`、`disabled`、`form` | 无通用 `readonly` |
| `option` | 一个可选值 | `value`、`selected`、`disabled` | 文案不应代替稳定机器值 |
| `optgroup` | 给选项分组 | `label`、`disabled` | 分组本身不可选 |
| `button` | 原生命令或提交者 | `type`、`form`、`name`、`value`、`disabled` | 表单内省略类型可能提交 |
| `fieldset` | 给相关控件成组 | `disabled`、`form`、`name` | `form` 不自动关联所有后代 |
| `legend` | 给 fieldset 命名 | 全局属性 | 第一项 legend 有禁用传播例外 |
| `datalist` | 给输入提供建议 | `id` | 不提交，不限制自由输入 |
| `output` | 表示计算结果 | `for`、`form`、`name` | 不自动计算，值不提交 |
| `progress` | 任务进度 | `value`、`max` | 缺少 `value` 才是未知进度 |
| `meter` | 已知范围中的测量 | `value`、`min`、`max`、`low`、`high`、`optimum` | 不表示任务进度 |

### 5.2 状态和选择 API

| API | 返回或行为 | 观察重点 |
| --- | --- | --- |
| `control.labels` | 关联标签的 `NodeList` | 显式或隐式标签是否真实建立 |
| `label.control` | 标签所关联的控件 | `for` 拼写错误时可能为 `null` |
| `textarea.value` | 当前文本 | 用户输入改变它 |
| `textarea.defaultValue` | 默认文本 | reset 恢复目标 |
| `selectionStart/End` | 当前选择区边界 | 索引针对当前值 |
| `setSelectionRange()` | 设置文本选择区 | 不应在输入时反复抢光标 |
| `select.value` | 首个当前选中值 | 多选时不完整 |
| `select.selectedIndex` | 首个选中选项索引 | 无选项时可能为 `-1` |
| `select.selectedOptions` | 当前选中选项的实时集合 | 需要复制后再保存快照 |
| `select.options` | 全部选项集合 | 包含 optgroup 内选项 |
| `option.selected` | 当前选中状态 | 用户操作会改变 |
| `option.defaultSelected` | 默认选中状态 | 反映 `selected` 内容属性 |
| `fieldset.disabled` | 分组禁用状态 | 第一项 legend 后代例外 |
| `output.value` | 当前结果文字 | 脚本负责赋值 |
| `output.defaultValue` | 默认结果 | reset 恢复目标 |
| `progress.position` | 完成比例，未知时为 `-1` | 与 `value/max` 对照 |
| `FormData.getAll(name)` | 同名字段全部值 | 多选和复选框组必须使用 |

### 5.3 输入辅助属性

| 属性 | 示例 | 它能做什么 | 它不能做什么 |
| --- | --- | --- | --- |
| `autocomplete` | `section-handoff tel` | 提示字段语义和填充区域 | 保证浏览器填充或保证值正确 |
| `inputmode` | `decimal` | 提示虚拟键盘布局 | 校验字符或改变值类型 |
| `enterkeyhint` | `next` | 提示 Enter 键标签 | 自动跳到下一个控件 |
| `autocapitalize` | `sentences` | 提示自动大小写 | 改变服务端数据规则 |
| `spellcheck` | `true` | 请求拼写检查 | 保证检查结果或词库一致 |
| `placeholder` | `例如：阅读台灯` | 给短输入示例 | 替代持久可见标签 |
| `aria-describedby` | `title-help` | 关联帮助和错误说明 | 给控件命名 |

## 6. 最小可运行案例

### 6.1 案例目标

这个页面只观察三件事：

1. 显式标签和隐式标签是否都关联成功；
2. `textarea` 的 `defaultValue` 与 `value` 如何分离并在 reset 后恢复；
3. 多选 `select` 的 `.value`、`selectedOptions` 和 `FormData.getAll()` 有何差异。

### 6.2 文件位置

在个人练习目录创建：

```text
market-learning/
└── practice/
    └── html-chapter-05/
        └── controls-observer.html
```

教材仓库只保存下面的 Markdown 代码。将完整代码保存为 `controls-observer.html`。

### 6.3 完整文件

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>控件状态观察页</title>
    <style>
      body {
        max-width: 48rem;
        margin: 0 auto;
        padding: 1rem;
        font: 1rem/1.6 system-ui, sans-serif;
      }

      label,
      select,
      textarea,
      button {
        display: block;
        margin-block: 0.5rem;
      }

      textarea,
      select {
        inline-size: min(100%, 32rem);
      }

      output {
        display: block;
        padding: 0.75rem;
        white-space: pre-wrap;
        border: 1px solid #777;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>控件状态观察页</h1>
      <p>所有变化仅存在于当前页面内存中。</p>

      <form id="observer-form">
        <label for="description">商品描述</label>
        <textarea
          id="description"
          name="description"
          rows="4"
          cols="36"
          wrap="soft"
        >灯臂可调，开关正常。</textarea>

        <label for="tags">商品标签（可多选）</label>
        <p id="tags-help">桌面端可使用 Ctrl、Command 或 Shift 组合选择。</p>
        <select
          id="tags"
          name="tags"
          multiple
          size="4"
          aria-describedby="tags-help"
        >
          <option value="tested" selected>已测试</option>
          <option value="negotiable">可议价</option>
          <option value="with-box">有原包装</option>
          <option value="local-pickup">仅限自提</option>
        </select>

        <label>
          <input id="negotiable" name="negotiable" type="checkbox" value="yes">
          接受议价
        </label>

        <button id="inspect" type="button">读取当前状态</button>
        <button type="reset">恢复默认状态</button>
      </form>

      <h2>观察结果</h2>
      <output id="result" for="description tags negotiable">
        尚未读取。
      </output>
    </main>

    <script>
      const form = document.querySelector("#observer-form");
      const description = document.querySelector("#description");
      const tags = document.querySelector("#tags");
      const negotiable = document.querySelector("#negotiable");
      const inspectButton = document.querySelector("#inspect");
      const result = document.querySelector("#result");

      function selectedTagValues() {
        return Array.from(
          tags.selectedOptions,
          (option) => option.value,
        );
      }

      function renderObservation() {
        const data = new FormData(form);
        const evidence = {
          descriptionLabelCount: description.labels.length,
          negotiableLabelCount: negotiable.labels.length,
          descriptionDefaultValue: description.defaultValue,
          descriptionCurrentValue: description.value,
          selectValueOnly: tags.value,
          selectedOptions: selectedTagValues(),
          formDataTags: data.getAll("tags"),
          negotiableSubmitted: data.has("negotiable"),
        };

        result.value = JSON.stringify(evidence, null, 2);
      }

      inspectButton.addEventListener("click", renderObservation);

      form.addEventListener("reset", () => {
        setTimeout(renderObservation, 0);
      });

      renderObservation();
    </script>
  </body>
</html>
```

### 6.4 打开方式

1. 保存文件；
2. 用浏览器直接打开，不需要服务器；
3. 点击“读取当前状态”；
4. 修改描述，选择两到三个标签，再次读取；
5. 选中“接受议价”，再次读取；
6. 点击“恢复默认状态”；
7. 打开 Console，手动查看 `description.selectionStart` 和 `description.selectionEnd`。

### 6.5 预期结果

首次读取：

- `descriptionLabelCount` 是 1；
- `negotiableLabelCount` 是 1，说明隐式标签也建立了关联；
- 描述默认值与当前值都是“灯臂可调，开关正常。”；
- `selectValueOnly` 只有首个选中值 `tested`；
- `selectedOptions` 和 `formDataTags` 都包含全部当前选中标签；
- 未勾选议价时，`negotiableSubmitted` 是 `false`。

修改后：

- `descriptionCurrentValue` 改变；
- `descriptionDefaultValue` 保持不变；
- 多选数组按选项树顺序列出当前选择；
- 勾选议价后，FormData 中出现 `negotiable=yes`。

重置后：

- 描述当前值回到默认值；
- 只有源标记中带 `selected` 的 `tested` 恢复选中；
- 复选框回到未选中；
- reset 监听器使用下一轮任务读取，避免在浏览器完成重置前读取旧状态。

### 6.6 失败证据

任一情况都应记录为失败：

- `description.labels.length === 0`：检查 `for` 与 `id`；
- 修改描述后 `defaultValue` 也改变：检查脚本是否错误地写了 `.defaultValue`；
- 选中三项但 `formDataTags` 只有一项：检查是否使用了 `get()` 或 `.value`；
- 点击“读取当前状态”触发页面导航：检查按钮是否遗漏 `type="button"`；
- reset 后结果仍显示旧值：检查是否在 reset 事件同步阶段过早读取；
- 页面刷新后还声称数据已经保存：文案越过了静态教学边界。

### 6.7 渐进扩展：观察文本选择区

在读取按钮旁增加：

```html
<button id="select-first-two" type="button">
  选中描述前两个字符
</button>
```

在脚本查询区增加：

```js
const selectFirstTwoButton = document.querySelector("#select-first-two");
```

在事件区增加：

```js
selectFirstTwoButton.addEventListener("click", () => {
  description.setSelectionRange(0, 2, "forward");
  description.focus();
});
```

预期“灯臂”被选中。失败时依次检查按钮类型、元素 ID、当前描述是否至少两个字符，以及调用后是否聚焦。

## 7. 邻里集市集成案例

### 7.1 业务目标与静态边界

案例实现“分类商品发布预览”，结构如下：

```text
商品发布表单
├── 基本信息
│   ├── 标题
│   ├── 描述
│   ├── 分类 optgroup
│   ├── 标签 multiple
│   └── 成色 datalist
├── 价格
│   ├── 单价文本
│   ├── 数量
│   └── 总价 output
├── 配送扩展 fieldset[disabled]
│   ├── 第一项 legend 中的启用开关
│   └── 配送区域与说明
├── 完成度 progress
├── 资料质量 meter
└── 本地 JSON 预览
```

页面不会：

- 向服务器发送请求；
- 保存草稿；
- 创建商品 ID；
- 执行权限检查；
- 锁定价格；
- 处理多人同时编辑；
- 在刷新后恢复数据。

### 7.2 文件位置

创建：

```text
market-learning/
└── practice/
    └── html-chapter-05/
        └── categorized-listing-form.html
```

### 7.3 完整代码

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>分类商品发布预览 · 邻里集市</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, sans-serif;
      }

      body {
        max-width: 64rem;
        margin: 0 auto;
        padding: 1rem;
        line-height: 1.6;
      }

      form {
        display: grid;
        gap: 1rem;
      }

      fieldset {
        display: grid;
        gap: 0.75rem;
        padding: 1rem;
      }

      label:not(.inline-label) {
        display: block;
        font-weight: 650;
      }

      input,
      textarea,
      select,
      output {
        box-sizing: border-box;
        inline-size: min(100%, 36rem);
        padding: 0.5rem;
        font: inherit;
      }

      output {
        display: block;
        border: 1px solid currentColor;
      }

      .help {
        margin-block: 0.25rem;
      }

      .status-grid {
        display: grid;
        grid-template-columns: max-content minmax(12rem, 1fr) max-content;
        gap: 0.5rem;
        align-items: center;
      }

      progress,
      meter {
        inline-size: 100%;
      }

      pre {
        padding: 1rem;
        overflow: auto;
        border: 1px solid currentColor;
        white-space: pre-wrap;
      }

      button {
        min-block-size: 2.75rem;
        font: inherit;
      }

      :focus-visible {
        outline: 3px solid CanvasText;
        outline-offset: 3px;
      }
    </style>
  </head>
  <body>
    <header>
      <p>邻里集市</p>
      <h1>分类商品发布预览</h1>
      <p>
        教学状态：只在当前页面内存中生成预览，未保存到服务器。
      </p>
    </header>

    <main>
      <form id="listing-form" autocomplete="on">
        <fieldset>
          <legend>基本信息</legend>

          <div>
            <label for="listing-title">商品标题</label>
            <p id="title-help" class="help">
              使用买家能识别的名称，不要只写“闲置”。
            </p>
            <input
              id="listing-title"
              name="title"
              type="text"
              value="阅读台灯"
              autocomplete="off"
              enterkeyhint="next"
              aria-describedby="title-help"
            >
          </div>

          <div>
            <label for="listing-description">商品描述</label>
            <p id="description-help" class="help">
              说明成色、功能和交接时可检查的项目。
            </p>
            <textarea
              id="listing-description"
              name="description"
              rows="5"
              cols="42"
              wrap="soft"
              autocomplete="off"
              enterkeyhint="next"
              autocapitalize="sentences"
              spellcheck="true"
              aria-describedby="description-help"
            >灯臂可调，开关正常，交接时可通电检查。</textarea>
          </div>

          <div>
            <label for="listing-category">商品分类</label>
            <select
              id="listing-category"
              name="category"
              autocomplete="off"
            >
              <option value="">请选择分类</option>
              <optgroup label="家居">
                <option value="lighting" selected>灯具</option>
                <option value="storage">收纳</option>
                <option value="small-furniture">小件家具</option>
              </optgroup>
              <optgroup label="数码">
                <option value="computer-accessory">电脑配件</option>
                <option value="audio-device">音频设备</option>
              </optgroup>
              <optgroup label="图书">
                <option value="textbook">教材</option>
                <option value="literature">文学</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label for="listing-tags">商品标签（可多选）</label>
            <p id="tags-help" class="help">
              桌面端通常使用 Ctrl、Command 或 Shift 组合选择。
            </p>
            <select
              id="listing-tags"
              name="tags"
              multiple
              size="5"
              aria-describedby="tags-help"
            >
              <option value="tested" selected>已测试</option>
              <option value="negotiable">可议价</option>
              <option value="with-box">有原包装</option>
              <option value="local-pickup" selected>仅限自提</option>
              <option value="urgent">急出</option>
            </select>
          </div>

          <div>
            <label for="listing-condition">成色描述</label>
            <p id="condition-help" class="help">
              可以选择建议，也可以输入更准确的自由文字。
            </p>
            <input
              id="listing-condition"
              name="condition"
              type="text"
              value="有正常使用痕迹"
              list="condition-suggestions"
              autocomplete="off"
              enterkeyhint="next"
              aria-describedby="condition-help"
            >
            <datalist id="condition-suggestions">
              <option value="全新未拆封"></option>
              <option value="近全新"></option>
              <option value="有正常使用痕迹"></option>
              <option value="功能正常，外观有瑕疵"></option>
            </datalist>
          </div>
        </fieldset>

        <fieldset>
          <legend>价格与数量</legend>

          <div>
            <label for="unit-price">单价（元）</label>
            <p id="price-help" class="help">
              最多六位整数和两位小数；脚本会先转换成整数分。
            </p>
            <input
              id="unit-price"
              name="unitPriceYuan"
              type="text"
              value="39.00"
              inputmode="decimal"
              autocomplete="off"
              enterkeyhint="next"
              aria-describedby="price-help"
            >
          </div>

          <div>
            <label for="quantity">数量</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              value="1"
              min="1"
              max="99"
              step="1"
              inputmode="numeric"
              enterkeyhint="done"
            >
          </div>

          <div>
            <label for="total-price">预计总价</label>
            <output
              id="total-price"
              name="totalDisplay"
              for="unit-price quantity"
              form="listing-form"
            >39.00 元</output>
            <p class="help">
              output 只显示计算结果；预览对象另外保存整数分。
            </p>
          </div>
        </fieldset>

        <fieldset id="delivery-group" disabled>
          <legend>
            配送扩展
            <label class="inline-label">
              <input
                id="delivery-enabled"
                name="deliveryEnabled"
                type="checkbox"
                value="yes"
              >
              启用配送
            </label>
          </legend>

          <div>
            <label for="delivery-area">配送区域</label>
            <select id="delivery-area" name="deliveryArea">
              <option value="nearby">邻近社区</option>
              <option value="district">本区</option>
            </select>
          </div>

          <div>
            <label for="delivery-note">配送说明</label>
            <textarea
              id="delivery-note"
              name="deliveryNote"
              rows="3"
              cols="42"
              wrap="soft"
            >仅周末白天可送达。</textarea>
          </div>
        </fieldset>

        <section aria-labelledby="status-title">
          <h2 id="status-title">资料状态</h2>

          <div class="status-grid">
            <label for="completion-progress">完成度</label>
            <progress
              id="completion-progress"
              value="0"
              max="5"
            >0 / 5</progress>
            <span id="completion-text">0 / 5</span>

            <label for="quality-meter">资料质量</label>
            <meter
              id="quality-meter"
              min="0"
              max="100"
              low="40"
              high="75"
              optimum="100"
              value="0"
            >0 / 100</meter>
            <span id="quality-text">0 / 100</span>

            <label for="review-progress">审核进度示意</label>
            <progress id="review-progress" max="100">
              耗时未知
            </progress>
            <span>未知</span>
          </div>

          <p>
            “完成度”是确定任务进度；“资料质量”是已知范围的测量；
            “审核进度示意”没有 value，只演示未知进度，不代表真实审核。
          </p>
        </section>

        <p>
          <button
            type="submit"
            name="intent"
            value="preview"
          >
            生成本地预览
          </button>
          <button id="inspect-state" type="button">
            观察控件状态
          </button>
          <button type="reset">
            恢复默认值
          </button>
        </p>
      </form>

      <p>
        <button
          type="submit"
          form="listing-form"
          name="intent"
          value="preview-outside"
        >
          从表单外生成本地预览
        </button>
      </p>

      <section aria-labelledby="preview-title">
        <h2 id="preview-title">页面内存预览</h2>
        <p id="preview-status" role="status">
          尚未生成。不会保存到服务器。
        </p>
        <pre id="preview-json">没有预览数据。</pre>
      </section>
    </main>

    <script>
      const form = document.querySelector("#listing-form");
      const titleInput = document.querySelector("#listing-title");
      const descriptionInput = document.querySelector("#listing-description");
      const categorySelect = document.querySelector("#listing-category");
      const tagsSelect = document.querySelector("#listing-tags");
      const conditionInput = document.querySelector("#listing-condition");
      const unitPriceInput = document.querySelector("#unit-price");
      const quantityInput = document.querySelector("#quantity");
      const totalPriceOutput = document.querySelector("#total-price");
      const deliveryGroup = document.querySelector("#delivery-group");
      const deliveryEnabled = document.querySelector("#delivery-enabled");
      const deliveryArea = document.querySelector("#delivery-area");
      const deliveryNote = document.querySelector("#delivery-note");
      const completionProgress = document.querySelector("#completion-progress");
      const completionText = document.querySelector("#completion-text");
      const qualityMeter = document.querySelector("#quality-meter");
      const qualityText = document.querySelector("#quality-text");
      const inspectStateButton = document.querySelector("#inspect-state");
      const previewStatus = document.querySelector("#preview-status");
      const previewJson = document.querySelector("#preview-json");

      function selectedValues(selectElement) {
        return Array.from(
          selectElement.selectedOptions,
          (option) => option.value,
        );
      }

      function parseYuanToCents(rawValue) {
        const match = /^(0|[1-9]\d{0,5})(?:\.(\d{1,2}))?$/.exec(
          rawValue.trim(),
        );

        if (!match) {
          return null;
        }

        const yuan = Number(match[1]);
        const fraction = (match[2] ?? "").padEnd(2, "0");
        return yuan * 100 + Number(fraction);
      }

      function parseQuantity(rawValue) {
        const quantity = Number(rawValue);
        if (!Number.isSafeInteger(quantity)) {
          return null;
        }
        if (quantity < 1 || quantity > 99) {
          return null;
        }
        return quantity;
      }

      function formatCents(cents) {
        const yuan = Math.floor(cents / 100);
        const fraction = String(cents % 100).padStart(2, "0");
        return `${yuan}.${fraction} 元`;
      }

      function calculateTotalCents() {
        const unitPriceCents = parseYuanToCents(unitPriceInput.value);
        const quantity = parseQuantity(quantityInput.value);

        if (unitPriceCents === null || quantity === null) {
          totalPriceOutput.value = "请输入有效金额和数量";
          return null;
        }

        const totalPriceCents = unitPriceCents * quantity;
        totalPriceOutput.value = formatCents(totalPriceCents);
        return totalPriceCents;
      }

      function updateDeliveryState() {
        deliveryGroup.disabled = !deliveryEnabled.checked;
      }

      function updateCompletion() {
        const checks = [
          titleInput.value.trim() !== "",
          descriptionInput.value.trim() !== "",
          categorySelect.value !== "",
          tagsSelect.selectedOptions.length > 0,
          calculateTotalCents() !== null,
        ];
        const completed = checks.filter(Boolean).length;

        completionProgress.value = completed;
        completionProgress.textContent = `${completed} / ${checks.length}`;
        completionText.textContent = `${completed} / ${checks.length}`;
      }

      function updateQuality() {
        let score = 0;

        if (titleInput.value.trim().length >= 4) {
          score += 20;
        }
        if (descriptionInput.value.trim().length >= 20) {
          score += 30;
        }
        if (categorySelect.value !== "") {
          score += 20;
        }
        if (tagsSelect.selectedOptions.length >= 2) {
          score += 15;
        }
        if (conditionInput.value.trim().length >= 4) {
          score += 15;
        }

        qualityMeter.value = score;
        qualityMeter.textContent = `${score} / 100`;
        qualityText.textContent = `${score} / 100`;
      }

      function updateDerivedState() {
        calculateTotalCents();
        updateCompletion();
        updateQuality();
      }

      function appendSubmitter(data, submitter) {
        if (!submitter || !submitter.name) {
          return;
        }
        data.append(submitter.name, submitter.value);
      }

      function buildListingPreview(data, totalPriceCents) {
        const unitPriceCents = parseYuanToCents(unitPriceInput.value);
        const quantity = parseQuantity(quantityInput.value);
        const hasDelivery = deliveryEnabled.checked;

        return {
          title: data.get("title"),
          description: data.get("description"),
          category: data.get("category"),
          tags: data.getAll("tags"),
          condition: data.get("condition"),
          unitPriceCents,
          quantity,
          totalPriceCents,
          delivery: hasDelivery
            ? {
                area: data.get("deliveryArea"),
                note: data.get("deliveryNote"),
              }
            : null,
          intent: data.get("intent"),
          teachingState: "memory-only-not-saved",
        };
      }

      function showControlEvidence() {
        const data = new FormData(form);
        const evidence = {
          titleLabelCount: titleInput.labels.length,
          descriptionDefaultValue: descriptionInput.defaultValue,
          descriptionCurrentValue: descriptionInput.value,
          categoryValue: categorySelect.value,
          categorySelectedIndex: categorySelect.selectedIndex,
          tagsValueOnly: tagsSelect.value,
          tagsSelectedOptions: selectedValues(tagsSelect),
          tagsFormData: data.getAll("tags"),
          deliveryFieldsetDisabled: deliveryGroup.disabled,
          deliveryToggleOwnDisabledProperty: deliveryEnabled.disabled,
          deliveryToggleEffectivelyDisabled:
            deliveryEnabled.matches(":disabled"),
          deliveryAreaEffectivelyDisabled:
            deliveryArea.matches(":disabled"),
          deliveryAreaSubmitted: data.has("deliveryArea"),
          outputFormId: totalPriceOutput.form?.id ?? null,
          outputSubmitted: data.has("totalDisplay"),
        };

        previewJson.textContent = JSON.stringify(evidence, null, 2);
        previewStatus.textContent =
          "已读取当前控件状态；没有保存到服务器。";
      }

      deliveryEnabled.addEventListener("change", () => {
        updateDeliveryState();
        updateDerivedState();
      });

      form.addEventListener("input", updateDerivedState);
      form.addEventListener("change", updateDerivedState);
      inspectStateButton.addEventListener("click", showControlEvidence);

      form.addEventListener("submit", (event) => {
        event.preventDefault();

        const totalPriceCents = calculateTotalCents();
        if (totalPriceCents === null) {
          previewStatus.textContent =
            "无法生成预览：金额或数量格式不正确。";
          previewJson.textContent = "没有预览数据。";
          unitPriceInput.focus();
          return;
        }

        const data = new FormData(form);
        appendSubmitter(data, event.submitter);
        const preview = buildListingPreview(data, totalPriceCents);

        previewJson.textContent = JSON.stringify(preview, null, 2);
        previewStatus.textContent =
          "本地预览已生成；只存在于页面内存，未保存到服务器。";
      });

      form.addEventListener("reset", () => {
        setTimeout(() => {
          updateDeliveryState();
          updateDerivedState();
          previewJson.textContent = "没有预览数据。";
          previewStatus.textContent =
            "已恢复默认值；没有保存到服务器。";
        }, 0);
      });

      updateDeliveryState();
      updateDerivedState();
    </script>
  </body>
</html>
```

### 7.4 首次打开的预期结果

不用点击任何按钮，页面应满足：

- 标题和描述已有默认值；
- 分类当前值是 `lighting`；
- 标签默认选中 `tested` 和 `local-pickup`；
- 成色输入显示建议值，但仍可输入其他文字；
- 总价显示 `39.00 元`；
- 配送分组整体呈禁用状态；
- 配送启用开关仍可操作；
- 配送区域与说明不可操作；
- 完成度是 `5 / 5`；
- 资料质量根据现有文本显示已知分值；
- 审核进度示意没有 `value`，呈未知进度；
- 预览区明确写着没有保存。

### 7.5 多选观察路径

1. 点击“观察控件状态”；
2. 比较 `tagsValueOnly`、`tagsSelectedOptions`、`tagsFormData`；
3. 再多选“可议价”和“有原包装”；
4. 重新观察。

预期：

- `tagsValueOnly` 始终只是第一个当前选中值；
- `tagsSelectedOptions` 是全部当前值的数组；
- `tagsFormData` 与全部选中机器值一致；
- `selectedOptions` 和表单数据按选项树顺序，而不记录用户点击顺序。

如果只能选一项，先确认 `multiple` 是否仍存在，再确认操作系统的多选按键。若目标用户很难发现多选操作，记录产品改为复选框组的建议，而不是用更多说明文字掩盖交互问题。

### 7.6 `fieldset[disabled]` 例外路径

初始点击“观察控件状态”：

```text
deliveryFieldsetDisabled: true
deliveryToggleOwnDisabledProperty: false
deliveryToggleEffectivelyDisabled: false
deliveryAreaEffectivelyDisabled: true
deliveryAreaSubmitted: false
```

这证明：

- 禁用状态传播到配送区域；
- 第一项 `legend` 中的启用开关不受传播；
- 禁用区域不进入 FormData。

勾选“启用配送”后：

- 脚本把 `deliveryGroup.disabled` 设为 `false`；
- 配送区域和说明可编辑；
- 再观察时 `deliveryAreaSubmitted` 为 `true`。

取消勾选后，分组再次禁用，配送字段再次从 FormData 消失。它们的 DOM `.value` 可能仍存在，这正说明“DOM 中有值”和“本次提交有条目”不是同一件事。

### 7.7 整数分计算路径

依次测试：

| 单价输入 | 数量 | 预期总价显示 | 预期整数分 |
| --- | ---: | --- | ---: |
| `39` | 1 | `39.00 元` | 3900 |
| `39.9` | 2 | `79.80 元` | 7980 |
| `0.01` | 3 | `0.03 元` | 3 |
| `39.999` | 1 | 输入无效 | 不生成 |
| `-1` | 1 | 输入无效 | 不生成 |
| `1e3` | 1 | 输入无效 | 不生成 |

代码先把十进制字符串拆成“元”和“小数部分”，再形成整数分。它没有执行 `Number("39.9") * 100` 这类依赖浮点舍入的金额转换。

案例把金额范围限制为最多六位整数和两位小数，这是本地教学规则，不是完整支付系统。真实系统仍需服务端定义币种、范围、舍入和并发价格策略。

### 7.8 按钮与表单所有者路径

先点击表单内的“生成本地预览”，再点击表单外按钮。两次预览对象中的 `intent` 应分别是：

```text
preview
preview-outside
```

两次 `submit` 事件都被 `preventDefault()` 拦截。表单外按钮因为 `form="listing-form"` 拥有同一个表单所有者，但它的视觉位置仍在表单后方。

“观察控件状态”使用 `type="button"`，不会触发提交；“恢复默认值”使用 `type="reset"`，会恢复默认值和默认选中状态。

### 7.9 `progress` 与 `meter` 对照路径

清空标题：

- 完成度从 5 降到 4，因为一个确定任务项未完成；
- 质量分下降 20，因为已知评分规则失去一项；
- 未知审核进度不应变化，因为它只是语义对照。

把描述缩短到 20 字以下：

- 完成度仍把“非空”算作完成；
- 质量分失去描述完整度的 30 分。

同一个输入可以进入两个不同模型：完成度回答“有没有”，质量回答“够不够好”。这正是 `progress` 与 `meter` 不可互换的原因。

### 7.10 `datalist` 边界路径

把成色改成“右下角有 2 厘米划痕”。即使它不在建议列表：

- 输入值仍被保留；
- FormData 仍包含这个自由文本；
- 本地预览仍可生成；
- 浏览器没有因为 `datalist` 自动报错。

若产品规定只能使用标准成色等级，应改用 `select`，或在下一课增加明确校验；不能只看是否出现过建议弹层。

### 7.11 文件、打开方式、预期与失败证据

| 项目 | 记录 |
| --- | --- |
| 文件 | `practice/html-chapter-05/categorized-listing-form.html` |
| 打开 | 浏览器直接打开本地文件 |
| 网络 | 不需要；Network 中不应出现发布请求 |
| 持久化 | 无；刷新恢复源文件默认状态 |
| 预期 | 多选、分组开关、整数分计算、状态对照和内存预览可观察 |
| 失败证据 | 意外导航、出现网络请求、刷新后声称已保存、金额不是安全整数、多选丢值、禁用字段进入 FormData |

建议保存以下证据：

```text
浏览器与版本：
初始 selectedOptions：
修改后 selectedOptions：
FormData.getAll("tags")：
fieldset.disabled：
第一项 legend 中开关的 disabled：
配送字段是否进入 FormData：
0.01 元 × 3 的 totalPriceCents：
progress 当前值与 max：
meter 当前值和区间：
自由成色值：
两个 submitter 的 intent：
Network 是否出现请求：
刷新后的状态：
```

### 7.12 渐进扩展：添加只读的计算规则说明

在价格分组中加入：

```html
<label for="pricing-rule">计价规则</label>
<textarea
  id="pricing-rule"
  name="pricingRule"
  rows="2"
  cols="42"
  readonly
>总价 = 单价整数分 × 数量；服务端仍需重新计算。</textarea>
```

观察：

- 可以聚焦和复制；
- 用户不能直接修改；
- 它仍可能进入 FormData；
- 它是教学说明，不应作为服务器规则来源。

再把 `readonly` 错写到 `select` 上，观察它不会形成可靠只读选择。恢复时删除无效设计：若必须允许提交且不允许编辑，应由页面展示服务器事实并在服务端取回事实；若临时禁用选择，要接受它不进入 FormData，并在服务端从可信来源重建。

## 8. 常见错误与排查路径

### 8.1 用 `placeholder` 代替标签

**错误案例：**

```html
<input name="title" placeholder="商品标题">
```

**现象：**空白时看似有名称，输入后文字消失。

**诊断：**

1. Elements 中查找关联 `label`；
2. Console 读取 `input.labels.length`；
3. 检查 Accessibility 面板中的名称来源。

**原因：**提示示例不承担稳定可见名称。

**恢复：**

```html
<label for="title">商品标题</label>
<input id="title" name="title" placeholder="例如：阅读台灯">
```

**复验：**输入后“商品标题”仍可见，`labels.length === 1`。

### 8.2 `for` 错指向 `name`

**错误案例：**

```html
<label for="title">商品标题</label>
<input id="listing-title" name="title">
```

**现象：**点击标签不聚焦输入框，`label.control` 为 `null`。

**原因：**`for` 匹配 `id`，不是 `name`。

**恢复：**把 `for` 改为 `listing-title`，保留提交字段名 `title`。

### 8.3 在 `textarea` 上写 `value`

**错误案例：**

```html
<textarea name="description" value="灯臂可调"></textarea>
```

**现象：**控件初始为空，`value` 内容属性没有提供期望文本。

**恢复：**

```html
<textarea name="description">灯臂可调</textarea>
```

脚本设置当前值时使用 `.value`，设置重置目标时才考虑 `.defaultValue`。

### 8.4 代码缩进污染 textarea 初始值

**现象：**描述开头多出换行和空格。

**证据：**

```js
console.log(JSON.stringify(description.defaultValue));
```

**原因：**开始标签与结束标签之间的排版就是初始文本。

**恢复：**把初始文字紧贴开始标签，复验 JSON 字符串开头。

### 8.5 多选只读取 `.value`

**错误案例：**

```js
const tags = document.querySelector("#listing-tags").value;
```

**现象：**用户选中三项，预览只有一项。

**恢复：**

```js
const tags = Array.from(
  document.querySelector("#listing-tags").selectedOptions,
  (option) => option.value,
);
```

提交数据再用 `FormData.getAll("tags")` 复验。

### 8.6 用 option 文案当稳定机器值

**错误案例：**

```html
<option>灯具</option>
```

文案改成“照明灯具”后，提交值也跟着变。

**恢复：**

```html
<option value="lighting">照明灯具</option>
```

机器值变更应作为数据合同变更审查，文案变更不应自动触发。

### 8.7 辅助按钮遗漏 `type`

**错误案例：**

```html
<button id="inspect-state">观察控件状态</button>
```

**现象：**点击后触发 submit，甚至发生导航。

**恢复：**

```html
<button id="inspect-state" type="button">观察控件状态</button>
```

在 submit 监听器记录 `event.submitter`，确认观察按钮不再出现。

### 8.8 误判禁用 fieldset 的第一 legend

**现象：**整个分组视觉变灰，但 legend 中的开关仍能操作，被误认为浏览器失效。

**证据：**

```js
console.log(deliveryGroup.disabled);    // true
console.log(deliveryEnabled.disabled);             // false：自身没有 disabled 属性
console.log(deliveryEnabled.matches(":disabled")); // false：位于首个 legend 的例外内
console.log(deliveryArea.disabled);                 // false：自身没有 disabled 属性
console.log(deliveryArea.matches(":disabled"));    // true：受到 fieldset 传播
console.log(new FormData(form).has("deliveryArea")); // false：不是成功控件
```

**原因：**`.disabled` 只反映控件自身的内容属性/DOM 属性，不包含祖先 `fieldset` 传播后的有效禁用状态。第一项 `legend` 后代是传播例外；普通后代虽然 `.disabled === false`，仍会匹配 `:disabled`，且不会进入 FormData。

**恢复：**如果开关本来就用于启用分组，保留结构并同时记录 `.disabled`、`:disabled` 和 FormData；如果不应操作，把开关移出例外区域或单独禁用。不要依赖变灰外观或单一 DOM 属性推断有效状态。

### 8.9 认为禁用字段会保留提交值

**现象：**配送说明 DOM 中有文字，预览对象却没有它。

**证据：**

```js
console.log(deliveryNote.value);
console.log(new FormData(form).has("deliveryNote"));
```

**原因：**禁用控件不是成功控件。

**恢复：**根据业务决定是否重新启用；服务器事实由服务端读取，不要用隐藏字段复制禁用值来伪造可信来源。

### 8.10 把 `datalist` 当成白名单

**错误案例：**

```html
<input name="condition" list="conditions">
<datalist id="conditions">
  <option value="近全新"></option>
</datalist>
```

产品代码却直接假定值只能是“近全新”。

**现象：**用户输入“有划痕”仍可提交。

**恢复：**允许自由文本就接受并校验文本；必须有限集合就使用 `select` 或增加独立校验。

### 8.11 期待 `output[for]` 自动计算

**现象：**修改单价和数量后结果不变。

**原因：**`for` 只表达关系，计算逻辑仍由脚本负责。

**恢复：**监听相关输入，转换成整数分，设置 `output.value`。再用 `0.01 × 3` 复验。

### 8.12 用浮点元计算金额

**错误案例：**

```js
const totalYuan = Number(unitPrice.value) * Number(quantity.value);
const totalCents = totalYuan * 100;
```

**问题：**二进制浮点不能精确表示所有十进制小数，后续舍入规则也不明确。

**恢复：**先按明确十进制格式解析成整数分，再乘整数数量。真实交易规则由服务端重复执行。

### 8.13 用 `progress` 表示资料质量

**现象：**读者误以为质量会随着时间最终到 100%。

**原因：**任务进度和范围测量混淆。

**恢复：**资料完成项使用 `progress`；资料质量分使用 `meter`，并显示文字解释。

### 8.14 用 `value="0"` 表示未知进度

**现象：**控件表示“确定完成 0%”，而不是“不知道进度”。

**恢复：**

```js
progress.removeAttribute("value");
```

复验 `progress.position === -1`。

### 8.15 把输入辅助当作校验

**错误案例：**

```html
<input name="price" inputmode="decimal">
```

代码直接假定当前值合法。

**现象：**粘贴字母或不支持小数键盘的环境产生意外值。

**恢复：**把 `inputmode` 保留为体验提示，同时独立解析、校验，并由服务端复验。

### 8.16 标准诊断与恢复记录

每次故障都按同一格式留下证据：

```text
故障目标：
源代码：
操作步骤：
可见现象：
DOM 当前状态：
FormData 当前条目：
Console 证据：
根因：
最小修复：
同一路径复验：
未验证环境：
```

只写“改好了”不能证明恢复。必须用触发故障的同一路径重新操作，并比较修复前后的状态。

## 9. 课后题

### 9.1 标签与名称

1. `label[for]` 应匹配控件的 `id` 还是 `name`？
2. `placeholder` 为什么不能承担唯一可见名称？
3. `aria-describedby` 和 `label` 分别回答什么问题？

<details>
<summary>查看答案</summary>

1. 匹配 `id`；`name` 用于表单字段条目。
2. 它只在控件为空时出现，输入后消失，而且职责是示例或短提示。
3. `label` 回答“这个控件是什么”，`aria-describedby` 关联“如何填写、单位、限制或错误是什么”。

</details>

### 9.2 textarea 状态

源代码：

```html
<textarea id="note">默认说明</textarea>
```

用户改成“当前说明”后，`defaultValue` 和 `value` 分别是什么？表单重置后又是什么？

<details>
<summary>查看答案</summary>

用户修改后，`defaultValue` 仍是“默认说明”，`value` 是“当前说明”。重置后，`value` 回到“默认说明”。

</details>

### 9.3 换行推理

`wrap="soft"` 下，一段文字因为控件宽度不足显示成三行。用户没有按 Enter。构造提交值时是否应把这三处视觉折行都当作用户换行？

<details>
<summary>查看答案</summary>

不应。`soft` 的视觉折行不会因此全部变成提交值中的新换行。用户实际输入的换行仍属于值。

</details>

### 9.4 option 值

下面两个选项被选中时分别产生什么值？

```html
<option value="lighting">灯具</option>
<option>图书</option>
```

<details>
<summary>查看答案</summary>

第一个是 `lighting`；第二个没有显式 `value`，后备值来自选项文本“图书”。业务数据更推荐显式稳定机器值。

</details>

### 9.5 多选读取

为什么 `select.value` 不足以读取 `multiple`？应使用哪两条独立证据？

<details>
<summary>查看答案</summary>

`.value` 只给出首个当前选中值。DOM 观察使用 `selectedOptions`，提交观察使用 `new FormData(form).getAll(name)`。

</details>

### 9.6 按钮值

按钮显示“生成本地预览”，但 `value="preview"`。用户和 FormData 分别得到什么？

<details>
<summary>查看答案</summary>

用户看到按钮内容“生成本地预览”；当该按钮发起提交且拥有 `name` 时，表单条目使用机器值 `preview`。

</details>

### 9.7 fieldset 例外

禁用 `fieldset` 后，哪个 `legend` 的后代获得传播例外？第二个 legend 是否同样例外？

<details>
<summary>查看答案</summary>

只有第一项 `legend` 元素的后代获得例外。第二项不获得。

</details>

### 9.8 datalist 选择

“商品品牌可以从常用品牌中选，也允许填写小众品牌”和“商品分类只能是七个标准分类”分别使用什么？

<details>
<summary>查看答案</summary>

前者适合 `input[list] + datalist`；后者适合 `select` 或另一种有限集合控件，并由服务端校验机器值。

</details>

### 9.9 output 提交

`output` 显示 `79.80 元`，为何服务端仍应根据单价整数分和数量重算？

<details>
<summary>查看答案</summary>

`output` 是客户端结果展示，值本身不随表单提交，且客户端状态可被修改。服务端必须使用可信规则重算最终金额。

</details>

### 9.10 progress 与 meter

“上传了 4 个文件中的 3 个”和“存储占用 75%”分别选择哪个元素？

<details>
<summary>查看答案</summary>

前者是任务完成比例，使用 `progress`；后者是已知范围内的测量，使用 `meter`。

</details>

### 9.11 输入帮助

为什么 `inputmode="numeric"` 不能替代数字格式校验？

<details>
<summary>查看答案</summary>

它只提示虚拟键盘布局，不改变值类型，也不能阻止粘贴、硬件键盘输入或浏览器差异。格式仍需独立校验。

</details>

### 9.12 设计题

商品有四个可选交接时段，允许多选。比较 `select[multiple]` 与四个同名 checkbox。

<details>
<summary>查看答案标准</summary>

四项数量较少，复选框能直接展示所有选项和当前状态，通常更易发现；多选 select 更紧凑，但桌面组合键和触摸交互需要额外考虑。答案应根据目标设备、选项数量和可发现性做选择，不只比较占用空间。

</details>

## 10. 实践练习

### 10.1 基础：控件关系观察卡

文件：

```text
practice/html-chapter-05/control-relations.html
```

要求：

- 一个显式标签文本输入；
- 一个隐式标签复选框；
- 一个 `textarea`，设置 `rows`、`cols`、`wrap="soft"`；
- 一个带两个 `optgroup` 的单选 `select`；
- 一个 `button type="button"`；
- 一个 `output` 显示当前 textarea 的字符数；
- reset 后字符数同步恢复。

打开方式：浏览器直接打开。

预期：

- 两种标签点击都能激活对应控件；
- 修改文本时字符数变化；
- 分类提交值是机器值；
- reset 后 `value === defaultValue`。

失败证据：

- 任一控件没有可见名称；
- textarea 用 `value` 内容属性提供初始值；
- 计数按钮触发表单提交；
- output 没有随 reset 更新。

答案标准：

- `label[for]` 精确匹配 `id`；
- 隐式标签只包裹一个控件；
- 计数基于 `.value.length`；
- reset 事件后的读取发生在浏览器恢复默认状态之后；
- 页面写明数据未保存。

### 10.2 进阶：分类、多选与整数分

文件：

```text
practice/html-chapter-05/listing-controls-advanced.html
```

要求：

- 三个 `optgroup`，每组至少两个 `option`；
- 商品标签使用 `multiple size="6"`；
- 页面同时展示 `select.value`、`selectedOptions`、`FormData.getAll()`；
- 单价接受最多两位小数，数量为 1–99；
- `output` 展示总价；
- 预览对象只保存 `unitPriceCents`、`quantity` 和 `totalPriceCents`；
- `progress` 展示已完成必填项数量；
- `meter` 展示独立质量分；
- 提交被拦截，结果只在内存中展示。

测试数据：

```text
单价：12.34
数量：3
预期 totalPriceCents：3702
```

答案标准：

- 不通过浮点元相乘后再乘 100；
- 多选数组没有丢失；
- output 的可见文字与整数分一致；
- progress 和 meter 分别回答“完成了多少”和“质量处于什么水平”；
- Network 没有发布请求。

### 10.3 故障注入：禁用传播与建议越界

文件：

```text
practice/html-chapter-05/control-faults.html
```

依次注入：

1. 把启用开关移出第一项 `legend`，但仍放在禁用 fieldset 内；
2. 把配送 select 的 DOM 值误认为一定进入 FormData；
3. 把 `datalist` 的自由输入误判为非法；
4. 删除观察按钮的 `type="button"`；
5. 把未知 progress 改成 `value="0"`。

每项保存：

```text
源代码变化：
触发步骤：
可见现象：
DOM 证据：
FormData 证据：
根因：
最小修复：
同路径复验：
```

完成标准：

- 能说明第一项 legend 例外，而不只说“浏览器特殊处理”；
- 能同时展示禁用字段 `.value` 存在与 FormData 条目缺失；
- 能输入不在 datalist 中的合理自由文本；
- 能用 `event.submitter` 证明辅助按钮不再提交；
- 能用 `progress.position === -1` 证明恢复未知状态。

## 11. 阶段验收

### 11.1 FRM-017：标签与可见名称

- [ ] 每个需要名称的控件都有持久可见名称；
- [ ] 能写出显式和隐式标签；
- [ ] `for` 与 `id` 一一核对；
- [ ] 不用 placeholder、title 或描述文字冒充标签；
- [ ] 可见名称与程序化名称含义一致；
- [ ] 能用 `.labels` 或 `.control` 取证。

### 11.2 FRM-018：textarea

- [ ] 初始值写在元素内容中；
- [ ] 能解释 `defaultValue` 与 `value`；
- [ ] 能预测 reset；
- [ ] `rows`、`cols` 不被解释成长度限制；
- [ ] 能区分视觉折行与用户换行；
- [ ] 能使用选择区 API 且不抢夺用户光标。

### 11.3 FRM-019：选择控件

- [ ] 分类使用稳定 option 机器值；
- [ ] optgroup 只承担分组；
- [ ] 能区分 `defaultSelected` 与 `selected`；
- [ ] 多选不只读取 `.value`；
- [ ] `selectedOptions` 与 `FormData.getAll()` 结果一致；
- [ ] 能解释 `multiple` 和 `size` 的独立职责；
- [ ] 能根据可发现性在多选 select 与 checkbox 组之间选择。

### 11.4 FRM-020：button

- [ ] 所有按钮显式设置 `type`；
- [ ] 提交按钮可见文字与机器值职责清楚；
- [ ] 只有实际 submitter 的 `name/value` 被记录；
- [ ] 表单外按钮使用正确 `form`；
- [ ] 辅助按钮不会意外提交。

### 11.5 FRM-021：分组与禁用

- [ ] 相关控件使用 fieldset/legend；
- [ ] 第一项 legend 是清楚的组名；
- [ ] 能预测 disabled 传播；
- [ ] 能演示第一项 legend 后代例外；
- [ ] 禁用字段不被误判为提交数据；
- [ ] readonly 只用于支持的文本控件；
- [ ] disabled 与 readonly 都不承担授权。

### 11.6 FRM-022：建议值

- [ ] datalist 通过 `list/id` 正确关联；
- [ ] 能输入建议外的合理文字；
- [ ] 不把 datalist 当白名单；
- [ ] 必须有限选择时改用 select 或独立校验；
- [ ] 不依赖统一建议弹层外观。

### 11.7 FRM-023：输出、进度与测量

- [ ] output 的 `for` 指向真实相关控件；
- [ ] 脚本主动更新 output；
- [ ] 金额以整数分计算；
- [ ] 不把 output 当作可信提交值；
- [ ] 确定 progress 有 value/max；
- [ ] 未知 progress 移除 value；
- [ ] meter 的范围与 optimum 逻辑一致；
- [ ] progress 和 meter 都有可见文字解释。

### 11.8 FRM-024：输入辅助

- [ ] autocomplete 令牌与字段真实语义一致；
- [ ] inputmode 只被解释为键盘提示；
- [ ] enterkeyhint 只被解释为 Enter 键提示；
- [ ] spellcheck 和 autocapitalize 不被当作数据规则；
- [ ] 帮助文字通过 aria-describedby 关联；
- [ ] 所有帮助之后仍有独立校验与恢复路径。

### 11.9 运行证据

```text
个人文件路径：
浏览器与版本：
label/control 关联：
textarea 默认值与当前值：
textarea 选择区：
单选当前值：
多选 selectedOptions：
多选 FormData.getAll：
两个提交按钮的 intent：
fieldset 初始状态：
第一 legend 开关状态：
配送字段 FormData：
datalist 建议外输入：
0.01 × 3 整数分结果：
确定 progress：
未知 progress.position：
meter 范围和当前值：
Network 请求：
刷新后状态：
未验证设备或辅助技术：
```

### 11.10 一票否决项

出现任一项，本课验收不通过：

- 表单实际向未知地址发送；
- 页面宣称已保存或发布，但没有服务器；
- 金额使用不明确舍入的浮点元作为业务结果；
- 多选静默丢失值；
- 用禁用或隐藏状态声称完成权限控制；
- 用 datalist 声称限制了合法值；
- 无可见标签，只依赖 placeholder；
- 用颜色单独表达 meter 好坏；
- 删除错误或关闭检查来制造通过。

## 12. 常见问题

### Q1：显式标签和隐式标签哪一种更好？

两者都能建立原生关联。复杂布局通常优先显式形式；短复选框常适合隐式形式。关键是关联真实存在、可见名称清楚，并在目标浏览器与辅助技术中复验。

### Q2：可以同时包裹控件又写 `for` 吗？

可以让 `for` 指向同一个被包裹控件，但通常没有必要。不要让 `for` 指向一个控件、内部又包裹另一个控件。

### Q3：为什么按钮不用额外 label？

`button` 的内容通常就是可见名称。按钮内应使用清楚动作文字，例如“生成本地预览”，不要只写含义不明的“确定”。

### Q4：textarea 能使用 `value` 属性吗？

初始文本不通过 `value` 内容属性设置。源标记用元素内容，脚本读写当前状态用 `.value`。

### Q5：`cols="40"` 是否表示最多 40 个字符？

不是。它是显示宽度提示。长度约束由 `minlength`、`maxlength` 和业务规则承担。

### Q6：`wrap="hard"` 能保证所有平台保存完全相同的视觉行吗？

不应这样假设。它会让构造提交值时考虑换行宽度，但最终排版仍受字体、CSS 和实现影响。若换行具有业务意义，应设计明确的数据规则。

### Q7：单选 select 没写 selected 会怎样？

浏览器的选项选择算法通常会形成一个当前选项，但不要用模糊默认行为表达业务意图。需要空状态时提供明确空值选项，需要默认值时明确写出并在 reset 中验证。

### Q8：multiple select 的选择顺序能代表用户优先级吗？

不能。`selectedOptions` 和提交条目按选项树顺序，不是点击时间。需要排序时应设计独立排序交互和数据字段。

### Q9：为什么 `select` 没有通用 readonly？

HTML 没有给 select 定义与文本控件相同的 readonly 行为。不要用 CSS 阻止点击来伪装；根据需求选择正常控件、禁用展示或服务端事实展示。

### Q10：fieldset 禁用后，legend 中可以放任意可编辑表单吗？

规范例外允许第一项 legend 后代不受传播，但设计上应保持目的清楚，常见用途是启用整个分组的开关。不要把大量无关输入藏进 legend。

### Q11：datalist 为什么不能替代 select？

它只提供建议，输入仍可自由编辑。select 表达有限集合选择，两者的数据边界不同。

### Q12：output 有 name，为什么 FormData 仍没有它？

`output` 是表单关联、可列出和可重置的结果元素，但不是随表单提交其值的控件。服务端计算应基于原始输入和可信规则。

### Q13：如何让 progress 从确定状态恢复未知状态？

移除 `value` 内容属性，而不是把值设为 0。可用 `.position === -1` 复验。

### Q14：meter 的颜色可以作为验收依据吗？

不可以。原生呈现受浏览器和系统主题影响，颜色也不能独立承载信息。验收应检查数值、范围、文字解释和可访问名称。

### Q15：autocomplete="off" 是否绝对禁止填充？

不是。它是提示，浏览器可能基于安全、凭据或用户选择采用不同策略。敏感数据处理不能依赖这一属性。

### Q16：inputmode 会不会让桌面硬件键盘也只能输入数字？

不会。它主要提示虚拟键盘布局，不限制硬件输入、粘贴或脚本赋值。

### Q17：enterkeyhint="next" 会自动聚焦下一个字段吗？

不会。它提示 Enter 键外观或意图，焦点和提交行为仍由浏览器、表单结构与脚本决定。

### Q18：可以把完成度 progress 当作表单校验结果吗？

不能。完成度只是产品提示。真正能否提交仍由原生约束、业务校验和服务端最终判定共同决定。

## 13. 扩展阅读

资料核验日期：2026-10-10。以下链接以 HTML Living Standard 和 W3C 可访问性资料为主；阅读时优先核对元素分类、当前值算法、禁用传播和表单提交边界。

- [WHATWG：label 元素](https://html.spec.whatwg.org/multipage/forms.html#the-label-element)：显式/隐式关联、可标记元素和 `labels` API。
- [WHATWG：button 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element)：`type`、`form`、`name/value` 与提交者规则。
- [WHATWG：select 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element)：单选、多选、`size`、当前选择和 `selectedOptions`。
- [WHATWG：datalist 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-datalist-element)：建议列表与输入值边界。
- [WHATWG：optgroup 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-optgroup-element)：选项分组和禁用状态。
- [WHATWG：option 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-option-element)：值、默认选中、当前选中与重置。
- [WHATWG：textarea 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element)：初始值、当前值、`rows/cols/wrap` 和选择 API。
- [WHATWG：output 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-output-element)：`for/form/name`、当前值、默认值和不提交边界。
- [WHATWG：progress 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element)：确定与未知进度。
- [WHATWG：meter 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-meter-element)：范围、区间和 optimum。
- [WHATWG：fieldset 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-fieldset-element)：分组、禁用传播和第一 legend 例外。
- [WHATWG：legend 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-legend-element)：分组标题结构。
- [WHATWG：表单控件基础设施](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html)：`disabled`、`readonly`、`form`、`autocomplete` 和成功控件规则。
- [WHATWG：inputmode](https://html.spec.whatwg.org/multipage/interaction.html#attr-inputmode)：虚拟键盘提示。
- [WHATWG：enterkeyhint](https://html.spec.whatwg.org/multipage/interaction.html#attr-enterkeyhint)：Enter 键动作提示。
- [W3C WAI：表单标签教程](https://www.w3.org/WAI/tutorials/forms/labels/)：可见标签、分组和辅助技术关系。
- [W3C 可访问名称与描述计算](https://www.w3.org/TR/accname-1.2/)：名称来源和描述边界。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对静态教学状态、整数分和服务端边界。

阅读官方资料时，不要只摘属性列表。至少回答：

1. 元素是否可标记、可列出、可重置、可提交；
2. 内容属性和 IDL 属性分别反映默认状态还是当前状态；
3. 禁用、只读和表单所有者如何改变交互与提交；
4. 原生控件的可见外观是否属于跨浏览器保证；
5. 哪些结论必须由真实目标浏览器和辅助技术复验。

## 我现在能做到什么

我能为表单控件建立可靠的可见名称和分组，区分默认值、当前值与提交值，完整读取单选和多选状态，并解释禁用传播、建议值和输入辅助的边界。我还能用整数分驱动 `output`，用 `progress` 表达任务完成度，用 `meter` 表达已知范围测量，并把所有结果限制在静态页面和当前内存中。

## 单元导航

- [上一课：input 类型与值状态](02-input-types-values.md)
- [返回第五章入口](../05-forms-validation.md)
- [下一课：约束验证、错误恢复与文件](04-constraint-validation-files.md)
- [返回 HTML 模块](../README.md)
