# 06 DOM、事件模型与事件委托

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L1 JavaScript 与 TypeScript
> - 先修：[05 ES2022–ES2026 新特性速查](./05-ES2022-2026新特性速查.md)
> - 建议用时：120-180 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[TypeScript](https://www.typescriptlang.org/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 能安全地查询、创建、更新和删除 DOM 节点
- 理解事件捕获、目标、冒泡和默认行为
- 能使用事件委托处理动态列表
- 能区分 `target` 与 `currentTarget`
- 能使用 AbortSignal 统一清理事件监听
- 能让自定义交互保持键盘和辅助技术可用

---

## 内容讲解

### 一、DOM API 操作对象树

```js
const list = document.querySelector('[data-article-list]');

if (!(list instanceof HTMLUListElement)) {
  throw new Error('文章列表容器不存在');
}

const item = document.createElement('li');
const link = document.createElement('a');

link.href = '/articles/event-loop';
link.textContent = '事件循环与任务队列';
item.append(link);
list.append(item);
```

优先使用：

- `textContent` 写纯文本
- `classList` 修改类
- `dataset` 存放交互标识
- `createElement` 构建动态结构

外部输入不要直接交给 `innerHTML`。如果业务必须渲染受限 HTML，应在明确的信任边界内使用成熟净化方案。

### 二、事件传播分三个阶段

```text
window
  ↓ 捕获
document
  ↓
button ← 目标
  ↑
document
  ↑ 冒泡
window
```

```js
document.addEventListener(
  'click',
  event => {
    console.log('捕获阶段', event.eventPhase);
  },
  { capture: true }
);

document.addEventListener('click', event => {
  console.log('冒泡阶段', event.eventPhase);
});
```

大多数 UI 事件监听使用冒泡阶段即可。捕获适合确实需要在目标处理前观察事件的基础设施，不应成为默认。

### 三、target 与 currentTarget

```html
<button id="save-button">
  <span>保存</span>
</button>
```

```js
const button = document.querySelector('#save-button');

button?.addEventListener('click', event => {
  console.log(event.target);        // 实际被点击的 span 或 button
  console.log(event.currentTarget); // 注册监听器的 button
});
```

`target` 来自事件起点，`currentTarget` 随传播路径变化。监听器执行结束后，不要异步依赖 `currentTarget`，先保存所需值。

### 四、默认行为与传播不是一回事

```js
form.addEventListener('submit', event => {
  event.preventDefault();
});
```

`preventDefault()` 阻止表单提交、链接导航等默认行为，但事件仍可传播。

```js
event.stopPropagation();
```

停止传播会影响上层组件、埋点和可访问性基础设施。先通过更精确选择器或状态判断解决冲突，只在明确组件边界下使用。

### 五、事件委托

动态文章列表不需要为每个按钮单独注册监听器：

```html
<ul data-article-list>
  <li>
    <button data-action="favorite" data-article-id="a-1">收藏</button>
  </li>
</ul>
```

```js
const articleList = document.querySelector('[data-article-list]');

articleList?.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;

  const button = event.target.closest('button[data-action="favorite"]');
  if (!(button instanceof HTMLButtonElement)) return;
  if (!articleList.contains(button)) return;

  const articleId = button.dataset.articleId;
  if (!articleId) return;

  toggleFavorite(articleId);
});
```

三个边界：

1. `target` 可能不是 Element。
2. 点击可能发生在按钮内部图标上，因此使用 `closest`。
3. 委托容器外的匹配元素不应被处理，因此检查 `contains`。

不是所有事件都会冒泡。例如原生 `focus`/`blur` 不冒泡，可使用 `focusin`/`focusout` 或捕获阶段。

### 六、监听器生命周期

匿名函数无法用另一个匿名函数移除：

```js
button.addEventListener('click', () => save());
button.removeEventListener('click', () => save()); // 无效
```

保存引用：

```js
function handleSave() {
  save();
}

button.addEventListener('click', handleSave);
button.removeEventListener('click', handleSave);
```

或使用 AbortController：

```js
const controller = new AbortController();

window.addEventListener('resize', handleResize, {
  signal: controller.signal,
});

document.addEventListener('keydown', handleShortcut, {
  signal: controller.signal,
});

// 页面模块销毁
controller.abort();
```

### 七、键盘事件与语义

优先使用原生按钮：

```html
<button type="button">展开目录</button>
```

如果确实构建复合控件，需要定义：

- 焦点落在哪里
- Enter、Space、方向键、Escape 的行为
- 焦点是否移动
- ARIA 状态如何同步

不要在全局 `keydown` 中拦截所有按键：

```js
document.addEventListener('keydown', event => {
  const target = event.target;
  const isEditable =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target?.isContentEditable;

  if (isEditable) return;
  if (event.key === '/' && !event.metaKey && !event.ctrlKey) {
    searchInput.focus();
    event.preventDefault();
  }
});
```

### 八、自定义事件用于模块协作

```js
document.dispatchEvent(
  new CustomEvent('atlas:favorite-change', {
    detail: {
      articleId: 'a-1',
      favorite: true,
    },
  })
);

document.addEventListener('atlas:favorite-change', event => {
  if (!(event instanceof CustomEvent)) return;
  console.log(event.detail);
});
```

自定义事件适合同一页面内松耦合通知，不应替代清晰的数据流。事件名称、detail 结构和错误语义需要形成契约。

---

## 常见问题

### Q1：`querySelector` 和 `getElementById` 怎么选？

两者都可用。`querySelector` 选择能力统一；`getElementById` 直接表达 ID 查找。关键是检查返回值并保持选择器稳定。

### Q2：事件委托一定更快吗？

不一定。它主要简化动态元素的监听器管理。小型固定列表单独监听完全可以，性能需要实际测量。

### Q3：为什么点击图标时 `target` 不是按钮？

事件起点是最深层被点击节点。通过 `closest` 找到交互祖先。

### Q4：什么时候使用 `once`？

只需要执行一次的初始化、引导或首个交互可以使用 `{ once: true }`，浏览器执行后自动移除。

### Q5：`passive: true` 有什么作用？

它承诺监听器不会调用 `preventDefault()`，浏览器可更早处理滚动。需要阻止默认行为的监听器不能设为 passive。

### Q6：MutationObserver 可以代替所有 DOM 事件吗？

不能。它观察 DOM 结构或属性变化，不表达用户意图，而且回调过多可能带来额外成本。

---

## 实操作业

### 基础：动态课程列表

使用 DOM API：

- 从数组渲染课程
- 添加新课程
- 删除课程
- 不使用字符串拼接生成 HTML

### 进阶：事件委托

在 Atlas 文章列表容器上注册一个监听器，处理：

- 收藏
- 展开摘要
- 删除草稿

要求图标点击、文字点击和动态新增行都能工作，并验证委托边界。

### 挑战：可访问复合控件

实现一个 Tabs：

- 使用合适 ARIA role
- 左右方向键切换
- Home/End 定位
- 焦点与选中状态同步
- 事件监听可统一清理
- 写出鼠标与键盘验收记录

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：createElement/textContent 生成节点，稳定 ID 连接数组与 DOM。标题 "<img>" 显示原文；删除不存在的 ID 不误删最后一项。
- **进阶**：从 event.target.closest("[data-action]") 定位动作，再检查容器 contains 与行 ID。图标/文字/新行共用监听；容器外或未知动作不执行特权操作。
- **挑战**：tablist/tab/tabpanel、aria-selected 与 roving tabindex 同步；Home/End 与方向键按方向处理。移除控件统一清理监听；鼠标切换后键盘焦点仍在选中 tab。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L1 里程碑](../../projects/atlas/milestones/L1.md)
- 本课任务：把“DOM、事件模型与事件委托”落实为 Atlas 中可独立导入的模块或纯函数，补充正常、边界、异常三类自动测试。
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

- DOM API操作的是对象树，外部文本优先写入 `textContent`
- 事件经历捕获、目标和冒泡阶段
- `target` 是起点，`currentTarget` 是当前监听器节点
- 事件委托依赖冒泡、`closest` 和明确容器边界
- AbortSignal 能统一管理监听器生命周期
- 语义与键盘行为必须和鼠标交互一起设计

<!-- course-nav:start -->
---

[上一篇：05 ES2022–ES2026 新特性速查](./05-ES2022-2026新特性速查.md) · [课程地图](../../README.md) · [下一篇：07 Fetch、表单与浏览器存储](./07-Fetch-表单与浏览器存储.md)
<!-- course-nav:end -->
