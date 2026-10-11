# 文本、数值与范围输入

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 为文本、邮箱、URL、搜索、电话、密码、数值和范围任务选择正确输入模型。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-008`、`FRM-009` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

为文本、邮箱、URL、搜索、电话、密码、数值和范围任务选择正确输入模型。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-008（text、search、email、url、tel、password）、FRM-009（number、range）；
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
实验名称：
文件位置：
打开方式：
操作步骤：
预期结果：
实际结果：
Elements 证据：
Console 或页面输出：
失败证据：
根因：
修复：
复验：
浏览器与版本：
未验证范围：
```

## 4. 核心理论

### 4.1 文本与字符串组

#### 4.5.1 `text`

`text` 是通用单行文本输入：

```html
<input type="text" name="title" autocomplete="off">
```

适合标题、姓名、短标签、商品编号等没有更专门语义的字符串。换行不会成为有效单行值。标识符即使全是数字，也常应使用 `text`。

#### 4.5.2 `search`

```html
<input type="search" name="query">
```

`search` 表达搜索词语义。浏览器可能提供清除按钮、不同键盘回车提示或不同外观，但这些 UI 不应被当作跨平台固定契约。它不会自动执行搜索，仍需表单提交或脚本处理。

#### 4.5.3 `email`

```html
<input type="email" name="contactEmail" autocomplete="email">
```

浏览器可提供邮箱键盘和基础格式校验。加 `multiple` 后可以输入逗号分隔的多个地址。原生格式通过只代表字符串满足浏览器的邮箱语法检查，不代表：

- 邮箱真实存在；
- 用户拥有它；
- 已完成验证；
- 发送邮件一定成功。

本课不实现账号或邮箱认证。

#### 4.5.4 `url`

```html
<input type="url" name="referenceUrl" placeholder="https://example.com/item">
```

它表达绝对 URL 输入。格式通过不代表地址可访问、安全、属于用户或允许服务端抓取。真实系统还要防范不受信任跳转、内部网络访问和协议白名单问题。

#### 4.5.5 `tel`

```html
<input type="tel" name="phone" autocomplete="tel">
```

电话号码不是普通数值：

- 可能以 `+` 开头；
- 可能包含国家/地区码、分机和分隔符；
- 前导零有意义；
- 不参与加减。

`tel` 默认没有统一的全球格式校验，因为电话号码规则因地区而异。格式规则必须由产品和服务端明确。

#### 4.5.6 `password`

```html
<input type="password" name="demoPassword" autocomplete="new-password">
```

浏览器通常遮蔽显示，并可能与密码管理器协作。遮蔽不是加密：

- `.value` 仍能被页面脚本读取；
- 提交安全依赖 HTTPS 和服务端处理；
- 页面源代码中的默认密码会泄露；
- 本课不实现登录、认证或凭据存储。

不要为了观察而在教程证据中记录真实密码。

#### 4.5.7 文本选择 API 的适用范围

常用选择 API：

```js
input.selectionStart;
input.selectionEnd;
input.selectionDirection;
input.setSelectionRange(start, end, direction);
input.select();
```

`selectionStart`、`selectionEnd` 和 `setSelectionRange()` 适用于 `text`、`search`、`url`、`tel`、`password`。不要假设它们适用于 `email`、`number` 或日期类型：

- 在不适用类型上读取选择位置可能得到 `null`；
- 设置选择范围可能抛出 `InvalidStateError`；
- `select()` 的视觉效果仍要以浏览器实际实现为准。

特性存在不等于当前类型支持。最稳妥的做法是只在明确支持的类型上调用，并保留 `try...catch` 作为故障证据，而不是吞掉异常。

### 4.2 数值与范围组

#### 4.6.1 `number`

```html
<input type="number" name="quantity" min="1" max="99" step="1" value="1">
```

适合可比较、可步进、可参与运算的数值。`.value` 仍是字符串：

```js
quantity.value;         // "1"
quantity.valueAsNumber; // 1
```

空输入：

```js
quantity.value = "";

console.log(quantity.value);         // ""
console.log(quantity.valueAsNumber); // NaN
```

不能写：

```js
// 错误案例：NaN 不等于自身，也不能用这种方式判断。
if (quantity.valueAsNumber === NaN) {
  // 永远不会进入
}
```

应写：

```js
const value = quantity.valueAsNumber;

if (Number.isNaN(value)) {
  console.log("当前没有可用数值");
}
```

`number` 不适合：

- 商品编号；
- 邮政编码；
- 电话号码；
- 身份标识；
- 银行卡号；
- 需要原样保留前导零的代码。

这些值可使用：

```html
<input type="text"
       name="listingCode"
       inputmode="numeric"
       autocomplete="off">
```

`inputmode` 是软键盘提示，不改变值类型，也不构成验证。

#### 4.6.2 `range`

```html
<input type="range" name="conditionScore" min="1" max="5" step="1" value="3">
```

`range` 适合允许近似或连续调节、且当前值可以配合可见输出展示的场景。它通常不会提供像文本框那样精确可见的数字，因此应关联输出：

```html
<output id="condition-output" for="condition-score">3</output>
```

若未声明边界，常见默认值为：

```text
min = 0
max = 100
step = 1
value = 中点附近的有效值
```

不要用 `range` 采集必须精确核对的金额、验证码或编号。

#### 4.6.3 `stepUp()` 与 `stepDown()`

数值和部分日期时间类型支持：

```js
quantity.stepUp();
quantity.stepDown(2);
```

它们按控件的 `step` 和边界调整当前值，而不是简单执行字符串加法。适用类型包括：

- `number`、`range`；
- `date`、`time`、`datetime-local`、`month`、`week`。

边界：

- 不支持步进的类型会抛出 `InvalidStateError`；
- `step="any"` 没有确定步长时可能抛出 `InvalidStateError`；
- 空值、`min`、`max` 和步长基准会影响结果；
- 调用后仍应读取 `.value` 或 `.valueAsNumber` 作为证据；
- 浏览器原生步进不能替代服务端业务限制。

## 5. 元素、属性、API 或配置清单

### 5.1 数值还是标识符

| 数据 | 推荐 | 原因 |
| --- | --- | --- |
| 商品数量 `3` | `number` | 参与加减，有最小值和整数步长 |
| 商品价格输入 | `number` 或明确格式的 `text`，边界转整数分 | 参与比较，但核心模型不存浮点元 |
| 商品编号 `001204` | `text inputmode="numeric"` | 前导零有意义，不参与算术 |
| 邮政编码 `010000` | `text inputmode="numeric"` | 是地区标识，不是数量 |
| 手机号 `+86 138...` | `tel` | 有电话语义和符号，不参与算术 |
| 验证码 `042691` | `text inputmode="numeric"` | 固定长度字符串，前导零有意义 |
| 满意度 1–5 | `range` 或 radio | 可调节或离散选择，需可见值 |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/05-text-number-range-inputs/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 FRM-008（text、search、email、url、tel、password） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 FRM-009（number、range） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [选择、文件、隐藏与命令输入](07-choice-file-command-inputs.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 FRM-008（text、search、email、url、tel、password） 对应的元素、属性或状态；
- 在项目中实现并标出与 FRM-009（number、range） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`07-choice-file-command-inputs.md`](07-choice-file-command-inputs.md)。

## 8. 常见错误与排查路径

### 8.1 错误案例：标识符使用 `number`

```html
<!-- 错误案例 -->
<input type="number" name="listingCode" value="001204">
```

故障证据：

```js
const code = document.querySelector('[name="listingCode"]');
console.log(code.value);
console.log(code.valueAsNumber);
```

一旦进入数值模型，前导零和精确字符串身份无法保留。恢复：

```html
<input type="text"
       name="listingCode"
       inputmode="numeric"
       value="001204">
```

### 8.2 错误案例：用 `=== NaN`

```js
// 错误案例
if (price.valueAsNumber === NaN) {
  showError();
}
```

恢复：

```js
if (Number.isNaN(price.valueAsNumber)) {
  showError();
}
```

还应先检查空字符串是否代表“未填”，不要把未填和格式错误合并成同一个业务状态。

### 8.3 错误案例：金额直接用浮点元累计

```js
// 错误案例
const totalYuan = 19.99 * 3;
```

恢复：

```js
const unitPriceCents = 1999;
const totalCents = unitPriceCents * 3;

console.assert(totalCents === 5997);
```

展示时再格式化：

```js
const formatter = new Intl.NumberFormat("zh-CN", {
  style: "currency",
  currency: "CNY"
});

console.log(formatter.format(totalCents / 100));
```

整数分也不是所有货币的通用方案；本课业务契约固定为人民币。

### 8.4 故障恢复记录模板

以“价格空值被当成 0”为例：

```text
现象：清空价格后，预览显示 0 分。
预期：空值应阻止预览，不等于免费。
证据：price.value === ""；price.valueAsNumber 是 NaN。
根因：代码使用 Number(price.value)，Number("") 得到 0。
修复：先判断空字符串，再用严格十进制解析器转整数分。
复验：空值失败；0 和 0.00 合法且得到 0 分；39.50 得到 3950 分。
回归：数量、总价和 reset 路径仍通过。
```

不要通过把所有失败都改成 0、空字符串或 `try...catch` 后静默继续来制造“成功”。

## 9. 课后题

### 9.1 为什么商品编号不用 `number`

题目：编号 `001204` 只含数字，为什么仍应使用 `text`？

<details>
<summary>参考答案</summary>

编号是标识符，不参与算术；前导零是身份的一部分。`number` 提供无意义的步进，并鼓励读取 `valueAsNumber`，结果会变成 `1204`。应使用 `text`，需要数字软键盘时增加 `inputmode="numeric"`，再按业务规则验证字符串。

</details>

### 9.2 空 number

题目：为什么不能用 `valueAsNumber === NaN` 判断空 number？

<details>
<summary>参考答案</summary>

JavaScript 中 `NaN` 不等于任何值，包括自身。应使用 `Number.isNaN(input.valueAsNumber)`；还可先检查 `input.value === ""`，区分未填写与其他失败。

</details>

## 10. 实践练习

### 10.1 进阶级：数值与标识符决策器

创建：

```text
practice/html-05-input-types/exercise-advanced.html
```

页面展示以下数据，让学习者选择控件并写理由：

```text
商品数量
人民币价格
商品编号 001204
邮政编码 010000
联系电话 +86 138 0000 0000
六位验证码 042691
成色评分 1–5
交接时刻
```

要求：

1. 数量使用 number、整数步长和上下界；
2. 价格输入在边界精确转整数分；
3. 三类标识符都保留前导零；
4. 电话使用 tel；
5. 评分使用 range 并显示当前值；
6. 交接时刻使用 datetime-local；
7. 输出控件选择、原始字符串和业务值；
8. 明确时区解释；
9. 增加 `stepUp()` 和 `showPicker()` 的特性检测；
10. 写出服务端必须重复验证的项目。

#### 进阶级参考选择

| 数据 | 答案 |
| --- | --- |
| 商品数量 | `number min="1" step="1"` |
| 人民币价格 | `number step="0.01"` + 十进制字符串转整数分 |
| 商品编号 | `text inputmode="numeric"` |
| 邮政编码 | `text inputmode="numeric"` |
| 联系电话 | `tel` |
| 六位验证码 | `text inputmode="numeric" autocomplete="one-time-code"` |
| 成色评分 | `range` + `output` |
| 交接时刻 | `datetime-local` + 明确时区转换边界 |

参考断言：

```js
console.assert(parseYuanToCents("39") === 3900);
console.assert(parseYuanToCents("39.5") === 3950);
console.assert(parseYuanToCents("39.50") === 3950);
console.assert(parseYuanToCents("0.01") === 1);
console.assert(listingCode.value === "001204");
console.assert(postalCode.value === "010000");
console.assert(oneTimeCode.value === "042691");
```

完成标准：

- 不能用 `parseFloat(value) * 100` 代替精确边界解析；
- 不能把标识符转 Number 后再补零；
- 不能把本地时间直接加 `Z`；
- 每种选择都能从数据语义解释，而不是只说“浏览器支持”。

## 11. 阶段验收

- [ ] `FRM-008`：text、search、email、url、tel、password
- [ ] `FRM-009`：number、range
- [ ] 能从空白文件独立复现本课最小案例；
- [ ] 至少保存一条浏览器证据和一次故障恢复记录；
- [ ] 能说明自动检查、人工检查与未验证环境的边界；
- [ ] 项目增量没有复制其他课程拥有的完整应用。

## 12. 常见问题

### Q1：为什么 `.value` 总是字符串？

表单控件首先面向用户输入和表单编码，`.value` 提供字符串机器值。数值类型额外提供 `.valueAsNumber`，部分日期时间类型提供 `.valueAsDate`。业务代码仍要处理空值、范围、整数要求和服务端验证。

### Q2：`input type="number"` 能阻止输入所有非数字字符吗？

不能把键盘表现当契约。不同浏览器可能允许暂时输入符号、小数点或指数形式，以便用户完成一个数值。最终应读取 `.value`、`.valueAsNumber` 和 `validity`，再执行业务验证。

### Q3：价格究竟应该用 number 还是 text？

两者都可能成立。number 提供步进、数值键盘提示和原生范围约束，但允许形式和本地输入体验需实测；text 可以实施严格十进制字符串契约并配 `inputmode="decimal"`。无论界面类型，进入业务模型前都应精确转换为整数最小货币单位。本课用 number 展示原生能力，再用字符串解析守住整数分边界。

### Q5：search 和 text 有什么可靠差异？

search 表达搜索词语义，浏览器可能提供清除按钮、键盘提示或样式差异。具体 UI 不一致，业务仍需监听提交或输入事件。不要依赖某个浏览器私有的清除图标。

### Q6：email 通过原生校验是否说明地址存在？

不说明。它只检查浏览器定义的格式。地址存在性和所有权需要发送验证流程；本课不实现认证或邮件验证。

### Q7：url 通过校验后可以直接让服务器抓取吗？

不可以。格式有效不代表目标安全。服务端抓取还要限制协议、重定向、DNS 变化、内网地址、响应大小和超时，防止服务端请求伪造等风险。

### Q8：tel 为什么没有统一格式校验？

全球电话号码格式差异很大，还可能包含国家码、分机和本地拨号规则。tel 提供语义和输入辅助，具体格式由产品地区范围与服务端契约决定。

### Q9：password 是否会自动加密值？

不会。它主要遮蔽界面并支持密码管理器。传输依赖 HTTPS，存储和认证依赖服务端安全设计。不要在 HTML 默认 value 中放真实密码。

### Q13：为什么 month 的 valueAsNumber 不是毫秒？

month 的数值语义是从 1970 年 1 月起经过的月份数。不同月份天数不同，用固定毫秒数表达会失真。使用前必须知道每种类型的单位，不能把所有 `valueAsNumber` 都当 epoch 毫秒。

### Q20：hidden 和 CSS `display:none` 的 text 输入一样吗？

都不可见，但 input 类型状态不同。hidden 不参与普通交互和约束验证，语义上就是隐藏数据；用 CSS 隐藏普通必填控件可能制造无法操作的验证失败。两者都不可信。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：为文本、邮箱、URL、搜索、电话、密码、数值和范围任务选择正确输入模型。
- `FRM-008`：text、search、email、url、tel、password
- `FRM-009`：number、range
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：input 类型与值状态模型](04-input-types-value-state.md) · [下一课：日期、时间、颜色与类型化值 API](06-date-time-color-inputs.md) · [返回 HTML 模块](../README.md)
