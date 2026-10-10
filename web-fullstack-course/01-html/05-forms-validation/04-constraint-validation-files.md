# 约束验证、错误恢复与文件：让失败可解释，让预览可恢复

> 所属章节：表单、提交与验证
> 建议学习时间：6–7 小时
> 阶段成果：完成一张可定位错误、可恢复输入、只生成本地预览的商品发布表单

## 任务卡

邻里集市的发布表单已经有标签、输入框和分组，但“能输入”不等于“输入可用”。空标题、半个邮箱地址、带小数的价格分值、超大图片都可能进入后续流程；即使浏览器全部放行，页面仍不知道当前用户是否登录、是否有发布权限，服务器上的商品版本是否已经变化。

本课要建立一条可以观察和取证的验证链：

```text
HTML 原生约束
  → ValidityState 指出失败类别
  → 页面业务规则补足跨字段和文件规则
  → validationMessage 同时供浏览器提示与可见错误使用
  → 错误汇总和首个无效字段帮助用户恢复
  → 合法数据只生成本地预览
  → 服务端重新验证身份、权限、CSRF、业务规则、文件和并发状态
```

**完成本课后，你将交付：**

- 一份 `required`、长度、`pattern`、范围、步长、`accept` 和 `multiple` 的行为记录；
- 一份覆盖全部相关 `ValidityState` 成员的观察表；
- 一次 `checkValidity()` 与 `reportValidity()` 的差异实验；
- 一份 `setCustomValidity()` 过期错误的复现与恢复记录；
- 一份通过捕获阶段收到 `invalid` 事件的证据；
- 一张带字段错误、错误汇总和首个无效字段恢复的商品发布预览表单；
- 一份文件过滤被绕过后的类型、大小和服务端检查分析；
- 一份客户端验证与认证、授权、CSRF、业务规则、并发控制之间的边界清单。

完整案例不上传文件，不创建商品，不写数据库，也不模拟“发布成功”。它只在当前页面生成一份随刷新消失的预览。

## 1. 任务背景

表单验证至少有三个不同问题：

1. **字段在语法上是否可接受？** 例如必填、邮箱格式、长度、数值范围；
2. **输入在当前业务中是否可接受？** 例如标题去除首尾空白后至少 4 个字符，价格必须是安全整数分，图片最多 3 张；
3. **请求在服务器当前状态下是否可以执行？** 例如用户是否登录并有发布权限，CSRF 令牌是否有效，分类是否仍开放，版本是否冲突。

HTML 约束验证主要解决第一类，并为第二类提供 `setCustomValidity()` 接口。第三类不能由 HTML 证明。

浏览器中的任何数据都可被修改。用户可以：

- 在 DevTools 中删除 `required`、`max` 或 `accept`；
- 直接修改输入控件的值；
- 禁用或替换页面脚本；
- 不使用当前页面，直接构造 HTTP 请求；
- 伪造文件名和客户端声明的 MIME 类型；
- 在表单打开后等待其他人改变服务器状态，再提交旧数据。

所以客户端验证的价值是**尽早反馈、减少可避免错误、帮助用户恢复**，不是建立安全边界。

本课按下面的顺序推进：

```text
声明单字段原生约束
  → 读取 validity 与 validationMessage
  → 比较静默检查和交互报告
  → 加入可清除的自定义错误
  → 捕获 invalid 并生成可见错误
  → 检查本地 File 元数据
  → 只生成本地预览
  → 列出服务器必须重新判定的事项
```

## 2. 学习目标

完成本课后，你应能：

- 解释 `required` 对文本、单选组、复选框和文件控件的不同含义；
- 正确组合 `minlength`、`maxlength`、`pattern`，并说明空值和程序赋值的边界；
- 用 `min`、`max`、`step` 表达数值或日期约束；
- 解释步长基准、`step="any"` 和整数分建模；
- 说明 `accept` 是文件选择提示，`multiple` 只是允许多选；
- 逐项解释 `valueMissing`、`typeMismatch`、`patternMismatch`、`tooLong`、`tooShort`、`rangeUnderflow`、`rangeOverflow`、`stepMismatch`、`badInput`、`customError` 和 `valid`；
- 使用 `willValidate` 判断控件是否参与约束验证；
- 读取本地化的 `validationMessage`，而不依赖固定浏览器文案；
- 区分 `checkValidity()` 与 `reportValidity()`；
- 正确执行“先清空、再重算、再报告”的 `setCustomValidity()` 生命周期；
- 在捕获阶段监听不冒泡的 `invalid` 事件；
- 同时提供字段旁错误、错误汇总和首个无效字段焦点；
- 对 `File` 的数量、名称扩展名、客户端 MIME 类型和大小做本地预检查；
- 解释为什么客户端文件检查仍不能代替服务器嗅探、解码、恶意内容检测和存储隔离；
- 列出服务端在验证、认证、授权、CSRF、业务规则和并发方面的最终职责；
- 生成使用安全整数分和 UTC ISO 8601 时间的本地预览。

## 3. 预备知识

开始前建议完成：

- [表单提交与成功控件](01-form-submission-successful-controls.md)；
- [input 类型与值状态](02-input-types-values.md)；
- [表单控件、选择与分组](03-form-controls-groups.md)。

你需要知道：

- `label[for]` 与控件 `id` 建立可见标签关系；
- `name` 决定字段是否以什么名称进入表单数据；
- `disabled` 控件通常不参与提交；
- `FormData` 可以包含 `File`，但创建 `FormData` 不等于已经上传；
- `input`、`change`、`submit` 是不同事件；
- `event.preventDefault()` 可以阻止本次默认提交导航；
- 业务金额在本课程中使用整数分；
- 存储时间使用带 `Z` 的 UTC ISO 8601，例如 `2026-10-10T08:30:00.000Z`。

本课不要求：

- 真实上传接口；
- 数据库持久化；
- 登录系统或权限系统；
- 病毒扫描、图片转码或对象存储；
- 真实发布、预约、支付或并发写入。

如果相邻前三课尚未生成，可以先从本课完整案例观察行为，再回到章节入口补齐提交模型与控件知识。不要把本课脚本当成可直接上线的上传实现。

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

### 4.8 全部相关 `ValidityState` 成员

| 成员 | 何时为 `true` | 本课可观察例子 | 常见误判 |
| --- | --- | --- | --- |
| `valueMissing` | 支持 `required` 的候选控件没有必需值 | 空标题、未选条款、空文件列表 | 认为空格字符串也算缺失 |
| `typeMismatch` | email 或 URL 的非空值不符合类型语法 | `user@` | 认为文件 MIME 不匹配也属于它 |
| `patternMismatch` | 非空值不符合完整 `pattern` | 商品码 `ab-12` | 忘记空值要由 `required` 处理 |
| `tooLong` | 用户输入超过 `maxlength` | 超长描述 | 浏览器可能先阻止继续键入 |
| `tooShort` | 用户输入短于 `minlength` | 只输入 3 个字符 | 认为脚本赋值与用户输入必然同样报告 |
| `rangeUnderflow` | 可转换值小于 `min` | 价格 99 分 | 把它和步长错误混在一起 |
| `rangeOverflow` | 可转换值大于 `max` | 价格 100000001 分 | 认为客户端上限等于服务端政策 |
| `stepMismatch` | 值不在步长基准加整数倍步长上 | `step="1"` 时输入 100.5 | 把 `step` 当成小数位数 |
| `badInput` | 用户代理不能把界面输入转换为该类型 | 数字框中的未完成或不可解析输入 | 只看 `.value === ""` 就当作没输入 |
| `customError` | 最近一次 `setCustomValidity()` 参数非空 | 图片超过 2 MiB | 修正值后忘记清空旧消息 |
| `valid` | 其他失败成员全部为 `false` | 所有约束通过 | 认为 `willValidate === false` 等于已验证通过 |

`validity.valid` 只表示当前客户端约束状态没有失败，不表示：

- 用户已认证；
- 用户有权发布；
- CSRF 防护通过；
- 商品码在数据库中唯一；
- 文件真实格式安全；
- 服务器仍接受当前价格或分类；
- 数据已经保存。

### 4.9 `validationMessage`、`checkValidity()` 与 `reportValidity()`

`validationMessage` 是当前失败状态对应的消息：

```js
const control = document.querySelector("#contact-email");
console.log(control.validationMessage);
```

如果控件有效或不参与验证，通常是空字符串。原生消息由浏览器本地化，具体标点和措辞不能写进自动化断言。调用 `setCustomValidity("价格必须是整数分。")` 后，自定义消息会成为 `validationMessage`。

两种检查 API：

| API | 返回值 | `invalid` 事件 | 浏览器交互提示 |
| --- | ---: | --- | --- |
| `element.checkValidity()` | 当前元素是否有效 | 无效时触发 | 不主动展示气泡 |
| `form.checkValidity()` | 所有候选控件是否有效 | 对无效控件触发 | 不主动展示气泡 |
| `element.reportValidity()` | 当前元素是否有效 | 无效时触发 | 尝试展示并聚焦 |
| `form.reportValidity()` | 所有候选控件是否有效 | 对无效控件触发 | 尝试展示并聚焦 |

浏览器提示的布局、语言和持续时间由实现决定，不能作为唯一错误界面。稳健页面应同时提供：

- 与字段相邻的可见错误；
- 页面级错误汇总；
- 与控件关联的说明；
- 首个无效字段焦点恢复；
- 修正后消失的过期错误。

### 4.10 `setCustomValidity()` 的生命周期

`setCustomValidity(message)` 不只是“显示一行字”。只要 `message` 非空，`customError` 就一直为 `true`：

```js
title.setCustomValidity("标题去除空白后至少需要 4 个字符。");
console.log(title.validity.customError); // true
```

即使用户已经修正 `.value`，旧消息也不会自动消失。正确生命周期是：

```text
每次验证开始
  → 对本页面管理的控件 setCustomValidity("")
  → 根据当前值重新计算业务规则
  → 需要时设置新的非空消息
  → 读取 validity / validationMessage
  → 渲染错误
```

不要在规则通过时什么都不做。必须显式传入空字符串：

```js
title.setCustomValidity("");
```

也不要在原生 `typeMismatch` 已经能解释邮箱错误时覆盖成模糊的“输入有误”。自定义规则应补足原生约束没有表达的业务条件。

### 4.11 `invalid` 不冒泡，必须理解捕获阶段

`invalid` 事件会在无效控件上触发，但不冒泡。下面的默认冒泡监听收不到后代控件事件：

```js
// 错误案例：invalid 不冒泡
form.addEventListener("invalid", (event) => {
  console.log(event.target.id);
});
```

应使用捕获阶段：

```js
form.addEventListener(
  "invalid",
  (event) => {
    console.log("捕获到无效控件：", event.target.id);
  },
  { capture: true }
);
```

`invalid` 可以被取消。调用 `event.preventDefault()` 可能抑制浏览器默认交互提示，但不会让控件变成有效。若页面抑制默认提示，就必须提供同等清楚、可见、可聚焦的自定义错误界面。本课完整案例不取消事件，让 `reportValidity()` 仍可显示浏览器消息，同时把同一 `validationMessage` 渲染到页面。

### 4.12 文件检查分成提示、预检查和最终检查

文件流程应分层：

| 层级 | 能做什么 | 不能证明什么 |
| --- | --- | --- |
| `accept` | 给系统文件选择器类型提示 | 文件一定匹配或安全 |
| 页面脚本 | 检查数量、名称、`File.type`、`size` | 真实格式、恶意载荷、服务端政策 |
| 服务端接收层 | 限制请求体、数量、单文件与总大小 | 文件解码后一定安全 |
| 服务端文件处理 | 魔数嗅探、可靠解码、转码、恶意内容检测 | 用户一定有业务权限 |
| 授权与业务层 | 检查身份、资源归属、额度和状态 | 客户端显示已经同步 |

客户端可以把明显错误挡在上传之前，但所有客户端结果都能被绕过。服务端还应：

- 生成自己的存储键，不信任原始文件名作为路径；
- 防止路径穿越、重名覆盖和可执行文件直接托管；
- 在解析前限制请求体、文件数量、单文件和总大小；
- 通过内容签名与可靠解码确认真实格式；
- 对图片进行安全解码和必要转码；
- 扫描恶意内容并隔离未完成处理的文件；
- 设置正确下载响应头和内容类型；
- 记录所有者、授权范围和生命周期。

本课不读取图片像素，不生成对象 URL，不上传文件，只显示文件元数据。

### 4.13 验证、认证、授权、CSRF、业务规则与并发边界

| 责任 | 页面可以改善的体验 | 服务端必须最终判定 |
| --- | --- | --- |
| 字段验证 | 必填、格式、长度、范围、步长、即时说明 | 对原始请求重新解析、规范化、限长、限值 |
| 认证 Authentication | 显示登录入口或当前用户提示 | 会话、令牌、过期、撤销和身份真实性 |
| 授权 Authorization | 根据已知状态隐藏不可用按钮 | 当前身份是否能创建、修改该资源及字段级权限 |
| CSRF | 携带服务端生成的令牌 | cookie 身份请求的令牌、Origin/SameSite 等策略 |
| 业务规则 | 提前提示分类、价格、标题政策 | 以服务器当前配置和数据执行规则 |
| 文件安全 | 数量、扩展名、声明类型、大小预检查 | 请求限额、真实格式、解码、扫描、隔离、存储 |
| 并发控制 | 携带版本号并解释冲突 | 事务、唯一约束、乐观锁、幂等键和冲突响应 |
| 持久化 | 展示“正在提交”或本地预览 | 事务提交、回滚、生成 ID、审计与最终响应 |

隐藏字段中的 `userId`、`role`、`pricePolicy` 或 `version` 都可被修改。版本字段可以作为并发协议的一部分，但服务器必须将它与当前版本比较；页面不能自行宣布“没有冲突”。

### 4.14 渐进增强：原生基线先成立

一个合理演进顺序是：

1. 先写语义正确的标签、帮助文字和 HTML 约束；
2. 在没有自定义脚本时，让浏览器完成基本检查；
3. 加入脚本后，用 `validationMessage` 建立可见字段错误和汇总；
4. 再加入真正需要的业务规则和文件预检查；
5. 最终连接服务器，并把服务器错误映射回字段或表单级区域。

本课完整案例为了统一演示业务规则、错误汇总和首个字段恢复，在 `form` 上使用 `novalidate`，然后在 `submit` 处理中显式调用 `checkValidity()` 和首个控件的 `reportValidity()`。这不会关闭 `validity`、`validationMessage` 或验证 API；它只关闭浏览器在提交前自动中断流程的那一步。

生产页面如果不需要统一编排，可以不写 `novalidate`，保留原生交互验证作为无脚本基线。无论哪种方案，服务端验证都不可省略。

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

### 6.1 文件位置

在个人练习目录创建：

```text
market-learning/
└── practice/
    └── html-11-constraint-validation/
        └── validity-observer.html
```

课程仓库只保存 Markdown 教材。请把下一节完整代码保存到个人 `validity-observer.html`。

### 6.2 完整文件：观察约束状态

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>约束状态观察器 · 邻里集市</title>
    <style>
      body {
        font-family: sans-serif;
        line-height: 1.6;
        margin: 2rem;
        max-width: 50rem;
      }

      label,
      button {
        display: block;
        margin-top: 1rem;
      }

      input,
      textarea {
        box-sizing: border-box;
        display: block;
        max-width: 100%;
        padding: 0.4rem;
        width: 26rem;
      }

      .buttons {
        display: flex;
        gap: 0.75rem;
      }

      pre {
        background: #f3f5f4;
        overflow: auto;
        padding: 1rem;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>约束状态观察器</h1>
      <p>
        本页只观察本地状态，不发送表单，不保存数据，也不上传文件。
      </p>

      <form id="observer-form">
        <label for="contact-emails">联系邮箱，可填写多个</label>
        <input
          id="contact-emails"
          name="contactEmails"
          type="email"
          multiple
          required
        >

        <label for="listing-code">商品码</label>
        <input
          id="listing-code"
          name="listingCode"
          pattern="[A-Z0-9]{4,12}"
          minlength="4"
          maxlength="12"
          required
          title="请输入 4 至 12 位大写字母或数字"
        >

        <label for="quantity">数量：0 至 20，步长为 5</label>
        <input
          id="quantity"
          name="quantity"
          type="number"
          min="0"
          max="20"
          step="5"
          required
        >

        <label for="summary">摘要：10 至 40 个字符</label>
        <textarea
          id="summary"
          name="summary"
          minlength="10"
          maxlength="40"
          required
        ></textarea>

        <label for="images">图片提示：PNG 或 WebP，可多选</label>
        <input
          id="images"
          name="images"
          type="file"
          accept=".png,.webp,image/png,image/webp"
          multiple
          required
        >

        <input id="teaching-state" type="hidden" name="teachingState" value="preview">

        <label for="disabled-note">已禁用的教学字段</label>
        <input
          id="disabled-note"
          name="disabledNote"
          value="不会参与验证"
          required
          disabled
        >

        <div class="buttons">
          <button id="check-button" type="button">只检查</button>
          <button id="report-button" type="button">检查并报告</button>
        </div>
      </form>

      <h2>观察结果</h2>
      <pre id="evidence" aria-live="polite">尚未检查。</pre>
    </main>

    <script>
      "use strict";

      const form = document.querySelector("#observer-form");
      const evidence = document.querySelector("#evidence");
      const validityKeys = [
        "valueMissing",
        "typeMismatch",
        "patternMismatch",
        "tooLong",
        "tooShort",
        "rangeUnderflow",
        "rangeOverflow",
        "stepMismatch",
        "badInput",
        "customError",
        "valid"
      ];

      function snapshot(control) {
        const states = Object.fromEntries(
          validityKeys.map((key) => [key, control.validity[key]])
        );

        return {
          id: control.id,
          type: control.type,
          value: control.type === "file" ? `[${control.files.length} 个文件]` : control.value,
          willValidate: control.willValidate,
          validationMessage: control.validationMessage,
          validity: states
        };
      }

      function writeEvidence(method, result) {
        const controls = [...form.querySelectorAll("input, textarea")];
        evidence.textContent = JSON.stringify(
          {
            method,
            result,
            controls: controls.map(snapshot)
          },
          null,
          2
        );
      }

      document.querySelector("#check-button").addEventListener("click", () => {
        const result = form.checkValidity();
        writeEvidence("checkValidity", result);
      });

      document.querySelector("#report-button").addEventListener("click", () => {
        const result = form.reportValidity();
        writeEvidence("reportValidity", result);
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
      });
    </script>
  </body>
</html>
```

### 6.3 运行方法

1. 用现代浏览器直接打开 `validity-observer.html`；
2. 保持所有字段为空，点击“只检查”；
3. 观察页面中的 JSON，不应出现浏览器气泡；
4. 点击“检查并报告”，观察浏览器是否聚焦首个无效字段并显示本地化提示；
5. 邮箱依次输入 `user@`、`a@example.com,b@example.com`；
6. 商品码依次输入 `ab12`、`AB12`；
7. 数量依次输入 `-5`、`3`、`25`、`10`；
8. 摘要先输入 3 个字符，再输入 10 个字符；
9. 选择一个不符合提示的文件，若系统选择器允许，观察 `accept` 不会产生 `typeMismatch`；
10. 比较 hidden、disabled 与普通控件的 `willValidate`。

### 6.4 预期结果

- 空必填控件的 `valueMissing` 为 `true`；
- `user@` 产生 `typeMismatch`；
- `ab12` 产生 `patternMismatch`，`AB12` 通过模式；
- 数量 `-5` 产生 `rangeUnderflow`；
- 数量 `3` 产生 `stepMismatch`；
- 数量 `25` 产生 `rangeOverflow`；
- 数量 `10` 通过范围和步长；
- 用户输入过短摘要时 `tooShort` 为 `true`；
- `maxlength` 可能直接阻止继续输入，导致 `tooLong` 不容易在正常键入路径出现；
- hidden 和 disabled 的 `willValidate` 为 `false`；
- `checkValidity()` 返回 `false` 但不主动显示气泡；
- `reportValidity()` 返回 `false` 并尝试显示首个错误；
- 原生 `validationMessage` 会随浏览器语言变化；
- 文件不匹配 `accept` 时不会出现 `typeMismatch`。

### 6.5 失败证据

记录下面任意现象，不要只写“失败了”：

```text
文件路径：
浏览器与版本：
操作步骤：
控件 id：
willValidate：
具体 validity 成员：
validationMessage 原文：
checkValidity 返回值：
reportValidity 返回值：
焦点元素 document.activeElement.id：
与预期不一致之处：
```

典型错误：

- `pattern` 写成 `/[A-Z0-9]{4,12}/`，导致本应合法的 `AB12` 失败；
- `step="5"` 却预期 3 合法；
- 看到文件选择器过滤后，误写“浏览器已经验证文件内容”；
- 用固定中文全文断言原生 `validationMessage`；
- 给 disabled 字段加更多约束，试图让它重新参与验证。

### 6.6 渐进扩展：加入可见错误与捕获证据

先在每个可验证控件后添加一个空段落，例如：

```html
<p id="listing-code-error" aria-live="polite"></p>
```

再加入捕获监听。这里必须使用 `true` 或 `{ capture: true }`：

```js
const listingCode = document.querySelector("#listing-code");
const listingCodeError = document.querySelector("#listing-code-error");

form.addEventListener(
  "invalid",
  (event) => {
    console.log("invalid capture:", event.target.id);
  },
  { capture: true }
);

function showListingCodeError() {
  listingCodeError.textContent = listingCode.validationMessage;
  listingCode.setAttribute(
    "aria-invalid",
    String(!listingCode.validity.valid)
  );
}

listingCode.addEventListener("input", showListingCodeError);
document.querySelector("#check-button").addEventListener(
  "click",
  showListingCodeError
);
```

扩展后的预期结果：

- `checkValidity()` 触发时，Console 能记录无效控件；
- 错误文字在字段附近可见；
- 修正商品码后，段落变为空字符串；
- `aria-invalid` 反映当前状态，而不是永远停留在 `true`；
- 即使浏览器气泡消失，可见错误仍能被检查。

这一步只是把浏览器现有消息复制到页面，还没有新增业务规则。下一节会加入自定义错误、错误汇总和文件大小检查。

## 7. 邻里集市集成案例

### 7.1 案例目标与约束

完整表单包含：

- 标题：必填，4 至 60 个字符；去除首尾空白后仍至少 4 个字符；
- 商品码：必填，4 至 12 位大写字母或数字；
- 描述：必填，20 至 300 个字符；
- 联系邮箱：`type="email"`，必填；
- 分类：必须选择一个非空机器值；
- 价格：以人民币分输入，100 至 100000000，步长 1，并再次检查安全整数；
- 图片：必选，最多 3 张，每张不超过 2 MiB，只接受 JPEG、PNG、WebP 的声明类型与匹配扩展名；
- 条款确认：必选复选框；
- 预览对象：价格保持整数分，预览时间用 `new Date().toISOString()` 生成 UTC ISO；
- 提交：始终 `preventDefault()`，不发送请求；
- 输出：只使用 `textContent` 展示 JSON，不插入不可信 HTML。

文件预检查故意只使用本地元数据。它不能证明文件内容真实、安全或可由服务器接受。

### 7.2 文件位置

保存为：

```text
market-learning/practice/html-11-constraint-validation/publish-preview.html
```

### 7.3 完整发布预览页

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>商品发布预览 · 邻里集市</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, sans-serif;
      }

      body {
        background: #f4f7f5;
        color: #213129;
        line-height: 1.6;
        margin: 0;
      }

      main {
        background: #ffffff;
        margin: 2rem auto;
        max-width: 52rem;
        padding: 2rem;
      }

      fieldset {
        border: 1px solid #9aaba2;
        margin: 1.5rem 0;
        padding: 1rem;
      }

      legend {
        font-weight: 700;
      }

      label {
        display: block;
        font-weight: 650;
        margin-top: 1rem;
      }

      input,
      select,
      textarea,
      button {
        font: inherit;
      }

      input,
      select,
      textarea {
        box-sizing: border-box;
        display: block;
        max-width: 100%;
        padding: 0.55rem;
        width: 34rem;
      }

      input[type="checkbox"] {
        display: inline;
        width: auto;
      }

      .checkbox-label {
        font-weight: 400;
      }

      .help,
      .boundary {
        color: #4d5f56;
      }

      .field-error {
        color: #a1261d;
        margin: 0.25rem 0 0;
        min-height: 1.5em;
      }

      [aria-invalid="true"] {
        border-color: #a1261d;
        outline: 2px solid #f2bbb5;
      }

      #error-summary {
        background: #fff1ef;
        border: 2px solid #a1261d;
        padding: 1rem;
      }

      #error-summary:focus {
        outline: 3px solid #2f6d52;
      }

      #error-summary a {
        color: #7c1912;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      button {
        padding: 0.6rem 1rem;
      }

      #preview {
        background: #eef4f0;
        overflow: auto;
        padding: 1rem;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>商品发布预览</h1>
      <p id="form-boundary" class="boundary">
        本页只做浏览器本地检查和预览。它不会上传图片、创建商品、写入数据库，
        也不能证明登录、授权、CSRF、业务规则或并发检查已经通过。
      </p>

      <section
        id="error-summary"
        role="alert"
        tabindex="-1"
        hidden
        aria-labelledby="error-summary-title"
      >
        <h2 id="error-summary-title">请修正以下字段</h2>
        <ul id="error-list"></ul>
      </section>

      <form
        id="listing-form"
        action="#local-preview"
        method="post"
        enctype="multipart/form-data"
        novalidate
        aria-describedby="form-boundary"
      >
        <fieldset>
          <legend>商品信息</legend>

          <label for="title">标题</label>
          <input
            id="title"
            name="title"
            minlength="4"
            maxlength="60"
            required
            aria-describedby="title-help title-error"
          >
          <p id="title-help" class="help">
            4 至 60 个字符；去除首尾空白后仍须至少 4 个字符。
          </p>
          <p id="title-error" class="field-error" aria-live="polite"></p>

          <label for="listing-code">商品码</label>
          <input
            id="listing-code"
            name="listingCode"
            pattern="[A-Z0-9]{4,12}"
            minlength="4"
            maxlength="12"
            required
            title="请输入 4 至 12 位大写字母或数字"
            aria-describedby="listing-code-help listing-code-error"
          >
          <p id="listing-code-help" class="help">
            示例：LAMP2026。只允许 4 至 12 位大写字母或数字。
          </p>
          <p id="listing-code-error" class="field-error" aria-live="polite"></p>

          <label for="description">描述</label>
          <textarea
            id="description"
            name="description"
            minlength="20"
            maxlength="300"
            required
            aria-describedby="description-help description-error"
          ></textarea>
          <p id="description-help" class="help">
            20 至 300 个字符，请描述成色和已知缺陷。
          </p>
          <p id="description-error" class="field-error" aria-live="polite"></p>

          <label for="category">分类</label>
          <select
            id="category"
            name="category"
            required
            aria-describedby="category-error"
          >
            <option value="">请选择分类</option>
            <option value="home-lighting">家居照明</option>
            <option value="furniture">家具</option>
            <option value="children">儿童用品</option>
          </select>
          <p id="category-error" class="field-error" aria-live="polite"></p>
        </fieldset>

        <fieldset>
          <legend>交易与联系</legend>

          <label for="price-cents">价格（人民币分）</label>
          <input
            id="price-cents"
            name="priceCents"
            type="number"
            min="100"
            max="100000000"
            step="1"
            required
            inputmode="numeric"
            aria-describedby="price-cents-help price-cents-error"
          >
          <p id="price-cents-help" class="help">
            输入整数分，例如 3900 表示 39.00 元。
          </p>
          <p id="price-cents-error" class="field-error" aria-live="polite"></p>

          <label for="contact-email">联系邮箱</label>
          <input
            id="contact-email"
            name="contactEmail"
            type="email"
            autocomplete="email"
            required
            aria-describedby="contact-email-error"
          >
          <p id="contact-email-error" class="field-error" aria-live="polite"></p>
        </fieldset>

        <fieldset>
          <legend>本地图片预检查</legend>

          <label for="images">商品图片</label>
          <input
            id="images"
            name="images"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            required
            aria-describedby="images-help images-error"
          >
          <p id="images-help" class="help">
            最多 3 张；每张不超过 2 MiB；本页只检查名称、声明类型和大小，
            不读取图片内容，不上传文件。
          </p>
          <p id="images-error" class="field-error" aria-live="polite"></p>
        </fieldset>

        <label class="checkbox-label" for="terms">
          <input
            id="terms"
            name="termsAccepted"
            type="checkbox"
            value="yes"
            required
            aria-describedby="terms-error"
          >
          我确认预览内容不代表商品已经发布
        </label>
        <p id="terms-error" class="field-error" aria-live="polite"></p>

        <div class="actions">
          <button type="submit">生成本地发布预览</button>
          <button type="reset">重置</button>
        </div>
      </form>

      <h2>本地结果</h2>
      <p id="status" role="status">尚未生成预览。</p>
      <pre id="preview">没有本地预览数据。</pre>
    </main>

    <script>
      "use strict";

      const form = document.querySelector("#listing-form");
      const errorSummary = document.querySelector("#error-summary");
      const errorList = document.querySelector("#error-list");
      const status = document.querySelector("#status");
      const preview = document.querySelector("#preview");

      const title = document.querySelector("#title");
      const listingCode = document.querySelector("#listing-code");
      const description = document.querySelector("#description");
      const category = document.querySelector("#category");
      const priceCents = document.querySelector("#price-cents");
      const contactEmail = document.querySelector("#contact-email");
      const images = document.querySelector("#images");
      const terms = document.querySelector("#terms");

      const MAX_FILE_COUNT = 3;
      const MAX_FILE_BYTES = 2 * 1024 * 1024;
      const ALLOWED_FILE_TYPES = new Map([
        ["image/jpeg", new Set([".jpg", ".jpeg"])],
        ["image/png", new Set([".png"])],
        ["image/webp", new Set([".webp"])]
      ]);

      const managedCustomControls = [title, priceCents, images];
      const invalidDuringPass = new Set();
      let validationAttempted = false;

      function candidates() {
        return [...form.querySelectorAll("input, select, textarea")].filter(
          (control) => control.willValidate
        );
      }

      function clearManagedCustomErrors() {
        for (const control of managedCustomControls) {
          control.setCustomValidity("");
        }
      }

      function fileExtension(fileName) {
        const lastDot = fileName.lastIndexOf(".");
        return lastDot === -1 ? "" : fileName.slice(lastDot).toLowerCase();
      }

      function inspectFiles(fileList) {
        const files = [...fileList];

        if (files.length > MAX_FILE_COUNT) {
          return `最多选择 ${MAX_FILE_COUNT} 张图片。`;
        }

        for (const file of files) {
          if (file.size > MAX_FILE_BYTES) {
            return `${file.name} 超过 2 MiB。`;
          }

          const allowedExtensions = ALLOWED_FILE_TYPES.get(file.type);
          const extension = fileExtension(file.name);

          if (!allowedExtensions || !allowedExtensions.has(extension)) {
            return `${file.name} 的声明类型或扩展名不在本地允许列表中。`;
          }
        }

        return "";
      }

      function applyBusinessRules() {
        const trimmedTitle = title.value.trim();

        if (title.value !== "" && trimmedTitle.length < 4) {
          title.setCustomValidity("标题去除首尾空白后至少需要 4 个字符。");
        }

        if (priceCents.value !== "") {
          const numericPrice = Number(priceCents.value);

          if (!Number.isSafeInteger(numericPrice)) {
            priceCents.setCustomValidity("价格必须是安全整数分。");
          }
        }

        if (images.files.length > 0) {
          images.setCustomValidity(inspectFiles(images.files));
        }
      }

      function labelText(control) {
        const firstLabel = control.labels && control.labels[0];
        return firstLabel ? firstLabel.textContent.trim() : control.name;
      }

      function renderErrors(invalidControls) {
        const invalidSet = new Set(invalidControls);
        errorList.replaceChildren();

        for (const control of candidates()) {
          const fieldError = document.querySelector(`#${control.id}-error`);
          const invalid = invalidSet.has(control);

          control.setAttribute("aria-invalid", String(invalid));

          if (fieldError) {
            fieldError.textContent = invalid ? control.validationMessage : "";
          }

          if (invalid) {
            const item = document.createElement("li");
            const link = document.createElement("a");
            link.href = `#${control.id}`;
            link.textContent = `${labelText(control)}：${control.validationMessage}`;
            link.addEventListener("click", (event) => {
              event.preventDefault();
              control.focus();
              control.reportValidity();
            });
            item.append(link);
            errorList.append(item);
          }
        }

        errorSummary.hidden = invalidControls.length === 0;
      }

      function recomputeWithoutEvents() {
        clearManagedCustomErrors();
        applyBusinessRules();
        const invalidControls = candidates().filter(
          (control) => !control.validity.valid
        );
        renderErrors(invalidControls);
        return invalidControls;
      }

      function validateForPreview() {
        clearManagedCustomErrors();
        applyBusinessRules();
        invalidDuringPass.clear();

        const valid = form.checkValidity();
        const invalidControls = candidates().filter(
          (control) => !control.validity.valid
        );
        renderErrors(invalidControls);

        if (!valid && invalidControls[0]) {
          const firstInvalid = invalidControls[0];
          firstInvalid.focus();
          firstInvalid.reportValidity();
        }

        return valid;
      }

      function createLocalPreview() {
        const numericPrice = Number(priceCents.value);
        const createdAt = new Date().toISOString();

        return {
          teachingState: "local-preview-only",
          title: title.value.trim(),
          listingCode: listingCode.value,
          description: description.value.trim(),
          category: category.value,
          priceCents: numericPrice,
          contactEmail: contactEmail.value,
          imageMetadata: [...images.files].map((file) => ({
            name: file.name,
            declaredType: file.type,
            sizeBytes: file.size
          })),
          termsAccepted: terms.checked,
          previewedAt: createdAt,
          persisted: false,
          uploaded: false
        };
      }

      form.addEventListener(
        "invalid",
        (event) => {
          invalidDuringPass.add(event.target.id);
          console.info("invalid capture:", event.target.id);
        },
        { capture: true }
      );

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        validationAttempted = true;

        if (!validateForPreview()) {
          status.textContent =
            `预览未生成：捕获到 ${invalidDuringPass.size} 个无效控件。`;
          preview.textContent = "请先修正错误。没有数据被发送或保存。";
          return;
        }

        const localPreview = createLocalPreview();
        preview.textContent = JSON.stringify(localPreview, null, 2);
        status.textContent =
          "本地预览已生成；图片未上传，商品未创建，数据未持久化。";
      });

      form.addEventListener("input", (event) => {
        if (
          validationAttempted &&
          event.target.matches("input, select, textarea")
        ) {
          recomputeWithoutEvents();
        }
      });

      form.addEventListener("change", (event) => {
        if (
          validationAttempted &&
          event.target.matches("input, select, textarea")
        ) {
          recomputeWithoutEvents();
        }
      });

      form.addEventListener("reset", () => {
        queueMicrotask(() => {
          validationAttempted = false;
          clearManagedCustomErrors();
          renderErrors([]);
          status.textContent = "表单已重置，尚未生成预览。";
          preview.textContent = "没有本地预览数据。";
        });
      });
    </script>
  </body>
</html>
```

### 7.4 代码执行顺序

第一次提交时：

1. `submit` 监听器立即 `preventDefault()`，因此不会导航或发送请求；
2. `clearManagedCustomErrors()` 清除上次由页面设置的错误；
3. `applyBusinessRules()` 根据当前标题、价格和文件重新计算；
4. `form.checkValidity()` 检查所有候选控件，并在无效控件上触发 `invalid`；
5. 表单捕获监听器记录无效控件 ID；
6. `renderErrors()` 读取每个控件当前的 `validationMessage`；
7. 页面同时生成字段旁错误和错误汇总；
8. 首个无效控件获得焦点；
9. `firstInvalid.reportValidity()` 尝试显示浏览器自己的本地化消息；
10. 只有全部通过时才创建普通 JavaScript 对象；
11. `priceCents` 保持安全整数；
12. `previewedAt` 由 `toISOString()` 生成 UTC 时间；
13. JSON 通过 `textContent` 显示，不解释为 HTML；
14. `persisted` 和 `uploaded` 明确为 `false`。

用户修正输入时：

1. 只有已经尝试提交后，页面才持续更新错误，避免初次打开就显示一片红色；
2. 每次输入或变化都先清除受管理的自定义错误；
3. 当前规则重新计算；
4. 已修正字段的 `customError`、字段错误和汇总项消失；
5. 实时刷新只读取 `validity`，不反复调用 `reportValidity()` 抢夺焦点。

### 7.5 运行方法

1. 打开 `publish-preview.html`；
2. 不输入任何内容，点击“生成本地发布预览”；
3. 检查焦点是否落在标题；
4. 检查字段错误与错误汇总是否同时出现；
5. 在 Console 检查 `invalid capture:` 日志；
6. 标题输入四个空格，观察自定义错误；
7. 把标题改为“阅读台灯”，确认旧错误消失；
8. 商品码输入 `lamp-1`，再改为 `LAMP2026`；
9. 价格依次输入 `99`、`100.5`、`3900`；
10. 邮箱先输入 `user@`，再改为合法地址；
11. 选择超过 3 张文件，或选择超过 2 MiB 的图片；
12. 修正所有字段并确认条款；
13. 再次生成预览，检查 `priceCents` 是整数，`previewedAt` 以 `Z` 结尾；
14. 在 Network 面板确认本次操作没有表单请求；
15. 刷新页面，确认预览消失，证明没有持久化。

### 7.6 预期结果

- 空表单不会生成预览；
- 错误汇总每项都是可聚焦相应控件的链接；
- 首个无效控件获得焦点并可显示浏览器提示；
- 标题只有空白时，`customError` 为 `true`；
- 标题修正后，`customError` 恢复为 `false`；
- 价格 99 分产生 `rangeUnderflow`；
- 价格 100.5 分产生 `stepMismatch` 或自定义安全整数错误；
- 价格 3900 以数字 `3900` 进入预览，而不是 39 或 `"3900"`；
- `previewedAt` 是带 `Z` 的 UTC ISO 字符串；
- 文件预览只包含名称、声明类型和字节数；
- 页面不创建对象 URL，不读取文件内容；
- Network 面板没有发布或上传请求；
- 重置后自定义错误、字段错误、汇总和预览全部清除；
- 刷新后没有商品或预览记录。

### 7.7 失败证据与恢复记录

使用下面模板保存证据：

```text
文件路径：
浏览器与版本：
失败输入：
首个无效控件：
willValidate：
valueMissing/typeMismatch/patternMismatch：
tooLong/tooShort：
rangeUnderflow/rangeOverflow/stepMismatch/badInput：
customError/valid：
validationMessage：
invalid 捕获日志：
字段旁错误：
错误汇总：
修复动作：
修复后焦点：
修复后 customError：
预览 priceCents：
预览 previewedAt：
Network 请求数：
刷新后状态：
未验证环境：
```

可接受证据必须同时说明“如何失败”和“如何恢复”。只有最终成功截图不能证明过期自定义错误、焦点恢复或文件绕过分析正确。

### 7.8 本案例的渐进增强与降级

当前完整案例依赖 JavaScript 生成本地预览。若脚本加载失败：

- HTML 的标签、帮助文字和约束仍然存在；
- 由于案例使用 `novalidate`，不能把它直接当成无脚本生产表单；
- 本教材文件没有真实 `action` 接口，不应尝试提交；
- 生产实现可移除 `novalidate` 保留原生基线，再让脚本增强错误汇总；
- 服务器响应仍应返回字段错误与表单级错误，不能只依赖客户端。

渐进增强不是“有 JavaScript 就关闭所有原生能力”。本案例仍使用原生控件、`ValidityState`、`validationMessage`、焦点和 `reportValidity()`，脚本只负责编排和补足业务规则。

## 8. 常见错误与排查路径

### 8.1 明确错误：自定义错误永久残留

错误代码：

```js
// 错误案例：只设置，不清除
title.addEventListener("blur", () => {
  if (title.value.trim().length < 4) {
    title.setCustomValidity("标题至少需要 4 个非空白字符。");
  }
});
```

复现：

1. 输入 `a` 并移开焦点；
2. `customError` 变为 `true`；
3. 改成“阅读台灯”；
4. 再调用 `checkValidity()`；
5. 控件仍无效，旧 `validationMessage` 仍存在。

根因：`setCustomValidity()` 的非空消息不会因 `.value` 改变自动清除。

恢复：

```js
function validateTitle() {
  title.setCustomValidity("");

  if (title.value !== "" && title.value.trim().length < 4) {
    title.setCustomValidity("标题至少需要 4 个非空白字符。");
  }
}

title.addEventListener("input", validateTitle);
```

复验：

```js
console.log(title.validity.customError);
console.log(title.validationMessage);
```

合法值时应分别为 `false` 和空字符串。完整表单采用“每轮先清空，再重算”，避免某个事件路径遗漏清理。

### 8.2 明确错误：依赖冒泡监听 `invalid`

- **现象**：字段明显无效，但表单监听器没有日志。
- **证据**：监听器第三个参数缺失或 `capture: false`。
- **原因**：`invalid` 不冒泡。
- **修复**：使用 `{ capture: true }`。
- **复验**：调用 `form.checkValidity()` 后，每个无效候选控件都留下日志。

不要改成监听所有字段的 `click`。点击不是验证失败证据，键盘提交也可能没有点击。

### 8.3 明确错误：只显示顶部汇总，不显示字段错误

- **现象**：用户知道有 5 个错误，却要在页面里猜每个字段的问题。
- **证据**：汇总文字没有链接，字段附近没有 `validationMessage`。
- **原因**：把汇总当成字段级恢复的替代品。
- **修复**：同时提供字段旁错误、汇总链接和首个无效字段焦点。
- **复验**：键盘激活汇总链接后，焦点进入对应原生控件。

### 8.4 明确错误：只调用 `focus()`，不解释失败原因

焦点移动只能回答“在哪里”，不能回答“为什么”。应让可见错误与控件关联，并在需要时调用 `reportValidity()`。同样，不要在每次键入时调用 `reportValidity()`，否则浏览器可能反复弹出消息并抢夺焦点。

### 8.5 明确错误：用固定消息覆盖所有原生错误

错误代码：

```js
if (!priceCents.validity.valid) {
  priceCents.setCustomValidity("价格错误。");
}
```

这样会隐藏 `valueMissing`、`rangeUnderflow`、`rangeOverflow`、`stepMismatch` 或 `badInput` 的具体原因，还可能制造过期 `customError`。

恢复策略：

- 原生规则足够时直接使用 `validationMessage`；
- 只有原生约束无法表达安全整数或跨字段规则时才设置自定义错误；
- 每轮先清空旧自定义消息；
- 不把服务端错误伪装成原生格式错误。

### 8.6 明确错误：把 `accept` 当成安全验证

绕过实验：

1. 在 DevTools 中选中 file input；
2. 删除 `accept`；
3. 选择 `.txt` 或其他文件；
4. 观察文件仍可进入 `files`；
5. 或直接构造不经过页面的 HTTP 请求。

完整案例会因类型或扩展名不在本地列表而设置 `customError`，但这仍只是第二层客户端检查。攻击者也可以删除脚本、修改 `File.type` 来源或直接请求服务器。

**结论：**

```text
accept 可绕过
  ≠ 页面文件检查没有价值
页面文件检查通过
  ≠ 文件真实、安全
服务端 MIME 检查通过
  ≠ 解码和恶意内容检查完成
```

最终恢复只能是服务端重新限制和检查；不能通过给 `accept` 再加几个值解决信任问题。

### 8.7 文件名、MIME 与内容不一致

- **现象**：文件名为 `photo.png`，`File.type` 是 `image/jpeg`。
- **页面证据**：扩展名和声明类型映射不一致。
- **本地处理**：阻止预览并给出可见错误。
- **服务端处理**：不信任二者，检查魔数、可靠解码和政策。
- **边界**：文件内容可能是多格式、多段载荷或利用解析器漏洞，扩展名检查不能证明安全。

### 8.8 文件过大但 `validity.valid` 仍为 `true`

HTML 没有通用的 file `maxsize` 属性。超大文件不会自动产生 `rangeOverflow`。需要页面读取 `File.size` 并设置自定义错误，服务端再限制实际请求体和文件大小。

错误写法：

```html
<!-- 错误案例：max 不限制文件字节 -->
<input type="file" max="2097152">
```

`max` 对 file 类型不承担这个含义。

### 8.9 `multiple` 没有限制文件数量

- **现象**：写了 `multiple` 后用户选择 20 张图片。
- **原因**：`multiple` 是是否允许多选，不是数量上限。
- **修复**：页面检查 `files.length`，服务端重复检查。
- **复验**：4 张时本地错误，3 张且各自合规则可以预览；服务器契约仍限制为 3 张。

### 8.10 `minlength` 被空格“满足”

- **现象**：四个空格通过 `minlength="4"`。
- **原因**：长度约束不自动 trim。
- **修复**：保留原生长度约束，再增加 `trim()` 后的业务规则。
- **复验**：四个空格触发 `customError`，“台灯可用”通过。

### 8.11 数字框显示空字符串，却不是普通缺失

某些不可解析输入会令 `value` 为空，同时 `badInput` 为 `true`。排查时先看 `validity.badInput`，不要只根据 `.value === ""` 显示“请填写”。浏览器输入法、区域小数分隔符和中间编辑状态都可能影响表现。

### 8.12 价格使用小数元

错误模型：

```js
const price = 39.1 + 0.2;
```

本项目使用整数分：

```js
const priceCents = 3930;
```

页面检查 `Number.isSafeInteger()`；服务端仍需使用整数或适合货币的精确类型，并验证范围。不要依赖 `step="0.01"` 解决所有金额精度和业务问题。

### 8.13 把本地时间直接加 `Z`

错误代码：

```js
const utc = localDateTimeInput.value + "Z";
```

这只是声称本地墙上时间已经是 UTC，可能改变真实时刻。应先明确业务时区，再用日期时间库或服务器规则转换。本课不接收预约时间，只用 `new Date().toISOString()` 记录预览发生时刻，因此结果明确为 UTC。

### 8.14 客户端通过后直接显示“发布成功”

- **现象**：`form.checkValidity()` 为 `true` 后显示“商品已发布”。
- **原因**：混淆客户端格式通过与服务端事务成功。
- **修复**：本课只显示“本地预览已生成”；真实系统等待服务端成功响应和资源 ID。
- **复验**：Network 无请求，刷新后状态消失，预览对象含 `persisted: false`。

### 8.15 忽略认证、授权和 CSRF

`required` 无法证明用户是谁，隐藏 `role=admin` 也不能授予权限。真实发布接口必须：

- 验证身份会话或令牌；
- 检查当前身份是否可发布；
- 对 cookie 身份的状态改变请求实施 CSRF 防护；
- 忽略或拒绝客户端试图指定的所有者、角色等受保护字段；
- 在服务端审计操作。

### 8.16 忽略业务状态和并发

用户打开表单时分类可用，不代表提交时仍可用；商品码检查时唯一，不代表写入时仍唯一。服务端需要事务、唯一约束、版本比较或幂等键。页面应能显示 `409 Conflict` 一类冲突并让用户重新加载或合并，不能用一次异步“可用性检查”承诺最终成功。

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

### 9.3 生命周期诊断题

下面代码有什么错误？

```js
function validateFile() {
  if (images.files[0] && images.files[0].size > 1024) {
    images.setCustomValidity("文件过大。");
  }
}
```

答案标准：

- 没有在每轮开始执行 `images.setCustomValidity("")`；
- 文件被删除或换成合规文件后，旧 `customError` 仍可能保留；
- 只检查第一个文件，`multiple` 下其他文件被遗漏；
- 1 KiB 是否正确应来自明确业务契约；
- 服务端仍要重复限制实际请求；
- 修复后应遍历全部文件并重新报告当前消息。

### 9.4 边界题

把下列责任分配给“HTML 原生约束”“页面业务检查”或“服务端最终检查”。可以多层重复：

```text
邮箱语法
标题 trim 后长度
图片最多 3 张
图片真实格式
用户是否登录
用户是否有发布权限
CSRF 令牌
商品码唯一
版本冲突
价格是否为整数分
数据库是否提交成功
```

<details>
<summary>查看边界题答案</summary>

- 邮箱语法：HTML 原生约束，服务端重复；
- 标题 trim 后长度：页面业务检查，服务端重复；
- 图片最多 3 张：页面业务检查，服务端重复；
- 图片真实格式：服务端最终检查；
- 用户是否登录：服务端认证；
- 用户是否有发布权限：服务端授权；
- CSRF 令牌：服务端校验，页面只负责按协议携带；
- 商品码唯一：服务端唯一约束；页面可提前提示但不能承诺；
- 版本冲突：服务端并发控制；
- 价格是否为整数分：页面检查，服务端重复；
- 数据库是否提交成功：服务端事务与响应。

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

### 10.2 进阶：可恢复的发布预览

文件位置：

```text
practice/html-11-constraint-validation/advanced-preview.html
```

要求：

- 保留 HTML 原生约束；
- 增加标题 trim 后长度规则；
- 价格使用 100 至 100000000 的安全整数分；
- 至少一个 file input，支持多选；
- 图片最多 3 张，每张最多 2 MiB；
- 检查扩展名和客户端声明 MIME 的对应关系；
- 每轮先清空全部页面管理的自定义错误；
- 使用捕获阶段记录 `invalid`；
- 同时显示字段旁错误和页面错误汇总；
- 汇总项可把焦点移到相应控件；
- 无效提交最终聚焦首个无效字段；
- 合法时只输出本地对象；
- 时间使用 `new Date().toISOString()`；
- 不上传、不持久化、不显示“发布成功”。

答案标准：

- 错误修正后 `customError` 确实变回 `false`；
- 汇总顺序与 DOM 控件顺序一致；
- 页面不通过 `innerHTML` 插入用户输入；
- `priceCents` 是安全整数，不是小数元或数字字符串；
- UTC ISO 结果以 `Z` 结尾；
- Network 面板没有发布请求；
- 刷新后预览消失；
- 文档列出服务器重复验证清单。

### 10.3 故障注入：过期错误、文件绕过与并发错觉

在进阶练习副本中依次制造三个独立故障，每次只制造一个：

1. 删除 `setCustomValidity("")`，复现合法标题仍被阻止；
2. 删除 `accept` 或改造选择路径，选择不在列表中的文件；
3. 添加隐藏 `version="1"`，然后假设服务器版本已经变为 2，分析页面为何无法自行保证写入成功。

记录模板：

```text
故障名称：
注入位置：
操作步骤：
可见现象：
ValidityState 证据：
validationMessage：
invalid 捕获证据：
Network 证据：
根因：
最小恢复：
服务端仍需执行：
复验结果：
```

答案标准：

- 过期错误用 `customError === true` 证明，不只看红框；
- 文件绕过后，页面检查能给出本地错误，但结论仍是服务器必须重检；
- 不把改回 `accept` 当成安全修复；
- 版本冲突由服务器比较和事务控制，隐藏字段只是可篡改输入；
- 三次实验都有修复前后证据；
- 不删除测试、放宽限制或吞掉错误来制造“通过”。

## 11. 阶段验收

### 原生约束

- [ ] `required` 的空值、选择组和文件语义能分别解释；
- [ ] `minlength`/`maxlength` 不被误写成 trim 后业务长度；
- [ ] `pattern` 没有 JavaScript 正则分隔符，空值由 `required` 处理；
- [ ] `min`、`max`、`step` 的范围与步长基准能解释；
- [ ] 价格使用安全整数分；
- [ ] `accept` 被描述为选择提示；
- [ ] `multiple` 没有被误写成最大数量。

### 状态与 API

- [ ] 11 个相关 `ValidityState` 成员都有可观察说明；
- [ ] 能区分 `badInput` 与普通空值；
- [ ] `willValidate` 在普通、hidden、disabled 等状态中有证据；
- [ ] 原生 `validationMessage` 不做固定语言断言；
- [ ] `checkValidity()` 与 `reportValidity()` 差异有运行记录；
- [ ] `setCustomValidity()` 每轮先清空再重算；
- [ ] 合法值修正后 `customError` 为 `false`；
- [ ] `invalid` 使用捕获阶段监听。

### 错误恢复

- [ ] 每个错误在字段附近可见；
- [ ] 页面有错误汇总；
- [ ] 汇总链接能聚焦对应控件；
- [ ] 首个无效字段能恢复焦点；
- [ ] 实时输入不会反复抢焦点；
- [ ] 重置能清除过期自定义错误和汇总；
- [ ] 浏览器提示与页面可见错误都可观察。

### 文件与信任边界

- [ ] 页面检查文件数量、扩展名、声明 MIME 和字节大小；
- [ ] 文件检查没有被称为真实格式验证；
- [ ] `accept` 绕过路径有分析；
- [ ] 服务端请求体、数量、大小、嗅探、解码、扫描、隔离和存储边界齐全；
- [ ] 原始文件名不作为可信存储路径；
- [ ] 案例没有实际上传文件。

### 服务端边界

- [ ] 客户端通过没有被称为服务端验证通过；
- [ ] 认证与授权被分别说明；
- [ ] cookie 身份下的 CSRF 防护被说明；
- [ ] 业务规则由服务端当前状态最终判断；
- [ ] 唯一性与版本冲突由数据库约束、事务或乐观锁处理；
- [ ] 合法预览没有被描述成持久化成功；
- [ ] 预览时间使用 UTC ISO，刷新后状态消失。

### 运行证据

```text
个人文件路径：
打开命令或方式：
浏览器与版本：
原生约束失败记录：
11 个 ValidityState 快照：
check/reportValidity 对比：
invalid 捕获日志：
过期 customError 复现与恢复：
首个无效字段焦点：
错误汇总链接：
文件数量/类型/大小故障：
accept 绕过分析：
priceCents：
previewedAt：
Network 面板：
刷新后状态：
服务端边界清单：
未验证浏览器/辅助技术：
```

完成标准不是“点提交后出现红色”，而是能从具体状态定位原因、修正后沿同一路径恢复，并准确说明浏览器之外还必须验证什么。

## 12. 常见问题

### Q1：用了 `required`，还需要服务端必填检查吗？

需要。客户端属性可被删除，请求也可以绕过页面。服务器要对收到的原始数据重新解析、规范化和验证。

### Q2：为什么不用一个正则完成全部验证？

正则适合有限的字符模式，不适合身份、权限、文件内容、数据库唯一性、跨字段业务状态和并发。即使是邮箱，浏览器类型语法与服务器可投递性也是不同问题。

### Q3：`pattern` 会自动 trim 吗？

不会。它匹配当前值。若业务忽略首尾空白，应明确决定是拒绝、规范化还是保留，并在服务器执行同一契约。

### Q4：为什么 `maxlength` 下看不到 `tooLong`？

浏览器可能在正常用户输入路径直接阻止继续键入。程序设置 `.value` 的验证行为又不应简单等同于用户输入。记录实际浏览器和输入路径，不要为制造状态而改变生产规则。

### Q5：`validationMessage` 可以直接显示吗？

可以作为当前错误来源，完整案例就是这样做的。但原生消息会本地化，自定义消息需要自行国际化；复杂业务错误还应由服务器返回明确字段或表单级信息。

### Q6：可以对每次 `input` 都调用 `reportValidity()` 吗？

通常不建议。它可能持续弹出浏览器消息并改变焦点。实时阶段可重算状态和更新可见错误，提交失败时再聚焦并报告首个错误。

### Q7：为什么错误汇总用了链接？

汇总让用户了解错误数量和分布，链接提供从概览回到字段的键盘路径。它不能替代字段旁错误。

### Q8：`invalid` 和 `submit` 哪个先发生？

未使用 `novalidate` 的原生交互验证中，无效控件会在提交前触发 `invalid`，表单的 `submit` 事件可能根本不会发生。完整案例使用 `novalidate`，在 `submit` 中手动检查，以便先计算业务规则并统一渲染。

### Q9：取消 `invalid` 默认行为会让表单通过吗？

不会。取消只影响默认交互报告，控件状态仍然无效。页面必须另行提供可见错误和恢复路径。

### Q10：`accept="image/*"` 是否比列出类型更安全？

不是安全强度关系。通配符更宽，适合允许所有图片的选择体验；明确列表更窄。两者都只是客户端提示，服务器都必须检查真实内容和政策。

### Q11：只检查 `File.type` 够吗？

不够。它可能为空或错误。扩展名也可伪造。页面预检查只能改善体验，真实格式确认必须在服务器使用内容签名和可靠解码。

### Q12：浏览器能在选择前限制文件大小吗？

HTML file input 没有通用 `maxsize` 约束。页面只能在获得 `File` 后读取 `size`，服务器还要在接收和解析阶段限制请求。

### Q13：本地预览为什么要保存 `previewedAt`？

它让输出有可观察时间证据，并练习 UTC ISO。它不是服务器创建时间，也不应成为审计记录；真实创建时间由服务器在事务中生成。

### Q14：隐藏版本号完全没用吗？

它可以携带客户端读到的版本，参与乐观并发协议，但不可信。服务器必须把它与当前版本原子比较，冲突时拒绝或要求合并。

### Q15：前端已经隐藏发布按钮，还要授权吗？

必须。隐藏按钮只是界面选择，用户仍可构造请求。授权要在每个受保护的服务端操作上执行。

### Q16：CSRF 和表单验证是什么关系？

表单验证检查数据形状，CSRF 防止攻击页面借用户 cookie 发起非预期状态改变。两者解决不同问题，均不能替代认证和授权。

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

我能用 HTML 约束表达必填、模式、长度、范围和步长，用全部相关 `ValidityState` 成员定位失败，并正确组合 `checkValidity()`、`reportValidity()`、`validationMessage` 和捕获阶段的 `invalid`。我还能让自定义错误在修正后真正清除，为用户提供字段错误、错误汇总与首个无效字段恢复，对文件做有限的本地预检查，并明确说明认证、授权、CSRF、文件安全、业务规则、并发和持久化仍由服务端最终负责。

## 单元导航

- [上一课：表单控件、选择与分组](03-form-controls-groups.md)
- [返回第五章入口](../05-forms-validation.md)
- [下一章：原生交互、DOM 与事件](../06-interactive-dom.md)
- [返回 HTML 模块](../README.md)
