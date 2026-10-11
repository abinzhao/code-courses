# 可访问名称、描述与状态：让控件表达准确对象

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 计算可访问名称，区分描述、状态和值，并保持可见标签与名称一致。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `A11Y-002`、`A11Y-003` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

计算可访问名称，区分描述、状态和值，并保持可见标签与名称一致。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 A11Y-002（可访问名称来源）、A11Y-003（描述、状态和可见标签一致性）；
- 预测浏览器默认行为，再用开发者工具验证；
- 制造一个与本课主题直接相关的错误，记录现象、原因、修复和复验；
- 把结论迁移到邻里集市的另一条商品数据，而不是只复现教材输入。

## 3. 预备知识

- 已完成本章前序课程，能运行本地 HTML 并打开浏览器开发者工具；
- 能区分源文件、DOM、浏览器界面与网络响应；
- 准备 `learning-log.md`，按“预测 → 操作 → 证据 → 结论”记录；
- 不把本课中的静态演示描述成真实服务端、权限或跨浏览器验证。

### 3.1 预备材料 1

```text
商品：页面中的固定示例数据
筛选：当前标签页内隐藏或显示卡片
收藏：当前标签页内的 aria-pressed 与可见文字
刷新：筛选和收藏恢复初始状态
网络：不发送收藏、预约或登录请求
```

## 4. 核心理论

### 4.1 可访问名称回答“具体是哪一个”

可访问名称是辅助技术和自动化工具识别对象的主要短标签。不同元素允许的名称来源不同：

| 对象 | 首选名称来源 | 示例 |
| --- | --- | --- |
| 文本输入 | 关联的 `<label>` | `<label for="q">商品关键词</label>` |
| 按钮 | 按钮内可见文字 | `<button>收藏二手自行车</button>` |
| 链接 | 有意义的链接内容 | `<a href="...">查看二手自行车</a>` |
| 图片 | 与目的匹配的 `alt` | `<img alt="蓝色通勤自行车侧面">` |
| fieldset 分组 | 第一个 `<legend>` | `<legend>商品状态</legend>` |
| 命名区域 | 可见标题 + `aria-labelledby` | `<section aria-labelledby="results-title">` |
| 无可见文字的必要图标按钮 | `aria-label` 或引用可见文字 | `<button aria-label="关闭价格说明">...</button>` |

在本课常见的按钮、链接和表单控件中，可以按下面的**实用排查顺序**检查名称覆盖：

```text
1. aria-labelledby 引用的文本
2. aria-label 字符串
3. 元素专属的原生标注机制，例如 label、alt、legend
4. 角色允许时的元素内容，例如 button/link 的文本
5. title 等后备来源
```

这是一条调试路线，不是对 Accessible Name and Description Computation 完整算法的替代。完整算法还会考虑：

- 当前角色是否允许由作者命名或由内容命名；
- 引用是否有效；
- 被引用节点的文本替代如何递归计算；
- 嵌入控件和值；
- 隐藏节点作为引用目标时的特殊规则；
- HTML Accessibility API Mappings 对具体元素的规定；
- 浏览器实现和平台映射。

#### `aria-labelledby`

`aria-labelledby` 通过 IDREF 引用页面中的文字，可引用一个或多个节点：

```html
<h2 id="results-title">搜索结果</h2>
<p id="results-count">共 3 件商品</p>

<section aria-labelledby="results-title results-count">
  ...
</section>
```

多个 ID 按属性中的顺序组合。它适合：

- 已有可见标题，希望同时作为区域名称；
- 一个控件需要组合“动作 + 对象”；
- 名称应随引用文字一起本地化和更新。

边界：

- ID 必须唯一且存在；
- 名称不要长成一段操作说明；
- 引用文字改变会改变计算名称；
- 它通常会覆盖 `aria-label` 和较低优先级的原生名称来源；
- 浏览器实际计算结果必须在 Accessibility 面板中确认。

#### `aria-label`

`aria-label` 直接提供字符串：

```html
<button type="button" aria-label="关闭价格说明">
  <svg aria-hidden="true" viewBox="0 0 16 16">...</svg>
</button>
```

它适用于确实没有可见文字、图标含义又必须表达的控件。它不是“提升无障碍”的通用装饰：

```html
<!-- 错误案例：覆盖了正确的可见名称 -->
<button type="button" aria-label="删除商品">收藏商品</button>
```

浏览器通常计算出名称“删除商品”，可见用户却看到“收藏商品”。这会同时伤害屏幕阅读器用户、语音控制用户、自动化测试和维护者。

#### 原生标签和内容

表单控件优先使用可见 `<label>`：

```html
<label for="query">商品关键词</label>
<input id="query" name="q" type="search">
```

按钮和链接通常直接使用清楚文字：

```html
<button type="button">收藏二手自行车</button>
<a href="/listings/bike-001">查看二手自行车详情</a>
```

不要把 placeholder 当标签：

```html
<!-- 错误案例：输入后提示消失，且名称来源不稳健 -->
<input type="search" placeholder="搜索商品">
```

placeholder 是输入格式或示例提示，不是持续可见标签。`title` 也只是弱后备，不适合作为主要标签：它在触摸、键盘和不同辅助技术中的呈现并不稳定。

### 4.2 名称、描述、状态和值承担不同职责

把所有信息都塞进 `aria-label` 会产生冗长且难维护的名称。应先分类：

| 信息 | 回答的问题 | 典型来源 |
| --- | --- | --- |
| role | 这是什么？ | 原生元素或必要的 ARIA role |
| name | 具体是哪一个？ | label、内容、alt、aria-labelledby、aria-label |
| description | 还需要知道什么条件？ | 可见帮助 + aria-describedby |
| state | 当前处于什么状态？ | checked、pressed、expanded、disabled、current |
| value | 当前值是什么？ | 输入值、范围值等原生属性 |

示例：

```html
<p id="bike-help">刷新页面后收藏状态会重置。</p>
<p id="bike-state">当前：未收藏</p>

<button
  type="button"
  aria-pressed="false"
  aria-describedby="bike-help bike-state"
>
  收藏二手自行车
</button>
```

这里：

- role 来自原生 `button`；
- name 来自按钮可见文字“收藏二手自行车”；
- description 引用可见帮助和可见状态；
- pressed state 来自 `aria-pressed="false"`；
- 视觉用户也能看到“当前：未收藏”。

如果使用 `aria-pressed` 表达切换按钮，保持按钮标签稳定通常更容易理解：

```text
name: 收藏二手自行车
pressed: false → true
visible state: 当前：未收藏 → 当前：已收藏
```

另一种合法设计是不使用 `aria-pressed`，而把动作文字在“收藏二手自行车”和“取消收藏二手自行车”之间切换。不要同时让名称说“取消收藏”、状态却仍是 `aria-pressed="false"`。

原生状态优先：

- checkbox 使用 `checked`，不要另写 `aria-checked`；
- 原生 button 使用 `disabled`，不要只写 `aria-disabled="true"`；
- `details` 使用 `open`，不必手工复制 `aria-expanded`；
- 当前页链接可使用 `aria-current="page"`；
- 自定义切换按钮在确有该模式时使用 `aria-pressed`，并由脚本同步。

ARIA 状态不会自动改变业务行为。例如 `aria-disabled="true"` 不会阻止 click，也不会自动移出焦点顺序；如果使用它，代码还必须真正阻止不允许的操作并解释原因。能用原生 `disabled` 时先用原生能力。

### 4.3 可见标签应包含在可访问名称中

如果页面上写“搜索商品”，可访问名称也应包含“搜索商品”，最好以同样顺序开头。这样：

- 语音控制用户可以说出屏幕上看到的词；
- 屏幕阅读器用户与协助者讨论同一个名称；
- 自动化测试更接近用户界面；
- 翻译不会维护两套互相冲突的文案。

正确：

```html
<button type="button">收藏二手自行车</button>
```

也可以在名称中补充上下文，但必须保留可见标签：

```html
<span id="favorite-visible">收藏</span>
<span id="favorite-item" class="visually-hidden">二手自行车</span>
<button
  type="button"
  aria-labelledby="favorite-visible favorite-item"
>
  收藏
</button>
```

上例为了演示组合来源而重复“收藏”节点，实际代码应避免复杂化。最简单、最稳健的版本仍然是直接把完整文字放进按钮。

错误：

```html
<button type="button" aria-label="加入心愿单">收藏</button>
```

虽然两句话业务上相近，可见标签“收藏”并未出现在计算名称“加入心愿单”中。修复时先统一产品文案，不要靠更多 ARIA 同时保留两种叫法。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `A11Y-002`：可访问名称来源
- `A11Y-003`：描述、状态和可见标签一致性

## 6. 最小可运行案例

在个人练习目录中新建 `practice/02-accessible-names-descriptions-states/minimal.html`，完成以下最小观察：

1. 写出标准文档骨架、可见 `h1` 和本课需要的最少正文；
2. 为 A11Y-002（可访问名称来源） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
3. 为 A11Y-003（描述、状态和可见标签一致性） 写一个可独立观察的正确用法，并在相邻文字中写明预期；
4. 在打开页面前写下预期 DOM、默认行为或请求结果；
5. 用 Elements 以及本课对应的 Console、Network 或 Accessibility 证据逐项复验；
6. 破坏一个关键父子关系、属性或状态，再按同一路径恢复。

通过标准：源码中存在每个覆盖项的真实元素或脚本，不用注释、外链说明或最终截图代替实现；删除无关装饰后，案例仍能独立证明本课结论。

## 7. 邻里集市集成案例

本章的完整项目代码集中在 [键盘、焦点与 ARIA：完成可预测的操作路径](03-keyboard-focus-skip-links-aria.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 A11Y-002（可访问名称来源） 对应的元素、属性或状态；
- 在项目中实现并标出与 A11Y-003（描述、状态和可见标签一致性） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`03-keyboard-focus-skip-links-aria.md`](03-keyboard-focus-skip-links-aria.md)。

## 8. 常见错误与排查路径

### 8.1 明确错误：`aria-label` 与可见按钮文字冲突

制造故障：

```html
<button type="button" aria-label="删除商品">收藏商品</button>
```

| 阶段 | 记录 |
| --- | --- |
| 现象 | 视觉写“收藏商品”，可访问名称却可能是“删除商品” |
| 证据 | Elements 选中按钮，Accessibility Name 来源指向 `aria-label` |
| 原因 | 高优先级作者名称覆盖按钮内容 |
| 影响 | 语音控制、读屏、自动化和视觉协助者使用不同名称 |
| 修复 | 删除不必要的 `aria-label`，保留 `<button>收藏商品</button>` |
| 复验 | Name 来自 contents，计算名称与可见文字一致 |

不要用第二个 `aria-label="收藏商品"` 把错误“改对”。如果可见文字已经足够，删除冗余名称源更稳健。

### 8.2 `aria-labelledby` 引用丢失或重复 ID

错误：

```html
<h2 id="result-title">搜索结果</h2>
<section aria-labelledby="results-title">...</section>
```

属性引用的是 `results-title`，实际 id 是 `result-title`。

排查：

```js
const region = document.querySelector("section[aria-labelledby]");
const ids = region.getAttribute("aria-labelledby").split(/\s+/);
ids.map((id) => [id, document.getElementById(id)]);
```

预期每个 ID 对应唯一元素。修复拼写后，在 Accessibility 面板确认 Name 来源，不要只看到 Console 返回节点就结束。

重复 ID 也会让引用落到错误节点。HTML 校验和 `document.querySelectorAll("#results-title").length` 可以提供证据。

### 8.3 把帮助文字误当名称

错误：

```html
<p id="query-help">输入商品标题，最多 40 个字符。</p>
<input type="search" aria-labelledby="query-help">
```

此时控件名称可能变成整段帮助，却没有稳定的“商品关键词”标签。

修复：

```html
<label for="query-fixed">商品关键词</label>
<p id="query-help-fixed">输入商品标题，最多 40 个字符。</p>
<input
  id="query-fixed"
  type="search"
  aria-describedby="query-help-fixed"
>
```

复验：

```text
name: 商品关键词
description: 输入商品标题，最多 40 个字符。
```

仍不保证某个屏幕阅读器以固定顺序朗读两者。

### 8.4 可见状态与 ARIA 状态失步

故障 A：

```js
stateText.textContent = "收藏状态：已收藏";
```

只改可见文字，`aria-pressed` 仍为 false。

故障 B：

```js
button.setAttribute("aria-pressed", "true");
```

只改 ARIA，视觉仍写“未收藏”。

修复：在同一状态转换函数中更新两者，并用一个布尔值生成输出。复验时同时检查：

- 页面文字；
- Elements 属性；
- Accessibility state；
- 再次激活后的逆向状态；
- 刷新后的教学初始状态。

### 8.5 标准诊断与恢复记录

每个故障用同一模板：

```text
文件：
浏览器与版本：
复现按键：
现象：
DOM/属性证据：
Accessibility role/name/description/state：
document.activeElement：
Console：
Network：
根因：
最小修复：
修复后复验：
未验证组合：
```

“改完看起来正常”不是恢复证据。至少保留故障前和修复后的名称来源、焦点路径或状态属性对照。

## 9. 课后题

### 9.1 为什么 Accessibility 树不能当作 DOM 的完整副本？

<details>
<summary>参考答案</summary>

两者服务对象不同。DOM 保存解析后的节点、属性和文本关系；可访问树面向平台辅助 API，暴露角色、名称、描述、状态和值。纯布局容器可能被省略，不呈现内容通常不暴露，原生元素会映射成平台角色。浏览器和平台也可能有实现细节差异。因此调试要同时看源码、DOM、Accessibility 计算和真实交互。
</details>

### 9.2 一个按钮同时有可见文字、`aria-label` 和 `aria-labelledby`，先检查哪一个名称来源？

<details>
<summary>参考答案</summary>

在允许作者命名且引用有效的常见按钮场景中，先检查 `aria-labelledby`，再检查 `aria-label`，然后才是按钮内容。实际结果应以浏览器 Accessibility 面板显示的计算来源为证据。最小修复通常是删除不必要的高优先级来源，让清楚的可见文字成为名称。
</details>

### 9.3 placeholder 为什么不能替代 label？

<details>
<summary>参考答案</summary>

placeholder 在输入后消失，通常对比度和展示行为也不同；它更适合示例或格式提示。控件需要持续可见、可点击且稳定关联的名称，因此应使用 `<label>`。提示再用 `aria-describedby` 关联。
</details>

### 9.4 两个 nav 都没有名称一定错误吗？

<details>
<summary>参考答案</summary>

页面只有一个 nav 时，角色本身可能足以定位；有多个同类型 navigation 地标时，应提供可区分名称。名称要说明业务范围，如“主要”“商品分类”，而不是“导航 1”“导航 2”。
</details>

### 9.5 `aria-describedby` 是否保证帮助文字会在每次聚焦时完整朗读？

<details>
<summary>参考答案</summary>

不保证。它建立可访问描述关系，浏览器会映射给平台辅助 API；最终呈现受屏幕阅读器、浏览器、语言、详细程度设置和交互模式影响。教材只断言计算描述和引用关系，具体输出需在目标组合实测。
</details>

### 9.6 `aria-pressed` 能保存收藏吗？

<details>
<summary>参考答案</summary>

不能。它只表达切换按钮当前的可访问状态。真实收藏还需要用户身份、授权、服务端写入、错误恢复和持久化。本课刷新即重置。
</details>

## 10. 实践练习

### 10.1 基础练习：建立名称来源表

**文件：**

```text
market-learning/practice/html-chapter-07/name-sources.html
market-learning/practice/html-chapter-07/evidence/name-sources.md
```

**任务：**

创建包含以下对象的完整 HTML：

1. 有 `<label>` 的搜索框；
2. 有可见文字的 button；
3. 有 `href` 和具体文字的 link；
4. 有 `alt` 的信息图片，图片可使用你有权使用的真实本地资源；
5. 由可见 h2 通过 `aria-labelledby` 命名的 section；
6. 由 `legend` 命名的 checkbox 分组；
7. 使用 `aria-describedby` 的输入提示。

**运行：**

```bash
cd market-learning/practice/html-chapter-07
python3 -m http.server 4173
```

**证据：**

对每个对象记录：

```text
DOM 元素：
role：
name：
name 来源：
description：
state/value：
```

**预期：**

- 每个交互控件有准确名称；
- 可见标签与 name 一致；
- 帮助文字进入 description，不替代 name；
- 图片替代文本取决于真实图片目的；
- 没有为已有原生角色重复写 role。

**失败观察：**

- Computed Name 为空；
- Name 来源意外指向 `aria-label` 或 title；
- IDREF 无目标；
- 重复 id；
- 图片资源 404 与 alt 设计混为一谈。

**答案标准：**

名称来源表能从开发者工具复验；删掉任一名称源后，学习者能预测并观察下一级来源，而不是只写定义。

### 10.2 故障注入：名称覆盖与重复地标

**文件：**

```text
market-learning/practice/html-chapter-07/fault-name-landmark.html
market-learning/practice/html-chapter-07/evidence/fault-name-landmark.md
```

**注入：**

1. 给“收藏二手自行车”增加 `aria-label="删除二手自行车"`；
2. 把两个 nav 都改为 `aria-label="商品"`；
3. 把查询框 `label for` 改成不存在的 id；
4. 保留页面其他部分不变。

**要求：**

按“现象 → Accessibility 证据 → 根因 → 最小修复 → 复验”记录三项。修复时：

- 删除冲突 aria-label；
- 给地标恢复业务唯一名称；
- 修复 label/id 关联；
- 不新增 title 作为补丁；
- 不使用屏幕阅读器固定朗读句子作为唯一证据。

**完成标准：**

修复前后都记录 Computed Name 来源；地标树中两个 navigation 可区分；输入框名称来自 label。

### 10.3 手工测试练习：区分四类证据

**文件：**

```text
market-learning/practice/html-chapter-07/evidence/manual-a11y-report.md
```

报告必须分开：

1. HTML/ARIA 静态检查；
2. 浏览器 Accessibility 树；
3. 键盘人工路径；
4. 目标屏幕阅读器/浏览器组合，若未测试则明确写未测试。

**参考报告骨架：**

```text
# 无障碍人工检查

## 环境
- 操作系统：
- 浏览器与版本：
- 键盘设置：
- 辅助技术：

## 静态结构
- 重复 ID：
- 正数 tabindex：
- 无名称控件：

## Accessibility 树
- 地标：
- 标题：
- 名称来源：
- 描述：
- 状态：

## 键盘路径
- 正向：
- 反向：
- Enter：
- Space：
- skip link：
- 可见焦点：

## 未验证
- 组合：
- 原因：
- 剩余风险：
```

**答案标准：**

报告不把一种证据扩大成全部合规结论，不保证精确朗读，不隐藏未测平台。

## 11. 阶段验收

### A11Y-002：可访问名称来源

- [ ] 每个输入有可见 label；
- [ ] 每个按钮和链接名称具体；
- [ ] 商品收藏按钮名称包含商品标题；
- [ ] 能指出名称来自 label、contents、alt、legend 或 aria-labelledby；
- [ ] 不依赖 placeholder/title 作为主要标签；
- [ ] ARIA IDREF 唯一且存在；
- [ ] 已检查高优先级名称源是否意外覆盖。

### A11Y-003：描述、状态和可见标签一致性

- [ ] 帮助文字用 `aria-describedby` 关联；
- [ ] 名称没有塞入整段说明；
- [ ] `aria-pressed` 与可见收藏状态同步；
- [ ] 可见标签包含在计算名称中；
- [ ] 原生 checked/disabled/open 等状态没有被冗余 ARIA 复制；
- [ ] 不保证某款屏幕阅读器的固定朗读句子。

## 12. 常见问题

### Q1：所有元素都需要 aria-label 吗？

不需要。大多数交互元素应从可见 label、按钮内容、链接内容、alt 或 legend 获得名称。无差别添加 aria-label 容易覆盖正确文字并制造翻译负担。

### Q2：`aria-labelledby` 一定比 `<label>` 更好吗？

不是。普通表单控件首选 `<label>`，它还提供点击标签聚焦等原生行为。`aria-labelledby` 适合组合多个现有文本或命名区域，不是替换全部原生标签的升级版。

### Q3：可以把可访问名称藏起来，只留图标吗？

有些紧凑控件确实需要图标和 `aria-label`，但先判断可见文字是否更易理解。图标含义并不总是普遍，语音控制还需要可说出的标签。重要动作通常保留可见文字更稳健。

### Q4：`aria-describedby` 引用隐藏内容可以吗？

规范算法对被引用节点有专门规则，但工程上应优先让重要帮助和错误对所有用户可见。不要用隐藏长文补救视觉界面缺少说明；还要在目标浏览器与辅助技术组合检查实际映射。

### Q12：为什么按钮名称不随“已收藏”改成“取消收藏”？

本课选择稳定标签 + `aria-pressed` 的切换按钮模式，并用可见文字显示状态。也可以设计成动作标签“收藏/取消收藏”并不使用 pressed；关键是模式一致，不让名称、状态和可见文字互相矛盾。

### Q15：搜索结果变化为什么没有 `aria-live`？

这是课程分层：本课聚焦静态语义、名称和状态基础。[本章第 4 课](04-live-regions-status-busy.md)专门处理 status、alert、live region、`aria-busy`、结果更新与焦点策略，避免在尚未解释通知模型时偷偷加入。

### Q18：收藏按钮需要把商品描述都放进名称吗？

不需要。名称应短而具体，例如“收藏二手自行车”。价格、教学状态和补充条件属于可见内容或 description。超长名称会降低按钮列表的可扫描性。

### Q20：本页能算符合 WCAG 吗？

不能仅凭本课案例作出完整合规声明。WCAG 评估涉及全部适用成功标准、完整流程、内容、平台和人工判断。本课只覆盖 A11Y-001–006，并明确后续动态状态、媒体替代、缩放、颜色和其他标准仍待验证。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：计算可访问名称，区分描述、状态和值，并保持可见标签与名称一致。
- `A11Y-002`：可访问名称来源
- `A11Y-003`：描述、状态和可见标签一致性
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：语义角色、地标与标题：建立可导航的页面骨架](01-semantic-roles-landmarks-headings.md) · [下一课：键盘、焦点与 ARIA：完成可预测的操作路径](03-keyboard-focus-skip-links-aria.md) · [返回 HTML 模块](../README.md)
