# Subgrid、对齐与回退：共享卡片内部行，不牺牲语义顺序

## 任务卡

邻里集市同一行商品的标题和描述长度不同，普通嵌套 Grid 各自计算行高，价格与收藏按钮上下漂移。本课交付一个完整页面：支持 Subgrid 时共享三条父行，不支持时退回独立 `auto 1fr auto`，两条路径都能阅读和操作。

- **建议时间：**4–5 小时。
- **可见结果：**宽屏同组卡片操作行顶边对齐；关闭增强后内容不丢失。
- **验收证据：**Subgrid overlay、`@supports` 开关前后截图、错误 span 故障记录、键盘顺序记录。

## 1. 任务背景

每张商品卡写成独立 Grid 时，三行只在卡片内部对齐：

```text
卡 A：短标题 / 长描述 / 操作
卡 B：长标题 / 短描述 / 操作
```

兄弟卡之间没有共享轨道，操作行可能不在同一高度。固定标题高度会裁切长文本，固定卡高会在缩放或翻译后失败。Subgrid 允许子网格沿一轴复用父网格轨道，让内容继续参与轨道尺寸计算。

Subgrid 是布局增强，不应成为显示价格、状态或按钮的前提。普通嵌套 Grid 必须先完整可用。

## 2. 学习目标

完成后你应能：

- 解释普通嵌套 Grid 与 Subgrid 的轨道所有权差异；
- 让卡片先跨父级三条行轨道，再用 `grid-template-rows: subgrid` 共享它们；
- 只在需要的行轴启用 Subgrid，列轴保持独立；
- 区分 `align-items`、`justify-items`、`align-content` 与项目自身对齐；
- 解释 Subgrid 间隙继承与局部覆盖的影响；
- 使用 `@supports` 提供普通 Grid 回退；
- 保持 DOM、视觉和键盘顺序一致；
- 用关闭声明而非伪造旧浏览器，验证降级路径。

## 3. 预备知识

完成前两课：

- [显式轨道、网格线与区域](01-explicit-tracks-lines-areas.md)；
- [自动放置、隐式网格与响应式重复](02-auto-placement-implicit-responsive-repeat.md)。

需要能在 DevTools 中显示父网格与子网格 overlay。个人文件路径：

```text
market-learning/practice/css-06-subgrid/index.html
```

## 4. 核心理论

### 4.1 普通嵌套 Grid 各算各的

```css
.listing {
  display: grid;
  grid-template-rows: auto 1fr auto;
}
```

每张 `.listing` 都创建自己的三行。`1fr` 可把本卡剩余空间交给描述，但兄弟卡的标题行没有共同尺寸。

### 4.2 Subgrid 共享父轨道

要共享三行，卡片必须先在父网格中跨三行：

```css
.listing {
  grid-row: span 3;
  display: grid;
  grid-template-rows: subgrid;
}
```

父目录的自动放置会为一组卡片形成相应行轨道。子级标题、描述和操作参与父轨道尺寸计算。只写 `subgrid` 而不跨足够父行，子网格没有预期的三段轨道可共享。

### 4.3 共享一轴，不必共享两轴

本例只共享行：

```css
grid-template-rows: subgrid;
```

列仍由目录的 `repeat(auto-fit, ...)` 管理。若同时写 `grid-template-columns: subgrid`，卡片必须也跨相应父列，并会失去独立列轨道定义。选择应来自需要对齐的维度。

### 4.4 对齐发生在不同层级

- `align-items`：项目在各自网格区域的块轴对齐；
- `justify-items`：项目在各自网格区域的行内轴对齐；
- `align-content`：整组轨道在有额外块轴空间时如何分配；
- `justify-content`：整组轨道在有额外行内空间时如何分配；
- `align-self` / `justify-self`：单个项目覆盖自身对齐。

若轨道已经用 `fr` 填满空间，`*-content` 可能看不出效果。对齐不是让 DOM 顺序改变，也不是用固定高度强迫视觉一致。

### 4.5 回退先于检测

先写普通 Grid：

```css
.listing {
  display: grid;
  grid-template-rows: auto 1fr auto;
}
```

再增强：

```css
@supports (grid-template-rows: subgrid) {
  .listing {
    grid-row: span 3;
    grid-template-rows: subgrid;
  }
}
```

`@supports` 只证明当前引擎接受语法，不证明所有浏览器、嵌套组合或辅助技术表现都一致。

## 5. 属性、规则与观察清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `subgrid` | 复用父网格对应轴的轨道 | `grid-template-rows: subgrid` | 子项必须先跨父轨道 |
| `grid-row` | 指定卡片跨父行数 | `span 3` | 跨越数量应匹配内部结构 |
| `grid-template-rows` | 定义回退行或共享行 | `auto 1fr auto` | 支持增强会覆盖该值 |
| `row-gap` | 设置行轨道间隙 | `row-gap: .75rem` | Subgrid 间隙与父轨道关系需观察 |
| `align-items` | 块轴项目对齐 | `align-items: start` | 不负责整组轨道位置 |
| `justify-items` | 行内轴项目对齐 | `justify-items: stretch` | Flex 不按同一模型使用 |
| `place-items` | 两方向项目对齐简写 | `place-items: start stretch` | 值顺序需结合语法 |
| `align-self` | 覆盖单项块轴对齐 | `align-self: end` | 不改变轨道本身尺寸 |
| `@supports` | 按语法支持启用增强 | `@supports (...: subgrid)` | 不是完整兼容测试 |
| `CSS.supports()` | 脚本读取当前语法支持 | `CSS.supports("grid-template-rows", "subgrid")` | 只代表当前引擎 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-06-subgrid/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Subgrid 对齐实验 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #20382a;
      background: #f5f8f5;
      font: 1rem/1.6 system-ui, sans-serif;
    }
    main {
      inline-size: min(100% - 2rem, 68rem);
      margin: 2rem auto;
    }
    #fallback {
      min-block-size: 2.75rem;
      padding-inline: .8rem;
      font: inherit;
    }
    .catalog {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
      gap: 1rem;
      margin-block: 1rem;
    }
    .listing {
      min-inline-size: 0;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: .75rem;
      padding: 1rem;
      border: 1px solid #67806d;
      background: #fff;
      overflow-wrap: anywhere;
    }
    .listing h2, .listing p { margin: 0; }
    .actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: .5rem;
    }
    .price { margin-inline-end: auto; font-weight: 700; }
    .favorite {
      min-block-size: 2.75rem;
      padding-inline: .7rem;
      font: inherit;
    }
    .favorite[aria-pressed="true"] { background: #dceede; }
    :focus-visible {
      outline: 3px solid #155fa0;
      outline-offset: 3px;
    }
    @supports (grid-template-rows: subgrid) {
      .catalog:not([data-force-fallback="true"]) .listing {
        grid-row: span 3;
        grid-template-rows: subgrid;
      }
    }
  </style>
</head>
<body>
  <main>
    <h1>邻里集市卡片行对齐</h1>
    <p>收藏只保存在当前页面内存；Subgrid 只负责布局。</p>
    <button id="fallback" type="button" aria-pressed="false">
      强制普通 Grid 回退
    </button>
    <section id="catalog" class="catalog" aria-label="商品目录">
      <article class="listing">
        <h2>阅读台灯</h2>
        <p>暖光，灯罩有轻微痕迹。</p>
        <div class="actions">
          <span class="price">39.00 元</span>
          <button class="favorite" type="button" aria-pressed="false">
            收藏台灯
          </button>
        </div>
      </article>
      <article class="listing">
        <h2>适合小户型的木质收纳盒</h2>
        <p>描述较短。</p>
        <div class="actions">
          <span class="price">25.00 元</span>
          <button class="favorite" type="button" aria-pressed="false">
            收藏收纳盒
          </button>
        </div>
      </article>
      <article class="listing">
        <h2>折叠阅读支架</h2>
        <p>这段描述更长，用来证明共享描述轨道会由同组内容共同决定高度，而不是裁切文本。</p>
        <div class="actions">
          <span class="price">18.00 元</span>
          <button class="favorite" type="button" aria-pressed="false">
            收藏支架
          </button>
        </div>
      </article>
    </section>
    <p id="status" role="status"></p>
    <pre id="report"></pre>
  </main>
  <script>
    const catalog = document.querySelector("#catalog");
    const fallback = document.querySelector("#fallback");
    const status = document.querySelector("#status");

    fallback.addEventListener("click", () => {
      const forced = catalog.dataset.forceFallback !== "true";
      catalog.dataset.forceFallback = String(forced);
      fallback.setAttribute("aria-pressed", String(forced));
      fallback.textContent = forced
        ? "恢复 Subgrid 增强"
        : "强制普通 Grid 回退";
      report();
    });

    document.querySelectorAll(".favorite").forEach(button => {
      button.addEventListener("click", () => {
        const pressed = button.getAttribute("aria-pressed") !== "true";
        button.setAttribute("aria-pressed", String(pressed));
        status.textContent = pressed
          ? `当前页已${button.textContent}。`
          : "当前页已取消收藏。";
      });
    });

    function report() {
      const first = document.querySelector(".listing");
      document.querySelector("#report").textContent = [
        `当前引擎接受 Subgrid: ${
          CSS.supports("grid-template-rows", "subgrid")
        }`,
        `当前卡片 grid-template-rows: ${
          getComputedStyle(first).gridTemplateRows
        }`,
        `强制回退: ${catalog.dataset.forceFallback === "true"}`,
        "支持检测与本页结果不能代表所有浏览器"
      ].join("\n");
    }

    addEventListener("resize", report);
    report();
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-06-subgrid
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

在足够显示三列的宽度：

1. 启用父 `.catalog` 与第一张 `.listing` 的 Grid overlay；
2. 记录三张卡的标题、描述、操作区顶边；
3. 点击“强制普通 Grid 回退”，再次记录；
4. 连续按 Tab，确认收藏按钮仍按 DOM 顺序；
5. 收藏后确认文字与 `aria-pressed` 更新，刷新后重置；
6. 320px 下确认卡片单列、长描述不裁切。

## 7. 邻里集市集成案例

本页已是 V1 商品目录的布局切片。接入连续项目时遵循：

- 每张卡内部顺序固定为标题、描述、操作，符合无 CSS 阅读顺序；
- 同组共享行只用于视觉对齐，不把空内容伪造成同样高度；
- `priceCents` 仍由数据层保证为整数，CSS 不读取或修改金额；
- 收藏是演示内存状态，真实 `PUT/DELETE /favorites/:listingId` 成功前不宣布持久化；
- `reserved`、`sold` 必须有文字，不只靠卡片颜色或轨道位置；
- 加载、空、错误状态不应被强制跨三行的卡片规则误匹配，可为 `.listing` 精确限定；
- 不支持 Subgrid 的浏览器仍保留全部商品信息与按钮。

渐进集成：

```text
语义 article 与完整文字
  → 普通 Grid：auto 1fr auto
  → 自动列目录
  → @supports 内启用 span 3 + subgrid
  → 键盘、缩放、长内容与关闭增强复验
```

## 8. 常见错误与排查路径

### 明确错误案例：没有跨父轨道

```css
@supports (grid-template-rows: subgrid) {
  .listing {
    grid-template-rows: subgrid;
    /* 错误：缺少 grid-row: span 3; */
  }
}
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | 三段内容没有按预期共享标题、描述和操作行 |
| 证据 | Grid overlay 显示卡片只占父级一行；Computed 的跨行范围不足 |
| 原因 | Subgrid 只能复用自己实际跨越的父轨道 |
| 修复 | 为卡片增加 `grid-row: span 3`，内部结构保持三段 |
| 复验 | 支持路径中操作行顶边对齐，回退路径仍完整 |

其他路径：

- 所有卡片被一条超长描述撑得过高：这是共享轨道的结果，评估是否应缩小共享组，而不是裁切必要正文；
- gap 看似双倍：同时显示父与子 overlay，核对 Subgrid 的间隙继承和局部 `gap`；
- `@supports` 为真但布局异常：语法接受不是完整行为证明，先切回普通 Grid 并记录目标浏览器；
- 焦点视觉跳跃：检查是否用了 `dense`、`order` 或区域重排，本课不需要这些；
- 操作行“对齐”但文字被截断：删除固定高度与 `overflow: hidden`，恢复自然增长。

## 9. 课后题

**问题 1：为什么只写 `subgrid` 不会自动得到三行？**

<details>
<summary>参考答案</summary>

子网格只能共享自己在父网格中跨越的轨道。卡片若只占一条父行，就没有三条父行可供标题、描述和操作复用。

</details>

**问题 2：Subgrid 是否要求列也共享？**

<details>
<summary>参考答案</summary>

不要求。每个轴独立选择。本例只在 `grid-template-rows` 使用 `subgrid`，目录列仍由父级自动重复管理。

</details>

**问题 3：`@supports` 为真能否写“所有浏览器都兼容”？**

<details>
<summary>参考答案</summary>

不能。它只表示当前引擎接受该语法，不代表其他浏览器、旧 WebView、复杂组合和辅助技术都已验证。

</details>

## 10. 实践练习

### 基础：两卡三行

- **文件：**`exercise-two-cards.html`。
- **操作：**两张卡分别使用长标题与长描述，普通 Grid 为回退，支持时共享三行。
- **预期：**宽屏操作行对齐，窄屏内容自然增长。
- **失败观察：**父子 Grid overlay。
- **完成标准：**关闭增强后仍无内容丢失。

### 进阶：局部分组

- **文件：**`exercise-groups.html`。
- **操作：**六张卡分成两个父 Grid 分组，证明每组三张共享轨道但两组互不牵连。
- **预期：**第一组超长描述不抬高第二组。
- **失败观察：**确认组边界和直接子项。
- **完成标准：**能解释轨道共享范围来自哪个父网格。

### 故障注入：移除 span

- **文件：**`exercise-subgrid-failure.md` 与完整页面副本。
- **操作：**移除 `grid-row: span 3`，保存 overlay 和 Computed。
- **预期：**共享结构失败或与预期不符。
- **失败观察：**不使用固定高度补救。
- **完成标准：**恢复 span 后对齐，回退按钮仍可切换，两条路径都通过键盘检查。

## 11. 阶段验收

- [ ] 普通 Grid 在不支持或强制回退时完整可用；
- [ ] 卡片跨越的父行数与内部结构一致；
- [ ] 支持路径中同组标题、描述和操作行共享轨道；
- [ ] 能区分项目对齐与轨道内容对齐；
- [ ] 320px、200% 缩放与长中文/长拉丁文本不裁切；
- [ ] DOM、视觉和 Tab 顺序一致；
- [ ] 收藏文字和 `aria-pressed` 同步，刷新明确重置；
- [ ] 错误记录包含 overlay、Computed、修复与复验；
- [ ] 未把 `CSS.supports()` 当跨浏览器测试。

## 12. 常见问题

**Subgrid 会让所有卡片等高吗？**<br>
它让对应子内容参与共享父轨道。最终高度取决于跨越轨道、内容和间隙，不应简化成“自动等高”。

**为什么不直接给标题 `min-height`？**<br>
固定或估计高度会在字体缩放、翻译和长标题下失效。共享轨道根据同组真实内容计算。

**旧浏览器需要 JavaScript polyfill 吗？**<br>
本例不需要。普通 Grid 已提供完整内容和操作，Subgrid 只是增强。引入脚本模拟布局会增加复杂度和测量成本。

**可以让一张卡跨四行吗？**<br>
可以，但内部要有相应布局意图，并理解它对自动放置和同组轨道的影响。不要用多跨一行制造空白。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [CSS Grid 2：Subgrids](https://www.w3.org/TR/css-grid-2/#subgrids)：核对共享轴、轨道和间隙模型。
- [MDN：Subgrid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Subgrid)：带着“为什么必须先跨父轨道”阅读。
- [MDN：网格对齐](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Box_alignment_in_grid_layout)：区分 items、self 与 content。
- [MDN：@supports](https://developer.mozilla.org/en-US/docs/Web/CSS/@supports)：理解语法检测边界。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对收藏、价格与阶段能力边界。

现有章节快照记录基础 Subgrid 起始支持为 Chrome 117、Firefox 71、Safari 16；这不是“所有版本与组合已通过”的承诺。目标 WebView、Safari、Firefox、缩放与辅助技术仍需人工验证。

## 我现在能做到什么

我能建立普通 Grid 基线，再用 Subgrid 共享同组卡片行，并用父子 overlay、强制回退和键盘顺序证明增强没有破坏内容。下一章会按视口、容器、输入能力和用户偏好调整这些组件。

## 单元导航

- [上一课：自动放置、隐式网格与响应式重复](02-auto-placement-implicit-responsive-repeat.md)
- [返回第六章入口](../06-grid.md)
- [下一章：响应式与容器查询](../07-responsive-container.md)
- [返回 CSS 模块](../README.md)
