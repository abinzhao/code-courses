# 日期、时间、颜色与类型化值 API

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 处理日期时间和颜色输入的机器值、地区化界面与类型化 DOM API。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-010`、`FRM-011`、`FRM-016` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

处理日期时间和颜色输入的机器值、地区化界面与类型化 DOM API。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-010（date、time、datetime-local、month、week）、FRM-011（color）、FRM-016（valueAsNumber、valueAsDate、stepUp/stepDown）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 日期与时间组

日期时间控件的可见外观会本地化，但 `.value` 使用稳定机器格式：

| 类型 | 机器值示例 | 表达内容 | 是否包含时区 |
| --- | --- | --- | --- |
| `date` | `2026-10-10` | 公历日期 | 否 |
| `time` | `09:30` 或 `09:30:15.250` | 一天中的时间 | 否 |
| `datetime-local` | `2026-10-10T09:30` | 本地日期和时间 | 否 |
| `month` | `2026-10` | 年和月 | 否 |
| `week` | `2026-W41` | ISO 周年与周数 | 否 |

机器值与界面显示要分开理解。中文浏览器可能把日期画成“2026/10/10”，但读取 `.value` 仍得到 `2026-10-10`。

#### 4.7.1 `date`

```html
<input type="date" name="availableDate" value="2026-10-10">
```

适合生日、可用日期、截止日期等“日历日期”。它本身不是一个包含时区的瞬间。

#### 4.7.2 `time`

```html
<input type="time" name="availableTime" value="09:30" step="900">
```

适合一天中的时间。`step="900"` 代表 900 秒，即 15 分钟。

#### 4.7.3 `datetime-local`

```html
<input type="datetime-local"
       name="handoffLocal"
       value="2026-10-10T09:30">
```

它明确不包含时区。字符串只表达墙上时钟读数：

```text
2026-10-10 09:30
```

这个读数只有结合“哪个时区”才可转换成唯一 UTC 时刻。

错误做法：

```js
// 错误案例：追加 Z 等于声称用户输入本来就是 UTC。
const wrongUtc = `${handoffInput.value}Z`;
```

若产品契约明确“输入使用当前设备所在时区”，可以让 JavaScript 按当前运行环境的本地时区构造 `Date`，再调用 `.toISOString()`。若业务指定“上海社区时区”，就不能依赖用户设备时区；应把 IANA 时区（如 `Asia/Shanghai`）作为明确业务数据，并由支持时区规则的服务端或日期时间库处理。

还要处理夏令时：

- 某些本地时间在时钟前跳时不存在；
- 某些时间在时钟回拨时出现两次；
- `datetime-local` 字符串本身无法区分重复的两个瞬间；
- 仅靠浏览器 `Date` 不能完整表达所有业务时区选择。

#### 4.7.4 `month`

```html
<input type="month" name="warrantyMonth" value="2026-10">
```

适合账期、保修月份等“月粒度”数据。不要擅自把它解释成某月最后一天。

#### 4.7.5 `week`

```html
<input type="week" name="pickupWeek" value="2026-W41">
```

它使用 ISO 周模型。周所属年份不一定等于周内所有日期的公历年份；跨年附近尤其要依赖标准转换，不要自己用“1 月第几周”拼字符串。

#### 4.7.6 `valueAsNumber` 与 `valueAsDate` 的限制

支持类型与语义并不完全一致：

| 类型 | `valueAsNumber` | `valueAsDate` | 关键提醒 |
| --- | --- | --- | --- |
| `number`、`range` | 数值 | 不支持，通常为 `null` | 空值时数值为 `NaN` |
| `date` | 从 Unix epoch 到该日期 UTC 午夜的毫秒数 | UTC 午夜的 `Date` | 用 UTC getter 读取日历字段 |
| `time` | 从午夜起的毫秒数 | 以 `1970-01-01` UTC 为日期基准的 `Date` | 它不是今天的真实时刻 |
| `datetime-local` | 不含时区的本地日期时间对应的数值表示 | 标准基线不支持，通常为 `null` | 数值不能凭空补出业务时区 |
| `month` | 从 1970-01 起的月数 | 该月第一天 UTC 的 `Date` | 数值单位不是毫秒 |
| `week` | 对应周起点的毫秒表示 | 对应周一 UTC 的 `Date` | 使用 ISO 周规则 |
| 其他类型 | 通常为 `NaN` | 通常为 `null` | 不要强行转换 |

空值或无法转换时：

```js
console.log(Number.isNaN(input.valueAsNumber));
console.log(input.valueAsDate === null);
```

`date.valueAsDate` 的常见陷阱：

```js
const dateValue = dateInput.valueAsDate;

console.log(dateValue.getUTCFullYear());
console.log(dateValue.getUTCMonth() + 1);
console.log(dateValue.getUTCDate());
```

对 `date`、`month`、`week`、`time` 这类没有本地时区语义的值，使用本地 getter（如 `getDate()`）可能在 UTC 负偏移地区显示前一天。更直接的做法通常是保留机器字符串，只有确实需要日期运算时才按对应规范转换。

不要在 `datetime-local` 上依赖 `.valueAsDate`。`Date` 表示时间线上的一个瞬间，而 `datetime-local` 缺少确定瞬间所需的时区。

### 4.2 颜色组：`color`

基础写法：

```html
<input type="color" name="labelColor" value="#0f766e">
```

传统稳定基线使用 `#rrggbb` 形式的简单 sRGB 颜色。浏览器可能显示系统颜色选择器，UI 因系统和浏览器而异。读取：

```js
colorInput.value; // 例如 "#0f766e"
```

边界：

- 颜色值不表达文字与背景组合后的对比度；
- 用户选到某颜色不代表界面满足 WCAG；
- 不应用颜色作为唯一状态线索；
- 新增色彩空间或透明度能力需要单独做兼容性与特性验证；
- `color` 不支持 `valueAsNumber` 或 `valueAsDate`。

## 5. 元素、属性、API 或配置清单

### 5.1 22 种类型完整索引

| # | `type` | 适合的数据 | 当前状态/API | 关键边界 |
| ---: | --- | --- | --- | --- |
| 1 | `text` | 通用单行文本、标识符 | `value`、文本选择 API | 不自动表达搜索、电话或邮箱 |
| 2 | `search` | 搜索词 | `value`、文本选择 API | 不自动执行搜索，清除 UI 因浏览器而异 |
| 3 | `email` | 一个或多个邮箱字符串 | `value`、基础格式约束 | 格式通过不等于邮箱存在或已验证 |
| 4 | `url` | 绝对 URL | `value`、文本选择 API | 格式通过不等于可访问或安全 |
| 5 | `tel` | 电话号码 | `value`、文本选择 API | 无全球统一格式，不参与算术 |
| 6 | `password` | 需要遮蔽的秘密字符串 | `value`、文本选择 API | 遮蔽不是加密，本课不做认证 |
| 7 | `number` | 可运算数值 | `valueAsNumber`、`stepUp/Down` | 空值为 `NaN`，不适合标识符 |
| 8 | `range` | 可调节范围值 | `valueAsNumber`、`stepUp/Down` | 要显示当前值，不适合精确核对 |
| 9 | `date` | 日历日期 | `valueAsNumber`、`valueAsDate`、步进、选择器 | 无时区；`valueAsDate` 按 UTC 读 |
| 10 | `time` | 一天中的时间 | `valueAsNumber`、`valueAsDate`、步进、选择器 | 不代表今天的真实时刻 |
| 11 | `datetime-local` | 无时区的本地日期时间 | `valueAsNumber`、步进、选择器 | `valueAsDate` 不作为标准基线；转换前先定时区 |
| 12 | `month` | 年月 | 月数、`valueAsDate`、步进、选择器 | 不自动代表月末 |
| 13 | `week` | ISO 周 | 毫秒值、`valueAsDate`、步进、选择器 | ISO 周年可能跨公历年 |
| 14 | `color` | 简单颜色值 | `value`、选择器 | 颜色不等于对比度或状态文本 |
| 15 | `checkbox` | 独立开关或多选 | `checked`、`defaultChecked`、`indeterminate` | 未选中不提交，`value` 不是布尔值 |
| 16 | `radio` | 同名互斥选项 | `checked`、`defaultChecked` | 组由名称和表单关系决定 |
| 17 | `file` | 用户主动选择的文件 | `files`、选择器 | 不可非空预填；`accept` 不是验证；选择不等于上传 |
| 18 | `hidden` | 不显示的流程字段 | `value`、`defaultValue` | 可被修改，不能承载秘密和权限 |
| 19 | `button` | 脚本命令 | `click`、`value` 标签 | 没有内建提交行为 |
| 20 | `submit` | 提交命令 | `submit`、`event.submitter` | 参与本次提交数据，默认会导航/请求 |
| 21 | `reset` | 恢复默认状态 | `reset` 事件 | 会丢弃编辑，不恢复任意业务状态 |
| 22 | `image` | 带点击坐标的图片提交 | submitter、`.x`/`.y` 字段 | 需 `src` 和准确 `alt`，普通提交不必用它 |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/06-date-time-color-inputs/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 FRM-010（date、time、datetime-local、month、week） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 FRM-011（color） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 为 FRM-016（valueAsNumber、valueAsDate、stepUp/stepDown） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
5. 在打开页面前写下预期 DOM、默认行为或请求结果；
6. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
7. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [选择、文件、隐藏与命令输入](07-choice-file-command-inputs.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 FRM-010（date、time、datetime-local、month、week） 对应的元素、属性或状态；
- 在项目中实现并标出与 FRM-011（color） 对应的元素、属性或状态；
- 在项目中实现并标出与 FRM-016（valueAsNumber、valueAsDate、stepUp/stepDown） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`07-choice-file-command-inputs.md`](07-choice-file-command-inputs.md)。

## 8. 常见错误与排查路径

### 8.1 错误案例：`valueAsDate` 使用本地 getter

```js
// 错误案例：在 UTC 负偏移环境中可能得到前一天。
const day = dateInput.valueAsDate.getDate();
```

恢复一：直接保留机器日期字符串。

```js
const dateText = dateInput.value;
```

恢复二：确需使用 `Date` 时按该 API 的 UTC 语义读取。

```js
const date = dateInput.valueAsDate;
const day = date?.getUTCDate() ?? null;
```

### 8.2 错误案例：给 `datetime-local` 追加 `Z`

```js
// 错误案例
const utc = `${input.value}Z`;
```

失败原因：`Z` 不是“转换”动作，而是 UTC 声明。恢复步骤：

1. 明确输入使用设备时区还是业务固定时区；
2. 检查本地时刻是否存在；
3. 处理或暴露重复时刻歧义；
4. 转成真实 `Date` 后调用 `toISOString()`；
5. 把时区名和偏移作为证据一起保存；
6. 服务端按业务契约重新验证。

### 8.3 错误案例：把颜色输入当成任意 CSS 颜色字符串

错误代码：

```js
const color = document.querySelector('input[type="color"]');
color.value = "red";
console.log(color.value);
```

**现象：**脚本没有保留 `"red"`；基础颜色控件可能把无效值清洗为 `"#000000"`。把八位透明色 `"#d47c3480"` 写入只支持基础格式的环境，也可能被清洗或拒绝。

**证据：**

```js
console.table({
  attributeValue: color.getAttribute("value"),
  currentValue: color.value,
  matchesExpectedContract: /^#[0-9a-f]{6}$/i.test(color.value)
});
```

**原因：**基础 `color` 值不是任意 CSS `<color>` 字符串，跨浏览器稳健契约是规范化的 `#rrggbb`。`alpha`、`colorspace` 等扩展需要按目标浏览器单独检测，不能因为某一环境出现更丰富选择器就写成普遍保证。

**修复：**

```js
color.value = "#d47c34";
const colorDescription = document.createElement("p");
colorDescription.textContent = `标签色：暖橙色（${color.value}）`;
color.after(colorDescription);
```

页面同时保留文字名称，不能把颜色作为商品状态或错误的唯一信息。

**复验：**

- `color.value === "#d47c34"`；
- 正则检查通过；
- reset 后恢复 HTML 中的默认颜色；
- 颜色旁仍有可见文字；
- 服务端若接收颜色，仍按自己的允许格式重新验证。

## 9. 课后题

### 9.1 日期界面与机器值

题目：中文浏览器把日期显示成 `2026/10/10`，服务端字段应该直接接收这段可见文字吗？

<details>
<summary>参考答案</summary>

不应从可见 UI 抄字符串。读取 `.value` 会得到稳定机器格式 `2026-10-10`。界面显示可根据地区变化，机器值用于数据交换；服务端仍要重新验证日期和业务范围。

</details>

### 9.2 `datetime-local` 与 UTC

题目：为什么 `2026-10-10T09:30` 后面不能直接加 `Z`？

<details>
<summary>参考答案</summary>

原字符串没有时区，只是本地墙钟读数。`Z` 声明它已经是 UTC 09:30，并没有执行时区换算。必须先明确设备或业务时区，解析为时间线上的真实瞬间，再用 `toISOString()` 输出 UTC；夏令时不存在和重复时间还需处理。

</details>

### 9.3 `valueAsDate`

题目：为什么读取 date 的年月日时建议使用 UTC getter 或直接使用 `.value`？

<details>
<summary>参考答案</summary>

date 的 `valueAsDate` 以 UTC 午夜表示。若在 UTC 负偏移地区调用本地 `getDate()`，可能显示前一天。直接保留机器字符串最清楚；需要 `Date` 运算时用 `getUTCFullYear()`、`getUTCMonth()`、`getUTCDate()`。

</details>

## 10. 实践练习

选择一件与教材不同的邻里商品，完成一次迁移练习：

1. 先写内容关系、机器值或交互目标，不先写标签；
2. 用 FRM-010（date、time、datetime-local、month、week）、FRM-011（color）、FRM-016（valueAsNumber、valueAsDate、stepUp/stepDown） 实现最小页面；
3. 制造一个本课错误并保留失败证据；
4. 修复后重复键盘或开发者工具检查；
5. 在记录中解释为什么没有选择一个视觉相似的替代写法。

## 11. 阶段验收

### 11.1 日期、时间与金额

- [ ] 写得出五种日期时间机器格式。
- [ ] 能区分本地化 UI 和 `.value`。
- [ ] 知道 `valueAsDate` 不适用于 datetime-local 的标准基线。
- [ ] date 的 `Date` 结果按 UTC 语义读取。
- [ ] 没有给 datetime-local 字符串直接追加 `Z`。
- [ ] UTC 预览同时记录解释时区和当时偏移。
- [ ] 明确记录夏令时不存在/重复时刻边界。
- [ ] 金额核心模型使用人民币整数分。
- [ ] 单价乘数量后仍检查安全整数。
- [ ] 商品编号 `001204` 保留前导零。

## 12. 常见问题

### Q11：date 的 `.valueAsNumber` 是本地午夜毫秒吗？

不是这样理解。date 的数值按规范对应 UTC 午夜基准。若业务只是日历日期，优先保留 `YYYY-MM-DD`；不要无意把它变成用户时区中的前一天或后一天。

### Q12：datetime-local 为什么没有时区选择？

它的职责就是采集本地日期与时间，不采集时区。需要全球唯一时刻时，产品必须额外定义时区来源：当前设备、用户配置、地点时区或固定业务时区，并处理夏令时。

### Q14：week 的年份为什么可能出乎意料？

ISO 周以周为单位，周一开始；一年的第一周和最后一周可能包含相邻公历年的日期。应使用标准机器值和可靠日期逻辑，不手工按 1 月 1 日计算“第几周”。

### Q15：color 值能否证明文字可读？

不能。单个颜色没有前景/背景组合、字号和字重信息。还要计算对比度，并提供非颜色线索。颜色选择器只是输入颜色值。

### Q27：服务端收到 UTC 后就不需要原时区了吗？

取决于业务。若只关心唯一瞬间，UTC 足够用于排序和存储；若需要按用户当地规则重复安排、展示原意或审计夏令时选择，还应保存业务时区标识。不要只保存当时偏移并把它当完整时区规则。

### Q28：本课的 UTC 转换支持所有历史时区吗？

它只按当前浏览器内置时区数据和设备时区解释，并检测被规范化的不存在时间；无法让用户选择重复时间的早晚偏移，也不处理固定业务地点与设备时区不同的情况。生产系统需用明确 IANA 时区和经过验证的服务端/库实现。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：处理日期时间和颜色输入的机器值、地区化界面与类型化 DOM API。
- `FRM-010`：date、time、datetime-local、month、week
- `FRM-011`：color
- `FRM-016`：valueAsNumber、valueAsDate、stepUp/stepDown
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：文本、数值与范围输入](05-text-number-range-inputs.md) · [下一课：选择、文件、隐藏与命令输入](07-choice-file-command-inputs.md) · [返回 HTML 模块](../README.md)
