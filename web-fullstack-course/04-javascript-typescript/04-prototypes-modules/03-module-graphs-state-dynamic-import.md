# 模块图、共享状态与动态导入

## 任务卡

- **本课产出**：一组观察模块单次求值、实时绑定与动态导入的 `.mjs` 文件。
- **运行环境**：Node.js 24 LTS；不安装第三方依赖。
- **预计时间**：80 分钟。
- **完成证据**：能解释模块为何只打印一次加载日志、为什么导出的可变对象仍会共享，以及循环初始化为什么可能失败。

## 1. 任务背景

拆成 ESM 后，文件不再孤立：静态导入把它们连接成模块图。图中的模块通常只求值一次，导入绑定会持续反映导出方的值。这有利于复用，也可能悄悄形成共享可变状态。

邻里集市希望按需加载通知文案，但价格工具不应在导入时发送请求，目录模块也不应暴露可由所有页面任意修改的数组。本课用可观察日志厘清加载、状态和副作用的所有权。

## 2. 学习目标

完成本课后，你能够：

1. 区分模块解析、实例化和求值；
2. 观察同一模块在一个模块图中的单次求值；
3. 解释 ESM 导入是实时只读绑定，不是值的静态副本；
4. 识别共享可变对象和导入即执行的副作用；
5. 使用 `import()` 按需加载模块；
6. 说明顶层 `await` 对依赖方求值的影响；
7. 识别循环依赖中的未初始化绑定风险；
8. 按职责建立单向依赖并明确清理责任。

## 3. 预备知识

先完成上一课的 `js-lab/modules/` 三文件案例，确认：

```bash
node modules/main.mjs
```

能够运行。静态 `import` 在模块顶层声明；动态 `import()` 是返回 Promise 的表达式。本课只使用 Node 可运行示例，不把按需加载宣称为自动性能提升。

## 4. 核心理论

### 4.1 模块图先连接，再求值

运行入口时，运行时解析所有静态说明符，连接导入和导出，然后按依赖顺序求值。若两个导入最终指向同一规范化模块 URL，该模块在当前模块图中通常只求值一次。

“只求值一次”不等于“函数只调用一次”，也不等于跨进程缓存。每次新启 Node 进程都会创建新的运行环境。

### 4.2 导入是实时绑定

导出方重新赋值 `export let count` 后，导入方读取到新值。导入方不能执行 `count = 10`。如果导出的是数组或对象，导入方虽然不能替换绑定，却仍可能修改对象内部，这正是共享状态风险。

### 4.3 副作用需要所有者

模块加载时打印日志、注册事件、启动计时器或发送网络请求，都是求值副作用。导入一个工具不应意外启动应用。入口负责启动，资源创建者负责暴露明确的停止方式，测试才能隔离状态。

### 4.4 动态导入与顶层 `await`

`import("./notice.mjs")` 返回 Promise，可在条件满足时加载。首次请求仍有下载、解析和求值成本；失败也必须处理。顶层 `await` 可在 ESM 中使用，但会暂停该模块及等待它的依赖方，不能在基础工具中随意加入长时间任务。

### 4.5 循环依赖不等于安全依赖

A 导入 B、B 又导入 A 时，模块图可以建立，但某一方在初始化完成前读取另一方的 `const` 会进入暂时性死区并抛错。即便当前执行顺序没有失败，双向职责也会放大后续修改风险。

## 5. 元素、属性、API 或配置清单

| 语法或概念 | 作用 | 风险或边界 |
| --- | --- | --- |
| 静态 `import` | 构建固定依赖边 | 入口求值前先解析 |
| `export let` | 导出可重新赋值的绑定 | 导入方只读但能观察变化 |
| 导出对象 | 共享同一对象引用 | 内部可变性不会被 ESM 阻止 |
| `import()` | 返回模块命名空间 Promise | 需要处理加载失败 |
| 模块命名空间 | 保存导出的只读视图 | 同一模块通常返回同一命名空间对象 |
| 顶层 `await` | 暂停当前模块求值 | 会传播等待到依赖方 |
| `import.meta.url` | 当前模块规范 URL | 适合解析模块相对资源 |
| 副作用导入 | 只执行模块求值 | 应有明确所有者 |

## 6. 最小可运行案例

完整文件 `js-lab/modules/counter-state.mjs`：

```js
console.log("counter-state loaded");

export let count = 0;

export function increment() {
  count += 1;
}
```

完整文件 `js-lab/modules/counter-reader.mjs`：

```js
import { count } from "./counter-state.mjs";

export function readCount() {
  return count;
}
```

完整文件 `js-lab/modules/counter-main.mjs`：

```js
import { increment } from "./counter-state.mjs";
import { readCount } from "./counter-reader.mjs";

console.log(readCount());
increment();
console.log(readCount());
```

运行：

```bash
node modules/counter-main.mjs
```

预期输出：

```text
counter-state loaded
0
1
```

虽然入口和读取器都依赖 `counter-state.mjs`，加载日志只出现一次；读取函数观察到导出绑定的新值。这个实验用于认识语义，不表示业务状态应默认保存在模块顶层。

## 7. 邻里集市集成案例

目录页只在用户请求帮助时加载通知模块。以下两个文件是完整案例。

完整文件 `js-lab/modules/notice.mjs`：

```js
console.log("notice module evaluated");

const messages = Object.freeze({
  empty: "暂时没有匹配商品，请调整关键词。",
  offline: "网络不可用，请稍后重试。",
});

export function getNotice(kind) {
  const message = messages[kind];
  if (typeof message !== "string") {
    throw new RangeError(`unknown notice kind: ${kind}`);
  }
  return message;
}
```

完整文件 `js-lab/modules/lazy-notice.mjs`：

```js
async function loadNotice(kind) {
  const module = await import("./notice.mjs");
  return { module, message: module.getNotice(kind) };
}

console.log("before dynamic import");
const first = await loadNotice("empty");
const second = await loadNotice("offline");
console.log(first.message);
console.log(second.message);
console.log(first.module === second.module);
```

运行：

```bash
node modules/lazy-notice.mjs
```

预期输出：

```text
before dynamic import
notice module evaluated
暂时没有匹配商品，请调整关键词。
网络不可用，请稍后重试。
true
```

`notice.mjs` 没有导入入口、DOM 或目录状态。动态导入两次得到同一模块命名空间对象，模块求值日志只有一行。实际浏览器中首次加载可能失败，调用处应把失败转成可恢复 UI，而不是假设动态导入总能完成。

### 共享状态的边界

下面是明确的错误设计，不要作为完整项目实现：

```js
// 错误：任何导入方都能 push、splice 或修改记录
export const listings = [];
```

更稳妥的模块要么只提供纯工具，要么把状态写操作集中到明确函数并返回快照。即使做了内存封装，刷新仍会清空，且任何前端模块都不能授予服务端写权限。

## 8. 常见错误与排查路径

### 错误示例：循环初始化时读取尚未完成的绑定

```js
// a.mjs
import { b } from "./b.mjs";
export const a = `A(${b})`;

// b.mjs
import { a } from "./a.mjs";
export const b = `B(${a})`;
```

五段诊断记录：

1. **现象**：入口加载时报 `ReferenceError: Cannot access 'a' before initialization`。
2. **证据**：堆栈指向模块顶层初始化；依赖图中存在 `a -> b -> a`。
3. **原因**：B 在 A 的 `const a` 初始化完成前读取该绑定。
4. **修复**：提取双方共同依赖的纯模块，或把读取延迟到显式函数调用并保持单向职责。
5. **复验**：画出的图不再包含环；入口连续运行两次都得到确定输出。

其他错误：

- 动态导入没有 `await`：拿到的是 Promise，不是模块命名空间；
- `import()` 捕获后吞掉异常：页面永久停留在加载中，丢失失败证据；
- 工具模块顶层启动计时器：进程无法退出，测试互相污染；
- 用查询参数制造多个 URL：可能导致同一源文件被当成不同模块实例，应先确认是否有意。

## 9. 课后题

1. 同一模块被两条静态路径依赖时，为什么加载日志通常只出现一次？
2. 导入绑定“只读”是否表示导出对象不可变？
3. 动态导入一定能提升性能吗？
4. 顶层 `await` 为什么会影响依赖方？

**答案：**

1. 解析后的同一模块 URL 在一个模块图中只有一个模块记录并求值一次。
2. 不表示；绑定不能重赋值，对象内部仍可能被修改。
3. 不一定；它延后成本，也增加请求和错误分支，必须依据测量与交互需求使用。
4. 依赖方要等待当前模块求值完成，异步求值会沿依赖图传播。

## 10. 实践练习

### 基础练习

给 `notice.mjs` 增加 `conflict` 文案，动态加载并输出。未知类型必须抛 `RangeError`。

### 进阶练习

创建 `createCatalog(initialItems)` 工厂，状态保存在闭包而不是模块顶层，提供 `read()` 和 `add(item)`；创建两个实例并证明状态独立。

### 故障注入练习

把动态导入路径改为 `./missing.mjs`。在调用处捕获错误，输出 `notice unavailable`，同时保留原错误作为 `cause` 或日志证据。

**参考答案要点：**

```js
export function createCatalog(initialItems) {
  let items = initialItems.map((item) => ({ ...item }));
  return {
    read() {
      return items.map((item) => ({ ...item }));
    },
    add(item) {
      items = [...items, { ...item }];
    },
  };
}
```

工厂隔离的是当前进程内存状态，刷新、重启或新进程都不会保留数据；服务端授权仍需独立实现。

## 11. 阶段验收

- [ ] `counter-main.mjs` 只打印一次加载日志，读取结果从 0 变为 1；
- [ ] `lazy-notice.mjs` 只求值一次通知模块，两个命名空间严格相等；
- [ ] 能指出导入绑定与对象内部可变性的区别；
- [ ] 能把循环依赖画成图，并用职责拆分消除环；
- [ ] 动态导入失败有可观察的失败状态，不永久停留在加载中；
- [ ] 没有把模块内存状态描述成持久化、身份或对象授权。

## 12. 常见问题

**模块缓存可以当应用数据库吗？**
不可以。它只属于当前运行环境，进程重启、多实例部署和并发写入都会破坏这种假设。

**动态导入的模块可以再次卸载吗？**
标准 ESM 没有通用的手动卸载 API。应清理模块创建的事件监听、计时器和其他资源，而不是依赖卸载模块。

**循环依赖是否永远报错？**
不是；某些环因读取时机而暂时运行。但其初始化顺序和职责耦合仍需审查，不能以“现在没报错”证明设计稳健。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [MDN：动态导入](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/import)
- [MDN：`import` 声明](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/import)
- [Node.js 24：ESM](https://nodejs.org/docs/latest-v24.x/api/esm.html)
- [ECMAScript：Cyclic Module Records](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-cyclic-module-records)

## 我现在能做到什么

我能把模块视为有求值顺序和状态所有权的依赖图，观察实时绑定与单次求值，谨慎使用动态导入，并消除共享可变导出、隐式副作用和危险循环初始化。

## 单元导航

- 上一单元：[ESM 导入、导出与路径解析](./02-esm-import-export-resolution.md)
- 下一单元：[DOM 查询、节点创建与安全渲染](../05-dom-events/01-dom-query-create-safe-rendering.md)
- 章入口：[原型、类与 ECMAScript 模块](../04-prototypes-modules.md)
