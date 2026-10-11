# MP-08 幂等与未知结果：丢响应后保留同一意图

## 任务卡

- 任务：服务端已经创建预约但客户端没收到时，查询或重试同键恢复。
- 产出：完整 `tests/idempotency.test.ts`，MP-24 详情页恢复操作记录。
- 运行：MP-23 服务与请求文件、MP-24 安装基线，Node 确定性测试。
- 边界：同步内存服务只证明模型，不证明数据库并发与持久化。

## 1. 任务背景

弱网中一次 POST 可成功写入但超时。重新生成 key 会成为第二次意图，商品已 reserved
导致冲突，甚至在没有唯一约束的系统重复预约。按钮禁用与防抖不能修复跨请求事务。

## 2. 学习目标

建模 idle/submitting/unknown/known/conflict；在发送前持久保存 key 和原命令；
区分幂等、版本比较与有效预约唯一性；只在用户明确动作后恢复写入。

## 3. 预备知识

复制 MP-23 完整 domain/request/mock-service 文件与 MP-24 package；
新建 tests 目录并创建本篇完整文件。当前预约端点遵循共享契约
POST `/listings/:id/reservations`，首次与同键重放均返回 201。

<a id="s4"></a>
## 4. 核心理论

key 代表一个已校验命令，作用域至少包含用户、操作和 key，摘要包含 listingId/version。
同键同摘要返回原资源；同键不同摘要 409。version 拦旧写，唯一有效预约约束拦并发，
幂等拦同意图重复，三者不可互代。

查询 404 只说明当前查不到记录，不证明旧 POST 永远不会提交。安全恢复仍使用同键，
不能换 key。服务端需要在幂等查找和业务写入之间保证原子性。
取消传输不取消预约；显式 POST cancel 才能将 pending 迁移为 cancelled，
同时 Listing 回 available。卖家 confirm 将 pending 迁移 confirmed 与 sold。

离线保存“想预约”可作为草稿，但不作为成功，也不自动重放。课堂默认仅保留已有命令，
由用户点击恢复，避免后台网络恢复偷偷预约。

## 5. 状态清单

| 状态 | 允许动作 |
| --- | --- |
| submitting | 暂停再次点击，不宣布成功 |
| unknown | 同键查询、同键重试，保留 payload |
| known pending | 展示权威预约，允许按权限取消/确认 |
| conflict | 首次命令确定拒绝则显式结束意图再开始；未知命令重试冲突仍保留原 key |
| offline draft | 只保存本地内容 |

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `tests/idempotency.test.ts`：

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { createMockTransport } from "../src/mock-service";
import { createRequest, ApiError } from "../src/request";
import { object, parseReservation, text } from "../src/domain";
test("lost response is recovered by original key without new reservation", async () => {
  const transport = createMockTransport(), send = createRequest(transport, "https://demo.invalid/api/v1");
  const auth = await send("POST", "/auth/exchange", { code: "demo-buyer-weak" }, object).promise;
  const token = text(auth.token, "token");
  transport.dropNextReservation();
  await assert.rejects(send("POST", "/listings/lamp-1/reservations",
    { version: 1, key: "same-intent" }, parseReservation, token).promise,
    (e: unknown) => e instanceof ApiError && e.kind === "network");
  const recovered = await send("GET", "/reservations/by-key/same-intent",
    {}, parseReservation, token).promise;
  const replay = await send("POST", "/listings/lamp-1/reservations",
    { version: 1, key: "same-intent" }, parseReservation, token).promise;
  assert.equal(recovered.id, replay.id);
  assert.equal(recovered.status, "pending");
});
test("offline cannot announce a reservation", async () => {
  const transport = createMockTransport(), send = createRequest(transport, "https://demo.invalid/api/v1");
  transport.setOffline(true);
  await assert.rejects(send("POST", "/listings/lamp-1/reservations",
    { version: 1, key: "offline-intent" }, parseReservation).promise,
    (e: unknown) => e instanceof ApiError && e.kind === "network");
});
```

运行 `npx tsx --test tests/idempotency.test.ts`，预期 2/2，无 sleep。
命令退出清掉所有实例 Map；无服务器进程或真实预约需要取消。
平台集成运行 `npm run build:weapp`，按 MP-24 §8 开关演练，明确界面所有状态为演示。

<a id="s7"></a>
## 7. 邻里集市集成案例

MP-24 reserve 先写 `market:intent:user:listing`，再发送原命令；storage 配额失败时停止。
响应丢失保留 key，按钮名称是“预约或恢复原预约”，不是“再次购买”。
返回/后台恢复只 GET；用户点恢复后先 GET by-key，404 同键 POST。
新意图必须在旧意图权威结果确认、用户明确选择新业务时建立，不因接口失败自动重置。
首次命令明确收到 LISTING_CONFLICT/SELF_RESERVATION/LISTING_NOT_FOUND 才标 rejected；
用户先“结束已拒绝意图”，再回读最新 version 并显式点击预约。未知命令即使重试冲突，
也不能证明原写永远不提交，仍不开放结束或自动生成新 key。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：首次失败 catch 中删除 key。第二点击改 key，服务端 reserved 返回 409。
证据关联原 key（仅保存测试键，不记录真实敏感身份）、状态与 requestId。
修复成功后才删除意图，复验恢复 ID 相同。另一实验删除 payload 摘要检查，
同键不同 version 返回错误旧预约，必须恢复 409。

## 9. 课后题

1. disable 按钮能处理进程重启吗？答案：不能。
2. 查询 404 能换新 key 吗？答案：不能保证旧请求未提交。
3. cancelled 可再确认吗？答案：共享契约终态不可迁移，返回 409。

<a id="s10"></a>
## 10. 实践练习

- 基础：检查恢复 ID。参考答案：严格相等且 status pending，不只断言“有对象”。
- 进阶：两个买家。参考答案：不同业务 userId、新 key、同 Listing/version，
  只一方 201，另一方 409，服务端商品 reserved。
- 故障注入：忽略存储写失败继续 POST。参考答案：未知结果无法恢复；
  使 storage.set 抛错并断言 transport 未调用，恢复先存后发。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 两项测试通过，丢响应后恢复同一资源。
- [ ] key、payload、版本与用户作用域明确。
- [ ] 离线不宣布成功，恢复需显式操作。
- [ ] 数据库并发、幂等 TTL、重启持久化另列未验证。

## 12. 常见问题

key 是否必须 UUID？需要足够随机且可持久恢复，具体由服务端契约决定。
课堂时间+随机不是生产唯一性或安全性证明。查询接口的访问权限与 POST 相同要验证。

## 13. 扩展阅读

[共享事务契约](../../00-guide/project-contract.md#预约状态与事务)、
[微信网络边界](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)。

## 我现在能做到什么

我能保留未知写意图并按同键恢复，不把传输失败当事务未执行。

## 单元导航

[上一单元](01-request-parser-cancellation.md) · [下一单元](../05-auth/01-code-server-session.md) · [本卷](../README.md)
