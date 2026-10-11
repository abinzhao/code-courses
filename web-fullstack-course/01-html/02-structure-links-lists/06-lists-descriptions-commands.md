# 列表、描述关系与命令集合

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课目标 | 依据顺序、层级和名称值关系选择 ul、ol、menu 或 dl，并保持合法父子结构。 |
| 连续项目增量 | 完成本课主题在邻里集市中的结构、证据与故障恢复 |
| 主要证据 | `LST-001`、`LST-002`、`LST-003`、`LST-004`、`LST-005`、`LST-008` |
| 建议时间 | 2–4 小时 |

## 1. 任务背景

依据顺序、层级和名称值关系选择 ul、ol、menu 或 dl，并保持合法父子结构。

你需要留下页面、Elements，以及本课指定的 Console、Network 或 Accessibility 证据，不能只凭最终外观判断。

## 2. 学习目标

完成本课后，你应该能够：

- 用自己的话解释 LST-001（`ul`、`li` 与无序集合）、LST-002（`ol`、`start`、`reversed`、`type`、`li[value]`）、LST-003（嵌套列表父子关系）、LST-004（`menu` 命令列表边界）、LST-005（`dl`、`dt`、`dd` 名称值关系）、LST-008（列表、描述列表、表格与分节的选择）；
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
灯臂可调。开关正常。先约地点。再检查电源线。
状态 available 是可预约。价格 39 元。
```

## 4. 核心理论

### 4.1 先判断“关系”，再选择元素

可以用三个问题快速判断：

```text
这些项目是否属于同一集合？
  ├── 否：可能是多个段落或分节
  └── 是
      ├── 顺序是否改变含义？
      │   ├── 是：ol
      │   └── 否：ul
      └── 它们是否是名称与解释？
          └── 是：dl + dt + dd
```

表格适合按行和列交叉比较；描述列表适合逐项解释名称。不要仅因为两者都能显示“左边名称、右边值”就混用。

### 4.2 `ul`：顺序不改变含义的集合

`ul` 表示无序列表，直接项目使用 `li`：

```html
<h2>商品特点</h2>
<ul>
  <li>灯臂角度可以调节</li>
  <li>开关工作正常</li>
  <li>附带原装电源线</li>
</ul>
```

这里交换三个项目的顺序，不会改变商品事实，所以使用 `ul`。

默认圆点是浏览器样式，不是列表语义的来源。下面的文字看起来有圆点，却不是列表：

```html
<!-- 错误案例：只是三个段落 -->
<p>• 灯臂角度可以调节</p>
<p>• 开关工作正常</p>
<p>• 附带原装电源线</p>
```

辅助技术不会因为出现 `•` 字符就自动报告“列表，共三项”。需要集合关系时，应使用列表元素。

### 4.3 `ol`：顺序参与含义的项目

`ol` 表示有序列表：

```html
<h2>交接流程</h2>
<ol>
  <li>在平台内确认公共交接地点</li>
  <li>当面检查灯罩和电源线</li>
  <li>双方确认后完成交接</li>
</ol>
```

如果先“完成交接”再“检查电源线”，流程含义就变了，因此使用 `ol`。

#### 改变可见编号

`start` 设置整个列表的起始值：

```html
<ol start="4">
  <li>确认交接时间</li>
  <li>检查商品状态</li>
  <li>完成交接</li>
</ol>
```

`reversed` 请求倒序编号：

```html
<ol reversed>
  <li>最后检查：确认没有遗漏配件</li>
  <li>第二项检查：测试开关</li>
  <li>第一项检查：查看电源线</li>
</ol>
```

`li[value]` 调整某一个项目的序号，并影响后续计数：

```html
<ol>
  <li>步骤一</li>
  <li value="4">步骤四：前三步由服务站完成</li>
  <li>步骤五</li>
</ol>
```

编号不是业务 ID。商品 `listing-42` 即使显示为列表第 2 项，刷新排序后仍应保持自己的稳定 ID。

#### `type` 的边界

`ol[type]` 可以选择 `1`、`a`、`A`、`i`、`I` 等编号形式。它表达编号系统，不应只是为了“看起来更漂亮”而改变内容关系。视觉上的编号装饰以后可以交给 CSS。

### 4.4 `li` 与嵌套列表

`li` 必须属于 `ul`、`ol` 或 `menu`。子列表应放在它所解释的父项目中：

```html
<ul>
  <li>
    交接时可以检查
    <ul>
      <li>灯罩划痕</li>
      <li>电源线绝缘层</li>
      <li>开关响应</li>
    </ul>
  </li>
  <li>不提供邮寄</li>
</ul>
```

下面的结构是常见错误：

```html
<!-- 错误案例：子列表没有属于某个 li -->
<ul>
  <li>交接时可以检查</li>
  <ul>
    <li>灯罩划痕</li>
  </ul>
</ul>
```

浏览器可能仍显示缩进，但内容模型已经错误。检查 Elements 时，确认内层 `ul` 的父元素是对应的 `li`。

### 4.5 `menu`：命令项目列表，不是完整应用菜单

`menu` 在当前 HTML 中可以表达命令项目列表：

```html
<menu>
  <li><button type="button">收藏商品</button></li>
  <li><button type="button">分享链接</button></li>
</menu>
```

它通常使用与 `ul` 类似的列表呈现，但不会自动提供：

- 上下方向键在项目间移动；
- 菜单打开和关闭状态；
- 焦点循环；
- 右键菜单；
- ARIA `menu` 复合控件行为。

普通商品操作通常使用按钮列表即可，不要仅因为名称是 `menu` 就套用应用菜单角色。

### 4.6 `dl`、`dt`、`dd`：名称与说明

描述列表适合商品元信息：

```html
<dl>
  <div>
    <dt>价格</dt>
    <dd><data value="3900">39 元</data></dd>
  </div>
  <div>
    <dt>状态</dt>
    <dd>可预约</dd>
  </div>
  <div>
    <dt>交接方式</dt>
    <dd>社区公共地点当面检查</dd>
  </div>
</dl>
```

`dt` 是名称，`dd` 是说明。一个名称可以有多个说明：

```html
<dl>
  <dt>可检查项目</dt>
  <dd>灯罩是否破裂</dd>
  <dd>电源线是否老化</dd>
</dl>
```

多个名称也可以共享一项说明：

```html
<dl>
  <dt>available</dt>
  <dt>可预约</dt>
  <dd>当前没有有效预约，可以发起预约请求。</dd>
</dl>
```

用 `div` 包裹一个完整的 `dt`/`dd` 分组，有助于以后样式布局，但 `div` 不能把一个名称和另一个不相关说明错误拼在一起。

#### `dl` 不是二维数据表

两件商品都要比较“价格、状态、发布时间”时，读者需要沿行和列交叉阅读，更适合使用 `table`。只有一件商品的一组名称和值，通常适合 `dl`。

### 4.7 从需求选择结构

| 内容需求 | 推荐结构 | 原因 |
| --- | --- | --- |
| 三个商品特点 | `ul` | 属于集合，顺序不重要 |
| 交接五步 | `ol` | 顺序参与含义 |
| 状态码与解释 | `dl` | 名称和说明 |
| 多商品价格比较 | `table` | 需要行列交叉比较 |
| 一段社区守则原文 | `blockquote` | 外部长引用 |
| 一段 JSON 示例和说明 | `figure` + `pre/code` + `figcaption` | 可独立引用的代码整体 |
| 商品与安全提示的布局包裹 | `div` | 只承担中性布局分组 |

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 最小示例 | 常见边界 |
| --- | --- | --- | --- |
| `ul` | 无序集合 | `<ul><li>灯臂可调</li></ul>` | 直接项目使用 `li` |
| `ol` | 有顺序集合 | `<ol><li>检查商品</li></ol>` | 顺序应参与含义 |
| `ol[start]` | 设置起始编号 | `<ol start="4">` | 不是业务 ID |
| `ol[reversed]` | 请求倒序编号 | `<ol reversed>` | 布尔属性，出现即启用 |
| `ol[type]` | 选择编号系统 | `<ol type="A">` | 纯视觉装饰优先 CSS |
| `li[value]` | 设置当前有序项编号 | `<li value="4">` | 会影响后续编号 |
| `menu` | 命令项目列表 | `<menu><li><button>收藏</button></li></menu>` | 不自动实现 ARIA 菜单 |
| `dl` | 名称与说明集合 | `<dl><dt>状态</dt><dd>可预约</dd></dl>` | 不替代二维数据表 |
| `dt` | 名称 | `<dt>价格</dt>` | 放在合法 `dl` 结构中 |
| `dd` | 说明 | `<dd>39 元</dd>` | 与附近名称形成关联 |
| `figure` | 可独立引用的内容整体 | `<figure>...</figure>` | 不只用于图片 |
| `figcaption` | figure 的可见说明 | `<figcaption>价格示意</figcaption>` | 不替代图片 `alt` |
| `blockquote[cite]` | 长引用及来源 URL | `<blockquote cite="...">` | 来源不会自动显示 |
| `pre` | 保留空白 | `<pre><code>...</code></pre>` | 不关闭 HTML 解析 |
| `div` | 中性流内容容器 | `<div class="layout">` | 有明确语义时使用对应元素 |
| `hr` | 主题转折 | `<hr>` | 纯装饰线交给 CSS |

## 6. 最小可运行案例

### 6.1 文件位置

在个人练习项目中创建：

```text
market-learning/
└── practice/
    └── html-06-content-groups/
        └── index.html
```

本教材只提供 Markdown 中的代码。请把下面的完整文件保存为 `index.html`。

### 6.2 完整文件

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>阅读台灯详情 · 邻里集市</title>
  </head>
  <body>
    <header>
      <p>邻里集市</p>
    </header>

    <main>
      <article>
        <header>
          <h1>阅读台灯</h1>
          <p>社区闲置物品，当面检查后交接。</p>
        </header>

        <section aria-labelledby="features-title">
          <h2 id="features-title">商品特点</h2>
          <ul>
            <li>灯臂角度可以调节</li>
            <li>开关工作正常</li>
            <li>
              交接时可以检查
              <ul>
                <li>灯罩边缘的浅划痕</li>
                <li>电源线绝缘层</li>
                <li>开关响应</li>
              </ul>
            </li>
          </ul>
        </section>

        <section aria-labelledby="data-title">
          <h2 id="data-title">商品信息</h2>
          <dl>
            <div>
              <dt>价格</dt>
              <dd><data value="3900">39 元</data></dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>可预约</dd>
            </div>
            <div>
              <dt>发布时间</dt>
              <dd>
                <time datetime="2026-10-10T08:00:00Z">
                  2026 年 10 月 10 日
                </time>
              </dd>
            </div>
          </dl>
        </section>

        <section aria-labelledby="steps-title">
          <h2 id="steps-title">交接前倒计时</h2>
          <ol reversed start="3" type="I">
            <li value="3">在平台内确认公共交接地点</li>
            <li>当面检查灯罩、电源线和开关</li>
            <li>双方确认后完成交接</li>
          </ol>
        </section>

        <section aria-labelledby="states-title">
          <h2 id="states-title">状态说明</h2>
          <dl>
            <dt><code>available</code></dt>
            <dd>当前没有有效预约，可以发起预约请求。</dd>
            <dt><code>reserved</code></dt>
            <dd>已有有效预约，其他用户不能再次预约。</dd>
            <dt><code>sold</code></dt>
            <dd>商品已经完成交接。</dd>
          </dl>
        </section>

        <figure>
          <pre><code>{
  "title": "阅读台灯",
  "priceCents": 3900,
  "status": "available"
}</code></pre>
          <figcaption>
            商品数据最小示例：价格使用整数分。
          </figcaption>
        </figure>

        <section aria-labelledby="rules-title">
          <h2 id="rules-title">社区规则</h2>
          <blockquote cite="https://community.example/rules/handoff">
            <p>交接前应在光线充足的公共地点检查商品状态。</p>
          </blockquote>
          <p>
            引自 <cite>社区闲置物品交接守则</cite>。
            示例域名不会提供真实页面。
          </p>
        </section>

        <hr>

        <aside>
          <h2>教学边界</h2>
          <p>
            本页只展示静态内容，不会创建预约、账号或支付。
          </p>
        </aside>
      </article>
    </main>
  </body>
</html>
```

### 6.3 打开方式、预期结果与失败证据

打开方式：

1. 保存文件；
2. 用浏览器打开；
3. 打开 DevTools 的 Elements；
4. 展开最外层 `ul`，找到内层 `ul`；
5. 展开 `dl`、`figure` 和 `blockquote`。

预期结果：

- 商品特点显示为列表；
- “交接时可以检查”下面有三项子列表；
- 交接倒计时使用 `type="I"` 显示 `III`、`II`、`I`；
- 价格、状态和时间形成名称与说明；
- JSON 保留换行；
- 图注出现在代码整体之后；
- 页面无真实预约按钮。

失败证据：

- 商品标题仍位于 `article` 外，导致文章本身没有标题；
- Elements 中的内层 `ul` 与所属 `li` 并列；
- 倒计时没有显示 `III`、`II`、`I`，或首个 `li[value]` 与 `start` 不一致；
- 价格机器值不是 `3900`，或者时间机器值没有使用带 `Z` 的 UTC 字符串。

本页不依赖网络资源。关闭浏览器标签页即可结束观察。

### 6.4 逐步扩展：增加操作命令列表

在 `article` 的 `header` 之后、商品特点之前插入：

```html
<section aria-labelledby="actions-title">
  <h2 id="actions-title">可用操作</h2>
  <menu>
    <li><button type="button">收藏商品</button></li>
    <li><button type="button">复制商品编号</button></li>
  </menu>
  <p>按钮尚未绑定脚本，不会保存状态。</p>
</section>
```

预期出现两个原生按钮。用 Tab 可以聚焦，用 Enter 或空格激活，但因为没有事件脚本，页面不会保存收藏或复制内容。这是“正确元素但尚未实现业务行为”的状态，不是假装功能成功。

### 6.5 故障实验：破坏嵌套关系

把完整案例中的内层列表临时移到父 `li` 后面：

```html
<!-- 错误案例 -->
<ul>
  <li>交接时可以检查</li>
  <ul>
    <li>灯罩边缘的浅划痕</li>
  </ul>
</ul>
```

**现象：**浏览器仍可能显示两个层级。
**证据：**Elements 中内层 `ul` 的父元素是外层 `ul`，不是所属 `li`。
**原因：**列表直接项目应该是 `li`，子列表属于某个具体项目。
**修复：**把内层 `ul` 放回“交接时可以检查”的 `li`。
**复验：**Elements 中父子关系正确，列表含义与可见缩进一致。

## 7. 邻里集市集成案例

本课为邻里集市增加的是“内容关系”，不是新业务状态：

```text
商品
├── 特点集合：ul
├── 商品信息：dl
├── 交接流程：ol
├── 状态词汇：dl
├── 数据示例：figure
└── 社区规则引用：blockquote
```

业务约束仍来自项目契约：

- `priceCents` 使用整数分；
- `available`、`reserved`、`sold` 是状态机器值；
- 交接倒计时使用 `start`、`reversed`、`type` 和 `li[value]` 控制显示编号，但这些编号不是商品或流程记录的稳定 ID；
- 静态文字不能证明服务器真实状态；
- 操作按钮没有脚本和 API 时，不应显示成功消息；
- 引用的 `.example` 地址只用于文档语法，不是可访问的生产资源。

下一阶段会把多件商品放进表格进行行列比较。单件商品的名称值仍保留 `dl`，避免为了视觉布局过早使用表格。

## 8. 常见错误与排查路径

### 8.1 用圆点字符冒充列表

- **现象**：视觉上有三行圆点。
- **证据**：Elements 中只有 `p`，没有 `ul`/`li`。
- **原因**：字符不会创建列表关系。
- **修复**：改为 `ul` 和 `li`。
- **复验**：辅助技术或浏览器 Accessibility 树能识别列表及项目。

### 8.2 子列表与 `li` 并列

- **现象**：缩进似乎正确，但校验或 DOM 结构异常。
- **证据**：内层 `ul` 的父元素是外层列表。
- **原因**：子列表没有属于具体列表项。
- **修复**：移动到对应 `li` 内。
- **复验**：检查 Elements 父子关系。

### 8.3 用 `ol` 表达无顺序特点

- **现象**：商品特点被编号为 1、2、3。
- **证据**：交换项目后内容含义并未改变。
- **原因**：根据默认编号外观选择了元素。
- **修复**：改为 `ul`，以后用 CSS 处理视觉。
- **复验**：解释为什么顺序不参与含义。

### 8.4 用 `dl` 代替多商品表格

- **现象**：每件商品都重复“价格、状态”，难以横向比较。
- **证据**：读者需要在多个名称值组之间来回查找。
- **原因**：把名称值关系误当成二维数据。
- **修复**：多商品交叉比较使用有表头的 `table`。
- **复验**：能沿同一列比较所有价格。

### 8.5 把显示编号当成业务 ID

- **现象**：倒计时原本显示 `III`、`II`、`I`，把首项改成 `li value="8"` 后却变成 `VIII`、`VII`、`VI`。
- **证据**：Elements 显示 `ol[reversed][start="3"][type="I"]`，但首个 `li[value]` 把后续计数重置为 8。
- **原因**：`start` 给列表设起点，`reversed` 改变计数方向，`type` 改变编号系统，`li[value]` 则从某一项重置计数；这些显示编号都不是稳定业务标识。
- **修复**：恢复 `li value="3"`，或者在无需单项重置时删除 `value`；真实记录 ID 另用稳定数据字段保存。
- **复验**：可见编号恢复为 `III`、`II`、`I`，交换样式不会改变商品或流程记录的身份。

## 9. 课后题

### 9.1 理解题

1. 商品特点与交接步骤为什么使用不同列表？
2. `li[value]` 为什么不能当成商品 ID？
3. `figcaption` 和图片的 `alt` 有什么不同？
4. `blockquote[cite]` 为什么不能替代可见来源链接？
5. `div` 在什么情况下是合理选择？

<details>
<summary>查看理解题答案</summary>

1. 特点的顺序通常不改变含义，使用 `ul`；步骤的顺序参与流程，使用 `ol`。
2. 它只改变当前列表的显示编号，排序或内容变化后编号可能改变；业务 ID 应稳定。
3. `alt` 在图片不可用时替代图片信息，`figcaption` 是整个 figure 的可见说明。
4. 属性不会自动显示或提供导航，读者需要访问时仍需 `a[href]`。
5. 内容只需要中性布局或脚本容器，且没有更准确的语义元素时。

</details>

### 9.2 推理题

下面三组内容分别应使用什么结构？

```text
A：成色、尺寸、颜色
B：填写表单、确认地点、当面检查
C：状态 available 的含义、状态 reserved 的含义
```

<details>
<summary>查看推理答案</summary>

- A 使用 `ul`，它们是无顺序商品属性集合。
- B 使用 `ol`，顺序参与业务过程。
- C 使用 `dl`，它们是状态名称与解释。

</details>

### 9.3 设计题

一个页面要展示三件商品，每件都有价格和状态。请比较：

- 为每件商品建立一个 `dl`；
- 建立一张含“商品、价格、状态”表头的 `table`。

答案标准：如果主要任务是逐件阅读详情，可以使用每件商品的 `dl`；如果主要任务是跨商品比较同一属性，表格更清楚。说明用户任务比默认外观更重要。

## 10. 实践练习

### 10.1 基础：整理自行车详情

文件位置：

```text
practice/html-06-content-groups/bike.html
```

要求：

- 使用 `ul` 写三个特点；
- 使用 `ol` 写四步验车流程；
- 使用 `dl` 写价格、状态、发布时间；
- 使用 `data[value]` 保存整数分；
- 使用 `time[datetime]` 保存 UTC 时间。

完成标准：关闭样式后仍能看出集合、流程和名称值关系。

### 10.2 故障：制造错误列表

依次制造两个错误，每次保存并观察：

1. 把一个子列表移动到父 `li` 外；
2. 把验车倒计时首项改成 `li value="8"`，但保留“从 3 开始”的可见说明。

每个错误都按统一格式记录：

```text
现象：
Elements 证据：
原因：
修复：
复验：
```

完成标准：不仅恢复可见缩进，还能指出修复后的 DOM 父子关系；同时恢复 `III`、`II`、`I`，并解释为什么列表编号不能充当业务 ID。

## 11. 阶段验收

### 功能与结构

- [ ] 无序特点使用 `ul`/`li`；
- [ ] 有序流程使用 `ol`/`li`；
- [ ] 能预测 `start`、`reversed`、`type`、`li[value]` 组合后的编号；
- [ ] 子列表放在所属 `li` 内；
- [ ] 状态和价格使用合法 `dl` 结构；
- [ ] 代码整体和图注使用 `figure`/`figcaption`；
- [ ] 引用内容与作者正文可以区分。

### 解释能力

- [ ] 能说明顺序是否影响元素选择；
- [ ] 能说明显示编号与稳定业务 ID 的区别；
- [ ] 能比较 `dl` 与 `table`；
- [ ] 能说明 `menu` 不自动实现应用菜单；
- [ ] 能说明 `pre` 不会关闭 HTML 解析；
- [ ] 能说明 `div` 的中性职责。

### 提交证据

```text
个人练习路径：
浏览器与版本：
完整页面：
Elements 中的嵌套列表：
编号属性预测与实测：
错误实验：
修复与复验：
结构选择说明：
未验证范围：
```

## 12. 常见问题

### Q1：去掉列表圆点，列表语义还在吗？

一般情况下，CSS 改变视觉不会修改 DOM 元素。但具体辅助技术对极端样式组合可能存在差异，仍应检查目标环境。语义来源是正确元素，不是圆点。

### Q2：一个 `dl` 中可以有多个 `dt` 和 `dd` 吗？

可以。名称与说明可以形成一对多或多对一关系。关键是让分组关系清楚，不要把无关内容随意放入。

### Q5：`menu` 和 `nav` 有什么不同？

`nav` 包含主要导航链接；`menu` 表示一组命令项目。查看商品详情通常是导航，收藏商品通常是命令。

## 13. 扩展阅读

资料核验日期：2026-10-10。

- [WHATWG：分组内容](https://html.spec.whatwg.org/multipage/grouping-content.html)：列表、描述列表、figure、blockquote 和 pre 的内容模型。
- [MDN：HTML 列表](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Lists)：复习三类列表的实际用途。
- [MDN：figure](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure)：确认 figure 与 figcaption 的结构。
- [MDN：blockquote](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote)：区分引用来源属性与可见链接。
- [邻里集市项目契约](../../00-guide/05-project-assessment.md)：核对价格单位和商品状态。

阅读时重点检查：允许的父子关系、属性是否改变语义，以及浏览器默认样式是否只是视觉表现。

## 我现在能做到什么

- 能解释并验证：依据顺序、层级和名称值关系选择 ul、ol、menu 或 dl，并保持合法父子结构。
- `LST-001`：`ul`、`li` 与无序集合
- `LST-002`：`ol`、`start`、`reversed`、`type`、`li[value]`
- `LST-003`：嵌套列表父子关系
- `LST-004`：`menu` 命令列表边界
- `LST-005`：`dl`、`dt`、`dd` 名称值关系
- `LST-008`：列表、描述列表、表格与分节的选择
- 能提交最小案例、失败证据、修复记录和项目增量，而不是只提交最终截图。

## 单元导航

[上一课：链接安全、隐私与下载边界](05-link-security-privacy-downloads.md) · [下一课：图注、引用与内容分组](07-figures-quotes-content-groups.md) · [返回 HTML 模块](../README.md)
