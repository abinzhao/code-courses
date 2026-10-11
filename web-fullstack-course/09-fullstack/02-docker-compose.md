# 02 Docker Compose：把运行条件、依赖和数据边界写成文件

## 本章任务

把第 1 章已联调的 API 打包成非 root 多阶段镜像，并用一份 Compose 拓扑启动 PostgreSQL 18、
一次性 migration 和 API。完成后应能证明：

- 构建上下文不含 `.env`、secret、证书、dump、日志和构建产物；
- API runtime 只含生产依赖、编译结果和迁移产物，默认 UID 非 0；
- db healthy 后 migration 执行且退出 0，之后 API ready 变为 200；
- 容器通过服务名 `db` 连接，数据库不发布宿主端口；
- API 只发布 `127.0.0.1:3000`，具备只读文件系统、资源和日志边界；
- API 重建后 Listing 与未过期数据库 session 仍存在；
- volume 被明确区分为持久化，不冒充备份；
- 普通停止、排障和清理命令不默认使用 `docker compose down -v`。

本章沿用整数分、UTC、same-origin Cookie、CSRF、后端对象授权、原子预约和明确 `409`。容器不会
替代这些应用/数据库规则。

## 必要前置

- 完成[第 1 章：契约联调](01-contract-integration.md)；
- API 在目标 Node.js 24 环境可 build，migration 可重复执行；
- `market/` 根有 pnpm `12.11.2` 生成的唯一锁文件；
- Docker Engine、BuildKit 与 Compose v2 可用时才能执行 runtime 验收；
- 本章只操作个人隔离 project 和新建 PostgreSQL 18 数据卷；
- 已有 非目标 PostgreSQL 主版本 数据卷不得直接换 18 镜像启动。

当前课程主环境若没有 Docker，或只有 非目标 PostgreSQL 主版本 客户端/服务端，则 Dockerfile、YAML 和 shell
仍可静态检查，但 image build、Compose config/runtime、PG18 migration、health、DNS、volume 和
persistence 均不得记为通过。

## 三课路线

| 顺序 | 教程 | 单一责任 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [多阶段 API 镜像与构建上下文](02-docker-compose/01-multi-stage-image-build-context.md) | Dockerfile、`.dockerignore`、frozen install、`pnpm deploy`、非 root runtime | 150 分钟 |
| 2 | [Compose 服务、DNS、健康与迁移](02-docker-compose/02-compose-services-network-health-migrations.md) | 唯一 `compose.yaml`、PG18、迁移门、ready、资源、日志和优雅停止 | 180 分钟 |
| 3 | [Secret、Volume、持久化与故障恢复](02-docker-compose/03-secrets-volumes-persistence-failures.md) | 本地 secret 边界、API/db 重建持久化、角色轮换和五类故障 | 180 分钟 |

依赖顺序：

```text
可重建、非 root API image
  -> db/migrate/api 拓扑与健康门
  -> 持久化证据、故障注入和安全轮换
```

完整文件责任固定：第 1 课拥有 Dockerfile/.dockerignore，第 2 课拥有 compose.yaml，第 3 课拥有
持久化脚本。后课只能引用前课文件，不复制修改版。

## 章级邻里集市任务

在个人 `market/`：

1. 静态检查并构建 `market-api:local`，记录 base digest、锁文件 hash、image ID 与非 root UID。
2. 用 owner-only 本地文件生成数据库密码和 API 连接配置；不在证据中显示值。
3. 运行 `docker compose config --quiet`，再启动新 project。
4. 观察 db healthy、migrate applied/already applied 且 exit 0、API ready 200。
5. 确认 db 无宿主端口，API 仅回环发布；容器内 DNS `db` 可解析。
6. 登录虚构账号、创建一个整数分 Listing，记录 ID 与受保护 Cookie jar 路径。
7. 只强制重建 API，证明 Listing 与 session 存在；再按隔离步骤重建 db，证明同一 volume 可挂回。
8. 抽取一个故障：localhost、错误 health path、旧卷密码、缺 migration、API loopback bind。
9. 保存“现象 / 证据 / 原因 / 修复 / 复验”，修复后重跑 migration/ready/persistence。
10. 删除临时 Cookie jar并停止服务，不删除 pgdata volume。

## 综合验收与评分

总分 **100 分**，达到 **80 分**且无阻断项才通过。所有分值均为整数。

| 维度 | 分值 | 必需证据 |
| --- | ---: | --- |
| 镜像与 context | 25 | Dockerfile check/build、frozen lock、runtime 文件、非 root、敏感路径排除 |
| Compose 拓扑 | 25 | config、DNS、db 无端口、PG18 layout、db -> migrate -> api 条件 |
| 健康与资源 | 15 | live/ready 区分、API healthy、只读/cap/PID/CPU/内存、日志 rotation、SIGTERM |
| 持久化与 secret | 25 | secret 权限/忽略、API ID 改变、db/volume 保持、Listing 与 session 前后存在 |
| 故障恢复与说明 | 10 | 至少一项五段诊断；能解释初始化密码、角色轮换、volume/backup 区别 |

阻断项：

- secret、连接串、Cookie、私钥或真实数据进入 Dockerfile、镜像、Git、日志或证据；
- API 以 root 运行且无解释；
- 数据库端口默认暴露到宿主/局域网；
- migration 失败却绕过门直接启动 API；
- 把 live 当 ready，或把 healthcheck 改成永远成功；
- 非目标 PostgreSQL 主版本 结果冒充 PostgreSQL 18；
- API 重建后 Listing/session 丢失却报告持久化通过；
- 用删除 volume 修密码、网络、health 或镜像问题；
- 把 named volume 写成可恢复备份；
- 默认或无确认执行 `docker compose down -v`。

建议证据命令：

```bash
docker buildx build --check -f apps/api/Dockerfile .
docker build --target runtime -t market-api:local -f apps/api/Dockerfile .
docker compose -f compose.yaml config --quiet
docker compose up -d
docker compose ps --all
docker compose logs --tail=50 migrate
curl -i http://127.0.0.1:3000/api/v1/health/ready
COOKIE_JAR=/tmp/market-course-cookie.jar \
  ./ops/verify-compose-persistence.sh "实际 Listing ID"
```

只记录脱敏输出、退出码和状态；不要公开完整 `compose config`、inspect env 或 Cookie jar。

## PostgreSQL 18 与清理边界

官方 PostgreSQL 18 镜像使用 `/var/lib/postgresql` volume 入口，并以
`/var/lib/postgresql/18/docker` 作为本章 PGDATA。旧主版本数据必须通过受控升级或备份恢复迁移，
不能直接复用目录。

正常暂停：

```bash
docker compose stop
```

移除本项目容器和网络但保留数据：

```bash
docker compose down
```

本章不提供默认删卷命令。课程结束若确需删除个人 volume，应先列出精确名称、确认数据和备份边界，
再执行显式单 volume 操作。

## 章节导航

[上一章：契约联调](01-contract-integration.md) ·
[开始第 1 课](02-docker-compose/01-multi-stage-image-build-context.md) ·
[下一章：Nginx 与 HTTPS 部署](03-nginx-https-deployment.md) ·
[全栈覆盖矩阵](FULLSTACK-COVERAGE.md) ·
[全栈交付卷目录](README.md)
