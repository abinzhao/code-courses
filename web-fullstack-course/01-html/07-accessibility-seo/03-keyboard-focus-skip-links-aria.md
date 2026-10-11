# 键盘、焦点与 ARIA：完成可预测的操作路径

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 保持语义键盘行为、DOM 焦点顺序、可见焦点和跳过链接，并遵守 ARIA 第一规则。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `A11Y-004`、`A11Y-005`、`A11Y-006` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

保持语义键盘行为、DOM 焦点顺序、可见焦点和跳过链接，并遵守 ARIA 第一规则。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 A11Y-004（键盘激活、焦点顺序、焦点可见）、A11Y-005（跳过导航与 tabindex 边界）、A11Y-006（ARIA 优先级与误用）；
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
正确的 HTML 元素
  → 浏览器推导角色、名称、描述和状态
  → 形成可访问树
  → 地标与标题提供分区
  → 原生控件提供键盘行为
  → DOM 顺序形成可预测的焦点顺序
  → 可见焦点和跳过链接帮助用户保持位置
```

### 3.2 预备材料 2

```text
编辑器：保存 UTF-8 Markdown 与个人练习 HTML
浏览器：一个带 Elements 和 Accessibility 面板的现代 Chromium
键盘：Tab、Shift+Tab、Enter、Space、Esc
可选：Firefox Accessibility Inspector，用于第二份浏览器证据
可选：团队明确支持的屏幕阅读器与浏览器组合
```

## 4. 核心理论

### 4.1 链接和按钮的键盘激活不是同一职责

| 控件 | 目的 | 常见原生键盘激活 | 结果 |
| --- | --- | --- | --- |
| `<a href>` | 导航到 URL 或片段 | Enter | 地址、历史或片段位置变化 |
| `<button type="button">` | 执行页面动作 | Enter、Space | 触发 click，由脚本改变状态 |
| `<button type="submit">` | 提交表单 | Enter、Space；表单还可能隐式提交 | 触发 submit 流程 |

事件的精确触发时机可能随控件、浏览器和输入方式不同。业务代码应监听原生 `click` 或表单 `submit`，不要分别手工猜测每个 keydown：

```js
const favoriteButton = document.querySelector("#favorite-bike");

favoriteButton.addEventListener("click", () => {
  const next = favoriteButton.getAttribute("aria-pressed") !== "true";
  favoriteButton.setAttribute("aria-pressed", String(next));
});
```

如果用 `div role="button"`，角色只改变语义暴露，不会自动增加：

- `tabindex="0"`；
- Enter 激活；
- Space 激活及滚动抑制；
- disabled 处理；
- 表单行为；
- 平台原生点击合成；
- 高对比模式和用户样式下的原生可识别性。

因此，修复伪按钮的首选方案不是继续补事件，而是替换成 `<button>`。

### 4.2 焦点顺序首先来自 DOM 顺序

顺序焦点导航通常按以下原则形成：

1. 正数 `tabindex` 节点先按数值从小到大；
2. 相同数值再按 DOM 顺序；
3. 原生可聚焦元素和 `tabindex="0"` 节点按 DOM 顺序；
4. `tabindex="-1"` 不参与普通 Tab 顺序，但可由 `.focus()` 或某些导航机制聚焦；
5. disabled、hidden 或不呈现节点通常不参与顺序焦点导航。

第 1 条正是应避免正数 `tabindex` 的原因。它建立一套脱离 DOM 的第二顺序：

```html
<!-- 错误案例 -->
<button tabindex="3">筛选</button>
<a href="#results" tabindex="1">查看结果</a>
<input tabindex="2" aria-label="关键词">
```

新增一个控件、复用一个组件、切换响应式布局，都可能让数值顺序失效。正确修复是调整 DOM：

```html
<label for="q">关键词</label>
<input id="q" name="q">
<button type="submit">筛选</button>
<a href="#results">查看结果</a>
```

CSS Grid/Flexbox 的 `order`、网格定位或绝对定位只改变视觉位置，不会可靠改变：

- DOM 阅读顺序；
- 屏幕阅读器浏览顺序；
- Tab 顺序；
- 复制文本顺序。

移动端和桌面端如果需要完全不同的任务顺序，应先重新审视信息架构，而不是只用 CSS 把同一 DOM 排成相反顺序。

### 4.3 `:focus-visible` 让键盘位置可见

浏览器的默认轮廓是安全基线。最危险的写法：

```css
/* 错误案例 */
*:focus {
  outline: none;
}
```

正确做法是保留默认样式，或提供足够清楚的替代：

```css
:focus-visible {
  outline: 3px solid #7c3aed;
  outline-offset: 3px;
}
```

`:focus-visible` 让浏览器根据输入方式和控件类型决定何时强调焦点。不要把它理解成“鼠标永远不显示焦点”的绝对承诺；算法和用户设置由浏览器决定。

焦点样式还要检查：

- 与相邻颜色有明显区分；
- 不被 `overflow: hidden` 裁掉；
- 不被 sticky header、cookie banner 或 dialog 遮住；
- 200% 放大和窄屏下仍看得见；
- 高对比/强制颜色模式下不只依赖背景色；
- 不只用轻微阴影或颜色变化表达。

可增加双层指示，但不要删除轮廓后只留不稳定阴影：

```css
:focus-visible {
  outline: 3px solid CanvasText;
  outline-offset: 3px;
  box-shadow: 0 0 0 6px Canvas;
}
```

系统颜色有助于强制颜色模式，但最终仍需在目标环境人工检查。

### 4.4 跳过链接、片段滚动和焦点是三个相关结果

长页面顶部常有品牌和导航。键盘用户每次都 Tab 过全部链接会付出重复成本。skip link 是页面最早的可聚焦链接：

```html
<a class="skip-link" href="#main-content">跳到主要内容</a>

<header>...</header>

<main id="main-content" tabindex="-1">
  <h1>邻里集市商品</h1>
  ...
</main>
```

样式让它平时移出视口、获得键盘焦点时出现：

```css
.skip-link {
  position: fixed;
  inset: 0 auto auto 0;
  transform: translateY(-150%);
  padding: 0.75rem 1rem;
  background: Canvas;
  color: CanvasText;
  z-index: 1000;
}

.skip-link:focus-visible {
  transform: translateY(0);
}
```

激活片段链接可能涉及：

1. URL 的 fragment 变为 `#main-content`；
2. 浏览器把目标滚动到视口；
3. 焦点是否移动到目标，受目标可聚焦性、浏览器和导航路径影响。

`tabindex="-1"` 让 main 成为可聚焦目标，但不把 main 插入日常 Tab 顺序。这比给 main 写 `tabindex="0"` 更合适：用户通过 skip link 进入后，下一次 Tab 应到主要内容中的第一个交互控件，而不是让每次自然导航都停在 main 容器。

检查时不能只看页面是否滚动。激活后在 Console 观察：

```js
document.activeElement
```

并确认它是 main 或主要内容中预期目标。不同浏览器、直接输入 fragment、脚本修改 `location.hash` 和点击链接可能存在差异；项目必须在目标组合实测。若产品需要脚本增强，仍应保留真实 `href`，并只补足焦点，不要把链接改成无 URL 的按钮。

### 4.5 `tabindex` 的三个常见取值

| 值 | 含义 | 合理用途 | 主要风险 |
| --- | --- | --- | --- |
| `0` | 加入自然顺序，位置按 DOM | 没有原生替代的复合控件入口；自定义组件内部策略 | 把普通文本和容器塞进 Tab 顺序 |
| `-1` | 可程序化聚焦，不进普通 Tab 顺序 | skip target、错误汇总、动态标题、焦点恢复目标 | 获得焦点后没有可见样式或无后续路径 |
| 正数 | 建立高优先级自定义顺序 | 几乎不应使用 | 形成脆弱第二顺序，组件间冲突 |

不要给每个标题、段落和卡片写 `tabindex="0"`。键盘用户用 Tab 寻找的是交互入口；静态内容由阅读/浏览命令处理。把所有内容都加入 Tab 顺序会让页面比鼠标路径更慢。

不要用 `tabindex="-1"` 让本应可操作的控件从键盘路径消失：

```html
<!-- 错误案例：键盘用户无法顺序到达主要动作 -->
<button type="button" tabindex="-1">发布商品</button>
```

`tabindex` 也不是 disabled。需要禁用原生控件时使用 `disabled`，并说明何时恢复。

### 4.6 ARIA 第一规则与边界

ARIA 的第一规则可以转述为：

> 如果已经存在满足语义和行为需求的原生 HTML 元素或属性，应使用原生方案，而不是给通用元素添加角色、状态和脚本重新实现。

优先级：

```text
正确原生元素
  → 正确可见文字与原生属性
  → 必要时用 aria-labelledby / aria-describedby 建立关系
  → 只有原生语义不足时才增加 ARIA 角色或状态
  → 在目标浏览器与辅助技术组合中验证
```

ARIA 能做：

- 补充或覆盖可访问名称；
- 关联描述；
- 表达原生 HTML 缺少的角色、状态和关系；
- 为复杂组件建立辅助技术可理解的语义。

ARIA 不能做：

- 自动让 `div` 可聚焦；
- 自动实现 Enter、Space、方向键或 Esc；
- 自动阻止点击；
- 自动创建表单提交、URL、历史或校验；
- 自动管理焦点；
- 自动提供可见标签和状态；
- 自动修复错误 DOM 顺序；
- 自动保证屏幕阅读器朗读某个固定句子；
- 提供身份认证、授权、数据校验或持久化。

第二条实用规则是“没有 ARIA 胜过错误 ARIA”。例如：

```html
<!-- 原本正确 -->
<button type="button">收藏</button>

<!-- 错误增强：角色和名称都变得冲突 -->
<button type="button" role="link" aria-label="删除">收藏</button>
```

常见边界：

- 不给原生元素添加与其语义冲突的 role；
- 不在角色不允许命名时强行添加名称；
- 不让 `aria-hidden="true"` 的节点本身或后代继续可聚焦；
- 不使用 ARIA 隐藏可见业务错误；
- 动态状态必须与真实状态同步；
- ARIA 引用 ID 必须唯一且存在；
- 自定义复合组件必须实现对应键盘模式，而不只复制 APG 示例外观；
- WAI-ARIA Authoring Practices 是设计和示例指导，不替代规范、用户测试和项目需求。

### 4.7 检查结果必须写明证据边界

一份诚实记录可以写：

```text
已验证：
- Chromium Accessibility 树中的 landmark、heading、button、link 角色；
- 搜索框名称来自 label；
- 收藏按钮名称来自可见文本，pressed 状态随操作变化；
- Tab/Shift+Tab 顺序与 DOM 顺序一致；
- Enter 提交搜索，Space/Enter 激活收藏按钮；
- skip link 获得焦点时可见，激活后主要内容成为焦点目标。

未验证：
- Safari + VoiceOver；
- Firefox + NVDA；
- Android TalkBack；
- iOS VoiceOver；
- 语音控制；
- 浏览器扩展、高对比主题和企业策略造成的差异。

不作承诺：
- 任一屏幕阅读器的精确朗读词序；
- 自动扫描通过即满足完整 WCAG；
- 静态 HTML 能提供身份、权限或持久化。
```

这比写“已完全支持所有读屏软件”更可复验。

## 5. 元素、属性、API 或配置清单

本课的检索入口如下。具体语法、默认行为和边界以第 4 节及覆盖矩阵为准。

- `A11Y-004`：键盘激活、焦点顺序、焦点可见
- `A11Y-005`：跳过导航与 tabindex 边界
- `A11Y-006`：ARIA 优先级与误用

## 6. 最小可运行案例

### 6.1 案例目标

先建立一个不依赖框架的观察页，验证：

- 地标和标题在 Accessibility 树中可见；
- 搜索框名称来自 `<label>`；
- 帮助文字作为 description，不覆盖名称；
- 链接与按钮使用各自原生角色；
- skip link 的片段目标可聚焦；
- 焦点样式清楚；
- 搜索和收藏可用键盘激活；
- 页面不承诺动态结果朗读；动态通知留到下一课。

### 6.2 文件位置

在你的个人学习工作区创建：

```text
market-learning/
└── practice/
    └── html-chapter-07/
        └── minimal.html
```

教材仓库不会自动生成该练习文件。

### 6.3 完整文件：名称与键盘观察页

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>可访问名称与键盘观察页</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      max-width: 56rem;
      margin: 0 auto;
      padding: 0 1rem 3rem;
      color: #172033;
      background: #fffdf8;
      font: 1rem/1.6 system-ui, sans-serif;
    }

    header,
    main,
    footer {
      padding-block: 1rem;
    }

    nav ul {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 0;
      list-style: none;
    }

    label {
      display: block;
      margin-block-end: 0.25rem;
      font-weight: 700;
    }

    input,
    button {
      min-height: 2.75rem;
      padding: 0.5rem 0.75rem;
      font: inherit;
    }

    article {
      margin-block: 1rem;
      padding: 1rem;
      border: 1px solid #8b95a7;
      border-radius: 0.5rem;
    }

    :focus-visible {
      outline: 3px solid #6d28d9;
      outline-offset: 3px;
    }

    .skip-link {
      position: fixed;
      inset: 0 auto auto 0;
      z-index: 1000;
      padding: 0.75rem 1rem;
      color: CanvasText;
      background: Canvas;
      transform: translateY(-150%);
    }

    .skip-link:focus-visible {
      transform: translateY(0);
    }

    .help {
      color: #3f4b5f;
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">跳到主要内容</a>

  <header>
    <p><a href="#home">邻里集市</a></p>
    <nav aria-label="主要">
      <ul>
        <li><a href="#search-title">搜索</a></li>
        <li><a href="#results-title">商品</a></li>
      </ul>
    </nav>
  </header>

  <main id="main-content" tabindex="-1">
    <h1 id="home">名称与键盘观察页</h1>

    <section aria-labelledby="search-title">
      <h2 id="search-title">搜索商品</h2>
      <form id="search-form">
        <label for="query">商品关键词</label>
        <p class="help" id="query-help">
          输入“自行车”并提交；本页只更新可见文字，不发送网络请求。
        </p>
        <input
          id="query"
          name="q"
          type="search"
          aria-describedby="query-help"
        >
        <button type="submit">搜索</button>
      </form>
      <p id="search-result">尚未搜索。</p>
    </section>

    <section aria-labelledby="results-title">
      <h2 id="results-title">商品</h2>
      <article aria-labelledby="bike-title">
        <h3 id="bike-title">
          <a href="#bike-description">二手自行车</a>
        </h3>
        <p id="bike-description">适合通勤，页面展示价 280.00 元。</p>
        <p id="favorite-state">当前：未收藏</p>
        <button
          id="favorite-bike"
          type="button"
          aria-pressed="false"
          aria-describedby="favorite-state"
        >
          收藏二手自行车
        </button>
      </article>
    </section>
  </main>

  <footer>
    <p>教学页面：搜索和收藏只保存在当前标签页。</p>
  </footer>

  <script>
    const searchForm = document.querySelector("#search-form");
    const queryInput = document.querySelector("#query");
    const searchResult = document.querySelector("#search-result");
    const favoriteButton = document.querySelector("#favorite-bike");
    const favoriteState = document.querySelector("#favorite-state");

    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = queryInput.value.trim();
      searchResult.textContent = query
        ? `当前可见查询：${query}`
        : "当前可见查询为空。";
    });

    favoriteButton.addEventListener("click", () => {
      const nextPressed =
        favoriteButton.getAttribute("aria-pressed") !== "true";

      favoriteButton.setAttribute("aria-pressed", String(nextPressed));
      favoriteState.textContent = nextPressed
        ? "当前：已收藏"
        : "当前：未收藏";
    });
  </script>
</body>
</html>
```

### 6.4 打开方式

在终端进入练习目录：

```bash
cd market-learning/practice/html-chapter-07
python3 -m http.server 4173
```

浏览器打开：

```text
http://localhost:4173/minimal.html
```

结束时回到终端按 `Ctrl+C`。页面不需要 npm、构建工具或第三方依赖。

如果 4173 端口已被占用，终端会出现地址占用错误。改用：

```bash
python3 -m http.server 4174
```

并打开 `http://localhost:4174/minimal.html`。不要在原服务器未启动时把浏览器的连接失败误判成 HTML 错误。

### 6.5 可见结果与键盘路径

刷新页面，先不要点击鼠标：

1. 按一次 Tab，skip link 应在左上角出现；
2. 按 Enter，URL 片段变为 `#main-content`，主要内容成为片段目标；
3. 继续按 Tab，焦点依次进入主要内容中的链接、搜索框、搜索按钮、商品链接和收藏按钮；
4. 在搜索框输入“自行车”，按 Enter 提交；
5. 页面显示“当前可见查询：自行车”，Network 不应出现业务 API 请求；
6. 到达收藏按钮后按 Space；
7. 可见状态变为“当前：已收藏”，按钮的 `aria-pressed` 变为 `true`；
8. 再按 Enter，状态恢复“当前：未收藏”；
9. 使用 Shift+Tab 反向经过同一组控件；
10. 每个焦点位置都有清楚轮廓。

浏览器或操作系统可能有“Tab 是否遍历所有网页控件”的设置。若 Tab 跳过链接，先检查平台键盘导航设置，再判断页面代码。

### 6.6 Accessibility 树检查

按下表逐项取证，不记录猜测的朗读句子：

| 选中节点 | 预期 role | 预期 name | 其他证据 |
| --- | --- | --- | --- |
| 页面级 `header` | banner（常见映射） | 通常无名称 | 位于 body 级上下文 |
| `nav` | navigation | 主要 | 名称来自 `aria-label` |
| `main` | main | 取决于映射，不要求额外名称 | `tabindex="-1"` |
| 搜索框 | searchbox | 商品关键词 | name 来自 `<label>` |
| 搜索框 | searchbox | 商品关键词 | description 来自 `#query-help` |
| 商品链接 | link | 二手自行车 | 有 `href` |
| 收藏按钮 | button | 收藏二手自行车 | pressed false/true |
| 页面级 `footer` | contentinfo（常见映射） | 通常无名称 | 位于 body 级上下文 |

如果工具显示不同：

1. 先确认选中了正确节点；
2. 展开 Name/Description 来源；
3. 检查 `for`、`id` 和 ARIA IDREF 拼写；
4. 检查是否有另一个高优先级名称源覆盖；
5. 保存并硬刷新；
6. 记录浏览器版本和平台；
7. 在第二个浏览器复核映射差异；
8. 不把工具显示差异直接写成“用户一定听不到”。

在 Console 观察焦点：

```js
document.activeElement
```

预期返回当前获得焦点的元素。激活 skip link 后，应检查目标浏览器中是 `main#main-content` 还是另一个合理目标；若只是滚动而焦点未进入目标，记录为目标组合的失败证据，再按 8.5 节排查。

### 6.7 失败证据

| 现象 | 优先证据 | 常见原因 |
| --- | --- | --- |
| 页面无法打开 | 终端服务器输出、浏览器地址 | 目录或端口错误 |
| 第一 Tab 看不到 skip link | Elements 样式、焦点、裁切 | CSS 选择器错误或被容器裁切 |
| 搜索框没有名称 | Accessibility Name 来源 | `for` 与 `id` 不匹配 |
| 搜索框名称变成长帮助 | Name/Description 来源 | 误用 `aria-labelledby` 代替 `aria-describedby` |
| Space 不能收藏 | 当前焦点、节点标签、Console | 控件不是原生 button 或脚本报错 |
| 状态文字变了，pressed 没变 | Elements 属性 | 脚本只更新可见文字 |
| pressed 变了，文字没变 | Elements 与页面对照 | 脚本只更新 ARIA |
| 焦点轮廓不可见 | Computed styles、截图 | 删除 outline、颜色不足或被裁切 |
| 出现收藏请求 | Network | 案例被误接到真实接口 |

### 6.8 渐进扩展：把片段目标也变成明显证据

在现有 `<style>` 末尾增加：

```css
main:target {
  scroll-margin-block-start: 1rem;
}

main:target::before {
  content: "已跳到主要内容";
  display: block;
  margin-block-end: 0.75rem;
  color: #4c1d95;
  font-weight: 700;
}
```

这段 CSS 只增加视觉上的片段目标提示：

- `:target` 来自 URL fragment；
- 它不等于 `:focus`；
- 伪元素文字不应成为唯一业务信息；
- Accessibility 树是否暴露生成内容存在实现差异，不能用它提供控件名称；
- 关闭 CSS 后，真实 skip link 和主要内容仍然存在。

重新激活 skip link，预期 URL、滚动、焦点和视觉目标都可分别观察。把四项写成四列，避免用“跳转成功”掩盖其中一项失败。

## 7. 邻里集市集成案例

### 7.1 案例范围与可观察契约

现在把最小案例扩展成可搜索商品页：

- 页面级 banner、main、contentinfo；
- “主要”和“商品分类”两个可区分 navigation 地标；
- 一个命名的 search 地标；
- h1、h2、h3 形成标题层级；
- 搜索框、分类 select 和两个原生按钮；
- 三张固定商品卡片；
- 每张卡片有唯一详情链接和收藏切换按钮；
- 收藏名称包含商品标题；
- `aria-pressed` 与可见状态同步；
- 筛选只设置 `hidden`，不重排 DOM；
- 价格在 `data.value` 中保留整数分；
- skip link、可见焦点和自然 Tab 顺序；
- 刷新恢复初始筛选和收藏。

本案例不会：

- 保存真实收藏；
- 查询服务器；
- 证明当前用户身份；
- 创建预约；
- 处理多用户并发；
- 让搜索引擎索引教学数据；
- 自动保证动态结果被屏幕阅读器通知。

动态结果通知、搜索后焦点策略和失败表单焦点属于下一课。

### 7.2 文件位置

创建：

```text
market-learning/
└── practice/
    └── html-chapter-07/
        ├── minimal.html
        └── index.html
```

### 7.3 完整文件：键盘可达的商品查询页

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>查找商品｜邻里集市教学页</title>
  <style>
    * {
      box-sizing: border-box;
    }

    html {
      color-scheme: light;
    }

    body {
      margin: 0;
      color: #172033;
      background: #f8f6f1;
      font: 1rem/1.6 system-ui, sans-serif;
    }

    a {
      color: #4c1d95;
    }

    a:hover {
      text-decoration-thickness: 0.16em;
    }

    :focus-visible {
      outline: 3px solid #6d28d9;
      outline-offset: 3px;
    }

    .skip-link {
      position: fixed;
      inset: 0 auto auto 0;
      z-index: 1000;
      padding: 0.75rem 1rem;
      color: CanvasText;
      background: Canvas;
      transform: translateY(-150%);
    }

    .skip-link:focus-visible {
      transform: translateY(0);
    }

    .site-header,
    .page-shell,
    .site-footer {
      width: min(72rem, calc(100% - 2rem));
      margin-inline: auto;
    }

    .site-header {
      padding-block: 1rem;
      border-block-end: 1px solid #aeb6c4;
    }

    .brand {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
    }

    nav ul {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem 1.25rem;
      padding: 0;
      list-style: none;
    }

    .page-shell {
      display: grid;
      grid-template-columns: minmax(10rem, 16rem) minmax(0, 1fr);
      gap: 2rem;
      padding-block: 2rem;
    }

    .page-shell > h1,
    .page-shell > .page-intro {
      grid-column: 1 / -1;
      margin-block: 0;
    }

    .category-nav {
      align-self: start;
      padding: 1rem;
      background: #fff;
      border: 1px solid #aeb6c4;
      border-radius: 0.75rem;
    }

    .category-nav ul {
      display: grid;
    }

    .content-column {
      min-width: 0;
    }

    search,
    .results {
      display: block;
      margin-block: 1.5rem;
      padding: 1.25rem;
      background: #fff;
      border: 1px solid #aeb6c4;
      border-radius: 0.75rem;
    }

    .filter-grid {
      display: grid;
      grid-template-columns: minmax(12rem, 1fr) minmax(10rem, 14rem);
      gap: 1rem;
      align-items: end;
    }

    label {
      display: block;
      margin-block-end: 0.25rem;
      font-weight: 750;
    }

    input,
    select,
    button {
      min-height: 2.75rem;
      padding: 0.55rem 0.75rem;
      color: inherit;
      background: #fff;
      border: 1px solid #596579;
      border-radius: 0.4rem;
      font: inherit;
    }

    input,
    select {
      width: 100%;
    }

    button {
      cursor: pointer;
      font-weight: 750;
    }

    button[aria-pressed="true"] {
      color: #fff;
      background: #4c1d95;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-block-start: 1rem;
    }

    .help,
    .teaching-boundary {
      color: #3f4b5f;
    }

    .listing-list {
      display: grid;
      gap: 1rem;
      padding: 0;
      list-style: none;
    }

    .listing {
      padding: 1rem;
      border: 1px solid #8b95a7;
      border-radius: 0.6rem;
    }

    .listing h3 {
      margin-block-start: 0;
    }

    .listing-state {
      font-weight: 750;
    }

    [hidden] {
      display: none;
    }

    .site-footer {
      padding-block: 1.5rem 3rem;
      border-block-start: 1px solid #aeb6c4;
    }

    @media (max-width: 44rem) {
      .page-shell,
      .filter-grid {
        grid-template-columns: 1fr;
      }

      .category-nav {
        order: 0;
      }
    }
  </style>
</head>
<body>
  <a class="skip-link" href="#main-content">跳到主要内容</a>

  <header class="site-header">
    <p class="brand">
      <a href="#page-title">邻里集市</a>
    </p>
    <nav aria-label="主要">
      <ul>
        <li><a href="#filters-title">筛选商品</a></li>
        <li><a href="#results-title">浏览结果</a></li>
        <li><a href="#quality-note">教学边界</a></li>
      </ul>
    </nav>
  </header>

  <main id="main-content" class="page-shell" tabindex="-1">
    <h1 id="page-title">查找邻里商品</h1>
    <p class="page-intro">
      使用关键词和分类筛选固定教学数据；价格的机器值使用整数分。
    </p>

    <nav class="category-nav" aria-labelledby="category-nav-title">
      <h2 id="category-nav-title">商品分类</h2>
      <ul>
        <li><a href="#bike-title">出行</a></li>
        <li><a href="#desk-title">家具</a></li>
        <li><a href="#lamp-title">家居</a></li>
      </ul>
    </nav>

    <div class="content-column">
      <search aria-labelledby="filters-title">
        <h2 id="filters-title">筛选商品</h2>
        <form id="filter-form">
          <div class="filter-grid">
            <div>
              <label for="query">商品关键词</label>
              <p class="help" id="query-help">
                可输入标题或描述中的词，例如“通勤”。
              </p>
              <input
                id="query"
                name="q"
                type="search"
                autocomplete="off"
                aria-describedby="query-help"
              >
            </div>

            <div>
              <label for="category">商品分类</label>
              <select id="category" name="category">
                <option value="">全部分类</option>
                <option value="travel">出行</option>
                <option value="furniture">家具</option>
                <option value="home">家居</option>
              </select>
            </div>
          </div>

          <div class="actions">
            <button type="submit">应用筛选</button>
            <button type="reset">重置筛选</button>
          </div>
        </form>
      </search>

      <section class="results" aria-labelledby="results-title">
        <h2 id="results-title">全部商品（3）</h2>
        <p id="filter-summary">当前没有筛选条件。</p>

        <ul class="listing-list">
          <li>
            <article
              class="listing"
              data-title="二手自行车"
              data-description="蓝色 通勤 变速"
              data-category="travel"
              aria-labelledby="bike-title"
            >
              <h3 id="bike-title">
                <a href="#bike-description">二手自行车</a>
              </h3>
              <p id="bike-description">
                蓝色变速自行车，适合短途通勤。
              </p>
              <p>
                价格：
                <data value="28000">280.00 元</data>
              </p>
              <p class="listing-state" id="bike-favorite-state">
                收藏状态：未收藏
              </p>
              <button
                type="button"
                class="favorite-button"
                data-listing-id="bike-001"
                aria-pressed="false"
                aria-describedby="bike-favorite-state"
              >
                收藏二手自行车
              </button>
            </article>
          </li>

          <li>
            <article
              class="listing"
              data-title="折叠学习桌"
              data-description="木色 小户型 桌面"
              data-category="furniture"
              aria-labelledby="desk-title"
            >
              <h3 id="desk-title">
                <a href="#desk-description">折叠学习桌</a>
              </h3>
              <p id="desk-description">
                木色桌面，可折叠收纳，适合小户型。
              </p>
              <p>
                价格：
                <data value="15900">159.00 元</data>
              </p>
              <p class="listing-state" id="desk-favorite-state">
                收藏状态：未收藏
              </p>
              <button
                type="button"
                class="favorite-button"
                data-listing-id="desk-002"
                aria-pressed="false"
                aria-describedby="desk-favorite-state"
              >
                收藏折叠学习桌
              </button>
            </article>
          </li>

          <li>
            <article
              class="listing"
              data-title="阅读台灯"
              data-description="暖光 桌面 灯具"
              data-category="home"
              aria-labelledby="lamp-title"
            >
              <h3 id="lamp-title">
                <a href="#lamp-description">阅读台灯</a>
              </h3>
              <p id="lamp-description">
                暖光桌面台灯，亮度使用实体旋钮调节。
              </p>
              <p>
                价格：
                <data value="6800">68.00 元</data>
              </p>
              <p class="listing-state" id="lamp-favorite-state">
                收藏状态：未收藏
              </p>
              <button
                type="button"
                class="favorite-button"
                data-listing-id="lamp-003"
                aria-pressed="false"
                aria-describedby="lamp-favorite-state"
              >
                收藏阅读台灯
              </button>
            </article>
          </li>
        </ul>
      </section>

      <aside id="quality-note" aria-labelledby="quality-title">
        <h2 id="quality-title">教学边界</h2>
        <p class="teaching-boundary">
          筛选和收藏只存在当前标签页内存中。刷新页面会恢复三件商品和未收藏状态；
          本页没有登录、授权、数据库、支付或并发控制。
        </p>
      </aside>
    </div>
  </main>

  <footer class="site-footer">
    <p>
      <a href="#page-title">返回页首主题</a>
    </p>
  </footer>

  <script>
    const filterForm = document.querySelector("#filter-form");
    const queryInput = document.querySelector("#query");
    const categorySelect = document.querySelector("#category");
    const resultsTitle = document.querySelector("#results-title");
    const filterSummary = document.querySelector("#filter-summary");
    const listings = Array.from(document.querySelectorAll(".listing"));
    const favoriteButtons = document.querySelectorAll(".favorite-button");

    function normalized(value) {
      return value.trim().toLocaleLowerCase("zh-CN");
    }

    function applyFilters() {
      const query = normalized(queryInput.value);
      const category = categorySelect.value;
      let visibleCount = 0;

      for (const listing of listings) {
        const searchableText = normalized(
          `${listing.dataset.title} ${listing.dataset.description}`
        );
        const matchesQuery =
          query === "" || searchableText.includes(query);
        const matchesCategory =
          category === "" || listing.dataset.category === category;
        const visible = matchesQuery && matchesCategory;

        listing.closest("li").hidden = !visible;
        if (visible) {
          visibleCount += 1;
        }
      }

      resultsTitle.textContent = `筛选结果（${visibleCount}）`;

      const parts = [];
      if (query !== "") {
        parts.push(`关键词“${queryInput.value.trim()}”`);
      }
      if (category !== "") {
        const selectedText =
          categorySelect.options[categorySelect.selectedIndex].textContent;
        parts.push(`分类“${selectedText}”`);
      }

      filterSummary.textContent = parts.length === 0
        ? "当前没有筛选条件。"
        : `当前条件：${parts.join("，")}。`;
    }

    filterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      applyFilters();
    });

    filterForm.addEventListener("reset", () => {
      requestAnimationFrame(applyFilters);
    });

    for (const button of favoriteButtons) {
      button.addEventListener("click", () => {
        const nextPressed =
          button.getAttribute("aria-pressed") !== "true";
        const listing = button.closest(".listing");
        const state = listing.querySelector(".listing-state");

        button.setAttribute("aria-pressed", String(nextPressed));
        state.textContent = nextPressed
          ? "收藏状态：已收藏"
          : "收藏状态：未收藏";
      });
    }
  </script>
</body>
</html>
```

### 7.4 打开、停止与重置

若 6.4 节的服务器仍在运行，直接打开：

```text
http://localhost:4173/index.html
```

否则：

```bash
cd market-learning/practice/html-chapter-07
python3 -m http.server 4173
```

停止服务器：终端按 `Ctrl+C`。

重置教学状态：刷新页面。预期：

- 显示三件商品；
- 查询为空；
- 分类为“全部分类”；
- 三个收藏按钮均为 `aria-pressed="false"`；
- 三处可见状态均为“未收藏”；
- 不从 localStorage、Cookie 或网络恢复任何收藏。

### 7.5 键盘专用商品路径

关闭 DevTools 的元素选取模式，避免它夺取键盘。刷新后不使用鼠标：

1. **Tab → Enter**：显示并激活“跳到主要内容”；
2. 检查 URL 为 `#main-content`，焦点目标位于主要内容；
3. 使用 Shift+Tab 回到前面的导航，确认可以反向恢复；
4. Tab 到“商品关键词”，输入“通勤”；
5. Tab 到分类，使用原生 select 的平台键盘方式保持“全部分类”；
6. Tab 到“应用筛选”，按 Enter；
7. 页面只显示“二手自行车”，结果标题为“筛选结果（1）”；
8. 继续 Tab 到“二手自行车”详情链接，按 Enter；
9. URL 片段变成 `#bike-description`，页面滚到描述；
10. Shift+Tab 回到详情链接，再 Tab 到“收藏二手自行车”；
11. 按 Space，按钮 pressed 变为 true，可见状态变成“已收藏”；
12. 按 Enter，pressed 恢复 false，可见状态恢复“未收藏”；
13. Shift+Tab 回到筛选区域，激活“重置筛选”；
14. 三件商品重新出现；
15. Tab 或 Shift+Tab 到“商品分类”导航中的链接，激活其中一项；
16. 最后激活 footer 的“返回页首主题”。

每一步记录：

```text
步骤：
按键：
焦点前：
焦点后：
URL/属性变化：
可见结果：
是否出现意外滚动或焦点丢失：
```

注意：

- 原生 select 的展开和选项移动按键受平台影响，不在教材中保证同一组合；
- 点击卡片内部片段链接主要演示链接导航，不等于完整详情页；
- 搜索结果更新目前只有可见文字，没有 live region；
- 不写“屏幕阅读器一定朗读 1 个结果”；下一课将增加动态状态策略并记录目标组合差异。

### 7.6 地标、标题和名称人工清单

在完整 Accessibility Tree 中检查：

**地标：**

- banner：页面级 header；
- navigation “主要”；
- navigation “商品分类”；
- main；
- search “筛选商品”；
- complementary “教学边界”；
- contentinfo：页面级 footer。

工具可能以不同本地化词显示角色，但两个 navigation 的计算名称必须可区分。

**标题：**

```text
h1 查找邻里商品
  h2 商品分类
  h2 筛选商品
  h2 全部商品（3）/筛选结果（n）
    h3 二手自行车
    h3 折叠学习桌
    h3 阅读台灯
  h2 教学边界
```

`商品分类` 在 DOM 中位于 main 之前的侧栏，但仍是页面二级主题。小屏 CSS 没有把 DOM 反向，因此视觉、阅读和焦点顺序仍一致。

**名称和状态：**

| 控件 | 名称 | 描述 | 状态 |
| --- | --- | --- | --- |
| 查询框 | 商品关键词 | 输入提示 | 当前 value |
| 分类 select | 商品分类 | 无额外描述 | 当前选择值 |
| 应用按钮 | 应用筛选 | 无 | button |
| 重置按钮 | 重置筛选 | 无 | button |
| 第一详情链接 | 二手自行车 | 无 | link |
| 第一收藏按钮 | 收藏二手自行车 | 收藏状态可见文本 | pressed false/true |

### 7.7 渐进扩展：新增商品不重写焦点编号

复制一个 `<li>` 商品，并为它提供唯一：

- article `data-title`、`data-description`、`data-category`；
- article `aria-labelledby`；
- h3 `id`；
- 描述 `id`；
- 状态 `id`；
- 收藏按钮 `data-listing-id` 和 `aria-describedby`；
- 可见详情与收藏文字。

不要添加任何正数 `tabindex`。刷新后，新商品自然按 DOM 位置加入：

- 标题层级；
- 链接浏览；
- Tab 顺序；
- 筛选集合；
- 收藏事件绑定。

这就是自然顺序的扩展价值。若原页面使用 1–12 的正数 tabindex，新增商品至少要重编号后续控件，两个独立组件还可能产生重复数值。

### 7.8 业务边界

页面中的：

```html
<data value="28000">280.00 元</data>
```

表达课程约定的整数分机器值与用户可读显示。它不是结算价格，也不阻止用户修改 DOM。真实商品价格、收藏归属和可售状态必须来自经过认证、授权和验证的服务端。

`aria-pressed="true"` 只表达当前按钮的界面状态：

- 不是收藏 API 成功证据；
- 不是数据库记录；
- 不是跨标签页同步；
- 不是当前用户身份；
- 不是权限检查。

后续接入 API 时，应在服务端成功响应后同步界面；失败则恢复或重新获取权威状态，并用下一课的动态状态模式通知用户。

## 8. 常见错误与排查路径

### 8.1 明确错误：把 `div` 补成半成品按钮

制造故障：

```html
<div
  class="favorite"
  role="button"
  tabindex="0"
  onclick="this.classList.toggle('selected')"
>
  收藏
</div>
```

现象：

- Tab 可以到达；
- 鼠标点击可能切换 class；
- Enter/Space 不一定触发 onclick；
- 没有 pressed 状态；
- 没有原生 disabled；
- Space 可能滚动页面；
- 表单与高对比模式行为需要继续手工补齐。

修复不是继续堆 keydown：

```html
<button type="button" aria-pressed="false">收藏二手自行车</button>
```

```js
const button = document.querySelector("button[aria-pressed]");

button.addEventListener("click", () => {
  const next = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(next));
});
```

复验：

- role 来自原生 button；
- Tab 到达；
- Enter 与 Space 都触发 click；
- pressed 与真实状态同步；
- 不需要自造 keydown/keyup 组合。

只有在确实没有原生元素能表达复杂复合控件时，才根据对应模式完整实现角色、属性、焦点和键盘交互。

### 8.2 明确错误：用正数 tabindex 修补布局

制造故障：

```html
<button tabindex="3">应用筛选</button>
<input tabindex="1" aria-label="商品关键词">
<select tabindex="2" aria-label="商品分类"></select>
```

诊断：

1. 在 Console 运行 `document.querySelectorAll("[tabindex]")`；
2. 检查是否存在大于 0 的值；
3. 只用 Tab 记录实际顺序；
4. 与 DOM、视觉和任务顺序对照；
5. 在按钮前插入一个新链接，观察它进入顺序的位置。

修复：

- 把 DOM 排成 label/input、label/select、button；
- 删除三个正数 tabindex；
- 保留原生控件自然焦点；
- 响应式 CSS 不反转任务顺序。

复验：新链接按 DOM 位置自然加入，不需重编号。

### 8.3 删除轮廓后焦点“消失”

错误：

```css
button:focus,
a:focus,
input:focus {
  outline: none;
}
```

排查：

- 按 Tab，观察页面是否仍有任何位置指示；
- DevTools 强制 `:focus` / `:focus-visible`；
- 检查 Computed 中 `outline-style`；
- 检查 box-shadow 是否被 overflow 裁切；
- 检查高对比模式。

修复：

```css
:focus-visible {
  outline: 3px solid #6d28d9;
  outline-offset: 3px;
}
```

复验不只看颜色：还要检查轮廓不被固定页头、容器边界和窄屏裁掉。

### 8.4 链接和按钮职责互换

错误：

```html
<a href="#" onclick="toggleFavorite()">收藏</a>
<button type="button" onclick="location.href='/listings/1'">查看详情</button>
```

证据：

- 第一项产生无意义 `#` 历史/滚动副作用；
- 第二项没有链接 URL 语义、复制地址和常见链接上下文菜单；
- Accessibility 树角色与任务相反。

修复：

```html
<button type="button">收藏二手自行车</button>
<a href="/listings/1">查看二手自行车详情</a>
```

### 8.5 skip link 只滚动，没有可靠焦点

症状：按 Enter 后视口移动，但继续 Tab 又回到页头导航。

排查：

1. 确认链接是真实 `<a href="#main-content">`；
2. 确认目标 `id="main-content"` 唯一；
3. 确认 main 有 `tabindex="-1"`；
4. 激活后检查 `location.hash`；
5. 在 Console 检查 `document.activeElement`；
6. 记录浏览器、版本、平台和键盘设置；
7. 检查是否有脚本拦截 click；
8. 检查固定页头是否只是遮住目标。

如果目标浏览器仍不移动焦点，可做保留原生链接的渐进增强：

```js
const skipLink = document.querySelector(".skip-link");
const main = document.querySelector("#main-content");

skipLink.addEventListener("click", () => {
  requestAnimationFrame(() => {
    main.focus({ preventScroll: true });
  });
});
```

这个脚本不能替代 `href`、id 和可聚焦目标。`preventScroll: true` 是为了保留原生片段滚动结果；必须在目标浏览器复验，避免脚本与默认滚动竞争。

### 8.6 CSS 视觉顺序与 DOM 顺序冲突

症状：视觉上分类在搜索后，Tab 却先进入分类；或商品视觉为 3、1、2，标题浏览仍是 1、2、3。

证据：

- Elements 查看 DOM；
- Layout/Computed 查看 `order`、grid area 和绝对定位；
- 键盘记录 Tab 顺序；
- Accessibility Tree 查看节点顺序。

修复优先级：

1. 让 DOM 符合阅读和任务顺序；
2. 让视觉布局遵循同一顺序；
3. 不使用正数 tabindex 对冲 CSS；
4. 若响应式设计要求不同，重新设计内容结构而不是简单反转。

## 9. 课后题

### 9.1 为什么 `role="button"` 没有让 div 获得完整按钮行为？

<details>
<summary>参考答案</summary>

role 主要影响语义映射，不会自动加入焦点顺序、实现 Enter/Space、disabled、表单行为或原生样式。已有 `<button>` 时应直接替换；只有复杂组件确无原生替代时，才完整实现键盘和状态模型。
</details>

### 9.2 链接和按钮怎样选择？

<details>
<summary>参考答案</summary>

导航到 URL、下载资源或片段使用带 `href` 的链接；改变当前页面状态、打开控件或提交表单使用按钮。不要按视觉外观选择，二者都可以用 CSS 调整外观。
</details>

### 9.3 `tabindex="-1"` 与 `hidden` 有何不同？

<details>
<summary>参考答案</summary>

`tabindex="-1"` 让元素退出普通 Tab 顺序，但仍可呈现、可被程序化聚焦，也可能被辅助技术浏览。`hidden` 表示内容当前不呈现，通常也不在可访问树和键盘路径中。两者不能互相替代。
</details>

### 9.4 为什么不使用 `tabindex="1"` 把搜索框放到最前？

<details>
<summary>参考答案</summary>

正数 tabindex 会建立独立于 DOM 的优先顺序，并跨组件冲突。新增控件、响应式布局和复用组件都要重编号。应把 DOM 按任务顺序排列，并使用 skip link 跳过重复导航。
</details>

### 9.5 `:target` 能证明焦点已经移动吗？

<details>
<summary>参考答案</summary>

不能。`:target` 表示 URL fragment 指向该元素，焦点由另一套机制决定。应分别检查 URL、滚动位置、`:target` 样式和 `document.activeElement`。
</details>

### 9.6 自动扫描零错误是否代表键盘路径通过？

<details>
<summary>参考答案</summary>

不代表。自动工具难以判断业务名称是否准确、焦点顺序是否符合任务、焦点是否被遮挡、交互是否能完整完成。仍需键盘实走、Accessibility 树检查和目标辅助技术人工测试。
</details>

## 10. 实践练习

### 10.1 进阶练习：扩展键盘商品路径

**文件：**

```text
market-learning/practice/html-chapter-07/index.html
market-learning/practice/html-chapter-07/evidence/keyboard-path.md
```

**任务：**

在第 7 节页面增加第四件商品“儿童滑板车”：

- 分类为出行；
- 机器价格为整数分 `9900`；
- 标题和描述 ID 唯一；
- 详情链接名称具体；
- 收藏按钮可见文字包含商品标题；
- 收藏状态可见且由 `aria-describedby` 关联；
- 不写正数 tabindex；
- 使用现有脚本自然加入筛选和收藏。

再增加一个位于结果区末尾的“返回筛选条件”片段链接。

**键盘验收：**

1. skip link 进入 main；
2. 搜索“滑板”；
3. 提交后只显示滑板车；
4. Tab 到详情链接和收藏按钮；
5. Space/Enter 切换收藏；
6. 激活“返回筛选条件”；
7. Shift+Tab 能回到合理的前一控件；
8. 全程焦点可见。

**预期：**

- 新商品无需 tabindex 编号；
- 标题层级仍为 h3；
- 结果计数变为 4 或筛选后的正确数量；
- 刷新恢复未收藏；
- Network 没有收藏 API；
- `data value="9900"`，显示 `99.00 元`。

**答案标准：**

代码、实际按键表、Accessibility 名称/状态截图或文字记录三者一致。不能只提交视觉截图。

### 10.2 故障注入：伪按钮、正数 tabindex 与消失焦点

**文件：**

```text
market-learning/practice/html-chapter-07/fault-keyboard.html
market-learning/practice/html-chapter-07/evidence/fault-keyboard.md
```

**注入：**

1. 把一个收藏 button 改成带 onclick 的 div；
2. 给筛选区三个控件写 1、2、3 的正数 tabindex；
3. 添加 `*:focus { outline: none; }`；
4. 用 CSS `order` 把重置按钮视觉移到提交按钮前。

**运行与观察：**

- 只用键盘执行筛选和收藏；
- 每按一次 Tab 记录 `document.activeElement`；
- 尝试 Enter 和 Space；
- 对照视觉顺序、DOM 顺序和 Tab 顺序；
- 检查焦点是否可见。

**修复答案：**

- 用原生 `<button type="button">` 替换 div；
- 监听 click，不手写重复的 Enter/Space 分支；
- 删除所有正数 tabindex；
- 调整 DOM 使按钮顺序与任务一致；
- 删除视觉反转；
- 恢复明确的 `:focus-visible` 轮廓。

**完成标准：**

修复后 Tab 与 DOM/视觉任务顺序一致；Enter/Space 可激活按钮；焦点始终可见；新增一个链接不需要重编号。

## 11. 阶段验收

### A11Y-004：键盘激活、焦点顺序和焦点可见

- [ ] 链接用于导航，按钮用于动作；
- [ ] Enter 可提交筛选和激活链接；
- [ ] Enter/Space 可激活原生收藏按钮；
- [ ] Tab 和 Shift+Tab 都走过完整主路径；
- [ ] 顺序与 DOM、视觉和任务一致；
- [ ] 每一步焦点都可见；
- [ ] 焦点不被裁切或固定内容遮挡；
- [ ] 未使用鼠标完成键盘证据。

### A11Y-005：skip link 与 tabindex 边界

- [ ] 页面第一个 Tab 可显示 skip link；
- [ ] skip link 使用真实 fragment href；
- [ ] 目标 id 唯一；
- [ ] 目标使用 `tabindex="-1"`，不污染自然 Tab 顺序；
- [ ] 分别记录 URL、滚动、`:target` 和 activeElement；
- [ ] 没有正数 tabindex；
- [ ] 没有把所有静态内容加入 Tab 顺序。

## 12. 常见问题

### Q7：main 为什么写 `tabindex="-1"`？

为了让 skip link 或脚本可以把焦点放到主要内容容器，同时不让 main 出现在每次自然 Tab 路径中。它不是让 main 变成按钮。

### Q8：为什么 skip link 平时要隐藏？

它用于跳过重复内容，通常在键盘焦点到达时显示，避免占据持续视觉空间。隐藏方式不能使用 `display: none` 或 `visibility: hidden`，否则它无法获得焦点。

### Q9：`:focus` 和 `:focus-visible` 应该选哪个？

保留浏览器默认焦点是基线。自定义时，`:focus-visible` 常用于明显的键盘式焦点提示；某些控件和用户设置即使鼠标操作也可能匹配。不要用它作为删除所有 `:focus` 可见反馈的借口。

### Q10：能否用 CSS `order` 改移动端 Tab 顺序？

不能可靠做到。CSS order 主要改变视觉布局，DOM 阅读和顺序焦点仍基于文档结构。应让 DOM 顺序本身符合任务，再设计不反转含义的响应式布局。

### Q11：`aria-disabled="true"` 与 `disabled` 相同吗？

不同。原生 `disabled` 会改变控件可操作性、焦点和表单行为；`aria-disabled` 主要表达语义，不自动阻止事件。原生控件能使用 disabled 时优先使用它。

### Q14：为什么本课不写具体屏幕阅读器朗读结果？

朗读会受屏幕阅读器、浏览器、平台 API、语言、标点和详细程度设置影响。教材给出可访问树的可复验期望，并要求项目记录目标组合实测，不虚构普遍输出。

### Q16：可以用 ARIA 修复所有第三方组件吗？

不能。若组件 DOM 顺序、键盘事件、焦点管理或业务状态错误，只加 ARIA 不会修复行为。应先判断能否替换为原生控件或修复组件实现，再补必要语义。

## 13. 扩展阅读

- [WHATWG HTML Living Standard](https://html.spec.whatwg.org/)
- [MDN HTML](https://developer.mozilla.org/docs/Web/HTML)
- [HTML 教学覆盖矩阵](../HTML-COVERAGE.md)

阅读时先定位本课对应元素或接口的规范章节，再核对目标浏览器支持；不要用搜索摘要替代规范正文和实际验证。

## 我现在能做到什么

- 能解释并验证：保持语义键盘行为、DOM 焦点顺序、可见焦点和跳过链接，并遵守 ARIA 第一规则。
- `A11Y-004`：键盘激活、焦点顺序、焦点可见
- `A11Y-005`：跳过导航与 tabindex 边界
- `A11Y-006`：ARIA 优先级与误用
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：可访问名称、描述与状态：让控件表达准确对象](02-accessible-names-descriptions-states.md) · [下一课：动态通知与忙碌状态：公布变化而不打断任务](04-live-regions-status-busy.md) · [返回 HTML 模块](../README.md)
