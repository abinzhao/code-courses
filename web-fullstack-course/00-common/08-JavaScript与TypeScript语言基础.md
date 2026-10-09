# 08-JavaScript 与 TypeScript 语言基础

## 目标

完成本知识单元后，学员应能使用现代 JavaScript 独立编写可运行的纯语言程序，并能读懂、编写基础的 TypeScript 类型，建立“类型在开发期约束、代码在运行时执行”的清晰边界。本单元不依赖浏览器 DOM，也不涉及 Node.js 的文件与网络 API。

学员应能够：

1. 正确使用 `let`、`const`、`var` 声明变量，说清三者作用域与提升差异，区分原始类型与引用类型在赋值、比较、传参时的不同表现。
2. 熟练使用解构、展开、模板字符串、可选链和空值合并等现代语法，写出更短且意图明确的代码。
3. 根据场景选择普通函数或箭头函数，正确使用默认参数与 rest 参数，并能判断函数中 `this` 的指向。
4. 解释作用域链与闭包，读懂闭包代码，说明闭包在数据封装中的用途与内存注意事项。
5. 用数组与对象的常用方法完成数据加工，使用 `try/catch/throw` 处理错误，并按 ESM 规范拆分与引用模块。
6. 画出事件循环的宏观模型（调用栈、微任务、宏任务），使用 Promise 与 `async/await` 组织异步流程，正确传播和捕获错误。
7. 为变量、函数和对象编写 TypeScript 类型，使用联合类型、收窄和基础泛型，在严格模式下通过 `tsc` 检查，并说明类型在运行时不存在这一事实。

## 技术栈

本单元只使用语言运行时、类型检查器和编辑器，不使用前端框架、后端框架和数据库。

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Node.js 当前 LTS | 运行 JavaScript 与编译后的程序 | 能启动脚本、观察输出和报错 |
| TypeScript 当前稳定大版本（5.x 系列） | 类型检查与编译 | 能使用 `tsc` 做检查，不写死小版本 |
| VS Code 当前稳定版 | 编辑、查看类型提示与诊断 | 能读懂编辑器中的类型报错位置与信息 |
| Chrome DevTools Console（可选） | 快速试验表达式 | 不作为主线运行环境 |
| 终端 | 执行运行与检查命令 | 能根据退出码判断检查是否通过 |

语言基线：

- JavaScript 语法以 ES2022 及更新的常用特性为准；`let/const`、箭头函数、Promise、ESM、可选链等都属于“默认使用”的现代语法。
- TypeScript 新项目默认开启严格模式，类型检查应作为提交前的必做步骤。
- 本单元所有 JS 示例均可保存为 `.js` 文件后用 `node 文件名.js` 运行；TS 示例先用 `tsc` 编译，或按课程约定使用教学 TS 运行器。

开始前检查环境：

```bash
node -v
npx tsc -v
```

预期观察：

- `node -v` 输出当前安装的 Node.js 版本。
- `npx tsc -v` 输出本地可用的 TypeScript 版本；首次使用 `npx` 可能需要联网拉取，按提示确认即可。

版本号不是考点。关键是确认“JS 能运行、TS 能检查”两条通路。

## 详细的理论知识讲解和示例伪代码

### 1. 变量声明与数据类型

#### 1.1 var、let 与 const 的差异

`var` 是旧的声明方式，具有函数作用域，并存在变量提升；`let` 和 `const` 是块级作用域，且在声明语句执行前处于“暂时性死区”，提前访问会直接报错。

```js
function oldWay() {
  console.log(value); // undefined：var 被提升，但赋值没有
  if (true) {
    var value = 1;
  }
  console.log(value); // 1：var 不受代码块限制
}

function newWay() {
  if (true) {
    let count = 1;
    const name = 'demo';
    // name = 'other'; // 报错：const 不能重新赋值
  }
  // console.log(count); // 报错：count 只在 if 块内有效
}
```

使用约定：

- 默认使用 `const`，变量确实需要重新赋值时才用 `let`；
- 不再在新代码中使用 `var`；
- `const` 只保证“绑定不变”，不保证对象内容不变（见 1.4）。

常见误解：

> const 声明的对象不能修改。

不能改的是变量指向，对象内部属性仍可增删改。需要冻结时可使用 `Object.freeze`，但那是浅冻结。

#### 1.2 原始类型

原始类型（基本类型）共有七种：`string`、`number`、`boolean`、`null`、`undefined`、`symbol`、`bigint`。

原始值的特点是不可变，赋值和传参传递的是值的副本：

```js
let a = 10;
let b = a;
b = 20;
console.log(a); // 10：a 和 b 是两份独立的值
```

两个需要记住的细节：

- `null` 表示“有意为空”，`undefined` 表示“未赋值”；
- `typeof null === 'object'` 是语言历史遗留的著名坑点，判断空值应直接用 `value === null`。

#### 1.3 引用类型

对象、数组、函数属于引用类型。变量中保存的是指向实际数据的引用（可以理解为内存地址），赋值与传参传递的是引用的副本：

```js
const list1 = [1, 2];
const list2 = list1;
list2.push(3);
console.log(list1); // [1, 2, 3]：两个变量指向同一个数组

const obj1 = { name: 'a' };
const obj2 = { name: 'a' };
console.log(obj1 === obj2); // false：两个不同对象，引用不同
console.log(list1 === list2); // true：同一个引用
```

与 Web 的关系：接口返回的 JSON 解析后几乎总是对象或数组，理解引用语义才能解释“为什么我改了副本，原数据也变了”。

#### 1.4 如何真正复制一个对象或数组

赋值不会复制数据，需要复制时使用展开语法或专门方法，它们产生的是浅拷贝：

```js
const original = { name: 'a', tags: ['x'] };
const copied = { ...original };
copied.name = 'b';
console.log(original.name); // 'a'：第一层互不影响
copied.tags.push('y');
console.log(original.tags); // ['x', 'y']：嵌套数组仍是共享的
```

常见误解：

> 用展开运算符复制后就彻底独立了。

展开只复制第一层，嵌套的对象或数组仍共享引用。需要完全独立时要做深拷贝，但入门阶段先掌握浅拷贝与共享现象。

#### 1.5 类型判断

```js
typeof 'hello';      // 'string'
typeof 1;            // 'number'
typeof true;         // 'boolean'
typeof undefined;    // 'undefined'
typeof function () {};// 'function'
Array.isArray([]);   // true：数组的可靠判断方式
typeof [];           // 'object'：不能用它区分数组
```

### 2. 解构、展开与现代表达式

#### 2.1 数组与对象解构

解构允许按结构直接取出成员并赋给变量：

```js
const [first, second] = [10, 20];
console.log(first, second); // 10 20

const user = { name: 'Li', age: 20 };
const { name, age } = user;
console.log(name, age); // 'Li' 20

// 解构时重命名与默认值
const { name: userName, city = 'unknown' } = user;
console.log(userName, city); // 'Li' 'unknown'
```

函数参数也可以解构，常见于接收配置对象：

```js
function print({ name, age = 18 }) {
  console.log(`${name} is ${age}`);
}
print({ name: 'Wang' }); // Wang is 18
```

#### 2.2 展开运算符

数组展开用于合并、复制或把数组拆成参数；对象展开用于合并属性，后面的同名属性覆盖前面的：

```js
const a = [1, 2];
const b = [0, ...a, 3];
console.log(b); // [0, 1, 2, 3]

const base = { theme: 'light', size: 14 };
const merged = { ...base, size: 16 };
console.log(merged); // { theme: 'light', size: 16 }
```

常见误解：

> 对象展开会深合并嵌套属性。

同名属性整体被覆盖，不会按字段逐层合并。

#### 2.3 模板字符串

用反引号书写，支持换行和 `${}` 插值：

```js
const name = 'course';
const message = `Hello, ${name}.
Next week starts.`;
```

#### 2.4 可选链

可选链 `?.` 在左侧为 `null` 或 `undefined` 时短路返回 `undefined`，避免层层判空时报错：

```js
const response = { data: { items: [{ id: 1 }] } };
console.log(response.data?.items?.[0]?.id); // 1
console.log(response.error?.message);       // undefined，而不是抛错
console.log(response.format?.());           // 方法不存在时返回 undefined
```

#### 2.5 空值合并与逻辑或的区别

`??` 只在左侧为 `null` 或 `undefined` 时取右侧；`||` 会把所有“假值”（`0`、`''`、`false`）也当作缺省：

```js
const count = 0;
console.log(count ?? 10); // 0：0 不是 null/undefined
console.log(count || 10); // 10：0 被当作假值

const label = '';
console.log(label ?? 'default'); // ''
console.log(label || 'default'); // 'default'
```

与 Web 的关系：接口字段缺失或为空非常常见，`??` 适合给数值、字符串字段兜底，避免把合法的 `0` 或空字符串误替换。

### 3. 函数与 this

#### 3.1 函数的几种写法

```js
// 函数声明：会被提升，可在声明前调用
function add(a, b) {
  return a + b;
}

// 函数表达式
const sub = function (a, b) {
  return a - b;
};

// 箭头函数
const mul = (a, b) => a * b;
```

#### 3.2 默认参数与 rest 参数

```js
function greet(name = 'guest') {
  return `Hi, ${name}`;
}
console.log(greet()); // Hi, guest

function sum(...numbers) {
  return numbers.reduce((total, n) => total + n, 0);
}
console.log(sum(1, 2, 3, 4)); // 10
```

rest 参数 `...numbers` 把剩余实参收集成真正的数组；展开则相反，是把数组拆开。

#### 3.3 this 是什么

`this` 是函数调用时确定的上下文，不取决于函数定义在哪里，而取决于“怎么调用”。入门先掌握四种规则：

```js
const person = {
  name: 'Li',
  say() {
    return this.name;
  },
};

// 1. 作为对象方法调用：this 指向该对象
console.log(person.say()); // 'Li'

// 2. 单独取出调用：普通模式下 this 不是该对象
const say = person.say;
// console.log(say()); // 严格模式下为 undefined，非严格模式下为全局对象

// 3. call/apply/bind 显式指定
function intro(role) {
  return `${this.name} - ${role}`;
}
console.log(intro.call(person, 'dev')); // 'Li - dev'

const bound = intro.bind(person);
console.log(bound('lead')); // 'Li - lead'
```

#### 3.4 箭头函数不绑定自己的 this

箭头函数没有自己的 `this`，它使用外层作用域的 `this`。因此它不适合作为需要指向调用对象的方法，但适合作为回调：

```js
function Timer() {
  this.seconds = 0;
  setInterval(() => {
    this.seconds += 1; // 箭头函数沿用 Timer 的 this
  }, 1000);
}
```

如果把上例换成普通函数，回调里的 `this` 不会指向 Timer 实例——这是回调中最常见的 this 坑。

常见误解：

> 箭头函数里的 this 指向定义它的对象。

箭头函数的 this 来自“定义时所在的外层函数作用域”，与对象字面量无关。对象本身不产生 this 作用域。

### 4. 作用域与闭包

#### 4.1 词法作用域与作用域链

JavaScript 使用词法作用域：变量能否访问，由代码书写的嵌套位置决定。查找变量时从当前作用域沿作用域链向外，直到全局作用域：

```js
const outer = 'global';
function level1() {
  const inner = 'L1';
  function level2() {
    console.log(inner); // 能访问外层的 inner
    console.log(outer); // 继续向外找到 global
  }
  level2();
}
```

#### 4.2 闭包的定义

闭包指函数与其定义时的词法环境的组合：内层函数即使在外层函数执行结束后被调用，仍能记住并访问外层函数的变量。

```js
function createCounter() {
  let count = 0;
  return function () {
    count += 1;
    return count;
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
```

`createCounter` 执行完后，局部变量 `count` 没有被销毁，因为返回的函数仍引用它。两个独立计数器各自拥有独立的 `count`：

```js
const c1 = createCounter();
const c2 = createCounter();
console.log(c1()); // 1
console.log(c1()); // 2
console.log(c2()); // 1：互不干扰
```

#### 4.3 闭包与数据封装

闭包可以制造“只能通过指定方法访问的私有数据”：

```js
function createAccount(initial) {
  let balance = initial;
  return {
    deposit(amount) {
      balance += amount;
      return balance;
    },
    getBalance() {
      return balance;
    },
  };
}

const account = createAccount(100);
account.deposit(50);
console.log(account.getBalance()); // 15
// 外部无法直接读写 balance
```

#### 4.4 经典循环坑

旧代码中在循环里用 `var` 配合异步回调，回调看到的总是循环结束后的同一个值：

```js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// 输出 3 3 3：三个回调共享同一个 i

for (let j = 0; j < 3; j++) {
  setTimeout(() => console.log(j), 0);
}
// 输出 0 1 2：每次迭代有独立的 j
```

#### 4.5 常见误解

> 闭包会“卡住”旧值，所以很危险。

闭包记住的是变量本身，不是取值那一刻的快照（上例 var 共享正是证明）。另外，不再使用的闭包持有的变量无法回收，随意缓存大量数据在闭包中会增加内存占用，但正常使用不必担心。

### 5. 数组、对象常用方法与错误处理

#### 5.1 数组的加工方法

```js
const numbers = [1, 2, 3, 4];

numbers.map((n) => n * 2);          // [2, 4, 6, 8]：逐个变换
numbers.filter((n) => n % 2 === 0); // [2, 4]：筛选
numbers.find((n) => n > 2);         // 3：找第一个匹配项
numbers.some((n) => n > 3);         // true：是否存在
numbers.every((n) => n > 0);        // true：是否全部满足
numbers.reduce((sum, n) => sum + n, 0); // 10：聚合成一个值
numbers.includes(2);                // true
```

需要区分哪些方法会修改原数组：

```js
const arr = [3, 1, 2];
arr.sort();
console.log(arr); // [1, 2, 3]：sort 原地修改

const source = [3, 1, 2];
const sorted = source.toSorted();
console.log(source); // [3, 1, 2]：toSorted 返回新数组，不改原数组
```

`push`、`pop`、`sort`、`reverse`、`splice` 会改原数组；`map`、`filter`、`find`、`toSorted`、`toReversed` 不改原数组。与 Web 的关系：处理列表数据时优先使用不改原数据的方法，能避免界面状态被意外污染。

#### 5.2 对象常用方法

```js
const user = { id: 1, name: 'Li', role: 'dev' };

Object.keys(user);    // ['id', 'name', 'role']
Object.values(user);  // [1, 'Li', 'dev']
Object.entries(user); // [['id', 1], ['name', 'Li'], ['role', 'dev']]

const extended = Object.assign({}, user, { team: 'web' });
console.log(extended); // { id: 1, name: 'Li', role: 'dev', team: 'web' }
```

对象转数组后，就可以用 `map`/`filter` 等数组方法处理。

#### 5.3 抛出与捕获错误

```js
function divide(a, b) {
  if (b === 0) {
    throw new Error('除数不能为 0');
  }
  return a / b;
}

try {
  console.log(divide(10, 0));
} catch (error) {
  console.log('已捕获：', error.message); // 已捕获： 除数不能为 0
} finally {
  console.log('无论是否出错都会执行');
}
```

要点：

- `throw` 可以抛出任意值，但抛出 `Error` 对象能保留调用栈信息；
- 不捕获时，错误沿调用链向上传播，直到被捕获或导致程序失败；
- `finally` 常用于清理，不适合写返回值逻辑。

常见误解：

> 加了 try/catch 程序就不会出错。

catch 只是给了一次处理机会；catch 中什么都不做（吞错）会让问题被隐藏，反而更难排查。捕获后应记录、转换为可读信息或重新抛出。

### 6. 模块系统

#### 6.1 为什么需要模块

把所有代码写在一个文件中会导致命名冲突、依赖不清和无法复用。模块让每个文件拥有独立作用域，通过显式导出和导入建立依赖关系。

#### 6.2 ESM 的命名导出与默认导出

导出方 `math.js`：

```js
export function add(a, b) {
  return a + b;
}

export const PI = 3.14159;

export default function multiply(a, b) {
  return a * b;
}
```

导入方 `main.js`：

```js
import multiply, { add, PI } from './math.js';

console.log(add(1, 2)); // 3
console.log(PI);        // 3.14159
console.log(multiply(2, 3)); // 6
```

规则：

- 一个模块只能有一个默认导出，导入时名字自取，不需要花括号；
- 命名导出必须使用相同名字（可用 `as` 重命名）；
- 相对路径导入需要带文件后缀的规则取决于运行环境；
- ES 模块自动采用严格模式，且是异步加载、在编译期确定依赖。

#### 6.3 CommonJS 点到

Node.js 历史上长期使用 CommonJS（CJS）：

```js
// CJS 写法（旧项目中常见）
const path = require('path');
module.exports = { add };
```

本课程新项目统一使用 ESM。阅读旧项目时能认出 `require` 和 `module.exports` 即可，不要求混用；两种模块系统不能随意互相加载，迁移时需要按工具链规则处理。

常见误解：

> import 和 require 只是写法不同，可以随便替换。

二者加载时机、作用域规则和可静态分析的程度都不同，应由项目配置统一选择。

### 7. 异步模型与事件循环

#### 7.1 为什么需要异步

像定时器、网络请求这类操作需要等待。若等待期间什么都不能做，界面和服务都会被“卡住”。JavaScript 用非阻塞方式处理：先注册回调，等待结果时继续执行其他代码，完成后再回来处理。

#### 7.2 事件循环宏观模型

先记住三个组成部分：

- 调用栈：当前正在执行的同步代码，后进先出；
- 宏任务队列：整段脚本、`setTimeout` 回调、I/O 完成回调等；
- 微任务队列：Promise 的回调（`then`/`catch`/`finally`）、`queueMicrotask` 等。

每一轮的执行规则：

```text
1. 从宏任务队列取一个任务，把其中同步代码压入调用栈执行完
2. 当前宏任务结束后，清空所有微任务（微任务执行中新增的微任务也会在本轮清空）
3. 必要时进行渲染（浏览器环境）
4. 再取下一个宏任务，重复以上过程
```

关键结论：微任务优先级高于下一个宏任务。

```js
console.log('1 同步');

setTimeout(() => {
  console.log('4 定时器');
}, 0);

Promise.resolve().then(() => {
  console.log('3 微任务');
});

console.log('2 同步');

// 输出顺序：1 同步 → 2 同步 → 3 微任务 → 4 定时器
```

常见误解：

> `setTimeout(fn, 0)` 会立刻执行。

它只是把回调放进宏任务队列，至少要等当前同步代码和所有微任务完成后才轮到。

#### 7.3 Promise 的状态

Promise 是异步结果的容器，有三种状态：进行中（pending）、成功（fulfilled）、失败（rejected）。状态一旦确定不可改变。

```js
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('done');
    // reject(new Error('failed')); // 失败路径
  }, 100);
});

promise
  .then((value) => console.log('成功：', value))
  .catch((error) => console.log('失败：', error.message));
```

链式调用中，`.then` 可以返回新值或新 Promise，错误会沿链向下跳过没有处理能力的环节，直到遇到 `catch`。

#### 7.4 async/await

`async` 函数总是返回 Promise；`await` 暂停当前函数，等待 Promise 落定，写法上接近同步代码：

```js
function fetchUser(id) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ id, name: 'Li' }), 100);
  });
}

async function main() {
  const user = await fetchUser(1);
  console.log(user.name); // Li
}

main();
```

`await` 不会阻塞整个线程：暂停的只是这个 async 函数，事件循环仍可处理其他任务。

#### 7.5 并发组合：all 与 race

```js
function request(name, delay) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(`${name} done`), delay)
  );
}

async function demoAll() {
  // 同时发起，全部成功才成功；任一失败立即整体失败（快速失败）
  const results = await Promise.all([
    request('a', 100),
    request('b', 200),
  ]);
  console.log(results); // ['a done', 'b done']（约 200ms 后）
}

async function demoRace() {
  // 谁先落定就用谁的结果（或失败）
  const first = await Promise.race([
    request('fast', 50),
    request('slow', 300),
  ]);
  console.log(first); // 'fast done'
}

demoAll();
demoRace();
```

补充：`Promise.allSettled` 等待所有任务各自落定并给出成功/失败明细，适合“不允许一个失败拖垮全部”的批量场景。

串行与并发的区别必须清楚：在循环中逐个 `await` 是串行；先创建一批 Promise 再 `Promise.all` 才是并发。

#### 7.6 异步错误传播

async/await 中用 `try/catch` 捕获，错误传播规则与同步代码一致：

```js
async function mayFail() {
  throw new Error('network error');
}

async function run() {
  try {
    await mayFail();
  } catch (error) {
    console.log('捕获到：', error.message); // 捕获到： network error
  }
}

run();
```

Promise 链中，没有任何 `catch` 的 rejected Promise 会触发未处理拒绝，Node.js 中可能导致进程退出。因此每条异步链路都应有明确的错误终点。

常见误解：

> 用了 async/await 就不用考虑错误处理。

失败仍然是常态，`await` 一个 rejected Promise 会抛出异常，必须捕获或向上传播。

### 8. TypeScript 基础

#### 8.1 静态类型的价值

TypeScript 在 JavaScript 之上增加了类型系统，在代码运行前（开发期和编译期）检查类型错误：

- 拼错属性名、传错参数个数或类型时立刻报错；
- 编辑器能给出准确的自动补全和跳转；
- 重构时类型检查器会指出所有漏改的调用点；
- 类型本身就是可读的接口文档。

```ts
function greet(name: string): string {
  return `Hi, ${name}`;
}

// greet(123); // 编译报错：参数应为 string
console.log(greet('Li'));
```

核心事实：TypeScript 是开发期工具，编译产出仍是普通 JavaScript，类型信息在运行时被擦除（见 8.10）。

#### 8.2 基础类型

```ts
const title: string = 'course';
const score: number = 95;
const passed: boolean = true;
const tags: string[] = ['js', 'ts'];
const pair: [string, number] = ['age', 20]; // 元组：固定长度与类型
const nothing: null = null;
const missing: undefined = undefined;

// 对象类型直接描述结构
const user: { id: number; name: string } = { id: 1, name: 'Li' };
```

`any` 表示放弃检查，应尽量避免；`unknown` 表示“未知类型”，必须先收窄才能使用，比 `any` 安全。

#### 8.3 interface 与 type

```ts
interface User {
  id: number;
  name: string;
  email?: string; // 可选属性
}

type UserId = number | string;
```

两者都能描述对象形状：

- `interface` 支持声明合并（同名接口自动合并），适合描述可被扩展的对象契约；
- `type` 更灵活，可定义联合、交叉、元组和工具类型；
- 团队可统一偏好，重点是命名表达业务含义，例如用 `User` 而不是 `Data`。

#### 8.4 函数类型

```ts
type BinaryOperation = (a: number, b: number) => number;

const add: BinaryOperation = (a, b) => a + b;

function createUser(name: string, age: number = 18): User {
  return { id: Date.now(), name, age };
}
```

要点：参数类型必须声明或可被推断；返回类型可显式写，导出的公共函数建议显式声明，让非法调用在编译期暴露。

#### 8.5 联合类型、交叉类型与收窄

联合类型表示“多种可能之一”，使用前要收窄：

```ts
type Id = number | string;

function format(id: Id): string {
  if (typeof id === 'number') {
    return id.toFixed(0); // 此分支中 id 被收窄为 number
  }
  return id.toUpperCase(); // 此分支中为 string
}
```

交叉类型表示“同时满足多个形状”：

```ts
type WithTimestamp = { createdAt: string; updatedAt: string };
type Post = { title: string } & WithTimestamp;

const post: Post = {
  title: 'hello',
  createdAt: '2026-10-01',
  updatedAt: '2026-10-02',
};
```

常用收窄手段：`typeof`、`Array.isArray`、属性存在判断（`in`）、真值判断，以及可辨识联合：

```ts
type LoadState =
  | { status: 'loading' }
  | { status: 'success'; data: string[] }
  | { status: 'error'; message: string };

function render(state: LoadState): string {
  switch (state.status) {
    case 'loading':
      return '加载中';
    case 'success':
      return state.data.join(','); // 已收窄，可访问 data
    case 'error':
      return state.message;
  }
}
```

用可辨识联合描述互斥状态，能避免“loading 和 error 同时为真”这类非法组合。

#### 8.6 可选属性与只读

```ts
interface Options {
  readonly id: number; // 只读：初始化后不可重新赋值
  label: string;
  hint?: string;       // 可选：可能为 undefined
}

const options: Options = { id: 1, label: 'save' };
// options.id = 2; // 报错：只读属性不能赋值
```

`readonly` 与 `const` 类似，只约束该绑定/属性；若是只读对象的嵌套字段，仍可能被修改。

#### 8.7 泛型基础

泛型用于表达“类型之间的关系”，让同一份逻辑适用于多种类型而不丢失类型信息：

```ts
function identity<T>(value: T): T {
  return value;
}

const n = identity<number>(1); // 类型为 number
const s = identity('hello');   // 可由参数推断，类型为 string

interface ApiResponse<T> {
  code: number;
  data: T;
}

const userResponse: ApiResponse<User> = {
  code: 0,
  data: { id: 1, name: 'Li' },
};
```

泛型可以加约束，表示“T 必须满足某些条件”：

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}
// getProperty({ a: 1 }, 'b'); // 报错：'b' 不是该对象的键
```

原则：能用具体类型就不用泛型；泛型为复用而写，不做难以维护的类型体操。

#### 8.8 常用工具类型（点到为止）

```ts
interface Task {
  id: number;
  title: string;
  done: boolean;
}

type PartialTask = Partial<Task>;     // 所有属性变可选
type ReadonlyTask = Readonly<Task>;   // 所有属性变只读
type TaskPreview = Pick<Task, 'title' | 'done'>; // 只取部分字段
type WithoutId = Omit<Task, 'id'>;    // 去掉某些字段
type TaskMap = Record<string, Task>;  // 键为 string、值为 Task 的映射
```

入门阶段先会读、会用 `Partial`、`Pick`、`Omit`、`Record` 即可，不必记忆全部工具类型。

#### 8.9 tsconfig 与严格模式

`tsc --init` 可生成配置文件。新项目的关键基线：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true
  }
}
```

`"strict": true` 会同时打开一组严格检查，其中最基础的两项：

- `noImplicitAny`：不允许参数类型被隐式推断为 `any`；
- `strictNullChecks`：`null` 和 `undefined` 不能赋给其他类型，使用前必须处理。

做纯类型检查（不产出文件）：

```bash
npx tsc --noEmit
```

预期结果：没有类型错误时无输出，退出码为 `0`；存在类型错误时打印文件、行号与原因，退出码非 `0`。不应为了让命令通过而关闭严格模式。

#### 8.10 类型与运行时的边界

类型只在编译期存在，编译后全部擦除。因此：

```ts
interface User {
  id: number;
  name: string;
}

// 下面这行编译后不存在，运行时无法用 instanceof User 之类的方式判断
function handle(input: unknown) {
  // 外部数据运行时可能不符合 User，必须手工验证
  if (typeof input === 'object' && input !== null && 'name' in input) {
    console.log((input as User).name);
  } else {
    throw new Error('数据格式不正确');
  }
}
```

外部输入（接口响应、本地存储、第三方 SDK、文件内容）在运行时不遵守 TypeScript 类型。正确做法是先以 `unknown` 接收，再用类型守卫或 schema 校验，验证通过后再当作目标类型使用。

常见误解：

> 写了接口类型，接口返回的数据就一定符合。

类型只是“开发者的声明”，不会改变或验证真实数据。静态类型约束代码，运行时校验保护边界，两者缺一不可。

## 课后题

1. `var`、`let`、`const` 在作用域、提升和重新赋值上分别有什么差异？为什么现代代码默认使用 `const`？
2. 原始类型和引用类型在赋值、比较、传参时表现有何不同？请解释为什么两个内容相同的对象 `===` 比较结果为 `false`。
3. `??` 与 `||` 有什么区别？在给可能为 `0` 的数量字段兜底时，应该用哪个？为什么？
4. 请说明 `this` 的四种判定规则。为什么箭头函数适合作为异步回调，却不适合作为需要访问对象属性的方法？
5. 什么是闭包？请用自己的话解释 `createCounter` 例子中 `count` 为什么在函数返回后仍然存活。
6. 列举至少五个数组方法，并区分哪些会修改原数组。`sort` 与 `toSorted` 的关键区别是什么？
7. 场景分析：你接手一个旧项目，其中既有 `require`/`module.exports`，又有新增的 `import`/`export`，运行时出现模块加载错误。请先说明 ESM 命名导出与默认导出在语法和导入方式上的不同，再分析 ESM 与 CommonJS 为什么不能随意混用、应按什么思路统一。
8. 场景分析：请写出下面代码的输出顺序，并逐行用“调用栈、宏任务、微任务”解释原因：

```js
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
console.log('D');
```

9. 场景分析：下面的异步函数为什么可能得不到预期结果？请分别指出“串行/并发”和“错误处理”两个问题并改正：循环中依次 `await request(list[i])`，且没有任何 `try/catch`，其中第三个请求失败后整批中断且没有错误提示。
10. 场景分析：你给接口响应标注了 `User` 类型，但运行时服务端返回的字段名从 `name` 变成了 `nickname`。TypeScript 能在运行前发现吗？为什么？正确的边界处理方式是什么？

## 实践练习题

### 练习 1：现代 JavaScript 基础编程

#### 任务

编写一个纯 Node.js 脚本 `data-lab.js`，对给定的订单数据完成统计与整理，全程使用现代语法，不借助任何第三方包。

示例输入：

```js
const orders = [
  { id: 1, user: 'Li', amount: 120, status: 'paid' },
  { id: 2, user: 'Wang', amount: 80, status: 'pending' },
  { id: 3, user: 'Li', amount: 45, status: 'paid' },
];
```

#### 步骤约束

1. 使用 `const`/`let` 声明，不使用 `var`。
2. 使用解构取出字段，使用 `filter`、`map`、`reduce` 完成筛选与汇总。
3. 使用可选链与 `??` 处理可能缺失的字段（可自行构造一个缺字段的数据验证）。
4. 编写函数处理“金额为空时视为 0”，并说明为什么用 `??` 而不是 `||`。
5. 用 `try/catch` 包裹“状态非法”的场景，抛出并捕获带说明的 `Error`。
6. 运行 `node data-lab.js`，确认输出与预期一致。

#### 提交物

- `data-lab.js`；
- 运行命令与完整输出；
- 一份“使用到的语法点”清单，每个语法点配一行说明；
- 100 至 200 字小结。

#### 验收标准

- 统计结果正确，且能解释每步使用的数组方法是否修改原数据；
- 至少使用解构、展开或可选链、`??`、箭头函数、`try/catch` 五类语法；
- 金额为 `0` 的边界处理正确；
- 代码可直接运行，无语法错误。

### 练习 2：模块拆分与异步流程观察

#### 任务

把练习 1 的代码拆分为多个 ESM 模块，并新增一个异步模拟模块，用事件循环的规则验证执行顺序与错误传播。

#### 步骤约束

1. 拆出至少三个文件：工具函数模块、数据模块、入口模块，使用命名导出与一个默认导出。
2. 编写模拟异步函数，用 `setTimeout` 返回 Promise。
3. 使用 `Promise.all` 并发执行三个耗时不同的任务并记录总耗时，再用串行写法对比。
4. 编写一个故意失败的异步任务，分别用 `Promise` 链的 `catch` 和 `async/await` 的 `try/catch` 各处理一次。
5. 在代码中按 7.2 的模型穿插同步、`setTimeout`、Promise 回调，先在注释中预测输出顺序，再运行核对。
6. 在 `package.json` 中声明 ESM（`"type": "module"`），保证 `node` 直接运行。

#### 提交物

- 模块化后的目录及全部 `.js` 文件；
- 并发与串行的耗时记录；
- 预测顺序与实际输出对照；
- 两次错误处理的代码与输出；
- 200 字以内总结。

#### 验收标准

- 模块边界清晰，导入导出正确，无循环依赖；
- 能正确预测并解释微任务先于下一个宏任务；
- 并发总耗时明显短于串行，且能说明原因；
- 每条异步链路都有错误终点，无未处理拒绝。

### 练习 3：TypeScript 类型建模与严格检查

#### 任务

将练习 2 的项目改造为 TypeScript 版本，在严格模式下完成数据模型、函数类型、可辨识联合状态与基础泛型的编写。

#### 步骤约束

1. 增加 `tsconfig.json`，开启 `strict` 与 `noUncheckedIndexedAccess`。
2. 使用 `interface` 或 `type` 定义订单、订单状态与统一响应结构。
3. 使用联合类型描述加载状态（loading/success/error），并写函数通过 `switch` 收窄。
4. 编写一个泛型函数（如包装统一响应或恒等取值），说明类型参数表达的关系。
5. 至少使用两个工具类型（如 `Partial`、`Pick`、`Omit`、`Record`）。
6. 对一个 `unknown` 输入编写类型守卫，验证通过后再使用。
7. 运行 `npx tsc --noEmit`，修复全部类型错误，不通过关闭检查来“解决”。

#### 提交物

- TypeScript 源码与 `tsconfig.json`；
- 类型检查命令及退出码记录；
- 故意制造一个类型错误的前后对比记录；
- 300 字以内类型设计说明，解释“类型在运行时不存在”。

#### 验收标准

- `tsc --noEmit` 无错误、退出码为 `0`；
- 可辨识联合中不存在非法状态组合，`switch` 收窄正确；
- 泛型与工具类型使用合理、命名清晰；
- `unknown` 输入在运行时验证后才使用，没有用 `any` 绕过。

## 阶段验收作业

### 作业名称

JavaScript/TypeScript 语言基础综合实验：订单统计工具

### 作业场景

团队需要一个不依赖任何框架和外部服务的命令行小工具，用来对订单数据做校验、统计和异步模拟加载。要求先用现代 JavaScript 完成逻辑并模块化，再用 TypeScript 为其建立严格类型，证明你同时掌握“语言怎么运行”和“类型怎么约束”两件事。

### 提交物清单

```text
lang-lab/
├── package.json
├── tsconfig.json
├── src/
│   ├── types.ts
│   ├── orders.ts
│   ├── stats.ts
│   ├── async-tasks.ts
│   └── main.ts
├── evidence/
│   ├── event-loop-order.md
│   ├── async-comparison.md
│   └── tsc-report.md
└── README.md
```

要求：

- 业务逻辑使用 TypeScript 编写并通过严格检查；运行方式可为先编译再用 Node.js 执行，或按课程约定使用教学 TS 运行器。
- `evidence` 中记录事件循环顺序实验、并发与串行对比、类型检查结果，所有结论附实际输出。
- README 写明环境要求、安装与运行步骤、如何执行类型检查、各模块职责。

### 演示步骤

学员需在 15 至 20 分钟内完成：

1. 用自己的语言讲清变量、原始/引用类型与一个“复制后仍共享嵌套数据”的例子。
2. 运行统计逻辑，指出使用的数组方法哪些会修改原数组。
3. 展示模块拆分，说明命名导出与默认导出、ESM 与 CommonJS 的区别。
4. 现场预测并运行一段含同步、`setTimeout`、Promise 的代码，解释输出顺序。
5. 展示 `Promise.all` 并发与串行对比，以及失败任务的捕获过程。
6. 运行 `npx tsc --noEmit`，讲解一处可辨识联合收窄和一处泛型，并演示对 `unknown` 输入的运行时校验。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| JavaScript 基础语法 | 20 | 变量声明、类型、解构、可选链、空值合并等使用正确 |
| 函数、作用域与闭包 | 15 | 函数写法、默认/rest 参数、this 规则与闭包解释正确 |
| 数据处理与错误处理 | 15 | 数组/对象方法选择合理，错误能抛出、捕获且不被吞掉 |
| 模块与异步 | 25 | ESM 拆分清晰；事件循环模型、Promise、并发组合与错误传播正确 |
| TypeScript 类型 | 15 | 类型建模、收窄、泛型、工具类型与严格检查通过 |
| 规范与可复现性 | 10 | 结构清晰、证据完整、README 可指导复现、无占位表述 |

细分规则：

- JavaScript 基础语法：声明与类型 7 分；解构/展开 6 分；可选链与 `??` 7 分。
- 函数、作用域与闭包：函数特性 5 分；this 5 分；闭包 5 分。
- 数据处理与错误处理：数组/对象方法 8 分；try/catch/throw 7 分。
- 模块与异步：ESM 6 分；事件循环顺序 7 分；Promise 与 all/race 7 分；异步错误传播 5 分。
- TypeScript：基础类型与 interface/type 5 分；联合收窄 4 分；泛型与工具类型 3 分；严格检查与运行时边界 3 分。
- 规范与可复现性：证据记录 5 分；README 5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过，修正后重新验收：

1. 新代码中仍使用 `var`，或无法解释 `let/const` 的块级作用域与暂时性死区。
2. 混淆原始值与引用，认为对象赋值就是复制。
3. 无法判断函数中 `this` 的指向，或认为箭头函数的 this 指向“定义它的对象”。
4. 无法解释闭包，或把闭包记住的变量误认为取值时的快照。
5. 无法预测“同步 → 微任务 → 宏任务”的基本顺序，或认为 `setTimeout(fn, 0)` 立即执行。
6. Promise 链路没有任何错误处理，或用 `any` 大量绕过类型检查。
7. `npx tsc --noEmit` 报错却通过关闭严格模式或删除类型来“通过”。
8. 认为 TypeScript 类型能在运行时验证外部数据，未做任何运行时校验。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 正确声明变量并区分原始与引用类型 | 现场第 1 步、`src/stats.ts` |
| 使用现代语法简化表达式 | 现场第 1 步、源码中的解构/可选链/`??` |
| 掌握函数、this 与闭包 | 现场问答、`src/stats.ts` 中的闭包工具 |
| 用数组/对象方法加工数据并处理错误 | 现场第 2 步、运行输出与错误处理代码 |
| 按 ESM 拆分模块 | `src/` 目录结构、现场第 3 步 |
| 掌握事件循环与异步组合 | `event-loop-order.md`、`async-comparison.md`、现场第 4、5 步 |
| 使用 TypeScript 严格类型 | `tsconfig.json`、`tsc-report.md`、现场第 6 步 |
| 理解类型与运行时边界 | `unknown` 类型守卫、现场第 6 步演示 |

### 提交前自检

- [ ] 七项学习目标均有对应证据。
- [ ] 全部业务代码使用 `let/const`，无 `var`，无 `any` 滥用。
- [ ] 至少演示一次浅拷贝共享嵌套数据的现象。
- [ ] 每个异步函数的错误都能传播到明确的捕获点。
- [ ] 事件循环顺序实验先预测、后运行，且二者一致。
- [ ] `npx tsc --noEmit` 退出码为 `0`，严格模式保持开启。
- [ ] 外部输入以 `unknown` 接收并在运行时验证。
- [ ] README 可指导另一名学员从零复现，且不含禁用占位表述。
