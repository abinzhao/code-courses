# 工具幂等、超时与提交边界：一次请求不等于一次执行

## 任务卡

- **任务**：在 SQLite 中用唯一键将任务结果与幂等回执一起提交。
- **产出**：`labs/ag05b/commit.ts`、`labs/ag05b/commit.test.ts`。
- **证据**：3 项测试，重复请求只有一行、冲突参数拒绝、回滚不留半状态。
- **边界**：这是本地 DB 写入实验，不启用模型自主写；后续审批才允许用户确认写。
- **唯一 ID**：`AG-05B`。

## 1. 任务背景

工具已提交但响应丢失，恢复后再执行会重复创建任务。不能以“收到超时”推断事务未提交。
把业务行与幂等回执放在同一 SQLite 事务内，才能让重试查询得到相同结果。

## 2. 学习目标

用参数绑定执行 SQL；唯一键守住幂等；检测同一 key 不同参数；区分 DB 原子提交与外部文件写入。

## 3. 预备知识

事务、约束、hash。使用 Node `node:sqlite`，在当前 Node 22 基线为实验 API，运行会出现
ExperimentalWarning；不能据此声称所有 Node 版本可用。

<a id="ag-05b-s4"></a>
## 4. 核心理论

### 4.1 幂等键绑定意图

同 key 同 title 返回原结果；同 key 不同 title 拒绝 `idempotency_conflict`。
只保存 key 不保存参数摘要会误认不同操作。key 由 host/task 派生，不能无限接受模型生成键
绕过去重。参数 hash 对规范化对象计算，本例只有一个明确 title。

### 4.2 原子边界是数据库

BEGIN IMMEDIATE 在读回执前取得写锁，插入业务行与回执一起 COMMIT。
异常统一 ROLLBACK。文件、网络、Shell 不参与 SQLite 事务，不能在事务中调用它们然后
宣称原子。完整 Capstone 将确认写限制为本地任务表。

### 4.3 超时之后先查询回执

用户端超时只能说明没有收到结果。恢复时先查同 key，不重新生成不同 key。
若本地 DB 已提交，再次请求返回同一个 id。取消在 BEGIN 前检查；COMMIT 已完成后
不能向用户显示“从未发生”，应显示 committed 并允许新的补偿任务。

## 5. API 清单

| 项目 | 用途 | 注意 |
| --- | --- | --- |
| `DatabaseSync` | 本地 SQLite | 同步，不适合长查询主线程 |
| `BEGIN IMMEDIATE` | 串行提交 | 并发仍可能 SQLITE_BUSY |
| `UNIQUE` / PRIMARY KEY | 幂等约束 | 不是仅进程 Map |
| `createHash` | 参数摘要 | 不存秘密，非加密 |

<a id="ag-05b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag05b/commit.ts`：

<!-- file: labs/ag05b/commit.ts -->
```ts
import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
const Input = z.strictObject({
  key: z.string().min(1).max(80), title: z.string().min(1).max(120),
});
const Receipt = z.object({ id: z.string(), digest: z.string() });
export function taskStore(path: string) {
  const db = new DatabaseSync(path);
  db.exec(`CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, title TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS receipts(key TEXT PRIMARY KEY, digest TEXT NOT NULL,
    id TEXT NOT NULL REFERENCES tasks(id)); PRAGMA foreign_keys=ON;`);
  return {
    db,
    commit(raw: unknown, failBeforeReceipt = false) {
      const input = Input.parse(raw);
      const digest = createHash("sha256").update(JSON.stringify({ title: input.title })).digest("hex");
      db.exec("BEGIN IMMEDIATE");
      try {
        const prior = db.prepare("SELECT id,digest FROM receipts WHERE key=?").get(input.key);
        if (prior) {
          const receipt = Receipt.parse(prior);
          if (receipt.digest !== digest) throw new Error("idempotency_conflict");
          db.exec("COMMIT");
          return receipt.id;
        }
        const id = randomUUID();
        db.prepare("INSERT INTO tasks VALUES(?,?)").run(id, input.title);
        if (failBeforeReceipt) throw new Error("injected_failure");
        db.prepare("INSERT INTO receipts VALUES(?,?,?)").run(input.key, digest, id);
        db.exec("COMMIT");
        return id;
      } catch (error) { db.exec("ROLLBACK"); throw error; }
    },
    close() { db.close(); },
  };
}
```

failBeforeReceipt 是实验注入点，不来自模型或 API 输入。实际工具必须先经授权审批，
不把这个纯存储层当安全执行器。

<a id="ag-05b-s7"></a>
## 7. 集成与测试

完整文件 `labs/ag05b/commit.test.ts`：

<!-- file: labs/ag05b/commit.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { taskStore } from "./commit.js";
test("retry returns the same durable id", () => {
  const store = taskStore(":memory:");
  try {
    const id = store.commit({ key: "task-1", title: "Make backup" });
    assert.equal(store.commit({ key: "task-1", title: "Make backup" }), id);
    assert.equal(store.db.prepare("SELECT * FROM tasks").all().length, 1);
  } finally { store.close(); }
});
test("same key with different intent is rejected", () => {
  const store = taskStore(":memory:");
  try {
    store.commit({ key: "task-1", title: "A" });
    assert.throws(() => store.commit({ key: "task-1", title: "B" }), /idempotency_conflict/);
  } finally { store.close(); }
});
test("failure between writes leaves no task or receipt", () => {
  const store = taskStore(":memory:");
  try {
    assert.throws(() => store.commit({ key: "task-1", title: "A" }, true), /injected_failure/);
    assert.equal(store.db.prepare("SELECT * FROM tasks").all().length, 0);
    assert.equal(store.db.prepare("SELECT * FROM receipts").all().length, 0);
  } finally { store.close(); }
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag05b labs/ag05b/*.ts
node --test dist/ag05b/commit.test.js
```

预期 3 项通过。每项 finally 关闭 DB，自行退出。真实持久测试改用专用临时文件，不用用户 DB。

<a id="ag-05b-s8"></a>
## 8. 错误实验与排查

移除 BEGIN/COMMIT/ROLLBACK，使两次 INSERT 独立执行。故障注入测试会留下任务行。
这说明必须把回执与业务状态放在同一事务内；不能用 finally 删除任务模拟数据库原子性。
恢复事务后复验行数 0。

## 9. 课后题与答案

1. 超时说明没提交吗？不，可能已提交但回执未送达。
2. SQLite 能原子写文件与 DB 吗？不能，需要额外恢复协议。
3. 同 key 不同 title 怎么处理？拒绝冲突，不能返回旧成功。

<a id="ag-05b-s10"></a>
## 10. 三类练习与答案

**基础**：空 title。答案：parser 失败，两张表行数为 0。

**进阶**：跨进程恢复。答案：在临时目录创建 file DB，关闭后重开，用同 key 提交，
应返回原 id，tasks 仍一行；在 finally 只删除这个测试创建的目录。

**故障注入**：删掉 digest 比较。答案：第二项红灯；恢复意图绑定，不把 B 改回 A。

<a id="ag-05b-s11"></a>
## 11. 阶段验收

- [ ] 3 项通过，DB 资源关闭。
- [ ] 同 key 重试不重复写，参数冲突拒绝。
- [ ] 两次写之间故障回滚无半状态。
- [ ] 未宣称外部副作用参与 SQLite 原子事务。

## 12. 常见问题

**为何不把 Map 当幂等存储？** 进程重启会丢失，正好在恢复时失去保护。
Map 可作缓存，但 DB 唯一约束仍是最终判定。

## 13. 扩展阅读

[Node SQLite](https://nodejs.org/docs/latest-v22.x/api/sqlite.html)、
[SQLite Transactions](https://sqlite.org/lang_transaction.html)。
远程/文件工具默认禁用，本例只有本地表写。

## 我现在能做到什么

我能在本地事务内绑定幂等回执与业务写入，并重现提交中断导致的半状态。

## 单元导航

- 上一单元：[工具授权](./01-tool-registry-schema-authorization.md)
- 下一单元：[MCP stdio Server 与 Client](../06-mcp/01-stdio-server-client-contract.md)
- 本卷入口：[README](../README.md)
