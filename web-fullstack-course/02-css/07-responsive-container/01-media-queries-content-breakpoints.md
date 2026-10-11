# 媒体查询与内容断点：从拥挤证据决定页面变化

## 任务卡

邻里集市的筛选栏在宽页面适合并排，在窄窗口却挤压商品标题。按“手机/平板/桌面”套固定数字无法覆盖分屏、缩放和长翻译。本课交付一个完整页面：小空间默认单列，在内容需要时增强为两列，并提供打印路径。

- **建议时间：**4–5 小时。
- **可见结果：**窗口跨过内容断点时布局改变，信息不按设备名称消失。
- **验收证据：**320/768/1280px 截图、200% 缩放、打印预览、断点选择记录和一次重叠查询故障。

## 1. 任务背景

媒体查询读取输出媒介、视口和用户环境特征。它不知道用户拿的是“手机”还是“桌面”，也不知道商品卡在页面中实际占多宽。桌面窗口可以很窄，手机可以横屏，浏览器缩放会改变 CSS 像素中的可用空间。

稳健顺序是：

```text
先写最小可用布局
  → 放入真实长内容
  → 缩窄直到任务开始失败
  → 在失败前增加内容断点
  → 继续验证缩放、输入和打印
```

断点来自“筛选与结果无法同时保持可读”，不是来自某品牌设备宽度。

## 2. 学习目标

完成后你应能：

- 解释媒体类型、媒体特征、查询列表、`and` 与 `not`；
- 使用移动优先 `min-width` 或现代范围语法；
- 从内容拥挤而非设备名字选择断点；
- 预测相邻 `min-width`/`max-width` 在边界值的重叠；
- 区分视口 `width` 与组件容器宽度；
- 说明 `orientation`、分辨率和宽度各自不能证明什么；
- 为打印关闭无意义操作但保留价格、状态与边界说明；
- 用 `matchMedia()` 观察当前匹配而不把它当权限或设备识别。

## 3. 预备知识

先完成[Grid 与 Subgrid](../06-grid.md)，会写正常流、`minmax(0, 1fr)` 和逻辑尺寸。个人路径：

```text
market-learning/practice/css-07-media/index.html
```

浏览器 DevTools 需要能调整视口和模拟打印。页面不需要依赖或构建工具。

## 4. 核心理论

### 4.1 小空间基础先独立成立

不写查询时，页面就应具备：

- 流式宽度而非固定 1200px；
- 自然高度而非固定屏高；
- 可换行标题和按钮；
- 完整筛选入口与结果状态；
- 可见焦点和缩放能力。

媒体查询只覆盖在更大空间确实变化的声明，避免在每个断点重复整套样式。

### 4.2 范围语法与传统语法

以下两种都表达宽度至少 48rem：

```css
@media (min-width: 48rem) { /* ... */ }
@media (width >= 48rem) { /* ... */ }
```

维护目标浏览器时按支持范围选择。`min-width` 与 `max-width` 都包含等于；若写 `(max-width: 48rem)` 和 `(min-width: 48rem)`，恰好 48rem 时两者都匹配，最终仍由层叠决定。

媒体查询里的 `em`/`rem` 断点按查询规则参照初始字体相关基准，不应假定跟随页面后来给 `html` 设置的字号。

### 4.3 查询组合

- `and`：条件同时成立；
- 逗号：多个查询任一成立；
- `not`：否定完整媒体查询；
- `screen`、`print`：输出媒体类型；
- `orientation`：视口宽高关系，不是设备种类；
- `resolution`：输出分辨率，不等于可用布局空间。

查询不能代替业务授权。即使某个管理按钮只在宽屏显示，后端仍必须检查权限。

### 4.4 打印是另一种输出，不是截图

打印通常需要：

- 移除筛选按钮、收藏按钮等不可执行操作；
- 取消 fixed/sticky 遮挡；
- 保留标题、价格、状态、时间与“教学页面”边界；
- 避免卡片在适当范围内被拆页；
- 不依赖背景色表达状态；
- 打开真实打印预览，而不是只缩窄浏览器。

## 5. 属性、规则与观察清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `@media` | 按媒介特征应用规则 | `@media (width >= 48rem)` | 查看视口，不查看组件容器 |
| `width` 媒体特征 | 查询布局视口宽度 | `(min-width: 48rem)` | 不是物理设备宽度 |
| `height` | 查询视口高度 | `(height < 30rem)` | 不应据此裁切长内容 |
| `aspect-ratio` | 查询视口比例 | `(aspect-ratio > 3/2)` | 不证明输入方式 |
| `orientation` | 比较视口宽高 | `(orientation: landscape)` | 不代表平板或鼠标 |
| `resolution` | 查询输出分辨率 | `(min-resolution: 2dppx)` | 不表示布局空间更大 |
| `print` | 匹配打印媒介 | `@media print` | 用户打印设置仍会影响输出 |
| `matchMedia()` | 读取并监听查询匹配 | `matchMedia("(width >= 48rem)")` | 不能替代 CSS 布局或权限 |
| viewport meta | 设置移动布局视口 | `width=device-width` | 不应禁用缩放 |
| `@page` | 设置分页盒偏好 | `@page { margin: 16mm; }` | 浏览器/打印机设置可覆盖 |

## 6. 最小可运行案例

### 6.1 完整文件

创建 `market-learning/practice/css-07-media/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>内容断点实验 · 邻里集市</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #20382a;
      background: #f4f7f4;
      font: 1rem/1.65 system-ui, sans-serif;
    }
    .page {
      inline-size: min(100% - 2rem, 66rem);
      margin-inline: auto;
      padding-block: 1.5rem;
    }
    .toolbar, .filters, .results {
      min-inline-size: 0;
      padding: 1rem;
      border: 1px solid #6a826f;
      background: #fff;
    }
    .layout { display: grid; gap: 1rem; }
    .filters ul { padding-inline-start: 1.25rem; }
    .catalog {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
      gap: .75rem;
    }
    .listing {
      min-inline-size: 0;
      padding: 1rem;
      border: 1px solid #adbdaf;
      overflow-wrap: anywhere;
    }
    .listing h2 { margin-block-start: 0; font-size: 1.2rem; }
    button {
      min-block-size: 2.75rem;
      padding-inline: .8rem;
      font: inherit;
    }
    #report { white-space: pre-wrap; overflow-wrap: anywhere; }
    :focus-visible {
      outline: 3px solid #155fa0;
      outline-offset: 3px;
    }
    @media (width >= 48rem) {
      .layout {
        grid-template-columns: 15rem minmax(0, 1fr);
        align-items: start;
      }
      .filters {
        position: sticky;
        inset-block-start: 1rem;
      }
    }
    @media print {
      body { color: #000; background: #fff; }
      .page { inline-size: auto; padding: 0; }
      .layout { display: block; }
      .filters, #favorite, #report { display: none; }
      .toolbar, .results, .listing { border-color: #000; }
      .listing { break-inside: avoid; margin-block-end: 8mm; }
      .print-note { display: block; }
    }
    @media screen {
      .print-note { display: none; }
    }
    @page { margin: 16mm; }
  </style>
</head>
<body>
  <main class="page">
    <header class="toolbar">
      <h1>邻里集市目录</h1>
      <p>断点由筛选栏和结果区的内容需求决定。</p>
      <button id="favorite" type="button">收藏说明（仅内存演示）</button>
    </header>
    <div class="layout">
      <aside class="filters" aria-labelledby="filter-heading">
        <h2 id="filter-heading">筛选说明</h2>
        <ul>
          <li>状态：可预约</li>
          <li>价格：0–100 元</li>
          <li>筛选未连接 API</li>
        </ul>
      </aside>
      <section class="results" aria-labelledby="result-heading">
        <h2 id="result-heading">2 件商品</h2>
        <p class="print-note">打印副本：状态可能已变化，请回到页面确认。</p>
        <div class="catalog">
          <article class="listing">
            <h2>阅读台灯</h2>
            <p>39.00 元，可预约。灯罩有轻微痕迹。</p>
          </article>
          <article class="listing">
            <h2>适合小户型的木质收纳盒</h2>
            <p>25.00 元，已售。长标题用于验证内容断点。</p>
          </article>
        </div>
      </section>
    </div>
    <pre id="report" aria-label="响应式环境报告"></pre>
  </main>
  <script>
    const wide = matchMedia("(width >= 48rem)");
    const report = document.querySelector("#report");

    function writeReport() {
      report.textContent = [
        `视口 CSS 宽度: ${innerWidth}px`,
        `48rem 查询匹配: ${wide.matches}`,
        `当前打印匹配: ${matchMedia("print").matches}`,
        "匹配结果不能证明设备型号或用户权限"
      ].join("\n");
    }

    document.querySelector("#favorite").addEventListener("click", event => {
      event.currentTarget.textContent = "已触发当前页说明，没有持久化收藏";
    });

    wide.addEventListener?.("change", writeReport);
    addEventListener("resize", writeReport);
    writeReport();
  </script>
</body>
</html>
```

### 6.2 运行与观察

```bash
cd market-learning/practice/css-07-media
python3 -m http.server 8000
```

打开 `http://localhost:8000/`，结束时按 `Control+C`。

依次验证：

1. 320px：单列、无横向滚动、按钮可见；
2. 768px 左右：观察断点前后，不要求设备名称；
3. 1280px：侧栏与结果并排，结果列可收缩；
4. 浏览器 200% 缩放：布局按 CSS 可用空间重新判断；
5. 长标题：不遮挡价格；
6. 打印预览：筛选与按钮消失，商品、状态与打印提示保留。

失败时查看 Elements 的视口 meta、Computed 布局、媒体查询匹配标记与打印预览。

## 7. 邻里集市集成案例

把断点记录放进个人 `responsive-evidence.md`：

```text
组件：目录页筛选 + 商品结果
最窄可用：320 CSS px
失败现象：筛选 15rem 与结果最小内容并排后，结果标题过窄
选择断点：48rem
断点前：单列，筛选在结果之前
断点后：15rem + minmax(0, 1fr)
200% 缩放：回到单列
打印：隐藏不可执行操作，保留商品状态和副本说明
未验证：真实 iOS/Android 工具栏、Firefox/Safari 打印
```

业务集成边界：

- 筛选入口在所有宽度都存在，不因小屏失去查询能力；
- 商品状态用文字表达，打印成黑白仍可理解；
- 收藏按钮的可见性不是授权，真实操作仍由后端检查；
- 目录空、加载、失败和冲突状态都要有正文，不用媒体查询隐藏；
- CSS 断点不改变 `priceCents`、UTC 时间或 Listing 排序。

## 8. 常见错误与排查路径

### 明确错误案例：边界重叠

```css
@media (max-width: 48rem) {
  .layout { display: block; }
}
@media (min-width: 48rem) {
  .layout { display: grid; }
}
```

恰好 48rem 时两个查询都匹配，最终结果依赖层叠顺序。

| 记录项 | 内容 |
| --- | --- |
| 现象 | 在边界值改动源码顺序后，布局结果反转 |
| 证据 | DevTools 同时显示两条媒体规则匹配 |
| 原因 | `min-` 与 `max-` 都包含等于 |
| 修复 | 使用移动优先基础样式，仅在 `min-width` 查询覆盖变化 |
| 复验 | 边界附近只需解释一条增强规则，布局不靠双查询竞争 |

其他诊断：

- 移动模拟仍像宽桌面：检查是否缺少 viewport meta；
- 断点后仍溢出：检查结果列是否 `minmax(0, 1fr)` 和长内容断行；
- 横屏就错误显示桌面操作：`orientation` 只说明宽高关系；
- 打印有遮挡：关闭 fixed/sticky，检查打印预览而非普通窗口；
- 200% 缩放信息消失：不要按断点删除必要内容，改成重新排列。

## 9. 课后题

**问题 1：为什么不按 iPhone、iPad、Desktop 命名断点？**

<details>
<summary>参考答案</summary>

设备名不能稳定代表窗口、缩放、分屏和内容需求。断点应记录哪段真实内容在什么可用空间开始失败。

</details>

**问题 2：`orientation: landscape` 是否意味着有鼠标？**

<details>
<summary>参考答案</summary>

不是。它只比较视口宽高。输入能力需单独查询，且键盘路径始终应保留。

</details>

**问题 3：打印隐藏收藏按钮会保护数据吗？**

<details>
<summary>参考答案</summary>

不会。CSS 只改变输出。敏感数据不应先发送到页面；授权与数据访问由服务端执行。

</details>

## 10. 实践练习

### 基础：从失败选择断点

- **文件：**`exercise-breakpoint.html`、`breakpoint-record.md`。
- **操作：**用长标题和五位价格逐步缩窄两列页面。
- **预期：**记录内容开始不可用的宽度，再建立单个 `min-width` 增强。
- **失败观察：**标题断行、按钮换行、整页滚动。
- **完成标准：**记录解释内容证据，不出现设备品牌。

### 进阶：打印订单摘要

- **文件：**`exercise-print.html`。
- **操作：**打印时去掉筛选和收藏，保留商品、价格、状态、生成时间与“非实时”说明。
- **预期：**无 fixed 遮挡、无仅靠颜色的信息、卡片尽量不拆页。
- **失败观察：**打印预览页边界。
- **完成标准：**保存 PDF 或截图作为人工证据，不声称所有打印机一致。

### 故障注入：删除 viewport

- **文件：**`exercise-viewport.md` 与完整页面副本。
- **操作：**移除 viewport meta，在移动设备模拟中比较布局视口和截图。
- **预期：**页面可能以较宽布局视口缩放显示。
- **失败观察：**DevTools 尺寸与可读文字。
- **完成标准：**恢复 meta 后 320px 单列，并说明不能通过禁用用户缩放“修复”。

## 11. 阶段验收

- [ ] 基础样式在无媒体查询时可完成阅读和操作；
- [ ] 断点来自长内容拥挤记录；
- [ ] 320/768/1280px 与 200% 缩放均有证据；
- [ ] viewport meta 存在且未禁止缩放；
- [ ] 必要筛选和商品信息不因断点被删除；
- [ ] 打印预览保留状态与非实时边界；
- [ ] 能解释重叠边界查询的层叠结果；
- [ ] `matchMedia()` 未被用作设备身份或权限判断；
- [ ] 已记录未验证浏览器与真实设备。

## 12. 常见问题

**断点必须用 px 还是 rem？**<br>
没有单一强制答案。记录内容证据和目标环境；rem 常便于表达与字体尺度相关的阈值，但查询中的单位规则要准确理解。

**可以只测 DevTools 三个设备预设吗？**<br>
不够。预设是便利入口，还要拖动连续宽度、缩放、长内容、键盘和真实目标设备。

**`max-width` 是否违反移动优先？**<br>
不是语法禁令。移动优先强调小空间基础先成立；局部约束可使用合适查询，但避免两套整页样式反复覆盖。

**打印 CSS 能保证 PDF 完全相同吗？**<br>
不能。浏览器版本、纸张、边距、背景选项与打印机都会影响结果。应记录实际预览和目标环境。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/)：核对媒体类型、范围与用户特征。
- [MDN：使用媒体查询](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries)：复习组合和范围语法。
- [MDN：viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)：核对移动布局视口和缩放边界。
- [MDN：打印](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Printing)：核对打印样式与 `@page`。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对状态、权限和阶段边界。

范围语法、打印分页细节与 DevTools 模拟需要按目标浏览器核验。真实移动工具栏、安全区和打印机不在本地桌面截图的证明范围内。

## 我现在能做到什么

我能从真实内容失败点选择媒体断点，建立小空间优先页面，并用缩放与打印证据说明媒体查询的职责边界。下一课会让同一组件在相同视口内按自己的容器空间变化。

## 单元导航

- [上一章：Grid 与 Subgrid](../06-grid.md)
- [返回第七章入口](../07-responsive-container.md)
- [下一课：容器查询与容器单位](02-container-queries-units.md)
- [返回 CSS 模块](../README.md)
