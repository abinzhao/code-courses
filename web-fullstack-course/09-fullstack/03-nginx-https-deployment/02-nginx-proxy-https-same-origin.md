# Nginx 反向代理、HTTPS 与同源安全

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 完整 `deploy/nginx.conf` |
| 建议时间 | 150 分钟 |
| 外部入口 | `https://market.example.test` |
| 内部上游 | Compose 网络中的 `http://api:3000`，不发布宿主端口 |
| 可见成功 | `/api/v1` 原路径到达 API，静态资源与 SPA 分层，日志可关联且不含凭据 |
| 安全目标 | TLS、Cookie、Origin、CSRF、CORS、CSP、限流和授权不互相冒充 |
| 证据边界 | `nginx -t` 是语法/加载证据；只有真实请求才能证明路径、Cookie 和上游行为 |

## 1. 任务背景

浏览器如果从 `https://market.example.test` 加载页面，却直接请求
`http://api:3000`，会遇到不可达内部地址、混合内容、跨源和 Cookie 边界。Nginx 作为唯一外部
入口，在 443 终止 TLS，把 `/api/v1/...` 原样转发到 Compose 网络中的 API；浏览器始终只看到
一个 HTTPS origin。

“同源”减少部署复杂度，但不会自动授权。浏览器自动发送 HttpOnly Cookie，unsafe 请求仍要提交
CSRF token；API 仍要从服务端 session 得到 actor，并对 Listing owner、角色和 version 分别
判断。代理只能可靠传递边界信息，不能替业务服务决定用户有权编辑谁的商品。

## 2. 学习目标

完成本课后，你能够：

1. 配置 HTTP 到 HTTPS 的 308，并解释何时可能形成重定向循环；
2. 保留完整 `/api/v1` URI，预测 `proxy_pass` 有无 URI 部分时的差异；
3. 显式传递 Host、Origin、Cookie、边缘请求 ID 和 forwarded 诊断头；
4. 说明当前 API 尚未启用 trusted proxy，以及未来使用客户端 IP/协议前必须建立的精确一跳边界；
5. 为登录/注册设置独立限流，为 API 设置大小、连接、发送和读取超时；
6. 设计不记录查询串、Cookie、Authorization 或 body 的安全访问日志；
7. 配置 SPA、asset、API、缓存和 MIME 分层；
8. 说明 TLS、HSTS、CSP、CORS、CSRF、认证和授权各自解决什么；
9. 用状态、响应类型、Nginx 日志和 API requestId 诊断代理故障。

## 3. 预备知识

先完成[Web 镜像、SPA 静态路由与缓存](01-web-image-spa-static-cache.md)，并确认：

- API 在容器内监听 `0.0.0.0:3000`，ready 路径为 `/api/v1/health/ready`；
- API 外部前缀已经是 `/api/v1`，Nginx 不负责补前缀；
- API 的 `APP_ORIGIN` 将配置为浏览器实际 origin；
- 生产 Cookie 使用 `Secure`、`HttpOnly`、host-only、`Path=/` 和明确 `SameSite`；
- Nginx 镜像含 `/etc/nginx/mime.types`。

本课配置使用 Docker embedded DNS `127.0.0.11`。离开 Docker 时要替换为该环境真实、受控的
resolver；不能把公网 DNS 地址当成任意内部服务发现方案。

证据分为 **[静态配置]**、**[隔离运行]** 和 **[外部基础设施]**。本机没有 Nginx 时，只能完成
文本审查和可用解析器检查，不得声称 `nginx -t` 或 TLS 请求已通过。

## 4. 核心理论

### 4.1 TLS 终止改变了“谁看到什么”

浏览器到 Nginx 是 HTTPS；同一 Compose 私有网络内 Nginx 到 API 是 HTTP。Nginx覆盖
`X-Forwarded-Proto: https`，为将来需要外部协议的应用提供诊断输入。但第 08 章当前 API 没有启用
Express `trust proxy`，也不读取 forwarded 头来决定身份、授权、Cookie 或重定向，因此本课不能把
这些头描述成“应用已经采纳”。若未来使用 `request.ip`/`request.protocol`，只能在请求确实来自
受信 Nginx 时读取，否则互联网客户端可自行伪造。

若代理与 API 跨越不可信主机或网络，内部 HTTP 不再自动安全，应增加 mTLS、网络加密或服务网格。
“在容器网络里”不是永久的信任证明。

### 4.2 origin 必须精确

origin 是 `scheme + host + port`。`https://market.example.test` 与
`http://market.example.test`、`https://market.example.test:8443` 都不同。Nginx 原样传递浏览器
`Origin`；API 与精确 allowlist 比较。代理不能把所有请求的 Origin 改成“正确值”，否则会掩盖
跨站请求来源。

GET 等无 `Origin` 的安全导航可按 API 规则处理；POST/PUT/PATCH/DELETE 的浏览器请求应有精确
Origin、有效 session 和绑定 session 的 CSRF token。Nginx 还应使用 default server 拒绝未知
Host，避免把攻击者提供的 Host 反射进重定向或 forwarded header。

### 4.3 `proxy_pass` 的 URI 替换规则

本课 location 与 proxy：

```nginx
location /api/ {
  proxy_pass http://market_api;
}
```

`proxy_pass` 没有 URI 部分，因此 `/api/v1/listings` 原样到达上游。若写成：

```nginx
location /api/ {
  proxy_pass http://market_api/;
}
```

末尾 `/` 是 URI 部分，匹配的 `/api/` 会被 `/` 替换，上游看到 `/v1/listings`。这不是语法错误，
但与本项目 API 契约不符。

### 4.4 当前 forwarded 头仅供诊断

本课 Nginx 是互联网边缘，主动丢弃客户端传来的 X-Forwarded-For，只把 TCP 对端地址作为
`X-Forwarded-For` 传给 API。第 08 章 API 未对 Nest 底层 Express 实例配置 `trust proxy`，也不
消费 `X-Forwarded-For`、`X-Forwarded-Host` 或 `X-Forwarded-Proto` 进行身份、授权或安全决策；
这些值当前只可用于受控诊断，不能声称客户端 IP 或外部协议已经由 API 验证。

未来若业务确实使用 Express `request.ip`、`request.ips` 或 `request.protocol`，应把 `trust proxy`
精确配置为 **一跳受控代理**，并测试直连 API、伪造 forwarded 头、经 Nginx 正常请求和多一跳请求。
只有这些测试通过后，才可把对应值用于限流、审计或协议判断；不能用宽泛 `true` 或不受控 hop 数。

若 Nginx 前还有已知负载均衡器，应使用精确 `set_real_ip_from` 和 `real_ip_header` 先恢复真实
地址；不能信任 `0.0.0.0/0`，也不能直接沿用任意客户端 X-Forwarded-For 做限流或审计。

### 4.5 超时和大小限制要有故障语义

- `proxy_connect_timeout` 限制连上 API 的时间；
- `proxy_send_timeout` 限制向 API 写请求的间隔；
- `proxy_read_timeout` 限制从 API 两次读取之间的等待，不是完整业务总时长；
- `client_body_timeout` 限制慢请求体；
- `client_max_body_size` 在进入应用前拒绝过大 body，返回 413。

限制值必须与真实上传需求协调。本章邻里集市没有大文件上传，通用 API 设 1 MiB、登录/注册设
64 KiB；文件上传若以后加入，应有单独 location、流式处理和存储边界。

### 4.6 限流不是账号安全的全部

Nginx 按边缘看到的 IP 限制登录/注册速率，能降低简单滥用，但 NAT、IPv6、分布式攻击和账号维度
都需要服务端策略。限流不能替密码哈希、防枚举、session rotation 或审计。

### 4.7 日志关联不等于记录一切

Nginx 生成 edge request ID，通过 `X-Edge-Request-ID` 响应头返回客户端，也把同名头发送给上游。
第 08 章 API 不采纳入站 `X-Request-ID`，而是自行生成应用 request ID，并通过响应
`X-Request-ID` 和结构化日志返回。Nginx 访问日志同时记录 `$request_id` 与
`$upstream_http_x_request_id`，于是一次 API 请求可关联 edge ID 和 API ID；静态响应或代理失败
时 API ID 可以为空。日志只记录方法、状态、总耗时、上游耗时和字节数，不记录 `$request`、
`$request_uri`、query、Cookie、Authorization、CSRF 或 body。两类 ID 都不能作为高基数指标标签。

### 4.8 安全控制职责表

| 控制 | 主要责任 | 不能替代 |
| --- | --- | --- |
| TLS | 传输机密性、完整性、服务身份 | 认证、授权、CSRF |
| Cookie 属性 | 限制会话凭据暴露/发送范围 | 服务端撤销、对象授权 |
| Origin + CSRF | 防跨站诱导浏览器写入 | XSS、对象授权 |
| CORS | 控制浏览器脚本跨源读取 | CSRF、网络 ACL |
| CSP | 降低部分脚本/资源注入风险 | 输出编码、依赖治理 |
| rate limit | 限制部分请求频率 | 密码策略、账号锁定 |
| 认证 | 建立 actor 身份 | owner/RBAC |
| 对象授权 | 判断 actor 对目标的动作 | TLS、前端隐藏按钮 |

## 5. 元素、属性、API 或配置清单

| 指令 | 本课值 | 可观察作用 | 边界 |
| --- | --- | --- | --- |
| `listen 8443 ssl` | 非 root HTTPS 入口 | TLS handshake | Compose 映射宿主 443，且需要证书 |
| `return 308` | HTTP 永久重定向 | 保留方法语义 | 错误 proto 可能循环 |
| `resolver` | `127.0.0.11 valid=10s` | Compose DNS 重解析 | 只适用于 Docker |
| `upstream zone` | `market_api 64k` | 支持动态解析状态 | 不等于负载均衡健康探测 |
| `proxy_pass` | 无 URI 部分 | 保留 `/api/v1` | 尾斜线会改写 |
| `proxy_set_header Origin` | `$http_origin` | 原样传来源 | API 仍需验证 |
| `proxy_set_header Cookie` | `$http_cookie` | 会话到达 API | 日志不得记录 |
| `X-Edge-Request-ID` | `$request_id` | 关联边缘响应与代理日志 | 不冒充 API `X-Request-ID` |
| `X-Forwarded-*` | 由边缘覆盖 | 提供协议/host/client 诊断值 | 当前 API 未启用 trust proxy，不用于身份/授权 |
| `limit_req_zone` | 5 req/min/IP | 登录入口限流 | 不处理账号维度 |
| `client_max_body_size` | API 1 MiB、auth 64 KiB | 过大请求 413 | 上传需单独设计 |
| `proxy_*_timeout` | 3/15/15 秒 | 故障有界 | 长任务需异步 |
| `log_format safe` | 无 URI/凭据 | edge/API ID 与耗时 | 仍要保留/访问治理 |
| `add_header ... always` | 安全响应头 | 4xx/5xx 也添加 | CSP 必须按真实资源验证 |
| `try_files` | asset 404、页面 fallback | 路径分层 | 不用于 API |

## 6. 最小可运行案例

### 6.1 完整 `deploy/nginx.conf`

在个人 `market` 项目创建以下唯一完整 Nginx 配置：

```nginx
worker_processes auto;
pid /tmp/nginx.pid;

events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;

  sendfile on;
  tcp_nopush on;
  keepalive_timeout 30s;
  client_header_timeout 10s;
  client_body_timeout 10s;
  client_max_body_size 1m;
  server_tokens off;

  resolver 127.0.0.11 valid=10s ipv6=off;

  log_format safe escape=json
    '{"edgeRequestId":"$request_id",'
    '"apiRequestId":"$upstream_http_x_request_id",'
    '"method":"$request_method",'
    '"status":$status,'
    '"requestTime":$request_time,'
    '"upstreamTime":"$upstream_response_time",'
    '"bytes":$body_bytes_sent}';
  access_log /dev/stdout safe;
  error_log /dev/stderr warn;

  limit_req_zone $binary_remote_addr zone=auth_per_ip:10m rate=5r/m;
  limit_req_status 429;

  map $uri $static_cache_control {
    default "";
    ~^/assets/ "public, max-age=31536000, immutable";
    =/index.html "no-cache";
  }

  upstream market_api {
    zone market_api 64k;
    server api:3000 resolve;
    keepalive 16;
  }

  server {
    listen 8080 default_server;
    server_name _;
    return 444;
  }

  server {
    listen 8080;
    server_name market.example.test;
    return 308 https://$host$request_uri;
  }

  server {
    listen 8443 ssl default_server;
    server_name _;

    ssl_certificate /etc/nginx/tls/fullchain.pem;
    ssl_certificate_key /etc/nginx/tls/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    return 444;
  }

  server {
    listen 8443 ssl;
    server_name market.example.test;

    ssl_certificate /etc/nginx/tls/fullchain.pem;
    ssl_certificate_key /etc/nginx/tls/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:TLS:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    root /usr/share/nginx/html;
    index index.html;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "DENY" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'" always;
    add_header Cache-Control $static_cache_control always;
    add_header X-Edge-Request-ID $request_id always;

    location = /api/v1/auth/login {
      limit_req zone=auth_per_ip burst=5 nodelay;
      client_max_body_size 64k;

      proxy_pass http://market_api;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_set_header Host $host;
      proxy_set_header Origin $http_origin;
      proxy_set_header Cookie $http_cookie;
      proxy_set_header X-Edge-Request-ID $request_id;
      proxy_set_header X-Forwarded-For $remote_addr;
      proxy_set_header X-Forwarded-Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_connect_timeout 3s;
      proxy_send_timeout 15s;
      proxy_read_timeout 15s;
      proxy_next_upstream off;
    }

    location = /api/v1/auth/register {
      limit_req zone=auth_per_ip burst=5 nodelay;
      client_max_body_size 64k;

      proxy_pass http://market_api;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_set_header Host $host;
      proxy_set_header Origin $http_origin;
      proxy_set_header Cookie $http_cookie;
      proxy_set_header X-Edge-Request-ID $request_id;
      proxy_set_header X-Forwarded-For $remote_addr;
      proxy_set_header X-Forwarded-Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_connect_timeout 3s;
      proxy_send_timeout 15s;
      proxy_read_timeout 15s;
      proxy_next_upstream off;
    }

    location ^~ /api/ {
      proxy_pass http://market_api;
      proxy_http_version 1.1;
      proxy_set_header Connection "";
      proxy_set_header Host $host;
      proxy_set_header Origin $http_origin;
      proxy_set_header Cookie $http_cookie;
      proxy_set_header X-Edge-Request-ID $request_id;
      proxy_set_header X-Forwarded-For $remote_addr;
      proxy_set_header X-Forwarded-Host $host;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_connect_timeout 3s;
      proxy_send_timeout 15s;
      proxy_read_timeout 15s;
      proxy_next_upstream off;
    }

    location ^~ /assets/ {
      try_files $uri =404;
    }

    location = /index.html {
      try_files /index.html =404;
    }

    location / {
      try_files $uri $uri/ /index.html;
    }
  }
}
```

运行镜像已经固定非 root 用户，因此配置不再用只有 root master 才有意义的 `user` 指令，并只监听
8080/8443 高端口。宿主 80/443 到高端口的映射由下一课 Compose 独占。

API 响应的 `X-Request-ID` 默认透传给客户端；`X-Edge-Request-ID` 是独立的边缘标识。API 未响应、
Nginx 自己拒绝请求或返回静态文件时，客户端仍可用 edge ID 查 Nginx 日志，但不能伪造一个 API ID。

`Content-Security-Policy` 适配本课纯同源 Vite production build，并暂时允许 inline style。若应用
使用外部图片、字体、WebSocket、内联脚本或第三方监控，应从浏览器 CSP violation 逐项收紧/扩展，
不能直接关闭 CSP。不要在初次本地域名实验加入 HSTS；第 3 课说明启用前置。

### 6.2 静态加载检查

在含实际证书文件的容器环境运行：

```bash
docker compose -f compose.yaml -f compose.https.yaml config --quiet
docker compose -f compose.yaml -f compose.https.yaml run --rm --no-deps web nginx -t
```

**[隔离运行预期]** `syntax is ok` 与 `test is successful`，退出 `0`。若证书未挂载，
`nginx -t` 会因文件不存在失败；这说明完整配置依赖证书，不应把证书指令删掉制造绿灯。

当前环境没有 Docker/Nginx 时，可提取配置做文本审查，但结论只能写：

```text
nginx runtime check: blocked-by-tool
command: nginx -t / docker compose ... nginx -t
```

### 6.3 最小路径观察

服务启动后：

```bash
curl --fail --silent --show-error \
  --cacert secrets/tls/local-ca.pem \
  --resolve market.example.test:443:127.0.0.1 \
  https://market.example.test/api/v1/health/ready

curl --silent --show-error --head \
  --resolve market.example.test:80:127.0.0.1 \
  http://market.example.test/listings/bike-1
```

第一条预期 200；第二条预期 308 且 Location 是
`https://market.example.test/listings/bike-1`。`--cacert` 与本地 CA 由第 3 课创建；不能用
`-k` 代替成功证据。

## 7. 邻里集市集成案例

### 7.1 同源登录链

浏览器请求：

```text
POST https://market.example.test/api/v1/auth/login
Origin: https://market.example.test
Content-Type: application/json
```

Nginx：

1. 在边缘 IP 限流；
2. 保留 `/api/v1/auth/login`；
3. 原样转发 Origin/Cookie；
4. 覆盖 X-Forwarded 诊断头，但当前 API 不用它们做身份或授权；
5. 生成 edge request ID，以 `X-Edge-Request-ID` 发给 API 和客户端；
6. 不记录 body、密码、Cookie 或 query。

API：

1. 精确验证 Origin；
2. 验证凭据并创建 opaque session；
3. 设置生产 Secure/HttpOnly Cookie；
4. 返回与 session 绑定的 CSRF token；
5. 自行生成 API request ID，并以 `X-Request-ID` 响应头和日志返回。

Nginx safe log 的 `edgeRequestId` 与客户端 `X-Edge-Request-ID` 一致；`apiRequestId` 来自 API
响应 `X-Request-ID`，可与 API 日志关联。二者职责不同，不能要求 API 沿用 edge ID。

写请求还要：

```text
Cookie: __Host-sid=<浏览器自动发送，不记录>
X-CSRF-Token: <运行时内存值，不记录>
Origin: https://market.example.test
```

用户乙 PATCH 用户甲 Listing 时，即使三项都有效，API 仍因对象授权返回 403；若 owner 使用旧
`version`，返回 409。Nginx 不把 403/409 改写成 200。

### 7.2 API path 保留检查

用一个不存在路径观察：

```bash
curl --silent --show-error --include \
  --cacert secrets/tls/local-ca.pem \
  --resolve market.example.test:443:127.0.0.1 \
  https://market.example.test/api/v1/does-not-exist
```

预期 API 的 404 和结构化错误，不能是 `index.html`。同时检查 API 日志看到的 path 仍是
`/api/v1/does-not-exist`。若变成 `/v1/does-not-exist`，优先查 `proxy_pass` 尾斜线。

### 7.3 请求大小、超时与日志

向登录路径发送超过 64 KiB 的虚构 JSON，应在隔离环境得到 413，API 不应记录密码正文。停止 API
后请求 ready，应在约连接超时范围内得到 502；Nginx safe log 含
edgeRequestId/apiRequestId/status/time，不能出现 URL query、Cookie 或 Authorization。413/502
由 Nginx 产生时 `apiRequestId` 可为空，`edgeRequestId` 仍必须存在。

请求体实验只使用虚构内容和本地目标：

```bash
node -e 'process.stdout.write(JSON.stringify({email:"x".repeat(70000)}))' \
  | curl --silent --show-error --include \
      --cacert secrets/tls/local-ca.pem \
      --resolve market.example.test:443:127.0.0.1 \
      -H 'Origin: https://market.example.test' \
      -H 'Content-Type: application/json' \
      --data-binary @- \
      https://market.example.test/api/v1/auth/login
```

## 8. 常见错误与排查路径

### 明确错误：`proxy_pass` 多了尾斜线

错误：

```nginx
location /api/ {
  proxy_pass http://market_api/;
}
```

| 五段 | 记录 |
| --- | --- |
| 现象 | 浏览器请求 `/api/v1/listings`，代理可连接但 API 返回 404 |
| 证据 | Nginx 状态为 404、upstream time 非空；API 日志显示实际 path 为 `/v1/listings` |
| 原因 | `proxy_pass` 包含 `/` URI，Nginx 用它替换了 location 匹配前缀 `/api/` |
| 修复 | 改成无 URI 部分的 `proxy_pass http://market_api;`，保留完整路径 |
| 复验 | API 日志恢复 `/api/v1/listings`，列表 JSON 保持整数分与 UTC 字段 |

### 308 循环

若 Nginx 前还有代理，外层已经 HTTPS、内层却按 HTTP 重定向，可能循环。检查每跳 Location 和
`X-Forwarded-Proto` 信任链；只信已知上游，不根据任意客户端 header 决定安全协议。

### 登录 429 但所有用户都受影响

检查 `$remote_addr` 是否因上游负载均衡器全部变成同一地址。只有在已知 LB CIDR 下配置 real IP，
再复验伪造 X-Forwarded-For 不改变限流身份。

### Cookie 未发送

检查浏览器 DevTools 的 blocked reason、外部 scheme/host、Secure、SameSite、Path、过期和服务端
Set-Cookie。不要通过删除 Secure 修复 HTTPS 环境；Cookie 存在也不证明 session 未撤销。

### 403 CSRF

区分错误 `code`：Origin 不精确、CSRF token 缺失/跨 session、session 过期、对象无权都可能返回
403，但证据不同。先关联 API requestId，不能在 Nginx 统一把 403 改成成功。

### 502

检查 Nginx error log 是连接拒绝、超时还是 DNS；再看 `docker compose ps`、API readiness 和监听
地址。API 只监听 `127.0.0.1` 时，其他容器无法连接，应监听容器 `0.0.0.0`。

## 9. 课后题

**问题 1：为什么同源部署后仍需要 CSRF？**

参考答案：浏览器会自动携带同源 Cookie，攻击站点可诱导发送部分跨站请求；Origin、SameSite 与
session 绑定 token 是纵深防御。

**问题 2：为什么 API 不能信任任何来源的 X-Forwarded-Proto？**

参考答案：互联网客户端可伪造 header。当前 API 根本未启用 trust proxy，也不消费该值；未来只有
精确一跳代理配置和直连/伪造/正常/多跳测试通过后，才可读取它。

**问题 3：`proxy_read_timeout 15s` 是完整请求总时长吗？**

参考答案：它主要限制两次上游读取之间的等待；复杂总 deadline 还要由应用和下游共同约束。

**问题 4：TLS 是否让用户乙可以编辑用户甲商品？**

参考答案：不能。TLS保护传输和服务身份，对象授权仍由后端依据可信 actor 和目标 owner 决定。

**问题 5：为什么本课不直接启用一年 HSTS？**

参考答案：HSTS 会让客户端长期强制 HTTPS；证书、全部相关 host、恢复和续期尚未实际验证时，长
周期甚至 includeSubDomains 会放大配置错误。

## 10. 实践练习

### 基础：路径与 header 证据

对 ready、缺失 API、深链接和缺失 asset 保存 headers/body。完成标准：API path 保留、asset
404 非 HTML、深链接 200 HTML；响应含安全头，日志不含 query/Cookie。

### 进阶：trusted proxy 设计

画出“客户端 → 可选 LB → Nginx → API”的地址链，为实际环境列出可信 CIDR、谁覆盖哪些 header、
应用信任 hop 数。先记录当前 API 未启用 trust proxy；再为未来配置设计直连、伪造、正常一跳与
额外一跳测试。完成标准：默认不信任互联网 X-Forwarded-*，没有 `0.0.0.0/0` 或宽泛 `true`。

### 故障注入：尾斜线与 502

只在隔离配置中先加入 `proxy_pass .../`，观察 API path；恢复后停止 API 服务，观察 502 和有界
超时，再恢复服务。完成标准：两种故障证据能区分，一个是 URI 改写，一个是上游不可达。

## 11. 阶段验收

- [ ] 完整 `nginx.conf` 在可用目标上 `nginx -t` 退出 0；不可用时记录阻塞。
- [ ] HTTP 到 HTTPS 使用 308，Location 保留 host/path/query。
- [ ] 未知 Host 在 default server 被拒绝，不进入重定向或 API。
- [ ] `/api/v1` 原样到达上游，缺失 API 不进入 SPA。
- [ ] Origin/Cookie 原样传递，forwarded 诊断头由 Nginx 覆盖。
- [ ] 当前 API 未启用 trust proxy，也不把 forwarded 头用于身份/授权；未来一跳配置有精确测试。
- [ ] 客户端同时看到 edge `X-Edge-Request-ID` 与 API `X-Request-ID`，Nginx 日志可关联二者。
- [ ] auth 限流、body limits、连接/发送/读取超时有明确值和 413/429/502 证据。
- [ ] 日志只有允许字段，不含 URI query、Cookie、Authorization、CSRF 或 body。
- [ ] hash asset immutable，入口重验证，MIME 由 `mime.types` 提供。
- [ ] CSP 与真实 production build 核对；HSTS 尚未满足条件时保持关闭。
- [ ] Cookie、Origin、CSRF、CORS、TLS、CSP、认证、对象授权职责分别说明。
- [ ] React 与 Vue 分别执行同一代理和浏览器路径。

## 12. 常见问题

**可以让 Nginx生成 CSRF token 吗？**

不应。token 需要绑定服务端 session 生命周期；API 才持有 session 状态和撤销语义。Nginx只转发
header 并做边缘控制。

**为什么显式设置 Cookie/Origin，Nginx不是默认会转发吗？**

显式写出教学契约，避免后续 include 或代理配置删除。无论默认还是显式，服务端都不能因此跳过
验证。

**能否自动重试 POST 到另一个 upstream？**

不应默认这样做。连接失败后的写操作可能处于“服务端已提交、客户端未收到”状态，盲重试会重复
副作用；本课 `proxy_next_upstream off`，业务幂等由 API 明确定义。

**为何不把完整 URL 写进日志？**

查询串可能含搜索、个人信息或误放 token。路由模板和 requestId 更适合运营关联，具体调试通过
受控应用日志完成。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [Nginx HTTPS 配置](https://nginx.org/en/docs/http/configuring_https_servers.html)：TLS 终止基础。
- [Nginx `proxy_pass`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)：
  核对 URI 替换与代理 headers。
- [Nginx request limit](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)：理解漏桶限流。
- [Nginx real IP](https://nginx.org/en/docs/http/ngx_http_realip_module.html)：只在可信上游恢复客户端地址。
- [MDN Origin](https://developer.mozilla.org/docs/Web/HTTP/Headers/Origin)：精确来源语义。
- [MDN CSP](https://developer.mozilla.org/docs/Web/HTTP/CSP)：从真实资源需求派生策略。
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)：
  对照 Cookie 自动携带风险。

## 我现在能做到什么

我能写出保留 `/api/v1`、限制失败时间并用 edge/API 两级 request ID 关联日志的 Nginx 配置，也能
准确说明当前 API 尚未启用 trusted proxy。我还能解释为什么同源 HTTPS 只是可靠入口，不会替代
Cookie 生命周期、CSRF、认证和对象授权。

## 单元导航

- 章入口：[03 Nginx、HTTPS 与同源部署](../03-nginx-https-deployment.md)
- 上一课：[Web 镜像、SPA 静态路由与缓存](01-web-image-spa-static-cache.md)
- 下一课：[Compose HTTPS、证书与状态码诊断](03-compose-tls-certificate-diagnosis.md)
