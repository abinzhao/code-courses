# EX11 Storage：配额、唯一写者与一致性

## 任务卡

150 分钟；前置 EX05、Promise 链；产出并发无丢写、失败后恢复与配额拒绝断言。

## 1. 任务背景

popup 与 options 同时保存，若都 read→modify→set，会互相覆盖。
`storage.local.set` 不是数据库事务，整对象写入也不自动合并数组。

## 2. 学习目标

选择 local/session/sync；建立 SW 唯一业务写者；用队列串行化读写；
把业务条数/字节预算与平台配额分开，失败不显示成功。

## 3. 前置知识与环境

EX23 完整 domain 与 background；EX24 测试；`npm test`。
本卷不声明 unlimitedStorage，不使用 sync 传输备注，不把 local 当加密秘密库。

<a id="s4"></a>
## 4. 核心机制

| 存储 | 适用范围 | 本卷选择 |
|---|---|---|
| local | 本地持久，卸载通常移除扩展数据 | `market` 唯一业务 key |
| session | 浏览器会话内临时状态 | 不作权威备注 |
| sync | 跨设备、较小配额与写频率限制 | 不用，避免数据离端 |

Chrome local 当前文档默认 10MB，旧版本可能不同；本卷业务限制更小：100 项、序列化 UTF-8≤200000 bytes。
平台 JSON 计费方式与业务 UTF-8 测量不是同一公式，仍必须 catch 平台 set 拒绝。
serial 将 read/migrate/change/write 都包进同一 tail；
`tail=next.catch(...)` 只恢复调度，不吞掉调用者 next 的异常。
此一致性范围是单一活动后台的已接受操作；不是多进程事务，也不保证终止中的响应送达。

## 5. 设计与步骤

所有业务写只在 background repository，UI sendMessage；Chrome 支持时 local 设 TRUSTED_CONTEXTS。
同一 ID 是 upsert；新 ID 超限拒绝，不自动淘汰；SAVE、DELETE、retention、prune 同队列。
更新应读最新值，不能把 UI 的旧完整 State 回写。

<a id="s6"></a>
## 6. 最小可运行示例

个人 `queue-lab.mjs`：

```js
import assert from 'node:assert/strict';
let stored = [];
let tail = Promise.resolve();
function add(id) {
  const next = tail.then(async () => {
    const snapshot = structuredClone(stored);
    await new Promise(resolve => setTimeout(resolve, 1));
    snapshot.push(id);
    stored = snapshot;
  });
  tail = next.catch(() => undefined);
  return next;
}
await Promise.all([add('lamp'), add('book')]);
assert.deepEqual(stored, ['lamp', 'book']);
console.log('serialized read-modify-write PASS');
```

`node queue-lab.mjs` 预期 PASS，结束无进程。
完整业务版本在 [domain](../12-capstone/01-complete-project-rebuild.md#file-shared-domain-ts)；
`npm test` 验证并发与失败恢复。关闭手工浏览器，fixture `Ctrl+C`。

<a id="s7"></a>
## 7. 业务集成

repo 每次 read 都 migrate，字节检查后 write；GET 也排队，保证不跳过之前的 DELETE。
UI 收到 storage change 再 GET；显示 Saved locally 的条件是成功 response。
备注只在扩展 UI 与 storage，不放页面标记；Firefox 不同 storage 访问控制须实际安装另测。

<a id="s8"></a>
## 8. 错误实验与排查

把 add 改成无 tail 的函数，Promise.all 可能只剩一项；记录 before/after，再恢复队列。
让 io.write 第一次 reject，调用者应失败，第二次可成功；若 tail 永远 rejected，检查恢复行。
业务第 101 项应 QUOTA，原 100 项仍在；Unicode 字符不能用 `.length` 代替 UTF-8 byteLength。
平台 set 拒绝不能改成 catch 后返回成功，必须在 UI 显示失败且 GET 核对。

## 9. 课后思考与答案

1. 为什么整个 State 不能由 UI 写？答案：UI 快照可能旧，多入口覆盖更新。
2. 队列停止后怎么办？答案：新 worker 新队列，重读 storage；不恢复旧内存 Promise。
3. 配额够大就不需上限？答案：业务限额控制成本和可用性，平台配额只是一层。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：并发保存两个 ID。答案：两条都在，顺序按接受入队次序，不按网络返回猜测。
- 进阶：同 ID 连续保存。答案：更新一项，最后入队 note 生效；不是追加两项。
- 故障注入：write 拒绝一次。答案：本次 Promise reject、UI 失败、后续保存可继续，不删除旧数据。

<a id="s11"></a>
## 11. 验收清单

- [ ] SW 唯一业务 writer，无 UI 直接 set。
- [ ] 并发 read-modify-write 不丢项。
- [ ] 失败队列恢复而调用者仍看见失败。
- [ ] 条数和 UTF-8 字节预算明确。
- [ ] local 不被描述为加密或云同步。

## 12. 小结

一致性来自写入所有权与序列化，不来自 storage API 名字。

## 13. 扩展阅读

- [Chrome Storage](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [MDN storage.local](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/local)

## 我现在能做到什么

能给本地备注建立可解释的单写者一致性和失败语义。

## 单元导航

[上一页 EX10](../05-message-contract/02-sender-tab-origin-authorization.md) · [卷入口](../README.md) · [下一页 EX12](02-migration-export-deletion.md)
