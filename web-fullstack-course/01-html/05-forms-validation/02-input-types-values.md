# 02 input 类型与值状态：为数据选择正确的输入模型

## 任务卡

邻里集市要补齐商品发布页。页面需要采集标题、价格、交接时间、商品状态和本地图片等信息，但“都用文本框”会制造新的问题：

- 邮箱、网址、日期和颜色失去浏览器提供的输入界面与基础约束；
- 商品编号被当成数字，前导零消失，还出现无意义的加减按钮；
- 金额直接用浮点数累计，业务数据出现精度风险；
- `datetime-local` 被误当成 UTC，交接时刻发生偏移；
- checkbox 的 `value` 被误认为勾选状态；
- 程序只修改当前值，却期待重置后仍保留修改；
- 隐藏字段、文件扩展名或客户端校验被误当成可信安全边界；
- 辅助按钮漏写类型，意外提交或重置整张表单。

本课要完成两个可观察成果：

1. 一张包含 **22 种现行 `input` 类型**的单文件实验页，按输入任务分组观察，而不是只背类型名称；
2. 一张邻里集市商品发布预览页，价格进入模型前转换为**整数分**，本地交接时间在明确时区边界后转换为 **UTC ISO 8601**。

| 关卡 | 可观察结果 | 主要证据 |
| --- | --- | --- |
| 选择类型 | 能解释数据为什么属于某种输入任务 | 类型选择记录、数字与标识符对比 |
| 读取状态 | 能区分当前值、默认值和勾选状态 | `.value`、`.defaultValue`、`.checked`、`.defaultChecked` |
| 读取机器值 | 能安全处理数值、日期和空值 | `.valueAsNumber`、`.valueAsDate`、`Number.isNaN()` |
| 控制原生行为 | 能使用选择、步进和选择器 API，并提供降级 | API 返回值、异常名、特性检测 |
| 预测按钮 | 能解释普通、提交、重置和图片按钮 | `submit`、`reset`、`event.submitter`、坐标字段 |
| 守住边界 | 不信任 hidden、文件元数据或客户端结果 | Elements、FileList、边界说明 |
| 生成预览 | 金额是整数分，时间边界可追踪 | `priceCents`、`handoffAtUtc`、时区与偏移记录 |

建议按以下顺序学习：

```text
先判断“数据是什么”
  → 选择 input 类型
  → 观察 value / checked 等当前状态
  → 观察 defaultValue / defaultChecked 等重置基线
  → 使用类型专属 API
  → 触发提交或重置默认行为
  → 记录失败证据并恢复
  → 最后映射为业务数据
```

所有示例都只在当前页面内存中运行。表单提交会被 JavaScript 拦截；文件案例只显示用户主动选择的文件元数据，不读取内容、不上传文件；页面不包含真实认证、授权、持久化、支付或并发控制。

## 1. 任务背景

`<input>` 看起来像一个元素，实际上会根据 `type` 进入不同的**状态（state）**。不同状态会改变：

- 浏览器画出的控件；
- 用户可以输入的形式；
- `value` 的机器格式；
- 是否存在 `checked` 或 `files` 等专属状态；
- 哪些属性生效；
- 哪些 DOM API 可用；
- 原生约束验证如何工作；
- 提交时产生什么名称和值；
- 重置时恢复到什么基线。

例如，下面三个控件都可能显示数字字符，但它们表达的不是同一类数据：

```html
<input type="number" name="quantity" min="1" step="1">
<input type="text" name="listingCode" inputmode="numeric">
<input type="tel" name="contactPhone" autocomplete="tel">
```

- `quantity` 是可以比较、加减和参与运算的数量；
- `listingCode` 是标识符，即使只由数字组成，`001204` 与 `1204` 也可能不是同一个编号；
- `contactPhone` 是电话号码，可能包含 `+`、空格、分机符号，不应参与算术。

因此，选择类型时不能问“它看起来是不是数字”，而要问：

1. 这个值是否参与算术？
2. 前导零是否有意义？
3. 浏览器应该提供什么键盘或选择器？
4. 值有没有标准机器格式？
5. 空值、无效值和默认值分别意味着什么？
6. 提交后，服务端要按什么业务规则重新验证？

本课聚焦类型、值状态和默认行为。`required`、`pattern`、完整 `ValidityState`、自定义错误和文件内容检查会在本章第四课系统讲解；这里仅在理解类型所必需时使用少量约束。

## 2. 学习目标

完成本课后，你应能独立做到：

- 按相关任务解释 22 种现行 `input` 类型：
  - `text`、`search`、`email`、`url`、`tel`、`password`；
  - `number`、`range`；
  - `date`、`time`、`datetime-local`、`month`、`week`；
  - `color`；
  - `checkbox`、`radio`；
  - `file`、`hidden`；
  - `button`、`submit`、`reset`、`image`。
- 说明未知 `type` 为什么回退到 `text`，并用 DOM 证据检测结果。
- 根据数据含义选择 `number`、`text inputmode="numeric"` 或 `tel`，不把标识符误当数值。
- 区分 HTML `value` 内容属性、`.defaultValue` 重置基线和 `.value` 当前值。
- 区分 `checked` 当前状态与 `defaultChecked` 默认勾选状态。
- 解释 checkbox/radio 的 `value` 是提交值，而不是勾选状态。
- 解释用户或脚本修改当前状态后，表单重置怎样回到默认状态。
- 使用 `.valueAsNumber`，并用 `Number.isNaN()` 处理空值或不可转换值。
- 说明 `.valueAsDate` 支持范围和 UTC 读取陷阱，不在 `datetime-local` 上依赖它。
- 写出日期时间类型的机器格式，并区分机器值与本地化界面。
- 说明 `datetime-local` 不含时区，不能直接追加 `Z` 冒充 UTC。
- 使用整数分建立邻里集市价格模型，不用浮点元作为核心存储值。
- 在适用类型上使用 `stepUp()`、`stepDown()`，并处理不支持或 `step="any"` 等异常。
- 在适用文本类型上使用 `selectionStart`、`selectionEnd` 和 `setSelectionRange()`。
- 对 `showPicker()` 做特性检测，在用户激活中调用并提供原生点击降级。
- 说明文件选择器不会泄露真实路径、脚本不能设置非空文件选择、`accept` 不是安全验证。
- 说明 hidden 字段可被修改，不能承载权限、价格真相、身份或秘密。
- 预测 `button`、`submit`、`reset`、`image` 的默认行为和提交数据。
- 解释 reset 不会恢复任意 JavaScript 业务状态，`reset` 监听器还要等待默认重置完成。
- 使用 Elements、Console、事件记录和页面输出建立“现象—根因—修复—复验”证据链。

## 3. 预备知识

开始前，你需要：

- 会创建一个 `.html` 文件并用浏览器打开；
- 会打开开发者工具的 Elements 和 Console；
- 知道 `<form>`、`name` 与 `value` 会参与表单数据构造；
- 了解 JavaScript 的变量、函数、数组、对象和事件监听；
- 最好已经完成[上一课：表单提交与成功控件](01-form-submission-successful-controls.md)。

个人练习目录：

```text
practice/
└── html-05-input-types/
    ├── type-gallery.html
    ├── market-listing.html
    └── evidence.md
```

这些是学习者个人练习路径，不是本教材仓库要创建的文件。

推荐用本地静态服务器打开：

```bash
cd practice/html-05-input-types
python3 -m http.server 8000
```

浏览器访问：

```text
http://127.0.0.1:8000/type-gallery.html
http://127.0.0.1:8000/market-listing.html
```

停止服务器：

```text
在终端按 Control + C
```

直接双击 HTML 也能运行本课案例。使用本地 HTTP 地址的好处是地址与普通网站更接近，刷新、开发者工具和后续网络观察也更稳定。

### 3.1 本课的证据格式

每个实验至少记录：

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

“页面看起来正常”不是充分证据。当前值、默认值、文件列表、提交按钮来源和未知类型回退都要从 DOM 属性或事件结果中读取。

### 3.2 本课使用的三个“值”

初学者最容易把以下概念混在一起：

| 概念 | 示例 | 用途 |
| --- | --- | --- |
| 内容属性 | HTML 中的 `value="台灯"` | 声明初始值，也是多数值型控件的重置基线 |
| DOM 默认状态 | `input.defaultValue`、`input.defaultChecked` | 反映默认值或默认勾选状态 |
| DOM 当前状态 | `input.value`、`input.checked` | 反映用户或脚本此刻正在使用的状态 |

先只记住一句话：

> `value`/`checked` 回答“现在是什么”，`defaultValue`/`defaultChecked` 回答“重置时回到什么”。

不同类型存在例外，本课会逐项说明；文件输入尤其不能用 HTML 默认值预选本地文件。

## 4. 核心理论

### 4.1 先按任务分组，再记类型名称

22 种类型可以整理为七组：

| 任务组 | 类型 | 共同问题 |
| --- | --- | --- |
| 文本与字符串 | `text`、`search`、`email`、`url`、`tel`、`password` | 字符串语义、输入辅助、基础格式、选择区间 |
| 数值与范围 | `number`、`range` | 数值转换、上下界、步长、空值 |
| 日期与时间 | `date`、`time`、`datetime-local`、`month`、`week` | 机器格式、选择器、时区边界 |
| 颜色 | `color` | 颜色选择器与规范化字符串 |
| 开关与单选 | `checkbox`、`radio` | `checked` 状态、同名组、未选中不提交 |
| 文件与隐藏数据 | `file`、`hidden` | 用户授权选择、不可预填、客户端不可信 |
| 命令与提交 | `button`、`submit`、`reset`、`image` | 点击后的默认行为与 submitter 数据 |

分组不是说组内类型完全一样，而是帮助你先找到共同模型，再理解差异。

### 4.2 `type` 决定状态，未知值回退为 `text`

浏览器读取 `type` 内容属性后，会选择一个已知 input 状态。若值未知：

```html
<input id="legacy-input" type="market-code">
```

浏览器不会创建一个 “market-code 控件”，而会使用缺省的 Text 状态。可以观察：

```js
const input = document.querySelector("#legacy-input");

console.log(input.getAttribute("type")); // "market-code"
console.log(input.type);                 // "text"
```

两个结果不冲突：

- `getAttribute("type")` 读取源代码中的原始属性字符串；
- `.type` 返回浏览器解析后的当前类型状态。

这也是渐进降级的历史基础：旧浏览器不认识较新的类型时，通常仍给用户一个文本输入框。不过，**能输入文字不代表拥有新类型的选择器、清理算法或原生约束**。

检测类型识别可以写：

```js
function supportsInputType(type) {
  const probe = document.createElement("input");
  probe.setAttribute("type", type);
  return probe.type === type;
}
```

这只能证明浏览器识别类型名称，不能证明某个选择器 UI、键盘布局或完整行为在所有平台一致。日期、颜色和文件选择器必须在目标浏览器与设备上人工观察。

### 4.3 当前值、默认值与“脏值”状态

以文本输入为例：

```html
<input id="title" name="title" value="旧书">
```

初始状态：

```js
const title = document.querySelector("#title");

console.log(title.value);        // "旧书"
console.log(title.defaultValue); // "旧书"
```

用户输入“台灯”后：

```text
title.value        → "台灯"
title.defaultValue → "旧书"
```

浏览器内部会记录当前值已经被用户或脚本单独修改。此后改变默认值，不应被理解为无条件覆盖用户正在编辑的内容：

```js
title.defaultValue = "默认商品";
```

结果通常是：

```text
title.value        → "台灯"
title.defaultValue → "默认商品"
```

表单重置后：

```text
title.value        → "默认商品"
title.defaultValue → "默认商品"
```

因此：

- 修改 `.value`：改变当前界面状态；
- 修改 `.defaultValue`：改变默认值和之后的重置基线；
- `form.reset()` 或 `type="reset"`：把控件恢复到新的默认状态；
- 重置不会把 HTML 文件恢复成磁盘上的原始源代码；
- 重置不会自动恢复你维护的数组、对象、预览卡片或网络数据。

不要用 `setAttribute("value", ...)` 作为更新用户当前输入的通用方法。它修改的是内容属性/默认基线；若当前值已“变脏”，页面正在编辑的值可能不会按你预期改变。

### 4.4 `checked` 与 `defaultChecked`

checkbox 和 radio 不用 `.value` 表示是否选中：

```html
<input id="pickup"
       type="checkbox"
       name="handoff"
       value="pickup"
       checked>
```

初始状态：

```js
const pickup = document.querySelector("#pickup");

console.log(pickup.value);          // "pickup"
console.log(pickup.checked);        // true
console.log(pickup.defaultChecked); // true
```

三个属性回答不同问题：

- `.value`：这个选项被成功提交时发送什么字符串；
- `.checked`：现在是否选中；
- `.defaultChecked`：重置后是否选中，对应 `checked` 内容属性。

用户取消勾选后：

```text
value          → "pickup"
checked        → false
defaultChecked → true
```

表单重置后，`.checked` 回到 `true`。

若 checkbox/radio 省略 `value`，被选中并提交时默认值通常是字符串 `"on"`。这个值缺少业务含义，所以应显式写：

```html
<input type="checkbox" name="handoff" value="pickup">
```

同名 radio 形成单选组：

```html
<input type="radio" name="condition" value="new">
<input type="radio" name="condition" value="used">
```

组内通常只能有一个当前选项；设置一个 radio 的 `.checked = true` 会取消同组另一个选项。每个选项仍有自己的 `defaultChecked`，重置时根据默认状态恢复。不要让同一组出现多个 `checked` 默认项，否则源代码意图含糊，最终选中结果还会受解析顺序影响。

### 4.5 文本与字符串组

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

### 4.6 数值与范围组

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

### 4.7 日期与时间组

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

### 4.8 颜色组：`color`

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

### 4.9 开关与单选组

#### 4.9.1 `checkbox`

```html
<input type="checkbox"
       name="handoff"
       value="pickup"
       checked>
```

checkbox 适合多个彼此独立的布尔选项，或一个必须确认的开关。要点：

- `.checked` 是当前布尔状态；
- `.defaultChecked` 是重置基线；
- `.value` 是选中并提交时的字符串；
- 未选中的 checkbox 通常不是成功控件，不产生该名称；
- 多个同名 checkbox 可能产生多个同名值，应使用 `FormData.getAll()`；
- `indeterminate` 只能由脚本设置，表示视觉上的混合状态，不改变提交值，也不替代 `.checked`。

#### 4.9.2 `radio`

```html
<input type="radio" name="condition" value="new">
<input type="radio" name="condition" value="used" checked>
```

radio 适合一组互斥选项。分组由 `name`、表单所有者等共同决定，不是只看视觉位置。要点：

- 同组当前只能选一个；
- 每个 radio 的 `.value` 表示各自业务值；
- 未选中的项不进入提交；
- 没有默认选项时，重置后可以整组都未选；
- 真实页面应为每个选项提供可见 `<label>`，并用 `fieldset`/`legend` 表达组名。

### 4.10 文件与隐藏数据组

#### 4.10.1 `file`

```html
<input type="file"
       name="photos"
       accept="image/png,image/jpeg"
       multiple>
```

脚本通过只读的 `files` 取得 `FileList`：

```js
for (const file of fileInput.files) {
  console.log(file.name, file.type, file.size, file.lastModified);
}
```

浏览器安全限制：

- 页面不能随意打开文件选择器，通常需要用户激活；
- 脚本不能把任意本地路径设置成非空 `.value`；
- 可以把 `.value` 设为空字符串来清除选择；
- 页面不会得到真实本地完整路径，`.value` 可能显示类似 `C:\fakepath\photo.jpg`；
- `FileList` 只包含用户主动授权给当前页面的文件对象；
- 选择文件不等于上传，上传还需要显式请求和服务端接收；
- reset 通常会清空当前文件选择；
- HTML `value` 不能预选本地文件。

`accept` 只是选择器提示：

- 用户环境可能允许切换到“所有文件”；
- 扩展名和 MIME 元数据可以错误或伪造；
- 客户端必须做体验层检查；
- 服务端仍要重新检查大小、真实格式、恶意内容、权限和存储策略。

本课只显示文件名、类型和大小，不读取文件内容，不创建上传请求。

#### 4.10.2 `hidden`

```html
<input type="hidden" name="listingVersion" value="draft-v1">
```

hidden 控件：

- 不显示，也不能作为正常键盘输入目标；
- 有 `name` 时通常可进入表单数据；
- 可以被 Elements、Console、浏览器扩展或构造请求修改；
- 不应依赖原生约束验证；
- 适合携带客户端流程需要的提示或服务端签发后仍会复验的标记；
- 不适合保存秘密、身份真相、最终价格、权限结论或“管理员=true”。

客户端隐藏只影响界面，不创造信任。服务端必须从已认证身份、数据库和业务规则重新取得可信值。

### 4.11 命令与提交组

#### 4.11.1 `button`

```html
<input type="button" value="生成本地预览">
```

没有内建提交或重置行为，通常由脚本监听 `click`。可见标签来自 `value`。若不需要 `input` 的历史形式，`<button type="button">` 更容易包含富文本内容，但那属于下一课的表单控件范围。

#### 4.11.2 `submit`

```html
<input type="submit" name="intent" value="preview">
```

激活后发起表单提交算法：

- 运行约束验证，除非被 `novalidate` 或 submitter 的相应设置跳过；
- 触发 `submit` 事件；
- `event.submitter` 指向实际触发提交的按钮；
- submitter 有 `name` 时，它自己的名称和值进入该次表单数据；
- 按 Enter 提交时，实际 submitter 取决于表单结构和浏览器默认按钮算法，不能靠视觉猜测。

本课监听 `submit` 并调用 `preventDefault()`，所以不会发送网络请求。

#### 4.11.3 `reset`

```html
<input type="reset" value="恢复默认值">
```

激活后触发表单 reset 算法：

- 触发可取消的 `reset` 事件；
- 若事件未被取消，把控件当前状态恢复到默认状态；
- 文本值回到 `defaultValue`；
- checkbox/radio 回到 `defaultChecked`；
- 文件选择被清除；
- 不会自动恢复任意 JavaScript 数组、预览结果或服务器数据。

`reset` 事件监听器执行时，默认重置可能尚未完成。要观察重置后的值，可排入微任务：

```js
form.addEventListener("reset", () => {
  queueMicrotask(() => {
    console.log(input.value);
  });
});
```

reset 会无差别丢弃用户在该表单中的编辑，应谨慎提供。长表单通常更适合明确的“清空筛选”或可撤销操作，而不是紧挨提交按钮放一个危险的重置按钮。

#### 4.11.4 `image`

```html
<input type="image"
       name="mapSubmit"
       src="publish-action.svg"
       alt="在该位置提交预览">
```

它是图片形式的提交按钮：

- 必须有准确 `alt`，图片加载失败和辅助技术都依赖它；
- 激活后提交点击坐标；
- 有 `name="mapSubmit"` 时，坐标通常以 `mapSubmit.x` 和 `mapSubmit.y` 进入数据；
- 没有 `name` 时通常使用 `x`、`y`；
- 坐标适合图像地图类任务，不适合普通“保存”按钮；
- 不应把坐标当作安全授权信息；
- 图片尺寸变化会改变坐标含义。

普通提交优先使用 `submit`。只有业务确实需要“用户点了图片中的哪个位置”时才考虑 `image`。

### 4.12 `showPicker()`：增强，不是前置条件

部分有原生选择器的类型支持：

```js
input.showPicker();
```

常见候选包括日期、时间、颜色和文件。调用前检测：

```js
const canShowPicker =
  "showPicker" in HTMLInputElement.prototype &&
  typeof input.showPicker === "function";
```

还必须在真实用户激活中调用：

```js
button.addEventListener("click", () => {
  if (typeof input.showPicker !== "function") {
    input.focus();
    return;
  }

  try {
    input.showPicker();
  } catch (error) {
    console.log(error.name);
    input.focus();
  }
});
```

可能失败的原因包括：

- 没有瞬时用户激活，抛出 `NotAllowedError`；
- 控件状态不允许选择，抛出 `InvalidStateError`；
- 跨源嵌入等安全限制，可能抛出 `SecurityError`；
- 浏览器虽有方法，但当前类型或平台没有对应 UI。

降级不是自己重写复杂日期选择器，而是让用户直接点击原生控件、聚焦控件或输入标准值。

### 4.13 渐进增强的正确顺序

对 input 类型的渐进增强应遵循：

```text
可见 label 和说明
  → 合适的 type
  → 合适的 name/value
  → HTML 原生 min/max/step 等约束
  → 读取标准 DOM 状态
  → 特性检测 selection / step / showPicker
  → 额外预览和业务映射
  → 服务端重新验证与可信处理
```

不要倒过来：

- 不要先做自定义日期选择器，再删除原生日期语义；
- 不要用脚本把所有字段都强制转成 Number；
- 不要把 hidden 当作权限系统；
- 不要因为有 `accept` 就省略服务端文件验证；
- 不要因为提交被拦截就把本地预览称为发布成功。

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

### 5.2 值状态清单

| API/属性 | 返回 | 适用重点 | 空值/失败 | 重置关系 |
| --- | --- | --- | --- | --- |
| `value` | 字符串 | 多数 input 当前值 | 常为空字符串 | 多数类型恢复到 `defaultValue` |
| `defaultValue` | 字符串 | 多数 input 默认值 | 常为空字符串 | 它就是之后的值重置基线 |
| `checked` | 布尔值 | checkbox/radio 当前选择 | `false` | 恢复到 `defaultChecked` |
| `defaultChecked` | 布尔值 | checkbox/radio 默认选择 | `false` | 它就是之后的勾选重置基线 |
| `files` | `FileList` 或 `null` | file 当前选择 | 通常空列表 | 重置清空 |
| `valueAsNumber` | 数字 | 数值与日期时间状态 | `NaN` | 随当前值恢复 |
| `valueAsDate` | `Date` 或 `null` | date/time/month/week | `null` | 随当前值恢复 |
| `selectionStart/End` | 数字或 `null` | text/search/url/tel/password | 不支持时 `null` 或设置抛错 | 不属于默认值 |
| `type` | 规范化类型字符串 | 所有 input | 未知类型返回 `"text"` | 不由表单 reset 改变 |

### 5.3 类型选择决策表

```text
值是否参与算术？
  是
    → 用户是否需要拖动近似调节？
       是 → range，并显示当前值
       否 → number
  否
    → 是否是日历/时间机器值？
       是 → date / time / datetime-local / month / week
    → 是否是互斥选择？
       是 → radio
    → 是否可多选或开关？
       是 → checkbox
    → 是否是用户授权的本地文件？
       是 → file
    → 是否触发表单命令？
       是 → button / submit / reset / image
    → 是否有 email / URL / 电话 / 搜索 / 密码语义？
       是 → 对应专用类型
    → 否 → text
```

### 5.4 数值还是标识符

| 数据 | 推荐 | 原因 |
| --- | --- | --- |
| 商品数量 `3` | `number` | 参与加减，有最小值和整数步长 |
| 商品价格输入 | `number` 或明确格式的 `text`，边界转整数分 | 参与比较，但核心模型不存浮点元 |
| 商品编号 `001204` | `text inputmode="numeric"` | 前导零有意义，不参与算术 |
| 邮政编码 `010000` | `text inputmode="numeric"` | 是地区标识，不是数量 |
| 手机号 `+86 138...` | `tel` | 有电话语义和符号，不参与算术 |
| 验证码 `042691` | `text inputmode="numeric"` | 固定长度字符串，前导零有意义 |
| 满意度 1–5 | `range` 或 radio | 可调节或离散选择，需可见值 |

### 5.5 特性检测清单

```js
function inputTypeRecognized(type) {
  const input = document.createElement("input");
  input.setAttribute("type", type);
  return input.type === type;
}

function canUseShowPicker(input) {
  return typeof input.showPicker === "function";
}

function canUseTextSelection(input) {
  return ["text", "search", "url", "tel", "password"].includes(input.type);
}

function canUseStep(input) {
  return [
    "number",
    "range",
    "date",
    "time",
    "datetime-local",
    "month",
    "week"
  ].includes(input.type);
}
```

这些函数只判断预期 API 路径，不替代真实操作测试。

## 6. 最小可运行案例

### 6.1 案例目标

`type-gallery.html` 是一张完整类型实验室：

- 22 种类型每种恰好有一个主要观察控件；
- 按七个任务组组织；
- 未知类型单独动态创建，证明回退；
- 页面显示当前值、默认值、选中状态、数值/日期 API；
- 所有提交被拦截，不发送网络请求；
- 文件只显示元数据，不读取、不上传；
- 可以观察文本选择、步进、选择器和 reset；
- 图片提交使用内嵌教学图标，避免额外练习文件；
- 不包含真实密码、真实文件或真实个人信息。

文件位置：

```text
practice/html-05-input-types/type-gallery.html
```

打开方式：

```bash
cd practice/html-05-input-types
python3 -m http.server 8000
```

访问：

```text
http://127.0.0.1:8000/type-gallery.html
```

### 6.2 完整类型实验室

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>22 种 input 类型实验室</title>
  <style>
    :root {
      font-family: system-ui, sans-serif;
      line-height: 1.6;
      color: #172033;
      background: #f8fafc;
    }

    body {
      max-width: 70rem;
      margin: 0 auto;
      padding: 1rem;
    }

    fieldset {
      margin-block: 1rem;
      padding: 1rem;
      border: 1px solid #94a3b8;
      border-radius: 0.5rem;
      background: #ffffff;
    }

    legend {
      padding-inline: 0.4rem;
      font-weight: 700;
    }

    .control {
      display: grid;
      grid-template-columns: minmax(10rem, 15rem) minmax(12rem, 1fr);
      gap: 0.5rem 1rem;
      align-items: center;
      margin-block: 0.75rem;
    }

    input:not([type="checkbox"]):not([type="radio"]):not([type="image"]),
    button {
      min-height: 2.5rem;
      padding-inline: 0.5rem;
      font: inherit;
    }

    input:focus-visible,
    button:focus-visible {
      outline: 3px solid #0f766e;
      outline-offset: 0.15rem;
    }

    .inline-options,
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .note {
      padding: 0.75rem;
      border-inline-start: 0.3rem solid #c2410c;
      background: #fff7ed;
    }

    output {
      font-weight: 700;
    }

    pre {
      max-height: 32rem;
      overflow: auto;
      padding: 1rem;
      color: #e2e8f0;
      background: #0f172a;
      border-radius: 0.5rem;
      white-space: pre-wrap;
    }

    @media (max-width: 38rem) {
      .control {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <h1>22 种 input 类型实验室</h1>
    <p class="note">
      本页只观察浏览器状态。提交会被拦截，文件不会上传，
      “密码”只使用教学字符串，不要输入真实凭据。
    </p>

    <form id="gallery-form" action="/not-used" method="post">
      <fieldset>
        <legend>一、文本与字符串（6 种）</legend>

        <div class="control">
          <label for="text-input">text：商品标题</label>
          <input id="text-input"
                 type="text"
                 name="title"
                 value="旧书">
        </div>

        <div class="control">
          <label for="search-input">search：搜索词</label>
          <input id="search-input"
                 type="search"
                 name="query"
                 value="台灯">
        </div>

        <div class="control">
          <label for="email-input">email：联系邮箱</label>
          <input id="email-input"
                 type="email"
                 name="contactEmail"
                 value="seller@example.com">
        </div>

        <div class="control">
          <label for="url-input">url：参考地址</label>
          <input id="url-input"
                 type="url"
                 name="referenceUrl"
                 value="https://example.com/listing">
        </div>

        <div class="control">
          <label for="tel-input">tel：联系电话</label>
          <input id="tel-input"
                 type="tel"
                 name="phone"
                 value="+86 138 0000 0000">
        </div>

        <div class="control">
          <label for="password-input">password：教学密码</label>
          <input id="password-input"
                 type="password"
                 name="demoPassword"
                 value="not-a-real-password"
                 autocomplete="new-password">
        </div>
      </fieldset>

      <fieldset>
        <legend>二、数值与范围（2 种）</legend>

        <div class="control">
          <label for="number-input">number：数量</label>
          <input id="number-input"
                 type="number"
                 name="quantity"
                 min="1"
                 max="9"
                 step="1"
                 value="2">
        </div>

        <div class="control">
          <label for="range-input">range：成色评分</label>
          <input id="range-input"
                 type="range"
                 name="conditionScore"
                 min="1"
                 max="5"
                 step="1"
                 value="3">
          <output id="range-output" for="range-input">3</output>
        </div>
      </fieldset>

      <fieldset>
        <legend>三、日期与时间（5 种）</legend>

        <div class="control">
          <label for="date-input">date：可交接日期</label>
          <input id="date-input"
                 type="date"
                 name="availableDate"
                 value="2026-10-10">
        </div>

        <div class="control">
          <label for="time-input">time：可交接时间</label>
          <input id="time-input"
                 type="time"
                 name="availableTime"
                 step="900"
                 value="09:30">
        </div>

        <div class="control">
          <label for="datetime-input">datetime-local：本地交接时刻</label>
          <input id="datetime-input"
                 type="datetime-local"
                 name="handoffLocal"
                 step="900"
                 value="2026-10-10T09:30">
        </div>

        <div class="control">
          <label for="month-input">month：保修月份</label>
          <input id="month-input"
                 type="month"
                 name="warrantyMonth"
                 value="2026-10">
        </div>

        <div class="control">
          <label for="week-input">week：预约周</label>
          <input id="week-input"
                 type="week"
                 name="pickupWeek"
                 value="2026-W41">
        </div>
      </fieldset>

      <fieldset>
        <legend>四、颜色（1 种）</legend>

        <div class="control">
          <label for="color-input">color：商品标签色</label>
          <input id="color-input"
                 type="color"
                 name="labelColor"
                 value="#0f766e">
        </div>
      </fieldset>

      <fieldset>
        <legend>五、开关与单选（2 种）</legend>

        <div class="control">
          <span>checkbox：交接方式</span>
          <span class="inline-options">
            <label>
              <input id="pickup-checkbox"
                     type="checkbox"
                     name="handoff"
                     value="pickup"
                     checked>
              自提
            </label>
            <label>
              <input type="checkbox"
                     name="handoff"
                     value="delivery">
              社区配送
            </label>
          </span>
        </div>

        <div class="control">
          <span>radio：商品状态</span>
          <span class="inline-options">
            <label>
              <input type="radio"
                     name="condition"
                     value="new">
              全新
            </label>
            <label>
              <input id="used-radio"
                     type="radio"
                     name="condition"
                     value="used"
                     checked>
              二手
            </label>
          </span>
        </div>
      </fieldset>

      <fieldset>
        <legend>六、文件与隐藏数据（2 种）</legend>

        <div class="control">
          <label for="file-input">file：本地图片元数据</label>
          <input id="file-input"
                 type="file"
                 name="photos"
                 accept="image/png,image/jpeg"
                 multiple>
        </div>

        <input id="hidden-input"
               type="hidden"
               name="listingVersion"
               value="draft-v1">

        <p>
          hidden 没有可见控件；请在 Elements 中找到
          <code>#hidden-input</code> 并尝试修改它。
        </p>
      </fieldset>

      <fieldset>
        <legend>七、命令与提交（4 种）</legend>

        <div class="actions">
          <input id="button-input"
                 type="button"
                 value="只执行脚本">

          <input type="submit"
                 name="intent"
                 value="preview">

          <input type="reset"
                 value="恢复默认值">

          <input type="image"
                 name="imageIntent"
                 width="96"
                 height="40"
                 alt="使用图片按钮提交预览"
                 src="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2296%22%20height=%2240%22%20viewBox=%220%200%2096%2040%22%3E%3Crect%20width=%2296%22%20height=%2240%22%20rx=%226%22%20fill=%22%230f766e%22/%3E%3Ctext%20x=%2248%22%20y=%2225%22%20text-anchor=%22middle%22%20font-family=%22sans-serif%22%20font-size=%2214%22%20fill=%22white%22%3E图片提交%3C/text%3E%3C/svg%3E">
        </div>
      </fieldset>

      <fieldset>
        <legend>观察工具</legend>

        <div class="actions">
          <button id="snapshot-button" type="button">读取全部状态</button>
          <button id="select-button" type="button">选中标题前两个字符</button>
          <button id="step-up-button" type="button">数量增加一步</button>
          <button id="step-down-button" type="button">日期减少一天</button>
          <button id="picker-button" type="button">尝试打开日期选择器</button>
          <button id="unknown-button" type="button">检测未知类型回退</button>
          <button id="clear-file-button" type="button">清除文件选择</button>
        </div>
      </fieldset>
    </form>

    <h2>可观察输出</h2>
    <pre id="result" tabindex="0">等待操作。</pre>
  </main>

  <script>
    "use strict";

    (() => {
      const form = document.querySelector("#gallery-form");
      const result = document.querySelector("#result");
      const textInput = document.querySelector("#text-input");
      const numberInput = document.querySelector("#number-input");
      const rangeInput = document.querySelector("#range-input");
      const rangeOutput = document.querySelector("#range-output");
      const dateInput = document.querySelector("#date-input");
      const fileInput = document.querySelector("#file-input");

      function describeInput(input) {
        const description = {
          id: input.id || "(无 id)",
          typeAttribute: input.getAttribute("type"),
          resolvedType: input.type,
          name: input.name,
          value: input.type === "password" ? "(已遮蔽，不记录)" : input.value,
          defaultValue:
            input.type === "password"
              ? "(已遮蔽，不记录)"
              : input.defaultValue
        };

        if (input.type === "checkbox" || input.type === "radio") {
          description.checked = input.checked;
          description.defaultChecked = input.defaultChecked;
        }

        const numberValue = input.valueAsNumber;
        description.valueAsNumber = Number.isNaN(numberValue)
          ? "NaN"
          : numberValue;

        const dateValue = input.valueAsDate;
        description.valueAsDate =
          dateValue === null ? null : dateValue.toISOString();

        if (input.type === "file") {
          description.value = input.value;
          description.defaultValue = input.defaultValue;
          description.files = Array.from(input.files, (file) => ({
            name: file.name,
            type: file.type || "(空 MIME)",
            size: file.size,
            lastModified: file.lastModified
          }));
        }

        return description;
      }

      function show(value) {
        result.textContent = JSON.stringify(value, null, 2);
      }

      document
        .querySelector("#snapshot-button")
        .addEventListener("click", () => {
          show(Array.from(form.elements)
            .filter((element) => element instanceof HTMLInputElement)
            .map(describeInput));
        });

      document
        .querySelector("#select-button")
        .addEventListener("click", () => {
          textInput.focus();
          textInput.setSelectionRange(0, 2, "forward");

          show({
            value: textInput.value,
            selectionStart: textInput.selectionStart,
            selectionEnd: textInput.selectionEnd,
            selectionDirection: textInput.selectionDirection
          });
        });

      document
        .querySelector("#step-up-button")
        .addEventListener("click", () => {
          try {
            numberInput.stepUp();
            show({
              action: "number.stepUp()",
              value: numberInput.value,
              valueAsNumber: numberInput.valueAsNumber
            });
          } catch (error) {
            show({
              action: "number.stepUp()",
              error: error.name,
              message: error.message
            });
          }
        });

      document
        .querySelector("#step-down-button")
        .addEventListener("click", () => {
          try {
            dateInput.stepDown();
            show({
              action: "date.stepDown()",
              value: dateInput.value,
              valueAsNumber: dateInput.valueAsNumber,
              valueAsDate:
                dateInput.valueAsDate?.toISOString() ?? null
            });
          } catch (error) {
            show({
              action: "date.stepDown()",
              error: error.name,
              message: error.message
            });
          }
        });

      document
        .querySelector("#picker-button")
        .addEventListener("click", () => {
          if (typeof dateInput.showPicker !== "function") {
            dateInput.focus();
            show({
              showPicker: false,
              fallback: "浏览器没有可调用的方法，已聚焦日期控件。"
            });
            return;
          }

          try {
            dateInput.showPicker();
            show({
              showPicker: true,
              result: "已请求浏览器打开原生日期选择器。"
            });
          } catch (error) {
            dateInput.focus();
            show({
              showPicker: true,
              error: error.name,
              message: error.message,
              fallback: "调用失败，已聚焦日期控件。"
            });
          }
        });

      document
        .querySelector("#unknown-button")
        .addEventListener("click", () => {
          const probe = document.createElement("input");
          probe.setAttribute("type", "neighbor-market-code");

          show({
            rawAttribute: probe.getAttribute("type"),
            resolvedProperty: probe.type,
            fallbackConfirmed: probe.type === "text"
          });
        });

      document
        .querySelector("#clear-file-button")
        .addEventListener("click", () => {
          fileInput.value = "";
          show({
            action: "file.value = empty string",
            value: fileInput.value,
            filesLength: fileInput.files.length
          });
        });

      document
        .querySelector("#button-input")
        .addEventListener("click", () => {
          show({
            action: "type=button",
            submitted: false,
            reset: false
          });
        });

      rangeInput.addEventListener("input", () => {
        rangeOutput.value = rangeInput.value;
      });

      fileInput.addEventListener("change", () => {
        show({
          action: "file change",
          note: "只显示元数据，不读取内容，不上传。",
          value: fileInput.value,
          files: Array.from(fileInput.files, (file) => ({
            name: file.name,
            type: file.type || "(空 MIME)",
            size: file.size
          }))
        });
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();

        const data = new FormData(form, event.submitter);

        show({
          action: "submit intercepted",
          submitterType: event.submitter?.type ?? null,
          submitterName: event.submitter?.name ?? null,
          entries: Array.from(data.entries(), ([name, value]) => [
            name,
            value instanceof File
              ? {
                  fileName: value.name,
                  type: value.type,
                  size: value.size
                }
              : name === "demoPassword"
                ? "(已遮蔽，不记录)"
                : value
          ]),
          networkSent: false
        });
      });

      form.addEventListener("reset", () => {
        queueMicrotask(() => {
          rangeOutput.value = rangeInput.value;
          show({
            action: "reset default action completed",
            title: describeInput(textInput),
            quantity: describeInput(numberInput),
            range: describeInput(rangeInput),
            pickup: describeInput(
              document.querySelector("#pickup-checkbox")
            ),
            used: describeInput(
              document.querySelector("#used-radio")
            ),
            fileCount: fileInput.files.length
          });
        });
      });
    })();
  </script>
</body>
</html>
```

### 6.3 首次打开的预期结果

- 七组控件全部显示；
- hidden 不占可见空间，但 Elements 能找到；
- range 当前显示 `3`；
- 日期界面可能本地化，但 `value` 是 `2026-10-10`；
- 文件列表为空；
- 点击“只执行脚本”不会触发 submit 或 reset；
- 点击普通提交按钮，输出 `submit intercepted`，页面不跳转；
- 点击图片按钮，输出包含图片 submitter，并可看到 `.x`/`.y` 坐标字段；
- 点击 reset 后，标题恢复“旧书”、数量恢复 `2`、自提恢复勾选、文件列表清空；
- Console 没有未捕获异常。

`type="image"` 的坐标受点击位置、图片缩放和设备像素映射影响，不要求固定数字，只要求出现对应坐标字段并保持在图像可点击区域内。

### 6.4 每组一个可观察微案例

#### 文本与字符串

1. 把标题“旧书”改为“台灯”；
2. 点击“读取全部状态”；
3. 找到 `text-input`：

```text
value: "台灯"
defaultValue: "旧书"
```

4. 点击“选中标题前两个字符”；
5. 预期 `selectionStart = 0`、`selectionEnd = 2`；
6. 把同样调用临时改到 email 控件，记录 `InvalidStateError` 或不支持结果，再恢复。

#### 数值与范围

1. 清空数量；
2. 读取状态；
3. 预期 `value = ""`、`valueAsNumber = "NaN"`；
4. 输入 `4`，点击“数量增加一步”；
5. 预期当前值变为 `5`；
6. 拖动成色，预期旁边输出同步变化。

#### 日期与时间

1. 读取日期、时间、月份和周的机器值；
2. 点击“日期减少一天”；
3. 预期日期从 `2026-10-10` 变为 `2026-10-09`；
4. 点击“尝试打开日期选择器”；
5. 支持时出现原生 UI；不支持或受限时，页面显示异常名并聚焦控件；
6. 比较 `date.valueAsDate.toISOString()` 与 `datetime-local.valueAsDate`。

#### 颜色

1. 打开颜色选择器并选择新颜色；
2. 读取状态；
3. 预期 `.value` 是规范化的颜色字符串；
4. 把标签色同时用文字写入证据，证明颜色不是唯一信息。

#### 开关与单选

1. 取消“自提”；
2. 读取状态；
3. 预期 `checked = false`、`defaultChecked = true`、`value = "pickup"`；
4. 选择“全新”；
5. 预期“二手”当前取消，但其 `defaultChecked` 仍为 `true`；
6. reset 后恢复“自提 + 二手”。

#### 文件与隐藏数据

1. 选择一个本地无敏感信息的小图片；
2. 只记录文件名、声明类型和大小；
3. 观察 `.value` 不包含可用的真实完整路径；
4. 在 Console 尝试：

```js
document.querySelector("#file-input").value = "/Users/example/photo.jpg";
```

5. 记录浏览器拒绝非空赋值的异常；
6. 点击“清除文件选择”，预期 `files.length === 0`；
7. 在 Elements 修改 hidden 的值，提交后观察伪造值进入 FormData，证明它不可信。

#### 命令与提交

1. 依次点击 `button`、`submit`、`reset`、`image`；
2. 记录每次页面输出中的 `action`；
3. 证明普通按钮不提交；
4. 证明 submitter 只与当次触发按钮有关；
5. 证明 reset 恢复默认状态；
6. 证明 image 产生坐标字段；
7. 确认整个过程没有 Network 写请求。

### 6.5 渐进扩展：把 API 失败也变成可见结果

复制 `type-gallery.html` 为个人目录中的 `type-gallery-extended.html`，增加以下三个实验。

实验一：不适用的选择 API。

```js
function trySetSelection(input) {
  try {
    input.setSelectionRange(0, 1);
    return { ok: true, type: input.type };
  } catch (error) {
    return {
      ok: false,
      type: input.type,
      error: error.name
    };
  }
}

console.table([
  trySetSelection(document.querySelector("#text-input")),
  trySetSelection(document.querySelector("#number-input")),
  trySetSelection(document.querySelector("#date-input"))
]);
```

实验二：没有用户激活时调用选择器。

```js
const dateInput = document.querySelector("#date-input");

try {
  dateInput.showPicker();
} catch (error) {
  console.log(error.name);
}
```

从 Console 调用常因缺少用户激活而得到 `NotAllowedError`。不要通过循环重试规避限制；恢复为真实按钮点击。

实验三：没有确定步长。

```js
const probe = document.createElement("input");
probe.type = "number";
probe.step = "any";
probe.value = "1.5";

try {
  probe.stepUp();
} catch (error) {
  console.log(error.name);
}
```

预期得到 `InvalidStateError`。修复为明确步长：

```js
probe.step = "0.5";
probe.stepUp();
console.log(probe.value); // "2"
```

### 6.6 文件、打开、预期与失败证据

| 项目 | 证据 |
| --- | --- |
| 文件 | `practice/html-05-input-types/type-gallery.html` |
| 打开 | 本地 HTTP 地址或直接打开 |
| 基线 | 22 种类型、七组、无未捕获异常 |
| 当前/默认值 | 修改标题后 `value` 与 `defaultValue` 不同 |
| 勾选状态 | 取消自提后 `checked=false`、`defaultChecked=true` |
| 数值空值 | `value=""`、`valueAsNumber` 显示 `NaN` |
| 日期格式 | 可见 UI 可本地化，`.value` 保持机器格式 |
| 文件边界 | 非空脚本赋值失败，清空成功，不上传 |
| hidden 边界 | Elements 修改后进入本地 FormData |
| 按钮行为 | button 不提交；submit/image 提交；reset 恢复 |
| 未知类型 | 原属性保留，`.type === "text"` |
| 选择器 | 成功打开，或记录异常并聚焦降级 |
| 失败证据 | 异常名、错误消息、错误状态前后的输出 |
| 恢复 | reset 后重做基线快照 |

## 7. 邻里集市集成案例

### 7.1 业务契约

邻里集市发布预览需要这些字段：

| 字段 | input 选择 | 业务模型 |
| --- | --- | --- |
| 商品标题 | `text` | 非空字符串 |
| 商品编号 | `text inputmode="numeric"` | 保留前导零的标识符 |
| 单价 | `number step="0.01"` | 在边界精确转换为整数分 |
| 数量 | `number step="1"` | 正安全整数 |
| 成色评分 | `range` | 1–5 整数 |
| 交接时间 | `datetime-local` | 按明确设备时区转换为 UTC ISO |
| 标签色 | `color` | `#rrggbb` 展示值 |
| 交接方式 | 同名 checkbox | 字符串数组 |
| 商品状态 | 同名 radio | 单个枚举字符串 |
| 本地图片 | `file` | 只预览元数据，不读取、不上传 |
| 草稿版本 | `hidden` | 不可信客户端提示 |
| 操作 | button/submit/reset | 本地预览、提交意图、恢复默认 |

关键边界：

- 价格核心模型只保存 `priceCents`，不保存浮点元；
- 商品编号 `001204` 不转 Number；
- `datetime-local` 按“当前设备时区”解释，并同时记录 IANA 时区名和 UTC 偏移；
- 夏令时不存在时间会被组件一致性检查拒绝；
- 夏令时重复时间仍有歧义，生产系统应让用户确认偏移或由服务端按业务时区解析；
- `createdAt` 只是浏览器生成的教学预览值，真实系统应由服务端生成；
- hidden 版本可被修改，服务端不能据此跳过并发或权限检查；
- 图片只显示元数据，不上传；
- 本地预览不是发布成功，刷新后不会保留数据。

### 7.2 文件与运行

文件位置：

```text
practice/html-05-input-types/market-listing.html
```

运行：

```bash
cd practice/html-05-input-types
python3 -m http.server 8000
```

打开：

```text
http://127.0.0.1:8000/market-listing.html
```

### 7.3 完整代码

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="邻里集市商品发布本地预览练习。">
  <title>商品发布预览 · 邻里集市</title>
  <style>
    :root {
      font-family: system-ui, sans-serif;
      line-height: 1.6;
      color: #172033;
      background: #f8fafc;
    }

    body {
      max-width: 66rem;
      margin: 0 auto;
      padding: 1rem;
    }

    form,
    .preview {
      padding: 1rem;
      background: #ffffff;
      border: 1px solid #94a3b8;
      border-radius: 0.6rem;
    }

    fieldset {
      margin-block: 1rem;
      border: 1px solid #cbd5e1;
    }

    legend {
      font-weight: 700;
    }

    .control {
      display: grid;
      gap: 0.3rem;
      margin-block: 1rem;
    }

    input:not([type="checkbox"]):not([type="radio"]),
    button {
      min-height: 2.75rem;
      padding-inline: 0.65rem;
      font: inherit;
    }

    input:focus-visible,
    button:focus-visible {
      outline: 3px solid #0f766e;
      outline-offset: 0.15rem;
    }

    .options,
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
    }

    .boundary {
      padding: 0.75rem 1rem;
      border-inline-start: 0.3rem solid #c2410c;
      background: #fff7ed;
    }

    .error {
      min-height: 1.5em;
      color: #b91c1c;
      font-weight: 700;
    }

    .preview {
      margin-block-start: 1rem;
    }

    pre {
      overflow: auto;
      padding: 1rem;
      color: #e2e8f0;
      background: #0f172a;
      border-radius: 0.5rem;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <main>
    <h1>邻里集市商品发布预览</h1>

    <p class="boundary">
      这是当前页面内存中的教学预览。不会上传文件、发送网络请求或保存数据，
      也不包含认证、授权、支付和并发控制。
    </p>

    <form id="listing-form" action="/not-used" method="post">
      <div class="control">
        <label for="title">商品标题</label>
        <input id="title"
               type="text"
               name="title"
               value="可调光阅读台灯"
               autocomplete="off"
               required>
      </div>

      <div class="control">
        <label for="listing-code">
          商品编号（标识符，保留前导零）
        </label>
        <input id="listing-code"
               type="text"
               name="listingCode"
               inputmode="numeric"
               value="001204"
               required>
      </div>

      <div class="control">
        <label for="price-yuan">单价（人民币元，最多两位小数）</label>
        <input id="price-yuan"
               type="number"
               name="priceYuan"
               min="0"
               max="999999.99"
               step="0.01"
               value="39.00"
               required>
      </div>

      <div class="control">
        <label for="quantity">数量</label>
        <input id="quantity"
               type="number"
               name="quantity"
               min="1"
               max="99"
               step="1"
               value="1"
               required>
      </div>

      <div class="control">
        <label for="condition-score">
          成色评分：
          <output id="condition-output" for="condition-score">4</output>
        </label>
        <input id="condition-score"
               type="range"
               name="conditionScore"
               min="1"
               max="5"
               step="1"
               value="4">
      </div>

      <div class="control">
        <label for="handoff-local">计划交接时间（按当前设备时区解释）</label>
        <input id="handoff-local"
               type="datetime-local"
               name="handoffLocal"
               step="900"
               value="2026-10-10T09:30"
               required>
      </div>

      <div class="control">
        <label for="label-color">标签色</label>
        <input id="label-color"
               type="color"
               name="labelColor"
               value="#0f766e">
      </div>

      <fieldset>
        <legend>交接方式（可多选）</legend>
        <div class="options">
          <label>
            <input type="checkbox"
                   name="handoff"
                   value="pickup"
                   checked>
            社区自提
          </label>
          <label>
            <input type="checkbox"
                   name="handoff"
                   value="delivery">
            社区配送
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend>商品状态</legend>
        <div class="options">
          <label>
            <input type="radio"
                   name="condition"
                   value="new">
            全新
          </label>
          <label>
            <input type="radio"
                   name="condition"
                   value="used"
                   checked>
            二手
          </label>
        </div>
      </fieldset>

      <div class="control">
        <label for="photos">
          本地图片（只显示元数据，不读取、不上传）
        </label>
        <input id="photos"
               type="file"
               name="photos"
               accept="image/png,image/jpeg"
               multiple>
      </div>

      <input id="listing-version"
             type="hidden"
             name="listingVersion"
             value="draft-v1">

      <p id="form-error" class="error" role="alert"></p>

      <div class="actions">
        <input id="script-preview"
               type="button"
               value="脚本生成预览">
        <input type="submit"
               name="intent"
               value="preview">
        <input type="reset"
               value="恢复默认值">
      </div>
    </form>

    <section class="preview" aria-labelledby="preview-heading">
      <h2 id="preview-heading">本地预览结果</h2>
      <p id="preview-status" role="status">尚未生成。</p>
      <pre id="preview-json" tabindex="0">{}</pre>
    </section>
  </main>

  <script>
    "use strict";

    (() => {
      const form = document.querySelector("#listing-form");
      const titleInput = document.querySelector("#title");
      const listingCodeInput = document.querySelector("#listing-code");
      const priceInput = document.querySelector("#price-yuan");
      const quantityInput = document.querySelector("#quantity");
      const conditionInput = document.querySelector("#condition-score");
      const conditionOutput = document.querySelector("#condition-output");
      const handoffInput = document.querySelector("#handoff-local");
      const colorInput = document.querySelector("#label-color");
      const photosInput = document.querySelector("#photos");
      const versionInput = document.querySelector("#listing-version");
      const errorOutput = document.querySelector("#form-error");
      const previewStatus = document.querySelector("#preview-status");
      const previewJson = document.querySelector("#preview-json");

      function parseYuanToCents(value) {
        const match = /^(0|[1-9]\d{0,5})(?:\.(\d{1,2}))?$/.exec(value);

        if (!match) {
          throw new RangeError(
            "单价必须是 0 到 999999.99 之间、最多两位小数的十进制金额。"
          );
        }

        const yuan = Number(match[1]);
        const fraction = (match[2] ?? "").padEnd(2, "0");
        const cents = yuan * 100 + Number(fraction);

        if (!Number.isSafeInteger(cents)) {
          throw new RangeError("单价分值超出安全整数范围。");
        }

        return cents;
      }

      function localDateTimeToUtc(value) {
        const match =
          /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/
            .exec(value);

        if (!match) {
          throw new RangeError("交接时间不是有效的 datetime-local 机器格式。");
        }

        const [
          ,
          yearText,
          monthText,
          dayText,
          hourText,
          minuteText,
          secondText = "0",
          millisecondText = "0"
        ] = match;

        const parts = {
          year: Number(yearText),
          month: Number(monthText),
          day: Number(dayText),
          hour: Number(hourText),
          minute: Number(minuteText),
          second: Number(secondText),
          millisecond: Number(millisecondText.padEnd(3, "0"))
        };

        const localDate = new Date(
          parts.year,
          parts.month - 1,
          parts.day,
          parts.hour,
          parts.minute,
          parts.second,
          parts.millisecond
        );

        const sameWallClock =
          localDate.getFullYear() === parts.year &&
          localDate.getMonth() === parts.month - 1 &&
          localDate.getDate() === parts.day &&
          localDate.getHours() === parts.hour &&
          localDate.getMinutes() === parts.minute &&
          localDate.getSeconds() === parts.second &&
          localDate.getMilliseconds() === parts.millisecond;

        if (!sameWallClock) {
          throw new RangeError(
            "该设备时区中不存在这个本地时刻，可能处于夏令时跳变区间。"
          );
        }

        return {
          utcIso: localDate.toISOString(),
          interpretedTimeZone:
            Intl.DateTimeFormat().resolvedOptions().timeZone ||
            "(浏览器未提供 IANA 时区名)",
          offsetMinutesAtHandoff: -localDate.getTimezoneOffset(),
          ambiguity:
            "重复的夏令时回拨时刻仍需服务端或时区库让用户确认偏移。"
        };
      }

      function readSelectedRadio(name) {
        return form.elements.namedItem(name)?.value ?? "";
      }

      function readCheckedValues(name) {
        return Array.from(
          form.querySelectorAll(`input[name="${name}"]:checked`),
          (input) => input.value
        );
      }

      function describeFiles(fileList) {
        return Array.from(fileList, (file) => ({
          name: file.name,
          declaredType: file.type || "(空 MIME)",
          sizeBytes: file.size,
          lastModified: file.lastModified
        }));
      }

      function buildPreview(intent) {
        errorOutput.textContent = "";

        if (!form.reportValidity()) {
          throw new RangeError("请先修正浏览器标出的无效字段。");
        }

        const priceCents = parseYuanToCents(priceInput.value);
        const quantity = quantityInput.valueAsNumber;

        if (!Number.isSafeInteger(quantity) || quantity < 1) {
          throw new RangeError("数量必须是大于等于 1 的安全整数。");
        }

        const conditionScore = conditionInput.valueAsNumber;
        const handoff = localDateTimeToUtc(handoffInput.value);
        const handoffMethods = readCheckedValues("handoff");
        const condition = readSelectedRadio("condition");

        if (handoffMethods.length === 0) {
          throw new RangeError("至少选择一种交接方式。");
        }

        if (!condition) {
          throw new RangeError("请选择商品状态。");
        }

        const preview = {
          intent,
          title: titleInput.value.trim(),
          listingCode: listingCodeInput.value,
          priceCents,
          quantity,
          totalCents: priceCents * quantity,
          conditionScore,
          handoffLocal: handoffInput.value,
          handoffAtUtc: handoff.utcIso,
          handoffTimeZone: handoff.interpretedTimeZone,
          handoffOffsetMinutes: handoff.offsetMinutesAtHandoff,
          handoffAmbiguityNote: handoff.ambiguity,
          labelColor: colorInput.value,
          handoffMethods,
          condition,
          clientVersionHint: versionInput.value,
          files: describeFiles(photosInput.files),
          createdAtPreviewUtc: new Date().toISOString(),
          persisted: false,
          uploaded: false,
          authenticated: false
        };

        if (!Number.isSafeInteger(preview.totalCents)) {
          throw new RangeError("总价分值超出安全整数范围。");
        }

        return preview;
      }

      function renderPreview(intent) {
        try {
          const preview = buildPreview(intent);
          previewJson.textContent = JSON.stringify(preview, null, 2);
          previewStatus.textContent =
            "已生成本地内存预览；未保存、未上传、未发布。";
        } catch (error) {
          errorOutput.textContent = error.message;
          previewStatus.textContent = "预览失败，请按错误信息恢复。";
          previewJson.textContent = JSON.stringify({
            error: error.name,
            message: error.message
          }, null, 2);
        }
      }

      conditionInput.addEventListener("input", () => {
        conditionOutput.value = conditionInput.value;
      });

      document
        .querySelector("#script-preview")
        .addEventListener("click", () => {
          renderPreview("script-button");
        });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        renderPreview(event.submitter?.value ?? "unknown-submit");
      });

      form.addEventListener("reset", () => {
        queueMicrotask(() => {
          conditionOutput.value = conditionInput.value;
          errorOutput.textContent = "";
          previewStatus.textContent =
            "表单已恢复默认值；旧预览已清除，未发生网络请求。";
          previewJson.textContent = "{}";
        });
      });
    })();
  </script>
</body>
</html>
```

### 7.4 逐步观察

#### 基线预览

点击“脚本生成预览”，预期：

```text
listingCode: "001204"
priceCents: 3900
quantity: 1
totalCents: 3900
handoffLocal: "2026-10-10T09:30"
handoffAtUtc: 以 Z 结尾的 ISO 字符串
persisted: false
uploaded: false
authenticated: false
```

`handoffAtUtc` 的具体小时取决于运行设备在该日期的时区偏移。证据必须连同：

```text
handoffTimeZone
handoffOffsetMinutes
```

一起记录，不能只抄一个 `Z` 字符串。

#### 整数分边界

依次输入：

| 输入 | 结果 |
| --- | --- |
| `39` | `3900` 分 |
| `39.5` | `3950` 分 |
| `39.50` | `3950` 分 |
| `0.01` | `1` 分 |
| `39.999` | 浏览器步长/脚本边界拒绝 |
| `1e2` | 即使浏览器接受为数值，业务解析器也拒绝指数写法 |

解析器直接处理规范化十进制字符串，避免用 `valueAsNumber * 100` 作为核心转换。后者在复杂小数和计算链中会遇到二进制浮点表示问题。

#### 标识符边界

把 `001204` 暂时改为 number：

```html
<!-- 错误实验，完成后恢复为 text。 -->
<input type="number" value="001204">
```

观察原始字符串、步进 UI 和 `valueAsNumber`。即使某次 `.value` 暂时保留字符，业务一旦读取为 Number 就变成 `1204`，且加减按钮毫无意义。恢复：

```html
<input type="text" inputmode="numeric" value="001204">
```

#### UTC 转换边界

错误做法：

```js
const wrong = `${handoffInput.value}Z`;
```

若输入是设备本地 `09:30`，追加 `Z` 会把它声明成 UTC `09:30`，不是“本地 09:30 对应的 UTC 时刻”。

正确的本课契约：

```text
输入语义：当前设备时区中的墙上时间
解释证据：IANA 时区名 + 当时 UTC 偏移
存储预览：Date.toISOString() 产生的 UTC ISO 字符串
生产边界：服务端按明确业务时区重算并处理夏令时歧义
```

若业务要求所有交接都发生在固定社区时区，设备在外地的用户也必须按社区时区填写，此时本课函数不够用。必须显式传递业务时区并由服务端或可靠时区库解析。

#### 文件与 hidden 边界

- 选择图片后，预览只出现文件名、声明 MIME、字节数和修改时间；
- `uploaded` 仍为 `false`；
- 在 Elements 中把 `draft-v1` 改为 `admin-approved`；
- 再生成预览，`clientVersionHint` 会被伪造；
- 这证明服务端不能相信 hidden 中的权限或审核状态。

### 7.5 可观察成功结果

一次通过的记录应包含：

```text
文件：
打开 URL：
输入价格字符串：
priceCents：
quantity：
totalCents：
商品编号及前导零：
handoffLocal：
handoffTimeZone：
handoffOffsetMinutes：
handoffAtUtc：
文件数量与元数据：
hidden 修改实验：
persisted=false：
uploaded=false：
authenticated=false：
Console 未捕获异常：
```

### 7.6 失败证据与恢复

| 故障 | 失败证据 | 根因 | 恢复 |
| --- | --- | --- | --- |
| 金额 `39.999` | `stepMismatch` 或脚本 `RangeError` | 超过两位小数/步长 | 改为 `39.99` |
| 金额 `1e2` | 业务解析器拒绝 | 业务契约只允许普通十进制 | 改为 `100.00` |
| 数量 `1.5` | `stepMismatch` 或“安全整数”错误 | 数量必须是整数 | 改为 `1` 或 `2` |
| 无交接方式 | 页面显示至少选一种 | unchecked checkbox 不产生值 | 勾选一个选项 |
| hidden 被改 | 预览出现伪造字符串 | hidden 不可信 | 客户端只作提示；服务端重新取可信状态 |
| 文件类型不符 | 选择器可能提示，但仍可能被选入 | `accept` 不是安全验证 | 清除文件；服务端未来重新验证 |
| 本地时间不存在 | `RangeError` 提及夏令时跳变 | Date 规范化后墙钟字段不一致 | 选择存在的时间 |
| 把本地值加 `Z` | UTC 与实际本地时刻偏移 | 错把无时区值声明为 UTC | 先按明确时区解析，再 `toISOString()` |
| reset 后预览还显示旧数据 | 表单已恢复但预览未同步 | reset 只负责控件 | 在重置完成后的微任务清空预览 |

## 8. 常见错误与排查路径

### 8.1 错误案例：所有字段都用 `text`

```html
<!-- 错误案例 -->
<input type="text" name="email">
<input type="text" name="availableDate">
<input type="text" name="quantity">
```

问题：

- 浏览器不知道邮箱、日期和数量语义；
- 移动键盘和选择器提示丢失；
- `valueAsNumber`、步进与日期机器格式不可用；
- 开发者只能重复实现基础解析；
- 服务端仍然要验证，客户端却失去原生帮助。

恢复：

```html
<input type="email" name="email">
<input type="date" name="availableDate">
<input type="number" name="quantity" min="1" step="1">
```

### 8.2 错误案例：标识符使用 `number`

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

### 8.3 错误案例：用 `value` 判断 checkbox

```js
// 错误案例：无论当前是否勾选，value 都可能是 "pickup"。
if (pickup.value) {
  console.log("已选择自提");
}
```

恢复：

```js
if (pickup.checked) {
  console.log("已选择自提");
}
```

提交值与选择状态是两个维度。

### 8.4 错误案例：把 `checked="false"` 当成未选

```html
<!-- 错误案例：布尔属性只看是否存在。 -->
<input type="checkbox" checked="false">
```

它仍是默认选中。恢复为删除属性：

```html
<input type="checkbox">
```

或脚本改变当前状态：

```js
input.checked = false;
```

若还要改变重置基线：

```js
input.defaultChecked = false;
```

### 8.5 错误案例：用 `=== NaN`

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

### 8.6 错误案例：`valueAsDate` 使用本地 getter

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

### 8.7 错误案例：给 `datetime-local` 追加 `Z`

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

### 8.8 错误案例：金额直接用浮点元累计

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

### 8.9 错误案例：脚本设置文件路径

```js
// 错误案例：浏览器应拒绝设置非空本地路径。
fileInput.value = "/Users/example/private.jpg";
```

恢复：

```js
fileInput.value = "";
```

需要文件时让用户主动选择。不要通过模拟点击、循环弹窗或浏览器私有能力规避授权。

### 8.10 错误案例：相信 `accept`

```html
<!-- 错误认知：这不是服务端安全验证。 -->
<input type="file" accept="image/png">
```

排查：

1. 观察选择器是否能切换“所有文件”；
2. 查看 `file.name`、`file.type`；
3. 说明元数据可为空或错误；
4. 不上传真实文件；
5. 写出服务端未来必须完成的真实格式、大小、恶意内容与权限检查。

### 8.11 错误案例：信任 hidden 价格

```html
<!-- 错误案例 -->
<input type="hidden" name="finalPriceCents" value="3900">
```

用户可以改成 `1`。恢复原则：

- 客户端可提交商品 ID、优惠码等输入；
- 服务端根据数据库、库存、活动和身份重新计算最终价格；
- 客户端 hidden 只能是提示，不能是价格真相。

### 8.12 错误案例：辅助按钮触发错误默认行为

本课使用 `<input type="button">`，类型明确。若改用 `<button>` 却省略 `type`：

```html
<!-- 错误案例：在 form 内通常默认是 submit。 -->
<button>显示帮助</button>
```

恢复：

```html
<button type="button">显示帮助</button>
```

对 `input` 也应显式写 `type`，不要依赖缺省 Text 状态表达按钮意图。

### 8.13 错误案例：reset 后立即读取旧状态

```js
// 错误案例：reset 事件处理期间默认重置可能尚未完成。
form.addEventListener("reset", () => {
  console.log(title.value);
});
```

恢复：

```js
form.addEventListener("reset", () => {
  queueMicrotask(() => {
    console.log(title.value);
  });
});
```

若调用 `event.preventDefault()`，重置不会发生；这可以用于确认操作，但必须向用户清楚解释。

### 8.14 错误案例：不做检测直接 `showPicker()`

```js
// 错误案例
dateInput.showPicker();
```

恢复：

```js
if (typeof dateInput.showPicker === "function") {
  try {
    dateInput.showPicker();
  } catch (error) {
    console.log(error.name);
    dateInput.focus();
  }
} else {
  dateInput.focus();
}
```

仍要从用户点击事件中调用。

### 8.15 错误案例：把颜色输入当成任意 CSS 颜色字符串

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

### 8.16 故障恢复记录模板

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

### 9.2 当前值与默认值

题目：HTML 是 `value="旧书"`，用户输入“台灯”，此时 `.value` 和 `.defaultValue` 分别是什么？reset 后呢？

<details>
<summary>参考答案</summary>

编辑后 `.value` 是“台灯”，`.defaultValue` 仍是“旧书”。若默认值未被脚本修改，reset 后 `.value` 恢复“旧书”，`.defaultValue` 仍是“旧书”。

</details>

### 9.3 checkbox 的三个状态

题目：`value="pickup" checked` 的 checkbox 被用户取消后，三个属性是什么？

<details>
<summary>参考答案</summary>

`.value` 仍是 `"pickup"`；`.checked` 是 `false`；`.defaultChecked` 是 `true`。value 是提交字符串，不是勾选布尔值。

</details>

### 9.4 空 number

题目：为什么不能用 `valueAsNumber === NaN` 判断空 number？

<details>
<summary>参考答案</summary>

JavaScript 中 `NaN` 不等于任何值，包括自身。应使用 `Number.isNaN(input.valueAsNumber)`；还可先检查 `input.value === ""`，区分未填写与其他失败。

</details>

### 9.5 日期界面与机器值

题目：中文浏览器把日期显示成 `2026/10/10`，服务端字段应该直接接收这段可见文字吗？

<details>
<summary>参考答案</summary>

不应从可见 UI 抄字符串。读取 `.value` 会得到稳定机器格式 `2026-10-10`。界面显示可根据地区变化，机器值用于数据交换；服务端仍要重新验证日期和业务范围。

</details>

### 9.6 `datetime-local` 与 UTC

题目：为什么 `2026-10-10T09:30` 后面不能直接加 `Z`？

<details>
<summary>参考答案</summary>

原字符串没有时区，只是本地墙钟读数。`Z` 声明它已经是 UTC 09:30，并没有执行时区换算。必须先明确设备或业务时区，解析为时间线上的真实瞬间，再用 `toISOString()` 输出 UTC；夏令时不存在和重复时间还需处理。

</details>

### 9.7 `valueAsDate`

题目：为什么读取 date 的年月日时建议使用 UTC getter 或直接使用 `.value`？

<details>
<summary>参考答案</summary>

date 的 `valueAsDate` 以 UTC 午夜表示。若在 UTC 负偏移地区调用本地 `getDate()`，可能显示前一天。直接保留机器字符串最清楚；需要 `Date` 运算时用 `getUTCFullYear()`、`getUTCMonth()`、`getUTCDate()`。

</details>

### 9.8 file 的 `accept`

题目：`accept="image/png"` 是否证明选择的文件一定是安全 PNG？

<details>
<summary>参考答案</summary>

不能。accept 是选择提示，用户环境可能仍能选择其他文件，文件名和声明 MIME 也可能错误或伪造。客户端可做体验检查，服务端必须重新检查大小、真实格式、恶意内容、权限和存储策略。

</details>

### 9.9 hidden 的信任边界

题目：能否用 `<input type="hidden" name="isAdmin" value="true">` 授权管理员操作？

<details>
<summary>参考答案</summary>

不能。hidden 可以被 Elements、Console、扩展或自构请求修改。服务端必须根据已认证身份和权限数据判断，不能相信客户端提供的管理员标记。本课也没有实现认证或授权。

</details>

### 9.10 reset 的范围

题目：reset 能否把 JavaScript 数组恢复到初始值？

<details>
<summary>参考答案</summary>

不能自动恢复。reset 算法主要恢复表单控件的默认状态。应用数组、预览 DOM、请求缓存和服务端数据需要自己的明确状态管理。监听 reset 时还应等待默认动作完成后再同步界面。

</details>

### 9.11 image submitter

题目：`type="image" name="map"` 与普通 submit 的表单数据有什么显著差异？

<details>
<summary>参考答案</summary>

image 会提交点击坐标，通常是 `map.x` 和 `map.y`；普通 submit 通常提交自己的 name/value。image 还依赖图片资源和准确 alt，适合坐标有业务意义的图像任务，不适合普通保存按钮。

</details>

### 9.12 未知类型

题目：`type="neighbor-code"` 时，为什么 `getAttribute("type")` 与 `.type` 结果不同？

<details>
<summary>参考答案</summary>

前者读取原始内容属性，所以仍是 `"neighbor-code"`；后者反映浏览器实际采用的 input 状态，未知值回退为 `"text"`。这可以证明原始源代码与规范化 DOM 属性承担不同职责。

</details>

## 10. 实践练习

所有练习都只在个人目录 `practice/html-05-input-types/` 完成。故障注入必须先复制可工作版本，保留失败证据后恢复。

### 10.1 基础级：七组值状态观察表

创建：

```text
practice/html-05-input-types/exercise-basic.html
```

要求：

1. 七组中每组至少选择一个代表类型；
2. 文本输入有 `value` 默认值；
3. number 可清空并显示 `NaN`；
4. date 同时显示 `.value`、`.valueAsNumber`、`.valueAsDate`；
5. checkbox 同时显示 value/checked/defaultChecked；
6. file 只显示元数据，并能清空；
7. submit 被拦截，reset 后重新读取状态；
8. 未知类型证明回退到 text；
9. 输出全部使用 `textContent`；
10. 页面明确“不上传、不保存”。

#### 基础级参考答案骨架

```js
"use strict";

(() => {
  const form = document.querySelector("form");
  const output = document.querySelector("pre");

  function snapshot(input) {
    return {
      type: input.type,
      value: input.type === "password" ? "(不记录)" : input.value,
      defaultValue:
        input.type === "password" ? "(不记录)" : input.defaultValue,
      checked:
        input.type === "checkbox" || input.type === "radio"
          ? input.checked
          : null,
      defaultChecked:
        input.type === "checkbox" || input.type === "radio"
          ? input.defaultChecked
          : null,
      valueAsNumber: Number.isNaN(input.valueAsNumber)
        ? "NaN"
        : input.valueAsNumber,
      valueAsDate:
        input.valueAsDate?.toISOString() ?? null,
      fileCount:
        input.type === "file" ? input.files.length : null
    };
  }

  function render() {
    output.textContent = JSON.stringify(
      Array.from(
        form.querySelectorAll("input"),
        snapshot
      ),
      null,
      2
    );
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });

  form.addEventListener("reset", () => {
    queueMicrotask(render);
  });
})();
```

#### 基础级完成标准

- 能从输出解释当前值与默认值；
- 空 number 没有被当成 0；
- date 的 UTC 表示没有被误叫做用户本地午夜；
- checkbox 的 value 没有被误叫做布尔值；
- 文件没有被读取或上传；
- reset 后输出与默认状态一致；
- Console 无未捕获异常。

### 10.2 进阶级：数值与标识符决策器

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

### 10.3 故障注入级：破坏四个状态边界

复制集成案例：

```text
practice/html-05-input-types/exercise-fault.html
```

依次注入四个故障。

#### 故障一：金额空值变 0

错误代码：

```js
const priceCents = Number(priceInput.value) * 100;
```

证据：

```js
console.log(Number(""));
console.log(priceInput.value);
console.log(priceInput.valueAsNumber);
```

修复：先区分空字符串，再用 `parseYuanToCents()`。

#### 故障二：交接时间直接加 `Z`

错误代码：

```js
const handoffAtUtc = `${handoffInput.value}Z`;
```

证据：与正确 `localDateTimeToUtc()` 结果比较，并记录设备时区。

修复：恢复明确的设备时区解释和一致性检查。

#### 故障三：hidden 冒充审核结果

错误代码：

```js
if (versionInput.value === "admin-approved") {
  previewStatus.textContent = "管理员已批准发布";
}
```

在 Elements 修改值即可伪造。

修复：

```js
previewStatus.textContent =
  "客户端仅生成预览；审核与权限必须由服务端判定。";
```

#### 故障四：reset 后保留旧预览

删除 reset 监听器中的预览清理，修改表单并生成预览，再 reset。失败证据是控件恢复默认值，但 JSON 仍显示旧编辑值。

修复：在 reset 后用 `queueMicrotask()` 同步输出。

#### 故障注入参考验收

```text
四个故障都有修复前证据
没有删除校验或放宽断言
空价格不能预览
0.00 可明确解析为 0 分
UTC 结果附带时区和偏移
hidden 伪造不会产生权限结论
reset 后控件和预览一致
文件仍未读取或上传
页面仍未发送网络请求
```

## 11. 阶段验收

### 11.1 类型覆盖

- [ ] 能不看正文列出全部 22 种现行类型。
- [ ] 能按七个任务组解释，而不是只背一张表。
- [ ] 每组至少完成一个可观察微案例。
- [ ] 完整类型实验室中 22 种类型都有真实控件。
- [ ] 未知 `type` 的原始属性和解析后 `.type` 都有记录。
- [ ] 没有把“未知类型回退”误说成完整新功能支持。

### 11.2 值状态

- [ ] 能解释内容属性、defaultValue 和 value。
- [ ] 能解释 checked、defaultChecked 和 value。
- [ ] 能预测 reset 后文本、checkbox、radio 和 file 的状态。
- [ ] reset 后的观察发生在默认动作完成之后。
- [ ] 没有把应用数组或预览状态误认为会自动重置。
- [ ] 空 number 用 `Number.isNaN()` 识别。
- [ ] 标识符没有转换为 Number。

### 11.3 日期、时间与金额

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

### 11.4 专属 API 与渐进增强

- [ ] 文本选择 API 只用于支持的类型。
- [ ] `stepUp()`/`stepDown()` 有成功和失败证据。
- [ ] `step="any"` 的故障已观察并恢复。
- [ ] `showPicker()` 先做特性检测。
- [ ] `showPicker()` 从真实用户激活调用。
- [ ] 调用失败后仍可聚焦或直接操作原生控件。
- [ ] 没有为了统一外观重写复杂原生选择器。

### 11.5 文件、隐藏字段与按钮

- [ ] 文件输入没有非空默认路径。
- [ ] 只展示文件元数据，没有读取或上传文件。
- [ ] 能解释 `C:\fakepath\...` 不是真实可用路径。
- [ ] 明确 `accept` 只是提示。
- [ ] hidden 值已被手工篡改并留下证据。
- [ ] 不把 hidden 用于秘密、权限或最终价格。
- [ ] button 不提交，submit 触发提交，reset 恢复默认。
- [ ] image 有准确 alt，并观察坐标字段。
- [ ] `event.submitter` 能指出当次提交来源。

### 11.6 项目与安全边界

- [ ] 所有提交都被阻止，没有真实写请求。
- [ ] 页面始终说明“本地预览，未保存”。
- [ ] 没有真实文件上传。
- [ ] 没有真实认证、授权或凭据处理。
- [ ] 没有 Local Storage、数据库或其他持久化。
- [ ] 没有声称客户端通过就等于服务端接受。
- [ ] `createdAtPreviewUtc` 被标为浏览器教学值。
- [ ] 服务端重复验证清单已提交。

### 11.7 提交证据

```text
type-gallery.html 路径与打开方式
market-listing.html 路径与打开方式
22 种类型快照
七组微案例结果
value/defaultValue 对比
checked/defaultChecked 对比
NaN 与 null 结果
日期时间机器格式
selection API 成功/失败
stepUp/stepDown 成功/失败
showPicker 检测和降级
未知类型回退
文件非空赋值失败与清空
hidden 篡改
四类按钮行为
整数分断言
UTC、时区与偏移
四个故障恢复
浏览器与版本
未验证浏览器、设备与辅助技术
```

### 11.8 一票否决项

出现任一项，本课不能通过：

- 只列类型名称，没有可观察案例；
- 商品编号、邮编、电话或验证码错误使用 number；
- 用 checkbox `.value` 判断是否勾选；
- 用 `checked="false"` 表示未选；
- 用 `valueAsNumber === NaN` 判断失败；
- 把 date 的 UTC `Date` 无条件当本地午夜；
- 给 datetime-local 直接追加 `Z`；
- 金额模型使用浮点元累计；
- 通过删除校验或吞异常让错误输入“成功”；
- 脚本尝试设置本地文件非空路径；
- 声称 accept 能保证文件安全；
- hidden 承载权限、身份、秘密或最终价格；
- reset 后控件与预览互相矛盾；
- `showPicker()` 失败后页面无法继续操作；
- 上传真实文件或发送真实发布请求；
- 把本地预览描述成已发布、已认证或已持久化。

## 12. 常见问题

### Q1：为什么 `.value` 总是字符串？

表单控件首先面向用户输入和表单编码，`.value` 提供字符串机器值。数值类型额外提供 `.valueAsNumber`，部分日期时间类型提供 `.valueAsDate`。业务代码仍要处理空值、范围、整数要求和服务端验证。

### Q2：`input type="number"` 能阻止输入所有非数字字符吗？

不能把键盘表现当契约。不同浏览器可能允许暂时输入符号、小数点或指数形式，以便用户完成一个数值。最终应读取 `.value`、`.valueAsNumber` 和 `validity`，再执行业务验证。

### Q3：价格究竟应该用 number 还是 text？

两者都可能成立。number 提供步进、数值键盘提示和原生范围约束，但允许形式和本地输入体验需实测；text 可以实施严格十进制字符串契约并配 `inputmode="decimal"`。无论界面类型，进入业务模型前都应精确转换为整数最小货币单位。本课用 number 展示原生能力，再用字符串解析守住整数分边界。

### Q4：`inputmode="numeric"` 会自动验证数字吗？

不会。它主要提示虚拟键盘布局，不改变 input 类型，不阻止粘贴其他字符，也不替代客户端或服务端验证。

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

### Q10：range 当前值为什么必须另行显示？

滑块位置通常不能让用户准确知道机器值，低视力、键盘和精确任务尤其需要可见反馈。用 `output` 或文字同步当前值，并测试键盘方向键。

### Q11：date 的 `.valueAsNumber` 是本地午夜毫秒吗？

不是这样理解。date 的数值按规范对应 UTC 午夜基准。若业务只是日历日期，优先保留 `YYYY-MM-DD`；不要无意把它变成用户时区中的前一天或后一天。

### Q12：datetime-local 为什么没有时区选择？

它的职责就是采集本地日期与时间，不采集时区。需要全球唯一时刻时，产品必须额外定义时区来源：当前设备、用户配置、地点时区或固定业务时区，并处理夏令时。

### Q13：为什么 month 的 valueAsNumber 不是毫秒？

month 的数值语义是从 1970 年 1 月起经过的月份数。不同月份天数不同，用固定毫秒数表达会失真。使用前必须知道每种类型的单位，不能把所有 `valueAsNumber` 都当 epoch 毫秒。

### Q14：week 的年份为什么可能出乎意料？

ISO 周以周为单位，周一开始；一年的第一周和最后一周可能包含相邻公历年的日期。应使用标准机器值和可靠日期逻辑，不手工按 1 月 1 日计算“第几周”。

### Q15：color 值能否证明文字可读？

不能。单个颜色没有前景/背景组合、字号和字重信息。还要计算对比度，并提供非颜色线索。颜色选择器只是输入颜色值。

### Q16：checkbox 不选时怎样向服务器发送 false？

未选 checkbox 通常不产生该名称。服务端可以把缺失解释为 false，或客户端在构造结构化 JSON 时显式发送布尔值。不要增加同名 hidden 后不理解覆盖/多值规则；必须与接口契约一致。

### Q17：radio 可不可以默认都不选？

可以，但如果业务要求必须选择，应提供清楚组名、原生 required 约束和服务端验证。若有安全、常用且不误导的默认项，也可以设置一个 defaultChecked。

### Q18：file 的 `.value` 为什么出现 `C:\fakepath\`？

这是防止泄露真实本地目录的兼容表现。应用应读取 `files` 中用户授权的 File 对象，不解析 `.value` 获取路径。

### Q19：能否把 File 保存到 localStorage？

本课不这样做。File 对象、二进制内容、容量、隐私、生命周期和权限需要独立设计。这里不做上传或持久化。

### Q20：hidden 和 CSS `display:none` 的 text 输入一样吗？

都不可见，但 input 类型状态不同。hidden 不参与普通交互和约束验证，语义上就是隐藏数据；用 CSS 隐藏普通必填控件可能制造无法操作的验证失败。两者都不可信。

### Q21：为什么 reset 按钮经常不推荐？

它容易与提交相邻并误触，一次丢弃大量编辑，而且恢复的是默认值，不一定符合用户理解的“清空”。筛选器可使用命名明确的“清空筛选”，长表单更适合撤销或确认。

### Q22：`form.reset()` 和点击 reset 一样吗？

它们都触发表单重置流程并恢复控件默认状态。注意若表单中有控件使用 `name="reset"`，可能遮蔽 `form.reset` 方法；命名时不要占用表单方法名。

### Q23：图片按钮一定要提交坐标吗？

`type="image"` 的核心特性就是图像提交和坐标数据。如果坐标无业务意义，使用普通 submit 更清楚、更稳定，也更容易提供一致标签。

### Q24：`showPicker()` 存在就一定能打开吗？

不一定。还受当前类型、用户激活、控件状态、跨源上下文和平台 UI 影响。必须在点击处理器中调用、捕获具体异常，并保留直接操作控件的降级。

### Q25：可以对所有 input 都调用 `select()` 吗？

不要假设所有类型都有相同文本选择模型。`selectionStart`/`setSelectionRange()` 只用于明确支持的文本类状态。日期、number、email 等控件应按各自 API 和浏览器 UI 操作。

### Q26：修改 `.defaultValue` 会立刻覆盖用户输入吗？

若当前值尚未被单独修改，它可能随默认值同步；一旦当前值变脏，修改默认值主要改变之后的重置基线，不应依赖它覆盖用户正在编辑的值。要更新当前值，明确赋 `.value`。

### Q27：服务端收到 UTC 后就不需要原时区了吗？

取决于业务。若只关心唯一瞬间，UTC 足够用于排序和存储；若需要按用户当地规则重复安排、展示原意或审计夏令时选择，还应保存业务时区标识。不要只保存当时偏移并把它当完整时区规则。

### Q28：本课的 UTC 转换支持所有历史时区吗？

它只按当前浏览器内置时区数据和设备时区解释，并检测被规范化的不存在时间；无法让用户选择重复时间的早晚偏移，也不处理固定业务地点与设备时区不同的情况。生产系统需用明确 IANA 时区和经过验证的服务端/库实现。

## 13. 扩展阅读

资料与兼容性说明核验日期：**2026-10-10**。

- [WHATWG HTML：The input element](https://html.spec.whatwg.org/multipage/input.html#the-input-element)：input 状态、属性、值清理、DOM 接口和提交行为的规范入口。
- [WHATWG HTML：Input type states](https://html.spec.whatwg.org/multipage/input.html#states-of-the-type-attribute)：22 种类型状态及未知类型回退。
- [WHATWG HTML：Common input element APIs](https://html.spec.whatwg.org/multipage/input.html#common-input-element-apis)：`value`、`valueAsDate`、`valueAsNumber`、`stepUp()`、`stepDown()`、选择 API。
- [WHATWG HTML：`showPicker()`](https://html.spec.whatwg.org/multipage/input.html#dom-input-showpicker)：选择器方法、用户激活和异常条件。
- [WHATWG HTML：Resetting a form](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#resetting-a-form)：reset 事件与默认状态恢复。
- [WHATWG HTML：Form submission](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm)：submitter、成功控件和表单数据构造。
- [MDN：`<input>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input)：类型、属性、兼容性与可访问性概览。
- [MDN：`HTMLInputElement.value`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/value)：当前字符串值。
- [MDN：`HTMLInputElement.defaultValue`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/defaultValue)：默认值与内容属性。
- [MDN：`HTMLInputElement.checked`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/checked)：checkbox/radio 当前勾选状态。
- [MDN：`HTMLInputElement.defaultChecked`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/defaultChecked)：默认勾选状态。
- [MDN：`HTMLInputElement.valueAsNumber`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/valueAsNumber)：数值读取与 `NaN`。
- [MDN：`HTMLInputElement.valueAsDate`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/valueAsDate)：支持类型、UTC 语义和 datetime-local 限制。
- [MDN：`HTMLInputElement.stepUp()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/stepUp)：步进算法与异常。
- [MDN：`HTMLInputElement.showPicker()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/showPicker)：特性检测、用户激活与安全限制。
- [MDN：`HTMLInputElement.files`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/files)：FileList 读取。
- [MDN：Date and time formats used in HTML](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Date_and_time_formats)：date、time、datetime-local、month、week 的机器格式。
- [MDN：`FormData(form, submitter)`](https://developer.mozilla.org/en-US/docs/Web/API/FormData/FormData)：把实际 submitter 纳入表单数据。
- [ECMAScript：Date Objects](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-objects)：JavaScript Date 的时间值和本地/UTC 转换基础。
- [W3C WCAG 2.2：Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)：输入控件的可见标签和说明。
- [OWASP：File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)：服务端文件类型、内容、名称、大小、权限与存储边界。

截至核验日期：

- 现代浏览器普遍识别本课列出的类型，但日期、时间、颜色、文件等原生 UI 因浏览器和操作系统而异；
- 未知类型回退为 Text 状态是规范行为；
- `showPicker()` 仍需对方法存在、用户激活、类型和上下文逐项检测；
- `valueAsDate` 不应作为 `datetime-local` 的跨浏览器生产基线；
- 本课未在所有 Safari、Firefox、移动设备、虚拟键盘、区域格式和屏幕阅读器组合中逐项复测，学习者必须记录自己的目标环境。

查阅资料时始终区分：

1. HTML 规范定义的状态、机器值和默认行为；
2. 浏览器/操作系统提供的本地化 UI；
3. JavaScript Date 表示的时间线瞬间；
4. 项目定义的业务时区、金额和标识符契约；
5. 服务端承担的最终验证、权限、文件安全和持久化。

## 我现在能做到什么

我能根据数据含义在 22 种现行 input 类型中做出选择，并解释为什么数量是 number、编号是 text、电话是 tel、本地交接时刻是 datetime-local。我能读取当前值和默认值，区分 checkbox/radio 的提交值与勾选状态，预测 reset 后的结果，并通过未知类型回退、文本选择、步进和选择器 API 的实际证据判断浏览器行为。

我也能把邻里集市价格从十进制输入精确映射为人民币整数分，在明确“当前设备时区”的边界后把本地交接时间转换为 UTC ISO，同时记录时区、偏移和夏令时限制。我不会把 hidden、accept、文件元数据或客户端校验当作可信安全边界，也不会把本地内存预览描述成已上传、已认证、已保存或已发布。

## 单元导航

| 方向 | 教材 |
| --- | --- |
| 上一课 | [01 表单提交与成功控件](01-form-submission-successful-controls.md) |
| 本章入口 | [05 表单、提交与验证](../05-forms-validation.md) |
| 下一课 | [03 表单控件、选择与分组](03-form-controls-groups.md) |
| 模块入口 | [HTML：邻里集市零基础教材](../README.md) |
