# IndexedDB、配额与离线数据

<!-- course-meta:start -->
> - 层级：L0 浏览器能力；实验在 L1 Promise 后完成
> - 先修：[Fetch 与浏览器存储](../../L1-JavaScript与TypeScript/01-JavaScript语法核心/07-Fetch-表单与浏览器存储.md)
> - 建议用时：180 分钟
> - 一手资料：[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)、[Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API)
<!-- course-meta:end -->

## 学习目标

- 能按数据规模、访问方式和生命周期选择存储。
- 能完成 IndexedDB schema 升级、事务写入与多标签页关闭。
- 能设计离线同步的冲突规则和空间不足的恢复路径。

## 内容讲解

### 1. 存储选择

| 存储 | 适合 | 不适合 |
|---|---|---|
| sessionStorage | 标签页内临时状态 | 跨标签同步与持久文档 |
| localStorage | 少量偏好字符串 | 大量记录、文件、复杂查询 |
| IndexedDB | 结构化记录、索引、Blob | 直接当作远程多人数据库 |
| Cache Storage | Request/Response 缓存 | 代替业务事务数据库 |
| Cookie | 由服务端控制的会话等 | 大文件、可公开的长期凭据 |

这些存储仍受 origin、分区、配额、隐私模式和用户清理策略影响。前端存储不能保证永久保留，也不能防御同源 XSS。

### 2. 最小完整事务

保存为 `db.js`，在通过 HTTP 打开的模块页面导入：

```js
export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('atlas-notes', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore('notes', { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt');
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn('请关闭仍使用旧数据库的标签页后继续');
    };
    request.onsuccess = () => {
      const db = request.result;
      // 允许另一个标签页升级数据库，而不是持续阻塞它。
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

export function putNote(db, note) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite');
    tx.objectStore('notes').put(note);
    // 请求成功不代表整个事务已提交，应等待 oncomplete。
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('事务取消'));
    tx.onerror = () => {
      // 错误默认导致中止；由 onabort 统一结算 Promise。
    };
  });
}

export function getNote(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readonly');
    const request = tx.objectStore('notes').get(id);
    let result;
    request.onsuccess = () => { result = request.result ?? null; };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error ?? new Error('读取取消'));
  });
}
```

页面实验：

```js
import { openDatabase, putNote, getNote } from './db.js';
const db = await openDatabase();
await putNote(db, {
  id: 'note-1', body: '离线草稿', updatedAt: Date.now(), revision: 1,
});
console.log(await getNote(db, 'note-1'));
db.close();
```

预期读回相同记录。不要在已创建事务后先 `await fetch()` 再写入：等待外部任务期间事务可能已经自动结束。先准备数据，再在一个事务中提交本地写入。

### 3. schema 升级

从版本 1 升至 2 时，在 `onupgradeneeded` 按 `event.oldVersion < 2` 创建新索引；已有 store 不应重复创建。数据迁移在升级事务内执行，升级失败不能宣称 schema 已改变。

保存一份旧版本数据库，运行新代码并验证原数据仍可读。另开旧标签页观察 blocked，再关闭连接验证升级继续。不要通过清空数据库掩盖迁移问题。

### 4. 配额与导出

```js
const { usage, quota } = await navigator.storage.estimate();
console.log({ usage, quota }); // 估算，不是精确容量承诺
const alreadyPersistent = await navigator.storage.persisted();
console.log({ alreadyPersistent });
```

持久化申请可能被拒绝，也不抵抗用户清理或设备损坏。发生 `QuotaExceededError` 时停止继续写入，提供导出、用户确认后的缓存清理和重试。业务草稿与可重新下载的缓存应分开治理。

### 5. 离线同步

一条待同步变更至少包括 `mutationId`、资源 ID、`baseRevision` 和修改内容。服务端按 mutationId 去重，按 baseRevision 检测并发编辑：

- revision 一致：更新并返回新 revision。
- revision 不一致：返回 409 与当前版本，前端展示合并或另存。
- 超时：无法判断是否成功，用相同 mutationId 重试。

不能默认“最后写入覆盖”适合所有业务。文章正文可以人工合并，付款和权限变更不能照搬草稿策略。

## 常见问题

**request.onsuccess 后能提示保存完成吗？** 应等待事务完成；后续请求失败可能回滚此前请求。

**IndexedDB 能存秘密吗？** 同源脚本仍可访问，应避免存长期高权限凭据；扩展存储也不自动成为保险库。

**离线缓存是否等于离线应用？** 还需要路由、状态、队列、冲突、权限过期与更新恢复。

## 实操作业

1. 基础：写入、读取、刷新后再读，处理不存在记录。
2. 进阶：给版本 2 增加标题索引，保留版本 1 数据并测试 blocked。
3. 挑战：模拟离线编辑和重复同步，验证去重与 revision 冲突。

### 参考答案与验收

- 未命中返回 null，保存提示来自 transaction.complete；两条同事务写入要同时成功或同时回滚。
- 迁移通过条件是旧记录保留、索引可查询、旧连接能关闭。
- 重试不增加重复记录；冲突不静默丢失正文。提交数据库面板和网络断开/恢复证据。

<!-- atlas-task:start -->
## Atlas 项目任务

把 Atlas 收藏或草稿迁移到 IndexedDB，保留可导出的原数据，增加空间失败提示和同步冲突规则。见 [L1 里程碑](../../projects/atlas/milestones/L1.md)。
<!-- atlas-task:end -->

---

## 本节小结

IndexedDB 提供本地事务与索引；可靠离线能力还需要迁移、配额恢复、幂等同步与冲突处理。

<!-- course-nav:start -->
---

[上一篇：页面生命周期、bfcache 与资源调度](./06-页面生命周期-bfcache与资源调度.md) · [课程地图](../../README.md) · [下一篇：01 — 语义化标签体系](../02-HTML5语义化与可访问性/01-语义化标签体系.md)
<!-- course-nav:end -->
