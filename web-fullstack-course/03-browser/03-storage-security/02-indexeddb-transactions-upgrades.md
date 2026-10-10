# 02 IndexedDB 事务、索引与升级：让草稿迁移可恢复

## 任务卡

邻里集市商品草稿比主题偏好更大、更结构化，还需要按状态查询。团队把草稿迁到 IndexedDB，却在单个 `put()` 成功时立即提示“已保存”，没有等待事务完成；升级数据库时另一个标签保持旧连接，发布页面一直卡在 `blocked`。本课建立 v1→v2 的可重复迁移、事务提交证据和失败回滚。

| 产出 | 完成标准 | 证据 |
| --- | --- | --- |
| v1 数据库 | 含一条旧形状草稿 | Application 截图/记录 |
| v2 迁移 | 新增状态与索引，旧记录可读 | 升级日志 |
| 事务写入 | 以 `complete` 为成功 | 页面状态 |
| 故障回滚 | 重复键使整笔事务 abort | 复验查询 |

建议投入 100～130 分钟。实验数据可随时删除，不能使用真实个人信息。

## 1. 任务背景

IndexedDB 是浏览器中的异步对象数据库。它按源保存数据库、对象仓库和索引，操作通常经历：

```text
indexedDB.open(name, version)
  → 需要升级时 versionchange 事务
  → request success 得到 IDBDatabase
  → db.transaction(stores, mode)
  → 发起一个或多个 request
  → transaction complete / abort
```

请求成功只表示该操作在事务内产生结果；事务之后仍可能因其他请求、约束、配额或显式 abort 失败。业务“保存成功”应以事务完成为准。

IndexedDB 仍是用户设备上的可清理数据，不是服务端数据库。它适合离线草稿、缓存和可恢复本地工作，不适合作为多人商品库存、授权或预约的唯一真相。

## 2. 学习目标

- 区分 open 请求、升级事务、普通事务和对象仓库请求。
- 使用 `onupgradeneeded` 按 `oldVersion` 执行幂等的逐版本迁移。
- 建立 keyPath、唯一约束和普通索引，并知道索引会增加写入成本。
- 等待事务 `complete`，在 `error`/`abort` 时不显示成功。
- 解释事务活动期，避免在事务中等待无关网络或计时器。
- 处理 `blocked` 与 `versionchange`，提示其他标签关闭旧连接。
- 使用游标迁移旧记录，不一次假设所有数据形状正确。
- 在清库、配额和隐私模式下保留明确恢复边界。

## 3. 预备知识

完成[Web Storage 与跨标签冲突](01-memory-web-storage-cross-tab.md)，理解 Promise 和事件。创建：

```text
practice/browser-08-indexeddb/
  server.mjs
  public/
    index.html
    app.js
```

运行 `node server.mjs`，访问 `http://127.0.0.1:3300/`。在 Application → IndexedDB 观察 `market-drafts`。需要重做升级时使用页面的“重建v1”，不要删除同源无关数据库。

## 4. 核心理论

### 4.1 数据模型

本课 v2 草稿：

```text
Draft
  id: string（主键）
  title: string
  priceCents: 非负整数
  status: "editing" | "ready"
  updatedAt: UTC ISO 8601
```

对象仓库 `drafts` 使用 `keyPath: "id"`；索引 `by_status` 用于按状态读取。IndexedDB 支持结构化克隆，不要求先 JSON.stringify，但业务仍需校验形状。

### 4.2 升级只在 versionchange 事务中改 schema

`createObjectStore`、`createIndex` 等 schema 操作应在 `onupgradeneeded` 中执行。按 `oldVersion` 写迁移：

```text
oldVersion < 1 → 建 drafts
oldVersion < 2 → 加 status、迁移记录、建 by_status
```

不要只判断 `oldVersion === 1`，否则全新安装从0直接开v2会漏掉步骤。

### 4.3 连接阻塞

另一个标签持有 v1 连接时，v2 升级可触发 `blocked`。旧连接会收到 `versionchange`，应关闭并提示刷新。强行让用户等待而不说明原因，会把正确协调误报为数据库死锁。

### 4.4 事务生命周期

事务在相关请求完成且事件循环返回后可自动变为 inactive 并提交。下面模式危险：

```js
const tx = db.transaction("drafts", "readwrite");
await fetch("/validate");
tx.objectStore("drafts").put(value);
```

网络等待期间事务可能已结束。先在事务外取得和校验数据，再打开短事务同步排入 IndexedDB 请求。

### 4.5 错误与回滚

同一事务中的未处理请求错误通常会导致事务 abort，之前写入也回滚。捕获单个 request 错误时要理解 `preventDefault` 对事务传播的影响，不能为了“继续”留下半套不一致数据。

## 5. 协议字段、API、事件、状态与安全边界清单

| 名称 | 用途 | 边界 |
| --- | --- | --- |
| `indexedDB.open(name, version)` | 打开/升级数据库 | 版本必须递增整数 |
| `onupgradeneeded` | schema 与迁移 | 在 versionchange 事务内 |
| `onsuccess/onerror` | 请求结果 | 单个成功不等于事务提交 |
| `onblocked` | 升级被旧连接阻塞 | 提示关闭其他标签 |
| `db.onversionchange` | 当前连接将过期 | 关闭连接并提示刷新 |
| `db.transaction()` | 事务作用域和模式 | 仓库范围创建时确定 |
| `tx.oncomplete/onabort` | 提交/回滚证据 | 成功以 complete 为准 |
| `objectStore.put()` | 新增或替换 | 会覆盖同主键记录 |
| `objectStore.add()` | 只新增 | 重复键触发约束错误 |
| `createIndex()` | 建二级索引 | 索引增加空间和写成本 |
| `openCursor()` | 逐条读取/迁移 | 回调中保持请求链 |
| `deleteDatabase()` | 删除整个数据库 | 破坏性，仅限实验确认 |

安全边界：IndexedDB 可被同源脚本读取，XSS 仍是威胁；浏览器存储不提供用户对象授权。敏感离线数据需要产品级威胁建模，而不是只依赖“数据库在本机”。

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
  <title>IndexedDB 升级实验 · 邻里集市</title>
  <style>
    body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem; }
    label { display: block; margin: .5rem 0; }
    button { margin: .25rem; }
    pre { white-space: pre-wrap; background: #f4f4f4; padding: 1rem; }
  </style>
</head>
<body>
  <main>
    <h1>商品草稿数据库</h1>
    <p>仅保存本机教学草稿，可随时被清理，不会发布商品。</p>
    <button id="v1" type="button">重建v1与旧草稿</button>
    <button id="v2" type="button">升级/打开v2</button>
    <button id="list" type="button">查询editing索引</button>
    <button id="abort" type="button">注入重复键事务</button>
    <label>标题 <input id="title" value="二手自行车"></label>
    <label>价格（分） <input id="price" type="number" value="28000"></label>
    <button id="save" type="button">保存v2草稿</button>
    <p id="status" role="status">数据库尚未打开</p>
    <pre id="output"></pre>
  </main>
  <script type="module" src="./app.js"></script>
</body>
</html>
```

### 6.3 完整文件：`public/app.js`

```js
const databaseName = "market-drafts";
const status = document.querySelector("#status");
const output = document.querySelector("#output");
let database = null;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(
      transaction.error ?? new Error("事务已回滚"),
    );
    transaction.onerror = () => {
      // onabort 负责给出最终事务结果。
    };
  });
}

function closeDatabase() {
  database?.close();
  database = null;
}

function deleteDatabase() {
  closeDatabase();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(databaseName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      status.textContent = "删除被其他标签连接阻塞，请关闭同源实验页";
    };
  });
}

function openDatabase(version) {
  closeDatabase();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, version);
    request.onblocked = () => {
      status.textContent = `升级到v${version}被旧连接阻塞`;
    };
    request.onupgradeneeded = (event) => {
      const db = request.result;
      const tx = request.transaction;
      output.textContent += `升级 ${event.oldVersion} → ${event.newVersion}\n`;
      if (event.oldVersion < 1) {
        db.createObjectStore("drafts", { keyPath: "id" });
      }
      if (event.oldVersion < 2) {
        const store = tx.objectStore("drafts");
        if (!store.indexNames.contains("by_status")) {
          store.createIndex("by_status", "status", { unique: false });
        }
        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) return;
          const value = cursor.value;
          if (!["editing", "ready"].includes(value.status)) {
            cursor.update({ ...value, status: "editing" });
          }
          cursor.continue();
        };
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      database = request.result;
      database.onversionchange = () => {
        database.close();
        database = null;
        status.textContent = "检测到新版本，请刷新或重新打开数据库";
      };
      resolve(database);
    };
  });
}

async function rebuildVersionOne() {
  await deleteDatabase();
  const db = await openDatabase(1);
  const tx = db.transaction("drafts", "readwrite");
  tx.objectStore("drafts").add({
    id: "draft-legacy",
    title: "旧版台灯草稿",
    priceCents: 3900,
    updatedAt: "2026-10-10T08:00:00.000Z",
  });
  await transactionDone(tx);
  status.textContent = "v1与旧草稿已提交；可在另一标签保持连接后测试阻塞";
}

async function ensureVersionTwo() {
  if (!database || database.version !== 2) await openDatabase(2);
  return database;
}

async function saveDraft() {
  const db = await ensureVersionTwo();
  const priceCents = Number(document.querySelector("#price").value);
  const title = document.querySelector("#title").value.trim();
  if (!title || !Number.isInteger(priceCents) || priceCents < 0) {
    throw new Error("标题不能为空，价格必须是非负整数分");
  }
  const tx = db.transaction("drafts", "readwrite");
  tx.objectStore("drafts").put({
    id: "draft-current",
    title,
    priceCents,
    status: "editing",
    updatedAt: new Date().toISOString(),
  });
  await transactionDone(tx);
  status.textContent = "草稿事务已提交";
}

async function listEditing() {
  const db = await ensureVersionTwo();
  const tx = db.transaction("drafts", "readonly");
  const request = tx.objectStore("drafts").index("by_status").getAll("editing");
  const drafts = await requestResult(request);
  await transactionDone(tx);
  output.textContent = JSON.stringify(drafts, null, 2);
  status.textContent = `查询到 ${drafts.length} 条editing草稿`;
}

async function injectAbort() {
  const db = await ensureVersionTwo();
  const tx = db.transaction("drafts", "readwrite");
  const store = tx.objectStore("drafts");
  const duplicate = {
    id: "duplicate",
    title: "事务回滚实验",
    priceCents: 100,
    status: "editing",
    updatedAt: new Date().toISOString(),
  };
  store.add(duplicate);
  store.add(duplicate);
  try {
    await transactionDone(tx);
    status.textContent = "错误：故障事务意外提交";
  } catch (error) {
    status.textContent = `事务已按预期回滚：${error.name}`;
  }
}

async function run(operation) {
  try {
    await operation();
  } catch (error) {
    status.textContent = `操作失败：${error.name} ${error.message}`;
  }
}

document.querySelector("#v1").addEventListener("click", () => run(rebuildVersionOne));
document.querySelector("#v2").addEventListener("click", () => run(async () => {
  const db = await openDatabase(2);
  status.textContent = `已打开v${db.version}`;
}));
document.querySelector("#save").addEventListener("click", () => run(saveDraft));
document.querySelector("#list").addEventListener("click", () => run(listEditing));
document.querySelector("#abort").addEventListener("click", () => run(injectAbort));
addEventListener("pagehide", closeDatabase);
```

### 6.4 运行与预期

1. 点击“重建v1”，Application 中旧记录没有 `status`。
2. 点击“升级/打开v2”，日志显示 `1 → 2`；旧记录获得 `status: editing`，索引存在。
3. 保存当前草稿并查询索引，两条记录均可见，金额为整数分，时间为 UTC ISO。
4. 注入重复键：事务 abort；再次查库不应存在 `id="duplicate"`。
5. 阻塞实验：标签A保持v1连接，标签B尝试v2；A收到 versionchange 并关闭后，B完成升级。若时机因页面代码自动关闭而很短，在 DevTools 断点暂停 A 的回调再观察，随后恢复。

## 7. 邻里集市集成案例

IndexedDB 草稿与服务端商品分工：

| 数据 | 所有者 | 冲突策略 |
| --- | --- | --- |
| 未发布草稿 | 当前设备 IndexedDB | 本地版本和恢复提示 |
| 已发布 Listing | 服务端数据库 | `ownerId` 授权、`version` 冲突409 |
| 图片临时引用 | 明确生命周期的本地/上传状态 | 不把失效对象URL持久化 |
| 收藏/预约 | 服务端 | 唯一约束与事务 |

发布流程：

1. 从 IndexedDB 读取并运行时校验草稿。
2. 向服务端 POST；服务端独立校验、认证和授权。
3. 只有收到201并解析合法结果后，才在新事务删除对应本地草稿。
4. 网络失败保留草稿；409展示服务器版本，不静默覆盖。

删除本地草稿和创建服务端商品不能成为一个跨系统原子事务，因此要设计可重试顺序和幂等键。

## 8. 常见错误与排查路径

### 明确错误示例

```js
// 错误：请求排入成功后立即展示保存成功，事务之后仍可能abort。
const tx = db.transaction("drafts", "readwrite");
tx.objectStore("drafts").put(draft);
showSuccess();
```

修复：监听事务 `complete`；`abort`/`error` 显示失败并保留输入。

### 诊断记录

| 字段 | 本次记录 |
| --- | --- |
| 现象 | v2升级一直不结束 |
| 证据 | 新页触发blocked；旧页仍有v1连接；无服务请求 |
| 原因 | 旧连接阻止 versionchange 事务取得独占升级 |
| 修复 | 旧页 `versionchange` 中关闭db并提示刷新 |
| 复验 | 旧页关闭连接后v2升级完成，旧草稿迁移且索引可查 |

排查顺序：确认 origin/数据库名/版本 → 观察 open 事件 → 查 blocked/versionchange → 查事务 complete/abort → 查 request.error → Application 验证 schema 和数据 → 清理后从0与从v1各跑一次。

## 9. 课后题

<details>
<summary>1. 为什么单个 put 的 success 不能当最终保存成功？</summary>

它只表示请求在事务中成功；后续请求、约束、配额或显式 abort 仍可能回滚整笔事务。以 transaction complete 为提交证据。

</details>

<details>
<summary>2. 为什么迁移判断使用 oldVersion &lt; 2，而不是 === 1？</summary>

全新用户可从0直接打开v2。逐级小于判断能让所有缺失步骤依次执行。

</details>

<details>
<summary>3. 为什么不在 readwrite 事务中 await 网络校验？</summary>

事务可能在没有待处理请求时自动结束，网络返回后变成 inactive。网络工作放事务外，拿到结果后创建短事务。

</details>

<details>
<summary>4. IndexedDB 能否执行对象授权？</summary>

不能。它属于当前浏览器源，同源脚本可访问。权威用户身份和 `ownerId` 授权必须由服务端执行。

</details>

## 10. 实践练习

### 基础

增加 `by_updatedAt` 索引并按时间倒序显示草稿。答案标准：索引在升级事务创建，时间是合法 UTC ISO；展示排序有确定规则。

### 进阶

设计 v3：新增 `version` 非负整数并迁移旧记录为1。答案标准：从0、v1、v2三条路径都成功，未知损坏记录隔离并报告，不阻塞全部迁移。

### 故障注入

打开两个标签，在一页故意不关闭旧连接，观察 blocked；然后恢复 `versionchange` 关闭逻辑。答案标准：记录双方事件，升级后数据与索引完整，未用清库掩盖真实迁移问题。

## 11. 阶段验收

- [ ] Node/HTML/JS 完整案例可运行。
- [ ] 可从空库创建v2，也可从v1迁移v2。
- [ ] 旧草稿迁移后字段、索引和金额单位正确。
- [ ] 保存成功只在事务 complete 后展示。
- [ ] 重复键故障导致整笔事务回滚，库中无半成品。
- [ ] blocked/versionchange 有用户可理解的恢复路径。
- [ ] 数据清理只针对实验数据库并有确认。
- [ ] 明确 IndexedDB 可清理、同源脚本可读、不是服务端授权数据库。
- [ ] Safari/Firefox、隐私模式、真实配额和大数据迁移未验证。

## 12. 常见问题

**为什么示例不使用 async/await 直接等待所有 IDBRequest？**
原生 request 是事件对象，不是 Promise。本课只包装结果，并始终单独等待事务完成。

**对象仓库能保存 Date 吗？**
结构化克隆支持 Date，但项目跨网络与数据库统一使用 UTC ISO 字符串，减少层间表示差异。

**升级中能否发网络请求决定 schema？**
不应。升级事务应确定、短小、本地完成；网络不稳定会延长阻塞并破坏可复现性。

**删除数据库为什么会 blocked？**
其他页面仍持有连接。与版本升级一样，需要连接协作关闭。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Indexed Database API 3.0](https://www.w3.org/TR/IndexedDB-3/)：请求、事务、版本和索引规范。
- [MDN IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)：实践入口。
- [MDN IDBOpenDBRequest `upgradeneeded`](https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/upgradeneeded_event)：升级事件。
- [MDN IDBTransaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)：活动期与错误传播。
- [MDN `versionchange`](https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/versionchange_event)：连接协作。
- [Storage Standard](https://storage.spec.whatwg.org/)：清理与配额模型。

浏览器对事务调度和耐久性选项存在实现差异；大规模迁移要在真实数据副本、目标浏览器和低端设备上测试。

## 我现在能做到什么

我能设计带主键和索引的 IndexedDB 草稿库，从旧版本可重复迁移，处理 blocked/versionchange，并以事务 complete/abort 判断提交或回滚；同时清楚本地草稿不是服务端商品与对象授权的替代品。

## 单元导航

[上一课：内存、Web Storage 与跨标签冲突](01-memory-web-storage-cross-tab.md) · [下一课：源、Cookie、XSS、CSRF 与授权](03-origin-cookie-xss-csrf-authorization.md) · [章入口](../03-storage-security.md)
