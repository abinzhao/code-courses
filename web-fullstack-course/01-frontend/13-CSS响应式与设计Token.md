# 13-CSS 响应式与设计 Token

## 目标

完成本知识单元后，学员应能不依赖任何 UI 框架，独立完成一套"一套代码、多端可用"的响应式样式系统，并能用设计 Token 统一团队的视觉语言。

学员应能够：

1. 按移动优先（Mobile First）的思路组织样式，正确设置视口，解释为什么从窄屏开始写更稳妥。
2. 熟练使用媒体查询与容器查询，区分"视口断点"与"容器断点"的适用场景。
3. 使用流式单位、`clamp()`、弹性网格与响应式图片，让布局和排版在任意宽度下都不溢出、不跳动。
4. 设计并实现颜色、间距、字号、圆角、阴影五类基础 Token，并用 CSS 变量在整个项目中复用。
5. 实现跟随系统与手动切换两种暗色模式，理解 `prefers-color-scheme` 与变量覆盖的协作方式。
6. 按可维护的方式组织 CSS 文件，处理响应式表格、触控目标尺寸等真实业务细节。

本单元只覆盖原生 CSS 能力。CSS 预处理器、CSS-in-JS、Tailwind 原子化方案与框架级主题系统在后续工程化单元中展开。

## 技术栈

本单元不使用前端框架和第三方 npm 包，全部使用浏览器当前稳定版本原生支持的 CSS 特性。

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Chrome 或 Chromium 系浏览器当前稳定版 | 验证响应式效果 | 能用设备模拟器切换视口宽度、DPR 与触控模式 |
| Safari、Firefox 当前稳定版 | 跨浏览器验证 | 能识别特性支持差异，会查询特性兼容性 |
| 原生 HTML 与 CSS | 编写页面与样式 | 理解外部样式表、`<style>` 与行内样式的优先级 |
| CSS 自定义属性（CSS 变量） | 承载设计 Token | 能定义、读取、覆盖变量并理解其继承性 |
| Chrome DevTools Elements 面板 | 观察盒模型与变量 | 能在面板中临时修改变量并实时观察效果 |
| VS Code 与 Live Preview 类工具 | 本地开发预览 | 能在本地直接打开页面，不依赖构建工具 |

版本约定：

- 所有特性以各浏览器"当前稳定版"支持为准，不在文档中写死小版本号。
- 容器查询、`:has()`、嵌套规则等较新特性，使用前应在公开特性兼容表中确认目标浏览器支持情况，并准备降级写法。
- 练习在不支持个别新特性的浏览器中，必须保证核心内容与基础布局仍然可用。

开始前检查：

```text
1. 浏览器地址栏输入 about:version，确认浏览器为近期更新版本。
2. 打开 DevTools，确认能进入设备模拟模式（手机图标或快捷键）。
3. 准备一个空白目录，能直接创建 index.html 与 styles.css。
```

## 详细的理论知识讲解和示例伪代码

### 1. 移动优先与视口基础

#### 定义

移动优先是一种样式编写策略：先为最小的屏幕（通常是手机）编写基础样式，再用"最小宽度"媒体查询，逐步为更宽的屏幕追加增强样式。

视口（viewport）是浏览器用来渲染页面的可视区域。手机浏览器默认会按一个较宽的"布局视口"（约 980px）渲染页面再缩小显示，导致不做适配的网页在手机上字很小。`<meta name="viewport">` 的作用是告诉浏览器：用设备的实际宽度作为布局宽度，初始缩放比例为 1，不要先按 980px 渲染再缩小。

#### 与 Web 的关系

今天的 Web 流量中移动设备占比很高，企业项目通常要求页面在 320px 到 2560px 的宽度区间内都能正常阅读。移动优先带来两个实际好处：

- 基础样式就是最克制的版本——单列、少装饰，窄屏天然不会被复杂布局撑破。
- 增强样式写在 `min-width` 查询里，老版本浏览器即使不理解查询，也能拿到可用的基础布局，降级方向更安全。

基础 HTML 与 CSS：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>响应式卡片墙</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
    <header class="site-header">
      <h1>知行周刊</h1>
      <nav class="site-nav">
        <a href="#latest">最新</a>
        <a href="#topics">专题</a>
        <a href="#about">关于</a>
      </nav>
    </header>
    <main class="card-wall">
      <article class="card"><h2>流式排版</h2><p>文字随容器宽度变化。</p></article>
      <article class="card"><h2>弹性网格</h2><p>卡片自动换行重排。</p></article>
      <article class="card"><h2>触控友好</h2><p>点击区域足够大。</p></article>
    </main>
  </body>
</html>
```

```css
/* 基础样式：默认就是窄屏单列，不写在任何媒体查询里 */
body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  line-height: 1.6;
}

.site-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.card-wall {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  padding: 16px;
}

/* 宽屏增强：视口达到 768px 及以上时生效 */
@media (min-width: 768px) {
  .site-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .card-wall {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 更宽的屏幕：三列 */
@media (min-width: 1024px) {
  .card-wall {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

对比一下桌面优先的写法差异：

```text
桌面优先：先写多列，再用 max-width 在窄屏里"拆掉"
  风险：漏写一条 max-width，窄屏就出现横向滚动条

移动优先：先写单列，再用 min-width 在宽屏里"加上"
  好处：每一级增强都是叠加，基础层永远可用
```

#### 常见误区

> 加了 viewport 的 meta 标签，页面就自动响应式了。

meta 标签只解决"按真实宽度渲染"的问题。如果 CSS 里写死了 `width: 1200px`，手机上照样横向溢出。响应式还需要流式布局、流式单位和断点配合。

> `initial-scale=1.0` 之后用户就不能缩放页面了。

它只设定初始缩放比例。禁止用户缩放需要额外设置 `maximum-scale=1` 或 `user-scalable=no`，这会损害低视力用户的访问能力，生产环境不应这样做。

### 2. 媒体查询与断点策略

#### 定义

媒体查询（Media Query）根据设备或视口的特征（宽度、高度、方向、分辨率、配色偏好等）有条件地应用样式。断点（breakpoint）是人为约定的宽度分界值，到达该值时布局发生一次明显调整。

#### 与 Web 的关系

断点不应以"某款手机的具体宽度"为依据，因为设备型号无穷多。成熟做法是按内容设定断点：不断拖动浏览器变窄，当布局开始难看、文字行宽过长或按钮挤在一起时，那个宽度就是需要的断点。常见的工程参考值为：约 576px 以下为小手机区间、768px 附近为平板竖屏、1024px 附近为平板横屏或小笔记本、1440px 以上为桌面显示器。

媒体查询的多种条件写法：

```css
/* 视口宽度至少 768px */
@media (min-width: 768px) {
  .hero { padding-inline: 32px; }
}

/* 横屏手机：宽度方向的视口小于高度方向时不应用，反之应用 */
@media (orientation: landscape) and (max-height: 500px) {
  .hero { padding-block: 8px; }
}

/* 高分辨率屏幕（Retina 等）上使用更精细的图片或更细的边框 */
@media (min-resolution: 2dppx) {
  .logo { border-width: 0.5px; }
}

/* 两个断点之间：平板宽度区间 */
@media (min-width: 768px) and (max-width: 1023px) {
  .aside { display: none; }
}
```

把断点也抽象成 Token，避免每个文件各写各的数字：

```css
:root {
  /* 断点只作为团队约定记录；CSS 变量不能直接用进 @media，需在查询里写数值 */
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1440px;
}
```

```text
注意当前 CSS 规则：
  @media (min-width: var(--breakpoint-md))   /* 大多数浏览器不支持这样写 */
  @media (min-width: 768px)                  /* 数值直接写，变量值仅作文档约定 */
```

还可以按用户的系统偏好查询，而不仅是宽度：

```css
/* 用户系统开启"减少动态效果"时，关闭非必要动画 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### 常见误区

> 断点越多越精细，响应式做得越好。

断点过多会让样式难以预测和维护。通常 3 到 5 个覆盖手机、平板、桌面的断点足以应对绝大多数产品，断点之间的连续性靠流式单位和弹性网格保证。

> 用 `max-width` 和 `min-width` 混着写无所谓。

混用会让层叠顺序难以追踪。移动优先项目中应统一使用 `min-width`，并按断点从小到大排列，只在极少数"只在中间区间生效"的场景补充 `max-width`。

### 3. 容器查询与组件级响应式

#### 定义

容器查询让组件根据"自己所在容器"的宽度而不是"整个视口"的宽度来改变样式。一个卡片放在宽边栏里可以横向展开，放在窄页脚里自动变成紧凑纵向样式，而组件代码完全相同。

使用容器查询分两步：在父元素上声明"我是一个可被查询的容器"，在子组件上用 `@container` 查询容器尺寸。

#### 与 Web 的关系

媒体查询回答的是"设备多宽"，容器查询回答的是"给我的空间多大"。在组件复用度高的设计系统里，同一个卡片可能出现在正文、侧边栏、弹窗、抽屉等多种宽度的容器中。过去只能用 JavaScript 监听或写多套类名，现在容器查询让组件真正做到"自带响应式"。

容器查询的完整写法：

```html
<div class="layout">
  <section class="content">
    <article class="profile-card">
      <img class="avatar" src="./avatar.svg" alt="用户头像" />
      <div class="profile-meta">
        <h3>林晓</h3>
        <p>前端工程师，关注设计工程化</p>
        <button type="button">关注</button>
      </div>
    </article>
  </section>
  <aside class="sidebar">
    <article class="profile-card">
      <img class="avatar" src="./avatar.svg" alt="用户头像" />
      <div class="profile-meta">
        <h3>林晓</h3>
        <p>前端工程师</p>
        <button type="button">关注</button>
      </div>
    </article>
  </aside>
</div>
```

```css
/* 声明容器：container-type 表示容器的尺寸变化可被查询 */
.content,
.sidebar {
  container-type: inline-size;
}

/* 卡片默认按窄容器设计：头像与文字上下排列 */
.profile-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
}

/* 容器宽度至少 420px 时：头像与文字横向排列 */
@container (min-width: 420px) {
  .profile-card {
    grid-template-columns: 64px 1fr;
    align-items: center;
  }

  .avatar {
    width: 64px;
    height: 64px;
  }
}

.content { container-name: main-area; }

/* 只在名为 main-area 的容器里生效的查询 */
@container main-area (min-width: 600px) {
  .profile-card {
    padding: 24px;
  }
}
```

容器查询单位与选择器配合：

```css
/* cqw：容器宽度的 1%。标题随容器宽度平滑变化，不需要断点 */
.profile-meta h3 {
  font-size: clamp(1rem, 5cqw, 1.5rem);
}
```

```text
媒体查询 vs 容器查询决策：
  页面级骨架（导航是否折叠、整体栏数）        → 媒体查询
  可复用组件内部布局（卡片方向、字号、显隐）   → 容器查询
  两者经常同时使用，不是二选一
```

#### 常见误区

> 有了容器查询就不需要媒体查询了。

页面整体骨架、视口方向、系统配色偏好等信息只有媒体查询能提供。组件内部优先容器查询，页面骨架仍用媒体查询。

> 在任何元素上写 `@container` 都能生效。

必须先在祖先元素上声明 `container-type`，否则查询会一路向上找到更外层的容器，甚至直接按视口表现，得到意料之外的结果。

### 4. 流式单位、clamp 与弹性排版

#### 定义

流式单位让尺寸不再是固定像素，而是与视口、容器或根字号联动：

- `%`：相对父元素同方向尺寸。
- `rem`：相对根元素（`<html>`）字号，默认浏览器设置下 1rem 约为 16px。
- `em`：相对当前元素字号，用于组件内部需要随字号缩放的间距。
- `vw` / `vh`：视口宽度 / 高度的 1%。
- `dvh` / `svh` / `lvh`：动态视口高度族，解决手机浏览器地址栏伸缩导致 `vh` 不准的问题。
- `fr`：Grid 容器中剩余空间的分配单位。
- `cqw` 等容器查询单位：相对容器尺寸。

`clamp(最小值, 理想值, 最大值)` 接收三个参数，浏览器在理想值变化时把结果限制在最小与最大之间，是实现"平滑流式排版"的核心函数。

#### 与 Web 的关系

固定像素只能在某个宽度下完美。流式单位让页面在两个断点之间也平滑变化，减少"非黑即白"的跳变。配合 `clamp()`，标题字号、区块内边距都可以随视口连续缩放，同时被限制在可读范围内。

单位与 clamp 的实际用法：

```css
:root {
  /* 根字号不写死，尊重用户的浏览器字号设置；这是 rem 可访问性的基础 */
  font-size: 100%;
}

body {
  /* 正文用 rem：用户调大系统字号时，全站文字一起放大 */
  font-size: 1rem;
}

h1 {
  /* 最小 1.75rem，理想值随视口变化，最大 3rem，中间无需任何断点 */
  font-size: clamp(1.75rem, 4vw + 1rem, 3rem);
  line-height: 1.2;
}

h2 {
  font-size: clamp(1.375rem, 2vw + 0.75rem, 2rem);
}

.section-pad {
  /* 内边距同样流式：窄屏 16px，宽屏平滑增加到 64px */
  padding-block: clamp(1rem, 4vw, 4rem);
  padding-inline: clamp(1rem, 6vw, 6rem);
}

.hero {
  /* 用动态视口高度：手机地址栏显示时取小值，隐藏后自动占满 */
  min-height: 70dvh;
  display: grid;
  place-items: center;
}

.card-wall {
  display: grid;
  /* auto-fill + minmax：列数随宽度自动增减，不需要媒体查询 */
  grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr));
  gap: clamp(1rem, 2vw, 2rem);
}
```

保证长单词和长链接不撑破容器：

```css
.card p {
  overflow-wrap: break-word;
  hyphens: auto;
}
```

限制正文行宽，保证阅读舒适度：

```css
.article-body {
  /* 约 65 个字符一行；ch 单位是当前字体下字符 0 的宽度 */
  max-width: 65ch;
  margin-inline: auto;
}
```

```text
单位选择速查：
  全局字号、组件尺寸       → rem
  需要随当前字号缩放的间距 → em
  列分配、剩余空间         → fr
  全屏区块高度             → dvh
  平滑变化但要上下限       → vw/cqw 配合 clamp
```

#### 常见误区

> 用 `vw` 直接做正文字号，字会一直随视口变大变小。

没有上下限的流式值在超大屏上会大得离谱、小屏上小得看不清。正文与标题都应交给 `clamp()` 兜底，而不是裸用 `vw`。

> 把根字号写成 `font-size: 62.5%` 之类的值再用 rem，换算更方便。

这会破坏用户在浏览器里设置的默认字号习惯，也容易让不熟悉约定的人算错尺寸。保持根字号为 100%，用设计 Token 管理 rem 值即可。

### 5. 响应式图片、媒体与表格

#### 定义

响应式图片指根据设备宽度、分辨率（DPR）或网络情况，让浏览器选择合适尺寸的图片资源；响应式表格是指在列多、空间窄时仍能让数据完整可读的表格处理方案。

#### 与 Web 的关系

图片往往是页面上最大的资源。给 375px 的手机下载一张 3000px 宽的图片，既浪费流量又拖慢首屏。HTML 原生的 `srcset` 与 `sizes` 让浏览器自己选择，不需要 JavaScript。宽表格在手机上则是经典重灾区，必须有明确的窄屏策略，而不是任其溢出产生横向滚动。

响应式图片的三种典型用法：

```html
<!-- 1. 同一画面，按宽度或 DPR 选不同尺寸 -->
<img
  src="./hero-800.jpg"
  srcset="./hero-400.jpg 400w, ./hero-800.jpg 800w, ./hero-1600.jpg 1600w"
  sizes="(min-width: 1024px) 800px, 100vw"
  width="800"
  height="450"
  alt="周刊编辑部工作场景"
/>

<!-- 2. 宽屏用横构图，窄屏用竖构图：艺术指导 -->
<picture>
  <source media="(min-width: 768px)" srcset="./wide-banner.jpg" />
  <img src="./square-banner.jpg" alt="周刊封面" width="800" height="800" />
</picture>

<!-- 3. 现代格式优先，旧浏览器回退 -->
<picture>
  <source type="image/avif" srcset="./cover.avif" />
  <source type="image/webp" srcset="./cover.webp" />
  <img src="./cover.jpg" alt="周刊封面" width="800" height="450" loading="lazy" />
</picture>
```

```css
/* 图片永不超出容器，并按比例缩放，避免加载后把布局顶开 */
img,
video {
  max-width: 100%;
  height: auto;
  display: block;
}
```

宽表格的窄屏策略：让表格内部滚动，而不是整页滚动：

```html
<div class="table-scroll">
  <table class="data-table">
    <thead>
      <tr>
        <th>期号</th><th>标题</th><th>作者</th><th>标签</th><th>发布日期</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>第 42 期</td><td>容器查询实战</td><td>林晓</td><td>CSS</td><td>2026-09-30</td>
      </tr>
    </tbody>
  </table>
</div>
```

```css
.table-scroll {
  /* 只让表格区域横向滚动，页面本身不出现横向滚动条 */
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.data-table {
  width: 100%;
  min-width: 560px; /* 低于这个宽度就触发容器内滚动 */
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}
```

另一种方案：窄屏下把每行表格"变成"一张卡片（用标签属性承载表头）：

```css
@media (max-width: 599px) {
  .data-table thead {
    position: absolute;
    clip: rect(0 0 0 0); /* 视觉上隐藏表头，但读屏器仍可读 */
  }

  .data-table tr {
    display: block;
    margin-bottom: 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 8px;
  }

  .data-table td {
    display: flex;
    justify-content: space-between;
    white-space: normal;
  }

  .data-table td::before {
    content: attr(data-label); /* 从 HTML 属性读取列名 */
    font-weight: 600;
    color: var(--color-text-muted);
  }
}
```

对应单元格写法为 `<td data-label="标题">容器查询实战</td>`。

#### 常见误区

> 只在 CSS 里把图片设成 `width: 100%` 就完成响应式图片了。

视觉缩放不等于资源合理。手机仍会下载原图，流量和首屏时间没有节省。尺寸选择必须靠 `srcset` 和 `sizes` 在 HTML 层解决。

> 表格在手机上出现横向滚动，让用户滚着看就行。

如果横向滚动发生在整页层面，用户很容易误以为页面到此结束。应把滚动限制在表格容器内，并提供视觉提示（如边缘阴影或裁切），或改用卡片式布局。

### 6. 触控目标与交互可达性

#### 定义

触控目标是用户用手指点击的可交互元素（按钮、链接、表单项）的可点区域尺寸。手指触控的精度远低于鼠标指针，目标过小或过近都会导致误触。

#### 与 Web 的关系

主流可达性指南建议触控目标至少约 44×44 逻辑像素，相邻目标之间留出间距。企业移动端页面中，图标按钮、链接列表、表单控件是最容易不达标的三类。同时要保证键盘焦点可见、`:hover` 不是唯一交互反馈，因为触屏设备没有悬停状态。

触控目标与焦点样式：

```css
.nav-link,
.icon-button {
  /* 用内边距而不是固定宽高撑大可点区域，文字变长也不会挤破 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  padding-inline: 12px;
  border-radius: var(--radius-sm);
  color: inherit;
  text-decoration: none;
}

.icon-button {
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

/* 不能只靠 hover 给出反馈：触屏没有 hover */
.nav-link:active,
.nav-link:focus-visible {
  background: var(--color-surface-muted);
}

/* 键盘焦点必须清晰可见；不要用 outline: none 后什么都不补 */
:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

/* 鼠标用户不显示焦点框，键盘用户显示：现代浏览器已支持 :focus-visible */
button:focus:not(:focus-visible) {
  outline: none;
}
```

表单控件的可点区域应包含标签：

```html
<div class="field">
  <input type="checkbox" id="agree" />
  <label for="agree">我已阅读并同意周刊订阅条款</label>
</div>
```

```css
.field {
  display: flex;
  gap: 8px;
  align-items: center;
  min-height: 44px; /* 整行都便于点击 */
}

.field input[type="checkbox"] {
  width: 20px;
  height: 20px;
}
```

```text
触控自查清单：
  1. 所有可点元素 min-height 达到约 44px？
  2. 图标按钮有没有文字替代或 aria-label？
  3. 相邻可点元素之间是否留了至少 8px？
  4. 纯键盘能否完成全部操作，焦点是否始终可见？
```

#### 常见误区

> 链接是文字，点击区域由文字大小决定，改不了。

把链接变成 `inline-flex` 并用内边距撑高，视觉上仍是那几个字，但可点区域可以扩大到整行。

> 全局写 `outline: none` 让页面更美观。

这会让键盘用户完全不知道自己聚焦在哪里。可以用 `:focus-visible` 只在键盘导航时显示焦点框，但不能彻底去掉焦点指示。

### 7. 设计 Token 体系与 CSS 变量

#### 定义

设计 Token 是对设计决策的命名封装：把"品牌主色""基础间距""标题字号"这类反复出现的值起成有语义的名字，全站通过名字引用，而不是直接写数值。CSS 自定义属性（形如 `--color-primary`）是浏览器原生的 Token 载体，具有继承性，可在任意层级被覆盖，用 `var(--name)` 读取。

Token 通常分三层：

- 基础 Token（原始调色板、原始数值），如 `--blue-500: #2563eb`。
- 语义 Token（用途命名），如 `--color-primary: var(--blue-500)`。
- 组件 Token（某组件专用），如 `--button-bg: var(--color-primary)`。

#### 与 Web 的关系

没有 Token 时，改一次品牌色要在几十个文件里搜索替换，还容易漏掉对比度相近的场景。Token 让"改一处、全站生效"成为可能，也是设计师与工程师协作的共同语言。暗色模式、多品牌换肤都建立在语义 Token 之上。

五类基础 Token 的完整定义：

```css
:root {
  /* ---- 颜色：基础色板 ---- */
  --blue-100: #dbeafe;
  --blue-500: #2563eb;
  --blue-700: #1d4ed8;
  --gray-50: #f9fafb;
  --gray-200: #e5e7eb;
  --gray-500: #6b7280;
  --gray-900: #111827;
  --red-500: #dc2626;
  --white: #ffffff;

  /* ---- 颜色：语义 Token（组件只引用这一层） ---- */
  --color-primary: var(--blue-500);
  --color-primary-hover: var(--blue-700);
  --color-primary-muted: var(--blue-100);
  --color-danger: var(--red-500);
  --color-text: var(--gray-900);
  --color-text-muted: var(--gray-500);
  --color-bg: var(--white);
  --color-surface: var(--gray-50);
  --color-border: var(--gray-200);
  --color-focus: var(--blue-500);

  /* ---- 间距：4px 基准的等比序列 ---- */
  --space-0: 0;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* ---- 字号：rem，跟随用户设置 ---- */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: clamp(1.5rem, 3vw, 1.75rem);
  --font-size-hero: clamp(2rem, 5vw, 3rem);

  /* ---- 圆角 ---- */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* ---- 阴影：层级越高，阴影越扩散 ---- */
  --shadow-sm: 0 1px 2px rgb(0 0 0 / 8%);
  --shadow-md: 0 4px 8px rgb(0 0 0 / 10%);
  --shadow-lg: 0 12px 24px rgb(0 0 0 / 12%);
}
```

组件中只引用语义 Token，不直接写颜色值：

```css
.button {
  display: inline-flex;
  min-height: 44px;
  padding-inline: var(--space-4);
  gap: var(--space-2);
  font-size: var(--font-size-base);
  background: var(--color-primary);
  color: var(--white);
  border: 0;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: background 150ms ease;
}

.button:hover {
  background: var(--color-primary-hover);
  box-shadow: var(--shadow-md);
}

.card {
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

/* 带兜底值的引用：变量不存在时使用第二个参数 */
.note {
  margin-top: var(--space-4, 16px);
}
```

局部覆盖实现同一组件的不同变体：

```css
.card.featured {
  --card-bg: var(--color-primary-muted);
  background: var(--card-bg);
}
```

```text
Token 命名原则：
  用语义（做什么）而不是用值（是什么）命名
    --color-primary        推荐
    --color-blue-500       只在基础层使用
    --color-hex-2563eb     禁止
```

#### 常见误区

> 把所有颜色都做成变量就是好的 Token 体系。

如果组件直接引用 `--blue-500` 这类原始色板，换主题时仍然无处下手。组件必须引用语义层，原始色板只用于给语义层赋值。

> CSS 变量和 Sass 变量一样，编译后就固定了。

CSS 变量在运行时存在、可继承、可在媒体查询或父级类名切换时动态改变，这正是暗色模式能实现的原因。

### 8. 暗色模式与 CSS 文件组织

#### 定义

暗色模式是一套前景与背景反转的配色方案，通常通过两种途径切换：监听用户系统的 `prefers-color-scheme`，或提供手动开关把选择记在本地。CSS 文件组织是指按层次（重置、Token、基础元素、组件、布局）拆分样式文件，约定引入顺序。

#### 与 Web 的关系

暗色模式能降低夜间亮度刺激，也是 OLED 屏幕省电的常见手段。关键实现技巧是：组件代码完全不关心明暗，它只引用 `--color-text`、`--color-bg` 等语义变量；切换主题时只改变量的值，所有组件自动跟随。手动切换通过在 `<html>` 上加 `data-theme` 属性并在 CSS 中覆盖变量实现。

暗色模式的两层实现：

```css
/* 默认亮色变量已在 :root 定义；暗色变量整体覆盖 */
@media (prefers-color-scheme: dark) {
  :root {
    --color-text: #f3f4f6;
    --color-text-muted: #9ca3af;
    --color-bg: #0f172a;
    --color-surface: #1e293b;
    --color-border: #334155;
    --color-primary: #60a5fa;
    --color-primary-hover: #93c5fd;
    --color-primary-muted: #1e3a5f;
    --color-focus: #60a5fa;
  }
}

/* 手动切换优先：html 上有 data-theme="dark" 时，无论系统如何都用暗色 */
:root[data-theme="dark"] {
  --color-text: #f3f4f6;
  --color-text-muted: #9ca3af;
  --color-bg: #0f172a;
  --color-surface: #1e293b;
  --color-border: #334155;
  --color-primary: #60a5fa;
  --color-primary-hover: #93c5fd;
  --color-primary-muted: #1e3a5f;
  --color-focus: #60a5fa;
}

:root[data-theme="light"] {
  --color-text: var(--gray-900);
  --color-text-muted: var(--gray-500);
  --color-bg: var(--white);
  --color-surface: var(--gray-50);
  --color-border: var(--gray-200);
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  transition: background 200ms ease, color 200ms ease;
}
```

主题切换脚本（DOM 与存储细节在后续单元展开，这里先建立印象）：

```js
const themeButton = document.querySelector('#theme-toggle');

themeButton.addEventListener('click', () => {
  const current = document.documentElement.dataset.theme;
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
});

// 启动时读取已保存选择；无记录则交给系统偏好
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.dataset.theme = savedTheme;
}
```

推荐的文件组织方式：

```text
styles/
├── reset.css          # 浏览器默认样式重置与盒模型约定
├── tokens.css         # 三层 Token：色板、语义变量、组件变量
├── base.css           # 基础元素：body、标题、链接、表单默认外观
├── layout.css         # 页面骨架：容器、网格、导航
└── components/
    ├── card.css       # 组件样式，只引用语义 Token
    ├── button.css
    └── table.css
```

在入口样式表中按依赖顺序引入（原生 CSS 已支持 import，也可直接在 HTML 里依次 link）：

```css
@import url('./reset.css');
@import url('./tokens.css');
@import url('./base.css');
@import url('./layout.css');
@import url('./components/button.css');
@import url('./components/card.css');
@import url('./components/table.css');
```

```text
引入顺序原则：
  越基础越靠前：reset → tokens → base → layout → components
  组件文件默认放在最后，便于在同等特异性下覆盖基础样式
```

#### 常见误区

> 暗色模式就是把背景改成黑色、文字改成白色。

纯黑纯白对比过于刺眼，主流暗色方案使用深蓝灰背景与低饱和度前景，同时要重新考虑阴影（暗色下阴影几乎不可见，需要靠表面层级色差区分）和主色饱和度。

> 每个组件文件里各自定义一套变量更独立。

变量分散后无法统一换肤。Token 必须集中定义在 `tokens.css`，组件只消费变量；确需组件私有变量时，也应在 Token 文件中集中登记。

## 课后题

1. 用自己的话解释移动优先策略。为什么基础样式写在媒体查询之外、增强样式统一用 `min-width` 叠加，降级会更安全？
2. 视口 meta 标签中的 `width=device-width, initial-scale=1.0` 分别解决什么问题？只写这行标签但 CSS 中存在固定宽度 1200px，手机上会怎样？
3. 请说明断点应当"按设备型号设定"还是"按内容设定"，并描述一次确定断点的具体操作过程。
4. 容器查询与媒体查询的判断依据有何不同？请各举一个适合使用的真实场景。
5. 场景分析：一个"用户名片"组件既要出现在宽正文里，又要出现在宽度仅 280px 的页脚栏里。请用容器查询思路描述你会如何让组件在两处都可用，并说明必须先完成哪一步声明。
6. 解释 `clamp(1.75rem, 4vw + 1rem, 3rem)` 三个参数的作用。为什么不建议直接用 `font-size: 4vw` 而不加上下限？
7. 场景分析：用户反馈文章页在手机上"图片把左右撑出了屏幕，而且字被图片挤得忽大忽小"。请列出至少四处应检查的 CSS 与 HTML 写法。
8. 场景分析：线上数据显示手机用户打开卡片墙页面的平均流量消耗远高于预期，检查发现横幅图只提供了一个约 3000px 宽的版本。请解释 `srcset` 中 `400w`、`800w` 描述的是什么、`sizes` 属性告诉浏览器什么信息，以及为什么只有 CSS 的 `width:100%` 不能节省移动端流量。
9. 场景分析：一个有七列的数据表格在 375px 宽的手机上被用户投诉"看不全、左右滑动会滑出整个网页"。请给出两种可行的窄屏方案及其优缺点。
10. 设计 Token 为什么要分"基础色板、语义 Token、组件 Token"三层？如果组件直接引用 `--blue-500`，在做暗色模式时会遇到什么问题？

## 实践练习题

### 练习 1：移动优先的卡片墙

#### 任务

创建一个"周刊文章卡片墙"页面，不使用任何框架。要求先写好手机单列版本，再通过两级 `min-width` 断点分别实现平板两列、桌面三列，导航在窄屏纵向排列、宽屏横向排列。

#### 步骤约束

1. 必须包含正确的视口 meta 标签，页面语言设为 `zh-CN`。
2. 基础样式中不得出现媒体查询；卡片墙默认单列。
3. 在 768px 与 1024px 两个断点上用 `min-width` 增强，断点从小到大排列。
4. 卡片至少 6 张，每张包含标题、摘要与"阅读全文"链接。
5. 在 DevTools 设备模拟器中依次验证 375px、768px、1024px、1440px 四档宽度。
6. 不允许使用固定像素写死容器宽度。

#### 提交物

- `index.html` 与 `styles.css`；
- 四档宽度下的布局截图或照片；
- 100 至 200 字说明：基础层与两层增强分别承担什么职责。

#### 验收标准

- 任何宽度下都没有整页横向滚动条；
- 断点切换时列数与导航方向符合要求；
- 全部增强样式均写在 `min-width` 查询内；
- 卡片在最宽档位三列等宽、间距一致。

### 练习 2：流式排版与响应式图片

#### 任务

在上一练习基础上改造页面：标题、区块内边距全部改用 `clamp()` 流式实现；卡片墙改用 `auto-fill + minmax` 自动决定列数；首屏横幅图提供至少三个宽度的 `srcset`，并为正文图片提供现代格式与回退格式。

#### 步骤约束

1. 至少有两处字号、一处内边距使用 `clamp()`，最小值与最大值必须齐全。
2. 卡片网格删除手写列数的媒体查询，改用 `repeat(auto-fill, minmax(min(260px, 100%), 1fr))`。
3. 横幅图片必须带 `width`、`height`、`alt`，并用 `srcset` + `sizes` 描述。
4. 至少一张图片用 `<picture>` 提供现代格式与旧格式回退。
5. 所有图片设置 `max-width: 100%` 与 `height: auto`。
6. 在 DevTools Network 面板中用窄视口重载，确认手机宽度下请求的是小尺寸图片。

#### 提交物

- 更新后的 HTML 与 CSS；
- Network 面板中不同宽度下实际请求图片资源的记录；
- 一段说明：流式方案相比纯断点方案，在断点之间的表现有何不同。

#### 验收标准

- 标题与间距在连续拖动宽度时平滑变化且不超出上下限；
- 卡片列数随宽度自动增减，无需手写列数断点；
- 窄屏实际下载的图片资源明显小于宽屏；
- 图片加载前后页面不发生跳动。

### 练习 3：Token 化的双主题组件库

#### 任务

新建 `styles/` 目录，按 `reset、tokens、base、layout、components` 拆分样式。定义颜色、间距、字号、圆角、阴影五类 Token，组件只引用语义 Token。实现一个卡片、一个主按钮、一个数据表格，并支持系统暗色偏好与手动切换两种暗色模式；表格在窄屏下改为容器内滚动或卡片式。

#### 步骤约束

1. Token 必须分三层：原始色板、语义 Token、组件 Token，组件中不得出现裸颜色值。
2. 间距以 4px 为基准的等比序列，字号全部使用 rem。
3. 同时实现 `prefers-color-scheme: dark` 与 `[data-theme="dark"]` 两套暗色变量，手动选择优先于系统偏好。
4. 提供一个切换按钮，点击后在 `<html>` 上切换 `data-theme`（允许用少量内联脚本）。
5. 所有可点元素触控目标至少 44px 高，键盘焦点用 `:focus-visible` 清晰标示。
6. 数据表格在 599px 以下采用容器内滚动或行转卡片方案之一。

#### 提交物

- 完整的 `styles/` 目录结构与入口 HTML；
- 亮暗两种主题、桌面与手机两种宽度共四张截图；
- 一份 Token 清单（五类 Token 的名称与取值）；
- 200 字左右说明：为什么组件只引用语义层就能同时适配明暗两色。

#### 验收标准

- 修改一个语义色变量，全站对应元素统一变化；
- 切换主题时组件代码无需任何改动；
- 暗色下文字与背景对比度足够、表面层级可区分；
- 窄屏表格内容完整可读，不产生整页横向滚动；
- 文件分层与引入顺序清晰，没有跨层引用裸值。

## 阶段验收作业

### 作业名称

多端周刊首页：响应式与 Token 系统实战

### 作业场景

团队要做一个技术周刊的官网首页。读者会用手机通勤时阅读、用平板横屏浏览目录、用桌面显示器阅读长文；产品同时要求提供夜间阅读模式，并在后续把同一套视觉规范推广到多个子产品。你需要交付一个不依赖框架、由设计 Token 驱动、从 320px 到宽屏都可用的响应式页面，并证明每一项视觉与布局决策都有依据。

### 提交物

```text
weekly-home/
├── index.html
├── scripts/
│   └── theme.js                # 主题切换逻辑
├── styles/
│   ├── reset.css
│   ├── tokens.css
│   ├── base.css
│   ├── layout.css
│   └── components/
│       ├── header.css
│       ├── card.css
│       ├── button.css
│       └── table.css
├── assets/
│   └── images/                 # 多尺寸图片与说明
├── evidence/
│   ├── token-inventory.md      # Token 清单
│   └── responsive-report.md    # 多端验证报告
└── README.md
```

页面必须包含：顶部导航、首屏横幅（带响应式图片）、文章卡片墙、至少一个七列数据表格（如"全年目录"）、主题切换按钮与页脚。

### 演示步骤

学员需在 15 分钟内完成以下现场演示：

1. 用自己的语言说明移动优先的组织方式，指出基础样式与各断点增强分别在哪些文件中。
2. 在 DevTools 中从 1440px 连续拖动到 320px，指出导航、卡片墙、表格各自在哪一刻发生变化，以及变化依据是视口还是容器。
3. 展示至少一个使用容器查询的组件在宽容器与窄容器中的不同形态。
4. 在 Network 面板切换到手机视口并重载，证明下载的是小尺寸图片。
5. 点击主题按钮切换暗色模式，刷新页面后选择仍保留；再把系统切换为暗色偏好，展示无手动选择时跟随系统。
6. 现场在 Elements 面板修改一个语义颜色或间距变量，证明全站对应位置统一变化。
7. 只用键盘完成一次导航与一次按钮操作，指出焦点框的位置。

导师可以临时改变断点宽度、容器尺寸或主题初值，验证学员理解的是机制而不是背下的固定输出。

### 评分标准（100 分）

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 响应式布局 | 25 | 移动优先组织正确；媒体查询与容器查询分工合理；320px 至宽屏全程可用 |
| 流式排版与图片 | 15 | clamp、流式单位、srcset/sizes 使用正确；断点之间平滑、资源选择合理 |
| 设计 Token 体系 | 25 | 五类 Token 齐全且分三层；组件只引用语义层；修改一处全站生效 |
| 暗色模式与可达性 | 15 | 系统跟随与手动切换均正确；触控目标、焦点可见、对比度达标 |
| 文件组织与可维护性 | 10 | 分层清晰、引入顺序正确；表格与复杂组件有窄屏方案 |
| 证据与表达 | 10 | Token 清单、多端报告完整；结论与实际验证证据对应 |

细分评分规则：

#### 响应式布局：25 分

- 视口设置与移动优先基础层正确：6 分；
- 断点统一使用 `min-width` 且按序排列：6 分；
- 容器查询至少用于一个真实复用组件：7 分；
- 全程无整页横向滚动、无内容遮挡：6 分。

#### 流式排版与图片：15 分

- 至少三处 `clamp()` 且上下限齐全：5 分；
- 网格自动列数或流式单位使用正确：5 分；
- `srcset`/`sizes`/`<picture>` 实际生效并经 Network 验证：5 分。

#### 设计 Token 体系：25 分

- 五类 Token 齐全、取值成体系：8 分；
- 基础层、语义层、组件层三层划分清晰：8 分；
- 组件中无裸颜色值、无魔法数字：5 分；
- 现场修改变量可驱动全站变化：4 分。

#### 暗色模式与可达性：15 分

- 系统偏好与手动切换（含优先级）正确：6 分；
- 暗色配色对比度与表面层级合理：4 分；
- 触控目标尺寸与间距达标：3 分；
- 键盘焦点全程可见：2 分。

#### 文件组织与可维护性：10 分

- 目录分层与引入顺序正确：5 分；
- 数据表格窄屏方案完整可用：5 分。

#### 证据与表达：10 分

- Token 清单与多端验证报告齐全：6 分；
- 现场讲解能区分事实、决策与依据：4 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 在 320px 至 375px 的手机宽度下出现整页横向滚动、内容溢出或关键内容被遮挡。
2. 没有使用移动优先：基础层依赖桌面布局，靠大量 `max-width` 在窄屏拆改。
3. 组件中直接书写颜色十六进制值或魔法数字，Token 体系名存实亡，或五类 Token 缺两类以上。
4. 暗色模式只能跟随系统、无法手动切换，或切换后刷新即失效且没有任何持久化处理。
5. 响应式图片只有 CSS 缩放，没有任何 `srcset`、`sizes` 或 `<picture>` 处理。
6. 键盘用户无法完成导航，或全局去掉焦点框导致焦点位置不可见。
7. 数据表格在窄屏内容丢失、列被裁掉，或产生无法察觉的整页横向滚动。
8. 只提交截图，缺少可运行的 HTML/CSS 源码、Token 清单与验证报告。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 按移动优先组织样式并正确设置视口 | `index.html`、`layout.css` 与现场拖动演示 |
| 使用媒体查询与容器查询并区分场景 | 断点代码、容器组件与演示步骤 2、3 |
| 用流式单位、clamp 与响应式图片保证连续性 | 排版代码、Network 记录与演示步骤 4 |
| 设计五类 Token 并用 CSS 变量复用 | `tokens.css`、Token 清单与现场修改变量 |
| 实现暗色模式（系统跟随与手动切换） | `theme.js`、暗色变量与演示步骤 5 |
| 组织 CSS 文件并处理表格、触控等业务细节 | 目录结构、表格窄屏方案与键盘演示 |

### 提交前自检

- [ ] 六个学习目标均有对应证据。
- [ ] 在 320px、375px、768px、1024px、1440px 五档宽度下逐一检查通过。
- [ ] 基础样式全部位于媒体查询之外，增强样式统一使用 `min-width`。
- [ ] 至少一个组件由容器查询驱动，且祖先容器已声明 `container-type`。
- [ ] 所有 `clamp()` 均有最小值与最大值，正文未裸用 `vw`。
- [ ] 横幅与内容图片均有响应式资源方案，并带 `width`、`height`、`alt`。
- [ ] 组件样式中不存在裸颜色值与未登记的魔法数字。
- [ ] 暗色模式系统跟随与手动切换均可工作，手动选择优先级正确。
- [ ] 所有可点元素触控目标达标，键盘焦点全程可见。
- [ ] 表格窄屏方案完整，不产生整页横向滚动。
- [ ] Token 清单与多端验证报告已提交，结论与证据对应。
