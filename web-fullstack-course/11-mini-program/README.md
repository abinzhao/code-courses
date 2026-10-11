# 小程序：从原生运行时到双平台交付

面向已掌握 JavaScript、React、TypeScript 与 HTTP 的学习者。先理解微信原生逻辑层与视图层，
再使用 Taro React TypeScript 构建邻里集市。抖音是第二平台，支付宝是独立适配练习；
H5 仅用于降级对照，不能替代任何小程序客户端验收。

## 目标与边界

完成本卷应能解释页面隐藏与销毁的区别，拒绝非法响应，隔离用户草稿，处理预约结果不确定，
并以真实工具、客户端和发布证据说明平台交付边界。

- 金额使用非负安全整数 `priceCents`；时间持久化为严格 ISO UTC。
- `Listing` 状态为 `available/reserved/sold`；`Reservation` 为
  `pending/confirmed/cancelled`，遵循[共享契约](../00-guide/project-contract.md)。
- 不接支付；离线只存草稿，不宣布预约成功。收藏是本地偏好，不宣称服务端同步。
- 生产登录通过后端交换平台 code，后端保存平台会话并签发业务 Token；客户端不含 AppSecret。
- Capstone 默认使用进程内教学服务，完成列表、详情、搜索、分享、登录、草稿、发布、预约、
  同键恢复、取消和卖家确认。确认同时将商品转 sold；真实数据库、对象授权、平台会话与上传服务另有明确扩展契约。
- 本仓库仅存 Markdown。源码、锁文件、依赖和构建产物都在个人练习目录。
- 原 Web 后端是 Cookie 会话；Bearer、auth/exchange、auth/me/logout 与按键恢复
  是本卷明确的后端扩展，不是把 demo 的 base URL 改为 Web 服务即可互通。

## 显式恢复交互

- 预约响应未知：点击“预约或恢复原预约”，查询原键，404 仍同键同 payload 重试；
  后台返回不写请求，未知命令不能直接结束或换新键。
- 首次预约确定拒绝：先“结束已拒绝意图”，回读最新版本，再显式点击预约开始新意图。
  例如 reserved v2 冲突、取消后 available v3，不能拿旧键与 v2 循环重试。
- 发布已有回执：显示 publishedId，草稿清理失败只点“重试已发布草稿清理”，不再 POST；
  清理确认后“开始下一份草稿”。回执损坏时停止写入，可修复后“重读草稿与回执”。
- 发布在途/未知：owner 的单草稿槽共享 holder 在 POST 前建立，持久操作标记跨重挂载、
  退出和重启保留；未知态只“查看发布人工核对说明”，不因恢复网络再发 create。
  成功回执先按捕获 owner 持久保存，卸载或切换身份仅禁止旧 UI 更新与草稿清理。
  正常存储可重启恢复回执；回执写失败仅保留同进程成功知识与持久未知标记。
- 退出清理未确认：再次“退出并清理当前用户草稿”仍处理原 owner 键；
  全部数据与待清理日志确认后才允许新登录，重启不能绕过阻塞。
- 发布页同会话返回保留未保存编辑；初进或身份 epoch 变化才读取持久草稿。
  图片选择完成只合并最新编辑和最新选择，旧会话回调不写新账号界面。

## 顺序与十二周

每周建议 18–22 小时，其中至少 4 小时留给故障实验和证据整理。两个教程依次完成，
不要先跳到 Taro 后以 React 挂载代替平台生命周期。

| 周/章 | 第一篇 | 第二篇 | 本周交付与观察 |
| --- | --- | --- | --- |
| 1 运行时 | [MP-01 原生双层运行时](01-runtime/01-native-runtime-lifecycle.md) | [MP-02 页面与组件资源所有权](01-runtime/02-page-component-ownership.md) | 原生 App/Page/Component 轨迹、取消与代次 |
| 2 渲染 | [MP-03 模板、样式与事件](02-rendering/01-template-style-events.md) | [MP-04 Taro React 渲染预算](02-rendering/02-taro-render-budget.md) | 组件通信、rpx、局部更新、长列表测量 |
| 3 路由 | [MP-05 返回栈与恢复](03-routing/01-stack-state-recovery.md) | [MP-06 分包与预加载](03-routing/02-subpackages-preload.md) | 分享冷启、刷新读取、包图与预算 |
| 4 网络 | [MP-07 请求取消与 parser](04-network/01-request-parser-cancellation.md) | [MP-08 幂等与不确定结果](04-network/02-idempotency-uncertain-result.md) | 域名、分类错误、同键重试和冲突 |
| 5 身份 | [MP-09 code 与后端会话](05-auth/01-code-server-session.md) | [MP-10 Token 与退出](05-auth/02-token-logout-isolation.md) | 重放拒绝、撤销、401 与跨账号竞态 |
| 6 存储 | [MP-11 用户隔离草稿](06-storage/01-user-drafts-migration.md) | [MP-12 配额与文件清理](06-storage/02-quota-files-cleanup.md) | 迁移、损坏恢复、配额失败和临时文件 |
| 7 权限 | [MP-13 权限与隐私](07-permissions/01-privacy-permission-flow.md) | [MP-14 平台组件与降级](07-permissions/02-components-capability-fallback.md) | 使用时授权、拒绝、手工输入与无能力态 |
| 8 媒体 | [MP-15 图片校验与上传](08-media/01-image-validation-upload.md) | [MP-16 位置与订阅消息](08-media/02-location-subscription.md) | 服务端二次校验、粗粒度位置、权威回读 |
| 9 适配 | [MP-17 adapter 与配置](09-adapters/01-adapter-platform-config.md) | [MP-18 抖音、支付宝与 H5](09-adapters/02-douyin-alipay-h5.md) | 第二平台差异表与独立失败路径 |
| 10 测试 | [MP-19 确定性多层测试](10-testing/01-deterministic-layered-tests.md) | [MP-20 工具、真机与弱网](10-testing/02-device-weak-network.md) | Node、组件、工具、真机四层不混证据 |
| 11 交付 | [MP-21 包体与预览](11-release/01-package-preview.md) | [MP-22 提审、灰度与回退](11-release/02-review-rollout-rollback.md) | 干净构建、审核说明、旧客户端兼容 |
| 12 毕业 | [MP-23 领域、服务与测试](12-capstone/01-domain-service-tests.md) | [MP-24 完整客户端与双平台验收](12-capstone/02-client-platform-delivery.md) | 从空目录提取、运行、预约恢复、平台差异修复 |

第三平台完整审核与真机验收额外安排 2–3 周。

## 环境与运行

资料和 npm 核对日期：2026-10-12。验证机实际为 Node `22.22.0`、npm `10.9.4`，
Taro `4.3.0`（CLI、runtime、components、react、平台插件保持同版），React `18.3.1`。
TypeScript 和 runner 精确版本由 MP-24 包清单冻结，不把全书其他卷的 TS 版本直接套入编译插件。
Taro CLI npm 元数据要求 Node >=18；满足最低版本不等于全部依赖已兼容。

1. 原生实验：在个人目录创建文中完整文件，导入微信开发者工具；无账号可观察本地编译，
   但登录、域名和隐私能力需合法 AppID、相应权限与真实客户端。
2. Taro 实验：先完成 MP-24 §6 的安装基线，复制前篇指定文件替换或增补；示例明确注明
   “独立实验”或“Capstone 集成”，不要把多个 `app.json` 同时放进一项目。
3. 本卷最终验证工作目录为 `/tmp/course-mini-followup2-20261012/final`。读者可换为个人目录，但所有命令须从
   相应项目根运行。首次 `npm install` 生成锁文件，复验用 `npm ci`。
4. `npm run typecheck`、`npm test`、`npm run build:weapp`、`npm run build:tt`
   不需要发布凭据；预览、上传、审核是外部写操作，必须单独授权。
5. watch 与教学服务运行后使用 `Control-C` 停止；只清理自己的练习项目产物，
   不删除全局缓存、用户真实草稿、平台凭据或其他工作区。

## 学习方法与证据

每篇固定包含任务卡、1–13 节、能力总结与相邻导航。先预测，再运行，再破坏，再恢复。
§6 提供最小完整实验或明确的 Capstone 完整文件，§7 将它放进邻里集市；
§8 包含失败路径，§9/10 给出答案，§11 是可观察验收。

参考现存 [JS 确定性异步测试](../04-javascript-typescript/09-testing-debugging-algorithms/02-deterministic-async-testing-debugging.md)
控制完成顺序的风格；前置 parser 可读
[unknown 与运行时解析器](../04-javascript-typescript/08-typescript-domain-design/02-unknown-runtime-parsers-errors.md)。
本卷所有导航直接链接详细教程，不引用已删除章入口。

- [全篇覆盖矩阵](MINI-PROGRAM-COVERAGE.md)：24 个稳定 ID 与真实段落锚点。
- [技术与证据基线](BASELINE.md)：精确版本、合同、平台配置与证明边界。
- [实际自检证据](SELF-CHECK.md)：版本、命令、结果、修复与未验证范围。
- 验收证据须记录时间、平台、工具/基础库、机型、构建摘要、正常路径、故障路径和清理。
  Node 替身不证明 TLS、平台登录、生命周期、隐私弹窗或真机渲染。

## 官方资料

- [微信小程序框架](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [Taro 4.x](https://docs.taro.zone/docs/)
- [Taro 平台项目配置](https://docs.taro.zone/docs/project-config/)
- [抖音开发路径](https://partner.open-douyin.com/docs/resource/zh-CN/mini-app/develop/overview/learning-path)
- [支付宝小程序](https://opendocs.alipay.com/mini/developer)

[返回本卷学习顺序](#顺序与十二周) ·
[现存全栈毕业项目](../09-fullstack/06-graduation-project/01-capstone-scope-business-evidence.md)
