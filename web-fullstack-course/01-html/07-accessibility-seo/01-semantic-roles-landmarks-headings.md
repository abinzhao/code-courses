# 语义角色、地标与标题：建立可导航的页面骨架

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 从语义元素、角色、地标和标题建立辅助技术可导航的页面结构。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `A11Y-001` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

从语义元素、角色、地标和标题建立辅助技术可导航的页面结构。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 A11Y-001（原生角色、地标和标题导航）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 同一个页面存在多种面向不同消费者的结构

浏览器读取 HTML 后，不只产生一个“页面”：

```text
HTML 源码
  ├─ 解析为 DOM：元素、属性、文本和节点关系
  ├─ 结合 CSS 参与布局与绘制：视觉位置、尺寸、颜色
  └─ 结合语义映射到可访问树：角色、名称、描述、状态、关系
```

可访问树不是 DOM 的逐节点复印件：

- 纯布局容器可能不需要单独暴露；
- `hidden`、`display: none` 等不可呈现内容通常不会出现在可访问树中；
- `<button>` 可能映射为 button 角色，同时从文本得到名称；
- `<nav>` 可能映射为 navigation 地标；
- `<input type="checkbox">` 会暴露 checkbox 角色和 checked 状态；
- 不同浏览器与平台辅助 API 的树形细节可能不同；
- 错误 ARIA 可能覆盖原本正确的原生语义或名称。

因此，排查顺序不能只看截图：

```text
先看源码语义
  → 再看 DOM 与属性
  → 再看 Accessibility 计算结果
  → 再用键盘执行任务
  → 最后在目标辅助技术组合中人工确认
```

自动扫描可以发现一部分确定错误，例如无名称按钮或低对比度，但它无法替你判断名称是否准确、顺序是否符合真实任务、焦点是否被粘性页头遮住，或“收藏二手自行车”是不是当前业务想表达的操作。

### 4.2 语义元素同时提供角色和行为基线

比较两个视觉上都像按钮的片段：

```html
<div class="button">收藏</div>
```

```html
<button type="button">收藏</button>
```

普通 `div` 默认只是通用容器：

- 不在顺序焦点导航中；
- 没有 button 角色；
- 没有原生 Enter/Space 激活；
- 没有原生 disabled 行为；
- 不会自动提交或明确退出表单提交；
- 浏览器和辅助技术不能仅凭 class 推导可靠操作语义。

原生 `button` 已经定义：

- 隐式 button 角色；
- 顺序焦点；
- Enter 和 Space 的平台原生激活行为；
- disabled 状态；
- 与表单的提交关系；
- `click` 这一统一激活入口。

“语义正确”不等于“无需测试”，而是把基础角色和跨输入行为交给浏览器，让项目只维护业务状态。

### 4.3 角色回答“这是什么”

角色让用户和工具知道节点承担的交互或结构职责。常见隐式映射：

| HTML | 常见隐式语义 | 关键边界 |
| --- | --- | --- |
| `<button>` | button | 表单内写明 `type` |
| `<a href="...">` | link | 没有 `href` 时不再是普通可导航链接 |
| `<input type="search">` | searchbox | 仍然需要可见 `label` |
| `<nav>` | navigation landmark | 多个 nav 需要可区分名称 |
| `<main>` | main landmark | 页面通常只有一个主要内容区域 |
| `<search>` | search landmark | 表示搜索/筛选区域，不等于提交行为 |
| `<aside>` | complementary landmark | 内容应与周围主内容有关但可独立理解 |
| `<header>` | 取决于上下文 | body 级 header 通常是 banner；article 内 header 不是新的 banner |
| `<footer>` | 取决于上下文 | body 级 footer 通常是 contentinfo；article 内 footer 不是新的 contentinfo |
| `<section>` | 取决于名称 | 有可访问名称时通常可形成 region；不要给每个容器都命名 |

角色不回答“操作哪个商品”。两个按钮都叫 button，仍需名称区分：

```text
role: button
name: 收藏二手自行车
```

也不要用 ARIA 角色改写原生职责：

```html
<!-- 错误案例：原生按钮被谎报成链接 -->
<button type="button" role="link">收藏</button>
```

这不会把按钮变成真正导航，也不会自动获得链接的 URL、上下文菜单和历史行为。正确做法是根据动作选择元素：

```html
<button type="button">收藏</button>
<a href="/listings/bike-001">查看详情</a>
```

### 4.4 地标把长页面切成可定位区域

地标不是视觉网格名称，而是页面主要区域的语义入口。一个清楚的商品页可能是：

```html
<header>
  <nav aria-label="主要">...</nav>
</header>

<main>
  <h1>邻里集市商品</h1>
  <search aria-labelledby="search-title">...</search>
  <section aria-labelledby="results-title">...</section>
</main>

<aside aria-labelledby="safety-title">...</aside>
<footer>...</footer>
```

实用规则：

1. 页面主要内容使用一个 `<main>`，不要把每张卡片都做成 main。
2. 多个相同类型地标必须有可区分名称。
3. 地标名称应说明范围，不必重复角色词。
4. 能引用可见标题时，优先 `aria-labelledby`。
5. 没有合适可见标题时，地标可以使用简短 `aria-label`。
6. 不要把每个 `section` 都命名成 region；过多地标会制造导航噪声。
7. `header` 和 `footer` 的地标语义受祖先上下文影响，不是看到标签名就必然新增 banner/contentinfo。

下面两个 nav 名称重复，用户在地标列表里只能看到两个无法区分的“商品”导航：

```html
<!-- 错误案例 -->
<nav aria-label="商品">...</nav>
<nav aria-label="商品">...</nav>
```

修复：

```html
<nav aria-label="主要">...</nav>

<nav aria-labelledby="category-nav-title">
  <h2 id="category-nav-title">商品分类</h2>
  ...
</nav>
```

辅助技术通常已经呈现 role，因此名称写“主要”往往比“主要导航”更精炼。最终措辞仍应在目标组合中检查，不能保证固定朗读模板。

### 4.5 标题提供内容层级，不替代地标

标题回答“这一段内容讲什么”，地标回答“这是页面哪一类主要区域”。两者互补：

```html
<main>
  <h1>邻里集市商品</h1>

  <section aria-labelledby="filter-title">
    <h2 id="filter-title">筛选商品</h2>
  </section>

  <section aria-labelledby="results-title">
    <h2 id="results-title">搜索结果</h2>

    <article>
      <h3>二手自行车</h3>
    </article>
  </section>
</main>
```

建议：

- 使用一个能代表页面主题的 `h1`；
- 主要章节使用 `h2`，章节内卡片使用 `h3`；
- 不要因为想要小字体就从 `h2` 跳到 `h5`；
- 不要因为想要大字体就把普通宣传语写成 `h1`；
- 用 CSS 控制视觉尺寸，用标题级别表达层级；
- 不依赖 HTML 曾讨论过的“自动大纲”来重置 section 内标题级别；现实工具仍需要明确 `h1`–`h6` 层级；
- 不为修复字号给普通 `div` 添加 `role="heading"` 和 `aria-level`；能使用原生标题时直接使用。

标题不必机械追求“任何时候都不能跳级”的形式分数，但在普通教材和业务页面中，跳级往往是结构遗漏证据。若确有嵌入式组件等边界，应记录它在宿主页面中的最终层级，而不是只在组件孤立预览中判断。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `header` | 页头或局部头部 | `<header>...</header>` | 是否为 banner 取决于上下文 |
| `nav` | 一组主要导航链接 | `<nav aria-label="主要">` | 多个 nav 应有唯一名称 |
| `main` | 页面主要内容 | `<main id="main">` | 页面通常只有一个可见 main |
| `search` | 搜索或筛选区域 | `<search>...</search>` | 不提供提交逻辑；需检查目标基线 |
| `aside` | 补充但相关内容 | `<aside aria-labelledby="tips">` | 不要把无关广告机械塞入 |
| `footer` | 页脚或局部尾部 | `<footer>...</footer>` | 是否为 contentinfo 取决于上下文 |
| `section` | 有主题的内容章节 | `<section aria-labelledby="title">` | 只有需要导航时才命名成 region |
| `h1`–`h6` | 表达内容层级 | `<h2>搜索结果</h2>` | 用 CSS 控制字号，不跳级凑样式 |
| `button` | 执行动作或提交 | `<button type="button">收藏</button>` | 表单中显式写 type |
| `a[href]` | 导航到 URL/片段 | `<a href="#results">结果</a>` | 无 href 不应冒充普通链接 |
| `label` | 给表单控件可见名称 | `<label for="q">关键词</label>` | `for` 必须匹配唯一 id |
| `fieldset` / `legend` | 命名一组相关控件 | `<legend>商品状态</legend>` | 不用普通 div 模拟分组语义 |
| `alt` | 图片文本替代 | `<img alt="蓝色自行车侧面">` | 取决于图片目的；装饰图使用空 alt |
| `aria-labelledby` | 引用一个或多个名称来源 | `aria-labelledby="title count"` | 引用必须存在；通常优先级高 |
| `aria-label` | 直接提供名称字符串 | `aria-label="关闭"` | 可能覆盖可见文字；只在必要时用 |
| `aria-describedby` | 关联补充描述 | `aria-describedby="help"` | 不替代名称；避免过长重复 |
| `aria-pressed` | 表达切换按钮状态 | `aria-pressed="false"` | 脚本必须与真实和可见状态同步 |
| `aria-current` | 标记集合中的当前项目 | `aria-current="page"` | 不要给所有链接都写 |
| `aria-hidden` | 从可访问树隐藏内容 | `aria-hidden="true"` | 不可包住仍可聚焦的元素 |
| `role` | 在原生语义不足时补充角色 | `role="status"` | 不增加行为；不得与原生语义冲突 |
| `tabindex="0"` | 加入自然焦点顺序 | `tabindex="0"` | 普通静态容器通常不需要 |
| `tabindex="-1"` | 允许程序化聚焦 | `<main tabindex="-1">` | 不在普通 Tab 顺序中 |
| 正数 `tabindex` | 人工提高焦点优先级 | `tabindex="1"` | 新代码中应避免 |
| `:focus-visible` | 匹配应强调的焦点 | `:focus-visible { outline: ... }` | 不应删除无替代的默认焦点 |
| `:target` | 匹配当前 URL 片段目标 | `main:target { ... }` | 表示片段目标，不等于焦点 |
| `HTMLElement.focus()` | 程序化移动焦点 | `target.focus()` | 只能在有明确用户任务时使用 |
| `document.activeElement` | 观察当前活动元素 | `document.activeElement` | Shadow DOM 中还需检查内部焦点 |
| `hidden` | 隐藏当前不呈现内容 | `article.hidden = true` | 隐藏内容退出常规键盘路径 |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/01-semantic-roles-landmarks-headings/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 A11Y-001（原生角色、地标和标题导航） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 在打开页面前写下预期 DOM、默认行为或请求结果；
4. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
5. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [键盘、焦点与 ARIA：完成可预测的操作路径](03-keyboard-focus-skip-links-aria.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 A11Y-001（原生角色、地标和标题导航） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`03-keyboard-focus-skip-links-aria.md`](03-keyboard-focus-skip-links-aria.md)。

## 8. 常见错误与排查路径

### 8.1 明确错误：重复的 navigation 名称

制造故障：

```html
<nav aria-label="商品">...</nav>
<nav aria-label="商品">...</nav>
```

| 阶段 | 操作 |
| --- | --- |
| 现象 | 地标列表出现两个同名 navigation |
| 证据 | 完整 Accessibility Tree 或目标辅助技术的 landmark 列表 |
| 原因 | 同类型区域使用相同作者名称 |
| 修复 | 第一个命名“主要”，第二个引用可见“商品分类”标题 |
| 复验 | 两个 navigation 的 name 分别可区分 |

正确版本：

```html
<nav aria-label="主要">...</nav>

<nav aria-labelledby="category-title">
  <h2 id="category-title">商品分类</h2>
  ...
</nav>
```

不要为了“唯一”写“导航 1”“导航 2”。名称应表达业务范围。

### 8.2 地标过多

错误思路：

```html
<section aria-label="价格">...</section>
<section aria-label="状态">...</section>
<section aria-label="按钮">...</section>
<section aria-label="分隔区域">...</section>
```

每个 section 都有名称，可能产生一长串 region。地标导航不再比标题导航更高效。

修复：

- 只保留页面级和任务级主要区域；
- 商品内部用标题、段落、列表表达；
- 无独立主题的布局容器用 `div`；
- 有主题但不需要地标的 section 可以不强行命名，或重新判断是否真的需要 section。

## 9. 课后题

1. A11Y-001（原生角色、地标和标题导航）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

选择一件与教材不同的邻里商品，完成一次迁移练习：

1. 先写内容关系、机器值或交互目标，不先写标签；
2. 用 A11Y-001（原生角色、地标和标题导航） 实现最小页面；
3. 制造一个本课错误并保留失败证据；
4. 修复后重复键盘或开发者工具检查；
5. 在记录中解释为什么没有选择一个视觉相似的替代写法。

## 11. 阶段验收

### A11Y-001：原生角色、地标和标题导航

- [ ] 页面使用适合职责的 header、nav、main、search、aside、footer；
- [ ] 页面只有一个当前可见的主要 main；
- [ ] 两个 navigation 的名称可区分；
- [ ] h1、h2、h3 层级可以解释；
- [ ] 没有用字号或 `role="heading"` 替代可用的原生标题；
- [ ] Accessibility 树记录 role 和 name；
- [ ] 没有把每个 section 都制造成 region。

### A11Y-006：ARIA 优先级与误用

- [ ] 可用原生元素时没有重造 role；
- [ ] role 没有与原生语义冲突；
- [ ] aria-label 没有覆盖准确的可见文字；
- [ ] ARIA 状态与真实行为同步；
- [ ] `aria-hidden` 没有包含可聚焦后代；
- [ ] 能解释 ARIA 不会添加键盘、焦点、权限和持久化；
- [ ] 已修复一次 div-button 故障并保留前后证据。

### 文件、打开、结果和失败证据

- [ ] `minimal.html` 与 `index.html` 位于个人练习目录；
- [ ] 记录启动目录与 `python3 -m http.server 4173`；
- [ ] 记录成功 URL；
- [ ] 记录服务器停止方式；
- [ ] 记录端口占用或 404 的排查过程；
- [ ] 记录至少一份 Accessibility 树；
- [ ] 记录完整键盘路径；
- [ ] 记录冲突 aria-label、重复地标、div-button 和正数 tabindex 的修复；
- [ ] 记录 Console 是否有错误；
- [ ] 记录 Network 没有收藏业务请求；
- [ ] 列出未验证的浏览器和辅助技术组合。

### 建议提交材料

```text
market-learning/practice/html-chapter-07/
├── minimal.html
├── index.html
├── name-sources.html
├── fault-name-landmark.html
├── fault-keyboard.html
└── evidence/
    ├── name-sources.md
    ├── keyboard-path.md
    ├── fault-name-landmark.md
    ├── fault-keyboard.md
    └── manual-a11y-report.md
```

阶段通过要求不是“文件都存在”，而是：

1. 正常路径可以重复完成；
2. 故障可以稳定复现；
3. 根因能由 DOM、Accessibility 或焦点证据支持；
4. 修复后同一检查通过；
5. 业务和测试边界写明；
6. 不把自动检查称为完整无障碍认证。

## 12. 常见问题

### Q5：一个页面只能有一个 nav 吗？

可以有多个，例如主要导航、商品分类和页脚政策链接。多个同类型地标应有可区分名称，且每个都应代表真正的导航集合。

### Q6：一个页面必须只有一个 h1 吗？

HTML 语法允许更复杂情况，但普通页面采用一个代表页面主题的 h1，配合明确 h2/h3 层级，最容易维护和测试。不要依赖 section 自动重置标题层级。

### Q13：Accessibility 面板正常，是否还要测试屏幕阅读器？

要。面板证明浏览器计算和映射输入，不能覆盖辅助技术的导航模式、设置、浏览器组合和用户实际任务。至少测试项目声明支持的组合；没测就明确写未测。

### Q17：自动化测试应按 role/name 查询吗？

这通常比 class 或 DOM 层级更接近用户，但前提是 role/name 本身准确。测试通过不能证明文案合理、键盘顺序完整或目标辅助技术可用；仍需人工证据。

### Q19：为什么不让每张商品卡片都成为 region？

当列表已有结果标题、每张卡片有 h3 和 article 语义时，再给每张卡片制造 region 可能增加地标噪声。应让地标服务大区域，让标题和 article 服务条目结构。

## 13. 扩展阅读

以下规范、指南与工具页面核验日期：2026-10-10。标准说明机制，指南帮助设计，开发者工具提供运行证据；三者都不能替代目标用户与辅助技术测试。

- [WHATWG HTML：Semantics, structure, and APIs of HTML documents](https://html.spec.whatwg.org/multipage/dom.html#semantics-2)：理解 HTML 语义、元素与 DOM 的基础关系。
- [WHATWG HTML：Sections](https://html.spec.whatwg.org/multipage/sections.html)：核对 body、article、section、nav、aside、标题、header、footer、main 和 search 的内容模型。
- [WHATWG HTML：The `tabindex` attribute](https://html.spec.whatwg.org/multipage/interaction.html#the-tabindex-attribute)：核对可聚焦区域、顺序焦点导航和 tabindex 值。
- [WHATWG HTML：Focus](https://html.spec.whatwg.org/multipage/interaction.html#focus)：理解焦点、活动元素和顺序导航模型。
- [WHATWG HTML：Scrolling to a fragment](https://html.spec.whatwg.org/multipage/browsing-the-web.html#scroll-to-the-fragment-identifier)：区分 fragment 导航、滚动与焦点步骤。
- [W3C Accessible Name and Description Computation 1.2](https://www.w3.org/TR/accname-1.2/)：查阅名称与描述计算的规范算法；不要把本课实用顺序当作完整算法。
- [W3C HTML Accessibility API Mappings](https://www.w3.org/TR/html-aam-1.0/)：核对 HTML 元素如何映射角色、名称、描述和状态。
- [W3C ARIA in HTML](https://www.w3.org/TR/html-aria/)：核对元素允许的 role/aria 属性及原生语义边界。
- [W3C WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/)：查阅角色、状态、属性和名称特征的规范定义。
- [WAI-ARIA APG：Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/)：理解“原生优先”“没有 ARIA 胜过错误 ARIA”和 APG 示例边界。
- [WAI-ARIA APG：Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)：检查地标选择、重复地标命名和区域数量。
- [WAI-ARIA APG：Providing Accessible Names and Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)：比较内容、label、aria-labelledby、aria-label 和 description 的使用。
- [WAI-ARIA APG：Button Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/button/)：在确实开发自定义按钮模式时核对键盘约定；优先使用原生 button。
- [WCAG 2.2：1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html)：理解视觉关系为何需要程序化表达。
- [WCAG 2.2：2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)：检查功能是否无需特定时间轨迹的指针输入。
- [WCAG 2.2：2.4.1 Bypass Blocks](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)：理解 skip link、标题和地标如何跳过重复内容。
- [WCAG 2.2：2.4.3 Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)：检查顺序是否保留含义和可操作性。
- [WCAG 2.2：2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)：核对键盘焦点指示要求。
- [WCAG 2.2：2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)：检查焦点是否被作者创建内容完全遮住。
- [WCAG 2.2：2.5.3 Label in Name](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)：理解可见标签与计算名称一致性的价值。
- [Chrome DevTools：Accessibility features reference](https://developer.chrome.com/docs/devtools/accessibility/reference/)：查看完整可访问树、计算属性和名称来源。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对键盘主路径、整数分、教学状态与服务端职责。

阅读与验证时保持四层证据：

```text
规范：什么语义和算法是定义的一部分
映射：浏览器如何暴露给平台辅助 API
工具：当前浏览器实际计算了什么
用户测试：目标辅助技术和任务实际发生什么
```

兼容性不能只写“现代浏览器都支持”。本课使用的元素、属性、选择器和 DevTools 功能应按项目目标浏览器重新查询官方兼容资料并实测；未测 Safari、Firefox、移动端或屏幕阅读器时，在报告中明确列出。

## 我现在能做到什么

- 能解释并验证：从语义元素、角色、地标和标题建立辅助技术可导航的页面结构。
- `A11Y-001`：原生角色、地标和标题导航
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[返回本章入口](../07-accessibility-seo.md) · [下一课：可访问名称、描述与状态：让控件表达准确对象](02-accessible-names-descriptions-states.md) · [返回 HTML 模块](../README.md)
