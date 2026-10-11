# 输入辅助、表单所有者与状态

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 配置输入辅助属性和 form 所有者，并区分内容属性、默认状态与当前状态。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-024` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

配置输入辅助属性和 form 所有者，并区分内容属性、默认状态与当前状态。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-024（autocomplete、inputmode、enterkeyhint 等输入辅助）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 输入辅助：`autocomplete`、`inputmode`、`enterkeyhint`

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

### 4.2 `form` 属性与视觉位置边界

`button`、`select`、`textarea`、`output` 等可重新关联的表单控件可以通过 `form="某个表单 id"` 指定表单所有者，即使它们不在表单后代树中。

这解决的是所有者关系，不是布局关系：

- 视觉上放在卡片底部的按钮仍可提交上方表单；
- 表单外 `output` 仍可关联到表单；
- 控件的 `form` 属性必须匹配同一文档中的 `form[id]`；
- `label[for]` 仍按控件 `id` 建立标签关系；
- 给 `fieldset` 设置 `form` 只关联 `fieldset` 本身，不会自动重写所有后代控件的表单所有者。

过度分散控件会让阅读顺序和错误恢复变难。只有布局确实需要时才使用表单外关联，并在键盘顺序中复验。

### 4.3 内容属性、默认状态与当前状态

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

### 4.4 控件选择速查

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

### 5.1 输入辅助属性

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

创建 `practice/html-form-assistance/minimal.html`，其中 `form#listing-form` 至少包含姓名、整数价格和说明三个有标签控件。

1. 为姓名配置语义正确的 `autocomplete`；
2. 为整数价格配置 `inputmode="numeric"`，并说明它不等于数值校验；
3. 为连续输入配置合适的 `enterkeyhint`；
4. 把一个提交按钮放到 `form` 外，通过 `form="listing-form"` 建立所有者关系；
5. 在 Console 对比一个控件的内容属性、默认状态和当前状态。

通过标准：标签和提交关系不依赖视觉位置，输入辅助不冒充约束验证，改变当前值不会被误判为改写默认值。

## 7. 邻里集市集成案例

完整表单由[分组、建议、输出、进度与测量](11-fieldset-datalist-output-progress-meter.md)维护。本课只提交 `FRM-024` 增量：

- 为真实字段补齐经过语义核对的 `autocomplete`、`inputmode` 和 `enterkeyhint`；
- 验证外置控件的 `form` 所有者，不依赖 DOM 邻近关系；
- 记录内容属性、默认状态和当前状态的 Console 对照；
- 删除辅助属性后复验约束与提交数据没有被错误替代。

## 8. 常见错误与排查路径

### 8.1 把输入辅助当作校验

**错误案例：**

```html
<input name="price" inputmode="decimal">
```

代码直接假定当前值合法。

**现象：**粘贴字母或不支持小数键盘的环境产生意外值。

**恢复：**把 `inputmode` 保留为体验提示，同时独立解析、校验，并由服务端复验。

## 9. 课后题

### 9.1 输入帮助

为什么 `inputmode="numeric"` 不能替代数字格式校验？

<details>
<summary>查看答案</summary>

它只提示虚拟键盘布局，不改变值类型，也不能阻止粘贴、硬件键盘输入或浏览器差异。格式仍需独立校验。

</details>

## 10. 实践练习

选择一件与教材不同的邻里商品，完成一次迁移练习：

1. 先写内容关系、机器值或交互目标，不先写标签；
2. 用 FRM-024（autocomplete、inputmode、enterkeyhint 等输入辅助） 实现最小页面；
3. 制造一个本课错误并保留失败证据；
4. 修复后重复键盘或开发者工具检查；
5. 在记录中解释为什么没有选择一个视觉相似的替代写法。

## 11. 阶段验收

### 11.1 FRM-024：输入辅助

- [ ] autocomplete 令牌与字段真实语义一致；
- [ ] inputmode 只被解释为键盘提示；
- [ ] enterkeyhint 只被解释为 Enter 键提示；
- [ ] spellcheck 和 autocapitalize 不被当作数据规则；
- [ ] 帮助文字通过 aria-describedby 关联；
- [ ] 所有帮助之后仍有独立校验与恢复路径。

### 11.2 一票否决项

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

### Q15：autocomplete="off" 是否绝对禁止填充？

不是。它是提示，浏览器可能基于安全、凭据或用户选择采用不同策略。敏感数据处理不能依赖这一属性。

### Q16：inputmode 会不会让桌面硬件键盘也只能输入数字？

不会。它主要提示虚拟键盘布局，不限制硬件输入、粘贴或脚本赋值。

### Q17：enterkeyhint="next" 会自动聚焦下一个字段吗？

不会。它提示 Enter 键外观或意图，焦点和提交行为仍由浏览器、表单结构与脚本决定。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：配置输入辅助属性和 form 所有者，并区分内容属性、默认状态与当前状态。
- `FRM-024`：autocomplete、inputmode、enterkeyhint 等输入辅助
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：分组、建议、输出、进度与测量](11-fieldset-datalist-output-progress-meter.md) · [下一课：约束属性与验证候选者](13-constraint-attributes-candidates.md) · [返回 HTML 模块](../README.md)
