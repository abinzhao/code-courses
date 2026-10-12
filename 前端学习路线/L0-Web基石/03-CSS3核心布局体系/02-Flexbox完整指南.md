# 02-Flexbox 完整指南

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[01-盒模型与视觉格式化模型](./01-盒模型与视觉格式化模型.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN CSS](https://developer.mozilla.org/docs/Web/CSS)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 掌握 Flex 容器的 7 个核心属性，能快速搭建水平/垂直/两端对齐等布局
- 掌握 Flex 项目的 5 个核心属性，理解 `flex-grow`、`flex-shrink`、`flex-basis` 的协作机制
- 彻底搞懂 `flex: 1` 到底等于什么，能正确使用 `flex` 简写
- 用 Flexbox 实现水平居中、垂直居中、圣杯布局、等分列、粘性页脚等经典布局
- 理解 `min-width: 0` 崩溃问题和 `auto margin` 的妙用

---

## 内容讲解

### 一、Flexbox 核心理念

Flexbox（弹性布局）是 CSS3 引入的一维布局模型。它的核心思想是：**让容器有能力改变子元素的宽高和顺序，以最佳方式填充可用空间。**

记住一句话：**Flexbox 是一维布局——要么管行，要么管列，不同时管两个方向。**

```
弹性容器（display: flex）
│
├── 主轴（main axis）—— 由 flex-direction 决定方向
│   ├── main start → main end
│   └── 子元素沿主轴排列
│
└── 交叉轴（cross axis）—— 垂直于主轴
    ├── cross start → cross end
    └── 子元素沿交叉轴对齐
```

### 二、Flex 容器属性（作用于父元素）

#### 2.1 开启 Flex：`display: flex`

```css
.container {
  display: flex;       /* 块级弹性容器 */
  /* display: inline-flex; */ /* 行内级弹性容器 */
}
```

一旦设置 `display: flex`，容器变成了 **flex container**，子元素变成了 **flex items**。子元素的 `float`、`clear`、`vertical-align` 全部失效。

#### 2.2 主轴方向：`flex-direction`

```css
.container {
  flex-direction: row;            /* 默认：主轴水平，从左到右 */
  /* flex-direction: row-reverse;   主轴水平，从右到左 */
  /* flex-direction: column;        主轴垂直，从上到下 */
  /* flex-direction: column-reverse;主轴垂直，从下到上 */
}
```

```html
<style>
  .demo-row { display: flex; flex-direction: row; gap: 10px; }       /* → → → */
  .demo-col { display: flex; flex-direction: column; gap: 10px; }    /* ↓ ↓ ↓ */
  .item { background: #4a90d9; color: white; padding: 10px 20px; }
</style>
<div class="demo-row">
  <span class="item">A</span><span class="item">B</span><span class="item">C</span>
</div>
<!-- column 版本就是竖着一列 -->
```

#### 2.3 换行：`flex-wrap`

```css
.container {
  flex-wrap: nowrap;       /* 默认：不换行，子元素会压缩 */
  /* flex-wrap: wrap;         换行，超出则折到下一行 */
  /* flex-wrap: wrap-reverse; 换行，但交叉轴方向反转 */
}
```

#### 2.4 主轴对齐：`justify-content`

```css
.container {
  /* 默认：左对齐 */
  justify-content: flex-start;

  /* 右对齐 */
  /* justify-content: flex-end; */

  /* 居中 */
  /* justify-content: center; */

  /* 两端对齐，首尾贴边，中间均分 */
  /* justify-content: space-between; */

  /* 均分空间，每个子元素两侧间距相等 */
  /* justify-content: space-around; */

  /* 均分空间，子元素之间间距相等（含首尾） */
  /* justify-content: space-evenly; */
}
```

**直观对比（假设 3 个子元素）：**

```
flex-start:   [A][B][C]___________
center:       ____[A][B][C]_____
flex-end:     ___________[A][B][C]
space-between:[A]____[B]____[C]   ← 首尾无空隙
space-around: _[A]__[B]__[C]_     ← 两端间距是中间的一半
space-evenly: _[A]__[B]__[C]_     ← 所有间距完全相等
```

#### 2.5 交叉轴对齐：`align-items`

```css
.container {
  align-items: stretch;      /* 默认：拉伸填满交叉轴 */
  /* align-items: flex-start;   顶部对齐 */
  /* align-items: flex-end;     底部对齐 */
  /* align-items: center;       居中对齐 → 这就是垂直居中的核心 */
  /* align-items: baseline;     文字基线对齐 */
}
```

**单行水平居中 + 垂直居中**（最常用的组合）：

```css
.container {
  display: flex;
  justify-content: center;  /* 主轴居中（默认水平） */
  align-items: center;      /* 交叉轴居中（默认垂直） */
  height: 200px;
}
```

#### 2.6 多行对齐：`align-content`

仅当 `flex-wrap: wrap` 且有多行时才生效：

```css
.container {
  flex-wrap: wrap;
  align-content: center;     /* 多行在交叉轴上居中 */
  /* align-content: space-between;  多行两端对齐 */
  /* 取值与 justify-content 一致 */
}
```

#### 2.7 间距：`gap`

```css
.container {
  display: flex;
  gap: 20px;           /* 行列统一间距 */
  /* gap: 20px 10px;     行间距20px，列间距10px */
  /* row-gap: 20px;      仅设置行间距 */
  /* column-gap: 10px;   仅设置列间距 */
}
```

**`gap` 的优势：** 只在子元素之间生效，首尾没有多余空隙，比 `margin` 简洁得多。

### 三、Flex 项目属性（作用于子元素）

#### 3.1 `flex-grow`：放大比例

```css
.item {
  flex-grow: 0;   /* 默认：不放大 */
  /* flex-grow: 1;   占满剩余空间，多个元素按比例分配 */
  /* flex-grow: 2;   占据 2 份，另一个 flex-grow: 1 的占 1 份 */
}
```

```html
<style>
  .flex-demo { display: flex; width: 400px; }
  .grow-1 { flex-grow: 1; background: #4a90d9; }
  .grow-2 { flex-grow: 2; background: #e8734a; }
  .grow-1, .grow-2 { padding: 10px; color: white; margin: 2px; }
</style>
<div class="flex-demo">
  <div class="grow-1">grow:1 → 1/3</div>
  <div class="grow-2">grow:2 → 2/3</div>
</div>
```

#### 3.2 `flex-shrink`：缩小比例

```css
.item {
  flex-shrink: 1;   /* 默认：空间不足时等比例缩小 */
  /* flex-shrink: 0;   不缩小，保持原始尺寸 */
  /* flex-shrink: 2;   缩小速度是其他元素的 2 倍 */
}
```

#### 3.3 `flex-basis`：基准尺寸

```css
.item {
  flex-basis: auto;    /* 默认：使用元素自身 width/height */
  /* flex-basis: 200px;   基准宽度 200px */
  /* flex-basis: 0;       基准为 0，配合 flex-grow 等分空间 */
}
```

**关键理解**：`flex-basis` 是元素在分配剩余空间**之前**的初始尺寸。

#### 3.4 `flex` 简写——彻底搞懂 `flex: 1`

```css
/* flex 是 flex-grow、flex-shrink、flex-basis 的简写 */
flex: <flex-grow> <flex-shrink> <flex-basis>;

/* 常用预设值 */
flex: initial;   /* = flex: 0 1 auto    不放大，会缩小，基准 auto */
flex: auto;      /* = flex: 1 1 auto    可放大缩小，基准 auto */
flex: none;      /* = flex: 0 0 auto    不放大不缩小，固定尺寸 */
flex: 1;         /* = flex: 1 1 0       可放大缩小，基准 0 */
```

**`flex: 1` 到底等于什么？**

```css
flex: 1;
/* 完全等价于： */
flex-grow: 1;
flex-shrink: 1;
flex-basis: 0;
/* 注意：flex-basis 是 0，不是 0% */
```

`flex: 1` 的真实含义：**不管内容多宽，把所有剩余空间按 grow 比例分配给子元素**。

**对比实验：**

```html
<style>
  .compare { display: flex; width: 400px; margin-bottom: 10px; }
  .compare > div { padding: 10px; color: white; }
  .basis-auto  { flex: 1 1 auto; background: #4a90d9; } /* 基准 auto */
  .basis-zero  { flex: 1 1 0;    background: #e8734a; } /* 基准 0 */
</style>

<div class="compare">
  <div class="basis-auto">短</div>
  <div class="basis-auto">这段文字比较长</div>
</div>
<!-- basis:auto → 先按内容要多少给多少，再均分剩余空间，不相等！ -->

<div class="compare">
  <div class="basis-zero">短</div>
  <div class="basis-zero">这段文字比较长</div>
</div>
<!-- basis:0 → 不管内容，严格均分，完全相等！ -->
```

**结论：要严格等分列，用 `flex: 1`（即 `flex: 1 1 0`）。**

#### 3.5 `align-self`：单独控制某个子元素的对齐

```css
.item {
  align-self: auto;        /* 继承容器的 align-items */
  /* align-self: flex-start;  顶部对齐 */
  /* align-self: flex-end;    底部对齐 */
  /* align-self: center;      居中对齐 */
  /* align-self: stretch;     拉伸 */
}
```

#### 3.6 `order`：调整排列顺序

```css
.item {
  order: 0;     /* 默认值，数字越小越靠前 */
  /* order: -1;    排到最前面 */
  /* order: 1;     排到最后面 */
}
```

注意：`order` 只影响视觉顺序，不影响 DOM 结构和屏幕阅读器的朗读顺序。

### 四、经典布局实战

#### 4.1 水平 + 垂直居中（终结版）

```css
/* 单元素完美居中 */
.center-box {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}
```

#### 4.2 圣杯布局（header + 三栏 + footer）

```html
<style>
  body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; }
  header, footer { background: #333; color: white; padding: 15px; }
  .main { display: flex; flex: 1; }  /* flex: 1 占满剩余高度 */
  .sidebar-left  { width: 200px; background: #e8f4fd; padding: 15px; }
  .content       { flex: 1; background: #fff;      padding: 15px; }
  .sidebar-right { width: 200px; background: #fde8e8; padding: 15px; }
</style>
<body>
  <header>Header</header>
  <div class="main">
    <nav class="sidebar-left">左侧栏（200px）</nav>
    <main class="content">中间内容区（flex:1 自适应）</main>
    <aside class="sidebar-right">右侧栏（200px）</aside>
  </div>
  <footer>Footer</footer>
</body>
```

#### 4.3 等分列

```css
/* 方案 A：flex: 1（基准 0，严格等分） */
.equal-cols { display: flex; }
.equal-cols > * { flex: 1; }

/* 方案 B：百分比 gap 等分（支持换行） */
.auto-cols { display: flex; flex-wrap: wrap; gap: 16px; }
.auto-cols > * {
  flex: 0 0 calc(33.333% - 10.667px); /* 3 列，减去 gap */
}
```

#### 4.4 粘性页脚（Sticky Footer）

```css
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;   /* 至少占满视口 */
}
main {
  flex: 1;             /* 主内容区占满剩余空间，把 footer 推到底部 */
}
footer {
  /* 无需额外设置，自然被 main 的 flex:1 推到底部 */
}
```

### 五、常见坑与高级技巧

#### 5.1 `min-width: 0` 崩溃问题

这是 Flexbox 最隐蔽的坑：

```html
<style>
  .flex-parent { display: flex; width: 300px; }
  .long-text   { flex: 1; white-space: nowrap; background: #f0f0f0; }
  /* 问题：长文本会撑破容器！ */
</style>
<div class="flex-parent">
  <div class="long-text">这是一段很长很长很长很长很长很长很长很长很长的文字</div>
</div>
```

**原因**：flex 项目的默认 `min-width` 是 `auto`（等于内容的宽度），导致无法收缩到比内容更窄。

**解决方案**：

```css
.long-text {
  flex: 1;
  min-width: 0;        /* 关键！允许收缩到 0 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

#### 5.2 `auto margin` 的妙用

```css
/* auto margin 在 Flexbox 中会吃掉所有剩余空间 */
.nav {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 10px 20px;
  background: #333;
  color: white;
}
.nav .logo { font-weight: bold; }
.nav .user { margin-left: auto; } /* 这会把 user 推到最右边！ */
```

```html
<nav class="nav">
  <span class="logo">Logo</span>
  <a href="#">首页</a>
  <a href="#">关于</a>
  <span class="user">👤 用户名</span>  <!-- 自动推到最右侧 -->
</nav>
```

### 六、实战：响应式导航栏 + 卡片网格

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Flexbox 实战</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  /* ===== 导航栏 ===== */
  .navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    background: #2c3e50;
    color: white;
    height: 56px;
  }
  .navbar .logo { font-size: 20px; font-weight: bold; }
  .navbar .nav-links { display: flex; gap: 24px; list-style: none; }
  .navbar .nav-links a { color: white; text-decoration: none; }
  .navbar .nav-links a:hover { text-decoration: underline; }

  /* ===== 卡片网格 ===== */
  .card-grid {
    display: flex;
    flex-wrap: wrap;          /* 允许换行 */
    gap: 20px;
    padding: 20px;
    max-width: 960px;
    margin: 0 auto;
  }
  .card {
    /* 每个卡片最小 250px，剩余空间均分，基准 0 保证严格等宽 */
    flex: 1 1 250px;
    min-width: 0;             /* 防止内容撑破 */
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    overflow: hidden;
  }
  .card img {
    width: 100%;
    height: 180px;
    object-fit: cover;        /* 图片不变形裁剪 */
    display: block;
  }
  .card-body { padding: 16px; }
  .card-body h3 { margin-bottom: 8px; font-size: 18px; }
  .card-body p  { color: #666; line-height: 1.6; font-size: 14px; }

  /* ===== 响应式 ===== */
  @media (max-width: 600px) {
    .navbar { flex-direction: column; height: auto; gap: 10px; padding: 10px; }
    .navbar .nav-links { gap: 16px; }
    .card { flex: 1 1 100%; }  /* 小屏幕单列 */
  }
</style>
</head>
<body>

<nav class="navbar">
  <div class="logo">MySite</div>
  <ul class="nav-links">
    <li><a href="#">首页</a></li>
    <li><a href="#">博客</a></li>
    <li><a href="#">关于</a></li>
    <li><a href="#">联系</a></li>
  </ul>
</nav>

<div class="card-grid">
  <div class="card">
    <img src="https://picsum.photos/400/200?random=1" alt="">
    <div class="card-body">
      <h3>Flexbox 入门</h3>
      <p>掌握弹性布局的核心概念，从容器属性到项目属性，一站式学会 Flexbox。</p>
    </div>
  </div>
  <div class="card">
    <img src="https://picsum.photos/400/200?random=2" alt="">
    <div class="card-body">
      <h3>Grid 布局</h3>
      <p>CSS Grid 是二维布局的终极方案，和 Flexbox 配合使用效果最佳。</p>
    </div>
  </div>
  <div class="card">
    <img src="https://picsum.photos/400/200?random=3" alt="">
    <div class="card-body">
      <h3>响应式设计</h3>
      <p>用媒体查询 + Flexbox/Grid 打造适配所有屏幕尺寸的现代网页。</p>
    </div>
  </div>
</div>

</body>
</html>
```

---

## 常见问题

**Q1：`flex: 1` 和 `flex: auto` 有什么区别？**
`flex: 1` = `1 1 0`（基准 0，严格按 grow 比例分配）；`flex: auto` = `1 1 auto`（基准 auto，先按内容分配，再分剩余空间）。要等分列用 `flex: 1`。

**Q2：为什么我的 flex 元素不换行？**
因为 `flex-wrap` 默认是 `nowrap`。显式设置 `flex-wrap: wrap` 即可。

**Q3：Flexbox 能做瀑布流吗？**
不能直接做。Flexbox 是一维的，瀑布流是二维不规则布局，需要用 CSS Grid 的 `masonry`（实验性）或 JavaScript 方案。

**Q4：`order` 可以用于无障碍场景吗？**
不可以。`order` 只改变视觉顺序，屏幕阅读器仍按 DOM 顺序朗读。不要用 `order` 实现关键内容的逻辑重排。

**Q5：text-overflow: ellipsis 在 flex 子元素中不生效？**
经典问题。需要给该子元素加 `min-width: 0` 和 `overflow: hidden`。

**Q6：Flexbox 和 Grid 怎么选？**
一维排列用 Flexbox（导航栏、工具栏、简单列表）；二维网格用 Grid（页面整体布局、卡片网格）。两者不互斥，可以嵌套使用。

**Q7：`gap` 和 `margin` 在 Flex 中哪个更好？**
`gap` 更好。它只在元素之间生效、支持响应式、不会产生多余的外边距。现代浏览器已全面支持。

---

## 实操作业

### 基础练习：导航栏三件套

实现一个导航栏，要求：Logo 左对齐，菜单项居中，用户头像和退出按钮右对齐。用 `auto margin` 实现，不要用 `position`。

### 进阶练习：自适应卡片网格

用 Flexbox 实现一个卡片网格，要求：
- 每行至少 3 列，宽度不够时自动换行
- 每列最小 280px，多余空间均分
- 卡片内包含图片、标题、描述和底部操作按钮
- 操作按钮始终贴底（用 `margin-top: auto` 或嵌套 flex 实现）

### 挑战练习：聊天布局

用 Flexbox 实现一个聊天应用布局：
- header 固定顶部
- 消息列表区占满剩余空间，内容溢出可滚动
- 输入框区域固定底部
- 消息气泡用 `auto margin` 实现左右对齐（自己的消息靠右，对方消息靠左）

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：把“Flexbox 完整指南”应用到 Atlas 的 HTML/CSS 交互界面，覆盖窄屏、键盘操作和至少一个失败状态。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

- Flexbox 是一维布局利器，记住**主轴 + 交叉轴**的思维模型
- `justify-content` 管主轴，`align-items` 管交叉轴（单行），`align-content` 管多行交叉轴
- `flex: 1` = `flex: 1 1 0`，是严格等分列的秘诀
- `min-width: 0` 是解决 Flex 子元素内容溢出的银弹
- `auto margin` 在 Flex 中可以"吃掉"剩余空间，实现元素推边效果
- 能 Flexbox 解决的就不要用 float/position，代码更简洁、更易维护

<!-- course-nav:start -->
---

[上一篇：01-盒模型与视觉格式化模型](./01-盒模型与视觉格式化模型.md) · [课程地图](../../README.md) · [下一篇：03-Grid 完整指南](./03-Grid完整指南.md)
<!-- course-nav:end -->
