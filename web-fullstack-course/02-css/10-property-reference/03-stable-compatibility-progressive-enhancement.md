# 稳定兼容性与渐进增强：用目标矩阵控制发布风险

## 任务卡

邻里集市准备把商品目录从普通纵向列表增强为容器响应式网格。团队已经确认所用机制处于稳定
标准轨道，但仍要回答：目标浏览器是否覆盖、组合行为是否正确、禁用增强后能否完成同一任务。
本课建立可执行的目标矩阵，并交付一份基础路径独立可用的商品目录。

- **建议时间：**4–6 小时。
- **可见结果：**基础列表始终可读；满足目标条件时增强为容器响应式网格。
- **验收证据：**版本矩阵、解析报告、行为检查、键盘/缩放/偏好记录和回滚复验。

## 1. 任务背景

“标准稳定”只回答机制能否进入课程主线，不等于项目已经完成兼容验收。一个稳定机制仍可能因为
目标版本、组合方式、内容、输入设备或辅助技术而表现不同。

课程采用两道门：

1. **进入主线门：**规范、兼容数据和状态元数据均表明机制稳定；
2. **进入项目门：**项目目标矩阵中的真实页面行为通过。

第一道门排除尚未稳定的能力，第二道门防止把语法可解析误写成产品可用。

## 2. 学习目标

完成后你应能：

- 从产品用户和运行环境定义目标浏览器矩阵；
- 区分规范状态、兼容数据、当前解析和真实行为；
- 用基础路径先完成核心任务；
- 用 `@supports` 与 `CSS.supports()` 检测实际使用的声明；
- 为组合能力设计正常、边界和失败行为检查；
- 覆盖键盘、320px、200% 缩放、减少动作、强制颜色和打印；
- 记录已验证版本、未验证环境和证据日期；
- 为增强提供可执行回滚；
- 避免使用浏览器品牌字符串决定核心内容是否可达；
- 在矩阵升级后重跑相同验收路径。

## 3. 预备知识

先完成[At-rule、函数与描述符](02-at-rules-functions-descriptors.md)、
[容器查询与容器单位](../07-responsive-container/02-container-queries-units.md)和
[逻辑属性、输入能力与偏好](../07-responsive-container/03-logical-properties-input-safe-area-preferences.md)。

个人练习目录：

```text
market-learning/practice/css-10-stable-compatibility/
├── index.html
└── evidence.md
```

创建方式：

```bash
mkdir -p market-learning/practice/css-10-stable-compatibility
cd market-learning/practice/css-10-stable-compatibility
touch index.html evidence.md
```

## 4. 核心理论

### 4.1 先定义核心任务

本课核心任务是：

> 用户能够按 DOM 顺序读取商品标题、价格和状态，并用键盘到达筛选按钮。

单列普通流已经完成该任务。Grid 和容器查询只改善空间利用率，不能成为内容可达的前提。

### 4.2 四层证据不能互换

| 证据层 | 回答的问题 | 不能证明 |
|---|---|---|
| 规范与状态元数据 | 机制是否属于稳定标准路径 | 项目组合已经正确 |
| 兼容数据 | 哪些浏览器版本声明支持 | 当前页面没有实现缺陷 |
| 解析检测 | 当前引擎是否接受声明 | 布局、键盘和辅助技术通过 |
| 行为验收 | 固定页面和动作是否满足要求 | 未执行环境也通过 |

课程引用 MDN Browser Compatibility Data 时记录数据版本和日期；项目发布还要记录实际浏览器
版本与相同验收动作。

### 4.3 基础路径在条件外

```css
.catalog {
  display: block;
}

.listing + .listing {
  margin-block-start: 1rem;
}
```

增强放入条件块：

```css
@supports (container-type: inline-size) {
  .catalog-shell {
    container-type: inline-size;
  }

  .catalog {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .listing + .listing {
    margin-block-start: 0;
  }

  @container (width >= 36rem) {
    .catalog {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}
```

禁用整个条件块后，内容与操作仍然成立。基础路径不是另一套业务，只是同一任务的最低呈现。

### 4.4 检测实际使用的子能力

项目使用 `container-type: inline-size`，检测就应指向这条声明：

```js
const containerQueries = CSS.supports("container-type", "inline-size");
```

只检测 `display: grid` 不能证明容器查询可用。检测结果也不能替代 36rem 边界、长标题、RTL、
缩放和键盘行为。

### 4.5 目标矩阵来自产品范围

矩阵至少记录：

```text
浏览器与版本
操作系统与设备类别
视口、缩放和输入方式
稳定机制清单
正常路径、边界路径和回滚路径
执行日期、结果与证据位置
```

没有执行的组合标记为“未验证”，不能借用另一引擎结果。

### 4.6 回滚删除增强，不改业务

本课回滚是删除 `@supports` 块，保留普通流样式。回滚后重新执行相同的标题、价格、状态、键盘、
缩放和打印验收；不能只确认页面“还有颜色”。

## 5. API、规则与证据清单

| 名称 | 作用 | 最小用法 | 边界 |
|---|---|---|---|
| `@supports` | 按声明解析结果启用增强 | `@supports (display: grid)` | 不证明组合行为 |
| `CSS.supports()` | 在当前脚本环境查询声明 | `CSS.supports("display", "grid")` | 不代表另一浏览器 |
| `@container` | 按容器条件应用样式 | `@container (width >= 36rem)` | 需要正确查询容器 |
| `matchMedia()` | 读取当前媒体条件 | `matchMedia("(forced-colors: active)")` | 结果会变化，人工行为仍需验 |
| `getComputedStyle()` | 读取当前计算结果 | `getComputedStyle(node).display` | 不解释全部布局因果 |
| 目标矩阵 | 固定环境、动作和结果 | `evidence.md` | 必须记录实际版本 |
| 回滚开关 | 快速关闭增强 | 删除或禁用增强层 | 回滚后仍需复验 |

## 6. 最小可运行案例

将以下完整内容保存为 `index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>稳定兼容性观察台 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: CanvasText;
      background: Canvas;
      font: 1rem/1.65 system-ui, sans-serif;
    }
    main {
      width: min(100% - 2rem, 52rem);
      margin: 2rem auto;
    }
    button {
      min-block-size: 2.75rem;
      padding-inline: 1rem;
      color: inherit;
      font: inherit;
    }
    :focus-visible {
      outline: 3px solid Highlight;
      outline-offset: 3px;
    }
    .catalog { display: block; }
    .listing {
      min-inline-size: 0;
      padding: 1rem;
      border: 2px solid ButtonBorder;
      background: Canvas;
      overflow-wrap: anywhere;
    }
    .listing + .listing { margin-block-start: 1rem; }
    .price { font-weight: 700; }
    #report {
      margin-block-start: 1rem;
      padding: .75rem;
      border: 1px solid ButtonBorder;
      white-space: pre-wrap;
    }

    @supports (container-type: inline-size) {
      .catalog-shell { container-type: inline-size; }
      .catalog {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      .listing + .listing { margin-block-start: 0; }
      @container (width >= 36rem) {
        .catalog { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
    }

    @media (prefers-reduced-motion: no-preference) {
      .listing { transition: border-color 160ms ease; }
      .listing:focus-within { border-color: Highlight; }
    }

    @media print {
      button, #report { display: none; }
      .listing { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main>
    <h1>邻里集市商品目录</h1>
    <button id="check" type="button">记录当前证据</button>
    <div class="catalog-shell">
      <section class="catalog" aria-label="商品">
        <article class="listing">
          <h2>九成新台灯</h2>
          <p class="price">35.00 元</p>
          <p>状态：可预约</p>
          <a href="#lamp">查看台灯</a>
        </article>
        <article class="listing">
          <h2>标题很长也必须完整换行的折叠桌</h2>
          <p class="price">80.00 元</p>
          <p>状态：已预约</p>
          <a href="#desk">查看折叠桌</a>
        </article>
      </section>
    </div>
    <pre id="report" aria-label="兼容性证据"></pre>
  </main>
  <script>
    const catalog = document.querySelector(".catalog");
    const report = document.querySelector("#report");

    function writeEvidence() {
      report.textContent = JSON.stringify({
        containerQuerySyntax: CSS.supports("container-type", "inline-size"),
        computedDisplay: getComputedStyle(catalog).display,
        columns: getComputedStyle(catalog).gridTemplateColumns,
        viewportWidth: innerWidth,
        reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
        forcedColors: matchMedia("(forced-colors: active)").matches,
        note: "结果只属于当前浏览器版本和本次页面行为"
      }, null, 2);
    }

    document.querySelector("#check").addEventListener("click", writeEvidence);
    addEventListener("resize", writeEvidence);
    writeEvidence();
  </script>
</body>
</html>
```

运行：

```bash
cd market-learning/practice/css-10-stable-compatibility
python3 -m http.server 8000
```

打开 `http://127.0.0.1:8000/`。预期宽容器为两列、窄容器为一列，DOM 与 Tab 顺序始终为台灯
后折叠桌。证据写入页面报告和个人 `evidence.md`。结束时按 `Control+C`，再次访问应连接失败。

## 7. 邻里集市集成案例

为真实商品目录建立以下验收矩阵：

| 场景 | 固定动作 | 通过条件 |
|---|---|---|
| 基础路径 | 禁用 `@supports` 块 | 标题、价格、状态、链接均可读可达 |
| 宽容器 | 容器宽度大于等于 36rem | 两列，无横向溢出 |
| 窄容器 | 容器宽度小于 36rem | 单列，长标题完整换行 |
| 键盘 | Tab 遍历按钮和两个链接 | 顺序与 DOM 一致，焦点可见 |
| 200% 缩放 | 浏览器缩放到 200% | 内容不遮挡，布局可回到单列 |
| 减少动作 | 启用减少动作偏好 | 无依赖动作，状态仍清楚 |
| 强制颜色 | 启用强制颜色模拟 | 边界、文字和焦点仍可辨认 |
| 打印 | 打印预览 | 商品保留，操作和诊断隐藏 |

在 `evidence.md` 记录实际浏览器版本、日期和每一行结果。未执行的 Safari、Firefox、真机和辅助
技术组合保持“未验证”。

## 8. 常见错误与排查路径

### 明确错误案例：按浏览器品牌隐藏基础内容

```js
if (navigator.userAgent.includes("ExampleBrowser")) {
  document.querySelector(".catalog").hidden = false;
}
```

| 记录项 | 内容 |
|---|---|
| 现象 | 品牌字符串不匹配时整个目录不可达 |
| 证据 | DOM 中 `hidden` 仍存在，但稳定 CSS 机制本可工作 |
| 原因 | 用浏览器名称替代实际声明和行为检测，并把基础内容默认隐藏 |
| 修复 | 内容默认可达；只对增强声明做检测 |
| 复验 | 修改品牌字符串、禁用增强后，目录仍完整 |

其他排查：

- 解析通过但没有两列：确认真正的查询容器、容器宽度和 `@container` 条件；
- 两列出现横向滚动：检查 `minmax(0, 1fr)`、项目最小尺寸和长内容断行；
- 键盘顺序与视觉不一致：移除视觉排序，恢复合理 DOM；
- 强制颜色下焦点消失：使用系统颜色并保留可见 outline；
- 回滚后间距异常：基础路径应拥有自己的相邻项间距。

## 9. 课后题

**问题 1：稳定标准为什么仍需要目标浏览器测试？**

<details>
<summary>参考答案</summary>

稳定状态说明机制适合进入主线，但目标版本、组合、内容、设备和辅助技术仍可能不同。项目发布依据
实际矩阵，不依据名称。

</details>

**问题 2：`CSS.supports()` 为 true 能否证明键盘和缩放通过？**

<details>
<summary>参考答案</summary>

不能。它只证明当前引擎接受声明语法；键盘、缩放、布局和辅助技术需要真实页面行为验收。

</details>

**问题 3：回滚是否要求视觉完全一致？**

<details>
<summary>参考答案</summary>

不要求。回滚必须完成同一核心任务，保留信息、操作和恢复路径；增强可以改善密度和呈现。

</details>

## 10. 实践练习

### 基础：建立目标矩阵

- **文件：**`evidence.md`。
- **操作：**记录当前浏览器版本，并执行单列、两列、键盘和 200% 缩放。
- **预期：**每项包含环境、动作、实际结果和证据位置。
- **失败观察：**未执行项明确标记“未验证”。
- **完成标准：**没有把解析结果写成行为通过。

### 进阶：增加 RTL 与长内容

- **文件：**`index.html` 与 `evidence.md`。
- **操作：**给 `html` 设置 `dir="rtl"`，增加无空格长编号。
- **预期：**阅读顺序不变，长内容换行，无根级横向滚动。
- **失败观察：**记录逻辑边、Grid 轨道和 scrollWidth。
- **完成标准：**修复不依赖隐藏溢出。

### 故障注入：删除基础路径

- **文件：**`index.html`。
- **操作：**把 `.catalog { display: block; }` 移入条件块，再禁用条件块。
- **预期：**发现基础布局契约被破坏。
- **失败观察：**保存 Styles、Computed 和键盘结果。
- **完成标准：**恢复条件外基础样式并沿相同路径复验。

## 11. 阶段验收

- [ ] 使用的机制通过当前稳定状态门禁；
- [ ] 核心任务在条件块外已成立；
- [ ] 检测指向实际使用的声明；
- [ ] 目标矩阵记录真实浏览器版本与日期；
- [ ] 320px 和 200% 缩放不丢内容；
- [ ] DOM、阅读与 Tab 顺序一致；
- [ ] 减少动作和强制颜色不破坏状态；
- [ ] 打印保留商品正文；
- [ ] 禁用增强后同一核心任务仍完成；
- [ ] 未执行环境保持“未验证”；
- [ ] 服务停止后端口释放。

## 12. 常见问题

**能否只看全局使用率决定？**<br>
不能。产品用户、企业浏览器、设备、辅助技术和功能组合可能与全局分布不同。

**为什么不为每个浏览器维护不同页面？**<br>
基础路径和稳定增强应共享同一语义与业务状态。按品牌分叉会扩大漂移和测试面。

**什么时候升级目标矩阵？**<br>
产品支持范围、浏览器基线、相关依赖或关键组合变化时升级，并重新执行同一套验收。

**解析失败时一定要加入脚本替代吗？**<br>
不一定。基础 HTML/CSS 已完成任务时，保持简单路径通常更可靠。

## 13. 扩展阅读

资料核验日期：2026-10-11。

- [CSSWG Current Work](https://www.w3.org/Style/CSS/current-work)：核对模块与规范状态。
- [MDN Browser Compatibility Data](https://github.com/mdn/browser-compat-data)：读取版本化兼容数据。
- [MDN：@supports](https://developer.mozilla.org/en-US/docs/Web/CSS/@supports)：声明条件语法。
- [MDN：CSS.supports()](https://developer.mozilla.org/en-US/docs/Web/API/CSS/supports_static)：脚本解析检测。
- [MDN：Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)：容器查询模型。
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)：键盘、焦点、缩放和可辨认性验收依据。

本课未验证 Safari、Firefox、WebView、真实移动设备、VoiceOver、NVDA、JAWS 或真实打印机。

## 我现在能做到什么

我能先用稳定机制完成核心任务，再用目标矩阵、解析检测和真实行为验收决定增强是否进入项目；
也能在回滚增强后沿同一路径证明商品信息和操作仍然可用。

## 单元导航

- [上一课：At-rule、函数与描述符](02-at-rules-functions-descriptors.md)
- [返回第十章目录](../README.md#第十章属性语法与兼容参考)
- [下一步：CSS 覆盖矩阵](../CSS-COVERAGE.md)
- [返回 CSS 模块](../README.md)
