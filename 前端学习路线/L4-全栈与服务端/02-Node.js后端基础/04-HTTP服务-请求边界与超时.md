# HTTP 服务、请求边界与超时

<!-- course-meta:start -->
> - 层级：L4
> - 先修：[Node 运行时](./01-Node.js运行时与内置模块.md)、[Stream](./02-Stream-API与缓冲.md)
> - 建议用时：180 分钟
> - 一手资料：[Node HTTP](https://nodejs.org/docs/latest-v24.x/api/http.html)、[OWASP 输入校验](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
<!-- course-meta:end -->

## 学习目标

- 能运行有方法、路径、大小、类型和超时限制的 HTTP API。
- 能处理断开连接、解析失败与业务校验失败。
- 能解释框架与反向代理各自负责的边界。

## 内容讲解

### 1. 从网络到业务

```text
连接与超时 → 方法/路径 → Content-Type → 字节上限
→ JSON 解析 → schema → 认证/授权 → 业务与事务 → 响应
```

JSON 能解析不代表输入符合业务。Content-Length 也不可信，必须累积实际读取的字节。压缩请求还需限制解压后的大小。

### 2. 完整的内置 HTTP 实验

保存 `server.mjs`，运行 `node server.mjs`：

```js
import http from 'node:http';
const limit = 16 * 1024;

const server = http.createServer(async (req, res) => {
  const reply = (status, value) => {
    if (res.destroyed || res.headersSent) return;
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(JSON.stringify(value));
  };
  if (req.url !== '/api/echo') return reply(404, { code: 'NOT_FOUND' });
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(405, { code: 'METHOD_NOT_ALLOWED' });
  }
  if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    return reply(415, { code: 'JSON_REQUIRED' });
  }
  if (req.headers['content-encoding']) {
    return reply(415, { code: 'ENCODING_NOT_SUPPORTED' });
  }
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > limit) {
        reply(413, { code: 'BODY_TOO_LARGE' });
        return; // 提前结束迭代可能关闭流；测试连接层行为。
      }
      chunks.push(chunk);
    }
    let input;
    try {
      input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return reply(400, { code: 'INVALID_JSON' });
    }
    if (!input || typeof input.title !== 'string' ||
        input.title.trim().length < 1 || input.title.length > 100) {
      return reply(422, { code: 'INVALID_TITLE' });
    }
    reply(200, { title: input.title.trim() });
  } catch {
    // 客户端中途断开时可能已无法返回响应。
    reply(400, { code: 'INCOMPLETE_BODY' });
  }
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.listen(4180, '127.0.0.1');
```

教学服务没有认证和业务存储，只演示请求边界。实际生产建议使用成熟框架的经过验证 body parser，并把连接数、慢请求和请求大小限制配置到反向代理。不要把这个实验当成完备网关。

### 3. 请求与响应测试

```bash
curl -i http://127.0.0.1:4180/api/echo
curl -i -X POST -H 'Content-Type: application/json' --data '{"title":" Atlas "}' http://127.0.0.1:4180/api/echo
curl -i -X POST -H 'Content-Type: application/json' --data '{"title":null}' http://127.0.0.1:4180/api/echo
```

预期分别 405、200 且 title 为 Atlas、422。另测损坏 JSON、非 JSON、超大 body 和中途断开；超限时客户端可能观察到 413 或连接终止，必须确认服务端没有进入业务写入。

### 4. 框架与部署

Express/Fastify 提供路由、钩子、schema 和插件，但服务端授权仍需自己设计。Next.js Route Handler 同样是远程入口，不能因函数位于代码库内部而信任参数。

`trust proxy`、转发 IP 和 forwarded headers 只能信任实际代理链，否则攻击者可伪造客户端地址绕过限流。超时需沿链路分配预算：客户端、网关、应用、数据库、下游都要有边界。

## 常见问题

**所有错误都返回 500 吗？** 不应；输入错误与业务拒绝使用明确 4xx，服务端故障使用 5xx，并记录内部原因。

**设置 requestTimeout 就能停止数据库工作吗？** 不能自动保证，下游操作需自己的超时与取消能力。

## 实操作业

基础覆盖 200/400/405/413/415/422；进阶给请求加入 requestId 并在日志与响应关联；挑战用框架实现同一契约，比较默认限制和超时。

### 参考答案与验收

测试需断言状态、JSON code、未写入业务和端口关闭。不能只检查服务“不崩溃”。请求取消不一定等于数据库回滚，事务边界另测。

<!-- atlas-task:start -->
## Atlas 项目任务

让 Atlas 文章创建 API 有明确请求大小、类型、schema 和超时契约，覆盖失败输入。见 [L4 里程碑](../../projects/atlas/milestones/L4.md)。
<!-- atlas-task:end -->

---

## 本节小结

HTTP 服务要在业务逻辑前建立可测试边界，框架默认值和代理配置都需要核对。

<!-- course-nav:start -->
---

[上一篇：03-Worker Threads 与集群](./03-Worker-Threads与集群.md) · [课程地图](../../README.md) · [下一篇：文件系统、路径与子进程安全](./05-文件系统-路径与子进程安全.md)
<!-- course-nav:end -->
