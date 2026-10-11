# MP-22 提审、灰度与回退：状态兼容先于重新上传

## 任务卡

- 任务：准备真实审核材料，设计旧客户端共存与可恢复回退。
- 产出：审核交付表、`release-policy.mjs` 与测试、回退操作顺序。
- 运行：Node 策略测试；平台实际提审仅另获授权后执行。
- 证据：旧 schema、后端兼容、开关停止新写、未知预约可查、回退不删数据。
- 边界：本实验不上传、不提审、不发布、不改外部系统。

## 1. 任务背景

小程序审核与用户更新不同时发生。服务器已经升级，用户仍可能使用旧客户端；
回退代码也不能撤销已经成功的预约事务。把旧 version 当坏数据清空，
或回滚数据库抹掉预约，都违背数据一致性与用户意图。

## 2. 学习目标

准备与实际功能一致的审核说明；处理驳回；区别灰度、功能开关和平台版本回退；
设计 expand/contract 兼容；保障未知意图查询与草稿迁移；记录真实发布授权。

## 3. 预备知识

完成 [包体与预览](01-package-preview.md)、共享领域合同和 MP-24。
当前仓库任务不允许 commit/push/发布，所有记录是本地教材证据。
实际平台灰度能力、版本回退窗口与审批由对应平台最新后台规则决定，
不在课程里固定一个长期按钮路径。

<a id="s4"></a>
## 4. 核心理论

### 4.1 审核材料是产品事实

列明服务类目、内容审核、账号登录、隐私用途、图片与区域能力、投诉/删除入口、
无支付范围和测试账号操作。测试账号通过受控渠道提供，不写公开教程。
隐私说明与 actual API 一致；没有真实上传就写 demo 不上传，
不能以隐藏按钮绕过审核或称教学样例已上线。

### 4.2 客户端共存与数据库

后端先扩展兼容字段/端点 → 新客户端提审 → 观察旧版本比例 → 再收缩旧协议。
旧版本不识别状态时 parser 拒绝，应提示更新/只读，不把未知 status 映射 available。
本卷始终只有三类状态，后续增加状态必须升级合同与旧客户端策略。
草稿 V2 不能被 V1 回退代码覆盖；未知 schema 保留，给兼容读或更新提示。

### 4.3 回退与业务停止

发现严重问题先停止新写（服务器开关），保留读取和未知幂等意图恢复。
平台回退只换客户端版本；已经创建的 Reservation 不回滚或删除。
数据库通常采取 forward fix，不能因客户端回退执行破坏性 down migration。
通知失败可重试 outbox，不能重新创建预约。

## 5. 审核与回退清单

| 材料/动作 | 必须包含 |
| --- | --- |
| 构建证据 | 源/锁/产物 hash、工具、平台、时间，正式版本另有真实 revision |
| 功能说明 | 浏览、搜索、草稿、发布、预约、恢复、取消、卖家确认，无支付 |
| 隐私 | 实际采集、用途、最小化、保留期、删除与第三方说明 |
| 平台差异 | 当前支持/降级/未接能力，真实账号与模板限制 |
| 驳回修复 | 平台原因、影响、最小修复、回归、重新提交授权 |
| 灰度 | 平台能力、目标比例/用户、观察窗、暂停门，不编造平台开关 |
| 回退 | 停新写、保查询、兼容旧 schema、可恢复意图、数据不删除 |

<a id="s6"></a>
## 6. 最小可运行案例

以下策略用于后端/发布评审实验，不是绕过平台审核的客户端远程功能。

完整文件 `release-policy.mjs`：

```js
export function access({ supportedClient, writesEnabled, action }) {
  if (!["read", "recover", "new-write"].includes(action)) throw new Error("action");
  if (!supportedClient) return { allowed: false, code: "CLIENT_UPDATE_REQUIRED" };
  if (action === "new-write" && !writesEnabled) return { allowed: false, code: "WRITES_PAUSED" };
  return { allowed: true };
}
export function rollbackPlan({ fromDraftSchema, toDraftSchema, destructiveMigration }) {
  if (destructiveMigration) throw new Error("no destructive rollback");
  if (!Number.isInteger(fromDraftSchema) || !Number.isInteger(toDraftSchema)) throw new Error("schema");
  return {
    stopNewWrites: true, preserveReservations: true, keepRecoveryRead: true,
    draftAction: toDraftSchema < fromDraftSchema ? "preserve-and-require-compatible-client" : "validate-before-read"
  };
}
```

完整文件 `release-policy.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { access, rollbackPlan } from "./release-policy.mjs";
test("pause stops new writes but preserves reads and explicit recovery", () => {
  assert.equal(access({ supportedClient: true, writesEnabled: false, action: "new-write" }).code, "WRITES_PAUSED");
  for (const action of ["read", "recover"])
    assert.equal(access({ supportedClient: true, writesEnabled: false, action }).allowed, true);
  assert.equal(access({ supportedClient: false, writesEnabled: true, action: "new-write" }).code, "CLIENT_UPDATE_REQUIRED");
});
test("rollback never destroys reservations or newer drafts", () => {
  const plan = rollbackPlan({ fromDraftSchema: 2, toDraftSchema: 1, destructiveMigration: false });
  assert.equal(plan.preserveReservations, true);
  assert.equal(plan.draftAction, "preserve-and-require-compatible-client");
  assert.throws(() => rollbackPlan({ fromDraftSchema: 2, toDraftSchema: 1, destructiveMigration: true }), /destructive/);
});
```

```bash
node --test release-policy.test.mjs
```

预期 2/2，无平台、数据库或远端变化，自然退出。
“recover”首先查询已存在资源；如果需要同键 POST 重试，服务端只能先匹配持久幂等记录，
已提交则回原资源，未提交且新写暂停则拒绝。不能让 recover 分类绕过暂停创建新预约。
该精确端点策略由后端实现/测试，不能靠客户端 action 字段信任用户。

<a id="s7"></a>
## 7. 邻里集市集成案例

以本卷 Capstone 为审核练习时，明确内存 demo、虚构角色、图片未上传，
不作为真实服务提审版本。正式版本需真实 code 交换、数据库授权/幂等、
图片二次校验与隐私入口；不能把示例 package 的游客 AppID 上传真实应用。

回退演练：用两个测试客户端与同一隔离后端；新版创建 pending 后旧版读取，
服务器暂停新写仍可查询原 key；终态 confirmed/cancelled 不删除；
V2 草稿给 V1 时保留并要求兼容客户端。演练记录版本/数据快照与观察，
不修改生产数据、不自动提审或回滚。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：writesEnabled=false 时连 read/recover 都禁止，会让已提交但丢响应的用户无法确认；
测试应失败。再把 schema 回退写成空草稿，损坏用户数据。
平台驳回按原因检查真实隐私、类目、内容与路径，不隐藏功能或伪造账号审查材料。
灰度失败先停止新写、查 requestId 与版本分布，不能删除所有 pending “恢复可用”。

## 9. 课后题

1. 回退客户端会撤销交易吗？答案：不会，权威数据仍在服务器，不能删预约假装撤销。
2. 灰度就是在客户端随机 Math.random 吗？答案：不是，按平台/服务能力控制并记录分组。
3. 未识别草稿 schema 要清空吗？答案：不，保留并提示使用兼容客户端。

<a id="s10"></a>
## 10. 实践练习

- 基础：停止新写后读商品。参考答案：仍 allowed，UI 显示只读与暂停原因。
- 进阶：recover key 在服务器不存在。参考答案：暂停期间同键 POST 也不能新建；
  先查幂等记录，未命中返回 WRITES_PAUSED，原意图保留。
- 故障注入：审核说明称不采集位置但实际上传坐标。参考答案：停止提交，
  修正实际功能与隐私材料、回归数据最小化，再由用户授权重新提审。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 2 项策略测试通过，暂停仍可读，回退不删数据。
- [ ] 审核材料与实际功能相符，无秘密/测试账号公开存放。
- [ ] 旧客户端、草稿 schema 和未知意图有兼容计划。
- [ ] 真提审/灰度/回退未授权不执行，缺证据明确未验证。

## 12. 常见问题

平台不提供预想的灰度或回退怎么办？记录实际限制，
采用服务端停新写、兼容旧客户端和前向修复；不能编写不存在的控制台步骤。
正式回退还需操作者权限、审批与审计，本卷仅提供可测试业务原则。

## 13. 扩展阅读

[微信发布](https://developers.weixin.qq.com/miniprogram/dev/framework/quickstart/release.html)、
[抖音开发路径](https://partner.open-douyin.com/docs/resource/zh-CN/mini-app/develop/overview/learning-path)、
[expand/contract 回退](../../09-fullstack/04-ci-release-rollback/04-rollback-expand-contract-evidence.md)。

## 我现在能做到什么

我能准备真实审核材料，设计旧客户端共存与不破坏数据的回退，并守住发布授权边界。

## 单元导航

[上一单元](01-package-preview.md) ·
[下一单元](../12-capstone/01-domain-service-tests.md) · [本卷](../README.md)
