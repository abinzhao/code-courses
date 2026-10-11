# 表单、滚动、打印与强制颜色：保留原生能力和系统边界

## 任务卡

邻里集市发布预览需要可读标签、提交后错误、整数分价格、横向图片说明和打印清单。组件必须在键盘、缩放、减少动作、强制颜色与打印预览中保持可用。本课交付一个完整本地表单，不发送商品或联系方式。

- **建议时间：**5–6 小时。
- **可见结果：**无效输入有字段级文字错误；有效输入生成预览并可打印。
- **验收证据：**键盘路径、320px/200% 缩放、reduce、强制颜色和打印预览记录。

## 1. 任务背景

表单控件带有浏览器和操作系统提供的语义、键盘、焦点、验证和高对比能力。CSS 可以协调字体、尺寸、颜色和布局，但过度清除 `appearance` 往往会删除用户依赖的状态线索。

同一个发布组件还会遇到不同输出介质：

- 屏幕上需要滚动定位和可操作控件；
- 减少动作时不能强制长距离平滑滚动；
- 强制颜色时自定义背景可能被系统替换；
- 打印时操作按钮无意义，但商品、价格和边界说明必须保留。

这些不是四套业务，而是同一结构在不同用户环境中的呈现。

## 2. 学习目标

完成后你应能：

- 保留 label、字段说明、错误文字与原生键盘行为；
- 用 `font: inherit`、尺寸和间距统一控件而不抹掉语义；
- 区分 `disabled`、`readonly`、`required` 和 CSS 伪类；
- 选择 `:invalid`、`:user-invalid` 或提交状态的正确时机；
- 使用 `accent-color`、`caret-color` 和有限 `appearance`；
- 解释 placeholder 不能替代持久标签；
- 使用 `scroll-margin`、`scroll-padding` 和 `scroll-behavior`；
- 谨慎设计 scroll snap、overscroll 和滚动条样式；
- 编写 `@media print`、`@page` 和分页规则；
- 在 `forced-colors` 中保留系统边界、焦点与状态。

## 3. 预备知识

先完成 HTML 表单模块、[响应式偏好](../07-responsive-container/03-logical-properties-input-safe-area-preferences.md)和[层叠架构](02-layers-nesting-scope.md)。个人路径：

```text
market-learning/practice/css-09-form/index.html
```

需要能使用键盘、浏览器打印预览、Rendering 强制颜色/减少动作模拟，以及 Accessibility 面板检查名称与说明关系。

## 4. 核心理论

### 4.1 先保留原生表单契约

每个字段需要可持久显示的 `<label>`，说明与错误通过 `aria-describedby` 关联。placeholder 在输入后消失、对比可能较低，也不是可靠可访问名称。

```css
button,
input,
select,
textarea {
  color: inherit;
  font: inherit;
}
```

最小目标尺寸、padding 和边框可以统一；checkbox、radio、select、date 等控件保留平台差异通常比完全重画更稳。

`appearance: none` 会移除部分原生外观。若用于 select、checkbox 或 radio，就必须重新实现勾选/展开状态、禁用、焦点、尺寸、强制颜色和不同输入方式。本课不对这些控件清除外观。

`accent-color` 可给原生 checkbox/radio/progress 等提供有限品牌色；系统仍可能为对比重映射。`caret-color` 控制文本插入光标，不应用透明值隐藏输入位置。

### 4.2 字段状态不是一回事

- `disabled`：不可交互，通常不随表单提交；
- `readonly`：值不可编辑，但仍可聚焦/选择且通常可提交；
- `required`：参加约束验证；
- `aria-disabled`：只表达无障碍语义，不自动阻止原生操作；
- `aria-invalid`：表达已知错误，不会执行验证。

不要只把按钮涂灰模拟 disabled，也不要只设 aria-disabled 后仍执行提交。

### 4.3 验证时机与伪类

空的 required 字段从首屏起就可能匹配 `:invalid`。若页面加载就给所有字段红框，用户会在尚未操作时被指责。

可选策略：

- 使用支持环境中的 `:user-invalid`；
- blur 后标记已访问字段；
- 用户提交尝试后在 form 添加 `data-submitted`；
- 服务端错误到达后显式设置对应状态。

CSS 伪类只反映浏览器约束。标题全空格、整数分、跨字段关系、权限和并发必须由脚本/服务端分别验证。本课用 Constraint Validation API 提供本地教学验证，并明确没有服务端。

错误必须有文字。颜色、边框和图标只做补充。

### 4.4 滚动是导航行为

`scroll-behavior: smooth` 影响部分程序化和片段滚动，不控制所有用户滚轮/触摸。reduce 模式应改为 `auto`。

粘性标题存在时：

- 滚动容器的 `scroll-padding-block-start` 为目标保留空间；
- 目标的 `scroll-margin-block-start` 提供自身外部滚动余量。

`scroll-snap-type` 与 `scroll-snap-align` 可用于横向图片或步骤，但 mandatory 可能让长项目难以阅读。保留按钮、键盘和自然滚动路径。

`overscroll-behavior` 控制滚动链/边界行为，不应无理由在整页阻止自然导航。滚动条颜色和宽度支持、平台覆盖滚动条差异较大，不能隐藏后只靠手势暗示。

`content-visibility: auto` 可跳过离屏渲染，配合 `contain-intrinsic-size` 提供估计尺寸；它不是删除数据或安全隐藏，焦点、页内查找和滚动定位要真实验证。

### 4.5 打印与分页

`@media print` 可以：

- 隐藏提交、主题、轮播控制等无意义操作；
- 移除 fixed/sticky，避免每页遮挡；
- 展开必要滚动区域；
- 增加 URL 或边界说明；
- 使用 `break-inside` 减少卡片被拆开。

`@page` 可请求页边距和尺寸，但用户打印设置、驱动和浏览器仍可覆盖。`orphans`、`widows` 与 break 属性是分页倾向，不保证复杂布局绝对遵守。

背景色是否打印由用户设置决定，必要状态必须有文字和边框。CSS 隐藏敏感字段不构成访问控制，根本不应把不该打印的数据送入文档。

### 4.6 强制颜色

`forced-colors: active` 下，用户代理把许多颜色映射为系统颜色。可使用 `Canvas`、`CanvasText`、`ButtonFace`、`ButtonText`、`Highlight` 等系统关键字增强必要边界。

不要对整页写 `forced-color-adjust: none`。只在品牌标识或颜色本身承载不可替代信息且经过验证时局部保色；即使如此，也要提供文字替代。

焦点使用 outline，不仅靠 box-shadow，因为阴影可能被移除。原生 checkbox 通常比完全自绘控件更能适配系统模式。

## 5. 属性、伪类与规则清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `appearance` | 控制平台原生外观 | `appearance: none` | 清除后要重建全部状态 |
| `accent-color` | 强调原生控件 | `accent-color: #326747` | 系统可重映射 |
| `caret-color` | 设置输入光标颜色 | `caret-color: currentColor` | 不应隐藏光标 |
| `resize` | 控制 textarea 调整 | `resize: vertical` | 不要无理由禁用 |
| `:valid` / `:invalid` | 匹配约束结果 | `input:invalid` | 首屏就可能 invalid |
| `:user-valid` / `:user-invalid` | 匹配用户交互后状态 | `input:user-invalid` | 触发/支持需复验 |
| `:disabled` / `:read-only` | 区分控件职责 | `input:disabled` | 提交行为不同 |
| `scroll-behavior` | 程序化滚动方式 | `smooth` | reduce 下使用 auto |
| `scroll-margin-*` | 目标滚动外余量 | `scroll-margin-block-start: 5rem` | 不改变普通布局间距 |
| `scroll-padding-*` | 容器滚动内余量 | `scroll-padding-block-start: 5rem` | 只影响 snap/滚动对齐 |
| `scroll-snap-type` | 启用停靠轴与严格度 | `inline proximity` | mandatory 谨慎 |
| `overscroll-behavior` | 控制滚动链 | `contain` | 不应锁死整页 |
| `scrollbar-width/color` | 有限调整滚动条 | `thin` | 跨平台表现不同 |
| `@media print` | 定义打印样式 | `@media print {}` | 必须看打印预览 |
| `@page` | 请求页盒设置 | `margin: 18mm` | 用户设置可覆盖 |
| `break-inside` | 控制分页倾向 | `avoid` | 不保证所有复杂场景 |
| `forced-colors` | 查询系统强制颜色 | `(forced-colors: active)` | 模拟不代替真实系统 |
| `forced-color-adjust` | 允许/禁止颜色调整 | `auto` | `none` 只局部慎用 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-09-form/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>发布预览表单 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    :root {
      color-scheme: light;
      --surface: #fff;
      --page: #f3f7f3;
      --text: #20382a;
      --muted: #53695a;
      --border: #607966;
      --danger: #a12626;
      --focus: #175ca2;
    }
    html {
      scroll-behavior: smooth;
      scroll-padding-block-start: 1rem;
    }
    body {
      margin: 0;
      color: var(--text);
      background: var(--page);
      font: 1rem/1.65 system-ui, sans-serif;
    }
    main {
      width: min(100% - 2rem, 48rem);
      margin: 2rem auto;
    }
    button,
    input,
    select,
    textarea {
      color: inherit;
      font: inherit;
    }
    button {
      min-height: 2.75rem;
      padding: .55rem .85rem;
    }
    input:not([type="checkbox"]),
    select,
    textarea {
      width: 100%;
      min-height: 2.75rem;
      padding: .5rem;
      border: 2px solid var(--border);
      background: var(--surface);
    }
    textarea { min-height: 7rem; resize: vertical; }
    input[type="checkbox"] {
      width: 1.25rem;
      height: 1.25rem;
      accent-color: #326747;
    }
    input, textarea { caret-color: currentColor; }
    .panel {
      padding: 1rem;
      border: 2px solid var(--border);
      background: var(--surface);
    }
    .field {
      display: grid;
      gap: .3rem;
      margin-block: 1rem;
    }
    .check-row {
      display: flex;
      gap: .6rem;
      align-items: flex-start;
    }
    .hint { color: var(--muted); font-size: .9rem; }
    .field-error {
      color: var(--danger);
      font-weight: 650;
    }
    .field-error[hidden] { display: none; }
    form[data-submitted] :is(input, select, textarea)[aria-invalid="true"] {
      border-color: var(--danger);
      border-width: 3px;
    }
    :focus-visible {
      outline: 3px solid var(--focus);
      outline-offset: 3px;
    }
    .gallery {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(14rem, 80%);
      gap: 1rem;
      overflow-x: auto;
      overscroll-behavior-inline: contain;
      scroll-snap-type: inline proximity;
      scrollbar-width: auto;
    }
    .gallery article {
      min-height: 9rem;
      padding: 1rem;
      border: 2px solid var(--border);
      scroll-snap-align: start;
      background: var(--surface);
    }
    #result {
      margin-block-start: 2rem;
      scroll-margin-block-start: 1rem;
      overflow-wrap: anywhere;
    }
    #status { min-height: 1.7em; }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
    }
    @media (forced-colors: active) {
      .panel,
      .gallery article,
      input,
      select,
      textarea {
        border-color: CanvasText;
      }
      .field-error { color: MarkText; background: Mark; }
      :focus-visible { outline-color: Highlight; }
    }
    @media print {
      :root { color-scheme: light; }
      body { color: #000; background: #fff; }
      .screen-only, form button { display: none !important; }
      main { width: auto; margin: 0; }
      .panel, .gallery article, #result {
        border: 1px solid #000;
        break-inside: avoid;
        background: #fff;
      }
      .gallery {
        display: block;
        overflow: visible;
      }
      .gallery article { margin-block: .5rem; }
      #result { margin-block-start: 1rem; }
      p { orphans: 3; widows: 3; }
    }
    @page { margin: 18mm; }
  </style>
</head>
<body>
  <main>
    <h1>邻里集市发布预览</h1>
    <p>所有数据只用于当前页面预览，没有网络请求、账户校验或持久化。</p>
    <form class="panel" id="publish-form" novalidate>
      <div class="field">
        <label for="title">商品标题</label>
        <input id="title" name="title" required minlength="2" maxlength="80"
               aria-describedby="title-hint title-error">
        <span class="hint" id="title-hint">2–80 个字符，不能只有空白。</span>
        <span class="field-error" id="title-error" hidden></span>
      </div>

      <div class="field">
        <label for="price">价格（整数分）</label>
        <input id="price" name="priceCents" type="number" required
               min="0" max="1000000" step="1" value="3900"
               aria-describedby="price-hint price-error">
        <span class="hint" id="price-hint">3900 分显示为 39.00 元，不接入支付。</span>
        <span class="field-error" id="price-error" hidden></span>
      </div>

      <div class="field">
        <label for="category">分类</label>
        <select id="category" name="category" required
                aria-describedby="category-error">
          <option value="">请选择</option>
          <option value="home">家居</option>
          <option value="books">图书</option>
        </select>
        <span class="field-error" id="category-error" hidden></span>
      </div>

      <div class="field">
        <label for="description">说明</label>
        <textarea id="description" name="description" maxlength="500">仅支持当面查看。</textarea>
      </div>

      <div class="check-row">
        <input id="confirm" name="confirm" type="checkbox" required
               aria-describedby="confirm-error">
        <label for="confirm">我确认这只是本地教学预览。</label>
      </div>
      <span class="field-error" id="confirm-error" hidden></span>

      <button type="submit">生成预览</button>
      <button type="reset">重置</button>
      <p id="status" role="status"></p>
    </form>

    <section class="screen-only" aria-labelledby="gallery-title">
      <h2 id="gallery-title">横向说明卡</h2>
      <p>可自然滚动或使用 Tab 进入卡片链接，不把停靠作为唯一导航。</p>
      <div class="gallery">
        <article><h3>图片要求</h3><p>本课不上传真实图片。</p><a href="#result">查看预览区</a></article>
        <article><h3>交易边界</h3><p>预览不代表发布、预约或付款。</p></article>
        <article><h3>打印说明</h3><p>操作控件会隐藏，边界文字保留。</p></article>
      </div>
    </section>

    <section class="panel" id="result" tabindex="-1">
      <h2>预览结果</h2>
      <p id="preview">尚未生成。</p>
      <p>静态本地预览，未发送请求。</p>
    </section>
    <button class="screen-only" id="print" type="button">打开打印对话框</button>
  </main>
  <script>
    const form = document.querySelector("#publish-form");
    const fields = {
      title: document.querySelector("#title"),
      price: document.querySelector("#price"),
      category: document.querySelector("#category"),
      confirm: document.querySelector("#confirm")
    };

    function setError(field, message) {
      const error = document.querySelector(`#${field.id}-error`);
      field.setAttribute("aria-invalid", String(Boolean(message)));
      error.textContent = message;
      error.hidden = !message;
      field.setCustomValidity(message);
    }

    function validate() {
      const title = fields.title.value.trim();
      setError(fields.title, title.length < 2
        ? "标题至少包含 2 个非空白字符。" : "");

      const cents = fields.price.valueAsNumber;
      const validPrice = Number.isSafeInteger(cents) &&
        cents >= 0 && cents <= 1000000;
      setError(fields.price, validPrice
        ? "" : "价格必须是 0–1000000 之间的整数分。");

      setError(fields.category, fields.category.value
        ? "" : "请选择商品分类。");
      setError(fields.confirm, fields.confirm.checked
        ? "" : "请确认这是本地教学预览。");
      return form.checkValidity();
    }

    form.addEventListener("submit", event => {
      event.preventDefault();
      form.dataset.submitted = "";
      if (!validate()) {
        document.querySelector("#status").textContent =
          "请修正字段错误，未生成预览。";
        form.querySelector('[aria-invalid="true"]')?.focus();
        return;
      }
      const cents = fields.price.valueAsNumber;
      document.querySelector("#preview").textContent =
        `${fields.title.value.trim()}，${(cents / 100).toFixed(2)} 元，` +
        `分类：${fields.category.selectedOptions[0].textContent}。`;
      document.querySelector("#status").textContent =
        "本地预览已生成，没有发送请求。";
      const result = document.querySelector("#result");
      result.scrollIntoView({ block: "start" });
      result.focus({ preventScroll: true });
    });

    form.addEventListener("input", event => {
      if (!(event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLSelectElement ||
            event.target instanceof HTMLTextAreaElement)) return;
      if (event.target.id in fields) setError(event.target, "");
    });

    form.addEventListener("reset", () => {
      requestAnimationFrame(() => {
        delete form.dataset.submitted;
        Object.values(fields).forEach(field => setError(field, ""));
        document.querySelector("#status").textContent = "表单已重置。";
        document.querySelector("#preview").textContent = "尚未生成。";
      });
    });

    document.querySelector("#print").addEventListener("click", () => print());
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-09-form
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

验证：

1. 首屏没有无理由红框，提交空值后每个错误有文字并关联字段；
2. 全空格标题、3900.5 分、空分类和未确认均被拒绝；
3. 有效提交显示两位元价格，并明确“没有发送请求”；
4. 只用键盘完成、修正、提交、横向区链接和打印按钮；
5. 320px 与 200% 缩放无水平页面溢出，textarea 可纵向调整；
6. reduce 下结果定位不平滑长移；
7. 强制颜色下控件边界、勾选、错误和焦点可辨；
8. 打印预览无 fixed 遮挡、无操作按钮，结果与边界说明保留。

## 7. 邻里集市集成案例

真实发布流程继续沿用以下责任：

- HTML 提供 label、类型、required、范围和说明关联；
- CSS 提供布局、状态增强、焦点、系统模式和打印；
- 前端脚本验证空白、整数分和跨字段规则，改善即时反馈；
- 后端重新验证所有字段、身份、对象授权和业务限制；
- 服务端错误映射到对应字段或表单级文字，不只变红；
- disabled 与 readonly 根据真实职责选择；
- 图片上传、草稿保存和提交冲突不由 CSS 伪类处理；
- 打印输出不包含不该进入 DOM 的敏感信息；
- 预览与真实发布使用明确不同文案。

CSS 不能防止伪造请求，也不能证明用户有权发布。认证与授权仍由后端执行。

## 8. 常见错误与排查路径

### 明确错误案例：清除所有控件原生外观

```css
input,
select,
button {
  appearance: none;
  border: 0;
  outline: 0;
}
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | checkbox 勾选不可辨、select 没有展开线索、键盘焦点消失 |
| 证据 | 强制颜色和仅键盘路径中，控件状态无法识别 |
| 原因 | 为统一视觉删除了平台提供的状态、边界与焦点，且未重建 |
| 修复 | 恢复原生 appearance 和 outline，只做字体、尺寸、accent 与有限边框协调 |
| 复验 | 默认、键盘、disabled、强制颜色、200% 缩放均可辨并可操作 |

其他故障：

- 页面一加载全红：不要直接把所有 `:invalid` 视觉化，结合提交/交互时机；
- 红框存在但读屏无说明：写错误文字并用 `aria-describedby`/`aria-invalid`；
- 灰色按钮仍可点击：使用真实 `disabled` 或在事件逻辑中严格阻止并说明；
- sticky 标题遮住结果：设置 scroll-padding 或目标 scroll-margin；
- snap 卡住长内容：降低为 proximity 或移除，保留自然滚动；
- 打印多出空白页：检查 fixed、overflow、固定高度和 break 组合；
- 高对比下状态消失：使用系统颜色、边框和文字，不只依赖背景。

## 9. 课后题

**问题 1：为什么 placeholder 不能替代 label？**

<details>
<summary>参考答案</summary>

它在输入后消失、常有较低对比，且不同辅助技术的命名支持不能作为稳定契约。持久 label 能持续说明字段职责并扩大点击目标。

</details>

**问题 2：disabled 与 readonly 对提交有什么关键差异？**

<details>
<summary>参考答案</summary>

disabled 控件不可交互且通常不提交；readonly 控件通常仍可聚焦/选择并随表单提交。必须按业务职责选择，不能只靠样式模拟。

</details>

**问题 3：为什么打印隐藏敏感字段不是安全控制？**

<details>
<summary>参考答案</summary>

数据已经进入 DOM 和客户端，用户可通过 DevTools、脚本或其他媒体读取。授权应在服务端限制数据根本不被返回。

</details>

## 10. 实践练习

### 基础：disabled 与 readonly 对照

- **文件：**`exercise-control-states.html`。
- **操作：**创建同值的普通、readonly、disabled 字段并提交到 FormData 日志。
- **预期：**键盘、可编辑性和提交结果不同，样式与文字说明一致。
- **失败观察：**记录焦点顺序和 FormData 条目。
- **完成标准：**不使用仅视觉的伪禁用。

### 进阶：打印验收矩阵

- **文件：**`exercise-print-matrix.md`。
- **操作：**测试 A4/Letter、纵向/横向、背景开关和长说明。
- **预期：**核心卡不被操作栏遮挡，状态不依赖背景。
- **失败观察：**记录裁切、空白页、分页和用户设置。
- **完成标准：**区分浏览器预览通过与真实打印机未验证。

### 故障注入：强制颜色失效

- **文件：**`exercise-forced-colors.md`。
- **操作：**临时删除边框并用 box-shadow 表示焦点，再开启强制颜色。
- **预期：**边界或焦点可能消失；恢复 outline、系统颜色和原生控件后可辨。
- **失败观察：**保存模拟截图和 Accessibility 信息。
- **完成标准：**核心状态至少由文字和一种系统可保留边界表达。

## 11. 阶段验收

- [ ] 每个字段有持久 label；
- [ ] 说明和错误通过 ID 关联；
- [ ] 首屏验证时机友好；
- [ ] 全空格标题和非整数分被明确拒绝；
- [ ] disabled、readonly 与 aria 状态职责正确；
- [ ] 原生 checkbox/select 状态未被抹除；
- [ ] 键盘焦点在普通和强制颜色下可见；
- [ ] reduce 下没有强制长距离平滑滚动；
- [ ] scroll snap 不阻断自然滚动；
- [ ] 打印保留数据和边界、移除无意义操作；
- [ ] 页面明确没有网络发布或授权能力。

## 12. 常见问题

**可以只用 `:user-invalid` 吗？**<br>
需核对目标浏览器和产品触发时机。提交标记加明确 `aria-invalid`/错误文字更可控；可把 user-invalid 作为增强。

**能隐藏滚动条让横向卡片更干净吗？**<br>
不建议把滚动提示全部移除。覆盖滚动条平台本就可能不常显，组件还应有内容截断线索、按钮或说明，并保持键盘可达。

**打印时可以把所有链接隐藏吗？**<br>
视文档用途而定。导航按钮可隐藏，但必要来源或联系链接可能应显示 URL。不要机械删除承载内容的信息。

**强制颜色下品牌色消失算 bug 吗？**<br>
不一定。系统重映射正是用户选择。只要文字、边界、状态与焦点仍可辨，就应尊重系统；品牌保色必须局部且有充分理由。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [HTML Living Standard：Forms](https://html.spec.whatwg.org/multipage/forms.html)：控件、约束验证和提交语义。
- [MDN：CSS properties for forms](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Advanced_form_styling)：原生外观边界。
- [CSS Scroll Snap Module Level 1](https://www.w3.org/TR/css-scroll-snap-1/)：滚动停靠和对齐。
- [CSS Overflow Module Level 3](https://www.w3.org/TR/css-overflow-3/)：滚动与溢出机制。
- [CSS Paged Media Level 3](https://www.w3.org/TR/css-page-3/)：页盒与打印媒体。
- [MDN：Printing](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Printing)：打印规则与事件。
- [MDN：forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)：系统颜色重映射。

基础表单样式、打印媒体和 scroll margin 属于成熟能力；`:user-invalid`、控件 appearance 细节、滚动条样式、分页遵循度与强制颜色模拟因浏览器/系统而异。真实打印机、Windows 高对比、VoiceOver、NVDA、Safari 和 Firefox 未在本课自动验证。

## 我现在能做到什么

我能在不破坏原生能力的前提下设计表单状态、滚动与打印路径，并让强制颜色和减少动作保留等价任务结果。下一章会把本卷的稳定属性、规则和有限支持能力整理成可审计索引。

## 单元导航

- [上一课：层叠层、原生嵌套与作用域](02-layers-nesting-scope.md)
- [返回第九章目录](../README.md#第九章现代-css-组件与系统环境)
- [下一章：CSS 属性与模块参考](../10-property-reference/01-stable-properties-module-index.md)
- [返回 CSS 模块](../README.md)
