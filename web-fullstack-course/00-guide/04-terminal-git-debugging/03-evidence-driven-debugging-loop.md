# 03 证据驱动的调试闭环：从稳定复现到回归验证

## 任务卡

邻里集市新增了“读取演示商品”按钮。页面能打开，点击却没有显示自行车信息，Console 还出现 `TypeError`。你的任务不是随机加判断或刷新缓存，而是依次完成复现、最小化、假设、插桩、修复、回归和报告，并证明修复没有破坏首页 200 与错误路径 404。

| 阶段 | 本课产出 | 可观察证据 |
| --- | --- | --- |
| 复现 | 稳定的操作步骤 | 每次点击得到同一异常 |
| 定位 | 一个可证伪假设 | 断点中的 ID 类型和值 |
| 修复 | 最小代码变化 | diff 只改变 ID 处理与失败保护 |
| 回归 | 正常与故障路径 | 点击成功、404 保持、重载后仍成功 |
| 报告 | 可交接记录 | 现象、证据、原因、修复、复验 |

建议用 120～150 分钟。JavaScript 语法会在后续卷系统学习，本课重点是调试方法；代码必须完整运行，但暂不要求独立写出全部脚本。

## 1. 任务背景

缺陷描述通常从用户现象开始：“按钮没反应”“页面空白”“请求失败”。现象是调查入口，不是根因。调试需要把模糊描述变成可以重复的实验：

```text
明确期望与实际
  → 在受控环境稳定复现
  → 缩小仍能失败的范围
  → 提出可证伪假设
  → 收集能区分假设的证据
  → 实施最小修复
  → 重复原步骤并检查相邻行为
  → 留下可交接报告
```

若没有修复前证据，就无法证明改动解决了原问题；若没有回归验证，就无法证明修复没有制造相邻故障。

## 2. 学习目标

完成后，你应能：

- 把故障描述写成环境、前置、步骤、期望和实际。
- 区分现象、证据、假设、原因和修复。
- 建立稳定复现并记录复现率。
- 最小化输入和代码，同时保留原故障。
- 提出可证伪、能被实验区分的假设。
- 使用 Console、Sources、Network、终端和 Git diff 收集证据。
- 在断点中检查值与类型，不只看错误最后一行。
- 实施与根因对应的最小修复，不吞掉异常。
- 运行原始复现、正常路径、错误路径和重载回归。
- 把无法验证的范围写成剩余风险。
- 连续两次修正失败时停止试错，重新检查假设和边界。

## 3. 预备知识

先完成：

- [DevTools 与第一份请求证据](../03-computer-first-page/03-devtools-first-request-evidence.md)；
- [终端、进程与端口](01-terminal-processes-ports.md)；
- [Git 三棵树、提交与分支](02-git-three-trees-commits-branches.md)。

需要 Node.js 24 LTS、浏览器 DevTools 和个人练习目录。创建新的 `market-learning/debug-lab`，不要覆盖已经通过验收的 `market-start`。

本课所有商品数据都在浏览器内存中，并在页面标为演示数据。按钮不会创建真实预约、联系卖家或写入服务器。

## 4. 核心理论

### 4.1 先把描述变成复现契约

一个可执行的缺陷描述至少包含：

| 字段 | 本课具体值 |
| --- | --- |
| 环境 | Node.js 24 LTS、当前 Chromium、`127.0.0.1:3300` |
| 前置 | 服务已启动，首页文档请求为 200 |
| 操作 | 点击“读取演示商品” |
| 期望 | 状态区显示“九成新自行车，280 元” |
| 实际 | 状态不变，Console 出现 TypeError |
| 复现率 | 新加载后连续 3 次均复现 |
| 边界 | 内存演示，不调用真实 API |

“偶尔不工作”不是足够的步骤。若问题只在特定输入、浏览器、账号或网络条件下出现，也要记录这些前置。

### 4.2 现象、证据、假设和原因不能互换

```text
现象：点击后状态没有变化
证据：Console 在 listing.title 抛 TypeError
假设：find 没找到商品，listing 是 undefined
进一步证据：断点显示 listingId 是 NaN
原因：把字符串业务 ID 用 Number 转换
修复：保持 ID 为字符串，并处理找不到商品的分支
```

“JavaScript 有问题”不是根因；“可能是缓存”也不是证据。根因应解释为什么这个输入通过这条代码路径必然产生观察到的结果。

### 4.3 稳定复现先于修改

复现时固定：

- 同一文件与提交状态；
- 同一启动命令和端口；
- 同一 URL；
- 同一浏览器标签页或明确的新标签页；
- 同一点击顺序；
- 同一观察面板。

先执行三次，记录每次结果。若故障不稳定，先查竞态、缓存、共享状态和环境差异；不要用一次偶然成功宣称问题消失。

### 4.4 最小化要保留失败机制

最小复现不是把代码删到“看起来短”，而是逐项移除与故障无关的内容，且每次都确认故障仍存在。

本课错误只需要：

```text
一个字符串 ID
  → 被 Number 转为 NaN
  → 用严格相等查字符串字段
  → find 返回 undefined
  → 读取 undefined.title 抛错
```

样式、图片、数据库和 HTTP API 都不参与。把它们移出实验能缩小范围；把 `find` 整段改成固定成功值则消除了故障机制，不能用于定位。

### 4.5 假设必须可证伪

弱假设：

```text
浏览器可能坏了。
```

可证伪假设：

```text
data-listing-id 是字符串 "bike-001"；
代码执行 Number 后得到 NaN；
因此 find 无法匹配字符串 item.id。
```

验证表达式：

```js
const button = document.querySelector("#load-listing");
({
  raw: button.dataset.listingId,
  rawType: typeof button.dataset.listingId,
  converted: Number(button.dataset.listingId),
  convertedType: typeof Number(button.dataset.listingId),
  isNaN: Number.isNaN(Number(button.dataset.listingId)),
});
```

如果结果不是预期，假设被推翻，应重新调查，而不是继续按原方案改代码。

### 4.6 插桩要能区分候选原因

可用证据：

| 工具 | 本课问题 |
| --- | --- |
| Network | HTML 是否 200，是否加载了正确页面 |
| Console | 异常类型、消息、来源行 |
| Sources 断点 | `rawId`、`listingId`、`listing` 的值与类型 |
| Elements | 按钮是否有正确 `data-listing-id` |
| 终端 | 服务是否运行、是否读取失败 |
| Git diff | 修复到底改了什么 |

临时日志应结构化并避免敏感数据：

```js
console.debug("listing-lookup", {
  rawId,
  convertedId: listingId,
  found: Boolean(listing),
});
```

修复完成后删除无长期价值的临时日志。不要记录 Cookie、Token、真实联系方式或完整用户对象。

### 4.7 从错误位置向上找数据来源

错误发生在：

```js
listing.title
```

这只能说明 `listing` 不可用，不能说明根因就在这一行。向上追：

```text
listing 来自 find
  → find 比较 item.id 与 listingId
  → listingId 来自 Number(rawId)
  → rawId 来自 button.dataset.listingId
```

在 Sources 逐行观察：

```text
rawId = "bike-001"       类型 string
listingId = NaN          类型 number
listing = undefined
```

调用栈帮助定位触发链；变量值解释为什么走到错误。

### 4.8 修复应对应根因并保留失败边界

仅增加可选链：

```js
status.textContent = `${listing?.title}`;
```

页面会显示 `undefined`，Console 可能不再抛错，但查找仍失败。这是把症状静音，不是修复。

正确方向包括两部分：

1. 保持字符串 ID，不做错误数值转换；
2. 即使将来 ID 不存在，也显示受控错误并保留诊断日志。

```js
function renderListing(button, status, listings) {
  const listingId = button.dataset.listingId;
  const listing = listings.find((item) => item.id === listingId);

  if (!listing) {
    status.textContent = "未找到演示商品，请检查商品标识。";
    console.error("listing-not-found", { listingId });
    return;
  }

  status.textContent =
    `${listing.title}，${listing.priceCents / 100} 元`;
}
```

失败保护不能替代根因修复，两者共同保证正常输入成功、异常输入可恢复。

### 4.9 回归验证按风险展开

本课最小回归矩阵：

| 场景 | 预期 |
| --- | --- |
| 首次加载 | 文档 200，状态为“尚未读取” |
| 正常 ID | 点击显示标题与 280 元 |
| 再次点击 | 结果稳定，无重复副作用 |
| 不存在 ID | 显示受控错误，Console 有明确事件 |
| 刷新后再点 | 仍成功，临时 DOM 状态被重建 |
| `/missing` | 仍返回 404 |
| 服务停止 | 刷新为连接失败 |

修复点击错误不能把 404 改成 200，也不能让页面伪装成真实预约成功。

### 4.10 报告结论必须有证据强度

可以写：

```text
已确认：字符串 ID 被 Number 转为 NaN，断点与 Console 均观察到。
已验证：正常 ID、未知 ID、刷新、404 在当前 Chromium 通过。
未验证：Safari、Firefox、真实移动设备和屏幕阅读器。
```

不能写：

```text
所有浏览器完全没问题。
```

当前没有运行相应环境。明确缺口比虚报通过更可靠。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `data-*` | 在元素上保存字符串数据 | `data-listing-id="bike-001"` | `dataset` 读取结果是字符串 |
| `HTMLElement.dataset` | 读取 `data-*` | `button.dataset.listingId` | 不做自动领域类型校验 |
| `Number` | 转换数值 | `Number("12")` | 非数值字符串得到 `NaN` |
| `Number.isNaN` | 判断 `NaN` | `Number.isNaN(value)` | 不做隐式类型转换 |
| `Array.prototype.find` | 找首个匹配项 | `items.find(predicate)` | 找不到返回 `undefined` |
| 严格相等 `===` | 比较类型和值 | `item.id === id` | 字符串与数值不相等 |
| `console.error` | 记录受控错误事件 | 结构化对象 | 不记录秘密和隐私 |
| `debugger` / 行断点 | 暂停执行检查状态 | Sources 点击行号 | 暂停时页面会等待 |
| 调用栈 | 展示函数调用链 | 异常或断点时查看 | 最深依赖帧不一定是根因 |
| `git diff` | 查看修复范围 | 修复前后比较 | 不包含未跟踪文件全文 |
| `git diff --check` | 检查空白错误 | 交付前运行 | 不验证业务行为 |
| HTTP 404 | 表达路径不存在 | `/missing` | 不应为消除红字改成 200 |

## 6. 最小可运行案例

本节先运行完整故障版本，保留证据后再修复。

### 6.1 文件结构

```text
market-learning/
└── debug-lab/
    ├── index.html
    └── server.mjs
```

### 6.2 完整故障页面

把下面内容保存为 `debug-lab/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>调试实验 · 邻里集市</title>
</head>
<body>
  <main>
    <h1>邻里集市调试实验</h1>
    <p>本页只读取浏览器内存中的演示商品，不创建真实预约。</p>

    <button
      id="load-listing"
      type="button"
      data-listing-id="bike-001"
    >
      读取演示商品
    </button>
    <p id="status" role="status">尚未读取演示商品。</p>
  </main>

  <script>
    const listings = [
      {
        id: "bike-001",
        title: "九成新自行车",
        priceCents: 28000,
        status: "available",
        createdAt: "2026-10-11T02:00:00Z",
      },
    ];

    const button = document.querySelector("#load-listing");
    const status = document.querySelector("#status");

    button.addEventListener("click", () => {
      const rawId = button.dataset.listingId;
      const listingId = Number(rawId);
      const listing = listings.find((item) => item.id === listingId);

      status.textContent =
        `${listing.title}，${listing.priceCents / 100} 元`;
    });
  </script>
</body>
</html>
```

这是明确的错误案例。业务 ID `bike-001` 是字符串，不能转成价格那样的数字。

### 6.3 完整本机服务

`debug-lab/server.mjs`：

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const host = "127.0.0.1";
const port = 3300;
const pagePath = new URL("./index.html", import.meta.url);

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${host}:${port}`);

  if (request.method !== "GET") {
    response.writeHead(405, {
      "Content-Type": "text/plain; charset=utf-8",
      Allow: "GET",
    });
    response.end("Method not allowed");
    return;
  }

  if (url.pathname !== "/") {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end("页面不存在");
    return;
  }

  try {
    const html = await readFile(pagePath);
    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    response.end(html);
  } catch (error) {
    console.error("page-read-failed", { message: error.message });
    response.writeHead(500, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Server error");
  }
});

server.listen(port, host, () => {
  console.log(`打开 http://${host}:${port}/`);
});
```

### 6.4 运行与稳定复现

终端进入 `debug-lab`：

```bash
node server.mjs
```

打开：

```text
http://127.0.0.1:3300/
```

DevTools 打开 Console 与 Network。每轮先刷新，再点击一次按钮，共执行三轮。

预期每轮：

- 首页文档为 200；
- 状态仍是“尚未读取演示商品”；
- Console 在读取 `listing.title` 时出现 `TypeError`；
- 服务终端没有 500；
- `/missing` 仍返回 404。

### 6.5 最小化与断点

在 Sources 的点击处理函数中，对以下三行依次设断点：

```js
const rawId = button.dataset.listingId;
const listingId = Number(rawId);
const listing = listings.find((item) => item.id === listingId);
```

观察：

| 变量 | 值 | 类型 |
| --- | --- | --- |
| `rawId` | `"bike-001"` | string |
| `listingId` | `NaN` | number |
| `listing` | `undefined` | undefined |

这组证据支持根因。若实际值不同，应停止按本答案修改，先解释环境或代码差异。

### 6.6 停止方式

完成故障记录后回服务终端按 `Ctrl+C`。不要关闭所有 Node.js 进程。

## 7. 邻里集市集成案例

### 7.1 完整修复页面

保留故障记录后，把 `debug-lab/index.html` 替换为下面的完整修复版本：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>调试实验 · 邻里集市</title>
</head>
<body>
  <main>
    <h1>邻里集市调试实验</h1>
    <p>本页只读取浏览器内存中的演示商品，不创建真实预约。</p>

    <button
      id="load-listing"
      type="button"
      data-listing-id="bike-001"
    >
      读取演示商品
    </button>
    <p id="status" role="status">尚未读取演示商品。</p>
  </main>

  <script>
    const listings = [
      {
        id: "bike-001",
        title: "九成新自行车",
        priceCents: 28000,
        status: "available",
        createdAt: "2026-10-11T02:00:00Z",
      },
    ];

    const button = document.querySelector("#load-listing");
    const status = document.querySelector("#status");

    button.addEventListener("click", () => {
      const listingId = button.dataset.listingId;
      const listing = listings.find((item) => item.id === listingId);

      if (!listing) {
        status.textContent = "未找到演示商品，请检查商品标识。";
        console.error("listing-not-found", { listingId });
        return;
      }

      status.textContent =
        `${listing.title}，${listing.priceCents / 100} 元`;
    });
  </script>
</body>
</html>
```

### 7.2 修复机制

修复差异应集中在：

```diff
- const rawId = button.dataset.listingId;
- const listingId = Number(rawId);
+ const listingId = button.dataset.listingId;
  const listing = listings.find((item) => item.id === listingId);

+ if (!listing) {
+   status.textContent = "未找到演示商品，请检查商品标识。";
+   console.error("listing-not-found", { listingId });
+   return;
+ }
```

第一处消除错误转换，第二处让未知 ID 成为可诊断失败。没有改服务器路由、HTTP 状态或商品价格。

### 7.3 正常路径复验

保存并刷新，点击按钮：

```text
九成新自行车，280 元
```

检查：

```js
document.querySelector("#load-listing").dataset.listingId
document.querySelector("#status").textContent
```

预期分别为 `"bike-001"` 和包含商品标题、280 元的文字。Console 不再出现原 TypeError。

### 7.4 未知 ID 复验

在 Elements 中临时把按钮属性改为：

```html
data-listing-id="missing-001"
```

点击后状态应显示“未找到演示商品，请检查商品标识。”，Console 出现结构化 `listing-not-found`，页面不崩溃。

刷新后 DOM 恢复为源文件的 `bike-001`，再次点击成功。这证明：

- 失败保护能处理未知 ID；
- Elements 临时修改没有污染源文件；
- 正常路径在故障注入后仍可恢复。

### 7.5 HTTP 相邻回归

保持服务运行：

| 地址 | 预期 |
| --- | --- |
| `/` | 200，HTML，按钮正常 |
| `/missing` | 404，纯文本“页面不存在” |
| 停止服务后 `/` | 连接失败 |

修复浏览器脚本不应改变这些协议结果。

### 7.6 完整调试报告

```text
标题：演示商品按钮点击后抛 TypeError

环境：
Node.js 24 LTS；当前 Chromium；http://127.0.0.1:3300/；
浏览器内存演示数据，无真实 API。

复现：
1. 在 debug-lab 运行 node server.mjs。
2. 打开首页，确认文档请求 200。
3. 打开 Console。
4. 点击“读取演示商品”。

现象：
状态文字不变；Console 在读取 listing.title 时抛 TypeError。
新加载后复现 3 次，3 次均失败。

证据：
按钮 dataset.listingId 为字符串 "bike-001"；
Number("bike-001") 为 NaN；
item.id 是字符串；
严格比较没有命中；
find 返回 undefined。

原因：
业务 ID 被错误地按数值转换，导致字符串 ID 无法匹配。

修复：
保持 dataset ID 为字符串；
增加 listing 不存在时的可见错误与结构化日志。

复验：
正常 ID 显示“九成新自行车，280 元”；
未知 ID 显示受控错误；
刷新后正常 ID 再次成功；
首页仍为 200，/missing 仍为 404；
原 TypeError 不再出现。

未验证：
Safari、Firefox、真实移动设备、真实屏幕阅读器；
当前没有后端、账号、预约或持久化能力。
```

## 8. 常见错误与排查路径

### 8.1 现象到工具

| 现象 | 首要证据 | 下一步 |
| --- | --- | --- |
| 页面连接失败 | Network、端口、终端 | 确认进程与监听 |
| 文档 404 | URL、服务路由 | 对照受支持路径 |
| 点击抛异常 | Console 来源、Sources 断点 | 向上追变量来源 |
| 点击无异常但结果错 | DOM、状态、输入与分支 | 检查条件和数据 |
| 刷新后修复丢失 | Git diff、编辑器保存状态 | 确认是否只改 Elements |
| 修复后别处失败 | 回归矩阵 | 缩小改动并复查共享路径 |

### 8.2 明确错误修复

错误做法一：吞掉所有异常。

```js
// 错误示例：既不恢复用户状态，也不保留根因证据。
try {
  status.textContent = listing.title;
} catch {
  status.textContent = "";
}
```

错误做法二：放宽比较掩盖类型设计。

```js
// 错误示例：隐式转换让边界更难预测。
const listing = listings.find((item) => item.id == listingId);
```

错误做法三：写死成功结果。

```js
// 错误示例：绕过查找，测试不到真实机制。
status.textContent = "九成新自行车，280 元";
```

这些改动可能让画面暂时变化，却没有修复 ID 处理。

### 8.3 五阶段排查表

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 按钮抛 TypeError | `listing` 为 undefined | 字符串 ID 转为 NaN | 保持字符串并处理未找到 | 正常/未知 ID 都可控 |
| 首页连接失败 | 无 HTTP 状态，端口无监听 | 服务未运行 | 启动自己的服务 | 首页 200 |
| `/missing` 显示错误页 | 404 与纯文本响应 | 路由不支持 | 使用 `/` | `/` 200，404 保留 |
| 改动刷新后消失 | diff 无变化，Elements 曾编辑 | 未改磁盘源文件 | 编辑器保存正确文件 | 重载后仍成功 |
| 修复后 280 变 28000 元 | `priceCents` 直接展示 | 忘记从分转元 | 展示时除以 100 | 机器值不变，显示 280 |

### 8.4 两次失败后的停止条件

如果连续两次修改都没有改变原复现结果：

1. 停止继续叠加补丁；
2. 恢复到最后一个可解释状态；
3. 重新记录实际输入、代码版本和错误行；
4. 检查是否打开错文件、服务未重启或假设被证据推翻；
5. 缩小复现，必要时请同伴复核。

堆叠更多猜测会污染现场，使根因更难识别。

## 9. 课后题

<details>
<summary>1. 为什么 TypeError 所在行不一定是根因？</summary>

错误行只是最先无法继续执行的位置。本课 `listing.title` 失败，真正原因来自更早的字符串 ID 数值转换。需要沿变量来源向上追。

</details>

<details>
<summary>2. `find` 找不到元素时返回什么？</summary>

返回 `undefined`。继续读取其 `title` 会抛 TypeError，因此既要修复匹配类型，也要显式处理未找到分支。

</details>

<details>
<summary>3. 用可选链消除异常为什么不够？</summary>

可选链只避免抛错，错误查找仍然没有命中，页面可能显示 `undefined` 或空内容。根因是错误类型转换，必须修复数据边界。

</details>

<details>
<summary>4. 为什么回归还要检查 /missing？</summary>

修复发生在同一页面和服务环境。404 是已定义的相邻协议行为，必须证明修复没有通过放宽路由或统一返回 200 破坏它。

</details>

<details>
<summary>5. 当前 Chromium 通过，能否宣称所有浏览器通过？</summary>

不能。只能报告已运行的环境，并把 Safari、Firefox、移动设备和辅助技术列为未验证范围。

</details>

<details>
<summary>6. 什么样的假设可证伪？</summary>

它应预测具体可观察结果，并允许证据证明它错误。本课假设预测 raw ID、转换值、类型和 find 结果；断点若显示不同值，就会推翻假设。

</details>

## 10. 实践练习

### 10.1 基础：定位选择器拼写错误

在个人故障副本中把按钮 `id` 改为 `load-lising`，脚本保持 `#load-listing`。先复现，再用 Elements、Console 和 Sources 找到 `button` 为 `null`。

预期错误发生在 `addEventListener`。完成标准是记录 DOM 实际 ID、选择器、异常和最小修复；修复后按钮正常，未知 ID 保护仍通过。

参考答案要点：统一 HTML ID 与查询选择器；不要在 `button` 为 null 时静默跳过并宣称功能完成。

### 10.2 进阶：修复价格单位错误

故意把修复页的展示改为：

```js
`${listing.title}，${listing.priceCents} 元`
```

现象是 28000 元，Console 没有异常。建立假设“机器值单位为分，展示缺少换算”，用数据对象和项目契约验证。

预期修复为展示时除以 100，机器值仍保持 28000。完成标准是说明“无异常”不等于业务正确，并增加 0 分、1 分、28000 分的预测表。

参考答案：0、0.01、280；正式金额格式以后使用明确格式函数，本课只验证单位。

### 10.3 故障注入：跨层区分三种失败

依次制造：

1. 未知商品 ID；
2. 访问 `/missing`；
3. 停止服务后刷新首页。

为每种失败写“现象、证据、原因、修复、复验”。预期分别是页面受控错误、HTTP 404、无 HTTP 响应。完成标准是三条记录使用不同证据路径，且恢复后正常按钮仍成功。

参考答案要点：未知 ID 看 Console/DOM，404 看 Network Response，连接失败看端口和终端；不能都写成前端代码问题。

## 11. 阶段验收

- [ ] 缺陷记录包含环境、前置、步骤、期望、实际和复现率。
- [ ] 故障版本能稳定复现 3 次。
- [ ] Network 证明首页为 200，不把脚本错误误判为服务失败。
- [ ] Console 记录完整错误类型、消息与来源。
- [ ] 断点观察到 raw ID、转换值和 find 结果。
- [ ] 根因能解释全部已观察现象。
- [ ] 修复只改变 ID 处理和未找到保护。
- [ ] 没有吞异常、放宽比较或写死成功结果。
- [ ] 正常 ID、未知 ID、刷新、404 和连接失败均完成复验。
- [ ] Git diff 或手工差异记录没有无关改动与调试残留。
- [ ] 报告区分已验证事实和未验证环境。

提交证据：故障页面与修复页面、三次复现记录、变量观察表、最小差异、回归矩阵和完整调试报告。

## 12. 常见问题

**调试是否一定要先写自动化测试？**

能稳定自动化的问题应尽早转成失败测试。第一周先建立手动可重复证据；JavaScript 测试章节会把同类机制写成自动回归。

**加很多 console.log 会不会更快？**

只有能区分假设的日志才有价值。无目的日志会制造噪声，还可能泄露数据。优先在关键边界记录结构化最小信息。

**页面恢复了就可以删掉错误记录吗？**

不可以。修复前证据、原因和复验共同说明为何改动有效。可以清除临时日志，但应保留学习记录。

**为什么未知 ID 要显示错误，而不是直接什么都不做？**

静默失败让用户和开发者都无法判断状态。可见恢复信息与结构化日志分别服务用户和诊断。

**修复时能顺便重构所有脚本吗？**

本课不应。大范围重构会扩大变量，难以证明哪一处解决根因。先做最小修复并回归，再把独立重构作为另一任务。

## 13. 扩展阅读

以下官方资料于 **2026-10-11** 核验：

- [Chrome DevTools：Debug JavaScript](https://developer.chrome.com/docs/devtools/javascript/)：查断点、作用域、调用栈与单步执行。
- [Chrome DevTools：Console](https://developer.chrome.com/docs/devtools/console/)：查错误来源和表达式求值。
- [Chrome DevTools：Network](https://developer.chrome.com/docs/devtools/network/)：查文档状态与错误响应。
- [MDN：Array.prototype.find](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find)：核对未命中返回 `undefined`。
- [MDN：HTMLElement.dataset](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset)：核对 `data-*` 名称映射与字符串值。
- [MDN：Number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/Number)：查字符串转换与 `NaN`。
- [Node.js Debugging Guide](https://nodejs.org/en/learn/getting-started/debugging)：预习服务端调试与 Inspector。

## 我现在能做到什么

我能把“按钮没反应”转成稳定复现，沿数据来源建立可证伪假设，用 Network、Console、Sources、终端和 diff 找到根因。我还能实施最小修复，验证正常与错误路径，并明确报告当前已经验证和尚未验证的范围。

## 单元导航

[上一课：Git 三棵树、提交与分支](02-git-three-trees-commits-branches.md) · [运行与修复综合验收](../README.md#运行与修复综合验收) · [下一页：W1 综合验收](../w01-checkpoint.md) · [项目契约与阶段验收](../project-contract.md) · [起步实操目录](../README.md)
