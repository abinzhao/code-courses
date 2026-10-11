# 图片、媒体与图表替代：保留等价任务信息

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 为图片、字幕、文字稿、音频描述和 Canvas 图表提供任务等价信息。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `A11Y-010` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

为图片、字幕、文字稿、音频描述和 Canvas 图表提供任务等价信息。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 A11Y-010（图片、字幕、音频描述和图表替代）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 图片替代取决于当前任务

替代文本描述的不是文件，而是图片在当前上下文中承担的意义：

| 图片类型 | 最小策略 | 示例 |
| --- | --- | --- |
| 信息图片 | `alt` 传达完成任务所需的信息 | `alt="木桌右前角有约 3 厘米划痕"` |
| 纯装饰图片 | `alt=""` | 与旁边标题重复的花纹 |
| 只有图片的链接/按钮 | `alt` 表达目标或动作 | `alt="查看折叠学习桌详情"` |
| 链接已有同等可见文字 | 图片通常 `alt=""` | 图标旁已有“查看详情” |
| 复杂图或图表 | 短 `alt`/名称 + 邻近详细说明或数据表 | 趋势摘要和完整数值表 |

错误写法：

```html
<!-- 缺少 alt：浏览器可能暴露文件名，语义不确定。 -->
<img src="desk-scratch.jpg">

<!-- 冗余且没有传达任务信息。 -->
<img src="desk-scratch.jpg" alt="一张商品图片的照片">

<!-- 错把有信息的瑕疵照片标为装饰。 -->
<img src="desk-scratch.jpg" alt="">
```

正确写法：

```html
<figure>
  <img
    src="desk-scratch.jpg"
    alt="折叠学习桌右前角有约 3 厘米浅划痕"
    width="640"
    height="480">
  <figcaption>划痕不影响折叠结构，建议现场确认。</figcaption>
</figure>
```

`figcaption` 是可见图注，不会自动替代 `alt` 判断。若图注已完整表达同一信息，可根据上下文缩短 `alt`，避免机械重复；必须在目标辅助技术中检查实际名称和阅读顺序。

### 4.2 字幕、翻译、文字稿和音频描述解决不同缺口

| 内容 | 主要服务对象/场景 | 必须包含 | 不能替代 |
| --- | --- | --- | --- |
| captions | 听不见或不便播放声音的用户 | 对白、说话者、理解所需的非语言声音 | 关键视觉动作的描述 |
| subtitles | 听得见但不理解原语言的用户 | 对白翻译 | 同语言声音信息的完整 captions |
| 文字稿 transcript | 需要顺序阅读、搜索、复制或无法播放媒体 | 对白、关键声音；按需求加入视觉说明 | 视频中与时间同步的 captions |
| audio description | 看不见关键画面的用户 | 在对白间隙描述重要视觉信息 | 原始对白和声音 |

示例结构：

```html
<video controls preload="metadata" aria-describedby="video-alternatives">
  <source src="lamp-check.mp4" type="video/mp4">
  <track
    kind="captions"
    srclang="zh"
    label="中文"
    src="lamp-check.zh.vtt"
    default>
  <track
    kind="descriptions"
    srclang="zh"
    label="中文视觉描述"
    src="lamp-check.descriptions.zh.vtt">
</video>

<div id="video-alternatives">
  <p>
    <a href="lamp-check-described.mp4">播放带音频描述版本</a>
  </p>
  <details>
    <summary>阅读验货文字稿与视觉说明</summary>
    <p>[开关按下声] 台灯亮起。灯罩左侧有一道细裂纹，电线外皮完整。</p>
  </details>
</div>
```

`kind="descriptions"` 的原生呈现支持和用户界面存在组合差异，不能把关键视觉信息只押在这条轨道上。生产页面应在目标播放器、浏览器和辅助技术中验证，并提供可发现的带描述版本或页面文字说明。

`poster` 没有 `alt`，也不是视频内容替代。资源请求成功、字幕存在、字幕准确同步、关键视觉有描述是四项不同证据。

### 4.3 Canvas 图表：像素视图是增强，HTML 数据是基线

Canvas 绘图不会创建“柱形”“坐标轴”“价格单元格”这些 DOM 节点。一句 `aria-label="价格图"` 只能命名图，不能交付完整数据。

稳妥结构：

```html
<figure aria-labelledby="chart-title" aria-describedby="chart-summary">
  <h2 id="chart-title">在售商品价格比较</h2>
  <p id="chart-summary">
    折叠学习桌价格最高，为 89 元；帆布包最低，为 25 元。
  </p>

  <canvas
    id="price-chart"
    width="640"
    height="260"
    role="img"
    aria-labelledby="chart-title"
    aria-describedby="chart-summary">
    当前浏览器不能绘制价格图，请阅读后面的价格表。
  </canvas>

  <div role="region" aria-labelledby="price-table-title" tabindex="0">
    <h3 id="price-table-title">价格数据表</h3>
    <table>
      <thead>
        <tr>
          <th scope="col">商品</th>
          <th scope="col">价格</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">折叠学习桌</th>
          <td><data value="8900">89.00 元</data></td>
        </tr>
      </tbody>
    </table>
  </div>
</figure>
```

原则：

- 摘要告诉用户主要结论；
- 表格交付精确数据和表头关系；
- Canvas 提供视觉增强；
- 绘图和表格读取同一份整数分数据，避免事实漂移；
- 不因 Canvas 正常绘制而给表格加 `aria-hidden`；
- 二维表格在窄屏可以拥有局部横向滚动，不应让整页横向滚动。

若图表包含可操作筛选或数据点详情，普通 HTML 还要提供等价控件和结果，不能让非视觉用户只能读静态摘要。

## 5. 元素、属性、API 或配置清单

### 5.1 媒体、布局与偏好

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `img[alt]` | 提供当前语境的图片替代 | `<img alt="右前角有划痕">` | 装饰图用空 alt，不是省略属性 |
| `track[kind="captions"]` | 同步对白和关键声音 | `<track kind="captions">` | 文件成功不等于内容准确 |
| `track[kind="descriptions"]` | 关联视觉描述轨道 | `<track kind="descriptions">` | 原生呈现支持需实测，保留其他路径 |
| 页面文字稿 | 提供可搜索、顺序阅读内容 | `<details><p>…</p></details>` | 不能替代视频同步 captions |
| `canvas` 后备内容 | Canvas 不可用时说明替代 | `<canvas>请读表格</canvas>` | 仍应保留可见摘要和表格 |
| `table` | 提供图表精确二维数据 | `<table>…</table>` | 窄屏可局部横向滚动 |
| viewport meta | 设置移动布局视口 | `width=device-width, initial-scale=1` | 不限制用户缩放 |
| `min-block-size` | 提供目标最小高度 | `min-block-size: 2.75rem` | 还要检查间距、覆盖和真实触控 |
| `prefers-reduced-motion` | 响应减少动效偏好 | `@media (prefers-reduced-motion: reduce)` | 保留最终状态与必要反馈 |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/06-images-media-chart-alternatives/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 A11Y-010（图片、字幕、音频描述和图表替代） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 在打开页面前写下预期 DOM、默认行为或请求结果；
4. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
5. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [表单、对话框与列表焦点：失败后回到正确位置](05-form-dialog-list-focus-recovery.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 A11Y-010（图片、字幕、音频描述和图表替代） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`05-form-dialog-list-focus-recovery.md`](05-form-dialog-list-focus-recovery.md)。

## 8. 常见错误与排查路径

### 8.1 把缺失 `alt` 和空 `alt` 当成同一件事

```html
<img src="scratch.jpg">
<img src="scratch.jpg" alt="">
```

- **现象**：第一张可能暴露文件名；第二张通常作为装饰不提供图片信息。
- **证据**：Accessibility 树中的名称/角色不同。
- **原因**：省略属性表示没有提供替代，空值表示作者判定图片在当前上下文为装饰。
- **修复**：瑕疵照片写任务相关替代；真正装饰图才写 `alt=""`。
- **复验**：关闭图片或用读屏，仍能知道影响购买判断的瑕疵。

### 8.2 字幕只写对白，遗漏关键声音

```text
00:00:03.000 --> 00:00:05.000
台灯可以点亮。
```

- **现象**：看不到声音信息的用户不知道开关声、蜂鸣、撞击或报警。
- **证据**：逐段对照音轨和 VTT，关键非语言声音缺失。
- **原因**：把 captions 误当作纯对白抄录。
- **修复**：加入理解所需的声音与说话者信息，例如 `[开关按下声]`。
- **复验**：静音播放，仅看 captions 仍能理解关键验货过程。

### 8.3 用文字稿替代同步 captions

- **现象**：页面有完整文字，但视频播放时听障用户无法同步知道当前对白。
- **证据**：播放器没有可用 captions 轨道，只有页面下方长文。
- **原因**：混淆顺序阅读替代与时间同步替代。
- **修复**：预录同步视频提供准确 captions；文字稿作为额外可搜索路径。
- **复验**：分别验证轨道同步和文字稿完整性。

### 8.4 只有 Canvas 和一句“价格图”

```html
<canvas aria-label="商品价格图"></canvas>
```

- **现象**：用户知道这里有图，却不知道商品和数值。
- **证据**：Canvas 绘图没有对应 DOM 数据点；页面没有摘要或表格。
- **原因**：名称只标识对象，不等于复杂内容替代。
- **修复**：增加主要结论、完整语义表格；交互图还要有等价控件。
- **复验**：禁用脚本或忽略 Canvas，仍能回答最高、最低和每项精确价格。

## 9. 课后题

1. A11Y-010（图片、字幕、音频描述和图表替代）解决的内容关系或浏览器行为是什么？
2. 哪个相似写法只会得到接近的外观，却不能表达相同语义？
3. 你会用哪一项开发者工具证据区分正确实现和偶然显示？
4. 本课结论中，哪些需要服务端、其他浏览器或辅助技术继续验证？

## 10. 实践练习

### 10.1 提升练习：媒体替代审计

**文件：**

```text
market-learning/practice/html-chapter-07/exercise-media.html
market-learning/practice/html-chapter-07/media-audit.md
```

**任务：**

1. 选择一段自己有权使用、10–20 秒且含声音和关键动作的视频；
2. 编写 captions，包含对白和理解所需声音；
3. 提供页面文字稿；
4. 标出仅靠声音无法获得的视觉事实；
5. 提供音频描述版本、描述轨道或完整可见视觉说明；
6. 给 poster 附近内容提供真实替代，不把 poster 当 `alt`。

**运行：**分别在有声、静音、不看画面三种条件下完成理解问题。

**预期：**三种条件都能获得完成任务所需事实；字幕与视频时间同步。

**失败观察：**Network、MIME、VTT 第一行和 cue 时间、`textTracks`、播放器字幕菜单。

**完成标准：**审计报告分别评价 captions、文字稿和视觉描述，不能用一个“通过”覆盖三项。

### 10.2 提升练习：Canvas 与语义表格

**文件：**

```text
market-learning/practice/html-chapter-07/exercise-chart.html
```

**任务：**

1. 用 5 件商品的整数分数据创建语义表格；
2. 写一段包含最高、最低和差值的文字摘要；
3. 从同一数据源绘制 Canvas；
4. 在窄屏让 Canvas 缩放，表格包装器局部滚动；
5. 禁用脚本后回答所有数据问题。

**运行：**直接打开；DevTools 禁用脚本；再把内容宽度调到约 320 CSS px。

**预期：**脚本关闭时表格和摘要完整；整页不横向滚动，表格区域可局部滚动。

**失败观察：**表头 `scope`、Canvas 名称/描述、整页 `scrollWidth`、表格包装器。

**完成标准：**非视觉路径可以回答每项数值，不只知道“有一张图”。

## 11. 阶段验收

### 11.1 A11Y-010：图片、媒体与图表替代

- [ ] 信息图片的 `alt` 传达当前任务事实；
- [ ] 装饰图片使用空 `alt`，不是省略；
- [ ] 只有图片的操作能从替代文本得知目标；
- [ ] captions 包含对白和关键声音；
- [ ] subtitles 没有被误当同语言 captions；
- [ ] 页面文字稿可以独立阅读和搜索；
- [ ] 关键视觉由 audio description、描述版本或完整视觉说明提供；
- [ ] poster 没有被当作视频替代；
- [ ] Canvas 有名称和摘要；
- [ ] 图表精确数据始终存在于语义表格；
- [ ] 禁用脚本或不看 Canvas 仍能完成数据任务。

### 11.2 媒体人工验收范围

- [ ] captions 与画面/声音逐段对照，不只检查轨道菜单存在；
- [ ] 关键非语言声音进入 captions；
- [ ] 不看画面时，描述或文字说明覆盖关键视觉；
- [ ] 静音时，captions 足以理解音频内容；
- [ ] 文字稿可独立阅读；
- [ ] Network 与 MIME 成功不被当作内容质量证据；
- [ ] 没有真实媒体时，明确记录“结构已验、媒体内容未验”；
- [ ] 未测试的播放器、Safari/Firefox 和移动端组合单独列出。

## 12. 常见问题

### Q10：图片有 `figcaption`，`alt` 可以总是留空吗？

不可以一概而论。图注和 alt 的阅读位置、用途不同。判断两者是否完整重复、图片是否承担操作或关键信息，再决定简化；要检查真实阅读顺序。

### Q11：有完整文字稿，还需要 audio description 吗？

文字稿能提供替代路径，但观看同步媒体时，关键视觉仍可能需要音频描述。具体要求与媒体类型、成功准则级别和用户任务有关；不要把一份文字稿宣称为所有场景的完整替代。

### Q12：`track kind="descriptions"` 写了就能在所有浏览器听到吗？

不能。原生 UI 和辅助技术支持存在差异。应提供可发现的带描述媒体版本或页面视觉说明，并在目标组合实测。

### Q13：Canvas 内部写表格作为 fallback 就够了吗？

Canvas 子内容可作为后备语义的一部分，但可见邻近表格更容易被所有用户发现、比较和复制，也能在 Canvas 正常显示时提供精确数据。本课使用始终可见表格。

## 13. 扩展阅读

### 图片、媒体与图表替代

- [WHATWG HTML：Requirements for providing text to act as an alternative for images](https://html.spec.whatwg.org/multipage/images.html#alt)：核对信息图、装饰图和功能图片的 `alt` 要求。
- [W3C WAI：Images Tutorial](https://www.w3.org/WAI/tutorials/images/)：按图片用途选择短替代、空替代和复杂图片说明。
- [WHATWG HTML：The `track` element](https://html.spec.whatwg.org/multipage/media.html#the-track-element)：核对字幕、描述、章节轨道和属性。
- [W3C WebVTT](https://www.w3.org/TR/webvtt1/)：核对 WebVTT 文件、cue 和处理模型。
- [W3C WCAG 2.2：Captions (Prerecorded) 1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html)：核对预录同步媒体 captions 的目的。
- [W3C WCAG 2.2：Audio Description or Media Alternative (Prerecorded) 1.2.3](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html)：理解视觉信息替代的边界。
- [W3C WCAG 2.2：Audio Description (Prerecorded) 1.2.5](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html)：核对音频描述要求。
- [WHATWG HTML：The `canvas` element](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element)：核对位图、后备内容和可访问性要求。
- [W3C WAI：Complex Images Tutorial](https://www.w3.org/WAI/tutorials/images/complex/)：查看图表短描述、长描述和数据表策略。

## 我现在能做到什么

- 能解释并验证：为图片、字幕、文字稿、音频描述和 Canvas 图表提供任务等价信息。
- `A11Y-010`：图片、字幕、音频描述和图表替代
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：表单、对话框与列表焦点：失败后回到正确位置](05-form-dialog-list-focus-recovery.md) · [下一课：缩放、触控、颜色与动效：守住视觉使用边界](07-zoom-touch-color-motion.md) · [返回 HTML 模块](../README.md)
