# 错误、堆栈与清理边界

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 让价格失败沿调用栈传播，并在不吞错的前提下完成清理 |
| 可观察产出 | `js-lab/error-flow.mjs`、`js-lab/price-boundary.mjs` |
| 运行条件 | Node.js 24 LTS；无第三方依赖 |
| 建议时间 | 120 分钟 |
| 完成证据 | 三类错误、任意抛出值、堆栈定位、finally 复验 |

## 1. 任务背景

非法价格若被捕获后返回 0，会从“输入失败”变成“免费商品”，错误信息永久丢失。
完全不处理错误又会让用户只看到进程终止。可靠边界需要在能恢复的层处理，
在不能恢复的层继续传播，同时让文件、定时器、按钮或控制器得到清理。

错误堆栈记录调用路径，是定位证据，不是应直接展示给最终用户的消息。
外部响应、身份信息、Cookie 和完整用户输入也不应无选择地写入日志。
所有成功金额仍必须是非负安全整数分；catch 不能凭空制造有效领域值。

## 2. 学习目标

完成本课后，你应能：

- 区分 `Error`、`TypeError` 与 `RangeError` 的用途；
- 使用 `throw` 终止当前正常路径；
- 解释异常沿调用栈向上传播的过程；
- 正确使用 `try`、`catch`、`finally`；
- 防御 JavaScript 可抛出任意值的事实；
- 从堆栈找到第一个相关的自己文件与行号；
- 完成清理而不以 `return` 覆盖原结果或错误；
- 使用 Node inspector 对解析函数断点和单步；
- 让错误提示保留失败原因，而不是把坏价格转换为 0。

## 3. 预备知识

先完成[作用域、闭包与生命周期](02-scope-closures-lifetime.md)，
理解调用、返回、局部绑定和资源释放。运行文件时保留完整终端错误：

```bash
node price-boundary.mjs
```

不要只截取最后一行堆栈；第一条错误和第一个指向自己文件的位置通常最有价值。

## 4. 核心理论

### 4.1 错误类型表达失败类别

- `Error`：通用操作失败；
- `TypeError`：值的运行时类型不符合接口；
- `RangeError`：类型可接受，但值超出允许范围。

错误类型帮助程序分类，`message` 说明当前失败。业务层还可定义专用错误，
但不能只换类名而不保留可恢复信息。

### 4.2 抛出与传播

`throw value` 立即停止当前正常路径。运行时沿调用栈向外寻找最近的 `catch`：

```text
parsePrice → prepareListing → submit → 顶层调用
```

若 `submit` 能把错误转换成用户可操作提示，可以在那里捕获；
中间层没有恢复策略时应继续传播，不必每层重复打印同一堆栈。
没有任何 catch 时，Node 打印未捕获错误并以失败状态结束。

### 4.3 `try`、`catch` 与 `finally`

`try` 包围可能失败的工作；`catch` 只处理自己理解的恢复边界；
`finally` 无论成功、失败或 return 都会执行，适合释放资源。

JavaScript 允许 `throw "failed"`，因此 catch 参数应先判断：

```js
if (!(error instanceof Error)) {
  throw new Error("non-Error thrown", { cause: error });
}
```

边界可以包装任意值并保留 cause；不能无条件读取 `error.message`。

### 4.4 finally 中不要 return

`finally` 中的 `return` 会覆盖 try 的返回值，也会压掉正在传播的错误：

```js
function wrong() {
  try {
    throw new Error("real failure");
  } finally {
    return "masked";
  }
}
```

调用者只得到 `"masked"`，真实失败消失。清理代码完成动作即可，不返回业务结果。

### 4.5 堆栈与调试器

堆栈通常从错误点向调用者列出函数、文件和行列。先找第一个指向自己源码的帧，
核对实际参数，再向上一层确认谁传入了它。不要因为依赖帧很多就从底部猜原因。

Node inspector 可在本机暂停第一行：

```bash
node --inspect-brk price-boundary.mjs
```

在 Chrome 打开 `chrome://inspect`，连接本机目标，在解析与 throw 行加断点，
观察 `input`、`text`、`whole`、`fraction` 和调用栈。结束后停止进程并恢复普通运行。
调试端口只绑定可信本机环境，不暴露到公共网络。

## 5. 语法、标准 API 与运行时边界清单

| 语法或 API | 作用 | 边界 |
| --- | --- | --- |
| `new Error(message)` | 通用失败 | message 不包含密钥或完整敏感数据 |
| `TypeError` | 类型不符合契约 | 不用于所有业务冲突 |
| `RangeError` | 值域不符合契约 | 保留具体原因 |
| `throw value` | 中断并传播 | 任意值都可被抛出 |
| `try...catch` | 在有恢复策略的边界处理 | 不写空 catch |
| `finally` | 成功或失败都清理 | 不 return，不覆盖错误 |
| `error instanceof Error` | 判断标准错误对象 | 跨 realm 有局限，当前 Node 实验适用 |
| `error.stack` | 调用堆栈证据 | 不直接显示给终端用户 |
| `Error(..., { cause })` | 包装并保留原始原因 | 记录时仍做敏感信息最小化 |
| `node --inspect-brk` | 启动调试会话 | 仅可信本机使用 |

## 6. 最小可运行案例

创建完整文件 `js-lab/error-flow.mjs`：

```js
function classify(mode) {
  if (mode === "type") throw new TypeError("expected text");
  if (mode === "range") throw new RangeError("amount is negative");
  if (mode === "legacy") throw "legacy failure";
  return "ok";
}

for (const mode of ["ok", "type", "range", "legacy"]) {
  try {
    console.log(`result=${classify(mode)}`);
  } catch (error) {
    if (error instanceof Error) {
      console.log(`caught=${error.name}:${error.message}`);
    } else {
      console.log(`caught-non-error=${String(error)}`);
    }
  } finally {
    console.log(`cleanup=${mode}`);
  }
}

function returnWithCleanup() {
  try {
    return "preserved-result";
  } finally {
    console.log("cleanup-without-return");
  }
}

console.log(returnWithCleanup());
```

运行 `node error-flow.mjs`，预期完整输出：

```text
result=ok
cleanup=ok
caught=TypeError:expected text
cleanup=type
caught=RangeError:amount is negative
cleanup=range
caught-non-error=legacy failure
cleanup=legacy
cleanup-without-return
preserved-result
```

最后两行证明 finally 的清理先执行，而原返回值仍被保留。

## 7. 邻里集市集成案例

创建完整文件 `js-lab/price-boundary.mjs`：

```js
function parseYuanToCents(input) {
  if (typeof input !== "string") {
    throw new TypeError("price input must be text");
  }
  const text = input.trim();
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(text)) {
    throw new RangeError("invalid yuan format");
  }
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError("price exceeds safe integer range");
  }
  return cents;
}

function applyDiscount(priceCents, discountCents) {
  if (!Number.isSafeInteger(discountCents) || discountCents < 0) {
    throw new RangeError("invalid discount cents");
  }
  if (discountCents > priceCents) {
    throw new RangeError("discount exceeds price");
  }
  return priceCents - discountCents;
}

function prepareListing(title, priceYuan, discountCents) {
  if (typeof title !== "string" || !title.trim()) {
    throw new TypeError("title must be non-empty text");
  }
  const priceCents = parseYuanToCents(priceYuan);
  const payableCents = applyDiscount(priceCents, discountCents);
  return {
    title: title.trim(),
    priceCents,
    payableCents,
    createdAt: "2026-10-11T10:00:00.000Z",
  };
}

const attempts = [
  ["台灯", "19.90", 90],
  ["书架", "19.90abc", 0],
  ["自行车", "25.00", 3000],
  ["赠品", "0", 0],
];

for (const [title, priceYuan, discountCents] of attempts) {
  try {
    const listing = prepareListing(title, priceYuan, discountCents);
    console.log(
      `prepared=${listing.title}, price=${listing.priceCents}, payable=${listing.payableCents}`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown failure";
    console.log(`rejected=${title}, reason=${message}`);
  } finally {
    console.log(`attempt-finished=${title}`);
  }
}
```

运行 `node price-boundary.mjs`，预期输出：

```text
prepared=台灯, price=1990, payable=1900
attempt-finished=台灯
rejected=书架, reason=invalid yuan format
attempt-finished=书架
rejected=自行车, reason=discount exceeds price
attempt-finished=自行车
prepared=赠品, price=0, payable=0
attempt-finished=赠品
```

失败没有产生 Listing，也没有把价格改成 0。合法免费商品则明确保留 0。
固定 `createdAt` 是 UTC 教学值；真实创建时间由服务端拥有并以 UTC 返回。
若输入来自 API JSON，应先校验外部记录，而不是直接调用假定 title、priceYuan 已有正确类型的函数。

## 8. 常见错误与排查路径

**明确错误示例：吞错并伪造免费。**

```js
try {
  return parseYuanToCents(input);
} catch {
  return 0;
}
```

尾随文字、负数和服务故障都会变成合法 0 分，下游无法恢复原始失败。

**明确错误示例：finally 覆盖失败。**

```js
try {
  throw new Error("save failed");
} finally {
  return "done";
}
```

调用者看到 done，错误被压制。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | `"19.90abc"` 最终显示为免费商品 |
| 证据 | catch 无条件返回 0，堆栈和原始错误不再向上传播 |
| 原因 | 恢复层没有恢复策略，却把失败伪造成有效领域值 |
| 修复 | 删除兜底 0；在提交边界分类错误并阻止构造 Listing |
| 复验 | 非法输入输出 rejected，合法 `"0"` 才输出 price=0 |

排查堆栈时记录实际输入类型和值的安全摘要，不打印 Cookie、认证头、完整个人数据或密钥。

## 9. 课后题

1. `throw` 后当前函数的后续正常语句是否执行？
2. catch 参数为什么不能无条件读取 `.message`？
3. finally 中 return 有什么风险？
4. 为什么 RangeError 不应自动转成 0？

**参考答案：**

1. 不执行；运行时开始寻找处理者。
2. JavaScript 可抛出任意值，字符串等没有标准 Error 属性。
3. 它会覆盖正常返回值或正在传播的异常。
4. 0 是合法业务金额，自动替换会丢失失败语义并产生错误商品。

## 10. 实践练习

### 基础

分别触发 `prepareListing` 的标题 TypeError、金额 RangeError 和合法 0 分，记录输出。

### 进阶

写 `withResource(work)`：先输出 opened，调用同步回调，finally 输出 closed；
成功时保留返回值，失败时保留原错误。

### 故障注入

在 finally 临时 `return "masked"`，证明失败被覆盖；保存证据后删除 return，
重新确认原错误可被上层捕获。

**答案标准：**

- 基础三条路径分类准确；
- 进阶成功顺序为 opened、work、closed、result，失败仍执行 closed 并抛原错；
- 故障注入明确比较修复前后调用者看到的值或错误。

## 11. 阶段验收

- [ ] `error-flow.mjs` 的 10 行输出与声明一致。
- [ ] 合法、尾随文字、超额折扣和 0 分四条路径均准确。
- [ ] catch 能处理任意抛出值，不假定都有 message。
- [ ] finally 完成清理且不覆盖返回值或错误。
- [ ] 能从堆栈找到自己的 throw 行和调用者。
- [ ] 能使用本机 inspector 观察参数并正常结束调试进程。
- [ ] 失败消息不泄露堆栈、Cookie 或敏感响应。

## 12. 常见问题

**每个函数都应该 catch 吗？**

不应该。只有知道怎样恢复、转换或增加必要上下文的层才捕获；否则继续传播。

**可以把完整 stack 展示给用户吗？**

不可以。用户提示应说明恢复动作；堆栈进入受控开发日志，并遵循数据最小化。

**finally 是否只在 catch 之后执行？**

不是。无论 try 成功、return、抛错，甚至 catch 再抛，finally 都会执行。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN：控制流与错误处理](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- [MDN：`try...catch`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch)
- [MDN：`Error`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error)
- [MDN：`finally`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch#the_finally_block)
- [Node.js：调试入门](https://nodejs.org/en/learn/getting-started/debugging)

## 我现在能做到什么

我能让类型和值域错误沿调用栈保留证据，在明确边界向用户说明失败，
并使用 finally 和生命周期操作完成清理，而不把非法价格伪造成 0。

## 单元导航

[上一篇：作用域、闭包与生命周期](02-scope-closures-lifetime.md) ·
[返回第 2 章入口](../02-functions-scope-errors.md) ·
[下一章：对象、数组与数据边界](../03-objects-arrays-data.md)
