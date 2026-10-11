# 选择控件、选项与按钮

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 处理 select、option、optgroup、多选状态和 button 的可见文字与提交值。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-019`、`FRM-020` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

处理 select、option、optgroup、多选状态和 button 的可见文字与提交值。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-019（select、option、optgroup、selectedOptions）、FRM-020（button 元素与 type/form/name/value）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `select`、`option` 与 `optgroup` 的值模型

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

### 4.2 `multiple`、`size` 与 `selectedOptions`

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

### 4.3 `button`：可见文字不是提交值

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

## 5. 元素、属性、API 或配置清单

### 5.1 状态和选择 API

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

## 6. 最小可运行案例

在个人练习目录中新建 `practice/10-select-option-button/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 FRM-019（select、option、optgroup、selectedOptions） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 FRM-020（button 元素与 type/form/name/value） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [分组、建议、输出、进度与测量](11-fieldset-datalist-output-progress-meter.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 FRM-019（select、option、optgroup、selectedOptions） 对应的元素、属性或状态；
- 在项目中实现并标出与 FRM-020（button 元素与 type/form/name/value） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`11-fieldset-datalist-output-progress-meter.md`](11-fieldset-datalist-output-progress-meter.md)。

## 8. 常见错误与排查路径

### 8.1 多选只读取 `.value`

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

### 8.2 用 option 文案当稳定机器值

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

### 8.3 辅助按钮遗漏 `type`

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

### 8.4 认为禁用字段会保留提交值

**现象：**配送说明 DOM 中有文字，预览对象却没有它。

**证据：**

```js
console.log(deliveryNote.value);
console.log(new FormData(form).has("deliveryNote"));
```

**原因：**禁用控件不是成功控件。

**恢复：**根据业务决定是否重新启用；服务器事实由服务端读取，不要用隐藏字段复制禁用值来伪造可信来源。

## 9. 课后题

### 9.1 option 值

下面两个选项被选中时分别产生什么值？

```html
<option value="lighting">灯具</option>
<option>图书</option>
```

<details>
<summary>查看答案</summary>

第一个是 `lighting`；第二个没有显式 `value`，后备值来自选项文本“图书”。业务数据更推荐显式稳定机器值。

</details>

### 9.2 多选读取

为什么 `select.value` 不足以读取 `multiple`？应使用哪两条独立证据？

<details>
<summary>查看答案</summary>

`.value` 只给出首个当前选中值。DOM 观察使用 `selectedOptions`，提交观察使用 `new FormData(form).getAll(name)`。

</details>

### 9.3 设计题

商品有四个可选交接时段，允许多选。比较 `select[multiple]` 与四个同名 checkbox。

<details>
<summary>查看答案标准</summary>

四项数量较少，复选框能直接展示所有选项和当前状态，通常更易发现；多选 select 更紧凑，但桌面组合键和触摸交互需要额外考虑。答案应根据目标设备、选项数量和可发现性做选择，不只比较占用空间。

</details>

## 10. 实践练习

### 10.1 进阶：分类、多选与整数分

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

## 11. 阶段验收

### 11.1 FRM-019：选择控件

- [ ] 分类使用稳定 option 机器值；
- [ ] optgroup 只承担分组；
- [ ] 能区分 `defaultSelected` 与 `selected`；
- [ ] 多选不只读取 `.value`；
- [ ] `selectedOptions` 与 `FormData.getAll()` 结果一致；
- [ ] 能解释 `multiple` 和 `size` 的独立职责；
- [ ] 能根据可发现性在多选 select 与 checkbox 组之间选择。

### 11.2 FRM-020：button

- [ ] 所有按钮显式设置 `type`；
- [ ] 提交按钮可见文字与机器值职责清楚；
- [ ] 只有实际 submitter 的 `name/value` 被记录；
- [ ] 表单外按钮使用正确 `form`；
- [ ] 辅助按钮不会意外提交。

## 12. 常见问题

### Q7：单选 select 没写 selected 会怎样？

浏览器的选项选择算法通常会形成一个当前选项，但不要用模糊默认行为表达业务意图。需要空状态时提供明确空值选项，需要默认值时明确写出并在 reset 中验证。

### Q8：multiple select 的选择顺序能代表用户优先级吗？

不能。`selectedOptions` 和提交条目按选项树顺序，不是点击时间。需要排序时应设计独立排序交互和数据字段。

### Q9：为什么 `select` 没有通用 readonly？

HTML 没有给 select 定义与文本控件相同的 readonly 行为。不要用 CSS 阻止点击来伪装；根据需求选择正常控件、禁用展示或服务端事实展示。

### Q11：datalist 为什么不能替代 select？

它只提供建议，输入仍可自由编辑。select 表达有限集合选择，两者的数据边界不同。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：处理 select、option、optgroup、多选状态和 button 的可见文字与提交值。
- `FRM-019`：select、option、optgroup、selectedOptions
- `FRM-020`：button 元素与 type/form/name/value
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：标签、可见名称与 textarea](09-label-textarea.md) · [下一课：分组、建议、输出、进度与测量](11-fieldset-datalist-output-progress-meter.md) · [返回 HTML 模块](../README.md)
