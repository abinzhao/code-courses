# 07-WXSS样式与多机型适配

## 目标

完成本知识单元后，学员应能独立把设计稿“像素级、且跨机型稳定”地还原成小程序界面，理解 WXSS 在双线程模型中的位置，并系统处理刘海屏、胶囊按钮、深色模式等移动端适配问题，而不是只会把 Web CSS 直接粘过来。

学员应能够：

1. 说清 WXSS 与 Web CSS 的关系：继承了大部分 CSS 特性、扩展了 `rpx` 单位、裁剪了选择器范围，且样式只运行在渲染层。
2. 解释 `rpx` 的换算原理：规定屏幕宽为 750rpx，能基于 750 宽设计稿心算换算，并说清 rpx 与逻辑像素、物理像素的区别。
3. 根据语义在 `rpx / px / % / vh / vw / calc()` 之间做选择：布局尺寸用 rpx、发丝边框单独处理、安全区间距用 env。
4. 使用 `@import` 拆分与复用样式，说清 `app.wxss`、页面 WXSS、组件 WXSS 的层级关系，并用 `styleIsolation` 控制自定义组件的样式隔离。
5. 说出官方受支持的选择器子集与样式权重规则，不依赖不被保证的选择器，不靠堆 `!important` 解决覆盖问题。
6. 正确设置 `page` 根节点与组件根节点样式，使用 CSS 自定义变量（`var(--brand)`）管理设计令牌。
7. 用 `transform: scale()` 方案实现真正的 1px 发丝线，并正确处理长图比例、多行文本省略、自定义字体与背景图限制。
8. 使用 `env(safe-area-inset-*)` 适配刘海屏顶部与底部 Home 指示条，理解内容延伸到安全区时的计算方式。
9. 在 `navigationStyle: custom` 自定义导航栏下，结合 `statusBarHeight` 与胶囊按钮布局信息计算导航栏高度并完成左右避让。
10. 配置 `darkmode` 与 `theme.json`，用 `prefers-color-scheme` 媒体查询实现深色模式，并在机型矩阵上还原「逛吃指南」核心页面。

本单元承接 U03 全局配置；自定义组件的样式隔离在 U09 还会从组件视角再讲一次，Skyline 下的布局差异在 U28 展开。

## 技术栈

本单元不引入第三方 UI 框架，使用微信原生框架 + TypeScript，渲染以 WebView 为主、标注 Skyline 差异。

| 技术或能力 | 用途 | 学习要求 |
|---|---|---|
| WXSS | 渲染层样式语言 | 能写布局、颜色、间距、边框、伪元素 |
| `rpx` | 响应式尺寸单位 | 能从 750 设计稿换算并说明原理 |
| `@import` | 样式拆分引入 | 能组织公共样式、变量样式文件 |
| `app.wxss` / 页面 WXSS | 全局与页面样式 | 理解覆盖层级 |
| `styleIsolation` | 组件样式隔离 | 能区分 isolated/apply-shared/shared |
| CSS 变量 `var(--x)` | 设计令牌 | 能集中管理品牌色、圆角、间距 |
| `env(safe-area-inset-*)` | 安全区间距 | 能处理刘海屏与底部横条 |
| `wx.getWindowInfo` | 窗口尺寸信息 | 能取状态栏高度、屏幕宽高、安全区 |
| `wx.getMenuButtonBoundingClientRect` | 胶囊按钮布局 | 能计算自定义导航栏高度 |
| `darkmode` + `theme.json` | 深色模式 | 能配置系统主题跟随 |
| 微信开发者工具 | 多机型预览 | 会切换机型、DPR、深色模式并真机预览 |

约定：

- 课程设计稿统一按 **750px 宽**（iPhone 6 逻辑宽度 375pt 的 2 倍稿）交付，标注尺寸除特殊说明外直接按标注写 rpx。
- 样式相关 API（`wx.getWindowInfo` 等）以官方当前文档为准；已废弃的 `wx.getSystemInfoSync` 不再在新代码中使用。
- 所有样式只写在 WXSS / WXML 中；逻辑层没有 `window`、`document`，不存在“用 JS 查 DOM 算样式”这条路。

## 详细的理论知识讲解和示例伪代码

### 1. WXSS 是什么：跑在渲染层的 CSS 方言

WXSS（WeiXin Style Sheets）是小程序的样式语言，用来描述 WXML 节点如何呈现：尺寸、颜色、间距、边框、定位、动画。它**不是**一套全新发明，而是“CSS 子集 + 少量扩展”：

- 大部分 CSS 特性可直接使用：盒模型、Flex 布局、定位、`transform`、`transition`、`box-shadow`、伪元素等。
- 扩展了 `rpx` 尺寸单位，解决多屏宽下的等比缩放问题。
- 选择器只保证支持一个子集（见第 5 节），不能默认拥有完整浏览器 CSS 选择器能力。
- 样式作用在渲染层（WebView 或 Skyline），与逻辑层不共享内存；不存在浏览器里的 `window.getComputedStyle` 这类 DOM 访问。

WXSS 与 Web CSS 的异同：

| 维度 | Web CSS | WXSS |
|---|---|---|
| 运行环境 | 浏览器 | 小程序渲染层（WebView/Skyline） |
| 尺寸单位 | px、%、vh、vw、rem 等 | 上述单位 + `rpx` |
| 选择器 | 几乎全量支持 | 仅保证子集 |
| 作用对象 | HTML 标签 | WXML 组件（view、text、image 等） |
| 本地背景图 | 可直接引用本地路径 | 不支持，需网络图或 base64 |
| 样式作用域 | 全局 | 页面/组件有隔离规则 |

最小示例，页面 WXSS 与 WXML 同名生效：

```css
/* pages/index/index.wxss */
.page-bg {
  min-height: 100vh;
  background: #f6f7f9;
}
.note-card {
  margin: 24rpx;
  padding: 28rpx;
  background: #ffffff;
  border-radius: 20rpx;
}
```

```xml
<!-- pages/index/index.wxml -->
<view class="page-bg">
  <view class="note-card">
    <text>巷子里的宝藏面馆，人均 25</text>
  </view>
</view>
```

**与开发的关系**：理解 WXSS 跑在渲染层，就不会试图在逻辑层“拿到某个元素的真实宽高再改样式”——那是 DOM 思维。小程序里样式由数据驱动，需要节点信息时用 `wx.createSelectorQuery`（后续单元讲），而不是 `document.querySelector`。

**常见误区**：

- 以为“会写 CSS 就等于会写 WXSS”，结果用了不支持的选择器或本地背景图，在某些机型上静默失效。
- 在 TS 里写 `document.getElementById(...)`，逻辑层根本没有 `document`，直接报错。
- 用 `rem` 并自行设置根字号：小程序没有可配置的 html 根节点，`rem` 行为不可预期，不应使用。

### 2. rpx：为小程序而生的响应式像素

`rpx`（responsive pixel）是 WXSS 的核心扩展，规则只有一句话：

> 不论屏幕多宽，屏幕宽度恒为 750rpx。

也就是说在 375pt 宽的 iPhone 6 上，`750rpx = 375px`，于是 `1rpx = 0.5px`；在 414pt 宽的机型上，`1rpx = 414 / 750 ≈ 0.552px`，同一组 rpx 值会随屏宽等比放大。换算通式：

```text
逻辑像素值 px = rpx 值 × 屏幕逻辑宽度 / 750
rpx 值 = 逻辑像素值 px × 750 / 屏幕逻辑宽度
```

常见机型对照（以 iPhone 6 的 375pt 为基准）：

| 机型 | 逻辑宽度 | 1rpx 对应逻辑像素 | 750rpx |
|---|---:|---:|---:|
| iPhone SE（旧款） | 320pt | 0.427px | 全屏宽 |
| iPhone 6/7/8 | 375pt | 0.5px | 全屏宽 |
| iPhone Plus/Pro Max | 414pt | 0.552px | 全屏宽 |
| 典型安卓旗舰 | 360pt | 0.48px | 全屏宽 |

设计协作约定：设计师按 **750px 宽**出图，标注的 `px` 数值**原封不动**写成 rpx。例如设计稿标“卡片左右边距 32px、圆角 16px”，代码就写：

```css
.note-card {
  margin: 0 32rpx;
  border-radius: 16rpx;
}
```

rpx 背后还有物理像素概念：设备的 DPR（device pixel ratio，如 @2x、@3x）决定 1 个逻辑像素由几个物理像素发光。rpx 只负责“按逻辑宽度等比”，不需要开发者手工处理 @2x/@3x，素材切图仍需提供 @2x/@3x 或 SVG。

**常见误区**：

- 把 375 宽设计稿的标注直接写 rpx，导致整体放大一倍。拿到稿子先确认宽度是 375 还是 750。
- 认为 rpx = 物理像素：rpx 是相对单位，最终显示几个物理像素由屏宽和 DPR 共同决定。
- 一切尺寸都用 rpx：发丝线、安全区等有更合适的表达（第 3、8、11 节）。

### 3. 单位选择：rpx、px、%、vh、vw 与 calc

WXSS 同时支持多种单位，选单位的本质是“这个尺寸希望随什么变化”：

| 单位 | 随什么变化 | 推荐用途 | 不推荐场景 |
|---|---|---|---|
| `rpx` | 屏幕宽度等比缩放 | 卡片宽高、间距、圆角、字号（需克制） | 1px 发丝线、安全区 |
| `px` | 固定逻辑像素 | 发丝边框、细分割线、希望恒定的图标 | 整屏布局宽度 |
| `%` | 父容器尺寸 | 流式宽度、相对布局 | 无明确父尺寸时的高度 |
| `vh/vw` | 视口高/宽 | 撑满屏幕、全屏弹层 | Skyline 部分版本支持有差异，需验证 |
| `env(...)` | 系统安全区 | 刘海、Home 指示条避让 | 普通业务间距 |
| `calc()` | 组合计算 | rpx 与 env、百分比混合运算 | — |

字号策略：标题、间距用 rpx 可保证版式比例一致；但正文若也随大屏无限放大，在平板/折叠屏上会显得松散。常见做法是正文 rpx 为主，对超大宽度通过媒体查询或设计规范收敛，而不是放任等比。

`calc()` 允许不同单位混合运算，运算符两侧必须有空格：

```css
/* 底部操作条：固定高度 + 安全区避让 */
.submit-bar {
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
}

/* 自定义导航栏下的内容区：顶部留出导航高度 */
.detail-body {
  padding-top: calc(var(--nav-height, 88rpx) + 24rpx);
}

/* 双列卡片：屏宽减间距后平分 */
.half-card {
  width: calc((100% - 24rpx) / 2);
}
```

**常见误区**：

- 用 `height: 100%` 想撑满屏幕，但父级链路上没有任一祖先给过确定高度，百分比高度不生效；撑满视口用 `100vh` 或给 `page` 设高度。
- 纠结“边框用 1rpx 还是 1px”：1rpx 在窄屏可能小于 0.5px 而发虚，在宽屏又偏粗，规范做法见第 8 节。
- `calc` 里忘写空格（`calc(100%-20rpx)`）导致整条声明失效。

### 4. 样式组织：@import 与全局、页面、组件层级

WXSS 用 `@import` 引入其他 WXSS 文件，路径用相对路径或 `/` 开头的绝对路径，`@import` 语句应放在文件顶部：

```css
/* styles/variables.wxss：设计令牌 */
page {
  --brand: #ff5a3c;
  --brand-light: #fff0ec;
  --text-main: #1f2329;
  --text-sub: #646a73;
  --radius-card: 20rpx;
  --space-card: 24rpx;
}
```

```css
/* styles/common.wxss：公共类 */
@import '/styles/variables.wxss';

.ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.card {
  background: #fff;
  border-radius: var(--radius-card);
  padding: 28rpx;
}
```

```css
/* app.wxss：全局样式入口 */
@import '/styles/common.wxss';

page {
  background: #f6f7f9;
  color: var(--text-main);
  font-size: 28rpx;
}
```

三层样式的生效范围：

- `app.wxss`：作用于所有页面的普通节点。
- 页面 WXSS：只作用于当前页面，类名同名不会污染其他页面。
- 组件 WXSS：默认只作用于组件内部，且默认不受外部样式影响。

自定义组件通过 `Component` 的样式选项控制隔离：

```typescript
// components/note-card/note-card.ts
Component({
  options: {
    // isolated：内外完全隔离（默认）
    // apply-shared：页面/全局样式能影响组件，组件不影响外部
    // shared：双向影响，配合多个组件共享一套 class
    styleIsolation: 'apply-shared'
  }
})
```

等价的旧写法是 `addGlobalClass: true`，新代码统一用 `styleIsolation`。

**常见误区**：

- 在组件里写样式不生效，却不知道默认是隔离的，于是到处 `!important`；应先确认隔离策略。
- 循环 `@import`（A 引 B、B 引 A）导致样式异常。
- 把所有样式堆进 `app.wxss`：包体变大且类名容易冲突，公共类才进全局。

### 5. 选择器：官方保证的子集

WXSS 官方文档明确列出受支持的选择器，常用范围：

| 选择器 | 示例 | 是否保证支持 |
|---|---|---|
| 类选择器 | `.note-card` | 支持 |
| id 选择器 | `#banner` | 支持（id 应保持唯一） |
| 元素选择器 | `view`、`text`、`image` | 支持 |
| 伪元素 | `::after`、`::before` | 支持 |
| 并集选择器 | `.title, .sub` | 支持 |
| 后代选择器 | `.card .title` | 支持 |
| 子选择器 | `.card > .title` | 支持，但建议真机确认 |
| 通配符 | `*` | 不保证支持，不要使用 |
| 属性选择器 | `[type="text"]` | 不在保证子集内，不要依赖 |
| 兄弟选择器 | `.a + .b`、`.a ~ .b` | 不保证支持 |
| 结构/状态伪类 | `:nth-child()`、`:not()`、`:first-child` | 不在保证子集内 |

实践原则：**以 class 选择器为主**，元素选择器只用于非常确定的全局重置，复杂关系通过加 class 表达。

```xml
<view class="coupon coupon--active">
  <text class="coupon__amount">¥30</text>
  <text class="coupon__cond">满 100 可用</text>
</view>
```

```css
.coupon {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border: 1rpx solid #eee;
  border-radius: 16rpx;
}
.coupon--active {
  border-color: var(--brand);
  background: var(--brand-light);
}
.coupon__amount {
  font-size: 40rpx;
  font-weight: 600;
  color: var(--brand);
}
```

**常见误区**：

- 在 WebView 里实测 `:nth-child` 能用就上线，切到 Skyline 或部分安卓机样式错乱。
- 用属性选择器区分输入框类型，应改为显式加 class。
- 大量使用元素选择器（如 `view { ... }`），在组件隔离与样式覆盖时很难收敛。

### 6. 权重与样式覆盖

WXSS 权重规则与 CSS 一致，从高到低：

```text
!important  >  内联 style  >  id 选择器  >  class/伪元素  >  元素选择器
```

同级权重下，后出现的声明覆盖先出现的；`app.wxss`、页面 WXSS、组件 WXSS 之间不是简单的“全局一定赢”，而是同样按权重与注入顺序比较。

WXML 的 `style` 适合动态、少量、由数据决定的样式；静态样式一律放 class：

```xml
<view
  class="coupon {{item.claimed ? 'coupon--claimed' : ''}}"
  style="transform: translateY({{index * 4}}rpx);"
>
  <text>{{item.title}}</text>
</view>
```

```css
.coupon--claimed {
  opacity: 0.55;
}
```

**常见误区**：

- 覆盖不了就加 `!important`，层层加码最后无人能改。先判断权重与来源层级。
- 用内联 style 写大段静态样式，维护困难且无法利用缓存。
- 在 `app.wxss` 写高权重选择器（如 `#id`），页面几乎无法覆盖。

### 7. page 根节点、组件根节点与 CSS 变量

`page` 是每个页面最外层的根节点选择器，常用于设置整页背景、默认字号、定义变量：

```css
page {
  --brand: #ff5a3c;
  --nav-height: 88rpx;
  background: #f6f7f9;
  color: #1f2329;
  font-size: 28rpx;
  line-height: 1.5;
}
```

CSS 自定义变量沿节点树继承，子节点可直接 `var()` 引用，还能给兜底值：

```css
.note-price {
  color: var(--brand, #ff5a3c);
}
.note-price--free {
  --brand: #16a34a; /* 局部重定义，只影响该节点子树 */
}
```

组件的根节点就是组件 WXML 的最外层节点，给它加 class 即可控制根样式；小程序组件没有 Web Components 的 `:host`，不要使用：

```xml
<!-- components/section-title/section-title.wxml -->
<view class="section-title">
  <text class="section-title__text">{{text}}</text>
  <text class="section-title__more" wx:if="{{more}}">更多</text>
</view>
```

```css
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 32rpx 12rpx;
}
```

**常见误区**：

- 在组件 WXSS 里写 `page { ... }`，组件样式默认不作用于页面根节点。
- 变量名拼写不一致（`--Brand` 与 `--brand` 是两个变量）。
- 期望变量支持算术（`var(--space) * 2` 不合法），应用 `calc(var(--space) * 2)`。

### 8. 1px 发丝线

移动端 DPR 普遍为 @2x/@3x，CSS 的 `1px` 在物理屏幕上实际占 2~3 个物理像素，比设计稿上的发丝线粗。直接写 `1rpx` 又会随屏宽变化、在部分机型上小于最小绘制单位而发虚。

稳定方案：用伪元素画一条 1px 的线，再按 DPR 缩放（iOS/安卓 WebView 均适用）：

```css
.hairline-top {
  position: relative;
}
.hairline-top::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 1px;
  background: #e5e6eb;
  transform: scaleY(0.5);
  transform-origin: 0 0;
}
```

四周都要发丝边框的卡片（缩放后整体缩小一半，宽高用 200% 补偿）：

```css
.hairline-box {
  position: relative;
}
.hairline-box::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 200%;
  height: 200%;
  border: 1px solid #e5e6eb;
  border-radius: 40rpx; /* 视觉圆角的 2 倍 */
  transform: scale(0.5);
  transform-origin: 0 0;
  pointer-events: none;
  box-sizing: border-box;
}
```

**常见误区**：

- 父容器忘记 `position: relative`，伪元素相对更外层定位，线条飞掉。
- 缩放后伪元素盖住内容、挡住点击：加 `pointer-events: none`。
- 用 `box-shadow: 0 0.5px 0 #eee` 模拟发丝线，低于 1px 的阴影在部分安卓机不绘制，兼容性差。

### 9. 背景图、长图与 image 模式

WXSS 的 `background-image` **不能引用代码包内的本地图片**，只支持 https 网络图与 base64；使用网络图时域名需配置在 downloadFile 合法域名列表中。

```css
/* 合法：网络图 */
.profile-bg {
  background-image: url('https://cdn.example.com/assets/profile-bg.png');
  background-size: cover;
}
/* 合法：小图标 base64 */
.icon-tag {
  background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...');
}
/* 非法：本地路径，不会显示 */
.bad-bg {
  background-image: url('/assets/banner.png');
}
```

内容性图片应使用 `image` 组件，`mode` 决定缩放与裁剪方式：

| mode | 行为 | 典型用途 |
|---|---|---|
| `scaleToFill` | 拉伸填满，不保比例（默认） | 很少用，易变形 |
| `aspectFit` | 保比例完整显示 | 商品图、logo |
| `aspectFill` | 保比例填满并裁剪居中 | 封面、头像、banner |
| `widthFix` | 宽不变、高按比例自动变化 | 瀑布流长图、文章大图 |
| `heightFix` | 高不变、宽按比例变化 | 横图列表 |

探店笔记的瀑布流长图，用 `widthFix` 保证不被压扁，并开启懒加载：

```xml
<image
  class="note-cover"
  src="{{item.cover}}"
  mode="widthFix"
  lazy-load="{{true}}"
/>
```

```css
.note-cover {
  width: 100%;
  border-radius: 16rpx 16rpx 0 0;
  background: #f0f0f0; /* 图片加载前的占位底色 */
}
```

banner 通常需要固定比例裁剪，用 `aspectFill` 加固定高度：

```css
.banner {
  width: 100%;
  height: 300rpx;
}
```

**常见误区**：

- 用本地路径写背景图，开发者工具可能因缓存“看起来正常”，真机白屏。
- 不给 `image` 设宽高又用默认 `scaleToFill`，图片加载瞬间布局跳动。
- 长图用 `aspectFill` 导致画面被裁掉主体；高图应 `widthFix` 或按真实比例预留高度。

### 10. 文本与字体

文本必须放在 `text`（行内文本）或 `rich-text`（富文本）组件中，普通文字裸写在 `view` 里虽可能显示，但不规范、无法被选中与局部设置。

单行省略：

```css
.shop-name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
```

多行省略（两行收尾，常用于笔记摘要）：

```css
.note-desc {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}
```

字体栈优先使用系统字体，启动快、无需下载：

```css
page {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC',
    'Helvetica Neue', 'Microsoft YaHei', sans-serif;
}
```

需要自定义字体时有两条路：

- `@font-face` 引用代码包内字体：受包体与格式限制，只适合很小的数字字体或图标字体。
- `wx.loadFontFace`：引用 https 网络字体，全局生效，适合营销活动标题等特殊字体，加载完成前有降级期。

```typescript
wx.loadFontFace({
  family: 'MarketFont',
  source: 'url("https://cdn.example.com/fonts/market.woff2")',
  global: true,
  success: () => console.log('字体就绪'),
  fail: (err) => console.warn('字体加载失败', err)
})
```

```css
.activity-title {
  font-family: 'MarketFont', sans-serif;
}
```

**常见误区**：

- 中文字体文件动辄数 MB 直接打包，拖垮启动；中文字体应做子集化或改用系统字体。
- 字体加载失败没有降级字体，标题直接使用默认衬线体风格突变。
- 多行省略忘写 `display: -webkit-box`，只写 `line-clamp` 不生效。

### 11. 安全区与 env()

全面屏机型存在两块“不应被内容遮挡”的区域：顶部刘海/灵动岛区域、底部 Home 指示条区域。系统通过环境变量暴露安全区间距：

```text
env(safe-area-inset-top)     顶部安全区高度
env(safe-area-inset-bottom)  底部安全区高度
env(safe-area-inset-left)    左侧安全区（横屏明显）
env(safe-area-inset-right)   右侧安全区（横屏明显）
```

底部固定的“领券购买”操作条必须叠加底部安全区：

```xml
<view class="buy-bar">
  <view class="buy-bar__price">
    <text class="buy-bar__symbol">¥</text>
    <text class="buy-bar__num">{{price}}</text>
  </view>
  <button class="buy-bar__btn" bindtap="onBuy">立即购买</button>
</view>
```

```css
.buy-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  box-shadow: 0 -2rpx 16rpx rgba(0, 0, 0, 0.06);
}
```

横屏播放/地图等场景同时考虑左右安全区；老版本 iOS 需要 `constant()` 兜底时可双写（`env` 放后）。

**常见误区**：

- 只给 `margin-bottom` 而不处理 fixed 定位条：fixed 元素相对视口，正好压在 Home 指示条上。
- 全局给 `page` 加底部安全区内边距，导致本身不满一屏的页面底部出现多余白条；安全区只加在贴底元素上。
- 用 `padding-bottom: env(...)` 但在非全面屏上 env 为 0 时没有任何间距——应保留一个基础间距再 `calc` 叠加。

### 12. 状态栏、胶囊按钮与自定义导航栏高度

默认导航栏由微信提供，标题、颜色在 `window` 配置即可。当页面需要沉浸式头图、搜索框嵌入顶部（如「逛吃指南」首页）时，在页面 JSON 中开启自定义：

```json
{
  "navigationStyle": "custom",
  "usingComponents": {}
}
```

开启后页面内容从屏幕物理顶部 y=0 开始排布，必须自行避让两块系统元素：

1. **状态栏**（时间、电量所在区域），高度取 `wx.getWindowInfo().statusBarHeight`。
2. **胶囊按钮**（右上角“···”和圆点），布局取 `wx.getMenuButtonBoundingClientRect()`。

字段含义与导航高度公式：

```text
statusBarHeight        状态栏高度
menuButton.top         胶囊上边缘到屏幕顶的距离
menuButton.height      胶囊高度
navContentHeight = (menuButton.top - statusBarHeight) × 2 + menuButton.height
                       导航内容区高度（胶囊上下边距对称）
navTotalHeight   = statusBarHeight + navContentHeight
                       自定义导航条总高度
menuRightGap    = screenWidth - menuButton.right
                       胶囊距右边缘间距，左侧内容应对称避让
```

完整实现：

```typescript
// pages/index/index.ts
Page({
  data: {
    statusBarHeight: 0,
    navHeight: 44,
    menuRightGap: 7
  },
  onLoad() {
    const windowInfo = wx.getWindowInfo()
    const menu = wx.getMenuButtonBoundingClientRect()
    const navContentHeight =
      (menu.top - windowInfo.statusBarHeight) * 2 + menu.height
    this.setData({
      statusBarHeight: windowInfo.statusBarHeight,
      navHeight: navContentHeight,
      menuRightGap: windowInfo.screenWidth - menu.right
    })
  }
})
```

```xml
<!-- 占位：把正常内容顶到导航条下方 -->
<view
  class="nav-holder"
  style="height: {{statusBarHeight + navHeight}}px;"
></view>

<!-- 真正的自定义导航条 -->
<view class="custom-nav" style="padding-top: {{statusBarHeight}}px;">
  <view class="custom-nav__bar" style="height: {{navHeight}}px;">
    <view class="custom-nav__search">
      <text>搜索门店、菜品</text>
    </view>
  </view>
</view>
```

```css
.custom-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.96);
}
.custom-nav__bar {
  display: flex;
  align-items: center;
  padding: 0 16rpx;
}
.custom-nav__search {
  flex: 1;
  height: 64rpx;
  margin-right: calc(160rpx + var(--menu-gap, 14rpx));
  border-radius: 32rpx;
  background: #f2f3f5;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  color: #8a8f99;
  font-size: 26rpx;
}
```

胶囊按钮约 87px×32px（逻辑像素，随机型变化），搜索框右侧必须留出胶囊宽度 + 右边距，避免与胶囊重叠。

**常见误区**：

- 写死导航高度 64px 或 88px：安卓状态栏高度、是否有灵动岛都不同，必须动态计算。
- 把计算放在 `onReady` 并依赖节点查询，首屏会先闪一下错位；窗口信息在 `onLoad` 即可同步获取。
- 只避让状态栏、不避让胶囊，搜索框延伸到右上角被胶囊压住。
- 自定义导航页忘记给内容加等高占位，头图顶部被导航条盖住。

### 13. 深色模式：darkmode 与 theme.json

深色模式不是“把背景改成黑色”这么简单，涉及导航栏、背景、卡片、文字、分割线、阴影与图片的整体协调。小程序的标准接入分三步。

第一步，`app.json` 声明并指定主题文件：

```json
{
  "darkmode": true,
  "themeLocation": "theme.json"
}
```

第二步，根目录建 `theme.json`，分别给出两套**系统组件配色变量**（JSON 中通过 `@变量名` 引用）：

```json
{
  "light": {
    "navBgColor": "#ffffff",
    "navTxtStyle": "black",
    "bgColor": "#f6f7f9",
    "bgTextStyle": "dark",
    "brandColor": "#ff5a3c"
  },
  "dark": {
    "navBgColor": "#16181d",
    "navTxtStyle": "white",
    "bgColor": "#000000",
    "bgTextStyle": "light",
    "brandColor": "#ff7a5c"
  }
}
```

第三步，`app.json` 的窗口字段引用主题变量：

```json
{
  "window": {
    "navigationBarBackgroundColor": "@navBgColor",
    "navigationBarTextStyle": "@navTxtStyle",
    "backgroundColor": "@bgColor",
    "backgroundTextStyle": "@bgTextStyle"
  }
}
```

业务样式用媒体查询切换，推荐配合 CSS 变量，避免整段重写：

```css
page {
  --bg: #f6f7f9;
  --card: #ffffff;
  --text: #1f2329;
  --sub: #646a73;
  --line: #eceef1;
}

@media (prefers-color-scheme: dark) {
  page {
    --bg: #000000;
    --card: #16181d;
    --text: #e6e8eb;
    --sub: #9aa0a8;
    --line: #2a2d33;
  }
}

page {
  background: var(--bg);
}
.note-card {
  background: var(--card);
  box-shadow: none;
}
.note-card__title {
  color: var(--text);
}
.note-card__desc {
  color: var(--sub);
}
```

需要在逻辑层感知主题时（例如切换不同图片），用应用级 `onThemeChange` 与 `wx.getAppBaseInfo().theme`：

```typescript
App({
  onThemeChange(res) {
    console.log('系统主题变化：', res.theme) // 'light' | 'dark'
  }
})
```

深色设计要点：背景不要用纯 `#000` 配纯白文字（对比刺眼），用深灰阶分层；分割线靠低亮度描边而非浅色投影；品牌色在深色下适当提亮保证对比度。

**常见误区**：

- 只改了导航栏，正文仍是白底白字或黑底黑字。
- 深色下沿用浅色的大投影，阴影在黑底上几乎不可见，层级丢失，应改用描边/背景色差分层。
- 彩色图片、二维码截图在深色下视觉突兀，必要时提供深色底资源。

### 14. Flex 布局在小程序中的高频模式

小程序布局以 Flex 为主（float 几乎不用），下面三个模式覆盖「逛吃指南」大部分界面。

模式一，门店卡片：左图右文，文字区纵向分配：

```xml
<view class="shop-card">
  <image class="shop-card__img" src="{{shop.cover}}" mode="aspectFill" />
  <view class="shop-card__info">
    <text class="shop-card__name">{{shop.name}}</text>
    <text class="shop-card__meta">{{shop.district}} · {{shop.avgPrice}}/人</text>
    <view class="shop-card__tags">
      <text class="tag" wx:for="{{shop.tags}}" wx:key="*this">{{item}}</text>
    </view>
  </view>
</view>
```

```css
.shop-card {
  display: flex;
  padding: 24rpx;
  background: var(--card);
}
.shop-card__img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 16rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}
.shop-card__info {
  flex: 1;
  min-width: 0; /* 关键：允许内部文本省略，不被内容撑破 */
  display: flex;
  flex-direction: column;
}
.shop-card__name {
  font-size: 32rpx;
  font-weight: 600;
}
.shop-card__meta {
  margin-top: 8rpx;
  color: var(--sub);
  font-size: 24rpx;
}
.shop-card__tags {
  margin-top: auto; /* 标签贴底 */
  display: flex;
  gap: 12rpx;
}
.tag {
  padding: 4rpx 14rpx;
  font-size: 20rpx;
  color: var(--brand);
  background: var(--brand-light);
  border-radius: 8rpx;
}
```

模式二，顶部标题栏两侧对齐、底部操作条两端对齐：`justify-content: space-between`。

模式三，优惠券横向信息 + 右侧按钮：左侧 `flex: 1`，按钮固定宽不收缩（`flex-shrink: 0`）。

**常见误区**：

- 文本容器不写 `min-width: 0`，长店名把 flex 子项撑破，省略号失效。
- 图片不写 `flex-shrink: 0`，空间不足时图片被压扁。
- 用 float + clearfix 做卡片，既复杂又在 Skyline 下表现不一致。

### 15. 多机型适配调试方法与检查清单

适配不是“把每个机型都调一遍”，而是建立机型矩阵、用最少的样本覆盖风险维度（屏宽、刘海、底部指示条、DPR、系统、深色）：

| 风险维度 | 代表机型（示例） |
|---|---|
| 小屏非刘海 | iPhone SE（375/320 宽） |
| 标准刘海屏 | iPhone 15/16 系列 |
| 大屏/灵动岛 | iPhone Pro Max 系列 |
| 安卓窄屏 | 360pt 宽安卓机 |
| 安卓大屏/高刷 | 412pt+ 宽安卓机 |
| 折叠/平板 | 展开态宽屏（验证等比放大） |

工具使用：

- 开发者工具顶部可切换模拟器机型、自定义分辨率、DPR；深色模式可在“模拟操作 → 外观设置”切换。
- 模拟器通过不算完成：**真机预览/真机调试各覆盖一台 iOS、一台安卓**。
- 开启渲染检查：元素面板可看节点盒模型与生效声明，定位“写了没生效”的样式。

极端数据测试（比换机型更易暴露适配问题）：

- 店名 20 个字以上、标签 5 个以上；
- 价格 0 元（免费活动）、优惠券满减条件超长；
- 笔记无图、超长图、加载失败的图；
- 系统字号调大后再进页面。

交付前检查清单：

```text
[ ] 设计稿宽度确认（750），标注直接写 rpx
[ ] 自定义导航：状态栏 + 胶囊动态计算，搜索框不压胶囊
[ ] 贴底元素均叠加 env(safe-area-inset-bottom)
[ ] 1px 线条为发丝方案，不发虚不偏粗
[ ] 深色模式：导航、背景、卡片、文字、分割线全部跟随
[ ] image 有 mode、宽高与占位底色，无布局跳动
[ ] 小屏不溢出、大屏不松散，极端文案有省略
[ ] iOS + 安卓真机各验一次
```

**常见误区**：

- 只在自己手机上看效果就认为“适配完成”。
- 只盯布局，不测数据边界；多数适配 bug 是极端数据触发的。
- 用截图凭感觉验收，不按清单逐项核对。

## 课后题

1. WXSS 与 Web CSS 有哪些相同点和差异点？为什么说“逻辑层无法直接读取 WXSS 计算结果”？
2. 请写出 rpx 的定义与换算通式，并分别计算：在 375pt 宽机型上 `240rpx` 是多少逻辑像素？在 414pt 宽机型上又是多少？
3. 拿到一份设计稿后，你如何确认尺寸标注应直接写 rpx 还是需要除以 2？请说明 375 稿与 750 稿的处理差异。
4. `rpx / px / % / vh / env()` 分别适合什么场景？为“发丝线、卡片间距、底部操作条、全屏弹层”各选一个最合适的单位并说明理由。
5. `@import` 的路径与书写位置有什么要求？`app.wxss`、页面 WXSS、组件 WXSS 三者的作用范围有何不同？
6. `styleIsolation` 的三个取值 `isolated / apply-shared / shared` 分别表示什么？组件里写 `page { background: red }` 在默认隔离下会生效吗？
7. 请列出至少三种 WXSS 不保证支持的选择器，并说明“开发者工具里能用”为什么不能作为上线依据。
8. 简述自定义导航栏高度的计算方法：需要用到哪些 API 的哪些字段？`navContentHeight` 为什么是 `(menu.top - statusBarHeight) × 2 + menu.height`？
9. 场景题：学员在详情页底部放了 fixed 购买条，iPhone 16 上按钮正好压着 Home 指示条，而在旧款非刘海 iPhone 上又显得离底部太远。请给出一套同时满足两种机型的写法。
10. 场景题：接入深色模式后，用户反馈“导航栏变黑了，但笔记卡片还是白底，卡片上的浅灰分割线在深色下几乎看不见”。请分析漏做了哪些工作，并给出修复方案。

## 实践练习题

### 练习 1：按 750 设计稿还原探店笔记卡片

#### 任务

按给定的 750 宽设计稿标注，还原首页信息流中的一张探店笔记卡片（封面图、店名、摘要、标签、人均价格）。

```css
/* 参考结构：上方通栏图 + 下方文字区 */
.note-card {
  margin: 24rpx;
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}
```

#### 步骤约束

1. 先确认设计稿宽度为 750，标注数值直接写 rpx，不得手工除以 2。
2. 封面图使用 `image` + `widthFix`，并设置占位底色与 `lazy-load`。
3. 店名单行省略、摘要两行省略；标签至多展示 3 个，超出省略。
4. 颜色、圆角、间距必须使用第 7 节定义的 CSS 变量，不得散落硬编码色值（黑白灰基础色除外可先直接写）。

#### 提交物

- 首页 WXML/WXSS 与 `styles/variables.wxss`；
- 设计稿与成品的并排截图；
- 200 字以内的“标注 → 代码”换算说明。

#### 验收标准

- 卡片在 375pt 机型上与设计稿误差不超过 2rpx 的视觉判断；
- 长店名、长摘要正确省略，不撑破布局；
- 封面图加载过程无明显布局跳动。

### 练习 2：自定义导航栏 + 贴底安全区操作条

#### 任务

将「逛吃指南」详情页改为自定义导航栏，底部放置“领券 / 购买”操作条，完成顶部胶囊避让与底部安全区适配。

```text
onLoad:
  windowInfo = wx.getWindowInfo()
  menu = wx.getMenuButtonBoundingClientRect()
  navContentHeight = (menu.top - windowInfo.statusBarHeight) × 2 + menu.height
  setData 三项布局数据
WXML:
  fixed 导航条（statusBar 占位 + navHeight 内容区）
  等高占位节点把正文顶下
  fixed 底部条 padding-bottom 叠加 env(safe-area-inset-bottom)
```

#### 步骤约束

1. 页面 JSON 设置 `navigationStyle: custom`，高度一律动态计算，禁止写死 64/88px。
2. 导航条右侧（或标题内容）与胶囊不重叠，搜索/返回区域避开胶囊宽度加右边距。
3. 底部条在非全面屏上保留基础间距，在全面屏上叠加安全区。
4. 至少在一台刘海 iOS、一台安卓真机上验证。

#### 提交物

- 详情页四件套；
- 两种机型的顶部、底部截图；
- 计算出的 `statusBarHeight / navHeight / menuRightGap` 数值记录。

#### 验收标准

- 任意机型导航条不与状态栏、胶囊重叠；
- 底部按钮不被 Home 指示条遮挡，非全面屏无多余空白；
- 数值随机型变化，代码中无魔法高度常量。

### 练习 3：深色模式接入与机型矩阵走查

#### 任务

为首页和详情页接入深色模式，并按机型矩阵完成一次结构化走查。

```css
@media (prefers-color-scheme: dark) {
  page {
    --bg: #000;
    --card: #16181d;
    --text: #e6e8eb;
    --sub: #9aa0a8;
    --line: #2a2d33;
  }
}
```

#### 步骤约束

1. `app.json` 开启 `darkmode` 并配置 `theme.json`，导航栏与背景色通过 `@变量` 引用。
2. 业务颜色全部改为 CSS 变量，深色下只改变量定义，不复制整段组件样式。
3. 深色下卡片层级用背景色差/描边表达，不得依赖浅色投影。
4. 走查矩阵至少包含：小屏非刘海、标准刘海、大屏、一台安卓，每机型各记录浅色与深色两张截图。

#### 提交物

- `theme.json`、更新后的 `app.json` 与相关 WXSS；
- 机型矩阵走查表（机型 × 浅色/深色 × 是否通过 × 问题记录）；
- 走查中发现并修复的问题清单。

#### 验收标准

- 跟随系统切换时导航、背景、卡片、文字、分割线全部正确；
- 深色下无白底块、无低对比文字、无不可见分割线；
- 走查表问题闭环，无“未验证/未处理”项。

## 阶段验收作业

本作业是阶段一“静态界面还原能力”的综合证据点，重点证明**尺寸系统理解正确、系统区域避让规范、深色模式与多机型适配真实可用**。

### 任务描述

基于「逛吃指南」完成以下界面还原与适配：

1. 首页：自定义导航栏（内含搜索框并避让胶囊）+ 信息流笔记卡片列表（封面图、店名、摘要、标签、人均）。
2. 详情页：头图区域延伸到状态栏下方，标题与门店信息区、底部“领券购买”操作条。
3. 两个页面完整接入深色模式；所有内容性图片有合理 `mode` 与占位处理。
4. 提交一份覆盖不少于四类机型、浅色与深色双主题的适配走查报告。

### 完成标准

- 能现场解释 rpx 原理、750 稿换算规则以及单位选择依据；
- 自定义导航高度由 `statusBarHeight` 与胶囊信息动态算出，全机型不遮挡；
- 贴底元素在全面屏与非全面屏上间距都合理；
- 深色模式全要素跟随，极端文案、无图/长图等边界数据界面不破；
- iOS、安卓真机各验证至少一台，走查报告问题闭环。

### 评分要点（100 分）

| 维度 | 分值 | 要点 |
|---|---:|---|
| 设计稿还原度 | 20 | 750 稿换算正确，版式、间距、圆角与稿子一致 |
| rpx 与单位系统 | 15 | 单位选择合理，发丝线、安全区处理规范 |
| 自定义导航避让 | 20 | 状态栏/胶囊动态计算，搜索区与内容不重叠 |
| 安全区适配 | 15 | 顶部沉浸、底部 Home 指示条、横屏意识 |
| 深色模式 | 15 | theme.json 与媒体查询完整，层级与对比合理 |
| 代码组织 | 10 | 变量与公共样式抽离，class 命名清晰 |
| 走查报告 | 5 | 机型矩阵完整、问题记录与修复闭环 |

### 强制不通过条件

- 导航高度写死常量，或在任一受测机型上与状态栏、胶囊按钮重叠；
- 底部操作条被 Home 指示条遮挡，或深色模式存在白底块/黑底黑字等明显错误；
- 使用了不保证支持的选择器、本地背景图等在真机上失效的写法且未修复；
- 未提供真机证据或走查机型少于四类；
- 代码中出现 `document`、`window` 等逻辑层不存在的 DOM/BOM 调用。

完成本作业后，学员已具备把任意设计稿稳定还原到多机型的能力，进入 U08「事件系统与交互反馈」，让这些界面真正“点得动、有回应”。
