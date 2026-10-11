# MP-17 Adapter 与条件配置：共享业务、隔离平台

## 任务卡

- 任务：把运行时能力、错误和平台配置放在清楚边界，不制造万能 API。
- 产出：MP-24 三个平台项目配置与 `platform.ts`；新增配置检查 `tests/platform-config.test.ts`。
- 运行：`npm test`、`npm run typecheck`、三平台 build。
- 证据：源配置/输出文件对应，平台无密钥，业务状态不分叉。
- 边界：可编译不表示能力、隐私、账号或审核可用。

## 1. 任务背景

散落在页面的 `if (weapp)` 会使同一业务的错误与状态逐渐分叉。
另一极端把所有平台参数放一个对象，会向微信传支付宝 entityIds，
或者编译成功后在抖音运行 wx。共享领域不等于共享全部平台能力。

## 2. 学习目标

划分 domain/request/storage/adapter/config；冻结版本与条件编译；
核对源配置到目标配置；保持 unknown parser 与领域状态一致；
用测试验证平台差异的显式选择。

## 3. 预备知识

完成 [位置订阅](../08-media/02-location-subscription.md) 与 MP-24 完整基线。
三个构建共享源码，但输出分别是 dist/weapp、dist/tt、dist/alipay。
不要在一个项目根同时导入三个不同平台的 dist。

<a id="s4"></a>
## 4. 核心理论

### 4.1 四种边界

| 层 | 应负责 | 不应负责 |
| --- | --- | --- |
| domain | 整数分、UTC、状态/parser | wx/tt/my、AppID |
| request/storage | 可注入 IO 与错误/迁移 | 页面按钮、平台 secret |
| adapter | 取 code、文件、位置、订阅、能力差异 | 买家授权、商品状态迁移 |
| config | 平台项目文件、包图、构建常量 | 业务身份、生产密钥 |

process.env.TARO_ENV 是构建选择；与业务环境 demo/production 不同。
__DEMO__ 只是常量，必须接到真实独立入口和依赖裁剪才有效；
只把 true 改 false 不会移除默认 mock-service。本卷默认只编译 demo，不称生产包。

### 4.2 配置转换

Taro 源文件：微信 project.config.json；抖音 project.tt.json；
支付宝 project.alipay.json。平台工具常见输出名分别 project.config.json、
project.config.json、mini.project.json。要以实际 runner 输出核对，而非凭源文件猜。
公开 AppID 可以分平台，AppSecret 和私钥路径不进入客户端源码/config。

### 4.3 条件编译与能力探测

构建期选择隔离平台代码和包体；运行期 canIUse/版本检查确认基础库能力。
二者都不能代替账号准入。若 API 类型不准确，建立最小原生 typed wrapper，
不 `as any`、不关闭 strict、不发无意义参数。不同返回结构分别 parser。

## 5. 可替换接线

MP-24 platform 返回业务友好结果，realTransport 接 Taro.request。
真实业务入口须去掉 demo role 登录与故障按钮，调用平台 code 后端交换；
每个平台用独立 login adapter。当前支付宝/H5 真实登录明确拒绝，
教学内存角色登录可运行但不是该平台账号身份。

<a id="s6"></a>
## 6. 最小可运行案例

先完整创建 MP-24 §6 的 config/index.ts、三项目 JSON 和 platform.ts。
新增完整文件 `tests/platform-config.test.ts`：

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));
function record(value: unknown): Record<string, unknown> {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}
test("platform source config is explicit and has no private credentials", () => {
  const weapp = record(read("project.config.json"));
  const tt = record(read("project.tt.json"));
  const alipay = record(read("project.alipay.json"));
  assert.equal(weapp.compileType, "miniprogram");
  assert.equal(weapp.appid, "touristappid");
  assert.equal(tt.appid, "");
  assert.equal(alipay.enableAppxNg, true);
  for (const path of ["project.config.json", "project.tt.json", "project.alipay.json", "config/index.ts"]) {
    const text = readFileSync(path, "utf8");
    assert.doesNotMatch(text, /(?:appsecret|privateKey|BEGIN PRIVATE KEY)/i);
  }
});
test("business domain has no platform runtime dependency", () => {
  const source = readFileSync("src/domain.ts", "utf8");
  assert.doesNotMatch(source, /@tarojs|\bwx\.|\btt\.|\bmy\./);
  assert.match(source, /"available" \| "reserved" \| "sold"/);
  assert.match(source, /"pending" \| "confirmed" \| "cancelled"/);
});
```

```bash
npm test
npm run typecheck
npm run build:weapp
npm run build:tt
npm run build:alipay
```

预期新增 2 项通过，三个输出目录分离，构建进程结束自然退出。
进一步检查输出平台配置和页面文件，记录工具版本与配置摘要；
不执行 taro preview/upload，不打开真实账号凭据。
生成产物可保留用于审查，只清自己的 dist，不能清全局 npm 缓存。

<a id="s7"></a>
## 7. 邻里集市集成案例

新增平台不会复制 Listing parser 或改变预约状态。微信与抖音 demo 同样走
createRequest→parsePage/parseReservation→同步教学服务。
订阅、位置、图片失败只改变能力提示，不改 available/reserved/sold。
服务错误 code/requestId 在请求层归一，不在每个页面写平台专用错误 body。

生产 transport 选择在根入口完成，平台 session exchange 仍交同一业务后端，
服务端按 platform/AppID 映射身份。跨平台收藏/草稿默认仍本地，
不要因两个平台 userId 文本相同就声称云同步。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：把 project.tt.json 改名 project.config.json，抖音可能使用错误 AppID，
源配置测试和输出检查应暴露缺配置。将 wx 放进 domain，平台依赖测试失败。
编译报 subscribe Option 不满足时先核对安装 .d.ts 与官方 API，
用精确 wrapper 修复，不塞 entityIds 给微信。

## 9. 课后题

1. 构建平台能代表服务端环境吗？答案：不能，weapp/tt 与 demo/production 是两轴。
2. 配置测试通过证明发布吗？答案：不，只验证本地源码规则。
3. 业务层能读 canIUse 吗？答案：应从 adapter 获得结果，不依赖平台全局。

<a id="s10"></a>
## 10. 实践练习

- 基础：tt 输出独立目录。参考答案：检查 outputRoot 由 TARO_ENV 构造，不覆盖 weapp。
- 进阶：平台返回错误结构不同。参考答案：各 adapter parser 转为统一错误，
  仍保留平台脱敏码，业务模块不导入原生类型。
- 故障注入：关闭 __DEMO__ 后检查产物。参考答案：若仍含演示角色与 mock-service，
  不标生产通过；建立独立入口和依赖裁剪后重新检查，不只搜索常量值。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 2 个配置测试及三平台 build 记录真实结果。
- [ ] 平台输出/配置名经实际检查，源与目标不混淆。
- [ ] 业务 parser 无平台依赖，secret/私钥不进入产物。
- [ ] 未适配能力明确拒绝，未把编译当账号/真机证据。

## 12. 常见问题

为什么不自建跨平台编译层？Taro 已承担组件与模板转换，本卷只补必要 adapter。
新增框架会增加插件、基础库、包体和审核维护成本，不属于当前目标。

## 13. 扩展阅读

[Taro 项目配置](https://docs.taro.zone/docs/project-config/)、
[Taro 环境判断](https://docs.taro.zone/docs/envs)、
[Taro config](https://docs.taro.zone/docs/config/)。
2026-10-12 官方核对过源项目配置三种文件名。

## 我现在能做到什么

我能把平台差异关在 adapter/config 中，核对实际输出并保持共享业务合同。

## 单元导航

[上一单元](../08-media/02-location-subscription.md) ·
[下一单元](02-douyin-alipay-h5.md) · [本卷](../README.md)
