# 现行选择与确定性纠错：从需求到元素、属性与 DOM 行为

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 根据内容、交互和数据职责选择现行 HTML，并用源文件、DOM 与可访问性证据修正错误。 |
| 连续项目增量 | 完成邻里集市商品详情与发布区的语义审计，不改变既定业务契约。 |
| 主要证据 | `HIS-005`、`HIS-006`、`HIS-007`、`HIS-008`、`HIS-009`、`HIS-010` |
| 建议时间 | 2–4 小时 |
| 验证边界 | 本课验证静态 HTML 与当前页面行为，不证明服务端认证、事务或持久化。 |

## 1. 任务背景

你已经能从前两课查到现行元素、属性、DOM 属性、方法、事件和默认行为。真正开发页面时，困难
通常不是“有没有这个标签”，而是“这个需求究竟属于内容、导航、表单、媒体、样式还是脚本”。

邻里集市的商品详情页需要同时表达标题、价格、发布时间、卖家说明、图片、预约入口和状态反馈。
如果先按外观挑元素，页面可能看起来正确，却丢失标题层级、表单提交值、键盘行为或机器可读数据。
本课建立一条可以重复执行的选择与纠错流程，让每个决定都有来源和复验证据。

## 2. 学习目标

完成本课后，你应该能够：

- 从内容关系、用户命令、数据值、资源和视觉呈现五类职责中选择 owner；
- 优先使用具有所需语义、键盘和默认行为的现行元素；
- 区分 HTML 内容属性、DOM 属性、CSS 声明和 JavaScript 状态；
- 根据资源职责选择 `img`、`picture`、`video`、`iframe` 或普通链接；
- 同时比较源文件、解析后的 DOM、可访问性树和网络结果；
- 解释浏览器纠错为什么不能替代正确源代码；
- 用确定性步骤修复结构、属性、默认行为和焦点问题；
- 把修复应用到另一条商品数据并完成同路径复验。

## 3. 预备知识

- 已完成[现行元素职责索引](01-current-elements-by-responsibility.md)；
- 已完成[属性、DOM API 与默认行为](02-attributes-dom-apis-default-behavior.md)；
- 能通过本机 HTTP 服务打开页面，并使用 Elements、Console、Network 与 Accessibility 面板；
- 理解价格机器值使用整数分、时间机器值使用 UTC；
- 准备个人练习目录 `market-html-audit/`，不要把运行产物写进教材目录。

## 4. 核心理论

### 4.1 先确定职责，再选择语法

把需求先归入一个主要职责：

| 需求 | 首要 owner | 选择依据 |
| --- | --- | --- |
| 页面或区域标题 | HTML 结构 | 标题层级和内容关系 |
| 前往商品详情 | HTML 导航 | URL、历史记录与可复制地址 |
| 提交预约意图 | HTML 表单 + 服务端 | 成功控件、校验、提交与权限 |
| 展示商品图片 | HTML 资源元素 | 替代文本、尺寸和候选资源 |
| 控制间距与颜色 | CSS | 呈现不改变内容含义 |
| 切换本页展开状态 | 原生交互或 JavaScript | 默认行为、状态和事件 |
| 保存业务事实 | 服务端与数据库 | 浏览器状态不是业务权威 |

选择时先问“关闭 CSS 和脚本后，内容关系是否仍成立”，再问“是否需要增强表现或行为”。这样能
避免用样式类名替代语义，也避免用 JavaScript 重做浏览器已经提供的键盘与表单行为。

### 4.2 元素选择看内容模型与默认行为

同一段文字放进不同元素，会产生不同合同：

- `h1`–`h6` 建立标题层级；
- `p` 表示段落，不是任意布局容器；
- `a[href]` 表示导航，拥有可复制 URL 和浏览历史；
- `button` 表示命令，默认可聚焦并响应键盘；
- `time[datetime]` 同时提供可读文本和机器时间；
- `data[value]` 适合保存与当前文本对应的机器值；
- `output` 表示由输入或计算得到的结果；
- `status` 类反馈仍应通过合适的可访问语义向用户宣布。

元素“看起来相似”不代表合同相同。选择前同时查内容模型、允许的父子关系、默认角色、默认动作和
表单关联，而不是只看浏览器默认样式。

### 4.3 原生命令与导航不能互换

判断一个控件时使用这条规则：

```text
是否前往可表达为 URL 的位置？
  是 → 使用带 href 的链接
  否 → 是否提交表单？
        是 → 使用明确 type 的按钮作为 submitter
        否 → 使用 type="button" 的按钮执行本页命令
```

一个可点击的盒子没有自动获得链接或按钮的合同。若必须补上 `tabindex`、键盘事件、角色、禁用
状态和焦点管理，通常说明一开始选错了元素。

### 4.4 内容属性、DOM 属性和 CSS 各有 owner

下面三个值可能同时存在，但职责不同：

```html
<button
  id="reserve"
  type="button"
  aria-pressed="false"
  data-listing-id="listing-42"
>
  收藏
</button>
```

```js
const button = document.querySelector("#reserve");

button.addEventListener("click", () => {
  button.ariaPressed = button.ariaPressed === "true" ? "false" : "true";
});
```

```css
#reserve[aria-pressed="true"] {
  font-weight: 700;
}
```

- `type` 决定按钮默认行为；
- `aria-pressed` 表达可访问状态；
- `data-listing-id` 保存当前 DOM 节点使用的页面数据；
- `button.ariaPressed` 是当前 DOM 属性接口；
- CSS 根据状态呈现，不成为状态源。

业务是否已收藏仍应由应用和服务端决定。DOM 属性只描述当前页面状态，刷新后能否恢复取决于数据
来源，不能用一个属性写入冒充持久化。

### 4.5 资源元素按内容职责选择

| 内容 | 优先选择 | 必查边界 |
| --- | --- | --- |
| 商品照片 | `img` / `picture` | `alt`、固有尺寸、候选资源、失败状态 |
| 有时间轴的媒体 | `video` / `audio` | 控件、字幕、自动播放限制、回退 |
| 独立外部页面 | `iframe` | 标题、权限、sandbox、来源与尺寸 |
| 可下载或在新页查看的文件 | `a[href]` | 文件类型、大小、目标与安全关系 |
| 文档内矢量图 | 内联 `svg` 或 `img` | 是否需要 DOM 交互、文本替代 |
| 像素绘制表面 | `canvas` | 尺寸、缩放、替代内容与输入方式 |

选择资源元素时不只问“能不能显示”，还要问“失败后用户看到什么、键盘能否操作、内容能否被描述、
来源是否可信、是否需要隔离”。

### 4.6 浏览器纠错是可观察行为，不是作者许可

HTML 解析器会对缺失闭合、错误嵌套、表格上下文和重复属性执行确定性处理。结果可能出现：

- DOM 节点被移动到源代码中不同的位置；
- 某些节点被自动补出；
- 后出现的重复属性没有成为最终值；
- 表单控件与预想的 form owner 不一致；
- 页面表面可见，但键盘顺序或可访问名称已经错误。

因此验收至少比较四层：

```text
源文件 → 解析后的 DOM → 可访问性树/默认行为 → 请求或状态证据
```

浏览器能生成 DOM，只能说明解析器完成了恢复。新代码仍应修正源文件，让下一位读者无需猜测恢复
规则，也让校验器、测试和不同工具看到同一结构。

### 4.7 确定性纠错流程

对一个错误页面按固定顺序处理：

1. **冻结输入**：记录 URL、视口、商品 ID、源文件摘要和复现步骤；
2. **写预期**：说明标题、导航、表单值、焦点和请求应该怎样表现；
3. **比较层次**：同时查看 View Source、Elements、Accessibility 和 Network；
4. **定位 owner**：判断问题属于结构、属性、默认行为、CSS、脚本还是服务端；
5. **做最小修改**：一次只修一个职责，避免结构与样式同时大改；
6. **同路径复验**：使用相同 URL、输入和键盘路径；
7. **补边界输入**：空标题、长文本、资源失败、脚本禁用和 200% 缩放；
8. **迁移到另一条数据**：确认修复不是只适配一个商品。

这条流程的目标不是让页面“更现代”，而是让输入、DOM、行为和证据一致。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `main` | 页面主要内容 | 每页一个主要区域 | 不替代标题 |
| `article` | 可独立分发内容 | 单个商品详情 | 不是任意卡片装饰 |
| `h1`–`h6` | 建立标题层级 | 商品页主标题使用 `h1` | 不按字号选级别 |
| `a[href]` | 导航到 URL | 返回列表、查看详情 | 本页命令用按钮 |
| `button[type]` | 执行命令或提交 | `type="button"` / `submit` | 省略 type 可能触发表单提交 |
| `form` | 组织成功控件与提交 | 发布或筛选表单 | 客户端校验不替代服务端 |
| `label[for]` | 关联字段名称 | 与唯一 `id` 配对 | placeholder 不是标签 |
| `data[value]` | 文本对应机器值 | 整数分价格 | 不保存秘密 |
| `time[datetime]` | 可读文本与机器时间 | UTC ISO 值 | 显示文本可本地化 |
| `output` | 输入计算结果 | 筛选结果数 | 不是任意提示容器 |
| `aria-pressed` | 切换按钮当前状态 | `"true"` / `"false"` | 只用于真实切换命令 |
| `dataset` | 读取 `data-*` | `element.dataset.listingId` | 值始终来自字符串属性 |
| `checkValidity()` | 检查约束 | 提交前观察 | 不执行服务端业务校验 |
| `focus()` | 恢复交互位置 | dialog 关闭后回触发器 | 避免无原因抢焦点 |

## 6. 最小可运行案例

### 6.1 文件与启动

在个人目录创建：

```text
market-html-audit/
├── index.html
└── audit.js
```

完整 `index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>二手自行车｜邻里集市</title>
    <script type="module" src="./audit.js"></script>
  </head>
  <body>
    <header>
      <a href="./index.html">邻里集市</a>
    </header>
    <main>
      <article aria-labelledby="listing-title">
        <h1 id="listing-title">通勤自行车</h1>
        <p>
          价格：
          <data value="19900">199.00 元</data>
        </p>
        <p>
          发布于
          <time datetime="2026-10-11T08:00:00.000Z">2026-10-11</time>
        </p>
        <img
          src="./bike.jpg"
          alt="蓝色通勤自行车左侧视图"
          width="640"
          height="480"
        />
        <section aria-labelledby="actions-title">
          <h2 id="actions-title">商品操作</h2>
          <button
            id="favorite"
            type="button"
            aria-pressed="false"
            data-listing-id="listing-42"
          >
            收藏
          </button>
          <output id="favorite-result" for="favorite" aria-live="polite">
            尚未收藏
          </output>
        </section>
      </article>
    </main>
  </body>
</html>
```

完整 `audit.js`：

```js
const button = document.querySelector("#favorite");
const result = document.querySelector("#favorite-result");
const price = document.querySelector("data");
const publishedAt = document.querySelector("time");

if (
  !(button instanceof HTMLButtonElement) ||
  !(result instanceof HTMLOutputElement) ||
  !(price instanceof HTMLDataElement) ||
  !(publishedAt instanceof HTMLTimeElement)
) {
  throw new TypeError("页面合同节点缺失");
}

const cents = Number(price.value);
if (!Number.isSafeInteger(cents) || cents < 0) {
  throw new TypeError("价格机器值必须是非负整数分");
}
if (new Date(publishedAt.dateTime).toISOString() !== publishedAt.dateTime) {
  throw new TypeError("发布时间必须是规范 UTC");
}

button.addEventListener("click", () => {
  const selected = button.ariaPressed !== "true";
  button.ariaPressed = String(selected);
  result.value = selected ? "当前页面已收藏" : "当前页面未收藏";
});
```

在目录上一级启动本机静态服务，访问明确 URL。预期：

1. 页面有一个 `main` 和一个 `h1`；
2. 图片加载失败时仍显示具体替代文本；
3. Tab 可到达收藏按钮，Enter 与 Space 都能切换；
4. `aria-pressed` 与 `output.value` 同步；
5. Console 无未捕获错误；
6. 刷新后收藏状态重置，证明本例没有伪装持久化。

停止本机服务后确认端口释放。图片文件不是本课重点；可暂时让请求返回 404，并把替代文本作为资源
失败证据。

### 6.2 制造并修复一个确定性错误

把按钮暂时移入一个表单并删除 `type="button"`。按 Enter 后若发生非预期提交，记录：

| 项目 | 证据 |
| --- | --- |
| 现象 | URL 或页面发生提交相关变化 |
| Elements | 按钮位于 form 内且没有显式 type |
| 原因 | 按钮取得提交默认行为 |
| 修复 | 恢复 `type="button"` |
| 复验 | 同一键盘输入只切换收藏状态，没有提交请求 |

恢复后再次运行正常和错误路径。不要通过阻止所有 `submit` 事件掩盖错误元素合同。

## 7. 邻里集市集成案例

对现有商品详情与发布页建立审计表：

| 页面行为 | HTML owner | 应用或服务 owner | 验收 |
| --- | --- | --- | --- |
| 商品标题与说明 | `article`、标题、段落 | API 提供文本 | 关闭 CSS 仍可理解 |
| 价格 | `data[value]` | API/数据库保存整数分 | DOM 机器值与响应一致 |
| 发布时间 | `time[datetime]` | API 返回 UTC | datetime 可往返解析 |
| 详情导航 | `a[href]` | Router/服务器支持深链 | 复制、刷新、后退可用 |
| 收藏命令 | `button` 与状态文本 | 应用调用幂等 API | pending/成功/失败可区分 |
| 发布 | `form`、label、name、submitter | 服务端校验与授权 | 错误关联字段，草稿保留 |
| 预约冲突 | 状态反馈与可操作恢复 | 数据库事务与错误契约 | 页面不把冲突显示成成功 |

本阶段只修改 HTML 责任明确的部分。API、状态机和数据库规则仍由后续卷负责；不要在静态页面中
加入看似真实的账号、付款或持久化文案。

## 8. 常见错误与排查路径

| 现象 | 证据 | 原因 | 最小修复 | 复验 |
| --- | --- | --- | --- | --- |
| 点击“查看详情”不能复制地址 | Elements 没有 `href` | 用命令控件模拟导航 | 改为真实链接 | 新标签、后退、刷新均工作 |
| 表单按 Enter 触发错误命令 | submitter type 不明确 | 默认行为与意图不符 | 显式设置 type | 同键盘路径无额外请求 |
| 价格显示正确但脚本得到小数元 | `data.value` 与响应单位不同 | 显示值成为机器值 | value 使用整数分 | 边界值断言通过 |
| 页面显示标题但标题树为空 | Accessibility 无 heading | 只用 class 放大文字 | 使用正确标题元素 | 标题导航可定位 |
| 图片失败后没有信息 | img 无可用 alt | 只验收成功资源 | 写具体替代文本 | 404 时仍理解商品 |
| 修复源码后 DOM 仍旧 | Network/Sources 不是当前文件 | 编辑了错误副本或缓存 | 确认 URL、响应和源路径 | 刷新后摘要一致 |
| DOM 看似正常但校验失败 | View Source 与 Elements 不同 | 解析器执行纠错 | 修复源结构 | 两层结构一致 |
| 状态只改变颜色 | Accessibility 状态不变 | CSS 成为唯一状态表达 | 同步语义状态和文本 | 键盘与读屏路径可判断 |

排查时先确认正在查看的响应来自哪个文件，再判断结构和行为。不要在错误文件上连续追加属性。

## 9. 课后题

**1. 为什么可点击的视觉样式不能决定使用链接还是按钮？**

因为两者的合同由导航目标和命令职责决定，涉及 URL、历史、键盘和默认行为，而不是边框或颜色。

**2. 为什么 `data-price-cents="19900"` 不能证明数据库保存了整数分？**

它只证明当前 DOM 有一个字符串属性；服务端和数据库仍需独立校验与测试。

**3. Elements 中结构正确，为什么还要修源文件？**

Elements 显示解析后的 DOM。若正确结构来自浏览器纠错，源文件、校验器和其他工具仍可能得到不同
结果，维护者也无法直接理解作者意图。

**4. 何时选择原生交互，何时增加 JavaScript？**

原生元素已覆盖所需语义和默认行为时先使用原生能力；只有产品状态或增强行为超出默认合同，才增加
脚本，并保留失败与键盘路径。

## 10. 实践练习

**基础：元素 owner 审计。**

在个人练习页选 10 个可见区域，为每个区域写出内容职责、当前元素、默认行为和证据面板。完成标准
是每项都能解释“为什么不是另一个外观相似的元素”。

**提升：机器值对照。**

增加第二条商品，价格使用整数分，时间使用规范 UTC。写脚本读取 `data.value` 和
`time.dateTime`，对合法值和一个故障值分别断言。完成后恢复合法值并复验。

**故障：源文件与 DOM 分歧。**

制造一个浏览器会纠正的嵌套错误，记录 View Source 与 Elements 差异，再做最小修复。完成标准是
源文件、DOM、标题树和键盘顺序一致，且没有用 JavaScript 重排节点来掩盖源错误。

## 11. 阶段验收

- [ ] 67 篇 HTML 详细教程的顺序未因本课改名改变。
- [ ] 能从需求职责选择元素，而不是按默认样式选择。
- [ ] 商品标题、价格、时间、图片、导航和命令均有明确 owner。
- [ ] 内容属性、DOM 属性、CSS 和应用状态没有互相冒充。
- [ ] 比较过源文件、DOM、Accessibility 与 Network。
- [ ] 至少制造并修复一个默认行为错误。
- [ ] 同路径复验覆盖键盘、资源失败、长文本和 200% 缩放。
- [ ] 静态示例没有声称服务端认证、授权、持久化或事务已经完成。
- [ ] 修复已应用到另一条商品数据，而非只适配固定输入。

提交个人练习文件路径、启动命令、错误前后证据和仍未覆盖的浏览器/辅助技术范围。

## 12. 常见问题

**是否要记住所有现行元素和属性？**

不需要。要记住职责分类和查阅路径，并能根据内容模型、默认行为和支持边界做选择。

**能否用 JavaScript 把任意节点变成按钮？**

技术上可以补齐部分行为，但成本包括键盘、焦点、禁用、表单和可访问状态。存在符合需求的原生
元素时，应优先使用其完整合同。

**解析器会纠错，校验器还有价值吗？**

有。解析器回答“浏览器怎样构造 DOM”，校验器帮助发现作者输入是否符合现行规则；两者证据不同。

**本课通过是否证明所有浏览器一致？**

不证明。记录实际浏览器版本；Firefox、Safari、真实移动设备和屏幕阅读器仍需在目标环境复核。

## 13. 扩展阅读

- [HTML Living Standard](https://html.spec.whatwg.org/)：核对元素、内容模型、属性和解析规则。
- [MDN HTML elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements)：按职责查找现行元素。
- [MDN HTML attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes)：核对属性适用范围。
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)：确认复合交互模式与键盘要求。
- [HTML checker](https://validator.w3.org/nu/)：比较作者输入与解析后 DOM 的不同证据。

## 我现在能做到什么

我能从内容和行为职责选择现行 HTML，并区分结构、属性、DOM、CSS、应用与服务端状态。我也能
沿同一输入比较源文件、DOM、可访问性和请求证据，用最小修改完成可重复的纠错与复验。

## 单元导航

[上一课：属性、DOM API 与默认行为](02-attributes-dom-apis-default-behavior.md) ·
[返回章目录](../README.md#第八章元素参考选择与纠错) · [返回 HTML 模块](../README.md)
