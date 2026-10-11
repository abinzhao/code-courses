# 一致备份与恢复：删除账本必须先于服务开放

## 任务卡

- **任务**：停服务后备份多份 SQLite，校验摘要与 integrity，恢复到新目录并重放撤回。
- **产出**：`labs/ag13a/backup.ts`、`labs/ag13a/backup.test.ts`。
- **证据**：3 项测试，真实文件恢复和篡改拒绝，旧备份含有或缺失的撤回来源都不能复活。
- **边界**：离线 quiescent 备份，不声称在线跨 DB 原子快照；备份默认未加密，只用合成文本。
- **唯一 ID**：`AG-13A`。

## 1. 任务背景

资料、checkpoint、记忆、任务与 trace 分布在多个 DB。正在运行时依次复制文件可能得到
不同时间点，甚至漏掉 WAL。恢复旧备份还可能让已撤回资料复活。
正确流程先停止入口、等待节点结束、关闭所有连接，再备份；恢复时先应用当前删除账本。

## 2. 学习目标

暂停入口与关闭存储；SQLite online backup API 的离线用法；
记录文件摘要；fresh restore、integrity_check；恢复前应用撤回账本与保留。

## 3. 预备知识

依赖 AG-08A sourceStore。Node 22.22.0 的 node:sqlite backup 函数已经在实际包运行时核对。
源目录和输出目录只使用个人实验路径；不要把测试 rm 逻辑套进用户资料目录。

<a id="ag-13a-s4"></a>
## 4. 核心理论

### 4.1 多库一致性需要停写屏障

SQLite backup 能为单个 DB 得到一致副本，但多个 DB 依次 backup 不是分布式事务。
本例要求调用方停服务并关闭 graph/saver/MCP/业务连接，函数逐个只读打开。
“调用了 backup”不能证明 quiescence；完整产品需要运维步骤与无运行任务检查。
不要直接 cp 主文件而漏 WAL，也不要复制时让服务继续接受审批写入。

### 4.2 摘要和 integrity 检查不同错误

SHA-256 检查文件字节是否与 manifest 一致；integrity_check 检查 SQLite 内部结构。
二者不证明备份完整业务语义或防恶意重写 manifest；manifest 不是签名。
还要检查 schema/model/graph 版本、记忆数量、任务回执、来源数量与删除标记。

### 4.3 删除账本必须比旧备份更新

删除事实不能只存在于旧备份里。当前删除账本在独立受限文件保存最小 actor/docId，
恢复后先重放到 sources、memory、checkpoint、缓存、trace，再开放服务。
本篇实现来源撤回重放，Capstone 删除线程需额外清 saver 与任务/trace。
物理擦除、加密备份、SSD/快照清理均需独立验收，不在测试绿灯中暗示通过。

## 5. 恢复顺序

| 顺序 | 操作 | 停止条件 |
| --- | --- | --- |
| 1 | 停入口、等待执行、关闭 DB | 仍有 running 就不备份 |
| 2 | backup 到新目录 | 不覆盖既有目录 |
| 3 | manifest/hash/integrity | 任一不匹配即拒绝 |
| 4 | fresh restore | 目标必须新建 |
| 5 | 当前删除账本/保留 | 未完成不可开放 |
| 6 | 版本/数量/负例 | 失败保留现场，不能假成功 |

<a id="ag-13a-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag13a/backup.ts`：

<!-- file: labs/ag13a/backup.ts -->
```ts
import { DatabaseSync, backup } from "node:sqlite";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { sourceStore } from "../ag08a/sources.js";
const Name = z.string().regex(/^[a-z][a-z0-9-]*\.sqlite$/);
const Manifest = z.strictObject({ version: z.literal(1), files: z.array(z.strictObject({
  name: Name, sha256: z.string().regex(/^[a-f0-9]{64}$/),
})).min(1).max(8) });
const digest = (data: Buffer) => createHash("sha256").update(data).digest("hex");
export async function backupClosed(root: string, names: string[], destination: string) {
  if (!names.length || names.length > 8 || new Set(names).size !== names.length) {
    throw new Error("backup_names");
  }
  names.forEach(name => Name.parse(name));
  await mkdir(destination, { mode: 0o700 });
  const files = [];
  for (const name of names) {
    const db = new DatabaseSync(join(root, name), { readOnly: true });
    try { await backup(db, join(destination, name)); } finally { db.close(); }
    files.push({ name, sha256: digest(await readFile(join(destination, name))) });
  }
  const manifest = Manifest.parse({ version: 1, files });
  await writeFile(join(destination, "manifest.json"), JSON.stringify(manifest), { mode: 0o600 });
  return manifest;
}
export async function restoreFresh(source: string, destination: string) {
  const manifest = Manifest.parse(JSON.parse(await readFile(join(source, "manifest.json"), "utf8")));
  if (new Set(manifest.files.map(x => x.name)).size !== manifest.files.length) {
    throw new Error("duplicate_backup_file");
  }
  for (const file of manifest.files) {
    if (digest(await readFile(join(source, file.name))) !== file.sha256) throw new Error("backup_hash");
    const db = new DatabaseSync(join(source, file.name), { readOnly: true });
    try {
      const result = db.prepare("PRAGMA integrity_check").get();
      if (result?.integrity_check !== "ok") throw new Error("backup_integrity");
    } finally { db.close(); }
  }
  await mkdir(destination, { mode: 0o700 });
  for (const file of manifest.files) {
    await copyFile(join(source, file.name), join(destination, file.name));
  }
  return manifest.files.map(x => x.name);
}
const Deletion = z.strictObject({ actor: z.string().min(1).max(80),
  docId: z.string().regex(/^doc:[a-z0-9-]+$/) });
export function applySourceDeletions(path: string, raw: unknown) {
  const deletions = z.array(Deletion).max(10000).parse(raw);
  const store = sourceStore(path);
  try { for (const item of deletions) store.withdraw(item.actor, item.docId); }
  finally { store.close(); }
}
```

destination 不存在时才能创建，防止覆盖。文件权限目录 0700、manifest 0600，
DB 文件权限仍受进程 umask，启动使用 umask 077；文件保护不代替备份加密。
restoreFresh 只复制验证过的 DB，不启动服务、不恢复外部模型配置。

<a id="ag-13a-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag13a/backup.test.ts`：

<!-- file: labs/ag13a/backup.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { sourceStore } from "../ag08a/sources.js";
import { backupClosed, restoreFresh, applySourceDeletions } from "./backup.js";
test("old backup restores into fresh directory without reviving current deletions", async () => {
  const root = await mkdtemp(join(tmpdir(), "agent-backup-"));
  try {
    const live = join(root, "live"); await mkdir(live);
    const store = sourceStore(join(live, "sources.sqlite"));
    store.select({ actor: "alice", docId: "doc:guide", text: "backup policy=daily" });
    store.close();
    const saved = join(root, "saved");
    await backupClosed(live, ["sources.sqlite"], saved);
    const restored = join(root, "restored");
    assert.deepEqual(await restoreFresh(saved, restored), ["sources.sqlite"]);
    applySourceDeletions(join(restored, "sources.sqlite"), [{ actor: "alice", docId: "doc:guide" }]);
    const current = sourceStore(join(restored, "sources.sqlite"));
    try { assert.equal(current.search("alice", "backup").length, 0); }
    finally { current.close(); }
    await assert.rejects(restoreFresh(saved, restored), /EEXIST/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("changed backup bytes fail before creating restore directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "agent-corrupt-"));
  try {
    const live = join(root, "live"); await mkdir(live);
    const store = sourceStore(join(live, "sources.sqlite")); store.close();
    const saved = join(root, "saved");
    await backupClosed(live, ["sources.sqlite"], saved);
    await appendFile(join(saved, "sources.sqlite"), "EXAMPLE_CORRUPTION");
    await assert.rejects(restoreFresh(saved, join(root, "restored")), /backup_hash/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("latest deletion ledger also blocks documents absent from an old backup", async () => {
  const root = await mkdtemp(join(tmpdir(), "agent-backup-missing-"));
  try {
    const live = join(root, "live"); await mkdir(live);
    const store = sourceStore(join(live, "sources.sqlite")); store.close();
    const saved = join(root, "saved");
    await backupClosed(live, ["sources.sqlite"], saved);
    const restored = join(root, "restored");
    await restoreFresh(saved, restored);
    const path = join(restored, "sources.sqlite");
    const ledger = [{ actor: "alice", docId: "doc:after-backup" }];
    applySourceDeletions(path, ledger);
    applySourceDeletions(path, ledger);
    const current = sourceStore(path);
    try {
      assert.throws(() => current.select({
        actor: "alice", docId: "doc:after-backup", text: "backup reminder",
      }), /source_withdrawn/);
      assert.equal(current.search("alice", "backup").length, 0);
    } finally { current.close(); }
  } finally { await rm(root, { recursive: true, force: true }); }
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --rootDir labs --outDir dist labs/ag13a/*.ts
node --test dist/ag13a/backup.test.js
```

预期 3 项真实文件测试通过，包含旧备份缺失来源的删除账本重放。每项仅清理自身 mkdtemp 目录，测试自行退出；
没有任何真实资料备份或物理擦除。

<a id="ag-13a-s8"></a>
## 8. 错误实验与排查

跳过 applySourceDeletions，第一项恢复后检索仍命中，红灯。
跳过摘要校验则第二项不再在预期 backup_hash 层拒绝。恢复两处，重新生成专用测试备份；
不要以“SQLite 还能打开”判断文件没有篡改。

## 9. 课后题与答案

1. 单库 backup 等于多库事务吗？不是，需要 quiescence。
2. manifest hash 防恶意 manifest 改写吗？不能，没有签名或可信离线锚。
3. 删来源等于删 checkpoint 吗？不是，存储域分别清理。
4. 备份加密已实现吗？没有，只用合成数据，真实资料必须加独立加密和密钥保管方案。

<a id="ag-13a-s10"></a>
## 10. 三类练习与答案

**基础**：第二次备份到同目录。答案：mkdir EEXIST 拒绝，不覆盖旧证据。

**进阶**：备份 Capstone 全库。答案：停 API、等待任务、关闭 host 后列
sources/tasks/checkpoints/trace DB，再存 graph/model/config manifest；
恢复到新目录重放删除账本、清线程和保留、跑负例后才服务。

**故障注入**：备份时仍接受批准。答案：多库时间点失配风险，取消备份结果的使用；
加入停入口屏障，不靠复制更多次求碰巧一致。

<a id="ag-13a-s11"></a>
## 11. 阶段验收

- [ ] 3 项通过，真实 DB/hash/integrity 与新目录恢复。
- [ ] 撤回账本重放后旧备份来源不可检索。
- [ ] 不覆盖目录，不声称在线多库原子。
- [ ] 加密、物理擦除、真实资料恢复未混入已通过项。

## 12. 常见问题

**失败恢复目录怎么处理？** 保持离线、标记不可服务，检查日志与 manifest。
本例函数不自动删目录，以免删除用户数据；测试只清理自己创建的 root。

## 13. 扩展阅读

[Node SQLite backup](https://nodejs.org/docs/latest-v22.x/api/sqlite.html)、
[SQLite Online Backup](https://sqlite.org/backup.html)。

## 我现在能做到什么

我能恢复校验过的本地副本，并阻止旧备份复活已撤回来源。

## 单元导航

- 上一单元：[本地 UI](../12-local-product/02-ui-progress-cancel-recovery.md)
- 下一单元：[升级与模型回滚](./02-upgrade-model-rollback.md)
- 本卷入口：[README](../README.md)
