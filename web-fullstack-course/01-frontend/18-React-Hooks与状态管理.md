# 18-React Hooks 与状态管理

## 目标

完成本知识单元后，学员应理解 Hooks 是函数组件“接入状态与外部系统”的机制，并能为不同状态选择正确的存放位置。

学员应能够：

1. 复述并遵守 Hooks 的两条调用规则，解释规则背后的原因。
2. 使用 `useState` 管理本地状态，对对象和数组执行不可变更新，在需要时使用函数式更新。
3. 正确定位 `useEffect`：它用于同步外部系统；能写依赖数组和清理函数，识别常见反模式。
4. 使用 `useRef` 保存可变引用和访问 DOM，使用 `useId` 生成稳定 id。
5. 理解 `useMemo`、`useCallback`、`useTransition`、`useDeferredValue` 的用途与代价，不做无依据的“优化”。
6. 抽取自定义 Hook 复用状态逻辑，并按本地、URL、全局、服务端、派生五类对状态做归属决策。

本单元的 `useEffect` 只用于理解原则；涉及网络请求的完整方案将在 TanStack Query 单元展开。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| React 19 | 提供内置 Hooks 与并发特性 | 掌握 useState、useEffect、useRef 等常用 Hook |
| TypeScript | 为状态和自定义 Hook 标注类型 | 能推断状态类型并为 Hook 设计返回类型 |
| Vite | 开发服务器与构建 | 能运行项目并通过构建检查类型 |
| React DevTools | 观察重渲染与 Hook 状态 | 能查看组件状态与渲染次数 |
| ESLint 与 react-hooks 规则 | 检查 Hooks 规则与依赖 | 能读懂依赖缺失等告警 |
| Node.js 当前 LTS 与 npm | 运行工具链 | 能安装依赖与执行脚本 |

本单元不引入 Redux、Zustand 等全局状态库。全局客户端状态的更多方案在后续工程化单元讲解，服务端状态使用专门的 TanStack Query，不与本单元混为一谈。

## 详细的理论知识讲解和示例伪代码

### 1. Hooks 规则与心智模型

#### 1.1 定义

Hooks 是以 `use` 开头的特殊函数，让函数组件能够使用状态、保存跨渲染的值、订阅外部系统等。React 依靠 Hook 的调用顺序来对应每个 Hook 的内部存储，因此有两条强制规则：

1. 只在顶层调用 Hook：不要放在条件、循环、嵌套函数内部，保证每次渲染调用顺序一致。
2. 只在 React 函数组件或自定义 Hook 中调用 Hook：普通工具函数中不能使用。

#### 1.2 与 Web 的关系

组件每次重渲染都会重新执行整个函数。如果某次渲染把某个 Hook 放进了 `if` 分支导致它没有执行，后面的 Hook 与内部存储就会全部错位，产生难以理解的错误。

```tsx
import { useState } from 'react';

// 错误：条件成立时跳过第一个 Hook，调用顺序被破坏
function BadPanel({ editable }: { editable: boolean }) {
  let value = '';
  if (editable) {
    // 下面这行概念上演示“在条件中调用 Hook”的错误，实际不要这样写
    const state = useState('');
    value = state[0];
  }
  return <div>{value}</div>;
}
```

正确方式是让 Hook 每次都执行，把条件放进 Hook 内部逻辑：

```tsx
import { useState } from 'react';

function GoodPanel({ editable }: { editable: boolean }) {
  const [value, setValue] = useState('');

  return editable ? (
    <input value={value} onChange={(e) => setValue(e.target.value)} />
  ) : (
    <p>{value || '未填写'}</p>
  );
}
```

#### 1.3 自定义 Hook 的命名

以 `use` 开头命名自定义 Hook，例如 `useLocalStorage`、`useInterval`。这样 lint 规则能识别它并检查内部的 Hook 调用。

#### 1.4 常见误区

> Hook 顺序出问题只要当前分支能跑就行。

顺序错位会让多个状态与错误的内部槽位对应，属于必须修正的结构性错误，不能靠测试特定输入侥幸通过。

> 在普通工具函数里用到了 useState 也没关系。

普通函数不处于组件渲染周期，React 无法为其维护状态。需要复用状态逻辑时应编写自定义 Hook，并在组件中调用。

### 2. useState、不可变更新与函数式更新

#### 2.1 定义

`useState` 返回一个状态值和一个更新函数。调用更新函数会安排一次重渲染，并在新的渲染中返回新值。

```text
const [状态, 更新函数] = useState(初始值)
```

#### 2.2 与 Web 的关系

界面中的开关、输入框、选中项都依赖本地状态。更新函数是触发重渲染的唯一正规途径：直接修改变量不会让界面更新。

```tsx
import { useState } from 'react';

function Toggle() {
  const [open, setOpen] = useState(false);

  return (
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>
      {open ? '收起' : '展开'}
    </button>
  );
}
```

#### 2.3 不可变更新

React 通过引用判断状态是否变化。更新对象和数组时，应创建新的引用，而不是修改原对象。

```tsx
import { useState } from 'react';

type FormState = { name: string; age: number };

function UserForm() {
  const [form, setForm] = useState<FormState>({ name: '', age: 0 });

  const updateName = (name: string) => {
    // 正确：展开旧对象生成新对象
    setForm((prev) => ({ ...prev, name }));
  };

  return (
    <input
      value={form.name}
      onChange={(event) => updateName(event.target.value)}
      placeholder="姓名"
    />
  );
}
```

数组的常见不可变操作：

```tsx
import { useState } from 'react';

function TagEditor() {
  const [tags, setTags] = useState<string[]>(['前端']);

  const addTag = (tag: string) => {
    setTags((prev) => [...prev, tag]);
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  };

  const updateTag = (index: number, next: string) => {
    setTags((prev) => prev.map((item, i) => (i === index ? next : item)));
  };

  return (
    <ul>
      {tags.map((tag, index) => (
        <li key={tag}>
          <input value={tag} onChange={(e) => updateTag(index, e.target.value)} />
          <button type="button" onClick={() => removeTag(tag)}>
            删除
          </button>
        </li>
      ))}
      <button type="button" onClick={() => addTag(`新标签 ${tags.length}`)}>
        添加
      </button>
    </ul>
  );
}
```

#### 2.4 函数式更新

当新状态依赖旧状态，或同一事件中可能连续更新时，向更新函数传入一个函数：

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  const addThree = () => {
    // 三次更新基于前一次结果，最终增加 3
    setCount((value) => value + 1);
    setCount((value) => value + 1);
    setCount((value) => value + 1);
  };

  return (
    <button type="button" onClick={addThree}>
      {count}，连加三次
    </button>
  );
}
```

如果写成 `setCount(count + 1)` 连调三次，三次都基于同一次渲染中的旧 `count`，结果只增加 1。

#### 2.5 状态对象的组织

- 同一组件中频繁独立变化的值，可分成多个 state，避免每次更新都重建大对象。
- 总是一起变化、彼此强相关的值，适合放在同一个对象中。
- 表单整体可作为一个对象，减少散落字段。

#### 2.6 常见误区

> 直接 `state.name = 'x'` 再 set 一次也行。

先修改原对象再把同一引用传回，React 可能跳过更新；即使界面偶然变化，也会破坏时间旅行调试等能力。始终创建新引用。

> `useState(0)` 的初始值会随每次渲染重新计算。

初始值只在首次渲染使用。当初始值需要昂贵计算时，应传入惰性初始化函数：`useState(() => computeExpensive())`。

### 3. useEffect：同步外部系统的定位

#### 3.1 定义

`useEffect` 的职责是让组件与 React 之外的系统保持同步，例如订阅事件、启动定时器、操作命令式组件、与远端同步。它不应成为“组件渲染后什么都做一点”的容器。

```text
useEffect(设置同步的函数, 依赖数组)
```

#### 3.2 与 Web 的关系

浏览器提供了大量组件之外的系统：窗口尺寸、定时器、网络、Web API、第三方地图或播放器。组件挂载时接入、卸载时断开，就是“同步外部系统”。

定时器示例：

```tsx
import { useEffect, useState } from 'react';

function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    // 清理：组件卸载或下次执行前清除旧定时器
    return () => window.clearInterval(timer);
  }, []);

  return <time>{now.toLocaleTimeString()}</time>;
}
```

订阅浏览器事件示例：

```tsx
import { useEffect, useState } from 'react';

function useWindowWidth() {
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}
```

#### 3.3 依赖数组的含义

依赖数组描述“这次同步与哪些值有关”：

- 不传数组：每次渲染后都执行。
- 空数组：只在挂载后执行一次，清理在卸载时执行。
- 传入依赖：挂载后执行一次，之后任一依赖变化时，先清理旧同步，再执行新同步。

```text
渲染 A（id=1） → 执行 effect(id=1)
渲染 B（id=2） → 先清理 effect(id=1) → 再执行 effect(id=2)
卸载          → 清理 effect(id=2)
```

```tsx
import { useEffect } from 'react';

function UserRoom({ roomId }: { roomId: string }) {
  useEffect(() => {
    const connection = createRoomConnection(roomId);
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);

  return <p>房间：{roomId}</p>;
}

function createRoomConnection(roomId: string) {
  return {
    connect() {
      console.log('连接房间', roomId);
    },
    disconnect() {
      console.log('离开房间', roomId);
    },
  };
}
```

#### 3.4 常见误区

> 数据请求只能写在 useEffect 里。

手写请求加 useEffect 会导致重复处理缓存、竞态、去重和 loading。服务端状态应交给后续单元的 TanStack Query；本单元理解“订阅与同步”即可。

> 把所有值塞进依赖数组会出问题，所以用空数组最安全。

空数组只表达“不依赖任何会变的值”。effect 中确实使用了变化的 props 或 state 却不声明，闭包会读到旧值，属于 bug。

### 4. useEffect 清理函数与常见反模式

#### 4.1 清理的定义

effect 返回的函数是清理函数，用于撤销本次同步：取消订阅、清除计时器、中止连接。React 会在依赖变化前和组件卸载时调用它。

#### 4.2 与 Web 的关系

没有清理的订阅会在组件反复挂载后叠加多份监听，导致内存增长、一次事件触发多次回调。

```tsx
import { useEffect } from 'react';

function ScrollLogger() {
  useEffect(() => {
    const onScroll = () => console.log(window.scrollY);
    window.addEventListener('scroll', onScroll);

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return <div style={{ height: '200vh' }}>向下滚动查看控制台</div>;
}
```

#### 4.3 反模式一：用 effect 派生数据

```tsx
import { useEffect, useState } from 'react';

// 反模式：filtered 可以直接计算，却用 effect + state 绕了一圈
function BadList({ items }: { items: Array<{ name: string }> }) {
  const [keyword, setKeyword] = useState('');
  const [filtered, setFiltered] = useState(items);

  useEffect(() => {
    setFiltered(items.filter((item) => item.name.includes(keyword)));
  }, [items, keyword]);

  return (
    <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
  );
}
```

正确做法是渲染期间直接计算派生值：

```tsx
import { useState } from 'react';

function GoodList({ items }: { items: Array<{ name: string }> }) {
  const [keyword, setKeyword] = useState('');
  const filtered = items.filter((item) => item.name.includes(keyword));

  return (
    <>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <ul>
        {filtered.map((item) => (
          <li key={item.name}>{item.name}</li>
        ))}
      </ul>
    </>
  );
}
```

#### 4.4 反模式二：用 effect 同步 props 到 state

```tsx
// 反模式：父组件传入的 userId 被复制成本地 state，两个数据源容易不一致
import { useEffect, useState } from 'react';

function BadProfile({ userId }: { userId: string }) {
  const [localUserId, setLocalUserId] = useState(userId);

  useEffect(() => {
    setLocalUserId(userId);
  }, [userId]);

  return <p>用户：{localUserId}</p>;
}
```

绝大多数情况下直接使用 props 即可；只有“需要允许子组件在某些操作后临时偏离 props”的场景才考虑键控重置等更明确的方式。

#### 4.5 反模式三：事件逻辑错放 effect

点击后才应发生的跳转、提示、提交，应写在事件处理函数中；effect 只表达“渲染后与外部系统保持同步”。

```tsx
// 反模式概念：监听某个 state 一变就弹提示，而不是在触发它的点击事件里处理
// 正确做法：在用户点击对应按钮的事件处理函数中直接处理
```

#### 4.6 常见误区

> effect 执行顺序类似生命周期，记住几个时机就能用。

把 effect 当“生命周期钩子”会诱导按挂载/更新时机堆逻辑。应从“我在同步哪个外部系统、它的输入是什么、如何撤销”出发设计。

> 清理函数可有可无。

订阅、计时器、连接类 effect 必须提供清理；遗漏清理是“页面越用越卡”的常见来源。

### 5. useRef：可变引用与 DOM 访问

#### 5.1 定义

`useRef` 返回一个在组件生命周期内保持稳定的对象，其 `current` 属性可以保存任意值并被直接修改。修改 ref 不会触发重渲染。

#### 5.2 与 Web 的关系

两类典型用途：

- 保存不需要驱动界面的值：定时器 id、上一次的值、命令式实例。
- 访问真实 DOM：聚焦输入框、读取滚动位置、调用元素命令式方法。

```tsx
import { useEffect, useRef } from 'react';

function AutoFocusInput() {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} type="text" placeholder="挂载后自动聚焦" />;
}
```

保存定时器 id：

```tsx
import { useEffect, useRef, useState } from 'react';

function DelayedMessage() {
  const [message, setMessage] = useState('等待中');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    timerRef.current = window.setTimeout(() => setMessage('时间到'), 3000);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  return <p>{message}</p>;
}
```

保存“上一次渲染的值”：

```tsx
import { useEffect, useRef, useState } from 'react';

function PreviousValue() {
  const [count, setCount] = useState(0);
  const prevRef = useRef(count);

  useEffect(() => {
    prevRef.current = count;
  }, [count]);

  return (
    <button type="button" onClick={() => setCount((v) => v + 1)}>
      当前：{count}，上次：{prevRef.current}
    </button>
  );
}
```

#### 5.3 ref 与 state 的选择

| 特征 | state | ref |
|---|---|---|
| 修改后需要更新界面 | 是 | 否 |
| 值应在渲染中读取 | 是 | 一般不用于渲染输出 |
| 可被直接修改 | 否，走更新函数 | 是，修改 current |
| 适用对象 | 界面数据 | 句柄、id、DOM |

#### 5.4 常见误区

> ref 可以当状态用，改起来还不用写更新函数。

修改 ref 不触发渲染，界面不会响应它的变化。是否显示在界面上，是选择 state 还是 ref 的首要标准。

> 渲染期间读写 ref 没问题。

渲染期间读取的 ref 可能是过时值，写入更会造成多次渲染不一致。ref 的写入一般放在事件处理函数和 effect 中。

### 6. useMemo、useCallback 与不滥用原则

#### 6.1 定义

- `useMemo`：缓存一次计算结果，依赖不变时复用上一次结果。
- `useCallback`：缓存函数引用，依赖不变时返回同一个函数。

两者都是性能工具，不是语义必需品。去掉它们程序逻辑应仍然正确。

#### 6.2 与 Web 的关系

组件重渲染时，内部的复杂计算会重新执行；传给被记忆组件的函数每次都是新引用，可能使下游的引用比较失效。这两个 Hook 用于测量后确认存在成本的场景。

```tsx
import { useMemo, useState } from 'react';

type Row = { id: string; score: number };

function ScoreBoard({ rows }: { rows: Row[] }) {
  const [keyword, setKeyword] = useState('');

  const totalScore = useMemo(
    () => rows.reduce((sum, row) => sum + row.score, 0),
    [rows],
  );

  return (
    <section>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} />
      <p>总分：{totalScore}</p>
    </section>
  );
}
```

useCallback 稳定回调引用：

```tsx
import { memo, useCallback, useState } from 'react';

type ItemProps = {
  id: string;
  onSelect: (id: string) => void;
};

const Item = memo(function Item({ id, onSelect }: ItemProps) {
  return (
    <button type="button" onClick={() => onSelect(id)}>
      {id}
    </button>
  );
});

function ItemBoard() {
  const [selected, setSelected] = useState('');

  const handleSelect = useCallback((id: string) => {
    setSelected(id);
  }, []);

  return (
    <>
      <p>已选：{selected}</p>
      <Item id="a" onSelect={handleSelect} />
      <Item id="b" onSelect={handleSelect} />
    </>
  );
}
```

#### 6.3 决策顺序

```text
1. 先写出不加缓存的朴素实现
2. 用 Profiler 或实际数据量确认存在成本
3. 能通过减少数据规模、拆分组件解决时，优先这样做
4. 确实需要时再加 useMemo/useCallback，并保留正确依赖
```

记忆化本身也有成本：依赖比较、缓存占用和理解成本。小型计算和普通组件通常不需要。

#### 6.4 常见误区

> 给所有组件包 memo、给所有函数加 useCallback 是“最佳实践”。

没有测量依据的全包会让代码更复杂，且依赖错误时会读到旧值。它不是默认动作。

> useMemo 能保证组件不重渲染。

useMemo 只缓存值；父组件重渲染时子组件默认仍会重渲染，除非另有 memo 等机制配合。

### 7. useId、useTransition 与 useDeferredValue

#### 7.1 定义

- `useId`：生成在服务端与客户端保持一致的稳定唯一 id，常用于关联表单控件与提示。
- `useTransition`：把一次更新标记为非紧急，紧急更新（如输入）可以先呈现。
- `useDeferredValue`：延迟消费某个值，让界面先用旧值响应，再追赶新值。

#### 7.2 与 Web 的关系

手写随机 id 在服务端渲染时可能与客户端不一致，导致 hydration 警告；useId 解决这个问题。搜索、过滤等更新可能让大列表渲染变慢，并发相关 Hook 让输入保持流畅。

useId 示例：

```tsx
import { useId } from 'react';

function EmailField() {
  const id = useId();

  return (
    <div>
      <label htmlFor={id}>邮箱</label>
      <input id={id} type="email" name="email" />
    </div>
  );
}
```

同一组件需要多个 id 时可以拼接后缀：

```tsx
function PasswordFields() {
  const id = useId();

  return (
    <>
      <label htmlFor={`${id}-password`}>密码</label>
      <input id={`${id}-password`} type="password" />
      <label htmlFor={`${id}-confirm`}>确认密码</label>
      <input id={`${id}-confirm`} type="password" />
    </>
  );
}
```

useTransition 示例：

```tsx
import { useState, useTransition } from 'react';

type Product = { id: string; name: string };

function ProductFilter({ products }: { products: Product[] }) {
  // input 是紧急更新：输入框必须立刻响应
  const [input, setInput] = useState('');
  // keyword 是非紧急更新：驱动昂贵的结果渲染，可以被中断和推迟
  const [keyword, setKeyword] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleChange = (value: string) => {
    setInput(value);
    startTransition(() => {
      setKeyword(value);
    });
  };

  return (
    <div>
      <input
        value={input}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="筛选商品"
      />
      {isPending ? <p>结果更新中…</p> : <ProductResults products={products} keyword={keyword} />}
    </div>
  );
}

function ProductResults({ products, keyword }: { products: Product[]; keyword: string }) {
  const visible = products.filter((item) => item.name.includes(keyword));
  return <p>匹配 {visible.length} 件商品</p>;
}
```

useDeferredValue 示例：

```tsx
import { useDeferredValue, useMemo } from 'react';

function BigResultList({ keyword }: { keyword: string }) {
  const deferredKeyword = useDeferredValue(keyword);
  const isStale = deferredKeyword !== keyword;

  const result = useMemo(() => buildResult(deferredKeyword), [deferredKeyword]);

  return <div style={{ opacity: isStale ? 0.6 : 1 }}>{result}</div>;
}

function buildResult(keyword: string) {
  return `关于“${keyword}”的结果`;
}
```

#### 7.3 常见误区

> 用 useId 生成列表 key。

useId 用于可访问性与表单关联，列表 key 仍应使用数据中的稳定 id；useId 不替代业务标识。

> 加了 useTransition 就等于开了后台线程。

JavaScript 仍在同一线程执行，transition 只是允许 React 中断和推迟这次渲染，优先处理紧急更新；它不解决单次计算本身的复杂度问题。

### 8. 自定义 Hook 与状态五分类

#### 8.1 自定义 Hook 的定义

自定义 Hook 是以 `use` 开头的函数，内部可以调用其他 Hook，把“状态 + 操作状态的逻辑”打包复用。它复用的是状态逻辑，不是状态本身：每次调用各自独立。

#### 8.2 与 Web 的关系

多个组件都需要“切换开关”“订阅窗口尺寸”“读写本地存储”时，复制逻辑会造成行为漂移，自定义 Hook 提供单一实现。

```tsx
import { useCallback, useState } from 'react';

function useToggle(initial = false) {
  const [open, setOpen] = useState(initial);

  const toggle = useCallback(() => setOpen((value) => !value), []);
  const openPanel = useCallback(() => setOpen(true), []);
  const closePanel = useCallback(() => setOpen(false), []);

  return { open, toggle, openPanel, closePanel };
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const { open, toggle } = useToggle(false);

  return (
    <div>
      <button type="button" onClick={toggle} aria-expanded={open}>
        {question}
      </button>
      {open && <p>{answer}</p>}
    </div>
  );
}
```

封装本地存储：

```tsx
import { useEffect, useState } from 'react';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : initialValue;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

#### 8.3 状态五分类

| 类型 | 示例 | 推荐位置 |
|---|---|---|
| 本地状态 | 弹窗开关、输入草稿、当前 Tab | useState，放在使用组件 |
| URL 状态 | 搜索词、分页、筛选、详情 id | 路由参数与查询参数 |
| 全局客户端状态 | 主题、语言、当前用户权限 | Context 或状态库，尽量少 |
| 服务端状态 | 列表、详情、远程配置 | TanStack Query |
| 派生状态 | 过滤结果、总数、是否可提交 | 渲染中直接计算 |

归属决策流程：

```text
这个值能从已有数据算出来吗？
    能 → 派生状态，不存储
它来自服务器吗？
    是 → 服务端状态，用 Query
需要可分享、可收藏、可回退吗？
    是 → URL 状态
有很多相距很远的组件同时使用吗？
    是 → 全局客户端状态
否则 → 本地状态，放在最近的使用处
```

#### 8.4 状态提升与下放

- 多个兄弟组件共享一个值：把状态提升到它们最近的共同父组件。
- 只有一个组件使用的值：下放回该组件，减少无关重渲染。
- Context 适合传递低频变化的依赖（主题、语言、客户端实例），不应把高频变化的整张表单塞进全局 Context。

#### 8.5 常见误区

> 两个组件调用同一个自定义 Hook 会共享状态。

自定义 Hook 不是全局 store，每次调用建立各自独立的状态。需要共享时，应由共同父组件调用 Hook 并通过 props 下发，或使用全局方案。

> 所有状态都放全局最方便，省得提升来提升去。

全局化会扩大重渲染范围、模糊数据归属。应先用决策流程判断，确属跨区域共享再提升到全局。

## 课后题

1. Hooks 的两条规则是什么？为什么条件调用 Hook 会导致状态错乱？
2. 场景分析：一段代码在同一事件里连续三次调用 `setCount(count + 1)`，界面只增加了 1。请解释原因并修改。
3. 为什么更新对象和数组要使用不可变方式？请写出“更新数组第二项”和“删除指定 id”的不可变写法。
4. `useEffect` 的正确定位是什么？请举出两个“确实该用 effect”和两个“不该用 effect”的例子。
5. 场景分析：组件里用 useEffect 监听 `keyword`，每次变化后 set 一个 `filtered` 状态。请指出为什么多余，并改写成一行派生计算。
6. 依赖数组为空数组、不传、传具体依赖，分别表示什么？effect 中用了 `roomId` 却不写进依赖会怎样？
7. 场景分析：一个弹窗组件每次关闭再打开，控制台里同一次按钮点击触发了越来越多次请求。最可能漏了什么？如何修复？
8. useRef 与 useState 有什么区别？为什么 ref 不适合存储需要显示在界面上的值？
9. 场景分析：同事给所有组件都加了 `memo`、所有函数都加了 `useCallback`，代码变长但页面没有明显变快。请分析原因，并给出正确的性能优化流程。
10. 请对一个“带搜索、分页、主题切换、商品详情、收藏按钮”的页面列出至少 8 个状态点，按五分类标注归属并说明理由。

## 实践练习题

### 练习 1：多状态表单与不可变更新

#### 任务

实现一个包含姓名、城市、兴趣标签的注册小表单，使用一个表单状态对象和多个独立 UI 状态，所有更新走不可变方式。

#### 步骤约束

1. 表单状态包含 `name`、`city`、`agreed`、`tags` 四个字段。
2. 姓名和城市使用受控输入，更新时展开旧对象生成新对象。
3. 兴趣标签支持添加和删除，使用展开和 filter，不允许直接 push 或 splice 原数组。
4. 派生一个 `canSubmit` 值：姓名非空且已同意协议，直接在渲染中计算。
5. 提交按钮在不可提交时禁用，并在标题区域实时显示字符计数。
6. 通过构建检查，无 TypeScript 报错。

#### 提交物

- 表单组件代码；
- 不可变更新点的注释说明；
- 不同填写状态截图；
- canSubmit 派生逻辑说明。

#### 验收标准

- 不出现对状态对象和数组的直接修改；
- canSubmit 完全由数据计算；
- 标签增删后界面正确；
- 禁用态与字符计数实时准确；
- 构建通过。

### 练习 2：useEffect 同步外部系统练习

#### 任务

实现一个“在线状态与秒表”小组件，分别练习事件订阅、定时器和清理函数。

#### 步骤约束

1. 使用 `useEffect` 订阅浏览器 `online` / `offline` 事件，显示当前网络状态，卸载时移除监听。
2. 使用定时器实现每秒加一的秒表，提供开始、暂停、重置按钮，暂停时清除定时器。
3. 定时器 id 使用 `useRef` 保存，不放进渲染状态。
4. 编写一个 `useWindowWidth` 自定义 Hook 并在页面显示窗口宽度。
5. 反复切换标签页隐藏和显示组件，用控制台证据证明监听与定时器没有叠加。
6. effect 依赖数组必须与实际使用的值一致。

#### 提交物

- 三个模块的代码；
- 网络切换与秒表演示截图；
- 清理函数执行的控制台证据；
- 依赖数组说明。

#### 验收标准

- 网络状态随浏览器切换更新；
- 暂停后秒数不再增长，重置归零；
- 不存在重复监听和多重定时器；
- ref 使用合理；
- 依赖数组无遗漏。

### 练习 3：抽出自定义 Hook 与状态归属重构

#### 任务

把练习中重复出现的开关逻辑抽成 `useToggle`，再新建一个页面同时管理筛选、主题和收藏，并提交状态归属表。

#### 步骤约束

1. 抽取 `useToggle(initial)`，返回 `open`、`toggle`、`openPanel`、`closePanel`，至少在两个不同组件中使用。
2. 页面包含：侧边栏开关、深色模式开关、仅看收藏筛选、搜索输入。
3. 搜索关键词和仅看收藏需在地址栏中可观察地体现（使用 URL 查询参数或在说明中描述目标设计）。
4. 筛选结果通过派生计算，不新增结果 state。
5. 编写状态归属表，至少列出 10 个状态点并标注五分类。
6. 在 README 中解释每个状态为什么放在对应位置。

#### 提交物

- `useToggle` 与页面代码；
- 状态归属表；
- 两种开关场景截图；
- 筛选派生逻辑与 URL 设计说明。

#### 验收标准

- 两个组件使用同一个 Hook 但状态互不影响；
- 派生结果不重复存储；
- 状态分类正确，无“全部全局”的设计；
- 归属表不少于 10 个状态点；
- 解释能对应决策流程。

## 阶段验收作业

### 作业名称

Hooks 驱动的“设置中心”与状态设计说明书

### 作业场景

团队要求你实现一个纯前端设置中心：包含通知开关、外观偏好、个人资料表单和一个实时预览区，并在动手前先完成状态归属设计。该作业重点验证 Hooks 理解是否准确，尤其是 useEffect 是否只用于同步外部系统。

### 提交物

```text
settings-center/
├── src/
│   ├── components/
│   │   ├── ToggleRow.tsx
│   │   ├── ProfileForm.tsx
│   │   ├── AppearanceCard.tsx
│   │   └── NetworkStatusBar.tsx
│   ├── hooks/
│   │   ├── useToggle.ts
│   │   ├── useLocalStorage.ts
│   │   └── useOnlineStatus.ts
│   ├── pages/
│   │   └── SettingsPage.tsx
│   ├── types/
│   │   └── settings.ts
│   ├── App.tsx
│   └── main.tsx
├── state-design.md
└── README.md
```

必做内容：

1. 通知开关至少三项，使用 `useToggle` 实现，偏好通过 `useLocalStorage` 持久化。
2. 外观卡片支持浅色、深色、跟随系统三种模式，切换后页面立即响应。
3. 资料表单包含昵称、简介，派生昵称字符计数和“可保存”状态；保存动作由事件处理。
4. 网络状态栏订阅浏览器 online/offline 事件，正确清理监听。
5. `state-design.md` 包含状态五分类归属表（不少于 12 个状态点）与数据流说明。
6. 不允许用 useEffect 实现派生计算或把点击后才发生的动作放进 effect。

### 演示步骤

学员在 15 分钟内完成：

1. 启动项目，展示设置中心完整界面。
2. 切换通知开关与外观模式，刷新页面证明本地存储生效。
3. 在 React DevTools 中指出各状态与重渲染。
4. 切换浏览器网络状态，展示状态栏变化。
5. 填写资料表单，展示字符计数与可保存状态的派生过程。
6. 讲解 state-design.md 中两个状态的归属理由。
7. 回答导师追问：指出代码中每个 useEffect 分别在同步哪个外部系统。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| Hooks 规则与 useState | 20 | Hook 均在顶层调用，不可变更新与函数式更新正确 |
| useEffect 理解 | 25 | 只用于同步外部系统，依赖正确，清理完整，无反模式 |
| useRef 与其他 Hook | 15 | ref 用于句柄与 DOM，useId 正确，无盲目记忆化 |
| 自定义 Hook | 15 | useToggle 等抽象合理，复用逻辑清晰、类型完整 |
| 状态分类与设计文档 | 15 | 五分类正确，状态点充足，数据流说明清楚 |
| 工程规范 | 10 | 构建通过，README 可复现，代码整洁 |

细分评分：

- Hooks 规则与 useState：规则 6 分，不可变更新 8 分，函数式更新 6 分。
- useEffect：定位 8 分，依赖数组 8 分，清理 5 分，无反模式 4 分。
- useRef 与其他 Hook：useRef 5 分，useId 4 分，useTransition/useDeferredValue 概念 3 分，克制使用 memo 3 分。
- 自定义 Hook：抽象质量 8 分，独立性 4 分，类型 3 分。
- 状态分类：归属表 8 分，决策理由 7 分。
- 工程规范：构建 4 分，README 3 分，整洁 3 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过：

1. 在条件或循环中调用 Hook，破坏调用顺序。
2. 直接修改 state 中的对象或数组后回传同一引用。
3. useEffect 缺少必要清理，导致重复订阅或叠加定时器。
4. 用 useEffect 实现派生计算、props 同步复制或点击事件逻辑。
5. 对全部组件和函数无依据地使用 memo/useMemo/useCallback，经询问无法给出测量依据。
6. 状态归属表中把服务端状态、派生状态错误地全部归入全局状态。
7. 项目无法按 README 启动或存在未处理的 TypeScript 错误。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 遵守 Hooks 规则 | 全部组件代码与 lint 结果 |
| 掌握 useState 与不可变更新 | ProfileForm、通知开关代码 |
| 正确定位 useEffect | NetworkStatusBar 及现场逐个说明 |
| 会写依赖与清理 | 在线状态订阅、存储同步代码 |
| 正确使用 useRef/useId 等 | DOM 访问、表单关联与演示 |
| 不滥用记忆化 | 代码审查与“测量依据”问答 |
| 抽出自定义 Hook | useToggle、useLocalStorage、useOnlineStatus |
| 完成状态归属决策 | state-design.md 五分类表 |

### 提交前自检

- [ ] 所有 Hook 均在组件或自定义 Hook 顶层调用。
- [ ] 对象和数组更新全部生成了新引用。
- [ ] 每个 useEffect 都能回答“同步哪个外部系统、依赖什么、如何清理”。
- [ ] 订阅与定时器都有对应清理函数。
- [ ] 派生值在渲染中计算，没有多存一份 state。
- [ ] 自定义 Hook 命名以 use 开头，多次调用状态相互独立。
- [ ] 记忆化优化能给出依据，依赖数组完整。
- [ ] 状态归属表不少于 12 个状态点。
- [ ] `npm run build` 无错误，README 可指导复现。
