# 规则、解析与接入位置：先判断声明是否进入候选集

## 任务卡

- **任务**：建立 CSS 解析观察台，区分语法错误、未知属性、计算值阶段失效和资源加载失败。
- **产出**：`practice/css-01-01/minimal.html` 与 `practice/css-01-01/market.html` 两个完整单文件页面。
- **运行**：可直接双击；检查 HTTP 证据时在 `practice/css-01-01` 执行 `python3 -m http.server 8000`，访问 `http://localhost:8000/market.html`。
- **完成证据**：页面截图、Styles/Computed 截图、一次 Network 响应记录和一份五段式诊断。
- **边界**：页面是静态教学数据，不保存商品，不代表生产接口。

## 1. 任务背景

邻里集市准备给价格、库存和按钮加样式。若一条声明没有效果，原因可能发生在不同阶段：样式表没加载、规则没解析、选择器没匹配、值在计算时失效，或合法声明被层叠覆盖。只盲调数字会混淆这些问题。

本单元先回答“这条声明有没有资格参与层叠”。下一单元再比较多个合格候选。这样排查顺序与浏览器处理顺序一致。

## 2. 学习目标

完成后你能：

1. 从字符、token、声明、规则到样式表解释 CSS 的容错解析；
2. 区分行内、内部、外部三种作者样式入口及其加载证据；
3. 观察解析时无效与 invalid at computed-value time 的差别；
4. 用 Network、Styles、Computed 建立可复验的失败证据；
5. 在不破坏整张样式表的前提下添加新语法和回退值。

## 3. 预备知识

你需要会创建文件、识别 HTML 元素与属性，并知道浏览器开发者工具的基本入口。建议先关闭缓存以外的网络模拟，避免把离线状态误判为路径错误。

CSS 注释只使用 `/* ... */`。`//` 不是普通 CSS 注释，可能被解析成错误 token。文件统一保存为
UTF-8，外部样式表响应使用正确的 `Content-Type`；本课程不维护额外编码声明。

## 4. 核心理论

浏览器先把字符流分词，再按语法消费 token。合格规则通常形如：

```css
.price {
  color: #185c3b;
  font-weight: 700;
}
```

`.price` 是前置部分，花括号内是声明列表；每条声明由属性名、冒号和值组成。分号不是所有末尾位置都强制，但保留它可避免追加声明时把两条黏在一起。

CSS 采用局部容错。未知属性或属性不接受的值通常使该声明失效，不会停止后续规则：

```css
.price {
  colour: green;       /* 未知属性，被忽略 */
  font-weight: heavy;  /* 值不在该属性语法内，被忽略 */
  color: #185c3b;      /* 仍可生效 */
}
```

自定义属性使“何时失效”更复杂。`--gap: red` 本身是合法 token 序列；当 `padding: var(--gap)` 代入后不符合 padding 语法，声明在计算值阶段失效。若属性可继承，浏览器会采用继承值或初始值，而不会回头采用同一规则中较早的 `padding: 1rem`：

```css
.card {
  padding: 1rem;
  padding: var(--gap);
}
```

因此 fallback 应写在 `var()` 内，如 `padding: var(--gap, 1rem)`；但 fallback 只在变量未定义或 guaranteed-invalid 时使用，不会在变量已定义为 `red` 后替你做类型修复。

三种入口都属于作者来源：

- 外部：`<link rel="stylesheet" href="./market.css">`，可缓存和复用，也有 URL、状态、MIME 类型与 CSP 等加载边界；
- 内部：`<style>`，适合独立实验，不产生单独样式资源请求；
- 行内：`style=""`，与单个元素绑定，普通声明在作者普通样式中位置特殊，但不是“永远最高”。

入口位置不等于完整优先级。样式能否被取到和解析，与它在层叠中能否胜出是两项检查。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 本单元边界 |
| --- | --- | --- |
| `<link rel="stylesheet">` | 加载外部 CSS | `href` 按 URL 解析，不按磁盘直觉解析 |
| `<style>` | 嵌入作者样式表 | 适合本单元完整单文件案例 |
| `style` 属性 | 为一个元素提供声明列表 | 不应成为组件常规组织方式 |
| `@supports` | 按语法支持能力启用规则 | 支持语法不保证视觉一定可用 |
| `var()` | 读取自定义属性并可给缺失回退 | 已定义但类型错误不触发普通 fallback |
| `CSS.supports()` | 询问浏览器是否接受属性和值语法 | 不能证明选择器匹配或资源加载成功 |
| `document.styleSheets` | 查看已接入样式表 | 跨源规则读取可能抛出安全异常 |
| `getComputedStyle()` | 读取解析、层叠和计算后的值 | 返回形式可能规范化，不等于源码文本 |

## 6. 最小可运行案例

创建 `practice/css-01-01/minimal.html`，粘贴完整内容：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CSS 解析观察台</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; }
    .sample {
      --space: 1.25rem;
      max-width: 30rem;
      padding: .5rem;
      padding: var(--space);
      border: 2px solid #718078;
      colour: #185c3b;
      color: #185c3b;
    }
    .broken {
      --space: red;
      padding: .5rem;
      padding: var(--space);
    }
  </style>
</head>
<body>
  <main>
    <h1>CSS 解析观察台</h1>
    <p class="sample">合法变量：内边距应为 20px（默认根字号下）。</p>
    <p class="sample broken">类型错误变量：第二条 padding 在计算值阶段失效。</p>
    <output id="report" aria-live="polite"></output>
  </main>
  <script>
    const cards = [...document.querySelectorAll(".sample")];
    const values = cards.map((card) => getComputedStyle(card).paddingTop);
    document.querySelector("#report").textContent =
      `合法值：${values[0]}；失效后的值：${values[1]}`;
  </script>
</body>
</html>
```

直接打开后，第一项通常报告 `20px`，第二项报告 `0px`，而不是较早声明的 `8px`。在 Styles 中找到被标记的 `colour`；在 Computed 中确认最终 `color` 和 `padding-top`。根字号被用户设置改变时，第一个数值可变化，所以验收应同时记录浏览器缩放与默认字号。

逐步扩展：

1. 删除 `.broken` 的 `--space: red`，观察它继承根本不存在的变量后 `var()` 仍失效；
2. 改为 `padding: var(--space, .5rem)`，确认“未定义”时回退；
3. 再恢复 `--space: red`，确认已定义的类型错误不会采用 `.5rem`；
4. 用 `CSS.supports("padding", "1rem")` 与 `CSS.supports("padding", "red")` 对照语法能力。

## 7. 邻里集市集成案例

创建 `practice/css-01-01/market.html`。这是完整单文件；界面明确标注为静态演示：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市样式接入检查</title>
  <style>
    :root { --brand: #185c3b; --space: 1rem; }
    * { box-sizing: border-box; }
    body { margin: 0; font: 16px/1.6 system-ui, sans-serif; color: #25342c; }
    main { width: min(42rem, 100% - 2rem); margin: 2rem auto; }
    .notice { padding: .75rem 1rem; background: #f0f5f1; }
    .listing {
      margin-block: 1rem;
      padding: var(--card-space, var(--space));
      border: 1px solid #77857d;
      border-radius: .5rem;
    }
    .price { color: var(--brand); font-weight: 700; }
    .status { color: #5b4430; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
  </style>
</head>
<body>
  <main>
    <h1>邻里集市</h1>
    <p class="notice">静态教学页面：商品状态不会保存，也不会发起预约。</p>
    <article class="listing">
      <h2>可调节阅读灯</h2>
      <p class="price">39.00 元</p>
      <p class="status">可预约</p>
      <button type="button">查看演示</button>
    </article>
    <p id="evidence" role="status"></p>
  </main>
  <script>
    const price = document.querySelector(".price");
    const sheets = document.styleSheets.length;
    document.querySelector("#evidence").textContent =
      `已接入 ${sheets} 张样式表；价格计算色为 ${getComputedStyle(price).color}`;
  </script>
</body>
</html>
```

预期按钮可用 Tab 聚焦，价格为深绿色，报告至少一张样式表。若改成外部文件，把 `<style>` 内容移到同目录 `market.css` 并替换为 `<link rel="stylesheet" href="./market.css">`；通过 HTTP 打开后，Network 应出现状态 200、类型为 stylesheet、响应内容为 CSS。该拆分仅用于观察，不是本教程要求新增的仓库文件。

## 8. 常见错误与排查路径

**明确错误示例：**

```html
<link rel="stylesheet" href="./styles/market.css">
```

当实际文件不在 `styles` 目录时，继续改 `.price` 选择器没有意义。

固定排查顺序：

1. Network 中是否存在请求，最终 URL 是否正确；
2. 状态是否 200，响应体是否真是 CSS，Content-Type 是否合理；
3. Sources 或 Styles 中能否找到规则；
4. 规则是否解析、选择器是否匹配；
5. 声明值是否在解析或计算阶段失效；
6. 最后才看它是否被其他候选覆盖。

诊断记录示例：

| 项目 | 记录 |
| --- | --- |
| 现象 | HTTP 页面无任何自定义样式 |
| 证据 | Network 中 `styles/market.css` 返回 404，响应体是服务器 HTML 错误页 |
| 原因 | `href` 相对当前文档 URL 解析，目标目录不存在 |
| 修复 | 改为同目录 `./market.css`，不修改选择器 |
| 复验 | 请求 200，类型为 `text/css`，Styles 可定位 `.price`，Computed 为预期 RGB |

不要用 `!important`、重复粘贴内部样式或关闭浏览器安全检查掩盖加载错误。

## 9. 课后题

1. 为什么未知属性一般不会让后续规则停止？
2. `padding: 1rem; padding: var(--gap);` 且 `--gap: red` 时，为何不保证回退到 `1rem`？
3. 内部样式与外部样式谁一定优先？
4. Network 返回 200 是否足以证明样式生效？

答案：

1. CSS 的错误恢复通常以声明或规则为局部边界，解析器会继续寻找后续可消费结构。
2. 第二条声明在层叠时可先胜出，变量替换后才在计算值阶段失效；浏览器不会重新层叠较早声明。
3. 都属于作者来源，仍要比较重要性、层、特异性等，不由入口名称单独决定。
4. 不足；还要确认最终 URL、响应类型与内容、解析成功、选择器匹配和层叠结果。

## 10. 实践练习

**基础**：在最小案例中新增合法的 `border-radius`，并在 Computed 中记录使用值。
验收：源码声明存在，页面圆角可见，Computed 能定位该属性。

**进阶**：把集成案例临时拆成 `market.css`，通过本地 HTTP 服务记录 URL、状态、类型、传输大小和发起者。
验收：五项证据齐全，恢复单文件后仓库不残留额外练习文件。

**故障注入**：依次制造错误 `href`、`colour` 和 `--card-space: blue`。
验收：三次分别归类为资源、解析、计算值阶段问题；每次修复后刷新并记录复验，不用 `!important`。

## 11. 阶段验收

- [ ] 两个页面均包含 doctype、语言、字符集、视口和可见标题。
- [ ] 能指出最小案例第二项为何不是 `.5rem`。
- [ ] 能通过 Network 证明外部样式是否被正确取回。
- [ ] 能说明静态集市页面的数据与交互边界。
- [ ] 故障记录包含现象、证据、原因、修复、复验五项。
- [ ] 页面在 320px 宽度下没有由固定宽度造成的横向滚动。

## 12. 常见问题

**可以直接双击检查外部 CSS 吗？**
可以观察基本路径与渲染，但 `file:` 没有正常 HTTP 状态和响应头；需要网络证据时启动本地服务器。

**为什么 DevTools 把源码颜色显示成 RGB？**
计算值会规范化序列化。源码 token 与计算后的表示不是同一层证据。

**`CSS.supports()` 为 true 就兼容了吗？**
它只证明当前浏览器接受给定语法。可访问性、视觉结果、旧浏览器和组合特性仍需单独验证。

**能读取所有 `document.styleSheets[i].cssRules` 吗？**
同源样式通常可以；跨源样式表可能因同源策略而抛出 `SecurityError`，不要据此认定样式未加载。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Syntax Module Level 3](https://www.w3.org/TR/css-syntax-3/)
- [CSS Cascading and Inheritance Level 5：值处理](https://www.w3.org/TR/css-cascade-5/#value-stages)
- [MDN：CSS syntax](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_syntax/Syntax)
- [MDN：Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [MDN：CSS.supports()](https://developer.mozilla.org/en-US/docs/Web/API/CSS/supports_static)

兼容边界：自定义属性在现代浏览器中已稳定；`@supports` 与 `CSS.supports()` 不能替代目标浏览器实测。Safari、Firefox、旧 WebView 和禁用样式的辅助场景本次未运行验证。

## 我现在能做到什么

我能先证明样式资源和规则已进入浏览器，再区分解析时错误与计算值阶段失效；我不会用提高权重掩盖路径或语法问题。

## 单元导航

- 章节目录：[本章目录](../README.md#第一章语法层叠与选择器)
- 下一单元：[层叠层、特异性与确定性决策](./02-cascade-layers-specificity.md)
