# 02 第一个 HTML、CSS、JavaScript 页面

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[01 开发环境、终端与项目目录](./01-开发环境-终端与项目目录.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[ECMAScript](https://tc39.es/ecma262/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 能解释 HTML、CSS、JavaScript 在页面中的职责
- 能写出结构完整的 HTML 文档并正确引用 CSS、JavaScript
- 理解浏览器从读取 HTML 到执行模块脚本的基本顺序
- 能通过 DOM API读取和更新页面
- 能为交互元素提供键盘和语义支持
- 能从 Console、Network 和页面状态定位基础错误

---

## 内容讲解

### 一、三个文件如何协作

```text
HTML：内容与结构
CSS ：布局与视觉表现
JS  ：状态、行为与数据处理
```

创建目录：

```text
first-page/
├── index.html
├── styles.css
└── app.js
```

`index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta
      name="description"
      content="Atlas 前端课程的第一个可交互页面"
    />
    <title>Atlas 学习面板</title>
    <link rel="stylesheet" href="./styles.css" />
    <script type="module" src="./app.js"></script>
  </head>
  <body>
    <header>
      <h1>Atlas 学习面板</h1>
    </header>

    <main>
      <section aria-labelledby="progress-title">
        <h2 id="progress-title">今日进度</h2>
        <p id="progress-text">尚未开始</p>
        <button id="complete-button" type="button">完成一课</button>
      </section>
    </main>
  </body>
</html>
```

关键点：

- `<!doctype html>` 让浏览器使用标准模式。
- `lang` 帮助屏幕阅读器和翻译工具确定语言。
- `charset` 应尽量靠前，避免字符解码错误。
- `viewport` 让移动端按设备宽度布局。
- `type="module"` 让脚本使用 ESM，并在文档解析后执行。
- `button` 自带键盘、焦点和点击语义，不要用 `<div>` 模拟。

### 二、CSS 从可读性开始

`styles.css`：

```css
:root {
  color-scheme: light dark;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: CanvasText;
  background: Canvas;
}

header,
main {
  width: min(100% - 2rem, 60rem);
  margin-inline: auto;
}

section {
  padding-block: 1rem;
  border-block-start: 1px solid GrayText;
}

button {
  min-block-size: 2.75rem;
  padding-inline: 1rem;
  font: inherit;
}

button:focus-visible {
  outline: 3px solid Highlight;
  outline-offset: 3px;
}
```

这一版没有追求复杂视觉，先保证：

- 文本可读
- 内容不会贴边
- 盒模型可预测
- 键盘焦点可见
- 浅色和深色模式都能使用

### 三、JavaScript 操作状态

`app.js`：

```js
const progressText = document.querySelector('#progress-text');
const completeButton = document.querySelector('#complete-button');

if (!(progressText instanceof HTMLParagraphElement)) {
  throw new Error('缺少 #progress-text 段落');
}

if (!(completeButton instanceof HTMLButtonElement)) {
  throw new Error('缺少 #complete-button 按钮');
}

let completedLessons = 0;

completeButton.addEventListener('click', () => {
  completedLessons += 1;
  progressText.textContent = `已完成 ${completedLessons} 课`;
});
```

不要直接写：

```js
document.querySelector('#progress-text').textContent = '...';
```

因为选择器可能拼错，元素也可能在重构后被删除。先验证边界能把“稍后某处出现空对象错误”变成“入口处立即给出明确错误”。

### 四、页面加载顺序

简化顺序如下：

```text
读取 HTML
  ↓
遇到 stylesheet：请求 CSS，参与后续渲染
  ↓
遇到 type=module：请求模块，文档解析完成后执行
  ↓
构建 DOM + CSSOM
  ↓
计算样式、布局、绘制
```

如果使用普通脚本且没有 `defer`：

```html
<script src="./app.js"></script>
```

浏览器会暂停 HTML 解析来执行脚本。脚本放得太早时，后面的 DOM 可能尚不存在。

入门阶段推荐：

```html
<script type="module" src="./app.js"></script>
```

模块脚本默认延后执行，并支持 `import`/`export`。这不代表所有异步资源都会在脚本前完成，例如图片仍可能继续加载。

### 五、DOM 不是 HTML 字符串

HTML 是输入文本，DOM 是浏览器解析后创建的对象树：

```text
Document
└── html
    ├── head
    └── body
        ├── header
        └── main
            └── section
                ├── h2
                ├── p
                └── button
```

JavaScript 操作的是 DOM 对象：

```js
const item = document.createElement('li');
item.textContent = '学习语义化 HTML';
document.querySelector('ul')?.append(item);
```

处理外部文本时优先使用 `textContent`。把不可信输入传给 `innerHTML` 会创建 HTML 注入边界，后续安全章节会深入说明。

### 六、用 DevTools 找证据

#### Console

观察语法错误、模块加载错误和主动抛出的边界错误：

```js
console.log({ completedLessons });
```

#### Network

刷新页面并确认：

- `index.html` 返回 200
- `styles.css` 的 Content-Type 是 `text/css`
- `app.js` 的 Content-Type 是 JavaScript 类型
- URL 与文件名大小写一致

#### Elements

确认 DOM 实际结构、计算样式和焦点状态。页面“看起来有按钮”不等于它真的是 `<button>`。

---

## 常见问题

### Q1：为什么修改文件后页面没变化？

先确认保存成功，再检查浏览器请求的文件路径、缓存和当前打开的服务器地址。不要默认编辑器中的文件就是浏览器正在加载的文件。

### Q2：为什么脚本报 `Cannot read properties of null`？

选择器没有匹配元素，或脚本执行时元素尚未解析。检查选择器、加载顺序和实际 DOM。

### Q3：CSS 为什么没有生效？

检查 Network 是否成功加载、选择器是否匹配、声明是否被覆盖，以及属性值是否有效。Elements 的 Styles 面板会展示被覆盖或无效的声明。

### Q4：可以把 CSS 和 JS 全写在 HTML 中吗？

小实验可以，但课程项目拆文件更利于缓存、职责分离、调试和后续模块化。

### Q5：为什么使用 `type="module"` 后直接双击 HTML 会报错？

模块加载受 URL、MIME 和同源策略约束。使用本地 HTTP 服务器，不要依赖 `file://`。

### Q6：为什么点击 `<div>` 也能工作，还要用 `<button>`？

鼠标点击只是输入方式之一。`button` 同时提供键盘激活、焦点、禁用状态和辅助技术语义；用 `<div>` 重造这些能力容易遗漏。

---

## 实操作业

### 基础：个人学习卡片

实现包含以下元素的页面：

- 一个页面级标题
- 当前学习主题
- 完成次数
- 一个真实 `<button>`
- 一个状态文本区域

验收：

- 鼠标和键盘 Enter/Space 都能触发按钮
- Console 无错误
- 320px 宽度没有横向滚动

### 进阶：课程列表

使用数组数据创建课程列表，支持：

- 添加课程
- 标记完成
- 显示“已完成 / 总数”
- 没有课程时显示空状态

要求只对文本使用 `textContent`，不把用户输入拼接到 `innerHTML`。

### 挑战：故障注入

主动制造并修复：

1. CSS 路径错误
2. JavaScript 语法错误
3. DOM 选择器错误
4. 按钮误写成 `<div>`
5. 移动端横向滚动

每个问题保留“现象—证据—原因—修复—验证”记录。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：把“第一个 HTML、CSS、JavaScript 页面”应用到 Atlas 的 HTML/CSS 交互界面，覆盖窄屏、键盘操作和至少一个失败状态。
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

- HTML 表达结构，CSS 表达视觉，JavaScript 管理状态与行为
- 模块脚本默认在文档解析后执行，但资源加载仍需通过 Network 验证
- DOM 是对象树，不是原始 HTML 文本
- 原生语义元素自带大量交互和可访问性能力
- 调试的第一步是确认浏览器实际加载了什么，而不是凭代码外观猜测

<!-- course-nav:start -->
---

[上一篇：01 开发环境、终端与项目目录](./01-开发环境-终端与项目目录.md) · [课程地图](../../README.md) · [下一篇：03 本地服务器与浏览器调试](./03-本地服务器与浏览器调试.md)
<!-- course-nav:end -->
