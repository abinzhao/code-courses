# 第六章：原生交互、DOM 与事件

> 从浏览器已有行为出发，让商品页在内存中响应操作，并能追踪每次节点、状态、事件和焦点变化。

## 本章任务

商品发布预览已经能读取表单。本章加入四类交互：

1. 展开交接规则、打开预约确认框和价格帮助；
2. 从安全数据创建、移动、更新和删除商品节点；
3. 用事件传播和委托管理动态收藏按钮；
4. 用 template 与自定义元素封装可重复的商品说明。

所有收藏和预约都只存在当前页面内存。刷新即丢失，也没有服务端独占、权限、事务或并发控制。

## 学习成果

完成本章后，你将拥有：

- 一组可键盘操作的 details、dialog 和 popover；
- 一份 HTML 内容属性与 DOM 属性对照记录；
- 一个安全创建商品卡并处理空查询的 DOM 案例；
- 一条可预测捕获、目标、冒泡与默认动作的事件链；
- 一个使用事件委托管理动态列表的内存收藏页；
- 一个可重复连接、清理监听并接收 slot 内容的自主自定义元素；
- 一份说明 Shadow DOM 封装不等于安全隔离的边界记录。

## 详细教程

| 顺序 | 教程 | 核心问题 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [details、summary 与 toggle](06-interactive-dom/01-details-summary-toggle.md) | 复用 details、summary 的展开契约，观察 open、toggle 和命名组行为。 | 1.5–2.5 小时 |
| 2 | [Dialog 模式、结果与焦点恢复](06-interactive-dom/02-dialog-modal-focus-results.md) | 区分 dialog 状态、顶层和模态行为，处理关闭结果、取消、初始焦点与恢复。 | 1.5–2.5 小时 |
| 3 | [Popover、调用者与回退](06-interactive-dom/03-popover-invokers-fallback.md) | 使用 Popover、声明式调用者和脚本 API，并按能力检测提供可见回退。 | 1.5–2.5 小时 |
| 4 | [DOM 查询、集合与导航](06-interactive-dom/04-dom-query-collections-navigation.md) | 查询当前 DOM，区分静态与动态集合，并沿节点和元素关系导航。 | 1.5–2.5 小时 |
| 5 | [节点创建、移动、删除与安全文本](06-interactive-dom/05-dom-create-move-remove-safe-text.md) | 创建、插入、移动、替换和删除节点，并用 textContent 守住不可信文本边界。 | 1.5–2.5 小时 |
| 6 | [属性、dataset 与状态同步](06-interactive-dom/06-dom-attributes-dataset-state-sync.md) | 同步 class、data-*、普通与布尔属性、ARIA、文字和可用性状态。 | 1.5–2.5 小时 |
| 7 | [监听器生命周期与事件传播](06-interactive-dom/07-event-listener-lifecycle-propagation.md) | 注册和移除事件监听器，使用 once 与 AbortSignal，并预测捕获、目标和冒泡顺序。 | 1.5–2.5 小时 |
| 8 | [事件目标、默认行为与语义事件](06-interactive-dom/08-event-target-defaults-semantic-events.md) | 区分 target 与 currentTarget、传播与默认行为，并按元素语义选择事件。 | 1.5–2.5 小时 |
| 9 | [事件委托与合成事件](06-interactive-dom/09-event-delegation-synthetic-events.md) | 在稳定祖先上委托动态列表事件，并区分合成事件与真实用户操作。 | 1.5–2.5 小时 |
| 10 | [Template、DocumentFragment 与克隆](06-interactive-dom/10-template-fragment-clone.md) | 解析但暂不激活 template 内容，使用 DocumentFragment 和 cloneNode() 安全复用结构。 | 1.5–2.5 小时 |
| 11 | [自定义元素生命周期与属性同步](06-interactive-dom/11-custom-elements-lifecycle-attributes.md) | 注册自主自定义元素，管理连接、断开、采用和属性变化生命周期。 | 1.5–2.5 小时 |
| 12 | [Shadow DOM、slot 与渐进增强](06-interactive-dom/12-shadow-dom-slots-progressive-enhancement.md) | 封装 Shadow DOM，分配 Light DOM 内容并观察 slot 变化，同时保留定义失败时的内容基线。 | 1.5–2.5 小时 |

预计总学习时间：20–24 小时。

## 知识依赖图

```text
第五章的原生控件与提交事件
  → details/dialog/popover 默认行为
  → DOM 查询、节点与属性状态
  → 事件阶段、默认动作与委托
  → template/DocumentFragment 克隆
  → 自定义元素、Shadow DOM 与 slot
  → 内存状态与界面/焦点同步
```

不要从“监听 click”开始猜实现。先明确原生元素已经提供什么，再决定哪些状态必须由脚本维护。

## 本章知识地图

### 原生交互

- details/summary、open、toggle 和命名分组；
- dialog 的 show/showModal/close；
- cancel、close、method=dialog 和焦点恢复；
- popover 模式、invoker 属性与切换事件；
- 顶层、模态与非模态的区别；
- 特性检测和可见回退。

### DOM

- ID、选择器、静态 NodeList 与动态集合；
- 节点和元素导航、closest、matches；
- 创建、插入、移动、替换和删除；
- textContent 与 innerHTML 安全边界；
- classList、dataset、属性和 DOM 属性；
- 状态、类名、ARIA 与可见文字同步。

### 事件

- add/removeEventListener 与 AbortSignal；
- 捕获、目标、冒泡；
- target、currentTarget、closest；
- preventDefault、stopPropagation、passive；
- click、input、change、submit、invalid、toggle、close；
- 动态列表的事件委托。

### 模板和组件

- template.content、DocumentFragment、深克隆；
- 自主自定义元素命名和注册；
- connected/disconnected/attributeChanged；
- 重连安全的初始化与清理；
- Shadow DOM、slot、fallback 和 slotchange；
- 封装、样式边界和安全边界。

详细落点见 [HTML 教学覆盖矩阵](HTML-COVERAGE.md) 的 DOM、EVT、INT 组。

## 章级综合案例：内存收藏与预约

### 个人目录

```text
market-learning/
└── practice/
    └── html-chapter-06/
        ├── index.html
        └── event-log.md
```

### 页面结构

- 商品列表由 template 克隆生成；
- 每个商品使用稳定 `data-listing-id`；
- 商品文字通过 `textContent` 写入；
- 收藏使用原生 button 和 `aria-pressed`；
- 交接规则使用 details；
- 预约确认使用 `showModal()`；
- 辅助价格说明使用 popover，并提供不支持时的可见回退；
- 最近操作由 `role="status"` 告知；
- 自定义元素只封装商品边界说明，不隐藏必要正文。

### 状态约定

```text
listings：固定内存商品
favorites：当前页 Set
reservation：available 或 reserved 的演示状态
selectedListingId：当前对话框目标
```

任何界面变化都必须能追溯到这组内存状态。不得把 CSS 类名本身当作唯一业务状态，也不得声称刷新后保留。

### 事件要求

- 列表容器统一委托收藏点击；
- 嵌套图标点击仍通过 `closest()` 找到按钮；
- 表单提交阻止演示导航，但不滥用 stopPropagation；
- AbortController 可以清理一组临时监听器；
- dialog 关闭后焦点回到仍存在且可操作的入口；
- 动态删除入口时有明确焦点回退；
- 事件日志记录 target、currentTarget、phase 与 defaultPrevented。

## 观察与证据

```text
原生元素及默认行为：
打开前后 DOM 属性：
document.activeElement：
静态与动态集合长度：
节点移动前后父元素：
捕获/目标/冒泡顺序：
默认动作是否取消：
委托时 target 与 closest：
监听器清理证据：
组件连接/断开次数：
slot 分配结果：
刷新后的状态：
```

## 章级故障演练

1. 用 CSS 显示未调用 `showModal()` 的 dialog，比较背景和焦点；
2. 把 popover 当模态框，证明背景仍可操作；
3. 选择器拼错得到 null，却继续访问属性；
4. 用 innerHTML 插入带标签的商品标题；
5. 在动态集合遍历时删除节点导致跳项；
6. 委托逻辑只比较 `event.target === button`，图标点击失败；
7. 用 stopPropagation 掩盖错误重复处理；
8. 自定义元素重连后重复绑定监听；
9. 重复调用 `customElements.define()`；
10. 把 Shadow DOM 描述成敏感数据保护。

每次保留现象、Console/DOM/焦点证据、根因、最小修复和复验。

## 本章验收

### 原生交互

- [ ] 键盘可以展开 details、关闭 dialog 和操作 popover；
- [ ] 模态与非模态选择正确；
- [ ] 背景交互和焦点行为与模式一致；
- [ ] 不支持新特性时仍能读取必要内容；
- [ ] 取消与确认具有不同状态结果。

### DOM 与事件

- [ ] 空选择有显式处理；
- [ ] 用户文字不经过 HTML 解析；
- [ ] 节点移动、克隆和删除行为可以解释；
- [ ] 内容属性与 DOM 属性没有混淆；
- [ ] 能预测事件阶段和默认动作；
- [ ] 委托支持动态节点和嵌套点击目标；
- [ ] 监听器可以按生命周期清理。

### 组件与边界

- [ ] template 克隆后正确查询并绑定行为；
- [ ] 自定义元素重连不会重复初始化；
- [ ] 属性变化与可见输出同步；
- [ ] slot fallback 和已分配节点均可验证；
- [ ] Shadow DOM 未被当作权限或秘密保护；
- [ ] 收藏和预约始终标明“仅内存”。

## 进入下一章前

如果交互只能靠鼠标完成，状态只存在 class 而没有可见文字，或者你不能解释一次点击为何触发当前处理函数，应先重做对应路径。下一章会从不同读者和搜索工具的角度审计整套页面。

[上一章：表单、提交与验证](05-forms-validation.md) · [开始本章第一课](./06-interactive-dom/01-details-summary-toggle.md) · [下一章：无障碍、SEO 与质量](07-accessibility-seo.md) · [返回 HTML 模块](README.md)
