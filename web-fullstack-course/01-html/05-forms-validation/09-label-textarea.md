# 标签、可见名称与 textarea

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 建立 label 与控件的可靠关联，并区分 textarea 的初始文本、当前值和换行。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-017`、`FRM-018` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

建立 label 与控件的可靠关联，并区分 textarea 的初始文本、当前值和换行。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-017（label 与可见名称）、FRM-018（textarea 的初始值、当前值、rows/cols/wrap）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 从“控件四层模型”理解表单

面对一个表单控件，可以依次问：

```text
1. 用户如何知道它是什么？
   → label、legend、按钮文字、可见说明

2. 浏览器当前保存什么状态？
   → value、selected、disabled、readOnly

3. 构造表单数据时会产生什么条目？
   → name + 当前值 + successful control 规则

4. 浏览器如何帮助输入？
   → autocomplete、inputmode、enterkeyhint、datalist
```

四层之间有关联，但不能互相替代：

- 有 `name` 不代表有可见名称；
- 有 `label` 不代表有提交字段名；
- 有 `datalist` 不代表当前值一定来自建议；
- 有 `inputmode="numeric"` 不代表输入一定是数字；
- 页面显示 `output` 不代表该值会进入 `FormData`；
- 控件被禁用不代表用户没有权限构造同名请求。

### 4.2 `label`：显式关联、隐式关联与可见名称边界

#### 显式关联

显式关联让 `label[for]` 的值精确匹配可标记控件的 `id`：

```html
<label for="listing-title">商品标题</label>
<input id="listing-title" name="title" type="text">
```

这里：

- `for="listing-title"` 建立标签关系；
- `id="listing-title"` 是页面内关联目标；
- `name="title"` 是提交字段名；
- 三者职责不同，不能因为文字相同就省略其中需要的一项。

显式形式允许标签和控件不互相嵌套，适合网格布局，也便于脚本检查。点击大多数标签文字会把焦点或激活行为转交给关联控件。

可以在 Console 中观察：

```js
const title = document.querySelector("#listing-title");
console.log(title.labels.length);
console.log(title.labels[0].control === title);
```

#### 隐式关联

隐式关联把控件放进 `label`：

```html
<label>
  <input name="negotiable" type="checkbox" value="yes">
  接受议价
</label>
```

这种写法不依赖 `for/id`，对短小的复选框或单选按钮很自然。复杂布局中，显式形式通常更容易维护。不要在同一个 `label` 中放入第二个可标记控件，也不要塞入链接、按钮等会与标签激活冲突的交互元素。

一个控件可以拥有多个标签，但重复名称可能造成冗长朗读。只有当多个可见入口确实都承担标签职责时才这样做。

#### 可见名称不是提示文字

以下内容各有职责：

| 内容 | 主要职责 | 能否稳定替代可见标签 |
| --- | --- | --- |
| `label` | 给单个控件命名，并扩大可点击区域 | 是，优先选择 |
| `legend` | 给一组 `fieldset` 控件命名 | 不能代替组内每个字段的标签 |
| 按钮文本 | 给 `button` 命名 | 只适用于该按钮 |
| `placeholder` | 在空控件中给输入示例 | 不能，输入后会消失 |
| `aria-label` | 在确实没有合适可见文字时提供名称 | 不能形成可见名称 |
| `aria-describedby` | 关联格式、单位、错误或帮助文字 | 是描述，不是名称 |
| `title` | 补充提示，触发方式和可见性不稳定 | 不能 |

可见文字“商品标题”和程序化名称应一致。不要让页面写“价格”，却用 `aria-label="商品编号"` 覆盖成另一个概念。语音输入用户通常按屏幕上的词操作；可见名称与可访问名称不一致会直接破坏这条路径。

`label` 可关联的对象包括大多数非 `hidden` 的 `input`、`textarea`、`select`、`button`、`output`、`progress` 和 `meter`。普通 `div` 不是因为拥有 `id` 就能成为标签目标。

### 4.3 `textarea`：初始值、当前值和换行

`textarea` 没有用于设置初始文本的 `value` 内容属性。开始标签与结束标签之间的文本才是初始值：

```html
<label for="description">商品描述</label>
<textarea id="description" name="description" rows="5" cols="36">灯臂可调，开关正常。</textarea>
```

加载后：

```js
console.log(description.defaultValue); // 源标记提供的初始值
console.log(description.value);        // 当前值，初始时通常相同
```

用户输入只改变当前值 `.value`。调用所属表单的 `reset()` 后，当前值回到 `.defaultValue`。脚本修改 `defaultValue` 会改变之后重置所回到的值；脚本修改 `value` 只改变当前编辑状态。

#### 缩进也可能成为值

下面的排版把换行和空格放进了初始值：

```html
<textarea name="description">
  灯臂可调。
</textarea>
```

如果不希望前导换行，应把初始文字紧贴开始标签，或者在脚本中明确赋值。不要为了“代码整齐”无意改变用户数据。

#### `rows` 与 `cols`

- `rows` 是期望显示的文本行数；
- `cols` 是期望显示的平均字符宽度；
- 它们帮助浏览器提供初始尺寸，不限制实际字符数量；
- 字符长度约束使用 `minlength`、`maxlength`，业务边界仍需服务端复验；
- CSS 可以改变最终尺寸，但不应让控件小到无法编辑。

#### `wrap`

`wrap` 主要影响换行处理：

- `soft`：默认状态；视觉上可以自动折行，但提交值不会因为视觉折行而额外插入这些换行；
- `hard`：浏览器在构造提交值时按控件换行宽度加入换行，规范要求同时给出 `cols`；
- 非标准值不应成为课程或生产合同。

用户亲自按 Enter 输入的换行与自动视觉折行不是一回事。需要保存原文时，应先明确产品是否允许浏览器按显示宽度改写换行；大多数自由描述使用默认 `soft` 更可预测。

#### 选择区 API

文本控件可以观察和修改选择区：

```js
const start = description.selectionStart;
const end = description.selectionEnd;
const direction = description.selectionDirection;

description.setSelectionRange(0, 2, "forward");
description.focus();
```

`selectionStart` 和 `selectionEnd` 是当前值中的索引，不是屏幕像素位置。脚本调整选择后通常还需聚焦，用户才能看见。不要在每次输入时强行重设选择区，否则会让光标跳动。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `FRM-017`：label 与可见名称
- `FRM-018`：textarea 的初始值、当前值、rows/cols/wrap

## 6. 最小可运行案例

### 6.1 案例目标

这个页面只观察三件事：

1. 显式标签和隐式标签是否都关联成功；
2. `textarea` 的 `defaultValue` 与 `value` 如何分离并在 reset 后恢复；
3. 多选 `select` 的 `.value`、`selectedOptions` 和 `FormData.getAll()` 有何差异。

### 6.2 文件位置

在个人练习目录创建：

```text
market-learning/
└── practice/
    └── html-chapter-05/
        └── controls-observer.html
```

教材仓库只保存下面的 Markdown 代码。将完整代码保存为 `controls-observer.html`。

### 6.3 完整文件

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>控件状态观察页</title>
    <style>
      body {
        max-width: 48rem;
        margin: 0 auto;
        padding: 1rem;
        font: 1rem/1.6 system-ui, sans-serif;
      }

      label,
      select,
      textarea,
      button {
        display: block;
        margin-block: 0.5rem;
      }

      textarea,
      select {
        inline-size: min(100%, 32rem);
      }

      output {
        display: block;
        padding: 0.75rem;
        white-space: pre-wrap;
        border: 1px solid #777;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>控件状态观察页</h1>
      <p>所有变化仅存在于当前页面内存中。</p>

      <form id="observer-form">
        <label for="description">商品描述</label>
        <textarea
          id="description"
          name="description"
          rows="4"
          cols="36"
          wrap="soft"
        >灯臂可调，开关正常。</textarea>

        <label for="tags">商品标签（可多选）</label>
        <p id="tags-help">桌面端可使用 Ctrl、Command 或 Shift 组合选择。</p>
        <select
          id="tags"
          name="tags"
          multiple
          size="4"
          aria-describedby="tags-help"
        >
          <option value="tested" selected>已测试</option>
          <option value="negotiable">可议价</option>
          <option value="with-box">有原包装</option>
          <option value="local-pickup">仅限自提</option>
        </select>

        <label>
          <input id="negotiable" name="negotiable" type="checkbox" value="yes">
          接受议价
        </label>

        <button id="inspect" type="button">读取当前状态</button>
        <button type="reset">恢复默认状态</button>
      </form>

      <h2>观察结果</h2>
      <output id="result" for="description tags negotiable">
        尚未读取。
      </output>
    </main>

    <script>
      const form = document.querySelector("#observer-form");
      const description = document.querySelector("#description");
      const tags = document.querySelector("#tags");
      const negotiable = document.querySelector("#negotiable");
      const inspectButton = document.querySelector("#inspect");
      const result = document.querySelector("#result");

      function selectedTagValues() {
        return Array.from(
          tags.selectedOptions,
          (option) => option.value,
        );
      }

      function renderObservation() {
        const data = new FormData(form);
        const evidence = {
          descriptionLabelCount: description.labels.length,
          negotiableLabelCount: negotiable.labels.length,
          descriptionDefaultValue: description.defaultValue,
          descriptionCurrentValue: description.value,
          selectValueOnly: tags.value,
          selectedOptions: selectedTagValues(),
          formDataTags: data.getAll("tags"),
          negotiableSubmitted: data.has("negotiable"),
        };

        result.value = JSON.stringify(evidence, null, 2);
      }

      inspectButton.addEventListener("click", renderObservation);

      form.addEventListener("reset", () => {
        setTimeout(renderObservation, 0);
      });

      renderObservation();
    </script>
  </body>
</html>
```

### 6.4 打开方式

1. 保存文件；
2. 用浏览器直接打开，不需要服务器；
3. 点击“读取当前状态”；
4. 修改描述，选择两到三个标签，再次读取；
5. 选中“接受议价”，再次读取；
6. 点击“恢复默认状态”；
7. 打开 Console，手动查看 `description.selectionStart` 和 `description.selectionEnd`。

### 6.5 预期结果

首次读取：

- `descriptionLabelCount` 是 1；
- `negotiableLabelCount` 是 1，说明隐式标签也建立了关联；
- 描述默认值与当前值都是“灯臂可调，开关正常。”；
- `selectValueOnly` 只有首个选中值 `tested`；
- `selectedOptions` 和 `formDataTags` 都包含全部当前选中标签；
- 未勾选议价时，`negotiableSubmitted` 是 `false`。

修改后：

- `descriptionCurrentValue` 改变；
- `descriptionDefaultValue` 保持不变；
- 多选数组按选项树顺序列出当前选择；
- 勾选议价后，FormData 中出现 `negotiable=yes`。

重置后：

- 描述当前值回到默认值；
- 只有源标记中带 `selected` 的 `tested` 恢复选中；
- 复选框回到未选中；
- reset 监听器使用下一轮任务读取，避免在浏览器完成重置前读取旧状态。

### 6.6 失败证据

任一情况都应记录为失败：

- `description.labels.length === 0`：检查 `for` 与 `id`；
- 修改描述后 `defaultValue` 也改变：检查脚本是否错误地写了 `.defaultValue`；
- 选中三项但 `formDataTags` 只有一项：检查是否使用了 `get()` 或 `.value`；
- 点击“读取当前状态”触发页面导航：检查按钮是否遗漏 `type="button"`；
- reset 后结果仍显示旧值：检查是否在 reset 事件同步阶段过早读取；
- 页面刷新后还声称数据已经保存：文案越过了静态教学边界。

### 6.7 渐进扩展：观察文本选择区

在读取按钮旁增加：

```html
<button id="select-first-two" type="button">
  选中描述前两个字符
</button>
```

在脚本查询区增加：

```js
const selectFirstTwoButton = document.querySelector("#select-first-two");
```

在事件区增加：

```js
selectFirstTwoButton.addEventListener("click", () => {
  description.setSelectionRange(0, 2, "forward");
  description.focus();
});
```

预期“灯臂”被选中。失败时依次检查按钮类型、元素 ID、当前描述是否至少两个字符，以及调用后是否聚焦。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [分组、建议、输出、进度与测量](11-fieldset-datalist-output-progress-meter.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 FRM-017（label 与可见名称） 对应的元素、属性或状态；
- 在项目中实现并标出与 FRM-018（textarea 的初始值、当前值、rows/cols/wrap） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`11-fieldset-datalist-output-progress-meter.md`](11-fieldset-datalist-output-progress-meter.md)。

## 8. 常见错误与排查路径

### 8.1 用 `placeholder` 代替标签

**错误案例：**

```html
<input name="title" placeholder="商品标题">
```

**现象：**空白时看似有名称，输入后文字消失。

**诊断：**

1. Elements 中查找关联 `label`；
2. Console 读取 `input.labels.length`；
3. 检查 Accessibility 面板中的名称来源。

**原因：**提示示例不承担稳定可见名称。

**恢复：**

```html
<label for="title">商品标题</label>
<input id="title" name="title" placeholder="例如：阅读台灯">
```

**复验：**输入后“商品标题”仍可见，`labels.length === 1`。

### 8.2 `for` 错指向 `name`

**错误案例：**

```html
<label for="title">商品标题</label>
<input id="listing-title" name="title">
```

**现象：**点击标签不聚焦输入框，`label.control` 为 `null`。

**原因：**`for` 匹配 `id`，不是 `name`。

**恢复：**把 `for` 改为 `listing-title`，保留提交字段名 `title`。

### 8.3 在 `textarea` 上写 `value`

**错误案例：**

```html
<textarea name="description" value="灯臂可调"></textarea>
```

**现象：**控件初始为空，`value` 内容属性没有提供期望文本。

**恢复：**

```html
<textarea name="description">灯臂可调</textarea>
```

脚本设置当前值时使用 `.value`，设置重置目标时才考虑 `.defaultValue`。

### 8.4 代码缩进污染 textarea 初始值

**现象：**描述开头多出换行和空格。

**证据：**

```js
console.log(JSON.stringify(description.defaultValue));
```

**原因：**开始标签与结束标签之间的排版就是初始文本。

**恢复：**把初始文字紧贴开始标签，复验 JSON 字符串开头。

### 8.5 期待 `output[for]` 自动计算

**现象：**修改单价和数量后结果不变。

**原因：**`for` 只表达关系，计算逻辑仍由脚本负责。

**恢复：**监听相关输入，转换成整数分，设置 `output.value`。再用 `0.01 × 3` 复验。

### 8.6 标准诊断与恢复记录

每次故障都按同一格式留下证据：

```text
故障目标：
源代码：
操作步骤：
可见现象：
DOM 当前状态：
FormData 当前条目：
Console 证据：
根因：
最小修复：
同一路径复验：
未验证环境：
```

只写“改好了”不能证明恢复。必须用触发故障的同一路径重新操作，并比较修复前后的状态。

## 9. 课后题

### 9.1 标签与名称

1. `label[for]` 应匹配控件的 `id` 还是 `name`？
2. `placeholder` 为什么不能承担唯一可见名称？
3. `aria-describedby` 和 `label` 分别回答什么问题？

<details>
<summary>查看答案</summary>

1. 匹配 `id`；`name` 用于表单字段条目。
2. 它只在控件为空时出现，输入后消失，而且职责是示例或短提示。
3. `label` 回答“这个控件是什么”，`aria-describedby` 关联“如何填写、单位、限制或错误是什么”。

</details>

### 9.2 textarea 状态

源代码：

```html
<textarea id="note">默认说明</textarea>
```

用户改成“当前说明”后，`defaultValue` 和 `value` 分别是什么？表单重置后又是什么？

<details>
<summary>查看答案</summary>

用户修改后，`defaultValue` 仍是“默认说明”，`value` 是“当前说明”。重置后，`value` 回到“默认说明”。

</details>

### 9.3 换行推理

`wrap="soft"` 下，一段文字因为控件宽度不足显示成三行。用户没有按 Enter。构造提交值时是否应把这三处视觉折行都当作用户换行？

<details>
<summary>查看答案</summary>

不应。`soft` 的视觉折行不会因此全部变成提交值中的新换行。用户实际输入的换行仍属于值。

</details>

### 9.4 按钮值

按钮显示“生成本地预览”，但 `value="preview"`。用户和 FormData 分别得到什么？

<details>
<summary>查看答案</summary>

用户看到按钮内容“生成本地预览”；当该按钮发起提交且拥有 `name` 时，表单条目使用机器值 `preview`。

</details>

## 10. 实践练习

### 10.1 基础：控件关系观察卡

文件：

```text
practice/html-chapter-05/control-relations.html
```

要求：

- 一个显式标签文本输入；
- 一个隐式标签复选框；
- 一个 `textarea`，设置 `rows`、`cols`、`wrap="soft"`；
- 一个带两个 `optgroup` 的单选 `select`；
- 一个 `button type="button"`；
- 一个 `output` 显示当前 textarea 的字符数；
- reset 后字符数同步恢复。

打开方式：浏览器直接打开。

预期：

- 两种标签点击都能激活对应控件；
- 修改文本时字符数变化；
- 分类提交值是机器值；
- reset 后 `value === defaultValue`。

失败证据：

- 任一控件没有可见名称；
- textarea 用 `value` 内容属性提供初始值；
- 计数按钮触发表单提交；
- output 没有随 reset 更新。

答案标准：

- `label[for]` 精确匹配 `id`；
- 隐式标签只包裹一个控件；
- 计数基于 `.value.length`；
- reset 事件后的读取发生在浏览器恢复默认状态之后；
- 页面写明数据未保存。

## 11. 阶段验收

### 11.1 FRM-017：标签与可见名称

- [ ] 每个需要名称的控件都有持久可见名称；
- [ ] 能写出显式和隐式标签；
- [ ] `for` 与 `id` 一一核对；
- [ ] 不用 placeholder、title 或描述文字冒充标签；
- [ ] 可见名称与程序化名称含义一致；
- [ ] 能用 `.labels` 或 `.control` 取证。

### 11.2 FRM-018：textarea

- [ ] 初始值写在元素内容中；
- [ ] 能解释 `defaultValue` 与 `value`；
- [ ] 能预测 reset；
- [ ] `rows`、`cols` 不被解释成长度限制；
- [ ] 能区分视觉折行与用户换行；
- [ ] 能使用选择区 API 且不抢夺用户光标。

## 12. 常见问题

### Q1：显式标签和隐式标签哪一种更好？

两者都能建立原生关联。复杂布局通常优先显式形式；短复选框常适合隐式形式。关键是关联真实存在、可见名称清楚，并在目标浏览器与辅助技术中复验。

### Q2：可以同时包裹控件又写 `for` 吗？

可以让 `for` 指向同一个被包裹控件，但通常没有必要。不要让 `for` 指向一个控件、内部又包裹另一个控件。

### Q3：为什么按钮不用额外 label？

`button` 的内容通常就是可见名称。按钮内应使用清楚动作文字，例如“生成本地预览”，不要只写含义不明的“确定”。

### Q4：textarea 能使用 `value` 属性吗？

初始文本不通过 `value` 内容属性设置。源标记用元素内容，脚本读写当前状态用 `.value`。

### Q6：`wrap="hard"` 能保证所有平台保存完全相同的视觉行吗？

不应这样假设。它会让构造提交值时考虑换行宽度，但最终排版仍受字体、CSS 和实现影响。若换行具有业务意义，应设计明确的数据规则。

## 13. 扩展阅读

资料核验日期：2026-10-10。以下链接以 HTML Living Standard 和 W3C 可访问性资料为主；阅读时优先核对元素分类、当前值算法、禁用传播和表单提交边界。

- [WHATWG：label 元素](https://html.spec.whatwg.org/multipage/forms.html#the-label-element)：显式/隐式关联、可标记元素和 `labels` API。
- [WHATWG：button 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-button-element)：`type`、`form`、`name/value` 与提交者规则。
- [WHATWG：select 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-select-element)：单选、多选、`size`、当前选择和 `selectedOptions`。
- [WHATWG：datalist 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-datalist-element)：建议列表与输入值边界。
- [WHATWG：optgroup 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-optgroup-element)：选项分组和禁用状态。
- [WHATWG：option 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-option-element)：值、默认选中、当前选中与重置。
- [WHATWG：textarea 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-textarea-element)：初始值、当前值、`rows/cols/wrap` 和选择 API。
- [WHATWG：output 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-output-element)：`for/form/name`、当前值、默认值和不提交边界。
- [WHATWG：progress 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-progress-element)：确定与未知进度。
- [WHATWG：meter 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-meter-element)：范围、区间和 optimum。
- [WHATWG：fieldset 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-fieldset-element)：分组、禁用传播和第一 legend 例外。
- [WHATWG：legend 元素](https://html.spec.whatwg.org/multipage/form-elements.html#the-legend-element)：分组标题结构。
- [WHATWG：表单控件基础设施](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html)：`disabled`、`readonly`、`form`、`autocomplete` 和成功控件规则。
- [WHATWG：inputmode](https://html.spec.whatwg.org/multipage/interaction.html#attr-inputmode)：虚拟键盘提示。
- [WHATWG：enterkeyhint](https://html.spec.whatwg.org/multipage/interaction.html#attr-enterkeyhint)：Enter 键动作提示。
- [W3C WAI：表单标签教程](https://www.w3.org/WAI/tutorials/forms/labels/)：可见标签、分组和辅助技术关系。
- [W3C 可访问名称与描述计算](https://www.w3.org/TR/accname-1.2/)：名称来源和描述边界。
- [邻里集市项目契约](../../00-guide/project-contract.md)：核对静态教学状态、整数分和服务端边界。

阅读官方资料时，不要只摘属性列表。至少回答：

1. 元素是否可标记、可列出、可重置、可提交；
2. 内容属性和 IDL 属性分别反映默认状态还是当前状态；
3. 禁用、只读和表单所有者如何改变交互与提交；
4. 原生控件的可见外观是否属于跨浏览器保证；
5. 哪些结论必须由真实目标浏览器和辅助技术复验。

## 我现在能做到什么

- 能解释并验证：建立 label 与控件的可靠关联，并区分 textarea 的初始文本、当前值和换行。
- `FRM-017`：label 与可见名称
- `FRM-018`：textarea 的初始值、当前值、rows/cols/wrap
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：showPicker 与渐进增强](08-showpicker-progressive-enhancement.md) · [下一课：选择控件、选项与按钮](10-select-option-button.md) · [返回 HTML 模块](../README.md)
