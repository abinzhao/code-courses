# 增长、收缩、基准与自动最小尺寸：按算法分配自由空间

## 任务卡

- **任务**：手算两个 Flex 项目的正/负自由空间分配，并修复长商品编号造成的自动最小尺寸溢出。
- **产出**：`practice/css-05-02/minimal.html` 与 `practice/css-05-02/market.html`。
- **运行**：直接打开；按钮切换 600px 与 300px 容器，页面报告实际项目宽度。
- **完成证据**：两组分配算式、实际宽度误差、自动 min-size 修复前后 scrollWidth。
- **边界**：完整 Flex 算法包含 min/max 冻结循环；简单比例只在无约束触发时成立。

## 1. 任务背景

邻里集市一侧是商品说明，另一侧是价格和按钮。写 `flex: 1` 后两列不一定“平均”，因为 flex-basis、内容最小尺寸、padding 和 min/max 都会参与。容器变窄时，长编号还可能让说明列拒绝收缩，最终把操作按钮推到屏外。

Flexbox 不是把剩余像素随意分掉。它先确定 base size，再计算自由空间，按 grow 或“shrink × base size”的比例分配，并在碰到 min/max 时冻结项目、重复计算。

## 2. 学习目标

完成后你能：

1. 解释 flex base size 与 hypothetical main size 的区别；
2. 区分 `flex-basis: auto`、`0`、`content` 与 definite basis；
3. 手算正自由空间的 grow 分配；
4. 手算负自由空间的 scaled shrink factor；
5. 识别 `min-inline-size: auto` 内容下限并选择 `min-inline-size: 0` 或换行修复。

## 3. 预备知识

需要掌握主轴、line、内在尺寸和盒模型。计算前先确认容器主轴 content box、项目外部 flex base size、margin 和 gap。以下数值案例不含 padding/border/margin，便于与公式直接对账。

浏览器可能产生子像素并在绘制时舍入，所以几何值允许小数。多行容器每条 line 单独计算，不能把所有项目跨行统一分配。

## 4. 核心理论

三个独立长写属性：

```css
.item {
  flex-grow: 1;
  flex-shrink: 1;
  flex-basis: auto;
}
```

常见简写：

| 简写 | 常见展开 | 意图 |
| --- | --- | --- |
| `flex: initial` | `0 1 auto` | 不增长，可收缩，以 auto 为基准 |
| `flex: auto` | `1 1 auto` | 可增可缩，保留 auto 基准差异 |
| `flex: none` | `0 0 auto` | 不增不缩 |
| `flex: 1` | 通常 `1 1 0%` | 从近零基准均分自由空间，仍受 min-size |
| `flex: 1 1 12rem` | 明确三项 | 以 12rem 基准参与分配 |

`flex-basis: auto` 先查看主轴尺寸属性（row 中通常 width/inline-size）：若它是确定值，用该值；否则回到 content。`content` 直接基于内容贡献。`0` 与 `0%` 在不确定容器主尺寸下存在求值差异，简写序列化也可能使用 0%，不要在复杂不确定尺寸中把它们绝对等同。

正自由空间示例：

```text
容器 600 - gap 20 - base(200 + 100) = +280
grow 比 1 : 2
A = 200 + 280 × 1/3 = 293.33
B = 100 + 280 × 2/3 = 286.67
```

grow 因子不是最终宽度比例；它只分配正自由空间。基础尺寸不同，最终值可不同。

负自由空间使用 scaled shrink factor：

```text
容器 300 - gap 20 - base(200 + 100) = -20
scaled factors = 1×200 : 1×100 = 2 : 1
A = 200 - 20 × 2/3 = 186.67
B = 100 - 20 × 1/3 = 93.33
```

乘以 base size 可避免大项目与小项目都减相同像素后，小项目过度受损。若某项目碰到 min/max 限制，它会被 clamp、冻结，再用剩余项目重新分配；因此实际复杂结果不是一次公式。

Flex item 主轴的 `min-width/min-inline-size: auto` 通常形成内容相关自动最小尺寸。长不可断字符串、图片和表单控件会让项目拒绝缩小。常见修复组合：

```css
.details {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}
```

第一条允许 item 小于内容最小尺寸，第二条让内容自身可读地换行。只写 hidden 会裁证据；只写 min-inline-size 0 但内容不换行，内容仍可能绘制溢出。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 注意 |
| --- | --- | --- |
| `flex-grow` | 分配正自由空间的因子 | 不是最终尺寸比例 |
| `flex-shrink` | 参与负自由空间 | 实际权重乘 base size |
| `flex-basis` | 确定初始主尺寸 | auto 会查主尺寸属性/内容 |
| `flex` | 三项简写 | 单值数字常展开为 0% basis |
| `min-inline-size` | 主轴为 row 时常见缩小下限 | auto 的内容下限是常见溢出根因 |
| `max-inline-size` | 增长上限 | 触发冻结后会重新分配 |
| `width/inline-size` | auto basis 的可能输入 | basis 非 auto 时通常由 basis 主导 |
| `overflow-wrap` | 给长内容断点 | 与 item 是否允许缩小是两层问题 |
| `scrollWidth/clientWidth` | 检查内容溢出 | 需分别检查根和项目 |
| `getBoundingClientRect()` | 对账最终边框盒 | padding/border 会影响算式 |

## 6. 最小可运行案例

创建 `practice/css-05-02/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Flex 自由空间计算台</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; }
    .demo { display: flex; gap: 20px; inline-size: 600px; max-inline-size: 100%; outline: 2px solid #718078; }
    .demo.negative { inline-size: 300px; }
    .a { flex: 1 1 200px; background: #dce9e0; }
    .b { flex: 2 1 100px; background: #eadfd6; }
    .item { min-inline-size: 0; min-block-size: 4rem; }
    button { margin-block: 1rem; min-block-size: 2.75rem; font: inherit; }
    output { display: block; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main>
    <h1>Flex 自由空间计算台</h1>
    <div class="demo">
      <div class="item a">A: 1 1 200px</div>
      <div class="item b">B: 2 1 100px</div>
    </div>
    <button id="toggle" type="button">切换 600px / 300px</button>
    <output id="report"></output>
  </main>
  <script>
    const demo = document.querySelector(".demo");
    const output = document.querySelector("#report");
    function report() {
      const [a, b] = [...demo.children].map((item) => item.getBoundingClientRect().width);
      output.textContent = [
        `容器边框盒：${demo.getBoundingClientRect().width.toFixed(2)}px`,
        `A：${a.toFixed(2)}px`,
        `B：${b.toFixed(2)}px`,
        demo.classList.contains("negative")
          ? "负空间：shrink 权重按 200:100 分配"
          : "正空间：grow 权重按 1:2 分配"
      ].join("\\n");
    }
    document.querySelector("#toggle").addEventListener("click", () => {
      demo.classList.toggle("negative");
      requestAnimationFrame(report);
    });
    report();
  </script>
</body>
</html>
```

600px 时预期 A/B 约为 293.33/286.67。300px 时注意 B 的 grow 是 2，但负空间只看 shrink，两者 shrink 都为 1，因此 scaled 因子是 200:100，结果约 186.67/93.33。若视口小于声明容器，max-inline-size 会改变可用尺寸，验收时应保证视口足够宽或以实际容器值重算。

逐步扩展：

1. 把 B shrink 改为 0，推导所有负空间由 A 承担的边界；
2. 给 B 加 `min-inline-size: 120px`，观察 clamp 与重新分配；
3. 将两者 basis 都改为 0，观察 grow 1:2 更接近最终尺寸比例；
4. 增加 padding 后把外部 base size纳入算式。

## 7. 邻里集市集成案例

创建 `practice/css-05-02/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市 Flex 收缩</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font: 1rem/1.65 system-ui, sans-serif; color: #26352d; }
    .market { inline-size: min(48rem, 100% - 2rem); margin: 2rem auto; }
    .listing {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid #78877e;
      border-radius: .5rem;
    }
    .details { flex: 1 1 20rem; min-inline-size: 0; }
    .details h2 { margin-block-start: 0; }
    .identifier { overflow-wrap: anywhere; }
    .commerce { flex: 0 1 10rem; min-inline-size: 8rem; }
    .price { margin-block-start: 0; color: #185c3b; font-weight: 700; }
    button { inline-size: 100%; min-block-size: 2.75rem; font: inherit; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
    @media (max-width: 28rem) {
      .listing { flex-wrap: wrap; }
      .commerce { flex: 1 1 100%; }
    }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p>静态演示：按钮不创建预约。</p>
    <article class="listing">
      <div class="details">
        <h2>便携式多用途维修工具组合</h2>
        <p class="identifier">编号：listing_2026_neighborhood_market_very_long_identifier_without_spaces</p>
        <p>说明列允许缩小，长编号在必要时换行。</p>
      </div>
      <div class="commerce">
        <p class="price" data-price-cents="8800">88.00 元</p>
        <button type="button">查看静态说明</button>
      </div>
    </article>
    <output id="evidence"></output>
  </main>
  <script>
    const root = document.documentElement;
    const details = document.querySelector(".details");
    document.querySelector("#evidence").textContent =
      `页面横向溢出：${root.scrollWidth > root.clientWidth ? "是" : "否"}；` +
      `说明区内容溢出：${details.scrollWidth > details.clientWidth ? "是" : "否"}。`;
  </script>
</body>
</html>
```

details 用 `min-inline-size: 0` 解除 Flex item 的自动内容下限，长编号用 anywhere 提供断点；commerce 保留 8rem 操作下限。极窄时允许换行，让操作区占整行。这是媒体查询辅助结构断点；核心收缩仍由 Flex 算法解释。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
.details { flex: 1 1 auto; }
.identifier { white-space: nowrap; }
html, body { overflow-x: hidden; }
```

details 的 auto min-size 被长编号撑大，nowrap 阻止断行，最后根裁剪隐藏按钮和焦点。

排查路径：

1. 写出容器主尺寸、gap 和项目外部 base sizes；
2. 计算正/负自由空间；
3. 选择 grow 或 scaled shrink factor；
4. 检查 min/max clamp 与被冻结项目；
5. 检查 auto min-size、长内容和替换元素；
6. 同时复验项目 scrollWidth 与根 scrollWidth，不隐藏根溢出。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 长编号把价格按钮推到 320px 视口外 |
| 证据 | details scrollWidth/min-content 大于可用宽；默认 min-inline-size 为 auto |
| 原因 | Flex item 自动最小尺寸阻止收缩，编号又没有换行机会 |
| 修复 | details 设置 min-inline-size 0，编号设置 overflow-wrap anywhere，窄屏允许 commerce 换行 |
| 复验 | 根与 details 均无横向溢出，按钮完整且 Tab 焦点可见 |

## 9. 课后题

1. `flex-grow: 2` 是否表示最终宽度一定是 grow 1 项目的两倍？
2. 负自由空间为什么乘 flex base size？
3. `flex-basis: auto` 一定等于内容尺寸吗？
4. `flex: 1` 后为何长文本仍可能不收缩？
5. `min-inline-size: 0` 是否会自动换行长 token？

答案：

1. 不一定，只表示分配正自由空间时的相对因子，base/min/max 仍影响结果。
2. 让较大项目按其基准承担更多收缩，避免小项目被同像素过度压缩。
3. 不一定；若主尺寸属性有确定值，auto basis 会使用它，否则才回到内容。
4. 默认自动最小尺寸仍可能由 min-content 决定，限制项目缩小。
5. 不会，它允许 item 缩小；内容还需合法断点或 overflow 策略。

## 10. 实践练习

**基础**：手算 720px 容器、20px gap、bases 240/160、grow 1/3 的结果。
验收：自由空间 300，最终 315/385；总和加 gap 为 720。

**进阶**：给第二项设置 max 300px，按冻结思路重新分配剩余空间。
验收：说明为什么一次 1:3 公式不再是最终结果，并与浏览器几何值对账。

**故障注入**：移除 min-inline-size 0 并设置编号 nowrap。
验收：记录根/项目 scrollWidth；恢复两层修复后在 320px 和 200% 复验。

## 11. 阶段验收

- [ ] 600px 正自由空间与 300px 负自由空间算式正确。
- [ ] grow 与 scaled shrink 的比例没有混淆。
- [ ] 能说明 auto/0/content basis 的差异。
- [ ] 自动最小尺寸故障可稳定复现并由两层策略修复。
- [ ] 320px、200% 与长 token 下无页面横滚。
- [ ] 没有用根 overflow hidden 或固定裁切制造“通过”。

## 12. 常见问题

**什么时候用 `flex: 1`？**
项目希望从相近零基准分配空间时可用，但仍要处理内容最小尺寸。若要保留内容/设计基准，明确写 basis 更可解释。

**为什么 DevTools 显示宽度与手算差一点？**
检查 padding/border/margin、box-sizing、滚动条、min/max、子像素舍入和实际容器 content box。

**设置 `overflow: hidden` 也会让 Flex item 收缩，能用吗？**
overflow 状态会影响自动最小尺寸，但同时裁内容。若目的只是允许缩小，显式 min-inline-size 0 加内容换行更清晰。

**多行 Flex 会共享列宽吗？**
不会，每条 line 独立分配。需要跨行共享轨道应使用 Grid。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Flexbox：Flexibility](https://www.w3.org/TR/css-flexbox-1/#flexibility)
- [CSS Flexbox：Resolving Flexible Lengths](https://www.w3.org/TR/css-flexbox-1/#resolve-flexible-lengths)
- [CSS Flexbox：Automatic Minimum Size](https://www.w3.org/TR/css-flexbox-1/#min-size-auto)
- [MDN：Controlling ratios of flex items](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Controlling_ratios_of_flex_items_along_the_main_axis)
- [MDN：flex](https://developer.mozilla.org/en-US/docs/Web/CSS/flex)

兼容边界：Flex 基础算法稳定，但 intrinsic sizing、百分比 basis、不确定容器尺寸和表单控件最小尺寸仍可能跨引擎有边界差异。Safari、Firefox 与旧 WebView 未在本单元实测。

## 我现在能做到什么

我能从 flex base size 和自由空间手算分配，识别 min/max 冻结与自动最小尺寸，并用允许收缩加内容换行修复真实溢出。

## 单元导航

- 上一单元：[轴、换行与对齐](./01-axes-wrapping-alignment.md)
- 下一单元：[响应式工具栏与阅读顺序](./03-responsive-toolbar-reading-order.md)
- 分卷目录：[CSS](../README.md)
