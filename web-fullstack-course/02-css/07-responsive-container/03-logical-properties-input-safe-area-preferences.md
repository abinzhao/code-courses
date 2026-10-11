# 逻辑属性、输入能力、安全区与偏好：适配方向和用户环境

## 任务卡

邻里集市商品卡将进入中文、阿拉伯语方向和触屏环境。若边距写死 `left`、操作只在 hover 出现、底栏忽略安全区，页面会在 RTL、键盘和移动工具栏下失败。本课交付一个可切换 LTR/RTL/竖排观察的完整页面，并覆盖输入能力、减少动作、配色和强制颜色路径。

- **建议时间：**5–6 小时。
- **可见结果：**方向切换后起止边自动映射，所有操作始终可见且可键盘使用。
- **验收证据：**LTR/RTL/竖排截图、键盘记录、粗指针模拟、偏好模拟、打印/安全区未验证边界。

## 1. 任务背景

物理属性 `left/right/top/bottom` 描述屏幕方向；逻辑属性描述文字的行内轴与块轴。横排 LTR 中，行内起侧通常是左；RTL 中是右；竖排时块轴和行内轴又会变化。

同时，响应式还包括：

- 主要输入是否支持悬停；
- 指针精度是 fine、coarse 还是 none；
- 用户是否希望减少动作；
- 系统是否强制颜色或偏好更高对比；
- 移动设备是否有安全区；
- 动态工具栏改变哪一种视口高度。

这些条件是能力和偏好，不是设备身份，也不是授权。

## 2. 学习目标

完成后你应能：

- 区分 inline/block 逻辑轴与物理宽高；
- 使用 `inline-size`、`margin-inline`、`padding-block` 和逻辑 inset/border；
- 在 LTR、RTL 和竖排下保持 DOM 任务顺序；
- 区分 `hover`、`any-hover`、`pointer` 与 `any-pointer`；
- 让 hover 只增强，不承担唯一操作入口；
- 使用 `env(safe-area-inset-*)` 并提供回退；
- 区分 `svh`、`lvh` 与 `dvh` 的用途和风险；
- 响应 `prefers-reduced-motion`、`prefers-color-scheme`、`prefers-contrast` 与 `forced-colors`；
- 说明模拟器不能代替真实触控、安全区和辅助技术验证。

## 3. 预备知识

先完成[媒体查询与内容断点](01-media-queries-content-breakpoints.md)和[容器查询与容器单位](02-container-queries-units.md)。个人路径：

```text
market-learning/practice/css-07-environment/index.html
```

需要能在 DevTools Rendering/Emulation 中切换媒体特征；不同浏览器面板名称可能不同。

## 4. 核心理论

### 4.1 逻辑轴随书写模式和方向变化

- `inline-size`：行内轴尺寸；
- `block-size`：块轴尺寸；
- `margin-inline-start`：行内起侧外边距；
- `padding-block`：块轴起止内边距；
- `inset-inline-end`：定位盒行内末侧偏移；
- `border-block-start`：块轴起侧边框。

`text-align: start` 随方向映射，不等于永远左对齐。逻辑属性不会翻译文本、格式化价格或自动重排业务数据。

不要同时给同一边写物理和逻辑属性并靠源码顺序猜结果。安全区变量是物理环境值，使用时应明确它保护的是屏幕哪一边。

### 4.2 输入能力不是设备类别

`hover` 与 `pointer` 描述主要输入；`any-hover` 与 `any-pointer` 描述任意可用输入。触屏笔记本可能同时有 coarse 触摸和 fine 鼠标。

```css
@media (hover: hover) and (pointer: fine) {
  .button:hover { /* 可选增强 */ }
}
```

按钮必须在没有 hover 时仍可见，并保留 `:focus-visible`。粗指针可增加目标尺寸和间距，但不能据此假定用户身份或关闭键盘支持。

### 4.3 视口与安全区

- `svh`：小视口高度，倾向于在浏览器界面展开时也容纳内容；
- `lvh`：大视口高度，界面出现时底部可能被遮挡；
- `dvh`：动态视口高度，随工具栏变化，可能引发布局变化；
- `env(safe-area-inset-bottom, 0px)`：读取底部物理安全区并提供回退。

长页面通常使用 `min-block-size`，不要固定 `block-size: 100dvh` 后裁切内容。安全区必须在真实设备和正确 viewport 配置下验证。

### 4.4 用户偏好和强制颜色

- `prefers-reduced-motion: reduce`：减少非必要位移、缩放、视差和平滑滚动；
- `prefers-color-scheme`：系统配色线索，用户显式主题选择可有更高优先级；
- `prefers-contrast`：支持与值需按目标环境核对，未匹配不表示用户不需要可读性；
- `forced-colors: active`：系统重映射颜色，应保留原生控件、边框和焦点；
- `forced-color-adjust: none`：只用于少量确需保色且验证过的内容，不应全页关闭强制颜色。

颜色和动作都不能是唯一状态线索。

## 5. 属性、查询与环境值清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `inline-size` | 行内轴尺寸 | `inline-size: 100%` | 横排常像 width，竖排会变化 |
| `block-size` | 块轴尺寸 | `min-block-size: 100svh` | 固定高度可能裁切长内容 |
| `margin-inline` | 行内起止外边距 | `margin-inline: auto` | 方向友好 |
| `padding-block` | 块轴起止内边距 | `padding-block: 1rem` | 不等于永远上下 |
| `inset-inline-end` | 行内末侧定位偏移 | `inset-inline-end: .5rem` | 定位包含块仍需明确 |
| `writing-mode` | 设置书写模式 | `vertical-rl` | 图片、工具栏与可读性需另验 |
| `direction` / `dir` | 设置文字方向 | HTML `dir="rtl"` | 文档方向优先使用 HTML |
| `hover` / `any-hover` | 查询主要/任意悬停能力 | `(hover: hover)` | 不证明有键盘 |
| `pointer` / `any-pointer` | 查询主要/任意指针精度 | `(pointer: coarse)` | 不能识别设备型号 |
| `env()` | 读取用户代理环境值 | `env(safe-area-inset-bottom, 0px)` | 变量为物理方向 |
| `svh` / `lvh` / `dvh` | 表达不同视口高度 | `min-block-size: 100svh` | 动态工具栏需真机验证 |
| `forced-colors` | 查询强制颜色模式 | `(forced-colors: active)` | 自定义颜色可能被重映射 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-07-environment/index.html`：

```html
<!doctype html>
<html lang="zh-CN" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>方向与偏好实验 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    :root {
      color-scheme: light dark;
      --surface: #f4f8f4;
      --card: #fff;
      --text: #20382a;
      --border: #607966;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --surface: #142019;
        --card: #1f3025;
        --text: #eef6ef;
        --border: #9bb7a1;
      }
    }
    body {
      min-block-size: 100svh;
      margin: 0;
      color: var(--text);
      background: var(--surface);
      font: 1rem/1.65 system-ui, sans-serif;
    }
    main {
      inline-size: min(100% - 2rem, 48rem);
      margin-inline: auto;
      padding-block: 2rem;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: .75rem;
      margin-block: 1rem;
    }
    button {
      min-block-size: 2.75rem;
      min-inline-size: 2.75rem;
      padding-inline: .8rem;
      color: inherit;
      font: inherit;
    }
    .card {
      position: relative;
      padding-block: 1rem;
      padding-inline: 1.25rem;
      border: 2px solid var(--border);
      border-inline-start-width: .5rem;
      background: var(--card);
    }
    .card h2 { margin-block-start: 0; }
    .status {
      position: absolute;
      inset-block-start: .5rem;
      inset-inline-end: .5rem;
      padding-inline: .4rem;
      border: 1px solid currentColor;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: .75rem;
      align-items: center;
    }
    .price { margin-inline-end: auto; font-weight: 700; }
    .writing-vertical .card {
      writing-mode: vertical-rl;
      max-block-size: 24rem;
      overflow: auto;
    }
    #report { white-space: pre-wrap; overflow-wrap: anywhere; }
    footer {
      padding-block-start: 1rem;
      padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
      border-block-start: 1px solid var(--border);
    }
    :focus-visible {
      outline: 3px solid Highlight;
      outline-offset: 3px;
    }
    @media (hover: hover) and (pointer: fine) {
      button:hover { transform: translateY(-1px); }
    }
    @media (pointer: coarse) {
      button { min-block-size: 3rem; padding-inline: 1rem; }
      .actions { gap: 1rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      button { transform: none; }
    }
    @media (prefers-contrast: more) {
      .card, button { border-width: 3px; }
    }
    @media (forced-colors: active) {
      .card, footer, .status { border-color: CanvasText; }
      button { forced-color-adjust: auto; }
    }
  </style>
</head>
<body>
  <main>
    <h1>邻里集市环境适配</h1>
    <div class="controls">
      <button id="direction" type="button" aria-pressed="false">
        切换 RTL
      </button>
      <button id="writing" type="button" aria-pressed="false">
        切换竖排观察
      </button>
    </div>
    <article class="card">
      <span class="status">可预约</span>
      <h2>可调节阅读台灯</h2>
      <p>布局使用逻辑边；方向变化不改变商品、价格或任务顺序。</p>
      <div class="actions">
        <span class="price">39.00 元</span>
        <button type="button">查看详情</button>
        <button type="button">收藏（仅内存）</button>
      </div>
    </article>
    <pre id="report" role="status" aria-label="环境与用户偏好报告"></pre>
    <footer>
      底部内边距考虑物理安全区；桌面环境通常使用 0px 回退。
    </footer>
  </main>
  <script>
    const root = document.documentElement;
    const direction = document.querySelector("#direction");
    const writing = document.querySelector("#writing");

    function report() {
      document.querySelector("#report").textContent = [
        `dir: ${root.dir}`,
        `writing-mode: ${getComputedStyle(document.querySelector(".card")).writingMode}`,
        `主要输入可 hover: ${matchMedia("(hover: hover)").matches}`,
        `主要指针 coarse: ${matchMedia("(pointer: coarse)").matches}`,
        `减少动作: ${matchMedia("(prefers-reduced-motion: reduce)").matches}`,
        `强制颜色: ${matchMedia("(forced-colors: active)").matches}`,
        "模拟值不能替代真实设备与辅助技术验证"
      ].join("\n");
    }

    direction.addEventListener("click", () => {
      const rtl = root.dir !== "rtl";
      root.dir = rtl ? "rtl" : "ltr";
      direction.setAttribute("aria-pressed", String(rtl));
      direction.textContent = rtl ? "恢复 LTR" : "切换 RTL";
      report();
    });

    writing.addEventListener("click", () => {
      const vertical = document.body.classList.toggle("writing-vertical");
      writing.setAttribute("aria-pressed", String(vertical));
      writing.textContent = vertical ? "恢复横排" : "切换竖排观察";
      report();
    });

    report();
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-07-environment
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

验证：

1. 切换 RTL，粗起始边、状态角标和价格推挤方向自动映射；
2. 切换竖排，观察逻辑轴变化并确认滚动可达；
3. 只用键盘操作两个切换按钮和卡片按钮；
4. DevTools 模拟 `prefers-reduced-motion`、深色、`forced-colors`（若可用）；
5. 模拟 coarse pointer，检查目标和间距；
6. 桌面安全区通常为 0，明确记录未在刘海/圆角真机验证。

## 7. 邻里集市集成案例

将本课能力应用到真实组件时：

- 文档方向由内容语言和 HTML `dir` 决定，不由 CSS 猜测；
- 商品卡 DOM 顺序始终是标题、说明、价格、操作，RTL 不倒排业务数据；
- 价格格式和货币方向按国际化规则处理，逻辑边距只负责布局；
- hover 只提供轻微反馈，详情与收藏按钮始终可见；
- 收藏状态同时有文字和 `aria-pressed`，不只用品牌色；
- 底部操作栏若固定，使用安全区 padding 并为正文预留空间；
- `dvh` 变化不得重启动画或吞掉表单输入；
- 强制颜色下使用系统边界和原生控件，不全页关闭调整；
- 减少动作只改变呈现，不能让操作失效。

项目仍处 CSS 静态/内存阶段；认证、对象授权和预约并发边界见[项目契约](../../00-guide/project-contract.md)。

## 8. 常见错误与排查路径

### 明确错误案例：操作只在 hover 出现

```css
.actions { opacity: 0; pointer-events: none; }
.card:hover .actions { opacity: 1; pointer-events: auto; }
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | 键盘和无 hover 触屏用户看不到或无法操作按钮 |
| 证据 | Tab 焦点不可见；`(hover: none)` 下操作保持隐藏 |
| 原因 | 把 hover 增强当成唯一入口，并同时禁用指针事件 |
| 修复 | 操作默认可见可用；hover 只增强边框或背景 |
| 复验 | 键盘、hover none、coarse pointer 下均能找到并激活按钮 |

其他故障：

- RTL 中角标仍固定右侧：把 `right` 改为 `inset-inline-end`；
- 物理与逻辑属性争同一边：删除重复控制，保留一套有意规则；
- `100lvh` 底部被工具栏遮挡：评估 `svh`/`dvh` 和自然增长；
- reduce 模式仍有位移：同时检查 CSS 媒体规则和脚本动画；
- forced colors 下边框消失：使用语义边框和系统颜色，避免只靠背景；
- 安全区测试“通过”但只在桌面：记录未验证，不把 0px 当真机证据。

## 9. 课后题

**问题 1：`inline-size` 是否永远等于 width？**

<details>
<summary>参考答案</summary>

不是。它沿行内轴；横排时常对应物理宽度，竖排时可能对应物理高度。

</details>

**问题 2：`hover: none` 是否表示没有键盘？**

<details>
<summary>参考答案</summary>

不是。输入维度独立，且设备可能有多种输入。键盘焦点和可见入口始终要保留。

</details>

**问题 3：安全区 padding 能否在桌面验证通过？**

<details>
<summary>参考答案</summary>

桌面通常只验证回退值和语法。真实刘海、圆角、工具栏与横竖屏仍需目标设备验证。

</details>

## 10. 实践练习

### 基础：LTR/RTL 对照

- **文件：**`exercise-direction.html`。
- **操作：**两张相同卡分别放在 `dir=ltr` 和 `dir=rtl` 容器中。
- **预期：**起始边框、末端角标和自动外边距镜像，DOM 内容顺序不变。
- **失败观察：**Computed 的物理映射。
- **完成标准：**不复制两套 left/right 样式。

### 进阶：偏好矩阵

- **文件：**`environment-matrix.md` 与完整页面副本。
- **操作：**记录默认、深色、减少动作、强制颜色、coarse pointer。
- **预期：**每种状态保留文字、边界、焦点与按钮。
- **失败观察：**Rendering 面板、Accessibility 树和键盘路径。
- **完成标准：**区分真实通过、模拟通过和未验证。

### 故障注入：hover 唯一入口

- **文件：**`exercise-hover-failure.md`。
- **操作：**临时应用错误片段，在 `hover: none` 模拟与键盘下复现。
- **预期：**按钮不可发现或焦点不可见。
- **失败观察：**记录可见状态、Tab 顺序和 Computed。
- **完成标准：**恢复默认可见操作，hover 只增强，三种输入路径复验。

## 11. 阶段验收

- [ ] LTR 与 RTL 中逻辑边映射正确；
- [ ] 竖排观察没有裁切必要内容；
- [ ] DOM 与键盘顺序不因视觉方向改变；
- [ ] 无 hover 与 coarse pointer 下操作可见可用；
- [ ] `:focus-visible` 始终存在；
- [ ] reduce、深色、对比和强制颜色路径有证据或明确未验证；
- [ ] 长页面使用可增长的最小块尺寸；
- [ ] 安全区使用回退并标注真机缺口；
- [ ] 没有把媒体特征当设备身份或授权。

## 12. 常见问题

**所有 left/right 都必须换成逻辑属性吗？**<br>
不是。界面布局和文字方向通常适合逻辑属性；地图坐标、物理安全区等确实表达物理方向时应保留，并写清理由。

**`any-pointer: fine` 时可以缩小所有按钮吗？**<br>
不应。设备可能同时有触摸，且可访问目标尺寸不只取决于指针精度。基础目标先可用，再谨慎增强。

**深色主题只写 `color-scheme: dark` 可以吗？**<br>
不够。它主要告知浏览器原生控件等呈现方案，正文、边框、链接、状态和焦点仍需语义颜色。

**减少动作是否等于把时长改成 0.001ms？**<br>
不是。应删除非必要位移、缩放、视差和平滑滚动，同时保留即时静态状态与操作结果。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [CSS Logical Properties Level 1](https://www.w3.org/TR/css-logical-1/)：核对逻辑轴与物理映射。
- [MDN：逻辑属性与值](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)：复习常用逻辑边。
- [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/)：核对输入能力与用户偏好特征。
- [MDN：env()](https://developer.mozilla.org/en-US/docs/Web/CSS/env)：核对安全区环境变量和回退。
- [MDN：length](https://developer.mozilla.org/en-US/docs/Web/CSS/length)：比较新视口单位。
- [MDN：forced-colors](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)：理解系统颜色重映射。

`prefers-contrast`、强制颜色模拟、动态视口和安全区在浏览器/设备间有差异。桌面模拟不能替代真实移动设备、VoiceOver、NVDA 或高对比系统测试。

## 我现在能做到什么

我能用逻辑属性适配方向，用能力查询保留所有输入路径，并为安全区、动态视口和用户偏好提供可解释回退。下一章会把动作反馈建立在这些减少动作与兼容边界之上。

## 单元导航

- [上一课：容器查询与容器单位](02-container-queries-units.md)
- [返回第七章目录](../README.md#第七章响应式布局与容器查询)
- [下一章：变换、过渡与动画](../08-transforms-transitions-animation/01-transforms-coordinates-compositing.md)
- [返回 CSS 模块](../README.md)
