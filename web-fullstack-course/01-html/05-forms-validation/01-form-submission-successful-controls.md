# 01 表单提交与成功控件：预测真正进入数据集的名称和值

## 任务卡

邻里集市准备增加两个表单：

- 商品搜索表单：提交后把关键词和交接方式放进当前页面的查询字符串，便于观察 GET 结果；
- 商品发布预览表单：收集标题、整数分价格和交接方式，但只在浏览器内显示数据，不发出网络请求。

页面上“看得见一个输入框”并不等于它会进入提交数据。控件可能没有 `name`、处于 `disabled` 状态、是未选中的复选框，或者只是一个没有触发本次提交的按钮。同名控件还可能产生多个值，不能直接当成普通对象里的单值属性。

你的任务是建立一套可预测、可取证的提交模型：

| 任务 | 完成结果 | 必须保留的证据 |
| --- | --- | --- |
| 认识提交配置 | 能解释 `action`、`method`、`enctype`、`target` 等属性 | 一张属性职责表 |
| 预测成功控件 | 提交前逐项判断哪些名称和值会出现 | 预测表与实际 `entries()` 对照 |
| 观察 GET | 地址栏出现可解释的查询字符串 | 原始查询串与解析结果 |
| 检查本地发布预览 | `submit` 被拦截，只产生本地对象 | `defaultPrevented`、提交者与预览 JSON |
| 保留同名多值 | 使用 `getAll()` 读取多个交接方式 | 数组结果 |
| 区分程序化提交 | 知道 `requestSubmit()` 与 `submit()` 的验证和事件差异 | 事件日志与口头解释 |
| 诊断遗漏 | 能修复缺少 `name` 和误用 `disabled` | 失败前后证据 |

建议用 90～120 分钟完成本课。先完整运行两个案例，再关掉答案独立完成故障注入。所有页面都属于教学状态：没有真实发布、身份认证、持久化、CSRF 防护、服务端验证或并发控制。

## 1. 任务背景

表单提交不是“把表单元素整个发送出去”。浏览器会在提交时遍历与表单关联的控件，按规则构造一个有顺序的**名称—值条目列表**。历史资料常把能进入这份列表的控件称为 **successful controls（成功控件）**。

先看一组很容易误判的控件：

```html
<input id="title" value="阅读台灯">
<input name="priceCents" value="3900" readonly>
<input name="sellerCode" value="seller-17" disabled>
<input type="checkbox" name="handoff" value="pickup">
<button type="submit" name="intent" value="preview">预览</button>
```

如果用户没有选中复选框，并通过“预览”按钮提交，条目列表不会是“页面上所有 value 的集合”，而是：

```text
priceCents = 3900
intent = preview
```

原因分别是：

1. `title` 有 `id`，却没有 `name`，因此没有提交名称；
2. `priceCents` 是只读控件，用户不能修改，但它仍可成为成功控件；
3. `sellerCode` 被禁用，禁用控件不进入条目列表；
4. 未选中的 checkbox 不产生条目；
5. 发起本次提交的按钮是提交者，它有 `name` 和 `value`，因此产生 `intent=preview`。

这套规则会直接影响搜索 URL、请求体、`FormData`、日志和后端接口契约。若一开始遗漏字段，后续把数据转换成 JSON、增加验证或调用接口都无法自动补回它。

本课只研究浏览器端的提交配置、条目构造和观察方法。GET 案例会导航到当前教学页面并显示查询字符串；发布案例会在 `submit` 事件中调用 `preventDefault()`。看到本地预览不代表任何服务器接收、验证或保存了数据。

## 2. 学习目标

完成本课后，你应当能够：

- 解释 `form` 的 `action`、`method`、`enctype`、`target`、`accept-charset`、`autocomplete` 和 `novalidate`。
- 区分 `id`、`name`、当前 `value` 和按钮可见文字的职责。
- 按控件状态预测成功控件条目，而不是只看页面是否显示输入框。
- 说明提交者为什么会影响按钮自身数据，以及 `formaction`、`formmethod` 等覆盖属性的边界。
- 准确描述 `disabled`、`readonly`、未选中 checkbox/radio 的提交行为。
- 保留同名控件产生的有序多值，不被普通对象转换静默覆盖。
- 说明 GET 查询与 POST 请求体的职责边界，以及 POST 不自动提供加密、身份、授权或可信性。
- 使用 `FormData.entries()`、`get()`、`getAll()` 和 `has()` 观察条目。
- 使用 `URLSearchParams` 生成和解析文本查询参数，并识别文件值边界。
- 区分用户激活提交按钮、`requestSubmit()` 和 `submit()` 在约束验证、`submit` 事件与提交者方面的差异。
- 运行一个可观察 GET 查询表单。
- 运行一个不发出请求的邻里集市发布预览，并将价格保持为安全整数分、时间表示为 UTC ISO 8601 字符串。
- 用“预测 → 触发 → 观察 → 解释 → 修复 → 复验”的流程定位缺少 `name` 和禁用字段遗漏。

完成标准不是背诵属性名，而是拿到任意小表单后，能在运行前写出它将产生的条目，并用浏览器证据验证。

## 3. 预备知识

本课假设你已经能够：

- 创建一份包含 doctype、`html`、`head` 和 `body` 的 HTML 文档；
- 使用 `label` 关联一个简单 `input`；
- 在浏览器中打开本地 HTML；
- 打开开发者工具的 Elements、Console 和 Network 面板；
- 理解数组、对象、事件监听器和 `console.assert()` 的基本形式。

不需要：

- 安装框架或第三方包；
- 创建后端服务；
- 准备数据库或账号；
- 发出真实发布请求。

建议创建个人练习目录：

```text
practice/
└── html-05-submission/
    ├── query-observer.html
    ├── market-publish-preview.html
    └── evidence.md
```

`evidence.md` 可以使用下面的记录模板：

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

本课代码中的 `action` 只用于解释原生配置。发布预览的提交按钮初始为禁用；脚本成功安装 `submit` 拦截器后才启用。不要删除这一防误发设计。

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

### 4.2 `action`：提交目标

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

### 4.3 `method`：GET、POST 与 `dialog`

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

### 4.4 `enctype`：POST 条目的编码方式

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

### 4.5 `target`：响应打开的位置

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

### 4.6 `accept-charset`：提交字符编码

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

### 4.7 `autocomplete`：自动填充提示

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

### 4.8 `novalidate`：跳过交互式约束验证

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

### 4.9 `id`、`name`、`value` 各做什么

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

### 4.10 成功控件的判断顺序

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

### 4.11 `disabled`、`readonly` 与未选中不是一回事

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

### 4.12 提交者 `submitter`

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

### 4.13 同名多值必须保留

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

### 4.14 GET 查询与 POST 请求体的边界

假设成功控件条目是：

```text
q = 阅读 台灯
handoff = pickup
handoff = meetup
```

GET 查询可能序列化为：

```text
?q=%E9%98%85%E8%AF%BB+%E5%8F%B0%E7%81%AF&handoff=pickup&handoff=meetup
```

观察要点：

- 空格在 `application/x-www-form-urlencoded` 查询序列化中常表示为 `+`；
- 中文按 UTF-8 字节进行百分号编码；
- 同名参数重复出现；
- 地址栏可见编码后的 URL，但 `URLSearchParams.get("q")` 返回解码后的 `"阅读 台灯"`。

GET 查询适合可分享的读取条件。不要放密码、令牌、身份证号等敏感值，因为 URL 可能出现在历史记录、日志、书签、截图和引用来源中。

POST 表单通常把条目放入请求体，不显示在查询串中，但“看不见”不等于加密或安全。HTTPS、认证、授权、CSRF 防护、服务端验证和审计是其他层的责任。本课没有实现这些能力。

### 4.15 `FormData`：观察有序条目

从表单构造：

```js
const data = new FormData(form);
```

或连同提交者构造：

```js
const data = new FormData(form, submitter);
```

本课使用的 API：

| API | 返回或行为 | 多值注意 |
| --- | --- | --- |
| `entries()` | 依序迭代 `[name, value]` | 保留重复名称 |
| `get(name)` | 第一个匹配值；没有时 `null` | 不适合读取完整多选 |
| `getAll(name)` | 所有匹配值数组 | 多选首选 |
| `has(name)` | 是否至少有一个该名称条目 | 可区分缺失与空字符串 |
| `append(name, value)` | 追加一个条目 | 不覆盖已有值 |
| `set(name, value)` | 替换该名称的既有条目 | 会改变多值集合 |

值可能是字符串，也可能是 `File`。观察时不要直接假定所有值都能安全拼进文本：

```js
function describeEntry([name, value]) {
  if (value instanceof File) {
    return [name, {
      fileName: value.name,
      type: value.type,
      size: value.size
    }];
  }

  return [name, value];
}
```

读取数值字段时，`FormData` 给出的通常仍是字符串：

```js
const rawPrice = data.get("priceCents");
const priceCents = Number(rawPrice);

if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
  throw new TypeError("priceCents 必须是非负安全整数");
}
```

HTML 控件约束改善交互，但领域对象边界仍应显式转换和断言。

### 4.16 `URLSearchParams`：文本查询参数

创建：

```js
const params = new URLSearchParams();
params.append("q", "阅读 台灯");
params.append("handoff", "pickup");
params.append("handoff", "meetup");

params.toString();
```

结果：

```text
q=%E9%98%85%E8%AF%BB+%E5%8F%B0%E7%81%AF&handoff=pickup&handoff=meetup
```

解析当前页面查询：

```js
const params = new URLSearchParams(window.location.search);

params.get("q");
params.getAll("handoff");
Array.from(params.entries());
```

纯文本 `FormData` 可以转换：

```js
const params = new URLSearchParams(new FormData(form));
```

但要先确认所有值都是文本。`URLSearchParams` 不承载文件二进制；若把含 `File` 的 `FormData` 直接传入，文件会被字符串化，而不是上传文件内容。文件表单应留在 `multipart/form-data` 的正确处理链路中。

### 4.17 `requestSubmit()` 与 `submit()`

三种触发方式应分开理解：

| 触发方式 | 交互式约束验证 | `submit` 事件 | 有明确提交者 | 提交按钮条目 |
| --- | --- | --- | --- | --- |
| 用户激活 submit 按钮 | 是，除非跳过 | 是，验证通过后 | 是 | 被激活按钮可加入 |
| `form.requestSubmit(button)` | 是，除非跳过 | 是，验证通过后 | 是 | 指定按钮可加入 |
| `form.requestSubmit()` | 是，除非跳过 | 是，验证通过后 | 通常无按钮 | 无具体按钮条目 |
| `form.submit()` | 否 | 否 | 否 | 不加入 submit 按钮 |

`requestSubmit(button)` 的思路是“像用户激活这个提交按钮一样发起”。指定参数必须是属于该表单的提交按钮，否则会抛出异常。

`submit()` 是较低层的直接提交方法：

- 不执行交互式约束验证；
- 不触发 `submit` 事件；
- 因而依赖 `submit` 监听器的 `preventDefault()` 不会运行；
- 没有提交按钮作为 submitter。

所以本课禁止在发布预览中调用它。下面是**明确错误示例，请不要运行**：

```js
// 错误：会绕过本课的验证观察和 submit 拦截器。
publishForm.submit();
```

还有一个命名陷阱：

```html
<!-- 错误：name="submit" 可能遮蔽 form.submit 方法。 -->
<input name="submit" value="错误命名">
```

应选择业务名称，例如 `intent`、`title`。即使必须访问被遮蔽的方法，也不应把绕过事件的直接提交当成修复方案。

### 4.18 本课的信任边界

表单与 `FormData` 只提供客户端数据收集机制。本课明确没有：

- 真实网络发布；
- 用户身份认证；
- 发布权限判断；
- 数据库或本地持久化；
- CSRF 防护；
- 服务端输入验证；
- 唯一性、版本冲突或并发控制；
- 支付、预约或交易。

即使页面显示“本地预览通过”，也只能证明当前脚本按当前规则构造了一个对象。任何真实服务都必须独立处理其协议和安全边界。

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

### 5.2 名称、值和状态

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

### 5.3 DOM 与 Web API

| API | 本课用途 |
| --- | --- |
| `SubmitEvent.submitter` | 找到发起提交的按钮 |
| `event.preventDefault()` | 取消导航或网络请求 |
| `new FormData(form)` | 构造成功控件条目，不含具体提交按钮 |
| `new FormData(form, submitter)` | 构造条目并包含指定提交者 |
| `FormData.entries()` | 依序观察所有名称和值 |
| `FormData.get()` | 读取第一个值 |
| `FormData.getAll()` | 读取所有同名值 |
| `FormData.has()` | 判断名称是否存在 |
| `URLSearchParams` | 构造或解析文本查询串 |
| `form.requestSubmit()` | 经验证与事件路径发起提交 |
| `form.submit()` | 直接提交；绕过验证和 `submit` 事件，本课不用 |
| `form.checkValidity()` | 返回约束验证结果；详细错误处理在本章第 4 课 |

### 5.4 提交前预测表

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

### 6.1 案例目标

这个页面使用原生 GET 提交到当前文档。提交后浏览器重新打开同一页面，地址栏带查询字符串；脚本只读取结果，不拦截提交。

你将观察：

- 有 `name` 的搜索词；
- 两个同名且已选中的交接方式；
- 一个只读来源字段；
- 一个禁用字段；
- 一个没有 `name` 的可见输入；
- 被点击的提交按钮；
- 原始 `location.search` 与 `URLSearchParams` 的解析结果。

### 6.2 文件与完整代码

文件：

```text
practice/html-05-submission/query-observer.html
```

内容：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GET 查询条目观察器</title>
  <style>
    body {
      max-width: 48rem;
      margin: 2rem auto;
      padding: 0 1rem;
      font-family: system-ui, sans-serif;
      line-height: 1.6;
    }

    form,
    section {
      padding: 1rem;
      border: 1px solid #bbb;
      border-radius: 0.5rem;
    }

    label {
      display: block;
      margin-block: 0.75rem;
    }

    fieldset {
      margin-block: 1rem;
    }

    input:not([type="checkbox"]) {
      display: block;
      width: min(100%, 30rem);
      padding: 0.4rem;
    }

    output,
    pre {
      display: block;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .note {
      color: #444;
    }
  </style>
</head>
<body>
  <main>
    <h1>GET 查询条目观察器</h1>
    <p class="note">
      本页提交到当前文档。结果出现在地址栏，但这不证明远端服务处理了查询。
    </p>

    <form
      id="search-form"
      method="get"
      target="_self"
      accept-charset="UTF-8"
      autocomplete="on"
    >
      <p>
        <label for="query">搜索商品</label>
        <input
          id="query"
          name="q"
          value="阅读 台灯"
          required
          autocomplete="off"
        >
      </p>

      <fieldset>
        <legend>交接方式</legend>
        <label>
          <input
            type="checkbox"
            name="handoff"
            value="pickup"
            checked
          >
          到店自提
        </label>
        <label>
          <input
            type="checkbox"
            name="handoff"
            value="meetup"
            checked
          >
          公共地点见面
        </label>
        <label>
          <input
            type="checkbox"
            name="handoff"
            value="delivery"
          >
          同城配送
        </label>
      </fieldset>

      <p>
        <label for="source">查询来源（只读，仍会出现）</label>
        <input
          id="source"
          name="source"
          value="html-lesson"
          readonly
        >
      </p>

      <p>
        <label for="disabled-experiment">
          禁用实验字段（不会出现）
        </label>
        <input
          id="disabled-experiment"
          name="disabledExperiment"
          value="should-not-appear"
          disabled
        >
      </p>

      <p>
        <label for="missing-name">
          无 name 实验字段（不会出现）
        </label>
        <input
          id="missing-name"
          value="visible-but-unnamed"
        >
      </p>

      <button type="submit" name="intent" value="search">
        观察 GET 查询
      </button>
    </form>

    <section aria-labelledby="result-title">
      <h2 id="result-title">当前地址中的结果</h2>
      <p>
        原始查询串：
        <output id="raw-query">(尚未提交)</output>
      </p>
      <p>解析后的有序条目：</p>
      <pre id="parsed-entries">[]</pre>
      <p>
        handoff 的全部值：
        <output id="handoff-values">[]</output>
      </p>
    </section>
  </main>

  <script>
    const rawQueryOutput = document.querySelector("#raw-query");
    const entriesOutput = document.querySelector("#parsed-entries");
    const handoffOutput = document.querySelector("#handoff-values");
    const params = new URLSearchParams(window.location.search);
    const entries = Array.from(params.entries());
    const allowedHandoff = new Set(["pickup", "meetup", "delivery"]);

    if (window.location.search) {
      rawQueryOutput.value = window.location.search;
      entriesOutput.textContent = JSON.stringify(entries, null, 2);
      handoffOutput.value = JSON.stringify(params.getAll("handoff"));

      console.assert(
        typeof params.get("q") === "string" &&
          params.get("q").trim() !== ""
      );
      console.assert(
        params.getAll("handoff").every((value) => {
          return allowedHandoff.has(value);
        })
      );
      console.assert(params.get("source") === "html-lesson");
      console.assert(params.get("intent") === "search");
      console.assert(!params.has("disabledExperiment"));
      console.assert(!params.has("missing-name"));
    }
  </script>
</body>
</html>
```

### 6.3 打开与运行

最简单方式：

1. 保存文件；
2. 用浏览器直接打开；
3. 保持默认值；
4. 点击“观察 GET 查询”；
5. 查看地址栏、页面结果和 Console。

也可以在 `practice/html-05-submission/` 目录运行：

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000/query-observer.html
```

本地服务器只用于稳定地打开练习文件。这个案例没有业务后端，不应把页面重新加载描述成“服务器搜索成功”。

### 6.4 提交前预测

默认状态下应预测：

```text
q = 阅读 台灯
handoff = pickup
handoff = meetup
source = html-lesson
intent = search
```

不会出现：

```text
handoff = delivery
disabledExperiment = should-not-appear
missing-name = visible-but-unnamed
```

### 6.5 预期结果

地址栏查询部分应包含与下面等价的内容：

```text
?q=%E9%98%85%E8%AF%BB+%E5%8F%B0%E7%81%AF&handoff=pickup&handoff=meetup&source=html-lesson&intent=search
```

具体 URL 的路径部分取决于打开方式。查询条目的顺序应与成功控件构造顺序一致，但调试时应按名称和值判断，不要把整条 URL 当成难以解释的截图。

页面显示：

```json
[
  ["q", "阅读 台灯"],
  ["handoff", "pickup"],
  ["handoff", "meetup"],
  ["source", "html-lesson"],
  ["intent", "search"]
]
```

Console 断言无失败。

### 6.6 失败证据

| 现象 | 证据 | 优先检查 |
| --- | --- | --- |
| 地址栏没有 `?` 查询 | 点击后 URL 未变化 | 按钮类型、表单方法、原生提交是否被扩展拦截 |
| `q` 缺失 | `params.has("q")` 为 false | `name="q"` 是否存在且非空 |
| `handoff` 只有一个值 | `getAll()` 长度为 1 | 第二项是否选中；是否误用 `get()` |
| 禁用字段意外出现 | `params.has("disabledExperiment")` 为 true | 实际运行文件是否与代码一致；是否由脚本手工追加 |
| 无名字段意外出现 | 查询里出现 `missing-name` | 是否给它新增了 `name` |
| 中文显示错误 | 地址或解析文字乱码 | 文件 UTF-8 保存、`meta charset`、环境编码 |
| 断言失败但页面看似正常 | Console 有 Assertion failed | 实际输入已改；断言仍按默认值判断 |

断言只针对默认初始路径。修改查询词或选项后，应更新自己的预期，不要为了消除断言而硬改数据。

### 6.7 渐进扩展：提交前显示将要使用的查询串

原生 GET 最适合观察最终地址栏。下一步可以在不取消提交的前提下，监听表单的 `formdata` 事件或按钮点击来显示预测。初学阶段更清楚的做法是增加一个普通按钮：

```html
<button type="button" id="inspect-query">
  先检查查询串
</button>
<output id="query-preview"></output>
```

脚本：

```js
const searchForm = document.querySelector("#search-form");
const inspectButton = document.querySelector("#inspect-query");
const preview = document.querySelector("#query-preview");

inspectButton.addEventListener("click", () => {
  const data = new FormData(searchForm);
  const params = new URLSearchParams(data);
  preview.value = `?${params.toString()}`;
});
```

这个预览不含 submit 按钮条目，因为它没有触发表单提交，也没有把一个提交者传给 `FormData`。这正好用于解释：“表单字段快照”与“某次带提交者的提交”不是完全相同的概念。

### 6.8 文件、运行、预期与失败证据清单

| 项目 | 记录内容 |
| --- | --- |
| 文件 | `practice/html-05-submission/query-observer.html` |
| 运行 | 直接打开，或 `python3 -m http.server 8000` |
| 触发 | 默认值下点击“观察 GET 查询” |
| 预期 | 5 个条目；`handoff` 有 2 个值 |
| 成功证据 | 地址栏、页面 JSON、`getAll()` 与无失败断言 |
| 失败证据 | 缺失名称、错误数量、乱码、断言信息 |
| 未证明 | 服务器收到查询、搜索真实商品或保存任何内容 |

## 7. 邻里集市集成案例

### 7.1 案例范围

现在建立邻里集市商品发布预览。它要满足：

- 表单声明 `method="post"`，表达发布是状态改变意图；
- `submit` 事件始终被取消；
- 按钮初始禁用，只有拦截器安装成功后才启用；
- 标题有 `name`，价格字段使用 `priceCents`；
- 价格从字符串转换为非负安全整数；
- 两个同名 `handoff` 默认选中，一个默认未选中；
- `sellerCode` 只读，仍进入条目；
- `moderationNote` 禁用，不进入条目；
- `notify` 未选中时不产生条目；
- 两个提交按钮通过 `event.submitter` 和 `intent` 区分；
- 生成的 `createdAt` 使用 `new Date().toISOString()`，只是客户端预览时间；
- 页面持续显示“未发送、未保存”；
- `requestSubmit()` 走同一验证与事件路径；
- 不调用 `submit()`、`fetch()`、XHR 或 Beacon。

### 7.2 提交前的数据契约

领域对象使用：

```js
{
  title: "阅读台灯",
  priceCents: 3900,
  category: "home",
  handoffMethods: ["pickup", "meetup"],
  sellerCode: "seller-demo-17",
  notify: false,
  intent: "preview",
  createdAt: "2026-10-10T12:34:56.789Z"
}
```

最后一项只是格式示例。实际运行值取当前时刻，必须满足：

```js
createdAt === new Date(createdAt).toISOString()
```

且以 `Z` 结尾。真实系统的权威创建时间应由可信服务端生成；本课没有服务端。

### 7.3 文件与完整代码

文件：

```text
practice/html-05-submission/market-publish-preview.html
```

内容：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市商品发布预览</title>
  <style>
    :root {
      color-scheme: light;
      font-family: system-ui, sans-serif;
      line-height: 1.6;
    }

    body {
      max-width: 56rem;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    form,
    .evidence,
    .preview {
      margin-block: 1rem;
      padding: 1rem;
      border: 1px solid #aaa;
      border-radius: 0.6rem;
    }

    label {
      display: block;
      margin-block: 0.75rem;
    }

    input:not([type="checkbox"]),
    select {
      display: block;
      width: min(100%, 32rem);
      box-sizing: border-box;
      padding: 0.45rem;
    }

    fieldset {
      margin-block: 1rem;
    }

    button {
      margin: 0.25rem;
      padding: 0.55rem 0.8rem;
    }

    output,
    pre {
      display: block;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .boundary {
      padding: 0.75rem;
      border-inline-start: 0.35rem solid #8b3f00;
      background: #fff5e8;
    }

    .status {
      font-weight: 700;
    }
  </style>
</head>
<body>
  <main>
    <h1>邻里集市商品发布预览</h1>

    <p class="boundary" id="boundary-note">
      教学边界：本页不发出发布请求，不认证用户，不保存数据，
      也不提供 CSRF 防护、服务端验证或并发控制。
    </p>

    <form
      id="publish-form"
      action="./market-listings"
      method="post"
      enctype="application/x-www-form-urlencoded"
      target="_self"
      accept-charset="UTF-8"
      autocomplete="on"
      aria-describedby="boundary-note"
    >
      <p>
        <label for="listing-title">商品标题</label>
        <input
          id="listing-title"
          name="title"
          value="阅读台灯"
          required
          autocomplete="off"
        >
      </p>

      <p>
        <label for="price-cents">价格（整数分）</label>
        <input
          id="price-cents"
          type="number"
          name="priceCents"
          value="3900"
          min="0"
          step="1"
          required
          inputmode="numeric"
        >
      </p>

      <p>
        <label for="category">分类</label>
        <select id="category" name="category" required>
          <option value="">请选择</option>
          <option value="home" selected>家居</option>
          <option value="books">图书</option>
          <option value="digital">数码</option>
        </select>
      </p>

      <fieldset>
        <legend>交接方式（同名多值）</legend>
        <label>
          <input
            type="checkbox"
            name="handoff"
            value="pickup"
            checked
          >
          到店自提
        </label>
        <label>
          <input
            type="checkbox"
            name="handoff"
            value="meetup"
            checked
          >
          公共地点见面
        </label>
        <label>
          <input
            type="checkbox"
            name="handoff"
            value="delivery"
          >
          同城配送
        </label>
      </fieldset>

      <p>
        <label for="seller-code">卖家演示编号（只读）</label>
        <input
          id="seller-code"
          name="sellerCode"
          value="seller-demo-17"
          readonly
        >
      </p>

      <p>
        <label>
          <input type="checkbox" name="notify" value="yes">
          本地预览完成时显示提醒意图
        </label>
      </p>

      <p>
        <label for="moderation-note">
          审核备注（禁用，仅用于观察省略）
        </label>
        <input
          id="moderation-note"
          name="moderationNote"
          value="internal-only"
          disabled
        >
      </p>

      <p>
        <button
          id="preview-button"
          type="submit"
          name="intent"
          value="preview"
          disabled
        >
          生成本地预览
        </button>
        <button
          id="publish-intent-button"
          type="submit"
          name="intent"
          value="publish"
          disabled
        >
          检查发布意图
        </button>
        <button
          id="request-preview"
          type="button"
          disabled
        >
          用 requestSubmit() 预览
        </button>
      </p>
    </form>

    <p class="status" role="status" id="status">
      正在安装本地提交拦截器，提交按钮暂不可用。
    </p>

    <section class="evidence" aria-labelledby="evidence-title">
      <h2 id="evidence-title">提交证据</h2>
      <p>
        submit 事件次数：
        <output id="submit-count">0</output>
      </p>
      <p>
        本次提交者：
        <output id="submitter-output">(无)</output>
      </p>
      <p>
        事件是否已取消：
        <output id="prevented-output">false</output>
      </p>
      <p>FormData.entries()：</p>
      <pre id="entries-output">[]</pre>
      <p>
        FormData.get("handoff")：
        <output id="handoff-first">(无)</output>
      </p>
      <p>
        FormData.getAll("handoff")：
        <output id="handoff-all">[]</output>
      </p>
      <p>
        文本查询预览（仅观察，不发送）：
        <output id="params-output">(无)</output>
      </p>
    </section>

    <section class="preview" aria-labelledby="preview-title">
      <h2 id="preview-title">本地 Listing 预览</h2>
      <pre id="listing-output">(尚未生成)</pre>
    </section>
  </main>

  <script>
    const form = document.querySelector("#publish-form");
    const previewButton = document.querySelector("#preview-button");
    const publishIntentButton = document.querySelector(
      "#publish-intent-button"
    );
    const requestPreviewButton = document.querySelector("#request-preview");
    const status = document.querySelector("#status");
    const submitCountOutput = document.querySelector("#submit-count");
    const submitterOutput = document.querySelector("#submitter-output");
    const preventedOutput = document.querySelector("#prevented-output");
    const entriesOutput = document.querySelector("#entries-output");
    const handoffFirstOutput = document.querySelector("#handoff-first");
    const handoffAllOutput = document.querySelector("#handoff-all");
    const paramsOutput = document.querySelector("#params-output");
    const listingOutput = document.querySelector("#listing-output");

    let submitCount = 0;

    function requireText(data, name) {
      const value = data.get(name);

      if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${name} 必须是非空文本`);
      }

      return value.trim();
    }

    function parsePriceCents(data) {
      const rawValue = data.get("priceCents");

      if (typeof rawValue !== "string" || rawValue.trim() === "") {
        throw new TypeError("priceCents 缺失");
      }

      const priceCents = Number(rawValue);

      if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
        throw new TypeError("priceCents 必须是非负安全整数");
      }

      return priceCents;
    }

    function createListing(data) {
      const createdAt = new Date().toISOString();

      const listing = {
        title: requireText(data, "title"),
        priceCents: parsePriceCents(data),
        category: requireText(data, "category"),
        handoffMethods: data.getAll("handoff").map(String),
        sellerCode: requireText(data, "sellerCode"),
        notify: data.has("notify"),
        intent: requireText(data, "intent"),
        createdAt
      };

      if (listing.handoffMethods.length === 0) {
        throw new TypeError("至少选择一种交接方式");
      }

      console.assert(Number.isSafeInteger(listing.priceCents));
      console.assert(listing.createdAt.endsWith("Z"));
      console.assert(
        new Date(listing.createdAt).toISOString() === listing.createdAt
      );

      return listing;
    }

    function describeEntries(data) {
      return Array.from(data.entries(), ([name, value]) => {
        if (value instanceof File) {
          return [
            name,
            {
              fileName: value.name,
              type: value.type,
              size: value.size
            }
          ];
        }

        return [name, value];
      });
    }

    function createTextParams(data) {
      const params = new URLSearchParams();

      for (const [name, value] of data.entries()) {
        if (typeof value === "string") {
          params.append(name, value);
        }
      }

      return params;
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitCount += 1;

      const submitter = event.submitter;
      const data = submitter
        ? new FormData(form, submitter)
        : new FormData(form);

      submitCountOutput.value = String(submitCount);
      submitterOutput.value = submitter
        ? `${submitter.name}=${submitter.value}`
        : "(无具体按钮)";
      preventedOutput.value = String(event.defaultPrevented);
      entriesOutput.textContent = JSON.stringify(
        describeEntries(data),
        null,
        2
      );
      handoffFirstOutput.value = String(data.get("handoff"));
      handoffAllOutput.value = JSON.stringify(data.getAll("handoff"));
      paramsOutput.value = createTextParams(data).toString();

      const titleInput = document.querySelector("#listing-title");
      const sellerCodeInput = document.querySelector("#seller-code");
      const notifyInput = form.querySelector('input[name="notify"]');
      const selectedHandoff = Array.from(
        form.querySelectorAll('input[name="handoff"]:checked'),
        (control) => control.value
      );

      console.assert(event.defaultPrevented);
      console.assert(data.get("title") === titleInput.value);
      console.assert(data.get("sellerCode") === sellerCodeInput.value);
      console.assert(!data.has("moderationNote"));
      console.assert(data.has("notify") === notifyInput.checked);
      console.assert(
        JSON.stringify(data.getAll("handoff")) ===
          JSON.stringify(selectedHandoff)
      );
      console.assert(
        !submitter || data.get("intent") === submitter.value
      );

      try {
        const listing = createListing(data);
        listingOutput.textContent = JSON.stringify(listing, null, 2);
        status.textContent =
          "本地预览已生成；没有发出请求，也没有保存到服务器。";
      } catch (error) {
        listingOutput.textContent = "(未生成)";
        status.textContent =
          error instanceof Error ? error.message : "本地预览失败";
      }
    });

    requestPreviewButton.addEventListener("click", () => {
      form.requestSubmit(previewButton);
    });

    // 先安装所有监听器，再开放提交入口，避免脚本失败时误发教学表单。
    previewButton.disabled = false;
    publishIntentButton.disabled = false;
    requestPreviewButton.disabled = false;
    status.textContent =
      "本地拦截器已安装。可以生成预览；任何按钮都不会发送请求。";
  </script>
</body>
</html>
```

### 7.4 为什么按钮先禁用

发布表单声明了：

```html
action="./market-listings"
method="post"
```

但课程没有这个服务。如果脚本存在语法错误，`submit` 拦截器不会安装。让提交按钮在 HTML 中默认可用，会导致学习者点击后尝试导航或发送 POST。

因此采用：

```text
HTML 初始 disabled
  ↓
脚本查询节点并注册 submit/click 监听器
  ↓
最后移除 disabled
```

这个设计只降低教学误操作风险，不是安全边界。用户仍可修改 DOM；真实服务不能依赖按钮是否禁用。

### 7.5 默认提交预测

点击“生成本地预览”前，先写下：

```text
title = 阅读台灯
priceCents = 3900
category = home
handoff = pickup
handoff = meetup
sellerCode = seller-demo-17
intent = preview
```

省略：

```text
handoff = delivery
notify = yes
moderationNote = internal-only
```

解释：

- `delivery` 与 `notify` 未选中；
- `moderationNote` 禁用；
- `sellerCode` 只读但启用；
- 预览按钮是 submitter；
- 另一个 submit 按钮不是 submitter。

### 7.6 打开与运行

推荐在练习目录运行：

```bash
python3 -m http.server 8000
```

访问：

```text
http://localhost:8000/market-publish-preview.html
```

打开开发者工具：

1. Network 面板清空已有记录；
2. 保持默认值；
3. 点击“生成本地预览”；
4. 查看页面证据、Console 和 Network；
5. 再点击“检查发布意图”；
6. 再点击“用 requestSubmit() 预览”。

### 7.7 默认预期结果

第一次点击预览：

- `submit` 事件次数为 `1`；
- 提交者为 `intent=preview`；
- `event.defaultPrevented` 为 `true`；
- `entries()` 有 7 个条目，其中 `handoff` 出现两次；
- `get("handoff")` 是 `"pickup"`；
- `getAll("handoff")` 是 `["pickup", "meetup"]`；
- 不存在 `moderationNote` 和 `notify`；
- `priceCents` 在 Listing 中是数字 `3900`，不是字符串；
- `createdAt` 是以 `Z` 结尾的 UTC ISO 字符串；
- 状态明确写着未发送、未保存；
- Network 面板没有由该提交产生的 `market-listings` 请求。

Listing 形状类似：

```json
{
  "title": "阅读台灯",
  "priceCents": 3900,
  "category": "home",
  "handoffMethods": [
    "pickup",
    "meetup"
  ],
  "sellerCode": "seller-demo-17",
  "notify": false,
  "intent": "preview",
  "createdAt": "2026-10-10T12:34:56.789Z"
}
```

时间值以实际运行结果为准。

第二次点击“检查发布意图”：

- 事件次数加一；
- 提交者变为 `intent=publish`；
- Listing 的 `intent` 变为 `"publish"`；
- 仍然只生成本地预览；
- 没有真实发布成功状态。

第三次点击 `requestSubmit()` 按钮：

- 它本身是 `type="button"`，不会成为提交者；
- 监听器调用 `form.requestSubmit(previewButton)`；
- 原生约束验证正常执行；
- 验证通过后 `submit` 事件再次触发；
- `event.submitter` 是预览按钮；
- `intent=preview` 出现在 `FormData`。

### 7.8 验证 `requestSubmit()` 的约束与事件行为

清空商品标题，再点击“用 requestSubmit() 预览”。

预期：

- 浏览器阻止提交过程继续；
- `submit` 事件次数不增加；
- 标题控件出现原生无效提示或获得焦点，具体视觉由浏览器决定；
- Network 没有请求；
- 旧预览不会被描述成新一次成功。

填写标题，再次点击：

- 事件次数增加；
- 提交者是预览按钮；
- 本地预览刷新。

这证明 `requestSubmit()` 走约束验证和 `submit` 事件。不要为了“比较”在本页运行：

```js
form.submit();
```

它会绕过拦截事件，并可能尝试原生提交。

### 7.9 渐进扩展：让“无交接方式”有可见恢复路径

当前 HTML 没有给 checkbox 组添加原生 `required`，领域转换函数会在全部未选中时抛出错误。可以渐进增强为：

```js
function readHandoffMethods(data) {
  const values = data.getAll("handoff").map(String);

  if (values.length === 0) {
    return {
      ok: false,
      message: "至少选择一种交接方式"
    };
  }

  return {
    ok: true,
    values
  };
}
```

再把错误显示在 fieldset 附近，并把焦点移到第一项。完整自定义验证、错误汇总和首个无效控件恢复会在本章第 4 课展开。

扩展时仍应保持：

- `event.preventDefault()` 在处理器最前面执行；
- 按钮只在拦截器安装后启用；
- 不调用网络 API；
- 不把客户端检查描述成服务端验证；
- `priceCents` 仍是整数；
- `createdAt` 仍是 UTC ISO 预览值；
- 修复错误后能够沿同一路径再次提交。

### 7.10 纯 `FormData` 行为断言

浏览器从 HTML 表单构造 `FormData` 的部分必须在浏览器验证。`FormData` 自身的同名多值、`get()`、`getAll()` 和 `URLSearchParams` 文本序列化可以用支持 Web API 的 Node.js 做纯行为复验：

```js
const data = new FormData();

data.append("title", "阅读台灯");
data.append("priceCents", "3900");
data.append("handoff", "pickup");
data.append("handoff", "meetup");

console.assert(data.get("handoff") === "pickup");
console.assert(
  JSON.stringify(data.getAll("handoff")) ===
    JSON.stringify(["pickup", "meetup"])
);
console.assert(Array.from(data.entries()).length === 4);

const params = new URLSearchParams(data);

console.assert(
  params.toString() ===
    "title=%E9%98%85%E8%AF%BB%E5%8F%B0%E7%81%AF" +
      "&priceCents=3900" +
      "&handoff=pickup" +
      "&handoff=meetup"
);
```

它不能证明 disabled、readonly 或 checkbox 的浏览器 entry-list 规则，因为这个纯测试是手工 `append()`；那些规则必须由完整页面与真实表单控件观察。

### 7.11 文件、运行、预期与失败证据清单

| 项目 | 记录内容 |
| --- | --- |
| 文件 | `practice/html-05-submission/market-publish-preview.html` |
| 运行 | 本地静态服务器，现代浏览器 |
| 初始安全状态 | 三个操作按钮均禁用 |
| 脚本就绪状态 | 监听器安装后按钮启用，状态文字更新 |
| 默认预期 | 7 个条目、2 个 handoff、整数 `3900`、UTC ISO |
| 事件证据 | submit 次数、submitter、`defaultPrevented=true` |
| 省略证据 | 无 `moderationNote`、无 `notify` |
| 无请求证据 | Network 无 `market-listings` 请求 |
| 失败证据 | 原生无效提示、页面错误文字、断言失败、意外请求 |
| 未实现 | 网络发布、认证、保存、CSRF 防护、服务端验证、并发 |

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

### 8.5 故障四：`get()` 丢掉同名值

**错误代码：**

```js
const handoffMethods = [data.get("handoff")];
```

这只保留第一个值，还可能得到 `[null]`。

修复：

```js
const handoffMethods = data.getAll("handoff").map(String);
```

复验：

```js
console.assert(handoffMethods.length === 2);
console.assert(handoffMethods[0] === "pickup");
console.assert(handoffMethods[1] === "meetup");
```

### 8.6 故障五：`Object.fromEntries()` 覆盖多值

**错误代码：**

```js
const values = Object.fromEntries(data.entries());
```

当存在两个 `handoff` 条目时，对象只能保留一个 `handoff` 属性。

修复方式一，逐字段读取：

```js
const listingInput = {
  title: data.get("title"),
  handoffMethods: data.getAll("handoff")
};
```

修复方式二，明确哪些键是多值：

```js
function formDataToRecord(data, multiValueNames) {
  const record = {};

  for (const name of new Set(data.keys())) {
    record[name] = multiValueNames.has(name)
      ? data.getAll(name)
      : data.get(name);
  }

  return record;
}

const values = formDataToRecord(
  data,
  new Set(["handoff"])
);
```

这仍只是客户端转换，不是通用服务端模型。

### 8.7 故障六：程序化 `.click()` 选错意图

下面虽然走按钮激活路径，但把业务意图硬编码到了某个按钮：

```js
document.querySelector("#publish-intent-button").click();
```

若代码真正想表达“请求预览提交”，更清楚的是：

```js
form.requestSubmit(previewButton);
```

两者都可能触发提交，但 `requestSubmit()` 直接表达表单 API 意图，并验证参数确实是该表单的提交按钮。

### 8.8 故障七：调用 `submit()` 后拦截器没有运行

**现象：**

- `submit` 日志没有增加；
- `preventDefault()` 没有执行；
- 页面尝试导航或发送；
- 无效控件也没有阻止直接提交。

**根因：**

`form.submit()` 绕过交互式约束验证和 `submit` 事件。

**修复：**

```js
form.requestSubmit(previewButton);
```

还要排查是否存在：

```html
<input name="submit">
```

它会遮蔽 `form.submit` 属性。修复字段命名，不要把调用原型方法作为继续绕过事件的理由。

### 8.9 故障八：把 `novalidate` 当成“自定义验证已完成”

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

### 8.10 故障九：把 File 放进 `URLSearchParams`

**错误代码：**

```js
const params = new URLSearchParams(new FormData(fileForm));
```

如果 `FormData` 含 `File`，查询参数得到的是字符串化结果，不是文件内容上传。

修复：

- 查询参数只使用明确的文本字段；
- 文件传输使用正确的 `multipart/form-data` 链路；
- 本课不实现上传。

### 8.11 故障十：用 GET 表达发布

**错误代码：**

```html
<form action="/listings" method="get">
  <button type="submit">发布商品</button>
</form>
```

问题不只是“参数出现在地址栏”。GET 应用于无副作用读取，浏览器、缓存、爬虫或预取机制可能加载 URL。发布是状态改变意图，应使用适当方法和服务端协议。

本课的 POST 表单仍被拦截，所以只表达语义，不声称真实状态改变。

### 8.12 故障十一：价格仍是字符串或浮点元

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

### 8.13 故障十二：把本地时间字符串直接加 `Z`

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

### 8.14 一张快速诊断表

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

### 9.3 API 题

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

### 9.4 答案

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

### 10.1 基础练习：建立筛选查询表单

创建：

```text
practice/html-05-submission/exercise-query.html
```

要求：

- `method="get"`，提交到当前页面；
- 搜索词名为 `q`；
- 分类名为 `category`；
- 三个同名 `condition` checkbox，至少默认选中两个；
- 一个只读 `source=exercise`；
- 一个未选中的 `availableOnly=yes`；
- 提交按钮为 `intent=filter`；
- 页面重新加载后用 `URLSearchParams` 显示原始查询和全部条目；
- 显示 `condition` 的 `getAll()`；
- 不添加网络 API。

参考核心结构：

```html
<form method="get" accept-charset="UTF-8">
  <label>
    关键词
    <input name="q" value="书桌">
  </label>

  <label>
    <input
      type="checkbox"
      name="condition"
      value="like-new"
      checked
    >
    几乎全新
  </label>

  <label>
    <input
      type="checkbox"
      name="condition"
      value="good"
      checked
    >
    使用良好
  </label>

  <button type="submit" name="intent" value="filter">
    筛选
  </button>
</form>
```

完成标准：

- [ ] 提交前写出条目预测；
- [ ] 地址栏与预测一致；
- [ ] `condition` 重复出现；
- [ ] 未选中项没有条目；
- [ ] 只读来源出现；
- [ ] 页面显示解码后的值；
- [ ] 记录文件、运行方法、预期和一次失败证据。

### 10.2 进阶练习：两个提交意图共用转换函数

在本课发布预览基础上增加“保存草稿意图”按钮：

```html
<button
  type="submit"
  name="intent"
  value="draft"
  formnovalidate
>
  检查草稿意图
</button>
```

要求：

- 所有提交都先 `preventDefault()`；
- 用 `event.submitter` 显示触发按钮；
- 使用 `new FormData(form, event.submitter)`；
- `preview` 和 `publish` 继续经过原生验证；
- `draft` 演示 `formnovalidate` 跳过交互式验证，但页面必须标注“未校验草稿输入”；
- 不把草稿检查描述成保存；
- 多值使用 `getAll()`；
- 整数分转换只在需要生成完整 Listing 时执行；
- 不能调用 `submit()`。

参考分支：

```js
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const submitter = event.submitter;
  const data = submitter
    ? new FormData(form, submitter)
    : new FormData(form);
  const intent = data.get("intent");

  if (intent === "draft") {
    showDraftInspection(data);
    return;
  }

  showValidatedPreview(createListing(data));
});
```

答案标准：

- [ ] 空标题点击 preview 时不触发 `submit`；
- [ ] 空标题点击 draft 时可触发 `submit`；
- [ ] draft 状态明确是未校验、未保存；
- [ ] 每种按钮的 `intent` 正确；
- [ ] 没有任何请求；
- [ ] 恢复合法值后 preview 仍可工作。

### 10.3 故障注入练习：同时制造四类遗漏

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

### 10.4 证据提交格式

每个练习至少提交：

```text
文件：
打开或运行命令：
初始控件状态：
预测 entries：
实际 entries：
submitter：
原始查询或本地预览：
预期结果：
失败证据：
根因：
修复：
复验结果：
Network 观察：
未验证内容：
```

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

### 11.2 GET 提交验收

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

### 11.3 发布预览验收

- [ ] 使用 POST 语义，但所有 `submit` 事件都立即取消；
- [ ] Network 无 `market-listings` 请求；
- [ ] `event.submitter` 与按钮意图一致；
- [ ] `new FormData(form, submitter)` 包含按钮条目；
- [ ] `entries()` 显示完整有序条目；
- [ ] `get()` 与 `getAll()` 的差异可见；
- [ ] `sellerCode` 只读且出现；
- [ ] `moderationNote` 禁用且省略；
- [ ] `notify` 未选中时省略，并转换为布尔 false；
- [ ] `priceCents` 是非负安全整数 `3900`；
- [ ] `createdAt` 是可往返的 UTC ISO 字符串；
- [ ] 页面明确“未发送、未保存”；
- [ ] 未出现认证、权限、CSRF、服务端验证或并发已实现的描述。

### 11.4 `requestSubmit()` 验收

- [ ] 空标题时 `requestSubmit(previewButton)` 被原生约束阻止；
- [ ] 约束失败时 `submit` 事件次数不增加；
- [ ] 修复标题后 `submit` 事件触发；
- [ ] `event.submitter` 是传入按钮；
- [ ] `intent=preview` 出现在数据中；
- [ ] 没有调用 `form.submit()`；
- [ ] 能口头解释 `submit()` 为什么绕过约束验证和事件。

### 11.5 故障恢复验收

- [ ] 删除 `name` 后能用 `has()` 证明字段缺失；
- [ ] 恢复 `name` 后同一路径复验通过；
- [ ] 添加 `disabled` 后能证明价格缺失；
- [ ] 根据字段契约选择 readonly 或可信数据源，而不是提交前偷启用；
- [ ] 同名值不会经过 `Object.fromEntries()` 静默丢失；
- [ ] 未选中 checkbox 不被误认为字符串 `"false"`；
- [ ] 每个故障都有“输入、观察、根因、修复、复验”。

### 11.6 自动检查建议

在课程仓库中可检查 Markdown 结构：

```bash
python3 - <<'PY'
from pathlib import Path
import re

lesson = Path(
    "web-fullstack-course/01-html/05-forms-validation/"
    "01-form-submission-successful-controls.md"
)
text = lesson.read_text()
fence = chr(96) * 3
visible = re.sub(rf"{fence}.*?{fence}", "", text, flags=re.S)
expected = [str(index) for index in range(1, 14)]
actual = re.findall(r"^## ([0-9]+)\.", visible, flags=re.M)

assert actual == expected, actual
assert "## 任务卡" in visible
assert "## 我现在能做到什么" in visible
assert "## 单元导航" in visible
assert text.count(fence) % 2 == 0
assert not re.search(
    r"\b(?:TO[D]O|TB[D]|FIX[M]E|WI[P])\b|待完[善]|自行补[充]|占位[符]",
    visible,
    flags=re.I,
)
print("structure PASS")
PY
```

完整 HTML 的 `<script>` 内容应提取到 `/tmp` 后运行：

```bash
node --check /tmp/query-observer.js
node --check /tmp/market-publish-preview.js
node /tmp/formdata-behavior.js
```

预期：

```text
两个 node --check 命令静默退出，状态码为 0
FormData behavior PASS
```

Node 语法检查不提供 DOM，也不替代浏览器交互验证。纯 `FormData` 测试也不能替代 disabled、readonly、checked 和 submitter 的真实表单检查。

### 11.7 一票否决项

出现以下任一项，本课不能验收：

- 发布预览产生真实请求；
- 用 `submit()` 绕过拦截器；
- 把页面预览写成“发布成功”；
- 价格在领域对象中仍为字符串或浮点元；
- UTC 字符串由本地时间直接拼 `Z`；
- 同名多值静默丢失；
- 缺少 `name` 后用无条件 `append()` 掩盖；
- 把 disabled/readonly 当成权限；
- 把 POST 当成加密；
- 声称已有认证、持久化、CSRF 防护、服务端验证或并发控制。

## 12. 常见问题

### Q1：表单控件有 `id`，为什么还要 `name`？

`id` 标识文档节点并关联 label；`name` 是提交条目的名称。两者可以相同，但职责不同。

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

### Q8：`text/plain` 是否更容易调试？

有时看起来更直观，但它不是稳健的常规接口格式，名称和值中的换行等内容可能产生歧义。

### Q9：`target="_blank"` 会让提交更安全吗？

不会。它只改变结果加载位置，也会改变焦点和导航体验。

### Q10：`accept-charset` 可以写 GBK 和 UTF-8 两个值吗？

现代规范只允许一个 `UTF-8` 值。旧教程中的多编码写法不应用于新页面。

### Q11：`autocomplete="off"` 能保证浏览器不填值吗？

不能绝对保证。它是提示，浏览器和密码管理器可能采用自己的策略。

### Q12：`novalidate` 会让 `required` 属性失效吗？

它让该提交跳过交互式约束验证；控件的有效性概念仍存在。它也不等于服务端接受值。

### Q13：为什么 readonly 值会提交？

只读限制用户编辑，但控件仍启用并保留提交名称和值。它不能用作防篡改机制。

### Q14：为什么 disabled 值不提交？

禁用控件被排除在 entry list 之外，也通常不参与焦点和约束验证。

### Q15：未选中的 checkbox 如何表示 false？

浏览器不产生条目。读取边界可用 `data.has("notify")` 明确映射为布尔值。

### Q16：同名字段是不是错误？

不是。checkbox、多选和重复参数常有意使用同名多值；数据模型必须明确它是数组。

### Q17：为什么 `FormData.get()` 不返回数组？

它定义为返回第一个值。需要全部值时使用 `getAll()`。

### Q18：`FormData` 可以直接 `JSON.stringify()` 吗？

不能得到预期条目对象。应先通过 `entries()`、逐字段读取或明确转换，并处理重复名称和 `File`。

### Q19：为什么不统一用 `Object.fromEntries()`？

它会让重复名称互相覆盖，无法保留同名多值。

### Q20：`URLSearchParams` 能处理 File 吗？

不能承载文件二进制。文件值会被字符串化，不等于上传。

### Q21：空字符串和缺失字段有何不同？

`data.has(name)` 可区分。存在空字符串表示控件产生了条目但值为空；缺失表示根本没有条目。

### Q22：按 Enter 提交时 `event.submitter` 一定是谁？

隐式提交规则与表单结构有关，不应凭感觉假定。实际观察 `event.submitter`，并保持清楚的默认提交按钮。

### Q23：`requestSubmit()` 不传按钮可以吗？

可以，但没有具体按钮作为 submitter，因此不要期待某个按钮的名称、值或覆盖属性自动生效。

### Q24：为什么 `requestSubmit()` 可能抛异常？

传入对象必须是提交按钮，并且属于该表单；类型不对可抛 `TypeError`，不属于表单可抛 `NotFoundError`。

### Q25：什么时候应该用 `submit()`？

它是平台底层 API，但会绕过验证和 `submit` 事件。应用想复用正常用户提交路径时优先使用 `requestSubmit()`；本课的拦截式案例不使用 `submit()`。

### Q26：按钮文字会成为提交值吗？

对于本课的 `<button name="intent" value="preview">`，提交值来自 `value`，可见文字只是按钮标签。

### Q27：按钮没有 `name` 会怎样？

它仍可成为 `event.submitter` 并触发提交，但不会以普通名称—值条目加入数据。

### Q28：把按钮设为 disabled 后还能成为提交者吗？

禁用按钮不能通过正常用户激活成为提交者。脚本调用 `requestSubmit(disabledButton)` 的具体流程不应被用来绕过界面状态；先建立清楚、可用的状态机。

### Q29：价格为什么不用 `39.00`？

邻里集市教学模型规定用整数分，`3900` 可避免常见二进制浮点金额误差，并让单位明确。

### Q30：客户端生成的 `createdAt` 可以作为真实创建时间吗？

不能作为权威值。用户设备时间可错误或被修改；本课只用它展示 UTC ISO 格式。

### Q31：Network 没有请求能证明什么？

能支持“本次浏览器操作未发出目标请求”的观察，不能证明系统拥有认证、保存或服务端验证。

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

我已经能从 `form` 配置、控件名称、当前值、禁用/只读/选中状态和提交者出发，在运行前预测 entry list；能用 `FormData` 与 `URLSearchParams` 保存同名多值并建立可见证据；能区分 GET 查询、POST 意图、`requestSubmit()` 和 `submit()`；也能诊断缺少 `name`、误用 `disabled`、未选中省略和普通对象覆盖等问题。

我还能完成一个邻里集市本地发布预览：价格使用整数分，时间使用 UTC ISO，提交被拦截并明确标注未发送、未保存，不越界声称认证、持久化、CSRF 防护、服务端验证或并发能力。

## 单元导航

- [返回本章：表单、提交与验证](../05-forms-validation.md)
- [下一课：input 类型与值状态](02-input-types-values.md)
- [上一章：表格与结构化数据](../04-tables-data.md)
- [返回 HTML 模块](../README.md)
