# 容器查询与容器单位：同一商品卡适配不同嵌入位置

## 任务卡

邻里集市同一张商品卡既会出现在宽目录，也会出现在窄侧栏。视口相同，组件可用空间却不同。本课交付一个完整页面：按钮在同一窗口内切换宿主宽度，卡片按查询容器从上下布局变为并排布局。

- **建议时间：**4–5 小时。
- **可见结果：**不调整浏览器窗口，只切换宿主宽度就触发布局变化。
- **验收证据：**宽/窄宿主截图、查询容器检查、`cqi` 计算值、删除容器的故障记录。

## 1. 任务背景

媒体查询看到的是视口。宽屏页面里的侧栏仍可能只有 18rem；如果商品卡只按视口决定并排，它会在侧栏溢出。容器查询让后代按祖先查询容器的尺寸或样式条件响应。

关键关系：

```text
宿主建立查询容器
  → 后代 @container 查找匹配祖先
  → 条件成立时改变后代
```

查询容器不能通过自己的尺寸查询直接改变自身尺寸，否则会形成“变化导致条件变化”的循环。本课由 `.card-host` 提供查询上下文，规则改变其后代 `.card`。

## 2. 学习目标

完成后你应能：

- 区分媒体查询、尺寸容器查询、样式查询与滚动状态查询；
- 使用 `container-type: inline-size` 建立行内尺寸查询容器；
- 使用 `container-name` 或 `container` 简写选择嵌套容器；
- 解释尺寸包含对内在尺寸贡献的影响；
- 让 `@container` 改变后代而不是查询容器自身；
- 使用 `cqi`、`cqb`、`cqmin` 与 `cqmax` 并设置上下限；
- 解释缺少合适容器时容器单位的回退；
- 用 `CSS.supports()` 与实际行为测试分别记录语法和结果。

## 3. 预备知识

先完成[媒体查询与内容断点](01-media-queries-content-breakpoints.md)和[Grid 与 Subgrid](../06-grid.md)。个人路径：

```text
market-learning/practice/css-07-container/index.html
```

需要当前现代浏览器；不支持容器查询时，基础块布局必须仍可读。

## 4. 核心理论

### 4.1 查询容器类型

```css
.card-host {
  container-type: inline-size;
}
```

`inline-size` 允许查询行内尺寸，并施加相应包含行为，适合大多数横向组件。`size` 同时处理两轴并带来更强尺寸包含；若块尺寸没有明确来源，内容可能不能像普通盒那样决定外部尺寸。`normal` 不建立尺寸查询能力，但仍可能参与某些样式查询语境。

滚动状态查询使用新的 `scroll-state` 容器能力，不能与尺寸查询混成同一个兼容结论。

### 4.2 命名解决嵌套歧义

```css
.card-host { container: card / inline-size; }

@container card (width >= 28rem) {
  .card { /* ... */ }
}
```

浏览器为规则中的后代查找名称和查询能力都匹配的祖先。名字不会跨越不存在的祖先关系，也不会让容器查询自己。

### 4.3 包含副作用

建立尺寸查询需要避免祖先尺寸反过来无限依赖后代查询结果，因此容器的内在尺寸贡献会改变。在 Flex/Grid 中应检查：

- 宿主是否有可分配宽度；
- 是否被 `min-inline-size: auto` 撑住；
- `inline-size` 是否来自父布局或明确约束；
- `size` 容器是否失去由内容撑开的块尺寸。

“加上 `container-type` 后宽度变了”不一定是浏览器错误，而可能是包含模型生效。

### 4.4 容器单位

- `1cqi`：查询容器行内尺寸的 1%；
- `1cqb`：查询容器块尺寸的 1%；
- `1cqw` / `1cqh`：物理宽/高的 1%；
- `cqmin` / `cqmax`：相应较小/较大尺寸的 1%。

没有合适查询容器时，容器单位会使用小视口相关回退，不一定变成无效。因此看到 `font-size: 4cqi` 有计算值，不足以证明找到了正确祖先。用 `clamp()` 限制字号：

```css
font-size: clamp(1.25rem, 1rem + 2cqi, 2rem);
```

### 4.5 样式查询边界

样式查询可检查容器上的自定义属性等样式条件，但一般属性查询与实现范围需要逐项核对。尺寸、样式和滚动状态查询是不同能力；本课只把尺寸查询作为核心可运行路径。

## 5. 属性、单位与观察清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `container-type` | 建立查询能力 | `inline-size` | 影响内在尺寸贡献 |
| `container-name` | 命名查询容器 | `container-name: card` | 名称自身不建立尺寸能力 |
| `container` | 名称/类型简写 | `card / inline-size` | 省略项会按简写规则设置 |
| `@container` | 按祖先容器条件应用规则 | `@container card (width >= 28rem)` | 规则通常改变后代 |
| `cqi` | 容器行内尺寸百分之一 | `2cqi` | 缺少容器时仍有回退 |
| `cqb` | 容器块尺寸百分之一 | `2cqb` | 块尺寸需有可解释来源 |
| `cqmin` | 容器较小维度百分之一 | `3cqmin` | 物理/逻辑关系要结合书写模式 |
| `cqmax` | 容器较大维度百分之一 | `3cqmax` | 仍需可读上下限 |
| `clamp()` | 限制流式值上下界 | `clamp(1rem, 2cqi, 2rem)` | 中间值单位要合法 |
| `CSS.supports()` | 当前引擎语法检测 | `CSS.supports("container-type", "inline-size")` | 不证明组合行为无缺陷 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-07-container/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>容器查询实验 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #20382a;
      font: 1rem/1.65 system-ui, sans-serif;
    }
    main {
      inline-size: min(100% - 2rem, 64rem);
      margin: 2rem auto;
    }
    button {
      min-block-size: 2.75rem;
      padding-inline: .8rem;
      font: inherit;
    }
    .demo-shell {
      display: grid;
      gap: 1rem;
      margin-block: 1rem;
    }
    .card-host {
      container: listing / inline-size;
      inline-size: 100%;
      min-inline-size: 0;
      border: 2px dashed #78907d;
      padding: .75rem;
    }
    .card-host.narrow { max-inline-size: 20rem; }
    .card {
      padding: 1rem;
      border: 1px solid #5c7462;
      background: #f3f8f4;
    }
    .symbol {
      display: grid;
      min-block-size: 6rem;
      place-items: center;
      padding: .75rem;
      background: #dceade;
    }
    .copy { min-inline-size: 0; overflow-wrap: anywhere; }
    .copy h2 {
      margin-block: .5rem;
      font-size: clamp(1.25rem, 1rem + 2cqi, 2rem);
    }
    .price { font-weight: 700; }
    #report { white-space: pre-wrap; overflow-wrap: anywhere; }
    :focus-visible {
      outline: 3px solid #155fa0;
      outline-offset: 3px;
    }
    @container listing (width >= 28rem) {
      .card {
        display: grid;
        grid-template-columns: 8rem minmax(0, 1fr);
        gap: 1rem;
        align-items: start;
      }
      .copy h2 { margin-block-start: 0; }
    }
  </style>
</head>
<body>
  <main>
    <h1>同一视口，两种商品卡空间</h1>
    <p>切换宿主宽度，不改变浏览器窗口。</p>
    <button id="toggle" type="button" aria-pressed="false">
      切换为窄侧栏宿主
    </button>
    <div class="demo-shell">
      <section id="host" class="card-host" aria-label="商品卡宿主">
        <article class="card">
          <div class="symbol" aria-hidden="true">台灯示意</div>
          <div class="copy">
            <h2>可调节阅读台灯</h2>
            <p class="price">39.00 元</p>
            <p>可预约。示意块不是商品照片，本页没有发送预约请求。</p>
          </div>
        </article>
      </section>
    </div>
    <pre id="report" role="status" aria-label="容器查询报告"></pre>
    <p>不支持容器查询时，基础上下布局仍保留全部内容。</p>
  </main>
  <script>
    const host = document.querySelector("#host");
    const button = document.querySelector("#toggle");
    const card = document.querySelector(".card");

    function report() {
      const hostWidth = host.getBoundingClientRect().width;
      const cardStyle = getComputedStyle(card);
      document.querySelector("#report").textContent = [
        `宿主边框盒宽度: ${hostWidth.toFixed(1)}px`,
        `卡片 display: ${cardStyle.display}`,
        `卡片列: ${cardStyle.gridTemplateColumns}`,
        `标题字号: ${getComputedStyle(card.querySelector("h2")).fontSize}`,
        `当前引擎接受 inline-size 容器: ${
          CSS.supports("container-type", "inline-size")
        }`,
        "语法接受和当前演示不代表所有浏览器"
      ].join("\n");
    }

    button.addEventListener("click", () => {
      const narrow = host.classList.toggle("narrow");
      button.setAttribute("aria-pressed", String(narrow));
      button.textContent = narrow
        ? "恢复为宽目录宿主"
        : "切换为窄侧栏宿主";
      report();
    });

    new ResizeObserver(report).observe(host);
    report();
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-07-container
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

预期：

- 宽宿主达到 28rem 后卡片为两列；
- 窄宿主回到上下布局，视口没有变化；
- 标题字号随宿主流动但不小于 1.25rem、不大于 2rem；
- 报告显示宿主宽度、卡片 `display` 和计算列；
- 删除所有容器查询规则后仍能阅读商品与边界说明。

DevTools 中检查 `.card-host` 的 container 标记。报告测量边框盒；容器查询使用对应查询盒规则，不能把两个数字在所有 padding 情况下简单等同。

## 7. 邻里集市集成案例

把 `.card-host` 放入两个真实页面位置：

```html
<aside class="card-host">窄侧栏中的商品卡</aside>
<section class="card-host">宽目录中的商品卡</section>
```

两处都复用同一 `.card` 结构和样式，数据仍遵循项目契约：

- `priceCents` 是整数分，显示时才格式化；
- 卡片状态文字始终存在，布局切换不隐藏 `sold/reserved`；
- 宿主只提供空间上下文，不把主题、权限和业务状态塞进容器名称；
- 加载或错误时仍有后代内容，不能依赖查询条件才显示恢复按钮；
- 旧浏览器使用基础上下布局，不为视觉一致引入同步测量脚本；
- 对 `ResizeObserver` 的使用只为本教学报告，核心布局由 CSS 完成。

渐进顺序：

```text
完整块布局
  → 宿主 inline-size 查询容器
  → 28rem 后代两列规则
  → 有上下限的 cqi 标题
  → 删除容器与不支持环境复验
```

## 8. 常见错误与排查路径

### 明确错误案例：忘记建立查询容器

```css
.card-host {
  /* 缺少 container-type 或 container 简写 */
}

@container listing (width >= 28rem) {
  .card { display: grid; }
}
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | 宽宿主中卡片始终上下排列 |
| 证据 | DevTools 找不到名为 listing 的查询容器；规则不匹配 |
| 原因 | 名称和尺寸查询能力都没有建立 |
| 修复 | 添加 `container: listing / inline-size` |
| 复验 | 不改视口，仅改变宿主宽度即可切换 |

其他故障：

- `4cqi` 有计算值却布局不匹配：容器单位可回退，继续检查查询祖先；
- 用 `container-type: size` 后宿主高度异常：检查两轴尺寸包含和明确块尺寸；
- 在 `@container` 中改变 `.card-host` 自身宽度：改为改变后代 `.card`；
- 嵌套容器匹配错误：使用名称并在 DevTools 确认最近匹配祖先；
- 容器在 Grid 中收缩异常：检查父轨道、`min-inline-size` 和包含副作用；
- 只用 `CSS.supports()` 宣称通过：补充宽窄实际行为和截图。

## 9. 课后题

**问题 1：为什么媒体查询不能解决所有嵌入位置？**

<details>
<summary>参考答案</summary>

媒体查询通常看到视口。同一视口里的侧栏和主目录可用宽度不同，组件需要读取合适祖先容器。

</details>

**问题 2：有 `cqi` 计算值是否证明查询容器正确？**

<details>
<summary>参考答案</summary>

不能。缺少合适容器时容器单位仍有回退。要检查容器标记、`@container` 是否匹配和实际行为。

</details>

**问题 3：为什么不让容器按自己的宽度查询后再改自己的宽度？**

<details>
<summary>参考答案</summary>

这会形成尺寸条件与结果互相依赖的循环。容器提供查询上下文，规则通常改变后代。

</details>

## 10. 实践练习

### 基础：双宿主同时展示

- **文件：**`exercise-two-hosts.html`。
- **操作：**同页放 18rem 与 36rem 两个命名宿主，内部结构完全相同。
- **预期：**窄卡上下、宽卡并排。
- **失败观察：**DevTools 的查询容器和 Computed `display`。
- **完成标准：**不使用不同组件类名硬编码两套布局。

### 进阶：嵌套命名容器

- **文件：**`exercise-nested.html`。
- **操作：**页面容器与卡片容器嵌套，分别命名 `page`、`listing`。
- **预期：**卡片规则只读取 `listing`，页面规则只读取 `page`。
- **失败观察：**最近祖先和名字匹配。
- **完成标准：**改变外层但保持内层宽度时，卡片结果可预测。

### 故障注入：删除容器

- **文件：**`exercise-container-failure.md` 和完整页面副本。
- **操作：**删除 `container` 简写，保留 `cqi` 与 `@container`。
- **预期：**标题仍可能有计算字号，但布局查询不再匹配。
- **失败观察：**同时记录单位值和规则匹配，避免错误归因。
- **完成标准：**恢复容器后两类证据都符合预期，并解释差异。

## 11. 阶段验收

- [ ] 同一视口内宽窄宿主产生不同布局；
- [ ] 查询容器与后代职责分离；
- [ ] 能解释 `inline-size` 与 `size` 的包含差异；
- [ ] `cqi` 字号具有明确上下限；
- [ ] 缺少容器时不把单位回退误判为正确匹配；
- [ ] 不支持容器查询时基础内容和操作完整；
- [ ] 语法检测与行为验证分别记录；
- [ ] ResizeObserver 只用于报告，不承担核心布局；
- [ ] 未把容器样式当业务权限或数据状态。

## 12. 常见问题

**每个组件都应该建立容器吗？**<br>
不应机械添加。只有后代确实需要按该边界响应时才建立，并检查包含对父布局和内在尺寸的影响。

**容器断点还需要媒体断点吗？**<br>
两者职责不同。页面整体结构可按视口，复用组件可按容器；不要为了统一语法强行只留一种。

**可以查询普通颜色属性做主题吗？**<br>
样式查询的可用范围和一般属性支持需要逐项核对。稳定主题主线可使用自定义属性与明确属性状态，不假定任意属性都能查询。

**为什么示例使用 ResizeObserver？**<br>
只为把宿主尺寸写入报告。删除脚本后 CSS 布局仍应工作；它不是容器查询 polyfill。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [CSS Conditional Rules Level 5：Container Queries](https://www.w3.org/TR/css-conditional-5/#container-queries)：核对查询容器模型。
- [CSS Containment Level 3](https://www.w3.org/TR/css-contain-3/)：理解尺寸包含和容器单位。
- [MDN：容器查询](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)：复习命名、尺寸和单位。
- [MDN：container-type](https://developer.mozilla.org/en-US/docs/Web/CSS/container-type)：核对类型与副作用。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对数据与阶段边界。

现有章节快照记录基础尺寸查询起始支持为 Chrome 105、Firefox 110、Safari 16；样式查询、滚动状态查询和一般属性查询不能沿用同一结论。旧 WebView 与目标组合仍需实测。

## 我现在能做到什么

我能建立命名查询容器，让组件按嵌入空间响应，并辨认包含副作用、单位回退和语法检测的证据边界。下一课会处理逻辑方向、输入能力、安全区和用户偏好。

## 单元导航

- [上一课：媒体查询与内容断点](01-media-queries-content-breakpoints.md)
- [返回第七章入口](../07-responsive-container.md)
- [下一课：逻辑属性、输入能力、安全区与偏好](03-logical-properties-input-safe-area-preferences.md)
- [返回 CSS 模块](../README.md)
