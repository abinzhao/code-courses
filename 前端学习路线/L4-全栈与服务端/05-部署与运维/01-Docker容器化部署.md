# 01-Docker 容器化部署

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L4 全栈与服务端
> - 先修：[03 迁移、事务与索引](../04-数据库基础/03-迁移-事务与索引.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Docker](https://docs.docker.com/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Docker 的核心三要素：镜像（Image）、容器（Container）、仓库（Registry）
- 掌握容器化 vs 传统虚拟机部署的本质区别和各自适用场景
- 能独立编写生产级 Dockerfile，包括多阶段构建（Multi-stage Build）
- 熟练使用 docker build、run、ps、stop、rm、logs、exec 等常用命令
- 能用 Docker Compose 编排前端 + 后端 + 数据库 + Redis 多容器服务
- 理解环境变量的注入策略和安全边界
- 实战：将 Next.js 全栈项目用 Docker Compose 一键启动

---

## 内容讲解

### 一、Docker 的核心三要素

Docker 是当今最主流的容器化平台。在理解 Docker 之前，先搞清楚三个最基本的概念：

```
┌─────────────────────────────────────────────────────┐
│                    Docker Registry                    │
│  ┌──────────────────┐  ┌──────────────────┐         │
│  │  nginx:1.25      │  │  node:22-alpine   │         │
│  │  postgres:16     │  │  redis:7          │         │
│  └──────────────────┘  └──────────────────┘         │
└───────────────────────┬─────────────────────────────┘
                        │ docker pull / docker push
                        ▼
┌─────────────────────────────────────────────────────┐
│                    本地机器                           │
│  ┌──────────────────────────────┐                   │
│  │     Image（镜像，只读）         │                   │
│  │  像是一个"类"或者"模具"         │                   │
│  └──────────┬───────────────────┘                   │
│             │ docker run                              │
│             ▼                                         │
│  ┌──────────────────────────────┐                   │
│  │     Container（容器，可写）     │                   │
│  │  类的一个"实例"，运行时状态     │                   │
│  │  ┌─────────────────────────┐ │                   │
│  │  │ 容器 1 │ 容器 2 │ 容器 3 │ │                   │
│  │  └─────────────────────────┘ │          │
│  └──────────────────────────────┘                   │
└─────────────────────────────────────────────────────┘
```

- **镜像（Image）**：一个只读的模板，包含运行应用所需的完整文件系统（OS、运行时、依赖、代码）。镜像是分层构建的（每一条 Dockerfile 指令生成一层），层层叠加，共享基础层。
- **容器（Container）**：镜像的运行实例。容器在镜像之上添加一个薄薄的**可写层**，运行时的修改只会写入这一层，不会影响底层镜像。容器可以启动、停止、删除、迁移。
- **仓库（Registry）**：存放和分发镜像的服务器。Docker Hub 是默认公共仓库（类似 GitHub）。公司内部通常搭建私有仓库（如 Harbor、阿里云容器镜像服务）。

### 二、容器 vs 虚拟机：核心差异

这是一个经典的面试题。关键区别在**资源抽象层级**：

```
虚拟机架构：                         容器架构：
┌─────────────────┐                 ┌─────────────────┐
│   App A  App B   │                 │   App A  App B   │
├────────┬────────┤                 ├────────┬────────┤
│  Guest  │ Guest  │                 │ 容器引擎(Docker)  │
│   OS A  │  OS B  │                 ├─────────────────┤
├────────┴────────┤                 │     Host OS      │
│ Hypervisor(VMM) │                 ├────────────────── │
├─────────────────┤                 │   Infrastructure │
│    Host OS      │                 └─────────────────┘
├─────────────────┤
│ Infrastructure  │
└─────────────────┘
```

| 维度 | 虚拟机 | Docker 容器 |
|------|-------|-------------|
| 启动速度 | 分钟级（需启动完整 OS） | 秒级（共享 Host OS 内核） |
| 资源占用 | 每个 VM 几个 GB 内存 | 每个容器几十 MB 起 |
| 隔离级别 | OS 级强隔离 | 进程级隔离（基于 Namespace + Cgroup） |
| 镜像大小 | 几 GB | 几十 MB ~ 几百 MB |
| 移植性 | 依赖 Hypervisor 类型 | 任何安装了 Docker 的系统都能跑 |
| 密度 | 一台机器跑十几个 | 一台机器跑上百个 |

> **不适合容器的场景**：需要不同内核版本、需要 GUI、对安全隔离要求极高（如金融核心系统）。其余场景优先考虑容器。

### 三、Dockerfile：把应用打包成镜像

Dockerfile 是一个文本文件，包含一系列指令告诉 Docker 如何构建镜像。以下是核心指令：

```dockerfile
# ============================================================
# 示例：Next.js 应用的 Dockerfile（单阶段构建，仅用于理解）
# ============================================================

# FROM：指定基础镜像。alpine 是最轻量的 Linux 发行版（~5MB）
FROM node:22-alpine AS base

# WORKDIR：设置工作目录。后续指令都以此目录为基准
WORKDIR /app

# COPY：将本地文件复制到镜像中
# 先复制 package.json 和 lock 文件（利用 Docker 缓存层）
COPY package.json pnpm-lock.yaml ./

# RUN：在构建时执行命令
RUN corepack enable && pnpm install --frozen-lockfile --prod

# 复制源代码
COPY . .

# ENV：设置环境变量（构建时可被 --build-arg 覆盖）
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# RUN 执行构建
RUN pnpm build

# EXPOSE：声明容器监听哪个端口（文档作用，不实际发布端口）
EXPOSE 3000

# CMD：容器启动时执行的命令（每个 Dockerfile 只能有一个 CMD）
CMD ["pnpm", "start"]
```

#### 各指令详解

| 指令 | 作用 | 注意事项 |
|------|------|---------|
| `FROM` | 指定基础镜像 | 必须放在第一行（`ARG` 除外）。推荐用 `alpine` 减小体积 |
| `WORKDIR` | 设置工作目录 | 如果目录不存在会自动创建。推荐用绝对路径 |
| `COPY` | 复制文件/目录 | 优先复制 `package.json` 再 `npm install`，利用 Docker 层缓存 |
| `RUN` | 执行构建命令 | 每执行一次就生成一个新层。多个命令用 `&&` 连接减少层数 |
| `EXPOSE` | 声明端口 | 纯文档作用，实际端口映射在 `docker run -p` 中指定 |
| `CMD` | 容器启动命令 | 只能有一条。可被 `docker run` 后的命令覆盖 |
| `ENV` | 设置环境变量 | 构建时生效。运行时用 `-e` 或 `--env-file` 注入 |
| `ADD` | 类似 `COPY` | 支持自动解压 tar 和远程 URL。**能用 COPY 就别用 ADD** |
| `ENTRYPOINT` | 入口命令 | 与 `CMD` 区别：`ENTRYPOINT` 不会被 `docker run` 后的命令覆盖 |

#### 利用 Docker 构建缓存

Docker 构建是分层的，每一层有缓存。如果某一层变化了，该层及之后的所有层都需要重建。**把不常变的放在前面，常变的放在后面**：

```dockerfile
# ✅ 正确顺序：先复制依赖文件，再复制源码
COPY package.json pnpm-lock.yaml ./   # 依赖不常变，缓存有效
RUN pnpm install                        # 依赖没变就不重新安装
COPY . .                                # 源码频繁变，放最后
RUN pnpm build
```

### 四、多阶段构建（Multi-stage Build）

核心思想：**用一个镜像来构建，用另一个镜像来运行**。最终发布的镜像只包含运行时需要的文件。

```dockerfile
# ============================================================
# Next.js 生产级 Dockerfile（多阶段构建）
# 最终镜像 ~120MB vs 单阶段 ~1.2GB
# ============================================================

# -------------------- 阶段 1：依赖安装 --------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# -------------------- 阶段 2：构建 --------------------
FROM node:22-alpine AS builder
WORKDIR /app
# 从 deps 阶段复制 node_modules（不用重新安装）
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建时的环境变量（不含敏感信息）
ENV NEXT_TELEMETRY_DISABLED=1

RUN corepack enable && pnpm build

# -------------------- 阶段 3：生产运行（最小镜像） --------------------
FROM node:22-alpine AS runner
WORKDIR /app

# 设置为非 root 用户运行（安全最佳实践）
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 只复制运行时需要的文件
COPY --from=builder /app/public ./public
# Next.js 的独立构建产物需要 .next/standalone 目录
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**多阶段构建可以减少 90% 以上的镜像体积**，因为最终镜像里没有 `node_modules` 中的 devDependencies、没有源代码、没有 `.git` 目录。要启用 Next.js Standalone 模式，需要在 `next.config.ts` 中配置：

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone', // 启用独立构建模式
};

export default nextConfig;
```

### 五、docker build 与 .dockerignore

#### 构建命令

```bash
# -t my-app:latest   给镜像打标签（名称:版本）
# .                  构建上下文路径（Dockerfile 所在目录）
docker build -t my-app:latest .

# --no-cache         不使用缓存，强制全量重建
# --build-arg        传入构建参数
docker build --no-cache --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t my-app:v2 .
```

#### .dockerignore 文件

和 `.gitignore` 一样，避免将不必要的文件发送到构建上下文（让构建更快、镜像更小）：

```dockerignore
# .dockerignore —— 这些文件不会进入构建上下文
node_modules
.git
.next
.cache
dist
coverage
.env
.env.*
*.md
!README.md            # 感叹号表示例外（保留 README.md）
.gitignore
.dockerignore
Dockerfile
docker-compose*.yml
.turbo
.vercel
```

### 六、常用容器管理命令

```bash
# ========== 镜像管理 ==========
docker images                    # 列出本地所有镜像
docker pull postgres:16-alpine   # 从仓库拉取镜像
docker rmi my-app:latest         # 删除镜像（rmi = remove image）
docker image prune               # 清理所有无标签的悬空镜像

# ========== 容器生命周期 ==========
# 运行容器（详细参数见下方注解）
docker run -d --name my-app -p 3000:3000 -e DATABASE_URL=xxx my-app:latest

# -d       后台运行（detach）
# --name   给容器起个名字（否则 Docker 会随机生成）
# -p       端口映射 宿主机端口:容器端口
# -e       注入环境变量
# -v       挂载卷 宿主机路径:容器路径（用于持久化数据）
# --rm     容器停止后自动删除
# --restart=always  容器退出后自动重启

docker ps                        # 列出正在运行的容器
docker ps -a                     # 列出所有容器（包括已停止的）
docker stop my-app               # 优雅停止（发送 SIGTERM，10 秒后 SIGKILL）
docker start my-app              # 启动已停止的容器
docker restart my-app            # 重启容器
docker rm my-app                 # 删除容器
docker rm -f my-app              # 强制删除运行中的容器

# ========== 调试与日志 ==========
docker logs my-app               # 查看容器日志
docker logs -f my-app            # 实时追踪日志（类似 tail -f）
docker logs --tail=100 my-app    # 只看最后 100 行
docker exec -it my-app sh        # 进入容器内部执行命令（-i 交互，-t 分配终端）
docker inspect my-app            # 查看容器详细元数据（IP、挂载、网络等）

# ========== 清理 ==========
docker system prune -a           # 清理所有未使用的镜像、容器、网络、缓存（慎用）
```

### 七、Docker Compose：多容器编排

当一个项目包含多个服务（前端 + 后端 + 数据库 + Redis），用 `docker run` 一个个启动极其繁琐。Docker Compose 让你用一个 YAML 文件定义所有服务，一条命令启动所有容器。

#### docker-compose.yml 实战

下面是完整的 Next.js 全栈项目 Compose 配置：

```yaml
# ============================================================
# docker-compose.yml — Next.js 全栈应用一键启动
# 服务：前端(Next.js) + PostgreSQL 数据库 + Redis 缓存
# ============================================================

# version 字段在最新版 Compose 中已废弃，直接不写
services:

  # ==============================
  # 服务 1：Next.js 应用
  # ==============================
  app:
    # 从当前目录的 Dockerfile 构建
    build:
      context: .                    # 构建上下文路径
      dockerfile: Dockerfile        # Dockerfile 文件名
      args:                         # 构建参数（可选）
        - NEXT_PUBLIC_API_URL=http://localhost:3000/api
    container_name: nextjs-app      # 容器名称
    ports:
      - "3000:3000"                 # 宿主机:容器 端口映射
    environment:                    # 环境变量（方式一：直接写在文件里）
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    env_file:                       # 环境变量（方式二：从文件加载，优先级低于 environment）
      - .env.local
    depends_on:                     # 依赖关系（启动顺序）
      db:
        condition: service_healthy  # 等数据库健康检查通过后再启动
      redis:
        condition: service_started
    restart: unless-stopped         # 除非手动停止，否则异常退出后自动重启
    networks:
      - app-network

  # ==============================
  # 服务 2：PostgreSQL 数据库
  # ==============================
  db:
    image: postgres:16-alpine       # 直接用官方镜像，不需要 Dockerfile
    container_name: postgres-db
    environment:
      - POSTGRES_USER=postgres      # 数据库用户名
      - POSTGRES_PASSWORD=postgres  # ⚠️ 生产环境必须用 secrets 管理密码
      - POSTGRES_DB=mydb            # 自动创建这个数据库
    volumes:
      # 将数据持久化到宿主机，容器删除后数据不丢失
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"                 # 映射端口（生产环境建议不暴露，仅内部通信）
    healthcheck:                    # 健康检查：确保数据库完全就绪
      test: ["CMD-SHELL", "pg_isready -U postgres -d mydb"]
      interval: 5s                  # 每 5 秒检查一次
      timeout: 5s                   # 单次检查超时时间
      retries: 5                    # 连续失败 5 次才标记为 unhealthy
    restart: unless-stopped
    networks:
      - app-network

  # ==============================
  # 服务 3：Redis 缓存
  # ==============================
  redis:
    image: redis:7-alpine
    container_name: redis-cache
    volumes:
      - redis-data:/data            # 持久化 Redis 数据（AOF/RDB）
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - app-network

# ==============================
# 命名卷定义（Docker 管理的持久化存储）
# ==============================
volumes:
  postgres-data:                    # PostgreSQL 数据卷
  redis-data:                       # Redis 数据卷

# ==============================
# 自定义网络（各服务之间的隔离通信）
# ==============================
networks:
  app-network:
    driver: bridge                  # bridge = 默认网络驱动，同一网络下服务用容器名互访
```

#### Docker Compose 常用命令

```bash
# 启动所有服务（后台运行）
docker compose up -d

# 启动并强制重新构建镜像
docker compose up -d --build

# 只启动指定服务
docker compose up -d app

# 查看所有服务状态
docker compose ps

# 查看日志（可指定服务名）
docker compose logs -f app

# 停止所有服务（不删除容器、网络、卷）
docker compose stop

# 停止并删除所有容器和网络（数据卷保留）
docker compose down

# 停止并删除容器、网络、数据卷（⚠️ 数据不可恢复）
docker compose down -v

# 进入某个服务的容器
docker compose exec app sh

# 在某个服务中执行一次性命令
docker compose run --rm app pnpm db:migrate
```

### 八、环境变量注入策略

Docker 中环境变量的优先级从高到低：

```
docker run -e（命令行直接指定）
    >
env_file 指定的文件
    >
Docker Compose environment 字段
    >
Dockerfile 中的 ENV 指令
```

**最佳实践**：

```bash
# 开发环境：用 .env.local 文件注入非敏感变量
docker compose --env-file .env.local up -d

# CI/CD：用 -e 注入构建时产生的变量
docker run -e DATABASE_URL="$DATABASE_URL" -e JWT_SECRET="$JWT_SECRET" my-app:latest

# 生产环境：敏感信息用 Docker Secrets（Swarm）或外部密钥管理服务
```

**重要安全提醒**：
- 绝对不要把 `.env` 文件写入镜像。在 `.dockerignore` 中排除所有 `.env*`。
- API Key、数据库密码等敏感信息用 Docker Secrets 或 HashiCorp Vault 等工具管理。
- `docker history <image>` 命令可以看到镜像每一层的构建历史和 `--build-arg` 的值。不要在 `--build-arg` 中传密码。

### 九、实战：Next.js + PostgreSQL 一键启动

完整的项目结构：

```
my-fullstack-app/
├── Dockerfile                    # 多阶段构建文件
├── docker-compose.yml            # 服务编排
├── .dockerignore                 # 构建忽略规则
├── next.config.ts                # 开启 output: 'standalone'
├── package.json
├── prisma/
│   └── schema.prisma             # 数据库 Schema
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       └── posts/route.ts        # API 路由
└── lib/
    ├── db.ts                     # Prisma 客户端（单例）
    └── redis.ts                  # Redis 客户端（单例）
```

关键代码文件：

```typescript
// lib/db.ts —— Prisma 客户端单例
import { PrismaClient } from '@prisma/client';

// 防止开发时热重载创建多个实例
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

```typescript
// lib/redis.ts —— Redis 客户端单例
import { Redis } from '@upstash/redis';

// 在 Docker 网络中，用服务名 db 或 redis 作为主机名
export const redis = Redis.fromEnv();
```

启动步骤：

```bash
# 1. 确保 Docker Desktop 已启动

# 2. 首次启动（构建镜像 + 创建容器）
docker compose up -d --build

# 3. 数据库迁移（在 app 容器中执行）
docker compose exec app pnpm prisma:db:push

# 4. 验证所有服务正常运行
docker compose ps
# 应该看到三个服务都是 Up 状态

# 5. 打开浏览器访问
open http://localhost:3000

# 6. 查看日志
docker compose logs -f

# 7. 停止项目
docker compose stop

# 8. 完全清理
docker compose down -v
```

---

## 常见问题

### Q1：Docker Desktop 占用内存太大怎么办？

Docker Desktop 默认分配 2GB 内存。你可以在 Settings → Resources 中调低到 1GB。如果只是运行简单项目，这个配置足够。对于生产环境（Linux），直接装 Docker Engine（没有 GUI 开销）。

### Q2：每次改代码都重新 build 太慢了，怎么办？

开发阶段建议用 `docker compose watch`（Docker Compose 2.22+），它监听文件变化并自动同步到容器：

```yaml
# docker-compose.yml 中为 app 服务添加
services:
  app:
    develop:
      watch:
        - path: ./src
          action: sync          # 源码变更 → 同步到容器
          target: /app/src
        - path: ./package.json
          action: rebuild       # 依赖变更 → 重建镜像
          target: /app/package.json
```

或者在开发时不用 Docker，仅在部署阶段构建镜像。

### Q3：容器内连接数据库应该用什么地址？

在 Docker Compose 中，同一网络的容器之间**用服务名作为主机名**。比如 `docker-compose.yml` 中定义了 `db` 服务，那么 app 容器内连接数据库的地址就是 `db:5432`，**不是** `localhost:5432`（localhost 指向容器自己）。

### Q4：多阶段构建的 `--from` 能重用之前阶段的文件吗？

可以，语法是 `COPY --from=<阶段名> <源路径> <目标路径>`。`--from` 后面跟的是 `FROM ... AS <阶段名>` 定义的别名。还能从外部镜像复制：

```dockerfile
COPY --from=nginx:alpine /etc/nginx/nginx.conf /etc/nginx/nginx.conf
```

### Q5：为什么容器重启后数据库数据没了？

因为容器默认不持久化数据。需要挂载数据卷：

```yaml
volumes:
  - postgres-data:/var/lib/postgresql/data  # 宿主机路径或命名卷
```

命名卷 `postgres-data` 由 Docker 管理，存放在 `/var/lib/docker/volumes/` 下。

### Q6：`CMD` 和 `ENTRYPOINT` 到底有什么区别？

- **CMD**：默认启动命令，可以被 `docker run <image> <command>` 覆盖。
- **ENTRYPOINT**：固定的入口命令，`docker run` 后面的参数会**追加**到 ENTRYPOINT 后面，不会覆盖。

典型组合：`ENTRYPOINT` 设脚本，`CMD` 设默认参数。

### Q7：Docker Compose 的 `depends_on` 真的确保数据库完全就绪吗？

不。`depends_on` 只是控制容器**启动顺序**，不代表被依赖的服务内部逻辑已经就绪。PostgreSQL 容器启动后还需要几秒才能接受连接。正确的做法是配合 `healthcheck` + `condition: service_healthy`：

```yaml
depends_on:
  db:
    condition: service_healthy
```

### Q8：生产环境中 Docker Compose 够用吗？

对于单机部署（一台服务器），Docker Compose 足够。对于多机集群，需要 Docker Swarm 或 Kubernetes。Docker Swarm 是 Docker 内置的集群方案（Compose 文件的 v3 语法直接兼容），Kubernetes 更复杂但功能更强。

---

## 实操作业

### 基础练习：容器化现有项目

将你之前写的 Next.js 项目打包成 Docker 镜像：

1. 编写 `Dockerfile`（单阶段构建即可，先理解基本流程）
2. 编写 `.dockerignore`
3. 执行 `docker build -t my-blog . `
4. 执行 `docker run -p 3000:3000 my-blog`
5. 在浏览器中验证页面是否正常

### 进阶练习：多服务 Docker Compose

在上一个练习的基础上：

1. 在 `next.config.ts` 中启用 `output: 'standalone'`
2. 重写 `Dockerfile` 为多阶段构建，验证镜像大小减少了多少（`docker images` 查看）
3. 编写 `docker-compose.yml`，加入 PostgreSQL + Redis
4. 在应用中写一个简单的 API，从 PostgreSQL 读取数据，用 Redis 做缓存
5. 使用 `docker compose up -d` 一键启动整个项目

### 挑战练习：多环境 + CI/CD

1. 改写 `docker-compose.yml` 支持不同环境（使用 `docker-compose.override.yml` 区分 dev/prod）
2. 编写一个 GitHub Actions 工作流：push 代码后自动 `docker build` + `docker compose up` 到测试服务器
3. 使用 `docker compose watch` 实现开发时的热重载
4. 研究 Docker Buildx 的多平台构建（同时构建 amd64 和 arm64 镜像）

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：Dockerfile 安装锁定依赖、构建、非 root 启动；dockerignore 排除秘密与本机产物。镜像实际启动检查页面/API，不能仅证明 build 完成。
- **进阶**：多阶段复制 standalone、static/public，Compose 服务用内部 DNS 而非 localhost。readiness 等 DB 可用，持久卷重启数据保留；Redis 故障有明确降级。
- **挑战**：开发 watch 与生产镜像分离，CI 发布同一已验证 artifact；buildx 检查目标架构。只在自己环境演练，rollback 与持久数据兼容不能靠重建镜像保证。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L4 里程碑](../../projects/atlas/milestones/L4.md)
- 本课任务：按 L4 里程碑把“Docker 容器化部署”接入 Atlas 全栈版本，明确服务端信任边界、数据契约、失败响应和回滚方式。
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

Docker 是现代部署的基石。核心就三件事：

1. **Dockerfile**：把你的应用打包成可移植的镜像。关键是利用多阶段构建和缓存分层减小体积。
2. **Docker Compose**：把一个项目的多个服务编排在一起。一个 `docker-compose.yml` 描述所有服务，一条 `docker compose up` 全部启动。
3. **环境变量与数据卷**：环境变量注入配置（不要把敏感信息写进镜像），数据卷持久化数据（容器重启数据不丢）。

掌握了这些，你就可以在任何一台安装了 Docker 的机器上一键启动你的全栈项目，彻底告别"我机器上能跑啊"的问题。

下一节我们学习如何把项目部署到 Vercel 和 Cloudflare 这样的现代托管平台，体验零运维 Git Push 自动部署。

<!-- course-nav:start -->
---

[上一篇：数据建模、隔离级别与查询计划](../04-数据库基础/04-数据建模-隔离级别与查询计划.md) · [课程地图](../../README.md) · [下一篇：02-Vercel / Cloudflare 部署](./02-Vercel-Cloudflare部署.md)
<!-- course-nav:end -->
