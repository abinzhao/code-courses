# HTML 解析与 DOM：从字符到浏览器树

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 追踪字符、token、节点与 DOM 的形成过程，并用源文件和 Elements 证据解释错误恢复。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `DOC-001`、`DOC-003`、`DOC-004`、`DOC-010` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

追踪字符、token、节点与 DOM 的形成过程，并用源文件和 Elements 证据解释错误恢复。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 DOC-001（HTML 源代码、token、节点与 DOM）、DOC-003（`<!doctype html>` 与标准模式）、DOC-004（`html`、`head`、`body` 与解析器补节点）、DOC-010（浏览器错误恢复和源文件/DOM 对照）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

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

### 4.5 浏览器错误恢复：确定的规则，不是自动纠错承诺

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

在个人练习目录中新建 `practice/01-html-parser-dom/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 DOC-001（HTML 源代码、token、节点与 DOM） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 DOC-003（`<!doctype html>` 与标准模式） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 为 DOC-004（`html`、`head`、`body` 与解析器补节点） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
5. 为 DOC-010（浏览器错误恢复和源文件/DOM 对照） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
6. 在打开页面前写下预期 DOM、默认行为或请求结果；
7. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
8. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [HTML 语法与内容模型：写出可预测的合法结构](02-html-syntax-content-models.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 DOC-001（HTML 源代码、token、节点与 DOM） 对应的元素、属性或状态；
- 在项目中实现并标出与 DOC-003（`<!doctype html>` 与标准模式） 对应的元素、属性或状态；
- 在项目中实现并标出与 DOC-004（`html`、`head`、`body` 与解析器补节点） 对应的元素、属性或状态；
- 在项目中实现并标出与 DOC-010（浏览器错误恢复和源文件/DOM 对照） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`02-html-syntax-content-models.md`](02-html-syntax-content-models.md)。

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

### 10.1 提升练习：预测 token 与 DOM

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

## 12. 常见问题

### Q1：既然浏览器会补 `html`、`head`、`body`，为什么还要写？

规范允许在特定条件下省略部分标签，但显式骨架更适合初学、团队审查和属性维护。解析器不会替你补 `lang="zh-CN"`，也不会猜出业务结构。先把完整结构写清楚，再学习何时可以有意识地省略。

### Q2：Elements 是不是比页面源代码“更真实”？

它们回答不同问题。页面源代码更接近作者输入，Elements 反映当前活动 DOM。要定位解析差异，必须同时看两者；如果页面有脚本，还要继续判断 DOM 变化来自解析器还是脚本。

### Q3：HTML 错误为什么不像 JavaScript 语法错误那样停止页面？

HTML 长期承担兼容大量历史文档的任务，规范定义了容错解析。继续建树能让用户看到尽可能多的内容，但代价是错误可能被隐藏。容错是用户代理的恢复能力，不是作者免于验证的理由。

### Q4：所有块级元素都不能放进 `p` 吗？

“块级/行内”主要是 CSS 视觉分类，不是判断 HTML 内容模型的精确术语。正确规则是：`p` 接受短语内容。应查元素的内容模型，而不是只按默认显示为一行还是一块判断。

### Q7：为什么 Console 中 `childNodes` 比 `children` 多？

`childNodes` 包含元素、文本、注释等所有直接子节点；`children` 只包含元素。为了让源码易读而加入的换行和缩进，也可能形成 Text 节点。

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

- 能解释并验证：追踪字符、token、节点与 DOM 的形成过程，并用源文件和 Elements 证据解释错误恢复。
- `DOC-001`：HTML 源代码、token、节点与 DOM
- `DOC-003`：`<!doctype html>` 与标准模式
- `DOC-004`：`html`、`head`、`body` 与解析器补节点
- `DOC-010`：浏览器错误恢复和源文件/DOM 对照
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[返回本章目录](../README.md#第一章文档解析与文本) · [下一课：HTML 语法与内容模型：写出可预测的合法结构](02-html-syntax-content-models.md) · [返回 HTML 模块](../README.md)
