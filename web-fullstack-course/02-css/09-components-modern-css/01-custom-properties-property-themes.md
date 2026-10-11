# 自定义属性、@property 与主题契约：理解替换、继承和失效

## 任务卡

邻里集市发布预览要支持浅色、深色和高对比主题。主题不能靠 `filter: invert()` 猜颜色，也不能因一个无效 token 让按钮文字消失。本课交付一个可切换主题、注入无效注册值并显示计算结果的完整页面。

- **建议时间：**5–6 小时。
- **可见结果：**主题由语义 token 驱动；错误 token 有可解释回退，数据与表单状态不变。
- **验收证据：**Computed token 报告、无效值实验、系统深色模拟和强制颜色边界记录。

## 1. 任务背景

自定义属性把组件依赖的颜色、间距和装饰参数变成层叠中的契约：

```css
.publish-panel {
  color: var(--panel-text);
  background: var(--panel-surface);
}
```

它们不是预处理器变量。浏览器保留 token 序列，让值参与层叠、继承和 `var()` 替换；某些错误直到计算消费属性时才暴露。

主题系统的目标不是“所有值都变量化”，而是让少量有稳定语义的决策可覆盖、可验证、可降级。

## 2. 学习目标

完成后你应能：

- 解释自定义属性的大小写、层叠和默认继承；
- 区分自定义属性自身有效与消费声明类型有效；
- 正确使用 `var(--name, fallback)` 和嵌套回退；
- 解释循环引用为何使环上的变量无效；
- 设计 surface、text、border、accent 等语义 token；
- 区分系统主题线索与用户显式选择；
- 使用 `color-scheme` 协调原生控件；
- 用 `@property` 注册 syntax、inherits 和 initial-value；
- 解释注册属性怎样改变解析、继承与插值；
- 在不支持注册或高级颜色能力时保留静态主题。

## 3. 预备知识

先完成[层叠、特异性与层](../01-syntax-cascade-selectors/02-cascade-layers-specificity.md)和[值阶段、单位与百分比](../02-values-colors-units/01-value-stages-units-percentages.md)。个人路径：

```text
market-learning/practice/css-09-theme/index.html
```

需要能在 DevTools Computed 中查看自定义属性和最终颜色，并使用 Rendering 面板模拟 `prefers-color-scheme` 与 `forced-colors`。

## 4. 核心理论

### 4.1 自定义属性是层叠值

自定义属性必须以 `--` 开头，名称区分大小写：`--Accent` 与 `--accent` 是两个属性。未注册的自定义属性默认继承，因此父级定义会流入后代，后代可按正常层叠覆盖。

```css
:root { --panel-gap: 1rem; }
.compact { --panel-gap: .5rem; }
.panel { gap: var(--panel-gap); }
```

变量不是全局常量。每个元素都有自己的计算值，`var()` 在该元素消费时读取相应结果。把局部 token 放在组件根可减少无关后代的契约范围。

自定义属性可以保存多 token 值，例如阴影或字体栈；这也意味着未注册属性本身不会先验证“它是不是颜色”。

### 4.2 var 回退的精确边界

`var(--token, fallback)` 在引用的自定义属性缺失或为保证无效值时使用 fallback。fallback 可以包含逗号和另一个 `var()`：

```css
color: var(--panel-text, var(--page-text, #20382a));
```

但如果 `--panel-text` 确实存在，值为 `1rem`，替换到 `color` 后才发现类型错误，内层 fallback 不会自动重新接管；整个 `color` 声明在计算值阶段失效，属性按其规则回到继承或初始行为。

这就是“变量有值”与“消费声明可用”必须分别检查的原因。

### 4.3 循环引用与回退

同一元素上：

```css
.broken {
  --a: var(--b);
  --b: var(--a);
  color: var(--a, #20382a);
}
```

`--a` 与 `--b` 构成循环，环上变量在计算时无效；消费处的 fallback 可提供颜色。变量从祖先继承后再被本元素覆盖时，要按每个元素的依赖图理解，不能仅按源文件文本顺序。

过深的 token 链让诊断困难。主题层保持一到两级语义映射通常更可维护：

```css
:root { --green-700: #245c3a; }
:root { --action-fill: var(--green-700); }
```

### 4.4 主题是语义契约

优先定义：

- `--page-surface`、`--panel-surface`；
- `--text-primary`、`--text-muted`；
- `--border-default`、`--focus-ring`；
- `--action-fill`、`--action-text`；
- `--danger-fill`、`--danger-text`。

不要以 `--white`、`--black` 命名后在深色主题里放相反颜色，这会让名称与含义冲突。状态色仍需文字或图标，不可只靠颜色。

`prefers-color-scheme` 是系统偏好线索。用户显式选择后，可用根元素 `data-theme` 覆盖。`color-scheme` 告诉浏览器页面适合哪些方案，影响原生控件、表单和滚动条；它不会自动设计正文主题。

首次加载闪烁、服务端渲染和持久化属于应用层问题。本课按钮只在当前页面内存保存选择，并明确说明。

### 4.5 @property 注册类型契约

注册示例：

```css
@property --accent-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 135deg;
}
```

三个描述符分别指定：

- `syntax`：允许的值语法，`"*"` 表示通用 token；
- `inherits`：是否从父元素继承；
- `initial-value`：注册属性的初始值。

除通配 syntax 的特殊情况外，initial value 通常需要“计算独立”，不能依赖当前元素字体等未确定上下文。无效的注册块会整体失效，不能只看某一行。

注册后，无效赋值会按注册属性规则处理，而不是将任意 token 传到消费点；浏览器还能按类型插值角度、长度或颜色。旧环境忽略 `@property` 时，代码仍应通过 `var(--accent-angle, 135deg)` 获得静态结果。

注册不是业务验证。即使 `--price: 3900` 满足 `<number>`，它也不代表整数分范围、货币、权限或服务器数据正确。

### 4.6 动态修改与安全边界

脚本可用 `style.setProperty("--panel-accent", value)` 修改 token。外部输入仍需限定允许集合，不能把任意用户字符串拼进 `<style>`。自定义属性不是保密存储，DevTools、样式表和脚本都能读取。

主题切换应只改变呈现 token，不删除字段、绕过 `disabled`、伪造发布成功或存放认证信息。

## 5. 属性、函数与描述符清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `--name` | 声明自定义属性 | `--panel-surface: #fff` | 名称区分大小写 |
| `var()` | 替换属性值并可回退 | `var(--text, #222)` | 类型错误后不重试 fallback |
| `@property` | 注册自定义属性 | `@property --angle` | 旧环境可忽略 |
| `syntax` | 限制注册值语法 | `"<angle>"` | 字符串语法需合法 |
| `inherits` | 控制注册属性继承 | `false` | 未注册属性默认继承 |
| `initial-value` | 设置注册初始值 | `135deg` | 常需计算独立 |
| `color-scheme` | 声明支持的配色方案 | `light dark` | 不自动生成主题 |
| `prefers-color-scheme` | 查询系统偏好 | `(prefers-color-scheme: dark)` | 用户选择可覆盖 |
| `data-theme` | 表达应用显式选择 | `[data-theme="dark"]` | 本身不是持久化 |
| `getComputedStyle()` | 读取计算 token/消费值 | `.getPropertyValue("--x")` | 可能得到序列化值 |
| `setProperty()` | 动态设置 token | `style.setProperty(...)` | 限定外部输入集合 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-09-theme/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>主题契约观察台 · 邻里集市</title>
  <style>
    @property --accent-angle {
      syntax: "<angle>";
      inherits: false;
      initial-value: 135deg;
    }
    * { box-sizing: border-box; }
    :root {
      color-scheme: light;
      --page-surface: #f3f7f3;
      --panel-surface: #fff;
      --text-primary: #20382a;
      --text-muted: #53695a;
      --border-default: #607966;
      --action-fill: #2d6b43;
      --action-text: #fff;
      --focus-ring: #175ca2;
      --accent-angle: 135deg;
    }
    @media (prefers-color-scheme: dark) {
      :root:not([data-theme]) {
        color-scheme: dark;
        --page-surface: #142019;
        --panel-surface: #1e3024;
        --text-primary: #edf5ee;
        --text-muted: #b9cbbb;
        --border-default: #9eb8a3;
        --action-fill: #86c997;
        --action-text: #102017;
      }
    }
    :root[data-theme="dark"] {
      color-scheme: dark;
      --page-surface: #142019;
      --panel-surface: #1e3024;
      --text-primary: #edf5ee;
      --text-muted: #b9cbbb;
      --border-default: #9eb8a3;
      --action-fill: #86c997;
      --action-text: #102017;
    }
    :root[data-theme="contrast"] {
      color-scheme: light;
      --page-surface: #fff;
      --panel-surface: #fff;
      --text-primary: #000;
      --text-muted: #222;
      --border-default: #000;
      --action-fill: #000;
      --action-text: #fff;
    }
    body {
      margin: 0;
      color: var(--text-primary, #20382a);
      background: var(--page-surface, #f3f7f3);
      font: 1rem/1.65 system-ui, sans-serif;
    }
    main {
      width: min(100% - 2rem, 44rem);
      margin: 2rem auto;
    }
    .controls { display: flex; flex-wrap: wrap; gap: .75rem; }
    button {
      min-height: 2.75rem;
      padding: .55rem .85rem;
      border: 2px solid var(--border-default, #607966);
      color: inherit;
      background: var(--panel-surface, #fff);
      font: inherit;
    }
    .panel {
      --local-gap: 1rem;
      display: grid;
      gap: var(--local-gap, .75rem);
      margin-block: 1rem;
      padding: 1rem;
      border: 2px solid var(--border-default, #607966);
      color: var(--text-primary, #20382a);
      background:
        linear-gradient(
          var(--accent-angle, 135deg),
          color-mix(in srgb, var(--action-fill) 14%, var(--panel-surface)),
          var(--panel-surface)
        );
    }
    .panel p { color: var(--text-muted, #53695a); }
    .primary {
      color: var(--action-text, #fff);
      background: var(--action-fill, #2d6b43);
    }
    #report {
      padding: .75rem;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
      color: #fff;
      background: #17251c;
    }
    :focus-visible {
      outline: 3px solid var(--focus-ring, #175ca2);
      outline-offset: 3px;
    }
    @media (forced-colors: active) {
      .panel, button { border-color: CanvasText; }
      .primary { color: ButtonText; background: ButtonFace; }
    }
    @media (prefers-reduced-motion: no-preference) {
      .panel { transition: --accent-angle 400ms ease; }
    }
  </style>
</head>
<body>
  <main>
    <h1>主题契约观察台</h1>
    <p>主题选择只保存在当前页面；商品数据没有发送或持久化。</p>
    <fieldset class="controls">
      <legend>主题选择</legend>
      <button type="button" data-theme-choice="system">跟随系统</button>
      <button type="button" data-theme-choice="light">浅色</button>
      <button type="button" data-theme-choice="dark">深色</button>
      <button type="button" data-theme-choice="contrast">高对比</button>
      <button type="button" id="invalid">注入无效角度</button>
    </fieldset>
    <article class="panel" id="panel">
      <h2>可调节阅读台灯</h2>
      <p>价格 39.00 元。渐变角度来自注册 token，文字与边框来自语义 token。</p>
      <button type="button" class="primary" id="preview">生成静态预览</button>
    </article>
    <pre id="report" role="status" aria-label="主题计算值报告"></pre>
  </main>
  <script>
    const root = document.documentElement;
    const panel = document.querySelector("#panel");
    const report = document.querySelector("#report");

    function renderReport(message = "") {
      const rootStyle = getComputedStyle(root);
      const panelStyle = getComputedStyle(panel);
      report.textContent = [
        `显式主题: ${root.dataset.theme || "system"}`,
        `--panel-surface: ${rootStyle.getPropertyValue("--panel-surface").trim()}`,
        `--text-primary: ${rootStyle.getPropertyValue("--text-primary").trim()}`,
        `--accent-angle（面板）: ${panelStyle.getPropertyValue("--accent-angle").trim()}`,
        `面板背景: ${panelStyle.backgroundImage}`,
        message
      ].filter(Boolean).join("\n");
    }

    document.querySelectorAll("[data-theme-choice]").forEach(button => {
      button.addEventListener("click", () => {
        const choice = button.dataset.themeChoice;
        if (choice === "system") {
          delete root.dataset.theme;
        } else {
          root.dataset.theme = choice;
        }
        panel.style.removeProperty("--accent-angle");
        panel.style.setProperty("--accent-angle", choice === "dark" ? "225deg" : "135deg");
        renderReport("主题已切换；商品与价格未改变。");
      });
    });

    document.querySelector("#invalid").addEventListener("click", () => {
      panel.style.setProperty("--accent-angle", "not-an-angle");
      renderReport("已注入无效注册值；观察它回到注册初始值。");
    });

    document.querySelector("#preview").addEventListener("click", () => {
      renderReport("本地静态预览已生成；没有发送请求或持久化数据。");
    });

    renderReport();
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-09-theme
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

验证：

1. 跟随系统时，切换系统浅/深色后 token 改变；
2. 选择显式主题后，系统偏好不再覆盖该选择；
3. 注入 `not-an-angle`，支持 `@property` 的浏览器回到注册初始值；
4. 在 DevTools 临时禁用 `@property`，`var()` 回退仍给渐变一个静态角度；
5. 强制颜色模式下边框、焦点和按钮文字可辨；
6. 主题切换不改变标题、价格、按钮职责或任何业务状态。

`color-mix()` 是本示例的增强点。若目标浏览器不支持，应在其前声明一个普通 `background-color`，或为渐变提供不依赖混色函数的基础背景；不能让文字对比依赖该函数。

## 7. 邻里集市集成案例

项目主题契约建议分三层：

1. 基础调色板只保存设计原料；
2. 页面语义 token 映射 surface、text、border、action、danger；
3. 组件局部 token 从语义层取值，并允许有限覆盖。

发布面板始终满足：

- 标题和整数分价格来自 DOM/应用数据，不存进 CSS token；
- 错误、已售、可预约同时有文字；
- 主题切换只改变呈现；
- 系统偏好是默认，用户显式选择有更高层叠位置；
- 强制颜色允许系统重映射，不对整页使用 `forced-color-adjust: none`；
- 注册装饰值失败时仍有基础背景；
- 用户提供的任意商品文本不拼接进 style；
- 认证 token、手机号和内部 ID 不进入 CSS 变量。

持久化主题需后续明确存储、跨标签同步和首屏策略，本课没有假定这些已实现。

## 8. 常见错误与排查路径

### 明确错误案例：存在的 token 类型错误

```css
.panel {
  --panel-text: 1rem;
  color: var(--panel-text, #20382a);
}
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | 文字没有使用 fallback 色，而是继承了其他 color |
| 证据 | `--panel-text` 的计算 token 为 `1rem`；消费后的 `color` 声明无效 |
| 原因 | var fallback 只处理引用缺失/无效，不能在替换后类型错误时重试 |
| 修复 | 让语义 token 始终符合消费类型；必要时用 `@property` 注册 `<color>` |
| 复验 | 三个主题和无效注入下 Computed color 都有明确来源 |

其他故障：

- 深色主题变量未生效：检查显式 `data-theme` 是否覆盖系统媒体规则；
- 回退仍失效：检查 fallback 本身是否引用了循环或类型错误值；
- 角度在后代意外继承：注册时确认 `inherits: false`，并测试旧环境回退；
- 整页反色破坏照片与状态：删除 `filter: invert()`，改用语义 token；
- 变量链无法追踪：减少层级，在组件根输出契约表；
- 强制颜色下按钮不可辨：允许系统颜色，保留边框和原生语义。

## 9. 课后题

**问题 1：未注册自定义属性默认是否继承？**

<details>
<summary>参考答案</summary>

是。每个元素仍经过层叠，若本元素没有获胜声明，通常继承父元素的计算值。`@property` 可用 `inherits: false` 改变注册属性行为。

</details>

**问题 2：为什么 `var(--x, red)` 不总能得到 red？**

<details>
<summary>参考答案</summary>

若 `--x` 存在且自身可替换，fallback 不会采用；替换后若对消费属性类型无效，整个消费声明失效。要从契约源头修正类型或注册语法。

</details>

**问题 3：`@property --price` 能否验证商品价格？**

<details>
<summary>参考答案</summary>

不能。它只约束 CSS 呈现值语法，无法保证整数分范围、货币、授权、并发或服务端持久化。

</details>

## 10. 实践练习

### 基础：局部主题覆盖

- **文件：**`exercise-local-theme.html`。
- **操作：**在一张卡片根覆盖 `--panel-surface` 与 `--border-default`。
- **预期：**只影响该卡及继承后代，页面其他卡不变。
- **失败观察：**记录每张卡的 Computed token。
- **完成标准：**不用提高选择器特异性或复制整套规则。

### 进阶：注册颜色 token

- **文件：**`exercise-registered-color.html`。
- **操作：**注册 `<color>` token，比较合法颜色、非法长度和无注册环境。
- **预期：**支持注册时非法值按注册规则处理；旧环境仍有静态回退。
- **失败观察：**保存 CSSOM/Computed 和视觉结果。
- **完成标准：**必要文字对比不依赖插值动画。

### 故障注入：循环与类型错误

- **文件：**`exercise-token-failure.md`。
- **操作：**分别制造 `--a/--b` 循环和“长度消费为颜色”的错误。
- **预期：**两类错误产生不同的 fallback/失效路径。
- **失败观察：**记录自定义属性计算值与消费属性最终值。
- **完成标准：**能用值处理阶段解释并修复，不靠追加 `!important`。

## 11. 阶段验收

- [ ] token 名区分大小写且表达语义；
- [ ] 能解释层叠、继承和局部覆盖；
- [ ] var fallback 边界准确；
- [ ] 循环引用有可复现证据；
- [ ] 系统偏好与显式主题顺序明确；
- [ ] color-scheme 不被描述成自动主题；
- [ ] @property 三个描述符完整；
- [ ] 注册失败和旧环境有静态回退；
- [ ] 强制颜色下核心信息可辨；
- [ ] CSS token 不承载敏感数据或业务真相。

## 12. 常见问题

**所有数值都应该抽成自定义属性吗？**<br>
不应该。只有需要复用、覆盖、主题化或形成组件契约的决策值得抽取。一次性的局部值直接写清楚通常更易维护。

**主题选择应写在 body 还是 html？**<br>
若需要影响整页及原生控件，通常放在根元素更直接；局部主题可放组件根。选择应与作用范围一致。

**注册后的属性一定能动画吗？**<br>
注册类型给浏览器插值依据，但实际动画还取决于语法类型、消费方式和浏览器实现。必要内容不能只通过动画出现。

**能用 CSS 变量跨组件传递商品价格吗？**<br>
不要把业务数据源放在 CSS。价格使用整数分存于应用数据/DOM，CSS 只负责显示布局与主题。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [CSS Custom Properties Level 1](https://www.w3.org/TR/css-variables-1/)：替换、无效值、继承和循环。
- [CSS Properties and Values API Level 1](https://www.w3.org/TR/css-properties-values-api-1/)：注册语法与描述符。
- [MDN：Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties)：主题与回退示例。
- [MDN：@property](https://developer.mozilla.org/en-US/docs/Web/CSS/@property)：注册和兼容信息。
- [MDN：color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme)：原生 UI 配色协商。
- [MDN：color-mix()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)：混色函数和色彩空间。

自定义属性与 `var()` 是成熟主线；`@property`、类型插值、`color-mix()` 色彩空间和旧版浏览器组合需按目标矩阵验证。课程基线将必要内容建立在普通静态颜色上。Safari、Firefox、强制颜色系统与辅助技术未在本课自动验证。

## 我现在能做到什么

我能解释 token 从层叠到消费的完整路径，设计可降级主题契约，并用 `@property` 为装饰值增加类型和插值能力。下一课会用层、嵌套和作用域控制这些契约的样式优先级。

## 单元导航

- [返回第九章目录](../README.md#第九章现代-css-组件与系统环境)
- [下一课：层叠层、原生嵌套与作用域](02-layers-nesting-scope.md)
- [上一章：变换、过渡与可取消动画](../README.md#第八章变换过渡与可取消动画)
- [返回 CSS 模块](../README.md)
