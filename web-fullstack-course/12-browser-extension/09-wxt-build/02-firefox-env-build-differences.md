# EX18 Firefox 与构建环境：共享逻辑，不虚构平台一致

## 任务卡

120 分钟；前置 EX17；产出 Chrome/Firefox 两份 MV3 manifest 与运行证据边界。

## 1. 任务背景

扩展 API 相似不等于实现相同。WXT 默认 Firefox 可能是 MV2，Chrome SW 与 Firefox MV3 背景字段、
sidePanel/sidebar、extension URL 都有差异。

## 2. 学习目标

显式 MV3 与目标编译分支；理解 runtime URL、Firefox ID/最低版本；
区分编译、临时安装、签名分发，避免把 `.env` 当秘密保险箱。

## 3. 前置知识与环境

EX23 全工程；`npm run build:chrome`、`npm run build:firefox`。本次仅 Chromium 实际安装，
Firefox/Edge 安装未运行。Firefox 目标 strict_min_version=140，不是已在 140 实测的声明。

<a id="s4"></a>
## 4. 核心机制

WXT manifest callback 接收 browser，选择 Chrome sidePanel permission 或 Firefox gecko 设置；
`import.meta.env.FIREFOX` 做编译分支。Chrome background.service_worker，Firefox background.scripts，
两者仍可 manifest_version=3；不能对 Firefox 硬断言 SW 字段。
Firefox extension base 由 runtime.getURL 获取，不硬写 moz-extension UUID。
gecko id 是候选分发身份设置，不是认证秘密；data_collection_permissions.required=['none']
对应本地无外发合同，商店格式仍须提交时按当前规则核对。
所有构建 env 都可能进入客户端包；没有密码/token `.env`，origin 固定可审计。

## 5. 设计与步骤

共享 domain/React UI；差异只在 manifest 和打开侧栏分支。
不新增多平台通用适配框架。双 build 后比较权限、入口、CSP、资源面；
真实 Firefox 安装后仍需重跑 sender、optional 权限和 sidebar 的宿主路径。

<a id="s6"></a>
## 6. 最小可运行示例

个人工程运行完整只读对账：

```sh
npm run build:chrome
npm run build:firefox
node tests/artifacts.mjs
node --input-type=module -e "import fs from 'node:fs';for(const b of ['chrome','firefox']){const m=JSON.parse(fs.readFileSync('.output/'+b+'-mv3/manifest.json'));console.log(b,m.manifest_version,m.background,m.side_panel??m.sidebar_action)}"
```

预期双平台 MV3，Chrome service_worker 与 side_panel，Firefox scripts 与 sidebar_action。
完整构建配置见 [EX23](../12-capstone/01-complete-project-rebuild.md#file-wxt-config-ts)，完整测试 EX24。
Firefox 若已安装，可独立 profile 在 about:debugging 临时加载 manifest，再按 EX24 手测表；
不要说 Chrome 的 Playwright 脚本可不改直接验 Firefox 扩展。
停止：移除临时扩展、关闭独立浏览器，停止 fixture。

<a id="s7"></a>
## 7. 业务集成

authorize 接收 runtime.getURL base，UI own path 白名单同一；Firefox optional host 和 storage
访问语境仍需真实核对，尤其 Chrome TRUSTED_CONTEXTS 不是通用能力。
Edge 可使用 Chromium 包作为候选，但未运行 Edge，不标记通过。

<a id="s8"></a>
## 8. 错误实验与排查

漏 manifestVersion=3，Firefox 产物可能 MV2；artifacts 应失败，恢复显式字段。
把 chrome-extension 写死在 authorize，Firefox UI 会拒绝；恢复 runtime base。
把 Chrome sidePanel 无条件加入 Firefox，字段/权限不等价；恢复目标分支。
如果 env 变更改变 origin，必须同时更新 parser、permission、CSP、fixture、测试，不只改字符串一处。

## 9. 课后思考与答案

1. build 通过等于可上架？答案：不，安装、签名、商店校验、隐私和审核是独立证据。
2. extension id 可以当用户身份？答案：不，它是扩展分发/运行标识。
3. public env 能装 key？答案：不能，包可读；本卷没有认证与 key。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：比较两个 background。答案：service_worker 与 scripts，不因字段不同否定显式 MV3。
- 进阶：设计 Firefox 运行清单。答案：临时安装、sender、拒绝/撤销、sidebar、导出删除、重启恢复。
- 故障注入：Firefox 打 Chrome API。答案：运行失败可见，目标分支修复，不吞掉异常假装开启。

<a id="s11"></a>
## 11. 验收清单

- [ ] Chrome/Firefox 均显式 MV3 且 artifact 通过。
- [ ] background 和 sidebar 差异明确。
- [ ] runtime URL 未硬编码跨平台 scheme。
- [ ] 无客户端秘密 env。
- [ ] Firefox/Edge 未安装范围如实标记。

## 12. 小结

跨浏览器工程共享数据合同，但宿主能力必须分别证明。

## 13. 扩展阅读

- [WXT 不同浏览器](https://wxt.dev/guide/essentials/target-different-browsers)
- [MDN 跨浏览器](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension)
- [MDN background](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background)

## 我现在能做到什么

能产生两份真实平台候选，并区分配置、运行与签名分发证据。

## 单元导航

[上一页 EX17](01-entrypoints-generated-manifest.md) · [卷入口](../README.md) · [下一页 EX19](../10-testing/01-unit-dom-deterministic-tests.md)
