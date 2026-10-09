# 06-HTTP协议报文方法状态码与Header

## 目标

完成本知识单元后，学员应能像拆开一封真实信件一样读懂 HTTP 通信内容，准确理解方法、状态码和 Header 各自表达什么，而不是只会在代码里调用 `fetch` 却看不懂网络面板。

学员应能够：

1. 解释 HTTP 的请求-响应模型和“无状态”的准确含义，说明无状态为什么不等于“网站不能记住用户”。
2. 画出请求报文和响应报文的结构（请求行或状态行、Header、空行、Body），逐段说明作用。
3. 根据业务语义选择 GET、POST、PUT、PATCH、DELETE、HEAD、OPTIONS 方法，并用“安全”和“幂等”两个性质分析方法。
4. 读懂重点状态码表达的结果类别，按 2xx、3xx、4xx、5xx 分类排查问题，准确区分易混状态码。
5. 读写常见 Header，解释 Host、Content-Type、Content-Length、Accept、Authorization、Content-Encoding、Location 的作用，理解内容协商与 MIME 类型。
6. 使用 curl 和 Node.js 内置 `http` 模块构造请求、搭建服务，打印报文要素并解释输出，区分 JSON、form 和 multipart 三种 Body 编码。

本单元聚焦 HTTP/1.1 文本报文本身。TLS/HTTPS、CORS 和 Cookie 的完整机制在后续安全单元展开，本单元只做必要的点名。

## 技术栈

本单元不使用前端框架、后端框架、数据库或第三方 npm 包，全部基于 Node.js 内置能力与系统工具。

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Node.js 当前 LTS | 搭建 HTTP 服务、发起 HTTP 请求 | 能使用内置 `http` 模块读写报文要素 |
| macOS 或 Linux Terminal | 执行 curl 命令 | 能选择参数并读懂原始输出 |
| `curl` | 构造与观察 HTTP 请求 | 掌握 `-X`、`-H`、`-d`、`-i`、`-v`、`-I` |
| Chrome DevTools Network | 辅助对照浏览器中的真实请求 | 能找到方法、状态码、Header 和 Body |
| HTTP/1.1 | 本单元主分析对象 | 能读懂文本报文结构 |
| JSON | 主要 Body 数据格式 | 能与正确的 Content-Type 配合使用 |

说明：

- 课程命令以 HTTP/1.1 为分析对象；HTTP/2、HTTP/3 是二进制或基于其他传输的协议，入门阶段先掌握 HTTP/1.1 文本结构，再迁移理解。
- 示例中 `Authorization` 使用的是明显占位令牌 `REPLACE_ME_TOKEN`，不是真实凭证。
- `<端口>`、`<路径>` 表示需要替换的占位参数，不要原样输入尖括号。

开始前检查环境：

```bash
node -v
curl --version | head -n 1
```

预期观察：

- `node -v` 输出当前 Node.js 版本号。
- `curl --version` 第一行输出 curl 版本及支持的协议列表，其中应包含 HTTP 与 HTTPS。

## 详细的理论知识讲解和示例伪代码

### 1. HTTP：请求-响应模型与无状态

#### 1.1 通俗定义

HTTP（超文本传输协议）是客户端与服务器之间交换内容的应用层协议。它是一套“对话格式约定”：规定请求该怎么写、响应该怎么回。HTTP 通常运行在 TCP 连接之上，内容以文本行为主，便于直接阅读。

#### 1.2 请求-响应模型

HTTP 通信严格遵循“一问一答”：

```text
客户端                          服务器
  │  建立连接后发送请求           │
  │ ──────────────────────────> │
  │                              │ 处理请求
  │  返回响应                    │
  │ <────────────────────────── │
  │  本次回合结束                │
```

服务器不会在客户端没有请求时主动推送普通 HTTP 响应（扩展推送机制不在本单元范围）。一次请求对应一次响应。

#### 1.3 无状态的准确含义

无状态指：协议本身不要求服务器在两次请求之间保留关于客户端的状态信息。每个请求都被当作独立的新对话，服务器不能仅凭“HTTP 协议”自动认出“这是上一秒那个用户”。

```text
请求 1：GET /cart
请求 2：POST /cart
从协议文本本身看，这是两个互不相关的请求
若要让服务器知道它们属于同一个登录用户，需要额外携带凭证信息
```

登录态、购物车关联等能力由额外机制（如 Cookie、Token 等，后续单元展开）在应用层实现，并不是 HTTP 天生“记住了用户”。

#### 1.4 与 Web 开发的关系

- 浏览器每访问一个页面、一张图片或一个接口，都是独立的 HTTP 回合。
- 后端 API 按请求处理：解析请求、执行业务、构造响应。
- “刷新页面后状态丢失”这类问题，根源往往是没有在请求间传递必要的状态信息。

#### 1.5 常见误区

> HTTP 无状态，所以网站根本无法实现登录。

无状态描述的是协议层面不自动保存状态。应用可以让客户端每次请求都带上凭证，服务器据此识别用户，从而在无状态协议之上构建登录体验。

> HTTP 只能传输 HTML。

HTTP 可以传输任何能用字节表示的内容：JSON、图片、CSS、JavaScript、文件流等，由 Header 说明内容类型。

### 2. 请求报文结构

#### 2.1 四段结构

一个 HTTP/1.1 请求报文由四部分组成，顺序固定：

```text
1. 请求行        方法 + 路径 + 协议版本
2. 请求 Header   若干行“名: 值”
3. 空行          标志 Header 结束
4. Body          可选的正文数据
```

完整示例：

```text
POST /api/items?source=web HTTP/1.1
Host: example.com
Content-Type: application/json
Content-Length: 41
Authorization: Bearer REPLACE_ME_TOKEN
Accept: application/json

{"name":"机械键盘","price":299,"stock":20}
```

#### 2.2 请求行

```text
POST /api/items?source=web HTTP/1.1
└─┬─┘ └────────┬───────────┘ └──┬─────┘
方法          请求目标          协议版本
```

- 方法表达“要做什么”，详见第 4 节。
- 请求目标包含路径和查询字符串，不含域名（域名放在 Host 头中）。
- 版本说明使用的 HTTP 版本。

#### 2.3 请求 Header

Header 是若干行元信息，每行形如 `名字: 值`，用来描述请求和 Body 的附加属性。Header 名大小写不敏感，但实际项目中习惯统一书写。

示例中各头的作用：

| Header | 作用 |
|---|---|
| `Host` | 目标服务器域名与端口；HTTP/1.1 中通常必须提供，用于一台 IP 承载多个站点 |
| `Content-Type` | Body 的数据格式 |
| `Content-Length` | Body 的字节长度 |
| `Authorization` | 携带身份凭证（本单元只识别其格式） |
| `Accept` | 客户端能处理的响应内容类型 |

#### 2.4 空行与 Body

Header 之后必须有一个空行，服务器据此判断 Header 到此结束。空行之后才是 Body。

- GET、DELETE、HEAD 等请求通常没有 Body。
- POST、PUT、PATCH 在提交数据时通常有 Body。
- 有 Body 时应通过 `Content-Length` 说明字节数，或使用传输编码分块发送（扩展认知）。

#### 2.5 常见误区

> 请求行里应该写完整网址。

在发给源服务器的普通请求中，请求行通常只写路径加查询，域名放在 Host 头里。

> Header 和 Body 之间不需要明确分隔。

空行是报文语法的一部分。没有空行，服务器无法判断 Header 在哪里结束、Body 从哪里开始。

### 3. 响应报文结构

#### 3.1 四段结构

响应报文同样由四部分组成：

```text
1. 状态行        协议版本 + 状态码 + 原因短语
2. 响应 Header   若干行“名: 值”
3. 空行          标志 Header 结束
4. Body          可选的响应正文
```

完整示例（与上一节请求对应）：

```text
HTTP/1.1 201 Created
Content-Type: application/json
Content-Length: 52
Location: /api/items/42

{"id":42,"name":"机械键盘","price":299,"stock":20}
```

#### 3.2 状态行

```text
HTTP/1.1 201 Created
└──┬───┘ └┬┘ └──┬──┘
 版本    状态码  原因短语
```

- 状态码是三位数字，用机器可判断的方式表达处理结果。
- 原因短语是简短文字说明，例如 `Created`、`Not Found`；程序判断以数字码为准，不应依赖原因短语文本。

#### 3.3 响应 Header 与 Body

响应 Header 描述响应结果和 Body 属性。示例中：

- `Content-Type: application/json` 告诉客户端 Body 是 JSON。
- `Content-Length: 52` 给出 Body 字节长度。
- `Location: /api/items/42` 在资源创建或重定向场景中指出新资源或跳转目标位置。

Body 是服务器返回的实际内容：JSON、HTML、图片字节等。像 204 这样的状态码通常没有 Body。

#### 3.4 常见误区

> 客户端应解析原因短语判断成败。

原因短语可能因服务器实现而异，稳定依据是三位状态码。

> 只要有 Body 返回就表示成功。

错误响应（如 404、500）也可以携带 Body，其中往往写着错误说明。成败必须看状态码。

### 4. 方法语义、安全与幂等

#### 4.1 方法表达“动作意图”

| 方法 | 常见语义 | 通常有无 Body | 安全 | 幂等 |
|---|---|---|---|---|
| GET | 获取资源 | 一般无 | 是 | 是 |
| POST | 创建资源或提交动作 | 有 | 否 | 否 |
| PUT | 整体替换资源 | 有 | 否 | 是 |
| PATCH | 局部更新资源 | 有 | 否 | 视实现而定 |
| DELETE | 删除资源 | 一般无 | 否 | 是 |
| HEAD | 只要响应头，不要 Body | 无 | 是 | 是 |
| OPTIONS | 查询服务器支持的通信选项 | 一般无 | 是 | 是 |

#### 4.2 安全（safe）

安全指方法在语义上不应对服务器资源造成修改、删除等副作用。GET、HEAD、OPTIONS 属于安全方法，它们的预期用途是“看看”，不是“改动”。

安全方法可以被浏览器、爬虫和缓存更放心地重复发起。

#### 4.3 幂等（idempotent）

幂等指同一个请求执行一次和执行多次，对服务器资源状态产生的结果相同。

```text
DELETE /api/items/42
执行第一次：资源被删除
执行第二次：资源已不存在，结果仍是“42 不存在”
服务器最终状态一致 → 幂等
```

PUT 的幂等示例：

```text
PUT /api/items/42  Body: {"name":"键盘","price":299}
连续执行三次，资源最终都被替换成这一份完整内容，不会多出副本 → 幂等

POST /api/items   Body: {"name":"键盘"}
连续执行三次，可能创建三个不同 id 的资源 → 不幂等
```

这就是“重复点击提交按钮可能产生重复订单”的协议层面原因：POST 默认不幂等。

#### 4.4 HEAD 与 OPTIONS 的用途

- HEAD：服务器应像 GET 一样处理并返回响应头，但不返回 Body。常用于先看大小、类型或最后修改时间，节省流量。
- OPTIONS：询问目标支持哪些方法或通信选项；浏览器的跨域预检会用到它（跨域细节在后续单元展开）。

#### 4.5 常见误区

> 幂等意味着每次响应内容必须完全相同。

幂等关注的是服务器资源最终状态一致。第二次 DELETE 返回 204，第三次可能返回 404，响应不同，但资源状态一致，仍属幂等。

> 用了 GET 就绝对不会修改数据。

安全与幂等是语义约定。若开发者在 GET 接口里写了删除逻辑，协议拦不住，但这是严重违背约定的设计，会带来被预取、被爬虫触发等事故。

> DELETE 请求不能携带 Body。

协议并未严格禁止，但实践中通常不依赖 Body 传递删除条件，以免代理和工具兼容问题。

### 5. 状态码：处理结果的分类语言

#### 5.1 五大类

| 区间 | 类别 | 总体含义 |
|---|---|---|
| 1xx | 信息性 | 请求已收到，继续处理（日常少见） |
| 2xx | 成功 | 请求被正常接收与处理 |
| 3xx | 重定向 | 需要进一步动作才能完成 |
| 4xx | 客户端错误 | 请求有问题，服务器无法处理 |
| 5xx | 服务器错误 | 服务器处理有效请求时出错 |

#### 5.2 重点 2xx

| 状态码 | 含义 | 典型场景 |
|---|---|---|
| 200 OK | 成功 | GET 查询成功，POST 动作成功并返回内容 |
| 201 Created | 资源已创建 | POST 创建成功，常配合 Location 指向新资源 |
| 204 No Content | 成功但无 Body | DELETE/PUT 成功且无需返回内容 |

对 204 调用 JSON 解析会报错，因为没有正文可读。

#### 5.3 重点 3xx

| 状态码 | 含义 | 要点 |
|---|---|---|
| 301 Moved Permanently | 永久重定向 | 资源已长期迁移到新地址，客户端可记住新地址 |
| 302 Found | 临时重定向 | 暂时从另一地址提供，原地址未来仍有效 |
| 304 Not Modified | 资源未修改 | 协商缓存命中，客户端使用本地缓存副本，响应通常无 Body |

301 与 302 的核心差别在“永久性”。登录后跳转到首页、临时活动跳转通常用 302；域名整体更换、HTTP 跳转 HTTPS 的固定规则常见 301。

#### 5.4 重点 4xx

| 状态码 | 含义 | 典型场景 |
|---|---|---|
| 400 Bad Request | 请求语法或参数错误 | JSON 格式非法、参数无法理解 |
| 401 Unauthorized | 未认证或凭证失效 | 未登录、令牌过期，需要先证明身份 |
| 403 Forbidden | 已认证但无权限 | 知道你是谁，但不允许访问该资源 |
| 404 Not Found | 资源不存在 | 路径或资源 id 不存在 |
| 409 Conflict | 资源状态冲突 | 用户名已被占用、版本冲突 |
| 422 Unprocessable Entity | 语义校验失败 | 格式正确但字段不合法，如价格为负 |
| 429 Too Many Requests | 请求过于频繁 | 触发限流，应稍后重试 |

关键区分：

- 401 是“没认出你 / 你没登录”，403 是“认出你了，但你没权限”。
- 400 偏向“请求本身无法被理解”，422 偏向“能读懂但内容不合规则”。
- 409 强调与服务器当前状态冲突，例如并发修改同一资源。

#### 5.5 重点 5xx

| 状态码 | 含义 | 典型场景 |
|---|---|---|
| 500 Internal Server Error | 服务器内部通用错误 | 代码异常、未预期错误 |
| 502 Bad Gateway | 网关收到上游无效响应 | 反向代理后的服务返回异常 |
| 503 Service Unavailable | 服务暂时不可用 | 维护、过载、暂未就绪 |
| 504 Gateway Timeout | 网关等待上游超时 | 后端处理过久，代理等不到响应 |

区分 502、503、504：502 是上游“回话异常”，503 是服务“当前没法服务”，504 是“等上游太久超时”。

#### 5.6 常见误区

> 4xx 一定是前端代码写错了。

4xx 表示请求侧出问题，可能是用户输入、调用方式、凭证状态等，不一定是前端 bug；它指向的是“请求不被接受”。

> 看到 500 就一定是某一行代码写错。

500 是服务器端未被妥善处理的错误统称，也可能来自配置、依赖或外部资源异常，需要看服务端日志。

> 302 响应里的 Body 没意义，所以不用管跳转。

客户端通常会跟随 Location 继续请求，但应理解这是一次额外跳转，链路中可能丢失方法或重复提交，需要关注。

### 6. Header、内容协商与 MIME

#### 6.1 Header 的分类认知

按出现位置大致可分为请求头、响应头，以及描述 Body 的实体类信息。入门阶段不纠结严格分类，重点是读懂每一个头的作用。

#### 6.2 常见 Header 速查

| Header | 出现位置 | 作用 |
|---|---|---|
| `Host` | 请求 | 指定目标域名端口，支持一台 IP 托管多个站点 |
| `Content-Type` | 请求/响应 | Body 的媒体类型与可选字符集 |
| `Content-Length` | 请求/响应 | Body 的字节长度 |
| `Accept` | 请求 | 客户端愿意接收的媒体类型 |
| `Accept-Encoding` | 请求 | 可接受的压缩方式，如 gzip |
| `Accept-Language` | 请求 | 可接受的自然语言 |
| `Authorization` | 请求 | 携带身份凭证 |
| `Content-Encoding` | 响应 | Body 使用的压缩编码 |
| `Location` | 响应 | 重定向或新资源地址 |
| `User-Agent` | 请求 | 客户端身份信息 |

#### 6.3 MIME 类型

MIME 用 `主类型/子类型` 的形式描述内容性质，与文件后缀没有必然关系：

```text
application/json
text/html; charset=utf-8
text/css
application/javascript
image/png
image/jpeg
multipart/form-data
```

服务器通过 `Content-Type` 告诉客户端真实内容类型，客户端据此决定如何解析。同一段字节既可能被当 HTML 也可能被当纯文本，区别就在 Content-Type。

#### 6.4 内容协商

内容协商指客户端用 `Accept*` 头表达偏好，服务器结合自身能力选择返回内容：

```text
请求头：
Accept: application/json
Accept-Encoding: gzip
Accept-Language: zh-CN

服务器决策：
能返回 JSON → Content-Type: application/json
支持 gzip → Content-Encoding: gzip，返回压缩后的字节
优先中文 → 返回中文内容
```

需要注意：`Accept` 只是“偏好与能力声明”，服务器可以尊重，也可以返回其他可用类型，最终以响应的 `Content-Type` 为准。

#### 6.5 Content-Encoding 与压缩

`Content-Encoding: gzip` 说明 Body 字节经过压缩，客户端需要先解压再按 `Content-Type` 解析。两个头描述的是不同阶段：编码解决“怎么压的”，类型解决“解压后是什么”。

#### 6.6 常见误区

> Content-Type 由文件后缀名决定。

HTTP 中由服务器显式给出。文件叫 `.json` 却返回 `text/plain` 时，客户端会按纯文本处理。

> 带了 Authorization 就等于加密。

Authorization 只负责携带凭证，与是否加密无关；在明文 HTTP 上发送它，凭证仍可能被窃看，加密由 HTTPS 负责。

### 7. Body 的三种常见编码

#### 7.1 编码要与 Content-Type 一致

Body 只是一串字节，服务器需要 `Content-Type` 才知道按什么规则解析。编码方式和 Header 必须一致，否则解析失败或得到错误结构。

#### 7.2 application/json

```text
POST /api/items HTTP/1.1
Content-Type: application/json

{"name":"显示器","price":1299}
```

前后端分离接口的主流格式，支持嵌套对象和数组，结构清晰。

#### 7.3 application/x-www-form-urlencoded

```text
POST /login HTTP/1.1
Content-Type: application/x-www-form-urlencoded

username=alice&remember=true
```

键值对用 `&` 连接，键和值需要 URL 编码。传统 HTML 表单默认使用这种格式。

#### 7.4 multipart/form-data（点到）

```text
POST /upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----DemoBoundary

------DemoBoundary
Content-Disposition: form-data; name="title"

产品照片
------DemoBoundary
Content-Disposition: form-data; name="file"; filename="photo.png"
Content-Type: image/png

(此处为图片二进制字节)
------DemoBoundary--
```

它用边界字符串把 Body 分成多个部分，每部分可以有独立的头，特别适合同时提交普通字段和文件。文件上传时通常使用它。入门阶段只需理解结构，实际开发中由表单库或浏览器构造，不手写二进制边界。

#### 7.5 常见误区

> 把 JSON 字符串放进 Body，服务器就一定按 JSON 解析。

必须同时设置 `Content-Type: application/json`，否则服务器可能按表单或纯文本处理。

> form 提交和 JSON 提交可以随意互换而不改任何东西。

两种格式的字节结构完全不同，切换时 Body 组织方式和 Content-Type 都要一起改。

### 8. 用 curl 与 Node.js 观察真实报文

#### 8.1 curl 常用参数

| 参数 | 作用 |
|---|---|
| `-X <方法>` | 指定请求方法 |
| `-H "头: 值"` | 添加请求头 |
| `-d '内容'` | 发送 Body（默认方法会变成 POST） |
| `-i` | 输出中包含响应头 |
| `-I` | 只请求响应头（HEAD） |
| `-v` | 打印连接与报文的详细过程 |

发送 JSON 请求：

```bash
curl -i -X POST http://127.0.0.1:3000/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"机械键盘","price":299}'
```

预期：先输出响应头（状态行加 Header），空行后输出 JSON Body，例如包含新资源 id 的对象。

查看资源不存在：

```bash
curl -i http://127.0.0.1:3000/api/items/999
```

预期：状态行为 `HTTP/1.1 404 Not Found`，Body 中包含错误说明。

#### 8.2 Node.js HTTP 服务：打印请求要素

```javascript
// http-server.js
import { createServer } from 'node:http';

const server = createServer((req, res) => {
  console.log('--- 收到请求 ---');
  console.log('方法:', req.method);
  console.log('目标:', req.url);
  console.log('Host:', req.headers.host);
  console.log('Content-Type:', req.headers['content-type']);

  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });

  req.on('end', () => {
    console.log('Body:', body || '(空)');

    if (req.method === 'POST' && req.url === '/api/items') {
      let data;
      try {
        data = JSON.parse(body);
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Body 不是合法 JSON' }));
      }

      const newItem = { id: Date.now(), ...data };
      const payload = JSON.stringify(newItem);
      res.writeHead(201, {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Location': `/api/items/${newItem.id}`,
      });
      return res.end(payload);
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '资源不存在' }));
  });
});

server.listen(3000, '127.0.0.1', () => {
  console.log('HTTP 服务监听在 http://127.0.0.1:3000');
});
```

启动：

```bash
node http-server.js
```

预期：终端输出监听地址，服务保持运行；用上面的 curl 调用后，终端会打印方法、目标、Header 和 Body。

#### 8.3 Node.js 作为客户端：检查响应要素

```javascript
// http-client.js
import { request } from 'node:http';

const body = JSON.stringify({ name: '显示器', price: 1299 });

const req = request(
  {
    hostname: '127.0.0.1',
    port: 3000,
    path: '/api/items',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Accept': 'application/json',
    },
  },
  (res) => {
    console.log('状态码:', res.statusCode);
    console.log('Location:', res.headers.location);
    console.log('Content-Type:', res.headers['content-type']);

    let responseBody = '';
    res.on('data', (chunk) => {
      responseBody += chunk.toString();
    });
    res.on('end', () => {
      console.log('响应 Body:', responseBody);
    });
  }
);

req.on('error', (error) => {
  console.error('请求失败:', error.message);
});

req.write(body);
req.end();
```

在服务运行时另开终端执行 `node http-client.js`。

预期：客户端打印 201、Location 头、Content-Type 和服务器返回的新资源 JSON。这个实验让“状态码、Header、Body”从抽象定义变成可观察输出。

#### 8.4 常见误区

> Node 服务里 req.headers 的名字可以随意按大小写读取。

Node 会把 Header 名规范化为小写，因此读取时统一用小写键，例如 `req.headers['content-type']`。

> 只要 HTTP 请求返回了内容，就不需要看状态码。

客户端应先根据状态码决定处理分支，再解析 Body，否则错误响应也可能被当成成功数据。

## 课后题

1. 用自己的语言解释 HTTP 的请求-响应模型和无状态特征。无状态协议上如何实现登录体验？
2. 请写出请求报文的四段结构，并说明空行为什么不可省略。
3. 请求行 `GET /api/users?page=2 HTTP/1.1` 中三部分分别是什么？域名应该写在哪里？
4. 用“安全”和“幂等”分析 GET、POST、PUT、DELETE。为什么重复提交 POST 表单可能产生重复数据？
5. 200、201、204 在使用场景上有什么差异？为什么对 204 响应执行 JSON 解析会失败？
6. 场景分析：某站点把旧页面地址配置为 301 跳转到新地址；活动期间又用 302 把一个页面临时跳到报名页；浏览器重新请求某静态资源时收到 304。请分别解释三种响应下客户端应如何动作，并说明 304 通常是否有 Body。
7. 请说明 401 与 403、400 与 422、502 与 504 各自的区别。
8. 场景分析：用户提交订单后连续快速点击三次“提交”，后端用 POST 处理且没有防重逻辑。可能出现什么结果？请结合幂等性解释，并给出两种改进思路。
9. 场景分析：前端调用接口收到 504，而后端开发说“服务进程没有重启、日志里也没有报错”。请解释 504 的含义，并指出还应检查链路中的哪个环节。
10. 场景分析：客户端发送了 JSON 字符串，但服务端一直按表单解析得到空对象。请判断最可能漏掉了什么，并写出修复后的请求关键头。

## 实践练习题

### 练习 1：用 curl 构造并标注报文

#### 任务

使用 curl 对一个公开练习服务（如 httpbin）或本地服务分别发起 GET、带查询的 GET 和 POST JSON 请求，保存原始输出并标注报文结构。

#### 步骤约束

1. 执行 `curl -i http://127.0.0.1:3000/api/items`，保存响应。
2. 执行 `curl -i "http://127.0.0.1:3000/api/items?page=1&size=10"`，观察目标路径中的查询字符串。
3. 执行带 `-H "Content-Type: application/json"` 的 POST 请求，保存响应头和 Body。
4. 在记录中分别圈出状态行、Header、空行和 Body。
5. 再执行一次 `curl -I`，比较 HEAD 与 GET 的输出差异。

#### 提交物

- 四条 curl 命令及完整输出；
- 报文四段标注；
- HEAD 与 GET 对比表；
- 100 至 200 字结构说明。

#### 验收标准

- 能准确指出报文中的四个组成部分；
- POST 请求的 Content-Type 与 Body 一致；
- 能解释 HEAD 为什么没有 Body；
- 命令输出真实、未手工编造。

### 练习 2：Node.js HTTP 服务返回规范响应

#### 任务

基于内置 `http` 模块实现一个最小项目，打印请求要素，并根据请求返回不同状态码与 Header。

#### 步骤约束

1. `GET /api/items` 返回 200 与一个内存数组 JSON。
2. `POST /api/items` 仅接受 JSON；Body 非法时返回 400，成功时返回 201 并设置 Location。
3. 对删除成功返回 204，对不存在的路径返回 404。
4. 所有 JSON 响应设置正确的 Content-Type 与 Content-Length。
5. 服务端日志中打印方法、目标、Content-Type 和 Body。

#### 提交物

- `http-server.js`；
- 覆盖 200、201、204、400、404 五种结果的 curl 记录；
- 服务端日志摘录；
- 一份路由与状态码对照表。

#### 验收标准

- 五种状态码都能通过实际请求触发；
- 响应头中 Content-Type、Content-Length 准确；
- 204 不返回 Body，201 含 Location；
- 非法 JSON 被拦截为 400，服务不崩溃。

### 练习 3：方法、状态码与 Body 编码综合实验

#### 任务

在练习 2 的基础上扩展资源接口，覆盖 PUT/PATCH/DELETE 方法及 409、422 等状态码，并比较 JSON 与 form 两种 Body 编码的解析差异。

#### 步骤约束

1. `PUT /api/items/:id` 整体替换资源，返回 200；id 不存在返回 404。
2. `PATCH` 局部更新；字段不合法（如价格为负）返回 422；版本冲突时返回 409。
3. 用 JSON 和 `application/x-www-form-urlencoded` 各发送一次更新请求，服务端分别正确解析。
4. 对同一资源连续两次 DELETE，记录 204 与随后 404 的结果，并解释其幂等性。
5. 用表格整理每个路由支持的方法、成功码与错误码。

#### 提交物

- 扩展后的服务脚本；
- 两种编码的请求与解析记录；
- 两次 DELETE 的结果记录；
- 路由-方法-状态码总表。

#### 验收标准

- PUT、PATCH、DELETE 语义与状态码选择正确；
- 能解释 422 与 409 的不同触发条件；
- 两种 Body 编码都能被正确解析；
- 能用幂等性解释重复 DELETE 现象。

## 阶段验收作业

### 作业名称

HTTP 报文构造与状态码实验报告

### 作业场景

你要为一个资源型接口建立完整的 HTTP 实验基线，向团队证明你不仅能调用接口，还能回答：

- 请求与响应报文内部由什么构成，每段起什么作用？
- 不同业务动作应选择哪个方法，安全性和幂等性如何影响重复操作？
- 各种状态码分别在描述什么结果，易混码如何区分？
- Header 如何描述内容类型、压缩和协商，Body 编码应如何与 Content-Type 配合？
- 不借助框架，能否用 curl 与 Node.js 原始模块把这些机制跑通？

你需要提交一个可复现的实验项目和证据完整的报告。

### 提交物清单

```text
http-message-lab/
├── src/
│   ├── http-server.js
│   └── http-client.js
├── evidence/
│   ├── curl-records.md       # 各方法与状态码的 curl 记录
│   └── http-report.md        # 报图标注与易混码分析
├── README.md
└── .gitignore
```

`http-report.md` 必须包含：

1. 请求与响应报文四段结构标注（基于真实输出）；
2. 七种方法的语义、安全与幂等分析表；
3. 覆盖全部重点状态码的触发记录与解释；
4. 常见 Header 作用与一次内容协商过程说明；
5. JSON、form、multipart 三种 Body 编码的对比；
6. 至少一个错误请求的完整排查过程。

### 演示步骤

学员需要在 15 分钟内完成以下演示：

1. 讲解请求-响应模型与无状态含义。
2. 展示一份真实请求和响应，逐段标注报文结构。
3. 用 curl 现场触发 GET、POST、PUT、DELETE，并解释安全与幂等性。
4. 展示 200、201、204、400、404 等状态码的实际响应。
5. 演示一次内容协商或压缩响应，解释相关 Header。
6. 用 Node.js 客户端发起请求，读出状态码、Header 和 Body。

导师可以现场改变资源 id、Body 内容或要求触发某个指定状态码，检验学员是否真正掌握。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 报文结构 | 15 | 请求与响应四段结构完整，能逐段解释，空行作用清楚 |
| 方法语义 | 20 | 七种方法选择正确，安全与幂等分析准确 |
| 状态码 | 25 | 重点状态码全覆盖，易混码区分清楚，分类排查合理 |
| Header 与协商 | 15 | 常见 Header 作用正确，MIME 与内容协商理解到位 |
| Body 编码 | 10 | 三种编码能区分并正确配合 Content-Type |
| 工具实践与表达 | 15 | curl 与 Node http 实际跑通，证据完整，README 可复现 |

细分评分规则：

- 报文结构（15 分）：请求结构 7 分；响应结构 8 分。
- 方法语义（20 分）：方法选择 10 分；安全与幂等 10 分。
- 状态码（25 分）：2xx 6 分；3xx 5 分；4xx 8 分；5xx 6 分。
- Header 与协商（15 分）：Header 作用 8 分；MIME 与协商 7 分。
- Body 编码（10 分）：编码与 Header 一致 5 分；multipart 结构理解 5 分。
- 工具实践与表达（15 分）：curl 7 分；Node http 5 分；表达与可复现 3 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 无法说出请求或响应报文的四段结构，或不知道空行作用。
2. 把安全、幂等概念混淆，或无法解释重复 POST 的后果。
3. 不能区分 401 与 403、400 与 422、502 与 504。
4. 状态码与实际场景明显不匹配，例如资源不存在返回 200 且不报错。
5. Body 编码与 Content-Type 不一致导致接口无法解析。
6. 提交真实令牌、密码等凭证。
7. 只提交截图，没有命令记录、脚本和文字解释。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解请求-响应与无状态模型 | 现场讲解与报告第 1 节 |
| 掌握请求报文结构 | 真实请求输出与四段标注 |
| 掌握响应报文结构 | 真实响应输出与状态行分析 |
| 正确选择并分析方法 | 方法语义表与 curl 方法演示 |
| 掌握重点状态码 | 全状态码触发记录与易混码分析 |
| 理解 Header、MIME 与协商 | Header 说明与内容协商演示 |
| 区分 Body 编码 | 三种编码对比与接口解析记录 |
| 使用工具构造与观察报文 | curl 记录与 Node http 客户端实验 |

### 提交前自检

- [ ] 六个学习目标均有对应证据。
- [ ] 报告中的报文标注来自真实命令输出。
- [ ] 七种方法都能说出语义、安全性和幂等性。
- [ ] 全部重点状态码至少被实际触发或在真实响应中识别过一次。
- [ ] Content-Type 与 Body 编码始终保持一致。
- [ ] 对 204 不做 JSON 解析，对 201 能指出 Location。
- [ ] 提交内容不含真实凭证，Authorization 使用占位值。
- [ ] README 能指导另一名学员从零跑通服务并完成全部请求。
