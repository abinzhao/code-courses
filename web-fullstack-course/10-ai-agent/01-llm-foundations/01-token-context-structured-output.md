# Token、上下文与结构化输出：把回答当作不可信输入

## 任务卡

- **任务**：将本地模型返回的字符串解析为有来源、可拒答的答案。
- **产出**：`labs/ag01a/answer.ts`、`labs/ag01a/answer.test.ts`。
- **运行**：先按[本卷环境](../README.md#环境与独立运行)安装，再执行 §7 命令。
- **完成证据**：2 项测试通过；错误字段、无来源回答均被拒绝。
- **边界**：fixture 只验证 parser，不证明模型事实正确、token 数或物理断网。
- **唯一 ID**：`AG-01A`。

## 1. 任务背景

“请返回 JSON”不等于返回值可直接进入数据库。模型可能输出 Markdown 围栏、额外键、
不存在的文档 ID，甚至把不确定的内容写成肯定句。私有资料 Agent 需要先决定答案契约，
再选择模型；不能为了适配小模型，把契约逐渐放宽到任意字符串。

本实验只接收两种状态：有证据的 `answered` 与没有证据的 `abstained`。拒答是合法结果，
不是 parser 错误。解析失败则是协议失败，不能转为“模型拒答”隐藏掉。

## 2. 学习目标

1. 区分 token、字符、字节和上下文窗口。
2. 从 `unknown` 做运行时验证，而非 TypeScript 强制断言。
3. 建立带引用的答案 schema，并表达不确定性。
4. 分离语法正确、来源有效和事实正确三种验收。

## 3. 预备知识

需要 TypeScript strict、JSON、Zod 和 Node 测试。还不需要 LangGraph。
可参考现存[确定性异步测试](../../04-javascript-typescript/09-testing-debugging-algorithms/02-deterministic-async-testing-debugging.md)的“控制边界而非猜时间”方法。
本篇每项测试只调用纯函数，不启动网络、不读取私人文件。

<a id="ag-01a-s4"></a>
## 4. 核心理论

### 4.1 Token 是模型词表的单位

UTF-8 字节长度能限制 HTTP 体积，字符长度能限制 UI 输入，但都不能精确计算模型 token。
中文、标点、代码和不同 tokenizer 的切分不同。不要把 `text.length / 4` 当安全预算。
本地 runtime 的 `prompt_eval_count` 是运行证据；入站字节上限只是保守资源门禁。

上下文预算应分成系统规则、用户问题、证据片段、历史和输出预留。历史无限追加会挤走
来源与规则。截断要在文档片段边界执行，保留来源 ID；不按任意字节切断 JSON。

### 4.2 结构化输出解决形状，不解决真相

JSON Schema 或 constrained decoding 能减少格式错误，不能证明 `doc:7` 存在，更不能证明
引用支持结论。依次执行：JSON 语法解析、schema、业务不变量、来源核验、质量评分。
任何一步失败都应有独立原因码，以便第 10 章评测定位失败层。

### 4.3 类型只约束程序，parser 才约束输入

`JSON.parse(raw) as Answer` 在运行时没有检查。本例显式将结果赋给 `unknown`，使用严格对象
拒绝多余键。可辨识联合让拒答不允许携带虚假 citations；成功分支至少带一个证据 ID。
限制长度防止单个“合法 JSON”占满后续日志或 checkpoint。

## 5. API 与配置清单

| 项目 | 用途 | 限制 |
| --- | --- | --- |
| `z.strictObject` | 拒绝未定义字段 | 不代表字段内容可信 |
| `z.discriminatedUnion` | 答案状态分支 | 必须用业务字段分支 |
| `Buffer.byteLength` | 入站资源上限 | 不是 token 计数 |
| `JSON.parse` | JSON 语法 | 结果仍是 `unknown` |
| `refine` / 后置校验 | 来源集合约束 | 不代替语义支持度判定 |

<a id="ag-01a-s6"></a>
## 6. 最小可运行案例

完整文件 `labs/ag01a/answer.ts`：

<!-- file: labs/ag01a/answer.ts -->
```ts
import { z } from "zod";

export const AnswerSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("answered"),
    text: z.string().min(1).max(2000),
    citations: z.array(z.string().regex(/^doc:[a-z0-9-]+$/)).min(1).max(8),
  }),
  z.strictObject({
    status: z.literal("abstained"),
    reason: z.enum(["no_evidence", "conflicting_evidence"]),
  }),
]);
export type Answer = z.infer<typeof AnswerSchema>;

export function parseAnswer(raw: string, allowedSources: ReadonlySet<string>): Answer {
  if (Buffer.byteLength(raw, "utf8") > 16_384) throw new Error("response_too_large");
  const input: unknown = JSON.parse(raw);
  const answer = AnswerSchema.parse(input);
  if (answer.status === "answered") {
    if (new Set(answer.citations).size !== answer.citations.length) {
      throw new Error("duplicate_citation");
    }
    if (answer.citations.some((id) => !allowedSources.has(id))) {
      throw new Error("unknown_citation");
    }
  }
  return answer;
}
```

`allowedSources` 来自检索结果，不来自模型自己列出的 ID。这里只核验成员资格，
不检查结论是否被片段支持；后续来源单元会增加片段范围与冲突判断。

<a id="ag-01a-s7"></a>
## 7. 私有资料 Agent 集成案例

完整文件 `labs/ag01a/answer.test.ts`：

<!-- file: labs/ag01a/answer.test.ts -->
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAnswer } from "./answer.js";

test("answer and abstention are distinct valid states", () => {
  const ids = new Set(["doc:guide"]);
  assert.equal(parseAnswer(
    '{"status":"answered","text":"Keep backups.","citations":["doc:guide"]}', ids,
  ).status, "answered");
  assert.deepEqual(parseAnswer(
    '{"status":"abstained","reason":"no_evidence"}', ids,
  ), { status: "abstained", reason: "no_evidence" });
});

test("protocol and provenance failures cannot enter state", () => {
  const ids = new Set(["doc:guide"]);
  for (const raw of [
    '```json\n{}\n```',
    '{"status":"answered","text":"A","citations":[]}',
    '{"status":"answered","text":"A","citations":["doc:secret"]}',
    '{"status":"answered","text":"A","citations":["doc:guide"],"tool":"shell"}',
  ]) assert.throws(() => parseAnswer(raw, ids));
  assert.throws(() => parseAnswer(" ".repeat(16_385), ids), /response_too_large/);
});
```

从验证项目根目录运行：

```bash
npx tsc --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck --outDir dist/ag01a labs/ag01a/*.ts
node --test dist/ag01a/answer.test.js
```

预期 tests 2、pass 2、fail 0。测试结束即停止，无常驻进程。编译失败时先检查 README
固定版本与 `package.json` 的 `type: module`，不要删除 strict。

<a id="ag-01a-s8"></a>
## 8. 错误实验与排查

把 `z.strictObject` 临时改为 `z.object`，多余 `tool` 字段会被剥离后接受，第二项测试红灯。
记录原始字段名、失败层、预期拒绝原因，不记录真实模型回答内容。恢复严格对象后复验。

若 JSON 围栏引起失败，应在 provider 契约中解决格式，而非对所有回答执行贪婪正则提取。
“解析到了最后一个大括号”可能丢弃攻击前缀，造成错误证据。

## 9. 课后题与答案

1. 成功解析 JSON 能证明什么？答案：仅证明语法有效，后续形状与业务仍需检查。
2. 为什么拒答不用异常？答案：缺证据是业务结果，坏协议才是异常。
3. 为何不让模型生成 `allowedSources`？答案：那会让引用校验变成自我声明。
4. `max(2000)` 是否等于 2000 token？答案：不是；它约束字符串长度。

<a id="ag-01a-s10"></a>
## 10. 三类练习与参考答案

**基础**：加入重复引用测试。答案：输入两次 `doc:guide`，断言 `duplicate_citation`。
这避免同一证据重复撑高来源数量。

**进阶**：给答案增加 `uncertainty: "low" | "high"`。答案：只在 answered 分支定义枚举，
分别测试缺失、非法值和合法值；这个值仍是模型自报，不能直接作置信概率。

**故障注入**：在集成前跳过来源集合检查。答案：`doc:secret` 测试必须失败，
恢复检查后才能通过。不能把该 ID 加入测试集合来迁就实现。

<a id="ag-01a-s11"></a>
## 11. 阶段验收

- [ ] strict 编译与 2 项测试通过。
- [ ] JSON、schema、来源三层失败可区分。
- [ ] 围栏、额外字段、空来源和未知来源被拒绝。
- [ ] 完成一次 strictObject 错误实验并记录红绿结果。
- [ ] 没有把 fixture 结果报告为模型事实正确率。

## 12. 常见问题

**能自动修复坏 JSON 吗？** 可以设计一次受预算限制的格式修复调用，但必须再次解析，
并把修复次数计入 trace。本篇不加入模型调用。

**拒绝未知字段太严格吗？** 公共版本迁移可以显式定义新版本 schema；静默接收新字段
会掩盖契约漂移，尤其是潜在工具意图。

## 13. 扩展阅读

核对日期：2026-10-12。[Ollama Chat API](https://docs.ollama.com/api/chat)支持 `format`；
[Zod](https://zod.dev/api)解释严格对象与联合。运行包版本以本卷 README 为准。
理论可外推，当前测试不覆盖任何真实 tokenizer 或模型。

## 我现在能做到什么

我能把答案作为不可信输入，分离拒答、协议错误和来源错误，并用测试守住契约。

## 单元导航

- 上一单元：[本卷入口](../README.md)
- 下一单元：[受限推理与不确定性](./02-bounded-reasoning-uncertainty.md)
