# 链接安全、隐私与下载边界

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 控制新窗口关系、来源信息和下载提示，并拒绝不可信的可执行 URL 方案。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `LNK-006`、`LNK-007`、`LNK-008` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

控制新窗口关系、来源信息和下载提示，并拒绝不可信的可执行 URL 方案。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 LNK-006（`target`、`rel`、`noopener`、`noreferrer`）、LNK-007（`download` 与跨源限制）、LNK-008（`hreflang`、`type`、`referrerpolicy`、`ping`）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `rel`、`noopener` 与 `noreferrer`

`rel` 描述当前文档和目标资源的关系。它可以包含以空格分隔的多个词：

```html
<a href="https://docs.example/"
   target="_blank"
   rel="external noopener">
  外部文档（新标签页）
</a>
```

与本课最相关的值：

| `rel` 值 | 作用 | 不会自动做到的事 |
| --- | --- | --- |
| `noopener` | 阻止新上下文通过 `window.opener` 取得原页面引用 | 不会隐藏 HTTP 引用来源 |
| `noreferrer` | 不发送引用来源，并同时提供 `noopener` 效果 | 不会让访问者匿名，也不会清除目标 URL 中的数据 |
| `external` | 表明目标位于当前站点之外 | 不会自动新开标签 |
| `nofollow` | 向搜索系统表达“不为此链接背书”的提示 | 不是访问控制或安全沙箱 |
| `ugc` | 表明链接来自用户生成内容 | 不会自动检查 URL 安全 |
| `sponsored` | 表明赞助或广告关系 | 不会自动满足全部广告合规要求 |

为什么关注 `window.opener`？旧式或特殊浏览器环境中，新页面可能通过它把原页面导航到仿冒地址，这类问题常被称为反向标签劫持。现代浏览器通常已让 `_blank` 隐式具有 `noopener` 行为，但显式写出 `rel="noopener"` 可以表达安全意图，并覆盖需要兼容或审查的边界。

两者不要混为一谈：

```html
<!-- 保留正常引用来源，但切断 opener -->
<a href="help.html" target="_blank" rel="noopener">帮助</a>

<!-- 同时切断 opener，并不发送 Referer -->
<a href="help.html" target="_blank" rel="noopener noreferrer">隐私模式帮助</a>
```

只有存在隐私需求时才使用 `noreferrer`。引用来源对站点分析、故障定位和来源判断可能有合法价值，不要机械地给全部链接添加它。

### 4.2 `referrerpolicy` 控制链接请求携带多少来源

`referrerpolicy` 比“发或不发”更细致。常见值包括：

| 值 | 导航时的来源行为概念 | 适用说明 |
| --- | --- | --- |
| `no-referrer` | 不发送 `Referer` | 明确不需要来源信息 |
| `origin` | 只发送来源，不发送完整路径 | 目标只需知道来自哪个站点 |
| `same-origin` | 仅同源导航发送来源 | 不向跨源目标发送 |
| `strict-origin` | 安全级别不降低时发送来源 | 避免 HTTPS 到 HTTP 泄露来源 |
| `strict-origin-when-cross-origin` | 同源可发较完整信息，跨源只发来源，降级不发 | 现代浏览器常见默认策略 |

示例：

```html
<a href="https://docs.example/"
   referrerpolicy="origin">
  查看外部文档
</a>
```

HTTP 请求头历史上拼写为 `Referer`，不是正确英文 `Referrer`，这是协议保留的旧拼写。属性名使用正确拼写 `referrerpolicy`。

`referrerpolicy` 不会切断 `window.opener`；需要新标签防护时仍应使用 `noopener`。它也不能保护已经写进目标 URL 查询参数中的秘密。

### 4.3 `download`、`hreflang` 与 `type` 都是提示

同源下载示例：

```html
<a href="help.html"
   download="neighbor-market-help.html"
   hreflang="zh-CN"
   type="text/html">
  下载中文帮助页副本
</a>
```

三个属性分别表达：

- `download`：作者希望浏览器把目标当作下载，并可建议文件名；
- `hreflang`：目标资源的语言提示；
- `type`：目标资源 MIME 类型的提示。

它们不是强制命令：

- 浏览器会清理建议文件名中的非法路径字符；
- 用户设置、浏览器策略和响应头会影响最终是保存还是打开；
- `Content-Disposition` 响应头可能决定下载及服务端文件名；
- `download` 通常只对同源 URL，以及浏览器支持的 `blob:`、`data:` URL 生效；
- 跨源资源不能仅靠页面上的 `download` 强制保存，跨源服务器通常需要用合适的响应头明确附件行为；
- `hreflang` 不会翻译页面，也不会替代可见的语言说明；
- `type` 不会验证服务器实际返回的类型，真实响应头仍是证据。

因此，“写了 `download`”只能证明作者表达了下载意图，不能证明文件已经保存、文件名一定相同或用户有权限获得资源。

### 4.4 `ping` 涉及额外请求与隐私

`ping` 可以列出一个或多个通知 URL。用户激活链接时，浏览器可能向这些地址发送审计通知：

```html
<!-- 机制示例，本教材案例不实际使用 ping -->
<a href="help.html"
   ping="https://metrics.example/link-activated">
  查看帮助
</a>
```

边界必须说清：

- 它会在主要导航之外产生额外网络请求；
- 请求可能被浏览器设置、隐私工具、扩展或策略阻止；
- 它会带来跟踪、告知和合规问题；
- 不能把它当成关键业务操作成功的证据；
- 不应把不可信输入直接写进 `ping`，否则可能向意外地址发送请求；
- 本课综合案例不使用 `ping`，只要求能在代码审查中识别它。

需要统计导航时，应先明确最小数据、用户告知、失败容忍与服务端边界，而不是因为有这个属性就默认启用。

### 4.5 不可信的 `javascript:` 与 `data:` URL

`href` 是安全边界的一部分。下面的代码即使使用 DOM 属性赋值，也不代表地址可信：

```js
// 错误示例：sellerUrl 来自不可信输入。
profileLink.href = sellerUrl;
```

攻击者可能提供：

```text
javascript:/* 在页面上下文执行不可信代码 */
data:text/html,<!-- 伪造或主动内容 -->
```

风险包括：

- `javascript:` 在允许执行的环境中可能以当前页面权限运行代码；
- `data:` 可以把内容直接编码进 URL，隐藏真实内容来源；
- 浏览器或 CSP 可能阻止部分行为，但不能把“可能被阻止”当成输入验证；
- `data:` 对作者自己生成的受控小资源有合法用途，不等于适合接收不可信导航地址；
- 字符大小写、转义和前导空白会让简单字符串判断不可靠。

正确思路是先用 URL 解析器标准化，再按业务需要做协议白名单：

```js
function toAllowedNavigationUrl(rawValue, baseUrl) {
  const candidate = new URL(rawValue, baseUrl);
  const allowedProtocols = new Set(["http:", "https:"]);

  if (!allowedProtocols.has(candidate.protocol)) {
    throw new Error("只允许 HTTP 或 HTTPS 链接");
  }

  return candidate.href;
}
```

使用时捕获失败，不要把原值“兜底”写回去：

```js
try {
  profileLink.href = toAllowedNavigationUrl(sellerUrl, document.baseURI);
  profileLink.hidden = false;
} catch (error) {
  profileLink.removeAttribute("href");
  profileLink.hidden = true;
  console.error(error.message);
}
```

这段代码只解决协议白名单，不自动解决域名信任、开放重定向、钓鱼文案、权限或内容审核。若业务只允许某个站点，还要在解析后检查 `hostname` 和规范化端口。`mailto:`、`tel:` 应在确有业务需求时使用独立规则验证，不应为了“兼容更多”就加入通用导航白名单。

## 5. 元素、属性、API 或配置清单

### 属性组合速查

普通站内链接：

```html
<a href="help.html">查看帮助</a>
```

安全新标签：

```html
<a href="help.html" target="_blank" rel="noopener">
  在新标签打开帮助（新标签页）
</a>
```

不发送引用来源的新标签：

```html
<a href="help.html" target="_blank" rel="noopener noreferrer">
  隐私模式打开帮助（新标签页）
</a>
```

同源下载意图：

```html
<a href="help.html" download="neighbor-market-help.html">
  下载帮助页
</a>
```

固定的邮件入口：

```html
<a href="mailto:help@example.invalid">联系维护者</a>
```

## 6. 最小可运行案例

在个人练习目录中新建 `practice/05-link-security-privacy-downloads/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 LNK-006（`target`、`rel`、`noopener`、`noreferrer`） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 LNK-007（`download` 与跨源限制） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 为 LNK-008（`hreflang`、`type`、`referrerpolicy`、`ping`） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
5. 在打开页面前写下预期 DOM、默认行为或请求结果；
6. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
7. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [原生链接与页面导航：从 href 到历史记录](04-native-links-navigation.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 LNK-006（`target`、`rel`、`noopener`、`noreferrer`） 对应的元素、属性或状态；
- 在项目中实现并标出与 LNK-007（`download` 与跨源限制） 对应的元素、属性或状态；
- 在项目中实现并标出与 LNK-008（`hreflang`、`type`、`referrerpolicy`、`ping`） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`04-native-links-navigation.md`](04-native-links-navigation.md)。

## 8. 常见错误与排查路径

### 8.1 强制所有外链新开标签

现象：访问者每次点击都产生新标签，后退按钮不能按预期返回，放大或读屏用户可能失去上下文。

根因：把“外部”误当成“必须新开”。

修复：默认使用当前页；只有业务确需保留当前上下文时才用 `_blank`，并提供可见提示及 `noopener`。

### 8.2 只写 `_blank`，忽略 opener 边界

不推荐：

```html
<a href="https://untrusted.example/" target="_blank">
  用户提交的网站
</a>
```

修复至少包括：

```html
<a href="https://untrusted.example/"
   target="_blank"
   rel="noopener ugc">
  用户提交的网站（新标签页）
</a>
```

现代浏览器可能已隐式隔离 opener，但显式属性仍是代码意图。`ugc` 只描述内容关系，不负责协议白名单或内容审核。

### 8.3 把 `noreferrer` 和 `noopener` 当同一件事

现象：团队为了防 opener 给所有链接加 `noreferrer`，结果目标站点无法获得原本允许的来源信息。

修复：

- 只需切断 opener：`rel="noopener"`。
- 同时有不发送引用来源的隐私需求：`rel="noopener noreferrer"`。
- 需要更细粒度来源控制：评估 `referrerpolicy`。

### 8.4 认为 `download` 能强制任意跨源文件保存

现象：点击跨源 PDF 后在标签页预览，或建议文件名被忽略。

根因：`download` 是受同源、响应头和浏览器策略约束的提示。

排查证据：

- 目标 URL 的方案、主机和端口；
- Network 中 `Content-Type`；
- `Content-Disposition`；
- 下载记录；
- 浏览器控制台或拦截提示。

修复：由资源服务器明确附件响应和权限；不要试图仅用 HTML 绕过。

### 8.5 相信 `hreflang` 或 `type` 会验证内容

现象：链接写了 `hreflang="zh-CN"`，目标却是英文；写了 `type="application/pdf"`，服务器实际返回 HTML 错误页。

根因：这两个属性只是作者提供的提示。

修复：保持可见文案、属性和真实响应一致，并以目标内容和 Network 响应头验证。

### 8.6 直接接受不可信 URL

错误示例：

```js
profileLink.href = sellerProvidedUrl;
profileLink.textContent = "访问卖家主页";
```

失败证据：用测试值 `javascript:/* test */` 或 `data:text/html,test` 解析后，`new URL(...).protocol` 不是允许的 `http:`/`https:`。

修复：使用第 4.5 节的 URL 解析和协议白名单；失败时删除 `href` 并隐藏入口。不要实际运行攻击载荷。

## 9. 课后题

### 9.1 `noopener` 与 `noreferrer`

题目：产品需要新标签打开帮助，但允许目标知道来源；应该选择什么？若还要求不发送来源呢？

<details>
<summary>参考答案</summary>

允许发送来源时：

```html
<a href="help.html" target="_blank" rel="noopener">帮助</a>
```

还要求不发送来源时：

```html
<a href="help.html" target="_blank" rel="noopener noreferrer">帮助</a>
```

`noopener` 处理 opener 关系，`noreferrer` 处理引用来源并同时带来 opener 隔离效果。

</details>

### 9.2 下载意图

题目：为什么 `<a href="https://files.example/rules.pdf" download>` 不能保证下载？

<details>
<summary>参考答案</summary>

因为目标可能跨源，`download` 只是浏览器受限处理的提示。真实行为还受目标响应的 `Content-Disposition`、`Content-Type`、浏览器策略、用户设置和权限影响。页面不能靠一个属性强制跨源服务器提供附件。

</details>

## 10. 实践练习

### 10.1 进阶练习：新标签与引用来源

在 `index.html` 增加两个明确标注的新标签链接：

1. 一个保留正常引用来源，只隔离 opener；
2. 一个既隔离 opener，也不发送引用来源。

用 Console 和 Network 分别记录证据。

#### 完整答案

```html
<p>
  <a href="help.html"
     target="_blank"
     rel="noopener">
    打开普通帮助（新标签页）
  </a>
</p>

<p>
  <a href="help.html"
     target="_blank"
     rel="noopener noreferrer">
    打开隐私帮助（新标签页）
  </a>
</p>
```

预期：

- 两个新标签中的 `window.opener` 都为 `null`；
- 普通帮助请求是否带完整来源取决于有效 referrer policy，但同源导航通常可在 Network 看到 `Referer`；
- 隐私帮助请求不应发送 `Referer`；
- 两个链接文字都提示新标签。

若 Network 没有证据，打开 DevTools 后勾选“Preserve log/保留日志”再重试，不要把看不到请求解释为一定没有请求。

### 10.2 进阶练习：下载边界

通过端口 `8000` 打开商品页，再通过端口 `8001` 提供同一 `help.html`。分别创建同源与跨源下载链接，记录：

- 链接元素解析后的完整 `href`；
- 两个目标的来源三元组；
- 实际是下载、预览还是导航；
- Network 中的 `Content-Type` 与 `Content-Disposition`；
- 下载记录中的最终文件名。

#### 完整答案

```html
<a href="help.html"
   download="same-origin-help.html">
  同源下载
</a>

<a href="http://127.0.0.1:8001/help.html"
   download="cross-origin-help.html">
  跨源下载边界
</a>
```

来源：

```text
页面：http + 127.0.0.1 + 8000
同源目标：http + 127.0.0.1 + 8000
跨源目标：http + 127.0.0.1 + 8001
```

Python 静态服务器通常返回 `Content-Type: text/html`，不会默认返回 `Content-Disposition: attachment`。同源链接通常按 `download` 处理；跨源链接通常忽略前端建议文件名并导航或预览。浏览器若表现不同，应记录浏览器版本和响应证据，结论仍然是：不能仅凭 `download` 保证跨源保存。

### 10.3 安全练习：修复不可信链接

错误代码：

```html
<a id="seller-profile">访问卖家主页</a>

<script>
  const sellerProvidedUrl = "javascript:/* untrusted */";
  const profileLink = document.querySelector("#seller-profile");
  profileLink.href = sellerProvidedUrl;
</script>
```

要求：

- 只允许 HTTP 和 HTTPS；
- 解析失败或协议不允许时，链接不可激活；
- 页面显示清楚的错误说明；
- 不执行测试字符串。

#### 完整答案

```html
<p>
  <a id="seller-profile" hidden>访问卖家主页</a>
  <span id="seller-profile-error" role="status"></span>
</p>

<script>
  const sellerProvidedUrl = "javascript:/* untrusted */";
  const profileLink = document.querySelector("#seller-profile");
  const errorMessage = document.querySelector("#seller-profile-error");

  function toAllowedNavigationUrl(rawValue, baseUrl) {
    const candidate = new URL(rawValue, baseUrl);
    const allowedProtocols = new Set(["http:", "https:"]);

    if (!allowedProtocols.has(candidate.protocol)) {
      throw new Error("卖家主页只允许 HTTP 或 HTTPS 地址。");
    }

    return candidate.href;
  }

  try {
    profileLink.href = toAllowedNavigationUrl(
      sellerProvidedUrl,
      document.baseURI
    );
    profileLink.hidden = false;
    errorMessage.textContent = "";
  } catch (error) {
    profileLink.removeAttribute("href");
    profileLink.hidden = true;
    errorMessage.textContent = error.message;
  }
</script>
```

预期结果：

- 页面不显示可激活的卖家主页链接；
- 状态文字显示“卖家主页只允许 HTTP 或 HTTPS 地址。”；
- Console 不应出现不可信代码执行结果；
- 将测试值改成 `https://example.com/profile` 后，链接才显示并具有规范化后的 HTTPS 地址。

这份答案不检查允许域名。若业务只允许平台官方域名，还应在 URL 解析后增加 `candidate.hostname` 白名单，不能用链接文字代替。

## 11. 阶段验收

### 11.1 自我讲解验收

不看正文，用三分钟回答：

1. 浏览器从哪里开始解析 `help.html`？
2. `/help.html` 为什么不是“当前文件夹的帮助页”？
3. `help.html#rules` 中哪一部分会请求服务器，哪一部分由浏览器处理？
4. 为什么链接和按钮不能只按外观选择？
5. `noopener` 与 `noreferrer` 分别控制什么？
6. 为什么跨源链接可以导航，但 `download` 仍可能被忽略？
7. 为什么 URL 解析成功不代表 URL 可以信任？

任何一题只能背属性名、不能解释浏览器行为和证据时，都应回到对应理论与错误实验。

- [ ] `LNK-010` 的安全 URL 分支已通过协议白名单、不可激活回退和复验记录验收。

## 12. 常见问题

### 同源链接一定安全吗？

不一定。同源只描述方案、主机和端口相同，不证明内容可信、用户有权限或页面没有漏洞。跨源链接也不自动恶意。本课用来源判断 opener、referrer 和下载边界，不把它当成信誉评分。

### 现代浏览器已经隐式 `noopener`，还要写吗？

显式写出能表达安全意图，便于代码审查，并照顾特殊或旧环境。不能因为现代默认行为就混淆 `noopener` 和 `noreferrer`，也不能忽略可见的新标签提示。

### `rel="external"` 会自动新开标签吗？

不会。它只描述目标关系。打开位置由 `target`、浏览器和用户操作决定。

### `referrerpolicy="no-referrer"` 能替代 `noopener` 吗？

不能。它控制引用来源请求头，不负责切断新页面的 `window.opener`。新标签隔离仍使用 `noopener`。

### 为什么 `noreferrer` 不能保护 URL 查询中的秘密？

`noreferrer` 只控制来源信息。目标 URL 自己的查询仍会发送给目标服务器，也可能进入历史、日志和监控。秘密不应放进 URL。

### `download` 的文件名为什么和属性值不同？

浏览器会清理非法字符，服务器 `Content-Disposition`、操作系统规则和用户选择也可能改变文件名。属性只是建议，不是文件系统写入命令。

### 能否把用户上传的任何文件做成 `data:` 下载链接？

不能因此放弃验证。`data:` 可能承载主动内容、消耗大量内存或产生欺骗性下载。受控数据生成也要限制类型、大小、文件名和使用场景；不可信导航默认不允许 `data:`。

### `ping` 能否用来确认用户已经看到目标页？

不能。它最多表示浏览器在激活链接时尝试发送通知，请求可能被禁用或阻止，也不能证明目标加载完成、用户阅读或业务成功。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：控制新窗口关系、来源信息和下载提示，并拒绝不可信的可执行 URL 方案。
- `LNK-006`：`target`、`rel`、`noopener`、`noreferrer`
- `LNK-007`：`download` 与跨源限制
- `LNK-008`：`hreflang`、`type`、`referrerpolicy`、`ping`
- `LNK-010`：链接与按钮、安全 URL 方案中的安全 URL 分支
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：原生链接与页面导航：从 href 到历史记录](04-native-links-navigation.md) · [下一课：列表、描述关系与命令集合](06-lists-descriptions-commands.md) · [返回 HTML 模块](../README.md)
