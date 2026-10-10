# 值阶段、单位与百分比：先写出参照物再调尺寸

## 任务卡

- **任务**：追踪商品卡尺寸从源码到绘制的变化，并解释多个 `50%` 为何结果不同。
- **产出**：`practice/css-02-01/minimal.html` 与 `practice/css-02-01/market.html`。
- **运行**：直接打开；用 Computed、盒模型图和 `getBoundingClientRect()` 记录结果。
- **完成证据**：一张四阶段值表、三个百分比参照说明及一份高度失效诊断。
- **边界**：几何 API 的结果受缩放、滚动条和子像素舍入影响，不能当作跨设备固定物理尺寸。

## 1. 任务背景

设计稿说“卡片宽 50%、图片高 50%、向右移动 50%”，三个百分比看似相同，却可能分别参照包含块宽度、确定高度和元素自身宽度。若不先确定属性语法、值阶段和参照物，只会反复试数。

邻里集市还要允许用户放大文字。单位选择必须服务内容、缩放和布局关系，而不是把 `px` 或 `rem` 绝对化为好坏标签。

## 2. 学习目标

完成后你能：

1. 区分声明值、层叠值、指定值、计算值、使用值和实际值；
2. 判断数字、整数、长度、百分比、角度、时间等类型是否被属性接受；
3. 解释 CSS px、物理像素和设备像素比的差异；
4. 为 width、height、padding、font-size、translate 的百分比指出参照物；
5. 用 Computed 与几何 API 诊断“值合法但结果不符合预期”。

## 3. 预备知识

需要掌握声明解析与层叠。先在 DevTools 中区分 Styles 的源码值、Computed 的规范化结果和 Layout/盒模型的使用尺寸。浏览器缩放保持在已知比例，并记录根字号。

本课程默认文档使用水平书写模式；逻辑方向和垂直书写模式在响应式章节继续展开。百分比规则以具体属性规范为准，不能建立“百分比总是相对父级”的万能口诀。

## 4. 核心理论

一个属性的值会经历多个阶段：

1. **声明值**：所有已解析声明；
2. **层叠值**：层叠获胜的声明值；
3. **指定值**：补上继承或初始值后的结果；
4. **计算值**：解析继承、相对值和部分函数后可传给子元素的值；
5. **使用值**：布局获得包含块、字体和可用空间后求出的具体值；
6. **实际值**：设备绘制能力、子像素和舍入作用后的结果。

开发者工具常把“Computed”作为综合观察入口，不保证每个显示项都严格等同规范术语中的 computed value。几何 API 更接近布局后的 CSS 像素尺寸。

值有类型，属性规定接受范围：

```css
.card {
  width: 20;          /* 非零长度缺单位，声明无效 */
  opacity: .8;        /* number 合法 */
  padding: -1rem;     /* padding 不接受负长度 */
  margin: -1rem;      /* margin 可接受负长度 */
  transition-duration: 0s;
}
```

CSS px 是参考像素，不保证对应一个设备物理像素。设备像素比、操作系统缩放和浏览器缩放都会影响绘制。`cm`、`mm`、`in` 在屏幕上也不保证与现实尺子完全一致；打印场景另行校准。

常见百分比参照：

| 属性 | 常见参照 |
| --- | --- |
| `inline-size/width` | 包含块对应轴的尺寸 |
| `block-size/height` | 包含块对应轴的确定尺寸；auto 链可能无法解析为期望比例 |
| 普通块 `padding` / `margin` 百分比 | 包含块的内联尺寸 |
| `font-size` | 父元素计算字号 |
| `translate: 50%` | 元素自己的参考盒尺寸 |
| `border-radius: 50%` | 元素自身横纵尺寸 |

`auto`、`none`、`normal` 是属性定义的关键词，没有跨属性统一数值含义。`width: auto` 不是零，`height: auto` 也不是“自动继承父高”。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 观察点 |
| --- | --- | --- |
| `px` | CSS 参考像素 | 与设备物理像素不一一对应 |
| `rem` / `em` | 根字号 / 相关字体尺寸 | `em` 在 font-size 与其他属性上的参照不同 |
| `%` | 属性定义的相对值 | 必须逐属性写参照 |
| `auto` | 属性特定的自动算法 | 不可统一替换成 0 或 100% |
| `min-*` / `max-*` | 约束使用尺寸 | 可能改变 width/height 的最终结果 |
| `box-sizing` | 规定声明尺寸覆盖 content 还是 border box | 第 3 章完整推导 |
| `getComputedStyle()` | 读取计算结果的序列化表示 | 不一定给出最终几何尺寸 |
| `getBoundingClientRect()` | 读取视口坐标中的边框盒 | 包含变换，值可能带小数 |
| `devicePixelRatio` | CSS 像素与设备像素关系线索 | 不是所有缩放场景的完整解释 |

## 6. 最小可运行案例

创建 `practice/css-02-01/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>百分比参照观察台</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; }
    .frame { width: 20rem; max-width: 100%; border: 2px solid #687870; }
    .sample {
      width: 50%;
      min-height: 4rem;
      padding-block: 1rem;
      padding-inline: 10%;
      background: #dcebe1;
      translate: 50% 0;
    }
    output { display: block; margin-block-start: 1rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>百分比参照观察台</h1>
    <div class="frame">
      <div class="sample">宽度、内边距与位移使用不同参照。</div>
    </div>
    <output id="report"></output>
  </main>
  <script>
    const frame = document.querySelector(".frame");
    const sample = document.querySelector(".sample");
    const css = getComputedStyle(sample);
    document.querySelector("#report").textContent = [
      `包含块边框盒：${frame.getBoundingClientRect().width.toFixed(2)}px`,
      `元素边框盒：${sample.getBoundingClientRect().width.toFixed(2)}px`,
      `计算 width：${css.width}`,
      `计算 padding-inline-start：${css.paddingInlineStart}`,
      `设备像素比：${window.devicePixelRatio}`
    ].join("\\n");
  </script>
</body>
</html>
```

默认 `frame` 外宽约 320px，内容宽受边框影响；`.sample` 的 width 以包含块内容宽为参照。由于全局 `border-box`，其横向 padding 包含在 50% 内。`translate: 50%` 再按元素自己的参考盒移动。结果带小数是合法现象。

逐步扩展：

1. 注释 `box-sizing`，记录元素总宽变化；
2. 把 `padding-inline` 改为 `10px`，区分相对与绝对长度；
3. 把 frame 改为 `width: 73%`，缩放视口并记录子像素；
4. 在系统或浏览器中放大字号，比较 px 宽度与 rem 宽度的响应。

## 7. 邻里集市集成案例

创建 `practice/css-02-01/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市尺寸证据</title>
  <style>
    * { box-sizing: border-box; }
    html { font-size: 100%; }
    body { margin: 0; font: 1rem/1.65 system-ui, sans-serif; color: #26352d; }
    .market { width: min(44rem, 100% - 2rem); margin: 2rem auto; }
    .listing { padding: 5%; border: 1px solid #78877e; border-radius: .5rem; }
    .summary { max-inline-size: 38rem; }
    .price { color: #185c3b; font-size: 1.25rem; font-weight: 700; }
    .meter { width: 100%; height: 1rem; background: #e5e9e6; }
    .meter > span { display: block; width: 65%; height: 100%; background: #4f8064; }
    button { min-block-size: 2.75rem; padding-inline: 1rem; font: inherit; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p>静态演示：库存条只是视觉样例，不代表实时库存。</p>
    <article class="listing">
      <h2>家庭工具箱</h2>
      <p class="summary">包含锤子、卷尺和常用螺丝刀，长文本会自然换行。</p>
      <p class="price" data-price-cents="6800">68.00 元</p>
      <p id="stock-label">演示库存：65%</p>
      <div class="meter" role="img" aria-labelledby="stock-label"><span></span></div>
      <p><button type="button">查看静态说明</button></p>
    </article>
    <output id="evidence"></output>
  </main>
  <script>
    const card = document.querySelector(".listing");
    const meter = document.querySelector(".meter > span");
    document.querySelector("#evidence").textContent =
      `卡片宽 ${card.getBoundingClientRect().width.toFixed(1)}px；` +
      `库存条宽 ${meter.getBoundingClientRect().width.toFixed(1)}px。`;
  </script>
</body>
</html>
```

价格数据通过 `data-price-cents="6800"` 表明整数分概念，显示文本只是静态格式化。卡片 padding 的百分比按包含块内联尺寸计算；库存条 65% 以 `.meter` 内容宽为参照。真实库存必须来自业务数据并提供文本，不由 CSS 宽度反推。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
.viewport { height: auto; }
.picture { height: 50%; }
```

若包含块的块轴尺寸不确定，子元素百分比高度不能得到设计者想象的“父内容一半”。它可能表现为 auto 或由其他规则决定。

排查：

1. 确认声明语法有效；
2. 写出属性的百分比参照轴；
3. 找到实际包含块，而不是最近视觉容器；
4. 判断参照尺寸是否确定；
5. 检查 min/max、box-sizing、内容最小尺寸是否施加约束；
6. 用盒模型与几何 API 复验。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 商品图片 `height: 50%` 没有得到卡片一半高度 |
| 证据 | Computed 显示卡片 height 为 auto，布局面板无确定块轴尺寸 |
| 原因 | 百分比高度的参照尺寸不确定，内容高度不能反向提供所需比例 |
| 修复 | 若需求是比例媒体，改用 `aspect-ratio`；若确需父高比例，先建立明确高度约束 |
| 复验 | 调整视口与长文本后比例仍稳定，内容没有被固定高度裁切 |

## 9. 课后题

1. `width: 20` 为什么无效而 `opacity: .8` 有效？
2. CSS 1px 是否总等于一个屏幕物理像素？
3. 普通块的 `padding-top: 10%` 通常参照哪个尺寸？
4. `translate: 50%` 通常参照父元素还是元素自身？
5. 为什么 Computed 中的值不一定等于最终绘制的设备像素？

答案：

1. width 要求长度或其他允许类型，非零无单位数字不符合；opacity 接受 number。
2. 不是，CSS px 是参考像素，受设备像素比与缩放影响。
3. 包含块的内联尺寸，在水平书写模式通常表现为宽度。
4. 元素自身的变换参考盒。
5. 布局、子像素舍入、设备映射和绘制能力还会影响使用值到实际值。

## 10. 实践练习

**基础**：把集成页卡片 padding 从百分比改为 `1rem`，记录窄屏和宽屏差异。
验收：能说明两种值各自参照，不只比较“好看”。

**进阶**：为商品媒体添加 `aspect-ratio: 4 / 3` 和 `max-inline-size: 100%`。
验收：长文本、320px 和 200% 缩放下不裁切，比例无需百分比高度。

**故障注入**：设置父级 `height: auto`、子级 `height: 50%` 并期待固定比例。
验收：用 Computed 与布局证据证明参照不确定，再用 aspect-ratio 或明确约束修复。

## 11. 阶段验收

- [ ] 值阶段表能落到最小案例的具体属性。
- [ ] 三个百分比都写明参照，不使用“相对父级”笼统结论。
- [ ] 记录浏览器缩放、根字号、视口宽度和 devicePixelRatio。
- [ ] 集市价格保留整数分数据概念，库存有文本替代。
- [ ] 320px 与 200% 缩放下无关键内容重叠或裁切。
- [ ] 故障记录五项齐全，修复未引入固定高度内容裁切。

## 12. 常见问题

**是不是应该全部使用 rem？**
不是。单位要匹配关系：字体与间距可尊重根字号，细边框可用 px，组件比例可用百分比或弹性布局。统一单位不能消除参照差异。

**为什么 `getBoundingClientRect()` 包含 translate？**
它返回变换后的视口几何边界；若要分析布局前尺寸，还需结合 Computed、offset 系列和布局面板。

**负 margin 合法是否意味着应该常用？**
合法不等于合适。它会改变几何关系，必须有明确布局目的并测试内容、缩放和交互命中。

**可以用 CSS 宽度表达真实库存吗？**
可以呈现已验证数据，但不能把视觉宽度当数据源。真实数值仍需文本和应用状态。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/)
- [CSS Cascading：Value Processing](https://www.w3.org/TR/css-cascade-5/#value-stages)
- [CSS Box Sizing Level 3](https://www.w3.org/TR/css-sizing-3/)
- [MDN：CSS values and units](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Values_and_units)
- [MDN：getBoundingClientRect()](https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect)

兼容边界：基础长度和百分比已广泛支持；逻辑尺寸、几何序列化和子像素结果仍可能跨引擎不同。Safari、Firefox、打印与真实高密度设备本次未运行。

## 我现在能做到什么

我能沿值处理阶段定位尺寸问题，为相对值写出准确参照，并用计算值和几何证据验证，而不是靠反复试数。

## 单元导航

- 上一单元：[章入口](../02-values-colors-units.md)
- 下一单元：[字体、视口、容器单位与数学函数](./02-font-viewport-container-math.md)
