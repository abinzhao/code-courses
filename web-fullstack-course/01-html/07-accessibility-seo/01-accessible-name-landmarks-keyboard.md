# 可访问名称、地标与键盘：让商品查询不依赖猜测

> 所属章节：无障碍、SEO 与质量
>
> 建议学习时间：5–6 小时
>
> 阶段成果：建立可检查的页面语义、名称与键盘路径，并完成邻里集市商品查询页

## 任务卡

小林想在邻里集市查找二手自行车。他可以看见页面，但暂时不用鼠标；另一位用户通过辅助技术按地标、标题和控件名称浏览。页面如果只有视觉上的“顶部”“左栏”“蓝色按钮”，两个人都会遇到同一个根本问题：浏览器没有得到足够稳定的结构与操作含义。

本课把页面质量拆成一条可以取证的链：

```text
正确的 HTML 元素
  → 浏览器推导角色、名称、描述和状态
  → 形成可访问树
  → 地标与标题提供分区
  → 原生控件提供键盘行为
  → DOM 顺序形成可预测的焦点顺序
  → 可见焦点和跳过链接帮助用户保持位置
```

**完成本课后，你将交付：**

- 一份 DOM、渲染树和可访问树的职责对照；
- 一份浏览器 Accessibility 面板检查记录；
- 一组有明确名称的 `header`、`nav`、`main`、`search`、`aside` 和 `footer`；
- 一条层级清楚、没有用字号伪造的标题结构；
- 一份按钮、链接、输入框和图片的可访问名称来源记录；
- 一个区分名称、描述和状态的商品卡片；
- 一条只使用 `Tab`、`Shift+Tab`、`Enter`、`Space` 和方向键之外必要按键完成的商品查询路径；
- 一个可见的 `:focus-visible` 样式；
- 一个从跳过链接进入主要内容的片段导航；
- 一份 `tabindex="0"`、`tabindex="-1"` 和正数 `tabindex` 的边界说明；
- 四个可重复制造并修复的故障：冲突的 `aria-label`、伪造的 `div` 按钮、重复的地标名称和正数 `tabindex`；
- 一个刷新后恢复初始状态的邻里集市内存筛选与收藏页面。

本课不会承诺某一款屏幕阅读器必定说出某个固定句子。浏览器、平台辅助 API、屏幕阅读器、语言和用户设置都会影响最终呈现。本课能验证的是语义输入、浏览器计算出的角色/名称/描述/状态、键盘行为和目标测试组合中的实际结果。

## 1. 任务背景

前六章已经让邻里集市拥有内容结构、链接、表格、表单、原生交互和 DOM 行为。现在页面可能“能点”，但仍可能出现以下失败：

- 两个导航区都只叫“导航”，用户无法快速判断要进入哪一个；
- 搜索框只有 placeholder，输入后提示消失；
- 按钮可见文字是“收藏商品”，`aria-label` 却把名称覆盖成“删除商品”；
- `<div>` 看起来像按钮，鼠标能点，键盘的 Enter 和 Space 却不能可靠激活；
- CSS 把卡片视觉顺序改成 3、1、2，Tab 仍按 DOM 的 1、2、3 移动；
- `outline: none` 删除了浏览器焦点指示，却没有可见替代；
- 为“修正顺序”加入 `tabindex="1"`、`tabindex="2"`，页面新增一个控件后顺序再次破裂；
- 跳过链接只滚动页面，没有给目标建立可复验的焦点位置；
- 给原生按钮再写错误角色，反而丢失原有语义；
- 自动扫描没有报错，于是团队误以为键盘主路径已经可用。

这些问题不能靠一句“支持无障碍”解决。需要把用户任务转换成可观察证据：

| 用户问题 | 页面应提供什么 | 在哪里取证 |
| --- | --- | --- |
| 我现在位于哪个区域？ | 地标和唯一名称 | Accessibility 树的 role/name |
| 当前内容讲什么？ | 有层级的标题 | DOM、标题列表、Accessibility 树 |
| 这个控件是什么？ | 角色 | Accessibility 树的 role |
| 它操作什么？ | 可访问名称 | Computed name 及来源 |
| 有什么补充条件？ | 可访问描述和可见帮助 | description、`aria-describedby` 引用 |
| 现在是什么状态？ | 原生或 ARIA 状态，并有可见对应 | checked/pressed/disabled 等属性 |
| 不用鼠标能否完成？ | 原生键盘行为、合理焦点顺序 | 键盘实走、`document.activeElement` |
| 焦点在哪里？ | 不被裁切的可见焦点样式 | 页面截图与人工观察 |

邻里集市在 HTML 阶段仍是教学页面：

```text
商品：页面中的固定示例数据
筛选：当前标签页内隐藏或显示卡片
收藏：当前标签页内的 aria-pressed 与可见文字
刷新：筛选和收藏恢复初始状态
网络：不发送收藏、预约或登录请求
```

因此，本课证明的是结构和交互入口可达，不证明身份、授权、持久化、并发预约或服务端数据正确。

## 2. 学习目标

完成本课后，你应能：

- 解释 DOM、视觉渲染结果和可访问树为什么相关但不相同；
- 说明语义 HTML 如何向浏览器提供隐式角色和默认键盘行为；
- 用开发者工具检查节点的 role、name、description、states 和名称来源；
- 选择 `header`、`nav`、`main`、`search`、`aside`、`footer` 和普通 `section`；
- 解释哪些 `header`、`footer`、`section` 和 `form` 会成为地标，哪些不会；
- 为同类型的多个地标提供简短且可区分的名称；
- 建立从 `h1` 到下级标题的内容层级，不依赖过时的“自动文档大纲”假设；
- 区分可访问名称、可访问描述、状态和值；
- 在常见控件中按实用顺序排查 `aria-labelledby`、`aria-label`、原生标签、元素内容和后备来源；
- 使用 `<label>`、按钮文字、链接文字、`alt`、`legend` 和 `aria-labelledby` 提供名称；
- 使用 `aria-describedby` 关联补充说明，而不把整段帮助文字塞进名称；
- 解释为什么 placeholder、title 和 CSS 伪元素不能替代稳定的可见标签；
- 保持可见标签文字包含在可访问名称中；
- 优先使用 `<button>` 和带 `href` 的 `<a>`，并预测 Enter 与 Space 的基础激活差异；
- 让 DOM 顺序同时服务阅读顺序、视觉顺序和顺序焦点导航；
- 使用 `:focus-visible` 提供明显焦点，而不全局删除轮廓；
- 创建 skip link，并区分片段滚动、URL 变化和焦点移动；
- 使用 `tabindex="0"` 把确实需要的自定义焦点目标加入顺序；
- 使用 `tabindex="-1"` 建立程序化或片段焦点目标；
- 解释正数 `tabindex` 为什么会形成脆弱的第二套顺序；
- 应用 ARIA 第一规则：已有满足需求的原生元素时，不用角色重新制造；
- 说明 ARIA 只能表达语义，不能自动增加点击、键盘、焦点、样式、权限或业务行为；
- 用键盘走完查询、浏览商品、切换收藏、跳转分类和返回页首的主路径；
- 把自动检查、Accessibility 树、键盘人工检查和屏幕阅读器测试的证据范围分开记录。

## 3. 预备知识

建议先完成：

- [地标、标题与文档结构](../02-structure-links-lists/01-landmarks-headings-outline.md)；
- [URL、链接与站内导航](../02-structure-links-lists/02-urls-links-navigation.md)；
- [表单控件、选择与分组](../05-forms-validation/03-form-controls-groups.md)；
- [原生交互元素](../06-interactive-dom/01-native-interactive-elements.md)；
- [事件、表单与委托](../06-interactive-dom/03-events-forms-delegation.md)。

你需要知道：

- 元素和属性会被解析为 DOM；
- `<button>` 在表单中应显式写 `type`；
- `hidden` 会让内容退出普通呈现和顺序焦点导航；
- `document.activeElement` 表示文档当前的活动元素；
- `event.preventDefault()` 只取消可取消的默认动作；
- `textContent` 适合把普通字符串写入页面；
- CSS 视觉布局不会自动改写 DOM 顺序；
- 邻里集市价格数据使用整数分，时间存储使用 UTC ISO 8601。

准备工具：

```text
编辑器：保存 UTF-8 Markdown 与个人练习 HTML
浏览器：一个带 Elements 和 Accessibility 面板的现代 Chromium
键盘：Tab、Shift+Tab、Enter、Space、Esc
可选：Firefox Accessibility Inspector，用于第二份浏览器证据
可选：团队明确支持的屏幕阅读器与浏览器组合
```

在 Chromium 中，通常可以这样进入证据面板：

1. 打开 DevTools；
2. 在 Elements 中选中目标元素；
3. 展开 Accessibility 面板；
4. 查看 Computed Properties 中的 Role、Name、Description 和状态；
5. 展开名称计算来源，确认是 `aria-labelledby`、`aria-label`、`label`、内容还是其他来源；
6. 使用完整 Accessibility Tree 视图核对地标层次。

DevTools 的具体按钮位置会随版本变化。若看不到面板，使用命令菜单搜索“Accessibility”，或在 Elements 侧栏的更多面板中启用。不要因为界面布局不同就改写页面语义。

本课中的“预期名称”指浏览器可访问树中的计算结果，不等于保证某个辅助技术按完全相同的词序、停顿或语言朗读。

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

### 4.6 可访问名称回答“具体是哪一个”

可访问名称是辅助技术和自动化工具识别对象的主要短标签。不同元素允许的名称来源不同：

| 对象 | 首选名称来源 | 示例 |
| --- | --- | --- |
| 文本输入 | 关联的 `<label>` | `<label for="q">商品关键词</label>` |
| 按钮 | 按钮内可见文字 | `<button>收藏二手自行车</button>` |
| 链接 | 有意义的链接内容 | `<a href="...">查看二手自行车</a>` |
| 图片 | 与目的匹配的 `alt` | `<img alt="蓝色通勤自行车侧面">` |
| fieldset 分组 | 第一个 `<legend>` | `<legend>商品状态</legend>` |
| 命名区域 | 可见标题 + `aria-labelledby` | `<section aria-labelledby="results-title">` |
| 无可见文字的必要图标按钮 | `aria-label` 或引用可见文字 | `<button aria-label="关闭价格说明">...</button>` |

在本课常见的按钮、链接和表单控件中，可以按下面的**实用排查顺序**检查名称覆盖：

```text
1. aria-labelledby 引用的文本
2. aria-label 字符串
3. 元素专属的原生标注机制，例如 label、alt、legend
4. 角色允许时的元素内容，例如 button/link 的文本
5. title 等后备来源
```

这是一条调试路线，不是对 Accessible Name and Description Computation 完整算法的替代。完整算法还会考虑：

- 当前角色是否允许由作者命名或由内容命名；
- 引用是否有效；
- 被引用节点的文本替代如何递归计算；
- 嵌入控件和值；
- 隐藏节点作为引用目标时的特殊规则；
- HTML Accessibility API Mappings 对具体元素的规定；
- 浏览器实现和平台映射。

#### `aria-labelledby`

`aria-labelledby` 通过 IDREF 引用页面中的文字，可引用一个或多个节点：

```html
<h2 id="results-title">搜索结果</h2>
<p id="results-count">共 3 件商品</p>

<section aria-labelledby="results-title results-count">
  ...
</section>
```

多个 ID 按属性中的顺序组合。它适合：

- 已有可见标题，希望同时作为区域名称；
- 一个控件需要组合“动作 + 对象”；
- 名称应随引用文字一起本地化和更新。

边界：

- ID 必须唯一且存在；
- 名称不要长成一段操作说明；
- 引用文字改变会改变计算名称；
- 它通常会覆盖 `aria-label` 和较低优先级的原生名称来源；
- 浏览器实际计算结果必须在 Accessibility 面板中确认。

#### `aria-label`

`aria-label` 直接提供字符串：

```html
<button type="button" aria-label="关闭价格说明">
  <svg aria-hidden="true" viewBox="0 0 16 16">...</svg>
</button>
```

它适用于确实没有可见文字、图标含义又必须表达的控件。它不是“提升无障碍”的通用装饰：

```html
<!-- 错误案例：覆盖了正确的可见名称 -->
<button type="button" aria-label="删除商品">收藏商品</button>
```

浏览器通常计算出名称“删除商品”，可见用户却看到“收藏商品”。这会同时伤害屏幕阅读器用户、语音控制用户、自动化测试和维护者。

#### 原生标签和内容

表单控件优先使用可见 `<label>`：

```html
<label for="query">商品关键词</label>
<input id="query" name="q" type="search">
```

按钮和链接通常直接使用清楚文字：

```html
<button type="button">收藏二手自行车</button>
<a href="/listings/bike-001">查看二手自行车详情</a>
```

不要把 placeholder 当标签：

```html
<!-- 错误案例：输入后提示消失，且名称来源不稳健 -->
<input type="search" placeholder="搜索商品">
```

placeholder 是输入格式或示例提示，不是持续可见标签。`title` 也只是弱后备，不适合作为主要标签：它在触摸、键盘和不同辅助技术中的呈现并不稳定。

### 4.7 名称、描述、状态和值承担不同职责

把所有信息都塞进 `aria-label` 会产生冗长且难维护的名称。应先分类：

| 信息 | 回答的问题 | 典型来源 |
| --- | --- | --- |
| role | 这是什么？ | 原生元素或必要的 ARIA role |
| name | 具体是哪一个？ | label、内容、alt、aria-labelledby、aria-label |
| description | 还需要知道什么条件？ | 可见帮助 + aria-describedby |
| state | 当前处于什么状态？ | checked、pressed、expanded、disabled、current |
| value | 当前值是什么？ | 输入值、范围值等原生属性 |

示例：

```html
<p id="bike-help">刷新页面后收藏状态会重置。</p>
<p id="bike-state">当前：未收藏</p>

<button
  type="button"
  aria-pressed="false"
  aria-describedby="bike-help bike-state"
>
  收藏二手自行车
</button>
```

这里：

- role 来自原生 `button`；
- name 来自按钮可见文字“收藏二手自行车”；
- description 引用可见帮助和可见状态；
- pressed state 来自 `aria-pressed="false"`；
- 视觉用户也能看到“当前：未收藏”。

如果使用 `aria-pressed` 表达切换按钮，保持按钮标签稳定通常更容易理解：

```text
name: 收藏二手自行车
pressed: false → true
visible state: 当前：未收藏 → 当前：已收藏
```

另一种合法设计是不使用 `aria-pressed`，而把动作文字在“收藏二手自行车”和“取消收藏二手自行车”之间切换。不要同时让名称说“取消收藏”、状态却仍是 `aria-pressed="false"`。

原生状态优先：

- checkbox 使用 `checked`，不要另写 `aria-checked`；
- 原生 button 使用 `disabled`，不要只写 `aria-disabled="true"`；
- `details` 使用 `open`，不必手工复制 `aria-expanded`；
- 当前页链接可使用 `aria-current="page"`；
- 自定义切换按钮在确有该模式时使用 `aria-pressed`，并由脚本同步。

ARIA 状态不会自动改变业务行为。例如 `aria-disabled="true"` 不会阻止 click，也不会自动移出焦点顺序；如果使用它，代码还必须真正阻止不允许的操作并解释原因。能用原生 `disabled` 时先用原生能力。

### 4.8 可见标签应包含在可访问名称中

如果页面上写“搜索商品”，可访问名称也应包含“搜索商品”，最好以同样顺序开头。这样：

- 语音控制用户可以说出屏幕上看到的词；
- 屏幕阅读器用户与协助者讨论同一个名称；
- 自动化测试更接近用户界面；
- 翻译不会维护两套互相冲突的文案。

正确：

```html
<button type="button">收藏二手自行车</button>
```

也可以在名称中补充上下文，但必须保留可见标签：

```html
<span id="favorite-visible">收藏</span>
<span id="favorite-item" class="visually-hidden">二手自行车</span>
<button
  type="button"
  aria-labelledby="favorite-visible favorite-item"
>
  收藏
</button>
```

上例为了演示组合来源而重复“收藏”节点，实际代码应避免复杂化。最简单、最稳健的版本仍然是直接把完整文字放进按钮。

错误：

```html
<button type="button" aria-label="加入心愿单">收藏</button>
```

虽然两句话业务上相近，可见标签“收藏”并未出现在计算名称“加入心愿单”中。修复时先统一产品文案，不要靠更多 ARIA 同时保留两种叫法。

### 4.9 链接和按钮的键盘激活不是同一职责

| 控件 | 目的 | 常见原生键盘激活 | 结果 |
| --- | --- | --- | --- |
| `<a href>` | 导航到 URL 或片段 | Enter | 地址、历史或片段位置变化 |
| `<button type="button">` | 执行页面动作 | Enter、Space | 触发 click，由脚本改变状态 |
| `<button type="submit">` | 提交表单 | Enter、Space；表单还可能隐式提交 | 触发 submit 流程 |

事件的精确触发时机可能随控件、浏览器和输入方式不同。业务代码应监听原生 `click` 或表单 `submit`，不要分别手工猜测每个 keydown：

```js
const favoriteButton = document.querySelector("#favorite-bike");

favoriteButton.addEventListener("click", () => {
  const next = favoriteButton.getAttribute("aria-pressed") !== "true";
  favoriteButton.setAttribute("aria-pressed", String(next));
});
```

如果用 `div role="button"`，角色只改变语义暴露，不会自动增加：

- `tabindex="0"`；
- Enter 激活；
- Space 激活及滚动抑制；
- disabled 处理；
- 表单行为；
- 平台原生点击合成；
- 高对比模式和用户样式下的原生可识别性。

因此，修复伪按钮的首选方案不是继续补事件，而是替换成 `<button>`。

### 4.10 焦点顺序首先来自 DOM 顺序

顺序焦点导航通常按以下原则形成：

1. 正数 `tabindex` 节点先按数值从小到大；
2. 相同数值再按 DOM 顺序；
3. 原生可聚焦元素和 `tabindex="0"` 节点按 DOM 顺序；
4. `tabindex="-1"` 不参与普通 Tab 顺序，但可由 `.focus()` 或某些导航机制聚焦；
5. disabled、hidden 或不呈现节点通常不参与顺序焦点导航。

第 1 条正是应避免正数 `tabindex` 的原因。它建立一套脱离 DOM 的第二顺序：

```html
<!-- 错误案例 -->
<button tabindex="3">筛选</button>
<a href="#results" tabindex="1">查看结果</a>
<input tabindex="2" aria-label="关键词">
```

新增一个控件、复用一个组件、切换响应式布局，都可能让数值顺序失效。正确修复是调整 DOM：

```html
<label for="q">关键词</label>
<input id="q" name="q">
<button type="submit">筛选</button>
<a href="#results">查看结果</a>
```

CSS Grid/Flexbox 的 `order`、网格定位或绝对定位只改变视觉位置，不会可靠改变：

- DOM 阅读顺序；
- 屏幕阅读器浏览顺序；
- Tab 顺序；
- 复制文本顺序。

移动端和桌面端如果需要完全不同的任务顺序，应先重新审视信息架构，而不是只用 CSS 把同一 DOM 排成相反顺序。

### 4.11 `:focus-visible` 让键盘位置可见

浏览器的默认轮廓是安全基线。最危险的写法：

```css
/* 错误案例 */
*:focus {
  outline: none;
}
```

正确做法是保留默认样式，或提供足够清楚的替代：

```css
:focus-visible {
  outline: 3px solid #7c3aed;
  outline-offset: 3px;
}
```

`:focus-visible` 让浏览器根据输入方式和控件类型决定何时强调焦点。不要把它理解成“鼠标永远不显示焦点”的绝对承诺；算法和用户设置由浏览器决定。

焦点样式还要检查：

- 与相邻颜色有明显区分；
- 不被 `overflow: hidden` 裁掉；
- 不被 sticky header、cookie banner 或 dialog 遮住；
- 200% 放大和窄屏下仍看得见；
- 高对比/强制颜色模式下不只依赖背景色；
- 不只用轻微阴影或颜色变化表达。

可增加双层指示，但不要删除轮廓后只留不稳定阴影：

```css
:focus-visible {
  outline: 3px solid CanvasText;
  outline-offset: 3px;
  box-shadow: 0 0 0 6px Canvas;
}
```

系统颜色有助于强制颜色模式，但最终仍需在目标环境人工检查。

### 4.12 跳过链接、片段滚动和焦点是三个相关结果

长页面顶部常有品牌和导航。键盘用户每次都 Tab 过全部链接会付出重复成本。skip link 是页面最早的可聚焦链接：

```html
<a class="skip-link" href="#main-content">跳到主要内容</a>

<header>...</header>

<main id="main-content" tabindex="-1">
  <h1>邻里集市商品</h1>
  ...
</main>
```

样式让它平时移出视口、获得键盘焦点时出现：

```css
.skip-link {
  position: fixed;
  inset: 0 auto auto 0;
  transform: translateY(-150%);
  padding: 0.75rem 1rem;
  background: Canvas;
  color: CanvasText;
  z-index: 1000;
}

.skip-link:focus-visible {
  transform: translateY(0);
}
```

激活片段链接可能涉及：

1. URL 的 fragment 变为 `#main-content`；
2. 浏览器把目标滚动到视口；
3. 焦点是否移动到目标，受目标可聚焦性、浏览器和导航路径影响。

`tabindex="-1"` 让 main 成为可聚焦目标，但不把 main 插入日常 Tab 顺序。这比给 main 写 `tabindex="0"` 更合适：用户通过 skip link 进入后，下一次 Tab 应到主要内容中的第一个交互控件，而不是让每次自然导航都停在 main 容器。

检查时不能只看页面是否滚动。激活后在 Console 观察：

```js
document.activeElement
```

并确认它是 main 或主要内容中预期目标。不同浏览器、直接输入 fragment、脚本修改 `location.hash` 和点击链接可能存在差异；项目必须在目标组合实测。若产品需要脚本增强，仍应保留真实 `href`，并只补足焦点，不要把链接改成无 URL 的按钮。

### 4.13 `tabindex` 的三个常见取值

| 值 | 含义 | 合理用途 | 主要风险 |
| --- | --- | --- | --- |
| `0` | 加入自然顺序，位置按 DOM | 没有原生替代的复合控件入口；自定义组件内部策略 | 把普通文本和容器塞进 Tab 顺序 |
| `-1` | 可程序化聚焦，不进普通 Tab 顺序 | skip target、错误汇总、动态标题、焦点恢复目标 | 获得焦点后没有可见样式或无后续路径 |
| 正数 | 建立高优先级自定义顺序 | 几乎不应使用 | 形成脆弱第二顺序，组件间冲突 |

不要给每个标题、段落和卡片写 `tabindex="0"`。键盘用户用 Tab 寻找的是交互入口；静态内容由阅读/浏览命令处理。把所有内容都加入 Tab 顺序会让页面比鼠标路径更慢。

不要用 `tabindex="-1"` 让本应可操作的控件从键盘路径消失：

```html
<!-- 错误案例：键盘用户无法顺序到达主要动作 -->
<button type="button" tabindex="-1">发布商品</button>
```

`tabindex` 也不是 disabled。需要禁用原生控件时使用 `disabled`，并说明何时恢复。

### 4.14 ARIA 第一规则与边界

ARIA 的第一规则可以转述为：

> 如果已经存在满足语义和行为需求的原生 HTML 元素或属性，应使用原生方案，而不是给通用元素添加角色、状态和脚本重新实现。

优先级：

```text
正确原生元素
  → 正确可见文字与原生属性
  → 必要时用 aria-labelledby / aria-describedby 建立关系
  → 只有原生语义不足时才增加 ARIA 角色或状态
  → 在目标浏览器与辅助技术组合中验证
```

ARIA 能做：

- 补充或覆盖可访问名称；
- 关联描述；
- 表达原生 HTML 缺少的角色、状态和关系；
- 为复杂组件建立辅助技术可理解的语义。

ARIA 不能做：

- 自动让 `div` 可聚焦；
- 自动实现 Enter、Space、方向键或 Esc；
- 自动阻止点击；
- 自动创建表单提交、URL、历史或校验；
- 自动管理焦点；
- 自动提供可见标签和状态；
- 自动修复错误 DOM 顺序；
- 自动保证屏幕阅读器朗读某个固定句子；
- 提供身份认证、授权、数据校验或持久化。

第二条实用规则是“没有 ARIA 胜过错误 ARIA”。例如：

```html
<!-- 原本正确 -->
<button type="button">收藏</button>

<!-- 错误增强：角色和名称都变得冲突 -->
<button type="button" role="link" aria-label="删除">收藏</button>
```

常见边界：

- 不给原生元素添加与其语义冲突的 role；
- 不在角色不允许命名时强行添加名称；
- 不让 `aria-hidden="true"` 的节点本身或后代继续可聚焦；
- 不使用 ARIA 隐藏可见业务错误；
- 动态状态必须与真实状态同步；
- ARIA 引用 ID 必须唯一且存在；
- 自定义复合组件必须实现对应键盘模式，而不只复制 APG 示例外观；
- WAI-ARIA Authoring Practices 是设计和示例指导，不替代规范、用户测试和项目需求。

### 4.15 检查结果必须写明证据边界

一份诚实记录可以写：

```text
已验证：
- Chromium Accessibility 树中的 landmark、heading、button、link 角色；
- 搜索框名称来自 label；
- 收藏按钮名称来自可见文本，pressed 状态随操作变化；
- Tab/Shift+Tab 顺序与 DOM 顺序一致；
- Enter 提交搜索，Space/Enter 激活收藏按钮；
- skip link 获得焦点时可见，激活后主要内容成为焦点目标。

未验证：
- Safari + VoiceOver；
- Firefox + NVDA；
- Android TalkBack；
- iOS VoiceOver；
- 语音控制；
- 浏览器扩展、高对比主题和企业策略造成的差异。

不作承诺：
- 任一屏幕阅读器的精确朗读词序；
- 自动扫描通过即满足完整 WCAG；
- 静态 HTML 能提供身份、权限或持久化。
```

这比写“已完全支持所有读屏软件”更可复验。

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

### 6.1 案例目标

先建立一个不依赖框架的观察页，验证：

- 地标和标题在 Accessibility 树中可见；
- 搜索框名称来自 `<label>`；
- 帮助文字作为 description，不覆盖名称；
- 链接与按钮使用各自原生角色；
- skip link 的片段目标可聚焦；
- 焦点样式清楚；
- 搜索和收藏可用键盘激活；
- 页面不承诺动态结果朗读；动态通知留到下一课。

### 6.2 文件位置

在你的个人学习工作区创建：

```text
market-learning/
└── practice/
    └── html-chapter-07/
        └── minimal.html
```

教材仓库不会自动生成该练习文件。

### 6.3 完整文件：名称与键盘观察页

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>可访问名称与键盘观察页</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      max-width: 56rem;
      margin: 0 auto;
      padding: 0 1rem 3rem;
      color: #172033;
      background: #fffdf8;
      font: 1rem/1.6 system-ui, sans-serif;
    }

    header,
    main,
    footer {
      padding-block: 1rem;
    }

    nav ul {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 0;
      list-style: none;
    }

    label {
      display: block;
      margin-block-end: 0.25rem;
      font-weight: 700;
    }

    input,
    button {
      min-height: 2.75rem;
      padding: 0.5rem 0.75rem;
      font: inherit;
    }

    article {
      margin-block: 1rem;
      padding: 1rem;
      border: 1px solid #8b95a7;
      border-radius: 0.5rem;
    }

    :focus-visible {
      outline: 3px solid #6d28d9;
      outline-offset: 3px;
    }

    .skip-link {
      position: fixed;
      inset: 0 auto auto 0;
      z-index: 1000;
      padding: 0.75rem 1rem;
      color: CanvasText;
      background: Canvas;
      transform: translateY(-150%);
    }

    .skip-link:focus-visible {
      transform: translateY(0);
    }

    .help {
      color: #3f4b5f;
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">跳到主要内容</a>

  <header>
    <p><a href="#home">邻里集市</a></p>
    <nav aria-label="主要">
      <ul>
        <li><a href="#search-title">搜索</a></li>
        <li><a href="#results-title">商品</a></li>
      </ul>
    </nav>
  </header>

  <main id="main-content" tabindex="-1">
    <h1 id="home">名称与键盘观察页</h1>

    <section aria-labelledby="search-title">
      <h2 id="search-title">搜索商品</h2>
      <form id="search-form">
        <label for="query">商品关键词</label>
        <p class="help" id="query-help">
          输入“自行车”并提交；本页只更新可见文字，不发送网络请求。
        </p>
        <input
          id="query"
          name="q"
          type="search"
          aria-describedby="query-help"
        >
        <button type="submit">搜索</button>
      </form>
      <p id="search-result">尚未搜索。</p>
    </section>

    <section aria-labelledby="results-title">
      <h2 id="results-title">商品</h2>
      <article aria-labelledby="bike-title">
        <h3 id="bike-title">
          <a href="#bike-description">二手自行车</a>
        </h3>
        <p id="bike-description">适合通勤，页面展示价 280.00 元。</p>
        <p id="favorite-state">当前：未收藏</p>
        <button
          id="favorite-bike"
          type="button"
          aria-pressed="false"
          aria-describedby="favorite-state"
        >
          收藏二手自行车
        </button>
      </article>
    </section>
  </main>

  <footer>
    <p>教学页面：搜索和收藏只保存在当前标签页。</p>
  </footer>

  <script>
    const searchForm = document.querySelector("#search-form");
    const queryInput = document.querySelector("#query");
    const searchResult = document.querySelector("#search-result");
    const favoriteButton = document.querySelector("#favorite-bike");
    const favoriteState = document.querySelector("#favorite-state");

    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = queryInput.value.trim();
      searchResult.textContent = query
        ? `当前可见查询：${query}`
        : "当前可见查询为空。";
    });

    favoriteButton.addEventListener("click", () => {
      const nextPressed =
        favoriteButton.getAttribute("aria-pressed") !== "true";

      favoriteButton.setAttribute("aria-pressed", String(nextPressed));
      favoriteState.textContent = nextPressed
        ? "当前：已收藏"
        : "当前：未收藏";
    });
  </script>
</body>
</html>
```

### 6.4 打开方式

在终端进入练习目录：

```bash
cd market-learning/practice/html-chapter-07
python3 -m http.server 4173
```

浏览器打开：

```text
http://localhost:4173/minimal.html
```

结束时回到终端按 `Ctrl+C`。页面不需要 npm、构建工具或第三方依赖。

如果 4173 端口已被占用，终端会出现地址占用错误。改用：

```bash
python3 -m http.server 4174
```

并打开 `http://localhost:4174/minimal.html`。不要在原服务器未启动时把浏览器的连接失败误判成 HTML 错误。

### 6.5 可见结果与键盘路径

刷新页面，先不要点击鼠标：

1. 按一次 Tab，skip link 应在左上角出现；
2. 按 Enter，URL 片段变为 `#main-content`，主要内容成为片段目标；
3. 继续按 Tab，焦点依次进入主要内容中的链接、搜索框、搜索按钮、商品链接和收藏按钮；
4. 在搜索框输入“自行车”，按 Enter 提交；
5. 页面显示“当前可见查询：自行车”，Network 不应出现业务 API 请求；
6. 到达收藏按钮后按 Space；
7. 可见状态变为“当前：已收藏”，按钮的 `aria-pressed` 变为 `true`；
8. 再按 Enter，状态恢复“当前：未收藏”；
9. 使用 Shift+Tab 反向经过同一组控件；
10. 每个焦点位置都有清楚轮廓。

浏览器或操作系统可能有“Tab 是否遍历所有网页控件”的设置。若 Tab 跳过链接，先检查平台键盘导航设置，再判断页面代码。

### 6.6 Accessibility 树检查

按下表逐项取证，不记录猜测的朗读句子：

| 选中节点 | 预期 role | 预期 name | 其他证据 |
| --- | --- | --- | --- |
| 页面级 `header` | banner（常见映射） | 通常无名称 | 位于 body 级上下文 |
| `nav` | navigation | 主要 | 名称来自 `aria-label` |
| `main` | main | 取决于映射，不要求额外名称 | `tabindex="-1"` |
| 搜索框 | searchbox | 商品关键词 | name 来自 `<label>` |
| 搜索框 | searchbox | 商品关键词 | description 来自 `#query-help` |
| 商品链接 | link | 二手自行车 | 有 `href` |
| 收藏按钮 | button | 收藏二手自行车 | pressed false/true |
| 页面级 `footer` | contentinfo（常见映射） | 通常无名称 | 位于 body 级上下文 |

如果工具显示不同：

1. 先确认选中了正确节点；
2. 展开 Name/Description 来源；
3. 检查 `for`、`id` 和 ARIA IDREF 拼写；
4. 检查是否有另一个高优先级名称源覆盖；
5. 保存并硬刷新；
6. 记录浏览器版本和平台；
7. 在第二个浏览器复核映射差异；
8. 不把工具显示差异直接写成“用户一定听不到”。

在 Console 观察焦点：

```js
document.activeElement
```

预期返回当前获得焦点的元素。激活 skip link 后，应检查目标浏览器中是 `main#main-content` 还是另一个合理目标；若只是滚动而焦点未进入目标，记录为目标组合的失败证据，再按 8.10 节排查。

### 6.7 失败证据

| 现象 | 优先证据 | 常见原因 |
| --- | --- | --- |
| 页面无法打开 | 终端服务器输出、浏览器地址 | 目录或端口错误 |
| 第一 Tab 看不到 skip link | Elements 样式、焦点、裁切 | CSS 选择器错误或被容器裁切 |
| 搜索框没有名称 | Accessibility Name 来源 | `for` 与 `id` 不匹配 |
| 搜索框名称变成长帮助 | Name/Description 来源 | 误用 `aria-labelledby` 代替 `aria-describedby` |
| Space 不能收藏 | 当前焦点、节点标签、Console | 控件不是原生 button 或脚本报错 |
| 状态文字变了，pressed 没变 | Elements 属性 | 脚本只更新可见文字 |
| pressed 变了，文字没变 | Elements 与页面对照 | 脚本只更新 ARIA |
| 焦点轮廓不可见 | Computed styles、截图 | 删除 outline、颜色不足或被裁切 |
| 出现收藏请求 | Network | 案例被误接到真实接口 |

### 6.8 渐进扩展：把片段目标也变成明显证据

在现有 `<style>` 末尾增加：

```css
main:target {
  scroll-margin-block-start: 1rem;
}

main:target::before {
  content: "已跳到主要内容";
  display: block;
  margin-block-end: 0.75rem;
  color: #4c1d95;
  font-weight: 700;
}
```

这段 CSS 只增加视觉上的片段目标提示：

- `:target` 来自 URL fragment；
- 它不等于 `:focus`；
- 伪元素文字不应成为唯一业务信息；
- Accessibility 树是否暴露生成内容存在实现差异，不能用它提供控件名称；
- 关闭 CSS 后，真实 skip link 和主要内容仍然存在。

重新激活 skip link，预期 URL、滚动、焦点和视觉目标都可分别观察。把四项写成四列，避免用“跳转成功”掩盖其中一项失败。

## 7. 邻里集市集成案例

### 7.1 案例范围与可观察契约

现在把最小案例扩展成可搜索商品页：

- 页面级 banner、main、contentinfo；
- “主要”和“商品分类”两个可区分 navigation 地标；
- 一个命名的 search 地标；
- h1、h2、h3 形成标题层级；
- 搜索框、分类 select 和两个原生按钮；
- 三张固定商品卡片；
- 每张卡片有唯一详情链接和收藏切换按钮；
- 收藏名称包含商品标题；
- `aria-pressed` 与可见状态同步；
- 筛选只设置 `hidden`，不重排 DOM；
- 价格在 `data.value` 中保留整数分；
- skip link、可见焦点和自然 Tab 顺序；
- 刷新恢复初始筛选和收藏。

本案例不会：

- 保存真实收藏；
- 查询服务器；
- 证明当前用户身份；
- 创建预约；
- 处理多用户并发；
- 让搜索引擎索引教学数据；
- 自动保证动态结果被屏幕阅读器通知。

动态结果通知、搜索后焦点策略和失败表单焦点属于下一课。

### 7.2 文件位置

创建：

```text
market-learning/
└── practice/
    └── html-chapter-07/
        ├── minimal.html
        └── index.html
```

### 7.3 完整文件：键盘可达的商品查询页

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>查找商品｜邻里集市教学页</title>
  <style>
    * {
      box-sizing: border-box;
    }

    html {
      color-scheme: light;
    }

    body {
      margin: 0;
      color: #172033;
      background: #f8f6f1;
      font: 1rem/1.6 system-ui, sans-serif;
    }

    a {
      color: #4c1d95;
    }

    a:hover {
      text-decoration-thickness: 0.16em;
    }

    :focus-visible {
      outline: 3px solid #6d28d9;
      outline-offset: 3px;
    }

    .skip-link {
      position: fixed;
      inset: 0 auto auto 0;
      z-index: 1000;
      padding: 0.75rem 1rem;
      color: CanvasText;
      background: Canvas;
      transform: translateY(-150%);
    }

    .skip-link:focus-visible {
      transform: translateY(0);
    }

    .site-header,
    .page-shell,
    .site-footer {
      width: min(72rem, calc(100% - 2rem));
      margin-inline: auto;
    }

    .site-header {
      padding-block: 1rem;
      border-block-end: 1px solid #aeb6c4;
    }

    .brand {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
    }

    nav ul {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      padding: 0;
      list-style: none;
    }

    .page-shell {
      display: grid;
      grid-template-columns: minmax(10rem, 16rem) minmax(0, 1fr);
      gap: 2rem;
      padding-block: 2rem;
    }

    .page-shell > h1,
    .page-shell > .page-intro {
      grid-column: 1 / -1;
      margin-block: 0;
    }

    .category-nav {
      align-self: start;
      padding: 1rem;
      background: #fff;
      border: 1px solid #aeb6c4;
      border-radius: 0.75rem;
    }

    .category-nav ul {
      display: grid;
    }

    .content-column {
      min-width: 0;
    }

    search,
    .results {
      display: block;
      margin-block: 1.5rem;
      padding: 1.25rem;
      background: #fff;
      border: 1px solid #aeb6c4;
      border-radius: 0.75rem;
    }

    .filter-grid {
      display: grid;
      grid-template-columns: minmax(12rem, 1fr) minmax(10rem, 14rem);
      gap: 1rem;
      align-items: end;
    }

    label {
      display: block;
      margin-block-end: 0.25rem;
      font-weight: 750;
    }

    input,
    select,
    button {
      min-height: 2.75rem;
      padding: 0.55rem 0.75rem;
      color: inherit;
      background: #fff;
      border: 1px solid #596579;
      border-radius: 0.4rem;
      font: inherit;
    }

    input,
    select {
      width: 100%;
    }

    button {
      cursor: pointer;
      font-weight: 750;
    }

    button[aria-pressed="true"] {
      color: #fff;
      background: #4c1d95;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-block-start: 1rem;
    }

    .help,
    .teaching-boundary {
      color: #3f4b5f;
    }

    .listing-list {
      display: grid;
      gap: 1rem;
      padding: 0;
      list-style: none;
    }

    .listing {
      padding: 1rem;
      border: 1px solid #8b95a7;
      border-radius: 0.6rem;
    }

    .listing h3 {
      margin-block-start: 0;
    }

    .listing-state {
      font-weight: 750;
    }

    [hidden] {
      display: none;
    }

    .site-footer {
      padding-block: 1.5rem 3rem;
      border-block-start: 1px solid #aeb6c4;
    }

    @media (max-width: 44rem) {
      .page-shell,
      .filter-grid {
        grid-template-columns: 1fr;
      }

      .category-nav {
        order: 0;
      }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">跳到主要内容</a>

  <header class="site-header">
    <p class="brand">
      <a href="#page-title">邻里集市</a>
    </p>
    <nav aria-label="主要">
      <ul>
        <li><a href="#filters-title">筛选商品</a></li>
        <li><a href="#results-title">浏览结果</a></li>
        <li><a href="#quality-note">教学边界</a></li>
      </ul>
    </nav>
  </header>

  <main id="main-content" class="page-shell" tabindex="-1">
    <h1 id="page-title">查找邻里商品</h1>
    <p class="page-intro">
      使用关键词和分类筛选固定教学数据；价格的机器值使用整数分。
    </p>

    <nav class="category-nav" aria-labelledby="category-nav-title">
      <h2 id="category-nav-title">商品分类</h2>
      <ul>
        <li><a href="#bike-title">出行</a></li>
        <li><a href="#desk-title">家具</a></li>
        <li><a href="#lamp-title">家居</a></li>
      </ul>
    </nav>

    <div class="content-column">
      <search aria-labelledby="filters-title">
        <h2 id="filters-title">筛选商品</h2>
        <form id="filter-form">
          <div class="filter-grid">
            <div>
              <label for="query">商品关键词</label>
              <p class="help" id="query-help">
                可输入标题或描述中的词，例如“通勤”。
              </p>
              <input
                id="query"
                name="q"
                type="search"
                autocomplete="off"
                aria-describedby="query-help"
              >
            </div>

            <div>
              <label for="category">商品分类</label>
              <select id="category" name="category">
                <option value="">全部分类</option>
                <option value="travel">出行</option>
                <option value="furniture">家具</option>
                <option value="home">家居</option>
              </select>
            </div>
          </div>

          <div class="actions">
            <button type="submit">应用筛选</button>
            <button type="reset">重置筛选</button>
          </div>
        </form>
      </search>

      <section class="results" aria-labelledby="results-title">
        <h2 id="results-title">全部商品（3）</h2>
        <p id="filter-summary">当前没有筛选条件。</p>

        <ul class="listing-list">
          <li>
            <article
              class="listing"
              data-title="二手自行车"
              data-description="蓝色 通勤 变速"
              data-category="travel"
              aria-labelledby="bike-title"
            >
              <h3 id="bike-title">
                <a href="#bike-description">二手自行车</a>
              </h3>
              <p id="bike-description">
                蓝色变速自行车，适合短途通勤。
              </p>
              <p>
                价格：
                <data value="28000">280.00 元</data>
              </p>
              <p class="listing-state" id="bike-favorite-state">
                收藏状态：未收藏
              </p>
              <button
                type="button"
                class="favorite-button"
                data-listing-id="bike-001"
                aria-pressed="false"
                aria-describedby="bike-favorite-state"
              >
                收藏二手自行车
              </button>
            </article>
          </li>

          <li>
            <article
              class="listing"
              data-title="折叠学习桌"
              data-description="木色 小户型 桌面"
              data-category="furniture"
              aria-labelledby="desk-title"
            >
              <h3 id="desk-title">
                <a href="#desk-description">折叠学习桌</a>
              </h3>
              <p id="desk-description">
                木色桌面，可折叠收纳，适合小户型。
              </p>
              <p>
                价格：
                <data value="15900">159.00 元</data>
              </p>
              <p class="listing-state" id="desk-favorite-state">
                收藏状态：未收藏
              </p>
              <button
                type="button"
                class="favorite-button"
                data-listing-id="desk-002"
                aria-pressed="false"
                aria-describedby="desk-favorite-state"
              >
                收藏折叠学习桌
              </button>
            </article>
          </li>

          <li>
            <article
              class="listing"
              data-title="阅读台灯"
              data-description="暖光 桌面 灯具"
              data-category="home"
              aria-labelledby="lamp-title"
            >
              <h3 id="lamp-title">
                <a href="#lamp-description">阅读台灯</a>
              </h3>
              <p id="lamp-description">
                暖光桌面台灯，亮度使用实体旋钮调节。
              </p>
              <p>
                价格：
                <data value="6800">68.00 元</data>
              </p>
              <p class="listing-state" id="lamp-favorite-state">
                收藏状态：未收藏
              </p>
              <button
                type="button"
                class="favorite-button"
                data-listing-id="lamp-003"
                aria-pressed="false"
                aria-describedby="lamp-favorite-state"
              >
                收藏阅读台灯
              </button>
            </article>
          </li>
        </ul>
      </section>

      <aside id="quality-note" aria-labelledby="quality-title">
        <h2 id="quality-title">教学边界</h2>
        <p class="teaching-boundary">
          筛选和收藏只存在当前标签页内存中。刷新页面会恢复三件商品和未收藏状态；
          本页没有登录、授权、数据库、支付或并发控制。
        </p>
      </aside>
    </div>
  </main>

  <footer class="site-footer">
    <p>
      <a href="#page-title">返回页首主题</a>
    </p>
  </footer>

  <script>
    const filterForm = document.querySelector("#filter-form");
    const queryInput = document.querySelector("#query");
    const categorySelect = document.querySelector("#category");
    const resultsTitle = document.querySelector("#results-title");
    const filterSummary = document.querySelector("#filter-summary");
    const listings = Array.from(document.querySelectorAll(".listing"));
    const favoriteButtons = document.querySelectorAll(".favorite-button");

    function normalized(value) {
      return value.trim().toLocaleLowerCase("zh-CN");
    }

    function applyFilters() {
      const query = normalized(queryInput.value);
      const category = categorySelect.value;
      let visibleCount = 0;

      for (const listing of listings) {
        const searchableText = normalized(
          `${listing.dataset.title} ${listing.dataset.description}`
        );
        const matchesQuery =
          query === "" || searchableText.includes(query);
        const matchesCategory =
          category === "" || listing.dataset.category === category;
        const visible = matchesQuery && matchesCategory;

        listing.closest("li").hidden = !visible;
        if (visible) {
          visibleCount += 1;
        }
      }

      resultsTitle.textContent = `筛选结果（${visibleCount}）`;

      const parts = [];
      if (query !== "") {
        parts.push(`关键词“${queryInput.value.trim()}”`);
      }
      if (category !== "") {
        const selectedText =
          categorySelect.options[categorySelect.selectedIndex].textContent;
        parts.push(`分类“${selectedText}”`);
      }

      filterSummary.textContent = parts.length === 0
        ? "当前没有筛选条件。"
        : `当前条件：${parts.join("，")}。`;
    }

    filterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      applyFilters();
    });

    filterForm.addEventListener("reset", () => {
      requestAnimationFrame(applyFilters);
    });

    for (const button of favoriteButtons) {
      button.addEventListener("click", () => {
        const nextPressed =
          button.getAttribute("aria-pressed") !== "true";
        const listing = button.closest(".listing");
        const state = listing.querySelector(".listing-state");

        button.setAttribute("aria-pressed", String(nextPressed));
        state.textContent = nextPressed
          ? "收藏状态：已收藏"
          : "收藏状态：未收藏";
      });
    }
  </script>
</body>
</html>
```

### 7.4 打开、停止与重置

若 6.4 节的服务器仍在运行，直接打开：

```text
http://localhost:4173/index.html
```

否则：

```bash
cd market-learning/practice/html-chapter-07
python3 -m http.server 4173
```

停止服务器：终端按 `Ctrl+C`。

重置教学状态：刷新页面。预期：

- 显示三件商品；
- 查询为空；
- 分类为“全部分类”；
- 三个收藏按钮均为 `aria-pressed="false"`；
- 三处可见状态均为“未收藏”；
- 不从 localStorage、Cookie 或网络恢复任何收藏。

### 7.5 键盘专用商品路径

关闭 DevTools 的元素选取模式，避免它夺取键盘。刷新后不使用鼠标：

1. **Tab → Enter**：显示并激活“跳到主要内容”；
2. 检查 URL 为 `#main-content`，焦点目标位于主要内容；
3. 使用 Shift+Tab 回到前面的导航，确认可以反向恢复；
4. Tab 到“商品关键词”，输入“通勤”；
5. Tab 到分类，使用原生 select 的平台键盘方式保持“全部分类”；
6. Tab 到“应用筛选”，按 Enter；
7. 页面只显示“二手自行车”，结果标题为“筛选结果（1）”；
8. 继续 Tab 到“二手自行车”详情链接，按 Enter；
9. URL 片段变成 `#bike-description`，页面滚到描述；
10. Shift+Tab 回到详情链接，再 Tab 到“收藏二手自行车”；
11. 按 Space，按钮 pressed 变为 true，可见状态变成“已收藏”；
12. 按 Enter，pressed 恢复 false，可见状态恢复“未收藏”；
13. Shift+Tab 回到筛选区域，激活“重置筛选”；
14. 三件商品重新出现；
15. Tab 或 Shift+Tab 到“商品分类”导航中的链接，激活其中一项；
16. 最后激活 footer 的“返回页首主题”。

每一步记录：

```text
步骤：
按键：
焦点前：
焦点后：
URL/属性变化：
可见结果：
是否出现意外滚动或焦点丢失：
```

注意：

- 原生 select 的展开和选项移动按键受平台影响，不在教材中保证同一组合；
- 点击卡片内部片段链接主要演示链接导航，不等于完整详情页；
- 搜索结果更新目前只有可见文字，没有 live region；
- 不写“屏幕阅读器一定朗读 1 个结果”；下一课将增加动态状态策略并记录目标组合差异。

### 7.6 地标、标题和名称人工清单

在完整 Accessibility Tree 中检查：

**地标：**

- banner：页面级 header；
- navigation “主要”；
- navigation “商品分类”；
- main；
- search “筛选商品”；
- complementary “教学边界”；
- contentinfo：页面级 footer。

工具可能以不同本地化词显示角色，但两个 navigation 的计算名称必须可区分。

**标题：**

```text
h1 查找邻里商品
  h2 商品分类
  h2 筛选商品
  h2 全部商品（3）/筛选结果（n）
    h3 二手自行车
    h3 折叠学习桌
    h3 阅读台灯
  h2 教学边界
```

`商品分类` 在 DOM 中位于 main 之前的侧栏，但仍是页面二级主题。小屏 CSS 没有把 DOM 反向，因此视觉、阅读和焦点顺序仍一致。

**名称和状态：**

| 控件 | 名称 | 描述 | 状态 |
| --- | --- | --- | --- |
| 查询框 | 商品关键词 | 输入提示 | 当前 value |
| 分类 select | 商品分类 | 无额外描述 | 当前选择值 |
| 应用按钮 | 应用筛选 | 无 | button |
| 重置按钮 | 重置筛选 | 无 | button |
| 第一详情链接 | 二手自行车 | 无 | link |
| 第一收藏按钮 | 收藏二手自行车 | 收藏状态可见文本 | pressed false/true |

### 7.7 渐进扩展：新增商品不重写焦点编号

复制一个 `<li>` 商品，并为它提供唯一：

- article `data-title`、`data-description`、`data-category`；
- article `aria-labelledby`；
- h3 `id`；
- 描述 `id`；
- 状态 `id`；
- 收藏按钮 `data-listing-id` 和 `aria-describedby`；
- 可见详情与收藏文字。

不要添加任何正数 `tabindex`。刷新后，新商品自然按 DOM 位置加入：

- 标题层级；
- 链接浏览；
- Tab 顺序；
- 筛选集合；
- 收藏事件绑定。

这就是自然顺序的扩展价值。若原页面使用 1–12 的正数 tabindex，新增商品至少要重编号后续控件，两个独立组件还可能产生重复数值。

### 7.8 业务边界

页面中的：

```html
<data value="28000">280.00 元</data>
```

表达课程约定的整数分机器值与用户可读显示。它不是结算价格，也不阻止用户修改 DOM。真实商品价格、收藏归属和可售状态必须来自经过认证、授权和验证的服务端。

`aria-pressed="true"` 只表达当前按钮的界面状态：

- 不是收藏 API 成功证据；
- 不是数据库记录；
- 不是跨标签页同步；
- 不是当前用户身份；
- 不是权限检查。

后续接入 API 时，应在服务端成功响应后同步界面；失败则恢复或重新获取权威状态，并用下一课的动态状态模式通知用户。

## 8. 常见错误与排查路径

### 8.1 明确错误：`aria-label` 与可见按钮文字冲突

制造故障：

```html
<button type="button" aria-label="删除商品">收藏商品</button>
```

| 阶段 | 记录 |
| --- | --- |
| 现象 | 视觉写“收藏商品”，可访问名称却可能是“删除商品” |
| 证据 | Elements 选中按钮，Accessibility Name 来源指向 `aria-label` |
| 原因 | 高优先级作者名称覆盖按钮内容 |
| 影响 | 语音控制、读屏、自动化和视觉协助者使用不同名称 |
| 修复 | 删除不必要的 `aria-label`，保留 `<button>收藏商品</button>` |
| 复验 | Name 来自 contents，计算名称与可见文字一致 |

不要用第二个 `aria-label="收藏商品"` 把错误“改对”。如果可见文字已经足够，删除冗余名称源更稳健。

### 8.2 明确错误：把 `div` 补成半成品按钮

制造故障：

```html
<div
  class="favorite"
  role="button"
  tabindex="0"
  onclick="this.classList.toggle('selected')"
>
  收藏
</div>
```

现象：

- Tab 可以到达；
- 鼠标点击可能切换 class；
- Enter/Space 不一定触发 onclick；
- 没有 pressed 状态；
- 没有原生 disabled；
- Space 可能滚动页面；
- 表单与高对比模式行为需要继续手工补齐。

修复不是继续堆 keydown：

```html
<button type="button" aria-pressed="false">收藏二手自行车</button>
```

```js
const button = document.querySelector("button[aria-pressed]");

button.addEventListener("click", () => {
  const next = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(next));
});
```

复验：

- role 来自原生 button；
- Tab 到达；
- Enter 与 Space 都触发 click；
- pressed 与真实状态同步；
- 不需要自造 keydown/keyup 组合。

只有在确实没有原生元素能表达复杂复合控件时，才根据对应模式完整实现角色、属性、焦点和键盘交互。

### 8.3 明确错误：重复的 navigation 名称

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

### 8.4 明确错误：用正数 tabindex 修补布局

制造故障：

```html
<button tabindex="3">应用筛选</button>
<input tabindex="1" aria-label="商品关键词">
<select tabindex="2" aria-label="商品分类"></select>
```

诊断：

1. 在 Console 运行 `document.querySelectorAll("[tabindex]")`；
2. 检查是否存在大于 0 的值；
3. 只用 Tab 记录实际顺序；
4. 与 DOM、视觉和任务顺序对照；
5. 在按钮前插入一个新链接，观察它进入顺序的位置。

修复：

- 把 DOM 排成 label/input、label/select、button；
- 删除三个正数 tabindex；
- 保留原生控件自然焦点；
- 响应式 CSS 不反转任务顺序。

复验：新链接按 DOM 位置自然加入，不需重编号。

### 8.5 删除轮廓后焦点“消失”

错误：

```css
button:focus,
a:focus,
input:focus {
  outline: none;
}
```

排查：

- 按 Tab，观察页面是否仍有任何位置指示；
- DevTools 强制 `:focus` / `:focus-visible`；
- 检查 Computed 中 `outline-style`；
- 检查 box-shadow 是否被 overflow 裁切；
- 检查高对比模式。

修复：

```css
:focus-visible {
  outline: 3px solid #6d28d9;
  outline-offset: 3px;
}
```

复验不只看颜色：还要检查轮廓不被固定页头、容器边界和窄屏裁掉。

### 8.6 链接和按钮职责互换

错误：

```html
<a href="#" onclick="toggleFavorite()">收藏</a>
<button type="button" onclick="location.href='/listings/1'">查看详情</button>
```

证据：

- 第一项产生无意义 `#` 历史/滚动副作用；
- 第二项没有链接 URL 语义、复制地址和常见链接上下文菜单；
- Accessibility 树角色与任务相反。

修复：

```html
<button type="button">收藏二手自行车</button>
<a href="/listings/1">查看二手自行车详情</a>
```

### 8.7 `aria-labelledby` 引用丢失或重复 ID

错误：

```html
<h2 id="result-title">搜索结果</h2>
<section aria-labelledby="results-title">...</section>
```

属性引用的是 `results-title`，实际 id 是 `result-title`。

排查：

```js
const region = document.querySelector("section[aria-labelledby]");
const ids = region.getAttribute("aria-labelledby").split(/\s+/);
ids.map((id) => [id, document.getElementById(id)]);
```

预期每个 ID 对应唯一元素。修复拼写后，在 Accessibility 面板确认 Name 来源，不要只看到 Console 返回节点就结束。

重复 ID 也会让引用落到错误节点。HTML 校验和 `document.querySelectorAll("#results-title").length` 可以提供证据。

### 8.8 把帮助文字误当名称

错误：

```html
<p id="query-help">输入商品标题，最多 40 个字符。</p>
<input type="search" aria-labelledby="query-help">
```

此时控件名称可能变成整段帮助，却没有稳定的“商品关键词”标签。

修复：

```html
<label for="query-fixed">商品关键词</label>
<p id="query-help-fixed">输入商品标题，最多 40 个字符。</p>
<input
  id="query-fixed"
  type="search"
  aria-describedby="query-help-fixed"
>
```

复验：

```text
name: 商品关键词
description: 输入商品标题，最多 40 个字符。
```

仍不保证某个屏幕阅读器以固定顺序朗读两者。

### 8.9 可见状态与 ARIA 状态失步

故障 A：

```js
stateText.textContent = "收藏状态：已收藏";
```

只改可见文字，`aria-pressed` 仍为 false。

故障 B：

```js
button.setAttribute("aria-pressed", "true");
```

只改 ARIA，视觉仍写“未收藏”。

修复：在同一状态转换函数中更新两者，并用一个布尔值生成输出。复验时同时检查：

- 页面文字；
- Elements 属性；
- Accessibility state；
- 再次激活后的逆向状态；
- 刷新后的教学初始状态。

### 8.10 skip link 只滚动，没有可靠焦点

症状：按 Enter 后视口移动，但继续 Tab 又回到页头导航。

排查：

1. 确认链接是真实 `<a href="#main-content">`；
2. 确认目标 `id="main-content"` 唯一；
3. 确认 main 有 `tabindex="-1"`；
4. 激活后检查 `location.hash`；
5. 在 Console 检查 `document.activeElement`；
6. 记录浏览器、版本、平台和键盘设置；
7. 检查是否有脚本拦截 click；
8. 检查固定页头是否只是遮住目标。

如果目标浏览器仍不移动焦点，可做保留原生链接的渐进增强：

```js
const skipLink = document.querySelector(".skip-link");
const main = document.querySelector("#main-content");

skipLink.addEventListener("click", () => {
  requestAnimationFrame(() => {
    main.focus({ preventScroll: true });
  });
});
```

这个脚本不能替代 `href`、id 和可聚焦目标。`preventScroll: true` 是为了保留原生片段滚动结果；必须在目标浏览器复验，避免脚本与默认滚动竞争。

### 8.11 CSS 视觉顺序与 DOM 顺序冲突

症状：视觉上分类在搜索后，Tab 却先进入分类；或商品视觉为 3、1、2，标题浏览仍是 1、2、3。

证据：

- Elements 查看 DOM；
- Layout/Computed 查看 `order`、grid area 和绝对定位；
- 键盘记录 Tab 顺序；
- Accessibility Tree 查看节点顺序。

修复优先级：

1. 让 DOM 符合阅读和任务顺序；
2. 让视觉布局遵循同一顺序；
3. 不使用正数 tabindex 对冲 CSS；
4. 若响应式设计要求不同，重新设计内容结构而不是简单反转。

### 8.12 地标过多

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

### 8.13 标准诊断与恢复记录

每个故障用同一模板：

```text
文件：
浏览器与版本：
复现按键：
现象：
DOM/属性证据：
Accessibility role/name/description/state：
document.activeElement：
Console：
Network：
根因：
最小修复：
修复后复验：
未验证组合：
```

“改完看起来正常”不是恢复证据。至少保留故障前和修复后的名称来源、焦点路径或状态属性对照。

## 9. 课后题

### 9.1 为什么 Accessibility 树不能当作 DOM 的完整副本？

<details>
<summary>参考答案</summary>

两者服务对象不同。DOM 保存解析后的节点、属性和文本关系；可访问树面向平台辅助 API，暴露角色、名称、描述、状态和值。纯布局容器可能被省略，不呈现内容通常不暴露，原生元素会映射成平台角色。浏览器和平台也可能有实现细节差异。因此调试要同时看源码、DOM、Accessibility 计算和真实交互。
</details>

### 9.2 一个按钮同时有可见文字、`aria-label` 和 `aria-labelledby`，先检查哪一个名称来源？

<details>
<summary>参考答案</summary>

在允许作者命名且引用有效的常见按钮场景中，先检查 `aria-labelledby`，再检查 `aria-label`，然后才是按钮内容。实际结果应以浏览器 Accessibility 面板显示的计算来源为证据。最小修复通常是删除不必要的高优先级来源，让清楚的可见文字成为名称。
</details>

### 9.3 placeholder 为什么不能替代 label？

<details>
<summary>参考答案</summary>

placeholder 在输入后消失，通常对比度和展示行为也不同；它更适合示例或格式提示。控件需要持续可见、可点击且稳定关联的名称，因此应使用 `<label>`。提示再用 `aria-describedby` 关联。
</details>

### 9.4 两个 nav 都没有名称一定错误吗？

<details>
<summary>参考答案</summary>

页面只有一个 nav 时，角色本身可能足以定位；有多个同类型 navigation 地标时，应提供可区分名称。名称要说明业务范围，如“主要”“商品分类”，而不是“导航 1”“导航 2”。
</details>

### 9.5 为什么 `role="button"` 没有让 div 获得完整按钮行为？

<details>
<summary>参考答案</summary>

role 主要影响语义映射，不会自动加入焦点顺序、实现 Enter/Space、disabled、表单行为或原生样式。已有 `<button>` 时应直接替换；只有复杂组件确无原生替代时，才完整实现键盘和状态模型。
</details>

### 9.6 链接和按钮怎样选择？

<details>
<summary>参考答案</summary>

导航到 URL、下载资源或片段使用带 `href` 的链接；改变当前页面状态、打开控件或提交表单使用按钮。不要按视觉外观选择，二者都可以用 CSS 调整外观。
</details>

### 9.7 `tabindex="-1"` 与 `hidden` 有何不同？

<details>
<summary>参考答案</summary>

`tabindex="-1"` 让元素退出普通 Tab 顺序，但仍可呈现、可被程序化聚焦，也可能被辅助技术浏览。`hidden` 表示内容当前不呈现，通常也不在可访问树和键盘路径中。两者不能互相替代。
</details>

### 9.8 为什么不使用 `tabindex="1"` 把搜索框放到最前？

<details>
<summary>参考答案</summary>

正数 tabindex 会建立独立于 DOM 的优先顺序，并跨组件冲突。新增控件、响应式布局和复用组件都要重编号。应把 DOM 按任务顺序排列，并使用 skip link 跳过重复导航。
</details>

### 9.9 `:target` 能证明焦点已经移动吗？

<details>
<summary>参考答案</summary>

不能。`:target` 表示 URL fragment 指向该元素，焦点由另一套机制决定。应分别检查 URL、滚动位置、`:target` 样式和 `document.activeElement`。
</details>

### 9.10 `aria-describedby` 是否保证帮助文字会在每次聚焦时完整朗读？

<details>
<summary>参考答案</summary>

不保证。它建立可访问描述关系，浏览器会映射给平台辅助 API；最终呈现受屏幕阅读器、浏览器、语言、详细程度设置和交互模式影响。教材只断言计算描述和引用关系，具体输出需在目标组合实测。
</details>

### 9.11 `aria-pressed` 能保存收藏吗？

<details>
<summary>参考答案</summary>

不能。它只表达切换按钮当前的可访问状态。真实收藏还需要用户身份、授权、服务端写入、错误恢复和持久化。本课刷新即重置。
</details>

### 9.12 自动扫描零错误是否代表键盘路径通过？

<details>
<summary>参考答案</summary>

不代表。自动工具难以判断业务名称是否准确、焦点顺序是否符合任务、焦点是否被遮挡、交互是否能完整完成。仍需键盘实走、Accessibility 树检查和目标辅助技术人工测试。
</details>

## 10. 实践练习

### 10.1 基础练习：建立名称来源表

**文件：**

```text
market-learning/practice/html-chapter-07/name-sources.html
market-learning/practice/html-chapter-07/evidence/name-sources.md
```

**任务：**

创建包含以下对象的完整 HTML：

1. 有 `<label>` 的搜索框；
2. 有可见文字的 button；
3. 有 `href` 和具体文字的 link；
4. 有 `alt` 的信息图片，图片可使用你有权使用的真实本地资源；
5. 由可见 h2 通过 `aria-labelledby` 命名的 section；
6. 由 `legend` 命名的 checkbox 分组；
7. 使用 `aria-describedby` 的输入提示。

**运行：**

```bash
cd market-learning/practice/html-chapter-07
python3 -m http.server 4173
```

**证据：**

对每个对象记录：

```text
DOM 元素：
role：
name：
name 来源：
description：
state/value：
```

**预期：**

- 每个交互控件有准确名称；
- 可见标签与 name 一致；
- 帮助文字进入 description，不替代 name；
- 图片替代文本取决于真实图片目的；
- 没有为已有原生角色重复写 role。

**失败观察：**

- Computed Name 为空；
- Name 来源意外指向 `aria-label` 或 title；
- IDREF 无目标；
- 重复 id；
- 图片资源 404 与 alt 设计混为一谈。

**答案标准：**

名称来源表能从开发者工具复验；删掉任一名称源后，学习者能预测并观察下一级来源，而不是只写定义。

### 10.2 进阶练习：扩展键盘商品路径

**文件：**

```text
market-learning/practice/html-chapter-07/index.html
market-learning/practice/html-chapter-07/evidence/keyboard-path.md
```

**任务：**

在第 7 节页面增加第四件商品“儿童滑板车”：

- 分类为出行；
- 机器价格为整数分 `9900`；
- 标题和描述 ID 唯一；
- 详情链接名称具体；
- 收藏按钮可见文字包含商品标题；
- 收藏状态可见且由 `aria-describedby` 关联；
- 不写正数 tabindex；
- 使用现有脚本自然加入筛选和收藏。

再增加一个位于结果区末尾的“返回筛选条件”片段链接。

**键盘验收：**

1. skip link 进入 main；
2. 搜索“滑板”；
3. 提交后只显示滑板车；
4. Tab 到详情链接和收藏按钮；
5. Space/Enter 切换收藏；
6. 激活“返回筛选条件”；
7. Shift+Tab 能回到合理的前一控件；
8. 全程焦点可见。

**预期：**

- 新商品无需 tabindex 编号；
- 标题层级仍为 h3；
- 结果计数变为 4 或筛选后的正确数量；
- 刷新恢复未收藏；
- Network 没有收藏 API；
- `data value="9900"`，显示 `99.00 元`。

**答案标准：**

代码、实际按键表、Accessibility 名称/状态截图或文字记录三者一致。不能只提交视觉截图。

### 10.3 故障注入：名称覆盖与重复地标

**文件：**

```text
market-learning/practice/html-chapter-07/fault-name-landmark.html
market-learning/practice/html-chapter-07/evidence/fault-name-landmark.md
```

**注入：**

1. 给“收藏二手自行车”增加 `aria-label="删除二手自行车"`；
2. 把两个 nav 都改为 `aria-label="商品"`；
3. 把查询框 `label for` 改成不存在的 id；
4. 保留页面其他部分不变。

**要求：**

按“现象 → Accessibility 证据 → 根因 → 最小修复 → 复验”记录三项。修复时：

- 删除冲突 aria-label；
- 给地标恢复业务唯一名称；
- 修复 label/id 关联；
- 不新增 title 作为补丁；
- 不使用屏幕阅读器固定朗读句子作为唯一证据。

**完成标准：**

修复前后都记录 Computed Name 来源；地标树中两个 navigation 可区分；输入框名称来自 label。

### 10.4 故障注入：伪按钮、正数 tabindex 与消失焦点

**文件：**

```text
market-learning/practice/html-chapter-07/fault-keyboard.html
market-learning/practice/html-chapter-07/evidence/fault-keyboard.md
```

**注入：**

1. 把一个收藏 button 改成带 onclick 的 div；
2. 给筛选区三个控件写 1、2、3 的正数 tabindex；
3. 添加 `*:focus { outline: none; }`；
4. 用 CSS `order` 把重置按钮视觉移到提交按钮前。

**运行与观察：**

- 只用键盘执行筛选和收藏；
- 每按一次 Tab 记录 `document.activeElement`；
- 尝试 Enter 和 Space；
- 对照视觉顺序、DOM 顺序和 Tab 顺序；
- 检查焦点是否可见。

**修复答案：**

- 用原生 `<button type="button">` 替换 div；
- 监听 click，不手写重复的 Enter/Space 分支；
- 删除所有正数 tabindex；
- 调整 DOM 使按钮顺序与任务一致；
- 删除视觉反转；
- 恢复明确的 `:focus-visible` 轮廓。

**完成标准：**

修复后 Tab 与 DOM/视觉任务顺序一致；Enter/Space 可激活按钮；焦点始终可见；新增一个链接不需要重编号。

### 10.5 手工测试练习：区分四类证据

**文件：**

```text
market-learning/practice/html-chapter-07/evidence/manual-a11y-report.md
```

报告必须分开：

1. HTML/ARIA 静态检查；
2. 浏览器 Accessibility 树；
3. 键盘人工路径；
4. 目标屏幕阅读器/浏览器组合，若未测试则明确写未测试。

**参考报告骨架：**

```text
# 无障碍人工检查

## 环境
- 操作系统：
- 浏览器与版本：
- 键盘设置：
- 辅助技术：

## 静态结构
- 重复 ID：
- 正数 tabindex：
- 无名称控件：

## Accessibility 树
- 地标：
- 标题：
- 名称来源：
- 描述：
- 状态：

## 键盘路径
- 正向：
- 反向：
- Enter：
- Space：
- skip link：
- 可见焦点：

## 未验证
- 组合：
- 原因：
- 剩余风险：
```

**答案标准：**

报告不把一种证据扩大成全部合规结论，不保证精确朗读，不隐藏未测平台。

## 11. 阶段验收

### A11Y-001：原生角色、地标和标题导航

- [ ] 页面使用适合职责的 header、nav、main、search、aside、footer；
- [ ] 页面只有一个当前可见的主要 main；
- [ ] 两个 navigation 的名称可区分；
- [ ] h1、h2、h3 层级可以解释；
- [ ] 没有用字号或 `role="heading"` 替代可用的原生标题；
- [ ] Accessibility 树记录 role 和 name；
- [ ] 没有把每个 section 都制造成 region。

### A11Y-002：可访问名称来源

- [ ] 每个输入有可见 label；
- [ ] 每个按钮和链接名称具体；
- [ ] 商品收藏按钮名称包含商品标题；
- [ ] 能指出名称来自 label、contents、alt、legend 或 aria-labelledby；
- [ ] 不依赖 placeholder/title 作为主要标签；
- [ ] ARIA IDREF 唯一且存在；
- [ ] 已检查高优先级名称源是否意外覆盖。

### A11Y-003：描述、状态和可见标签一致性

- [ ] 帮助文字用 `aria-describedby` 关联；
- [ ] 名称没有塞入整段说明；
- [ ] `aria-pressed` 与可见收藏状态同步；
- [ ] 可见标签包含在计算名称中；
- [ ] 原生 checked/disabled/open 等状态没有被冗余 ARIA 复制；
- [ ] 不保证某款屏幕阅读器的固定朗读句子。

### A11Y-004：键盘激活、焦点顺序和焦点可见

- [ ] 链接用于导航，按钮用于动作；
- [ ] Enter 可提交筛选和激活链接；
- [ ] Enter/Space 可激活原生收藏按钮；
- [ ] Tab 和 Shift+Tab 都走过完整主路径；
- [ ] 顺序与 DOM、视觉和任务一致；
- [ ] 每一步焦点都可见；
- [ ] 焦点不被裁切或固定内容遮挡；
- [ ] 未使用鼠标完成键盘证据。

### A11Y-005：skip link 与 tabindex 边界

- [ ] 页面第一个 Tab 可显示 skip link；
- [ ] skip link 使用真实 fragment href；
- [ ] 目标 id 唯一；
- [ ] 目标使用 `tabindex="-1"`，不污染自然 Tab 顺序；
- [ ] 分别记录 URL、滚动、`:target` 和 activeElement；
- [ ] 没有正数 tabindex；
- [ ] 没有把所有静态内容加入 Tab 顺序。

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

### Q1：所有元素都需要 aria-label 吗？

不需要。大多数交互元素应从可见 label、按钮内容、链接内容、alt 或 legend 获得名称。无差别添加 aria-label 容易覆盖正确文字并制造翻译负担。

### Q2：`aria-labelledby` 一定比 `<label>` 更好吗？

不是。普通表单控件首选 `<label>`，它还提供点击标签聚焦等原生行为。`aria-labelledby` 适合组合多个现有文本或命名区域，不是替换全部原生标签的升级版。

### Q3：可以把可访问名称藏起来，只留图标吗？

有些紧凑控件确实需要图标和 `aria-label`，但先判断可见文字是否更易理解。图标含义并不总是普遍，语音控制还需要可说出的标签。重要动作通常保留可见文字更稳健。

### Q4：`aria-describedby` 引用隐藏内容可以吗？

规范算法对被引用节点有专门规则，但工程上应优先让重要帮助和错误对所有用户可见。不要用隐藏长文补救视觉界面缺少说明；还要在目标浏览器与辅助技术组合检查实际映射。

### Q5：一个页面只能有一个 nav 吗？

可以有多个，例如主要导航、商品分类和页脚政策链接。多个同类型地标应有可区分名称，且每个都应代表真正的导航集合。

### Q6：一个页面必须只有一个 h1 吗？

HTML 语法允许更复杂情况，但普通页面采用一个代表页面主题的 h1，配合明确 h2/h3 层级，最容易维护和测试。不要依赖 section 自动重置标题层级。

### Q7：main 为什么写 `tabindex="-1"`？

为了让 skip link 或脚本可以把焦点放到主要内容容器，同时不让 main 出现在每次自然 Tab 路径中。它不是让 main 变成按钮。

### Q8：为什么 skip link 平时要隐藏？

它用于跳过重复内容，通常在键盘焦点到达时显示，避免占据持续视觉空间。隐藏方式不能使用 `display: none` 或 `visibility: hidden`，否则它无法获得焦点。

### Q9：`:focus` 和 `:focus-visible` 应该选哪个？

保留浏览器默认焦点是基线。自定义时，`:focus-visible` 常用于明显的键盘式焦点提示；某些控件和用户设置即使鼠标操作也可能匹配。不要用它作为删除所有 `:focus` 可见反馈的借口。

### Q10：能否用 CSS `order` 改移动端 Tab 顺序？

不能可靠做到。CSS order 主要改变视觉布局，DOM 阅读和顺序焦点仍基于文档结构。应让 DOM 顺序本身符合任务，再设计不反转含义的响应式布局。

### Q11：`aria-disabled="true"` 与 `disabled` 相同吗？

不同。原生 `disabled` 会改变控件可操作性、焦点和表单行为；`aria-disabled` 主要表达语义，不自动阻止事件。原生控件能使用 disabled 时优先使用它。

### Q12：为什么按钮名称不随“已收藏”改成“取消收藏”？

本课选择稳定标签 + `aria-pressed` 的切换按钮模式，并用可见文字显示状态。也可以设计成动作标签“收藏/取消收藏”并不使用 pressed；关键是模式一致，不让名称、状态和可见文字互相矛盾。

### Q13：Accessibility 面板正常，是否还要测试屏幕阅读器？

要。面板证明浏览器计算和映射输入，不能覆盖辅助技术的导航模式、设置、浏览器组合和用户实际任务。至少测试项目声明支持的组合；没测就明确写未测。

### Q14：为什么本课不写具体屏幕阅读器朗读结果？

朗读会受屏幕阅读器、浏览器、平台 API、语言、标点和详细程度设置影响。教材给出可访问树的可复验期望，并要求项目记录目标组合实测，不虚构普遍输出。

### Q15：搜索结果变化为什么没有 `aria-live`？

这是课程分层：本课聚焦静态语义、名称和键盘基础。下一课专门处理 status、alert、live region、`aria-busy`、结果更新与焦点策略，避免在尚未解释通知模型时偷偷加入。

### Q16：可以用 ARIA 修复所有第三方组件吗？

不能。若组件 DOM 顺序、键盘事件、焦点管理或业务状态错误，只加 ARIA 不会修复行为。应先判断能否替换为原生控件或修复组件实现，再补必要语义。

### Q17：自动化测试应按 role/name 查询吗？

这通常比 class 或 DOM 层级更接近用户，但前提是 role/name 本身准确。测试通过不能证明文案合理、键盘顺序完整或目标辅助技术可用；仍需人工证据。

### Q18：收藏按钮需要把商品描述都放进名称吗？

不需要。名称应短而具体，例如“收藏二手自行车”。价格、教学状态和补充条件属于可见内容或 description。超长名称会降低按钮列表的可扫描性。

### Q19：为什么不让每张商品卡片都成为 region？

当列表已有结果标题、每张卡片有 h3 和 article 语义时，再给每张卡片制造 region 可能增加地标噪声。应让地标服务大区域，让标题和 article 服务条目结构。

### Q20：本页能算符合 WCAG 吗？

不能仅凭本课案例作出完整合规声明。WCAG 评估涉及全部适用成功标准、完整流程、内容、平台和人工判断。本课只覆盖 A11Y-001–006，并明确后续动态状态、媒体替代、缩放、颜色和其他标准仍待验证。

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

我能从原生元素建立角色和键盘行为，用地标与标题组织页面，用可见标签、`aria-labelledby`、`aria-describedby` 和必要状态形成可检查的名称模型。我也能通过 Accessibility 树、`document.activeElement` 和键盘路径发现名称覆盖、伪按钮、重复地标、焦点顺序及轮廓问题，并说明 ARIA 无法代替行为、业务状态和服务端边界。

下一课将在这条静态语义与键盘基线上增加动态搜索结果、错误汇总、live region、`aria-busy`、首个无效控件、dialog 焦点恢复和媒体替代。

## 单元导航

- [返回第七章入口](../07-accessibility-seo.md)
- [下一课：动态状态、焦点与媒体替代](02-dynamic-status-focus-media.md)
- [上一章：原生交互、DOM 与事件](../06-interactive-dom.md)
- [返回 HTML 模块](../README.md)
