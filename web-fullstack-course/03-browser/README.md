# 03 · 浏览器与 Web 平台：用证据解释网页为什么这样工作

浏览器既是页面的运行环境，也是网络、安全、存储和性能边界的执行者。本卷不把 DevTools 截图或 API 名称当作结论，而是要求用可重复实验回答：请求在哪一层失败、页面为何没有及时呈现、数据由谁拥有、异步结果是否仍然有效，以及一次本机测量能证明什么。

## 本卷定位与教材结构

本 README 统筹章节顺序、运行契约与本卷验收，学习路线直接连接详细教程；前置、练习和阶段验收以每篇正文为准。覆盖矩阵只用于审计知识点归属，不替代正文。

下方仅作导航职责示意，不是当前文件清单；实际路径以学习路线中的可点击正文链接为准。

```text
03-browser/
├── README.md                         卷入口、运行契约与最终验收
├── 01-...md 至 06-...md              稳定章入口
├── 01-.../ 至 06-.../                详细教程
└── BROWSER-COVERAGE.md               审计矩阵
```

## 学习路线

### 01 请求、HTTP 与缓存

| 顺序 | 详细教程 | 学习结果 |
| --- | --- | --- |
| 1 | [URL、DNS、连接与 TLS](01-network-http-cache/01-url-dns-connections-tls.md) | 按 URL、名称解析、连接和 TLS 分层定位请求目标与失败 |
| 2 | [HTTP 消息、状态与协商](01-network-http-cache/02-http-messages-status-negotiation.md) | 按方法、状态、媒体类型、编码和消息边界处理响应 |
| 3 | [缓存验证、CORS 与观测](01-network-http-cache/03-cache-validation-cors-observation.md) | 复现条件请求、跨源读取与服务端到达证据 |

### 02 渲染、事件循环与交互

| 顺序 | 详细教程 | 学习结果 |
| --- | --- | --- |
| 1 | [DOM、CSSOM、布局、绘制与合成](02-rendering-event-loop/01-dom-cssom-layout-paint-composite.md) | 区分结构、样式、几何、绘制和合成机会 |
| 2 | [任务、微任务与呈现机会](02-rendering-event-loop/02-tasks-microtasks-rendering-opportunities.md) | 用顺序日志解释任务、微任务、动画帧和计时器 |
| 3 | [长任务、同步布局与稳定动画](02-rendering-event-loop/03-long-tasks-layout-thrashing-animation.md) | 复现阻塞和布局压力，并以同输入证据验证修复 |

### 03 存储、会话与安全边界

| 顺序 | 详细教程 | 学习结果 |
| --- | --- | --- |
| 1 | [内存、Web Storage 与跨标签冲突](03-storage-security/01-memory-web-storage-cross-tab.md) | 按生命周期、可见范围和冲突风险选择客户端状态 |
| 2 | [IndexedDB 事务、索引与升级](03-storage-security/02-indexeddb-transactions-upgrades.md) | 建立事务提交、回滚、迁移和阻塞恢复证据 |
| 3 | [源、Cookie、XSS、CSRF 与对象授权](03-storage-security/03-origin-cookie-xss-csrf-authorization.md) | 分开判断脚本读取、登录身份、跨站写入和对象权限 |

### 04 请求、流与实时通信

| 顺序 | 详细教程 | 学习结果 |
| --- | --- | --- |
| 1 | [可靠 Fetch：超时、取消、竞态与有限重试](04-fetch-streams-realtime/01-reliable-fetch-timeout-cancel-race.md) | 区分 HTTP 错误、网络失败、超时、取消和旧响应 |
| 2 | [可读流与增量解析](04-fetch-streams-realtime/02-readable-stream-incremental-parsing.md) | 跨任意字节块恢复 UTF-8 与 NDJSON 业务帧 |
| 3 | [SSE、WebSocket 与轮询](04-fetch-streams-realtime/03-sse-websocket-polling-recovery.md) | 处理连接状态、游标恢复、缺口与重复事件 |

### 05 Worker、离线与平台能力

| 顺序 | 详细教程 | 学习结果 |
| --- | --- | --- |
| 1 | [Web Worker：消息、所有权转移与可取消计算](05-workers-offline-webapis/01-web-worker-messaging-transfer-cancel.md) | 管理消息关联、Transferable、错误、取消与终止 |
| 2 | [Service Worker：生命周期、控制权与版本化缓存](05-workers-offline-webapis/02-service-worker-lifecycle-cache.md) | 区分注册、安装、等待、激活、控制和缓存版本 |
| 3 | [离线一致性与更新](05-workers-offline-webapis/03-offline-consistency-updates.md) | 区分快照、离线草稿、服务端确认和版本冲突 |
| 4 | [观察器、权限与平台 API](05-workers-offline-webapis/04-observers-permissions-api-fallback.md) | 为观察器、Clipboard 和权限拒绝保留渐进回退 |

### 06 DevTools 与性能诊断

| 顺序 | 详细教程 | 学习结果 |
| --- | --- | --- |
| 1 | [DevTools 证据链：网络、主线程、内存与页面状态](06-devtools-performance/01-network-performance-memory-evidence.md) | 跨面板对齐等待、阻塞、保留路径和旧状态 |
| 2 | [Core Web Vitals 与性能预算](06-devtools-performance/02-core-web-vitals-budgets-diagnosis.md) | 把候选指标还原到原因，并建立可判定预算 |

完整知识点、边界和证据位置见[浏览器与 Web 平台覆盖矩阵](BROWSER-COVERAGE.md)。

## 学习与运行

### 学习与取证方式

建议分两轮完成：

1. 学完 HTML/CSS 后，先做第 1、2 章，建立 Network、渲染与主线程的基本证据。
2. 学完 JavaScript 异步内容后，按顺序完成全部 6 章，并回做前两章的完整代码。

每篇详细教程都应留下机制推导、最小运行案例、邻里集市集成、错误诊断、题目与练习、阶段验收六类证据。故障记录统一写清“现象、证据、原因、修复、复验”；性能对比必须固定浏览器版本、设备、视口、输入、缓存和 Service Worker 状态。阅读完成、截图存在或单次跑通都不等于验收完成。

### 多文件实验怎样启动

以下 `browser-lab` 是本卷可复用的基础服务器契约：提供受限静态文件和可控的公开商品列表 API。只有教程明确要求复用该契约时才直接使用；如果教程给出完整 `server.mjs`，应以该课文件清单整体替换，不要把不同课程的缓存、CORS、流、SSE、会话或离线逻辑拼进同一个服务。

在课程仓库之外建立个人练习目录：

```text
browser-lab/
  server.mjs
  public/
    index.html
```

把要实验的页面与脚本放进 `public`，保存完整 `server.mjs`：

```js
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve(process.argv[2] ?? "./public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
const seed = ["自行车", "咖啡机", "阅读台灯"].map((title, index) => ({
  id: `listing-${index + 1}`, title, description: `${title}，当面检查`,
  priceCents: [28000, 19900, 3900][index],
  status: "available", ownerId: "demo-owner", version: 1,
  createdAt: "2026-10-10T08:00:00.000Z",
}));
function send(res, status, type, body) {
  res.writeHead(status, {
    "Content-Type": type, "Cache-Control": "no-store",
  });
  res.end(body);
}
createServer(async (req, res) => {
  try {
    if (!req.url?.startsWith("/") || req.url.startsWith("//")) {
      send(res, 400, "text/plain; charset=utf-8", "无效请求路径");
      return;
    }
    const url = new URL(req.url, "http://127.0.0.1");
    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" }); res.end(); return;
    }
    if (url.pathname === "/api/v1/listings") {
      const page = Number(url.searchParams.get("page") ?? "1");
      const pageSize = Number(url.searchParams.get("pageSize") ?? "20");
      const q = url.searchParams.get("q") ?? "";
      if (!Number.isInteger(page) || page < 1 ||
          !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
        send(res, 400, types[".json"], JSON.stringify({
          code: "INVALID_PAGE", message: "分页参数不合法",
          requestId: "browser-lab",
        }));
        return;
      }
      const requestedDelay = Number(url.searchParams.get("delay"));
      const delay = Number.isFinite(requestedDelay) && requestedDelay > 0
        ? Math.min(requestedDelay, 1500) : q.includes("自行车") ? 900 : 100;
      await new Promise((done) => setTimeout(done, delay));
      if (res.destroyed) return;
      if (url.searchParams.get("fail") === "1") {
        send(res, 503, types[".json"], JSON.stringify({
          code: "LAB_FAILURE", message: "本地演示失败",
          requestId: "browser-lab",
        }));
        return;
      }
      const matches = seed.filter((item) => item.title.includes(q));
      send(res, 200, types[".json"], JSON.stringify({
        items: matches.slice((page - 1) * pageSize, page * pageSize),
        page, pageSize, total: matches.length,
      }));
      return;
    }
    const pathname = decodeURIComponent(url.pathname);
    const file = resolve(root, "." + (pathname.endsWith("/")
      ? pathname + "index.html" : pathname));
    if (!file.startsWith(root + sep) || !types[extname(file)]) {
      send(res, 404, "text/plain; charset=utf-8", "资源不存在"); return;
    }
    const content = await readFile(file);
    send(res, 200, types[extname(file)], content);
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 400;
    send(res, status, "text/plain; charset=utf-8", "无法读取该实验资源");
  }
}).listen(3300, "127.0.0.1", () => {
  console.log(`实验根目录：${root}`);
  console.log("打开 http://127.0.0.1:3300");
});
```

### 运行规则与服务边界

精确运行时选择统一见[版本基线](../00-guide/version-baseline.md)。先记录实际版本，再在
`browser-lab` 目录运行：

```bash
node server.mjs ./public
```

打开 `http://127.0.0.1:3300`，不要直接双击 HTML 使用 `file:`。用 `Ctrl+C` 停止服务。详细教程若使用自己的完整服务，应按该课命令运行；常见形式是 `node server.mjs` 或 `node server.mjs ./public`，不能默认所有教程共用同一参数。

基础服务契约如下：

- 只绑定 `127.0.0.1:3300`，只接受 `GET`；不要改成 `0.0.0.0` 暴露到局域网。
- 静态文件必须位于 `public` 下，且扩展名只能是 `.html`、`.js`、`.mjs`、`.css`、`.json`；越界、未知类型和缺失资源返回 `404`。
- `/api/v1/listings` 校验 `page` 和 `pageSize`，支持 `q`；`delay` 最多 1500 ms，`fail=1` 返回 `503`。
- 静态文件和 API 均为 `no-store`，数据是虚构的内存数据；服务不实现真实认证、持久化、事务或生产静态资源策略。

每次切换实验都先停止服务，再整体替换该课列出的文件并重新启动。Worker 实验按教程放置主页面、主线程脚本和 Worker 脚本；Service Worker 与离线实验按教程替换 `index.html`、`sw.js` 及相应资源。端口被占用时先查明进程归属，不终止其他项目的进程。

## 连续项目与边界

- 不在 `public`、URL、Header、日志、截图或 HAR 中放环境文件、凭据、Cookie、Token、私人响应或真实用户标识。
- 不在练习目录创建指向其他目录的符号链接。页面输出使用安全文本接口；客户端校验、CORS 和隐藏控件都不能替代服务端认证与对象授权。
- 取消 Fetch、reader 或实时连接只代表客户端停止等待，不证明服务端写操作已回滚。事件到达也不证明预约、库存或其他业务事务成功。
- 离线可读不等于离线可交易。缓存快照必须标明时间，草稿必须标明待同步，只有服务端确认才能成为权威状态。
- `localhost` 和 `127.0.0.1` 是安全上下文的开发例外；生产 Service Worker 必须运行在 HTTPS 等安全上下文中，本机普通 HTTP 成功不能外推到生产部署。
- 启动 Service Worker 课前，先在 Application 中确认当前 registration、`navigator.serviceWorker.controller` 和 Cache Storage 命名空间。切换实验时只注销本实验的 registration，并只删除该教程前缀的缓存；不要清空整个同源的站点数据或其他应用缓存。
- 停止本机服务后刷新得到缓存页面，只证明该浏览器、该 registration 和该缓存版本下的离线读取。它不证明多标签更新、版本迁移、存储驱逐、隐私模式、后台调度或生产多版本部署正确。

## 验收

- [ ] 按本 README 路线完成所有详细教程，每篇阶段验收及本卷综合验收都有逐项证据。
- [ ] 每篇教程的完整文件都能从空练习目录按说明启动，不依赖上一次实验遗留状态。
- [ ] 能分层解释 URL/连接/HTTP、渲染/事件循环、存储/安全、Fetch/流/实时、Worker/离线和性能诊断。
- [ ] 网络、主线程、存储、Service Worker 与性能实验都记录环境、固定动作、实际结果和失败证据。
- [ ] 至少完成一条“现象、证据、原因、修复、复验”闭环，并能在随机改变端口、状态、延迟、缓存版本或输入后重新定位。
- [ ] 邻里集市集成保持整数分、UTC ISO 8601、文本输出、权限边界、离线状态标记和错误恢复约束。
- [ ] 所有截图、日志、HAR 和性能记录已脱敏；未把本地演示服务当作真实认证、数据库事务或生产安全证明。
- [ ] [覆盖矩阵](BROWSER-COVERAGE.md)中的主要教程归属均能回到正文固定证据章节。
- [ ] Safari、Firefox、WebView、真实移动设备、辅助技术和生产链路等未测范围明确记录，不以 Chromium 单次结果外推。

## 验证范围

本卷已完成代表性的网络、缓存、实时通信、Worker、Service Worker、请求竞态、Clipboard 和
Chromium 路径验证；语法可解析或单次样例通过不代表全部教程、练习与故障均已运行。Safari、
Firefox、WebView、真实移动设备、辅助技术、生产网络、真实会话与多用户事务仍需在目标环境
验收。精确数量、执行结果和未验证范围统一见[交付与验证说明](../VALIDATION.md)。

## 资料与导航

- [MDN Web APIs](https://developer.mozilla.org/docs/Web/API)
- [WHATWG HTML](https://html.spec.whatwg.org/)
- [浏览器与 Web 平台覆盖矩阵](BROWSER-COVERAGE.md)

[上一卷：CSS](../02-css/README.md) · [全书目录](../README.md) ·
[下一卷：JavaScript 与 TypeScript](../04-javascript-typescript/README.md)
