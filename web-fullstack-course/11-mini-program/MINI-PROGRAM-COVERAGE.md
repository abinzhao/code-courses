# 小程序全篇覆盖矩阵

范围为本卷全部 12 模块、
24 篇正文。每篇有稳定 MP ID、任务卡、1–13 节、答案、故障实验、能力总结、
上下课和卷 README 导航。下表六列均链接到正文明确 `s*` 锚点。
“内容覆盖”不代表平台真机通过；实际证据与缺口见 [SELF-CHECK](SELF-CHECK.md)。

## 正文索引

| ID / 内容 | §4 理论 | §6 完整实验 | §7 项目接线 | §8 故障 | §10 练习答案 | §11 验收 |
| --- | --- | --- | --- | --- | --- | --- |
| MP-01 原生双层、App/Page | [理论](01-runtime/01-native-runtime-lifecycle.md#s4) | [代码](01-runtime/01-native-runtime-lifecycle.md#s6) | [项目](01-runtime/01-native-runtime-lifecycle.md#s7) | [故障](01-runtime/01-native-runtime-lifecycle.md#s8) | [答案](01-runtime/01-native-runtime-lifecycle.md#s10) | [验收](01-runtime/01-native-runtime-lifecycle.md#s11) |
| MP-02 Component 与资源所有权 | [理论](01-runtime/02-page-component-ownership.md#s4) | [代码](01-runtime/02-page-component-ownership.md#s6) | [项目](01-runtime/02-page-component-ownership.md#s7) | [故障](01-runtime/02-page-component-ownership.md#s8) | [答案](01-runtime/02-page-component-ownership.md#s10) | [验收](01-runtime/02-page-component-ownership.md#s11) |
| MP-03 模板、样式、rpx、事件 | [理论](02-rendering/01-template-style-events.md#s4) | [代码](02-rendering/01-template-style-events.md#s6) | [项目](02-rendering/01-template-style-events.md#s7) | [故障](02-rendering/01-template-style-events.md#s8) | [答案](02-rendering/01-template-style-events.md#s10) | [验收](02-rendering/01-template-style-events.md#s11) |
| MP-04 Taro React 渲染预算 | [理论](02-rendering/02-taro-render-budget.md#s4) | [代码](02-rendering/02-taro-render-budget.md#s6) | [项目](02-rendering/02-taro-render-budget.md#s7) | [故障](02-rendering/02-taro-render-budget.md#s8) | [答案](02-rendering/02-taro-render-budget.md#s10) | [验收](02-rendering/02-taro-render-budget.md#s11) |
| MP-05 返回栈、分享、恢复 | [理论](03-routing/01-stack-state-recovery.md#s4) | [代码](03-routing/01-stack-state-recovery.md#s6) | [项目](03-routing/01-stack-state-recovery.md#s7) | [故障](03-routing/01-stack-state-recovery.md#s8) | [答案](03-routing/01-stack-state-recovery.md#s10) | [验收](03-routing/01-stack-state-recovery.md#s11) |
| MP-06 分包、预加载 | [理论](03-routing/02-subpackages-preload.md#s4) | [代码](03-routing/02-subpackages-preload.md#s6) | [项目](03-routing/02-subpackages-preload.md#s7) | [故障](03-routing/02-subpackages-preload.md#s8) | [答案](03-routing/02-subpackages-preload.md#s10) | [验收](03-routing/02-subpackages-preload.md#s11) |
| MP-07 parser、域名、取消 | [理论](04-network/01-request-parser-cancellation.md#s4) | [代码](04-network/01-request-parser-cancellation.md#s6) | [项目](04-network/01-request-parser-cancellation.md#s7) | [故障](04-network/01-request-parser-cancellation.md#s8) | [答案](04-network/01-request-parser-cancellation.md#s10) | [验收](04-network/01-request-parser-cancellation.md#s11) |
| MP-08 幂等、冲突、未知结果 | [理论](04-network/02-idempotency-uncertain-result.md#s4) | [代码](04-network/02-idempotency-uncertain-result.md#s6) | [项目](04-network/02-idempotency-uncertain-result.md#s7) | [故障](04-network/02-idempotency-uncertain-result.md#s8) | [答案](04-network/02-idempotency-uncertain-result.md#s10) | [验收](04-network/02-idempotency-uncertain-result.md#s11) |
| MP-09 code、服务端会话 | [理论](05-auth/01-code-server-session.md#s4) | [代码](05-auth/01-code-server-session.md#s6) | [项目](05-auth/01-code-server-session.md#s7) | [故障](05-auth/01-code-server-session.md#s8) | [答案](05-auth/01-code-server-session.md#s10) | [验收](05-auth/01-code-server-session.md#s11) |
| MP-10 Token、退出、代次 | [理论](05-auth/02-token-logout-isolation.md#s4) | [代码](05-auth/02-token-logout-isolation.md#s6) | [项目](05-auth/02-token-logout-isolation.md#s7) | [故障](05-auth/02-token-logout-isolation.md#s8) | [答案](05-auth/02-token-logout-isolation.md#s10) | [验收](05-auth/02-token-logout-isolation.md#s11) |
| MP-11 用户草稿、schema 迁移 | [理论](06-storage/01-user-drafts-migration.md#s4) | [代码](06-storage/01-user-drafts-migration.md#s6) | [项目](06-storage/01-user-drafts-migration.md#s7) | [故障](06-storage/01-user-drafts-migration.md#s8) | [答案](06-storage/01-user-drafts-migration.md#s10) | [验收](06-storage/01-user-drafts-migration.md#s11) |
| MP-12 配额、缓存、文件清理 | [理论](06-storage/02-quota-files-cleanup.md#s4) | [代码](06-storage/02-quota-files-cleanup.md#s6) | [项目](06-storage/02-quota-files-cleanup.md#s7) | [故障](06-storage/02-quota-files-cleanup.md#s8) | [答案](06-storage/02-quota-files-cleanup.md#s10) | [验收](06-storage/02-quota-files-cleanup.md#s11) |
| MP-13 权限、隐私、监听 | [理论](07-permissions/01-privacy-permission-flow.md#s4) | [代码](07-permissions/01-privacy-permission-flow.md#s6) | [项目](07-permissions/01-privacy-permission-flow.md#s7) | [故障](07-permissions/01-privacy-permission-flow.md#s8) | [答案](07-permissions/01-privacy-permission-flow.md#s10) | [验收](07-permissions/01-privacy-permission-flow.md#s11) |
| MP-14 平台组件、能力降级 | [理论](07-permissions/02-components-capability-fallback.md#s4) | [代码](07-permissions/02-components-capability-fallback.md#s6) | [项目](07-permissions/02-components-capability-fallback.md#s7) | [故障](07-permissions/02-components-capability-fallback.md#s8) | [答案](07-permissions/02-components-capability-fallback.md#s10) | [验收](07-permissions/02-components-capability-fallback.md#s11) |
| MP-15 图片预检、上传与取消 | [理论](08-media/01-image-validation-upload.md#s4) | [代码](08-media/01-image-validation-upload.md#s6) | [项目](08-media/01-image-validation-upload.md#s7) | [故障](08-media/01-image-validation-upload.md#s8) | [答案](08-media/01-image-validation-upload.md#s10) | [验收](08-media/01-image-validation-upload.md#s11) |
| MP-16 位置、模板、通知回读 | [理论](08-media/02-location-subscription.md#s4) | [代码](08-media/02-location-subscription.md#s6) | [项目](08-media/02-location-subscription.md#s7) | [故障](08-media/02-location-subscription.md#s8) | [答案](08-media/02-location-subscription.md#s10) | [验收](08-media/02-location-subscription.md#s11) |
| MP-17 adapter、条件配置 | [理论](09-adapters/01-adapter-platform-config.md#s4) | [代码](09-adapters/01-adapter-platform-config.md#s6) | [项目](09-adapters/01-adapter-platform-config.md#s7) | [故障](09-adapters/01-adapter-platform-config.md#s8) | [答案](09-adapters/01-adapter-platform-config.md#s10) | [验收](09-adapters/01-adapter-platform-config.md#s11) |
| MP-18 抖音、支付宝、H5 | [理论](09-adapters/02-douyin-alipay-h5.md#s4) | [代码](09-adapters/02-douyin-alipay-h5.md#s6) | [项目](09-adapters/02-douyin-alipay-h5.md#s7) | [故障](09-adapters/02-douyin-alipay-h5.md#s8) | [答案](09-adapters/02-douyin-alipay-h5.md#s10) | [验收](09-adapters/02-douyin-alipay-h5.md#s11) |
| MP-19 Node 与实际 React 组件 | [理论](10-testing/01-deterministic-layered-tests.md#s4) | [代码](10-testing/01-deterministic-layered-tests.md#s6) | [项目](10-testing/01-deterministic-layered-tests.md#s7) | [故障](10-testing/01-deterministic-layered-tests.md#s8) | [答案](10-testing/01-deterministic-layered-tests.md#s10) | [验收](10-testing/01-deterministic-layered-tests.md#s11) |
| MP-20 工具、真机、弱网与升级 | [理论](10-testing/02-device-weak-network.md#s4) | [代码](10-testing/02-device-weak-network.md#s6) | [项目](10-testing/02-device-weak-network.md#s7) | [故障](10-testing/02-device-weak-network.md#s8) | [答案](10-testing/02-device-weak-network.md#s10) | [验收](10-testing/02-device-weak-network.md#s11) |
| MP-21 包体、复建、预览 | [理论](11-release/01-package-preview.md#s4) | [代码](11-release/01-package-preview.md#s6) | [项目](11-release/01-package-preview.md#s7) | [故障](11-release/01-package-preview.md#s8) | [答案](11-release/01-package-preview.md#s10) | [验收](11-release/01-package-preview.md#s11) |
| MP-22 审核、灰度、回退 | [理论](11-release/02-review-rollout-rollback.md#s4) | [代码](11-release/02-review-rollout-rollback.md#s6) | [项目](11-release/02-review-rollout-rollback.md#s7) | [故障](11-release/02-review-rollout-rollback.md#s8) | [答案](11-release/02-review-rollout-rollback.md#s10) | [验收](11-release/02-review-rollout-rollback.md#s11) |
| MP-23 完整领域/内存服务 | [理论](12-capstone/01-domain-service-tests.md#s4) | [代码](12-capstone/01-domain-service-tests.md#s6) | [项目](12-capstone/01-domain-service-tests.md#s7) | [故障](12-capstone/01-domain-service-tests.md#s8) | [答案](12-capstone/01-domain-service-tests.md#s10) | [验收](12-capstone/01-domain-service-tests.md#s11) |
| MP-24 完整客户端/交付 | [理论](12-capstone/02-client-platform-delivery.md#s4) | [代码](12-capstone/02-client-platform-delivery.md#s6) | [项目](12-capstone/02-client-platform-delivery.md#s7) | [故障](12-capstone/02-client-platform-delivery.md#s8) | [答案](12-capstone/02-client-platform-delivery.md#s10) | [验收](12-capstone/02-client-platform-delivery.md#s11) |

## 蓝图对账

| 蓝图模块 | 主归属 | 连续项目与边界 |
| --- | --- | --- |
| 1 运行时/生命周期 | MP-01/02 | 先原生后 Taro，App/Page/Component，hide 与 unload、取消与代次 |
| 2 模板/样式/事件/性能 | MP-03/04 | rpx、稳定 ID、组件通信、setData 预算；真机性能另验 |
| 3 路由/分包/恢复 | MP-05/06 | 公开详情 ID、分享冷启、普通/独立分包、预加载边界 |
| 4 网络/parser/幂等 | MP-07/08 | 合法域名、TLS、取消、分类错误、同键恢复；服务成功前不宣告预约 |
| 5 code/后端会话/Token | MP-09/10 | 并发消费、重放、撤销/过期、epoch、清理；真实平台与 Web 后端扩展明确 |
| 6 存储/文件/配额 | MP-11/12 | 用户隔离、V1→V2、损坏保留、写失败、缓存与文件所有权 |
| 7 组件/权限/隐私 | MP-13/14 | 使用时授权、同意/拒绝、永久拒绝设置、无能力手工降级 |
| 8 图片/相机/位置/订阅 | MP-15/16 | 数量/字节/类型/像素、可取消上传、服务端二验、粗粒度用途、通知只回读 |
| 9 adapter/条件配置 | MP-17/18 | 微信主线、抖音第二、支付宝专用身份、H5 非平台证据 |
| 10 多层测试/工具真机 | MP-19/20 | Node、实际 React 文案、工具、真机、后端；弱网与升级不混证据 |
| 11 包体/预览/提审回退 | MP-21/22 | lock/ci、主分包摘要、授权门、审核事实、灰度与旧客户端兼容 |
| 12 Capstone/第二平台 | MP-23/24（含 MP-15 三文件） | 29 核心文件、全部页面/请求/storage/adapter/service/test；明确 demo/真实扩展 |

## 毕业评分边界

内容与本地可运行实验可以完成，平台交付不能只凭编译通过。
毕业真实验收另需合法微信账号/AppID、第二平台账号、独立工具与真机、
真实 HTTPS 后端、平台 code 交换、数据库事务、图片二验、模板发送和授权发布记录。
没有这些条件时保持未验证，不编造二维码、审核或机型证据。

[本卷顺序](README.md) · [技术基线](BASELINE.md) · [实际自检](SELF-CHECK.md)
