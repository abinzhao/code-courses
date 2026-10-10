# 层叠层、特异性与确定性决策：让冲突可推导

## 任务卡

- **任务**：为同一价格属性制造多条候选声明，按固定决策表推导唯一胜者。
- **产出**：`practice/css-01-02/minimal.html` 与 `practice/css-01-02/market.html`。
- **运行**：直接打开 HTML；需要稳定 URL 时执行 `python3 -m http.server 8000`。
- **完成证据**：声明候选表、最终 RGB、Styles 层叠轨迹和一次错误修复记录。
- **边界**：重点是作者样式；用户样式、动画与过渡只标明顺序，不在案例中伪造。

## 1. 任务背景

邻里集市的基础规则、商品组件和临时工具类都可能声明 `color`。若团队只靠增加祖先选择器或 `!important` 抢权重，规则会不断升级，且用户无障碍样式更难覆盖。

层叠不是“猜哪个更强”，而是一组按顺序执行的过滤与比较。只要把候选声明放进同一张表，同样输入应得到同样结论。

## 2. 学习目标

完成后你能：

1. 按相关性、来源与重要性、上下文、层、特异性、作用域接近程度、源码顺序判断胜者；
2. 解释普通层与重要层为何采用相反顺序；
3. 正确计算 ID、类/属性/伪类、类型/伪元素组成的特异性元组；
4. 说明 `:where()`、`:is()`、`:not()`、`:has()` 对特异性的不同影响；
5. 用低权重组件规则与明确层顺序替代权重竞赛。

## 3. 预备知识

先完成上一单元，确保只比较已成功加载、解析、条件成立且选择器匹配的声明。打开 DevTools 的 Styles 面板时，注意“被划线”只表示该声明在当前元素和状态下未胜出，不等于语法错误。

本单元用“同一元素的同一属性”比较。父元素的声明与子元素的直接声明不是同一候选集合，继承将在下一单元处理。

## 4. 核心理论

对匹配同一元素、同一属性的声明，使用以下决策顺序：

| 次序 | 问题 | 结论方式 |
| ---: | --- | --- |
| 1 | 声明是否相关 | 选择器匹配，媒体/支持条件成立，值可参与层叠 |
| 2 | 来源与重要性 | 过渡、重要声明、动画、普通声明各有层叠位置 |
| 3 | 封装上下文 | Shadow DOM 等上下文会改变普通/重要声明边界 |
| 4 | 层顺序 | 普通声明后层胜，未分层普通声明高于所有普通层 |
| 5 | 特异性 | 按 `(ID, 类/属性/伪类, 类型/伪元素)` 逐项比较 |
| 6 | 作用域接近程度 | 同权重时，`@scope` 根到目标的跳数少者胜 |
| 7 | 源码顺序 | 前面全部相同，后出现者胜 |

来源与重要性的完整顺序较复杂。日常作者代码至少要记住：普通作者声明高于普通用户代理声明；重要声明顺序会保护用户重要声明；关键帧动画高于普通值，低于重要值；正在运行的过渡有特殊高位置。不要用作者 `!important` 覆盖用户对字号、颜色或动画的必要调整。

层先于特异性比较：

```css
@layer reset, base, components, utilities;
```

普通声明中，`utilities` 高于 `components`，后者高于 `base`；未分层作者普通声明又高于所有有层普通声明。重要声明反向：先声明层的重要规则优先，且有层重要声明高于未分层重要声明。这种反转用于保护早期重要护栏，不是供组件日常竞争。

特异性不是十进制分数。`#item` 的 `(1,0,0)` 高于任意数量类组成的 `(0,n,0)`。组合符 `> + ~ 空格`、通配符 `*` 不增加权重。几个函数规则：

- `:where(...)` 自身及参数贡献始终为 `(0,0,0)`；
- `:is()`、`:not()`、`:has()` 自身不额外加一类，采用参数列表中最大特异性；
- `:nth-child(... of selector-list)` 既有伪类本身的一类，也加参数列表最大值；
- 伪元素计入类型列。

行内普通样式处于作者普通样式的特殊位置，通常高于样式规则；作者重要声明仍可覆盖它。用“虚构的一千特异性”描述会掩盖它不是选择器这一事实。

`@scope` 的接近程度只在此前维度打平后判断，旧浏览器兼容需要核对，因此本单元用支持查询渐进启用。

## 5. 元素、属性、API 或配置清单

| 语法 | 作用 | 注意 |
| --- | --- | --- |
| `@layer a, b` | 预先固定层顺序 | 首次顺序声明很关键 |
| `@layer name {}` | 把规则放入命名层 | 嵌套层有完整层名 |
| `!important` | 改变声明重要性 | 会反转来源与层比较，不是常规修复 |
| `:where()` | 零特异性匹配 | 适合可覆盖的基础规则 |
| `:is()` | 合并选择器分支 | 参数最大特异性影响整个匹配 |
| `:not()` | 排除匹配 | 参数仍参与特异性 |
| `:has()` | 按相对选择器匹配主体 | 需限制范围并核对旧环境 |
| `@scope` | 限定规则作用范围 | 接近程度晚于特异性比较 |
| `element.style` | CSSOM 行内声明对象 | 不应用于随意提高权重 |
| `getComputedStyle()` | 获取最终计算值 | 可作为结果证据，不能单独说明原因 |

## 6. 最小可运行案例

创建 `practice/css-01-02/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>层叠决策台</title>
  <style>
    @layer base, components, utilities;
    @layer base {
      #demo { color: #a42828; }
    }
    @layer components {
      :where(.panel) .value { color: #185c3b; }
    }
    @layer utilities {
      .text-accent { color: #175ca2; }
    }
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; }
    .panel .value { color: #6b3f82; }
  </style>
</head>
<body>
  <main class="panel">
    <h1>层叠决策台</h1>
    <p id="demo" class="value text-accent">观察我的颜色</p>
    <output id="report"></output>
  </main>
  <script>
    const target = document.querySelector("#demo");
    document.querySelector("#report").textContent =
      `最终计算色：${getComputedStyle(target).color}`;
  </script>
</body>
</html>
```

预期为紫色 `rgb(107, 63, 130)`。虽然 base 中有 ID，但最后一条是未分层普通声明；比较在“层”这一步已经结束，不再比较 ID。删除未分层规则后，utilities 层的蓝色胜过 components 与 base；再删除 utilities 候选，components 的绿色胜过 base 的 ID。

逐步实验并记录每一步：

1. 保持所有声明，写出四条候选及所在层；
2. 删除未分层规则，确认蓝色；
3. 删除 utilities 规则，确认绿色；
4. 给 base 的 ID 加 `!important`，确认重要声明击败普通声明；
5. 立即撤销 `!important`，避免把故障注入留在正确案例。

## 7. 邻里集市集成案例

创建 `practice/css-01-02/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市层叠方案</title>
  <style>
    @layer reset, base, components, utilities;
    @layer reset {
      *, *::before, *::after { box-sizing: border-box; }
      button { font: inherit; }
    }
    @layer base {
      body { margin: 0; font: 16px/1.6 system-ui, sans-serif; color: #26352d; }
      a { color: #165b8f; }
    }
    @layer components {
      .market { width: min(46rem, 100% - 2rem); margin: 2rem auto; }
      .listing { padding: 1rem; border: 1px solid #78877e; border-radius: .5rem; }
      :where(.listing) .price { color: #185c3b; font-weight: 700; }
      :where(.listing) .status { color: #5b4430; }
      .listing + .listing { margin-block-start: 1rem; }
      :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
    }
    @layer utilities {
      .is-sold { color: #6b4b3e; text-decoration: line-through; }
    }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p>静态演示：价格以整数分作为数据概念，页面仅格式化显示。</p>
    <article class="listing">
      <h2>折叠椅</h2>
      <p class="price">45.00 元</p>
      <p class="status">可预约</p>
      <a href="#details">查看说明</a>
    </article>
    <article class="listing">
      <h2>玻璃花瓶</h2>
      <p class="price is-sold">20.00 元</p>
      <p class="status">已售</p>
    </article>
    <p id="details" tabindex="-1">演示说明：没有真实预约接口。</p>
    <output id="evidence"></output>
  </main>
  <script>
    const prices = [...document.querySelectorAll(".price")];
    const colors = prices.map((node) => getComputedStyle(node).color);
    document.querySelector("#evidence").textContent =
      `可预约价格：${colors[0]}；已售价格：${colors[1]}`;
  </script>
</body>
</html>
```

第一个价格由 components 层得到绿色；第二个同时匹配 `.price` 与 utilities 的 `.is-sold`，后声明层胜出。组件用 `:where(.listing)` 保持低权重，使工具类无需增加祖先或 ID。DOM 中商品顺序没有为视觉结果重排。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
#app main .market article.listing p.price { color: #185c3b !important; }
.listing .price { color: #6b4b3e !important; }
```

两个重要声明把普通组件冲突升级到重要性维度；后续只能继续比较层与特异性，且更难让用户样式控制颜色。

排查时从 Styles 收集候选，不先改代码：

1. 确认候选属于同一元素与属性；
2. 标记普通或 important；
3. 标记命名层或未分层；
4. 只对仍打平的候选计算特异性；
5. 检查 scope 接近程度和源码顺序；
6. 用 Computed 复验结果。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 已售工具类无法覆盖商品价格 |
| 证据 | Styles 显示组件规则带 `!important`，工具类是普通声明 |
| 原因 | 比较在重要性阶段结束，与工具类写在后面或特异性无关 |
| 修复 | 删除不必要的 important；组件放 components 层，覆盖规则放 utilities 层 |
| 复验 | 已售价格变为棕色；普通价格仍为绿色；键盘焦点未受影响 |

## 9. 课后题

1. `#demo` 一定压过 `.value` 吗？
2. 十个类选择器能否“进位”超过一个 ID？
3. `:where(#app) .price` 的特异性是多少？
4. 同一层、同一特异性的两个 `@scope` 规则如何继续决胜？
5. 为什么不应把行内样式简单记作 `(1,0,0,0)` 后参与普通元组运算？

答案：

1. 不一定；层在特异性之前比较，重要性也可能先决定结果。
2. 不能；元组逐列比较，类列不会向 ID 列进位。
3. `(0,1,0)`，`:where()` 及其参数为零，只有 `.price` 贡献一类。
4. 比较 scope 根到目标元素的接近程度；仍相同才看源码顺序。
5. style 属性不是选择器，层叠规范对它有专门位置；虚构位数容易误导其他维度。

## 10. 实践练习

**基础**：给集成案例添加 `featured` 类，在 components 层让精选商品边框加粗。
验收：不使用 ID 和 important，非精选商品不变。

**进阶**：新增 overrides 层并预先放在 utilities 之后；写出普通声明层顺序与重要声明层顺序。
验收：能用两次故障实验验证顺序反转，实验后撤销 important。

**故障注入**：把 `.price` 改成 `#app .market .listing .price !important`，尝试只靠后写普通类覆盖。
验收：先记录失败，再用删除不必要 important 和恢复层职责修复；不得保留不断加权的选择器。

## 11. 阶段验收

- [ ] 能不看页面颜色，先从候选表推导最小案例的紫色。
- [ ] 删除规则后的三种颜色与推导一致。
- [ ] 能计算本单元出现的所有选择器特异性。
- [ ] 集市组件、工具规则和基础规则职责分层清楚。
- [ ] 没有把 `!important` 留在正确实现中。
- [ ] 320px 宽度、200% 浏览器缩放下内容仍可阅读。

## 12. 常见问题

**是不是所有代码都应该放进 layer？**
团队可以选择完整分层，但要先约定第三方、基础、组件和覆盖层顺序。混用时必须意识到未分层普通声明高于所有普通层。

**后写 layer 块会改变层顺序吗？**
命名层的首次出现确定位置；推荐在顶部用一条顺序语句集中声明，后续同名块会追加到该层。

**提高特异性会提高性能吗？**
选择器权重与性能不是同一指标。先保持作用域清晰和可维护，不用权重作为性能工具。

**`@scope` 可以直接用于所有目标环境吗？**
不能仅凭现代 Chromium 下可用就下结论。应结合目标浏览器支持矩阵，并提供不依赖 scope 的基础层结构。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Cascading and Inheritance Level 5](https://www.w3.org/TR/css-cascade-5/)
- [CSS Cascading Level 6：Scoping Proximity](https://www.w3.org/TR/css-cascade-6/)
- [Selectors Level 4：Specificity](https://www.w3.org/TR/selectors-4/#specificity-rules)
- [MDN：Cascade](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Cascade)
- [MDN：Specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascade/Specificity)
- [MDN：@layer](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)

兼容边界：Cascade Layers 和现代函数伪类在当前主流浏览器中已有较好支持；`@scope`、嵌套层与旧 WebView 仍应按产品基线核对。用户样式、Shadow DOM、关键帧和过渡的完整优先级未在本页运行验证。

## 我现在能做到什么

我能把冲突声明整理成确定性决策表，在正确维度修复问题；我不会用更长选择器或 `!important` 替代层职责设计。

## 单元导航

- 上一单元：[规则、解析与接入位置](./01-rules-parsing-entry-points.md)
- 下一单元：[选择器、伪类与继承](./03-selectors-pseudo-classes-inheritance.md)
