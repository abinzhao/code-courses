# MP-16 位置与订阅：最小数据、通知不代替权威状态

## 任务卡

- 任务：限制位置精度与用途，让订阅消息只提醒用户重新读取预约。
- 产出：`src/notice.ts`、`tests/notice.test.ts`，接到 MP-24 预约页。
- 运行：项目根 `npm test`、`npm run typecheck`。
- 证据：坐标非法、拒绝订阅、模板不同、消息乱序和服务器回读。
- 边界：Node 测试不发送平台消息；模板、账号与订阅授权需平台验证。

## 1. 任务背景

“已接受订阅”只表示允许特定模板通知，不表示预约成功、消息已发或永久同意。
消息可能延迟、重复或丢失。点开通知后应按 reservationId 查询当前服务器状态，
不能把卡片里的 pending 写回当前 confirmed。

## 2. 学习目标

验证坐标范围；定义短暂用途与不持久化策略；解析逐模板授权结果；
验证消息携带的资源 ID；通过回读恢复，而不是从消息变更领域状态。

## 3. 预备知识

完成 [图片上传](01-image-validation-upload.md)。在 MP-24 项目增补两文件。
默认位置只填界面，默认订阅仅微信 adapter 申请、不发送消息；
服务器通知由事务 outbox 扩展，不在客户端保存平台发送凭据。

<a id="s4"></a>
## 4. 核心理论

### 4.1 位置仍是个人数据

经纬度必须有限数，纬度 [-90,90]、经度 [-180,180]，统一坐标系并告知用途。
保留两位小数不等于匿名；可以定位到区域。优先用户手选区域 ID，
不上传精确坐标，不连续采集，不为“附近”索取地址簿或手机号。
当前共享 Listing 无地域字段，不能私自塞坐标进 description。

### 4.2 模板和平台

微信 tmplIds 与支付宝 entityIds 不是同一参数；抖音也独立核对当前模板机制。
逐模板返回 accept/reject/ban 或其他结果，不能只因 success 回调就认为同意。
templateId 由受信配置限定用途；Capstone 手填 ID 是课堂接线入口，不是生产模板管理。
本卷 Taro 4.3 跨平台类型问题使用微信原生 typed adapter，不传支付宝字段“补齐类型”。

### 4.3 事务与通知

预约事务成功后写 outbox；服务器异步发送并记录结果。失败重试不会创建新预约，
用户拒绝不会使业务失败。消息只含最小资源 ID 与必要文案，无 Token、地址与草稿。
点开后后端对象授权再查询，过期/删除/无权限都有恢复入口。

## 5. 实验设计

控制器只解析位置/模板结果/消息 ID。`readNotice` 忽略消息提供的 status，
由注入 query 返回当前 Reservation；若用户无权限，直接传播拒绝。
本例注入服务不是平台推送，不能作为订阅发送证据。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `src/notice.ts`：

```ts
import { object, text, Reservation, parseReservation } from "./domain";
export function coarseLocation(value: unknown): string {
  const x = object(value);
  if (typeof x.latitude !== "number" || typeof x.longitude !== "number" ||
      !Number.isFinite(x.latitude) || !Number.isFinite(x.longitude) ||
      Math.abs(x.latitude) > 90 || Math.abs(x.longitude) > 180) throw new Error("invalid coordinates");
  return `${x.latitude.toFixed(2)},${x.longitude.toFixed(2)}`;
}
export function accepted(value: unknown, templateId: string): boolean {
  text(templateId, "templateId");
  return object(value)[templateId] === "accept";
}
export async function readNotice(payload: unknown, query: (id: string) => Promise<unknown>): Promise<Reservation> {
  const id = text(object(payload).reservationId, "reservationId");
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(id)) throw new Error("invalid reservationId");
  const resource = parseReservation(await query(id));
  if (resource.id !== id) throw new Error("reservation identity mismatch");
  return resource;
}
```

完整文件 `tests/notice.test.ts`：

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { coarseLocation, accepted, readNotice } from "../src/notice";
test("coordinates validate before reducing display precision", () => {
  assert.equal(coarseLocation({ latitude: 31.234, longitude: 121.456 }), "31.23,121.46");
  for (const x of [{ latitude: Infinity, longitude: 1 }, { latitude: 91, longitude: 0 },
    { latitude: "31", longitude: 1 }]) assert.throws(() => coarseLocation(x));
});
test("template success and stale message never invent reservation state", async () => {
  assert.equal(accepted({ a: "accept", b: "reject" }, "a"), true);
  assert.equal(accepted({ a: "accept" }, "b"), false);
  const resource = { id: "r1", listingId: "l1", buyerId: "a", sellerId: "b", key: "k",
    status: "confirmed", version: 2, createdAt: "2026-10-12T00:00:00.000Z" };
  const result = await readNotice({ reservationId: "r1", status: "pending" }, async () => resource);
  assert.equal(result.status, "confirmed");
  await assert.rejects(readNotice({ reservationId: "../r1" }, async () => resource), /invalid/);
  await assert.rejects(readNotice({ reservationId: "r1" }, async () => { throw new Error("403"); }), /403/);
});
```

```bash
npm test
npm run typecheck
```

预期新增 2 项通过，无消息发送、无位置读取，自然退出。
真机实验用自愿测试账号授权，拒绝仍能手工填写和查看预约；
删除测试数据按业务规则，不修改用户全局消息/位置权限。

<a id="s7"></a>
## 7. 邻里集市集成案例

MP-24 预约页 `platform.subscribe` 只在用户点击时调用，
成功文案“已接受通知授权，非预约成功”；拒绝留回读按钮。
通知冷启动入口传资源 ID 后先登录、再读取本人预约，
当前 demo 没有单资源 GET，可从本人列表按 ID 找，找不到提示无可访问资源；
真实后端增补 GET `/reservations/:id` 时保持对象授权。

平台 locate 结果在 adapter 准入后仅暂存区域输入，不落草稿、不发后台。
正式服务端仅收 regionId，需要共享契约明确新增字段，不能随意修改 Listing 八字段。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：readNotice 直接 parse payload，消息缺字段/旧状态会造成错误；
正确动作是 query 再 parse，并验证 ID 一致。再让 subscribe success 返回 reject，
页面不能显示接受。失败从模板用途、平台账号、授权与服务器发送记录分别排查，
requestId 可记录，用户坐标和平台凭据不进日志。

## 9. 课后题

1. 不订阅能预约吗？答案：能，通知不是业务成功条件。
2. 消息重复会重复预约吗？答案：不会，打开只读查询，不执行 POST。
3. 两位坐标可以无限保存吗？答案：不，仍需用途、保留期和删除策略；本卷不保存。

<a id="s10"></a>
## 10. 实践练习

- 基础：模板 b 无结果。参考答案：accepted=false，提示未接受，不能复制 a 的结果。
- 进阶：用户取消后收到 pending 通知。参考答案：查询返回 cancelled，
  显示当前状态，不恢复商品 reserved。
- 故障注入：通知 ID 指向他人预约。参考答案：后端拒绝或不返回，
  UI 不展示他人数据，不能只验证 ID 格式当对象授权。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 2 项测试与类型检查通过，消息不写交易状态。
- [ ] 位置无非法值、无额外采集与持久化，拒绝可手工输入。
- [ ] 逐平台模板与授权不混用，发送凭据只在后端。
- [ ] 真机授权/拒绝、消息延迟、冷启回读有证据或未验证标记。

## 12. 常见问题

通知发送成功也不保证用户看到；平台可能限额、延迟或用户关闭提醒。
可靠性依赖权威资源可查询，不是提高前端重试次数或要求重复授权。

## 13. 扩展阅读

[微信订阅消息](https://developers.weixin.qq.com/miniprogram/dev/api/open-api/subscribe-message/wx.requestSubscribeMessage.html)、
[微信位置](https://developers.weixin.qq.com/miniprogram/dev/api/location/wx.getLocation.html)、
[事务 outbox](../../08-backend/08-redis-queues-reliability/02-transactional-outbox-consistency.md)。

## 我现在能做到什么

我能最小化位置数据，按模板解析授权，并让通知只触发可信状态回读。

## 单元导航

[上一单元](01-image-validation-upload.md) ·
[下一单元](../09-adapters/01-adapter-platform-config.md) · [本卷](../README.md)
