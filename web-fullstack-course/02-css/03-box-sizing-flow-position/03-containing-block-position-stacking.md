# 包含块、定位与堆叠上下文：先画参照树再调 z-index

## 任务卡

- **任务**：让商品角标相对卡片定位、筛选栏在正确容器内 sticky，并用原生对话框进入 top layer。
- **产出**：`practice/css-03-03/minimal.html` 与 `practice/css-03-03/market.html`。
- **运行**：通过本地 HTTP 或直接打开；滚动、Tab、打开和关闭对话框观察状态。
- **完成证据**：包含块表、堆叠上下文树、sticky 失败记录与 top-layer 截图。
- **边界**：超大 z-index 不能跨出祖先堆叠上下文，也不能可靠替代 top layer。

## 1. 任务背景

商品“已售”角标跑到页面右上角，通常不是 top/right 数字不对，而是卡片没有成为 absolute 的包含块。筛选栏 sticky 不动，常由滚动容器、inset 或可滚动空间决定。弹层被页头压住，则要先画堆叠上下文，而不是把 z-index 从 999 加到 999999。

定位包含两个独立问题：几何参照（包含块）与绘制顺序（堆叠上下文）。混在一起排查会导致错误修复。

## 2. 学习目标

完成后你能：

1. 说明 static、relative、absolute、fixed、sticky 的流中占位和参照；
2. 找到 absolute/fixed 元素实际包含块；
3. 列出 sticky 生效所需的滚动容器、inset 与空间条件；
4. 建立堆叠上下文树并解释 z-index 的局部性；
5. 区分普通堆叠与 dialog/popover 等 top layer。

## 3. 预备知识

需要理解常规流、滚动容器和盒尺寸。调试时在 Elements 中沿祖先检查 position、transform、filter、opacity、contain、isolation 和 overflow，不依据视觉嵌套猜测。

本单元不把 fixed/sticky 用作隐藏内容的手段。固定区域必须考虑缩放、软键盘、安全区域和小视口，且不能遮住键盘焦点。

## 4. 核心理论

定位方案：

- `static`：默认，inset 与 z-index 通常不按定位盒工作；
- `relative`：保留原流占位，再相对自身正常位置偏移，也可建立绝对定位后代的包含块；
- `absolute`：脱离常规流，相对最近建立绝对定位包含块的祖先定位；
- `fixed`：通常相对初始包含块/视口固定，但 transform、filter、perspective、部分 contain 等祖先可建立其包含块；
- `sticky`：先参与常规流，再相对最近具有滚动机制的祖先与其包含块按 inset 钳制。

绝对定位常见公式由 inset、margin 和尺寸共同求解。`top: 0; right: 0` 只有在包含块正确时才有意义。给卡片 `position: relative` 不会主动移动卡片，只是让它成为定位祖先并可能影响堆叠。

Sticky 生效至少检查：

1. 对应轴有非 auto inset，如 `inset-block-start: 0`；
2. 最近 overflow 非 visible/clip 的祖先是否就是预期滚动容器；
3. 容器是否真的有可滚动距离；
4. sticky 盒与包含块尺寸是否给它留下移动空间；
5. 祖先裁剪、表格结构和浏览器差异。

绘制顺序在堆叠上下文内比较。常见新上下文触发包括：

- 根元素；
- positioned 元素且 z-index 非 auto；
- fixed、sticky；
- opacity 小于 1；
- transform、filter、perspective 非 none；
- isolation: isolate；
- 部分 contain、will-change；
- Flex/Grid 项目有非 auto z-index。

子上下文作为整体参与父上下文。子元素 `z-index: 9999` 不能超过父上下文在外部的层级。负 z-index 也不能随意逃到祖先背景之后。

Top layer 是浏览器维护的独立层，如模态 `<dialog>`、显示的 popover 与全屏元素。它位于普通文档堆叠上下文之上，并有 `::backdrop`。优先使用原生能力，还可获得焦点管理、Esc 行为等平台支持；但仍需测试并提供标签。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 注意 |
| --- | --- | --- |
| `position` | 选择定位方案 | sticky/fixed 也会创建堆叠上下文 |
| `inset-*` | 定义逻辑轴偏移 | sticky 至少一侧需非 auto |
| `z-index` | 当前堆叠上下文内层级 | 不是全局整数排行榜 |
| `isolation: isolate` | 显式创建独立堆叠上下文 | 适合组件边界 |
| `transform/filter/opacity` | 视觉效果并可能建上下文/包含块 | 会改变 fixed 或绘制关系 |
| `overflow` | 建立滚动机制 | sticky 会关联最近滚动祖先 |
| `<dialog>` / `showModal()` | 进入模态 top layer | 非模态 `show()` 不进入同样模态状态 |
| `::backdrop` | 样式化 top-layer 背景层 | 不能承载唯一关闭操作 |
| `offsetParent` | 定位祖先线索 | 对 fixed、隐藏元素和现代布局有边界 |
| `elementFromPoint()` | 查看坐标最上层命中元素 | 受 pointer-events 与 top layer 影响 |

## 6. 最小可运行案例

创建 `practice/css-03-03/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>定位与堆叠观察台</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; }
    .stage { position: relative; min-height: 12rem; padding: 1rem; border: 2px solid #718078; }
    .badge { position: absolute; inset-block-start: .5rem; inset-inline-end: .5rem; padding: .25rem .5rem; background: #6b4435; color: white; }
    .context-a { position: relative; z-index: 1; margin-top: 2rem; padding: 2rem; background: #dce9e0; }
    .context-a span { position: relative; z-index: 9999; background: #185c3b; color: white; }
    .context-b { position: relative; z-index: 2; margin-top: -1rem; padding: 1rem; background: #e8d8ce; }
    output { display: block; margin-block-start: 1rem; }
  </style>
</head>
<body>
  <main>
    <h1>定位与堆叠观察台</h1>
    <section class="stage">
      <strong class="badge">角标</strong>
      <p>stage 是角标的定位包含块。</p>
      <div class="context-a"><span>子层 9999</span></div>
      <div class="context-b">兄弟上下文 2，仍可整体压住前者。</div>
    </section>
    <output id="report"></output>
  </main>
  <script>
    const badge = document.querySelector(".badge");
    const parent = badge.offsetParent;
    document.querySelector("#report").textContent =
      `角标 offsetParent：${parent.className}；` +
      `角标位置：${badge.getBoundingClientRect().top.toFixed(1)}, ` +
      `${badge.getBoundingClientRect().right.toFixed(1)}`;
  </script>
</body>
</html>
```

角标相对 `.stage` 定位。`.context-a` 是 z-index 1 的上下文，内部 9999 仍作为这个整体的一部分；`.context-b` 在同一父上下文为 2，可以压在前者之上。删除 stage 的 relative 后，角标会寻找其他包含块，通常跑向初始包含块。

逐步扩展：

1. 删除 `position: relative`，记录 offsetParent 与坐标变化；
2. 恢复后把 context-a 的 z-index 改为 3，确认整个上下文超过 context-b；
3. 只继续提高内部 span，确认无法改变外部排序；
4. 给祖先添加 transform，另建 fixed 子元素观察包含块改变，实验后撤销。

## 7. 邻里集市集成案例

创建 `practice/css-03-03/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市定位与对话框</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font: 1rem/1.65 system-ui, sans-serif; color: #26352d; }
    .market { inline-size: min(48rem, 100% - 2rem); margin-inline: auto; }
    .filters {
      position: sticky;
      inset-block-start: 0;
      z-index: 2;
      padding: .75rem;
      background: #eef5f0;
      border-block-end: 1px solid #78877e;
    }
    .content { min-block-size: 110vh; padding-block: 1rem 6rem; }
    .listing { position: relative; padding: 1rem; border: 1px solid #78877e; border-radius: .5rem; }
    .badge { position: absolute; inset-block-start: .75rem; inset-inline-end: .75rem; padding: .2rem .5rem; color: white; background: #6b4435; }
    .listing h2 { margin-block-start: 0; padding-inline-end: 4rem; }
    .price { color: #185c3b; font-weight: 700; }
    button { min-block-size: 2.75rem; padding-inline: 1rem; font: inherit; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
    dialog { max-inline-size: min(32rem, calc(100% - 2rem)); border: 2px solid #185c3b; border-radius: .5rem; }
    dialog::backdrop { background: rgb(20 30 24 / 55%); }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <div class="filters">筛选栏：滚动页面观察 sticky，静态演示不改变数据。</div>
    <div class="content">
      <article class="listing">
        <strong class="badge">已售</strong>
        <h2>手冲咖啡壶</h2>
        <p class="price" data-price-cents="4600">46.00 元</p>
        <p>角标相对商品卡，标题预留空间避免遮挡。</p>
        <button id="open-help" type="button">查看购买说明</button>
      </article>
    </div>
    <output id="evidence"></output>
  </main>
  <dialog id="help" aria-labelledby="help-title">
    <h2 id="help-title">购买说明</h2>
    <p>这是静态教学对话框，不会创建预约或付款。</p>
    <form method="dialog"><button value="close">关闭</button></form>
  </dialog>
  <script>
    const dialog = document.querySelector("#help");
    document.querySelector("#open-help").addEventListener("click", () => dialog.showModal());
    dialog.addEventListener("close", () => {
      document.querySelector("#evidence").textContent = "对话框已关闭，焦点应回到打开按钮。";
    });
  </script>
</body>
</html>
```

筛选栏 sticky 相对页面滚动；content 提供足够滚动距离。角标 absolute 脱离流，因此标题用内联末端 padding 留出空间，窄屏和长标题仍需检查。`showModal()` 把 dialog 放入 top layer，普通 z-index 不能压过它；表单 `method="dialog"` 提供无需网络的关闭。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
.sidebar { overflow: hidden; }
.filters { position: sticky; top: 0; }
.modal { position: fixed; z-index: 999999; }
```

sidebar 成为 sticky 关联的滚动机制祖先，但若它不滚动，sticky 看似失效；手写 fixed modal 仍可能受 transformed ancestor、堆叠上下文和焦点管理影响。

排查分两条链：

**几何链**：position → 实际包含块/滚动祖先 → inset → 可用移动空间 → 裁剪。
**绘制链**：逐祖先列出上下文触发 → 比较同一上下文中的层级 → 检查 top layer。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 筛选栏滚动页面时不粘住 |
| 证据 | 最近祖先设置 `overflow: hidden`，自身 scrollHeight 等于 clientHeight |
| 原因 | sticky 关联了该祖先的滚动机制，但祖先没有可滚动距离 |
| 修复 | 移除无必要 overflow，或让预期容器成为真实滚动容器并测试焦点 |
| 复验 | 页面滚动时筛选栏停在 inset 0；320px/200% 下不遮住目标焦点 |

## 9. 课后题

1. relative 元素是否离开常规流？
2. absolute 元素通常相对哪个祖先定位？
3. sticky 只写 `position: sticky` 为什么可能没有效果？
4. 子元素 z-index 9999 为什么可能压不过外部 z-index 2？
5. 模态 dialog 与普通 fixed 层的根本差异是什么？

答案：

1. 不离开，它保留原流占位，再相对正常位置偏移。
2. 最近建立相应绝对定位包含块的祖先；没有时使用初始包含块等规范回退。
3. 缺少非 auto inset、滚动距离、合适滚动祖先或移动空间。
4. 子元素被父堆叠上下文整体封装，外部先比较父上下文 1 与 2。
5. showModal 后 dialog 进入浏览器 top layer，并获得平台模态与焦点行为。

## 10. 实践练习

**基础**：给卡片角标分别测试有/无 positioned ancestor，记录 offsetParent。
验收：能从 DOM 解释坐标，不只说“跑偏”。

**进阶**：画出最小案例两个上下文及内部 span 的树。
验收：只通过提高父上下文层级改变外部排序，不把内部 z-index 当全局值。

**故障注入**：给 sticky 祖先添加 `overflow: hidden` 且不提供滚动。
验收：记录实际滚动祖先与尺寸；移除错误 overflow 后复验滚动、键盘与缩放。

## 11. 阶段验收

- [ ] 五种 position 的流中占位和参照均能说明。
- [ ] absolute 角标的 offsetParent 与预期一致。
- [ ] sticky 在真实滚动距离内生效，且不遮挡焦点和标题。
- [ ] 堆叠上下文树能解释内部 9999 的局限。
- [ ] dialog 可由按钮打开、Esc/关闭按钮关闭，焦点返回可观察。
- [ ] 真实移动软键盘、安全区域和屏幕阅读器缺口已明确记录。

## 12. 常见问题

**所有卡片都加 `position: relative` 可以吗？**
它常用于定位后代，但会形成定位元素并影响 z-index 行为。只在组件确有定位参照需求时添加。

**为什么 fixed 元素会跟着某个容器滚动？**
transform、filter、perspective 或特定 containment 祖先可为 fixed 建立包含块，使它不再相对初始包含块。

**z-index 不生效先加 position 吗？**
先识别元素参与的布局与上下文。Flex/Grid 项目在某些情况下无需 positioned 也可使用 z-index；机械加 position 可能创建更多复杂关系。

**dialog 是否自动完全无障碍？**
不是。原生能力提供重要基础，仍需标签、合理初始焦点、关闭方式、内容顺序和目标辅助技术验证。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Positioned Layout Level 3](https://www.w3.org/TR/css-position-3/)
- [CSS 2.1：Stacking contexts](https://www.w3.org/TR/CSS21/zindex.html)
- [CSS Position 4：Top Layer](https://www.w3.org/TR/css-position-4/#top-layer)
- [MDN：Layout and the containing block](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_display/Containing_block)
- [MDN：Stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Stacking_context)
- [MDN：dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)

兼容边界：基础定位广泛支持；sticky 在 overflow、表格和移动浏览器中仍需组合验证。dialog/top layer 在现代浏览器可用，但旧 WebView 可能需要经评估的 polyfill。Safari、Firefox、软键盘和屏幕阅读器未实测。

## 我现在能做到什么

我能分别追踪定位几何与绘制层级，找到包含块、滚动祖先和堆叠上下文，并在模态场景优先使用 top layer。

## 单元导航

- 上一单元：[常规流、格式化上下文与外边距](./02-normal-flow-formatting-contexts-margins.md)
- 下一单元：[04 字体、文本与视觉装饰章入口](../04-typography-decoration.md)
