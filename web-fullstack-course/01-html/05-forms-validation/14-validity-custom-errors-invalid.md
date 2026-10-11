# ValidityState、自定义错误与 invalid

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 读取 ValidityState，管理 validationMessage 与 setCustomValidity() 生命周期，并处理 invalid 事件。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-028`、`FRM-029`、`FRM-030`、`FRM-031` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

读取 ValidityState，管理 validationMessage 与 setCustomValidity() 生命周期，并处理 invalid 事件。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-028（ValidityState 全部相关状态）、FRM-029（checkValidity、reportValidity、validationMessage）、FRM-030（setCustomValidity 与 customError 生命周期）、FRM-031（invalid 事件、错误汇总与焦点）；
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
声明单字段原生约束
  → 读取 validity 与 validationMessage
  → 比较静默检查和交互报告
  → 加入可清除的自定义错误
  → 捕获 invalid 并生成可见错误
  → 检查本地 File 元数据
  → 只生成本地预览
  → 列出服务器必须重新判定的事项
```

## 4. 核心理论

### 4.1 全部相关 `ValidityState` 成员

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

### 4.2 `validationMessage`、`checkValidity()` 与 `reportValidity()`

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

### 4.3 `setCustomValidity()` 的生命周期

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

### 4.4 `invalid` 不冒泡，必须理解捕获阶段

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

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `FRM-028`：ValidityState 全部相关状态
- `FRM-029`：checkValidity、reportValidity、validationMessage
- `FRM-030`：setCustomValidity 与 customError 生命周期
- `FRM-031`：invalid 事件、错误汇总与焦点

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

本章的完整项目代码集中在 [文件检查与服务端信任边界](15-file-checks-server-boundaries.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 FRM-028（ValidityState 全部相关状态） 对应的元素、属性或状态；
- 在项目中实现并标出与 FRM-029（checkValidity、reportValidity、validationMessage） 对应的元素、属性或状态；
- 在项目中实现并标出与 FRM-030（setCustomValidity 与 customError 生命周期） 对应的元素、属性或状态；
- 在项目中实现并标出与 FRM-031（invalid 事件、错误汇总与焦点） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`15-file-checks-server-boundaries.md`](15-file-checks-server-boundaries.md)。

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

## 9. 课后题

1. FRM-028（ValidityState 全部相关状态）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

### 10.1 进阶：可恢复的发布预览

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

## 11. 阶段验收

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

## 12. 常见问题

### Q5：`validationMessage` 可以直接显示吗？

可以作为当前错误来源，完整案例就是这样做的。但原生消息会本地化，自定义消息需要自行国际化；复杂业务错误还应由服务器返回明确字段或表单级信息。

### Q6：可以对每次 `input` 都调用 `reportValidity()` 吗？

通常不建议。它可能持续弹出浏览器消息并改变焦点。实时阶段可重算状态和更新可见错误，提交失败时再聚焦并报告首个错误。

### Q8：`invalid` 和 `submit` 哪个先发生？

未使用 `novalidate` 的原生交互验证中，无效控件会在提交前触发 `invalid`，表单的 `submit` 事件可能根本不会发生。完整案例使用 `novalidate`，在 `submit` 中手动检查，以便先计算业务规则并统一渲染。

### Q9：取消 `invalid` 默认行为会让表单通过吗？

不会。取消只影响默认交互报告，控件状态仍然无效。页面必须另行提供可见错误和恢复路径。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：读取 ValidityState，管理 validationMessage 与 setCustomValidity() 生命周期，并处理 invalid 事件。
- `FRM-028`：ValidityState 全部相关状态
- `FRM-029`：checkValidity、reportValidity、validationMessage
- `FRM-030`：setCustomValidity 与 customError 生命周期
- `FRM-031`：invalid 事件、错误汇总与焦点
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：约束属性与验证候选者](13-constraint-attributes-candidates.md) · [下一课：文件检查与服务端信任边界](15-file-checks-server-boundaries.md) · [返回 HTML 模块](../README.md)
