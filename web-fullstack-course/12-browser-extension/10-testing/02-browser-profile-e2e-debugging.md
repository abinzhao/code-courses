# EX20 隔离浏览器 E2E：五路径与证据边界

## 任务卡

150–180 分钟；前置 EX19、生产 build；产出真实安装、五路径日志和清理证明。

## 1. 任务背景

单测不能证明 scripting 权限、真实 sender 或 SW stop/reload。
自动化必须安装真正的包，又不能使用日常 profile 或真实账号。

## 2. 学习目标

用 Chrome for Testing + persistent 临时 profile 安装扩展；
触发真正 action、验证业务 bundle、停止 SW；
分开自动化覆盖与 popup/侧栏/权限弹窗手测。

## 3. 前置知识与环境

Playwright 1.64.0，实际 Chromium 156.0.8078.4，完整脚本在 EX24。
需要支持扩展加载的 Chromium/Chrome for Testing；品牌 Chrome 的加载开关策略可能不同。
设置 `CHROMIUM_PATH` 为个人安装的可执行文件，不使用用户 profile 路径。

<a id="s4"></a>
## 4. 核心机制

launchPersistentContext 加 `--load-extension`、`--disable-extensions-except`，profile 用 mkdtemp。
CDP Extensions.triggerAction 是本次测试浏览器的实验调试能力，
需 `--enable-unsafe-extension-debugging`，只用于隔离测试，不作为生产启动建议。
CDP 必须使用 type=tab target ID；普通 page target 并非该方法所需。
Playwright 不把宿主 popup 作为常规 page；脚本触发真实 action 获 activeTab，
再在 tab 打开相同 popup.html 测 bundle，这不证明工具栏尺寸/关闭/焦点全部通过。
SW.stopWorker 后 options.reload 重新消息唤醒，证明持久恢复；不是自然空闲时长测试。

## 5. 设计与步骤

P1 公共读取与文本 sink；P2 保存与 options 同步；P3 SW 停止恢复；
P4 用户导出；P5 确认删除 durable={}。
额外验证 content 注入、iframe 排除、SPA、真实 sender DELETE 拒绝、alarm 注册和基本键盘焦点。
失败必须在 finally 关 context、fixture、清理本次生成 profile；不能留下运行 session。

<a id="s6"></a>
## 6. 最小可运行示例

完整代码见 [tests/browser.mjs](../12-capstone/02-five-path-acceptance.md#file-tests-browser-mjs)。
个人工程执行：

```sh
npm run build:chrome
CHROMIUM_PATH="/absolute/path/to/chrome-for-testing" npm run e2e
CHROMIUM_PATH="/absolute/path/to/chrome-for-testing" node tests/native.mjs
```

路径是明确占位值，替换为自己已安装浏览器。若 Playwright 默认浏览器支持，也可不设变量；
本次实际显式 executablePath，证据在 SELF-CHECK。
预期五路径和 native PASS；命令结束 context/server 均关闭，profile 由 finally 删除。
手测用 `HEADED=1` 运行主线，但仍不自动证明全部宿主 UI。

<a id="s7"></a>
## 7. 业务集成

测试 fixture 只绑定 127.0.0.1:4173，恶意形状标题不是秘密数据。
sender DELETE 从真实 isolated executeScript 发起，后台拒绝；
SPA 后 status 更新，保存使用先前已读 Item 是用户当前明确选择，不自动替换成新页商品。
导出只检查下载文件名，内容完整性/人工文件保护仍可另外验收。

<a id="s8"></a>
## 8. 错误实验与排查

用 page target 调 triggerAction 失败，检查 Target.getTargets filter=tab，不重复猜 target；
不支持 CDP 能力则用独立浏览器手点 action并记录，不伪造权限成功。
若端口占用，只查 4173 的监听，不列全部进程环境；停止自己启动的 fixture。
popup Read 失败核对 target active、action、origin、script result；SW 版本超时查扩展是否安装。
连续两次同类失败应停试错、总结事实，不接日常 profile 兜底。

## 9. 课后思考与答案

1. headless 安装能证明 popup 关闭？答案：不能，宿主文档视觉/焦点需要另手测。
2. stopWorker 能证明自然休眠？答案：证明强制停止恢复，不证明自然空闲时间。
3. 测试能上传商店吗？答案：不能，本卷只有本地候选。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：记录 P1..P5。答案：每条日志对应一个断言，不只写最终 PASS。
- 进阶：补手测表。答案：popup 关闭重开/尺寸、侧栏动作、权限拒绝/同意/撤销、阅读器。
- 故障注入：移除 origin gate。答案：单测/边界验收应失败；修复后重跑，而非更换正常 fixture 掩盖。

<a id="s11"></a>
## 11. 验收清单

- [ ] 真实包安装在独立临时 profile。
- [ ] 五条路径各有断言与日志。
- [ ] content/frame/SPA/真实 sender 额外断言通过。
- [ ] finally 关闭 browser/server/profile。
- [ ] 未覆盖宿主 UI、Firefox/Safari 明确列出。

## 12. 小结

E2E 的价值来自真实平台与准确覆盖范围，不来自一个含糊的“浏览器通过”。

## 13. 扩展阅读

- [Playwright Chrome Extensions](https://playwright.dev/docs/chrome-extensions)
- [Chrome 扩展 Puppeteer 测试](https://developer.chrome.com/docs/extensions/how-to/test/puppeteer)
- [CDP Extensions](https://chromedevtools.github.io/devtools-protocol/tot/Extensions/)

## 我现在能做到什么

能在不碰日常数据的条件下安装和验证真实扩展，并准确报告自动化边界。

## 单元导航

[上一页 EX19](01-unit-dom-deterministic-tests.md) · [卷入口](../README.md) · [下一页 EX21](../11-release/01-package-candidate-withdrawal.md)
