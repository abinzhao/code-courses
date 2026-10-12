# SSE、WebSocket 与断线恢复

<!-- course-meta:start -->
> - 层级：L4
> - 先修：[HTTP 服务](../02-Node.js后端基础/04-HTTP服务-请求边界与超时.md)、[Stream](../02-Node.js后端基础/02-Stream-API与缓冲.md)
> - 建议用时：180 分钟
> - 一手资料：[SSE](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)、[WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
<!-- course-meta:end -->

## 学习目标

- 能按方向、重连与流控选择实时协议。
- 能实现最小 SSE，设计事件 ID、取消与鉴权。

## 内容讲解

### 1. 协议选择

轮询最简单，适合低频状态；SSE 用 HTTP 单向服务端事件，适合任务进度和通知；WebSocket 提供双向消息，适合协作或高频交互。不要为了显示一次进度就引入复杂长连接系统。

原生 EventSource 不支持任意自定义请求头；需要 Authorization header 或 POST body 时可用 Fetch 流解析 SSE。WebSocket 浏览器构造器也不能任意添加请求头，不要把长期 token 放查询串。

### 2. 最小完整 SSE 服务

```js
import http from 'node:http';
http.createServer((req, res) => {
  if (req.method !== 'GET' || req.url !== '/events') {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no',
  });
  let id = 0;
  const timer = setInterval(() => {
    const event = `id: ${++id}\nevent: progress\ndata: ${JSON.stringify({ id })}\n\n`;
    // 慢消费者不能导致内存无界累积；本实验直接结束连接。
    if (!res.write(event)) {
      clearInterval(timer);
      res.end();
    }
  }, 1000);
  res.on('close', () => clearInterval(timer));
}).listen(4181, '127.0.0.1');
```

用 `curl -N http://127.0.0.1:4181/events` 观察分段，Ctrl+C 后 timer 应清理。同源页面：

```js
const stream = new EventSource('/events');
stream.addEventListener('progress', (event) => {
  const data = JSON.parse(event.data);
  console.log(event.lastEventId, data);
});
// 页面不再需要时关闭，避免继续重连。
document.querySelector('#stop').addEventListener('click', () => stream.close());
```

本例 ID 每次连接重置，不具备持久重放能力，只演示线路。生产需按事件日志分配稳定 ID，根据 Last-Event-ID 重放或返回快照恢复。

### 3. 恢复与去重

客户端保存最后确认事件 ID，重复事件按 ID 去重，不能凭到达次数执行扣款或重复发布。断线可能发生在处理后、确认前，因此常见交付语义是至少一次，需要幂等。

设置心跳、空闲超时、连接上限与带抖动退避。事件缓冲期外的 ID 应触发快照恢复，不无限重放。

### 4. 安全与代理

长连接建立时鉴权，还需要会话撤销和权限变更策略。WebSocket 校验 Origin，防止浏览器跨站握手利用会话；Origin 不是非浏览器客户端身份凭据。

限制消息大小、速率、类型和房间授权。代理缓冲可能让 SSE 看似不流式，检查应用、Nginx/CDN 与客户端每层。HTTP/1.1 连接数限制与 HTTP/2 多路复用行为不同，按部署实测。

## 常见问题

**TCP 保序是否等于业务只执行一次？** 不等于，断线重试和消息重放仍会重复。

**流结束是否说明任务成功？** 可能是断线，必须有明确完成事件和状态查询接口。

## 实操作业

基础运行 SSE 并关闭连接；进阶加入稳定事件日志和恢复；挑战为协作消息设计 WebSocket 房间权限、流控与撤销。

### 参考答案与验收

关闭后资源释放；断线重连没有重复业务副作用；过期事件返回可恢复快照；流成功、任务成功与连接结束能区分。

<!-- atlas-task:start -->
## Atlas 项目任务

为 Atlas 导入或索引任务增加实时进度，断线后可查询状态并恢复。见 [L4 里程碑](../../projects/atlas/milestones/L4.md)。
<!-- atlas-task:end -->

---

## 本节小结

实时系统需要事件契约、恢复、幂等与流控；连接建立只是起点。

<!-- course-nav:start -->
---

[上一篇：分页、OpenAPI 与契约演进](./04-分页-OpenAPI与契约演进.md) · [课程地图](../../README.md) · [下一篇：01 PostgreSQL 核心概念](../04-数据库基础/01-PostgreSQL核心概念.md)
<!-- course-nav:end -->
