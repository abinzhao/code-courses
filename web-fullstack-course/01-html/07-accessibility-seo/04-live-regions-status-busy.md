# 动态通知与忙碌状态：公布变化而不打断任务

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 使用 status、alert、live region、atomic、relevant 和 busy 公布动态结果。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `A11Y-007` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

使用 status、alert、live region、atomic、relevant 和 busy 公布动态结果。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 A11Y-007（status、alert、live region、aria-busy）；
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
业务状态变化
  → 更新可见文字和语义状态
  → 选择是否需要通知
  → 仅在恢复任务时移动焦点
  → 保留可操作的下一步
  → 在目标浏览器与辅助技术组合中人工复验
```

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

本章的完整项目代码集中在 [表单、对话框与列表焦点：失败后回到正确位置](05-form-dialog-list-focus-recovery.md)，避免复制整份应用。本课只完成以下增量：

- 在项目中实现并标出与 A11Y-007（status、alert、live region、aria-busy） 对应的元素、属性或状态；
- 记录接入前预测和接入后证据；
- 保持其他课程已经建立的语义、键盘路径与数据契约；
- 完成本课验收后，再进入完整项目汇总课：[`05-form-dialog-list-focus-recovery.md`](05-form-dialog-list-focus-recovery.md)。

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

### 10.2 故障练习：快速通知与 busy 泄漏

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

### Q19：为什么不把收藏状态保存到 `localStorage`？

持久化会引入用户隔离、键版本、过期、跨标签页同步、隐私和服务端一致性。本课只验证动态状态与焦点；真实收藏应按统一 HTTP 契约和身份模型实现。

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

- 能解释并验证：使用 status、alert、live region、atomic、relevant 和 busy 公布动态结果。
- `A11Y-007`：status、alert、live region、aria-busy
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：键盘、焦点与 ARIA：完成可预测的操作路径](03-keyboard-focus-skip-links-aria.md) · [下一课：表单、对话框与列表焦点：失败后回到正确位置](05-form-dialog-list-focus-recovery.md) · [返回 HTML 模块](../README.md)
