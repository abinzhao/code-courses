# 原型链、`this` 与类的适用边界

## 任务卡

- **本课产出**：`js-lab/prototype/prototype.mjs`，一份可运行的属性查找、方法调用与类封装实验。
- **运行环境**：Node.js 24 LTS；使用 `.mjs` 明确启用 ECMAScript 模块严格模式。
- **预计时间**：70 分钟。
- **完成证据**：能预测 8 行输出，能解释脱离对象的方法为什么失败，并能说明商品记录为什么不必转换成类实例。

## 1. 任务背景

邻里集市的商品是普通数据记录，却能调用某些对象方法；多个计数器又需要共享方法、各自保存状态。要正确选择普通记录、函数或类，必须先理解 JavaScript 的属性查找与调用规则，而不是把 `class` 当成数据校验器。

本课只讨论内存对象。实例身份不能证明接口数据有效，也不能代替服务端持久化、身份认证或对象授权。

## 2. 学习目标

完成本课后，你能够：

1. 区分自有属性、继承属性、原型和原型链；
2. 解释方法共享、属性遮蔽以及 `Object.hasOwn` 的用途；
3. 根据调用形式判断普通函数中的 `this`；
4. 使用 `bind` 或显式参数修复脱离对象的方法；
5. 解释类、构造器、私有字段和 `instanceof` 的能力边界；
6. 在普通记录、纯函数和有状态类之间做出有依据的选择。

## 3. 预备知识

你需要会创建对象和函数，理解引用相等、块级作用域与异常。先确认：

```bash
node --version
```

应显示 `v24.x.x`。在任意练习目录创建 `js-lab/prototype/`，后续命令从 `js-lab` 运行。

## 4. 核心理论

### 4.1 属性查找沿原型链进行

读取 `listing.describe` 时，运行时先检查 `listing` 自身；没有则读取 `Object.getPrototypeOf(listing)`，再继续向上，直到找到属性或遇到 `null`。原型是被关联的对象，不是复制到每个实例中的属性包。

对象自己的同名属性会遮蔽原型属性。删除遮蔽属性后，查找又能到达原型。不要修改 `Array.prototype` 等内置原型：影响范围跨越整个运行环境，冲突也很难定位。

### 4.2 `this` 由调用形式决定

普通函数中的 `this` 主要取决于“怎样调用”：

- `listing.describe()`：`this` 是点号左侧的 `listing`；
- `const fn = listing.describe; fn()`：方法已脱离接收者；ESM 严格模式下 `this` 是 `undefined`；
- `fn.call(listing)`：本次调用显式指定接收者；
- `fn.bind(listing)`：创建永久绑定接收者的新函数。

箭头函数不创建自己的 `this`，它捕获定义位置外层的绑定。它适合作为不需要动态接收者的回调，不适合作为依赖调用对象的原型方法。

### 4.3 类仍建立在原型机制上

`class` 提供构造器、方法、继承和私有字段语法。用 `new Counter()` 创建实例时，实例保存自己的字段，普通方法位于 `Counter.prototype` 上供实例共享。

类不会自动校验 `JSON.parse` 的结果。`instanceof Counter` 只说明原型关系，不说明金额是非负安全整数，也不说明对象来自可信服务。

### 4.4 选择最小模型

- 外部 API DTO 和商品快照：优先普通记录；
- 无需保留状态的计算：优先显式参数的纯函数；
- 独立实例确实拥有长寿命状态和配套行为：类可以减少状态泄漏。

不要因为两个记录都有 `title` 就建立继承层次，也不要把保存数据库的能力塞进商品对象。

## 5. 元素、属性、API 或配置清单

| 语法或 API | 作用 | 边界 |
| --- | --- | --- |
| `Object.create(proto)` | 创建指定原型的对象 | 不做字段校验 |
| `Object.getPrototypeOf(value)` | 读取直接原型 | 不应用来推断业务权限 |
| `Object.hasOwn(value, key)` | 判断自有属性 | 比调用可能被遮蔽的 `hasOwnProperty` 稳定 |
| `delete object.key` | 删除自有属性 | 不会删除原型上的同名属性 |
| `fn.call(receiver)` | 为一次调用指定 `this` | 参数从第二项开始传入 |
| `fn.bind(receiver)` | 返回绑定后的新函数 | 不修改原函数 |
| `class` / `constructor` / `new` | 组织实例创建 | 仍使用原型方法 |
| `#field` | 类内部私有字段 | 不是接口加密或服务端隐私 |
| `instanceof` | 检查构造器原型是否在链上 | 不能验证 DTO 字段 |

## 6. 最小可运行案例

创建完整文件 `js-lab/prototype/prototype.mjs`：

```js
const listingMethods = {
  describe() {
    return `${this.title}: ${this.priceCents}`;
  },
};

const lamp = Object.create(listingMethods);
lamp.id = "listing-1";
lamp.title = "台灯";
lamp.priceCents = 1990;

console.log(lamp.describe());
console.log(Object.hasOwn(lamp, "title"));
console.log(Object.hasOwn(lamp, "describe"));
console.log(Object.getPrototypeOf(lamp) === listingMethods);

lamp.describe = () => "本地遮蔽";
console.log(lamp.describe());
delete lamp.describe;
console.log(lamp.describe());

const detached = lamp.describe;
try {
  detached();
} catch (error) {
  console.log(error instanceof Error ? error.name : "unknown");
}
console.log(detached.call(lamp));
```

运行：

```bash
node prototype/prototype.mjs
```

预期依次输出：

```text
台灯: 1990
true
false
true
本地遮蔽
台灯: 1990
TypeError
台灯: 1990
```

渐进观察：

1. 先注释遮蔽与删除代码，只观察自有属性和继承方法；
2. 加回遮蔽，确认原型方法没有被修改；
3. 最后加入脱离调用和 `call`，比较接收者差异。

## 7. 邻里集市集成案例

商品继续采用普通记录；只有本地请求序号需要独立状态。把以下代码追加到同一文件：

```js
function formatListing(listing) {
  if (!Number.isSafeInteger(listing.priceCents) || listing.priceCents < 0) {
    throw new RangeError("invalid listing price");
  }
  const yuan = `${Math.floor(listing.priceCents / 100)}.${String(
    listing.priceCents % 100,
  ).padStart(2, "0")}`;
  return `${listing.title} ¥${yuan}`;
}

class RequestSequence {
  #value = 0;

  constructor(prefix) {
    this.prefix = prefix;
  }

  next() {
    this.#value += 1;
    return `${this.prefix}-${this.#value}`;
  }
}

const firstPage = new RequestSequence("catalog");
const secondPage = new RequestSequence("catalog");
console.log(formatListing(lamp));
console.log(firstPage.next(), firstPage.next(), secondPage.next());
console.log(Object.hasOwn(firstPage, "next"));
console.log(firstPage instanceof RequestSequence);
```

新增输出应为：

```text
台灯 ¥19.90
catalog-1 catalog-2 catalog-1
false
true
```

`formatListing` 用显式参数处理可序列化记录；`RequestSequence` 用私有字段隔离每个实例的状态。请求序号仅是当前页面内的诊断标记，不能充当数据库唯一 ID。

## 8. 常见错误与排查路径

### 错误示例：脱离方法后仍假设 `this` 不变

```js
const show = lamp.describe;
console.log(show());
```

五段诊断记录：

1. **现象**：运行到 `show()` 抛出 `TypeError`。
2. **证据**：堆栈指向 `return this.title`；在该调用中 `this === undefined`。
3. **原因**：函数引用离开 `lamp` 后，调用表达式不再包含接收者。
4. **修复**：使用 `show.call(lamp)`、`show.bind(lamp)`，或改写成 `describe(listing)`。
5. **复验**：重新运行，输出 `台灯: 1990`，并确认原始对象未改变。

其他排查：

- `Object.hasOwn(instance, "next")` 为 `false` 是预期结果，方法位于原型；
- `JSON.parse(...) instanceof RequestSequence` 为 `false` 不是解析失败；
- 私有字段语法错误要检查是否在声明它的类体外访问；
- 不要通过修改内置原型“修复”缺少的方法。

## 9. 课后题

1. 自有属性和继承属性的查找顺序是什么？
2. `const f = object.method; f()` 为什么可能与 `object.method()` 不同？
3. `instanceof` 为什么不能作为 API 商品数据的唯一验证？
4. 箭头函数适合替换所有对象方法吗？

**答案：**

1. 先查对象自身，再逐级查原型，最终到 `null`。
2. 前者没有对象接收者；严格模式下普通函数的 `this` 为 `undefined`。
3. 它只检查原型关系，不检查金额、状态、时间等业务字段。
4. 不适合；箭头函数捕获词法 `this`，无法接收点号左侧对象作为动态 `this`。

## 10. 实践练习

### 基础练习

给 `listingMethods` 增加 `isAvailable()`，返回 `this.status === "available"`。为 `lamp` 增加状态并验证该方法不是自有属性。

### 进阶练习

实现 `LocalSelection` 类，用私有 `Set` 保存商品 ID，提供 `toggle(id)` 和 `has(id)`。创建两个实例，证明它们的选择状态相互独立。

### 故障注入练习

把 `listingMethods.describe` 改为箭头函数并读取 `this.title`。记录错误或错误输出，再恢复普通方法语法。

**可判定答案标准：**

- 基础练习输出 `true` 与 `false`；
- 进阶练习不能暴露可直接替换的内部 `Set`，两个实例互不影响；
- 故障记录必须包含调用形式和实际 `this`，不能用“箭头函数坏了”代替原因。

## 11. 阶段验收

- [ ] `node prototype/prototype.mjs` 退出码为 0，输出与文档一致；
- [ ] 能画出 `lamp -> listingMethods -> Object.prototype -> null`；
- [ ] 能分别演示直接调用、脱离调用和显式接收者调用；
- [ ] 商品仍是普通记录，金额进入格式化前经过安全整数和非负校验；
- [ ] 没有修改任何内置原型；
- [ ] 能说明本地类状态不代表服务端持久化或授权。

## 12. 常见问题

**对象字面量没有原型吗？**
通常有，其直接原型一般是 `Object.prototype`。只有显式 `Object.create(null)` 才创建无原型对象。

**类的方法会复制到每个实例吗？**
普通实例方法通常位于类的 `prototype` 上，由实例共享；实例字段则各自保存。

**私有字段是否适合隐藏密码？**
不适合。它限制 JavaScript 语法层面的访问，不提供服务端密钥存储或加密保证。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [MDN：继承与原型链](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Inheritance_and_the_prototype_chain)
- [MDN：`this`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/this)
- [MDN：类](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Classes)
- [ECMAScript：Ordinary Object Internal Methods](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinary-object-internal-methods-and-internal-slots)

## 我现在能做到什么

我能从原型链解释属性来自哪里，从调用表达式解释 `this`，并根据数据与状态的真实关系选择普通记录、函数或类，而不把实例身份误当成数据可信、持久化或授权。

## 单元导航

- 上一单元：[JSON 序列化与数据边界](../03-objects-arrays-data/03-json-serialization-data-boundaries.md)
- 下一单元：[ESM 导入、导出与路径解析](./02-esm-import-export-resolution.md)
- 章节目录：[原型、类与 ECMAScript 模块](../README.md#第四章原型类与-ecmascript-模块)
