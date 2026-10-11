# 字体、视口、容器单位与数学函数：建立有边界的响应尺寸

## 任务卡

- **任务**：让商品摘要在字号缩放、移动视口和不同容器宽度中平稳变化。
- **产出**：`practice/css-02-02/minimal.html` 与 `practice/css-02-02/market.html`。
- **运行**：直接打开，用响应式模式调整视口与容器；再测试 200% 缩放。
- **完成证据**：单位参照表、三组边界尺寸、容器查询命中证据和故障记录。
- **边界**：视口模拟不能代替真实移动浏览器地址栏、键盘与安全区域测试。

## 1. 任务背景

只用固定像素会让设计难以适应用户字号和狭窄容器，只用 `vw` 又可能让大屏文字过大、窄屏过小。邻里集市的商品卡有时占整页，有时进入侧栏；组件应根据自己的可用空间变化，而不是猜整个窗口宽度。

CSS 数学函数可以表达“首选变化 + 明确上下界”。关键不是记公式，而是保证参与运算的类型可组合，并知道百分比或相对单位何时才能求值。

## 2. 学习目标

完成后你能：

1. 解释 `em/rem/ch/lh` 等字体相对单位的参照；
2. 区分传统、小型、大型和动态视口单位；
3. 创建查询容器并使用 `cqi` 等容器单位；
4. 用 `calc()`、`min()`、`max()`、`clamp()` 表达有边界尺寸；
5. 识别类型不兼容、循环依赖和无容器回退造成的失败。

## 3. 预备知识

先完成值阶段单元。保持 `html { font-size: 100%; }`，尊重用户默认字号。测试至少记录：CSS 视口宽度、浏览器缩放、根计算字号和容器内容宽度。

容器查询是渐进增强。基础样式必须在没有查询支持或没有合格容器时仍可读。不要为了启用查询随意给整个文档添加尺寸 containment；它会影响尺寸贡献。

## 4. 核心理论

字体相对单位：

- `rem` 参照根元素字号；根元素自己的 rem 按初始字号求值；
- `em` 用于 `font-size` 时参照父字号，用于多数其他属性时参照该元素字号；
- `ch` 近似字体数字 `0` 的 advance measure，不等于一个中文字宽；
- `lh` 参照元素行高，`rlh` 参照根行高；
- `cap`、`ic` 等依赖字体度量，缺失时有规范回退，兼容需测试。

嵌套 `font-size: 1.2em` 会逐层相乘。无单位 `line-height: 1.6` 继承的是因子，子元素可按自己的字号重新计算；继承固定长度可能挤压放大的子文字。

视口单位每个代表对应视口尺寸的 1%：

- `vw/vh` 与默认视口定义相关；
- `svh` 使用小型视口，适合确保内容在浏览器 UI 展开时仍放得下；
- `lvh` 使用大型视口；
- `dvh` 随动态 UI 展开收起变化，可能触发布局更新；
- `vi/vb` 按书写模式内联/块轴。

移动页面不要无条件用 `height: 100vh` 锁死内容。通常用 `min-height`，并允许内容增长；表单聚焦后的软键盘仍需真机验证。

容器查询流程：

```css
.host { container-type: inline-size; container-name: product; }
@container product (width >= 30rem) { ... }
```

`cqi/cqb/cqw/cqh` 分别相对查询容器轴或宽高。若找不到合格查询容器，容器单位会按小视口单位回退，不能假设为零。

数学函数：

- `calc(100% - 2rem)` 组合兼容类型；
- `min(70rem, 100% - 2rem)` 取最小候选；
- `max(2.75rem, 44px)` 可表达最低命中尺寸，但仍需结合内容；
- `clamp(1rem, .8rem + 1vw, 1.5rem)` 把首选值夹在上下界。

不能把无关类型相加，如 `calc(1s + 1px)`。乘除等 typed arithmetic 的新能力支持与序列化仍需查目标浏览器，不应在本章基础方案中依赖尚未覆盖的语法。

## 5. 元素、属性、API 或配置清单

| 项目 | 参照/作用 | 风险 |
| --- | --- | --- |
| `rem` | 根计算字号 | 根字号被强制改小会削弱用户偏好 |
| `em` | 父字号或自身字号 | 嵌套 font-size 可累乘 |
| `ch` | 字体 `0` 的度量 | 不是字符计数保证 |
| `svh/lvh/dvh` | 小/大/动态视口 | 真机浏览器 UI 与键盘需测试 |
| `container-type: inline-size` | 建立内联尺寸查询容器 | 引入 size containment 行为 |
| `container-name` | 命名查询容器 | 名称不是 DOM ID |
| `cqi` | 查询容器内联尺寸的 1% | 无合格容器时有回退规则 |
| `calc/min/max/clamp` | 组合或限制值 | 类型必须兼容，最终仍受布局约束 |
| `matchMedia()` | 脚本观察媒体条件 | 不用于读取 container query 结果 |
| `ResizeObserver` | 观察元素尺寸变化 | 回调中同步改尺寸可能形成循环 |

## 6. 最小可运行案例

创建 `practice/css-02-02/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>响应单位观察台</title>
  <style>
    * { box-sizing: border-box; }
    html { font-size: 100%; }
    body { margin: 0; font: 1rem/1.6 system-ui, sans-serif; }
    main { width: min(48rem, 100% - 2rem); margin: 2rem auto; }
    .host { container: sample / inline-size; border: 2px solid #718078; resize: horizontal; overflow: auto; }
    .sample {
      padding: clamp(.75rem, .5rem + 2cqi, 1.5rem);
      font-size: clamp(1rem, .8rem + 1cqi, 1.35rem);
      background: #e5f0e8;
    }
    @container sample (width >= 28rem) {
      .sample { border-inline-start: .5rem solid #4f8064; }
    }
    output { display: block; margin-block-start: 1rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>响应单位观察台</h1>
    <div class="host">
      <p class="sample">拖动容器右边缘；字号和间距只在边界内变化。</p>
    </div>
    <output id="report"></output>
  </main>
  <script>
    const host = document.querySelector(".host");
    const sample = document.querySelector(".sample");
    const output = document.querySelector("#report");
    const observer = new ResizeObserver(() => {
      const css = getComputedStyle(sample);
      output.textContent = [
        `容器宽：${host.getBoundingClientRect().width.toFixed(1)}px`,
        `字号：${css.fontSize}`,
        `内边距：${css.paddingTop}`,
        `根字号：${getComputedStyle(document.documentElement).fontSize}`
      ].join("\\n");
    });
    observer.observe(host);
  </script>
</body>
</html>
```

拖动容器时，`cqi` 首选项随容器变化，但 `clamp` 保证上下界。容器达到 28rem 后出现左边框。ResizeObserver 只读取并报告尺寸，不在回调中反复改写被观察元素，避免反馈循环。

逐步扩展：

1. 把 `cqi` 改为 `vw`，比较组件在相同容器、不同窗口中的行为；
2. 删除 `container`，观察容器查询不命中并记录基础样式仍可读；
3. 把字号改成嵌套 `1.2em`，增加两层容器观察累乘；
4. 在 200% 缩放下确认 clamp 的 rem 边界仍响应根字号。

## 7. 邻里集市集成案例

创建 `practice/css-02-02/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市响应商品卡</title>
  <style>
    * { box-sizing: border-box; }
    html { font-size: 100%; }
    body { margin: 0; font: 1rem/1.65 system-ui, sans-serif; color: #26352d; }
    .market {
      width: min(64rem, 100% - 2rem);
      min-block-size: 100svh;
      margin-inline: auto;
      padding-block: clamp(1rem, 4vw, 3rem);
    }
    .card-host { container: listing / inline-size; }
    .listing {
      padding: clamp(1rem, .75rem + 2cqi, 2rem);
      border: 1px solid #78877e;
      border-radius: .75rem;
      background: #fff;
    }
    .listing h2 { margin-block-start: 0; font-size: clamp(1.25rem, 1rem + 2cqi, 2rem); }
    .price { color: #185c3b; font-size: 1.25rem; font-weight: 700; }
    .actions { display: flex; flex-wrap: wrap; gap: .75rem; }
    button { min-block-size: 2.75rem; padding-inline: max(1rem, 2cqi); font: inherit; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
    @container listing (width >= 34rem) {
      .listing { display: grid; grid-template-columns: 1fr auto; gap: 0 2rem; }
      .listing .description, .listing .actions { grid-column: 1 / -1; }
      .price { align-self: start; margin-block-start: .2rem; }
    }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p>静态演示：按钮不发起真实预约。</p>
    <div class="card-host">
      <article class="listing">
        <h2>可折叠晾衣架</h2>
        <p class="price" data-price-cents="5500">55.00 元</p>
        <p class="description">适合阳台临时使用；容器变窄时标题、价格和操作自然换行。</p>
        <div class="actions">
          <button type="button">查看说明</button>
          <button type="button">模拟收藏</button>
        </div>
      </article>
    </div>
    <output id="evidence"></output>
  </main>
  <script>
    const host = document.querySelector(".card-host");
    const output = document.querySelector("#evidence");
    const observer = new ResizeObserver(() => {
      output.textContent =
        `商品容器宽 ${host.getBoundingClientRect().width.toFixed(1)}px；` +
        `视口宽 ${document.documentElement.clientWidth}px。`;
    });
    observer.observe(host);
  </script>
</body>
</html>
```

基础布局是单列；容器足够宽时才把标题和价格分列。若卡片进入侧栏，即使视口很宽，也会按自身容器保持单列。`min-block-size: 100svh` 提供最小页面高度但允许内容增长。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
.title { font-size: calc(1rem + 10%); }
.panel { height: 100vh; overflow: hidden; }
```

font-size 的百分比与 rem 可组合，但 `10%` 参照父字号，不是视口，表达式可能与设计意图不符；固定视口高度加隐藏溢出还会在放大和移动键盘下裁掉内容。

排查路径：

1. 写出每个单位的参照对象与轴；
2. 展开 `clamp(min, preferred, max)` 三个候选；
3. 检查参与 `calc` 的类型是否兼容；
4. 确认查询元素存在合格祖先容器且查询轴已建立；
5. 检查 min/max-content 与内容是否覆盖首选值；
6. 用 320px、200% 缩放、长文本和无容器状态复验。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 商品卡放入侧栏后仍使用宽屏双列 |
| 证据 | 原规则使用 `@media (width >= 60rem)`；视口宽但卡片容器仅 20rem |
| 原因 | 媒体查询观察视口，不能表达组件自身可用空间 |
| 修复 | 在宿主建立 inline-size 容器，用命名 `@container` 查询 |
| 复验 | 主栏 40rem 时双列，侧栏 20rem 时单列；DOM 顺序不变 |

## 9. 课后题

1. `1em` 在 `font-size` 与 `padding` 中通常分别参照什么？
2. `100dvh` 为什么可能在滚动时变化？
3. 没有合格查询容器时 `@container` 规则会怎样？
4. `clamp(1rem, 2vw, 2rem)` 的作用是什么？
5. `calc(1s + 1px)` 为什么无效？

答案：

1. font-size 中参照父字号；padding 中通常参照元素自己的计算字号。
2. 动态视口会随浏览器 UI 展开/收起改变，可能触发布局更新。
3. 查询不匹配，基础规则继续生效；容器单位另有小视口回退规则。
4. 首选 2vw，但结果不小于 1rem、不大于 2rem。
5. 时间与长度是不可相加的不同类型。

## 10. 实践练习

**基础**：将商品描述限制为 `max-inline-size: 60ch`，说明 ch 的参照与限制。
验收：不声称恰好 60 个汉字，长 URL 另有换行策略。

**进阶**：把同一卡片放入 22rem 和 40rem 两个宿主，复用同一 CSS。
验收：两者布局由容器宽决定，DOM 与组件 class 不分叉。

**故障注入**：删除 `container-type` 但保留 `@container`。
验收：记录查询不命中的证据；恢复容器后双列只在阈值以上出现。

## 11. 阶段验收

- [ ] 根字号 16px 与用户放大后，rem 边界均有记录。
- [ ] 320px、宽屏、200% 缩放和长文本四种状态可用。
- [ ] 能解释 svh、lvh、dvh 的差异与真机缺口。
- [ ] 容器查询关闭时基础布局仍可阅读和操作。
- [ ] 数学函数上下界可从 Computed/几何证据验证。
- [ ] ResizeObserver 没有尺寸写入反馈循环。

## 12. 常见问题

**`clamp()` 能替代所有断点吗？**
不能。它适合连续数值变化；布局结构变化、能力与偏好仍可能需要容器或媒体查询。

**为何不用 `62.5%` 根字号方便换算？**
它改变 rem 与用户默认字号的直观关系，且不能解决设计系统问题。本课程保持 100%，直接使用可读 rem。

**`100svh` 一定不会被软键盘遮挡吗？**
不能保证。虚拟键盘、浏览器策略和 Visual Viewport 行为需真机验证，页面还应允许滚动和聚焦项进入视野。

**容器查询会改变 DOM 吗？**
不会，只改变匹配规则。语义、焦点和阅读顺序仍来自 DOM。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/)
- [CSS Containment Level 3](https://www.w3.org/TR/css-contain-3/)
- [MDN：Viewport concepts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSSOM_view/Viewport_concepts)
- [MDN：Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [MDN：CSS value functions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Values_and_Units/CSS_Value_Functions)

兼容边界：现代视口单位、容器查询和容器单位需按目标 Safari、Firefox、Chromium 与 WebView 版本核对；打印、软键盘、折叠屏和安全区域未在本单元实机验证。基础布局不依赖这些增强特性。

## 我现在能做到什么

我能为字体、视口和容器建立清晰参照，用数学函数限制响应值，并为无容器或旧环境保留可读基础布局。

## 单元导航

- 上一单元：[值阶段、单位与百分比](./01-value-stages-units-percentages.md)
- 下一单元：[颜色空间、透明度与对比度](./03-color-spaces-transparency-contrast.md)
- 分卷目录：[CSS](../README.md)
