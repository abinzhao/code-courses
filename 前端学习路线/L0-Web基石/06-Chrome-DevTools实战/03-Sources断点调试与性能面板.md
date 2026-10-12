# 03 — Sources 断点调试与 Console 进阶

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[02 — Network 面板与性能分析](./02-Network面板与性能分析.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Chrome DevTools](https://developer.chrome.com/docs/devtools/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 掌握 Sources 面板的文件树导航和工作区（Workspace）映射
- 熟练使用六种断点类型：行断点、条件断点、DOM 断点、事件监听断点、XHR/Fetch 断点、异常断点
- 能读懂 Call Stack 调用栈，从栈中向上追溯调用链
- 利用 Scope 面板和 Watch 表达式观察运行时变量值
- 掌握 Console 面板的进阶命令：`console.table`、`console.group`、`console.time`、`$0-$4`
- 会使用 Snippets 运行可复用的代码片段
- 能通过 Application 面板查看和管理 Cookie、LocalStorage、SessionStorage、IndexedDB

---

## 内容讲解

### 一、Sources 面板全景

#### 1.1 面板区域

```
F12 → Sources 标签
```

打开后你会看到三个主要区域：

```
┌────────────────┬──────────────────────────────┬────────────────┐
│ ① Page 文件树   │                              │ ③ 调试侧栏      │
│ （左侧）         │   ② 代码编辑器                 │ （右侧/底部）    │
│                │   （中间）                      │                │
│ top            │   1 | function greet() {     │ ▶ Watch        │
│  ├ index.html  │   2 |   const name = 'Tom';  │  ▶ Breakpoints │
│  ├ app.js      │   3 |   console.log(name);   │  ▶ Scope       │
│  ├ style.css   │   4 |   return name;         │  ▶ Call Stack  │
│  └ assets/     │   5 | }                      │  ▶ XHR/fetch   │
│                │                              │  ▶ DOM Break   │
│                │                              │  ▶ Event Listener│
└────────────────┴──────────────────────────────┴────────────────┘
```

#### 1.2 文件树

左侧 **Page** 标签展示当前页面加载的所有源文件：

```
top                            ← 主页面
  ▶ www.example.com           ← 该域名下的所有资源
    index.html
    static/
      js/
        app.abc123.js          ← webpack 打包后的文件（hash 命名）
        chunk-vendors.xyz.js   ← node_modules 中的第三方库
      css/
        app.def456.css
  ▶ cdn.example.com           ← CDN 域名的资源
```

**快捷操作**：

```
Cmd+P → 打开文件搜索，输入文件名快速跳转（如输入 "app.js"）
Cmd+Shift+O → 在当前文件中按函数名跳转（如输入 "handleClick"）
Cmd+Shift+F → 全局搜索所有已加载文件中的文本
```

#### 1.3 Workspace（工作区）映射

这是 Sources 面板最有价值的功能之一：**让 DevTools 直接把修改保存到你本地的源文件**。

```
左侧 FileSystem 标签 → 点击 "+ Add folder to workspace"
→ 选择你的项目文件夹
→ Chrome 弹出权限提示，点击"允许"
```

映射成功后，你可以：

- 在 DevTools 中修改 CSS/JS 文件，`Cmd+S` 直接保存到本地文件
- 修改后效果实时生效，不需要回到编辑器手动保存
- Elements → Styles 面板的修改也可以右键 → "Map to filesystem"，自动同步回源文件

> **注意**：Workspace 映射只对本地文件生效。如果是 webpack-dev-server 热更新的文件，修改可能被 HMR 覆盖。

---

### 二、断点调试（六种断点类型）

#### 2.1 行断点（Line-of-code Breakpoint）

最基础的断点。**在代码行号上单击**，行号上出现蓝色箭头标记：

```javascript
1   async function fetchUsers() {
2     const url = '/api/users';
3 →   const response = await fetch(url);  // ← 点行号 3，这里会暂停
4     const data = await response.json();
5     return data;
6   }
```

刷新页面或触发该函数 → 代码执行到第 3 行时**自动暂停** → 你可以检查 `url` 的值、单步执行看 `response` 是什么。

**调试控制按钮**（代码编辑器顶部）：

```
●  ‖   ⤵   ⤵    ↗     ⚡
│  │   │    │     │     │
│  │   │    │     │     └─ Deactivate breakpoints（临时禁用全部断点）
│  │   │    │     └─────── Step out（跳出当前函数，回到调用位置）
│  │   │    └───────────── Step into（进入函数调用内部）
│  │   └────────────────── Step over（执行当前行，不进入函数内部）
│  └────────────────────── Resume（继续执行，直到下一个断点）
└───────────────────────── Pause（强制暂停）
```

记忆口诀：**Step Over 跨过去，Step Into 钻进去，Step Out 跳出来。**

#### 2.2 条件断点（Conditional Breakpoint）

右键行号 → **Add conditional breakpoint** → 输入条件表达式：

```javascript
// 只有当 i === 500 时才暂停
for (let i = 0; i < 1000; i++) {
  processItem(data[i]);  // ← 条件断点：i === 500
}
```

输入 `i === 500`，循环会在第 501 次时暂停，不用手动点 500 次 Resume。

更高级的用法：

```javascript
// 当 user.role === 'admin' 时暂停
user.role === 'admin'

// 当某个变量为 undefined 时暂停
typeof result === 'undefined'
```

#### 2.3 DOM 断点

在 Elements 面板中，右键某个元素 → **Break on**：

```
Break on → subtree modifications    ← DOM 子节点发生变化时暂停
Break on → attribute modifications  ← 属性发生变化时暂停
Break on → node removal             ← 该节点被删除时暂停
```

**典型场景**：你看到页面上一个弹窗一闪而过就被移除了。在弹窗的父容器上右键 → Break on → node removal → 刷新页面 → DevTools 会在删除代码处暂停，调用栈告诉你 `modalHide()` → `removeElement()` 的完整路径。

#### 2.4 事件监听断点（Event Listener Breakpoints）

右侧调试侧栏 → **Event Listener Breakpoints** → 展开分类勾选：

```
▶ Mouse
    ☑ click             ← 任何元素的点击事件都会暂停
    ☑ mousedown
    ☑ mouseup
▶ Keyboard
    ☑ keydown           ← 按下任意键都会暂停
▶ Timer
    ☑ setTimeout        ← 调用 setTimeout 时暂停
    ☑ setInterval       ← 调用 setInterval 时暂停
▶ XHR / Fetch
    ☑ Any XHR or Fetch  ← 发出任何 API 请求时暂停
```

**典型场景**：你不知道某个按钮的点击事件是在哪个 JS 文件中绑定的。勾选 `click` → 点击按钮 → DevTools 自动暂停在事件处理函数的第一行。从调用栈可以看出完整的事件分发路径。

#### 2.5 XHR/Fetch 断点

右侧调试侧栏 → **XHR/fetch Breakpoints** → 点击 `+` → 输入 URL 片段：

```
输入 "/api/users"  → 只要发出的请求 URL 包含这个字符串就暂停
输入 "/login"      → 拦截登录请求
```

**典型场景**：你怀疑某个 API 请求发的参数不对，但不知道是谁发起的。添加 XHR 断点 → 触发该请求 → DevTools 暂停在 `fetch()` 调用处，你可以检查请求参数、调用栈，甚至修改参数后再继续执行。

#### 2.6 异常断点（Pause on Exceptions）

代码编辑器右上角的 **⏸ 暂停图标**（在调试控制按钮右侧）：

```
⏸ Pause on caught exceptions      ← ☑ 勾选：任何被 catch 的异常也暂停
```

默认情况下，DevTools 遇到 `try-catch` 捕获的异常不会暂停。勾选这个选项后，即使是 `try {} catch(e) {}` 内部的错误也会暂停——非常适合排查"静默失败"的 bug。

---

### 三、Call Stack（调用栈）

#### 3.1 什么是调用栈

当代码暂停在断点时，右侧的 **Call Stack** 面板会展示完整的函数调用链：

```
Call Stack
▼ handleSubmit          app.js:42    ← 最顶层（当前执行位置）
  ▼ validateForm        app.js:28    ← handleSubmit 内部调用了 validateForm
      checkRequired     utils.js:15  ← validateForm 内部调用了 checkRequired
      (anonymous)       app.js:8     ← 最底层（全局匿名函数）
```

**从下往上是时间顺序**：最下面是先执行的，最上面是当前正在执行的。

#### 3.2 使用调用栈追踪 Bug

```javascript
// utils.js
function formatPrice(price) {
  return '¥' + price.toFixed(2);  // ← 断点在这里
}

// app.js
function renderProduct(data) {
  const formatted = formatPrice(data.price); // ← 调用者
  return `<span>${formatted}</span>`;
}

// 调用 renderProduct({ name: '书', price: '免费' })
// price 是字符串 '免费'，调用 .toFixed() 报错
```

当断点在 `formatPrice` 中暂停时，Call Stack 显示：

```
▼ formatPrice        utils.js:2    ← price 是 "免费"，字符串没有 toFixed
  ▼ renderProduct    app.js:5      ← 这里传入了错误的值
```

点击 `renderProduct` → 代码编辑器跳到 `app.js:5` → 发现 `data.price` 是 `'免费'` → 根因找到：调用方没有确保 price 是数字。

---

### 四、Scope 与 Watch

#### 4.1 Scope 面板

断点暂停时，右侧 **Scope** 面板显示所有可访问的变量：

```
Scope
▶ Local                  ← 当前函数作用域内的变量
    name: "Tom"
    age: 25
    data: {…}            ← 对象可展开
▶ Closure (outerFunc)    ← 闭包作用域（外层函数的变量）
    outerVar: "hello"
▶ Global                 ← 全局作用域（window / globalThis）
    document: …
    window: …
```

- **Local**：当前函数中用 `const`/`let`/`var` 声明的变量。如果变量值为 `undefined`，说明到这里时还没被赋值
- **Closure**：外层函数作用域的变量。JavaScript 闭包的值就在这里。如果你想确认某个闭包变量是否被意外修改，这是最佳观察点
- **双击变量值**可以编辑，修改后会立刻生效，继续执行时变量就是新值

#### 4.2 Watch 表达式

Scope 只能看已有的变量。如果你想在断点暂停时实时追踪一个**表达式**的值，用 Watch：

```
Watch
  + ▼
    data.items.length          → 12
    data.items[0].name         → "苹果"
    typeof result              → "object"
    document.querySelectorAll('.card')  → NodeList(5)
    $0                         → <div class="header">  ← Elements 中最后选中的元素
```

点击 `+` 添加表达式，每次代码暂停时自动重新计算。你可以写任意合法的 JavaScript 表达式，包括函数调用和多层属性访问。

---

### 五、Console 面板进阶

#### 5.1 console.table

用表格格式输出数组或对象，比 `console.log` 直观得多：

```javascript
const users = [
  { name: 'Tom', age: 25, role: 'admin' },
  { name: 'Jerry', age: 22, role: 'user' },
  { name: 'Spike', age: 28, role: 'editor' },
];

console.table(users);
// 输出：
// ┌───────┬────────┬─────┬──────────┐
// │ (index)│  name  │ age │   role   │
// ├───────┼────────┼─────┼──────────┤
// │   0    │ 'Tom'  │ 25  │ 'admin'  │
// │   1    │ 'Jerry'│ 22  │ 'user'   │
// │   2    │ 'Spike'│ 28  │ 'editor' │
// └───────┴────────┴─────┴──────────┘

// 只看指定列
console.table(users, ['name', 'role']);
```

#### 5.2 console.group

让大量日志可折叠：

```javascript
console.group('用户数据加载');
console.log('开始请求...');
console.log('URL:', '/api/users');
console.groupCollapsed('请求头'); // 默认折叠
console.log({ Authorization: 'Bearer xxx' });
console.groupEnd();
console.log('加载完毕');
console.groupEnd();
```

输出效果：

```
▼ 用户数据加载
   开始请求...
   URL: /api/users
  ▶ 请求头
   加载完毕
```

#### 5.3 console.time / console.timeEnd

精确测量一段代码的执行时间：

```javascript
console.time('排序耗时');
data.sort((a, b) => b.score - a.score);
console.timeEnd('排序耗时');
// 输出：排序耗时: 2.345 ms

// 可以同时测量多个操作
console.time('fetch');
const data = await fetch('/api/users');
console.timeEnd('fetch');
// 输出：fetch: 183.2 ms
```

> **对比**：`console.time` 比 `Date.now()` 相减更精确，且输出格式友好。在 Performance 面板中，`console.time` 的时间段会以竖条标记在 Flame Chart 中。

#### 5.4 $0 - $4 快捷引用

在 Console 中，`$0` 到 `$4` 是你在 Elements 面板中最近选中的 5 个元素：

```
$0  ← 当前在 Elements 面板中选中的元素
$1  ← 倒数第 2 个
$2  ← 倒数第 3 个
...← 一直到 $4
```

```javascript
// 在 Elements 面板选中一个卡片 div
// 切换到 Console 面板：
$0.className;               // "card featured"
$0.querySelector('h3').textContent;  // "精选卡片"
$0.style.backgroundColor = 'lightblue';  // 直接改样式
$0.remove();                // 删除这个元素
```

其他 `$` 快捷命令：

```javascript
$(selector)        // = document.querySelector(selector)
$$(selector)       // = document.querySelectorAll(selector)
$x(xpath)          // 用 XPath 表达式查找元素
copy(obj)          // 把对象复制到剪贴板
```

#### 5.5 console.assert

只在条件为 false 时输出：

```javascript
const user = fetchUser();
console.assert(user !== null, '用户数据为空！', { timestamp: Date.now() });
// 如果 user 是 null，输出：Assertion failed: 用户数据为空！ {timestamp: 1730000000}
```

#### 5.6 console.trace

输出调用栈而不需要打断点：

```javascript
function processData(data) {
  console.trace('processData 被调用');
  // 输出完整的调用栈：谁调用了 processData
}
```

**典型场景**：一个函数被多个地方调用，你想知道到底是谁在什么时候触发了它，但又不想打断点影响用户操作。

#### 5.7 Store as global variable

在断点暂停时，右键 Scope 面板中任意变量 → **Store as global variable** → Console 中出现 `temp1`：

```javascript
temp1;              // 现在你可以在 Console 中任意操作这个变量
temp1.length;
JSON.stringify(temp1, null, 2);
```

---

### 六、Snippets（代码片段）

#### 6.1 创建和运行

```
Sources 面板 → 左侧 Snippets 标签 → + New snippet
```

Snippets 是保存在浏览器中的可复用 JavaScript 代码片段，可以在任意页面运行：

```javascript
// snippet: 提取页面上所有链接
const links = $$('a');
const result = links.map(link => ({
  text: link.textContent.trim(),
  href: link.href
}));
console.table(result);
```

`Cmd+Enter` 运行。Snippets 会持久保存在浏览器中，切换页面后依然可用。

#### 6.2 实用 Snippet 示例

```javascript
// snippet: 显示页面上所有 cookie
console.table(document.cookie.split(';').map(c => {
  const [key, val] = c.trim().split('=');
  return { key, value: decodeURIComponent(val || '') };
}));

// snippet: 移除页面所有 <style> 标签和内联样式
document.querySelectorAll('[style], style, link[rel="stylesheet"]')
  .forEach(el => el.remove());
// 运行后可以直观感受：一个网站离开 CSS 长什么样

// snippet: 高亮所有空链接
$$('a[href="#"], a[href=""]').forEach(a => {
  a.style.outline = '3px solid red';
  a.title = '空链接';
});
```

---

### 七、Application 面板

#### 7.1 面板入口

```
F12 → Application 标签
```

左侧导航列出了浏览器存储的全部类型：

```
Application
├── Storage
│   ├── Local Storage     ← 永久存储（除非手动清除）
│   ├── Session Storage   ← 关闭标签页即清除
│   ├── IndexedDB         ← 结构化数据存储
│   ├── Cookies           ← 当前页面的 Cookie
│   └── Cache Storage     ← Service Worker 缓存
└── Background Services
```

#### 7.2 Cookies

```
Application → Storage → Cookies → 选择域名

Name     Value          Domain    Expires         HttpOnly  Secure  SameSite
token    eyJhbG...      .ex.com   2026-11-12      ☑                  Lax
theme    dark           .ex.com   2027-01-01              ☑         Lax
```

**可编辑**：双击任意值 → 修改 → 回车生效。经常用来修改 cookie 值测试不同用户身份。

#### 7.3 LocalStorage 与 SessionStorage

```
Application → Storage → Local Storage → 选择域名

Key              Value
user_prefs       {"theme":"dark","lang":"zh"}
last_visit       2026-10-12T10:30:00Z
```

- 右键 → **Clear** 清空该域名下所有存储
- 双击 Key 或 Value → 直接编辑
- 右键 → **Delete** 删除单条记录

```javascript
// Console 中的等价操作
localStorage.setItem('test', 'hello');
localStorage.getItem('test');   // 'hello'
sessionStorage.setItem('temp', 'world');
```

**查看存储占用**：Application 面板每个存储项右侧会显示已用空间（`2.3 KB used`）。Chrome 中 LocalStorage 上限为 5MB/域名。

#### 7.4 IndexedDB

展开 IndexedDB → 选择数据库 → 选择 Object Store → 可以看到结构化数据：

```
▶ todo_db
  ▶ tasks (Object Store)
      key: 1  →  { title: "学习 DevTools", done: false }
      key: 2  →  { title: "写代码", done: true }
```

适合调试使用 IndexedDB（如离线应用、PWA）的项目。数据以表格形式展示，支持搜索。

---

### 八、实战：调试一个异步请求的数据流问题

#### 场景

你在开发一个用户列表页面，代码能正确发起 API 请求并拿到数据，但页面渲染出来是一片空白。

#### Step 1：定位问题代码

```
打开页面 → F12 → Console 面板 → 观察是否有报错
没有报错 → 切换到 Network 面板 → 找到 /api/users 请求
→ 点击 Preview → JSON 数据结构正常，数据存在
→ 问题不在网络层，在 JS 渲染逻辑
```

#### Step 2：设置 XHR 断点

```
Sources 面板 → 右侧 XHR/fetch Breakpoints
→ 点击 + → 输入 "api/users"
→ 刷新页面 → 代码在 fetch() 调用处暂停
```

#### Step 3：单步追踪数据

```
Step Over (F10) 逐步执行：
1. await fetch(url)  → Step Over → response 出现
2. await response.json() → Step Over → data 出现

右键 data → Store as global variable → temp1 → 在 Console 中输入：
temp1.length      → 20（数据正常）
temp1[0]          → { id: 1, name: "Tom" }（数据正常）

继续 Step Over →
3. pageData = data → Step Over → pageData 也有值

继续 Step Over →
4. renderList(pageData) → Step Into（F11）→ 进入渲染函数内部
```

#### Step 4：在渲染函数内排查

在 `renderList` 函数内部逐步执行：

```javascript
function renderList(data) {
  const container = document.getElementById('user-list');
  container.innerHTML = '';          // ← 清空容器
  data.forEach(user => {
    const card = createCard(user);   // ← Step Into 进入 createCard
    container.appendChild(card);
  });
}
```

Step Into 进入 `createCard`：

```javascript
function createCard(user) {
  const div = document.createElement('div');
  div.innerHTML = `
    <h3>${user.userName}</h3>      ← 发现：API 返回的是 user.name，不是 user.userName
    <p>${user.email}</p>
  `;
  return div;
}
```

**找到根因**：API 返回的字段是 `name`，代码中取值用的是 `userName`，导致标题渲染为 `undefined`，不是空白（只是看不见）。

#### Step 5：验证修复

不修改源文件，先在 DevTools 中验证：

```
在断点暂停时，Scope → Local → user
双击 user 对象 → 添加临时属性：user.userName = user.name
→ Resume 继续执行 → 页面正确显示
```

确认修复方案后在源代码中把 `user.userName` 改为 `user.name`。

---

## 常见问题

**Q1：Sources 面板中代码被压缩（minified）看不懂怎么办？**

点击代码编辑器左下角的 `{}`（Pretty Print）按钮，DevTools 会对压缩代码自动格式化，加上缩进和换行。格式化后的文件名会变成 `app.js:formatted`，此时可以设断点。如果是 webpack 项目，打开 `webpack.config.js` 中 `devtool: 'source-map'`，可以直接看到原始源码。

**Q2：断点突然全部失效，蓝色箭头变成了灰色？**

检查两个地方：一是代码编辑器顶部的 **Deactivate breakpoints** 按钮（圆形斜杠图标）是否被误点；二是右侧 Breakpoints 列表中的断点是否被意外取消勾选。

**Q3：Console 中 console.log 输出 `[object Object]`，如何展开？**

用 `console.log(JSON.stringify(obj, null, 2))` 输出格式化 JSON，或者更简单的：`console.log({ obj })` 用对象简写，输出时可展开的属性名就是 `obj`。

**Q4：为什么 Application 面板中看不到某些 Cookie？**

如果 Cookie 的 `HttpOnly` 属性为 true，它在 Application 面板中是可见的，但 Console 中的 `document.cookie` 读不到。如果完全看不到，检查是否选了正确的域名，或者该 Cookie 是否已经过期被浏览器自动清理了。

**Q5：如何在代码中不写 console.log 也能在 Console 中看到变量？**

使用 Live Expression：在 Console 面板中点击**眼睛图标**（Create live expression）→ 输入表达式（如 `document.querySelector('.card')`）→ 它会在 Console 顶部固定显示，实时更新。不需要在代码中写任何 console.log。

**Q6：设置断点后刷新页面，断点位置变了（行号对不上）？**

这是因为 source map 映射偏差，或者文件被 HMR（热更新）替换了。在 webpack 开发模式下这是常见问题。尝试在断点附近几行重新设置，或者使用 `debugger;` 语句（在代码中直接写 `debugger;`，运行时会在那一行自动暂停，等同于行断点）。

**Q7：Call Stack 中看到 "(anonymous)" 是什么意思？**

表示这个函数是匿名函数，通常来自：`setTimeout(() => {...}, 1000)` 中的箭头函数、事件监听器中的匿名回调（`el.addEventListener('click', function() {...})`）、IIFE（`(function() {...})()`）。

---

## 实操作业

### 基础练习：Console 大闯关

打开任意网站，在 Console 中完成以下操作：

1. 用 `$$('a')` 获取页面上所有链接，然后用 `console.table()` 输出链接文字和 URL
2. 用 `console.group()` 创建一个名为"页面分析"的日志组，在组内用 `console.log` 输出 `location.hostname`、`document.title`、`document.images.length`
3. 用 `console.time()` 和 `console.timeEnd()` 包裹 `$$('*').length`（页面上所有元素的数量），记录耗时
4. 在 Elements 面板中选中任意元素，切到 Console，用 `$0` 获取它，然后用 `copy($0.outerHTML)` 把它的 HTML 复制到剪贴板

### 进阶练习：断点排查 Bug

```html
<!-- 保存以下代码为 bug-demo.html，在浏览器中打开 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>断点调试练习</title>
</head>
<body>
<h1>待办事项</h1>
<ul id="todo-list"></ul>
<button id="load-btn">加载待办</button>

<script>
// 模拟 API：返回待办事项
async function fetchTodos() {
  const mockData = [
    { title: '学习 HTML', completed: true },
    { title: '学习 CSS', completed: false },
    { title: '学习 JavaScript', completed: false },
  ];
  return new Promise(resolve => setTimeout(() => resolve(mockData), 500));
}

function renderTodo(todo) {
  const li = document.createElement('li');
  // Bug 1：todo.title 拼成了 todo.titel
  li.textContent = todo.titel;
  // Bug 2：completed 为 true 时应该加删除线，但用了 = 而不是 ===
  if (todo.completed = true) {
    li.style.textDecoration = 'line-through';
  }
  return li;
}

async function loadTodos() {
  const list = document.getElementById('todo-list');
  const todos = await fetchTodos();
  console.log('获取到的数据：', todos);
  todos.forEach(todo => {
    list.appendChild(renderTodo(todo));
  });
}

document.getElementById('load-btn').addEventListener('click', loadTodos);
</script>
</body>
</html>
```

要求：

1. 先用 Network 面板确认 `fetchTodos` 返回的数据是否正确（提示：数据没有经过网络，要在 Sources 面板打断点）
2. 在 `renderTodo` 函数第一行设断点，用 Step Over 逐行执行，排查 Bug 1：为什么标题文字不显示
3. 还是 `renderTodo` 中，排查 Bug 2：为什么所有项都有删除线（即使 `completed: false`）
4. 在 Console 中用 `localStorage.setItem('debug', 'true')` 手动添加一条 localStorage，然后在 Application 面板中验证

### 挑战练习：Snippet 工具箱

1. 在 Snippets 中创建一个名为 "提取所有图片" 的 snippet，功能：收集页面上所有 `<img>` 的 src，用 `console.table` 输出（含 src、alt、width、height），并在每个图片上添加红色边框方便观察
2. 在 Snippets 中创建另一个名为 "性能快照" 的 snippet，功能：用 `performance.getEntriesByType('resource')` 输出所有资源的名称、类型、传输大小和耗时，按耗时从大到小排序后 `console.table` 输出
3. 在任意网页运行这两个 snippet，截图结果

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：在 Atlas 中构造与“Sources 断点调试与 Console 进阶”相关的可观察场景，使用 DevTools 或请求日志记录现象、时间线和结论。
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

- Sources 面板不只是看代码的地方，**Workspace 映射**让你在 DevTools 中改代码并直接保存到本地文件
- **六种断点**各有用武之地：行断点最常用、条件断点对付循环、DOM 断点追踪 DOM 变化、事件断点找回调绑定位置、XHR 断点拦截请求、异常断点捕获静默失败
- **Call Stack + Scope + Watch** 三件套是调试时理解代码运行状态的核心：栈告诉你是谁调用了谁、Scope 告诉你当前有什么变量、Watch 让你写表达式动态追踪
- Console 不只是 `console.log` 的天下——**console.table、console.group、console.time、$0-$4** 让你在排查问题时少写很多代码
- **Snippets** 是你的浏览器内置脚本工具箱，常用操作写一次，多次复用
- Application 面板让你不再"盲"着操作本地存储：Cookie、LocalStorage、SessionStorage、IndexedDB 一目了然，双击即可编辑

<!-- course-nav:start -->
---

[上一篇：02 — Network 面板与性能分析](./02-Network面板与性能分析.md) · [课程地图](../../README.md) · [下一篇：00 控制流、数组、对象与常用内置对象](../../L1-JavaScript与TypeScript/01-JavaScript语法核心/00-控制流-数组-对象与常用内置对象.md)
<!-- course-nav:end -->
