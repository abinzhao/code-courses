# 事件、表单提交与委托

## 任务卡

- **本课产出**：`js-lab/events/index.html`，一个可观察捕获/冒泡、表单提交和列表事件委托的独立实验。
- **运行环境**：现代浏览器，通过 HTTP 访问。
- **预计时间**：85 分钟。
- **完成证据**：键盘提交表单只增加一项，一次委托处理动态按钮；能解释 `target`、`currentTarget` 与默认行为。

## 1. 任务背景

用户点击按钮、按 Enter 提交表单或改变输入值时，浏览器派发事件。若每次渲染都为每个按钮重新注册监听器，很容易重复执行；若只监听点击而忽略表单提交，又会破坏键盘和浏览器原生语义。

邻里集市需要用表单接收草稿，用一个稳定的列表监听器处理动态项。HTML 约束提供第一层反馈，程序仍必须执行金额和业务规则校验。

## 2. 学习目标

完成本课后，你能够：

1. 使用 `addEventListener` 注册和移除监听器；
2. 解释捕获、目标和冒泡阶段；
3. 区分 `event.target` 与 `event.currentTarget`；
4. 只在需要接管行为时调用 `preventDefault()`；
5. 使用 `closest` 与 `contains` 实现可靠委托；
6. 通过 `submit` 事件同时支持按钮和 Enter 键；
7. 使用 `FormData` 读取命名控件；
8. 区分 HTML 约束验证与程序业务校验；
9. 诊断重复监听器导致的一次操作多次执行。

## 3. 预备知识

你需要会创建 DOM 节点和使用 `textContent`。创建目录：

```bash
mkdir -p js-lab/events
```

本课只把有效草稿追加到当前页面列表。没有网络请求、账户身份、数据库或对象授权。

## 4. 核心理论

### 4.1 事件沿路径传播

多数 DOM 事件先从文档侧沿路径进入目标（捕获），到达目标，再向祖先冒泡。监听器默认参与目标和冒泡阶段；传入 `{ capture: true }` 可观察捕获阶段。

`stopPropagation()` 会阻止事件继续传播，可能破坏委托、统计或其他组件。除非边界确实要求隔离，不要把它当成修复重复执行的工具。

### 4.2 `target` 与 `currentTarget`

- `target`：原始触发事件的最深节点，可能是按钮中的 `<span>`；
- `currentTarget`：当前正在执行监听器的注册节点。

委托时从 `target` 向上找 `closest("button[data-action]")`，再确认该按钮仍被委托容器包含，避免跨越嵌套组件边界。

### 4.3 默认行为与提交语义

表单提交的默认行为是导航或发送请求。客户端内存实验需要在 `submit` 监听器中 `preventDefault()`。普通点击若没有需要阻止的默认行为，不应习惯性调用。

监听 `submit` 而非提交按钮 `click`，可覆盖鼠标点击、键盘 Enter 和脚本 `requestSubmit()`。按钮应显式声明 `type`，防止表单内普通按钮意外提交。

### 4.4 两层校验各有职责

`required`、`maxlength` 和输入类型帮助浏览器提供即时反馈；程序校验负责严格金额语法、单位转换和跨字段业务规则。客户端两层校验都不可信任，服务端仍需重复验证。

`FormData` 只收集有 `name` 且未禁用的成功控件。读取结果可能是字符串或 `File`，文本字段应先检查类型。

## 5. 元素、属性、API 或配置清单

| API 或属性 | 作用 | 注意事项 |
| --- | --- | --- |
| `addEventListener(type, listener, options)` | 注册监听器 | 同一函数和选项可配合移除 |
| `removeEventListener(...)` | 移除监听器 | 匿名新函数无法匹配旧函数 |
| `event.target` | 原始事件目标 | 类型可能不是 `Element` |
| `event.currentTarget` | 当前监听节点 | 仅在监听器执行期间有效 |
| `event.eventPhase` | 当前传播阶段 | 1 捕获、2 目标、3 冒泡 |
| `event.preventDefault()` | 取消可取消的默认行为 | 不停止传播 |
| `event.stopPropagation()` | 停止继续传播 | 谨慎使用 |
| `element.closest(selector)` | 向自身和祖先查找 | 结果仍需做容器边界检查 |
| `container.contains(node)` | 判断后代关系 | 包含自身 |
| `new FormData(form)` | 读取成功控件 | 依赖 `name` |
| `form.checkValidity()` | 检查约束 | 不覆盖业务校验 |
| `form.requestSubmit()` | 按提交语义触发表单 | 会执行约束验证 |

## 6. 最小可运行案例

创建完整文件 `js-lab/events/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>事件与表单实验</title>
  </head>
  <body>
    <h1>事件与表单实验</h1>
    <form id="draft-form">
      <label for="title">商品标题</label>
      <input id="title" name="title" required maxlength="80" />
      <button type="submit"><span>加入草稿</span></button>
    </form>

    <p id="message" role="status" aria-live="polite"></p>
    <ul id="draft-list"></ul>

    <script type="module">
      const form = document.querySelector("#draft-form");
      const list = document.querySelector("#draft-list");
      const message = document.querySelector("#message");

      if (!(form instanceof HTMLFormElement)) {
        throw new Error("required form missing");
      }
      if (!(list instanceof HTMLUListElement)) {
        throw new Error("required list missing");
      }
      if (!(message instanceof HTMLParagraphElement)) {
        throw new Error("required message missing");
      }

      let nextId = 1;

      form.addEventListener(
        "click",
        (event) => {
          console.log(`capture:${event.eventPhase}`);
        },
        { capture: true },
      );

      form.addEventListener("click", (event) => {
        console.log(`bubble:${event.eventPhase}`);
        console.log(event.target === event.currentTarget);
      });

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const rawTitle = data.get("title");
        const title = typeof rawTitle === "string" ? rawTitle.trim() : "";

        if (title.length < 2) {
          message.textContent = "标题至少需要 2 个字符。";
          return;
        }

        const item = document.createElement("li");
        item.dataset.draftId = `draft-${nextId}`;

        const text = document.createElement("span");
        text.textContent = title;

        const remove = document.createElement("button");
        remove.type = "button";
        remove.dataset.action = "remove";
        remove.textContent = "移除草稿";

        item.append(text, " ", remove);
        list.append(item);
        nextId += 1;
        form.reset();
        message.textContent = `已加入：${title}`;
      });

      list.addEventListener("click", (event) => {
        if (!(event.target instanceof Element)) return;
        const button = event.target.closest("button[data-action='remove']");
        if (!(button instanceof HTMLButtonElement) || !list.contains(button)) {
          return;
        }
        const item = button.closest("li[data-draft-id]");
        if (!(item instanceof HTMLLIElement) || !list.contains(item)) return;

        const id = item.dataset.draftId ?? "unknown";
        item.remove();
        message.textContent = `已移除 ${id}`;
      });
    </script>
  </body>
</html>
```

通过 HTTP 打开页面。在标题输入“台灯”后按 Enter，列表只增加一项；点击按钮内部文字时，Console 的冒泡日志中 `target === currentTarget` 为 `false`。新增项的移除按钮由同一个列表监听器处理。

## 7. 邻里集市集成案例

在正式商品表单中，金额文本不能交给 `parseFloat`。使用严格解析函数：

```js
function parseYuanToCents(rawValue) {
  const value = rawValue.trim();
  const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value);
  if (!match) {
    throw new RangeError("价格格式应为非负金额，最多两位小数");
  }

  const yuan = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = yuan * 100 + Number(fraction);
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError("价格超出安全范围");
  }
  return cents;
}
```

表单提交处理顺序应为：

1. `preventDefault()` 接管本地教学流程；
2. `FormData` 读取字符串草稿；
3. 标题去除首尾空白并验证长度；
4. 严格解析元文本为整数分；
5. 构造新的普通商品记录；
6. 更新内存状态；
7. 调用统一 `render()`；
8. 更新状态消息与焦点。

错误输入 `1e2`、`12abc`、`-1`、`1.234` 和空字符串都必须失败；`0` 与 `0.00` 合法。客户端成功只表示内存草稿通过当前规则，不表示服务器已保存或用户获准发布。

## 8. 常见错误与排查路径

### 错误示例：渲染函数中重复注册委托监听器

```js
function render() {
  list.replaceChildren(/* 新节点 */);
  list.addEventListener("click", (event) => handleListClick(event));
}
```

五段诊断记录：

1. **现象**：一次点击执行两次或更多次，次数随渲染增加。
2. **证据**：在监听器开头 `console.count("list click")`，一次操作计数递增多次。
3. **原因**：每次渲染都创建新的闭包函数；它们不是同一个监听器引用，旧监听器仍留在稳定容器上。对同一 `type`、同一函数引用和同一 capture 值重复注册时，浏览器会去重，不能用那个写法复现此故障。
4. **修复**：在初始化阶段只注册一次；渲染函数只负责节点。
5. **复验**：连续渲染三次后单击，计数只增加一次。

其他排查：

- Enter 无反应：是否只监听按钮 `click`，没有监听表单 `submit`；
- `FormData.get` 为 `null`：检查控件是否有正确 `name`；
- 点击按钮内图标失效：是否直接要求 `event.target.matches("button")`；
- 委托误处理外层节点：`closest` 后是否用 `container.contains` 限定边界；
- 按钮意外提交：表单内非提交按钮是否缺少 `type="button"`。

## 9. 课后题

1. `preventDefault()` 会停止事件冒泡吗？
2. 为什么提交逻辑监听 `submit` 而不是只监听按钮点击？
3. 委托时为什么同时需要 `closest` 和 `contains`？
4. HTML `required` 通过后，服务端可以跳过校验吗？

**答案：**

1. 不会；它只取消可取消的默认行为。
2. `submit` 覆盖按钮、Enter 和 `requestSubmit()`，保留表单语义。
3. `closest` 找动作节点，`contains` 防止越过当前组件边界。
4. 不可以；客户端输入和脚本可被绕过，服务端必须独立验证。

## 10. 实践练习

### 基础练习

为草稿项增加“标记”按钮，使用同一个列表委托，把 `aria-pressed` 在 `"true"` 与 `"false"` 之间切换。

### 进阶练习

把 DOM 草稿改为 `drafts` 数组，委托只更新数组，统一 `render(drafts)`。证明手动删除一个 `<li>` 后重新渲染会恢复它。

### 故障注入练习

故意调用两次 `installEvents()` 注册相同流程的两个闭包监听器。用 `console.count` 取证，再让安装函数返回清理函数或只执行一次。

**可判定答案标准：**

- Enter 和点击产生相同提交结果；
- 动态新增按钮无需单独注册监听器；
- 一次用户操作只改变一次状态；
- 失败输入保留草稿并产生可读消息；
- 没有用 `stopPropagation()` 掩盖重复监听器。

## 11. 阶段验收

- [ ] 页面通过 HTTP 打开，无未处理 Console 错误；
- [ ] 标题少于 2 字时不新增节点，消息可见；
- [ ] 输入“台灯”后按 Enter，只新增一个草稿；
- [ ] 点击按钮内 `<span>` 时能解释 `target` 与 `currentTarget`；
- [ ] 动态项由列表上的单个委托监听器处理；
- [ ] 严格金额解析拒绝指数、尾随字符、负数和三位小数；
- [ ] 能说明前端校验、内存更新与服务端授权彼此独立。

## 12. 常见问题

**事件委托适合所有事件吗？**
不是。要确认事件是否按预期冒泡，并考虑组件边界、频率和可读性。稳定列表中的动态点击动作通常适合。

**可以在监听器中使用箭头函数吗？**
可以，推荐从事件对象读取 `currentTarget`，不要依赖普通函数被 DOM 设置的动态 `this`。

**为什么不直接读取输入框的 `value`？**
可以读取；`FormData` 更接近表单成功控件语义，也方便一次处理多个命名字段。无论哪种方式都需要运行时检查。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [MDN：事件介绍](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Scripting/Events)
- [MDN：`EventTarget.addEventListener`](https://developer.mozilla.org/zh-CN/docs/Web/API/EventTarget/addEventListener)
- [MDN：事件冒泡](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Scripting/Event_bubbling)
- [MDN：`FormData`](https://developer.mozilla.org/zh-CN/docs/Web/API/FormData)
- [HTML Standard：Form control infrastructure](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html)

## 我现在能做到什么

我能用表单提交语义接收草稿，用一次稳定委托处理动态节点，根据传播证据定位重复执行，并明确区分浏览器约束、程序校验与服务端可信边界。

## 单元导航

- 上一单元：[DOM 查询、节点创建与安全渲染](./01-dom-query-create-safe-rendering.md)
- 下一单元：[内存状态、焦点与可访问交互](./03-state-focus-accessible-interactions.md)
- 章入口：[DOM、事件与可访问状态](../05-dom-events.md)
