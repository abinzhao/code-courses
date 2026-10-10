# 动态状态、焦点与媒体替代：让页面变化可感知、可定位、可恢复

> 所属章节：无障碍、SEO 与质量
>
> 建议学习时间：5–6 小时
>
> 阶段成果：完成一份能通知查询与收藏状态、能从错误和动态删除中恢复焦点、并为媒体与图表提供等价内容的“邻里集市质量页”

## 任务卡

小林可以用键盘搜索商品，也能打开预约对话框，但页面变化后仍有一组隐蔽问题：

- 视觉用户看见“找到 3 件”，读屏用户却不知道结果已经改变；
- 每输入一个字符都发送紧急通知，真正重要的错误反而被淹没；
- 发布失败后只出现红框，焦点仍停在提交按钮；
- 从对话框删除商品后，原触发按钮随商品一起消失，焦点落回文档开头；
- 商品照片、验货视频和 Canvas 图表包含的信息没有等价文字；
- 200% 缩放后按钮被裁切，触控目标太小，状态只靠红绿色区分；
- 用户要求减少动态效果，页面仍播放非必要位移动画。

本课不把“加一个 ARIA 属性”当作完成。你会建立一条完整链路：

```text
业务状态变化
  → 更新可见文字和语义状态
  → 选择是否需要通知
  → 仅在恢复任务时移动焦点
  → 保留可操作的下一步
  → 在目标浏览器与辅助技术组合中人工复验
```

**完成本课后，你将交付：**

- 一个区分 `status`、`alert` 和普通 live region 的最小实验页；
- 一个使用 `aria-live`、`aria-atomic`、`aria-relevant` 与 `aria-busy` 的可观察记录；
- 一条不会按每次按键轰炸通知的内存搜索流程；
- 一组带 `aria-pressed` 和共享状态区的收藏按钮；
- 一份同时包含字段错误、错误汇总与首个无效字段焦点的失败表单；
- 一条覆盖正常关闭、触发入口消失和动态列表删除的焦点恢复链；
- 一个包含图片替代、字幕/文字稿/音频描述说明的媒体区域；
- 一张 Canvas 图和始终可见的文字摘要、语义表格；
- 一份 200% 文字缩放、400%/窄视口回流、触控目标、非颜色状态与减少动效记录；
- 一份写明操作系统、浏览器、读屏软件、版本、步骤和未测组合的人工验证报告。

所有搜索、收藏、删除和表单预览都只保存在当前页面内存。刷新会恢复初始 HTML；本课不使用 `localStorage`、网络请求、账号、服务端授权、真实发布、真实收藏或并发控制。

## 1. 任务背景

### 1.1 动态页面增加了“变化之后”的责任

静态 HTML 的主要问题是“当前内容是否有结构”。页面开始用 JavaScript 改变内容后，还必须回答：

1. 用户没有看着变化位置时，怎样知道变化发生了？
2. 变化是否需要打断用户当前正在做的事？
3. 当前焦点是否仍指向存在、可见、可操作的元素？
4. 删除、失败或关闭后，用户从哪里继续？
5. 视觉信息是否同时存在于普通文字和语义结构中？
6. 放大、窄屏、触控和减少动效设置下，任务是否仍可完成？

动态内容可以正确显示，却仍然无法被辅助技术及时发现。反过来，盲目把所有区域设为 `aria-live="assertive"`，也会制造新的障碍：通知抢占当前语音、多个更新彼此覆盖、用户无法听完输入标签。

### 1.2 可见变化、通知和焦点是三个通道

这三个通道不能互相代替：

| 通道 | 解决的问题 | 典型机制 | 不应承担的职责 |
| --- | --- | --- | --- |
| 可见内容 | 页面现在是什么状态 | 普通文本、标题、列表、错误说明 | 不保证离开该区域的用户会立即知道变化 |
| 状态通知 | 不移动位置也能得知变化 | `status`、`alert`、`aria-live` | 不提供任务位置，不替代可见内容 |
| 焦点管理 | 把用户放到下一步或恢复点 | `focus()`、dialog 原生行为、回退链 | 不应为每个内容更新抢走焦点 |

查询完成通常只需要礼貌通知，不需要把焦点移到结果。提交失败需要让用户立即恢复输入，通常要更新错误并把焦点移到首个无效字段。打开模态 dialog 则必须让焦点进入其中，关闭后再回到合理入口。

### 1.3 本课的可观察完成标准

本课不是“属性都写了”就通过。至少要观察：

1. 查询提交后，可见结果数与实际可见商品数一致；
2. 查询状态使用非打断式通知，焦点仍留在搜索框或提交按钮；
3. 快速连续更新时，最终可见状态正确，并明确记录中间通知可能被合并；
4. 紧急失败使用克制的 alert，不把输入提示和普通成功都设成紧急；
5. `aria-busy` 在一批更新开始时为 `true`，完成或失败后一定恢复 `false`；
6. 收藏按钮的文字、`aria-pressed` 和内存 `Set` 保持一致；
7. 发布失败时出现字段旁错误和错误汇总，首个无效控件获得焦点；
8. dialog 正常关闭后回到触发按钮，触发按钮消失时回到相邻操作或列表标题；
9. 删除当前商品后，`document.activeElement` 不是 `body`，也不是已断开的节点；
10. 图片不可见时仍能知道与任务有关的信息；
11. 视频没有画面或声音时，字幕、文字稿和视觉描述覆盖关键事实；
12. Canvas 不绘制或不能被理解时，文字摘要与表格仍完整；
13. 200% 文字缩放和约 320 CSS px 内容宽度下，主路径不发生二维整页滚动；
14. 状态不只靠颜色，指针目标有足够尺寸或间距；
15. `prefers-reduced-motion: reduce` 下非必要位移动画被移除，但最终状态仍出现；
16. 人工读屏报告精确写明测试组合和未覆盖组合，不写“读屏测试通过”这种无范围结论。

## 2. 学习目标

完成本课后，你应能：

- 解释 live region 监听的是后续变化，而不是给静态文字增加“更强语义”；
- 根据紧急程度选择普通文字、`role="status"`、`role="alert"` 或显式 `aria-live`；
- 说明 `polite` 与 `assertive` 是通知优先级意图，不是精确播报时刻保证；
- 使用 `aria-atomic` 决定通知整个区域还是变化片段；
- 只在增加、删除或文字变化对任务有意义时设置 `aria-relevant`；
- 用 `aria-busy` 表示一批 DOM 更新尚未完成，并保证所有结束路径复位；
- 解释浏览器、无障碍 API 和辅助技术为何可能合并或丢弃快速更新；
- 让查询只通知稳定结果，而不是每个按键或每个列表节点；
- 让收藏按钮的可见文字、`aria-pressed` 和通知互相一致；
- 生成可见错误汇总，并把每条错误链接回对应控件；
- 正确设置和清理 `aria-invalid`、字段错误与描述关联；
- 在失败提交后聚焦首个无效控件，而不是连续制造两次焦点跳转；
- 为 dialog 记录调用入口，并在入口失效时选择局部回退点；
- 为动态列表删除选择“下一项 → 上一项 → 列表标题/稳定入口”的恢复顺序；
- 区分信息图片、装饰图片、链接图片和复杂图片的替代策略；
- 区分 captions、subtitles、文字稿与 audio description 的职责；
- 为 Canvas/图表保留可见摘要和语义表格，而不是只写一句 `aria-label`；
- 解释 200% 文字缩放与 400%/320 CSS px 回流检查的不同目的；
- 准确区分 WCAG 2.2 AA 的 24 × 24 CSS px 目标尺寸边界与常见 44 × 44 工程目标；
- 用文字、图标形状或原生状态补足颜色提示；
- 响应减少动效设置，同时保留状态、内容和操作结果；
- 设计“核心内容先存在，脚本只增强状态与操作”的渐进增强页面；
- 写出范围准确、可复验的键盘、放大、媒体与读屏人工测试记录。

## 3. 预备知识

开始前建议完成：

- [可访问名称、地标与键盘](01-accessible-name-landmarks-keyboard.md)；
- [约束验证与文件](../05-forms-validation/04-constraint-validation-files.md)；
- [原生交互元素](../06-interactive-dom/01-native-interactive-elements.md)；
- [事件、表单与委托](../06-interactive-dom/03-events-forms-delegation.md)；
- [响应式图片](../03-images-media-embedding/01-images-responsive-performance.md)；
- [音视频与字幕](../03-images-media-embedding/02-audio-video-tracks.md)；
- [嵌入、SVG 与 Canvas](../03-images-media-embedding/03-embedding-svg-canvas.md)。

你需要知道：

- DOM 节点变化和 CSS 显示变化不是同一件事；
- `textContent` 会把数据作为文字写入，不会再次解析 HTML；
- `hidden` 会让元素退出普通渲染和可访问树；
- `focus()` 只能可靠作用于仍连接、可聚焦且未被隐藏或禁用的元素；
- `dialog.showModal()`、`close` 事件和 `document.activeElement` 的基本用法；
- 原生表单约束与业务/服务端验证的边界；
- 图片 `alt`、`track`、Canvas 与表格的基本结构；
- CSS 媒体查询可以响应视口和用户偏好。

本课不要求：

- 安装无障碍扫描器、框架、图表库或自定义播放器；
- 在所有读屏软件中得到完全相同的播报句子；
- 用 ARIA 修复错误的 DOM 顺序或不可操作的自制控件；
- 实现服务器搜索、收藏持久化、商品发布、上传或删除；
- 把自动扫描结果描述成 WCAG 合规认证；
- 把某一次 VoiceOver、NVDA 或 TalkBack 结果推广为所有组合结论。

完整示例可以用 `file://` 直接打开。若浏览器或组织策略限制本地脚本，可在个人练习目录使用已有静态服务器；教材仓库不新增依赖、实验目录或素材文件。

## 4. 核心理论

### 4.1 从业务变化到辅助技术通知

浏览器解析 HTML 后，会基于 DOM、样式和平台映射形成可访问性树。辅助技术通常通过操作系统无障碍 API 读取这棵树。live region 的基本流程是：

```text
页面先存在一个 live region
  → JavaScript 改变其文本或后代
  → 浏览器产生无障碍树变化事件
  → 平台无障碍 API 暴露事件
  → 辅助技术按队列、优先级和用户设置处理
  → 用户可能听到通知
```

这里没有“每次 `textContent` 赋值都必定逐字播报”的保证。通知会受到以下因素影响：

- region 是否在变化前已进入可访问树；
- 元素是否被 `hidden`、`display: none` 或父级隐藏；
- 更新是否在同一事件循环中被后续更新覆盖；
- `aria-live` 优先级、`aria-atomic` 与 `aria-relevant`；
- region 或祖先是否仍标为 `aria-busy="true"`；
- 浏览器与辅助技术组合的映射和队列策略；
- 当前是否正在朗读更高优先级内容；
- 用户的语音详细程度与中断设置。

因此，设计目标不是控制每一个发音时刻，而是保证：

1. 最终状态始终可见并可重新找到；
2. 重要变化使用恰当优先级；
3. 通知短、稳定、带上下文；
4. 即使通知被合并，用户仍能完成任务。

### 4.2 `status`、`alert` 与显式 live region

#### `role="status"`：礼貌而非紧急

`status` 适合“不移动焦点也值得知道”的结果，例如查询数量、收藏成功、筛选完成。它具有隐式 `aria-live="polite"`，并且隐式 `aria-atomic="true"`。

```html
<p id="search-status" role="status">
  尚未查询。
</p>
```

```js
const searchStatus = document.querySelector("#search-status");
searchStatus.textContent = "找到 3 件商品。";
```

`polite` 表示辅助技术通常应在合适停顿时通知，不要打断正在朗读的内容。它不表示“恰好在 500 毫秒后播报”，也不保证不同组合使用相同语调。

#### `role="alert"`：需要及时处理的失败

`alert` 适合需要立即注意的错误，例如会话即将失效、保存失败且用户需要改用恢复入口。它具有隐式 `aria-live="assertive"` 和 `aria-atomic="true"`。

```html
<p id="urgent-error" role="alert"></p>
```

```js
urgentError.textContent = "无法生成预览，请检查标题和价格。";
```

不要把普通“已收藏”“输入了 3 个字符”或每个字段帮助文字都设为 alert。`assertive` 可能中断当前语音；过量使用会让用户错过标签、说明和真正紧急的失败。

某些浏览器与读屏组合会对新插入且已有文字的 `role="alert"` 特殊处理，但跨组合更稳妥的模式仍是：页面加载时先存在空区域，业务事件发生后再更新其内容。普通 `status` 尤其不应依赖“插入时自动朗读”。

#### 显式 `aria-live`

当元素已有合适 HTML 语义，而变化只需要补充通知策略时，可以显式设置：

```html
<section
  id="sync-log"
  aria-live="polite"
  aria-atomic="false"
  aria-relevant="additions text">
  <h2>同步记录</h2>
  <ol id="sync-items"></ol>
</section>
```

常见值：

| 值 | 意图 | 合适场景 | 边界 |
| --- | --- | --- | --- |
| `off` | 不把普通变化作为 live 通知 | 可见但无需主动通知的区域 | 不等于隐藏；焦点位于区域内时仍可能读到变化 |
| `polite` | 等当前朗读有合适停顿再通知 | 查询数量、保存完成、收藏状态 | 快速更新可能被合并 |
| `assertive` | 尽快通知并可能打断当前语音 | 阻断任务的严重错误 | 必须克制，不能用于普通进度 |

优先使用 `role="status"`、`role="alert"` 等有明确语义的角色。只有确实需要自定义变化范围时再组合 `aria-live`、`aria-atomic` 和 `aria-relevant`。

### 4.3 live region 应在变化之前存在

下面的代码同时创建 region 和消息：

```js
// 不稳妥：辅助技术可能只看到一个新节点，没有建立监听上下文。
const message = document.createElement("p");
message.setAttribute("role", "status");
message.textContent = "找到 3 件商品。";
document.body.append(message);
```

视觉上没有问题，但不同组合对“新节点中的初始内容”处理可能不同。更稳妥的 HTML 先提供稳定节点：

```html
<p id="results-status" role="status" aria-atomic="true"></p>
```

业务完成后只更新内容：

```js
resultsStatus.textContent = "找到 3 件商品。";
```

不要先写文字，再在同一个同步步骤里补 `aria-live`：

```js
// 错误案例：通知策略建立得太晚。
message.textContent = "已收藏折叠学习桌。";
message.setAttribute("aria-live", "polite");
```

region 的角色和通知属性属于稳定结构，业务代码负责改变状态文字。

### 4.4 `aria-atomic`：通知变化片段还是完整上下文

假设状态区由前缀和数字组成：

```html
<p aria-live="polite" aria-atomic="false">
  找到 <span id="result-count">0</span> 件商品
</p>
```

若只把 `0` 改成 `3`，`aria-atomic="false"` 允许辅助技术只通知变化节点。用户可能只听到“三”，缺少“找到几件商品”的上下文。

对短状态句，完整通知更稳妥：

```html
<p id="result-status" role="status" aria-atomic="true">
  尚未查询。
</p>
```

```js
resultStatus.textContent = "找到 3 件商品。";
```

`aria-atomic="true"` 表达“区域任一相关后代变化时，以整个区域为通知单位”。不要把它放在包含几十张商品卡的大容器上，否则一次价格文字变化可能让辅助技术尝试朗读整片内容。

选择原则：

- 短且必须带上下文的状态句：通常使用原子通知；
- 持续追加且每条自身完整的日志：可使用非原子通知；
- 大型结果列表：列表本身不是通知句，另设短 `status` 汇总。

### 4.5 `aria-relevant`：哪些变化值得进入通知

`aria-relevant` 可以包含：

- `additions`：新增无障碍节点；
- `removals`：删除无障碍节点；
- `text`：文本变化；
- `all`：以上全部。

默认值相当于 `additions text`。只有删除本身对任务有意义时才增加 `removals`。例如：

```html
<ol
  id="active-reservations"
  aria-live="polite"
  aria-relevant="additions removals">
</ol>
```

若用户需要知道“预约条目已被其他操作移除”，删除通知可能有价值。但普通搜索会批量隐藏、显示、重排许多节点；把结果列表设为 `aria-relevant="all"` 会制造噪声。更好的做法是让结果列表正常变化，再用独立状态句通知“找到 2 件商品”。

`aria-relevant` 是作者对相关变化的声明，不是要求辅助技术逐项播报的可靠事务日志。审计、支付或安全事件不能只依赖 live region；真实记录必须由相应数据系统保存。

### 4.6 `aria-busy`：一批更新尚未完成

当一个区域会经历多步更新，可以先标记为忙碌：

```html
<ul id="results" aria-busy="false"></ul>
```

```js
results.setAttribute("aria-busy", "true");

replaceResultCards();
updateResultMetadata();

results.setAttribute("aria-busy", "false");
resultStatus.textContent = "找到 2 件商品。";
```

`aria-busy="true"` 告诉辅助技术：当前区域仍在更新，暂时不要把中间状态当作完成结果。它不会：

- 自动显示加载指示；
- 禁用按钮或阻止点击；
-等待 Promise；
- 自动在失败时复位；
- 保证所有辅助技术采用相同延迟策略。

必须在成功、失败和取消路径中恢复：

```js
results.setAttribute("aria-busy", "true");

try {
  updateResults();
  resultStatus.textContent = "查询完成。";
} catch (error) {
  urgentError.textContent = "查询失败，请重试。";
} finally {
  results.setAttribute("aria-busy", "false");
}
```

把整个 `body` 长时间设为 busy 会压制无关区域的可用信息。应选择正在成批更新的最小稳定容器。

### 4.7 快速更新会被合并，最终状态必须独立成立

下面三次同步赋值通常只留下最后一个 DOM 值：

```js
status.textContent = "正在读取第 1 项";
status.textContent = "正在读取第 2 项";
status.textContent = "读取完成，共 3 项";
```

即使把赋值拆成多个短计时器，辅助技术也可能：

- 合并多个 polite 通知；
- 放弃已经过时的中间通知；
- 用后来的 assertive 通知中断前一个；
- 因 region 仍 busy 而只处理最终变化；
- 在用户当前语音结束前跳过部分队列。

这不是要求开发者用空字符串、零延迟计时器或反复移除节点“强迫发音”。正确设计是：

1. 不通知无助于决策的中间状态；
2. 搜索按提交或稳定防抖结果通知；
3. 进度必须精确可回查时，提供可见进度值和日志，不把语音队列当数据库；
4. 最终通知包含完成任务所需的完整上下文；
5. 在目标读屏组合中测试“是否足够”，不测试“每次都逐字相同”。

搜索输入的错误模式：

```js
// 错误案例：每个按键都制造紧急通知。
query.addEventListener("input", () => {
  alertBox.textContent = `正在搜索 ${query.value}`;
});
```

更合理的模式是在用户提交后，或输入稳定一段时间后，只公布最终结果：

```js
let searchTimer = 0;

query.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    const count = filterInMemoryListings(query.value);
    resultStatus.textContent = `找到 ${count} 件商品。`;
  }, 400);
});
```

防抖时间不是无障碍标准中的固定数字。应结合查询成本、用户预期和真实测试选择；关键是避免把每个按键变成通知。

### 4.8 查询结果：通知变化，不抢走焦点

提交查询后，用户通常希望继续修改查询或直接 Tab 到结果。无须把焦点强制移到结果标题。

```html
<search aria-labelledby="search-title">
  <h2 id="search-title">搜索商品</h2>
  <form id="search-form">
    <label for="query">关键词</label>
    <input id="query" name="q" type="search">
    <button type="submit">搜索</button>
  </form>
</search>

<p id="search-status" role="status" aria-atomic="true">
  当前显示全部商品。
</p>

<section aria-labelledby="results-title">
  <h2 id="results-title" tabindex="-1">商品结果</h2>
  <ul id="results" aria-busy="false"></ul>
</section>
```

流程应是：

```text
提交
  → results aria-busy=true
  → 在内存中过滤并一次提交 DOM 状态
  → results aria-busy=false
  → status 写“找到 N 件”
  → 焦点保持，不自动跳转
```

若查询完全改变页面上下文，或者产品提供“跳到结果”按钮，可以让用户主动移动；不要把每一次列表更新都变成强制导航。

### 4.9 收藏状态：控件自身状态与全局通知都要准确

切换按钮可以用 `aria-pressed` 表达二态：

```html
<button
  type="button"
  class="favorite"
  aria-pressed="false"
  data-listing-id="desk-1">
  收藏
</button>

<p id="favorite-status" role="status" aria-atomic="true"></p>
```

```js
const favoriteIds = new Set();

function toggleFavorite(button, title) {
  const id = button.dataset.listingId;
  const nextPressed = button.getAttribute("aria-pressed") !== "true";

  button.setAttribute("aria-pressed", String(nextPressed));

  if (nextPressed) {
    favoriteIds.add(id);
    favoriteStatus.textContent = `已收藏“${title}”。仅当前页面有效。`;
  } else {
    favoriteIds.delete(id);
    favoriteStatus.textContent = `已取消收藏“${title}”。`;
  }
}
```

三层状态必须一致：

| 层 | 收藏时 | 取消时 |
| --- | --- | --- |
| 可见文字 | 收藏（保持稳定） | 收藏（保持稳定） |
| 控件状态 | `aria-pressed="true"` | `aria-pressed="false"` |
| 内存模型 | `Set` 中存在 ID | `Set` 中删除 ID |

切换按钮在两个状态下保持同一个动作名称“收藏”，让 `aria-pressed` 表达是否已收藏；全局状态区再说明本次变化。不能只改按钮颜色，也不能只发送“成功”通知却忘记更新控件状态。刷新后 `Set` 消失符合本课范围；真实收藏必须调用项目契约中的幂等 PUT/DELETE，并由服务端按用户身份保存。

### 4.10 表单错误：字段、汇总和恢复路径各有职责

失败表单至少需要三层信息：

1. 控件旁的具体错误，说明怎样修复；
2. 页面级汇总，让用户知道有多少处并可跳转；
3. 焦点策略，把用户带到一个明确恢复点。

字段结构：

```html
<label for="listing-title">商品标题</label>
<input
  id="listing-title"
  name="title"
  required
  minlength="3"
  aria-describedby="title-help title-error">
<p id="title-help">请输入 3–60 个字符。</p>
<p id="title-error"></p>
```

失败后：

```html
<input
  id="listing-title"
  aria-invalid="true"
  aria-describedby="title-help title-error">
<p id="title-error">标题至少需要 3 个字符。</p>
```

错误汇总应使用普通链接或按钮，让用户可以回到字段：

```html
<section id="error-summary" role="alert">
  <h2>请修正 2 处问题</h2>
  <ul>
    <li><a href="#listing-title">商品标题：至少需要 3 个字符</a></li>
    <li><a href="#price-yuan">价格：请输入最多两位小数的金额</a></li>
  </ul>
</section>
```

错误文字必须可见；`aria-invalid="true"` 只表达状态，不能自己告诉用户修复方法。错误修正后，要清空过期文字并移除 `aria-invalid`，不能让已合法字段继续被报告为无效。

### 4.11 错误汇总焦点与首个无效字段：选择一条主路径

常见的两种策略都可以成立：

| 策略 | 失败后的焦点 | 适合 | 风险 |
| --- | --- | --- | --- |
| 汇总优先 | 聚焦 `tabindex="-1"` 的汇总标题/容器 | 长表单、需要先了解全貌 | 用户还需激活链接到字段 |
| 字段优先 | 更新汇总后聚焦首个无效控件 | 短表单、快速修复 | 需确保汇总仍可发现和通知 |

本课综合案例使用“字段优先”：先完整更新可见汇总和字段错误，再只调用一次 `firstInvalid.focus()`。汇总使用 alert 通知失败概况，首个字段通过标签和 `aria-describedby` 提供具体修复信息。

```js
const invalidControls = collectInvalidControls();
renderErrorSummary(invalidControls);

if (invalidControls.length > 0) {
  invalidControls[0].focus();
  return;
}
```

下面的写法会产生两次连续焦点移动：

```js
// 错误案例：用户还没定位汇总，焦点立刻又跳走。
errorSummary.focus();
firstInvalid.focus();
```

不要用计时器把两次跳转隔开。应按任务选择一个主焦点。若目标读屏组合把 alert 与字段焦点重复得难以理解，可以改为“汇总优先”，去掉紧急 live 通知并测试链接恢复；不能只靠猜测叠加更多 ARIA。

### 4.12 dialog 焦点恢复：先记录调用入口，再验证它仍有效

打开 dialog 前记录触发入口：

```js
let dialogInvoker = null;

openButton.addEventListener("click", () => {
  dialogInvoker = openButton;
  dialog.showModal();
});
```

原生模态 dialog 会管理顶层与焦点范围，关闭时通常尝试恢复先前焦点。但动态页面可能在 dialog 打开期间：

- 删除触发按钮；
- 隐藏整张商品卡；
- 重新渲染列表，产生一个“看起来相同”但不是同一节点的新按钮；
- 禁用入口；
- 把祖先标为 `inert`。

因此，关闭时要验证目标：

```js
function canReceiveFocus(element) {
  return element instanceof HTMLElement
    && element.isConnected
    && !element.hidden
    && !element.closest("[hidden], [inert]")
    && !(element instanceof HTMLButtonElement && element.disabled);
}

dialog.addEventListener("close", () => {
  const target = canReceiveFocus(dialogInvoker)
    ? dialogInvoker
    : document.querySelector("#results-title");

  target?.focus();
});
```

不应保存 CSS 选择器后无条件找到“第一个删除按钮”，那可能把用户送到不相关商品。动态列表需要按操作前的位置计算局部回退。

### 4.13 动态列表删除：下一项、上一项、稳定标题

假设用户从第 2 张商品卡打开确认 dialog 并删除该卡。合理恢复顺序通常是：

1. 原位置之后仍可见商品中的同类操作；
2. 原位置之前仍可见商品中的同类操作；
3. 列表标题、添加按钮或其他稳定入口；
4. 页面主标题作为最后回退。

```js
function chooseRemovalFallback(items, removedIndex) {
  const nextItem = items[removedIndex + 1];
  const previousItem = items[removedIndex - 1];

  return nextItem?.querySelector("button")
    ?? previousItem?.querySelector("button")
    ?? document.querySelector("#results-title")
    ?? document.querySelector("h1");
}
```

顺序要在节点删除前根据当前可见集合计算。删除后再用旧索引查询，列表长度和位置已经改变，容易选错。

被动新增商品通常只需通知，不应强制聚焦新节点。只有用户明确执行“新增并编辑”之类动作，焦点移动才与下一任务一致。

重新渲染整个列表还会断开所有旧按钮，即使商品 ID 没变。若确需重建，应使用稳定业务 ID 在新 DOM 中找同一逻辑入口，并保留“找不到时回到局部标题”的路径。能就地更新时，不要为方便而无条件 `replaceChildren()` 整个可交互列表。

### 4.14 图片替代取决于当前任务

替代文本描述的不是文件，而是图片在当前上下文中承担的意义：

| 图片类型 | 最小策略 | 示例 |
| --- | --- | --- |
| 信息图片 | `alt` 传达完成任务所需的信息 | `alt="木桌右前角有约 3 厘米划痕"` |
| 纯装饰图片 | `alt=""` | 与旁边标题重复的花纹 |
| 只有图片的链接/按钮 | `alt` 表达目标或动作 | `alt="查看折叠学习桌详情"` |
| 链接已有同等可见文字 | 图片通常 `alt=""` | 图标旁已有“查看详情” |
| 复杂图或图表 | 短 `alt`/名称 + 邻近详细说明或数据表 | 趋势摘要和完整数值表 |

错误写法：

```html
<!-- 缺少 alt：浏览器可能暴露文件名，语义不确定。 -->
<img src="desk-scratch.jpg">

<!-- 冗余且没有传达任务信息。 -->
<img src="desk-scratch.jpg" alt="一张商品图片的照片">

<!-- 错把有信息的瑕疵照片标为装饰。 -->
<img src="desk-scratch.jpg" alt="">
```

正确写法：

```html
<figure>
  <img
    src="desk-scratch.jpg"
    alt="折叠学习桌右前角有约 3 厘米浅划痕"
    width="640"
    height="480">
  <figcaption>划痕不影响折叠结构，建议现场确认。</figcaption>
</figure>
```

`figcaption` 是可见图注，不会自动替代 `alt` 判断。若图注已完整表达同一信息，可根据上下文缩短 `alt`，避免机械重复；必须在目标辅助技术中检查实际名称和阅读顺序。

### 4.15 字幕、翻译、文字稿和音频描述解决不同缺口

| 内容 | 主要服务对象/场景 | 必须包含 | 不能替代 |
| --- | --- | --- | --- |
| captions | 听不见或不便播放声音的用户 | 对白、说话者、理解所需的非语言声音 | 关键视觉动作的描述 |
| subtitles | 听得见但不理解原语言的用户 | 对白翻译 | 同语言声音信息的完整 captions |
| 文字稿 transcript | 需要顺序阅读、搜索、复制或无法播放媒体 | 对白、关键声音；按需求加入视觉说明 | 视频中与时间同步的 captions |
| audio description | 看不见关键画面的用户 | 在对白间隙描述重要视觉信息 | 原始对白和声音 |

示例结构：

```html
<video controls preload="metadata" aria-describedby="video-alternatives">
  <source src="lamp-check.mp4" type="video/mp4">
  <track
    kind="captions"
    srclang="zh"
    label="中文"
    src="lamp-check.zh.vtt"
    default>
  <track
    kind="descriptions"
    srclang="zh"
    label="中文视觉描述"
    src="lamp-check.descriptions.zh.vtt">
</video>

<div id="video-alternatives">
  <p>
    <a href="lamp-check-described.mp4">播放带音频描述版本</a>
  </p>
  <details>
    <summary>阅读验货文字稿与视觉说明</summary>
    <p>[开关按下声] 台灯亮起。灯罩左侧有一道细裂纹，电线外皮完整。</p>
  </details>
</div>
```

`kind="descriptions"` 的原生呈现支持和用户界面存在组合差异，不能把关键视觉信息只押在这条轨道上。生产页面应在目标播放器、浏览器和辅助技术中验证，并提供可发现的带描述版本或页面文字说明。

`poster` 没有 `alt`，也不是视频内容替代。资源请求成功、字幕存在、字幕准确同步、关键视觉有描述是四项不同证据。

### 4.16 Canvas 图表：像素视图是增强，HTML 数据是基线

Canvas 绘图不会创建“柱形”“坐标轴”“价格单元格”这些 DOM 节点。一句 `aria-label="价格图"` 只能命名图，不能交付完整数据。

稳妥结构：

```html
<figure aria-labelledby="chart-title" aria-describedby="chart-summary">
  <h2 id="chart-title">在售商品价格比较</h2>
  <p id="chart-summary">
    折叠学习桌价格最高，为 89 元；帆布包最低，为 25 元。
  </p>

  <canvas
    id="price-chart"
    width="640"
    height="260"
    role="img"
    aria-labelledby="chart-title"
    aria-describedby="chart-summary">
    当前浏览器不能绘制价格图，请阅读后面的价格表。
  </canvas>

  <div role="region" aria-labelledby="price-table-title" tabindex="0">
    <h3 id="price-table-title">价格数据表</h3>
    <table>
      <thead>
        <tr>
          <th scope="col">商品</th>
          <th scope="col">价格</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">折叠学习桌</th>
          <td><data value="8900">89.00 元</data></td>
        </tr>
      </tbody>
    </table>
  </div>
</figure>
```

原则：

- 摘要告诉用户主要结论；
- 表格交付精确数据和表头关系；
- Canvas 提供视觉增强；
- 绘图和表格读取同一份整数分数据，避免事实漂移；
- 不因 Canvas 正常绘制而给表格加 `aria-hidden`；
- 二维表格在窄屏可以拥有局部横向滚动，不应让整页横向滚动。

若图表包含可操作筛选或数据点详情，普通 HTML 还要提供等价控件和结果，不能让非视觉用户只能读静态摘要。

### 4.17 文字缩放与回流是两项检查

#### 200% 文字缩放

浏览器只放大文字时，页面应避免：

- 固定高度裁掉两行标签；
- 用像素宽度锁死按钮文字；
- 标签与输入互相覆盖；
- 文字溢出后被 `overflow: hidden` 截断；
- 依赖文字保持单行才能操作。

使用内容驱动高度、可换行布局和相对单位通常更稳健。

#### 回流与约 320 CSS px 内容宽度

WCAG 2.2 的 Reflow 成功准则以 320 CSS px 宽、256 CSS px 高的等效视口讨论不丢失信息或功能，并允许确实需要二维布局的内容例外，例如数据表、地图和复杂图形。

工程测试常在 1280 CSS px 宽桌面视口放大到 400%，得到约 320 CSS px 的可用内容宽度。检查：

- 阅读和操作是否主要只需一个方向滚动；
- 搜索、错误和按钮是否仍完整；
- 商品卡是否变为单列；
- 只有表格包装器局部横向滚动，而不是整个页面；
- 固定/粘性内容是否遮住焦点。

不要写：

```html
<!-- 错误案例：限制用户缩放。 -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
```

基础写法：

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

### 4.18 触控目标：合规下限与舒适目标不要混写

WCAG 2.2 AA 的 Target Size (Minimum) 基准是至少 24 × 24 CSS px，或者相邻不足尺寸目标之间满足规定间距；准则还包含行内文本链接、用户代理控制、等价入口、必要呈现等例外。

许多设计系统使用 44 × 44 或 48 × 48 CSS px 作为更舒适的工程目标。WCAG 2.2 的 44 × 44 属于 Target Size (Enhanced) AAA，不应错误宣称“所有 AA 控件必须 44 × 44”。

本课示例采用：

```css
button,
input,
summary {
  min-block-size: 2.75rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
```

注意：

- CSS 盒达到尺寸，不代表视觉上重叠的目标容易点中；
- `transform: scale()` 放大视觉，不一定改变布局间距；
- 透明覆盖层可能截获其他目标；
- 句子中的普通行内链接不应被强行做成 44px 高而破坏阅读；
- 必须在真实触控设备或设备模拟之外的实际设备上抽查。

### 4.19 颜色不能是唯一状态渠道

错误状态若只有红边，色觉差异用户、黑白/高对比环境和未看到字段的人都可能遗漏。

```css
[aria-invalid="true"] {
  border-color: #9f1d20;
}
```

这只能作为一个视觉层。完整状态还需要：

```html
<label for="price-yuan">价格（元）</label>
<input
  id="price-yuan"
  aria-invalid="true"
  aria-describedby="price-error">
<p id="price-error">
  <strong>错误：</strong>请输入最多两位小数的金额。
</p>
```

商品状态也应有可见文字：

```html
<p><strong>状态：</strong><span>已预约</span></p>
```

可以同时使用颜色、边框样式和图标，但图标本身仍需可理解的文字或可访问名称。不要只提供“绿色可买、红色不可买”的说明。

### 4.20 减少动效：移除非必要运动，不删除结果

用户偏好减少运动时，应减少可能引发不适或分散注意力的位移、缩放、视差和连续动画：

```css
.listing {
  transition: transform 180ms ease;
}

.listing:hover {
  transform: translateY(-0.2rem);
}

@media (prefers-reduced-motion: reduce) {
  .listing {
    transition: none;
  }

  .listing:hover {
    transform: none;
  }
}
```

不要把“减少动效”实现为：

- 隐藏加载完成状态；
- 取消必要进度信息；
- 删除对话框打开后的最终可见内容；
- 让依赖 `animationend` 才提交的业务流程永远不执行；
- 全局把所有动画时长改成极小值，却不检查逻辑副作用。

正确边界是：业务状态立即或以低运动方式到达同一最终结果。若动画本身用于教学物理运动或解释步骤，应提供暂停、关闭或静态替代。

### 4.21 渐进增强：核心事实先存在，脚本增加便利

本课综合案例的 HTML 初始包含：

- 商品标题、价格、状态和图片替代；
- 可见商品列表；
- 媒体文字稿与视觉说明；
- 图表摘要和价格表；
- 带原生标签和约束的表单。

JavaScript 再增强：

- 内存筛选；
- 收藏切换与状态通知；
- 自定义错误汇总；
- dialog 删除确认与焦点恢复；
- Canvas 绘图。

增强按钮初始带 `hidden`，脚本成功启动后再显示。这样脚本失败时不会留下看似可用却无响应的收藏和删除按钮。查询在本地练习页没有服务器后备，因此 `<noscript>` 明确说明“当前显示全部商品”；生产页面可让同一个 GET 表单由服务器处理，再由 JavaScript增强为局部更新。

渐进增强不表示“没有 JavaScript 时所有高级交互必须原样存在”，而是核心内容和替代路径不能随增强失败一起消失。

### 4.22 自动检查与人工读屏的精确边界

自动工具适合发现：

- 重复 ID；
- 缺少 `alt`；
- 某些名称、角色、状态关联错误；
- 明显对比度与结构问题；
- HTML 语法错误。

自动工具不能证明：

- 查询通知在目标读屏中是否出现、是否重复或被打断；
- alert 的紧急程度是否符合业务；
- 快速更新被合并后是否仍足够理解；
- 首个无效字段的标签、错误和焦点顺序是否自然；
- dialog 背景是否在具体组合中正确隔离；
- 删除后恢复点是否符合用户任务；
- captions 是否准确同步；
- audio description 是否覆盖关键视觉；
- 200%/400% 下主路径是否真正可操作；
- 触控目标在真实手指操作中是否舒适。

人工记录必须写成具体组合，例如：

```text
已测：
- macOS 15.x + Safari 18.x + VoiceOver，系统中文语音
- Windows 11 + Firefox 14x + NVDA 2026.x，默认详细程度

未测：
- Windows + JAWS
- Android + Chrome + TalkBack
- iOS + Safari + VoiceOver
- Firefox + macOS VoiceOver
```

版本号必须填写实际值，不能照抄示例。每个组合至少记录：

1. 页面加载后 region 是否安静；
2. 一次查询完成后是否通知最终数量；
3. 快速连续收藏时，最终按钮状态和可见状态是否一致；
4. 提交失败后实际焦点元素、听到的标签与错误；
5. dialog 打开时初始焦点、背景访问、Esc/按钮关闭；
6. 删除触发入口后焦点落点；
7. 图像、媒体、Canvas 和表格在阅读顺序中的信息是否重复或缺失。

“可能通知合并”不是免测理由。验收目标是最终状态和恢复路径可靠，而不是强求每个组合逐字一致。

## 5. 元素、属性、API 或配置清单

### 5.1 动态状态与焦点

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `role="status"` | 礼貌通知短状态 | `<p role="status"></p>` | 隐式 polite、atomic；不适合紧急错误 |
| `role="alert"` | 尽快通知重要失败 | `<p role="alert"></p>` | 可能中断当前语音，应克制 |
| `aria-live` | 指定变化通知优先级 | `aria-live="polite"` | 不保证精确播报时刻 |
| `aria-atomic` | 选择整体或变化部分 | `aria-atomic="true"` | 不要放在巨大容器上 |
| `aria-relevant` | 声明相关变化类型 | `aria-relevant="additions text"` | 默认已含 additions/text；removals 按需 |
| `aria-busy` | 表示一批更新未完成 | `aria-busy="true"` | 必须在所有完成路径恢复 false |
| `aria-invalid` | 表示字段当前无效 | `aria-invalid="true"` | 不提供错误原因，修复后要移除 |
| `aria-describedby` | 关联帮助和错误 | `aria-describedby="help error"` | ID 必须存在且避免过期文字 |
| `aria-pressed` | 表达切换按钮状态 | `aria-pressed="false"` | 可见文字和业务状态必须同步 |
| `tabindex="-1"` | 允许脚本聚焦但不加入 Tab 顺序 | `<h2 tabindex="-1">` | 不要用正数重排页面 |
| `HTMLElement.focus()` | 移动焦点 | `control.focus()` | 先检查节点仍连接、可见、可用 |
| `document.activeElement` | 观察当前焦点 | `document.activeElement` | Shadow DOM 内部需结合根节点观察 |
| `Element.isConnected` | 检查节点是否仍连接文档 | `button.isConnected` | 连接不等于可见或可聚焦 |
| `dialog.showModal()` | 打开模态 dialog | `dialog.showModal()` | 仍需初始焦点与关闭入口 |
| `close` 事件 | dialog 关闭后恢复流程 | `dialog.addEventListener("close", fn)` | 触发入口可能已失效 |

### 5.2 媒体、布局与偏好

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `img[alt]` | 提供当前语境的图片替代 | `<img alt="右前角有划痕">` | 装饰图用空 alt，不是省略属性 |
| `track[kind="captions"]` | 同步对白和关键声音 | `<track kind="captions">` | 文件成功不等于内容准确 |
| `track[kind="descriptions"]` | 关联视觉描述轨道 | `<track kind="descriptions">` | 原生呈现支持需实测，保留其他路径 |
| 页面文字稿 | 提供可搜索、顺序阅读内容 | `<details><p>…</p></details>` | 不能替代视频同步 captions |
| `canvas` 后备内容 | Canvas 不可用时说明替代 | `<canvas>请读表格</canvas>` | 仍应保留可见摘要和表格 |
| `table` | 提供图表精确二维数据 | `<table>…</table>` | 窄屏可局部横向滚动 |
| viewport meta | 设置移动布局视口 | `width=device-width, initial-scale=1` | 不限制用户缩放 |
| `min-block-size` | 提供目标最小高度 | `min-block-size: 2.75rem` | 还要检查间距、覆盖和真实触控 |
| `prefers-reduced-motion` | 响应减少动效偏好 | `@media (prefers-reduced-motion: reduce)` | 保留最终状态与必要反馈 |

### 5.3 场景选择速查

| 变化 | 可见内容 | 通知 | 焦点 |
| --- | --- | --- | --- |
| 查询完成 | 结果列表与数量 | polite status | 保持原位 |
| 收藏切换 | 按钮文字与 pressed 状态 | polite status | 保持按钮 |
| 阻断式提交失败 | 字段错误与汇总 | alert 或汇总焦点，二选一主策略 | 首个无效字段或汇总 |
| 打开 modal dialog | dialog 标题、说明、按钮 | 通常不另加 live 通知 | 进入 dialog |
| 关闭未改变页面的 dialog | 原页面仍存在 | 可选短状态 | 回到调用入口 |
| 删除当前列表项 | 项目消失、数量更新 | polite status | 下一项/上一项/局部标题 |
| 被动新增一项 | 新内容可浏览 | 必要时 polite status | 通常不移动 |
| 紧急会话失败 | 可见错误与恢复入口 | alert | 仅在恢复任务需要时移动 |

## 6. 最小可运行案例

本案例专门观察 `status`、`alert`、`aria-busy` 和快速更新。它不模拟服务器，不追求“强迫每条消息朗读”。

### 6.1 文件位置

在个人练习目录创建：

```text
market-learning/
└── practice/
    └── html-chapter-07/
        └── live-region-lab.html
```

### 6.2 完整文件

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>动态状态最小实验</title>
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        max-inline-size: 48rem;
        margin: 0 auto;
        padding: 1rem;
        font: 100%/1.6 system-ui, sans-serif;
      }

      button {
        min-block-size: 2.75rem;
        padding-inline: 1rem;
      }

      button:focus-visible {
        outline: 0.2rem solid #174ea6;
        outline-offset: 0.2rem;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }

      .panel {
        margin-block: 1rem;
        padding: 1rem;
        border: 0.125rem solid #56636f;
        border-radius: 0.5rem;
      }

      [aria-busy="true"] {
        border-style: dashed;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>动态状态最小实验</h1>
      <p>
        状态区在页面加载时已经存在。按钮只修改当前页面内存和 DOM。
      </p>

      <div class="actions">
        <button id="search" type="button">模拟查询</button>
        <button id="rapid" type="button">快速更新三次</button>
        <button id="fail" type="button">模拟阻断错误</button>
        <button id="reset" type="button">恢复初始状态</button>
      </div>

      <p id="status" role="status" aria-atomic="true">
        尚未运行查询。
      </p>

      <p id="alert" role="alert"></p>

      <section
        id="results"
        class="panel"
        aria-labelledby="results-title"
        aria-busy="false">
        <h2 id="results-title">结果</h2>
        <ul id="result-list">
          <li>当前没有结果。</li>
        </ul>
      </section>

      <h2>观察记录</h2>
      <ol>
        <li>普通查询是否在不移动焦点的情况下通知最终数量？</li>
        <li>快速更新是否只读到部分消息或最终消息？记录实际结果，不把它判成脚本失败。</li>
        <li>阻断错误是否可能中断当前朗读？它是否比普通状态更醒目？</li>
        <li>查询开始和结束时，Elements 中的 <code>aria-busy</code> 分别是什么？</li>
      </ol>
    </main>

    <script>
      const searchButton = document.querySelector("#search");
      const rapidButton = document.querySelector("#rapid");
      const failButton = document.querySelector("#fail");
      const resetButton = document.querySelector("#reset");
      const status = document.querySelector("#status");
      const alertBox = document.querySelector("#alert");
      const results = document.querySelector("#results");
      const resultList = document.querySelector("#result-list");

      let searchTimer = 0;

      searchButton.addEventListener("click", () => {
        window.clearTimeout(searchTimer);
        alertBox.textContent = "";
        results.setAttribute("aria-busy", "true");
        status.textContent = "正在查询，请稍候。";

        searchTimer = window.setTimeout(() => {
          resultList.replaceChildren();

          for (const title of ["折叠学习桌", "帆布包", "阅读台灯"]) {
            const item = document.createElement("li");
            item.textContent = title;
            resultList.append(item);
          }

          results.setAttribute("aria-busy", "false");
          status.textContent = "查询完成，找到 3 件商品。";
        }, 600);
      });

      rapidButton.addEventListener("click", () => {
        alertBox.textContent = "";
        status.textContent = "第 1 次更新。";
        status.textContent = "第 2 次更新。";
        status.textContent = "第 3 次更新，最终状态。";
      });

      failButton.addEventListener("click", () => {
        window.clearTimeout(searchTimer);
        results.setAttribute("aria-busy", "false");
        status.textContent = "查询未完成。";
        alertBox.textContent = "查询被阻断，请检查条件后重试。";
      });

      resetButton.addEventListener("click", () => {
        window.clearTimeout(searchTimer);
        results.setAttribute("aria-busy", "false");
        resultList.replaceChildren();

        const item = document.createElement("li");
        item.textContent = "当前没有结果。";
        resultList.append(item);

        status.textContent = "已恢复初始状态。";
        alertBox.textContent = "";
      });
    </script>
  </body>
</html>
```

### 6.3 打开与运行

1. 用现代浏览器直接打开 `live-region-lab.html`；
2. 打开 DevTools 的 Elements 与 Accessibility 面板；
3. 不开读屏，先用键盘依次激活四个按钮；
4. 检查焦点是否始终留在刚激活的按钮；
5. 检查查询期间 `#results` 为 `aria-busy="true"`，约 600ms 后恢复 `false`；
6. 再选择一个实际可用的浏览器 + 读屏组合，刷新后重复；
7. 快速更新三次时，原样记录听到几次和哪些文字。

若使用静态服务器，在 `market-learning/practice/html-chapter-07/` 运行你已经安装的服务器命令，再访问它显示的本地 URL。本课不要求为此安装新包。

### 6.4 预期结果

- 初始加载不应主动朗读一串历史状态；
- “模拟查询”先显示正在查询，最终列表出现 3 项；
- 最终状态为“查询完成，找到 3 件商品”；
- 焦点不跳到结果标题或状态区；
- “快速更新三次”视觉上只留下最终状态；
- 读屏可能只通知最终状态，也可能因组合和队列不同得到其他结果；
- “模拟阻断错误”更新可见 alert，并可能打断较低优先级语音；
- “恢复初始状态”清空 alert，恢复列表和 busy 状态；
- 刷新后所有状态回到初始值。

### 6.5 失败时先看哪里

| 现象 | 先看证据 | 常见原因 | 修复方向 |
| --- | --- | --- | --- |
| 按钮完全无反应 | Console、script 是否加载 | ID 拼写或语法错误 | 修正选择器/语法 |
| 查询一直虚线边框 | Elements 的 `aria-busy` | 计时器回调报错或没有复位 | Console 定位并在结束路径复位 |
| 状态视觉更新但没有通知 | Accessibility 树、实际测试组合 | region 创建太晚、隐藏、组合差异 | 保留预先存在节点，核对范围 |
| alert 每次都重复多遍 | 事件监听器数量、测试步骤 | 重复绑定或同时用了多个通知通道 | 只保留一个业务通知入口 |
| 快速更新只读一次 | DOM 最终值与读屏队列 | 同步变化被覆盖/合并 | 接受最终状态策略，不强迫中间通知 |
| 焦点跳走 | Console 查看 `document.activeElement` | 额外调用了 `focus()` | 普通状态更新不要移动焦点 |

### 6.6 停止与恢复

- 页面没有持续任务，计时器最多运行约 600ms；
- 点击“恢复初始状态”可取消尚未完成的查询并恢复 DOM；
- 关闭标签页即可结束；
- 刷新会清除全部内存状态；
- 不会写入本地存储，也不会发出网络业务请求。

## 7. 邻里集市集成案例

### 7.1 案例范围与公开契约

综合页把本课要求放进同一条用户路径：

```text
浏览初始商品
  → 提交内存查询并获知结果数
  → 切换收藏并获知按钮状态
  → 打开删除确认 dialog
  → 删除当前卡片并恢复到相邻操作
  → 提交错误发布表单
  → 查看错误汇总并聚焦首个无效字段
  → 修正后生成当前页预览
  → 阅读媒体文字稿和图表数据表
```

范围边界：

| 能力 | 本案例实现 | 本案例不宣称 |
| --- | --- | --- |
| 查询 | 当前 DOM 中按标题筛选 | 服务器搜索、分页、排序稳定性 |
| 收藏 | 当前页面 `Set` | 登录用户收藏、刷新恢复、跨设备同步 |
| 删除 | 从当前 DOM 移除教学卡片 | 删除数据库商品、权限、审计、撤销 |
| 发布 | 本地验证并生成预览 | POST `/listings`、上传、持久化 |
| 媒体 | 结构、字幕/描述入口和页面文字稿 | 仓库已附带真实视频素材 |
| 图表 | Canvas 视觉增强 + HTML 表格 | 实时统计、分析服务 |
| 金额 | 整数分模型和元单位显示 | 任意币种舍入规则 |

刷新页面会恢复全部初始状态。真实系统中的收藏应使用项目契约的 `PUT /favorites/:listingId` 与 `DELETE /favorites/:listingId`；商品删除、发布、媒体上传和授权不属于 HTML 内存案例。

### 7.2 文件位置

在个人练习目录创建：

```text
market-learning/
└── practice/
    └── html-chapter-07/
        ├── index.html
        └── media/
            ├── lamp-check.mp4
            ├── lamp-check-described.mp4
            ├── lamp-check.zh.vtt
            └── lamp-check.descriptions.zh.vtt
```

`index.html` 是本课完整主流程。`media/` 中四个名字是一份真实资源契约，不是教程仓库已经提供的文件：

- 没有素材时，播放器可能报告资源失败，但页面文字稿、视觉说明和其他案例仍应工作；
- 要验收字幕同步和音频描述，学习者必须放入自己有权使用的短视频与合法 WebVTT；
- 不能把“文字稿可读”误写成“字幕轨道已验证”；
- 不能把空文件或伪造扩展名当作媒体成功证据。

### 7.3 完整 `index.html`

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>邻里集市动态质量页</title>
    <style>
      :root {
        color-scheme: light;
        font-family: system-ui, sans-serif;
        line-height: 1.6;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: #1d252c;
        background: #f5f7f5;
      }

      main {
        inline-size: min(100% - 2rem, 70rem);
        margin-inline: auto;
        padding-block: 1rem 4rem;
      }

      section,
      search {
        display: block;
        margin-block: 1.5rem;
      }

      .panel {
        padding: 1rem;
        border: 0.125rem solid #66736b;
        border-radius: 0.75rem;
        background: #fff;
      }

      label,
      input,
      button {
        font: inherit;
      }

      input {
        inline-size: min(100%, 32rem);
        min-block-size: 2.75rem;
        padding: 0.5rem 0.75rem;
        border: 0.125rem solid #58636d;
        border-radius: 0.35rem;
      }

      button {
        min-inline-size: 2.75rem;
        min-block-size: 2.75rem;
        padding: 0.5rem 0.9rem;
        border: 0.125rem solid #174f38;
        border-radius: 0.35rem;
        color: #fff;
        background: #176b4c;
        cursor: pointer;
      }

      button[aria-pressed="true"] {
        color: #173b2d;
        background: #d7f2e4;
      }

      button.secondary {
        color: #26332d;
        background: #fff;
      }

      button.danger {
        border-color: #862126;
        background: #a52d32;
      }

      :is(a, button, input, summary, [tabindex="-1"]):focus-visible {
        outline: 0.2rem solid #174ea6;
        outline-offset: 0.2rem;
      }

      .search-row,
      .actions {
        display: flex;
        flex-wrap: wrap;
        align-items: end;
        gap: 0.75rem;
      }

      .field {
        display: grid;
        gap: 0.35rem;
        margin-block: 1rem;
      }

      .help,
      .boundary {
        color: #46515a;
      }

      .error {
        min-block-size: 1.6em;
        margin: 0;
        color: #8a171b;
        font-weight: 650;
      }

      [aria-invalid="true"] {
        border-color: #a31319;
        border-style: double;
      }

      #error-summary {
        border-color: #a31319;
      }

      #error-summary h2 {
        margin-block-start: 0;
      }

      #result-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
        gap: 1rem;
        padding: 0;
        list-style: none;
      }

      .listing {
        padding: 1rem;
        border: 0.125rem solid #728078;
        border-inline-start: 0.45rem solid #176b4c;
        border-radius: 0.6rem;
        background: #fff;
        transition: transform 180ms ease;
      }

      .listing:hover {
        transform: translateY(-0.2rem);
      }

      .listing[data-status="reserved"] {
        border-inline-start-color: #8b5a00;
        border-inline-start-style: double;
      }

      .listing img,
      video,
      canvas {
        display: block;
        max-inline-size: 100%;
      }

      .listing img {
        inline-size: 100%;
        block-size: auto;
        border-radius: 0.35rem;
        background: #e5ece7;
      }

      #result-list[aria-busy="true"] {
        opacity: 0.72;
      }

      .media-layout {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
        gap: 1rem;
      }

      video {
        inline-size: 100%;
        background: #1f2723;
      }

      .chart-shell {
        overflow-x: auto;
      }

      canvas {
        inline-size: 100%;
        block-size: auto;
        border: 0.125rem solid #66736b;
        background: #fff;
      }

      .table-region {
        max-inline-size: 100%;
        overflow-x: auto;
      }

      table {
        inline-size: 100%;
        min-inline-size: 30rem;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 0.65rem;
        border: 0.0625rem solid #66736b;
        text-align: start;
      }

      th {
        background: #edf2ee;
      }

      dialog {
        max-inline-size: min(32rem, calc(100% - 2rem));
        padding: 1.25rem;
        border: 0.125rem solid #34443c;
        border-radius: 0.75rem;
      }

      dialog::backdrop {
        background: rgb(16 25 20 / 0.68);
      }

      #preview {
        border-inline-start: 0.4rem solid #176b4c;
      }

      @media (prefers-reduced-motion: reduce) {
        .listing {
          transition: none;
        }

        .listing:hover {
          transform: none;
        }
      }

      @media (forced-colors: active) {
        .listing {
          border-inline-start-width: 0.45rem;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>邻里集市动态质量页</h1>
      <p class="boundary">
        搜索、收藏、删除和预览只保存在当前页面内存。刷新后恢复初始状态。
      </p>

      <noscript>
        <p class="panel">
          JavaScript 未运行：当前仍可阅读全部商品、媒体文字稿和价格表；
          本地筛选、收藏、删除确认、错误汇总和 Canvas 增强不可用。
        </p>
      </noscript>

      <search aria-labelledby="search-title" class="panel">
        <h2 id="search-title">搜索商品</h2>
        <form id="search-form">
          <div class="search-row">
            <div class="field">
              <label for="query">标题关键词</label>
              <input
                id="query"
                name="q"
                type="search"
                autocomplete="off">
            </div>
            <button type="submit">搜索</button>
            <button id="reset-search" class="secondary" type="reset">
              显示剩余全部
            </button>
          </div>
        </form>
      </search>

      <p id="search-status" role="status" aria-atomic="true">
        当前显示 3 件商品。
      </p>
      <p id="favorite-status" role="status" aria-atomic="true"></p>

      <section aria-labelledby="results-title">
        <h2 id="results-title" tabindex="-1">商品结果</h2>
        <p id="no-results" hidden>
          没有匹配商品。请缩短关键词或显示剩余全部。
        </p>

        <ul id="result-list" aria-busy="false">
          <li
            class="listing"
            data-listing-id="desk-1"
            data-search-text="折叠学习桌 木桌">
            <img
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMzYwIj48cmVjdCB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgZmlsbD0iI2U3ZWVlOSIvPjxyZWN0IHg9IjEyNSIgeT0iMTAwIiB3aWR0aD0iMzkwIiBoZWlnaHQ9IjQ1IiByeD0iOCIgZmlsbD0iIzc4NWE0MiIvPjxwYXRoIGQ9Ik0xNzAgMTQ1djE1ME00NzAgMTQ1djE1MCIgc3Ryb2tlPSIjNGQzYTJkIiBzdHJva2Utd2lkdGg9IjI0Ii8+PHBhdGggZD0iTTQ4MiAxMDRsMjggOCIgc3Ryb2tlPSIjYjUxZjI1IiBzdHJva2Utd2lkdGg9IjciLz48L3N2Zz4="
              alt="折叠学习桌右前角有一道浅划痕"
              width="640"
              height="360">
            <h3>折叠学习桌</h3>
            <p>右前角有浅划痕，折叠结构正常。</p>
            <p><strong>价格：</strong><data value="8900">89.00 元</data></p>
            <p><strong>状态：</strong><span>在售</span></p>
            <div class="actions">
              <button
                class="favorite"
                type="button"
                data-listing-id="desk-1"
                aria-pressed="false"
                hidden>
                收藏
              </button>
              <button
                class="remove secondary"
                type="button"
                data-listing-id="desk-1"
                hidden>
                从当前结果移除
              </button>
            </div>
          </li>

          <li
            class="listing"
            data-listing-id="bag-1"
            data-search-text="帆布包 手提包">
            <img
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMzYwIj48cmVjdCB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgZmlsbD0iI2VlZTlkZiIvPjxwYXRoIGQ9Ik0yMDUgMTMwaDIzMGwyOCAxNzBIMTc3eiIgZmlsbD0iI2EyN2M0ZiIvPjxwYXRoIGQ9Ik0yNjAgMTQwYzAtNzUgMTIwLTc1IDEyMCAwIiBmaWxsPSJub25lIiBzdHJva2U9IiM2ZDUyMzUiIHN0cm9rZS13aWR0aD0iMjIiLz48L3N2Zz4="
              alt="米色帆布手提包，双提手完整"
              width="640"
              height="360">
            <h3>帆布包</h3>
            <p>包体已清洁，内袋拉链可以正常闭合。</p>
            <p><strong>价格：</strong><data value="2500">25.00 元</data></p>
            <p><strong>状态：</strong><span>在售</span></p>
            <div class="actions">
              <button
                class="favorite"
                type="button"
                data-listing-id="bag-1"
                aria-pressed="false"
                hidden>
                收藏
              </button>
              <button
                class="remove secondary"
                type="button"
                data-listing-id="bag-1"
                hidden>
                从当前结果移除
              </button>
            </div>
          </li>

          <li
            class="listing"
            data-listing-id="lamp-1"
            data-search-text="阅读台灯 灯具"
            data-status="reserved">
            <img
              src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgMzYwIj48cmVjdCB3aWR0aD0iNjQwIiBoZWlnaHQ9IjM2MCIgZmlsbD0iI2U5ZWRmMiIvPjxwYXRoIGQ9Ik0yNTAgOTVoMTQwbDU4IDEyMEgxOTJ6IiBmaWxsPSIjNTY2YjdlIi8+PHJlY3QgeD0iMzA2IiB5PSIyMTAiIHdpZHRoPSIyOCIgaGVpZ2h0PSI4MiIgZmlsbD0iIzM4NDc1NCIvPjxyZWN0IHg9IjI0NSIgeT0iMjkyIiB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIyIiByeD0iMTAiIGZpbGw9IiMzODQ3NTQiLz48cGF0aCBkPSJNMjEwIDE4MGwyMiA4IiBzdHJva2U9IiNiNTFmMjUiIHN0cm9rZS13aWR0aD0iNyIvPjwvc3ZnPg=="
              alt="蓝灰色阅读台灯，灯罩左侧有一道细裂纹"
              width="640"
              height="360">
            <h3>阅读台灯</h3>
            <p>可正常点亮，灯罩左侧有细裂纹。</p>
            <p><strong>价格：</strong><data value="3900">39.00 元</data></p>
            <p><strong>状态：</strong><span>已预约</span></p>
            <div class="actions">
              <button
                class="favorite"
                type="button"
                data-listing-id="lamp-1"
                aria-pressed="false"
                hidden>
                收藏
              </button>
              <button
                class="remove secondary"
                type="button"
                data-listing-id="lamp-1"
                hidden>
                从当前结果移除
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section aria-labelledby="media-title" class="panel">
        <h2 id="media-title">阅读台灯验货媒体替代</h2>
        <div class="media-layout">
          <div>
            <video
              controls
              preload="metadata"
              aria-describedby="media-boundary">
              <source src="media/lamp-check.mp4" type="video/mp4">
              <track
                kind="captions"
                srclang="zh"
                label="中文"
                src="media/lamp-check.zh.vtt"
                default>
              <track
                kind="descriptions"
                srclang="zh"
                label="中文视觉描述"
                src="media/lamp-check.descriptions.zh.vtt">
              当前浏览器不能播放视频，请阅读旁边的文字稿。
            </video>
            <p id="media-boundary" class="boundary">
              媒体文件需要学习者提供；页面文字稿始终可读。
            </p>
            <p>
              <a href="media/lamp-check-described.mp4">
                播放带音频描述的验货版本
              </a>
            </p>
          </div>

          <div>
            <h3>验货文字稿与视觉说明</h3>
            <p>
              <strong>00:00–00:03：</strong>
              台灯位于木桌中央。灯罩左侧靠下有一道约 2 厘米细裂纹。
            </p>
            <p>
              <strong>00:03–00:06：</strong>
              [开关按下声] 灯泡点亮，没有闪烁。
            </p>
            <p>
              <strong>00:06–00:09：</strong>
              演示者转动灯臂，底座保持稳定；电线外皮完整。
            </p>
            <p>
              关键结论：台灯可以点亮和调节，灯罩有裂纹，购买前应现场确认。
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="publish-title" class="panel">
        <h2 id="publish-title">发布预览</h2>
        <p class="boundary">
          这里只生成当前页预览，不发送、保存或上传任何数据。
        </p>

        <div id="error-summary" role="alert"></div>

        <form id="publish-form" novalidate>
          <div class="field">
            <label for="listing-title">商品标题</label>
            <input
              id="listing-title"
              name="title"
              required
              minlength="3"
              maxlength="60"
              aria-describedby="title-help listing-title-error">
            <p id="title-help" class="help">请输入 3–60 个字符。</p>
            <p id="listing-title-error" class="error"></p>
          </div>

          <div class="field">
            <label for="price-yuan">价格（元）</label>
            <input
              id="price-yuan"
              name="price"
              type="text"
              inputmode="decimal"
              required
              aria-describedby="price-help price-yuan-error">
            <p id="price-help" class="help">
              使用普通十进制，最多两位小数；例如 39.00。
            </p>
            <p id="price-yuan-error" class="error"></p>
          </div>

          <button type="submit">生成预览</button>
        </form>

        <p id="form-status" role="status" aria-atomic="true"></p>
        <section id="preview" class="panel" aria-labelledby="preview-title" hidden>
          <h3 id="preview-title">当前页预览</h3>
        </section>
      </section>

      <section aria-labelledby="chart-title" class="panel">
        <h2 id="chart-title">初始商品价格比较</h2>
        <p id="chart-summary">
          折叠学习桌价格最高，为 89.00 元；帆布包最低，为 25.00 元。
          图表使用初始教学数据，不随当前页删除操作改变。
        </p>

        <div class="chart-shell">
          <canvas
            id="price-chart"
            width="640"
            height="260"
            role="img"
            aria-labelledby="chart-title"
            aria-describedby="chart-summary">
            当前浏览器不能绘制价格图，请阅读后面的价格表。
          </canvas>
        </div>

        <div
          class="table-region"
          role="region"
          aria-labelledby="price-table-title"
          tabindex="0">
          <h3 id="price-table-title">初始价格数据表</h3>
          <table>
            <thead>
              <tr>
                <th scope="col">商品</th>
                <th scope="col">状态</th>
                <th scope="col">价格</th>
              </tr>
            </thead>
            <tbody id="price-data">
              <tr data-cents="8900">
                <th scope="row">折叠学习桌</th>
                <td>在售</td>
                <td><data value="8900">89.00 元</data></td>
              </tr>
              <tr data-cents="2500">
                <th scope="row">帆布包</th>
                <td>在售</td>
                <td><data value="2500">25.00 元</data></td>
              </tr>
              <tr data-cents="3900">
                <th scope="row">阅读台灯</th>
                <td>已预约</td>
                <td><data value="3900">39.00 元</data></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <dialog
      id="remove-dialog"
      aria-labelledby="remove-title"
      aria-describedby="remove-description">
      <form id="remove-form" method="dialog">
        <h2 id="remove-title">从当前结果移除商品</h2>
        <p id="remove-description"></p>
        <p class="boundary">
          这只修改当前页面内存和 DOM，不会删除服务器数据。
        </p>
        <div class="actions">
          <button class="secondary" value="cancel" autofocus>取消</button>
          <button class="danger" value="remove">确认移除</button>
        </div>
      </form>
    </dialog>

    <script>
      const searchForm = document.querySelector("#search-form");
      const query = document.querySelector("#query");
      const resetSearch = document.querySelector("#reset-search");
      const searchStatus = document.querySelector("#search-status");
      const favoriteStatus = document.querySelector("#favorite-status");
      const resultList = document.querySelector("#result-list");
      const resultsTitle = document.querySelector("#results-title");
      const noResults = document.querySelector("#no-results");

      const removeDialog = document.querySelector("#remove-dialog");
      const removeForm = document.querySelector("#remove-form");
      const removeDescription = document.querySelector("#remove-description");

      const publishForm = document.querySelector("#publish-form");
      const titleControl = document.querySelector("#listing-title");
      const priceControl = document.querySelector("#price-yuan");
      const errorSummary = document.querySelector("#error-summary");
      const formStatus = document.querySelector("#form-status");
      const preview = document.querySelector("#preview");

      const canvas = document.querySelector("#price-chart");
      const favoriteIds = new Set();

      let searchTimer = 0;
      let dialogInvoker = null;
      let pendingRemovalId = "";
      let pendingFocus = null;

      function currentItems() {
        return Array.from(resultList.querySelectorAll(".listing"));
      }

      function visibleItems() {
        return currentItems().filter((item) => !item.hidden);
      }

      function listingTitle(item) {
        return item.querySelector("h3").textContent.trim();
      }

      function updateEmptyState() {
        const count = visibleItems().length;
        noResults.hidden = count !== 0;
        return count;
      }

      function enableEnhancements() {
        for (const button of resultList.querySelectorAll(".favorite, .remove")) {
          button.hidden = false;
        }
      }

      enableEnhancements();

      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        window.clearTimeout(searchTimer);

        const normalizedQuery = query.value.trim().toLocaleLowerCase("zh-CN");
        resultList.setAttribute("aria-busy", "true");
        searchStatus.textContent = "正在筛选当前页面商品。";

        searchTimer = window.setTimeout(() => {
          for (const item of currentItems()) {
            const searchText = item.dataset.searchText.toLocaleLowerCase("zh-CN");
            item.hidden = normalizedQuery !== "" && !searchText.includes(normalizedQuery);
          }

          const count = updateEmptyState();
          resultList.setAttribute("aria-busy", "false");
          searchStatus.textContent = normalizedQuery === ""
            ? `当前显示剩余全部 ${count} 件商品。`
            : `查询完成，找到 ${count} 件商品。`;
        }, 350);
      });

      searchForm.addEventListener("reset", () => {
        window.clearTimeout(searchTimer);

        queueMicrotask(() => {
          for (const item of currentItems()) {
            item.hidden = false;
          }

          const count = updateEmptyState();
          resultList.setAttribute("aria-busy", "false");
          searchStatus.textContent = `已清除查询，显示剩余全部 ${count} 件商品。`;
        });
      });

      resultList.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button || !resultList.contains(button)) {
          return;
        }

        const item = button.closest(".listing");
        const id = item.dataset.listingId;
        const title = listingTitle(item);

        if (button.classList.contains("favorite")) {
          const nextPressed = button.getAttribute("aria-pressed") !== "true";
          button.setAttribute("aria-pressed", String(nextPressed));

          if (nextPressed) {
            favoriteIds.add(id);
            favoriteStatus.textContent = `已收藏“${title}”。仅当前页面有效。`;
          } else {
            favoriteIds.delete(id);
            favoriteStatus.textContent = `已取消收藏“${title}”。`;
          }

          return;
        }

        if (button.classList.contains("remove")) {
          dialogInvoker = button;
          pendingRemovalId = id;
          pendingFocus = null;
          removeDialog.returnValue = "";
          removeDescription.textContent = `确认从当前结果移除“${title}”吗？`;
          removeDialog.showModal();
        }
      });

      function canReceiveFocus(element) {
        if (!(element instanceof HTMLElement) || !element.isConnected) {
          return false;
        }

        if (element.hidden || element.closest("[hidden], [inert]")) {
          return false;
        }

        if (element.matches(":disabled")) {
          return false;
        }

        return true;
      }

      function actionIn(item) {
        if (!item || item.hidden) {
          return null;
        }

        return item.querySelector(".favorite:not([hidden]), .remove:not([hidden])");
      }

      function removePendingListing() {
        const items = visibleItems();
        const item = items.find(
          (candidate) => candidate.dataset.listingId === pendingRemovalId
        );

        if (!item) {
          favoriteStatus.textContent = "目标商品已不在当前结果中。";
          pendingFocus = resultsTitle;
          return;
        }

        const removedIndex = items.indexOf(item);
        const title = listingTitle(item);
        pendingFocus = actionIn(items[removedIndex + 1])
          ?? actionIn(items[removedIndex - 1])
          ?? resultsTitle;

        favoriteIds.delete(pendingRemovalId);
        item.remove();

        const count = updateEmptyState();
        searchStatus.textContent =
          `已从当前结果移除“${title}”，还显示 ${count} 件商品。`;
      }

      removeForm.addEventListener("submit", (event) => {
        if (event.submitter?.value !== "remove") {
          return;
        }

        event.preventDefault();
        removePendingListing();
        removeDialog.close("remove");
      });

      removeDialog.addEventListener("close", () => {
        const target = removeDialog.returnValue === "remove"
          ? pendingFocus
          : dialogInvoker;

        queueMicrotask(() => {
          if (canReceiveFocus(target)) {
            target.focus();
          } else {
            resultsTitle.focus();
          }

          dialogInvoker = null;
          pendingRemovalId = "";
          pendingFocus = null;
        });
      });

      function setFieldError(control, message) {
        const error = document.querySelector(`#${control.id}-error`);
        error.textContent = message;

        if (message) {
          control.setAttribute("aria-invalid", "true");
        } else {
          control.removeAttribute("aria-invalid");
        }
      }

      function parseYuanToCents(value) {
        const match = /^(0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
        if (!match) {
          return null;
        }

        const yuan = Number(match[1]);
        const fraction = (match[2] ?? "").padEnd(2, "0");
        const cents = yuan * 100 + Number(fraction);
        return Number.isSafeInteger(cents) ? cents : null;
      }

      function collectFormErrors() {
        const errors = [];
        const normalizedTitle = titleControl.value.trim();
        const priceCents = parseYuanToCents(priceControl.value);

        setFieldError(titleControl, "");
        setFieldError(priceControl, "");

        if (normalizedTitle.length < 3 || normalizedTitle.length > 60) {
          const message = "标题需要 3–60 个字符。";
          setFieldError(titleControl, message);
          errors.push({
            control: titleControl,
            label: "商品标题",
            message
          });
        }

        if (priceCents === null) {
          const message = "请输入非负普通十进制金额，最多两位小数。";
          setFieldError(priceControl, message);
          errors.push({
            control: priceControl,
            label: "价格",
            message
          });
        }

        return {
          errors,
          title: normalizedTitle,
          priceCents
        };
      }

      function renderErrorSummary(errors) {
        errorSummary.replaceChildren();

        if (errors.length === 0) {
          return;
        }

        const heading = document.createElement("h3");
        heading.textContent = `请修正 ${errors.length} 处问题`;

        const list = document.createElement("ul");

        for (const error of errors) {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = `#${error.control.id}`;
          link.textContent = `${error.label}：${error.message}`;
          link.addEventListener("click", (event) => {
            event.preventDefault();
            error.control.focus();
          });
          item.append(link);
          list.append(item);
        }

        errorSummary.append(heading, list);
      }

      function formatCents(cents) {
        const yuan = Math.floor(cents / 100);
        const fraction = String(cents % 100).padStart(2, "0");
        return `${yuan}.${fraction} 元`;
      }

      publishForm.addEventListener("submit", (event) => {
        event.preventDefault();
        formStatus.textContent = "";

        const result = collectFormErrors();
        renderErrorSummary(result.errors);

        if (result.errors.length > 0) {
          preview.hidden = true;
          result.errors[0].control.focus();
          return;
        }

        const heading = document.createElement("h3");
        heading.id = "preview-title";
        heading.textContent = result.title;

        const price = document.createElement("p");
        price.textContent = `价格：${formatCents(result.priceCents)}`;

        const boundary = document.createElement("p");
        boundary.textContent = "这是当前页面预览，尚未发布或保存。";

        preview.replaceChildren(heading, price, boundary);
        preview.hidden = false;
        errorSummary.replaceChildren();
        formStatus.textContent = "预览已生成，数据只存在当前页面。";
      });

      publishForm.addEventListener("input", (event) => {
        const control = event.target;
        if (control !== titleControl && control !== priceControl) {
          return;
        }

        setFieldError(control, "");
        errorSummary.replaceChildren();
        formStatus.textContent = "";
      });

      function chartData() {
        return Array.from(document.querySelectorAll("#price-data tr")).map((row) => ({
          title: row.querySelector("th").textContent.trim(),
          cents: Number(row.dataset.cents)
        }));
      }

      function drawChart() {
        const context = canvas.getContext("2d");
        if (!context) {
          return;
        }

        const data = chartData();
        const cssWidth = Math.max(280, Math.round(canvas.getBoundingClientRect().width));
        const cssHeight = 260;
        const dpr = Math.max(1, window.devicePixelRatio || 1);

        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, cssWidth, cssHeight);

        const left = Math.min(150, cssWidth * 0.34);
        const right = 22;
        const top = 30;
        const rowHeight = 64;
        const maxCents = Math.max(...data.map((item) => item.cents));
        const barWidth = Math.max(40, cssWidth - left - right);

        context.font = "16px system-ui, sans-serif";
        context.textBaseline = "middle";

        data.forEach((item, index) => {
          const y = top + index * rowHeight;
          const width = Math.max(2, barWidth * item.cents / maxCents);

          context.fillStyle = "#26332d";
          context.fillText(item.title, 10, y + 17);

          context.fillStyle = "#2f7f5c";
          context.fillRect(left, y, width, 34);

          context.fillStyle = "#18231e";
          context.fillText(formatCents(item.cents), left + 8, y + 17);
        });
      }

      let resizeTimer = 0;
      window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(drawChart, 120);
      });

      drawChart();
    </script>
  </body>
</html>
```

### 7.4 逐步理解增强顺序

#### 第一步：先验证无脚本基线

在 DevTools 禁用 JavaScript或临时阻止脚本：

- 三件商品及其标题、价格、状态、图片替代仍在 HTML 中；
- 收藏和移除按钮保持 `hidden`，不会留下死按钮；
- 媒体文字稿、视觉说明、图表摘要和价格表仍可阅读；
- 发布表单仍有标签、帮助文字和 HTML 约束，但本地预览不可用；
- `<noscript>` 诚实说明缺失能力。

这证明核心商品事实不依赖 Canvas 或脚本生成。

#### 第二步：脚本只公布稳定查询结果

查询提交后先把列表标为 busy，350ms 后一次性更新所有 `hidden` 状态，再公布最终数量。新的提交会清除旧计时器，避免旧查询晚于新查询覆盖页面。

这是教学防抖，不是远程请求取消。真实 fetch 查询还需要 `AbortController`、请求标识或其他竞态控制。

#### 第三步：收藏状态由三层共同表达

脚本启动后才显示收藏按钮。每次切换同时更新：

- `favoriteIds`；
- `aria-pressed`；
- 保持稳定的按钮可见文字；
- 共享 polite status。

没有一层被当作其他层的替代。

#### 第四步：删除前先计算恢复点

确认删除时，脚本先从“当前可见项目”中找到被删项的位置，再选择下一项或上一项的操作按钮。节点移除后，dialog 的 `close` 处理器在微任务中验证目标仍可聚焦；若目标也失效，则回到结果标题。

取消或 Esc 关闭时，优先返回原调用按钮。

#### 第五步：错误只在提交时集中通知

表单输入过程中不按每个字符发 live 通知。提交时：

1. 重新计算全部错误；
2. 更新字段旁错误和 `aria-invalid`；
3. 生成带链接的错误汇总；
4. 显示 alert；
5. 只把焦点移到首个无效字段一次。

用户继续输入时会清除当前字段的旧错误并隐藏可能过期的汇总；再次提交才生成新的完整错误状态。真实产品还应决定 blur 验证、服务端错误映射和草稿保留策略。

#### 第六步：表格是真相源，Canvas 是增强视图

`drawChart()` 从 HTML 表格读取标题和整数分。即使 `getContext("2d")` 返回 `null`、脚本被禁用或 Canvas 不在读屏阅读模型中，摘要和表格仍交付相同数据。

### 7.5 运行方式

最小方式：

1. 保存 `index.html`；
2. 直接用浏览器打开；
3. 先不准备媒体文件，验证除实际播放/字幕外的全部流程；
4. 有权使用的媒体准备完成后，把文件放到 `media/` 对应路径；
5. 若本地 `track` 或媒体受浏览器 `file://` 策略影响，使用已有静态服务器；
6. 打开 DevTools 的 Elements、Accessibility、Console 和 Network 面板。

不应为了本课在教程仓库创建素材、依赖或 `package.json`。

### 7.6 正常路径预期

#### 查询与收藏

- 初始状态显示 3 件；
- 搜索“台灯”后只显示阅读台灯，状态通知“找到 1 件商品”；
- 搜索完成后焦点不被强制移动；
- 收藏后按钮文字仍为“收藏”，`aria-pressed="true"`；
- 取消后按钮文字仍为“收藏”，`aria-pressed="false"`；
- 刷新后收藏状态丢失，符合内存边界。

#### 失败表单

- 空表单提交出现 2 项错误；
- 标题控件获得焦点；
- 两个无效控件均有 `aria-invalid="true"` 和可见错误；
- 汇总链接可以回到对应控件；
- 输入“阅读台灯”、价格“39.00”后重新提交，生成 39.00 元预览；
- 预览明确说明未发布或保存。

#### dialog 与动态列表

- dialog 打开后焦点进入“取消”按钮；
- Tab/Shift+Tab 不应进入模态背景；
- 取消或 Esc 后回到原“从当前结果移除”按钮；
- 确认移除中间商品后，焦点进入下一件可见商品的收藏按钮；
- 删除最后一件可见商品时，焦点进入上一件或结果标题；
- 删除到空列表后出现可见空状态，结果标题仍可聚焦。

#### 媒体与图表

- 没有媒体文件时，Network 能看到真实失败，文字稿仍可读；
- 有合法资源时，播放器能选择中文 captions；
- 带描述版本或文字视觉说明可发现；
- Canvas 显示三条价格柱；
- Canvas 关闭或脚本失败时，摘要和三行数据表仍完整；
- 价格模型为 8900、2500、3900 分，显示为元。

#### 放大、触控、颜色与运动

- 200% 文字缩放时标签和按钮不被固定高度裁切；
- 约 320 CSS px 内容宽度时商品变为单列，整页不横向滚动；
- 价格表允许局部横向滚动；
- 按钮目标约 44 CSS px 高，并有间距；
- 已预约状态有文字和双线/颜色边界，不只靠颜色；
- 减少动效时卡片悬停位移消失，功能和最终状态不变。

### 7.7 失败时的证据顺序

1. **Console**：先排除选择器、正则、Canvas 或事件语法错误；
2. **Elements**：检查 `hidden`、`aria-busy`、`aria-pressed`、`aria-invalid` 是否与可见状态一致；
3. **Accessibility**：检查角色、名称、描述和状态是否映射；
4. **`document.activeElement`**：记录失败提交、dialog 关闭、删除后的真实焦点；
5. **Network**：媒体、VTT 路径、状态、MIME 类型；
6. **媒体轨道 API**：检查 `video.textTracks`、`readyState` 和 cue；
7. **浏览器缩放/响应式模式**：检查裁切和整页滚动；
8. **操作系统减少动效设置**：不要只在 CSS 源码中看到媒体查询就判通过；
9. **真实读屏组合**：状态时机、重复、dialog 与焦点必须人工验证。

### 7.8 精确的人工读屏步骤

每个目标组合从刷新后的初始页开始，避免上一次内存状态污染。

#### 状态与查询

1. 用读屏的表单/地标导航找到搜索；
2. 输入“台灯”并提交；
3. 记录是否听到最终数量、是否包含“查询完成”上下文；
4. 记录焦点实际位置；
5. 立即搜索“包”，观察旧结果是否被后来的稳定结果取代；
6. 不要求两次通知逐字完整，但最终可见列表和状态必须一致。

#### 收藏

1. 导航到“收藏”按钮，记录名称与 pressed 状态；
2. 激活一次，确认名称仍为“收藏”，pressed 状态变为 `true`；
3. 快速切换三次；
4. 记录中间通知是否合并；
5. 验收最终 `aria-pressed`、稳定可见文字、`Set` 结果和最后状态一致。

#### 失败表单

1. 空表单提交；
2. 记录 `document.activeElement.id`；
3. 记录聚焦字段读出的标签、帮助与错误；
4. 用汇总链接移动到价格；
5. 修正后再次提交；
6. 检查成功状态不会继续报告旧错误。

#### dialog 与删除

1. 从第二张商品卡打开 dialog；
2. 记录 dialog 名称、说明和初始焦点；
3. 尝试 Tab/Shift+Tab，确认没有进入背景商品；
4. Esc 关闭，确认返回原按钮；
5. 再打开并确认删除；
6. 记录删除后焦点落到哪一件商品的什么操作；
7. 用读屏列表导航确认被删除项不再存在。

#### 媒体与 Canvas

1. 不看屏幕，阅读图片、媒体标题、文字稿和图表区域；
2. 判断是否能得出“台灯有裂纹但能点亮”的结论；
3. 判断是否能得出三件商品的精确价格和最高/最低结论；
4. 检查 Canvas 名称和摘要是否与后续表格产生不可接受的重复；
5. 若测试媒体，分别记录 captions、描述轨道/描述版本与文字稿，不合并成“媒体可访问”一项。

### 7.9 项目数据与安全边界

- `priceCents` 仍以整数分表达；输入元字符串只在边界精确转换；
- 页面不接受任意 HTML，动态标题和错误使用 `textContent`；
- 页面不读取或保存真实个人信息；
- `aria-*` 不能防止用户修改状态，也不能提供授权；
- 隐藏删除按钮不是权限检查；
- media 路径不是上传能力；
- `role="alert"` 不会自动把错误写入日志；
- Canvas 表格不是后端统计；
- 刷新恢复初始状态是教学契约，不是数据丢失缺陷。

## 8. 常见错误与排查路径

### 8.1 只改变视觉文字，没有状态通知

```html
<p id="count">0 件商品</p>
```

```js
count.textContent = "3 件商品";
```

- **现象**：视觉用户看见数量改变，焦点位于搜索按钮的读屏用户没有得到通知。
- **证据**：Elements 中内容正确；Accessibility 树中没有 live 属性；焦点从未经过数量段落。
- **原因**：普通文本变化不会自动成为状态消息。
- **修复**：页面加载时就让一个短、稳定节点具有 `role="status"`，查询完成后更新完整句子。
- **复验**：焦点留在搜索按钮，最终数量可见且在目标组合中得到一次足够理解的 polite 通知。

不要因此把整个结果列表变成 live region。列表负责内容，短状态句负责通知。

### 8.2 所有消息都使用 alert

```html
<p role="alert">已输入 1 个字符</p>
<p role="alert">已输入 2 个字符</p>
<p role="alert">已收藏</p>
```

- **现象**：语音不断中断，输入标签或真正失败信息听不完整。
- **证据**：Accessibility 面板显示多个 alert；录屏/测试记录可见每个按键都更新。
- **原因**：把“希望被知道”误解为“必须立即打断”。
- **修复**：普通完成使用 `status`；输入过程通常不通知；只把阻断任务且需立即处理的失败设为 alert。
- **复验**：正常操作不抢占语音，严重错误仍能及时发现。

### 8.3 在写入消息之后才增加 `aria-live`

```js
message.textContent = "查询完成。";
message.setAttribute("aria-live", "polite");
```

- **现象**：视觉状态正确，但部分组合没有通知。
- **证据**：DOM 最终属性看似正确，执行顺序却是文字在前、通知策略在后。
- **原因**：live region 未在变化前稳定存在。
- **修复**：把角色和 live 属性写进初始 HTML；业务代码只改内容。
- **复验**：刷新后初始区域安静，后续业务变化可被目标组合发现。

### 8.4 把大型结果容器设为原子通知

```html
<main aria-live="polite" aria-atomic="true">
  <!-- 导航、搜索、几十张卡片、页脚 -->
</main>
```

- **现象**：一处数量变化触发过长朗读，后续通知排队或被跳过。
- **证据**：Accessibility 树中整个主要区域都是 atomic live region。
- **原因**：误以为范围越大越不容易漏。
- **修复**：移除大容器 live 属性，新增一条短状态句；结果本身保持普通语义。
- **复验**：通知只包含任务所需上下文，页面内容仍可按标题和列表浏览。

### 8.5 `aria-relevant="all"` 报告批量筛选细节

```html
<ul aria-live="polite" aria-relevant="all">
  <!-- 搜索时批量增删、改文字 -->
</ul>
```

- **现象**：筛选一次可能听到多条加入、删除和文字变化。
- **证据**：一次用户动作引发大量可访问树事件。
- **原因**：把 DOM 变更日志当作用户状态。
- **修复**：列表取消 live；独立 status 只报告“找到 N 件”。
- **复验**：列表变化可浏览，通知数量稳定且简短。

### 8.6 `aria-busy` 一直停在 `true`

```js
results.setAttribute("aria-busy", "true");
updateResults(); // 这里抛错后没有复位
```

- **现象**：区域视觉上已有结果，辅助技术仍可能把它视为未完成，后续变化不按预期通知。
- **证据**：Elements 中 busy 在失败后仍是 `true`；Console 有异常。
- **原因**：只在成功路径复位。
- **修复**：同步逻辑用 `try...finally`；异步逻辑在成功、失败、取消和过期结果路径都明确复位当前任务。
- **复验**：制造异常后 busy 也恢复 `false`，并出现可见失败说明。

### 8.7 用空字符串和零延迟计时器强迫重复播报

```js
status.textContent = "";
setTimeout(() => {
  status.textContent = "已收藏。";
}, 0);
```

- **现象**：某一组合似乎更容易重复播报，另一组合仍不稳定或产生两次通知。
- **证据**：业务状态未改变，却为发音而制造额外 DOM 状态。
- **原因**：试图把辅助技术队列当作可精确控制的音频 API。
- **修复**：只在真实状态变化时写完整消息；相同动作没有新结果时无需重复通知，确需提醒时重新评估交互设计。
- **复验**：以最终任务是否可理解为标准，不以某个组合重复发声为标准。

### 8.8 表单失败只有红边或 `aria-invalid`

```html
<input aria-invalid="true" style="border-color: red">
```

- **现象**：用户知道“可能有错”，却不知道错在哪里、如何修复，也无法快速定位其他错误。
- **证据**：没有字段错误文本、描述关联、汇总和焦点恢复。
- **原因**：把状态属性当成完整错误消息。
- **修复**：增加可见具体错误、`aria-describedby`、汇总链接，并选择首个字段或汇总作为主焦点。
- **复验**：不看颜色也能指出错误数量、原因、位置和修复方式。

### 8.9 同时聚焦汇总和首个字段

```js
errorSummary.focus();
firstInvalid.focus();
```

- **现象**：视觉焦点闪动；读屏开始读汇总又被字段打断。
- **证据**：断点显示同一提交处理器连续调用两次 `focus()`。
- **原因**：把两种合法模式叠加，而没有选择主路径。
- **修复**：短表单使用首字段优先，长表单可使用汇总优先；只移动一次。
- **复验**：记录一次失败后的唯一焦点 ID 和用户下一步。

### 8.10 dialog 关闭后聚焦已删除节点

```js
const invoker = event.currentTarget;
item.remove();
dialog.close();
invoker.focus();
```

- **现象**：焦点落到 `body`、文档开头或浏览器不可预测位置。
- **证据**：`invoker.isConnected === false`；`document.activeElement` 不是预期元素。
- **原因**：恢复目标与删除节点属于同一子树。
- **修复**：删除前计算下一项、上一项和稳定标题；关闭后检查连接、隐藏、禁用和 inert 状态。
- **复验**：删除第一项、中间项、最后一项和唯一一项，分别记录焦点。

### 8.11 重新渲染列表让所有旧焦点引用失效

```js
results.replaceChildren(...newCards);
oldFavoriteButton.focus();
```

- **现象**：视觉上“同一商品按钮”仍在，旧引用却已断开。
- **证据**：旧按钮 `isConnected` 为 `false`，新按钮是另一个对象。
- **原因**：整表重建破坏节点身份。
- **修复**：能就地更新就保留节点；必须重建时保存稳定商品 ID，在新 DOM 中找同一逻辑操作，并保留局部回退。
- **复验**：筛选、排序、删除后检查焦点对象和商品 ID 都符合预期。

### 8.12 把缺失 `alt` 和空 `alt` 当成同一件事

```html
<img src="scratch.jpg">
<img src="scratch.jpg" alt="">
```

- **现象**：第一张可能暴露文件名；第二张通常作为装饰不提供图片信息。
- **证据**：Accessibility 树中的名称/角色不同。
- **原因**：省略属性表示没有提供替代，空值表示作者判定图片在当前上下文为装饰。
- **修复**：瑕疵照片写任务相关替代；真正装饰图才写 `alt=""`。
- **复验**：关闭图片或用读屏，仍能知道影响购买判断的瑕疵。

### 8.13 字幕只写对白，遗漏关键声音

```text
00:00:03.000 --> 00:00:05.000
台灯可以点亮。
```

- **现象**：看不到声音信息的用户不知道开关声、蜂鸣、撞击或报警。
- **证据**：逐段对照音轨和 VTT，关键非语言声音缺失。
- **原因**：把 captions 误当作纯对白抄录。
- **修复**：加入理解所需的声音与说话者信息，例如 `[开关按下声]`。
- **复验**：静音播放，仅看 captions 仍能理解关键验货过程。

### 8.14 用文字稿替代同步 captions

- **现象**：页面有完整文字，但视频播放时听障用户无法同步知道当前对白。
- **证据**：播放器没有可用 captions 轨道，只有页面下方长文。
- **原因**：混淆顺序阅读替代与时间同步替代。
- **修复**：预录同步视频提供准确 captions；文字稿作为额外可搜索路径。
- **复验**：分别验证轨道同步和文字稿完整性。

### 8.15 只有 Canvas 和一句“价格图”

```html
<canvas aria-label="商品价格图"></canvas>
```

- **现象**：用户知道这里有图，却不知道商品和数值。
- **证据**：Canvas 绘图没有对应 DOM 数据点；页面没有摘要或表格。
- **原因**：名称只标识对象，不等于复杂内容替代。
- **修复**：增加主要结论、完整语义表格；交互图还要有等价控件。
- **复验**：禁用脚本或忽略 Canvas，仍能回答最高、最低和每项精确价格。

### 8.16 固定高度在 200% 文字缩放时裁切

```css
button {
  width: 120px;
  height: 32px;
  overflow: hidden;
}
```

- **现象**：放大后按钮文字被截断，错误说明互相覆盖。
- **证据**：Computed 面板显示固定宽高与隐藏溢出。
- **原因**：把初始字号下的像素盒当成内容契约。
- **修复**：使用 `min-block-size`、内容驱动高度、内边距和换行；去掉非必要隐藏。
- **复验**：浏览器文字缩放 200%，按钮名称完整且可操作。

### 8.17 用 viewport 禁止缩放

```html
<meta
  name="viewport"
  content="width=device-width, maximum-scale=1, user-scalable=no">
```

- **现象**：部分移动浏览器中用户无法按需要放大。
- **证据**：查看 head 中 viewport 配置并在真实设备尝试缩放。
- **原因**：为避免布局暴露问题而限制用户能力。
- **修复**：使用 `width=device-width, initial-scale=1`，真正修复回流与覆盖。
- **复验**：设备允许缩放，放大后主任务仍可完成。

### 8.18 视觉按钮很大，实际点击目标仍小

```css
.icon {
  transform: scale(2);
}
```

- **现象**：图标看起来变大，布局盒、间距或点击监听范围没有相应改善。
- **证据**：Elements 高亮的盒尺寸仍小；相邻目标接近或重叠。
- **原因**：变换只改变绘制结果，不一定改变布局和命中设计。
- **修复**：给真实交互元素增加 `min-inline-size`、`min-block-size`、padding 和 gap。
- **复验**：检查 CSS 像素盒，并在真实触控设备完成连续操作。

### 8.19 状态只靠红绿颜色

- **现象**：高对比、灰度或色觉差异条件下无法区分“在售”和“已预约”。
- **证据**：隐藏颜色样式后没有文字、形状或状态属性差异。
- **原因**：把装饰色当作唯一信息。
- **修复**：保留“状态：在售/已预约”文字；颜色和边框只作冗余提示。
- **复验**：强制颜色模式或打印黑白时仍可区分。

### 8.20 全局缩短动画破坏业务回调

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.001ms !important;
  }
}
```

- **现象**：等待 `animationend` 的代码没有按预期执行，或者组件闪烁。
- **证据**：业务逻辑依赖动画事件；减少动效模式才失败。
- **原因**：用全局覆盖掩盖组件设计，没有分离状态和呈现。
- **修复**：业务状态直接完成；对具体非必要动画使用 `animation: none` 或静态替代；不得依赖动画结束才能提交关键结果。
- **复验**：普通与 reduce 模式到达相同业务状态，只有运动量不同。

## 9. 课后题

### 9.1 理解题

1. `role="status"` 和 `role="alert"` 的隐式 live 优先级分别是什么？为什么收藏不应默认使用 alert？
2. 为什么 live region 最好在业务变化之前已经存在？
3. `aria-atomic="true"` 适合短结果句，为什么不适合整个商品列表？
4. `aria-relevant="removals"` 应何时使用？为什么普通筛选列表通常不需要？
5. `aria-busy` 会不会自动禁用控件、显示加载文字或等待 Promise？
6. 为什么快速三次更新不能把“听到三次”作为跨组合验收标准？
7. 错误汇总和首个无效字段各解决什么问题？
8. 删除 dialog 的调用入口随商品被删后，为什么不能继续聚焦旧引用？
9. `alt=""` 与省略 `alt` 有什么不同？
10. captions、文字稿和 audio description 分别覆盖什么信息？
11. 为什么 Canvas 有可访问名称仍不等于图表有完整替代？
12. WCAG 2.2 AA 的目标尺寸边界和常见 44 × 44 工程目标有什么区别？

<details>
<summary>查看理解题参考答案</summary>

1. `status` 隐式为 polite，`alert` 隐式为 assertive；收藏是普通完成状态，打断当前语音通常没有必要。
2. 辅助技术需要观察后续可访问树变化；同时插入 region 和初始内容的处理存在组合差异。
3. 原子通知会以整个区域为单位；列表很大会产生冗长、重复通知。列表外短句更合适。
4. 只有删除本身对用户决策有意义时才加入。筛选会批量隐藏/显示节点，逐项报告会淹没最终数量。
5. 都不会。它只表达“区域尚在更新”，视觉加载、禁用、异步生命周期仍由应用管理。
6. DOM 同步覆盖、浏览器事件聚合和辅助技术队列都可能合并更新。应验收最终状态完整、可见、可回查。
7. 汇总提供全貌和跳转路径；首个无效字段提供立即修复入口。焦点策略要选一个主路径。
8. 旧节点 `isConnected` 为 `false`，不能成为可靠焦点。应在删除前选择相邻操作或稳定标题。
9. 空 `alt` 是明确的装饰决策；省略属性没有提供明确替代，可能暴露文件名或产生不一致映射。
10. captions 同步传达对白和关键声音；文字稿支持顺序阅读、搜索与复制；audio description 传达关键视觉信息。
11. 名称只能说明“这是什么图”，不能给出所有数值、表头关系和结论；需要摘要和表格。
12. WCAG 2.2 AA Target Size (Minimum) 基准为 24 × 24 CSS px 或满足规定间距，并有例外；44 × 44 是常见舒适目标，也对应增强级别，不应混写。

</details>

### 9.2 预测题

阅读代码，不运行先写预测：

```js
status.textContent = "准备";
status.textContent = "处理中";
status.textContent = "完成，共 3 项";
```

问题：

1. 最终 DOM 文本是什么？
2. 是否能保证读屏依次朗读三句？
3. 若必须保留每个处理步骤，应该依靠什么？

<details>
<summary>查看预测题参考答案</summary>

1. 最终文本是“完成，共 3 项”。
2. 不能。同步赋值会被最终 DOM 状态覆盖，辅助技术也可能合并变化。
3. 使用可见、有结构的步骤日志或进度列表作为可回查事实，再按必要程度通知关键里程碑；不能把 live 语音队列当持久日志。

</details>

### 9.3 设计取舍题

一个 30 字段表单失败 12 项。你会聚焦错误汇总还是首个字段？说明：

- 用户首先需要的信息；
- 汇总到字段的操作；
- live 通知是否保留；
- 如何避免两次连续焦点移动。

<details>
<summary>查看设计题参考答案</summary>

长表单通常适合“汇总优先”：把 `tabindex="-1"` 的汇总标题或容器作为唯一焦点，列出 12 项可见链接；用户了解全貌后选择字段。此时可不再叠加 assertive alert，避免同一内容由焦点和 live 重复。若产品研究显示首字段更符合任务，也可以选字段优先，但只能有一个主焦点，并保留可发现的汇总。

</details>

### 9.4 恢复路径题

当前可见列表为 A、B、C。用户从 B 的删除按钮打开 dialog。

分别说明：

1. 取消时的焦点；
2. 删除 B 后的焦点；
3. 若 C 同时被其他当前页操作隐藏，删除 B 后的焦点；
4. 若 A、B、C 都不存在，焦点落在哪里。

<details>
<summary>查看恢复路径题参考答案</summary>

1. 回到 B 的原删除按钮；
2. 优先到 C 的同类或主要操作；
3. 回到 A 的同类或主要操作；
4. 回到结果标题、添加商品按钮等局部稳定入口，最后才是页面主标题。

</details>

## 10. 实践练习

所有练习文件都放在个人目录，不放进教材仓库。每项先制造失败，再修复并记录复验。

### 10.1 基础练习：查询与收藏状态

**文件：**

```text
market-learning/practice/html-chapter-07/exercise-status.html
```

**任务：**

1. 创建 4 件静态商品；
2. 用一个 GET 语义搜索表单做当前页筛选；
3. 查询开始时设置最小结果容器 `aria-busy="true"`；
4. 完成后恢复 `false` 并用一个 `status` 通知数量；
5. 收藏按钮使用稳定可见文字“收藏”、`aria-pressed` 和内存 `Set`；
6. 连续快速收藏三次，记录实际通知。

**运行：**直接打开文件，先键盘测试，再使用一个明确版本的读屏组合。

**预期：**焦点不因查询或收藏通知跳走；最终状态三层一致；刷新清空。

**失败观察：**Elements 的 busy/pressed、Accessibility 树、Console、`document.activeElement`。

**完成标准：**报告中写明快速更新可能合并，并证明最终状态不依赖每条中间通知。

### 10.2 基础练习：失败表单恢复

**文件：**

```text
market-learning/practice/html-chapter-07/exercise-form.html
```

**任务：**

1. 建立标题、价格、描述三个字段；
2. 空提交至少得到两个具体错误；
3. 每个错误与字段关联；
4. 生成可见汇总和字段链接；
5. 选择“汇总优先”或“字段优先”，只移动一次焦点；
6. 修正后清除 `aria-invalid` 和过期错误；
7. 成功只生成当前页预览。

**运行：**直接打开，用键盘触发失败、逐项修复、再次提交。

**预期：**失败后能说明焦点位置、错误数量和修复方式；成功后没有旧错误。

**失败观察：**`document.activeElement.id`、`aria-describedby` ID 是否存在、错误节点是否仍有旧文字。

**完成标准：**关闭颜色后仍能完成修复；报告解释为何选择当前焦点策略。

### 10.3 提升练习：dialog 与动态列表

**文件：**

```text
market-learning/practice/html-chapter-07/exercise-focus-recovery.html
```

**任务：**

1. 创建 4 项可删除列表；
2. 每项从自己的按钮打开同一个 modal dialog；
3. 取消回原入口；
4. 确认删除后按“下一项 → 上一项 → 标题”恢复；
5. 分别删除第一项、中间项、最后一项和唯一项；
6. 记录每次 `activeElement`。

**运行：**完全不用鼠标，使用 Tab、Shift+Tab、Enter、Space 与 Esc。

**预期：**焦点从不落到已删除节点或无关页面开头。

**失败观察：**删除前后的 `isConnected`、列表索引、隐藏祖先、禁用状态。

**完成标准：**四种删除位置都有独立证据；不能只演示中间项成功。

### 10.4 提升练习：媒体替代审计

**文件：**

```text
market-learning/practice/html-chapter-07/exercise-media.html
market-learning/practice/html-chapter-07/media-audit.md
```

**任务：**

1. 选择一段自己有权使用、10–20 秒且含声音和关键动作的视频；
2. 编写 captions，包含对白和理解所需声音；
3. 提供页面文字稿；
4. 标出仅靠声音无法获得的视觉事实；
5. 提供音频描述版本、描述轨道或完整可见视觉说明；
6. 给 poster 附近内容提供真实替代，不把 poster 当 `alt`。

**运行：**分别在有声、静音、不看画面三种条件下完成理解问题。

**预期：**三种条件都能获得完成任务所需事实；字幕与视频时间同步。

**失败观察：**Network、MIME、VTT 第一行和 cue 时间、`textTracks`、播放器字幕菜单。

**完成标准：**审计报告分别评价 captions、文字稿和视觉描述，不能用一个“通过”覆盖三项。

### 10.5 提升练习：Canvas 与语义表格

**文件：**

```text
market-learning/practice/html-chapter-07/exercise-chart.html
```

**任务：**

1. 用 5 件商品的整数分数据创建语义表格；
2. 写一段包含最高、最低和差值的文字摘要；
3. 从同一数据源绘制 Canvas；
4. 在窄屏让 Canvas 缩放，表格包装器局部滚动；
5. 禁用脚本后回答所有数据问题。

**运行：**直接打开；DevTools 禁用脚本；再把内容宽度调到约 320 CSS px。

**预期：**脚本关闭时表格和摘要完整；整页不横向滚动，表格区域可局部滚动。

**失败观察：**表头 `scope`、Canvas 名称/描述、整页 `scrollWidth`、表格包装器。

**完成标准：**非视觉路径可以回答每项数值，不只知道“有一张图”。

### 10.6 故障练习：快速通知与 busy 泄漏

**文件：**

```text
market-learning/practice/html-chapter-07/exercise-live-failure.html
```

**先制造两个故障：**

1. 每个输入字符更新 assertive alert；
2. 查询抛错后让 `aria-busy` 保持 `true`。

**修复：**

1. 改为提交或防抖后的 polite 最终通知；
2. 在所有结束路径复位 busy，并显示可见错误；
3. 记录修复前后语音中断、DOM 属性和恢复能力。

**运行：**键盘和一个实际读屏组合；Console 人工抛出预定错误。

**预期：**修复后输入过程安静，最终结果可知，失败后 busy 为 false。

**失败观察：**事件绑定次数、计时器、异常路径、Accessibility 属性。

**完成标准：**报告不要求每条中间通知保留，而要求最终状态与失败恢复可靠。

### 10.7 跨边界练习：放大、目标、颜色与减少动效

**记录：**

```text
market-learning/practice/html-chapter-07/visual-boundary-report.md
```

**测试矩阵：**

1. 浏览器文字缩放 200%；
2. 1280 CSS px 视口放大到 400%，或直接使用约 320 CSS px 内容宽度；
3. 强制颜色/高对比模式；
4. 操作系统减少动效开启；
5. 一台真实触控设备上的搜索、收藏、错误修复和 dialog。

**预期：**

- 文字和焦点不被遮挡；
- 主路径不要求整页二维滚动；
- 表格只在自身区域横向滚动；
- 状态不用颜色也能理解；
- 非必要位移消失；
- 目标容易触达且不会误触邻项。

**失败观察：**固定宽高、绝对定位、覆盖层、transform、整页 scrollWidth、动画事件依赖。

**完成标准：**每个环境有截图或文字证据、失败与修复，不用响应式模拟器代替真实触控结论。

## 11. 阶段验收

### 11.1 A11Y-007：status、alert、live region 与 busy

- [ ] 能解释普通文字、status 与 alert 的优先级差异；
- [ ] live region 在业务变化前存在；
- [ ] 查询使用短、可见、atomic 的最终状态；
- [ ] 没有把整个结果列表设为 assertive/atomic；
- [ ] `aria-relevant` 只包含有业务意义的变化；
- [ ] `aria-busy` 作用于最小更新区域；
- [ ] 成功、失败、取消后 busy 均恢复 `false`；
- [ ] 快速更新被合并时，最终状态仍独立成立；
- [ ] 没有用清空/零延迟循环强迫重复发音；
- [ ] 自动工具结果没有被描述成状态通知已人工通过。

### 11.2 A11Y-008：表单错误汇总与焦点

- [ ] 字段错误可见且说明修复方式；
- [ ] `aria-invalid` 与当前错误一致，修复后会清理；
- [ ] `aria-describedby` 保留帮助和错误关联；
- [ ] 汇总显示数量并提供字段跳转；
- [ ] 失败提交只执行一次主焦点移动；
- [ ] 首个无效字段或汇总的选择有任务依据；
- [ ] 不只用颜色、图标或 alert 表达错误；
- [ ] 成功后不再报告旧错误；
- [ ] 客户端验证没有被描述为服务端安全边界。

### 11.3 A11Y-009：dialog 与动态列表焦点恢复

- [ ] 打开 modal dialog 后焦点进入内部；
- [ ] 有明确关闭按钮，Esc 路径已测试；
- [ ] 取消后回到仍有效的调用入口；
- [ ] 恢复前检查连接、隐藏、禁用和 inert；
- [ ] 删除前计算下一项、上一项和稳定入口；
- [ ] 删除第一、中间、最后和唯一项均有记录；
- [ ] 重新渲染时使用稳定业务 ID 或保留原节点；
- [ ] 被动内容更新不会无故抢焦点；
- [ ] 删除后 `document.activeElement` 不是 `body` 或断开节点。

### 11.4 A11Y-010：图片、媒体与图表替代

- [ ] 信息图片的 `alt` 传达当前任务事实；
- [ ] 装饰图片使用空 `alt`，不是省略；
- [ ] 只有图片的操作能从替代文本得知目标；
- [ ] captions 包含对白和关键声音；
- [ ] subtitles 没有被误当同语言 captions；
- [ ] 页面文字稿可以独立阅读和搜索；
- [ ] 关键视觉由 audio description、描述版本或完整视觉说明提供；
- [ ] poster 没有被当作视频替代；
- [ ] Canvas 有名称和摘要；
- [ ] 图表精确数据始终存在于语义表格；
- [ ] 禁用脚本或不看 Canvas 仍能完成数据任务。

### 11.5 A11Y-011：缩放、触控、颜色与减少动效

- [ ] viewport 没有限制用户缩放；
- [ ] 200% 文字缩放不裁切标签、错误和按钮；
- [ ] 约 320 CSS px 内容宽度下主路径回流；
- [ ] 二维表格只在局部容器滚动；
- [ ] 焦点不被固定/粘性区域遮挡；
- [ ] 能准确说明 24 × 24 AA 边界、间距和例外；
- [ ] 44 × 44 被描述为本项目舒适目标，不冒充所有 AA 下限；
- [ ] 状态具有可见文字或其他非颜色线索；
- [ ] 强制颜色模式下仍可理解；
- [ ] reduce 模式移除非必要运动但保留最终状态；
- [ ] 关键业务不依赖 `animationend`。

### 11.6 文件、运行、预期、失败与恢复证据

提交记录至少包含：

```text
练习文件绝对或项目相对路径：
打开方式或本地 URL：
浏览器及版本：
操作系统及版本：
自动检查命令与结果：
正常路径预期与实际：
故障制造步骤：
失败证据（属性、焦点、Console、Network）：
修复内容：
复验结果：
刷新后的内存边界：
```

- [ ] 文件路径真实存在于个人练习目录；
- [ ] 运行方式可由另一位学习者复现；
- [ ] 预期结果是可观察行为，不是“看起来正常”；
- [ ] 至少保留一次错误状态及其修复证据；
- [ ] 能说明停止、取消或刷新恢复方式；
- [ ] 没有新增教材仓库依赖、素材或构建产物；
- [ ] 没有使用真实密钥、账号或个人数据。

### 11.7 人工读屏范围记录

不得只写“已用读屏测试”。至少填写：

```text
组合 A：
- OS 与精确版本：
- 浏览器与精确版本：
- 读屏软件与精确版本：
- 语音语言/详细程度：
- 查询状态结果：
- 快速更新合并情况：
- 表单失败焦点与实际听到的信息：
- dialog 初始/关闭/删除后焦点：
- 媒体与图表信息：

明确未测：
- 其他桌面浏览器 + 读屏：
- iOS VoiceOver：
- Android TalkBack：
- 其他语言与高详细程度：
```

通过标准不是“每个组合逐字相同”，而是：

- 最终状态可见、可回查；
- 关键变化在目标组合中能及时发现；
- 普通状态不持续打断；
- 焦点与任务恢复一致；
- 快速合并不会让最终状态含糊；
- 未测组合被明确列出，不写成已确认结论。

### 11.8 媒体人工验收范围

- [ ] captions 与画面/声音逐段对照，不只检查轨道菜单存在；
- [ ] 关键非语言声音进入 captions；
- [ ] 不看画面时，描述或文字说明覆盖关键视觉；
- [ ] 静音时，captions 足以理解音频内容；
- [ ] 文字稿可独立阅读；
- [ ] Network 与 MIME 成功不被当作内容质量证据；
- [ ] 没有真实媒体时，明确记录“结构已验、媒体内容未验”；
- [ ] 未测试的播放器、Safari/Firefox 和移动端组合单独列出。

### 11.9 最终完成判定

只有以下条件同时满足，才能把本课标为完成：

1. 两个完整案例结构有效且 JavaScript 无语法错误；
2. 查询、收藏、失败表单、dialog 删除、媒体替代和 Canvas 表格路径均有证据；
3. A11Y-007 至 A11Y-011 的理论、案例、错误、练习和验收都能在本课定位；
4. 至少一个明确版本的桌面读屏组合完成人工主路径，或诚实记录为未测且不声称读屏通过；
5. 放大、窄宽、减少动效和非颜色状态经过人工检查；
6. 所有状态保持内存边界，没有偷偷加入持久化或服务端能力。

## 12. 常见问题

### Q1：`role="status"` 是否等同于 `aria-live="polite"`？

它包含隐式 polite live 语义，并具有 status 角色及隐式 atomic 语义。对短状态优先使用角色，而不是只堆属性。实际通知仍取决于浏览器和辅助技术组合。

### Q2：为什么初始 status 有可见文字，却不一定在加载时朗读？

live region 的主要目的，是通知建立之后的变化。页面加载时的静态内容应能通过正常阅读顺序找到，不能依赖它主动播报。

### Q3：相同消息连续出现，怎样保证再次朗读？

首先判断是否真的产生了新业务状态。不要用反复清空、隐藏或计时器强迫语音。若用户需要确认，可让控件自身状态和可见历史提供证据；真正新的事件应使用带上下文的新状态。

### Q4：加载状态应该用 `progressbar` 还是 `status`？

已知进度范围且用户需要数值时可使用原生 `progress` 或相应 progressbar 语义；不确定时长可用可见“正在处理”和 busy 状态。不要每个百分点都发送 live 通知。

### Q5：`aria-busy` 应放在 status 上还是结果列表上？

放在正在成批更新、希望辅助技术暂缓处理其中变化的最小容器。短 status 通常在更新完成后写最终句；若 status 自己被标 busy，要确保写入和复位顺序经过目标组合验证。

### Q6：错误汇总必须用 `role="alert"` 吗？

不是。可以用 alert 通知并聚焦首字段，也可以聚焦 `tabindex="-1"` 的汇总而不叠加紧急通知。选择取决于表单长度和测试结果；不要同时制造重复通道。

### Q7：为什么不在每次 input 时运行 `reportValidity()`？

它可能反复显示浏览器提示并移动或干扰焦点。实时输入阶段可以安静更新状态，提交失败时再集中报告和恢复。具体策略应避免用户尚未完成输入就持续被判错。

### Q8：dialog 原生不是会自动恢复焦点吗？

正常情况下浏览器会处理大量焦点行为，但动态页面可能删除、隐藏或替换调用入口。必须测试入口失效路径，并提供与任务相关的回退。

### Q9：删除后总是聚焦列表标题可以吗？

它是安全回退，但不总是最佳。列表仍有相邻项目时，聚焦相邻同类操作通常更接近用户任务；标题适合列表为空或没有可靠相邻目标时。

### Q10：图片有 `figcaption`，`alt` 可以总是留空吗？

不可以一概而论。图注和 alt 的阅读位置、用途不同。判断两者是否完整重复、图片是否承担操作或关键信息，再决定简化；要检查真实阅读顺序。

### Q11：有完整文字稿，还需要 audio description 吗？

文字稿能提供替代路径，但观看同步媒体时，关键视觉仍可能需要音频描述。具体要求与媒体类型、成功准则级别和用户任务有关；不要把一份文字稿宣称为所有场景的完整替代。

### Q12：`track kind="descriptions"` 写了就能在所有浏览器听到吗？

不能。原生 UI 和辅助技术支持存在差异。应提供可发现的带描述媒体版本或页面视觉说明，并在目标组合实测。

### Q13：Canvas 内部写表格作为 fallback 就够了吗？

Canvas 子内容可作为后备语义的一部分，但可见邻近表格更容易被所有用户发现、比较和复制，也能在 Canvas 正常显示时提供精确数据。本课使用始终可见表格。

### Q14：400% 缩放时表格出现横向滚动算失败吗？

二维表格可能属于确需二维布局的例外。关键是把横向滚动限制在有明确名称的表格区域，页面其他阅读与操作不应整体横向滚动。

### Q15：所有按钮都必须至少 44 × 44 CSS px 吗？

本课把约 44px 作为舒适工程目标，但 WCAG 2.2 AA 最低目标尺寸准则是 24 × 24 CSS px 或满足规定间距，并有例外。不能把设计系统目标和规范级别混为一谈。

### Q16：`prefers-reduced-motion` 能在 DevTools 模拟就算完成吗？

模拟适合快速检查 CSS 分支，不替代操作系统真实设置、浏览器组合和完整任务测试。尤其要检查业务是否错误依赖动画结束事件。

### Q17：自动扫描没有问题，为什么还要读屏？

扫描器不能判断通知是否过早、重复、被打断，也不能评价焦点恢复是否符合用户任务。它也不能验证字幕内容、音频描述和真实缩放操作。

### Q18：只测 VoiceOver + Safari，可以写“读屏兼容”吗？

不能。只能写该精确组合的结果，并列出 NVDA、JAWS、TalkBack、其他浏览器等未测范围。不同浏览器与读屏组合是不同集成面。

### Q19：为什么不把收藏状态保存到 `localStorage`？

持久化会引入用户隔离、键版本、过期、跨标签页同步、隐私和服务端一致性。本课只验证动态状态与焦点；真实收藏应按统一 HTTP 契约和身份模型实现。

### Q20：ARIA 能防止未授权用户删除商品吗？

不能。ARIA 只影响可访问语义。用户可以修改 DOM；授权必须由服务端根据会话、所有者和业务规则检查。

## 13. 扩展阅读

资料核验日期：**2026-10-10**。ARIA、WCAG、HTML 和浏览器实现会继续演进；生产结论应结合目标版本、辅助技术矩阵和真实人工测试重新核对。

### 动态状态与焦点

- [WAI-ARIA 1.2：Live Region Attributes](https://www.w3.org/TR/wai-aria-1.2/#attrs_liveregions)：核对 `aria-live`、`aria-atomic`、`aria-relevant` 与 `aria-busy` 的规范语义。
- [WAI-ARIA 1.2：`status` role](https://www.w3.org/TR/wai-aria-1.2/#status)：核对隐式 polite/atomic 语义与适用范围。
- [WAI-ARIA 1.2：`alert` role](https://www.w3.org/TR/wai-aria-1.2/#alert)：核对 assertive 通知与警报边界。
- [W3C WCAG 2.2：Status Messages 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)：理解“不移动焦点也能由辅助技术获得状态”的目标。
- [W3C WAI-ARIA APG：Alert Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/)：查看 alert 不应影响焦点的模式说明。
- [W3C WAI-ARIA APG：Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)：核对初始焦点、关闭入口、焦点范围和恢复原则。
- [WHATWG HTML：The `dialog` element](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element)：核对 `showModal()`、关闭请求、返回值和焦点步骤。
- [W3C WCAG 2.2：Focus Order 2.4.3](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)：核对焦点顺序与操作含义。
- [W3C WCAG 2.2：Focus Not Obscured (Minimum) 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)：检查聚焦元素不被作者内容完全遮挡。
- [W3C WCAG 2.2：Error Identification 3.3.1](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)：核对错误的文字识别。
- [W3C WCAG 2.2：Labels or Instructions 3.3.2](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)：核对输入标签和说明。
- [MDN：ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)：查看常见浏览器/辅助技术注意点和示例，不能把示例当跨组合保证。

### 图片、媒体与图表替代

- [WHATWG HTML：Requirements for providing text to act as an alternative for images](https://html.spec.whatwg.org/multipage/images.html#alt)：核对信息图、装饰图和功能图片的 `alt` 要求。
- [W3C WAI：Images Tutorial](https://www.w3.org/WAI/tutorials/images/)：按图片用途选择短替代、空替代和复杂图片说明。
- [WHATWG HTML：The `track` element](https://html.spec.whatwg.org/multipage/media.html#the-track-element)：核对字幕、描述、章节轨道和属性。
- [W3C WebVTT](https://www.w3.org/TR/webvtt1/)：核对 WebVTT 文件、cue 和处理模型。
- [W3C WCAG 2.2：Captions (Prerecorded) 1.2.2](https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html)：核对预录同步媒体 captions 的目的。
- [W3C WCAG 2.2：Audio Description or Media Alternative (Prerecorded) 1.2.3](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html)：理解视觉信息替代的边界。
- [W3C WCAG 2.2：Audio Description (Prerecorded) 1.2.5](https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html)：核对音频描述要求。
- [WHATWG HTML：The `canvas` element](https://html.spec.whatwg.org/multipage/canvas.html#the-canvas-element)：核对位图、后备内容和可访问性要求。
- [W3C WAI：Complex Images Tutorial](https://www.w3.org/WAI/tutorials/images/complex/)：查看图表短描述、长描述和数据表策略。

### 缩放、目标、颜色与动效

- [W3C WCAG 2.2：Resize Text 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)：核对 200% 文字放大的信息与功能要求。
- [W3C WCAG 2.2：Reflow 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)：核对 320 CSS px/256 CSS px 等效视口与二维内容例外。
- [W3C WCAG 2.2：Use of Color 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)：核对颜色不能是唯一视觉信息渠道。
- [W3C WCAG 2.2：Target Size (Minimum) 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)：核对 24 × 24 CSS px、间距算法和例外。
- [W3C WCAG 2.2：Target Size (Enhanced) 2.5.5](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html)：核对 44 × 44 CSS px 增强级目标。
- [W3C WCAG 2.2：Animation from Interactions 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)：理解由交互触发的非必要运动应可禁用。
- [MDN：`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)：查看 CSS 媒体特性、系统设置映射与示例。

### 项目与测试边界

- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对整数分、收藏接口、会话、授权和当前 HTML 阶段边界。
- [W3C WAI：Easy Checks](https://www.w3.org/WAI/test-evaluate/preliminary/)：建立键盘、标题、图片、放大等初步人工检查，但不把初查当完整评估。
- [ARIA-AT](https://aria-at.w3.org/)：了解辅助技术互操作测试如何按特定断言和组合记录结果；本课仍需测试自己的页面和目标矩阵。

阅读时重点核对：

1. 通知优先级是否被误写成精确时序保证；
2. 错误通知与焦点恢复是否重复争抢；
3. 动态删除是否覆盖入口失效路径；
4. 媒体文件存在与替代内容质量是否被混为一谈；
5. Canvas 名称与完整数据替代是否被混为一谈；
6. 24px 合规边界与 44px 工程目标是否被混为一谈；
7. 自动扫描、单一读屏组合与完整兼容结论是否被混为一谈。

## 我现在能做到什么

我能把查询、收藏、错误和删除等动态变化转换成可见、克制且可恢复的状态：普通结果用 polite status，阻断失败谨慎使用 alert，批量更新用 busy 管理中间状态，并接受快速通知可能合并的现实。我能在表单失败、dialog 关闭和动态列表删除后选择与任务一致的唯一焦点路径。

我还能为图片、字幕、文字稿、音频描述和 Canvas 图表建立等价信息，在 200% 文字缩放、窄宽回流、触控、非颜色和减少动效条件下验证主路径，并用精确的浏览器 + 读屏组合记录人工范围，而不是把自动扫描或一次成功写成普遍兼容。

## 单元导航

- [上一课：可访问名称、地标与键盘](01-accessible-name-landmarks-keyboard.md)
- [返回第七章入口](../07-accessibility-seo.md)
- [下一课：元信息、SEO 与结构化数据](03-metadata-seo-structured-data.md)
- [返回 HTML 模块](../README.md)
