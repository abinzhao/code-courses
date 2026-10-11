# EX21 候选包、商店材料与撤回：只在本地演练

## 任务卡

150 分钟；前置 EX20；产出双平台 zip、权限/隐私说明、候选记录与撤回演练。禁止实际上传。

## 1. 任务背景

build 成功不等于发布成功。包必须包含正确版本、入口与权限，商店说明必须与采集行为一致；
发现扩大权限或删除缺陷时，需要先停止分发，而不是用旧测试报告解释。

## 2. 学习目标

生成并审计候选 zip；准备 Chrome Web Store/Firefox AMO 材料；
分开源码回退、商店撤回和用户数据迁移，定义上线阻断项。

## 3. 前置知识与环境

EX23 全工程、EX24 完整测试；本地 `npm run zip:chrome` / `zip:firefox`。
没有商店账号与签名证据，禁止调用上传、提交审核或发布 API。
本地回环 origin 是教学候选，不声称可作为实际面向用户的商店产品直接上架。

<a id="s4"></a>
## 4. 核心机制

候选以源码 hash、依赖锁、工具版本、测试日志、包 hash 绑定。
zip 需要 manifest 在根、入口可解析、无测试/fixtures/native/dev HMR/秘密/源映射；
权限说明 storage/alarms/activeTab/scripting/optional target/sidePanel 与实际一致。
Chrome 商店需账号、身份/费用与当前审核材料；AMO 签名/未列出分发规则另核对。
Firefox 源码构建说明要提供真实重建步骤，不能只交混淆包。
撤回候选是本地停止分发；已发布版本禁用/下架不自动清用户数据；
修复一般需要更高版本的新包，不能假设商店接受同版本覆盖或降级。

## 5. 设计与步骤

freeze→test→dual build→artifact→zip→hash→只读候选记录。
商店材料说明只采公共 Item，notes 本地、不外发、保留下一次唤醒、导出副本需用户保护。
截图仅来自独立 fixture，不放真实账号；候选权限扩大、删除不真空、测试失败即阻断。

<a id="s6"></a>
## 6. 最小可运行示例

个人工程本地命令：

```sh
npm run check
npm test
npm run build:chrome
npm run build:firefox
node tests/artifacts.mjs
npm run zip:chrome
npm run zip:firefox
find .output -maxdepth 1 -name '*.zip' -print
```

macOS 对 Chrome/Firefox **运行包**执行 `unzip -l "实际包路径"` 与
`shasum -a 256 "实际包路径"`，预期 manifest 根、11 个生产文件，无测试源码；
文件名以 WXT 实际输出为准，不硬猜。WXT 同时生成的 `sources.zip` 是源码档案，
另行核对文件清单和缺失项，不套用运行包的 11 文件规则，也不加载为扩展。
源码和测试完整在 EX23/24，SELF-CHECK 记录运行包与源码档案各自的结果。
命令均本地，无上传；结束关测试 browser/server，zip 留个人候选目录，不进教材仓库。

<a id="s7"></a>
## 7. 业务集成

候选记录写：版本 1.0.0、目标回环、no remote sync、权限表、hash、测试范围、未验证平台、阻断项。
撤回演练在个人记录将候选标记 withdrawn，独立浏览器移除扩展；
不实际撤商店、不 git revert 他人改动、不部署、不删除已导出用户文件。
未来真实产品换 origin 必须同步 parser/CSP/permission/fixture/test/隐私说明。

<a id="s8"></a>
## 8. 错误实验与排查

在个人 manifest 增必选 host，artifact 失败→候选阻断；恢复配置后重构建。
把测试文件放公开 asset 目录，zip 列表出现污染→回到源目录规则修复，不手删 zip 内文件。
DELETE 未清持久 key→撤回候选，修源码并重跑五路径，生成新候选记录。
商店提示字段变化属于发布时官方规则核对，不伪造审核通过。

## 9. 课后思考与答案

1. 下架会删用户 notes？答案：不会自动保证，需明确数据删除入口与版本策略。
2. 本地 zip 通过等于签名？答案：否，签名、审核与安装是不同阶段。
3. 回退源码会反向迁移 v2？答案：不会；旧版本读不了新 schema 时可能失败，必须兼容设计。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：列包内容。答案：仅生产 manifest/HTML/JS/CSS 共本次11文件，无 fixture/tests。
- 进阶：写商店权限理由。答案：每项对应用户可观察功能，不写泛泛“改善体验”。
- 故障注入：发现隐私说明说无存储。答案：与 local notes 冲突，阻断并修说明，不能直接发布。

<a id="s11"></a>
## 11. 验收清单

- [ ] 双 zip 仅本地生成，hash 与文件表存在。
- [ ] 包无测试、secret、远程代码与源映射。
- [ ] 隐私/权限与真实行为一致。
- [ ] 撤回演练不操作商店与用户数据。
- [ ] 签名/审核/上架未验证明确。

## 12. 小结

发布候选是带证据的交付物，撤回是控制分发风险，不是数据库回滚。

## 13. 扩展阅读

- [Chrome 发布](https://developer.chrome.com/docs/webstore/publish)
- [Chrome 隐私](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Firefox 分发](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- [WXT 发布](https://wxt.dev/guide/essentials/publishing)

## 我现在能做到什么

能生成可审计本地候选和撤回记录，准确区分包、签名、审核和用户数据生命周期。

## 单元导航

[上一页 EX20](../10-testing/02-browser-profile-e2e-debugging.md) · [卷入口](../README.md) · [下一页 EX22](02-safari-conversion-signing.md)
