# 函数契约、参数与返回值

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 把金额解析、格式化和折扣计算封装为有单位契约的函数 |
| 可观察产出 | `js-lab/function-contracts.mjs`、`js-lab/money-functions.mjs` |
| 运行条件 | Node.js 24 LTS；无第三方依赖 |
| 建议时间 | 120 分钟 |
| 完成证据 | 正常输出、8 类输入边界、纯计算不修改输入 |

## 1. 任务背景

商品列表、详情页和发布表单都可能计算价格。复制三份代码会让校验规则漂移；
把所有值藏在全局变量中，又会让调用者不知道函数依赖什么。函数通过参数声明输入，
通过返回值交付结果，通过抛错明确失败。日志只用于观察，不能代替返回值。

本课将外部“元文字”严格解析为非负安全整数分。空文本、负数、指数形式、
尾随文字、三位小数和超安全范围全部拒绝，合法 0 分必须保留。

## 2. 学习目标

完成本课后，你应能：

- 区分函数声明、函数调用、参数和实参；
- 区分 `return` 与 `console.log`；
- 使用默认参数而不把它当成非法输入修复器；
- 读写简单箭头函数和回调；
- 设计输入类型、单位、值域与输出类型明确的函数契约；
- 写出纯金额计算边界；
- 严格执行元文字到整数分的转换；
- 格式化整数分，而不使用浮点修复业务数据。

## 3. 预备知识

先完成第 1 章，能够使用 `const`、`let`、条件和循环，并能校验安全整数。
本课完整文件仍放在个人 `js-lab/` 中：

```bash
node function-contracts.mjs
```

## 4. 核心理论

### 4.1 声明、调用与调用帧

函数声明只建立能力，不会自动执行。调用时，实参先求值，再与参数建立本次调用的局部绑定：

```text
调用表达式 → 实参求值 → 建立参数与局部变量 → 执行函数体 → return 或正常结束
```

每次调用都有独立局部状态。`return` 把结果交回调用位置并立即结束本次调用；
没有显式 `return` 的函数返回 `undefined`。

### 4.2 日志不是函数结果

函数内部打印 1990，只代表终端看到了文字。调用者若要继续折扣计算，
必须拿到 number 返回值。纯计算函数不读取 DOM、网络或隐含全局变量，
对同样输入产生同样结果，也不修改外部状态，因此容易测试和复用。

### 4.3 默认参数与箭头函数

`quantity = 1` 只在实参缺省或为 `undefined` 时生效，`null`、0、空字符串不会自动变成 1。
箭头函数是函数值的一种写法；表达式函数体可隐式返回，花括号函数体必须写 `return`。
回调只是被另一个函数调用的函数，不天然异步。

### 4.4 严格元转分

用户输入来自表单时是 string。教学契约接受：

- `"0"` 或不带多余前导零的非负整数；
- 可选小数点和 1–2 位小数；
- 两端空白可以去除；
- 不接受 `.5`、`01`、负号、指数、逗号、尾随文字或三位小数。

先用完整匹配检查文本，再拆整数和小数部分，避免 `parseFloat("19.90abc")`
截断坏数据，也避免先做二进制浮点乘法。

## 5. 语法、标准 API 与运行时边界清单

| 语法或 API | 作用 | 边界 |
| --- | --- | --- |
| `function name(parameters) {}` | 声明普通函数 | 声明后仍需调用 |
| `name(arguments)` | 调用函数 | 实参与参数按位置对应 |
| `return value` | 结束调用并返回值 | 日志不会自动成为返回值 |
| `parameter = default` | 缺省参数 | 不修复 `null` 或其他坏值 |
| `(value) => result` | 箭头函数 | 花括号体需显式 return |
| `callback(value)` | 调用传入函数 | 回调不天然异步 |
| `RegExp.prototype.test` | 检查完整输入格式 | 使用 `^`、`$` 锚定全串 |
| `String.prototype.trim` | 去两端空白 | 不改变中间内容 |
| `split` / `padEnd` / `padStart` | 拆分和补齐金额文字 | 最终仍检查安全整数 |
| `Number.isSafeInteger` | 检查金额结果 | 拒绝 NaN、小数和溢出 |

## 6. 最小可运行案例

创建完整文件 `js-lab/function-contracts.mjs`：

```js
function subtotal(priceCents, quantity = 1) {
  if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
    throw new RangeError("priceCents must be a non-negative safe integer");
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new RangeError("quantity must be a positive safe integer");
  }
  const result = priceCents * quantity;
  if (!Number.isSafeInteger(result)) {
    throw new RangeError("subtotal exceeds safe integer range");
  }
  return result;
}

const describe = (cents) => `cents=${cents}`;

function calculateAndDescribe(calculate, priceCents, quantity) {
  return describe(calculate(priceCents, quantity));
}

console.log(describe(subtotal(1990)));
console.log(describe(subtotal(1990, 2)));
console.log(calculateAndDescribe(subtotal, 500, 3));
console.log(subtotal(0, 2));
```

运行 `node function-contracts.mjs`，预期输出：

```text
cents=1990
cents=3980
cents=1500
0
```

`subtotal` 的契约是“整数分 × 正整数件数 → 安全整数分”。`describe` 只负责展示，
`calculateAndDescribe` 的 `calculate` 参数是同步回调；三者职责没有混在一起。

## 7. 邻里集市集成案例

创建完整文件 `js-lab/money-functions.mjs`：

```js
function parseYuanToCents(input) {
  if (typeof input !== "string") {
    throw new TypeError("yuan input must be text");
  }
  const text = input.trim();
  if (!/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(text)) {
    throw new RangeError("use non-negative yuan with up to 2 decimals");
  }
  const [whole, fraction = ""] = text.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError("price exceeds safe integer range");
  }
  return cents;
}

function formatCents(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("cents must be a non-negative safe integer");
  }
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}

function applyDiscount(priceCents, discountCents = 0) {
  for (const value of [priceCents, discountCents]) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError("amount must be a non-negative safe integer");
    }
  }
  if (discountCents > priceCents) {
    throw new RangeError("discount exceeds price");
  }
  return priceCents - discountCents;
}

for (const input of ["19.90", "0", "2.5", " 12.03 "]) {
  const cents = parseYuanToCents(input);
  console.log(`${input.trim()} -> ${cents} -> ${formatCents(cents)}`);
}

const payableCents = applyDiscount(parseYuanToCents("25.00"), 300);
console.log(`payable=${payableCents}, display=${formatCents(payableCents)}`);

for (const input of ["", "-1", "1e2", "19.90abc", "1.234", "01"]) {
  try {
    parseYuanToCents(input);
  } catch (error) {
    console.log(`rejected=${JSON.stringify(input)}`);
  }
}

try {
  parseYuanToCents("90071992547409.92");
} catch (error) {
  console.log("rejected=unsafe-integer");
}
```

运行 `node money-functions.mjs`，预期完整输出：

```text
19.90 -> 1990 -> 19.90
0 -> 0 -> 0.00
2.5 -> 250 -> 2.50
12.03 -> 1203 -> 12.03
payable=2200, display=22.00
rejected=""
rejected="-1"
rejected="1e2"
rejected="19.90abc"
rejected="1.234"
rejected="01"
rejected=unsafe-integer
```

解析器是外部表单文字进入整数分领域值的边界。它不接收 number 来猜测单位。
API JSON 中的 `priceCents` 应直接验证为整数分，不能再次调用元转分函数。
Listing 的 `createdAt` 仍由独立 UTC 解析器处理，金额函数不顺便修改时间。

## 8. 常见错误与排查路径

**明确错误示例：日志代替返回值。**

```js
function subtotal(priceCents, quantity) {
  console.log(priceCents * quantity);
}
const result = subtotal(100, 2);
console.log(result);
```

它输出 `200` 和 `undefined`。第一行是副作用，调用者没有拿到可继续计算的结果。

**明确错误示例：截断坏输入。**

```js
return Math.round(parseFloat(input) * 100);
```

`"19.90abc"` 会被接受为 1990，输入中的尾随错误证据已经丢失。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 非法输入 `"19.90abc"` 被当成 1990 分 |
| 证据 | `parseFloat` 的结果为 19.9，原始字符串尾部未参与校验 |
| 原因 | 使用宽松截断转换代替完整格式契约 |
| 修复 | 先用锚定正则检查全文，再按字符串拆分为整数分 |
| 复验 | 合法四例通过；空、负数、指数、尾随文字、三位小数和超范围全部拒绝 |

不要通过删除非法用例、改用 `Math.abs` 或失败后返回 0 来制造“可运行”。

## 9. 课后题

1. 参数与实参有什么区别？
2. 不写 `return` 的函数返回什么？
3. 默认参数能否把 `null` 数量自动改为 1？
4. 为什么 API 的 `priceCents: 1990` 不应传给 `parseYuanToCents`？

**参考答案：**

1. 参数是声明中的局部名称，实参是调用时提供并先求值的值。
2. `undefined`。
3. 不能；默认值只处理缺省或 `undefined`，`null` 应按契约拒绝。
4. API 字段已经以分为单位，再解析为元会混淆单位；应直接校验非负安全整数。

## 10. 实践练习

### 基础

调用 `applyDiscount(1990, 90)` 和 `applyDiscount(0, 0)`，预测返回值。

### 进阶

新增 `calculateLineTotal(priceCents, quantity)`，要求每个参数及乘积都检查安全整数，
不得读取全局价格。

### 故障注入

临时把解析器换成 `parseFloat` 版本，运行尾随文字和指数用例，保留失败证据后恢复严格实现。

**答案标准：**

- 基础返回 1900 和 0；
- 进阶对 500 分 × 3 返回 1500，对 0 数量、负数和溢出抛出明确错误；
- 故障注入说明原始信息在哪一步丢失，修复后全部非法输入恢复拒绝。

## 11. 阶段验收

- [ ] 四个合法元文字得到准确整数分与两位显示。
- [ ] 空、负数、指数、尾随文字、三位小数、多余前导零和超范围均拒绝。
- [ ] 0 分合法，优惠不能超过价格。
- [ ] 能指出每个函数输入、输出的类型、单位和值域。
- [ ] 计算函数使用返回值，不依赖日志或隐含全局变量。
- [ ] API 整数分、表单元文字与 UTC 时间由不同边界处理。

## 12. 常见问题

**正则是否是唯一严格解析方式？**

不是。可以逐字符解析或使用可靠的领域库；关键是完整输入、单位和值域契约不能丢。

**为什么不直接返回错误字符串？**

那会让成功 number 与失败 string 混在一个位置。当前用异常表示失败；
后续 TypeScript 也会介绍判别联合结果。

**纯函数是否完全不能抛错？**

可以。对相同非法输入稳定抛出同类错误，仍不依赖或修改外部状态。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN：函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [MDN：默认参数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Default_parameters)
- [MDN：箭头函数](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [MDN：`return`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/return)
- [MDN：正则表达式](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions)

## 我现在能做到什么

我能用参数和返回值建立有单位的函数契约，把表单元文字严格转成整数分，
并让合法值、非法值和日志观察各自处于清楚的边界。

## 单元导航

[上一章：值、运算与控制流程](../01-values-control-flow.md) ·
[返回第 2 章入口](../02-functions-scope-errors.md) ·
[下一篇：作用域、闭包与生命周期](02-scope-closures-lifetime.md)
