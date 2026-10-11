# At-rule、函数与描述符：在正确语法上下文中使用 CSS 机制

## 任务卡

邻里集市代码审查中有人把 `font-display` 写到商品卡上，又把 `min()`、`@media` 和 WAAPI 都计入“CSS 属性”。本课建立语法分类表，并交付一个同时使用 layer、media、supports、container、property、keyframes、counter-style 与 page 的单文件观察台。

- **建议时间：**6–8 小时。
- **可见结果：**能从一段 CSS 判断普通声明、at-rule、描述符、函数和选择器各自上下文。
- **验收证据：**分类清单、CSSOM/Computed 报告、错误描述符诊断和三档练习记录。

## 1. 任务背景

CSS 语法不只有 `property: value`。以下代码分别属于不同类别：

```css
@media (width >= 48rem) { /* 条件规则 */ }
@font-face { font-display: swap; } /* 描述符 */
.card { width: min(100%, 30rem); } /* 值函数 */
.card:is(.featured, .reserved) { /* 函数式伪类 */ }
```

名称相似不代表能互换位置。描述符只在特定 at-rule 中有效；函数只在接受相应数据类型的值位置有效；选择器函数只参与匹配；Web Animations API 是 JavaScript 接口。

分类清楚后，属性口径才可审计，错误声明也更容易定位。

## 2. 学习目标

完成后你应能：

- 区分 statement at-rule 与 block at-rule；
- 解释 `@import`、`@namespace` 的位置约束；
- 使用 media、supports、container、layer 与 scope 条件/分组规则；
- 识别 property、font-face、counter-style、page 等规则中的描述符；
- 区分普通属性名与同名/相近描述符；
- 按变量、数学、颜色、图像、尺寸、形状、滤镜和计数器分类函数；
- 判断函数是否被当前属性语法接受；
- 区分函数式伪类与值函数；
- 用 CSSOM、`CSS.supports()` 和 Computed 分层取证；
- 为新 at-rule、函数或描述符提供可解析且可用的回退。

## 3. 预备知识

先完成[稳定属性与模块索引](01-stable-properties-module-index.md)和[规则、解析与入口](../01-syntax-cascade-selectors/01-rules-parsing-entry-points.md)。个人路径：

```text
market-learning/practice/css-10-syntax/index.html
```

需要能阅读大括号嵌套、逗号列表和函数参数，并会在 DevTools Styles、Computed 与 Console 中找证据。

## 4. 核心理论

### 4.1 At-rule 控制规则结构或处理

at-rule 以 `@` 开头。部分以分号结束，如 `@import`；部分包含规则块，如 `@media`。未知 at-rule 的处理与其语法结构有关，不能假定块内声明会“穿透”执行。

常见职责：

- 文件加载与命名空间：`@import`、`@namespace`；
- 条件：`@media`、`@supports`、`@container`；
- 层叠/范围：`@layer`、`@scope`；
- 定义：`@property`、`@keyframes`、`@font-face`、`@counter-style`；
- 输出介质：`@page`；
- 新平台增强：`@starting-style`、`@position-try`、`@view-transition`。

at-rule 的嵌套位置取决于语法。例如 `@import` 不能随意放到普通样式规则之后；`@page` 的描述符也不能复制到 `.card`。

### 4.2 描述符属于特定规则

描述符看起来也像 `name: value`，但只描述 enclosing at-rule 创建的对象。

```css
@font-face {
  font-family: "Market";
  src: url("./market.woff2") format("woff2");
  font-display: swap;
}
```

这里 `font-family`、`src`、`font-display` 是 font-face 描述符。普通元素上的 `font-family` 同名属性有不同上下文；`src` 与 `font-display` 则不是普通元素属性。

其他例子：

- `@property`：`syntax`、`inherits`、`initial-value`；
- `@counter-style`：`system`、`symbols`、`suffix`、`fallback` 等；
- `@page`：`size`、`margin` 及页边距盒上下文；
- `@font-palette-values`：`font-family`、`base-palette`、`override-colors`。

描述符不会继承到 DOM，也不参与普通元素属性数量。

### 4.3 值函数只有在属性语法允许时有效

`minmax()` 是 Grid 轨道函数，不能因为它返回“尺寸”就放进任何 width：

```css
/* 有效上下文 */
.grid { grid-template-columns: minmax(0, 1fr); }

/* 无效上下文 */
.card { width: minmax(0, 1fr); }
```

同理：

- `repeat()` 用于轨道列表等特定语法；
- `rgb()`、`oklch()`、`color-mix()` 产生颜色；
- `linear-gradient()` 产生图像，不是 `<color>`；
- `circle()` 可用于接受 basic-shape 的属性；
- `blur()` 在 filter 函数列表中有意义；
- `var()` 的替换结果仍需满足消费属性语法。

函数可嵌套，但类型必须一路匹配。

### 4.4 函数式选择器不是值函数

`:is()`、`:where()`、`:not()`、`:has()`、`:nth-child()` 出现在选择器中，负责元素匹配和特异性。它们不是属性值，也不加入属性数量。

`::part()`、`::slotted()` 等函数式伪元素又有 Shadow DOM 上下文。只看到括号不能判断类别，先看它位于选择器还是声明值。

### 4.5 CSS.supports 的证据范围

可检测声明：

```js
CSS.supports("grid-template-rows", "subgrid")
```

也可检测完整条件文本或选择器：

```js
CSS.supports("(animation-timeline: scroll())")
CSS.supports("selector(:has(*))")
```

结果仅代表当前引擎认为语法可接受。它不证明：

- 资源存在或 CORS 可用；
- 组合行为无缺陷；
- 另一浏览器支持；
- 可访问性、打印和性能通过；
- 用户环境允许该效果。

at-rule 本身不总有直接、统一的 `CSS.supports()` 查询。可通过 CSSOM 是否保留规则、相关接口、声明检测和真实行为共同取证。

### 4.6 未知或有限支持语法的回退

先写基础声明，再写增强：

```css
.card { display: block; }

@supports (grid-template-rows: subgrid) {
  .card { display: grid; grid-template-rows: subgrid; }
}
```

条件规则不是“兼容性许可证”。增强内仍需完整上下文，增强外则要能完成同一核心任务。

## 5. At-rule、描述符、函数与语法清单

### 5.1 At-rule 地图

| 规则 | 目的与合法上下文 | 最小示例 | 主要教程/边界 |
| --- | --- | --- | --- |
| `@import` | 导入样式并可指定 layer/supports/media | `@import url("base.css") layer(base);` | [规则入口](../01-syntax-cascade-selectors/01-rules-parsing-entry-points.md)；注意请求链 |
| `@namespace` | 给类型/属性选择器绑定命名空间 | `@namespace svg url("http://www.w3.org/2000/svg");` | 常规 HTML 少用 |
| `@media` | 按媒体类型、视口、能力和偏好条件分组 | `@media (width >= 48rem) {}` | [媒体查询](../07-responsive-container/01-media-queries-content-breakpoints.md) |
| `@supports` | 按声明或选择器语法支持分组 | `@supports (display: grid) {}` | 解析支持不等于完整行为 |
| `@container` | 按祖先查询容器尺寸/样式/状态分组 | `@container card (width > 28rem) {}` | [容器查询](../07-responsive-container/02-container-queries-units.md) |
| `@layer` | 声明层顺序或层内规则 | `@layer base, components;` | [层叠架构](../09-components-modern-css/02-layers-nesting-scope.md) |
| `@scope` | 限制选择器匹配范围和下限 | `@scope (.catalog) {}` | 较新；不隔离继承/脚本 |
| `@property` | 注册自定义属性类型、继承和初值 | `@property --angle { ... }` | [主题契约](../09-components-modern-css/01-custom-properties-property-themes.md) |
| `@keyframes` | 定义关键帧时间序列 | `@keyframes pulse { to { scale: 1.02; } }` | [关键帧](../08-transforms-transitions-animation/02-transitions-keyframes-cancelable-state.md) |
| `@starting-style` | 为进入/首次呈现提供起始样式 | `@starting-style { .panel { opacity: 0; } }` | 与离散过渡组合逐浏览器验证 |
| `@font-face` | 定义可下载字体面 | `@font-face { font-family: X; src: url(x.woff2); }` | 需要真实许可资源与加载证据 |
| `@font-feature-values` | 给 OpenType 特性建立可读名字 | `@font-feature-values X { ... }` | 罕见且依赖实际字体 |
| `@font-palette-values` | 定义彩色字体调色方案 | `@font-palette-values --brand { ... }` | 需彩色字体与目标支持 |
| `@counter-style` | 定义自定义列表计数样式 | `@counter-style market { ... }` | 内容仍需 list 语义 |
| `@page` | 定义页盒尺寸、边距和页边距盒 | `@page { margin: 18mm; }` | [打印](../09-components-modern-css/03-forms-scroll-print-forced-colors.md) |
| `@position-try` | 定义锚点定位备选方案 | `@position-try --below { position-area: bottom; }` | 有限支持，保留正常流 |
| `@view-transition` | 配置跨文档视图转场 | `@view-transition { navigation: auto; }` | 同源、导航与浏览器边界独立核对 |

### 5.2 常用描述符地图

| 所属规则 | 描述符 | 作用 | 错位后结果 |
| --- | --- | --- | --- |
| `@property` | `syntax`、`inherits`、`initial-value` | 注册值语法、继承和初值 | 普通元素中不是对应样式能力 |
| `@font-face` | `font-family`、`src`、`font-style`、`font-weight`、`font-display`、`unicode-range` | 定义字体资源与匹配范围 | `font-display` 写在元素规则会被忽略 |
| `@font-palette-values` | `font-family`、`base-palette`、`override-colors` | 定义彩色字体调色板 | 不能当普通主题 token |
| `@counter-style` | `system`、`symbols`、`additive-symbols`、`range`、`pad`、`fallback`、`prefix`、`suffix` | 构造计数样式 | 只在规则内有效 |
| `@page` | `size`、页边距及页面相关描述符 | 配置页盒 | 不用于普通 div 尺寸 |
| `@position-try` | 位置与 inset 相关声明 | 定义锚点备选样式 | 依赖锚点定位实现 |

### 5.3 值函数地图

| 类别 | 函数 | 产出/用途 | 兼容与上下文 |
| --- | --- | --- | --- |
| 引用 | `var()`、`env()`、`attr()` | 自定义属性、环境值、属性值 | attr 类型化扩展需单独核对 |
| 数学 | `calc()`、`min()`、`max()`、`clamp()` | 兼容类型的数值计算 | 单位与百分比参照必须可组合 |
| 离散数学 | `round()`、`mod()`、`rem()` | 步进、模与余数 | 新函数；`rem()` 不等于 rem 单位 |
| 高级数学 | `sin()`、`cos()`、`tan()`、`asin()`、`acos()`、`atan()`、`atan2()`、`pow()`、`sqrt()`、`hypot()`、`log()`、`exp()`、`abs()`、`sign()` | 三角、指数和符号计算 | 接受类型与浏览器版本分别核对 |
| 颜色 | `rgb()`、`hsl()`、`hwb()`、`lab()`、`lch()`、`oklab()`、`oklch()`、`color()` | 产生颜色 | 色域、回退和序列化有差异 |
| 颜色组合 | `color-mix()`、`light-dark()`、`contrast-color()` | 混色、方案选择、对比色候选 | 每项成熟度不同，不捆绑判断 |
| 图像 | `linear-gradient()`、`radial-gradient()`、`conic-gradient()`、重复渐变 | 产生 CSS image | 必要信息不用纯背景图承载 |
| 资源选择 | `url()`、`image-set()`、`cross-fade()` | 引用或组合图像资源 | 资源必须存在，类型/分辨率需核对 |
| 尺寸/轨道 | `fit-content()`、`minmax()`、`repeat()` | 内在尺寸或 Grid 轨道 | 只用于接受相应语法的位置 |
| 锚点尺寸 | `anchor-size()` | 引用锚点尺寸 | 需要锚点上下文并保留传统尺寸 |
| 形状/路径 | `circle()`、`ellipse()`、`inset()`、`polygon()`、`path()`、`ray()` | basic-shape 或运动路径 | 由消费属性决定合法性 |
| 变换 | `translate()`、`rotate()`、`scale()`、`matrix()`、`perspective()` | 产生 transform function | [变换](../08-transforms-transitions-animation/01-transforms-coordinates-compositing.md) |
| 滤镜 | `blur()`、`brightness()`、`contrast()`、`drop-shadow()`、`grayscale()`、`hue-rotate()`、`invert()`、`opacity()`、`saturate()`、`sepia()` | 组成 filter 值 | 顺序影响结果，注意绘制成本 |
| 缓动 | `cubic-bezier()`、`steps()`、`linear()` | 产生 easing function | linear() 比关键字更新 |
| 时间线 | `scroll()`、`view()` | 产生匿名滚动/视图时间线 | [滚动时间线](../08-transforms-transitions-animation/03-waapi-scroll-timeline-reduced-motion.md) |
| 计数/生成 | `counter()`、`counters()`、`symbols()` | 产生计数文本/样式 | 不替代真实列表与业务数据 |
| 锚点 | `anchor()`、`anchor-size()` | 引用锚点位置/尺寸 | 有限支持并需正常流回退 |

### 5.4 函数式选择器与伪元素

- `:is()`：匹配参数任一选择器，参数影响特异性；
- `:where()`：匹配参数任一选择器，但自身特异性为零；
- `:not()`：排除参数匹配，参数影响特异性；
- `:has()`：按相对选择器匹配关系，注意性能与回退；
- `:nth-child()` / `:nth-last-child()`：按兄弟位置及可选 `of S` 过滤；
- `:lang()` / `:dir()`：按语言或方向匹配；
- `::part()` / `::slotted()`：用于相应 Shadow DOM 暴露边界。

它们属于选择器语法，不是 452 个普通属性，也不是值函数。

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-10-syntax/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CSS 语法分类观察台 · 邻里集市</title>
  <style>
    @layer base, components, enhancements;

    @property --accent-angle {
      syntax: "<angle>";
      inherits: false;
      initial-value: 135deg;
    }

    @counter-style market-step {
      system: numeric;
      symbols: "⓪" "①" "②" "③" "④" "⑤" "⑥" "⑦" "⑧" "⑨";
      suffix: " ";
    }

    @layer base {
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #20382a;
        background: #f3f7f3;
        font: 1rem/1.65 system-ui, sans-serif;
      }
      main {
        width: min(100% - 2rem, 50rem);
        margin: 2rem auto;
      }
      button { min-height: 2.75rem; color: inherit; font: inherit; }
      :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
    }

    @layer components {
      .catalog-shell { container: catalog / inline-size; }
      .catalog {
        display: grid;
        gap: clamp(.75rem, 2cqi, 1.25rem);
      }
      .listing {
        --accent-angle: 135deg;
        padding: 1rem;
        border: 2px solid #607966;
        background: linear-gradient(
          var(--accent-angle, 135deg),
          color-mix(in srgb, #2d6b43 12%, #fff),
          #fff
        );
      }
      .steps { list-style: market-step; }
      #report {
        padding: .75rem;
        color: #edf4ee;
        background: #17251c;
        white-space: pre-wrap;
      }
    }

    @container catalog (width >= 36rem) {
      @layer enhancements {
        .catalog { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    }

    @supports selector(:has(*)) {
      @layer enhancements {
        .listing:has(button:focus-visible) { border-color: #175ca2; }
      }
    }

    @media (prefers-reduced-motion: no-preference) {
      @keyframes angle-shift {
        to { --accent-angle: 225deg; }
      }
      .listing[data-active="true"] {
        animation: angle-shift 500ms ease-out both;
      }
    }

    @media print {
      button, #report { display: none; }
      .listing { break-inside: avoid; background: #fff; }
    }

    @page { margin: 18mm; }
  </style>
</head>
<body>
  <main>
    <h1>CSS 语法分类观察台</h1>
    <div class="catalog-shell">
      <section class="catalog">
        <article class="listing" id="listing">
          <h2>可调节阅读台灯</h2>
          <p>39.00 元。所有状态均为本地演示。</p>
          <button id="toggle" type="button" aria-pressed="false">切换装饰角度</button>
        </article>
        <article class="listing">
          <h2>检查步骤</h2>
          <ol class="steps">
            <li>确认语法类别</li>
            <li>确认合法上下文</li>
            <li>验证基础回退</li>
          </ol>
        </article>
      </section>
    </div>
    <pre id="report" aria-label="规则与函数检测报告"></pre>
    <p>页面没有字体下载、发布、预约或支付请求。</p>
  </main>
  <script>
    const listing = document.querySelector("#listing");
    const button = document.querySelector("#toggle");
    const report = document.querySelector("#report");

    function render() {
      const style = getComputedStyle(listing);
      report.textContent = JSON.stringify({
        display: getComputedStyle(document.querySelector(".catalog")).display,
        accentAngle: style.getPropertyValue("--accent-angle").trim(),
        propertyRegistrationInterface: "CSSPropertyRule" in window,
        containerDeclaration: CSS.supports("container-type", "inline-size"),
        hasSelector: CSS.supports("selector(:has(*))"),
        colorMix: CSS.supports("color", "color-mix(in srgb, red, blue)"),
        note: "true 只表示当前引擎接受测试语法"
      }, null, 2);
    }

    button.addEventListener("click", () => {
      const active = listing.dataset.active !== "true";
      listing.dataset.active = String(active);
      button.setAttribute("aria-pressed", String(active));
      render();
    });
    addEventListener("resize", render);
    render();
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-10-syntax
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

验证：

1. 宽容器进入两列，窄容器保持一列；
2. 注册角度在普通动作模式中可插值，reduce 下静态切换不承担任务；
3. 自定义 counter style 只改变列表标记，`ol/li` 语义仍在；
4. `:has()` 支持时聚焦按钮增强卡片边框，不支持时焦点 outline 仍在；
5. 打印预览隐藏操作和诊断，保留商品与步骤；
6. 每个 supports 报告都标注当前引擎范围，不推断其他浏览器。

## 7. 邻里集市集成案例

代码审查时按以下顺序分类：

1. 选择器决定匹配谁；
2. at-rule 决定规则是否加载、在哪个条件或层中；
3. 普通属性决定元素样式；
4. 值函数构造该属性接受的数据；
5. 描述符只配置 enclosing rule 对象；
6. JavaScript API 控制运行时对象，不计入 CSS 属性。

集市项目的真实资源规则：

- `@font-face` 只有在字体文件、许可证、格式与失败回退均存在时进入主线；
- `url()`、`image-set()` 不引用不存在的占位资源；
- `@import` 的请求链和层位置通过 Network/构建产物验证；
- `@container` 不查询自身造成循环；
- `@page` 不被当作普通元素尺寸；
- 稳定增强规则放在基础路径之后，静态商品和操作不依赖它。

## 8. 常见错误与排查路径

### 明确错误案例：把描述符写到普通元素

```css
.listing {
  font-display: swap;
  src: url("./market.woff2");
}
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | 声明被忽略，页面不会因此创建或加载 Market 字体 |
| 证据 | Styles 标记未知/无效；CSS Font Loading 与 Network 没有对应字体面 |
| 原因 | `font-display` 与 `src` 是 `@font-face` 描述符，不是普通元素属性 |
| 修复 | 有真实字体资源时放入合法 `@font-face`；元素只用 `font-family` 选择字体 |
| 复验 | CSSOM 保留字体规则，Network/Computed 显示真实加载或明确回退 |

其他故障：

- `width: minmax(...)` 无效：函数类型不属于 width 语法；
- `background-color: linear-gradient(...)` 无效：gradient 产生 image，不是 color；
- `@import` 写在普通规则后失效：恢复到允许的样式表前部位置；
- `@supports` 通过仍有视觉 bug：增加真实 DOM、边界值和行为测试；
- `attr()` 返回类型不符：检查类型化语法支持并提供静态值；
- 将 `:has()` 计为函数值：它位于选择器，不产生声明值。

## 9. 课后题

**问题 1：`font-family` 为什么既可能是属性又可能是描述符？**

<details>
<summary>参考答案</summary>

在普通规则中它为元素选择字体族；在 `@font-face` 中它给所定义字体面命名。上下文决定语法角色和行为。

</details>

**问题 2：gradient 为什么可用于 background-image 而非 background-color？**

<details>
<summary>参考答案</summary>

渐变函数产生 `<image>`，而 background-color 只接受颜色。background 简写可同时接收图像和底色，因此也可容纳渐变层。

</details>

**问题 3：`CSS.supports("selector(:has(*))")` 为 true 说明什么？**

<details>
<summary>参考答案</summary>

只说明当前引擎接受测试选择器语法。具体关系、动态更新、性能、可访问性和其他浏览器仍需验证。

</details>

## 10. 实践练习

### 基础：语法分类

- **文件：**`exercise-classification.md`。
- **操作：**从一个样式表标出属性、描述符、at-rule、值函数和函数式选择器。
- **预期：**每项写合法上下文和不计入 452 的理由。
- **失败观察：**列出同名但上下文不同的项目。
- **完成标准：**分类无混项，能链接主要教程。

### 进阶：CSSOM 规则检查

- **文件：**`exercise-cssom.html`。
- **操作：**遍历同源 `document.styleSheets[0].cssRules`，记录 layer/media/supports/keyframes 类型。
- **预期：**浏览器不支持或不保留的规则有明确记录。
- **失败观察：**处理跨源 stylesheet 访问异常，不吞掉错误。
- **完成标准：**CSSOM 证据与 Computed/视觉证据分开。

### 故障注入：函数类型错位

- **文件：**`exercise-function-context.md`。
- **操作：**分别把 gradient 放进 color、minmax 放进 width、circle 放进 padding。
- **预期：**声明被忽略；移到接受 image、track、shape 的属性后生效。
- **失败观察：**保存 Styles 划除和 Computed。
- **完成标准：**用产出类型解释，不靠“浏览器不支持”笼统归因。

## 11. 阶段验收

- [ ] 能区分分号型与块型 at-rule；
- [ ] 知道 import/namespace 的位置约束；
- [ ] 条件规则只作为有回退增强；
- [ ] 描述符不计入普通属性；
- [ ] 值函数按产出类型和消费上下文使用；
- [ ] 函数式选择器不与值函数混淆；
- [ ] CSS.supports 结论没有超出当前解析证据；
- [ ] 外部资源都真实存在或不进入完整案例；
- [ ] 新语法不隐藏必要商品与操作；
- [ ] 主要教程映射可追踪。

## 12. 常见问题

**`@keyframes` 内部写的是描述符吗？**<br>
关键帧块中通常是普通 CSS 声明，作用于动画效果；`@keyframes` 自身是定义规则。不要因为它在 at-rule 内就把所有内部声明都称为描述符。

**`@media` 可以嵌套在 selector rule 内吗？**<br>
现代 CSS 支持部分嵌套分组规则，但目标浏览器、构建转换和输出选择器需核对。教材主线优先用清晰的顶层分组。

**函数越新越好吗？**<br>
不是。只有它减少真实复杂度且有目标支持、回退和测试时才使用。简单静态值通常更易审查。

**怎么判断某名称是属性还是描述符？**<br>
查规范/MDN 的适用语法并看 enclosing context。编辑器提示只是线索，最终以当前规范与浏览器证据为准。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [CSS Syntax Module Level 3](https://www.w3.org/TR/css-syntax-3/)：规则、token 和错误恢复。
- [MDN：At-rules](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_syntax/At-rule)：at-rule 分类入口。
- [MDN：CSS functions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Values_and_Units/CSS_Value_Functions)：值函数分类。
- [CSS Conditional Rules Level 4](https://www.w3.org/TR/css-conditional-4/)：supports 和条件规则。
- [CSS Fonts Level 4](https://www.w3.org/TR/css-fonts-4/)：font-face 与字体描述符。
- [CSS Counter Styles Level 3](https://www.w3.org/TR/css-counter-styles-3/)：counter-style 描述符。
- [CSS Paged Media Level 3](https://www.w3.org/TR/css-page-3/)：page 规则和页盒。

media、supports、font-face 与 keyframes 属于成熟主线；scope、starting-style、position-try、
view-transition、类型化 attr 与高级数学函数仍要按目标浏览器版本验证。Safari、Firefox、
真实字体加载、打印机和 WebView 未在本课自动验证。

## 我现在能做到什么

我能把 at-rule、描述符、值函数和选择器语法放进正确上下文，并让支持检测结论不超出证据。
下一课会用目标矩阵、基础路径和回滚验证稳定增强。

## 单元导航

- [上一课：稳定属性与模块索引](01-stable-properties-module-index.md)
- [返回第十章目录](../README.md#第十章属性语法与兼容参考)
- [下一课：稳定兼容性与渐进增强](03-stable-compatibility-progressive-enhancement.md)
- [返回 CSS 模块](../README.md)
