# 密码哈希与账号生命周期边界

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 带版本/参数的 scrypt 哈希、验证器、dummy hash 登录路径与防枚举测试 |
| 练习目录 | `market-api-lab/` |
| 运行环境 | Node.js 24 LTS，标准库异步 `crypto.scrypt` |
| 最小证据 | 随机盐、正确/错误密码、损坏格式、参数升级测试 |
| 集成标签 | 账号仓储测试可用 **in-memory fake**；真实账号持久化必须另有 PostgreSQL 证据 |
| 敏感边界 | 密码、hash、reset token 和完整登录 body 不进入日志、响应、快照或 Git |
| 防枚举目标 | 不存在账号与错误密码使用同一公开响应，并都执行有效 scrypt 验证路径 |

## 1. 任务背景

密码不是需要恢复的资料，而是需要验证的秘密。可逆加密意味着持有解密密钥的人可批量恢复全部
密码；普通 SHA-256 又过快，泄漏后攻击者可高速猜测。密码存储需要随机盐和专门的高成本密码
派生函数，使每次猜测消耗可调 CPU/内存。

“用了 scrypt”仍不够。系统必须保存算法版本和参数，才能未来提高成本；限制输入资源，避免超长
密码造成拒绝服务；用异步 API，避免阻塞事件循环；不存在账号时仍执行相近的派生路径，降低根据
状态和时间枚举账号的风险。

## 2. 学习目标

完成本课后，你能够：

1. 解释随机盐、工作因子、内存成本和 pepper 的不同职责；
2. 用 Node 异步 scrypt 生成带版本与参数的自描述存储格式；
3. 用 `timingSafeEqual` 比较等长派生结果；
4. 区分注册密码政策与登录验证路径；
5. 对不存在账号使用固定有效 dummy hash，而不是提前返回；
6. 在参数升级时登录后 rehash，不要求恢复原密码；
7. 设计修改密码、重置密码和会话撤销的生命周期边界。

## 3. 预备知识

创建练习目录：

```bash
cd market-api-lab
mkdir -p src/auth test scripts
node --version
```

本课只使用 Node 标准库，不新增原生密码依赖。生产选择 Argon2id、scrypt 或其他算法时，应以组织
安全基线、当前官方资料和实际服务器 benchmark 为准；不能把教材参数照搬成永久结论。

示例密码只用于自动测试：

```text
correct horse battery staple (example only)
```

不要在终端命令中放真实密码，因为 shell history、进程参数和 CI 日志可能保存它。

## 4. 核心理论

### 4.1 哈希、盐和工作因子

每个账号使用新的随机盐：

```text
derived = scrypt(password, randomSalt, parameters)
stored = algorithm + version + parameters + salt + derived
```

相同密码因盐不同得到不同结果，攻击者不能用一张预计算表直接匹配所有账号。盐不需要保密，可与
hash 同存。工作因子提高每次猜测成本，必须在目标硬件上测量登录吞吐和延迟。

### 4.2 pepper 是可选的另一层秘密

pepper 是服务端秘密，不与数据库 hash 同存，可降低“只有数据库泄漏”时的风险；它带来密钥轮换、
灾难恢复和多版本验证复杂度。本课不引入 pepper，避免把没有密钥管理的字符串常量冒充安全机制。
若采用，必须来自秘密管理系统并设计版本/轮换。

### 4.3 存储格式必须自描述

本课格式：

```text
scrypt$v=1$N=32768,r=8,p=1$<salt-base64url>$<key-base64url>
```

解析器只接受允许参数和精确字段，防止损坏数据库值触发巨大内存分配。未来提升 N 后，验证旧
hash 仍按旧参数；成功登录后生成新格式并原子更新。

### 4.4 注册校验与登录验证不同

注册可要求最小长度、最大字节数和阻止常见泄漏密码。不要静默 trim 或 Unicode normalize 密码，
否则用户输入的秘密被改变；邮箱等标识符则可按产品规则规范化。

登录要验证用户提供的原始密码。过大的输入可在账号查询前统一拒绝，以限制资源；有效范围内，不
存在账号也要对 dummy hash 执行 scrypt。公开响应统一为：

```json
{"code":"INVALID_CREDENTIALS","message":"邮箱或密码错误"}
```

这只能降低简单枚举。数据库缓存、网络、限流、邮件流程等仍可能产生侧信道，需要整体评估。

### 4.5 常数时间比较有前提

`timingSafeEqual` 要求两个 Buffer 长度相同。先严格解析存储格式和派生长度，再比较；不能在长度
不同时调用后异常，也不能用普通字符串 `===` 作为密码结果比较。

### 4.6 密码生命周期牵动会话

| 事件 | 密码动作 | 会话动作 |
| --- | --- | --- |
| 注册 | 生成当前参数 hash | 可要求重新登录或创建新会话 |
| 登录成功、参数旧 | 重新 hash 并更新 | 轮换 session ID |
| 修改密码 | 先验证当前密码，再写新 hash | 撤销其他/全部会话 |
| 忘记密码 | 单次、短期、高熵 reset token | 成功后撤销全部旧会话 |
| 账号冻结 | hash 不需可逆 | 拒绝登录并撤销会话 |

reset token 也不能明文长期存储；可像 session token 一样保存摘要、用途和过期时间。

## 5. 元素、属性、API 或配置清单

| API / 配置 | 本课用法 | 可观察证据 | 边界 |
| --- | --- | --- | --- |
| `randomBytes(16)` | 每次生成盐 | 同密码两次 hash 不同 | 盐不等于 pepper |
| `scrypt` async | 派生 64 字节 key | 正确/错误验证 | 参数需基准测试 |
| `N/r/p` | CPU/内存/并行参数 | 编码进存储格式 | 只允许受控范围 |
| `maxmem` | 限制单次内存 | 参数组合可执行 | 不等于全服务容量 |
| `Buffer.byteLength` | 限制 UTF-8 字节 | 超长输入提前拒绝 | 不静默截断 |
| `timingSafeEqual` | 比较等长 key | 错误密码 false | 不隐藏所有侧信道 |
| dummy hash | 不存在账号验证 | derive 被调用 | 不是共享用户密码 |
| `needsRehash` | 检测旧参数 | 登录后升级 | 更新应处理并发 |
| rate limit | 限制在线猜测 | 429/退避策略 | 不替代安全存储 |
| `Error.cause` | 内部根因 | 脱敏事件 | 不返回 hash/detail |

## 6. 最小可运行案例

### 6.1 密码模块

创建 `src/auth/password.mjs`：

```js
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
const CURRENT = Object.freeze({
  version: 1,
  N: 32768,
  r: 8,
  p: 1,
  keyLength: 64,
  maxmem: 128 * 1024 * 1024,
});

function validateRegistrationPassword(password) {
  if (typeof password !== "string") throw new Error("password must be a string");
  const codePoints = [...password].length;
  const bytes = Buffer.byteLength(password, "utf8");
  if (codePoints < 12 || codePoints > 128 || bytes > 512) {
    throw new Error("password must be 12..128 code points and at most 512 bytes");
  }
}

function parse(encoded) {
  if (typeof encoded !== "string") throw new Error("invalid password record");
  const [algorithm, versionPart, paramsPart, saltPart, keyPart, extra] =
    encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    versionPart !== "v=1" ||
    !paramsPart ||
    !saltPart ||
    !keyPart ||
    extra !== undefined
  ) {
    throw new Error("invalid password record");
  }
  const match = /^N=(\d+),r=(\d+),p=(\d+)$/.exec(paramsPart);
  if (!match) throw new Error("invalid password parameters");
  const params = {
    N: Number(match[1]),
    r: Number(match[2]),
    p: Number(match[3]),
  };
  const allowedN = new Set([16384, 32768, 65536]);
  if (!allowedN.has(params.N) || params.r !== 8 || params.p !== 1) {
    throw new Error("unsupported password parameters");
  }
  const salt = Buffer.from(saltPart, "base64url");
  const expected = Buffer.from(keyPart, "base64url");
  if (salt.length !== 16 || expected.length !== CURRENT.keyLength) {
    throw new Error("invalid password record lengths");
  }
  return { ...params, salt, expected };
}

async function deriveKey(password, parsed) {
  if (typeof password !== "string" || Buffer.byteLength(password, "utf8") > 512) {
    throw new Error("invalid password input");
  }
  return derive(password, parsed.salt, CURRENT.keyLength, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    maxmem: CURRENT.maxmem,
  });
}

export async function hashPassword(password) {
  validateRegistrationPassword(password);
  const salt = randomBytes(16);
  const key = await derive(password, salt, CURRENT.keyLength, {
    N: CURRENT.N,
    r: CURRENT.r,
    p: CURRENT.p,
    maxmem: CURRENT.maxmem,
  });
  return [
    "scrypt",
    `v=${CURRENT.version}`,
    `N=${CURRENT.N},r=${CURRENT.r},p=${CURRENT.p}`,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password, encoded) {
  let parsed;
  try {
    parsed = parse(encoded);
  } catch {
    return false;
  }
  let actual;
  try {
    actual = await deriveKey(password, parsed);
  } catch {
    return false;
  }
  return timingSafeEqual(parsed.expected, actual);
}

export function needsRehash(encoded) {
  try {
    const parsed = parse(encoded);
    return parsed.N !== CURRENT.N || parsed.r !== CURRENT.r || parsed.p !== CURRENT.p;
  } catch {
    return true;
  }
}
```

这里对数据库损坏格式返回 false；调用方应另记脱敏安全事件，不能在响应中区分“hash 损坏”和
“密码错误”。

### 6.2 可判定测试

创建 `test/password.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  needsRehash,
  verifyPassword,
} from "../src/auth/password.mjs";

const password = "example-only-long-password";

test("uses a fresh salt and verifies only the correct password", async () => {
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong-password-value", first), false);
});

test("rejects registration resource abuse", async () => {
  await assert.rejects(hashPassword("short"), /12\.\.128/);
  await assert.rejects(hashPassword("密".repeat(200)), /12\.\.128/);
});

test("treats malformed or unsupported records as invalid", async () => {
  assert.equal(await verifyPassword(password, "sha256$bad"), false);
  assert.equal(needsRehash("sha256$bad"), true);
});

test("recognizes the current parameter set", async () => {
  const encoded = await hashPassword(password);
  assert.equal(needsRehash(encoded), false);
});
```

运行：

```bash
node --test test/password.test.mjs
```

预期 4 条测试通过。测试不打印 hash；测试报告里也不应附带输入秘密。

### 6.3 参数基准而非拍脑袋

创建 `scripts/password-benchmark.mjs`：

```js
import { performance } from "node:perf_hooks";
import { hashPassword, verifyPassword } from "../src/auth/password.mjs";

const sample = "benchmark-only-long-password";
const started = performance.now();
const encoded = await hashPassword(sample);
const hashedAt = performance.now();
const valid = await verifyPassword(sample, encoded);
const ended = performance.now();

console.log(JSON.stringify({
  event: "password_benchmark",
  hashMs: Math.round(hashedAt - started),
  verifyMs: Math.round(ended - hashedAt),
  valid,
}));
```

运行 `node scripts/password-benchmark.mjs`，在目标服务器类型上多次测量并做并发容量实验。不要把
某台开发机的一次毫秒数写成全局 SLO，也不要输出 encoded。

## 7. 邻里集市集成案例

### 7.1 账号服务与 dummy hash

账号仓储契约：

```js
// findLoginRecordByEmail(email) -> { id, email, role, passwordHash } | null
// updatePasswordHashIfCurrent(id, oldHash, newHash) -> boolean
```

应用启动时生成一次 dummy hash，或从安全构建流程提供与当前参数匹配的固定 dummy hash。不能
为每次不存在账号重新生成随机 dummy，因为这会额外做两次派生并形成明显差异。

创建 `src/auth/account-service.mjs`：

```js
import {
  hashPassword,
  needsRehash,
  verifyPassword,
} from "./password.mjs";

export async function createAccountService({ accounts, dummyPasswordHash }) {
  if (!dummyPasswordHash) throw new Error("dummyPasswordHash is required");

  return {
    async authenticate(emailInput, password) {
      const email = String(emailInput).trim().toLowerCase();
      const account = await accounts.findLoginRecordByEmail(email);
      const encoded = account?.passwordHash ?? dummyPasswordHash;
      const valid = await verifyPassword(password, encoded);

      if (!account || !valid) {
        const error = new Error("邮箱或密码错误");
        error.code = "INVALID_CREDENTIALS";
        error.status = 401;
        throw error;
      }

      if (needsRehash(account.passwordHash)) {
        const upgraded = await hashPassword(password);
        await accounts.updatePasswordHashIfCurrent(
          account.id,
          account.passwordHash,
          upgraded,
        );
      }

      return { id: account.id, email: account.email, role: account.role };
    },
  };
}
```

`updatePasswordHashIfCurrent` 是条件更新，防止并发密码修改被 rehash 覆盖。升级失败可记录并稍后
重试，但不能因此把正确登录变成泄漏内部状态的响应。

### 7.2 防枚举测试

测试仓储可使用**in-memory fake**，但要显式统计验证路径。最小判定：

```js
const publicError = (error) => ({
  status: error.status,
  code: error.code,
  message: error.message,
});

// wrong password 与 missing account 都应得到：
// { status: 401, code: "INVALID_CREDENTIALS", message: "邮箱或密码错误" }
```

集成测试还应通过注入的 password verifier 统计两个分支都调用一次 derive。不要断言两次耗时必须
精确相等；操作系统调度和数据库查询会波动。真实系统另加按账号与来源维度的速率限制、告警和
锁定策略，避免锁账号本身成为拒绝服务工具。

### 7.3 注册边界

注册顺序：

1. DTO allowlist 只接受 email/password，拒绝 `role/id/passwordHash`；
2. 规范化 email，验证密码资源边界；
3. 异步 hash；
4. INSERT 时 role 使用服务端默认 `user`；
5. `users_email_unique` 冲突按产品防枚举策略返回稳定响应；
6. 响应只含 public user，不含 hash。

测试数据库记录 hash 格式，不快照完整 hash 值；只断言以 `scrypt$v=1$` 开头且明文不出现。

## 8. 常见错误与排查路径

### 明确错误：直接 SHA-256

```js
const stored = createHash("sha256").update(password).digest("hex");
```

| 五段 | 记录 |
| --- | --- |
| 现象 | 功能测试能登录，但离线猜测成本极低，相同密码 hash 相同 |
| 证据 | 无随机盐、无工作参数，算法为高速通用 hash |
| 原因 | 把完整性哈希误作密码派生 |
| 修复 | 使用受支持的高成本密码算法、随机盐和版本化参数 |
| 复验 | 同密码两次存储值不同，正确/错误验证通过，benchmark 被记录 |

### 不存在账号立即返回

现象是 missing account 明显更快，且 verifier 调用次数为 0。修复为使用有效 dummy hash 执行同类
scrypt，再返回相同 401/code/message。

### 日志记录登录 body

现象是调试日志、APM breadcrumb 或错误对象含明文密码。修复请求日志 allowlist/字段脱敏，禁止
序列化 body；用 requestId 关联。复验扫描测试日志不含示例密码。

### 参数升级覆盖新密码

登录读旧 hash 后，用户同时修改密码，rehash 无条件 UPDATE 会覆盖新值。修复
`WHERE id=$1 AND password_hash=$2` 条件更新；0 行表示放弃本次升级。

### 同步密码派生阻塞事件循环

同步 API 会阻塞当前线程，放大并发登录延迟。使用异步 API并监控线程池/CPU；异步不代表成本消失，
仍需容量和限流。

## 9. 课后题

**问题 1：盐是否需要放进秘密管理系统？**

参考答案：不需要保密，应随机且每个 hash 独立，与 hash 同存。pepper 才是可选的全局/版本化秘密。

**问题 2：为什么不存在账号还要算一次 scrypt？**

参考答案：降低通过早返回和粗粒度耗时判断账号存在性的风险，并保持公开错误一致；它不消除全部
侧信道。

**问题 3：为何存储参数而不是只存 hash？**

参考答案：验证旧记录需要原参数，未来提高成本后可在成功登录时逐步 rehash。

**问题 4：可以把 128 字符之外直接截断吗？**

参考答案：不能静默改变秘密。注册明确拒绝，登录按同一资源边界处理并返回受控错误。

## 10. 实践练习

### 基础：dummy 路径计数

把 verifier 作为依赖注入账号服务，统计 wrong password 和 missing account 都调用一次。可判定
标准：两者公开响应完全相同；不存在分支使用 dummy hash；测试不比较脆弱毫秒值。

### 进阶：参数升级

在测试中生成较低 N 的允许旧记录，登录成功后条件更新为 CURRENT 参数。判定标准：正确密码才
升级；错误密码不更新；并发 hash 已变化时条件更新 0 行且不覆盖。

### 故障注入：损坏 hash

让仓储返回 `scrypt$v=1$bad`。判定标准：公开响应仍为 INVALID_CREDENTIALS；记录脱敏
`password_record_invalid` 事件和 account 内部 ID 的受控引用，不记录 hash；请求不崩溃。

## 11. 阶段验收

- [ ] 使用异步高成本密码算法，而非普通 hash 或可逆加密。
- [ ] 每次 hash 使用 16 字节随机盐，同密码结果不同。
- [ ] 存储格式包含算法、版本、N/r/p、盐和派生 key。
- [ ] 解析器限制参数/长度，防止损坏记录造成资源滥用。
- [ ] 比较前长度已验证，使用 timingSafeEqual。
- [ ] 注册政策不静默 trim/截断密码。
- [ ] 不存在账号与错误密码同公开 401/code/message，均执行 derive。
- [ ] 参数升级使用条件写，不覆盖并发新密码。
- [ ] 密码修改/重置会撤销规定范围的旧会话。
- [ ] 日志、响应、快照和 Git 不含密码/hash/token。
- [ ] in-memory 账号仓储没有被称为真实持久化证据。

## 12. 常见问题

**教材为什么不用 bcrypt？**

本课用 Node 内置 scrypt 减少原生依赖门槛，不表示 bcrypt 或 Argon2id 不可用。项目应按当前安全
基线、库维护状态、硬件与迁移能力选择。

**密码 hash 可以返回给管理员排查吗？**

不可以。hash 是敏感认证材料，离线攻击价值高。管理员只需要账号状态、算法版本和脱敏事件。

**是否应按字符类别强制大小写数字符号？**

长口令与泄漏密码检测通常比复杂组合规则更有价值。具体政策以当前组织标准为准，并避免阻止密码
管理器生成的高熵密码。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [Node.js crypto.scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback)
- [Node.js timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html)

## 我现在能做到什么

我能生成可升级、资源有界的 scrypt 密码记录，用 dummy hash 和统一公开错误降低账号枚举，并把
注册、登录 rehash、密码重置与会话撤销组织成不泄漏凭据的生命周期。

## 单元导航

[本章入口](../06-auth-sessions-rbac.md) ·
[下一课：Cookie 会话、Origin 与 CSRF](02-cookie-sessions-origin-csrf.md) ·
[后端卷目录](../README.md)
