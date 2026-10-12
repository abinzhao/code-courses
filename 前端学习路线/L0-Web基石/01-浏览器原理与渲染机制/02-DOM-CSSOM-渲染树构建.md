# 02-DOM-CSSOM-渲染树构建

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[01-浏览器架构与多进程模型](./01-浏览器架构与多进程模型.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Chromium Design Documents](https://www.chromium.org/developers/design-documents/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解浏览器如何将 HTML 文本解析为 DOM Tree
- 理解 CSS 如何被解析为 CSSOM Tree
- 掌握 DOM + CSSOM → Render Tree 的合并过程
- 搞清楚 CSS 如何阻塞渲染、JS 如何阻塞解析，以及 defer/async 的精确区别

---

## 内容讲解

### 1. HTML → DOM Tree

浏览器收到 HTML 字节流后，经历一个标准化的解析流水线：

```
字节（Bytes）→ 字符（Characters）→ 令牌（Tokens）→ 节点（Nodes）→ DOM Tree
```

每一步都在做一件事：**把原始数据转化为结构化对象**。

**字节 → 字符**：HTTP 响应返回的是字节流，浏览器根据响应的 `Content-Type` 头（或 meta 标签）判断编码（如 UTF-8），将字节转换为字符。

**字符 → 令牌**：HTML 分词器（Tokenizer）将字符流切分为有意义的标签单元，如 `开始标签<html>`、`开始标签<body>`、`文本内容"Hello"`、`结束标签</body>`。

**令牌 → 节点**：每个令牌被转化为一个 DOM 节点对象。

**节点 → DOM Tree**：根据 HTML 的嵌套关系，将节点组织为一棵树。

```html
<!-- 源代码 -->
<!DOCTYPE html>
<html>
<head><title>示例</title></head>
<body>
  <h1>Hello</h1>
  <p>World</p>
</body>
</html>
```

```
     document
        │
      html
     ┌──┴──┐
   head   body
    │     ┌─┴─┐
  title  h1   p
    │     │    │
  "示例" "Hello" "World"
```

> **关键认知**：DOM Tree 是浏览器内部的 C++ 对象，不是你在 HTML 文件里写的文本。JS 通过 `document.getElementById()` 等方法操作的，正是这棵内存中的对象树。

### 2. CSS → CSSOM Tree

CSS 解析和 HTML 类似，但更严格。

```css
body { font-size: 16px; }
h1   { color: red; }
p    { color: blue; 
       display: none; }   /* 注意：这条规则在 CSSOM 中确实存在 */
```

```
        CSSOM
          │
        body ─── font-size: 16px
          │
         h1 ─── color: red
          │
         p  ─── color: blue
                display: none
```

**两个重要特性**：

1. **CSS 的层叠（Cascade）**：浏览器会计算每条规则的最终值。你的样式表、用户代理样式（浏览器默认样式）、用户自定义样式，按优先级叠加，最终确定每个元素的每一条 CSS 属性。
2. **CSS 解析速度较快**：CSS 规则的选择器是「从右向左」匹配的。浏览器先找到所有 `<p>`，再检查它们的祖先中有没有 `.content`，而不是先找到所有 `.content` 再找里面的 `<p>`。

> **避坑提示**：你写的 `display: none` 元素在 CSSOM 中仍然存在对应节点，只是该节点在后续渲染树构建阶段会被**跳过**。CSSOM 只关心样式规则本身，它不关心这个元素最终要不要画出来。

### 3. DOM + CSSOM → Render Tree

浏览器拿到 DOM Tree 和 CSSOM Tree 后，将它们合并为 **Render Tree（渲染树）**。

**合并规则**：
- 遍历 DOM Tree 中的每个**可见**节点
- 对每个节点，从 CSSOM 中找到匹配的所有规则，计算出**最终样式**（computed style）
- 生成一个包含**布局信息**的渲染对象，挂到渲染树上

```
DOM Tree                     CSSOM Tree
   │                            │
   ├── div#app                  ├── div#app { width: 100px }  
   ├── h1 (可见)                 ├── h1 { color: red }
   ├── span (可见)              ├── span { display: none }  ← 不可见!
   └── p  (可见)                └── p  { font-size: 14px }
            │                       │
            └─────────┬─────────────┘
                      ▼
               Render Tree
                   │
               div#app ─── width: 100px
                   │
                  h1 ─── color: red
                   │
                   p  ─── font-size: 14px
                   
注意：span 被 display: none 移除，未进入渲染树
```

**哪些节点不会被纳入渲染树？**
- `display: none` 的元素（及其子元素）
- `<head>` 及其内容
- `<script>` 标签（默认不渲染）
- 使用 `visibility: hidden` 的元素**仍然在渲染树中**，只是不显示——它依然占据布局空间

> **避坑提示**：`display: none` 和 `visibility: hidden` 有本质区别。前者元素不出现在渲染树中，不占空间；后者元素在渲染树中，只是透明不可见，仍然占空间。

### 4. CSS 如何「阻塞」渲染？

**CSS 是阻塞渲染（render-blocking）的资源。**

原因很简单：渲染树需要 DOM + CSSOM 两者都就绪才能构建。CSSOM 没构建完，渲染树就出不来，屏幕上什么都看不到。

```
时间线：
────────────────────────────────────────────────────►
网络请求 HTML → 解析 HTML → 遇到 <link rel="stylesheet">
                                    │
                          下载 CSS（阻塞渲染！）
                                    │
                          构建 CSSOM ──► 构建渲染树 ──► 布局 → 绘制
```

**实际影响**：如果你的 CSS 文件有 500KB，在它下载和解析完成之前，用户看到的是一片白屏。

**优化策略**：
- 首屏关键 CSS 内联到 `<style>` 标签中
- 非关键 CSS 使用 `media` 属性延迟：`<link rel="stylesheet" href="print.css" media="print">`，浏览器仍会下载，但不会阻塞渲染
- CSS 拆包，按需加载

### 5. JS 的三个状态：普通、defer、async

JS 的加载和执行行为由 `<script>` 标签的属性决定。这是面试高频考点，你必须彻底分清。

| 属性 | 下载时机 | 执行时机 | 是否阻塞 HTML 解析 |
|------|---------|---------|-------------------|
| **无属性（普通）** | 遇到标签立即下载 | 下载完成后立即执行 | **是**，执行期间完全阻塞解析 |
| **defer** | 遇到标签立即下载 | DOM 解析完成后、`DOMContentLoaded` 之前，按文档顺序执行 | **否**，下载不阻塞解析 |
| **async** | 遇到标签立即下载 | 下载完成后立即执行，**不保证执行顺序** | **否**，但执行时可能阻塞解析 |

```
普通 script：
HTML 解析 ──► 暂停 ──► 下载+执行 JS ──► 继续解析

defer：
HTML 解析 ──────────────────────────► 完成 ──► 按顺序执行 defer 脚本

async：
HTML 解析 ──► 边解析边下载 ──► JS 下载完立即执行（可能暂停解析）
```

**代码验证**：

```html
<!-- 场景 1：普通脚本 —— 阻塞解析 -->
<!DOCTYPE html>
<html>
<head>
  <!-- 这个脚本下载+执行期间，<h1> 的解析被阻塞 -->
  <script src="heavy.js"></script>
</head>
<body>
  <h1>这条文本要等 JS 执行完才能被解析</h1>
</body>
</html>

<!-- 场景 2：defer —— 延迟执行，保证顺序 -->
<!DOCTYPE html>
<html>
<head>
  <script defer src="a.js"></script>  <!-- 先下载，后执行 -->
  <script defer src="b.js"></script>  <!-- 也在下载，但 a.js 先执行 -->
  <!-- a.js 和 b.js 都会等 DOM 解析完，且按声明顺序执行 -->
</head>
<body>
  <h1>这段 HTML 先被解析，然后执行 a.js，再执行 b.js</h1>
</body>
</html>

<!-- 场景 3：async —— 谁先下载完谁先执行 -->
<!DOCTYPE html>
<html>
<head>
  <script async src="c.js"></script>  <!-- 300KB，后下载完 -->
  <script async src="d.js"></script>  <!-- 1KB，先下载完 -->
  <!-- d.js 大概率先执行，即使它在 c.js 之后声明！ -->
  <!-- 如果 d.js 依赖 c.js 中的变量，会报错 -->
</head>
```

**选择决策树**：
- 脚本不依赖 DOM，也不依赖其他脚本 → `async`
- 脚本需要完整 DOM，且需要保证执行顺序 → `defer`
- 脚本需要立即执行（如 inline 配置）、或需兼容老旧代码 → 放在 `</body>` 之前

> **避坑提示**：`<script defer src="app.js">` 只对**外部脚本**生效。内联脚本上的 `defer` 会被忽略（HTML 规范规定）。

### 6. 完整渲染阻塞链路总结

```
浏览器主线程收到 HTML：
    │
    ▼
解析 HTML ──► 遇到 <link> 或 <style>
    │              │
    │         CSS 下载（异步，不阻塞解析）
    │              │
    │         CSSOM 构建（阻塞渲染，不阻塞解析）
    │              │
    ├── 遇到普通 <script>：暂停解析 → 下载 → 执行 → 继续解析
    ├── 遇到 <script defer>：异步下载 → 等 DOM 完成后执行
    └── 遇到 <script async>：异步下载 → 下载完立即执行
    │
    ▼
DOM 解析完成（DOMContentLoaded 事件）
    │
    ▼
CSSOM 构建完成 + DOM 完成 → 构建渲染树 → 布局 → 绘制 → 合成
    │
    ▼
页面显示（load 事件）
```

牢记这条链：**解析 HTML ≠ 显示出页面**。页面首次可看到内容的前提是：DOM 解析到可见内容 + 阻塞该内容的 CSS 加载完毕。

---

## 常见问题

**Q1：CSS 放在 `<head>` 里和放在 `<body>` 末尾有什么区别？**

A：浏览器会尽早开始构建 CSSOM。放在 `<head>` 中，CSS 更早被发现和下载，CSSOM 更早就绪，渲染树就能更早构建。放在 `<body>` 末尾，浏览器会先用默认样式渲染，等 CSS 加载完成后**重新计算样式并可能重绘**，用户会看到「无样式内容闪烁（FOUC）」。

**Q2：为什么 CSS 选择器从右向左匹配更快？**

A：假如规则是 `.content p span`，从左向右需要「先找 `.content` 的所有后代 → 在其中找所有 `p` → 再在其中找所有 `span`」，每一步都产生大量中间结果。从右向左找是「先找到所有 `span` → 检查父级看它有没有 `p` 祖先 → 再检查有没有 `.content` 祖先」，绝大多数 `span` 在第一步就被淘汰了。

**Q3：`DOMContentLoaded` 和 `load` 事件哪个先触发？**

A：`DOMContentLoaded` 先触发，它表示 HTML 解析完成、DOM 树构建完毕（defer 脚本也执行完了）。`load` 要等所有外部资源（图片、样式表、字体、iframe）全部加载完成才触发。

**Q4：`<script>` 放在底部（`</body>` 前）还需要 defer 吗？**

A：不需要。放在底部时，`<script>` 之前的 DOM 已经被解析完毕，脚本执行时已经可以访问到全部 DOM 节点。此时加 `defer` 也没有坏处，但意义不大。

**Q5：内联 `<script>` 会阻塞解析吗？**

A：会。内联脚本没有下载过程，但浏览器遇到 `<script>` 标签时必须暂停 HTML 解析来执行脚本内容，因为脚本可能调用 `document.write()` 修改后续 HTML 内容（虽然现在不推荐用 `document.write`，但浏览器必须兼容）。

**Q6：`<link rel="preload">` 能解决 CSS 阻塞渲染的问题吗？**

A：`preload` 只是让浏览器更早发现和下载资源，不能改变 CSS 的渲染阻塞性质。真正要解除阻塞，可以用 `media` 属性、内联关键 CSS、或使用 `rel="stylesheet"` 的 `disabled` 配合 JS 按需启用。

**Q7：多个 `<script defer>` 的执行顺序保证可靠吗？**

A：HTML 规范明确要求 defer 脚本按声明顺序执行，所有主流浏览器都遵循这一点。你可以放心依赖这个顺序。

---

## 实操作业

### 基础作业：观察解析时序

创建一个 HTML 文件 `parse-demo.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>解析时序观察</title>
  <!-- 引入一个较大 CSS（可以写个 200 行的假样式） -->
  <link rel="stylesheet" href="large.css">
  <script>
    // 这段代码会等 CSSOM 就绪后才执行吗？思考一下
    console.log('head 中的脚本执行时间：', performance.now());
  </script>
</head>
<body>
  <h1 id="title">Hello</h1>
  <script>
    console.log('body 中的 h1 是否存在？', !!document.getElementById('title'));
  </script>
  <script defer src="defer-demo.js"></script>
  <script async src="async-demo.js"></script>
</body>
</html>
```

用 Chrome DevTools 的 Network 面板观察资源加载顺序，Performance 面板观察各阶段时间戳，记录你的发现。

### 进阶作业：defer vs async 精确测试

创建 3 个 JS 文件（每个里面用 `performance.now()` 打时间戳），分别用无属性、defer、async 三种方式加载，对比：

1. 执行时间点相对于 `DOMContentLoaded` 的关系
2. 多个 async 脚本的实际执行顺序（反复刷新多次观察）
3. 在 async 脚本中尝试访问 DOM（`document.querySelector('h1')`），看何时会得到 `null`
4. 写一份 200 字的测试结论

### 挑战作业：手动构造 FOUC

1. 把一个 `<link rel="stylesheet">` 放在 `<body>` 末尾，CSS 中包含 `body { background: red; }`
2. 用浏览器的 Performance 面板录制并观察：页面先以白色背景出现（FOUC），然后变成红色
3. 用 `setTimeout` 动态插入 `<link>` 标签（延迟 2 秒后插入），观察 FOUC 时长
4. 总结 FOUC 的产生条件，以及如何避免

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：记录脚本执行、DOMContentLoaded、load 与资源 Timing；外部样式可阻塞后续经典脚本。只增加 CSS 行数未必产生可测延迟，可在本地服务给响应加有界延迟。
- **进阶**：经典 defer 按文档顺序执行且在 DOMContentLoaded 前；async 就绪即执行，不保证相互顺序。反复改变下载延迟，检查访问 h1 时是否已经完成解析。
- **挑战**：延迟插入 stylesheet 更容易观察未样式化内容；body 末尾的 link 不保证一定产生 FOUC。用 trace 证明首次绘制与样式生效时刻，未出现也记录条件。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：在 Atlas 中构造与“DOM-CSSOM-渲染树构建”相关的可观察场景，使用 DevTools 或请求日志记录现象、时间线和结论。
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

- HTML 字节流经过分词和树构建，最终生成 DOM Tree；CSS 文件被解析为 CSSOM Tree
- 渲染树 = DOM 中可见节点 + 对应的 CSSOM 计算样式；`display: none` 元素不在渲染树中
- CSS 是「阻塞渲染」的资源——CSSOM 未就绪，渲染树就不会构建
- 普通 `<script>` 阻塞 HTML 解析；`defer` 延迟到 DOM 解析完成后执行且保证顺序；`async` 下载完立即执行且不保证顺序
- 理解 DOM → CSSOM → Render Tree 的全流程，是后续学习布局和性能优化的基础

<!-- course-nav:start -->
---

[上一篇：01-浏览器架构与多进程模型](./01-浏览器架构与多进程模型.md) · [课程地图](../../README.md) · [下一篇：03-布局-绘制-合成流水线](./03-布局-绘制-合成流水线.md)
<!-- course-nav:end -->
