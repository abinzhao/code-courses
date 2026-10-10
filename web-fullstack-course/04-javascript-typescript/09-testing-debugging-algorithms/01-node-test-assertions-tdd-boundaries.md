# Node 测试、断言与 TDD 边界：先证明测试会失败

## 任务卡

- **任务**：用 Node 内置测试运行器固定金额解析和合计规则。
- **产出**：`js-lab/testing/money.mjs` 与 `js-lab/testing/money.test.mjs` 两个完整文件。
- **运行**：Node.js 24 LTS，无第三方依赖。
- **完成证据**：一次预期红灯、修复后的 tests 3 / pass 3 / fail 0，以及输入未修改证据。
- **边界**：行覆盖率和绿色测试不能证明遗漏的业务规则、浏览器 UI 或真实 API 正确。

## 1. 任务背景

金额函数“能运行”不代表正确。`parseFloat("19.90abc")` 会返回 19.9，页面甚至可能显示
正常价格，却已接受不符合契约的输入。测试把规则写成可重复执行的断言，并在回归时给出
实际值、预期值和堆栈。

TDD 的第一步不是先写一堆测试文件，而是针对下一条行为写最小失败用例，确认失败原因
确实是功能缺失，再做最小实现并整理结构。没有看见红灯，就无法证明测试能发现目标错误。

## 2. 学习目标

完成后你能：

1. 使用 `node:test` 与 `node:assert/strict`；
2. 选择标量、结构、同步异常和异步拒绝断言；
3. 用表驱动方式覆盖金额边界；
4. 检查函数没有修改输入；
5. 区分行为测试、实现监视和覆盖率。

## 3. 预备知识

先会 ESM 导入导出、严格元转分和安全整数检查。在个人练习目录创建
`js-lab/testing/`。运行前记录：

```bash
node --version
```

目标为 `v24.` 开头。Node 输出格式中的耗时和顺序可能随补丁版本变化，验收关注测试数量
与通过/失败计数，不逐字锁定 TAP 的所有元数据。

## 4. 核心理论

### 4.1 断言选择应匹配行为

- `assert.equal` 比较标量；
- `assert.deepEqual` 比较数组和普通对象结构；
- `assert.throws` 验证同步函数抛出；
- `await assert.rejects` 验证 Promise 拒绝；
- `assert.ok` 只检查真假，不能精确验证 0 分或具体总额。

### 4.2 测试标题描述规则

“拒绝尾随文字”比“调用了正则”稳定。实现可以从正则换成同等严格的解析器，
只要输入输出契约不变，行为测试就不应失败。只监视内部函数是否调用，可能在结果错误时
仍然变绿。

### 4.3 表驱动减少重复但不隐藏语义

一组非法输入共享“必须抛 RangeError”规则，可以循环断言。类型错误单独断言
`TypeError`，金额过大单独保留，便于失败时理解边界。

### 4.4 覆盖率只是线索

执行过一行不代表断言检查了结果。100% 行覆盖也可能没有验证 0、`NaN`、溢出、输入不变
和错误类别。覆盖率帮助发现未执行区域，不能替代需求与边界分析。

## 5. 元素、属性、API 或配置清单

| API | 用途 | 常见误用 |
| --- | --- | --- |
| `test(name, fn)` | 注册独立测试 | 测试之间共享可变状态 |
| `assert.equal` | 标量严格相等 | 用真假断言替代具体金额 |
| `assert.deepEqual` | 深度结构相等 | 把类实例语义简化为普通结构 |
| `assert.throws` | 同步抛错 | 用它包 Promise |
| `assert.rejects` | 异步拒绝 | 忘记 `await` |
| `structuredClone` | 保存可比较输入快照 | 误以为所有值都可克隆 |
| `node --test` | 发现并执行测试 | 将绿色扩张成全系统正确 |

## 6. 最小可运行案例

完整文件 `js-lab/testing/money.mjs`：

```js
export function parseYuanToCents(input) {
  if (typeof input !== "string") throw new TypeError("expected text");
  const text = input.trim();
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(text)) {
    throw new RangeError("invalid yuan");
  }
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new RangeError("amount too large");
  return cents;
}

export function totalCents(items) {
  let total = 0;
  for (const item of items) {
    if (!Number.isSafeInteger(item.priceCents) || item.priceCents < 0) {
      throw new RangeError("invalid cents");
    }
    total += item.priceCents;
    if (!Number.isSafeInteger(total)) throw new RangeError("total too large");
  }
  return total;
}
```

实现先检查完整文本，再拆分整数和小数，避免浮点乘法与截断解析。合计逐项检查，
也在每次累加后检查溢出。

## 7. 邻里集市集成案例

完整文件 `js-lab/testing/money.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseYuanToCents, totalCents } from "./money.mjs";

test("parses complete yuan text without floating multiplication", () => {
  assert.equal(parseYuanToCents("19.90"), 1990);
  assert.equal(parseYuanToCents("0"), 0);
  assert.equal(parseYuanToCents("2.5"), 250);
  assert.equal(parseYuanToCents(" 12.03 "), 1203);
});

test("rejects malformed, wrongly typed, or excessive input", () => {
  for (const text of ["", "-1", "1.234", "19.90abc", "1e2", "01"]) {
    assert.throws(() => parseYuanToCents(text), RangeError);
  }
  assert.throws(() => parseYuanToCents(1990), TypeError);
  assert.throws(
    () => parseYuanToCents("9007199254740992"),
    RangeError,
  );
});

test("totals cents, handles empty input, and preserves records", () => {
  const items = [{ priceCents: 1990 }, { priceCents: 10 }];
  const before = structuredClone(items);
  assert.equal(totalCents(items), 2000);
  assert.deepEqual(items, before);
  assert.equal(totalCents([]), 0);
  assert.throws(() => totalCents([{ priceCents: -1 }]), RangeError);
  assert.throws(() => totalCents([{ priceCents: Number.NaN }]), RangeError);
  assert.throws(
    () => totalCents([
      { priceCents: Number.MAX_SAFE_INTEGER },
      { priceCents: 1 },
    ]),
    RangeError,
  );
});
```

从 `js-lab` 运行：

```bash
node --test testing/money.test.mjs
```

验收摘要应包含：

```text
tests 3
pass 3
fail 0
```

这三项覆盖正常解析、非法边界、合计与不变性，不声称测试了页面表单或后端。

## 8. 常见错误与排查路径

**明确错误实验：先制造红灯。**

临时把解析核心改为：

```js
return Math.round(parseFloat(input) * 100);
```

运行测试后，`"19.90abc"`、空字符串或错误类型相关断言会失败；具体错误取决于临时实现。

| 项目 | 记录 |
| --- | --- |
| 现象 | “拒绝非法输入”测试失败，实际没有抛异常 |
| 证据 | 失败位置指向 `"19.90abc"`；错误实现返回 1990 |
| 原因 | `parseFloat` 允许合法数字前缀并丢弃尾随文字 |
| 修复 | 恢复整串正则检查与字符串分段换算 |
| 复验 | tests 3、pass 3、fail 0；合法四项输出保持不变 |

不能通过删除非法输入、放宽 `assert.throws` 或把实现错误值写进预期来制造绿色。

异步函数需要：

```js
await assert.rejects(
  async () => {
    throw new Error("failed");
  },
  /failed/,
);
```

不要把 Promise 传给 `assert.throws`，后者只观察同步调用栈。

## 9. 课后题

1. 为什么 `assert.ok(parseYuanToCents("0"))` 是坏断言？
2. 三项测试都通过是否证明 API 金额字段可信？
3. 为什么测试前要保存输入快照？
4. 行覆盖率 100% 为什么仍可能漏掉溢出？

答案：

1. 0 分是合法结果但为假值，而且断言没有检查精确单位。
2. 不能；这里只测试两个纯函数，API JSON 仍需运行时解析。
3. 可证明合计函数没有偷改调用方记录。
4. 同一行可由小金额执行，但未必用断言触发过超安全整数。

## 10. 实践练习

**基础**：增加 `"0.01" → 1` 与 `"100" → 10000`。

参考答案：

```js
assert.equal(parseYuanToCents("0.01"), 1);
assert.equal(parseYuanToCents("100"), 10000);
```

**进阶**：为异步包装器写拒绝测试：

```js
async function parseLater(input) {
  return parseYuanToCents(input);
}

await assert.rejects(() => parseLater("bad"), RangeError);
```

参考标准：该断言放在 `async` 测试回调内，并被 `await`。

**故障注入**：删除合计后的安全整数检查。最大安全整数加 1 的断言必须先失败；
恢复检查后全套三项测试通过。

## 11. 阶段验收

- [ ] 两个完整文件通过 `node --check`。
- [ ] 最终测试恰好 3 项，全部通过。
- [ ] 已保存一次 `parseFloat` 错误实现的失败摘要。
- [ ] 免费商品、空集合、错误类型、`NaN` 和溢出都有断言。
- [ ] 输入记录在合计前后深度相等。
- [ ] 同步抛错与异步拒绝的断言方式分开。
- [ ] 测试标题描述行为，不监视内部解析方法。
- [ ] 没有通过删测试、放宽断言或吞异常获得绿色。

## 12. 常见问题

**需要给每个输入写一个 `test()` 吗？**

不必。共享同一规则的表驱动输入可放一项测试，但失败信息仍应可定位。

**测试是否应访问私有函数？**

优先测试公开行为。复杂纯逻辑可以提取成公开的窄模块，不必通过脆弱手段穿透实现。

**为什么不用第三方测试框架？**

本卷聚焦语言和内置能力；工程卷再比较 Vitest、覆盖率和浏览器 E2E。

**错误消息要逐字断言吗？**

当消息属于用户或 API 契约时可以；只需错误类别时，避免锁死无关措辞。

## 13. 扩展阅读

资料快照：2026-10-11。

- [Node.js 24：Test runner](https://nodejs.org/docs/latest-v24.x/api/test.html)
- [Node.js 24：Strict assertion mode](https://nodejs.org/docs/latest-v24.x/api/assert.html#strict-assertion-mode)
- [Node.js：Discovering tests](https://nodejs.org/en/learn/test-runner/discovering-running-tests)
- [MDN：structuredClone](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)
- [MDN：Number.isSafeInteger](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger)

兼容边界：Node 22 可能运行这些 API，但课程验收目标是 Node 24。浏览器 UI、真实 HTTP、
覆盖率阈值和跨平台 CI 未在本单元执行。

## 我现在能做到什么

我能先建立会失败的金额规则，再用严格断言固定正常、异常和不变性行为，并准确说明
三项绿色测试覆盖了什么、没有覆盖什么。

## 单元导航

- 上一单元：[章入口](../09-testing-debugging-algorithms.md)
- 下一单元：[确定性异步测试与系统调试](./02-deterministic-async-testing-debugging.md)
