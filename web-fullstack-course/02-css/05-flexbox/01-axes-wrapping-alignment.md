# 轴、换行与对齐：先确定方向和 flex line

## 任务卡

- **任务**：构建可换行的商品操作组，并解释每个对齐属性作用于哪条轴和哪些行。
- **产出**：`practice/css-05-01/minimal.html` 与 `practice/css-05-01/market.html`。
- **运行**：直接打开，拖动可调整宽度容器，并在 320px 与 RTL 状态观察。
- **完成证据**：主/交叉轴图、flex line 数量、对齐前后截图和溢出诊断。
- **边界**：本单元不使用 `order` 或 reverse 改变任务顺序，方向由内容语义决定。

## 1. 任务背景

邻里集市操作栏有搜索、分类、清空和发布按钮。在宽屏上希望排成一行，窄屏应自然换行。若只记“justify 横向、align 纵向”，当容器改为 column、RTL 或竖排时就会判断错误。

Flexbox 是一维布局：每条 flex line 沿主轴分配项目，在交叉轴排列行。先确定方向与行，再选择对齐属性。

## 2. 学习目标

完成后你能：

1. 从 writing-mode、direction 与 flex-direction 推导主轴方向；
2. 解释 nowrap、wrap、wrap-reverse 如何创建 flex line；
3. 区分 justify-content、align-items、align-self、align-content；
4. 使用 gap 提供行/列间距而不依赖项目外边距；
5. 说明 safe/unsafe 对齐和 baseline 的内容边界。

## 3. 预备知识

需要理解逻辑轴、常规流和 DOM 顺序。Flex 容器的直接元素子节点成为 flex item；匿名文本也可能形成匿名项目，但不应依赖它布局。

测试时在 DevTools Flex overlay 中显示主轴、行与 gap。不同浏览器面板命名会不同；页面报告只作几何证据，不替代 overlay。

## 4. 核心理论

建立 Flex formatting context：

```css
.toolbar {
  display: flex;
  flex-flow: row wrap;
}
```

`row` 的主轴沿 inline axis，起点受 `direction` 与书写模式影响；`column` 的主轴沿 block axis。`row-reverse/column-reverse` 反转视觉排列方向，但不会改变 DOM、源顺序或默认 Tab 顺序，因此容易造成可访问性错位。

交叉轴垂直于主轴。`flex-wrap: wrap` 允许项目在主轴空间不足时创建新行；每行独立计算主轴自由空间。`wrap-reverse` 反转交叉轴堆叠方向，同样不应拿来修复错误 DOM。

对齐职责：

| 属性 | 作用对象 | 轴/条件 |
| --- | --- | --- |
| `justify-content` | 一条 line 内项目整体 | 主轴剩余空间 |
| `align-items` | line 内所有项目默认对齐 | 交叉轴 |
| `align-self` | 单个项目覆盖 align-items | 交叉轴 |
| `align-content` | 多条 line 整体 | 交叉轴且容器有额外空间 |
| `gap` | 项目与 line 之间固定沟槽 | row-gap/column-gap 按布局语义 |

`align-content` 对单行容器通常无可见效果；容器交叉轴为 auto 且没有额外空间时也看不出分配。`justify-items` 在 Flexbox 中不用于主轴项目对齐。

`stretch` 通常只影响交叉尺寸为 auto 的项目；有明确尺寸或 min/max 约束时不一定拉伸。`baseline` 让项目按相关基线对齐，适合字号不同的短文本，但图片、替换元素和多行内容需实测。

Box Alignment 的 `safe center` 在居中会导致内容不可达溢出时倾向安全起点；支持范围需核对。对关键操作，允许换行和内容增长比 unsafe 强制居中可靠。

Gap 不属于项目自身边缘，不会在容器外产生首尾 margin，也不发生 margin collapse。百分比 gap 在尺寸不确定时有布局模式特定的循环处理，本章基础方案使用 rem。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 注意 |
| --- | --- | --- |
| `display: flex/inline-flex` | 建立块级/行内级 Flex 容器 | 直接子元素成为项目 |
| `flex-direction` | 设主轴方向 | row 受 direction/writing-mode 影响 |
| `flex-wrap` | 单行或多行 | 每条 line 独立分配 |
| `flex-flow` | direction + wrap 简写 | 顺序可灵活但需可读 |
| `justify-content` | 主轴整体分配 | 不改变项目 grow/shrink 计算本身 |
| `align-items/self` | 项目交叉轴对齐 | stretch 需 auto 交叉尺寸 |
| `align-content` | 多行交叉轴分配 | 单行/无额外空间时无效 |
| `gap` | 行列沟槽 | 不等于外边距 |
| `place-content` | align-content + justify-content | 仍需理解两轴 |
| `getBoundingClientRect()` | 读取项目位置 | 无法直接返回“第几行”，需按坐标归类 |

## 6. 最小可运行案例

创建 `practice/css-05-01/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Flex 轴与换行观察台</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 2rem; font: 16px/1.6 system-ui, sans-serif; }
    .demo {
      display: flex;
      flex-flow: row wrap;
      align-items: center;
      align-content: start;
      justify-content: flex-start;
      gap: .75rem;
      inline-size: 24rem;
      max-inline-size: 100%;
      min-block-size: 10rem;
      padding: .75rem;
      border: 2px solid #718078;
      resize: horizontal;
      overflow: auto;
    }
    .demo > span { padding: .5rem .75rem; background: #dce9e0; border: 1px solid #66806f; }
    .demo > span:nth-child(2) { font-size: 1.4rem; }
    output { display: block; margin-block-start: 1rem; }
  </style>
</head>
<body>
  <main>
    <h1>Flex 轴与换行观察台</h1>
    <div class="demo">
      <span>分类</span><span>附近商品</span><span>价格</span><span>状态筛选</span>
    </div>
    <output id="report"></output>
  </main>
  <script>
    const demo = document.querySelector(".demo");
    const output = document.querySelector("#report");
    function report() {
      const tops = [...demo.children].map((item) =>
        Math.round(item.getBoundingClientRect().top)
      );
      output.textContent = `可观察 flex line 数：${new Set(tops).size}；容器宽：` +
        `${demo.getBoundingClientRect().width.toFixed(1)}px。`;
    }
    new ResizeObserver(report).observe(demo);
    report();
  </script>
</body>
</html>
```

拖窄容器会产生多条 line。项目按各自行的主轴排列；`align-items: center` 对齐每行内部，`align-content: start` 把多行放在交叉轴起点。把 align-content 改为 space-between 可观察容器固定最小高度中的行分配。

逐步扩展：

1. 改为 column，重新指出主轴与交叉轴；
2. 设置 `dir="rtl"`，观察 row 的主轴起点变化；
3. 恢复 LTR，比较 gap 与给每项 margin 的首尾差异；
4. 改为 nowrap，记录横向溢出，随后恢复 wrap。

## 7. 邻里集市集成案例

创建 `practice/css-05-01/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市可换行操作栏</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; font: 1rem/1.65 system-ui, sans-serif; color: #26352d; }
    .market { inline-size: min(58rem, 100% - 2rem); margin: 2rem auto; }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: .75rem;
      padding: 1rem;
      border: 1px solid #78877e;
      background: #eef5f0;
    }
    .field { display: flex; flex: 1 1 14rem; flex-direction: column; gap: .25rem; min-inline-size: 0; }
    input, select, button { min-block-size: 2.75rem; font: inherit; }
    input, select { inline-size: 100%; min-inline-size: 0; padding-inline: .5rem; }
    .actions { display: flex; flex: 0 1 auto; flex-wrap: wrap; gap: .5rem; }
    button { padding-inline: 1rem; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
    output { display: block; margin-block-start: 1rem; }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p>静态演示：筛选控件不会请求服务器。</p>
    <form class="toolbar" action="#" onsubmit="return false">
      <label class="field">关键词
        <input name="query" value="折叠桌" autocomplete="off">
      </label>
      <label class="field">状态
        <select name="status"><option>全部</option><option>可预约</option><option>已售</option></select>
      </label>
      <div class="actions">
        <button type="reset">清空</button>
        <button type="submit">应用筛选</button>
      </div>
    </form>
    <output id="evidence" aria-live="polite"></output>
  </main>
  <script>
    const form = document.querySelector(".toolbar");
    const output = document.querySelector("#evidence");
    function report() {
      const items = [...form.children];
      const lines = new Set(items.map((item) => Math.round(item.getBoundingClientRect().top)));
      output.textContent = `当前操作栏分为 ${lines.size} 行；仅更新本地演示报告。`;
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      report();
    });
    new ResizeObserver(() => report()).observe(form);
    report();
  </script>
</body>
</html>
```

字段和 actions 都允许收缩/换行，DOM 顺序保持“关键词、状态、清空、应用”。`align-items: end` 让宽屏控件底边对齐；换行后每行独立对齐。内部 field 使用 column Flex 是嵌套的一维布局。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
.toolbar {
  display: flex;
  flex-wrap: nowrap;
  justify-content: space-between;
}
.toolbar > * { width: 18rem; }
```

当项目外部尺寸加 gap 超过 320px 时，space-between 不会创造空间；nowrap 迫使单行并触发收缩或溢出。

排查路径：

1. 确认容器主轴、交叉轴和 direction；
2. 判断是单行还是多行，数出每条 flex line；
3. 汇总项目 base size、margin 与 gap；
4. 检查 alignment 是否作用于正确轴与是否存在剩余空间；
5. 检查项目是否允许换行/收缩和内容最小尺寸；
6. 在 320px、长标签、RTL 和 200% 下复验。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 320px 下“应用筛选”按钮被挤出视口 |
| 证据 | toolbar nowrap；项目声明宽度总和加 gap 超过容器，根 scrollWidth 增大 |
| 原因 | 把 justify-content 当成尺寸压缩工具，且禁止创建新 line |
| 修复 | 启用 wrap，字段使用合理 flex-basis，actions 自身也可换行 |
| 复验 | 页面无横滚，按钮完整可见，Tab 顺序仍与 DOM 一致 |

## 9. 课后题

1. `flex-direction: row` 是否永远从左到右？
2. align-content 为什么在单行时常无效果？
3. justify-content 能否解决项目总宽大于容器？
4. gap 与相邻 margin 的主要差异是什么？
5. row-reverse 会改变 Tab 顺序吗？

答案：

1. 不是，受 direction 与 writing-mode 影响。
2. 它分配多条 line 在交叉轴的额外空间，单行没有多行集合。
3. 不能，它分配剩余自由空间；负空间由 shrink 等算法处理。
4. gap 是容器定义的项目/行间沟槽，无首尾外边距和 margin collapse。
5. 不会，通常只反转视觉顺序，导致视觉与 DOM/Tab 不一致风险。

## 10. 实践练习

**基础**：把最小案例改为 column，标注新的主轴与交叉轴。
验收：justify/align 的解释随轴变化，不再用横向/纵向死记。

**进阶**：为集市工具栏增加一个长标签字段并测试 RTL。
验收：字段可换行，label/control 关联与 DOM 顺序不变。

**故障注入**：设置 nowrap 和每项固定 18rem。
验收：记录根横滚，再启用 wrap 与弹性 basis 修复；不在 body 上隐藏溢出。

## 11. 阶段验收

- [ ] row/column、LTR/RTL 下主轴方向均能说明。
- [ ] 可观察 flex line 数与脚本报告一致。
- [ ] 四个 alignment 属性作用对象不混淆。
- [ ] 工具栏 320px、200% 与长标签下无页面横滚。
- [ ] DOM、视觉主流程和 Tab 顺序一致。
- [ ] 未用 reverse/order 修复结构，也未用根 overflow 隐藏故障。

## 12. 常见问题

**Flexbox 是行布局还是列布局？**
都可以，但一次沿一个主轴分配；多行仍是独立的一维 line，不是共享二维轨道。

**为什么 `align-items: center` 看不到效果？**
可能项目已 stretch、交叉尺寸没有额外空间、或你实际想控制主轴。先画轴和盒尺寸。

**gap 支持 Flexbox 的旧环境怎么办？**
现代浏览器已普遍支持，但旧 WebView 需核对；必要回退要限定范围并避免 margin 首尾副作用。

**可以用 auto margin 对齐一个按钮吗？**
可以，它会吸收对应轴可用空间，且在 justify-content 之前起作用；应明确这种行为再使用。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Flexible Box Layout Level 1](https://www.w3.org/TR/css-flexbox-1/)
- [CSS Box Alignment Level 3](https://www.w3.org/TR/css-align-3/)
- [MDN：Basic concepts of flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Basic_concepts_of_flexbox)
- [MDN：Aligning items in a flex container](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_flexible_box_layout/Aligning_items_in_a_flex_container)
- [MDN：gap](https://developer.mozilla.org/en-US/docs/Web/CSS/gap)

兼容边界：基础 Flexbox 已稳定；safe 对齐、逻辑方向、百分比 gap 与旧 WebView 仍需目标验证。RTL、垂直书写、Safari、Firefox 与屏幕阅读器未完整实测。

## 我现在能做到什么

我能先确定 Flex 主轴、交叉轴和 line，再选择换行与对齐属性，并在方向变化时保持 DOM 与任务顺序稳定。

## 单元导航

- 上一单元：[章入口](../05-flexbox.md)
- 下一单元：[增长、收缩、基准与自动最小尺寸](./02-grow-shrink-basis-auto-minimum.md)
