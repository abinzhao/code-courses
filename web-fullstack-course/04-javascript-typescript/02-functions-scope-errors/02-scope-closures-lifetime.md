# 作用域、闭包与生命周期

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 用词法作用域封装独立计数，并实现请求代次控制器 |
| 可观察产出 | `js-lab/scope-closures.mjs`、`js-lab/request-generation.mjs` |
| 运行条件 | Node.js 24 LTS；无第三方依赖 |
| 建议时间 | 100–120 分钟 |
| 完成证据 | 独立闭包输出、过期代次判断、释放后失效 |

## 1. 任务背景

邻里集市搜索时，用户可能快速发起两次请求。页面需要知道哪个结果仍然属于当前搜索，
但把编号放进全局变量会允许无关代码随意修改。闭包可以让一组函数共享私有绑定，
并让不同控制器拥有互不干扰的状态。

闭包不是变量快照，也不是永不释放的“永久内存”。它保留对词法绑定的访问；
只要闭包仍可达，绑定及其引用的数据就可能继续存活。资源拥有者因此也要定义释放时机。
请求代次只判断结果是否仍新鲜；外部 Listing 仍须独立验证价格为非负安全整数分，
并验证 `createdAt` 是有效 UTC 字符串，闭包不能替代数据边界。

## 2. 学习目标

完成本课后，你应能：

- 区分词法作用域、函数作用域和块作用域；
- 解释同名遮蔽及其可读性风险；
- 识别 `let`、`const` 的暂时性初始化边界；
- 证明闭包捕获绑定而不是创建值快照；
- 创建互相独立的保留状态；
- 用闭包实现请求代次编号；
- 说明定时器、监听器、控制器和缓存的生命周期所有者；
- 通过 `dispose` 使旧请求和已释放资源失效。

## 3. 预备知识

先完成[函数契约、参数与返回值](01-function-contracts-parameters-returns.md)，
理解函数调用、局部变量、返回函数值和显式错误。

本课先预测可见名称与每次输出，再运行：

```bash
node scope-closures.mjs
```

## 4. 核心理论

### 4.1 词法作用域

JavaScript 根据源码嵌套位置决定名称查找：

```text
当前块或函数 → 外层词法环境 → 更外层环境 → 模块顶层
```

函数能访问声明处外层的名称，不取决于它从哪里被调用。参数和函数体局部名称属于该次调用；
`let`、`const` 还受花括号块约束。ESM 顶层名称属于模块，不自动成为全局对象属性。

### 4.2 遮蔽

内层声明与外层同名时，内层名称遮蔽外层名称：

```js
const status = "available";
{
  const status = "reserved";
  console.log(status);
}
console.log(status);
```

它依次输出 reserved、available。语法允许遮蔽，但金额单位、状态等关键名称无意义同名会增加误读；
需要不同含义时使用更明确名称。

### 4.3 暂时性初始化边界

作用域从块开始已经知道 `let`、`const` 名称，但声明执行前不能访问：

```js
console.log(status);
const status = "available";
```

这会抛 `ReferenceError`，不是得到 `undefined`。把声明机械搬到顶部可能改变依赖顺序；
应让使用点位于初始化之后。

### 4.4 闭包捕获绑定

内部函数离开创建它的调用后，仍可访问当时的词法环境。若外层绑定后来更新，
闭包读取的是当前绑定值，不是创建时复制的快照。

每次调用工厂函数都会创建新环境，所以两个计数器可以独立递增。
闭包适合封装小型状态，不代表所有应用状态都应隐藏在匿名函数中。

### 4.5 生命周期与释放

闭包若引用大型 Map、定时器 id、DOM 节点或 AbortController，相关资源可能持续可达。
拥有资源的对象应提供明确 `dispose`：

- 清除定时器和事件监听；
- 中止当前等待；
- 使旧代次失效；
- 清空不再需要的集合或引用；
- 拒绝释放后的新操作。

垃圾回收只处理不可达内存，不会自动替你撤销服务端事务或移除所有外部订阅。

## 5. 语法、标准 API 与运行时边界清单

| 语法或 API | 作用 | 边界 |
| --- | --- | --- |
| 函数体作用域 | 隔离参数与局部声明 | 每次调用创建独立环境 |
| `{ let/const ... }` | 建立块作用域 | 块外不可访问 |
| 同名声明 | 遮蔽外层绑定 | 谨慎使用，避免单位混淆 |
| 返回内部函数 | 创建闭包入口 | 保留绑定访问，不是值快照 |
| `Map.prototype.clear` | 释放集合条目引用 | 不会取消条目代表的外部操作 |
| `clearTimeout` | 取消尚未执行的计时器 | 已执行副作用不能回滚 |
| `AbortController.abort` | 请求取消信号方向 | 第 6 章处理；不回滚服务端事务 |
| `dispose()` 约定 | 结束资源生命周期 | 必须由明确所有者调用 |

## 6. 最小可运行案例

创建完整文件 `js-lab/scope-closures.mjs`：

```js
const feeCents = 100;

function calculate(priceCents) {
  const localFeeCents = feeCents;
  return priceCents + localFeeCents;
}

function createCounter() {
  let count = 0;
  return function next() {
    count += 1;
    return count;
  };
}

let currentLabel = "first";
const readLabel = () => currentLabel;
currentLabel = "second";

const firstCounter = createCounter();
const secondCounter = createCounter();

console.log(calculate(500));
console.log(feeCents);
console.log(firstCounter());
console.log(firstCounter());
console.log(secondCounter());
console.log(readLabel());

{
  const feeCents = 20;
  console.log(`block-fee=${feeCents}`);
}
console.log(`outer-fee=${feeCents}`);
```

运行 `node scope-closures.mjs`，预期输出：

```text
600
100
1
2
1
second
block-fee=20
outer-fee=100
```

`readLabel` 输出 second，证明它访问更新后的绑定。两个 counter 输出 1、2、1，
证明每次工厂调用拥有独立环境。

## 7. 邻里集市集成案例

创建完整文件 `js-lab/request-generation.mjs`：

```js
function createRequestGeneration() {
  let generation = 0;
  let disposed = false;
  const retainedQueries = new Map();

  return {
    begin(query) {
      if (disposed) throw new Error("generation controller is disposed");
      generation += 1;
      retainedQueries.set(generation, query);
      return generation;
    },
    isCurrent(candidate) {
      return !disposed && candidate === generation;
    },
    queryFor(candidate) {
      return retainedQueries.get(candidate);
    },
    dispose() {
      disposed = true;
      generation += 1;
      retainedQueries.clear();
    },
    current() {
      return generation;
    },
  };
}

const firstSearch = createRequestGeneration();
const secondSearch = createRequestGeneration();

const lampGeneration = firstSearch.begin("台灯");
const shelfGeneration = firstSearch.begin("书架");
const bicycleGeneration = secondSearch.begin("自行车");

console.log(`lamp-current=${firstSearch.isCurrent(lampGeneration)}`);
console.log(`shelf-current=${firstSearch.isCurrent(shelfGeneration)}`);
console.log(`shelf-query=${firstSearch.queryFor(shelfGeneration)}`);
console.log(`second-current=${secondSearch.isCurrent(bicycleGeneration)}`);

firstSearch.dispose();
console.log(`after-dispose=${firstSearch.isCurrent(shelfGeneration)}`);
console.log(`retained-after-dispose=${firstSearch.queryFor(shelfGeneration)}`);
console.log(`generation-after-dispose=${firstSearch.current()}`);
```

运行 `node request-generation.mjs`，预期输出：

```text
lamp-current=false
shelf-current=true
shelf-query=书架
second-current=true
after-dispose=false
retained-after-dispose=undefined
generation-after-dispose=3
```

第一次控制器中，“台灯”代次 1 被“书架”代次 2 取代；第二个控制器独立从 1 开始。
释放会让代次再前进并清空保留查询，因此旧 token 永远不再是当前值。
第 6 章会把同一机制与 `AbortController` 组合；代次只控制客户端结果时效，
不能证明 API 数据结构有效，也不能撤销服务器已完成的预约。

## 8. 常见错误与排查路径

**明确错误示例：初始化前访问。**

```js
console.log(status);
const status = "available";
```

预期 `ReferenceError: Cannot access 'status' before initialization`。

**明确错误示例：意外共享全局状态。**

```js
let count = 0;
function next() {
  count += 1;
  return count;
}
```

所有使用者共享同一个 count，无法创建独立计数器，也没有明确释放所有者。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 两个搜索框的请求编号互相递增 |
| 证据 | 二者调用同一个读取模块顶层 `generation` 的函数 |
| 原因 | 可变状态放在共享作用域，而不是每个控制器的闭包环境 |
| 修复 | 用工厂函数为每个搜索框创建独立 generation 绑定 |
| 复验 | 两个控制器第一次 `begin` 都返回 1，释放一个不影响另一个 |

若释放后仍可展示结果，检查 `dispose` 是否既推进代次又让 `isCurrent` 考虑 disposed。
仅清空 Map 不会使已保存的旧数字自动失效。

## 9. 课后题

1. 作用域与变量生命周期是否完全相同？
2. 闭包读取的是创建时值还是绑定？
3. 两次调用 `createCounter` 为什么不会共享 count？
4. 清空客户端缓存能否回滚服务端预约？

**参考答案：**

1. 不完全相同；作用域决定可见位置，可达闭包会延长绑定及引用数据的生命周期。
2. 绑定；绑定更新后闭包能读到新值。
3. 每次函数调用创建新的词法环境与 count 绑定。
4. 不能；客户端内存清理与服务端事务是不同边界。

## 10. 实践练习

### 基础

创建两个 counter，按 A、B、A、A、B 顺序调用，运行前预测输出。

### 进阶

给代次控制器增加 `cancelCurrent()`：只让当前代次失效并清空其查询，
但控制器仍允许下一次 `begin`。

### 故障注入

临时把 generation 移到模块顶层，让两个控制器共享它，记录失败证据后恢复闭包实现。

**答案标准：**

- 基础输出 A1、B1、A2、A3、B2；
- 进阶取消后旧 token 为 false，新 begin 得到更大代次；
- 故障注入明确展示第二个控制器不再从 1 开始，修复后恢复独立。

## 11. 阶段验收

- [ ] 准确解释块内外两个 `feeCents`。
- [ ] 证明闭包读取更新后的 `currentLabel`。
- [ ] 两个 counter 状态独立。
- [ ] 旧搜索代次不能覆盖新代次。
- [ ] dispose 后缓存清空、旧代次失效、新操作可按契约拒绝。
- [ ] 能指出资源所有者和释放调用位置。
- [ ] 不把代次控制当作外部 JSON 校验或服务端事务回滚。

## 12. 常见问题

**闭包一定导致内存泄漏吗？**

不是。没有可达引用后环境可以回收；长期保留无用大型数据、监听或计时器才是需要修复的生命周期问题。

**可以读取模块顶层常量吗？**

可以。问题是无所有者的可变共享状态；稳定配置常量与可变请求代次不是同一风险。

**为什么 token 只用 number？**

这是本机控制器内部值，不是跨进程资源 id。真实 API 资源仍使用服务端稳定 id。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN：作用域](https://developer.mozilla.org/en-US/docs/Glossary/Scope)
- [MDN：闭包](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures)
- [MDN：`let`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/let)
- [MDN：`const`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const)
- [MDN：内存管理](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Memory_management)

## 我现在能做到什么

我能根据词法位置解释名称可见性，用闭包创建独立且可释放的状态，
并以请求代次阻止旧结果在页面销毁或新搜索后继续生效。

## 单元导航

[上一篇：函数契约、参数与返回值](01-function-contracts-parameters-returns.md) ·
[返回第 2 章目录](../README.md#第二章函数作用域与可解释错误) ·
[下一篇：错误、堆栈与清理边界](03-errors-stacks-cleanup-boundaries.md)
