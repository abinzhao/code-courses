# HTML 语法与内容模型：写出可预测的合法结构

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 区分标签、元素、属性和内容模型，建立可预测的嵌套、布尔属性与字符处理规则。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `DOC-002`、`DOC-005`、`DOC-006`、`DOC-007`、`DOC-008`、`DOC-009` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

区分标签、元素、属性和内容模型，建立可预测的嵌套、布尔属性与字符处理规则。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 DOC-002（开始标签、结束标签、元素与合法嵌套）、DOC-005（空元素与错误的自闭合假设）、DOC-006（普通属性、引号和重复属性）、DOC-007（布尔属性的存在性语义）、DOC-008（字符引用、注释和空白折叠）、DOC-009（内容类别与允许的父子关系）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 开始标签、结束标签、空元素与嵌套顺序

多数 HTML 元素由开始标签、内容和结束标签组成：

```html
<p>灯罩有轻微划痕。</p>
```

嵌套元素时遵循“后打开、先关闭”：

```html
<p>请在<strong>通电前检查电源线</strong>。</p>
```

可以把它想成叠放盒子：

```text
打开 p
  打开 strong
  关闭 strong
关闭 p
```

以下交叉关闭不符合树的结构：

```html
<p>请在<strong>通电前检查电源线。</p></strong>
```

浏览器会尝试恢复，但恢复结果不应成为作者依赖的写法。

有一组元素是**空元素（void elements）**。它们不能包含子内容，也没有结束标签：

```text
area  base  br  col  embed  hr  img  input  link  meta  source  track  wbr
```

正确示例：

```html
<meta charset="utf-8">
<hr>
<input type="text" name="keyword">
```

不要写 `</meta>`、`</hr>` 或 `</input>`。HTML 中可以看到 `<meta />` 这样的斜杠风格，但斜杠不是 HTML 的通用自闭合操作符。尤其要注意：

```html
<div />
```

它不会把 `div` 可靠地变成空元素；在 HTML 解析中，`div` 仍是普通元素，后续内容可能进入其中，直到规则或结束标签将它关闭。普通元素应明确写结束标签：

```html
<div></div>
```

部分普通元素在特定上下文中允许省略结束标签，例如某些 `p`、`li`。这是规范定义的省略规则，不代表所有结束标签都可省。学习阶段显式书写结束标签，能减少误判并方便对照 DOM。

### 4.2 属性、引号与布尔属性“存在即真”

属性写在开始标签中，为元素提供额外信息：

```html
<time class="published-at" datetime="2026-10-10T08:00:00Z">
  2026年10月10日发布
</time>
```

这段代码包含三个层次：

- `time` 是元素名；
- `class` 和 `datetime` 是属性名；
- `"published-at"` 与 `"2026-10-10T08:00:00Z"` 是属性值。

HTML 支持双引号、单引号，以及在严格条件下不加引号的属性值。教材和团队代码推荐统一加引号：

```html
<data value="3900">39 元</data>
```

加引号有三个实际好处：

1. 空格、`=` 等字符不容易意外截断值；
2. URL、日期和多词值更容易辨认边界；
3. 修改值时不必重新判断“这个值现在还能否不加引号”。

同一个属性不要重复书写。重复属性属于解析错误，浏览器保留哪个值不应成为业务逻辑的依据。

#### 布尔属性

布尔属性不是值为 `"true"` 或 `"false"` 的普通键值对。它的核心规则是：

> 属性存在表示真；属性不存在表示假。

以 `disabled` 为例，以下三种写法都会禁用按钮：

```html
<button disabled>暂不可用</button>
<button disabled="">暂不可用</button>
<button disabled="disabled">暂不可用</button>
```

最容易出错的反例是：

```html
<button disabled="false">联系卖家</button>
```

虽然值看起来是 `"false"`，但 `disabled` 属性仍然存在，所以按钮仍被禁用。要启用按钮，应删除整个属性：

```html
<button>联系卖家</button>
```

`checked`、`required`、`readonly`、`multiple`、`selected`、`open` 等也使用布尔属性规则。不要把它们与枚举属性混淆。例如 `contenteditable="false"` 和 `draggable="false"` 中的 `"false"` 是有定义的属性值，行为与布尔属性不同。判断属性类型时要查元素或属性的规范，而不是只看值的拼写。

DOM 中还要区分内容属性与对象属性：

```js
const button = document.querySelector("button");
button.getAttribute("disabled"); // 读取 HTML 属性文本
button.disabled;                 // 读取当前布尔状态
```

对 `disabled="false"`，前者通常得到字符串 `"false"`，后者得到布尔值 `true`。这正是本课要保留的失败证据。

### 4.3 字符引用、注释与源码安全

`<`、`>` 和 `&` 可能参与 HTML 语法。想把标签写法作为普通文字展示时，需要字符引用：

```html
<p>段落写法是 &lt;p&gt;文字&lt;/p&gt;。</p>
<p>状态：可用 &amp; 可当面检查。</p>
```

常用字符引用：

| 写法 | 显示 | 常见用途 |
| --- | --- | --- |
| `&lt;` | `<` | 展示开始标签左尖括号 |
| `&gt;` | `>` | 展示右尖括号 |
| `&amp;` | `&` | 展示与号，避免被当成引用起点 |
| `&quot;` | `"` | 双引号属性值内需要显示双引号时 |
| `&nbsp;` | 不换行空格 | 确实不能在此处分行的短组合 |

字符引用应以分号结束。中文和绝大多数普通字符可直接使用 UTF-8，不需要全部改成数字引用。`&nbsp;` 也不应用来堆缩进或推开布局；视觉间距属于 CSS 的职责。

HTML 注释写成：

```html
<!-- 商品状态由发布者提供，静态页不自动校验 -->
```

注释不会作为普通文字显示，但会存在于源文件和 DOM 中，也能被访问者查看。不能把密码、Token、真实手机号、内部地址或隐私数据写进注释。HTML 注释不能可靠嵌套，保持单层、简短即可。

注释适合解释“为什么这样写”，不适合长期保存被删除的大段代码。版本历史才是追踪代码变化的工具。

### 4.4 空白折叠：源文件换行不等于页面换行

以下两个段落在默认 `white-space: normal` 下，通常显示得近似：

```html
<p>阅读台灯，开关正常，灯罩有轻微划痕。</p>

<p>
  阅读台灯，
  开关正常，
  灯罩有轻微划痕。
</p>
```

原因不是解析器简单删除了全部空白。更准确的过程是：

1. 解析器仍可能创建包含换行和空格的 Text 节点；
2. CSS 文本处理与布局阶段在默认规则下折叠连续空白；
3. 页面通常显示为一个空格，并按容器宽度自动换行。

因此，编辑器中的换行主要服务于源码可读性，不保证页面强制换行。需要段落时使用多个 `p`，需要列表时使用列表元素；只有地址、诗句等确有语义换行的内容才考虑 `br`。

`pre` 元素默认保留空白，适合预格式化文本或与 `code` 组合展示代码：

```html
<pre><code>&lt;data value="3900"&gt;39 元&lt;/data&gt;</code></pre>
```

`pre` 只改变空白处理，不会让未转义的 `<data>` 自动变成纯文本。示例代码中的尖括号仍需使用字符引用。

还要留意行内元素之间的源码空格：

```html
<span>39 元</span><span>可议价</span>
<span>39 元</span> <span>可议价</span>
```

第二行两个元素之间有一个文本空格，默认显示时通常会出现间隔；第一行可能紧贴。这个差异来自 Text 节点与空白处理，不是浏览器随机加空格。

### 4.5 内容类别与允许的父子关系

“标签是否成对”只解决语法的一部分。元素还规定了自己可以出现在哪里、可以包含什么，这些规则称为**内容模型（content model）**。规范使用内容类别组织大量规则。

常见内容类别包括：

| 类别 | 大致职责 | 示例 |
| --- | --- | --- |
| 元数据内容 | 描述文档、关联资源 | `title`、`meta`、`link` |
| 流内容 | 主体中常见内容 | `div`、`p`、`section`、列表 |
| 分节内容 | 建立文档章节范围 | `article`、`section`、`nav`、`aside` |
| 标题内容 | 标记章节标题 | `h1`～`h6`、`hgroup` |
| 短语内容 | 段落中的文字级内容 | 文本、`span`、`strong`、`time`、`data` |
| 嵌入内容 | 引入图片、音视频等 | `img`、`audio`、`video`、`iframe` |
| 交互内容 | 通常允许用户操作 | `button`、`select`、部分 `a` |
| 可感知内容 | 通常能形成可见或可听内容 | 非空文本、图片、控件等 |

一个元素可以同时属于多个类别。例如，有 `href` 的 `a` 通常既是短语内容，也是交互内容。类别不是互斥的文件夹。

判断嵌套时要同时看父元素的内容模型和子元素的限制：

| 关系 | 结论 | 原因 |
| --- | --- | --- |
| `body > main` | 常见合法结构 | `body` 接受流内容 |
| `div > p` | 合法 | `div` 可包含流内容 |
| `p > strong` | 合法 | `p` 接受短语内容 |
| `p > div` | 不合法 | `div` 不是短语内容，解析器会提前关闭 `p` |
| `ul > li` | 正确的列表项关系 | `ul` 的直接列表内容应由 `li` 组织 |
| `head > p` | 不合法 | `p` 不是元数据内容 |
| `button > a[href]` | 不合法 | 交互控件中不能再嵌套交互内容 |
| `a[href] > button` | 不合法 | 链接中也不能放另一个交互控件 |

少数元素具有“透明”内容模型或上下文相关规则，表格、表单、列表和交互元素也有额外限制。所以不能仅凭“页面能显示”和“开始结束标签成对”判断合法性。

实用判断顺序：

1. 这个元素的语义是否适合当前内容？
2. 父元素允许哪类子内容？
3. 子元素是否有额外祖先或后代限制？
4. Elements 中的最终父子关系是否与预期一致？
5. 使用 HTML 检查器确认规则，不能只靠肉眼。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `DOC-002`：开始标签、结束标签、元素与合法嵌套
- `DOC-005`：空元素与错误的自闭合假设
- `DOC-006`：普通属性、引号和重复属性
- `DOC-007`：布尔属性的存在性语义
- `DOC-008`：字符引用、注释和空白折叠
- `DOC-009`：内容类别与允许的父子关系

## 6. 最小可运行案例

### 6.1 个人练习路径

在自己的练习区创建：

```text
practice/html-01-parser/product.html
```

教材只提供内容，不会创建该文件。请把下面代码完整保存为 `product.html`。

### 6.2 完整商品说明 HTML

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta
    name="description"
    content="邻里集市二手阅读台灯商品说明，价格39元，支持当面检查。"
  >
  <title>阅读台灯 · 邻里集市</title>
</head>
<body>
  <!-- 静态教学页：不提供真实联系、预约、支付或数据保存 -->
  <main>
    <article data-source="seller">
      <h1>阅读台灯</h1>

      <p>
        价格：
        <data value="3900">39 元</data>
      </p>

      <p>
        发布时间：
        <time datetime="2026-10-10T08:00:00Z">2026年10月10日 16:00（北京时间）</time>
      </p>

      <section aria-labelledby="condition-title">
        <h2 id="condition-title">商品状况</h2>
        <p>开关正常，灯罩有轻微划痕，电源线外皮完整。</p>
        <p><strong>当面通电检查后再决定是否交接。</strong></p>
      </section>

      <section aria-labelledby="handover-title">
        <h2 id="handover-title">交接说明</h2>
        <p>仅在社区公共服务站当面交接，不提供邮寄。</p>
        <p>商品编号：<code>LIGHT-2026-001</code></p>
      </section>

      <hr>

      <p>
        页面中的标签示例写作
        <code>&lt;data value="3900"&gt;39 元&lt;/data&gt;</code>。
      </p>

      <button type="button" disabled>联系功能尚未接入</button>
      <p><small>这是静态商品说明，不会登录账号、创建预约或保存操作。</small></p>
    </article>
  </main>
</body>
</html>
```

### 6.3 逐段理解

| 代码位置 | 作用 | 为什么这样写 |
| --- | --- | --- |
| `<!doctype html>` | 选择现代标准模式 | 避免因缺失 doctype 进入怪异模式 |
| `<html lang="zh-CN">` | 建立根元素并声明中文 | 语言信息不能靠解析器猜测 |
| `<article data-source="seller">` | 用带引号的普通属性记录教学来源 | 同名属性只能写一次，不能依赖重复属性的恢复结果 |
| `meta charset` | 声明 UTF-8 | 与文件保存编码共同避免乱码 |
| `title` | 设置标签页标题 | 与正文 `h1` 各有职责 |
| `data value="3900"` | 关联 39 元和 3900 分 | 机器值只用整数，避免浮点金额歧义 |
| `time datetime="...Z"` | 保存 UTC ISO 机器时间 | 展示文字可以按读者所在地表达 |
| `section > h2 + p` | 形成合法章节结构 | `section` 接受流内容，`p` 只含短语内容 |
| `&lt;` 与 `&gt;` | 展示标签字符 | 防止示例被解析为真实 `data` 元素 |
| `button disabled` | 表示功能未接入 | 静态页面不伪装成可用联系功能 |

### 6.4 打开方式

1. 在编辑器中确认文件已保存；
2. 双击 `product.html`，或在浏览器中选择“打开文件”；
3. 打开开发者工具的 Elements；
4. 在 Console 依次输入：

```js
document.compatMode
document.documentElement.lang
document.querySelector("data").value
document.querySelector("time").dateTime
document.querySelector("button").disabled
```

### 6.5 预期结果

- 标签页标题为“阅读台灯 · 邻里集市”；
- 页面显示商品名、39 元、发布时间、商品状况和交接说明；
- `document.compatMode` 返回 `"CSS1Compat"`；
- 根元素语言为 `"zh-CN"`；
- `data` 的机器值为字符串 `"3900"`，表示 3900 分；
- `time` 的机器值为 `"2026-10-10T08:00:00Z"`；
- 按钮处于禁用状态，因为功能尚未接入；
- Elements 中的 `p` 没有包住 `section`、`div` 等非短语内容。

### 6.6 失败证据

出现以下任一现象，都不能算完成：

- 地址栏打开的是其他同名文件，刷新后内容不变；
- `document.compatMode` 返回 `"BackCompat"`；
- 中文乱码，或编辑器显示文件不是 UTF-8；
- 价格写成 `value="39.00"`、`value="39"` 等非整数分值；
- 时间没有 `Z` 或其他明确时区，却被当作 UTC；
- Elements 中出现意外的空 `p`、被提前关闭的段落或错误父子关系；
- 按钮看起来可用，却没有任何真实功能和状态说明；
- 只观察页面画面，没有检查源文件、Elements 和 Console。

修复后必须保存源文件、重新加载页面，并重复同一组检查。

## 7. 邻里集市集成案例

这一节把解析知识用于同一张邻里集市商品页。四个案例各自保留练习路径、打开方式、预期结果和失败证据。

### 7.1 案例一：源文件没有骨架，Elements 为什么有

**个人练习路径**

```text
practice/html-01-parser/inferred-shell.html
```

保存以下完整源文件：

```html
<!doctype html>
<meta charset="utf-8">
<title>折叠桌 · 邻里集市</title>
<h1>折叠桌</h1>
<p>价格：<data value="6800">68 元</data></p>
```

**打开方式**

用浏览器直接打开文件。先使用“查看页面源代码”，再打开 Elements。两个窗口并排观察。

**源文件与 Elements 对照**

| 观察位置 | 能看到什么 | 结论 |
| --- | --- | --- |
| 页面源代码 | 没有显式 `html`、`head`、`body` 标签 | 作者确实省略了这些标签 |
| Elements | `meta`、`title` 位于 `head`，`h1`、`p` 位于 `body` | tree builder 创建了必要元素 |
| Console：`document.head` | 一个 `head` 元素对象 | DOM 中真实存在 |
| Console：`document.body` | 一个 `body` 元素对象 | DOM 中真实存在 |
| Console：`document.documentElement.lang` | 空字符串 | 浏览器不会猜出 `zh-CN` |

Elements 中的结构大致为：

```html
<html>
  <head>
    <meta charset="utf-8">
    <title>折叠桌 · 邻里集市</title>
  </head>
  <body>
    <h1>折叠桌</h1>
    <p>价格：<data value="6800">68 元</data></p>
  </body>
</html>
```

这段 Elements 展示是 DOM 的序列化近似，不是说浏览器偷偷改写并保存了源文件。

**预期结果**

页面正常显示折叠桌信息，Elements 中出现补建的文档骨架，源文件仍保持原样。你能够指出：token 流中没有这些开始/结束标签，但 tree builder 创建了对应 Element 节点。

**失败证据**

- 把 Elements 当作源文件，并声称编辑器中也有这些标签；
- 只看到页面正常，就认为语言属性也会自动补上；
- 在 Elements 临时添加 `lang` 后刷新消失，却仍把它当成源文件修复；
- 无法区分 `Document`、`DocumentType` 和根 `html` 元素。

完成观察后，把源文件改成显式骨架，并在 `html` 上添加 `lang="zh-CN"`。重新加载后，`document.documentElement.lang` 应返回 `"zh-CN"`。

### 7.2 案例二：`p` 中错误嵌套 `div`

**个人练习路径**

```text
practice/html-01-parser/broken-p.html
```

保存以下完整源文件：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>花盆架 · 错误嵌套实验</title>
</head>
<body>
  <h1>木质花盆架</h1>
  <p class="condition">商品状况：
    <div>表面有轻微使用痕迹</div>
    结构仍然稳固
  </p>
</body>
</html>
```

作者的缩进表达了“`div` 在 `p` 中”，但 `p` 的内容模型只接受短语内容，`div` 不属于短语内容。当解析器遇到 `div` 开始标签时，会先结束当前 `p`。

浏览器构造出的主体结构大致为：

```html
<h1>木质花盆架</h1>
<p class="condition">商品状况：</p>
<div>表面有轻微使用痕迹</div>
结构仍然稳固
<p></p>
```

末尾空 `p` 来自恢复过程：源文件中的 `</p>` 到来时，当前作用域里已经没有原来的 `p`，解析器按规则处理这个结束标签。不同开发者工具对纯文本空白的展示方式可能不同，但原 `p` 被提前关闭这一点应当可见。

**打开方式**

打开文件后，在页面源代码中定位 `class="condition"`，再在 Elements 中展开 `body`。在 Console 输入：

```js
const condition = document.querySelector(".condition");
condition.children.length
condition.nextElementSibling.tagName
document.querySelectorAll("p").length
```

**预期结果**

- `condition.children.length` 为 `0`，因为 `div` 不在该 `p` 中；
- `condition.nextElementSibling.tagName` 为 `"DIV"`；
- 页面上的文字可能仍按顺序出现，但 DOM 父子关系已经改变；
- Elements 中可能出现一个额外空段落。

**失败证据**

- 仅凭缩进认定 `div` 是 `p` 的子元素；
- 仅凭文字顺序“看起来没变”判定结构正确；
- 把额外空段落归因于浏览器故障，却没有查看错误源代码；
- 修复时只删除 Elements 中的节点，没有修改并保存源文件。

正确修复可以把标题和描述分开：

```html
<section aria-labelledby="condition-title">
  <h2 id="condition-title">商品状况</h2>
  <p>表面有轻微使用痕迹，结构仍然稳固。</p>
</section>
```

如果只是需要行内样式钩子，也可以在 `p` 中使用没有额外语义的 `span`，但不能为了保留错误结构而随意替换语义。

### 7.3 案例三：`disabled="false"` 为什么仍然禁用

**个人练习路径**

```text
practice/html-01-parser/boolean-attribute.html
```

保存以下完整源文件：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>布尔属性实验 · 邻里集市</title>
</head>
<body>
  <h1>布尔属性实验</h1>
  <button id="contact-button" type="button" disabled="false">
    联系发布者
  </button>
  <p>这是语法观察页，没有真实联系或预约功能。</p>
</body>
</html>
```

**打开方式**

打开文件，观察按钮状态。在 Console 输入：

```js
const button = document.querySelector("#contact-button");
button.getAttribute("disabled")
button.hasAttribute("disabled")
button.disabled
```

**预期结果**

依次得到：

```text
"false"
true
true
```

第一个结果说明 HTML 属性文本确实是 `"false"`；第二个结果说明属性存在；第三个结果说明按钮的当前禁用状态为真。这三个证据共同证明“值写成 false”没有移除布尔属性。

**失败证据**

- 按钮仍不可用，却把原因归结为没有点击事件；
- 只检查 `getAttribute()` 的字符串，没有检查属性存在性和对象状态；
- 把代码改成 `disabled="0"`、`disabled="no"`，期待它变为可用；
- 静态教学页没有真实联系逻辑，却把按钮改成可用并声称能联系发布者。

本案例的语法修复是删除 `disabled` 属性。但在邻里集市当前静态阶段，联系功能确实未接入，所以集成页应保留 `disabled`，并用清楚文字说明原因。语法正确与业务状态正确需要同时满足。

### 7.4 案例四：修复并完成复验记录

把前三个问题合并成一次完整排查。使用：

```text
practice/html-01-parser/repair-listing.html
```

先复制以下故障版本：

```html
<meta charset="utf-8">
<title>儿童书架 · 邻里集市</title>
<h1>儿童书架</h1>
<p>价格：<data value="7600">76 元</data></p>
<p>发布时间：<time datetime="2026-10-10T09:30:00Z">2026年10月10日</time></p>
<p class="condition">商品状况：
  <div>边角有轻微磨损</div>
  层板完整
</p>
<button id="contact-button" disabled="false">联系发布者</button>
```

**打开方式**

直接打开文件，同时准备页面源代码、Elements 与 Console。先记录故障，不要一上来就修改。

**故障阶段的预期结果**

- `document.compatMode` 返回 `"BackCompat"`，证明缺失 doctype 触发怪异模式；
- Elements 中有解析器创建的 `html`、`head`、`body`；
- `.condition` 不包含 `div`，它们成为兄弟节点；
- `#contact-button` 的 `.disabled` 为 `true`；
- 页面仍可能显示全部商品文字，这不能抵消上述失败证据。

把源文件修复为：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="邻里集市二手儿童书架静态商品说明。">
  <title>儿童书架 · 邻里集市</title>
</head>
<body>
  <main>
    <article data-source="seller">
      <h1>儿童书架</h1>
      <p>价格：<data value="7600">76 元</data></p>
      <p>
        发布时间：
        <time datetime="2026-10-10T09:30:00Z">2026年10月10日 17:30（北京时间）</time>
      </p>

      <section aria-labelledby="condition-title">
        <h2 id="condition-title">商品状况</h2>
        <p>边角有轻微磨损，层板完整。</p>
      </section>

      <button id="contact-button" type="button" disabled>
        联系功能尚未接入
      </button>
      <p><small>静态教学页不会创建账号、预约或持久化记录。</small></p>
    </article>
  </main>
</body>
</html>
```

**修复复验记录**

| 检查项 | 修复前证据 | 修改动作 | 修复后证据 |
| --- | --- | --- | --- |
| 文档模式 | `document.compatMode === "BackCompat"` | 首行加入标准 doctype | 返回 `"CSS1Compat"` |
| 文档语言 | 根元素语言为空 | 显式写 `html[lang="zh-CN"]` | `document.documentElement.lang === "zh-CN"` |
| `p` 嵌套 | `.condition` 与 `div` 是兄弟 | 改为 `section > h2 + p` | 状况文字位于一个合法段落 |
| 额外空段落 | Elements 中出现恢复节点 | 删除错误 `p > div` 结构 | 不再出现该空段落 |
| 按钮状态 | 属性文本 `"false"`，状态仍为 `true` | 按真实业务保持 `disabled` 并改文案 | 禁用状态与“未接入”文案一致 |
| 价格机器值 | `"7600"` | 保持整数分 | 展示 76 元，机器值仍为 7600 |
| 时间机器值 | UTC ISO 字符串 | 保持 `Z` 并明确展示时区 | 机器值和展示说明不矛盾 |

**预期结果**

保存并重新加载后，标准模式、语言、父子关系、按钮状态、价格与时间全部通过同一组检查。页面仍是静态说明页，不会因为结构修复就获得登录、联系、预约或数据保存能力。

**失败证据**

- 只在 Elements 中临时改好了结构，刷新后问题复现；
- 修复 `disabled="false"` 时直接启用无功能按钮，造成错误业务暗示；
- 价格展示改为 75 元，`value` 仍是 `"7600"`；
- 时间展示写北京时间，`datetime` 却使用无时区的本地字符串；
- 没有记录修复前证据，无法证明问题曾经存在；
- 修复后只看页面，没有重复 Console 与 Elements 检查。

## 8. 常见错误与排查路径

若结果与预期不符，按以下顺序缩小范围：

1. 回到第 4 节确认元素职责、属性适用范围和默认行为；
2. 在 Elements 中检查浏览器实际得到的 DOM；
3. 按主题检查 Console、Network、Accessibility 或具体 DOM 属性；
4. 删除无关 CSS 与脚本，建立只保留一个变量的最小复现；
5. 修复后重复原操作路径，不用刷新后“看起来正常”代替复验。

故障练习：故意破坏DOC-002（开始标签、结束标签、元素与合法嵌套）中的一个关键条件，提交“现象 / 原因 / 修复 / 复验”四段记录。

## 9. 课后题

1. DOC-002（开始标签、结束标签、元素与合法嵌套）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

### 10.1 基础练习：改写一件商品

**任务**

以第 6 节完整案例为参考，把商品改成“社区折叠椅”：

- 展示价格 28 元，机器值使用整数分；
- 发布时间机器值为 `2026-10-10T10:00:00Z`；
- 包含商品状况和交接说明两个二级章节；
- 包含一处字符引用，用正文展示 `<p>`；
- 保留一个禁用按钮，并说明静态页没有真实联系功能。

**个人练习路径**

```text
practice/html-01-parser/chair.html
```

**打开方式**

浏览器直接打开，检查页面源代码、Elements，并在 Console 查询 `compatMode`、`data.value`、`time.dateTime` 和 `button.disabled`。

**预期结果**

- 标准模式；
- 价格显示 28 元，机器值为 `"2800"`；
- 时间机器值原样返回 `"2026-10-10T10:00:00Z"`；
- 两个章节都在 `article` 内，段落没有包住章节元素；
- 页面显示文本 `<p>`，但没有因此多出一个段落；
- 禁用状态和“功能未接入”文案一致。

**失败证据**

价格写成小数元、时间缺少 UTC 标识、页面把 `<p>` 解析成元素、存在 `p > section`，或者启用了没有实际能力的按钮，均说明未通过。

### 10.2 故障练习：建立最小复现并修复

**任务**

创建一个同时包含以下四种故障的商品页：

1. 删除 doctype；
2. 在 `p` 中放入 `div`；
3. 给按钮写 `disabled="false"`；
4. 给同一个 `article` 同时写 `data-source="seller"` 和 `data-source="import"`。

先收集失败证据，再做最小修复。修复后按钮应如何处理，要依据页面真实能力决定：本课没有联系功能，因此保留简写的 `disabled` 并修改文案，而不是伪装为可用。

**个人练习路径**

```text
practice/html-01-parser/fault-recovery.html
```

**打开方式**

浏览器直接打开。使用页面源代码、Elements 和 Console 完成两轮检查。不要只在 Elements 中编辑。

**预期结果**

学习记录包含一张复验表，至少记录：

| 检查项 | 故障值 | 修复值 |
| --- | --- | --- |
| `document.compatMode` | `"BackCompat"` | `"CSS1Compat"` |
| `.condition` 的实际子元素 | 不含预想的 `div` | 修复为合法章节后符合预期 |
| `getAttribute("disabled")` | `"false"` | `""` 或属性名形式 |
| `.disabled` | `true` | 因功能未接入仍为 `true` |
| `article[data-source]` | 源文件重复两次，DOM 只保留一个结果 | 只保留 `data-source="seller"` |

这里最后一项没有变为 `false`，是因为语法错误被修正后，真实业务仍要求禁用。成功标准是语法表达与业务状态一致，而不是机械地让所有布尔值翻转。

**失败证据**

未记录故障阶段、通过 CSS 掩盖额外节点、只改开发者工具、删除按钮状态说明，或声称静态页面已经能联系和预约，均未通过。

## 11. 阶段验收

### 11.1 文件验收

- [ ] 完整商品页可以直接用浏览器打开，不依赖框架或网络。
- [ ] 第一行是 `<!doctype html>`，`document.compatMode` 为 `"CSS1Compat"`。
- [ ] 显式写出 `html`、`head`、`body`，根元素含 `lang="zh-CN"`。
- [ ] 文件和 `meta charset` 都使用 UTF-8。
- [ ] 普通元素嵌套遵循后打开、先关闭。
- [ ] 空元素没有伪造结束标签，普通元素没有误用自闭合斜杠。
- [ ] 所有属性值使用一致的引号风格。
- [ ] 每个元素的属性名唯一，没有依赖重复属性覆盖前值。
- [ ] 没有用 `disabled="false"` 表达启用状态。
- [ ] `p` 只包含允许的短语内容。
- [ ] 价格机器值是整数分，39 元对应 `"3900"`。
- [ ] 时间机器值是带 `Z` 的 UTC ISO 8601 字符串。
- [ ] 标签示例中的 `<` 和 `&` 已正确转义。
- [ ] 注释中没有秘密、隐私或真实敏感数据。
- [ ] 静态页没有声称具备登录、真实联系、预约、支付或持久化能力。

### 11.2 证据验收

提交或保留以下个人学习证据：

| 证据 | 最低要求 |
| --- | --- |
| 完整 HTML | 一份可直接打开的商品说明 |
| 源码与 Elements 对照 | 一次解析器补骨架观察 |
| 错误嵌套记录 | `p > div` 的修复前后父子关系 |
| 布尔属性记录 | `getAttribute()`、`hasAttribute()`、`.disabled` 三个结果 |
| 模式记录 | doctype 修复前后的 `compatMode` |
| 复验表 | 输入、观察、解释、修复、复验五项完整 |

只有完成标准和证据同时满足，才算通过本课。

## 12. 常见问题

### Q5：`disabled=""` 为什么也是真？

因为布尔属性看存在性。空字符串和属性名本身是布尔属性的常见合法写法。只有完全移除属性才表示假。

### Q6：`aria-disabled="false"` 也会因为存在而变成真吗？

不能套用 HTML 布尔属性规则。ARIA 属性的值是字符串化状态，`aria-disabled="false"` 表示没有向辅助技术声明禁用。但 ARIA 不会自动改变原生按钮行为；真实禁用优先使用原生 `disabled`。属性类型不同，必须分别查规范。

### Q8：能否用很多 `&nbsp;` 对齐商品信息？

不应这样做。`&nbsp;` 是不换行空格，不是布局系统。商品字段应使用合适结构，视觉对齐在 CSS 阶段完成。滥用不换行空格还会影响窄屏换行。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：区分标签、元素、属性和内容模型，建立可预测的嵌套、布尔属性与字符处理规则。
- `DOC-002`：开始标签、结束标签、元素与合法嵌套
- `DOC-005`：空元素与错误的自闭合假设
- `DOC-006`：普通属性、引号和重复属性
- `DOC-007`：布尔属性的存在性语义
- `DOC-008`：字符引用、注释和空白折叠
- `DOC-009`：内容类别与允许的父子关系
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：HTML 解析与 DOM：从字符到浏览器树](01-html-parser-dom.md) · [下一课：文档头与元信息：定义页面身份、编码与基准 URL](03-head-metadata-base.md) · [返回 HTML 模块](../README.md)
