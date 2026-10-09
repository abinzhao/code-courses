# 15-JavaScript：DOM 操作与事件机制

## 目标

完成本知识单元后，学员应能不依赖任何框架，使用原生 JavaScript 读取和修改页面结构、响应用户交互，并理解事件在 DOM 中传播的完整机制。

学员应能够：

1. 描述 DOM 树结构与常见节点类型，区分元素节点、文本节点、文档节点及其节点类型常量。
2. 熟练使用 `querySelector`、`querySelectorAll` 与节点间的关系属性查找目标元素。
3. 使用创建、插入、替换、删除等 API 安全地修改页面结构，并理解文档片段的批量插入价值。
4. 使用通用属性 API、`dataset` 与 `classList` 管理元素的属性、自定义数据与样式类。
5. 使用 `addEventListener` 注册事件，读懂事件对象，解释捕获、目标、冒泡三个传播阶段。
6. 正确使用 `preventDefault` 与 `stopPropagation`，用事件委托处理动态列表，并掌握表单、键盘事件与 `requestAnimationFrame` 的基本用法。

本单元是框架学习前的关键铺垫。学完后学员应能看懂框架"替你做了哪些 DOM 工作"。

## 技术栈

本单元不使用前端框架和第三方 npm 包，全部使用浏览器当前稳定版本原生提供的 DOM 与事件 API。

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Chrome 或 Chromium 系浏览器当前稳定版 | 运行与验证脚本 | 能在 Console 中直接执行 DOM 表达式 |
| 原生 HTML 与 JavaScript（ES 当前稳定版） | 编写页面与逻辑 | 理解 ESM 模块与普通脚本的加载差异 |
| Chrome DevTools Elements 面板 | 观察 DOM 实时变化 | 能在脚本执行后查看节点增删与属性变化 |
| Chrome DevTools Console 面板 | 读取错误、检查节点 | 能识别 `null` 取值与事件报错信息 |
| VS Code 与本地静态服务 | 编写与预览 | 能用本地服务或直接打开方式运行页面 |

版本约定：

- 所有 API 以浏览器"当前稳定版"支持为准，不写死小版本号。
- 本单元统一使用 `addEventListener`（现代标准），不把已不推荐的 `attachEvent` 作为主线。
- `onclick` 类属性赋值只作了解，正式代码一律使用事件监听 API。

开始前检查：

```text
1. 准备一个 index.html，body 中放入一个带 id 的空容器。
2. 在 Console 中输入 document.querySelector('body')，确认能取到节点。
3. 确认页面通过 <script type="module"> 或放在 body 末尾加载脚本。
```

## 详细的理论知识讲解和示例伪代码

### 1. DOM 树与节点类型

#### 定义

DOM（文档对象模型）是浏览器把 HTML 文档解析后在内存中建立的树形结构。树上的每一个组成部分都是节点（Node），常见类型包括：

- 文档节点（Document）：整棵树的根，代码中对应 `document`。
- 元素节点（Element）：每个 HTML 标签，如 `<div>`、`<button>`。
- 文本节点（Text）：标签之间的文字内容，注意换行和缩进也可能形成文本节点。
- 属性节点（Attr）：元素上的属性，现代代码通常通过元素的属性方法访问，而不是当作树的普通子节点遍历。
- 注释节点（Comment）：HTML 注释。

每个节点都有 `nodeType`（数字常量）、`nodeName`、`nodeValue` 等通用属性。

#### 与 Web 的关系

JavaScript 操作页面的本质就是操作这棵树：新增评论等于插入节点，切换主题等于改类名，点击按钮后更新数字等于改文本节点。理解"文本也是节点"能解释很多现象：元素里看起来只有一段文字，`childNodes` 却可能包含空白文本节点。

观察节点结构：

```html
<ul id="task-list">
  <!-- 今日任务 -->
  <li class="task">学习 DOM</li>
  <li class="task">理解事件</li>
</ul>

<script type="module">
  const list = document.querySelector('#task-list');

  console.log(list.nodeType);        // 1：元素节点
  console.log(list.nodeName);        // UL
  console.log(document.nodeType);    // 9：文档节点

  // childNodes 包含元素节点、文本节点（缩进换行）、注释节点
  list.childNodes.forEach((node) => {
    console.log(node.nodeType, node.nodeName, node.nodeValue);
  });

  // children 只包含元素节点，过滤掉文本与注释
  console.log(list.children.length); // 2
</script>
```

节点类型常量速查：

```text
nodeType 值    常量                         代表
1              Node.ELEMENT_NODE            元素节点
3              Node.TEXT_NODE               文本节点
8              Node.COMMENT_NODE            注释节点
9              Node.DOCUMENT_NODE           文档节点
11             Node.DOCUMENT_FRAGMENT_NODE   文档片段节点
```

遍历树时的关系属性：

```js
const firstTask = list.children[0];

console.log(firstTask.parentElement);        // 父元素：ul
console.log(firstTask.nextElementSibling);   // 下一个兄弟元素：第二个 li
console.log(firstTask.previousElementSibling); // 上一个兄弟元素：null
console.log(firstTask.firstChild);           // 第一个子节点（可能是文本节点）
console.log(firstTask.firstElementChild);    // 第一个子元素
```

```text
两组关系属性的区别：
  childNodes / firstChild / nextSibling        包含所有节点类型（含文本、注释）
  children / firstElementChild / nextElementSibling  只含元素节点
业务代码中绝大多数场景应使用 Element 系列，避免被空白文本节点干扰。
```

#### 常见误区

> 元素标签里的文字"属于"元素本身，不是独立节点。

文字是独立的文本节点。这就是为什么用 `firstChild` 可能取到空白文本，而 `firstElementChild` 取不到文字内容；读取文字应使用 `textContent`。

> `children` 和 `childNodes` 只是写法不同。

`children` 是只含元素的 HTMLCollection，`childNodes` 是含全部节点类型的 NodeList。遍历列表结构时混用会导致数量对不上。

### 2. 元素查找：querySelector 与遍历

#### 定义

查找元素的现代标准 API：

- `document.querySelector(选择器)`：返回文档中第一个匹配的元素，没有匹配返回 `null`。
- `document.querySelectorAll(选择器)`：返回包含所有匹配元素的静态 NodeList。
- `element.querySelector/querySelectorAll`：把查找范围限制在某个元素内部。
- 老式 API：`getElementById`、`getElementsByClassName`、`getElementsByTagName`，其中后两者返回实时集合，今天统一推荐 querySelector 系列。

选择器语法与 CSS 选择器完全一致，支持类、ID、标签、属性、层级、伪类等。

#### 与 Web 的关系

DOM 操作几乎都从"找到元素"开始。企业代码中大量 bug 来自"以为找到了，实际是 null"：脚本在元素出现之前执行，或选择器拼写出错。因此查找后判空、缩小查找范围，是必须养成的习惯。

多种查找方式的实际用法：

```html
<nav id="main-nav">
  <a class="nav-link" href="/home">首页</a>
  <a class="nav-link active" href="/weekly">周刊</a>
  <a class="nav-link external" href="https://example.com" data-track="out">外链</a>
</nav>

<script type="module">
  // ID 查找
  const nav = document.querySelector('#main-nav');

  // 类选择器：只取第一个
  const firstLink = nav.querySelector('.nav-link');

  // 全部链接：静态 NodeList
  const allLinks = nav.querySelectorAll('.nav-link');
  allLinks.forEach((link) => {
    console.log(link.textContent, link.getAttribute('href'));
  });

  // 属性选择器：带 data-track 的外链
  const tracked = nav.querySelector('[data-track]');

  // 伪类选择器：当前激活项
  const activeLink = nav.querySelector('.nav-link.active');

  // 层级选择器：nav 内直接子级 a
  const directLinks = document.querySelectorAll('#main-nav > a');
</script>
```

查找结果的安全处理：

```js
function findRequired(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`页面中缺少必需元素：${selector}`);
  }
  return element;
}

const panel = findRequired('#panel');
panel.textContent = '已就绪';
```

静态 NodeList 与实时 HTMLCollection 的差异：

```js
const staticItems = document.querySelectorAll('.item');   // 快照：此刻的结果
const liveItems = document.getElementsByClassName('item'); // 实时：随 DOM 变化

console.log(staticItems.length); // 假设为 2
console.log(liveItems.length);   // 2

const fresh = document.createElement('div');
fresh.className = 'item';
document.body.appendChild(fresh);

console.log(staticItems.length); // 仍是 2
console.log(liveItems.length);   // 变成 3
```

```text
选择器使用建议：
  1. 优先用稳定的类名或 id，避免依赖纯标签层级（结构一改就失效）。
  2. 在已知容器上调用 querySelector，范围越小越好。
  3. querySelectorAll 返回的是静态集合，可放心用 forEach。
  4. 对返回值保持"可能是 null"的警惕。
```

#### 常见误区

> `querySelector` 找不到元素时会报错。

找不到时返回 `null`，真正的报错发生在后续访问 `null.style` 等属性时。错误信息指向使用处，容易让人误以为是样式问题。

> `querySelectorAll` 的结果会像老式集合一样自动更新。

它返回静态 NodeList，反映调用那一刻的匹配情况。需要实时反映变化时才考虑 live 集合，或重新查询。

### 3. 创建、插入、删除与修改节点

#### 定义

修改文档结构的核心 API：

- `document.createElement(标签名)`：创建一个新元素。
- `parent.appendChild(node)`：把节点追加到父元素末尾。
- `parent.prepend(node)` / `parent.append(node)`：插入到开头 / 末尾（还可直接放字符串）。
- `parent.insertBefore(newNode, referenceNode)`：插入到参考节点之前。
- `referenceNode.before(node)` / `referenceNode.after(node)`：现代 API，插到节点前 / 后。
- `parent.replaceChild(newNode, oldNode)` / `oldNode.replaceWith(newNode)`：替换。
- `parent.removeChild(node)` / `node.remove()`：删除。
- `document.createDocumentFragment()`：创建轻量的临时容器，批量插入时只触发一次文档更新。

#### 与 Web 的关系

动态渲染列表、弹窗、评论、通知都依赖这些 API。逐条 `appendChild` 到真实 DOM 会带来多次更新开销；先把一批节点放进文档片段，再一次性插入，是原生批量渲染的标准手法，也是框架批量更新思想的雏形。

基础增删改操作：

```html
<ul id="news-list">
  <li>初始新闻</li>
</ul>
<button type="button" id="add-btn">添加一条</button>
<button type="button" id="remove-btn">删除第一条</button>

<script type="module">
  const list = document.querySelector('#news-list');

  document.querySelector('#add-btn').addEventListener('click', () => {
    const item = document.createElement('li');
    item.textContent = `新闻 ${Date.now()}`;
    list.append(item); // 追加到末尾
  });

  document.querySelector('#remove-btn').addEventListener('click', () => {
    const first = list.firstElementChild;
    if (first) {
      first.remove(); // 现代 API：节点自行删除
    }
  });
</script>
```

在指定位置插入与替换：

```js
const newItem = document.createElement('li');
newItem.textContent = '我插到最前面';
list.prepend(newItem);

const second = list.children[1];
const replacement = document.createElement('li');
replacement.textContent = '我替换了第二条';
second.replaceWith(replacement);
```

用文档片段批量渲染数据：

```js
const newsData = [
  { id: 1, title: '容器查询进入稳定支持' },
  { id: 2, title: '新的响应式排版实践' },
  { id: 3, title: '浏览器渲染流水线更新' },
  { id: 4, title: '设计 Token 落地经验' },
];

function renderNews(items) {
  // 先清空旧内容
  list.textContent = '';

  const fragment = document.createDocumentFragment();

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'news-item';
    li.dataset.id = item.id;

    const title = document.createElement('strong');
    title.textContent = item.title;
    li.append(title);

    fragment.append(li); // 全部先放进片段，片段不在真实文档中
  });

  list.append(fragment); // 一次性插入，只发生一次批量更新
}

renderNews(newsData);
```

移动已有节点：

```js
// 同一个节点被 append 到别处时会自动从原位置移走，不需要先手动删除
const activeItem = list.querySelector('.is-active');
list.append(activeItem);
```

```text
节点操作要点：
  1. 一个节点同一时刻只能在树中存在一处。
  2. textContent = '' 是清空元素全部内容的简洁方式。
  3. 需要多处复制节点时使用 cloneNode(true)（深拷贝）。
  4. 批量构建优先 DocumentFragment。
```

#### 常见误区

> 用 `appendChild` 逐条插入和一次插入片段，效果一样。

最终结构可能相同，但逐条插入真实文档会带来多次中间更新，节点多时性能差距明显。

> 删除节点要先找到它的父节点才行。

现代 `node.remove()` 不需要手动取父节点；需要兼容很老环境时才用 `parent.removeChild(node)`。

### 4. 属性、dataset 与 classList

#### 定义

管理元素属性与样式类的三组 API：

- 通用属性：`element.getAttribute(name)`、`setAttribute(name, value)`、`hasAttribute(name)`、`removeAttribute(name)`。许多常见属性还可直接用属性访问，如 `element.href`、`element.value`、`element.checked`。
- 自定义数据：`element.dataset` 对应 HTML 的 `data-*` 属性，`data-user-id` 在脚本中写作 `dataset.userId`（短横线转驼峰）。
- 样式类：`element.classList` 提供 `add`、`remove`、`toggle`、`contains`、`replace` 方法，避免手工拼接 `className` 字符串。

#### 与 Web 的关系

存 ID、状态标记、行配置，最常见的方式就是 `data-*`，它也是事件委托识别"点的是谁"的关键依据。`classList` 让显隐、选中、禁用等状态切换清晰可控，取代易错的字符串替换。

三组 API 的实际用法：

```html
<a
  id="profile-link"
  href="/u/42"
  target="_blank"
  data-user-id="42"
  data-role="editor"
  class="link is-active"
>个人主页</a>

<script type="module">
  const link = document.querySelector('#profile-link');

  // 通用属性
  console.log(link.getAttribute('href'));   // /u/42
  link.setAttribute('title', '编辑者主页');
  console.log(link.hasAttribute('target')); // true
  link.removeAttribute('title');

  // dataset：短横线命名转驼峰读取
  console.log(link.dataset.userId); // 42
  console.log(link.dataset.role);   // editor
  link.dataset.status = 'online';   // 写入后 HTML 出现 data-status="online"

  // classList
  link.classList.add('is-visible');
  link.classList.remove('is-active');
  console.log(link.classList.contains('is-visible')); // true
  link.classList.toggle('is-highlighted');            // 没有就加上
  link.classList.replace('link', 'profile-link');
</script>
```

表单属性与通用属性的区别：

```html
<input id="username" type="text" value="初始值" />
<script type="module">
  const input = document.querySelector('#username');

  input.value = '新输入值';
  console.log(input.value);                       // 新输入值
  console.log(input.getAttribute('value'));       // 初始值（属性是初始默认值）
  // value 属性反映当前实时状态，getAttribute('value') 反映 HTML 上的初值
</script>
```

用 toggle 实现可复用的展开/收起：

```js
const toggleButton = document.querySelector('#toggle');
const panel = document.querySelector('#panel');

toggleButton.addEventListener('click', () => {
  const isOpen = panel.classList.toggle('is-open');
  toggleButton.setAttribute('aria-expanded', String(isOpen));
});
```

布尔类属性的正确操作：

```js
const submitButton = document.querySelector('#submit');
submitButton.disabled = true;   // 直接用布尔属性，不要写 setAttribute('disabled', 'true')
submitButton.disabled = false;  // 重新启用
```

```text
属性选择建议：
  href / value / checked / disabled / src 等   → 直接属性访问
  自定义业务数据                                → dataset
  样式类增删切换                                → classList
  不确定名称的通用属性                          → get/setAttribute
```

#### 常见误区

> 改了 `input.value` 后，`getAttribute('value')` 会同步变化。

属性（property）与 HTML 特性（attribute）是两个层面：`value` 属性是当前状态，`value` 特性是初始值，二者不会自动同步。

> 切换类名直接拼接 `className += ' is-active'` 即可。

手工拼接容易重复添加、漏写空格或删错类名。`classList` 的语义化方法能避免这些问题。

### 5. addEventListener 与事件对象

#### 定义

`element.addEventListener(type, listener, options)` 为元素注册一个事件监听器：`type` 是事件名（如 `click`，不带 `on` 前缀），`listener` 是事件发生时执行的函数，`options` 可控制捕获阶段、是否只触发一次、是否被动监听等。

事件发生时，浏览器会创建一个事件对象（Event）作为参数传入监听器，其中包含：`type`（事件类型）、`target`（实际触发事件的元素）、`currentTarget`（当前绑定监听器的元素）、时间戳，以及各类事件特有的信息（鼠标坐标、键盘按键等）。

#### 与 Web 的关系

所有用户交互都通过事件进入 JavaScript。相比 `onclick = fn` 这种"一个元素一种事件只能绑一个函数"的方式，`addEventListener` 支持注册多个监听器、可指定阶段、可单独移除，是企业代码唯一推荐方式。

注册事件与读取事件对象：

```html
<button type="button" id="greet">点我</button>

<script type="module">
  const button = document.querySelector('#greet');

  function handleClick(event) {
    console.log('事件类型：', event.type);           // click
    console.log('触发目标：', event.target);         // button
    console.log('绑定元素：', event.currentTarget);  // button
    console.log('时间戳：', event.timeStamp);
  }

  button.addEventListener('click', handleClick);

  // 注册第二个监听器不会覆盖第一个
  button.addEventListener('click', () => {
    console.log('我是另一个监听器');
  });

  // 只触发一次：第三次参数 options
  button.addEventListener(
    'click',
    () => console.log('只提醒一次'),
    { once: true }
  );
</script>
```

具名函数才能被移除：

```js
function onScroll() {
  console.log('滚动中', window.scrollY);
}

window.addEventListener('scroll', onScroll, { passive: true });

// 后续不再需要时，必须传入同一个函数引用
window.removeEventListener('scroll', onScroll);
```

鼠标事件的常用信息：

```html
<div id="area" style="width: 300px; height: 160px; background: #e0f2fe;">区域</div>
<script type="module">
  const area = document.querySelector('#area');
  area.addEventListener('click', (event) => {
    console.log('相对视口：', event.clientX, event.clientY);
    console.log('相对页面：', event.pageX, event.pageY);
    console.log('按键组合：', event.shiftKey, event.ctrlKey, event.altKey);
  });
</script>
```

```text
target 与 currentTarget 的区别（事件委托的核心）：
  target         事件实际发生在哪个元素上（可能是深层的子元素）
  currentTarget  监听器绑在哪个元素上（回调内的 this 通常也指向它）
在父元素统一处理子元素事件时，两者经常不同。
```

#### 常见误区

> 用匿名箭头函数注册后，也能在别处精确移除。

`removeEventListener` 需要传入与注册时完全相同的函数引用，匿名函数无法再次匹配。需要移除时必须用具名函数。

> `event.target` 永远等于绑定监听器的元素。

监听器绑在父级、点中的是子级时，`target` 是子级，`currentTarget` 才是父级。

### 6. 捕获、目标与冒泡三个阶段

#### 定义

事件从触发到结束经历三个传播阶段：

1. 捕获阶段（Capture）：事件从 `window` 沿 DOM 树向下，经过目标的各级祖先，到达目标元素。
2. 目标阶段（Target）：事件到达实际触发的目标元素本身。
3. 冒泡阶段（Bubble）：事件从目标元素沿 DOM 树向上，依次经过各级祖先，直到 `window`。

默认情况下监听器在冒泡阶段触发；在 `addEventListener` 第三个参数传入 `true` 或 `{ capture: true }`，可让监听器在捕获阶段触发。

#### 与 Web 的关系

冒泡是事件委托得以实现的基础：子元素被点击，事件会一路冒到父级，父级只需一个监听器就能处理任意数量的子元素。理解三阶段也能解释"为什么点一个按钮，外层容器的点击也被触发"。

观察传播顺序：

```html
<div id="outer" style="padding: 24px; background: #fde68a;">
  外层
  <div id="inner" style="padding: 24px; background: #bfdbfe;">
    内层
    <button type="button" id="target-btn">按钮</button>
  </div>
</div>

<script type="module">
  const outer = document.querySelector('#outer');
  const inner = document.querySelector('#inner');
  const button = document.querySelector('#target-btn');

  // 捕获阶段监听：从外向内
  [outer, inner, button].forEach((el) => {
    el.addEventListener('click', () => console.log('捕获：', el.id), true);
  });

  // 冒泡阶段监听：从内向外
  [outer, inner, button].forEach((el) => {
    el.addEventListener('click', () => console.log('冒泡：', el.id));
  });
</script>
```

点击按钮的控制台输出顺序：

```text
捕获： outer
捕获： inner
冒泡： target-btn    （目标阶段，目标元素的监听器按注册顺序触发）
冒泡： inner
冒泡： outer
```

文字示意传播路径：

```text
window
  ↓ 捕获
document → outer → inner
  ↓ 到达
target（按钮）
  ↑ 冒泡
inner → outer → document → window
```

```text
阶段使用建议：
  1. 绝大多数监听使用默认的冒泡阶段。
  2. 需要在事件到达目标之前提前拦截（如全局快捷键、拖拽防误触）时用捕获。
  3. 不是所有事件都会冒泡：如 focus、blur 不冒泡（可改用 focusin/focusout）。
```

#### 常见误区

> 事件默认在捕获阶段处理。

默认在冒泡阶段。捕获监听必须显式开启。

> 所有事件都会冒泡。

`focus`、`blur`、`mouseenter`、`mouseleave` 等事件不冒泡；需要冒泡版本时可使用 `focusin/focusout`、`mouseover/mouseout`。

### 7. preventDefault、stopPropagation 与事件委托

#### 定义

- `event.preventDefault()`：取消元素的默认行为，但不阻止事件继续传播。例如阻止链接跳转、阻止表单提交刷新页面、阻止复选框状态改变。
- `event.stopPropagation()`：阻止事件继续向祖先传播（冒泡或捕获），但当前元素上其余监听器仍会执行。
- `event.stopImmediatePropagation()`：连当前元素上后续注册的同级监听器也一并阻止。
- 事件委托（Event Delegation）：利用冒泡，把子元素的事件统一交给稳定的共同祖先处理，通过 `event.target` 配合 `dataset`、`closest()` 判断实际来源。

#### 与 Web 的关系

动态列表是事件委托的主战场：列表项通过 JS 不断增删，如果给每一项都绑定监听器，不仅费内存，新增项还会忘记绑定。委托给永远存在的 `<ul>`，无论将来加多少项都自动生效。

区分两种阻止：

```html
<a id="link" href="/home">首页</a>
<div id="box" style="padding:20px; background:#e5e7eb;">
  <button type="button" id="stop-btn">不再冒泡</button>
</div>

<script type="module">
  document.querySelector('#link').addEventListener('click', (event) => {
    event.preventDefault(); // 链接不跳转，但事件照样冒泡到上层
    console.log('默认跳转被取消');
  });

  document.querySelector('#box').addEventListener('click', () => {
    console.log('外层被点中');
  });

  document.querySelector('#stop-btn').addEventListener('click', (event) => {
    event.stopPropagation(); // 外层不会收到这次点击
    console.log('按钮自己处理了');
  });
</script>
```

事件委托处理动态列表：

```html
<ul id="comment-list">
  <li data-id="101">
    评论内容一
    <button type="button" class="like-btn">赞</button>
    <button type="button" class="delete-btn">删</button>
  </li>
  <li data-id="102">
    评论内容二
    <button type="button" class="like-btn">赞</button>
    <button type="button" class="delete-btn">删</button>
  </li>
</ul>

<script type="module">
  const commentList = document.querySelector('#comment-list');

  commentList.addEventListener('click', (event) => {
    const item = event.target.closest('li');
    if (!item || !commentList.contains(item)) return;

    const id = item.dataset.id;

    if (event.target.closest('.delete-btn')) {
      item.remove();
      console.log('删除评论', id);
      return;
    }

    if (event.target.closest('.like-btn')) {
      item.classList.toggle('is-liked');
      console.log('点赞评论', id);
    }
  });
</script>
```

新插入的评论无需重新绑定：

```js
function addComment(id, text) {
  const li = document.createElement('li');
  li.dataset.id = id;
  li.textContent = `${text} `;

  const likeBtn = document.createElement('button');
  likeBtn.type = 'button';
  likeBtn.className = 'like-btn';
  likeBtn.textContent = '赞';

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'delete-btn';
  deleteBtn.textContent = '删';

  li.append(likeBtn, deleteBtn);
  commentList.append(li);
}

addComment('103', '评论内容三');
```

```text
事件委托要点：
  1. 委托对象必须是稳定存在的共同祖先。
  2. 用 closest(选择器) 向上匹配，避免点中按钮内部结构时误判。
  3. 判断条件互不重叠，命中后及时 return。
  4. 不要用 stopPropagation 代替委托，那会切断其他监听。
```

#### 常见误区

> `preventDefault` 会阻止事件冒泡。

它只取消默认行为，传播照常进行。阻止传播要用 `stopPropagation`，两者职责不同。

> 列表项是动态生成的，所以每个新增项都要重新绑定一遍事件。

用事件委托后祖先统一处理，新增项自动被覆盖；反复绑定还会导致一次点击触发多次回调。

### 8. 表单事件、键盘事件与 requestAnimationFrame

#### 定义

- 表单提交：`<form>` 的 `submit` 事件在提交时触发，原生提交会导致页面刷新或跳转；常见做法是 `preventDefault` 后用 JavaScript 读取字段、发起请求。
- 输入相关事件：`input` 在值每次变化时实时触发，`change` 在值确定并失焦后触发。
- 键盘事件：`keydown`（按下，可重复触发）、`keyup`（松开），事件对象含 `key`（按键值）、`code`（物理位置）、`ctrlKey` 等。
- `requestAnimationFrame(callback)`：请求浏览器在下一次重绘前调用回调，是做视觉更新与动画的正确时机；回调参数是高精度时间戳。

#### 与 Web 的关系

表单是前端收集用户输入的主入口，键盘事件支撑快捷键、方向键操作等高级交互，`requestAnimationFrame` 让视觉更新与浏览器刷新节奏对齐（通常每秒 60 帧或跟随设备刷新率），避免动画掉帧。

拦截提交并读取字段：

```html
<form id="login-form">
  <label>
    账号
    <input type="text" name="account" required />
  </label>
  <label>
    密码
    <input type="password" name="password" required minlength="6" />
  </label>
  <button type="submit">登录</button>
</form>

<script type="module">
  const form = document.querySelector('#login-form');

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // 不刷新页面，改为脚本处理

    const formData = new FormData(form);
    const account = formData.get('account');
    const password = formData.get('password');

    console.log('准备提交', { account, passwordLength: password.length });
    // 后续在此发起登录请求；此处不输出明文密码
  });

  const accountInput = form.querySelector('input[name="account"]');
  accountInput.addEventListener('input', (event) => {
    console.log('实时输入：', event.target.value);
  });
</script>
```

键盘事件与快捷键：

```html
<div id="stage" tabindex="0" style="padding:24px; border:1px solid #ccc;">聚焦后按方向键</div>
<script type="module">
  const stage = document.querySelector('#stage');

  stage.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      console.log('确认');
    }

    if (event.ctrlKey && event.key === 's') {
      event.preventDefault(); // 阻止浏览器保存网页的默认行为
      console.log('触发自定义保存');
    }

    const moves = {
      ArrowUp: '上',
      ArrowDown: '下',
      ArrowLeft: '左',
      ArrowRight: '右',
    };
    if (moves[event.key]) {
      console.log('移动方向：', moves[event.key]);
    }
  });
</script>
```

用 requestAnimationFrame 实现平滑动画：

```html
<button type="button" id="start">开始动画</button>
<div id="ball" style="width:30px; height:30px; border-radius:50%; background:#2563eb;"></div>

<script type="module">
  const ball = document.querySelector('#ball');

  document.querySelector('#start').addEventListener('click', () => {
    const startTime = performance.now();
    const duration = 1000;
    const distance = 300;

    function animate(now) {
      const elapsed = Math.min((now - startTime) / duration, 1);
      ball.style.transform = `translateX(${elapsed * distance}px)`;

      if (elapsed < 1) {
        requestAnimationFrame(animate); // 未结束则请求下一帧
      }
    }

    requestAnimationFrame(animate);
  });
</script>
```

对比 setTimeout 做动画的区别：

```text
setTimeout(fn, 16)：
  固定时间后执行，可能与屏幕刷新错位，造成掉帧或抖动
  标签页切到后台时仍可能频繁触发

requestAnimationFrame：
  由浏览器在下次重绘前调用，与刷新节奏严格对齐
  页面不可见时自动暂停，更省电
结论：视觉变化用 rAF，纯逻辑延迟才用定时器。
```

#### 常见误区

> 监听按钮的 `click` 来处理表单提交就够了。

在输入框按回车也会提交表单，只监听按钮点击会漏掉这条路径。应监听 `<form>` 的 `submit`。

> 做动画用 `setInterval` 每 16 毫秒改一次位置，和 rAF 没区别。

定时器不与刷新对齐，容易掉帧；后台标签页还会空跑。视觉更新应交给 `requestAnimationFrame`。

## 课后题

1. DOM 树上常见的节点类型有哪些？为什么读取元素中的文字应使用 `textContent` 而不是在 `childNodes` 里找第一个节点？
2. `children` 与 `childNodes` 有何区别？请各举一个适合使用的场景。
3. 场景分析：脚本执行 `document.querySelector('#panel').textContent = 'x'` 时报 `Cannot set properties of null`。请列出至少三种可能原因和对应的排查方式。
4. 请说明 `createDocumentFragment` 的作用。逐条 `appendChild` 与先构建片段再一次性插入，在性能上为什么不同？
5. HTML 上的 `data-user-role` 在 JavaScript 中如何读取？为什么推荐用 `dataset` 而不是自己解析属性名？
6. 场景分析：开发者在输入框中手工输入了一段文字后，调用 `getAttribute('value')` 却没有拿到当前输入内容，排查了很久。请解释对文本输入框设置 `input.value = '新值'` 后，`getAttribute('value')` 返回什么，并说明属性（property）与特性（attribute）的区别。
7. 请完整描述事件传播的捕获、目标、冒泡三个阶段。默认监听器在哪个阶段触发？怎样让它在捕获阶段触发？
8. 场景分析：一个收藏列表通过接口动态增删条目，新加入的条目点击"删除"没有反应，老条目正常。最可能的原因是什么？请用事件委托思路描述正确实现。
9. 场景分析：页面上点击登录弹窗内的按钮后，底层遮罩也收到了点击并意外关闭了弹窗。请分析事件是如何传到遮罩的，并给出两种解决方案及取舍。
10. 处理表单为什么应监听 `submit` 并调用 `preventDefault`，而不是只监听提交按钮的 `click`？视觉动画为什么推荐 `requestAnimationFrame` 而不是 `setInterval`？

## 实践练习题

### 练习 1：动态任务列表（基础增删改）

#### 任务

创建一个"今日任务"页面：输入框加添加按钮，提交后新任务插入列表；每条任务带完成切换与删除按钮；页面加载时预置三条任务。全部使用原生 DOM API 完成。

#### 步骤约束

1. 使用语义化结构：`<form>`、`<ul>`、`<button>`，输入框必须配 `<label>`。
2. 添加通过表单 `submit` 处理，并调用 `preventDefault`，不能只监听按钮。
3. 新任务用 `createElement` 构建，空内容不允许插入。
4. 点击任务文字或复选框切换完成样式（用 `classList.toggle`）。
5. 添加成功后清空输入框并让其重新获得焦点。
6. 初始三条任务可用数组配合一次渲染生成。

#### 提交物

- `index.html` 与 `main.js`；
- 一份功能自查记录（添加、完成、删除、空值拦截各一次）；
- 100 字左右说明状态变化如何映射到 DOM 变化。

#### 验收标准

- 回车与点击按钮都能添加任务；
- 删除与完成操作互不干扰；
- 不提交空任务；
- 代码中创建与渲染逻辑有基本拆分，没有全部写在一个函数里。

### 练习 2：事件委托评论区

#### 任务

实现一个评论区，支持加载已有评论、新增评论、点赞与删除。所有点击交互必须通过事件委托绑定在评论容器上，用 `dataset` 存评论 ID、用 `closest()` 判断点击来源；新增评论不得单独绑定事件。

#### 步骤约束

1. 评论容器 `<ul>` 上只注册一个 `click` 监听器。
2. 每条评论用 `data-id` 标识，点赞与删除按钮有明确类名。
3. 用 `event.target.closest('.delete-btn')` 等方式判断操作，命中后及时 `return`。
4. 点赞用 `classList.toggle('is-liked')` 表达状态。
5. 连续新增至少三条评论，验证它们无需重新绑定即可点赞、删除。
6. 删除最后一条后页面显示空态提示。

#### 提交物

- `comments.html` 与 `comments.js`；
- 操作录屏或连续截图（新增 → 点赞 → 删除 → 空态）；
- 200 字左右说明委托如何覆盖未来新增的节点。

#### 验收标准

- 容器上仅有一个 click 监听器；
- 动态新增评论立即具备全部交互；
- 点赞与删除判断准确，不串操作；
- 空态在列表清空时出现、有内容时消失。

### 练习 3：键盘可操作的 rAF 小部件

#### 任务

做一个可键盘操作的"滑块打靶"小部件：一个方块在轨道上，按左右方向键移动、按空格确认；方块移动使用 `requestAnimationFrame` 平滑过渡；同时提供"重开"按钮。要求全程可不用鼠标完成。

#### 步骤约束

1. 方块位置通过 `transform: translateX()` 更新，不修改 `left`。
2. 移动动画由 `requestAnimationFrame` 驱动，到达目标位置即停止继续请求帧。
3. 监听 `keydown` 处理方向键与空格，阻止空格可能触发的按钮默认点击。
4. 容器需可聚焦（`tabindex="0"`），聚焦与失焦有清晰视觉反馈。
5. 重开按钮可把方块复位到起点。
6. 在控制台记录每次按键与最终确认位置，不输出任何用户隐私信息。

#### 提交物

- `widget.html` 与 `widget.js`；
- 一段纯键盘操作演示（录屏或分步截图）；
- 150 字左右说明 rAF 与屏幕刷新的对齐关系。

#### 验收标准

- 全程仅用键盘可完成移动、确认、重开；
- 移动平滑、没有明显跳帧；
- 焦点位置始终清晰可见；
- 动画结束后不再请求多余帧。

## 阶段验收作业

### 作业名称

原生 JavaScript 知识条目管理器

### 作业场景

在进入框架学习前，团队要求你用原生 JavaScript 完整实现一个"知识条目管理器"，证明你理解浏览器页面的本质：数据是数组，界面是 DOM，交互是事件。条目支持新增、删除、点赞（收藏）、分类筛选与关键词搜索；列表是动态的，事件必须用委托处理；视觉更新使用合理的 DOM 与 rAF 方式。

### 提交物

```text
notes-manager/
├── index.html
├── styles/
│   └── styles.css
├── scripts/
│   ├── data.js          # 初始数据
│   ├── render.js        # DOM 渲染函数
│   ├── events.js        # 事件绑定与委托
│   └── main.js          # 入口
├── evidence/
│   ├── test-record.md   # 手工测试记录
│   └── dom-notes.md     # 关键实现说明
└── README.md
```

条目数据结构至少包含：`id`、标题、摘要、分类、是否收藏。初始数据不少于 8 条，覆盖至少 3 个分类。

### 演示步骤

学员需在 15 分钟内完成以下现场演示：

1. 打开页面，说明 DOM 树中列表容器、输入表单、条目节点各自的角色。
2. 通过表单新增一条条目（分别演示点击按钮与按回车），展示它出现在列表中且立即可交互。
3. 对新增条目执行收藏与删除，说明事件如何通过冒泡委托到容器、如何用 `dataset` 识别 ID。
4. 使用分类筛选与关键词搜索，展示列表重渲染过程。
5. 现场在 Elements 面板指出 `data-*` 属性与状态类名的变化。
6. 演示空输入拦截、搜索无结果空态、删除全部条目空态。
7. 如有动画或过渡，指出它由 classList 切换或 rAF 驱动，而不是定时器。

导师可以临时新增条目、改变分类或修改搜索词，验证数据与 DOM 是否始终一致。

### 评分标准（100 分）

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| DOM 结构与查找 | 15 | 语义化结构正确；选择器稳定，查找后有判空意识 |
| 节点增删改与渲染 | 20 | 创建、插入、删除正确；批量渲染使用片段或批量更新 |
| 属性、dataset 与 classList | 15 | 三类 API 使用规范；状态变化清晰可追踪 |
| 事件机制与委托 | 25 | 三阶段理解正确；列表交互全部委托，动态条目自动生效 |
| 表单、键盘与 rAF | 15 | submit 处理正确；支持键盘操作；视觉更新方式合理 |
| 代码组织与证据 | 10 | 数据、渲染、事件分层；测试记录完整 |

细分评分规则：

#### DOM 结构与查找：15 分

- 语义化标签与表单 label 完整：6 分；
- querySelector 使用稳定、范围合理：5 分；
- 关键元素查找有判空处理：4 分。

#### 节点增删改与渲染：20 分

- 新增、删除、重渲染逻辑正确：8 分；
- 使用片段或批量插入，避免逐条低效更新：6 分；
- 数据与 DOM 保持一致，无重复或残留节点：6 分。

#### 属性、dataset 与 classList：15 分

- 用 dataset 承载条目 ID 与状态：6 分；
- classList 表达收藏、激活等状态：5 分；
- 属性与特性使用场景正确：4 分。

#### 事件机制与委托：25 分

- 能解释捕获、目标、冒泡及 target/currentTarget：7 分；
- 列表所有操作通过容器委托实现：10 分；
- preventDefault 与阻止传播使用恰当：5 分；
- 动态新增条目无需重新绑定：3 分。

#### 表单、键盘与 rAF：15 分

- 监听 submit 并阻止默认刷新：5 分；
- 输入事件、空值与无结果处理完整：5 分；
- 视觉更新使用 classList 或 rAF 而非定时器：5 分。

#### 代码组织与证据：10 分

- 数据、渲染、事件模块职责清晰：6 分；
- 手工测试记录覆盖主要路径：4 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 给每个动态条目单独绑定事件，新增条目忘记绑定或一次点击触发多次回调。
2. 无法解释事件冒泡与事件委托，或判断点击来源时不使用 `closest/dataset` 导致误操作。
3. 表单只监听按钮点击，按回车提交路径失效或页面被默认刷新。
4. 直接依赖 `innerHTML` 拼接未经处理的用户输入，造成脚本注入风险（纯静态文本应使用 textContent）。
5. 数据与 DOM 长期不一致：删除数组项后界面仍显示，或筛选后状态错乱。
6. 全部逻辑堆叠在单个巨型函数或全局散乱变量中，没有渲染与事件的基本分层。
7. 只提交截图，缺少可运行源码、测试记录与实现说明。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解 DOM 树与节点类型 | 页面结构与现场讲解 |
| 使用 querySelector 系列查找元素 | 各脚本中的查找代码与判空处理 |
| 完成节点的创建、插入、删除与修改 | 渲染函数与新增、删除演示 |
| 使用属性、dataset 与 classList | 条目结构、Elements 面板演示 |
| 掌握 addEventListener 与三阶段传播 | 事件代码与现场问答 |
| 使用 preventDefault、事件委托处理动态列表 | 委托实现与新增条目演示 |
| 掌握表单、键盘事件与 requestAnimationFrame | submit 处理、键盘操作与视觉更新 |

### 提交前自检

- [ ] 七个学习目标均有对应证据。
- [ ] 页面结构语义化，所有表单控件都有 label。
- [ ] 元素查找使用稳定选择器，关键节点有判空。
- [ ] 列表批量渲染使用文档片段或批量插入。
- [ ] 条目 ID 与状态通过 dataset、classList 表达。
- [ ] 列表交互全部由容器上的事件委托处理。
- [ ] 新增条目无需重新绑定即可收藏、删除。
- [ ] 表单监听 submit 并阻止默认行为，回车路径有效。
- [ ] 用户输入通过 textContent 写入，没有用 innerHTML 拼接。
- [ ] 空输入、无搜索结果、空列表三种空态都能正确展示。
- [ ] 手工测试记录覆盖新增、删除、收藏、筛选、搜索主要路径。
