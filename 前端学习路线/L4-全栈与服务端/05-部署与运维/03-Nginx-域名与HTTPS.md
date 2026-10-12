# 03-Nginx、域名与 HTTPS

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L4 全栈与服务端
> - 先修：[02-Vercel / Cloudflare 部署](./02-Vercel-Cloudflare部署.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[NGINX](https://nginx.org/en/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Nginx 的四大核心职能：反向代理、负载均衡、静态文件服务、SSL 终止
- 掌握 Nginx 配置文件的结构（`http → server → location` 三层嵌套）
- 能独立编写反向代理配置，让 Nginx 将请求转发到 Node.js 应用
- 配置静态资源缓存策略，显著提升网站加载速度
- 使用 Let's Encrypt + Certbot 为域名配置免费 SSL 证书
- 设置 HTTP → HTTPS 自动重定向和常用安全头
- 理解 Gzip 压缩与缓存头的实际效果并正确配置
- 实战：用 Nginx 部署 Next.js 应用（反向代理 + SSL + 静态资源缓存）

---

## 内容讲解

### 一、Nginx 是什么？能做什么？

Nginx（发音 "engine-x"）是一个高性能的 HTTP 服务器和反向代理。它用 C 语言写成，基于事件驱动（非阻塞 I/O），能轻松处理数万并发连接，内存占用极低。

对前端开发者来说，Nginx 承担四个核心角色：

```
                        互联网
                          │
                          ▼
               ┌─────────────────────┐
               │       Nginx          │
               │                      │
               │  ① SSL 终止           │  ← HTTPS 解密，后端只处理 HTTP
               │  ② 静态文件服务        │  ← .js/.css/.png 直接返回，不经过 Node.js
               │  ③ 反向代理            │  ← /api/* → localhost:3000
               │  ④ 负载均衡            │  ← 分发到多个 Node.js 实例
               │                      │
               └───┬──────┬──────┬────┘
                   │      │      │
                   ▼      ▼      ▼
              Node.js  Node.js  Node.js
              (实例1)  (实例2)  (实例3)
```

| 角色 | 说明 | 典型场景 |
|------|------|---------|
| **反向代理** | 客户端不知道后端真实地址，Nginx 在中间转发请求 | 前端请求 `/api/*` → Nginx → `localhost:3000` |
| **负载均衡** | 将请求分发到多个后端实例，提高并发能力 | `upstream` 定义多个 Node.js 进程 |
| **静态文件服务** | 直接返回 `.js`、`.css`、图片等静态文件 | 比经过 Node.js 快 10 倍以上 |
| **SSL 终止** | HTTPS 加密/解密在 Nginx 层完成，后端只需处理 HTTP | 证书配置一处，所有后端服务受益 |

### 二、Nginx 配置文件的结构

Nginx 配置文件遵循 `http → server → location` 三层嵌套结构：

```
/etc/nginx/
├── nginx.conf                 ← 主配置文件
├── conf.d/                    ← 子配置目录（按站点分文件）
│   └── myblog.conf            ← 每个站点一个 conf
├── snippets/                  ← 可复用配置片段
│   ├── ssl-params.conf        ← SSL 通用参数
│   └── security-headers.conf  ← 安全头通用配置
└── sites-available/           ← Debian 系的站点配置目录（可选）
```

主配置文件 `nginx.conf` 结构：

```nginx
# /etc/nginx/nginx.conf —— 主配置骨架

# ==================== 全局块 ====================
# 运行 Nginx 的系统用户（安全：不用 root）
user nginx;

# 工作进程数：auto = CPU 核心数（推荐）
worker_processes auto;

# 错误日志路径和级别（debug / info / notice / warn / error / crit）
error_log /var/log/nginx/error.log warn;

# PID 文件位置
pid /var/run/nginx.pid;

# ==================== events 块 ====================
# 每个 worker 进程能同时处理的最大连接数
events {
    worker_connections 1024;
    # 使用 epoll（Linux 下高性能事件驱动模型）
    use epoll;
    # 允许一个连接被多个请求复用（HTTP/2 需要）
    multi_accept on;
}

# ==================== http 块 ====================
http {
    # ----- 基础设置 -----
    include       /etc/nginx/mime.types;     # MIME 类型映射（让浏览器识别文件类型）
    default_type  application/octet-stream;  # 未知类型的默认处理

    # ----- 日志格式 -----
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    access_log /var/log/nginx/access.log main;

    # ----- 性能优化 -----
    sendfile        on;     # 零拷贝发送文件（静态文件服务加速）
    tcp_nopush      on;     # 合并小包发送，减少网络往返
    tcp_nodelay     on;     # 不让小包等待（对 keep-alive 连接有利）

    # 长连接超时时间（秒）
    keepalive_timeout 65;

    # ----- 安全 -----
    server_tokens off;      # 隐藏 Nginx 版本号（避免信息泄露）

    # ----- 包含子配置 -----
    include /etc/nginx/conf.d/*.conf;
}
```

### 三、反向代理配置：让 Nginx 转发请求到 Node.js

这是 Nginx 最常用的配置模式：Nginx 监听 80/443 端口，将请求代理到后端的 Node.js 应用。

```nginx
# /etc/nginx/conf.d/myblog.conf —— 完整的站点配置

# ==================== HTTP 块（80 端口：接收明文请求并重定向到 HTTPS）====================
server {
    listen 80;                       # 监听 HTTP 端口
    listen [::]:80;                  # IPv6 支持
    server_name myblog.com www.myblog.com;  # 站点域名（多个用空格分隔）

    # HTTP → HTTPS 重定向（强制使用加密连接）
    return 301 https://$host$request_uri;
}

# ==================== HTTPS 块（443 端口：生产流量走这里）====================
server {
    listen 443 ssl;                  # 监听 HTTPS 端口
    listen [::]:443 ssl;
    http2 on;                        # 启用 HTTP/2（多路复用、头部压缩）
    server_name myblog.com www.myblog.com;

    # ----- SSL 证书配置（见第五节）-----
    ssl_certificate     /etc/letsencrypt/live/myblog.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/myblog.com/privkey.pem;

    # ----- 反向代理到 Next.js 应用 -----
    location / {
        # 代理到本机的 Node.js 进程（开发中可能用 Docker 容器名）
        proxy_pass http://localhost:3000;

        # 传递客户端的真实信息（否则后端收到的 IP 永远是 127.0.0.1）
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;   # http 或 https
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header X-Forwarded-Port  $server_port;

        # WebSocket 支持（Next.js 热重载需要）
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";

        # 超时设置（单位：秒）
        proxy_connect_timeout 60s;  # 连接后端的超时时间
        proxy_send_timeout    60s;  # 向后端发送数据的超时时间
        proxy_read_timeout    60s;  # 等待后端响应的超时时间
    }

    # ----- 静态资源直接服务（绕过 Node.js）-----
    location /_next/static/ {
        # alias：将 URL 路径映射到文件系统路径
        alias /var/www/myblog/.next/static/;

        # 静态资源缓存：一年（文件名已包含哈希，更新时自动失效）
        expires 1y;
        add_header Cache-Control "public, immutable";

        # 禁止访问 .map 文件（源码映射，生产环境不该暴露）
        location ~ \.map$ {
            deny all;
        }
    }

    # ----- public 目录下的静态文件 -----
    location /images/ {
        alias /var/www/myblog/public/images/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # ----- API 路由（可选：独立的超时和限流）-----
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # API 通常需要更长的超时
        proxy_read_timeout 120s;

        # 限制请求速率（防止滥用）：每秒 10 个请求，突发 20 个
        # limit_req zone=api_limit burst=20 nodelay;
    }

    # ----- 安全头配置（见第六节）-----
    include /etc/nginx/snippets/security-headers.conf;

    # ----- Gzip 压缩（见第七节）-----
    include /etc/nginx/snippets/gzip.conf;
}
```

#### proxy_set_header 的重要性

如果不设置这些 header，后端应用收到的请求会缺少关键信息：

```
没有 proxy_set_header           有 proxy_set_header
Host        → 127.0.0.1         Host        → myblog.com
Remote IP   → 127.0.0.1         X-Real-IP   → 1.2.3.4（真实客户端 IP）
HTTPS?      → 不知道            X-Forwarded-Proto → https
原始请求链   → 丢失              X-Forwarded-For → 1.2.3.4, ...（代理链）
```

### 四、静态文件服务

当 Nginx 直接服务静态文件时，请求不需要经过 Node.js，效率极高。核心配置指令：

```nginx
# 完整的静态文件服务配置
server {
    listen 80;
    server_name static.example.com;

    # root：网站根目录
    root /var/www/static-site;
    index index.html index.htm;

    # try_files：按顺序查找文件，都找不到就返回 index.html（SPA 回退）
    location / {
        try_files $uri $uri/ /index.html;
    }
    # $uri        → 尝试请求的路径本身
    # $uri/       → 尝试作为目录访问（匹配 index 文件）
    # /index.html → 都不存在时回退到 index.html（React/Vue SPA 标准配置）

    # 特定文件类型的缓存策略
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # HTML 文件不缓存（保证用户总能拿到最新版本）
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache";
    }
}
```

**`try_files` 是 SPA 部署的核心**。React Router / Vue Router 的前端路由 URL（如 `/blog/hello`）在服务器端并没有对应的文件。`try_files` 把所有路径回退到 `index.html`，然后由前端 JS 接管路由分发。

### 五、SSL/TLS 证书配置：Let's Encrypt + Certbot

Let's Encrypt 提供免费的 SSL 证书，通过 Certbot 工具自动申请和续签。

#### 5.1 安装并获取证书

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx -y

# 一键获取证书并自动配置 Nginx
sudo certbot --nginx -d myblog.com -d www.myblog.com

# 执行后 Certbot 会：
# 1. 验证域名所有权（通过 HTTP-01 challenge）
# 2. 签发证书并保存到 /etc/letsencrypt/live/myblog.com/
# 3. 自动修改 Nginx 配置添加 SSL 设置
# 4. 设置自动续期定时任务

# 测试自动续期（不真正执行）
sudo certbot renew --dry-run
```

证书文件位置：
- 证书链：`/etc/letsencrypt/live/myblog.com/fullchain.pem`
- 私钥：`/etc/letsencrypt/live/myblog.com/privkey.pem`

Certbot 会自动添加 cron 任务或 systemd timer 来续签证书（Let's Encrypt 证书有效期 90 天，推荐提前 30 天续签）。

#### 5.2 手动 Nginx SSL 配置（Certbot 自动配置的参考）

```nginx
# SSL 证书配置
ssl_certificate     /etc/letsencrypt/live/myblog.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/myblog.com/privkey.pem;

# SSL 协议和加密套件（推荐配置）
ssl_protocols TLSv1.2 TLSv1.3;          # 禁用 TLSv1.0 / TLSv1.1（已过时、不安全）
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;           # 服务器决定加密套件（而非客户端）

# SSL 会话缓存（减少 TLS 握手的计算开销）
ssl_session_cache   shared:SSL:10m;     # 10MB 可存储约 4 万个会话
ssl_session_timeout 10m;                # 会话缓存有效期

# OCSP Stapling：服务器代表客户端查询证书吊销状态，加速 TLS 握手
ssl_stapling on;
ssl_stapling_verify on;
```

### 六、HTTP → HTTPS 自动重定向

上面的完整配置中已经包含了最简单也最可靠的方式：

```nginx
# 80 端口只做一件事：301 永久重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name myblog.com www.myblog.com;
    return 301 https://$host$request_uri;
}
# $host → 用户访问的域名（保留 www / 非 www）
# $request_uri → 完整请求路径（包括查询参数）
```

这样，用户访问 `http://myblog.com/blog/hello?page=2` 会自动跳转到 `https://myblog.com/blog/hello?page=2`，路径和参数都不会丢失。

### 七、常用安全头配置

将以下配置保存为 `/etc/nginx/snippets/security-headers.conf`，然后在 server 块中 `include`：

```nginx
# /etc/nginx/snippets/security-headers.conf

# HSTS：强制浏览器只能通过 HTTPS 访问此域名（防止 SSL 剥离攻击）
# max-age=63072000：2 年
# includeSubDomains：子域名也强制 HTTPS
# preload：允许加入浏览器 HSTS 预加载列表
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# 禁止被 iframe 嵌入（防止点击劫持）
add_header X-Frame-Options "DENY" always;

# 禁止浏览器 MIME 类型嗅探（防止将文本当成可执行文件）
add_header X-Content-Type-Options "nosniff" always;

# 控制 Referer 信息发送策略
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# CSP：内容安全策略（根据实际需求调整，以下是宽松版本）
# default-src 'self'                     只允许同源资源
# script-src 'self' 'unsafe-inline'     允许内联脚本（Next.js 需要）
# style-src 'self' 'unsafe-inline'       允许内联样式
# img-src 'self' data: https:            允许 data URI 图片和 HTTPS 图片
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:" always;

# Permissions Policy：限制浏览器 API 使用
# 禁止相机、麦克风、定位（你的博客通常不需要这些）
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

**安全头效果一览**：

| 安全头 | 攻击类型 | 效果 |
|--------|---------|------|
| HSTS | SSL 剥离攻击 | 浏览器强制用 HTTPS，忽略 HTTP 链接 |
| X-Frame-Options | 点击劫持 | 页面不能被嵌入 `<iframe>` |
| X-Content-Type-Options | MIME 嗅探攻击 | 浏览器严格按 Content-Type 处理资源 |
| CSP | XSS / 数据注入 | 限制可加载的脚本、样式、图片来源 |
| Referrer-Policy | 信息泄露 | 控制跨域时 Referer 头的内容 |

### 八、Gzip 压缩配置

Gzip 压缩能将文本类响应体积减小 60%~80%。以下配置保存为 `/etc/nginx/snippets/gzip.conf`：

```nginx
# /etc/nginx/snippets/gzip.conf

# 启用 Gzip 压缩
gzip on;

# 只压缩文本类内容（图片/视频已压缩过，再压缩浪费 CPU 且不减小体积）
gzip_types
    text/plain
    text/css
    text/javascript
    text/xml
    application/javascript
    application/json
    application/xml
    application/rss+xml
    image/svg+xml
    font/ttf;

# 最小压缩阈值：小于 256 字节的文件不压缩（太小没价值）
gzip_min_length 256;

# 压缩级别 1-9：5 是折中（速度 vs 压缩比）
gzip_comp_level 5;

# 给代理请求也压缩（Varnish / CDN 等在前面时）
gzip_proxied any;

# 在响应头中加 Vary: Accept-Encoding（让 CDN 按是否支持压缩来缓存不同版本）
gzip_vary on;

# 禁用 IE6 的 Gzip（微软早期 bug）
gzip_disable "msie6";
```

验证 Gzip 是否生效：

```bash
# 查看响应头中是否有 Content-Encoding: gzip
curl -I -H "Accept-Encoding: gzip" https://myblog.com | grep Content-Encoding
# 输出：Content-Encoding: gzip
```

### 九、缓存头配置

缓存策略直接决定用户访问网站的速度。核心原则：

| 文件类型 | 缓存策略 | 原因 |
|---------|---------|------|
| 带哈希的 JS/CSS（如 `main.a1b2c3.js`） | `max-age=31536000, immutable` | 文件名变化意味着内容变化，可以"永不过期" |
| HTML 文件 | `no-cache` | 必须验证最新版（否则用户拿不到新发布的页面） |
| 图片/字体 | `max-age=2592000`（30天） | 不常变，中等缓存时间 |
| API 响应 | 不缓存或短缓存 | 数据实时性要求高 |

```nginx
# 带哈希的静态资源：几乎永久缓存（Next.js 打包自动生成哈希文件名）
location ~* ^/_next/static/.*\.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# 普通静态资源：30 天
location ~* \.(jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 30d;
    add_header Cache-Control "public";
}

# HTML：每次请求都验证
location ~* \.html$ {
    expires -1;                          # 等价于 "已经过期"
    add_header Cache-Control "no-cache"; # 可用但每次必须验证（revalidate）
}
```

### 十、实战：用 Nginx 部署 Next.js 应用

完整演练，从服务器初始化到站点上线。

#### 环境假设

- 服务器：Ubuntu 22.04，IP：`123.45.67.89`
- 域名：`myblog.com`（已被解析到服务器 IP）
- 应用：Next.js 项目，运行在 `localhost:3000`

#### 步骤 1：服务器基础配置

```bash
# SSH 登录服务器
ssh root@123.45.67.89

# 更新系统
apt update && apt upgrade -y

# 安装 Nginx
apt install nginx -y

# 启动并设置开机自启
systemctl start nginx
systemctl enable nginx

# 验证 Nginx 运行
systemctl status nginx
curl http://localhost    # 应该看到 Nginx 欢迎页
```

#### 步骤 2：部署 Next.js 应用

```bash
# 安装 Node.js 22（使用 NodeSource 仓库）
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install nodejs -y

# 验证
node --version  # v22.x.x
npm --version

# 创建应用目录
mkdir -p /var/www/myblog
cd /var/www/myblog

# 上传代码（推荐 rsync 或 Git clone）
git clone https://github.com/<你的用户名>/nextjs-blog.git .

# 安装依赖并构建
npm install
npm run build

# 使用 PM2 管理 Node.js 进程（推荐）
npm install -g pm2
pm2 start npm --name "myblog" -- start
# 或跑 standalone 模式：pm2 start node --name "myblog" -- server.js

# 设置 PM2 开机自启
pm2 startup systemd
pm2 save

# 验证应用
curl http://localhost:3000   # 应该返回 HTML
```

#### 步骤 3：配置 Nginx 反向代理

```bash
# 创建 Nginx 配置
nano /etc/nginx/conf.d/myblog.conf
```

粘贴以下完整配置：

```nginx
# /etc/nginx/conf.d/myblog.conf —— 完整生产配置

# ============================
# HTTP → HTTPS 重定向
# ============================
server {
    listen 80;
    listen [::]:80;
    server_name myblog.com www.myblog.com;
    return 301 https://$host$request_uri;
}

# ============================
# HTTPS 主配置
# ============================
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    server_name myblog.com www.myblog.com;

    # SSL 证书（先注释，等申请证书后再解除）
    # ssl_certificate     /etc/letsencrypt/live/myblog.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/myblog.com/privkey.pem;

    # 反向代理到 Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;

        # WebSocket 支持
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";

        # 超时
        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
    }

    # 静态资源直出（绕过 Node.js，性能最优）
    location /_next/static/ {
        alias /var/www/myblog/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";

        # 禁止访问 source map
        location ~ \.map$ {
            deny all;
        }
    }

    # public 目录静态文件
    location /images/ {
        alias /var/www/myblog/public/images/;
        expires 30d;
        add_header Cache-Control "public";
    }

    # ============================
    # 安全头
    # ============================
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ============================
    # Gzip 压缩
    # ============================
    gzip on;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml;
    gzip_min_length 256;
    gzip_comp_level 5;
    gzip_vary on;
    gzip_proxied any;
    gzip_disable "msie6";
}
```

```bash
# 测试配置语法
nginx -t

# 重载 Nginx（平滑重启，不中断现有连接）
nginx -s reload
# 或：systemctl reload nginx
```

#### 步骤 4：申请 SSL 证书

```bash
# 安装 Certbot
apt install certbot python3-certbot-nginx -y

# 申请证书（自动配置 Nginx）
certbot --nginx -d myblog.com -d www.myblog.com

# 测试自动续期
certbot renew --dry-run

# 验证 HTTPS
curl -I https://myblog.com
```

#### 步骤 5：验证上线

```bash
# 验证 HTTPS 配置
curl -I https://myblog.com
# HTTP/2 200
# strict-transport-security: max-age=63072000; includeSubDomains; preload
# x-frame-options: DENY
# x-content-type-options: nosniff
# content-encoding: gzip
# cache-control: ...

# SSL 评级检测（线上工具）
# 访问 https://www.ssllabs.com/ssltest/analyze.html?d=myblog.com
# 目标评级：A 或 A+
```

---

## 常见问题

### Q1：Nginx 配置改了但没生效？

三步排查：
```bash
# 1. 检查语法是否正确
nginx -t

# 2. 如果语法 OK，重载配置
nginx -s reload

# 3. 如果还是不对，检查是否编辑了正确的文件
# Nginx 默认主配置：/etc/nginx/nginx.conf
# 子配置目录：/etc/nginx/conf.d/*.conf
nginx -T | grep "你的配置关键词"    # 查看 Nginx 实际加载的完整配置
```

### Q2：反向代理后，Next.js 里的 `request.url` 为什么是 `http://localhost:3000`？

因为 Next.js 拿不到原始请求信息。Nginx 通过 `proxy_set_header` 把信息传给后端。在 Next.js 中应该用 `headers()` 读取：

```typescript
import { headers } from 'next/headers';

export default async function Page() {
  const headersList = await headers();
  const protocol = headersList.get('x-forwarded-proto') || 'http';
  const host = headersList.get('host') || 'localhost';
  const fullUrl = `${protocol}://${host}`;
  // ...
}
```

### Q3：为什么 SSL 配置后评分不到 A+？

常见扣分项及解决：
- 没有 HSTS → 添加 `Strict-Transport-Security` 头（`max-age` 至少 10886400 秒）
- 使用了弱加密套件 → 参考第五节只启用 TLSv1.2/1.3
- 没开 OCSP Stapling → 添加 `ssl_stapling on; ssl_stapling_verify on;`
- 证书链不完整 → 确保用 `fullchain.pem` 而不是 `cert.pem`

### Q4：`proxy_pass` 末尾加不加 `/` 有什么区别？

这决定了 URI 的拼接方式：

```nginx
# location /api/ + proxy_pass http://backend/  → 替换
# 请求 /api/users → 转发到 http://backend/users

# location /api/ + proxy_pass http://backend   → 追加
# 请求 /api/users → 转发到 http://backend/api/users
```

谜助记符：**proxy_pass 末尾有 `/` → 切掉 location 前缀；没有 `/` → 保留原 URI**。

### Q5：`try_files` 和 `alias` 的区别是？

- **`root`**：拼接 `root路径 + URI` 得到文件系统路径。`root /var/www;` → `/images/logo.png` → `/var/www/images/logo.png`
- **`alias`**：直接替换前缀。`alias /var/www/images/;` → `/images/logo.png` → `/var/www/images/logo.png`
- **`try_files`**：不是路径映射，是按顺序查找文件，用在 `location` 块内部。

### Q6：Nginx 怎么实现负载均衡？

通过 `upstream` 块定义后端服务器组：

```nginx
upstream nextjs_cluster {
    # 默认轮询（round-robin）
    server localhost:3000;
    server localhost:3001;
    server localhost:3002;

    # 可选：weight（权重）、ip_hash（会话保持）、least_conn（最少连接）
    # server localhost:3000 weight=3;   # 权重 3，接收 3 倍请求
}

server {
    location / {
        proxy_pass http://nextjs_cluster;  # 代理到 upstream 组
    }
}
```

### Q7：Let's Encrypt 证书自动续签失败怎么办？

```bash
# 手动尝试续签并查看详细错误
certbot renew --force-renewal --verbose

# 常见原因：
# 1. 80 端口被占用（续签需要 HTTP-01 challenge）
#    → 确保 Nginx 配置中 80 端口没有被误用（return 301 不影响 challenge）
# 2. DNS 解析问题（域名没指向服务器）
#    → 验证：dig myblog.com
# 3. 防火墙拦截
#    → 检查：ufw status  或  iptables -L
```

### Q8：可以用 Nginx 同时代理多个 Next.js 项目吗？

可以。为每个项目创建独立的 server 块或 location 块：

```nginx
# 方案一：不同域名 → 不同 server 块
server { server_name blog.com;    location / { proxy_pass http://localhost:3000; } }
server { server_name shop.com;    location / { proxy_pass http://localhost:3001; } }

# 方案二：同域名不同路径 → 不同 location 块
server {
    server_name mydomain.com;
    location /blog/ { proxy_pass http://localhost:3000; }
    location /shop/ { proxy_pass http://localhost:3001; }
}
```

---

## 实操作业

### 基础练习：本地 Nginx 反向代理

1. 在本地机器安装 Nginx（macOS: `brew install nginx`，Linux: `apt install nginx`）
2. 启动你的 Next.js 开发服务器（`npm run dev`，默认端口 3000）
3. 编写 Nginx 配置，将 `localhost:8080` 反向代理到 `localhost:3000`
4. 在浏览器中访问 `http://localhost:8080`，确认能正常显示 Next.js 页面
5. 在配置中添加静态资源缓存规则

### 进阶练习：云服务器完整部署

1. 在云服务商（阿里云/腾讯云/AWS）上开一台最低配的 Ubuntu 22.04 服务器
2. 购买一个域名（或使用免费子域名），将 DNS 解析到服务器 IP
3. 在服务器上安装 Nginx + Node.js，部署你的 Next.js 项目
4. 配置 Nginx 反向代理 + 静态资源直出
5. 使用 Certbot 申请 SSL 证书，实现 HTTPS 访问
6. 配置安全头和 Gzip 压缩
7. 用 SSL Labs（ssllabs.com/ssltest/）检测 SSL 评级，目标是 A 或以上

### 挑战练习：生产级架构

1. 在隔离环境启动 4 个明确监听 `3001`—`3004` 的 Next.js 进程，使用各实例的 `PORT` 配置；进程管理器运行实际 Node 入口，不能假定对 `npm` 包装命令使用 cluster 参数就正确建立共享监听
2. 在 Nginx 中配置 `upstream` 负载均衡，分发到这 4 个实例
3. 配置 `limit_req` 限流规则（API 每秒 10 次请求，超过返回 429）
4. 研究 Brotli 模块可用性，在相同资源和压缩成本条件下对比 Gzip 的实际体积与耗时，不预设固定收益比例
5. 编写 Nginx 日志分析脚本，统计 Top 10 访问 URL、4xx/5xx 错误率和平均响应时间
6. 模拟一次 Nginx 故障：kill 掉 Nginx 进程，写一个 systemd watchdog 让它自动恢复

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：本地高端口 proxy_pass 到真实应用，nginx -t 先检查；hash 静态资源长缓存，HTML/认证页面不同策略。刷新嵌套路由与请求头透传均验证。
- **进阶**：用受支持 OS/Node，最小开放端口与 HTTPS；证书续期、反代和安全头逐项 curl 验证。扫描只针对自有域名，评级不能代替应用授权与补丁管理。
- **挑战**：四个应用用明确端口 3001-3004，upstream 指向它们，限流返回 429。Brotli 收益实测，日志脱敏；systemd Restart 演练仅隔离服务，重启后检查恢复。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L4 里程碑](../../projects/atlas/milestones/L4.md)
- 本课任务：按 L4 里程碑把“Nginx、域名与 HTTPS”接入 Atlas 全栈版本，明确服务端信任边界、数据契约、失败响应和回滚方式。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

Nginx 是自建部署场景下的核心基础设施。它并不是"后端专属"——前端开发者需要掌握它来完成自己的项目部署：

1. **反向代理**：Nginx 站在前端应用前面，接收公网流量，转发到内部的 Node.js 进程。关键配置是 `proxy_pass` + `proxy_set_header`。
2. **SSL 终止**：用 Certbot + Let's Encrypt 免费获取 HTTPS 证书，Nginx 统一处理加密，后端只需跑 HTTP。
3. **性能优化**：静态文件让 Nginx 直出（绕过 Node.js），配置 Gzip 压缩和分层缓存策略。
4. **安全加固**：HSTS + CSP + X-Frame-Options 等安全头，以及 HTTP → HTTPS 强制重定向。

掌握 Nginx 意味着你不再依赖 Cloud 平台的托管能力——你可以在一台裸机 Linux 上从头部署一个生产级网站。这是前端开发者走向全栈的最后一公里。

至此，L4 全栈与服务端的部署与运维阶段全部完成。你已经掌握了 Docker 容器化、现代托管平台（Vercel/Cloudflare）、以及传统 Nginx 自建部署三种方案，可以根据项目需求灵活选择最合适的部署方式。

<!-- course-nav:start -->
---

[上一篇：02-Vercel / Cloudflare 部署](./02-Vercel-Cloudflare部署.md) · [课程地图](../../README.md) · [下一篇：01 认证、授权与 RBAC](../06-生产后端基础/01-认证授权与RBAC.md)
<!-- course-nav:end -->
