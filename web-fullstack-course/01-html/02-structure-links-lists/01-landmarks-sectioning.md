# 页面地标与分节：建立可导航的内容区域

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 使用页级、文章级地标和分节元素表达区域边界，并让重复地标可以区分。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `STR-001`、`STR-002`、`STR-003`、`STR-004`、`STR-005`、`STR-006`、`STR-007`、`STR-008` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

使用页级、文章级地标和分节元素表达区域边界，并让重复地标可以区分。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 STR-001（`header`、`footer` 的页面级与分节级职责）、STR-002（`main` 与唯一主要内容）、STR-003（`nav` 与重复地标命名）、STR-004（`article` 的独立内容边界）、STR-005（`section` 与 `div` 的选择）、STR-006（`aside` 与间接相关内容）、STR-007（`address` 的作者/组织联系范围）、STR-008（`search` 搜索区域语义）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 浏览器先得到一棵树

HTML 源文件中的嵌套关系会形成 DOM 父子关系。正常情况下，文档的线性阅读顺序就是 DOM 中从前到后的顺序。CSS 可以把一个元素画到右侧、顶部或其他网格区域，却不会自动把 DOM 节点移到那个位置。

```text
HTML 源文件
  -> 浏览器解析
  -> DOM 父子关系与先后顺序
  -> 原生语义和可访问名称
  -> 地标列表、标题列表、键盘顺序
  -> CSS 视觉排版
```

这条链路解释了两个常见现象：

1. 页面“看起来分区了”，地标列表仍可能只有一大片无名内容，因为作者只用了 `div`。
2. 页面视觉上先出现提醒，屏幕阅读器却最后才读到，因为 CSS 改了位置而 DOM 顺序没变。

结构设计时先写出合理的无样式顺序，再做视觉布局。

### 4.2 页面结构元素分别表达什么

#### `header`

`header` 表示所属页面或分节的介绍性内容，常放标题、摘要、标识或导航。它不是“页面最上面那块”的同义词。

- 直接服务于整个页面的顶层 `header` 通常映射为 `banner` 地标。
- 位于 `article`、`section`、`aside`、`nav` 或 `main` 内的 `header` 服务于局部内容，通常不再是页面的 `banner` 地标。
- 一个页面可以有多个 `header`，但通常只有页级那个承担全局横幅职责。

#### `nav`

`nav` 表示一组主要导航链接，例如站点栏目、商品页内目录或页脚导航。不是每组三个链接都必须包成 `nav`；正文中的普通相关链接可以留在段落里。

`nav` 的原生角色是 `navigation`。页面只有一个导航时，通常不必额外命名；出现多个 `nav` 时，应使用 `aria-label` 或 `aria-labelledby` 提供互不相同的名称。

```html
<nav aria-label="站点">...</nav>
<nav aria-label="商品页内">...</nav>
<nav aria-label="页脚">...</nav>
```

标签中不必重复角色名称。屏幕阅读器会把“站点”与 `navigation` 角色组合播报；写成“站点导航”可能产生“站点导航，导航”一类重复表达，具体播报取决于软件。

#### `main`

`main` 表示当前文档最核心、最独有的内容。站点标识、全站导航和版权信息通常不属于 `main`。

本课遵循一个直接可检查的规则：一个页面只有一个未隐藏、可见的 `main`。某些应用会在切换视图时保留多个 `main`，但除了当前视图外，其余必须隐藏；零基础静态页面不需要这种复杂做法。不要把每张商品卡都写成 `main`。

#### `article`

`article` 表示可以相对独立地理解、复用或分发的内容，例如一篇帖子、一条评论或一份完整商品详情。判断时可以问：

> 把这块内容单独放进搜索结果、订阅流或另一页，它是否仍然有标题、正文和必要上下文？

如果答案是肯定的，`article` 很可能合适。`article` 可以有自己的 `header` 和 `footer`，但它们属于文章，不会自动成为全页的 `banner` 和 `contentinfo` 地标。

#### `section`

`section` 表示文档或文章中有主题的一节，通常应有可见标题。商品状况、交接安排都可以是 `section`。它不是为了方便加背景色而存在的通用盒子。

`section` 不会因为里面恰好有 `h2` 就必然出现在所有地标列表中。若给它提供可访问名称，它可能映射为 `region` 地标；不要把每个小节都命名成地标，否则列表会变得拥挤。标题导航已经能解决的问题，不必再增加 region 地标。

#### `aside`

`aside` 表示与周围主要内容间接相关、移走后主线仍然成立的补充内容，例如交易安全提醒或术语解释。它通常映射为 `complementary` 地标。

`aside` 不等于“右栏”。它可以显示在右侧、底部或正文中间；语义由关系决定，位置由 CSS 决定。

#### `footer`

`footer` 表示所属页面或分节的收尾信息，例如作者、修订日期、相关链接或版权说明。它不要求固定在浏览器窗口底部。

- 页级 `footer` 通常映射为 `contentinfo` 地标。
- `article` 内的 `footer` 是商品文章的收尾，通常不会成为全页 `contentinfo`。

#### `address`

`address` 表示最近一层 `article` 或整个页面作者、维护者的联系信息。它不是“任何地址”的标签：

- 商品发布者的邮箱可以放进商品 `article` 的 `address`；
- 站点维护者联系方式可以放进页级 `footer` 的 `address`；
- 交接地点“梧桐社区东门”只是业务地点，通常写在普通段落中；
- 不要把所有电话、门牌号或配送地址机械地改成 `address`。

#### `search`

`search` 表示执行搜索或筛选的一组控件，原生角色是 `search`。它提供结构和地标，不会实现搜索逻辑。内部通常仍需要 `form`、可见的 `label`、输入框和提交按钮。

```html
<search aria-label="商品">
  <form method="get">
    <label for="q">搜索商品</label>
    <input id="q" name="q" type="search">
    <button type="submit">搜索</button>
  </form>
</search>
```

`aria-label="商品"` 命名的是搜索地标；可见的 `label` 命名的是输入框。二者职责不同。省略 `action` 时，表单提交到当前文档；不要写不符合约束的空 `action=""`。

### 4.3 页级结构与文章内部结构

完整商品详情可以同时拥有两层 `header` 和两层 `footer`：

```text
body
├── a：跳到主要内容
├── header                         页面级：站点介绍
│   ├── 站点名称
│   ├── nav「站点」
│   └── search「商品」
├── main                           页面唯一可见主内容
│   ├── article                    可独立理解的商品详情
│   │   ├── header                 文章级：商品介绍
│   │   │   ├── hgroup
│   │   │   │   ├── h1            商品名
│   │   │   │   └── p             副标题
│   │   │   └── nav「商品页内」
│   │   ├── section
│   │   │   ├── h2                商品状况
│   │   │   └── section
│   │   │       └── h3            提手与篮体
│   │   ├── section
│   │   │   └── h2                交接安排
│   │   └── footer                 文章级：编号与发布者联系
│   │       └── address
│   └── aside「交易提醒」          补充信息
│       └── h2
└── footer                         页面级：站点收尾
    ├── nav「页脚」
    └── address
```

这里的两个 `header` 都合法，但只有页面级 `header` 通常作为 `banner` 地标。两个 `footer` 也都合法，但只有页级 `footer` 通常作为 `contentinfo` 地标。元素名称相同，不代表它们在不同祖先中承担相同的全局角色。

### 4.4 地标让读者跳过重复内容

地标是辅助技术可快速导航的重要区域。常见原生元素与通常对应的角色如下：

| 原生元素 | 通常对应的角色或导航类别 | 本课用途 | 关键边界 |
| --- | --- | --- | --- |
| 页级 `header` | `banner` | 站点介绍 | 局部 `header` 通常不是 banner |
| `nav` | `navigation` | 站点、页内、页脚导航 | 多个时名称应唯一 |
| `main` | `main` | 商品核心内容 | 一个页面只保留一个可见实例 |
| `search` | `search` | 商品搜索控件组 | 不实现搜索业务 |
| `aside` | `complementary` | 交易提醒 | 与主线间接相关，不等于右栏 |
| 页级 `footer` | `contentinfo` | 站点收尾信息 | 文章 `footer` 通常不是 contentinfo |
| `section` | 视命名情况可能为 `region` | 有主题的小节 | 不要制造过多 region |
| `article` | `article` | 完整商品详情 | 可导航类别，但不是 ARIA landmark 角色 |

屏幕阅读器通常提供按地标和按标题移动的能力。地标帮助快速进入大区域，标题帮助在区域内部定位主题。二者互补，不能用一长串地标代替清楚的标题。

### 4.5 多个同类地标必须能区分

以下结构语法合法，却给使用者留下三个难以区分的“导航”：

```html
<nav>...</nav>
<nav>...</nav>
<nav>...</nav>
```

页面出现多个角色相同但职责不同的地标时，为每个地标提供简短且互不相同的名称：

```html
<nav aria-label="站点">...</nav>
<nav aria-label="商品页内">...</nav>
<nav aria-label="页脚">...</nav>
```

如果已有可见标题，可以优先引用它：

```html
<h2 id="related-title">相关商品</h2>
<nav aria-labelledby="related-title">...</nav>
```

`aria-labelledby` 复用可见文字，能减少屏幕上看到的名称与辅助技术听到的名称不一致。不要给不同导航复制同一个 `aria-label`，也不要用 `title` 属性代替可靠的可访问名称。

如果页首和页尾故意重复完全相同的一组导航链接，可以使用相同名称，表明它们是同一类导航。命名目标是让职责可判断，而不是机械追求字符串不同。同一原则也适用于页面中多个 `search`、`aside` 或命名 `region`。

### 4.6 `section` 与 `div` 的选择

选择前依次问：

1. 这块内容能否用一个标题概括独立主题？
2. 它是否属于文档或文章大纲的一部分？
3. 如果删除样式，这个分节关系是否仍有意义？

| 情况 | 推荐元素 | 原因 |
| --- | --- | --- |
| “商品状况”及其正文 | `section` | 有明确主题，是文章的一节 |
| “交接安排”及其正文 | `section` | 有明确主题，是文章的一节 |
| 商品正文和提醒的网格布局容器 | `div` | 只用于样式分组，没有新主题 |
| 一行中包装价格与状态以便排版 | `div` 或 `span` | 只是通用容器 |
| 可独立分发的完整商品详情 | `article` | 独立内容，不只是主题小节 |
| 与交易主线间接相关的安全提醒 | `aside` | 补充关系比普通分节更准确 |

`div` 没有错。没有更具体的语义、只需要分组或样式钩子时，它就是正确选择。问题在于所有内容都无条件使用 `div`，而不是 `div` 本身。

## 5. 元素、属性、API 或配置清单

| 名称 | 本课最小用法 | 浏览器或辅助技术得到什么 | 常见误用 |
| --- | --- | --- | --- |
| `header` | 页级介绍、文章介绍 | 页级通常是 banner，局部通常是普通分组 | 按“在顶部”选择 |
| `nav` | 主要链接集合 | navigation 地标 | 包住页面每一个链接 |
| `main` | 页面核心内容 | main 地标 | 每个商品都写一个可见 `main` |
| `article` | 完整商品详情 | 可独立导航的文章内容 | 只因有边框就使用 |
| `section` | 有标题的主题分节 | 文档结构，命名后可能是 region | 只为加背景色使用 |
| `aside` | 交易提醒 | complementary 地标 | 把所有右栏都当补充内容 |
| `footer` | 页面或文章收尾 | 页级通常是 contentinfo | 认为必须固定在视口底部 |
| `address` | 作者或维护者联系 | 联系信息语义 | 包裹任意地点或邮寄地址 |
| `search` | 搜索控件组 | search 地标 | 认为它会自动查询数据 |
| `h1`–`h6` | 显式标题层级 | 标题列表和层级 | 按字体大小选择 |
| `hgroup` | 一个标题加配套段落 | 标题与副标题组成一组 | 放多个同级标题 |
| `aria-label` | 命名无可见标题的地标 | 可访问名称 | 与其他同类地标重名 |
| `aria-labelledby` | 引用可见标题的 `id` | 复用可见文字作为名称 | 引用不存在或重复的 `id` |
| `hidden` | 隐藏非当前区域 | 通常从渲染和无障碍树移除 | 只视觉隐藏却仍想让所有人使用 |
| `id` | 片段目标或名称引用 | 唯一引用目标 | 同页重复 |

本课不需要调用 JavaScript API。检查工具是浏览器 Elements、Accessibility 面板，以及屏幕阅读器的标题/地标导航功能。

## 6. 最小可运行案例

先用最少内容观察页级结构与文章级结构的差别。

### 6.1 运行卡

| 项目 | 内容 |
| --- | --- |
| 文件路径 | `practice/html-02/landmarks/minimal.html` |
| 打开方式 | 保存后用现代浏览器直接打开；无需终端、服务器或依赖 |
| 预期结果 | 页面显示站点名、商品标题、状况和两个联系方式；Elements 中有两层 `header` 与两层 `footer` |
| 故障检查 | 内容未更新时核对保存状态和地址栏路径；结构不同时查看 Elements，而不是只看默认样式 |

### 6.2 完整文件

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>竹编菜篮 · 邻里集市</title>
</head>
<body>
  <header>
    <p>邻里集市</p>
    <nav aria-label="站点">
      <a href="#product">商品详情</a>
      <a href="#site-contact">联系站点</a>
    </nav>
  </header>

  <main>
    <article id="product">
      <header>
        <hgroup>
          <h1>手工竹编菜篮</h1>
          <p>闲置生活用品，可当面检查。</p>
        </hgroup>
      </header>

      <section>
        <h2>商品状况</h2>
        <p>篮体完整，提手有正常使用痕迹。</p>
      </section>

      <footer>
        <address>
          发布者联系：
          <a href="mailto:seller@example.invalid">seller@example.invalid</a>
        </address>
      </footer>
    </article>
  </main>

  <footer id="site-contact">
    <address>
      站点维护联系：
      <a href="mailto:team@example.invalid">team@example.invalid</a>
    </address>
  </footer>
</body>
</html>
```

### 6.3 逐步观察

1. 在 Elements 中展开 `body`，确认页级 `header`、`main`、页级 `footer` 是兄弟节点。
2. 展开 `article`，确认它有自己的 `header`、`section` 和 `footer`。
3. 打开地标列表，预期能找到页面的 banner、名为“站点”的 navigation、main 和 contentinfo。
4. 不应把文章 `header` 再列成第二个 banner，也不应把文章 `footer` 再列成第二个 contentinfo；实际术语可能因屏幕阅读器而略有差异。
5. 打开标题列表，只应看到一级“手工竹编菜篮”和二级“商品状况”。

页面默认样式很朴素，这是正常结果。本例验证的是结构，不是视觉设计。若地标名称与预期不同，先检查元素的祖先关系和 `aria-label`，再记录浏览器与屏幕阅读器组合。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [标题大纲、阅读顺序与 ARIA：保持结构一致](02-headings-reading-order-aria.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 STR-001（`header`、`footer` 的页面级与分节级职责） 对应的元素、属性或状态；
- 在项目中实现并标出与 STR-002（`main` 与唯一主要内容） 对应的元素、属性或状态；
- 在项目中实现并标出与 STR-003（`nav` 与重复地标命名） 对应的元素、属性或状态；
- 在项目中实现并标出与 STR-004（`article` 的独立内容边界） 对应的元素、属性或状态；
- 在项目中实现并标出与 STR-005（`section` 与 `div` 的选择） 对应的元素、属性或状态；
- 在项目中实现并标出与 STR-006（`aside` 与间接相关内容） 对应的元素、属性或状态；
- 在项目中实现并标出与 STR-007（`address` 的作者/组织联系范围） 对应的元素、属性或状态；
- 在项目中实现并标出与 STR-008（`search` 搜索区域语义） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`02-headings-reading-order-aria.md`](02-headings-reading-order-aria.md)。

## 8. 常见错误与排查路径

### 8.1 反例：重复且未命名的 `nav`

#### 运行卡

| 项目 | 内容 |
| --- | --- |
| 文件路径 | `practice/html-02/landmarks/bad-nav.html` |
| 打开方式 | 保存下列完整文件并直接打开，再查看地标列表 |
| 预期结果 | 页面视觉上有三组链接，但地标列表出现三个难以区分的 navigation |
| 故障检查 | 若只看到页面外观，说明还没有检查无障碍树；打开 Accessibility 面板或屏幕阅读器地标列表 |

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>未命名导航反例</title>
</head>
<body>
  <header>
    <nav>
      <a href="#product">商品</a>
    </nav>
  </header>
  <main id="product">
    <h1>手工竹编菜篮</h1>
    <nav>
      <a href="#condition">状况</a>
    </nav>
    <section id="condition">
      <h2>商品状况</h2>
      <p>篮体完整。</p>
    </section>
  </main>
  <footer>
    <nav>
      <a href="#product">返回商品</a>
    </nav>
  </footer>
</body>
</html>
```

**根因：**三个 `nav` 有相同角色，却没有各自名称。视觉位置能帮助部分读者猜测，地标列表中却缺少上下文。

**修复：**

```html
<nav aria-label="站点">...</nav>
<nav aria-label="商品页内">...</nav>
<nav aria-label="页脚">...</nav>
```

**复验：**刷新后再次打开地标列表，确认三个 navigation 的名称互不相同。不要通过删除两个 `nav` 来掩盖命名问题；它们确实承担不同导航职责。

### 8.2 把所有区域都写成 `section`

**现象：**DOM 中出现很多没有标题的 `section`，或为满足“每节有标题”而增加“内容区一”“内容区二”等无意义标题。

**根因：**作者把 `section` 当成带语义的 `div`，按样式盒子数量分节。

**修复路径：**

1. 写出每块内容的主题名称。
2. 能进入文档大纲的主题保留 `section` 并给真实标题。
3. 只负责网格、间距或脚本挂钩的容器改回 `div`。
4. 若整块可以独立分发，重新判断是否应使用 `article`。
5. 关闭 CSS，确认标题仍能解释内容关系。

## 9. 课后题

先写下自己的判断，再展开答案。

<details>
<summary>一个页面可以有两个 header 吗？</summary>

可以。页级 `header` 服务于整个页面，`article` 内的 `header` 服务于商品文章。它们的祖先关系不同，通常只有页级 `header` 作为 banner 地标。

</details>

<details>
<summary>一个页面可以同时显示两个 main 吗？</summary>

本课不允许。`main` 表示当前页面唯一的核心内容。复杂应用可以保留多个候选 `main`，但除当前内容外其余必须隐藏；静态商品页只需要一个可见 `main`。

</details>

<details>
<summary>aside 必须放在右侧吗？</summary>

不必须。`aside` 表示与主内容间接相关的补充关系，视觉位置由 CSS 决定。右侧的核心操作不应只因位置而使用 `aside`。

</details>

<details>
<summary>section 里面有 h2，是否一定会出现在地标列表？</summary>

不一定。`section` 是主题分节；是否映射为命名 region 取决于可访问名称和浏览器、辅助技术映射。不要依赖它自动成为地标。按标题导航通常已经可以找到普通分节。

</details>

<details>
<summary>为什么三个 nav 都能看见，却仍然要命名？</summary>

地标列表可能脱离页面视觉上下文，只显示多个相同的 navigation。唯一名称让使用者在不逐个进入内容的情况下知道它们分别是站点、商品页内还是页脚导航。

</details>

<details>
<summary>从 h4 回到 h2 是否一定是错误？</summary>

不是。若 `h4` 完成了深层子主题，接下来的 `h2` 开始新的主要主题，这是正常收束。更可疑的是从 `h2` 向下直接进入 `h4`，因为它通常缺少一层父主题。

</details>

<details>
<summary>hgroup 中的副标题应该写成第二个 heading 吗？</summary>

通常不应该。`hgroup` 中用一个 `h1` 至 `h6` 表达标题，配套副标题用 `p`。副标题不是大纲中的第二个主题。

</details>

<details>
<summary>给 div 添加 aria-label="主内容"，它就等于 main 了吗？</summary>

不等于。`aria-label` 只提供名称，不会赋予 `main` 角色。新页面应直接使用 `<main>`；ARIA 不能代替原生结构选择。

</details>

**推理题：**商品文章之后的交易提醒被 CSS 显示在左上角。标题列表先列商品标题，Tab 也先进入商品链接。这是浏览器故障吗？

参考答案：通常不是。CSS 改变了视觉位置，但 DOM、标题和普通焦点顺序仍按源代码排列。应检查 CSS 布局是否造成与业务步骤冲突，而不是用正值 `tabindex` 强行重排。

## 10. 实践练习

### 10.1 提升练习：重构 `div-only` 页面

下面的页面视觉文字齐全，却没有可导航的结构。不要改变业务文字，只重构元素和标题层级。

#### 运行卡

| 项目 | 内容 |
| --- | --- |
| 文件路径 | `practice/html-02/landmarks/div-only.html` |
| 打开方式 | 先保存原始文件并打开，记录标题与地标；重构后在同一路径刷新复验 |
| 预期结果 | 重构前几乎没有有用地标和标题；重构后有一个 main、清楚标题和已命名导航 |
| 故障检查 | 若重构前后列表相同，检查是否仍用 class 名代替原生元素，或是否打开了旧文件 |

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>木质换鞋凳 · 邻里集市</title>
</head>
<body>
  <div class="top">
    <div class="brand">邻里集市</div>
    <div class="links">
      <a href="#item">商品</a>
      <a href="#contact">联系</a>
    </div>
    <div class="search-box">
      <form method="get">
        <label for="query">搜索商品</label>
        <input id="query" name="q" type="search">
        <button type="submit">搜索</button>
      </form>
    </div>
  </div>

  <div class="content">
    <div id="item" class="card">
      <div class="card-top">
        <div class="title">木质换鞋凳</div>
        <div class="subtitle">适合放在玄关</div>
        <div class="links">
          <a href="#condition">状况</a>
          <a href="#pickup">交接</a>
        </div>
      </div>

      <div id="condition" class="part">
        <div class="part-title">商品状况</div>
        <p>结构稳定，表面有轻微划痕。</p>
      </div>

      <div id="pickup" class="part">
        <div class="part-title">交接安排</div>
        <p>周日下午在社区门口交接。</p>
      </div>

      <div class="card-bottom">
        <p>商品编号：bench-01</p>
        <div>发布者联系：seller@example.invalid</div>
      </div>
    </div>

    <div class="note">
      <div class="part-title">搬运提醒</div>
      <p>请两人共同搬运。</p>
    </div>
  </div>

  <div id="contact" class="bottom">
    <div class="links"><a href="#item">返回商品</a></div>
    <div>站点维护联系：team@example.invalid</div>
  </div>
</body>
</html>
```

#### 重构要求

1. 页级介绍改为 `header`，其中包含品牌、名为“站点”的 `nav` 和名为“商品”的 `search`。
2. 全页只增加一个可见 `main`。
3. 商品卡改为 `article`，卡片介绍改为文章级 `header`。
4. 商品名使用 `h1`，副标题与它组成 `hgroup`。
5. 两个内容部分改为带 `h2` 的 `section`。
6. 文章内链接集合改为名为“商品页内”的 `nav`。
7. 商品编号和发布者联系放进文章级 `footer`，只把联系信息放进 `address`。
8. 搬运提醒改为带 `h2` 的 `aside`。
9. 页面底部改为页级 `footer`，其中导航名为“页脚”，维护者联系使用 `address`。
10. `content` 如果只负责两列布局，可以保留为 `div`，不要为了消灭 `div` 而滥用 `section`。

#### 答案标准

重构后的主要骨架应与下面关系等价，class 名可以保留：

```html
<header>
  <p>邻里集市</p>
  <nav aria-label="站点">...</nav>
  <search aria-label="商品"><form>...</form></search>
</header>
<main>
  <div class="content">
    <article id="item">
      <header>
        <hgroup>
          <h1>木质换鞋凳</h1>
          <p>适合放在玄关</p>
        </hgroup>
        <nav aria-label="商品页内">...</nav>
      </header>
      <section id="condition">
        <h2>商品状况</h2>
        ...
      </section>
      <section id="pickup">
        <h2>交接安排</h2>
        ...
      </section>
      <footer>
        <p>商品编号：bench-01</p>
        <address>发布者联系：seller@example.invalid</address>
      </footer>
    </article>
    <aside>
      <h2>搬运提醒</h2>
      ...
    </aside>
  </div>
</main>
<footer id="contact">
  <nav aria-label="页脚">...</nav>
  <address>站点维护联系：team@example.invalid</address>
</footer>
```

省略号只表示沿用原始文字，不是要写进练习文件。答案是否合格以结构、名称、顺序和复验结果为准，不以是否逐字符相同为准。

### 10.2 挑战练习：解释 `article` 的独立性

把重构后的商品 `article` 单独复制到一个只有完整文档骨架的新文件中。暂时移除站点页头、页脚和搬运提醒，观察商品是否仍有标题、状况、交接安排、编号和发布者联系。

#### 运行卡

| 项目 | 内容 |
| --- | --- |
| 文件路径 | `practice/html-02/landmarks/article-only.html` |
| 打开方式 | 保存含完整文档骨架和商品 `article` 的文件后直接打开 |
| 预期结果 | 离开原页面后仍能理解商品名称、状况、交接、编号和发布者联系 |
| 故障检查 | 信息不完整时查找“见上方”“点击右侧”等位置依赖文字，并对照原 `article` 的开始与结束位置 |

**答案标准：**单独打开时，商品仍能被理解，说明 `article` 的边界基本合理。若出现“见上方”“点击右侧”或缺失商品名等依赖页面位置的文字，应改写内容，而不是仅增加更多 ARIA。

## 11. 阶段验收

### 11.1 完成清单

- [ ] 页面只有一个未隐藏、可见的 `main`。
- [ ] 页级与文章级 `header`、`footer` 的归属能从 DOM 看出。
- [ ] 商品详情作为 `article`，主题分节使用 `section`，纯布局容器保留 `div`。
- [ ] `address` 只包含作者、发布者或维护者联系，不包裹普通交接地点。
- [ ] 搜索控件位于 `search` 中，并有可见输入标签。
- [ ] 页面主标题为一个 `h1`，子主题层级显式且符合内容关系。
- [ ] 能解释向下跳级为何可疑、向上跨级为何可能合理。
- [ ] `hgroup` 只有一个标题，副标题使用段落。
- [ ] 多个 `nav` 的名称唯一且简短。
- [ ] 关闭 CSS 后，内容顺序仍然完整、自然。
- [ ] 键盘顺序没有用正值 `tabindex` 人工修补。
- [ ] 原生元素能表达的结构没有改用 `div + role`。

### 11.2 必交人工检查

| 检查 | 操作 | 合格结果 |
| --- | --- | --- |
| 键盘 | 只用 Tab、Shift+Tab、Enter 走完整页 | 焦点可见，顺序符合 DOM，所有链接与控件可操作 |
| 标题 | 打开标题列表并逐项读取 | 一个 `h1`，`h2`/`h3` 关系符合主题，没有向下跳级 |
| 地标 | 打开地标列表并逐项读取 | banner、main、search、complementary、contentinfo 可辨认；三个 navigation 名称唯一 |
| 无样式 | 禁用本页 CSS 后顺序阅读 | 页头、商品、提醒、页脚仍然有清楚顺序 |
| DOM | 在 Elements 展开页面和 `article` | 两层 header/footer 的祖先关系正确，只有一个可见 main |

### 11.3 验收回答

学习者还应能用自己的话回答：

1. 为什么 `article` 内的 `header` 通常不是第二个 banner？
2. 为什么右栏不一定是 `aside`？
3. 为什么有标题的主题内容适合 `section`，网格包装适合 `div`？
4. 为什么 ARIA 名称不能修复 DOM 阅读顺序？
5. 为什么从 `h4` 回到 `h2` 不能仅凭数字认定为错误？

验收证据应包含练习文件路径、标题列表记录、地标列表记录、键盘顺序、无样式观察，以及至少一个故障恢复记录。只提供页面截图不足以证明结构通过。

## 12. 常见问题

**一个页面必须只有一个 `h1` 吗？**

HTML 语法并不把多个 `h1` 一概判为解析错误，但浏览器不会可靠地根据 `section` 自动调整它们的层级。本教材为零基础页面采用一个明确的页面 `h1`，其余标题显式降级，以获得稳定、易检查的大纲。

**每个 `section` 都必须添加 `aria-label` 吗？**

不需要。普通分节用可见标题建立大纲即可。给每节命名可能产生大量 region 地标，反而降低导航效率。只有确实需要作为重要区域快速跳转时才补名称。

**页面只有一个 `nav`，还需要 `aria-label` 吗？**

通常不需要，因为它不会与同类地标混淆。本课完整页面有三个 `nav`，所以分别命名。

**可以把商品标题写进页级 `header` 吗？**

可以，但要看页面模型。本例把完整商品作为可独立内容，因此标题放在 `article` 的 `header` 中；站点品牌和全局工具留在页级 `header`。不要只按视觉位置决定。

**为什么 `article` 不在地标预期清单里？**

`article` 有原生文章语义，部分屏幕阅读器提供按文章导航，但 ARIA landmark 角色集合与“所有可导航语义”不是同一概念。不要为了让它出现在地标列表中而随意改成 `region`。

**`search` 兼容旧环境时怎么办？**

目标浏览器若不支持该元素的语义映射，需要在真实环境测试并按兼容要求评估 `role="search"` 兜底。新教材示例优先使用现行原生元素，不在没有证据时同时重复角色。

**视觉设计要求提醒显示在商品前面，怎么办？**

先确认提醒是否真的应在所有阅读方式中优先。如果是，调整 DOM 和文案关系，再做视觉布局；如果只是装饰性排版，不要制造与键盘、朗读步骤相反的序列。

**标题太大，可以把 `h2` 改成 `h4` 吗？**

不可以按字号换层级。保持真实的 `h2`，在 CSS 课程中调整外观。

## 13. 扩展阅读

查阅日期：2026-10-10。规范会持续更新；引用日期表示本课核对内容的时间，不代表所有旧浏览器、内嵌 WebView 和辅助技术组合行为完全一致。

- [WHATWG：文档中的分节](https://html.spec.whatwg.org/multipage/sections.html)
- [WHATWG：`search` 元素](https://html.spec.whatwg.org/multipage/grouping-content.html#the-search-element)
- [WAI-ARIA APG：地标区域](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/)
- [WAI 教程：页面区域](https://www.w3.org/WAI/tutorials/page-structure/regions/)
- [WAI 教程：标题](https://www.w3.org/WAI/tutorials/page-structure/headings/)
- [MDN：HTML 标题元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/Heading_Elements)
- [MDN：使用 HTML 分节与大纲](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/Heading_Elements#usage_notes)

阅读时带着四个问题核对：元素服务于哪一层内容、是否产生地标、名称从哪里来、DOM 顺序在无样式与键盘状态下是否仍然成立。

## 我现在能做到什么

- 能解释并验证：使用页级、文章级地标和分节元素表达区域边界，并让重复地标可以区分。
- `STR-001`：`header`、`footer` 的页面级与分节级职责
- `STR-002`：`main` 与唯一主要内容
- `STR-003`：`nav` 与重复地标命名
- `STR-004`：`article` 的独立内容边界
- `STR-005`：`section` 与 `div` 的选择
- `STR-006`：`aside` 与间接相关内容
- `STR-007`：`address` 的作者/组织联系范围
- `STR-008`：`search` 搜索区域语义
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[返回本章目录](../README.md#第二章页面结构链接与列表) · [下一课：标题大纲、阅读顺序与 ARIA：保持结构一致](02-headings-reading-order-aria.md) · [返回 HTML 模块](../README.md)
