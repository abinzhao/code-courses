# U01：Web 应用、浏览器和服务器是什么

> 所属阶段：Web 与 HTML 基础
> 所属周次：W1
> 建议学习时间：8–10 小时
> 主线成果：完成 NoteFlow 公共内容首页的第一张静态草图，并用证据解释它为什么能显示

## 任务卡

你今天加入 NoteFlow 团队，产品经理发来一条看似简单的任务：

> “先做一个能打开的文章首页，后面我们再慢慢加内容、搜索、评论和发布流程。”

这句话里藏着一连串工程问题：

- “能打开”是打开本地文件，还是通过 HTTP 请求？
- 浏览器负责什么，服务器负责什么？
- 首页上的 CSS 为什么会触发第二个请求？
- 为什么页面不存在时应该返回 `404`，而不是一张空白页？
- 出现问题时，应该先看代码、Network 面板，还是终端日志？

本单元会完成一个不依赖框架的静态页面实验，并观察一次完整请求。

**本单元成果**

- [ ] 能启动 [U01 Web 运行时实验](../../labs/W01/U01-web-runtime/README.md)
- [ ] 能在浏览器 Network 面板找到 HTML 和 CSS 请求
- [ ] 能解释 `200`、`404`、`Content-Type` 和本地服务器日志
- [ ] 能说明浏览器、服务器、文件系统之间的职责边界
- [ ] 能完成一次故障排查并留下证据

## 1. 任务背景

NoteFlow 的公共内容侧最终会包含文章、标签、分类、搜索和评论。可是一个真正的 Web 应用不会从“完整系统”开始，它通常先从一个能被打开、能被观察、能被提交的最小切片开始。

第一张草图只需要：

1. 一个首页；
2. 一个文章入口；
3. 一份样式表；
4. 一个可以返回这些文件的本地服务器；
5. 一份能说明请求结果的观察记录。

这里的“服务器”不是云上的神秘机器。它可以是你电脑上一个正在监听端口的 Node.js 进程。它收到浏览器的请求后，在实验目录里找文件，再把文件内容作为 HTTP 响应返回。

先把产品任务缩小到可以观察的范围，后面学习 HTML、CSS、JavaScript、React、NestJS 时，你会更容易知道新技术到底替代了哪一部分工作。

## 2. 学习目标

完成本单元后，你应能：

- 拆解 URL 的协议、主机、端口、路径和查询参数。
- 用自己的话描述浏览器从导航到页面初次显示的主要过程。
- 区分浏览器、HTTP 服务器、文件系统和 HTML 文档的职责。
- 解释一次 `GET` 请求的请求行、响应状态码、响应头和响应体。
- 根据 Network 面板判断某个资源是否成功返回、返回了什么类型。
- 使用 Node.js 启动一个静态服务器，并说明它如何决定返回哪个文件。
- 区分通过 `file://` 打开文件和通过 `http://localhost` 访问服务器的差异。
- 根据“现象、证据、原因、修复、复验”完成一条排查记录。

本单元不会要求你掌握 DNS、TCP、TLS 或浏览器渲染管线的全部细节。你需要先建立可靠的运行模型，深入内容会在后续[学习路径](../../00-course-map/01-learning-path.md)中展开。

## 3. 预备知识

开始前，你需要：

- 能打开终端并输入命令。
- 知道文件和文件夹的基本区别。
- 知道如何使用浏览器打开地址和打开开发者工具。
- 安装 Node.js 18 或更高版本。

如果你还不熟悉终端和 Git，可以先运行下一单元的[开发环境实验](../../labs/W01/U02-dev-environment/README.md)，但建议仍然先读完本单元的请求模型。

本单元不要求：

- React、Vue 或任何前端框架；
- 数据库；
- 真实云服务器；
- 复杂的后端业务代码。

## 4. 核心理论

### 先看结果

进入实验目录并启动服务器：

```bash
cd web-fullstack-course/labs/W01/U01-web-runtime
node server.mjs
```

你会看到：

```text
NoteFlow U01 server running at http://localhost:4173
```

打开 `http://localhost:4173/`，页面会显示“页面为什么能出现？”。此时服务器终端会多出一行类似：

```text
GET / -> 200
```

打开浏览器 DevTools 的 **Network** 面板，刷新页面。你至少会看到：

| 请求 | 状态 | 类型 | 触发原因 |
| --- | ---: | --- | --- |
| `/` | 200 | document | 浏览器需要首页文档 |
| `/styles.css` | 200 | stylesheet | HTML 中的 `<link>` 需要样式表 |

点击“打开第一篇文章”，你会看到：

```text
GET /article.html -> 200
GET /styles.css -> 200
```

再访问 `http://localhost:4173/missing.html`：

```text
GET /missing.html -> 404
```

这几行日志已经回答了一半问题：浏览器会发起请求，服务器会做路径映射并给出结果，页面中的资源又可能触发更多请求。

### 4.1 URL 是一张地址卡片

一个 URL 可以写成：

```text
https://docs.example.com:443/articles/first?mode=reading#intro
|      |                |   |               |            |
协议   主机             端口 路径            查询参数     片段
```

在本地实验中：

```text
http://localhost:4173/article.html
|      |         |    |
协议   主机      端口 路径
```

- `http` 表示使用 HTTP 访问。
- `localhost` 表示当前电脑。
- `4173` 是服务器监听的端口。
- `/article.html` 是服务器需要查找的资源路径。

端口不是文件夹，也不是“服务器地址”。它更像电脑上的一个入口编号。不同进程可以监听不同端口；同一个端口在同一时间通常只能由一个进程监听。

### 4.2 浏览器从导航到页面显示

当你在地址栏输入 `http://localhost:4173/` 并回车时，可以先用下面的简化模型理解：

```text
1. 浏览器解析 URL
2. 浏览器找到 localhost 对应的本机地址
3. 浏览器连接 4173 端口
4. 浏览器发送 HTTP GET /
5. Node.js 服务器把 / 映射到 index.html
6. 服务器返回状态码、响应头和 HTML 内容
7. 浏览器解析 HTML，发现 styles.css
8. 浏览器再次请求 styles.css
9. 浏览器应用 CSS，计算布局并绘制页面
```

这不是完整的浏览器实现细节，但它足够帮助你定位第一批问题：

- 第 4 步没有发生：可能是地址、网络或浏览器导航问题。
- 第 5 步找不到文件：服务器可能返回 `404`。
- 第 7 步发现资源但第 8 步失败：可能是链接路径或文件名错误。
- HTML 和 CSS 都成功，但页面视觉不对：问题可能在 CSS 或渲染规则。

DNS、TCP/TLS、渲染管线和合成层会在后续单元展开。现在的关键不是背完所有层，而是知道每一层可以在哪里被观察。

### 4.3 浏览器和服务器各自负责什么

| 角色 | 主要职责 | 在 U01 中的证据 |
| --- | --- | --- |
| 浏览器 | 解析 URL、发请求、解析 HTML/CSS、显示页面 | 地址栏、Network、Elements |
| HTTP 服务器 | 接收请求、找到资源、返回状态码和响应内容 | 终端请求日志、响应头 |
| 文件系统 | 保存 `index.html`、`article.html` 和 `styles.css` | 实验目录中的文件 |
| HTML 文档 | 描述页面内容和资源关系 | `<h1>`、`<a>`、`<link>` |
| CSS 文件 | 描述视觉样式和布局规则 | `/styles.css` 请求和页面外观 |

浏览器不是服务器。你可以在浏览器中打开一个页面，但浏览器不会自动替你寻找项目目录里的文件。服务器也不是页面本身，它只负责按照请求返回资源；页面如何解析和显示由浏览器完成。

### 4.4 HTTP 请求和响应

浏览器访问首页时，概念上会发送：

```http
GET / HTTP/1.1
Host: localhost:4173
Accept: text/html
```

服务器可能返回：

```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 1226

<!doctype html>
<html lang="zh-CN">
  ...
</html>
```

请求可以理解为“我想要什么”，响应可以理解为“结果是什么”。初学阶段先关注四个字段：

- **方法**：`GET` 通常表示读取资源。
- **路径**：例如 `/article.html`。
- **状态码**：例如 `200` 表示成功，`404` 表示资源不存在。
- **响应头**：例如 `Content-Type` 告诉浏览器如何理解响应体。

状态码不是装饰。浏览器、缓存、监控工具和测试代码都会根据状态码做判断。如果缺失页面也返回 `200`，调用方就很难区分“页面真的存在”和“服务器返回了一张错误内容”。

### 4.5 为什么 CSS 会产生第二个请求

浏览器收到首页 HTML 后，发现：

```html
<link rel="stylesheet" href="/styles.css" />
```

这不是把 CSS 内容直接写进 HTML，而是告诉浏览器：“还需要读取另一个资源”。浏览器因此发起：

```http
GET /styles.css HTTP/1.1
Host: localhost:4173
Accept: text/css
```

服务器根据 `.css` 扩展名返回：

```http
Content-Type: text/css; charset=utf-8
```

如果文件存在但响应类型错误，浏览器可能不会按预期应用它。如果文件名写成 `style.css`，而实际文件叫 `styles.css`，请求就会得到 `404`。

这个过程会继续扩展：

- `<img src="...">` 会触发图片请求。
- `<script src="...">` 会触发脚本请求。
- `<video>` 和 `<source>` 可能触发媒体请求。
- JavaScript 的 `fetch()` 会在运行时发起请求。

页面是资源关系的集合，不是一份孤立的文本。

### 4.6 静态服务器和业务 API 的边界

U01 的服务器只做一件事：把实验目录中的文件返回给浏览器。它不会：

- 查询用户；
- 校验登录；
- 写入数据库；
- 判断文章是否发布；
- 计算复杂业务规则。

它属于静态文件服务器。后续 NestJS API 会返回 JSON，并执行认证、权限和数据库操作：

```text
静态服务器：
GET /article.html -> 返回 HTML 文件

业务 API：
GET /api/articles/1 -> 查询数据库并返回 JSON
```

两者都使用 HTTP，但职责不同。把静态页面、前端交互、业务 API 和数据库混成一个概念，会让后面的故障定位变得困难。

### 4.7 `file://` 和 `http://` 的差异

双击 `index.html` 时，浏览器可能使用：

```text
file:///Users/you/project/index.html
```

通过服务器访问时使用：

```text
http://localhost:4173/
```

两者都可能显示 HTML，但运行条件不同：

| 对比项 | `file://` | `http://localhost` |
| --- | --- | --- |
| 是否经过 HTTP | 否 | 是 |
| 是否有请求/响应状态码 | 没有标准 HTTP 请求记录 | 有 |
| 是否能练习服务器日志 | 不能 | 能 |
| URL 路径 | 本地文件路径 | 服务器资源路径 |
| 适合 U01 吗 | 只能做静态预览 | 适合观察 Web 运行模型 |

当教程要求观察请求、状态码和响应头时，必须使用 HTTP 服务器。

### 拆开看：服务器如何决定返回哪个文件

打开 `labs/W01/U01-web-runtime/server.mjs`，关注下面这几个步骤：

1. `createServer` 创建一个监听请求的服务器。
2. `new URL(requestUrl, ...)` 解析请求路径。
3. `/` 被映射到 `index.html`。
4. `path.resolve` 生成实验目录内的绝对路径。
5. `stat` 确认文件存在。
6. `readFile` 读取文件内容。
7. `writeHead` 设置状态码、类型和长度。
8. `response.end` 把内容交给浏览器。

服务器还会检查最终路径是否仍在实验目录内。即使本单元只服务静态文件，也不能因为“只是教学示例”就让任意 URL 读取电脑上的其他文件。

### 常见反例：只看页面，不看请求

下面的判断不够可靠：

> “浏览器里看到了字，所以功能是好的。”

页面可能是缓存中的旧版本，CSS 可能是另一份文件，错误页面也可能被错误地返回了 `200`。更可靠的判断包括：

- Network 中看到请求确实发出；
- 状态码符合资源是否存在的事实；
- `Content-Type` 与资源类型匹配；
- 终端日志与浏览器请求互相对应；
- 清除缓存或禁用缓存后仍能复现。

## 5. 标签、属性、API 或配置清单

| 名称 | 作用 | U01 示例 | 常见边界 |
| --- | --- | --- | --- |
| URL | 描述资源位置和访问方式 | `http://localhost:4173/` | `file://` 不等同于 HTTP |
| `GET` | 读取资源的 HTTP 方法 | `GET /article.html` | 不要把写入操作伪装成读取 |
| `200` | 请求成功 | 首页和文章页 | 不能用 `200` 表示资源不存在 |
| `404` | 资源不存在 | `/missing.html` | 不代表服务器进程一定崩溃 |
| `Content-Type` | 描述响应体类型 | `text/html`、`text/css` | 类型错误会影响解析 |
| `Content-Length` | 描述响应体字节长度 | 服务器自动计算 | 不能用字符数替代字节数 |
| `Cache-Control` | 控制缓存策略 | `no-store` | 实验禁缓存不等于生产最佳配置 |
| `localhost` | 当前机器的主机名 | `localhost:4173` | 其他设备不能自动访问你的 localhost |
| 端口 | 进程监听的入口编号 | `4173` | 被占用时启动会失败 |
| `createServer` | 创建 Node.js HTTP 服务器 | `createServer(handler)` | 生产服务还需要日志、安全和优雅退出 |
| `fs/promises` | 异步访问文件系统 | `readFile`、`stat` | 必须处理文件不存在和权限错误 |
| `path.resolve` | 生成规范化路径 | 解析资源路径 | 必须检查路径是否越出资源根目录 |
| Network 面板 | 观察请求和响应 | 文档、CSS、404 | 面板显示的是浏览器视角，不替代服务端日志 |

## 6. 最小可运行案例

### 文件位置

```text
web-fullstack-course/labs/W01/U01-web-runtime/
├── README.md
├── index.html
├── article.html
├── styles.css
└── server.mjs
```

### 运行命令

从仓库根目录执行：

```bash
cd web-fullstack-course/labs/W01/U01-web-runtime
node --check server.mjs
node server.mjs
```

另开一个终端验证 HTTP 响应：

```bash
curl -i http://localhost:4173/
curl -i http://localhost:4173/article.html
curl -i http://localhost:4173/missing.html
```

如果端口被占用：

```bash
PORT=4174 node server.mjs
curl -i http://localhost:4174/
```

### 关键代码

服务器的路径映射逻辑位于：

```text
web-fullstack-course/labs/W01/U01-web-runtime/server.mjs
```

核心流程可以压缩成：

```js
const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
const candidatePath = path.resolve(rootDirectory, relativePath);
const fileBody = await readFile(candidatePath);

response.writeHead(200, {
  'Content-Type': mimeTypes.get(path.extname(candidatePath)),
});
response.end(fileBody);
```

实验中的完整实现还增加了 404、403/路径边界、HEAD、MIME 类型、请求日志和信号退出处理。不要把这个压缩片段直接复制到生产项目；它的作用是帮助你抓住请求到文件的主链路。

### 预期结果

首页响应头中应出现：

```text
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
```

文章页面同样返回 `200`。不存在的文件返回：

```text
HTTP/1.1 404 Not Found
Content-Type: text/plain; charset=utf-8
```

### 失败时的诊断

按下面的顺序排查，不要一开始就修改所有文件：

1. **现象**：终端没有出现服务器启动地址。
   **证据**：`node --check server.mjs` 或启动命令的错误输出。
   **原因**：语法错误、Node.js 不可用或端口被占用。
   **修复**：先修复语法或切换 `PORT`，再重新启动。
   **复验**：看到启动地址，并用 `curl -i` 获取响应。
2. **现象**：首页是 `404`。
   **证据**：Network 的 Request URL 和终端日志路径。
   **原因**：启动目录不对、文件名不对或请求路径不是 `/`。
   **修复**：从 U01 实验目录启动，确认 `index.html` 存在。
   **复验**：`curl -i http://localhost:4173/` 返回 `200`。
3. **现象**：文字出现但页面没有样式。
   **证据**：`/styles.css` 请求状态码和响应类型。
   **原因**：链接路径、文件名或 MIME 类型错误。
   **修复**：对照 `index.html` 的 `href` 和实验目录文件名。
   **复验**：刷新后 CSS 请求返回 `200` 和 `text/css`。
4. **现象**：改了 HTML 但浏览器内容没变化。
   **证据**：Network 的 Response、是否禁用缓存、服务器启动目录。
   **原因**：访问了另一个目录、服务器没有重启或缓存了旧响应。
   **修复**：确认 URL、终端日志和当前文件路径，Network 勾选 Disable cache 后刷新。
   **复验**：在 Response 中看到新文本。

## 7. NoteFlow 集成案例

### 7.1 产品切片

U01 的产品成果不是“做了一个漂亮页面”，而是为 NoteFlow 建立第一块可观察的公共内容入口：

```text
首页 -> 第一篇文章
```

首页通过 `index.html` 表达产品名称、任务标题和文章入口；文章页通过 `article.html` 提供一段静态内容；`styles.css` 让两个页面共享视觉语言。

### 7.2 为什么先做静态页面

此时还没有：

- 文章数据库；
- 用户登录；
- Markdown 编辑器；
- 搜索接口；
- 发布审核状态。

先用静态文件把“访客能看到什么”固定下来，有三个好处：

1. 可以独立验证浏览器和 HTTP，不被后端业务干扰。
2. 可以先讨论信息结构，后面再选择 HTML 标签。
3. 每次增加技术复杂度时，都能知道它替代了哪一步。

### 7.3 为后续单元留下边界

W2 会把当前的 `main`、`section`、`article` 和链接结构进一步语义化；W5 以后会把颜色、间距和布局抽成 CSS 系统；W13 以后会用 JavaScript 添加搜索和阅读状态；W38 以后才把文章从文件替换成 API 和数据库数据。

这就是连续项目的节奏：每次只增加一个新问题，同时保护前面已经验证过的行为。

## 8. 常见错误与排查路径

### 错误一：把浏览器地址栏当成服务器

- **现象**：学习者说“我已经打开浏览器，所以服务器应该在工作”。
- **证据**：地址是 `file://`，终端没有启动 Node.js 进程，也没有请求日志。
- **原因**：浏览器只是客户端；双击文件不代表有 HTTP 服务器。
- **修复**：在实验目录运行 `node server.mjs`，通过 `http://localhost:4173/` 访问。
- **复验**：Network 出现 document 请求，终端出现 `GET / -> 200`。

### 错误二：把 `404` 当成服务器崩溃

- **现象**：访问 `/missing.html` 得到 `404`，学习者认为服务器坏了。
- **证据**：服务器仍在运行，可以继续访问首页；日志显示 `GET /missing.html -> 404`。
- **原因**：服务器进程正常，只是资源不存在。
- **修复**：确认 URL 是否拼错；如果资源本来就不存在，保留 `404`。
- **复验**：首页仍返回 `200`，缺失资源仍返回 `404`。

### 错误三：只修改 HTML，不看资源请求

- **现象**：页面结构正确，但样式没有变化。
- **证据**：`styles.css` 返回 `404` 或返回类型不是 `text/css`。
- **原因**：`href`、文件名、服务器根目录或 MIME 映射不一致。
- **修复**：逐项对照请求路径、磁盘文件和响应头。
- **复验**：Network 中的 CSS 请求为 `200`，页面样式出现。

### 错误四：服务器根目录过宽

- **现象**：服务器代码用一个不受限制的路径拼接请求路径。
- **证据**：请求路径包含 `..` 时，最终文件可能落到实验目录之外。
- **原因**：没有检查规范化后的路径是否仍在资源根目录。
- **修复**：使用 `path.resolve` 后配合 `path.relative` 检查边界。
- **复验**：目录外资源不会被返回，正常页面仍能访问。

## 9. 课后题

### 理解题

1. 为什么打开 `index.html` 后还可能出现 `styles.css` 请求？
2. `200` 和 `404` 分别表达什么事实？为什么不能让所有响应都返回 `200`？
3. 浏览器和服务器谁负责解析 HTML？服务器是否知道页面最终长什么样？
4. `localhost:4173` 中的 `localhost` 和 `4173` 各代表什么？
5. 为什么 U01 使用 `http://localhost`，而不是直接双击文件？

### 推理题

假设首页 HTML 返回 `200`，但 Network 中 `styles.css` 返回 `404`。请按以下格式写出判断：

```text
现象：
证据：
最可能原因：
下一步检查：
修复：
复验：
```

### 设计题

如果 NoteFlow 后面要增加一个 `/api/articles` 接口，为什么不能简单地让静态服务器把 `api` 当作一个 HTML 文件夹？请比较静态资源返回和业务 API 返回的不同职责。

## 10. 实践练习

### 基础练习：新增一个关于页面

在 `labs/W01/U01-web-runtime/` 中新增 `about.html`：

- 显示 NoteFlow 的一句产品介绍；
- 复用 `styles.css`；
- 在首页增加指向 `/about.html` 的入口；
- 在 Network 面板中记录新增请求。

提交：

```bash
curl -i http://localhost:4173/about.html
```

### 提升练习：增加一类静态资源

新增一个 `script.js`，让首页加载后在控制台输出：

```text
NoteFlow U01 script loaded
```

然后：

- 为 `.js` 扩展名设置正确的 `Content-Type`；
- 观察 JavaScript 请求；
- 说明静态脚本和后续 API 请求的差异。

### 故障练习：制造并修复一次 404

把首页中的 `href="/article.html"` 临时改成 `href="/articles.html"`，点击链接并记录：

1. 浏览器地址；
2. Network 状态码；
3. 终端日志；
4. 修复前后的差异。

恢复正确路径后，再跑一次 U01 验收。

### 观察练习：比较两种访问方式

先用浏览器直接打开 `index.html`，再启动服务器打开 `http://localhost:4173/`。写出至少三项差异，并说明哪种方式适合观察 HTTP。

## 11. 阶段验收

### 功能验收

- [ ] 从 U01 实验目录执行 `node server.mjs` 能启动服务器。
- [ ] `/` 返回首页，`/article.html` 返回文章，`/missing.html` 返回 `404`。
- [ ] 首页和文章页都成功加载 `/styles.css`。
- [ ] 服务器日志包含方法、路径和状态码。
- [ ] 服务器不会把实验目录之外的文件作为正常资源返回。

### 解释验收

- [ ] 能画出 URL 到页面显示的请求链。
- [ ] 能说清浏览器、服务器和文件系统的职责。
- [ ] 能解释 `GET`、`200`、`404`、`Content-Type` 和端口。
- [ ] 能用 Network 和终端日志互相验证一次请求。

### 提交材料

- **代码路径**：`web-fullstack-course/labs/W01/U01-web-runtime/`
- **运行命令**：`node server.mjs`
- **浏览器证据**：首页、文章页、CSS 和 404 请求记录
- **终端证据**：对应的 `GET` 日志
- **排查记录**：一次 CSS 404 或端口问题的完整记录
- **已知问题**：当前服务器只服务静态文件，不提供动态数据和生产级安全能力
- **下一步改进**：在 W2 使用更完整的 HTML 语义表达公共内容

## 12. 常见问题

### 为什么页面显示了，就说明 HTML 请求成功了吗？

不一定。页面可能来自浏览器缓存，也可能是之前打开过的文件。刷新并在 Network 面板中查看 document 请求，才能确认当前导航的网络结果。

### `localhost` 能让同一局域网的同学访问吗？

通常不能。`localhost` 指向访问者自己的电脑。要让其他设备访问，需要监听可访问的网络地址，并处理防火墙、端口和安全边界；本单元不把实验服务器暴露到网络。

### 为什么服务器要设置 `Content-Type`？

响应体只是字节。`Content-Type` 帮助浏览器判断这些字节应该按 HTML、CSS、JavaScript、图片还是普通文本理解。类型不匹配时，浏览器的解析行为可能不符合预期。

### 静态服务器是不是后端？

它属于后端运行时的一种最小形态，因为它在服务器进程中处理 HTTP 请求；但它没有 NoteFlow 的业务规则、数据库和认证授权。后续的 NestJS API 会在这个基础上增加业务能力。

### 为什么实验代码处理 `HEAD` 请求？

`HEAD` 允许客户端只请求响应头而不需要响应体。浏览器和工具可能使用它做资源检查。U01 不要求你完整实现所有 HTTP 方法，但看到方法限制和响应头处理，可以建立“请求方法影响服务器行为”的直觉。

## 13. 扩展阅读

- [MDN：URL](https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL)
- [MDN：HTTP 概览](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Overview)
- [MDN：HTTP 响应状态码](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Reference/Status)
- [MDN：HTTP 消息](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Guides/Messages)
- [Chrome DevTools：Network 面板](https://developer.chrome.com/docs/devtools/network/)
- [Node.js：HTTP 模块](https://nodejs.org/api/http.html)

## 我现在能做到什么

完成本单元后，我能够：

- 从 URL、Network 面板和终端日志还原一次页面请求。
- 启动一个最小静态服务器，并让它返回 HTML、CSS 和正确状态码。
- 解释浏览器、服务器和文件系统各自负责什么。
- 遇到页面空白、样式缺失或 `404` 时，先收集证据再修改代码。

## 单元导航

- 上一单元：这是 W1 的第一个单元。
- [下一单元：终端、文件系统、Git 与开发环境](./02-terminal-filesystem-git.md)
- [返回 Web 与 HTML 基础](../README.md)
