# MP-09 一次性 code：服务端交换、重放与业务会话

## 任务卡

- 任务：将平台登录凭据与业务身份分开，构造可测试的服务端交换边界。
- 产出：独立后端实验 `auth-server.mjs`、`auth-server.test.mjs`。
- 运行：Node 22，`node --test auth-server.test.mjs`；可选本机 HTTP 服务。
- 证据：同 code 并发只调用一次上游、失败不复用 code、过期与撤销后 401。
- 边界：默认上游是明确的教学替身；测试不证明微信、抖音或支付宝登录成功。

## 1. 任务背景

`Taro.login()` 返回 code，不返回可信业务 userId。把 code 放入 storage 当 Token，
或者由客户端传 ownerId，都会绕过服务端身份验证。登录链路应是：
用户触发登录 → 平台给短期 code → 自有后端交换 → 平台身份映射业务用户 → 业务 Token。
平台会话和业务会话分别过期，不把一次性 code 当成长期凭据。

## 2. 学习目标

解释 code、平台 session_key、业务 Token 的不同职责；在异步上游调用前登记 code 消费；
验证上游响应；按平台与 AppID 隔离用户映射；实现撤销和服务端过期判断。

## 3. 预备知识

完成 [请求 parser](../04-network/01-request-parser-cancellation.md)。
本实验在个人目录 `auth-lab`，不导入 Taro，不需要依赖安装。它是后端代码，
绝不复制进 `src/` 或由小程序构建器引用。
本卷 Capstone 的虚构角色登录另见 [MP-23](../12-capstone/01-domain-service-tests.md#s7)。

<a id="s4"></a>
## 4. 核心理论

### 4.1 凭据边界

| 值 | 来源与持有人 | 用途 |
| --- | --- | --- |
| code | 平台客户端产生，仅送后端 | 一次性交换 |
| AppSecret | 平台后台，由服务器保管 | 服务器向平台鉴别应用 |
| platformSubject | 平台返回，服务器解析 | 业务用户唯一映射，不信客户端提供 |
| session_key | 平台返回，服务器私有 | 平台相关会话能力，不下发客户端 |
| accessToken | 业务服务器生成 | 调用本业务 API，过期与撤销均由服务器判断 |

code 不写访问日志、URL 查询串、错误截图或 analytics。后端发 Token 时返回
`userId/expiresAt` 只是方便 UI，客户端修改这些字段不会改变服务端身份。
AppID 公开但仍由受信后端配置决定，不让请求体任意指定交换对象。

### 4.2 原子消费与失败不确定

先哈希 code，再登记为 consumed，然后 await 上游。否则两个并发请求会同时调用上游。
上游超时可能已经消费 code，不能把记录删掉再用原 code；客户端重新获取 code。
平台身份映射必须唯一，避免重新获取 code 后重复创建同一业务用户。

下例 Map 仅保证单进程同步登记。生产必须用持久唯一约束或原子 SET NX，
短期 TTL 与平台 code 有效期、时钟偏差一致，并加速率限制。code 哈希也不能无限积累。

### 4.3 重放与幂等不可混用

预约重试复用业务幂等键；code 交换不复用已消费凭据。刷新会话若需要长期登录，
另建可撤销、轮换、检测旧刷新凭据重用的机制。本实验仅短期 accessToken，没有 refresh，
到期要求用户重新登录，不能自动延长 expiresAt。

## 5. 实验设计

注入 `upstream(platform, code)` 和 clock。固定教学上游不按 code 推断真实身份；
生产实现独立配置表，并从微信 code2Session 的 `openid` 等平台字段验证身份。
测试控制上游完成时点，不用 sleep 模拟并发。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `auth-server.mjs`：

```js
import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
export class AuthFailure extends Error {
  constructor(status, code) { super(code); this.status = status; this.code = code; }
}
export function createAuth({ upstream, now = Date.now, token = () => randomBytes(32).toString("base64url") }) {
  const consumed = new Set(), users = new Map(), sessions = new Map();
  const apps = { weapp: "teaching-weapp", tt: "teaching-tt", alipay: "teaching-alipay" };
  let serial = 0;
  return {
    async exchange(input) {
      if (!input || typeof input !== "object" || !Object.hasOwn(apps, input.platform) ||
        typeof input.code !== "string" || input.code.length < 1 || input.code.length > 512)
        throw new AuthFailure(400, "INVALID_EXCHANGE");
      const { platform, code } = input;
      const hash = createHash("sha256").update(`${platform}:${apps[platform]}:${code}`).digest("hex");
      if (consumed.has(hash)) throw new AuthFailure(409, "CODE_REPLAY");
      consumed.add(hash);
      let identity;
      try { identity = await upstream(platform, code); }
      catch { throw new AuthFailure(502, "PLATFORM_EXCHANGE_FAILED"); }
      if (!identity || typeof identity.subject !== "string" || !identity.subject.trim())
        throw new AuthFailure(502, "INVALID_PLATFORM_IDENTITY");
      const key = JSON.stringify([platform, apps[platform], identity.subject]);
      let userId = users.get(key);
      if (!userId) { userId = `user-${++serial}`; users.set(key, userId); }
      const access = token(), expires = now() + 15 * 60 * 1000;
      sessions.set(access, { userId, expires, platform });
      return { token: access, userId, expiresAt: new Date(expires).toISOString() };
    },
    authenticate(access) {
      const s = sessions.get(access);
      if (!s || s.expires <= now()) throw new AuthFailure(401, "SESSION_EXPIRED");
      return { userId: s.userId, platform: s.platform };
    },
    logout(access) { this.authenticate(access); sessions.delete(access); return { revoked: true }; }
  };
}
export function httpServer(auth) {
  return createServer(async (req, res) => {
    const requestId = randomBytes(8).toString("hex");
    const send = (status, value) => {
      res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(value));
    };
    try {
      const access = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
      if (req.method === "GET" && req.url === "/me") { send(200, auth.authenticate(access)); return; }
      if (req.method === "POST" && req.url === "/auth/logout") { send(200, auth.logout(access)); return; }
      if (req.method !== "POST" || req.url !== "/auth/exchange") {
        send(404, { code: "ROUTE_NOT_FOUND", requestId }); return;
      }
      const parts = []; let size = 0;
      for await (const part of req) {
        size += part.length;
        if (size > 4096) throw new AuthFailure(413, "BODY_TOO_LARGE");
        parts.push(part);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(parts).toString("utf8")); }
      catch { throw new AuthFailure(400, "INVALID_JSON"); }
      send(200, await auth.exchange(input));
    } catch (e) {
      send(e instanceof AuthFailure ? e.status : 500,
        { code: e instanceof AuthFailure ? e.code : "INTERNAL_ERROR", requestId });
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const auth = createAuth({ upstream: async () => ({ subject: "fictional-platform-user" }) });
  const server = httpServer(auth);
  server.requestTimeout = 10000;
  server.listen(4311, "127.0.0.1", () => console.info("DEMO auth on 127.0.0.1:4311"));
  process.once("SIGINT", () => server.close());
}
```

此 HTTP 适配器只供回环演示，无 CORS/公网/TLS/数据库能力，不能配置为正式小程序登录后端。
secret 即便通过环境变量加载，也只能在后端上游模块读取，不能由构建 defineConstants 下发。

完整文件 `auth-server.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAuth } from "./auth-server.mjs";
test("consume before await; same subject maps one user; expiry and revoke", async () => {
  let finish, calls = 0, clock = 1000, serial = 0;
  const auth = createAuth({ now: () => clock, token: () => `fictional-${++serial}`,
    upstream: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const first = auth.exchange({ platform: "weapp", code: "once" });
  await assert.rejects(auth.exchange({ platform: "weapp", code: "once" }), e => e.code === "CODE_REPLAY");
  assert.equal(calls, 1);
  finish({ subject: "u" }); const session = await first;
  assert.equal(auth.authenticate(session.token).userId, session.userId);
  clock += 900000;
  assert.throws(() => auth.authenticate(session.token), e => e.status === 401);
  const second = auth.exchange({ platform: "weapp", code: "new-code" });
  finish({ subject: "u" }); const next = await second;
  assert.equal(next.userId, session.userId);
  auth.logout(next.token);
  assert.throws(() => auth.authenticate(next.token), e => e.status === 401);
});
test("upstream failure still consumes code; platform identity is validated", async () => {
  const auth = createAuth({ upstream: async () => { throw new Error("timeout"); } });
  await assert.rejects(auth.exchange({ platform: "tt", code: "once" }), e => e.status === 502);
  await assert.rejects(auth.exchange({ platform: "tt", code: "once" }), e => e.status === 409);
  const invalid = createAuth({ upstream: async () => ({ subject: "" }) });
  await assert.rejects(invalid.exchange({ platform: "weapp", code: "x" }), e => e.status === 502);
  await assert.rejects(invalid.exchange({ platform: "unknown", code: "x" }), e => e.status === 400);
});
```

```bash
node --test auth-server.test.mjs
node auth-server.mjs
```

预期测试 2/2；可选第二条输出 DEMO 地址。另终端可以发送不含真实凭据的教学请求：

```bash
curl -i http://127.0.0.1:4311/auth/exchange \
  -H 'content-type: application/json' \
  --data '{"platform":"weapp","code":"fictional-once"}'
```

首回 200，同请求第二回 409。不把随机生成的教学 Token 放进教材或截图。
Control-C 停服务；测试进程自然退出；仅清理本实验文件，不清平台账号或全局凭据。

<a id="s7"></a>
## 7. 邻里集市集成案例

MP-24 `platform.loginCode()` 只负责取 code；真实 `login` 把 `{platform,code}` 送
`/api/v1/auth/exchange`，使用 parseSession 验证响应。移除 demo role 按钮，禁止传 buyerId。
每个业务端点调用 authenticate 后取 userId，POST listing 的 ownerId 由后端写入。
用户看见的昵称不是授权键。微信与抖音 platformSubject 不擅自合并，
需要独立身份绑定流程才能成为同一业务账号。

生产微信上游调用 code2Session，检查 HTTP 与 `errcode`，验证 openid；
AppID/secret 取受信配置，session_key 存服务器受限会话仓库。不返回上游完整 JSON。
抖音/支付宝分别实现接口、签名和错误映射，不能只换 URL 沿用微信响应 parser。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：将 `consumed.add` 移到 await 后。第一次还未完成时第二次也调用上游，
测试 calls 变 2，且 finish 被覆盖。修复登记顺序，不给测试添加 sleep。
再让上游返回 `{subject:""}`，应 502，而不是给空身份创建业务用户。
真实失败从脱敏 requestId、平台错误码、账号绑定与服务器时钟排查，不能输出 code/secret。

## 9. 课后题

1. code 超时后可以重发吗？答案：不能确定消费状态，应重新获取，依靠唯一身份映射避免重复用户。
2. 客户端删除 Token 等于撤销吗？答案：只清本机；服务器要删除/标记业务会话。
3. Map 实现原子消费能上线吗？答案：不能，多进程不共享，重启丢记录，还缺 TTL 与限流。

<a id="s10"></a>
## 10. 实践练习

- 基础：非法 platform 不调用上游。参考答案：统计 upstream 次数，输入 unknown 后次数保持 0。
- 进阶：同 subject 跨平台是否同 user？参考答案：weapp 与 tt 分别交换，断言 userId 不同；
  合并必须走可信账号绑定，不删除 platform/AppID 维度。
- 故障注入：交换失败删除消费记录。参考答案：第二次请求会再进上游；
  保留消费记录并要求新 code，后端另处理上游异常，不把 502 改成假成功。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 2 个测试通过，覆盖并发、失败、无效身份、过期和撤销。
- [ ] 小程序产物不含后端模块、AppSecret、session_key。
- [ ] 身份从上游 parser 得出，不信客户端业务 userId。
- [ ] 明确单进程替身与真实平台、持久消费仓库的差距。
- [ ] HTTP 实验已停止，无真实凭据进入命令、日志或截图。

## 12. 常见问题

本实验为什么不接真实 code2Session？因为需要合法账号与服务器密钥，教材不能索取或保存它们。
适配器的注入点可测试安全规则，但真实上游交换另需授权服务器、TLS、限流和平台证据。
Token 示例随机数仅用于内存查表；生产通常仅存 Token 摘要，并设计撤销、审计和密钥轮换。

## 13. 扩展阅读

[微信登录流程](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)、
[微信 code2Session](https://developers.weixin.qq.com/miniprogram/dev/server/API/user-login/api_code2session)、
[Taro login](https://docs.taro.zone/docs/apis/open-api/login/)。
2026-10-12 核对：code2Session 是服务器 API，不是客户端能力。

## 我现在能做到什么

我能控制 code 消费顺序，验证平台身份并撤销业务会话，不把替身登录当真实平台登录。

## 单元导航

[上一单元](../04-network/02-idempotency-uncertain-result.md) ·
[下一单元](02-token-logout-isolation.md) · [本卷](../README.md)
