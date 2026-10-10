# 循环、迭代与状态追踪

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 用可终止循环累计多件商品，并保留每次状态迁移证据 |
| 可观察产出 | `js-lab/iteration.mjs`、`js-lab/cart-trace.mjs`、纸面状态表 |
| 运行条件 | Node.js 24 LTS；无第三方依赖 |
| 建议时间 | 120 分钟 |
| 完成证据 | 精确输出、溢出拒绝、一次越界和一次终止故障记录 |

## 1. 任务背景

购物车合计不是“把一个公式写很多遍”，而是让同一组规则作用于每一项。
循环必须同时回答三个问题：从什么状态开始、什么条件下继续、每一轮如何接近结束。
漏掉更新会无限执行，边界多写一个等号会多算一项，累计溢出则会让金额失去精确性。

本课的商品数组是源码内教学数据，不是外部 API 响应。每项价格仍须为非负安全整数分，
时间仍为 UTC 字符串；真实 JSON 必须先通过第 3 章的数据边界。

## 2. 学习目标

完成本课后，你应能：

- 写出可终止的 `for` 和 `while` 循环；
- 解释初始化、继续条件、循环体和更新的执行顺序；
- 区分 `break` 与 `continue`；
- 识别少一次、多一次和数组越界；
- 使用累计器，并在乘法、加法后检查安全整数；
- 用纸面状态表预测每轮输入和输出；
- 用 `Ctrl+C` 安全中断本机错误的无限循环；
- 为邻里集市购物车输出完整状态轨迹。

## 3. 预备知识

先完成[运算符、条件分支与短路求值](02-operators-conditions-short-circuit.md)，
能够校验非负安全整数分，并理解 `if`、严格比较和模板字符串。

数组在本课只作为“按顺序保存多项值”的容器预览；对象身份、引用和数组方法在第 3 章详细推导。

## 4. 核心理论

### 4.1 `for` 的四个时刻

```js
for (let index = 0; index < length; index += 1) {
  // 使用当前 index
}
```

执行顺序是：

```text
初始化一次 → 检查条件 → 执行循环体 → 更新 → 再检查条件
```

当 `length` 为 3 时，有效下标是 0、1、2。`index < length` 在 index 为 3 时失败，
因此不会读取第 4 项。误写 `<=` 会多执行一次。

### 4.2 `while` 与终止度量

`while` 适合“重复次数取决于状态”的过程。写之前要指出一个终止度量：
计数递增到上限、待处理项逐渐减少，或状态明确变为完成。
循环体必须在所有可继续路径上推进它；`continue` 前遗漏更新是典型无限循环来源。

### 4.3 `break` 与 `continue`

`break` 立即结束最近一层循环；`continue` 跳过本轮剩余语句，进入下一次检查。
两者不是错误恢复的通用替代品。金额无效时应抛出失败或停止整个计算，
不能 `continue` 静默丢掉坏商品后仍显示“合计成功”。

### 4.4 累计器是显式状态机

累计器 `totalCents` 在每轮经历：

```text
旧合计 + 当前行金额 = 候选新合计 → 校验 → 提交为新合计
```

应先计算候选值并检查，再覆盖旧值。价格和数量即使各自安全，乘积仍可能不安全；
旧合计与当前行各自安全，和也可能溢出。每个运算边界都要检查。

### 4.5 状态表比猜测更可靠

状态表至少记录：轮次、当前下标、输入、旧状态、分支、候选状态、新状态。
最后一次失败的条件检查也应写出，它解释循环为何停止。

## 5. 语法、标准 API 与运行时边界清单

| 语法或 API | 作用 | 关键边界 |
| --- | --- | --- |
| `for (init; condition; update)` | 已知迭代范围 | 条件通常使用 `< length` |
| `while (condition)` | 状态驱动迭代 | 循环体必须推进终止条件 |
| `for...of` | 按顺序读取集合值 | 不直接提供下标 |
| `break` | 结束最近循环 | 不等于退出整个进程 |
| `continue` | 跳过本轮剩余语句 | 仍需保证状态推进 |
| `array[index]` | 按零基下标读取 | 越界得到 `undefined` |
| `Number.isSafeInteger` | 检查每步整数结果 | 乘法和加法后都检查 |
| `console.log` | 输出状态轨迹 | 不能代替业务返回或存储 |
| `Ctrl+C` | 中断前台 Node 进程 | 仅用于本机故障恢复 |

## 6. 最小可运行案例

创建完整文件 `js-lab/iteration.mjs`：

```js
let totalCents = 0;

for (let index = 0; index < 3; index += 1) {
  const oldTotal = totalCents;
  totalCents += 100;
  console.log(`for index=${index}, old=${oldTotal}, new=${totalCents}`);
}

let attempt = 0;
while (attempt < 4) {
  attempt += 1;
  if (attempt === 2) continue;
  if (attempt === 4) break;
  console.log(`while attempt=${attempt}`);
}

console.log(`final=${totalCents}`);
```

运行 `node iteration.mjs`，预期完整输出：

```text
for index=0, old=0, new=100
for index=1, old=100, new=200
for index=2, old=200, new=300
while attempt=1
while attempt=3
final=300
```

`attempt` 在 `continue` 之前增加，因此不会永远停在 1。到 4 时 `break`，
所以不会输出 `while attempt=4`。

## 7. 邻里集市集成案例

创建完整文件 `js-lab/cart-trace.mjs`：

```js
const items = [
  {
    id: "listing-1",
    title: "台灯",
    priceCents: 1990,
    quantity: 2,
    status: "available",
    createdAt: "2026-10-11T08:00:00.000Z",
  },
  {
    id: "listing-2",
    title: "书架",
    priceCents: 5000,
    quantity: 1,
    status: "available",
    createdAt: "2026-10-11T08:30:00.000Z",
  },
  {
    id: "listing-3",
    title: "折叠椅",
    priceCents: 1200,
    quantity: 1,
    status: "reserved",
    createdAt: "2026-10-11T09:00:00.000Z",
  },
  {
    id: "listing-4",
    title: "赠品",
    priceCents: 0,
    quantity: 1,
    status: "available",
    createdAt: "2026-10-11T09:30:00.000Z",
  },
];

let totalCents = 0;
let acceptedCount = 0;

for (let index = 0; index < items.length; index += 1) {
  const item = items[index];
  if (
    !Number.isSafeInteger(item.priceCents) ||
    item.priceCents < 0 ||
    !Number.isSafeInteger(item.quantity) ||
    item.quantity < 1
  ) {
    throw new RangeError(`invalid cart line: ${item.id}`);
  }
  if (item.status !== "available") {
    console.log(`skip=${item.id}, status=${item.status}`);
    continue;
  }

  const lineCents = item.priceCents * item.quantity;
  if (!Number.isSafeInteger(lineCents)) {
    throw new RangeError(`line total overflow: ${item.id}`);
  }
  const oldTotal = totalCents;
  const nextTotal = oldTotal + lineCents;
  if (!Number.isSafeInteger(nextTotal)) {
    throw new RangeError(`cart total overflow: ${item.id}`);
  }

  totalCents = nextTotal;
  acceptedCount += 1;
  console.log(
    `step=${index + 1}, id=${item.id}, old=${oldTotal}, line=${lineCents}, next=${totalCents}`,
  );
}

console.log(`accepted=${acceptedCount}`);
console.log(`final=${totalCents}`);
```

运行 `node cart-trace.mjs`，预期输出：

```text
step=1, id=listing-1, old=0, line=3980, next=3980
step=2, id=listing-2, old=3980, line=5000, next=8980
skip=listing-3, status=reserved
step=4, id=listing-4, old=8980, line=0, next=8980
accepted=3
final=8980
```

轨迹保留了每次状态迁移，0 分赠品没有被真假判断丢弃。`reserved` 商品被明确记录为跳过，
不是静默忽略坏金额。记录中的 UTC 时间未参与本地显示，也没有被循环改变。
若 `items` 来自 JSON，必须先逐字段校验；本例数组仅是已知源码种子。

纸面状态表应至少得到：

| index | id | 旧合计 | 行金额 | 分支 | 新合计 |
| ---: | --- | ---: | ---: | --- | ---: |
| 0 | listing-1 | 0 | 3980 | 累加 | 3980 |
| 1 | listing-2 | 3980 | 5000 | 累加 | 8980 |
| 2 | listing-3 | 8980 | 1200 | 跳过 | 8980 |
| 3 | listing-4 | 8980 | 0 | 累加 | 8980 |
| 4 | 无 | 8980 | 无 | 条件失败，结束 | 8980 |

## 8. 常见错误与排查路径

**明确错误示例：越界一轮。**

```js
for (let index = 0; index <= items.length; index += 1) {
  console.log(items[index].id);
}
```

最后一次 `index === items.length`，读取结果为 `undefined`，继续访问 `.id` 会抛 `TypeError`。

**明确错误示例：无法终止。**

```js
let index = 0;
while (index < 3) {
  console.log(index);
}
```

本机运行后会持续输出 0。使用 `Ctrl+C` 中断，补回能推进 `index` 的更新，
再从小上限重新运行。不要用强制重启机器代替定位终止条件。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 三件商品被累计四次，最终金额多一行 |
| 证据 | 轨迹出现 `index=3`，而有效下标只有 0、1、2 |
| 原因 | 继续条件误写为 `index <= items.length` |
| 修复 | 改回 `index < items.length`，保留逐轮日志 |
| 复验 | 恰好三次进入循环；最后记录 index=3 时条件失败 |

若进程卡住，先停止并缩小输入，再检查初始化、条件、更新和所有 `continue` 路径。
若总额不对，比较“旧合计、行金额、新合计”，不要只盯最终数字。

## 9. 课后题

1. 长度为 4 的数组，合法下标是什么？
2. `continue` 是否会执行本轮后面的语句？
3. 两个安全整数相加，结果一定是安全整数吗？
4. 为什么静默跳过非法金额会让“成功合计”不可信？

**参考答案：**

1. 0、1、2、3。
2. 不会；它直接进入下一次循环检查。
3. 不一定，结果可能超过安全整数范围，必须再次检查。
4. 用户不知道某项未计入，最终金额与输入集合不再对应；应明确失败并保留证据。

## 10. 实践练习

### 基础

用 `for` 累加 `[100, 200, 0]`，每轮输出旧值和新值，最终输出 300。

### 进阶

给购物车增加 `quantity=3`、`priceCents=250` 的商品，预测全部后续状态，
再运行核对；最终应增加 750 分。

### 故障注入

先把循环条件改为 `<=` 复现越界，再恢复；随后把一项价格改为
`Number.MAX_SAFE_INTEGER`，证明加法溢出被拒绝且不会提交候选新合计。

**答案标准：**

- 基础保留 0 分项并输出 300；
- 进阶最终金额为 9730；
- 故障注入包含修复前错误行、原因和修复后输出；
- 溢出时旧 `totalCents` 未被错误候选值覆盖。

## 11. 阶段验收

- [ ] 准确预测 `iteration.mjs` 全部输出。
- [ ] 购物车输出 3 条接纳记录、1 条跳过记录和 `final=8980`。
- [ ] 状态表包含最后一次条件失败。
- [ ] 0 分被累计，reserved 状态不被当作价格错误。
- [ ] 行乘积与总和分别执行安全整数检查。
- [ ] 能用 `Ctrl+C` 中断故障并通过五段记录完成复验。
- [ ] 能说明外部商品数组必须在循环前经过运行时校验。

## 12. 常见问题

**是否总该用数组方法代替循环？**

不是。数组方法在第 3 章学习；需要明确状态迁移、提前结束或逐步诊断时，普通循环很清晰。

**能否遇到坏商品就 `continue`？**

只有契约明确允许“部分成功”且会报告逐项失败时才可以。本课购物车合计要求完整可信，因此坏金额应失败。

**无限循环会在后台运行吗？**

不会。长同步循环占用当前 JavaScript 执行线程，可能使 Node 或浏览器无法处理其他工作。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN：循环与迭代](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Loops_and_iteration)
- [MDN：`for`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for)
- [MDN：`while`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/while)
- [MDN：`break`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/break)
- [MDN：`continue`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/continue)
- [Node.js 命令行选项](https://nodejs.org/docs/latest-v24.x/api/cli.html)

## 我现在能做到什么

我能为循环写出终止条件和纸面状态表，用逐步轨迹定位越界与无限循环，
并在每次乘加后检查整数分，得到可解释且不会静默丢项的购物车合计。

## 单元导航

[上一篇：运算符、条件分支与短路求值](02-operators-conditions-short-circuit.md) ·
[返回第 1 章入口](../01-values-control-flow.md) ·
[下一章：函数、作用域与错误](../02-functions-scope-errors.md)
