# 55-Docker 容器化与 Compose 编排

## 目标

“在我电脑上是好的”是软件交付中最经典的分歧：Node 版本不同、全局依赖不同、数据库版本不同、环境变量缺失、操作系统行为差异，都会让同一份代码在不同机器上表现迥异。进入团队与生产环境后，我们需要一种把“代码 + 运行时 + 系统依赖 + 配置约定”打包成一致制品的手段，这就是容器；Docker 是这个手段的事实标准。

当系统从一个服务增长为 api、web、db、redis 多服务协同时，手工逐个启动、配网络、传环境变量很快失控，Docker Compose 提供了声明式的多容器编排能力，让“一条命令拉起整套环境”成为现实。

完成本知识单元后，学员应能够：

1. 解释容器要解决的环境一致性问题，区分镜像、容器、仓库、标签与摘要等基本概念。
2. 读懂并编写 Dockerfile，正确使用 `FROM`、`WORKDIR`、`COPY`、`RUN`、`ENV`、`EXPOSE`、`USER`、`CMD` 等指令并遵循最佳实践。
3. 为 Node.js 应用编写多阶段构建，分离构建依赖与运行依赖，显著缩小镜像体积。
4. 正确编写 `.dockerignore` 控制构建上下文，利用分层缓存机制安排指令顺序以加速构建。
5. 使用 Docker Compose 编排 api、web、db、redis 四个服务，声明依赖关系、端口、环境变量与健康检查。
6. 区分命名卷、绑定挂载与容器网络的用途，能让数据持久化、让服务按名称互相发现。

本单元的核心信念是：容器交付的是“不可变的运行制品”——同一份镜像在开发、测试、生产必须表现一致；任何依赖登录到机器上手工修改的配置，都是对不可变交付的破坏。

## 技术栈

| 工具 | 当前稳定版本线 | 用途 | 学习要求 |
|---|---|---|---|
| Docker Engine | 27.x 稳定版 | 构建与运行容器 | 掌握 build/run/logs/exec/ps/rmi 等命令 |
| Docker BuildKit | 随 Engine 内置 | 高性能镜像构建 | 理解分层缓存与构建器输出 |
| Docker Compose | v2.x 稳定版（插件式） | 多容器声明式编排 | 掌握 services、volumes、networks、depends_on、healthcheck |
| Node.js 基础镜像 | node:20-alpine / node:20-bookworm-slim | 容器运行时基座 | 会按体积与兼容性选择变体 |
| PostgreSQL 镜像 | postgres:16-alpine | 编排中的数据库服务 | 会配置账号、数据卷与初始化脚本 |
| Redis 镜像 | redis:7-alpine | 编排中的缓存服务 | 会配置持久化卷与端口 |
| pnpm | 9.x 稳定版 | 镜像内依赖管理 | 掌握 standalone 部署与 store 路径 |

约定：

- 所有镜像必须固定版本标签，禁止使用裸 `latest`；示例基础镜像统一写 `node:20-alpine`、`postgres:16-alpine`、`redis:7-alpine`。
- 容器内服务一律以非 root 用户运行；应用监听容器内端口 `3000`，数据库端口仅在需要本机调试时映射。
- 所有密码只使用环境变量占位（如 `POSTGRES_PASSWORD=<SET_IN_ENV>`），不写进镜像与提交文件。
- Compose 文件命名为 `compose.yaml`，环境差异通过 `.env` 文件注入，`.env` 不提交真实值。
- 数据持久化一律使用命名卷，不允许把数据库数据目录做绑定挂载到源码树。

开始前检查环境：

```bash
docker version
docker compose version
```

预期观察：同时能看到 Client/Server 版本与 Compose v2 版本；若 Server 部分报错，说明 Docker 守护进程未启动，需要先启动 Docker Desktop 或等效服务。

## 详细的理论知识讲解和示例伪代码

### 1. 容器价值与要解决的问题

#### 1.1 环境不一致的真实代价

一个三端协作的小系统，典型故障链是：

```text
本机 Node 22，用了新语法；服务器 Node 18 直接启动失败
本机装过全局 pnpm，服务器没有，脚本跑不起来
本机 PostgreSQL 16，测试环境 PostgreSQL 13，SQL 行为不同
某人登录服务器手工改了配置，其他人无法复现
```

容器把运行所需的一切打包进一个 Linux 命名空间隔离的进程环境：文件系统、运行时、系统库、环境变量约定随镜像一起交付，宿主只需要提供内核与容器引擎。

#### 1.2 容器与虚拟机的区别

| 对比 | 虚拟机 | 容器 |
|---|---|---|
| 隔离层级 | 硬件虚拟化，含完整客户操作系统 | 进程级隔离，共享宿主内核 |
| 启动速度 | 分钟级 | 秒级甚至毫秒级 |
| 资源开销 | 数百 MB 以上 | 很小，接近原生进程 |
| 交付内容 | 整台机器镜像 | 应用及其依赖层 |

注意：容器共享内核意味着它不提供内核级强隔离，不信任的工作负载不能仅靠 Docker 隔离直接共存；安全边界由额外的安全策略与平台能力保证。

#### 1.3 全栈关系

容器化让前后端第一次共享同一种交付语言：后端打成 api 镜像，前端构建产物打成 web 镜像（或由 nginx 基础镜像承载静态文件），数据库与缓存使用官方镜像。全栈工程师可以在本机用同一套方式运行、测试整个系统，部署环境也消费同样的制品，“开发—测试—生产”的环境裂缝被显著收窄。

#### 1.4 常见误区

> 误区一：容器就是轻量虚拟机，可以随便在里面 apt 装东西、手工改配置。

运行中的容器改动会在重建后丢失，也破坏不可变原则。所有变更必须通过 Dockerfile 与 Compose 声明。

> 误区二：用了 Docker 就自动获得高可用与自动扩缩容。

单机 Docker 与 Compose 解决的是“一致地运行”，不是集群调度；高可用与弹性属于编排平台层能力。

### 2. 镜像与容器

#### 2.1 核心概念关系

```text
Dockerfile（构建配方）
   │ docker build
   ▼
镜像 Image（只读分层模板，由多个 layer 组成）
   │ docker run
   ▼
容器 Container（镜像的一个运行实例，可读写层在最上层）
```

- 仓库 registry：存放镜像的服务，如 Docker Hub、GHCR。
- 标签 tag：同一镜像的版本指针，如 `node:20-alpine`。
- 摘要 digest：基于内容的不可变标识（`sha256:...`），标签可能被重新指向，摘要永远不变。

生产部署建议同时记录摘要，保证“今天部署的”和“明天重拉的”是同一个制品。

#### 2.2 常用命令

```bash
# 构建镜像，-t 指定名字与标签
docker build -t articles-api:1.0.0 .

# 查看本地镜像
docker images

# 前台运行一个容器，映射端口
docker run --rm -p 3000:3000 articles-api:1.0.0

# 后台运行并指定名称
docker run -d --name api articles-api:1.0.0

# 观察运行中的容器与日志
docker ps
docker logs -f api

# 进入容器排查
docker exec -it api sh

# 停止并删除容器
docker stop api && docker rm api
```

#### 2.3 全栈关系

“一个镜像多处运行”是全栈协作的基础：CI 构建一次镜像，推送到仓库；测试环境、预发环境、生产环境拉取的是同一个摘要。绝不能在各环境分别构建，否则又回到了环境不一致的老路。

#### 2.4 常见误区

> 误区一：使用 `latest` 标签以为总能拿到最新稳定版。

`latest` 只是默认标签，可能被任意覆盖，无法确定实际版本，更无法回滚到确定制品。

> 误区二：容器还在运行就直接删镜像，或把停止容器当作清理完成。

被容器引用的镜像无法删除；完整清理要先删容器，再按需删镜像与悬空层。

### 3. Dockerfile 指令与最佳实践

#### 3.1 一份可运行的基础 Dockerfile

先用单阶段建立对指令的完整认识：

```dockerfile
# 选择固定版本的小型基础镜像
FROM node:20-alpine

# 声明构建期与运行期元信息
LABEL org.opencontainers.image.title="articles-api"

# 设置工作目录，后续指令都在此目录下执行
WORKDIR /app

# 先拷贝依赖清单，利用缓存安装依赖
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

# 再拷贝源代码
COPY . .

# 构建应用
RUN pnpm build

# 运行期环境变量默认值（非敏感信息）
ENV NODE_ENV=production
ENV PORT=3000

# 仅作文档性声明，真正映射靠 run -p
EXPOSE 3000

# 创建并切换到非 root 用户
RUN addgroup -S app && adduser -S app -G app
USER app

# 容器启动命令
CMD ["node", "dist/main.js"]
```

#### 3.2 指令职责对照

| 指令 | 职责 | 最佳实践 |
|---|---|---|
| `FROM` | 指定基础镜像 | 固定版本，优先 alpine/slim 变体 |
| `WORKDIR` | 设置工作目录 | 用绝对路径，不依赖 `cd` |
| `COPY` | 复制文件进镜像 | 优先于 `ADD`，按缓存需求分组拷贝 |
| `RUN` | 构建期执行命令 | 合并同层命令并清理缓存，减少层数与体积 |
| `ENV` | 设置环境变量 | 只放非敏感默认值，敏感值运行时注入 |
| `EXPOSE` | 声明端口 | 文档作用，不自动映射 |
| `USER` | 切换运行用户 | 默认非 root，降低逃逸风险 |
| `CMD` / `ENTRYPOINT` | 启动命令 | 用 exec 形式，确保信号正确传递 |

`RUN` 安装系统依赖时应在同一条命令里清理包管理器缓存：

```dockerfile
RUN apk add --no-cache tini && \
    addgroup -S app && adduser -S app -G app
```

#### 3.3 exec 形式与信号

`CMD ["node", "dist/main.js"]` 是 exec 形式，node 作为容器 1 号进程直接接收 `SIGTERM`，可以执行优雅退出。写成 shell 形式 `CMD node dist/main.js` 会多出一个 shell 进程，信号可能无法送达应用，导致容器停止时应用被强杀。

#### 3.4 全栈关系

Dockerfile 是全栈制品的“出厂说明”，前端静态站点也可以容器化。一个典型 web 镜像使用 nginx 承载构建产物：

```dockerfile
FROM nginx:1.27-alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### 3.5 常见误区

> 误区一：以 root 运行应用，认为“反正只是容器”。

容器逃逸风险客观存在；非 root 运行是基础防线，且官方镜像通常已提供专用用户。

> 误区二：把密钥用 `ENV` 烤进镜像。

镜像会被分发到仓库与多台机器，任何能拉镜像的人都能读出其中的层内容。

### 4. 多阶段构建 Node 应用

#### 4.1 为什么需要多阶段

单阶段构建会把构建工具、开发依赖、源代码全部留在最终镜像里：体积大、攻击面大、启动慢。多阶段构建允许在“builder”阶段编译，只把运行所需的产物复制到精简的“runner”阶段。

#### 4.2 pnpm 多阶段示例

```dockerfile
# ---------- 阶段一：安装全部依赖并构建 ----------
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---------- 阶段二：只保留生产依赖 ----------
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ---------- 阶段三：最小运行镜像 ----------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app

# 只拷贝生产依赖与构建产物，不含源码与构建工具
COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

#### 4.3 pnpm standalone 进一步精简

pnpm 的符号链接结构让直接复制 `node_modules` 可能不完整。可使用部署命令生成扁平的独立产物目录：

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && pnpm deploy --prod /prod

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /prod ./
USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

#### 4.4 验证镜像瘦身效果

```bash
docker build -t articles-api:multi .
docker images articles-api
docker history articles-api:multi
```

`docker history` 逐层显示大小，可以判断体积集中在哪一层并针对性处理；预期运行镜像只含运行时、生产依赖与产物。

#### 4.5 全栈关系与常见误区

多阶段让“构建环境复杂、运行环境简单”成为标准模式：前端工程可以在 builder 阶段跑完整 Vite 构建，runner 阶段只剩静态文件服务器；后端同理。构建链再重，也不会污染运行制品。

> 误区一：把 `.env`、测试目录、CI 脚本一起 COPY 进最终镜像。

应通过 `.dockerignore` 与精确 COPY 双重控制，最小化进入镜像的文件。

> 误区二：runner 阶段重新执行构建命令。

构建只发生一次且只在 builder 阶段；runner 重复构建等于放弃多阶段的体积与缓存收益。

### 5. .dockerignore 与构建上下文

#### 5.1 构建上下文是什么

`docker build .` 末尾的 `.` 是构建上下文目录：Docker 客户端会先把整个上下文打包发给守护进程，`COPY . .` 能复制的也仅限于上下文中的文件。上下文越大，传输越慢、缓存越容易失效，误拷敏感文件的风险越高。

#### 5.2 .dockerignore 示例

```text
# 版本控制与 CI
.git
.github

# 依赖与构建产物（镜像内自行安装/构建）
node_modules
dist
coverage

# 本地环境与密钥
.env
.env.*
!.env.example

# 编辑器与系统文件
.vscode
.idea
.DS_Store

# 文档与测试运行产物
*.log
README.md
```

取反规则 `!.env.example` 表示在排除全部 env 文件的同时保留示例文件，可用于镜像内自检（仅含占位值）。

#### 5.3 检查上下文内容

```bash
# 构建时输出实际发送的上下文文件列表
docker build --progress=plain -t articles-api:debug . 2>&1 | grep transferring

# 或临时统计上下文大小
du -sh .
```

如果在传输列表里看到 `node_modules` 或 `.git`，说明 ignore 没有生效，应立即修正。

#### 5.4 全栈关系与常见误区

单体仓库里前端、后端、数据库脚本可能共处一树。构建某个服务镜像时，应把上下文限定到该服务目录（如 `docker build ./apps/api`），避免把其他服务的代码与密钥纳入上下文。

> 误区一：认为 `.gitignore` 能替代 `.dockerignore`。

两者机制独立：Git 忽略的文件 Docker 照样会发送。必须单独维护。

> 误区二：把 `.env` 加入 ignore 后，就以为镜像里不可能出现密钥。

若构建命令显式 `COPY config/secrets ./`，ignore 不会拦截已被显式引用的内容；密钥管理还要靠 Dockerfile 审计。

### 6. 分层缓存机制

#### 6.1 镜像层与缓存命中

Dockerfile 的每条指令大致产生一个只读层。构建时若某条指令的输入与父层未变化，则直接复用缓存层；一旦某层缓存失效，其后所有层都会重建。因此指令顺序应“变化频率从低到高”：

```text
低频：基础镜像、系统依赖
中频：package.json + lockfile → 安装依赖
高频：业务源代码 → 构建
```

#### 6.2 依赖先行的标准写法

```dockerfile
# 只要 lockfile 不变，这层一直命中，即使改了业务代码
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 业务代码变化只让下面的层重建
COPY . .
RUN pnpm build
```

反例是先 `COPY . .` 再安装依赖：任何一次源码修改都会使依赖安装层整体失效，构建时间成倍增加。

#### 6.3 配合挂载缓存

BuildKit 支持挂载缓存目录，包管理器下载缓存可以跨构建复用而不进入镜像层：

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
```

使用挂载缓存时要确保 CI 构建器也启用了 BuildKit，并理解缓存目录不随镜像分发。

#### 6.4 全栈关系与常见误区

缓存策略直接影响团队反馈速度：依赖层稳定时，前端构建通常只需重编译源码。CI 中还应按 lockfile 哈希建立缓存键（下一单元展开），与镜像层缓存形成互补。

> 误区一：为了“确保最新”，构建时总是加 `--no-cache`。

无条件禁用缓存会让每次构建都从零开始，应在需要排除缓存污染的具体场景有针对性使用。

> 误区二：把时间戳、随机数写进早层指令，导致缓存永远失效。

构建信息应放在靠后的层，或通过构建参数在需要时传入。

### 7. Docker Compose 编排

#### 7.1 四服务 compose.yaml

```yaml
services:
  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    image: articles-api:local
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://app:<SET_IN_ENV>@db:5432/articles
      REDIS_URL: redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  web:
    build:
      context: ./apps/web
    image: articles-web:local
    ports:
      - "8080:80"
    depends_on:
      - api
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: <SET_IN_ENV>
      POSTGRES_DB: articles
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d articles"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--appendonly", "yes"]
    volumes:
      - redis-data:/data

volumes:
  db-data:
  redis-data:
```

#### 7.2 常用命令

```bash
# 根据 compose.yaml 构建并后台启动全部服务
docker compose up -d --build

# 查看服务状态与聚合日志
docker compose ps
docker compose logs -f api

# 只重启某个服务
docker compose restart api

# 停止并删除容器（命名卷默认保留）
docker compose down

# 同时删除命名卷（确认数据可弃时使用）
docker compose down -v
```

#### 7.3 环境变量注入

敏感值通过 `.env` 文件与 `${VAR}` 插值注入，`.env` 只提供键名与占位，真实值放在不提交的本地文件中：

```bash
# .env（示例，提交占位版本）
POSTGRES_PASSWORD=<SET_IN_ENV>
```

```yaml
  db:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

#### 7.4 服务发现与应用连接

同一 Compose 默认网络内，服务可以用服务名作为主机名互相访问。应用代码中的连接地址必须使用服务名，而不是 `localhost`：

```ts
// 在容器内，db 与 redis 是 Compose 网络中的主机名
const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;

if (!databaseUrl || !redisUrl) {
  throw new Error('缺少数据库或 Redis 连接配置');
}

// 伪代码表达启动顺序
// 1. 等待 db 健康检查通过（由 depends_on 保证）
// 2. 建立连接池并监听 3000
console.log('connecting', { databaseUrl, redisUrl });
```

注意区分：容器里的 `localhost` 指向容器自身；只有从宿主机访问映射端口时才用 `localhost:3000`。

#### 7.5 depends_on 的能力边界

`depends_on` 只控制启动顺序与健康状态，不保证应用层就绪后再启动业务。更可靠的做法是让应用自身实现连接重试：

```ts
async function connectWithRetry(url: string, attempts = 10): Promise<void> {
  for (let i = 1; i <= attempts; i++) {
    try {
      // 伪代码：尝试建立连接
      console.log(`connect attempt ${i}`);
      return;
    } catch (error) {
      if (i === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * i));
    }
  }
}
```

#### 7.6 常见误区

> 误区一：把数据库、Redis 端口全部映射到宿主机，以为不映射就不能用。

服务间通信走 Compose 网络即可；端口映射只是为了从宿主机访问，多余映射只会增加暴露面。

> 误区二：在 compose.yaml 里写真实密码并提交。

Compose 文件长期存在于版本库，密码必须通过环境插值与 secrets 管理。

### 8. 卷、网络与健康检查

#### 8.1 两类卷

| 类型 | 形式 | 用途 | 风险 |
|---|---|---|---|
| 命名卷 named volume | `db-data:/var/lib/...` | 数据库等持久化数据，由 Docker 管理 | 生命周期独立，清理需显式操作 |
| 绑定挂载 bind mount | `./src:/app/src` | 开发期把源码挂进容器，实现改码即生效 | Linux 文件权限与 macOS 性能差异 |

开发期可以为 api 挂载源码并启用 watch 模式，但生产镜像不应依赖任何绑定挂载：

```yaml
  api:
    develop:
      watch:
        - action: sync
          path: ./apps/api/src
          target: /app/src
        - action: rebuild
          path: ./apps/api/package.json
```

#### 8.2 网络隔离

默认所有服务在同一网络。需要隔离时显式定义前端网络与后端网络，让数据库只对内部服务可达：

```yaml
services:
  web:
    networks: [frontend]
  api:
    networks: [frontend, backend]
  db:
    networks: [backend]
  redis:
    networks: [backend]

networks:
  frontend:
  backend:
```

这样 web 无法直接解析到 db，数据库流量被限制在后端网络，符合最小暴露原则。

#### 8.3 健康检查与自愈

除数据库外，应用也可以声明健康检查，配合重启策略实现轻量自愈：

```yaml
  api:
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 15s
    restart: unless-stopped
```

应用提供一个轻量健康端点，供编排与外部探活使用：

```ts
// 伪代码：/health 只做存活探测，不暴露内部细节
if (path === '/health') {
  respond(200, { status: 'ok' });
}
```

#### 8.4 全栈关系与常见误区

卷解决“容器重建后数据还在”，网络解决“服务彼此找得到”，健康检查解决“知道对方是否真的可用”。三者共同把一组临时进程变成可反复重建、状态可保留的开发/测试环境。

> 误区一：用绑定挂载保存数据库数据目录。

数据库对文件系统与权限敏感，宿主环境差异容易造成损坏；数据库一律使用命名卷。

> 误区二：健康检查直接查数据库全表或依赖外部服务。

探活过重会放大负载，外部依赖抖动还会导致误判自愈。健康端点应保持轻量，复杂就绪检查另设就绪探针。

## 课后题

1. 容器与虚拟机在隔离层级、启动速度与资源开销上有什么区别？为什么容器共享内核会带来安全边界上的注意事项？
2. 请说明镜像、容器、仓库、标签与摘要之间的关系。生产部署为什么更倾向记录摘要而不只是标签？
3. 场景分析：学员用 Docker 交付后，在测试环境依然复现了“缺少配置”的问题，排查发现他登录容器手工创建了一个配置文件。请解释这种做法为什么违背容器交付原则，正确方式是什么。
4. `COPY` 与 `ADD`、`CMD` 的 exec 形式与 shell 形式有何区别？为什么信号能否送达 1 号进程会影响优雅退出？
5. 多阶段构建分别解决什么问题？请描述 builder、deps、runner 三个阶段各自保留什么、丢弃什么。
6. 场景分析：某后端镜像体积超过 1.5GB，安全扫描报出大量构建工具漏洞。请给出至少三条瘦身与降险措施，并说明如何用 `docker history` 定位体积来源。
7. 为什么需要 `.dockerignore`？它与 `.gitignore` 是什么关系？如果 `docker build` 传输列表中出现了 `node_modules`，说明什么？
8. 场景分析：团队每次修改一行业务代码，CI 都要重新执行数分钟的依赖安装。请从分层缓存与指令顺序角度解释原因，并给出标准的 Dockerfile 改造方案。
9. 在 Compose 网络中，api 应如何配置数据库连接地址？为什么不能写 `localhost:5432`？`depends_on` 为什么不能替代应用层重试？
10. 场景分析：为了“本机调试方便”，学员把 db 的 5432、redis 的 6379 都映射到宿主机，并把数据库密码明文写进 compose.yaml 提交。请指出至少三处风险并给出合规替代方案。

## 实践练习题

### 练习 1：容器化一个 Node API

#### 任务

把一个已有的 Express + TypeScript API 项目容器化，编写可重复构建的 Dockerfile 并完成运行验证。

#### 步骤约束

1. 基础镜像固定 `node:20-alpine`，显式启用 corepack 使用 pnpm。
2. 先拷贝 `package.json` 与 lockfile 安装依赖，再拷贝源码构建，体现依赖先行。
3. 创建非 root 用户并在运行阶段切换，监听 3000 端口。
4. 编写 `.dockerignore`，至少排除 `.git`、`node_modules`、`.env`、`dist`。
5. 使用 `docker build` 与 `docker run -p 3000:3000` 完成一次构建和运行。
6. 用 `docker exec` 进入容器确认当前用户不是 root。

#### 提交物

- `Dockerfile` 与 `.dockerignore`；
- 构建、运行、验证的完整命令记录；
- `docker images` 与 `docker history` 输出；
- 200 字以内的镜像说明。

#### 验收标准

- 镜像可重复构建，容器启动后能响应健康请求；
- 容器内进程以非 root 运行；
- 镜像中不包含 `.env` 与本地 node_modules；
- 修改源码后依赖安装层能够命中缓存；
- 文档中的密码均为占位符。

### 练习 2：多阶段构建与镜像瘦身

#### 任务

把练习 1 的单阶段 Dockerfile 改造为多阶段，并量化体积变化。

#### 步骤约束

1. 至少包含 builder 与 runner 两个阶段；依赖可通过独立 deps 阶段或 `pnpm deploy` 产出。
2. runner 中不得出现源代码、测试文件与 devDependencies。
3. 使用 BuildKit 挂载缓存复用 pnpm store，并确认最终镜像不含该缓存目录。
4. 记录改造前后镜像体积，逐层用 `docker history` 对比并解释差异来源。
5. 在 runner 中保留非 root 用户与 exec 形式启动命令。
6. 重建两次，验证第二次构建中构建层缓存命中。

#### 提交物

- 多阶段 `Dockerfile`；
- 改造前后体积对比表；
- `docker history` 对比与缓存命中证据；
- 一份“进入最终镜像内容清单”。

#### 验收标准

- runner 只含运行时、生产依赖与构建产物；
- 体积明显下降，瘦身数据来自实际构建；
- 应用功能与单阶段版本一致；
- 不含密钥、测试与构建工具；
- 第二次构建有明确缓存命中记录。

### 练习 3：Compose 编排四服务环境

#### 任务

用 Docker Compose 一次性编排 api、web、db、redis，使任意同学一条命令得到完整可运行环境。

#### 步骤约束

1. api、web 使用本地构建镜像；db、redis 使用固定版本官方镜像。
2. 数据库密码通过 `.env` + `${POSTGRES_PASSWORD}` 插值，提交 `.env.example`，绝不提交真实值。
3. 数据库使用命名卷持久化并配置 `pg_isready` 健康检查；api 用 `depends_on` 等待健康。
4. api 实现连接重试逻辑，地址使用服务名 `db`、`redis`。
5. 定义前端/后端两个网络，使 web 不能直接访问 db；db 与 redis 端口默认不映射到宿主机。
6. 为 api 增加健康检查；提供 `up -d --build`、`ps`、`logs`、`down` 的操作说明。

#### 提交物

- `compose.yaml`、`.env.example`；
- api 连接重试与健康端点代码；
- 四服务运行状态与日志记录；
- 网络隔离验证过程（证明 web 无法解析 db）；
- README 使用与清理说明。

#### 验收标准

- 一条命令拉起四服务且全部健康；
- 重建容器后数据库数据仍在（命名卷生效）；
- 服务间使用服务名通信，无 localhost 误配；
- 数据库无端口映射与明文密码；
- `docker compose down` 可清理容器，`down -v` 行为有明确说明。

## 阶段验收作业

### 作业名称

容器化全栈系统与一键编排环境

### 作业场景

团队要把“文章与评论”系统交付给新成员和测试环境。要求：任何人克隆仓库后，不手工安装 Node、不手工安装数据库，就能通过 Docker 构建出一致制品，并用 Compose 一键运行整套系统；镜像要小、要安全、要可重复。你需要提交从 Dockerfile 到 Compose 的完整容器化方案。

### 提交物

```text
container-lab/
├── apps/
│   ├── api/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   └── src/
│   └── web/
│       ├── Dockerfile
│       ├── .dockerignore
│       └── nginx.conf
├── compose.yaml
├── .env.example
├── docs/
│   ├── image-analysis.md
│   └── runbook.md
└── README.md
```

### 必做内容

1. api、web 均采用多阶段构建；最终镜像以非 root 运行，标签固定版本。
2. 编排包含 api、web、db、redis 四服务，含健康检查、命名卷与前后端网络隔离。
3. 所有敏感配置通过环境插值注入，仓库中只保留 `.env.example` 占位。
4. 在 `image-analysis.md` 中给出镜像体积、逐层历史与瘦身前后对比。
5. runbook 写明启动、查看日志、重建、进入容器、清理卷与常见故障处理。
6. 至少演示一次“修改源码 → 利用缓存重建 → 服务恢复”的完整循环。
7. 验证制品一致性：同一镜像在两次 `up` 之间行为一致，不依赖容器内手工改动。

### 演示步骤

学员需要在 20 分钟内完成以下演示：

1. 从零执行构建，说明 Dockerfile 的阶段划分与缓存命中情况。
2. `docker compose up -d` 拉起四服务，展示全部健康状态。
3. 打开 web 页面并通过 api 完成一次创建文章操作，证明链路连通。
4. 展示命名卷中的数据在容器重建后保留。
5. 演示网络隔离：证明 web 无法直接访问 db，而 api 可以。
6. 修改一行代码后重建，指出哪些层命中缓存、哪些层重建。

导师可以要求删除卷后重新初始化，或临时更换端口与密码变量，验证方案是否真正参数化、可复现。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| Dockerfile 正确性与安全 | 25 | 指令使用规范，非 root、固定版本、exec 启动，无密钥入镜像 |
| 多阶段与镜像瘦身 | 20 | 阶段划分合理，体积数据真实，runner 无开发依赖与源码 |
| Compose 编排完整性 | 20 | 四服务齐全，依赖、环境、健康检查与重启策略正确 |
| 卷与网络 | 15 | 命名卷持久化，网络隔离生效，无多余端口映射 |
| 可复现性与 runbook | 10 | 一条命令可运行，文档完整，清理步骤明确 |
| 缓存与规范表达 | 10 | 缓存策略有效，命名统一，表达清晰 |

细分评分规则：

#### Dockerfile 正确性与安全：25 分

- 指令与固定版本基础镜像正确：8 分；
- 非 root 用户与最小权限：8 分；
- exec 启动、信号与优雅退出：5 分；
- `.dockerignore` 有效：4 分。

#### 多阶段与镜像瘦身：20 分

- 阶段划分与产物复制正确：8 分；
- 瘦身前后对比数据完整：7 分；
- runner 内容最小：5 分。

#### Compose 编排完整性：20 分

- 四服务定义与构建配置正确：8 分；
- 健康检查与依赖条件正确：7 分；
- 环境变量插值无明文密码：5 分。

#### 卷与网络：15 分

- 命名卷持久化验证：6 分；
- 前后端网络隔离验证：5 分；
- 端口暴露最小化：4 分。

#### 可复现性与 runbook：10 分

- 新人按 README 可一键运行：6 分；
- 清理与故障处理说明完整：4 分。

#### 缓存与规范表达：10 分

- 依赖先行与缓存命中可证明：5 分；
- 命名、结构与文档表达规范：5 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 容器仍以 root 运行，或基础镜像使用裸 `latest` 且无法确定实际版本。
2. 镜像或 Compose 文件中出现真实密码、令牌等敏感信息。
3. 无法通过一条 `docker compose up` 命令在干净环境复现整套系统。
4. 数据库数据使用绑定挂载或在容器删除后丢失，且无合理说明。
5. 多阶段构建流于形式，最终镜像仍包含全部 devDependencies 与构建工具。
6. 服务连接地址写死 localhost，或容器需要登录后手工修改才能运行。
7. 只提交截图，没有 Dockerfile、compose.yaml 与运行记录。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解容器价值与基本概念 | README 讲解与现场概念说明 |
| 编写规范 Dockerfile | api/web 的 Dockerfile 与安全配置 |
| 多阶段构建 Node 应用 | 多阶段文件与 image-analysis.md |
| 控制上下文与分层缓存 | `.dockerignore`、缓存命中记录与重建演示 |
| Compose 编排四服务 | compose.yaml 与四服务健康状态 |
| 卷与网络管理 | 数据持久化与网络隔离验证 |

### 提交前自检

- [ ] 所有镜像标签固定版本，没有裸 `latest`。
- [ ] 容器内进程以非 root 用户运行。
- [ ] `.dockerignore` 排除了依赖、环境文件与版本目录。
- [ ] 多阶段 runner 中没有源码、测试与 devDependencies。
- [ ] Compose 四服务健康，密码均来自 `${...}` 插值。
- [ ] 数据库、Redis 数据使用命名卷，重建后数据仍在。
- [ ] web 无法直接访问 db，多余端口没有映射。
- [ ] README 的命令可在干净机器上按顺序执行成功。
