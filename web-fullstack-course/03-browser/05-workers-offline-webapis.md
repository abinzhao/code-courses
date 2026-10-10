# 05 · Worker、离线与平台能力

> 本章任务：为邻里集市引入可测量、可取消、可更新、可回退的浏览器能力，同时守住权威状态、权限和生命周期边界。

## 本章产出

- 一个用 Transferable 传递整数分价格、可关联和取消的 Worker 统计实验；
- 一个只缓存公开外壳、可观察 waiting/activate/control 的 Service Worker；
- 一个离线保存待提交草稿、联网处理幂等与版本冲突的预约流程；
- 一个有自动/手动分页、容器观察、外部 DOM 审计和剪贴板回退的页面；
- 四份“现象、证据、原因、修复、复验”记录。

这些实验不实现生产认证、后台常驻、私人离线数据库或可靠消息队列。

## 必要前置

1. 完成[请求、流与实时通信](04-fetch-streams-realtime.md)，会取消 Fetch、校验响应和处理页面生命周期；
2. 按[本卷 browser-lab 契约](README.md#多文件实验怎样启动)使用 HTTP，而不是直接打开 `file:`；
3. 会使用 DevTools Network、Application、Console 和基础 Performance 录制；
4. 每次切换 Service Worker 实验前注销本实验 registration 和同前缀缓存，不能清空其他同源应用数据。

## 学习路线

| 顺序 | 教程 | 核心问题 | 主要证据 | 建议投入 |
| --- | --- | --- | --- | ---: |
| 1 | [Web Worker：消息、所有权转移与可取消计算](05-workers-offline-webapis/01-web-worker-messaging-transfer-cancel.md) | 计算怎样移出主线程且不提交旧结果？ | Long Task、buffer detached、requestId | 110 分钟 |
| 2 | [Service Worker：生命周期、控制权与版本化缓存](05-workers-offline-webapis/02-service-worker-lifecycle-cache.md) | 注册、激活与当前页面受控为何不同？ | registration 状态、controller、缓存版本 | 120 分钟 |
| 3 | [离线一致性与更新](05-workers-offline-webapis/03-offline-consistency-updates.md) | 离线意图怎样避免伪装成成功？ | 本地草稿、幂等键、`201/409`、版本 | 130 分钟 |
| 4 | [观察器、权限与平台 API](05-workers-offline-webapis/04-observers-permissions-api-fallback.md) | 能力不支持或被拒绝时，任务如何继续？ | observer、请求去重、权限拒绝、回退 | 120 分钟 |

四课按顺序完成。第二、三课共用 Service Worker 时要逐课清理实验前缀，避免旧脚本控制新页面。

## 章级邻里集市任务

构建“可离线阅读但不伪造交易”的渐进增强商品页：

```text
主线程
  ├─ Worker：只做公开数据纯计算，消息有 requestId
  ├─ Service Worker：只缓存版本化公开外壳
  ├─ 离线草稿：pending-local → 服务端 201 / 409
  └─ 平台能力：observer/clipboard 可用则增强，不可用则保留按钮与文本
```

必须保持：

- 价格始终使用整数分；
- 持久化时间使用 UTC ISO 8601；
- 离线快照标注抓取时间，不能证明当前库存；
- 幂等键不替代身份，对象授权仍在服务端；
- 退出页面时终止 Worker、请求与观察器；
- 缓存只删除自己的命名空间；
- 不在客户端离线保存 Token、Cookie、支付或私人联系数据。

## 综合验收

- [ ] 四篇教程的完整文件均能从空目录运行；
- [ ] Worker 计算期间页面输入可用，取消后旧结果不提交；
- [ ] 首次 Service Worker 安装、刷新受控、离线外壳、waiting 更新均可观察；
- [ ] 离线预约明确为草稿，联网可分别复现 `201` 与 `409`；
- [ ] 自动分页不会重复请求，手动按钮、可选择文本等回退始终可用；
- [ ] pagehide/bfcache 后没有重复 Worker、observer、请求或 registration 逻辑；
- [ ] 每项性能结论包含设备/数据量/测量边界，不以单次本机结果外推；
- [ ] 能说明未验证生产 HTTPS、真实多用户数据库、存储驱逐、后台调度、Safari/Firefox 和移动权限 UI。

## 导航

[上一章：请求、流与实时通信](04-fetch-streams-realtime.md) · [本卷目录](README.md) · [下一章：性能与故障诊断](06-devtools-performance.md)
