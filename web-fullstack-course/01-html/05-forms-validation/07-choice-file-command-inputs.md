# 选择、文件、隐藏与命令输入

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 配置 checkbox、radio、file、hidden、button 和提交类输入的名称值与默认行为。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-012`、`FRM-013`、`FRM-014` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

配置 checkbox、radio、file、hidden、button 和提交类输入的名称值与默认行为。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-012（checkbox、radio）、FRM-013（file、hidden）、FRM-014（button、submit、reset、image）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 开关与单选组

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

### 4.2 文件与隐藏数据组

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

### 4.3 命令与提交组

#### 4.11.1 `button`

```html
<input type="button" value="生成本地预览">
```

没有内建提交或重置行为，通常由脚本监听 `click`。可见标签来自 `value`。若不需要 `input` 的历史形式，`<button type="button">` 更容易包含富文本内容；`button` 元素在[本章第 10 课](10-select-option-button.md)展开。

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

## 5. 元素、属性、API 或配置清单

### 5.1 类型选择决策表

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

## 6. 最小可运行案例

在个人练习目录中新建 `practice/07-choice-file-command-inputs/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 FRM-012（checkbox、radio） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 FRM-013（file、hidden） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 为 FRM-014（button、submit、reset、image） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
5. 在打开页面前写下预期 DOM、默认行为或请求结果；
6. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
7. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

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

### 8.1 错误案例：脚本设置文件路径

```js
// 错误案例：浏览器应拒绝设置非空本地路径。
fileInput.value = "/Users/example/private.jpg";
```

恢复：

```js
fileInput.value = "";
```

需要文件时让用户主动选择。不要通过模拟点击、循环弹窗或浏览器私有能力规避授权。

### 8.2 错误案例：相信 `accept`

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

### 8.3 错误案例：信任 hidden 价格

```html
<!-- 错误案例 -->
<input type="hidden" name="finalPriceCents" value="3900">
```

用户可以改成 `1`。恢复原则：

- 客户端可提交商品 ID、优惠码等输入；
- 服务端根据数据库、库存、活动和身份重新计算最终价格；
- 客户端 hidden 只能是提示，不能是价格真相。

### 8.4 错误案例：辅助按钮触发错误默认行为

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

### 8.5 错误案例：reset 后立即读取旧状态

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

## 9. 课后题

### 9.1 file 的 `accept`

题目：`accept="image/png"` 是否证明选择的文件一定是安全 PNG？

<details>
<summary>参考答案</summary>

不能。accept 是选择提示，用户环境可能仍能选择其他文件，文件名和声明 MIME 也可能错误或伪造。客户端可做体验检查，服务端必须重新检查大小、真实格式、恶意内容、权限和存储策略。

</details>

### 9.2 hidden 的信任边界

题目：能否用 `<input type="hidden" name="isAdmin" value="true">` 授权管理员操作？

<details>
<summary>参考答案</summary>

不能。hidden 可以被 Elements、Console、扩展或自构请求修改。服务端必须根据已认证身份和权限数据判断，不能相信客户端提供的管理员标记。本课也没有实现认证或授权。

</details>

### 9.3 reset 的范围

题目：reset 能否把 JavaScript 数组恢复到初始值？

<details>
<summary>参考答案</summary>

不能自动恢复。reset 算法主要恢复表单控件的默认状态。应用数组、预览 DOM、请求缓存和服务端数据需要自己的明确状态管理。监听 reset 时还应等待默认动作完成后再同步界面。

</details>

### 9.4 image submitter

题目：`type="image" name="map"` 与普通 submit 的表单数据有什么显著差异？

<details>
<summary>参考答案</summary>

image 会提交点击坐标，通常是 `map.x` 和 `map.y`；普通 submit 通常提交自己的 name/value。image 还依赖图片资源和准确 alt，适合坐标有业务意义的图像任务，不适合普通保存按钮。

</details>

## 10. 实践练习

选择一件与教材不同的邻里商品，完成一次迁移练习：

1. 先写内容关系、机器值或交互目标，不先写标签；
2. 用 FRM-012（checkbox、radio）、FRM-013（file、hidden）、FRM-014（button、submit、reset、image） 实现最小页面；
3. 制造一个本课错误并保留失败证据；
4. 修复后重复键盘或开发者工具检查；
5. 在记录中解释为什么没有选择一个视觉相似的替代写法。

## 11. 阶段验收

### 11.1 文件、隐藏字段与按钮

- [ ] 文件输入没有非空默认路径。
- [ ] 只展示文件元数据，没有读取或上传文件。
- [ ] 能解释 `C:\fakepath\...` 不是真实可用路径。
- [ ] 明确 `accept` 只是提示。
- [ ] hidden 值已被手工篡改并留下证据。
- [ ] 不把 hidden 用于秘密、权限或最终价格。
- [ ] button 不提交，submit 触发提交，reset 恢复默认。
- [ ] image 有准确 alt，并观察坐标字段。
- [ ] `event.submitter` 能指出当次提交来源。

### 11.2 项目与安全边界

- [ ] 所有提交都被阻止，没有真实写请求。
- [ ] 页面始终说明“本地预览，未保存”。
- [ ] 没有真实文件上传。
- [ ] 没有真实认证、授权或凭据处理。
- [ ] 没有 Local Storage、数据库或其他持久化。
- [ ] 没有声称客户端通过就等于服务端接受。
- [ ] `createdAtPreviewUtc` 被标为浏览器教学值。
- [ ] 服务端重复验证清单已提交。

### 11.3 提交证据

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

## 12. 常见问题

### Q16：checkbox 不选时怎样向服务器发送 false？

未选 checkbox 通常不产生该名称。服务端可以把缺失解释为 false，或客户端在构造结构化 JSON 时显式发送布尔值。不要增加同名 hidden 后不理解覆盖/多值规则；必须与接口契约一致。

### Q17：radio 可不可以默认都不选？

可以，但如果业务要求必须选择，应提供清楚组名、原生 required 约束和服务端验证。若有安全、常用且不误导的默认项，也可以设置一个 defaultChecked。

### Q18：file 的 `.value` 为什么出现 `C:\fakepath\`？

这是防止泄露真实本地目录的兼容表现。应用应读取 `files` 中用户授权的 File 对象，不解析 `.value` 获取路径。

### Q19：能否把 File 保存到 localStorage？

本课不这样做。File 对象、二进制内容、容量、隐私、生命周期和权限需要独立设计。这里不做上传或持久化。

### Q21：为什么 reset 按钮经常不推荐？

它容易与提交相邻并误触，一次丢弃大量编辑，而且恢复的是默认值，不一定符合用户理解的“清空”。筛选器可使用命名明确的“清空筛选”，长表单更适合撤销或确认。

### Q22：`form.reset()` 和点击 reset 一样吗？

它们都触发表单重置流程并恢复控件默认状态。注意若表单中有控件使用 `name="reset"`，可能遮蔽 `form.reset` 方法；命名时不要占用表单方法名。

### Q23：图片按钮一定要提交坐标吗？

`type="image"` 的核心特性就是图像提交和坐标数据。如果坐标无业务意义，使用普通 submit 更清楚、更稳定，也更容易提供一致标签。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：配置 checkbox、radio、file、hidden、button 和提交类输入的名称值与默认行为。
- `FRM-012`：checkbox、radio
- `FRM-013`：file、hidden
- `FRM-014`：button、submit、reset、image
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：日期、时间、颜色与类型化值 API](06-date-time-color-inputs.md) · [下一课：showPicker 与渐进增强](08-showpicker-progressive-enhancement.md) · [返回 HTML 模块](../README.md)
