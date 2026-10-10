# 嵌入、图像映射、SVG 与 Canvas：在边界内组合文档和图形

> 所属章节：图片、媒体与嵌入
>
> 建议学习时间：6–8 小时
>
> 阶段成果：完成一个不依赖外部素材的“邻里集市商品媒体说明页”

## 任务卡

邻里集市准备在商品详情页增加四类内容：

- 一张独立的交接规则卡；
- 一张可以按区域跳转的商品分区图；
- 一幅可缩放的台灯结构图；
- 一张比较三件商品价格的柱状图。

它们看起来都像“页面里的一个框”，实现机制却完全不同。规则卡是另一份文档，分区图是图片上的链接，台灯结构图是矢量元素，价格图则是脚本绘制的像素。若只追求“画出来”，很容易同时制造跨源读取错误、模糊画布和无法被键盘或读屏软件理解的内容。

**完成本课后，你将交付：**

- 一个带明确标题、空 `sandbox` 和严格权限策略的静态规则卡；
- 一个包含 `area` 链接并同时提供普通链接的图像映射；
- 一个带短标题与长描述的内联 SVG 商品结构图；
- 一个使用整数分数据、适配设备像素比的 Canvas 价格图；
- 一张始终可见的语义表格和文字摘要；
- 一份跨源画布污染的失败分析与恢复记录。

本课所有核心案例都写在 Markdown 中，不增加素材目录、实验目录、依赖或软件包。邻里集市案例是静态页面，数据只存在于 HTML 和当前页面内存中；它没有账号、服务端授权、持久化、支付或并发控制。

## 1. 任务背景

### 1.1 “嵌入”不是一种单一能力

HTML 可以把多种外部或图形内容放进页面：

| 需求 | 首选机制 | 内容的本质 |
| --- | --- | --- |
| 显示另一份网页或独立文档 | `iframe` | 新的浏览上下文和新文档 |
| 尝试显示 PDF、图片等资源并给出回退 | `object` | 外部资源和子内容回退 |
| 只声明一个外部嵌入资源 | `embed` | 无子内容的嵌入点 |
| 在图片不同区域建立链接 | `map` + `area` | 几何区域超链接 |
| 显示可缩放、可逐元素访问的图形 | SVG | 矢量元素树 |
| 用脚本高频绘制大量像素 | Canvas | 一张可变位图 |
| 只需要可靠导航 | `a` | 普通超链接 |

这些机制不能仅凭外观互换。例如：

- Canvas 画出的文字不是普通 DOM 文本，不能替代标题或数据表；
- 外部 SVG 通过 `img` 显示时，父页面不能把它内部的 `title` 当作图片 `alt`；
- `iframe` 能显示另一个站点，不代表父页面能读取该站点 DOM；
- `sandbox` 能施加浏览上下文限制，不会自动清洗不可信 HTML，也不会完成服务端授权；
- 图片上的热点能点击，不代表它在缩放、键盘操作和图片不可见时仍然容易使用。

### 1.2 本课的可观察完成标准

学习成果必须能被观察，而不是只写出标签：

1. Tab 键能够依次到达图像映射的热点或等价普通链接；
2. SVG 放大后边缘清晰，并具有可访问名称和说明；
3. Canvas 的 CSS 显示尺寸与位图尺寸可以在 DevTools 中分别说明；
4. 高像素密度屏幕上的图表不会因为只做 CSS 放大而明显模糊；
5. 禁用脚本或无法理解图表时，用户仍能读到价格表和文字结论；
6. 跨源像素进入 Canvas 后，能记录 `SecurityError`，而不是把错误误判为绘图 API 失效；
7. 外部页面拒绝被框入时，能从响应头找证据，并保留普通链接作为恢复路径。

## 2. 学习目标

完成本课后，你应能：

- 解释 `iframe` 为什么拥有独立文档和浏览上下文；
- 区分 `src` 与 `srcdoc`，并说明二者同时存在时的优先级；
- 为 `iframe` 编写有意义的 `title`；
- 根据是否首屏关键内容选择 `loading="eager"` 或 `loading="lazy"`；
- 使用 `referrerpolicy` 控制导航请求携带的来源信息；
- 从“默认限制、按需放开”的角度解释常用 `sandbox` 令牌；
- 区分 `sandbox` 限制与 `allow` 权限策略；
- 识别 CSP `frame-ancestors` 与 `X-Frame-Options` 导致的嵌入拒绝；
- 用协议、主机和端口判断两个 URL 是否同源；
- 解释为什么跨源父子页面不能直接读取彼此 DOM，以及何时使用 `postMessage()`；
- 比较 `object`、`embed` 和普通链接的回退能力；
- 使用 `map`、`area`、`shape`、`coords`、`href` 和 `alt`；
- 为图像映射提供键盘可达的普通链接替代；
- 根据可访问性和交互需求选择内联 SVG或外部 SVG；
- 为信息型 SVG提供短标题、长描述和可访问名称；
- 区分 Canvas 的 `width`/`height` 属性与 CSS 显示尺寸；
- 使用 `devicePixelRatio` 配置高清位图，并在绘制前重建坐标变换；
- 为 Canvas 图表提供可见文字与语义表格；
- 解释 `toDataURL()`、`getImageData()` 与 origin-clean 状态；
- 定位跨源图片导致的 tainted canvas，并给出同源或正确 CORS 两类恢复方案。

## 3. 预备知识

开始前建议先完成：

- [响应式图片与性能](01-images-responsive-performance.md)；
- [音频、视频与字幕轨道](02-audio-video-tracks.md)。

你需要知道：

- URL 由协议、主机、端口、路径等部分组成；
- `id` 应在一个文档中保持唯一；
- `alt` 是图片在当前语境中的文本替代；
- CSS 像素是布局单位，不一定等于一个物理屏幕像素；
- JavaScript 可以使用 `document.querySelector()` 获取元素；
- `try...catch` 可以记录同步异常。

本课不要求：

- 安装图表库或 SVG 编辑器；
- 编写服务端；
- 准备真实商品照片或 PDF；
- 绕过网站的嵌入限制；
- 实现身份认证、支付或真实预约；
- 在 Canvas 上实现复杂交互控件。

如果直接用 `file://` 打开页面，各浏览器对本地文件源的处理可能不同。核心自包含案例不依赖父子文档互读，因此可以直接打开；跨源实验只用于观察安全边界，结论应以 DevTools 中的实际错误和响应头为准。

## 4. 核心理论

### 4.1 先按内容和交互选择技术

可以先问五个问题：

```text
内容是否是一份独立文档？
  ├── 是：优先考虑普通链接；确需页内展示时评估 iframe/object
  └── 否
      ├── 是否需要图片区域导航？是：map + area，同时保留普通链接
      ├── 是否需要无损缩放和逐元素样式？是：SVG
      ├── 是否需要脚本高频像素绘制？是：Canvas
      └── 是否只是静态图片？是：img
```

普通链接经常是最稳妥的基线。它不受嵌入框尺寸影响，也不会因为目标站点设置 `frame-ancestors` 而失效。只有当“当前页面内直接查看”确实有价值时，才增加嵌入层。

### 4.2 `iframe`：页面中的独立文档

`iframe` 创建一个嵌套浏览上下文。它有自己的 `Document`、URL 和导航历史，也会增加内存、网络与渲染成本。

```html
<iframe
  src="https://docs.example/market-rules"
  title="邻里集市交接规则"
  width="640"
  height="360"
  loading="lazy"
  referrerpolicy="no-referrer">
</iframe>
```

关键属性如下。

#### `src`

`src` 给出要导航到的 URL。省略或移除后，框架通常处于 `about:blank`。目标地址能在浏览器标签页打开，也不保证允许被其他页面嵌入。

#### `srcdoc`

`srcdoc` 直接给出要在框架中解析的 HTML：

```html
<iframe
  title="静态交接规则"
  sandbox
  srcdoc="<h2>交接规则</h2><p>请在公共地点检查物品。</p>">
</iframe>
```

若 `src` 与 `srcdoc` 同时存在，支持 `srcdoc` 的浏览器优先使用 `srcdoc`。`src` 可以作为旧环境的后备地址，但不能把二者理解为“先加载 `src`，再叠加 `srcdoc`”。

`srcdoc` 的值会再次作为 HTML 解析。直接拼接用户输入会形成注入风险。空 `sandbox` 是额外限制，不是 HTML 清洗器；真实系统仍需要可信模板、上下文正确的转义和经过审计的清洗方案。

#### `title`

`iframe[title]` 是父文档为嵌入框提供的可访问名称。下面的标题没有说明框内是什么：

```html
<!-- 错误案例：名称没有区分内容 -->
<iframe title="嵌入内容" src="rules.html"></iframe>
```

应改为能够区分用途的标题，例如“商品交接规则”或“社区服务点地图”。页面上相邻的多个 iframe 不应都叫“内容”。

#### `loading`

- `eager`：立即加载，默认行为；
- `lazy`：当框架接近视口时再考虑加载，适合非关键、较靠后的嵌入。

`lazy` 是浏览器加载提示，不是固定像素距离合同，也不是访问控制。首屏必须立即阅读的规则不应只为了性能评分机械懒加载。

#### `referrerpolicy`

`referrerpolicy` 控制导航请求可携带多少来源信息。例如：

- `no-referrer`：不发送 `Referer`；
- `origin`：只发送来源的协议、主机和端口；
- `strict-origin-when-cross-origin`：同源可包含完整 URL，跨源通常只发来源，HTTPS 降级到 HTTP 时不发送；这是现代默认策略。

它减少来源信息暴露，不会隐藏用户 IP，也不会让资源变成私有，更不能代替服务端鉴权。

### 4.3 `sandbox`：先施加限制，再按需解除

只写 `sandbox`，值为空，表示启用一组限制。常见效果包括脚本不能运行、表单不能提交、弹窗和顶层导航受限，并把内容视为特殊的不透明源。

令牌不是“增加防护”，而是解除某一项限制：

| 令牌 | 放开的能力 | 决策问题 |
| --- | --- | --- |
| `allow-scripts` | 允许脚本运行 | 静态规则卡是否真的需要脚本？ |
| `allow-same-origin` | 不强制使用不透明源 | 是否依赖原来源身份、存储或同源 API？ |
| `allow-forms` | 允许表单提交 | 框内是否应发送数据？ |
| `allow-modals` | 允许部分模态能力 | 是否需要 `alert()`、`print()` 等？ |
| `allow-popups` | 允许打开新浏览上下文 | 链接是否必须打开新窗口？ |
| `allow-popups-to-escape-sandbox` | 新窗口不继承沙箱限制 | 目标站点是否需要正常运行？风险是否已评估？ |
| `allow-downloads` | 允许下载 | 是否有明确、可信的下载行为？ |
| `allow-pointer-lock` | 允许锁定指针 | 普通内容页通常不需要 |
| `allow-orientation-lock` | 允许锁定屏幕方向 | 普通桌面内容通常不需要 |
| `allow-presentation` | 允许演示会话 | 是否真的有投屏场景？ |
| `allow-top-navigation` | 允许导航顶层页面 | 风险高，通常不应给第三方内容 |
| `allow-top-navigation-by-user-activation` | 用户激活后允许顶层导航 | 比无条件顶层导航窄，但仍需评估 |
| `allow-top-navigation-to-custom-protocols` | 允许特定非 HTTP 协议导航 | 可能唤起外部应用 |
| `allow-storage-access-by-user-activation` | 用户激活后可请求存储访问 | 涉及跨站存储与隐私策略 |

静态规则卡不需要脚本、表单、弹窗、下载、摄像头或顶层导航，因此空 `sandbox` 就是更清楚的最小能力声明。

下面的组合不能被描述成“安全地运行同源不可信脚本”：

```html
<!-- 错误案例：对同源内容同时放开脚本和原来源能力 -->
<iframe
  src="/untrusted-preview.html"
  sandbox="allow-scripts allow-same-origin">
</iframe>
```

若框内内容与父页同源，同时获得脚本和原来源能力，它可能访问父页允许的同源资源，并在某些情形下移除自己的 `sandbox` 属性。更稳妥的边界是把真正不可信内容放在专用来源，保持最少令牌，并在服务端实施 CSP、鉴权和内容处理。

即使空 `sandbox` 限制了框内行为，也不能防止以下问题：

- 欺骗性文字诱导用户执行危险操作；
- 内容通过其他非沙箱入口打开；
- 服务端错误地返回敏感数据；
- 父页面自己把秘密写进 `srcdoc`；
- 浏览器、扩展或嵌入资源本身的缺陷。

因此，“加了 sandbox，所以内容安全”是错误结论。

### 4.4 `allow`：嵌入文档的权限策略

`allow` 声明 Permissions Policy，控制框内是否可以请求摄像头、麦克风、地理位置、全屏等受策略管理的能力：

```html
<iframe
  src="https://widgets.example/store-map"
  title="社区服务点地图"
  allow="camera 'none'; microphone 'none'; geolocation 'none'; fullscreen 'none'">
</iframe>
```

它与 `sandbox` 解决不同问题：

| 机制 | 主要问题 | 示例 |
| --- | --- | --- |
| `sandbox` | 浏览上下文可以执行哪些导航、脚本、表单等行为 | 禁止脚本或表单提交 |
| `allow` | 某些受控 Web 平台特性是否可用 | 禁止摄像头、麦克风 |
| `referrerpolicy` | 导航时发送多少来源信息 | 不发送 `Referer` |
| 服务端鉴权 | 当前用户是否有权访问数据 | 验证会话和资源权限 |
| CSP | 页面允许加载、执行或被哪些来源嵌入 | `frame-ancestors`、`script-src` |

`allow` 只能在上层响应头 Permissions Policy 允许的范围内进一步收紧，不能扩大已被响应头禁止的能力。即使策略允许摄像头，浏览器仍可能要求安全上下文、设备存在和用户授权；`allow` 不是自动授权。

### 4.5 嵌入拒绝：决定权可能在目标服务器

目标服务器可以拒绝自己的页面被框入：

```http
Content-Security-Policy: frame-ancestors 'self'
```

或使用较旧的响应头：

```http
X-Frame-Options: DENY
```

常见取值和含义：

- CSP `frame-ancestors 'none'`：不允许任何祖先页面嵌入；
- CSP `frame-ancestors 'self'`：只允许同源祖先；
- `X-Frame-Options: DENY`：拒绝被框入；
- `X-Frame-Options: SAMEORIGIN`：只允许同源页面框入。

这是目标响应的策略。父页面不能通过删除 `sandbox`、修改 CSS 或设置 CORS 绕过。CORS 控制脚本跨源读取网络响应，不是允许页面被 iframe 嵌入的开关。

排查路径：

1. 在新标签页直接打开目标 URL，确认资源本身是否可达；
2. 在 DevTools Network 中选择 iframe 文档请求；
3. 检查响应状态和 `Content-Security-Policy`、`X-Frame-Options`；
4. 查看 Console 中 “Refused to frame” 一类消息；
5. 若策略拒绝嵌入，保留或恢复普通链接；
6. 若你拥有目标服务，按真实来源需求配置 `frame-ancestors`，不要使用通配授权掩盖设计问题。

不能只用 iframe 的 `load`/`error` 事件判定成功或失败。浏览器为避免网络探测，可能不按普通资源的方式暴露错误，甚至在加载失败时仍触发 `load`。页面可见结果、Console 和响应头才是更可靠证据。

### 4.6 同源策略：能显示不等于能读取

源由三部分共同决定：

```text
源 = 协议 + 主机 + 端口
```

以 `https://market.example:443/listing/42` 为基准：

| URL | 是否同源 | 原因 |
| --- | --- | --- |
| `https://market.example:443/rules` | 是 | 协议、主机、端口相同 |
| `https://market.example/listing/9` | 是 | HTTPS 默认端口为 443 |
| `http://market.example/listing/42` | 否 | 协议不同 |
| `https://api.market.example/listing/42` | 否 | 主机不同 |
| `https://market.example:8443/listing/42` | 否 | 端口不同 |

父页通常可以获得跨源 iframe 的 `contentWindow` 引用，但只能使用受限接口，不能读取 `contentWindow.document.body`。同源 iframe 才能在未被其他策略限制时直接互读 DOM。

跨源父子页面确需通信时，使用 `window.postMessage()`，并同时做到：

- 发送方使用精确 `targetOrigin`，不默认写 `"*"`；
- 接收方检查 `event.origin`；
- 必要时检查 `event.source` 是否是预期窗口；
- 验证 `event.data` 的类型、字段和允许值；
- 不把消息当成已完成的用户身份认证。

本课的静态规则卡不通信，因此不添加 `postMessage()`。不需要的通信代码只会扩大理解和安全成本。

本地 `file://` 页面的源行为是实现相关的，现代浏览器经常把文件视为不透明源。不要用“同一文件夹里能否互读”推导线上同源规则。

### 4.7 `object`、`embed` 与回退链接

`object` 可以尝试加载由 `data` 指定的资源，并在资源无法使用时呈现子内容：

```html
<object
  data="community-rules.pdf"
  type="application/pdf"
  width="640"
  height="480">
  <p>
    浏览器没有显示规则文档。
    <a href="community-rules.pdf">打开或下载社区规则 PDF</a>
  </p>
</object>
```

`embed` 是空元素，没有可以承载回退内容的子节点：

```html
<embed
  src="community-rules.pdf"
  type="application/pdf"
  width="640"
  height="480">
<p><a href="community-rules.pdf">打开社区规则 PDF</a></p>
```

使用边界：

- PDF 是否内嵌显示取决于浏览器和用户配置；
- 移动设备、辅助技术和企业策略可能采用不同查看器；
- `type` 是类型提示，不能把错误内容变成可用资源；
- `object` 的回退内容比 `embed` 完整，但重要资源仍应在嵌入区域外提供普通链接；
- 两者都不是服务端授权机制；
- 不使用 Flash、Java 插件或 ActiveX 等历史插件方案。

如果用户只需下载或在新页面阅读文档，普通链接通常比强制内嵌更可靠。

### 4.8 `map` 与 `area`：图片上的几何链接

`img[usemap]` 使用哈希名称关联 `map[name]`：

```html
<img
  src="market-sections.png"
  width="600"
  height="220"
  alt="三个商品分区：台灯、木椅和旧书"
  usemap="#market-sections">

<map name="market-sections" id="market-sections">
  <area
    shape="rect"
    coords="30,30,190,190"
    href="#lamp"
    alt="跳到台灯商品">
  <area
    shape="circle"
    coords="300,110,80"
    href="#chair"
    alt="跳到木椅商品">
</map>
```

若同时设置 `map[id]`，其值应与 `name` 相同。`usemap="#market-sections"` 中的 `#` 不应漏掉。

`shape` 与 `coords` 的基本规则：

| `shape` | 坐标 | 含义 |
| --- | --- | --- |
| `rect` | `x1,y1,x2,y2` | 左上角与右下角 |
| `circle` | `x,y,r` | 圆心和半径 |
| `poly` | `x1,y1,x2,y2,...` | 至少三个顶点 |
| `default` | 不写 `coords` | 剩余整个区域 |

带 `href` 的 `area` 是超链接，必须有能表达链接目的的 `alt`。图片自己的 `alt` 解释整张图，`area[alt]` 解释每个选择，两者职责不同。

在常见浏览器中，带 `href` 的 `area` 可以进入键盘焦点顺序，但热点轮廓、触控命中区域、缩放后的坐标维护和非视觉理解都可能不理想。因此应在图旁提供相同目的地的普通链接：

```html
<nav aria-label="商品分区文字导航">
  <ul>
    <li><a href="#lamp">台灯商品</a></li>
    <li><a href="#chair">木椅商品</a></li>
  </ul>
</nav>
```

这不是重复的装饰，而是稳定的操作替代。响应式布局改变图片显示尺寸时，固定坐标还可能与视觉区域错位；应在目标尺寸逐项复测，或改用普通链接、内联 SVG 链接等更易维护的结构。

### 4.9 内联 SVG 与外部 SVG

SVG 使用矢量形状描述图形。常见引入方式：

| 方式 | 父页能否直接查询内部形状 | 文本替代入口 | 适用场景 |
| --- | --- | --- | --- |
| 内联 `<svg>` | 可以 | `title`、`desc`、ARIA、可见文字 | 需要逐元素样式、脚本或与页面语义关联 |
| `<img src="diagram.svg" alt="...">` | 不可以 | HTML `alt` | 静态图像，缓存和复用方便 |
| `<object data="diagram.svg">` | 视源和策略而定 | 回退内容及 SVG 自身语义 | 需要独立文档行为且可接受兼容差异 |
| CSS `background-image` | 不作为内容暴露 | 由相邻 HTML 承担 | 纯装饰背景 |

信息型内联 SVG 的稳妥起点：

```html
<svg
  viewBox="0 0 320 180"
  role="img"
  aria-labelledby="lamp-title lamp-desc">
  <title id="lamp-title">台灯结构示意</title>
  <desc id="lamp-desc">
    圆形底座连接竖直灯臂，灯臂顶部连接向右下方照射的灯罩。
  </desc>
  <circle cx="100" cy="150" r="45" fill="#5b7c6f"></circle>
  <path d="M100 140V65L180 35" fill="none" stroke="#263c34" stroke-width="12"></path>
  <path d="M165 20L245 70H145Z" fill="#d97745"></path>
</svg>
```

`viewBox` 建立内部坐标系，使图形可随 CSS 尺寸缩放。`role="img"` 让整体按图像理解；`aria-labelledby` 把短标题和长描述关联到整体。不同辅助技术组合的行为仍需实测，可见文字说明是复杂图形最稳定的补充。

注意：

- 内联 SVG 没有 HTML `alt` 属性；
- `title` 应短，`desc` 用于较长结构或结论；
- 外部 SVG 通过 `img` 显示时，父页必须提供 `alt`，不能依赖外部文件内部的 `title`；
- 纯装饰 SVG 可使用 `aria-hidden="true"`，但必要信息必须在相邻 HTML 中存在；
- 不要把复杂交互全部塞进 SVG 而忽略焦点、键盘和状态提示；
- SVG 中的 `path`、`circle`、`rect` 属于 SVG 命名空间，不是 HTML 元素。

### 4.10 Canvas 的两种尺寸

Canvas 有一张内部位图，也有页面上的 CSS 显示盒：

```html
<canvas
  width="600"
  height="300"
  style="width: 300px; height: 150px;">
</canvas>
```

- HTML `width="600"`、`height="300"`：位图为 600 × 300 像素；
- CSS `width: 300px; height: 150px`：页面显示为 300 × 150 CSS 像素；
- 未写属性时，位图默认是 300 × 150；
- 只用 CSS 把默认位图放大，会拉伸像素并产生模糊；
- 运行时重新设置 `canvas.width` 或 `canvas.height` 会重建位图，并重置绘图状态、变换和已有内容，即使设置成原值也应按重置处理。

下面是典型错误：

```html
<!-- 错误案例：只扩大显示盒，内部仍可能是默认 300 × 150 -->
<canvas id="chart" style="width: 900px; height: 450px;"></canvas>
```

修复时同时规划 CSS 尺寸和位图尺寸，不要把它们当成同一件事。

### 4.11 `devicePixelRatio` 与高清绘制

在设备像素比为 2 的屏幕上，一个 400 × 200 CSS 像素的区域可能对应 800 × 400 个设备像素。常用步骤：

1. 读取 Canvas 的 CSS 尺寸；
2. 读取 `window.devicePixelRatio`；
3. 把位图属性设为 CSS 尺寸乘以 DPR；
4. 把 CSS 显示尺寸保持为原值；
5. 使用 `setTransform(dpr, 0, 0, dpr, 0, 0)`，继续按 CSS 像素坐标绘制；
6. 每次重建位图后重新取得或配置绘图上下文并完整重绘。

```js
const canvas = document.querySelector("#chart");
const rect = canvas.getBoundingClientRect();
const cssWidth = Math.max(1, Math.round(rect.width));
const cssHeight = 240;
const dpr = Math.max(1, window.devicePixelRatio || 1);

canvas.width = Math.round(cssWidth * dpr);
canvas.height = Math.round(cssHeight * dpr);
canvas.style.width = `${cssWidth}px`;
canvas.style.height = `${cssHeight}px`;

const context = canvas.getContext("2d");
if (context) {
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.fillStyle = "#263c34";
  context.fillRect(0, 0, cssWidth, cssHeight);
}
```

这里的缩放只解决位图清晰度，不会创造图表语义。DPR 还可能因窗口移动到另一块屏幕、浏览器缩放等条件发生变化，因此响应式图表应在尺寸改变后重新计算和绘制。

### 4.12 Canvas 的语义替代

Canvas 绘图命令修改像素，不会创建“柱条”“价格标签”这样的 DOM 子节点。下面的内容视觉上可能完整，非视觉用户却得不到数据：

```html
<!-- 错误案例：没有等价数据和图表说明 -->
<canvas id="price-chart" width="640" height="260"></canvas>
```

静态数据图至少应提供：

- 一个可见图表标题；
- 一段可见结论或趋势摘要；
- 一张含表头的语义表格；
- Canvas 自身与标题、摘要的关联；
- Canvas 不支持或脚本关闭时的回退文字。

价格数据应以整数分为业务源值：

```text
阅读台灯：3900 分
实木椅：5200 分
旧书套装：1800 分
```

显示时再除以 100 格式化为元。不要把 `39.00` 之类浮点元值作为业务计算源。

表格不是给图表“补一句 alt”，而是提供可检查的数据结构。仅写“这是一张价格图”没有传达每个商品的价格和比较结论。

### 4.13 `toDataURL()`、`getImageData()` 与污染画布

`toDataURL()` 把当前位图序列化为 `data:` URL；默认格式通常为 PNG。大画布会生成很长的字符串，生产导出更常考虑异步 `toBlob()`。

`getImageData(x, y, width, height)` 读取指定区域的像素数据。宽或高为 0 会产生尺寸错误；读取范围超出画布的部分按透明黑处理。

新 Canvas 的位图初始具有 origin-clean 状态。若把未经 CORS 授权的跨源图片、视频或其他像素源绘入 Canvas，该状态会变为不干净，通常不能恢复为可读状态；此时调用读取或导出 API会抛出 `SecurityError`：

```js
try {
  const firstPixel = context.getImageData(0, 0, 1, 1);
  const pngDataUrl = canvas.toDataURL("image/png");
  console.log(firstPixel.data, pngDataUrl.slice(0, 22));
} catch (error) {
  console.error(error.name, error.message);
}
```

这叫 tainted canvas。浏览器仍可显示已经画出的图像，但阻止页面读取像素，避免恶意站点借 Canvas 窃取其他来源的内容。

正确恢复路径只有两类：

1. 使用同源图像，或在当前页面生成的同源 `Blob`/Canvas；
2. 在设置 `src` 之前为图片设置 `crossOrigin = "anonymous"`，并让图片服务器返回匹配的 `Access-Control-Allow-Origin`。

```js
const image = new Image();
image.crossOrigin = "anonymous";
image.src = "https://assets.example/product/lamp.png";
```

只写 `crossOrigin` 不够。服务器没有正确 CORS 响应时，图片加载会失败；删掉 `crossOrigin` 也不是修复，因为图片虽然可能显示，却会污染画布。代理他人图片还涉及授权、缓存与隐私，不应把开放代理当成默认方案。

重设 `canvas.width`/`height` 会创建新位图，新的位图重新处于 origin-clean 状态，但之前的像素也全部丢失。这只是清空后重新开始，不是把已污染像素“洗干净”。

## 5. 元素、属性、API 或配置清单

### 5.1 嵌入与图像映射

| 名称 | 作用 | 最小示例 | 关键边界 |
| --- | --- | --- | --- |
| `iframe` | 创建嵌套浏览上下文 | `<iframe title="规则"></iframe>` | 独立文档，有资源成本 |
| `iframe[src]` | 指定导航 URL | `src="rules.html"` | 目标可拒绝嵌入 |
| `iframe[srcdoc]` | 直接提供内联文档 | `srcdoc="<p>规则</p>"` | 优先于 `src`；不可信内容需处理 |
| `iframe[title]` | 给嵌入框命名 | `title="交接规则"` | 应能区分多个框 |
| `iframe[loading]` | 提示立即或延后加载 | `loading="lazy"` | 性能提示，不是安全策略 |
| `iframe[referrerpolicy]` | 控制来源信息 | `referrerpolicy="no-referrer"` | 不代替鉴权 |
| `iframe[sandbox]` | 施加浏览上下文限制 | `<iframe sandbox>` | 令牌是解除限制 |
| `iframe[allow]` | 设置框内权限策略 | `allow="camera 'none'"` | 不能扩大响应头已禁止的能力 |
| CSP `frame-ancestors` | 声明哪些祖先可嵌入页面 | `frame-ancestors 'self'` | 由被嵌入响应设置 |
| `X-Frame-Options` | 较旧的框架嵌入限制 | `DENY` | 不能用父页标记绕过 |
| `object[data]` | 嵌入外部资源 | `<object data="rules.pdf">` | 可以包含回退子内容 |
| `embed[src]` | 声明外部嵌入资源 | `<embed src="rules.pdf">` | 空元素，另写普通链接 |
| `img[usemap]` | 关联图像映射 | `usemap="#zones"` | 引用 `map[name]` |
| `map[name]` | 定义热点集合 | `<map name="zones">` | 名称非空且在树中唯一 |
| `area[href]` | 创建热点链接 | `<area href="#lamp">` | 有 `href` 时提供有意义 `alt` |
| `area[shape]` | 选择热点形状 | `shape="rect"` | `rect`、`circle`、`poly`、`default` |
| `area[coords]` | 给出几何坐标 | `coords="0,0,100,80"` | 与显示图尺寸一起验证 |

### 5.2 SVG 与 Canvas

| 名称 | 作用 | 最小示例 | 关键边界 |
| --- | --- | --- | --- |
| `svg[viewBox]` | 建立矢量坐标系 | `viewBox="0 0 320 180"` | 有助于无损缩放 |
| SVG `title` | 短标题 | `<title>台灯结构</title>` | 不是可见正文 |
| SVG `desc` | 较长描述 | `<desc>底座连接灯臂</desc>` | 复杂信息仍提供可见文字 |
| `role="img"` | 将内联 SVG 作为整体图像 | `<svg role="img">` | 配合可访问名称 |
| `aria-labelledby` | 引用标题与说明 | `aria-labelledby="t d"` | ID 必须真实存在且唯一 |
| `canvas[width]` | 设置位图宽度 | `width="640"` | 不是 CSS 宽度 |
| `canvas[height]` | 设置位图高度 | `height="260"` | 重设会清空并重置状态 |
| `getContext("2d")` | 获取 2D 绘图上下文 | `canvas.getContext("2d")` | 可能返回 `null` |
| `window.devicePixelRatio` | CSS 像素与设备像素比例 | `window.devicePixelRatio || 1` | 可能随环境变化 |
| `setTransform()` | 设置当前变换 | `setTransform(dpr, 0, 0, dpr, 0, 0)` | 位图重建后重新设置 |
| `getImageData()` | 读取像素 | `getImageData(0, 0, 1, 1)` | 污染画布会抛 `SecurityError` |
| `toDataURL()` | 同步序列化位图 | `toDataURL("image/png")` | 污染画布不可导出；大图成本高 |
| `toBlob()` | 异步生成图片 Blob | `canvas.toBlob(callback)` | 也要求画布保持 origin-clean |

### 5.3 选择速查

| 场景 | 推荐 | 不推荐的替代 |
| --- | --- | --- |
| 商品实拍 | `img` | 用 Canvas 重画照片 |
| 简单结构图，需要无损缩放 | SVG | 超大位图 |
| 高频动画或大量像素绘制 | Canvas | 数万个 SVG DOM 节点 |
| 第三方地图 | 供应商允许时使用 `iframe`，同时给地址链接 | 尝试读取跨源地图 DOM |
| PDF 规则 | 首先给普通链接；可选 `object`/`iframe` 预览 | 只给 `embed` 且无链接 |
| 图片区域导航 | `map`/`area` 加普通链接 | 只提供不可见热点 |
| 普通章节导航 | `a` | 为导航创建 iframe |

## 6. 最小可运行案例

### 6.1 目标：沙箱中的静态规则卡

这个案例只验证 `iframe` 的文档边界和属性，不运行脚本，也不请求外部资源。

文件位置：

```text
market-learning/
└── practice/
    └── html-09-embedding/
        └── rules-card.html
```

本教材不创建该目录。请在自己的练习项目中把下面的完整内容保存为 `rules-card.html`。

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>静态规则卡 · 邻里集市</title>
    <style>
      body {
        max-width: 48rem;
        margin: 2rem auto;
        padding: 0 1rem;
        font: 1rem/1.6 system-ui, sans-serif;
        color: #263c34;
      }

      iframe {
        width: 100%;
        min-height: 18rem;
        border: 2px solid #5b7c6f;
        border-radius: 0.75rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>商品交接说明</h1>
      <p id="rules-context">
        下方是随本页提供的静态教学规则，不会提交表单或保存状态。
      </p>

      <iframe
        title="邻里集市静态交接规则"
        aria-describedby="rules-context"
        sandbox
        allow="camera 'none'; microphone 'none'; geolocation 'none'; fullscreen 'none'"
        loading="eager"
        referrerpolicy="no-referrer"
        src="about:blank"
        srcdoc='<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>静态交接规则</title>
    <style>
      body {
        margin: 0;
        padding: 1.25rem;
        font: 1rem/1.6 system-ui, sans-serif;
        color: #263c34;
        background: #f4f0e6;
      }
      strong { color: #8b3f22; }
    </style>
  </head>
  <body>
    <h2>当面交接三步</h2>
    <ol>
      <li>在公共地点见面。</li>
      <li>检查物品和配件。</li>
      <li><strong>确认无误后</strong>再完成交接。</li>
    </ol>
    <p>本卡片是静态说明，不代表服务器已经批准预约。</p>
  </body>
</html>'>
      </iframe>

      <p>
        无法查看卡片时，仍可阅读本页摘要：
        在公共地点见面，检查商品，确认后完成交接。
      </p>
    </main>
  </body>
</html>
```

### 6.2 打开方法

1. 保存 `rules-card.html`；
2. 直接用现代浏览器打开；
3. 打开 DevTools 的 Elements；
4. 选择 `iframe`，确认它同时有 `src` 与 `srcdoc`；
5. 在 Console 中确认没有脚本报错；
6. 在 Accessibility 面板确认嵌入框名称为“邻里集市静态交接规则”。

### 6.3 预期结果

- 页面标题下出现一张浅色规则卡；
- 卡片内显示三步有序列表；
- `srcdoc` 内容出现，说明它优先于 `src="about:blank"`；
- 框内没有按钮、表单和脚本；
- 父页始终有一段可见规则摘要；
- 页面不发起业务 API 请求，不保存任何状态。

### 6.4 失败证据

以下任一现象都应记录为失败：

- 规则卡空白，Elements 中 `srcdoc` 引号提前结束；
- 无障碍树只报告“frame”而没有可区分名称；
- `sandbox` 出现不需要的 `allow-scripts`、`allow-forms` 或顶层导航令牌；
- `allow` 意外允许摄像头、麦克风或地理位置；
- 页面文案声称“sandbox 已保证规则可信”；
- 规则只存在于 iframe 中，父页没有可见摘要；
- Network 出现未设计的业务请求。

### 6.5 渐进扩展：把非关键卡片延后加载

当同一规则卡移动到很长页面的末尾，并且前文已有完整规则链接或摘要时，可以把：

```html
loading="eager"
```

改为：

```html
loading="lazy"
```

验证步骤：

1. 在 iframe 前临时加入足够长的普通段落，使卡片离开首屏；
2. 打开 Network，刷新页面；
3. 缓慢滚动到卡片附近；
4. 记录浏览器何时创建或加载嵌入文档；
5. 删除临时段落，保留与你的真实页面结构一致的选择。

答案标准：能够解释 `lazy` 是性能提示，触发距离由浏览器决定；它没有改变 `sandbox`、同源策略或服务端权限。

### 6.6 明确反例与恢复

错误写法：

```html
<!-- 错误案例：无名称、权限过宽、把可变内容直接拼入 srcdoc -->
<iframe
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  allow="camera *; microphone *; geolocation *"
  srcdoc="<script>document.body.innerHTML = location.hash</script>">
</iframe>
```

恢复顺序：

1. 先写出实际需求：只显示静态规则；
2. 删除脚本、表单和弹窗；
3. 将 `sandbox` 收紧为空值；
4. 将摄像头、麦克风、定位和全屏设为 `'none'`；
5. 添加能区分用途的 `title`；
6. 使用固定可信模板，不拼接 URL 片段或用户输入；
7. 在父页保留可见摘要；
8. 重新检查 Elements、Accessibility、Network 和 Console。

## 7. 邻里集市集成案例

### 7.1 案例范围

本页组合四项能力：

```text
邻里集市媒体说明页
├── iframe：静态交接规则
├── map/area：商品分区热点
├── SVG：台灯结构示意
└── Canvas：整数分价格图
    ├── 可见文字摘要
    └── 语义价格表
```

页面中的三件商品是固定教学数据。JavaScript 只从当前 DOM 读取整数分并绘图；没有 `fetch()`、`localStorage`、Cookie、登录、收藏、预约、支付或写入服务器。

### 7.2 文件位置

```text
market-learning/
└── practice/
    └── html-09-embedding/
        └── index.html
```

把下面的完整文件保存为 `index.html`。它不需要其他图片、脚本或样式文件。

### 7.3 完整页面

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>商品媒体说明 · 邻里集市</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, sans-serif;
        color: #263c34;
        background: #faf8f2;
      }

      body {
        max-width: 72rem;
        margin: 0 auto;
        padding: 1.5rem;
        line-height: 1.6;
      }

      section {
        margin-block: 2.5rem;
      }

      iframe,
      img,
      svg,
      canvas {
        display: block;
        max-width: 100%;
      }

      iframe {
        width: 100%;
        min-height: 15rem;
        border: 2px solid #5b7c6f;
        border-radius: 0.75rem;
      }

      .map-image {
        width: 600px;
        height: auto;
      }

      .text-links ul {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem 1.5rem;
        padding-left: 1.25rem;
      }

      .product-diagram {
        width: min(100%, 32rem);
        height: auto;
        border: 1px solid #b8c6bf;
        background: #f4f0e6;
      }

      #price-chart {
        width: 100%;
        height: 260px;
        border: 1px solid #b8c6bf;
        background: #ffffff;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      caption {
        text-align: left;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }

      th,
      td {
        border: 1px solid #879b91;
        padding: 0.5rem;
        text-align: left;
      }

      a:focus-visible {
        outline: 3px solid #bd5d32;
        outline-offset: 3px;
      }
    </style>
  </head>
  <body>
    <header>
      <p>邻里集市 · 静态教学页</p>
      <h1>商品媒体说明</h1>
      <p>
        页面只展示固定教学数据，不会创建预约、完成支付或保存商品状态。
      </p>
    </header>

    <main>
      <section aria-labelledby="rules-heading">
        <h2 id="rules-heading">交接规则卡</h2>
        <p id="rules-note">
          规则卡是独立静态文档。空 sandbox 限制其能力，但不代表内容已经过安全审计。
        </p>
        <iframe
          title="邻里集市静态交接规则"
          aria-describedby="rules-note"
          sandbox
          allow="camera 'none'; microphone 'none'; geolocation 'none'; fullscreen 'none'"
          loading="eager"
          referrerpolicy="no-referrer"
          srcdoc='<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <title>静态交接规则</title>
    <style>
      body {
        margin: 0;
        padding: 1rem;
        font: 1rem/1.6 system-ui, sans-serif;
        color: #263c34;
        background: #f4f0e6;
      }
    </style>
  </head>
  <body>
    <h2>当面交接三步</h2>
    <ol>
      <li>选择公共地点。</li>
      <li>检查物品与配件。</li>
      <li>双方确认后完成交接。</li>
    </ol>
    <p>静态说明不代表预约或付款已经发生。</p>
  </body>
</html>'>
        </iframe>
        <p>文字摘要：公共地点见面，检查商品，双方确认后再交接。</p>
      </section>

      <section aria-labelledby="map-heading">
        <h2 id="map-heading">商品分区图</h2>
        <p>
          可以点击图中三个色块，也可以使用图后的普通链接。
        </p>
        <img
          class="map-image"
          src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MDAgMjIwIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjIyMCIgZmlsbD0iI2Y0ZjBlNiIvPjxyZWN0IHg9IjMwIiB5PSIzMCIgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxNjAiIHJ4PSIyMCIgZmlsbD0iI2Q5Nzc0NSIvPjxyZWN0IHg9IjIyMCIgeT0iMzAiIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIiByeD0iMjAiIGZpbGw9IiM1YjdjNmYiLz48cmVjdCB4PSI0MTAiIHk9IjMwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgcng9IjIwIiBmaWxsPSIjNmQ2YThkIi8+PGcgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjI4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj48dGV4dCB4PSIxMTAiIHk9IjEyMCI+5Y+w54GvPC90ZXh0Pjx0ZXh0IHg9IjMwMCIgeT0iMTIwIj7mnKjmpIU8L3RleHQ+PHRleHQgeD0iNDkwIiB5PSIxMjAiPuaXp+S5pjwvdGV4dD48L2c+PC9zdmc+"
          width="600"
          height="220"
          alt="三个商品分区，从左到右为台灯、木椅和旧书"
          usemap="#product-zones">
        <map name="product-zones" id="product-zones">
          <area
            shape="rect"
            coords="30,30,190,190"
            href="#lamp"
            alt="跳到阅读台灯说明">
          <area
            shape="rect"
            coords="220,30,380,190"
            href="#chair"
            alt="跳到实木椅说明">
          <area
            shape="rect"
            coords="410,30,570,190"
            href="#books"
            alt="跳到旧书套装说明">
        </map>

        <nav class="text-links" aria-label="商品分区文字导航">
          <ul>
            <li><a href="#lamp">阅读台灯</a></li>
            <li><a href="#chair">实木椅</a></li>
            <li><a href="#books">旧书套装</a></li>
          </ul>
        </nav>
      </section>

      <section id="lamp" aria-labelledby="lamp-heading">
        <h2 id="lamp-heading">阅读台灯结构图</h2>
        <svg
          class="product-diagram"
          viewBox="0 0 480 280"
          role="img"
          aria-labelledby="lamp-svg-title lamp-svg-desc">
          <title id="lamp-svg-title">阅读台灯结构示意</title>
          <desc id="lamp-svg-desc">
            左下方的圆形底座连接竖直灯臂，灯臂顶部向右连接橙色灯罩，
            灯罩下方有三条光线。图中标出底座、灯臂和灯罩。
          </desc>
          <rect width="480" height="280" fill="#f4f0e6"></rect>
          <circle cx="140" cy="230" r="58" fill="#5b7c6f"></circle>
          <path
            d="M140 210V95L270 55"
            fill="none"
            stroke="#263c34"
            stroke-width="16"
            stroke-linecap="round">
          </path>
          <path d="M245 30L375 100H220Z" fill="#d97745"></path>
          <g stroke="#bd5d32" stroke-width="5" stroke-linecap="round">
            <path d="M290 110L270 170"></path>
            <path d="M325 110L325 180"></path>
            <path d="M360 110L385 170"></path>
          </g>
          <g fill="#263c34" font-family="system-ui, sans-serif" font-size="18">
            <text x="35" y="245">底座</text>
            <text x="90" y="90">灯臂</text>
            <text x="365" y="45">灯罩</text>
          </g>
        </svg>
        <p>
          图示说明：底座支撑灯臂，灯臂连接灯罩；示意图不代表商品实拍或检测报告。
        </p>
      </section>

      <section id="chair" aria-labelledby="chair-heading">
        <h2 id="chair-heading">实木椅说明</h2>
        <p>固定教学商品，价格数据见下方表格；页面没有真实库存。</p>
      </section>

      <section id="books" aria-labelledby="books-heading">
        <h2 id="books-heading">旧书套装说明</h2>
        <p>固定教学商品，价格数据见下方表格；页面没有真实库存。</p>
      </section>

      <section aria-labelledby="chart-title">
        <h2 id="chart-title">商品价格比较</h2>
        <p id="chart-summary">
          三件商品中，实木椅价格最高，为 52.00 元；旧书套装最低，为 18.00 元。
          所有业务源值均为整数分。
        </p>

        <canvas
          id="price-chart"
          width="640"
          height="260"
          role="img"
          aria-labelledby="chart-title"
          aria-describedby="chart-summary">
          价格比较：阅读台灯 3900 分，实木椅 5200 分，旧书套装 1800 分。
          完整数据见紧随其后的价格表。
        </canvas>

        <table>
          <caption id="price-table-caption">商品价格源数据</caption>
          <thead>
            <tr>
              <th scope="col">商品</th>
              <th scope="col">整数分</th>
              <th scope="col">显示价格</th>
            </tr>
          </thead>
          <tbody id="price-data">
            <tr data-price-cents="3900">
              <th scope="row">阅读台灯</th>
              <td>3900</td>
              <td>39.00 元</td>
            </tr>
            <tr data-price-cents="5200">
              <th scope="row">实木椅</th>
              <td>5200</td>
              <td>52.00 元</td>
            </tr>
            <tr data-price-cents="1800">
              <th scope="row">旧书套装</th>
              <td>1800</td>
              <td>18.00 元</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>

    <script>
      const canvas = document.querySelector("#price-chart");
      const rows = [...document.querySelectorAll("#price-data tr")];
      const formatter = new Intl.NumberFormat("zh-CN", {
        style: "currency",
        currency: "CNY",
      });

      const items = rows.map((row) => {
        const name = row.querySelector("th").textContent.trim();
        const priceCents = Number(row.dataset.priceCents);

        if (!Number.isInteger(priceCents) || priceCents < 0) {
          throw new TypeError(`${name} 的价格必须是非负整数分`);
        }

        return { name, priceCents };
      });

      function drawPriceChart() {
        const cssWidth = Math.max(
          320,
          Math.round(canvas.getBoundingClientRect().width),
        );
        const cssHeight = 260;
        const dpr = Math.max(1, window.devicePixelRatio || 1);

        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        const context = canvas.getContext("2d");
        if (!context) {
          return;
        }

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, cssWidth, cssHeight);

        const chartLeft = 110;
        const chartRight = 95;
        const chartWidth = Math.max(120, cssWidth - chartLeft - chartRight);
        const barHeight = 38;
        const rowGap = 28;
        const maxPriceCents = Math.max(...items.map((item) => item.priceCents));

        context.font = "16px system-ui, sans-serif";
        context.textBaseline = "middle";

        items.forEach((item, index) => {
          const y = 34 + index * (barHeight + rowGap);
          const barWidth = Math.round(
            (item.priceCents / maxPriceCents) * chartWidth,
          );

          context.fillStyle = "#263c34";
          context.textAlign = "right";
          context.fillText(item.name, chartLeft - 12, y + barHeight / 2);

          context.fillStyle = index === 1 ? "#d97745" : "#5b7c6f";
          context.fillRect(chartLeft, y, barWidth, barHeight);

          context.fillStyle = "#263c34";
          context.textAlign = "left";
          context.fillText(
            formatter.format(item.priceCents / 100),
            chartLeft + barWidth + 10,
            y + barHeight / 2,
          );
        });
      }

      let resizeFrame = 0;
      window.addEventListener("resize", () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(drawPriceChart);
      });

      drawPriceChart();
    </script>
  </body>
</html>
```

### 7.4 打开方法

1. 保存 `index.html`；
2. 直接用浏览器打开，不需要本地服务器；
3. 只使用键盘 Tab 键，确认普通商品链接可聚焦；
4. 点击色块或普通链接，确认都跳到对应商品说明；
5. 放大页面到 200%，确认 SVG 边缘仍清晰；
6. 在 Elements 中选择 Canvas，比较属性尺寸和 CSS 尺寸；
7. 在 Console 运行：

```js
const chart = document.querySelector("#price-chart");
console.table({
  bitmapWidth: chart.width,
  bitmapHeight: chart.height,
  cssWidth: chart.getBoundingClientRect().width,
  cssHeight: chart.getBoundingClientRect().height,
  dpr: window.devicePixelRatio,
});
```

8. 禁用 JavaScript 后刷新，确认文字摘要和价格表仍然完整；
9. 打开 Network，确认没有业务 API 请求。

### 7.5 预期结果

- 静态规则卡显示三步规则；
- 商品分区图有三个热点，并有三个普通链接；
- 三种入口都跳到页面内真实存在的目标；
- 台灯 SVG 有短标题、长描述和可见说明；
- Canvas 按价格比例显示三条横向柱；
- 实木椅最长，旧书套装最短；
- 表格源值分别是 `3900`、`5200`、`1800` 分；
- 禁用脚本后只损失可视化，不损失价格事实；
- 改变窗口宽度后图表重新绘制；
- 页面刷新后不会保留用户操作，因为没有可变业务状态。

### 7.6 失败证据

- Tab 键无法到达任何商品导航；
- `usemap` 与 `map[name]` 名称不一致；
- `area` 有 `href` 却没有有意义的 `alt`；
- 图像缩放后热点与色块明显错位；
- SVG 在 Accessibility 树中没有名称；
- Canvas 的属性仍是默认 300 × 150，却被 CSS 放大；
- 价格源数据出现 `39.00` 这样的浮点元值；
- 禁用脚本后价格数据全部消失；
- Console 报 `getContext(...) is null` 后代码仍继续调用绘图方法；
- Network 出现收藏、预约、支付或登录请求；
- 文案把规则卡的 `sandbox` 描述为完整安全审计或服务端权限。

### 7.7 数据与安全边界

这个案例刻意保持简单：

- SVG data URL 只为避免新增素材文件，不是商品实拍；
- `srcdoc` 是开发者写死的可信教学文本，没有拼接用户输入；
- Canvas 数据从当前文档表格读取，只存在当前页面内存；
- 表格才是价格事实的可读基线，Canvas 是增强视图；
- `sandbox` 只限制嵌入文档的部分能力；
- 空 `sandbox` 不证明规则内容真实、合法、无欺骗或已经授权；
- `allow` 禁止设备权限，不等于用户已经登录；
- 页面没有后端，所以不能证明库存、预约、支付和成交状态。

## 8. 常见错误与排查路径

### 8.1 `srcdoc` 与 `src` 的优先级判断错误

**错误案例：**

```html
<iframe
  title="规则"
  src="rules.html"
  srcdoc="<p>临时规则</p>">
</iframe>
```

**错误判断：**先显示 `rules.html`，随后把临时规则叠加进去。

**实际机制：**支持 `srcdoc` 时，框架导航到 `about:srcdoc` 文档，`srcdoc` 优先。

**证据：**Elements 同时有两属性，但框内正文来自 `srcdoc`。

**修复：**只保留真实来源，或明确把 `src` 当作旧环境后备。

**复验：**记录地址、DOM 内容与预期一致。

### 8.2 用 `sandbox` 宣称完整安全

**错误案例：**

```html
<iframe
  title="用户发布的规则"
  sandbox
  srcdoc="这里直接拼接用户提交的 HTML">
</iframe>
```

**问题：**空 `sandbox` 会限制脚本等能力，但不会验证内容真实性，不会自动清洗所有危险标记，也不会防止社会工程。

**修复：**固定可信模板；真实用户 HTML 需要服务端与客户端共同执行可信内容策略、清洗、CSP 和来源隔离。

**复验：**安全说明准确描述每一层职责，不出现“仅靠 sandbox 已安全”。

### 8.3 同源内容同时放开脚本和来源

**错误案例：**

```html
<iframe
  title="不可信预览"
  src="/preview.html"
  sandbox="allow-scripts allow-same-origin">
</iframe>
```

**现象：**预览脚本拥有同源环境中的更多能力，沙箱隔离价值显著减弱。

**修复：**删除不必要令牌；若内容确需脚本，放在专用来源并使用最小权限和 CSP。

**复验：**写出每个保留令牌对应的必要用户任务。

### 8.4 把 `allow` 当成用户授权

**错误案例：**

```html
<iframe
  title="地图"
  src="map.html"
  allow="geolocation *; camera *; microphone *">
</iframe>
```

**问题：**策略范围过宽，而且“策略允许”不等于“用户同意”或“业务有权收集”。

**修复：**不需要的能力设为 `'none'`；需要时限定来源，并设计明确的用户授权和隐私说明。

**复验：**浏览器权限面板、响应头策略和 iframe `allow` 三者均符合预期。

### 8.5 iframe 空白时反复改 CSS

**现象：**框有尺寸，却显示拒绝页面或空白。

**错误方向：**不断修改 `z-index`、边框或 `sandbox`。

**证据路径：**

1. 新标签页可否打开目标；
2. Network 文档响应状态；
3. 响应头中的 CSP `frame-ancestors`；
4. `X-Frame-Options`；
5. Console 的拒绝嵌入消息。

**修复：**尊重目标策略，改为普通链接；若拥有服务端，再按最小来源列表调整响应头。

**复验：**链接可访问，页面不再承诺嵌入一定成功。

### 8.6 直接读取跨源 iframe DOM

**错误案例：**

```js
const frame = document.querySelector("#third-party-map");
console.log(frame.contentWindow.document.body.textContent);
```

**现象：**抛出跨源访问异常，或 `contentDocument` 不可用。

**原因：**显示跨源文档不等于脚本可以读取它。

**修复：**若双方都受控，使用校验来源和消息结构的 `postMessage()` 协议；否则不读取。

**复验：**父页不依赖第三方 DOM 结构，消息接收方检查 `event.origin`。

### 8.7 `object` 或 `embed` 没有普通链接

**错误案例：**

```html
<embed src="rules.pdf" type="application/pdf">
```

**现象：**某些环境只显示空白或下载提示，用户没有替代路径。

**修复：**在嵌入区域外提供描述清楚的 `a[href]`；使用 `object` 时也可在子内容中放回退链接。

**复验：**禁用内置 PDF 查看器后仍能打开资源。

### 8.8 图像映射缺少文字选择

**错误案例：**

```html
<img src="zones.png" alt="" usemap="#zones">
<map name="zones">
  <area shape="rect" coords="0,0,100,100" href="#lamp">
</map>
```

**问题：**整图无说明，热点无链接文本，也没有普通链接。

**修复：**为信息图写整图 `alt`，为每个带 `href` 的 `area` 写链接目的 `alt`，并增加普通链接列表。

**复验：**隐藏图片后，用户仍能理解并选择所有目的地。

### 8.9 内联 SVG 只有形状

**错误案例：**

```html
<svg viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40"></circle>
</svg>
```

**问题：**辅助技术无法从圆形推导业务含义。

**修复：**根元素增加 `role="img"` 和 `aria-labelledby`，添加 `title`、`desc`，复杂结论再写成可见文字。

**复验：**Accessibility 面板显示预期名称；关闭图形后正文仍有必要信息。

### 8.10 只用 CSS 放大 Canvas

**错误案例：**

```html
<canvas style="width: 1200px; height: 600px;"></canvas>
```

**现象：**图形和文字模糊。

**证据：**`canvas.width === 300`、`canvas.height === 150`，CSS 盒却大很多。

**修复：**按 CSS 尺寸和 DPR 设置位图属性，随后重新设置变换并完整重绘。

**复验：**属性像素数约为 CSS 尺寸乘以 DPR，缩放后边缘清楚。

### 8.11 Canvas 有图无数据

**错误案例：**

```html
<canvas id="prices"></canvas>
```

**问题：**图形不是可查询的数据结构。

**修复：**增加标题、摘要和真实表格；Canvas 只作为增强。

**复验：**禁用脚本仍可完成“比较三件商品价格”的任务。

### 8.12 跨源画布污染实验

文件位置：

```text
market-learning/
└── practice/
    └── html-09-embedding/
        └── canvas-origin-check.html
```

该实验需要网络，只用于观察失败边界。远程示例资源可能不可达；若发生网络错误，应与 `SecurityError` 分开记录。

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Canvas 来源检查</title>
  </head>
  <body>
    <h1>Canvas 来源检查</h1>
    <p>
      第一个按钮绘制跨源图片并尝试读取像素；第二个按钮改用当前页面生成的 Blob。
    </p>
    <button id="remote" type="button">测试跨源图片</button>
    <button id="local" type="button">恢复为同源生成图</button>
    <p id="result" role="status">尚未测试。</p>
    <canvas id="test-canvas" width="240" height="120">
      一块用于来源检查的测试画布。
    </canvas>

    <script>
      const canvas = document.querySelector("#test-canvas");
      const result = document.querySelector("#result");
      const remoteButton = document.querySelector("#remote");
      const localButton = document.querySelector("#local");
      const remoteUrl =
        "https://mdn.github.io/shared-assets/images/examples/rhino.jpg";

      function drawAndRead(sourceUrl, label, revokeAfterLoad = false) {
        const image = new Image();
        result.textContent = `${label}：正在加载。`;

        image.addEventListener("load", () => {
          canvas.width = 240;
          canvas.height = 120;
          const context = canvas.getContext("2d");

          if (!context) {
            result.textContent = `${label}：浏览器没有提供 2D 上下文。`;
            return;
          }

          context.drawImage(image, 0, 0, 240, 120);

          try {
            const pixel = context.getImageData(0, 0, 1, 1);
            const prefix = canvas.toDataURL("image/png").slice(0, 22);
            result.textContent =
              `${label}：读取成功，首像素红色通道为 ${pixel.data[0]}，` +
              `导出前缀为 ${prefix}。`;
          } catch (error) {
            result.textContent =
              `${label}：${error.name}。画面可以显示，但像素读取或导出被阻止。`;
          } finally {
            if (revokeAfterLoad) {
              URL.revokeObjectURL(sourceUrl);
            }
          }
        });

        image.addEventListener("error", () => {
          result.textContent =
            `${label}：图片网络加载失败，尚未进入画布读取步骤。`;
          if (revokeAfterLoad) {
            URL.revokeObjectURL(sourceUrl);
          }
        });

        image.src = sourceUrl;
      }

      remoteButton.addEventListener("click", () => {
        drawAndRead(remoteUrl, "跨源无 CORS 模式");
      });

      localButton.addEventListener("click", () => {
        const svg = [
          '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120">',
          '<rect width="240" height="120" fill="#f4f0e6"/>',
          '<circle cx="60" cy="60" r="35" fill="#d97745"/>',
          '<text x="110" y="68" font-size="20">同源生成图</text>',
          "</svg>",
        ].join("");
        const blob = new Blob([svg], { type: "image/svg+xml" });
        const objectUrl = URL.createObjectURL(blob);
        drawAndRead(objectUrl, "当前页面 Blob", true);
      });
    </script>
  </body>
</html>
```

#### 预期与失败分流

点击“测试跨源图片”后可能出现两类结果：

1. 图片加载成功，绘制成功，读取时报 `SecurityError`：这才是画布污染证据；
2. 图片网络加载失败：这是网络、证书、资源地址或策略问题，尚不能证明画布污染。

点击“恢复为同源生成图”后：

- 代码先重设尺寸，清空旧位图；
- 当前页面创建的 Blob 图像可绘制；
- `getImageData()` 与 `toDataURL()` 应成功；
- 结果文字显示首像素通道和 `data:image/png;base64,` 前缀。

#### 生产环境的 CORS 恢复

若必须绘制远程商品图片并读取像素：

1. 图片服务明确返回允许当前页面来源的 `Access-Control-Allow-Origin`；
2. JavaScript 在设置 `src` 前设置 `image.crossOrigin = "anonymous"`；
3. Network 中确认请求模式和响应头；
4. 图片加载后再绘制；
5. 同时调用 `getImageData()` 与 `toDataURL()` 复验；
6. 不支持 CORS 时，停止像素读取需求或把有权使用的资源迁到受控同源服务。

### 8.13 诊断与恢复记录

一次合格记录应区分“现象、证据、原因、修复、复验”：

```text
目标：导出价格图 PNG
现象：图像已经画出，但 toDataURL() 抛出 SecurityError
Network 证据：远程图片以跨源无 CORS 模式加载
Console 证据：SecurityError，画布不再 origin-clean
排除项：2D 上下文已获得；Canvas 宽高均为非零整数
根因：未经 CORS 授权的跨源像素被绘入 Canvas
修复：改用当前页面生成的 Blob 图；生产方案要求图片服务配置 CORS
复验：getImageData() 返回 ImageData；toDataURL() 返回 PNG data URL
剩余风险：尚未验证真实商品图片服务的 CORS 配置
```

不要用以下方式制造“恢复”：

- 删除 `getImageData()` 与 `toDataURL()`，然后声称导出成功；
- 吞掉异常并显示固定成功文案；
- 关闭浏览器安全策略；
- 安装来源不明的扩展绕过同源限制；
- 把任意远程 URL 转发到开放代理。

## 9. 课后题

### 9.1 理解题

1. `src` 与 `srcdoc` 同时存在时，现代浏览器优先使用哪一个？
2. `iframe[title]` 与框内文档的 `<title>` 是否承担同一职责？
3. `sandbox="allow-scripts"` 中的令牌是在增加限制还是解除限制？
4. 为什么 `allow="camera *"` 不等于用户已经授权摄像头？
5. 网站能在新标签页打开，为什么仍可能无法放入 iframe？
6. `object` 相比 `embed` 的直接回退优势是什么？
7. `img[alt]` 与 `area[alt]` 分别描述什么？
8. 外部 SVG 通过 `img` 显示时，为什么仍需要 HTML `alt`？
9. Canvas 的属性尺寸和 CSS 尺寸有什么不同？
10. 为什么画布被污染后仍能显示图像，却不能读取像素？

<details>
<summary>查看理解题答案</summary>

1. `srcdoc` 优先，`src` 可作为不支持 `srcdoc` 环境的后备。
2. 不完全相同。iframe 的 `title` 在父文档中标识这个嵌入框；框内 `<title>` 标识独立文档。
3. 解除限制。空 `sandbox` 施加限制，令牌按项放开能力。
4. `allow` 只决定权限策略是否允许能力进入后续授权流程，仍受响应头、安全上下文、设备和用户许可限制。
5. 目标响应可以使用 CSP `frame-ancestors` 或 `X-Frame-Options` 拒绝嵌入。
6. `object` 可以包含子内容，在资源不可用时提供说明和链接；`embed` 是空元素。
7. 图片 `alt` 描述整图在当前语境中的信息，`area[alt]` 描述某个热点链接的目的。
8. `img` 把外部 SVG 当成图像资源，父页不依赖其内部 DOM；文本替代由 `img[alt]` 提供。
9. 属性尺寸决定内部位图像素，CSS 尺寸决定页面显示盒；比例或密度不匹配会拉伸和模糊。
10. 浏览器允许跨源像素用于显示，但禁止脚本读回，以避免窃取其他来源的内容。

</details>

### 9.2 场景选择题

为以下需求选择 `img`、SVG、Canvas、`iframe`、`object` 或普通链接，可以组合使用：

1. 展示一张卖家拍摄的商品照片；
2. 展示可缩放的台灯部件图，并让 CSS 改变某个部件颜色；
3. 每秒重绘六十次、包含数千粒子的装饰动画；
4. 提供社区规则 PDF；
5. 展示第三方地图，但地图服务明确允许嵌入；
6. 访问一个明确拒绝被框入的外部帮助页。

<details>
<summary>查看场景题答案</summary>

1. 使用 `img`，提供符合语境的 `alt` 和固有尺寸。
2. 使用内联 SVG，因为需要逐元素样式和无损缩放。
3. Canvas 更适合高频像素绘制，但仍需处理性能、减少动画和替代信息。
4. 首先提供普通链接；可选增加 `object` 预览和回退内容。
5. 可以使用 `iframe`，同时提供地址或地图普通链接，设置准确 `title`、最小 `allow` 和适当 `referrerpolicy`。
6. 使用普通链接，不能用父页标记绕过目标服务器策略。

</details>

### 9.3 推理题：选择 SVG 还是 Canvas

邻里集市要展示一张只有 12 个节点的商品流转图。每个节点需要：

- 键盘聚焦；
- 可见文字；
- 独立样式；
- 点击后跳到页面章节；
- 放大后保持清晰。

答案标准：优先使用 HTML 链接配合内联 SVG，或使用可访问的 SVG 链接结构，并保留普通链接。节点数量少、需要逐元素交互和语义，不需要 Canvas 的像素吞吐。若选择 Canvas，必须额外实现焦点映射、键盘行为、命中测试和语义替代，成本明显更高。

### 9.4 故障推理题

开发者写了：

```js
const image = new Image();
image.src = "https://cdn.example/lamp.png";
image.addEventListener("load", () => {
  context.drawImage(image, 0, 0);
  console.log(canvas.toDataURL());
});
```

图片正常显示，但导出抛 `SecurityError`。只把 `image.crossOrigin = "anonymous"` 加在 `image.src = ...` 之后是否可靠？为什么？

<details>
<summary>查看故障题答案</summary>

不可靠。跨源模式必须在发起请求前确定，因此应先设置 `crossOrigin`，再设置 `src`。同时服务器必须返回允许当前来源的 CORS 响应头；客户端属性不能单方面授权。

</details>

## 10. 实践练习

### 10.1 基础：规则卡与 SVG 商品图

文件位置：

```text
practice/html-09-embedding/basic.html
```

要求：

- 创建完整 HTML 文档；
- 添加一个静态规则 `iframe`；
- 提供准确 `title`、空 `sandbox`、`referrerpolicy="no-referrer"`；
- 使用 `allow` 禁止摄像头、麦克风和地理位置；
- 规则在 `srcdoc` 中，不含脚本、表单和外部资源；
- 父页提供可见规则摘要；
- 添加一个内联 SVG 自行车结构图；
- SVG 有 `viewBox`、`role="img"`、`title`、`desc` 和 `aria-labelledby`；
- 图后有一段可见文字说明。

答案标准：

- iframe 与 SVG 在 Accessibility 面板都有可区分名称；
- 禁用脚本不影响核心信息；
- Network 没有业务请求；
- 文案明确说明 `sandbox` 不是完整安全方案；
- SVG 200% 放大后边缘清晰。

### 10.2 提升：整数分价格图与技术选型

文件位置：

```text
practice/html-09-embedding/advanced.html
```

要求：

- 准备至少四件固定教学商品；
- 价格源值使用非负整数分；
- 先写带 `caption`、列标题和行标题的价格表；
- 再用 Canvas 绘制价格柱；
- 按 CSS 尺寸和 `devicePixelRatio` 设置位图；
- 页面尺寸变化时完整重绘；
- 图表有标题和趋势摘要；
- 在代码注释中说明为什么这里使用 Canvas；
- 再说明若只有四个静态柱，为什么 SVG 也可能更简单。

答案标准：

- Canvas 属性尺寸约等于 CSS 尺寸乘 DPR；
- 修改一个表格 `data-price-cents` 后，图表与表格通过同一读取路径保持一致；
- 禁用脚本后表格和摘要仍可用；
- 能比较 Canvas 和 SVG 的维护成本，而不是声称 Canvas 总是更快。

### 10.3 故障注入：跨源图片与嵌入拒绝

文件位置：

```text
practice/html-09-embedding/fault-record.md
```

这个记录文件属于你的个人练习，不是本课程仓库交付物。

执行两次故障：

1. 运行 8.12 的跨源画布实验，区分网络失败与 `SecurityError`；
2. 选择一个你有权测试、且明确设置 `frame-ancestors` 或 `X-Frame-Options` 的页面，尝试嵌入并观察拒绝。

每次按以下格式记录：

```text
目标：
操作：
预期：
实际现象：
Elements 证据：
Network/响应头证据：
Console 证据：
根因：
最小修复：
复验结果：
未验证范围：
```

答案标准：

- 不把远程图片 404 写成画布污染；
- 不把 iframe 的 CSS 尺寸问题写成服务器拒绝；
- 能指出 `SecurityError`、CORS 响应头、`frame-ancestors` 或 `X-Frame-Options` 中的直接证据；
- 恢复方案不关闭浏览器安全策略；
- iframe 被拒绝时提供普通链接；
- 不能控制目标服务时，明确记录“无法由父页修复”。

### 10.4 综合：六选一设计说明

对以下每项写出首选技术和一项拒绝理由：

| 内容 | 候选 |
| --- | --- |
| 商品实拍 | `img` / SVG / Canvas |
| 可换色的产品结构图 | 外部 `img` SVG / 内联 SVG / Canvas |
| 每帧变化的粒子背景 | SVG / Canvas |
| 外部帮助中心 | `iframe` / `object` / 普通链接 |
| PDF 质检报告 | `object` / `embed` / 普通链接 |
| 商品分区导航 | 图像映射 / 内联 SVG 链接 / 普通链接 |

完成标准：每项都根据文档边界、语义、键盘、跨源、性能和回退作答，不以“我更熟悉”作为唯一理由。

## 11. 阶段验收

### 11.1 结构与功能

- [ ] 页面使用完整 HTML 文档骨架；
- [ ] 每个 iframe 都有能区分用途的 `title`；
- [ ] 能解释 `srcdoc` 对 `src` 的优先级；
- [ ] 非关键 iframe 才使用 `loading="lazy"`；
- [ ] `referrerpolicy` 与真实信息暴露需求一致；
- [ ] 每个 `sandbox` 令牌都有必要能力依据；
- [ ] `allow` 没有开放未使用的设备能力；
- [ ] 外部文档有普通链接恢复路径；
- [ ] 图像映射的 `usemap` 与 `map[name]` 一致；
- [ ] 每个链接热点都有明确 `alt`；
- [ ] 图像映射旁有普通链接；
- [ ] 内联 SVG 有可访问名称和说明；
- [ ] Canvas 属性尺寸与 CSS 尺寸经过明确配置；
- [ ] DPR 改变或窗口变化后会重绘；
- [ ] 价格源值使用整数分；
- [ ] Canvas 后有可见摘要和语义表格。

### 11.2 安全与边界

- [ ] 不声称 `sandbox` 单独保证内容安全；
- [ ] 不声称 `allow` 等于用户授权；
- [ ] 不尝试绕过 `frame-ancestors` 或 `X-Frame-Options`；
- [ ] 不直接读取跨源 iframe DOM；
- [ ] 不把 CORS 与 frame denial 混为一谈；
- [ ] 画布读取异常使用 `try...catch` 记录；
- [ ] 能区分网络失败和 tainted canvas；
- [ ] 不使用关闭浏览器安全策略作为修复；
- [ ] 页面明确是静态或当前内存教学状态；
- [ ] 页面不宣称存在登录、授权、支付、持久化或真实库存。

### 11.3 无障碍与降级

- [ ] 只用键盘可以完成所有导航；
- [ ] 隐藏商品分区图后仍有完整文字链接；
- [ ] 隐藏 SVG 后仍有必要文字说明；
- [ ] 禁用 JavaScript 后仍能读取价格；
- [ ] Canvas 标题、摘要与数据表传达同等核心事实；
- [ ] 不把颜色作为区分价格高低的唯一方式；
- [ ] 在目标浏览器的 Accessibility 面板检查过名称。

### 11.4 提交证据

```text
练习文件路径：
打开方法：
浏览器与版本：
iframe 可访问名称：
sandbox 保留令牌及理由：
allow 策略：
图像映射键盘结果：
普通链接替代：
SVG 名称与描述：
Canvas 位图尺寸：
Canvas CSS 尺寸：
devicePixelRatio：
禁用脚本结果：
跨源失败证据：
恢复与复验：
Network 请求范围：
未验证浏览器或辅助技术：
```

只有完成标准和相关验证通过后，才能把本课标记为完成。未在真实屏幕阅读器、其他浏览器或目标服务上验证的内容，应明确写入未验证范围。

## 12. 常见问题

### Q1：`iframe` 的 `title` 会显示在页面上吗？

通常不会像普通标题一样可见，但它为辅助技术和检查工具提供嵌入框名称。页面仍应有可见小节标题和上下文。

### Q2：`srcdoc` 可以放完整 HTML 吗？

可以。它表示一份独立文档。属性值中的引号、`&` 等字符需要按 HTML 属性和内层 HTML 两次解析的边界正确编码。不要手工拼接不可信内容。

### Q3：空 `sandbox` 是否意味着绝对安全？

不是。它施加一组浏览上下文限制，但不验证内容真实性，不替代清洗、CSP、来源隔离、服务端鉴权和用户判断。

### Q4：为什么不总是加 `allow-same-origin`？

没有它时，沙箱内容使用特殊不透明源，这正是重要限制之一。只有明确依赖来源身份且理解影响时才放开；与 `allow-scripts` 用在同源不可信内容上尤其危险。

### Q5：`allow="camera 'none'"` 和浏览器权限弹窗有什么关系？

权限策略先决定该能力是否可以在框内使用。设为 `'none'` 时通常不会进入授权流程；策略允许时，也仍可能需要用户许可和安全上下文。

### Q6：CORS 能解决 iframe 被拒绝吗？

不能。iframe 嵌入许可主要看 CSP `frame-ancestors` 和 `X-Frame-Options`；CORS 主要控制脚本读取跨源网络响应。

### Q7：同域名不同端口算同源吗？

不算。源比较协议、主机和端口。端口不同就是不同源。

### Q8：图像映射是否天然支持响应式图片？

不能这样假设。坐标是具体数值，图片显示尺寸和裁剪变化可能让热点与视觉区域不一致。应在目标尺寸实测，并始终提供普通链接。

### Q9：可以把链接直接放进内联 SVG 吗？

可以，但仍需设计可访问名称、焦点顺序、可见焦点样式和普通链接恢复路径。少量页面导航通常先用 HTML 链接更简单。

### Q10：为什么外部 SVG 的内部 `title` 不能替代 `img[alt]`？

通过 `img` 引用时，父页面把 SVG 当作图像资源，不依赖内部 DOM 来建立父文档中的文本替代。应在 `img` 上写符合当前语境的 `alt`。

### Q11：Canvas 里写了回退文字，还需要外部表格吗？

数据图通常需要。Canvas 子内容主要在 Canvas 不受支持等情况下作为回退，不能保证在图形正常绘制时形成完整、易发现的数据体验。可见表格和摘要更可靠。

### Q12：为什么重设 `canvas.width` 后图消失？

设置 `width` 或 `height` 会重建位图并重置绘图状态。响应式重绘应按“设尺寸、设变换、完整绘制”的顺序执行。

### Q13：`toDataURL()` 与 `toBlob()` 应选哪一个？

小型教学验证可以用 `toDataURL()`。大图或真实导出通常优先异步 `toBlob()`，避免构造很长的内存字符串；两者都不能读取污染画布。

### Q14：给图片设置 `crossOrigin="anonymous"` 就一定能导出吗？

不一定。它必须在 `src` 前设置，而且图片服务器必须返回匹配的 CORS 响应头。否则图片可能直接加载失败。

### Q15：为什么本地同目录文件也可能报跨源问题？

`file://` 源行为具有实现差异，现代浏览器常把本地文件视为不透明源。需要稳定同源行为时应使用受控本地 HTTP 服务，但本课核心页面不依赖这种互读。

## 13. 扩展阅读

资料与兼容性说明核验日期：2026-10-10。HTML Living Standard 在核验时分别显示 2026-10-05 至 2026-10-09 的近期更新日期；MDN 页面用于补充可操作说明，最终语义以规范和目标浏览器实测为准。

- [WHATWG：iframe、embed 与 object](https://html.spec.whatwg.org/multipage/iframe-embed-object.html)：核对 `srcdoc` 优先级、`sandbox` 令牌、`allow`、`loading`、`referrerpolicy` 及元素内容模型。
- [WHATWG：图像映射](https://html.spec.whatwg.org/multipage/image-maps.html)：核对 `map`、`area`、`shape`、`coords` 和 `alt` 要求。
- [WHATWG：Canvas](https://html.spec.whatwg.org/multipage/canvas.html)：核对默认 300 × 150 位图、尺寸重置、回退内容、origin-clean 与导出安全。
- [MDN：iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)：查看无障碍命名、沙箱令牌、同源脚本边界和嵌入 PDF 的实践说明。
- [MDN：同源策略](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)：核对协议、主机、端口三元组与跨源窗口访问限制。
- [MDN：Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Permissions_Policy)：理解响应头与 iframe `allow` 的叠加关系。
- [MDN：CSP `frame-ancestors`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)：核对被嵌入页面如何限制祖先来源。
- [MDN：X-Frame-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options)：理解 `DENY` 与 `SAMEORIGIN`。
- [MDN：在 HTML 中使用 SVG](https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_in_HTML)：核对内联 SVG、`role="img"`、`title` 和 `desc`。
- [MDN：优化 Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)：查看高像素密度屏幕缩放方法。
- [MDN：`getImageData()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData)：核对返回值、尺寸异常和污染画布的 `SecurityError`。
- [MDN：允许跨源图片用于 Canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)：核对 `crossOrigin` 与服务端 CORS 的共同要求。

阅读时重点检查四组边界：

1. 能显示与能读取是否被混为一谈；
2. 浏览器限制与服务端授权是否被混为一谈；
3. 像素清晰度与内容可访问性是否被混为一谈；
4. 可视化增强与核心数据是否仍然可以独立访问。

## 我现在能做到什么

我能根据内容是否是独立文档、几何链接、矢量结构或像素绘制，选择 `iframe`、`object`、图像映射、SVG、Canvas 或普通链接。我能为 iframe 收紧能力并识别服务端拒绝嵌入，能为图像映射和图表保留键盘与文字替代，也能用尺寸、DPR、CORS 和 `SecurityError` 证据定位 Canvas 模糊与污染问题，而不会把 `sandbox` 误写成完整安全保证。

## 单元导航

- [上一课：音频、视频与字幕轨道](02-audio-video-tracks.md)
- [返回第三章入口](../03-images-media-embedding.md)
- [下一章：表格与二维数据](../04-tables-data.md)
- [返回 HTML 模块](../README.md)
