# EX12 数据生命周期：迁移、导出与删除

## 任务卡

150 分钟；前置 EX11；产出 v1→v2 幂等证据、导出文件和确认删除后的空 storage。

## 1. 任务背景

升级不能丢失旧收藏；坏数据不能当空数据悄悄覆盖；删除不能仅清 React 列表。
导出到用户文件夹后，副本不再由扩展删除控制。

## 2. 学习目标

校验历史 schema、幂等迁移、拒绝未知版本；导出完整受限 State；
确认删除 key 并证明 alarm 不重建，说明外部副本边界。

## 3. 前置知识与环境

EX23 全文件与 EX24 测试。迁移注入只在隔离 profile，不能修改日常扩展数据。
v1 合同 `{version:1,favorites:Item[]}`；v2 包含 retentionDays 与 note/updatedAt。

<a id="s4"></a>
## 4. 核心机制

undefined→默认 v2，但 GET 不主动写默认；v1→v2，note 空、updatedAt 为迁移时刻；
v2 再 migrate 不重置时间戳。未知/坏版本 throw，避免错误数据被“修复为空”。
repo.load 在旧版本成功转换后 write；失败保留旧数据，UI 失败可导向人工检查。
本卷 v1 每个 item 也严格 parser，并拒绝历史重复 ID；
若历史数据有重复，应先设计冲突迁移，当前不默默去重或承诺所有历史脏数据自动修好。
export 使用 Blob + object URL + download，不需要 downloads 权限；
DELETE 用 storage.remove，默认视图为空但 durable 对象无 key。

## 5. 设计与步骤

先注入合法 v1，GET 后检查 version=2 和 note 空；再 GET 检查 updatedAt 不变。
导出后用户自行查看 JSON；确认删除再 GET 与 `storage.local.get(null)`，
后续 prune 仍不能写回 key。删除含保留设置，host permission 撤销是另一个显式操作。

<a id="s6"></a>
## 6. 最小可运行示例

个人 `migration.test.ts`：

```ts
import { it, expect } from 'vitest';
import { migrate, ORIGIN } from './shared/domain';
it('does not reset migrated timestamps', () => {
  const old = { version: 1, favorites: [
    { id: 'lamp', title: 'Lamp', priceCents: 100, url: `${ORIGIN}/items/lamp` },
  ] };
  const upgraded = migrate(old, 1000);
  expect(upgraded.items[0]).toMatchObject({ note: '', updatedAt: 1000 });
  expect(migrate(upgraded, 9000)).toEqual(upgraded);
  expect(() => migrate({ version: 3 }, 9000)).toThrow();
});
```

`npx vitest run migration.test.ts` 预期 1 passed。
完整 export/DELETE 在 [App](../12-capstone/01-complete-project-rebuild.md#file-shared-app-tsx)；
按 Export local data 预期下载 market-notes.json，再确认删除。
测试 finally 清理下载临时上下文/profile；个人导出文件需单独识别，不批量删用户下载目录。

<a id="s7"></a>
## 7. 业务集成

用户备注是本地敏感内容，不进页面、不进服务器、不进日志。
删除前说明导出副本仍在；retention 只在后续唤醒执行，关闭浏览器不会准点删除。
共享 Web Listing 状态不被扩展迁移修改；本卷没有登录、同步或交易接口。

<a id="s8"></a>
## 8. 错误实验与排查

注入 `{version:99}`，GET 应失败而不 write 空默认；恢复合法数据再验。
每次 GET 重置 updatedAt，幂等测试失败；恢复仅 v1 迁移赋时刻。
DELETE 只 `setState(empty)` 时重开又出现；修复为后台 remove，再检查 durable={}。
删除后 alarm 创建空 key 是真实回归类型，恢复 absent-key guard 并跑 EX24 单测。

## 9. 课后思考与答案

1. 数据损坏为何不自动清空？答案：清空是不可恢复删除，需要用户意图，不能当容错。
2. 导出就等于安全备份？答案：没有加密，用户需保护文件；本卷不承诺秘密保管。
3. DELETE 需要撤销 host 吗？答案：两个不同操作；UI 分开明确，数据删除不假装权限已撤销。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：两次 migrate 比较。答案：相等，timestamps 不续命。
- 进阶：列出删除范围。答案：market notes/settings key；不含导出、浏览器备份、网页或权限。
- 故障注入：remove 拒绝。答案：显示失败，不声称删除，GET 保留原数据，用户可重试。

<a id="s11"></a>
## 11. 验收清单

- [ ] 合法 v1 转 v2 幂等，未知版本拒绝。
- [ ] 导出是 JSON 下载，不远程上传。
- [ ] 删除需确认且 durable={}。
- [ ] prune 后仍无 key。
- [ ] 说明外部副本、关闭浏览器和历史脏数据边界。

## 12. 小结

迁移是受限转换，删除是用户授权的持久动作；两者都不能用 UI 假象替代。

## 13. 扩展阅读

- [Chrome storage.remove](https://developer.chrome.com/docs/extensions/reference/api/storage#method-StorageArea-remove)
- [MDN Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [URL.revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)

## 我现在能做到什么

能把升级、保留、导出和删除放进同一数据生命周期，并说明不能控制的副本。

## 单元导航

[上一页 EX11](01-quota-single-writer.md) · [卷入口](../README.md) · [下一页 EX13](../07-permissions/01-active-tab-user-gesture.md)
