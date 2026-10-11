# 召回、冲突与引用核验：来源存在还不够

## 任务卡

- **任务**：核验本轮检索片段、现存版本和原文引句，测量 recall@k。
- **产出**：`labs/ag08b/grounding.ts`、`labs/ag08b/grounding.test.ts`。
- **证据**：3 项测试，伪造/过期引用、来源矛盾、空集合与召回。
- **边界**：exact quote 不是语义蕴含证明；冲突检测只覆盖明确 `policy=` 教学格式。
- **唯一 ID**：`AG-08B`。

## 1. 任务背景

模型引用一个真实 docId，仍可能引用错误行、旧版本，或拿“不要删除备份”支持“删除备份”。
把“来源命中”当事实正确率会掩盖这些错误。来源撤回后，等待中的审批也必须失效。
本篇先核验可确定的来源不变量，再把开放语义判断交给离线质量评测。

## 2. 学习目标

从 unknown 解析带位置引用；本轮候选集限制；提交前重新核验来源；
表达缺证据与冲突；分离 recall、quote match 和人工支持度。

## 3. 预备知识

依赖[来源索引](./01-source-index-citations.md)的两个完整文件。
本篇升级答案结构为 GroundedAnswer，原来的 AG-01A parser 仍是基础独立实验；
不要把两版同名字段混接。

<a id="ag-08b-s4"></a>
## 4. 核心理论

### 4.1 引用必须经过两次集合约束

先检查模型引用是否属于本轮检索结果，再按 actor/docId/line 从当前存储重读并比 hash。
只检查数据库存在会允许模型引入未被检索、未展示的资料；只检查候选集会接受已撤回的旧资料。
最后检查 quote 是当前行的连续子串。三个条件分别守住使用范围、时间版本和引句真实性。

### 4.2 缺证据不能靠自由补全解决

候选为空必须 abstained/no_evidence。来源明确冲突则 abstained/conflicting_evidence。
本例 `policy=daily` 与 `policy=weekly` 是结构化教学规则，可确定比较。
现实文本的时间、适用对象、优先级可能不同，不应只搜索“not”就宣称矛盾；
需要来源元数据、领域规则或人工判定，本篇不假装已经解决开放冲突。

### 4.3 召回不等于答案质量

recall@k 是检索到的相关来源数除以标注相关数。无相关来源样本的 recall 为 null，
不能把 0/0 写为 100%。precision、支持度、拒答恰当性分别测量。
检索器对固定集变好也不代表生产资料变好，评测版本与适用资料类型要记录。

## 5. 核验顺序

| 门禁 | 失败 | 处理 |
| --- | --- | --- |
| 严格 JSON schema | 额外工具意图 | 协议失败 |
| 候选集合 | 非本轮来源 | 拒绝 |
| 当前 hash | 修改/撤回 | 重新检索，不自动提交 |
| quote match | 虚构引句 | 拒绝 |
| 已知冲突 | 多值 policy | 明确拒答 |
| 语义支持度 | 引句不支持结论 | 离线 judge/人工评分 |

<a id="ag-08b-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag08b/grounding.ts`：

<!-- file: labs/ag08b/grounding.ts -->
```ts
import { z } from "zod";
import type { Chunk, SourceStore } from "../ag08a/sources.js";
const Citation = z.strictObject({
  docId: z.string().regex(/^doc:[a-z0-9-]+$/), line: z.number().int().positive(),
  hash: z.string().regex(/^[a-f0-9]{64}$/), quote: z.string().min(4).max(2000),
});
export const GroundedSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("answered"), text: z.string().min(1).max(2000),
    citations: z.array(Citation).min(1).max(8) }),
  z.strictObject({ status: z.literal("abstained"),
    reason: z.enum(["no_evidence", "conflicting_evidence"]) }),
]);
export type GroundedAnswer = z.infer<typeof GroundedSchema>;
const key = (c: { docId: string; line: number; hash: string }) =>
  JSON.stringify([c.docId, c.line, c.hash]);
export function hasKnownConflict(chunks: Chunk[]): boolean {
  const values = new Set(chunks.flatMap(c => [...c.text.matchAll(/\bpolicy=([a-z]+)/g)]
    .map(match => match[1])));
  return values.size > 1;
}
export function verify(raw: string, actor: string, candidates: Chunk[],
  store: SourceStore): GroundedAnswer {
  if (Buffer.byteLength(raw) > 16_384) throw new Error("answer_limit");
  const value: unknown = JSON.parse(raw);
  const answer = GroundedSchema.parse(value);
  const expected = candidates.length === 0 ? "no_evidence"
    : hasKnownConflict(candidates) ? "conflicting_evidence" : undefined;
  if (expected && (answer.status !== "abstained" || answer.reason !== expected)) {
    throw new Error("abstention_required");
  }
  if (answer.status === "answered") {
    const allowed = new Set(candidates.map(key));
    const seen = new Set<string>();
    for (const citation of answer.citations) {
      const id = key(citation);
      if (!allowed.has(id) || seen.has(id)) throw new Error("citation_scope");
      seen.add(id);
      const current = store.get(actor, citation.docId, citation.line);
      if (!current || current.hash !== citation.hash) throw new Error("stale_source");
      if (!current.text.includes(citation.quote)) throw new Error("invented_quote");
    }
  }
  return answer;
}
export function recallAtK(retrieved: string[], relevant: string[], k: number): number | null {
  z.number().int().positive().parse(k);
  const truth = new Set(relevant);
  if (!truth.size) return null;
  const hits = new Set(retrieved.slice(0, k).filter(id => truth.has(id)));
  return hits.size / truth.size;
}
```

允许模型在有证据时谨慎拒答，不强迫它为了通过率编造 answered。
verify 不声称 text 语义正确，不能直接将其通过数命名为“事实正确数”。

<a id="ag-08b-s7"></a>
## 7. 集成与运行

完整文件 `labs/ag08b/grounding.test.ts`：

<!-- file: labs/ag08b/grounding.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { sourceStore } from "../ag08a/sources.js";
import { verify, recallAtK } from "./grounding.js";
test("citation quote, scope and current source are independently checked", () => {
  const store = sourceStore(":memory:");
  try {
    store.select({ actor: "alice", docId: "doc:guide", text: "backup policy=daily" });
    const chunks = store.search("alice", "backup");
    const c = chunks[0]!;
    const answer = { status: "answered", text: "Make a daily backup.",
      citations: [{ docId: c.docId, line: c.line, hash: c.hash, quote: "policy=daily" }] };
    assert.equal(verify(JSON.stringify(answer), "alice", chunks, store).status, "answered");
    answer.citations[0]!.quote = "policy=never";
    assert.throws(() => verify(JSON.stringify(answer), "alice", chunks, store), /invented_quote/);
    answer.citations[0]!.quote = "policy=daily";
    assert.throws(() => verify(JSON.stringify(answer), "bob", chunks, store), /stale_source/);
    store.withdraw("alice", "doc:guide");
    assert.throws(() => verify(JSON.stringify(answer), "alice", chunks, store), /stale_source/);
  } finally { store.close(); }
});
test("known conflicting sources require an explicit abstention", () => {
  const store = sourceStore(":memory:");
  try {
    for (const [docId, text] of [["doc:a", "backup policy=daily"], ["doc:b", "backup policy=weekly"]]) {
      store.select({ actor: "alice", docId, text });
    }
    const chunks = store.search("alice", "backup");
    assert.throws(() => verify('{"status":"abstained","reason":"no_evidence"}',
      "alice", chunks, store), /abstention_required/);
    assert.equal(verify('{"status":"abstained","reason":"conflicting_evidence"}',
      "alice", chunks, store).status, "abstained");
  } finally { store.close(); }
});
test("empty evidence and recall denominators stay explicit", () => {
  const store = sourceStore(":memory:");
  try {
    assert.equal(verify('{"status":"abstained","reason":"no_evidence"}',
      "alice", [], store).status, "abstained");
    assert.equal(recallAtK(["doc:a", "doc:a", "doc:b"], ["doc:a", "doc:b"], 2), 0.5);
    assert.equal(recallAtK([], [], 4), null);
  } finally { store.close(); }
});
```

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --rootDir labs --outDir dist labs/ag08b/*.ts
node --test dist/ag08b/grounding.test.js
```

预期 3 项通过，依赖自动编译到 `dist/ag08a`；无模型调用，测试自行退出。

<a id="ag-08b-s8"></a>
## 8. 错误实验与排查

删掉 current 查询，撤回后的第一项应红灯。恢复查询再测。
仅检查 docId 会让错误行和旧 hash 通过；排查时分别记录 scope/stale/quote 原因码，
不在日志中复制附件正文。模型语义错误却 parser 通过时，转入质量评分，不改 parser 掩盖。

## 9. 课后题与答案

1. quote 是原文能证明结论吗？不能，可能断章取义。
2. 为什么提交前再核验？检索与审批之间来源可能修改或撤回。
3. 无相关资料的 recall 写多少？null，单独测拒答。
4. policy 冲突器能处理真实法律文档吗？不能，它只演示领域规则的可判定冲突。

<a id="ag-08b-s10"></a>
## 10. 三类练习与答案

**基础**：重复同一 citation。答案：第二次 key 在 seen 中，拒绝 citation_scope。

**进阶**：人工标注支持度。答案：标注整段结论、原文、位置与 supports/contradicts/unknown；
两人分歧单独复核，不能让生成模型给自己的回答自动满分。

**故障注入**：审批等待期间改文档。答案：hash 不同，提交拒绝 stale_source；
重新检索与生成新计划，再审批，不能悄悄更新摘要后沿用旧批准。

<a id="ag-08b-s11"></a>
## 11. 阶段验收

- [ ] 3 项测试通过，引用限定本轮候选与当前版本。
- [ ] quote 不存在、actor 错误、来源撤回均拒绝。
- [ ] 空证据和明确冲突分别拒答。
- [ ] recall 与事实支持度分开报告。

## 12. 常见问题

**是否应保存所有旧版本？** 只有明确保留需求才保存，并仍接受撤回策略。
本课程替换旧版本；审计记录 ID/hash，不保存被删除正文来“方便重放”。

## 13. 扩展阅读

[SQLite foreign keys](https://sqlite.org/foreignkeys.html)。
下一章把这些确定性约束放入工具授权与审批路径，不依赖提示词防护。

## 我现在能做到什么

我能区分来源、位置、版本和语义支持度，并阻止撤回资料在恢复时继续被使用。

## 单元导航

- 上一单元：[来源索引](./01-source-index-citations.md)
- 下一单元：[注入与能力隔离](../09-security/01-injection-capability-boundaries.md)
- 本卷入口：[README](../README.md)
