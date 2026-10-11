# 表单、对话框与列表焦点：失败后回到正确位置

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 在表单错误、Dialog 关闭和动态列表删除后选择可解释的焦点恢复路径。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `A11Y-008`、`A11Y-009` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

在表单错误、Dialog 关闭和动态列表删除后选择可解释的焦点恢复路径。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 A11Y-008（表单错误汇总与焦点）、A11Y-009（对话框和动态列表焦点恢复）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 表单错误：字段、汇总和恢复路径各有职责

失败表单至少需要三层信息：

1. 控件旁的具体错误，说明怎样修复；
2. 页面级汇总，让用户知道有多少处并可跳转；
3. 焦点策略，把用户带到一个明确恢复点。

字段结构：

```html
<label for="listing-title">商品标题</label>
<input
  id="listing-title"
  name="title"
  required
  minlength="3"
  aria-describedby="title-help title-error">
<p id="title-help">请输入 3–60 个字符。</p>
<p id="title-error"></p>
```

失败后：

```html
<input
  id="listing-title"
  aria-invalid="true"
  aria-describedby="title-help title-error">
<p id="title-error">标题至少需要 3 个字符。</p>
```

错误汇总应使用普通链接或按钮，让用户可以回到字段：

```html
<section id="error-summary" role="alert">
  <h2>请修正 2 处问题</h2>
  <ul>
    <li><a href="#listing-title">商品标题：至少需要 3 个字符</a></li>
    <li><a href="#price-yuan">价格：请输入最多两位小数的金额</a></li>
  </ul>
</section>
```

错误文字必须可见；`aria-invalid="true"` 只表达状态，不能自己告诉用户修复方法。错误修正后，要清空过期文字并移除 `aria-invalid`，不能让已合法字段继续被报告为无效。

### 4.2 错误汇总焦点与首个无效字段：选择一条主路径

常见的两种策略都可以成立：

| 策略 | 失败后的焦点 | 适合 | 风险 |
| --- | --- | --- | --- |
| 汇总优先 | 聚焦 `tabindex="-1"` 的汇总标题/容器 | 长表单、需要先了解全貌 | 用户还需激活链接到字段 |
| 字段优先 | 更新汇总后聚焦首个无效控件 | 短表单、快速修复 | 需确保汇总仍可发现和通知 |

本课综合案例使用“字段优先”：先完整更新可见汇总和字段错误，再只调用一次 `firstInvalid.focus()`。汇总使用 alert 通知失败概况，首个字段通过标签和 `aria-describedby` 提供具体修复信息。

```js
const invalidControls = collectInvalidControls();
renderErrorSummary(invalidControls);

if (invalidControls.length > 0) {
  invalidControls[0].focus();
  return;
}
```

下面的写法会产生两次连续焦点移动：

```js
// 错误案例：用户还没定位汇总，焦点立刻又跳走。
errorSummary.focus();
firstInvalid.focus();
```

不要用计时器把两次跳转隔开。应按任务选择一个主焦点。若目标读屏组合把 alert 与字段焦点重复得难以理解，可以改为“汇总优先”，去掉紧急 live 通知并测试链接恢复；不能只靠猜测叠加更多 ARIA。

### 4.3 dialog 焦点恢复：先记录调用入口，再验证它仍有效

打开 dialog 前记录触发入口：

```js
let dialogInvoker = null;

openButton.addEventListener("click", () => {
  dialogInvoker = openButton;
  dialog.showModal();
});
```

原生模态 dialog 会管理顶层与焦点范围，关闭时通常尝试恢复先前焦点。但动态页面可能在 dialog 打开期间：

- 删除触发按钮；
- 隐藏整张商品卡；
- 重新渲染列表，产生一个“看起来相同”但不是同一节点的新按钮；
- 禁用入口；
- 把祖先标为 `inert`。

因此，关闭时要验证目标：

```js
function canReceiveFocus(element) {
  return element instanceof HTMLElement
    && element.isConnected
    && !element.hidden
    && !element.closest("[hidden], [inert]")
    && !(element instanceof HTMLButtonElement && element.disabled);
}

dialog.addEventListener("close", () => {
  const target = canReceiveFocus(dialogInvoker)
    ? dialogInvoker
    : document.querySelector("#results-title");

  target?.focus();
});
```

不应保存 CSS 选择器后无条件找到“第一个删除按钮”，那可能把用户送到不相关商品。动态列表需要按操作前的位置计算局部回退。

### 4.4 动态列表删除：下一项、上一项、稳定标题

假设用户从第 2 张商品卡打开确认 dialog 并删除该卡。合理恢复顺序通常是：

1. 原位置之后仍可见商品中的同类操作；
2. 原位置之前仍可见商品中的同类操作；
3. 列表标题、添加按钮或其他稳定入口；
4. 页面主标题作为最后回退。

```js
function chooseRemovalFallback(items, removedIndex) {
  const nextItem = items[removedIndex + 1];
  const previousItem = items[removedIndex - 1];

  return nextItem?.querySelector("button")
    ?? previousItem?.querySelector("button")
    ?? document.querySelector("#results-title")
    ?? document.querySelector("h1");
}
```

顺序要在节点删除前根据当前可见集合计算。删除后再用旧索引查询，列表长度和位置已经改变，容易选错。

被动新增商品通常只需通知，不应强制聚焦新节点。只有用户明确执行“新增并编辑”之类动作，焦点移动才与下一任务一致。

重新渲染整个列表还会断开所有旧按钮，即使商品 ID 没变。若确需重建，应使用稳定业务 ID 在新 DOM 中找同一逻辑入口，并保留“找不到时回到局部标题”的路径。能就地更新时，不要为方便而无条件 `replaceChildren()` 整个可交互列表。

## 5. 元素、属性、API 或配置清单

### 5.1 场景选择速查

| 变化 | 可见内容 | 通知 | 焦点 |
| --- | --- | --- | --- |
| 查询完成 | 结果列表与数量 | polite status | 保持原位 |
| 收藏切换 | 按钮文字与 pressed 状态 | polite status | 保持按钮 |
| 阻断式提交失败 | 字段错误与汇总 | alert 或汇总焦点，二选一主策略 | 首个无效字段或汇总 |
| 打开 modal dialog | dialog 标题、说明、按钮 | 通常不另加 live 通知 | 进入 dialog |
| 关闭未改变页面的 dialog | 原页面仍存在 | 可选短状态 | 回到调用入口 |
| 删除当前列表项 | 项目消失、数量更新 | polite status | 下一项/上一项/局部标题 |
| 被动新增一项 | 新内容可浏览 | 必要时 polite status | 通常不移动 |
| 紧急会话失败 | 可见错误与恢复入口 | alert | 仅在恢复任务需要时移动 |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/05-form-dialog-list-focus-recovery/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 A11Y-008（表单错误汇总与焦点） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 A11Y-009（对话框和动态列表焦点恢复） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

### 7.1 案例范围与公开契约

综合页把本课要求放进同一条用户路径：

```text
浏览初始商品
  → 提交内存查询并获知结果数
  → 切换收藏并获知按钮状态
  → 打开删除确认 dialog
  → 删除当前卡片并恢复到相邻操作
  → 提交错误发布表单
  → 查看错误汇总并聚焦首个无效字段
  → 修正后生成当前页预览
  → 阅读媒体文字稿和图表数据表
```

范围边界：

| 能力 | 本案例实现 | 本案例不宣称 |
| --- | --- | --- |
| 查询 | 当前 DOM 中按标题筛选 | 服务器搜索、分页、排序稳定性 |
| 收藏 | 当前页面 `Set` | 登录用户收藏、刷新恢复、跨设备同步 |
| 删除 | 从当前 DOM 移除教学卡片 | 删除数据库商品、权限、审计、撤销 |
| 发布 | 本地验证并生成预览 | POST `/listings`、上传、持久化 |
| 媒体 | 结构、字幕/描述入口和页面文字稿 | 仓库已附带真实视频素材 |
| 图表 | Canvas 视觉增强 + HTML 表格 | 实时统计、分析服务 |
| 金额 | 整数分模型和元单位显示 | 任意币种舍入规则 |

刷新页面会恢复全部初始状态。真实系统中的收藏应使用项目契约的 `PUT /favorites/:listingId` 与 `DELETE /favorites/:listingId`；商品删除、发布、媒体上传和授权不属于 HTML 内存案例。

### 7.2 文件位置

在个人练习目录创建：

```text
market-learning/
└── practice/
    └── html-chapter-07/
        ├── index.html
        └── media/
            ├── lamp-check.mp4
            ├── lamp-check-described.mp4
            ├── lamp-check.zh.vtt
            └── lamp-check.descriptions.zh.vtt
```

`index.html` 是本课完整主流程。`media/` 中四个名字是一份真实资源契约，不是教程仓库已经提供的文件：

- 没有素材时，播放器可能报告资源失败，但页面文字稿、视觉说明和其他案例仍应工作；
- 要验收字幕同步和音频描述，学习者必须放入自己有权使用的短视频与合法 WebVTT；
- 不能把“文字稿可读”误写成“字幕轨道已验证”；
- 不能把空文件或伪造扩展名当作媒体成功证据。

### 7.3 完整 `index.html`

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>邻里集市动态质量页</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, sans-serif;
        line-height: 1.6;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: #1d252c;
        background: #f5f7f5;
      }

      main {
        inline-size: min(100% - 2rem, 70rem);
        margin-inline: auto;
        padding-block: 1rem 4rem;
      }

      section,
      search {
        display: block;
        margin-block: 1.5rem;
      }

      .panel {
        padding: 1rem;
        border: 0.125rem solid #66736b;
        border-radius: 0.75rem;
        background: #fff;
      }

      label,
      input,
      button {
        font: inherit;
      }

      input {
        inline-size: min(100%, 32rem);
        min-block-size: 2.75rem;
        padding: 0.5rem 0.75rem;
        border: 0.125rem solid #58636d;
        border-radius: 0.35rem;
      }

      button {
        min-inline-size: 2.75rem;
        min-block-size: 2.75rem;
        padding: 0.5rem 0.9rem;
        border: 0.125rem solid #174f38;
        border-radius: 0.35rem;
        color: #fff;
        background: #176b4c;
        cursor: pointer;
      }

      button[aria-pressed="true"] {
        color: #173b2d;
        background: #d7f2e4;
      }

      button.secondary {
        color: #26332d;
        background: #fff;
      }

      button.danger {
        border-color: #862126;
        background: #a52d32;
      }

      :is(a, button, input, summary, [tabindex="-1"]):focus-visible {
        outline: 0.2rem solid #174ea6;
        outline-offset: 0.2rem;
      }

      .search-row,
      .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        gap: 0.75rem;
      }

      .field {
        display: grid;
        gap: 0.35rem;
        margin-block: 1rem;
      }

      .help,
      .boundary {
        color: #46515a;
      }

      .error {
        min-block-size: 1.6em;
        margin: 0;
        color: #8a171b;
        font-weight: 650;
      }

      [aria-invalid="true"] {
        border-color: #a31319;
        border-style: double;
      }

      #error-summary {
        border-color: #a31319;
      }

      #error-summary h2 {
        margin-block-start: 0;
      }

      #result-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
        gap: 1rem;
        padding: 0;
        list-style: none;
      }

      .listing {
        padding: 1rem;
        border: 0.125rem solid #728078;
        border-inline-start: 0.45rem solid #176b4c;
        border-radius: 0.6rem;
        background: #fff;
        transition: transform 180ms ease;
      }

      .listing:hover {
        transform: translateY(-0.2rem);
      }

      .listing[data-status="reserved"] {
        border-inline-start-color: #8b5a00;
        border-inline-start-style: double;
      }

      .listing img,
      video,
      canvas {
        display: block;
        max-inline-size: 100%;
      }

      .listing img {
        inline-size: 100%;
        block-size: auto;
        border-radius: 0.35rem;
        background: #e5ece7;
      }

      #result-list[aria-busy="true"] {
        opacity: 0.72;
      }

      .media-layout {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
        gap: 1rem;
      }

      video {
        inline-size: 100%;
        background: #1f2723;
      }

      .chart-shell {
        overflow-x: auto;
      }

      canvas {
        inline-size: 100%;
        block-size: auto;
        border: 0.125rem solid #66736b;
        background: #fff;
      }

      .table-region {
        max-inline-size: 100%;
        overflow-x: auto;
      }

      table {
        inline-size: 100%;
        min-inline-size: 30rem;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 0.65rem;
        border: 0.0625rem solid #66736b;
        text-align: start;
      }

      th {
        background: #edf2ee;
      }

      dialog {
        max-inline-size: min(32rem, calc(100% - 2rem));
        padding: 1.25rem;
        border: 0.125rem solid #34443c;
        border-radius: 0.75rem;
      }

      dialog::backdrop {
        background: rgb(16 25 20 / 0.68);
      }

      #preview {
        border-inline-start: 0.4rem solid #176b4c;
      }

      @media (prefers-reduced-motion: reduce) {
        .listing {
          transition: none;
        }

        .listing:hover {
          transform: none;
        }
      }

      @media (forced-colors: active) {
        .listing {
          border-inline-start-width: 0.45rem;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>邻里集市动态质量页</h1>
      <p class="boundary">
        搜索、收藏、删除和预览只保存在当前页面内存。刷新后恢复初始状态。
      </p>

      <noscript>
        <p class="panel">
          JavaScript 未运行：当前仍可阅读全部商品、媒体文字稿和价格表；
          本地筛选、收藏、删除确认、错误汇总和 Canvas 增强不可用。
        </p>
      </noscript>

      <search aria-labelledby="search-title" class="panel">
        <h2 id="search-title">搜索商品</h2>
        <form id="search-form">
          <div class="search-row">
            <div class="field">
              <label for="query">标题关键词</label>
              <input
                id="query"
                name="q"
                type="search"
                autocomplete="off">
            </div>
            <button type="submit">搜索</button>
            <button id="reset-search" class="secondary" type="reset">
              显示剩余全部
            </button>
          </div>
        </form>
      </search>

      <p id="search-status" role="status" aria-atomic="true">
        当前显示 3 件商品。
      </p>
      <p id="favorite-status" role="status" aria-atomic="true"></p>

      <section aria-labelledby="results-title">
        <h2 id="results-title" tabindex="-1">商品结果</h2>
        <p id="no-results" hidden>
          没有匹配商品。请缩短关键词或显示剩余全部。
        </p>

        <ul id="result-list" aria-busy="false">
          <li
            class="listing"
            data-listing-id="desk-1"
            data-search-text="折叠学习桌 木桌">
            <img
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMzYwIj48cmVjdCB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgZmlsbD0iI2U3ZWVlOSIvPjxyZWN0IHg9IjEyNSIgeT0iMTAwIiB3aWR0aD0iMzkwIiBoZWlnaHQ9IjQ1IiByeD0iOCIgZmlsbD0iIzc4NWE0MiIvPjxwYXRoIGQ9Ik0xNzAgMTQ1djE1ME00NzAgMTQ1djE1MCIgc3Ryb2tlPSIjNGQzYTJkIiBzdHJva2Utd2lkdGg9IjI0Ii8+PHBhdGggZD0iTTQ4MiAxMDRsMjggOCIgc3Ryb2tlPSIjYjUxZjI1IiBzdHJva2Utd2lkdGg9IjciLz48L3N2Zz4="
              alt="折叠学习桌右前角有一道浅划痕"
              width="640"
              height="360">
            <h3>折叠学习桌</h3>
            <p>右前角有浅划痕，折叠结构正常。</p>
            <p><strong>价格：</strong><data value="8900">89.00 元</data></p>
            <p><strong>状态：</strong><span>在售</span></p>
            <div class="actions">
              <button
                class="favorite"
                type="button"
                data-listing-id="desk-1"
                aria-pressed="false"
                hidden>
                收藏
              </button>
              <button
                class="remove secondary"
                type="button"
                data-listing-id="desk-1"
                hidden>
                从当前结果移除
              </button>
            </div>
          </li>

          <li
            class="listing"
            data-listing-id="bag-1"
            data-search-text="帆布包 手提包">
            <img
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMzYwIj48cmVjdCB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgZmlsbD0iI2VlZTlkZiIvPjxwYXRoIGQ9Ik0yMDUgMTMwaDIzMGwyOCAxNzBIMTc3eiIgZmlsbD0iI2EyN2M0ZiIvPjxwYXRoIGQ9Ik0yNjAgMTQwYzAtNzUgMTIwLTc1IDEyMCAwIiBmaWxsPSJub25lIiBzdHJva2U9IiM2ZDUyMzUiIHN0cm9rZS13aWR0aD0iMjIiLz48L3N2Zz4="
              alt="米色帆布手提包，双提手完整"
              width="640"
              height="360">
            <h3>帆布包</h3>
            <p>包体已清洁，内袋拉链可以正常闭合。</p>
            <p><strong>价格：</strong><data value="2500">25.00 元</data></p>
            <p><strong>状态：</strong><span>在售</span></p>
            <div class="actions">
              <button
                class="favorite"
                type="button"
                data-listing-id="bag-1"
                aria-pressed="false"
                hidden>
                收藏
              </button>
              <button
                class="remove secondary"
                type="button"
                data-listing-id="bag-1"
                hidden>
                从当前结果移除
              </button>
            </div>
          </li>

          <li
            class="listing"
            data-listing-id="lamp-1"
            data-search-text="阅读台灯 灯具"
            data-status="reserved">
            <img
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMzYwIj48cmVjdCB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgZmlsbD0iI2U5ZWRmMiIvPjxwYXRoIGQ9Ik0yNTAgOTVoMTQwbDU4IDEyMEgxOTJ6IiBmaWxsPSIjNTY2YjdlIi8+PHJlY3QgeD0iMzA2IiB5PSIyMTAiIHdpZHRoPSIyOCIgaGVpZ2h0PSI4MiIgZmlsbD0iIzM4NDc1NCIvPjxyZWN0IHg9IjI0NSIgeT0iMjkyIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIyIiByeD0iMTAiIGZpbGw9IiMzODQ3NTQiLz48cGF0aCBkPSJNMjEwIDE4MGwyMiA4IiBzdHJva2U9IiNiNTFmMjUiIHN0cm9rZS13aWR0aD0iNyIvPjwvc3ZnPg=="
              alt="蓝灰色阅读台灯，灯罩左侧有一道细裂纹"
              width="640"
              height="360">
            <h3>阅读台灯</h3>
            <p>可正常点亮，灯罩左侧有细裂纹。</p>
            <p><strong>价格：</strong><data value="3900">39.00 元</data></p>
            <p><strong>状态：</strong><span>已预约</span></p>
            <div class="actions">
              <button
                class="favorite"
                type="button"
                data-listing-id="lamp-1"
                aria-pressed="false"
                hidden>
                收藏
              </button>
              <button
                class="remove secondary"
                type="button"
                data-listing-id="lamp-1"
                hidden>
                从当前结果移除
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section aria-labelledby="media-title" class="panel">
        <h2 id="media-title">阅读台灯验货媒体替代</h2>
        <div class="media-layout">
          <div>
            <video
              controls
              preload="metadata"
              aria-describedby="media-boundary">
              <source src="media/lamp-check.mp4" type="video/mp4">
              <track
                kind="captions"
                srclang="zh"
                label="中文"
                src="media/lamp-check.zh.vtt"
                default>
              <track
                kind="descriptions"
                srclang="zh"
                label="中文视觉描述"
                src="media/lamp-check.descriptions.zh.vtt">
              当前浏览器不能播放视频，请阅读旁边的文字稿。
            </video>
            <p id="media-boundary" class="boundary">
              媒体文件需要学习者提供；页面文字稿始终可读。
            </p>
            <p>
              <a href="media/lamp-check-described.mp4">
                播放带音频描述的验货版本
              </a>
            </p>
          </div>

          <div>
            <h3>验货文字稿与视觉说明</h3>
            <p>
              <strong>00:00–00:03：</strong>
              台灯位于木桌中央。灯罩左侧靠下有一道约 2 厘米细裂纹。
            </p>
            <p>
              <strong>00:03–00:06：</strong>
              [开关按下声] 灯泡点亮，没有闪烁。
            </p>
            <p>
              <strong>00:06–00:09：</strong>
              演示者转动灯臂，底座保持稳定；电线外皮完整。
            </p>
            <p>
              关键结论：台灯可以点亮和调节，灯罩有裂纹，购买前应现场确认。
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="publish-title" class="panel">
        <h2 id="publish-title">发布预览</h2>
        <p class="boundary">
          这里只生成当前页预览，不发送、保存或上传任何数据。
        </p>

        <div id="error-summary" role="alert"></div>

        <form id="publish-form" novalidate>
          <div class="field">
            <label for="listing-title">商品标题</label>
            <input
              id="listing-title"
              name="title"
              required
              minlength="3"
              maxlength="60"
              aria-describedby="title-help listing-title-error">
            <p id="title-help" class="help">请输入 3–60 个字符。</p>
            <p id="listing-title-error" class="error"></p>
          </div>

          <div class="field">
            <label for="price-yuan">价格（元）</label>
            <input
              id="price-yuan"
              name="price"
              type="text"
              inputmode="decimal"
              required
              aria-describedby="price-help price-yuan-error">
            <p id="price-help" class="help">
              使用普通十进制，最多两位小数；例如 39.00。
            </p>
            <p id="price-yuan-error" class="error"></p>
          </div>

          <button type="submit">生成预览</button>
        </form>

        <p id="form-status" role="status" aria-atomic="true"></p>
        <section id="preview" class="panel" aria-labelledby="preview-title" hidden>
          <h3 id="preview-title">当前页预览</h3>
        </section>
      </section>

      <section aria-labelledby="chart-title" class="panel">
        <h2 id="chart-title">初始商品价格比较</h2>
        <p id="chart-summary">
          折叠学习桌价格最高，为 89.00 元；帆布包最低，为 25.00 元。
          图表使用初始教学数据，不随当前页删除操作改变。
        </p>

        <div class="chart-shell">
          <canvas
            id="price-chart"
            width="640"
            height="260"
            role="img"
            aria-labelledby="chart-title"
            aria-describedby="chart-summary">
            当前浏览器不能绘制价格图，请阅读后面的价格表。
          </canvas>
        </div>

        <div
          class="table-region"
          role="region"
          aria-labelledby="price-table-title"
          tabindex="0">
          <h3 id="price-table-title">初始价格数据表</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">商品</th>
                <th scope="col">状态</th>
                <th scope="col">价格</th>
              </tr>
            </thead>
            <tbody id="price-data">
              <tr data-cents="8900">
                <th scope="row">折叠学习桌</th>
                <td>在售</td>
                <td><data value="8900">89.00 元</data></td>
              </tr>
              <tr data-cents="2500">
                <th scope="row">帆布包</th>
                <td>在售</td>
                <td><data value="2500">25.00 元</data></td>
              </tr>
              <tr data-cents="3900">
                <th scope="row">阅读台灯</th>
                <td>已预约</td>
                <td><data value="3900">39.00 元</data></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <dialog
      id="remove-dialog"
      aria-labelledby="remove-title"
      aria-describedby="remove-description">
      <form id="remove-form" method="dialog">
        <h2 id="remove-title">从当前结果移除商品</h2>
        <p id="remove-description"></p>
        <p class="boundary">
          这只修改当前页面内存和 DOM，不会删除服务器数据。
        </p>
        <div class="actions">
          <button class="secondary" value="cancel" autofocus>取消</button>
          <button class="danger" value="remove">确认移除</button>
        </div>
      </form>
    </dialog>

    <script>
      const searchForm = document.querySelector("#search-form");
      const query = document.querySelector("#query");
      const resetSearch = document.querySelector("#reset-search");
      const searchStatus = document.querySelector("#search-status");
      const favoriteStatus = document.querySelector("#favorite-status");
      const resultList = document.querySelector("#result-list");
      const resultsTitle = document.querySelector("#results-title");
      const noResults = document.querySelector("#no-results");

      const removeDialog = document.querySelector("#remove-dialog");
      const removeForm = document.querySelector("#remove-form");
      const removeDescription = document.querySelector("#remove-description");

      const publishForm = document.querySelector("#publish-form");
      const titleControl = document.querySelector("#listing-title");
      const priceControl = document.querySelector("#price-yuan");
      const errorSummary = document.querySelector("#error-summary");
      const formStatus = document.querySelector("#form-status");
      const preview = document.querySelector("#preview");

      const canvas = document.querySelector("#price-chart");
      const favoriteIds = new Set();

      let searchTimer = 0;
      let dialogInvoker = null;
      let pendingRemovalId = "";
      let pendingFocus = null;

      function currentItems() {
        return Array.from(resultList.querySelectorAll(".listing"));
      }

      function visibleItems() {
        return currentItems().filter((item) => !item.hidden);
      }

      function listingTitle(item) {
        return item.querySelector("h3").textContent.trim();
      }

      function updateEmptyState() {
        const count = visibleItems().length;
        noResults.hidden = count !== 0;
        return count;
      }

      function enableEnhancements() {
        for (const button of resultList.querySelectorAll(".favorite, .remove")) {
          button.hidden = false;
        }
      }

      enableEnhancements();

      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        window.clearTimeout(searchTimer);

        const normalizedQuery = query.value.trim().toLocaleLowerCase("zh-CN");
        resultList.setAttribute("aria-busy", "true");
        searchStatus.textContent = "正在筛选当前页面商品。";

        searchTimer = window.setTimeout(() => {
          for (const item of currentItems()) {
            const searchText = item.dataset.searchText.toLocaleLowerCase("zh-CN");
            item.hidden = normalizedQuery !== "" && !searchText.includes(normalizedQuery);
          }

          const count = updateEmptyState();
          resultList.setAttribute("aria-busy", "false");
          searchStatus.textContent = normalizedQuery === ""
            ? `当前显示剩余全部 ${count} 件商品。`
            : `查询完成，找到 ${count} 件商品。`;
        }, 350);
      });

      searchForm.addEventListener("reset", () => {
        window.clearTimeout(searchTimer);

        queueMicrotask(() => {
          for (const item of currentItems()) {
            item.hidden = false;
          }

          const count = updateEmptyState();
          resultList.setAttribute("aria-busy", "false");
          searchStatus.textContent = `已清除查询，显示剩余全部 ${count} 件商品。`;
        });
      });

      resultList.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button || !resultList.contains(button)) {
          return;
        }

        const item = button.closest(".listing");
        const id = item.dataset.listingId;
        const title = listingTitle(item);

        if (button.classList.contains("favorite")) {
          const nextPressed = button.getAttribute("aria-pressed") !== "true";
          button.setAttribute("aria-pressed", String(nextPressed));

          if (nextPressed) {
            favoriteIds.add(id);
            favoriteStatus.textContent = `已收藏“${title}”。仅当前页面有效。`;
          } else {
            favoriteIds.delete(id);
            favoriteStatus.textContent = `已取消收藏“${title}”。`;
          }

          return;
        }

        if (button.classList.contains("remove")) {
          dialogInvoker = button;
          pendingRemovalId = id;
          pendingFocus = null;
          removeDialog.returnValue = "";
          removeDescription.textContent = `确认从当前结果移除“${title}”吗？`;
          removeDialog.showModal();
        }
      });

      function canReceiveFocus(element) {
        if (!(element instanceof HTMLElement) || !element.isConnected) {
          return false;
        }

        if (element.hidden || element.closest("[hidden], [inert]")) {
          return false;
        }

        if (element.matches(":disabled")) {
          return false;
        }

        return true;
      }

      function actionIn(item) {
        if (!item || item.hidden) {
          return null;
        }

        return item.querySelector(".favorite:not([hidden]), .remove:not([hidden])");
      }

      function removePendingListing() {
        const items = visibleItems();
        const item = items.find(
          (candidate) => candidate.dataset.listingId === pendingRemovalId
        );

        if (!item) {
          favoriteStatus.textContent = "目标商品已不在当前结果中。";
          pendingFocus = resultsTitle;
          return;
        }

        const removedIndex = items.indexOf(item);
        const title = listingTitle(item);
        pendingFocus = actionIn(items[removedIndex + 1])
          ?? actionIn(items[removedIndex - 1])
          ?? resultsTitle;

        favoriteIds.delete(pendingRemovalId);
        item.remove();

        const count = updateEmptyState();
        searchStatus.textContent =
          `已从当前结果移除“${title}”，还显示 ${count} 件商品。`;
      }

      removeForm.addEventListener("submit", (event) => {
        if (event.submitter?.value !== "remove") {
          return;
        }

        event.preventDefault();
        removePendingListing();
        removeDialog.close("remove");
      });

      removeDialog.addEventListener("close", () => {
        const target = removeDialog.returnValue === "remove"
          ? pendingFocus
          : dialogInvoker;

        queueMicrotask(() => {
          if (canReceiveFocus(target)) {
            target.focus();
          } else {
            resultsTitle.focus();
          }

          dialogInvoker = null;
          pendingRemovalId = "";
          pendingFocus = null;
        });
      });

      function setFieldError(control, message) {
        const error = document.querySelector(`#${control.id}-error`);
        error.textContent = message;

        if (message) {
          control.setAttribute("aria-invalid", "true");
        } else {
          control.removeAttribute("aria-invalid");
        }
      }

      function parseYuanToCents(value) {
        const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
        if (!match) {
          return null;
        }

        const yuan = Number(match[1]);
        const fraction = (match[2] ?? "").padEnd(2, "0");
        const cents = yuan * 100 + Number(fraction);
        return Number.isSafeInteger(cents) ? cents : null;
      }

      function collectFormErrors() {
        const errors = [];
        const normalizedTitle = titleControl.value.trim();
        const priceCents = parseYuanToCents(priceControl.value);

        setFieldError(titleControl, "");
        setFieldError(priceControl, "");

        if (normalizedTitle.length < 3 || normalizedTitle.length > 60) {
          const message = "标题需要 3–60 个字符。";
          setFieldError(titleControl, message);
          errors.push({
            control: titleControl,
            label: "商品标题",
            message
          });
        }

        if (priceCents === null) {
          const message = "请输入非负普通十进制金额，最多两位小数。";
          setFieldError(priceControl, message);
          errors.push({
            control: priceControl,
            label: "价格",
            message
          });
        }

        return {
          errors,
          title: normalizedTitle,
          priceCents
        };
      }

      function renderErrorSummary(errors) {
        errorSummary.replaceChildren();

        if (errors.length === 0) {
          return;
        }

        const heading = document.createElement("h3");
        heading.textContent = `请修正 ${errors.length} 处问题`;

        const list = document.createElement("ul");

        for (const error of errors) {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = `#${error.control.id}`;
          link.textContent = `${error.label}：${error.message}`;
          link.addEventListener("click", (event) => {
            event.preventDefault();
            error.control.focus();
          });
          item.append(link);
          list.append(item);
        }

        errorSummary.append(heading, list);
      }

      function formatCents(cents) {
        const yuan = Math.floor(cents / 100);
        const fraction = String(cents % 100).padStart(2, "0");
        return `${yuan}.${fraction} 元`;
      }

      publishForm.addEventListener("submit", (event) => {
        event.preventDefault();
        formStatus.textContent = "";

        const result = collectFormErrors();
        renderErrorSummary(result.errors);

        if (result.errors.length > 0) {
          preview.hidden = true;
          result.errors[0].control.focus();
          return;
        }

        const heading = document.createElement("h3");
        heading.id = "preview-title";
        heading.textContent = result.title;

        const price = document.createElement("p");
        price.textContent = `价格：${formatCents(result.priceCents)}`;

        const boundary = document.createElement("p");
        boundary.textContent = "这是当前页面预览，尚未发布或保存。";

        preview.replaceChildren(heading, price, boundary);
        preview.hidden = false;
        errorSummary.replaceChildren();
        formStatus.textContent = "预览已生成，数据只存在当前页面。";
      });

      publishForm.addEventListener("input", (event) => {
        const control = event.target;
        if (control !== titleControl && control !== priceControl) {
          return;
        }

        setFieldError(control, "");
        errorSummary.replaceChildren();
        formStatus.textContent = "";
      });

      function chartData() {
        return Array.from(document.querySelectorAll("#price-data tr")).map((row) => ({
          title: row.querySelector("th").textContent.trim(),
          cents: Number(row.dataset.cents)
        }));
      }

      function drawChart() {
        const context = canvas.getContext("2d");
        if (!context) {
          return;
        }

        const data = chartData();
        const cssWidth = Math.max(280, Math.round(canvas.getBoundingClientRect().width));
        const cssHeight = 260;
        const dpr = Math.max(1, window.devicePixelRatio || 1);

        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, cssWidth, cssHeight);

        const left = Math.min(150, cssWidth * 0.34);
        const right = 22;
        const top = 30;
        const rowHeight = 64;
        const maxCents = Math.max(...data.map((item) => item.cents));
        const barWidth = Math.max(40, cssWidth - left - right);

        context.font = "16px system-ui, sans-serif";
        context.textBaseline = "middle";

        data.forEach((item, index) => {
          const y = top + index * rowHeight;
          const width = Math.max(2, barWidth * item.cents / maxCents);

          context.fillStyle = "#26332d";
          context.fillText(item.title, 10, y + 17);

          context.fillStyle = "#2f7f5c";
          context.fillRect(left, y, width, 34);

          context.fillStyle = "#18231e";
          context.fillText(formatCents(item.cents), left + 8, y + 17);
        });
      }

      let resizeTimer = 0;
      window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(drawChart, 120);
      });

      drawChart();
    </script>
  </body>
</html>
```

### 7.4 逐步理解增强顺序

#### 第一步：先验证无脚本基线

在 DevTools 禁用 JavaScript或临时阻止脚本：

- 三件商品及其标题、价格、状态、图片替代仍在 HTML 中；
- 收藏和移除按钮保持 `hidden`，不会留下死按钮；
- 媒体文字稿、视觉说明、图表摘要和价格表仍可阅读；
- 发布表单仍有标签、帮助文字和 HTML 约束，但本地预览不可用；
- `<noscript>` 诚实说明缺失能力。

这证明核心商品事实不依赖 Canvas 或脚本生成。

#### 第二步：脚本只公布稳定查询结果

查询提交后先把列表标为 busy，350ms 后一次性更新所有 `hidden` 状态，再公布最终数量。新的提交会清除旧计时器，避免旧查询晚于新查询覆盖页面。

这是教学防抖，不是远程请求取消。真实 fetch 查询还需要 `AbortController`、请求标识或其他竞态控制。

#### 第三步：收藏状态由三层共同表达

脚本启动后才显示收藏按钮。每次切换同时更新：

- `favoriteIds`；
- `aria-pressed`；
- 保持稳定的按钮可见文字；
- 共享 polite status。

没有一层被当作其他层的替代。

#### 第四步：删除前先计算恢复点

确认删除时，脚本先从“当前可见项目”中找到被删项的位置，再选择下一项或上一项的操作按钮。节点移除后，dialog 的 `close` 处理器在微任务中验证目标仍可聚焦；若目标也失效，则回到结果标题。

取消或 Esc 关闭时，优先返回原调用按钮。

#### 第五步：错误只在提交时集中通知

表单输入过程中不按每个字符发 live 通知。提交时：

1. 重新计算全部错误；
2. 更新字段旁错误和 `aria-invalid`；
3. 生成带链接的错误汇总；
4. 显示 alert；
5. 只把焦点移到首个无效字段一次。

用户继续输入时会清除当前字段的旧错误并隐藏可能过期的汇总；再次提交才生成新的完整错误状态。真实产品还应决定 blur 验证、服务端错误映射和草稿保留策略。

#### 第六步：表格是真相源，Canvas 是增强视图

`drawChart()` 从 HTML 表格读取标题和整数分。即使 `getContext("2d")` 返回 `null`、脚本被禁用或 Canvas 不在读屏阅读模型中，摘要和表格仍交付相同数据。

### 7.5 运行方式

最小方式：

1. 保存 `index.html`；
2. 直接用浏览器打开；
3. 先不准备媒体文件，验证除实际播放/字幕外的全部流程；
4. 有权使用的媒体准备完成后，把文件放到 `media/` 对应路径；
5. 若本地 `track` 或媒体受浏览器 `file://` 策略影响，使用已有静态服务器；
6. 打开 DevTools 的 Elements、Accessibility、Console 和 Network 面板。

不应为了本课在教程仓库创建素材、依赖或 `package.json`。

### 7.6 正常路径预期

#### 查询与收藏

- 初始状态显示 3 件；
- 搜索“台灯”后只显示阅读台灯，状态通知“找到 1 件商品”；
- 搜索完成后焦点不被强制移动；
- 收藏后按钮文字仍为“收藏”，`aria-pressed="true"`；
- 取消后按钮文字仍为“收藏”，`aria-pressed="false"`；
- 刷新后收藏状态丢失，符合内存边界。

#### 失败表单

- 空表单提交出现 2 项错误；
- 标题控件获得焦点；
- 两个无效控件均有 `aria-invalid="true"` 和可见错误；
- 汇总链接可以回到对应控件；
- 输入“阅读台灯”、价格“39.00”后重新提交，生成 39.00 元预览；
- 预览明确说明未发布或保存。

#### dialog 与动态列表

- dialog 打开后焦点进入“取消”按钮；
- Tab/Shift+Tab 不应进入模态背景；
- 取消或 Esc 后回到原“从当前结果移除”按钮；
- 确认移除中间商品后，焦点进入下一件可见商品的收藏按钮；
- 删除最后一件可见商品时，焦点进入上一件或结果标题；
- 删除到空列表后出现可见空状态，结果标题仍可聚焦。

#### 媒体与图表

- 没有媒体文件时，Network 能看到真实失败，文字稿仍可读；
- 有合法资源时，播放器能选择中文 captions；
- 带描述版本或文字视觉说明可发现；
- Canvas 显示三条价格柱；
- Canvas 关闭或脚本失败时，摘要和三行数据表仍完整；
- 价格模型为 8900、2500、3900 分，显示为元。

#### 放大、触控、颜色与运动

- 200% 文字缩放时标签和按钮不被固定高度裁切；
- 约 320 CSS px 内容宽度时商品变为单列，整页不横向滚动；
- 价格表允许局部横向滚动；
- 按钮目标约 44 CSS px 高，并有间距；
- 已预约状态有文字和双线/颜色边界，不只靠颜色；
- 减少动效时卡片悬停位移消失，功能和最终状态不变。

### 7.7 失败时的证据顺序

1. **Console**：先排除选择器、正则、Canvas 或事件语法错误；
2. **Elements**：检查 `hidden`、`aria-busy`、`aria-pressed`、`aria-invalid` 是否与可见状态一致；
3. **Accessibility**：检查角色、名称、描述和状态是否映射；
4. **`document.activeElement`**：记录失败提交、dialog 关闭、删除后的真实焦点；
5. **Network**：媒体、VTT 路径、状态、MIME 类型；
6. **媒体轨道 API**：检查 `video.textTracks`、`readyState` 和 cue；
7. **浏览器缩放/响应式模式**：检查裁切和整页滚动；
8. **操作系统减少动效设置**：不要只在 CSS 源码中看到媒体查询就判通过；
9. **真实读屏组合**：状态时机、重复、dialog 与焦点必须人工验证。

### 7.8 精确的人工读屏步骤

每个目标组合从刷新后的初始页开始，避免上一次内存状态污染。

#### 状态与查询

1. 用读屏的表单/地标导航找到搜索；
2. 输入“台灯”并提交；
3. 记录是否听到最终数量、是否包含“查询完成”上下文；
4. 记录焦点实际位置；
5. 立即搜索“包”，观察旧结果是否被后来的稳定结果取代；
6. 不要求两次通知逐字完整，但最终可见列表和状态必须一致。

#### 收藏

1. 导航到“收藏”按钮，记录名称与 pressed 状态；
2. 激活一次，确认名称仍为“收藏”，pressed 状态变为 `true`；
3. 快速切换三次；
4. 记录中间通知是否合并；
5. 验收最终 `aria-pressed`、稳定可见文字、`Set` 结果和最后状态一致。

#### 失败表单

1. 空表单提交；
2. 记录 `document.activeElement.id`；
3. 记录聚焦字段读出的标签、帮助与错误；
4. 用汇总链接移动到价格；
5. 修正后再次提交；
6. 检查成功状态不会继续报告旧错误。

#### dialog 与删除

1. 从第二张商品卡打开 dialog；
2. 记录 dialog 名称、说明和初始焦点；
3. 尝试 Tab/Shift+Tab，确认没有进入背景商品；
4. Esc 关闭，确认返回原按钮；
5. 再打开并确认删除；
6. 记录删除后焦点落到哪一件商品的什么操作；
7. 用读屏列表导航确认被删除项不再存在。

#### 媒体与 Canvas

1. 不看屏幕，阅读图片、媒体标题、文字稿和图表区域；
2. 判断是否能得出“台灯有裂纹但能点亮”的结论；
3. 判断是否能得出三件商品的精确价格和最高/最低结论；
4. 检查 Canvas 名称和摘要是否与后续表格产生不可接受的重复；
5. 若测试媒体，分别记录 captions、描述轨道/描述版本与文字稿，不合并成“媒体可访问”一项。

### 7.9 项目数据与安全边界

- `priceCents` 仍以整数分表达；输入元字符串只在边界精确转换；
- 页面不接受任意 HTML，动态标题和错误使用 `textContent`；
- 页面不读取或保存真实个人信息；
- `aria-*` 不能防止用户修改状态，也不能提供授权；
- 隐藏删除按钮不是权限检查；
- media 路径不是上传能力；
- `role="alert"` 不会自动把错误写入日志；
- Canvas 表格不是后端统计；
- 刷新恢复初始状态是教学契约，不是数据丢失缺陷。

## 8. 常见错误与排查路径

### 8.1 表单失败只有红边或 `aria-invalid`

```html
<input aria-invalid="true" style="border-color: red">
```

- **现象**：用户知道“可能有错”，却不知道错在哪里、如何修复，也无法快速定位其他错误。
- **证据**：没有字段错误文本、描述关联、汇总和焦点恢复。
- **原因**：把状态属性当成完整错误消息。
- **修复**：增加可见具体错误、`aria-describedby`、汇总链接，并选择首个字段或汇总作为主焦点。
- **复验**：不看颜色也能指出错误数量、原因、位置和修复方式。

### 8.2 同时聚焦汇总和首个字段

```js
errorSummary.focus();
firstInvalid.focus();
```

- **现象**：视觉焦点闪动；读屏开始读汇总又被字段打断。
- **证据**：断点显示同一提交处理器连续调用两次 `focus()`。
- **原因**：把两种合法模式叠加，而没有选择主路径。
- **修复**：短表单使用首字段优先，长表单可使用汇总优先；只移动一次。
- **复验**：记录一次失败后的唯一焦点 ID 和用户下一步。

### 8.3 dialog 关闭后聚焦已删除节点

```js
const invoker = event.currentTarget;
item.remove();
dialog.close();
invoker.focus();
```

- **现象**：焦点落到 `body`、文档开头或浏览器不可预测位置。
- **证据**：`invoker.isConnected === false`；`document.activeElement` 不是预期元素。
- **原因**：恢复目标与删除节点属于同一子树。
- **修复**：删除前计算下一项、上一项和稳定标题；关闭后检查连接、隐藏、禁用和 inert 状态。
- **复验**：删除第一项、中间项、最后一项和唯一一项，分别记录焦点。

### 8.4 重新渲染列表让所有旧焦点引用失效

```js
results.replaceChildren(...newCards);
oldFavoriteButton.focus();
```

- **现象**：视觉上“同一商品按钮”仍在，旧引用却已断开。
- **证据**：旧按钮 `isConnected` 为 `false`，新按钮是另一个对象。
- **原因**：整表重建破坏节点身份。
- **修复**：能就地更新就保留节点；必须重建时保存稳定商品 ID，在新 DOM 中找同一逻辑操作，并保留局部回退。
- **复验**：筛选、排序、删除后检查焦点对象和商品 ID 都符合预期。

## 9. 课后题

### 9.1 恢复路径题

当前可见列表为 A、B、C。用户从 B 的删除按钮打开 dialog。

分别说明：

1. 取消时的焦点；
2. 删除 B 后的焦点；
3. 若 C 同时被其他当前页操作隐藏，删除 B 后的焦点；
4. 若 A、B、C 都不存在，焦点落在哪里。

<details>
<summary>查看恢复路径题参考答案</summary>

1. 回到 B 的原删除按钮；
2. 优先到 C 的同类或主要操作；
3. 回到 A 的同类或主要操作；
4. 回到结果标题、添加商品按钮等局部稳定入口，最后才是页面主标题。

</details>

## 10. 实践练习

### 10.1 基础练习：失败表单恢复

**文件：**

```text
market-learning/practice/html-chapter-07/exercise-form.html
```

**任务：**

1. 建立标题、价格、描述三个字段；
2. 空提交至少得到两个具体错误；
3. 每个错误与字段关联；
4. 生成可见汇总和字段链接；
5. 选择“汇总优先”或“字段优先”，只移动一次焦点；
6. 修正后清除 `aria-invalid` 和过期错误；
7. 成功只生成当前页预览。

**运行：**直接打开，用键盘触发失败、逐项修复、再次提交。

**预期：**失败后能说明焦点位置、错误数量和修复方式；成功后没有旧错误。

**失败观察：**`document.activeElement.id`、`aria-describedby` ID 是否存在、错误节点是否仍有旧文字。

**完成标准：**关闭颜色后仍能完成修复；报告解释为何选择当前焦点策略。

### 10.2 提升练习：dialog 与动态列表

**文件：**

```text
market-learning/practice/html-chapter-07/exercise-focus-recovery.html
```

**任务：**

1. 创建 4 项可删除列表；
2. 每项从自己的按钮打开同一个 modal dialog；
3. 取消回原入口；
4. 确认删除后按“下一项 → 上一项 → 标题”恢复；
5. 分别删除第一项、中间项、最后一项和唯一项；
6. 记录每次 `activeElement`。

**运行：**完全不用鼠标，使用 Tab、Shift+Tab、Enter、Space 与 Esc。

**预期：**焦点从不落到已删除节点或无关页面开头。

**失败观察：**删除前后的 `isConnected`、列表索引、隐藏祖先、禁用状态。

**完成标准：**四种删除位置都有独立证据；不能只演示中间项成功。

## 11. 阶段验收

### 11.1 A11Y-008：表单错误汇总与焦点

- [ ] 字段错误可见且说明修复方式；
- [ ] `aria-invalid` 与当前错误一致，修复后会清理；
- [ ] `aria-describedby` 保留帮助和错误关联；
- [ ] 汇总显示数量并提供字段跳转；
- [ ] 失败提交只执行一次主焦点移动；
- [ ] 首个无效字段或汇总的选择有任务依据；
- [ ] 不只用颜色、图标或 alert 表达错误；
- [ ] 成功后不再报告旧错误；
- [ ] 客户端验证没有被描述为服务端安全边界。

### 11.2 A11Y-009：dialog 与动态列表焦点恢复

- [ ] 打开 modal dialog 后焦点进入内部；
- [ ] 有明确关闭按钮，Esc 路径已测试；
- [ ] 取消后回到仍有效的调用入口；
- [ ] 恢复前检查连接、隐藏、禁用和 inert；
- [ ] 删除前计算下一项、上一项和稳定入口；
- [ ] 删除第一、中间、最后和唯一项均有记录；
- [ ] 重新渲染时使用稳定业务 ID 或保留原节点；
- [ ] 被动内容更新不会无故抢焦点；
- [ ] 删除后 `document.activeElement` 不是 `body` 或断开节点。

## 12. 常见问题

### Q6：错误汇总必须用 `role="alert"` 吗？

不是。可以用 alert 通知并聚焦首字段，也可以聚焦 `tabindex="-1"` 的汇总而不叠加紧急通知。选择取决于表单长度和测试结果；不要同时制造重复通道。

### Q7：为什么不在每次 input 时运行 `reportValidity()`？

它可能反复显示浏览器提示并移动或干扰焦点。实时输入阶段可以安静更新状态，提交失败时再集中报告和恢复。具体策略应避免用户尚未完成输入就持续被判错。

### Q8：dialog 原生不是会自动恢复焦点吗？

正常情况下浏览器会处理大量焦点行为，但动态页面可能删除、隐藏或替换调用入口。必须测试入口失效路径，并提供与任务相关的回退。

### Q9：删除后总是聚焦列表标题可以吗？

它是安全回退，但不总是最佳。列表仍有相邻项目时，聚焦相邻同类操作通常更接近用户任务；标题适合列表为空或没有可靠相邻目标时。

### Q20：ARIA 能防止未授权用户删除商品吗？

不能。ARIA 只影响可访问语义。用户可以修改 DOM；授权必须由服务端根据会话、所有者和业务规则检查。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：在表单错误、Dialog 关闭和动态列表删除后选择可解释的焦点恢复路径。
- `A11Y-008`：表单错误汇总与焦点
- `A11Y-009`：对话框和动态列表焦点恢复
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：动态通知与忙碌状态：公布变化而不打断任务](04-live-regions-status-busy.md) · [下一课：图片、媒体与图表替代：保留等价任务信息](06-images-media-chart-alternatives.md) · [返回 HTML 模块](../README.md)
