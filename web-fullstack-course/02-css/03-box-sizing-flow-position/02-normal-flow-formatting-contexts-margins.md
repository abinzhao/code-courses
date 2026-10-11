# 常规流、格式化上下文与外边距：先保留阅读顺序

## 任务卡

- **任务**：解释商品卡之间的间距为何不是相加，并让浮动缩略图被卡片边框完整包住。
- **产出**：`practice/css-03-02/minimal.html` 与 `practice/css-03-02/market.html`。
- **运行**：直接打开；用 Layout 面板、边框和脚本几何报告观察流中占位。
- **完成证据**：margin collapse 推导、BFC 前后高度记录、键盘/阅读顺序检查。
- **边界**：float 仅用于文字环绕演示，不作为整页多列布局方案。

## 1. 任务背景

两个段落分别有 24px 与 16px 外边距，实际间隔可能是 24px 而不是 40px；商品卡内只有浮动图片时，父级高度又可能看似“塌陷”。这些现象不是浏览器随机行为，而是块格式化上下文中的外边距折叠和浮动参与方式。

常规流还保留 DOM 阅读顺序。布局前应先让语义和键盘顺序正确，再用 CSS 改变外观；不能用视觉位移弥补错误 DOM。

## 2. 学习目标

完成后你能：

1. 区分块级盒与行内级盒在常规流中的排列；
2. 解释相邻、父子和空块外边距折叠的主要条件；
3. 说明 float 如何影响行盒及为什么脱离普通块流占位；
4. 使用 `display: flow-root` 创建有目的的 BFC；
5. 保持 DOM、阅读、焦点和视觉顺序一致。

## 3. 预备知识

先完成盒模型单元。使用边框和背景显示盒边界，避免仅凭空白区域判断。Margin 折叠只发生在块轴的特定块级场景；Flex/Grid 项目的外边距不按普通块折叠，第 5、6 章再比较。

本单元不通过空 `<br>`、空段落或 `&nbsp;` 制造间距。间距属于 CSS，结构应表达真实内容。

## 4. 核心理论

常规流由书写模式和格式化上下文决定。块级盒在块轴依次排列，通常填充可用内联空间；行内级内容被组织成行盒，文本、inline 和 inline-block 在行内轴排列并按基线等规则对齐。

`display` 的外部角色与内部布局概念可分开理解。例如 `inline-block` 外部参与行内格式化，内部建立块格式化；现代双值语法可写 `display: inline flow-root`，但兼容与团队可读性需核对。

垂直外边距折叠常见三类：

1. 相邻块兄弟：前一个 margin-bottom 与后一个 margin-top 折叠；
2. 父与第一个/最后一个流内子块：在没有 border、padding、行内内容、clearance 等阻隔时可能折叠；
3. 空块自己的上下 margin 可能折叠。

正外边距折叠后取最大值；全部负值取绝对值最大的负值；正负混合是最大正值加最小负值。不要把它简化为“总取最大值”。

避免意外折叠的优先手段是建立清晰组件边界与单方向间距策略，例如只用 `margin-block-start` 给后续兄弟。为了解决具体 BFC 需求，可用：

```css
.component { display: flow-root; }
```

BFC 是内部块布局环境。它会包含内部浮动，且其边界不会与相邻浮动重叠；BFC 根的内部子元素 margin 不会穿过根边界与外部折叠。其他创建 BFC 的方式包括 float、绝对定位、inline-block、非 visible/clip overflow、Flex/Grid 容器等，但不要为清浮动滥用 `overflow: hidden`，它会裁剪内容。

`float` 最初用于媒体旁文字环绕。浮动盒从普通流中取出并向一侧移动，后续行盒绕开它；后续块盒的背景可能延伸到浮动下。`clear` 让盒避开先前浮动。现代组件若只为包含浮动，优先 `flow-root`，而不是额外清除元素。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 注意 |
| --- | --- | --- |
| `display: block/inline/inline-block` | 决定外部/内部格式化角色 | 不是语义替代 |
| `display: flow-root` | 创建新的 BFC | 不裁剪溢出 |
| `float: inline-start` | 浮动并让行内容环绕 | 逻辑值支持需核对旧环境 |
| `clear` | 避开指定方向浮动 | 不等于包含父级浮动 |
| `margin-block` | 逻辑块轴外边距 | 折叠条件仍需判断 |
| `vertical-align` | 行内级/表格单元对齐 | 对普通块无效 |
| `line-height` | 影响行盒高度 | 不是固定元素高度 |
| `getClientRects()` | 获取行内片段盒 | 一段文本可有多个 rect |
| `getBoundingClientRect()` | 获取联合边界 | 不显示 margin 折叠过程 |

## 6. 最小可运行案例

创建 `practice/css-03-02/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>常规流与 BFC 观察台</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; }
    .stack { border: 2px solid #718078; padding-inline: 1rem; }
    .first { margin-block: 0 24px; background: #e4efe7; }
    .second { margin-block: 16px 0; background: #f4eee7; }
    .float-demo { margin-block-start: 2rem; border: 2px solid #185c3b; }
    .float-demo::before {
      content: "";
      float: inline-start;
      inline-size: 6rem;
      block-size: 6rem;
      margin-inline-end: 1rem;
      background: #bdd4c4;
    }
    output { display: block; margin-block-start: 1rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>常规流与 BFC 观察台</h1>
    <section class="stack">
      <p class="first">下外边距 24px。</p>
      <p class="second">上外边距 16px。</p>
    </section>
    <section class="float-demo"></section>
    <output id="report"></output>
  </main>
  <script>
    const first = document.querySelector(".first").getBoundingClientRect();
    const second = document.querySelector(".second").getBoundingClientRect();
    const floatBox = document.querySelector(".float-demo").getBoundingClientRect();
    document.querySelector("#report").textContent = [
      `段落实际间隔：${(second.top - first.bottom).toFixed(1)}px`,
      `只有浮动内容的父级边框盒高度：${floatBox.height.toFixed(1)}px`
    ].join("\\n");
  </script>
</body>
</html>
```

两个正外边距折叠，间距应为 24px，不是 40px。`.float-demo` 没有普通流内容与 padding，高度只剩边框；给它添加 `display: flow-root` 后，BFC 包含浮动，高度约为浮动 96px 加边框。

逐步扩展：

1. 给 stack 增加 `row-gap` 不会对普通 block stack 自动生效，说明 gap 依赖布局模式；
2. 把第二段上 margin 改为 `-8px`，按正负规则推导；
3. 给 float-demo 添加 flow-root，记录高度变化；
4. 改用 `overflow: hidden` 比较包含浮动与裁剪副作用，再恢复 flow-root。

## 7. 邻里集市集成案例

创建 `practice/css-03-02/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市常规流卡片</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font: 1rem/1.65 system-ui, sans-serif; color: #26352d; }
    .market { inline-size: min(46rem, 100% - 2rem); margin: 2rem auto; }
    .list { padding: 0; list-style: none; }
    .listing {
      display: flow-root;
      padding: 1rem;
      border: 1px solid #78877e;
      border-radius: .5rem;
    }
    .listing + .listing { margin-block-start: 1rem; }
    .thumb {
      float: inline-start;
      inline-size: 7rem;
      aspect-ratio: 1;
      margin: 0 1rem .5rem 0;
      background: #dce9e0;
      border: 1px solid #78917f;
    }
    .listing h2 { margin-block: 0 .5rem; }
    .listing p { margin-block: .5rem 0; }
    .price { color: #185c3b; font-weight: 700; }
    button { margin-block-start: 1rem; min-block-size: 2.75rem; font: inherit; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p>静态演示：色块代表缩略图位置，不是已加载的商品图片。</p>
    <ul class="list">
      <li class="listing">
        <div class="thumb" role="img" aria-label="折叠桌教学缩略图色块"></div>
        <h2>便携折叠桌</h2>
        <p>桌面有轻微使用痕迹，描述文字会自然环绕缩略图。</p>
        <p class="price" data-price-cents="7200">72.00 元</p>
        <button type="button">查看静态说明</button>
      </li>
      <li class="listing">
        <div class="thumb" role="img" aria-label="书架教学缩略图色块"></div>
        <h2>窄边四层书架</h2>
        <p>适合小空间，较短内容也不会让浮动跑出卡片边框。</p>
        <p class="price" data-price-cents="9600">96.00 元</p>
      </li>
    </ul>
    <output id="evidence"></output>
  </main>
  <script>
    const cards = [...document.querySelectorAll(".listing")];
    const contained = cards.every((card) => {
      const image = card.querySelector(".thumb").getBoundingClientRect();
      const box = card.getBoundingClientRect();
      return image.bottom <= box.bottom;
    });
    document.querySelector("#evidence").textContent =
      `两张卡片均包含浮动缩略图：${contained ? "是" : "否"}。`;
  </script>
</body>
</html>
```

列表 DOM 顺序就是标题、描述、价格和按钮的阅读顺序。float 只让后续行盒环绕色块，`flow-root` 让每张卡片建立独立 BFC 并包含浮动。卡片间距只由 `.listing + .listing` 单方向提供，避免上下 margin 共同维护。

## 8. 常见错误与排查路径

**明确错误示例：**

```html
<div class="card">
  <div class="thumb"></div>
  <div style="clear: both"></div>
</div>
```

额外空元素只为视觉清除浮动，污染结构；若忘记隐藏还可能引入高度或辅助技术噪音。

排查路径：

1. 在 Elements 确认 DOM/阅读顺序；
2. 给相关盒加临时 border/background 显示边界；
3. 判断元素属于普通流、浮动还是定位；
4. 检查 margin collapse 的边界条件与正负值；
5. 确认是否需要新 BFC，以及创建方式的副作用；
6. 复验父级高度、相邻浮动、缩放与键盘顺序。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 短描述商品的缩略图越过卡片下边框，与下一卡重叠 |
| 证据 | thumb bottom 大于 card bottom；thumb 为 float，父级无其他足够高的流内内容 |
| 原因 | 浮动不撑开普通块父级的自动高度，父级未建立包含它的 BFC |
| 修复 | 卡片使用 `display: flow-root`，不使用 hidden 裁剪或空清除元素 |
| 复验 | 两张卡的脚本检查均为包含；200% 缩放后边框仍包住内容 |

## 9. 课后题

1. 24px 下 margin 与 16px 上 margin 的相邻正值间距通常是多少？
2. 正 24px 与负 8px 折叠后是多少？
3. `overflow: hidden` 为什么能包含浮动却不是首选？
4. BFC 会改变 DOM 阅读顺序吗？
5. `vertical-align` 为什么不能垂直居中普通 block？

答案：

1. 24px，取最大正值。
2. 16px，最大正值加最小负值。
3. 它创建 BFC，但同时裁剪溢出，可能隐藏阴影、焦点和内容；flow-root 更直接。
4. 不会，它改变内部格式化边界，不改变 DOM。
5. 它作用于行内级盒与表格单元等特定上下文，不作用于普通块布局。

## 10. 实践练习

**基础**：把卡片段落统一为单方向 `margin-block-start` 间距。
验收：没有靠空元素间隔，首元素没有多余顶部空白。

**进阶**：创建一个有两行长文字的 inline 链接，用 `getClientRects()` 记录多个片段盒。
验收：解释联合边界与逐行片段差异，不固定行高裁切。

**故障注入**：删除卡片 flow-root 并缩短描述到一个字。
验收：先记录浮动越界，再恢复 flow-root；不得用固定 height 或 overflow hidden 掩盖。

## 11. 阶段验收

- [ ] 相邻 margin 的正值与正负值推导正确。
- [ ] 能列出父子 margin 不折叠的至少三类边界。
- [ ] 浮动前后父级高度有几何证据。
- [ ] 卡片使用 flow-root，未引入空清除元素。
- [ ] DOM、朗读和 Tab 顺序与视觉主流程一致。
- [ ] 320px、200% 缩放与短/长描述状态均通过。

## 12. 常见问题

**Margin collapse 是 bug 吗？**
不是，是块格式化上下文的既定布局机制。组件化代码可通过边界和单方向间距降低意外。

**能否给所有元素都加 flow-root？**
不应。新 BFC 会改变浮动交互和 margin 行为；只在组件需要独立格式化边界时使用。

**Float 已经过时了吗？**
用于整页布局已被 Flex/Grid 取代，但文本环绕媒体仍是有效用途。

**视觉调换顺序是否总是无障碍问题？**
当视觉主流程与 DOM/焦点顺序不一致时会造成认知困难。优先让 DOM 顺序正确，CSS 只做不改变任务顺序的布局。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Display Level 3](https://www.w3.org/TR/css-display-3/)
- [CSS 2.1：Normal flow](https://www.w3.org/TR/CSS21/visuren.html#normal-flow)
- [CSS 2.1：Collapsing margins](https://www.w3.org/TR/CSS21/box.html#collapsing-margins)
- [MDN：Block formatting context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_display/Block_formatting_context)
- [MDN：Mastering margin collapsing](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_box_model/Mastering_margin_collapsing)
- [MDN：float](https://developer.mozilla.org/en-US/docs/Web/CSS/float)

兼容边界：`flow-root` 已在现代浏览器稳定；逻辑 float 值和双值 display 语法仍需核对旧环境。屏幕阅读器、垂直书写模式与打印本次未实测。

## 我现在能做到什么

我能从常规流和 BFC 解释间距与浮动边界，用语义干净的结构修复组件，并保持阅读和焦点顺序。

## 单元导航

- 上一单元：[盒模型、内在尺寸与溢出](./01-box-model-intrinsic-sizing-overflow.md)
- 下一单元：[包含块、定位与堆叠上下文](./03-containing-block-position-stacking.md)
- 分卷目录：[CSS](../README.md)
