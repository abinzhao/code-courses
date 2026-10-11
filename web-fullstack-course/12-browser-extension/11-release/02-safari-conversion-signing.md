# EX22 Safari：转换、容器 App、签名与真实安装路线

## 任务卡

180 分钟起；前置 EX21、macOS；产出能力差异表与条件路线。本机无完整 Xcode，转换/签名/安装未验证。

## 1. 任务背景

Safari Web Extension 需要 Apple 容器 App 与平台工程，不是把 Chrome zip 改名。
Chrome sidePanel、后台生命周期、权限提示和发布方式都要重新判断。

## 2. 学习目标

检查完整 Xcode 前提；用官方 converter 产生候选工程；
审查不支持项、App/extension target、签名与启用流程；
在缺前提时停止而不是冒称 Safari 已通过。

## 3. 前置知识与环境

需要支持目标 macOS/Safari 的完整 Xcode、已接受许可、可用开发团队/签名条件。
Command Line Tools 不等于 Xcode。本次 `xcodebuild -version` 报 active developer directory 是 CLT，
因此以下是读者条件路线，不是本次执行成功日志。无账号、不读取证书或私钥。

<a id="s4"></a>
## 4. 核心机制

converter 读取 Web Extension 生成 Xcode app + extension 工程，并可能列出 unsupported manifest keys；
“生成工程”不等于 API 兼容。Safari 容器 App、Web Extension target 各有 bundle ID 与签名设置。
主线 App 对非 Firefox 分支调用 Chrome sidePanel，不能直接当 Safari 适配完成；
Safari 候选应去掉 sidePanel 入口/权限和按钮，保留 popup/options，或另按平台官方能力设计。
后台持久/唤醒、optional permission、scripting、storage、下载均需能力与真实安装测试。
本卷不偷偷生成第三平台源码，明确只交 Chrome/Firefox 完整编译主线。

## 5. 设计与步骤

检查工具→转换 Chrome 生产目录到个人 Safari 项目→记录 converter 警告→逐项适配源配置/UI→
重新构建转换→检查 targets/签名→本地运行容器→Safari 设置启用→独立测试→关闭移除。
不能通过删警告、忽略 unsupported 字段来“通过”；先定义不支持能力的用户可见降级。

<a id="s6"></a>
## 6. 最小可运行示例

有完整 Xcode 的读者先运行只读检查：

```sh
xcode-select -p
xcodebuild -version
xcrun --find safari-web-extension-converter
xcrun safari-web-extension-converter --help
```

检查通过且已自行确认本地生成工程的范围后，个人目录执行官方转换候选：

```sh
xcrun safari-web-extension-converter .output/chrome-mv3 \
  --project-location ../neighbor-market-safari \
  --app-name "Neighbor Market Helper" \
  --bundle-identifier "org.example.neighbor-market" \
  --no-open
```

以本机 `--help` 支持参数为准；预期产生工程与兼容提示，不能预期零警告。
源包来自 EX23/24 双构建主线；转换器生成的工程不手写进教材。
停止：若工具缺失立即记录 blocked；成功生成则只关自己打开的 Xcode/Safari，
不修改全局 `xcode-select` 或安装系统组件来强行继续。

<a id="s7"></a>
## 7. 业务集成

在 Xcode 检查 app 与 extension target 的 Signing & Capabilities，由用户选择合法开发团队；
不把证书/私钥/密码写教程。Build & Run 容器后，按当前 Safari Settings→Extensions 启用目标。
若本地未签名测试需要 Develop 开关，应在独立测试条件下由用户确认，结束恢复；
这不是实际分发签名路线。发布需 Apple Developer、archive、适用商店/公证流程和审核。
五路径重跑外，还需 Safari 权限提示、宿主 popup、容器卸载后扩展状态。

<a id="s8"></a>
## 8. 错误实验与排查

只有 CLT 时 converter/xcodebuild 不可用，原因是前提不满足；停止，不把 Chrome 测试代替。
converter 警告 sidePanel unsupported，回源适配能力而非手删生成工程字段。
签名错误核对两个 targets 和 bundle IDs/团队；不读出证书内容、不禁用系统安全冒充可分发。
扩展未出现先核对容器运行与 Safari 启用，不重新上传商店“试试看”。

## 9. 课后思考与答案

1. Safari converter 是兼容层吗？答案：是工程转换入口，不自动补齐 API。
2. 本地 unsigned 启用等于可分发？答案：不，签名/审核是独立流程。
3. 为什么本卷没写“Safari PASS”？答案：无完整 Xcode 与真实安装证据，必须保留 blocked。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：检查 xcodebuild。答案：完整版本输出才继续；CLT 报错则 blocked。
- 进阶：写 Safari 降级表。答案：移除 sidePanel、保留 popup/options，再逐 API 核对，不冒称原包完全兼容。
- 故障注入：bundle ID 冲突。答案：本地检查 target 设置，按合法唯一 ID 修复，未经授权不签名发布。

<a id="s11"></a>
## 11. 验收清单

- [ ] 工具前提明确，缺失停止。
- [ ] converter 警告逐项登记，不忽略。
- [ ] 容器/扩展 targets、签名、启用分开。
- [ ] Chrome sidePanel 不假装 Safari 支持。
- [ ] 本次转换/签名/安装/上架全部标未验证。

## 12. 小结

第三平台路线必须从平台容器和能力差异出发；诚实 blocked 比假跨平台成功更有用。

## 13. 扩展阅读

- [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions)
- [转换 Web Extension](https://developer.apple.com/documentation/safariservices/converting-a-web-extension-for-safari)
- [Xcode 签名](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)

## 我现在能做到什么

能给 Safari 写出可核对的条件路线，并辨别工程生成、真实运行和分发证据。

## 单元导航

[上一页 EX21](01-package-candidate-withdrawal.md) · [卷入口](../README.md) · [下一页 EX23](../12-capstone/01-complete-project-rebuild.md)
