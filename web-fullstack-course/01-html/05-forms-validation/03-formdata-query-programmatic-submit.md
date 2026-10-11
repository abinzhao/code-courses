# FormData、查询串与程序化提交

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 观察 GET 与 POST 数据，保留 FormData 多值，并区分 requestSubmit() 与 submit()。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-005`、`FRM-006`、`FRM-007` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

观察 GET 与 POST 数据，保留 FormData 多值，并区分 requestSubmit() 与 submit()。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-005（FormData、同名多值、getAll）、FRM-006（URLSearchParams 与 GET 查询）、FRM-007（requestSubmit 与 submit）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 GET 查询与 POST 请求体的边界

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

### 4.2 `FormData`：观察有序条目

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

### 4.3 `URLSearchParams`：文本查询参数

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

### 4.4 `requestSubmit()` 与 `submit()`

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

### 4.5 本课的信任边界

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

### 5.1 DOM 与 Web API

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
| `form.checkValidity()` | 返回约束验证结果；详细错误处理见[本章第 14 课](14-validity-custom-errors-invalid.md) |

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

再把错误显示在 fieldset 附近，并把焦点移到第一项。完整自定义验证、错误汇总和首个无效控件恢复会在[本章第 14 课](14-validity-custom-errors-invalid.md)展开。

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

### 8.1 故障四：`get()` 丢掉同名值

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

### 8.2 故障五：`Object.fromEntries()` 覆盖多值

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

### 8.3 故障六：程序化 `.click()` 选错意图

下面虽然走按钮激活路径，但把业务意图硬编码到了某个按钮：

```js
document.querySelector("#publish-intent-button").click();
```

若代码真正想表达“请求预览提交”，更清楚的是：

```js
form.requestSubmit(previewButton);
```

两者都可能触发提交，但 `requestSubmit()` 直接表达表单 API 意图，并验证参数确实是该表单的提交按钮。

### 8.4 故障七：调用 `submit()` 后拦截器没有运行

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

### 8.5 故障九：把 File 放进 `URLSearchParams`

**错误代码：**

```js
const params = new URLSearchParams(new FormData(fileForm));
```

如果 `FormData` 含 `File`，查询参数得到的是字符串化结果，不是文件内容上传。

修复：

- 查询参数只使用明确的文本字段；
- 文件传输使用正确的 `multipart/form-data` 链路；
- 本课不实现上传。

## 9. 课后题

1. FRM-005（FormData、同名多值、getAll）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

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

### 10.3 证据提交格式

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

### 11.1 发布预览验收

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

### 11.2 `requestSubmit()` 验收

- [ ] 空标题时 `requestSubmit(previewButton)` 被原生约束阻止；
- [ ] 约束失败时 `submit` 事件次数不增加；
- [ ] 修复标题后 `submit` 事件触发；
- [ ] `event.submitter` 是传入按钮；
- [ ] `intent=preview` 出现在数据中；
- [ ] 没有调用 `form.submit()`；
- [ ] 能口头解释 `submit()` 为什么绕过约束验证和事件。

### 11.3 自动检查建议

在课程仓库中可检查 Markdown 结构：

```bash
python3 - <<'PY'
from pathlib import Path
import re

lesson = Path(
    "web-fullstack-course/01-html/05-forms-validation/"
    "03-formdata-query-programmatic-submit.md"
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

### 11.4 一票否决项

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

### Q8：`text/plain` 是否更容易调试？

有时看起来更直观，但它不是稳健的常规接口格式，名称和值中的换行等内容可能产生歧义。

### Q18：`FormData` 可以直接 `JSON.stringify()` 吗？

不能得到预期条目对象。应先通过 `entries()`、逐字段读取或明确转换，并处理重复名称和 `File`。

### Q20：`URLSearchParams` 能处理 File 吗？

不能承载文件二进制。文件值会被字符串化，不等于上传。

### Q23：`requestSubmit()` 不传按钮可以吗？

可以，但没有具体按钮作为 submitter，因此不要期待某个按钮的名称、值或覆盖属性自动生效。

### Q24：为什么 `requestSubmit()` 可能抛异常？

传入对象必须是提交按钮，并且属于该表单；类型不对可抛 `TypeError`，不属于表单可抛 `NotFoundError`。

### Q25：什么时候应该用 `submit()`？

它是平台底层 API，但会绕过验证和 `submit` 事件。应用想复用正常用户提交路径时优先使用 `requestSubmit()`；本课的拦截式案例不使用 `submit()`。

### Q29：价格为什么不用 `39.00`？

邻里集市教学模型规定用整数分，`3900` 可避免常见二进制浮点金额误差，并让单位明确。

### Q30：客户端生成的 `createdAt` 可以作为真实创建时间吗？

不能作为权威值。用户设备时间可错误或被修改；本课只用它展示 UTC ISO 格式。

### Q31：Network 没有请求能证明什么？

能支持“本次浏览器操作未发出目标请求”的观察，不能证明系统拥有认证、保存或服务端验证。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：观察 GET 与 POST 数据，保留 FormData 多值，并区分 requestSubmit() 与 submit()。
- `FRM-005`：FormData、同名多值、getAll
- `FRM-006`：URLSearchParams 与 GET 查询
- `FRM-007`：requestSubmit 与 submit
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：成功控件、提交者与名称值](02-successful-controls-submitter-values.md) · [下一课：input 类型与值状态模型](04-input-types-value-state.md) · [返回 HTML 模块](../README.md)
