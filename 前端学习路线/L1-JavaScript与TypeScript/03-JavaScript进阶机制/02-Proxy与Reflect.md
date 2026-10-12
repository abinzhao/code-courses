# 02-Proxy 与 Reflect

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L1 JavaScript 与 TypeScript
> - 先修：[01-迭代器与生成器](./01-迭代器与生成器.md)
> - 建议用时：120-180 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[TypeScript](https://www.typescriptlang.org/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Proxy 的 13 种拦截器（traps），知道每种拦截什么操作
- 掌握 Proxy 与 Reflect 的对应关系，用 Reflect 优雅地完成默认行为
- 理解 Vue 3 响应式系统的 Proxy 实现原理，能独立写一个简化版
- 掌握 Proxy 在数据校验、日志记录、默认值等场景的应用
- 清楚 Proxy 的性能边界，知道哪些场景该用、哪些不该用

---

## 内容讲解

### 一、Proxy 是什么？

`Proxy` 在你和目标对象之间架设一层「代理」/「拦截」层，所有对目标对象的操作，都必须先经过这层代理。你可以在这层代理中修改某些操作的默认行为。

```
你的代码 → Proxy 拦截层 → 目标对象
            ↑ 可以在这里做：
            │  · 验证数据合法性
            │  · 记录操作日志
            │  · 修改返回值
            │  · 阻止某些操作
            │  · ……
```

基本语法：

```javascript
const proxy = new Proxy(target, handler);
// target: 被代理的目标对象
// handler: 一个对象，定义拦截行为（traps）
```

### 二、13 种拦截器一览

Proxy 提供了 13 种拦截器，覆盖了几乎所有与对象交互的方式：

```javascript
const handler = {
  // 1. 属性读取：proxy.foo、proxy['foo']
  get(target, prop, receiver) {},

  // 2. 属性设置：proxy.foo = 1
  set(target, prop, value, receiver) {},

  // 3. in 操作符：'foo' in proxy
  has(target, prop) {},

  // 4. delete 操作符：delete proxy.foo
  deleteProperty(target, prop) {},

  // 5. 获取自身属性键：Object.keys(proxy)、for...in
  ownKeys(target) {},

  // 6. Object.getOwnPropertyDescriptor()
  getOwnPropertyDescriptor(target, prop) {},

  // 7. Object.defineProperty()
  defineProperty(target, prop, descriptor) {},

  // 8. Object.preventExtensions()
  preventExtensions(target) {},

  // 9. Object.isExtensible()
  isExtensible(target) {},

  // 10. 属性读取的原型链版本
  getPrototypeOf(target) {},

  // 11. Object.setPrototypeOf()
  setPrototypeOf(target, proto) {},

  // 12. 函数调用：proxy()、proxy.call()、proxy.apply()
  apply(target, thisArg, argumentsList) {},

  // 13. new 操作符：new proxy()
  construct(target, argumentsList, newTarget) {},
};
```

**最常用的 6 个**：`get`、`set`、`has`、`deleteProperty`、`ownKeys`、`apply`。

### 三、Reflect：Proxy 的最佳搭档

`Reflect` 是一个内置对象，它的方法与 Proxy 的拦截器一一对应：

| Proxy 陷阱 | Reflect 方法 | 作用 |
|---|---|---|
| `get` | `Reflect.get(target, prop, receiver)` | 读取属性 |
| `set` | `Reflect.set(target, prop, value, receiver)` | 设置属性 |
| `has` | `Reflect.has(target, prop)` | `in` 操作符 |
| `deleteProperty` | `Reflect.deleteProperty(target, prop)` | 删除属性 |
| `ownKeys` | `Reflect.ownKeys(target)` | 获取自身键 |
| `apply` | `Reflect.apply(target, thisArg, args)` | 函数调用 |
| `construct` | `Reflect.construct(target, args)` | `new` 操作符 |

**为什么 Proxy 需要 Reflect？**

在拦截器内部，你需要一种方式来执行**默认行为**（即「正常情况下的操作」）。你可以直接操作目标对象，但使用 `Reflect` 有三大优势：

1. **语法统一**：`Reflect.xxx()` 和拦截器签名完全一致，代码更工整
2. **正确的 `receiver` 传递**：在涉及 getter/setter 和原型链时，`Reflect.get/set` 的第三个参数 `receiver` 能确保 `this` 指向 Proxy 而非原始对象
3. **返回值友好**：`Reflect.defineProperty()` 返回布尔值（而不是抛出异常），更符合拦截器的设计模式

```javascript
// 最佳实践：拦截器内部始终用 Reflect 执行默认行为
const handler = {
  get(target, prop, receiver) {
    console.log(`读取属性: ${String(prop)}`);
    // 用 Reflect.get 执行默认读取行为，并传递 receiver
    return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value, receiver) {
    console.log(`设置属性: ${String(prop)} = ${value}`);
    return Reflect.set(target, prop, value, receiver);
  }
};
```

> **避坑提示**：在 `get`/`set` 拦截器中，如果目标对象有通过 getter/setter 定义的属性，必须传递 `receiver` 参数给 `Reflect`，否则 getter 内的 `this` 会指向原始对象而非 Proxy，导致响应式失效。Vue 3 的 `Reflect.get(target, key, receiver)` 就是这个原因。

### 四、Vue 3 响应式系统的简化实现

Vue 3 放弃了 Vue 2 的 `Object.defineProperty`，改用 `Proxy` 实现响应式。下面是核心原理的简化版：

```javascript
/**
 * 简易响应式系统
 * 核心思路：用 Proxy 拦截读写，用 Dep 模式管理依赖追踪
 */

// 当前正在计算的副作用函数
let activeEffect = null;

// 依赖存储：target → key → Set<effectFn>
const targetMap = new WeakMap();

function track(target, key) {
  // 把当前 effect 注册为该 key 的依赖
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);
}

function trigger(target, key) {
  // key 变化时，通知所有依赖该 key 的 effect 重新执行
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  if (deps) {
    deps.forEach(effect => effect());
  }
}

// 核心：创建响应式对象
function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      track(target, key);         // 依赖收集
      return Reflect.get(target, key, receiver);
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      const result = Reflect.set(target, key, value, receiver);
      if (oldValue !== value) {
        trigger(target, key);     // 派发更新
      }
      return result;
    }
  });
}

// watch 函数：当依赖数据变化时自动执行回调
function watchEffect(fn) {
  const effect = () => {
    activeEffect = effect;       // 标记当前 effect
    fn();                        // 执行时会触发 get → track
    activeEffect = null;
  };
  effect();                      // 首次立即执行
}

// ========== 使用示例 ==========
const state = reactive({ count: 0, name: 'Vue3' });

watchEffect(() => {
  console.log(`count 变了: ${state.count}`);
});

watchEffect(() => {
  console.log(`name 是: ${state.name}, count 是: ${state.count}`);
});

state.count++;  // 输出：count 变了: 1
                //      name 是: Vue3, count 是: 1

state.name = 'Proxy'; // 输出：name 是: Proxy, count 是: 1
```

**与 Vue 2 的 `Object.defineProperty` 对比：**

| | Proxy | Object.defineProperty |
|---|---|---|
| 监听新增属性 | ✅ 自动拦截 | ❌ 需要 `$set` |
| 监听数组索引赋值 | ✅ 自动拦截 | ❌ 需要重写数组方法 |
| 监听 `delete` | ✅ `deleteProperty` | ❌ 不支持 |
| IE 兼容性 | ❌ 不可 polyfill | ✅ IE9+ |
| 性能（大量属性） | ✅ 惰性（只拦截访问） | ❌ 递归遍历所有属性 |

### 五、Proxy 实用场景

#### 5.1 数据校验

```javascript
// 类型安全的 User 对象
function createUser(data) {
  return new Proxy(data, {
    set(target, prop, value) {
      if (prop === 'age') {
        if (typeof value !== 'number' || value < 0 || value > 150) {
          throw new TypeError('age 必须是 0-150 的数字');
        }
      }
      if (prop === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          throw new TypeError('email 格式不正确');
        }
      }
      return Reflect.set(target, prop, value);
    }
  });
}

const user = createUser({});
user.age = 25;              // ✅ 正常
user.email = 'hi@ex.com';   // ✅ 正常
// user.age = 'abc';        // ❌ TypeError: age 必须是 0-150 的数字
```

#### 5.2 操作日志

```javascript
// 自动记录所有读写操作的日志 Proxy
function createLogger(obj, name = 'Object') {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      console.log(`[${name}] GET ${String(prop)} → ${JSON.stringify(value)}`);
      // 如果属性值是对象，也包装成日志 Proxy（深度代理）
      if (value !== null && typeof value === 'object') {
        return createLogger(value, `${name}.${String(prop)}`);
      }
      return value;
    },
    set(target, prop, value, receiver) {
      console.log(`[${name}] SET ${String(prop)} = ${JSON.stringify(value)}`);
      return Reflect.set(target, prop, value, receiver);
    },
    deleteProperty(target, prop) {
      console.log(`[${name}] DELETE ${String(prop)}`);
      return Reflect.deleteProperty(target, prop);
    }
  });
}

const logged = createLogger({ count: 0, info: { city: '北京' } }, 'app');
logged.count++;              // [app] GET count → 0 / [app] SET count = 1
logged.info.city;            // [app] GET info → {...} / [app.info] GET city → "北京"
```

#### 5.3 默认值

```javascript
// 访问不存在的属性时返回默认值，而不是 undefined
function withDefault(obj, defaultValue = 'N/A') {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }
      return defaultValue;
    }
  });
}

const config = withDefault({ theme: 'dark', lang: 'zh' });
console.log(config.theme);     // 'dark'
console.log(config.fontSize);  // 'N/A'（而非 undefined）
```

### 六、Proxy 的性能注意事项

Proxy 不是免费的，它引入了额外的拦截层：

1. **每次属性访问都经过 Proxy**：对于高频读写操作（如循环内大量 `obj.prop`），Proxy 的开销不能忽略。在一个 10 万次的循环中，Proxy 可能慢 5-10 倍。
2. **`ownKeys` 拦截代价高**：`Object.keys()` 会触发 `ownKeys`，如果有大量属性，每次都要过滤一遍，性能损耗明显。
3. **深度代理是 O(n) 的**：对深层嵌套对象做响应式代理（如 Vue 3 的 `reactive`），需要递归所有嵌套对象，数据量大时可感知延迟。
4. **箭头函数陷阱**：Proxy 不能拦截对原始值的操作（如 `proxy += 1` 本质是 `proxy = proxy + 1`，会丢失 Proxy 引用）。

**优化建议**：
- 不要让 Proxy 出现在热路径（hot path）中
- 对于只需读取的场景，可直接操作原始对象
- 用 `shallowReactive`（如 Vue 3 的 `shallowReactive`）只代理第一层

---

## 常见问题

**Q1：Proxy 和 `Object.defineProperty` 在拦截能力上有什么根本区别？**

`Object.defineProperty` 只能劫持**已有属性**的 getter/setter，无法拦截新增属性、删除属性、`in` 操作符等。Proxy 提供了 13 种拦截器，几乎覆盖所有对象操作。Proxy 是语言层面的代理，`Object.defineProperty` 是属性级别的劫持。

**Q2：`receiver` 参数到底是什么？为什么要传？**

`receiver` 是操作发生的实际对象。当 Proxy 嵌套在原型链中，或属性通过 getter 访问时，`receiver` 保证了最终操作指向的是「用户实际使用的那个 Proxy 对象」而非「原始目标对象」。正确传递 `receiver` 是响应式系统正确追踪依赖的关键。

**Q3：能 Proxy 代理 `Map`、`Set` 吗？**

能，但有限制。Proxy 可以拦截 `map.get('key')` 和 `map.set('key', val)`，因为它们本质是方法调用（触发 `get` 陷阱）。但 Vue 3 对 `Map`/`Set` 做了额外处理，因为仅靠 Proxy 的默认行为无法追踪 `.has()`、`.delete()` 等内部状态变化。

**Q4：Proxy 能被 polyfill 吗？**

不能。Proxy 是语言层面的特性，无法通过 ES5 代码模拟。所以不支持 Proxy 的浏览器（如 IE11）无法使用 Vue 3。

**Q5：如何在 Proxy 中实现只读对象？**

在 `set` 和 `deleteProperty` 陷阱里返回 `false` 或抛出错误，在 `defineProperty`、`preventExtensions` 陷阱中也阻止修改：

```javascript
const readonly = obj => new Proxy(obj, {
  set() { throw new Error('只读对象不可修改'); },
  deleteProperty() { throw new Error('只读对象不可删除属性'); }
});
```

**Q6：`typeof proxy` 是什么？**

`typeof proxy` 返回 `typeof proxy` 目标对象的类型。如果目标是对象（`{}`），返回 `'object'`；如果目标是函数，返回 `'function'`。Proxy 是透明的，类型检查默认透传。

**Q7：Proxy 能拦截原型链上的属性访问吗？**

能。当读取 `proxy.foo` 且 `foo` 不存在于目标对象自身时，JS 引擎会沿着原型链查找，每一步的属性访问都会触发 `get` 拦截器（在查找到的那个对象的 Proxy 上触发）。

**Q8：多个 Proxy 可以嵌套吗？**

可以。一个 Proxy 可以代理另一个 Proxy。每个 Proxy 的拦截器按嵌套顺序从外到内执行。但嵌套会放大性能开销，尽量避免。

---

## 实操作业

### 基础练习：实现一个带类型校验的 Config 对象

用 Proxy 实现一个 `createConfig` 函数，接收一个 schema 描述（如 `{ port: 'number', host: 'string' }`），返回的 Proxy 对象在设置属性值时自动校验类型，不符合 schema 的赋值抛出错误。

```javascript
const config = createConfig(
  { port: 3000, host: 'localhost' },
  { port: 'number', host: 'string' }
);
config.port = 8080;   // ✅
// config.port = '80'; // ❌ TypeError: port 应为 number
```

### 进阶练习：实现一个简单的响应式状态管理器

基于本节的 `reactive` + `watchEffect`，扩展实现以下功能：

1. `computed`：接受一个函数，返回只读的响应式计算属性
2. 数组操作的监听：`push`、`pop`、`splice` 等方法也能触发依赖更新
3. 编写一段 HTML 页面，将 `state.count` 绑定到一个 `<span>` 上，按钮点击 `state.count++` 自动更新 DOM

### 挑战练习：实现 memoized 代理

用 Proxy 实现一个方法调用的缓存机制：对某个对象的计算结果进行缓存，如果参数相同则直接返回缓存值，否则计算并缓存。

```javascript
// 目标：对 heavyCalculation 的结果做缓存
const calculator = {
  heavyCalculation(a, b) {
    console.log('实际执行计算'); // 相同参数只打印一次
    return a + b;
  }
};
const memoizedCalc = memoize(calculator);
console.log(memoizedCalc.heavyCalculation(1, 2)); // 实际执行计算 → 3
console.log(memoizedCalc.heavyCalculation(1, 2)); // 直接返回 3（不打印）
console.log(memoizedCalc.heavyCalculation(2, 3)); // 实际执行计算 → 5
```

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L1 里程碑](../../projects/atlas/milestones/L1.md)
- 本课任务：把“Proxy 与 Reflect”落实为 Atlas 中可独立导入的模块或纯函数，补充正常、边界、异常三类自动测试。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

- `Proxy` 在目标对象前架设拦截层，提供 13 种拦截器覆盖几乎所有对象操作
- `Reflect` 与 Proxy 陷阱一一对应，在拦截器内部用 `Reflect` 执行默认行为是最佳实践
- `receiver` 参数的正确传递是响应式系统追踪依赖的关键
- Vue 3 用 Proxy 替代了 Vue 2 的 `Object.defineProperty`，解决了新增属性、数组索引、`delete` 等监听盲区
- Proxy 适合数据校验、日志记录、默认值、响应式系统等场景，但在高频访问的热路径中要注意性能开销
- Proxy 不可 polyfill，选择技术方案时需考虑浏览器兼容性

<!-- course-nav:start -->
---

[上一篇：01-迭代器与生成器](./01-迭代器与生成器.md) · [课程地图](../../README.md) · [下一篇：03-内存管理与垃圾回收](./03-内存管理与垃圾回收.md)
<!-- course-nav:end -->
