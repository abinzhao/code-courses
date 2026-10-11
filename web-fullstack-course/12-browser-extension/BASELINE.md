# 版本、业务与证据基线

核验日期：2026-10-12。注册表快照不等于未来永久兼容；复做时同时记录锁文件和实际引擎版本。

| 项目 | 本次选择与证据 |
|---|---|
| Node/npm | 实际 Node 22.22.0，npm 10.9.4；要求 Node ≥22.12 |
| WXT | 注册表当前 0.21.4，要求 Node ≥22、TypeScript ≥5.4 |
| React/React DOM | 当前并固定 19.3.0 |
| React WXT module | 1.2.2，peer WXT ≥0.19.16 |
| TypeScript | 注册表当前 7.0.2；教程保守固定并实际检查 5.9.3，不冒称已验证 7 |
| Vitest/jsdom/Playwright | 5.0.3 / 29.0.0 / 1.64.0 |
| Chrome for Testing | macOS arm64，156.0.8078.4，独立临时 profile |
| Chrome/Firefox manifest | 均显式 MV3；WXT 默认 Firefox MV2，不能漏掉 `manifestVersion: 3` |
| Safari | 本机存在 Safari 应用，但没有完整 Xcode；转换、签名、启用与真实安装未验证 |

`npm view wxt version peerDependencies engines --json`、`npm view react version --json`、
`npm view @wxt-dev/module-react version peerDependencies --json` 是本次核验命令。
安装使用精确顶层版本；由 npm 生成锁文件，保留个人证据。教材不手写锁文件，也不将锁文件放入仓库。
重新下载依赖不保证未来传递依赖字节相同；正文源码逐文件 SHA-256 一致与依赖锁复现是两项证据。

## 业务合同

本地 fixture 不是线上服务；`Item {id,title,priceCents,url}` 是公开 DOM 投影，没有身份、预约状态、
ownerId 或服务端 version。它不能直接作为完整 Listing API 的成功响应。
Web Listing 状态为 `available/reserved/sold`，本卷不增新值。公开字段本身仍不可信，必须 parser。

产品权限、用户动作、系统边界：

| 能力 | 权限/入口 | 不证明什么 |
|---|---|---|
| 临时读取 | toolbar action → activeTab + scripting | 不代表用户登录或同意收集其他页面 |
| 目标持久注入 | optional host + runtime registration | 匹配模式不精确约束端口，源码还要 origin gate |
| 本地备注 | popup/options → validated message → SW → storage.local | local 不是加密秘密库 |
| 保留清理 | alarms → SW → 单写队列 | alarm 不保证精确时钟或持续后台 |
| 导出/删除 | 用户按钮、删除确认 | 下载文件、备份、远端副本不随扩展删除 |
| 侧栏 | Chrome sidePanel / Firefox sidebar_action | 同一 HTML 不证明同一宿主行为 |

## 实证等级

通过：本次 Node 纯逻辑/DOM、双平台构建、产物检查、Chromium 实际安装及业务路径，详见 SELF-CHECK。
实验自动化调用 CDP action 获得 activeTab，再在独立标签页中操作相同 popup bundle；
不冒称工具栏 popup 的屏幕尺寸、关闭行为与宿主焦点全部实测。
未验证：Firefox/Edge/Safari 实际安装、Windows/Linux、商店账号、签名、审核、灰度、上传。
本卷禁止实际商店上传，发布章节只生成本地候选和撤回演练记录。

## 官方依据

- [WXT 入口](https://wxt.dev/guide/essentials/entrypoints)
- [WXT 目标浏览器](https://wxt.dev/guide/essentials/target-different-browsers)
- [Chrome SW 生命周期](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [MDN 多浏览器扩展](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension)
- [Chrome 权限](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- [Apple Safari Web Extensions](https://developer.apple.com/documentation/safariservices/safari-web-extensions)

[卷入口](README.md) · [覆盖矩阵](EXTENSION-COVERAGE.md) · [自检](SELF-CHECK.md)
