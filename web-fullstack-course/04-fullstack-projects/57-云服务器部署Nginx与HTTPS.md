# 57-云服务器部署 Nginx 与 HTTPS

## 目标

完成本知识单元后，学员应能把一个本地可运行的全栈项目真正发布到公网，并用证据证明它“可访问、可恢复、可更新”，而不是只会在面板上点几个按钮。

学员应能够：

1. 说明云服务器实例、操作系统镜像、公网 IP、安全组与防火墙之间的关系，按最小暴露原则规划端口。
2. 使用 SSH 密钥对远程登录 Linux 云主机，完成基础初始化，并解释为什么应禁用口令登录。
3. 使用 systemd 或 pm2 守护 Node.js 进程，说明崩溃重启、开机自启和日志落盘的工作方式。
4. 使用 Nginx 完成静态资源托管与到 Node 服务的反向代理，解释请求在 Nginx 与应用之间的转发链路。
5. 配置域名 DNS 解析，使用 Let's Encrypt 与 certbot 为站点签发并自动续期 HTTPS 证书。
6. 编写可重复执行的部署脚本，通过环境变量注入配置，并具备基本的回滚能力。

本单元是第 57 单元。可观测性与监控将在第 58 单元展开，结业项目的架构与答辩分别在第 59、60 单元讲解。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Ubuntu 24.04 LTS（或 Debian 12） | 云主机操作系统 | 能完成更新、用户与权限管理 |
| Linux 云主机（1–2 vCPU、1–2 GB 内存起步） | 运行 Nginx 与 Node 服务 | 理解实例规格、公网 IP 与计费边界 |
| 云厂商安全组 / `ufw` | 网络访问控制 | 能按最小暴露原则放行 22、80、443 端口 |
| OpenSSH | 远程登录与文件传输 | 能使用密钥对登录，理解公钥与私钥的分工 |
| Node.js 22 LTS 或 24 LTS | 运行后端服务 | 能区分系统 Node 与部署用户环境 |
| systemd | 系统级进程守护 | 能编写 unit 文件并管理服务状态 |
| pm2 | 应用级进程守护 | 能启动、保存进程列表并配置开机自启 |
| Nginx 1.24+ | 反向代理与静态托管 | 能编写站点配置并重载生效 |
| 域名与 DNS 控制台 | 把域名指向主机 | 能配置 A 记录并验证解析结果 |
| Let's Encrypt + certbot | 免费 HTTPS 证书签发与续期 | 能签发、验证自动续期并理解 HTTP-01 校验 |
| Bash | 部署脚本 | 能编写幂等部署脚本并注入环境变量 |

版本约定：

- 命令以 Ubuntu 24.04 LTS 为主线；其他发行版的包管理器命令可能不同，应以其官方文档为准。
- `<SERVER_IP>`、`deploy`、`app.example.com` 等尖括号或示例值均需替换为真实值，不要原样输入。
- 证书、私钥和环境变量文件属于敏感资产，本单元所有示例只出现占位符，不出现真实密钥。

## 详细的理论知识讲解和示例伪代码

### 1. 云服务器实例、镜像与安全组

#### 1.1 定义

云服务器实例是在云厂商机房中运行的一台虚拟机，它有虚拟的 CPU、内存、磁盘和网卡。镜像是实例启动时使用的操作系统模板，例如预装 Ubuntu 24.04 LTS 的磁盘快照。公网 IP 是这台实例在互联网上被寻址的地址。

安全组是实例外部的一层虚拟防火墙，按“协议 + 端口 + 来源 IP”控制入站与出站流量。操作系统内部还可以运行 `ufw`、`nftables` 等本地防火墙。一次请求必须同时通过外部安全组与本机防火墙，才能到达监听端口的进程。

全栈关系：

```text
用户浏览器
   │  请求 https://app.example.com
   ▼
DNS 解析得到公网 IP
   ▼
云厂商网络 → 安全组（端口 443 是否放行）
   ▼
云主机本机防火墙（ufw）
   ▼
Nginx（监听 80/443）
   ▼
反向代理到 Node 应用（监听 127.0.0.1:3000）
```

前端构建产物、Node API 与数据库在一台学习用主机上可以共存，但生产环境通常会把数据库放到独立的托管实例或内网主机，不对公网暴露数据库端口。

#### 1.2 安全组最小开放示例

```text
入站规则：
  协议    端口    来源                  用途
  TCP     22      你的固定网段或可信 IP   SSH 远程管理
  TCP     80      0.0.0.0/0            HTTP，用于跳转 HTTPS 与证书校验
  TCP     443     0.0.0.0/0            HTTPS 正式流量
出站规则：
  默认允许，供系统更新、拉取依赖与访问数据库使用
明确不对公网开放：
  3000（Node 应用端口）、5432（PostgreSQL）、6379（Redis）
```

在主机内部配置 `ufw`：

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status verbose
```

`Nginx Full` 这个应用配置同时包含 80 与 443；`Nginx HTTP` 只包含 80。

#### 1.3 常见误区

> 误区：把 Node 端口 3000 和数据库端口 5432 也在安全组放行，这样“联调方便”。

这会让应用和数据库直接暴露在公网扫描与爆破之下。正确做法是让 Nginx 对外、让 Node 只监听 `127.0.0.1`，数据库只接受本机或内网连接。公网联调应通过 HTTPS 接口或 SSH 隧道完成。

> 误区：安全组放行了端口，就一定是应用的问题。

请求还要经过本机防火墙、端口监听地址和应用层路由。排查时要逐层验证，不能只看一层。

### 2. SSH 密钥登录与服务器初始化

#### 2.1 定义

SSH 是一种加密远程登录协议。密钥登录使用一对数学上相关的密钥：私钥保存在开发者本机且不外传，公钥放到服务器的 `~/.ssh/authorized_keys` 中。登录时服务器用公钥发起挑战，只有持有对应私钥的客户端才能完成应答。

全栈关系：SSH 是全栈工程师操作线上环境的主要通道。部署、查看日志、重启服务、排查故障都依赖它，因此通道本身的安全（密钥强度、禁用 root 口令登录、限制来源）属于交付质量的一部分。

#### 2.2 本地生成密钥并上传公钥

```bash
ssh-keygen -t ed25519 -C "deploy-key-comment"
ls -l ~/.ssh/id_ed25519 ~/.ssh/id_ed25519.pub
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@<SERVER_IP>
```

`id_ed25519` 是私钥，`id_ed25519.pub` 是公钥。上传到服务器的是公钥；私钥永远不通过网络传输。

首次登录并创建部署用户：

```bash
ssh root@<SERVER_IP>
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
exit
```

#### 2.3 加固 SSH 配置

编辑 `/etc/ssh/sshd_config.d/99-hardening.conf`：

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
UsePAM yes
X11Forwarding no
```

应用配置前先保留一个已登录的会话作为“安全绳”，再在第二个终端验证新配置可登录：

```bash
sudo sshd -t
sudo systemctl reload ssh
ssh deploy@<SERVER_IP>
```

初始化系统并安装基础软件：

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx ufw curl git
timedatectl set-timezone Asia/Shanghai
```

#### 2.4 常见误区

> 误区：为了省事，允许 root 用密码登录，反正密码很复杂。

口令登录会持续暴露在自动化爆破之下；一旦口令泄露，攻击者直接获得最高权限。应使用密钥登录、禁止 root 直接登录，通过普通用户加 sudo 管理。

> 误区：改完 sshd 配置立刻关闭所有会话。

配置错误可能导致所有人都无法登录。应保留当前会话，另开终端验证后再关闭。

### 3. Node 进程守护：systemd 与 pm2

#### 3.1 定义

进程守护解决三个问题：应用崩溃后自动重启、主机重启后自动拉起、标准输出被持续收集到日志。直接用 `node dist/main.js` 在 SSH 会话里启动，会话断开时进程可能收到挂断信号而退出，因此不能作为线上运行方式。

systemd 是 Linux 的初始化系统与服务管理器，unit 文件以声明方式描述“启动什么、如何重启、用哪个用户、依赖谁”。pm2 是面向 Node 的进程管理器，提供集群模式、日志切分与保存进程列表等能力。学习阶段要求两种方式都能读懂，并至少精通一种。

全栈关系：进程守护位于 Nginx 之后。Nginx 负责把请求转发到 `127.0.0.1:3000`，systemd/pm2 负责保证这个端口背后始终有一个健康的 Node 进程。

#### 3.2 systemd unit 示例

创建 `/etc/systemd/system/ticket-api.service`：

```text
[Unit]
Description=Ticket System API
After=network.target postgresql.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/opt/ticket-app/current
EnvironmentFile=/opt/ticket-app/shared/.env
ExecStart=/usr/bin/node dist/main.js
Restart=on-failure
RestartSec=3
StandardOutput=append:/var/log/ticket-api/app.log
StandardError=append:/var/log/ticket-api/error.log
NoNewPrivileges=true
ProtectSystem=full

[Install]
WantedBy=multi-user.target
```

启用并管理服务：

```bash
sudo mkdir -p /var/log/ticket-api
sudo chown deploy:deploy /var/log/ticket-api
sudo systemctl daemon-reload
sudo systemctl enable --now ticket-api
systemctl status ticket-api
sudo journalctl -u ticket-api -n 100 --no-pager
curl -fsS http://127.0.0.1:3000/health
```

让应用只监听回环地址的 TypeScript 示例：

```ts
import http from 'node:http';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '127.0.0.1';

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, host, () => {
  console.log(`api listening on http://${host}:${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
```

#### 3.3 pm2 方式示例

```bash
npm install -g pm2
cd /opt/ticket-app/current
pm2 start dist/main.js --name ticket-api --update-env
pm2 save
pm2 startup systemd -u deploy --hp /home/deploy
pm2 status
pm2 logs ticket-api --lines 50
pm2 restart ticket-api
```

`pm2 save` 保存当前进程列表，`pm2 startup` 生成开机自启脚本，两者配合才能在重启后自动恢复。

#### 3.4 常见误区

> 误区：用 nohup 或 screen 挂着进程就算守护。

它们不保证崩溃后自动重启、不保证开机自启、日志与资源限制也缺乏统一管理。线上应使用 systemd 或 pm2。

> 误区：Restart=always 会掩盖所有问题，所以不重启最好。

频繁崩溃时自动重启能维持可用性，但必须结合日志找到根因。正确做法是保留重启策略，同时对重启次数与错误日志设置告警，而不是二选一。

### 4. Nginx 反向代理与静态资源托管

#### 4.1 定义

反向代理是 Nginx 代表用户访问后端服务：用户只与 Nginx 通信，Nginx 再把请求转发给 Node 应用，并把响应返回给用户。对用户而言后端地址与端口是隐藏的。静态托管是 Nginx 直接把磁盘上的前端构建文件（HTML、CSS、JS、图片）返回给浏览器，不需要经过 Node。

全栈关系：

```text
/                 → Nginx 直接返回前端构建目录（SPA 回退到 index.html）
/assets/*         → Nginx 直接返回带长缓存的静态文件
/api/*            → Nginx 反向代理到 http://127.0.0.1:3000
```

这样 Node 只负责动态接口，静态资源由 Nginx 处理，整体延迟更低、职责更清晰。

#### 4.2 站点配置示例

创建 `/etc/nginx/sites-available/ticket-app`：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name app.example.com;

    root /opt/ticket-app/current/public;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用并重载：

```bash
sudo ln -s /etc/nginx/sites-available/ticket-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
curl -I http://app.example.com
```

`try_files ... /index.html` 是单页应用路由的关键：当浏览器直接访问 `/tickets/42` 这样的前端路由时，Nginx 回退返回 `index.html`，再由前端路由渲染页面。

#### 4.3 上传前端构建产物

```bash
npm run build
rsync -az --delete dist/ deploy@<SERVER_IP>:/opt/ticket-app/current/public/
```

`--delete` 保证目标目录与本地构建一致，删除已经不存在的旧文件；使用前应确认源目录正确。

#### 4.4 常见误区

> 误区：前端路由刷新出现 404，于是让后端为所有路径返回 index.html。

问题根因是 Nginx 缺少 SPA 回退规则。应由 Nginx 配置 `try_files` 解决，而不是占用后端资源、污染接口语义。

> 误区：proxy_pass 转发后，后端拿到的 IP 都是 127.0.0.1，无法记录真实用户。

需要通过 `X-Forwarded-For`、`X-Forwarded-Proto` 传递原始信息，并且后端只信任来自本机代理的这些头。

### 5. 域名解析与请求链路

#### 5.1 定义

DNS 把人类可读的域名解析为 IP 地址。A 记录把域名指向 IPv4 地址，AAAA 记录指向 IPv6，CNAME 记录把一个域名别名指向另一个域名。解析存在缓存与生效延迟，TTL 决定递归服务器缓存这条记录的时间。

全栈关系：证书签发（域名必须指向本主机）、Cookie 作用域、回调地址和邮件链接都依赖正确的域名与解析。全栈工程师需要看懂“域名 → IP → 端口 → 虚拟主机 → 应用”这条完整链路。

#### 5.2 配置与验证

在域名注册商或 DNS 服务商控制台添加：

```text
类型    主机记录    值                  TTL
A       @          <SERVER_IP>         600
A       www        <SERVER_IP>         600
```

在本机验证解析：

```bash
dig +short app.example.com
nslookup app.example.com
ping -c 2 app.example.com
```

Nginx 按 `Host` 头区分同一台主机上的多个站点。因此即使两个域名解析到同一个 IP，只要 `server_name` 不同，Nginx 也能返回不同站点；未匹配任何站点时由 `default_server` 处理。

#### 5.3 常见误区

> 误区：刚加完解析立刻签发证书，失败了就以为 certbot 有问题。

DNS 生效需要时间，递归解析器可能持有旧缓存。应先用 `dig` 确认域名已经解析到本机 IP，再签发证书；调试期可使用较短 TTL。

> 误区：只配置 www，不配置根域名，访问根域名时落到别人的默认站点。

应明确规划根域名与 www 的关系：要么都提供并统一跳转，要么明确只使用一个。

### 6. Let's Encrypt 与 certbot 签发 HTTPS

#### 6.1 定义

HTTPS 在 HTTP 与 TCP 之间加入 TLS：通过证书验证服务器身份，通过非对称密钥协商会话密钥，随后加密传输内容。Let's Encrypt 是免费、自动化的证书颁发机构；certbot 是常用的官方客户端，支持通过 Nginx 插件自动完成域名校验、证书安装与配置改写。

HTTP-01 校验的原理：Let's Encrypt 请求 `http://<域名>/.well-known/acme-challenge/<令牌>`，certbot 在本机放置对应文件，证明申请者确实控制该域名指向的服务器。证书有效期为 90 天，因此自动续期是必备能力，不是可选项。

全栈关系：启用 HTTPS 后，安全 Cookie、`X-Forwarded-Proto: https`、HTTP 到 HTTPS 的跳转必须一起收口；现代浏览器 API（部分定位、相机等能力）也要求安全上下文。

#### 6.2 签发证书

```bash
sudo certbot --nginx \
  -d app.example.com \
  -d www.example.com \
  --redirect \
  --agree-tos \
  -m admin@example.com \
  --no-eff-email
```

签发完成后，certbot 会把 Nginx 配置改写为监听 443 并引用证书，同时把 80 端口请求 301 跳转到 HTTPS。验证结果：

```bash
sudo nginx -t && sudo systemctl reload nginx
curl -I http://app.example.com
echo | openssl s_client -connect app.example.com:443 -servername app.example.com 2>/dev/null | openssl x509 -noout -dates
```

#### 6.3 自动续期

```bash
sudo systemctl list-timers | grep certbot
sudo certbot renew --dry-run
sudo journalctl -u certbot --no-pager -n 50
```

`certbot renew --dry-run` 向测试环境模拟续期，不会改动正式证书。安装 certbot 时通常已注册 `certbot.timer`，每天运行两次，在证书到期前 30 天内自动续期并重载服务。

签发后的 Nginx 配置关键片段：

```nginx
server {
    listen 443 ssl;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Host $host;
    }
}
```

#### 6.4 常见误区

> 误区：证书签发成功就万事大吉，90 天后网站突然“掉证书”。

忘记配置或验证自动续期是最常见的线上事故之一。必须执行续期演练，并确认续期后 Nginx 会被自动 reload。

> 误区：把私钥提交进 Git，或复制到多个不受控的位置。

`privkey.pem` 一旦泄露，攻击者可冒充该站点。私钥只存在于服务器受控目录，仓库中只保存示例路径，不保存内容。

### 7. 部署脚本、环境变量注入与回滚

#### 7.1 定义

部署脚本把“拉取代码、安装依赖、构建、上传产物、重启服务、健康检查”固化为可重复执行的过程。幂等是指同一脚本重复执行结果一致，不会因为“已经装过”而报错。环境变量注入是在运行时把数据库地址、密钥等与环境相关的值传给进程，使同一份构建产物可在不同环境运行。

回滚是在新版本异常时，快速把服务切回上一个可用版本。常见做法是使用版本化目录加 `current` 软链接：发布新版本不覆盖旧版本，切换链接即可完成发布与回退。

全栈关系：

```text
本地或 CI 构建产物
   ▼
服务器目录结构：
/opt/ticket-app/
  ├── releases/20261009-1015/   本次版本
  ├── releases/20261008-1640/   上一版本
  ├── shared/.env               环境变量（不进仓库）
  └── current -> releases/20261009-1015
```

#### 7.2 环境变量文件示例

`/opt/ticket-app/shared/.env`（文件权限 `600`，属主为部署用户）：

```text
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
DATABASE_URL=postgresql://ticket_app:请替换为强口令@127.0.0.1:5432/ticketdb
SENTRY_DSN=https://examplePublicKey@error-tracker.invalid/1
LOG_LEVEL=info
```

Node 中读取配置并在启动时校验必填项：

```ts
function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    console.error(`missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  sentryDsn: process.env.SENTRY_DSN,
};
```

`.env` 必须写进 `.gitignore`；仓库中可以提供 `.env.example`，只包含键名与占位说明。

#### 7.3 部署脚本示例

本地 `scripts/deploy.sh`：

```bash
#!/usr/bin/env bash
set -euo pipefail

SERVER="deploy@<SERVER_IP>"
APP_DIR="/opt/ticket-app"
RELEASE="$(date +%Y%m%d-%H%M%S)"
REMOTE_RELEASE="${APP_DIR}/releases/${RELEASE}"

npm ci
npm run build

ssh "${SERVER}" "mkdir -p ${REMOTE_RELEASE} ${APP_DIR}/shared"
rsync -az --delete dist/ "${SERVER}:${REMOTE_RELEASE}/public/"
rsync -az package.json package-lock.json "${SERVER}:${REMOTE_RELEASE}/"

ssh "${SERVER}" "bash -s" <<REMOTE
set -euo pipefail
cd "${REMOTE_RELEASE}"
npm ci --omit=dev
ln -sfn "${APP_DIR}/shared/.env" "${REMOTE_RELEASE}/.env"
ln -sfn "${REMOTE_RELEASE}" "${APP_DIR}/current"
sudo systemctl restart ticket-api
for i in \$(seq 1 10); do
  if curl -fsS http://127.0.0.1:3000/health; then
    echo "deploy ${RELEASE} healthy"
    exit 0
  fi
  sleep 2
done
echo "health check failed, rolling back" >&2
PREVIOUS=\$(ls -1dt ${APP_DIR}/releases/*/ | sed -n '2p')
ln -sfn "\${PREVIOUS%/}" "${APP_DIR}/current"
sudo systemctl restart ticket-api
exit 1
REMOTE
```

注意脚本最后通过健康检查决定成败，失败时自动切回上一版本并返回非零退出码，CI 会据此判定部署失败。

#### 7.4 常见误区

> 误区：把生产数据库口令写在源码里，或者提交 `.env` 文件。

代码会进入版本历史、可能被多人看到甚至打包到前端。敏感值只通过受控的环境变量文件或密钥管理服务注入，并且仓库中永不保存真实值。

> 误区：直接在服务器上改代码、改完重启，下次发布又被覆盖。

服务器应只接收部署产物，任何变更都走代码仓库与发布流程，保证线上状态可追溯、可重建。

### 8. 上线验证与常见故障排查

#### 8.1 定义

上线验证是在发布后用一组可重复的检查确认“站点活着、证书有效、接口正常、跳转正确”。它依赖证据而不是感觉：HTTP 状态码、证书有效期、健康检查响应、服务与监听状态。

全栈关系：排查遵循从外到内的顺序，与请求实际经过的层级一致。

#### 8.2 标准验证清单

```bash
curl -I http://app.example.com          # 期望 301 到 https
curl -I https://app.example.com         # 期望 200
curl -fsS https://app.example.com/api/health
sudo systemctl status ticket-api --no-pager
ss -ltnp | grep -E ':80|:443|:3000'
sudo journalctl -u ticket-api -n 50 --no-pager
sudo tail -n 50 /var/log/nginx/error.log
```

分层排查流程：

```text
1. DNS：dig 域名是否解析到本机 IP
2. 网络：安全组与 ufw 是否放行，本机能否访问
3. Nginx：nginx -t 是否通过、监听是否存在、错误日志内容
4. 应用：systemctl 状态、应用日志、127.0.0.1:3000/health
5. 数据层：数据库是否运行、连接串与权限是否正确
6. 每次只改一个变量，改完重复同一组检查
```

Nginx 常见状态与含义：

```text
502 Bad Gateway       反向代理找不到或连不上后端（服务没起、端口不对、崩溃）
504 Gateway Timeout   后端在超时时间内没有响应
404 Not Found         静态文件不存在，或 SPA 回退规则缺失
413 Content Too Large 上传体超过 client_max_body_size 限制
```

例如修复上传体积限制：

```nginx
server {
    client_max_body_size 10m;
    # 其余配置不变
}
```

#### 8.3 常见误区

> 误区：浏览器报错就不断重启服务。

502 多半是后端连不通，要先看应用状态与日志；盲目重启可能暂时恢复，却丢掉了定位根因的机会。

> 误区：只在自己电脑上验证通过就算上线成功。

本地网络、DNS 缓存与公司内网都可能制造“只有我能访问”的假象。应使用公网环境、外部探测点或手机网络复核。

## 课后题

1. 云服务器实例、操作系统镜像、公网 IP 和安全组分别是什么？请按请求实际经过的顺序描述一次访问如何到达 Node 应用。
2. 为什么安全组与本机防火墙要同时配置？两者规则冲突时会发生什么？
3. 解释 SSH 公钥与私钥在登录过程中的分工。为什么应禁用口令登录并禁止 root 直接登录？
4. systemd unit 文件中的 `Restart=on-failure`、`EnvironmentFile` 和 `WantedBy=multi-user.target` 分别解决什么问题？
5. 场景分析：站点访问返回 502。请按从外到内的顺序列出至少五个检查点，并说明每个检查点如何帮助缩小范围。
6. 场景分析：前端页面在首页正常，但进入 `/tickets/42` 后刷新出现 404。根因最可能是什么？应如何修复，为什么不应让 Node 兜底所有路径？
7. 场景分析：certbot 签发证书失败。请列出至少四个与 DNS、安全组、80 端口有关的排查方向。
8. 为什么证书自动续期是必备能力？`certbot renew --dry-run` 的作用是什么，不验证可能导致什么后果？
9. 场景分析：部署脚本运行后健康检查失败。说明版本化目录加 `current` 软链接如何帮助快速回滚，并写出回滚后必须执行的验证。
10. 为什么 `.env` 不能提交进仓库，而前端构建产物中也不能出现数据库口令？同一份代码如何在不同环境注入不同配置？

## 实践练习题

### 练习 1：云主机初始化与密钥登录

#### 任务

申请一台 Linux 云主机，完成安全组规划、SSH 密钥登录与系统初始化，使服务器具备接收部署的基础条件。

#### 步骤约束

1. 选择 Ubuntu 24.04 LTS 镜像，记录实例规格与公网 IP。
2. 在安全组仅放行 22、80、443 端口，SSH 来源限定为可信网段。
3. 本地生成 ed25519 密钥对，使用密钥创建并登录部署用户。
4. 禁用 SSH 口令登录与 root 直接登录；改配置时保留已登录会话并另开终端验证。
5. 配置 `ufw`，安装 Nginx、certbot、git、curl，并设置时区。
6. 明确验证 3000 与 5432 端口无法从公网访问。

#### 提交物

- 安全组规则截图或导出文本（IP 可部分打码）；
- SSH 加固配置文件与验证登录过程记录；
- `ufw status verbose` 输出；
- 一份 200 字以内的初始化说明。

#### 验收标准

- 只能使用密钥登录，口令登录被拒绝；
- 22、80、443 以外的端口对公网关闭；
- 基础软件安装完整，系统时间与时区正确；
- 提交物不含私钥、口令等敏感信息；
- 另一名学员按说明可完成同样初始化。

### 练习 2：Nginx 反向代理与静态托管

#### 任务

把一个前端构建产物和一个提供 `/health` 的 Node 服务部署到主机，通过 Nginx 实现静态托管、SPA 回退与 `/api` 反向代理。

#### 步骤约束

1. Node 服务只监听 `127.0.0.1:3000`，由 systemd 或 pm2 守护并设置开机自启。
2. Nginx 站点配置包含静态目录、`/assets/` 长缓存、`/api/` 反代和 SPA 回退。
3. 使用 `nginx -t` 校验后再 reload。
4. 前端构建产物通过 rsync 上传，不手工在服务器上编辑。
5. 至少验证：首页 200、前端路由刷新不 404、`/api/health` 返回 200。
6. 记录一次人为制造的 502（停掉应用）及其恢复过程。

#### 提交物

- Nginx 站点配置文件；
- systemd unit 或 pm2 进程配置；
- 三类验证的命令与结果记录；
- 502 制造与恢复的过程记录。

#### 验收标准

- 静态资源由 Nginx 直接返回并带有缓存头；
- `/api` 请求被正确代理，后端能取得转发头信息；
- 前端路由刷新正常；
- 应用崩溃可被守护进程重启；
- 公网无法直接访问 3000 端口。

### 练习 3：域名 HTTPS 与自动化部署

#### 任务

为站点配置域名解析，签发 HTTPS 证书并验证自动续期，同时使用版本化目录部署脚本完成一次发布、一次失败回滚演练。

#### 步骤约束

1. 添加 A 记录并用 `dig` 确认解析生效后再签发证书。
2. 使用 certbot Nginx 插件签发证书并开启 HTTP 到 HTTPS 跳转。
3. 执行 `certbot renew --dry-run`，确认续期定时器存在。
4. 编写幂等部署脚本：上传产物、切换 `current` 软链接、重启服务、做健康检查。
5. 环境变量通过 `shared/.env` 注入，权限设为 600，仓库只提供 `.env.example`。
6. 演练一次健康检查失败后的自动回滚，并记录回滚版本号与验证结果。

#### 提交物

- 部署脚本与目录结构说明；
- 证书签发、跳转与续期演练记录；
- 一次成功发布和一次回滚演练的完整日志；
- `.env.example` 与 `.gitignore` 相关片段。

#### 验收标准

- 站点通过 HTTPS 访问，证书有效且 HTTP 自动跳转；
- 自动续期演练通过；
- 部署脚本重复执行不报错，失败时返回非零退出码；
- 回滚后服务恢复且有健康检查证据；
- 仓库与提交物中没有任何真实密钥。

## 阶段验收作业

### 作业名称

全栈应用公网发布与 HTTPS 交付

### 作业场景

团队要求你把结业项目的第一个可运行版本发布到公网，并证明它满足三条工程底线：外部只暴露必要端口，Node 服务在崩溃和重启后能自动恢复，发布过程可重复、可回滚。你需要独立完成从云主机初始化到 HTTPS 上线的全过程，并提交可复现的部署材料。

### 提交物

```text
deploy-pack/
├── docs/
│   ├── 架构与端口说明.md
│   ├── 部署手册.md
│   └── 上线验证报告.md
├── nginx/
│   └── ticket-app.conf
├── systemd/
│   └── ticket-api.service
├── scripts/
│   ├── deploy.sh
│   └── rollback.sh
├── .env.example
└── README.md
```

提交物必须包含：安全组与防火墙规划、SSH 加固方式、Nginx 配置、进程守护配置、证书与续期证据、一次成功发布与一次回滚记录。

### 演示步骤

学员需在 20 分钟内完成：

1. 用架构图说明请求从浏览器到 Node 的完整链路与每一层的控制点。
2. 展示安全组与 `ufw` 规则，证明仅 22、80、443 对外开放。
3. 使用密钥 SSH 登录服务器，展示应用只监听 `127.0.0.1:3000`。
4. 重启应用进程，展示守护进程自动恢复与健康检查结果。
5. 通过 HTTPS 访问站点，展示证书有效期与 HTTP 到 HTTPS 跳转。
6. 执行部署脚本完成一次发布，并现场演练一次回滚。
7. 回答导师针对 502、证书续期或环境变量注入的追问。

导师可临时更换演示子域名或要求学员从干净主机开始，以验证流程是真正掌握而非背诵。

### 评分标准（100 分）

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 服务器与网络基础 | 15 | 实例、安全组、防火墙、监听地址关系清晰，端口最小开放 |
| SSH 与系统加固 | 10 | 密钥登录、禁用口令与 root 登录、操作可验证 |
| 进程守护 | 15 | systemd 或 pm2 配置正确，崩溃重启与开机自启有效 |
| Nginx 配置 | 20 | 静态托管、反向代理、缓存与 SPA 回退完整正确 |
| HTTPS 与证书 | 15 | 证书有效、跳转正确、自动续期通过演练 |
| 部署脚本与回滚 | 15 | 脚本幂等、环境变量注入规范、失败可自动回滚 |
| 文档与表达 | 10 | 手册可复现，证据齐全，能讲清取舍与风险 |

细分要点：

- 服务器与网络基础：链路图 6 分，规则与证据 9 分。
- Nginx 配置：反代 8 分，静态与缓存 6 分，SPA 回退 6 分。
- 部署脚本与回滚：幂等与健康检查 8 分，回滚有效 4 分，环境变量规范 3 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过：

1. 站点无法通过 HTTPS 正常访问，或证书由不受信任来源签发。
2. Node 应用或数据库端口直接暴露在公网。
3. 进程没有守护，SSH 会话断开后服务停止。
4. 部署只能手工操作，无法按手册在干净环境复现。
5. 发布失败后无法在 10 分钟内恢复服务。
6. 提交真实口令、私钥、证书私钥或完整数据库连接串。
7. 只提交截图，没有配置文件、脚本与命令证据。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解实例、镜像、公网 IP 与安全组 | 架构与端口说明、规则演示 |
| 使用 SSH 密钥安全登录 | 加固配置、现场密钥登录演示 |
| 守护 Node 进程 | systemd/pm2 配置与重启恢复演示 |
| 使用 Nginx 反代与静态托管 | Nginx 配置与三类访问验证 |
| 配置域名与 HTTPS | DNS 记录、证书信息与续期演练 |
| 编写部署脚本并注入环境变量 | deploy.sh、`.env.example`、发布日志 |
| 具备回滚能力 | rollback.sh 与回滚演练记录 |

### 提交前自检

- [ ] 安全组与 `ufw` 都只放行 22、80、443。
- [ ] SSH 仅允许密钥，root 与口令登录已禁用。
- [ ] Node 只监听回环地址，公网访问 3000 被拒绝。
- [ ] 守护进程已设置开机自启，崩溃后能自动恢复。
- [ ] `nginx -t` 通过，前端路由刷新不出现 404。
- [ ] HTTPS 证书有效，80 端口正确跳转到 443。
- [ ] `certbot renew --dry-run` 通过，续期定时器存在。
- [ ] 部署脚本幂等，健康检查失败时返回非零并自动回滚。
- [ ] `.env` 权限为 600 且未进入版本库，提交物中无真实密钥。
- [ ] 部署手册可指导另一名学员从零复现整个流程。
