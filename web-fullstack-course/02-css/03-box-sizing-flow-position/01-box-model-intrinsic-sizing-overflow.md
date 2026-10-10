# 盒模型、内在尺寸与溢出：让内容参与约束

## 任务卡

- **任务**：推导商品卡总宽，并修复长标识符和媒体造成的页面级横向滚动。
- **产出**：`practice/css-03-01/minimal.html` 与 `practice/css-03-01/market.html`。
- **运行**：直接打开，在 320px 视口和 200% 缩放下观察；用 Layout 面板记录盒模型。
- **完成证据**：一份宽度算式、scrollWidth/clientWidth 对比、溢出修复前后诊断。
- **边界**：隐藏溢出不等于内容问题已解决；可聚焦内容不得被无替代地裁掉。

## 1. 任务背景

邻里集市商品卡声明 `width: 100%` 后又加 padding 和 border，可能超出容器；长 URL、未断行编号和图片固有宽度也会扩大最小内容尺寸。直接在 body 上写 `overflow-x: hidden` 只会把证据裁掉，还可能让键盘用户无法看到焦点。

本单元先建立盒模型算式，再让内容的 min-content/max-content 贡献进入判断，最后决定应该换行、约束媒体、建立局部滚动，还是允许内容扩展。

## 2. 学习目标

完成后你能：

1. 区分 content、padding、border、margin 四个盒并推导总尺寸；
2. 解释 `content-box` 与 `border-box` 改变的只是声明尺寸覆盖范围；
3. 使用 min-content、max-content、fit-content 理解内容内在尺寸；
4. 约束图片等替换元素而不破坏固有比例；
5. 区分 visible、hidden、clip、auto、scroll 的滚动与裁剪行为。

## 3. 预备知识

需要理解百分比参照和使用值。测试时打开 DevTools 的 Layout/Computed 盒模型，记录视口 `clientWidth`、文档 `scrollWidth` 和目标元素 `getBoundingClientRect()`。

本单元默认水平书写模式，优先使用 `inline-size`、`block-size`、`padding-inline` 等逻辑属性描述轴。边框盒是否超出还会受 min/max、内在最小尺寸和布局模式影响，不能只看一条 width。

## 4. 核心理论

标准盒从内到外为：

1. content box：内容布局区域；
2. padding box：内容加内边距；
3. border box：再加边框；
4. margin box：再加外边距，margin 可为负且不是背景绘制区域。

在 `content-box` 下，声明 inline-size 通常指定 content box。水平总占用可概念化为：

```text
margin-start + border-start + padding-start + content width
+ padding-end + border-end + margin-end
```

`border-box` 下，声明尺寸包含 padding 与 border，content 可用空间为声明尺寸减去它们。它不会把 margin 包入尺寸，也不会阻止内容最小尺寸或 min-width 施加约束。

全局常见基线：

```css
*, *::before, *::after { box-sizing: border-box; }
```

伪元素也应纳入，否则生成盒可能仍用 content-box。

内在尺寸来自内容：

- `min-content`：在可换行机会都使用时的最小内在尺寸，长不可断词仍可能很宽；
- `max-content`：内容不发生可选换行时的理想尺寸；
- `fit-content`：在可用空间和内在上下限之间夹取；
- `min-inline-size: 0`：在 Flex/Grid 等场景允许项目缩小到内容最小尺寸以下，第 5、6 章展开。

替换元素如 `img` 有固有尺寸与比例。常用约束：

```css
img {
  display: block;
  max-inline-size: 100%;
  block-size: auto;
}
```

只有 width/height 属性或 CSS 尺寸都明确时，浏览器才能更早保留空间；真实图片还需正确替代文本与加载策略，见 HTML 卷。

`overflow` 同时影响裁剪、滚动机制和格式化上下文：

- `visible`：默认允许内容绘制到盒外，不建立滚动容器；
- `hidden`：裁剪且通常仍可程序化滚动，建立滚动容器；
- `clip`：在 clip edge 裁剪，不提供滚动机制，单独不建立 BFC；
- `auto`：需要时提供滚动机制；
- `scroll`：无论是否需要都建立滚动容器并可能显示滚动条。

用局部 `overflow: auto` 必须让用户知道该区域可滚动，并确保键盘焦点可进入或内容本身有可聚焦元素。页面级横滚优先修根因。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 常见误区 |
| --- | --- | --- |
| `box-sizing` | 决定指定尺寸覆盖 content 或 border box | 不包含 margin |
| `inline-size/block-size` | 逻辑轴尺寸 | 书写模式会改变物理方向 |
| `min/max-inline-size` | 限制可用内联尺寸 | 默认 min-content 约束可能仍生效 |
| `min-content/max-content` | 内容内在尺寸关键词 | 不是固定像素 |
| `fit-content()` / `fit-content` | 在内在上下限与可用空间中夹取 | 属性值与 Grid 函数语境不同 |
| `aspect-ratio` | 提供首选宽高比 | 内容/min/max 仍可改变最终尺寸 |
| `overflow-*` | 控制轴向溢出 | hidden 可能隐藏焦点与错误 |
| `scrollbar-gutter` | 为滚动条预留空间 | 支持与平台滚动条模式需核对 |
| `clientWidth/scrollWidth` | 可视内宽 / 内容总宽 | 舍入为整数，需结合 rect |
| `getBoundingClientRect()` | 变换后的边框盒 | 不含 margin |

## 6. 最小可运行案例

创建 `practice/css-03-01/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>盒模型观察台</title>
  <style>
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; }
    .frame { inline-size: 20rem; max-inline-size: 100%; border: 2px dashed #718078; }
    .card {
      box-sizing: content-box;
      inline-size: 100%;
      padding-inline: 1rem;
      border: .25rem solid #185c3b;
      background: #e9f2ec;
    }
    .token { overflow-wrap: anywhere; }
    output { display: block; margin-block-start: 1rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>盒模型观察台</h1>
    <div class="frame">
      <section class="card">
        <p class="token">listing_2026_very_long_identifier_without_safe_breaks</p>
      </section>
    </div>
    <output id="report"></output>
  </main>
  <script>
    const frame = document.querySelector(".frame");
    const card = document.querySelector(".card");
    document.querySelector("#report").textContent = [
      `容器边框盒：${frame.getBoundingClientRect().width}px`,
      `卡片边框盒：${card.getBoundingClientRect().width}px`,
      `文档 clientWidth：${document.documentElement.clientWidth}px`,
      `文档 scrollWidth：${document.documentElement.scrollWidth}px`
    ].join("\\n");
  </script>
</body>
</html>
```

`content-box` 的卡片 content width 已是容器内容宽的 100%，再加两侧 16px padding 和 4px border，所以边框盒比容器更宽 40px。将 `.card` 改为 `box-sizing: border-box`，其边框盒才受 100% 包含；再删除 `overflow-wrap: anywhere` 可观察长 token 的最小内容溢出。

逐步扩展：

1. 记录 content-box 的算式与实际 rect；
2. 改为 border-box，对账新的 content 可用宽；
3. 分别试 `overflow: hidden` 与 `overflow-wrap: anywhere`，比较“裁掉”和“解决换行”；
4. 给 frame `overflow: auto`，观察局部滚动与页面滚动差别。

## 7. 邻里集市集成案例

创建 `practice/css-03-01/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市稳健商品卡</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font: 1rem/1.65 system-ui, sans-serif; color: #26352d; }
    .market { inline-size: min(46rem, 100% - 2rem); margin: 2rem auto; }
    .listing { max-inline-size: 100%; padding: 1rem; border: 1px solid #78877e; border-radius: .5rem; }
    .media {
      display: block;
      inline-size: 100%;
      max-inline-size: 24rem;
      aspect-ratio: 16 / 9;
      block-size: auto;
      background: #dce9e0;
      object-fit: cover;
    }
    .identifier, a { overflow-wrap: anywhere; }
    .price { color: #185c3b; font-weight: 700; }
    .specs { max-inline-size: 100%; overflow-x: auto; scrollbar-gutter: stable; }
    table { border-collapse: collapse; min-inline-size: 34rem; }
    th, td { padding: .5rem; border: 1px solid #87948d; text-align: start; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p>静态演示：图片区域不是远程商品图片，规格表可局部横向滚动。</p>
    <article class="listing">
      <div class="media" role="img" aria-label="教学用商品图片占位色块"></div>
      <h2>多功能家用维修套装</h2>
      <p class="identifier">编号：listing_2026_neighborhood_market_extra_long_identifier</p>
      <p class="price" data-price-cents="8800">88.00 元</p>
      <div class="specs" tabindex="0" role="region" aria-label="商品规格，可横向滚动">
        <table>
          <thead><tr><th>部件</th><th>数量</th><th>材质</th><th>说明</th></tr></thead>
          <tbody><tr><td>螺丝刀</td><td>6</td><td>合金钢</td><td>静态演示数据</td></tr></tbody>
        </table>
      </div>
    </article>
    <output id="evidence"></output>
  </main>
  <script>
    const root = document.documentElement;
    const region = document.querySelector(".specs");
    document.querySelector("#evidence").textContent =
      `页面横向溢出：${root.scrollWidth > root.clientWidth ? "是" : "否"}；` +
      `规格区可滚动：${region.scrollWidth > region.clientWidth ? "是" : "否"}。`;
  </script>
</body>
</html>
```

页面本身不应横滚；只有确实需要保持列关系的规格表在命名 region 内滚动。`tabindex="0"` 让没有内部焦点机会时也可键盘到达滚动区域，但不同平台键盘滚动行为仍需测试。生产图片应使用真实 `<img alt>`；这里是明确标注的教学色块，不伪装资源已接入。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
html, body { overflow-x: hidden; }
.card { width: 100%; padding: 2rem; }
```

这会裁掉超宽内容和焦点，掩盖 content-box、长 token 或固定宽媒体的根因。

排查路径：

1. 比较根 `scrollWidth` 与 `clientWidth`，确认是否页面级溢出；
2. 在 Elements 中从最宽后代向上检查 rect；
3. 对账 box-sizing、声明尺寸、padding、border 与 margin；
4. 检查 min-content 来源：长词、pre、表格、图片、固定宽；
5. 决定换行、约束媒体、允许缩小或建立命名局部滚动；
6. 在 320px、200% 和键盘焦点下复验，不以根裁剪收尾。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 320px 下页面可左右拖动，按钮焦点一部分在屏外 |
| 证据 | 根 scrollWidth 大于 clientWidth；商品卡 rect 比容器宽 40px |
| 原因 | content-box 的 100% content width 之外又增加 padding 与 border |
| 修复 | 全局含伪元素使用 border-box，并对长 token 使用 anywhere 换行 |
| 复验 | 根宽相等；规格表只在命名区域内滚动；Tab 焦点完全可见 |

## 9. 课后题

1. `border-box` 是否包含 margin？
2. `overflow: hidden` 与 `overflow: clip` 都裁剪时有何重要差异？
3. 为什么长不可断字符串会扩大 min-content？
4. `max-inline-size: 100%` 对大图片有什么作用？
5. 页面无滚动条是否证明没有内容被裁掉？

答案：

1. 不包含，只包含 content、padding 和 border。
2. hidden 建立滚动容器并可程序化滚动；clip 不提供滚动机制，单独也不建立 BFC。
3. 没有合法换行机会，最小可容纳宽度仍接近整串宽度。
4. 限制其不超过包含块可用内联尺寸；配合 auto 高度保留比例。
5. 不能，hidden/clip 可能把内容和焦点直接裁掉。

## 10. 实践练习

**基础**：分别计算 20rem content-box 和 border-box 卡片的 content 与 border 宽。
验收：算式包含两侧 padding/border，不把 margin 算入 border box。

**进阶**：为代码片段建立命名 `overflow-x: auto` region。
验收：页面不横滚，区域可聚焦、有可见标签，长代码不被强制断成不可读字符。

**故障注入**：添加宽 900px 的媒体色块并在 body 上隐藏横向溢出。
验收：先证明裁剪，再删除根隐藏，给媒体正确最大尺寸并复验焦点与滚动宽度。

## 11. 阶段验收

- [ ] content-box 与 border-box 的算式和 rect 数值一致。
- [ ] 根 scrollWidth 不大于 clientWidth（允许舍入误差时有说明）。
- [ ] 长编号、长链接、媒体和表格分别采用合适策略。
- [ ] 局部滚动区域可识别、可聚焦且不吞掉页面纵向滚动。
- [ ] 320px、200% 缩放和键盘路径均通过。
- [ ] 没有以 `html/body overflow-x: hidden` 作为最终修复。

## 12. 常见问题

**全局 border-box 会破坏第三方组件吗？**
大多数现代项目采用它，但第三方隔离内容仍需核对。若组件明确依赖 content-box，应在边界内重置并记录。

**`overflow-wrap: anywhere` 与 `word-break: break-all` 一样吗？**
不一样。anywhere 提供额外换行机会并影响最小内容尺寸；break-all 允许非 CJK 文本在任意字符间断开，可读性更差，应按语言需求选择。

**所有表格都应横向滚动吗？**
不是。小表可响应重排；必须保持列关系的宽表可局部滚动，并提供标签与键盘路径。

**为什么 rect 有小数而 clientWidth 是整数？**
布局支持子像素，DOM 几何 API 的序列化精度不同；比较时记录方法并允许合理舍入。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Box Model Level 3](https://www.w3.org/TR/css-box-3/)
- [CSS Sizing Level 3](https://www.w3.org/TR/css-sizing-3/)
- [CSS Overflow Level 3](https://www.w3.org/TR/css-overflow-3/)
- [MDN：Box model](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model)
- [MDN：Intrinsic size](https://developer.mozilla.org/en-US/docs/Glossary/Intrinsic_Size)
- [MDN：overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/overflow)

兼容边界：基础盒模型广泛稳定；`overflow: clip`、`scrollbar-gutter`、内在尺寸函数及滚动区域键盘行为需按浏览器/平台核对。Safari、Firefox、真实触屏和屏幕阅读器未在本单元实测。

## 我现在能做到什么

我能从盒模型算式和内容内在尺寸定位横向溢出，为媒体、长文本和宽表选择不同策略，而不是裁掉页面证据。

## 单元导航

- 上一单元：[章入口](../03-box-sizing-flow-position.md)
- 下一单元：[常规流、格式化上下文与外边距](./02-normal-flow-formatting-contexts-margins.md)
