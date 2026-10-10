# 过时特性、历史兼容与迁移：把“还能显示”改成可维护页面

> 所属章节：元素参考、历史与迁移
>
> 建议学习时间：6–8 小时
>
> 阶段成果：完成一份“邻里集市”旧商品页的迁移报告和现代静态页面

## 任务卡

你接手了一份十多年前的商品页。它在部分浏览器里仍能显示，但源代码混合了 `font`、`center`、`frameset`、`marquee`、表格呈现属性和旧脚本声明。产品同学问：“既然浏览器能打开，为什么还要迁移？”

这不是简单的标签替换题。迁移需要同时回答三类问题：

1. 旧代码当时试图完成什么内容、布局或交互任务；
2. 浏览器为何仍保留解析行为，而规范为何又禁止新代码继续使用；
3. 替换后如何证明语义、视觉、键盘、URL 和业务数据没有回归。

**完成本课后，你将交付：**

- 一张区分现行、过时、非标准和“过时但仍有兼容行为”的判断表；
- 一份按历史用途整理的旧特性迁移清单；
- 一份不能投入生产运行的旧页面阅读样本；
- 一个只使用现行 HTML、CSS 和 DOM 事件的现代商品页；
- 一份包含截图之外证据的迁移记录；
- 基础、提升和故障注入练习及答案标准。

本课中的旧代码只用于阅读、审计和迁移讨论，不应复制到生产页面，也不把旧完整页面作为生产应用运行。现代案例仍是静态教学页：商品数据写在当前文档中，价格源值使用整数分，时间机器值使用 UTC ISO 8601；收藏状态只存在当前页面内存中。页面没有账号、服务端鉴权、支付、库存锁定、持久化或并发控制。

## 1. 任务背景

### 1.1 “浏览器接受”有三种不同含义

开发者常把以下判断混成一句“支持”：

| 判断 | 真正的问题 | 证据 |
| --- | --- | --- |
| 解析兼容 | 浏览器是否把字节流恢复成某个 DOM | Elements、HTML 解析规则 |
| 作者合规 | 规范是否允许新页面这样写 | HTML Living Standard、校验器 |
| 产品可用 | 目标用户是否能完成任务 | 视觉、键盘、读屏、URL、行为测试 |

旧标记被解析，不等于它是现行作者语法；语法被规范允许，也不等于它适合当前任务；页面看起来相似，也不等于行为和可访问性已经等价。

例如，浏览器可能继续识别 `<center>` 并产生 `HTMLCenterElement`，这只是历史兼容。新页面仍应根据原始意图选择：

- 文本对齐使用 CSS `text-align`；
- 固定宽度盒子居中使用 `margin-inline: auto`；
- Flex 或 Grid 子项居中使用相应布局属性；
- 内容语义由标题、段落、列表等元素表达。

这四种“居中”不能靠一次机械替换完成。

### 1.2 为什么旧页面不能只做字符串替换

旧元素常把语义、外观和行为压进同一个标签：

```html
<font color="red" size="+2"><b>今日特价</b></font>
```

这段代码至少混合了：

- 文本的业务角色：这是商品促销提示；
- 强调关系：是否真的属于“重要”内容；
- 颜色：红色；
- 字号：比周围大；
- 视觉优先级：希望用户先看到。

如果机械替换为 `<strong>`，可能错误地增加语义；如果只替换为 `<span style="color:red">`，又把旧的难维护方式原样搬进了 `style` 属性。正确迁移先命名内容职责，再分别选择语义元素和可复用 CSS。

### 1.3 本课的可观察完成标准

完成迁移后应能观察到：

1. HTML 校验不再报告本课列出的过时元素和属性；
2. 源代码与 DOM 中均不再出现 `font`、`center`、`frameset`、`frame`、`noframes`、`marquee`、`blink`、`applet` 和 `acronym`；
3. 表格的表头关系没有因视觉迁移而丢失；
4. 页面在 200% 缩放、小屏和打印预览中仍可读取；
5. 只用键盘可以访问导航、资源链接和收藏按钮；
6. 关闭 JavaScript 后仍能阅读商品名称、整数分对应价格、时间和安全提示；
7. URL 片段、后退/前进和新标签打开不依赖 frame 的 `target`；
8. 动态行为尊重当前页面内存边界，不声称已经保存到服务器；
9. 迁移记录包含旧意图、现代替代、回归风险和复验证据。

## 2. 学习目标

完成本课后，你应能：

- 区分现行特性、过时但合规的特例、完全过时的非合规特性和厂商非标准扩展；
- 解释作者要求与浏览器实现要求为何可以同时存在；
- 说明 HTML 解析错误恢复为何不是新代码的设计许可；
- 按历史目的审计旧页面，而不是只按标签名字搜索替换；
- 迁移 `font`、`center`、`big`、`tt` 和 `strike`；
- 迁移 `frameset`、`frame` 和 `noframes` 布局；
- 迁移 `applet` 与旧插件调用，并正确判断现行 `embed` 的边界；
- 迁移 `marquee` 与 `blink`，并处理暂停和减少动效；
- 用 `abbr` 与可见全称替代 `acronym`；
- 把 `align`、`bgcolor`、`border`、`cellpadding` 和 `cellspacing` 迁移到 CSS；
- 删除 `script[language]`，并用 DOM 事件替代旧 `for`/`event` 绑定；
- 识别错误的机械替换；
- 用截图、DOM、键盘、无障碍、URL、Console 和 Network 共同验证迁移；
- 保持邻里集市的整数分、UTC 和静态教学边界。

## 3. 预备知识

开始前建议先完成：

- [文本语义与国际化](../01-document-text/03-text-semantics-i18n.md)；
- [地标、标题与文档结构](../02-structure-links-lists/01-landmarks-headings-outline.md)；
- [表格模型、表头与跨行跨列](../04-tables-data/01-table-model-headers-spans.md)；
- [嵌入、SVG 与 Canvas](../03-images-media-embedding/03-embedding-svg-canvas.md)；
- [事件、表单与委托](../06-interactive-dom/03-events-forms-delegation.md)。

你需要知道：

- HTML 源代码会经过 tokenization 和 tree construction 形成 DOM；
- CSS 负责呈现，HTML 负责内容结构和语义；
- `s` 表示内容不再准确或不再相关，`del` 表示文档编辑删除；
- `iframe` 是当前元素，但不应被当作普通页面布局工具；
- `embed`、`object` 和普通链接有不同回退能力；
- `addEventListener()` 可以注册事件监听器；
- DevTools 的 Elements 展示解析后的 DOM，不一定逐字等于源代码。

本课不要求：

- 复活 Java、Flash、ActiveX 或浏览器插件；
- 编写自动迁移所有旧站点的通用转换器；
- 在生产环境部署旧页面；
- 用 CSS 精确复制所有历史浏览器的默认像素；
- 实现真实收藏、预约、支付或服务端存储；
- 声称一次 Chromium 检查覆盖所有浏览器和辅助技术。

若必须查看真实旧站，应先在隔离、只读、无生产凭据的环境中保存证据。不要为了观察旧插件而安装来源不明的软件、关闭浏览器安全策略或启用已停用的插件运行时。

## 4. 核心理论

### 4.1 四种状态不能混用

| 状态 | 作者能否在新代码中使用 | 浏览器可能怎样处理 | 示例 |
| --- | --- | --- | --- |
| 现行且合规 | 可以，仍需符合内容模型 | 按现行规则解析和运行 | `main`、`abbr`、`iframe`、`embed` |
| 过时但合规 | 不应使用，校验器会警告；只保留极窄兼容条件 | 继续解析 | `script[language="JavaScript"]`、特定 `img[border="0"]` |
| 完全过时、非合规 | 不得由作者使用 | 可能为了旧网页继续解析或渲染 | `font`、`frameset`、`marquee`、`applet` |
| 非标准扩展 | 从未成为通用标准，或行为由厂商历史实现决定 | 支持差异大，也可能被标准的兼容规则描述 | 历史 `blink` 行为、旧 IE `script[for][event]` 用法 |

“过时”和“非标准”描述的轴不同：

- 过时表示该特性不再适合作者使用；
- 非标准表示它没有稳定的跨实现标准合同；
- 某特性可能既非标准又已被列为过时；
- 某元素可能是现行标准，但历史用途所依赖的插件生态已经消失。

`embed` 是最后一种情况的关键反例。`embed` 仍是 HTML Living Standard 中的现行元素，具有 `src`、`type`、`width` 和 `height` 等现行属性。过时的是 Flash、Java 等旧插件依赖，以及 `embed[align]`、`embed[hspace]`、`embed[vspace]` 等旧呈现属性。不能因为插件历史就把当前 `embed` 元素整体标记为过时。

### 4.2 作者要求与实现要求为什么分开

HTML 标准同时服务两类读者：

- 作者需要知道新文档允许写什么；
- 浏览器实现者需要知道遇到历史内容时怎样互操作。

开放 Web 上存在大量无法统一重写的旧页面。若浏览器突然删除所有旧解析行为，用户面对的不是“校验警告”，而是新闻归档、政务资料、企业后台或个人主页直接损坏。因此标准会在“Obsolete features”中禁止作者继续使用某些特性，同时仍在实现章节规定旧内容的解析和呈现行为。

这种兼容性是一种读取旧文档的成本，不是继续生产旧文档的许可证。

### 4.3 错误恢复是确定行为，不是正确写法

`text/html` 解析器对许多错误有明确恢复算法。例如，它可能：

- 忽略重复属性的后续值；
- 自动补出 `html`、`head`、`body` 或表格内部节点；
- 调整错误嵌套的格式元素；
- 在特殊插入模式中处理旧 frame 结构；
- 为部分过时元素创建 DOM 节点并应用用户代理样式。

这带来两个迁移原则：

1. 必须同时比较源代码和解析后的 DOM；
2. 不得把“DOM 被修好了”当作源代码合规。

不同输入即使看起来相似，也可能进入不同解析状态。迁移时应先记录浏览器实际 DOM，再重写为明确、合规、无需猜测恢复路径的结构。

### 4.4 先恢复意图，再选择替代

可用以下问题审计每个旧特性：

```text
旧特性在做什么？
  ├── 表达内容关系：选择现行语义元素
  ├── 控制颜色/尺寸/间距：迁移到 CSS
  ├── 切分多个文档：恢复 URL 与导航模型
  ├── 调用插件运行时：按媒体或应用职责重建
  ├── 自动制造运动：先判断运动是否必要
  └── 绑定事件：迁移到 DOM 事件机制
```

替代方案不是“旧标签对应哪个新标签”，而是“旧任务现在由哪一层负责”。

### 4.5 分阶段迁移比一次重写更可验证

推荐顺序：

1. **冻结范围**：记录入口 URL、关键截图、DOM、键盘路径和网络请求；
2. **盘点旧特性**：按内容、呈现、布局、插件、动效、元信息和事件分组；
3. **建立数据合同**：先固定商品 ID、整数分价格、UTC 时间和链接目标；
4. **重建语义**：在不追求像素一致前，先写正确标题、地标、表格和链接；
5. **迁移呈现**：把颜色、字体、对齐、边框和间距放入 CSS；
6. **迁移行为**：用原生控件和 DOM 事件替代旧脚本模式；
7. **逐项对照**：每完成一组就检查视觉与行为回归；
8. **删除兼容残留**：确认没有调用点后再移除旧标记和样式；
9. **跨环境复验**：至少覆盖目标浏览器、键盘、小屏、缩放和打印。

把所有变化一次提交，会让“语义变化”“CSS 变化”和“行为变化”互相遮蔽，难以定位回归。

### 4.6 迁移回归不只看截图

| 回归类型 | 典型现象 | 证据 |
| --- | --- | --- |
| 视觉 | 字号、行高、边框、单元格间距改变 | 同尺寸截图、Computed |
| 结构 | 标题层级、表头关系或地标丢失 | Elements、Accessibility |
| 行为 | 链接目标、后退、焦点或事件改变 | 键盘操作、URL、Console |
| 兼容 | 某浏览器忽略非标准替代 | 目标浏览器实测 |
| 性能 | 插件替换后资源或脚本大幅增加 | Network、Performance |
| 数据 | 价格从整数分误改为浮点元，时间丢失时区 | DOM 属性、日志、断言 |
| 降级 | 禁用脚本后核心内容消失 | 禁用脚本复验 |

视觉相同但 URL 不能复制，不算迁移成功；DOM 合规但安全提示只靠动画出现，也不算成功。

### 4.7 静态教学边界不能被迁移文案扩大

旧页面常用“购买”“预订”“已保存”等文字，但静态示例没有后端。现代化时不能因为界面更精致，就暗示能力已经存在。

邻里集市案例统一遵守：

- `data-price-cents="3900"` 表示 3900 分，显示时才格式化为 39.00 元；
- `<time datetime="2026-10-10T08:00:00Z">` 使用 UTC 机器值；
- 收藏按钮只改变当前 DOM 和当前页面内存；
- 刷新后状态重置；
- 没有网络请求就不能声称已持久化；
- 没有服务端就不能声称已授权、锁定库存、预约或付款。

## 5. 元素、属性、API 或配置清单

### 5.1 迁移总表

| 历史目的 | 旧特性 | 现代职责分配 | 主要回归风险 |
| --- | --- | --- | --- |
| 字体和强调 | `font`、`big`、`tt`、`strike` | 语义元素 + CSS | 字号、行高、错误语义 |
| 居中布局 | `center`、`align` | CSS 文本或布局属性 | 把文本居中误当盒子居中 |
| 多文档布局 | `frameset`、`frame`、`noframes` | 完整页面、普通导航、必要时 `iframe` | 深链接、历史、焦点、滚动 |
| 插件应用 | `applet`、旧插件 `object`/`embed` | HTML/CSS/JS、媒体元素、链接或当前嵌入 | 功能缺失、资源格式、回退 |
| 自动运动 | `marquee`、`blink` | 静态信息；必要时可控 CSS/JS | 分心、眩晕、无法暂停 |
| 术语和声明 | `acronym`、旧 doctype、`script[language]` | `abbr`、现代元信息、现代脚本声明 | 文案丢失、编码或执行顺序变化 |
| 表格呈现 | `bgcolor`、`border`、`cellpadding`、`cellspacing` | CSS | 折叠边框与间距不等价 |
| 旧事件绑定 | `script[for][event]`、分散内联处理器 | `addEventListener()` | `this`、执行顺序、默认行为 |

### 5.2 呈现元素：`font`、`center`、`big`、`tt`、`strike`

#### 旧代码与原始目的

```html
<!-- 历史样本：只用于阅读，不要复制到新页面 -->
<center>
  <font face="Arial" color="#b00020" size="+2">邻里集市</font>
  <p>
    <big>今日推荐</big>
    <tt>SKU-LAMP-001</tt>
    <strike>49.00 元</strike>
  </p>
</center>
```

这段代码分别尝试控制：

- 整块内容居中；
- 字体族、颜色和相对字号；
- “今日推荐”字号增大；
- SKU 使用等宽字体；
- 旧价格显示删除线。

#### 现代替代

```html
<header class="site-header">
  <p class="site-name">邻里集市</p>
  <h1>今日推荐</h1>
  <p>
    商品编号：<data class="product-code" value="SKU-LAMP-001">SKU-LAMP-001</data>
  </p>
  <p>
    <s class="previous-price">49.00 元</s>
    <strong class="current-price">39.00 元</strong>
  </p>
</header>
```

```css
.site-header {
  max-width: 48rem;
  margin-inline: auto;
  text-align: center;
}

.site-name {
  color: #8b2f1c;
  font: 700 1.5rem/1.2 system-ui, sans-serif;
}

.product-code {
  font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
}

.previous-price {
  color: #5e6863;
}
```

这里没有为每个旧元素强行找一个新元素：

- `h1` 是因为内容确实是页标题，不是因为 `big` 看起来大；
- `data` 保存 SKU 的机器值，等宽字体只是 CSS；
- `s` 表示旧价格不再适用；若是在文档修订中删除价格，应考虑 `del`；
- `strong` 只在当前价格确实需要表达重要性时使用；
- 文本居中和盒子居中分别处理。

#### 迁移步骤

1. 为每段文字标记真实职责：标题、品牌名、代码、旧价格或普通说明；
2. 先选择 `h1`、`p`、`data`、`s`、`del`、`strong` 等语义；
3. 将字体族、字号、颜色、对齐和宽度迁入 CSS 类；
4. 比较旧页 Computed 中的字体、行高和块尺寸；
5. 删除旧元素后运行校验器；
6. 在 200% 缩放和系统字体替换条件下复验。

#### 视觉或行为回归风险

- `font[size="+2"]` 的历史映射不等于固定的 `2rem`；
- `center` 可能影响其后代的文本对齐，而 `margin-inline: auto` 只移动盒子；
- `big` 的默认增量与新设计系统字号比例不同；
- `tt` 的默认等宽字体、字宽和换行可能改变；
- `strike` 迁移为 `del` 会增加“编辑删除”语义，不一定正确；
- 只靠颜色区分现价和旧价会造成信息不足。

#### 验证

- Elements 中不存在五个旧元素；
- Accessibility 树中的标题层级符合内容结构；
- SKU 在复制、换行和搜索时仍是普通文本；
- 关闭 CSS 后，标题、SKU、旧价和现价关系仍可理解；
- 200% 缩放后文字不裁切；
- 现价和旧价不仅靠颜色区分。

### 5.3 框架布局：`frameset`、`frame`、`noframes`

#### 旧代码与原始目的

```html
<!-- 历史样本：不要作为生产页面运行 -->
<frameset cols="220,*">
  <frame src="catalog.html" name="catalog">
  <frame src="welcome.html" name="content">
  <noframes>
    <body>
      <p><a href="catalog.html">打开商品目录</a></p>
    </body>
  </noframes>
</frameset>
```

历史目的通常是让导航文档和内容文档分别滚动，并让目录链接通过 `target="content"` 更新右侧 frame。

#### 现代替代

```html
<body>
  <header>
    <a href="/">邻里集市</a>
  </header>
  <div class="page-layout">
    <nav aria-label="商品目录">
      <ul>
        <li><a href="/listings/lamp.html">阅读台灯</a></li>
        <li><a href="/listings/chair.html">实木椅</a></li>
      </ul>
    </nav>
    <main>
      <h1>今日商品</h1>
      <p>选择商品后进入拥有独立 URL 的详情页。</p>
    </main>
  </div>
</body>
```

```css
.page-layout {
  display: grid;
  grid-template-columns: minmax(12rem, 18rem) minmax(0, 1fr);
  gap: 2rem;
}

@media (max-width: 42rem) {
  .page-layout {
    grid-template-columns: 1fr;
  }
}
```

完整页面应由服务端模板、静态站点生成器或前端组件复用共同区域，而不是用 `frameset` 拼接文档。`iframe` 仍可用于真正独立的嵌入文档，但不是 `frame` 布局的一一替代。

#### 迁移步骤

1. 列出每个 frame 的 URL、名称、标题、滚动位置和链接目标；
2. 找出 `target="frameName"`、`parent.frames`、`top` 和跨 frame 脚本；
3. 为每种主内容设计可直接访问、可复制、可刷新的独立 URL；
4. 把共享页眉、导航和页脚放入模板或组件；
5. 用 Grid/Flex 处理视觉分栏；
6. 把 frame 间通信改为普通导航或明确的应用状态；
7. 保留真实链接，不用点击处理器伪造导航；
8. 删除 `noframes` 前，确认其有价值内容已经进入主页面。

#### 视觉或行为回归风险

- 原来两个独立滚动区变为一个页面滚动区；
- frame 边界、拖拽尺寸或固定目录宽度消失；
- 原链接只改变子 frame，地址栏不变；迁移后 URL 和历史会改变；
- 旧书签可能指向壳页面而不是实际内容；
- `target`、后退和刷新行为不同；
- 多文档标题和焦点顺序变为单文档结构；
- 服务端模板若遗漏权限检查，不能靠旧 frame 隔离补救。

#### 验证

- 每个详情页都能直接在新标签打开；
- 刷新、后退、前进和复制 URL 均得到预期内容；
- 键盘焦点按页眉、导航、主内容顺序移动；
- 小屏时导航和主内容不横向裁切；
- 搜索引擎或站内搜索能发现实际详情 URL；
- Network 不再为了同一视图加载多个完整壳文档；
- 源代码中没有 `frameset`、`frame` 和 `noframes`。

### 5.4 插件历史：`applet`、旧 `object`/`embed` 与现行 `embed`

#### 旧代码与原始目的

```html
<!-- 历史 Java 插件样本：不要运行 -->
<applet code="PriceChart.class" archive="market-tools.jar" width="640" height="360">
  <param name="currency" value="CNY">
  无法启动价格图插件。
</applet>
```

```html
<!-- 历史 Flash 插件样本：不要运行 -->
<object classid="clsid:legacy-plugin-id" width="640" height="360">
  <param name="movie" value="listing-tour.swf">
  <embed src="listing-tour.swf" type="application/x-shockwave-flash">
</object>
```

`applet` 依赖 Java 插件；旧 `object`/`embed` 代码可能依赖 Flash、ActiveX 或厂商插件。资源文件、脚本 API 和安全模型都来自浏览器外运行时。

#### 现代替代

先按内容职责选择，不要把 `applet` 机械替换为 `embed`：

| 原任务 | 现代起点 |
| --- | --- |
| 交互图表 | 语义表格 + SVG/Canvas 增强 |
| 视频演示 | `video` + `source` + `track` |
| 音频 | `audio` + `source` |
| 普通图片 | `img` |
| PDF 说明 | 普通链接优先；可选 `object`、`iframe` 或当前 `embed` 预览 |
| 独立 Web 应用 | 普通链接；确需嵌入时评估 `iframe`、CSP 和权限 |
| 计算逻辑 | 经审计的 JavaScript/WebAssembly，保留无脚本基线 |

当前 PDF 嵌入可以这样写，但仍要保留链接：

```html
<section aria-labelledby="manual-heading">
  <h2 id="manual-heading">商品检查说明</h2>
  <embed
    src="lamp-inspection.pdf"
    type="application/pdf"
    width="640"
    height="480"
    title="阅读台灯检查说明 PDF">
  <p>
    <a href="lamp-inspection.pdf">打开或下载阅读台灯检查说明 PDF</a>
  </p>
</section>
```

这段代码使用的是现行 `embed`，不是旧插件已恢复。PDF 是否在元素中显示，仍取决于浏览器、内置查看器、设备和用户设置。若需要元素内部回退内容，考虑 `object`；若只需要可靠访问，普通链接更简单。

#### 迁移步骤

1. 保存合法拥有的旧资源和功能说明，不直接启动未知插件；
2. 列出插件输入、输出、用户操作、文件格式和网络请求；
3. 判断任务属于媒体、图表、文档预览还是完整应用；
4. 先建立普通文本、表格或链接基线；
5. 再增加 SVG、Canvas、媒体元素或受限 iframe；
6. 把插件私有格式转换为开放、可测试的资源格式；
7. 为键盘、触控、无脚本和不支持内嵌查看器的环境提供路径；
8. 删除旧 JAR、SWF、`classid`、`archive`、插件 MIME 类型和安装提示。

#### 视觉或行为回归风险

- 原插件中的动画、打印、缩放、快捷键或导出功能遗漏；
- 私有字体和坐标系转换后图形偏移；
- 音视频编解码支持与旧插件不同；
- PDF 在桌面内嵌、移动端下载，行为不一致；
- 旧插件回退文字曾承载重要说明，删除后信息丢失；
- Canvas 重写只保留图像，没有保留数据表和文本结论；
- 为追求功能一致而引入过宽 iframe 权限。

#### 验证

- 不安装插件也能完成核心任务；
- 普通链接在内嵌失败时仍可用；
- 键盘可以到达所有操作；
- 禁用 JavaScript 后仍能获取核心说明或数据；
- Network 不请求 JAR、SWF、ActiveX 或未知插件 MIME；
- 当前 `embed` 的用途、标题、资源类型和外部链接明确；
- 不把 `embed` 元素整体写成“已废弃”。

### 5.5 滚动与闪烁：`marquee`、`blink`

#### 旧代码与原始目的

```html
<!-- 历史样本：不要复制 -->
<marquee behavior="scroll" direction="left">
  请勿提前转账，务必当面检查商品。
</marquee>

<blink>仅剩 1 件！</blink>
```

历史目的通常是抢占注意力，而不是表达新的内容关系。自动滚动和闪烁会让阅读、放大、注意力控制和前庭敏感用户面临问题。

#### 现代替代

安全提示默认保持静止、完整和可读：

```html
<aside class="safety-notice" aria-labelledby="safety-title">
  <h2 id="safety-title">交易安全提醒</h2>
  <p>请勿提前转账，务必在公共地点当面检查商品。</p>
</aside>
```

```css
.safety-notice {
  border-inline-start: 0.375rem solid #b5472c;
  padding: 1rem;
  background: #fff4e8;
  color: #3d241d;
}
```

若业务确实需要持续更新的状态，应先显示静态文本，再提供明确的暂停/继续控件，并尊重减少动效偏好。不能把 `marquee` 改成无限 CSS 动画后宣称完成了可访问迁移。

#### 迁移步骤

1. 判断运动是否传达不可替代的信息；
2. 若只是吸引注意，删除运动并加强标题、位置和对比；
3. 若是轮播或实时状态，提供暂停、停止或隐藏机制；
4. 确保全部文本不依赖运动到达可视区；
5. 用 `prefers-reduced-motion: reduce` 关闭非必要运动；
6. 检查闪烁频率和 WCAG 闪烁阈值；
7. 用按钮而不是 hover/focus 临时停止，因为用户必须能继续操作页面。

#### 视觉或行为回归风险

- 删除运动后，提示的视觉优先级下降；
- CSS 动画文本被容器裁切；
- 暂停按钮只暂停视觉，实时数据仍在后台替换；
- 焦点进入时停止、离开时恢复，会迫使键盘用户保持焦点；
- 减少动效规则只缩短动画，没有真正关闭位移；
- “库存仅剩 1 件”若不是服务端事实，会制造虚假稀缺。

#### 验证

- 首次打开时提示全文可读；
- 200% 缩放和 320 CSS 像素宽度下不裁切；
- 若有运动，运行超过 5 秒时可暂停、停止或隐藏；
- 开启系统减少动效后，非必要位移消失；
- 只用键盘可以操作控制并继续浏览；
- 不出现高频闪烁；
- 静态教学页不声称拥有实时库存。

### 5.6 术语、文档元信息与 `script[language]`

#### 旧代码与原始目的

```html
<!-- 历史样本：旧 doctype、旧编码声明、acronym 和 language -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="keywords" content="二手,台灯,LED">
    <title>旧台灯商品页</title>
  </head>
  <body>
    <p><acronym title="Light Emitting Diode">LED</acronym> 阅读台灯</p>
    <script language="JavaScript">
      document.title = "邻里集市 - 旧台灯";
    </script>
  </body>
</html>
```

历史目的包括选择文档版本、声明编码、提供搜索关键词、解释缩略词和声明脚本语言。

#### 现代替代

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta
      name="description"
      content="邻里集市阅读台灯静态教学详情，包含成色、价格和交接说明。">
    <title>阅读台灯 · 邻里集市</title>
  </head>
  <body>
    <main>
      <h1>发光二极管（<abbr title="Light Emitting Diode">LED</abbr>）阅读台灯</h1>
    </main>
    <script>
      document.documentElement.dataset.scriptReady = "true";
    </script>
  </body>
</html>
```

说明：

- `<!doctype html>` 请求标准模式，不是版本号；
- `meta charset` 应尽早出现，文件本身也必须按 UTF-8 保存；
- `meta name="keywords"` 不应被当作现代搜索排名方案；
- `abbr` 替代 `acronym`，首次出现同时给出可见全称；
- 经典 JavaScript 脚本省略 `language` 和冗余 `type="text/javascript"`；
- JavaScript 模块使用 `type="module"`，这是脚本类型选择，不是旧 `language` 的机械改名。

#### 迁移步骤

1. 确认服务器 `Content-Type` 与真实文件编码；
2. 使用简短 doctype，并在浏览器检查 `document.compatMode === "CSS1Compat"`；
3. 写入正确 `lang`、`charset`、viewport、`title` 和真实 description；
4. 删除无产品价值的关键词堆砌；
5. 用 `abbr` 和可见全称表达术语；
6. 删除 `script[language]`；
7. 根据依赖和执行顺序决定普通脚本、`defer`、`async` 或 module；
8. 检查脚本移动后是否影响 DOM 可用时机。

#### 视觉或行为回归风险

- 从怪异模式切到标准模式后，盒模型和尺寸可能大幅改变；
- 编码声明与实际字节不一致会产生乱码；
- 动态修改标题的旧脚本被删除后，页面标题可能变化；
- `abbr[title]` 的提示在触屏和部分辅助技术中不稳定，不能替代可见全称；
- 普通脚本改为 module 后默认延迟执行、严格模式和作用域发生变化；
- description 与可见正文不一致会误导搜索摘要。

#### 验证

- Console 中 `document.compatMode` 为 `CSS1Compat`；
- Network 响应头、文件编码和 `meta charset` 一致；
- 标签页标题准确且不依赖延迟脚本；
- 关闭 CSS 和 JavaScript后仍能看到术语全称；
- 源代码中没有 `acronym` 和 `script[language]`；
- 普通脚本执行顺序与设计一致，module 导入无 404。

### 5.7 对齐、颜色、边框和表格间距属性

#### 旧代码与原始目的

```html
<!-- 历史样本：呈现属性与数据结构混合 -->
<table
  align="center"
  bgcolor="#fff7dd"
  border="1"
  cellpadding="8"
  cellspacing="4">
  <tr bgcolor="#ead9a7">
    <th align="left">项目</th>
    <th align="right">内容</th>
  </tr>
  <tr>
    <td>价格</td>
    <td align="right">39.00 元</td>
  </tr>
</table>
```

`align` 还常见于 `p`、标题、`img`、`iframe`、`object` 和 `embed`；`bgcolor` 常见于 `body`、表格、行和单元格；`border` 也曾用于图片和嵌入对象。

#### 现代替代

```html
<div class="spec-table-wrapper">
  <table class="spec-table">
    <caption>阅读台灯交易信息</caption>
    <thead>
      <tr>
        <th scope="col">项目</th>
        <th scope="col" class="numeric">内容</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">价格</th>
        <td class="numeric" data-price-cents="3900">39.00 元</td>
      </tr>
    </tbody>
  </table>
</div>
```

```css
.spec-table-wrapper {
  max-width: 40rem;
  margin-inline: auto;
  overflow-x: auto;
}

.spec-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff7dd;
}

.spec-table caption {
  margin-block-end: 0.5rem;
  font-weight: 700;
  text-align: left;
}

.spec-table th,
.spec-table td {
  border: 1px solid #72664e;
  padding: 0.5rem;
  text-align: left;
}

.spec-table thead {
  background: #ead9a7;
}

.spec-table .numeric {
  text-align: end;
  font-variant-numeric: tabular-nums;
}
```

属性映射需要理解模型：

| 旧属性 | 常见 CSS 起点 | 不能忽略的差异 |
| --- | --- | --- |
| `align="center"` | `text-align: center` 或 `margin-inline: auto` | 文本对齐与盒子居中不是同一件事 |
| `bgcolor` | `background-color` | 还要检查对比度、打印和强制颜色模式 |
| `border` | `border` | 必须明确应用到 table、cell、image 或容器 |
| `cellpadding` | `th, td { padding: ... }` | 每个单元格都受影响 |
| `cellspacing` | `border-spacing` | 只在分离边框模型中生效 |

若要保留旧 `cellspacing="4"` 的空隙，应使用：

```css
.spec-table {
  border-collapse: separate;
  border-spacing: 0.25rem;
}
```

若使用 `border-collapse: collapse`，单元格间距会合并消失。这不是 CSS 失效，而是选择了不同边框模型。

`img[border="0"]` 在标准中属于极窄的“过时但合规”兼容特例，但新代码仍应省略并用 CSS；表格 `border`、`cellpadding`、`cellspacing` 等则不得继续由作者使用。

#### 迁移步骤

1. 记录表格是数据表还是被滥用的布局表；
2. 若是数据表，先补全 `caption`、`th`、`scope` 和行组；
3. 分别记录表格外边框、单元格边框、内边距和单元格间距；
4. 决定使用折叠还是分离边框模型；
5. 用逻辑属性和可复用类迁移对齐与颜色；
6. 检查颜色对比、强制颜色模式和打印；
7. 删除旧属性后比较 Computed 和截图；
8. 若是布局表，先迁移为正常文档结构和 CSS 布局，再删除表格。

#### 视觉或行为回归风险

- `border-collapse` 选择错误导致双线、断线或间距消失；
- 只给 `table` 加 border，单元格网格线丢失；
- `padding` 单位换算后行高变化；
- `text-align: right` 在不同书写方向下不如 `text-align: end` 合适；
- 背景色迁移后文字对比不足；
- 布局表改造改变 DOM 阅读顺序；
- 响应式包裹层可能隐藏 caption 或焦点轮廓。

#### 验证

- 表头与数据单元格关系可在 Accessibility 面板检查；
- 320 CSS 像素宽度下可横向滚动而不裁掉数据；
- 200% 缩放后单元格文字不重叠；
- 打印预览保留可读边框；
- Computed 中能定位边框、内边距和间距来源；
- 源代码没有 `align`、`bgcolor`、表格 `border`、`cellpadding` 和 `cellspacing`；
- 价格源值仍是 `3900` 分，不因呈现迁移改成浮点元。

### 5.8 旧脚本事件模式：`language`、`for`、`event` 与内联处理器

#### 旧代码与原始目的

```html
<!-- 历史 IE 风格样本：不要复制 -->
<button id="favorite">收藏</button>

<script language="JavaScript" for="favorite" event="onclick">
  window.status = "已收藏";
</script>
```

另一种常见旧写法是：

```html
<a href="javascript:addFavorite()" onclick="return false;">收藏</a>
```

这里混合了脚本语言声明、元素定位、事件名称、伪链接和状态更新。

#### 现代替代

```html
<button id="favorite" type="button" aria-pressed="false">收藏</button>
<p id="favorite-status" role="status">尚未收藏；状态仅保留在当前页面。</p>

<script>
  const favoriteButton = document.querySelector("#favorite");
  const favoriteStatus = document.querySelector("#favorite-status");

  favoriteButton.addEventListener("click", () => {
    const nextPressed = favoriteButton.getAttribute("aria-pressed") !== "true";
    favoriteButton.setAttribute("aria-pressed", String(nextPressed));
    favoriteStatus.textContent = nextPressed
      ? "已在当前页面内存中收藏；刷新后会重置。"
      : "尚未收藏；状态仅保留在当前页面。";
  });
</script>
```

切换按钮的可见名称保持“收藏”，由 `aria-pressed` 表达当前是否已收藏；状态区说明刚发生的变化。不要让标签在“收藏”和“取消收藏”之间切换，否则名称与 pressed 状态会形成两套相互竞争的状态表达。

`onclick` 等事件处理内容属性在 HTML 中仍有定义，不能一概写成“浏览器不支持”或“全部过时”。但在现代工程中，`addEventListener()` 通常更利于内容与行为分离、注册多个监听器、集中清理和使用严格 CSP。旧 `script[for][event]` 则应迁移到 DOM 事件机制。

#### 迁移步骤

1. 搜索 `language`、`for`、`event`、`javascript:` 和 `on...` 属性；
2. 记录每个处理器依赖的全局变量、`this`、返回值和默认行为；
3. 用真实 `button` 表示操作、真实 `a[href]` 表示导航；
4. 在 DOM 可用后通过稳定选择器获取元素；
5. 用 `addEventListener()` 注册事件；
6. 显式处理 `preventDefault()`，不要依赖 `return false` 的混合语义；
7. 把用户可见结果写入状态区域；
8. 复验执行顺序、重复注册和页面卸载清理。

#### 视觉或行为回归风险

- `<a>` 改为 `<button>` 后默认样式改变，但键盘语义更正确；
- 旧处理器中的 `this` 与箭头函数的 `this` 不同；
- `return false` 同时阻止默认行为的旧假设丢失；
- 脚本放置位置变化后查询结果为 `null`；
- 多次初始化导致监听器重复注册；
- 旧 `window.status` 没有可见、可读屏的反馈；
- 内存状态被错误文案描述为服务端保存。

#### 验证

- Enter 和 Space 都能激活收藏按钮；
- Accessibility 树报告 button 和 pressed 状态；
- Console 没有空引用或重复处理；
- Network 没有收藏 API 请求；
- 刷新后状态重置，与文案一致；
- 源代码没有 `script[language]`、`script[for]`、`script[event]` 或 `javascript:` URL；
- 启用严格 CSP 的规划中不依赖内联事件属性。

## 6. 最小可运行案例

### 6.1 目标：迁移一张商品价格卡

该案例只使用现行 HTML 和 CSS，验证呈现元素、旧价格语义、整数分和 UTC 时间。它不包含任何旧标签，不需要运行旧页面。

文件位置：

```text
market-learning/
└── practice/
    └── html-24-migration/
        └── modern-price-card.html
```

本教材不创建该练习目录。请在个人练习项目中将下面内容保存为 `modern-price-card.html`。

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>阅读台灯价格卡 · 邻里集市</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, sans-serif;
        color: #263c34;
        background: #f5f1e8;
      }

      body {
        margin: 0;
        padding: 2rem 1rem;
        line-height: 1.6;
      }

      .listing {
        max-width: 36rem;
        margin-inline: auto;
        padding: 1.5rem;
        border: 1px solid #8c9b94;
        border-radius: 0.75rem;
        background: #ffffff;
      }

      .listing h1 {
        margin-block-start: 0;
        text-align: center;
      }

      .product-code {
        font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      }

      .price-line {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.5rem;
      }

      .previous-price {
        color: #5e6863;
      }

      .current-price {
        color: #8b2f1c;
        font-size: 1.5rem;
      }

      .notice {
        border-inline-start: 0.375rem solid #b5472c;
        padding: 0.75rem 1rem;
        background: #fff4e8;
      }
    </style>
  </head>
  <body>
    <main>
      <article
        class="listing"
        data-listing-id="lamp-001"
        data-previous-price-cents="4900"
        data-current-price-cents="3900">
        <p>邻里集市 · 静态教学页</p>
        <h1>发光二极管（<abbr title="Light Emitting Diode">LED</abbr>）阅读台灯</h1>
        <p>
          商品编号：
          <data class="product-code" value="SKU-LAMP-001">SKU-LAMP-001</data>
        </p>
        <p class="price-line">
          <span>参考价格：</span>
          <s class="previous-price">49.00 元</s>
          <strong class="current-price">39.00 元</strong>
        </p>
        <p>
          信息更新时间：
          <time datetime="2026-10-10T08:00:00Z">2026-10-10 16:00（UTC+8）</time>
        </p>
        <aside class="notice" aria-labelledby="safety-heading">
          <h2 id="safety-heading">交易安全提醒</h2>
          <p>请勿提前转账，请在公共地点当面检查商品。</p>
        </aside>
        <p>
          本页数据固定写在 HTML 中，不代表真实库存、预约、付款或服务端保存状态。
        </p>
      </article>
    </main>
  </body>
</html>
```

### 6.2 打开方法

1. 保存为 UTF-8；
2. 用现代浏览器直接打开；
3. 打开 DevTools Elements，选择 `article`；
4. 检查两个 `data-*-price-cents` 值；
5. 在 Console 运行：

```js
const listing = document.querySelector(".listing");
console.table({
  listingId: listing.dataset.listingId,
  previousPriceCents: Number(listing.dataset.previousPriceCents),
  currentPriceCents: Number(listing.dataset.currentPriceCents),
  compatMode: document.compatMode,
});
```

6. 放大到 200%，再把视口缩小到 320 CSS 像素；
7. 禁用 CSS，确认内容关系仍可读。

### 6.3 预期结果

- 卡片作为固定宽度盒子居中，标题文本也居中；
- 旧价格有删除线，现价有文字和字号双重区分；
- 商品编号以等宽字体显示，但仍是普通可复制文本；
- 安全提示保持静止且完整可见；
- `document.compatMode` 为 `CSS1Compat`；
- 价格机器值为 `4900` 和 `3900`，不是浮点元；
- 时间机器值以 `Z` 结尾，表示 UTC；
- 页面没有脚本、网络请求和可变业务状态。

### 6.4 失败证据

以下任一现象都应记录为失败：

- Elements 中出现 `font`、`center`、`big`、`tt`、`strike` 或 `acronym`；
- 用 `del` 表示旧价，却无法说明这是一次文档编辑删除；
- `data-current-price-cents` 写成 `39.00`；
- `time[datetime]` 没有时区；
- 320 CSS 像素下卡片横向裁切；
- 关闭 CSS 后 LED 没有可见全称；
- 安全提示依赖滚动或闪烁才能读全；
- 文案声称已经锁定库存或保存交易。

### 6.5 渐进扩展：增加规格表而不使用旧表格属性

在 `article` 末尾加入：

```html
<div class="table-wrapper">
  <table class="spec-table">
    <caption>台灯规格</caption>
    <tbody>
      <tr>
        <th scope="row">光源</th>
        <td>LED，暖白光</td>
      </tr>
      <tr>
        <th scope="row">成色</th>
        <td>二手，有轻微使用痕迹</td>
      </tr>
    </tbody>
  </table>
</div>
```

加入：

```css
.table-wrapper {
  overflow-x: auto;
}

.spec-table {
  width: 100%;
  border-collapse: collapse;
}

.spec-table caption {
  margin-block-end: 0.5rem;
  font-weight: 700;
  text-align: left;
}

.spec-table th,
.spec-table td {
  border: 1px solid #8c9b94;
  padding: 0.5rem;
  text-align: left;
}
```

扩展后验证：

- 表格没有 `border`、`cellpadding`、`cellspacing`、`align` 或 `bgcolor`；
- `th[scope="row"]` 正确表达每行标题；
- 小屏时包裹层承担滚动，不裁切单元格；
- 打印预览中边框仍可见。

### 6.6 明确错误的机械替换

```html
<!-- 错误案例：只换标签名，内容职责仍未判断 -->
<strong style="font-size: 2rem; color: red;">邻里集市</strong>
<code>SKU-LAMP-001</code>
<del>49.00 元</del>
```

问题：

- 站点名不一定是“强烈重要”文本；
- SKU 只是标识符，不一定是计算机代码；
- 旧价不一定代表一次文档编辑删除；
- 呈现仍散落在行内样式中。

恢复顺序：

1. 把站点名、商品编号和旧价分别命名；
2. 选择 `p`/标题、`data` 和 `s`；
3. 用类集中呈现；
4. 关闭 CSS 检查内容关系；
5. 再比较视觉。

## 7. 邻里集市集成案例

### 7.1 旧页面阅读样本

下面是归档页面的节选，不是完整可运行页面。它只用于盘点，不应部署、嵌入生产站或作为新模板复制。

```html
<!-- 历史归档节选：禁止作为生产页面运行 -->
<center>
  <font face="Arial" color="green" size="+3">邻里集市</font>
  <marquee>当面检查商品，谨防提前转账</marquee>
  <p><big><acronym title="Light Emitting Diode">LED</acronym> 台灯</big></p>
  <p><strike>49.00 元</strike> <font color="red">39.00 元</font></p>

  <table border="1" cellpadding="8" cellspacing="4" bgcolor="#fff7dd">
    <tr>
      <td align="right">商品编号</td>
      <td><tt>SKU-LAMP-001</tt></td>
    </tr>
  </table>

  <applet code="LampViewer.class" width="480" height="320"></applet>
  <button id="favorite">收藏</button>
  <script language="JavaScript" for="favorite" event="onclick">
    window.status = "saved";
  </script>
</center>
```

归档站还使用过以下壳结构：

```html
<!-- 历史 frame 结构节选 -->
<frameset cols="220,*">
  <frame src="catalog.html" name="catalog">
  <frame src="lamp.html" name="content">
  <noframes><a href="lamp.html">打开台灯详情</a></noframes>
</frameset>
```

### 7.2 第 0 步：建立迁移账本

在修改前记录：

| 旧特性 | 原始用途 | 当前替代方向 | 首要风险 |
| --- | --- | --- | --- |
| `center` | 整体卡片和文字居中 | 容器宽度、auto margin、局部 text-align | 两种居中混淆 |
| `font`/`big` | 品牌、标题、价格突出 | 正确标题/文本 + CSS | 语义和字号变化 |
| `tt` | SKU 等宽 | `data` + 等宽 CSS | 误改为 code |
| `strike` | 旧价格 | `s` | 误改为 del |
| `marquee` | 安全提醒 | 静态 aside | 视觉优先级下降 |
| 表格属性 | 边框、底色和间距 | 语义表格 + CSS | border model |
| `applet` | 商品旋转查看器 | 图片/视频/Web 应用或链接 | 插件功能遗漏 |
| 旧事件脚本 | 收藏反馈 | button + `addEventListener()` | 状态边界 |
| frame | 目录和内容分栏 | 页面布局 + 独立 URL | 历史与深链接 |

基线记录至少包含：

```text
入口 URL：
旧页面截图尺寸：
源代码位置：
解析后 DOM：
键盘顺序：
可复制的商品 URL：
后退/前进行为：
旧插件输入与输出：
Network 请求：
Console 错误：
目标浏览器：
```

### 7.3 第 1 步：先固定内容与数据

在迁移外观前，确认不会变化的事实：

```text
listingId = lamp-001
sku = SKU-LAMP-001
previousPriceCents = 4900
currentPriceCents = 3900
updatedAt = 2026-10-10T08:00:00.000Z
```

旧页面写着“49.00 元”和“39.00 元”，现代页面必须保留整数分源值。不要从显示字符串反向做浮点金额计算。更新时间显示为本地可读文字，机器值仍使用 UTC。

### 7.4 第 2 步：重建文档和 URL

先写现代 doctype、语言、编码、viewport、title 和 description。把目录链接改成真实 `href`，让每个商品拥有独立 URL。视觉分栏交给 Grid；只有独立文档确需页内嵌入时才使用 `iframe`。

验收顺序：

1. 直接打开商品 URL；
2. 从目录进入商品；
3. 刷新；
4. 后退和前进；
5. 复制 URL 到新标签；
6. 检查标题和主标题。

### 7.5 第 3 步：重建语义和静态基线

将：

- 品牌名改为普通站点标识；
- 商品名改为 `h1`；
- LED 首次出现写出可见全称并使用 `abbr`；
- SKU 改为 `data`；
- 旧价改为 `s`；
- 安全提醒改为静态 `aside`；
- 规格改为带行标题的表格；
- 插件内容改为可见说明和普通资源链接。

此时先不增加收藏脚本。禁用 CSS 和 JavaScript 后，用户已经能读取完整商品事实。

### 7.6 第 4 步：迁移视觉

为页面容器、标题、价格、提醒和表格建立 CSS 类。逐项对照：

- 容器宽度和居中；
- 文本对齐；
- 字体族和字号；
- 颜色对比；
- 旧价删除线；
- 表格折叠边框、单元格 padding；
- 320 像素宽度、200% 缩放和打印。

不要为了截图相似恢复 `align`、`bgcolor` 或行内样式。

### 7.7 第 5 步：迁移行为并声明边界

最后增加收藏按钮。事件通过 `addEventListener()` 注册，状态通过 `aria-pressed` 和 `role="status"` 表达。因为没有后端，状态只保留在当前页面内存，刷新后重置。

这一步不能新增：

- `fetch()` 收藏请求的假实现；
- `localStorage` 持久化；
- 虚假的成功通知；
- “已同步账号”或“已保存到云端”等文案。

### 7.8 完整现代页面

文件位置：

```text
market-learning/
└── practice/
    └── html-24-migration/
        └── neighbor-market-listing.html
```

将以下完整内容保存为 `neighbor-market-listing.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta
      name="description"
      content="邻里集市阅读台灯静态教学详情，包含价格、成色、规格和交接提醒。">
    <title>阅读台灯 · 邻里集市</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, sans-serif;
        color: #263c34;
        background: #f5f1e8;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        line-height: 1.6;
      }

      a {
        color: #225d48;
      }

      a:focus-visible,
      button:focus-visible {
        outline: 3px solid #b5472c;
        outline-offset: 3px;
      }

      .site-header,
      .page-layout,
      .site-footer {
        width: min(100% - 2rem, 72rem);
        margin-inline: auto;
      }

      .site-header {
        padding-block: 1rem;
      }

      .site-name {
        margin: 0;
        color: #8b2f1c;
        font-weight: 800;
      }

      .page-layout {
        display: grid;
        grid-template-columns: minmax(11rem, 16rem) minmax(0, 1fr);
        gap: 2rem;
        align-items: start;
      }

      .catalog {
        padding: 1rem;
        border: 1px solid #9caaa3;
        border-radius: 0.75rem;
        background: #ffffff;
      }

      .catalog h2 {
        margin-block-start: 0;
      }

      .listing {
        min-width: 0;
        padding: 1.5rem;
        border: 1px solid #9caaa3;
        border-radius: 0.75rem;
        background: #ffffff;
      }

      .listing h1 {
        margin-block-start: 0;
      }

      .product-code {
        font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      }

      .price-line {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.5rem;
      }

      .previous-price {
        color: #5e6863;
      }

      .current-price {
        color: #8b2f1c;
        font-size: 1.5rem;
      }

      .safety-notice {
        margin-block: 1.5rem;
        border-inline-start: 0.375rem solid #b5472c;
        padding: 0.75rem 1rem;
        background: #fff4e8;
      }

      .safety-notice h2 {
        margin-block-start: 0;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .spec-table {
        width: 100%;
        border-collapse: collapse;
      }

      .spec-table caption {
        margin-block-end: 0.5rem;
        font-weight: 700;
        text-align: left;
      }

      .spec-table th,
      .spec-table td {
        border: 1px solid #7c8e85;
        padding: 0.625rem;
        text-align: left;
      }

      .favorite {
        padding: 0.625rem 1rem;
        border: 2px solid #225d48;
        border-radius: 0.5rem;
        color: #ffffff;
        background: #225d48;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .favorite[aria-pressed="true"] {
        color: #225d48;
        background: #ffffff;
      }

      .boundary {
        color: #4b5751;
      }

      .site-footer {
        padding-block: 2rem;
      }

      @media (max-width: 44rem) {
        .page-layout {
          grid-template-columns: 1fr;
        }
      }

      @media print {
        .favorite {
          display: none;
        }

        .listing,
        .catalog {
          border-color: #000000;
        }
      }
    </style>
  </head>
  <body>
    <header class="site-header">
      <p class="site-name"><a href="/">邻里集市</a></p>
      <p>社区闲置物品静态教学页面</p>
    </header>

    <div class="page-layout">
      <nav class="catalog" aria-labelledby="catalog-heading">
        <h2 id="catalog-heading">商品目录</h2>
        <ul>
          <li><a aria-current="page" href="/listings/lamp.html">阅读台灯</a></li>
          <li><a href="/listings/chair.html">实木椅</a></li>
          <li><a href="/listings/books.html">旧书套装</a></li>
        </ul>
      </nav>

      <main>
        <article
          class="listing"
          data-listing-id="lamp-001"
          data-previous-price-cents="4900"
          data-current-price-cents="3900"
          data-updated-at="2026-10-10T08:00:00.000Z">
          <h1>发光二极管（<abbr title="Light Emitting Diode">LED</abbr>）阅读台灯</h1>

          <p>
            商品编号：
            <data class="product-code" value="SKU-LAMP-001">SKU-LAMP-001</data>
          </p>

          <p class="price-line">
            <span>参考价格：</span>
            <s class="previous-price">49.00 元</s>
            <strong class="current-price">39.00 元</strong>
          </p>

          <p>
            信息更新时间：
            <time datetime="2026-10-10T08:00:00.000Z">2026-10-10 16:00（UTC+8）</time>
          </p>

          <aside class="safety-notice" aria-labelledby="safety-heading">
            <h2 id="safety-heading">交易安全提醒</h2>
            <p>请勿提前转账，请在公共地点当面检查商品和电源适配器。</p>
          </aside>

          <section aria-labelledby="spec-heading">
            <h2 id="spec-heading">商品规格</h2>
            <div class="table-wrapper">
              <table class="spec-table">
                <caption>阅读台灯规格与成色</caption>
                <tbody>
                  <tr>
                    <th scope="row">光源</th>
                    <td>LED，暖白光</td>
                  </tr>
                  <tr>
                    <th scope="row">成色</th>
                    <td>二手，灯座有轻微使用痕迹</td>
                  </tr>
                  <tr>
                    <th scope="row">配件</th>
                    <td>电源适配器一只</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="resource-heading">
            <h2 id="resource-heading">检查说明</h2>
            <p>
              旧 Java 查看器不再使用。
              <a href="lamp-inspection.html">打开可打印的台灯检查说明</a>。
            </p>
          </section>

          <section aria-labelledby="favorite-heading">
            <h2 id="favorite-heading">当前页面收藏</h2>
            <button
              class="favorite"
              id="favorite"
              type="button"
              aria-pressed="false">
              收藏
            </button>
            <p id="favorite-status" role="status">
              尚未收藏；状态仅保留在当前页面。
            </p>
          </section>

          <p class="boundary">
            本页为固定教学数据。收藏只存在当前页面内存中；页面没有账号、真实库存、
            预约、付款、持久化或并发控制。
          </p>
        </article>
      </main>
    </div>

    <footer class="site-footer">
      <p>邻里集市 HTML 迁移练习</p>
    </footer>

    <script>
      const listing = document.querySelector(".listing");
      const favoriteButton = document.querySelector("#favorite");
      const favoriteStatus = document.querySelector("#favorite-status");
      const previousPriceCents = Number(listing.dataset.previousPriceCents);
      const currentPriceCents = Number(listing.dataset.currentPriceCents);
      const updatedAtText = listing.dataset.updatedAt;
      const updatedAt = new Date(updatedAtText);

      if (
        !Number.isInteger(previousPriceCents) ||
        !Number.isInteger(currentPriceCents) ||
        previousPriceCents < 0 ||
        currentPriceCents < 0
      ) {
        throw new TypeError("商品价格必须使用非负整数分");
      }

      if (
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(updatedAtText) ||
        Number.isNaN(updatedAt.getTime()) ||
        updatedAt.toISOString() !== updatedAtText
      ) {
        throw new TypeError("商品更新时间必须是有效的 UTC ISO 8601 字符串");
      }

      favoriteButton.addEventListener("click", () => {
        const nextPressed =
          favoriteButton.getAttribute("aria-pressed") !== "true";

        favoriteButton.setAttribute("aria-pressed", String(nextPressed));
        favoriteStatus.textContent = nextPressed
          ? "已在当前页面内存中收藏；刷新后会重置。"
          : "尚未收藏；状态仅保留在当前页面。";
      });
    </script>
  </body>
</html>
```

### 7.9 打开与验证方法

1. 保存完整页面；
2. 直接打开可验证静态内容和当前内存行为；
3. 本例中的根相对目录链接是教学 URL 合同；部署或本地服务时应为它们提供真实页面；
4. 在 Elements 搜索本课旧元素与属性；
5. 用 Tab、Shift+Tab、Enter 和 Space 完成目录与收藏操作；
6. 收藏后刷新，确认状态重置；
7. 禁用 JavaScript 后刷新，确认商品、价格、时间、提醒、规格和检查说明仍在；
8. 在 Console 运行：

```js
const listing = document.querySelector(".listing");
console.table({
  listingId: listing.dataset.listingId,
  previousPriceCents: Number(listing.dataset.previousPriceCents),
  currentPriceCents: Number(listing.dataset.currentPriceCents),
  updatedAt: new Date(listing.dataset.updatedAt).toISOString(),
  compatMode: document.compatMode,
});
```

9. 在 Network 中确认没有收藏、预约、支付或登录请求；
10. 在 320、768 和 1280 CSS 像素宽度检查布局；
11. 放大至 200%，检查价格、表格和焦点轮廓；
12. 打开打印预览，确认表格边框和正文可读。

### 7.10 预期结果

- 目录和商品正文由 CSS Grid 分栏，小屏变为单列；
- 每个目录项是拥有 `href` 的普通链接；
- LED 有可见全称和 `abbr`；
- 旧价使用 `s`，现价使用文字、位置和字号表达；
- 表格使用 `th[scope="row"]`，呈现全部来自 CSS；
- 安全提示静止、完整可见；
- 旧 applet 被说明和普通链接替代；
- 收藏按钮有 pressed 状态和可见状态消息；
- 价格机器值为 `4900`、`3900` 分；
- `updatedAt` 可规范化为 `2026-10-10T08:00:00.000Z`；
- 页面没有业务网络请求，刷新后收藏重置。

### 7.11 迁移记录

每类旧特性使用同一格式记录：

```text
旧特性：
原始用途：
标准状态：
当前替代：
为何不是一一换标签：
视觉回归风险：
行为/URL 回归风险：
DOM/键盘/辅助技术检查：
目标浏览器结果：
未验证范围：
```

示例：

```text
旧特性：table[cellspacing="4"]
原始用途：单元格之间保留 4 像素空隙
标准状态：过时呈现属性，新代码不得使用
当前替代：border-collapse: separate; border-spacing: 0.25rem
为何不是一一换标签：间距属于边框模型，不是表格内容语义
视觉回归风险：若同时设置 collapse，间距会消失
行为/URL 回归风险：无
DOM/键盘/辅助技术检查：caption、行标题和 scope 保持不变
目标浏览器结果：记录实际浏览器、版本和截图
未验证范围：记录尚未检查的打印或强制颜色模式
```

## 8. 常见错误与排查路径

### 8.1 把“仍能显示”写成“仍是标准”

**错误结论：**Chrome 还能显示 `<font>`，所以它仍受支持，可以继续使用。

**证据冲突：**

- Elements 证明浏览器为兼容历史内容创建了节点；
- HTML 标准的作者要求明确把 `font` 列为完全过时；
- 校验器会报告非合规；
- 当前能显示不能保证默认样式、辅助技术结果或未来产品要求。

**恢复：**分别记录解析兼容、作者合规和产品可用结论。

### 8.2 错误的机械替换清单

| 错误替换 | 为什么错 | 正确判断 |
| --- | --- | --- |
| `font` → 带行内样式的 `span` | 只搬家，没有建立样式系统 | 先确定内容语义，再用类 |
| `center` → `div align="center"` | `align` 也过时 | 区分文本对齐、盒子或布局居中 |
| `big` → `strong` | 字大不等于重要 | 标题用标题；纯字号用 CSS |
| `tt` → `code` | 等宽不等于代码 | 代码/输入/输出/变量分别用 `code`/`kbd`/`samp`/`var`，纯外观用 CSS |
| `strike` → `del` | 删除线不一定是编辑删除 | 不再适用用 `s`，修订删除才用 `del` |
| `frameset` → 一个全屏 `iframe` | URL、历史、焦点和结构问题仍在 | 完整页面 + 普通导航 + CSS 布局 |
| `applet` → `embed` | 浏览器插件运行时并未恢复 | 按媒体、图表、文档或应用重建 |
| `marquee` → 无限 CSS 动画 | 原可访问性问题被复制 | 静态优先；必要动效可暂停并减少 |
| `acronym` → 只有 `abbr[title]` | title 不是稳定可见说明 | 首次出现写出可见全称 |
| `cellspacing` → collapse + border-spacing | 折叠模型会吞掉 spacing | 选择 separate 或重新设计网格 |
| `language` → `type="text/javascript"` | 经典 JS 的 MIME type 也可省略 | 经典脚本省略；模块用 `type="module"` |

### 8.3 把所有旧外观都改成内联 CSS

**错误案例：**

```html
<span style="font-family: Arial; color: red; font-size: 24px; text-align: center;">
  今日推荐
</span>
```

**问题：**

- `text-align` 放在行内 span 上不能完成容器对齐任务；
- 内容仍没有标题语义；
- 样式无法统一复用和审计；
- 响应式、打印和主题覆盖困难。

**排查：**关闭 CSS，看内容结构；在 Computed 追踪每条样式来源；搜索重复 `style=`。

### 8.4 表格间距迁移后消失

**现象：**旧页单元格之间有 4 像素空隙，新页没有。

**常见代码：**

```css
table {
  border-collapse: collapse;
  border-spacing: 4px;
}
```

**根因：**`border-spacing` 对折叠边框模型不产生旧 `cellspacing` 的效果。

**恢复选择：**

- 需要空隙：使用 `border-collapse: separate` 和 `border-spacing`；
- 需要单线网格：保留 `collapse`，接受不同视觉并重新定义边框；
- 不要同时声明矛盾目标。

**复验：**检查 Computed 的 `border-collapse`、截图和打印预览。

### 8.5 用 `iframe` 复制 frame 布局

**现象：**外观类似，但刷新后回到默认内容，详情 URL 不能分享，后退行为混乱。

**根因：**只替换了可视容器，没有重建导航和文档模型。

**排查路径：**

1. 详情是否有独立 URL；
2. 链接是否是真实 `href`；
3. 地址栏是否随内容变化；
4. 后退/前进是否反映用户导航；
5. 焦点是否进入嵌套文档后难以返回；
6. 页面标题是否描述当前详情。

**恢复：**优先普通页面导航；若是单页应用，也应明确路由、历史和焦点管理。

### 8.6 把旧插件文件直接交给当前 `embed`

**错误案例：**

```html
<embed src="listing-tour.swf" type="application/x-shockwave-flash">
```

**现象：**空白、下载提示或不受支持。

**根因：**当前 `embed` 元素仍存在，不代表浏览器仍提供该插件运行时。

**恢复：**从原用户任务重建；视频转开放媒体，图表转数据表加 SVG/Canvas，文档提供链接或当前预览。不能靠改 MIME 类型伪装资源格式。

### 8.7 把 `marquee` 改成无法停止的动画

**错误案例：**

```css
.notice {
  animation: slide 12s linear infinite;
}
```

**问题：**标签消失了，但自动运动、无法暂停、文本离开视区和减少动效缺失仍然存在。

**恢复：**默认静态显示。若运动必需，增加按钮、停止状态、完整静态文本和 `prefers-reduced-motion` 路径。

### 8.8 `abbr` 只有悬停提示

**现象：**鼠标悬停可看到全称，触屏和键盘用户不知道缩写含义。

**恢复：**

```html
<p>发光二极管（<abbr title="Light Emitting Diode">LED</abbr>）台灯</p>
```

首次出现给可见全称；`title` 只是补充，不是唯一来源。

### 8.9 删除 `language` 后脚本时序改变

只删除 `language="JavaScript"` 通常不改变经典脚本行为。真正的回归常来自同时做了其他机械修改，例如：

```html
<!-- 错误案例：把经典脚本顺手改成 module，却未评估语义 -->
<script type="module" src="legacy.js"></script>
```

module 默认延迟执行、使用严格模式、拥有模块作用域，并按模块规则解析导入。应把“删除无效 language”和“模块化脚本”拆成两个可验证步骤。

### 8.10 内联事件迁移后按钮触发两次

**现象：**点击一次，状态切换两次。

**证据：**

- 元素仍保留 `onclick`；
- 初始化函数又注册一次 `addEventListener()`；
- 开发热更新或重复挂载再次注册。

**恢复：**移除旧入口，保证初始化一次；组件化场景在销毁时使用同一函数引用清理监听器。

### 8.11 只比较截图

截图不能证明：

- 标题层级；
- 表头关系；
- 链接目标；
- 焦点顺序；
- 页面历史；
- 状态是否持久化；
- 价格是否仍为整数分；
- 时间是否仍为 UTC；
- Network 是否新增了请求。

至少同时保留 DOM、Accessibility、键盘、URL、Console 和 Network 证据。

### 8.12 诊断与恢复记录

```text
目标：迁移旧商品规格表
现象：新表格单元格之间没有旧页的 4 像素空隙
源代码证据：旧表使用 cellspacing="4"
Computed 证据：新表 border-collapse 为 collapse
排除项：padding 已正确迁移；表头和数据内容未丢失
根因：折叠边框模型不呈现 border-spacing
修复：按视觉基线改为 separate，并设置 border-spacing: 0.25rem
复验：同尺寸截图空隙恢复；caption、th 和 scope 不变
剩余风险：尚未在目标打印机驱动中验证
```

不应使用以下方法制造“通过”：

- 删除对照截图；
- 关闭 HTML 校验规则；
- 用浏览器扩展恢复插件；
- 把所有错误吞掉后显示固定成功文案；
- 把链接改成无 `href` 的点击元素；
- 为了保存演示状态擅自增加 `localStorage`；
- 把未测试的 Safari、Firefox 或读屏结果写成已通过。

## 9. 课后题

### 9.1 理解题

1. 为什么浏览器仍解析 `font`，却不代表作者可以继续使用？
2. “过时”与“非标准”有什么区别？
3. HTML 的错误恢复为什么不能作为正确写法的证据？
4. `center` 最少可能对应哪两种不同 CSS 任务？
5. `strike` 为什么不能总是替换成 `del`？
6. 为什么 `frameset` 不能机械替换成一个大 `iframe`？
7. `applet` 改成 `embed` 为什么通常不能恢复功能？
8. 当前 `embed` 元素本身是否过时？
9. `cellspacing` 迁移到 `border-spacing` 时还要检查什么？
10. 经典 JavaScript 的 `script[language="JavaScript"]` 应如何迁移？

<details>
<summary>查看理解题答案</summary>

1. 浏览器承担读取历史网页的兼容责任；作者合规规则仍明确禁止新代码使用完全过时的 `font`。
2. 过时表示不再适合作者使用；非标准表示没有稳定的通用标准合同。二者可能重叠，但不是同义词。
3. 错误恢复只定义浏览器遇到错误输入时怎样生成 DOM，不会把错误输入变成合规、可维护的新代码。
4. 文本内容对齐可能使用 `text-align: center`；固定宽度盒子居中可能使用 `margin-inline: auto`。Flex/Grid 子项居中又是其他任务。
5. `del` 表示文档编辑删除；若内容只是已不准确或不再相关，例如旧价格，通常使用 `s`。
6. frame 迁移涉及独立 URL、历史、标题、滚动、焦点和共享结构；大 iframe 只复制外观。
7. `applet` 依赖已退出主流浏览器的 Java 插件运行时；换标签不会提供运行时，也不会转换应用。
8. 不是。当前 `embed` 是现行元素；旧插件依赖和部分旧呈现属性已经过时。
9. 必须检查 `border-collapse`。在折叠边框模型中，`border-spacing` 不会产生旧 `cellspacing` 的空隙。
10. 对经典 JavaScript 直接删除 `language`，通常也省略冗余 `type="text/javascript"`；只有真实采用 JavaScript 模块时才使用 `type="module"`。

</details>

### 9.2 语义选择题

为以下旧写法选择现代方案，并说明理由：

1. `<big>第二章</big>`；
2. `<tt>npm run build</tt>`；
3. `<tt>SKU-2048</tt>`；
4. `<strike>不再提供上门配送</strike>`；
5. `<strike>把“周六”修订为“周日”</strike>`。

<details>
<summary>查看语义题答案</summary>

1. 若它是章节标题，使用符合层级的 `h2`；字号由 CSS 负责。
2. 若表示用户应输入的命令，使用 `kbd`，内部可按需要包含 `code`。
3. SKU 是机器值，可使用 `data[value]`；等宽外观由 CSS 负责。
4. 若描述已不再适用的信息，使用 `s`。
5. 若记录文档修订，旧“周六”使用 `del`，新“周日”可使用 `ins`，并可添加合法时间机器值。

</details>

### 9.3 迁移推理题

旧站用左侧 frame 显示目录，右侧 frame 显示详情。产品要求：

- 详情可分享；
- 浏览器后退回到上一件商品；
- 小屏目录在正文上方；
- 搜索可以索引每件商品。

答案标准：每件商品使用独立 URL 和完整文档或明确路由；目录使用普通链接；共享结构由模板/组件生成；Grid/Flex 负责宽屏分栏，小屏改为单列；迁移验证包括刷新、后退、前进、复制 URL、标题、焦点和抓取入口。只写“把 frame 改为 iframe”不得分。

### 9.4 故障推理题

开发者把：

```html
<table border="1" cellpadding="8" cellspacing="4">
```

改成：

```css
table {
  border: 1px solid;
  border-collapse: collapse;
  border-spacing: 4px;
}

td {
  padding: 8px;
}
```

为什么结果与旧页面不一致？

<details>
<summary>查看故障题答案</summary>

旧 `border` 往往同时影响表格网格的视觉预期，而新代码只给 table 外框加边；单元格没有边框。`border-collapse: collapse` 又使 `border-spacing` 不产生旧 `cellspacing` 的间距。应明确选择边框模型，并分别设置 `th, td` 的 border 和 padding。

</details>

## 10. 实践练习

### 10.1 基础：呈现元素迁移

文件位置：

```text
practice/html-24-migration/basic.html
```

输入片段：

```html
<center>
  <font color="blue" size="+2">社区旧书</font>
  <p><big>三册套装</big></p>
  <p><tt>BOOK-SET-003</tt></p>
  <p><strike>25.00 元</strike> 18.00 元</p>
</center>
```

要求：

- 建立完整现代 HTML 文档；
- 判断“社区旧书”和“三册套装”谁是标题；
- SKU 使用合适的机器值元素；
- 旧价使用符合含义的元素；
- 盒子居中与文本居中分别处理；
- 价格源值写为 `2500` 和 `1800` 分；
- 增加 UTC 更新时间；
- 不使用行内样式；
- 记录 320 像素和 200% 缩放结果。

答案标准：

- 不存在五个旧呈现元素；
- 标题选择由内容层级解释；
- SKU 不因等宽外观被误标成代码；
- 旧价若只是失效价格使用 `s`；
- CSS 类可复用；
- 关闭 CSS 后内容关系仍清楚；
- 价格和时间机器值满足合同。

### 10.2 提升：迁移旧规格表与 frame 导航

文件位置：

```text
practice/html-24-migration/advanced.html
```

要求：

- 将一个使用 `align`、`bgcolor`、`border`、`cellpadding`、`cellspacing` 的数据表迁移；
- 保留 `caption`、列标题、行标题和 `scope`；
- 明确选择折叠或分离边框模型；
- 建立包含三件商品的普通链接目录；
- 每件商品拥有可描述的 URL 方案；
- 宽屏双栏、小屏单栏；
- 记录刷新、后退、前进、复制 URL 和键盘顺序；
- 不使用 iframe 模拟主布局。

答案标准：

- 表格语义先于视觉迁移完成；
- 所有旧呈现属性消失；
- 能解释 `border-spacing` 与 `border-collapse` 的关系；
- 链接有真实 `href`；
- 目录和正文 DOM 顺序合理；
- 小屏无内容裁切；
- 旧 frame 行为由 URL 证据而不是截图验收。

### 10.3 故障注入：三类有意回归

文件位置：

```text
practice/html-24-migration/fault-record.md
```

依次注入并恢复：

1. 把表格从 `separate` 改为 `collapse`，观察间距变化；
2. 同时保留 `onclick` 和 `addEventListener()`，观察重复触发；
3. 把普通脚本机械改为 `type="module"`，观察作用域或时序变化。

每次使用：

```text
目标：
故障注入：
预期：
实际现象：
源代码证据：
DOM/Computed 证据：
Console/Network 证据：
根因：
最小修复：
复验：
未验证范围：
```

答案标准：

- 第一个故障定位到边框模型，不归因于浏览器随机差异；
- 第二个故障能证明两个事件入口都存在；
- 第三个故障区分“删除 language”和“改成 module”两项变化；
- 修复不恢复过时属性；
- 不关闭校验或浏览器安全设置；
- 每项都有复验证据。

### 10.4 综合：邻里集市迁移报告

基于第 7 节页面完成报告，至少覆盖：

- 标准状态；
- 原始意图；
- 现代替代；
- 错误机械替换；
- 视觉风险；
- 行为和 URL 风险；
- 键盘与无障碍；
- 整数分和 UTC；
- 静态/当前内存边界；
- 目标浏览器与未验证范围。

完成标准：每一个结论都能指向源代码、DOM、浏览器操作或规范资料。不能只写“已现代化”“看起来一致”或“浏览器支持”。

## 11. 阶段验收

### 11.1 HIS-005：废弃呈现元素与 CSS 替代

- [ ] `font` 的字体、颜色、字号已迁移到可复用 CSS；
- [ ] `center` 已按文本、盒子或布局意图区分；
- [ ] `big` 没有机械替换为 `strong`；
- [ ] `tt` 已按代码、输入、输出、变量或纯外观分类；
- [ ] `strike` 已在 `s`、`del` 或纯装饰之间正确选择；
- [ ] 关闭 CSS 后内容关系仍清楚。

### 11.2 HIS-006：frame 迁移

- [ ] `frameset`、`frame`、`noframes` 已从现代页面删除；
- [ ] 有价值的 noframes 内容已进入主页面；
- [ ] 每个主要内容拥有可直接访问的 URL；
- [ ] 刷新、后退、前进和复制 URL 已验证；
- [ ] CSS 负责分栏；
- [ ] `iframe` 只用于真正独立的嵌入文档。

### 11.3 HIS-007：插件与嵌入

- [ ] `applet` 和旧插件资源不再加载；
- [ ] 原插件任务已按媒体、图表、文档或应用分类；
- [ ] 核心内容有普通文本、表格或链接基线；
- [ ] 当前 `embed` 没有被错误标记为整体过时；
- [ ] 使用 `embed` 时有准确标题和外部链接；
- [ ] 不安装旧插件也能完成核心任务。

### 11.4 HIS-008：滚动、闪烁与可访问动效

- [ ] `marquee` 和 `blink` 已删除；
- [ ] 安全提示默认静止且完整可见；
- [ ] 必要运动有暂停、停止或隐藏机制；
- [ ] 非必要运动尊重减少动效偏好；
- [ ] 没有高频闪烁；
- [ ] 库存或紧迫性文案不伪造实时数据。

### 11.5 HIS-009：旧呈现属性

- [ ] `align` 已按真实对齐任务迁移；
- [ ] `bgcolor` 已迁移并检查对比度；
- [ ] `border` 已明确作用到容器或单元格；
- [ ] `cellpadding` 已迁移为 cell padding；
- [ ] `cellspacing` 已按边框模型迁移；
- [ ] 表头关系、响应式和打印没有因视觉迁移回归。

### 11.6 HIS-010：浏览器容错与新代码标准

- [ ] 报告分别记录解析兼容、作者合规和产品可用；
- [ ] 没有用“能显示”证明“可继续写”；
- [ ] 源代码和解析后 DOM 都已检查；
- [ ] `script[language]` 已删除，脚本类型和时序经过评估；
- [ ] 旧事件模式已迁移到 DOM 事件；
- [ ] 兼容性结论包含核验日期、目标浏览器和未验证范围。

### 11.7 数据、边界与提交证据

- [ ] 价格源值使用非负整数分；
- [ ] 存储型时间使用 UTC ISO 8601；
- [ ] 静态内容和当前内存状态有明确说明；
- [ ] 没有虚构登录、授权、库存、预约、支付或持久化；
- [ ] 禁用 JavaScript 后核心内容仍可读；
- [ ] Network 没有未设计的业务请求；
- [ ] 没有运行或部署旧完整页面作为生产页面。

提交记录：

```text
现代页面路径：
旧样本来源与只读边界：
目标浏览器与版本：
HTML 校验结果：
旧特性搜索结果：
源代码/DOM 差异：
320px 结果：
200% 缩放结果：
打印结果：
键盘路径：
URL/历史结果：
禁用脚本结果：
整数分证据：
UTC 证据：
Network 请求范围：
未验证浏览器或辅助技术：
```

只有所有适用项和相关复验通过，才能把迁移标记为完成。未测试的浏览器、读屏、打印设备或真实服务端行为必须明确记录为未验证，不能推断为通过。

## 12. 常见问题

### Q1：废弃、过时和 obsolete 是完全相同的术语吗？

不同资料的中文翻译可能使用“废弃”“弃用”“过时”。本课以 HTML 标准的作者要求为准：obsolete but conforming 会触发警告且不应继续写；entirely obsolete/non-conforming 不得由作者使用。阅读资料时应看具体分类，不只看中文标签。

### Q2：为什么标准不直接要求浏览器删除 `font`？

开放 Web 包含大量无法统一升级的历史文档。浏览器保留读取行为可以避免内容突然损坏，但标准同时禁止新作者继续增加这类债务。

### Q3：校验器通过就代表迁移完成吗？

不代表。校验器主要检查语法和作者合规，不能证明视觉、键盘、URL、历史、数据合同和业务边界正确。

### Q4：`center` 应该替换成 `text-align: center` 吗？

有时可以，但不是总是。文本居中用 `text-align`；固定宽度块居中常用 auto margin；Flex/Grid 子项居中使用布局属性。先确认对象和轴。

### Q5：旧价格应该使用 `s` 还是 `del`？

商品旧价格通常表示已不再适用，使用 `s`。若文档明确记录一次编辑修订，使用 `del`，并可配合 `ins` 和有效时间。

### Q6：为了像旧页一样等宽，可以全部使用 `code` 吗？

不可以。`code` 表示计算机代码。用户输入用 `kbd`，程序输出用 `samp`，变量用 `var`；SKU 等普通标识可以用 `data` 或普通文本加 CSS。

### Q7：`iframe` 是不是也过时了？

不是。`iframe` 是现行元素，用于嵌套独立文档。过时的是 `frameset`/`frame` 页面布局，以及 iframe 上若干旧呈现属性。现行不代表应滥用于主页面布局。

### Q8：`embed` 到底是否过时？

当前 `embed` 元素不是过时元素。它仍可表示外部嵌入资源，例如由浏览器内置查看器处理的 PDF。旧插件生态和 `align`、`hspace`、`vspace`、`name` 等旧属性已经过时。使用时仍需普通链接和目标浏览器验证。

### Q9：为什么不能把 applet 自动转成 WebAssembly？

WebAssembly 是执行格式，不会自动转换 Java UI、插件 API、文件访问、安全模型和可访问性。必须先恢复业务功能和数据合同，再选择 HTML、CSS、JavaScript、WebAssembly 或服务端方案。

### Q10：静态安全提示还需要 `role="alert"` 吗？

通常不需要。首屏已有的静态提示使用标题和正文即可。`alert` 适合需要立即宣布的动态重要消息；滥用会制造重复或打断。

### Q11：用 CSS 动画替代 marquee 是否算现代化？

只在标签层面现代化不够。必须判断运动是否必要，并处理暂停、停止、隐藏、完整静态文本、减少动效和闪烁风险。

### Q12：`abbr[title]` 是否足以解释缩写？

不总是。title 提示在触屏、键盘和部分辅助技术中的可发现性不稳定。首次出现最好写出可见全称。

### Q13：表格使用 `border-collapse: collapse` 还是 `separate`？

取决于视觉合同。单线网格常用 collapse；需要单元格间空隙时使用 separate 和 `border-spacing`。不能同时要求折叠边框和旧 cellspacing 空隙。

### Q14：删除 `language="JavaScript"` 后是否必须添加 `type="text/javascript"`？

不必。经典 JavaScript 脚本可以省略 type。真实使用 JavaScript 模块时写 `type="module"`，但模块化是独立行为变化，需要单独验证。

### Q15：内联 `onclick` 是否已经完全不受标准支持？

不能这样概括。事件处理内容属性仍有标准定义，但它们把内容和行为耦合，也不利于严格 CSP 和集中生命周期管理。现代工程通常迁移到 `addEventListener()`；旧 `script[for][event]` 更应迁移。

### Q16：只在最新 Chrome 测试是否足够？

不够。兼容目标由项目用户和支持矩阵决定。至少记录具体浏览器与版本，并把 Safari、Firefox、移动设备和辅助技术的未测项写入未验证范围。

## 13. 扩展阅读

规范与兼容性资料核验日期：2026-10-10。HTML 是 Living Standard；日期表示本教材核验快照，不把规范冻结成固定版本。兼容性表只能帮助确定测试范围，最终结论仍应来自项目目标浏览器和辅助技术实测。

- [WHATWG：Obsolete features](https://html.spec.whatwg.org/multipage/obsolete.html)：核对 obsolete but conforming、完全过时元素、旧属性和浏览器实现兼容要求。
- [WHATWG：Parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html)：核对 tokenization、tree construction、parse error 与错误恢复。
- [WHATWG：HTML introduction and history](https://html.spec.whatwg.org/multipage/introduction.html#introduction-history)：理解呈现标记从 HTML 作者模型中移除的历史。
- [WHATWG：iframe、embed 与 object](https://html.spec.whatwg.org/multipage/iframe-embed-object.html)：确认 `embed` 仍是现行元素，并比较嵌入模型。
- [WHATWG：script 元素](https://html.spec.whatwg.org/multipage/scripting.html#the-script-element)：核对经典脚本、module、数据块和脚本属性。
- [WHATWG：文本级语义](https://html.spec.whatwg.org/multipage/text-level-semantics.html)：核对 `abbr`、`s`、`code`、`kbd`、`samp`、`var` 等现代语义。
- [WHATWG：edits](https://html.spec.whatwg.org/multipage/edits.html)：核对 `del` 与 `ins` 的文档修订含义。
- [W3C WAI：WCAG 2.2 Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)：核对自动移动、闪烁、滚动和自动更新内容的控制要求。
- [W3C WAI：Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html)：理解非必要运动和减少动效路径。
- [MDN：`embed` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/embed)：查看当前浏览器支持、内置内容处理和旧插件边界。
- [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data)：查看兼容数据来源并据此制定实测范围，而不是替代实测。
- [Nu HTML Checker](https://validator.w3.org/nu/)：检查作者语法；不要把校验通过当作完整产品验收。

阅读资料时始终追问：

1. 这段要求写给作者还是浏览器实现者？
2. 它描述现行语义、历史兼容，还是浏览器数据？
3. “支持”指解析、渲染、API、无障碍，还是完整用户任务？
4. 项目目标浏览器是否已经实际验证？

## 我现在能做到什么

我能把“浏览器仍能打开旧页面”拆分为解析兼容、作者合规和产品可用三个判断。我能先恢复旧代码的内容、布局、插件、动效、元信息和事件意图，再选择现行 HTML、CSS 与 DOM API；能正确迁移指定旧元素和属性，避免把当前 `embed` 误标为过时，并用视觉、DOM、键盘、URL、数据和网络证据证明邻里集市页面完成了迁移。

## 单元导航

- [上一课：元素、属性与 DOM API 索引](01-element-attribute-api-index.md)
- [返回第八章入口](../08-html-element-reference.md)
- [返回 HTML 模块](../README.md)
