# MP-10 Token 生命周期：即时退出与跨账号隔离

## 任务卡

- 任务：让退出先使本机身份失效，旧异步回调不能覆盖新账号。
- 产出：独立 `session.mjs`、`session.test.mjs`，并审计 Capstone client。
- 运行：`node --test session.test.mjs`，无依赖、无真实 Token。
- 证据：乱序登录、撤销超时、存储失败、过期和旧请求 401。
- 边界：平台 storage 不是 HttpOnly，也不是可保证擦除的安全硬件。

## 1. 任务背景

用户点击退出时服务器可能不可达。若 await 撤销后才清本机，等待期间旧身份仍可发写请求。
另一种竞态是 A 请求返回 401，而用户已登录 B：不能让旧响应把 B 退出。
解决的单位是会话代次，不是某个按钮的 loading。

## 2. 学习目标

设计单调递增 epoch；使登录、请求、退出归属明确；逐项清理并报告失败；
区分本机退出、服务端会话撤销与业务账号注销。账号注销另需服务端删除/保留规则、
再次验证身份和审计，不把本篇 logout 描述成删除账号。

## 3. 预备知识

完成 [code 交换](01-code-server-session.md)。本实验注入内存 IO 与撤销函数，
替身 Token 仅 `demo-*`。真实客户端仍由 MP-24 parser 解析 Session，后端验证权限。

<a id="s4"></a>
## 4. 核心理论

### 4.1 同一会话的定义

`epoch` 每次身份变化递增。请求发出时捕获 epoch/token，响应写 UI 前再次比较。
userId 相同也不够：退出重新登录可能仍是同 user，但旧 Token 已撤销。
所有身份相关操作，包括图片选择、草稿迁移与收藏刷新，都必须检查归属。

### 4.2 退出顺序与清理失败

先捕获旧 token/userId → 清内存并递增 epoch → 尝试本机清理 → 请求服务器撤销旧 Token。
清理每项独立尝试，不能 session key 删除失败就跳过草稿清理。
失败要显示“本机存储清理未确认”，禁止新登录直到敏感旧会话项可安全处理。
平台没有可靠删除保证时不声称安全擦除；再次启动仍必须后端验证。

### 4.3 401、刷新与重放

401 是认证失效；403 是对象权限；409 是业务冲突，不能全部自动登录。
如果选择 refresh，必须 single-flight、防循环和服务端轮换；本卷选择重新登录，
避免增加未经实现的后台刷新层。身份重新建立后，不自动重放预约 POST；
用户显式恢复原幂等键。

## 5. 实验设计

将 session 所有权独立测试。`restore` 验证存储数据、过期与 ISO UTC，
不修改 expiresAt 延寿。`expire(epoch)` 仅清当前代次。清理失败不吞异常，
logout 返回 warning 清单供界面呈现。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `session.mjs`：

```js
function parse(value) {
  if (!value || typeof value !== "object" || typeof value.token !== "string" || !value.token ||
      typeof value.userId !== "string" || !value.userId ||
      typeof value.expiresAt !== "string" || !Number.isFinite(Date.parse(value.expiresAt)) ||
      new Date(value.expiresAt).toISOString() !== value.expiresAt) throw new Error("invalid session");
  return { token: value.token, userId: value.userId, expiresAt: value.expiresAt };
}
export function createSessions(io, now = Date.now) {
  let session, epoch = 0, blocked = false;
  const clear = owner => {
    session = undefined; epoch++;
    const warnings = [];
    for (const key of ["market:session", ...(owner ? [
      `market:draft:${encodeURIComponent(owner)}`, `market:favorites:${owner}`] : [])]) {
      try { io.remove(key); }
      catch { warnings.push(`cleanup failed: ${key.split(":").slice(0, 2).join(":")}`); }
    }
    blocked = warnings.length > 0;
    return warnings;
  };
  return {
    snapshot() { return { session, epoch, blocked }; },
    restore() {
      try {
        const stored = io.get("market:session");
        if (!stored) return;
        const value = parse(stored);
        if (Date.parse(value.expiresAt) <= now()) { clear(value.userId); return; }
        session = value;
      } catch { clear(session?.userId); }
    },
    beginLogin() {
      if (blocked) throw new Error("resolve storage cleanup before login");
      if (session) throw new Error("logout before changing account");
      return ++epoch;
    },
    finishLogin(started, value) {
      if (started !== epoch) throw new Error("stale login");
      const valid = parse(value);
      if (Date.parse(valid.expiresAt) <= now()) throw new Error("expired response");
      io.set("market:session", valid);
      session = valid;
    },
    accepts(started) { return started === epoch && !!session; },
    expire(started) { return started === epoch ? clear(session?.userId) : []; },
    async logout(revoke) {
      const previous = session;
      const warnings = clear(previous?.userId);
      if (previous) {
        try { await revoke(previous.token); }
        catch { warnings.push("server revocation unconfirmed"); }
      }
      return warnings;
    }
  };
}
```

完整文件 `session.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSessions } from "./session.mjs";
const value = user => ({ userId: user, token: `demo-${user}`, expiresAt: "2026-10-12T01:00:00.000Z" });
function fixture(remove = () => {}) {
  const map = new Map();
  const session = createSessions({ get: k => map.get(k), set: (k,v) => map.set(k,v),
    remove: k => { remove(k); map.delete(k); } }, () => Date.parse("2026-10-12T00:00:00.000Z"));
  return { session, map };
}
test("logout invalidates before revoke completes; stale 401 leaves new session", async () => {
  const { session } = fixture();
  session.finishLogin(session.beginLogin(), value("a"));
  const old = session.snapshot().epoch;
  let finish;
  const leaving = session.logout(() => new Promise(resolve => { finish = resolve; }));
  assert.equal(session.snapshot().session, undefined);
  assert.equal(session.accepts(old), false);
  session.finishLogin(session.beginLogin(), value("b"));
  session.expire(old);
  assert.equal(session.snapshot().session.userId, "b");
  finish(); assert.deepEqual(await leaving, []);
});
test("out-of-order login and storage errors never install unsafe session", async () => {
  const { session } = fixture();
  const a = session.beginLogin(), b = session.beginLogin();
  assert.throws(() => session.finishLogin(a, value("a")), /stale/);
  session.finishLogin(b, value("b"));
  const broken = fixture(k => { if (k === "market:session") throw new Error("disk"); }).session;
  broken.finishLogin(broken.beginLogin(), value("a"));
  const warnings = await broken.logout(async () => { throw new Error("offline"); });
  assert.equal(warnings.length, 2);
  assert.equal(broken.snapshot().session, undefined);
  assert.throws(() => broken.beginLogin(), /cleanup/);
});
```

```bash
node --test session.test.mjs
```

预期 2/2，进程自然结束，没有本机真实存储变化。不要用真实 Token 替换夹具。
实验目录可自行移除；不清理开发者工具的其他项目 storage。

<a id="s7"></a>
## 7. 邻里集市集成案例

MP-24 `api` 在发出时捕获 epoch/token，只有当前代次 401 触发 localLogout。
logout 捕获旧会话后立即失效内存并持久记录待清理键，再逐项清本机、撤销旧 Token。
某键失败时再次退出仍处理原 owner；所有数据与日志删除确认后才解锁新登录。
重启读到待清理记录仍阻塞；日志写失败不先删除 owner 线索，避免丢失清理责任。
离线必须显示“服务端撤销未确认”，不要显示全端退出。
草稿与收藏按当前用户清理；未确定预约意图可保留在该用户命名空间，
重新登录同一业务用户后显式恢复，绝不迁到下一用户。

图片选择回调捕获 epoch 和 image generation，完成后合并最新草稿，不覆盖选择期间编辑。
页面初进或身份代次变化才读 persist，同会话 onShow 保留编辑；坏草稿先清界面并禁止覆盖，
保留原坏数据供用户处理，不能继续展示上次账号内容。真实生产日志仅记录 requestId、
结果分类和脱敏会话代次，不输出 Authorization。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：把 clear 放到 await revoke 后，控制 finish 不执行，断言 session 仍存在，
暴露退出等待窗口。再删除 expire 的 epoch 判断，旧 401 会删 B。
修复顺序和所有权检查，不靠统一“请求失败后 reload”掩盖状态串号。
存储写失败时必须拒绝登录，不先写内存再宣告持久成功。

## 9. 课后题

1. 为什么 epoch 不用 userId 代替？答案：相同用户也可能是两次不同会话。
2. 退出要删除预约意图吗？答案：未知结果可保留但只能在同用户空间恢复，不能自动发送。
3. 本机清理失败还能静默登录吗？答案：不能，先处理风险并向用户说明未确认项。

<a id="s10"></a>
## 10. 实践练习

- 基础：restore 过期会话。参考答案：预置过期 expiresAt，restore 后 session undefined，
  session key 被移除，不将时间改为未来。
- 进阶：同时登录 a/b。参考答案：a 先发 b 后发，b 完成再 a 完成；只有 b 安装成功，
  a 以 stale login 拒绝。
- 故障注入：删掉 finishLogin 里的 io.set。参考答案：当前进程似乎成功，重启失去会话；
  恢复先写 storage 后安装内存，配额失败应保持未登录。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 2/2 单测包含未完成撤销，不以固定延时测试竞态。
- [ ] 旧请求和旧登录无法影响新会话。
- [ ] 清理逐项执行、失败可见，区分本机与服务端。
- [ ] 账号注销不等于 logout，Token 不出现在日志或教程证据。
- [ ] Capstone 图片、草稿、收藏与预约恢复均检查用户归属。

## 12. 常见问题

为什么不演示 refresh 自动续期？本卷冻结为显式重新登录；refresh 是新的服务端安全协议，
不能只加客户端计时器。若需要，先定义轮换、重用检测、并发和撤销，再补测试。

## 13. 扩展阅读

[Taro setStorageSync](https://docs.taro.zone/docs/apis/storage/setStorageSync)、
[微信登录](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/login.html)、
[对象授权](../../08-backend/06-auth-sessions-rbac/03-authentication-object-authorization-rbac.md)。

## 我现在能做到什么

我能即时失效本机会话、报告清理和撤销结果，并阻止旧回调跨账号写入。

## 单元导航

[上一单元](01-code-server-session.md) ·
[下一单元](../06-storage/01-user-drafts-migration.md) · [本卷](../README.md)
