# Opaque Cookie 会话、Origin 与 CSRF

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | opaque session、sid/CSRF 摘要、Cookie 策略、Origin/CSRF guard 与退出撤销 |
| 练习目录 | `market-api-lab/` |
| 最小案例 | **in-memory Map session store**，不代表多副本或持久化 |
| 真实集成 | PostgreSQL sessions + HTTP Set-Cookie/重放测试 |
| 浏览器主线 | 同源 HttpOnly Cookie；unsafe 请求校验精确 Origin 和 session 绑定 CSRF |
| 安全边界 | sid、Cookie、CSRF 原文、连接串不进入日志、响应错误或 Git |
| 环境差异 | 生产 HTTPS 使用 Secure/`__Host-`；本地 HTTP 必须明确降低后的差异 |

## 1. 任务背景

登录成功后，浏览器需要在后续请求中证明同一会话。若每次发送密码，泄漏面和验证成本都会扩大；
若把可预测 userId 放进 Cookie，攻击者可伪造身份。本课使用 opaque sid：32 字节随机值本身没有
业务含义，服务端用其摘要查找 session，再读取可信 userId、role 和过期时间。

浏览器会自动随匹配请求发送 Cookie。这带来便利，也带来 CSRF：攻击站点可以诱导受害者浏览器
向邻里集市发写请求。HttpOnly 只阻止普通 JavaScript 读取 sid，不阻止浏览器发送 Cookie；
SameSite 只是一层浏览器策略，也不能覆盖所有同站子域和产品架构。因此 unsafe 请求还要校验
精确 Origin 与绑定当前 session 的 CSRF token。

## 2. 学习目标

完成本课后，你能够：

1. 生成至少 32 随机字节的 opaque sid 和独立 CSRF token；
2. 数据库/存储只保存 sid 与 CSRF 摘要，不保存可重放原文；
3. 配置 HttpOnly、Secure、SameSite、Path、Max-Age/Expires；
4. 解释 `__Host-` Cookie 的前提和本地 HTTP 差异；
5. 对 unsafe 请求同时验证精确 Origin 和 session 绑定 token；
6. 在登录、提权和密码变化时轮换 session；
7. 在 logout 时删除服务端 session，并用相同属性清 Cookie；
8. 区分 Cookie、CORS、SameSite、CSRF、XSS 与 TLS 的责任。

## 3. 预备知识

先完成[密码哈希与账号边界](01-password-hashing-account-boundaries.md)和第 1 章 HTTP 生命周期。
创建：

```bash
cd market-api-lab
mkdir -p src/auth test
```

本地示例 Origin 使用 `http://localhost:5173`，API 使用同源代理或
`http://localhost:3000`。`localhost` 与 `127.0.0.1` 是不同 host，端口不同也是不同 origin；
配置必须与浏览器实际地址精确一致。

所有 curl 示例只用 `/tmp/market-cookie.jar`，结束后删除。Cookie jar 是凭据文件，不提交、不贴
到 Issue、不上传。

## 4. 核心理论

### 4.1 Opaque sid 只有随机性和查找用途

创建：

```text
raw sid (32 random bytes, base64url) -> 发给浏览器一次
SHA-256("session:" + raw sid)        -> 存数据库
```

高熵随机 sid 不需要密码级慢 hash；数据库泄漏后暴力猜测 256 位随机 token 不现实。加固定域分隔
前缀避免同一 token 摘要在不同用途混用。sid 不能包含 userId/role，也不能由时间戳或递增 ID 生成。

### 4.2 Cookie 属性分别做什么

| 属性 | 作用 | 不解决 |
| --- | --- | --- |
| `HttpOnly` | 普通 JS 不能读取 Cookie | XSS 代用户发请求 |
| `Secure` | 只经 HTTPS 发送 | 服务端授权 |
| `SameSite=Lax` | 减少部分跨站携带 | 所有 CSRF/同站子域风险 |
| `Path=/` | 明确发送范围和删除匹配 | host 隔离 |
| 无 `Domain` | host-only Cookie | 同 host 其他路径应用 |
| `Max-Age/Expires` | 浏览器保存期限 | 服务端撤销/过期查询 |
| `__Host-` 前缀 | 强制 Secure、Path=/、无 Domain | CSRF 与 XSS |

生产 Cookie 可命名 `__Host-sid`。本地纯 HTTP 无法合法使用 Secure 的 `__Host-`，应明确使用
开发名 `sid`，不要通过关闭生产 Secure 来让同一配置“兼容”。

### 4.3 浏览器期限与服务端期限都要检查

浏览器可能保留、恢复或被攻击者重放旧值。服务端每次查 session 都要满足：

```sql
revoked_at IS NULL AND expires_at > now()
```

本课采用 8 小时绝对过期，不自动滑动续期。若产品采用 idle expiry，要独立设计写放大、并发刷新
和最终绝对期限。

### 4.4 Origin、CSRF token 与 SameSite 是纵深防御

unsafe 方法（POST/PUT/PATCH/DELETE）：

1. `Origin` 必须精确属于服务端 allowlist；
2. 当前 session 必须有效；
3. `X-CSRF-Token` 摘要必须与该 session 记录匹配；
4. Content-Type/DTO 仍正常校验。

登录/注册尚无 session，仍校验 Origin 并只接受预期 JSON。缺失 Origin 的浏览器写请求默认拒绝；
命令行或服务到服务若需要访问，应使用独立 Bearer/mTLS 策略和路径，不为 curl 关闭浏览器门禁。

### 4.5 CORS 不是 CSRF 防护

CORS 控制浏览器是否允许前端脚本读取跨源响应，某些“简单请求”仍可能被发送。带凭据跨源时服务端
必须返回明确 Origin 和 `Access-Control-Allow-Credentials: true`，不能用 `*`。即使 CORS 正确，
仍需 CSRF 策略。

### 4.6 CSRF 不防 XSS

同步 token 会返回给同源前端并保存在内存；XSS 可能读取 token 或直接发同源请求。CSRF 解决跨站
诱导，不解决脚本注入。还需输出编码、CSP、依赖治理和禁止不可信 HTML。

### 4.7 session rotation 与 fixation

登录成功不沿用登录前 sid；每次生成新 session。权限提升、密码修改和高风险操作后也应轮换或撤销
规定范围会话。logout 同时删除服务器记录和清 Cookie；只清浏览器会让旧 sid 仍可重放。

## 5. 元素、属性、API 或配置清单

| API / 字段 | 用法 | 可观察证据 | 边界 |
| --- | --- | --- | --- |
| `randomBytes(32)` | sid/CSRF 各自生成 | 长度与两者不同 | 不打印原文 |
| `createHash("sha256")` | 高熵 token 摘要 | store 中只有摘要 | 不用于密码 |
| `timingSafeEqual` | CSRF 摘要比较 | 等长 Buffer | Origin 仍要检查 |
| `token_hash` | session 主键 | 查找/撤销 | 不返回客户端 |
| `user_id` | 可信 actor 来源 | JOIN users | 不从 body 取 |
| `expires_at` | 绝对服务端过期 | 过期后 401 | Cookie 到期不够 |
| `revoked_at`/DELETE | 撤销 | 旧 sid 401 | 需多设备策略 |
| `Set-Cookie` | 传 sid | 属性完整 | 不放 CSRF token |
| `Origin` | 请求源 | 精确 URL 比较 | 不用 endsWith |
| `X-CSRF-Token` | 用户意图 token | 绑定 session | 不存 localStorage |
| `Vary: Origin` | 跨源缓存分离 | 响应头 | 只在 CORS 场景 |

## 6. 最小可运行案例

本案例使用**进程内 Map**。它可观察 token 摘要、过期、Origin/CSRF 和撤销，但进程重启会丢失，
多副本不共享，不能作为真实后端会话方案。

### 6.1 Session 模块

创建 `src/auth/in-memory-session.mjs`：

```js
import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const eightHoursMs = 8 * 60 * 60 * 1000;

function token() {
  return randomBytes(32).toString("base64url");
}

function digest(kind, raw) {
  return createHash("sha256").update(`${kind}:${raw}`).digest();
}

function sameDigest(expected, actual) {
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createInMemorySessionStore({
  now = () => new Date(),
  ttlMs = eightHoursMs,
} = {}) {
  const records = new Map();

  return {
    create(user) {
      const sid = token();
      const csrfToken = token();
      const tokenHash = digest("session", sid).toString("hex");
      records.set(tokenHash, {
        tokenHash,
        user: { id: user.id, role: user.role },
        csrfHash: digest("csrf", csrfToken),
        expiresAt: new Date(now().getTime() + ttlMs),
      });
      return { sid, csrfToken };
    },

    authenticate(sid) {
      if (typeof sid !== "string" || sid.length === 0) return null;
      const tokenHash = digest("session", sid).toString("hex");
      const record = records.get(tokenHash);
      if (!record || record.expiresAt <= now()) return null;
      return { ...record.user, sessionTokenHash: tokenHash };
    },

    authorizeUnsafe({ sid, origin, csrfToken, allowedOrigin }) {
      if (origin !== allowedOrigin) return { allowed: false, code: "CSRF" };
      const actor = this.authenticate(sid);
      if (!actor) return { allowed: false, code: "UNAUTHENTICATED" };
      const record = records.get(actor.sessionTokenHash);
      if (typeof csrfToken !== "string") {
        return { allowed: false, code: "CSRF" };
      }
      const actual = digest("csrf", csrfToken);
      if (!sameDigest(record.csrfHash, actual)) {
        return { allowed: false, code: "CSRF" };
      }
      return { allowed: true, actor };
    },

    revoke(sid) {
      if (typeof sid !== "string") return;
      records.delete(digest("session", sid).toString("hex"));
    },

    debugSnapshot() {
      return [...records.values()].map((record) => ({
        tokenHash: record.tokenHash,
        user: record.user,
        expiresAt: record.expiresAt.toISOString(),
      }));
    },
  };
}

export function serializeSessionCookie(sid, {
  production,
  expiresAt,
}) {
  const name = production ? "__Host-sid" : "sid";
  const attributes = [
    `${name}=${sid}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
    `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))}`,
  ];
  if (production) attributes.push("Secure");
  return attributes.join("; ");
}

export function clearSessionCookie({ production }) {
  const name = production ? "__Host-sid" : "sid";
  return [
    `${name}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    ...(production ? ["Secure"] : []),
  ].join("; ");
}
```

`debugSnapshot` 只为教学测试展示摘要，不应成为生产管理接口。Cookie 序列化在真实项目可使用审查
过的库；无论使用库还是手写，都要验收最终响应头。

### 6.2 可观察测试

创建 `test/in-memory-session.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  clearSessionCookie,
  createInMemorySessionStore,
  serializeSessionCookie,
} from "../src/auth/in-memory-session.mjs";

const allowedOrigin = "http://localhost:5173";

test("stores only token digests and authenticates before expiry", () => {
  const now = new Date("2026-10-11T08:00:00.000Z");
  const store = createInMemorySessionStore({ now: () => now });
  const session = store.create({ id: "user-1", role: "user" });
  const snapshot = store.debugSnapshot();
  assert.equal(snapshot.length, 1);
  assert.equal(JSON.stringify(snapshot).includes(session.sid), false);
  assert.equal(JSON.stringify(snapshot).includes(session.csrfToken), false);
  assert.equal(store.authenticate(session.sid).id, "user-1");
});

test("requires exact Origin and the current session csrf token", () => {
  const store = createInMemorySessionStore();
  const first = store.create({ id: "user-1", role: "user" });
  const second = store.create({ id: "user-1", role: "user" });

  assert.equal(store.authorizeUnsafe({
    sid: first.sid,
    origin: "https://evil.example",
    csrfToken: first.csrfToken,
    allowedOrigin,
  }).code, "CSRF");
  assert.equal(store.authorizeUnsafe({
    sid: first.sid,
    origin: allowedOrigin,
    csrfToken: second.csrfToken,
    allowedOrigin,
  }).code, "CSRF");
  assert.equal(store.authorizeUnsafe({
    sid: first.sid,
    origin: allowedOrigin,
    csrfToken: first.csrfToken,
    allowedOrigin,
  }).allowed, true);
});

test("expires and revokes server-side state", () => {
  let now = new Date("2026-10-11T08:00:00.000Z");
  const store = createInMemorySessionStore({
    now: () => now,
    ttlMs: 1000,
  });
  const expired = store.create({ id: "user-1", role: "user" });
  now = new Date("2026-10-11T08:00:01.001Z");
  assert.equal(store.authenticate(expired.sid), null);

  const active = store.create({ id: "user-1", role: "user" });
  store.revoke(active.sid);
  assert.equal(store.authenticate(active.sid), null);
});

test("uses strict production cookie attributes and matching deletion", () => {
  const header = serializeSessionCookie("opaque-token", {
    production: true,
    expiresAt: new Date(Date.now() + 60_000),
  });
  assert.match(header, /^__Host-sid=/);
  for (const attribute of ["HttpOnly", "Secure", "Path=/", "SameSite=Lax"]) {
    assert.match(header, new RegExp(attribute));
  }
  const cleared = clearSessionCookie({ production: true });
  assert.match(cleared, /^__Host-sid=/);
  assert.match(cleared, /Max-Age=0/);
  assert.match(cleared, /Secure/);
});
```

运行：

```bash
node --test test/in-memory-session.test.mjs
```

预期 4 条测试通过。当前日期由部分测试注入；Cookie 测试只断言属性，不快照随机 token。

### 6.3 从内存模型逐步扩展

1. 先确认 store 中没有 raw sid/CSRF。
2. 增加绝对过期与 revoke。
3. 增加精确 Origin 与 session 绑定 CSRF。
4. 检查生产/开发 Cookie 差异和清除属性。
5. 最后把 Map 替换为 PostgreSQL 仓储，并通过真实 HTTP 重放验收。

## 7. 邻里集市集成案例

### 7.1 PostgreSQL session schema

正式迁移可采用：

```sql
CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CHECK (expires_at > created_at)
);

CREATE INDEX sessions_user_id ON sessions(user_id);
CREATE INDEX sessions_expiry ON sessions(expires_at);
```

若第 10 章现有迁移字段不同，应通过新迁移演进，不手改已应用迁移。所有时间存 UTC
`timestamptz`，API 输出 ISO 8601。

### 7.2 登录与认证查询

登录成功后：

```sql
INSERT INTO sessions(token_hash, user_id, csrf_hash, expires_at)
VALUES ($1, $2, $3, $4);
```

认证：

```sql
SELECT u.id, u.email, u.role, s.csrf_hash, s.expires_at
FROM sessions s
JOIN users u ON u.id = s.user_id
WHERE s.token_hash = $1
  AND s.revoked_at IS NULL
  AND s.expires_at > now();
```

只向请求上下文放 `{id,email,role,sessionTokenHash}`；不放 password_hash 或 raw sid。

### 7.3 HTTP 生命周期验收

启动第 10 章完整 API 后，使用虚构账号。示例中的密码是占位测试值：

```bash
curl -i -c /tmp/market-cookie.jar \
  -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Origin: http://localhost:5173' \
  -H 'Content-Type: application/json' \
  --data '{"email":"seller@example.test","password":"REPLACE_TEST_PASSWORD"}'
```

检查 `Set-Cookie` 属性和响应中的 CSRF token；不得把响应粘贴到共享日志。随后：

```bash
curl -i -b /tmp/market-cookie.jar \
  http://localhost:3000/api/v1/auth/me
```

`me` 只返回公开用户，不返回 sid、摘要或 CSRF 原文。页面刷新丢失内存 token 时，可调用一个只对
有效 session 开放、要求精确 Origin 的 `/auth/csrf/refresh`，让服务端生成新 token、更新当前
session 的 `csrf_hash` 并只在本次响应返回原文。unsafe 请求分别测试：

```bash
curl -i -b /tmp/market-cookie.jar \
  -X POST http://localhost:3000/api/v1/auth/logout \
  -H 'Origin: https://evil.example' \
  -H 'X-CSRF-Token: REPLACE_WITH_RUNTIME_TOKEN'

curl -i -b /tmp/market-cookie.jar \
  -X POST http://localhost:3000/api/v1/auth/logout \
  -H 'Origin: http://localhost:5173'
```

第一条应 403 CSRF；第二条缺 token 也应 403。使用运行时真实 token 后应成功，服务端 session 被
删除/撤销并返回清 Cookie。再用旧 jar 请求 `me` 应 401。最后：

```bash
rm -f /tmp/market-cookie.jar
```

这些是运行步骤与预期，不是本教材已观察结果。真实证据还需查询对应 session 已不存在/已撤销，
且日志扫描不含 sid/CSRF。

### 7.4 rotation

登录时先撤销客户端提交的旧 sid（若存在且有效），再创建新 sid；不要复用匿名或登录前 session。
密码修改后在同一事务更新 hash 并删除规定范围 sessions，然后为当前设备创建新 session。若要求
“退出全部设备”，按 user_id 撤销全部并清当前 Cookie。

## 8. 常见错误与排查路径

### 明确错误：只清 Cookie，不删服务器 session

| 五段 | 记录 |
| --- | --- |
| 现象 | 浏览器界面显示退出，但复制的旧 Cookie 仍能调用 `/auth/me` |
| 证据 | sessions 行仍有效，旧 sid 摘要仍命中 |
| 原因 | logout 只发送过期 Cookie，没有撤销服务端状态 |
| 修复 | 先按当前 token_hash 删除/撤销 session，再返回匹配属性的清 Cookie |
| 复验 | 旧 jar 重放得到 401，session 查询无有效行 |

### 用 `endsWith` 验证 Origin

`https://evil-example.com` 或构造子域可能误匹配。用 URL 解析后的完整 origin 与服务端 allowlist
精确比较，包括 scheme、host、port。

### 生产关闭 Secure 解决本地问题

本地 HTTP 不发送 Secure Cookie 是预期。使用独立开发 Cookie 配置；生产强制 HTTPS/Secure，
不能共享一个自动降级配置。

### 把 sid 放 localStorage

任何同源脚本可读取 localStorage，XSS 可直接窃取 sid。主线使用 HttpOnly Cookie；这仍不能防
XSS 代发请求。

### 认为 SameSite=Lax 已经没有 CSRF

同站子域、浏览器行为和产品跳转会改变边界。保留 Origin + token；实际架构可在威胁建模后采用
更严格 SameSite，但不删除其他证据。

## 9. 课后题

**问题 1：为什么 sid 摘要可用 SHA-256，密码不可以？**

参考答案：sid 是 256 位高熵随机值，无法进行人类字典猜测；密码熵低，需要高成本派生。

**问题 2：HttpOnly 是否阻止 CSRF？**

参考答案：不阻止。它限制 JS 读取 Cookie，浏览器仍会自动发送；CSRF 需 Origin/token/SameSite
等策略。

**问题 3：CORS 设置正确是否可删除 CSRF token？**

参考答案：不能直接推出。CORS 主要控制读取响应，部分请求仍可发送；浏览器 Cookie 自动携带的
写操作仍要独立防护。

**问题 4：为什么 logout 清 Cookie 要使用相同 Path/Secure 规则？**

参考答案：Cookie 的匹配属性决定删除的是哪一枚；属性不匹配可能留下原 Cookie。

## 10. 实践练习

### 基础：绝对过期

注入 fake clock，测试过期前 1ms 有效、过期时刻无效。可判定标准：比较使用服务端时间；返回
401；不依赖浏览器 Cookie 是否还在。

### 进阶：退出所有设备

实现按 user_id 撤销全部 sessions。可判定标准：操作本身先通过当前 session + Origin + CSRF；
两个设备旧 sid 均 401；当前响应清 Cookie；数据库无有效 session。

### 故障注入：跨 session CSRF

创建同一用户两个 session，把 A 的 sid 与 B 的 csrfToken 组合。测试必须先 403；若错误实现只按
userId 存一个 token 会意外通过。修复为 csrfHash 绑定具体 token_hash，再复验正常 A/A、B/B。

## 11. 阶段验收

- [ ] sid/CSRF 各用至少 32 随机字节且彼此独立。
- [ ] store/数据库只保存域分隔摘要，不保存 raw sid。
- [ ] 生产 Cookie 为 HttpOnly、Secure、host-only、Path=/，SameSite 明确。
- [ ] 本地 HTTP Cookie 降级与生产配置分开，不关闭生产 Secure。
- [ ] 每次认证检查服务端过期/撤销，不只信浏览器期限。
- [ ] unsafe 请求同时检查精确 Origin、有效 session 和绑定 token。
- [ ] 登录/注册前写操作也有 Origin 与 Content-Type 策略。
- [ ] logout 撤销服务端记录并匹配属性清 Cookie，旧值重放 401。
- [ ] 登录、提权和密码变化按策略轮换/撤销。
- [ ] Map 测试没有被称为 PostgreSQL、多副本或重启证据。
- [ ] 日志、响应、快照和 Git 不含 sid/Cookie/CSRF 原文。

## 12. 常见问题

**CSRF token 放哪里？**

登录响应只返回一次；页面刷新后可通过要求有效 session 与精确 Origin 的 CSRF refresh 端点轮换
并取得新 token。前端保存在运行时内存并随 unsafe 请求放自定义 header；不把 sid 暴露给 JS，
也不把 CSRF token 当身份凭据。若选择数据库保存 token 原文并由 `/auth/me` 返回，必须明确其
泄漏边界，不能同时声称数据库只保存摘要。

**session 表需要定期清理吗？**

需要按 expires/revoked 批量清理以控制体积，但认证查询本身必须过滤失效记录，不能依赖清理任务
准时运行来保证安全。

**跨源 SPA 怎么办？**

优先同源反向代理。确需跨源时明确 allowlist、credentials、Secure/SameSite、预检、Origin 和
CSRF；浏览器隐私策略还可能限制第三方 Cookie。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [MDN Set-Cookie](https://developer.mozilla.org/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN Origin](https://developer.mozilla.org/docs/Web/HTTP/Headers/Origin)
- [MDN CORS](https://developer.mozilla.org/docs/Web/HTTP/CORS)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Node.js crypto.randomBytes](https://nodejs.org/api/crypto.html#cryptorandombytessize-callback)

## 我现在能做到什么

我能创建高熵 opaque session、只持久化摘要，正确设置并清除 Cookie，用精确 Origin 和 session
绑定 CSRF 保护写请求，并通过过期、撤销和旧 Cookie 重放证据验证完整生命周期。

## 单元导航

[本章入口](../06-auth-sessions-rbac.md) ·
[上一课：密码哈希与账号边界](01-password-hashing-account-boundaries.md) ·
[下一课：认证、对象授权与 RBAC](03-authentication-object-authorization-rbac.md)
