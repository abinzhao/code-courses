# Compose 服务、DNS、健康与迁移：按依赖条件启动，而不是按睡眠秒数猜

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一份完整 `compose.yaml`，包含 PostgreSQL 18、一次性 migration 和非 root API |
| 拓扑目标 | 数据库不发布宿主端口；API 只发布回环端口；服务通过名称 `db` 通信 |
| 启动条件 | db healthy -> migrate exit 0 -> api start -> api ready healthy |
| 运行约束 | 只读 API 根文件系统、tmpfs、cap drop、资源/PID/日志限制、优雅停止 |
| 建议时间 | 180 分钟 |
| 环境标签 | Compose config 可静态检查；服务健康与迁移必须由真实 Docker runtime 观察 |

本课是根 `compose.yaml` 的唯一 owner。上一课只拥有镜像；下一课通过 override、命令和验收脚本使用
本文件，不复制一份“带少量不同”的 Compose。

## 1. 任务背景

镜像只描述单个进程的文件系统和默认命令。邻里集市还需要数据库先接受连接、迁移只执行一次、API
只在 migration 成功退出后启动，并在停止时完成连接池关闭。当前第 08 章的 ready 实现只执行
`SELECT 1`；schema 与业务表权限必须由 migration 和后续真实业务 smoke 另行证明。

常见错误是：

```text
启动 db
sleep 5
启动 api
```

五秒可能太短，也可能浪费；进程存在不等于能接受查询，端口监听不等于依赖和迁移已就绪。Compose
需要表达的是服务关系和可观察条件，不是猜测时间。

## 2. 学习目标

完成本课后，你能够：

1. 区分 image、service、container、project、network、volume 和 secret；
2. 使用服务名 `db` 作为容器网络 DNS，不在 API 中写 `localhost`；
3. 让 PostgreSQL 18 使用正确的 `/var/lib/postgresql/18/docker` 数据布局；
4. 用数据库 healthcheck 阻塞 migration，用 migration 成功阻塞 API；
5. 区分 liveness、readiness 和 Compose container health；
6. 让数据库只在项目网络可见，API 只绑定宿主 `127.0.0.1:3000`；
7. 配置 `init`、SIGTERM、stop grace period 和 restart policy；
8. 给 API/migration 设置只读文件系统、tmpfs、capability 和 no-new-privileges；
9. 使用内存、CPU、PID 和 json-file rotation 边界；
10. 解释 `depends_on` 只解决启动/重建条件，不保证运行期间依赖永远健康。

## 3. 预备知识

- 完成[多阶段 API 镜像与构建上下文](01-multi-stage-image-build-context.md)；
- `apps/api/Dockerfile` 可从根 context 构建 `market-api:local`；
- API 监听 `0.0.0.0:3000`，提供 `/api/v1/health/live` 与 `/api/v1/health/ready`；
- migration 入口 `node migrate.mjs` 可重复执行，已应用 checksum 漂移时失败；
- 本地 `secrets/db_password.txt` 与 `secrets/api.env` 尚未提交 Git；
- 只对个人新建 Compose project 和空 PostgreSQL 18 volume 执行本课。

已有 PostgreSQL 16/17 数据目录不能直接挂给 18 镜像。本课不是主版本原地升级教程；真实旧数据应
走受控备份恢复或 `pg_upgrade` 计划。

## 4. 核心理论

### 4.1 Compose project 是命名和隔离边界

`name: market-course` 让服务、网络和 volume 带有稳定 project 前缀。服务名 `db` 在项目默认网络
解析到当前数据库容器 IP；容器重建后 IP 可变，服务名保持。

```text
host browser -> 127.0.0.1:3000 -> api:3000
                                      |
                                      | DNS db:5432
                                      v
                                    postgres
```

API 容器内的 `localhost` 指 API 容器自身，不是宿主，也不是数据库。

### 4.2 `depends_on` 条件是有向启动门

本课使用：

```text
db service_healthy
  -> migrate service_completed_successfully
       -> api start
```

- `service_started` 只证明容器进程已启动；
- `service_healthy` 依赖 healthcheck 连续成功；
- `service_completed_successfully` 要求一次性任务退出码 0。

API 启动后数据库若中断，Compose 不会自动暂停每个请求。应用仍要有连接/查询超时、受控 503、ready
转失败和重连策略。

### 4.3 live、ready、healthy 回答不同问题

| 信号 | 当前实现实际执行 | 能证明 | 不能证明 |
| --- | --- | --- | --- |
| live | 进程返回 `{ ok: true }` | HTTP 进程事件循环仍能响应 | 数据库、schema 或业务权限 |
| ready | pool checkout、事务、短 statement timeout、`SELECT 1`、提交 | 数据库连接与简单 query 往返 | 业务表存在、迁移版本正确或表级 CRUD 权限 |
| Compose health | 周期调用同一个 ready URL | 编排器按上述 ready 结果标记容器 | 比 ready 更多的 schema/权限事实 |

把 live 当 ready 会在数据库失联时继续分发业务流量；把 ready 当 live 可能让编排器反复重启一个本可
等待依赖恢复的健康进程。不同平台应按策略分别接入。本地 Compose 用 ready 证明连接和简单查询
可用，不能单凭其 200 把整个业务栈记为通过。

schema 与权限使用独立证据链：

| 证据 | 证明范围 |
| --- | --- |
| `migrate` one-shot exit 0 | migration 身份可执行登记 SQL，目标 schema/checksum 已应用 |
| `GET /api/v1/listings` 真实 smoke | API 运行身份可访问 listings schema 并执行该读取路径 |
| 认证后的创建/编辑 smoke | 仅证明实际走到的 INSERT/UPDATE、对象授权和相关表权限 |

本课 migration 与 API 暂时共用数据库身份，但仍不能把 `SELECT 1` 当表权限证明。未来拆分 DDL/DML
身份后，这三类证据更不能互相替代。

### 4.4 PostgreSQL 18 数据目录

PostgreSQL 官方镜像 18 的 volume 入口调整到 `/var/lib/postgresql`，默认 `PGDATA` 为：

```text
/var/lib/postgresql/18/docker
```

因此 named volume 挂到 `/var/lib/postgresql`，并显式设置同一 PGDATA。若继续只挂旧版常见路径
`/var/lib/postgresql/data`，可能把实际 18 数据写入容器可丢层，产生“重建后数据消失”。

### 4.5 资源限制与日志是故障边界

`mem_limit`、`cpus` 和 `pids_limit` 防单个教学服务无界占用宿主；设置过低会导致 OOM、超时或构建
失败，必须通过测量调整。`json-file` 的 max-size/max-file 防容器日志无限增长，但不是集中审计、
指标或长期留存系统。

### 4.6 restart 不能修复错误配置

数据库/API 可用 `unless-stopped` 处理宿主重启和瞬时退出；migration 必须 `restart: "no"`，否则
确定性 schema 错误会循环。错误连接串、缺迁移或坏 health path 应保留失败证据并修配置，不用无限
restart 掩盖。

## 5. Compose 配置与运行契约清单

| 键/接口 | 最小值 | 作用 | 边界 |
| --- | --- | --- | --- |
| `name` | `market-course` | 固定项目命名 | 并行实验应显式换 project |
| service name | `db/migrate/api` | DNS 与职责 | 不是公共域名 |
| `POSTGRES_PASSWORD_FILE` | `/run/secrets/...` | 数据库初始化读取密码 | 仅空数据目录生效 |
| `PGDATA` | `/var/lib/postgresql/18/docker` | PG18 数据位置 | 不兼容旧卷直接启动 |
| `healthcheck` | `pg_isready` / ready HTTP | 接受连接、简单 query 与容器状态证据 | 不证明 schema/业务权限 |
| `depends_on.condition` | healthy/completed | 首次启动门 | 不处理运行期断连 |
| `ports` | `127.0.0.1:3000:3000` | 本机浏览器访问 API | 不对局域网开放 |
| 无 db `ports` | 仅项目网络 5432 | 缩小数据库入口 | 调试用 psql 可进容器 |
| `read_only` + `tmpfs` | API/migrate | 限制运行写入 | 应用若需上传须另挂载 |
| `cap_drop` | `ALL` | 删除 Linux capability | 不等于完整沙箱 |
| `init` | `true` | 回收子进程/转发信号 | 应用仍需处理 SIGTERM |
| `stop_grace_period` | `20s` | 给连接池关闭时间 | 超时后仍会强制终止 |
| `logging.options` | 10m x 3 | 本地日志上限 | 不是备份或审计仓库 |

## 6. 最小可运行案例

### 6.1 完整 Compose 拓扑

完整文件：`market/compose.yaml`

```yaml
name: market-course

services:
  db:
    image: postgres:18-bookworm
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
      retries: 12
      start_period: 10s
    restart: unless-stopped
    stop_grace_period: 30s
    shm_size: 128m
    mem_limit: 768m
    cpus: "1.00"
    pids_limit: 256
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
      target: runtime
    command: ["node", "migrate.mjs"]
    env_file:
      - ./secrets/api.env
    environment:
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    restart: "no"
    init: true
    read_only: true
    tmpfs:
      - /tmp:size=64m,mode=1777
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    mem_limit: 256m
    cpus: "0.50"
    pids_limit: 128
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  api:
    image: market-api:local
    build:
      context: .
      dockerfile: apps/api/Dockerfile
      target: runtime
    env_file:
      - ./secrets/api.env
    environment:
      NODE_ENV: development
      PORT: "3000"
      APP_ORIGIN: http://localhost:5173
    ports:
      - "127.0.0.1:3000:3000"
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
        - >-
          fetch("http://127.0.0.1:3000/api/v1/health/ready")
          .then((response) => process.exit(response.ok ? 0 : 1))
          .catch(() => process.exit(1))
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    restart: unless-stopped
    init: true
    stop_signal: SIGTERM
    stop_grace_period: 20s
    read_only: true
    tmpfs:
      - /tmp:size=64m,mode=1777
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    mem_limit: 512m
    cpus: "1.00"
    pids_limit: 256
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

`NODE_ENV: development` 只服务本地 HTTP Cookie 实验；生产 HTTPS 章节会改为 production。migration
和 API 目前共用 `secrets/api.env` 中的数据库身份，是教学启动简化；生产发布必须拆 DDL 与 DML
最小权限身份。

### 6.2 静态展开

从 `market/` 运行：

```bash
docker compose -f compose.yaml config --quiet
docker compose -f compose.yaml config --services
docker compose -f compose.yaml config --volumes
```

预期依次成功，并列出 `db`、`migrate`、`api` 与 `pgdata`。`config` 可能展开环境变量或路径，不要把
完整输出贴到公开记录；`--quiet` 适合语法证据。

没有 Docker 时，可用 YAML parser 检查语法，但它不理解 Compose schema、merge、插值或 runtime
行为，必须标为“YAML 静态通过，Compose 未执行”。

## 7. 邻里集市集成案例

### 7.1 首次启动顺序

确认本地 secret 文件已按第三课准备后：

```bash
docker compose build api
docker compose up -d
docker compose ps --all
docker compose logs --tail=50 migrate
curl -i http://127.0.0.1:3000/api/v1/health/live
curl -i http://127.0.0.1:3000/api/v1/health/ready
curl -fsS 'http://127.0.0.1:3000/api/v1/listings?page=1&pageSize=1' \
  >/dev/null
```

预期观察，而不是预先宣称：

1. db 从 starting 变 healthy；
2. migrate 在 db healthy 后启动，输出 applied 或 already applied，退出码 0；
3. api 在 migration 成功后启动并变 healthy；
4. live 和 ready 都返回 200；ready 只证明连接池和 `SELECT 1`；
5. listings smoke 返回 2xx，另行证明已迁移 schema 与 API 身份的该业务读取权限；
6. API 日志显示连接 host 为 `db` 对应目标，但不打印完整 URL/密码。

若要声称写权限也正确，继续运行第 08 章真实 HTTP/数据库验收中的认证创建、编辑 smoke，并核对
数据库结果；listings GET 成功不能外推 INSERT/UPDATE 权限。

### 7.2 DNS 和端口边界

```bash
docker compose exec api node -e '
  import("node:dns/promises")
    .then(({lookup}) => lookup("db"))
    .then(({address}) => console.log({service:"db",resolved:Boolean(address)}))
'
docker compose port api 3000
docker compose port db 5432
```

预期 API 端口显示 `127.0.0.1:3000`；db port 命令无宿主映射。DNS 输出只记录“成功解析”，IP 是可
变实现细节，不写进配置。

### 7.3 健康与资源观察

```bash
docker compose ps
docker compose exec api id
docker inspect "$(docker compose ps -q api)" \
  --format 'readonly={{.HostConfig.ReadonlyRootfs}} pids={{.HostConfig.PidsLimit}}'
docker stats --no-stream
```

API UID 预期非 0，readonly 为 true，PID/内存/CPU 有限制。`docker stats` 是瞬时观察，不证明容量
足够；压力和生产容量在运维章另做有界测量。

### 7.4 停止而不删除数据

本章默认停止：

```bash
docker compose stop
```

需要移除本项目容器和网络时可在确认项目名后使用：

```bash
docker compose down
```

两条命令都不带 `-v`。不得把 `docker compose down -v` 写成默认清理；named volume 中是后续持久化
验证的数据库事实。

## 8. 常见错误与排查路径

### 明确错误：容器内用 localhost 连接数据库

```dotenv
# 错误示例
DATABASE_URL=postgresql://market_owner:local-password@localhost:5432/market
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | API/migrate 报 connection refused，db 自身却 healthy |
| 证据 | 错误目标为 `127.0.0.1:5432`；项目 DNS 中存在 `db` |
| 原因 | 容器 localhost 指当前容器，不指另一个 service |
| 修复 | host 改为 Compose 服务名 `db`，保留内部端口 5432 |
| 复验 | migrate exit 0，API ready 200，db 仍无宿主端口 |

### 快速定位表

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| API 永远不启动 | migrate exit 非 0 | SQL/checksum/连接错误 | 查 migrate 首条根因 | migrate 0 后 API 才启动 |
| API running 但 unhealthy | health 日志 404/连接失败 | ready 路径或监听地址错 | 修路径/监听 `0.0.0.0` | ready 200 |
| ready 200 但业务查询失败 | `SELECT 1` 成功，listings smoke 失败 | schema 未应用或运行身份缺表权限 | 查 migrate 退出证据与业务错误 | migrate 0 且目标业务 smoke 2xx |
| 重启循环刷屏 | restart count 增长 | 确定性配置错误 | 暂停服务并修配置 | 重启计数稳定 |
| 数据库可从局域网访问 | `docker compose port db` 有输出 | 错加 db ports | 删除宿主映射 | port 查询无映射 |
| 日志占满磁盘 | json log 文件无界 | 未设 rotation | max-size/max-file | inspect 显示限制 |

## 9. 课后题

**1. `EXPOSE 3000` 与 Compose `ports` 有何区别？**
参考答案：EXPOSE 是镜像元数据；ports 创建宿主到容器的发布规则。本课只发布 API 回环端口。

**2. 为什么 migration 是独立 service，而不在每个 API 启动时执行？**
参考答案：schema 变更需要单独退出码、权限和顺序；多 API 副本同时迁移会扩大竞争与权限。

**3. db healthy 是否证明 schema 正确？**
参考答案：不能。`pg_isready` 只证明 PostgreSQL 正在接受连接；当前 API ready 也只证明连接池可执行
`SELECT 1`。migration exit 0 证明 schema migration 已应用，之后真实 listings/写入 smoke 才分别
证明 API 运行身份在对应业务路径上的表权限。

**4. `depends_on` 是否会在数据库运行中断开时停止 API？**
参考答案：不会。应用要超时、ready 失败、受控返回并在依赖恢复后重连。

## 10. 实践练习

### 基础：拓扑图与端口清单

在 `evidence/compose-topology.md` 画 host/API/db/migrate 箭头，标出每个端口是否发布。完成标准：
数据库只有内部 5432，浏览器只访问回环 3000，容器连接使用 `db`。

### 进阶：拆分 live 与 ready 故障

只在个人隔离栈暂停 db，记录 API live、ready、Compose health 和一条业务请求。完成标准：live 可
响应、ready 非 2xx、业务受控失败；恢复 db 后 ready 在有界时间恢复。不要停止其他项目数据库。

### 故障注入：错误健康路径

临时把 API healthcheck 改为 `/api/v1/health/missing`。预期进程 running 但 container unhealthy，
日志/health output 为 404。恢复正确路径后重新创建 API，ready 200。不得把 test 改成永远 exit 0。

## 11. 阶段验收

- [ ] Compose schema/config parser 实际退出 0，服务列表为 db/migrate/api。
- [ ] PostgreSQL 镜像主版本 18，PGDATA 与 volume target 符合 18 布局。
- [ ] db 无宿主端口，API 只绑定 `127.0.0.1:3000`。
- [ ] API/migrate 通过服务名 `db` 连接，不使用 localhost。
- [ ] 首次顺序为 db healthy -> migrate 0 -> api healthy。
- [ ] live、ready 和 Compose health 的含义与故障行为分开；ready 200 只记为连接与 `SELECT 1` 通过。
- [ ] migrate one-shot exit 0 单独证明 schema/checksum 应用，listings 真实 smoke 单独证明业务读取权限。
- [ ] 只有执行相应认证创建/编辑 smoke 后才声明 INSERT/UPDATE 与对象授权路径通过。
- [ ] API 默认非 root、只读 rootfs、tmpfs、cap drop、no-new-privileges。
- [ ] 三服务有适当资源/PID/日志边界，migration 不循环 restart。
- [ ] SIGTERM 与 grace period 保留应用优雅关闭窗口。
- [ ] 停止/移除命令不带 `-v`，未删除数据库 volume。

当前环境无 Docker 时，上述 runtime 项全部记 `blocked-by-tool`；YAML 解析通过不能替代 Compose
config、镜像 build、health 或网络证据。

## 12. 常见问题

**为什么 db 没有 cap_drop ALL？**
官方镜像初始化可能需要切换用户和调整数据目录。安全配置要经实际镜像验证，不能机械复制 API
限制导致数据库无法启动；数据库通过私网、secret、非发布端口和最小角色继续约束。

**为什么本地 API 是 NODE_ENV=development？**
为了与本地 HTTP Cookie 约定一致。生产必须 HTTPS、Secure Cookie 和 production 配置，下一章再
建立边缘代理。

**可以把 migration 改成 API command 前的 shell 串联吗？**
不建议。独立 service 有明确权限、日志、退出码和依赖条件；串联会混淆长期进程与一次性任务。

**资源限制越小越安全吗？**
不是。过小会 OOM 或超时，形成可用性故障。限制应有测量、告警和调整依据。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Compose file reference](https://docs.docker.com/reference/compose-file/)：核对服务、资源和依赖键。
- [Compose startup order](https://docs.docker.com/compose/how-tos/startup-order/)：核对 health/completed 条件。
- [Compose networking](https://docs.docker.com/compose/how-tos/networking/)：理解 service DNS。
- [Docker healthcheck](https://docs.docker.com/reference/dockerfile/#healthcheck)：理解状态与退出码。
- [PostgreSQL Docker image](https://hub.docker.com/_/postgres)：核对 18 数据目录和初始化变量。
- [Node.js process signals](https://nodejs.org/api/process.html#signal-events)：复核 SIGTERM 处理边界。

## 我现在能做到什么

我能用一份 Compose 文件表达 PostgreSQL 18、一次性迁移和非 root API 的真实依赖图，解释 DNS、
health/readiness、PG18 volume、端口、资源和日志边界；我不会用 sleep、localhost、无限 restart
或默认删 volume 来掩盖配置问题。

## 单元导航

[章节 hub](../02-docker-compose.md) ·
[上一课：多阶段 API 镜像与构建上下文](01-multi-stage-image-build-context.md) ·
[下一课：Secret、Volume、持久化与故障恢复](03-secrets-volumes-persistence-failures.md) ·
[全栈交付卷目录](../README.md)
