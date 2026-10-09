# 10-HTML 表单与可访问性基础

## 目标

完成本知识单元后，学员应能够把表单视为“用户向系统提交结构化数据的对话界面”，并在没有框架帮助的情况下做出可用、可校验、可被键盘和读屏器操作的表单。学员应能够：

1. 根据数据收集需求设计 `form`，正确设置提交地址与方法，为每个可提交控件提供 `name`，并准确预测浏览器最终提交的数据内容。
2. 依据数据特征选择合适的 `input` 类型以及 `textarea`、`select`、复选框、单选按钮，并使用 `label`、`fieldset`、`legend` 建立完整的名称与分组关联。
3. 使用 `required`、`minlength`、`maxlength`、`pattern`、`min`、`max`、`step` 等属性实现原生校验，能解释校验触发时机，并明确前端校验与后端校验各自的职责边界。
4. 区分 `submit`、`reset`、`button` 三种按钮类型，在正确场景使用正确类型，避免按钮误触发提交。
5. 不使用鼠标完成整张表单的填写与提交：保证 Tab 顺序符合阅读顺序、焦点始终可见、点击 `label` 即可聚焦控件。
6. 判断何时“不需要 ARIA”、何时必须补充 ARIA，正确书写图片替代文本，达到基本对比度要求，并使用读屏器与自动化检查工具完成一轮可访问性验证。

## 技术栈

本单元只使用原生 HTML、少量 CSS 与浏览器内置校验能力，不使用任何表单库或前端框架。

| 工具或环境 | 用途 | 当前稳定版基线 |
|---|---|---|
| HTML | 表单结构、原生校验与语义关联 | WHATWG HTML Living Standard（HTML5 持续更新版） |
| WCAG | 可访问性验收依据 | WCAG 2.2（W3C 现行推荐标准） |
| Google Chrome / Edge | 预览、校验行为检查、Lighthouse 审计 | 当前稳定版 |
| Mozilla Firefox | 跨浏览器核对校验与焦点行为 | 当前稳定版 |
| Apple Safari + VoiceOver | macOS/iOS 读屏与键盘测试 | 随当前稳定版系统与浏览器发布 |
| NVDA | Windows 平台读屏器 | 当前稳定版（免费） |
| axe DevTools | 浏览器内自动化无障碍扫描 | 当前稳定版扩展 |
| Lighthouse | 可访问性整体审计 | 随浏览器当前稳定版发布 |
| WebAIM Contrast Checker | 文本对比度检查 | 当前在线版本 |
| W3C Nu Html Checker | 表单标记校验 | validator.w3.org 当前在线版本 |

学习要求与约定：

- 所有练习文件使用 UTF-8 编码、两个空格缩进。
- 不为了“好看”而关闭焦点轮廓或阻止键盘操作。
- 原生校验是本单元主线；JavaScript 自定义校验只做概念演示，不引入校验库。
- 读屏器测试以“能完整走通一张表单”为底线，不要求记忆全部快捷键。
- 可访问性目标对齐 WCAG 2.2 的 A 与 AA 级要求，本单元覆盖其中与表单直接相关的条目。

开始前检查环境：

```bash
mkdir -p form-a11y-lab && cd form-a11y-lab
touch signup.html
```

预期观察：

- macOS 学员可按 `Cmd+F5` 唤起 VoiceOver；Windows 学员可安装 NVDA。
- 浏览器中按 Tab 键可以在页面链接与控件之间循环移动焦点。

## 详细的理论知识讲解和示例伪代码

### 1. form 元素与数据提交机制

#### 1.1 定义

`form` 元素把一组表单控件包裹成一个可整体提交的数据集合。核心属性：

- `action`：提交地址，即接收数据的 URL；省略时提交到当前页面地址。
- `method`：HTTP 方法，表单最常用 `get`（默认，数据拼在 URL 查询串中）与 `post`（数据放在请求体中）。
- `novalidate`：关闭浏览器原生校验，通常在使用自定义校验时才加。
- `autocomplete`：控制浏览器自动填充，`on` 或 `off`。

每个“会被提交”的控件必须有 `name` 属性。提交的数据由若干“名称=值”对组成，名称来自 `name`，值来自用户当前输入或选择。

#### 1.2 与 Web 的关系

表单是 Web 从“只读文档”走向“可交互应用”的起点：登录、下单、发帖、搜索，本质都是用户填表、浏览器编码、发送 HTTP 请求、服务器处理后返回结果。

使用 `get` 提交时，数据出现在 URL 中，可被收藏和分享，但不适合密码等敏感信息，且长度受 URL 限制；使用 `post` 时数据位于请求体，适合提交敏感或较长的数据。服务器不能信任任何来自表单的数据，必须重新校验（前端代码运行在用户设备上，可以被绕过或修改）。

#### 1.3 提交数据长什么样

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>订阅表单</title>
  </head>
  <body>
    <form action="/subscribe" method="post">
      <label>
        邮箱
        <input type="email" name="email" />
      </label>

      <label>
        <input type="checkbox" name="weekly" value="yes" />
        每周接收精选
      </label>

      <button type="submit">订阅</button>
    </form>
  </body>
</html>
```

当用户输入 `a@example.com` 并勾选复选框后，提交的数据可表示为：

```text
email=a%40example.com&weekly=yes
```

未勾选的复选框、未选中的单选按钮不会出现在提交数据中——这是“复选框提交后像消失了”的常见原因。被 `disabled` 的控件同样不会提交。

#### 1.4 name 与 label 的区别

| 属性 | 服务对象 | 是否影响提交 |
|---|---|---|
| `name` | 浏览器与服务器，决定数据字段名 | 是，没有 name 的控件不提交 |
| `id` | CSS、JavaScript、label 关联 | 否 |
| `label` 文本 | 用户与读屏器，说明控件含义 | 否，但决定可用性 |

#### 1.5 常见误区

> 控件有 `id` 就会被提交。

提交只认 `name`。`id` 用于锚点、样式和脚本，不会成为数据字段。

> 用 `get` 提交密码也没关系，地址栏别人看不到。

URL 会进入浏览器历史、服务器访问日志、代理日志和 Referer 头。任何敏感字段都必须通过加密连接配合 `post` 提交，且前端永远不是安全边界。

### 2. input 类型与其他表单控件

#### 2.1 定义

`input` 是通过 `type` 变化形态的多面手控件；`textarea` 收多行文本；`select` 配 `option` 提供下拉选择；单选与复选通过同一组 name 配合实现。

常用 input 类型：

| type | 用途 | 附加效果 |
|---|---|---|
| `text` | 单行普通文本（默认） | 无 |
| `email` | 邮箱 | 移动端弹出含 @ 的键盘，原生格式校验 |
| `tel` | 电话号码 | 移动端弹出电话键盘，不强制格式 |
| `url` | 网址 | 要求包含协议等合法 URL 形式 |
| `number` | 数字 | 上下调节按钮，配合 min/max/step |
| `password` | 密码 | 内容遮蔽，不防窃取 |
| `search` | 搜索词 | 部分浏览器提供一键清除 |
| `date` / `time` | 日期 / 时间 | 弹出原生选择器 |
| `checkbox` | 多选 | 同组可多选，需要 value |
| `radio` | 单选 | 同 name 一组，组内互斥 |
| `hidden` | 不可见数据 | 仍会提交，不能存放敏感信息 |
| `file` | 文件上传 | form 需设 `enctype="multipart/form-data"` |

#### 2.2 与 Web 的关系

正确的类型让浏览器在移动端给出合适键盘、提供原生选择器与校验，减少自定义控件的工作量，也让自动填充、密码管理器能识别字段。配合 `autocomplete="email"`、`autocomplete="new-password"` 等提示，浏览器能更准确地帮用户填写。

#### 2.3 控件示例

```html
<form action="/apply" method="post">
  <p>
    <label for="name">姓名</label>
    <input id="name" name="name" type="text" autocomplete="name" required />
  </p>

  <p>
    <label for="phone">手机号</label>
    <input id="phone" name="phone" type="tel" autocomplete="tel" pattern="1[3-9][0-9]{9}" />
  </p>

  <p>
    <label for="city">面试城市</label>
    <select id="city" name="city">
      <option value="">请选择</option>
      <option value="beijing">北京</option>
      <option value="shanghai">上海</option>
      <option value="guangzhou">广州</option>
    </select>
  </p>

  <p>
    <label for="intro">自我介绍</label>
    <textarea id="intro" name="intro" rows="5" maxlength="300"></textarea>
  </p>

  <button type="submit">提交申请</button>
</form>
```

单选与复选分组：

```html
<fieldset>
  <legend>求职方向（单选）</legend>

  <label>
    <input type="radio" name="direction" value="frontend" checked />
    前端
  </label>
  <label>
    <input type="radio" name="direction" value="backend" />
    后端
  </label>
</fieldset>

<fieldset>
  <legend>可接受的工作方式（多选）</legend>

  <label>
    <input type="checkbox" name="mode" value="onsite" />
    坐班
  </label>
  <label>
    <input type="checkbox" name="mode" value="remote" />
    远程
  </label>
</fieldset>
```

单选按钮互斥依靠的是“相同的 name”，不是靠包裹容器；多选复选框若希望服务器收到多个同名字段，也共用一个 name。

#### 2.4 select 的 option 细节

- 第一个 `option` 常做成“请选择”占位，并赋空值，配合 `required` 强制选择。
- `optgroup` 可以给选项分组，`label` 属性显示分组名。
- 加 `multiple` 后变为多选列表，交互与普通下拉不同，需明确告知用户操作方式。

#### 2.5 常见误区

> 用 `type="number"` 收集手机号、银行卡号。

这类号码是“由数字组成的标识符”，可能以 0 开头、含空格或连字符，不应参与数值运算。应使用 `type="tel"` 配合 `pattern`。

> `textarea` 可以像 input 一样自闭合，并用 value 属性设初值。

`textarea` 必须成对出现，初始内容写在开闭标签之间：`<textarea name="x">默认内容</textarea>`。

### 3. label、fieldset 与 placeholder 的边界

#### 3.1 定义

- `label`：控件的可见名称。关联方式两种：把控件包在 label 内（隐式关联），或用 `for` 指向控件 `id`（显式关联）。
- `fieldset`：把一组相关控件打包；`legend` 是这组控件的标题。
- `placeholder`：输入框内的浅灰提示，描述预期格式示例，输入后消失。

#### 3.2 与 Web 的关系

关联 label 后：点击文字即可聚焦或勾选控件，扩大了触控面积；读屏器聚焦控件时会朗读 label 文本，用户知道自己在填什么。`fieldset/legend` 是单选组、复选组的标准分组方式，读屏器进入组内会先朗读 legend。

placeholder 不是 label：它颜色浅、对比度往往不达标；输入一个字后提示就消失；较长的提示会被截断。label 应常驻可见，placeholder 只补充格式示例。

#### 3.3 两种 label 关联写法

```html
<!-- 显式关联：for 与 id 对应 -->
<p>
  <label for="email">邮箱</label>
  <input id="email" name="email" type="email" required />
</p>

<!-- 隐式关联：控件包在 label 中 -->
<p>
  <label>
    昵称
    <input name="nickname" type="text" />
  </label>
</p>
```

分组写法：

```html
<fieldset>
  <legend>到岗时间</legend>

  <label>
    <input type="radio" name="arrival" value="one-week" />
    一周内
  </label>
  <label>
    <input type="radio" name="arrival" value="one-month" />
    一个月内
  </label>
  <label>
    <input type="radio" name="arrival" value="negotiate" />
    需协商
  </label>
</fieldset>
```

label 与 placeholder 的正确分工：

```html
<label for="id-number">身份证号</label>
<input
  id="id-number"
  name="id_number"
  type="text"
  placeholder="示例：110101199001011234"
  pattern="[0-9]{17}[0-9X]"
  required
/>
```

#### 3.4 对比表

| 维度 | label | placeholder |
|---|---|---|
| 是否常驻 | 是 | 输入后消失 |
| 点击能否聚焦控件 | 能 | 不能 |
| 读屏器是否作为名称朗读 | 是 | 支持不一致，不可依赖 |
| 对比度保障 | 由正文颜色保障 | 默认浅灰，常不达标 |
| 职责 | 说明“这是什么字段” | 举例“格式长什么样” |

#### 3.5 常见误区

> 一个 label 可以通过空格分隔写多个 id，关联多个控件。

`for` 只能引用一个 id。一组控件应由 `fieldset/legend` 命名，而不是共用 label。

> 界面想极简，用 placeholder 当标签就够了。

用户开始输入后就失去字段提示，回头检查时无法知道每格填的是什么。极简设计可以把 label 视觉上隐藏，但仍要保留在 HTML 中（供读屏器朗读），而不是删掉。

### 4. 按钮类型

#### 4.1 定义

`button` 元素通过 `type` 区分三种行为：

| type | 行为 | 典型用途 |
|---|---|---|
| `submit` | 提交所属表单（按钮的默认类型） | 表单最后的“提交”“保存” |
| `reset` | 把控件恢复到初始值 | 少见，需要谨慎使用 |
| `button` | 无内置行为，等待脚本绑定 | “添加一项”“发送验证码” |

#### 4.2 与 Web 的关系

在表单内部，任何没有显式声明类型的 `button` 默认都是 `submit`，点击会触发校验与提交。许多“点一下按钮页面就刷新/数据莫名提交”的问题，根源都是把普通操作按钮放进了表单却没有写 `type="button"`。

`input` 也能做按钮（`<input type="submit">`），但 `button` 元素内部可以放图标、换行等更丰富的内容，是现代页面首选。

#### 4.3 示例

```html
<form id="team-form" action="/teams" method="post">
  <p>
    <label for="member">成员邮箱</label>
    <input id="member" name="member" type="email" />
  </p>

  <p>
    <button type="button" id="add-member">添加到名单</button>
    <button type="button" id="send-code">发送验证码</button>
  </p>

  <p>
    <button type="reset">清空重填</button>
    <button type="submit">保存团队</button>
  </p>
</form>
```

行为说明伪代码：

```text
点击“添加到名单”（type=button）
    仅执行脚本：把邮箱追加到页面名单
    不提交、不刷新

点击“保存团队”（type=submit）
    浏览器先执行原生校验
    校验通过后把表单数据提交到 /teams

点击“清空重填”（type=reset）
    所有控件恢复到页面加载时的值
    不发送请求
```

#### 4.4 reset 的取舍

`reset` 会无提示地抹掉用户已填内容，容易造成误操作损失。除非表单确实需要频繁恢复初始值，否则不放置该按钮；需要“取消”时，更常见的是提供返回链接而不是 reset。

#### 4.5 常见误区

> 用 `div` 或 `span` 加点击事件做“按钮”更灵活。

非按钮元素默认不能聚焦、不在 Tab 序列中、回车与空格不会触发，读屏器不会播报为按钮。可点击的操作应使用 `button`；跳转导航应使用 `a`。这就是“按钮用 button、链接用 a”原则。

> 所有按钮都写成 submit，脚本里再阻止默认行为也行。

依赖脚本拦截容易遗漏，且在脚本加载失败时会错误提交。应直接声明正确的 type，而不是全员 submit 再补救。

### 5. 原生约束校验

#### 5.1 定义

浏览器内置一套约束校验（constraint validation）。常用属性：

- `required`：字段必须填写或选择。
- `minlength` / `maxlength`：文本最少、最多字符数。
- `min` / `max` / `step`：数字与日期的下限、上限与步长。
- `pattern`：正则表达式，要求整值匹配（自带首尾锚定）。
- `type` 本身也是约束，如 `email`、`url`。
- 控件可用 `title` 或后续学习的自定义提示补充格式说明。

#### 5.2 与 Web 的关系

提交时浏览器先检查所有约束；存在不满足的控件时，提交被阻止，问题控件获得焦点并显示内置错误提示。这套机制无需脚本即可工作，能拦截大量无意遗漏，是体验的第一道防线。

但前端校验可以被关闭（`novalidate`、直接构造请求、修改页面），因此它的职责是“即时反馈、减少无效往返”；安全与业务规则的最终判定永远在后端。两者不是二选一。

#### 5.3 示例

```html
<form action="/register" method="post">
  <p>
    <label for="reg-name">用户名</label>
    <input
      id="reg-name"
      name="username"
      type="text"
      required
      minlength="3"
      maxlength="20"
      pattern="[A-Za-z0-9_]+"
      title="3 至 20 位，仅限字母、数字与下划线"
    />
  </p>

  <p>
    <label for="reg-age">年龄</label>
    <input id="reg-age" name="age" type="number" min="18" max="120" step="1" required />
  </p>

  <p>
    <label for="reg-password">密码</label>
    <input
      id="reg-password"
      name="password"
      type="password"
      required
      minlength="8"
      autocomplete="new-password"
    />
  </p>

  <button type="submit">注册</button>
</form>
```

校验规则与提示对应关系：

| 属性 | 不满足时的典型情形 | 提示改进方式 |
|---|---|---|
| `required` | 留空提交 | label 中标明必填，错误出现时定位到该字段 |
| `minlength` | 少于下限 | title 说明长度要求 |
| `pattern` | 含非法字符 | title 给出允许的字符集 |
| `min/max` | 超出范围 | 在说明文字中给出范围 |
| `type=email` | 缺少 @ 或域名 | placeholder 只给格式示例 |

#### 5.4 关闭与绕过

- 给 form 加 `novalidate`：整表关闭原生校验，通常用于脚本完全接管校验与错误展示。
- 给 submit 按钮加 `formnovalidate`：仅本次提交跳过校验，适合“保存草稿”。
- 无论怎样关闭，后端校验都不能省。

#### 5.5 常见误区

> pattern 写了 `[0-9]{6}` 却输入 8 位也通过，说明浏览器坏了。

`pattern` 默认要求“存在匹配的子串”式校验在表单校验中实际是整值锚定的，但更常见的原因是作者混淆了规则：需要严格限定长度时应写 `[0-9]{6}` 并确认没有其他属性冲突；跨浏览器行为以规范与实测为准，长度硬约束应同时使用 `minlength`、`maxlength`。

> 有了原生校验，后端可以直接信任数据。

攻击者可以不经过浏览器直接构造请求。后端必须对类型、长度、格式、权限和业务约束重新做完整校验。

### 6. 键盘可达性：焦点、Tab 顺序与焦点可见

#### 6.1 定义

- 焦点（focus）：当前接收键盘输入的控件状态。
- Tab / Shift+Tab：按文档顺序在可聚焦元素间向前、向后移动。
- `tabindex`：控制是否可聚焦及顺序，`0` 表示加入自然顺序，`-1` 表示可被脚本聚焦但不在 Tab 序列中，正值会改变顺序（应避免）。
- 焦点可见（focus visible）：聚焦时有清晰的视觉指示，如输入框高亮、按钮外框。

#### 6.2 与 Web 的关系

键盘是运动障碍用户、键盘效率用户和读屏器用户的基础操作方式。可聚焦元素天然包括链接、按钮、输入框、select 等；交互的完整闭环应能只用键盘完成：聚焦、输入或选择、触发提交、看到错误后返回修正。

焦点顺序默认跟随 DOM 顺序。用 CSS 的 `order`、浮动或定位改变视觉顺序而不改 DOM，会导致“看到的顺序”和“Tab 的顺序”不一致。焦点轮廓 `outline` 不应被简单设为 `none`，需要替换为同样清晰的自定义指示。

#### 6.3 示例

```html
<style>
  /* 不删除焦点指示，而是换成符合设计的样式 */
  input:focus-visible,
  button:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  a:focus-visible {
    outline: 2px solid #0b5fff;
    outline-offset: 2px;
  }

  .field-error {
    color: #b3261e;
  }
</style>

<form action="/feedback" method="post">
  <p>
    <label for="topic">主题</label>
    <input id="topic" name="topic" type="text" required aria-describedby="topic-error" />
    <span class="field-error" id="topic-error">请填写反馈主题</span>
  </p>

  <p>
    <button type="submit">发送反馈</button>
  </p>
</form>
```

跳过链接（skip link）让键盘用户跳过每页重复的导航：

```html
<body>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <header>…导航…</header>
  <main id="main-content">…</main>
</body>
```

```css
.skip-link {
  position: absolute;
  left: -999px;
}

.skip-link:focus {
  left: 8px;
  top: 8px;
}
```

#### 6.4 键盘检查清单

```text
1. 不碰鼠标，从地址栏开始按 Tab：顺序是否与阅读顺序一致？
2. 每个控件是否都有清晰可见的焦点指示？
3. 单选组用方向键、复选框用空格、按钮用回车或空格能否操作？
4. 提交出错后，焦点是否能被引导到第一个错误字段？
5. 没有出现“焦点消失在某个自定义控件里出不来”的情况？
```

#### 6.5 常见误区

> `tabindex="5"` 可以精细控制顺序，让布局更自由。

正 tabindex 会把元素插到自然顺序前面，维护成本高且容易混乱。应通过调整 DOM 顺序解决，只用 `0` 与 `-1`。

> 焦点外框破坏设计美观，全局 `outline: none`。

失去焦点指示后，键盘用户无法知道自己操作到哪里。可以自定义样式，但不能无声删除。

### 7. ARIA 使用原则与图片替代文本

#### 7.1 定义

ARIA（Accessible Rich Internet Applications）是一组属性，用于在原生 HTML 无法表达角色、状态、名称时向辅助技术补充信息，如 `role`、`aria-label`、`aria-labelledby`、`aria-describedby`、`aria-hidden`、`aria-live`。

第一条原则是“能不用就不用”：原生语义元素（`button`、`nav`、`input`）自带角色与状态，用 ARIA 重复声明反而制造冗余和冲突。

图片替代文本 `alt` 的基本规则：

- 内容图：简洁描述图片传达的信息。
- 功能图（图片链接、图片按钮）：描述目标功能，如“返回首页”。
- 装饰图：`alt=""`，让读屏器跳过。
- 复杂信息图：附近提供等价的完整文字说明。

#### 7.2 与 Web 的关系

读屏器把无障碍树朗读成语音。ARIA 只改变无障碍树，不改变外观与行为——因此“加了 role=button”不会让元素变得可点击、可聚焦，键盘事件仍需自己处理。这也是优先使用原生元素的原因：行为、焦点、角色一次到位。

#### 7.3 何时需要 ARIA

不需要 ARIA 的情形：

```html
<!-- 原生按钮自带“按钮”角色与可操作性 -->
<button type="button" aria-expanded="false" id="filter-btn">展开筛选</button>
```

需要少量 ARIA 的情形——用原生元素表达控件，用 ARIA 补状态与关联：

```html
<button type="button" id="filter-toggle" aria-expanded="false" aria-controls="filter-panel">
  展开筛选条件
</button>

<div id="filter-panel" hidden>
  <!-- 筛选控件 -->
</div>
```

补充关联说明：

```html
<label for="password">密码</label>
<input
  id="password"
  name="password"
  type="password"
  aria-describedby="password-rule"
/>
<span id="password-rule">至少 8 位，需包含字母与数字</span>
```

给无可表述内容的容器提供可访问名称：

```html
<nav aria-label="面包屑">
  <ol>
    <li><a href="/">首页</a></li>
    <li><a href="/docs">文档</a></li>
  </ol>
</nav>
```

#### 7.4 alt 决策表

| 图片类型 | alt 写法 | 示例 |
|---|---|---|
| 内容插图 | 描述信息，不含“图片”二字 | `alt="毕业典礼上毕业生抛起学位帽"` |
| 图片按钮 | 描述动作 | `alt="搜索"` |
| 与相邻文字重复 | 空 alt | `alt=""` |
| 纯装饰 | 空 alt 或改 CSS 背景 | `alt=""` |
| 图表 | 简述结论 + 附近长说明 | `alt="销售额逐季增长，详见下表"` |

#### 7.5 常见误区

> 给所有元素加 `role` 更保险。

`<button role="button">` 是冗余；给 `div` 加 `role="button"` 却不补键盘事件是“假按钮”。冗余与伪装都有害。

> alt 要写得详细，最好写“一张……的图片”。

读屏器已会朗读“图像”，不必重复；替代文本应传达信息本身，长度服从内容需要。

### 8. 对比度、读屏器测试与检查工具

#### 8.1 定义

- 对比度：文本（含图片中的文字）与背景之间的亮度差异。WCAG 2.2 的 AA 级要求普通文本至少 4.5:1、大号文本至少 3:1；非文本的视觉边界（如输入框边框、焦点指示）也应有足够可辨性。
- 读屏器：把屏幕内容以语音或盲文输出的软件，如 VoiceOver、NVDA。
- 自动化检查：axe、Lighthouse 能发现约一部分规则性问题，但替代文本质量、键盘流程仍需人工验证。

#### 8.2 与 Web 的关系

低视力用户、强光环境下的普通用户都依赖对比度阅读；表单边界、错误状态若只靠颜色区分（如只把边框变红），色盲用户可能无法察觉，应同时提供文字说明或图标。

自动化工具是“起点而非终点”：它们能发现缺 alt、对比度不足、标签缺失，但无法判断 alt 是否准确、操作是否符合直觉，必须配合真实键盘与读屏器走查。

#### 8.3 错误提示不止靠颜色

```html
<p>
  <label for="email2">邮箱</label>
  <input
    id="email2"
    name="email"
    type="email"
    aria-invalid="true"
    aria-describedby="email2-error"
  />
  <span id="email2-error">
    邮箱格式不正确，请输入类似 name@example.com 的地址
  </span>
</p>
```

要点：

- `aria-invalid="true"` 告知读屏器该字段处于错误状态。
- 错误文字同时承担“非颜色信号”，不只靠红色边框。
- `aria-describedby` 让读屏器聚焦时补充朗读错误说明。

#### 8.4 一轮完整检查流程

```text
1. W3C 校验：先保证 HTML 本身合法。
2. 纯键盘走查：从开始到提交只使用键盘，记录每个卡点。
3. 焦点检查：确认焦点始终可见、顺序合理、错误后能回到问题字段。
4. 自动化扫描：用 axe 或 Lighthouse 扫描，逐条处理报告。
5. 对比度检查：用 WebAIM Contrast Checker 核对正文、提示文字、输入框边界。
6. 读屏器走查：完整填写一次，再故意制造一次错误提交，听名称、错误与顺序是否清楚。
```

读屏器走查时的关注点：

| 检查项 | 期望听到/发生 |
|---|---|
| 聚焦输入框 | 先朗读 label，再朗读类型与必填等状态 |
| 进入单选组 | 朗读 legend，再朗读选项与当前选中状态 |
| 字段出错 | 朗读错误说明，aria-invalid 被提示 |
| 到达提交按钮 | 朗读“按钮”角色 |
| 装饰图片 | 被静默跳过 |

#### 8.5 常见误区

> Lighthouse 可访问性满分就等于无障碍达标。

自动化无法覆盖标签是否准确、读屏顺序是否自然、错误提示是否易懂。满分只是“未发现规则性问题”，不是用户体验证明。

> 可访问性是上线前最后补一轮的工作。

语义与标签关联在结构成型后补改成本很高。从写第一个控件起就配 label、保顺序，才是成本最低的路径。

## 课后题

1. 请解释 `name`、`id` 与 label 文本三者分别服务谁、是否影响提交。一个没有 `name` 的输入框用户仍能输入，为什么提交后服务器收不到它？
2. 场景分析：用户勾选了“订阅周报”复选框，但提交数据里没有这个字段。请列出至少三个可能原因，并说明各自如何验证。
3. 为什么手机号、银行卡号不建议用 `type="number"`？应使用什么类型，如何约束格式？
4. 场景分析：表单中有一个“添加成员”按钮，点击后整页刷新、表单被提交。请给出最可能的原因与修复方式，并总结按钮类型选择规则。
5. 请对比 label 与 placeholder 的职责。场景：设计师希望“极简风格、只保留框内灰字”，你会如何在保持视觉目标的同时不牺牲可访问性？
6. `fieldset/legend` 解决什么问题？请为“付款方式（微信、支付宝、银行卡三选一）”写出完整的语义结构。
7. 场景分析：后端同事说“你们前端已经做了 required 和 pattern，我直接入库就行”。请说明为什么不能这样做，以及前端校验与后端校验各自的职责。
8. 什么是焦点可见？场景：代码评审发现全局 `* { outline: none; }`，请指出风险并给出合规改法。
9. 场景分析：同事给一个 `div` 加了 `role="button"` 和点击事件，认为已经“无障碍化”。键盘用户和读屏器用户仍会遇到什么问题？正确做法是什么？
10. 自动化无障碍工具能发现什么、不能发现什么？请写出你自己完成一张表单可访问性验收的完整流程。

## 实践练习题

### 练习 1：可提交的活动报名表单

#### 任务

创建 `signup.html`，实现一个活动报名表单：姓名、邮箱、手机号、身份（单选：学生/在职）、参加场次（多选）、备注。要求不使用 JavaScript，表单在原生能力下即可正确命名、分组与校验，并预测提交数据。

#### 步骤约束

1. 表单设置 `action` 与 `method="post"`；每个可提交控件都有 `name`。
2. 每个控件都有可见且正确关联的 label；单选与多选用 `fieldset/legend` 分组。
3. 手机号用 `type="tel"` 并加 `pattern`；邮箱用 `type="email"`；备注用 `textarea` 并设置 `maxlength`。
4. 至少三个必填字段使用 `required`；多选复选框必须提供 `value`。
5. 提交按钮使用正确的 type；不放置无意义的 reset。
6. 填写一份样例数据，手工写出“名称=值”提交串，解释未勾选项为何缺席。

#### 提交物

- `signup.html`；
- 一份手工编写的提交数据串及字段对照说明；
- W3C 校验结果。

#### 验收标准

- 全部控件都有 name 与关联 label，分组语义正确；
- 提交串字段齐全、编码合理，能解释缺席字段；
- 原生校验在留空、错格式时能阻止提交；
- 按钮行为正确，没有意外提交；
- 校验器无 Error。

### 练习 2：纯键盘与焦点走查改造

#### 任务

复制练习 1 为 `signup-keyboard.html`，在页面顶部加入“跳到主要内容”链接，补充清晰的焦点样式，然后完成一次严格的纯键盘走查并记录每一步；随后故意制造至少两个错误提交，检查错误提示方式。

#### 步骤约束

1. skip link 默认视觉隐藏，聚焦时可见，跳转目标为 `main`。
2. 为所有交互元素提供 `:focus-visible` 样式，不允许仅删除 outline。
3. 全程不使用鼠标完成填写、选择、提交；记录 Tab 顺序并与视觉顺序比对。
4. 错误提示不能只靠颜色，需包含文字；错误字段使用 `aria-invalid` 与 `aria-describedby`（可用浏览器内置错误，也可加静态说明文字）。
5. 检查 `tabindex` 使用情况：除 skip link 目标外不出现正 tabindex。
6. 形成键盘走查记录，列出至少发现的一个问题及修复过程。

#### 提交物

- `signup-keyboard.html`；
- 键盘走查记录表（步骤、按键、焦点位置、是否顺畅）；
- 问题与修复说明。

#### 验收标准

- 纯键盘可以完成全流程，焦点始终可见；
- Tab 顺序与视觉顺序一致，没有焦点陷阱；
- 错误状态包含文字信息并正确关联；
- skip link 工作正常；
- 走查记录真实，问题修复可复现。

### 练习 3：读屏器与自动化无障碍验收

#### 任务

在练习 2 基础上完成 `signup-a11y.html`（或在原文件上完善），用 axe DevTools 或 Lighthouse 做自动化扫描，用至少一种读屏器完整走一遍，输出一份可访问性验收报告。

#### 步骤约束

1. 运行 axe 或 Lighthouse，保存扫描结果；对每条 serious/critical 问题给出处理记录。
2. 用 VoiceOver 或 NVDA 完成一次正常填写与一次错误填写，记录朗读到的名称、角色、状态。
3. 检查正文、提示文字与输入框边界对比度达到 AA 级（普通文本 4.5:1）。
4. 复核 ARIA：删除任何冗余 role；确认不存在“假按钮”；如使用 aria-expanded 等状态，属性值与界面一致。
5. 页面中的图片（若有）按 alt 决策表处理，装饰图空 alt。
6. 撰写验收报告，明确区分“工具已覆盖项”与“人工验证项”。

#### 提交物

- `signup-a11y.html`；
- 自动化扫描结果；
- 读屏器走查记录；
- 对比度检查记录；
- 一份无障碍验收报告。

#### 验收标准

- 自动化扫描无 serious/critical 遗留问题；
- 读屏器走查能听到字段名称、分组、状态与错误说明；
- 对比度达到 AA 级，错误信息不依赖颜色单一通道；
- 报告清楚说明自动化的能力边界；
- 所有 ARIA 使用遵循“原生优先、缺什么补什么”。

## 阶段验收作业

### 作业名称

无障碍会议注册表单：从标记到读屏走查

### 作业场景

一个技术大会开放报名。注册页面必须在三类终端上可靠工作：笔记本上的鼠标用户、只用键盘的用户、使用读屏器的用户。会务组还会把部分字段对接后端系统，因此字段命名、提交数据和校验边界必须清楚。你的任务是交付一张真实可提交、可校验、可被辅助技术完整操作的注册表单，并提供全套验证证据。

### 提交物清单

```text
conf-registration/
├── index.html              # 注册表单（必做）
├── styles/
│   └── form.css            # 表单与焦点样式
├── evidence/
│   ├── validation.txt      # W3C 校验结果
│   ├── keyboard-test.md    # 纯键盘走查记录
│   ├── screenreader.md     # 读屏器走查记录
│   └── contrast.md         # 对比度记录
│   └── axe-report.txt      # 自动化扫描结果
├── data/
│   └── payload.md          # 提交数据预测与字段字典
└── README.md               # 运行与验收说明
```

约束：

- 不使用任何框架、表单库与 npm 依赖；JavaScript 如使用，仅允许做少量焦点引导，校验以原生为主。
- 不提交真实手机号、身份证号等个人数据；演示数据一律使用虚构样例。
- 样式自行编写，不引用第三方 UI 库。

### 必做内容

#### 1. 字段与分组

至少包含：姓名、邮箱、手机号、所属公司、参会身份（单选）、感兴趣主题（多选不少于三个）、是否需要发票（复选）、饮食备注（textarea）。使用至少两个 `fieldset/legend` 分组。

#### 2. 命名、提交与校验

每个控件有 `name` 并在 `data/payload.md` 中提供字段字典（字段名、含义、类型、是否必填、可选值）。使用至少五种不同的原生约束属性；提供一个使用 `formnovalidate` 的“保存草稿”按钮并解释其行为差异。

#### 3. 键盘与焦点

提供 skip link、`:focus-visible` 样式；Tab 顺序与视觉顺序一致；提交失败时能在说明中描述如何引导用户返回错误字段。

#### 4. 无障碍验证

完成 W3C 校验、键盘走查、读屏器走查、对比度检查与自动化扫描五类证据；错误提示包含文字且不依赖单一颜色；ARIA 使用符合原生优先原则。

### 验收演示流程

学员需要在 15 至 20 分钟内完成以下演示：

1. 用读屏器或模拟朗读，从 skip link 开始走到提交，指出至少两处名称关联与一处分组（4 分钟）。
2. 全程键盘完成一次正常注册，展示焦点样式与“保存草稿”的跳过校验行为（4 分钟）。
3. 故意触发至少两类校验错误，展示错误信息与字段关联（4 分钟）。
4. 根据 `payload.md` 解释提交数据，说明未勾选控件与 disabled 控件为何缺席（3 分钟）。
5. 展示五类证据文档，回答导师针对任一控件的追问（3 分钟）。

导师可临时增加一个字段（如“是否参加晚宴”），要求学员现场给出类型、name、label、分组与校验方案。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 表单结构与提交 | 20 | form 属性正确，控件齐全，字段字典与提交预测准确 |
| label 与分组 | 20 | 全部控件有关联 label，分组使用 fieldset/legend |
| 原生校验 | 15 | 至少五种约束属性，行为正确，前后端边界清晰 |
| 键盘可达性 | 20 | skip link、焦点可见、顺序合理、无焦点陷阱 |
| ARIA 与替代文本 | 10 | 原生优先，无冗余与伪装，alt 决策正确 |
| 证据与表达 | 15 | 五类证据齐全，记录真实，README 可指导复现 |

细分评分规则：

#### 表单结构与提交：20 分

- form 的 action/method 正确：4 分；
- 控件类型选择合理：6 分；
- name 齐全且字段字典清晰：6 分；
- 提交数据预测准确：4 分。

#### label 与分组：20 分

- label 关联方式正确：8 分；
- 至少两个 fieldset/legend：7 分；
- placeholder 未越权充当 label：5 分。

#### 原生校验：15 分

- 至少五种约束属性：7 分；
- 按钮类型与 formnovalidate 正确：4 分；
- 能说明后端必须重校：4 分。

#### 键盘可达性：20 分

- skip link 可用：4 分；
- focus-visible 清晰：6 分；
- Tab 顺序与视觉一致：6 分；
- 错误后能回到问题字段：4 分。

#### ARIA 与替代文本：10 分

- 无冗余 role 与假按钮：5 分；
- 图片 alt 与错误关联正确：5 分。

#### 证据与表达：15 分

- 五类证据齐全：8 分；
- 记录与实际行为一致：4 分；
- README 可复现：3 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 存在没有 label 关联的可输入控件，或用 placeholder 完全替代 label。
2. 键盘无法完成提交，或存在焦点陷阱、焦点不可见。
3. 使用 `div`/`span` 伪装按钮且不提供键盘操作。
4. 控件缺少 name 却要求服务器收数，或提交数据预测与实际明显不符且无法解释。
5. 声称“前端已校验”而否定后端校验的必要性。
6. 对比度低于 AA 要求且错误只靠颜色传达，经指出仍不修正。
7. 提交真实个人信息或任何敏感数据，或只交截图不交源码与证据。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 设计可提交的 form 并预测数据 | `index.html` 与 `data/payload.md` |
| 选择合适控件与 input 类型 | 字段字典与现场说明 |
| 建立 label 与分组关联 | 页面结构与读屏器走查 |
| 使用原生校验并理解边界 | 校验演示与前后端职责说明 |
| 正确使用三种按钮类型 | 正常提交与保存草稿演示 |
| 保障纯键盘可操作 | 键盘走查记录与现场演示 |
| 正确使用 ARIA 与 alt | 无障碍树、扫描结果与代码 |
| 对比度与综合无障碍验收 | 对比度记录、axe 报告与读屏记录 |

### 提交前自检

- [ ] 每个可提交控件都有 name，字段字典与页面一一对应。
- [ ] 每个控件都有正确关联的可见 label，单选与多选完成分组。
- [ ] placeholder 只承担格式示例，没有替代 label。
- [ ] 至少使用五种原生约束属性，错误提示含文字信息。
- [ ] 按钮 type 明确：普通操作是 button，提交是 submit，草稿按钮按需 formnovalidate。
- [ ] skip link 可用，焦点在所有交互元素上都清晰可见。
- [ ] Tab 顺序与视觉顺序一致，没有正 tabindex 与焦点陷阱。
- [ ] 没有冗余 role 和假按钮；图片 alt 按决策表处理。
- [ ] 普通文本对比度不低于 4.5:1，错误状态不只靠颜色。
- [ ] W3C 校验无 Error，五类证据齐全且使用的是虚构演示数据。
