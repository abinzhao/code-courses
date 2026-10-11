# 标题大纲、阅读顺序与 ARIA：保持结构一致

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 用显式标题层级和 DOM 顺序表达内容关系，并把 ARIA 限制在原生语义无法覆盖的边界。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `STR-009`、`STR-010`、`STR-011` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

用显式标题层级和 DOM 顺序表达内容关系，并把 ARIA 限制在原生语义无法覆盖的边界。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 STR-009（`h1` 至 `h6` 显式标题层级）、STR-010（`hgroup` 与标题辅助文字）、STR-011（DOM 阅读顺序与视觉位置）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `h1` 至 `h6` 是显式层级

`h1` 到 `h6` 表示六级标题，不是六种字号。数字越大，层级越深：

```html
<h1>邻里集市帮助中心</h1>
<h2>发布商品</h2>
<h3>填写商品信息</h3>
<h4>填写价格</h4>
<h5>价格单位</h5>
<h6>整数分示例</h6>
```

这段代码展示了语法，不意味着普通页面必须用满六级。层级深到 `h5`、`h6` 时，应再次检查内容是否过度嵌套，或是否适合拆成独立页面。

本教材采用以下可预测规则：

- 页面有一个描述主主题的 `h1`；
- `h2` 是 `h1` 下的主要主题；
- `h3` 是某个 `h2` 下的子主题，依此类推；
- 不依赖 `article` 或 `section` 自动把内部 `h1` 改成合适级别；
- 组件放进具体页面时，要根据所在上下文选择实际标题级别。

HTML 曾经描述过基于分节元素推导层级的大纲思路，但浏览器和辅助技术没有形成可依赖的一致实现。写作者应直接用 `h1` 至 `h6` 表达真实层级。

### 4.2 标题“跳级”要看方向和含义

下面两种变化不能只靠“数字不连续”得出同一结论。

#### 向下进入子主题时跳级

```text
h2 商品状况
  h4 提手磨损
```

从 `h2` 直接进入 `h4`，通常意味着缺少 `h3` 层。若“提手磨损”是“商品状况”的直接子主题，应改为 `h3`。若中间确实存在一个主题，则应补出有内容、有标题的 `h3`，不能为了数字连续制造空标题。

#### 向上结束子主题时跨级

```text
h2 商品状况
  h3 外观
    h4 篮口
h2 交接安排
```

从 `h4` 回到 `h2` 是在关闭“篮口”“外观”和“商品状况”的内部层级，开始新的主要主题。这通常是合理的，不需要插入无意义的 `h3`。

实际判断步骤是：

1. 先写出标题文字的父子关系；
2. 看下一标题是在进入更深主题，还是结束若干主题；
3. 进入更深主题时通常只增加一级；
4. 回到上层时可以一次减少多级；
5. 不按默认字号选择级别，也不为修复数字而添加空标题。

### 4.3 `hgroup` 组合标题与配套文字

`hgroup` 用于把一个 `h1` 至 `h6` 标题与一个或多个配套段落组合起来，例如副标题或说明：

```html
<hgroup>
  <h1>手工竹编菜篮</h1>
  <p>来自梧桐社区的闲置生活用品</p>
</hgroup>
```

其中只有 `h1` 是标题。`p` 是配套文字，不会变成第二个标题。`hgroup`：

- 不创建新的分节；
- 不允许用多个标题假装“主标题加副标题”；
- 不会自动调整标题级别；
- 不是为了给任意文字加同一个外框。

若只是一个标题，没有配套文字，直接写标题即可，不必套 `hgroup`。

### 4.4 DOM 阅读顺序与视觉位置

假设 DOM 先写商品，再写交易提醒：

```html
<div class="layout">
  <article>商品详情</article>
  <aside>交易提醒</aside>
</div>
```

CSS 可以把 `aside` 放到右栏或视觉上的更高位置。屏幕阅读器通常仍按 DOM 先读 `article`，键盘焦点也通常按 DOM 中可聚焦元素的先后移动。

合理做法是：

- DOM 顺序本身先做到有意义；
- CSS 用网格或布局改变二维位置，但不制造相反的故事顺序；
- 不用正值 `tabindex` 人工追赶视觉位置；
- 小屏、无样式、放大和读屏状态下都复验顺序；
- 若视觉设计必须把关键内容提前，先考虑同步调整 DOM，而不是只用 `order`。

视觉上的“左到右、上到下”是二维结果，DOM 是一条线。二者不必像素级一致，但不能让读者对“下一步是什么”得到互相冲突的答案。

### 4.5 原生语义与 ARIA 的边界

原生元素同时提供语义、默认角色和较稳定的辅助技术支持。ARIA 主要用于补充原生 HTML 缺少的名称、描述、状态或复杂组件关系。

| 目标 | 优先写法 | 不推荐写法 | 原因 |
| --- | --- | --- | --- |
| 主内容 | `<main>` | `<div role="main">` | 有现成原生元素 |
| 导航 | `<nav>` | `<div role="navigation">` | 原生结构更直接 |
| 标题 | `<h2>` | `<div role="heading" aria-level="2">` | 原生标题有默认导航支持 |
| 搜索区域 | `<search>` | `<div role="search">` | 现代 HTML 已有对应元素 |
| 命名第二个导航 | `<nav aria-label="商品页内">` | 再加 `role="navigation"` | 只需补名称，不必重复角色 |
| 可点击操作 | `<button>` | `<div role="button">` | 后者还需自行补键盘和状态行为 |

需要记住：

- 不要给 `nav` 再写 `role="navigation"`，给 `main` 再写 `role="main"`；
- `aria-label` 不会让 `div` 自动拥有正确页面结构；
- `role="presentation"` 或 `role="none"` 可能抹除有用语义，不能用来“清理地标列表”；
- ARIA 不能改变 DOM 阅读顺序，也不能修复错误的标题父子关系；
- 若原生元素能表达含义，先用原生元素，再按确切需求补 ARIA。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `STR-009`：`h1` 至 `h6` 显式标题层级
- `STR-010`：`hgroup` 与标题辅助文字
- `STR-011`：DOM 阅读顺序与视觉位置

## 6. 最小可运行案例

在个人练习目录中新建 `practice/02-headings-reading-order-aria/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 STR-009（`h1` 至 `h6` 显式标题层级） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 STR-010（`hgroup` 与标题辅助文字） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 为 STR-011（DOM 阅读顺序与视觉位置） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
5. 在打开页面前写下预期 DOM、默认行为或请求结果；
6. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
7. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

现在把最小案例扩展成包含搜索、多个导航、文章内分节、补充提醒和两层联系方式的完整商品详情页。

### 7.1 完整商品详情页的 ASCII 结构图

```text
页面
├── 跳过导航链接
├── 页级 header
│   ├── 品牌
│   ├── nav「站点」
│   └── search「商品」
├── main
│   └── div.layout（只负责网格）
│       ├── article
│       │   ├── 文章 header
│       │   │   ├── hgroup → h1 + 副标题
│       │   │   └── nav「商品页内」
│       │   ├── section → h2 商品状况
│       │   │   └── section → h3 提手与篮体
│       │   ├── section → h2 交接安排
│       │   └── 文章 footer → address 发布者联系
│       └── aside「交易提醒」→ h2
└── 页级 footer
    ├── nav「页脚」
    └── address 站点维护联系
```

`div.layout` 没有独立主题，只为 CSS 网格服务，所以保留 `div`。这正是通用容器的合理用途。

### 7.2 运行卡

| 项目 | 内容 |
| --- | --- |
| 文件路径 | `practice/html-02/landmarks/index.html` |
| 打开方式 | 保存完整文件后直接用浏览器打开；提交搜索会重新打开带 `?q=` 的当前文件 |
| 预期结果 | 宽屏时商品在左、提醒在右；窄屏或无样式时按商品后提醒的 DOM 顺序阅读；三个导航名称可区分 |
| 故障检查 | 布局异常先确认代码是否完整；链接跳转失败核对 `href` 与 `id`；地标异常查看 Accessibility 树和祖先关系 |

### 7.3 完整文件

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="邻里集市手工竹编菜篮详情与当面交接说明。">
  <title>手工竹编菜篮 · 邻里集市</title>
  <style>
    :root {
      color-scheme: light;
      font-family: system-ui, sans-serif;
      line-height: 1.6;
    }

    body {
      max-width: 72rem;
      margin: 0 auto;
      padding: 1rem;
    }

    .skip-link {
      position: absolute;
      left: -9999px;
    }

    .skip-link:focus {
      position: static;
    }

    .site-header,
    .site-footer {
      padding: 1rem;
      background: #f3f0e8;
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(14rem, 1fr);
      gap: 1.5rem;
      margin-block: 1.5rem;
    }

    .product,
    .safety-note {
      padding: 1rem;
      border: 1px solid #8a8174;
    }

    :focus-visible {
      outline: 3px solid #005fcc;
      outline-offset: 3px;
    }

    @media (max-width: 44rem) {
      .layout {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">跳到主要内容</a>

  <header class="site-header">
    <p><a href="./">邻里集市</a></p>

    <nav aria-label="站点">
      <ul>
        <li><a href="#product">商品详情</a></li>
        <li><a href="#site-contact">联系站点</a></li>
      </ul>
    </nav>

    <search aria-label="商品">
      <form method="get">
        <label for="q">搜索商品</label>
        <input id="q" name="q" type="search">
        <button type="submit">搜索</button>
      </form>
    </search>
  </header>

  <main id="main-content">
    <div class="layout">
      <article id="product" class="product">
        <header>
          <hgroup>
            <h1>手工竹编菜篮</h1>
            <p>来自梧桐社区的闲置生活用品</p>
          </hgroup>
          <p>
            价格：<data value="6800">68 元</data>，
            状态：可预约查看。
          </p>

          <nav aria-label="商品页内">
            <ul>
              <li><a href="#condition">商品状况</a></li>
              <li><a href="#pickup">交接安排</a></li>
            </ul>
          </nav>
        </header>

        <section id="condition">
          <h2>商品状况</h2>
          <p>篮体完整，无断裂，底部有轻微使用痕迹。</p>

          <section>
            <h3>提手与篮体</h3>
            <p>提手连接牢固，交接时可以再次检查承重情况。</p>
          </section>
        </section>

        <section id="pickup">
          <h2>交接安排</h2>
          <p>周六下午在梧桐社区东门当面交接。这里是业务地点，不是作者联系信息，因此使用普通段落。</p>
        </section>

        <footer>
          <p>商品编号：<code>listing-basket-01</code></p>
          <address>
            发布者联系：
            <a href="mailto:seller@example.invalid">seller@example.invalid</a>
          </address>
        </footer>
      </article>

      <aside class="safety-note" aria-labelledby="safety-title">
        <h2 id="safety-title">交易提醒</h2>
        <p>请在公共地点检查商品。本教学页没有真实支付或预约能力。</p>
      </aside>
    </div>
  </main>

  <footer id="site-contact" class="site-footer">
    <nav aria-label="页脚">
      <a href="#product">返回商品详情</a>
    </nav>
    <address>
      站点维护联系：
      <a href="mailto:team@example.invalid">team@example.invalid</a>
    </address>
    <p><small>示例邮箱使用保留域名，不接收真实邮件。</small></p>
  </footer>
</body>
</html>
```

### 7.4 从无样式阅读顺序复验

本例的 CSS 把商品和提醒排成两列，但没有改变 DOM 顺序。按下面步骤检查：

1. 先正常打开页面，记录宽屏下的视觉位置。
2. 在 Elements 中暂时取消勾选 `style` 中的规则，或删除个人练习文件里的整个 `style` 后另存副本。
3. 刷新无样式版本，从页面顶部顺序阅读。
4. 预期顺序为：跳过链接、页级页头、主内容中的商品、交易提醒、页级页脚。
5. 逐次按 Tab，确认焦点先到跳过链接，再经过页头链接和搜索控件，之后进入商品页内导航、文章联系链接与页脚链接。

标题本身默认不进入 Tab 顺序，这是正常行为。不要为了让标题“能按 Tab 到达”而给每个标题添加 `tabindex="0"`。

### 7.5 地标与标题的预期清单

按本课使用的浏览器与屏幕阅读器组合，名称的播报格式可能不同，但结构上应能辨认：

```text
地标
- banner
- navigation「站点」
- search「商品」
- main
- navigation「商品页内」
- complementary「交易提醒」
- navigation「页脚」
- contentinfo

标题
- h1 手工竹编菜篮
- h2 商品状况
- h3 提手与篮体
- h2 交接安排
- h2 交易提醒
```

文章本身可能出现在屏幕阅读器的“文章”导航类别中。文章内的 `header` 和 `footer` 不应被误解成额外的页级 banner 与 contentinfo。

## 8. 常见错误与排查路径

### 8.1 标题层级诊断：向下跳级与向上收束

#### 运行卡

| 项目 | 内容 |
| --- | --- |
| 文件路径 | `practice/html-02/landmarks/heading-diagnosis.html` |
| 打开方式 | 保存下列完整文件并直接打开，查看页面与标题列表 |
| 预期结果 | 视觉上每个标题都可能显眼，但标题列表显示 `h1 → h2 → h4 → h2 → h3 → h5` |
| 故障检查 | 若只根据字号判断，请在 Elements 中确认真实标签；默认字号不是层级证据 |

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>标题层级诊断</title>
</head>
<body>
  <main>
    <h1>手工竹编菜篮</h1>
    <h2>商品状况</h2>
    <h4>提手与篮体</h4>
    <p>提手连接牢固。</p>
    <h2>交接安排</h2>
    <h3>周末交接</h3>
    <h5>雨天方案</h5>
    <p>下雨时改到社区活动室门口。</p>
  </main>
</body>
</html>
```

**诊断：**

- `h2 商品状况 → h4 提手与篮体` 是向下进入直接子主题却跳过 `h3`，应把 `h4` 改成 `h3`。
- `h4 提手与篮体 → h2 交接安排` 是结束前面的内部层级并开始新的主要主题，向上跨级本身不构成错误。
- `h3 周末交接 → h5 雨天方案` 再次向下跳级。若“雨天方案”从属于“周末交接”，应改为 `h4`；若它与“周末交接”并列，应改为 `h3`。必须先判断内容关系。

**复验：**修正后，预期标题序列为 `h1 → h2 → h3 → h2 → h3 → h4`，或者在“雨天方案”为并列主题时以最后一个 `h3` 结束。

### 8.2 反例：视觉顺序与 DOM 顺序相反

#### 运行卡

| 项目 | 内容 |
| --- | --- |
| 文件路径 | `practice/html-02/landmarks/visual-order.html` |
| 打开方式 | 保存完整文件后打开，先看视觉顺序，再按 Tab，最后临时禁用 CSS |
| 预期结果 | “先阅读商品”在视觉上排到“交易提醒”之后，但 Tab 与无样式顺序仍先到“先阅读商品” |
| 故障检查 | 若看不出差异，缩窄后再恢复宽屏，并确认 `.notice { order: -1; }` 生效 |

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>视觉顺序反例</title>
  <style>
    .row {
      display: flex;
      gap: 1rem;
    }
    .row > * {
      padding: 1rem;
      border: 1px solid;
    }
    .notice {
      order: -1;
    }
  </style>
</head>
<body>
  <main>
    <h1>顺序观察</h1>
    <div class="row">
      <section>
        <h2>第一步：先阅读商品</h2>
        <a href="#notice">继续查看提醒</a>
      </section>
      <aside id="notice" class="notice">
        <h2>第二步：交易提醒</h2>
        <a href="#done">我已阅读</a>
      </aside>
    </div>
    <p id="done">观察结束。</p>
  </main>
</body>
</html>
```

**根因：**CSS `order` 只改变视觉排列，没有改变 DOM 和普通焦点顺序。视觉读者看到“第二步”在前，键盘与屏幕阅读器用户先遇到“第一步”，形成冲突。

**修复：**删除 `.notice { order: -1; }`，让视觉顺序遵循已有的合理 DOM；如果业务确实要求先读提醒，则同时重新设计文字关系并把 `aside` 移到 DOM 前方，之后重新做无样式与键盘测试。

### 8.3 用 ARIA 覆盖错误原生结构

错误思路：

```html
<div role="main">
  <div role="heading" aria-level="1">手工竹编菜篮</div>
</div>
```

在必须维护旧系统且无法改标签时，这些角色可能是临时补救；新页面没有理由舍弃原生元素。直接改为：

```html
<main>
  <h1>手工竹编菜篮</h1>
</main>
```

排查时先看“能否改为原生元素”，再看“是否只缺一个名称或状态”。不要先堆叠角色。

## 9. 课后题

1. STR-009（`h1` 至 `h6` 显式标题层级）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

### 10.1 基础练习：完成三类人工检查

使用第 7 节的 `practice/html-02/landmarks/index.html`。

#### 运行卡

| 项目 | 内容 |
| --- | --- |
| 文件路径 | `practice/html-02/landmarks/index.html` |
| 打开方式 | 直接打开，分别进行键盘、标题和地标检查 |
| 预期结果 | 键盘顺序符合 DOM；标题为 `h1 → h2 → h3 → h2 → h2`；同类导航名称唯一 |
| 故障检查 | 焦点不见时检查 `:focus-visible`；标题异常看真实标签；地标异常看元素祖先与名称 |

#### 操作

1. **键盘检查：**不用鼠标，从地址栏重新进入页面后按 Tab、Shift+Tab 和 Enter。记录第一个可聚焦元素、搜索控件顺序和页内导航是否能激活。
2. **标题检查：**打开屏幕阅读器标题列表，逐项记录级别与文字。只查看视觉字号不算完成。
3. **地标检查：**打开地标列表，记录角色、名称和顺序，确认三个 navigation 可以区分。
4. **无样式检查：**暂时禁用本页样式，确认商品、提醒、页脚的线性顺序仍然能理解。

#### 答案标准

- 第一个页面内焦点是“跳到主要内容”，激活后目标是 `main-content`。
- 标题顺序与第 7.5 节一致，没有从 `h1` 直接进入 `h3`。
- 三个 navigation 分别名为“站点”“商品页内”“页脚”。
- 页面只有一个可见 main。
- 标题不被强行加入普通 Tab 顺序。
- 记录中注明实际浏览器和屏幕阅读器；软件播报措辞不同不直接判错，以角色、名称和顺序为准。

### 10.2 故障练习：制造、诊断、恢复

在完成重构后，依次制造两个故障，每次只改一类问题：

1. 删除三个 `nav` 的名称，记录地标列表变化，再恢复唯一名称。
2. 把“商品状况”改成 `h3`、把“交接安排”改成 `h4`，记录标题列表，再恢复两个 `h2`。

#### 运行卡

| 项目 | 内容 |
| --- | --- |
| 文件路径 | 继续使用 `practice/html-02/landmarks/div-only.html`，另在个人 `learning-log.md` 记录 |
| 打开方式 | 每次修改后保存、刷新，并重新打开对应导航列表 |
| 预期结果 | 未命名导航变得难以区分；标题出现向下跳级；恢复后两类列表重新符合答案标准 |
| 故障检查 | 变化不出现时检查缓存、保存状态和打开路径；不要同时改多类问题 |

故障记录至少包含：修改前结构、制造的错误、观察证据、根因、修复代码和复验结果。

## 11. 阶段验收

- [ ] `STR-009`：`h1` 至 `h6` 显式标题层级
- [ ] `STR-010`：`hgroup` 与标题辅助文字
- [ ] `STR-011`：DOM 阅读顺序与视觉位置
- [ ] 能从空白文件独立复现本课最小案例；
- [ ] 至少保存一条浏览器证据和一次故障恢复记录；
- [ ] 能说明自动检查、人工检查与未验证环境的边界；
- [ ] 项目增量没有复制其他课程拥有的完整应用。

## 12. 常见问题

### Q1：只要页面外观正确，就可以跳过本课语义吗？

不可以。外观只能证明当前样式结果，不能证明 DOM、默认行为、可访问名称、网络状态或机器值正确。

### Q2：开发者工具中的一次成功是否代表所有环境都支持？

不代表。记录浏览器与版本，并把其他浏览器、真实设备、辅助技术或服务器响应列为明确的复测边界。

### Q3：为什么项目案例不在每篇教程中完整复制？

完整应用集中在一篇汇总课中维护。其他课程提交增量和证据，避免多个副本逐渐产生不一致。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：用显式标题层级和 DOM 顺序表达内容关系，并把 ARIA 限制在原生语义无法覆盖的边界。
- `STR-009`：`h1` 至 `h6` 显式标题层级
- `STR-010`：`hgroup` 与标题辅助文字
- `STR-011`：DOM 阅读顺序与视觉位置
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：页面地标与分节：建立可导航的内容区域](01-landmarks-sectioning.md) · [下一课：URL 解析与片段导航：预测最终目标](03-url-resolution-fragments.md) · [返回 HTML 模块](../README.md)
