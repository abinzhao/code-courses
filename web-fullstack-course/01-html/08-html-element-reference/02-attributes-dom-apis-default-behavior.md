# 属性、DOM API 与默认行为：连接标记和运行状态

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 区分内容属性、IDL 属性和运行状态，并把默认行为与项目兼容基线一并核对。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `HIS-002`、`HIS-003` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

区分内容属性、IDL 属性和运行状态，并把默认行为与项目兼容基线一并核对。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 HIS-002（全局属性与元素专属属性）、HIS-003（DOM 接口和关键默认行为）；
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
内容或操作职责：
候选原生元素：
允许的父元素：
允许的子内容：
关键属性与机器值：
默认行为：
DOM 接口或方法：
目标浏览器/辅助技术：
回退或渐进增强：
主教程：
```

## 4. 核心理论

### 4.1 内容属性、IDL 属性与状态不是同一层

```html
<input id="title" value="初始标题">
```

```js
const input = document.querySelector("#title");

input.getAttribute("value"); // 初始内容属性："初始标题"
input.defaultValue;          // 默认值："初始标题"
input.value;                 // 当前值：用户编辑后可不同
```

类似地：

- `checked` 与 `defaultChecked` 分别表示当前和默认勾选状态；
- 布尔内容属性按“是否存在”判断，`disabled="false"` 仍是禁用；
- `a.href`、`img.src` 常返回解析后的绝对 URL，而 `getAttribute()` 返回源码属性值；
- `dataset.priceCents` 始终是字符串，需要显式解析与校验；
- ARIA 字符串状态不会自动获得对应原生行为。

### 4.2 默认行为是元素契约的一部分

| 元素或状态 | 典型默认行为 | 不能据此推出 |
| --- | --- | --- |
| `a[href]` | 可聚焦并导航 | 目标安全、可下载或一定新开窗口 |
| `button` | 可由键盘激活；表单内缺省类型可能提交 | 已实现业务权限或异步成功 |
| `input`、`select`、`textarea` | 参与值状态、验证和表单条目构造 | 客户端值可信 |
| `details`/`summary` | 披露开关与 `toggle` | 是模态对话框 |
| `dialog.showModal()` | 顶层模态、背景 inert、焦点流程 | 内容和焦点策略无需测试 |
| `audio`、`video` | 媒体资源选择与播放状态 | 自动播放或某编码必定可用 |
| `table` | 二维表格模型与专用 DOM 集合 | 表头关系自动适合所有复杂表 |
| `img` | 替换内容、资源选择与解码 | `complete === true` 代表成功 |

阻止默认行为、修改 CSS 或添加 `role`，都可能改变体验，但不会自动补回原生元素原本成套提供的键盘、状态、提交和无障碍契约。

### 4.3 “现行规范”与“项目基线”必须分开

本课使用五种状态：

| 状态 | 含义 | 项目动作 |
| --- | --- | --- |
| 现行且成熟 | Living Standard 中现行，目标环境通常稳定 | 仍做关键路径实测 |
| 现行但有限支持 | 已进入现行规范，部分主流环境尚未实现 | 保留传统基线，按子特性检测 |
| 实验扩展 | 草案、试验或实现前缀能力 | 不作为核心任务前置条件 |
| 不在当前作者主线 | 浏览器可能仍能解析，但不属于当前作者合同 | 按内容职责选择现行方案 |
| 非标准 | 未成为当前规范契约 | 不放入现行索引 |

`selectedcontent` 是本快照最重要的例子：它已进入 2026-10-09 的 HTML Living Standard 现行元素索引，但 MDN 兼容资料仍标为 Limited availability。它应出现在“现行索引”，却不应替换所有项目的普通 `select > option` 基线。

### 4.4 选择元素的快速案例

| 需求 | 首选 | 关键理由 | 常见错误候选 |
| --- | --- | --- | --- |
| 跳到商品详情 URL | `a[href]` | 导航有真实地址和原生链接行为 | `button`、可点击 `div` |
| 收藏当前商品 | `button type="button"` | 原地执行命令，不是导航 | `a href="#"` |
| 一条可独立转载的商品 | `article` | 内容边界独立完整 | 只因有边框就用 `section` |
| 有标题的“交接规则”主题 | `section` + 标题 | 主题分节有显式名称 | 只为背景色使用 `section` |
| 商品属性名和值 | `dl`/`dt`/`dd` | 名称—说明关系 | 单件商品两列也强行建复杂表 |
| 多商品按列比较 | `table` | 存在二维坐标与表头关系 | `dl`、CSS Grid 假表格 |
| 原价不再准确 | `s` | 当前内容已不准确，不声明编辑记录 | 为删除记录使用 `s` |
| 文档修订中删除的句子 | `del` | 表达删除记录，可带时间和来源 | `s` |
| 已知范围中的库存质量 | `meter` | 测量值有上下界和阈值 | `progress` |
| 任务上传进度 | `progress` | 表达任务完成程度 | `meter` |
| 可展开规则 | `details`/`summary` | 原生披露契约 | 用复选框和 CSS 模拟 |
| 需要阻塞背景的确认 | `dialog.showModal()` | 模态顶层与关闭流程 | popover、绝对定位 `div` |

## 5. 元素、属性、API 或配置清单

### 5.1 全局属性索引

全局属性“语法上可用于所有 HTML 元素”不表示“放在哪里都有实际效果”。例如 `autofocus`、媒体事件处理器或 `draggable` 只有在相关状态和环境中才有意义。

| 职责 | 属性 | 关键边界与 DOM 映射 |
| --- | --- | --- |
| 身份与选择 | `id`、`class` | `id` 在树中唯一且非空；映射 `element.id`、`className`/`classList`，用于片段、查询、CSS 和关系引用 |
| 语言与方向 | `lang`、`dir` | 映射 `HTMLElement.lang/dir`；语言影响发音与断行，方向影响双向算法，两者不是同一概念 |
| 翻译与提示 | `translate`、`title` | `translate` 是翻译提示；`title` 是补充咨询信息，不能作为关键可见标签、触屏说明或唯一可访问名称 |
| 可见性与惰性 | `hidden`、`inert` | `hidden` 通常移出渲染/无障碍树；`inert` 阻止聚焦和交互，但都不是权限控制 |
| 焦点与快捷键 | `tabindex`、`autofocus`、`accesskey` | 优先自然焦点顺序；避免正值 `tabindex`；快捷键冲突和自动聚焦需按设备/辅助技术验证 |
| 编辑与输入提示 | `contenteditable`、`spellcheck`、`autocapitalize`、`autocorrect`、`inputmode`、`enterkeyhint`、`writingsuggestions` | 多为编辑/软键盘/写作建议提示，不执行约束验证；新近属性和平台 UI 差异需要特性与行为实测 |
| 拖放 | `draggable` | 映射拖放状态；声明可拖不等于完成键盘替代、移动端手势或数据安全 |
| 样式 | `style` | 内联声明进入 CSS 级联；不应承载内容语义 |
| 页面私有数据 | `data-*` | 通过 `dataset` 暴露为 `DOMStringMap`；值始终是字符串，不是可信数据库 |
| 弹出层 | `popover` | 让元素成为 popover；模式与方法见原生交互表，不产生模态行为 |
| 自定义/Shadow DOM | `is`、`slot` | `is` 关联 customized built-in；`slot` 把 Light DOM 节点分配给同名 Shadow slot |
| 安全 | `nonce` | 与响应中的 CSP nonce 契约配合；把值写进页面不等于已经部署 CSP，也不应泄露或复用 |
| Microdata | `itemscope`、`itemtype`、`itemprop`、`itemid`、`itemref` | 共同表达结构化数据；必须与可见内容一致，不能伪造商品、价格或评价 |
| 标题层级偏移 | `headingoffset`、`headingreset` | 2026 Living Standard 的现行全局属性；属于新近标题能力，不能在未验证目标浏览器/辅助技术时替代清楚的 `h1`–`h6` 层级 |
| 全局事件处理器 | `onclick`、`oninput` 等 `on*` 内容属性 | 规范允许，但课程工程代码优先 `addEventListener()`，以便组合、清理和 CSP 管理 |
| 其他标准扩展 | `part`、`exportparts`、`virtualkeyboardpolicy` 等 | 可由 CSS Shadow Parts、VirtualKeyboard 等其他规范定义为通用属性；应查拥有该能力的规范和兼容数据，不从 HTML 名称猜行为 |

### 5.2 ARIA 边界

`role` 与 `aria-*` 是辅助技术注解，不是“让任意元素变成原生控件”的脚本库。

| 目标 | 推荐 | 边界 |
| --- | --- | --- |
| 使用已有语义 | `<button>`、`<nav>`、`<main>`、标题、表单控件 | 不重复写等价显式角色 |
| 给重复地标命名 | `aria-label` 或 `aria-labelledby` | 优先引用可见标题；名称必须可区分且保持同步 |
| 提供描述 | `aria-describedby` 指向可见说明 | 不把关键错误只藏在属性中 |
| 表达动态状态 | 仅在原生状态不足时使用 `aria-expanded`、`aria-pressed`、`aria-busy` 等 | 必须与真实交互状态同步；字符串 `"false"` 仍表示明确的 false 状态，不是移除属性 |
| 通知动态结果 | `role="status"`、`role="alert"` 或适当 `aria-live` | 不重复播报，不用 live region 代替焦点和可见错误 |
| 隐藏辅助技术内容 | `aria-hidden="true"` | 不应用在可聚焦元素或其含焦点祖先；它不等于视觉隐藏 |
| 自造复合组件 | 只有原生 HTML 无法满足且团队能实现完整 ARIA 模式时 | 角色、属性、键盘、焦点、选择和名称必须成套实现并实测 |

优先级可以记成：

```text
原生元素与原生状态
  > 用可见文字提供名称/说明
  > 必要的 ARIA 补充
  > 最后才是完整自造组件
```

详细检查见[第七章：无障碍、SEO 与质量](../07-accessibility-seo/01-semantic-roles-landmarks-headings.md)。ARIA 不修复错误父子关系，不改变 DOM 阅读顺序，不让 `div` 自动响应 Space/Enter，也不提供认证、授权或业务状态。

### 5.3 DOM 接口与属性操作速查

| 层级 | 常用入口 | 责任与边界 | 主教程 |
| --- | --- | --- | --- |
| `Document` | `getElementById()`、`querySelector()`、`querySelectorAll()` | 从文档入口查询；不存在返回 `null` 或空集合，无效选择器可抛异常 | [DOM 查询与修改](../06-interactive-dom/04-dom-query-collections-navigation.md) |
| `Node` | `parentNode`、`childNodes`、`cloneNode()`、`textContent` | 包含文本、注释等所有节点；克隆不复制 `addEventListener()` 关系 | [DOM 查询与修改](../06-interactive-dom/04-dom-query-collections-navigation.md) |
| `Element` | `children`、`closest()`、`matches()`、`get/set/toggleAttribute()` | 操作元素关系和内容属性；属性字符串不等于专用当前状态 | [DOM 查询与修改](../06-interactive-dom/04-dom-query-collections-navigation.md) |
| `HTMLElement` | `hidden`、`inert`、`dataset`、`focus()`、`click()`、popover 方法 | 提供 HTML 通用状态；合成 `click()` 不等于可信用户授权 | [DOM 查询与修改](../06-interactive-dom/04-dom-query-collections-navigation.md) |
| 专用接口 | `HTMLInputElement`、`HTMLMediaElement`、`HTMLTableElement`、`HTMLDialogElement` 等 | 暴露具体值模型、默认行为和方法；优先用专用 API 而非字符串猜状态 | 对应元素组主教程 |
| 事件 | `addEventListener()`、`removeEventListener()`、`AbortSignal` | 默认行为与传播是两条轴；`target` 与 `currentTarget` 职责不同 | [事件与委托](../06-interactive-dom/07-event-listener-lifecycle-propagation.md) |

## 6. 最小可运行案例

### 6.1 文件、打开方式与观察目标

在个人练习目录创建：

```text
practice/html-08/current-index/minimal-listing.html
```

保存下面完整文件后用现代浏览器直接打开，无需依赖或服务器。目标不是一次展示所有元素，而是观察“职责 → 结构 → 属性 → 接口 → 默认行为”的检索链。

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>竹编菜篮 · 现行元素观察</title>
</head>
<body>
  <header>
    <p>邻里集市教学页</p>
  </header>

  <main>
    <article id="listing" data-listing-id="basket-001">
      <h1>竹编菜篮</h1>

      <figure>
        <svg
          viewBox="0 0 160 100"
          width="320"
          role="img"
          aria-labelledby="basket-title basket-desc"
        >
          <title id="basket-title">竹编菜篮示意图</title>
          <desc id="basket-desc">一个带弧形提手的棕色篮子</desc>
          <path d="M35 45 Q80 5 125 45" fill="none" stroke="saddlebrown" stroke-width="8"></path>
          <rect x="25" y="42" width="110" height="45" rx="8" fill="peru"></rect>
        </svg>
        <figcaption>示意图不代表实际成色。</figcaption>
      </figure>

      <dl>
        <dt>价格</dt>
        <dd><data id="price" value="3900">39 元</data></dd>
        <dt>可取时间</dt>
        <dd><time datetime="2026-10-10T08:00:00Z">2026-10-10 16:00</time></dd>
      </dl>

      <details>
        <summary>查看交接规则</summary>
        <p><strong>当面验货</strong>，页面不处理支付。</p>
      </details>

      <form id="preview-form">
        <label for="note">给卖家的留言</label>
        <textarea id="note" name="note" rows="3" required></textarea>
        <button type="submit">生成本地预览</button>
      </form>

      <section aria-labelledby="preview-title">
        <h2 id="preview-title">本地预览</h2>
        <output id="preview" for="note">尚未生成；未发送、未保存。</output>
      </section>
    </article>
  </main>

  <template id="preview-template">
    <span><strong class="preview-label">留言：</strong><span class="preview-value"></span></span>
  </template>

  <script>
    const article = document.querySelector("#listing");
    const price = document.querySelector("#price");
    const form = document.querySelector("#preview-form");
    const note = document.querySelector("#note");
    const output = document.querySelector("#preview");
    const template = document.querySelector("#preview-template");

    console.table({
      articleInterface: article.constructor.name,
      listingId: article.dataset.listingId,
      priceInterface: price.constructor.name,
      priceCents: Number.parseInt(price.value, 10),
      formInterface: form.constructor.name,
      outputInterface: output.constructor.name
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!form.reportValidity()) {
        return;
      }

      const fragment = template.content.cloneNode(true);
      fragment.querySelector(".preview-value").textContent = note.value;
      output.replaceChildren(fragment);
    });
  </script>
</body>
</html>
```

### 6.2 预期结果

1. 页面按 DOM 顺序显示标题、图形、属性、规则、表单和预览。
2. `summary` 可用键盘展开和收起。
3. 空留言提交时触发原生必填恢复路径。
4. 填写留言后只生成本页预览，Network 不出现发布请求。
5. Console 中接口分别包含 `HTMLElement`、`HTMLDataElement`、`HTMLFormElement`、`HTMLOutputElement`，`priceCents` 为整数 `3900`。
6. `time[datetime]` 保存 UTC ISO 时间；可见文字可按受众时区表达。
7. SVG 有整体图像角色、名称和描述，图注可见。

### 6.3 失败证据

| 现象 | 先检查 | 失败证据 |
| --- | --- | --- |
| 页面没有商品结构 | 文件路径、保存状态、Console | 地址栏不是目标文件，或出现脚本语法错误 |
| 价格得到 `NaN` | `data[value]` 与解析进制 | `price.getAttribute("value")` 不是十进制整数分 |
| 空留言也生成预览 | `required`、`reportValidity()`、提前 `return` | `note.validity.valueMissing === true` 但仍调用 `replaceChildren()` |
| 用户输入变成新按钮或图片 | 是否把数据交给 `innerHTML` | Elements 出现输入字符串生成的节点 |
| 提交后页面跳转 | `preventDefault()` 是否在 `submit` 路径执行 | 地址变化或 Network 出现文档导航 |
| `summary` 无法激活 | 是否破坏原生结构或覆盖交互 | Elements 中 `summary` 不再是 `details` 的首个标题 |

### 6.4 渐进扩展

在保留普通 `select > option` 基线的前提下，单独建立 `customizable-select.html` 研究 `selectedcontent`。先记录：

```js
const hasSelectedContentInterface =
  typeof HTMLSelectedContentElement !== "undefined";

console.log({ hasSelectedContentInterface });
```

只有接口存在也不足以证明完整可定制 `select`、CSS `appearance: base-select`、富 `option` 内容和辅助技术映射全部可用。扩展验收必须比较：

- 不支持环境是否仍能完成选择；
- 键盘、触控和屏幕阅读器是否可用；
- 动态修改已选 `option` 后关闭状态是否同步；
- 未加载增强 CSS/脚本时是否仍有普通选项文字。

这就是“现行元素”与“项目兼容基线”分开的实际做法。

## 7. 邻里集市集成案例

### 7.1 从需求选择元素

| 项目需求 | 选择 | 不选择 | 判断依据 |
| --- | --- | --- | --- |
| 每件商品有独立标题、图片、属性和联系入口 | `article` | 只用 `div.card` | 商品可以独立理解和链接 |
| 搜索会改变 URL 查询条件 | `search` + GET `form` | 点击 `div` 后只改内存 | 搜索是可导航、可分享的读取条件 |
| 商品详情链接 | `a[href]` | `button` | 操作结果是导航到 URL |
| 收藏 | `button type="button"` | `a href="#"` | 操作发生在当前页面，不是导航 |
| 成色、地点、价格 | `dl` | `table` | 单件商品是名称—值关系，不是多对象二维比较 |
| 多件商品横向比较 | `table` | 多个并排 `dl` 冒充列 | 行列和表头参与理解 |
| 原价格已失效 | `s` | `del` | 只说明当前不准确，不声明文档修订 |
| 卖家把“周五可取”改为“周六可取”且要保留编辑记录 | `del` + `ins` | `s` | 需要表示修订关系和时间 |
| 非模态价格解释 | `popover` 或始终可见说明 | `dialog.showModal()` | 不应阻塞页面其余操作 |
| 删除收藏确认 | `dialog.showModal()` | popover | 需要明确确认和焦点恢复 |

### 7.2 集成结构

练习文件：

```text
practice/neighbor-market/listings/index.html
```

核心结构：

```html
<header>
  <a href="/">邻里集市</a>
  <nav aria-label="主导航">
    <a href="/listings/">商品</a>
    <a href="/safety/">安全说明</a>
  </nav>
</header>

<main>
  <h1>附近商品</h1>

  <search>
    <form action="/listings/" method="get">
      <label for="market-query">搜索商品</label>
      <input id="market-query" name="q" type="search">
      <button type="submit">搜索</button>
    </form>
  </search>

  <section aria-labelledby="results-title">
    <h2 id="results-title">搜索结果</h2>

    <article>
      <h3><a href="/listings/basket-001">竹编菜篮</a></h3>
      <img
        src="/images/basket-640.jpg"
        srcset="/images/basket-320.jpg 320w, /images/basket-640.jpg 640w"
        sizes="(max-width: 40rem) 100vw, 20rem"
        alt="棕色竹编菜篮正面"
        width="640"
        height="480"
      >

      <dl>
        <dt>成色</dt>
        <dd>九成新</dd>
        <dt>价格</dt>
        <dd><s>59 元</s> <data value="3900">39 元</data></dd>
        <dt>更新时间</dt>
        <dd><time datetime="2026-10-10T08:00:00Z">今天 16:00</time></dd>
      </dl>

      <button type="button" aria-pressed="false">收藏</button>
    </article>
  </section>
</main>

<footer>
  <p>教学页面：不处理支付，不代表商品仍可用。</p>
</footer>
```

### 7.3 集成验证

- 无 CSS 时，站点、搜索、结果、商品标题、属性和安全说明仍按合理顺序阅读；
- Tab 顺序依次到真实链接、搜索输入、提交按钮、商品链接和收藏按钮；
- Enter 激活链接时导航，Space/Enter 激活收藏按钮时只改变内存状态；
- 收藏按钮更新 `aria-pressed`、可见文字和状态消息，三者来源于同一状态；
- 搜索 GET 只表达读取条件；示例没有真实服务器时不得宣称返回了搜索结果；
- 价格机器值为整数分 `3900`，不是浮点元；
- UTC 时间来自可信数据契约；客户端显示格式不回写成伪造服务器时间；
- 页面刷新后收藏消失是预期教学边界，不写成“已保存”；
- 图片失败时仍可从标题、属性和链接理解商品；
- 真实发布仍需服务端验证、认证、授权、内容审核、持久化和并发控制。

## 8. 常见错误与排查路径

### 8.1 明确错误：查到元素名，却不查父子边界

**错误示例：**

```html
<ul>
  <span>商品</span>
  <li>竹篮</li>
</ul>

<p>
  商品说明
  <section>交接规则</section>
</p>
```

`span` 不能作为这里的普通列表项目；`section` 会触发 `p` 的解析结束。排查时同时看源码和 Elements，不能只看视觉结果。

### 8.2 明确错误：把全局属性理解为处处有用

```html
<div required max="10">库存</div>
```

`required` 和 `max` 不是这个 `div` 的有效专属契约；浏览器不会因此验证库存。先查属性适用元素，再查对应 IDL 属性与算法。

### 8.3 明确错误：用内容属性读取当前状态

```js
input.addEventListener("input", () => {
  console.log(input.getAttribute("value"));
});
```

用户编辑的是当前 `value` 状态。除非脚本同步修改内容属性，`getAttribute("value")` 仍可能是初始源码值。恢复时同时打印：

```js
console.table({
  contentAttribute: input.getAttribute("value"),
  defaultValue: input.defaultValue,
  currentValue: input.value
});
```

### 8.4 明确错误：用 ARIA 覆盖原生冲突

```html
<button role="link" aria-disabled="true">查看商品</button>
```

它仍是原生按钮并可能可激活，显式 link 角色又与操作模型冲突。导航用 `a[href]`，命令用 `button`；禁用状态应与真实行为、焦点和业务规则一致。

### 8.5 明确错误：把规范现行当成全平台支持

```html
<select>
  <button>
    <selectedcontent></selectedcontent>
  </button>
  <option>二手</option>
</select>
```

这是现行结构的一部分，但不能从“规范允许”推出目标 Safari、Firefox、WebView、读屏和组织内嵌浏览器全部支持。保留普通选项文字，检查兼容数据，并在目标环境验证选择、焦点、朗读和动态更新。

### 8.6 明确错误：把浏览器容错当作验收

“页面能显示”只能证明浏览器产生了某个恢复结果。它不能证明：

- 源码父子关系符合内容模型；
- 默认行为符合业务意图；
- 辅助技术得到正确名称和状态；
- 属性受到该元素支持；
- 资源请求、解码或提交成功；
- 代码在其他浏览器得到相同结果。

### 8.7 固定排查路径

```text
1. 重述内容或操作职责
2. 查看页面源代码
3. 查看解析后的 Elements 父子关系
4. 核对元素允许上下文与内容模型
5. 核对属性是否适用于该元素/类型
6. 对照内容属性、IDL 属性和当前状态
7. 检查默认行为、事件与 Network
8. 检查角色、名称、状态、焦点与键盘
9. 查询兼容数据并在目标环境复验
10. 回到主教程补完整机制
```

## 9. 课后题

### 9.1 查找题

1. 哪个元素组适合“成色：九成新；地点：南门”？
2. 哪个元素适合跳到 `/listings/42`？哪个适合在当前页收藏？
3. 图片使用 AVIF，失败时回退 JPEG，应组合哪些元素？
4. 哪个元素表达“上传完成 3/5”？哪个表达“成色评分 4/5”？
5. `selectedcontent` 是过时元素、实验提案还是现行但有限支持元素？
6. `<math>` 内部的 `mfrac` 是否属于 HTML 元素清单？
7. `disabled="false"` 为什么仍禁用？
8. `output[for]` 是否会自动计算？
9. 为什么 `div role="button"` 不能只靠角色获得原生按钮全部行为？
10. 从表格删除数据行后，应该检查哪些 DOM 集合和表头关系？

### 9.2 选择题

为每项选择最合适的首选结构：

| 需求 | 候选 |
| --- | --- |
| 商品详情中的“安全提醒”补充区域 | `aside` / `footer` / `mark` |
| 同一页面的主要导航链接集合 | `nav` / `menu` / `section` |
| 三件商品按价格、成色、距离横向比较 | `table` / `dl` / 三个 `article` 即可 |
| 用户必须确认后才删除内存收藏 | modal `dialog` / popover / `details` |
| 可见“39 元”并保存机器值 `3900` | `data` / `meter` / `output` |
| 未知方向的卖家用户名嵌入中文句子 | `bdi` / `bdo` / `i` |

## 10. 实践练习

### 10.1 进阶：同一需求的选型对比

对下面三组分别写“采用/不采用”说明：

1. 商品属性：`dl`、`table`、普通段落；
2. 收藏操作：`button`、`a`、`div role="button"`；
3. 交接规则：始终可见 `section`、`details`、popover、modal `dialog`。

每组必须比较内容职责、默认行为、键盘、DOM 接口、失败恢复和兼容成本。没有唯一外观答案，但职责与交互契约必须自洽。

## 11. 阶段验收

### 11.1 元素、属性与 API

- [ ] 每个元素组都有用途、允许上下文/内容边界、关键属性、接口/默认行为、主教程、最小写法和兼容说明；
- [ ] 22 种现行 `input` 类型无遗漏；
- [ ] 能区分内容属性、默认状态和当前 DOM 状态；
- [ ] 能说明布尔属性存在性；
- [ ] 能从元素追踪到通用或专用 DOM 接口；
- [ ] 能说明全局属性“可写”不等于“处处有效”；
- [ ] 能说明 ARIA 不补原生交互行为。

### 11.2 案例与故障恢复

- [ ] `minimal-listing.html` 可直接打开；
- [ ] 空留言有可见、可聚焦的验证恢复路径；
- [ ] 填写留言后只产生安全文本预览；
- [ ] Network 没有发布请求；
- [ ] Console 显示预期接口和整数分；
- [ ] `details` 可用键盘操作；
- [ ] 至少完成三个故障注入并保留修复前后证据；
- [ ] 没有把本地预览写成发布、保存、支付或授权成功。

## 12. 常见问题

### Q6：`search` 是否必须再写 `role="search"`？

支持良好的目标环境不需要重复角色。若项目确实支持旧环境，应基于测试决定兼容方案，避免无证据地叠加冲突语义。

### Q7：`selectedcontent` 为什么既列为现行又不推荐作基线？

“现行”回答规范是否定义它；“基线”回答目标环境是否普遍可用。两者不矛盾。保留普通 `select` 能让核心任务先成立，再增强关闭状态样式。

### Q8：自定义元素能使用任意名称吗？

自主自定义元素名称必须满足规范命名规则，通常包含连字符，并通过 `customElements.define()` 注册。名称合法不代表组件已定义、可访问或安全。

### Q9：Shadow DOM 能保护价格或权限数据吗？

不能。open/closed 只改变发现接口和封装方式，不是保密、认证或授权边界。客户端中的价格和状态都可被用户观察或修改。

### Q10：`data-*` 能保存对象吗？

属性值和 `dataset` 值都是字符串。对象需要明确序列化和解析；业务数据仍应有独立模型与可信来源。

### Q11：为什么不用 ARIA 给所有 `div` 补语义？

ARIA 主要修改无障碍树注解，不自动提供原生焦点、键盘、表单、提交、验证和状态算法。先选原生元素通常更少出错。

### Q12：`inputmode="numeric"` 是否等于数字验证？

不是。它只是输入界面提示。是否允许、怎样解析和怎样验证由 `type`、约束、业务规则和服务端共同决定。

### Q13：可以根据 `constructor.name` 判断所有行为吗？

不能。接口名帮助定位 API，但行为还取决于属性、连接状态、表单所有者、来源、策略、用户激活和浏览器实现。

## 13. 扩展阅读

### 13.1 无障碍、SVG、MathML 与组件

- [W3C HTML Accessibility API Mappings](https://www.w3.org/TR/html-aam-1.0/)：核对 HTML 到无障碍平台 API 的映射。
- [W3C ARIA in HTML](https://www.w3.org/TR/html-aria/)：核对原生元素允许的角色和 ARIA 属性。
- [W3C WAI-ARIA](https://www.w3.org/TR/wai-aria-1.2/)：核对角色、状态和属性语义；键盘模式另查 APG 并实测。
- [W3C SVG 2](https://www.w3.org/TR/SVG2/)：核对 `svg` 根与内部 SVG 元素、属性和接口。
- [W3C MathML Core](https://www.w3.org/TR/mathml-core/)：核对 `math` 根和浏览器核心数学排版。
- [WHATWG HTML：Custom elements](https://html.spec.whatwg.org/multipage/custom-elements.html)：核对命名、注册、自主元素、customized built-in 和生命周期。
- [WHATWG HTML：`template` 与 `slot`](https://html.spec.whatwg.org/multipage/scripting.html)：核对惰性模板、声明式 Shadow DOM 与 slot。

## 我现在能做到什么

- 能解释并验证：区分内容属性、IDL 属性和运行状态，并把默认行为与项目兼容基线一并核对。
- `HIS-002`：全局属性与元素专属属性
- `HIS-003`：DOM 接口和关键默认行为
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：现行元素职责索引：从内容需求选择 HTML](01-current-elements-by-responsibility.md) · [下一课：现行选择与确定性纠错](03-current-selection-correction.md) · [返回 HTML 模块](../README.md)
