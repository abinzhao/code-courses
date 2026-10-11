# 浏览器扩展开发：邻里集市浏览助手

面向已经掌握 DOM、TypeScript、React、HTTP 安全与测试的读者。10 周，每周 18–22 小时。
先用原生 MV3 理解平台合同，再迁到 WXT + TypeScript + React；最终交付可重建的本地浏览助手。
教材只保存 Markdown，应用源码嵌在正文中，练习目录与浏览器 profile 都放在个人工作区。

## 环境与顺序

1. 安装 Node.js ≥22.12、npm，记录实际版本。本次验证 Node `22.22.0`，不冒称 Node 24 已运行。
2. 准备独立 Chrome for Testing/Chromium profile，不使用日常 Chrome profile，不导入任何账号。
3. 从 [EX01](01-platform-model/01-native-mv3-process-origin.md) 的原生四文件开始。
4. 按下表顺序学习；第 6 周按 [EX23](12-capstone/01-complete-project-rebuild.md) 重建全部主线文件，再 `npm install`。
5. 按 [EX24](12-capstone/02-five-path-acceptance.md) 机械提取、哈希比较和验收；关浏览器、停 fixture、清理独立 profile。

课程 origin 固定为 `http://127.0.0.1:4173`，支持 `/items/[a-z0-9-]+`。`localhost`、其他端口、
iframe、非商品页不是等价目标。扩展 `Item` 是公开字段投影，不是 Web 完整 Listing；
若接入 Listing，状态仅允许 `available/reserved/sold`，本卷不增加预约或交易写操作。

## 10 周学习表

| 周 | 单元与顺序 | 本周可观察产出 |
|---|---|---|
| 1 | EX01 → EX02 | 原生安装、进程图、isolated world 实验 |
| 2 | EX07 → EX08 → EX09 | DOM/SPA/iframe、schema 与恶意消息 |
| 3 | EX05 → EX06 → EX11 | 后台终止恢复、alarm、单写者存储 |
| 4 | EX03 → EX04 | popup/options/侧栏、键盘与焦点 |
| 5 | EX10 → EX12 → EX13 → EX14 | sender 授权、迁移删除、权限拒绝/撤销 |
| 6 | EX15 → EX16 → EX17 → EX23 | CSP、资源最小暴露、WXT 完整工程 |
| 7 | EX18 → EX19 → EX20 | 双平台 build、DOM 单测、隔离浏览器五路径 |
| 8 | 复做 EX06/EX12/EX20 | 重启、升级、配额与故障证据 |
| 9 | EX21 → EX22 | 本地候选、撤回演练、Safari 条件路线 |
| 10 | EX24 → 独立修改 | 正文重建、哈希对账、答辩与只读审查 |

## 全篇目录

| 章 | 单元 |
|---|---|
| 01 平台模型 | [EX01 原生 MV3、进程与 origin](01-platform-model/01-native-mv3-process-origin.md) · [EX02 isolated world 与边界](01-platform-model/02-isolated-world-trust-boundaries.md) |
| 02 扩展 UI | [EX03 action 与 popup](02-extension-ui/01-action-popup-lifecycle.md) · [EX04 options、侧栏与键盘](02-extension-ui/02-options-sidepanel-accessibility.md) |
| 03 后台生命周期 | [EX05 同步注册与恢复](03-worker-lifecycle/01-events-reconstruction.md) · [EX06 终止、alarm 与保留](03-worker-lifecycle/02-termination-alarms-retention.md) |
| 04 内容脚本 | [EX07 公开 DOM parser](04-content-dom/01-public-dom-parser.md) · [EX08 iframe、SPA、清理](04-content-dom/02-iframe-spa-observer-cleanup.md) |
| 05 消息与授权 | [EX09 schema 与响应](05-message-contract/01-schema-response-errors.md) · [EX10 sender、tab、origin](05-message-contract/02-sender-tab-origin-authorization.md) |
| 06 数据存储 | [EX11 配额与串行写](06-storage-data/01-quota-single-writer.md) · [EX12 迁移、保留、删除](06-storage-data/02-migration-export-deletion.md) |
| 07 权限 | [EX13 activeTab](07-permissions/01-active-tab-user-gesture.md) · [EX14 optional host 与撤销](07-permissions/02-optional-host-revocation.md) |
| 08 网络与资源 | [EX15 网络、CSP 与认证边界](08-network-csp/01-fetch-csp-no-credentials.md) · [EX16 最小资源暴露](08-network-csp/02-web-accessible-resources.md) |
| 09 WXT 工程 | [EX17 入口与 manifest](09-wxt-build/01-entrypoints-generated-manifest.md) · [EX18 Firefox 构建与配置](09-wxt-build/02-firefox-env-build-differences.md) |
| 10 测试调试 | [EX19 单测与 DOM 集成](10-testing/01-unit-dom-deterministic-tests.md) · [EX20 隔离 E2E](10-testing/02-browser-profile-e2e-debugging.md) |
| 11 候选与发布 | [EX21 包、商店候选与撤回](11-release/01-package-candidate-withdrawal.md) · [EX22 Safari/Xcode 路线](11-release/02-safari-conversion-signing.md) |
| 12 Capstone | [EX23 所有文件与重建](12-capstone/01-complete-project-rebuild.md) · [EX24 测试源码与五路径验收](12-capstone/02-five-path-acceptance.md) |

## 完成边界

只读取目标公开 article 的 ID、标题、整数分与 URL。备注来自扩展 UI，不读页面表单、Cookie、
密码、秘密或浏览历史；不含 `<all_urls>`、远程代码、远程同步、自动购买或商店上传。
默认 activeTab；持久目标主机权限由用户动作可选开启，撤销后旧文档需要刷新。
SW 内存只保存队列调度，不保存权威数据；后台是业务 storage 唯一写入者。

[版本与证据边界](BASELINE.md) · [逐篇覆盖矩阵](EXTENSION-COVERAGE.md) · [实际自检](SELF-CHECK.md)
