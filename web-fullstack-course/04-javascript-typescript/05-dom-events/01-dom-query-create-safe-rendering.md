# DOM 查询、节点创建与安全渲染

## 任务卡

- **本课产出**：`js-lab/dom-safe/index.html`，一个比较 `textContent` 与错误 `innerHTML` 用法的可见实验。
- **运行环境**：现代浏览器；Node.js 24 LTS 仅用于启动静态服务。
- **预计时间**：75 分钟。
- **完成证据**：商品标题按文本显示，错误实验会产生额外的加粗元素；能从状态重新渲染列表并处理查询为空。

## 1. 任务背景

JavaScript 对象不会自动出现在页面上。浏览器把 HTML 解析成 DOM 树，脚本查询节点、创建元素，再把当前内存状态投影成用户可见界面。

邻里集市的商品标题属于外部数据。若直接拼入 `innerHTML`，其中的标签可能被当成标记解释，形成 XSS 入口。本课使用一个无脚本、可见的注入字符串展示差异，并建立“状态是数据源，DOM 是呈现结果”的方向。

## 2. 学习目标

完成本课后，你能够：

1. 识别 `Document`、元素、文本节点和父子关系；
2. 正确处理 `querySelector` 可能返回 `null`；
3. 使用 `createElement`、`textContent`、`append` 和 `DocumentFragment`；
4. 使用 `replaceChildren` 从状态重建视图；
5. 解释 `textContent` 与 `innerHTML` 的安全差异；
6. 保持数据状态为权威来源，不从 DOM 文本反推业务记录；
7. 明确内存渲染不等于服务端持久化或授权。

## 3. 预备知识

你需要会使用数组、对象、函数和 ESM。创建目录：

```bash
mkdir -p js-lab/dom-safe
```

页面必须通过 HTTP 打开。课程示例不使用第三方库，不建立数据库，也不会保留刷新前的修改。

## 4. 核心理论

### 4.1 DOM 是浏览器中的节点树

`document` 是文档入口。元素节点具有标签、属性和子节点；文本节点保存文字。DOM API 修改的是当前页面内存中的树，浏览器随后安排样式、布局和绘制。

节点存在不代表业务记录存在，节点消失也不代表数据库记录已删除。视图只是状态在当前时刻的投影。

### 4.2 查询结果可能为空

`document.querySelector("#list")` 找不到目标时返回 `null`。若后续直接调用 `replaceChildren`，错误会在较远位置出现。入口初始化时应尽早检查必需节点并抛出包含选择器的错误。

### 4.3 创建节点比拼接标记更适合外部文本

把商品标题赋给 `textContent` 时，`<` 和 `>` 只作为文字显示。把同一字符串传给 `innerHTML` 时，浏览器会进行 HTML 解析。若业务确实接收富文本，需要经过专门、经过审计的清洗策略；不能用字符串替换临时模拟。

### 4.4 单向渲染减少双重真相

推荐流程：

```text
内存状态 -> render(state) -> DOM
```

事件先更新状态，再调用渲染。不要一部分逻辑改数组，另一部分逻辑只改 DOM；否则下一次渲染会让界面“跳回去”，也无法判断哪个来源可信。

`DocumentFragment` 可以先在内存中组装一批节点，再一次替换列表子节点。它主要改善代码边界和批量插入，不应被描述为所有页面的自动性能解法。

## 5. 元素、属性、API 或配置清单

| API | 返回或作用 | 注意事项 |
| --- | --- | --- |
| `document.querySelector(selector)` | 首个匹配元素或 `null` | 必需节点应立即检查 |
| `document.querySelectorAll(selector)` | 静态 `NodeList` | 不会自动随 DOM 更新 |
| `document.createElement(tag)` | 新元素 | 尚未连接到文档 |
| `document.createDocumentFragment()` | 轻量节点容器 | 插入后其子节点移入目标 |
| `node.textContent` | 读取或写入纯文本 | 外部文本优先使用 |
| `element.innerHTML` | 解析或序列化 HTML | 外部数据不可直接传入 |
| `parent.append(...nodes)` | 追加节点或文本 | 接受多个参数 |
| `parent.replaceChildren(...nodes)` | 替换所有子节点 | 旧节点及其直接监听器会离开文档 |
| `element.dataset` | 读写 `data-*` | 值始终是字符串 |
| `element.remove()` | 从父节点移除 | 不修改业务状态 |

## 6. 最小可运行案例

创建完整文件 `js-lab/dom-safe/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DOM 安全渲染实验</title>
  </head>
  <body>
    <h1>DOM 安全渲染实验</h1>
    <p>安全区域应显示尖括号；错误区域会出现额外的加粗文字。</p>

    <h2>安全区域</h2>
    <ul id="safe-list"></ul>

    <h2>仅用于故障观察的错误区域</h2>
    <div id="unsafe-output"></div>

    <script type="module">
      const safeList = document.querySelector("#safe-list");
      const unsafeOutput = document.querySelector("#unsafe-output");

      if (!(safeList instanceof HTMLUListElement)) {
        throw new Error("required element missing: #safe-list");
      }
      if (!(unsafeOutput instanceof HTMLDivElement)) {
        throw new Error("required element missing: #unsafe-output");
      }

      const visibleInjection = "<strong data-injected>伪造商品</strong>";
      const item = document.createElement("li");
      item.textContent = visibleInjection;
      safeList.append(item);

      // 明确的错误实验：不要把外部数据交给 innerHTML。
      unsafeOutput.innerHTML = visibleInjection;

      console.log(safeList.querySelector("[data-injected]") === null);
      console.log(unsafeOutput.querySelector("[data-injected]") !== null);
    </script>
  </body>
</html>
```

从仓库中的 `js-lab` 上级目录启动服务，或进入 `js-lab` 后运行：

```bash
node -e "require('node:http').createServer((q,s)=>require('node:fs').createReadStream('.'+(q.url==='/'?'/dom-safe/index.html':q.url)).on('error',()=>{s.statusCode=404;s.end('not found')}).pipe(s)).listen(4173,'127.0.0.1',()=>console.log('http://127.0.0.1:4173'))"
```

访问 `http://127.0.0.1:4173/`。安全区域显示完整尖括号文本，错误区域渲染粗体“伪造商品”，Console 输出两个 `true`。实验完成后停止服务。

## 7. 邻里集市集成案例

在上一案例的模块脚本中，用以下状态和渲染函数替换单个安全列表项的创建逻辑；保留错误区域仅用于对照：

```js
const state = {
  listings: [
    { id: "listing-1", title: "台灯", priceCents: 1990 },
    {
      id: "listing-2",
      title: "<strong data-injected>不是标记</strong>",
      priceCents: 0,
    },
  ],
};

function formatCents(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("invalid cents");
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

function createListingItem(listing) {
  const item = document.createElement("li");
  item.dataset.listingId = listing.id;

  const title = document.createElement("span");
  title.textContent = listing.title;

  const price = document.createElement("span");
  price.textContent = ` ¥${formatCents(listing.priceCents)}`;

  item.append(title, price);
  return item;
}

function renderListings(listings) {
  const fragment = document.createDocumentFragment();
  for (const listing of listings) {
    fragment.append(createListingItem(listing));
  }
  safeList.replaceChildren(fragment);
}

renderListings(state.listings);
console.log(safeList.querySelector("[data-injected]") === null);
```

第二个标题仍显示为文本，0 分正确显示为 `¥0.00`。`state.listings` 是本实验的数据源；删除某个 `<li>` 只改视图，下一次 `renderListings(state.listings)` 会把它恢复。

本页没有保存 API。刷新会恢复源码中的初始数组，页面上任何节点、隐藏属性或按钮都不能证明用户拥有服务端修改权限。

## 8. 常见错误与排查路径

### 错误示例：把外部标题拼给 `innerHTML`

```js
item.innerHTML = `<span>${listing.title}</span>`;
```

五段诊断记录：

1. **现象**：标题中的 `<strong>` 被渲染成元素，而不是显示原文。
2. **证据**：Elements 面板出现源码未声明的 `[data-injected]` 节点。
3. **原因**：`innerHTML` 对字符串执行 HTML 解析，外部数据进入标记上下文。
4. **修复**：创建固定结构的节点，把标题写入 `textContent`。
5. **复验**：页面显示尖括号文本，`querySelector("[data-injected]")` 返回 `null`。

其他排查路径：

- 报“读取 null 的属性”：先核对选择器、脚本执行位置和节点类型；
- 列表重复：确认每次全量渲染使用 `replaceChildren`，没有先 `append` 旧内容；
- 数据“被删除后又回来”：检查是否只删除 DOM，未更新权威状态；
- 0 分不显示：检查是否误用 `if (priceCents)` 过滤合法的 `0`。

## 9. 课后题

1. `querySelector` 找不到元素时返回什么？
2. 为什么 `textContent` 更适合商品标题？
3. `replaceChildren` 是否会修改商品数组？
4. DOM 中存在“删除”按钮是否代表用户有删除权限？

**答案：**

1. 返回 `null`。
2. 它把标题作为文本处理，不进入 HTML 解析上下文。
3. 不会；它只替换节点，状态更新必须显式完成。
4. 不代表；前端控件只表达交互，服务端必须独立认证并做对象授权。

## 10. 实践练习

### 基础练习

为每项创建 `<p>` 显示描述。描述包含 `<em>九成新</em>` 时也必须按文本显示。

### 进阶练习

实现 `renderEmptyOrListings(items)`：空数组显示一个文本为“暂无商品”的 `<li>`；非空时显示商品，不能保留上次的空状态节点。

### 故障注入练习

把 HTML 中的 `id="safe-list"` 临时改名，保留脚本不变。记录初始化错误、选择器证据、修复和复验；不得用可选链让渲染静默跳过。

**参考答案标准：**

- 所有业务文本通过 `textContent`；
- 空状态和列表状态互斥；
- 缺少必需根节点时立即抛出包含选择器的错误；
- 恢复 ID 后 Console 无未处理异常。

## 11. 阶段验收

- [ ] 页面通过 HTTP 加载，Console 先输出两个 `true`；
- [ ] 安全区域不存在 `[data-injected]` 后代；
- [ ] 错误区域能可见复现标记被解释的现象；
- [ ] 两条商品均由状态渲染，0 分显示为 `¥0.00`；
- [ ] 清空状态时显示唯一空状态，恢复状态时旧节点被替换；
- [ ] 能说明当前 DOM 和数组都只在内存中，不提供持久化或授权。

## 12. 常见问题

**是不是完全不能使用 `innerHTML`？**
不是。固定、可信模板或经过专门清洗的富文本可以使用，但普通商品标题、用户说明等外部文本不应直接进入它。

**`textContent` 会保留换行吗？**
节点中会保存文本字符；最终视觉换行还取决于 HTML 元素和 CSS 的空白处理规则。

**每次 `replaceChildren` 是否一定最快？**
不一定。它在本课提供清晰的一致性模型。大型界面要依据测量决定增量更新或框架策略。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [MDN：DOM 简介](https://developer.mozilla.org/zh-CN/docs/Web/API/Document_Object_Model/Introduction)
- [MDN：`Document.querySelector`](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/querySelector)
- [MDN：`Node.textContent`](https://developer.mozilla.org/zh-CN/docs/Web/API/Node/textContent)
- [MDN：`Element.innerHTML` 安全注意事项](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/innerHTML)
- [DOM Standard](https://dom.spec.whatwg.org/)

## 我现在能做到什么

我能从明确的内存状态创建和替换 DOM 节点，安全显示外部文本，快速定位空查询和重复渲染，并保持视图、持久化与授权三条边界互不混淆。

## 单元导航

- 上一单元：[模块图、共享状态与动态导入](../04-prototypes-modules/03-module-graphs-state-dynamic-import.md)
- 下一单元：[事件、表单提交与委托](./02-events-forms-delegation.md)
- 章入口：[DOM、事件与可访问状态](../05-dom-events.md)
