# 层叠层、原生嵌套与作用域：建立可审计的组件边界

## 任务卡

邻里集市发布面板会同时接触基础样式、第三方控件、组件规则和少量工具类。若团队用更长选择器与 `!important` 互相覆盖，主题和错误状态会迅速失控。本课交付一个可观察 layer 顺序、原生 nesting 与 `@scope` 下限边界的组件页面。

- **建议时间：**5–6 小时。
- **可见结果：**组件无需 ID 和 `!important` 即可稳定覆盖第三方基础样式，嵌入区不会污染外部预览。
- **验收证据：**Styles/Cascade 面板记录、特异性预算表、scope 支持边界和无增强回退截图。

## 1. 任务背景

组件 CSS 的难点通常不是“如何写一个颜色”，而是“谁有权覆盖谁”。完整层叠至少要考虑来源、重要性、上下文、层顺序、特异性、作用域接近度和源码顺序。

现代 CSS 提供三个互补工具：

- `@layer` 明确一组规则在层叠中的优先顺序；
- 原生 nesting 让相关选择器靠近，但不改变层叠原理；
- `@scope` 限制选择器在某个子树范围匹配，并可设置下限。

它们不会自动形成 Shadow DOM，也不会替代语义命名和测试。

## 2. 学习目标

完成后你应能：

- 声明稳定的层顺序并把导入/本地规则放入对应层；
- 解释普通声明与 important 声明的层顺序为何相反；
- 说明未分层作者规则在普通/important 情况下的位置；
- 为组件设定低特异性预算；
- 正确使用 `&` 表示嵌套选择器上下文；
- 解释父选择器列表如何影响嵌套分支特异性；
- 区分原生 nesting 与 Sass 的字符串拼接；
- 使用 `@scope (root) to (limit)` 限定匹配；
- 解释 scoping proximity 在层叠中的位置；
- 为不支持 nesting 或 scope 的环境保留必要基础样式。

## 3. 预备知识

先完成[层叠层与特异性](../01-syntax-cascade-selectors/02-cascade-layers-specificity.md)和[自定义属性与主题契约](01-custom-properties-property-themes.md)。个人路径：

```text
market-learning/practice/css-09-architecture/index.html
```

需要能在 DevTools Styles 中展开被覆盖声明、查看选择器特异性和来源顺序。

## 4. 核心理论

### 4.1 @layer 先建立架构顺序

在任何具体规则前声明层顺序：

```css
@layer reset, base, vendor, components, utilities, overrides;
```

同一来源和普通重要性下，后声明层优先于前层。因此 component 可覆盖 vendor，而不必复制更长选择器。

未分层的普通作者声明优先于所有分层普通作者声明。若项目承诺使用层架构，随手写一条未分层规则会成为隐形“最高普通层”。应把例外也显式放进 `overrides`。

important 的层顺序反转：早层 important 优先于晚层 important，而且分层 important 优先于未分层 important。这保护 reset/基础约束不被后续层轻易覆盖，也意味着不能按普通规则直觉推断。

`!important` 仍应稀少。它适合确有层叠来源保护需求的约束，不是修复选择器不清的快捷方式。

### 4.2 import 与层

第三方样式可通过：

```css
@import url("vendor.css") layer(vendor);
```

`@import` 有严格放置顺序，并引入网络与加载成本。真实项目还可能由打包器内联。无论加载方式，都要确认最终 CSS 中第三方规则确实位于计划层，不能只看源文件写法。

本课单文件直接在 `@layer vendor {}` 中模拟第三方，不发送额外请求。

### 4.3 特异性预算

组件优先使用单类和状态属性：

```css
.publish-panel { }
.publish-panel[data-state="invalid"] { }
.publish-panel .hint { }
```

避免：

- 页面 ID 与组件类组合；
- 依赖第几层 div 的结构链；
- 为压过旧规则不断重复类；
- 大量 important；
- 把工具类绑定到组件内部私有结构。

`:where()` 的特异性为零，可用于低权重默认值；`:is()`、`:not()` 与 `:has()` 的参数会影响特异性，需单独核对。

### 4.4 原生 nesting 的选择器模型

```css
.publish-panel {
  & .hint { color: var(--text-muted); }
  &:focus-within { border-color: var(--focus-ring); }
}
```

`&` 表示父规则的选择器上下文。原生 CSS 不等于 Sass：

```css
/* 不要把它当 Sass 字符串拼接 */
.card {
  &-title { font-weight: 700; }
}
```

这不是可靠的原生 BEM 名称拼接。直接写 `.card-title`。

父选择器列表会按类似 `:is()` 的方式影响嵌套分支特异性。把 `#app, .panel` 放在同一父列表，可能让 `.panel` 分支也获得列表中较高特异性效应。组件父列表不要混入 ID。

嵌套提高的是局部可读性，不应无限加深。超过两三层通常说明选择器依赖 DOM 结构过多。

### 4.5 @scope 限制匹配范围

```css
@scope (.market-shell) to (.third-party-zone) {
  :scope { --panel-gap: 1rem; }
  .publish-panel { border-color: #326747; }
}
```

scope root 是匹配起点，limit 是下限边界；规则可以匹配 root 子树，但不会穿入指定下限子树。`:scope` 在块内指向当前 scope root。

`@scope` 不会：

- 阻断继承或自定义属性流入；
- 隔离 DOM 事件；
- 创建 Shadow Root；
- 防止脚本查询；
- 自动降低所有选择器特异性。

当两个同来源、同层、同重要性且同特异性的 scoped 规则竞争时，离目标元素更近的 scope root 可通过 scoping proximity 获胜；之后才看源码顺序。不要用这一规则设计难以观察的“距离竞赛”，组件仍应保持清晰单一作用域。

### 4.6 渐进增强与边界

必要组件样式先用普通低特异性选择器实现。nesting 可在支持环境减少重复；scope 用于增强隔离，但旧环境仍依靠唯一根类避免全局污染。

构建工具若转译 nesting 或 scope，必须核对输出特异性、源码映射和目标浏览器，而不是同时加载原生与转译版本造成重复规则。

## 5. 规则、选择器与架构清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `@layer` | 声明层或层内规则 | `@layer base { ... }` | important 顺序反转 |
| 层顺序语句 | 固定同级层次序 | `@layer a, b, c;` | 首次声明决定顺序 |
| `layer()` import | 把导入放入层 | `@import "x.css" layer(vendor)` | import 位置/网络需核对 |
| 未分层规则 | 位于层外 | `.x { ... }` | 普通声明高于分层普通 |
| `&` | 引用嵌套上下文 | `&:focus` | 不是字符串拼接 |
| 嵌套规则 | 在父规则内组织后代/状态 | `& .hint` | 父列表影响特异性 |
| `@scope` | 限定规则匹配子树 | `@scope (.root) {}` | 不阻断继承 |
| scope limit | 阻止匹配越过下限 | `to (.foreign)` | 下限自身匹配边界需实测 |
| `:scope` | 引用当前 scope root | `:scope > header` | 上下文不同含义不同 |
| `:where()` | 零特异性分组 | `:where(button, input)` | 内容仍需合法选择器 |
| `:is()` | 匹配参数任一选择器 | `:is(h2, h3)` | 参数影响特异性 |
| scoping proximity | 同级声明按作用域距离比较 | 更近 root | 位于 specificity 之后 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-09-architecture/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>组件层叠架构 · 邻里集市</title>
  <style>
    @layer reset, base, vendor, components, utilities, overrides;

    @layer reset {
      *, *::before, *::after { box-sizing: border-box; }
      :where(h1, h2, p) { margin-block-start: 0; }
    }

    @layer base {
      :root {
        --surface: #fff;
        --text: #20382a;
        --muted: #53695a;
        --border: #607966;
        --focus: #175ca2;
      }
      body {
        margin: 0;
        color: var(--text);
        background: #f3f7f3;
        font: 1rem/1.65 system-ui, sans-serif;
      }
      main {
        width: min(100% - 2rem, 48rem);
        margin: 2rem auto;
      }
      :where(button, input) {
        min-height: 2.75rem;
        color: inherit;
        font: inherit;
      }
      :focus-visible {
        outline: 3px solid var(--focus);
        outline-offset: 3px;
      }
    }

    @layer vendor {
      .vendor-widget .publish-panel {
        padding: .5rem;
        border: 6px dotted #a33;
        background: #ffe8e8;
      }
      .vendor-widget button { border-radius: 999px; }
    }

    @layer components {
      .publish-panel {
        display: grid;
        gap: 1rem;
        padding: 1rem;
        border: 2px solid var(--border);
        border-radius: .5rem;
        background: var(--surface);
      }
      .publish-panel .hint { color: var(--muted); }
      .publish-panel .field { display: grid; gap: .25rem; }
      .publish-panel input { width: 100%; padding: .5rem; }
      .publish-panel button { padding: .55rem .85rem; }

      @supports selector(&) {
        .publish-panel {
          & .hint { font-size: .9rem; }
          &:focus-within { border-color: var(--focus); }
          &[data-priority="high"] {
            border-inline-start-width: .6rem;
          }
        }
      }
    }

    @layer utilities {
      .u-compact { gap: .5rem; }
      .u-stack { display: grid; gap: .75rem; }
    }

    @layer overrides {
      .publish-panel[data-priority="high"] {
        background: #fff8dc;
      }
    }

    @scope (.market-shell) to (.third-party-zone) {
      :scope { --scoped-accent: #326747; }
      .publish-panel {
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--scoped-accent) 20%, transparent);
      }
      .scope-marker { color: var(--scoped-accent); font-weight: 700; }
    }

    @layer components {
      .controls { display: flex; flex-wrap: wrap; gap: .75rem; margin-block: 1rem; }
      #report {
        padding: .75rem;
        color: #edf4ee;
        background: #17251c;
        white-space: pre-wrap;
      }
    }
  </style>
</head>
<body>
  <main class="market-shell">
    <h1>组件层叠架构</h1>
    <p class="scope-marker">此文字位于 market scope 内。</p>
    <div class="controls">
      <button id="priority" type="button" aria-pressed="false">切换高优先级状态</button>
      <button id="compact" type="button" aria-pressed="false">切换紧凑工具类</button>
    </div>
    <section class="vendor-widget">
      <form class="publish-panel" id="panel">
        <h2>邻里集市发布预览</h2>
        <div class="field">
          <label for="title">商品标题</label>
          <input id="title" value="可调节阅读台灯">
          <span class="hint">第三方样式在 vendor 层，组件层可以稳定覆盖。</span>
        </div>
        <button id="preview" type="button">生成静态预览</button>
      </form>
    </section>
    <section class="third-party-zone u-stack">
      <h2>作用域下限</h2>
      <p class="scope-marker">这段位于 third-party-zone，不应获得 scoped marker 样式。</p>
      <form class="publish-panel">
        <label for="foreign">第三方字段</label>
        <input id="foreign" value="隔离边界观察">
      </form>
    </section>
    <pre id="report" role="status" aria-label="层叠架构报告"></pre>
  </main>
  <script>
    const panel = document.querySelector("#panel");
    const report = document.querySelector("#report");

    function render(message = "") {
      const style = getComputedStyle(panel);
      report.textContent = [
        `border-style: ${style.borderStyle}`,
        `border-width: ${style.borderWidth}`,
        `background-color: ${style.backgroundColor}`,
        `gap: ${style.gap}`,
        `原生 nesting 解析检测: ${CSS.supports("selector(&)")}`,
        `CSSScopeRule 接口: ${"CSSScopeRule" in window}`,
        message,
        "预览为本地组件演示，没有发送请求"
      ].filter(Boolean).join("\n");
    }

    document.querySelector("#priority").addEventListener("click", event => {
      const active = panel.dataset.priority !== "high";
      if (active) panel.dataset.priority = "high";
      else delete panel.dataset.priority;
      event.currentTarget.setAttribute("aria-pressed", String(active));
      render("状态属性已切换，由 components 与 overrides 层共同呈现。");
    });

    document.querySelector("#compact").addEventListener("click", event => {
      const active = panel.classList.toggle("u-compact");
      event.currentTarget.setAttribute("aria-pressed", String(active));
      render("utilities 层的紧凑间距已切换。");
    });

    document.querySelector("#preview").addEventListener("click", () => {
      render("本地静态预览已生成；没有发送请求或持久化数据。");
    });

    render();
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-09-architecture
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

验证：

1. vendor 的高特异性后代规则仍被较后 components 层覆盖；
2. 紧凑工具类位于 utilities 层，因此可覆盖组件 gap；
3. high 状态的背景由 overrides 层提供；
4. 支持 nesting 时 focus-within 和高优先级粗边增强生效；
5. 支持 scope 时第一段 marker/阴影增强生效，third-party-zone 内不生效；
6. 在 DevTools 禁用 nesting 和 scope 增强，字段、边框、标签与按钮仍可用；
7. Styles 面板能沿层名解释每个获胜声明，不需要添加 `!important`。

## 7. 邻里集市集成案例

建议为 CSS 模块固定层契约：

```text
reset → base → vendor → components → utilities → overrides
```

集成规则：

- 层顺序在入口集中声明，功能文件只向已有层写规则；
- 第三方 CSS 明确放 vendor，不靠组件选择器复制其 DOM 链；
- component 根类是必要回退边界；
- utility 只表达单一布局/视觉职责，不修改业务状态；
- override 记录具体产品原因，不成为第二套组件层；
- nesting 深度控制在可读范围，父列表不混入 ID；
- scope 只增强匹配隔离，不假称阻断继承或脚本；
- 错误、禁用、已售等状态来自合法 DOM 属性或应用状态；
- 无支持环境保留标签、字段、按钮、错误文字和焦点。

不同微前端或第三方页面仍需检查来源顺序、Shadow DOM 与构建输出，本课的单文档层不能代表跨文档隔离。

## 8. 常见错误与排查路径

### 明确错误案例：未分层热修复击穿架构

```css
@layer components {
  .publish-panel { border-color: #326747; }
}

.publish-panel { border-color: red; }
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | components 层内无论如何调整顺序都无法覆盖红色边框 |
| 证据 | DevTools 显示未分层普通作者规则优先于分层普通规则 |
| 原因 | 热修复被写在层外，形成隐形最高普通优先级 |
| 修复 | 把有理由的例外放入已声明的 overrides 层并记录状态条件 |
| 复验 | 层面板可解释获胜规则，删除状态后基础组件恢复 |

其他故障：

- important 顺序与预期相反：先区分普通/important，再读取层声明顺序；
- nesting 分支异常偏高：检查父选择器列表是否含 ID 或高特异性参数；
- `&-title` 无效：不要套用 Sass 拼接，直接写完整类名；
- scope 内 token 泄漏到下限：scope 不阻断继承，需在边界重置或改契约；
- scope 样式完全缺失：确认浏览器支持，基础根类仍必须可用；
- 转译后重复规则：核对构建产物是否同时保留原生和降级版本。

## 9. 课后题

**问题 1：未分层普通作者规则和分层普通规则谁优先？**

<details>
<summary>参考答案</summary>

在其他层叠条件相同的作者普通声明中，未分层规则优先于所有分层规则。因此层架构应避免随手写层外热修复。

</details>

**问题 2：为什么 important 的层顺序反转？**

<details>
<summary>参考答案</summary>

反转让早期基础层的重要约束不容易被后载规则覆盖，并保持不同来源 important 的保护逻辑。具体比较仍需先确定来源和层叠上下文。

</details>

**问题 3：`@scope` 是否等同 Shadow DOM？**

<details>
<summary>参考答案</summary>

不是。它限制规则匹配范围并参与作用域接近度比较，但不隔离 DOM、事件、脚本、继承或所有样式来源。

</details>

## 10. 实践练习

### 基础：层叠胜者表

- **文件：**`exercise-layer-order.md`。
- **操作：**为同一按钮在六层分别声明颜色，记录普通与 important 两组结果。
- **预期：**能从层顺序解释胜者，不只记录色值。
- **失败观察：**保存 DevTools Cascade/Styles 截图。
- **完成标准：**表中包含未分层声明的比较。

### 进阶：双层 scope

- **文件：**`exercise-scope-proximity.html`。
- **操作：**嵌套页面 scope 与组件 scope，写同特异性规则观察更近 root。
- **预期：**支持环境按 scoping proximity 选择；旧环境有根类基础样式。
- **失败观察：**记录 root 距离、特异性和源顺序。
- **完成标准：**不依赖距离实现必要状态，只把它用于可解释增强。

### 故障注入：ID 污染 nesting

- **文件：**`exercise-nesting-specificity.md`。
- **操作：**把 `#demo, .publish-panel` 作为父列表并嵌套 `.hint`，再与普通类竞争。
- **预期：**分支优先级高于预期；移除 ID 或拆开规则后恢复预算。
- **失败观察：**保存浏览器显示的选择器与特异性。
- **完成标准：**组件选择器不超过约定预算，无 important 修补。

## 11. 阶段验收

- [ ] 层顺序在具体规则前声明；
- [ ] 普通与 important 层顺序均可解释；
- [ ] 第三方样式位于明确 vendor 层；
- [ ] 没有无理由的未分层作者规则；
- [ ] 组件选择器不依赖页面 ID；
- [ ] nesting 不用于名称字符串拼接；
- [ ] 父列表特异性经过审计；
- [ ] scope root、limit 和 proximity 可说明；
- [ ] scope 不被误称为继承/脚本隔离；
- [ ] 不支持新语法时基础组件仍可用。

## 12. 常见问题

**有 @layer 后还需要关注特异性吗？**<br>
需要。层先决定一大级优先级，同一层内仍比较特异性、scope proximity 和源码顺序。层让竞争边界更清楚，不消灭层叠。

**工具类一定要在组件层后吗？**<br>
取决于项目契约。若工具类被设计为显式覆盖，应放后；若只提供低权重默认，可放前或用 `:where()`。关键是集中声明并测试。

**所有组件都应该加 @scope 吗？**<br>
不必。稳定唯一根类已能解决大量问题。只有需要限制通用内部选择器、嵌入复杂子树且目标浏览器支持时才增加 scope。

**原生 nesting 能完全替代预处理器吗？**<br>
不能自动替代变量、mixin、循环和构建生态；它只提供原生选择器嵌套。迁移要核对语法与输出，不做机械替换。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [CSS Cascade Level 5](https://www.w3.org/TR/css-cascade-5/)：层顺序与 important 反转。
- [CSS Cascading and Inheritance Level 6](https://www.w3.org/TR/css-cascade-6/)：scope 与 proximity。
- [CSS Nesting Module](https://www.w3.org/TR/css-nesting-1/)：原生嵌套语法和特异性。
- [MDN：@layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)：层声明与导入。
- [MDN：Using CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting/Using_CSS_nesting)：嵌套示例和边界。
- [MDN：@scope](https://developer.mozilla.org/en-US/docs/Web/CSS/@scope)：作用域根、下限和兼容信息。

`@layer` 已是现代浏览器稳定主线；原生 nesting 的早期版本存在语法差异，`@scope` 的旧浏览器支持更窄。构建转译后的特异性也需检查。Safari、Firefox、旧版 WebView 和真实第三方样式组合未在本课自动验证。

## 我现在能做到什么

我能用 layer 建立可审计优先级，用 nesting 保持局部可读，并把 scope 作为有回退的匹配边界，而不依赖 ID 和 important 竞赛。下一课会在这套架构中处理原生表单、滚动、打印和强制颜色。

## 单元导航

- [上一课：自定义属性、@property 与主题契约](01-custom-properties-property-themes.md)
- [返回第九章入口](../09-components-modern-css.md)
- [下一课：表单、滚动、打印与强制颜色](03-forms-scroll-print-forced-colors.md)
- [返回 CSS 模块](../README.md)
