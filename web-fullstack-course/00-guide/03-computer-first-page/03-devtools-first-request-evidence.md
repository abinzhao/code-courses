# 03 DevTools 与第一份请求证据：让“我看到了”变成可复核记录

## 任务卡

同伴说邻里集市首页“打不开”，但只发来一张空白页面截图。你不知道他访问了哪个地址、服务是否运行、Network 是否收到响应，也不知道截图是在修复前还是修复后。本课要学会使用 Elements、Console、Network 和 Sources，把一次页面观察写成含输入、证据、原因、修复和复验的记录。

| 工具 | 本课任务 | 最低证据 |
| --- | --- | --- |
| Elements | 区分源文件与活动 DOM | 临时修改及刷新恢复记录 |
| Console | 查询页面状态与执行表达式 | 无报错结果和一次可控异常 |
| Network | 读取请求、状态、类型和响应 | 200 与 404 对照 |
| Sources | 定位浏览器实际加载的源码 | 文件名、行号与断点观察 |
| 截图与文字记录 | 交接一次故障 | 五阶段证据表 |

建议用 90 分钟完成。浏览器界面会随版本变化，本课要求找到等价能力，不要求按钮位置完全一致。

## 1. 任务背景

开发者工具不是“出错后随便点一遍”的面板集合。每个面板观察不同层：

```text
磁盘源文件
  → HTTP 响应字节
  → HTML 解析得到 DOM
  → JavaScript 读取和修改状态
  → 样式、布局与画面
```

- Network 回答“请求发了什么、响应回了什么”。
- Sources 回答“浏览器加载了哪份源码、执行到哪一行”。
- Elements 回答“当前 DOM 和样式是什么”。
- Console 回答“运行时对象和错误是什么”。

一张页面截图只能证明某一时刻的画面，不能独立证明 URL、状态码、响应体或根因。调试记录要让另一人能按同样步骤复现和复验。

## 2. 学习目标

完成后，你应能：

- 在不依赖菜单位置记忆的情况下打开 DevTools 关键面板。
- 区分页面源代码、Network 响应、Sources 文件与 Elements DOM。
- 用 Elements 检查节点、属性与临时修改。
- 用 Console 查询对象、识别错误级别并保留可复制结果。
- 在 Network 中读取 URL、方法、状态、类型、大小、时间和响应。
- 解释为何先打开 Network 再刷新更容易得到完整证据。
- 在 Sources 中找到加载文件、设置断点并恢复执行。
- 区分普通刷新、禁用缓存观察和修改 DOM 后刷新。
- 生成不含秘密和隐私的截图与文字证据。
- 按“现象、证据、原因、修复、复验”完成一次 404 调试。

## 3. 预备知识

先完成：

1. [文件、路径与编辑器](01-files-paths-editors.md)；
2. [URL、HTTP 与第一张服务页面](02-url-http-first-page.md)。

个人目录应有：

```text
market-learning/
└── market-start/
    ├── index.html
    └── server.mjs
```

需要 Node.js 24 LTS 和一个带开发者工具的现代桌面浏览器。本课以 Chromium DevTools 名称为主；Firefox 和 Safari 有等价工具，但标签名、快捷键和截图方式可能不同。

打开 DevTools 的常见方式：

- 页面右键选择“检查”；
- Chromium 的 Windows/Linux 常用 `F12` 或 `Ctrl+Shift+I`；
- Chromium 的 macOS 常用 `Command+Option+I`。

快捷键可能被系统或辅助软件占用，菜单入口是可靠替代。

## 4. 核心理论

### 4.1 先确认观察对象

开始记录前先写四项：

| 项目 | 本课正常值 |
| --- | --- |
| 页面地址 | `http://127.0.0.1:3000/` |
| 服务命令 | `node server.mjs` |
| 源文件 | `market-start/index.html` |
| 观察时间 | 使用本机实际时间并注明时区 |

DevTools 会跟随当前标签页。多个窗口、隐身窗口、iframe 和扩展页可能有不同执行上下文。先确认地址栏，再确认 DevTools 顶部选择的是当前页面。

### 4.2 Elements：活动 DOM，不是磁盘编辑器

Elements 展示浏览器当前的 DOM 树。选中商品价格节点后，可以临时把 280 元改成 1 元：

```html
<data value="28000">1 元</data>
```

此时出现一个刻意不一致的状态：展示文字是 1 元，机器值仍是 28000 分。它能证明前端画面可被用户修改，不能成为权威价格。

刷新后，页面重新从 HTTP 响应建立 DOM，显示恢复为源文件中的 280 元。正确记录应包含：

```text
修改前：展示 280 元，value 为 28000
Elements 临时修改：展示 1 元，value 仍为 28000
刷新后：展示恢复为 280 元
结论：Elements 编辑没有写回 index.html
```

Elements 还可检查：

- 节点父子关系和顺序；
- `id`、`href`、`lang`、`datetime` 等属性；
- Computed 面板中的最终样式；
- 事件监听和可访问性信息，具体入口随浏览器版本变化。

### 4.3 Console：运行时查询与错误现场

Console 可执行当前页面上下文中的 JavaScript。对邻里集市首页运行：

```js
document.title
document.documentElement.lang
document.querySelector("data").value
document.querySelector("time").dateTime
location.href
```

预期分别得到页面标题、`zh-CN`、`28000`、UTC 时间字符串和当前 URL。

明确错误示例：

```js
document.querySelector("#missing").textContent
```

`querySelector` 找不到节点时返回 `null`，继续读取 `textContent` 会产生 `TypeError`。这次异常是可控实验。证据应记录表达式、完整错误类型和触发原因，随后用安全查询复验：

```js
document.querySelector("#missing")?.textContent ?? "目标不存在"
```

不要把 Console 中的红色都解释为“JavaScript 文件坏了”。浏览器扩展、资源请求和手动输入也可能产生消息；先看来源文件、行号与时间。

### 4.4 Network：请求证据的主入口

Network 只记录其开始监听后发生的请求。最稳妥的顺序：

1. 打开 DevTools；
2. 切到 Network；
3. 确认录制按钮处于开启状态；
4. 清空旧记录；
5. 刷新页面；
6. 选择类型为 Document 的首页请求。

常用字段：

| 字段 | 回答的问题 |
| --- | --- |
| Name / URL | 请求了哪个资源 |
| Method | 使用什么 HTTP 方法 |
| Status | 服务返回什么状态 |
| Type | 浏览器把资源归为什么类型 |
| Initiator | 谁触发了请求 |
| Size | 传输或资源大小 |
| Time / Waterfall | 请求何时开始、各阶段耗时 |
| Headers | 请求头与响应头 |
| Preview / Response | 浏览器预览与原始响应内容 |

状态 200 不证明 DOM 一定正确；Response 是服务返回的源文本，Elements 是解析后且可能被脚本修改的 DOM。

### 4.5 Sources：找到执行的文件和行

Sources 面板展示当前页面加载的资源。对于本课首页，可找到 `127.0.0.1:3000` 下的文档。若页面包含脚本，可：

1. 点击行号设置断点；
2. 触发按钮或刷新；
3. 观察当前行、调用栈和局部变量；
4. 使用 Resume 恢复执行；
5. 完成后移除断点。

断点暂停时页面可能暂时无法交互，这不是页面永久卡死。Sources 中临时编辑或 Local Overrides 属于更进阶能力，未明确配置持久化前，不等同于保存磁盘源文件。

### 4.6 一次完整加载可能包含多个请求

本课首页只有文档，没有外部 CSS、图片和脚本，因此刷新时至少应看到文档请求，但不应凭空期待 CSS 请求。浏览器还可能请求：

- `/favicon.ico`；
-扩展注入资源；
- DevTools 自身触发的映射或辅助请求。

这些请求要按 URL 和 Initiator 判断归属。favicon 的 404 不等于首页 404。

### 4.7 刷新、缓存与保留日志

| 操作 | 用途 | 边界 |
| --- | --- | --- |
| 普通刷新 | 重新导航并加载页面 | 可能按缓存规则复用资源 |
| Network 的 Disable cache | DevTools 打开时绕开常规 HTTP 缓存观察 | 关闭 DevTools 后通常不生效 |
| Preserve log | 跨导航保留请求记录 | 会混入多个页面，需看时间和 URL |
| 清空 Network | 建立干净实验起点 | 不会清除浏览器所有存储 |
| Elements 修改后刷新 | 恢复响应重新解析的 DOM | 不会自动修改源文件 |

本课服务发送 `Cache-Control: no-store`，目的是减少缓存干扰，但不能用它解释所有刷新问题。打开错文件、未保存和服务未运行仍需分别检查。

### 4.8 截图是附件，不是全部证据

一张合格截图应：

- 只包含必要区域；
- 能看到关键 URL、状态或错误；
- 标注修复前或修复后；
- 遮盖账号、Cookie、Token、真实路径中的隐私和其他无关标签页；
- 配有文字说明和可重复步骤。

不要公开 Network 的完整 Cookie、Authorization、请求体或个人数据。本课没有真实凭据；以后遇到时只保留完成诊断所需的最小信息。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| Elements | 查看活动 DOM | 选中 `data` 元素 | 临时编辑通常不写回磁盘 |
| Console | 查询运行时 | `document.title` | 当前执行上下文可能变化 |
| Network | 记录请求 | 打开后刷新 | 打开前发生的请求可能未记录 |
| Sources | 查看加载资源与断点 | 点击脚本行号 | 暂停不等于进程崩溃 |
| Headers | 查看请求和响应元数据 | 核对状态与 Content-Type | 不显示页面最终 DOM |
| Response | 查看响应体 | 搜索商品标题 | 可能与脚本修改后的 DOM 不同 |
| Disable cache | 减少缓存干扰 | DevTools 打开时启用 | 不解决路径和保存问题 |
| Preserve log | 跨导航保留记录 | 调试跳转时启用 | 需清楚区分多次导航 |
| `document.querySelector` | 查询首个匹配元素 | `document.querySelector("data")` | 找不到返回 `null` |
| `location.href` | 当前文档 URL | 在 Console 读取 | 修改它会触发导航 |
| `performance.getEntriesByType` | 读取性能资源条目 | `performance.getEntriesByType("navigation")` | 不是 Network 的完整替代 |
| 截图 | 保存画面证据 | 浏览器或系统截图 | 不要暴露敏感字段 |

## 6. 最小可运行案例

这一案例用一个完整本地文件练习 Elements、Console 和 Sources，不需要服务器。

### 6.1 文件位置与完整代码

创建：

```text
market-learning/
└── devtools-minimum/
    └── evidence.html
```

`evidence.html`：

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DevTools 最小观察页</title>
</head>
<body>
  <main>
    <h1>可观察计数器</h1>
    <p id="status" role="status">按钮尚未点击</p>
    <button id="count-button" type="button">增加计数</button>
  </main>
  <script>
    const button = document.querySelector("#count-button");
    const status = document.querySelector("#status");
    let count = 0;

    button.addEventListener("click", () => {
      count += 1;
      status.textContent = `已点击 ${count} 次`;
      console.log("count-changed", { count });
    });

    console.info("page-ready", {
      title: document.title,
      url: location.href,
    });
  </script>
</body>
</html>
```

### 6.2 运行步骤

1. 保存并双击 `evidence.html`。
2. 打开 Console，确认有 `page-ready`。
3. 点击按钮两次，确认页面显示“已点击 2 次”，Console 有两条 `count-changed`。
4. 在 Elements 中把状态临时改成“已点击 99 次”。
5. 普通刷新，页面恢复为“按钮尚未点击”。
6. 在 Sources 中找到 `evidence.html`，在 `count += 1` 行设置断点。
7. 再点按钮，观察暂停；查看 `count`，然后 Resume。
8. 移除断点并关闭页面。

### 6.3 预期结果

- Console 消息有明确来源和结构化对象。
- 每次刷新都会重建 `count = 0`。
- Elements 临时修改不改变文件。
- 断点暂停时 `count` 是点击前的值，执行该行后才加一。
- Sources 中的文件内容与浏览器加载的本地源一致。

### 6.4 失败观察点

点击没反应时先看 Console 是否有语法错误，再确认按钮和脚本存在。找不到 Sources 文件时核对当前标签页 URL。断点一直暂停时点击 Resume 或移除断点，不要重启整台电脑。

### 6.5 明确错误示例

把脚本中的选择器临时改成：

```js
const button = document.querySelector("#count-buton");
```

少了一个 `t`，`button` 变成 `null`，下一行调用 `addEventListener` 会报 `TypeError`。修复选择器后保存、刷新，按钮应恢复，Console 不再出现该异常。这是代码故障，不是 HTTP 或缓存故障。

## 7. 邻里集市集成案例

本节使用前一课已经给出完整代码的 `market-start/index.html` 和 `market-start/server.mjs`，不复制第二份项目源码，避免两份首页漂移。

### 7.1 启动与证据起点

终端进入个人 `market-start`：

```bash
node server.mjs
```

打开 DevTools 的 Network，清空记录后访问：

```text
http://127.0.0.1:3000/
```

首页应显示自行车商品。当前数据来自静态 HTML，不是数据库或真实 API。

### 7.2 建立 200 证据

选择首页文档请求，记录：

```text
观察时间：2026-10-11，使用本机实际时区
页面地址：http://127.0.0.1:3000/
方法：GET
状态：200
响应类型：text/html; charset=utf-8
响应关键字：九成新自行车
DOM 价格：data.value 为 28000，文字为 280 元
服务终端：进程仍在运行，无读取错误
```

实际学习时用自己的准确时间替换记录中的观察时间；不要把教材日期冒充本机运行时间。

### 7.3 建立 404 证据

保留 Network 日志，访问：

```text
http://127.0.0.1:3000/missing
```

记录：

| 维度 | 观察 |
| --- | --- |
| 现象 | 页面显示“页面不存在” |
| URL | `/missing` |
| 方法 | GET |
| 状态 | 404 |
| Content-Type | `text/plain; charset=utf-8` |
| Response | `页面不存在` |
| 服务状态 | 仍在运行，可继续响应 |

然后返回 `/`，首页再次得到 200。这个复验说明修复动作只是访问正确路径，没有篡改服务器让错误路径返回假成功。

### 7.4 对照 Response、Sources 与 Elements

1. 在 Network Response 中搜索 `value="28000"`。
2. 在 Sources 的首页文档中搜索同一字符串。
3. 在 Elements 中选中 `data` 元素。
4. 在 Console 运行：

```js
const price = document.querySelector("data");
({
  text: price.textContent.trim(),
  value: price.value,
  source: location.href,
});
```

三处正常时共同证明：服务返回了 28000 分，浏览器加载了该源文本，DOM 中的机器值仍为 28000。它们仍不能证明真实交易价格，因为当前没有后端权威数据。

### 7.5 第一份可复核故障报告

```text
标题：首页错误路径返回 404

复现：
1. 在 market-start 运行 node server.mjs。
2. 打开 Network 并清空旧记录。
3. 访问 http://127.0.0.1:3000/missing。

现象：
页面显示“页面不存在”。

证据：
GET /missing 返回 404；
Content-Type 为 text/plain; charset=utf-8；
响应体为“页面不存在”；
服务终端没有退出。

原因：
教学服务只允许 / 和 /index.html。

修复：
访问 http://127.0.0.1:3000/。

复验：
GET / 返回 200；
Content-Type 为 text/html; charset=utf-8；
页面显示“九成新自行车”；
/missing 再次访问仍返回 404。

边界：
当前是静态教学页，没有账号、预约、持久化或真实交易。
```

这份报告包含成功与失败的对照，另一人可以复现，不依赖“我这里好了”的主观描述。

## 8. 常见错误与排查路径

### 8.1 面板选择表

| 现象 | 首要证据 | 不应先做什么 |
| --- | --- | --- |
| 页面完全打不开 | Network 与服务终端 | 先改 HTML 文案 |
| 收到 404 | URL、状态、Response | 清空全部浏览器数据 |
| 页面文字不对 | Response、Elements、源文件 | 终止所有 Node 进程 |
| 按钮点击报错 | Console、Sources、调用栈 | 把错误捕获后静默忽略 |
| 样式不生效 | Elements、Computed、CSS 请求 | 只看截图猜选择器 |
| 修改刷新后消失 | 编辑器保存状态、Elements | 把 DOM 临时改动当修复 |

### 8.2 完整五阶段记录

| 阶段 | 内容 |
| --- | --- |
| 现象 | 首页刷新后仍显示 280 元 |
| 证据 | Elements 临时显示 1 元；Network Response 仍是 280 元；源文件也是 280 元 |
| 原因 | 只修改了活动 DOM，没有修改磁盘源文件 |
| 修复 | 在正确的 `index.html` 中同步修改展示值和整数分机器值并保存 |
| 复验 | 新响应包含更新值，Elements 与 Console 查询一致，刷新后仍保留 |

### 8.3 常见错误

| 错误做法 | 风险 | 正确动作 |
| --- | --- | --- |
| 打开 Network 后不刷新 | 关键导航请求可能缺失 | 清空并重新加载 |
| 把 favicon 404 当首页失败 | 错误归因 | 比较请求 URL 和 Type |
| 截图包含 Cookie | 泄露会话信息 | 裁剪或遮盖，只保留必要字段 |
| 在 Elements 修复后结束 | 刷新即丢失 | 回源文件保存并复验 |
| 清空 Console 后说无错误 | 删除了证据 | 先记录来源和触发步骤 |
| 为消除红字吞掉异常 | 故障被隐藏 | 修复空值来源并回归行为 |

## 9. 课后题

<details>
<summary>1. Network Response 与 Elements 为什么可能不同？</summary>

Response 是服务器返回的源文本；浏览器解析后形成 DOM，解析器和 JavaScript都可能改变结构，开发者也可在 Elements 临时编辑。因此要根据问题同时比较两者。

</details>

<details>
<summary>2. 为什么应先打开 Network 再刷新？</summary>

Network 通常只记录开始监听后发生的请求。导航已完成再打开面板，初始文档请求可能没有记录；刷新能建立完整、可复核的新加载。

</details>

<details>
<summary>3. 首页有 favicon 404，能否说首页请求失败？</summary>

不能。要看失败请求的 URL 和 Type。favicon 是独立资源，首页文档仍可能是 200。可以单独处理图标，但不能把两个请求混为一谈。

</details>

<details>
<summary>4. Console 没有红色消息，是否证明功能正确？</summary>

不能。业务结果、状态码、DOM、无障碍和服务端日志仍可能错误。Console 是证据来源之一，不是完整验收。

</details>

<details>
<summary>5. 为什么截图不能替代复现步骤？</summary>

截图缺少操作顺序、输入、响应体和环境边界，也可能来自另一个时间或地址。复现步骤让他人能够重新产生并验证同一现象。

</details>

## 10. 实践练习

### 10.1 基础：建立首页观察清单

记录位置：`market-learning/learning-log.md`。启动首页后，分别从 Network、Elements 和 Console 记录 URL、状态、类型、标题、语言、价格机器值和 UTC 时间。

运行：`node server.mjs`。预期各面板结果互相一致。失败时先核对页面地址和源文件。完成标准是每个结论注明来自哪个面板或表达式。

参考答案标准：至少包含 GET、200、`text/html`、`zh-CN`、`28000` 和带 `Z` 的时间；不能只贴页面截图。

### 10.2 进阶：断点解释状态变化

使用第 6 节 `evidence.html`，在 `count += 1` 与 `status.textContent` 两行分别观察一次。记录每行执行前后的 `count` 与页面文字。

预期：第一行改变变量，第二行才更新 DOM。失败时检查断点位置和是否已 Resume。完成标准是用执行顺序解释变量状态与画面更新不是同一瞬间完成。

参考答案要点：点击事件进入时 `count` 保留上次值，加一后变量变化，赋值 `textContent` 后页面状态才变化。

### 10.3 故障注入：从 404 恢复

先打开 `/missing`，再回到 `/`。保存一张最小截图和一份文字报告，使用本课五阶段格式。

预期：错误路径 404，首页 200，服务全程未退出。截图必须隐藏无关个人信息。完成标准是另一人只按报告就能复现两种状态。

参考答案要点：根因是路径不受支持；修复不是让 `/missing` 返回 200，而是访问正确入口并保留 404 的协议语义。

## 11. 阶段验收

- [ ] 能说明四个关键面板分别观察哪一层。
- [ ] 能在 Elements 做临时修改并证明刷新恢复。
- [ ] 能在 Console 查询标题、语言、价格和时间。
- [ ] 能制造并解释一次可控 `TypeError`，修复后无异常。
- [ ] 能在 Network 捕获首页 200 与错误路径 404。
- [ ] 能在 Response 中找到服务返回的商品关键字。
- [ ] 能在 Sources 找到文件、设置断点、观察并恢复执行。
- [ ] 能解释 Disable cache 与 Preserve log 的作用和边界。
- [ ] 截图不包含 Cookie、Token 或无关隐私。
- [ ] 故障报告包含现象、证据、原因、修复、复验和能力边界。

提交证据：一份 200 记录、一份 404 记录、一次 DOM 临时修改对照、一次断点观察和完整故障报告。

## 12. 常见问题

**我的 DevTools 没有完全相同的标签名怎么办？**

浏览器和版本会调整界面。寻找等价能力：DOM 检查、运行时 Console、网络请求和源文件调试，而不是只记按钮位置。

**Network 为什么是空的？**

确认录制已开启，清空后刷新当前页面。若仍为空，核对 DevTools 是否属于当前标签页。

**Sources 里的代码能直接保存回文件吗？**

普通查看和临时编辑通常不会写回磁盘。Overrides 或工作区映射需要显式配置，本课不依赖它们；修复回到编辑器完成。

**应该一直启用 Preserve log 吗？**

不必。跨导航调试时有用，普通观察会混入旧请求。建立实验前清空并记录起点。

**如何证明不是缓存？**

先比较 URL、Response、源文件与保存状态。本课响应含 `no-store`；只有证据指向缓存时才研究缓存，不把它当默认解释。

## 13. 扩展阅读

以下官方资料于 **2026-10-11** 核验：

- [Chrome DevTools 文档](https://developer.chrome.com/docs/devtools/)：按面板查当前浏览器界面和能力。
- [Chrome DevTools Network](https://developer.chrome.com/docs/devtools/network/)：查请求记录、过滤、头和时序。
- [Chrome DevTools Console](https://developer.chrome.com/docs/devtools/console/)：查消息来源、表达式和上下文。
- [Chrome DevTools JavaScript debugging](https://developer.chrome.com/docs/devtools/javascript/)：查断点、单步和调用栈。
- [Firefox Developer Tools](https://firefox-source-docs.mozilla.org/devtools-user/)：在 Firefox 中寻找等价证据路径。
- [MDN：DOM introduction](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Introduction)：理解源文本与 DOM 对象的区别。
- [MDN：HTTP messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages)：核对请求和响应字段。

## 我现在能做到什么

我能选择正确的 DevTools 面板收集证据，而不是靠截图猜原因；能比较响应、源码、DOM 与运行时状态，并把一次失败写成别人可复现、可修复、可复验的记录。邻里集市首页现在不仅能打开，还拥有第一份可信的运行证据。

## 单元导航

[上一课：URL、HTTP 与第一张服务页面](02-url-http-first-page.md) · [文件与请求综合验收](../README.md#文件与请求综合验收) · [下一课：终端、进程与端口](../04-terminal-git-debugging/01-terminal-processes-ports.md) · [起步实操目录](../README.md)
