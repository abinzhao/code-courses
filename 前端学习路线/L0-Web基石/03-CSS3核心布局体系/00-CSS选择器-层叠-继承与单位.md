# 00 CSS 选择器、层叠、继承与单位

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L0 Web 基石
> - 先修：[03 — ARIA 与可访问性实践](../02-HTML5语义化与可访问性/03-ARIA与可访问性实践.md)
> - 建议用时：90-150 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN CSS](https://developer.mozilla.org/docs/Web/CSS)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 能写出元素、类、属性、关系、伪类和伪元素选择器
- 能按来源、重要性、层、特异性和源码顺序解释最终样式
- 理解继承值、初始值、指定值和计算值的区别
- 能在 `px`、`rem`、`em`、百分比和视口单位之间做出选择
- 能使用逻辑属性支持不同书写方向
- 能通过 DevTools 找出“CSS 为什么没有生效”

---

## 内容讲解

### 一、选择器描述匹配条件

```css
/* 元素 */
button {}

/* 类 */
.card {}

/* 属性 */
input[type="email"] {}

/* 后代与直接子元素 */
.card p {}
.card > p {}

/* 状态伪类 */
button:hover {}
button:focus-visible {}
input:invalid {}

/* 结构伪类 */
.list > :first-child {}
.list > :nth-child(2n) {}

/* 伪元素 */
.required-label::after {
  content: " *";
}
```

优先使用表达组件角色的类名，不要把 DOM 层级写得过深：

```css
/* 脆弱：结构一变就失效 */
main section article div p {}

/* 稳定：表达角色 */
.article-summary {}
```

`:where()` 的特异性为 0，适合提供易覆盖的基础规则：

```css
:where(ul, ol) {
  padding-inline-start: 1.5rem;
}
```

`:is()` 使用参数中最高的特异性：

```css
:is(header, main, footer) > .container {
  margin-inline: auto;
}
```

### 二、层叠不是只比较“谁更具体”

浏览器决定最终声明时，至少考虑：

1. 来源与重要性
2. 级联层顺序
3. 特异性
4. 作用域接近度
5. 源码顺序

常见作者样式内部可以先用这个模型：

```text
非层叠样式 < @layer 中较早的层 < @layer 中较晚的层
同一层内：特异性更高者胜
特异性相同：源码更靠后者胜
```

示例：

```css
@layer reset, base, components, utilities;

@layer base {
  button {
    font: inherit;
  }
}

@layer components {
  .primary-button {
    color: white;
    background: royalblue;
  }
}

@layer utilities {
  .is-disabled {
    opacity: 0.5;
  }
}
```

层表达的是规则来源的优先级，不应用来为每个组件临时“加权”。

### 三、特异性如何计算

可以用三列理解：

```text
ID | 类/属性/伪类 | 元素/伪元素
```

| 选择器 | 特异性 |
|---|---|
| `button` | 0-0-1 |
| `.button` | 0-1-0 |
| `[disabled]` | 0-1-0 |
| `.toolbar .button` | 0-2-0 |
| `#save-button` | 1-0-0 |
| `:where(.dialog) button` | 0-0-1 |

不要把数值简单相加成十进制。`1-0-0` 不会因为出现很多类就被常规地“进位”替代。

内联样式和 `!important` 还会改变优先级层次。`!important` 适合受控工具层或必须覆盖第三方不可修改声明的边界，不应成为日常修复手段。

### 四、继承只适用于部分属性

通常会继承：

- `color`
- `font-family`
- `font-size`
- `line-height`
- 文本方向与部分文本属性

通常不会继承：

- `margin`
- `padding`
- `border`
- `width`
- `background`

显式控制：

```css
.example {
  color: inherit;
  border-color: currentColor;
  margin: initial;
  all: revert;
}
```

区别：

| 关键字 | 含义 |
|---|---|
| `inherit` | 使用父元素计算值 |
| `initial` | 使用 CSS 属性定义的初始值 |
| `unset` | 可继承属性用 inherit，否则用 initial |
| `revert` | 回退到较低来源或较低级联层结果 |

### 五、单位表达不同参照物

| 单位 | 相对对象 | 适合场景 |
|---|---|---|
| `px` | CSS 像素 | 边框、精确小尺寸 |
| `rem` | 根元素字体大小 | 全局间距与字号 |
| `em` | 当前元素字体大小 | 与组件字号联动的内部尺寸 |
| `%` | 属性定义的包含块或基准 | 流式宽度 |
| `vw` / `vh` | 视口 | 受控的视口场景 |
| `dvh` | 动态视口高度 | 移动端地址栏变化场景 |
| `ch` | 字符“0”的宽度 | 文本行宽近似控制 |

不要用视口宽度直接缩放所有字体。正文通常采用固定 `rem` 尺度，并通过布局断点改变结构：

```css
:root {
  font-size: 100%;
}

body {
  font-size: 1rem;
}

.article {
  max-inline-size: 68ch;
}
```

`em` 会逐层复合：

```css
.parent { font-size: 1.25em; }
.child { font-size: 1.25em; }
```

子元素相对父元素再次放大。需要稳定全局尺度时优先 `rem`。

### 六、逻辑属性减少方向假设

```css
.card {
  margin-inline: auto;
  padding-block: 1rem;
  padding-inline: 1.5rem;
  border-inline-start: 4px solid currentColor;
}
```

与物理属性对照：

| 逻辑属性 | 横排从左到右时 |
|---|---|
| `inline-size` | width |
| `block-size` | height |
| `margin-inline-start` | margin-left |
| `padding-block-end` | padding-bottom |

逻辑属性能更自然地支持 RTL 和竖排，但图片裁切、绝对定位等场景仍需结合产品方向验证。

### 七、用 DevTools 解释最终值

Styles 面板用于查看：

- 哪条规则匹配
- 哪条声明被覆盖
- 声明来自哪个文件和行
- 变量最终展开为何值

Computed 面板用于查看：

- 最终计算值
- 盒模型尺寸
- 属性继承链

排查顺序：

```text
元素是否选对
→ 选择器是否匹配
→ 声明是否合法
→ 是否被更高层级覆盖
→ 变量和单位如何计算
→ 布局上下文是否改变含义
```

---

## 常见问题

### Q1：是不是选择器写得越具体越好？

不是。过高特异性让组件难以复用和覆盖。优先使用低复杂度类名与明确的层级设计。

### Q2：为什么 `width: 50%` 有时不是屏幕的一半？

百分比参照物由属性和包含块决定。宽度通常相对包含块，不一定相对视口。

### Q3：为什么子元素的 `em` 越嵌套越大？

`em` 相对当前元素的计算字体大小，父层变化会成为下一层的新基准。

### Q4：`!important` 永远不能用吗？

不是。它适用于明确管理的工具层、用户样式或必须覆盖不可修改第三方代码的边界。问题在于无规则地使用。

### Q5：CSS 自定义属性会继承吗？

普通双连字符自定义属性默认继承。可以用 `@property` 控制语法、初始值和是否继承。

### Q6：为什么 `:hover` 在手机上表现奇怪？

触摸设备没有稳定悬停概念。核心功能不能只依赖 hover，应提供点击、焦点或始终可见的入口。

---

## 实操作业

### 基础：层叠预测

为同一按钮编写 6 条来自不同层和不同特异性的规则。运行前写出最终颜色、字号和边框，再用 Computed 面板验证。

### 进阶：可覆盖组件

实现一个按钮组件：

- 基础层提供字体与最小尺寸
- 组件层提供主按钮样式
- 工具层提供间距调整
- 不使用 ID 和 `!important`
- 页面级主题可以覆盖颜色

### 挑战：RTL 验证

把 Atlas 页面根元素从 `dir="ltr"` 切换到 `dir="rtl"`：

1. 找出使用物理边距导致的错误。
2. 改为逻辑属性。
3. 验证导航、卡片、图标与文本方向。
4. 记录哪些视觉属性不能机械替换。

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L0 里程碑](../../projects/atlas/milestones/L0.md)
- 本课任务：把“CSS 选择器、层叠、继承与单位”应用到 Atlas 的 HTML/CSS 交互界面，覆盖窄屏、键盘操作和至少一个失败状态。
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

- 选择器负责匹配，层叠负责在冲突声明中决策
- `@layer` 在特异性之前组织作者样式优先级
- 继承只发生在特定属性上，可以用关键字显式控制
- 单位的关键是参照物，不是“响应式单位一定更高级”
- CSS 调试应从匹配、覆盖、计算值和布局上下文逐层定位

<!-- course-nav:start -->
---

[上一篇：03 — ARIA 与可访问性实践](../02-HTML5语义化与可访问性/03-ARIA与可访问性实践.md) · [课程地图](../../README.md) · [下一篇：01-盒模型与视觉格式化模型](./01-盒模型与视觉格式化模型.md)
<!-- course-nav:end -->
