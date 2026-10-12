# 03 — ARIA 与可访问性实践

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[02 — 表单验证与约束](./02-表单验证与约束.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[HTML Standard](https://html.spec.whatwg.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Web 可访问性（a11y）的核心理念和 WCAG 标准
- 掌握 ARIA 角色、属性、状态的分类和使用场景
- 学会实现键盘导航、skip-link、焦点管理等关键模式
- 能修复常见组件（表单、弹窗）的可访问性问题

---

## 内容讲解

### 一、什么是 Web 可访问性（a11y）？

"a11y" 是 "accessibility" 的缩写——a 和 y 中间有 11 个字母。它的目标是**让所有人，包括残障人士，都能平等地访问和使用网页**。

打个比方：建一栋大楼时，你不只为"能走楼梯的人"设计，还要修坡道让坐轮椅的人也能进出。Web 可访问性就是网页世界的"无障碍坡道"。

**四类主要受众**：

| 障碍类型 | 常见辅助工具 | 你需要关注 |
|---------|------------|----------|
| 视觉障碍 | 屏幕阅读器（VoiceOver、NVDA、JAWS） | 语义标签、ARIA、颜色对比度 |
| 听觉障碍 | 字幕、文字替代 | `<video>` 字幕、音频文字稿 |
| 运动障碍 | 键盘、语音控制、眼动追踪 | 键盘导航、足够大的点击区域 |
| 认知障碍 | 清晰布局、一致性导航 | 简单语言、可预测的交互 |

#### WCAG 2.2 的四项原则（POUR）

WCAG（Web Content Accessibility Guidelines）是全球公认的可访问性标准，最新版本是 2.2。它基于四个原则：

1. **可感知（Perceivable）**：内容必须能被用户的感官感知——图片有 `alt` 文字，视频有字幕
2. **可操作（Operable）**：用户必须能操作界面——所有功能可通过键盘访问，有足够的时间阅读
3. **可理解（Understandable）**：信息和操作必须是可理解的——语言简单明了，导航一致
4. **健壮（Robust）**：内容必须能被各种用户代理（包括辅助工具）正确解析——使用规范的 HTML

### 二、ARIA 是什么？

ARIA（Accessible Rich Internet Applications）是一套属性集合，当 HTML 语义标签不够用时，用它来补充可访问性信息。

**核心原则：No ARIA is better than Bad ARIA。**

ARIA 只在"原生 HTML 无法表达语义"时才使用。错误的 ARIA 比没有 ARIA 更糟糕，因为它会主动误导辅助工具。

#### ARIA 的三大组成部分

```html
<!-- 1. 角色（Role）：告诉辅助工具"我是什么" -->
<div role="button" tabindex="0">点击我</div>

<!-- 2. 属性（Property）：描述这个元素的额外特征 -->
<div role="button" aria-label="关闭弹窗" tabindex="0">✕</div>

<!-- 3. 状态（State）：描述当前处于什么状态（会动态变化） -->
<button aria-expanded="false" aria-controls="menu-list">菜单</button>
<ul id="menu-list" hidden>...</ul>
```

### 三、常用 ARIA 属性详解

#### `aria-label` — 给元素加一个"屏幕阅读器专享"的名字

当视觉上能理解含义（如图标按钮），但屏幕上没有文字时使用：

```html
<!-- ❌ 屏幕阅读器会读"叉号按钮"，用户不知道它干什么 -->
<button>✕</button>

<!-- ✅ 屏幕阅读器读"关闭弹窗按钮" -->
<button aria-label="关闭弹窗">✕</button>

<!-- 搜索按钮 -->
<button aria-label="搜索">
  <svg><!-- 放大镜图标 --></svg>
</button>
```

> `aria-label` 会**覆盖**元素原有的文本内容。不要给已经有文字的元素加 `aria-label`，除非你想改变它被阅读的方式。

#### `aria-labelledby` — 引用其他元素作为标签

和 `aria-label` 类似，但标签文字来自页面上另一个元素：

```html
<!-- 一个弹窗，标题在外面 -->
<h2 id="dialog-title">确认删除</h2>
<div role="dialog" aria-labelledby="dialog-title">
  <p>你确定要删除这条记录吗？此操作不可撤销。</p>
</div>
```

**`aria-label` vs `aria-labelledby` 的选择**：
- 标签文字已经在页面某处 → `aria-labelledby`
- 标签文字不需要在视觉上显示 → `aria-label`
- 两者都设了 → `aria-labelledby` 优先

#### `aria-describedby` — 引用描述性文字

给元素关联一段补充说明（比标签更详细）：

```html
<label for="password">密码：</label>
<input type="password" id="password"
       aria-describedby="password-hint password-error">
<p id="password-hint">密码需包含大小写字母、数字和特殊字符，8-20位</p>
<p id="password-error" class="error" hidden>密码格式不正确</p>
```

屏幕阅读器在聚焦密码框时，会先读标签"密码"，再依次读 `password-hint` 和 `password-error` 的内容。

#### `aria-hidden` — 对辅助工具隐藏

当某个元素纯粹是装饰性的，或者它的信息已经通过其他方式传达了：

```html
<!-- 装饰性图标：不需要被阅读 -->
<span aria-hidden="true">🎨</span> 设计灵感

<!-- SVG 图标：已经是纯装饰 -->
<button aria-label="收藏">
  <svg aria-hidden="true" focusable="false">
    <use href="#icon-heart"></use>
  </svg>
</button>

<!-- 模态弹窗打开时，隐藏背景内容 -->
<main aria-hidden="true">
  <!-- 弹窗打开时，背景内容对屏幕阅读器不可见 -->
</main>
<div role="dialog" aria-modal="true">
  <!-- 弹窗内容 -->
</div>
```

> **不要**对可聚焦的元素使用 `aria-hidden="true"`，会导致键盘用户进入"死胡同"。

#### `aria-live` — 动态内容更新通知

当页面上某个区域的内容会动态变化（如搜索结果数、购物车数量），屏幕阅读器需要被主动通知：

```html
<!-- 搜索状态提示 -->
<div aria-live="polite" aria-atomic="true">
  找到 <span id="result-count">0</span> 条结果
</div>

<script>
  // 更新结果数后，屏幕阅读器会自动朗读变化
  document.getElementById('result-count').textContent = '42';
  // 屏幕阅读器："找到 42 条结果"
</script>
```

`aria-live` 的值：

| 值 | 行为 |
|----|------|
| `off`（默认） | 不通知 |
| `polite` | 等当前朗读结束后再通知 |
| `assertive` | 立即打断当前朗读（仅用于紧急通知，如"会话已过期"） |

`aria-atomic="true"`：朗读整个区域的内容，而不是只读变化的部分。

### 四、键盘导航

键盘导航是运动障碍用户和"鼠标坏了"时最依赖的交互方式。

#### `tabindex` — 控制 Tab 键访问顺序

```html
<!-- tabindex="0"：加入 Tab 顺序（最常用） -->
<div role="button" tabindex="0">可聚焦的自定义按钮</div>

<!-- tabindex="-1"：从 Tab 顺序中移除，但仍可通过 JS focus() 聚焦 -->
<div id="modal" tabindex="-1">弹窗内容（弹窗打开时用 JS 聚焦）</div>

<!-- ❌ tabindex 大于 0：强制改变顺序，极不推荐 -->
<a href="#" tabindex="3">这会排到第 3 个</a>
```

**规则**：只用 `0` 和 `-1`，永远不要用正数 `tabindex`。

#### Skip Link — "跳到主内容"

网页顶部通常有导航栏，键盘用户每次翻页都要 Tab 过几十个链接才能到正文。Skip Link 让他们一键跳过：

```html
<body>
  <!-- 默认隐藏，Tab 聚焦时显示 -->
  <a href="#main-content" class="skip-link">
    跳到主内容
  </a>

  <header>...</header>
  <nav><!-- 假设有 50 个导航链接 --></nav>

  <main id="main-content">
    <!-- 用户真正想看的内容 -->
  </main>

  <style>
    .skip-link {
      position: absolute;
      top: -100px;
      left: 16px;
      background: #1d4ed8;
      color: #fff;
      padding: 8px 16px;
      z-index: 9999;
      border-radius: 0 0 4px 4px;
      text-decoration: none;
    }
    /* Tab 聚焦时滑入视野 */
    .skip-link:focus {
      top: 0;
    }
  </style>
</body>
```

#### 焦点管理 — 弹窗打开后焦点去哪了？

当用户打开一个模态弹窗时，焦点必须被"困"在弹窗内，否则他们 Tab 着 Tab 着就跑到弹窗后面的元素去了。

```html
<!-- 触发按钮 -->
<button id="open-modal">打开弹窗</button>

<!-- 模态弹窗 -->
<div id="my-modal" role="dialog" aria-modal="true"
     aria-labelledby="modal-heading" hidden>
  <h2 id="modal-heading">确认操作</h2>
  <p>你确定要继续吗？</p>
  <button id="cancel-btn">取消</button>
  <button id="confirm-btn">确认</button>
</div>

<script>
  const openBtn = document.getElementById('open-modal');
  const modal = document.getElementById('my-modal');
  const cancelBtn = document.getElementById('cancel-btn');
  const confirmBtn = document.getElementById('confirm-btn');

  // 保存打开弹窗前聚焦的元素，关闭时恢复
  let lastFocusedElement;

  openBtn.addEventListener('click', openModal);
  cancelBtn.addEventListener('click', closeModal);

  function openModal() {
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    // 焦点移到弹窗内的第一个可交互元素
    cancelBtn.focus();
    // 把背景内容标记为隐藏
    document.querySelector('main').setAttribute('aria-hidden', 'true');
  }

  function closeModal() {
    modal.hidden = true;
    document.querySelector('main').removeAttribute('aria-hidden');
    // 焦点回到触发按钮
    lastFocusedElement.focus();
  }

  // 焦点陷阱：确保 Tab 在弹窗内循环
  modal.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeModal();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift+Tab：如果焦点在第一个元素上，跳到最后一个
      if (document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      }
    } else {
      // Tab：如果焦点在最后一个元素上，跳回第一个
      if (document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  });
</script>
```

### 五、屏幕阅读器友好实践

#### 1. 图片必须有 `alt`

```html
<!-- 信息性图片：描述图片传达的信息 -->
<img src="chart.png" alt="2026年第一季度销售增长23%，其中3月份增长最高">

<!-- 装饰性图片：空 alt，屏幕阅读器会跳过 -->
<img src="decorative-line.png" alt="">

<!-- 复杂图表：简短 alt + 详细描述链接 -->
<img src="complex-chart.png" alt="季度销售趋势图"
     aria-describedby="chart-desc">
<p id="chart-desc">该图表详细展示了……</p>
```

#### 2. 用正确的 HTML 而不是 ARIA 来"模拟"

```html
<!-- ❌ 用 div 模拟按钮 -->
<div role="button" tabindex="0" onclick="...">提交</div>

<!-- ✅ 直接用 button -->
<button type="button">提交</button>
```

原生 `<button>` 自动支持：聚焦、Enter/Space 键触发、`disabled` 状态、表单提交。用 `<div>` 模拟你还要手动处理所有这些行为。

#### 3. 标题层级不能跳级

```html
<!-- ✅ 正确 -->
<h1>页面标题</h1>
  <h2>第一节</h2>
    <h3>小节</h3>
  <h2>第二节</h2>

<!-- ❌ 错误：从 h1 直接跳到 h3 -->
<h1>页面标题</h1>
  <h3>缺少了 h2</h3>
```

屏幕阅读器用户经常通过标题来浏览页面大纲，跳级会让他们的导航体验断裂。

#### 4. 颜色不能是传达信息的唯一方式

```html
<!-- ❌ 错误：仅用颜色区分 -->
<p>红色字段为必填</p>
<input style="border-color: red"> <!-- 色盲用户看不出区别 -->

<!-- ✅ 正确：颜色 + 文字/图标 -->
<p><span aria-hidden="true">*</span> 为必填字段</p>
<label for="email">邮箱 <span aria-hidden="true">*</span></label>
<input id="email" required aria-required="true">
```

### 六、真实案例：修复一个不可访问的登录表单

**修复前**：

```html
<!-- 以下代码存在多个可访问性问题 -->
<div class="login-form">
  <div class="title">用户登录</div>

  <input type="text" placeholder="用户名">
  <input type="password" placeholder="密码">

  <div class="remember">
    <div class="checkbox" onclick="this.classList.toggle('checked')"></div>
    <span>记住我</span>
  </div>

  <div class="submit-btn" onclick="login()">登 录</div>
  <div class="error" style="color:red; display:none">用户名或密码错误</div>
</div>
```

**问题列表**：

1. 没有 `<form>` — 屏幕阅读器不会进入"表单模式"，Enter 键无法提交
2. `<input>` 没有关联 `<label>` — 屏幕阅读器不知道这个字段叫什么
3. checkbox 用 `<div>` 模拟 — 键盘无法操作，屏幕阅读器不识别
4. 提交按钮用 `<div>` 模拟 — 同上
5. 错误信息用 `display:none` — 屏幕阅读器完全看不到
6. 仅用红色传达错误 — 色盲用户无法感知

**修复后**：

```html
<form class="login-form" novalidate>
  <h1>用户登录</h1>

  <!-- 每个 input 都有明确的 label 关联 -->
  <div class="form-group">
    <label for="username">用户名</label>
    <input type="text" id="username" name="username"
           required autocomplete="username"
           aria-required="true">
  </div>

  <div class="form-group">
    <label for="password">密码</label>
    <input type="password" id="password" name="password"
           required autocomplete="current-password"
           aria-required="true">
  </div>

  <!-- 用原生 checkbox，关联 label -->
  <div class="form-group">
    <input type="checkbox" id="remember" name="remember">
    <label for="remember">记住我</label>
  </div>

  <!-- 用原生 button -->
  <button type="submit">登 录</button>

  <!-- 错误信息：用 aria-live 让屏幕阅读器主动朗读 -->
  <div id="login-error" class="error-message"
       role="alert" aria-live="assertive">
    <!-- 错误时动态填充内容 -->
  </div>
</form>

<script>
  const form = document.querySelector('.login-form');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      // role="alert" + 内容变化 → 屏幕阅读器立即朗读
      errorEl.textContent = '请填写用户名和密码';
      // 把焦点移到第一个空的字段
      if (!username) document.getElementById('username').focus();
      else document.getElementById('password').focus();
      return;
    }

    // 模拟登录失败
    errorEl.textContent = '用户名或密码错误，请重试';
    errorEl.style.display = 'block';
  });
</script>

<style>
  .error-message {
    color: #dc2626;
    font-weight: 500;
    padding: 8px 0;
    /* 不用 display:none，而是用空内容 + 不影响布局的方式 */
    min-height: 20px;
  }
  .error-message:empty {
    /* 无内容时视觉上不显示，但元素仍存在于 DOM 中 */
    display: none;
  }
</style>
```

---

## 常见问题

### Q1：ARIA 是不是越多越好？

**绝对不是。** ARIA 的第一原则是"No ARIA is better than Bad ARIA"。如果原生 HTML 已经表达了语义（如 `<button>`、`<nav>`、`<input type="checkbox">`），就不要再画蛇添足加 ARIA。错误的 `role` 或 `aria-*` 会主动误导辅助工具。

### Q2：`aria-label` 和 `aria-labelledby` 谁优先级更高？

`aria-labelledby` 优先级更高。如果两者同时存在，`aria-labelledby` 胜出。

### Q3：怎么检查我的页面是否可访问？

三步走：

1. **键盘走一遍**：只用 Tab、Shift+Tab、Enter、方向键操作你的页面。每个功能都能用吗？焦点轨迹清晰吗？
2. **用 Lighthouse**：Chrome DevTools → Lighthouse 标签 → 勾选 Accessibility → 生成报告
3. **打开屏幕阅读器**：macOS 按 Cmd+F5 开启 VoiceOver，听它怎么朗读你的页面

### Q4：`<button>` 和 `<div role="button">` 有什么实际区别？

`<button>` 自带：键盘聚焦、Enter/Space 触发 click、disabled 属性、表单提交行为、屏幕阅读器自动识别。`<div role="button">` 你需要手动处理以上所有行为。**永远优先用 `<button>`。**

### Q5：`alt=""`（空 alt）和完全不加 `alt` 有什么区别？

不加 `alt`：屏幕阅读器可能会读文件名（如 `image_20261012_v3_final.png`），体验很差。
`alt=""`：屏幕阅读器会**完全跳过**这张图片，视为纯装饰。

### Q6：`aria-live="polite"` 和 `role="alert"` 有什么区别？

`role="alert"` 是 `aria-live="assertive"` + `aria-atomic="true"` 的快捷方式，用于需要立即通知用户的重要消息（如表单错误）。`aria-live="polite"` 用于一般更新（如搜索结果数），不打断当前朗读。

### Q7：如果内容本身就是英文，`lang` 属性还需要设吗？

需要。`<html lang="en">` 告诉屏幕阅读器用英文的发音规则。如果你的页面有中英混排，可以在局部切换：`<p lang="zh-CN">你好</p>`。

### Q8：Skip Link 对看得见的用户有什么用？

在 Skip Link 上 `:focus` 时让它显示出来即可。它不仅对屏幕阅读器用户有用，对只用键盘的视力正常用户一样有用——他们也需要跳过 50 个导航链接。

---

## 实操作业

### 练习一（初级）：改造一个导航菜单

下面的导航菜单存在可访问性问题，请修复：

```html
<div class="nav">
  <div class="logo">我的网站</div>
  <div class="menu">
    <div class="item" onclick="navigate('/')">首页</div>
    <div class="item" onclick="navigate('/blog')">博客</div>
    <div class="item" onclick="navigate('/about')">关于</div>
  </div>
  <div class="search-btn" onclick="openSearch()">
    <img src="search-icon.svg">
  </div>
</div>
```

**修复要求**：
- 用 `<nav>` + `<a>` 替代 `<div>` 导航项
- 搜索按钮加 `aria-label`
- 搜索图标 SVG 加 `aria-hidden="true"`
- 导航加 `aria-label` 标识

### 练习二（中级）：构建可访问的模态弹窗

从零构建一个模态弹窗组件，满足以下可访问性要求：

1. 使用 `role="dialog"` 和 `aria-modal="true"`
2. 弹窗标题用 `aria-labelledby` 关联
3. 打开弹窗时焦点自动移入，关闭时焦点回到触发按钮
4. 实现"焦点陷阱"——Tab 和 Shift+Tab 只在弹窗内循环
5. Esc 键关闭弹窗
6. 弹窗打开时，背景内容加 `aria-hidden="true"`

### 练习三（高级）：志愿可访问性审计

选一个你每天使用的网站（博客、社区、内部系统都可以），用本文学到的知识做一次快速可访问性审计。至少检查：

1. 是否有 Skip Link？
2. 图片是否有 `alt`？有意义的图片描述是否恰当？
3. 标题层级是否连续？有没有跳级？
4. 只用键盘能否完成核心操作（浏览、搜索、登录）？
5. 表单输入框是否关联了 `<label>`？
6. 颜色是否承担了唯一的语义传达？（如仅用红色表示错误）
7. 打开 Chrome DevTools → Lighthouse → 生成 Accessibility 报告

记录至少 3 个问题，写下你会怎么修。不需要实际改代码。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：把“ARIA 与可访问性实践”应用到 Atlas 的 HTML/CSS 交互界面，覆盖窄屏、键盘操作和至少一个失败状态。
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

- a11y 不是"锦上添花"，而是**基本人权**——全球有超过 10 亿残障人士
- ARIA 是 HTML 语义的补充，不是替代。"No ARIA is better than Bad ARIA"
- 键盘导航三件套：`tabindex="0"` / `-1`、Skip Link、焦点陷阱
- 屏幕阅读器友好 = 语义标签 + 正确标题层级 + `alt` 图片 + 关联 `<label>` + 颜色不是唯一信息
- 养成习惯：每完成一个组件，用键盘走一遍，开启屏幕阅读器听一遍

<!-- course-nav:start -->
---

[上一篇：02 — 表单验证与约束](./02-表单验证与约束.md) · [课程地图](../../README.md) · [下一篇：00 CSS 选择器、层叠、继承与单位](../03-CSS3核心布局体系/00-CSS选择器-层叠-继承与单位.md)
<!-- course-nav:end -->
