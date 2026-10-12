# 扩展 Worker 生命周期、存储与任务恢复

<!-- course-meta:start -->
> - 层级：L5
> - 先修：[消息边界](./02-内容脚本-消息与信任边界.md)、[IndexedDB](../../L0-Web基石/01-浏览器原理与渲染机制/07-IndexedDB-配额与离线数据.md)
> - 建议用时：180 分钟
> - 一手资料：[worker 生命周期](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)、[storage](https://developer.chrome.com/docs/extensions/reference/api/storage)
<!-- course-meta:end -->

## 学习目标

- 能让任务在 worker 被终止后安全恢复。
- 能选择 local/session/sync/IndexedDB，并处理升级和并发。

## 内容讲解

### 1. worker 随时可能终止

扩展 worker 通常空闲后停止，特定事件/API 会影响计时；具体超时和保持活跃规则随 Chrome 版本变化。正确设计依赖持久状态，不依赖永不停止。

监听器在模块顶层同步注册，异步读取配置可以在监听器执行时等待。不要先 await 初始化，再注册核心事件，否则唤醒事件可能错过处理。

长连接打开本身不保证永久活跃，`setInterval` 也不是可靠后台调度。周期任务使用 alarms，仍要接受延迟、重启和重复处理。

### 2. 存储角色

| 存储 | 用途 | 限制 |
|---|---|---|
| storage.local | 本机长期配置与记录 | 配额、用户清理、不是加密保险库 |
| storage.session | 浏览器会话临时数据 | 重启不保留，访问级别需确认 |
| storage.sync | 少量跨设备偏好 | 配额与写频限制，不适合大正文 |
| IndexedDB | 大量记录与事务 | schema 升级和连接治理 |

worker 无 localStorage。storage.local 默认访问范围可能包含内容脚本，应按需要设置 `TRUSTED_CONTEXTS`。起点已采用该限制。

### 3. 从单条快照到历史列表

起点保存一条 lastClip，避免数组读改写并发丢失。升级历史时为每条记录生成稳定 ID，限制容量；并发任务优先使用 IndexedDB 事务，而不是假设 storage.get/set 自动原子合并。

记录至少有 schemaVersion、id、url、title、text、createdAt。升级按版本逐步迁移，保留原数据导出和失败恢复。

### 4. 可恢复任务

```text
pending → running → completed
              ↓ worker 终止
          下次唤醒 → 查询远端/重试 → completed
```

任务状态持久化，mutationId 固定；超时不能直接换 ID 重试。远端已成功而本地没确认时，通过查询/幂等重试恢复。

仅保存 pending 标记不够，必须保存可继续的数据与尝试信息。任务含敏感内容时定义保存期和清理入口。

### 5. 验证终止

先关闭 worker DevTools（调试可能保持活跃），在扩展检查页停止 worker 或等待其空闲，再打开 popup 并采集。记录 worker 重启后 lastClip 仍存在。

另测浏览器重启、扩展更新、storage 异常与迁移失败；卸载通常清除扩展数据，不能承诺安装后自动找回。

## 常见问题

**全局 Map 能存任务吗？** worker 停止即丢失，只适合可重建的缓存。

**sync 会自动合并业务冲突吗？** 不会替你定义协作一致性。

## 实操作业

基础停止 worker 后恢复；进阶实现有上限历史与版本迁移；挑战中断同步任务，验证不重复上传。

### 参考答案与验收

关闭 popup/worker 不丢确认数据；重试 ID 不变；并发两条记录都保留；升级失败可导出而不直接清空。报告注明目标 Chrome 版本。

<!-- atlas-task:start -->
## Atlas 项目任务

给 Atlas 扩展加入历史、导出与中断恢复，避免长驻后台假设。见 [L5 里程碑](../../projects/atlas/milestones/L5.md)。
<!-- atlas-task:end -->

---

## 本节小结

可靠扩展把状态放在持久化层，以可重试协议适应 worker 生命周期。

<!-- course-nav:start -->
---

[上一篇：内容脚本、消息与信任边界](./02-内容脚本-消息与信任边界.md) · [课程地图](../../README.md) · [下一篇：扩展网络权限、规则与本地通信](./04-网络权限-规则与本地通信.md)
<!-- course-nav:end -->
