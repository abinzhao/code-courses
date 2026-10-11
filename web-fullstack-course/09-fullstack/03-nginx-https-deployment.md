# 03 Nginx、HTTPS 与同源部署：让浏览器只面对一个可信入口

## 本章任务

把 React 或 Vue 的生产构建、Nginx 静态服务、`/api/v1` 反向代理和 TLS 终止组合成同一个
HTTPS 源。完成后，刷新 SPA 深链接仍能得到页面，缺失资源与 API 错误不会被
`index.html` 掩盖，Cookie、Origin、CSRF 和后端授权仍各自承担明确职责。

本章只给个人 `market` 项目和隔离 Compose 目标写配置。教材仓库不保存镜像、证书、私钥或
构建产物；公网 DNS、ACME 和生产主机操作不在本章自动执行。

## 必要前置

- 已完成[第 02 章：Docker Compose](02-docker-compose.md)，数据库、迁移和 API 在隔离栈中可用。
- React 与 Vue 都能用锁文件构建到各自 `dist/`。
- 已阅读[邻里集市项目契约](../00-guide/05-project-assessment.md)，理解整数分、UTC、同源 Cookie、
  CSRF 与后端对象授权。
- 本地运行证据需要 Docker Engine、Compose v2、Nginx 镜像和证书工具；缺少工具时只能记录静态
  结果，不得写成运行通过。

## 学习顺序

| 顺序 | 教程 | 单一责任 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [Web 镜像、SPA 静态路由与缓存](03-nginx-https-deployment/01-web-image-spa-static-cache.md) | 用一个受控参数构建 React 或 Vue，只复制 `dist`，分开入口、资源与 API | 120 分钟 |
| 2 | [Nginx 反向代理、HTTPS 与同源安全](03-nginx-https-deployment/02-nginx-proxy-https-same-origin.md) | 定义 TLS、代理路径、headers、限流、超时、日志和 trusted proxy 边界 | 150 分钟 |
| 3 | [Compose HTTPS、证书与状态码诊断](03-nginx-https-deployment/03-compose-tls-certificate-diagnosis.md) | 叠加私有 API/数据库、挂载证书并诊断 308/404/403/502/信任失败 | 150 分钟 |

依赖关系：

```text
可复现的 React/Vue dist
  -> 静态资源与 SPA fallback 分层
  -> /api/v1 原样代理与 TLS 终止
  -> Compose 私有网络、证书和故障证据
```

## 章级邻里集市综合任务

在同一份 `market` 项目中先构建 React 镜像，再构建 Vue 镜像；每次只让一个前端占用同一外部
源，并保持 API 的 `APP_ORIGIN` 与浏览器实际看到的 `https://market.example.test` 完全一致。
依次验证：

1. HTTP 请求得到 308，Location 指向同 host 的 HTTPS URL。
2. `/listings/example-id` 深链接返回 `text/html`，由对应前端路由接管。
3. `/assets/not-found.js` 返回 404，而不是 HTML。
4. `/api/v1/does-not-exist` 保留 API 状态和 JSON 错误，不进入 SPA fallback。
5. 登录响应 Cookie 具备生产 `Secure`、`HttpOnly`、明确 `SameSite`；写请求仍提交运行时 CSRF
   token，跨 Origin 写请求得到 403。
6. 用户乙仍不能编辑用户甲的商品；TLS、Nginx 或前端按钮都不能替代后端对象授权。
7. 停止 API 后得到 502 或受控网关错误；恢复 API 并重载/动态解析后 readiness 恢复。

React 与 Vue 顺序执行相同清单，不能把一套前端的浏览器证据复制给另一套。金额响应保持整数分，
时间保持 UTC ISO 8601；代理不得改写这些领域值。

## 章级验收证据

| 证据 | 通过条件 | 不能推出 |
| --- | --- | --- |
| Web 构建 | 两个 `WEB_APP` 分别产出当前提交的 `dist`，非法值构建失败 | 镜像已上线 |
| 静态分层 | 深链接 200 HTML、缺失 asset 404、API 错误非 HTML | 浏览器业务全通过 |
| Nginx 配置 | 可用环境中 `nginx -t` 退出 0 | 证书受公众信任 |
| HTTPS | 客户端显式信任本地 CA，hostname/SAN 验证通过 | ACME 自动续期 |
| 同源安全 | Origin 原样传递，Cookie/CSRF/授权分别验收 | XSS 已解决 |
| 私有网络 | 宿主只发布 web，API 与数据库无宿主端口 | 跨主机内网天然可信 |
| 故障恢复 | API 停止可观察，恢复后 readiness 重新为 200 | 多机零停机 |

本机没有 Docker、Nginx 或可信证书链时，应保留“受工具阻塞”及原始命令；配置文本存在不是运行
证据。公网证书、真实 DNS、HSTS 长周期和 ACME 续期属于外部证据。

## 章节导航

- 上一章：[02 Docker Compose](02-docker-compose.md)
- 第一课：[Web 镜像、SPA 静态路由与缓存](03-nginx-https-deployment/01-web-image-spa-static-cache.md)
- 下一章：[04 CI、发布与回滚](04-ci-release-rollback.md)
- 覆盖审计：[全栈覆盖矩阵](FULLSTACK-COVERAGE.md)
- 分卷入口：[全栈集成与交付](README.md)
