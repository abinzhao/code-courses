# 背景、边框、阴影、滤镜与裁剪：装饰失效时信息仍在

## 任务卡

- **任务**：为商品卡叠加背景、圆角、阴影和角标形状，并验证关闭装饰后状态仍可理解。
- **产出**：`practice/css-04-03/minimal.html` 与 `practice/css-04-03/market.html`。
- **运行**：直接打开；切换“减少装饰”，模拟 forced-colors，并用 Tab 检查焦点。
- **完成证据**：背景层顺序图、裁剪/阴影边界、对比记录和装饰降级诊断。
- **边界**：滤镜与合成性能需目标设备测量；CSS 图形不承载唯一商品状态或操作名称。

## 1. 任务背景

邻里集市希望商品卡有柔和渐变、圆角、阴影和“已售”角标。若状态只画在伪元素或颜色里，关闭 CSS、强制颜色或裁剪不支持时信息会丢失。若为圆角直接 `overflow: hidden`，又可能裁掉焦点和阴影。

装饰的正确边界是：增强层级与品牌感，但结构、文本、对比和交互在装饰缺失时仍成立。

## 2. 学习目标

完成后你能：

1. 解释多重背景从前到后的绘制顺序及 origin/clip；
2. 区分 border、outline、box-shadow 和 filter drop-shadow；
3. 说明 border-radius 与 overflow 裁剪并非同一件事；
4. 评估 filter、backdrop-filter、clip-path、mask 的合成和兼容边界；
5. 为强制颜色、无阴影和不支持裁剪准备可读降级。

## 3. 预备知识

需要掌握颜色对比、盒模型、堆叠上下文与焦点。所有视觉实验都必须保留真实标题、价格、状态和按钮文本。不要用背景图片中的文字代替 DOM 文本。

本页用 CSS gradient 生成装饰，不依赖外部图片。生产图片应有 HTML 语义、尺寸和替代文本，不应只作为无法描述的 background。

## 4. 核心理论

元素背景绘制在边框之下。多个背景以逗号分隔，第一层最靠近观察者，最后一层最靠近 background-color：

```css
.card {
  background:
    linear-gradient(rgb(255 255 255 / 75%), rgb(255 255 255 / 75%)),
    radial-gradient(circle at top right, #cce3d3, transparent 55%),
    #fff;
}
```

每层可分别设置 image、position、size、repeat、origin 和 clip。`background-origin` 决定定位区域，`background-clip` 决定绘制裁剪区域。渐变是 image，不是 color。

边界工具：

- `border` 占据盒模型空间，可参与圆角；
- `outline` 通常不占布局空间，适合焦点，不应被同元素 overflow 裁剪但可能受祖先裁剪；
- `box-shadow` 按元素盒形状绘制，可多层，不影响布局尺寸；
- `filter: drop-shadow()` 按元素合成后的 alpha 轮廓投影，通常一个 filter 链还会建立堆叠上下文。

`border-radius` 圆化背景与边框，但不会自动裁掉所有后代。若要裁媒体，可把圆角放在专门 media wrapper 上并用 `overflow: clip/hidden`，不要裁整个可聚焦卡片。

`filter` 作用于元素合成结果及后代，如 blur、brightness、contrast。它可能创建新堆叠上下文、增加离屏合成成本并影响 fixed 包含块。`backdrop-filter` 处理元素背后的已绘制内容，需要透明背景才能看到效果；支持、性能和强制颜色都需回退。

`clip-path` 控制可见裁剪区域，通常不改变布局盒和文本流，也不应假设自动改变命中或无障碍树的所有行为。`mask` 用 alpha/亮度控制可见度，语法和前缀历史更复杂。任何被裁掉的真实内容仍可能存在于 DOM，因此不能用裁剪实现权限隐藏。

阴影、渐变和滤镜可能在强制颜色中被移除。焦点必须有 outline 等清晰边界，状态必须有真实文本，组件边界可用 border 作为基线。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 边界 |
| --- | --- | --- |
| `background-*` | 多层背景、定位、尺寸、裁剪 | 第一层绘制在最上方 |
| `border` / `border-radius` | 占位边界与圆角 | radius 不等于后代裁剪 |
| `outline` | 非布局轮廓 | offset 与祖先裁剪需检查 |
| `box-shadow` | 盒形内/外阴影 | 不计入滚动/布局尺寸保证 |
| `filter` | 处理元素合成结果 | 建上下文、性能和包含块影响 |
| `backdrop-filter` | 处理背后内容 | 需要回退和透明表面 |
| `clip-path` | 裁剪可见区域 | 不应用于隐藏敏感信息 |
| `mask-*` | alpha/亮度遮罩 | 兼容与前缀需核对 |
| `forced-color-adjust` | 控制强制颜色调整 | `none` 只在必要且自行提供可读色时用 |
| `CSS.supports()` | 检查语法支持 | 不证明性能与可访问性 |

## 6. 最小可运行案例

创建 `practice/css-04-03/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>视觉装饰观察台</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; color: #26352d; }
    .sample {
      max-inline-size: 28rem;
      padding: 1rem;
      border: 2px solid #587163;
      border-radius: 1rem;
      background:
        linear-gradient(135deg, rgb(255 255 255 / 82%), rgb(255 255 255 / 55%)),
        radial-gradient(circle at 90% 10%, #acd0b8, transparent 45%),
        #eef5f0;
      box-shadow: 0 .5rem 1.5rem rgb(23 51 35 / 18%);
    }
    .shape {
      inline-size: 5rem;
      aspect-ratio: 1;
      background: #185c3b;
      clip-path: polygon(50% 0, 100% 100%, 0 100%);
    }
    button { min-block-size: 2.75rem; font: inherit; }
    button:focus-visible { outline: 3px solid #175ca2; outline-offset: 4px; }
    .plain .sample { background: white; box-shadow: none; }
    .plain .shape { clip-path: none; }
  </style>
</head>
<body>
  <main>
    <h1>视觉装饰观察台</h1>
    <section class="sample">
      <div class="shape" aria-hidden="true"></div>
      <h2>真实标题仍在 DOM 中</h2>
      <p>三角形只是装饰，关闭裁剪后信息不变。</p>
      <button id="toggle" type="button">切换减少装饰</button>
    </section>
    <output id="report"></output>
  </main>
  <script>
    const button = document.querySelector("#toggle");
    const output = document.querySelector("#report");
    button.addEventListener("click", () => {
      document.body.classList.toggle("plain");
      output.textContent =
        `减少装饰：${document.body.classList.contains("plain") ? "开启" : "关闭"}；` +
        `clip-path 支持：${CSS.supports("clip-path", "polygon(0 0, 100% 0, 50% 100%)")}`;
    });
  </script>
</body>
</html>
```

背景第一层白色透明渐变覆盖在径向绿色层之上，background-color 最后兜底。切换后背景、阴影和三角裁剪消失，但标题、说明和按钮仍可使用。Tab 聚焦按钮，outline 不依赖阴影。

逐步扩展：

1. 交换两个渐变顺序，观察前后覆盖；
2. 给 sample `overflow: hidden`，将 outline offset 加大，观察祖先/自身裁剪风险后撤销；
3. 把 box-shadow 改为 filter drop-shadow，观察形状轮廓与上下文；
4. 模拟 forced-colors，记录背景与阴影是否被替换。

## 7. 邻里集市集成案例

创建 `practice/css-04-03/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市装饰降级</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font: 1rem/1.65 system-ui, sans-serif; color: #26352d; background: #f7f8f7; }
    .market { inline-size: min(46rem, 100% - 2rem); margin: 2rem auto; }
    .listing {
      position: relative;
      isolation: isolate;
      padding: 1.25rem;
      border: 1px solid #708078;
      border-radius: .75rem;
      background:
        radial-gradient(circle at 100% 0, #d2e6d8 0 7rem, transparent 7.1rem),
        #fff;
      box-shadow: 0 .5rem 1.5rem rgb(25 55 38 / 14%);
    }
    .listing::before {
      content: "";
      position: absolute;
      z-index: -1;
      inset: .5rem;
      border-radius: .5rem;
      background: linear-gradient(120deg, transparent 55%, rgb(24 92 59 / 8%));
    }
    .status { font-weight: 700; color: #6b4435; }
    .status-mark { display: inline-block; inline-size: .75em; aspect-ratio: 1; margin-inline-end: .35em; background: currentColor; border-radius: 50%; }
    .price { color: #185c3b; font-size: 1.25rem; font-weight: 700; }
    button { min-block-size: 2.75rem; padding-inline: 1rem; border: 2px solid currentColor; border-radius: .35rem; background: #fff; color: #185c3b; font: inherit; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
    @media (forced-colors: active) {
      .listing { background: Canvas; box-shadow: none; border-color: CanvasText; }
      .listing::before, .status-mark { display: none; }
      .status, .price { color: CanvasText; }
    }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p>静态演示：渐变、阴影和圆点都不是状态的唯一来源。</p>
    <article class="listing">
      <h2>藤编收纳篮</h2>
      <p class="status"><span class="status-mark" aria-hidden="true"></span>已售，无法预约</p>
      <p>装饰关闭或强制颜色开启后，真实状态文字仍存在。</p>
      <p class="price" data-price-cents="2600">26.00 元</p>
      <button type="button" disabled>预约不可用</button>
    </article>
    <output id="evidence">基线边框、文本和原生 disabled 属性保持状态可辨识。</output>
  </main>
</body>
</html>
```

`isolation: isolate` 明确组件堆叠边界，让 z-index -1 的内部装饰留在卡片上下文，而不逃到页面背景后。禁用按钮有真实属性；圆点、棕色和阴影都只是增强。强制颜色中主动移除不必要装饰，保留系统文字与边框。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
.listing {
  overflow: hidden;
  filter: opacity(.45);
  border: 0;
}
.listing:focus-within { box-shadow: 0 0 0 3px green; }
```

整个卡片被淡化，边界只靠阴影；overflow 还可能裁掉 focus-within 阴影。强制颜色或低性能降级后，组件边界和焦点都会变弱。

排查路径：

1. 关闭 background-image、shadow、filter、clip/mask，检查信息是否仍完整；
2. 展开多层背景顺序与 alpha 后最终对比；
3. 检查 overflow 与 clip 是否裁掉焦点、popover、阴影；
4. 检查 filter/opacity 是否作用于全部后代并创建上下文；
5. 模拟 forced-colors、减少透明和低端设备；
6. 保留 border、outline、真实文本和语义状态作为基线。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 键盘进入卡片按钮时看不到完整焦点环 |
| 证据 | 卡片 overflow hidden；outline/box-shadow 超出圆角边界部分被裁 |
| 原因 | 为裁媒体给整个交互卡片设置溢出裁剪 |
| 修复 | 只在媒体 wrapper 上裁剪；卡片保留 overflow visible 与独立 outline |
| 复验 | 圆角媒体仍正确，按钮焦点四边可见，强制颜色下有系统轮廓 |

## 9. 课后题

1. 多重 background 中哪一层绘制在最上面？
2. border-radius 是否自动裁剪所有后代？
3. box-shadow 与 drop-shadow 的轮廓依据有何差异？
4. clip-path 能否作为权限隐藏手段？
5. 为什么状态不能只用颜色或伪元素图形？

答案：

1. 列表中的第一层最上，background-color 在最底。
2. 不一定；要裁后代还需 overflow/clip-path 等，但应限定到合适 wrapper。
3. box-shadow 基于盒形状，drop-shadow 基于合成后的 alpha 轮廓。
4. 不能，内容仍在 DOM/可访问树或可被检查，权限必须由后端控制。
5. 装饰可能不加载、被强制颜色替换或无法被辅助技术理解。

## 10. 实践练习

**基础**：添加两层背景并画出从上到下顺序。
验收：关闭任一层后仍有 background-color 与可读文本。

**进阶**：为媒体 wrapper 添加圆角裁剪，卡片本身保留可见 overflow。
验收：媒体不越界，按钮 outline 不被裁，弹层不受无关裁剪。

**故障注入**：给整卡添加 filter opacity 和 overflow hidden。
验收：记录对比与焦点退化；移除整卡效果，改为局部背景/媒体 wrapper 后复验。

## 11. 阶段验收

- [ ] 多重背景、border、outline、shadow 的绘制职责能说明。
- [ ] 关闭装饰后标题、价格、状态和操作完整。
- [ ] 强制颜色模拟中组件边界和焦点清晰。
- [ ] 没有用 clip/mask/opacity 隐藏敏感数据或唯一状态。
- [ ] filter 与 isolation 创建的上下文有记录。
- [ ] 低端设备性能、Safari/Firefox 和真实高对比模式未验证项明确。

## 12. 常见问题

**能否用 background 放商品图？**
纯装饰图可以；承载商品信息的图应使用有语义的 img/picture 和替代文本。

**阴影是否计入元素尺寸？**
不计入布局盒，可能绘制到外部并被祖先裁剪。

**`backdrop-filter` 不支持怎么办？**
提供足够不透明且对比合格的基础背景，把模糊当增强；不能让文字可读性依赖模糊。

**`will-change: filter` 能提高所有页面性能吗？**
不能。它可能提前分配合成资源，长期滥用增加内存；只在测量证明且短期需要时使用。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Backgrounds and Borders Level 3](https://www.w3.org/TR/css-backgrounds-3/)
- [CSS Filter Effects Level 1](https://www.w3.org/TR/filter-effects-1/)
- [CSS Masking Level 1](https://www.w3.org/TR/css-masking-1/)
- [MDN：Using multiple backgrounds](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_backgrounds_and_borders/Using_multiple_backgrounds)
- [MDN：filter](https://developer.mozilla.org/en-US/docs/Web/CSS/filter)
- [MDN：clip-path](https://developer.mozilla.org/en-US/docs/Web/CSS/clip-path)

兼容边界：背景、边框和基础阴影广泛支持；`backdrop-filter`、mask、复杂 clip-path、强制颜色与合成性能需目标环境验证。真实低端设备、Safari、Firefox 和屏幕阅读器未运行。

## 我现在能做到什么

我能分层组织背景和边界，识别滤镜、裁剪与堆叠副作用，并保证所有装饰移除后关键文本、状态和焦点仍然成立。

## 单元导航

- 上一单元：[换行、国际化与可读性](./02-line-breaking-i18n-readability.md)
- 下一单元：[05 Flexbox 章首课](../05-flexbox/01-axes-wrapping-alignment.md)
- 分卷目录：[CSS](../README.md)
