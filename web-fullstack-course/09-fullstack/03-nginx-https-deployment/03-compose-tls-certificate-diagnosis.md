# Compose HTTPS、证书与状态码诊断

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 完整 `compose.https.yaml` 覆盖文件、无 `!reset` 时的完整独立栈和本地证书 runbook |
| 建议时间 | 150 分钟 |
| 目标 | 只把 Nginx 80/443 绑定到本机回环；API 与 PostgreSQL 只在 Compose 网络可达 |
| 证书 | 两日本地 CA/叶证书，仅供显式信任测试；私钥不进 Git/镜像/教材仓库 |
| 容器身份 | Web 显式使用当前非 root 宿主 UID/GID，与 `700` 证书目录和 `600` 私钥 owner 一致 |
| 故障范围 | 308、SPA/asset/API 404、CSRF 403、Cookie 缺失、502、DNS 与证书信任 |
| 证据边界 | 本地显式 CA 不证明公网信任、ACME 续期、HSTS 或真实 DNS |

## 1. 任务背景

前两课已经定义 Web 镜像和 Nginx 配置，但尚未把证书、API origin、端口与私有网络组合起来。
Compose 覆盖文件可以在保留第 2 章数据库/API 定义的同时：

- 清除 API 的宿主端口；
- 把 `APP_ORIGIN` 改为真实浏览器 HTTPS origin；
- 增加 Web 服务并只读挂载证书；
- 让 Web 容器进程使用创建证书的同一非 root UID/GID；
- 只对本机回环发布 80/443；
- 保持数据库和 API 只能通过服务名访问。

配置能启动不等于所有 404 都相同。页面深链 404、asset 404、API 404 分属三个路由层；403 可能
来自 CSRF 或对象授权；502 表示代理无法获得有效上游响应；证书错误甚至发生在 HTTP 请求发送前。
诊断要先确认失败发生在哪一层。

## 2. 学习目标

完成本课后，你能够：

1. 用 Compose 覆盖文件移除 API 宿主端口并加入 Web/TLS；
2. 解释 `!reset` 的版本前提，并在不能验证时使用完整独立文件；
3. 生成只供本地实验的 CA 和带 SAN 叶证书；
4. 用 `--cacert` 和 `--resolve` 验证 hostname，而不是使用 `curl -k`；
5. 区分本地信任、内部 CA、公共 CA、ACME HTTP-01 与 DNS-01；
6. 在替换证书后先 `nginx -t` 再 reload；
7. 识别服务名解析与容器 IP 变化导致的 stale upstream；
8. 用请求、headers、body、Nginx error log、API requestId 和 Compose 状态完成五段诊断；
9. 顺序验收 React 与 Vue，不同时改变前端、API、证书和 origin。

## 3. 预备知识

先完成：

- [Web 镜像、SPA 静态路由与缓存](01-web-image-spa-static-cache.md)；
- [Nginx 反向代理、HTTPS 与同源安全](02-nginx-proxy-https-same-origin.md)；
- 第 2 章 `compose.yaml` 中 PostgreSQL 18、`migrate`、`api` 与 secret 文件。

在个人 `market` 根目录确认：

```bash
openssl version
docker version
docker compose version
```

这些命令只记录工具事实。当前环境明确没有 Docker/Nginx 时，后续 Compose/Nginx 结果均标为
`blocked-by-tool`；OpenSSL 语法可单独检查，但不能借此声称容器 HTTPS 已通过。

本课域名 `market.example.test` 是保留的示例名，不能申请公共证书。浏览器测试若要使用它，需要
仅在个人机器配置本地解析，或使用测试工具的 `--resolve`；不修改企业 DNS。

## 4. 核心理论

### 4.1 覆盖文件不是整份配置

Compose 按文件顺序合并。普通列表常常追加，不一定清除 base 中的端口。`!reset []` 明确要求把
`api.ports` 重置为空；但它依赖支持该标签的 Compose v2。只有实际
`docker compose ... config` 输出能证明当前版本完成了预期合并。

若工具不支持标签，不要假设 `ports: []` 一定清除继承值。使用本课完整 standalone 文件，或在
受控版本升级后重新验证。

### 4.2 宿主发布端口与容器 `expose` 不同

API 容器可以在 Compose 网络监听 3000，Web 通过 `api:3000` 访问，不需要 `ports`。`ports`
把服务暴露到宿主；生产/本地同源栈只发布 Web。数据库同理，不应为了图形化客户端方便而默认暴露
5432。

本课端口绑定 `127.0.0.1:80/443`，不会监听局域网接口。若本机端口被占用，先定位进程；可以为
一次性测试改为 8080/8443，但随后 `APP_ORIGIN`、证书访问 URL 和重定向策略都必须包含新端口。

### 4.3 证书链同时证明名称与信任

TLS 客户端至少检查：

1. 证书有效期；
2. SAN 是否包含请求 hostname；
3. 签发链是否到达客户端信任的 CA；
4. 签名和用途是否有效。

`curl -k` 关闭关键校验，只能帮助区分“TLS 校验失败”和“端口未监听”，不能作为成功证据。本课
创建本地 CA，签发 SAN 为 `market.example.test` 的叶证书，再通过 `--cacert local-ca.pem`
显式信任该 CA。

### 4.4 私钥权限与容器身份必须一致

证书可以公开，私钥必须限制读取。叶私钥只读挂载给 Nginx，不写进镜像；本地 CA 私钥保留在精确
`/tmp` 目录，用完删除。真实环境使用受控 secret store、文件权限、轮换和审计，不把长期 CA 私钥
放在应用主机。

本课把宿主证书目录设为 `700`、叶私钥设为 `600`。若 Web 仍以镜像固定 UID 101 运行，而文件由
宿主其他 UID 创建，容器就无法遍历目录或读取私钥；把 key 改成 group/world-readable 会制造泄漏。
本地 bind mount 的一致方案是：由非 root 操作者生成证书，导出其 `id -u`/`id -g`，Compose Web
显式使用同一 `user`。覆盖镜像用户后，`/var/cache/nginx` 的 tmpfs 也必须归该 UID/GID，`/tmp`
保持 sticky world-writable；高端口与 `cap_drop: ALL` 保持不变。

### 4.5 ACME 是外部控制平面

- HTTP-01 要求公网 DNS 指向目标、80 可达，并正确服务
  `/.well-known/acme-challenge/`；
- DNS-01 通过 DNS TXT 证明控制权，适合 wildcard，但 DNS API 凭据必须最小权限；
- ACME client 负责账号、订单、续期和原子替换，本课 Nginx/Compose 文件本身不会自动签发；
- 替换成功后应先测试新文件，再安全 reload，并监控到期时间。

本地 `.example.test`、自签 CA 或 `--resolve` 都不证明上述流程。

### 4.6 reload 与动态 DNS

容器重建后 IP 可能变化。Nginx 若只在启动时解析一次 `api`，会继续连接旧 IP。上一课用
`resolver 127.0.0.11`、upstream `zone` 和 `resolve` 让当前开源 Nginx重新查询。环境不支持该语法
时，应在 API 重建后 reload Nginx，或使用该平台验证过的服务发现；不能记录静态容器 IP。

reload 会让新 worker 加载配置/证书，旧 worker 完成现有连接。每次 reload 前运行 `nginx -t`，
避免损坏当前服务。

### 4.7 HSTS 需要最后启用

只有公共/组织信任证书、全部相关 host、自动续期、HTTP 到 HTTPS 恢复和应急路径经过验证后，才
逐步启用短 `max-age`，观察后再增加。`includeSubDomains` 与 preload 是更强承诺，不在本地实验
直接复制。

## 5. 元素、属性、API 或配置清单

| 配置/API | 作用 | 本课用法 | 边界 |
| --- | --- | --- | --- |
| `!reset []` | 清除合并后的列表 | 移除 API ports | 依赖 Compose 版本 |
| `APP_ORIGIN` | API 精确允许的浏览器源 | `https://market.example.test` | 不是内部 API URL |
| bind mount `:ro` | 只读提供叶证书/私钥 | `./secrets/tls` | owner UID 必须与容器进程一致 |
| `user` | `${LOCAL_UID}:${LOCAL_GID}` | 对齐 bind mount owner | UID/GID 均必须非 0 |
| `tmpfs` options | cache 归 Web UID/GID | read-only rootfs 下仍可写临时文件 | 必须在容器内实测 |
| `127.0.0.1:443:8443` | 回环 443 映射非 root 容器高端口 | 本地隔离 | 不等于生产防火墙 |
| `depends_on: service_healthy` | 初始等待 API healthy | Web 启动条件 | 不保证运行期永远健康 |
| `openssl req` | 创建 CA/CSR | 本地实验 | 不替公共 CA |
| `subjectAltName` | 绑定 DNS 名 | `market.example.test` | CN 不能代替现代 SAN |
| `curl --cacert` | 显式信任本地 CA | TLS 验收 | 不安装系统/浏览器信任 |
| `curl --resolve` | 单次覆盖 DNS | 指向回环 | 不证明真实 DNS |
| `nginx -t` | 加载配置和证书 | reload 前执行 | 不发真实请求 |
| `nginx -s reload` | 平滑加载新配置/证书 | 测试通过后执行 | 不修复错误证书 |
| `docker compose config` | 展开合并结果 | 检查 ports/env/build | 输出可能含环境值，勿共享 secret |

## 6. 最小可运行案例

### 6.1 完整 `compose.https.yaml`

在个人 `market` 根目录创建：

```yaml
services:
  api:
    environment:
      NODE_ENV: production
      APP_ORIGIN: https://market.example.test
    ports: !reset []

  web:
    image: market-web:local
    user: "${LOCAL_UID}:${LOCAL_GID}"
    build:
      context: .
      dockerfile: deploy/web.Dockerfile
      args:
        WEB_APP: ${WEB_APP:-react-web}
    ports:
      - "127.0.0.1:80:8080"
      - "127.0.0.1:443:8443"
    volumes:
      - ./secrets/tls:/etc/nginx/tls:ro
    depends_on:
      api:
        condition: service_healthy
    read_only: true
    tmpfs:
      - "/tmp:mode=1777"
      - "/var/cache/nginx:uid=${LOCAL_UID},gid=${LOCAL_GID},mode=0750"
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    init: true
    stop_grace_period: 20s
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

`WEB_APP` 仍由 Dockerfile 枚举校验。`LOCAL_UID`/`LOCAL_GID` 必须由后文非 root preflight 导出，
不能写死 101，也不能设为 0。不要把 `APP_ORIGIN` 写成 `http://api:3000`；那是代理访问的内部
URL，不是浏览器 source origin。

### 6.2 不支持 `!reset` 时的完整独立文件

只有当合并检查不能确认 API ports 已清除时，创建 `compose.https.standalone.yaml`。它不依赖第
2 章覆盖语义：

```yaml
name: market-https

services:
  db:
    image: postgres:18.6-bookworm
    environment:
      POSTGRES_DB: market
      POSTGRES_USER: market_owner
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      PGDATA: /var/lib/postgresql/18/docker
    secrets:
      - db_password
    volumes:
      - pgdata:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U market_owner -d market"]
      interval: 5s
      timeout: 3s
      retries: 10
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  migrate:
    image: market-api:local
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    command: ["node", "migrate.mjs"]
    env_file:
      - ./secrets/api.env
    depends_on:
      db:
        condition: service_healthy
    restart: "no"

  api:
    image: market-api:local
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    environment:
      NODE_ENV: production
      PORT: 3000
      APP_ORIGIN: https://market.example.test
    env_file:
      - ./secrets/api.env
    depends_on:
      db:
        condition: service_healthy
      migrate:
        condition: service_completed_successfully
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "fetch('http://127.0.0.1:3000/api/v1/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    init: true
    stop_grace_period: 20s
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  web:
    image: market-web:local
    user: "${LOCAL_UID}:${LOCAL_GID}"
    build:
      context: .
      dockerfile: deploy/web.Dockerfile
      args:
        WEB_APP: ${WEB_APP:-react-web}
    ports:
      - "127.0.0.1:80:8080"
      - "127.0.0.1:443:8443"
    volumes:
      - ./secrets/tls:/etc/nginx/tls:ro
    depends_on:
      api:
        condition: service_healthy
    read_only: true
    tmpfs:
      - "/tmp:mode=1777"
      - "/var/cache/nginx:uid=${LOCAL_UID},gid=${LOCAL_GID},mode=0750"
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    init: true
    stop_grace_period: 20s
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  pgdata:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

独立文件没有 `api.ports` 或 `db.ports`。它仍使用本地 Compose file secret 和 env file，不能称为
加密的企业 secret management；生产还要拆分 migration DDL 与 runtime DML 身份。

### 6.3 生成测试 CA 与叶证书

以下命令只写个人项目的 Git ignored `secrets/tls` 与精确 `/tmp/market-local-ca`。先确认目标：

```bash
set -euo pipefail
test "$(pwd -P | xargs basename)" = market
LOCAL_UID="$(id -u)"
LOCAL_GID="$(id -g)"
test "$LOCAL_UID" -ne 0
test "$LOCAL_GID" -ne 0
export LOCAL_UID LOCAL_GID
umask 077
test ! -e /tmp/market-local-ca
mkdir -p /tmp/market-local-ca secrets/tls
test -O secrets/tls
chmod 700 /tmp/market-local-ca secrets/tls
cleanup_local_ca() {
  rm -rf /tmp/market-local-ca
}
trap cleanup_local_ca EXIT

openssl req -x509 -newkey rsa:3072 -sha256 -nodes -days 7 \
  -keyout /tmp/market-local-ca/ca-key.pem \
  -out /tmp/market-local-ca/ca.pem \
  -subj "/CN=Market Local Test CA" \
  -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
  -addext "keyUsage=critical,keyCertSign,cRLSign"

openssl req -new -newkey rsa:2048 -sha256 -nodes \
  -keyout secrets/tls/privkey.pem \
  -out /tmp/market-local-ca/server.csr \
  -subj "/CN=market.example.test"

printf '%s\n' \
  'basicConstraints=critical,CA:FALSE' \
  'keyUsage=critical,digitalSignature,keyEncipherment' \
  'extendedKeyUsage=serverAuth' \
  'subjectAltName=DNS:market.example.test' \
  > /tmp/market-local-ca/server.ext

openssl x509 -req \
  -in /tmp/market-local-ca/server.csr \
  -CA /tmp/market-local-ca/ca.pem \
  -CAkey /tmp/market-local-ca/ca-key.pem \
  -CAcreateserial \
  -out secrets/tls/fullchain.pem \
  -days 2 \
  -sha256 \
  -extfile /tmp/market-local-ca/server.ext

cp /tmp/market-local-ca/ca.pem secrets/tls/local-ca.pem
test -O secrets/tls/privkey.pem
chmod 600 secrets/tls/privkey.pem
chmod 644 secrets/tls/fullchain.pem secrets/tls/local-ca.pem
file_mode() {
  if [[ "$(uname -s)" == Darwin ]]; then
    stat -f '%Lp' "$1"
  else
    stat -c '%a' "$1"
  fi
}
test "$(file_mode secrets/tls)" = 700
test "$(file_mode secrets/tls/privkey.pem)" = 600
openssl verify -CAfile secrets/tls/local-ca.pem secrets/tls/fullchain.pem
openssl x509 -in secrets/tls/fullchain.pem -noout \
  -subject -issuer -dates
openssl x509 -in secrets/tls/fullchain.pem -noout -text \
  | grep -A 1 'Subject Alternative Name' \
  | grep -F 'DNS:market.example.test'
```

**[本地预期]** UID/GID 均非 0，证书目录 owner 是当前用户且 mode 为 `700`，叶私钥 owner 是当前
用户且 mode 为 `600`；没有通过扩大 group/world read 让 Nginx 读取 key。`openssl verify` 输出
`OK`，SAN 精确为 `DNS:market.example.test`，CA 私钥在签发后删除。`secrets/` 必须被 Git 与
Docker build context 排除。命令中的本地 CA 是教学信任根，不用于其他项目、真实用户或长期生产。

## 7. 邻里集市集成案例

### 7.1 合并、检查、启动

先验证覆盖结果，不分享展开后的 secret：

```bash
set -euo pipefail
LOCAL_UID="$(id -u)"
LOCAL_GID="$(id -g)"
test "$LOCAL_UID" -ne 0
test "$LOCAL_GID" -ne 0
test -O secrets/tls
test -O secrets/tls/privkey.pem
file_mode() {
  if [[ "$(uname -s)" == Darwin ]]; then
    stat -f '%Lp' "$1"
  else
    stat -c '%a' "$1"
  fi
}
test "$(file_mode secrets/tls)" = 700
test "$(file_mode secrets/tls/privkey.pem)" = 600
export LOCAL_UID LOCAL_GID

WEB_APP=react-web \
  docker compose -f compose.yaml -f compose.https.yaml config --quiet

WEB_APP=react-web \
  docker compose -f compose.yaml -f compose.https.yaml config \
  | sed -n '/api:/,/^[^ ]/p'
```

人工确认展开结果中 `api` 没有 `ports`，`APP_ORIGIN` 是 HTTPS。第二条可能展开 env 值，只能在
本人终端观察，不贴到 Issue/报告。随后：

```bash
WEB_APP=react-web \
  docker compose -p market-https \
    -f compose.yaml -f compose.https.yaml up -d --build

docker compose -p market-https \
  -f compose.yaml -f compose.https.yaml ps

docker compose -p market-https \
  -f compose.yaml -f compose.https.yaml exec -T web nginx -t

web_uid="$(
  docker compose -p market-https \
    -f compose.yaml -f compose.https.yaml exec -T web id -u \
    | tr -d '\r'
)"
web_gid="$(
  docker compose -p market-https \
    -f compose.yaml -f compose.https.yaml exec -T web id -g \
    | tr -d '\r'
)"
test "$web_uid" = "$LOCAL_UID"
test "$web_gid" = "$LOCAL_GID"
docker compose -p market-https \
  -f compose.yaml -f compose.https.yaml exec -T web sh -c \
  'test -r /etc/nginx/tls/privkey.pem
   touch /tmp/.market-write-test /var/cache/nginx/.market-write-test
   rm /tmp/.market-write-test /var/cache/nginx/.market-write-test'
```

预期 `db`、`api`、`web` healthy/running，`migrate` 退出 0；只有 web 显示宿主 80/443，API 与
db 不显示 published port。展开配置只能证明变量已插值；上述 `id`、私钥读取和两个 `touch`
才证明目标 Docker 实现中的 bind mount/tmpfs 权限可执行。Docker Desktop 与原生 Linux 的挂载
实现不同，未运行这些命令时只能记为静态配置证据。

若目标 Compose 不支持 `!reset`，停止上面的 overlay 项目后，在同一非 root preflight shell 中对
standalone 执行等价检查：

```bash
standalone=(
  docker compose
  -p market-https
  -f compose.https.standalone.yaml
)
"${standalone[@]}" config --quiet
"${standalone[@]}" up -d --build
test "$("${standalone[@]}" exec -T web id -u | tr -d '\r')" = "$LOCAL_UID"
test "$("${standalone[@]}" exec -T web id -g | tr -d '\r')" = "$LOCAL_GID"
"${standalone[@]}" exec -T web sh -c \
  'test -r /etc/nginx/tls/privkey.pem
   touch /tmp/.market-write-test /var/cache/nginx/.market-write-test
   rm /tmp/.market-write-test /var/cache/nginx/.market-write-test'
"${standalone[@]}" exec -T web nginx -t
```

standalone 与 overlay 是互斥路径，不要同时占用回环 80/443。两条路径必须通过同一身份、私钥和
tmpfs 实测，不能只验证其中一条后推断另一条可执行。

### 7.2 HTTPS 路径矩阵

```bash
ca=secrets/tls/local-ca.pem
https=(curl --silent --show-error --cacert "$ca" \
  --resolve market.example.test:443:127.0.0.1)

curl --silent --show-error --head \
  --resolve market.example.test:80:127.0.0.1 \
  http://market.example.test/listings/bike-1

"${https[@]}" --include \
  https://market.example.test/api/v1/health/ready

"${https[@]}" --head \
  https://market.example.test/listings/bike-1

"${https[@]}" --head \
  https://market.example.test/assets/not-found.js

"${https[@]}" --include \
  https://market.example.test/api/v1/does-not-exist
```

预期：

| 请求 | 状态/证据 |
| --- | --- |
| HTTP 深链 | 308，Location 为同 host HTTPS 深链 |
| HTTPS ready | 200，API body，不是 HTML |
| HTTPS SPA 深链 | 200，`Content-Type: text/html` |
| 缺失 asset | 404，不是入口 HTML |
| 缺失 API | API 404 与 JSON 错误，不是入口 HTML |

`--resolve` 只替当前 curl 做 DNS；`--cacert` 只显式信任本地 CA。浏览器验收要通过受控方式信任
本地 CA，并在结束后移除；不要在共享系统根证书库留下教学 CA。

### 7.3 Cookie、CSRF 与对象授权

用虚构测试账号登录，在 DevTools 检查：

- `Set-Cookie` 为 Secure、HttpOnly、host-only、Path=/、SameSite 明确；
- HTTPS 写请求的 Origin 是 `https://market.example.test`；
- CSRF token 与当前 session 匹配，缺失/跨 session 得到 403；
- 用户乙编辑用户甲商品仍得到后端对象授权 403；
- owner 使用旧 `version` 得到 409，输入未被前端错误清空；
- 商品 `priceCents` 是整数，时间是 UTC ISO 8601。

证书、Cookie、CSRF、对象授权必须分别留证，不能用一次“登录成功”代替。

### 7.4 顺序切换 Vue

保留同一 `market-https` 项目的数据库、API 和外部 origin，只用新构建替换 Web：

```bash
WEB_APP=vue-web \
  docker compose -p market-https \
    -f compose.yaml -f compose.https.yaml build web

WEB_APP=vue-web \
  docker compose -p market-https \
    -f compose.yaml -f compose.https.yaml up -d --no-deps web
```

命令没有重建 API、数据库或删除 volume；两个前端先后面对同一 origin 和同一持久数据。对 Vue
重跑路径矩阵、登录、CSRF、owner 403、version 409 和退出。

### 7.5 证书替换

拿到新证书后先在隔离路径验证 SAN、期限和链，再原子替换挂载文件。容器内：

```bash
docker compose -p market-https \
  -f compose.yaml -f compose.https.yaml exec -T web nginx -t
docker compose -p market-https \
  -f compose.yaml -f compose.https.yaml exec -T web nginx -s reload
```

最后重新 TLS 请求并检查实际 served certificate。没有 ACME client、定时续期、到期告警和失败
演练时，不能写“证书自动续期已完成”。

## 8. 常见错误与排查路径

### 状态与层次速查

| 现象 | 先看证据 | 常见原因 | 下一步 |
| --- | --- | --- | --- |
| 308 循环 | 每跳 Location、外层 proto | 多层代理不可信/错误 proto | 修复 trusted proxy 链 |
| SPA 深链 404 | Nginx location、站点文件 | `try_files` 未回退 | 只修页面 location |
| asset 404 | dist 清单、请求 hash | HTML 与 asset 版本不配套 | 资源先行、入口后切 |
| API 404 | API 日志实际 path | `proxy_pass` URI 改写 | 保留 `/api/v1` |
| CSRF 403 | API error code/requestId | Origin/token/session 不匹配 | 按三项分别检查 |
| Cookie 缺失 | DevTools blocked reason | Secure/host/path/SameSite/过期 | 修配置，不删除 Secure |
| 502 | Nginx error、API ready、DNS | API 停止/监听/DNS/超时 | 恢复上游再复验 |
| TLS trust fail | curl/OpenSSL verify/SAN | CA 不信、hostname 错、过期 | 修链和名称，不用 `-k` |

### 明确错误：API 重建后 Nginx 仍连接旧 IP

| 五段 | 记录 |
| --- | --- |
| 现象 | API 容器已 healthy，但外部 ready 持续 502 |
| 证据 | Nginx error log 连接旧容器 IP；`getent hosts api` 已返回新 IP；API 自身 health 200 |
| 原因 | Nginx upstream 只在旧 worker 启动时解析服务名，容器重建后缓存旧地址 |
| 修复 | 使用受支持的 `resolver + zone + resolve`；否则在 API 切换后 `nginx -t` 并 reload |
| 复验 | 外部 ready 200；再次重建 API 后仍能在 DNS 有效期/受控 reload 后恢复 |

### 308 不是“HTTPS 已成功”

HTTP 308 只证明 80 端口返回重定向。继续验证 443 handshake、SAN、CA chain 和 HTTPS body；若只
看 308，443 未监听也可能被误报成功。

### API 404 被当成前端路由

检查 body 是否 `<!doctype html>`。若是，API location 没有优先命中或被错误 fallback；恢复路径
分层，不在前端 JSON parser 捕获后伪造空数据。

### 403 被错误归因于 Nginx

Nginx 本课不会验证业务 CSRF/owner。用 response requestId 找 API 日志，区分 `CSRF`、
`FORBIDDEN` 和 `VERSION_CONFLICT`。不要关闭 CSRF 或对象授权让测试变绿。

### 改密码文件后数据库仍用旧密码

PostgreSQL 镜像初始化变量只对空数据目录生效。使用受控角色轮换，让新旧凭据短暂兼容、确认新
连接、撤销旧凭据；不要删除 volume“修复”密码。

## 9. 课后题

**问题 1：为什么 API 和数据库不需要宿主 `ports`？**

参考答案：Web/API/DB 通过 Compose 网络和服务名通信；宿主发布会扩大攻击面，不是容器互联前提。

**问题 2：`--resolve` 加 `--cacert` 证明了什么？**

参考答案：指定 IP 上的服务向该 hostname 提供了可由显式 CA 验证的证书；不证明公共 DNS或系统
浏览器信任。

**问题 3：为什么不能把 CA 私钥挂进 Nginx？**

参考答案：Nginx只需叶私钥和证书链；CA 私钥可签发其他证书，泄漏影响远大，应离线/受控保存。

**问题 4：为什么回滚 Web 镜像不回滚证书？**

参考答案：应用制品和证书有独立生命周期；旧镜像仍应读取当前有效挂载证书，不应把私钥烘焙进
每个应用版本。

**问题 5：本地测试通过后可以立刻 HSTS preload 吗？**

参考答案：不可以。preload 是长期公共承诺，需要真实域名、全子域、证书续期和恢复能力审查。

## 10. 实践练习

### 基础：私有端口与证书

展开 Compose，记录 services/ports，不记录 env 值；用 OpenSSL 检查 SAN、issuer、日期和链。
完成标准：宿主只发布回环 80/443，API/DB 无 ports；Web 实际 UID/GID 等于当前非 root 操作者，
两个 tmpfs 可写，证书目录 `700`、私钥 `600`，Git status 不含 secret。

### 进阶：React/Vue 等价验收

顺序启动两个 Web 构建，分别执行路径矩阵、登录 Cookie、CSRF 403、owner 403、version 409 和退出。
完成标准：每个前端有独立时间戳、命令、状态与失败截图/文本，API 契约一致。

### 故障注入：停止与恢复 API

只停止精确 Compose 项目的 API，访问 ready 记录 502/有界超时；恢复/重建 API，观察 DNS 与 reload
行为。完成标准：不停止数据库、不删除 volume，恢复后外部 ready 200，故障记录有完整五段。

## 11. 阶段验收

- [ ] `compose.https.yaml` 在目标 Compose 版本展开成功，API ports 实际为空。
- [ ] 不支持 `!reset` 时使用完整 standalone 文件，没有假设空列表会覆盖。
- [ ] Web 只绑定本机回环 80/443，API/DB 不发布宿主端口。
- [ ] overlay 与 standalone 的 Web 都显式使用非 0 `LOCAL_UID:LOCAL_GID`，没有回退镜像 UID 101。
- [ ] 容器内 UID/GID 与宿主一致，私钥可读，`/tmp` 和 `/var/cache/nginx` 实际可写。
- [ ] 本地 CA、叶 SAN、期限与链验证通过，CA 私钥签发后删除。
- [ ] 证书目录保持 `700`、叶私钥保持 `600`，未添加 group/world read。
- [ ] `nginx -t` 在 reload 前成功；没有用 `curl -k` 作为 TLS 通过证据。
- [ ] HTTP 308、HTTPS hostname、ready、SPA 深链、asset 404、API 404 均有实际响应。
- [ ] Cookie、Origin/CSRF、对象授权和 409 分开验收。
- [ ] API 停止/恢复、stale DNS 与代理 reload 有受控证据。
- [ ] React 与 Vue 顺序执行同一清单。
- [ ] 没有执行 `down -v`、公共 DNS、ACME、registry 或远端发布。
- [ ] 公共 CA、自动续期、HSTS、真实 DNS 保持“外部未验证”，除非附授权运行记录。

完成后只停止精确项目：

```bash
docker compose -p market-https \
  -f compose.yaml -f compose.https.yaml down
```

不加 `-v`，不运行全局 prune。教学叶私钥和证书只在证据保留期内存在于 Git ignored 目录，按个人
练习清理策略删除。

## 12. 常见问题

**为什么使用 `127.0.0.1:443:8443`，而不是 `443:443`？**

回环限制同机访问，减少误暴露到局域网；容器高端口让 Nginx 不需要 root 或
`CAP_NET_BIND_SERVICE`。真实服务器的公网监听要配合防火墙、负载均衡和授权设计。

**为什么不把私钥改成 644 来适配镜像 UID 101？**

这会让私钥对所有本地用户可读。应保持目录 `700`、key `600`，让 Compose Web 进程使用创建文件的
非 root UID/GID，并为被覆盖身份显式配置可写 tmpfs。

**Compose health 通过，为什么外部仍 502？**

可能是 Nginx 缓存旧 IP、网络不一致、API 只监听 loopback 或 proxy timeout。分别查容器内 health、
服务名解析、监听地址和 Nginx error log。

**可以把 `local-ca.pem` 导入系统后一直保留吗？**

不建议。教学 CA 扩大本机信任面；应只在受控浏览器 profile/测试客户端使用，并在实验后移除。

**证书 reload 会中断所有连接吗？**

Nginx 平滑 reload 通常让旧 worker 完成现有连接、新 worker 使用新配置；仍需观察长连接、错误
日志和实际 served certificate，不能只看命令退出 0。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [Compose merge 规则](https://docs.docker.com/reference/compose-file/merge/)：核对 `!reset` 与
  `!override`。
- [Compose networking](https://docs.docker.com/compose/how-tos/networking/)：理解服务名与容器
  IP 变化。
- [OpenSSL `x509`](https://docs.openssl.org/master/man1/openssl-x509/)：检查证书字段。
- [Nginx HTTPS](https://nginx.org/en/docs/http/configuring_https_servers.html)：证书加载与 TLS。
- [Let's Encrypt challenge types](https://letsencrypt.org/docs/challenge-types/)：区分 HTTP-01 与
  DNS-01。
- [MDN HSTS](https://developer.mozilla.org/docs/Web/HTTP/Headers/Strict-Transport-Security)：理解
  长期客户端承诺。
- [curl certificate verification](https://curl.se/docs/sslcerts.html)：显式 CA 与 hostname 校验。

## 我现在能做到什么

我能把 Web、API 和 PostgreSQL 放入只暴露一个 HTTPS 入口的 Compose 栈，用显式信任验证本地
证书，并通过分层证据区分重定向、路由、CSRF、Cookie、上游和 DNS 故障。我也能诚实标记公共 PKI、
ACME、HSTS 和真实 DNS 尚未由本地实验证明。

## 单元导航

- 章节目录：[03 Nginx、HTTPS 与同源部署](../README.md#03-nginxhttps-与边缘部署)
- 上一课：[Nginx 反向代理、HTTPS 与同源安全](02-nginx-proxy-https-same-origin.md)
- 下一章：[04 CI、发布与回滚](../04-ci-release-rollback/01-local-quality-gates-clean-install.md)
