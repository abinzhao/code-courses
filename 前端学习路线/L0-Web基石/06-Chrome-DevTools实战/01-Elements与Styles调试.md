# 01 — Elements 与 Styles 调试

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[03 — DNS、TCP、TLS 握手过程](../05-网络基础与HTTP/03-DNS-TCP-TLS握手过程.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Chrome DevTools](https://developer.chrome.com/docs/devtools/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 掌握 Elements 面板的 DOM 树操作：增删改节点、右键菜单功能、拖拽排序
- 熟练使用 Styles 面板查看、编辑、过滤 CSS 规则，理解 :hov 状态切换的价值
- 能通过 Computed 面板追踪任意元素的最终计算值，看懂盒模型可视化
- 理解 CSS 选择器优先级（Specificity）的计算规则，能在 DevTools 中快速定位覆盖问题
- 掌握颜色选择器、阴影编辑器、贝塞尔曲线编辑器的使用
- 能在 DevTools 中从零调试一个布局错乱的页面

---

## 内容讲解

### 一、Elements 面板全景

#### 1.1 打开 Elements 面板

```
方式一：F12 → 点击 Elements 标签
方式二：Cmd+Option+C（Mac）/ Ctrl+Shift+C（Windows）→ 直接进入元素选择模式
方式三：在页面上右键 → 检查（Inspect）
```

打开后你会看到三个区域：

```
┌──────────────────────┬──────────────────────┐
│   ① DOM 树视图        │   ② Styles / Computed │
│   （页面结构）         │   （CSS 规则查看/编辑） │
│                      │                      │
│   <html>             │   .header {          │
│     <head>...</head> │     color: red;      │
│     <body>           │     font-size: 16px; │
│       <div class=    │   }                  │
│         "header">    │                      │
│         ...          │                      │
├──────────────────────┴──────────────────────┤
│   ③ 底部工具栏（筛选器、控制台快捷入口等）     │
└─────────────────────────────────────────────┘
```

#### 1.2 DOM 树的基本操作

**选中元素** → 把鼠标移到 DOM 树中的某一行，页面上对应的元素会高亮显示。点击即选中。

**编辑 HTML** → 右键某个元素 → Edit as HTML，可以直接修改 HTML 源码并实时看到效果。

```html
<!-- 选中这段代码 -->
<div class="card">
  <h2>标题</h2>
</div>

<!-- 右键 → Edit as HTML，改成 -->
<div class="card highlight">
  <h2>修改后的标题</h2>
  <p>新增的描述文字</p>
</div>
<!-- 改完后按 Cmd+Enter 确认，页面立刻更新 -->
```

**增删改节点**：

```
双击元素内的文本 → 直接编辑文字内容
拖拽某个元素 → 移动到 DOM 树中的新位置
选中元素 → 按 Delete 键 → 从 DOM 树中删除
选中元素 → 右键 → Copy → Copy element → 拿到完整 HTML 片段
选中元素 → 右键 → Copy → Copy selector → 拿到 CSS 选择器路径
```

#### 1.3 右键菜单高频功能

| 功能 | 快捷键 | 用途 |
|---|---|---|
| **Edit as HTML** | — | 自由编辑元素及其子元素的完整 HTML |
| **Force state → :hover / :active / :focus / :visited** | — | 强制元素保持某种伪类状态，调试交互样式不用真的去悬停 |
| **Break on → subtree modifications / attribute modifications / node removal** | — | 在 DOM 发生变化时自动断点，定位哪段 JS 在操作 DOM |
| **Copy → Copy JS path** | — | 生成 `document.querySelector("...")` 路径，方便在 Console 中用 |
| **Scroll into view** | — | 把页面滚动到该元素可见的位置 |

> **实操技巧**：你在页面上看到一个元素一闪而过就被 JS 移除了？右键它的父元素 → Break on → node removal，刷新页面，DevTools 会在 JS 删除该节点的位置停下来，调用栈一目了然。

#### 1.4 元素选择模式（Inspector）

点击 DevTools 左上角的 **箭头图标**（`Cmd+Shift+C`），鼠标移动到页面任意元素上方时会自动高亮并显示：

```
┌────────────────────┐
│ div.card.highlight │ ← 标签名 + class
│ 300 × 200          │ ← 宽 × 高
└────────────────────┘
```

点击即可快速在 DOM 树中定位该元素。

---

### 二、Styles 面板详解

#### 2.1 面板结构

```
Styles            Computed   Layout   Event Listeners
─────────────────────────────────────────────────────
element.style {          ← 元素的内联样式（最高优先级编辑区）
  ← 这里可以直接写 CSS
}

.card {                  ← 来自 style.css:12 的规则
  background: #fff;      ← 每个属性右侧有来源文件名和行号
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.card.highlight {        ← 被覆盖的规则会显示删除线
  background: ye̶l̶l̶o̶w̶;   ← 说明有更高优先级的规则覆盖了它
}
```

#### 2.2 CSS 规则编辑

**增删改属性**：

```
点击任意属性值 → 键盘上下箭头微调数值（按住 Shift 每次 ±10，按住 Cmd 每次 ±0.1）
双击空白区域 → 输入新属性名 → Tab → 输入属性值
点击属性名前面的复选框 → 快速开关该属性
点击属性值 → 输入新值，支持自动补全（输入 "c" 提示 "color", "cursor" 等）
```

**过滤（Filter）**：Styles 面板顶部有一个 **Filter** 输入框，输入 `color`，只显示包含 "color" 的属性。这个功能在规则堆积如山时非常有用。

```
Filter: [margin           ]  ← 输入 "margin"
→ 只显示 margin-top, margin-left 等相关属性，其他统统隐藏
```

#### 2.3 :hov 状态切换

`:hov` 按钮在 Styles 面板的右上角。点击它，你可以勾选：

```
☐ :hover     ← 强制元素保持鼠标悬停状态
☐ :active    ← 强制元素保持鼠标按下状态
☐ :focus     ← 强制元素保持聚焦状态
☐ :focus-visible
☐ :visited   ← 强制元素保持"已访问链接"状态
```

**典型用法**：

```css
.button {
  background: #4a90d9;
}
.button:hover {
  background: #357abd;   /* 正常情况下只有鼠标悬停才能看到这个颜色 */
}
```

勾选 `:hover` → 页面上 `.button` 立刻保持悬停样式 → 你可以在 Styles 面板中调整 `:hover` 规则的颜色，不会因为鼠标移开而切回普通状态。

#### 2.4 选择器优先级（Specificity）实战

CSS 选择器优先级的计算公式（简化为 `(a, b, c)`）：

```
内联样式     = (1, 0, 0)    最高
ID 选择器    = (0, 1, 0)    
类/属性/伪类 = (0, 0, 1)    
元素/伪元素  = (0, 0, 0)    最低
```

```css
/* 优先级 (0, 0, 1) */
.content { color: blue; }

/* 优先级 (0, 1, 1) — 胜出 */
#app .content { color: red; }

/* 优先级 (1, 0, 0) — 最高 */
<div class="content" style="color: green">
```

在 Styles 面板中，被覆盖的属性会显示**删除线**。把鼠标悬停在被覆盖的属性上，会有 Tooltip 告诉你为什么被覆盖：

```
This declaration is overridden by:
  #app .content { color: red; } ← 点它直接跳转到覆盖你的规则
```

---

### 三、Computed 面板

#### 3.1 盒模型可视化

切换到 **Computed** 标签，你会看到一个直观的盒模型图：

```
┌─────────────────────────────┐
│         margin: 20           │
│  ┌───────────────────────┐  │
│  │     border: 1           │  │
│  │  ┌─────────────────┐  │  │
│  │  │   padding: 16     │  │  │
│  │  │  ┌───────────┐  │  │  │
│  │  │  │ 300 × 200 │  │  │  │  ← 内容区
│  │  │  └───────────┘  │  │  │
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

每个区域的数值都是**可双击编辑**的。鼠标悬停在颜色区域上，页面上对应的元素会高亮该区域。

#### 3.2 最终计算值追踪

Computed 面板的核心价值：**告诉你这个元素的某个 CSS 属性最终是什么值，以及这个值是从哪里来的。**

```
color: rgb(53, 122, 189)       ← 最终计算值（浏览器把 #357abd 转换成了 rgb 格式）
  ▼ 展开后：
  #app .button — style.css:45  ← 来源规则
  .button — style.css:18       ← 被覆盖的规则（灰显）
  user agent stylesheet        ← 浏览器默认样式
```

**实战价值**：你在 Styles 面板中修改了 `width` 但没有效果？打开 Computed 面板搜 `width`，展开看看是不是被 `max-width` 或 `min-width` 限制了。

---

### 四、可视化编辑器

#### 4.1 颜色选择器

在 Styles 面板中，点击任意颜色值前面的 **色块**，弹出颜色选择器：

```
┌──────────────────────┐
│   色板                │
│                      │  点击可切换颜色格式：
│   ○ 取色器            │  • hex (#4a90d9)
│                      │  • rgb (rgb(74, 144, 217))
│   透明度滑块           │  • hsl (hsl(210, 55%, 57%))
│                      │
│  [#4a90d9]           │  ← 可直接输入
│  ──┬──              │
│   颜色渐变条           │
└──────────────────────┘
```

页面上有个神奇的功能：点击取色器后，你可以从**页面上的任意位置**吸色，甚至吸浏览器之外的区域（macOS 支持）。

#### 4.2 阴影编辑器

在 Styles 面板中，找到 `box-shadow` 属性，点击右侧的**小方框图标**：

```
box-shadow:  ┌─ Box Shadow Editor ───────────────────────┐
             │ Type:  ● Outer  ○ Inner（inset）           │
             │ X:     5px    偏移量                        │
             │ Y:     5px                                 │
             │ Blur:  10px   模糊半径                      │
             │ Spread: 0px   扩散半径                      │
             │ Color: ██████  ← 点它进颜色选择器            │
             └────────────────────────────────────────────┘
```

调整任何一个滑块，页面上实时预览效果。比你自己在代码里猜 `box-shadow: 3px 7px 12px 2px rgba(0,0,0,0.15)` 快十倍。

#### 4.3 贝塞尔曲线编辑器

点击 `transition` 或 `animation` 的 timing function 旁边的小图标：

```
         ease-in-out 曲线
      ┌────────────────────┐
  1.0 │              ●  ·· │  ← 终点
      │          ···       │
      │      ···           │
      │  ···               │
  0.0 │●                    │  ← 起点
      └────────────────────┘
      0.0              1.0
cubic-bezier(0.42, 0, 0.58, 1)  ← 拖动手柄可以自定义曲线
```

---

### 五、实战：在 DevTools 中从零调试一个布局错乱的页面

假设你接手了一个页面，打开后卡片区域乱成一团：有的卡片太宽，有的不换行，有的文字溢出。

#### Step 1：定位问题区域

```
打开 DevTools → 点击左上角箭头图标（Inspector）
→ 鼠标悬停在卡片的父容器上 → 观察高亮框是否和预期一致
→ 点击后自动在 Elements 面板中定位
```

#### Step 2：检查盒模型

```
切换到 Computed 面板
→ 观察盒模型图：容器的 width 是不是被什么限制住了？
→ 滚动到下面，看 flex-direction 和相关 flex 属性
```

发现 `width: 1200px` 写死了，屏幕只有 1024px，导致溢出。

#### Step 3：修改验证

```
回到 Styles 面板
→ 找到 width: 1200px
→ 双击 1200，改成 max-width: 1200px
→ 页面实时更新，卡片区域恢复正常
```

#### Step 4：排查 CSS 覆盖

某张卡片设置了 `background: red;` 却没变红：

```
选中该卡片元素
→ Styles 面板中搜 "background"
→ 发现 .card { background: red; } 有删除线
→ 悬停提示："overridden by .card-container .card { background: white; }"
→ 点链接跳转到覆盖规则，把 background: white 改成 background: transparent
```

#### Step 5：调试响应式

```
点击 DevTools 左上角的「设备模拟」按钮（Cmd+Shift+M）
→ 选择 "iPhone 12 Pro" 或拖拽视口边缘
→ 切换 :hov 状态检查移动端的 hover 效果是否合理
→ 观察哪些规则在 @media (max-width: 768px) 中生效
```

---

## 常见问题

**Q1：我在 Styles 面板里改了一个属性，一刷新就没了，怎么保存？**

Styles 面板的修改只存在于当前打开的 DevTools 会话中，刷新或关闭都会丢失。你需要在编辑框里确认效果后，回到你的源代码文件中手动同步。Sources 面板的 Workspace 映射功能可以帮你直接把 DevTools 中的修改持久化到文件——后面课程会讲。

**Q2：DevTools 中的行号（如 style.css:42）点不了？**

确保你使用的是 Chrome 最新版本。行号是蓝色的链接，点击会直接跳转到 Sources 面板对应的文件和行号。如果点了没反应，可能是 CSS 是内联的 `<style>` 标签或由 JS 动态注入的。

**Q3：如何快速找到一个元素绑定了哪些事件？**

选中元素 → 右侧面板切换到 **Event Listeners** 标签 → 可以看到 click、mouseenter 等事件及其绑定的函数。点函数名旁边的链接可以直接跳转到 Sources 面板对应行。

**Q4：为什么 Computed 面板里的值和我在 Styles 里看到的不一样？**

Styles 面板显示的是你写的 CSS（`width: 50%`），Computed 面板显示的是浏览器最终计算后的实际像素值（`width: 480px`）。百分比、em、rem 等相对单位在 Computed 中都会被换算为 px。

**Q5：怎么在 DevTools 中搜索页面上的文字（不是 HTML）？**

`Cmd+F`（在 Elements 面板聚焦时）可以在 DOM 树中搜索（包括标签名、属性、文本）。如果要在页面视图中直接搜索，用浏览器自带的 `Cmd+F`。

**Q6：Styles 面板右上角的 `.cls` 按钮是做什么的？**

它可以让你临时给元素**增减 class**。点击 `.cls` → 输入一个新的 class 名 → 回车，元素立刻有了这个 class。配合你在 Styles 面板中新写的 CSS 规则，快速验证效果。`+` 按钮添加新 class，已添加的 class 可以通过复选框开关。

**Q7：怎么复制一个元素及其所有样式？**

选中元素 → `Cmd+C`（在 Elements 面板中） → 粘贴到编辑器，会得到该元素的 outerHTML。但样式不会跟着 HTML 走。如果需要带样式，可以在 Styles 面板中对每条规则右键 → Copy all declarations。

---

## 实操作业

### 基础练习：盒子探险

打开 bilibili.com 或任一网站，在 Elements 面板中：

1. 找到导航栏，记录它的 `<nav>` 标签上挂了哪些 class
2. 切换到 Computed 面板，画出导航栏的盒模型（margin / border / padding / content 各是多少）
3. 用 Inspector 模式悬停在至少 5 个不同的元素上，观察它们的尺寸和标签名

### 进阶练习：CSS 调试挑战

准备一个 HTML 文件，内容如下（复制到你的编辑器中保存为 `.html` 打开）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DevTools 调试练习</title>
<style>
  .container { width: 1000px; margin: 20px auto; }
  .card {
    display: inline-block;
    width: 280px;
    margin: 10px;
    padding: 15px;
    background: #f5f5f5;
    border-radius: 8px;
    vertical-align: top;
  }
  .card.featured { background: #fff3cd; border: 2px solid #ffc107; }
  .card h3 { margin: 0 0 8px 0; font-size: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .card p { color: #666; font-size: 14px; line-height: 1.6; }
</style>
</head>
<body>
<div class="container">
  <div class="card">
    <h3>这是一段非常非常非常长的标题文字</h3>
    <p>描述文字</p>
  </div>
  <div class="card featured">
    <h3>精选卡片</h3>
    <p>这张卡片的背景色应该和别的卡片不同，但你发现它没有变黄？请用 DevTools 排查。</p>
  </div>
  <div class="card">
    <h3>第三张卡片</h3>
    <p>注意卡片之间的间距是否一致，如果不一致，在 DevTools 中找出原因。</p>
  </div>
</div>
</body>
</html>
```

要求：

1. 在 DevTools 中找出 `.card.featured` 没有应用黄色背景的原因，并修复
2. 检查第三张卡片和前面的间距为何不同（提示：inline-block 的空白问题），在 DevTools 中验证
3. 打开 Computed 面板，查看第一张卡片 `h3` 的 `width` 实际计算值是多少

### 挑战练习：逆向还原

打开一个你喜欢的网页（如掘金首页），在不查看源代码的情况下，用 Elements 和 Styles 面板：

1. 还原出导航栏的完整 CSS（颜色、字体大小、间距、对齐方式）
2. 找到至少一个用 `box-shadow` 实现卡片阴影的例子，复制该 shadow 的值
3. 使用 `:hov` 功能找到至少一个按钮的 hover 效果，并记录下来
4. 使用取色器（Eye Dropper）提取页面的主色调（Hex 值）

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：在 Atlas 中构造与“Elements 与 Styles 调试”相关的可观察场景，使用 DevTools 或请求日志记录现象、时间线和结论。
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

- Elements 面板是你和页面结构交互的核心入口，**Inspector 模式**是快速定位元素的最佳工具
- Styles 面板让你能实时编辑 CSS 并立刻看到效果，**删除线 + 来源链接**帮你快速定位优先级问题
- Computed 面板的**盒模型可视化**让 margin/padding/border 一目了然，展开属性看调用链解决了"值从哪来"的终极问题
- **`:hov` 切换**让你不用反复移动鼠标就能调试 hover/active 等交互状态
- 颜色选择器支持**页面任意位置吸色**，阴影和动画编辑器让你告别试数调参
- 调试布局的第一步永远是：选中容器 → 打开 Computed → 看盒模型 → 回到 Styles 定位问题属性

<!-- course-nav:start -->
---

[上一篇：03 — DNS、TCP、TLS 握手过程](../05-网络基础与HTTP/03-DNS-TCP-TLS握手过程.md) · [课程地图](../../README.md) · [下一篇：02 — Network 面板与性能分析](./02-Network面板与性能分析.md)
<!-- course-nav:end -->
