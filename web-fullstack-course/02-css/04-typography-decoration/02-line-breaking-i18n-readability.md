# 换行、国际化与可读性：让内容决定所需空间

## 任务卡

- **任务**：让中英混合商品名、长 URL、阿拉伯语卖家名和放大文本都能完整阅读。
- **产出**：`practice/css-04-02/minimal.html` 与 `practice/css-04-02/market.html`。
- **运行**：直接打开，在 320px、200% 缩放和不同 `lang/dir` 状态下观察。
- **完成证据**：换行策略对照、行盒高度记录、双向文本截图和裁切故障诊断。
- **边界**：本页只做代表性脚本测试，不声称完成所有语言断行、断字词典或屏幕阅读器验证。

## 1. 任务背景

邻里集市商品名可能包含中文、英文型号、URL、数字和从右到左的卖家名。`white-space: nowrap; overflow: hidden; text-overflow: ellipsis` 能让卡片看起来整齐，却可能在放大后永久隐藏名称和状态。

可读排版必须允许内容增长。行高、行宽、断行和方向应基于语言与结构，而不是用固定高度把差异裁掉。

## 2. 学习目标

完成后你能：

1. 解释字符、字形、行内盒和行盒的基本关系；
2. 区分 `white-space`、`overflow-wrap`、`word-break`、`hyphens` 的职责；
3. 为正文选择可缩放行高与合理行宽；
4. 用 HTML `lang`、`dir` 和隔离元素处理基础国际化方向；
5. 识别竖排、双向文本和多行截断的兼容与可访问性边界。

## 3. 预备知识

需要理解字体回退和盒溢出。测试真实内容，不用重复 Lorem ipsum 代替中文、长型号或混合方向。HTML 的语言与方向是语义输入，CSS 不应凭字符猜测业务语言。

不要通过 letter-spacing 压缩文字来塞进固定容器。用户样式可能增大字距、词距和行高，页面应容纳这些变化。

## 4. 核心理论

文本被字体塑形成字形并组织到行内格式化上下文。行内盒参与行盒高度计算，基线、上升部、下降部、替换元素和 vertical-align 都会影响一行。`line-height` 不是文字盒的固定高度，也不应与容器 height 配合裁掉放大文本。

推荐正文使用无单位行高：

```css
body { font-size: 1rem; line-height: 1.65; }
```

无单位因子被继承，子元素按自己的字号计算。标题可用较紧但仍可读的 1.2 至 1.35；具体值要结合字体、语言和字号测试。

换行控制：

- `white-space` 决定空白折叠、显式换行保留和自动换行；
- `overflow-wrap: anywhere` 在否则会溢出时提供任意断点，并影响 min-content；
- `overflow-wrap: break-word` 有历史兼容语义，内在尺寸处理与 anywhere 有差异；
- `word-break: break-all` 可在非 CJK 文本任意字符间断开，可读性较差；
- `word-break: keep-all` 限制 CJK 字间断行，可能增加溢出风险；
- `hyphens: auto` 依赖正确 `lang`、字典和浏览器支持，为词添加断字机会。

URL 与不可断标识通常用 `overflow-wrap: anywhere`。普通自然语言先依赖默认断行与 hyphens，不能对所有正文统一 break-all。

`text-wrap: balance` 适合短标题平衡少量行，`pretty` 尝试改善孤行等排版；它们是增强，不应配合固定高度。多行 `line-clamp` 会隐藏内容，适合有明确“展开”入口和产品要求的摘要，不适合价格、错误、状态等关键信息。

国际化基础：

- 文档与片段使用准确 `lang`；
- 未知方向的用户文本可用 `dir="auto"`；
- 把嵌入方向不同的动态文本放进 `<bdi>` 隔离，避免标点与数字串扰；
- `<bdo dir>` 只在确需覆盖双向算法时使用；
- CSS `direction`/`unicode-bidi` 是呈现工具，不替代语义属性。

竖排可用 `writing-mode: vertical-rl`、`text-orientation` 等，但会改变内联/块轴、尺寸与滚动。除明确产品需求，不把整个操作界面旋转来制造装饰。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 边界 |
| --- | --- | --- |
| `line-height` | 设置行盒基线间距 | 无单位更利于子字号缩放 |
| `max-inline-size` | 限制阅读行宽 | `ch` 不等于中文字数 |
| `white-space` | 控制空白与换行 | nowrap 会阻止普通换行 |
| `overflow-wrap` | 为长串提供紧急断点 | anywhere 会影响 min-content |
| `word-break` | 控制词内/字符间断行 | break-all 可能损害可读性 |
| `hyphens` | 语言相关断字 | 依赖 lang 和字典 |
| `text-wrap` | 改善行分配 | 新值需兼容回退 |
| `writing-mode` | 改变排版轴 | 会影响逻辑尺寸与滚动 |
| `lang` / `dir` / `<bdi>` | 提供语言方向语义 | 应由真实内容/业务给出 |
| `Range.getClientRects()` | 观察文本行片段 | 一行也可能有多个双向片段 |

## 6. 最小可运行案例

创建 `practice/css-04-02/minimal.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>文本换行观察台</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 2rem; font: 1rem/1.65 system-ui, sans-serif; }
    .panel { inline-size: 18rem; max-inline-size: 100%; padding: 1rem; border: 2px solid #718078; }
    h1 { font-size: 1.5rem; line-height: 1.25; text-wrap: balance; }
    .url { overflow-wrap: anywhere; }
    .rtl { padding: .5rem; background: #eef4f0; }
    output { display: block; margin-block-start: 1rem; white-space: pre-wrap; }
  </style>
</head>
<body>
  <main class="panel">
    <h1>Neighborhood 邻里集市文本观察</h1>
    <p class="url">https://example.invalid/listings/very-long-product-identifier-without-a-short-break</p>
    <p class="rtl">卖家：<bdi dir="auto">سارة-2026</bdi>，评分 4.9</p>
    <output id="report"></output>
  </main>
  <script>
    const heading = document.querySelector("h1");
    const range = document.createRange();
    range.selectNodeContents(heading);
    document.querySelector("#report").textContent =
      `标题文本片段盒数量：${range.getClientRects().length}；` +
      `标题高度：${heading.getBoundingClientRect().height.toFixed(1)}px。`;
  </script>
</body>
</html>
```

长 URL 可在必要位置断开，不造成页面横滚；`bdi` 隔离阿拉伯语名字，使后续中文标点和评分方向稳定。片段盒数量不严格等同视觉行数，因为双向文本等情况一行可有多个片段，但可作为观察线索。

逐步扩展：

1. 删除 anywhere，缩窄到 12rem，比较 scrollWidth；
2. 改用 break-all，观察英文可读性差异后恢复；
3. 给段落 `white-space: nowrap`，记录溢出；
4. 把页面根字号放大到 200%，确认容器高度随内容增长。

## 7. 邻里集市集成案例

创建 `practice/css-04-02/market.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>邻里集市国际化文本</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html { font-size: 100%; }
    body { margin: 0; font: 1rem/1.7 system-ui, sans-serif; color: #26352d; }
    .market { inline-size: min(46rem, 100% - 2rem); margin: 2rem auto; }
    .intro { max-inline-size: 38rem; }
    .listing { padding: 1rem; border: 1px solid #78877e; border-radius: .5rem; }
    .listing h2 { margin-block-start: 0; font-size: 1.5rem; line-height: 1.3; text-wrap: balance; }
    .description { max-inline-size: 60ch; }
    .identifier, .contact { overflow-wrap: anywhere; }
    .price { color: #185c3b; font-size: 1.25rem; font-weight: 700; }
    .seller { padding: .5rem; background: #eef5f0; }
    button { min-block-size: 2.75rem; padding-inline: 1rem; font: inherit; }
    :focus-visible { outline: 3px solid #175ca2; outline-offset: 3px; }
  </style>
</head>
<body>
  <main class="market">
    <h1>邻里集市</h1>
    <p class="intro">静态演示：混合语言内容用于排版验证，不会联系真实卖家。</p>
    <article class="listing">
      <h2>手作木质 Bookshelf — Extra Long Edition 家用书架</h2>
      <p class="description">说明包含中文与 English words。文本可以增长，卡片没有固定高度，也不以省略号隐藏商品名。</p>
      <p class="identifier">商品链接：https://example.invalid/market/listing/bookshelf-extra-long-edition-2026</p>
      <p class="seller">卖家：<bdi dir="auto">ليلى_2026</bdi>；评分 4.8</p>
      <p class="price" data-price-cents="12800">128.00 元</p>
      <button type="button">查看完整静态说明</button>
    </article>
    <output id="evidence"></output>
  </main>
  <script>
    const root = document.documentElement;
    const title = document.querySelector(".listing h2");
    document.querySelector("#evidence").textContent =
      `页面横向溢出：${root.scrollWidth > root.clientWidth ? "是" : "否"}；` +
      `标题完整文本长度：${title.textContent.length}。`;
  </script>
</body>
</html>
```

标题与说明允许自然增长。`60ch` 只是拉丁数字 0 度量下的阅读宽度起点，不是“60 个中文字符”的保证。动态卖家名由 bdi 隔离；若服务端已知方向，应输出准确 dir，而不是永远依赖 auto。

## 8. 常见错误与排查路径

**明确错误示例：**

```css
.listing h2 {
  height: 2.4em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

它把长商品名和放大文本裁成单行，且没有展开机制；用户无法确认完整商品。

排查路径：

1. 确认真实 `lang`、`dir` 与文本字符；
2. 查看 white-space 是否阻止换行；
3. 定位最长不可断片段，选择自然断行、hyphens 或 anywhere；
4. 检查固定 height、line-clamp、overflow 是否裁切；
5. 测试字距/词距/行高和 200% 缩放；
6. 检查双向隔离、复制顺序与键盘焦点。

诊断记录：

| 项目 | 记录 |
| --- | --- |
| 现象 | 200% 缩放后商品名只剩省略号，无法辨认版本 |
| 证据 | h2 同时设置 nowrap、固定 height 与 hidden；DOM 有完整文本但不可见 |
| 原因 | 为固定卡片高度强制单行裁切，未提供展开入口 |
| 修复 | 删除固定高度与 nowrap，允许自然换行；仅装饰性短标题可渐进使用 balance |
| 复验 | 320px/200% 下完整标题可读，卡片增高，按钮仍在标题之后 |

## 9. 课后题

1. `overflow-wrap: anywhere` 与 `word-break: break-all` 的目标有何差异？
2. `hyphens: auto` 为什么需要 lang？
3. 无单位 line-height 有什么继承优势？
4. 为什么 `<bdi>` 适合未知方向的动态用户名？
5. line-clamp 可以用于错误消息吗？

答案：

1. anywhere 在需要时提供紧急断点；break-all 对非 CJK 文本可任意字符断开，通常更损害可读性。
2. 浏览器需要语言断字规则和词典判断合法位置。
3. 子元素按自己的字号重新计算行高，不继承固定长度造成挤压。
4. 它把片段方向与周围文本隔离，减少标点和数字串扰。
5. 不应隐藏关键错误；错误应完整可见或有明确可访问的展开机制。

## 10. 实践练习

**基础**：加入一个很长的无空格商品编号，用 anywhere 修复。
验收：根 scrollWidth 不增加，正常中文描述不被逐字破坏。

**进阶**：添加一段 `lang="en"` 英文说明并测试 `hyphens: auto`。
验收：记录浏览器/字典差异，没有断字时仍不溢出。

**故障注入**：给标题加 nowrap、hidden 和固定 height。
验收：记录完整 DOM 与不可见 UI 的差异；移除裁切后在 320px/200% 复验。

## 11. 阶段验收

- [ ] 中英混合标题、URL、数字与 RTL 名称均有测试。
- [ ] 关键内容没有 nowrap + hidden 或无展开 line-clamp。
- [ ] 行高为可缩放策略，容器无固定高度裁字。
- [ ] 根 scrollWidth 与 clientWidth 在窄屏下一致。
- [ ] DOM、复制和视觉顺序未被 CSS direction 误改。
- [ ] 所有语言、竖排、真实屏幕阅读器的未验证边界已记录。

## 12. 常见问题

**可以统一给所有元素 `word-break: break-all` 吗？**
不建议。它会破坏英文词和标识可读性；只对确有需求的内容选择合适断行策略。

**`text-wrap: balance` 会改变语义吗？**
不会，它调整行分配；但支持和性能有边界，基础自然换行必须可用。

**如何限制摘要长度？**
优先在数据层提供真实摘要。视觉 line-clamp 必须有可访问的完整入口，且不可用于价格、状态、错误。

**CSS 能自动翻译或判断语言吗？**
不能。语言、方向和翻译来自内容与应用，CSS 只根据这些输入排版。

## 13. 扩展阅读

资料快照：2026-10-11。

- [CSS Text Level 3](https://www.w3.org/TR/css-text-3/)
- [CSS Text Level 4](https://www.w3.org/TR/css-text-4/)
- [CSS Writing Modes Level 4](https://www.w3.org/TR/css-writing-modes-4/)
- [Unicode Bidirectional Algorithm](https://www.unicode.org/reports/tr9/)
- [MDN：Wrapping and breaking text](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_text/Wrapping_breaking_text)
- [W3C：Internationalization techniques](https://www.w3.org/International/techniques/authoring-html)

兼容边界：`overflow-wrap` 基础值广泛支持；`text-wrap: balance/pretty`、hyphenation 字典、竖排细节和双向片段在引擎间有差异。Safari、Firefox、所有目标语言和屏幕阅读器未实测。

## 我现在能做到什么

我能按语言、内容和断行职责选择文本规则，让长内容和放大文字完整可读，并为混合方向文本建立语义隔离。

## 单元导航

- 上一单元：[字体加载、回退与度量](./01-font-loading-fallback-metrics.md)
- 下一单元：[背景、边框、阴影、滤镜与裁剪](./03-background-border-shadow-filter-clip.md)
- 分卷目录：[CSS](../README.md)
