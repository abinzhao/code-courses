# 表单目标、方法与编码

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 配置 action、method、enctype、target 和验证入口，预测浏览器如何发送表单。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-001`、`FRM-002` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

配置 action、method、enctype、target 和验证入口，预测浏览器如何发送表单。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-001（form action、method、target、accept-charset）、FRM-002（enctype 三种编码与文件上传）；
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
priceCents = 3900
intent = preview
```

### 3.2 预备材料 2

```text
practice/
└── html-05-submission/
    ├── query-observer.html
    ├── market-publish-preview.html
    └── evidence.md
```

## 4. 核心理论

### 4.1 `action`：提交目标

`action` 表示提交目标 URL：

```html
<form action="/search" method="get">
```

相对 URL 会依据文档基准 URL 解析。省略 `action` 时，目标是当前文档的 URL。新代码不要写语义含糊的空 `action=""`；明确目标，或有意省略并注释“提交到当前文档”。

提交按钮可使用 `formaction` 覆盖表单值：

```html
<button
  type="submit"
  name="intent"
  value="preview"
  formaction="/listings/preview"
>
  预览
</button>
```

覆盖发生在这一个提交者触发的提交中，不会永久改写 `<form action>` 内容属性。

`action` 只说明目标，不证明目标存在，也不证明对方接收、授权、验证或保存了数据。本课没有对应服务器。

### 4.2 `method`：GET、POST 与 `dialog`

HTML 表单的 `method` 常用值如下：

| 值 | 浏览器行为 | 适用意图 | 本课边界 |
| --- | --- | --- | --- |
| `get` | 把文本条目编码进目标 URL 的查询部分 | 搜索、筛选、无副作用读取 | 可观察地址栏，不证明服务器处理 |
| `post` | 把编码后的条目放入请求体 | 创建或改变状态的意图 | 发布案例会拦截，不实际发送 |
| `dialog` | 在所属 `dialog` 中关闭对话框，不传输表单数据 | 对话框确认或取消 | 本课不展开 |

省略 `method` 时默认是 `get`。提交按钮可用 `formmethod` 覆盖。

选择方法先看语义：

- 搜索“台灯”、筛选“可自提”可以使用 GET，因为 URL 可复制、收藏和回退；
- 发布商品、删除商品、预约交易不应设计为 GET，因为加载或预取一个 URL 不应产生状态改变；
- POST 只是方法语义与承载位置，不自动加密。传输机密性通常依赖 HTTPS；
- POST 也不自动完成身份认证、授权、CSRF 防护、服务端验证、幂等处理或并发控制。

本课没有实现后五项能力。

### 4.3 `enctype`：POST 条目的编码方式

`enctype` 在 `method="post"` 时决定表单提交数据的 MIME 类型。三个规定值是：

| 值 | 特点 | 典型用途 |
| --- | --- | --- |
| `application/x-www-form-urlencoded` | 默认值；名称和值按 URL 编码规则序列化 | 普通文本、小型字段 |
| `multipart/form-data` | 多个 part，有边界，可承载文件内容和文本 | 含 `input type="file"` 的上传表单 |
| `text/plain` | 近似可读文本，编码和歧义处理能力弱 | 临时调试，不作为常规接口格式 |

示例：

```html
<form
  action="/listings"
  method="post"
  enctype="multipart/form-data"
>
```

按钮可以用 `formenctype` 覆盖表单值。文件表单应使用 `multipart/form-data`，但这个属性不会验证文件类型、大小或内容，也不会自动上传到一个真实服务。

**明确错误示例：手工给 `FormData` 的 fetch 设置 multipart 边界。**

```js
// 错误：浏览器无法把这里固定的边界与实际生成的请求体边界自动对齐。
fetch("/listings", {
  method: "POST",
  headers: {
    "Content-Type": "multipart/form-data"
  },
  body: new FormData(document.querySelector("form"))
});
```

当真实项目把 `FormData` 作为 `fetch` 请求体时，通常让浏览器生成包含 boundary 的 `Content-Type`。不过本课不调用 `fetch()`，也没有上传端点。

GET 不使用 `enctype` 选择 POST 请求体格式；它把可表示的条目放进 URL 查询部分。不要因为表单写了 `enctype="multipart/form-data"` 就认为 GET 能在查询串中上传文件。

### 4.4 `target`：响应打开的位置

`target` 指定提交结果要加载到哪个浏览上下文：

| 值 | 含义 |
| --- | --- |
| `_self` | 当前上下文，默认值 |
| `_blank` | 新的未命名上下文 |
| `_parent` | 父上下文；没有父级时类似 `_self` |
| `_top` | 顶层上下文；已经在顶层时类似 `_self` |
| 自定义名称 | 名称匹配的窗口或 iframe |

提交按钮可以用 `formtarget` 覆盖。`target` 不决定 HTTP 方法，也不把“不可信响应”变可信。新标签页还会改变回退、焦点和用户预期；不要只为了“看起来没离开当前页”就滥用 `_blank`。

本课查询表单显式写 `_self`，发布预览虽然也写 `_self`，但事件被取消，因此没有响应页面可加载。

### 4.5 `accept-charset`：提交字符编码

现代 HTML 的 `accept-charset` 只允许一个 ASCII 大小写不敏感的 `UTF-8` 值：

```html
<form accept-charset="UTF-8">
```

页面本身也应声明：

```html
<meta charset="utf-8">
```

二者职责相关但不完全相同：

- `meta charset` 声明文档字节如何解码；
- `accept-charset` 描述表单提交使用的字符编码。

不要沿用旧教程里的多编码列表，也不要把字符编码当成加密。`UTF-8` 能正确表示中文，不会隐藏内容。

### 4.6 `autocomplete`：自动填充提示

表单上的：

```html
<form autocomplete="on">
```

为后代表单控件提供默认自动填充策略。控件自身可以覆盖：

```html
<input name="title" autocomplete="off">
```

表单级常见值是 `on` 和 `off`。具体字段还可以使用更细的自动填充 token，例如姓名、地址等，但那属于后续控件设计。

需要注意：

- `autocomplete="off"` 是提示，不是秘密清除器；
- 浏览器、密码管理器或用户设置可能采用自己的策略；
- 自动填充后的当前值与用户手输值一样，仍需进入同一验证和提交路径；
- 不应把关闭自动填充当成访问控制。

### 4.7 `novalidate`：跳过交互式约束验证

`novalidate` 是布尔属性：

```html
<form novalidate>
```

属性存在时，提交过程跳过表单的交互式约束验证。它不是：

- “数据已经合法”标记；
- 关闭 `ValidityState` 的开关；
- 服务端验证；
- 权限或安全设置。

提交按钮可用 `formnovalidate` 只跳过该提交者触发的交互式验证：

```html
<button type="submit" formnovalidate name="intent" value="draft">
  本地检查草稿
</button>
```

本课发布预览不使用 `novalidate`，因为要观察 `requestSubmit()` 触发原生约束验证。真正需要自定义错误界面时，也不应先无条件加 `novalidate`；应明确由谁展示错误、何时聚焦、怎样恢复。

## 5. 元素、属性、API 或配置清单

### 5.1 `form` 提交属性

| 名称 | 默认或常见值 | 本课要点 |
| --- | --- | --- |
| `action` | 省略时当前文档 URL | 目标地址；按钮可用 `formaction` 覆盖 |
| `method` | `get` | `get`、`post`、`dialog`；按钮可用 `formmethod` 覆盖 |
| `enctype` | `application/x-www-form-urlencoded` | POST 编码；文件使用 `multipart/form-data` |
| `target` | `_self` | 响应加载上下文；按钮可用 `formtarget` 覆盖 |
| `accept-charset` | 现代规范限定 `UTF-8` | 字符编码，不是加密 |
| `autocomplete` | 浏览器默认策略 | 表单默认自动填充提示；控件可覆盖 |
| `novalidate` | 不存在，即执行约束验证 | 布尔属性；按钮可用 `formnovalidate` 覆盖 |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/01-form-action-method-encoding/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 FRM-001（form action、method、target、accept-charset） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 FRM-002（enctype 三种编码与文件上传） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [FormData、查询串与程序化提交](03-formdata-query-programmatic-submit.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 FRM-001（form action、method、target、accept-charset） 对应的元素、属性或状态；
- 在项目中实现并标出与 FRM-002（enctype 三种编码与文件上传） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`03-formdata-query-programmatic-submit.md`](03-formdata-query-programmatic-submit.md)。

## 8. 常见错误与排查路径

### 8.1 故障八：把 `novalidate` 当成“自定义验证已完成”

**错误代码：**

```html
<form novalidate>
```

但脚本既没有检查，也没有显示错误。

**现象：**

空标题也进入预览转换，后续才抛出难以定位的错误。

**修复路径：**

1. 若需要原生交互验证，移除 `novalidate`；
2. 若确实构建完整自定义界面，明确调用 `checkValidity()`、读取状态、显示可见错误并管理焦点；
3. 服务端仍需独立判定，不能信任客户端已通过。

本课采用第一种。

### 8.2 故障十：用 GET 表达发布

**错误代码：**

```html
<form action="/listings" method="get">
  <button type="submit">发布商品</button>
</form>
```

问题不只是“参数出现在地址栏”。GET 应用于无副作用读取，浏览器、缓存、爬虫或预取机制可能加载 URL。发布是状态改变意图，应使用适当方法和服务端协议。

本课的 POST 表单仍被拦截，所以只表达语义，不声称真实状态改变。

### 8.3 故障十一：价格仍是字符串或浮点元

**错误代码：**

```js
const listing = {
  priceCents: data.get("priceCents")
};
```

结果 `"3900"` 是字符串。

另一个错误：

```js
const priceYuan = 39.00;
const totalYuan = priceYuan * 3;
```

业务模型要求整数分时，应在边界转换：

```js
const priceCents = Number(data.get("priceCents"));

if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
  throw new TypeError("无效整数分价格");
}
```

整数分策略也有币种和上限边界；本课只处理人民币教学价格。

## 9. 课后题

### 9.1 API 题

给定：

```js
const data = new FormData();
data.append("tag", "lamp");
data.append("tag", "home");
data.append("empty", "");
```

回答：

1. `data.get("tag")` 是什么？
2. `data.getAll("tag")` 是什么？
3. `data.has("empty")` 是什么？
4. `data.get("missing")` 是什么？
5. `Object.fromEntries(data)` 为什么不适合这里？

### 9.2 答案

概念题参考：

1. `id` 不提供提交名称；缺少有效 `name` 时控件被省略。
2. 只读支持类型通常可聚焦、不参与约束验证但会提交；禁用控件不可聚焦、不验证、不提交。
3. 不产生该控件条目，不是自动提交 `false`。
4. `get()` 只返回第一个值，`getAll()` 才保留全部。
5. GET 用于无副作用读取并把条目放入查询；POST 用请求体表达状态改变意图。
6. 不能。HTTPS、认证、授权等是其他机制。
7. `application/x-www-form-urlencoded`、`multipart/form-data`、`text/plain`。
8. 它能以多 part 形式承载文件与文本；仍需后续验证和接收端。
9. 不是，只是跳过交互式约束验证。
10. 哪个提交按钮发起了本次提交。
11. 后者能把指定提交按钮的名称和值纳入条目。
12. 它像激活提交按钮一样经过验证与 `submit` 事件。
13. 它会绕过验证与 `submit` 拦截，可能导致意外提交。
14. 查询允许重复名称，`getAll()` 才保留完整多值。
15. 表单值是字符串，领域模型要求非负安全整数分。
16. UTC。

预测题答案：

```text
a = 1
d = 4
e = 6
intent = right
```

API 题答案：

1. `"lamp"`；
2. `["lamp", "home"]`；
3. `true`；
4. `null`；
5. 普通对象会把重复的 `tag` 合并成一个属性并丢失一个值。

## 10. 实践练习

选择一件与教材不同的邻里商品，完成一次迁移练习：

1. 先写内容关系、机器值或交互目标，不先写标签；
2. 用 FRM-001（form action、method、target、accept-charset）、FRM-002（enctype 三种编码与文件上传） 实现最小页面；
3. 制造一个本课错误并保留失败证据；
4. 修复后重复键盘或开发者工具检查；
5. 在记录中解释为什么没有选择一个视觉相似的替代写法。

## 11. 阶段验收

### 11.1 GET 提交验收

- [ ] 方法为 GET；
- [ ] 查询提交到当前教学页面；
- [ ] 地址栏查询可观察；
- [ ] 中文查询可由 `URLSearchParams` 正确解码；
- [ ] 同名 `handoff` 重复出现；
- [ ] `getAll("handoff")` 保留全部值；
- [ ] 未选中、禁用和无名字段均被省略；
- [ ] 只读字段出现；
- [ ] 提交者条目出现；
- [ ] 没有声称服务器执行了搜索。

## 12. 常见问题

### Q2：没有 `action` 会怎样？

提交目标是当前文档 URL。省略应是有意设计，不要用空字符串代替清楚的决定。

### Q3：省略 `method` 会怎样？

默认使用 GET。

### Q4：GET 是否只能用于搜索？

不是。它适合无副作用、可表示为资源读取条件的操作，例如筛选、排序和分页。关键是不能用加载 URL 表达状态改变。

### Q5：POST 数据不在地址栏，所以安全吗？

不能这样判断。POST 不自动加密、认证、授权或防 CSRF；真实传输还需 HTTPS 和服务端安全设计。

### Q6：`enctype` 对 GET 有作用吗？

它主要选择 POST 的提交编码。GET 条目进入 URL 查询，不会因为写了 `multipart/form-data` 就上传文件。

### Q7：普通文本表单是否必须显式写 `enctype`？

不是，默认是 `application/x-www-form-urlencoded`。显式写出可用于教学或接口契约，但不要制造它能验证数据的错觉。

### Q9：`target="_blank"` 会让提交更安全吗？

不会。它只改变结果加载位置，也会改变焦点和导航体验。

### Q10：`accept-charset` 可以写 GBK 和 UTF-8 两个值吗？

现代规范只允许一个 `UTF-8` 值。旧教程中的多编码写法不应用于新页面。

### Q11：`autocomplete="off"` 能保证浏览器不填值吗？

不能绝对保证。它是提示，浏览器和密码管理器可能采用自己的策略。

### Q12：`novalidate` 会让 `required` 属性失效吗？

它让该提交跳过交互式约束验证；控件的有效性概念仍存在。它也不等于服务端接受值。

### Q17：为什么 `FormData.get()` 不返回数组？

它定义为返回第一个值。需要全部值时使用 `getAll()`。

### Q32：表单拦截后是否还需要 `action` 和 `method`？

保留合理原生语义有助于理解和渐进增强。但本课没有真实接收端，因此按钮默认禁用，确保脚本拦截就绪后才允许操作。

## 13. 扩展阅读

以下资料已于 **2026-10-10** 对照正文核验：

1. [WHATWG HTML：`form` 元素](https://html.spec.whatwg.org/multipage/forms.html#the-form-element)
   核验 `action`、`method`、`enctype`、`target`、`accept-charset`、`autocomplete`、`novalidate` 和表单 DOM API 的规范定义。

2. [WHATWG HTML：Form control infrastructure](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html)
   核验控件命名、禁用、自动填充、约束验证与提交基础设施。

3. [WHATWG HTML：Constructing the entry list](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#constructing-form-data-set)
   核验 entry list、提交者、禁用控件、未选中 checkbox/radio 和名称省略规则。

4. [WHATWG HTML：Form submission algorithm](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#form-submission-algorithm)
   核验提交步骤、交互式约束验证和提交者配置。

5. [WHATWG URL：`URLSearchParams`](https://url.spec.whatwg.org/#interface-urlsearchparams)
   核验查询参数 API 与 `application/x-www-form-urlencoded` 序列化基础。

6. [WHATWG XMLHttpRequest：`FormData`](https://xhr.spec.whatwg.org/#interface-formdata)
   核验 `FormData` 接口、条目与构造器。

7. [MDN：`<form>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/form)
   核验属性说明、三个 `enctype` 值、GET/POST/dialog 和 target 关键字。

8. [MDN：`FormData`](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
   核验 `entries()`、`get()`、`getAll()`、`has()` 等 API。

9. [MDN：`FormData()` 构造器](https://developer.mozilla.org/en-US/docs/Web/API/FormData/FormData)
   核验 form/submitter 参数与成功控件说明。

10. [MDN：`HTMLFormElement.requestSubmit()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/requestSubmit)
    核验验证、`submit` 事件、提交者参数和异常。

11. [MDN：`HTMLFormElement.submit()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/submit)
    核验它不触发 `submit` 事件、不触发约束验证，以及 `name="submit"` 的遮蔽风险。

12. [MDN：`SubmitEvent.submitter`](https://developer.mozilla.org/en-US/docs/Web/API/SubmitEvent/submitter)
    核验提交者属性。

13. [MDN：`disabled`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/disabled)
    核验禁用控件不聚焦、不参与约束验证且不提交。

14. [MDN：`readonly`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/readonly)
    核验支持类型、可聚焦和提交行为边界。

兼容性说明也按 2026-10-10 的上述 MDN 页面复核。课程案例面向当日现代浏览器；若项目需要支持更早浏览器，应根据目标版本重新检查 `requestSubmit()`、`SubmitEvent.submitter` 和 `FormData(form, submitter)`，并在真实目标环境测试，而不是只依赖本课日期。

## 我现在能做到什么

- 能解释并验证：配置 action、method、enctype、target 和验证入口，预测浏览器如何发送表单。
- `FRM-001`：form action、method、target、accept-charset
- `FRM-002`：enctype 三种编码与文件上传
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[返回本章入口](../05-forms-validation.md) · [下一课：成功控件、提交者与名称值](02-successful-controls-submitter-values.md) · [返回 HTML 模块](../README.md)
