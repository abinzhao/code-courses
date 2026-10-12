# 来源隔离、CORS 与跨窗口通信

<!-- course-meta:start -->
> - 层级：L0，实验在 L1 Fetch 与 DOM 事件后完成
> - 先修：[HTTP 协议](../05-网络基础与HTTP/01-HTTP协议与版本演进.md)、[Fetch 与存储](../../L1-JavaScript与TypeScript/01-JavaScript语法核心/07-Fetch-表单与浏览器存储.md)
> - 建议用时：180 分钟
> - 一手资料：[同源策略](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)、[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
<!-- course-meta:end -->

## 学习目标

- 能区分 origin、site 与 URL 路径。
- 能根据 Network 记录判断请求未发送、响应不可读或服务端拒绝。
- 能实现有来源与窗口校验的 `postMessage` 接收器。

## 内容讲解

### 1. 同源判断与站点判断

origin 由协议、主机、端口组成。`http://127.0.0.1:4173/a` 与 `/b` 同源，改为端口 4174 则跨源；`localhost` 与 `127.0.0.1` 也是不同主机。

site 通常按协议和可注册域名判断，用于 SameSite 等策略。`https://app.example.com` 与 `https://api.example.com` 可以同站但不同源。不能用“同一个公司的域名”代替任何一种平台判断。

| 操作 | 跨源常见行为 | 注意点 |
|---|---|---|
| Fetch 读取响应 | 受 CORS 控制 | 服务端返回 200 也可能不可读 |
| 图片、脚本加载 | 许多情形可嵌入 | CORP、CSP、MIME 等还会限制 |
| 表单导航 | 许多情形可提交 | 因而需要服务端 CSRF 防护 |
| iframe DOM 访问 | 同源策略限制 | 可通过显式消息协议合作 |
| Canvas 读取跨源图片像素 | 可能被污染 | 加载成功不等于可导出像素 |

### 2. 建立双端口实验

在两个独立练习目录分别运行静态服务，端口使用 4173 和 4174；不要修改 Atlas 起点。前端在 4173，API 在 4174。API 端可复制以下完整服务到 `cors-server.mjs`：

```js
import http from 'node:http';

const allowedOrigin = 'http://127.0.0.1:4173';
http.createServer((req, res) => {
  // 仅为已登记来源授予读取能力；CORS 不是用户鉴权。
  if (req.headers.origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204).end();
    return;
  }
  if (req.url !== '/api/ping' || req.method !== 'GET') {
    res.writeHead(404).end();
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message: 'pong' }));
}).listen(4174, '127.0.0.1');
```

运行 `node cors-server.mjs`，在 4173 页面执行：

```js
const response = await fetch('http://127.0.0.1:4174/api/ping');
console.log(await response.json());
```

预期得到 `pong`。删掉允许来源分支后，服务端仍可收到 GET，但浏览器拒绝脚本读取响应。用 curl 请求同一 API 不受浏览器 CORS 限制，这证明 CORS 不是访问控制。

### 3. 预检与凭据

跨源 JSON POST、自定义请求头或非 safelisted 方法通常触发 OPTIONS 预检；是否触发还取决于具体请求头和值。预检成功才会发送实际请求，缓存命中的预检不一定每次可见。

`credentials: 'include'` 只表达携带凭据的意愿，还受 Cookie 的 SameSite、Secure 和浏览器第三方策略约束。有凭据的 CORS 需要精确来源及 `Access-Control-Allow-Credentials: true`，不能搭配来源 `*`。

`mode: 'no-cors'` 返回 opaque 响应，不能读取状态、正文或任意请求头，不是解决 API CORS 问题的办法。

### 4. 跨窗口消息

父页面拥有自己创建的 iframe 引用，接收消息时同时检查发送来源和窗口：

```js
const frame = document.querySelector('iframe');
const childOrigin = 'http://127.0.0.1:4174';

window.addEventListener('message', (event) => {
  if (event.origin !== childOrigin) return;
  if (event.source !== frame.contentWindow) return;
  const data = event.data;
  if (!data || data.type !== 'atlas:height') return;
  if (!Number.isInteger(data.height)) return;
  frame.style.height = `${Math.max(100, Math.min(data.height, 800))}px`;
});

frame.addEventListener('load', () => {
  frame.contentWindow.postMessage({ type: 'atlas:init' }, childOrigin);
});
```

子页面通过 `parent.postMessage({ type: 'atlas:height', height: 320 }, 'http://127.0.0.1:4173')` 回传。未知 type、字符串高度和其他窗口的消息均应被忽略。来源合法不代表消息字段安全。

## 常见问题

**为什么服务端返回了 200，Fetch 仍报错？** HTTP 成功与浏览器允许脚本读取是两层判断，检查响应 CORS 头及 Console。

**CORS 能阻止 CSRF 吗？** 不能完整阻止。表单和某些简单请求能发送，服务端必须校验写操作的身份与 CSRF 约束。

**sandbox iframe 是否始终有原来源？** 没有 `allow-same-origin` 时会形成 opaque origin，消息可能显示 `"null"`。不能仅按 `"null"` 放行所有消息。

## 实操作业

1. 基础：运行双端口 GET，提交允许与拒绝时的 Network 和 Console 记录。
2. 进阶：先为 `/api/ping` 增加有界 POST/PUT 处理与请求计数，再许可对应方法。JSON POST 测试遗漏 Allow-Headers；非 safelisted 的 PUT 测试遗漏 Allow-Methods，分别区分预检和实际请求。POST 本身是 safelisted 方法，不能仅因遗漏 Allow-Methods 就预设它必被阻止。
3. 挑战：实现上述 iframe 高度协议，测试伪造 type、其他 iframe、超大高度。

### 参考答案与验收

- 普通跨源 GET 可以先到达服务端，但缺少许可时响应不可读；预检不通过时实际 POST 不应到达。
- 接收器必须同时限制 origin、source、type 和数据范围，输出高度上限 800。
- 报告写明两个 URL、请求方法、许可响应头、实际服务端请求计数。仅截错误提示不足以区分根因。

<!-- atlas-task:start -->
## Atlas 项目任务

让 Atlas 预览一个独立来源的文章框架，使用受限消息调整高度。验收正常消息生效、其他窗口无法改变布局；关联 [L0 里程碑](../../projects/atlas/milestones/L0.md)。
<!-- atlas-task:end -->

---

## 本节小结

同源策略保护跨源读取，CORS 提供有限读取许可，写操作安全仍依赖服务端。跨窗口通信必须显式建立来源、窗口和字段契约。

<!-- course-nav:start -->
---

[上一篇：04-重排重绘与性能影响](./04-重排重绘与性能影响.md) · [课程地图](../../README.md) · [下一篇：页面生命周期、bfcache 与资源调度](./06-页面生命周期-bfcache与资源调度.md)
<!-- course-nav:end -->
