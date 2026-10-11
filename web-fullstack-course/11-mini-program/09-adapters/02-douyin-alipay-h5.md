# MP-18 抖音、支付宝与 H5：第二平台必须独立证明

## 任务卡

- 任务：从微信迁移到抖音，记录差异；支付宝做第三平台适配，H5 仅降级对照。
- 产出：平台策略实验 `platform-policy.mjs` 与测试、差异登记、三平台构建。
- 运行：Node 策略测试；MP-24 三平台 build。
- 证据：真实登录不可伪造、未适配订阅可回读、平台配置不同、业务合同相同。
- 边界：三平台 demo build 不代表三平台真实账号登录或发布通过。

## 1. 任务背景

Taro 能构建 tt，不说明微信按钮、隐私协议、订阅模板与登录返回结构会自动迁移。
第二平台的价值是独立暴露假设：实际导航/恢复、相机权限、网络域名、会话和包体。
把微信录屏换标题当抖音证据，会遗漏最重要的适配成本。

## 2. 学习目标

按功能逐项登记实现、降级和缺口；保持核心交易合同；识别平台身份不能直接互换；
第三平台与 H5 不隐藏缺登录/订阅能力；设计可验证的策略选择。

## 3. 预备知识

完成 [adapter/config](01-adapter-platform-config.md)，已冻结 Taro 4.3.0 插件同版。
无需新增跨端框架。平台工具与账号由学习者合法取得，教材不保存 AppSecret 或登录 Cookie。

<a id="s4"></a>
## 4. 核心理论

### 4.1 平台适配的五列

| 能力 | 微信主线 | 抖音第二平台 | 支付宝练习 | H5 对照 |
| --- | --- | --- | --- | --- |
| 构建 | weapp 插件 | tt 插件 | alipay 插件 | 本卷未配置 H5 插件，不宣称 build |
| 页面/返回 | 微信客户端记录 | 独立记录 | 独立记录 | 浏览器 history 不等于页面栈 |
| 真实 code | Taro.login→微信后端 | Taro.login→抖音后端 | 专用 authCode adapter，默认未接 | 不用小程序 code |
| 隐私/位置/图片 | 微信声明与权限 | 抖音声明与权限 | 支付宝声明与权限 | 浏览器许可/HTTPS 另套规则 |
| 订阅 | 微信模板 wrapper | 默认回读，真实订阅另接 | 默认回读，独立模板接口 | 不伪造平台订阅 |

这里的“默认未接”是可见产品限制，不是教程占位实现。核心 demo 角色登录仍可演练交易，
但绝不能标成真实平台身份验证。

### 4.2 身份与共享业务

抖音 code 不发微信 code2Session，支付宝 authCode 不用 `Taro.login` 假造 code。
后端按 platform/AppID/provider subject 唯一映射，OAuth scope、签名与错误分别验证。
同设备同昵称不等于同用户；跨平台合并须可信绑定流程。
Listing 和 Reservation 不因平台改变状态或金额单位。

### 4.3 H5 边界

浏览器没有小程序逻辑/视图桥与相同生命周期。H5 的 DOM、CORS、cookie、
文件输入与权限策略不能证明小程序成立。若开发 H5，增加明确认证 adapter，
不返回 demo user 作为“兼容登录”。本卷仅策略对照，不补未要求的 H5 完整应用。

## 5. 差异登记格式

每项记录 `平台/工具/基础库/账号准入/实现入口/正常路径/失败路径/降级/证据位置`。
状态仅用“源码已实现、构建通过、工具通过、真机通过、未验证”，不写笼统 supported。
第二平台必须独立完成冷启分享、预约响应丢失、离线草稿和权限拒绝。

<a id="s6"></a>
## 6. 最小可运行案例

独立实验，不向 Capstone 注入虚构支付宝登录。

完整文件 `platform-policy.mjs`：

```js
export function policy(platform) {
  switch (platform) {
    case "weapp": return { code: "login", subscription: "weapp-template", fallback: "read-reservations" };
    case "tt": return { code: "login", subscription: "not-integrated", fallback: "read-reservations" };
    case "alipay": return { code: "authCode-required", subscription: "not-integrated", fallback: "read-reservations" };
    case "h5": return { code: "web-auth-required", subscription: "unsupported", fallback: "read-reservations" };
    default: throw new Error("unknown platform");
  }
}
export async function platformCode(platform, adapters) {
  const selected = policy(platform);
  if (selected.code !== "login") throw new Error(`${selected.code}: no fabricated identity`);
  const login = adapters[platform];
  if (typeof login !== "function") throw new Error("missing login adapter");
  const result = await login();
  if (!result || typeof result.code !== "string" || !result.code) throw new Error("invalid platform code");
  return { platform, code: result.code };
}
```

完整文件 `platform-policy.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { policy, platformCode } from "./platform-policy.mjs";
test("code belongs to selected platform; third platform and H5 never fabricate", async () => {
  let calls = 0;
  const adapters = {
    weapp: async () => ({ code: "fictional-wx" }),
    tt: async () => { calls++; return { code: "fictional-tt" }; }
  };
  assert.deepEqual(await platformCode("tt", adapters), { platform: "tt", code: "fictional-tt" });
  assert.equal(calls, 1);
  for (const platform of ["alipay", "h5"])
    await assert.rejects(platformCode(platform, adapters), /no fabricated/);
  await assert.rejects(platformCode("weapp", { weapp: async () => ({}) }), /invalid/);
});
test("unsupported subscription falls back without changing business state", () => {
  assert.equal(policy("tt").fallback, "read-reservations");
  assert.equal(policy("alipay").subscription, "not-integrated");
  assert.equal(policy("h5").subscription, "unsupported");
  assert.throws(() => policy("unknown"));
});
```

```bash
node --test platform-policy.test.mjs
```

预期 2/2，自然退出，无平台登录。再从 MP-24 项目运行：

```bash
npm run build:weapp
npm run build:tt
npm run build:alipay
```

检查各目标实际配置文件和页面，不运行未定义的 H5 script。
导入对应工具后点击核心 demo 角色流程；另建真实登录验收，不用 demo Token 替代。
退出测试角色、停止工具与 watch；不撤销或删除用户平台账号。

<a id="s7"></a>
## 7. 邻里集市集成案例

抖音适配首轮只验证核心 demo：列表/搜索→详情→角色登录→草稿/发布→预约恢复→取消/确认。
第二轮真实接线：login adapter→抖音交换后端→Token→对象授权与幂等。
第三轮图片、位置和分享事件按平台记录；订阅未接时保留读取预约路径。

支付宝 build 验证模板/config，不代表 authCode 已接。真实 adapter 依据支付宝官方授权
scope、后端 code 交换/签名与身份 parser，不能把微信 templateId 改名即称迁移完成。
页面如需专用事件可拆平台文件，domain 与服务器合同保持一致。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：platformCode 全部返回 weapp code，tt 测试断言 platform/code 不匹配。
把 H5 缺能力改为 fictional code 会造成假登录，应保持明确失败。
工具问题先核对产物平台、AppID、基础库、权限声明与官方错误；
不能将抖音定位报错统一归因微信隐私协议。

## 9. 课后题

1. tt build 通过就是第二平台完成吗？答案：还缺工具、真机、真实后端和审核证据。
2. 支付宝可以复用微信业务 Token 吗？答案：业务服务可统一，但登录身份需可信绑定；
  不能直接交换平台 code 或信客户端映射。
3. H5 回退能自动伪登录吗？答案：不能，需独立 Web 认证，未接就明确失败。

<a id="s10"></a>
## 10. 实践练习

- 基础：tt 无订阅。参考答案：页面显示当前未适配，并可刷新预约，无业务状态修改。
- 进阶：支付宝完成真实登录。参考答案：新增专用 adapter、受信后端交换与响应 parser，
  记录合法测试账号/错误与撤销；没有这些证据只标构建。
- 故障注入：第二平台分享参数丢 id。参考答案：冷启页面显示无效 ID，不取缓存当商品，
  修复卡片路径和目标页面配置，录第二平台独立证据。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 2 项策略测试与三平台构建有记录。
- [ ] 第二平台独立跑业务路径，不复用微信截图。
- [ ] 支付宝真实登录/订阅缺口明确，H5 不被称为小程序验收。
- [ ] 平台差异表包含失败、降级与证据层级，无假成功。

## 12. 常见问题

官方文档可能重定向，链接可达不等于字段最新。实施时核对安装版本类型、
平台工具能力与对应账号后台；文档和实际冲突记录差异，再决定 wrapper 或专用页面。

## 13. 扩展阅读

[抖音开发路径](https://partner.open-douyin.com/docs/resource/zh-CN/mini-app/develop/overview/learning-path)、
[支付宝开发文档](https://opendocs.alipay.com/mini/developer)、
[Taro 项目配置](https://docs.taro.zone/docs/project-config/)。

## 我现在能做到什么

我能独立适配并报告第二平台，区分第三平台构建、真实账号能力与 H5 降级。

## 单元导航

[上一单元](01-adapter-platform-config.md) ·
[下一单元](../10-testing/01-deterministic-layered-tests.md) · [本卷](../README.md)
