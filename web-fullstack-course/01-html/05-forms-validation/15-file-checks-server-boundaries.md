# 文件检查与服务端信任边界

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 分层处理文件提示、前端预检查和服务端最终检查，并区分验证、认证、授权与 CSRF。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `FRM-027`、`FRM-032` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

分层处理文件提示、前端预检查和服务端最终检查，并区分验证、认证、授权与 CSRF。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 FRM-027（accept、multiple 与文件检查）、FRM-032（浏览器校验、业务校验、服务端校验边界）；
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
HTML 原生约束
  → ValidityState 指出失败类别
  → 页面业务规则补足跨字段和文件规则
  → validationMessage 同时供浏览器提示与可见错误使用
  → 错误汇总和首个无效字段帮助用户恢复
  → 合法数据只生成本地预览
  → 服务端重新验证身份、权限、CSRF、业务规则、文件和并发状态
```

## 4. 核心理论

### 4.1 文件检查分成提示、预检查和最终检查

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

### 4.2 验证、认证、授权、CSRF、业务规则与并发边界

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

### 4.3 渐进增强：原生基线先成立

一个合理演进顺序是：

1. 先写语义正确的标签、帮助文字和 HTML 约束；
2. 在没有自定义脚本时，让浏览器完成基本检查；
3. 加入脚本后，用 `validationMessage` 建立可见字段错误和汇总；
4. 再加入真正需要的业务规则和文件预检查；
5. 最终连接服务器，并把服务器错误映射回字段或表单级区域。

本课完整案例为了统一演示业务规则、错误汇总和首个字段恢复，在 `form` 上使用 `novalidate`，然后在 `submit` 处理中显式调用 `checkValidity()` 和首个控件的 `reportValidity()`。这不会关闭 `validity`、`validationMessage` 或验证 API；它只关闭浏览器在提交前自动中断流程的那一步。

生产页面如果不需要统一编排，可以不写 `novalidate`，保留原生交互验证作为无脚本基线。无论哪种方案，服务端验证都不可省略。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `FRM-027`：accept、multiple 与文件检查
- `FRM-032`：浏览器校验、业务校验、服务端校验边界

## 6. 最小可运行案例

在个人练习目录中新建 `practice/15-file-checks-server-boundaries/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 FRM-027（accept、multiple 与文件检查） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 FRM-032（浏览器校验、业务校验、服务端校验边界） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

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

### 8.1 明确错误：把 `accept` 当成安全验证

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

### 8.2 文件名、MIME 与内容不一致

- **现象**：文件名为 `photo.png`，`File.type` 是 `image/jpeg`。
- **页面证据**：扩展名和声明类型映射不一致。
- **本地处理**：阻止预览并给出可见错误。
- **服务端处理**：不信任二者，检查魔数、可靠解码和政策。
- **边界**：文件内容可能是多格式、多段载荷或利用解析器漏洞，扩展名检查不能证明安全。

### 8.3 文件过大但 `validity.valid` 仍为 `true`

HTML 没有通用的 file `maxsize` 属性。超大文件不会自动产生 `rangeOverflow`。需要页面读取 `File.size` 并设置自定义错误，服务端再限制实际请求体和文件大小。

错误写法：

```html
<!-- 错误案例：max 不限制文件字节 -->
<input type="file" max="2097152">
```

`max` 对 file 类型不承担这个含义。

### 8.4 `multiple` 没有限制文件数量

- **现象**：写了 `multiple` 后用户选择 20 张图片。
- **原因**：`multiple` 是是否允许多选，不是数量上限。
- **修复**：页面检查 `files.length`，服务端重复检查。
- **复验**：4 张时本地错误，3 张且各自合规则可以预览；服务器契约仍限制为 3 张。

### 8.5 价格使用小数元

错误模型：

```js
const price = 39.1 + 0.2;
```

本项目使用整数分：

```js
const priceCents = 3930;
```

页面检查 `Number.isSafeInteger()`；服务端仍需使用整数或适合货币的精确类型，并验证范围。不要依赖 `step="0.01"` 解决所有金额精度和业务问题。

### 8.6 把本地时间直接加 `Z`

错误代码：

```js
const utc = localDateTimeInput.value + "Z";
```

这只是声称本地墙上时间已经是 UTC，可能改变真实时刻。应先明确业务时区，再用日期时间库或服务器规则转换。本课不接收预约时间，只用 `new Date().toISOString()` 记录预览发生时刻，因此结果明确为 UTC。

### 8.7 客户端通过后直接显示“发布成功”

- **现象**：`form.checkValidity()` 为 `true` 后显示“商品已发布”。
- **原因**：混淆客户端格式通过与服务端事务成功。
- **修复**：本课只显示“本地预览已生成”；真实系统等待服务端成功响应和资源 ID。
- **复验**：Network 无请求，刷新后状态消失，预览对象含 `persisted: false`。

### 8.8 忽略认证、授权和 CSRF

`required` 无法证明用户是谁，隐藏 `role=admin` 也不能授予权限。真实发布接口必须：

- 验证身份会话或令牌；
- 检查当前身份是否可发布；
- 对 cookie 身份的状态改变请求实施 CSRF 防护；
- 忽略或拒绝客户端试图指定的所有者、角色等受保护字段；
- 在服务端审计操作。

### 8.9 忽略业务状态和并发

用户打开表单时分类可用，不代表提交时仍可用；商品码检查时唯一，不代表写入时仍唯一。服务端需要事务、唯一约束、版本比较或幂等键。页面应能显示 `409 Conflict` 一类冲突并让用户重新加载或合并，不能用一次异步“可用性检查”承诺最终成功。

## 9. 课后题

### 9.1 生命周期诊断题

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

### 9.2 边界题

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

### 10.1 故障注入：过期错误、文件绕过与并发错觉

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

### Q2：为什么不用一个正则完成全部验证？

正则适合有限的字符模式，不适合身份、权限、文件内容、数据库唯一性、跨字段业务状态和并发。即使是邮箱，浏览器类型语法与服务器可投递性也是不同问题。

### Q7：为什么错误汇总用了链接？

汇总让用户了解错误数量和分布，链接提供从概览回到字段的键盘路径。它不能替代字段旁错误。

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

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：分层处理文件提示、前端预检查和服务端最终检查，并区分验证、认证、授权与 CSRF。
- `FRM-027`：accept、multiple 与文件检查
- `FRM-032`：浏览器校验、业务校验、服务端校验边界
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：ValidityState、自定义错误与 invalid](14-validity-custom-errors-invalid.md) · [下一章](../06-interactive-dom/01-details-summary-toggle.md) · [返回 HTML 模块](../README.md)
