# 45-认证：密码哈希、JWT 与 Session

## 目标

完成本知识单元后，学员应能在后端独立实现一条“注册—登录—携带凭证—校验身份—失效退出”的完整认证链路，并理解每个安全决策背后的原因。

学员应能够：

1. 准确区分认证（Authentication）与授权（Authorization），说明 401 与 403 分别对应哪一类失败。
2. 解释密码为什么不能明文存储，说清哈希与加密的区别，以及加盐解决了什么问题。
3. 比较 bcrypt、argon2、scrypt 的设计取舍，能正确调用密码哈希库完成注册与登录校验。
4. 拆解 JWT 的三段结构，独立完成令牌签发、校验、过期处理，并理解刷新令牌的作用。
5. 对比 JWT 与 Session + Cookie 两种会话方案，能根据部署形态和团队条件做出选型并说明理由。
6. 说清令牌撤销、令牌盗取与重放攻击的概念，能实现黑名单、短有效期、安全 Cookie 等基础缓解措施。

本单元聚焦“证明你是谁”。角色、权限矩阵、越权防护等“你能做什么”的内容在第 46 单元展开；安全响应头、限流、CORS 等 API 安全内容在第 48 单元展开。

## 技术栈

| 工具或依赖 | 当前稳定版本参考 | 用途 | 学习要求 |
|---|---|---|---|
| Node.js | 22 LTS / 24 LTS | 后端运行时 | 能运行 Express 服务与异步脚本 |
| Express | 4.x（5.x 已发布，可按团队选择） | HTTP 服务与中间件 | 能组织注册、登录、受保护路由 |
| `bcryptjs` 或 `bcrypt` | bcryptjs 2.x / bcrypt 5.x | 密码哈希与比对 | 理解 cost 因子，能处理异步比对 |
| `argon2` | 0.40.x | 现代密码哈希 | 了解 argon2id 及参数含义 |
| `jsonwebtoken` | 9.x | JWT 签发与校验 | 能设置过期、算法与载荷 |
| Cookie 相关中间件 | `cookie-parser` 1.x | 读写 Cookie | 能配置 HttpOnly、Secure、SameSite |
| 数据库访问 | 任意 SQL 数据库 + 驱动或 ORM | 保存用户与哈希 | 只保存哈希，永不保存明文密码 |

安装示例：

```bash
npm install express bcryptjs jsonwebtoken cookie-parser
npm install -D @types/node
```

环境变量约定（所有 Secret 只允许通过环境变量注入，示例值均为占位符，不可用于真实环境）：

```text
JWT_ACCESS_SECRET=replace-with-a-long-random-string-at-least-32-bytes
JWT_REFRESH_SECRET=replace-with-a-different-long-random-string
PORT=3000
NODE_ENV=development
```

生成随机 Secret 的本地方式：

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 详细的理论知识讲解和示例伪代码

### 1. 认证与授权的边界

#### 定义

认证回答“你是谁”，英文为 Authentication，系统通过你持有的凭证确认身份，例如密码、短信验证码、指纹、登录令牌。授权回答“你能做什么”，英文为 Authorization，系统在确认身份之后判断你是否有权执行某个操作，例如是否能删除订单、是否能进入管理后台。

两者在 HTTP 状态码上有明确分工：

| 场景 | 状态码 | 典型含义 |
|---|---|---|
| 未登录、令牌缺失、令牌过期或签名无效 | 401 Unauthorized | 身份没有通过认证 |
| 已登录但不允许访问该资源 | 403 Forbidden | 身份已确认，但授权失败 |
| 资源对当前身份不存在或不可见 | 404 Not Found | 常用 404 隐藏资源是否存在 |

#### 与后端的关系

后端每个受保护请求都要先认证再授权，且这个顺序不能颠倒：没有确认身份就无法判断权限。前端隐藏按钮只是体验优化，后端必须重新认证，因为前端代码和请求都可以被任意构造。

一次受保护请求的处理顺序：

```text
接收请求
读取凭证（Authorization 头或 Cookie）
校验凭证签名与有效期        # 认证
根据身份加载用户与角色       # 为授权准备数据
判断是否允许本次操作         # 授权
执行业务逻辑
返回结果
```

#### 示例

```js
// 认证中间件：只负责确认身份，不判断具体权限
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ code: 'TOKEN_MISSING', message: '请先登录' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ code: 'TOKEN_INVALID', message: '登录已失效，请重新登录' });
  }
}

app.get('/api/profile', authenticate, (req, res) => {
  res.json({ userId: req.user.id });
});
```

#### 常见误区

> 登录页能打开，说明认证通过了。

登录页本身是公开资源，真正的认证发生在提交凭证或携带令牌访问受保护资源时。

> 后端返回 403，前端跳登录页就行。

403 表示身份已经确认，正确处理是提示“无权限”，跳登录页不能解决授权问题。

### 2. 密码为什么不能明文存储

#### 定义

明文存储指把用户密码原样写进数据库或日志。一旦数据库泄露、备份丢失或内部人员越权访问，所有用户密码会立即暴露。由于大量用户在多个网站复用同一密码，泄露还会牵连邮箱、支付等其他系统。

正确做法是：数据库只保存经过慢哈希处理后的结果；登录时用相同算法对用户本次输入做计算并与存储值比对；系统任何时候都不需要、也不应该还原出原始密码。

#### 与后端的关系

注册和登录两条路径都要改造：

```text
注册：
接收密码 -> 服务端校验强度 -> 计算加盐哈希 -> 只保存哈希

登录：
接收密码 -> 按账号取出哈希 -> 用算法比对输入与哈希 -> 成功则建立会话
```

后端还应避免密码出现在访问日志、错误堆栈、审计日志和 URL 查询参数中。

#### 示例

```text
错误做法（示意，禁止在真实系统中这样写）：
INSERT INTO users(email, password) VALUES ('a@example.com', 'Zhang@123456');

正确做法：
users 表
├── email        = a@example.com
└── passwordHash = $2a$12$N9qo8uLOickgx2ZMRZoMy...   # 只剩哈希，无法反推
```

```js
// 注册时绝不接触“还原密码”的逻辑
async function register(email, password) {
  const exists = await findUserByEmail(email);
  if (exists) {
    throw new AppError('EMAIL_TAKEN', 409, '该邮箱已被注册');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await createUser({ email, passwordHash });
  return { email };
}
```

#### 常见误区

> 数据库在内网，加密传输了，密码就可以明文存。

HTTPS 只保护传输过程，不能防止数据库泄露、备份外泄或内部越权。存储安全必须独立保证。

> 用 Base64 编码密码就算加密。

Base64 是编码，任何人都能立即解码，不提供任何安全保证。

### 3. 哈希、加密与加盐

#### 定义

哈希（Hash）是单向变换：任意长度输入经哈希函数得到固定长度摘要，设计上不可从摘要反推原文。密码存储使用的是“慢哈希”，即刻意调慢计算、增加成本，让攻击者批量猜解代价高昂。

加密（Encryption）是可逆变换：用密钥把明文变成密文，持有正确密钥可以解密还原。密码存储一般不需要可逆，因此应选哈希而非加密。

加盐（Salt）是在哈希计算时混入一段每个用户独立的随机值。即使两个用户密码相同，加盐后的哈希也不同，从而让预计算的彩虹表失效，并迫使攻击者对每个用户单独猜解。

| 概念 | 方向 | 是否需要密钥 | 典型用途 |
|---|---|---|---|
| 普通哈希（SHA-256） | 单向 | 否 | 完整性校验，不适合直接存密码 |
| 加盐慢哈希（bcrypt 等） | 单向且慢 | salt 内嵌在结果中 | 密码存储 |
| 对称加密（AES） | 可逆 | 是 | 保护需要还原的数据 |

#### 与后端的关系

后端需要理解：MD5、SHA-1、SHA-256 直接用于密码都是错误的，因为它们计算太快，攻击者用显卡每秒可尝试海量候选。加盐 + 慢哈希 + 足够成本因子才是密码存储的组合。

#### 示例

```text
未加盐：
sha256("123456") = 8d969eef6ecad3c29a3a629280e686cf...   # 全网相同，查彩虹表即得原文

加盐慢哈希：
bcrypt("123456", cost=12, salt=随机) = $2a$12$N9qo8...   # 每个用户结果不同，且计算耗时
```

```ts
import bcrypt from 'bcryptjs';

// salt 会被 bcrypt 自动生成并编码进返回字符串，无需单独建列保存
async function hashPassword(plain: string): Promise<string> {
  const cost = 12; // 2^12 轮迭代；按服务器承受能力逐步提高
  return bcrypt.hash(plain, cost);
}

async function verifyPassword(plain: string, storedHash: string): Promise<boolean> {
  // 库内部从 storedHash 读出 salt 和 cost，再用相同参数计算比对
  return bcrypt.compare(plain, storedHash);
}
```

#### 常见误区

> 所有用户共用一个固定 salt 就行。

固定 salt 无法阻止攻击者针对该 salt 预计算彩虹表。salt 必须每用户独立、随机生成，并与哈希一起保存。

> hash 速度越快，系统性能越好。

对密码哈希恰恰相反：快意味着攻击者猜解成本低。慢哈希的“慢”是安全特性。

### 4. bcrypt、argon2 与 scrypt

#### 定义

- bcrypt：历史最久、生态最成熟的密码哈希算法，内置 salt，通过 cost 因子（2 的幂次迭代数）调节成本，输出字符串中包含算法版本、cost、salt 与哈希。
- argon2：密码哈希竞赛获胜算法，推荐使用 argon2id 变体，可同时调节内存成本、时间成本与并行度，能抵抗 GPU、ASIC 批量破解，是新项目的优先选择。
- scrypt：较早的内存困难算法，通过大量内存消耗提高并行攻击成本，Node.js 内置 `crypto.scrypt`，适合不想引入原生依赖的场景。

#### 与后端的关系

三者都属于 KDF（密钥派生函数）思路，共同目标是让“离线猜解一个哈希”足够昂贵。选型时应考虑：运维环境能否编译原生模块、团队语言生态、未来参数升级路径。无论选哪种，都要记录参数并支持随硬件升级逐步调强。

#### 示例

```js
// 使用 Node.js 内置 scrypt，无需额外原生依赖
const crypto = require('crypto');

function hashWithScrypt(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16);
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$16384$8$1$${salt.toString('hex')}$${derivedKey.toString('hex')}`);
    });
  });
}
```

```ts
// argon2id 示例（伪代码风格，参数按服务承受能力调整）
import argon2 from 'argon2';

async function hashWithArgon2(plain: string): Promise<string> {
  return argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });
}

async function verifyWithArgon2(plain: string, stored: string): Promise<boolean> {
  return argon2.verify(stored, plain);
}
```

bcrypt 结果格式解读：

```text
$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy
 │   │  └──────────────────┬───────────────────────────────┘
 │   │                     └ salt(22字符) + 哈希(31字符)
 │   └ cost = 12，即 2^12 轮
 └ 算法版本
```

#### 常见误区

> cost 设得越高越好，直接设到 20。

过高的 cost 会让登录请求耗时数百毫秒甚至更久，既拖垮服务，又容易被用于制造拒绝服务。应从 11 或 12 开始，结合压测逐步提高。

> 换了更强的算法，旧哈希可以批量“升级”。

无法从旧哈希反推密码，因此不能批量重算。正确做法是用户下次登录成功时用新算法重新哈希并替换存储值。

### 5. JWT 的三段结构

#### 定义

JWT（JSON Web Token）是一种紧凑的、自包含的令牌格式，由三段 Base64URL 编码内容用点号连接：

1. Header：声明令牌类型与签名算法，例如 `{"alg":"HS256","typ":"JWT"}`。
2. Payload：声明（Claims），存放身份信息与元数据，如 `sub`（主体）、`iat`（签发时间）、`exp`（过期时间）。
3. Signature：对前两段的签名，防止令牌被篡改，由服务端密钥计算。

```text
base64url(Header).base64url(Payload).Signature
eyJhbGciOi... .eyJzdWIiOi... .SflKxwRJ...
```

关键事实：Payload 只是 Base64URL 编码，不是加密，任何人都能解开读取。因此 JWT 中禁止放密码、身份证号等敏感信息；JWT 的安全性来自签名，而非内容隐藏。

#### 与后端的关系

后端登录成功后签发 JWT，之后每个请求只需用密钥验证签名和过期时间，不必查询会话存储，这使 JWT 天然适合无状态水平扩展。但“无状态”也带来代价：令牌在过期前难以主动作废，撤销需要额外机制。

#### 示例

```js
const token = jwt.sign(
  {
    sub: user.id,
    role: user.role,
  },
  process.env.JWT_ACCESS_SECRET,
  {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: 'web-course',
  }
);
// token: header.payload.signature
```

```text
解码后肉眼可见的 Payload（不是密文）：
{
  "sub": "u_10086",
  "role": "member",
  "iat": 1780000000,
  "exp": 1780000900,
  "iss": "web-course"
}
```

#### 常见误区

> JWT 内容是加密的，放什么都安全。

Payload 仅编码不加密，敏感字段一律不放。

> 在 Payload 里放 `isAdmin:true`，后端读它来判断管理员。

可以被攻击者修改后重新签名吗？没有密钥签不出合法签名，但仍应以后端权威数据为准，且 Payload 一旦签发在过期前无法收回，权限变更不能只靠改 Payload。

### 6. JWT 的签发与校验

#### 定义

签发是服务端用密钥对 Header 和 Payload 计算签名并合成令牌；校验是服务端用同一密钥重新计算签名并比对，同时检查 `exp`、签发者等声明。必须显式指定允许的算法，防止攻击者把 `alg` 改成 `none` 或诱导服务使用公钥当 HMAC 密钥的算法混淆攻击。

#### 与后端的关系

校验逻辑应集中在认证中间件，业务路由只消费 `req.user`。校验失败要区分“没带令牌”和“令牌非法/过期”，但对外都返回 401，且错误信息不透露是密钥不对还是过期之外的细节。

#### 示例

```ts
import jwt, { type SignOptions } from 'jsonwebtoken';

interface AccessClaims {
  sub: string;
  role: string;
}

function signAccessToken(user: AccessClaims): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: '15m',
    issuer: 'web-course',
  };
  return jwt.sign({ sub: user.sub, role: user.role }, process.env.JWT_ACCESS_SECRET!, options);
}

function verifyAccessToken(token: string): AccessClaims {
  const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!, {
    algorithms: ['HS256'], // 显式白名单，拒绝 alg=none
    issuer: 'web-course',
  });
  return decoded as AccessClaims;
}
```

```js
// 路由侧使用
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    // 账号不存在与密码错误使用相同提示，避免泄露“哪些邮箱已注册”
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: '邮箱或密码错误' });
  }
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  res.json({ accessToken });
});
```

#### 常见误区

> 校验时不指定 algorithms，库默认支持什么就用什么。

这会留下算法混淆与 `none` 攻击面，必须显式声明算法白名单。

> 把 JWT 密钥写进代码仓库，方便部署。

密钥一旦进入仓库历史就应视为已泄露，必须通过环境变量或密钥管理服务注入并轮换。

### 7. 过期、刷新令牌与 Session + Cookie 对比选型

#### 定义

访问令牌（Access Token）有效期应很短，例如 15 分钟，被盗后可利用窗口有限；刷新令牌（Refresh Token）有效期较长，例如 7 到 30 天，只用于在访问令牌过期时向专用接口换取新的访问令牌，且应安全存储、可单独撤销。

Session + Cookie 是另一套方案：登录后服务端保存会话状态，向浏览器下发一个不透明的会话 ID，放在 Cookie 中；服务端可随时删除会话实现立即失效。Cookie 可设置 `HttpOnly`（防脚本读取）、`Secure`（仅 HTTPS）、`SameSite`（限制跨站携带）。

| 维度 | JWT（无状态） | Session + Cookie（有状态） |
|---|---|---|
| 服务端存储 | 默认不存会话 | 需要会话存储（Redis/数据库） |
| 水平扩展 | 天然无状态 | 需共享会话存储或粘性会话 |
| 主动失效 | 难，需黑名单等额外机制 | 删除会话即可立即生效 |
| 典型载体 | Authorization 头，也可放 Cookie | HttpOnly Cookie |
| 跨域/多端 | 对移动 App、多服务友好 | 浏览器友好，跨域需额外配置 |
| 注销与改密 | 需专门设计 | 天然支持 |

#### 与后端的关系

选型不是二选一的宗教之争：浏览器优先、对“立即下线”要求高的系统常用 Session 或“JWT + 服务端刷新令牌白名单”的混合方案；微服务多端场景常用短时 JWT 降低会话存储压力。

刷新流程：

```text
访问令牌过期
客户端携带刷新令牌请求 /api/token/refresh
服务端校验刷新令牌签名 + 是否在服务端有效名单中
签发新的 15 分钟访问令牌（必要时轮换刷新令牌）
原访问令牌自然过期
```

#### 示例

```js
// 刷新令牌：单独密钥、更长有效期、可在服务端记录版本
function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, typ: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: '14d',
  });
}

app.post('/api/token/refresh', async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, {
      algorithms: ['HS256'],
    });
    const user = await findUserById(payload.sub);
    if (!user || user.tokenVersion !== payload.tv) return res.sendStatus(401);
    const accessToken = signAccessToken({ sub: user.id, role: user.role });
    res.json({ accessToken });
  } catch (err) {
    res.sendStatus(401);
  }
});
```

```js
// Session + Cookie 方案的关键 Cookie 属性
res.cookie('sid', sessionId, {
  httpOnly: true, // document.cookie 读不到
  secure: process.env.NODE_ENV === 'production', // 生产仅经 HTTPS 发送
  sameSite: 'lax', // 防大部分跨站携带
  maxAge: 7 * 24 * 60 * 60 * 1000,
});
```

#### 常见误区

> 把访问令牌有效期设成 30 天，就不用刷新机制了。

长有效期等于把被盗令牌的可利用窗口放大到 30 天，违背最小暴露原则。

> JWT 放 LocalStorage 就万事大吉。

LocalStorage 可被任意同页脚本读取，一旦存在 XSS，令牌会直接被盗；高敏感场景优先考虑 HttpOnly Cookie。

### 8. 令牌撤销、盗取与重放

#### 定义

令牌撤销指在自然过期之前让令牌失效。常见手段：黑名单（记录已注销且未过期的令牌 jti，直到其 `exp`）、短有效期、刷新令牌版本号（用户改密或全端下线时递增版本，旧刷新令牌全部失效）。

令牌盗取指攻击者通过 XSS、网络中间人、设备被入侵等方式获得令牌；重放攻击指攻击者截获一个合法请求或令牌后原样再次发送。缓解手段包括 HTTPS 防中间人、短有效期、安全 Cookie、关键操作二次确认、对重放敏感的接口使用一次性随机数（nonce）或幂等键。

#### 与后端的关系

撤销机制本质上是在无状态 JWT 上重新引入少量状态。工程上常见折中：访问令牌保持 15 分钟无状态，注销时加入黑名单并由前端丢弃；真正需要立即生效的“踢出登录”通过刷新令牌版本号在下一次刷新时完成收敛。

#### 示例

```text
注销与改密的状态收敛：
注销：访问令牌 jti 进黑名单（TTL=其剩余有效期）-> 前端删除令牌
改密/全端下线：users.token_version + 1
旧刷新令牌中的 tv 与库中不一致 -> 刷新被拒 -> 15 分钟内全部会话退出
```

```js
// 校验时同时检查黑名单（示意接口）
async function authenticate(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return res.sendStatus(401);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] });
    if (await isRevoked(payload.jti)) {
      return res.status(401).json({ code: 'TOKEN_REVOKED', message: '请重新登录' });
    }
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    res.status(401).json({ code: 'TOKEN_INVALID', message: '登录已失效' });
  }
}
```

```text
防重放最小认知清单：
1. 全站 HTTPS，令牌不经明文网络传输。
2. 访问令牌短命，减少被盗后的有效时间。
3. 转账、改密等动作要求重新输入密码或二次验证。
4. 支付类接口使用服务端生成的幂等键，重复提交只生效一次。
```

#### 常见误区

> 注销只是前端把令牌删掉。

令牌在过期前对服务端仍然有效，攻击者若已获取令牌可继续使用；需要服务端撤销机制配合。

> HTTPS 配好了，令牌就永远不会被盗。

HTTPS 解决传输环节，XSS、终端中毒、日志泄露仍可能偷走令牌，需要分层防御。

## 课后题

1. 用自己的语言解释认证与授权的区别，并各举一个生活中的例子。
2. 为什么数据库泄露后，明文存储密码的危害会超出这个网站本身？请从用户习惯角度分析。
3. 哈希和加密的根本区别是什么？为什么“存储用户密码”这个场景应该优先选哈希？
4. salt 的作用是什么？为什么“所有用户共用一个固定 salt”不能有效防御彩虹表？
5. bcrypt 结果字符串中包含哪几部分？为什么不需要为 salt 单独建一列？
6. JWT 的三段分别是什么？为什么说“JWT 是自包含的”，又为什么不能在 Payload 里放密码？
7. 场景分析：某系统把访问令牌有效期设为 30 天并存储在 LocalStorage。请指出至少三个风险点，并给出整改方案。
8. 场景分析：用户在公共电脑登录后只关闭浏览器标签页，没有点注销。攻击者随后使用该电脑。分别分析 JWT 方案与 Session + HttpOnly Cookie 方案下可能发生什么，服务端应如何补救。
9. 场景分析：某接口在校验 JWT 时不限制算法。攻击者构造 `alg: none` 的令牌能否直接通过？要满足什么条件？正确配置是什么？
10. 场景分析：用户修改密码后，希望“所有设备上的旧登录立即失效”。在“15 分钟访问令牌 + 14 天刷新令牌”的架构下，给出你的实现思路，并说明为什么部分会话最多还能存活 15 分钟。

## 实践练习题

### 练习 1：注册与登录的密码安全基线

#### 任务

基于 Express 实现注册与登录接口，密码使用 bcryptjs 加盐哈希存储，登录成功签发 15 分钟有效的 JWT。

#### 步骤约束

1. 提供 `POST /api/register`，接收 `email` 与 `password`；服务端校验邮箱格式与密码至少 8 位且包含字母和数字。
2. 注册时使用 `bcrypt.hash(password, 12)`，数据库只保存 `passwordHash`；重复邮箱返回 409。
3. 提供 `POST /api/login`，使用 `bcrypt.compare` 比对；账号不存在与密码错误统一返回相同的 401 提示。
4. 登录成功返回访问令牌；提供 `GET /api/profile`，携带合法令牌返回当前用户信息，缺失或非法令牌返回 401。
5. JWT 密钥只从环境变量读取，缺失时服务拒绝启动；代码与提交物中不得出现真实密钥。

#### 提交物

- `src/server.js` 或 `src/server.ts`；
- 用户表结构说明（字段名与用途）；
- 注册、登录成功、密码错误、无令牌访问四个场景的请求与响应记录；
- 一页以内的设计说明：cost 为什么选 12、为什么登录失败提示统一。

#### 验收标准

- 数据库中找不到任何明文密码；
- 同一明文两次注册得到不同哈希；
- 篡改后的令牌一律被拒绝；
- 所有密钥均为占位或环境变量，仓库中无真实 Secret；
- 接口状态码使用正确（401/409/200/201）。

### 练习 2：刷新令牌与安全会话

#### 任务

在练习 1 的基础上增加刷新令牌机制，并提供一个基于 HttpOnly Cookie 的会话实现作为对照。

#### 步骤约束

1. 登录成功后同时下发 15 分钟访问令牌和 14 天刷新令牌；刷新令牌使用独立密钥，可通过 Cookie 下发，设置 `httpOnly`、`secure`（生产环境）、`sameSite: 'lax'`。
2. 实现 `POST /api/token/refresh`：校验刷新令牌后签发新的访问令牌；刷新令牌非法或过期返回 401。
3. 实现 `POST /api/logout`：将当前访问令牌的 `jti` 加入黑名单，TTL 等于其剩余有效期，并清除刷新 Cookie。
4. 另写一个 `session-demo.js`：用 Session + Cookie 完成同等功能，注销后会话立即失效。
5. 在说明文档中对比两种方案的注销生效时间、扩展性和实现复杂度。

#### 提交物

- 认证服务完整代码；
- `session-demo.js`；
- 令牌过期后成功刷新、刷新令牌过期被拒、注销后旧访问令牌被拒三组证据；
- 两方案对比表。

#### 验收标准

- 访问令牌过期后无需重新登录即可刷新；
- 注销后携带旧令牌访问受保护接口返回 401；
- Cookie 可见属性包含 HttpOnly、SameSite；
- 对比结论能结合具体场景，而非简单断言“JWT 更好”；
- 黑名单记录不会永久堆积，TTL 与令牌剩余有效期一致。

### 练习 3：令牌撤销与重放缓解综合演练

#### 任务

实现“全端下线”和关键操作防重放两项能力，并通过攻防演练验证。

#### 步骤约束

1. 用户表增加 `tokenVersion` 字段；刷新令牌中携带版本号，刷新时与库中比对。
2. 提供 `POST /api/sessions/terminate-all`（需登录）：递增 `tokenVersion`，使所有旧刷新令牌失效，并说明 15 分钟内访问令牌的收敛过程。
3. 模拟“盗取”：手动复制一个有效令牌从另一客户端发起请求，记录在短有效期与黑名单下的表现。
4. 对一个模拟转账接口 `POST /api/transfer` 要求幂等键：相同幂等键重复提交只执行一次。
5. 编写演练报告，按“攻击步骤—系统表现—缓解措施”组织。

#### 提交物

- 服务端代码；
- 演练报告（含真实请求/响应，密钥脱敏）；
- `tokenVersion` 变更前后的刷新结果对比；
- 重复提交幂等键只生效一次的证据。

#### 验收标准

- 全端下线后，旧刷新令牌无法换取新访问令牌；
- 幂等重复请求不会产生两笔转账；
- 报告能区分“已彻底阻止”和“缩短可利用窗口”两类效果；
- 全程 HTTPS 或明确说明本地 HTTP 仅限实验；
- 不通过削弱校验（如关闭签名验证）制造演示效果。

## 阶段验收作业

### 作业名称

认证服务安全实现与攻防验证报告

### 作业场景

团队要上线一个面向浏览器和移动端的账号体系，安全评审要求你回答：密码如何存储、令牌如何签发与刷新、注销和改密如何收敛、令牌被盗后影响面有多大。你需要交付一个可运行的认证服务和一份以证据支撑的安全报告。

### 提交物

```text
auth-service/
├── src/
│   ├── server.js
│   ├── auth/
│   │   ├── password.js      # 哈希与比对
│   │   ├── token.js         # 签发与校验
│   │   └── middleware.js    # 认证与黑名单
│   └── routes/
│       ├── auth.js
│       └── account.js
├── evidence/
│   └── security-report.md
├── .env.example             # 只含占位符
└── README.md
```

必做接口：注册、登录、获取当前用户、刷新令牌、注销、全端下线、一个要求幂等键的模拟敏感操作。

### 演示步骤

学员需在 20 分钟内现场完成：

1. 注册一个新账号，展示数据库中只保存加盐哈希，且两次注册相同密码哈希不同。
2. 登录并展示返回的访问令牌结构，解码 Header 与 Payload，指出敏感信息为何不在其中。
3. 等待或手动令访问令牌过期，用刷新令牌换取新令牌。
4. 注销后携带旧令牌访问受保护接口，展示返回 401。
5. 触发全端下线，展示旧刷新令牌被拒，并解释访问令牌的最长收敛时间。
6. 用相同幂等键连续两次请求敏感操作，展示只生效一次。
7. 回答导师随机提问：JWT 与 Session 选型、密钥轮换思路、公共电脑场景补救。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 密码安全 | 20 | 正确加盐慢哈希，无明文落库，登录失败提示统一，参数选择合理 |
| JWT 实现 | 20 | 三段理解正确，算法白名单，过期与签发者校验完整，载荷无敏感信息 |
| 刷新与撤销 | 20 | 刷新令牌独立密钥与独立路径，注销黑名单与全端下线版本号生效 |
| 防盗取与防重放 | 10 | 安全 Cookie 属性正确，敏感操作幂等，能说清分层防御 |
| 证据与报告 | 15 | 各场景请求响应齐全，结论与证据对应，风险描述准确 |
| 工程规范 | 15 | 结构清晰，配置走环境变量，README 可复现，代码可运行 |

细分规则：

- 密码安全：哈希与比对正确 8 分；强度与统一提示 6 分；成本因子说明合理 6 分。
- JWT 实现：签发与校验 8 分；算法与声明约束 7 分；载荷安全 5 分。
- 刷新与撤销：刷新链路 8 分；注销 6 分；全端下线 6 分。
- 防盗取与防重放：Cookie 属性 5 分；幂等实现 5 分。
- 证据与报告：场景覆盖 8 分；结论准确 7 分。
- 工程规范：目录与配置 8 分；可复现与可读性 7 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过：

1. 数据库、日志或提交文件中出现明文密码。
2. 使用 MD5、SHA-1、SHA-256 直接哈希密码，或密码未加盐。
3. JWT 校验未限制算法，或接受 `alg: none` 令牌。
4. 提交真实密钥、访问令牌或其他真实凭证；密钥硬编码在源码中。
5. 注销仅在前端删除令牌，服务端无任何撤销措施且无法解释风险。
6. 服务无法按照 README 在评审环境运行，或核心接口状态码使用错误。
7. 只提交截图，没有可运行代码与请求证据。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 区分认证与授权 | 401/403 使用记录与现场解释 |
| 密码不明文存储 | 数据库字段展示与 security-report.md |
| 理解哈希、加密与加盐 | 两次注册哈希不同的证据与设计说明 |
| 正确使用 bcrypt/argon2/scrypt | password.js 代码与参数说明 |
| 掌握 JWT 结构与签发校验 | 令牌解码、算法白名单与受保护路由 |
| 实现过期刷新与会话选型 | 刷新接口证据与方案对比表 |
| 理解撤销、盗取与重放 | 注销、全端下线与幂等演练记录 |

### 提交前自检

- [ ] 六个学习目标均有对应证据。
- [ ] 数据库中只有加盐哈希，没有明文密码。
- [ ] JWT 校验显式指定算法与签发者。
- [ ] 访问令牌有效期不超过 15 分钟，刷新令牌使用独立密钥。
- [ ] 注销与全端下线均有服务端逻辑。
- [ ] `.env.example` 只含占位符，仓库历史改动中不含真实 Secret。
- [ ] 报告区分“已阻止攻击”与“缩小有效窗口”。
- [ ] README 能指导其他学员在本机复现全部演示。
