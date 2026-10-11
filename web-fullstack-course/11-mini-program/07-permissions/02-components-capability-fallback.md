# MP-14 平台组件：能力探测与可用降级

## 任务卡

- 任务：为分享、图片、位置与订阅建立明确的能力结果，不返回伪成功。
- 产出：独立 `capabilities.mjs`、`capabilities.test.mjs`；平台组件映射表。
- 运行：`node --test capabilities.test.mjs`，再在工具检查平台组件。
- 证据：缺能力、拒绝、运行错误和正常成功分别可观察。
- 边界：函数存在不证明账号、基础库、隐私或服务类目准入。

## 1. 任务背景

Taro 提供同名组件不代表所有平台支持相同 openType。`Button openType="share"`、
相机能力、订阅模板和 web-view 都有平台、账号和审核条件。
把 unsupported 捕获后返回空数组，会让调用者误以为用户选了零张图片并覆盖旧草稿。

## 2. 学习目标

定义 capability contract；将平台差异集中 adapter；保留用户输入；
为拒绝与缺失能力提供无强迫的恢复入口；识别组件事件和原生 API 的差异。

## 3. 预备知识

完成 [隐私权限](01-privacy-permission-flow.md)。本例是独立纯 JS 协议实验，
不安装 UI 库、不在 Node 创建 wx。真实页面完整基线在 MP-24。

<a id="s4"></a>
## 4. 核心理论

### 4.1 从平台函数到业务结果

业务不关心接口叫 wx/tt/my，而关心 `success/unsupported/denied/failed`。
unsupported 提供替代路径；denied 尊重用户决定；failed 需要错误与重试。
cancelled 是用户取消选择，不等于图片读取损坏。平台 errMsg 不稳定，
分类依据先看官方错误码；不能仅凭英文 includes("deny") 在所有平台推断拒绝。

### 4.2 组件映射与限制

| 业务意图 | 主线实现 | 不应假设 |
| --- | --- | --- |
| 列表/表单 | View/Text/Input/Textarea | HTML div/input 全部属性等价 |
| 选择图片 | 用户点击 → adapter chooseImage | count/compression 表示服务器已校验 |
| 分享详情 | 平台 share 按钮与 hook | H5 相同按钮能打开微信卡片 |
| 位置 | 明确用途与用户操作 | 同意隐私即自动授权位置 |
| 订阅 | 平台模板 adapter | accept 即成功预约或已发送消息 |
| web-view | 平台组件与域名许可 | 任意 URL/脚本注入或后台账户页面 |

### 4.3 可用降级

图片不可用可先发无图教学商品；地域不可用可手选区域；订阅不可用仍可查看预约。
这些替代不伪造服务器状态，也不增加支付或手机号采集。
缺登录能力不能降级成“游客已登录买家”；身份必须由真实后端建立。

## 5. 实验设计

adapter 通过 `supported(name)` 与 `run(name)` 注入。错误分类由平台 adapter 提供
稳定 `denied` code；缺能力不得执行 run。结果包含数据仅当 success，
页面根据 discriminant 更新，其他结果保留旧值。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `capabilities.mjs`：

```js
export async function invoke(adapter, name) {
  if (!adapter.supported(name)) return { kind: "unsupported", action: "use-manual-path" };
  try { return { kind: "success", data: await adapter.run(name) }; }
  catch (error) {
    if (error && error.code === "denied") return { kind: "denied", action: "use-manual-path" };
    if (error && error.code === "cancelled") return { kind: "cancelled", action: "keep-input" };
    return { kind: "failed", action: "retry-or-manual" };
  }
}
export function applyImages(previous, result) {
  if (result.kind !== "success") return [...previous];
  if (!Array.isArray(result.data) || result.data.length > 3 ||
      !result.data.every(p => typeof p === "string" && p.length > 0)) throw new Error("image result");
  return [...result.data];
}
```

完整文件 `capabilities.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { invoke, applyImages } from "./capabilities.mjs";
test("missing capability does not call API or replace input", async () => {
  let calls = 0;
  const result = await invoke({ supported: () => false, run: () => { calls++; } }, "images");
  assert.equal(result.kind, "unsupported"); assert.equal(calls, 0);
  assert.deepEqual(applyImages(["owned-temp"], result), ["owned-temp"]);
});
test("denied/cancelled/failed differ from parsed success", async () => {
  for (const code of ["denied", "cancelled", "network"]) {
    const result = await invoke({ supported: () => true, run: async () => { throw { code }; } }, "images");
    assert.equal(result.kind, code === "network" ? "failed" : code);
    assert.deepEqual(applyImages(["old"], result), ["old"]);
  }
  const success = await invoke({ supported: () => true, run: async () => ["new"] }, "images");
  assert.deepEqual(applyImages(["old"], success), ["new"]);
  assert.throws(() => applyImages([], { kind: "success", data: [1] }), /image/);
});
```

```bash
node --test capabilities.test.mjs
```

预期 2/2，无平台 IO，自然退出。
工具实验：分别隐藏/提供 adapter 方法，点击图片按钮，记录 UI 不丢已有图片；
不要使用真实用户照片，停止后只删除本实验临时资源。

<a id="s7"></a>
## 7. 邻里集市集成案例

MP-24 platform 是最小集中入口，未适配订阅明确 throw。
扩展能力结果时页面仅在 success 且 epoch 未变时 save 图片；
unsupported/denied 显示手工路径，保持之前 draft。
detail 分享页面添加平台页面配置，冷启只携带 listingId，不携带 Token、
私人草稿或预约对象。平台分享成功回调也不修改交易状态。

web-view 不用于绕过小程序审核：业务域名白名单、跳转和消息都需明确来源校验；
当前 Capstone 不需要此组件，避免加入新权限与包体。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：invoke catch 改为 `{kind:"success",data:[]}`。拒绝图片后原引用被清空，
测试应失败。恢复结果分类，不让 applyImages 认识各个平台 errMsg。
另在支付宝构建中使用 wx，若编译器没报错仍会运行失败；
构建通过不是函数存在证据，检查目标产物与工具 console。

## 9. 课后题

1. canIUse=true 就能运行吗？答案：还可能缺账号准入、后台配置或用户授权。
2. unsupported 为什么不返回 false？答案：False 丢失原因和恢复路径，容易被当业务否定。
3. 用户取消要报红色错误吗？答案：可保持输入并温和说明，不视为服务故障。

<a id="s10"></a>
## 10. 实践练习

- 基础：无订阅能力。参考答案：显示查看预约按钮，Reservation 不变化。
- 进阶：图片 success 含数字。参考答案：parser 拒绝，不写 storage，不强转 string。
- 故障注入：图片 API resolve 时账号改变。参考答案：比较开始 epoch 与当前 epoch，
  丢弃结果，不写新账号草稿，也不清旧账号数据。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 2/2 测试，拒绝/取消/失败不进入 success 分支。
- [ ] 平台 API 与错误映射集中，不在每页散落 wx/tt/my。
- [ ] 无能力时核心浏览/手工区域/预约回读可用。
- [ ] 分享不泄漏 Token，web-view 不作为审核绕行。
- [ ] 每个平台组件与真机能力独立记录，未测不宣称支持。

## 12. 常见问题

允许平台专用页面吗？允许，若事件/组件差异无法在小 adapter 清楚表达，
专用页面比充满条件分支的“万能页”更容易验证，但共享领域 parser 保持一致。

## 13. 扩展阅读

[Taro 组件](https://docs.taro.zone/docs/components-desc)、
[微信 canIUse](https://developers.weixin.qq.com/miniprogram/dev/api/base/wx.canIUse.html)、
[Taro Hooks](https://docs.taro.zone/docs/hooks)。

## 我现在能做到什么

我能给平台能力定义明确结果，用户拒绝与能力缺失不再破坏已有输入。

## 单元导航

[上一单元](01-privacy-permission-flow.md) ·
[下一单元](../08-media/01-image-validation-upload.md) · [本卷](../README.md)
