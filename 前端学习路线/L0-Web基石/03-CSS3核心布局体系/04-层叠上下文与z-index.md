# 04-层叠上下文与 z-index

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[03-Grid 完整指南](./03-Grid完整指南.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN CSS](https://developer.mozilla.org/docs/Web/CSS)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解层叠上下文（Stacking Context）的概念和层叠顺序规则
- 掌握触发层叠上下文的 7 种常见方式
- 理解 z-index 的工作机制及其失效的经典场景
- 学会用 Chrome DevTools 的 Layers 面板调试层级问题
- 能正确处理模态弹窗、下拉菜单等场景中的层级管理

---

## 内容讲解

### 一、什么是层叠上下文？

网页是一个二维平面，但元素可以沿 Z 轴（垂直屏幕方向）堆叠。**层叠上下文（Stacking Context）** 就是 Z 轴上的一个"层级组"——组内的元素按特定规则排序，组与组之间按父级的层叠顺序排列。

想象一叠便签纸：
```
┌────────────┐
│  最上层     │ ← z轴正向（靠近你）
├────────────┤
│  中间层     │
├────────────┤
│  底层       │
└────────────┘
  屏幕平面（x-y 轴）
```

**关键规则：层叠上下文的元素互不穿透。** 也就是说，A 层叠上下文内的所有元素（不管 z-index 多大）都不能跑到 B 层叠上下文（如果 B 在 A 之上）的上面。

### 二、层叠顺序的 7 层规则

在同一个层叠上下文内，元素按以下顺序从低到高排列：

```
高 ↑                    ┌─────────────────────┐
   │  7. z-index 正值    │  z-index: 1,2,3...  │
   │                    ├─────────────────────┤
   │  6. z-index: 0     │  z-index: 0 / auto  │
   │                    ├─────────────────────┤
   │  5. 行内元素        │  <span> 文本 </span> │
   │                    ├─────────────────────┤
   │  4. 浮动元素        │  float: left/right  │
   │                    ├─────────────────────┤
   │  3. 块级元素        │  display: block     │
   │                    ├─────────────────────┤
   │  2. 负 z-index     │  z-index < 0        │
   │                    ├─────────────────────┤
   │  1. 背景和边框      │  层叠上下文的背景    │
低 ↓                    └─────────────────────┘
```

**记忆口诀**："背景在最底，负 z 往上挤；块浮行文排，z 零正最齐。"

### 三、触发层叠上下文的 7 种方式

这是 z-index "失效"的根本原因——你以为改了 z-index，但实际上它在一个新的层叠上下文里。

#### 1. `position` + `z-index`（最经典）

```css
.element {
  position: relative;  /* absolute、fixed、sticky 也行 */
  z-index: 1;          /* 必须是数值，auto 不触发 */
}
```

**注意**：`position: static`（默认）即使设置了 `z-index` 也不会创建层叠上下文。

#### 2. `opacity < 1`

```css
.faded {
  opacity: 0.99;  /* 小于 1 就触发！这是最容易被忽略的 */
}
```

这是最常见的坑：你给元素加了 `opacity: 0.9` 做淡入效果，结果它的 z-index 行为完全变了。

#### 3. `transform` 不为 `none`

```css
.sliding {
  transform: translateX(10px);  /* 任何值都触发 */
  /* transform: rotate(0deg);  即便看起来没变化也触发 */
}
```

#### 4. `filter` 不为 `none`

```css
.blurred {
  filter: blur(5px);
  /* backdrop-filter 也触发 */
}
```

#### 5. `will-change` 指定了会创建层叠上下文的属性

```css
.optimized {
  will-change: transform;  /* 告诉浏览器我要改 transform */
  /* will-change: opacity;  也会触发 */
}
```

#### 6. `isolation: isolate`

```css
.isolated {
  isolation: isolate;  /* 明确创建层叠上下文，不改变任何视觉效果 */
}
```

这是**最干净的触发方式**——只创建层叠上下文，不影响其他任何渲染行为。适合当你只需要隔离层级时使用。

#### 7. Flex/Grid 子项且 `z-index` 不为 `auto`

```css
.flex-parent {
  display: flex;
}
.flex-child {
  z-index: 1;  /* 在 flex 父级中，只要 z-index 是数值就触发 */
}
```

### 四、z-index "失效"的经典场景

#### 场景一：父级创建了新的层叠上下文

这是最常见的问题：

```html
<style>
  .parent-a {
    position: relative;
    z-index: 1;           /* ← 创建了层叠上下文 */
    background: #4a90d9;
    padding: 20px;
    color: white;
  }
  .parent-b {
    position: relative;
    z-index: 2;           /* ← B 的层级比 A 高 */
    background: #e8734a;
    padding: 20px;
    color: white;
  }
  .child-high {
    position: relative;
    z-index: 99999;       /* ← 再大也没用！因为被 A 的层叠上下文限制了 */
    background: #50b86c;
    padding: 10px;
  }
</style>
<div class="parent-a">
  Parent A (z-index: 1)
  <div class="child-high">
    Child (z-index: 99999) ← 这个永远到不了 B 上面
  </div>
</div>
<div class="parent-b">
  Parent B (z-index: 2)
</div>
```

**结论**：`child-high` 的 `z-index: 99999` 只在 `parent-a` 的层叠上下文内有效，无法穿透到 `parent-b` 上面。要解决，你需要提升 `parent-a` 的 z-index。

#### 场景二：opacity 偷偷创建了层叠上下文

```html
<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    z-index: 100;
  }
  .modal {
    position: fixed;
    /* opacity: 0.99; */  /* ← 加上这行，弹窗的子元素就被限制住了 */
    background: white;
    z-index: 200;
    padding: 30px;
  }
  /* 如果 .modal 有 opacity < 1，它的某个子元素 z-index: 999 也出不了 modal */
</style>
```

#### 场景三：transform 让 tooltip 飞不起来

```html
<style>
  .button {
    position: relative;
    /* transform: translateY(0); */ /* ← 加上这行，tooltip 就起不来了 */
  }
  .button .tooltip {
    position: absolute;
    z-index: 9999;
    /* 但如果 .button 有 transform，tooltip 的 9999 只在这个上下文里有效 */
  }
</style>
```

#### 场景四：多个 modal 叠加

```html
<style>
  .modal-a {
    position: fixed;
    z-index: 1000;
    /* 第一个弹窗 */
  }
  .modal-b {
    position: fixed;
    z-index: 1001;
    /* 第二个弹窗（在 A 之上打开），但如果 B 在 DOM 中是 A 的子节点... */
  }
</style>
```

**根本解决方案：弹窗挂载到 `<body>` 末尾，用 Portal 机制**（React 的 `createPortal`，Vue 的 `<Teleport>`）。

### 五、调试技巧：Chrome DevTools Layers 面板

#### 5.1 打开 Layers 面板

1. 打开 DevTools（F12）
2. 按 `Cmd+Shift+P`（Mac）或 `Ctrl+Shift+P`（Windows）
3. 输入 `Layers`，选择 **Show Layers**

或者：DevTools → 三个点菜单 → More tools → Layers

#### 5.2 Layers 面板能看什么？

- **3D 视图**：拖动旋转，直观看到 Z 轴层叠关系
- **每个层的详情**：大小、内存占用、合成原因
- **层级列表**：按照 Z 顺序排列
- **Paint Profiler**：分析绘制性能

#### 5.3 用 Elements 面板快速检查 z-index

在 Elements 面板中：
1. 选中元素
2. 看 Styles 面板中 `z-index` 的值
3. 向上追溯父元素，看哪个父元素创建了层叠上下文

```css
/* 在 Styles 面板搜索框可以直接搜 z-index */
/* 快速定位所有设置了 z-index 的元素 */
```

### 六、实战：模态弹窗的层叠管理

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>模态弹窗层叠管理</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { font-family: -apple-system, sans-serif; background: #f5f5f5; padding: 20px; }

  /* ===== 层级管理系统 ===== */
  /* 用 CSS 变量统一管理，命名清晰 */
  :root {
    --z-dropdown:   100;
    --z-sticky:     200;
    --z-overlay:    300;  /* 遮罩层 */
    --z-modal:      400;  /* 模态弹窗 */
    --z-tooltip:    500;  /* 提示框 */
    --z-toast:      600;  /* 通知栏 */
  }

  /* ===== 页面内容 ===== */
  .page-content {
    max-width: 600px;
    margin: 0 auto;
  }

  .card {
    background: white;
    padding: 24px;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }

  .btn {
    padding: 10px 24px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: opacity 0.2s;
  }
  .btn-primary { background: #4a90d9; color: white; }
  .btn-danger  { background: #e74c3c; color: white; }
  .btn:hover   { opacity: 0.9; }

  /* ===== 遮罩层 ===== */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: var(--z-overlay);
    /* 注意：没有 opacity < 1，这里用的是 rgba 透明度，不会创建层叠上下文 */
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ===== 模态弹窗 ===== */
  .modal {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 480px;
    max-height: 85vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    /* 注意：position 用默认 static，z-index 由父级 overlay 提供 */
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 0;
    font-size: 18px;
    font-weight: bold;
  }
  .modal-close {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #999;
    line-height: 1;
  }
  .modal-body   { padding: 16px 24px; line-height: 1.8; color: #555; }
  .modal-footer { padding: 0 24px 20px; display: flex; gap: 12px; justify-content: flex-end; }

  /* ===== 第二层弹窗（弹窗中的弹窗） ===== */
  .modal-stacked {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);  /* 较浅的遮罩 */
    z-index: calc(var(--z-modal) + 1); /* 比第一个弹窗高 */
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ===== 下拉菜单 ===== */
  .dropdown {
    position: relative;
    display: inline-block;
  }
  .dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 4px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    min-width: 160px;
    z-index: var(--z-dropdown);
    /* isolation: isolate;  确保不与外部 z-index 互相干扰 */
    isolation: isolate;
    padding: 8px 0;
  }
  .dropdown-menu a {
    display: block;
    padding: 8px 16px;
    color: #333;
    text-decoration: none;
    font-size: 14px;
    transition: background 0.15s;
  }
  .dropdown-menu a:hover { background: #f5f5f5; }

  /* ===== Toast 通知 ===== */
  .toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    z-index: var(--z-toast);
    font-size: 14px;
  }

  /* ===== 显示/隐藏控制 ===== */
  .hidden { display: none; }
</style>
</head>
<body>

<div class="page-content">
  <div class="card">
    <h2 style="margin-bottom:16px;">层叠上下文演示</h2>
    <p style="color:#666;margin-bottom:16px;">
      以下演示了弹窗、下拉菜单和通知的层级管理。
      所有 z-index 通过 CSS 变量统一管理，不会出现层级乱掉的问题。
    </p>

    <!-- 下拉菜单演示 -->
    <div class="dropdown" style="margin-right:12px;">
      <button class="btn btn-primary" onclick="toggleDropdown()">下拉菜单 ▼</button>
      <div class="dropdown-menu hidden" id="dropdownMenu">
        <a href="#">选项一</a>
        <a href="#">选项二</a>
        <a href="#">选项三</a>
      </div>
    </div>

    <!-- 打开弹窗 -->
    <button class="btn btn-danger" onclick="openModal()">打开确认弹窗</button>

    <!-- Toast 通知按钮 -->
    <button class="btn" style="background:#333;color:white;" onclick="showToast()">显示通知</button>
  </div>

  <div class="card">
    <h3 style="margin-bottom:12px;">层级规则说明</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="border-bottom:2px solid #eee;">
          <th style="text-align:left;padding:8px;">组件</th>
          <th style="text-align:left;padding:8px;">z-index</th>
          <th style="text-align:left;padding:8px;">说明</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px;">下拉菜单</td>
          <td style="padding:8px;">100</td>
          <td style="padding:8px;color:#888;">高于普通内容，低于弹窗</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px;">吸顶导航</td>
          <td style="padding:8px;">200</td>
          <td style="padding:8px;color:#888;">sticky 元素</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px;">遮罩层</td>
          <td style="padding:8px;">300</td>
          <td style="padding:8px;color:#888;">覆盖页面内容</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px;">模态弹窗</td>
          <td style="padding:8px;">400</td>
          <td style="padding:8px;color:#888;">弹窗内容区</td>
        </tr>
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:8px;">提示框</td>
          <td style="padding:8px;">500</td>
          <td style="padding:8px;color:#888;">hover 提示</td>
        </tr>
        <tr>
          <td style="padding:8px;">通知栏</td>
          <td style="padding:8px;">600</td>
          <td style="padding:8px;color:#888;">永远在最上面</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- 第一层弹窗 -->
<div class="overlay hidden" id="modal1Overlay">
  <div class="modal">
    <div class="modal-header">
      删除确认
      <button class="modal-close" onclick="closeModal1()">×</button>
    </div>
    <div class="modal-body">
      <p>确定要删除这条记录吗？此操作不可撤销。</p>
      <p style="color:#e74c3c;font-size:13px;">⚠ 删除后数据将永久丢失。</p>
      <p style="margin-top:12px;">
        <button class="btn btn-primary" onclick="openModal2()">打开第二层弹窗</button>
      </p>
    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal1()">取消</button>
      <button class="btn btn-danger" onclick="closeModal1()">确认删除</button>
    </div>
  </div>
</div>

<!-- 第二层弹窗（弹窗中的弹窗，z-index 更高） -->
<div class="modal-stacked hidden" id="modal2Overlay">
  <div class="modal">
    <div class="modal-header">
      再次确认
      <button class="modal-close" onclick="closeModal2()">×</button>
    </div>
    <div class="modal-body">
      <p>这是第二层弹窗，它的 z-index 比第一层更高，确保层级正确。</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-primary" onclick="closeModal2()">知道了</button>
    </div>
  </div>
</div>

<!-- Toast -->
<div class="toast hidden" id="toast">✅ 操作成功！这是一条通知消息。</div>

<script>
  function toggleDropdown() {
    document.getElementById('dropdownMenu').classList.toggle('hidden');
  }

  function openModal() {
    document.getElementById('modal1Overlay').classList.remove('hidden');
  }

  function closeModal1() {
    document.getElementById('modal1Overlay').classList.add('hidden');
  }

  function openModal2() {
    document.getElementById('modal2Overlay').classList.remove('hidden');
  }

  function closeModal2() {
    document.getElementById('modal2Overlay').classList.add('hidden');
  }

  function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
  }

  // 点击遮罩关闭弹窗
  document.getElementById('modal1Overlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal1();
  });
  document.getElementById('modal2Overlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal2();
  });

  // 点击其他位置关闭下拉菜单
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
      document.getElementById('dropdownMenu').classList.add('hidden');
    }
  });
</script>

</body>
</html>
```

### 七、最佳实践总结

#### 7.1 z-index 管理规范

```css
/* ✅ 推荐：用 CSS 变量集中管理 */
:root {
  --z-base:     0;
  --z-dropdown: 100;
  --z-sticky:   200;
  --z-overlay:  300;
  --z-modal:    400;
  --z-tooltip:  500;
}
/* 永远不要用 z-index: 99999 这种魔法数字 */
```

#### 7.2 弹窗组件的最佳实践

```html
<!-- ✅ 正确：弹窗渲染到 body 末尾 -->
<body>
  <div id="app"><!-- 应用内容 --></div>
  <div id="modal-root"><!-- 弹窗容器 --></div>
</body>

<!-- React 示例 -->
<!-- {ReactDOM.createPortal(<Modal />, document.getElementById('modal-root'))} -->

<!-- Vue 示例 -->
<!-- <Teleport to="#modal-root"><Modal /></Teleport> -->
```

#### 7.3 需要隔离层级时

```css
.widget {
  isolation: isolate;  /* 最干净的层级隔离方式 */
}
```

---

## 常见问题

**Q1：`z-index: 99999` 为什么还是不显示在最上面？**
99% 的情况是它的某个祖先元素创建了新的层叠上下文，限制了它的 z-index 作用范围。检查所有祖先元素是否有 `position + z-index`、`opacity < 1`、`transform`、`filter` 等属性。

**Q2：`opacity: 0.99` 和 `opacity: 1` 的区别只有透明度吗？**
不是。`opacity: 0.99` 会创建新的层叠上下文，`opacity: 1` 不会。这在视觉上完全一样，但层级行为完全不同。

**Q3：`position: fixed` 的元素为什么被普通元素挡住了？**
`fixed` 本身不创建层叠上下文，需要配合 `z-index`（数值）才行。也可能是因为普通元素在后面创建了新的层叠上下文。

**Q4：怎么样最快地检查某个元素是否在层叠上下文中？**
在 DevTools Elements 面板中选中元素，向上遍历父级，看哪个父级触发了层叠上下文（检查 position/z-index、opacity、transform、filter、will-change 等属性）。

**Q5：弹窗的 z-index 应该设置多大？**
不要用具体数字。建立 z-index 规范体系（用 CSS 变量），弹窗遮罩设为 300-400 区间。多层弹窗每次 +1 或 +10。永远不用 9999。

**Q6：`isolation: isolate` 会影响性能吗？**
不会。它只是创建一个层叠上下文，不触发 GPU 合成，几乎没有性能开销。放心使用。

**Q7：为什么 Flex/Grid 子元素也创建层叠上下文？**
这是规范要求：Flex/Grid 子元素只要 `z-index` 是数值（非 `auto`），就会创建层叠上下文。这保证了子元素之间的层叠顺序可预测。

---

## 实操作业

### 基础练习：z-index 迷宫

构建一个包含 5 个重叠色块的页面，通过设置不同的 position 和 z-index 值，实现特定的堆叠顺序。要求：
- 至少 3 个不同层级的元素
- 体验 `position: static` 下 z-index 无效的情况
- 体验父子层叠上下文的"隔离墙"效果

### 进阶练习：弹窗层级系统

搭建一个完整的弹窗管理系统：
- 实现一个全局层级管理器（CSS 变量方案）
- 支持多个弹窗依次打开（后打开的始终在上层）
- 弹窗内包含下拉菜单（确保下拉菜单不被弹窗容器裁剪）
- 实现点击遮罩关闭弹窗

### 挑战练习：三层嵌套层叠上下文

构造一个故意复杂的场景：
1. 外层：一个带 `opacity: 0.5` 的容器 A
2. 中层：A 内一个带 `transform: scale(1)` 的容器 B
3. 内层：B 内一个 `z-index: 99999` 的元素 C
4. 同时存在一个 `z-index: 10` 的外部元素 D

验证：C 永远无法显示在 D 之上。然后用 Layers 面板截取 3D 视图证明这一点。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：把“层叠上下文与 z-index”应用到 Atlas 的 HTML/CSS 交互界面，覆盖窄屏、键盘操作和至少一个失败状态。
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

- **层叠上下文**是 z-index 的"作用域"，上下文之间互不穿透
- 7 种触发方式中最容易踩坑的是 `opacity < 1` 和 `transform`
- 永远用 CSS 变量管理 z-index，告别魔法数字
- 弹窗组件必须挂载到 `<body>` 末尾，避免被父级层叠上下文限制
- `isolation: isolate` 是专门用于创建层叠上下文的属性，无副作用
- Chrome DevTools 的 Layers 面板是调试层叠问题的终极武器

<!-- course-nav:start -->
---

[上一篇：03-Grid 完整指南](./03-Grid完整指南.md) · [课程地图](../../README.md) · [下一篇：05 排版、颜色、图片与基础动画](./05-排版-颜色-图片与基础动画.md)
<!-- course-nav:end -->
