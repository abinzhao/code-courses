# 03 JavaScript this 绑定与 call/apply/bind

## 学习目标

- 掌握 `this` 的 4 种绑定规则及其优先级
- 理解箭头函数 `this` 的词法继承机制
- 搞懂 `call` / `apply` / `bind` 的区别与使用场景
- 能识别常见的 `this` 丢失场景并解决
- 能手写 `bind` polyfill

---

## 内容讲解

### 1. this 的 4 种绑定规则

#### 1.1 默认绑定（Default Binding）

独立函数调用时，`this` 指向全局对象（严格模式下为 `undefined`）。

```js
// 非严格模式
function sayThis() {
  console.log(this);
}
sayThis(); // 浏览器：window / Node.js：global

// 严格模式
function sayThisStrict() {
  'use strict';
  console.log(this);
}
sayThisStrict(); // undefined

// 即使嵌套调用，只要调用方式还是"裸调"就仍然是默认绑定
const obj = {
  fn() {
    function inner() {
      console.log(this); // 这里 this 是谁？
    }
    inner(); // 默认绑定！不是 obj
  }
};
obj.fn(); // 浏览器打印 window（严格模式 undefined）
```

> **避坑提示**：新手常见误区——以为嵌套在对象方法里的函数，`this` 就是外层的对象。`this` 只看调用方式，不看定义位置。

#### 1.2 隐式绑定（Implicit Binding）

通过对象调用方法时，`this` 指向该对象。

```js
const user = {
  name: 'Alice',
  greet() {
    console.log(`你好，我是 ${this.name}`);
  }
};

user.greet(); // '你好，我是 Alice' —— this → user

// 链式调用：this 指向最近的对象
const a = {
  b: {
    name: 'Bob',
    greet() { console.log(this.name); }
  }
};
a.b.greet(); // 'Bob' —— this → a.b
```

**隐式丢失——最常见的 this 陷阱：**

```js
const user = {
  name: 'Alice',
  greet() { console.log(this.name); }
};

// 场景1：赋值后调用
const fn = user.greet;
fn(); // undefined（或报错）—— 现在 fn 是独立调用，触发默认绑定

// 场景2：回调中
setTimeout(user.greet, 100); // undefined（或报错）—— 同上

// 场景3：事件处理器
button.addEventListener('click', user.greet); // DOM 中 this → button
```

> **避坑提示**：只要方法从对象上"摘下来"再调用，隐式绑定就丢了。解决方案看第 3 节。

#### 1.3 显式绑定（Explicit Binding）

用 `call`、`apply`、`bind` 显式指定 `this`。

```js
function greet(greeting, punctuation) {
  console.log(`${greeting}, 我是 ${this.name}${punctuation}`);
}

const alice = { name: 'Alice' };
const bob = { name: 'Bob' };

// call：逐个传参
greet.call(alice, '你好', '!');  // '你好, 我是 Alice!'

// apply：数组传参
greet.apply(bob, ['早上好', '~']); // '早上好, 我是 Bob~'

// bind：返回绑定后的新函数，不立即执行
const greetAlice = greet.bind(alice, '晚上好');
greetAlice('?');                  // '晚上好, 我是 Alice?'
// bind 还可以"预填"参数（部分应用/柯里化）
```

#### 1.4 new 绑定（Constructor Binding）

用 `new` 调用函数时，`this` 指向新创建的对象。

```js
function Person(name) {
  // new 调用时：
  // 1. 创建一个全新的空对象
  // 2. 这个对象的 __proto__ 指向 Person.prototype
  // 3. this 绑定到这个新对象
  // 4. 执行函数体
  // 5. 如果函数没有返回对象，自动返回这个新对象
  this.name = name;
}

const p = new Person('Alice');
console.log(p.name); // 'Alice'
```

---

### 2. 绑定规则优先级

| 优先级 | 规则 | 说明 |
|--------|------|------|
| 最高 | `new` 绑定 | `new` 创建一个新对象作为 `this` |
| ↓ | 显式绑定 | `call` / `apply` / `bind` 指定 `this` |
| ↓ | 隐式绑定 | 通过对象调用，`this` 指向该对象 |
| 最低 | 默认绑定 | 独立调用，非严格模式为全局对象，严格模式为 `undefined` |

```js
// 验证：显式绑定 vs 隐式绑定 → 显式更高
const obj = { fn() { console.log(this); } };
obj.fn.call({ x: 1 }); // { x: 1 } —— 显式覆盖隐式

// 验证：new vs 显式绑定 → new 更高
function Foo() { console.log(this instanceof Foo); }
const boundFoo = Foo.bind({ x: 1 });
new boundFoo(); // true —— new 忽略 bind 的 this
```

---

### 3. 箭头函数的 this

箭头函数**没有自己的 `this`**，它在定义时捕获外层作用域的 `this`（词法 `this`）。

```js
// 对比
const obj = {
  name: 'Alice',

  regularFn() {
    // 普通函数：this 看调用方式
    setTimeout(function() {
      console.log('regular:', this.name); // undefined
    }, 100);
  },

  arrowFn() {
    // 箭头函数：this 继承自外层（arrowFn 的 this）
    setTimeout(() => {
      console.log('arrow:', this.name); // 'Alice'
    }, 100);
  }
};

obj.regularFn(); // undefined（回调中的 function 是默认绑定）
obj.arrowFn();   // 'Alice'（箭头函数捕获了 arrowFn 的 this，即 obj）
```

> **避坑提示**：箭头函数让 `this` 行为更直觉，但它不是万能的——对象方法不要用箭头函数。

---

### 4. call、apply、bind 的区别和手写实现

#### 4.1 区别速查

| 方法 | 是否立即执行 | 参数形式 | 返回值 |
|------|-------------|----------|--------|
| `call` | 是 | 逐个传参 | 函数执行结果 |
| `apply` | 是 | 数组传参 | 函数执行结果 |
| `bind` | 否 | 逐个传参（可分批） | 新函数 |

```js
// apply 的经典用法：Math.max 接收多个参数
const nums = [1, 5, 3, 9, 2];
Math.max.apply(null, nums); // 9
// 现代替代
Math.max(...nums);           // 9
```

#### 4.2 手写 call

```js
// call 的核心原理：把函数临时挂到目标对象上执行
Function.prototype.myCall = function(context, ...args) {
  // 处理 null/undefined
  context = context ?? globalThis; // globalThis 统一了 window / global / self

  // 用 Symbol 避免属性名冲突
  const key = Symbol('fn');
  context[key] = this; // this 就是调用 myCall 的函数

  const result = context[key](...args);
  delete context[key];  // 清理临时属性
  return result;
};

// 测试
function greet(greeting) {
  return `${greeting}, ${this.name}`;
}
const user = { name: 'Alice' };
console.log(greet.myCall(user, '你好')); // '你好, Alice'
```

#### 4.3 手写 apply

```js
Function.prototype.myApply = function(context, args) {
  context = context ?? globalThis;

  // 如果没传 args 或传了非数组，按空数组处理
  if (!Array.isArray(args)) args = [];

  const key = Symbol('fn');
  context[key] = this;

  const result = context[key](...args);
  delete context[key];
  return result;
};
```

#### 4.4 手写 bind（重点！）

```js
Function.prototype.myBind = function(context, ...boundArgs) {
  const originalFn = this; // 保存原函数

  // 返回的新函数
  function boundFn(...callArgs) {
    // 关键：判断是否用 new 调用
    // 如果是 new 调用，this 应该是新创建的对象，忽略传入的 context
    const actualThis = this instanceof boundFn ? this : context;

    return originalFn.apply(actualThis, [...boundArgs, ...callArgs]);
  }

  // 维护原型链，让 new boundFn() 能访问 originalFn.prototype
  boundFn.prototype = Object.create(originalFn.prototype);
  boundFn.prototype.constructor = boundFn;

  return boundFn;
};

// 测试
function Person(name, age) {
  this.name = name;
  this.age = age;
}

const BoundPerson = Person.myBind(null, '默认名');
const p = new BoundPerson(25);
console.log(p.name, p.age); // '默认名' 25
```

---

### 5. this 丢失的常见场景和解决方案

#### 5.1 回调函数

```js
class Counter {
  constructor() {
    this.count = 0;
  }

  increment() {
    this.count++;
    console.log(this.count);
  }

  start() {
    // ❌ 错误：回调中 this 丢失
    // setInterval(this.increment, 1000);

    // ✅ 方案1：bind
    // setInterval(this.increment.bind(this), 1000);

    // ✅ 方案2：箭头函数
    // setInterval(() => this.increment(), 1000);
  }
}
```

#### 5.2 setTimeout

```js
const user = {
  name: 'Alice',
  delayedGreet() {
    // ❌ this 丢失
    // setTimeout(function() { console.log(this.name); }, 1000);

    // ✅ 方案1：箭头函数
    setTimeout(() => console.log(this.name), 1000);

    // ✅ 方案2：bind
    // setTimeout(function() { console.log(this.name); }.bind(this), 1000);
  }
};
```

#### 5.3 React 类组件（历史模式）

```js
// React 类组件中的 this 绑定历史问题
class Button extends React.Component {
  constructor() {
    super();
    this.state = { count: 0 };
    // ✅ 构造函数中 bind
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    this.setState({ count: this.state.count + 1 });
  }

  render() {
    // ❌ onClick={this.handleClick} 会导致 this 丢失
    return <button onClick={this.handleClick}>点击</button>;
  }
}

// 现代 React：函数组件 + Hooks，不存在 this 问题
```

---

## 常见问题

### Q1：箭头函数可以用 `call`/`apply` 修改 `this` 吗？

不可以。箭头函数的 `this` 在定义时就已锁定为外层作用域的 `this`，无法被 `call`/`apply`/`bind` 覆盖：

```js
const arrow = () => console.log(this);
arrow.call({ x: 1 }); // 仍然是定义时的 this，{ x: 1 } 被忽略
```

### Q2：`this` 等于 `undefined` 是怎么回事？

你很可能运行在严格模式下。非严格模式的独立调用会指向全局对象，而严格模式是 `undefined`。ES6 模块和 `class` 内部默认严格模式。

### Q3：`bind` 的 `this` 能被 `new` 覆盖吗？

能。`new` 优先级最高。如果对 `bind` 返回的函数使用 `new`，`this` 指向新创建的对象，而不是 `bind` 时传入的对象。上面手写 `bind` 中 `this instanceof boundFn` 这行就是处理这个的。

### Q4：为什么 `const fn = obj.method; fn();` 的 `this` 丢了？

因为 JavaScript 中函数的 `this` 取决于**调用方式**，而不是**赋值来源**。`fn()` 是独立调用，触发默认绑定，`this` 不再指向 `obj`。

### Q5：DOM 事件中 `this` 指向什么？

行内事件处理器中，`this` 指向绑定的 DOM 元素：

```js
button.addEventListener('click', function() {
  console.log(this); // → button 元素
});
// 但箭头函数没有自己的 this
button.addEventListener('click', () => {
  console.log(this); // → 外层作用域的 this
});
```

### Q6：`new` 绑定的 5 个步骤具体做了什么？

1. 创建一个全新的空对象
2. 将对象的 `[[Prototype]]` 指向构造函数的 `prototype`
3. 将这个新对象绑定为 `this`
4. 执行构造函数代码（为新对象添加属性）
5. 如果构造函数显式返回了一个对象，则返回该对象；否则返回新创建的对象

### Q7：`call` vs `apply` 性能有差异吗？

微乎其微。`call` 略快于 `apply`（因为不需要解包数组），但差异在实际项目中可忽略。优先选择语义更清晰的那一个。

### Q8：为什么 `this` 不在作用域链上？

`this` 不是变量，它是每个函数调用时的隐式参数。它的绑定规则完全独立于作用域链，不由词法位置决定（箭头函数除外）。

---

## 实操作业

### 🟢 基础：判断 this

不用运行代码，写出以下 `console.log` 的输出结果和原因：

```js
const obj1 = {
  name: 'obj1',
  fn() { console.log(this.name); }
};

const obj2 = { name: 'obj2', fn: obj1.fn };

obj1.fn();
obj2.fn();
const fn3 = obj1.fn;
fn3();
```

### 🟡 进阶：实现 logPerson 函数

```js
// 有两个对象，实现 logPerson 函数打印每个人的信息
const alice = { name: 'Alice', age: 25 };
const bob = { name: 'Bob', age: 30 };

function logPerson() {
  console.log(`${this.name} 今年 ${this.age} 岁`);
}

// 要求：分别用 call、apply、bind 调用 logPerson，
// 让 this 分别指向 alice 和 bob，并打印正确信息
```

### 🔴 挑战：实现 debounce 和 throttle（含 this 保持）

```js
// 完善以下 debounce 和 throttle，确保回调函数中的 this 和参数正确传递
// 提示：需要用到剩余参数和 apply/call

function debounce(fn, delay) {
  // 你的代码
}

function throttle(fn, interval) {
  // 你的代码
}

// 测试：模拟一个数据上报场景，需要保持正确的调用者上下文
const tracker = {
  count: 0,
  send(data) {
    this.count++;
    console.log(`第 ${this.count} 次上报:`, data);
  }
};

const debouncedSend = debounce(tracker.send, 200);
// 连续调用 5 次，最后只应执行 1 次
debouncedSend.call(tracker, '事件A');
debouncedSend.call(tracker, '事件B');
debouncedSend.call(tracker, '事件C');
```

---

## 本节小结

- **4 种绑定规则**：默认（全局/undefined）→ 隐式（对象调用）→ 显式（call/apply/bind）→ new
- **优先级**：new > 显式 > 隐式 > 默认
- **箭头函数**：没有自己的 `this`，继承定义时的外层 `this`，无法被修改
- **call vs apply vs bind**：call/apply 立即执行，bind 返回新函数；call 逐个传参，apply 数组传参
- **this 丢失**：函数从对象"摘下来"就丢绑定 → 用箭头函数或 bind 解决
- **手写 bind**：核心理念是返回一个用 `apply` 桥接的新函数，同时处理 `new` 场景和原型链

下一步：[04 原型链与继承](./04-原型链与继承.md)