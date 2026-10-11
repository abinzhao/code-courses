# 成功控件、提交者与名称值

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 从控件树构造有序条目，区分 id、name、value、disabled、readonly 与提交者覆盖。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-003`、`FRM-004` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

从控件树构造有序条目，区分 id、name、value、disabled、readonly 与提交者覆盖。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-003（name、value、提交按钮和成功控件）、FRM-004（禁用、未选中、只读控件的提交行为）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

### 3.1 预备材料 1

```html
<input id="title" value="阅读台灯">
<input name="priceCents" value="3900" readonly>
<input name="sellerCode" value="seller-17" disabled>
<input type="checkbox" name="handoff" value="pickup">
<button type="submit" name="intent" value="preview">预览</button>
```

### 3.2 预备材料 2

```text
实验：
输入状态：
预测条目：
触发方式：
实际 entries：
原始查询串：
submitter：
是否触发 submit：
是否经过约束验证：
失败证据：
修复：
复验：
未验证范围：
```

## 4. 核心理论

### 4.1 从控件树到条目列表

一次普通提交可以先抽象成五步：

```text
用户激活提交按钮，或脚本调用 requestSubmit()
  ↓
确定 form、提交者和有效提交配置
  ↓
按需要执行交互式约束验证
  ↓
构造有顺序的名称—值条目列表
  ↓
按 method、enctype、action、target 处理提交
```

如果监听到 `submit` 事件并调用：

```js
event.preventDefault();
```

最后一步的导航或请求会被取消，但前面的提交者判定和约束验证仍然有意义。于是可以在不发送数据的情况下观察：

- `event.submitter`；
- `new FormData(form, event.submitter)`；
- 每个名称和值；
- 同名字段的顺序；
- 哪些控件被省略。

条目列表不是普通对象。它允许：

```text
handoff = pickup
handoff = meetup
handoff = delivery
```

三个条目名称相同、值不同，并保持构造顺序。若直接转换成只允许唯一键的普通对象，信息可能丢失。

### 4.2 `id`、`name`、`value` 各做什么

三个属性经常同时出现，但职责不同：

```html
<label for="listing-title">商品标题</label>
<input
  id="listing-title"
  name="title"
  value="阅读台灯"
>
```

| 属性 | 主要职责 | 是否直接决定条目 |
| --- | --- | --- |
| `id` | 文档内唯一标识；供 `label for`、选择器和片段使用 | 否 |
| `name` | 提交名称；也参与表单控件集合 | 是，没有有效名称通常无条目 |
| `value` | 控件当前提交值或按钮提交值的来源之一 | 是，但要结合控件类型与状态 |

控件可见文字不一定等于提交值：

```html
<button type="submit" name="intent" value="preview">
  生成本地预览
</button>
```

用户看到“生成本地预览”，条目却是：

```text
intent = preview
```

checkbox 和 radio 应显式提供机器值：

```html
<label>
  <input type="checkbox" name="handoff" value="pickup">
  到店自提
</label>
```

如果省略 checkbox/radio 的 `value`，选中时默认提交值通常是字符串 `"on"`。这个值很少能表达业务含义，因此不要依赖它。

### 4.3 成功控件的判断顺序

“成功控件”是理解用语；现代 HTML 标准用构造 entry list 的算法给出精确规则。面对普通 `input`、`select`、`textarea` 和 `button`，可以先按以下顺序判断：

1. 这个控件是否与目标 `form` 关联？
2. 它是否被禁用，或受禁用 `fieldset` 影响？
3. 它是否有非空的提交名称 `name`？
4. 如果是 checkbox/radio，它当前是否选中？
5. 如果是提交按钮，它是否是本次提交者？
6. 控件类型是否还有专门规则，例如文件、多选或图像按钮？
7. 若都满足，按树顺序和类型规则加入名称—值条目。

常见结果：

| 控件状态 | 是否产生条目 | 原因 |
| --- | --- | --- |
| 普通文本框，有 `name` | 是 | 使用当前值 |
| 文本框只有 `id` | 否 | 没有提交名称 |
| `disabled` 文本框 | 否 | 禁用控件被跳过 |
| `readonly` 文本框，有 `name` | 是 | 只读不等于禁用 |
| checkbox 已选中 | 是 | 使用 `name` 与 `value` |
| checkbox 未选中 | 否 | 未选中时无条目 |
| radio 组中已选中的一项 | 是 | 只产生所选项 |
| radio 组没有任何选中项 | 否 | 整组无条目 |
| 普通 `type="button"` | 否 | 不是提交数据控件 |
| 两个 submit 按钮中的被点击者 | 是 | 被点击者是 submitter |
| 另一个 submit 按钮 | 否 | 不是本次 submitter |
| 无文件的 file input | 有专门文件条目规则 | 不应当作普通字符串 |

控件的 `name` 是空字符串不符合新代码要求，也不会提供可靠提交名称。写表单时把“是否有明确非空 `name`”作为审查项。

### 4.4 `disabled`、`readonly` 与未选中不是一回事

对比：

| 状态 | 用户可编辑 | 通常可聚焦 | 参与约束验证 | 进入条目列表 |
| --- | --- | --- | --- | --- |
| 正常文本控件 | 是 | 是 | 是 | 是 |
| `readonly` 支持类型 | 否 | 是 | 否 | 是 |
| `disabled` 控件 | 否 | 否 | 否 | 否 |
| 未选中 checkbox/radio | 可切换 | 是 | 依具体约束 | 否 |

`readonly` 只适用于部分文本型 `input` 和 `textarea`，不适用于 `select`、checkbox、radio 等全部控件。不能为了让任意控件“看起来不可改”就随意加它。

**明确错误示例：为了防止改价而禁用价格字段。**

```html
<!-- 错误：priceCents 不会进入 FormData。 -->
<input
  type="number"
  name="priceCents"
  value="3900"
  disabled
>
```

如果需求是“本次仍提交一个用户可查看但不可编辑的文本型价格”，可在支持 `readonly` 的类型上使用：

```html
<input
  type="number"
  name="priceCents"
  value="3900"
  readonly
>
```

但这仍不使值可信。用户可修改 DOM、构造自己的请求或绕过页面。真实系统必须从可信数据源重新判定价格；本课没有该服务端实现。

checkbox 未选中时没有 `name=false`：

```html
<input type="checkbox" name="notify" value="yes">
```

未选中结果是根本没有 `notify` 条目。应用若需要布尔值，必须在读取边界明确规定“缺失意味着 false”，而不是期待浏览器自动提交 `"false"`。

### 4.5 提交者 `submitter`

一个表单可以有多个提交按钮：

```html
<button type="submit" name="intent" value="preview">
  预览
</button>
<button type="submit" name="intent" value="publish">
  检查发布意图
</button>
```

用户点击第二个按钮时：

- `SubmitEvent.submitter` 指向第二个按钮；
- 第二个按钮可通过 `name`/`value` 产生 `intent=publish`；
- 第一个按钮不会产生条目；
- 第二个按钮上的 `formaction`、`formmethod`、`formenctype`、`formtarget`、`formnovalidate` 可覆盖表单配置。

在 `submit` 监听器中观察：

```js
form.addEventListener("submit", (event) => {
  event.preventDefault();
  console.log(event.submitter);
});
```

`new FormData(form)` 没有提交者参数时，不会凭空猜出应该加入哪个 submit 按钮。现代构造器可显式接收：

```js
const data = event.submitter
  ? new FormData(form, event.submitter)
  : new FormData(form);
```

这样按钮名称和值与本次提交意图一起进入条目列表。

### 4.6 同名多值必须保留

一组交接方式可以共享名称：

```html
<label>
  <input type="checkbox" name="handoff" value="pickup" checked>
  到店自提
</label>
<label>
  <input type="checkbox" name="handoff" value="meetup" checked>
  公共地点见面
</label>
```

对应条目：

```text
handoff = pickup
handoff = meetup
```

`FormData.get()` 只返回第一个：

```js
data.get("handoff"); // "pickup"
```

`getAll()` 返回全部：

```js
data.getAll("handoff"); // ["pickup", "meetup"]
```

**明确错误示例：**

```js
const values = Object.fromEntries(new FormData(form));
console.log(values.handoff);
```

普通对象的同一键只能保留一个属性值，后出现的条目会覆盖前面的条目。若字段契约允许多值，应逐字段使用 `getAll()`，或建立明确的多值转换规则。

## 5. 元素、属性、API 或配置清单

### 5.1 名称、值和状态

| 名称 | 检查问题 |
| --- | --- |
| `id` | 是否唯一？是否与 `label for` 对应？ |
| `name` | 是否非空？是否符合接口字段契约？是否可能同名多值？ |
| `value` | 当前机器值是什么？是否依赖不清楚的默认值？ |
| `disabled` | 是否有意从条目、验证和焦点顺序中移除？ |
| `readonly` | 控件类型是否支持？是否需要保留提交值？ |
| `checked` | checkbox/radio 当前是否选中？ |
| `type="submit"` | 是否可能成为本次 submitter？ |
| `type="button"` | 是否只是普通命令，不应触发表单提交？ |

### 5.2 提交前预测表

每次调试先填一张表：

| 控件 | `name` | 当前状态 | 预测是否出现 | 预测值 | 理由 |
| --- | --- | --- | --- | --- | --- |
| 标题 | `title` | 普通文本 | 是 | 当前文本 | 有名称、启用 |
| 卖家编号 | `sellerCode` | readonly | 是 | 当前文本 | 只读仍提交 |
| 审核备注 | `moderationNote` | disabled | 否 | — | 禁用省略 |
| 配送 | `handoff` | 未选中 | 否 | — | 未选中省略 |
| 预览按钮 | `intent` | 本次被点击 | 是 | `preview` | 当前提交者 |
| 发布意图按钮 | `intent` | 未被点击 | 否 | — | 不是提交者 |

实际结果不一致时，优先检查规则，不要立刻手工 `append()` 一个值掩盖根因。

## 6. 最小可运行案例

在个人练习目录中新建 `practice/02-successful-controls-submitter-values/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 FRM-003（name、value、提交按钮和成功控件） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 FRM-004（禁用、未选中、只读控件的提交行为） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [FormData、查询串与程序化提交](03-formdata-query-programmatic-submit.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 FRM-003（name、value、提交按钮和成功控件） 对应的元素、属性或状态；
- 在项目中实现并标出与 FRM-004（禁用、未选中、只读控件的提交行为） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`03-formdata-query-programmatic-submit.md`](03-formdata-query-programmatic-submit.md)。

## 8. 常见错误与排查路径

### 8.1 固定排查顺序

表单字段“消失”时，按下面顺序检查：

```text
1. 确认正在运行的文件和触发步骤
2. 写下预期 name/value
3. 找到本次 form 和 submitter
4. 检查 form.elements 与控件 form owner
5. 检查 name 是否存在且非空
6. 检查 disabled / fieldset disabled
7. 检查 checkbox/radio checked
8. 用 FormData.entries() 取证
9. 对多值字段用 getAll()
10. 只修复一个根因并重复原步骤
```

不要一发现缺值就直接：

```js
data.append("missingField", someElement.value);
```

这可能暂时出现一个值，却掩盖 HTML 契约错误、禁用状态或关联表单错误。

### 8.2 故障一：字段缺少 `name`

**错误代码：**

```html
<label for="broken-title">商品标题</label>
<input id="broken-title" value="阅读台灯">
```

**现象：**

- 页面可以输入；
- label 可以正确聚焦；
- `document.querySelector("#broken-title").value` 有值；
- `new FormData(form).has("title")` 为 false。

**根因：**

`id` 负责文档标识和 label 关联，不是提交名称。

**修复：**

```html
<input
  id="broken-title"
  name="title"
  value="阅读台灯"
>
```

**复验：**

```js
const data = new FormData(document.querySelector("form"));

console.assert(data.has("title"));
console.assert(data.get("title") === "阅读台灯");
```

**诊断记录：**

| 阶段 | 证据 |
| --- | --- |
| 输入 | `id="broken-title"`，无 `name` |
| 预测 | 不会产生条目 |
| 实际 | `has("title") === false` |
| 修复 | 添加 `name="title"` |
| 复验 | `get("title") === "阅读台灯"` |

### 8.3 故障二：误用 `disabled` 导致价格遗漏

**错误代码：**

```html
<input
  type="number"
  name="priceCents"
  value="3900"
  disabled
>
```

**现象：**

```js
const data = new FormData(form);

console.assert(!data.has("priceCents"));
```

**根因：**

`disabled` 不只是“禁止编辑”。它还使控件退出焦点、约束验证和提交条目。

**可能修复 A：仍需提交只读文本型值。**

```html
<input
  type="number"
  name="priceCents"
  value="3900"
  readonly
>
```

**可能修复 B：本来就不该提交。**

保留 `disabled`，并从可信数据源决定真实价格，而不是在提交前临时启用。选择哪种修复取决于字段契约。

**复验证据：**

```js
const data = new FormData(form);
const priceCents = Number(data.get("priceCents"));

console.assert(Number.isSafeInteger(priceCents));
console.assert(priceCents === 3900);
```

只读值仍可被客户端篡改，所以这项复验只证明“条目出现且可转换”，不证明价格可信。

### 8.4 故障三：未选中 checkbox 被误认为 `false`

**错误判断：**

```js
const notify = data.get("notify");

// 错误假设：未选中时浏览器会提交字符串 "false"。
console.assert(notify === "false");
```

正确读取：

```js
const notify = data.has("notify");
```

契约应明确：

```text
存在 notify=yes → true
不存在 notify → false
```

不要把空字符串、`null`、`"false"` 和布尔 `false` 混为一谈。

### 8.5 故障十二：把本地时间字符串直接加 `Z`

**错误代码：**

```js
const createdAt = localDateTimeInput.value + "Z";
```

`Z` 表示 UTC。把一个未转换的本地时间直接加 `Z` 会改变其含义。

本课生成当前预览时刻：

```js
const createdAt = new Date().toISOString();
```

若输入来自 `datetime-local`，必须先确定业务时区并正确转换。真实创建时间应由服务端决定；本课没有实现。

### 8.6 一张快速诊断表

| 现象 | 最可能原因 | 最小证据 |
| --- | --- | --- |
| 可见输入不在数据中 | 缺少 `name` | `element.name`、`data.has()` |
| 只读值出现 | 这是预期行为 | `readOnly` 与 `entries()` |
| 禁用值缺失 | `disabled` 省略 | `element.disabled` |
| checkbox 缺失 | 未选中 | `element.checked` |
| 多选只剩一个 | 使用 `get()` 或对象覆盖 | `getAll()`、完整 entries |
| 按钮意图缺失 | 构造 FormData 时没有 submitter | `event.submitter` |
| submit 监听器不运行 | 调用了 `submit()` | 调用栈、事件计数 |
| 空字段仍继续 | `novalidate` 或直接 `submit()` | `form.noValidate`、触发方式 |
| 查询参数乱码 | 编码或错误的手工拼接 | 原始 URL 与 `URLSearchParams` |
| 页面声称“已发布” | 状态文案越界 | Network、服务端响应不存在 |

## 9. 课后题

### 9.1 概念题

1. 为什么有 `id` 和 `value` 的输入框仍可能不进入提交数据？
2. `readonly` 与 `disabled` 在焦点、验证和提交上有什么不同？
3. 未选中的 checkbox 会提交什么？
4. 为什么同名 checkbox 不应使用 `get()` 读取全部值？
5. GET 和 POST 的主要语义边界是什么？
6. POST 是否自动提供加密和权限？
7. `enctype` 的三种值分别是什么？
8. 为什么文件表单使用 `multipart/form-data`？
9. `novalidate` 是否意味着值有效？
10. `event.submitter` 能回答什么问题？
11. `new FormData(form)` 与 `new FormData(form, submitter)` 有何差别？
12. 为什么 `requestSubmit()` 更适合复用用户提交路径？
13. 为什么本课不运行 `form.submit()`？
14. `URLSearchParams.getAll()` 的结果为什么重要？
15. 为什么价格从表单读取后还要转成整数？
16. `new Date().toISOString()` 中的 `Z` 表示什么？

### 9.2 预测题

阅读：

```html
<form id="quiz">
  <input name="a" value="1">
  <input id="b" value="2">
  <input name="c" value="3" disabled>
  <input name="d" value="4" readonly>
  <input type="checkbox" name="e" value="5">
  <input type="checkbox" name="e" value="6" checked>
  <button type="submit" name="intent" value="left">左</button>
  <button type="submit" name="intent" value="right">右</button>
</form>
```

用户点击“右”时，写出有序条目。

## 10. 实践练习

### 10.1 故障注入练习：同时制造四类遗漏

在练习副本中注入：

```html
<!-- 故障 A：删除 title 的 name。 -->
<input id="listing-title" value="阅读台灯">

<!-- 故障 B：把 priceCents 改为 disabled。 -->
<input name="priceCents" value="3900" disabled>

<!-- 故障 C：用 get() 读取全部 handoff。 -->

<!-- 故障 D：把 requestSubmit() 改成 submit()。 -->
```

要求按顺序处理：

1. 不改代码，先写预期失败；
2. 运行并保存 `entries()`；
3. 对每个故障写根因；
4. 每次只修一个故障；
5. 每修一次重复同一触发步骤；
6. 最后检查 Network 无意外请求；
7. 恢复整数分和 UTC ISO 断言。

参考修复：

```html
<input
  id="listing-title"
  name="title"
  value="阅读台灯"
>

<input
  name="priceCents"
  value="3900"
  readonly
>
```

```js
const handoffMethods = data.getAll("handoff");
form.requestSubmit(previewButton);
```

故障级完成标准：

- [ ] 能分别证明“缺名”“禁用”“单值读取”“绕过事件”；
- [ ] 修复不是手工向 `FormData` 塞回遗漏值；
- [ ] `submit` 事件计数恢复；
- [ ] `event.defaultPrevented` 为 true；
- [ ] `priceCents` 为数字安全整数；
- [ ] `createdAt` 可往返 `toISOString()`；
- [ ] 未出现真实发布文案。

## 11. 阶段验收

### 11.1 文件验收

- [ ] `query-observer.html` 可直接打开或由静态服务器打开；
- [ ] `market-publish-preview.html` 可打开；
- [ ] 两份文件都有 doctype、语言、UTF-8 和标题；
- [ ] 每个可见输入有可见 label；
- [ ] 每个应提交字段有明确非空 `name`；
- [ ] checkbox/radio 有明确机器 `value`；
- [ ] 普通命令按钮写 `type="button"`；
- [ ] 发布预览提交按钮在 HTML 初始状态为 `disabled`；
- [ ] 脚本最后才启用提交入口。

### 11.2 故障恢复验收

- [ ] 删除 `name` 后能用 `has()` 证明字段缺失；
- [ ] 恢复 `name` 后同一路径复验通过；
- [ ] 添加 `disabled` 后能证明价格缺失；
- [ ] 根据字段契约选择 readonly 或可信数据源，而不是提交前偷启用；
- [ ] 同名值不会经过 `Object.fromEntries()` 静默丢失；
- [ ] 未选中 checkbox 不被误认为字符串 `"false"`；
- [ ] 每个故障都有“输入、观察、根因、修复、复验”。

## 12. 常见问题

### Q1：表单控件有 `id`，为什么还要 `name`？

`id` 标识文档节点并关联 label；`name` 是提交条目的名称。两者可以相同，但职责不同。

### Q13：为什么 readonly 值会提交？

只读限制用户编辑，但控件仍启用并保留提交名称和值。它不能用作防篡改机制。

### Q14：为什么 disabled 值不提交？

禁用控件被排除在 entry list 之外，也通常不参与焦点和约束验证。

### Q15：未选中的 checkbox 如何表示 false？

浏览器不产生条目。读取边界可用 `data.has("notify")` 明确映射为布尔值。

### Q16：同名字段是不是错误？

不是。checkbox、多选和重复参数常有意使用同名多值；数据模型必须明确它是数组。

### Q19：为什么不统一用 `Object.fromEntries()`？

它会让重复名称互相覆盖，无法保留同名多值。

### Q21：空字符串和缺失字段有何不同？

`data.has(name)` 可区分。存在空字符串表示控件产生了条目但值为空；缺失表示根本没有条目。

### Q22：按 Enter 提交时 `event.submitter` 一定是谁？

隐式提交规则与表单结构有关，不应凭感觉假定。实际观察 `event.submitter`，并保持清楚的默认提交按钮。

### Q26：按钮文字会成为提交值吗？

对于本课的 `<button name="intent" value="preview">`，提交值来自 `value`，可见文字只是按钮标签。

### Q27：按钮没有 `name` 会怎样？

它仍可成为 `event.submitter` 并触发提交，但不会以普通名称—值条目加入数据。

### Q28：把按钮设为 disabled 后还能成为提交者吗？

禁用按钮不能通过正常用户激活成为提交者。脚本调用 `requestSubmit(disabledButton)` 的具体流程不应被用来绕过界面状态；先建立清楚、可用的状态机。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：从控件树构造有序条目，区分 id、name、value、disabled、readonly 与提交者覆盖。
- `FRM-003`：name、value、提交按钮和成功控件
- `FRM-004`：禁用、未选中、只读控件的提交行为
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：表单目标、方法与编码](01-form-action-method-encoding.md) · [下一课：FormData、查询串与程序化提交](03-formdata-query-programmatic-submit.md) · [返回 HTML 模块](../README.md)
