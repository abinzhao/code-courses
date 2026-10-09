# 16-浏览器存储、DevTools 调试与性能指标

## 目标

完成本知识单元后，学员应能根据数据特点选择合适的浏览器存储方案，熟练使用 Chrome DevTools 调试页面，并读懂核心性能指标，建立"用证据定位问题"的工程习惯。

学员应能够：

1. 说清 Cookie、localStorage、sessionStorage、IndexedDB 的容量、生命周期、访问方式与适用场景，并能安全地读写它们。
2. 使用 DevTools 的 Elements 与 Console 面板检查结构、样式与运行时错误。
3. 使用 Sources 面板设置断点、监视变量（watch）、阅读调用栈，完成一次科学的逻辑调试。
4. 使用 Network 与 Application 面板分析请求、Header、缓存与站点数据。
5. 解释 LCP、CLS、INP、FCP、TTFB 与 Long Task 的含义、采集时机和优化方向。
6. 使用 Performance 面板完成一次录制分析，定位长任务与渲染瓶颈。

本单元是浏览器能力的综合运用。存储安全的深入话题、自动化性能审计与线上监控平台在后续单元展开。

## 技术栈

本单元不使用前端框架和第三方 npm 包，以浏览器当前稳定版本自带能力为主，配合少量原生 JavaScript 完成存储与调试实验。

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Chrome 或 Chromium 系浏览器当前稳定版 | 主调试浏览器 | 能熟练打开与切换 DevTools 各面板 |
| Chrome DevTools 当前稳定版 | 调试与性能分析 | 掌握 Elements、Console、Sources、Network、Application、Performance |
| 原生 JavaScript（ES 当前稳定版） | 读写存储、制造实验现象 | 能使用 Web Storage、IndexedDB、Performance Observer API |
| 公开性能指标文档 | 核对阈值与定义 | 能查到 Core Web Vitals 的官方口径 |
| 本地静态服务 | 运行实验页面 | 理解存储按源（origin）隔离，需通过固定地址访问 |

版本约定：

- 所有面板与 API 以"当前稳定版"为准，不写死小版本号。
- 性能阈值以官方当前公开口径为准，文档中给出数量级参考，实际项目以最新官方值校验。
- 实验中禁止存放真实账号密码、令牌等敏感信息，一律使用虚构数据。

开始前检查：

```text
1. 用快捷键打开 DevTools，确认六个主要面板均可进入。
2. 固定一个本地访问地址（如 http://localhost:5173 或本地静态服务端口）。
3. 在 Console 中执行 localStorage，确认返回存储对象。
```

## 详细的理论知识讲解和示例伪代码

### 1. Cookie：随请求自动携带的存储

#### 定义

Cookie 是服务器或浏览器通过 `Set-Cookie` 响应头 / `document.cookie` 设置的小型键值数据，按源与路径隔离。它最特殊的性质是：浏览器向同一服务器发起请求时，会自动把符合范围的 Cookie 放进 `Cookie` 请求头携带，无需 JavaScript 手动处理。

Cookie 有多个控制属性：

- `Expires` / `Max-Age`：过期时间；不设置则为会话 Cookie，浏览器关闭后失效。
- `Domain` / `Path`：发送范围。
- `Secure`：仅在 HTTPS 等安全连接下发送。
- `HttpOnly`：禁止 JavaScript 通过 `document.cookie` 读取，降低被脚本窃取的风险。
- `SameSite`：跨站发送策略（Strict、Lax、None），用于防范跨站请求伪造类风险。

单个 Cookie 与单源 Cookie 总量都很小（数量级约几 KB），不适合存业务数据。

#### 与 Web 的关系

Cookie 的核心用途是登录会话标识：服务器在登录后种一个带 `HttpOnly`、`Secure`、`SameSite` 的会话 Cookie，之后每次请求自动携带，服务器据此识别用户。正因为自动携带且能被请求读出，敏感会话标识必须加 `HttpOnly`，不能让脚本随意访问。

通过 JavaScript 操作 Cookie（受 HttpOnly 限制）：

```js
// 设置：键值后串联属性，一次 document.cookie 赋值写一条，不会覆盖全部
document.cookie = 'theme=dark; path=/; max-age=31536000; SameSite=Lax';
document.cookie = 'lang=zh-CN; path=/; max-age=31536000; Secure; SameSite=Lax';

// 读取：拿到的是当前范围内全部非 HttpOnly Cookie 拼接的字符串
console.log(document.cookie);
// 形如：theme=dark; lang=zh-CN

function getCookie(name) {
  const entries = document.cookie.split('; ');
  for (const entry of entries) {
    const [key, ...rest] = entry.split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

console.log(getCookie('theme')); // dark

// 删除：让同名 Cookie 立即过期
document.cookie = 'theme=; path=/; max-age=0; SameSite=Lax';
```

服务端通过响应头设置（了解报文形态）：

```text
HTTP/1.1 200 OK
Set-Cookie: sid=会话标识占位; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400
```

```text
重要边界：
  1. HttpOnly 的 Cookie 在 document.cookie 中不可见，这是有意设计。
  2. Cookie 会随每个请求自动发送，过大会拖累所有请求。
  3. 不要把业务列表、页面状态塞进 Cookie。
```

#### 常见误区

> Cookie 存在浏览器里，和 localStorage 差不多，只是 API 难用。

本质区别是"随请求自动携带"。Cookie 面向服务端会话，Web Storage 只在本地、不会自动发给服务器。

> 前端需要读取登录令牌，所以不能加 HttpOnly。

加 HttpOnly 恰恰是为了防止页面脚本（包括被注入的恶意脚本）读到会话标识。前端不读取它、请求自动携带，安全性更高。

### 2. localStorage 与 sessionStorage

#### 定义

Web Storage 提供两个按源隔离的键值存储，值统一为字符串，单源容量数量级约 5MB：

- `localStorage`：持久存储，关闭浏览器、重启电脑后仍保留，直到脚本或用户手动清除。
- `sessionStorage`：会话级存储，生命周期绑定当前标签页会话；标签页关闭即清除，新开标签页即使同一地址也不共享。

两者 API 完全相同：`setItem(key, value)`、`getItem(key)`、`removeItem(key)`、`clear()`，并用 `key(index)` 枚举。

#### 与 Web 的关系

localStorage 适合保存低敏感、小体积的本地偏好与草稿：主题、语言、侧边栏开关、未提交的表单草稿。sessionStorage 适合临时、不希望跨标签页串用的数据：一次性向导步骤、临时回放令牌。它们都不会随请求发送，服务器无法直接读到。

读写 JSON 配置的标准封装：

```js
const preferences = {
  theme: 'dark',
  fontSize: 'large',
  sidebarCollapsed: false,
};

// 对象必须先序列化，Storage 只能存字符串
localStorage.setItem('preferences', JSON.stringify(preferences));

function readJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    // 数据损坏时返回默认值，不能让页面崩掉
    return fallback;
  }
}

const saved = readJSON('preferences', {});
console.log(saved.theme); // dark

localStorage.removeItem('preferences');
```

监听存储变化（跨标签页同步）：

```js
window.addEventListener('storage', (event) => {
  if (event.key === 'preferences') {
    console.log('其他标签页更新了偏好', event.newValue);
  }
});
```

sessionStorage 的典型用法：

```js
// 支付向导：步骤数据仅当前标签页有效，关闭即清理
sessionStorage.setItem('checkout-step', '2');
sessionStorage.setItem('checkout-draft', JSON.stringify({ plan: 'yearly' }));
console.log(sessionStorage.getItem('checkout-step'));
```

四种存储的对比表：

```text
特性             Cookie            localStorage       sessionStorage     IndexedDB
容量             约几 KB           约 5MB             约 5MB             数百 MB 级
生命周期         按过期时间        持久               标签页会话         持久
随请求发送       是                否                 否                 否
可被 JS 读取     默认可读/可禁     是                 是                 是
数据结构         字符串            字符串             字符串             结构化对象、索引
服务端会话       适合              不适合             不适合             不适合
```

```text
安全提醒：
  1. 不要把令牌、密码、支付信息放进 Web Storage。
  2. 所有读取值都按"不可信外部数据"处理，解析要兜底。
  3. 存储结构要有版本字段，便于后续迁移。
```

#### 常见误区

> localStorage 数据会自动发给后端。

Web Storage 仅存在本地，请求中不携带；需要时只能用 JavaScript 主动读取并放进请求体。

> 所有标签页共享 sessionStorage。

sessionStorage 按标签页会话隔离，复制链接到新标签页也是一份全新的空存储。需要跨标签页共享应使用 localStorage。

### 3. IndexedDB：浏览器里的结构化数据库

#### 定义

IndexedDB 是浏览器内置的事务型 NoSQL 数据库，可存储大量结构化对象（含文件、Blob），支持键索引、游标遍历和范围查询，全部操作基于异步请求，不会阻塞主线程。它按源隔离，持久保存。

基本概念：

- database：数据库，通过名称与版本号管理。
- object store：对象仓库，类似一张表。
- index：索引，支持按非主键字段查询。
- transaction：事务，所有读写都在事务中进行，保证原子性。
- 版本升级在 `onupgradeneeded` 中创建仓库与索引。

#### 与 Web 的关系

IndexedDB 适合离线优先与大数据量场景：离线文章缓存、本地草稿库、图片/音频等大文件缓存、可离线查询的目录数据。它比 Web Storage 容量大得多、支持真正的查询，但 API 也更复杂；实践中常基于它做封装或使用轻量 Promise 包装。

原生 API 的最小可用封装：

```js
function openNotesDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('notes-db', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('notes')) {
        const store = db.createObjectStore('notes', { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addNote(note) {
  const db = await openNotesDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('notes', 'readwrite');
    transaction.objectStore('notes').put(note);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function getNote(id) {
  const db = await openNotesDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('notes', 'readonly');
    const request = transaction.objectStore('notes').get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

addNote({
  id: 'n-001',
  title: '离线笔记',
  category: '前端',
  updatedAt: Date.now(),
  body: '这条数据可在断网时读取',
}).then(() => getNote('n-001'));
```

按索引与游标查询：

```js
async function listByCategory(category) {
  const db = await openNotesDB();
  return new Promise((resolve, reject) => {
    const results = [];
    const transaction = db.transaction('notes', 'readonly');
    const index = transaction.objectStore('notes').index('category');
    const range = IDBKeyRange.only(category);

    index.openCursor(range).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    transaction.onerror = () => reject(transaction.error);
  });
}
```

数据迁移思路：

```text
1. 用固定递增版本号打开数据库。
2. 在 onupgradeneeded 中按 oldVersion 分支执行建表、加索引、数据补全。
3. 升级逻辑要保证重复执行安全，避免线上用户卡在旧版本。
```

#### 常见误区

> IndexedDB 是 localStorage 的大容量版，读写方式一样。

它是事务型数据库：异步、有仓库/索引/事务概念，不能用同步键值方式访问，容量大但学习成本也高。

> 存进 IndexedDB 的数据可以永久依赖、不用清理。

仍受浏览器存储策略与用户清理影响，配额也可能被回收。关键数据必须以后端为准，本地库只做缓存与离线副本。

### 4. DevTools：Elements 与 Console

#### 定义

Elements 面板实时呈现当前 DOM 树与每个元素的样式：可在面板内编辑节点、增删类名、开关单条样式、查看盒模型、查看元素上的事件监听与 CSS 变量。

Console 面板是 JavaScript 的交互控制台：显示页面错误与警告、可直接输入表达式求值、可打印用 `console.log/error/warn/table` 输出的内容，也能观察未处理的 Promise 异常。

#### 与 Web 的关系

"页面不对"时第一步不是改代码，而是打开 Elements 看实际 DOM 与计算样式：是节点没生成，还是样式被更高优先级规则覆盖。Console 则是最快的运行时证据来源：红色报错会给出错误类型、文件与行号。

Elements 面板的高频操作：

```text
1. 点左上角选择箭头（或快捷键），在页面点元素直接定位。
2. 在 Styles 区勾选/取消单条声明，实时观察。
3. 看 Computed 标签：读取最终生效值，排查被覆盖的样式。
4. 在元素上查看 Event Listeners：确认绑了哪些监听器。
5. 在 :hov 中强制 :hover/:active/:focus 状态，便于调试。
6. 在 :cls 中快速增删类名；CSS 变量可直接在 :root 上改值观察。
```

Console 的分级输出：

```js
const users = [
  { id: 1, name: '林晓', role: '前端' },
  { id: 2, name: '周明', role: '后端' },
];

console.log('普通信息', users.length);
console.table(users);                       // 表格展示对象数组
console.warn('这是一条警告');
console.error('这是一条错误');

console.group('一组相关数据');
console.log('内层 1');
console.log('内层 2');
console.groupEnd();

const element = document.querySelector('h1');
console.dir(element); // 以对象形式展开节点全部属性
```

常见控制台错误的判读：

```text
TypeError: Cannot read properties of null (reading 'style')
  → 前面查找元素得到了 null，先查选择器和脚本执行时机

ReferenceError: xxx is not defined
  → 变量未定义或作用域不可见，检查声明与模块边界

SyntaxError
  → 语法层面错误，检查括号、引号、导入语句

Uncaught (in promise) Error
  → Promise 链中没有 catch，补上错误处理
```

```text
调试纪律：
  1. 先读报错信息与行号，再看代码，不要凭感觉改。
  2. console.log 用于快速验证假设，定位后应清理临时代码。
  3. 复杂逻辑用断点而不是堆日志。
```

#### 常见误区

> Elements 里看到的就是 HTML 源码。

它显示的是当前实时 DOM，可能已被 JavaScript 大量修改，和最初下载的源码并不相同。

> Console 里没有红色错误就说明没有问题。

逻辑错误（如计算结果不对、状态错乱）通常不报错；警告、未处理 Promise、网络失败也要一起看。

### 5. Sources：断点、监视与调用栈

#### 定义

Sources 面板是浏览器内置的图形化调试器，可在源码（含 source map 还原后的源码）上暂停 JavaScript 执行，并在暂停状态检查一切运行时信息：

- 行号断点：点击行号设置，执行到该行前暂停。
- 条件断点：右键行号设置条件，仅表达式为真时暂停。
- Watch（监视）：添加表达式，实时查看其值。
- Scope（作用域）：查看当前闭包、局部、全局变量。
- Call Stack（调用栈）：查看暂停处是被谁一层层调用进来的，可点击上层栈帧切换上下文。
- 单步控制：越过（Step over）、进入（Step into）、跳出（Step out）、继续（Resume）。
- 还可在代码中写 `debugger;` 语句，执行到此处自动暂停。

#### 与 Web 的关系

断点调试解决的是"光看代码想不通"的问题：暂停时你能看到真实的变量值、函数被谁调用、条件分支走了哪条。这比散布几十条 `console.log` 高效得多，也是企业定位复杂业务逻辑的标准手段。

一次科学调试的完整流程：

```text
1. 复现：明确操作路径，稳定触发问题。
2. 假设：根据现象猜测出错的函数或条件。
3. 断点：在假设位置设置断点（或条件断点）。
4. 暂停取证：查看 Scope 与 Watch，读调用栈，确认实际值。
5. 修正假设：值与预期不符时，沿调用栈向上层栈帧追查。
6. 修复并验证：改动后重走相同路径，确认断点处值已正确。
```

示例：一段存在缺陷的折扣计算及断点定位：

```js
function applyDiscount(price, discount) {
  const ratio = discount / 100;
  return price - price * ratio;
}

function checkout(cart, discount) {
  let total = 0;
  for (const item of cart) {
    total += item.price * item.quantity;
  }
  const finalPrice = applyDiscount(total, discount);
  return Math.round(finalPrice);
}

const cart = [
  { price: 100, quantity: 2 },
  { price: 50, quantity: 1 },
];

console.log(checkout(cart, 20));
```

调试操作要点：

```text
1. 在 applyDiscount 第一行打断点，查看 price、discount 实际值。
2. 在 Watch 中添加 ratio、price * ratio，观察计算是否符合预期。
3. 看 Call Stack：applyDiscount ← checkout ← 顶层，确认数据从哪来。
4. 用 Step over 逐行推进，观察返回值。
5. 怀疑只在大单触发时，给断点加条件：price > 1000。
```

`debugger;` 语句的用法：

```js
function handleSubmit(formData) {
  // 打开 DevTools 时执行到此暂停；关闭时无副作用
  debugger;
  validate(formData);
  save(formData);
}
```

异步代码的调用栈：

```text
现代调试器可在 Call Stack 中选择展示异步链路：
  点击事件 → Promise 回调 → 当前函数
调试 fetch、定时器相关问题时，开启异步栈标签能看到最初的触发点。
```

#### 常见误区

> 打断点后页面卡住，是浏览器坏了。

页面是被正常暂停在断点上，点击继续或关闭断点即可恢复；暂停期间所有脚本停止执行。

> 调试只能靠 console.log 一层层打印。

断点能一次看到全部作用域与调用栈，并按需单步，信息密度远高于日志；日志适合快速验证，断点适合系统定位。

### 6. Network 与 Application 面板

#### 定义

Network 面板记录页面发出的全部请求，每条记录可查看：

- Headers：请求行、响应行、请求头、响应头。
- Payload：请求参数（查询串、表单、请求体）。
- Preview / Response：响应内容的结构化预览与原始文本。
- Timing：请求各阶段耗时（排队、连接、等待、下载）。
- Status：状态码；Size：传输大小与缓存情况；Initiator：发起来源。
- 可导出 HAR 文件、模拟弱网与离线、按类型过滤。

Application 面板集中管理站点数据：Cookie、localStorage、sessionStorage、IndexedDB、Cache Storage、Service Worker，可一键清除站点数据，并查看清单与存储配额。

#### 与 Web 的关系

接口问题必须用 Network 取证：是请求没发出、参数错了、状态码异常，还是响应结构变了。缓存误判（其实命中了旧资源）、CORS 报错、401/403 都能在面板中找到直接证据。Application 面板则让存储可见、可改、可清理，是验证存储逻辑与"重置现场"的入口。

Network 的典型排查路径：

```text
现象：保存按钮点了没反应
1. 看是否产生请求：没有 → 查事件绑定与前端校验拦截
2. 有请求：看 Status
   401 → 登录态失效；403 → 无权限；404 → 地址错；500 → 服务端错误
3. 看 Payload：字段名、值是否与接口约定一致。
4. 看 Response：返回结构是否是代码预期的形态。
5. 看 Timing：慢在等待（服务端）还是下载（资源大）。
```

不同失败类型的证据差异：

```text
401 Unauthorized
  → 请求到达服务器，状态码 401，通常响应提示需要登录
CORS 被拦截
  → Console 出现跨域错误；请求可能显示被浏览器拦截，响应头缺允许来源
网络断开 / 请求未发出
  → 请求状态为失败（如 net::ERR_INTERNET_DISCONNECTED），没有有效响应
```

Application 面板操作要点：

```text
1. Storage 总览：查看各存储占用与配额。
2. Local Storage：逐键查看与编辑，验证读取兜底逻辑。
3. Cookies：查看每条 Cookie 的属性（HttpOnly、Secure、SameSite 标记）。
4. IndexedDB：展开库、仓库、索引，查看记录。
5. Clear site data：一次性清空，用于恢复初始现场。
```

用代码配合观察请求与缓存：

```js
async function loadProfile() {
  const started = performance.now();
  const response = await fetch('/api/profile', {
    headers: { Accept: 'application/json' },
  });
  console.log('状态码', response.status, '耗时', Math.round(performance.now() - started));
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }
  return response.json();
}

loadProfile().catch((error) => console.error(error));
```

```text
HAR 文件：
  右键请求列表可导出 HAR（含请求与响应信息），用于离线分享排查。
  分享前注意其中可能含有 Cookie 等敏感头，应先脱敏。
```

#### 常见误区

> 只看 Response 内容就能定位接口问题。

请求参数（Payload）、请求头、状态码、发起来源同样关键。响应"不对"常常是因为请求本身发错了。

> 在 Application 里删掉数据和在代码里删除是两回事，不能用于验证。

面板操作正是对真实存储的修改，可用来验证"数据损坏/缺失时代码能否兜底"，是很好的测试手段。

### 7. 性能指标：Web Vitals 与 Long Task

#### 定义

Core Web Vitals 是衡量用户体验的核心指标，配套指标共同描述加载、稳定与响应：

- LCP（Largest Contentful Paint）：最大内容绘制，视口内最大的文本块或图片元素完成绘制的时间，衡量主要内容何时出现。
- CLS（Cumulative Layout Shift）：累计布局偏移，页面生命周期中意外位移的累计分数，衡量视觉稳定性。
- INP（Interaction to Next Paint）：交互到下次绘制，衡量所有点击、按键等交互的整体响应延迟，已取代 FID 成为交互响应核心指标。
- FCP（First Contentful Paint）：首次内容绘制，第一个任何内容（文字、图片等）出现的时间。
- TTFB（Time to First Byte）：首字节时间，从请求到收到第一个字节的等待，反映网络与服务端响应。
- Long Task（长任务）：主线程上执行超过 50 毫秒的任务，会阻塞交互响应。

#### 与 Web 的关系

这些指标把"快不快、卡不卡"变成可测量的数字。优化方向各有对应：LCP 慢要看最大图片/文本与资源加载；CLS 高通常是无尺寸图片、动态插入内容、字体切换导致；INP 差说明交互处理里有长任务；TTFB 高指向网络或服务器。

用 Performance Observer 在页面中采集：

```js
function observeMetric(name, callback) {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback(entry);
      }
    });
    observer.observe({ type: name, buffered: true });
  } catch {
    // 个别指标类型在不支持的浏览器中静默跳过
  }
}

observeMetric('largest-contentful-paint', (entry) => {
  console.log('LCP 候选时间', Math.round(entry.startTime), entry.element);
});

observeMetric('first-contentful-paint', (entry) => {
  console.log('FCP', Math.round(entry.startTime));
});

observeMetric('layout-shift', (entry) => {
  if (!entry.hadRecentInput) {
    console.log('CLS 增量', entry.value);
  }
});

observeMetric('longtask', (entry) => {
  console.log('长任务', Math.round(entry.duration), '毫秒');
});

observeMetric('event', (entry) => {
  console.log('交互条目 INP 候选', Math.round(entry.duration));
});
```

指标含义与典型成因对照：

```text
指标    关注点           常见成因                          主要优化方向
LCP     主要内容出现     最大图片加载慢、关键文本被阻塞    图片优化、预加载、减少阻塞资源
CLS     视觉稳定         图片无尺寸、广告/弹窗动态插入     预留尺寸、占位、避免无通知插入
INP     交互响应         事件处理含长任务、渲染重          拆分任务、减少渲染、延迟非关键逻辑
FCP     首次任何内容     阻塞资源多、TTFB 高               精简关键资源、服务端提速
TTFB    服务器响应       网络慢、服务端处理久、重定向多    CDN、缓存、减少服务端耗时
```

指标阈值只记数量级并以官方最新口径为准：

```text
良好体验（数量级参考）：
  LCP 约 2.5 秒以内
  CLS 约 0.1 以内
  INP 约 200 毫秒以内
  说明：阈值可能更新，正式评判时查阅官方当前文档。
```

减少 CLS 的具体写法：

```css
/* 图片/视频容器预留比例，杜绝加载后顶开布局 */
.media-frame {
  aspect-ratio: 16 / 9;
  width: 100%;
}

/* 字体显示策略：减少文字不可见与换脸跳动 */
@font-face {
  font-family: 'WeeklySans';
  src: url('./weekly-sans.woff2') format('woff2');
  font-display: swap;
}
```

```text
长任务处理思路：
  1. 把大批量计算切片，用多次任务让出主线程。
  2. 首屏不需要的逻辑延迟或移入 Worker。
  3. 减少交互处理中的强制同步布局。
```

#### 常见误区

> 首屏白屏一定是前端问题。

TTFB 高时瓶颈在网络或服务端；LCP 慢也可能是服务端首字节晚、图片服务器慢。要用指标分段判断。

> CLS 是页面整体移动一次的距离。

它是多次意外偏移分数的累计值，即使每次偏移很小，次数多了也会超标。

### 8. Performance 面板基础

#### 定义

Performance 面板通过录制一段时间内浏览器的全部活动，生成一条完整时间线，包含：网络请求、主线程任务（脚本执行、解析、布局、绘制）、渲染帧率、CPU 与内存变化、长任务标记，以及交互与绘制事件（点击、LCP、布局偏移等）。它回答的问题是："这段时间里，主线程究竟在忙什么？"

#### 与 Web 的关系

当指标告诉你"INP 差、有长任务"，下一步就是用 Performance 录制去定位具体函数与具体帧：哪个任务超过 50 毫秒、里面是脚本还是布局、发生在哪一帧。录制—定位—优化—再录制对比，是性能优化的标准闭环。

一次录制分析的步骤：

```text
1. 点击录制按钮，执行可疑操作（点击、滚动、输入）。
2. 停止录制，等待时间线生成。
3. 先看概览：CPU 是否打满、帧率是否掉帧、红色长任务在哪。
4. 放大长任务区间，查看 Main 线程火焰图。
5. 识别任务构成：Evaluating Script / Layout / Paint 各占多少。
6. 点开具体函数，结合 Bottom-Up / Call Tree 找到耗时最大的调用。
7. 优化后用完全相同操作再录制一次对比。
```

火焰图阅读方法：

```text
Main 线程（横轴时间，纵轴调用关系）
  顶层长条（如 Task，长度超过 50ms 标红）= 一个长任务
    长条内纵向分层 = 调用栈，越上层越早调用
      宽的子块 = 真正耗时的函数
Bottom-Up：从最耗时的底层函数反向聚合，适合找热点
Call Tree：从调用入口向下，适合理解执行路径
```

制造一个可录制的长任务：

```html
<button type="button" id="heavy">触发长任务</button>
<button type="button" id="chunked">分片处理</button>

<script>
  const rows = Array.from({ length: 20000 }, (_, i) => ({ id: i, value: Math.random() }));

  document.querySelector('#heavy').addEventListener('click', () => {
    // 一次性同步处理：主线程被长时间独占
    const result = rows
      .filter((row) => row.value > 0.5)
      .map((row) => ({ id: row.id, score: row.value * 100 }))
      .sort((a, b) => b.score - a.score);
    console.log('长任务结果数量', result.length);
  });

  document.querySelector('#chunked').addEventListener('click', () => {
    // 分片处理：每批之间让出主线程，交互仍可响应
    const output = [];
    let index = 0;
    const batchSize = 1000;

    function processBatch() {
      const end = Math.min(index + batchSize, rows.length);
      for (; index < end; index += 1) {
        if (rows[index].value > 0.5) {
          output.push({ id: rows[index].id, score: rows[index].value * 100 });
        }
      }
      if (index < rows.length) {
        setTimeout(processBatch, 0);
      } else {
        output.sort((a, b) => b.score - a.score);
        console.log('分片结果数量', output.length);
      }
    }

    processBatch();
  });
</script>
```

录制对比的观察点：

```text
长任务版本：
  Main 线程出现一段连续红色长块，期间点击无响应，INP 变差。
分片版本：
  多个短小任务，任务之间有空隙，主线程可插入交互响应。
还可在录制中勾选内存曲线，观察是否持续上升不回落。
```

```text
Performance 使用纪律：
  1. 录制区间尽量短，只覆盖可疑操作。
  2. 优化前后用相同设备、相同操作对比。
  3. 先定位最大瓶颈再动手，避免无证据微调。
```

#### 常见误区

> Performance 面板只用来测加载速度。

它同样记录交互、滚动、输入期间的全部活动，定位运行时卡顿与渲染问题同样靠它。

> 录制一次看到长任务，就立刻凭函数名修改。

应结合 Bottom-Up 确认热点是否真在该函数、是否稳定复现，再动手；否则容易优化了占比很小的代码。

## 课后题

1. Cookie 与 Web Storage 最本质的区别是什么？请解释登录会话标识为什么常设置 `HttpOnly; Secure; SameSite`。
2. localStorage 与 sessionStorage 在生命周期和标签页共享上有什么不同？请各举一个适合存放的数据例子。
3. 场景分析：某页面读取 localStorage 后 JSON.parse 直接崩溃。请分析数据可能处于什么状态，并写出带兜底的读取函数。
4. IndexedDB 适合什么场景？它和 localStorage 在数据模型与执行方式上有何不同？
5. 场景分析：用户反馈"页面在手机上保存不了登录态，但同事的手机正常"。请说明你会优先检查 Cookie 的哪些属性、浏览器设置与访问地址差异。
6. 页面显示与预期不符时，你会用 Elements 面板的哪些功能判断"是节点问题还是样式覆盖问题"？请给出判断顺序。
7. 请描述用 Sources 面板调试一个逻辑错误的完整过程，并说明 Watch、Scope、Call Stack 各自提供什么信息。
8. 场景分析：点击保存后没有任何反应。请按 Network 面板的排查路径，描述至少四种可能的失败点及对应证据。
9. LCP、CLS、INP、FCP、TTFB 分别衡量什么？请把"图片无尺寸导致内容下跳""点击后处理耗时 800ms""服务器首字节等待 1.8 秒"分别对应到具体指标。
10. 场景分析：Performance 录制中出现一个 400 毫秒的长任务。请描述你会如何在火焰图中定位热点，并给出两种把长任务变短的思路。

## 实践练习题

### 练习 1：偏好设置的多存储实现

#### 任务

为一个设置面板实现多层存储：主题与语言存 localStorage；一次性向导步骤存 sessionStorage；登录会话相关行为只通过理解 Cookie 属性完成（不手工造登录令牌）。要求刷新与重开标签页时表现符合各自存储特性，损坏数据不导致崩溃。

#### 步骤约束

1. 提供主题、语言两个控件，变更后立即写入 localStorage。
2. 向导步骤数据写入 sessionStorage，关闭标签页后验证其消失。
3. 所有读取使用带 try/catch 与默认值的封装。
4. 提供"恢复默认"与"清空本站本地数据"两个按钮。
5. 在 Application 面板中手工篡改存储值，验证页面兜底能力。
6. 记录刷新、关闭重开、新开标签页三种情况下的数据表现。

#### 提交物

- `settings.html` 与 `settings.js`；
- 三种存储的行为观察记录；
- 篡改数据后的兜底演示截图；
- 150 字左右说明各存储选型理由。

#### 验收标准

- 偏好持久生效，向导数据随标签页关闭清除；
- 非法 JSON 不导致页面白屏；
- 清空按钮能恢复初始状态；
- 提交内容中不含任何真实凭证。

### 练习 2：断点定位逻辑缺陷

#### 任务

在一个含计算逻辑的页面中故意保留一个逻辑错误（如折扣、排序或统计口径错误），使用 Sources 面板通过断点、Watch 与调用栈定位根因，再做最小修复；要求保留完整调试证据。

#### 步骤约束

1. 逻辑至少包含两个函数，使调用栈能体现多层调用关系。
2. 必须设置至少一个普通断点和一个条件断点。
3. 在 Watch 中添加关键中间变量并记录其暂停时的值。
4. 通过 Call Stack 确认错误数据来自哪一层。
5. 修复采用最小改动，不通过重写整块代码回避定位。
6. 修复后重走相同路径，在断点处确认值已正确。

#### 提交物

- 修复前后的页面与脚本；
- 断点暂停截图（含 Watch、Scope、Call Stack）；
- 一份调试记录：假设、证据、根因、修复、验证。

#### 验收标准

- 能清晰说明错误的真实根因而非现象；
- 调试证据中包含变量值与调用关系；
- 修复前后行为差异可被同一组输入验证；
- 控制台没有遗留未处理错误。

### 练习 3：性能录制与指标优化

#### 任务

构造一个同时存在加载与交互性能问题的页面：一个大列表一次性同步处理（长任务）、若干无尺寸图片（CLS）、一张超大首屏图（LCP）。先采集指标与录制，再逐项优化，最后用相同操作再采集对比。

#### 步骤约束

1. 用 Performance Observer 或面板记录优化前的 LCP、CLS、INP 与 Long Task。
2. 用 Performance 面板录制一次触发长任务的操作，定位热点函数。
3. 优化必须包含：列表分片或移入 Worker、图片设置尺寸/比例、首屏图响应式或预加载。
4. 每次优化后重新录制，避免一次改太多无法归因。
5. 用文字记录每项优化对应哪个指标、动了流水线哪一段。
6. 优化前后使用同一访问地址与相同操作。

#### 提交物

- `before/` 与 `after/` 两套页面；
- 两次指标记录表与 Performance 录制截图；
- 300 字左右优化报告：指标变化与原理。

#### 验收标准

- 长任务被消除或显著缩短，交互期间主线程有空隙；
- CLS 增量明显下降，图片加载不再顶开布局；
- LCP 时间提前并有对应措施；
- 优化结论全部由采集数据支撑。

## 阶段验收作业

### 作业名称

浏览器存储与性能综合诊断报告

### 作业场景

你接手一个真实感很强的内容页面，它存在四类问题：登录态与偏好的存储使用混乱、一处难以靠阅读发现的逻辑缺陷、若干失败或缓慢的网络请求、明显的交互卡顿与布局跳动。团队要求你用浏览器自带能力完成一次完整诊断：合理使用存储、用断点定位逻辑、用 Network 取证、用指标与 Performance 面板找到性能瓶颈，并交付"问题版 → 优化版"的全过程证据。

### 提交物

```text
browser-diagnosis/
├── before/
│   ├── index.html
│   ├── scripts/
│   └── styles/
├── after/
│   ├── index.html
│   ├── scripts/
│   └── styles/
├── evidence/
│   ├── storage-report.md      # 存储选型与读写记录
│   ├── debug-log.md           # 断点调试全过程
│   ├── network-report.md      # 请求分析（脱敏）
│   └── performance-report.md  # 指标与录制对比
├── diagrams/
│   └── diagnosis-flow.md      # 诊断流程图
└── README.md
```

页面必须包含：登录态相关行为（以 Cookie 属性理解，不放置真实令牌）、用户偏好（localStorage）、一个数据列表（可用 IndexedDB 或内存数据）、若干图片与至少四个可观察请求。

### 演示步骤

学员需在 15 分钟内完成以下现场演示：

1. 展示存储方案：指出偏好、会话数据、登录标识分别应放在哪里，并在 Application 面板验证。
2. 现场篡改一处存储数据，展示读取兜底逻辑保证页面不崩溃。
3. 复现逻辑缺陷，用 Sources 断点暂停，读 Watch 与 Call Stack 讲清根因，再展示修复。
4. 在 Network 中定位一个失败/缓慢请求，说明状态码、参数、响应与 Timing 证据。
5. 展示优化前后的 LCP、CLS、INP（或其候选值）与 Long Task 对比。
6. 播放优化前 Performance 录制，指出长任务位置与热点函数，再对比优化后录制。
7. 用一句话总结每个问题的诊断依据与修复原理。

导师可以临时改变存储值、输入参数或录制操作，验证结论是否由证据支撑。

### 评分标准（100 分）

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 存储方案与安全 | 20 | 四类存储选型正确；读写有兜底；不含敏感凭证 |
| Elements/Console 运用 | 10 | 能用面板区分节点与样式问题；准确判读错误 |
| Sources 断点调试 | 20 | 断点/watch/调用栈使用完整；根因定位准确 |
| Network/Application 分析 | 15 | 请求证据链完整；存储数据可查看、修改、清理 |
| 性能指标与 Performance | 25 | 指标采集齐全；录制定位准确；优化前后对比明显 |
| 证据组织与表达 | 10 | 报告结构清晰；事实、推断与依据区分明确 |

细分评分规则：

#### 存储方案与安全：20 分

- Cookie/Web Storage/IndexedDB 选型正确：8 分；
- 读写封装有异常兜底与版本意识：6 分；
- 不存放真实令牌/密码，理解 HttpOnly 等属性：6 分。

#### Elements/Console 运用：10 分

- 能用 Computed 与 Styles 排查覆盖问题：5 分；
- 能根据控制台错误类型与行号定位：5 分。

#### Sources 断点调试：20 分

- 断点与条件断点设置合理：6 分；
- Watch/Scope 取证充分：6 分；
- 通过调用栈沿层追查根因：5 分；
- 修复为最小改动且经验证：3 分。

#### Network/Application 分析：15 分

- 状态码、Payload、Response、Timing 分析完整：8 分；
- 能用 Application 修改与清理数据验证逻辑：7 分。

#### 性能指标与 Performance：25 分

- LCP/CLS/INP/FCP/TTFB 与 Long Task 采集齐全：8 分；
- 能在火焰图中定位热点：7 分；
- 长任务、布局偏移、LCP 至少三项优化落地：7 分；
- 优化前后用相同操作对比：3 分。

#### 证据组织与表达：10 分

- 四份报告与流程图完整：6 分；
- 结论与证据一一对应：4 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 存储选型明显错误：把会话标识随意放进 Web Storage，或把业务大数据塞进 Cookie。
2. 读取存储不做任何兜底，篡改或损坏数据后页面直接白屏崩溃。
3. 逻辑缺陷无法通过断点定位，只凭猜测重写代码，拿不出 Watch 与调用栈证据。
4. Network 分析只看响应体，无法说明状态码、请求参数或失败类型的区别。
5. 性能部分没有任何采集数据或录制证据，仅凭主观感受声称"变快了"。
6. 提交真实密码、令牌、Cookie 原文或未脱敏的 HAR 文件。
7. 只提交截图，缺少问题版/优化版源码与完整诊断报告。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 掌握四类浏览器存储的区别与用法 | 存储报告、Application 演示与篡改实验 |
| 使用 Elements/Console 检查页面 | 面板操作与错误判读记录 |
| 使用 Sources 断点/watch/调用栈调试 | 调试记录与现场演示步骤 3 |
| 使用 Network/Application 分析请求与数据 | 网络报告与演示步骤 4 |
| 理解核心性能指标与 Long Task | 指标采集表与优化前后对比 |
| 使用 Performance 面板定位瓶颈 | 录制文件与火焰图分析 |

### 提交前自检

- [ ] 六个学习目标均有对应证据。
- [ ] 偏好、会话数据、登录标识分别使用了正确的存储方式。
- [ ] 所有存储读取都有异常兜底，篡改数据后页面不崩溃。
- [ ] 逻辑缺陷通过断点、Watch、调用栈定位，修复为最小改动。
- [ ] Network 记录覆盖状态码、参数、响应、Timing 四个方面。
- [ ] LCP、CLS、INP、FCP、TTFB 与 Long Task 数据已采集。
- [ ] Performance 录制能指出具体长任务与热点函数。
- [ ] 优化前后使用相同设备、地址与操作对比。
- [ ] 提交内容中没有真实凭证，HAR 等文件已脱敏。
- [ ] README 可指导另一名学员复现全部诊断过程。
