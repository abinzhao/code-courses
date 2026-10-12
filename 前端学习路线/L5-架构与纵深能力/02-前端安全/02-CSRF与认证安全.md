# 02-CSRF 与认证安全

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L5 架构与纵深能力
> - 先修：[01-XSS 防御与 CSP 策略](./01-XSS防御与CSP策略.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 深入理解 CSRF 的攻击原理和攻击链路，以及它和 XSS 的本质区别
- 掌握 CSRF 的五种防御策略及其适用场景，能根据项目架构选择正确的方案
- 理解 SameSite Cookie 的三个等级及其对 CSRF 防御和用户体验的影响
- 掌握 JWT 全生命周期安全实践：签发、存储、刷新、撤销
- 建立认证流程的整体安全视角：从暴力破解防护到 OAuth 2.0 的安全注意事项
- 能在项目中实现安全的 JWT 认证流程（login → access + refresh → auto-refresh → logout）

---

## 内容讲解

### 一、CSRF 的本质：利用浏览器的"自动带 Cookie"机制

#### 1.1 攻击原理

CSRF（Cross-Site Request Forgery，跨站请求伪造）利用了一个所有 Web 开发者都离不开的机制：**浏览器在发送请求时，会自动带上目标域名的 Cookie**。

这个机制是 HTTP 协议无状态特性的必然结果——为了让服务器知道"你是谁"，每个请求都必须附带上身份凭证（Session Cookie / JWT Cookie）。而 CSRF 攻击正是利用了这个"自动附带"：当你登录了 bank.com 之后，如果你在另一个标签页中访问了 evil.com，evil.com 上的恶意代码就可以偷偷向 bank.com 发送请求，浏览器会**自动**把你的 bank.com Cookie 附上，bank.com 服务器看到合法 Cookie，以为是你本人发起的请求，于是执行了转账操作。

```
正常流程：
你 → 登录 bank.com → 服务器返回 Cookie（Set-Cookie: session=abc123）
你 → 点击"转账"按钮 → 浏览器发送 POST /transfer + Cookie: session=abc123
服务器 → 验证 Cookie，确认是你，执行转账 ✅

CSRF 攻击流程：
你 → 登录 bank.com → 获取 Cookie: session=abc123
你 → 访问 evil.com（另一个标签页，可能是钓鱼邮件中的链接）
evil.com 的页面自动提交表单或发送 fetch 请求 → bank.com/transfer
浏览器自动附上 Cookie: session=abc123 ← 这就是关键！
bank.com → 验证 Cookie 通过，以为是你在转账，执行了 ❌
```

**CSRF 与 XSS 的关键区别**：

- XSS 需要攻击者在目标网站中注入并执行脚本（利用了网站的注入漏洞）
- CSRF 不需要攻击者访问目标网站的任何权限——只需要受害者登录过目标网站，然后诱导受害者访问恶意网站

#### 1.2 简化攻击演示（仅用于教育目的）

```html
<!-- evil.com 上的恶意页面（仅用于教育目的） -->
<!DOCTYPE html>
<html>
<body>
  <h1>恭喜你中奖了！点击领取</h1>

  <!-- 方式一：自动提交的隐藏表单 —— 最经典的 CSRF 攻击方式 -->
  <form id="csrf-form" action="https://bank.com/api/transfer" method="POST">
    <input type="hidden" name="to" value="attacker-account" />
    <input type="hidden" name="amount" value="10000" />
  </form>
  <script>
    // 页面加载后自动提交表单
    document.getElementById('csrf-form').submit();
    // 浏览器会自动带上 bank.com 的 Cookie，bank.com 会认为这是你本人的操作
  </script>

  <!-- 方式二：如果 API 接收 JSON，也可以用 fetch（受 CORS 限制，但简单请求不受限） -->
  <script>
    // 对于简单请求（GET，或特定类型的 POST），浏览器不会发预检请求
    // 如果 bank.com 的 CORS 配置宽松，这个请求就能成功
    fetch('https://bank.com/api/transfer', {
      method: 'POST',
      credentials: 'include', // 带上 Cookie
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'to=attacker-account&amount=10000',
    });
  </script>
</body>
</html>
```

---

### 二、CSRF 防御策略

#### 2.1 CSRF Token（最经典的防御方式）

核心思路：在页面中嵌入一个随机 Token，每次请求都带上这个 Token，服务器验证 Token 的有效性。由于攻击者无法读取目标网站的内容（同源策略），因此无法获取这个 Token。

```
防御流程：
1. 用户访问 bank.com → 服务器生成随机 Token → 嵌入页面（隐藏域 / <meta> / JS 变量）
2. 用户提交表单 → Token 随请求发送
3. 服务器验证：请求中的 Token === 服务器存储的 Token → 通过
```

**实现代码**：

```javascript
// server.js —— 完整的 CSRF Token 防御实现
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.urlencoded({ extended: true }));

// 用于存储 CSRF Token（实际项目中应存储在 Redis 或 Session 中）
const csrfTokenStore = new Map();

/**
 * 生成 CSRF Token 中间件
 * 每个 GET 请求（页面访问）都生成一个新 Token，嵌入页面
 */
function csrfTokenMiddleware(req, res, next) {
  // 为每个会话生成唯一的 CSRF Token
  const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1] || 'anonymous';
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokenStore.set(sessionId, token);

  // 将 Token 注入到模板变量和响应头中
  res.locals.csrfToken = token;
  // 也通过响应头暴露，方便 SPA 读取
  res.setHeader('X-CSRF-Token', token);
  next();
}

// 渲染页面：将 CSRF Token 嵌入表单
app.get('/transfer', csrfTokenMiddleware, (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <body>
      <h1>转账页面</h1>
      <form action="/api/transfer" method="POST">
        <!-- CSRF Token 作为隐藏域嵌入表单 -->
        <input type="hidden" name="_csrf" value="${res.locals.csrfToken}" />
        <input name="to" placeholder="收款账户" />
        <input name="amount" placeholder="金额" />
        <button type="submit">确认转账</button>
      </form>
    </body>
    </html>
  `);
});

/**
 * CSRF Token 验证中间件
 * 用于所有会修改状态（POST/PUT/DELETE）的 API 路由
 */
function verifyCsrfToken(req, res, next) {
  const sessionId = req.headers.cookie?.match(/sessionId=([^;]+)/)?.[1] || 'anonymous';
  const storedToken = csrfTokenStore.get(sessionId);

  // Token 可以从三个位置读取：请求体、请求头、查询参数
  // 按优先级：请求头 > 请求体 > 查询参数
  const requestToken =
    req.headers['x-csrf-token'] ||    // SPA 常用方式
    req.body._csrf ||                   // 传统表单
    req.query._csrf;                    // GET 请求（不推荐用于状态变更）

  if (!storedToken || !requestToken) {
    return res.status(403).json({ error: '缺少 CSRF Token' });
  }

  // 使用 timingSafeEqual 避免时序攻击
  // 时序攻击：攻击者通过测量响应时间来逐字节猜测正确的 Token
  try {
    if (!crypto.timingSafeEqual(
      Buffer.from(storedToken, 'utf8'),
      Buffer.from(requestToken, 'utf8')
    )) {
      return res.status(403).json({ error: 'CSRF Token 验证失败' });
    }
  } catch {
    return res.status(403).json({ error: 'CSRF Token 格式错误' });
  }

  // 一次性 Token：使用后立即失效，防止重放攻击
  csrfTokenStore.delete(sessionId);
  next();
}

// 转账 API —— 应用 CSRF 验证
app.post('/api/transfer', verifyCsrfToken, (req, res) => {
  const { to, amount } = req.body;
  // 实际业务逻辑...
  res.json({ success: true, message: `已向 ${to} 转账 ${amount} 元` });
});

app.listen(3000);
```

**为什么 CSRF Token 是安全的？** 同源策略阻止 evil.com 读取 bank.com 的页面内容。攻击者无法通过 fetch 或 XHR 获取 bank.com 页面中的 CSRF Token。而没有 Token 的伪造请求会被服务器直接拒绝。

#### 2.2 SameSite Cookie 属性

SameSite 是 Cookie 的一个属性，由浏览器强制执行。它控制 Cookie 是否在跨站请求中发送。

```
Set-Cookie: session=abc123; SameSite=Strict; Secure; HttpOnly
```

| SameSite 值 | 行为 | 适用场景 |
|-------------|------|---------|
| **Strict** | Cookie 只在同站请求中发送。从其他网站点击链接进入时也不发送。 | 高安全性场景（银行、支付） |
| **Lax** | 默认值（Chrome）。顶级导航的 GET 请求会发送 Cookie，但 POST / iframe / img / AJAX 不发送。 | 大多数 Web 应用的首选 |
| **None** | Cookie 在所有跨站请求中都发送。**必须同时设置 Secure 属性（仅 HTTPS）**。 | 需要跨站嵌入的场景（如第三方支付 iframe） |

**关键概念："同站" vs "同源"**：

```
同源：协议 + 域名 + 端口 完全相同
      https://www.example.com 和 https://www.example.com:443 ✅ 同源
      https://www.example.com 和 https://api.example.com     ❌ 不同源

同站：eTLD+1（有效顶级域名+1级）相同
      https://www.example.com 和 https://api.example.com     ✅ 同站（eTLD+1 都是 example.com）
      https://a.github.io      和 https://b.github.io        ❌ 不同站（eTLD+1 = a.github.io vs b.github.io）
```

**SameSite 的局限性**：
- SameSite 是浏览器端的防御，对旧版浏览器不生效
- 不能防止同一站点内的子域名 CSRF（例如 a.example.com 攻击 b.example.com）
- SameSite=None 兼容性差，老浏览器可能当作 Strict 处理

#### 2.3 Origin / Referer Header 校验

```javascript
/**
 * 校验请求来源的中间件
 * 检查 Origin 和 Referer 请求头，确认请求来自合法的来源
 * 
 * 注意：这种方法不是 100% 可靠，但可以作为深度防御的一层
 * - 某些场景下 Origin/Referer 可能被浏览器省略
 * - 攻击者可能控制页面使 Referer 不发送（通过 Referrer-Policy）
 */
function verifyOrigin(req, res, next) {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  const allowedOrigins = [
    'https://www.example.com',
    'https://app.example.com',
  ];

  // 如果 Origin 存在，优先校验 Origin
  if (origin) {
    const isAllowed = allowedOrigins.some(allowed => {
      // 精确匹配或子域名匹配
      return origin === allowed;
    });

    if (!isAllowed) {
      console.warn(`[CSRF 警告] 拒绝来自 ${origin} 的请求`);
      return res.status(403).json({ error: '请求来源不被允许' });
    }
  }
  // 如果 Origin 不存在，检查 Referer
  else if (referer) {
    const url = new URL(referer);
    const isAllowed = allowedOrigins.some(allowed => {
      return `${url.protocol}//${url.host}` === allowed;
    });

    if (!isAllowed) {
      return res.status(403).json({ error: '请求来源不被允许' });
    }
  }
  // 如果两个都不存在，在安全敏感的操作中应该拒绝
  // 但注意：某些合法场景（如书签、地址栏直接输入）可能没有 Referer
  // 折中方案：记录日志但不拦截，同时要求其他防御机制（如 CSRF Token）兜底

  next();
}
```

#### 2.4 双重提交 Cookie（Double Submit Cookie）

这种方式不需要服务器存储 Token 状态，适合无状态 API（使用 JWT 的 RESTful API）：

```javascript
/**
 * 双重提交 Cookie 模式：
 * 1. 服务器在响应中设置一个随机 Token Cookie（非 HttpOnly，以便 JS 能读取）
 * 2. 前端从 Cookie 中读取 Token，放入请求头
 * 3. 服务器对比：Cookie 中的 Token === 请求头中的 Token
 * 
 * 原理：攻击者无法在 evil.com 域下设置 bank.com 的 Cookie，
 *       也无法读取 bank.com 的 Cookie（同源策略保护了 HttpOnly 之外的 Cookie 也没关系），
 *       所以无法伪造一致的 Token。
 * 
 * 注意：这种方式依赖同源策略保护 Cookie 不被跨站读取，但不保护子域名。
 *       如果你的 a.example.com 存在 XSS 漏洞，它可以读取 example.com 的 Cookie。
 */
function doubleSubmitCookieMiddleware(req, res, next) {
  // 生成 Token 并同时设置在 Cookie 中
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf-token', token, {
    httpOnly: false, // ⚠️ 必须是 false，前端 JS 需要能读取
    secure: true,
    sameSite: 'strict',
    path: '/',
  });
  res.locals.csrfToken = token;
  next();
}

function verifyDoubleSubmitCookie(req, res, next) {
  const cookieToken = req.cookies['csrf-token'];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({ error: 'CSRF Token 缺失' });
  }

  if (!crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(headerToken)
  )) {
    return res.status(403).json({ error: 'CSRF Token 不匹配' });
  }

  next();
}
```

#### 2.5 防御策略选型决策表

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 传统服务端渲染（MVC） | CSRF Token | 可以直接嵌入模板，实现最简单 |
| SPA + JWT（httpOnly Cookie） | SameSite=Strict/Lax + CSRF Token | 双重防线保障 |
| SPA + JWT（localStorage） | 不需要 CSRF 防御 | Token 不会自动附带（但需要防 XSS） |
| 纯 API 服务（无前端） | Origin 校验 + 要求自定义请求头 | API 通常接收非浏览器客户端 |
| 第三方嵌入场景（iframe） | SameSite=None + CSRF Token | 必须同时设置 |

> **关键认知**：如果你把 JWT 存在 localStorage 中并通过 `Authorization` 头发送，浏览器不会自动附带它，因此天然的免疫 CSRF。但 localStorage 更容易受到 XSS 攻击。这就是安全和便利的权衡。

---

### 三、JWT 安全最佳实践

#### 3.1 JWT 存储位置：三大方案的对比

```
┌───────────────┬─────────────────┬─────────────────────┬─────────────────────┐
│  存储位置      │  CSRF 风险       │  XSS 风险            │  适用场景            │
├───────────────┼─────────────────┼─────────────────────┼─────────────────────┤
│ httpOnly Cookie│  高（需防护）    │  低（JS 无法读取）    │  传统 Web 应用       │
│ localStorage  │  无（不自动附带） │  高（JS 可读取）      │  SPA（需严格防 XSS） │
│ 内存变量       │  无              │  无（刷新即失）       │  高安全场景          │
└───────────────┴─────────────────┴─────────────────────┴─────────────────────┘
```

**推荐方案：Access Token 存内存 + Refresh Token 存 httpOnly Cookie**

```javascript
// 前端：Token 管理模块
const TokenManager = {
  // Access Token 存在 JS 闭包中（内存），页面刷新后丢失
  _accessToken: null,

  getAccessToken() {
    return this._accessToken;
  },

  setAccessToken(token) {
    this._accessToken = token;
    // 根据过期时间设置定时刷新
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = (payload.exp * 1000) - Date.now();
    // 在过期前 1 分钟自动刷新
    setTimeout(() => this.refresh(), expiresIn - 60000);
  },

  // Refresh Token 存在 httpOnly Cookie 中，JS 完全无法触碰
  async refresh() {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include', // 浏览器会自动带上 httpOnly Cookie
    });
    if (res.ok) {
      const { accessToken } = await res.json();
      this.setAccessToken(accessToken);
    } else {
      // Refresh Token 也过期了，需要重新登录
      this.clear();
      window.location.href = '/login';
    }
  },

  clear() {
    this._accessToken = null;
  },
};
```

#### 3.2 JWT 的组成和签发

```javascript
// server.js —— JWT 签发和验证的完整实现
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// 密钥管理：Access Token 和 Refresh Token 使用不同的密钥
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// JWT 配置
const JWT_CONFIG = {
  accessTokenExpiry: '15m',      // Access Token 短期有效（15分钟）
  refreshTokenExpiry: '7d',       // Refresh Token 长期有效（7天）
  issuer: 'my-app',
  audience: 'my-app-client',
};

/**
 * 生成 JWT Token 的工具函数
 * 将密钥的原始字符串转换为 Buffer，避免字符串编码问题
 */
function signToken(payload, secret, expiresIn) {
  return jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      // jti（JWT ID）：唯一标识，用于撤销特定 Token
      jti: crypto.randomBytes(16).toString('hex'),
    },
    Buffer.from(secret, 'utf8'), // 将密钥转为 Buffer
    {
      expiresIn,
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithm: 'HS256', // 明确指定算法，禁止 'none' 算法
    }
  );
}

/**
 * 用户登录接口
 * 返回：Access Token（响应体，前端存内存）+ Refresh Token（httpOnly Cookie）
 */
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  // 1. 验证用户名和密码（bcrypt 哈希比对）
  const user = await db.user.findByUsername(username);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    // 登录失败记录，用于检测暴力破解
    await logFailedLogin(username, req.ip);
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  // 2. 生成 Token（只包含必要信息，不要把密码哈希等敏感数据放入 JWT）
  const accessToken = signToken(
    { sub: user.id, role: user.role },
    ACCESS_TOKEN_SECRET,
    JWT_CONFIG.accessTokenExpiry
  );

  const refreshToken = signToken(
    { sub: user.id, type: 'refresh' },
    REFRESH_TOKEN_SECRET,
    JWT_CONFIG.refreshTokenExpiry
  );

  // 3. 将 Refresh Token 存入数据库（或 Redis），用于撤销
  await db.refreshToken.create({
    token: refreshToken,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // 4. 设置响应
  // Access Token 在响应体中，前端拿到后存内存
  // Refresh Token 在 httpOnly Cookie 中，JS 无法读取
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,       // 关键：JS 无法读取
    secure: true,         // 仅 HTTPS 传输
    sameSite: 'strict',   // 防 CSRF
    path: '/api/auth',    // 仅 /api/auth 路径携带，减少暴露面
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // 不把 Refresh Token 放在响应体中
  res.json({ accessToken });
});
```

#### 3.3 Token 刷新和撤销

```javascript
/**
 * Token 刷新接口
 * 从 httpOnly Cookie 中读取 Refresh Token，验证后签发新的 Access Token
 */
app.post('/api/auth/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: '没有 Refresh Token' });
  }

  try {
    // 1. 验证 Refresh Token 的签名和有效期
    const payload = jwt.verify(refreshToken, Buffer.from(REFRESH_TOKEN_SECRET, 'utf8'), {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
    });

    // 2. 确认 Token 在数据库中存在且未被撤销
    const storedToken = await db.refreshToken.findByToken(refreshToken);
    if (!storedToken || storedToken.revoked) {
      return res.status(401).json({ error: 'Refresh Token 已被撤销' });
    }

    // 3. Token 轮换（Token Rotation）：签发新的 Refresh Token，废除旧的
    const newAccessToken = signToken(
      { sub: payload.sub, role: payload.role },
      ACCESS_TOKEN_SECRET,
      JWT_CONFIG.accessTokenExpiry
    );

    const newRefreshToken = signToken(
      { sub: payload.sub, type: 'refresh' },
      REFRESH_TOKEN_SECRET,
      JWT_CONFIG.refreshTokenExpiry
    );

    // 4. 废除旧的 Refresh Token（防止重放攻击）
    await db.refreshToken.revoke(refreshToken);
    // 存储新的 Refresh Token
    await db.refreshToken.create({
      token: newRefreshToken,
      userId: payload.sub,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // 5. 设置新的 Cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    // JWT 验证失败（过期、签名不匹配等）
    res.clearCookie('refreshToken');
    return res.status(401).json({ error: 'Refresh Token 无效或已过期' });
  }
});

/**
 * 用户登出：清除所有 Token
 */
app.post('/api/auth/logout', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    // 撤销 Refresh Token
    await db.refreshToken.revoke(refreshToken);
  }
  // 清除 Cookie
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true });
});
```

---

### 四、认证流程安全

#### 4.1 防止暴力破解（速率限制）

```javascript
// 登录接口的速率限制 —— 防止暴力破解密码
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟窗口
  max: 5,                    // 每个 IP 最多 5 次尝试
  skipSuccessfulRequests: true, // 成功登录不计数
  standardHeaders: true,
  message: { error: '登录尝试次数过多，请 15 分钟后再试' },
});

app.post('/api/auth/login', loginLimiter, loginHandler);

// 更精细的控制：按用户名限制
async function checkAccountLockout(username) {
  const recentAttempts = await db.loginAttempt.count({
    where: {
      username,
      createdAt: { gt: new Date(Date.now() - 15 * 60 * 1000) },
      success: false,
    },
  });

  if (recentAttempts >= 5) {
    throw new Error('该账户已被临时锁定，请 15 分钟后再试');
  }
}
```

#### 4.2 密码哈希：bcrypt / argon2

```javascript
const bcrypt = require('bcrypt');

// 密码哈希配置
const BCRYPT_ROUNDS = 12; // 建议值：10-14，越大越安全但越慢

/**
 * 注册：对密码进行哈希后存储
 * 永远不要存储明文密码，永远不要自己设计哈希方案
 */
async function registerUser(username, password) {
  // bcrypt 自动生成随机盐（salt），包含在哈希结果中
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  // 存储结果：$2b$12$LJ3m...  — 包含算法标识、cost factor、salt、哈希值
  await db.user.create({ username, passwordHash });
}

/**
 * 登录：使用 bcrypt.compare 比对密码
 * 不要自己从哈希值中提取 salt，bcrypt.compare 自动处理
 */
async function verifyPassword(plainPassword, storedHash) {
  return bcrypt.compare(plainPassword, storedHash);
  // compare 使用恒定时间比较（constant-time comparison），防止时序攻击
}

// argon2 是更现代的选择（抗 GPU 暴力破解），但 bcrypt 仍然足够好
```

#### 4.3 OAuth 2.0 和 OIDC 的安全注意事项

```
OAuth 2.0 的核心概念：
  资源所有者（你）→ 客户端（第三方应用）→ 授权服务器（Google/GitHub）→ 资源服务器

关键安全措施：
  - state 参数：防止 CSRF。你的应用生成随机 state，在回调时验证 state 匹配。
  - PKCE（Proof Key for Code Exchange）：SPA 和移动应用必须使用。防止授权码拦截攻击。
  - redirect_uri 精确匹配：防止攻击者将授权码重定向到钓鱼网站。
  - 授权码只能使用一次：防止重放攻击。
```

```javascript
// OAuth 2.0 登录的安全实现
app.get('/auth/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  // 1. 验证 state 参数：防止 CSRF 攻击
  const savedState = req.cookies.oauthState;
  if (!state || state !== savedState) {
    return res.status(403).send('OAuth state 验证失败，可能是 CSRF 攻击');
  }
  // 一次性使用，立即清除
  res.clearCookie('oauthState');

  if (error) {
    return res.status(400).send(`OAuth 授权被拒绝: ${error}`);
  }

  // 2. 用授权码换取 Token（附带 PKCE code_verifier）
  const tokenResponse = await fetch('https://provider.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://yourapp.com/auth/oauth/callback', // 必须与申请授权码时一致
      client_id: process.env.OAUTH_CLIENT_ID,
      client_secret: process.env.OAUTH_CLIENT_SECRET,
      code_verifier: req.cookies.pkceVerifier, // PKCE
    }),
  });

  const tokens = await tokenResponse.json();
  // 3. 用 access_token 获取用户信息
  // 4. 为用户创建/查找本地账号，签发 JWT
  // ...
});
```

---

### 五、实战：实现完整的 JWT 认证流程

```javascript
// full-auth-flow.js —— 完整的安全 JWT 认证流程
// 涵盖：注册 → 登录 → 自动刷新 → 登出 → Token 撤销

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());
app.use(cookieParser()); // 解析 Cookie，读取 httpOnly 的 Refresh Token

// ========== 密钥管理 ==========
// 实际项目中应从 vault（如 AWS Secrets Manager、Vault）中获取
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

// ========== Token 工具函数 ==========
function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      type: 'access',
      jti: crypto.randomBytes(16).toString('hex'),
    },
    Buffer.from(ACCESS_TOKEN_SECRET, 'utf8'),
    { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: 'HS256' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      type: 'refresh',
      jti: crypto.randomBytes(16).toString('hex'),
    },
    Buffer.from(REFRESH_TOKEN_SECRET, 'utf8'),
    { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: 'HS256' }
  );
}

// ========== 认证中间件 ==========
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, Buffer.from(ACCESS_TOKEN_SECRET, 'utf8'), {
      algorithms: ['HS256'], // 明确限制算法
    });
    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: '令牌无效' });
  }
}

// ========== API 路由 ==========

// 注册
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  // 密码强度校验
  if (password.length < 8) {
    return res.status(400).json({ error: '密码至少 8 个字符' });
  }

  const existing = await db.user.findByUsername(username);
  if (existing) {
    return res.status(409).json({ error: '用户名已存在' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({ username, passwordHash });

  res.status(201).json({ id: user.id, username: user.username });
});

// 登录
app.post('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: '登录尝试次数过多' },
}), async (req, res) => {
  const { username, password } = req.body;

  const user = await db.user.findByUsername(username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    await logFailedAttempt(username, req.ip);
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  // 生成 Token 对
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // 存储 Refresh Token（用于后续撤销）
  await db.refreshToken.create({
    token: refreshToken,
    userId: user.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  // Refresh Token → httpOnly Cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // Access Token → 响应体
  res.json({ accessToken, user: { id: user.id, username: user.username } });
});

// 刷新 Token
app.post('/api/auth/refresh', async (req, res) => {
  const oldRefreshToken = req.cookies.refreshToken;
  if (!oldRefreshToken) {
    return res.status(401).json({ error: '未找到 Refresh Token' });
  }

  try {
    const payload = jwt.verify(
      oldRefreshToken,
      Buffer.from(REFRESH_TOKEN_SECRET, 'utf8'),
      { algorithms: ['HS256'] }
    );

    // 验证 Refresh Token 未撤销
    const stored = await db.refreshToken.findByToken(oldRefreshToken);
    if (!stored || stored.revoked) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ error: 'Token 已被撤销' });
    }

    const user = await db.user.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    // Token 轮换：旧 Token 作废，签发新 Token
    await db.refreshToken.revoke(oldRefreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    await db.refreshToken.create({
      token: newRefreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ accessToken: newAccessToken });
  } catch {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return res.status(401).json({ error: 'Refresh Token 无效' });
  }
});

// 登出
app.post('/api/auth/logout', authenticate, async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    await db.refreshToken.revoke(refreshToken);
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true });
});

// 受保护的 API 示例
app.get('/api/profile', authenticate, async (req, res) => {
  const user = await db.user.findById(req.user.sub);
  res.json({ id: user.id, username: user.username, role: user.role });
});

app.listen(3000);
```

---

## 常见问题

**Q1：如果我的 SPA 和 API 部署在不同的域名下，CSRF Token 还管用吗？**

A：CSRF Token 依赖同源策略——攻击者无法跨域读取你的页面内容。如果你的 SPA（app.example.com）和 API（api.example.com）是不同源，SPA 需要通过跨域请求（CORS）调用 API。此时需要在 API 服务器上正确配置 CORS（只允许 `app.example.com`），同时通过自定义请求头的方式传递 CSRF Token。攻击者的恶意网站不在 CORS 白名单中，浏览器会拒绝响应，因此攻击者无法获取 Token。

**Q2：SameSite=Lax 和 SameSite=Strict 到底应该选哪个？**

A：对于大多数 Web 应用，**SameSite=Lax 是更实用的选择**。Strict 太严格——用户从邮件中点击你的链接时，Cookie 都不发送，用户打开后是未登录状态，体验很差。Lax 在安全性和用户体验之间取得了平衡：允许顶级导航的 GET 请求携带 Cookie（用户点击链接正常登录），但禁止 POST / iframe / AJAX 等可能被用于 CSRF 的操作。对于银行或支付等对安全要求极高的场景，Strict + CSRF Token 双重防护更合适。

**Q3：JWT 的 payload 是 Base64 编码的，任何人都能解码，安全吗？**

A：JWT 的 payload **不是加密**的，而是**签名**的。任何人都可以读取内容（所以不要在 payload 中放敏感信息），但没有人能篡改内容后生成有效的签名。安全性来自签名验证——服务器用密钥验证 Token 未被篡改。如果你需要加密载荷（即连内容都不想让客户端看到），使用 JWE（JSON Web Encryption）。

**Q4：为什么 Access Token 时间这么短（15 分钟），不麻烦吗？**

A：短生命周期的 Access Token 是一种"最小暴露面"策略。万一 Access Token 泄露（如通过日志、网络抓包），攻击者只有 15 分钟的窗口期。Refresh Token 存在 httpOnly Cookie 中+数据库可撤销，即使泄露也可以主动失效。这就是 JWT 最佳实践的核心矛盾：无状态 JWT 无法单方面撤销，所以用"短有效期 + Refresh Token 轮换"来弥补。

**Q5：localStorage 存 JWT 到底行不行？**

A：技术上可以，但你必须理解风险。XSS 攻击一旦成功，攻击者可以直接 `localStorage.getItem('token')` 拿到你的 JWT，然后冒充你的身份。如果你选择 localStorage，必须在 XSS 防御上做到极致（严格 CSP、DOMPurify、永远不直接用 innerHTML）。很多人说"我的应用很简单，不会有 XSS"——这恰恰是安全问题发生的根本原因。

**Q6：CSRF Token 和 XSS 有什么关系？**

A：它们是正交的防线，但又相互关联。如果 XSS 攻击成功，攻击者可以在你的页面上执行任意 JS，那么他可以：读取 DOM 中的 CSRF Token → 直接发起带 Token 的请求。这意味着，一旦 XSS 被突破，CSRF Token 也失效了。但这不意味着 CSRF Token 没用——它的作用是防止 CSRF 攻击，而 XSS 是另一类攻击，你需要用 XSS 防御手段去应对。多层次防御的意思是，每一层防线解决一类问题，而不是让一个漏洞击穿所有防线。

**Q7：OAuth 2.0 中的 state 参数如果被预测或重放怎么办？**

A：state 参数必须是高熵的随机值（至少 128 位），且与用户会话绑定（通常存在服务端 Session 或签名的 Cookie 中），并且只能使用一次。如果你的 state 是固定值或递增 ID，攻击者可以预先生成一个有效的 state 并发起 CSRF 攻击。正确做法：`crypto.randomBytes(32).toString('hex')`，存储在服务端，回调时比对并立即删除。

**Q8：要不要把 JWT 放在请求头而不是 Cookie 中？**

A：`Authorization: Bearer <token>` 是 API 认证的标准方式，尤其适合 SPA。主要优势：(1) 天然的 CSRF 免疫；(2) 不受同源策略限制（可以跨域调用 API）。主要劣势：(1) 需要前端手动管理 Token 存储和刷新；(2) 如果存在 localStorage 中，XSS 可以轻易窃取。折中方案：Access Token 放 `Authorization` 头 + 存内存，Refresh Token 放 httpOnly Cookie。

---

## 实操作业

### 基础练习：实现 CSRF 防御

1. 搭建一个包含"转账"功能的简单 Web 应用（任意框架）
2. 实现一个 CSRF Token 防御机制：在表单中嵌入 Token，服务端验证
3. 搭建一个"恶意网站"（evil.html），尝试从外部向你的应用发起 CSRF 攻击，验证防御是否生效
4. 分别测试 SameSite=Lax 和 SameSite=Strict 的情况下的防护效果

### 进阶练习：实现完整的 JWT 认证流程

1. 使用上面的 `full-auth-flow.js` 作为参考，在你选定的后端框架（Express / Fastify / Hono）中实现完整的 JWT 认证
2. 实现：注册、登录、Token 自动刷新、登出、多设备登录管理
3. 前端实现自动刷新逻辑：在 API 拦截器中检测 401 `TOKEN_EXPIRED`，自动调用 `/api/auth/refresh`，无缝续期
4. 编写集成测试验证以下场景：正常登录、Token 过期后自动刷新、刷新失败后跳转登录页、登出后 Token 失效

### 挑战练习：安全审计 + 升级方案

1. 对你当前的一个线上项目的认证流程进行安全审计，列出所有发现的风险点
2. 针对每个风险点制定修复方案，评估修复成本和风险
3. 至少实施以下一项升级：将 JWT 从 localStorage 迁移到 httpOnly Cookie + 内存、添加 Token 轮换机制、实现 OAuth 2.0 PKCE
4. 在 CI 中加入认证流程的自动化安全测试（暴力破解防护测试、Token 过期测试、CSRF 攻击测试）

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L5 里程碑](../../projects/atlas/milestones/L5.md)
- 本课任务：按 L5 里程碑在 Atlas 中建立“CSRF 与认证安全”的可量化基线、改进方案、前后证据和长期治理规则。
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

CSRF 和认证安全看似是两个话题，但它们有同一个交汇点：**身份凭据的管理**。

CSRF 攻击之所以可能，是因为浏览器的"自动带 Cookie"机制被利用——你登录了网站 A，恶意网站 B 就能借你的 Cookie 向 A 发请求。防御的核心思路是：让服务器能区分"你本人发起的请求"和"别人冒充你发起的请求"。CSRF Token、SameSite Cookie、Origin 校验——这些都是在请求中增加一个攻击者无法伪造的信息。

JWT 是现代 Web 应用最主流的认证方式，但"方便"不等于"安全"——JWT 的无状态特性意味着你不能主动撤销它（除非有额外的撤销机制）。正确的 JWT 实践是一个完整的生命周期管理：短有效期的 Access Token + 可撤销的 Refresh Token + httpOnly Cookie + Token 轮换 + 暴力破解防护。

记住：安全不是一个功能，不是某个迭代就能"做完"的东西。它是在你写每一行与身份验证相关的代码时，脑子里多闪过的一个念头："如果有人想冒充我的用户，他能得逞吗？"

<!-- course-nav:start -->
---

[上一篇：01-XSS 防御与 CSP 策略](./01-XSS防御与CSP策略.md) · [课程地图](../../README.md) · [下一篇：03-供应链安全与依赖审计](./03-供应链安全与依赖审计.md)
<!-- course-nav:end -->
