# 长期记忆、保留与删除：不是把全部聊天存下来

## 任务卡

- **任务**：建立有 actor、来源、到期和删除标记的 SQLite 记忆。
- **产出**：`labs/ag07b/memory.ts`、`labs/ag07b/memory.test.ts`。
- **证据**：3 项测试，跨用户隔离、到期过滤、来源删除和 purge。
- **边界**：逻辑删除不等于磁盘安全擦除；备份中的残留由第 13 章处理。
- **唯一 ID**：`AG-07B`。

## 1. 任务背景

模型说“用户总是希望公开分享”不能自动成为长期偏好。长期记忆应由用户明确确认，
关联来源与保留期限；不从整段聊天自动抽取敏感事实。
短期 checkpoint 与长期记忆是不同存储域，删除其中一个不等于删除全部数据。

## 2. 学习目标

按 actor 读写；用 host 时钟过滤到期；来源删除级联记忆；
区分 soft delete、purge、checkpoint 删除与备份恢复再删除。

## 3. 预备知识

完成[checkpoint](./01-sqlite-checkpoint-interrupt-resume.md)，理解 SQLite 参数绑定。
本项目与[共享业务契约](../../00-guide/project-contract.md)一致：Agent 只处理本地资料，
没有替用户修改 Listing 或 Reservation 的权限。

<a id="ag-07b-s4"></a>
## 4. 核心理论

### 4.1 记忆写入是显式数据决策

每条记忆包含 actor、sourceId、expiresAt 与 tombstone。user consent 不由模型自报；
本例存储函数是底层 API，正式 host 需要用户确认后才调用。
优先存可解释的小偏好，不保存秘密、原始附件和推理链。

### 4.2 查询时就实施隔离与到期

不能先读取全部再在 UI 过滤。WHERE 同时约束 actor、未删除、尚未到期。
时钟由 host 提供，不能让模型提供“当前日期”来绕过保留。测试注入 now，避免真实等待。

### 4.3 删除要覆盖所有副本

来源撤回时先禁止检索与记忆使用，再 purge 内容并删除相关线程。
checkpoint 可能含旧来源文本，向量索引、缓存和备份也可能残留。
本篇只覆盖这张表；完整删除清单需列出每个存储域。SQLite DELETE/VACUUM 不构成
SSD 安全擦除证明，尤其在快照、备份与 wear leveling 存在时。

## 5. 数据清单

| 字段 | 作用 | 约束 |
| --- | --- | --- |
| actor | 用户隔离 | host 绑定 |
| sourceId | 可撤回来源 | 不接受模型伪造 |
| expiresAt | 保留终点 | 整数毫秒、正值 |
| deleted | 即时停用 | 查询默认过滤 |
| value | 明确确认的小偏好 | 限长，不存秘密 |

<a id="ag-07b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag07b/memory.ts`：

<!-- file: labs/ag07b/memory.ts -->
```ts
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { z } from "zod";
const Memory = z.strictObject({
  actor: z.string().min(1).max(80), sourceId: z.string().min(1).max(80),
  value: z.string().min(1).max(200), expiresAt: z.number().int().positive(),
});
export function memoryStore(path: string) {
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE IF NOT EXISTS memories(
    id TEXT PRIMARY KEY,actor TEXT NOT NULL,source TEXT NOT NULL,
    value TEXT NOT NULL,expires INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0);`);
  return {
    put(input: unknown) {
      const memory = Memory.parse(input);
      const id = randomUUID();
      db.prepare("INSERT INTO memories(id,actor,source,value,expires) VALUES(?,?,?,?,?)")
        .run(id, memory.actor, memory.sourceId, memory.value, memory.expiresAt);
      return id;
    },
    active(actor: string, now: number) {
      return db.prepare(`SELECT id,source,value FROM memories
        WHERE actor=? AND deleted=0 AND expires>? ORDER BY id`).all(actor, now);
    },
    deleteSource(actor: string, sourceId: string) {
      db.prepare("UPDATE memories SET deleted=1 WHERE actor=? AND source=?")
        .run(actor, sourceId);
    },
    purge(actor: string) {
      return db.prepare("DELETE FROM memories WHERE actor=? AND deleted=1").run(actor).changes;
    },
    count() { return db.prepare("SELECT id FROM memories").all().length; },
    close() { db.close(); },
  };
}
```

active 返回最小字段，不把 deleted 标记取消后再恢复。生产需对读取 actor 参数绑定真实身份；
不能公开一个“传谁就读谁”的 HTTP endpoint。

<a id="ag-07b-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag07b/memory.test.ts`：

<!-- file: labs/ag07b/memory.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStore } from "./memory.js";
test("actor scope is part of the query", () => {
  const store = memoryStore(":memory:");
  try {
    store.put({ actor: "alice", sourceId: "doc:a", value: "brief", expiresAt: 200 });
    store.put({ actor: "bob", sourceId: "doc:a", value: "detailed", expiresAt: 200 });
    assert.equal(store.active("alice", 100).length, 1);
    assert.equal(store.active("unknown", 100).length, 0);
  } finally { store.close(); }
});
test("expiry uses injected host time", () => {
  const store = memoryStore(":memory:");
  try {
    store.put({ actor: "alice", sourceId: "doc:a", value: "brief", expiresAt: 200 });
    assert.equal(store.active("alice", 199).length, 1);
    assert.equal(store.active("alice", 200).length, 0);
  } finally { store.close(); }
});
test("source withdrawal stops use before purge without affecting another actor", () => {
  const store = memoryStore(":memory:");
  try {
    for (const actor of ["alice", "bob"]) {
      store.put({ actor, sourceId: "doc:a", value: "brief", expiresAt: 200 });
    }
    store.deleteSource("alice", "doc:a");
    assert.equal(store.active("alice", 100).length, 0);
    assert.equal(store.active("bob", 100).length, 1);
    assert.equal(store.purge("alice"), 1);
    assert.equal(store.count(), 1);
  } finally { store.close(); }
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag07b labs/ag07b/*.ts
node --test dist/ag07b/memory.test.js
```

预期 3 项通过，自行退出。示例 uses fixture identities，不使用真实个人资料。

<a id="ag-07b-s8"></a>
## 8. 错误实验与排查

从 active SQL 删除 actor 条件，第一项读出两行，红灯。
删除 expires 条件则第二项到期仍出现。恢复 WHERE 约束后复验；
不在调用方 `.filter()` 修复，因为数据库已经把别人的内容返回进程。

## 9. 课后题与答案

1. 删除 checkpoint 等于删除记忆吗？不是，两个存储域。
2. soft delete 后能再用于检索吗？不能，应即时过滤。
3. purge 是否证明磁盘无残留？不能，备份/快照/SSD 仍需独立策略。

<a id="ag-07b-s10"></a>
## 10. 三类练习与答案

**基础**：到期等于 now。答案：`expires > now`，相等时不返回。

**进阶**：加入用户确认摘要。答案：host 保存确认时间与来源版本，不接受模型自报
consent；权限审计只保存 ID/事件，避免重复记录 value。

**故障注入**：恢复旧备份使已删记忆复活。答案：备份恢复后先重放独立删除账本再开放服务，
第 13 章实现该恢复顺序。

<a id="ag-07b-s11"></a>
## 11. 阶段验收

- [ ] 3 项通过，用户隔离、到期、删除均在查询层实现。
- [ ] 来源撤回后立即停用，再 purge。
- [ ] 明确 checkpoint、索引、缓存、备份还有独立删除责任。
- [ ] 未将逻辑删除声称为安全擦除。

## 12. 常见问题

**为什么没有自动记忆提取？** 它涉及误记、敏感数据和用户同意。先建立可审计的显式记忆，
不将模型总结自动变成永久身份事实。

## 13. 扩展阅读

[LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)、
[SQLite deletion](https://sqlite.org/pragma.html#pragma_secure_delete)。
secure_delete 也不覆盖所有物理副本。

## 我现在能做到什么

我能给长期记忆设置来源、范围、期限与删除路径，并说明剩余副本边界。

## 单元导航

- 上一单元：[Checkpoint 恢复](./01-sqlite-checkpoint-interrupt-resume.md)
- 下一单元：[来源索引与引用](../08-retrieval/01-source-index-citations.md)
- 本卷入口：[README](../README.md)
