# 分组、建议、输出、进度与测量

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 使用 fieldset、legend、datalist、output、progress 和 meter 表达分组与状态。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-021`、`FRM-022`、`FRM-023` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

使用 fieldset、legend、datalist、output、progress 和 meter 表达分组与状态。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-021（fieldset、legend 与 disabled 传播）、FRM-022（datalist 与建议值边界）、FRM-023（output、progress、meter）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `fieldset`、`legend` 与禁用传播

`fieldset` 把一组相关控件组成语义分组，第一项 `legend` 为这组内容命名：

```html
<fieldset>
  <legend>交接方式</legend>

  <label>
    <input type="radio" name="handoff" value="pickup">
    公共地点自提
  </label>

  <label>
    <input type="radio" name="handoff" value="delivery">
    同城配送
  </label>
</fieldset>
```

`legend` 不能代替每个控件自己的标签。它回答“这一组是什么”，单个 `label` 回答“这一项是什么”。

#### `fieldset[disabled]` 的传播

禁用 `fieldset` 时，其后代控件通常：

- 不能被用户编辑或激活；
- 不参与约束验证；
- 不进入 `FormData`；
- 仍存在于 DOM，脚本仍可能读取或改写属性。

关键例外：**第一项 `legend` 元素的后代不受这次禁用传播影响。**

```html
<fieldset id="delivery-group" disabled>
  <legend>
    配送扩展
    <label>
      <input id="delivery-enabled" type="checkbox">
      启用配送
    </label>
  </legend>

  <label for="delivery-area">配送区域</label>
  <select id="delivery-area" name="deliveryArea">
    <option value="nearby">邻近社区</option>
    <option value="district">本区</option>
  </select>
</fieldset>
```

初始状态下，`delivery-enabled` 仍可操作，因为它位于第一项 `legend` 内；`delivery-area` 被传播禁用。脚本可根据开关切换 `fieldset.disabled`。

如果还有第二个 `legend`，它的后代没有这项例外。例外只看第一项 `legend` 元素，不是看“文字像不像标题”。

#### `readonly` 不是通用替代品

`readonly` 主要用于文本型 `input` 和 `textarea`：

- 仍可聚焦和复制；
- 当前值通常仍会提交；
- 用户不能直接编辑；
- 不适用于 `select`、复选框、单选按钮和普通 `button`。

`disabled` 则让支持它的控件不可交互且不提交。两者都不是授权。若业务需要展示不可修改的服务器事实，应同时保留服务端事实来源，而不是依赖客户端字段。

### 4.2 `datalist`：建议，不是限制

`datalist` 自己不是输入控件，不产生表单条目。它通过输入控件的 `list` 属性提供建议：

```html
<label for="condition">成色描述</label>
<input id="condition" name="condition" list="condition-suggestions">

<datalist id="condition-suggestions">
  <option value="全新未拆封"></option>
  <option value="近全新"></option>
  <option value="有正常使用痕迹"></option>
</datalist>
```

用户仍可以输入“边角有轻微磕碰”。因此：

- `datalist` 适合“常用值优先，但允许自由输入”；
- `select` 适合“必须从有限集合选择”；
- 需要白名单时，必须另外验证当前值；
- 建议弹层的外观、匹配方式、键盘行为和辅助技术支持可能因浏览器而异；
- 原生建议弹层的样式控制有限，不应依赖某种固定视觉。

即使 `option` 有可见说明，输入控件最终保存的仍是用户当前字符串。不要把“显示过建议”当作“值已被认证”。

### 4.3 `output`：显示计算结果，但不会自己计算

`output` 表示计算或用户操作产生的结果：

```html
<label for="total-price">预计总价</label>
<output
  id="total-price"
  name="totalDisplay"
  for="unit-price quantity"
  form="listing-form"
>
  0.00 元
</output>
```

属性含义：

- `for` 是以空格分隔的相关控件 ID 列表，表达“结果由哪些输入产生”；
- `form` 指向表单 `id`，可在不嵌套时建立表单所有者；
- `name` 让它可以通过表单元素集合查找；
- `.value` 是当前结果；
- `.defaultValue` 是表单重置所恢复的默认结果。

浏览器不会因为写了 `for` 就自动相加。脚本必须读取输入、完成计算并设置：

```js
totalPrice.value = "78.00 元";
```

`output` 虽与表单关联，但它的值本身不随表单提交。需要发送可信计算输入时，应提交原始字段，由服务端重新计算；不要增加一个隐藏字段后就把客户端总价当成可信价格。

### 4.4 `progress`：任务进度与未知进度

`progress` 表示一个任务朝完成状态推进。

确定进度：

```html
<label for="form-progress">资料完成度</label>
<progress id="form-progress" value="3" max="5">3 / 5</progress>
```

浏览器用 `value / max` 得到比例。`max` 必须大于零；未写时默认上限是 1。`progress` 的下限固定为 0，没有 `min`。

未知进度：

```html
<label for="review-progress">审核进度教学示意</label>
<progress id="review-progress" max="100">耗时未知</progress>
```

没有 `value` 属性时是 indeterminate，即知道任务正在进行，但不知道完成比例。若脚本曾设置值，想恢复未知状态，应移除属性：

```js
reviewProgress.removeAttribute("value");
console.log(reviewProgress.position); // 未知状态为 -1
```

不要设置 `value="0"` 来表示未知；它表示确定地完成了 0。子文本是后备内容，不应取代可见标签和相邻状态说明。

### 4.5 `meter`：已知范围中的当前测量

`meter` 表示已知范围内的标量，例如资料质量、磁盘占用或评分，不表示任务执行到了哪一步：

```html
<label for="quality-meter">资料质量</label>
<meter
  id="quality-meter"
  min="0"
  max="100"
  low="40"
  high="75"
  optimum="100"
  value="72"
>
  72 / 100
</meter>
```

- `min` 和 `max` 定义范围，默认分别为 0 和 1；
- `value` 是当前测量；
- `low` 与 `high` 划分区间；
- `optimum` 指出更理想的区域；
- 当 `optimum` 靠近高端时，高值更理想；靠近低端时，低值更理想；
- 属性应满足 `min ≤ low ≤ high ≤ max`，`optimum` 也应落在范围中。

原生颜色不是跨浏览器业务合同。必须用文字说明“72/100，尚缺完整成色说明”，不要只用红、黄、绿表达结论。

对照判断：

| 问题 | 元素 |
| --- | --- |
| 已填写 5 项中的 3 项 | `progress` |
| 正在处理，但无法估计剩余时间 | 无 `value` 的 `progress` |
| 商品资料质量为 72/100 | `meter` |
| 库存还有 3 件，共 10 件 | 若表达范围占比可用 `meter`，若表达拣货任务完成度才用 `progress` |

## 5. 元素、属性、API 或配置清单

### 5.1 元素与关键属性

| 名称 | 作用 | 关键属性 | 主要边界 |
| --- | --- | --- | --- |
| `label` | 给可标记控件命名 | `for` | `for` 匹配控件 `id`，不是 `name` |
| `textarea` | 多行纯文本输入 | `name`、`rows`、`cols`、`wrap`、`readonly`、`form` | 初始值写在元素内容中 |
| `select` | 有限选项选择 | `name`、`multiple`、`size`、`disabled`、`form` | 无通用 `readonly` |
| `option` | 一个可选值 | `value`、`selected`、`disabled` | 文案不应代替稳定机器值 |
| `optgroup` | 给选项分组 | `label`、`disabled` | 分组本身不可选 |
| `button` | 原生命令或提交者 | `type`、`form`、`name`、`value`、`disabled` | 表单内省略类型可能提交 |
| `fieldset` | 给相关控件成组 | `disabled`、`form`、`name` | `form` 不自动关联所有后代 |
| `legend` | 给 fieldset 命名 | 全局属性 | 第一项 legend 有禁用传播例外 |
| `datalist` | 给输入提供建议 | `id` | 不提交，不限制自由输入 |
| `output` | 表示计算结果 | `for`、`form`、`name` | 不自动计算，值不提交 |
| `progress` | 任务进度 | `value`、`max` | 缺少 `value` 才是未知进度 |
| `meter` | 已知范围中的测量 | `value`、`min`、`max`、`low`、`high`、`optimum` | 不表示任务进度 |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/11-fieldset-datalist-output-progress-meter/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 FRM-021（fieldset、legend 与 disabled 传播） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 FRM-022（datalist 与建议值边界） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 为 FRM-023（output、progress、meter） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
5. 在打开页面前写下预期 DOM、默认行为或请求结果；
6. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
7. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

### 7.1 业务目标与静态边界

案例实现“分类商品发布预览”，结构如下：

```text
商品发布表单
├── 基本信息
│   ├── 标题
│   ├── 描述
│   ├── 分类 optgroup
│   ├── 标签 multiple
│   └── 成色 datalist
├── 价格
│   ├── 单价文本
│   ├── 数量
│   └── 总价 output
├── 配送扩展 fieldset[disabled]
│   ├── 第一项 legend 中的启用开关
│   └── 配送区域与说明
├── 完成度 progress
├── 资料质量 meter
└── 本地 JSON 预览
```

页面不会：

- 向服务器发送请求；
- 保存草稿；
- 创建商品 ID；
- 执行权限检查；
- 锁定价格；
- 处理多人同时编辑；
- 在刷新后恢复数据。

### 7.2 文件位置

创建：

```text
market-learning/
└── practice/
    └── html-chapter-05/
        └── categorized-listing-form.html
```

### 7.3 完整代码

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>分类商品发布预览 · 邻里集市</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, sans-serif;
      }

      body {
        max-width: 64rem;
        margin: 0 auto;
        padding: 1rem;
        line-height: 1.6;
      }

      form {
        display: grid;
        gap: 1rem;
      }

      fieldset {
        display: grid;
        gap: 0.75rem;
        padding: 1rem;
      }

      label:not(.inline-label) {
        display: block;
        font-weight: 650;
      }

      input,
      textarea,
      select,
      output {
        box-sizing: border-box;
        inline-size: min(100%, 36rem);
        padding: 0.5rem;
        font: inherit;
      }

      output {
        display: block;
        border: 1px solid currentColor;
      }

      .help {
        margin-block: 0.25rem;
      }

      .status-grid {
        display: grid;
        grid-template-columns: max-content minmax(12rem, 1fr) max-content;
        gap: 0.5rem;
        align-items: center;
      }

      progress,
      meter {
        inline-size: 100%;
      }

      pre {
        padding: 1rem;
        overflow: auto;
        border: 1px solid currentColor;
        white-space: pre-wrap;
      }

      button {
        min-block-size: 2.75rem;
        font: inherit;
      }

      :focus-visible {
        outline: 3px solid CanvasText;
        outline-offset: 3px;
      }
    </style>
  </head>
  <body>
    <header>
      <p>邻里集市</p>
      <h1>分类商品发布预览</h1>
      <p>
        教学状态：只在当前页面内存中生成预览，未保存到服务器。
      </p>
    </header>

    <main>
      <form id="listing-form" autocomplete="on">
        <fieldset>
          <legend>基本信息</legend>

          <div>
            <label for="listing-title">商品标题</label>
            <p id="title-help" class="help">
              使用买家能识别的名称，不要只写“闲置”。
            </p>
            <input
              id="listing-title"
              name="title"
              type="text"
              value="阅读台灯"
              autocomplete="off"
              enterkeyhint="next"
              aria-describedby="title-help"
            >
          </div>

          <div>
            <label for="listing-description">商品描述</label>
            <p id="description-help" class="help">
              说明成色、功能和交接时可检查的项目。
            </p>
            <textarea
              id="listing-description"
              name="description"
              rows="5"
              cols="42"
              wrap="soft"
              autocomplete="off"
              enterkeyhint="next"
              autocapitalize="sentences"
              spellcheck="true"
              aria-describedby="description-help"
            >灯臂可调，开关正常，交接时可通电检查。</textarea>
          </div>

          <div>
            <label for="listing-category">商品分类</label>
            <select
              id="listing-category"
              name="category"
              autocomplete="off"
            >
              <option value="">请选择分类</option>
              <optgroup label="家居">
                <option value="lighting" selected>灯具</option>
                <option value="storage">收纳</option>
                <option value="small-furniture">小件家具</option>
              </optgroup>
              <optgroup label="数码">
                <option value="computer-accessory">电脑配件</option>
                <option value="audio-device">音频设备</option>
              </optgroup>
              <optgroup label="图书">
                <option value="textbook">教材</option>
                <option value="literature">文学</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label for="listing-tags">商品标签（可多选）</label>
            <p id="tags-help" class="help">
              桌面端通常使用 Ctrl、Command 或 Shift 组合选择。
            </p>
            <select
              id="listing-tags"
              name="tags"
              multiple
              size="5"
              aria-describedby="tags-help"
            >
              <option value="tested" selected>已测试</option>
              <option value="negotiable">可议价</option>
              <option value="with-box">有原包装</option>
              <option value="local-pickup" selected>仅限自提</option>
              <option value="urgent">急出</option>
            </select>
          </div>

          <div>
            <label for="listing-condition">成色描述</label>
            <p id="condition-help" class="help">
              可以选择建议，也可以输入更准确的自由文字。
            </p>
            <input
              id="listing-condition"
              name="condition"
              type="text"
              value="有正常使用痕迹"
              list="condition-suggestions"
              autocomplete="off"
              enterkeyhint="next"
              aria-describedby="condition-help"
            >
            <datalist id="condition-suggestions">
              <option value="全新未拆封"></option>
              <option value="近全新"></option>
              <option value="有正常使用痕迹"></option>
              <option value="功能正常，外观有瑕疵"></option>
            </datalist>
          </div>
        </fieldset>

        <fieldset>
          <legend>价格与数量</legend>

          <div>
            <label for="unit-price">单价（元）</label>
            <p id="price-help" class="help">
              最多六位整数和两位小数；脚本会先转换成整数分。
            </p>
            <input
              id="unit-price"
              name="unitPriceYuan"
              type="text"
              value="39.00"
              inputmode="decimal"
              autocomplete="off"
              enterkeyhint="next"
              aria-describedby="price-help"
            >
          </div>

          <div>
            <label for="quantity">数量</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              value="1"
              min="1"
              max="99"
              step="1"
              inputmode="numeric"
              enterkeyhint="done"
            >
          </div>

          <div>
            <label for="total-price">预计总价</label>
            <output
              id="total-price"
              name="totalDisplay"
              for="unit-price quantity"
              form="listing-form"
            >39.00 元</output>
            <p class="help">
              output 只显示计算结果；预览对象另外保存整数分。
            </p>
          </div>
        </fieldset>

        <fieldset id="delivery-group" disabled>
          <legend>
            配送扩展
            <label class="inline-label">
              <input
                id="delivery-enabled"
                name="deliveryEnabled"
                type="checkbox"
                value="yes"
              >
              启用配送
            </label>
          </legend>

          <div>
            <label for="delivery-area">配送区域</label>
            <select id="delivery-area" name="deliveryArea">
              <option value="nearby">邻近社区</option>
              <option value="district">本区</option>
            </select>
          </div>

          <div>
            <label for="delivery-note">配送说明</label>
            <textarea
              id="delivery-note"
              name="deliveryNote"
              rows="3"
              cols="42"
              wrap="soft"
            >仅周末白天可送达。</textarea>
          </div>
        </fieldset>

        <section aria-labelledby="status-title">
          <h2 id="status-title">资料状态</h2>

          <div class="status-grid">
            <label for="completion-progress">完成度</label>
            <progress
              id="completion-progress"
              value="0"
              max="5"
            >0 / 5</progress>
            <span id="completion-text">0 / 5</span>

            <label for="quality-meter">资料质量</label>
            <meter
              id="quality-meter"
              min="0"
              max="100"
              low="40"
              high="75"
              optimum="100"
              value="0"
            >0 / 100</meter>
            <span id="quality-text">0 / 100</span>

            <label for="review-progress">审核进度示意</label>
            <progress id="review-progress" max="100">
              耗时未知
            </progress>
            <span>未知</span>
          </div>

          <p>
            “完成度”是确定任务进度；“资料质量”是已知范围的测量；
            “审核进度示意”没有 value，只演示未知进度，不代表真实审核。
          </p>
        </section>

        <p>
          <button
            type="submit"
            name="intent"
            value="preview"
          >
            生成本地预览
          </button>
          <button id="inspect-state" type="button">
            观察控件状态
          </button>
          <button type="reset">
            恢复默认值
          </button>
        </p>
      </form>

      <p>
        <button
          type="submit"
          form="listing-form"
          name="intent"
          value="preview-outside"
        >
          从表单外生成本地预览
        </button>
      </p>

      <section aria-labelledby="preview-title">
        <h2 id="preview-title">页面内存预览</h2>
        <p id="preview-status" role="status">
          尚未生成。不会保存到服务器。
        </p>
        <pre id="preview-json">没有预览数据。</pre>
      </section>
    </main>

    <script>
      const form = document.querySelector("#listing-form");
      const titleInput = document.querySelector("#listing-title");
      const descriptionInput = document.querySelector("#listing-description");
      const categorySelect = document.querySelector("#listing-category");
      const tagsSelect = document.querySelector("#listing-tags");
      const conditionInput = document.querySelector("#listing-condition");
      const unitPriceInput = document.querySelector("#unit-price");
      const quantityInput = document.querySelector("#quantity");
      const totalPriceOutput = document.querySelector("#total-price");
      const deliveryGroup = document.querySelector("#delivery-group");
      const deliveryEnabled = document.querySelector("#delivery-enabled");
      const deliveryArea = document.querySelector("#delivery-area");
      const deliveryNote = document.querySelector("#delivery-note");
      const completionProgress = document.querySelector("#completion-progress");
      const completionText = document.querySelector("#completion-text");
      const qualityMeter = document.querySelector("#quality-meter");
      const qualityText = document.querySelector("#quality-text");
      const inspectStateButton = document.querySelector("#inspect-state");
      const previewStatus = document.querySelector("#preview-status");
      const previewJson = document.querySelector("#preview-json");

      function selectedValues(selectElement) {
        return Array.from(
          selectElement.selectedOptions,
          (option) => option.value,
        );
      }

      function parseYuanToCents(rawValue) {
        const match = /^(0|[1-9]\d{0,5})(?:\.(\d{1,2}))?$/.exec(
          rawValue.trim(),
        );

        if (!match) {
          return null;
        }

        const yuan = Number(match[1]);
        const fraction = (match[2] ?? "").padEnd(2, "0");
        return yuan * 100 + Number(fraction);
      }

      function parseQuantity(rawValue) {
        const quantity = Number(rawValue);
        if (!Number.isSafeInteger(quantity)) {
          return null;
        }
        if (quantity < 1 || quantity > 99) {
          return null;
        }
        return quantity;
      }

      function formatCents(cents) {
        const yuan = Math.floor(cents / 100);
        const fraction = String(cents % 100).padStart(2, "0");
        return `${yuan}.${fraction} 元`;
      }

      function calculateTotalCents() {
        const unitPriceCents = parseYuanToCents(unitPriceInput.value);
        const quantity = parseQuantity(quantityInput.value);

        if (unitPriceCents === null || quantity === null) {
          totalPriceOutput.value = "请输入有效金额和数量";
          return null;
        }

        const totalPriceCents = unitPriceCents * quantity;
        totalPriceOutput.value = formatCents(totalPriceCents);
        return totalPriceCents;
      }

      function updateDeliveryState() {
        deliveryGroup.disabled = !deliveryEnabled.checked;
      }

      function updateCompletion() {
        const checks = [
          titleInput.value.trim() !== "",
          descriptionInput.value.trim() !== "",
          categorySelect.value !== "",
          tagsSelect.selectedOptions.length > 0,
          calculateTotalCents() !== null,
        ];
        const completed = checks.filter(Boolean).length;

        completionProgress.value = completed;
        completionProgress.textContent = `${completed} / ${checks.length}`;
        completionText.textContent = `${completed} / ${checks.length}`;
      }

      function updateQuality() {
        let score = 0;

        if (titleInput.value.trim().length >= 4) {
          score += 20;
        }
        if (descriptionInput.value.trim().length >= 20) {
          score += 30;
        }
        if (categorySelect.value !== "") {
          score += 20;
        }
        if (tagsSelect.selectedOptions.length >= 2) {
          score += 15;
        }
        if (conditionInput.value.trim().length >= 4) {
          score += 15;
        }

        qualityMeter.value = score;
        qualityMeter.textContent = `${score} / 100`;
        qualityText.textContent = `${score} / 100`;
      }

      function updateDerivedState() {
        calculateTotalCents();
        updateCompletion();
        updateQuality();
      }

      function appendSubmitter(data, submitter) {
        if (!submitter || !submitter.name) {
          return;
        }
        data.append(submitter.name, submitter.value);
      }

      function buildListingPreview(data, totalPriceCents) {
        const unitPriceCents = parseYuanToCents(unitPriceInput.value);
        const quantity = parseQuantity(quantityInput.value);
        const hasDelivery = deliveryEnabled.checked;

        return {
          title: data.get("title"),
          description: data.get("description"),
          category: data.get("category"),
          tags: data.getAll("tags"),
          condition: data.get("condition"),
          unitPriceCents,
          quantity,
          totalPriceCents,
          delivery: hasDelivery
            ? {
                area: data.get("deliveryArea"),
                note: data.get("deliveryNote"),
              }
            : null,
          intent: data.get("intent"),
          teachingState: "memory-only-not-saved",
        };
      }

      function showControlEvidence() {
        const data = new FormData(form);
        const evidence = {
          titleLabelCount: titleInput.labels.length,
          descriptionDefaultValue: descriptionInput.defaultValue,
          descriptionCurrentValue: descriptionInput.value,
          categoryValue: categorySelect.value,
          categorySelectedIndex: categorySelect.selectedIndex,
          tagsValueOnly: tagsSelect.value,
          tagsSelectedOptions: selectedValues(tagsSelect),
          tagsFormData: data.getAll("tags"),
          deliveryFieldsetDisabled: deliveryGroup.disabled,
          deliveryToggleOwnDisabledProperty: deliveryEnabled.disabled,
          deliveryToggleEffectivelyDisabled:
            deliveryEnabled.matches(":disabled"),
          deliveryAreaEffectivelyDisabled:
            deliveryArea.matches(":disabled"),
          deliveryAreaSubmitted: data.has("deliveryArea"),
          outputFormId: totalPriceOutput.form?.id ?? null,
          outputSubmitted: data.has("totalDisplay"),
        };

        previewJson.textContent = JSON.stringify(evidence, null, 2);
        previewStatus.textContent =
          "已读取当前控件状态；没有保存到服务器。";
      }

      deliveryEnabled.addEventListener("change", () => {
        updateDeliveryState();
        updateDerivedState();
      });

      form.addEventListener("input", updateDerivedState);
      form.addEventListener("change", updateDerivedState);
      inspectStateButton.addEventListener("click", showControlEvidence);

      form.addEventListener("submit", (event) => {
        event.preventDefault();

        const totalPriceCents = calculateTotalCents();
        if (totalPriceCents === null) {
          previewStatus.textContent =
            "无法生成预览：金额或数量格式不正确。";
          previewJson.textContent = "没有预览数据。";
          unitPriceInput.focus();
          return;
        }

        const data = new FormData(form);
        appendSubmitter(data, event.submitter);
        const preview = buildListingPreview(data, totalPriceCents);

        previewJson.textContent = JSON.stringify(preview, null, 2);
        previewStatus.textContent =
          "本地预览已生成；只存在于页面内存，未保存到服务器。";
      });

      form.addEventListener("reset", () => {
        setTimeout(() => {
          updateDeliveryState();
          updateDerivedState();
          previewJson.textContent = "没有预览数据。";
          previewStatus.textContent =
            "已恢复默认值；没有保存到服务器。";
        }, 0);
      });

      updateDeliveryState();
      updateDerivedState();
    </script>
  </body>
</html>
```

### 7.4 首次打开的预期结果

不用点击任何按钮，页面应满足：

- 标题和描述已有默认值；
- 分类当前值是 `lighting`；
- 标签默认选中 `tested` 和 `local-pickup`；
- 成色输入显示建议值，但仍可输入其他文字；
- 总价显示 `39.00 元`；
- 配送分组整体呈禁用状态；
- 配送启用开关仍可操作；
- 配送区域与说明不可操作；
- 完成度是 `5 / 5`；
- 资料质量根据现有文本显示已知分值；
- 审核进度示意没有 `value`，呈未知进度；
- 预览区明确写着没有保存。

### 7.5 多选观察路径

1. 点击“观察控件状态”；
2. 比较 `tagsValueOnly`、`tagsSelectedOptions`、`tagsFormData`；
3. 再多选“可议价”和“有原包装”；
4. 重新观察。

预期：

- `tagsValueOnly` 始终只是第一个当前选中值；
- `tagsSelectedOptions` 是全部当前值的数组；
- `tagsFormData` 与全部选中机器值一致；
- `selectedOptions` 和表单数据按选项树顺序，而不记录用户点击顺序。

如果只能选一项，先确认 `multiple` 是否仍存在，再确认操作系统的多选按键。若目标用户很难发现多选操作，记录产品改为复选框组的建议，而不是用更多说明文字掩盖交互问题。

### 7.6 `fieldset[disabled]` 例外路径

初始点击“观察控件状态”：

```text
deliveryFieldsetDisabled: true
deliveryToggleOwnDisabledProperty: false
deliveryToggleEffectivelyDisabled: false
deliveryAreaEffectivelyDisabled: true
deliveryAreaSubmitted: false
```

这证明：

- 禁用状态传播到配送区域；
- 第一项 `legend` 中的启用开关不受传播；
- 禁用区域不进入 FormData。

勾选“启用配送”后：

- 脚本把 `deliveryGroup.disabled` 设为 `false`；
- 配送区域和说明可编辑；
- 再观察时 `deliveryAreaSubmitted` 为 `true`。

取消勾选后，分组再次禁用，配送字段再次从 FormData 消失。它们的 DOM `.value` 可能仍存在，这正说明“DOM 中有值”和“本次提交有条目”不是同一件事。

### 7.7 整数分计算路径

依次测试：

| 单价输入 | 数量 | 预期总价显示 | 预期整数分 |
| --- | ---: | --- | ---: |
| `39` | 1 | `39.00 元` | 3900 |
| `39.9` | 2 | `79.80 元` | 7980 |
| `0.01` | 3 | `0.03 元` | 3 |
| `39.999` | 1 | 输入无效 | 不生成 |
| `-1` | 1 | 输入无效 | 不生成 |
| `1e3` | 1 | 输入无效 | 不生成 |

代码先把十进制字符串拆成“元”和“小数部分”，再形成整数分。它没有执行 `Number("39.9") * 100` 这类依赖浮点舍入的金额转换。

案例把金额范围限制为最多六位整数和两位小数，这是本地教学规则，不是完整支付系统。真实系统仍需服务端定义币种、范围、舍入和并发价格策略。

### 7.8 按钮与表单所有者路径

先点击表单内的“生成本地预览”，再点击表单外按钮。两次预览对象中的 `intent` 应分别是：

```text
preview
preview-outside
```

两次 `submit` 事件都被 `preventDefault()` 拦截。表单外按钮因为 `form="listing-form"` 拥有同一个表单所有者，但它的视觉位置仍在表单后方。

“观察控件状态”使用 `type="button"`，不会触发提交；“恢复默认值”使用 `type="reset"`，会恢复默认值和默认选中状态。

### 7.9 `progress` 与 `meter` 对照路径

清空标题：

- 完成度从 5 降到 4，因为一个确定任务项未完成；
- 质量分下降 20，因为已知评分规则失去一项；
- 未知审核进度不应变化，因为它只是语义对照。

把描述缩短到 20 字以下：

- 完成度仍把“非空”算作完成；
- 质量分失去描述完整度的 30 分。

同一个输入可以进入两个不同模型：完成度回答“有没有”，质量回答“够不够好”。这正是 `progress` 与 `meter` 不可互换的原因。

### 7.10 `datalist` 边界路径

把成色改成“右下角有 2 厘米划痕”。即使它不在建议列表：

- 输入值仍被保留；
- FormData 仍包含这个自由文本；
- 本地预览仍可生成；
- 浏览器没有因为 `datalist` 自动报错。

若产品规定只能使用标准成色等级，应改用 `select`，或在[本章第 13 课](13-constraint-attributes-candidates.md)增加明确校验；不能只看是否出现过建议弹层。

### 7.11 文件、打开方式、预期与失败证据

| 项目 | 记录 |
| --- | --- |
| 文件 | `practice/html-chapter-05/categorized-listing-form.html` |
| 打开 | 浏览器直接打开本地文件 |
| 网络 | 不需要；Network 中不应出现发布请求 |
| 持久化 | 无；刷新恢复源文件默认状态 |
| 预期 | 多选、分组开关、整数分计算、状态对照和内存预览可观察 |
| 失败证据 | 意外导航、出现网络请求、刷新后声称已保存、金额不是安全整数、多选丢值、禁用字段进入 FormData |

建议保存以下证据：

```text
浏览器与版本：
初始 selectedOptions：
修改后 selectedOptions：
FormData.getAll("tags")：
fieldset.disabled：
第一项 legend 中开关的 disabled：
配送字段是否进入 FormData：
0.01 元 × 3 的 totalPriceCents：
progress 当前值与 max：
meter 当前值和区间：
自由成色值：
两个 submitter 的 intent：
Network 是否出现请求：
刷新后的状态：
```

### 7.12 渐进扩展：添加只读的计算规则说明

在价格分组中加入：

```html
<label for="pricing-rule">计价规则</label>
<textarea
  id="pricing-rule"
  name="pricingRule"
  rows="2"
  cols="42"
  readonly
>总价 = 单价整数分 × 数量；服务端仍需重新计算。</textarea>
```

观察：

- 可以聚焦和复制；
- 用户不能直接修改；
- 它仍可能进入 FormData；
- 它是教学说明，不应作为服务器规则来源。

再把 `readonly` 错写到 `select` 上，观察它不会形成可靠只读选择。恢复时删除无效设计：若必须允许提交且不允许编辑，应由页面展示服务器事实并在服务端取回事实；若临时禁用选择，要接受它不进入 FormData，并在服务端从可信来源重建。

## 8. 常见错误与排查路径

### 8.1 误判禁用 fieldset 的第一 legend

**现象：**整个分组视觉变灰，但 legend 中的开关仍能操作，被误认为浏览器失效。

**证据：**

```js
console.log(deliveryGroup.disabled);    // true
console.log(deliveryEnabled.disabled);             // false：自身没有 disabled 属性
console.log(deliveryEnabled.matches(":disabled")); // false：位于首个 legend 的例外内
console.log(deliveryArea.disabled);                 // false：自身没有 disabled 属性
console.log(deliveryArea.matches(":disabled"));    // true：受到 fieldset 传播
console.log(new FormData(form).has("deliveryArea")); // false：不是成功控件
```

**原因：**`.disabled` 只反映控件自身的内容属性/DOM 属性，不包含祖先 `fieldset` 传播后的有效禁用状态。第一项 `legend` 后代是传播例外；普通后代虽然 `.disabled === false`，仍会匹配 `:disabled`，且不会进入 FormData。

**恢复：**如果开关本来就用于启用分组，保留结构并同时记录 `.disabled`、`:disabled` 和 FormData；如果不应操作，把开关移出例外区域或单独禁用。不要依赖变灰外观或单一 DOM 属性推断有效状态。

### 8.2 把 `datalist` 当成白名单

**错误案例：**

```html
<input name="condition" list="conditions">
<datalist id="conditions">
  <option value="近全新"></option>
</datalist>
```

产品代码却直接假定值只能是“近全新”。

**现象：**用户输入“有划痕”仍可提交。

**恢复：**允许自由文本就接受并校验文本；必须有限集合就使用 `select` 或增加独立校验。

### 8.3 用浮点元计算金额

**错误案例：**

```js
const totalYuan = Number(unitPrice.value) * Number(quantity.value);
const totalCents = totalYuan * 100;
```

**问题：**二进制浮点不能精确表示所有十进制小数，后续舍入规则也不明确。

**恢复：**先按明确十进制格式解析成整数分，再乘整数数量。真实交易规则由服务端重复执行。

### 8.4 用 `progress` 表示资料质量

**现象：**读者误以为质量会随着时间最终到 100%。

**原因：**任务进度和范围测量混淆。

**恢复：**资料完成项使用 `progress`；资料质量分使用 `meter`，并显示文字解释。

### 8.5 用 `value="0"` 表示未知进度

**现象：**控件表示“确定完成 0%”，而不是“不知道进度”。

**恢复：**

```js
progress.removeAttribute("value");
```

复验 `progress.position === -1`。

## 9. 课后题

### 9.1 fieldset 例外

禁用 `fieldset` 后，哪个 `legend` 的后代获得传播例外？第二个 legend 是否同样例外？

<details>
<summary>查看答案</summary>

只有第一项 `legend` 元素的后代获得例外。第二项不获得。

</details>

### 9.2 datalist 选择

“商品品牌可以从常用品牌中选，也允许填写小众品牌”和“商品分类只能是七个标准分类”分别使用什么？

<details>
<summary>查看答案</summary>

前者适合 `input[list] + datalist`；后者适合 `select` 或另一种有限集合控件，并由服务端校验机器值。

</details>

### 9.3 output 提交

`output` 显示 `79.80 元`，为何服务端仍应根据单价整数分和数量重算？

<details>
<summary>查看答案</summary>

`output` 是客户端结果展示，值本身不随表单提交，且客户端状态可被修改。服务端必须使用可信规则重算最终金额。

</details>

### 9.4 progress 与 meter

“上传了 4 个文件中的 3 个”和“存储占用 75%”分别选择哪个元素？

<details>
<summary>查看答案</summary>

前者是任务完成比例，使用 `progress`；后者是已知范围内的测量，使用 `meter`。

</details>

## 10. 实践练习

### 10.1 故障注入：禁用传播与建议越界

文件：

```text
practice/html-chapter-05/control-faults.html
```

依次注入：

1. 把启用开关移出第一项 `legend`，但仍放在禁用 fieldset 内；
2. 把配送 select 的 DOM 值误认为一定进入 FormData；
3. 把 `datalist` 的自由输入误判为非法；
4. 删除观察按钮的 `type="button"`；
5. 把未知 progress 改成 `value="0"`。

每项保存：

```text
源代码变化：
触发步骤：
可见现象：
DOM 证据：
FormData 证据：
根因：
最小修复：
同路径复验：
```

完成标准：

- 能说明第一项 legend 例外，而不只说“浏览器特殊处理”；
- 能同时展示禁用字段 `.value` 存在与 FormData 条目缺失；
- 能输入不在 datalist 中的合理自由文本；
- 能用 `event.submitter` 证明辅助按钮不再提交；
- 能用 `progress.position === -1` 证明恢复未知状态。

## 11. 阶段验收

### 11.1 FRM-021：分组与禁用

- [ ] 相关控件使用 fieldset/legend；
- [ ] 第一项 legend 是清楚的组名；
- [ ] 能预测 disabled 传播；
- [ ] 能演示第一项 legend 后代例外；
- [ ] 禁用字段不被误判为提交数据；
- [ ] readonly 只用于支持的文本控件；
- [ ] disabled 与 readonly 都不承担授权。

### 11.2 FRM-022：建议值

- [ ] datalist 通过 `list/id` 正确关联；
- [ ] 能输入建议外的合理文字；
- [ ] 不把 datalist 当白名单；
- [ ] 必须有限选择时改用 select 或独立校验；
- [ ] 不依赖统一建议弹层外观。

### 11.3 FRM-023：输出、进度与测量

- [ ] output 的 `for` 指向真实相关控件；
- [ ] 脚本主动更新 output；
- [ ] 金额以整数分计算；
- [ ] 不把 output 当作可信提交值；
- [ ] 确定 progress 有 value/max；
- [ ] 未知 progress 移除 value；
- [ ] meter 的范围与 optimum 逻辑一致；
- [ ] progress 和 meter 都有可见文字解释。

### 11.4 运行证据

```text
个人文件路径：
浏览器与版本：
label/control 关联：
textarea 默认值与当前值：
textarea 选择区：
单选当前值：
多选 selectedOptions：
多选 FormData.getAll：
两个提交按钮的 intent：
fieldset 初始状态：
第一 legend 开关状态：
配送字段 FormData：
datalist 建议外输入：
0.01 × 3 整数分结果：
确定 progress：
未知 progress.position：
meter 范围和当前值：
Network 请求：
刷新后状态：
未验证设备或辅助技术：
```

## 12. 常见问题

### Q5：`cols="40"` 是否表示最多 40 个字符？

不是。它是显示宽度提示。长度约束由 `minlength`、`maxlength` 和业务规则承担。

### Q10：fieldset 禁用后，legend 中可以放任意可编辑表单吗？

规范例外允许第一项 legend 后代不受传播，但设计上应保持目的清楚，常见用途是启用整个分组的开关。不要把大量无关输入藏进 legend。

### Q12：output 有 name，为什么 FormData 仍没有它？

`output` 是表单关联、可列出和可重置的结果元素，但不是随表单提交其值的控件。服务端计算应基于原始输入和可信规则。

### Q13：如何让 progress 从确定状态恢复未知状态？

移除 `value` 内容属性，而不是把值设为 0。可用 `.position === -1` 复验。

### Q14：meter 的颜色可以作为验收依据吗？

不可以。原生呈现受浏览器和系统主题影响，颜色也不能独立承载信息。验收应检查数值、范围、文字解释和可访问名称。

### Q18：可以把完成度 progress 当作表单校验结果吗？

不能。完成度只是产品提示。真正能否提交仍由原生约束、业务校验和服务端最终判定共同决定。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：使用 fieldset、legend、datalist、output、progress 和 meter 表达分组与状态。
- `FRM-021`：fieldset、legend 与 disabled 传播
- `FRM-022`：datalist 与建议值边界
- `FRM-023`：output、progress、meter
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：选择控件、选项与按钮](10-select-option-button.md) · [下一课：输入辅助、表单所有者与状态](12-input-assistance-form-state.md) · [返回 HTML 模块](../README.md)
