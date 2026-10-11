# 嵌入文档、安全边界与图像映射

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 选择 iframe、object、embed 或图像映射，并解释 sandbox、权限策略、同源与嵌入拒绝。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `MED-011`、`MED-012`、`MED-013` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

选择 iframe、object、embed 或图像映射，并解释 sandbox、权限策略、同源与嵌入拒绝。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 MED-011（`iframe`、`object`、`embed`）、MED-012（sandbox、allow、同源与嵌入拒绝）、MED-013（`map`、`area` 与文本替代）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

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
- 不依赖浏览器附加运行时；优先使用标准媒体、普通文档链接或应用自身实现。

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

本章的完整项目代码集中在 [SVG、Canvas 与可访问图形](08-svg-canvas-graphics.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 MED-011（`iframe`、`object`、`embed`） 对应的元素、属性或状态；
- 在项目中实现并标出与 MED-012（sandbox、allow、同源与嵌入拒绝） 对应的元素、属性或状态；
- 在项目中实现并标出与 MED-013（`map`、`area` 与文本替代） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`08-svg-canvas-graphics.md`](08-svg-canvas-graphics.md)。

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

### 10.2 故障注入：跨源图片与嵌入拒绝

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

- 能解释并验证：选择 iframe、object、embed 或图像映射，并解释 sandbox、权限策略、同源与嵌入拒绝。
- `MED-011`：`iframe`、`object`、`embed`
- `MED-012`：sandbox、allow、同源与嵌入拒绝
- `MED-013`：`map`、`area` 与文本替代
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：文本轨道、WebVTT 与媒体可访问性](06-media-text-tracks-webvtt.md) · [下一课：SVG、Canvas 与可访问图形](08-svg-canvas-graphics.md) · [返回 HTML 模块](../README.md)
