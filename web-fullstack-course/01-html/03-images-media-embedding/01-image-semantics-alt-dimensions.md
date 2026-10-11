# 图片语义、替代文本与尺寸

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 根据图片职责编写替代文本，并用固有尺寸与宽高属性减少布局偏移。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `MED-001`、`MED-002` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

根据图片职责编写替代文本，并用固有尺寸与宽高属性减少布局偏移。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 MED-001（`img` 的 `src`、`alt`、固有尺寸）、MED-002（装饰图、信息图和链接图替代文本）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

## 4. 核心理论

### 4.1 `img` 是替换内容，不是带结束标签的容器

最小图片写法是：

```html
<img
  src="./images/reading-lamp.jpg"
  alt="米白色阅读台灯，灯罩边缘有轻微划痕"
  width="1200"
  height="900">
```

`img` 是空元素，不写 `</img>`，也不能把后备文字放在开始标签和结束标签之间。它的核心输入是：

- `src`：图片资源 URL。
- `alt`：图片无法被获取、解码、显示或感知时，承担等价意义的文字。
- `width`、`height`：无单位的非负整数，提供图片尺寸与比例信息。

浏览器最终绘制的图片属于“替换内容”：元素在布局中有一个盒子，图片像素替换这个盒子的内容区域。CSS 可以改变盒子的显示尺寸，但不会改写图片文件本身。

至少应提供 `src` 或 `srcset` 之一。教材示例仍保留 `src`，因为它既是简单回退，也让源代码的基本意图更清楚。

### 4.2 固有尺寸、属性尺寸与渲染尺寸不是同一个值

假设 `reading-lamp.jpg` 的像素矩阵是 1200 × 900：

| 名称 | 示例 | 含义 |
| --- | --- | --- |
| 固有宽高 | 1200 × 900 | 图片资源本身提供的自然尺寸 |
| 固有比例 | 4:3 | 资源宽高关系 |
| HTML 宽高属性 | `width="1200" height="900"` | 下载前提供比例和默认尺寸提示 |
| CSS 渲染尺寸 | 600 × 450 CSS px | 当前布局实际占用的尺寸 |
| 物理像素需求 | 可能为 1200 × 900 | 受设备像素密度、缩放等影响 |

对应 DOM 属性：

```js
const image = document.querySelector("img");

console.log({
  renderedWidth: image.width,
  renderedHeight: image.height,
  intrinsicWidth: image.naturalWidth,
  intrinsicHeight: image.naturalHeight
});
```

- `width`、`height` DOM 属性反映当前渲染尺寸，单位是 CSS 像素。
- `naturalWidth`、`naturalHeight` 在可用时反映密度修正后的固有尺寸，单位是 CSS 像素，失败时通常为 `0`。使用 `x` 或 `w` 候选后，它们不一定等于图片文件中原始像素矩阵的宽高；原始像素应从文件元数据或候选的真实尺寸核对。
- `getBoundingClientRect()` 可以得到包含小数的实际布局矩形。

响应式图片常配合：

```css
img {
  display: block;
  max-width: 100%;
  height: auto;
}
```

这里 `max-width: 100%` 防止图片溢出容器，`height: auto` 保持比例。不要因为 CSS 能缩放就删除 HTML 宽高属性。现代浏览器可以在图片下载前根据属性计算默认宽高比，提前预留空间。

宽高属性应使用图片真实比例。下面是错误示例：

```html
<!-- 错误：真实图片是 1200 × 900，却声明成 1200 × 400。 -->
<img
  src="./images/reading-lamp.jpg"
  alt="米白色阅读台灯"
  width="1200"
  height="400">
```

浏览器先按 3:1 预留空间，图片可用后又发现固有比例为 4:3，仍可能发生偏移或拉伸。宽高不是“随便填两个大数字”。

### 4.3 `alt` 取决于图片在当前上下文中的职责

替代文本不是图片文件的固定标签。相同照片放在不同上下文中，`alt` 可能不同。

#### 信息图片

商品照片提供了正文没有表达的成色信息：

```html
<img
  src="./images/lamp-scratch.jpg"
  alt="台灯底座右侧有约两厘米浅色划痕"
  width="800"
  height="600">
```

好的替代文本传递当前任务需要的信息，不必写“图片”“照片显示”。辅助技术已经知道这是图片。

#### 纯装饰图片

分隔花纹不增加信息：

```html
<img
  src="./images/leaf-divider.svg"
  alt=""
  width="160"
  height="24">
```

显式的 `alt=""` 告诉辅助技术忽略它。若装饰效果可由 CSS 背景实现，也可以不创建 `img`。

**遗漏 `alt` 不等于空 `alt`。** 遗漏时，辅助技术可能尝试读文件名、URL 或发出“未标注图片”提示；空值则明确表示图片不承担内容。

#### 链接中的图片

如果链接里只有一张图片，替代文本应表达链接目标：

```html
<a href="./listing-lamp.html">
  <img
    src="./images/lamp-thumb.jpg"
    alt="查看阅读台灯商品详情"
    width="320"
    height="240">
</a>
```

错误示例：

```html
<!-- 错误：只描述像素外观，没有说明链接会做什么。 -->
<a href="./listing-lamp.html">
  <img
    src="./images/lamp-thumb.jpg"
    alt="一张台灯图片"
    width="320"
    height="240">
</a>
```

如果同一个链接已经有清楚的可见文字，图片通常可以为空替代，避免重复：

```html
<a href="./listing-lamp.html">
  <img
    src="./images/lamp-thumb.jpg"
    alt=""
    width="320"
    height="240">
  <span>查看阅读台灯商品详情</span>
</a>
```

复杂图表不能只塞一长串 `alt`。应提供简短识别，并在正文、表格或相邻说明中给出完整数据。视觉装饰、照片信息、功能动作和复杂数据需要分别判断。

### 4.4 宽高比例是减少布局偏移的第一道防线

没有尺寸信息时，浏览器在图片字节到达前可能按接近 0 高度布局：

```html
<!-- 错误：下载前不知道比例，下面的文字可能在加载后被推开。 -->
<img src="./images/lamp-1200.jpg" alt="米白色阅读台灯">
<p>售价：39.00 元</p>
```

修复：

```html
<img
  src="./images/lamp-1200.jpg"
  alt="米白色阅读台灯"
  width="1200"
  height="900">
<p>售价：39.00 元</p>
```

配合：

```css
img {
  display: block;
  width: 100%;
  height: auto;
}
```

浏览器可以根据 1200:900 计算当前宽度下所需高度。注意：

- 属性比例必须与候选图片比例一致。
- 如果艺术指导使用不同宽高比，应给相应 `source` 写匹配的 `width`、`height`，或按媒体条件预留比例。
- `object-fit: cover` 可以裁切替换内容，但不能自动修正错误语义或错误比例。
- 预留空间能减少图片造成的布局偏移，不代表整页 CLS 一定为 0；字体、广告和动态内容也会影响布局。

## 5. 元素、属性、API 或配置清单

### 5.1 元素清单

| 元素 | 职责 | 关键边界 |
| --- | --- | --- |
| `img` | 真正嵌入、替代并绘制图片 | 承担 `alt`、状态和主要性能属性 |
| `picture` | 为内部 `img` 提供候选选择上下文 | 自己不绘制、不承担 `alt` |
| `source` | 提供媒体条件、格式和候选集合 | 图片场景使用 `srcset`，且位于 `img` 前 |
| `figure` | 包裹可独立引用的图像内容 | 不是每张图片都必须使用 |
| `figcaption` | 提供图注 | 图注不能机械替代所有 `alt` 判断 |
| `a` | 让图片参与导航 | 只有图片时，`alt` 应表达目标或动作 |

### 5.2 `img` 核心属性

| 属性 | 值示例 | 作用 |
| --- | --- | --- |
| `src` | `./images/lamp.jpg` | 单一来源或回退来源 |
| `alt` | `米白色阅读台灯`、空字符串 | 等价文本或明确装饰 |
| `width` | `1200` | 固有宽度提示，无单位 |
| `height` | `900` | 固有高度提示，无单位 |
| `srcset` | `a.jpg 480w, b.jpg 960w` | 候选资源集合 |
| `sizes` | `(max-width: 44rem) 100vw, 50vw` | `w` 候选对应的布局插槽 |
| `loading` | `eager`、`lazy` | 获取时机提示 |
| `decoding` | `auto`、`async`、`sync` | 解码安排提示 |
| `fetchpriority` | `auto`、`high`、`low` | 相对获取优先级提示 |
| `crossorigin` | `anonymous`、`use-credentials` | CORS 请求模式 |
| `referrerpolicy` | `no-referrer` 等 | 图片请求的 referrer 策略 |

## 6. 最小可运行案例

在个人练习目录中新建 `practice/01-image-semantics-alt-dimensions/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 MED-001（`img` 的 `src`、`alt`、固有尺寸） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 MED-002（装饰图、信息图和链接图替代文本） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [响应式图片选源与艺术指导](02-responsive-image-selection.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 MED-001（`img` 的 `src`、`alt`、固有尺寸） 对应的元素、属性或状态；
- 在项目中实现并标出与 MED-002（装饰图、信息图和链接图替代文本） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`02-responsive-image-selection.md`](02-responsive-image-selection.md)。

## 8. 常见错误与排查路径

### 8.1 错误一：把 `alt` 当文件名或视觉标签

错误：

```html
<img src="./images/IMG_2038.jpg" alt="IMG_2038.jpg">
```

问题：

- 用户不知道图片与商品有什么关系。
- 破图时文件名不能替代成色信息。
- 搜索和辅助技术得到的是内部命名噪声。

修复：

```html
<img
  src="./images/IMG_2038.jpg"
  alt="台灯底座右侧有约两厘米浅色划痕"
  width="800"
  height="600">
```

先问“如果看不到图片，当前任务会损失什么信息”，再写答案。

### 8.2 错误二：所有图片都写很长的 `alt`

错误：

```html
<img
  src="./images/leaf-divider.svg"
  alt="一条由绿色叶子组成的漂亮分隔装饰线，用于分隔商品详情和相关推荐">
```

如果它只是视觉分隔，冗长描述会打断阅读。应写：

```html
<img
  src="./images/leaf-divider.svg"
  alt=""
  width="160"
  height="24">
```

可访问性不是“文字越多越好”，而是让非视觉信息与视觉信息等价。

## 9. 课后题

### 9.1 题目

1. `width="1200" height="900"` 是否强制图片永远显示为 1200 × 900 CSS px？
2. 装饰图应该省略 `alt` 还是写 `alt=""`？
3. `srcset` 中的 `480w` 表示视口宽度 480px 吗？
4. `sizes` 描述图片文件固有宽度还是布局插槽宽度？
5. `currentSrc` 与 `src` 为什么可能不同？
6. `picture` 中谁真正提供替代文本？
7. `source type="image/avif"` 是否能把 JPEG 自动转换成 AVIF？
8. 首屏主要商品图是否适合 `loading="lazy"`？
9. `decoding="async"` 与 `image.decode()` 有什么区别？
10. `complete === true` 为什么仍可能是失败？
11. 不写 `crossorigin` 的跨源图片能否显示？
12. 写了 `crossorigin="anonymous"` 后，谁决定是否授权？
13. HTTP 200 为什么仍可能触发图片 `error`？
14. CSS 已有 `width: 100%; height: auto`，为什么仍建议写 HTML 宽高？

## 10. 实践练习

### 10.1 基础练习：为三种图片选择替代文本

文件位置：

```text
practice/html-images/alt-basics.html
```

页面包含：

1. 一张展示台灯底座划痕的信息图。
2. 一张树叶分隔装饰图。
3. 一个只有餐桌缩略图的商品详情链接。

要求：

- 三张图都有真实比例的 `width`、`height`。
- 信息图的 `alt` 说明成色信息。
- 装饰图写 `alt=""`。
- 只有图片的链接用 `alt` 说明目标。
- 暂时把三个 `src` 都改成不存在路径，验证页面在破图状态下仍可理解。

打开方式：

```bash
cd practice/html-images
python3 -m http.server 8000
```

访问 `http://localhost:8000/alt-basics.html`。

**参考结构**

```html
<img
  src="./images/lamp-scratch.jpg"
  alt="台灯底座右侧有约两厘米浅色划痕"
  width="800"
  height="600">

<img
  src="./images/leaf-divider.svg"
  alt=""
  width="160"
  height="24">

<a href="./listing-table.html">
  <img
    src="./images/table-thumb.jpg"
    alt="查看折叠餐桌商品详情"
    width="320"
    height="240">
</a>
```

完成标准：看不到图片时，信息与导航仍准确；恢复路径后，没有重复、啰嗦或文件名式替代文本。

### 10.2 布局稳定性附加练习

创建两个结构相同的商品卡片：

- A 图不写宽高。
- B 图写真实 `width="1200" height="900"`。

在 DevTools Network 中使用慢速网络，录制 Performance 后刷新。观察图片出现前后价格按钮的位置，以及 Layout Shift 记录。

通过标准：

- 能指出 B 在资源到达前已经有 4:3 区域。
- 不把一次本地快速加载“没看到跳动”当成没有布局风险。
- 不声称宽高属性可以消除字体、广告或所有动态内容造成的 CLS。

## 11. 阶段验收

### 11.1 语义验收

- [ ] 每个内容图片都有与上下文有关的 `alt`。
- [ ] 纯装饰图明确使用 `alt=""` 或改用 CSS。
- [ ] 只有图片的链接能从替代文本得知目标或动作。
- [ ] 图注与 `alt` 分工明确，没有机械重复。
- [ ] 复杂图片的重要信息在页面正文中也能获得。

### 11.2 通过标准

满足以下条件才算通过本课：

1. 能从上下文独立决定三类 `alt`，不是套固定句式。
2. 能画出“候选集合 → 选源 → 请求 → 解码 → 绘制”的链路。
3. 能解释一次实际 `currentSrc` 选择，而不是背诵固定候选。
4. 能用宽高比例和浏览器证据说明布局为什么更稳定。
5. 能复现一次 HTTP 请求成功但图片解码失败。
6. 能明确说出：“图片可显示、跨源像素可读、用户已认证、文件已上传”是四个不同结论。

## 12. 常见问题

### 12.1 `alt` 是图片标题吗？

不是。它是在当前上下文中替代图片意义的文本。需要可见标题或补充说明时使用正文、标题或 `figcaption`。

### 12.2 为什么不能所有图片都写 `alt="图片"`？

“图片”只说明类型，不说明内容、目的或动作。辅助技术通常已经知道元素是图片。

### 12.3 为什么装饰图不能省略 `alt`？

省略会让辅助技术猜测文件名或报告未标注图片。`alt=""` 才明确表示应忽略。

### 12.4 `width`、`height` 要写 CSS 最终尺寸吗？

通常写资源真实固有尺寸或至少同一真实比例。CSS 再决定当前布局尺寸。两者配合可在下载前预留比例。

### 12.5 有 `srcset` 后还需要 `src` 吗？

建议保留。它提供默认与旧环境回退；使用 `x` 描述符时还可作为 1x 候选。使用 `w` 描述符时，现代浏览器按候选算法选择。

### 12.6 破图时把元素隐藏掉可以吗？

只有图片完全非必要时才可能合适。商品图失败时直接隐藏会掩盖信息缺失；更好的做法是保留准确状态、替代文本和可重试路径。

## 13. 扩展阅读

以下资料均在 **2026-10-10** 核对。WHATWG HTML Living Standard 提供规范定义；W3C WAI 提供替代文本决策指导；MDN 适合查 API、示例与兼容信息；web.dev 提供布局偏移的工程观察方法。浏览器、旧 WebView 和图片格式支持会继续变化，生产使用前应再次查证并实测。

### 13.1 HTML 图片规范

- [WHATWG：`img` 元素与 `HTMLImageElement`](https://html.spec.whatwg.org/multipage/embedded-content.html#the-img-element)
- [WHATWG：响应式图片介绍](https://html.spec.whatwg.org/multipage/images.html#responsive-images)
- [WHATWG：`srcset` 属性](https://html.spec.whatwg.org/multipage/images.html#srcset-attributes)
- [WHATWG：`sizes` 属性](https://html.spec.whatwg.org/multipage/images.html#sizes-attributes)
- [WHATWG：图片选源处理模型](https://html.spec.whatwg.org/multipage/images.html#images-processing-model)
- [WHATWG：图片替代文本要求](https://html.spec.whatwg.org/multipage/images.html#alt)
- [WHATWG：CORS 设置属性](https://html.spec.whatwg.org/multipage/urls-and-fetching.html#cors-settings-attributes)

## 我现在能做到什么

- 能解释并验证：根据图片职责编写替代文本，并用固有尺寸与宽高属性减少布局偏移。
- `MED-001`：`img` 的 `src`、`alt`、固有尺寸
- `MED-002`：装饰图、信息图和链接图替代文本
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[返回本章入口](../03-images-media-embedding.md) · [下一课：响应式图片选源与艺术指导](02-responsive-image-selection.md) · [返回 HTML 模块](../README.md)
