# 17-React 心智模型、组件与 Props

## 目标

完成本知识单元后，学员应建立 React 的第一套心智模型，而不是只记住几个标签名。

学员应能够：

1. 用自己的语言解释声明式 UI 与命令式 DOM 操作的区别，说明 React 为什么选择声明式。
2. 写出并解释 `UI = f(state)`，说明状态变化、重新渲染与真实 DOM 更新之间的关系。
3. 画出一棵组件树，识别根组件、父组件、子组件和组件边界，描述单向数据流。
4. 遵守 JSX 语法规则编写标签，使用 TypeScript 定义函数组件与 props 类型。
5. 使用 props、children 和组合模式搭建页面，正确实现条件渲染与列表渲染并理解 key。
6. 依据纯渲染原则判断组件是否需要拆分，并说明某个状态应该放在组件树的哪一层。

本单元只涉及组件与 props，不涉及 Hooks 的内部细节。Hooks、路由和服务端状态将在后续三个单元分别展开。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| React 19 | 构建用户界面的库 | 理解声明式、组件、props 与渲染 |
| Vite | 本地开发服务器与构建工具 | 能创建项目、启动开发服务器、执行构建 |
| TypeScript | 为组件和 props 提供静态类型 | 能为 props 定义 type 或 interface |
| Node.js 当前 LTS | 运行 Vite 与包管理 | 能安装依赖并执行 npm 脚本 |
| npm | 安装和管理依赖 | 能使用 npm install、npm run dev |
| React DevTools | 观察组件树与 props | 能在浏览器中查看组件层级和实时 props |

创建项目的命令：

```bash
npm create vite@latest react-mental-model -- --template react-ts
cd react-mental-model
npm install
npm run dev
```

说明：

- 课程统一使用函数组件，不以 class component 作为主线。
- 不使用 Create React App 创建新项目。
- TypeScript 配置以 Vite 模板默认值为准，本单元不要求自定义复杂编译选项。
- 版本号不是考点；遇到 API 行为差异时，以当前安装版本的官方文档为准。

## 详细的理论知识讲解和示例伪代码

### 1. 声明式 UI：描述“结果”而不是“步骤”

#### 1.1 定义

命令式编程要求开发者一步步告诉计算机“怎么做”：先找到哪个元素、再创建什么节点、然后修改哪个属性、最后把节点挂到哪里。声明式编程只描述“在当前数据下界面应该长什么样”，由框架负责把界面变成那个样子。

React 是声明式的 UI 库。开发者写的是“当数据是 X 时，页面应该显示 X 对应的结构”，而不是“数据变了以后先删哪个 DOM 节点再插哪个节点”。

#### 1.2 与 Web 的关系

浏览器原生只提供命令式的 DOM API。不用框架时，切换一条提示消息通常需要这样写：

```js
const banner = document.querySelector('#banner');

if (user.isVip) {
  banner.textContent = '欢迎回来，尊贵会员';
  banner.className = 'banner banner-vip';
  banner.hidden = false;
} else {
  banner.textContent = '欢迎回来';
  banner.className = 'banner';
  banner.hidden = false;
}
```

随着交互变多，代码里会散落大量“先查节点、再判断、再改属性”的步骤，且很难保证每条分支都把 DOM 改全。同一个结果用 React 表达，只描述界面与数据的对应关系：

```tsx
type BannerProps = {
  isVip: boolean;
};

function Banner({ isVip }: BannerProps) {
  return (
    <div className={isVip ? 'banner banner-vip' : 'banner'}>
      {isVip ? '欢迎回来，尊贵会员' : '欢迎回来'}
    </div>
  );
}
```

不需要手动查找节点，也不需要手动处理“隐藏再显示”。当 `isVip` 变化时，React 会让真实 DOM 与新的描述保持一致。

#### 1.3 常见误区

> 用了 React 就完全不能碰 DOM。

声明式是主线，但确实存在需要读取焦点、滚动位置或对接第三方 DOM 库的场景，这些将在 useRef 相关内容中处理。业务 UI 的更新应默认通过状态与 JSX 表达，而不是随手 `document.querySelector` 改内容。

> 声明式等于不用写逻辑。

声明式描述的是“结果与数据的映射”，条件判断、循环和数据转换仍然要写，只是写在组件里而不是写成一串 DOM 操作步骤。

### 2. UI = f(state)：React 的核心公式

#### 2.1 定义

React 应用可以概括为：

```text
UI = f(state)
```

含义是：界面是状态经过渲染函数计算后的结果。给定相同的输入（state 与 props），渲染函数应产出相同的输出（界面结构）。

一次典型更新链路：

```text
用户交互或外部数据变化
        ↓
状态发生改变
        ↓
React 调用组件函数，重新计算界面描述
        ↓
React 对比新旧描述，把差异更新到真实 DOM
        ↓
用户看到新界面
```

#### 2.2 与 Web 的关系

在传统 jQuery 风格代码中，状态（数据）和界面（DOM）是两份需要手动保持同步的东西，任何一次忘记同步都会出现“数据已经变了，页面还显示旧内容”的 bug。React 把 DOM 变成状态的“计算结果”，开发者只维护状态这一份事实来源。

```tsx
import { useState } from 'react';

type LikeButtonProps = {
  initialLikes: number;
};

function LikeButton({ initialLikes }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);

  return (
    <button type="button" onClick={() => setLikes((value) => value + 1)}>
      点赞（{likes}）
    </button>
  );
}
```

开发者只调用 `setLikes` 修改数字，不直接改按钮文字。按钮上显示的数字永远是 `likes` 的计算结果。

#### 2.3 纯渲染

组件的渲染过程应尽量是纯函数：

- 相同输入总是得到相同输出；
- 渲染过程中不修改渲染前就存在的变量；
- 不在渲染期间发起请求、操作计时器或直接修改 DOM。

```tsx
// 不纯粹：渲染期间修改了外部变量，多次渲染结果会互相污染
let renderCount = 0;

function BadCard({ title }: { title: string }) {
  renderCount = renderCount + 1;
  return <div data-count={renderCount}>{title}</div>;
}
```

```tsx
// 纯粹：输出完全由输入决定
function GoodCard({ title }: { title: string }) {
  return <div>{title}</div>;
}
```

#### 2.4 常见误区

> 状态一变，整个页面的 DOM 都会被销毁重建。

React 默认会重新调用受影响的组件函数计算描述，但在更新真实 DOM 时只改动有差异的部分。React 的价值之一就是帮你做这件最小化的 DOM 更新。

> 渲染时可以顺便修改一下别的变量。

渲染可能被暂停、重试或丢弃，渲染期间产生的副作用没有可靠的执行时机。需要与外部系统同步时应使用后续单元讲解的 `useEffect` 等机制。

### 3. 组件树与组件边界

#### 3.1 定义

一个 React 应用由许多组件嵌套组成，组件之间的嵌套关系构成组件树。最顶层的组件称为根组件，被其他组件渲染的组件称为子组件，渲染它的组件称为父组件。

```text
App
├── Header
│   ├── Logo
│   └── UserMenu
├── MainLayout
│   ├── Sidebar
│   │   └── NavList
│   └── Content
│       ├── ItemList
│       │   └── ItemCard
│       └── Pagination
└── Footer
```

#### 3.2 与 Web 的关系

组件树对应最终 DOM 树的大致结构，但组件是 JavaScript 概念，DOM 节点是浏览器概念。一个组件可以输出一个 DOM 节点，也可以输出一组节点或不输出任何节点。

```tsx
type Item = {
  id: string;
  title: string;
};

type ItemListProps = {
  items: Item[];
};

export function ItemList({ items }: ItemListProps) {
  return (
    <ul>
      {items.map((item) => (
        <ItemCard key={item.id} title={item.title} />
      ))}
    </ul>
  );
}

function ItemCard({ title }: { title: string }) {
  return (
    <li>
      <h3>{title}</h3>
    </li>
  );
}
```

`ItemList` 不关心卡片内部结构，`ItemCard` 也不关心数据从哪里来。这种分工就是组件边界。

#### 3.3 边界划分的判断依据

划边界时可以问四个问题：

1. 这段 UI 是否在多个页面重复出现？重复出现适合抽成组件。
2. 这个组件是否承担了两类职责？例如同时负责请求数据和渲染复杂表单，可考虑拆分。
3. 这个 props 是否只被子组件中的某一部分使用？可能说明组件层级需要调整。
4. 命名是否困难？一个组件难以用一个准确名词命名，往往说明职责过多。

常见的组件分层：

```text
页面组件：组织数据与布局，例如 ItemListPage
复用组件：与业务无关或弱相关，例如 Button、Modal、EmptyState
业务组件：表达明确业务概念，例如 ItemCard、UserMenu
```

#### 3.4 常见误区

> 组件拆得越细越好。

拆分是为了降低复杂度、提高复用性。过早拆出大量只有一处使用、命名勉强的组件，会增加跳转成本。先保证职责清晰，再在复用或复杂度过高时拆分。

> 子组件可以直接读取父组件的变量。

React 中数据通过 props 显式向下传递，子组件无法隐式访问父组件内部变量。显式传递让数据来源可追踪。

### 4. JSX 语法规则与本质

#### 4.1 定义

JSX 是一种类似 HTML 的 JavaScript 语法扩展，让开发者可以在 JavaScript 中直接书写界面结构。JSX 不是字符串，也不是模板语言，它会被编译工具转换成普通的 JavaScript 函数调用。

```text
<h3 className="title">知识卡片</h3>
```

在概念上等价于创建一个描述对象的函数调用，开发者日常直接书写 JSX 即可，不需要手写转换后的调用。

#### 4.2 与 Web 的关系

JSX 看起来像 HTML，但它最终描述的是 DOM，因此有一套必须遵守的规则：

- 所有标签必须闭合，自闭合标签写成 `<img />` 而不是 `<img>`。
- 使用 `className` 而不是 `class`，使用 `htmlFor` 而不是 `for`。
- 属性使用驼峰命名，例如 `onClick`、`tabIndex`、`strokeWidth`。
- 一个组件的返回值在有多个根节点时需要包裹，可以使用 `div`，也可以使用不产生额外 DOM 节点的 Fragment。

```tsx
import { Fragment } from 'react';

function ArticleMeta() {
  return (
    <Fragment>
      <dt>标题</dt>
      <dd>React 入门</dd>
      <dt>分类</dt>
      <dd>前端</dd>
    </Fragment>
  );
}
```

Fragment 的短语法是空标签：

```tsx
function Columns() {
  return (
    <>
      <td>左侧</td>
      <td>右侧</td>
    </>
  );
}
```

#### 4.3 在 JSX 中使用表达式

花括号中可以放任意合法的 JavaScript 表达式：

```tsx
type PriceTagProps = {
  price: number;
  currency?: string;
};

function PriceTag({ price, currency = 'CNY' }: PriceTagProps) {
  return (
    <span title={`币种：${currency}`}>
      {currency} {price.toFixed(2)}
    </span>
  );
}
```

花括号里只能放表达式，不能直接放 `if` 语句；条件逻辑应使用三元表达式、与运算或在 return 之前计算好变量。

#### 4.4 常见误区

> JSX 就是 HTML，可以原样复制网页代码。

HTML 中合法的 `class`、`for`、未闭合标签在 JSX 中会报错或行为不同；注释语法也不同，JSX 注释要写在花括号里：`{/* 注释内容 */}`。

> 花括号里可以写任何 JavaScript。

花括号里只能写表达式，语句不会通过编译。布尔值、`null` 和 `undefined` 在 JSX 中默认不渲染任何内容，这一特性常用于条件渲染。

### 5. 函数组件与 TypeScript 类型

#### 5.1 定义

函数组件就是一个返回 JSX 的普通函数。组件名必须以大写字母开头，React 据此区分自定义组件与原生 HTML 标签。

```tsx
function Greeting() {
  return <p>你好，学员</p>;
}

export function App() {
  return (
    <main>
      <Greeting />
    </main>
  );
}
```

#### 5.2 与 Web 的关系

组件最终渲染为 DOM，TypeScript 在编译阶段帮助检查 props 是否传全、类型是否正确，减少运行时才发现的界面错误。

```tsx
type UserBadgeProps = {
  name: string;
  level: number;
  isOnline: boolean;
};

export function UserBadge({ name, level, isOnline }: UserBadgeProps) {
  return (
    <div className="badge">
      <span className={isOnline ? 'dot dot-online' : 'dot'} aria-hidden="true" />
      <span>{name}</span>
      <span>Lv.{level}</span>
    </div>
  );
}
```

可选 props 用问号标记，并为没有传值的情况提供默认行为：

```tsx
type SectionTitleProps = {
  text: string;
  align?: 'left' | 'center' | 'right';
};

function SectionTitle({ text, align = 'left' }: SectionTitleProps) {
  return <h2 style={{ textAlign: align }}>{text}</h2>;
}
```

事件处理也可以标注类型，常见的 DOM 事件类型由 React 提供：

```tsx
function SearchBox() {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log(event.target.value);
  };

  return <input type="search" onChange={handleChange} aria-label="搜索" />;
}
```

#### 5.3 常见误区

> 组件名小写也能正常渲染。

小写名字会被当作 HTML 标签处理，例如 `<greeting />` 不会被识别为自定义组件。组件、组件类型和文件都应使用一致的大驼峰命名。

> 给 props 全部标记成可选最省事。

大量可选 props 会让类型保护失效，也会掩盖“这个组件到底需要什么”的设计问题。必填值应标成必填，缺失时让编译器报错。

### 6. Props 与单向数据流

#### 6.1 定义

props 是父组件传给子组件的只读输入。React 的数据流是单向的：数据从父组件流向子组件，子组件不能修改收到的 props，需要改变数据时调用父组件通过 props 传下来的回调函数。

```text
父组件状态
   ↓ props（数据）
子组件展示
   ↓ 回调（事件通知）
父组件修改状态
   ↓ 新的 props
子组件重新渲染
```

#### 6.2 与 Web 的关系

单向数据流让界面变化可预测：看到一个显示错误的值，可以沿着组件树向上追踪它来自哪个父组件的状态，而不是在任意组件里搜索谁改过它。

```tsx
import { useState } from 'react';

type CounterProps = {
  count: number;
  onIncrement: () => void;
};

function Counter({ count, onIncrement }: CounterProps) {
  return (
    <button type="button" onClick={onIncrement}>
      当前计数：{count}
    </button>
  );
}

export function CounterPage() {
  const [count, setCount] = useState(0);

  return (
    <Counter
      count={count}
      onIncrement={() => setCount((value) => value + 1)}
    />
  );
}
```

状态归 `CounterPage` 所有，`Counter` 只负责展示与上报点击事件。

#### 6.3 props 的只读性

```tsx
type ProfileProps = {
  profile: { name: string };
};

// 错误：直接修改 props 对象
function BadProfile({ profile }: ProfileProps) {
  profile.name = profile.name + '（已修改）';
  return <span>{profile.name}</span>;
}
```

```tsx
// 正确：需要变化时通过回调通知父组件，由父组件更新状态
type ProfileProps = {
  profile: { name: string };
  onRename: (name: string) => void;
};

function GoodProfile({ profile, onRename }: ProfileProps) {
  return (
    <button type="button" onClick={() => onRename('新的名字')}>
      {profile.name}
    </button>
  );
}
```

props 透传：当中间组件不使用某个 props，只负责继续向下传时，可以在类型中显式写出，保持数据路径可读：

```tsx
type LayoutProps = {
  userName: string;
};

function Layout({ userName }: LayoutProps) {
  return (
    <div>
      <Header userName={userName} />
    </div>
  );
}

function Header({ userName }: { userName: string }) {
  return <header>当前用户：{userName}</header>;
}
```

#### 6.4 常见误区

> 子组件改不了数据，只能什么都通知父组件，很麻烦。

展示与修改权分离是可维护性的来源。确实只属于子组件的临时状态应放在子组件内部，不需要全部提升到父组件；判断标准是状态被哪些组件共享。

> 把整个父组件的状态对象一股脑传下去更省事。

过宽的 props 会让子组件与父组件结构强耦合，也让“谁在用哪个字段”变得不清晰。应只传递子组件真正需要的数据与回调。

### 7. children 与组件组合

#### 7.1 定义

`children` 是一个特殊 prop，表示组件标签之间包裹的内容。它让父组件可以把任意 JSX 作为内容传给通用外壳组件，这种用法称为组合。

#### 7.2 与 Web 的关系

组合非常适合实现卡片、弹窗、布局容器这类“外壳固定、内容可变”的组件，类似 HTML 元素可以包裹任意子元素。

```tsx
import type { ReactNode } from 'react';

type CardProps = {
  title: string;
  children: ReactNode;
};

function Card({ title, children }: CardProps) {
  return (
    <section className="card">
      <h2 className="card-title">{title}</h2>
      <div className="card-body">{children}</div>
    </section>
  );
}

export function Dashboard() {
  return (
    <Card title="本周概览">
      <p>新增条目 12 条</p>
      <button type="button">查看详情</button>
    </Card>
  );
}
```

`children` 的类型常用 `ReactNode`，它表示可以渲染的内容：元素、字符串、数字、数组、`null` 等。

#### 7.3 多个插槽

复杂外壳可以约定多个具名“插槽”，而不是只用一个 children：

```tsx
import type { ReactNode } from 'react';

type DialogProps = {
  header: ReactNode;
  body: ReactNode;
  footer: ReactNode;
};

function Dialog({ header, body, footer }: DialogProps) {
  return (
    <div className="dialog" role="dialog" aria-modal="true">
      <div className="dialog-header">{header}</div>
      <div className="dialog-body">{body}</div>
      <div className="dialog-footer">{footer}</div>
    </div>
  );
}

export function ConfirmDeleteDialog() {
  return (
    <Dialog
      header={<h2>删除确认</h2>}
      body={<p>删除后不可恢复，确定继续吗？</p>}
      footer={
        <>
          <button type="button">取消</button>
          <button type="button">删除</button>
        </>
      }
    />
  );
}
```

组合优于继承：React 中复用界面与行为的主要方式是组合组件和复用函数（含后续单元的自定义 Hook），不使用类继承层级。

#### 7.4 常见误区

> children 一定是一个元素。

children 可能是字符串、元素、数组，也可能没有传。需要对 children 做判断时，使用 `Children` 工具或检查是否存在，不要假设它总是单个 React 元素。

> 通用容器要通过大量布尔 props 控制内部显示什么。

当一个组件出现 `showHeader`、`showFooter`、`headerMode` 这类越来越多的开关时，往往说明应该改用组合，让调用方直接传入要显示的内容。

### 8. 条件渲染、列表渲染与 key

#### 8.1 定义

条件渲染是根据数据决定显示哪一部分界面；列表渲染是根据数组批量生成一组结构相似的元素。key 是 React 在列表中识别每个元素身份的标识。

#### 8.2 与 Web 的关系

Web 页面大量内容来自数组数据：导航、搜索结果、表格行。React 用数组的 `map` 生成元素，用 key 跟踪每个元素在更新前后的对应关系。

```tsx
type Status = 'loading' | 'success' | 'error';

function StatusPanel({ status }: { status: Status }) {
  if (status === 'loading') {
    return <p>加载中…</p>;
  }

  if (status === 'error') {
    return <p role="alert">加载失败，请稍后重试</p>;
  }

  return <p>加载完成</p>;
}
```

列表渲染：

```tsx
type Tag = {
  id: string;
  name: string;
  count: number;
};

type TagListProps = {
  tags: Tag[];
};

export function TagList({ tags }: TagListProps) {
  return (
    <ul>
      {tags.map((tag) => (
        <li key={tag.id}>
          {tag.name}（{tag.count}）
        </li>
      ))}
    </ul>
  );
}
```

#### 8.3 key 的作用

key 帮助 React 判断“这次渲染的某个元素，和上次渲染的哪个元素是同一个”。

- 列表会重新排序、在头部插入、删除中间项时，应使用数据中稳定且唯一的字段作为 key，例如业务 id。
- 同一个数组中 key 不能重复。
- key 只需要在兄弟节点之间唯一，不需要全局唯一。

```tsx
// 场景：可以在列表头部插入数据
type Article = { id: string; title: string };

function ArticleList({ articles }: { articles: Article[] }) {
  return (
    <ul>
      {articles.map((article) => (
        <li key={article.id}>{article.title}</li>
      ))}
    </ul>
  );
}
```

数组下标作为 key，只在列表永远不会重新排序、插入和删除时才安全；可变列表使用下标会导致状态错位和不必要的 DOM 更新。

#### 8.4 空列表与条件组合

渲染列表时应同时考虑空态，避免数据为空时页面只剩一个标题：

```tsx
function ItemList({ items }: { items: Article[] }) {
  if (items.length === 0) {
    return <p className="empty">暂无数据，换个关键词试试</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}
```

#### 8.5 常见误区

> key 只是为了消除控制台警告，可以随便填。

key 直接影响 React 对元素身份的判断。重复 key 会报警告，错误的 key 会让输入框焦点、组件状态跟随错误的数据行。

> 用 `items.map` 时不加 return 或忘记返回元素。

箭头函数使用花括号时必须显式返回元素；使用括号隐式返回时注意不要漏写 key。

> 条件渲染用 `&&` 时数字 0 不显示。

`0 && <Component />` 的结果是数字 `0`，React 会把 0 渲染成文字。条件应写成 `count > 0 && <Component />` 或先转成布尔值。

## 课后题

1. 用自己的话解释命令式 DOM 操作与声明式 UI 的区别，并举一个日常交互（例如开关弹窗）说明两者写法差异。
2. 请解释 `UI = f(state)`。如果同一个 state 两次渲染得到了不同的界面，通常说明组件存在什么问题？
3. 某页面数据已经更新，但 DOM 仍显示旧内容。在 React 的心智模型下，应优先检查哪些环节？
4. 场景分析：一个同事在组件函数里直接调用 `document.querySelector` 修改另一个区域的文字。请指出风险，并给出符合 React 模型的替代方案。
5. props 为什么是只读的？子组件希望修改父组件的数据时，正确的协作方式是什么？请画出数据流。
6. 场景分析：一个 `Panel` 组件有 `showClose`、`closable`、`mode`、`variant` 等十几个布尔 props，每加一个需求就多一个开关。请分析问题并给出重构方向。
7. JSX 中 `class`、`for` 为什么不能直接使用？请写出对应的正确属性名，并再举出两个驼峰命名的属性。
8. 场景分析：一个待办列表支持在任意位置插入和删除，代码使用数组下标作为 key，用户在第一行输入了一半内容后在顶部新增一条，输入框内容“跑到了”第二行。请解释原因和修复方法。
9. `children` 的类型为什么通常写成 `ReactNode` 而不是 `ReactElement`？请举例说明两者覆盖范围差异。
10. 场景分析：一个页面组件同时负责导航布局、筛选表单、列表渲染和单条卡片的所有细节，超过 600 行。请依据组件边界原则提出拆分方案，说明每一层职责。

## 实践练习题

### 练习 1：静态个人资料卡与组件树

#### 任务

使用 Vite 创建 React + TypeScript 项目，用至少 5 个组件拼出一张静态个人资料页，包含头像、姓名、标签列表、简介和操作按钮。

#### 步骤约束

1. 使用 `npm create vite` 的 react-ts 模板创建项目。
2. 至少拆分为 `Avatar`、`UserInfo`、`TagList`、`ActionBar`、`ProfileCard` 五个组件。
3. 姓名、标签、简介等数据从 `ProfileCard` 通过 props 向下传递，子组件不写死业务数据。
4. 使用 React DevTools 截图组件树，确认层级关系。
5. 所有组件使用 TypeScript 显式声明 props 类型。
6. 执行 `npm run build`，确认没有类型和构建错误。

#### 提交物

- 完整项目目录；
- 组件树截图或文本图；
- 启动与构建命令记录；
- 一份简短的 props 流向说明。

#### 验收标准

- 组件数量与拆分符合要求；
- props 类型齐全，无 TypeScript 报错；
- 数据集中在顶层组件，子组件不互相直接读取数据；
- 页面在桌面与手机宽度下都不出现横向滚动；
- 构建可以成功完成。

### 练习 2：可交互的知识条目列表（条件与列表渲染）

#### 任务

在练习 1 的项目中新增一个知识条目列表模块：父组件维护一个条目数组，支持“收藏”切换，并实现收藏筛选。

#### 步骤约束

1. 定义 `KnowledgeItem` 类型，至少包含 `id`、`title`、`summary`、`favorite` 字段，准备不少于 8 条初始数据。
2. 使用 `map` 渲染列表，key 必须使用条目 id。
3. 点击“收藏”按钮时，通过父组件传入的回调更新对应条目，子组件不得直接修改 props。
4. 提供“全部 / 仅看收藏”两个筛选按钮，使用条件渲染切换当前展示的数组。
5. 筛选结果为空时显示空态文案，不允许出现空白区域。
6. 收藏按钮需包含可读的 `aria-label` 或可见文字。

#### 提交物

- 列表相关组件代码；
- 收藏与筛选的数据流说明；
- 全部、有收藏结果、空收藏结果三种状态截图；
- 类型检查结果。

#### 验收标准

- key 使用稳定 id；
- 收藏状态更新后界面立即变化；
- 空态可稳定复现；
- 子组件保持只读；
- 不存在下标 key、未闭合标签等问题。

### 练习 3：组合式弹窗外壳

#### 任务

实现一个可复用的 `Modal` 外壳组件，内部结构固定，但标题、正文和底部操作通过组合传入，并在一个演示页面中用它承载“删除确认”和“分享链接”两种不同内容。

#### 步骤约束

1. `Modal` 使用组合接收内容：标题区和底部区使用具名 props，正文使用 `children`。
2. 外壳需包含遮罩层、关闭按钮和正确的 `role="dialog"`、`aria-modal="true"` 属性。
3. 演示页面至少渲染两个不同内容的弹窗场景，由两个按钮分别控制打开。
4. 弹窗打开状态由演示页面管理，`Modal` 自身不决定何时出现。
5. 点击关闭按钮通过回调通知父组件关闭。
6. 不允许在 `Modal` 内部写死任何业务文案。

#### 提交物

- `Modal` 组件与演示页面；
- 两种弹窗内容的截图；
- props 类型定义；
- 组合设计说明，说明为什么使用 children 而不是布尔开关。

#### 验收标准

- 同一外壳可承载两种完全不同的内容；
- 无障碍属性完整；
- 开关逻辑与展示逻辑分离；
- 类型定义中 children 使用合适的 React 类型；
- 关闭后弹窗从页面中消失。

## 阶段验收作业

### 作业名称

React 组件化“知识卡片工作台”静态交互版

### 作业场景

团队要开发一个知识管理页面的前端骨架。后端接口尚未就绪，本阶段只验证你是否真正掌握 React 的组件心智模型：界面是否由数据驱动、组件边界是否清晰、props 是否单向流动、组合和列表渲染是否规范。

### 提交物

```text
knowledge-workbench/
├── src/
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ItemCard.tsx
│   │   ├── ItemList.tsx
│   │   ├── FilterBar.tsx
│   │   └── Modal.tsx
│   ├── pages/
│   │   └── WorkbenchPage.tsx
│   ├── types/
│   │   └── knowledge.ts
│   ├── App.tsx
│   └── main.tsx
├── README.md
└── evidence.md
```

要求：

1. 页面包含顶部栏、侧边导航、筛选栏、知识条目列表和一个组合式弹窗。
2. 初始数据不少于 12 条，每条包含 id、标题、摘要、标签数组、收藏状态、更新时间。
3. 支持关键词筛选、标签筛选、仅看收藏三种条件，条件可以叠加。
4. 点击条目上的“更多信息”打开弹窗，弹窗内容随点击的条目变化。
5. 列表为空时展示空态；所有列表 key 使用业务 id。
6. `evidence.md` 中包含组件树文本图和一张数据流说明表。

### 演示步骤

学员在 15 分钟内完成：

1. 启动开发服务器，展示完整页面。
2. 打开 React DevTools，指出组件树中父子关系和实时 props。
3. 依次演示关键词筛选、标签筛选、收藏筛选及三者叠加。
4. 删除或临时清空数据，演示空态。
5. 点击不同条目打开弹窗，证明弹窗内容由 props 决定。
6. 展示 `evidence.md` 中的组件树与数据流说明。
7. 回答导师随机追问：某个状态为什么放在这一层而不是子组件。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 心智模型 | 25 | 正确解释声明式与 `UI=f(state)`，界面全部由数据驱动，无手动 DOM 更新业务 UI |
| 组件与边界 | 20 | 组件树清晰，职责单一，命名准确，页面/业务/复用组件分层合理 |
| Props 与组合 | 20 | 单向数据流正确，props 类型完整，children 与插槽使用规范 |
| 条件与列表渲染 | 20 | 多条件叠加正确，key 使用稳定 id，空态完整 |
| 工程与表达 | 15 | 无 TS 与构建错误，README 可复现，evidence 图文清晰 |

细分评分：

- 心智模型：声明式解释 8 分，无命令式 DOM 操作 9 分，纯渲染 8 分。
- 组件与边界：组件数量与层级 8 分，职责划分 7 分，命名 5 分。
- Props 与组合：类型定义 8 分，数据与回调方向 7 分，弹窗组合 5 分。
- 条件与列表渲染：筛选逻辑 8 分，key 7 分，空态 5 分。
- 工程与表达：构建通过 6 分，README 5 分，evidence 4 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过：

1. 使用 `document.querySelector`、jQuery 等方式直接修改业务 UI，绕过 React 数据流。
2. 子组件直接修改 props 对象或 props 中的数组、对象。
3. 可变列表使用数组下标作为 key，或列表中出现重复 key。
4. 组件没有任何拆分，全部逻辑堆在单个超过 500 行的组件中。
5. TypeScript 报错未处理，或大量使用 `any` 绕过类型检查。
6. 项目无法按 README 在另一台满足环境要求的机器上启动和构建。
7. 只提交截图，没有可运行代码。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解声明式 UI | 现场解释与全部列表/弹窗代码 |
| 掌握 UI=f(state) 与纯渲染 | 筛选、收藏、弹窗均由数据驱动，无渲染期副作用 |
| 理解组件树与边界 | React DevTools 演示、组件目录结构、evidence 组件树 |
| 掌握函数组件与 TS 类型 | 各组件 props 类型定义与构建结果 |
| 掌握 props 单向流 | 筛选与弹窗的回调设计、数据流说明表 |
| 掌握 children 与组合 | Modal 外壳及两种以上内容场景 |
| 掌握条件/列表渲染与 key | 多条件筛选、空态演示、业务 id key |

### 提交前自检

- [ ] 六个学习目标均有对应证据。
- [ ] 项目中没有直接操作业务 DOM 的代码。
- [ ] 所有 props 都有明确类型，必填项未被改成可选。
- [ ] 筛选条件叠加结果正确，空态可演示。
- [ ] 列表 key 全部使用稳定且唯一的业务 id。
- [ ] 弹窗内容由 props 决定，外壳不写死业务文案。
- [ ] `npm run build` 无错误。
- [ ] README 包含环境要求、安装步骤、启动方式和目录说明。
- [ ] evidence 中的组件树与实际代码一致。
