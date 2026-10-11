# MP-20 开发工具与真机：弱网、后台、升级的可复现证据

## 任务卡

- 任务：用同一构建在两平台客户端跑可复现路径，记录失败时点而不是只录成功页。
- 产出：工具/真机操作树、`device-evidence.mjs`、`device-evidence.test.mjs`。
- 运行：Node 证据格式测试；微信、抖音、支付宝工具按账号能力执行。
- 证据：冷热启动、后台、断网、响应丢失、权限拒绝、版本升级。
- 边界：证据格式校验不证明操作实际发生；缺工具/账号/设备必须标未验证。

## 1. 任务背景

工具模拟网络成功，真机仍可能被域名、证书、相机权限、基础库差异阻断。
弱网不是把 timeout 调小：它影响连接、上传、回包和请求重试的不同时点。
“无网时预约成功”是严重错误；离线只允许草稿，交易仍需要服务器权威响应。

## 2. 学习目标

从具体动作构造验收路径；记录构建、工具、客户端、基础库与机型；
分清调用前断网、服务提交后丢响应；检查 hidden/unload 的资源；
验证升级保留草稿和未知意图；不以格式完整的报告冒充真机结果。

## 3. 预备知识

完成 [多层测试](01-deterministic-layered-tests.md)。
先完成 MP-24 build，导入对应 dist。真实网络测试需要 HTTPS 后端、
合法请求/上传域名、测试账号和平台权限。未满足则只跑内存 demo UI，
不能把 demo offline 开关称为真实弱网。

<a id="s4"></a>
## 4. 核心理论

### 4.1 网络失败的时点

| 时点 | 服务端可能状态 | 客户端行动 |
| --- | --- | --- |
| 写意图前 storage 失败 | 未发送 | 提示保存失败，不发送 |
| 请求连接前离线 | 未知/通常未提交 | 保留意图，用户显式恢复 |
| 服务器事务后断响应 | 已提交 | 同 key 查询/重试，禁止新 key |
| 查询 401 | 身份失效 | 本机退出/重新登录，不自动写 |
| 查询成功 | 当前权威资源 | 更新 UI，删除已确定意图 |

abort 不能证明服务器没提交。show 恢复只读，不自动再 POST。
两个平台分别测，平台代理与限速功能以当前工具支持为准；必要时用系统断网，
不安装未知抓包证书或拦截真实账号请求。

### 4.2 生命周期证据

记录 load/show/hide/unload 与请求计数。切后台回来不重复提交；
返回详情应重新读服务器 ID；销毁后定时器、listener 和请求任务清理。
隐藏页面仍可能存在组件，React useEffect cleanup 不等于 hide。
升级关闭进程后 demo 服务重置，不能宣称内存交易持久存在；
真实后端环境才验跨客户端持久预约。

### 4.3 真机与隐私

至少两台真机或两个真实平台客户端，记录实际组合，不虚构机型。
截图脱敏，不展示 Token/code/真实位置和照片。权限拒绝可手工输入；
不能为了课堂复现清除用户全部权限或修改真实业务记录。

## 5. 最小操作树

1. 干净冷启：首页搜索、详情 ID、分享冷启与无效 ID。
2. 测试买家登录：收藏隔离、草稿保存、退出后测试卖家登录不见买家草稿。
3. 新商品预约：连点、响应丢失、原键恢复、另一买家冲突、卖家确认售出。
4. 切后台：请求中 hide→show；未知结果保留，show 无额外写。
5. 图片/位置/订阅：正常、取消、拒绝、缺能力，回读当前预约。
6. 升级：V1 草稿→V2，坏 schema、配额满、临时路径丢失。
7. 清理：退出测试会话、停止工具、回收自有文件/测试对象，不删他人资源。

<a id="s6"></a>
## 6. 最小可运行案例

以下实验验证证据格式，不生成“已通过”报告，不调用平台。

完整文件 `device-evidence.mjs`：

```js
export function validateEvidence(value) {
  if (!value || typeof value !== "object" || !["weapp", "tt", "alipay"].includes(value.platform))
    throw new Error("platform");
  if (!["unverified", "tool", "device"].includes(value.level)) throw new Error("level");
  if (typeof value.buildHash !== "string" || !/^[a-f0-9]{64}$/.test(value.buildHash)) throw new Error("build hash");
  if (!Array.isArray(value.results) || value.results.length === 0) throw new Error("results");
  if (value.level === "device" && (!value.device || !value.clientVersion || !value.baseLibrary))
    throw new Error("device metadata");
  for (const result of value.results) {
    if (!result || typeof result.id !== "string" || !["pass", "fail", "unverified"].includes(result.status))
      throw new Error("result");
    if (result.status !== "unverified" && (!result.observed || !result.artifact))
      throw new Error("observation and artifact required");
    if (value.level === "unverified" && result.status !== "unverified") throw new Error("no fabricated pass");
  }
  return value;
}
```

完整文件 `device-evidence.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateEvidence } from "./device-evidence.mjs";
const base = { platform: "weapp", level: "unverified", buildHash: "a".repeat(64),
  results: [{ id: "weak-network-after-commit", status: "unverified" }] };
test("unverified evidence stays unverified, not generated as a pass", () => {
  assert.equal(validateEvidence(base).level, "unverified");
  assert.throws(() => validateEvidence({ ...base, results: [{ id: "x", status: "pass" }] }));
});
test("device records require metadata, actual observation and artifact reference", () => {
  const device = { ...base, level: "device", device: "fictional-test-device",
    clientVersion: "fictional-version", baseLibrary: "fictional-library",
    results: [{ id: "x", status: "pass", observed: "fixture-only", artifact: "fixture-only" }] };
  assert.equal(validateEvidence(device).level, "device");
  assert.throws(() => validateEvidence({ ...device, device: "" }));
  assert.throws(() => validateEvidence({ ...device, results: [{ id: "x", status: "pass" }] }));
});
```

```bash
node --test device-evidence.test.mjs
```

预期 2/2，自然退出。fixture-only 只用测试，不能提交为真实平台报告。
实际录制前用 MP-21 产物摘要填 buildHash，完成每步后记录观察和脱敏 artifact，
没有设备则保留 unverified。停止录制与网络模拟后恢复正常网络。

<a id="s7"></a>
## 7. 邻里集市集成案例

MP-24 dropNextReservation 故障开关明确模拟“服务已提交后响应丢失”，
适合验 UI 提示与原键恢复，不证明真实网络丢包。
真实后端测试在隔离测试商品上提交后中断回包，再恢复网络同键查询；
不能在生产商品上反复创建/取消以制造演示数据。

微信与抖音分别跑操作树；支付宝若只有 build 标为构建通过、客户端未验证。
真实登录与真实上传扩展未接则该行 unverified，而不是用 demo 角色补 pass。
不把 Node record validator 输出当真机报告。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：响应丢失后删除 storage intent，再恢复页面；服务 reserved、
新 key 409，说明恢复协议断裂。修复仅确定成功后清理。
后台回来重复 POST 则检查 show handler、useEffect、用户点击计数和意图，
不要用 debounce 掩盖生命周期副作用。
真机 TLS 失败检查证书链/域名/有效期，不跳过安全检查。

## 9. 课后题

1. 工具弱网等于真机弱网吗？答案：不，客户端、网络栈和权限不同。
2. 格式正确的 JSON 证明测试发生吗？答案：不，必须有真实观察与原始脱敏证据。
3. demo 重启能验交易持久化吗？答案：不能，内存服务重置，真实后端另验。

<a id="s10"></a>
## 10. 实践练习

- 基础：无账号填报告。参考答案：level=unverified，相关场景 status=unverified，
  明确缺 AppID/权限，不能编造工具/机型。
- 进阶：A 请求中退出并登录 B。参考答案：旧 epoch 回调不写 B UI，
  新账号草稿/收藏独立，旧 401 不退出 B。
- 故障注入：分享冷启缺 id。参考答案：显示无效 ID，不能读取上一次 cached detail；
  修复 share path 与页面 config 后在目标平台重测。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 格式测试 2/2，未验证不会自动转 pass。
- [ ] 平台工具/真机分别记录构建、版本和真实观察。
- [ ] 冷热启动、后台、弱网、权限拒绝与升级有证据或明确缺口。
- [ ] 模拟 transport 与真实网络不混，敏感内容已脱敏。

## 12. 常见问题

没有设备能完成教材吗？可以完成源码与可运行实验，但不能勾平台验收。
准确报告限制也是交付要求；下一位评审应能用构建摘要与操作树补完缺口。

## 13. 扩展阅读

[微信开发工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/devtools.html)、
[Taro 调试](https://docs.taro.zone/docs/debug)、
[微信运行机制](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/operating-mechanism.html)。

## 我现在能做到什么

我能设计真实可复现验收，区分模拟失败与平台弱网并准确报告未验证项。

## 单元导航

[上一单元](01-deterministic-layered-tests.md) ·
[下一单元](../11-release/01-package-preview.md) · [本卷](../README.md)
