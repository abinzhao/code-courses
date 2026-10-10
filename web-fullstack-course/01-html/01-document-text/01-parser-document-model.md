# 01 从 HTML 源代码到 DOM：读懂浏览器的解析结果

## 任务卡

邻里集市收到一份二手台灯商品页。页面看起来“差不多正常”，但维护者发现三个异常：

- 源文件里没有写 `html`、`head` 和 `body`，Elements 中却能看到它们；
- 商品状况中的 `div` 明明写在 `p` 里面，Elements 中却跑到了段落外；
- 按钮写着 `disabled="false"`，仍然无法点击。

你的任务不是给页面加样式，而是像浏览器一样理解这份 HTML：区分源代码、token、节点和 DOM，找出解析器做过的修复，再把商品页改成结构明确、可重复验证的标准模式文档。

| 项目 | 本课完成结果 | 必须保留的证据 |
| --- | --- | --- |
| 认识解析过程 | 能讲清“字符 → token → 节点 → DOM 树” | 一张手绘或文字流程图 |
| 建立文档骨架 | 文档含 doctype、`html`、`head`、`body` | 源文件与 Elements 截图或记录 |
| 修复错误嵌套 | `p` 不再包含不允许的 `div` | 修复前后的 DOM 对照 |
| 理解布尔属性 | 知道 `disabled="false"` 仍为真 | `.disabled` 和 `getAttribute()` 的结果 |
| 完成商品说明 | 价格使用整数分，时间使用 UTC ISO | 完整 HTML 与验收清单 |

建议用 60～90 分钟完成本课。第一次照着案例观察，第二次不看答案独立修复。所有练习都在你自己的 `practice/html-01-parser/` 目录中进行；本教材不会替你创建练习文件。

## 1. 任务背景

HTML 文件首先是一串字符。浏览器不会把这串字符原样画到屏幕上，而是读取字符、识别语法、建立树状对象，然后才进行样式计算和页面布局。

这件事对零基础学习者很重要，因为以下三个对象经常被混为一谈：

1. **源代码**：编辑器里保存的字符，是作者写下的输入。
2. **DOM**：浏览器解析后建立的对象树，是脚本、开发者工具和渲染系统实际操作的结构。
3. **页面画面**：DOM 经过 CSS 规则、字体与布局计算后的视觉结果。

错误 HTML 也可能显示出文字。原因不是错误不存在，而是 HTML 解析器包含明确的错误恢复规则。它会补节点、提前关闭元素、忽略某些 token，尽量构造一棵可用的 DOM 树。因此：

> “我在页面上看到了文字”只能证明浏览器产生了某种结果，不能证明源代码合法，也不能证明 DOM 符合作者意图。

邻里集市后续会在商品页上增加样式、表单和 JavaScript。如果本阶段没有把 DOM 结构弄清楚，后续代码可能选错元素、读取错误状态，或者让辅助技术得到混乱的信息。本课只制作静态商品说明，不包含账号登录、真实联系、预约、支付或持久化能力。

## 2. 学习目标

完成本课后，你应当能够：

- 用自己的话区分 HTML 源代码、token、节点、DOM 和页面画面。
- 说明 tokenizer（分词器）与 tree builder（树构建器）的基本分工。
- 写出启用标准模式的 `<!doctype html>`，并用 `document.compatMode` 检查模式。
- 说明 `html`、`head`、`body` 缺失时，浏览器为什么仍可能创建相应节点。
- 区分开始标签、结束标签、元素和空元素，避免把标签当成 DOM 节点。
- 按“后打开、先关闭”的顺序正确嵌套普通元素。
- 正确书写带引号的属性值，并解释布尔属性“存在即真”的规则。
- 在文本中正确使用字符引用、注释和空白，避免把排版任务交给重复空格。
- 根据内容类别和内容模型判断常见父子关系是否合法。
- 通过“查看页面源代码”和 Elements 对照，定位一次浏览器错误恢复。
- 写出一份完整可直接打开的商品说明 HTML，其中价格机器值为整数分，时间机器值为 UTC ISO 8601。

本课的完成标准不是背出所有解析规则，而是能用证据回答：“作者写了什么？浏览器最终建立了什么？二者为什么不同？”

## 3. 预备知识

### 3.1 需要的工具

你只需要：

- 一个纯文本代码编辑器；
- 一个带开发者工具的现代浏览器；
- 一个自己创建的练习目录，例如 `practice/html-01-parser/`。

不需要安装框架、包管理器或本地服务器。本课页面不请求网络资源，直接打开本地 `.html` 文件即可。

### 3.2 开始前会做的操作

你需要知道如何：

1. 新建纯文本文件，并以 UTF-8 编码保存；
2. 把文件扩展名保存为 `.html`，而不是 `.html.txt`；
3. 双击 HTML 文件，或从浏览器菜单选择“打开文件”；
4. 打开开发者工具并找到 Elements 与 Console；
5. 使用“查看页面源代码”，它常见的快捷键是 Windows/Linux 的 `Ctrl+U` 或 macOS 的 `Command+Option+U`。

浏览器、系统和快捷键可能不同。找不到快捷键时，使用浏览器菜单中的同名功能即可。

### 3.3 建议的证据记录格式

每次错误实验都保留以下四项：

| 字段 | 记录内容 |
| --- | --- |
| 输入 | 源文件中的关键 HTML |
| 观察 | 页面与 Elements 中的实际结果 |
| 解释 | 哪条语法或恢复规则导致该结果 |
| 复验 | 修复后重新加载得到的结果 |

不要只保存页面截图。截图只能证明画面，不能完整证明源文件和 DOM 的关系。

## 4. 核心理论

### 4.1 HTML 源代码、token、节点与 DOM

先看一行很短的源代码：

```html
<p class="condition">开关正常 &amp; 灯罩有划痕</p>
```

从作者到页面，大致经历以下过程：

```text
HTML 源代码字符
  ↓ tokenizer 按状态读取字符
开始标签 token、字符 token、结束标签 token
  ↓ tree builder 按插入模式处理 token
Element 节点、Text 节点等 DOM 节点
  ↓ CSS 与布局系统处理
屏幕上可见的段落
```

这条源代码可以帮助区分四个概念：

| 层次 | 本例中的内容 | 要点 |
| --- | --- | --- |
| 源代码 | `<p class="condition">...` | 文件中的字符 |
| token | `p` 开始标签 token、字符 token、`p` 结束标签 token | 解析过程中的中间输入 |
| 节点 | 一个 `HTMLParagraphElement`、一个 Text 节点 | 浏览器创建的对象 |
| DOM | `p` 节点与文本节点组成的树及其操作接口 | 脚本和开发者工具看到的文档模型 |

**标签不等于元素。** `<p>` 是开始标签，`</p>` 是结束标签；开始标签、内容、结束标签共同描述一个 `p` 元素。DOM 中通常只有一个对应的元素节点，不会分别出现“开始标签节点”和“结束标签节点”。

tokenizer 不是简单地“按尖括号切字符串”。它会根据当前状态解释字符。例如，在普通文本中，`<` 可能开始一个标签；在 `title` 中，文本处理方式不同；在注释中，又使用另一组规则。tree builder 接收 token，并根据当前插入模式、已打开元素栈和作用域规则建立树。

HTML 文档中的常见节点包括：

- `Document`：整份文档的入口，`document` 指向它；
- `DocumentType`：由 `<!doctype html>` 产生；
- `Element`：由 `html`、`p`、`button` 等元素建立；
- `Text`：元素中的文字，包括部分用于排版源码的空白；
- `Comment`：由 HTML 注释建立。

Elements 面板主要突出元素层次，可能折叠或弱化纯空白 Text 节点。Console 中的 `childNodes` 包含文本和注释节点，`children` 只包含元素子节点。这两个集合不能混用。

### 4.2 DOM 是树，不是源代码的彩色版本

一棵最小文档树可以写成：

```text
Document
├─ DocumentType: html
└─ HTMLHtmlElement
   ├─ HTMLHeadElement
   │  └─ HTMLTitleElement
   │     └─ Text
   └─ HTMLBodyElement
      └─ HTMLHeadingElement
         └─ Text
```

DOM 的“树”意味着每个节点有明确的父节点、子节点和兄弟节点。合法嵌套最终会反映为稳定的父子关系。JavaScript 查询、CSS 选择器、无障碍树生成和事件传播都会依赖这些关系。

可在 Console 中观察常用入口：

```js
document
document.doctype
document.documentElement
document.head
document.body
document.body.children
document.body.childNodes
```

`document.documentElement` 通常是 `html` 元素。`document.head` 和 `document.body` 分别指向 `head` 与 `body`。这些属性返回的是解析后的 DOM 对象，不是源文件中的字符片段。

“查看页面源代码”通常展示浏览器收到或读取的原始 HTML；Elements 展示当前的活动 DOM。页面脚本可以在加载后修改 DOM，所以 Elements 还可能包含源文件中从未出现、也并非解析器补出的节点。排查时要区分：

1. 作者写入源文件的内容；
2. 解析器建树时的修复；
3. JavaScript 加载后的修改。

本课没有 JavaScript 修改 DOM，因此源文件与 Elements 的差异主要来自解析器。

### 4.3 doctype 与标准模式

现代 HTML 文档的第一行应写：

```html
<!doctype html>
```

doctype 是解析器的模式信号，不是普通 HTML 元素。它会在 DOM 中对应 `DocumentType` 节点，但不能写成 `<doctype>`，也没有结束标签。

浏览器为了兼容早期网页，保留了三类布局模式：

| 模式 | 含义 | 风险 |
| --- | --- | --- |
| 标准模式 | 按现代标准解释布局 | 新页面应使用 |
| 有限怪异模式 | 只保留部分旧行为 | 不应由新页面主动依赖 |
| 怪异模式 | 模仿部分旧浏览器行为 | 盒模型和布局可能出现意外差异 |

缺少或使用某些旧式 doctype 可能触发怪异模式。标准写法短、明确，不需要版本号或 DTD 地址。

可以在 Console 中检查：

```js
document.compatMode
```

- 返回 `"CSS1Compat"`：文档处于标准模式或有限怪异模式；
- 返回 `"BackCompat"`：文档处于怪异模式。

`compatMode` 不能区分标准模式与有限怪异模式，但足以发现常见的 doctype 缺失问题。开发者工具的文档问题提示也可作为补充证据。

doctype 不会替你修复错误嵌套。它控制兼容模式，文档结构仍要单独检查。

### 4.4 `html`、`head`、`body` 与解析器补节点

完整骨架通常写成：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>商品说明</title>
</head>
<body>
  <h1>阅读台灯</h1>
</body>
</html>
```

各部分职责如下：

- `html` 是文档根元素，`lang="zh-CN"` 声明主要语言；
- `head` 存放标题、编码、视口、样式和其他元信息；
- `body` 存放页面主体内容；
- `title` 是标签页、历史记录和书签使用的标题，不是正文标题；
- `h1` 是正文中的一级标题，不替代 `title`。

HTML 允许某些标签在严格条件下省略。即使源文件没有显式写出 `html`、`head` 或 `body` 标签，tree builder 也会在适当阶段创建对应元素。于是源文件可能只有：

```html
<!doctype html>
<meta charset="utf-8">
<title>阅读台灯</title>
<h1>阅读台灯</h1>
```

Elements 中却会看到 `html > head` 和 `html > body`。

对初学者和团队代码来说，显式写出骨架更容易阅读、审查和定位属性。解析器能够补节点，不等于省略总是更清楚。尤其是文档语言需要写在 `html` 上，显式骨架能让这一要求一目了然。

注意：“解析器补了节点”与“浏览器补齐了缺失的所有语义”不是一回事。浏览器不知道你的业务意图，不会自动生成正确的 `lang`、页面标题、商品层次或安全提示。

### 4.5 开始标签、结束标签、空元素与嵌套顺序

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

### 4.6 属性、引号与布尔属性“存在即真”

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

### 4.7 字符引用、注释与源码安全

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

### 4.8 空白折叠：源文件换行不等于页面换行

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

### 4.9 内容类别与允许的父子关系

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

### 4.10 浏览器错误恢复：确定的规则，不是自动纠错承诺

HTML 解析器遇到错误时，不会像很多编程语言那样立即停止。tree builder 使用插入模式和“已打开元素栈”等机制继续建树。常见恢复包括：

- 创建省略的 `html`、`head`、`body` 元素；
- 遇到不能放进 `p` 的块级结构时提前关闭 `p`；
- 忽略不该出现的结束标签；
- 在表格上下文中调整不合适内容的位置；
- 对交叉嵌套的文字格式元素执行专门恢复。

这些规则是规范化的，目的在于让大量历史页面仍可使用，不是鼓励作者写错误结构。错误恢复存在三个风险：

1. **DOM 与作者想象不同**：CSS 选择器和 JavaScript 查询可能失效；
2. **后续内容受影响**：一个未正确关闭的元素可能包住比预期更多的内容；
3. **维护成本上升**：浏览器结果看似正常，代码审查却难以判断真实结构。

排查时按以下证据链进行：

```text
确认打开的是目标文件
  → 查看页面源代码
  → 在 Elements 找到对应节点
  → 比较父子和兄弟关系
  → 在 Console 查询关键属性
  → 修复源文件
  → 重新加载并重复同样检查
```

不要直接在 Elements 中修改后就宣布修复。Elements 中的编辑通常只改变当前内存里的 DOM，刷新后会消失。真正的修复必须回到源文件，并在重新加载后复验。

## 5. 元素、属性、API 或配置清单

### 5.1 文档与语法清单

| 名称 | 类型 | 本课作用 | 正确示例 | 关键边界 |
| --- | --- | --- | --- | --- |
| `<!doctype html>` | 模式声明 | 启用现代标准模式 | `<!doctype html>` | 不是 HTML 元素 |
| `html[lang]` | 元素与属性 | 文档根和主要语言 | `<html lang="zh-CN">` | 解析器补 `html` 时不会猜出语言 |
| `head` | 元素 | 容纳元数据 | `<head>...</head>` | 不放商品正文 |
| `meta[charset]` | 空元素与属性 | 声明 UTF-8 | `<meta charset="utf-8">` | 文件本身也要用 UTF-8 保存 |
| `title` | 元素 | 标签页与书签标题 | `<title>阅读台灯 · 邻里集市</title>` | 不代替正文 `h1` |
| `body` | 元素 | 容纳主体内容 | `<body>...</body>` | 一份文档只有一个主体 |
| `p` | 元素 | 表示段落 | `<p>开关正常。</p>` | 只能包含短语内容 |
| `data[value]` | 元素与属性 | 关联展示文字和机器值 | `<data value="3900">39 元</data>` | 本项目价格机器值为整数分 |
| `time[datetime]` | 元素与属性 | 关联展示时间和机器时间 | `datetime="2026-10-10T08:00:00Z"` | `Z` 表示 UTC |
| `button[disabled]` | 元素与布尔属性 | 表示不可操作状态 | `<button disabled>未接入</button>` | `disabled="false"` 仍是禁用 |
| `hr` | 空元素 | 表示主题转换 | `<hr>` | 没有结束标签，不只是一条装饰线 |
| `<!-- ... -->` | 注释 | 给源码维护者说明原因 | `<!-- 静态演示 -->` | 访问者能查看，不能保存秘密 |
| `&lt;`、`&amp;` | 字符引用 | 显示语法字符 | `&lt;p&gt;` | 以分号结束 |

### 5.2 DOM 与开发者工具清单

| 名称 | 返回或显示的内容 | 本课用途 | 注意事项 |
| --- | --- | --- | --- |
| 查看页面源代码 | 原始 HTML 文本 | 确认作者输入 | 不等同于活动 DOM |
| Elements | 当前元素树 | 观察补节点和错误恢复 | 可能还包含脚本后续修改 |
| `document.doctype` | `DocumentType` 或 `null` | 检查 doctype 节点 | 不直接判断全部兼容细节 |
| `document.compatMode` | `"CSS1Compat"` 或 `"BackCompat"` | 发现怪异模式 | `"CSS1Compat"` 也包含有限怪异模式 |
| `document.documentElement` | 根 `html` 元素 | 确认文档根 | 是 DOM 对象，不是字符串 |
| `document.head` | `head` 元素 | 观察解析器补出的头部 | 源码省略标签时仍可能存在 |
| `document.body` | `body` 元素 | 进入主体 DOM | 解析完成后通常存在 |
| `element.children` | 元素子节点集合 | 查看元素层次 | 不含 Text 与 Comment |
| `node.childNodes` | 所有直接子节点集合 | 观察空白文本和注释 | 包含 Text 与 Comment |
| `querySelector()` | 首个匹配元素或 `null` | 定位案例中的节点 | 选择器正确不代表 HTML 合法 |
| `getAttribute()` | 属性的文本值或 `null` | 检查内容属性 | 与布尔对象属性含义不同 |
| `button.disabled` | 当前禁用布尔状态 | 验证存在即真 | 返回 `true` 或 `false` |
| `element.parentElement` | 元素父节点 | 验证实际父子关系 | 以 DOM 为准，不以缩进为准 |

这些 API 用于观察，不要求本课编写 JavaScript 文件。把短命令直接输入 Console 即可。

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

### 8.1 先判断错误属于哪一层

| 现象 | 优先检查 | 常见原因 | 修复方向 |
| --- | --- | --- | --- |
| 修改后页面没变化 | 地址栏路径、编辑器保存状态 | 打开了另一份同名文件或未保存 | 确认绝对路径并重新加载 |
| 中文乱码 | 文件编码、`meta charset` | 文件不是 UTF-8 或声明缺失 | 用 UTF-8 重存并靠前声明编码 |
| Elements 多出节点 | 页面源代码、父子关系 | 解析器补骨架或执行错误恢复 | 判断是合法省略还是错误结构 |
| `div` 跑出 `p` | `p` 内容模型 | `p` 不能包含 `div` | 拆成章节和独立段落 |
| 按钮写 false 仍禁用 | `hasAttribute`、`.disabled` | 把布尔属性当普通字符串 | 启用时删除整个属性 |
| 多个空格只显示一个 | Text 节点、CSS `white-space` | 默认空白折叠 | 用语义元素组织，不堆空格 |
| `<div />` 包住后续内容 | Elements 中的实际范围 | 误把斜杠当通用自闭合 | 写 `<div></div>` |
| 标签文字变成真实元素 | 页面源代码 | 未转义 `<` 和 `&` | 使用 `&lt;`、`&amp;` |
| 同一元素重复属性 | 页面源代码、Elements、HTML 检查器 | 把后写值误当成可靠覆盖 | 只保留一个属性，并明确选择正确值 |
| 注释里的信息被看到 | 查看页面源代码 | 误认为注释保密 | 删除敏感信息，不发到客户端 |
| 布局尺寸表现异常 | `document.compatMode` | 缺少合适 doctype | 使用标准 doctype |

### 8.2 固定的七步排查路径

1. **确认文件**：核对地址栏与编辑器中的目标文件路径。
2. **确认保存**：保存后重新加载，避免观察旧内容。
3. **查看源代码**：记录作者实际写入的字符。
4. **查看 Elements**：比较解析后的元素父子关系。
5. **查询状态**：用 Console 检查 `compatMode`、属性和父节点。
6. **最小修复**：只改导致差异的语法或结构，不同时加入样式和脚本。
7. **重复复验**：使用与修复前完全相同的观察步骤。

### 8.3 不可靠的“修复方式”

- 删除看不懂的节点，让页面暂时看起来整齐；
- 在 Elements 中修改后不回写源文件；
- 通过 CSS 隐藏解析产生的额外内容；
- 给错误结构增加更多 `div`，期待浏览器“自动理解”；
- 把 `disabled="false"` 改成 `disabled="0"`；
- 关闭 HTML 检查器或忽略报错；
- 只截一张页面图片，不记录源文件和 DOM。

这些做法都没有消除根因。

## 9. 课后题

先独立回答，再展开答案。判断题不仅要写“对”或“错”，还要说明证据。

### 9.1 概念题

<details>
<summary>1. `<p>` 和 `</p>` 会在 DOM 中形成两个节点吗？</summary>

不会。它们分别是源代码中的开始标签和结束标签，解析器通常据此建立一个 `p` 元素节点。段落文字会成为该元素的 Text 子节点。

</details>

<details>
<summary>2. 源文件没有写 body，而 Elements 中有 body，是否证明浏览器修改并保存了文件？</summary>

不能。HTML tree builder 可以在建树时创建 `body` 元素，Elements 展示的是活动 DOM。回到编辑器或“查看页面源代码”，仍能看到作者原始输入；除非另有工具写文件，否则解析器不会替作者保存源文件。

</details>

<details>
<summary>3. 写了 doctype 是否就能保证 HTML 结构合法？</summary>

不能。doctype 主要影响浏览器兼容模式。`p > div`、交互元素嵌套等内容模型错误仍需单独修复。

</details>

<details>
<summary>4. 为什么 disabled="false" 仍会禁用按钮？</summary>

`disabled` 是布尔属性，真假由属性是否存在决定。字符串 `"false"` 只是该属性的文本值，属性仍存在，因此对应 DOM 状态为 `true`。启用按钮需要移除整个 `disabled` 属性。

</details>

<details>
<summary>5. `<br />` 中有斜杠，是否说明任意元素都能写成 `<div />`？</summary>

不能。`br` 本来就是空元素，尾部斜杠只是兼容的书写风格；`div` 是普通元素，需要结束标签。HTML 不把斜杠当作适用于所有元素的自闭合操作符。

</details>

<details>
<summary>6. 编辑器中的连续换行为什么通常没有在页面中产生同样的空行？</summary>

解析器可能保留相应空白 Text 节点，但默认 CSS 文本处理会折叠连续空白。源码换行服务于可读性；页面段落、列表和换行应使用符合含义的元素。

</details>

### 9.2 代码判断题

观察下面代码：

```html
<p>成色<div>九成新</div>适合自取</p>
```

<details>
<summary>7. `div` 最终一定是 p 的子元素吗？请说明恢复过程。</summary>

不是。`p` 只接受短语内容。解析器处理 `div` 开始标签时会先关闭当前 `p`，于是原 `p`、`div` 和后续文本成为兄弟关系；末尾 `</p>` 还可能触发一个空段落的恢复结果。

</details>

观察下面代码：

```html
<data value="39">39 元</data>
```

<details>
<summary>8. 页面显示正确，是否符合邻里集市价格契约？</summary>

不符合。本项目价格机器值使用整数分，39 元应写成 `value="3900"`。页面显示文字不能证明机器值单位正确。

</details>

观察下面代码：

```html
<time datetime="2026-10-10T16:00:00">北京时间 16:00</time>
```

<details>
<summary>9. 这个机器时间能否被确定解释为 UTC？</summary>

不能。该字符串没有 `Z` 或时区偏移，不能被当作明确的 UTC 时间。本项目统一使用 UTC ISO，例如对应时间可写成 `2026-10-10T08:00:00Z`，展示文字再写北京时间 16:00。

</details>

### 9.3 解释题

<details>
<summary>10. “页面能显示”为什么不是 HTML 正确性的充分证据？</summary>

合格答案应包含三点：

1. 浏览器有错误恢复，会从错误源代码构造可显示的 DOM；
2. 可见文字顺序可能没有明显变化，但父子关系、属性状态或文档模式已经错误；
3. 必须对照页面源代码、Elements 和必要的 DOM 属性，再用检查器验证。

</details>

## 10. 实践练习

三个练习按“基础 → 提升 → 故障”递进。不要在教材目录创建源码文件。

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

### 10.2 提升练习：预测 token 与 DOM

**任务**

先不要打开浏览器，阅读以下源代码，写出你预测的主要 token 和 DOM。然后再运行并修正预测。

```html
<!doctype html>
<meta charset="utf-8">
<title>旧书套装</title>
<!-- 两册合售 -->
<h1>旧书套装</h1>
<p>价格：<data value="4500">45 元</data></p>
```

预测至少包含：

- doctype token 对应的节点；
- `meta` 开始标签 token；
- `title` 开始标签、字符与结束标签 token；
- comment token；
- `h1`、`p`、`data` 相关 token；
- 解析器创建但源代码没有显式标签的元素。

**个人练习路径**

```text
practice/html-01-parser/token-prediction.html
```

另在自己的学习记录中写预测，不要把答案注释进正式商品页。

**打开方式**

直接打开文件，将源代码与 Elements 并排。在 Console 比较：

```js
document.childNodes
document.documentElement.children
document.head.childNodes
document.body.childNodes
```

**预期结果**

预测中能区分 token 与节点；能指出 doctype、注释、元素和文本属于不同节点类型；能解释 `html`、`head`、`body` 节点为何存在。允许第一次预测遗漏空白 Text 节点，但复验记录必须修正。

**失败证据**

把开始标签和结束标签各画成一个元素节点、把注释当可见段落、声称 `html` token 一定存在于源文件，或者只复制 Elements 而没有写预测过程，均未达到练习目标。

### 10.3 故障练习：建立最小复现并修复

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

### 11.1 现场讲解

不看正文，用 3～5 分钟说明：

1. 源代码、token、节点、DOM 与页面画面的关系；
2. tokenizer 和 tree builder 的分工；
3. doctype 缺失为何会影响模式；
4. 浏览器为何能补出 `html`、`head`、`body`；
5. `p > div` 为何在 Elements 中改变结构；
6. `disabled="false"` 为何仍为真。

只背定义、不展示证据，不能算通过。

### 11.2 文件验收

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

### 11.3 证据验收

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

### Q1：既然浏览器会补 `html`、`head`、`body`，为什么还要写？

规范允许在特定条件下省略部分标签，但显式骨架更适合初学、团队审查和属性维护。解析器不会替你补 `lang="zh-CN"`，也不会猜出业务结构。先把完整结构写清楚，再学习何时可以有意识地省略。

### Q2：Elements 是不是比页面源代码“更真实”？

它们回答不同问题。页面源代码更接近作者输入，Elements 反映当前活动 DOM。要定位解析差异，必须同时看两者；如果页面有脚本，还要继续判断 DOM 变化来自解析器还是脚本。

### Q3：HTML 错误为什么不像 JavaScript 语法错误那样停止页面？

HTML 长期承担兼容大量历史文档的任务，规范定义了容错解析。继续建树能让用户看到尽可能多的内容，但代价是错误可能被隐藏。容错是用户代理的恢复能力，不是作者免于验证的理由。

### Q4：所有块级元素都不能放进 `p` 吗？

“块级/行内”主要是 CSS 视觉分类，不是判断 HTML 内容模型的精确术语。正确规则是：`p` 接受短语内容。应查元素的内容模型，而不是只按默认显示为一行还是一块判断。

### Q5：`disabled=""` 为什么也是真？

因为布尔属性看存在性。空字符串和属性名本身是布尔属性的常见合法写法。只有完全移除属性才表示假。

### Q6：`aria-disabled="false"` 也会因为存在而变成真吗？

不能套用 HTML 布尔属性规则。ARIA 属性的值是字符串化状态，`aria-disabled="false"` 表示没有向辅助技术声明禁用。但 ARIA 不会自动改变原生按钮行为；真实禁用优先使用原生 `disabled`。属性类型不同，必须分别查规范。

### Q7：为什么 Console 中 `childNodes` 比 `children` 多？

`childNodes` 包含元素、文本、注释等所有直接子节点；`children` 只包含元素。为了让源码易读而加入的换行和缩进，也可能形成 Text 节点。

### Q8：能否用很多 `&nbsp;` 对齐商品信息？

不应这样做。`&nbsp;` 是不换行空格，不是布局系统。商品字段应使用合适结构，视觉对齐在 CSS 阶段完成。滥用不换行空格还会影响窄屏换行。

### Q9：验证器通过，是否证明页面所有行为都正确？

不能。HTML 检查器擅长发现语法和内容模型问题，但无法证明价格单位、时间业务含义、文字准确性、真实交互、无障碍体验或服务端安全。它是证据链的一部分。

### Q10：本课为什么保留禁用按钮，而不是实现联系功能？

本课目标是 HTML 解析与文档模型，页面没有后端、账号、权限和数据保存。禁用按钮配合明确文案，能诚实表达“界面位置存在，但能力未接入”，不会虚构真实联系或预约。

## 13. 扩展阅读

以下官方规范与文档已于 **2026-10-10** 核验。HTML 与 DOM 是持续更新的标准，核验日期表示本课链接和关键规则在该日完成复查，不代表所有浏览器版本的实现永远一致。

- [WHATWG HTML：Syntax](https://html.spec.whatwg.org/multipage/syntax.html)：查开始标签、结束标签、属性、空元素、字符引用和注释语法。
- [WHATWG HTML：Parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html)：查 tokenizer、tree builder、插入模式、已打开元素栈和错误恢复。
- [WHATWG HTML：The document element](https://html.spec.whatwg.org/multipage/semantics.html#the-html-element)：查 `html`、`head`、`body` 与文档结构要求。
- [WHATWG HTML：Kinds of content](https://html.spec.whatwg.org/multipage/dom.html#kinds-of-content)：查元数据、流、分节、标题、短语、嵌入和交互内容类别。
- [WHATWG DOM Standard](https://dom.spec.whatwg.org/)：查 `Document`、`Element`、`Text`、节点树与 DOM 操作模型。
- [MDN：Quirks Mode and Standards Mode](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Quirks_mode_and_standards_mode)：查 doctype 与浏览器模式的实践说明。
- [MDN：HTML attribute reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes)：按属性核对布尔属性、枚举属性和适用元素。
- [Nu HTML Checker](https://validator.w3.org/nu/)：检查语法和内容模型；本地敏感页面不应上传，公开教学文件也要先确认不含隐私。

阅读解析规范时，不要求一次看完算法。先带着三个问题查阅：

1. 当前字符会产生什么 token？
2. tree builder 此时处于什么上下文？
3. 最终创建、忽略或移动了哪个节点？

## 我现在能做到什么

我能从一份 HTML 源文件出发，解释浏览器如何把字符转换为 token、节点和 DOM；能用 doctype 建立标准模式，显式写出文档骨架，正确处理空元素、属性、字符引用、注释和空白；还能通过源文件、Elements 与 Console 发现 `p` 错误嵌套和 `disabled="false"` 等问题，完成修复并留下复验证据。

我也能写出一份诚实的邻里集市静态商品说明：价格机器值使用整数分，时间机器值使用 UTC ISO 8601，不虚构登录、联系、预约、支付或持久化能力。

## 单元导航

[上一页：01 文档、语法与文本](../01-document-text.md) · [下一课：文档头部、元数据与资源](02-head-metadata-resources.md) · [模块入口：HTML 教材](../README.md)
