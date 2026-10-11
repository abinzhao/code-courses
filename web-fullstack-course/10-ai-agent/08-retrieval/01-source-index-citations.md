# 来源索引：显式选择、行号与内容版本

## 任务卡

- **任务**：把用户明确选择的文本存入 SQLite，返回可追踪的行片段。
- **产出**：`labs/ag08a/sources.ts`、`labs/ag08a/sources.test.ts`。
- **证据**：4 项测试，用户隔离、行号与摘要、撤回及缺失来源删除账本重放。
- **边界**：只索引传入文本，不扫描主目录；PDF 需在本机单独提取文本并人工核对页码。
- **唯一 ID**：`AG-08A`。

## 1. 任务背景

资料 Agent 不能以“可能相关”为由遍历整个磁盘。选中文档是一次授权，索引是它的派生副本。
源文件修改后，同一个文件名并不代表同一证据。引用应绑定内容版本，不能只返回路径字符串。
本篇先建立关键字检索基线，下一篇核验引用、召回与来源矛盾。

## 2. 学习目标

建立显式来源集合；保留空行导致的原始行号；按 actor 查询；
为内容计算 SHA-256；即时撤回来源；解释关键字与向量检索的取舍。

## 3. 预备知识

完成[记忆保留与删除](../07-state-memory/02-memory-retention-deletion.md)。
这里只处理 UTF-8 文本。正文来自用户选择后可信 host 的文件读取，不接受模型提供的路径。
SQLite 文件和资料都是本地副本，权限与备份仍属于后续交付验收。

<a id="ag-08a-s4"></a>
## 4. 核心理论

### 4.1 来源身份、位置和版本是三件事

docId 标识来源，line 标识片段位置，hash 标识该版完整文本。换行规范化会影响摘要，
因此在入库前统一 CRLF 为 LF，再按原始行序切片。空行不索引，但不得重新编号。
模型不能自选 hash 或把来源路径升级成文件系统能力。

### 4.2 简单基线能暴露复杂系统的问题

`instr(lower(text), lower(query))` 是完整短语子串匹配，不是中文分词或语义搜索。
它可解释、无需 embedding 服务，但同义词与跨行语义召回有限。先测 recall@k，
再决定是否引入本地 embedding。向量索引还要解决模型版本、相似度、删除同步与存储副本，
不能只因“RAG 通常用向量”就增加依赖。

### 4.3 撤回先切断使用，再清理副本

本例在同一事务内标记 doc 为 deleted 并删除所有 chunks；搜索和按行读取均关联 deleted=0。
保留 tombstone 使同 ID 不能自动复活。记忆、checkpoint、答案缓存和旧备份不在这张表，
需要独立清理。hash 不是加密，不能用它保护短文本秘密。

## 5. 数据契约

| 字段 | 来源 | 约束 |
| --- | --- | --- |
| actor | 已认证 host | 不由模型赋值 |
| docId | host 选择记录 | `doc:` 前缀 |
| text | 用户明确选择文本 | 32 KiB、最多 2000 行 |
| line | 入库切片器 | 原始正整数行号 |
| hash | host SHA-256 | 引用版本，不是权限凭证 |
| deleted | 撤回账本 | 所有读取必须过滤 |

<a id="ag-08a-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag08a/sources.ts`：

<!-- file: labs/ag08a/sources.ts -->
```ts
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { z } from "zod";

const Selection = z.strictObject({
  actor: z.string().min(1).max(80),
  docId: z.string().regex(/^doc:[a-z0-9-]+$/),
  text: z.string().max(32_768),
});
export const ChunkSchema = z.strictObject({
  docId: z.string(), line: z.number().int().positive(),
  hash: z.string().regex(/^[a-f0-9]{64}$/), text: z.string().max(2000),
});
export type Chunk = z.infer<typeof ChunkSchema>;

export function sourceStore(path: string) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS docs(
      actor TEXT NOT NULL,id TEXT NOT NULL,hash TEXT NOT NULL,
      deleted INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(actor,id));
    CREATE TABLE IF NOT EXISTS chunks(
      actor TEXT NOT NULL,doc TEXT NOT NULL,line INTEGER NOT NULL,text TEXT NOT NULL,
      PRIMARY KEY(actor,doc,line),FOREIGN KEY(actor,doc) REFERENCES docs(actor,id));`);
  const rows = (values: unknown[]): Chunk[] => values.map(value => ChunkSchema.parse(value));
  return {
    db,
    select(raw: unknown) {
      const input = Selection.parse(raw);
      const text = input.text.replace(/\r\n/g, "\n");
      if (Buffer.byteLength(text) > 32_768) throw new Error("source_too_large");
      const lines = text.split("\n");
      if (lines.length > 2000 || lines.some(line => line.length > 2000)) {
        throw new Error("chunk_limit");
      }
      const hash = createHash("sha256").update(text).digest("hex");
      db.exec("BEGIN IMMEDIATE");
      try {
        const prior = db.prepare("SELECT deleted FROM docs WHERE actor=? AND id=?")
          .get(input.actor, input.docId);
        if (prior?.deleted === 1) throw new Error("source_withdrawn");
        db.prepare(`INSERT INTO docs(actor,id,hash) VALUES(?,?,?)
          ON CONFLICT(actor,id) DO UPDATE SET hash=excluded.hash`)
          .run(input.actor, input.docId, hash);
        db.prepare("DELETE FROM chunks WHERE actor=? AND doc=?").run(input.actor, input.docId);
        const insert = db.prepare("INSERT INTO chunks VALUES(?,?,?,?)");
        lines.forEach((line, index) => {
          if (line.trim()) insert.run(input.actor, input.docId, index + 1, line);
        });
        db.exec("COMMIT");
        return hash;
      } catch (error) { db.exec("ROLLBACK"); throw error; }
    },
    search(actor: string, query: string, limit = 4): Chunk[] {
      z.string().min(2).max(80).parse(query);
      z.number().int().min(1).max(8).parse(limit);
      return rows(db.prepare(`SELECT d.id AS docId,c.line,d.hash,c.text
        FROM chunks c JOIN docs d ON d.actor=c.actor AND d.id=c.doc
        WHERE c.actor=? AND d.deleted=0 AND instr(lower(c.text),lower(?))>0
        ORDER BY d.id,c.line LIMIT ?`).all(actor, query, limit));
    },
    get(actor: string, docId: string, line: number): Chunk | undefined {
      const row = db.prepare(`SELECT d.id AS docId,c.line,d.hash,c.text
        FROM chunks c JOIN docs d ON d.actor=c.actor AND d.id=c.doc
        WHERE c.actor=? AND c.doc=? AND c.line=? AND d.deleted=0`).get(actor, docId, line);
      return row ? ChunkSchema.parse(row) : undefined;
    },
    withdraw(actor: string, docId: string) {
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare(`INSERT INTO docs(actor,id,hash,deleted) VALUES(?,?,?,1)
          ON CONFLICT(actor,id) DO UPDATE SET deleted=1`)
          .run(actor, docId, "0".repeat(64));
        db.prepare("DELETE FROM chunks WHERE actor=? AND doc=?").run(actor, docId);
        db.exec("COMMIT");
      } catch (error) { db.exec("ROLLBACK"); throw error; }
    },
    close() { db.close(); },
  };
}
export type SourceStore = ReturnType<typeof sourceStore>;
```

更新同 ID 会替换旧版片段，不保留历史正文；旧答案必须再次核验 hash。
正文不写入 trace。索引里仍有正文，不能把“关日志”说成“磁盘没有内容”。
撤回缺失来源也会创建 tombstone，让较旧备份重放删除账本后不能重新导入同一身份下的同 ID。
新增 tombstone 的全零 hash 只是无正文标记，不属于可检索来源；已有行保留原 hash。

<a id="ag-08a-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag08a/sources.test.ts`：

<!-- file: labs/ag08a/sources.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { sourceStore } from "./sources.js";
test("selected source preserves original line and version", () => {
  const store = sourceStore(":memory:");
  try {
    const hash = store.select({ actor: "alice", docId: "doc:guide", text: "\nbackup daily\r\n" });
    assert.deepEqual(store.search("alice", "backup").map(x => [x.line, x.hash]), [[2, hash]]);
    const newer = store.select({ actor: "alice", docId: "doc:guide", text: "backup weekly" });
    assert.notEqual(newer, hash);
    assert.equal(store.get("alice", "doc:guide", 2), undefined);
  } finally { store.close(); }
});
test("actor scope and literal query prevent broad access", () => {
  const store = sourceStore(":memory:");
  try {
    store.select({ actor: "alice", docId: "doc:guide", text: "backup daily" });
    assert.equal(store.search("bob", "backup").length, 0);
    assert.equal(store.search("alice", "' OR 1=1 --").length, 0);
    assert.throws(() => store.search("alice", "x"));
  } finally { store.close(); }
});
test("withdrawal invalidates reads and prevents automatic revival", () => {
  const store = sourceStore(":memory:");
  try {
    const selection = { actor: "alice", docId: "doc:guide", text: "backup daily" };
    store.select(selection);
    store.withdraw("alice", "doc:guide");
    assert.equal(store.search("alice", "backup").length, 0);
    assert.equal(store.get("alice", "doc:guide", 1), undefined);
    assert.throws(() => store.select(selection), /source_withdrawn/);
  } finally { store.close(); }
});
test("deletion replay preserves absent-source tombstones and actor isolation", () => {
  const store = sourceStore(":memory:");
  try {
    store.withdraw("alice", "doc:after-backup");
    store.withdraw("alice", "doc:after-backup");
    assert.throws(() => store.select({
      actor: "alice", docId: "doc:after-backup", text: "backup daily",
    }), /source_withdrawn/);
    assert.equal(store.search("alice", "backup").length, 0);
    store.select({ actor: "bob", docId: "doc:after-backup", text: "backup daily" });
    assert.equal(store.search("bob", "backup").length, 1);
    assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM docs WHERE actor=?")
      .get("alice")?.n, 1);
  } finally { store.close(); }
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag08a labs/ag08a/*.ts
node --test dist/ag08a/sources.test.js
```

预期 4 项通过；只有 SQLite 内存库，无文件扫描，测试自行退出。
真实选择文件的限量读取在 Capstone CLI 实现，不把数据库函数暴露为任意路径工具。

<a id="ag-08a-s8"></a>
## 8. 错误实验与排查

切片前先 `filter(Boolean)` 再编号，第一项 line 从 2 变成 1，引用错位。
恢复为先保留 index 再跳过空行。删除 actor WHERE 会使第二项越权；
不能通过给用户的结果列表做过滤来补救数据库已读出的正文。

## 9. 课后题与答案

1. hash 能授权读文件吗？不能，只标识版本。
2. 为什么不默认扫描 Downloads？未取得用户的资料选择授权。
3. PDF 页码能直接用提取文本行号代替吗？不能，需保存提取器、文件摘要和页码映射并核对。
4. 关键字基线召回差怎么办？先固定评测集，比较新检索器，不放宽引用核验。

<a id="ag-08a-s10"></a>
## 10. 三类练习与答案

**基础**：索引三行，中间为空。答案：两条 chunks 的 line 是 1、3，而非 1、2。

**进阶**：加入段落切片。答案：每片保存 startLine/endLine、内容摘要和 overlap 策略；
验收原始片段可定位，引用 parser 必须同步升级，不能只改切片器。

**故障注入**：撤回只删 docs 不删 chunks。答案：外键可能拒绝删除；先标 tombstone 再
事务清 chunks。另查记忆与 checkpoint，不以这一张表清空代表所有副本已擦除。

<a id="ag-08a-s11"></a>
## 11. 阶段验收

- [ ] 4 项通过，来源只有显式选择文本。
- [ ] actor、原始行号、hash 能同时定位来源。
- [ ] 改版替换，撤回立即停止检索且不能自动复活。
- [ ] 明确关键字与 PDF 页码限制，不宣称语义召回已通过。

## 12. 常见问题

**为什么没存绝对路径？** 模型和答案不需要宿主机路径。host 可在单独用户选择清单中保存
路径，展示时脱敏；工具只接受 docId，避免路径 traversal 或意外读取私有文件。

## 13. 扩展阅读

[SQLite core functions](https://sqlite.org/lang_corefunc.html)、
[Node SQLite](https://nodejs.org/docs/latest-v22.x/api/sqlite.html)。
本例不用远程 embedding 服务；向量搜索与 OCR 均未实现。

## 我现在能做到什么

我能为明确选择的资料建立可撤回索引，让检索结果带真实位置和版本。

## 单元导航

- 上一单元：[长期记忆](../07-state-memory/02-memory-retention-deletion.md)
- 下一单元：[召回、冲突与引用核验](./02-recall-conflicts-deletion.md)
- 本卷入口：[README](../README.md)
