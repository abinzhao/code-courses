# 原生链接与页面导航：从 href 到历史记录

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 使用 a[href]、外部协议和浏览上下文完成可预测导航，并区分链接与按钮。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `LNK-005`、`LNK-009`、`LNK-010` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

使用 a[href]、外部协议和浏览上下文完成可预测导航，并区分链接与按钮。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 LNK-005（`a[href]` 与原生链接行为）、LNK-009（`mailto:`、`tel:`）、LNK-010（链接与按钮、安全 URL 方案）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `mailto:` 与 `tel:` 交给外部处理程序

并非所有 `href` 都是 HTTP 页面。

邮件链接：

```html
<a href="mailto:help@example.invalid">给教材维护者发邮件</a>
```

带主题和正文的教学示例：

```html
<a href="mailto:help@example.invalid?subject=%E9%93%BE%E6%8E%A5%E9%97%AE%E9%A2%98&amp;body=%E8%AF%B7%E6%8F%8F%E8%BF%B0%E5%A4%B1%E8%B4%A5%E7%9A%84%20URL">
  报告链接问题
</a>
```

电话链接：

```html
<a href="tel:+15550100000">拨打教学示例号码 +1 555-010-0000</a>
```

这些链接的边界是：

- 浏览器通常把它们交给已注册的邮件或电话应用；
- 桌面设备可能弹出应用选择器，也可能没有可用处理程序；
- 激活链接不代表邮件已发送或电话已接通；
- 预填主题和正文需要 URL 编码；
- 不要把密码、访问令牌、身份证号等秘密放进 URL；
- 页面上的邮箱可能被自动采集，真实站点需要评估公开联系信息的垃圾邮件风险；
- 固定的可信业务地址可以直接编写；来自用户的地址仍需按业务规则验证。

`.invalid` 是专门用于无效示例的顶级域名，不会成为真实邮件目的地。示例电话号码也只用于观察协议处理，不应实际拨打。

### 4.2 `a` 元素和 `href` 决定链接身份

最小超链接是：

```html
<a href="help.html">查看使用帮助</a>
```

`href` 给出目标 URL 引用。带有效 `href` 的 `a` 具有浏览器原生链接行为：

- 进入键盘 Tab 顺序；
- 按 Enter 激活；
- 可以复制链接地址；
- 可以通过上下文菜单或修饰键在新标签打开；
- 浏览器可以记录访问历史；
- 辅助技术能把它识别为链接。

没有 `href` 的 `a` 只是占位元素，不是可正常导航的链接：

```html
<!-- 错误示例：看起来可能被 CSS 画成链接，但没有链接行为 -->
<a class="link-look">查看帮助</a>
```

`href="#"` 也不是“什么都不做”：

```html
<!-- 错误示例：它会修改片段并可能滚动到页面顶部 -->
<a href="#">收藏</a>
```

如果目标是打开另一页、另一个分节、文件、邮件应用或电话应用，就使用链接。如果目标是收藏、展开、提交、复制或删除当前页面中的数据，就使用 `button`。

链接文字应描述目标：

```html
<a href="help.html#returns">阅读退还规则</a>
```

不要在一组链接中反复写“点这里”。读者只浏览链接文字时，应能判断每个链接的目的。

### 4.3 `target` 决定在哪个浏览上下文打开

常见 `target` 值：

| 值 | 行为 | 使用边界 |
| --- | --- | --- |
| `_self` | 当前浏览上下文，默认值 | 普通站内导航优先 |
| `_blank` | 新的浏览上下文，通常是新标签 | 仅在确有保留当前页需求时使用 |
| `_parent` | 当前框架的父上下文 | 主要用于嵌入场景 |
| `_top` | 最顶层上下文 | 主要用于嵌入场景 |
| 自定义名称 | 打开或复用同名上下文 | 容易造成复用和状态混淆，需明确设计 |

`target="_new"` 没有特殊含义，它只是名字为 `_new` 的上下文，后续链接可能复用它。不要把它误当成 `_blank`。

默认在当前页打开通常最尊重用户预期，因为用户自己仍可以通过浏览器手势决定新标签。若产品确实要求新标签：

```html
<a href="help.html"
   target="_blank"
   rel="noopener">
  在新标签打开帮助（新标签页）
</a>
```

可见文字明确提示“新标签页”，避免键盘用户或放大阅读者突然失去上下文。

### 4.4 链接与按钮的判断方法

先补全一句话：

```text
“激活后，我要 ______。”
```

如果答案是“去往某个可命名地址”，通常使用链接：

- 去商品详情；
- 去帮助页；
- 去当前页的交接说明；
- 去下载资源；
- 去邮件或电话处理程序。

如果答案是“改变当前应用状态或执行动作”，通常使用按钮：

- 收藏商品；
- 展开筛选；
- 提交表单；
- 删除图片；
- 复制商品编号。

| 需求 | 正确元素 | 原因 |
| --- | --- | --- |
| 查看帮助页 | `<a href="help.html">` | 有可导航 URL |
| 跳到当前页规则 | `<a href="#rules">` | 有片段目标 |
| 收藏商品 | `<button type="button">` | 改变应用状态 |
| 提交预约 | `<button type="submit">` | 触发表单提交 |
| 下载公开说明 | `<a href="rules.pdf" download>` | 导航到资源并表达下载意图 |

不要把按钮放进链接，也不要把链接放进按钮。嵌套交互元素会产生冲突的焦点、点击和辅助技术信息。

键盘默认行为也是证据：

- 链接通常用 Tab 聚焦、Enter 激活；
- 按钮通常用 Tab 聚焦、Enter 或 Space 激活；
- Space 在普通链接上通常滚动页面，不等同于按钮激活。

不要通过脚本强行让错误元素模仿另一类控件，再声称语义相同。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `LNK-005`：`a[href]` 与原生链接行为
- `LNK-009`：`mailto:`、`tel:`
- `LNK-010`：链接与按钮、安全 URL 方案

## 6. 最小可运行案例

在个人练习目录中新建 `practice/04-native-links-navigation/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 LNK-005（`a[href]` 与原生链接行为） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 LNK-009（`mailto:`、`tel:`） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 为 LNK-010（链接与按钮、安全 URL 方案） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
5. 在打开页面前写下预期 DOM、默认行为或请求结果；
6. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
7. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

### 7.1 案例目录、打开方式与验证范围

本案例把商品页和帮助页连成一个可往返的小网站。

个人练习目录：

```text
practice/
└── html-02-links/
    ├── index.html
    └── help.html
```

推荐打开方式：

```bash
cd practice/html-02-links
python3 -m http.server 8000
```

浏览器访问：

```text
http://127.0.0.1:8000/index.html
```

运行输入是两份静态 HTML。可观察输出是页面、最终 URL、片段目标、浏览器历史、新标签关系、请求头和下载行为。关闭标签页并在终端按 <kbd>Control</kbd> + <kbd>C</kbd> 即可停止。

如果只能直接打开文件，也可以先完成双页往返；第 7.6–7.7 节的来源和下载实验需要 HTTP 服务器。

### 7.2 完整商品页 `index.html`

将以下完整代码保存到：

```text
practice/html-02-links/index.html
```

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="邻里集市阅读台灯详情与链接导航练习。">
  <title>阅读台灯 · 邻里集市</title>
  <style>
    body {
      font-family: sans-serif;
      line-height: 1.6;
      max-width: 48rem;
      margin: 0 auto;
      padding: 1rem;
    }

    section {
      padding-block: 2rem;
    }

    :target {
      outline: 3px solid #b45309;
      outline-offset: 0.5rem;
    }
  </style>
</head>
<body>
  <a href="#content">跳到主要内容</a>

  <header>
    <p>邻里集市</p>
    <nav aria-label="主导航">
      <ul>
        <li><a href="#listing">商品详情</a></li>
        <li><a href="#contact">联系说明</a></li>
        <li><a href="help.html">使用帮助</a></li>
        <li><a href="help.html#broken-links">破碎链接排查</a></li>
      </ul>
    </nav>
  </header>

  <main id="content">
    <article id="listing">
      <h1>阅读台灯</h1>
      <p>价格：<data value="3900">39 元</data></p>
      <p>灯臂可调节，开关工作正常，适合当面检查后交接。</p>
      <p>
        <a href="help.html#navigation-basics">
          阅读跨页面导航说明
        </a>
      </p>
    </article>

    <section id="link-or-button">
      <h2>链接与操作</h2>
      <p><a href="help.html">查看帮助页</a></p>
      <p>
        <button type="button" disabled>
          收藏功能将在交互课程实现
        </button>
      </p>
      <p>
        查看帮助有明确 URL，所以使用链接；收藏会改变应用状态，
        所以后续实现时使用按钮。
      </p>
    </section>

    <section id="new-tab">
      <h2>新标签与下载</h2>
      <p>
        <a href="help.html"
           target="_blank"
           rel="noopener">
          在新标签打开帮助（新标签页）
        </a>
      </p>
      <p>
        <a href="help.html"
           download="neighbor-market-help.html"
           hreflang="zh-CN"
           type="text/html">
          下载中文帮助页副本
        </a>
      </p>
    </section>

    <section id="contact">
      <h2>联系说明</h2>
      <p>
        <a href="mailto:help@example.invalid">
          给教材维护者发邮件
        </a>
      </p>
      <p>
        <a href="tel:+15550100000">
          拨打教学示例号码 +1 555-010-0000
        </a>
      </p>
      <p>
        示例地址和号码不接收真实请求，激活链接也不代表联系已经成功。
      </p>
    </section>
  </main>

  <footer>
    <p>
      <a href="help.html#return-to-listing">
        查看如何返回商品页
      </a>
    </p>
    <p><small>静态教学页面，不创建预约或付款。</small></p>
  </footer>
</body>
</html>
```

### 7.3 完整帮助页 `help.html`

将以下完整代码保存到：

```text
practice/html-02-links/help.html
```

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="邻里集市链接导航与故障排查帮助。">
  <title>使用帮助 · 邻里集市</title>
  <style>
    body {
      font-family: sans-serif;
      line-height: 1.6;
      max-width: 48rem;
      margin: 0 auto;
      padding: 1rem;
    }

    section {
      min-height: 55vh;
      padding-block: 2rem;
    }

    :target {
      outline: 3px solid #0f766e;
      outline-offset: 0.5rem;
    }
  </style>
</head>
<body>
  <a href="#content">跳到主要内容</a>

  <header>
    <p>邻里集市帮助中心</p>
    <nav aria-label="帮助目录">
      <ul>
        <li><a href="#navigation-basics">导航基础</a></li>
        <li><a href="#broken-links">破碎链接排查</a></li>
        <li><a href="#return-to-listing">返回商品页</a></li>
      </ul>
    </nav>
  </header>

  <main id="content">
    <h1>使用帮助</h1>

    <section id="navigation-basics">
      <h2>导航基础</h2>
      <p>
        同目录文件可以使用相对 URL。
        商品页通过 <code>help.html</code> 到达本页。
      </p>
      <p>
        <a href="index.html#listing">
          返回阅读台灯详情
        </a>
      </p>
    </section>

    <section id="broken-links">
      <h2>破碎链接排查</h2>
      <ol>
        <li>查看地址栏中的最终 URL 和片段。</li>
        <li>在 Elements 中搜索片段对应的唯一 ID。</li>
        <li>检查文件名、目录层级、大小写和文档基准 URL。</li>
        <li>修复后用鼠标、键盘、后退和前进重新验证。</li>
      </ol>
      <p>
        <a href="index.html#link-or-button">
          返回商品页的链接与操作说明
        </a>
      </p>
    </section>

    <section id="return-to-listing">
      <h2>返回商品页</h2>
      <p>
        <a href="index.html#listing">
          返回阅读台灯详情
        </a>
      </p>
      <p>
        也可以使用浏览器后退按钮恢复进入帮助页之前的位置。
      </p>
    </section>
  </main>

  <footer>
    <p><a href="index.html">返回商品页顶部</a></p>
    <p><small>本页是静态帮助，不读取或保存账号数据。</small></p>
  </footer>
</body>
</html>
```

### 7.4 双页案例的预期结果与失败证据

按以下顺序验证，不要只看“页面能显示”：

| 操作 | 预期 URL 或行为 | 失败时的证据 |
| --- | --- | --- |
| 打开 `index.html` | `http://127.0.0.1:8000/index.html` | 404 时检查服务器工作目录和文件名 |
| 点击“商品详情” | URL 末尾为 `#listing`，商品区域有轮廓 | `:target` 为 `null` 时检查 `id` |
| 点击“破碎链接排查” | 加载 `help.html#broken-links` | Network 是否成功取得 `help.html` |
| 在帮助页点击“返回阅读台灯详情” | 回到 `index.html#listing` | 检查相对目录和大小写 |
| 连续按两次后退 | 按历史顺序返回此前片段或页面 | 记录实际浏览器历史，不只观察滚动 |
| 再按前进 | 恢复刚才离开的目标 | 若按钮不可用，说明没有对应历史项 |
| Tab 到“使用帮助”并按 Enter | 与鼠标激活相同地进入帮助页 | Tab 跳过时检查 `href` |
| 激活“新标签打开帮助” | 保留原页，并打开新标签 | 未提示新标签时检查可见文字 |
| 在新帮助页 Console 输入 `window.opener` | 预期为 `null` | 非 `null` 时检查 `rel="noopener"` 和环境 |
| 激活同源下载 | 浏览器通常下载或询问保存 `neighbor-market-help.html` | 检查下载记录、响应头和浏览器设置 |

浏览器可能恢复滚动位置，也可能因缓存、标签设置或目标位置产生细节差异。验收重点是最终 URL、正确文档、目标元素和可操作历史，而不是像素级滚动位置完全一致。

### 7.5 `file:` 根相对路径陷阱

先不要修改正式答案。复制下面的错误链接到个人练习的 `index.html` 中：

```html
<!-- 错误实验：把站点根误当成当前练习目录 -->
<a href="/help.html">错误的根相对帮助链接</a>
```

**文件位置：** `practice/html-02-links/index.html`。

**打开方式：** 直接双击 `index.html`，使地址以 `file:` 开头。

**预期现象：** 在 macOS 一类环境中，目标可能解析为 `file:///help.html`，即磁盘卷根下的文件，而不是练习目录中的 `help.html`。Windows 的盘符表现可能不同，但同样不是“项目目录根”。

**失败证据：** 地址栏最终 URL、文件不存在页面，以及 Console 中：

```js
new URL("/help.html", document.baseURI).href
```

**恢复：** 把同目录链接改回：

```html
<a href="help.html">使用帮助</a>
```

然后重新打开或刷新。使用 HTTP 服务器时，`/help.html` 会从 `http://127.0.0.1:8000/` 的 URL 根查找；只有服务器根目录刚好就是练习目录时它才成功。这个成功不能证明它适合任意部署子路径。

### 7.6 安全新标签与引用来源

在 `index.html` 中已有：

```html
<a href="help.html" target="_blank" rel="noopener">
  在新标签打开帮助（新标签页）
</a>
```

**文件位置：** `practice/html-02-links/index.html`。

**打开方式：** 通过 `http://127.0.0.1:8000/index.html` 打开并激活该链接。

**预期：** 新标签显示帮助页；新标签 Console 的 `window.opener` 是 `null`。Network 中的导航请求仍可能带 `Referer`，因为 `noopener` 不负责隐藏来源。

**失败证据：** `window.opener` 非空，或链接文字没有提示新标签。

**恢复：** 确认实际激活的是带 `rel="noopener"` 的链接，清理缓存后重试，并记录浏览器版本与结果。

若需求明确要求不发送来源，可改为：

```html
<a href="help.html"
   target="_blank"
   rel="noopener noreferrer">
  隐私模式打开帮助（新标签页）
</a>
```

重新打开 DevTools Network，勾选保留日志后激活链接。目标请求通常不再包含 `Referer`。如果环境、扩展或工具没有显示该请求，不要凭空声称结果；记录“未取得请求头证据”。

### 7.7 下载行为与跨源限制

第一步验证同源链接。主页面已有：

```html
<a href="help.html"
   download="neighbor-market-help.html"
   hreflang="zh-CN"
   type="text/html">
  下载中文帮助页副本
</a>
```

**位置：** `practice/html-02-links/index.html`。

**打开方式：** 通过端口 `8000` 的服务器打开。

**预期：** 浏览器通常把同源 `help.html` 作为下载处理，并建议文件名 `neighbor-market-help.html`。

**失败证据：** 页面直接导航、下载被阻止、文件名被改写，或下载记录为空。

**排查：** 检查实际目标是否同源、浏览器下载设置、Network 响应和 `Content-Disposition`。

第二步只用于观察跨源边界。在第二个终端、同一练习目录再启动一个端口：

```bash
python3 -m http.server 8001
```

临时把下面链接加入 `index.html`：

```html
<a href="http://127.0.0.1:8001/help.html"
   download="cross-origin-help.html">
  跨源下载边界实验
</a>
```

端口 `8000` 与 `8001` 不同，所以两个地址跨源。

**预期：** 浏览器通常忽略页面对跨源资源写下的下载文件名意图，转而导航或按响应头处理；Python 静态服务器默认不会用附件响应头强制下载。

**失败证据：** 以 Network 中目标端口、响应头、实际标签行为和下载记录为准。不同浏览器策略可能不同，不以一个浏览器现象推导所有环境。

**恢复：** 删除临时跨源实验链接；分别在两个终端按 <kbd>Control</kbd> + <kbd>C</kbd> 停止服务器。

生产环境若要提供跨源下载，应由资源服务器设置正确的访问权限、内容类型与 `Content-Disposition`，并进行真实浏览器测试。前端 `download` 不能替代服务端授权，也不能绕过用户下载策略。

## 8. 常见错误与排查路径

### 8.1 把 `href="#"` 当按钮

现象：点击“收藏”后地址多了 `#`，页面可能跳到顶部，后退历史也被影响，但收藏状态没有保存。

错误代码：

```html
<a href="#">收藏</a>
```

修复：

```html
<button type="button">收藏</button>
```

按钮行为要在后续 JavaScript 课程实现。当前课不能用空操作欺骗验收。

### 8.2 把邮件或电话处理程序启动当成业务成功

现象：页面统计“邮件已发送”，实际只是打开了邮件客户端；桌面设备甚至没有处理程序。

修复：文案写“发邮件”或“拨打电话”，不要写“发送成功”。需要可确认提交时，应使用受控表单和服务端流程。

### 8.3 文件名大小写只在部署后失败

现象：本机 `href="Help.html"` 似乎能打开 `help.html`，部署到大小写敏感环境后 404。

修复：文件名与 `href` 完全一致，推荐使用英文小写和连字符；通过 Network 的状态码确认，不以本机文件系统宽容行为为标准。

## 9. 课后题

### 9.1 链接还是按钮

题目：为“查看交接规则”“收藏商品”“下载公开说明”“提交预约”分别选择元素。

<details>
<summary>参考答案</summary>

- 查看交接规则：链接，例如 `<a href="#shipping">`。
- 收藏商品：`<button type="button">`，因为它改变应用状态。
- 下载公开说明：带资源 URL 的链接，可在同源条件合适时增加 `download`。
- 提交预约：表单中的 `<button type="submit">`。

判断标准不是外观，而是“导航到地址”还是“执行动作”。

</details>

### 9.2 `mailto:` 的成功边界

题目：用户点击 `mailto:` 后出现邮件编辑器，页面能否显示“邮件已发送”？

<details>
<summary>参考答案</summary>

不能。页面只知道浏览器尝试交给外部处理程序，无法由这次链接激活证明用户真的发送、服务器收到或地址有效。文案应保持为“写邮件”或“联系”，而不是成功确认。

</details>

## 10. 实践练习

### 10.1 基础练习：历史导航与键盘

使用第 7 节双页案例，按顺序执行：

1. 打开不带片段的 `index.html`。
2. 只用键盘 Tab 找到“联系说明”，按 Enter。
3. 继续用 Tab 找到“破碎链接排查”，按 Enter。
4. 在帮助页点击“返回商品页的链接与操作说明”。
5. 按两次浏览器后退，再按一次前进。
6. 记录每一步地址栏 URL 和页面标题。

#### 完整答案与预期序列

在没有额外操作和浏览器历史合并的典型情况下，关键导航依次是：

```text
index.html
index.html#contact
help.html#broken-links
index.html#link-or-button
```

第一次后退通常回到 `help.html#broken-links`，第二次后退回到 `index.html#contact`，一次前进再到 `help.html#broken-links`。

允许浏览器在滚动恢复细节上不同，但必须满足：

- Tab 能聚焦真实链接；
- Enter 能激活；
- 页面标题在商品页和帮助页之间正确切换；
- 后退与前进恢复的是历史目标，而不是由学习者重新输入 URL；
- 记录中没有把按钮 Space 行为误写成链接行为。

如果序列不同，记录是否刷新、手动输入地址或从新标签操作；这些都会改变历史栈。

### 10.2 综合练习：独立增加“安全交接”页面入口

不创建第三个文件，只在现有帮助页增加 `id="safe-handover"` 分节，并完成：

- 商品页增加跨页片段链接；
- 帮助页目录增加同页片段链接；
- 链接文字明确描述“安全交接”；
- 用后退和前进验证；
- 故意把 `id` 改错一次，并按 [URL 解析与片段导航](03-url-resolution-fragments.md)中的破碎 fragment 故障路径恢复。

#### 完整答案

插入 `index.html` 主导航或正文：

```html
<a href="help.html#safe-handover">阅读安全交接说明</a>
```

插入 `help.html` 的帮助目录：

```html
<li><a href="#safe-handover">安全交接</a></li>
```

插入 `help.html` 的 `main`：

```html
<section id="safe-handover">
  <h2>安全交接</h2>
  <p>在光线充足的公共地点检查物品，不提前提供支付凭证。</p>
  <p><a href="index.html#listing">返回阅读台灯详情</a></p>
</section>
```

验收：

- `help.html#safe-handover` 的 `:target` 是新增分节；
- `document.querySelectorAll('[id="safe-handover"]').length` 等于 `1`；
- 键盘 Enter 可以从两个入口到达；
- 后退可以恢复之前的商品页位置；
- 修复记录包含错误片段、`null` 证据和正确目标元素。

## 11. 阶段验收

- [ ] `LNK-005`：`a[href]` 与原生链接行为
- [ ] `LNK-009`：`mailto:`、`tel:`
- [ ] `LNK-010`：链接与按钮、安全 URL 方案
- [ ] 能从空白文件独立复现本课最小案例；
- [ ] 至少保存一条浏览器证据和一次故障恢复记录；
- [ ] 能说明自动检查、人工检查与未验证环境的边界；
- [ ] 项目增量没有复制其他课程拥有的完整应用。

## 12. 常见问题

### 地址出现了 `#target`，为什么页面没有滚动？

目标可能已经在视口中，也可能根本不存在。执行 `document.querySelector(":target")`：得到元素说明片段匹配成功；得到 `null` 才是破碎目标证据。还要检查 `id` 大小写和唯一性。

### `_blank` 是否一定打开新“窗口”？

它请求新的浏览上下文，现代浏览器通常表现为新标签，也可能根据用户设置成为窗口。文案写“新标签页”是常见产品提示，但测试时应记录实际环境。

### `mailto:` 中可以预填 HTML 邮件正文吗？

不同邮件客户端支持不一致，`body` 通常按文本处理。不要依赖它传递复杂格式、附件或敏感数据。需要可靠邮件工作流时应使用后端服务并取得用户确认。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：使用 a[href]、外部协议和浏览上下文完成可预测导航，并区分链接与按钮。
- `LNK-005`：`a[href]` 与原生链接行为
- `LNK-009`：`mailto:`、`tel:`
- `LNK-010`：链接与按钮、安全 URL 方案
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：URL 解析与片段导航：预测最终目标](03-url-resolution-fragments.md) · [下一课：链接安全、隐私与下载边界](05-link-security-privacy-downloads.md) · [返回 HTML 模块](../README.md)
