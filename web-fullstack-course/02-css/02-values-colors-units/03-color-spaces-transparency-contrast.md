# 颜色空间、透明度与对比度：验证最终像素组合

## 任务卡

- **任务**：为邻里集市建立带 sRGB 回退的品牌色，并计算两组文字的 WCAG 对比度。
- **产出**：`practice/css-02-03/minimal.html` 与 `practice/css-02-03/market.html`。
- **运行**：直接打开；用 Styles、Computed、系统强制颜色模拟和页面报告观察结果。
- **完成证据**：回退顺序、两组对比度数值、透明叠加说明及一次失败修复记录。
- **边界**：自动比值是规则证据之一，不替代真实显示器、色觉差异、强制颜色和辅助技术人工检查。

## 1. 任务背景

邻里集市需要品牌绿、状态色和半透明提示背景。颜色值不仅是十六进制：它有颜色空间、alpha、插值空间、显示设备和用户系统颜色等边界。文字看似深色，也可能因为父级 opacity 或背景图片而失去对比。

正确流程是先提供稳定回退，再渐进增强，最后验证组合后的前景与背景，而不是只审核源码中的单个色值。

## 2. 学习目标

完成后你能：

1. 区分命名色、十六进制、rgb、hsl 和现代感知颜色表示；
2. 解释 alpha 混合与元素 `opacity` 的影响范围；
3. 用后写合法声明提供现代颜色渐进增强；
4. 理解颜色插值空间会改变渐变或混色中间结果；
5. 计算普通文本与大文本的对比度并说明适用边界。

## 3. 预备知识

先掌握声明解析、层叠和值阶段。测试时关闭会改变页面颜色的扩展，记录系统明暗模式与浏览器。颜色取样必须指向最终渲染背景；若背景含图片、渐变或透明层，单一 CSS token 可能不足以代表最差区域。

本单元使用 WCAG 2.x 对比度作为可判定练习：普通文本至少 4.5:1，大文本至少 3:1；增强级别分别为 7:1 与 4.5:1。大文本的尺寸与粗细条件需按规范判断，不能把视觉上“看着大”当证据。

## 4. 核心理论

sRGB 常见语法：

```css
.sample {
  color: #185c3b;
  background: rgb(240 246 242 / 90%);
  border-color: hsl(145 28% 35%);
}
```

十六进制与 rgb 都可表达 sRGB；HSL 是对 sRGB 的另一种坐标表达，并不天然感知均匀。相同 lightness 数值的不同 hue 未必看起来同样明亮。

现代函数包括 `hwb()`、`lab()`、`lch()`、`oklab()`、`oklch()`、`color()` 等。OKLCH 更便于围绕感知亮度、色度和色相调整，但超出设备色域的颜色需要映射，跨引擎和设备可能得到不同实际结果。

回退利用 CSS 容错与源码顺序：

```css
.price {
  color: #185c3b;
  color: oklch(42% .09 151);
}
```

不认识后者的浏览器忽略它，保留前者；支持者采用后写值。也可以用 `@supports (color: oklch(...))` 集中增强。回退应视觉接近，不能只满足语法。

alpha 是颜色的一部分；它让前景与背后颜色合成。`opacity` 作用于整个元素及其合成后代：

```css
.disabled { opacity: .5; }
```

这样文字、边框和焦点都被淡化，并可能建立新的堆叠上下文。若只想要浅背景，使用带 alpha 的 background 颜色，不要淡化整个交互组件。

相对亮度与对比度简化流程：将 sRGB 通道归一化并线性化，按权重组合为相对亮度 `L`；较亮与较暗颜色的对比度为 `(L1 + 0.05) / (L2 + 0.05)`。alpha 必须先与实际背景合成，不能直接把八位十六进制当不透明色计算。

颜色不能作为状态唯一信号。已售还应有文字、图标或删除线等非颜色线索。系统强制颜色可能替换作者颜色，应使用语义结构、系统颜色和必要的 `forced-color-adjust` 谨慎适配。

## 5. 元素、属性、API 或配置清单

| 项目 | 用途 | 边界 |
| --- | --- | --- |
| `#rrggbb` / `rgb()` | sRGB 回退与 alpha | 设备最终显示仍受色彩管理影响 |
| `hsl()` / `hwb()` | 人类可读调整 | 不是感知均匀空间 |
| `lab/lch/oklab/oklch` | 现代感知颜色表示 | 色域映射与旧环境需核对 |
| `color()` | 指定颜色空间，如 display-p3 | 目标设备可能无法显示完整色域 |
| `color-mix()` | 在指定空间混色 | 插值空间会改变结果 |
| `currentColor` | 使用元素当前 color | 适合边框、图标跟随文本 |
| 系统颜色 | 跟随平台/强制颜色语义 | 外观由用户代理和系统决定 |
| `color-scheme` | 声明支持的系统明暗方案 | 不会自动设计所有作者颜色 |
| `prefers-color-scheme` | 查询用户明暗偏好 | 偏好不是身份或权限 |
| `forced-colors` | 查询强制颜色模式 | 模拟结果仍需真实系统验证 |

## 6. 最小可运行案例

创建 `practice/css-02-03/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>颜色与对比度观察台</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; }
    .sample {
      padding: 1rem;
      color: #185c3b;
      color: oklch(42% .09 151);
      background: #f0f6f2;
      border: 2px solid currentColor;
    }
    .bad { color: #8aa394; background: #f0f6f2; }
    output { display: block; margin-block-start: 1rem; white-space: pre-wrap; }
    @media (forced-colors: active) {
      .sample { color: CanvasText; background: Canvas; border-color: ButtonText; }
    }
  </style>
</head>
<body>
  <main>
    <h1>颜色与对比度观察台</h1>
    <p class="sample">候选一：品牌深绿文字。</p>
    <p class="sample bad">候选二：故意降低对比度的文字。</p>
    <output id="report"></output>
  </main>
  <script>
    function channel(value) {
      const x = value / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    }
    function luminance(rgb) {
      const [r, g, b] = rgb.map(channel);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    function contrast(a, b) {
      const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (light + 0.05) / (dark + 0.05);
    }
    const pass = contrast([24, 92, 59], [240, 246, 242]);
    const fail = contrast([138, 163, 148], [240, 246, 242]);
    document.querySelector("#report").textContent =
      `sRGB 回退组合：${pass.toFixed(2)}:1\\n` +
      `故意失败组合：${fail.toFixed(2)}:1`;
  </script>
</body>
</html>
```

脚本计算的是明确写出的不透明 sRGB 回退，不会自动解析 OKLCH 或透明背景。它用于验证可判定基线；实际采用的现代颜色还需浏览器工具或可处理对应颜色空间的审计工具检查。

逐步扩展：

1. 暂时删除 OKLCH 声明，确认 sRGB 回退视觉仍可用；
2. 在 Styles 中禁用 sRGB 但保留 OKLCH，记录支持环境的计算颜色；
3. 将 `.bad` 改为品牌深绿，确认报告与视觉都回到通过组合；
4. 用 DevTools 模拟 forced-colors，确认边框和文字仍有系统颜色区分。

## 7. 邻里集市集成案例

创建 `practice/css-02-03/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市颜色系统</title>
  <style>
    :root {
      color-scheme: light;
      --surface: #ffffff;
      --surface-muted: #eef5f0;
      --text: #25342c;
      --brand: #185c3b;
      --sold: #6b4435;
    }
    @supports (color: oklch(50% .1 150)) {
      :root {
        --surface-muted: oklch(96% .015 150);
        --text: oklch(30% .025 150);
        --brand: oklch(42% .09 151);
        --sold: oklch(42% .07 45);
      }
    }
    * { box-sizing: border-box; }
    body { margin: 0; font: 1rem/1.65 system-ui, sans-serif; color: var(--text); background: var(--surface); }
    .market { width: min(46rem, 100% - 2rem); margin: 2rem auto; }
    .notice { padding: .75rem 1rem; background: color-mix(in srgb, var(--brand) 10%, var(--surface)); }
    .listing { padding: 1rem; border: 1px solid color-mix(in srgb, var(--text) 35%, transparent); border-radius: .5rem; }
    .price { color: var(--brand); font-size: 1.25rem; font-weight: 700; }
    .status { color: var(--sold); }
    [data-status="sold"] .price { color: var(--sold); text-decoration: line-through; }
    button { color: CanvasText; background: ButtonFace; border: 2px solid ButtonText; padding: .65rem 1rem; font: inherit; }
    :focus-visible { outline: 3px solid Highlight; outline-offset: 3px; }
    @media (forced-colors: active) {
      .notice, .listing { background: Canvas; border-color: CanvasText; }
      .price, .status { color: CanvasText; }
    }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p class="notice">静态演示：颜色不是商品状态的唯一线索。</p>
    <article class="listing" data-status="sold">
      <h2>复古挂钟</h2>
      <p class="price" data-price-cents="3000">30.00 元</p>
      <p class="status"><strong>已售</strong>，无法预约。</p>
      <button type="button" disabled>预约不可用</button>
    </article>
    <output id="evidence">状态同时由文字、删除线、禁用控件和颜色表达。</output>
  </main>
</body>
</html>
```

先定义 sRGB token，再在支持环境用 OKLCH 覆盖。`color-mix()` 用于装饰性背景与边框；若产品要覆盖不支持它的旧环境，应在这些声明前补写不依赖混色的 background/border 回退。按钮使用系统颜色，禁用状态仍有真实属性与文字。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
.listing[aria-disabled="true"] {
  opacity: .35;
}
```

它会把标题、价格、边框和焦点整体淡化；`aria-disabled` 本身也不会阻止按钮操作。若是真按钮，优先用 `disabled` 并分别设计背景、文字和边框。

排查路径：

1. 确认最终前景和最差背景，而非只读变量名；
2. 展开 alpha 与祖先 opacity，得到合成后的颜色；
3. 检查背景图、渐变和悬浮/焦点/禁用状态；
4. 计算对比度并判断文本类别；
5. 检查状态是否还有非颜色线索；
6. 模拟明暗偏好与强制颜色，再记录真机缺口。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 禁用商品卡文字难以阅读，键盘焦点也很淡 |
| 证据 | 祖先 `.listing` 的 opacity 为 .35，所有后代一起合成 |
| 原因 | 用整元素透明度表达状态，降低了全部内容与轮廓对比 |
| 修复 | 删除祖先 opacity；用明确文本、disabled 属性、单独背景和前景色 |
| 复验 | 文本对比达到目标，禁用按钮不可激活，状态无需颜色也能理解 |

## 9. 课后题

1. HSL 的 lightness 相同是否保证感知亮度相同？
2. 为什么现代颜色声明通常写在 sRGB 回退之后？
3. alpha 背景的对比度应该与哪个颜色计算？
4. `opacity` 与 `rgb(... / alpha)` 的影响范围有何差别？
5. 达到 4.5:1 是否证明页面完全无障碍？

答案：

1. 不保证；HSL 不是感知均匀空间。
2. 不支持新语法的浏览器忽略后者并保留先前合法声明，支持者采用后写增强。
3. 与 alpha 合成后的实际背景；背景变化时要检查最差组合。
4. opacity 影响整个元素合成结果及后代；颜色 alpha 只参与该颜色与背后的混合。
5. 不能；还需检查字号分类、状态、焦点、强制颜色、色觉差异和辅助技术等。

## 10. 实践练习

**基础**：为“可预约”状态增加图标旁的真实文字，并保证关闭颜色后仍可理解。
验收：不依赖伪元素提供唯一状态。

**进阶**：用 sRGB 回退和 `@supports` 增强创建三档品牌 surface。
验收：每档都有明确前景组合和对比度记录，禁用增强后仍可读。

**故障注入**：对整张商品卡添加 `opacity: .35`。
验收：记录文字与焦点退化；删除 opacity，改为局部颜色并重新计算最差对比。

## 11. 阶段验收

- [ ] 两组不透明 sRGB 组合有可复算的比值。
- [ ] 现代颜色不可用时 sRGB 回退仍保持信息与对比。
- [ ] 已售状态至少有一项非颜色线索。
- [ ] Tab 焦点在普通与强制颜色模拟中均可辨识。
- [ ] 没有用祖先 opacity 淡化关键文本或控件。
- [ ] 明确记录 Safari、Firefox、真实强制颜色和广色域设备未验证。

## 12. 常见问题

**能否只用浏览器取色器验证对比度？**
取色器可辅助，但要确认采样位置、alpha、背景图和状态。关键组合应有可复算值并进行人工检查。

**`color-scheme: dark` 会自动把自定义背景变暗吗？**
不会。它影响表单控件、滚动条、系统颜色等 UA 呈现；作者颜色仍需完整设计。

**Display-P3 一定比 sRGB 更好吗？**
它能表达更宽色域，但并不自动提高对比或可访问性。需要设备、色彩管理、回退和品牌要求共同支持。

**何时使用 `currentColor`？**
图标、边框或装饰需要跟随文本状态时很合适；仍要确认不同状态的最终 color。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Color Module Level 4](https://www.w3.org/TR/css-color-4/)
- [CSS Color Module Level 5](https://www.w3.org/TR/css-color-5/)
- [WCAG 2.2：Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [MDN：CSS colors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_colors)
- [MDN：forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)

兼容边界：OKLCH、`color-mix()`、相对颜色和广色域支持随浏览器版本变化；本页只以 sRGB 回退作为可机械复算基线。真实强制颜色、HDR/P3 显示器、Safari 和 Firefox 未实测。

## 我现在能做到什么

我能为现代颜色提供稳定回退，区分颜色 alpha 与整元素透明度，并依据最终前景背景组合验证对比和非颜色线索。

## 单元导航

- 上一单元：[字体、视口、容器单位与数学函数](./02-font-viewport-container-math.md)
- 下一单元：[03 盒模型、常规流与定位章首课](../03-box-sizing-flow-position/01-box-model-intrinsic-sizing-overflow.md)
- 分卷目录：[CSS](../README.md)
