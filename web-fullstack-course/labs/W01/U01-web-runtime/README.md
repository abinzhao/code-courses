# U01 实验：观察一次 HTTP 请求

## 实验目标

你会启动一个只有 Node.js 原生模块的静态服务器，然后在浏览器中观察：

- 首页 HTML 请求
- CSS 样式表请求
- 点击文章后的第二次 HTML 请求
- 不存在资源的 `404`
- 服务器日志中的方法、路径和状态码

完整解释见[U01 教程：Web 应用、浏览器和服务器是什么](../../../00-common/W01-web-foundations/01-web-app-browser-server.md)。

## 环境

- Node.js 18 或更高版本
- 任意现代浏览器
- 终端

## 启动服务器

在当前实验目录执行：

```bash
node server.mjs
```

预期输出：

```text
NoteFlow U01 server running at http://localhost:4173
```

打开 <http://localhost:4173/>。

## 观察步骤

1. 打开浏览器 DevTools，切换到 **Network** 面板。
2. 勾选 **Disable cache**，刷新首页。
3. 找到 `/` 或 `index.html` 请求，记录状态码、响应类型和大小。
4. 找到 `/styles.css` 请求，确认它是 CSS 响应。
5. 点击“打开第一篇文章”，确认出现 `/article.html` 请求。
6. 在地址栏访问 <http://localhost:4173/missing.html>，确认返回 `404 Not Found`。
7. 回到终端，观察每一次请求的日志。

建议记录：

| 请求 | 状态码 | 响应类型 | 谁负责 |
| --- | ---: | --- | --- |
| `/` | 200 | `text/html` | 服务器找到 `index.html`，浏览器解析文档 |
| `/styles.css` | 200 | `text/css` | 服务器返回样式，浏览器应用规则 |
| `/article.html` | 200 | `text/html` | 浏览器根据链接发起新请求 |
| `/missing.html` | 404 | `text/plain` | 服务器说明资源不存在 |

## 常见错误

### 端口已经被占用

现象：启动时出现 `EADDRINUSE`。

修复：先在当前终端按 `Ctrl-C` 停掉已有服务器，或者使用另一个端口：

```bash
PORT=4174 node server.mjs
```

然后打开 <http://localhost:4174/>。

### 页面能打开但没有样式

在 Network 面板查看 `/styles.css`：

- 状态码不是 `200`：检查文件名和服务器目录。
- 响应类型不是 `text/css`：检查服务器的 MIME 类型映射。
- 请求根本没有出现：检查 `index.html` 中的 `<link>` 路径。

### 直接双击 HTML 文件

`file://` 可以让浏览器读取本地文件，但不会经过 HTTP 服务器。这个实验的目标是观察请求、响应和状态码，因此必须通过 `http://localhost:4173/` 访问。

## 停止服务器

回到运行服务器的终端，按：

```text
Ctrl-C
```

看到 `Received SIGINT; stopping server.` 后，端口会被释放。
