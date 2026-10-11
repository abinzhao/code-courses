# 浏览器扩展开发课程蓝图

> 状态：仅供方向评审，不创建扩展源码、商店账号或发布任务。
> 技术快照：2026-10-11；实施时重新核验浏览器 API、商店政策和签名要求。

## 培养目标

面向完成 Web 全栈主线的 TypeScript/React 学习者。完成后应能交付一个 Manifest V3 多浏览器扩展，
解释 service worker、content script、页面 UI、消息、存储、权限、CSP、升级和商店发布边界。
目标不是把 Web 页面塞进 popup，而是建立最小权限、可暂停后台、跨浏览器可验证的扩展系统。

## 前置知识

- HTML/CSS、DOM、事件、可访问性和浏览器安全；
- JavaScript/TypeScript、模块、异步、取消和运行时 parser；
- React、状态边界、测试与构建；
- origin、Cookie、CORS、CSRF、XSS、CSP 和对象授权；
- Git、锁文件、制品摘要、发布与回滚；
- 能安装独立浏览器 profile，不在日常 profile 测试开发扩展。

## 技术选型

| 方案 | 优势 | 主要成本 | 结论 |
|---|---|---|---|
| 原生 MV3 + TypeScript + Vite | 平台合同最透明、依赖少 | 入口、打包和多浏览器配置需自建 | 基础机制实验 |
| WXT + TypeScript + React | 入口、manifest、构建和多浏览器工作流集中；可保留原始 manifest 控制 | 增加框架约定与版本依赖 | **默认主线** |
| Plasmo + React | 上手快、生态集成多 | 抽象较厚，平台差异仍需下钻 | 对照评估 |
| 各浏览器独立工程 | 可完全平台化 | 重复实现与发布维护 | 特殊能力路线 |

### 推荐默认

采用 **WXT + TypeScript + React + Manifest V3**。第一阶段先手写一个原生 MV3 最小扩展，理解
manifest、service worker、content script 和消息，再迁入 WXT，避免把框架生成结果当平台知识。

Chrome 将 MV3 作为当前扩展平台；MDN 指出主流浏览器已采用 MV3，但后台实现和 API 兼容仍有
差异。[cite:1][cite:2] Safari 也支持 MV3 web extension，并要求单独检查 manifest、权限和 Xcode
打包。[cite:3][cite:4]

## 平台支持策略

| 平台 | 主线 | 证据 |
|---|---|---|
| Chrome | 首个实现 | unpacked、service worker、权限、商店包 |
| Edge | Chromium 对等回归 | 独立 profile 安装和关键路径 |
| Firefox | 第二引擎 | `browser.*`、后台生命周期、manifest 差异 |
| Safari macOS | 条件主线 | Xcode 包装、签名、权限与真机 |
| Safari iOS/iPadOS | 扩展验收 | App 容器、启用流程和移动页面 |

“构建成功”不能替代每个浏览器实际安装。跨浏览器指导建议同时参考 MDN 和各厂商文档。[cite:1]

## 模块结构

1. 扩展进程模型、manifest、origin 与 isolated world；
2. toolbar action、popup、options、side panel 和 accessibility；
3. service worker 事件、暂停、恢复、alarm 和状态重建；
4. content script 注入、DOM 读取、页面边界和样式隔离；
5. runtime/tabs 消息、schema、sender 验证和错误；
6. storage、配额、同步/本地边界、升级迁移和清理；
7. permissions、host permissions、optional permissions 和 activeTab；
8. 网络请求、Cookie、CSP、资源暴露和用户数据；
9. WXT 入口、manifest override、多浏览器构建和环境；
10. 单测、DOM 集成、浏览器 E2E、profile 与调试；
11. 打包、签名、商店资料、审核、灰度和撤回；
12. Capstone、Firefox/Safari 适配与独立修复。

## 连续项目

“邻里集市浏览助手”：

- 只在用户授权的邻里集市 origin 激活；
- 读取当前商品页公开字段并经 parser 校验；
- 保存本地私有备注和关注列表；
- popup 显示当前页面状态，options 管理保留和导出；
- content script 不读取密码、Cookie、表单秘密或非目标页面；
- service worker 可随时终止，重启后从 storage 重建；
- 写入页面、打开标签或网络同步均需明确用户动作；
- 默认没有 broad host permission，不注入所有网站；
- Firefox 完成等价路径，Safari 作为条件适配。

不提供自动抢购、绕过站点限制、隐藏自动操作或收集浏览历史的功能。

## 权限与安全边界

- 优先 `activeTab` 和 optional host permission；
- manifest 权限逐项映射到用户行为和测试；
- content script 消息从 `unknown` 解析，验证 sender/tab/origin；
- service worker 不依赖全局内存保存业务状态；
- web-accessible resources 只暴露必要静态文件；
- 禁止远程执行代码，遵守扩展 CSP；
- DOM 内容是不可信数据，不进入 HTML sink；
- 日志、截图和 trace 不含页面私人内容；
- storage 导出需用户动作，删除需可复验；
- 扩展卸载不能假装远端数据已删除。

Safari MV3 的 host permission 与 optional permission 仍需在 manifest 和平台 UI 中正确声明与请求。
[cite:4]

## 测试与发布证据

- manifest schema、权限 allowlist 和构建产物扫描；
- service worker 终止/恢复、alarm、升级和迁移；
- content script 在目标/非目标/恶意 DOM 页面；
- 消息非法字段、错误 sender、超时和重复请求；
- popup/options 的键盘、焦点、缩放和高对比度；
- Chrome、Edge、Firefox 独立 profile 安装；
- Safari 构建时记录 Xcode、签名和目标系统；
- 包体、文件清单、hash、source map 和秘密扫描；
- 商店候选绑定 commit，审核/驳回/撤回记录真实；
- 未运行浏览器和商店不标记通过。

## 验收标准

- 原生 MV3 最小实验能解释每个进程和入口；
- WXT 工程生成 Chrome 与 Firefox 可安装包；
- service worker 被终止后不丢关键状态；
- host permission 最小，非目标站点不注入；
- content script/message/storage 都有 schema 与负例；
- popup/options 键盘和可访问名称可用；
- Chrome 与 Firefox 完成同一五条业务路径；
- Safari 路线若纳入主线，必须有真实 Xcode/浏览器证据；
- 制品不含秘密、远程代码或多余 host；
- 发布、灰度、撤回和已知差异可由他人复核。

## 复用关系

| Web 能力 | 扩展复用 | 新增边界 |
|---|---|---|
| DOM/事件 | content script 与页面解析 | isolated world、注入时机 |
| 浏览器安全 | origin、CSP、存储 | 扩展权限和 sender |
| TypeScript/parser | 消息、storage、manifest | 浏览器 API 差异 |
| React | popup/options UI | 短生命周期小界面 |
| 工程化 | Vite、测试、构建、制品 | 多入口、多浏览器打包 |
| 全栈交付 | 版本、回滚、证据 | 商店审核与签名 |

## 建议周数

建议 **10 周，每周 18–22 小时**：

- 1：原生 MV3 与进程模型；
- 2：content script 与消息；
- 3：service worker 与 storage；
- 4：popup/options 与 accessibility；
- 5：权限、CSP 和安全；
- 6：WXT 多入口与构建；
- 7：Chrome/Edge/Firefox E2E；
- 8：升级、迁移、性能和调试；
- 9：Safari 条件适配与发布候选；
- 10：Capstone、撤回演练和答辩。

Safari 不纳入目标时，第 9 周改为 Firefox 深度兼容和独立特性。

## 实施顺序

1. 冻结业务目的、目标 origin、权限和浏览器矩阵；
2. 手写原生 MV3 最小扩展并完成 service worker 恢复测试；
3. 加入 content script、typed message 和 local storage；
4. 建立 popup/options UI 与无障碍门禁；
5. 完成权限、CSP、恶意 DOM 和秘密扫描；
6. 迁入 WXT，比较生成 manifest 与手写基线；
7. 建立 Chrome/Firefox 独立 E2E；
8. 决定 Safari 是否进入主线并完成 Xcode spike；
9. 演练升级、数据迁移、打包和撤回；
10. 独立复审后再生成教程实施计划。

## 风险与决策门

- WXT 生成 manifest 不符合最小权限时，直接 override 或回退原生配置；
- Firefox/Safari API 差异不可隐藏在宽泛 polyfill 中；
- 需要 broad host permission 的需求必须重新审查产品价值；
- 商店 API、签名和自动上传都是外部写操作，需要明确授权。

## Sources

- [cite:1] [MDN: Build a cross-browser extension](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension)
- [cite:2] [Chrome: Migrate to Manifest V3](https://developer.chrome.com/docs/extensions/develop/migrate)
- [cite:3] [Apple: Create web extensions for Safari](https://developer.apple.com/videos/play/wwdc2026/216/)
- [cite:4] [Apple: Managing Safari web extension permissions](https://developer.apple.com/documentation/safariservices/managing-safari-web-extension-permissions)
- [cite:5] [WXT documentation](https://wxt.dev/)
