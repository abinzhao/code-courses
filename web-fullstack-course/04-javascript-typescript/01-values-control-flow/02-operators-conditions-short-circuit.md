# 运算符、条件分支与短路求值

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 从运算结果建立可解释的商品展示与折扣决策 |
| 可观察产出 | `js-lab/operators.mjs`、`js-lab/discount-decision.mjs` |
| 运行条件 | Node.js 24 LTS；无第三方依赖 |
| 建议时间 | 90–120 分钟 |
| 完成证据 | 精确输出、非法折扣失败证据、零价商品判断 |

## 1. 任务背景

JavaScript 语法正确不等于业务正确。`100 - 200` 能正常得到 `-100`，
但邻里集市不允许优惠超过价格。`if (priceCents)` 也能运行，却会把合法的 0 分商品
误判为“没有价格”。本课从运算符的求值顺序出发，把每条业务规则写成明确布尔条件。

所有金额仍是非负安全整数分。源码固定值属于教学数据；来自表单或 API 的值必须先通过外部边界校验。

## 2. 学习目标

完成本课后，你应能：

- 按优先级解释算术、比较和逻辑表达式；
- 使用 `===`、`!==`，避免依赖宽松相等的隐式转换；
- 区分 truthy/falsy 与业务有效性；
- 使用 `if`/`else if`/`else` 和简单三元表达式；
- 区分 `&&`、`||`、`??` 的返回值与短路行为；
- 保留合法的 0 分和空字符串业务语义；
- 拒绝负数、非安全整数和超过价格的折扣；
- 识别“语法有效、业务无效”的程序。

## 3. 预备知识

先完成[值、变量、类型与显式转换](01-values-variables-types-conversion.md)，
能够运行 `.mjs` 文件，并解释 string、number、boolean、`null`、`undefined` 和安全整数。

运行前先在纸上写输出，再执行：

```bash
node operators.mjs
```

输出不同先检查保存状态、文件路径和实际值，不要直接修改预期结果。

## 4. 核心理论

### 4.1 算术与优先级

`*`、`/`、`%` 先于 `+`、`-`。比较再产生 boolean，逻辑运算符依据该结果选路径。
不确定时加括号，让代码表达业务分组，而不是依赖读者背优先级。

```text
原始值 → 算术表达式 → 比较表达式 → 逻辑组合 → 分支语句
```

`+` 遇到 string 可能拼接：`"19" + 1` 得到 `"191"`。金额计算前必须已经是经过校验的 number。

### 4.2 严格相等与比较

`===` 不做类型强制转换，`"1990" === 1990` 为 `false`。`==` 会按复杂规则转换，
本课程业务判断不使用它。`<`、`<=`、`>`、`>=` 产生 boolean，
但若操作数类型未经约束，字符串可能按字符顺序比较，因此边界校验必须先发生。

`NaN` 与任何值都不相等；金额规则直接使用 `Number.isSafeInteger`，同时排除 `NaN`、小数和无穷值。

### 4.3 truthy/falsy 不是业务规则

以下值在条件位置会转成 false：

```text
false、0、-0、0n、""、null、undefined、NaN
```

其他大多数值为 truthy，包括字符串 `"0"` 和空数组。业务上 0 分可以合法，空字符串标题却不合法；
因此真假转换不能代替金额、标题或状态校验。

### 4.4 三种短路运算

- `left && right`：左侧 falsy 时直接返回左侧，否则求值并返回右侧；
- `left || right`：左侧 truthy 时直接返回左侧，否则求值并返回右侧；
- `left ?? right`：左侧仅在 `null` 或 `undefined` 时才求值并返回右侧。

它们返回操作数，不保证返回 boolean。`0 || 20` 得到 20，`0 ?? 20` 得到 0。
`??` 适合“缺失才使用默认值”，不适合跳过空字符串等无效业务值。
短路右侧可能根本不执行，所以不要把必要校验或持久化写成隐蔽副作用。

### 4.5 条件与三元表达式

`if` 适合多步校验和不同失败原因。三元表达式 `condition ? a : b`
适合从两个简单值中选择。多层嵌套三元会掩盖决策路径，应改用分支。

## 5. 语法、标准 API 与运行时边界清单

| 语法或 API | 作用 | 业务边界 |
| --- | --- | --- |
| `+ - * / %` | 算术或字符串拼接 | 金额操作数必须先是安全整数分 |
| `=== !==` | 严格相等或不等 | 不自动转换单位或类型 |
| `< <= > >=` | 顺序比较 | 操作数类型与单位必须一致 |
| `!value` | 真假取反 | 不等价于完整校验 |
| `&&` | 左侧 falsy 时短路 | 返回操作数 |
| `||` | 左侧 truthy 时短路 | 会把合法 0 当作缺省 |
| `??` | 仅空值时使用后项 | 不拒绝空字符串 |
| `if / else` | 选择执行路径 | 失败原因应可观察 |
| `condition ? a : b` | 简单二选一 | 不承载复杂校验 |
| `` `${value}` `` | 生成模板字符串 | 只格式化，不验证输入 |
| `Number.isSafeInteger` | 安全整数检查 | 金额与折扣共同使用 |

## 6. 最小可运行案例

创建完整文件 `js-lab/operators.mjs`：

```js
console.log(100 + 20 * 2);
console.log((100 + 20) * 2);
console.log(7 % 3);
console.log("19" + 1);
console.log(Number("19") + 1);
console.log("19" === 19);

const configuredPageSize = 0;
console.log(configuredPageSize || 20);
console.log(configuredPageSize ?? 20);

let rightSideRuns = 0;
const andResult = false && (rightSideRuns += 1);
const orResult = "ready" || (rightSideRuns += 1);
console.log(andResult);
console.log(orResult);
console.log(rightSideRuns);
```

运行 `node operators.mjs`，预期完整输出：

```text
140
240
1
191
20
false
20
0
false
ready
0
```

最后三行证明右侧没有执行。实际业务中不要依赖 `+= 1` 这种短路副作用；
它只用于观察求值机制。

## 7. 邻里集市集成案例

创建完整文件 `js-lab/discount-decision.mjs`：

```js
const title = "儿童自行车";
const priceCents = 2500;
const discountCents = 300;
const status = "available";
const createdAt = "2026-10-11T09:00:00.000Z";

let decision;
let payableCents;

if (!Number.isSafeInteger(priceCents) || priceCents < 0) {
  decision = "invalid-price";
} else if (!Number.isSafeInteger(discountCents) || discountCents < 0) {
  decision = "invalid-discount";
} else if (discountCents > priceCents) {
  decision = "discount-exceeds-price";
} else if (status !== "available") {
  decision = "not-available";
} else {
  payableCents = priceCents - discountCents;
  decision = payableCents === 0 ? "free" : "payable";
}

console.log(`title=${title}`);
console.log(`decision=${decision}`);
console.log(`payableCents=${payableCents ?? "not-calculated"}`);
console.log(`createdAt=${createdAt}`);

const freePriceCents = 0;
const freePriceIsValid =
  Number.isSafeInteger(freePriceCents) && freePriceCents >= 0;
console.log(`zero-price-valid=${freePriceIsValid}`);
```

运行 `node discount-decision.mjs`，预期输出：

```text
title=儿童自行车
decision=payable
payableCents=2200
createdAt=2026-10-11T09:00:00.000Z
zero-price-valid=true
```

把 `discountCents` 改为 `3000` 后，决策必须是 `discount-exceeds-price`，
且 `payableCents=not-calculated`。本课不解析外部价格文字；
表单必须先经过下一章的严格元转分函数。UTC 时间保持持久化形状，显示时才本地化。

## 8. 常见错误与排查路径

**明确错误示例：语法正确但违反业务规则。**

```js
const priceCents = 100;
const discountCents = 200;
console.log(priceCents - discountCents);
```

它会正常输出 `-100`，没有异常，却把优惠后的金额变成负数。

另一个常见错误是：

```js
if (priceCents) {
  console.log("price is valid");
}
```

合法 0 分不会进入分支，而字符串 `"0"` 反而会进入。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 免费商品显示 `invalid-price`，付费商品正常 |
| 证据 | 日志显示 `priceCents=0`，分支使用 `if (!priceCents)` |
| 原因 | 把 falsy 判断误当成金额值域校验 |
| 修复 | 改为 `Number.isSafeInteger(priceCents) && priceCents >= 0` |
| 复验 | 0 与 1990 通过；`-1`、`1.5`、`"0"`、`NaN` 被拒绝 |

若错误分支没有原因，先分别打印各个布尔子表达式。不要删除校验让正常样例通过，
也不要在最后用 `Math.max(0, payable)` 把非法折扣压成 0。

## 9. 课后题

1. `0 || 20` 和 `0 ?? 20` 分别得到什么，为什么？
2. 为什么 `"2" < "10"` 不能代表金额 2 小于金额 10？
3. `a && b` 是否总返回 boolean？
4. 为什么模板字符串不能证明金额合法？

**参考答案：**

1. 前者为 20，因为 0 falsy；后者为 0，因为 0 不是空值。
2. 两者是字符串，比较规则不是已校验的同单位数值比较。
3. 不是；它返回决定结果的原操作数。
4. 模板字符串只把值转换成展示文字，不检查类型、单位和值域。

## 10. 实践练习

### 基础

商品 5000 分、优惠 500 分，输出 `payableCents=4500` 和
`label=需支付`。标签使用一次三元表达式。

### 进阶

为状态增加三条路径：`available` 可购买，`reserved` 显示已预约，
其他值显示不可购买。金额校验必须先于状态决策。

### 故障注入

分别把价格改为 0、`"0"`、`NaN`，记录旧版 `if (priceCents)` 与明确校验的差异，
最后恢复明确校验。

**答案标准：**

- 基础得到 4500，不使用浮点元；
- 进阶每个状态只有一条可观察路径；
- 故障注入证明 0 合法，字符串和 `NaN` 非法；
- 任一非法输入都不计算 `payableCents`，不能用格式化掩盖错误。

## 11. 阶段验收

- [ ] 准确预测 `operators.mjs` 的 11 行输出。
- [ ] 合法折扣输出 2200，超额折扣不产生支付金额。
- [ ] 0 分通过，负数、小数、字符串和 `NaN` 被拒绝。
- [ ] 能解释 `||` 与 `??` 对 0 的不同处理。
- [ ] 保存一次“语法通过但业务失败”的五段诊断记录。
- [ ] 明确说明源码固定金额不是可信外部输入的证明。

## 12. 常见问题

**能否全部使用 `??` 代替 `||`？**

不能。两者表达不同缺省策略；更重要的是，业务无效值仍需明确校验。

**三元表达式是否比 `if` 更快？**

本课选择依据是可读性和结果用途，不做没有测量证据的性能判断。

**为什么不自动把负支付金额改成 0？**

因为这会掩盖非法折扣配置。失败必须保留证据并阻止错误状态继续传播。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN：表达式与运算符](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_operators)
- [MDN：严格相等](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Strict_equality)
- [MDN：逻辑与](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_AND)
- [MDN：逻辑或](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR)
- [MDN：空值合并](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing)
- [MDN：`if...else`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else)

## 我现在能做到什么

我能按求值顺序解释运算与短路，用明确分支保留合法 0 分，
并在不信任外部输入的前提下拒绝非法价格、折扣和商品状态。

## 单元导航

[上一篇：值、变量、类型与显式转换](01-values-variables-types-conversion.md) ·
[返回第 1 章目录](../README.md#第一章值运算与控制流程) ·
[下一篇：循环、迭代与状态追踪](03-loops-iteration-state-tracing.md)
