# EX06 终止、Alarm 与保留：恢复不是持续运行

## 任务卡

120 分钟；前置 EX05；产出实际 worker stop/reload 证据、时钟注入保留测试与删除后真空断言。

## 1. 任务背景

本地备注保留 1/7/30 天。用 SW `setInterval` 清理会在后台停止后消失；
即使用 alarm，也不能承诺精确到秒或睡眠期间一直运行。

## 2. 学习目标

理解终止条件与 DevTools 干扰；用 alarm 唤醒、持久时间戳和幂等清理；
确认删除后 alarm 不重建空业务 key。

## 3. 前置知识与环境

完整工程 EX23，测试 EX24；`npm test` 的注入时钟无需等 30 天。
实际 stop 由隔离 Chromium CDP 执行，不连接日常 profile。

<a id="s4"></a>
## 4. 核心机制

SW 空闲会终止，长期任务有平台时限；连接调试器可能改变空闲观察结果。
alarm 是持久调度意图，触发可能延迟，设备睡眠不会制造精确持续时钟。
清理计算 `now - updatedAt > days*86400000`，边界相等保留；再次 prune 应得到相同集合。
`alarms.create` 只建立调度，不证明发生过一次清理。ensureAlarm 检查并重建，prune 使用单写队列。
用户 DELETE 移除 key；alarm 遇 undefined 直接返回空状态，不写回，避免“删完又出现 key”。

## 5. 设计与步骤

先 SAVE，停 SW，再重新 GET；再用注入时钟验证过期；最后 DELETE→prune→storage 空。
实际停止可以证明重建恢复，不证明自然空闲时长；必须分别记录。

<a id="s6"></a>
## 6. 最小可运行示例

在 EX23 工程新建个人 `retention.test.ts`，Vitest 完整用例：

```ts
import { it, expect } from 'vitest';
import { createRepository, ORIGIN } from './shared/domain';
it('expires persisted rows after a restart', async () => {
  let data: unknown;
  const io = { read: async () => data, write: async (value: unknown) => { data = value; } };
  const item = { id: 'lamp', title: 'Lamp', priceCents: 1, url: `${ORIGIN}/items/lamp` };
  await createRepository(io, () => 1000).save(item, 'note');
  const restarted = createRepository(io, () => 31 * 86400000 + 1000);
  await restarted.prune();
  expect((await restarted.get()).items).toEqual([]);
});
```

运行 `npx vitest run retention.test.ts` 预期 1 passed；删除这个个人增量测试前先确认它是自己创建的。
主线运行 `npm run e2e` 预期 P3 worker termination + storage recovery PASS，环境见 EX20。
停止由测试 finally 负责关 browser/server/profile；手工 fixture 则 `Ctrl+C`。

<a id="s7"></a>
## 7. 业务集成

完整 background 的 `market-retention` period=1 分钟；UI 提供 1/7/30，
repo.prune 读取当前设置，而非使用旧模块缓存。清理只处理本扩展 key，不动网页或导出文件。
并发 SAVE 与 prune 同一队列，避免清理旧快照覆盖新备注。

<a id="s8"></a>
## 8. 错误实验与排查

改用 `setInterval`，手动 stop 后不再依赖它产生清理；恢复 alarm。
删除后让 prune 无条件 write，单测 `writes===0` 失败；恢复 absent-key guard 后复验。
把 fake clock 增到第 31 天，记录 rows 变空；不要修改系统时钟影响其他应用。
alarm 缺失先检查 manifest 权限、名称和 ensureAlarm，不以打开 DevTools“证明保活”。

## 9. 课后思考与答案

1. alarm 周期能承诺保留删除 SLA 吗？答案：不能，延迟和关闭浏览器影响执行；应描述下次唤醒清理。
2. 终止中 SAVE 回应未知怎么处理？答案：重开 GET 检查持久结果；ID upsert 使人工重试可解释。
3. 系统时钟倒退呢？答案：目前差值为负会保留；不是可信服务端时间，须在隐私说明中限定本地规则。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：检查 alarm 对象。答案：名称 market-retention、periodInMinutes=1，不等于已触发。
- 进阶：测试恰好边界。答案：updatedAt+days*86400000 保留，再多 1ms 清除。
- 故障注入：prune 写失败。答案：告警不含备注，原数据仍在，下一次重试；队列不永久失败。

<a id="s11"></a>
## 11. 验收清单

- [ ] 实际 stop 后 GET 恢复备注。
- [ ] fake clock 过期清理通过，不等待真实天数。
- [ ] alarm 注册和触发证据分开。
- [ ] DELETE 后 prune 不重建 key。
- [ ] 写明关闭/睡眠时不保证准点清理。

## 12. 小结

恢复依靠持久时间戳和事件重建，不能靠 SW 活着。

## 13. 扩展阅读

- [SW 生命周期](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Chrome Alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms)

## 我现在能做到什么

能以停止证据、注入时钟和空 key 断言验证保留，而非用等待或保活掩盖问题。

## 单元导航

[上一页 EX05](01-events-reconstruction.md) · [卷入口](../README.md) · [下一页 EX07](../04-content-dom/01-public-dom-parser.md)
