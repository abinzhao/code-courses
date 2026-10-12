# 01 JSX、组件、Props 与 State

## 学习目标

- 理解 JSX 的本质：它不是 HTML，而是 `React.createElement` 的语法糖
- 掌握函数组件的声明和使用方式
- 掌握 Props 的传递、解构、默认值和 `children`
- 掌握 `useState` 的用法和异步批处理机制
- 理解不可变更新：对象和数组的正确修改方式
- 掌握条件渲染的各种写法，尤其 `&&` 的 0 渲染陷阱
- 理解列表渲染中 `key` 的重要性和选择策略
- 掌握 React 合成事件和事件传参

---

## 内容讲解

### 1. JSX 的本质

你看到的 JSX：

```jsx
const element = <h1 className="title">Hello, React!</h1>;
```

经过 Babel 编译后，本质是：

```js
const element = React.createElement(
  'h1',
  { className: 'title' },
  'Hello, React!'
);
```

`React.createElement` 的签名：

```
React.createElement(type, props, ...children)
```

它返回一个 **虚拟 DOM 节点（VNode）**，这是一个普通 JS 对象，大致结构：

```js
{
  $$typeof: Symbol(react.element),
  type: 'h1',                    // 原生标签是字符串，组件是函数
  props: { className: 'title', children: 'Hello, React!' },
  key: null,
  ref: null
}
```

**关键认知**：JSX 只是让你用"像 HTML 的语法"来描述 UI，最终产物是一棵 VNode 树。React 通过对比新旧 VNode 树（diffing）来决定如何更新真实 DOM。

| 对比维度 | HTML | JSX |
|---------|------|-----|
| `class` | `<div class="box">` | `<div className="box">` |
| `for` | `<label for="id">` | `<label htmlFor="id">` |
| 内联样式 | `style="color:red"` | `style={{ color: 'red' }}` |
| 单标签 | `<input>` | `<input />`（必须闭合） |
| 表达式 | ✗ | `{expression}` |
| 注释 | `<!-- -->` | `{/* */}` |

> **避坑提示**：JSX 中 `{}` 里只能放**表达式**，不能放语句。`{if (x) {...}}` 会报语法错误。

---

### 2. 函数组件

React 19 中，组件就是一个**返回 JSX 的函数**。首字母必须大写，React 用它来区分原生标签和组件。

```jsx
// ✅ 正确：函数名首字母大写
function Greeting({ name }) {
  return <h1>你好，{name}！</h1>;
}

// ✅ 箭头函数同样可以
const Greeting = ({ name }) => <h1>你好，{name}！</h1>;

// ❌ 错误：小写开头会被当成原生 HTML 标签
function greeting({ name }) {
  return <h1>你好，{name}！</h1>;
}
```

组件的使用规则：

```jsx
function App() {
  return (
    <>
      {/* 自闭合 */}
      <Greeting name="张三" />
      {/* 有 children 时用双标签 */}
      <Card>
        <p>这是卡片内容</p>
      </Card>
    </>
  );
}
```

---

### 3. Props：组件间的数据通道

#### 3.1 基本传递与解构

```jsx
// 父组件传 Props
function App() {
  return <UserCard name="李四" age={25} isAdmin={false} />;
}

// 子组件接收 Props——推荐在参数里直接解构
function UserCard({ name, age, isAdmin = false }) {
  return (
    <div className="card">
      <h2>{name}</h2>
      <p>年龄：{age}</p>
      {isAdmin && <span className="badge">管理员</span>}
    </div>
  );
}
```

#### 3.2 children：组件的"插槽"

```jsx
// children 是 React 内置的 prop，代表组件的子内容
function Card({ title, children }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="card-body">{children}</div>
    </div>
  );
}

function App() {
  return (
    <Card title="新闻">
      <p>这是第一条新闻</p>
      <p>这是第二条新闻</p>
    </Card>
  );
}
```

#### 3.3 展开运算符传 Props

```jsx
const user = { name: '王五', age: 30, city: '北京' };

// 等价于 <Profile name="王五" age={30} city="北京" />
<Profile {...user} />
```

> **避坑提示**：`{...obj}` 会传递对象上**所有**可枚举属性。如果对象上有多余字段，这些字段也会成为 DOM 元素的 HTML 属性（如果是原生标签），可能导致控制台警告。

---

### 4. State：组件的"记忆"

#### 4.1 useState 基本用法

```jsx
import { useState } from 'react';

function Counter() {
  // count：当前状态值
  // setCount：更新函数
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>点击了 {count} 次</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </div>
  );
}
```

#### 4.2 状态更新的异步批处理

React 会批量处理同一个事件处理函数中的多次 `setState`：

```jsx
function BatchDemo() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    // 这三行在同一个事件里，React 会把它们合并成一次更新
    setCount(count + 1); // count 还是 0
    setCount(count + 1); // count 还是 0
    setCount(count + 1); // count 还是 0
    // 最终 count 从 0 变成 1，不是 3！
    console.log(count); // 0（闭包里的旧值）
  };

  return <button onClick={handleClick}>+3？不，只 +1</button>;
}
```

解法：使用**函数式更新**，参数是上一次的状态值：

```jsx
const handleClick = () => {
  setCount(prev => prev + 1);
  setCount(prev => prev + 1);
  setCount(prev => prev + 1);
  // 最终 count 从 0 变成 3 ✅
};
```

> **避坑提示**：如果你基于当前 state 计算新 state，**永远用函数式更新**，否则闭包陷阱会给你意想不到的结果。

#### 4.3 不可变更新

State 的更新是**替换**，不是修改。你必须返回一个新值：

```jsx
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: '学习 React', done: false },
    { id: 2, text: '写代码', done: false },
  ]);

  // ✅ 对象更新：用展开运算符创建新对象
  const toggleTodo = (id) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      )
    );
  };

  // ✅ 数组添加：展开运算符
  const addTodo = (text) => {
    setTodos(prev => [...prev, { id: Date.now(), text, done: false }]);
  };

  // ✅ 数组删除：filter
  const removeTodo = (id) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  // ❌ 错误示范：直接修改原数组
  // todos.push(newItem);      // 不会触发重渲染！
  // todos[0].done = true;     // 不会触发重渲染！
}
```

| 操作 | 错误写法 | 正确写法 |
|------|---------|---------|
| 添加 | `arr.push(x)` | `[...arr, x]` 或 `arr.concat(x)` |
| 删除 | `arr.splice(i, 1)` | `arr.filter((_, idx) => idx !== i)` |
| 更新 | `arr[i].prop = v` | `arr.map(item => item.id === id ? {...item, prop: v} : item)` |
| 插入 | `arr.splice(i, 0, x)` | `[...arr.slice(0, i), x, ...arr.slice(i)]` |

---

### 5. 条件渲染

```jsx
function Status({ isLoggedIn, username, count }) {
  return (
    <div>
      {/* 方式一：三元运算符——最推荐 */}
      <p>{isLoggedIn ? `欢迎，${username}` : '请登录'}</p>

      {/* 方式二：&& 短路——但要注意 0 的陷阱 */}
      {count > 0 && <p>你有 {count} 条新消息</p>}
      {/*                              ↑ 如果 count 是 0，页面会渲染一个 "0" */}
      {/*     因为 0 && <p>...</p> 的结果是 0，JSX 会把 0 渲染到页面上 */}

      {/* ✅ 安全的写法 */}
      {count > 0 ? <p>你有 {count} 条新消息</p> : null}
      {/* 或者 */}
      {!!count && <p>你有 {count} 条新消息</p>}

      {/* 方式三：?? 空值合并 */}
      <p>昵称：{username ?? '未设置'}</p>
    </div>
  );
}
```

> **避坑提示**：`&&` 运算符返回的是第一个 falsy 值。`0 && <div/>` 返回 `0`，JSX 会渲染 `0`。同理 `NaN`、`''` 也会产生这个问题。建议条件渲染时使用 `condition ? <Component /> : null` 或 `!!condition && <Component />`。

---

### 6. 列表渲染与 key

```jsx
function FruitList({ fruits }) {
  return (
    <ul>
      {fruits.map(fruit => (
        // key 帮助 React 识别哪些项被增、删、改
        <li key={fruit.id}>{fruit.name}</li>
      ))}
    </ul>
  );
}
```

#### 6.1 为什么不能用 index 作为 key？

```jsx
// 初始列表
const list = [
  { id: 'a', key: 0, text: '苹果' },   // key=0
  { id: 'b', key: 1, text: '香蕉' },   // key=1
  { id: 'c', key: 2, text: '橙子' },   // key=2
];

// 在头部插入一项后，用 index 做 key：
const list = [
  { id: 'x', key: 0, text: '葡萄' },   // key=0（但之前 key=0 是"苹果"）
  { id: 'a', key: 1, text: '苹果' },   // key=1（之前 key=1 是"香蕉"）
  { id: 'b', key: 2, text: '香蕉' },   // ...
  { id: 'c', key: 3, text: '橙子' },
];
// React 以为"苹果"变成了"葡萄"、"香蕉"变成了"苹果"...
// 导致不必要的 DOM 更新，还可能丢失输入框里的用户输入状态
```

| key 选择 | 场景 | 说明 |
|---------|------|------|
| `item.id`（来自数据库） | ✅ 最佳 | 稳定唯一 |
| `crypto.randomUUID()` | ✅ 好 | 生成一次存入 state，不要每次渲染都生成 |
| `index` | ❌ 危险 | 列表有增、删、排序操作时会出错 |
| `Math.random()` | ❌ 极差 | 每次渲染 key 都变，React 会卸载重建所有节点 |

> **避坑提示**：`key` 必须写在 `.map()` 的最外层元素上，不能写在子组件的内部。`key` 只对 React 内部有意义，不会作为 prop 传给组件。

---

### 7. 事件处理

React 使用**合成事件（Synthetic Event）**，它对原生事件做了封装，保证跨浏览器一致性。

```jsx
function ClickDemo() {
  // 无参数
  const handleClick = (e) => {
    // e 是合成事件对象，不是原生事件
    console.log('被点击了', e.target);
  };

  // 需要传参：用箭头函数包裹
  const handleDelete = (id) => {
    console.log('删除第', id, '项');
  };

  return (
    <>
      <button onClick={handleClick}>点我</button>
      <button onClick={() => handleDelete(5)}>删除第5项</button>
      {/*                       ↑ 箭头函数：调用时才执行，正确传参 */}
      {/* ❌ onClick={handleDelete(5)} 会在渲染时立即执行！ */}
    </>
  );
}
```

| 原生事件 | React 事件 | 说明 |
|---------|-----------|------|
| `onclick` | `onClick` | 驼峰命名 |
| `onsubmit` | `onSubmit` | |
| `onkeydown` | `onKeyDown` | |
| `e.stopPropagation()` | `e.stopPropagation()` | 阻止冒泡 |
| `e.preventDefault()` | `e.preventDefault()` | 阻止默认行为 |
| `e.nativeEvent` | — | 获取原生事件对象 |

> **避坑提示**：React 中 `e.preventDefault()` 必须显式调用，不存在 `return false` 阻止默认行为的写法。

---

### 8. 实战：TodoList 静态结构

```jsx
import { useState } from 'react';

// 表单组件：输入新待办
function AddTodo({ onAdd }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return; // 空内容不添加
    onAdd(trimmed);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="add-todo">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="添加待办事项..."
      />
      <button type="submit">添加</button>
    </form>
  );
}

// 单个待办项
function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={todo.done ? 'done' : ''}>
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => onToggle(todo.id)}
      />
      <span>{todo.text}</span>
      <button onClick={() => onDelete(todo.id)}>删除</button>
    </li>
  );
}

// 主组件
export default function TodoList() {
  const [todos, setTodos] = useState([]);

  const addTodo = (text) => {
    setTodos(prev => [
      ...prev,
      { id: Date.now(), text, done: false },
    ]);
  };

  const toggleTodo = (id) => {
    setTodos(prev =>
      prev.map(todo =>
        todo.id === id ? { ...todo, done: !todo.done } : todo
      )
    );
  };

  const deleteTodo = (id) => {
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  return (
    <div className="todo-container">
      <h1>我的待办事项</h1>
      <AddTodo onAdd={addTodo} />
      {todos.length === 0 ? (
        <p className="empty">暂无待办，添加一个吧！</p>
      ) : (
        <ul>
          {todos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

## 常见问题

**Q1：JSX 为什么要有一个根元素？**

JSX 最终编译成 `React.createElement('div', null, child1, child2, ...)`，这个函数只能返回一个值。React 16 之后可以用 `<></>`（Fragment）作为"透明"根元素，不产生多余 DOM 节点。

**Q2：Props 是不可变的吗？**

是的。React 的数据流是**单向的**：父组件向子组件传递 props，子组件**不应该**修改 props。这是 React 的核心约定——"props 是只读的"。如果需要修改数据，应该通过回调函数通知父组件，由父组件修改自己的 state。

**Q3：useState 每次渲染都会重新执行，为什么状态不会丢失？**

React 内部维护了一个"状态链表"，`useState` 按照 Hook 的调用**顺序**来匹配对应的状态槽位。这就是为什么 Hook 不能放在条件语句里——顺序变了会导致状态错位。

**Q4：为什么 `setCount(count + 1)` 不会立即更新？**

在 React 18/19 中，同一事件处理函数内的多次 state 更新会被**自动批处理**，React 只在所有代码执行完后统一处理一次更新。这是有意为之的性能优化。

**Q5：什么时候该拆分成子组件？**

当一段 UI 具有独立的逻辑、状态，或者被多处复用时。组件拆分还有一个重要好处：**缩小重渲染范围**——只更新真正变化的部分。

**Q6：`children` 和普通 prop 有什么区别？**

本质没有区别，`children` 也是 `props` 上的一个属性。但语法上它写在组件的标签之间，更直观地表达"嵌套"关系。React 团队推荐用 `children` 而不是自定义 prop 来传递子内容。

**Q7：列表更新时 key 重复会怎样？**

React 控制台会报 `Encountered two children with the same key` 警告。React 无法区分这两个节点，diff 过程会出现不可预期的行为：状态错乱、渲染错误。

**Q8：内联函数 `onClick={() => f(x)}` 会导致性能问题吗？**

每次渲染都会创建一个新函数。在简单场景下影响微乎其微。当你的组件频繁重渲染且子组件用了 `React.memo` 时，内联函数会导致 `memo` 失效——这是后面讲 `useCallback` 时要解决的问题。

---

## 实操作业

### 基础：计数器应用
实现一个计数器，包含 +1、-1、重置三个按钮，且数值不能小于 0 或大于 99。

### 进阶：购物清单
在 TodoList 的基础上，给每个待办项加上"优先级"（高/中/低）下拉选择框和"创建时间"显示。支持按优先级筛选（显示全部/仅显示高优先级）。

### 挑战：可编辑列表
在进阶的基础上，给每个待办项加上"编辑"按钮，点击后文本变为可编辑的 `<input>`，按回车或点击外部确认修改，按 Esc 取消。注意焦点管理。

---

## 本节小结

- JSX 是 `React.createElement` 的语法糖，编译产物是一棵 VNode 树
- 函数组件 = 返回 JSX 的纯函数，Props 是只读的
- `useState` 返回 `[value, setter]`，setter 的更新是异步批处理的
- 不可变更新是 React 的基石：永远创建新值，不要修改原值
- 条件渲染首选三元，注意 `&&` 的 0 陷阱
- 列表渲染必须给稳定唯一的 `key`，永远别用 `index`
- 事件传参用箭头函数包裹，不要直接调用