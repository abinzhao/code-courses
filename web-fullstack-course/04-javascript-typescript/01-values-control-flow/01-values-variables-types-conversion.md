# 值、变量、类型与显式转换

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 运行第一组 JavaScript 值实验，并建立邻里集市商品种子的单位与时间约束 |
| 可观察产出 | `js-lab/values.mjs`、`js-lab/listing-seed.mjs` 及逐行输出预测 |
| 运行条件 | Node.js 24 LTS；无第三方依赖 |
| 建议时间 | 90 分钟 |
| 完成证据 | Node 输出、一次错误复现记录、三档练习答案 |

## 1. 任务背景

邻里集市的一件商品至少有标题、价格、状态和创建时间。程序不会自动知道
`"1990"` 是文字还是金额，也不会知道 `0` 表示免费还是缺失。进入条件和循环之前，
先要看懂 JavaScript 如何从上到下执行语句、表达式如何产生值，以及值的类型如何影响后续计算。

本课只使用源码中写死的教学数据。它不是外部 API 响应；表单、JSON 和网络数据进入业务前仍须单独校验。
价格始终使用非负安全整数分，持久化时间始终使用 UTC ISO 8601 字符串。

## 2. 学习目标

完成本课后，你应能：

- 区分语句、表达式、声明、赋值和输出；
- 选择 `const` 与 `let`，并解释标识符的作用；
- 识别 string、number、boolean、`undefined`、`null`、bigint 和 symbol；
- 说明 `typeof null` 与 `typeof NaN` 的限制；
- 使用显式转换，并拒绝把转换结果直接当作业务有效数据；
- 解释二进制浮点误差，以及金额为何保存为安全整数分；
- 用入口日志定位运行错文件或未保存文件的问题。

## 3. 预备知识

先确认终端能运行：

```bash
node --version
```

目标输出以 `v24.` 开头。创建个人练习目录：

```bash
mkdir js-lab
cd js-lab
```

`js-lab/` 是读者自己的实验目录，不是教材仓库中的源码目录。终端提示符和 Markdown 围栏不属于文件内容。

## 4. 核心理论

### 4.1 从源码到可观察结果

Node 先读取已保存的文件，再解析语法，最后从模块入口执行。普通语句按顺序完成：

```text
源码字符 → 解析为语法结构 → 初始化声明 → 执行语句 → 表达式求值 → 产生输出
```

`const priceCents = 1990;` 是声明语句，其中 `1990` 是产生 number 值的表达式。
`console.log(priceCents);` 是表达式语句：先读取绑定，再调用日志函数。
日志只显示当前值，不会持久化数据；重新运行会重新建立全部内存状态。

### 4.2 `const`、`let` 与绑定

`const` 禁止给同一名称重新赋值，适合默认不变的绑定。`let` 允许重新赋值，
适合确实会变化的数量或累计值。二者都不会让值自动持久化。

```js
const priceCents = 1990;
let quantity = 1;
quantity = quantity + 1;
```

赋值不是数学等式。右侧先读取旧值并得到 `2`，再把结果写回 `quantity`。
标识符区分大小写，不能以数字开头，也不能使用 `const` 等保留词。

### 4.3 类型属于值

| 类型 | 示例 | 本课用途 | 重要边界 |
| --- | --- | --- | --- |
| string | `"台灯"` | 标题、UTC 时间文字 | 数字文字仍不是 number |
| number | `1990` | 整数分、数量 | 也包含 `NaN`、小数和无穷值 |
| boolean | `true` | 是/否条件 | 不能表达多种商品状态 |
| undefined | `undefined` | 尚未提供 | 不等于合法的 0 分 |
| null | `null` | 明确没有选择 | `typeof null` 历史上返回 `"object"` |
| bigint | `9007199254740993n` | 超大整数方向认知 | 不能与 number 直接混算，JSON 不直接支持 |
| symbol | `Symbol("listing")` | 唯一标记方向认知 | 不适合作为可传输 API id |

`typeof` 适合做第一层观察，不等于业务校验。`typeof NaN` 是 `"number"`，
而 `NaN === NaN` 为 `false`；应使用 `Number.isNaN` 判断它。

### 4.4 显式转换不是校验

`Number("19")` 得到 `19`，但 `Number("")` 得到 `0`，`Number("x")` 得到 `NaN`。
`String(1990)` 得到 `"1990"`，但单位信息不会随字符串自动保存。
外部输入必须先定义完整格式，再转换和检查值域；不能只看转换有没有抛异常。

普通 number 使用 IEEE 754 二进制浮点。`0.1 + 0.2` 不能精确表示为十进制 `0.3`。
邻里集市把 19.90 元保存和传输为 `1990` 分，并在每次运算后检查
`Number.isSafeInteger`。最终格式化为两位小数不能修复此前已经发生的误差。

## 5. 语法、标准 API 与运行时边界清单

| 语法或 API | 作用 | 本课约束 |
| --- | --- | --- |
| `const name = value` | 建立不可重新赋值的绑定 | 默认选择 |
| `let name = value` | 建立可重新赋值的绑定 | 只用于真实状态变化 |
| `typeof value` | 返回粗粒度类型文字 | 单独处理 `null` 与 `NaN` |
| `Number(value)` | 显式转为 number | 转换后仍检查格式和值域 |
| `String(value)` | 显式转为 string | 不携带原始单位 |
| `Number.isNaN(value)` | 精确判断 `NaN` | 不用 `value === NaN` |
| `Number.isSafeInteger(value)` | 检查安全整数 | 所有业务金额的最低要求 |
| `new Date(text).toISOString()` | 标准化时间 | 这里只核对已知 UTC 常量，不接收外部数据 |
| `console.log(...)` | 输出观察证据 | 不等于返回值或持久化 |

## 6. 最小可运行案例

创建完整文件 `js-lab/values.mjs`：

```js
const title = "台灯";
const priceCents = 1990;
const available = true;
const notProvided = undefined;
const noSelection = null;
const beyondSafeInteger = 9007199254740993n;
const localToken = Symbol("listing");

console.log(typeof title);
console.log(typeof priceCents);
console.log(typeof available);
console.log(typeof notProvided);
console.log(noSelection === null);
console.log(typeof noSelection);
console.log(typeof beyondSafeInteger);
console.log(typeof localToken);
console.log(Number.isNaN(Number("not-a-number")));
console.log(0.1 + 0.2 === 0.3);
console.log(Number.isSafeInteger(priceCents));
```

运行：

```bash
node values.mjs
```

预期完整输出：

```text
string
number
boolean
undefined
true
object
bigint
symbol
true
false
true
```

扩展顺序是：先观察四种常用值，再单独识别 `null`，随后认识 bigint、symbol，
最后把类型观察连接到 `NaN`、浮点和安全整数边界。

## 7. 邻里集市集成案例

创建完整文件 `js-lab/listing-seed.mjs`：

```js
const title = "台灯";
const priceCents = 1990;
const status = "available";
const createdAt = "2026-10-11T08:00:00.000Z";
let viewCount = 0;

viewCount = viewCount + 1;

const wholeYuan = Math.floor(priceCents / 100);
const fraction = String(priceCents % 100).padStart(2, "0");
const normalizedTime = new Date(createdAt).toISOString();

console.log(`title=${title}`);
console.log(`priceCents=${priceCents}`);
console.log(`displayPrice=${wholeYuan}.${fraction}`);
console.log(`status=${status}`);
console.log(`createdAt=${normalizedTime}`);
console.log(`viewCount=${viewCount}`);
console.log(`safeCents=${Number.isSafeInteger(priceCents)}`);
console.log(`canonicalUtc=${normalizedTime === createdAt}`);
```

运行 `node listing-seed.mjs`，预期输出：

```text
title=台灯
priceCents=1990
displayPrice=19.90
status=available
createdAt=2026-10-11T08:00:00.000Z
viewCount=1
safeCents=true
canonicalUtc=true
```

该文件是源码内教学种子，不是 API DTO 校验器。`createdAt` 是持久化形状；
本地展示时才可以按用户时区格式化。外部 JSON 即使包含相同字段，也必须在第 3 章经过边界解析。

## 8. 常见错误与排查路径

**明确错误示例（不要替换完整文件）：**

```js
const quantity = 1;
quantity = 2;
```

Node 会在第二行抛 `TypeError: Assignment to constant variable.`。确实要变化时使用 `let`，
而不是删除更新语句或把所有绑定都改成 `let`。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 修改标题后运行，终端仍输出旧标题 |
| 证据 | 入口先打印 `import.meta.url`，路径不是编辑器中打开的文件，或文件标签仍显示未保存 |
| 原因 | 终端当前目录错误、同名文件运行错误，或编辑内容尚未写入磁盘 |
| 修复 | 保存文件；运行 `pwd` 与 `ls`；使用正确相对路径执行 |
| 复验 | 把入口标题改为唯一文字，重新运行后路径与新文字同时出现 |

若出现语法错误，先读第一条错误及指向自己文件的行列。若输出为 `NaN`，
同时打印原值、`typeof` 和 `Number.isNaN`，不要只在最终显示层补 `0.00`。

## 9. 课后题

1. `const` 是否会递归冻结对象内容？
2. 为什么 `typeof null` 不能用于判断“可访问属性的对象”？
3. `Number("")` 得到 0，是否说明空价格是免费商品？
4. 为什么 `0.1 + 0.2` 的问题不能只靠最后 `toFixed(2)` 解决？

**参考答案：**

1. 不会；它只禁止给绑定重新赋值，对象属性规则在第 3 章展开。
2. 该结果是历史行为；还需先排除 `null`，数组也需单独判断。
3. 不能；转换规则不等于表单契约，空输入必须明确拒绝。
4. 格式化只改变显示，不能恢复中间计算已经丢失的精度。

## 10. 实践练习

### 基础

增加 `description`、`ownerId` 两个字符串，预测并输出它们的 `typeof`。

### 进阶

把 5000 分格式化为 `50.00`，不得先除成浮点后调用 `toFixed`。

### 故障注入

把 `priceCents` 改为字符串 `"1990"`，记录哪一项输出首先暴露类型错误；
随后恢复 number，不允许用 `Number(priceCents)` 在业务入口静默修复。

**答案标准：**

- 基础输出两个 `string`；
- 进阶使用整数商、余数与补零，输出 `50.00`；
- 故障记录应看到 `typeof` 为 `string`、`Number.isSafeInteger` 为 `false`，
  并说明外部文字需要严格解析，不能在此处猜测格式。

## 11. 阶段验收

- [ ] 运行前准确写出 `values.mjs` 的 11 行输出。
- [ ] 解释 `undefined`、`null` 与合法 0 分的差异。
- [ ] 证明 19.90 元在业务状态中保存为 `1990`。
- [ ] 证明种子时间保持 `2026-10-11T08:00:00.000Z`。
- [ ] 完成一次“现象、证据、原因、修复、复验”记录。
- [ ] 能说明本课固定值不代表外部数据已可信。

## 12. 常见问题

**为什么示例用 `.mjs`？**

它让 Node 明确按 ECMAScript 模块加载，并为后续 `import.meta.url`、ESM 导入建立一致环境。

**bigint 是否更适合所有金额？**

本课程接口契约采用 JSON 可传输的安全整数 number。bigint 不能直接 JSON 序列化；
超过契约范围时应拒绝，而不是局部换类型造成前后端不一致。

**`new Date(text)` 是否已经严格验证外部时间？**

没有。它可能接受并规范化多种输入；第 3 章会执行格式、日历往返和已知字段校验。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN：JavaScript 语法与类型](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types)
- [MDN：`typeof`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/typeof)
- [MDN：`Number.isNaN`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN)
- [MDN：`Number.isSafeInteger`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger)
- [Node.js 24 ECMAScript modules](https://nodejs.org/docs/latest-v24.x/api/esm.html)

## 我现在能做到什么

我能从执行顺序解释输出，区分常用 JavaScript 值，识别 `typeof` 与显式转换的边界，
并用安全整数分和 UTC 字符串建立第一份不混淆单位的邻里集市教学数据。

## 单元导航

[返回第 1 章目录](../README.md#第一章值运算与控制流程) ·
[下一篇：运算符、条件与短路](02-operators-conditions-short-circuit.md)
