# ESM 导入、导出与路径解析

## 任务卡

- **本课产出**：`js-lab/modules/money.mjs`、`catalog.mjs` 与 `main.mjs` 三个完整文件。
- **运行环境**：Node.js 24 LTS；浏览器补充实验通过 HTTP 加载 `type="module"`。
- **预计时间**：85 分钟。
- **完成证据**：入口输出商品和汇总，能复现并修复路径缺少 `./`、扩展名错误与命名导出不匹配。

## 1. 任务背景

邻里集市的价格格式化、商品读取和页面入口不应挤在一个文件，也不应通过全局变量互相寻找。ECMAScript 模块（ESM）让每个文件显式声明导出和依赖，构成可以检查的依赖图。

拆文件并不自动产生好边界。价格工具若反向导入页面，或目录模块导出一个可被任意修改的数组，依赖依然混乱。本课先建立最小、可运行、单向的三文件模块。

## 2. 学习目标

完成本课后，你能够：

1. 使用命名导出、默认导出和导入别名；
2. 解释模块作用域与普通脚本全局作用域的差异；
3. 写出 Node `.mjs` 的显式相对路径和扩展名；
4. 说明相对路径以导入文件为基准，而非以终端目录为基准；
5. 使用浏览器 `type="module"` 并通过 HTTP 加载；
6. 根据错误证据区分路径解析失败与导出名称不匹配；
7. 建立 `main -> catalog / money` 的单向依赖。

## 3. 预备知识

你需要理解函数、数组方法、异常和非负安全整数分。创建目录：

```bash
mkdir -p js-lab/modules
cd js-lab
```

本课不创建 `package.json`。`.mjs` 已明确告诉 Node 按 ESM 解释文件。代码中的导入路径仍相对于源文件，`cd` 只影响入口命令的位置。

## 4. 核心理论

### 4.1 模块拥有独立作用域

一个模块顶层声明的变量默认不会成为全局变量。只有显式 `export` 的绑定才能被其他模块静态导入。模块默认采用严格模式，因此错误的隐式全局赋值会直接失败。

### 4.2 命名导出是可检查的契约

`export function formatCents()` 创建名为 `formatCents` 的导出；导入方必须使用相同名称，或显式写别名：

```js
import { formatCents as formatPrice } from "./money.mjs";
```

默认导出每个模块最多一个，导入时可以自行命名。课程示例优先命名导出，因为名称可搜索，也能在模块加载时发现拼写不一致。

### 4.3 解析从导入文件的位置开始

`./money.mjs` 表示与当前源文件同目录。它不取决于从哪个目录运行 `node`。`money.mjs` 没有 `./`、`../` 或绝对 URL 时，在 Node 中会被当作包说明符，而不是同目录文件。

本课程写完整扩展名，使 Node 与浏览器原生 ESM 使用相同说明符。文件名大小写也应完全一致，避免只在大小写不敏感文件系统上偶然成功。

### 4.4 浏览器模块需要 HTTP

浏览器入口使用：

```html
<script type="module" src="./main.mjs"></script>
```

模块请求受 URL、MIME 类型、同源策略和 CORS 影响。不要双击 HTML 后用 `file://` 推断生产行为；从 `js-lab` 启动本地 HTTP 服务，再访问 `http://127.0.0.1:4173/`。

## 5. 元素、属性、API 或配置清单

| 语法或配置 | 示例 | 关键规则 |
| --- | --- | --- |
| 命名导出 | `export { value }` | 导入名称必须匹配 |
| 声明时导出 | `export function run() {}` | 声明与导出合并 |
| 默认导出 | `export default value` | 每模块最多一个 |
| 静态导入 | `import { run } from "./run.mjs"` | 在模块求值前建立依赖 |
| 导入别名 | `import { run as start } ...` | 只改变当前模块本地名称 |
| 仅副作用导入 | `import "./setup.mjs"` | 没有导入绑定，需谨慎使用 |
| `.mjs` | `main.mjs` | Node 明确按 ESM 解释 |
| `type="module"` | 浏览器脚本属性 | 默认延迟执行且使用模块作用域 |
| `import.meta.url` | 当前模块 URL | 可用于构造相对资源 URL |

## 6. 最小可运行案例

先观察两个文件之间的明确依赖。

完整文件 `js-lab/modules/greeting.mjs`：

```js
export const audience = "邻里集市";

export function greet(name) {
  return `你好，${name}`;
}
```

完整文件 `js-lab/modules/greeting-main.mjs`：

```js
import { audience, greet as createGreeting } from "./greeting.mjs";

console.log(createGreeting(audience));
console.log(typeof globalThis.audience);
```

运行：

```bash
node modules/greeting-main.mjs
```

预期输出：

```text
你好，邻里集市
undefined
```

第二行证明模块顶层绑定没有自动写入 `globalThis`。

## 7. 邻里集市集成案例

以下三个文件是一套完整、唯一的本章 ESM 主案例。

完整文件 `js-lab/modules/money.mjs`：

```js
export function assertCents(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("cents must be a non-negative safe integer");
  }
}

export function formatCents(cents) {
  assertCents(cents);
  const yuan = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${yuan}.${fraction}`;
}
```

完整文件 `js-lab/modules/catalog.mjs`：

```js
const listings = [
  {
    id: "listing-1",
    title: "台灯",
    description: "功能正常，自提",
    priceCents: 1990,
    status: "available",
    ownerId: "user-1",
    version: 1,
    createdAt: "2026-10-10T08:00:00.000Z",
  },
  {
    id: "listing-2",
    title: "木椅",
    description: "有使用痕迹",
    priceCents: 0,
    status: "available",
    ownerId: "user-2",
    version: 1,
    createdAt: "2026-10-10T09:00:00.000Z",
  },
];

export function findListing(id) {
  return listings.find((item) => item.id === id);
}

export function readListings() {
  return listings.map((item) => ({ ...item }));
}
```

完整文件 `js-lab/modules/main.mjs`：

```js
import { findListing, readListings } from "./catalog.mjs";
import { assertCents, formatCents } from "./money.mjs";

function summarize(items) {
  let totalCents = 0;
  for (const item of items) {
    assertCents(item.priceCents);
    totalCents += item.priceCents;
    assertCents(totalCents);
  }
  return { count: items.length, totalCents };
}

const listing = findListing("listing-1");
if (!listing) {
  throw new Error("listing-1 is missing");
}

const snapshot = readListings();
snapshot[0].title = "调用方本地改名";
const summary = summarize(snapshot);

console.log(`${listing.title} ¥${formatCents(listing.priceCents)}`);
console.log(`${summary.count} 件，合计 ¥${formatCents(summary.totalCents)}`);
console.log(findListing("listing-1")?.title);
console.log(findListing("missing") === undefined);
```

从 `js-lab` 运行：

```bash
node modules/main.mjs
```

预期输出：

```text
台灯 ¥19.90
2 件，合计 ¥19.90
台灯
true
```

依赖方向是：

```text
main.mjs ──> money.mjs
    └──────> catalog.mjs
```

`money.mjs` 与 `catalog.mjs` 都不导入入口。`readListings` 返回浅拷贝记录，使调用方对顶层字段的修改不污染目录内部教学数据；真实系统仍应由后端存储并实施写权限。

浏览器补充验证可创建完整文件 `js-lab/modules/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ESM 观察页</title>
  </head>
  <body>
    <p>打开开发者工具 Console 查看模块输出。</p>
    <script type="module" src="./main.mjs"></script>
  </body>
</html>
```

从 `js-lab` 启动静态服务：

```bash
node -e "const h=require('node:http'),f=require('node:fs'),p=require('node:path');h.createServer((q,s)=>{const x=p.join(process.cwd(),q.url==='/'?'modules/index.html':q.url);f.createReadStream(x).on('error',()=>{s.statusCode=404;s.end('not found')}).pipe(s)}).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173'))"
```

访问 `http://127.0.0.1:4173/`，Console 应出现与 Node 相同的四行输出。停止服务使用 `Control-C`。

## 8. 常见错误与排查路径

### 错误示例：省略相对路径前缀

```js
import { formatCents } from "money.mjs";
```

五段诊断记录：

1. **现象**：Node 报 `ERR_MODULE_NOT_FOUND` 或找不到包。
2. **证据**：错误消息把 `money.mjs` 作为包说明符解析，而实际文件位于入口旁边。
3. **原因**：同目录文件缺少 `./`，不是缓存或依赖安装问题。
4. **修复**：改为 `./money.mjs`，同时核对大小写和扩展名。
5. **复验**：再次运行 `node modules/main.mjs`，四行输出恢复。

### 导出名称错误

把导入改成 `import { formatMoney } from "./money.mjs"`。模块实例化阶段会报告所请求导出不存在。应统一导出与导入名称，或显式使用别名；不要新增一个无关默认导出来掩盖拼写问题。

### 浏览器加载错误

若页面没有输出，依次检查 Network 中的请求 URL、状态码、响应 `Content-Type` 和 Console 错误。确认通过 HTTP 访问，而不是只检查 HTML 文件存在。

## 9. 课后题

1. `./money.mjs` 相对于终端当前目录还是导入它的源文件？
2. 命名导出改名后，哪些位置必须同步检查？
3. `import { value }` 是否意味着 `value` 引用的对象不可变？
4. 为什么本书示例保留 `.mjs` 扩展名？

**答案：**

1. 相对于发出导入的源文件。
2. 所有静态导入、动态导入后的属性读取、测试和文档示例。
3. 不是；导入绑定不能重赋值，但对象内部仍可能可变。
4. Node 能明确识别 ESM，且说明符可直接用于浏览器原生模块。

## 10. 实践练习

### 基础练习

创建 `summary.mjs`，把 `summarize` 从入口移出并导出；它只能导入 `money.mjs`，不能导入入口。

### 进阶练习

让 `readListings({ status })` 返回指定状态的记录快照，并保持 `0` 分商品可见。入口打印筛选后的数量。

### 故障注入练习

分别制造三种失败：删除 `./`、把 `.mjs` 写成 `.js`、导入不存在的名称。记录每种错误最早出现在哪个阶段和错误消息中的关键证据。

**参考实现要点：**

```js
// summary.mjs
import { assertCents } from "./money.mjs";

export function summarize(items) {
  let totalCents = 0;
  for (const item of items) {
    assertCents(item.priceCents);
    totalCents += item.priceCents;
    assertCents(totalCents);
  }
  return { count: items.length, totalCents };
}
```

路径失败发生在解析阶段，导出名失败发生在模块实例化阶段；业务函数中的金额异常发生在求值后的函数执行阶段。

## 11. 阶段验收

- [ ] 三个主案例文件从 `js-lab` 一条命令运行成功；
- [ ] `0` 分商品参与统计，合计仍为非负安全整数分；
- [ ] 修改 `readListings()` 返回记录不影响目录内部记录；
- [ ] 能复现并修复路径、扩展名与导出名三类错误；
- [ ] 浏览器模块通过 HTTP 加载，Network 无 404，Console 无未处理错误；
- [ ] 依赖图中工具模块不反向导入入口或页面。

## 12. 常见问题

**可以混用 `require` 与 `import` 吗？**
Node 提供互操作规则，但两套系统的解析、默认导出和执行语义并不相同。本课程主线统一使用 ESM，不用混搭掩盖边界。

**为什么不直接导出 `listings` 数组？**
导入方可以修改同一个数组，状态所有权不清晰。读取函数至少让写入入口显式，真实数据仍应通过服务端接口管理。

**浏览器为什么不能直接使用 Node 内置模块？**
浏览器没有 `node:fs` 等 Node 运行时 API。ESM 语法可共享，不代表运行时能力相同。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [MDN：JavaScript 模块](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules)
- [Node.js 24：ECMAScript modules](https://nodejs.org/docs/latest-v24.x/api/esm.html)
- [HTML Standard：Scripting](https://html.spec.whatwg.org/multipage/scripting.html)
- [ECMAScript：Modules](https://tc39.es/ecma262/multipage/ecmascript-language-scripts-and-modules.html#sec-modules)

## 我现在能做到什么

我能把价格、目录和入口拆成可运行的 ESM，读懂模块解析证据并修复导入失败，同时用依赖方向约束状态和副作用，而不是依靠全局变量或重复代码。

## 单元导航

- 上一单元：[原型链、`this` 与类的适用边界](./01-prototype-chain-this-classes.md)
- 下一单元：[模块图、共享状态与动态导入](./03-module-graphs-state-dynamic-import.md)
- 章入口：[原型、类与 ECMAScript 模块](../04-prototypes-modules.md)
