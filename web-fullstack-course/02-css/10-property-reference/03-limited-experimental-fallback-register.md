# 有限支持、实验与回退登记：用证据控制新能力风险

## 任务卡

邻里集市希望尝试锚点定位和滚动驱动进度，但不能让旧浏览器失去帮助说明或正文。本课建立“状态、检测、基础路径、增强路径、失败证据、移除条件”登记方法，并交付一个不支持增强时仍完整可用的单文件页面。

- **建议时间：**6–8 小时。
- **可见结果：**帮助内容默认可达；支持时增强定位和阅读进度，不支持时没有空按钮或隐藏正文。
- **验收证据：**当前引擎能力报告、禁用增强截图、reduce 路径和回退登记表。

## 1. 任务背景

“新”不是一个兼容状态。一个机制可能处于：

- 多引擎稳定但旧版本有限；
- 规范已发布、实现仍不完整；
- 草案快速演进；
- 历史弃用但仍有兼容别名；
- 浏览器私有且没有标准等价；
- 已移除，不应再进入新代码。

只写 `@supports` 不能完成风险管理。项目还需要知道基础任务是什么、增强失败时谁仍可操作、在哪些环境验证、什么时候移除兼容代码。

## 2. 学习目标

完成后你应能：

- 区分有限支持、实验、弃用、非标准和已移除；
- 不把规范状态、BCD 数据和当前浏览器检测混为一谈；
- 为每项新能力定义核心任务与增强收益；
- 使用 CSS `@supports`、`CSS.supports()`、接口检测和真实行为测试；
- 避免 UA 字符串作为首要功能判断；
- 设计 base first 的 HTML/CSS 回退；
- 记录资源、输入、打印、无障碍和性能边界；
- 管理前缀、别名和旧语法的隔离范围；
- 写出触发升级、降级或删除的条件；
- 让实验能力不进入 476 稳定口径的无标记区域。

## 3. 预备知识

先完成[At-rule、函数与描述符](02-at-rules-functions-descriptors.md)、[响应式偏好](../07-responsive-container/03-logical-properties-input-safe-area-preferences.md)与[滚动时间线](../08-transforms-transitions-animation/03-waapi-scroll-timeline-reduced-motion.md)。个人路径：

```text
market-learning/practice/css-10-fallbacks/index.html
```

需要能在 DevTools 禁用规则、模拟减少动作，并使用不同浏览器或兼容数据明确记录“未验证”。

## 4. 核心理论

### 4.1 五类状态不能互换

**有限支持**：标准方向较清晰，但目标浏览器/版本覆盖不足，或子特性不齐。可以渐进增强，必须保留基础路径。

**实验**：规范、名称、值或行为可能变化，实现可能由 flag/preview 提供。默认不承载必要任务。

**弃用**：标准或平台不再推荐，新代码应迁移；可能仍因兼容保留解析。

**非标准**：厂商私有、无跨浏览器标准保证。若业务确需使用，要隔离、记录目标引擎和可移除方案。

**已移除**：不再实现或规范删除。不要因为旧博客存在示例就恢复。

同一模块中的子能力状态可能不同。例如基础 transform 稳定，不代表所有三维组合、独立属性和新函数在每个旧环境一致。

### 4.2 三个证据源回答不同问题

1. **规范/工作草案**：语义是什么、仍可能如何演进；
2. **兼容数据**：浏览器版本何时标记支持、是否前缀/部分；
3. **目标环境测试**：项目实际 DOM、组合、输入、性能和可访问性是否通过。

三者缺一不可。当前 Chromium 的 `CSS.supports()` 不能替代 Firefox/Safari 数据，更不能替代真实设备和辅助技术。

### 4.3 从核心任务设计回退

先写任务句：

> 用户必须能读取帮助内容并关闭/继续操作。

基础路径可把帮助内容放在按钮后方普通流中。增强路径才让支持 popover 和 anchor positioning 的浏览器把它放入顶层并锚定按钮。这样增强失败只损失位置，不损失内容。

不合格回退：

- 不支持时 `display: none`；
- 只显示“请升级浏览器”而无核心内容；
- 用实验阅读顺序修复错误 DOM；
- 用非标准截断隐藏唯一价格或条款；
- 以颜色/动画提示失败但没有文字。

### 4.4 检测分层

**解析检测：**

```css
@supports (anchor-name: --help) and (position-area: bottom) { }
```

**脚本接口检测：**

```js
const popoverSupported = "showPopover" in HTMLElement.prototype;
```

**行为检测：**创建真实 DOM，触发打开、滚动、缩放、键盘、打印和偏好，观察布局与事件。

**跨环境验证：**在目标版本矩阵运行同一验收。若没有环境，状态是“未验证”，不是“支持”。

检测必须围绕实际使用的子能力。只检测 `anchor-name` 不足以证明 `position-area`、fallback tries 和 top layer 组合。

### 4.5 回退声明顺序

基础声明在前，增强在后：

```css
.help { position: static; }

@supports (position-area: bottom) {
  .help {
    position: fixed;
    position-anchor: --help;
    position-area: bottom;
  }
}
```

未知声明通常被忽略，但简写、层顺序、选择器无效和整个规则解析失败会改变结果。回退要在真实目标浏览器中禁用增强复验。

### 4.6 前缀与兼容别名

私有前缀不是自动“更兼容”。例如传统多行截断常组合 `-webkit-line-clamp`、`display: -webkit-box` 和 `-webkit-box-orient`；它具有广泛历史实现，但仍不能隐藏唯一业务内容。

若必须使用：

- 与标准声明相邻；
- 写明保留的浏览器/版本原因；
- 有未截断或展开路径；
- 建立删除条件；
- 不批量生成未知前缀。

旧 `page-break-*` 可作为 `break-*` 的兼容别名，但新教材主线使用现代属性并在打印矩阵验证。

### 4.7 登记是可维护契约

每项增强至少记录：

```text
ID / 状态 / 业务目的 / 基础路径 / 增强路径
解析检测 / 接口检测 / 行为验收 / 目标矩阵
已验证版本与日期 / 未验证范围 / 已知失败
监控或回报 / 回滚开关 / 升级与删除条件 / owner
```

课程文档没有团队 owner 字段时，以章节和覆盖 ID 作为责任入口；真实项目应指定维护者。

## 5. 机制、状态与回退登记

| 机制 | 课程快照分类 | 检测重点 | 基础回退 | 主要教程 |
| --- | --- | --- | --- | --- |
| Anchor positioning | 有限支持/组合仍演进 | `anchor-name`、`position-anchor`、`position-area` 分别检测并行为测试 | 普通流或传统定位，内容不出屏 | 本课 |
| `position-try*` / `@position-try` | 实验/有限支持 | fallback 列表、溢出、书写模式 | 单一安全位置和可滚动内容 | 本课 |
| `interpolate-size` / `calc-size()` | 有限支持 | 内在尺寸类型、反向、中断 | 即时展开或显式测量 | [动画章](../08-transforms-transitions-animation.md) |
| CSS scroll/view timeline | 有限支持 | timeline、axis、range、简写重置 | 无动画或静态文字进度 | [WAAPI 课](../08-transforms-transitions-animation/03-waapi-scroll-timeline-reduced-motion.md) |
| View Transitions | 有限支持 | 单文档/跨文档、同源、名称唯一 | 普通即时导航 | [动画章](../08-transforms-transitions-animation.md) |
| `@scope` | 现代但旧环境有限 | 规则保留、limit、继承边界 | 唯一组件根类 | [层叠架构](../09-components-modern-css/02-layers-nesting-scope.md) |
| `field-sizing` | 有限支持 | 控件类型、内容增长、缩放 | 明确 width/min/max 和 resize | [表单课](../09-components-modern-css/03-forms-scroll-print-forced-colors.md) |
| 标准 `line-clamp` / `block-ellipsis` | 实验/实现差异 | 标准语法与 legacy 组合分开 | 完整正文或显式展开按钮 | 本课 |
| `text-box*` / `initial-letter*` | 有限/实验 | 字体、语言、行盒与引擎 | 普通 line-height 和首字样式 | [文字章](../04-typography-decoration.md) |
| `corner-shape*` | 实验 | 单角值、border-radius 组合 | 普通圆角 | 本课 |
| `reading-flow` / `reading-order` | 实验且需 AT 验证 | DOM、焦点、阅读顺序 | 正确 DOM 顺序 | [Grid 课](../06-grid/02-auto-placement-implicit-responsive-repeat.md) |
| scroll marker/target 机制 | 实验 | 生成标记、键盘、滚动容器 | 普通链接和按钮 | 本课 |
| animation trigger / trigger scope | 实验提案 | 名称、触发和取消 | 静态内容或显式按钮 | [动画章](../08-transforms-transitions-animation.md) |
| CSS 自定义 `@function` / `@mixin` | 演进中 | 语法版本、循环与构建 | 普通自定义属性/重复的局部规则 | [语法课](02-at-rules-functions-descriptors.md) |
| `clip` | 弃用 | 旧绝对定位裁剪依赖 | `clip-path` 或 overflow | [属性索引](01-stable-properties-module-index.md) |
| `page-break-*` | 弃用兼容别名 | 打印引擎别名映射 | `break-*` 主线 | [表单打印课](../09-components-modern-css/03-forms-scroll-print-forced-colors.md) |
| `-webkit-line-clamp` 组合 | 非标准/历史广泛 | 目标引擎与完整展开路径 | 不截断全文 | 本课 |
| `::-webkit-scrollbar*` | 非标准 | 目标引擎、强制颜色和覆盖滚动条 | 原生滚动条；标准属性仅有限美化 | [表单滚动课](../09-components-modern-css/03-forms-scroll-print-forced-colors.md) |
| CSS Speech 属性 | 非共同视觉浏览器基线 | 不假定屏幕阅读器遵守 | 语义 HTML、名称、状态 | [HTML 无障碍模块](../../01-html/07-accessibility-seo.md) |

### 登记示例：CSS-EXP-001

- **机制：**锚点定位帮助提示；
- **状态：**有限支持增强；
- **业务目的：**让帮助浮层靠近触发按钮；
- **基础路径：**帮助内容在 DOM 中可读，popover 不支持时按普通流显示；
- **增强路径：**支持 popover 与 anchor 组合时进入顶层并锚定；
- **解析检测：**`anchor-name`、`position-anchor`、`position-area`；
- **行为验收：**键盘打开/关闭、边缘翻转、200% 缩放、RTL、滚动、reduce；
- **快照日期：**2026-10-10；
- **未验证：**Safari、Firefox、VoiceOver、NVDA、移动工具栏；
- **回滚：**删除 `@supports` 块，保留普通流帮助；
- **升级条件：**目标矩阵和辅助技术组合全部通过；
- **删除条件：**设计取消浮层，或基础普通流更符合任务。

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-10-fallbacks/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>渐进增强登记 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      color: #20382a;
      background: #f3f7f3;
      font: 1rem/1.7 system-ui, sans-serif;
    }
    .reading-progress {
      display: none;
      position: fixed;
      z-index: 10;
      inset: 0 0 auto;
      block-size: .35rem;
      background: #2d6b43;
      transform: scaleX(0);
      transform-origin: left;
    }
    @keyframes progress {
      from { transform: scaleX(0); }
      to { transform: scaleX(1); }
    }
    @supports (animation-timeline: scroll()) {
      .reading-progress {
        display: block;
        animation: progress linear both;
        animation-timeline: scroll(root block);
      }
    }
    main {
      width: min(100% - 2rem, 46rem);
      margin: 2rem auto;
    }
    button {
      min-height: 2.75rem;
      padding: .55rem .85rem;
      color: inherit;
      font: inherit;
    }
    #help-button { anchor-name: --help-button; }
    #help {
      max-width: min(24rem, calc(100% - 2rem));
      padding: 1rem;
      border: 2px solid #607966;
      color: #20382a;
      background: #fff;
    }
    @supports (anchor-name: --help-button) and
              (position-anchor: --help-button) and
              (position-area: bottom) {
      #help:popover-open {
        position: fixed;
        position-anchor: --help-button;
        position-area: bottom;
        margin: .5rem 0 0;
      }
    }
    .card {
      min-height: 45vh;
      margin-block: 2rem;
      padding: 1rem;
      border: 2px solid #607966;
      background: #fff;
    }
    #report {
      padding: .75rem;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      color: #edf4ee;
      background: #17251c;
    }
    :focus-visible {
      outline: 3px solid #175ca2;
      outline-offset: 3px;
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      .reading-progress { display: none; animation: none; }
    }
  </style>
</head>
<body>
  <div class="reading-progress" aria-hidden="true"></div>
  <main>
    <h1>渐进增强观察台</h1>
    <p>帮助内容是核心；锚点位置和滚动进度只是增强。</p>
    <button id="help-button" type="button" popovertarget="help">查看价格说明</button>
    <aside id="help" popover>
      <strong>价格边界</strong>
      <p>3900 整数分显示为 39.00 元。本页没有支付或预约请求。</p>
      <button type="button" popovertarget="help" popovertargetaction="hide">关闭说明</button>
    </aside>
    <article class="card">
      <h2>可调节阅读台灯</h2>
      <p>核心商品信息始终在普通文档中，不等待实验动画或定位。</p>
    </article>
    <article class="card">
      <h2>回退登记</h2>
      <p>禁用所有 supports 块后，商品、帮助和键盘路径仍应可用。</p>
    </article>
    <pre id="report" role="status" aria-label="能力与回退报告"></pre>
  </main>
  <script>
    const tests = {
      popoverAPI: "showPopover" in HTMLElement.prototype,
      anchorName: CSS.supports("anchor-name", "--help-button"),
      positionAnchor: CSS.supports("position-anchor", "--help-button"),
      positionArea: CSS.supports("position-area", "bottom"),
      interpolateSize: CSS.supports("interpolate-size", "allow-keywords"),
      scrollTimeline: CSS.supports("animation-timeline", "scroll()"),
      standardLineClamp: CSS.supports("line-clamp", "3"),
      legacyLineClamp: CSS.supports("-webkit-line-clamp", "3"),
      scopeInterface: "CSSScopeRule" in window,
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches
    };
    document.querySelector("#report").textContent =
      JSON.stringify({
        currentEngineParsing: tests,
        conclusion: "解析结果不是跨浏览器或完整行为验收",
        baseline: "帮助与商品在无增强时仍可达"
      }, null, 2);
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-10-fallbacks
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

验证：

1. 支持 popover 时按钮打开/关闭帮助；不支持时 aside 作为普通流内容可读；
2. 支持锚点组合时浮层靠近按钮，不支持时由基础 popover/普通流决定位置；
3. 支持滚动 timeline 时顶部进度随滚动，缺失时无空白且正文完整；
4. reduce 下滚动装饰隐藏，帮助与商品操作不变；
5. 只用键盘完成帮助开关和页面阅读；
6. 禁用 `@supports` 增强后，核心任务仍成立；
7. 报告只描述当前引擎解析结果。

## 7. 邻里集市集成案例

新增实验能力必须附登记并通过以下门：

- 核心任务用稳定 HTML/CSS 完成；
- 增强只改善位置、过渡、密度或装饰；
- 解析、接口、行为与跨浏览器证据分别记录；
- 商品、价格、状态、错误和操作不被实验能力隐藏；
- 键盘、RTL、200% 缩放、reduce、强制颜色和打印有结果；
- 关闭增强是一条可执行回滚路径；
- 前缀/别名集中在局部文件，不扩散到全局；
- BCD 或规范升级时重新测试，不只改文档标签；
- 真实发布、预约与授权不依赖 CSS 能力检测。

若增强失败会阻止用户完成任务，它不是“渐进增强”，而是新的平台最低要求，必须走更严格的产品与兼容决策。

## 8. 常见错误与排查路径

### 明确错误案例：按浏览器名称隐藏基础内容

```js
if (navigator.userAgent.includes("Chrome")) {
  help.hidden = false;
}
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | UA 变化、内嵌 WebView 或其他支持引擎中，帮助内容被错误隐藏 |
| 证据 | 实际接口存在但字符串不匹配；或字符串匹配而组合行为失败 |
| 原因 | 用浏览器品牌替代具体能力检测，并把基础内容默认隐藏 |
| 修复 | 帮助默认可读；按所用声明/接口检测增强，再做真实行为验收 |
| 复验 | 伪造 UA、禁用增强、不同引擎和键盘路径均能读取帮助 |

其他故障：

- 只检测 anchor-name：补 position-anchor、position-area 和边缘行为；
- 支持检测通过却没有滚动进度：确认滚动范围、轴和简写顺序；
- legacy clamp 隐藏价格：移除截断或提供真实展开按钮；
- 批量添加所有前缀：只保留有目标版本证据的局部兼容；
- “实验”永久不清理：登记升级/删除日期与责任入口；
- 当前 Chromium 通过就写全平台支持：保留 Safari/Firefox/AT 未验证状态。

## 9. 课后题

**问题 1：规范进入工作草案是否等于可以作为项目基线？**

<details>
<summary>参考答案</summary>

不等于。还要看语法稳定性、目标浏览器实现、组合缺陷和项目行为测试。规范状态与部署决策是不同证据。

</details>

**问题 2：为什么 UA 检测不适合作为首要方案？**

<details>
<summary>参考答案</summary>

品牌字符串会被伪装、演进或嵌入环境改变，同一品牌版本的子能力也不同。应检测实际使用的声明/接口并验证行为。

</details>

**问题 3：非标准语法是否一律禁止？**

<details>
<summary>参考答案</summary>

不是机械禁止。若目标业务和引擎确需，可局部隔离、提供标准/基础回退、记录版本与删除条件；不能把它宣称为跨浏览器标准。

</details>

## 10. 实践练习

### 基础：建立能力登记

- **文件：**`exercise-feature-register.md`。
- **操作：**选择 `field-sizing`，填写状态、检测、基础/增强、矩阵和删除条件。
- **预期：**基础 textarea 有明确尺寸和 resize，增强只按内容优化。
- **失败观察：**记录解析 true 但边界内容失败的情况。
- **完成标准：**登记字段完整，无“支持良好”之类模糊词。

### 进阶：锚点边缘矩阵

- **文件：**`exercise-anchor-matrix.md` 与页面副本。
- **操作：**测试四个视口边缘、RTL、滚动容器、200% 缩放和键盘。
- **预期：**增强不出屏；失败时回滚为普通流/安全 popover。
- **失败观察：**保存位置、裁切、焦点和关闭路径。
- **完成标准：**明确“已验证版本”与“未验证环境”。

### 故障注入：删除基础路径

- **文件：**`exercise-no-fallback.md`。
- **操作：**把 help 默认隐藏，只在 supports 内显示，再禁用该规则。
- **预期：**核心说明不可达，证明架构错误。
- **失败观察：**记录 DOM、Computed、键盘和可见结果。
- **完成标准：**恢复 base first，增强缺失只损失位置/装饰。

## 11. 阶段验收

- [ ] 每项新能力有明确分类；
- [ ] 规范、BCD、解析和行为证据分开；
- [ ] 基础路径可独立完成核心任务；
- [ ] supports 检测覆盖实际使用的子能力；
- [ ] UA 字符串不是首要功能开关；
- [ ] reduce、键盘、缩放和打印边界已记录；
- [ ] 非标准/前缀代码局部隔离；
- [ ] 登记包含回滚、升级和删除条件；
- [ ] 未验证环境没有被写成通过；
- [ ] 实验能力不承担发布、预约或授权。

## 12. 常见问题

**能否只看 caniuse 百分比决定？**<br>
不能。全球比例与项目目标用户、企业 WebView、辅助技术和实际组合不同。兼容数据是输入，不是唯一决策。

**`@supports not (...)` 适合写回退吗？**<br>
可用于特定增强，但基础声明在条件外通常更稳，避免不支持 `@supports` 的老环境连回退块也不执行。

**多久复查一次实验登记？**<br>
在目标浏览器基线升级、相关规范/BCD变化、用户故障或设计改动时复查；真实项目还应有周期责任人。

**回退必须视觉完全一致吗？**<br>
不必。它必须完成同一核心任务并保留信息、操作和恢复路径。增强可以提供更好的位置、动作或密度。

## 13. 扩展阅读

资料核验日期：2026-10-10；兼容数据使用课程固定 BCD 快照并结合当前目标环境。

- [CSSWG Current Work](https://www.w3.org/Style/CSS/current-work)：规范状态与模块入口。
- [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data/tree/3b28abed321540dcbe571c16174af543c4e02ac0)：课程固定兼容快照。
- [MDN：@supports](https://developer.mozilla.org/en-US/docs/Web/CSS/@supports)：解析检测语法。
- [CSS Anchor Positioning](https://www.w3.org/TR/css-anchor-position-1/)：锚点与备选位置模型。
- [CSS Overflow Level 4](https://www.w3.org/TR/css-overflow-4/)：line clamp、block overflow 等演进机制。
- [Scroll-driven Animations](https://www.w3.org/TR/scroll-animations-1/)：scroll/view timeline。
- [CSS Deprecated Features](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_syntax/At-rule#deprecated_at-rules)：从具体参考页核对弃用状态。

课程示例已在语义上设计回退，但本回合不声称 Safari、Firefox、旧 WebView、VoiceOver、NVDA、Windows 强制颜色和真实移动设备通过。Anchor、position-try、scroll marker、animation trigger、reading flow 和 CSS 自定义函数等必须在采用时重新核对。

## 我现在能做到什么

我能把新能力按有限、实验、弃用和非标准状态登记，用多层证据验证，并保证关闭增强后核心任务仍完整。至此可以用稳定属性索引、语法分类和回退登记共同维护 CSS。

## 单元导航

- [上一课：At-rule、函数与描述符](02-at-rules-functions-descriptors.md)
- [返回第十章入口](../10-property-reference.md)
- [下一步：CSS 覆盖矩阵](../CSS-COVERAGE.md)
- [返回 CSS 模块](../README.md)
