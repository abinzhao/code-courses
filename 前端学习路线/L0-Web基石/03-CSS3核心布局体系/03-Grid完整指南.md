# 03-Grid 完整指南

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[02-Flexbox 完整指南](./02-Flexbox完整指南.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN CSS](https://developer.mozilla.org/docs/Web/CSS)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 掌握 Grid 容器的核心属性，能快速搭建二维网格布局
- 理解 `fr` 单位、`minmax()`、`auto-fill` 和 `auto-fit` 的用法与区别
- 掌握 Grid 项目的行列定位（`grid-column`、`grid-row`、`grid-area`）
- 能用 `grid-template-areas` 以可视化方式描述布局
- 理解 Grid vs Flexbox 的选择决策，做到该用哪个用哪个
- 用 Grid 实现 12 列网格系统和响应式后台管理布局

---

## 内容讲解

### 一、Grid 核心理念

CSS Grid 是 **二维布局系统**——同时控制行和列。如果说 Flexbox 是"一维排列"（要么管行，要么管列），Grid 就是"网格画布"（行列一起管）。

```
┌──────┬──────┬──────┐
│  1,1 │  1,2 │  1,3 │  ← 第 1 行
├──────┼──────┼──────┤
│  2,1 │  2,2 │  2,3 │  ← 第 2 行
├──────┼──────┼──────┤
│  3,1 │  3,2 │  3,3 │  ← 第 3 行
└──────┴──────┴──────┘
  ↑       ↑       ↑
  列1     列2     列3
```

**一句话区分 Grid 和 Flexbox：**
- 固定列数、同时控制行列 → **Grid**
- 内容驱动、只关心一排或一列 → **Flexbox**

### 二、Grid 容器属性

#### 2.1 开启 Grid

```css
.container {
  display: grid;          /* 块级网格容器 */
  /* display: inline-grid;   行内级网格容器 */
}
```

#### 2.2 定义列和行：`grid-template-columns` / `grid-template-rows`

这是 Grid 最核心的属性：

```css
.grid {
  display: grid;
  /* 3 列：各 200px */
  grid-template-columns: 200px 200px 200px;

  /* 2 行：第一行 100px，第二行 150px */
  grid-template-rows: 100px 150px;
}
```

**`repeat()` 函数**——重复定义：

```css
/* 等价于 200px 200px 200px */
grid-template-columns: repeat(3, 200px);

/* 等价于 200px 300px 200px 300px */
grid-template-columns: repeat(2, 200px 300px);
```

#### 2.3 `fr` 单位——Grid 的灵魂

`fr`（fraction）表示**可用空间的一份**：

```css
/* 3 列等分 */
grid-template-columns: 1fr 1fr 1fr;

/* 中间列占 2 份，两侧各占 1 份 */
grid-template-columns: 1fr 2fr 1fr;

/* fr 和固定值混用：侧栏 200px，主内容占满剩余 */
grid-template-columns: 200px 1fr;
```

**`fr` 的计算方式**：可用空间 = 容器宽度 - 固定列宽 - gap，剩余部分按 fr 比例分配。

```html
<style>
  .fr-demo { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 10px; width: 600px; }
  .fr-demo > div { padding: 20px; color: white; text-align: center; }
  .fr-demo > div:nth-child(1) { background: #4a90d9; }
  .fr-demo > div:nth-child(2) { background: #e8734a; }
  .fr-demo > div:nth-child(3) { background: #50b86c; }
</style>
<div class="fr-demo">
  <div>1fr ≈ 145px</div>
  <div>2fr ≈ 290px</div>
  <div>1fr ≈ 145px</div>
</div>
```

#### 2.4 `minmax()`——设置尺寸范围

```css
/* 每列最小 200px，最大 1fr（均分剩余） */
grid-template-columns: repeat(3, minmax(200px, 1fr));

/* 侧栏最小 150px，最大不超过 300px */
grid-template-columns: minmax(150px, 300px) 1fr;
```

#### 2.5 `auto-fill` vs `auto-fit`——自动列数

这是 Grid 实现响应式不依赖 `@media` 的秘诀：

```css
/* auto-fill：容器宽度能放多少列就放多少列，留出空轨道 */
.container-auto-fill {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

/* auto-fit：同上，但多余的空轨道会被折叠（现有列拉伸填充） */
.container-auto-fit {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

**直观区别**（假设容器宽 700px）：

```
auto-fill: [200px][200px][200px]_空轨道_
           → 3 列 + 空白

auto-fit:  [233px][233px][233px]
           → 3 列拉伸填满
```

**什么时候用哪个？**
- 需要固定列宽（如产品列表）→ `auto-fill`
- 需要填满容器（如卡片网格但卡片少时也要铺满）→ `auto-fit`

#### 2.6 行/列间距：`gap`

```css
.grid {
  gap: 20px;              /* 行列统一 */
  /* gap: 20px 10px;        行 20px，列 10px */
  /* row-gap: 20px; */
  /* column-gap: 10px; */
}
```

#### 2.7 网格对齐：`justify-items` / `align-items`

```css
.grid {
  justify-items: stretch;  /* 默认：子元素水平拉伸填充格子 */
  align-items: stretch;    /* 默认：子元素垂直拉伸填充格子 */

  /* 可选值：start / end / center / stretch */
}
```

**快捷写法：**

```css
.grid {
  place-items: center;     /* = align-items: center; justify-items: center; */
}
```

#### 2.8 整个网格对齐：`justify-content` / `align-content`

当网格总尺寸小于容器时，控制整体网格在容器中的位置：

```css
.grid {
  justify-content: center;  /* 网格水平居中 */
  align-content: center;    /* 网格垂直居中 */
  /* place-content: center;  快捷写法 */
}
```

#### 2.9 `grid-template-areas`——可视化布局

这是 Grid 最直观的布局方式：

```css
.layout {
  display: grid;
  grid-template-areas:
    "header  header  header"
    "sidebar content aside"
    "footer  footer  footer";
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: 60px 1fr 60px;
  min-height: 100vh;
}

.header  { grid-area: header;  background: #333; color: white; padding: 15px; }
.sidebar { grid-area: sidebar; background: #e8f4fd; padding: 15px; }
.content { grid-area: content; background: #fff; padding: 15px; }
.aside   { grid-area: aside;   background: #fde8e8; padding: 15px; }
.footer  { grid-area: footer;  background: #333; color: white; padding: 15px; }
```

```html
<div class="layout">
  <header class="header">Header</header>
  <nav class="sidebar">Sidebar</nav>
  <main class="content">Content</main>
  <aside class="aside">Aside</aside>
  <footer class="footer">Footer</footer>
</div>
```

**`grid-template-areas` 的优势**：布局一目了然，修改布局只需改 CSS 中的 ASCII 图。

### 三、Grid 项目属性

#### 3.1 行列定位：`grid-column` / `grid-row`

Grid 的网格线编号从 1 开始（不是从 0）：

```
  1        2        3        4
  ├────────┼────────┼────────┤
  │        │        │        │
  │  1 / 2 │  2 / 3 │  3 / 4 │
  │        │        │        │
  ├────────┼────────┼────────┤
```

```css
.item {
  /* 从第 1 条列线到第 3 条列线（跨 2 列） */
  grid-column: 1 / 3;

  /* 从第 2 条行线到第 4 条行线（跨 2 行） */
  grid-row: 2 / 4;

  /* 简写：grid-column-start / grid-column-end */
  /* grid-column-start: 1; grid-column-end: 3; */
}
```

**`span` 关键字**——"跨几格"：

```css
.item {
  grid-column: span 2;   /* 跨 2 列 */
  grid-column: 1 / span 2; /* 从第 1 条线开始，跨 2 列（= 1 / 3） */
}
```

#### 3.2 `grid-area`——更简洁的定位

```css
.item {
  /* grid-area: row-start / col-start / row-end / col-end */
  grid-area: 1 / 2 / 4 / 4;
  /* 等价于：从第1行线到第4行线，从第2列线到第4列线 */
}

/* 也用于配合 grid-template-areas */
.item-header { grid-area: header; }
```

#### 3.3 单独对齐：`justify-self` / `align-self`

```css
.item {
  justify-self: center;  /* 在当前格子内水平居中 */
  align-self: center;    /* 在当前格子内垂直居中 */
  /* place-self: center;   快捷写法 */
}
```

### 四、Grid 隐式网格

当你定义的格子不够时，Grid 会自动创建新的行/列——这叫隐式网格：

```css
.grid {
  grid-template-columns: repeat(3, 1fr);
  /* 只定义了 2 行，第 3 行及以后是隐式的 */

  /* 控制隐式行的高度 */
  grid-auto-rows: 100px;

  /* 隐式列的宽度 */
  /* grid-auto-columns: 200px; */

  /* 隐式元素的排列方向 */
  grid-auto-flow: row;  /* 默认：逐行填充 */
  /* grid-auto-flow: column;  逐列填充 */
  /* grid-auto-flow: dense;   紧密填充（会打乱顺序填满空隙） */
}
```

### 五、Grid vs Flexbox：决策指南

| 场景 | 选择 | 原因 |
|------|------|------|
| 页面整体布局（header + 侧栏 + 内容 + footer） | **Grid** | 二维、固定结构 |
| 导航栏 / 工具栏 | **Flexbox** | 一维排列 |
| 卡片网格（固定列数） | **Grid** | 行列同时控制 |
| 标签列表 / 面包屑 | **Flexbox** | 内容驱动、自然换行 |
| 表单布局（标签 + 输入框） | **Grid** | 行列对齐 |
| 垂直居中单个元素 | **Flexbox** | 更简洁 |
| Dashboard 布局 | **Grid** | 复杂二维 |
| 等分列（不确定元素数量） | **Flexbox** | flex: 1 自动均分 |
| 响应式列数（不依赖 @media） | **Grid** | auto-fill + minmax |

### 六、经典布局

#### 6.1 12 列网格系统

```css
.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}
.col-4  { grid-column: span 4; }   /* 占 4 列 */
.col-6  { grid-column: span 6; }   /* 占 6 列 */
.col-8  { grid-column: span 8; }   /* 占 8 列 */
.col-12 { grid-column: span 12; }  /* 占满 */
```

#### 6.2 重叠元素

Grid 可以让元素重叠——这在传统布局中很难做到：

```css
.overlay-grid {
  display: grid;
  grid-template: 1fr / 1fr;  /* 单格 */
}
.overlay-grid > * {
  grid-area: 1 / 1;          /* 所有元素放到同一个格子，自然重叠 */
}
.img { z-index: 1; }
.caption { z-index: 2; align-self: end; background: rgba(0,0,0,0.5); color: white; padding: 10px; }
```

#### 6.3 自适应列数

```css
/* 常用的响应式 Grid 写法 */
.responsive-grid {
  display: grid;
  /* 窄于 250px 时允许列收缩到容器宽度，其他情况每列至少 250px */
  grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
  gap: 20px;
}
/* 卡片列数可随可用空间变化；复杂布局仍可能需要容器查询或媒体查询 */
```

### 七、实战：响应式后台管理布局

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Grid 后台布局实战</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #333;
  }

  /* ===== 整体布局用 Grid ===== */
  .dashboard {
    display: grid;
    /* 移动优先：单列布局 */
    grid-template-areas:
      "header"
      "nav"
      "main"
      "footer";
    grid-template-columns: 1fr;
    grid-template-rows: 56px auto 1fr 40px;
    min-height: 100vh;
  }

  /* 宽屏：侧栏布局 */
  @media (min-width: 768px) {
    .dashboard {
      grid-template-areas:
        "header  header"
        "nav     main"
        "footer  footer";
      grid-template-columns: 220px 1fr;
      grid-template-rows: 56px 1fr 40px;
    }
  }

  /* ===== 区域分配 ===== */
  .d-header { grid-area: header;   background: #1a1a2e; color: #eee; display: flex; align-items: center; padding: 0 20px; font-size: 18px; font-weight: bold; }
  .d-nav    { grid-area: nav;      background: #16213e; color: #ccc; padding: 20px; }
  .d-main   { grid-area: main;     background: #f5f6fa; padding: 20px; }
  .d-footer { grid-area: footer;   background: #1a1a2e; color: #888; display: flex; align-items: center; justify-content: center; font-size: 13px; }

  /* ===== 导航菜单（用 Flexbox） ===== */
  .d-nav ul { list-style: none; display: flex; flex-direction: column; gap: 4px; }
  .d-nav a  { display: block; padding: 10px 12px; color: #ccc; text-decoration: none; border-radius: 6px; transition: background 0.2s; }
  .d-nav a:hover,
  .d-nav a.active { background: rgba(255,255,255,0.1); color: #4a90d9; }

  /* ===== 统计卡片网格 ===== */
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  .stat-card {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
  .stat-card .label { font-size: 13px; color: #888; margin-bottom: 8px; }
  .stat-card .value { font-size: 28px; font-weight: bold; color: #1a1a2e; }

  /* ===== 内容区两栏 ===== */
  .content-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;       /* 图表区 2 份，列表区 1 份 */
    gap: 20px;
  }
  @media (max-width: 900px) {
    .content-grid {
      grid-template-columns: 1fr;           /* 小屏单列 */
    }
  }
  .chart-panel,
  .list-panel {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  }
  .chart-placeholder {
    background: linear-gradient(135deg, #667eea, #764ba2);
    height: 200px;
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    color: white;
    font-size: 16px;
  }
  .list-panel ul { list-style: none; }
  .list-panel li {
    padding: 12px 0;
    border-bottom: 1px solid #eee;
    display: flex; justify-content: space-between;
  }
  .list-panel li:last-child { border-bottom: none; }
  .list-panel .time { color: #aaa; font-size: 13px; }
</style>
</head>
<body>

<div class="dashboard">
  <header class="d-header">Admin Dashboard</header>

  <nav class="d-nav">
    <ul>
      <li><a href="#" class="active">📊 仪表盘</a></li>
      <li><a href="#">📝 内容管理</a></li>
      <li><a href="#">👥 用户管理</a></li>
      <li><a href="#">📈 数据分析</a></li>
      <li><a href="#">⚙️ 系统设置</a></li>
    </ul>
  </nav>

  <main class="d-main">
    <!-- 统计卡片 -->
    <div class="stats">
      <div class="stat-card">
        <div class="label">总用户数</div>
        <div class="value">12,847</div>
      </div>
      <div class="stat-card">
        <div class="label">今日访问</div>
        <div class="value">3,421</div>
      </div>
      <div class="stat-card">
        <div class="label">转化率</div>
        <div class="value">24.8%</div>
      </div>
      <div class="stat-card">
        <div class="label">总收入</div>
        <div class="value">¥89.2K</div>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="content-grid">
      <div class="chart-panel">
        <h3 style="margin-bottom:16px;">访问趋势</h3>
        <div class="chart-placeholder">📈 图表占位区</div>
      </div>
      <div class="list-panel">
        <h3 style="margin-bottom:12px;">最近活动</h3>
        <ul>
          <li><span>用户 A 完成了注册</span><span class="time">5 分钟前</span></li>
          <li><span>用户 B 提交了订单</span><span class="time">12 分钟前</span></li>
          <li><span>系统自动备份完成</span><span class="time">28 分钟前</span></li>
          <li><span>用户 C 更新了资料</span><span class="time">1 小时前</span></li>
          <li><span>新评论待审核</span><span class="time">2 小时前</span></li>
        </ul>
      </div>
    </div>
  </main>

  <footer class="d-footer">© 2026 Admin Dashboard. All rights reserved.</footer>
</div>

</body>
</html>
```

---

## 常见问题

**Q1：Grid 和 Flexbox 可以嵌套使用吗？**
完全可以，而且推荐！外层页面布局用 Grid，内层组件排列（如导航菜单、按钮组）用 Flexbox。Grid 管大结构，Flexbox 管小组件。

**Q2：`auto-fill` 和 `auto-fit` 到底怎么区分？**
`auto-fill` 保留空轨道（如只有 2 个元素，但能放 4 列，会留 2 个空列）；`auto-fit` 折叠空轨道，现有列拉伸填充。日常用 `auto-fit` 更多。

**Q3：`fr` 和 `%` 有什么区别？**
`fr` 分配的是**减去 gap 和固定列后的剩余空间**；`%` 是容器宽度的百分比（不考虑 gap）。用 `1fr 1fr` 配合 `gap: 20px` 不会有溢出，用 `50% 50%` 配合 `gap` 就会撑破。

**Q4：Grid 兼容性怎么样？**
Grid 的核心布局能力已被主流现代浏览器广泛支持，但子网格、masonry 等较新特性的支持范围不同。应按项目的浏览器基线检查具体属性；若仍需支持 IE11，它实现的是较早规范，不能靠简单添加 `-ms-` 前缀获得等价行为。

**Q5：怎么让 Grid 的一个格子内容超出后显示省略号？**
和 Flexbox 同理：给该元素设置 `min-width: 0`、`overflow: hidden`、`text-overflow: ellipsis`、`white-space: nowrap`。

**Q6：可以用 Grid 实现瀑布流吗？**
原生 masonry 的实现状态和语法仍可能因浏览器而异，使用前应检查项目目标版本并准备渐进增强。需要稳定跨浏览器时，可使用经过验证的 JavaScript 布局库；CSS Columns 能形成视觉瀑布流，但阅读顺序是按列排列，使用前要验证键盘和辅助技术体验。

**Q7：`grid-template-areas` 比直接用 grid-column/grid-row 好在哪？**
可读性。ASCII 图一眼就能看清布局结构，后续维护时不用心算行列号。团队项目中尤其推荐。

---

## 实操作业

### 基础练习：照片画廊

用 Grid 实现一个响应式照片画廊：
- 默认 4 列，平板 3 列，手机 2 列
- 用 `object-fit: cover` 保持图片比例
- 每张图片正方形（用 `aspect-ratio: 1` 或 padding 技巧）

### 进阶练习：CMS 文章列表

用 Grid 实现文章列表布局：
- 第一篇文章占 2 列并跨 2 行（特色文章）
- 其余文章均分剩余网格
- 响应式：手机端全部单列
- 提示：用 `grid-column: span 2` + `grid-row: span 2`

### 挑战练习：CSS Layout Generator

只用一个 HTML 结构，通过切换 CSS 类来实现 3 种完全不同的布局。用 `grid-template-areas` 分别定义：
1. 博客布局（header + 文章 + 侧栏 + footer）
2. 产品页布局（header + 主图 | 详情 + 相关推荐 + footer）
3. 登录页布局（居中表单，header 和 footer 最小化）

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：把“Grid 完整指南”应用到 Atlas 的 HTML/CSS 交互界面，覆盖窄屏、键盘操作和至少一个失败状态。
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

- Grid 适合同时控制行与列的二维布局，**`grid-template-columns` + `fr`** 是常用组合
- `repeat(auto-fit, minmax(min(250px, 100%), 1fr))` 是一种无需固定断点的响应式网格写法
- `grid-template-areas` 让布局可视化，推荐在中小项目中优先使用
- Grid 管页面大结构，Flexbox 管组件内排列——两者配合效果最佳
- 掌握 Grid 后，你会发现以前用 float + clearfix 的布局方式简直是石器时代

<!-- course-nav:start -->
---

[上一篇：02-Flexbox 完整指南](./02-Flexbox完整指南.md) · [课程地图](../../README.md) · [下一篇：04-层叠上下文与 z-index](./04-层叠上下文与z-index.md)
<!-- course-nav:end -->
