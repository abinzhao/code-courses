# 节点创建、移动、删除与安全文本

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 创建、插入、移动、替换和删除节点，并用 textContent 守住不可信文本边界。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `DOM-004`、`DOM-005`、`DOM-006`、`DOM-007` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

创建、插入、移动、替换和删除节点，并用 textContent 守住不可信文本边界。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 DOM-004（createElement、createTextNode）、DOM-005（append、prepend、before、after）、DOM-006（remove、replaceWith、replaceChildren）、DOM-007（textContent 与 innerHTML 安全边界）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `createElement()` 与 `createTextNode()`

`document.createElement(tagName)` 创建一个尚未连接到页面的元素：

```js
const article = document.createElement("article");
article.className = "product-card";

console.assert(article.isConnected === false);
```

`document.createTextNode(data)` 创建纯文本节点：

```js
const title = document.createElement("h2");
const titleText = document.createTextNode("书桌灯 <九成新>");

title.append(titleText);
```

浏览器不会把文本节点里的 `<九成新>` 当标签。Elements 面板可能把尖括号显示成转义形式，但页面可见文字仍是原字符串。

也可以直接使用 `textContent`：

```js
title.textContent = "书桌灯 <九成新>";
```

选择建议：

- 一次设置元素的完整文字，使用 `textContent`；
- 需要在多个元素或文本节点之间精确组合，使用 `createTextNode()`；
- 创建结构时使用 `createElement()`，不要用字符串猜浏览器会解析出什么树。

### 4.2 `append()`、`prepend()`、`before()` 与 `after()`

四个方法的参照位置不同：

```text
parent.prepend(node)  → 父元素内部最前
parent.append(node)   → 父元素内部最后
element.before(node)  → 当前元素外部之前
element.after(node)   → 当前元素外部之后
```

完整示例：

```js
const card = document.createElement("article");
const title = document.createElement("h2");
const price = document.createElement("p");
const badge = document.createElement("span");

title.textContent = "书桌灯";
price.textContent = "39.00 元";
badge.textContent = "可预约";

card.append(title, price);
card.prepend(badge);

const list = document.querySelector("#listing-list");
list.append(card);

const beforeNote = document.createElement("p");
beforeNote.textContent = "以下为今日商品";
card.before(beforeNote);

const afterNote = document.createElement("p");
afterNote.textContent = "商品信息仅供教学";
card.after(afterNote);
```

这些方法可以接收多个节点，也可以接收字符串。字符串会被转换为文本节点，不会按 HTML 解析：

```js
card.append("<strong>不会变粗</strong>");
```

这与 `innerHTML` 有本质区别。

### 4.3 插入已有节点就是移动

一个节点同一时刻只能位于 DOM 树的一个位置。把已经连接的节点插入另一个父元素，会先从旧位置移除，再进入新位置：

```js
const card = document.querySelector('[data-listing-id="listing-lamp-01"]');
const featuredList = document.querySelector("#featured-list");
const originalReference = card;

featuredList.prepend(card);

console.assert(card === originalReference);
console.assert(card.parentElement === featuredList);
```

这不是复制：

- 对象身份不变；
- 节点上的属性和子节点保留；
- 直接绑定在该节点上的监听器通常也保留；
- 旧父元素不再包含它；
- 动态集合会立即反映新位置。

若确实需要副本，要明确调用 `cloneNode()`；但克隆不会自动复制用 `addEventListener()` 注册的监听器，重复 ID 也可能随深克隆进入页面。模板和克隆将在[本章第 10 课](10-template-fragment-clone.md)系统讲解。

### 4.4 `remove()`、`replaceWith()` 与 `replaceChildren()`

删除自身：

```js
const staleCard = document.querySelector(".product-card.is-stale");
staleCard?.remove();
```

节点被移出文档后，若 JavaScript 变量仍引用它，对象仍可存在：

```js
console.assert(staleCard?.isConnected === false);
```

替换当前节点：

```js
const oldMessage = document.querySelector("#message");
const newMessage = document.createElement("p");
newMessage.id = "message";
newMessage.textContent = "列表已经刷新。";

oldMessage.replaceWith(newMessage);
```

替换某个父元素的全部子节点：

```js
const list = document.querySelector("#listing-list");
const emptyMessage = document.createElement("li");
emptyMessage.textContent = "当前没有商品。";

list.replaceChildren(emptyMessage);
```

也可以传入多个节点：

```js
list.replaceChildren(firstCard, secondCard, thirdCard);
```

边界：

- `remove()` 不等于删除服务器记录；
- `replaceWith()` 后，原变量仍指向旧节点，不会自动改指向新节点；
- `replaceChildren()` 会移除原子树，子元素中的焦点和页面状态也会丢失；
- 大范围替换可能破坏焦点、文本选择和辅助技术上下文；
- 只改一个状态时，应更新必要节点，不必重建整张卡。

### 4.5 `textContent` 与 `innerHTML` 的安全边界

`textContent` 把输入当普通文本：

```js
const title = document.createElement("h2");
const userTitle = '儿童桌 <可折叠>';

title.textContent = userTitle;
console.assert(title.textContent === userTitle);
console.assert(title.children.length === 0);
```

给元素设置 `textContent` 会移除原有子节点，再放入文本内容。读取 `textContent` 得到后代文本拼接，不关心视觉隐藏，也可能包含 `script`、`style` 元素的文本；它与布局相关的 `innerText` 不是同一个 API。

`innerHTML` 会调用 HTML 解析器：

```js
// 错误案例：不要把用户输入拼进 innerHTML。
const userTitle = '<button type="button">伪造的页面操作</button>';
const card = document.querySelector(".product-card");

card.innerHTML = `<h2>${userTitle}</h2>`;
```

结果不是显示尖括号，而是在商品标题位置创建一个真实按钮。若字符串含事件处理属性、危险 URL 或其他可执行上下文，可能形成跨站脚本注入。即使某些通过 `innerHTML` 插入的 `script` 元素不会按直觉执行，也绝不意味着 `innerHTML` 对不可信内容安全。

正确写法：

```js
const heading = document.createElement("h2");
heading.textContent = userTitle;
card.replaceChildren(heading);
```

重要边界：

- `textContent` 解决当前文本插入点的 HTML 解析问题，不自动验证长度、业务词汇或权限；
- URL、CSS、脚本和属性各有不同安全规则，不能把“转义 HTML”当成万能消毒；
- 如果产品确实允许富文本，应使用严格格式、可信解析器、允许列表清洗和内容安全策略；
- 在支持环境中，Trusted Types 可以帮助限制危险 HTML sink，但不替代输入设计和服务端安全；
- 本课商品标题、描述和状态都只需要纯文本，因此没有使用 `innerHTML` 的理由。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `DOM-004`：createElement、createTextNode
- `DOM-005`：append、prepend、before、after
- `DOM-006`：remove、replaceWith、replaceChildren
- `DOM-007`：textContent 与 innerHTML 安全边界

## 6. 最小可运行案例

创建 `practice/html-dom-mutation/minimal.html`，准备一个空 `ul#items`、一个卖家名称输入框，以及“添加、移到顶部、替换、删除、清空”五个按钮。

1. `DOM-004`：使用 `createElement()` 和 `createTextNode()` 创建首个 `li`；
2. `DOM-005`：使用 `append()`、`prepend()`、`before()` 或 `after()` 插入并移动同一个节点；
3. `DOM-006`：分别用 `replaceWith()`、`remove()` 和 `replaceChildren()` 完成替换、删除与清空；
4. `DOM-007`：把输入值只交给 `textContent`，再用包含 `<button>` 的文字证明它没有变成控件；
5. 每次操作后在 Console 记录父节点、列表文字和旧引用是否仍连接。

通过标准：移动不会复制节点，替换后不继续误用旧引用，不可信文字不会进入 `innerHTML` 解析。

## 7. 邻里集市集成案例

完整内存商品列表由[属性、dataset 与状态同步](06-dom-attributes-dataset-state-sync.md)维护。本课只提交 DOM 结构增量：

- `DOM-004`：商品卡节点全部由 DOM 创建 API 建立；
- `DOM-005`：新增和排序使用明确插入 API；
- `DOM-006`：删除、替换与清空后恢复正确焦点或空状态；
- `DOM-007`：卖家文字、标题和错误消息只作为文本写入；
- 提交一次恶意样本文字的失败预期、实际 DOM 和复验记录，不复制完整应用。

## 8. 常见错误与排查路径

### 8.1 节点“从旧位置消失”

现象：把卡加入精选后，普通列表少了一张。

原因：插入已有节点执行移动。

若目标本来就是移动，这是正确行为；用严格相等和父元素断言复验。若确实需要副本，再评估 `cloneNode(true)`、重复 ID、监听器和状态复制问题。

### 8.2 错误 `innerHTML` 让用户文字变成控件

故障注入：

```js
const unsafeTitle = '<button type="button">伪造操作</button>';
title.innerHTML = unsafeTitle;
```

证据：

- Elements 中 h3 出现真实 `button`；
- `title.children.length === 1`；
- 键盘焦点会进入这个意外按钮。

修复：

```js
title.textContent = unsafeTitle;
console.assert(title.children.length === 0);
```

复验时保留尖括号可见，并确认页面没有新交互控件。

### 8.3 替换节点后继续使用旧引用

```js
const message = document.querySelector("#message");
message.replaceWith(nextMessage);
message.textContent = "这只会修改已脱离文档的旧节点";
```

证据：

```js
console.log(message.isConnected); // false
```

修复：让变量重新指向新节点，或避免不必要的整体替换。

## 9. 课后题

### 9.1 节点移动

同一个 `article` 先 `listA.append(article)`，再 `listB.prepend(article)`。最终有几个 `article`？原监听器是否通常保留？

<details>
<summary>参考答案</summary>

只有一个。第二次插入把原节点移动到 `listB`，对象身份不变，直接注册在该对象上的监听器通常保留。可以用严格相等、父元素与全局查询数量断言。

</details>

### 9.2 安全文本

商品标题是 `'<em>几乎全新</em>'`。怎样让用户看到完整尖括号文本，而不是斜体元素？

<details>
<summary>参考答案</summary>

使用 `title.textContent = userTitle` 或 `title.append(document.createTextNode(userTitle))`。再断言 `title.children.length === 0`。不应把不可信标题拼给 `innerHTML`。

</details>

## 10. 实践练习

选择一件与教材不同的邻里商品，完成一次迁移练习：

1. 先写内容关系、机器值或交互目标，不先写标签；
2. 用 DOM-004（createElement、createTextNode）、DOM-005（append、prepend、before、after）、DOM-006（remove、replaceWith、replaceChildren）、DOM-007（textContent 与 innerHTML 安全边界） 实现最小页面；
3. 制造一个本课错误并保留失败证据；
4. 修复后重复键盘或开发者工具检查；
5. 在记录中解释为什么没有选择一个视觉相似的替代写法。

## 11. 阶段验收

### 导航与节点操作

- [ ] 能解释空白文本节点为何出现；
- [ ] 节点导航和元素导航选择符合任务；
- [ ] `matches()` 与 `closest()` 使用方向正确；
- [ ] 商品卡由 `createElement()` 和安全文本 API 创建；
- [ ] 四种插入位置均可独立解释；
- [ ] 移动已有节点有对象身份和唯一数量证据；
- [ ] 删除、单节点替换和子树替换使用范围合理。

### 文本与安全

- [ ] 用户标题和描述不经 `innerHTML` 解析；
- [ ] 错误 `innerHTML` 案例能稳定生成意外元素；
- [ ] 修复后尖括号可见且 `children.length === 0`；
- [ ] 能说明 `textContent` 不能替代所有输入验证和服务端安全；
- [ ] 页面没有真实密钥、令牌或个人数据。

## 12. 常见问题

### Q6：`append()` 和 `appendChild()` 有什么差别？

`append()` 可一次接收多个节点或字符串，返回 `undefined`；`appendChild()` 接收一个节点并返回该节点。两者插入已有节点时都会移动它。本课统一使用更适合组合内容的 `append()`。

### Q7：节点移走后监听器会消失吗？

移动同一节点通常保留直接绑定在该对象上的监听器。克隆节点不会自动复制 `addEventListener()` 监听器。移除后若仍有引用，监听器也可能继续占用内存；监听器生命周期在[本章第 7 课](07-event-listener-lifecycle-propagation.md)展开。

### Q8：`remove()` 会删除商品数据吗？

只会把节点移出 DOM。若内存数组、Map、监听器闭包或服务器仍保存数据，它们不会自动删除。完整案例显式同步数组、Set、Map 和 DOM。

### Q9：什么时候可以使用 `innerHTML`？

只有内容来源和解析边界明确、确实需要 HTML 结构，并采用适当的可信内容策略时才考虑。普通商品标题、描述、错误和状态都应使用 `textContent` 或 DOM 创建 API。

### Q10：`textContent` 会自动清理恶意 URL 吗？

不会。它只保证当前写入作为文本，不作为 HTML 解析。若把输入用于 `href`、`src`、CSS 或脚本，需要相应的 URL 方案允许列表、属性 API 和安全策略。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：创建、插入、移动、替换和删除节点，并用 textContent 守住不可信文本边界。
- `DOM-004`：createElement、createTextNode
- `DOM-005`：append、prepend、before、after
- `DOM-006`：remove、replaceWith、replaceChildren
- `DOM-007`：textContent 与 innerHTML 安全边界
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：DOM 查询、集合与导航](04-dom-query-collections-navigation.md) · [下一课：属性、dataset 与状态同步](06-dom-attributes-dataset-state-sync.md) · [返回 HTML 模块](../README.md)
