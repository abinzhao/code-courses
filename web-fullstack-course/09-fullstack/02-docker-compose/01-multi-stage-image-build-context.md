# 多阶段 API 镜像与构建上下文：只把运行所需内容交给非 root 进程

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 完整 `apps/api/Dockerfile`、根 `.dockerignore`、构建上下文与镜像证据清单 |
| 镜像目标 | build 阶段冻结安装与编译；runtime 阶段仅含部署包、迁移产物和非 root 用户 |
| 固定基线 | Node.js 24 Debian slim、pnpm `12.11.2`、工作区根上下文 |
| 安全边界 | `.env`、secret、证书、dump、日志不进入上下文和镜像层 |
| 建议时间 | 150 分钟 |
| 环境标签 | 配置可静态检查；只有真实 Docker build/inspect 才能标为 runtime 通过 |

本课唯一拥有 `apps/api/Dockerfile` 与根 `.dockerignore`。下一课的 Compose 只引用镜像和 build 路径，
不复制 Dockerfile；第三课也不创建第二个镜像版本。

## 1. 任务背景

把整个工作区压进一个 Node 镜像，再用 root 执行 `pnpm start`，可能“能启动”，却留下四个问题：

1. 构建工具、前端源码和缓存进入运行镜像；
2. `.env`、证书或 dump 可能永久写进 layer；
3. 容器内进程拥有不必要的 root 权限；
4. 没有冻结安装，今天和下周解析出不同依赖。

镜像不是源码压缩包。它是按层构建的只读运行文件系统。多阶段构建让 build 阶段拥有编译工具，
runtime 阶段只复制生产运行物。`.dockerignore` 则在 Dockerfile 执行前缩小“构建器可见的世界”。

## 2. 学习目标

完成本课后，你能够：

1. 区分 Dockerfile、build context、layer、image、container 和 volume；
2. 从工作区根构建，使 pnpm 能看到根锁文件与 workspace members；
3. 使用 frozen lockfile 和固定 pnpm 版本完成可复现安装；
4. 用 `pnpm deploy --prod` 生成 API 独立运行目录；
5. 显式复制 `dist`、`migrations` 与 `migrate.mjs`，并在构建期验证存在；
6. 在 runtime 阶段切换到官方镜像的 `node` 用户；
7. 用 `.dockerignore` 阻止 secret、证书、dump、日志和构建产物进入上下文；
8. 解释缓存优化与完整 workspace manifest 可见性之间的取舍；
9. 区分 tag、content digest 和本地 image ID；
10. 记录静态 parser、build、inspect 和运行时证据的不同证明范围。

## 3. 预备知识

- 完成[契约联调](../01-contract-integration.md)，`market/` 根只有一份 pnpm 锁文件；
- `pnpm --filter @market/api build` 和 API 本机启动在目标 Node 24 环境已通过；
- API 构建输出为 `apps/api/dist/main.js`，迁移入口为 `apps/api/migrate.mjs`；
- 已阅读后端综合项目的
  [工作区、配置与迁移启动](../../08-backend/10-api-capstone/01-workspace-config-migration-bootstrap.md)；
- Docker Engine、BuildKit/buildx 可用时再执行 build；不可用时只做文本和 Dockerfile parser 检查。

在 `market/` 根检查：

```bash
test -f package.json
test -f pnpm-workspace.yaml
test -f pnpm-lock.yaml
test -f apps/api/package.json
test -f apps/api/migrate.mjs
test -d apps/api/migrations
```

任一失败都应先修复工作区，不通过在 Dockerfile 中下载“缺失文件”掩盖源码问题。

## 4. 核心理论

### 4.1 构建上下文先于 COPY

命令：

```bash
docker build -f apps/api/Dockerfile .
```

末尾 `.` 是 context。Docker 客户端先按 `.dockerignore` 过滤 context，再把其余文件交给 builder。
Dockerfile 的 `COPY` 只能读取 context 内文件，不能用 `../` 越界读取。

工作区 API 依赖根锁文件和 contracts，因此 context 必须是 `market/` 根，而不是 `apps/api/`。

### 4.2 layer 不会因后续删除而消失

错误思路：

```dockerfile
COPY .env /tmp/.env
RUN use-secret /tmp/.env && rm /tmp/.env
```

`.env` 已存在于前一层，后续删除只在新层标记不可见，镜像历史仍可能恢复字节。正确做法是根本不让
secret 进入 context；构建确需凭据时使用 BuildKit secret mount，并确保命令不把值写入产物或日志。
本课构建不需要任何业务 secret。

### 4.3 build 与 runtime 的职责

```text
build:
  pnpm + 完整依赖 + TypeScript + 源码
  -> frozen install
  -> API build
  -> pnpm deploy --prod

runtime:
  Node + /app 生产依赖 + package.json + dist + migrations + migrate.mjs
  -> USER 1000:1000
  -> node dist/main.js
```

阶段之间只通过显式 `COPY --from=build` 传递文件。runtime 没有 pnpm，也不需要前端源码、测试、编译器
、API `src/test`、TypeScript 配置或根锁文件。

### 4.4 为什么使用 `pnpm deploy`

pnpm workspace 的依赖可能是符号链接和全局内容寻址结构，直接只复制 `apps/api/node_modules` 容易
留下断链。`pnpm deploy --prod /runtime` 为选定包生成可部署目录和生产依赖，再复制编译结果与迁移
文件。

deploy 目录还可能按 package 文件规则带入应用自有 `src/`、`test/`、`tsconfig*.json` 或其他构建
输入。Dockerfile 因此先显式删除这些路径，再把 `/runtime` 顶层收敛到生产 `node_modules` 与
`package.json`，最后复制编译结果和迁移文件。清理只发生在 `/runtime` 顶层，不能递归删除
`node_modules` 内生产依赖自己的 `src` 或元数据。`pnpm deploy` 不替代 build，也不会猜测自定义迁移
文件，所以这些产物仍需显式复制并用正、反向 `test` 验证。

### 4.5 非 root 是最小权限，不是完整沙箱

`USER 1000:1000` 使用官方 Node 镜像中 `node` 身份的数值 UID:GID，降低进程修改系统路径和
部分逃逸利用的权限，但不能替代：

- 只读根文件系统；
- capability drop 与 no-new-privileges；
- 资源和 PID 限制；
- 私有网络；
- secret 管理；
- 应用输入校验与对象授权。

这些运行时限制在 Compose 课配置。镜像本身先保证默认进程不是 root。

### 4.6 tag 与 digest

`node:24.21.0-bookworm-slim` 和 `postgres:18.6-bookworm` 是可变 tag；同一 tag 将来可能指向修复后的不同
manifest。教学配置用可读 tag 表达主线，实际发布前应在已验证平台记录并锁定
`name@sha256:...`。不能在教材中编造 digest，也不能把本地 image ID 当跨仓库 content digest。

## 5. Dockerfile 指令与配置清单

| 指令/文件 | 最小用法 | 作用 | 边界 |
| --- | --- | --- | --- |
| `# syntax` | dockerfile `1.7` | 选择 BuildKit frontend | 需 builder 支持 |
| `ARG NODE_IMAGE` | Node 24 slim tag/digest | 统一两阶段基础 | build 时仍需可信来源 |
| `FROM ... AS build` | 构建阶段 | 安装、编译、部署 | 不作为最终镜像 |
| `WORKDIR` | `/workspace` / `/app` | 固定相对路径 | 不创建权限策略 |
| `corepack prepare` | pnpm `12.11.2` | 固定包管理器 | 依赖仍由锁文件固定 |
| `COPY . .` | 根 context | 保证全部 workspace manifest 可见 | 缓存粒度较粗 |
| `--frozen-lockfile` | filter API 子图 | 拒绝清单/锁漂移 | 不验证业务行为 |
| `pnpm deploy --prod` | `/runtime` | 独立生产依赖 | 顶层源码/测试仍需清理，自定义产物需显式复制 |
| `COPY --chown` | build -> runtime | 复制并设置 node ownership | 只影响复制文件 |
| `USER 1000:1000` | 显式数值运行身份 | 避免 root API，并允许 inspect 判定 | 宿主 Docker 权限仍高 |
| `EXPOSE 3000` | 镜像元数据 | 说明监听端口 | 不发布宿主端口 |
| `.dockerignore` | context 过滤 | secret/体积边界 | 不替代 `.gitignore` |

## 6. 最小可运行案例

### 6.1 完整非 root 多阶段镜像

完整文件：`market/apps/api/Dockerfile`

```dockerfile
# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:24.21.0-bookworm-slim

FROM ${NODE_IMAGE} AS build
ARG PNPM_VERSION=12.11.2
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
WORKDIR /workspace

RUN corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate \
    && pnpm --version

COPY . .

RUN pnpm install --frozen-lockfile --filter @market/api...
RUN pnpm --filter @market/api build
RUN pnpm --filter @market/api deploy --prod /runtime
RUN rm -rf /runtime/src /runtime/test /runtime/tests /runtime/coverage \
      /runtime/tsconfig.json /runtime/tsconfig.*.json /runtime/*.tsbuildinfo \
    && find /runtime -mindepth 1 -maxdepth 1 \
      ! -name node_modules \
      ! -name package.json \
      -exec rm -rf -- {} + \
    && cp -R apps/api/dist /runtime/dist \
    && cp -R apps/api/migrations /runtime/migrations \
    && cp apps/api/migrate.mjs /runtime/migrate.mjs \
    && test -d /runtime/node_modules \
    && test -f /runtime/package.json \
    && test -f /runtime/dist/main.js \
    && test -f /runtime/migrate.mjs \
    && test -d /runtime/migrations \
    && test ! -e /runtime/src \
    && test ! -e /runtime/test \
    && test ! -e /runtime/tests \
    && test ! -e /runtime/tsconfig.json \
    && test -z "$(find /runtime -mindepth 1 -maxdepth 1 \
      ! -name node_modules \
      ! -name package.json \
      ! -name dist \
      ! -name migrations \
      ! -name migrate.mjs \
      -print -quit)"

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app

COPY --from=build --chown=node:node /runtime/ ./

USER 1000:1000
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

Node 官方镜像中的非 root `node` 身份固定为数值 `1000:1000`；使用数值能让后续
`docker inspect .Config.User` 直接证明 UID/GID 非零，而不是依赖镜像内可变用户名解析。
`ARG NODE_IMAGE` 可在发布构建中传入已审核 digest。若 API package 的 build 输出或迁移路径不同，应
修改唯一 Dockerfile 并同步验证，不额外建立“临时修正版”。

### 6.2 完整 context 排除规则

完整文件：`market/.dockerignore`

```dockerignore
.git
.gitignore
**/node_modules
**/dist
**/coverage
**/.cache
**/.env
**/.env.*
**/*.log
**/*.pem
**/*.key
**/*.crt
**/*.p12
**/*.dump
**/*.sql.gz
secrets
backups
evidence
tmp
```

迁移源码 `apps/api/migrations/*.sql` 没被排除；只有 dump/压缩备份被排除。若项目把受版本控制的测试
证书放在其他目录，也不应通过放宽根规则带进 API context，而应重新设计测试输入。

### 6.3 静态检查与真实构建

在 `market/` 根执行：

```bash
docker buildx build --check -f apps/api/Dockerfile .
docker build \
  --pull \
  --target runtime \
  --tag market-api:local \
  --file apps/api/Dockerfile \
  .
```

预期 parser/check 和 build 都退出 0。`--pull` 刷新 tag 指向，不代表可复现发布；证据需记录实际
base digest、最终 image ID、构建日期和目标平台。

停止方式：build 本身不启动容器；若后续用 `docker run` 探针，只删除自己命名的测试容器，不清理
不相关镜像或 volume。

## 7. 邻里集市集成案例

### 7.1 镜像内容与身份证据

构建成功后：

```bash
docker image inspect market-api:local \
  --format 'user={{.Config.User}} workdir={{.Config.WorkingDir}} cmd={{json .Config.Cmd}}'
docker run --rm --entrypoint node market-api:local \
  -e 'console.log({uid:process.getuid?.(),node:process.version,cwd:process.cwd()})'
docker run --rm --entrypoint sh market-api:local \
  -c '
    test -d node_modules
    test -f package.json
    test -f dist/main.js
    test -f migrate.mjs
    test -d migrations
    test ! -e src
    test ! -e test
    test ! -e tests
    test ! -e tsconfig.json
    test -z "$(find . -mindepth 1 -maxdepth 1 \
      ! -name node_modules \
      ! -name package.json \
      ! -name dist \
      ! -name migrations \
      ! -name migrate.mjs \
      -print -quit)"
  '
```

预期 `.Config.User` 为 `1000:1000`，运行 UID 为 1000，Node 主版本 24，cwd 为 `/app`；生产依赖、
package 元数据和三个运行
产物存在，应用顶层没有 `src/test/tsconfig` 或其他 deploy 遗留。断言不遍历删除 `node_modules`
内部内容，生产依赖不会因自身包含源码目录而被误判。这里覆盖 entrypoint 只做只读探针，不是生产
启动方式。

### 7.2 证明不含明显敏感路径

只检查路径和元数据，不输出任何 secret 值：

```bash
docker run --rm --entrypoint sh market-api:local -c '
  test ! -e .env
  test ! -e secrets
  test ! -e backups
  test ! -e node_modules/typescript
'
docker history --no-trunc market-api:local
```

`docker history` 仍可能包含 Dockerfile 命令和 ARG 值，因此禁止通过 ARG 传 secret。路径不存在不能
证明镜像绝无秘密，还要审查 context、构建日志和 layer；本课不使用业务凭据完成 build。

### 7.3 启动边界

API 真实启动需要 DATABASE_URL、APP_ORIGIN 和数据库迁移。不要为了看到进程监听，把连接串写进
Dockerfile 或 image ENV。下一课由 Compose 在运行时注入本地配置，并先运行 migration service。

## 8. 常见错误与排查路径

### 明确错误：把本地环境复制进镜像

```dockerfile
# 错误示例
COPY .env .env
ENV DATABASE_URL=postgresql://user:password@db:5432/market
```

| 记录项 | 内容 |
| --- | --- |
| 现象 | image history/config 可见连接信息，推送镜像等于扩散凭据 |
| 证据 | Dockerfile、inspect 或 layer 中出现环境值 |
| 原因 | 把运行时 secret 当构建输入和镜像配置 |
| 修复 | `.dockerignore` 排除；运行时通过受控 secret/config 注入；立即轮换已泄漏凭据 |
| 复验 | 重建新镜像并审查 history/context；旧镜像和缓存按范围撤销，不能只删容器 |

### 快速定位表

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| COPY 找不到锁文件 | context 是 `apps/api` | 从错误目录构建 | 根 context + `-f` | frozen install 开始 |
| deploy 后 main 缺失 | `/runtime/dist` 不存在 | build 输出未显式复制 | cp + `test -f` | runtime 探针通过 |
| 镜像仍含 API 源码/测试 | `/app/src` 或 `/app/test` 存在 | deploy 输出未经收敛 | 保留生产依赖/package 元数据后复制运行产物 | 顶层反向 test 与白名单断言通过 |
| 本机 build 成功，CI 漂移 | 没有 frozen 或锁文件 | 重新解析依赖 | 固定 pnpm + frozen | 改 manifest 不改锁时失败 |
| 容器 UID 0 | inspect user 为空/root | 忘记 `USER 1000:1000` | runtime 切到显式数值身份 | `process.getuid()` 为 1000 |
| 镜像非常大 | history 有源码/编译器层 | 使用单阶段或复制 build 根 | 多阶段只复制 deploy | 比较 size 和内容 |
| 修改源码仍复用旧层 | build 日志 cache 命中异常 | context/COPY 规则错误 | 查看 context 与 layer key | `--no-cache` 仅作诊断后修规则 |

## 9. 课后题

**1. 为什么 `.dockerignore` 比最后 `rm .env` 更重要？**
参考答案：ignore 让文件从未进入 context/layer；后续删除不能抹掉旧层字节。

**2. 为什么 context 选根而 Dockerfile 放 `apps/api/`？**
参考答案：Dockerfile属于 API，但构建需要根锁文件、workspace manifest 和 contracts。`-f` 与 context
可以是不同路径。

**3. `EXPOSE 3000` 是否把端口开放给宿主？**
参考答案：不会，它是镜像元数据。宿主发布由 `docker run -p` 或 Compose `ports` 决定。

**4. 非 root 是否意味着容器安全？**
参考答案：不是。它只降低进程权限；网络、capability、只读文件系统、资源、secret 和应用授权仍需
独立控制。

## 10. 实践练习

### 基础：记录镜像物料

在个人 `evidence/api-image.md` 记录 Dockerfile hash、根锁文件 hash、base digest、最终 image ID、
Node/pnpm 版本和目标平台。完成标准：区分 tag、digest、image ID，不记录凭据。

### 进阶：优化依赖缓存

在个人分支尝试先 COPY 全部 workspace manifest 和锁文件、安装后再 COPY 源码。完成标准：所有
成员 manifest 都完整列入；改 API 源码时 install layer 可复用；新增成员/依赖时 frozen install
仍正确失效。若无法证明不漏 manifest，保留本课 `COPY . .` 的正确基线。

### 故障注入：遗漏迁移产物

临时删除 Dockerfile 中迁移复制行，构建应在 `test -f /runtime/migrate.mjs` 处非零失败。保存
现象、layer 日志、原因、修复与复验。不得进入运行容器手工复制文件制造不可复现状态。

## 11. 阶段验收

- [ ] build context 明确为工作区根，Dockerfile 路径明确为 `apps/api/Dockerfile`。
- [ ] pnpm 固定 `12.11.2`，安装使用根锁文件和 frozen 模式。
- [ ] build 与 runtime 两阶段职责清楚，runtime 不含编译器和前端构建。
- [ ] `dist/main.js`、`migrate.mjs`、`migrations/` 在构建期验证。
- [ ] deploy 后只保留生产 `node_modules`/`package.json` 再复制运行产物，构建期与镜像内均证明无顶层 `src/test/tsconfig`。
- [ ] image 默认 `.Config.User` 为 `1000:1000`，运行 UID 为 1000。
- [ ] `.env`、secret、证书、私钥、dump、日志和 evidence 不进入 context。
- [ ] Dockerfile 不包含真实连接串、密码、token、Cookie 或证书。
- [ ] tag/digest/image ID 的证据口径分开。
- [ ] parser、build、inspect 各自的实际结果与未执行项明确记录。

若当前机器没有 Docker，前两份完整文件仍可做静态审查，但以上 build/inspect 项必须记为
`blocked-by-tool`，不得根据代码外观勾选。

## 12. 常见问题

**为什么不在镜像里运行测试？**
可在独立 test stage 运行，但 runtime 仍只复制已验证产物。本课聚焦 API 生产镜像；CI 章会组合
类型、测试、build 和 image gate。

**能用 Alpine 减小镜像吗？**
可以评估，但 musl 与原生依赖兼容性不同。课程使用 Debian slim 降低运行差异，不以最小字节数替代
可验证性。

**为什么没有在 Dockerfile 写 HEALTHCHECK？**
同一镜像可被不同环境使用，下一课由 Compose 定义具体 ready 路径、间隔和启动窗口，避免两处漂移。

**`pnpm deploy` 会自动包含所有非代码文件吗？**
不能假设，也不能假设它只含运行文件。应按 package 配置和实际文件树检查；本课先清理应用顶层
源码、测试和构建配置，只保留生产依赖与 package 元数据，再对编译、迁移和入口显式复制并验证。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Docker Build context](https://docs.docker.com/build/building/context/)：理解 context 与 ignore。
- [Docker Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)：核对阶段复制。
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)：核对 `ARG`、`COPY`、`USER`。
- [Build secrets](https://docs.docker.com/build/building/secrets/)：构建确需凭据时的受控入口。
- [pnpm deploy](https://pnpm.io/cli/deploy)：核对 workspace 部署目录。
- [Node 官方镜像](https://github.com/nodejs/docker-node)：核对 Debian slim 和 `node` 用户约定。

## 我现在能做到什么

我能从工作区根构建一个冻结依赖、包含迁移产物、默认非 root 的多阶段 API 镜像，并能解释 context、
layer、deploy、tag/digest 和运行时 secret 的边界；没有真实 Docker 时，我也会把静态自洽与
runtime 通过明确分开。

## 单元导航

[章节 hub](../02-docker-compose.md) ·
[上一课：编辑冲突、竞态与端到端验收](../01-contract-integration/04-edit-conflict-races-end-to-end.md) ·
[下一课：Compose 服务、DNS、健康与迁移](02-compose-services-network-health-migrations.md) ·
[全栈交付卷目录](../README.md)
