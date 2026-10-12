# 02 — CSS 变量与 @layer

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[01 — 媒体查询与容器查询](./01-媒体查询与容器查询.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN CSS](https://developer.mozilla.org/docs/Web/CSS)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 掌握 CSS 自定义属性（变量）的声明、使用和级联规则
- 理解 CSS 变量与预处理器变量（Sass/Less）的本质区别
- 能用 CSS 变量实现主题切换、设计标记和动态计算
- 掌握 `@layer` 级联层，彻底解决选择器优先级冲突
- 能结合 `:has()` 等现代选择器实现无 JS 的交互逻辑

---

## 内容讲解

### 1. CSS 自定义属性（变量）

#### 1.1 基本语法

```css
/* 声明：双连字符开头，通常在 :root 中定义全局变量 */
:root {
  --primary: #3b82f6;      /* 主色 */
  --spacing-unit: 8px;     /* 间距基础单位 */
  --radius: 8px;           /* 圆角 */
  --shadow: 0 4px 12px rgba(0,0,0,0.1);  /* 阴影（变量可以存复合值） */
}

/* 使用：var() 函数 */
.button {
  background: var(--primary);
  padding: var(--spacing-unit) calc(var(--spacing-unit) * 2);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
```

**关键认知**：CSS 变量本质上是一个**键值对存储系统**。你可以在一个地方定义，在一百个地方使用。改一处，所有引用自动更新。

#### 1.2 回退值

```css
.button {
  /* 如果 --primary 未定义，用 #333 作为回退 */
  color: var(--primary, #333);

  /* 多重回退：--accent 不存在就用 --primary，再不存在用 #333 */
  color: var(--accent, var(--primary, #333));
}
```

---

### 2. CSS 变量 vs Sass/Less 变量

这是面试和实际工作中最常见的问题之一。两者的差异决定了它们的适用场景完全不同：

| 维度 | CSS 变量 | Sass/Less 变量 |
|------|----------|---------------|
| **存在时间** | 运行时（浏览器中） | 编译时（构建阶段） |
| **级联（继承）** | ✅ 遵循 CSS 级联，父元素变量可被子元素覆盖 | ❌ 编译后是硬编码值，不存在继承 |
| **动态修改** | ✅ 可用 JS 修改、可被媒体查询覆盖 | ❌ 编译后无法改变 |
| **作用域** | DOM 树，受选择器影响 | 代码块，受 `{}` 作用域影响 |
| **单位运算** | 需配合 `calc()` | 原生支持数学运算 |
| **主题切换** | ✅ 原生支持，改一个变量全局生效 | 需要重新编译 |

**一句话总结**：Sass 变量是"写代码时"的便利，CSS 变量是"运行时"的能力。

#### 2.1 证明 CSS 变量的级联能力

```html
<style>
  :root { --color: blue; }   /* 全局蓝色 */

  .parent { --color: red; }  /* 这个区域里 --color = 红色 */

  .child {
    color: var(--color);     /* 继承最近的 --color → 红色 */
  }
</style>

<div class="parent">
  <p class="child">我是红色的</p>   <!-- ← 继承自 .parent -->
</div>
<p class="child">我是蓝色的</p>      <!-- ← 继承自 :root -->
```

Sass 变量做不到这一点——它们的值在编译时就被写死了。

---

### 3. 实际应用

#### 3.1 主题切换

```css
/* 定义两套主题 */
:root {
  --bg: #ffffff;
  --text: #1a1a1a;
}

[data-theme="dark"] {
  --bg: #1a1a1a;
  --text: #f0f0f0;
}

body {
  background: var(--bg);
  color: var(--text);
  transition: background 0.3s, color 0.3s; /* 平滑过渡 */
}
```

配合 JS：

```javascript
// 点击按钮切换主题
document.querySelector('#theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
});
```

#### 3.2 全局设计标记（Design Tokens）

```css
:root {
  /* 颜色系统 */
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-success: #22c55e;
  --color-danger: #ef4444;

  /* 间距阶梯 */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;

  /* 字号阶梯 */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

/* 使用时语义清晰，不需要硬编码 */
.button {
  padding: var(--space-sm) var(--space-md);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  background: var(--color-primary);
}

.button:hover {
  background: var(--color-primary-hover);
}
```

#### 3.3 动态计算（配合 calc）

```css
:root {
  --columns: 3;
  --gap: 16px;
}

.grid {
  display: grid;
  /* 变量可以与 calc() 无缝搭配 */
  grid-template-columns: repeat(var(--columns), 1fr);
  gap: var(--gap);
}

/* 响应式中动态改列数 */
@media (max-width: 768px) {
  :root { --columns: 1; }
}
```

---

### 4. @layer 级联层

#### 4.1 问题：CSS 优先级地狱

在真实项目中，你一定会遇到这些场景：

```css
/* 第三方组件库提供的样式，你想覆盖但权重不够 */
.lib-button { color: blue; }      /* 权重 0,1,0 */

/* 你的覆盖 */
.btn { color: red; }               /* 权重 0,1,0，平了，但写在后面生效 */

/* 有一天同事重构，把选择器写复杂了…… */
.page .section .btn { color: green; } /* 权重 0,3,0，你的覆盖失效了 */
```

然后你就开始加 `!important`、再套一层选择器、再加 `!important`……最终 CSS 变成一坨谁都改不动的乱麻。

#### 4.2 @layer 的解决方案

`@layer` 让你**按意图组织样式**，而不是按选择器的特异性来"打架"：

```css
/* 定义层级顺序（越后写的 layer 优先级越高） */
@layer reset, base, components, utilities;

/* 重置层：优先级最低 */
@layer reset {
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
}

/* 基础层：元素默认样式 */
@layer base {
  body {
    font-family: system-ui, sans-serif;
    line-height: 1.6;
  }
}

/* 组件层：业务组件 */
@layer components {
  .button {
    padding: 8px 16px;
    border-radius: 6px;
  }
}

/* 工具层：优先级最高，用于覆盖 */
@layer utilities {
  .hidden { display: none !important; }
  .mt-0   { margin-top: 0; }
}
```

**关键规则**：

1. `@layer` 的声明顺序决定优先级：后声明的层 > 先声明的层
2. 层内仍然遵循普通的选择器特异性规则
3. **未分层样式 > 所有分层样式**（这是重要的安全阀）
4. `@layer utilities` 中的 `!important` 会反转优先级

#### 4.3 优先级全景图

```
最高                          最低
── ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ →
!important(utilities) > !important(components) > !important(base)
  > 未分层样式 > utilities > components > base > reset
```

**`@layer` 中的 `!important` 会反转**：它让低优先级层中的 `!important` 比高优先级层中的 `!important` 更强。这个设计是为了让基础层（如 reset）的 `!important` 能真正"锁死"样式。

#### 4.4 嵌套层

```css
@layer framework {
  @layer base {
    /* framework.base 层 */
  }

  @layer components {
    /* framework.components 层 */
  }
}

/* 引用嵌套层 */
@layer framework.base {
  /* 直接向 framework 的 base 子层添加样式 */
}
```

#### 4.5 匿名层

```css
/* 直接用 @layer 不加名字 = 匿名层 */
@layer {
  .card { ... }
}

/* 等价于创建了一个唯一名称的层，每次使用都会创建新层 */
```

匿名层之间按出现顺序排列优先级。一般用命名层更好，意图更清晰。

---

### 5. 实战：CSS 变量 + :has() 实现暗色模式切换

这里展示一个**零 JavaScript** 的主题切换方案：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>CSS 变量 + :has() 暗色模式</title>
<style>
  /* ===== 主题变量 ===== */
  :root {
    --bg: #ffffff;
    --surface: #f5f5f5;
    --text: #1a1a1a;
    --text-secondary: #666666;
    --border: #e0e0e0;
    --primary: #3b82f6;
  }

  /* 当 #theme-toggle 被勾选时 → 让 <html> 应用暗色变量 */
  html:has(#theme-toggle:checked) {
    --bg: #1a1a2e;
    --surface: #16213e;
    --text: #e0e0e0;
    --text-secondary: #aaaaaa;
    --border: #2a2a4a;
    --primary: #818cf8;
  }

  /* ===== 应用变量 ===== */
  body {
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, -apple-system, sans-serif;
    transition: background 0.3s, color 0.3s;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    max-width: 400px;
    width: 100%;
    transition: background 0.3s, border-color 0.3s;
  }

  .card h2 { margin-bottom: 12px; }

  .card p {
    color: var(--text-secondary);
    line-height: 1.7;
    margin-bottom: 24px;
  }

  .card a {
    color: var(--primary);
    text-decoration: none;
  }

  /* ===== 开关样式（纯 CSS 实现） ===== */
  .theme-switch {
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    user-select: none;
  }

  .theme-switch input {
    display: none; /* 隐藏原生复选框 */
  }

  .theme-switch .track {
    width: 52px;
    height: 28px;
    background: #d1d5db;
    border-radius: 14px;
    position: relative;
    transition: background 0.3s;
  }

  .theme-switch .track::after {
    content: "";
    position: absolute;
    width: 22px;
    height: 22px;
    background: white;
    border-radius: 50%;
    top: 3px;
    left: 3px;
    transition: transform 0.3s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  }

  /* 勾选时 → 滑块右移 + 轨道变色 */
  .theme-switch input:checked + .track {
    background: var(--primary);
  }

  .theme-switch input:checked + .track::after {
    transform: translateX(24px);
  }

  /* ===== 减少动画 ===== */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      transition-duration: 0.01ms !important;
    }
  }
</style>
</head>
<body>

  <div class="card">
    <h2>暗色模式切换</h2>
    <p>
      这是一个<strong>纯 CSS</strong> 实现的主题切换。
      使用 <code>:has()</code> 选择器检测复选框状态，
      配合 CSS 变量实现全局样式切换。
      没有任何 JavaScript 代码。
    </p>
    <label class="theme-switch">
      <span>☀️</span>
      <input type="checkbox" id="theme-toggle">
      <span class="track"></span>
      <span>🌙</span>
    </label>
  </div>

</body>
</html>
```

**这个例子的关键机制**：

1. `html:has(#theme-toggle:checked)` —— 当复选框被勾选时，`:has()` 让 `<html>` 获得一个"条件样式规则"
2. 在这个条件规则里重新定义 CSS 变量 → 所有引用这些变量的元素自动更新
3. `transition` 让颜色变化有平滑过渡
4. 整个过程**没有一行 JavaScript**

---

## 常见问题

**Q1：CSS 变量名区分大小写吗？**

区分。`--primary` 和 `--Primary` 是两个不同的变量。JavaScript 中访问时也要保持一致：`getComputedStyle(el).getPropertyValue('--primary')`。

**Q2：可以在 CSS 变量里存颜色再配合透明度吗？**

不能直接在 `var()` 上加 alpha。但可以用 `color-mix()` 或把颜色拆成 HSL 分量：

```css
:root {
  --primary-h: 217;
  --primary-s: 91%;
  --primary-l: 60%;
}

.button {
  background: hsl(var(--primary-h), var(--primary-s), var(--primary-l));
}

.button:hover {
  background: hsl(var(--primary-h), var(--primary-s), calc(var(--primary-l) - 10%));
}
```

**Q3：Sass 和 CSS 变量能混用吗？**

能，而且推荐这样做：Sass 变量负责编译时的逻辑（如循环生成类名），CSS 变量负责运行时的动态能力（如主题切换）。不要让 Sass 变量去承担 CSS 变量擅长的事情。

**Q4：@layer 和传统 CSS 架构方法论（BEM、SMACSS）冲突吗？**

不冲突，反而互补。BEM 解决的是"如何命名和组织选择器"的问题，`@layer` 解决的是"如何控制优先级"的问题。你可以同时用 BEM 命名 + `@layer` 分层。

**Q5：@layer 里的样式会不会被行内样式覆盖？**

会。行内样式（`style="..."`）的优先级高于任何分层样式，只低于 `!important`。这与传统 CSS 优先级规则一致。

**Q6：为什么 `:has()` 可以和 CSS 变量配合做主题切换？**

因为 CSS 变量是**动态的**、**会继承的**。当 `html:has(#toggle:checked)` 重新定义变量时，所有子元素的 `var()` 引用都会自动取到新值。`:has()` 本质上就是一个"条件触发器"，而变量是整个条件生效后的"广播系统"。

**Q7：CSS 变量的动画性能好吗？**

CSS 变量本身不触发重绘。但如果变量值改变导致大量元素重新计算样式，可能会有性能开销。对于颜色、背景等属性的主题切换，开销很小。不建议在 `@keyframes` 中用变量做高频动画——动画中的变量不能平滑插值（除非注册了 `@property`）。

**Q8：`@layer` 能解决第三方 CSS 库覆盖问题吗？**

能。把第三方库的 CSS 放到低优先级层，你自己的样式放在高优先级层（或不分层），就不需要依靠选择器特异性去"打架"了。大多数 UI 库（如 Bootstrap 5.3+、Tailwind 3.4+）已内置了 `@layer` 支持。

---

## 实操作业

### 练习 1（基础）：设计标记（Design Tokens）

为一个博客页面定义一套 CSS 变量体系（颜色、间距、字号、圆角），然后用它们写一个文章卡片的样式。要求修改 `:root` 中的变量值后，所有卡片样式自动更新。额外尝试：给卡片加一个带变量回退值的 `box-shadow`。

### 练习 2（进阶）：用 @layer 组织样式

创建一个有三个 `@layer` 的页面：`reset` → `base` → `components`。在 `components` 层中写一个按钮样式，然后尝试在 `utilities` 层（声明在 `components` 之后）覆盖按钮的 `background`——验证它是否生效。再尝试在一个未分层的样式中覆盖它——验证未分层样式优先级是否高于分层样式。

### 练习 3（挑战）：多主题选择器

扩展实战中暗色模式的例子，实现三种主题：浅色、深色、高对比度。用一个下拉选择框（`<select>`）让用户切换主题。要求**纯 CSS 实现**（提示：`:has()` + 不同选项对应不同变量组）。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：把“CSS 变量与 @layer”应用到 Atlas 的 HTML/CSS 交互界面，覆盖窄屏、键盘操作和至少一个失败状态。
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

- CSS 变量是运行时的键值系统，支持级联继承和动态修改，这是它相比预处理器变量的核心优势
- 主题切换、设计标记（Design Tokens）、动态计算是 CSS 变量的三大应用场景
- `@layer` 通过"层级"概念解决了 CSS 优先级混乱的问题，按意图组织而不是按特异性打架
- `@layer` 声明顺序决定默认优先级，但 `!important` 会反转
- CSS 变量 + `:has()` 可以实现零 JavaScript 的交互逻辑
- 在真实项目中，CSS 变量和 Sass 变量各司其职，不是替代关系

<!-- course-nav:start -->
---

[上一篇：01 — 媒体查询与容器查询](./01-媒体查询与容器查询.md) · [课程地图](../../README.md) · [下一篇：03 — 移动优先与适配策略](./03-移动优先与适配策略.md)
<!-- course-nav:end -->
