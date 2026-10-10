# 01 图片、响应式来源与性能：让商品照片清楚、稳定、可理解

## 任务卡

“邻里集市”的商品页准备加入照片。王阿姨上传了一张 2400 像素宽的台灯照片：电脑上看起来正常，手机却下载得慢；图片加载后，价格和按钮突然向下跳；断网时只剩一个无法理解的破图标；开发者还误以为给跨站图片加上 `crossorigin` 就一定能显示。

你的任务不是“把图片放上去”这么简单，而是建立一条可以解释、观察和恢复的图片链路：

| 任务关卡 | 你要完成的结果 | 可观察证据 |
| --- | --- | --- |
| 表达内容 | 根据信息图、装饰图、链接图选择 `alt` | 关闭图片后仍能理解页面 |
| 稳定布局 | 用真实宽高比例预留空间 | 慢速加载时正文不突然跳动 |
| 选择候选 | 用 `srcset`、`sizes` 或 `picture` 提供候选 | `currentSrc` 与 Network 请求 |
| 控制时机 | 为首屏图和屏外图选择加载、解码与优先级提示 | Network 优先级、滚动前后请求 |
| 识别边界 | 分清 referrer、CORS、显示权限与像素读取权限 | Request/Response Headers、Console |
| 恢复失败 | 区分 404、跨源阻止和解码失败 | `error`、`complete`、`naturalWidth`、`decode()` |

建议学习用时为 5 至 7 小时。所有练习文件由你创建在自己的 `practice/html-images/` 目录中；教材仓库不增加图片、源码项目、依赖或练习目录。

本课的“邻里集市”仍是静态教学页面：

- 商品价格只以整数分保存，例如 `3900` 表示 39.00 元。
- 机器可读时间使用 UTC ISO 8601，例如 `2026-10-10T08:30:00.000Z`。
- 示例不提供图片上传、账号认证、付款、预约、持久化或任何服务端能力。
- `srcset` 只是把已有图片候选交给浏览器，不会替你裁图、压缩、上传或生成格式。

完成证据至少包括：

1. 一份能直接打开的内联 SVG 图片观察页。
2. 一张 `currentSrc` 与 Network 实际请求的对照表。
3. 一次无宽高图片与有宽高图片的布局稳定性对比。
4. 一份图片损坏后的诊断与恢复记录。
5. 一段说明：为什么 `complete === true` 不能单独证明图片成功。

## 1. 任务背景

HTML 图片同时连接五个问题：

1. **内容语义**：看不到图片的人需要知道它表达了什么，或者它是否只是装饰。
2. **布局尺寸**：浏览器在下载前是否知道要给图片留多少空间。
3. **资源选择**：小屏、高密度屏和不同格式支持的浏览器应下载哪个文件。
4. **加载性能**：首屏关键图、屏外图和动态切换图不应被一套策略粗暴处理。
5. **失败恢复**：URL、网络、CORS、文件格式或图片字节出错时，页面仍应可理解。

初学者容易只观察“图片有没有出现”。这个观察太晚，也太粗。浏览器在图片出现前已经做了很多工作：

```text
解析 img/picture
  → 组成候选集合
  → 根据 media、type、sizes、像素密度等选择 URL
  → 发起请求
  → 接收图片字节
  → 解析元数据与固有尺寸
  → 解码像素
  → 绘制到预留的布局区域
```

任一步都可能失败。HTTP 200 只说明服务器返回了响应，不保证响应真是可解码图片；`complete` 只说明请求进入终态，不保证终态成功；图片能显示也不等于脚本可以读取它的像素。

本课会先用一个不依赖外部文件的 SVG data URL 观察这条链路，再把同一知识扩展到真实图片候选，最后完成“邻里集市”响应式商品照片。

## 2. 学习目标

完成本课后，你应能：

- 解释 `img` 的 `src`、`alt`、`width`、`height` 分别解决什么问题。
- 区分图片文件的固有尺寸、HTML 尺寸属性、CSS 渲染尺寸和设备物理像素。
- 为信息图片写与上下文有关的替代文本，为纯装饰图片写 `alt=""`。
- 为只有图片的链接描述目标或动作，而不是机械描述外观。
- 解释遗漏 `alt` 与显式空 `alt` 的语义差异。
- 比较 `srcset` 的 `w` 描述符和 `x` 描述符，并知道同一候选列表不能混用。
- 根据真实布局编写 `sizes`，并用 `currentSrc` 观察浏览器最后选择的 URL。
- 使用 `picture`、图片 `source`、`media` 和 `type` 解决艺术指导与格式回退。
- 为首屏关键图和屏外图片选择合理的 `loading`、`decoding` 和 `fetchpriority`。
- 解释 `referrerpolicy` 与 `crossorigin` 各自控制什么，为什么客户端属性不能授予 CORS 权限。
- 用 `complete`、`naturalWidth`、`naturalHeight`、`currentSrc`、`load`、`error` 和 `decode()` 判断图片状态。
- 通过宽高属性、正确比例和响应式 CSS 减少图片引起的布局偏移。
- 区分网络失败、跨源失败、格式不支持与图片解码失败，并设计不会无限重试的回退。

这些目标都必须用浏览器证据验证。不能把“我写了 `srcset`”当成“浏览器一定下载了最小图片”，也不能把“加了 `loading="lazy"`”当成“页面一定更快”。

## 3. 预备知识

开始前，你只需要：

- 会创建和保存 `.html` 文件。
- 知道 HTML 元素由标签和属性组成。
- 能打开浏览器开发者工具的 Elements、Console 和 Network。
- 知道相对 URL 会相对于当前文档地址解析。
- 能看懂少量 CSS 和 JavaScript；本课会解释它们承担的观察任务。

练习约定如下：

| 项目 | 约定 |
| --- | --- |
| 练习根目录 | `practice/html-images/` |
| 最小案例文件 | `practice/html-images/image-state.html` |
| 响应式案例文件 | `practice/html-images/responsive-selection.html` |
| 集成案例文件 | `practice/html-images/neighbor-market.html` |
| HTTP 启动命令 | 在练习根目录运行 `python3 -m http.server 8000` |
| 页面地址 | `http://localhost:8000/文件名.html` |
| 停止服务器 | 回到终端按 `Ctrl+C` |

第一个案例使用 data URL，可以直接双击打开。涉及真实资源、Network、CORS 或缓存观察时，应通过本地 HTTP 服务器打开。测试候选选择前，在 Network 勾选 **Disable cache**，然后改变视口宽度并重新加载。

你还需要先记住三个观察原则：

1. **先写预期，再刷新页面。** 否则很容易看到结果后倒推一个错误解释。
2. **同时看 DOM 属性和网络事实。** `src` 写了什么，不等于浏览器最后用了什么。
3. **一次只注入一种故障。** 404、错误 MIME、损坏字节和 CORS 错误同时出现时，很难确定根因。

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

### 4.4 `srcset` 解决分辨率切换，`sizes` 描述布局插槽

当多个文件表达同一图片内容，只是像素宽度不同，可以使用 `w` 描述符：

```html
<img
  src="./images/lamp-800.jpg"
  srcset="
    ./images/lamp-480.jpg 480w,
    ./images/lamp-800.jpg 800w,
    ./images/lamp-1200.jpg 1200w
  "
  sizes="(max-width: 44rem) 100vw, 50vw"
  alt="米白色阅读台灯，灯罩边缘有轻微划痕"
  width="1200"
  height="900">
```

`480w` 表示候选文件的真实固有宽度是 480 像素，不是“在 480 像素视口使用”，也不是 CSS 宽度。写错描述符会让浏览器基于错误数据选择。

`sizes` 从左到右读取：

```text
(max-width: 44rem) 100vw, 50vw
└──── 媒体条件 ────┘ └插槽宽度┘
```

- 视口不超过 44rem 时，告诉浏览器图片大约占 100vw。
- 否则使用最后一个无条件值 50vw。
- 浏览器取第一个匹配项。
- `sizes` 描述的是**图片在布局中将占多宽**，不是候选文件有多宽。

浏览器再把插槽宽度、设备像素密度、缩放、可用候选以及自身策略结合起来选择资源。例如 400 CSS px 的插槽在 2x 屏上大约需要 800 个资源像素，因此可能选 800w 候选。

选择是浏览器决策，不是作者的精确命令。缓存、网络策略和候选集合都会影响结果。不要写“视口 400px 必定下载 480w”。应通过 `currentSrc` 和 Network 观察实际结果。

固定显示尺寸、只处理像素密度时，可以使用 `x` 描述符：

```html
<img
  src="./images/avatar-160.jpg"
  srcset="
    ./images/avatar-160.jpg 1x,
    ./images/avatar-320.jpg 2x
  "
  alt="卖家王阿姨"
  width="160"
  height="160">
```

同一个 `srcset` 不能混合 `w` 和 `x`：

```html
<!-- 错误：同一候选列表混用了宽度和像素密度描述符。 -->
<img
  src="./images/lamp-480.jpg"
  srcset="./images/lamp-480.jpg 480w, ./images/lamp-960.jpg 2x"
  alt="米白色阅读台灯">
```

使用 `w` 描述符时应提供 `sizes`；否则默认源尺寸通常按 `100vw` 推断，可能与两栏卡片的实际 50vw 差很多。符合特定条件的 `loading="lazy"` 图片还可使用 `sizes="auto, ..."`，但初学阶段先把布局规则显式写清楚，更容易核对。

### 4.5 `currentSrc` 告诉你最后选择了谁

`src` 只反映 `src` 属性解析后的 URL，`currentSrc` 才是当前被选中的候选 URL：

```js
const image = document.querySelector("#product-photo");

image.addEventListener("load", () => {
  console.table({
    srcAttribute: image.getAttribute("src"),
    resolvedSrc: image.src,
    selectedCandidate: image.currentSrc,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight
  });
});
```

`currentSrc` 返回绝对 URL，并可能在视口、设备状态或媒体条件变化后改变。测试时注意：

- 浏览器可能复用已经下载的较大候选。
- 只拖窄窗口但不刷新，未必会为了节省字节重新下载小图。
- DevTools 设备模拟的 DPR 会改变候选选择。
- Network 中的请求事实比“我认为该选哪个”更可靠。

### 4.6 `picture` 解决艺术指导和格式选择

`srcset` 通常在“同一画面，不同分辨率”中选择。若窄屏要改用更紧的裁剪，属于艺术指导，应使用 `picture`：

```html
<picture>
  <source
    media="(max-width: 44rem)"
    srcset="
      ./images/lamp-close-480.jpg 480w,
      ./images/lamp-close-800.jpg 800w
    "
    sizes="100vw">
  <img
    src="./images/lamp-wide-800.jpg"
    srcset="
      ./images/lamp-wide-800.jpg 800w,
      ./images/lamp-wide-1200.jpg 1200w
    "
    sizes="(max-width: 70rem) 70vw, 760px"
    alt="米白色阅读台灯，灯罩边缘有轻微划痕"
    width="1200"
    height="900">
</picture>
```

窄屏候选把主体裁得更近，宽屏候选保留使用场景。所有候选仍表达同一核心意义，因此替代文本写在最终 `img` 上，而不是每个 `source` 上。

格式选择使用 `type`：

```html
<picture>
  <source
    type="image/avif"
    srcset="./images/lamp-800.avif 800w, ./images/lamp-1200.avif 1200w">
  <source
    type="image/webp"
    srcset="./images/lamp-800.webp 800w, ./images/lamp-1200.webp 1200w">
  <img
    src="./images/lamp-800.jpg"
    srcset="./images/lamp-800.jpg 800w, ./images/lamp-1200.jpg 1200w"
    sizes="(max-width: 50rem) 100vw, 760px"
    alt="米白色阅读台灯"
    width="1200"
    height="900">
</picture>
```

浏览器按文档顺序寻找第一个 `media` 匹配且 `type` 可用的 `source`，再从它的 `srcset` 选候选。关键规则：

- `picture` 自己不绘制图片，真正绘制和提供替代文本的是内部 `img`。
- 图片用的 `source` 写 `srcset`，不是 `src`。
- `source` 必须出现在 `img` 之前。
- `img` 是必需的默认分支和旧环境回退。
- `type` 是支持性提示；服务器仍须返回正确的图片 MIME 类型与有效字节。
- 如果不同艺术裁剪比例不同，可在各 `source` 和 `img` 上提供对应 `width`、`height`，或用匹配的 CSS `aspect-ratio` 预留正确区域。

### 4.7 `loading`、`decoding`、`fetchpriority` 是三种不同提示

三个属性分别作用于不同阶段：

| 属性 | 常见值 | 主要问题 |
| --- | --- | --- |
| `loading` | `eager`、`lazy` | 是否推迟屏外图片获取 |
| `decoding` | `auto`、`async`、`sync` | 如何安排解码与呈现 |
| `fetchpriority` | `auto`、`high`、`low` | 相对获取优先级提示 |

首屏主要商品图：

```html
<img
  src="./images/lamp-1200.jpg"
  alt="米白色阅读台灯"
  width="1200"
  height="900"
  loading="eager"
  decoding="async"
  fetchpriority="high">
```

屏外相关推荐图：

```html
<img
  src="./images/chair-640.jpg"
  alt=""
  width="640"
  height="480"
  loading="lazy"
  decoding="async"
  fetchpriority="low">
```

边界如下：

- `eager` 是默认获取策略，但首屏关键图显式写出可帮助审查意图。
- `lazy` 的触发距离由浏览器决定，不等于“滚动到图片正上方才请求”。
- 首屏最大内容图通常不应懒加载，否则可能延迟关键内容出现。
- `decoding="async"` 是解码提示，不是网络异步开关，也不保证某一帧一定出现图片。
- `fetchpriority` 是优先级提示，不会绕过带宽、缓存、调度或资源失败。
- 不要给页面上几十张图片都写 `fetchpriority="high"`；如果一切都高，就没有相对优先级。
- `loading="lazy"` 与 `fetchpriority="high"` 放在同一首屏图上通常表达了冲突意图，应重新判断图片究竟是否关键。

### 4.8 `decoding` 属性与 `decode()` 方法不是一回事

`decoding` 属性告诉浏览器偏好的解码安排。`decode()` 方法返回 Promise，让脚本等待当前图片资源可解码：

```js
const nextImage = new Image();
nextImage.src = "./images/lamp-detail-1200.jpg";
nextImage.alt = "台灯底座右侧的浅色划痕";

try {
  await nextImage.decode();
  document.querySelector("#detail-view").replaceChildren(nextImage);
} catch (error) {
  console.error("图片下载或解码失败", error);
}
```

`decode()` 成功表示当前资源已经准备好解码呈现，不表示图片永久可用，也不表示业务数据有效。以下情况会拒绝 Promise：

- 请求失败。
- 图片字节损坏或格式无法解码。
- 调用后又修改了该图片的资源。

动态切图时，先等待 `decode()` 再替换可减少用户看到空白帧的机会。普通静态图片不必机械地全部调用 `decode()`。

### 4.9 `referrerpolicy` 控制来源信息，不控制跨源授权

图片请求可能携带 `Referer` 请求头。`referrerpolicy` 控制浏览器发送多少来源信息：

```html
<img
  src="https://images.example.test/lamp.jpg"
  alt="米白色阅读台灯"
  width="1200"
  height="900"
  referrerpolicy="no-referrer">
```

常见策略：

| 值 | 跨源请求中的典型效果 |
| --- | --- |
| `no-referrer` | 不发送 referrer |
| `same-origin` | 只在同源请求发送 |
| `origin` | 只发送来源 origin |
| `strict-origin-when-cross-origin` | 同源可带完整来源，安全跨源只带 origin；现代默认策略 |

`referrerpolicy` 不是隐藏用户身份的完整方案，也不会阻止目标服务器看到 IP、请求时间和其他网络信息。更不会让一个被 CORS 阻止的请求自动通过。

### 4.10 `crossorigin` 改变请求模式，权限由图片服务器响应

普通跨源图片经常可以直接显示：

```html
<img
  src="https://cdn.example.test/lamp.jpg"
  alt="米白色阅读台灯"
  width="1200"
  height="900">
```

但没有 CORS 授权时，脚本不能安全地把它画进 Canvas 后再读取像素。添加 `crossorigin` 会让浏览器按 CORS 模式请求：

```html
<img
  src="https://cdn.example.test/lamp.jpg"
  crossorigin="anonymous"
  alt="米白色阅读台灯"
  width="1200"
  height="900">
```

- `anonymous`：发送 CORS 请求，不携带用户凭据。
- `use-credentials`：发送带凭据的 CORS 请求，对服务器响应要求更严格。

服务器必须返回匹配的 `Access-Control-Allow-Origin`；带凭据时还需要正确的凭据授权响应。客户端写一个属性不能替服务器授权。

下面是明确错误的推理：

```html
<!-- 错误：若服务器没有 CORS 响应头，属性可能让原本能显示的跨源图加载失败。 -->
<img
  src="https://third-party.example/lamp.jpg"
  crossorigin="anonymous"
  alt="米白色阅读台灯">
```

动态创建图片时，要在设置 `src` 前设置 `crossOrigin`，避免先以错误模式发起请求：

```js
const image = new Image();
image.crossOrigin = "anonymous";
image.src = "https://cdn.example.test/lamp.jpg";
```

CORS 不是认证，不是图片防盗链，也不是上传能力。是否允许显示、是否允许读取像素、是否发送 Cookie、是否允许业务访问，是不同问题。

### 4.11 用一组状态判断成功，而不是只看 `complete`

图片常用观察点：

| 观察点 | 成功时 | 失败时 | 注意 |
| --- | --- | --- | --- |
| `load` 事件 | 触发 | 不触发 | 监听应尽早注册 |
| `error` 事件 | 不触发 | 触发 | 不提供 HTTP 状态细节 |
| `complete` | `true` | 终态也可能为 `true` | 不能单独判成功 |
| `naturalWidth` | 大于 `0` | 通常为 `0` | 与当前资源有关 |
| `naturalHeight` | 大于 `0` | 通常为 `0` | 与当前资源有关 |
| `currentSrc` | 选中 URL | 可能仍有 URL | 有 URL 不代表解码成功 |
| `decode()` | Promise fulfilled | Promise rejected | 失败常见 `EncodingError` |

一个实用判断是：

```js
function hasUsableImage(image) {
  return image.complete && image.naturalWidth > 0;
}
```

但事件仍然重要，因为属性快照不会告诉你状态何时变化。图片可能在脚本注册监听前已经从缓存完成，因此初始化时要同时检查 `complete`：

```js
const image = document.querySelector("#product-photo");

function report() {
  console.log({
    complete: image.complete,
    naturalWidth: image.naturalWidth,
    currentSrc: image.currentSrc
  });
}

image.addEventListener("load", report);
image.addEventListener("error", report);

if (image.complete) {
  report();
}
```

### 4.12 图片失败至少分为请求失败和解码失败

常见故障：

1. URL 拼错或服务器返回 404。
2. 服务器返回 HTML 错误页，状态甚至可能是 200，但内容不是图片。
3. 响应是图片 MIME 类型，字节却损坏。
4. 图片格式不被当前浏览器支持。
5. 加了 `crossorigin`，服务器却没有允许当前 origin。
6. `srcset` 某个候选错误，只有特定宽度或 DPR 才失败。
7. 调用 `decode()` 后立即改 `src`，旧 Promise 被拒绝。

`error` 事件只告诉你元素失败，不直接给出 HTTP 状态。根因需要回到 Network 检查：

- Request URL 是否正确。
- Status 是否为 200、404 或其他值。
- Response `Content-Type` 是否匹配。
- 响应体是否真是图片字节。
- Console 是否有 CORS 或解码信息。
- `currentSrc` 是否指向你以为的候选。

回退必须防止无限循环：

```js
const image = document.querySelector("#product-photo");

image.addEventListener("error", () => {
  if (image.dataset.fallbackApplied === "true") {
    return;
  }

  image.dataset.fallbackApplied = "true";
  image.src = "./images/photo-unavailable.svg";
});
```

不要把原本描述商品与瑕疵的 `alt` 改成“图片失败”。`alt` 是原图不可用时的内容替代，应继续保留原图所传达的信息；加载状态由邻近状态区单独说明。

如果图片位于 `picture` 中，只改内部 `img.src` 可能仍被匹配的 `source` 覆盖。恢复时还要移除或修正失败的 `source` 候选，集成案例会演示。

### 4.13 宽高比例是减少布局偏移的第一道防线

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

### 5.3 图片 `source` 核心属性

| 属性 | 作用 | 常见错误 |
| --- | --- | --- |
| `srcset` | 提供该分支的候选集合 | 错写成 `src` |
| `sizes` | 描述该分支的布局插槽 | 与真实 CSS 布局不一致 |
| `media` | 决定艺术指导分支是否匹配 | 顺序让宽条件提前吞掉窄条件 |
| `type` | 让浏览器跳过不支持的格式 | MIME 写错或服务端返回内容不匹配 |
| `width`、`height` | 为该艺术裁剪提供尺寸比例 | 不同比例仍沿用 `img` 的错误比例 |

### 5.4 `HTMLImageElement` 观察 API

| API | 类型 | 解释 |
| --- | --- | --- |
| `src` | 可读写属性 | 解析后的绝对来源 URL |
| `currentSrc` | 只读属性 | 当前选择的候选绝对 URL |
| `complete` | 只读布尔值 | 请求是否进入完成状态，包含失败终态 |
| `naturalWidth` | 只读数字 | 固有宽度，不可用时为 `0` |
| `naturalHeight` | 只读数字 | 固有高度，不可用时为 `0` |
| `width`、`height` | 可读写数字 | 当前渲染尺寸 |
| `decode()` | Promise 方法 | 等待当前资源完成可用解码 |
| `load` | 事件 | 图片成功加载 |
| `error` | 事件 | 图片加载或解码失败 |

### 5.5 选择工具

| 需求 | 首选工具 |
| --- | --- |
| 只有一个图片文件 | `img src` |
| 同一内容，不同像素宽度 | `img srcset` + `sizes` + `w` |
| 固定 CSS 尺寸，不同像素密度 | `img srcset` + `x` |
| 小屏需要不同裁剪 | `picture` + `source media` |
| 提供 AVIF/WebP/JPEG 回退 | `picture` + `source type` |
| 首屏主要商品图 | eager/默认加载，按证据考虑 `fetchpriority="high"` |
| 屏外相关推荐图 | `loading="lazy"`，保留正确宽高 |
| 动态切图后再呈现 | `decode()` |
| 控制跨站来源泄露 | `referrerpolicy` |
| 需要跨源图片像素可读 | `crossorigin` + 服务器正确 CORS 响应 |

## 6. 最小可运行案例

### 6.1 文件位置与打开方式

创建：

```text
practice/html-images/image-state.html
```

把下面完整代码保存为 UTF-8。它只使用内联 SVG data URL，不依赖网络、图片文件或软件包，可以直接双击打开，也可以运行：

```bash
cd practice/html-images
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000/image-state.html
```

### 6.2 完整自包含案例

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>图片状态观察</title>
  <style>
    :root {
      font-family: system-ui, sans-serif;
      color-scheme: light;
    }

    body {
      max-width: 760px;
      margin: 0 auto;
      padding: 24px;
      line-height: 1.6;
      color: #17201d;
      background: #f4f1e8;
    }

    figure {
      margin: 24px 0;
      overflow: hidden;
      border: 2px solid #174d3a;
      border-radius: 16px;
      background: #dce9df;
    }

    img {
      display: block;
      width: 100%;
      height: auto;
    }

    figcaption,
    #state {
      padding: 12px 16px;
    }

    #state {
      min-height: 3em;
      border-left: 4px solid #d47c34;
      background: #fff;
      white-space: pre-wrap;
    }

    button {
      margin-right: 8px;
      padding: 10px 14px;
    }
  </style>
</head>
<body>
  <h1>图片成功、失败与恢复</h1>
  <p>图片区域在下载前已按 640:360 预留，因此状态文字不会突然下移。</p>

  <figure>
    <img
      id="demo-image"
      src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20640%20360%22%3E%3Crect%20width%3D%22640%22%20height%3D%22360%22%20fill%3D%22%23174d3a%22%2F%3E%3Ccircle%20cx%3D%22320%22%20cy%3D%22150%22%20r%3D%2280%22%20fill%3D%22%23f2b45b%22%2F%3E%3Crect%20x%3D%22290%22%20y%3D%22225%22%20width%3D%2260%22%20height%3D%2290%22%20rx%3D%2212%22%20fill%3D%22%23f8f2df%22%2F%3E%3Ctext%20x%3D%22320%22%20y%3D%22340%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2222%22%20fill%3D%22white%22%3E640%20x%20360%3C%2Ftext%3E%3C%2Fsvg%3E"
      alt="绿色背景上的黄色台灯示意图"
      width="640"
      height="360"
      decoding="async">
    <figcaption>这是信息图片，替代文本描述了示意图内容。</figcaption>
  </figure>

  <p id="state" role="status">等待图片状态……</p>

  <p>
    <button id="break-image" type="button">注入损坏字节</button>
    <button id="restore-image" type="button">恢复正确图片</button>
  </p>

  <script>
    const image = document.querySelector("#demo-image");
    const state = document.querySelector("#state");
    const goodSource = image.src;

    function snapshot(label) {
      const values = {
        event: label,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
        currentSrc: image.currentSrc
      };

      state.textContent = JSON.stringify(values, null, 2);
      console.table(values);
    }

    async function inspectDecode(label) {
      try {
        await image.decode();
        snapshot(`${label}: decode fulfilled`);
      } catch (error) {
        snapshot(`${label}: decode rejected (${error.name})`);
      }
    }

    image.addEventListener("load", () => {
      inspectDecode("load");
    });

    image.addEventListener("error", () => {
      snapshot("error");
    });

    document.querySelector("#break-image").addEventListener("click", () => {
      image.src = "data:image/png;base64,AAAA";
      snapshot("刚设置损坏来源");
      inspectDecode("损坏来源");
    });

    document.querySelector("#restore-image").addEventListener("click", () => {
      image.src = goodSource;
      snapshot("刚恢复正确来源");
      inspectDecode("恢复来源");
    });

    if (image.complete) {
      inspectDecode("初始化缓存状态");
    }
  </script>
</body>
</html>
```

### 6.3 预期结果

首次打开：

- 显示绿色背景的台灯示意图。
- 图片区域在绘制前已保留 16:9 空间。
- `decode()` 成功，`naturalWidth` 为 `640`，`naturalHeight` 为 `360`。
- `complete` 为 `true`，`currentSrc` 是 data URL。

点击“注入损坏字节”：

- 图片无法解码，触发 `error`。
- `decode()` 拒绝，常见错误名为 `EncodingError`。
- 失败进入终态后，`complete` 仍可能是 `true`。
- `naturalWidth` 与 `naturalHeight` 为 `0`。
- `alt` 仍让页面保留“绿色背景上的黄色台灯示意图”这一意义。

点击“恢复正确图片”：

- 再次触发成功路径。
- 固有尺寸恢复为 640 × 360。
- 页面不需要刷新即可恢复。

### 6.4 失败证据

如果页面没有按预期工作，按顺序检查：

1. Console 是否有 JavaScript 语法错误。
2. Elements 中 `img` 的 `src` 是否被复制时断行或改写。
3. 点击损坏按钮后是否出现 `error` 快照。
4. `complete` 是否为真但 `naturalWidth` 为 0。
5. 恢复按钮是否把 `src` 改回最初 data URL。

本案例故意证明：

```text
complete === true
```

不能推出：

```text
图片成功并且可解码
```

更可靠的成功证据至少是 `complete && naturalWidth > 0`，或成功的 `load`/`decode()`。

### 6.5 渐进扩展：从单一来源到真实候选

响应式选择要观察真实网络候选，不能只靠 data URL。请在自己的练习目录准备以下文件；这些文件不是教材仓库资源，也不是上传功能：

```text
practice/html-images/
├── responsive-selection.html
└── images/
    ├── lamp-480.jpg
    ├── lamp-800.jpg
    └── lamp-1200.jpg
```

真实资源契约：

| 文件 | 固有尺寸 | 内容 | 要求 |
| --- | --- | --- | --- |
| `lamp-480.jpg` | 480 × 360 | 同一台灯、同一裁剪 | 较小文件 |
| `lamp-800.jpg` | 800 × 600 | 同一台灯、同一裁剪 | 中等文件 |
| `lamp-1200.jpg` | 1200 × 900 | 同一台灯、同一裁剪 | 较大文件 |

`responsive-selection.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>响应式图片候选观察</title>
  <style>
    body {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px;
      font: 16px/1.6 system-ui, sans-serif;
    }

    figure {
      width: min(100%, 760px);
      margin: 0;
    }

    img {
      display: block;
      width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <h1>浏览器选择了哪张图片？</h1>

  <figure>
    <img
      id="product-photo"
      src="./images/lamp-800.jpg"
      srcset="
        ./images/lamp-480.jpg 480w,
        ./images/lamp-800.jpg 800w,
        ./images/lamp-1200.jpg 1200w
      "
      sizes="(max-width: 48rem) calc(100vw - 48px), 760px"
      alt="米白色阅读台灯，灯罩边缘有轻微划痕"
      width="1200"
      height="900">
    <figcaption id="selection">等待加载……</figcaption>
  </figure>

  <script>
    const image = document.querySelector("#product-photo");
    const output = document.querySelector("#selection");

    function reportSelection() {
      output.textContent =
        `currentSrc: ${image.currentSrc}; ` +
        `natural: ${image.naturalWidth} × ${image.naturalHeight}; ` +
        `rendered: ${Math.round(image.getBoundingClientRect().width)} × ` +
        `${Math.round(image.getBoundingClientRect().height)}`;
    }

    image.addEventListener("load", reportSelection);
    window.addEventListener("resize", reportSelection);

    if (image.complete) {
      reportSelection();
    }
  </script>
</body>
</html>
```

通过 HTTP 打开，清空 Network 并禁用缓存，在窄视口和宽视口分别重新加载。预期能看到：

- `currentSrc` 指向一个候选的绝对 URL。
- `naturalWidth`、`naturalHeight` 反映被选资源密度修正后的固有尺寸；不要把它们直接当成文件原始像素矩阵。
- 渲染尺寸由 CSS 和布局决定，不必等于固有尺寸。
- 窄视口通常有机会选较小候选，但具体选择还受 DPR、缩放和浏览器策略影响。

如果所有视口都请求 1200w，不要先断言浏览器错误。检查 DPR、`sizes`、缓存、候选真实宽度和实际 CSS 插槽。

## 7. 邻里集市集成案例

本案例把替代文本、分辨率候选、格式回退、首屏优先级、屏外懒加载、状态 API 和一次性失败恢复组合到一个静态商品页中。

### 7.1 练习文件与真实资源契约

创建：

```text
practice/html-images/
├── neighbor-market.html
└── images/
    ├── lamp-close-480.avif
    ├── lamp-close-800.avif
    ├── lamp-close-480.webp
    ├── lamp-close-800.webp
    ├── lamp-wide-800.avif
    ├── lamp-wide-1200.avif
    ├── lamp-wide-800.webp
    ├── lamp-wide-1200.webp
    ├── lamp-wide-800.jpg
    ├── lamp-wide-1200.jpg
    ├── lamp-base-640.jpg
    └── table-640.jpg
```

资源要求：

- `lamp-close-*` 是窄屏近裁剪，主体与划痕清楚。
- `lamp-wide-*` 是宽屏场景图，所有候选都为 4:3。
- 文件名中的宽度必须等于图片真实固有宽度。
- AVIF、WebP、JPEG 版本表达相同内容；不能用完全不同的照片冒充格式候选。
- `lamp-base-640.jpg` 和 `table-640.jpg` 都是 640 × 480。
- 压缩与格式生成在图片工具中完成；HTML 本身不会生成这些文件。

### 7.2 完整 `neighbor-market.html`

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>阅读台灯，39元 · 邻里集市</title>
  <style>
    :root {
      font-family: system-ui, sans-serif;
      color: #18201d;
      background: #f5f1e8;
    }

    * {
      box-sizing: border-box;
    }

    body {
      max-width: 1120px;
      margin: 0 auto;
      padding: 24px;
      line-height: 1.6;
    }

    header,
    main,
    footer {
      margin-bottom: 32px;
    }

    .listing {
      display: grid;
      gap: 24px;
      align-items: start;
    }

    .hero,
    .detail-photo,
    .related-card {
      margin: 0;
      overflow: hidden;
      border: 1px solid #b9c7be;
      border-radius: 18px;
      background: #e4ebe5;
    }

    img {
      display: block;
      width: 100%;
      height: auto;
    }

    figcaption,
    .related-card span {
      display: block;
      padding: 12px 16px;
      background: #fff;
    }

    .facts {
      padding: 20px;
      border-radius: 18px;
      background: #fff;
    }

    .price {
      color: #9b3f1f;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .status {
      min-height: 3em;
      padding: 12px;
      border-left: 4px solid #d47c34;
      background: #fff8e9;
    }

    .details,
    .related {
      display: grid;
      gap: 16px;
      margin-top: 32px;
    }

    .related-card {
      color: inherit;
      text-decoration: none;
    }

    .related-card:focus-visible {
      outline: 4px solid #d47c34;
      outline-offset: 4px;
    }

    @media (min-width: 48rem) {
      .listing {
        grid-template-columns: minmax(0, 3fr) minmax(260px, 2fr);
      }

      .details,
      .related {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  </style>
</head>
<body>
  <header>
    <p><a href="./index.html">邻里集市</a></p>
    <h1>阅读台灯</h1>
  </header>

  <main>
    <div
      class="listing"
      data-listing-id="lamp-001"
      data-price-cents="3900"
      data-published-at="2026-10-10T08:30:00.000Z">
      <figure class="hero">
        <picture id="hero-picture">
          <source
            media="(max-width: 47.99rem)"
            type="image/avif"
            srcset="
              ./images/lamp-close-480.avif 480w,
              ./images/lamp-close-800.avif 800w
            "
            sizes="calc(100vw - 48px)">
          <source
            media="(max-width: 47.99rem)"
            type="image/webp"
            srcset="
              ./images/lamp-close-480.webp 480w,
              ./images/lamp-close-800.webp 800w
            "
            sizes="calc(100vw - 48px)">
          <source
            type="image/avif"
            srcset="
              ./images/lamp-wide-800.avif 800w,
              ./images/lamp-wide-1200.avif 1200w
            "
            sizes="(max-width: 70rem) 58vw, 645px">
          <source
            type="image/webp"
            srcset="
              ./images/lamp-wide-800.webp 800w,
              ./images/lamp-wide-1200.webp 1200w
            "
            sizes="(max-width: 70rem) 58vw, 645px">
          <img
            id="hero-image"
            src="./images/lamp-wide-800.jpg"
            srcset="
              ./images/lamp-wide-800.jpg 800w,
              ./images/lamp-wide-1200.jpg 1200w
            "
            sizes="(max-width: 47.99rem) calc(100vw - 48px), (max-width: 70rem) 58vw, 645px"
            alt="米白色阅读台灯，灯罩边缘有轻微划痕"
            width="1200"
            height="900"
            loading="eager"
            decoding="async"
            fetchpriority="high">
        </picture>
        <figcaption>主图展示整体成色；窄屏使用更近的裁剪。</figcaption>
      </figure>

      <section class="facts" aria-labelledby="listing-facts">
        <h2 id="listing-facts">商品信息</h2>
        <p class="price" id="price">价格载入中</p>
        <p>状态：二手，可正常点亮</p>
        <p>交接：社区公共区域当面检查</p>
        <p>
          发布时间：
          <time datetime="2026-10-10T08:30:00.000Z">2026-10-10</time>
        </p>
        <p id="image-status" class="status" role="status">
          正在确认商品主图……
        </p>
        <p>
          本页仅演示静态商品信息，没有账号、付款、预约、上传或保存功能。
        </p>
      </section>
    </div>

    <section aria-labelledby="detail-heading">
      <h2 id="detail-heading">成色细节</h2>
      <div class="details">
        <figure class="detail-photo">
          <img
            src="./images/lamp-base-640.jpg"
            alt="台灯底座右侧有约两厘米浅色划痕"
            width="640"
            height="480"
            loading="lazy"
            decoding="async"
            fetchpriority="low">
          <figcaption>底座划痕不影响放置稳定性。</figcaption>
        </figure>

        <figure class="detail-photo" aria-label="尺寸说明">
          <svg
            viewBox="0 0 640 480"
            role="img"
            aria-labelledby="size-title size-desc">
            <title id="size-title">阅读台灯尺寸示意</title>
            <desc id="size-desc">台灯总高约四十五厘米，底座直径约十八厘米。</desc>
            <rect width="640" height="480" fill="#e7efe9"></rect>
            <path d="M320 95 L260 210 H380 Z" fill="#d47c34"></path>
            <rect x="305" y="210" width="30" height="170" fill="#174d3a"></rect>
            <ellipse cx="320" cy="390" rx="110" ry="28" fill="#174d3a"></ellipse>
            <text x="425" y="245" font-size="24">高约 45 cm</text>
            <text x="225" y="445" font-size="24">底座直径约 18 cm</text>
          </svg>
          <figcaption>尺寸为人工测量值，仅作当面检查参考。</figcaption>
        </figure>
      </div>
    </section>

    <section aria-labelledby="related-heading">
      <h2 id="related-heading">附近其他物品</h2>
      <div class="related">
        <a class="related-card" href="./listing-table.html">
          <img
            src="./images/table-640.jpg"
            alt=""
            width="640"
            height="480"
            loading="lazy"
            decoding="async">
          <span>查看折叠餐桌商品详情</span>
        </a>
      </div>
    </section>
  </main>

  <footer>
    <p>邻里集市静态教学页</p>
  </footer>

  <script>
    const listing = document.querySelector(".listing");
    const price = document.querySelector("#price");
    const heroPicture = document.querySelector("#hero-picture");
    const heroImage = document.querySelector("#hero-image");
    const imageStatus = document.querySelector("#image-status");

    const priceCents = Number(listing.dataset.priceCents);
    price.textContent = new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY"
    }).format(priceCents / 100);

    const fallbackSource =
      "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%201200%20900%22%3E%3Crect%20width%3D%221200%22%20height%3D%22900%22%20fill%3D%22%23e7e4dc%22%2F%3E%3Cpath%20d%3D%22M420%20580%20L600%20320%20L780%20580Z%22%20fill%3D%22%239aa39e%22%2F%3E%3Ctext%20x%3D%22600%22%20y%3D%22680%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2252%22%20fill%3D%22%233e4944%22%3EImage%20unavailable%3C%2Ftext%3E%3C%2Fsvg%3E";

    async function reportHeroSuccess() {
      try {
        await heroImage.decode();
        const label =
          heroImage.dataset.fallbackApplied === "true"
            ? "本地说明图已就绪"
            : "主图已就绪";
        imageStatus.textContent =
          `${label}：${heroImage.naturalWidth} × ` +
          `${heroImage.naturalHeight}；候选：${heroImage.currentSrc}`;
      } catch (error) {
        imageStatus.textContent = `主图解码检查失败：${error.name}`;
      }
    }

    heroImage.addEventListener("load", reportHeroSuccess);

    heroImage.addEventListener("error", () => {
      if (heroImage.dataset.fallbackApplied === "true") {
        imageStatus.textContent = "主图和本地回退图都无法显示，请稍后重试。";
        return;
      }

      heroImage.dataset.fallbackApplied = "true";
      heroPicture.querySelectorAll("source").forEach((source) => {
        source.remove();
      });
      heroImage.removeAttribute("srcset");
      heroImage.removeAttribute("sizes");
      heroImage.src = fallbackSource;
      imageStatus.textContent = "主图失败，已显示本地说明图。";
    });

    if (heroImage.complete) {
      if (heroImage.naturalWidth > 0) {
        reportHeroSuccess();
      } else {
        heroImage.dispatchEvent(new Event("error"));
      }
    }
  </script>
</body>
</html>
```

### 7.3 逐层解释

#### 主图语义

主图 `alt` 说明商品和可见瑕疵。`figcaption` 解释拍摄与裁剪策略，两者信息互补，不是逐字重复。

相关推荐卡片的图片使用 `alt=""`，因为同一个链接里的“查看折叠餐桌商品详情”已经提供清楚名称。若移除可见文字，图片就必须承担链接目标名称。

#### 候选选择

窄屏先匹配 `media="(max-width: 47.99rem)"` 的近裁剪；同一裁剪中，支持 AVIF 的浏览器选择 AVIF 分支，否则继续判断 WebP。宽屏跳过窄屏来源，再按格式支持情况选择 AVIF、WebP 或最终 JPEG。

这里的“格式回退”针对浏览器是否支持声明的 `type`，不是某个 URL 请求失败后的自动重试链。浏览器一旦选中支持的 AVIF 分支，若该 AVIF 文件随后 404 或字节损坏，不保证自动改试 WebP；应修复资源，或像本案例一样进入明确的错误恢复。

`picture` 的所有主图保持 4:3，因此 `img width="1200" height="900"` 可以稳定预留空间。如果窄屏裁剪改为 4:5，应给窄屏 `source` 增加对应宽高，例如 `width="800" height="1000"`。

#### 性能意图

- 主图在首屏，使用 eager、async decode 和 high priority 提示。
- 细节图与相关推荐通常位于首屏之后，使用 lazy。
- 每张图片仍有宽高，懒加载不等于可以放弃尺寸。
- 是否真的改善加载必须以 Network、性能轨迹和真实页面位置验证。

#### 数据边界

`data-price-cents="3900"` 保存整数分，格式化时才除以 100。`data-published-at` 与 `time datetime` 使用 UTC ISO 值。本页只读这些静态值，没有数据库、付款、图片上传或服务端接口。

#### 失败恢复

主图失败后，脚本先用 `data-fallback-applied` 防止重复恢复，再移除 `picture` 的 `source` 和 `img` 的响应式候选，最后换成自包含 SVG。这样选源算法不会继续把失败候选覆盖回去。

回退图本身也可能因代码错误失败，所以第二次 `error` 只报告状态，不再次改 `src`。这避免无限事件循环。

### 7.4 打开方法

在 `practice/html-images/` 运行：

```bash
python3 -m http.server 8000
```

访问：

```text
http://localhost:8000/neighbor-market.html
```

分别在约 390 CSS px 和 1024 CSS px 的视口下：

1. 勾选 Network 的 Disable cache。
2. 清空请求列表。
3. 刷新页面。
4. 记录主图的请求 URL、类型、大小和优先级。
5. 在 Console 读取：

```js
const image = document.querySelector("#hero-image");
({
  currentSrc: image.currentSrc,
  complete: image.complete,
  naturalWidth: image.naturalWidth,
  naturalHeight: image.naturalHeight,
  rendered: image.getBoundingClientRect().toJSON()
});
```

### 7.5 预期结果与失败证据

正常结果：

- 窄屏和宽屏可使用不同裁剪。
- 支持现代格式的浏览器优先选择相应格式。
- 价格显示为人民币格式，但源数据仍是整数 `3900`。
- 主图加载前已预留 4:3 空间。
- 滚动接近细节图前后，可以观察 lazy 请求时机。
- 状态区域显示实际 `currentSrc` 与固有尺寸。

失败证据：

| 现象 | 必查证据 |
| --- | --- |
| 只请求 JPEG | 浏览器格式支持、`source type`、源文件和响应 MIME |
| 窄屏仍是宽图 | viewport、`media` 是否匹配、Network、`currentSrc` |
| 图片加载后跳动 | 宽高属性、候选比例、CSS 是否覆盖 `height` |
| 主图 404 | Network Request URL 与 Status |
| 状态说失败但图片可见 | 是否发生了旧请求与新请求竞态 |
| 回退反复触发 | `data-fallback-applied` 是否在改 `src` 前设置 |

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

### 8.3 错误三：把 `sizes` 写成图片文件宽度

错误：

```html
<img
  src="./images/lamp-800.jpg"
  srcset="./images/lamp-480.jpg 480w, ./images/lamp-1200.jpg 1200w"
  sizes="1200px"
  alt="米白色阅读台灯">
```

若图片实际只占两栏布局的 50vw，`sizes="1200px"` 会误导浏览器倾向更大候选。`srcset` 描述文件，`sizes` 描述布局插槽；两者不能混为一谈。

### 8.4 错误四：用 CSS 媒体查询切换两个 `img`

错误思路：

```html
<img class="mobile-photo" src="./images/lamp-close.jpg" alt="米白色阅读台灯">
<img class="desktop-photo" src="./images/lamp-wide.jpg" alt="米白色阅读台灯">
```

```css
@media (min-width: 48rem) {
  .mobile-photo {
    display: none;
  }
}
```

即使其中一个最终 `display: none`，浏览器仍可能提前发现并下载两个 `img` 来源；辅助技术也可能遇到重复内容。艺术指导应交给 `picture` 的声明式选源。

### 8.5 错误五：首屏主图懒加载

错误：

```html
<img
  src="./images/hero.jpg"
  alt="米白色阅读台灯"
  loading="lazy"
  fetchpriority="high">
```

这同时表达“可以延后”和“优先获取”。若图片是首屏主要内容，应移除 lazy；若确实在屏外，则通常也不需要 high。属性应反映页面真实位置，而不是套用性能清单。

### 8.6 错误六：把 `complete` 当成功

错误：

```js
if (image.complete) {
  console.log("图片成功");
}
```

修复：

```js
if (image.complete && image.naturalWidth > 0) {
  console.log("图片已经可用");
} else if (image.complete) {
  console.error("图片已经结束，但没有可用固有宽度");
}
```

再结合 `load`、`error`、Network 和 `decode()` 判断根因。

### 8.7 错误七：用 `referrerpolicy` 修 CORS

错误：

```html
<img
  src="https://cdn.example.test/lamp.jpg"
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
  alt="米白色阅读台灯">
```

如果服务器没有正确 `Access-Control-Allow-Origin`，隐藏 referrer 不会授予权限。CORS 由请求模式和服务器响应共同决定。

### 8.8 错误八：`picture` 回退时只改 `img.src`

错误恢复：

```js
image.addEventListener("error", () => {
  image.src = "./images/fallback.svg";
});
```

如果匹配中的 `source srcset` 仍存在，浏览器可能继续选择失败来源。正确恢复应修复候选，或在使用本地回退时移除失败 `source` 和 `img.srcset`，并加一次性标记。

### 8.9 一份完整诊断与恢复记录

故障注入：把 `lamp-wide-800.jpg` 替换为只有四个无效字节的同名文件，服务器仍返回 200。

| 项目 | 记录 |
| --- | --- |
| 文件位置 | `practice/html-images/images/lamp-wide-800.jpg` |
| 打开方式 | `python3 -m http.server 8000`；访问 `/neighbor-market.html` |
| 预期故障 | JPEG 回退分支选中 800w 时，请求成功但解码失败 |
| 页面现象 | 主图不显示，状态区进入回退路径 |
| Network | Status 200；请求 URL 正确；传输有少量字节 |
| Console/API | `error` 触发；`complete === true`；`naturalWidth === 0`；`decode()` 拒绝 |
| 已排除 | 不是 404，不是路径错误；同源请求也不是 CORS |
| 根因 | 响应字节不是有效 JPEG，网络完成不等于解码成功 |
| 最小修复 | 恢复有效 JPEG，不改 HTML 选源规则 |
| 复测 | 禁用缓存后刷新；`naturalWidth > 0`；`decode()` 成功；回退标记不存在 |

这个记录比“图片坏了，重传一下”更有价值，因为它区分了请求层和解码层。

### 8.10 通用排查顺序

遇到破图时按以下顺序：

1. **Elements**：确认当前 `src`、`srcset`、`sizes`、`picture source`。
2. **Console**：读取 CORS、MIME、解码或脚本错误。
3. **Network**：找到实际请求 URL，而不是只看源码里的 `src`。
4. **状态**：记录 Status、Content-Type、Transferred、Initiator。
5. **DOM API**：记录 `currentSrc`、`complete`、`naturalWidth`、`naturalHeight`。
6. **解码**：调用 `decode()` 并捕获错误名。
7. **候选条件**：核对视口、DPR、媒体条件与缓存。
8. **最小修复**：只修路径、响应、候选、比例或 CORS 中的真实根因。
9. **同点复测**：清空旧 Network 记录，用同样条件重新加载。

不要通过删除 `alt`、隐藏错误、吞掉 Promise 拒绝或强制所有页面使用一张超大图来制造“看起来正常”。

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

### 9.2 参考答案

1. 不会。属性提供默认尺寸与比例信息，CSS 和容器可改变实际渲染尺寸。
2. 写 `alt=""`，明确表示图片不承担内容；能用 CSS 背景时也可不使用 `img`。
3. 不是。它表示候选文件的固有宽度为 480 像素。
4. 当前媒体条件下图片将占用的布局插槽宽度。
5. `srcset`、`sizes` 或 `picture source` 可能让浏览器选择另一个候选。
6. 最终的 `img alt`；`picture` 和图片 `source` 不提供各自的 `alt`。
7. 不能。它只声明候选格式，文件必须事先真实生成。
8. 通常不适合。关键首屏图应及时发现和获取。
9. 前者是浏览器解码安排提示；后者返回可等待、可失败的 Promise。
10. 因为 `complete` 表示进入完成状态，失败终态也属于完成。
11. 通常可以显示，但脚本不能据此读取跨源像素。
12. 图片服务器通过 CORS 响应头决定，客户端属性不能自行授权。
13. 响应可能是 HTML、损坏字节或不支持的图片格式，网络成功不代表解码成功。
14. CSS 只决定渲染规则；HTML 宽高可让浏览器在资源到达前推导比例并预留空间。

### 9.3 答题标准

- 必须区分固有尺寸、渲染尺寸和候选描述符。
- 必须说出 `alt` 由上下文职责决定，而不是由文件名决定。
- 必须把 `loading`、`decoding`、`fetchpriority` 分成不同阶段。
- 必须把 CORS 权限归到服务器响应，而不是客户端愿望。
- 必须说明“成功请求”和“成功解码”不是同一事实。

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

### 10.2 提升练习：组合艺术指导与格式回退

文件位置：

```text
practice/html-images/picture-advanced.html
```

真实资源契约：

- 窄屏裁剪：480w、800w，AVIF 与 WebP。
- 宽屏裁剪：800w、1200w，AVIF、WebP 与 JPEG。
- 所有文件名描述符必须匹配实际固有宽度。
- 若窄宽裁剪比例不同，分别提供正确的 `source`/`img` 宽高。

要求：

1. 窄于 48rem 时选近裁剪。
2. 每个裁剪按浏览器格式支持情况选择 AVIF 或 WebP。
3. `img` 提供 JPEG 回退和唯一 `alt`。
4. 用 `sizes` 反映单栏与双栏布局。
5. 页面输出 `currentSrc`、`naturalWidth` 和渲染宽度。
6. 在 390 CSS px、768 CSS px、1200 CSS px 下分别禁用缓存刷新。

记录表：

| 视口 | DPR | 匹配分支 | `currentSrc` | 固有宽度 | 渲染宽度 | Network 字节 |
| --- | --- | --- | --- | --- | --- | --- |
| 390 | 实测 |  |  |  |  |  |
| 768 | 实测 |  |  |  |  |  |
| 1200 | 实测 |  |  |  |  |  |

**答案标准**

- 不能写“390px 一定选 480w”；应记录当前浏览器实际选择。
- `source` 使用 `srcset`，最终保留 `img`。
- 没有混合 `w` 与 `x` 描述符。
- `sizes` 写的是布局插槽，不是最大文件宽度。
- Network 与 `currentSrc` 能互相印证。
- 改变裁剪不改变图片在页面中的核心意义。

### 10.3 故障练习：从 200 响应定位到解码失败

文件位置：

```text
practice/html-images/decode-failure.html
```

故障注入步骤：

1. 先用有效 `valid.jpg` 建立成功基线。
2. 复制页面后，把 `src` 改为 `broken.jpg`。
3. 让 `broken.jpg` 存在，但内容不是有效图片字节。
4. 保持本地服务器返回该文件，观察请求与解码。
5. 记录 `load`、`error`、`complete`、`naturalWidth`、`currentSrc` 和 `decode()`。
6. 恢复有效文件并按相同条件复测。

必须填写：

| 项目 | 必填内容 |
| --- | --- |
| 文件位置 | HTML 与损坏图片相对路径 |
| 打开方法 | 启动命令与 URL |
| 预期故障 | 注入前的预测 |
| 请求证据 | URL、Status、Content-Type、Transferred |
| DOM 证据 | 五个状态/API 结果 |
| 根因 | 请求失败或解码失败 |
| 最小修复 | 只修真实根因 |
| 恢复结果 | 同一观察点的复测值 |

**答案标准**

- 不能因为 Status 200 就判成功。
- 不能因为 `complete` 为真就判成功。
- 应以 `naturalWidth === 0`、`error` 和被拒绝的 `decode()` 证明不可用。
- 恢复后要禁用缓存或确认新响应，不得用旧请求记录作为结果。
- 回退逻辑必须有一次性保护，不能无限修改 `src`。

### 10.4 布局稳定性附加练习

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

### 11.2 尺寸与响应式验收

- [ ] 每张图片有与真实比例一致的 `width`、`height`。
- [ ] CSS 缩放时保持比例，不让图片溢出容器。
- [ ] `srcset` 的描述符与候选真实尺寸一致。
- [ ] 同一 `srcset` 没有混用 `w` 与 `x`。
- [ ] `sizes` 与页面实际单栏、双栏插槽一致。
- [ ] `picture` 的 `source` 位于 `img` 之前。
- [ ] `img` 保留默认来源、替代文本与尺寸。
- [ ] 不同艺术裁剪比例有对应的空间预留策略。

### 11.3 性能与安全边界验收

- [ ] 首屏主要图片没有盲目懒加载。
- [ ] 屏外图片可以 lazy，但仍提供尺寸。
- [ ] `fetchpriority="high"` 只用于少量、经证据确认的关键图。
- [ ] 没把 `decoding` 当网络加载策略。
- [ ] 没把 `referrerpolicy` 当 CORS 或认证。
- [ ] 明白 CORS 授权来自服务器响应头。
- [ ] 没有声称 HTML 提供上传、付款、保存或服务端图片转换。

### 11.4 失败恢复验收

- [ ] 同时监听或检查成功与失败状态。
- [ ] 不用 `complete` 单独判断成功。
- [ ] 记录 `currentSrc`，排查实际候选而不是只看 `src`。
- [ ] 能区分 404、CORS 与解码失败。
- [ ] 回退脚本有一次性标记。
- [ ] `picture` 回退时处理失败的 `source`/`srcset`。
- [ ] 修复后清空旧证据并在相同条件复测。

### 11.5 可执行自检

在“邻里集市”页面 Console 运行：

```js
const listing = document.querySelector(".listing");
const hero = document.querySelector("#hero-image");
const images = [...document.images];

const checks = {
  integerPriceCents:
    Number.isInteger(Number(listing.dataset.priceCents)),
  utcStoredTime:
    listing.dataset.publishedAt.endsWith("Z"),
  everyImageHasAlt:
    images.every((image) => image.hasAttribute("alt")),
  everyImageHasDimensions:
    images.every((image) =>
      Number(image.getAttribute("width")) > 0 &&
      Number(image.getAttribute("height")) > 0
    ),
  heroUsable:
    hero.complete && hero.naturalWidth > 0,
  heroHasSelectedSource:
    hero.currentSrc.length > 0,
  heroNotLazy:
    hero.loading !== "lazy"
};

console.table(checks);
console.assert(
  Object.values(checks).every(Boolean),
  "图片验收存在失败项"
);
```

如果主图故意处于回退状态，`heroUsable` 仍可为真，因为自包含说明图可以成功解码；此时还应检查：

```js
document.querySelector("#hero-image").dataset.fallbackApplied
```

该自检只证明当前 DOM 的部分事实，不证明候选文件压缩质量、真实用户性能、屏幕阅读器体验或服务器 CORS 配置全部正确。

### 11.6 通过标准

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

### 12.6 `sizes` 能否写百分比？

源尺寸值不能直接写百分比。可以使用 `vw`、`px`、`rem` 或 `calc()` 等合适长度，表达真实布局插槽。

### 12.7 为什么刷新后浏览器没有改选小图？

可能复用了缓存中的大图，DPR 需要较大候选，或 `sizes` 仍声明了大插槽。禁用缓存，记录 DPR、视口和 `currentSrc` 后再判断。

### 12.8 `picture` 会下载所有 `source` 吗？

它的设计目标是让浏览器从匹配分支中选择候选，而不是把所有来源当独立 `img` 下载。错误预加载、脚本改源或其他引用仍可能产生额外请求，应以 Network 为准。

### 12.9 AVIF 一定比 WebP、JPEG 小吗？

不能只凭格式名保证。内容、编码器、质量参数、元数据和目标视觉质量都会影响体积。应比较实际文件字节和视觉结果。

### 12.10 `loading="lazy"` 越多越好吗？

不是。首屏关键图懒加载可能推迟主要内容；屏外图片通常更适合。是否受益取决于页面位置和真实加载证据。

### 12.11 `decode()` 成功是否说明网络请求是 200？

它说明当前图片已能完成解码，不是通用 HTTP 状态接口。具体请求状态仍应在 Network 或服务端日志中检查。

### 12.12 图片 `error` 事件里能直接读到 404 吗？

通常不能。元素事件不提供完整 HTTP 状态；应在 Network 查看状态、响应头和响应内容。

### 12.13 跨源图片能显示，为什么 Canvas 仍报安全错误？

显示跨源图片与脚本读取其像素是不同权限。读取像素需要 CORS 模式请求和图片服务器明确授权；Canvas 的完整规则会在后续嵌入与 Canvas 课程展开。

### 12.14 `referrerpolicy="no-referrer"` 能保护所有隐私吗？

不能。它只控制 referrer 信息，不隐藏 IP、请求时间，也不替代认证、授权、Cookie 策略或服务端访问控制。

### 12.15 破图时把元素隐藏掉可以吗？

只有图片完全非必要时才可能合适。商品图失败时直接隐藏会掩盖信息缺失；更好的做法是保留准确状态、替代文本和可重试路径。

### 12.16 为什么 data URL 案例不用于性能结论？

它适合稳定观察解码和 DOM 状态，但没有真实独立网络文件、缓存与候选体积。响应式性能结论必须用真实资源和 Network 验证。

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

### 13.2 无障碍与响应式图片

- [W3C WAI：图片教程](https://www.w3.org/WAI/tutorials/images/)
- [W3C WAI：`alt` 决策树](https://www.w3.org/WAI/tutorials/images/decision-tree/)
- [MDN：`img` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/img)
- [MDN：`picture` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/picture)
- [MDN：`source` 元素](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/source)
- [MDN：响应式图片指南](https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Responsive_images)

### 13.3 状态、解码与性能

- [MDN：`HTMLImageElement`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement)
- [MDN：`HTMLImageElement.decode()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode)
- [MDN：Lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading)
- [MDN：Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)
- [MDN：CORS-enabled images](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)
- [web.dev：优化 CLS](https://web.dev/articles/optimize-cls)

阅读资料时，持续追问：

1. 这是内容语义、布局提示、浏览器选择还是服务器授权？
2. 这个属性影响请求、解码还是绘制阶段？
3. 观察到的是源代码意图，还是 Network 与 DOM 的实际结果？
4. 失败后，用户是否仍能理解缺失了什么并继续操作？

## 我现在能做到什么

完成本课后，我已经能：

- 用 `img` 正确表达来源、替代文本和真实宽高比例。
- 区分信息图片、纯装饰图片和链接图片的替代文本策略。
- 用 `srcset`、`sizes` 和 `currentSrc`解释真实候选选择。
- 用 `picture` 与图片 `source` 组合艺术指导和格式回退。
- 为首屏图与屏外图选择不同的加载、解码和优先级提示。
- 区分 `referrerpolicy`、CORS 请求模式与服务器授权。
- 用 `complete`、固有尺寸、事件和 `decode()` 判断图片状态。
- 通过宽高比例减少图片引起的布局偏移。
- 从 Network、Console 和 DOM API 定位 404、CORS 与解码失败。
- 为响应式商品图片设计一次性、可解释、不会循环的失败恢复。
- 坚持整数分与 UTC ISO 时间，并准确说明静态教学页的能力边界。

## 单元导航

- [章入口：图片、媒体与嵌入](../03-images-media-embedding.md)
- [下一课：音频、视频与轨道](02-audio-video-tracks.md)
- [模块入口：HTML 教材](../README.md)
