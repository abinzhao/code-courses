# input 类型与值状态模型

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 按输入任务选择 type，并区分当前值、默认值、脏值、checked 与 defaultChecked。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-015` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

按输入任务选择 type，并区分当前值、默认值、脏值、checked 与 defaultChecked。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-015（当前值、默认值、checked/defaultChecked）；
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
先判断“数据是什么”
  → 选择 input 类型
  → 观察 value / checked 等当前状态
  → 观察 defaultValue / defaultChecked 等重置基线
  → 使用类型专属 API
  → 触发提交或重置默认行为
  → 记录失败证据并恢复
  → 最后映射为业务数据
```

### 3.2 预备材料 2

```html
<input type="number" name="quantity" min="1" step="1">
<input type="text" name="listingCode" inputmode="numeric">
<input type="tel" name="contactPhone" autocomplete="tel">
```

### 3.3 预备材料 3

```text
practice/
└── html-05-input-types/
    ├── type-gallery.html
    ├── market-listing.html
    └── evidence.md
```

### 3.4 预备材料 4

```bash
cd practice/html-05-input-types
python3 -m http.server 8000
```

### 3.5 预备材料 5

```text
http://127.0.0.1:8000/type-gallery.html
http://127.0.0.1:8000/market-listing.html
```

### 3.6 预备材料 6

```text
在终端按 Control + C
```

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

## 5. 元素、属性、API 或配置清单

### 5.1 值状态清单

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

### 5.2 特性检测清单

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

本章的完整项目代码集中在 [选择、文件、隐藏与命令输入](07-choice-file-command-inputs.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 FRM-015（当前值、默认值、checked/defaultChecked） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`07-choice-file-command-inputs.md`](07-choice-file-command-inputs.md)。

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

### 8.2 错误案例：用 `value` 判断 checkbox

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

### 8.3 错误案例：把 `checked="false"` 当成未选

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

## 9. 课后题

### 9.1 当前值与默认值

题目：HTML 是 `value="旧书"`，用户输入“台灯”，此时 `.value` 和 `.defaultValue` 分别是什么？reset 后呢？

<details>
<summary>参考答案</summary>

编辑后 `.value` 是“台灯”，`.defaultValue` 仍是“旧书”。若默认值未被脚本修改，reset 后 `.value` 恢复“旧书”，`.defaultValue` 仍是“旧书”。

</details>

### 9.2 checkbox 的三个状态

题目：`value="pickup" checked` 的 checkbox 被用户取消后，三个属性是什么？

<details>
<summary>参考答案</summary>

`.value` 仍是 `"pickup"`；`.checked` 是 `false`；`.defaultChecked` 是 `true`。value 是提交字符串，不是勾选布尔值。

</details>

### 9.3 未知类型

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

### 10.2 故障注入级：破坏四个状态边界

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

### 11.3 一票否决项

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

### Q4：`inputmode="numeric"` 会自动验证数字吗？

不会。它主要提示虚拟键盘布局，不改变 input 类型，不阻止粘贴其他字符，也不替代客户端或服务端验证。

### Q10：range 当前值为什么必须另行显示？

滑块位置通常不能让用户准确知道机器值，低视力、键盘和精确任务尤其需要可见反馈。用 `output` 或文字同步当前值，并测试键盘方向键。

### Q25：可以对所有 input 都调用 `select()` 吗？

不要假设所有类型都有相同文本选择模型。`selectionStart`/`setSelectionRange()` 只用于明确支持的文本类状态。日期、number、email 等控件应按各自 API 和浏览器 UI 操作。

### Q26：修改 `.defaultValue` 会立刻覆盖用户输入吗？

若当前值尚未被单独修改，它可能随默认值同步；一旦当前值变脏，修改默认值主要改变之后的重置基线，不应依赖它覆盖用户正在编辑的值。要更新当前值，明确赋 `.value`。

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

- 能解释并验证：按输入任务选择 type，并区分当前值、默认值、脏值、checked 与 defaultChecked。
- `FRM-015`：当前值、默认值、checked/defaultChecked
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：FormData、查询串与程序化提交](03-formdata-query-programmatic-submit.md) · [下一课：文本、数值与范围输入](05-text-number-range-inputs.md) · [返回 HTML 模块](../README.md)
