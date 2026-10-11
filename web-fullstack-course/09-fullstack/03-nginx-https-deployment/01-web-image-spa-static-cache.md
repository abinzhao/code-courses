# Web 镜像、SPA 静态路由与缓存

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 本课产出 | 完整 `deploy/web.Dockerfile`，以及可判定的页面、资源和 API 路径分层 |
| 建议时间 | 120 分钟 |
| 构建输入 | 工作区根目录、同一 `pnpm-lock.yaml`、`react-web` 或 `vue-web` |
| 运行输出 | 只含选定前端 `dist` 与 Nginx 运行时的 Web 镜像 |
| 可见成功 | 深链接返回 HTML，缺失 hash 资源返回 404，API 路径不返回 SPA HTML |
| 证据边界 | 本课给出静态与预期命令；没有 Docker/Nginx 实际输出时不得称镜像运行通过 |

## 1. 任务背景

邻里集市首页可以打开，但用户从前端路由进入 `/listings/bike-1` 后刷新，服务器会按文件路径查找
`/usr/share/nginx/html/listings/bike-1`。磁盘上没有这个文件，于是返回 404。SPA 需要在“页面
导航路径不存在”时回退到 `index.html`，再由 React Router 或 Vue Router解释 URL。

这个回退不能覆盖所有请求。若 `/assets/app-deadbeef.js` 不存在却返回 HTML，浏览器会报告脚本
MIME 错误；若 `/api/v1/listings/missing` 返回 HTML 和 200，客户端会把真实 API 故障误判为 JSON
解析错误。本课先建立三类互斥路径：

```text
/api/...     -> 只交给 API，状态与 body 不被 SPA 改写
/assets/...  -> 只找真实文件，缺失即 404
其他页面路径 -> 找到文件则返回，否则回退 index.html
```

## 2. 学习目标

完成本课后，你能够：

1. 从工作区根上下文用同一 Dockerfile 构建 React 或 Vue；
2. 在构建开始前拒绝非法 `WEB_APP`，不允许任意路径注入；
3. 使用冻结锁文件安装，并只把 `dist` 复制进运行镜像；
4. 解释为什么所有 `VITE_*` 值都是浏览器可见公开配置；
5. 区分 SPA 页面 fallback、静态资源 404 与 API 转发；
6. 为带内容 hash 的资源和可变 `index.html` 选择不同缓存策略；
7. 用状态码、Content-Type、Cache-Control 和响应前缀定位错误；
8. 对 React 与 Vue 执行同等构建和路径验收。

## 3. 预备知识

先完成[第 02 章：Docker Compose](../02-docker-compose/01-multi-stage-image-build-context.md)，并确认个人 `market` 工作区至少有：

```text
market/
  apps/
    react-web/package.json
    vue-web/package.json
  packages/contracts/package.json
  deploy/nginx.conf
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
```

两个应用包名约定为 `@market/react-web`、`@market/vue-web`，构建结果约定为各自 `dist/`。若真实
项目名称不同，应先读取 manifest 后一致修改示例，不能通过复制一个假包名制造“构建成功”。

证据标签：

- **[静态]**：只检查文本、Dockerfile 指令和构建上下文边界；
- **[本地运行]**：需要 Docker daemon，结果必须来自本轮命令；
- **[外部]**：registry digest、漏洞扫描和生产运行，需要授权系统的真实记录。

## 4. 核心理论

### 4.1 构建阶段与运行阶段的责任不同

构建阶段需要 Node.js、pnpm、完整 workspace manifest 和源码。运行阶段只需要 Nginx、`dist` 与
代理配置。多阶段构建不会自动保证镜像安全，但能避免把源码、开发依赖、pnpm store 和本机配置
一起交付。

```text
源码 + 锁文件 + Node/pnpm
  -> Vite production build
  -> dist/
  -> Nginx runtime image
```

镜像基底标签仍可移动。课程 Dockerfile 用可读标签说明主线；授权发布应在验证、扫描后记录真实
镜像 digest，第 4 章再用 digest 交付。

### 4.2 为什么构建上下文必须是根目录

pnpm workspace 的锁文件描述整个依赖图。若只把 `apps/react-web` 作为上下文，构建可能看不到
根锁文件、共享 contracts 或其他 workspace manifest。临时删除 Vue manifest 也可能令 frozen
lock 与当前 workspace 不一致。入门实现选择根上下文并依赖严格 `.dockerignore` 排除机密。

优化上下文可以做，但要从真实依赖图裁剪并重新验证，不能用“复制更少”换来不可复现安装。

### 4.3 `ARG WEB_APP` 是枚举，不是任意路径

`ARG` 是构建输入。先用 `case` 只接受 `react-web|vue-web`，再将它用于 filter 和目录。若直接
拼接未验证字符串，调用者可能选择不存在的包或改变复制路径。`ARG` 也不是秘密：它可能进入构建
历史、日志或缓存键。

### 4.4 `VITE_*` 是公开配置

Vite 会把允许暴露的构建变量替换进浏览器 JavaScript。用户可下载并检查这些字节，因此 API
secret、数据库密码、Cookie 签名密钥、registry token 都不能放进 `VITE_*`。同源部署使用相对
`/api/v1`，通常不需要把内部 `http://api:3000` 写入前端。

### 4.5 路径分层先于 fallback

Nginx location 先选中 API 或 assets，再执行各自规则；只有页面路径进入 SPA fallback。正确顺序
不是“所有 404 都改成 index.html”，而是“只对前端路由候选回退”。

### 4.6 缓存策略取决于 URL 是否随内容变化

Vite 的 `assets/app-<hash>.js` 在内容变化时 URL 变化，可以长期缓存：

```http
Cache-Control: public, max-age=31536000, immutable
```

`index.html` 的 URL 不变，但引用的新 hash 会变化，适合每次重验证：

```http
Cache-Control: no-cache
```

`no-cache` 允许存储但要求使用前重验证；它不等于 `no-store`。若把入口设为一年 immutable，用户
可能长期拿旧入口；若把所有 hash 资源禁用缓存，则浪费带 hash URL 的价值。

## 5. 元素、属性、API 或配置清单

| 名称 | 作用 | 最小用法 | 边界 |
| --- | --- | --- | --- |
| `FROM ... AS build` | 建立构建阶段 | Node 24 镜像 | 标签不是不可变 digest |
| `ARG WEB_APP` | 选择前端 | `react-web` 或 `vue-web` | 不是 secret |
| `case` | 枚举校验 | 非法值退出 64 | 只验证允许值，不验证源码正确 |
| `COPY . .` | 提供完整 workspace | 根上下文 | 必须配严格 `.dockerignore` |
| `--frozen-lockfile` | 拒绝 manifest/lock 漂移 | 安装失败即阻断 | 不证明依赖可信 |
| `pnpm --filter` | 只构建目标包 | `@market/${WEB_APP}` | 包名必须与 manifest 一致 |
| `COPY --from` | 复制构建产物 | 只复制 `/site` | 不复制源码和 store |
| `try_files $uri =404` | 缺失 asset 明确 404 | `/assets/` | 不用于 SPA 页面 |
| `try_files ... /index.html` | 页面 fallback | `location /` | 不能覆盖 `/api/` |
| `immutable` | 内容 URL 永不改变时长期缓存 | hash 资源 | 不用于 `index.html` |
| `no-cache` | 使用前重验证 | `index.html` | 不等于禁止存储 |
| `Content-Type` | 告诉浏览器资源类型 | JS/CSS/HTML | 依赖 `mime.types` |

## 6. 最小可运行案例

### 6.1 先在宿主验证真实构建

在个人 `market` 根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm --filter @market/react-web build
find apps/react-web/dist -type f -print | sort
pnpm --filter @market/vue-web build
find apps/vue-web/dist -type f -print | sort
```

**[本地运行预期]** 两个 build 都退出 `0`；各自有 `index.html`，并至少有一项真实 JS 资源。若
目录为空，先查 Vite `outDir` 与包脚本，不能让 Dockerfile 猜另一个路径。停止方式：命令完成即
退出，没有常驻进程。

### 6.2 完整 `deploy/web.Dockerfile`

在个人项目创建 `deploy/web.Dockerfile`：

```dockerfile
# syntax=docker/dockerfile:1
FROM node:24.21.0-bookworm-slim AS build

ARG WEB_APP=react-web
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /workspace

RUN corepack enable \
    && corepack prepare pnpm@12.11.2 --activate \
    && pnpm --version
COPY . .
RUN case "$WEB_APP" in \
      react-web|vue-web) ;; \
      *) printf '%s\n' "unsupported WEB_APP: $WEB_APP" >&2; exit 64 ;; \
    esac
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@market/${WEB_APP}" build
RUN mkdir /site \
    && cp -R "apps/${WEB_APP}/dist/." /site/ \
    && test -f /site/index.html \
    && find /site -type f -print

FROM nginxinc/nginx-unprivileged:1.30.5-trixie AS runtime

COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /site/ /usr/share/nginx/html/

EXPOSE 8080 8443
STOPSIGNAL SIGQUIT
CMD ["nginx", "-g", "daemon off;"]
```

unprivileged 变体以非 root 用户运行，下一课的配置因此监听 8080/8443；Compose 再把回环
80/443 映射到这两个高端口。Dockerfile 不创建证书，也不把证书 COPY 进镜像；第 3 课只读挂载。复用第 2 章根
`.dockerignore`，至少排除：

```dockerignore
.git
**/node_modules
**/dist
**/.env
**/.env.*
**/*.log
coverage
secrets
backups
evidence
```

`.dockerignore` 只阻止文件进入构建上下文，不替代 `.gitignore`、权限管理或 secret scanner。

### 6.3 构建命令与失败证据

```bash
docker build \
  -f deploy/web.Dockerfile \
  --build-arg WEB_APP=react-web \
  -t market-web:react-local .

docker build \
  -f deploy/web.Dockerfile \
  --build-arg WEB_APP=vue-web \
  -t market-web:vue-local .
```

**[本地运行预期]** 两个镜像都完成冻结安装与当前源码构建。检查镜像只含站点输出：

```bash
docker run --rm --entrypoint sh market-web:react-local \
  -c 'test -f /usr/share/nginx/html/index.html &&
      find /usr/share/nginx/html -type f -print | sort'
```

明确失败实验：

```bash
docker build \
  -f deploy/web.Dockerfile \
  --build-arg WEB_APP=../../secrets \
  -t market-web:must-not-exist .
```

**预期失败证据**：构建在 `case` 步骤退出 `64`，日志含 `unsupported WEB_APP`，且不会进入目标包
构建。若 Docker 不可用，应记录 `docker: command not found` 或 daemon 连接错误为工具阻塞，
不能改写成 PASS。

## 7. 邻里集市集成案例

完整 `nginx.conf` 由下一课负责，本课先明确它必须实现的静态路由契约：

```nginx
location ^~ /api/ {
  proxy_pass http://market_api;
}

location ^~ /assets/ {
  try_files $uri =404;
  add_header Cache-Control "public, max-age=31536000, immutable" always;
}

location = /index.html {
  try_files /index.html =404;
  add_header Cache-Control "no-cache" always;
}

location / {
  try_files $uri $uri/ /index.html;
}
```

这段是本课的责任说明，不是第二份完整 Nginx 文件。下一课会补 TLS、headers、超时、限流、日志
和 upstream DNS。

运行容器后，用实际端口依次观察：

```bash
curl -sS -D /tmp/market-home.headers \
  -o /tmp/market-home.body http://127.0.0.1:8080/
curl -sS -D /tmp/market-deep.headers \
  -o /tmp/market-deep.body http://127.0.0.1:8080/listings/bike-1
curl -sS -D /tmp/market-asset.headers \
  -o /tmp/market-asset.body http://127.0.0.1:8080/assets/not-found.js
curl -sS -D /tmp/market-api.headers \
  -o /tmp/market-api.body http://127.0.0.1:8080/api/v1/not-found
```

**[本地运行预期]**：

| 请求 | 状态 | Content-Type / body | 判定 |
| --- | ---: | --- | --- |
| `/` | 200 | `text/html` | 入口存在 |
| `/listings/bike-1` | 200 | `text/html` | 仅页面深链 fallback |
| `/assets/not-found.js` | 404 | 不得是入口 HTML | 缺失资源可诊断 |
| `/api/v1/not-found` | API 决定的 404 | 结构化 JSON | 未被 SPA 吞掉 |

登录、预约和编辑仍遵循同一 API 契约：价格为整数分，时间为 UTC 字符串；前端构建选择不改变 API
数据。React 和 Vue 各执行一次同样的四请求，再在浏览器走登录、详情刷新、`409` 编辑冲突和退出。

缓存观察：

```bash
asset_file="$(
  find apps/react-web/dist/assets -type f -name '*.js' -print \
    | LC_ALL=C sort \
    | head -n 1
)"
test -n "$asset_file"
asset_url="/assets/$(basename "$asset_file")"
curl -sSI http://127.0.0.1:8080/index.html
curl -sSI "http://127.0.0.1:8080$asset_url"
```

命令从当前 React `dist` 读取真实 JS 文件名。预期入口 `no-cache`，hash 资源包含一年
`max-age` 和 `immutable`；Vue 镜像验收时改从 Vue `dist` 读取。

## 8. 常见错误与排查路径

### 明确错误：把所有未知路径都返回 `index.html`

错误配置：

```nginx
error_page 404 /index.html;
```

它会把缺失 JS、图片甚至本应由 API 返回的 404 全部伪装成 HTML。

| 五段 | 记录 |
| --- | --- |
| 现象 | 页面白屏，控制台出现 `Expected a JavaScript module script but the server responded with text/html` |
| 证据 | Network 中 `/assets/not-found.js` 状态可能为 200/404，但 `Content-Type: text/html` 且 body 以 `<!doctype html>` 开头 |
| 原因 | 全局 `error_page` 或过宽 `try_files` 把资源错误送进 SPA fallback |
| 修复 | 在 `/assets/` 使用 `try_files $uri =404`，在 `/api/` 单独代理，只让页面 `location /` 回退入口 |
| 复验 | 深链接仍为 200 HTML；缺失 JS 为 404 且不含入口；API 404 仍为 JSON |

### 冻结安装失败

证据是 manifest 与 lockfile 不匹配，而不是“Docker 缓存坏了”。在个人工作区用固定 pnpm 更新并
审查 lockfile，再重新运行 frozen 安装；不要删除 `--frozen-lockfile`。

### React 镜像显示 Vue 页面

检查 `--build-arg WEB_APP`、构建日志中的 filter、镜像 tag 和 `/site/index.html`。不要只看
`market-web:local` 这种会移动的本地标签。

### `VITE_API_SECRET` 在浏览器中可见

这不是 Vite 泄漏，而是设计错误。撤销真实凭据，删除前端变量，把秘密移到服务端运行配置，再重建
并扫描旧制品与缓存。重新构建不能撤销已经暴露的 secret。

### hash 资源仍频繁 304

先确认文件名真的随内容变化、location 命中 `/assets/`、响应头未被上游/CDN覆盖。`immutable`
只影响客户端缓存策略，不修复未 hash URL。

## 9. 课后题

**问题 1：为什么 `VITE_DATABASE_PASSWORD` 即使来自 CI secret store 也不安全？**

参考答案：构建替换后值进入可下载的浏览器资源；secret store 只保护注入前，不保护公开制品。

**问题 2：为什么不能让缺失 asset 回退 `index.html`？**

参考答案：asset 请求期待 JS/CSS/图片，HTML 会造成 MIME 或解析错误并隐藏真实 404。

**问题 3：`no-cache` 和 `no-store` 是否相同？**

参考答案：不同。`no-cache` 可存储但使用前重验证；`no-store` 要求缓存不存储该响应。

**问题 4：同一个 Dockerfile 构建双前端，是否证明两者业务等价？**

参考答案：不证明。它只统一构建和运行容器；登录、错误状态、授权、冲突和浏览器路径仍需分别测试。

## 10. 实践练习

### 基础：双构建选择

在个人项目分别构建 `react-web`、`vue-web`，记录命令、退出码、镜像 ID 和 `dist` 文件清单。
完成标准：两次都来自同一锁文件；非法 `WEB_APP` 非零；记录没有 secret、Cookie 或内部连接串。

### 进阶：缓存契约

从两个 `dist` 各选入口、hash JS、hash CSS 和一个未 hash 公共文件，设计 Cache-Control。运行
`curl -I` 记录实际头。完成标准：入口可重验证，内容 hash 资源 immutable；未 hash 文件不冒充
不可变。

### 故障注入：资源被 HTML 吞掉

在隔离配置中临时加入全局 fallback，请求缺失 JS 并保存 headers/body；恢复正确 location 后重试。
完成标准：先稳定复现 HTML/MIME 证据，修复后 asset 404、深链接 200、API JSON 三者同时成立。

## 11. 阶段验收

- [ ] `WEB_APP` 只接受 `react-web|vue-web`，非法值在构建早期非零。
- [ ] 使用根 workspace 和 `pnpm install --frozen-lockfile`。
- [ ] `.dockerignore` 排除 Git、依赖、dist、env、日志、secret、备份和证据目录。
- [ ] 运行镜像只复制选定 `dist` 与 Nginx 配置，不包含私钥。
- [ ] `VITE_*` 只放公开配置，API 使用相对 `/api/v1`。
- [ ] 页面、asset 和 API path 互斥，缺失 asset/API 不返回入口 HTML。
- [ ] `index.html` 重验证，真实 hash 资源长期 immutable。
- [ ] React 与 Vue 分别构建和执行相同路径检查。
- [ ] 每项结果标为静态、本地运行或外部；未运行的 Docker/Nginx 不写通过。

建议证据命令：

```bash
git status --short
docker buildx build --check -f deploy/web.Dockerfile .
docker build -f deploy/web.Dockerfile --build-arg WEB_APP=react-web -t market-web:react-local .
docker build -f deploy/web.Dockerfile --build-arg WEB_APP=vue-web -t market-web:vue-local .
```

`buildx --check` 是否可用取决于本机 BuildKit 版本；parser 成功不证明镜像运行。停止本课容器时只
删除明确命名的练习容器，不执行会影响其他项目的全局清理。

## 12. 常见问题

**能否在一个 Nginx 镜像里同时放 React 和 Vue？**

可以设计不同前缀，但这会改变路由、Cookie、CSP和验收范围。本章采用一次只交付一个前端，让两者
在同一外部契约下顺序验收。

**为什么 Dockerfile 仍 `COPY . .`？**

它优先保证 workspace lock 与 manifest 完整；机密由 `.dockerignore` 排除。后续可基于依赖图
裁剪，但每次都要复验冻结安装和两个构建。

**镜像有 `EXPOSE 8443` 就能访问 HTTPS 吗？**

不能。`EXPOSE` 是元数据；还需要 Nginx 监听、证书挂载和 Compose/运行器发布端口。

**可以用 `curl -k` 快速验收吗？**

它可用于区分“服务未监听”和“证书不受信”，但不能作为 TLS 成功证据。第 3 课使用显式 CA 信任。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [Docker 多阶段构建](https://docs.docker.com/build/building/multi-stage/)：理解构建与运行文件边界。
- [Docker build context](https://docs.docker.com/build/concepts/context/)：检查上下文和
  `.dockerignore`。
- [Vite 环境变量](https://vite.dev/guide/env-and-mode.html)：确认 `VITE_*` 的公开性质。
- [Vite 静态部署](https://vite.dev/guide/static-deploy.html)：核对 `dist` 与 base 路径。
- [Nginx `try_files`](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)：理解
  文件检查和内部重定向。
- [MDN HTTP 缓存](https://developer.mozilla.org/docs/Web/HTTP/Caching)：比较 revalidation 与
  immutable。

## 我现在能做到什么

我能用一个受控 Dockerfile 从同一 workspace 构建 React 或 Vue，只交付当前 `dist`，并让 SPA
页面、静态资源和 API 错误走不同路径。我也能用响应头和 MIME 证据判断缓存或 fallback 是否掩盖
了真实问题。

## 单元导航

- 章节目录：[03 Nginx、HTTPS 与同源部署](../README.md#03-nginxhttps-与边缘部署)
- 上一章：[02 Docker Compose](../README.md#02-docker-与-compose)
- 下一课：[Nginx 反向代理、HTTPS 与同源安全](02-nginx-proxy-https-same-origin.md)
