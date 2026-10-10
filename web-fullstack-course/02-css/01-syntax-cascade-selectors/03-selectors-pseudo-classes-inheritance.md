# 选择器、伪类与继承：从 DOM 关系得到可维护状态

## 任务卡

- **任务**：用结构、属性与交互状态选择器装饰商品列表，并证明继承与直接声明的边界。
- **产出**：`practice/css-01-03/minimal.html` 与 `practice/css-01-03/market.html`。
- **运行**：直接打开页面，依次用鼠标、Tab、Space 和地址片段触发状态。
- **完成证据**：选择器匹配表、焦点截图、最终颜色记录及 DOM 关系故障诊断。
- **边界**：CSS 只依据 DOM 可见状态呈现页面，不能代替后端库存、身份或对象授权。

## 1. 任务背景

邻里集市需要区分可预约、已售和精选商品，还要为键盘用户保留焦点。把这些状态写成 `style` 属性会让结构、业务和外观耦合；用过宽的后代选择器又可能误伤嵌套组件。

选择器解决“哪些元素成为候选”，继承解决“元素没有直接胜出声明时从哪里取得值”。两者常同时出现，但不能用父元素高权重解释子元素最终值。

## 2. 学习目标

完成后你能：

1. 使用类型、类、ID、属性、关系选择器准确限定匹配范围；
2. 用结构、表单和交互伪类表达浏览器已知状态；
3. 正确使用 `:is()`、`:where()`、`:not()`、`:has()` 和常见伪元素；
4. 区分继承、初始值、浏览器默认样式与直接声明；
5. 在 DOM 变化导致选择器失效时，从关系证据而非屏幕位置定位问题。

## 3. 预备知识

先掌握上一单元的层叠顺序。用 Elements 面板确认真实 DOM，而不是只看 React/Vue 源码设想或视觉位置。属性选择器匹配的是序列化到 DOM 的属性；它看不到脚本闭包中的变量或服务器数据库。

练习时不要移除浏览器焦点轮廓，除非提供至少同等清晰的替代。悬停不能作为触摸设备唯一入口。

## 4. 核心理论

基础选择器：

- `article` 按元素类型匹配；
- `.listing` 按 class 空白词匹配；
- `#featured` 按 ID 匹配，文档中 ID 应唯一；
- `[data-status="sold"]` 按属性和值匹配；
- `*` 匹配任意元素，但不贡献特异性。

组合符表达树关系，不表达屏幕距离：

| 选择器 | DOM 条件 |
| --- | --- |
| `.list p` | `.list` 任意深度后代中的 `p` |
| `.list > li` | `.list` 的直接 `li` 子元素 |
| `h2 + p` | 与 `h2` 同父且紧随其后的 `p` |
| `h2 ~ p` | 与 `h2` 同父且位于其后的所有 `p` |
| `h1, h2` | 两组匹配结果并集 |

属性运算包括存在 `[disabled]`、精确 `=`、空白词 `~=`、语言前缀 `|=`、开头 `^=`、结尾 `$=` 和包含 `*=`。字符串模式只能表达文本形态，不能验证 URL 安全或权限。

结构伪类依据元素兄弟关系。`:first-child` 看是否第一个元素兄弟；`:nth-child(2n)` 按所有元素计数；`:nth-of-type(2n)` 按同类型计数。`:nth-child(2 of .listing)` 先过滤再计数，但目标旧环境需核对。

状态伪类由浏览器状态驱动：`:checked`、`:disabled`、`:required`、`:valid`、`:invalid`、`:focus`、`:focus-visible`、`:focus-within`。`:hover` 在触摸与混合输入设备上不可靠。`:visited` 有隐私限制，脚本和可用属性被刻意约束。

伪元素选择元素的一部分或生成呈现盒，如 `::before`、`::after`、`::marker`、`::selection`、`::placeholder`。生成内容不应承载商品名、价格或错误信息等唯一信息，因为复制、翻译和辅助技术支持不一致。

继承发生在每个属性自己的值处理过程中。`color`、`font-family` 通常继承；`margin`、`padding`、`border` 通常不继承。子元素存在直接胜出声明时，该值优先于继承，无需与父元素选择器的特异性跨元素比较。

控制关键词：

- `inherit`：显式使用父元素计算值；
- `initial`：使用规范定义的初始值，不等于用户代理样式；
- `unset`：继承属性等同 inherit，非继承属性等同 initial；
- `revert`：回退当前来源带来的效果；
- `revert-layer`：回退当前层的效果。

## 5. 元素、属性、API 或配置清单

| 项目 | 用途 | 边界 |
| --- | --- | --- |
| `[attr]` / `[attr=value]` | 匹配 DOM 属性 | 布尔属性存在即为真，`disabled="false"` 仍是禁用 |
| `:focus-visible` | 在启发式需要时显示焦点 | 不要再用 `outline: none` 清除 |
| `:focus-within` | 后代聚焦时匹配容器 | 可增强分组反馈 |
| `:has(relative-selector)` | 按后代或兄弟状态匹配主体 | 限定组件范围并准备旧环境基础样式 |
| `:is()` / `:where()` | 压缩选择器列表 | 两者特异性规则不同 |
| `::before` / `::after` | 装饰性生成内容 | 唯一业务信息必须留在 DOM |
| `matches()` | 脚本检查元素是否匹配选择器 | 非法选择器会抛出异常 |
| `querySelectorAll()` | 返回静态匹配集合 | DOM 后续变化不会自动更新旧集合 |
| `inherit` / `initial` | 控制指定值 | initial 不是“恢复浏览器按钮样式” |
| `revert` / `revert-layer` | 回退来源或层 | 结果依赖此前来源与层规则 |

## 6. 最小可运行案例

创建 `practice/css-01-03/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>选择器与继承观察台</title>
  <style>
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; }
    #parent { color: #a42828; border: 2px solid currentColor; padding: 1rem; }
    #parent > p { color: #185c3b; }
    #parent > p + button { margin-inline-start: .5rem; }
    #toggle:checked ~ #parent { background: #eef6f0; }
    #parent:focus-within { box-shadow: 0 0 0 4px #c5ddcd; }
    button:focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
  </style>
</head>
<body>
  <h1>选择器与继承观察台</h1>
  <input id="toggle" type="checkbox">
  <label for="toggle">突出容器</label>
  <section id="parent">
    <p id="child">子元素有直接绿色声明。</p>
    <button type="button">用 Tab 聚焦</button>
  </section>
  <output id="report"></output>
  <script>
    const parent = document.querySelector("#parent");
    const child = document.querySelector("#child");
    document.querySelector("#report").textContent =
      `父级 ${getComputedStyle(parent).color}；子级 ${getComputedStyle(child).color}`;
  </script>
</body>
</html>
```

父级 ID 给出红色，子级类型规则给出绿色。子级直接声明优先于继承红色，不能比较 `#parent` 与 `p` 的特异性来反驳。边框使用 `currentColor`，所以父容器边框跟随红色。

逐步扩展：

1. 删除 `#parent > p`，确认子元素继承红色；
2. 恢复规则并改为 `color: inherit`，再次确认红色；
3. 勾选复选框，确认相邻后续兄弟关系成立；
4. 将 section 临时移到 input 之前，确认视觉距离接近也不能满足 `~`；
5. 恢复 DOM，用 Tab 聚焦按钮并观察 `:focus-within`。

## 7. 邻里集市集成案例

创建 `practice/css-01-03/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市状态选择器</title>
  <style>
    @layer base, components;
    @layer base {
      * { box-sizing: border-box; }
      body { margin: 0; font: 16px/1.6 system-ui, sans-serif; color: #26352d; }
      button { font: inherit; }
    }
    @layer components {
      .market { width: min(46rem, 100% - 2rem); margin: 2rem auto; }
      .filters { display: inline-block; padding: .75rem; background: #eef4f0; }
      .list { padding: 0; list-style: none; }
      .listing { padding: 1rem; border: 1px solid #78877e; border-radius: .5rem; }
      .listing + .listing { margin-block-start: 1rem; }
      .listing[data-status="sold"] { background: #f5efeb; }
      .listing[data-status="sold"] .price { text-decoration: line-through; }
      .listing:not([data-status="sold"]) .status { color: #185c3b; }
      .listing:has(button:focus-visible) { box-shadow: 0 0 0 4px #c5ddcd; }
      :where(.listing) .price { font-weight: 700; }
      button:focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
      #sold-only:checked ~ .list .listing:not([data-status="sold"]) { display: none; }
    }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p>静态演示：筛选只改变呈现，不修改商品状态。</p>
    <input id="sold-only" type="checkbox">
    <label class="filters" for="sold-only">只看已售商品</label>
    <ul class="list">
      <li class="listing" data-status="available">
        <h2>儿童绘本套装</h2>
        <p class="price">28.00 元</p>
        <p class="status">可预约</p>
        <button type="button">查看静态详情</button>
      </li>
      <li class="listing" data-status="sold">
        <h2>陶瓷马克杯</h2>
        <p class="price">12.00 元</p>
        <p class="status">已售</p>
      </li>
    </ul>
    <output id="evidence" aria-live="polite"></output>
  </main>
  <script>
    const checkbox = document.querySelector("#sold-only");
    const output = document.querySelector("#evidence");
    function report() {
      const visible = [...document.querySelectorAll(".listing")]
        .filter((item) => getComputedStyle(item).display !== "none").length;
      output.textContent = `当前呈现 ${visible} 件商品；数据仍为 2 件。`;
    }
    checkbox.addEventListener("change", report);
    report();
  </script>
</body>
</html>
```

`data-status` 是静态 DOM 状态，仅用于本页样式演示。真实应用必须以后端返回并校验的库存状态为准。`:has()` 只增强焦点容器，旧环境不支持时按钮自身焦点仍清晰，核心操作不丢失。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
.filters input:checked + .list .listing { display: none; }
```

在集成 DOM 中，`input`、`label.filters` 与 `.list` 都是 `main` 的子元素。错误选择器首先要求“`.filters` 内存在已选中的 input”，但真实 input 是 `.filters` 的前一个兄弟；即使去掉 `.filters`，`+ .list` 也会失败，因为 input 的紧邻兄弟是 label。正确规则使用 input 的后续同父兄弟关系：`#sold-only:checked ~ .list ...`。

排查路径：

1. 在 Elements 中选中目标元素，不凭视觉位置猜树关系；
2. 用 `document.querySelectorAll("选择器").length` 检查匹配数量；
3. 从右向左逐段缩短选择器，找出第一个关系断点；
4. 检查 DOM 属性是否真实存在及拼写、大小写；
5. 再检查伪类状态是否能由当前输入方式触发；
6. 匹配成功后才进入层叠与继承排查。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 勾选“只看已售”后列表没有变化 |
| 证据 | 控制台查询错误选择器返回 0；Elements 显示 input、label 和 list 同父，input 紧邻的是 label |
| 原因 | `.filters input` 的后代条件不成立；`+ .list` 的紧邻条件也不成立 |
| 修复 | 保持现有同父结构，改用 `#sold-only:checked ~ .list ...` |
| 复验 | 勾选后可预约项隐藏，输出报告呈现 1 件、数据仍 2 件 |

## 9. 课后题

1. `[disabled="false"]` 的按钮是否启用？
2. `:nth-child(2)` 与 `:nth-of-type(2)` 有何差异？
3. 父级 `#app { color: red }` 与子级 `p { color: green }` 谁决定段落颜色？
4. 为什么不能只用 `::before` 写“已售”？
5. `:hover` 为什么不能承载唯一详情入口？

答案：

1. 不启用；HTML 布尔属性以存在为真，应移除属性才能启用。
2. 前者按所有元素兄弟计数，后者只按相同元素类型计数。
3. 子级直接声明绿色；继承只在子级没有自己的胜出值时提供值。
4. 生成内容的可访问性、复制和翻译行为不稳定，唯一状态应在真实文本中。
5. 触摸、键盘和部分辅助技术无法稳定触发 hover，入口必须可点击和聚焦。

## 10. 实践练习

**基础**：为 `data-status="available"` 的商品添加左边框，不能影响已售项。
验收：属性选择器命中数为 1，页面状态文字仍存在。

**进阶**：用 `:is(h2, .price)` 设置一致的段落间距，再用 `:where()` 版本比较特异性。
验收：写出两者元组并在 Styles 中制造一次可解释覆盖。

**故障注入**：把复选框移入 `.filters` 内但保留原兄弟选择器。
验收：记录匹配数 0 的证据；选择恢复结构或增加一个脚本状态类修复，并说明为何 CSS 不能跨父级向上寻找普通兄弟。

## 11. 阶段验收

- [ ] 能为所有组合符画出实际 DOM 关系。
- [ ] 鼠标、Tab 和 Space 均有可观察状态，不依赖 hover 完成任务。
- [ ] 能证明父级高特异性不会与子级直接声明跨元素竞争。
- [ ] `:has()` 失效时仍保留按钮自身焦点与真实状态文字。
- [ ] 筛选输出明确区分“呈现数量”和“数据数量”。
- [ ] 错误选择器诊断完整且修复后匹配数符合预期。

## 12. 常见问题

**什么时候用 class，什么时候用 data 属性？**
组件外观通常用 class；已有业务枚举状态可映射为稳定 data 属性。两者都不能成为可信业务校验。

**`:empty` 能判断列表没有商品吗？**
它取决于 DOM 子节点，空白文本等细节也有规范演进。业务空状态应根据真实数据长度渲染可见说明。

**`:has()` 会很慢吗？**
不能脱离选择范围和 DOM 更新频率一概而论。把主体限制在组件内，避免从通配根节点做宽范围关系搜索，并以性能测量为准。

**`all: unset` 能快速重置按钮吗？**
它会移除大量有用默认值；若使用，必须恢复可辨识按钮形态、焦点、命中区域和禁用状态。默认不建议在基础学习中这样做。

## 13. 扩展阅读

资料快照：2026-10-11。

- [Selectors Level 4](https://www.w3.org/TR/selectors-4/)
- [CSS Cascading and Inheritance Level 5](https://www.w3.org/TR/css-cascade-5/)
- [MDN：CSS selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_selectors)
- [MDN：Inheritance](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Inheritance)
- [MDN：:focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible)
- [MDN：:has()](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)

兼容边界：`:focus-visible` 与 `:has()` 在当前主流浏览器中已可用，但旧版 Safari、Firefox、Android WebView 仍需按产品基线验证；`:nth-child(... of S)` 和伪类组合也不可只凭单一 Chromium 结论。屏幕阅读器未在本单元实测。

## 我现在能做到什么

我能根据真实 DOM 写出边界明确的选择器，区分匹配、层叠和继承，并为鼠标、键盘及旧环境保留核心信息和操作。

## 单元导航

- 上一单元：[层叠层、特异性与确定性决策](./02-cascade-layers-specificity.md)
- 下一单元：[02 值、颜色与单位章入口](../02-values-colors-units.md)
