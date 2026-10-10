# 字体加载、回退与度量：把字形变化当作布局输入

## 任务卡

- **任务**：观察字体切换引起的宽度和换行变化，并建立无网络也可读的邻里集市字体策略。
- **产出**：`practice/css-04-01/minimal.html` 与 `practice/css-04-01/market.html`。
- **运行**：直接打开即可观察本地字体切换；网络字体诊断只按步骤记录，不下载字体文件。
- **完成证据**：family/face 回退链、切换前后几何值、Font Loading API 状态和失败诊断。
- **边界**：`local()` 结果依赖设备；本教程不捆绑字体、不把字体授权和子集化描述成已完成。

## 1. 任务背景

邻里集市选择品牌字体后，标题可能重新换行，按钮宽度和卡片高度也会变化。问题不是“字体晚一点变好看”这么简单：不同字体的字面、上升部、下降部、x-height 和字符 advance 不同，会影响内在尺寸与布局偏移。

字体加载必须有回退。用户可能断网、阻止第三方资源、没有某个本地字体，或在字体到达前已开始阅读。正确页面不能永久隐藏文本。

## 2. 学习目标

完成后你能：

1. 区分通用 family、family 列表与 `@font-face` 定义的具体 face；
2. 解释 weight/style/stretch 如何参与字体匹配与合成；
3. 说明 `font-display` 各阶段对可见性和替换的影响；
4. 使用 `size-adjust`、度量 override 等概念降低回退差异；
5. 用 CSS Font Loading API 与 Network 证据诊断加载失败。

## 3. 预备知识

需要理解内在尺寸、行盒和布局偏移的基本概念。测试时记录操作系统、浏览器、系统字体可用性和缓存状态。本页的 `local()` 只做无网络观察，不保证每台设备命中相同字体。

远程字体是独立资源，受 URL、MIME、CORS、CSP、缓存和许可证约束。生产使用前必须确认授权、格式、子集、隐私和性能策略；这些不由 CSS 语法自动解决。

## 4. 核心理论

`font-family` 是有序候选列表：

```css
body {
  font-family: "Market Sans", "PingFang SC", "Microsoft YaHei",
    system-ui, sans-serif;
}
```

浏览器会按字符寻找可提供字形的字体，同一行可能发生字体回退。通用 family 如 `serif`、`sans-serif`、`monospace` 的实际字体由平台和用户设置决定。

`@font-face` 把一个资源定义为 family 中的 face：

```css
@font-face {
  font-family: "Market Sans";
  src: url("./market-sans.woff2") format("woff2");
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
}
```

可变字体可由一个资源覆盖 weight/stretch/slant 轴范围，但文件是否包含这些轴必须查字体元数据。CSS 要求的 weight 不存在时，浏览器可能匹配最近 face 或合成粗体/斜体；可用 `font-synthesis` 控制不希望的合成，但要确保仍有清晰层级。

`font-display` 概念上控制 block、swap 和 failure 时段：

- `block`：短暂不可见替代，之后回退并可能换入；
- `swap`：极短 block，立即回退，资源到达后换入；
- `fallback`：短 block 与有限 swap；
- `optional`：浏览器可基于条件决定不换入。

它不是精确计时 API，各浏览器策略可不同。对正文，应避免长时间不可见文本。

降低布局偏移的方法：

1. 选择度量接近的回退字体；
2. 用 `size-adjust` 调整 face 的整体字形缩放；
3. 用 `ascent-override`、`descent-override`、`line-gap-override` 对齐行盒度量；
4. 给关键媒体而非文本容器预留合理空间；
5. 在真实语言、字号和字重下测量，不只看拉丁示例。

度量 descriptor 应来自目标字体与回退字体的实际分析，不能凭感觉抄百分比。错误 override 会裁字或制造新偏移。

CSS Font Loading API 提供 `document.fonts.check()`、`load()`、`ready` 与 loading 事件。`check()` 为 true 也不一定证明特定 URL 已下载，它回答给定字体描述是否可在不继续加载时使用；Network 与实际 face 仍需一起检查。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 边界 |
| --- | --- | --- |
| `font-family` | 定义有序回退 | 字符级回退可能混用字体 |
| `font-weight/style/stretch` | 选择 face 或可变轴 | 缺失 face 可能合成 |
| `font-display` | 控制加载期间显示策略 | 时间段由 UA 实现 |
| `size-adjust` | 调整该 face 字形轮廓与度量 | 需实测推导 |
| `ascent/descent/line-gap-override` | 覆盖 face 行盒度量 | 错值可裁字 |
| `font-variation-settings` | 低级设置可变轴 | 优先使用 weight/stretch 等高级属性 |
| `font-synthesis` | 控制合成粗/斜等 | 禁用前确认真实 face 覆盖 |
| `document.fonts` | FontFaceSet | 不替代 Network 和视觉检查 |
| `PerformanceObserver` | 观察 layout-shift 等性能条目 | 本地瞬时切换不等同真实加载 |

## 6. 最小可运行案例

创建 `practice/css-04-01/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>字体度量观察台</title>
  <style>
    @font-face {
      font-family: "Local Optional";
      src: local("Arial"), local("Helvetica");
      font-display: swap;
    }
    * { box-sizing: border-box; }
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; }
    .measure { max-inline-size: 24rem; padding: 1rem; border: 2px solid #718078; }
    .measure.alt { font-family: "Local Optional", Georgia, serif; }
    button { min-block-size: 2.75rem; font: inherit; }
    output { display: block; margin-block-start: 1rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>字体度量观察台</h1>
    <p class="measure">Neighborhood 邻里集市：不同字体可能改变这段文字的换行位置。</p>
    <button id="toggle" type="button">切换字体候选</button>
    <output id="report"></output>
  </main>
  <script>
    const text = document.querySelector(".measure");
    const output = document.querySelector("#report");
    function report() {
      const box = text.getBoundingClientRect();
      const css = getComputedStyle(text);
      output.textContent = [
        `实际 family：${css.fontFamily}`,
        `边框盒：${box.width.toFixed(1)} × ${box.height.toFixed(1)}px`,
        `本地候选可用：${document.fonts.check('16px "Local Optional"')}`
      ].join("\\n");
    }
    document.querySelector("#toggle").addEventListener("click", () => {
      text.classList.toggle("alt");
      requestAnimationFrame(report);
    });
    document.fonts.ready.then(report);
    report();
  </script>
</body>
</html>
```

点击后 family 列表和文本高度可能变化；具体值依赖平台字体。即使 `Local Optional` 不命中，Georgia 或 serif 回退仍显示文字。案例不发网络请求，因此不能把它当成远程字体性能验证。

逐步扩展：

1. 缩窄 `.measure`，让度量差异更容易触发换行；
2. 切换到 700 weight，观察实际 face 是否变化；
3. 在 DevTools Rendering 中观察布局偏移区域；
4. 临时把 local 名称改成不存在的值，确认后续回退继续可读。

## 7. 邻里集市集成案例

创建 `practice/css-04-01/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市字体回退</title>
  <style>
    @font-face {
      font-family: "Market Optional";
      src: local("Arial"), local("Helvetica");
      font-weight: 400 700;
      font-style: normal;
      font-display: optional;
    }
    *, *::before, *::after { box-sizing: border-box; }
    html { font-size: 100%; }
    body {
      margin: 0;
      font-family: "Market Optional", "PingFang SC", "Microsoft YaHei",
        system-ui, sans-serif;
      font-size: 1rem;
      line-height: 1.65;
      color: #26352d;
    }
    .market { inline-size: min(46rem, 100% - 2rem); margin: 2rem auto; }
    .listing { padding: 1rem; border: 1px solid #78877e; border-radius: .5rem; }
    .listing h2 { margin-block-start: 0; font-size: 1.5rem; line-height: 1.25; }
    .price { color: #185c3b; font-size: 1.25rem; font-weight: 700; }
    button { min-block-size: 2.75rem; padding-inline: 1rem; font: inherit; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
    output { display: block; margin-block-start: 1rem; overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p>静态演示：页面不依赖远程字体，候选不可用时使用系统回退。</p>
    <article class="listing">
      <h2>Neighborhood 可调节儿童阅读灯</h2>
      <p>中英混合标题用于观察字符级回退和换行，不代表已完成所有语言测试。</p>
      <p class="price" data-price-cents="3900">39.00 元</p>
      <button type="button">查看静态说明</button>
    </article>
    <output id="evidence"></output>
  </main>
  <script>
    document.fonts.ready.then(() => {
      const title = document.querySelector(".listing h2");
      const css = getComputedStyle(title);
      document.querySelector("#evidence").textContent =
        `字体集合已进入 ready；标题 family 列表：${css.fontFamily}；` +
        `标题高度：${title.getBoundingClientRect().height.toFixed(1)}px。`;
    });
  </script>
</body>
</html>
```

该页面把系统字体作为真实基线，`local()` 命中只是可选增强。没有 fixed height，因此字体与换行变化会扩展卡片，不裁切按钮。价格以整数分属性表达数据概念，字体只改变呈现。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
html { visibility: hidden; }
.fonts-loaded { visibility: visible; }
```

若字体请求失败或脚本未执行，整页可能永久不可见；这比短暂使用回退字体更严重。

远程字体排查：

1. Network 是否发出字体请求，URL/状态/MIME/CORS 是否正确；
2. @font-face family、weight、style、unicode-range 是否覆盖目标文本；
3. Computed/Rendered Fonts 实际用了哪个 face；
4. document.fonts 状态与 load promise 是否拒绝；
5. 切换前后文本 rect、layout shift 和可见性；
6. 断网、缓存清空、慢网与字体失败时页面是否仍可读。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 品牌字体未出现，但 Network 请求 200 |
| 证据 | Rendered Fonts 显示系统字体；请求 face 只声明 weight 700，而正文要求 400 |
| 原因 | 资源成功不等于 face 匹配，descriptor 未覆盖所需字重 |
| 修复 | 提供正确 400 face/可变范围，或接受明确系统回退；不伪造 weight |
| 复验 | 正文匹配目标 face；断网时立即显示系统回退且内容不裁切 |

## 9. 课后题

1. `font-family` 列表只会为整段选择一个字体吗？
2. `font-display: swap` 是否保证零布局偏移？
3. `document.fonts.ready` 是否证明所有声明过的字体 URL 都成功？
4. 为什么 fixed height 容器会放大字体切换风险？
5. 度量 override 的百分比可以凭目测填写吗？

答案：

1. 不会，浏览器可按字符回退，混合语言可能使用多个字体。
2. 不保证；swap 提高文字可见性，换入度量不同字体仍可能偏移。
3. 不证明，它表示文档所需字体加载与布局达到 ready 状态，仍需检查具体 face 和请求。
4. 新字体的行高或换行增大时内容可能被裁切或覆盖后续操作。
5. 不应，应由目标与回退字体真实度量及多语言测试推导。

## 10. 实践练习

**基础**：为标题建立至少三项系统回退，并记录 macOS/Windows 预期差异。
验收：列表以通用 family 结束，不声称每个平台字形一致。

**进阶**：用本机可用的两个字体切换，记录标题 width/height 和换行。
验收：不把瞬时本地切换冒充远程加载性能结论。

**故障注入**：把 @font-face 的 local 名称改成不存在值并移除后续回退。
验收：先记录失败，再恢复完整 family 链；任何状态下文字都不永久隐藏。

## 11. 阶段验收

- [ ] family、face、weight/style 匹配与字符级回退能分别解释。
- [ ] 切换前后几何尺寸有记录，页面无固定高度裁切。
- [ ] optional face 不可用时系统回退可读。
- [ ] 能列出远程字体的 URL、MIME、CORS、CSP 和许可边界。
- [ ] 200% 缩放与中英混合长标题可用。
- [ ] 未声称已验证真实网络字体、Safari、Firefox 或屏幕阅读器。

## 12. 常见问题

**是否应 preload 所有字体？**
不应。preload 只用于首屏确定需要的关键资源，过量会争抢带宽；URL、crossorigin 和实际 CSS 使用必须一致。

**WOFF2 是否足够？**
现代浏览器通常优先 WOFF2，但目标环境、许可与可变字体能力仍需基线核对。

**能用 `font-display: optional` 消除偏移吗？**
它允许浏览器在条件不佳时不换入，有助稳定，但不保证所有环境行为一致，也不替代度量匹配。

**系统字体栈是否完全一致？**
不一致，这是有意回退策略。目标是平台可读、性能稳定，不是像素级跨系统相同。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Fonts Level 4](https://www.w3.org/TR/css-fonts-4/)
- [CSS Font Loading Level 3](https://www.w3.org/TR/css-font-loading-3/)
- [MDN：@font-face](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face)
- [MDN：font-display](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display)
- [MDN：CSS Font Loading API](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Font_Loading_API)
- [web.dev：Optimize web fonts](https://web.dev/articles/optimize-webfont-loading)

兼容边界：`size-adjust` 与度量 override 在现代浏览器已有支持，但具体字体、脚本和引擎必须实测；local 名称不可作为跨设备保证。真实远程字体、慢网、Safari、Firefox 和屏幕阅读器未运行。

## 我现在能做到什么

我能把字体视为会改变内在尺寸的资源，建立可读回退、检查 face 匹配与加载证据，并避免以隐藏文本掩盖加载过程。

## 单元导航

- 上一单元：[章入口](../04-typography-decoration.md)
- 下一单元：[换行、国际化与可读性](./02-line-breaking-i18n-readability.md)
