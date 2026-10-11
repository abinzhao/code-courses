# 升级、图版本与模型回滚：可运行不等于兼容

## 任务卡

- **任务**：事务化 schema 升级，拒绝图/checkpoint 或模型身份失配。
- **产出**：`labs/ag13b/release.ts`、`labs/ag13b/release.test.ts`。
- **证据**：2 项测试，升级故障回滚、版本门禁与 remote 拒绝。
- **边界**：不下载模型、不发布、不迁移真实用户 DB；真实模型回滚需硬件另验。
- **唯一 ID**：`AG-13B`。

## 1. 任务背景

新版本图改变 interrupt 顺序后，旧 checkpoint resume 值可能对应错误位置。
更换模型 tag 也可能换了 artifact。升级不是把 npm install 成功当兼容；
需要独立目录、新版验证、旧版本与旧数据备份的对应关系。

## 2. 学习目标

记录 schema/graph/model/hash/提示/工具版本；事务迁移；
失配拒绝恢复；expand-contract 的含义；明确回滚数据与模型两条路径。

## 3. 预备知识

完成[备份恢复](./01-backup-restore-deletion-ledger.md)。
本篇 migration 是独立教学表，不直接修改 LangGraph saver 内部生成表，
也不把未知 checkpoint 自动迁到新图。

<a id="ag-13b-s4"></a>
## 4. 核心理论

### 4.1 兼容性是版本组合

schemaVersion、graphVersion、toolVersion、promptVersion、模型 artifact digest 与量化信息
共同定义执行环境。可变 tag 不足以识别模型。进程启动和 resume 前核对组合；
旧 graph checkpoint 失配默认拒绝，用旧 graph 完成或导出业务意图新建线程，不能猜。

### 4.2 数据回滚不同于代码回滚

可加列的 expand migration 可能允许旧代码继续读，但删除列等 contract 阶段会破坏旧版本。
不要运行 DROP 列“回滚”真实数据。本例演示 v1→v2 加 priority，
故障在 ALTER 后发生时事务连 schema 与 user_version 一起回滚。
正式回滚使用关闭后的旧目录备份并先重放最新删除账本。

### 4.3 模型回滚必须保留本地包身份

保存旧模型 digest/量化/上下文配置和同评测集证据。回滚后重新探针、结构化输出、安全、
来源和人工质量；旧模型 fixture 通过不代表旧模型真的加载。
本课没有下载与实际本地模型，因此只能验证 manifest 门禁，不能宣称模型回滚成功。
remote mode 始终 disabled，不能用云模型作为回滚后备。

## 5. 发布门禁

| 项目 | 新版验收 | 回滚动作 |
| --- | --- | --- |
| 依赖 | 固定锁、类型/测试 | 旧目录与锁 |
| schema | 新副本迁移、数量/约束 | 旧数据备份 + 删除账本 |
| graph | 新线程负例与 interrupt | 旧 graph 或重新审批 |
| model | digest/探针/人工质量 | 原 artifact + 再测 |
| 工具 | schema/hash/授权矩阵 | 固定旧工具，不自动发现启用 |

<a id="ag-13b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag13b/release.ts`：

<!-- file: labs/ag13b/release.ts -->
```ts
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
export const ReleaseSchema = z.strictObject({
  schemaVersion: z.literal(2), graphVersion: z.literal("private-agent-v1"),
  toolVersion: z.literal("1"), promptVersion: z.literal("grounded-v1"),
  provider: z.enum(["fixture", "local"]),
  modelDigest: z.string().regex(/^[a-f0-9]{64}$/),
});
export function checkResume(release: unknown, storedGraph: string, installedDigest: string) {
  const value = ReleaseSchema.parse(release);
  if (storedGraph !== value.graphVersion) throw new Error("graph_version_mismatch");
  if (installedDigest !== value.modelDigest) throw new Error("model_artifact_mismatch");
  return value;
}
export function migrateCopy(path: string, injectFailure = false) {
  const db = new DatabaseSync(path);
  try {
    const version = z.number().parse(db.prepare("PRAGMA user_version").get()?.user_version);
    if (version === 2) return;
    if (version !== 1) throw new Error("unsupported_schema");
    db.exec("BEGIN IMMEDIATE");
    try {
      db.exec("ALTER TABLE task_items ADD COLUMN priority INTEGER NOT NULL DEFAULT 0 CHECK(priority BETWEEN 0 AND 2)");
      if (injectFailure) throw new Error("migration_failure");
      db.exec("PRAGMA user_version=2; COMMIT;");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  } finally { db.close(); }
}
```

函数名强调只在停机副本迁移。injectFailure 只用于实验，不来自 UI 或模型。
版本 0/未来版本默认拒绝，不“尝试创建一些表”后继续运行。

<a id="ag-13b-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag13b/release.test.ts`：

<!-- file: labs/ag13b/release.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkResume, migrateCopy } from "./release.js";
test("schema and user_version roll back together after injected failure", async () => {
  const root = await mkdtemp(join(tmpdir(), "agent-upgrade-"));
  const path = join(root, "copy.sqlite");
  try {
    let db = new DatabaseSync(path);
    db.exec("CREATE TABLE task_items(id TEXT PRIMARY KEY); INSERT INTO task_items VALUES('task-1'); PRAGMA user_version=1;");
    db.close();
    assert.throws(() => migrateCopy(path, true), /migration_failure/);
    db = new DatabaseSync(path);
    assert.equal(db.prepare("PRAGMA user_version").get()?.user_version, 1);
    assert.equal(db.prepare("PRAGMA table_info(task_items)").all().length, 1);
    db.close();
    migrateCopy(path);
    db = new DatabaseSync(path);
    assert.equal(db.prepare("PRAGMA user_version").get()?.user_version, 2);
    assert.equal(db.prepare("SELECT priority FROM task_items").get()?.priority, 0);
    db.close();
    migrateCopy(path);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("graph, artifact and remote profiles fail closed", () => {
  const release = { schemaVersion: 2, graphVersion: "private-agent-v1", toolVersion: "1",
    promptVersion: "grounded-v1", provider: "fixture", modelDigest: "a".repeat(64) };
  assert.equal(checkResume(release, "private-agent-v1", "a".repeat(64)).provider, "fixture");
  assert.throws(() => checkResume(release, "old-graph", "a".repeat(64)), /graph_version/);
  assert.throws(() => checkResume(release, "private-agent-v1", "b".repeat(64)), /model_artifact/);
  assert.throws(() => checkResume({ ...release, provider: "remote" }, "private-agent-v1", "a".repeat(64)));
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag13b labs/ag13b/*.ts
node --test dist/ag13b/release.test.js
```

预期 2 项通过，实际 SQLite schema 故障回滚；fixture digest 只检验版本比较，
不是已加载模型的证据。测试仅清理自己的临时目录，结束退出。

<a id="ag-13b-s8"></a>
## 8. 错误实验与排查

把 ALTER 移到事务外，第一项故障后 column 仍存在，红灯。
恢复事务。版本失配错误应停止恢复，不能把 storedGraph 字符串改成新版伪造兼容；
应使用旧图或用户确认后新任务。

## 9. 课后题与答案

1. 模型 tag 能识别回滚包吗？不能，需 digest 和量化等配置。
2. 依赖升级能覆盖旧 checkpoint 继续吗？先验版本兼容，默认不。
3. 代码回滚会自动恢复被 DROP 的数据吗？不会。
4. 本课证明真实模型回滚了吗？没有，硬件/模型未运行。

<a id="ag-13b-s10"></a>
## 10. 三类练习与答案

**基础**：user_version=3。答案：unsupported_schema，不能自动降级。

**进阶**：完整交付包。答案：dist、本地固定依赖锁、版本 manifest、启动说明、
模型安装清单（不含模型秘密）、备份恢复与删除账本；运行产物在个人工作区，不进教材树。

**故障注入**：回滚旧备份后遗漏新撤回记录。答案：恢复流程拒绝开放，
重放独立账本、清引用和相关线程后再测。

<a id="ag-13b-s11"></a>
## 11. 阶段验收

- [ ] 2 项通过，迁移故障回滚结构和版本。
- [ ] 图、模型身份、remote profile 失配拒绝。
- [ ] 回滚代码/数据/模型分别有步骤。
- [ ] 未迁移真实 DB，未将 fixture 宣称模型回滚证据。

## 12. 常见问题

**为什么不写自动向后迁移？** 数据删除通常不可逆，自动“down migration”容易制造假恢复。
保留旧运行目录与一致备份，按新删除账本恢复，比假设所有变更可逆更可靠。

## 13. 扩展阅读

[SQLite ALTER TABLE](https://sqlite.org/lang_altertable.html)、
[LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)。

## 我现在能做到什么

我能把升级视为版本组合验证，并在失配时停止而非猜测恢复。

## 单元导航

- 上一单元：[备份恢复](./01-backup-restore-deletion-ledger.md)
- 下一单元：[完整 Capstone](../14-capstone/01-private-agent-atomic-application.md)
- 本卷入口：[README](../README.md)
