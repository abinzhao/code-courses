# 约束属性与验证候选者

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 判断 willValidate 候选者，并使用 required、长度、pattern、min、max、step 和文件提示约束。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-025`、`FRM-026` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

判断 willValidate 候选者，并使用 required、长度、pattern、min、max、step 和文件提示约束。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-025（required、长度、pattern）、FRM-026（min、max、step 与数值/日期约束）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 约束验证是一组状态，不是一条总错误

浏览器为可验证控件维护 `validity`，其类型是 `ValidityState`。它不是单个布尔值，而是一组失败原因：

```text
valueMissing       必填值缺失
typeMismatch       值不符合 email/url 类型语法
patternMismatch    非空值不符合 pattern
tooLong            用户输入超过 maxlength
tooShort           用户输入短于 minlength
rangeUnderflow     数值低于 min
rangeOverflow      数值高于 max
stepMismatch       数值不在合法步长点上
badInput           浏览器无法把用户输入转换为该类型的值
customError        setCustomValidity() 中仍有非空消息
valid              上述错误全部为 false
```

同一控件可能同时具有不止一个失败状态。例如必填数字框中输入了浏览器无法转换的字符时，实现可能报告 `badInput`，其可读取值也可能为空。页面不应通过一长串互斥 `else if` 猜测所有浏览器细节；应以 `validity` 和 `validationMessage` 的实际结果为证据。

### 4.2 `willValidate`：先确认控件是不是候选者

`willValidate` 表示元素是否会成为约束验证候选者：

```js
const price = document.querySelector("#price-cents");
console.log(price.willValidate);
```

常见结果：

| 控件状态 | 典型 `willValidate` | 说明 |
| --- | ---: | --- |
| 普通可编辑 text/number/file 控件 | `true` | 可参与约束验证 |
| `disabled` 控件 | `false` | 被禁用，不应靠它保存必须提交的值 |
| `input type="hidden"` | `false` | 隐藏字段不受约束验证保护，也不可信 |
| `input type="button"`、`reset` | `false` | 不是数据输入候选者 |
| 只读 text 类控件 | `false` | 只读状态通常被排除在约束验证外 |

`willValidate === false` 不等于字段安全，也不等于字段不会提交。隐藏字段可以提交但不参与约束验证；禁用字段既不验证，通常也不提交。服务端必须独立决定每个字段是否允许出现和值是否可信。

### 4.3 `required`：不同控件的“缺失”不同

`required` 是布尔属性。只要属性存在就表示启用，`required="false"` 仍然等于启用。

```html
<input id="title" name="title" required>
```

常见含义：

- 文本、邮箱、URL、数字、日期和文件控件：没有值时 `valueMissing`；
- 单个必选复选框：未选中时 `valueMissing`；
- 同名 radio 组：组内没有任何一个被选中时缺失；
- file：`files.length === 0` 时缺失；
- select：若当前值为空字符串，必选约束失败。

`required` 不会自动拒绝只含空格的普通文本。`"    "` 不是空字符串，需要 `pattern` 或业务规则补充。它也不适用于 hidden、button、range、color 等没有“空值”语义或不支持该属性的状态。

错误写法：

```html
<!-- 错误案例：false 不是关闭布尔属性 -->
<input name="title" required="false">
```

恢复方式是彻底移除属性：

```html
<input name="title">
```

### 4.4 `minlength` 与 `maxlength`：限制用户输入长度

```html
<textarea
  name="description"
  minlength="20"
  maxlength="300"
  required
></textarea>
```

- 非空用户输入短于 `minlength` 时，`tooShort` 为 `true`；
- 用户输入长于 `maxlength` 时，`tooLong` 为 `true`；
- 许多浏览器在正常键入时会直接阻止超过 `maxlength` 的更多输入，因此 `tooLong` 不一定容易通过界面复现；
- 长度按字符串长度规则计算，不等于用户感知的字数、UTF-8 字节数或数据库列字节数；
- 前后空白仍参与长度计算；
- 空值是否错误由 `required` 决定，不能只写 `minlength`；
- 脚本直接给 `.value` 赋值后，长度状态与用户交互输入的表现可能不同，不能把程序赋值实验当成所有输入路径的结论。

如果业务要求“去掉首尾空白后至少 4 个字符”，应在每次验证时基于 `value.trim()` 重新计算，而不是误以为 `minlength="4"` 会忽略空白。

### 4.5 `pattern`：匹配整个非空值

```html
<input
  name="listingCode"
  pattern="[A-Z0-9]{4,12}"
  title="请输入 4 至 12 位大写字母或数字"
>
```

关键规则：

- `pattern` 写正则表达式内容，不写 JavaScript 的 `/.../` 分隔符；
- 浏览器按整段值匹配，可理解为要求整个值都符合模式；
- 空字符串不会单独产生 `patternMismatch`，必填还要写 `required`；
- 模式只对支持它的控件类型生效；
- 现代 HTML 规范按 Unicode 感知的规则编译模式，字符类中的特殊字符需要正确转义；
- `title` 可以补充输入格式说明，但可见帮助文字更稳定；
- `pattern` 不能承担身份、权限、唯一性或服务端业务状态检查。

错误写法：

```html
<!-- 错误案例：把 JavaScript 正则分隔符写进 pattern -->
<input pattern="/[A-Z0-9]{4,12}/">
```

这里的斜杠会被当作待匹配字符。正确值是 `pattern="[A-Z0-9]{4,12}"`。

### 4.6 `min`、`max` 与 `step`：合法值是一组离散点

```html
<input
  type="number"
  name="priceCents"
  min="100"
  max="100000000"
  step="1"
  required
>
```

这组约束表示：

- 低于 100 分：`rangeUnderflow`；
- 高于 100000000 分：`rangeOverflow`；
- 不落在合法步长点上：`stepMismatch`；
- 无法转换为数字：可能出现 `badInput`；
- 100、101、102 都是合法整数分，100.5 不是。

步长不是“最多几位小数”，而是从**步长基准**出发的一组值：

```text
合法值 = 步长基准 + n × step
```

通常优先以 `min` 为基准；没有 `min` 时还可能使用 `value` 内容属性或该类型的默认基准。不同日期时间类型还有各自的默认步长单位。不要只看到 `step="2"` 就假设合法值一定是所有偶数；若 `min="1"`，合法点会是 1、3、5。

`step="any"` 关闭步长不匹配检查，但不关闭类型、最小值和最大值检查。邻里集市把价格建模为整数分，选择 `step="1"`，避免二进制浮点元金额参与业务计算。服务器仍要检查它是安全整数并位于业务范围内。

`min`、`max` 也适用于部分日期时间类型：

```html
<input
  type="date"
  min="2026-10-10"
  max="2027-12-31"
  step="1"
>
```

日期输入的可见格式由浏览器和区域设置决定，机器值仍使用规定格式。不要把没有时区的 `datetime-local` 字符串直接加 `Z`；`Z` 表示已经转换为 UTC，不是装饰。

### 4.7 `accept` 与 `multiple` 不会验证文件内容

```html
<input
  type="file"
  name="images"
  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
  multiple
>
```

`accept` 告诉文件选择器优先展示哪些文件类型。它可以使用扩展名、完整 MIME 类型或 MIME 通配符。它不是约束验证条件：

- 选择到不匹配文件时，`typeMismatch` 不会因此变成 `true`；
- 某些选择器允许切换到“所有文件”；
- 用户可在 DevTools 中删除 `accept`；
- 拖放、自动化和自造请求不需要遵守当前控件提示；
- `File.type` 来自客户端环境，可能为空，也可能错误或被伪造；
- 文件扩展名同样可以改名伪造。

`multiple` 只允许一次选择多个文件。它不表示“必须至少两个”，也不限制最大数量。最大 3 张需要页面业务检查和服务器重复检查。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 关键证据 | 边界 |
| --- | --- | --- | --- |
| `required` | 声明值或选中状态必需 | `validity.valueMissing` | 不拒绝空白文本，不支持所有类型 |
| `minlength` | 声明用户输入最短长度 | `validity.tooShort` | 不自动 trim，不替代 `required` |
| `maxlength` | 声明用户输入最长长度 | `validity.tooLong` | 浏览器可能先阻止继续输入 |
| `pattern` | 声明完整非空值模式 | `validity.patternMismatch` | 不写 `/.../`，不能验证权限 |
| `min` | 声明数值/日期下界 | `validity.rangeUnderflow` | 类型不支持时无效 |
| `max` | 声明数值/日期上界 | `validity.rangeOverflow` | 客户端上界不是安全策略 |
| `step` | 声明合法步长点 | `validity.stepMismatch` | 基于步长基准，不是“小数位数” |
| `accept` | 提示 file 选择器接受类型 | `input.accept` | 不产生 MIME 类型有效性错误 |
| `multiple` | 允许 email/file 多值 | `input.multiple` | 不限制最大数量 |
| `validity` | 返回 `ValidityState` | 各布尔成员 | 是当前客户端状态快照 |
| `willValidate` | 是否参与约束验证 | 布尔值 | `false` 不表示字段可信 |
| `validationMessage` | 当前本地化或自定义消息 | 字符串 | 不断言固定浏览器原生文案 |
| `checkValidity()` | 检查并触发 `invalid` | 返回布尔值 | 不主动展示浏览器提示 |
| `reportValidity()` | 检查并尝试交互报告 | 返回布尔值 | 浏览器 UI 不应是唯一错误界面 |
| `setCustomValidity("")` | 清除自定义错误 | `customError === false` | 必须在每轮重算前执行 |
| `setCustomValidity(message)` | 设置业务错误 | `customError === true` | 非空消息会一直阻塞验证 |
| `invalid` | 报告无效候选控件 | 捕获监听日志 | 不冒泡，取消后需自建提示 |
| `File.name` | 原始文件名 | 字符串 | 不可直接作为服务端路径 |
| `File.type` | 客户端声明 MIME | 字符串 | 可为空或不可信 |
| `File.size` | 客户端报告字节数 | 非负整数 | 服务端仍要限制实际请求 |
| `files` | 当前文件列表 | `FileList` | 只读选择结果，不表示已上传 |
| `novalidate` | 关闭提交前自动交互验证 | form 属性 | 不关闭验证 API |

推荐排查顺序：

```text
control.willValidate
  → control.validity 的具体成员
  → control.validationMessage
  → 原生属性当前值
  → customError 是否过期
  → invalid 监听是否使用捕获
  → 页面业务规则是否每轮重算
  → 服务端是否独立重复验证
```

## 6. 最小可运行案例

在个人练习目录中新建 `practice/13-constraint-attributes-candidates/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 FRM-025（required、长度、pattern） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 FRM-026（min、max、step 与数值/日期约束） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [文件检查与服务端信任边界](15-file-checks-server-boundaries.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 FRM-025（required、长度、pattern） 对应的元素、属性或状态；
- 在项目中实现并标出与 FRM-026（min、max、step 与数值/日期约束） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`15-file-checks-server-boundaries.md`](15-file-checks-server-boundaries.md)。

## 8. 常见错误与排查路径

### 8.1 `minlength` 被空格“满足”

- **现象**：四个空格通过 `minlength="4"`。
- **原因**：长度约束不自动 trim。
- **修复**：保留原生长度约束，再增加 `trim()` 后的业务规则。
- **复验**：四个空格触发 `customError`，“台灯可用”通过。

### 8.2 数字框显示空字符串，却不是普通缺失

某些不可解析输入会令 `value` 为空，同时 `badInput` 为 `true`。排查时先看 `validity.badInput`，不要只根据 `.value === ""` 显示“请填写”。浏览器输入法、区域小数分隔符和中间编辑状态都可能影响表现。

## 9. 课后题

### 9.1 理解题

1. 为什么 `required="false"` 仍然启用必填？
2. `pattern` 为什么不能单独拒绝空值？
3. `min="1" step="2"` 时，1、2、3 哪些通常是合法步长点？
4. `accept="image/png"` 为什么不会让错误文件产生 `typeMismatch`？
5. `customError` 在值修正后为什么可能仍为 `true`？
6. 为什么表单上的普通冒泡监听收不到 `invalid`？
7. `checkValidity()` 和 `reportValidity()` 的主要用户界面差异是什么？
8. `validity.valid === true` 能证明用户有发布权限吗？

<details>
<summary>查看理解题答案</summary>

1. 布尔属性以“是否存在”决定真假，字符串 `"false"` 不会关闭它。
2. `pattern` 检查非空值；空值是否允许由 `required` 决定。
3. 1 和 3 合法；步长从基准 1 开始，2 不在 `1 + n × 2` 上。
4. `accept` 是文件选择提示，不是约束验证规则，文件不匹配不会映射为 email/url 的 `typeMismatch`。
5. 非空自定义消息会持续存在，必须显式调用 `setCustomValidity("")`。
6. `invalid` 不冒泡，需要在捕获阶段监听。
7. 两者都会返回布尔值并可触发 `invalid`；`reportValidity()` 还尝试展示浏览器交互提示和聚焦。
8. 不能。它只说明当前客户端约束没有失败，授权必须由服务端根据可信身份和当前资源状态判断。

</details>

### 9.2 状态判断题

给定：

```html
<input
  type="number"
  required
  min="100"
  max="1000"
  step="50"
>
```

判断下列输入最主要的状态：

| 输入 | 预期状态 |
| --- | --- |
| 空 | ? |
| `50` | ? |
| `125` | ? |
| `1050` | ? |
| `150` | ? |

<details>
<summary>查看状态判断答案</summary>

| 输入 | 预期状态 |
| --- | --- |
| 空 | `valueMissing` |
| `50` | `rangeUnderflow` |
| `125` | `stepMismatch` |
| `1050` | `rangeOverflow` |
| `150` | `valid`，因为 `100 + 1 × 50` |

实际浏览器若还报告其他成员，应记录真实状态，不要只保留答案表。

</details>

## 10. 实践练习

### 10.1 基础：约束状态实验室

文件位置：

```text
practice/html-11-constraint-validation/basic-validity.html
```

要求：

- 创建完整 HTML 文档；
- 至少包含 email、text、number、textarea、file 五类控件；
- 使用 `required`、`pattern`、`min`、`max`、`step`、`minlength`、`maxlength`、`accept`、`multiple`；
- 显示每个控件的 `willValidate` 和全部 11 个相关 `ValidityState` 成员；
- 分别提供 `checkValidity()` 和 `reportValidity()` 按钮；
- 记录浏览器原生 `validationMessage`，但不对固定全文做断言；
- 阻止任何实际提交；
- 明确文件没有上传。

答案标准：

- 空值、类型、模式、长度、范围和步长至少各有一次失败证据；
- 能解释 `tooLong` 在正常键入中可能难以触发；
- 不把 `accept` 不匹配写成 `typeMismatch`；
- hidden 或 disabled 示例的 `willValidate` 为 `false`；
- `checkValidity()` 不主动显示气泡；
- `reportValidity()` 尝试交互报告；
- 文件与运行步骤足以让同伴复现。

## 11. 阶段验收

### 原生约束

- [ ] `required` 的空值、选择组和文件语义能分别解释；
- [ ] `minlength`/`maxlength` 不被误写成 trim 后业务长度；
- [ ] `pattern` 没有 JavaScript 正则分隔符，空值由 `required` 处理；
- [ ] `min`、`max`、`step` 的范围与步长基准能解释；
- [ ] 价格使用安全整数分；
- [ ] `accept` 被描述为选择提示；
- [ ] `multiple` 没有被误写成最大数量。

## 12. 常见问题

### Q1：用了 `required`，还需要服务端必填检查吗？

需要。客户端属性可被删除，请求也可以绕过页面。服务器要对收到的原始数据重新解析、规范化和验证。

### Q3：`pattern` 会自动 trim 吗？

不会。它匹配当前值。若业务忽略首尾空白，应明确决定是拒绝、规范化还是保留，并在服务器执行同一契约。

### Q4：为什么 `maxlength` 下看不到 `tooLong`？

浏览器可能在正常用户输入路径直接阻止继续键入。程序设置 `.value` 的验证行为又不应简单等同于用户输入。记录实际浏览器和输入路径，不要为制造状态而改变生产规则。

## 13. 扩展阅读

资料、规范链接和兼容性说明核验日期：2026-10-10。

- [WHATWG HTML Living Standard：Constraint validation](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constraint-validation)：核对候选控件、`ValidityState`、验证 API 和 `invalid` 算法。
- [WHATWG HTML Living Standard：Common input element attributes](https://html.spec.whatwg.org/multipage/input.html#common-input-element-attributes)：核对 `max`、`min`、`multiple`、`pattern`、`placeholder`、`required`、`step` 等属性。
- [WHATWG HTML Living Standard：File Upload state](https://html.spec.whatwg.org/multipage/input.html#file-upload-state-(type=file))：核对 file、`accept`、`multiple` 和 `files`。
- [MDN：ValidityState](https://developer.mozilla.org/en-US/docs/Web/API/ValidityState)：快速查阅各状态成员和示例。
- [MDN：Constraint validation](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Constraint_validation)：复习原生约束、API 和程序赋值边界。
- [MDN：HTMLInputElement.setCustomValidity()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/setCustomValidity)：核对空字符串清除自定义错误的要求。
- [MDN：HTMLFormElement.checkValidity()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/checkValidity)：核对返回值与 `invalid` 事件。
- [MDN：HTMLFormElement.reportValidity()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/reportValidity)：核对交互报告行为。
- [MDN：invalid event](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/invalid_event)：核对事件触发与监听方式。
- [W3C WCAG 2.2：Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)：理解错误需要用文字识别。
- [W3C WCAG 2.2：Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)：理解字段说明和格式要求。
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)：复习服务端允许列表、规范化和语义验证。
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)：复习扩展名、内容类型、签名、存储和恶意内容边界。
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)：区分界面隐藏与服务端授权。
- [OWASP Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)：理解 cookie 身份请求的 CSRF 防护。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对整数分、UTC 时间和教学状态边界。

阅读时区分三类结论：

- **规范行为**：属性、状态和算法以 HTML Living Standard 为准；
- **实现表现**：原生消息、文件选择器和焦点表现需要在目标浏览器实测；
- **安全边界**：客户端结果一律可绕过，服务端必须基于可信身份和当前状态重检。

## 我现在能做到什么

- 能解释并验证：判断 willValidate 候选者，并使用 required、长度、pattern、min、max、step 和文件提示约束。
- `FRM-025`：required、长度、pattern
- `FRM-026`：min、max、step 与数值/日期约束
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：输入辅助、表单所有者与状态](12-input-assistance-form-state.md) · [下一课：ValidityState、自定义错误与 invalid](14-validity-custom-errors-invalid.md) · [返回 HTML 模块](../README.md)
