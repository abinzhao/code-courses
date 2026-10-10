# 01 内存、Web Storage 与跨标签冲突：本地状态不是权威数据

## 任务卡

邻里集市用 `localStorage` 保存主题和“收藏”。刷新后主题还在，但两个标签页同时修改收藏时后写覆盖先写；清除站点数据后收藏全部消失。你的任务是比较内存、`sessionStorage`、`localStorage` 的生命周期，校验序列化数据，并观察版本记录能发现哪些跨标签冲突、又遗漏哪些同时写窗口。

| 产出 | 完成标准 | 证据 |
| --- | --- | --- |
| 三层状态实验 | 刷新、复制/新建标签和清站点数据可区分 | 对照表 |
| 安全读取器 | JSON 损坏和旧版本可恢复 | 页面日志 |
| 跨标签同步 | 其他标签收到 `storage` 事件 | 双窗口记录 |
| 冲突观察 | 区分可检测的新版本与不可检测的同时写窗口 | 版本、writer 与丢失更新记录 |

建议投入 90～120 分钟。示例收藏只属于本地演示，不能称为账号收藏。

## 1. 任务背景

浏览器中的状态有不同所有权和生命周期：

| 机制 | 生命周期/范围 | 数据形状 | 典型用途 |
| --- | --- | --- | --- |
| JavaScript 内存 | 当前文档运行实例 | 任意对象 | 当前筛选、临时展开状态 |
| `sessionStorage` | 当前顶层浏览上下文会话、按源 | 字符串键值 | 当前标签页草稿步骤 |
| `localStorage` | 按源、跨会话（可被清理） | 字符串键值 | 少量非敏感偏好 |
| 服务端数据库 | 由账号和业务规则管理 | 结构化权威数据 | 收藏、商品、预约 |

`localStorage` 是同步 API。读取大值、频繁序列化或跨标签锁竞争可能阻塞主线程。它可以被同源脚本读取，因此不能保存密码、会话 Cookie 替代品或长期 Bearer Token。

用户可清站点数据，浏览器可在存储压力或隐私模式下限制/清理，配额也不是跨浏览器常量。本地持久化表示“尽力保留”，不是永久承诺。

## 2. 学习目标

- 区分内存、sessionStorage、localStorage 与服务端权威状态。
- 知道 Web Storage 按源隔离、只保存字符串且同步执行。
- 使用带 schema 版本的 JSON 包装，校验解析结果而不是只捕获语法错误。
- 处理 `SecurityError`、配额、禁用存储和隐私模式差异。
- 解释 `storage` 事件通常发给其他同源文档，而不是发起写入的当前文档。
- 使用版本号、writer ID 和更新时间发现跨标签陈旧写入。
- 知道“最后写入获胜”只是策略，不自动等于业务正确。
- 将本地演示收藏与账号收藏清楚分层。

## 3. 预备知识

理解 JSON、事件监听和本卷 [browser-lab 契约](../README.md#多文件实验怎样启动)。创建：

```text
practice/browser-07-web-storage/
  server.mjs
  public/
    index.html
    app.js
```

必须通过 `http://127.0.0.1:3300/` 打开，不使用 `file:`。运行 `node server.mjs` 后打开两个独立标签页；需要观察 `sessionStorage` 时，分别测试“复制标签页”“新开地址”和刷新，记录当前浏览器实际行为。

## 4. 核心理论

### 4.1 字符串存储与 schema

直接保存对象会得到 `"[object Object]"`。正确流程是序列化、解析、校验：

```text
业务对象
  → 规范化允许字段
  → JSON.stringify
  → setItem
  → getItem
  → JSON.parse
  → 校验 schema/version/字段
  → 可用状态或安全默认值
```

JSON 语法合法不代表业务合法。`{"theme":"laser"}` 可解析，却不是允许主题。每个持久键应带命名空间和版本，例如 `market:preferences:v1`。

### 4.2 同步与原子边界

单次 `setItem` 对一个键是同步替换，但“读 → 修改 → 写”不是跨标签事务：

```text
标签A读 revision 3
标签B读 revision 3
标签A写 revision 4
标签B仍基于3写 revision 4，覆盖A
```

Web Storage 没有比较并交换。版本检查只能发现部分冲突，不能提供数据库级并发保证。账号收藏应提交服务器，由数据库唯一约束和接口幂等性处理。

### 4.3 `storage` 事件

一个文档写 localStorage 后，其他同源文档可收到事件，其中含 key、oldValue、newValue、storageArea 和 URL。写入页通常不收到自己触发的同一事件，因此应在本地写后直接更新自身状态，并在事件中处理外部变化。

事件不是可靠消息队列：关闭的页面不会补收历史，值可能被快速覆盖。需要实时消息语义时使用适当通道或服务端同步。

### 4.4 敏感性与清理

XSS 运行在同源上下文，可读取 localStorage。`HttpOnly` Cookie 可阻止脚本直接读取 Cookie，但不能让 XSS 无害。Web Storage 不应保存秘密；开发者工具中可见也意味着共享设备用户可能接触。

清理策略要按键和 schema 执行，不要使用 `localStorage.clear()` 删除同源其他模块的数据。

## 5. 协议字段、API、事件、状态与安全边界清单

| 名称 | 用途 | 边界 |
| --- | --- | --- |
| `sessionStorage` | 标签页会话字符串状态 | 新窗口/复制行为需实测；同步 |
| `localStorage` | 跨会话少量偏好 | 可清理、同步、同源脚本可读 |
| `getItem()` | 读字符串或 `null` | `null` 与字符串 `"null"` 不同 |
| `setItem()` | 同步写键值 | 可能抛配额或安全异常 |
| `removeItem()` | 删除本模块键 | 比 `clear()` 更安全 |
| `key()` / `length` | 枚举存储 | 顺序不应作为业务契约 |
| `storage` 事件 | 其他文档变化通知 | 当前写入页通常不收到 |
| `StorageEvent.oldValue/newValue` | 变化前后字符串 | 删除/新增时可为 `null` |
| `BroadcastChannel` | 同源文档消息 | 不是持久数据库，支持需检查 |
| `navigator.storage.estimate()` | 配额估算 | 数值与策略因环境变化 |

源边界包括协议、主机和端口；`localhost:3300` 与 `127.0.0.1:3300` 不是同源。隐私窗口、第三方上下文和用户设置可能改变可用性。

## 6. 最小可运行案例

### 6.1 完整文件：`server.mjs`

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve("./public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    if (req.method !== "GET" || !req.url?.startsWith("/") || req.url.startsWith("//")) {
      res.writeHead(400);
      res.end("Bad Request");
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1:3300");
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!file.startsWith(root + sep) || !types[extname(file)]) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[extname(file)],
      "Cache-Control": "no-store",
    });
    res.end(await readFile(file));
  } catch (error) {
    console.error(error);
    res.writeHead(500);
    res.end("Local server error");
  }
}).listen(3300, "127.0.0.1", () => {
  console.log("打开 http://127.0.0.1:3300/");
});
```

### 6.2 完整文件：`public/index.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>Web Storage 实验 · 邻里集市</title>
  <style>
    body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem; }
    button { margin: .25rem; }
    pre { white-space: pre-wrap; background: #f4f4f4; padding: 1rem; }
    .dark { color-scheme: dark; background: #171717; color: #fff; }
  </style>
</head>
<body>
  <main>
    <h1>本地偏好与演示收藏</h1>
    <p>本页数据只在当前浏览器源内演示，不是账号级收藏。</p>
    <button id="memory" type="button">内存计数 +1</button>
    <button id="session" type="button">会话计数 +1</button>
    <button id="theme" type="button">切换主题</button>
    <button id="favorite" type="button">切换自行车收藏</button>
    <button id="corrupt" type="button">写入损坏JSON</button>
    <button id="remove" type="button">删除本模块键</button>
    <p id="status" role="status">准备就绪</p>
    <pre id="output"></pre>
    <h2>跨标签事件</h2>
    <pre id="events"></pre>
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 6.3 完整文件：`public/app.js`

```js
const key = "market:preferences:v1";
const writerId = crypto.randomUUID();
const status = document.querySelector("#status");
const output = document.querySelector("#output");
const events = document.querySelector("#events");
let memoryCount = 0;
let current = readPreferences();

function defaults() {
  return {
    schemaVersion: 1,
    revision: 0,
    writerId: "defaults",
    updatedAt: "1970-01-01T00:00:00.000Z",
    theme: "light",
    favoriteIds: [],
  };
}

function isPreferences(value) {
  return value
    && value.schemaVersion === 1
    && Number.isInteger(value.revision)
    && value.revision >= 0
    && typeof value.writerId === "string"
    && typeof value.updatedAt === "string"
    && ["light", "dark"].includes(value.theme)
    && Array.isArray(value.favoriteIds)
    && value.favoriteIds.every((id) => typeof id === "string");
}

function readPreferences() {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaults();
    const parsed = JSON.parse(raw);
    return isPreferences(parsed) ? parsed : defaults();
  } catch (error) {
    status.textContent = `读取失败，使用安全默认值：${error.name}`;
    return defaults();
  }
}

function writePreferences(change) {
  const latest = readPreferences();
  if (latest.revision > current.revision && latest.writerId !== writerId) {
    status.textContent = "检测到其他标签的新版本，请先查看再重试";
    current = latest;
    render();
    return false;
  }
  const next = {
    ...latest,
    ...change,
    schemaVersion: 1,
    revision: latest.revision + 1,
    writerId,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(key, JSON.stringify(next));
    current = next;
    render();
    return true;
  } catch (error) {
    status.textContent = `写入失败：${error.name}`;
    return false;
  }
}

function render() {
  document.documentElement.classList.toggle("dark", current.theme === "dark");
  output.textContent = JSON.stringify({
    writerId,
    memoryCount,
    sessionCount: Number(sessionStorage.getItem("market:session-count") ?? "0"),
    preferences: current,
  }, null, 2);
}

document.querySelector("#memory").addEventListener("click", () => {
  memoryCount += 1;
  status.textContent = "内存计数已更新；刷新后会归零";
  render();
});

document.querySelector("#session").addEventListener("click", () => {
  const count = Number(sessionStorage.getItem("market:session-count") ?? "0") + 1;
  sessionStorage.setItem("market:session-count", String(count));
  status.textContent = "当前标签页会话计数已更新";
  render();
});

document.querySelector("#theme").addEventListener("click", () => {
  if (writePreferences({ theme: current.theme === "dark" ? "light" : "dark" })) {
    status.textContent = "主题偏好已写入本地演示存储";
  }
});

document.querySelector("#favorite").addEventListener("click", () => {
  const favorites = new Set(current.favoriteIds);
  favorites.has("listing-1")
    ? favorites.delete("listing-1")
    : favorites.add("listing-1");
  if (writePreferences({ favoriteIds: [...favorites] })) {
    status.textContent = "本地演示收藏已更新；不是账号收藏";
  }
});

document.querySelector("#corrupt").addEventListener("click", () => {
  localStorage.setItem(key, "{broken");
  current = readPreferences();
  render();
});

document.querySelector("#remove").addEventListener("click", () => {
  localStorage.removeItem(key);
  current = defaults();
  status.textContent = "只删除了本模块键";
  render();
});

addEventListener("storage", (event) => {
  if (event.key !== key) return;
  events.textContent += JSON.stringify({
    key: event.key,
    oldValue: event.oldValue,
    newValue: event.newValue,
    url: event.url,
  }, null, 2) + "\n";
  current = readPreferences();
  status.textContent = "收到其他标签页的存储变化";
  render();
});

render();
```

### 6.4 运行与预期

1. 内存、会话、主题各加一次并刷新：内存归零；会话与本地偏好通常保留。
2. 打开第二个同源标签，在第二页切主题：第一页收到 `storage` 事件；第二页不靠该事件更新自己。
3. 先让标签 A 写入并等待标签 B 收到 `storage` 事件，再让 B 修改：B 能看到新 revision。
4. 在两个标签都暂停于写入前、确认二者基于同一 revision 后继续：二者都可能写出同一个下一 revision，后写静默覆盖前写。这是本实验必须保留的失败证据。
5. 写入损坏 JSON：页面回退浅色默认值并明确失败，不显示“保存成功”。
6. Application 中清除该源数据：所有本地状态可消失，这不会删除服务端商品，因为本课没有服务端数据库。

## 7. 邻里集市集成案例

本课把主题存本地是合理的；“收藏”只用于展示跨标签冲突，界面必须写“本地演示收藏”。正式收藏使用统一 API：

```text
PUT /api/v1/favorites/:listingId
DELETE /api/v1/favorites/:listingId
```

PUT/DELETE 表达目标状态，网络重试不会像“toggle POST”那样再次反转。服务端按已认证用户写唯一 `(userId, listingId)` 关系，前端 localStorage 不提供身份或唯一约束。

可采用分层：

- 内存：当前页乐观状态与待处理请求。
- localStorage：非敏感显示偏好。
- 服务端：权威收藏。
- 网络恢复：从服务端重新同步，不用本地值覆盖服务器。

时间记录使用 `new Date().toISOString()`，但客户端时钟仅供本地诊断，不能决定服务端并发先后。

## 8. 常见错误与排查路径

### 明确错误示例

```js
// 错误：无校验、无异常处理，还把整个同源存储当本模块所有。
const preferences = JSON.parse(localStorage.preferences);
localStorage.clear();
```

修复：使用命名键、schema 校验、异常处理和 `removeItem(key)`；敏感/权威数据不放 Web Storage。

### 诊断记录

| 字段 | 本次记录 |
| --- | --- |
| 现象 | 两个标签分别收藏不同商品，最后只剩一个 |
| 证据 | 两页都基于revision 3；随后各写revision 4；后写覆盖前写 |
| 原因 | 读改写不是事务，版本相同无法自动合并 |
| 修复 | 本地只在已观察到更新时提示冲突；正式收藏改用服务端幂等接口、唯一约束和事务 |
| 复验 | 顺序写可提示新版本；同 revision 同时写仍能复现丢失更新；服务端两次目标状态请求得到一致收藏 |

排查顺序：核对 origin → Application 查看原始字符串 → 解析并校验 → 比较 revision/writer → 查其他标签事件 → 模拟清理/禁用 → 复验安全默认值。

## 9. 课后题

<details>
<summary>1. localStorage 关闭浏览器后还在，是否说明永久可靠？</summary>

不说明。用户、浏览器策略、配额、隐私模式和存储压力都可能清理或限制它。

</details>

<details>
<summary>2. 为什么写入页通常收不到自己的 storage 事件？</summary>

该事件用于通知同源的其他文档。写入页已经知道自己执行了操作，应直接更新本地状态。

</details>

<details>
<summary>3. schemaVersion 能否解决两个标签并发写？</summary>

不能。它解决数据结构演进；并发还需 revision/冲突策略，权威业务最终要由服务端事务或约束处理。

</details>

<details>
<summary>4. HttpOnly Cookie 与 localStorage 的 XSS 边界有何不同？</summary>

同源脚本可直接读 localStorage；HttpOnly Cookie 不可由脚本直接读取。但 XSS 仍可代表用户发请求和读取页面数据，所以两者都不能让 XSS 无害。

</details>

## 10. 实践练习

### 基础

新增 `pageSize` 偏好，只允许10、20、50。答案标准：损坏、字符串或其他数字回退20；写入后刷新保留。

### 进阶

为 schema v0 `{ dark: true }` 编写一次性迁移到 v1。答案标准：只接受明确旧形状，迁移后写新键并保留 revision；未知形状不猜测。

### 故障注入

在两个标签暂停断点，使它们都读同一 revision 后再继续写。答案标准：记录丢失更新；说明当前版本检查的竞态窗口，并把账号收藏迁到服务端方案。

## 11. 阶段验收

- [ ] 三个完整文件可运行。
- [ ] 刷新、第二标签、清站点数据三种生命周期有证据。
- [ ] JSON 语法和业务结构都经过校验。
- [ ] 损坏数据和写入异常不会显示保存成功。
- [ ] `storage` 事件只承担通知，不当可靠队列。
- [ ] 能分别复现“收到新版本后提示”和“同 revision 同时写仍静默覆盖”。
- [ ] 收藏明确标记为本地演示，正式方案使用服务端接口。
- [ ] 没有在 Web Storage 保存密码、会话或长期令牌。
- [ ] Safari/Firefox、隐私模式、嵌入式上下文和真实配额标为未验证。

## 12. 常见问题

**为什么不直接保存 Set？**
JSON 不原生保留 Set 类型。应转换为数组并在读取时校验，再按需要重建 Set。

**localStorage 一次写入是否原子？**
单键替换不会暴露半个字符串，但多步读改写和多个键不构成业务事务。

**可否用时间戳决定谁的新？**
客户端时钟可能错误或被修改。时间可用于诊断；权威并发使用服务端版本和事务。

**BroadcastChannel 能否替代服务器？**
不能。它只在支持的同源上下文间传消息，没有账号、跨设备持久化或数据库约束。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [HTML Standard: Web storage](https://html.spec.whatwg.org/multipage/webstorage.html)：Storage 与事件模型。
- [MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)：生命周期与同步边界。
- [MDN `storage` event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)：跨文档通知。
- [Storage Standard](https://storage.spec.whatwg.org/)：配额与持久化模型。
- [MDN Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)：浏览器差异。
- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)：客户端存储安全建议。

配额和清理策略快速演进，必须在目标浏览器、普通/隐私模式和嵌入场景重新验证。

## 我现在能做到什么

我能按生命周期选择内存、sessionStorage 和 localStorage，使用版本化 schema 安全读取偏好，观察跨标签事件，并说明版本检查只能发现部分冲突；同时清楚本地收藏可丢失、可被同源脚本读取，不能替代账号级服务端数据。

## 单元导航

[章入口：存储与安全](../03-storage-security.md) · [下一课：IndexedDB 事务与升级](02-indexeddb-transactions-upgrades.md) · [浏览器卷](../README.md)
