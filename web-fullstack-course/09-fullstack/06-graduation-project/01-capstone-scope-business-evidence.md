# 结业范围、业务闭环与证据包：把邻里集市交付成一个系统

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 冻结最终 workspace、不变量、预约状态机、outbox、双前端范围和可复验证据包 |
| 项目位置 | 读者自己的 `market/`；教材仓库不保存应用、依赖、锁文件、证书、dump 或日志 |
| 运行条件 | Node.js 24、pnpm 12.11.2、PostgreSQL 18；容器/浏览器/Redis 仅在实际可用时计证据 |
| 核心产出 | `evidence/verify-reservation.mjs`、20 买家并发报告、数据库唯一行断言、双前端与交付证据 |
| 成功证据 | 业务闭环、状态机、授权、事务/outbox、幂等、React/Vue 等价路径和脱敏证据均可复现 |
| 失败证据 | 越权、双重有效预约、部分事务、重复副作用、假成功、未执行能力被写成通过 |
| 本地边界 | 写入型 verifier 只接受一次性 Linux host 的固定防火墙 profile、无 host 设备/挂载的非 root Docker API；其余环境 blocked |
| 选修边界 | Review 最多单独加 5 分，不进入基础 100 分，也不抵消门槛或否决项 |

## 1. 任务背景

前几卷分别证明了语言、框架、工程和后端能力。毕业项目不再增加大量新名词，而是要求同一条业务
从数据库约束、事务、HTTP、两个前端、测试、容器、监控一直走到恢复证据。

常见“看似完成”包括：

- React 页面完整，Vue 只有首页；
- API 返回 201，但数据库出现两条有效预约；
- 预约提交成功，Redis 故障时通知事件永久丢失；
- 取消按钮隐藏了，直接请求仍能越权；
- 备份有 checksum，却从未恢复；
- 评分表写满分，但浏览器、Docker 或 PG18 根本没运行。

本课先冻结范围和证据责任，防止临近答辩用界面演示掩盖跨层缺口。

## 2. 学习目标

完成本课后，你能够：

1. 建立最终 `market` workspace，不覆盖已有 scripts、依赖、锁文件和配置；
2. 把金额、UTC、身份、对象授权、version、预约唯一性写成跨层不变量；
3. 定义 pending/cancelled/confirmed 与 Listing 状态的合法转换；
4. 用固定锁顺序和同一事务实现取消、确认、version 与 outbox；
5. 用至少一次投递和持久 event ID 幂等处理通知；
6. 让 React/Vue 分别实现等价 loading/empty/error/success/permission/conflict；
7. 从外部以 20 买家竞争验证 HTTP 结果，并用数据库断言补足唯一行证据；
8. 组织不含秘密、能区分预期/实际/未验证的证据包。

## 3. 预备知识

必须完成：

- [契约集成](../01-contract-integration/01-workspace-contract-runtime-validation.md)；
- [API 综合项目](../../08-backend/10-api-capstone/01-workspace-config-migration-bootstrap.md)；
- [事务 Outbox](../../08-backend/08-redis-queues-reliability/02-transactional-outbox-consistency.md)；
- [CI、发布与回滚](../04-ci-release-rollback/01-local-quality-gates-clean-install.md)；
- [性能、安全与运维](../05-performance-security-operations/01-load-baseline-slow-query.md)。

评审环境应是 reader-owned 全新目录和隔离数据库。开始前记录：

```text
assessment_started_at_utc:
source_commit:
pnpm_lock_sha256:
node_raw_version:
pnpm_raw_version:
postgres_server_version_num:
api_image_digest:
react_image_digest:
vue_image_digest:
schema_migration_checksums:
evidence_class_for_each_dimension:
```

没有 Docker、PostgreSQL 18、Redis、Chromium 或托管 CI 时，保留精确阻塞，不生成模拟“通过”。

## 4. 核心理论

### 4.1 最终 workspace 是一份依赖图

```text
market/
  apps/
    api/
    react-web/
    vue-web/
  packages/
    contracts/
  migrations/
  deploy/
  ops/
  evidence/
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
```

包名固定为 `@market/api`、`@market/react-web`、`@market/vue-web`、`@market/contracts`。合并练习
项目时先 dry-run 文件清单，结构化合并 package JSON，保持一份 pnpm 12.11.2 lock。不能用目录
覆盖把另一应用 scripts 或测试抹掉。

contracts 可以共享 DTO shape、运行时 parser、金额格式和错误 code；React/Vue 组件、router、
store/context 和视图测试保持各自框架自然实现。

### 4.2 强制业务闭环

| 闭环 | 必须行为 | 关键失败 |
| --- | --- | --- |
| 身份 | 注册、登录、刷新恢复、过期、退出 | 401、旧 Cookie 失效 |
| 商品 | 分页/搜索/详情/发布/本人编辑 | 400、403、404、409 |
| 收藏 | PUT 有、DELETE 无、身份隔离 | 重试不反转、失败回滚 |
| 预约 | 自己拒绝、20 买家一胜、状态更新 | 403、409、数据库一条 |
| 取消 | pending，买家或卖家 | 重复/终态 409、越权 403 |
| 确认 | pending，仅卖家，Listing sold | 重复/终态 409、越权 403 |
| 通知 | 业务 + outbox 同事务、失败重放 | 事件不丢、副作用不重复 |
| 交付 | CI、镜像、HTTPS、健康、回滚、恢复 | 未执行不得得分 |

### 4.3 预约状态机是服务端规则

```text
Listing available
  -- reserve by non-owner -->
Reservation pending + Listing reserved

Reservation pending
  -- cancel by buyer or listing owner -->
Reservation cancelled + Listing available

Reservation pending
  -- confirm by listing owner -->
Reservation confirmed + Listing sold

Reservation cancelled/confirmed
  -- any transition -->
409 RESERVATION_STATE_CONFLICT
```

前端禁用按钮只是可用性。后端从 session 得到 actor，在事务中读取 Listing.owner_id 和
Reservation.buyer_id，再决定权限。管理员是否可强制转换必须单独契约；基础毕业不默认提供。

### 4.4 固定锁顺序避免新死锁

预约、取消、确认统一：

```text
BEGIN
  -> lock listing
  -> lock reservation（新预约时不存在则跳过）
  -> check actor / state / version
  -> mutate reservation
  -> mutate listing status + version
  -> insert outbox with stable event ID
COMMIT
```

所有路径都先 Listing 后 Reservation，减少相反锁顺序死锁。唯一索引
`WHERE status IN ('pending','confirmed')` 是并发最后防线；service 的先查后写不能替代数据库约束。

### 4.5 取消与确认不是简单 PATCH

推荐显式命令端点：

```text
POST /api/v1/reservations/:id/cancel
POST /api/v1/reservations/:id/confirm
```

它们表达领域动作，响应最新 Reservation 与 Listing version，旧状态返回 409。若网络确认丢失，
客户端先 GET 重读，不盲目重复。可增加 `Idempotency-Key`，但 key 要与 actor、操作和结果持久
绑定，不能只放进进程内 Map。

### 4.6 Outbox 的“完成”有三层

```text
业务事务提交 + outbox row
  != 已发布到 BullMQ
  != consumer 业务副作用完成
```

dispatcher 在 queue 接受后、标记 published 前崩溃会重发。consumer 必须以稳定 event ID 写
持久唯一记录，并让“幂等记录 + 站内通知”同事务。Redis jobId 只能帮助降低队列重复，不是跨
重启/保留期的最终业务防线。

事件 payload 使用整数 `priceCents` 和 UTC `occurredAt`，不含 Cookie、CSRF、密码、连接串和
完整个人资料。

### 4.7 双前端等价，不要求逐行相同

两套前端都要显示：

| 状态 | 可观察要求 |
| --- | --- |
| loading | 不误显示空数据，重复提交受控 |
| empty | 提供调整筛选/发布入口 |
| error | 稳定信息、保留输入、可重试 |
| success | 数据与服务端最新 version 一致 |
| permission | 登录或权限说明，不假装成功 |
| conflict | 保留草稿、重读服务端、显式采用/重提 |

React 可使用 Context/reducer，Vue 可使用 Pinia/composable；不因实现不同降低业务复杂度。两个
前端都要支持键盘主路径、焦点恢复、错误关联和状态朗读。

### 4.8 证据是可复现输入，不是截图集合

证据至少回答：

- 在什么 commit/lock/digest/config/migration 上运行；
- 使用什么环境和隔离目标；
- 运行了什么命令；
- 实际退出码/状态/断言是什么；
- 失败证据是否保留；
- 哪些能力未运行；
- 是否有秘密或真实数据被去除。

截图辅助理解，不能替代脚本、HTTP、SQL、trace 和命令输出。

“URL 是 loopback”只证明网络目的地，不证明 API 实际连接了哪一个数据库，也不阻止同 uid 的候选
宿主进程读取评审者的 attestation。会创建 1 个卖家和最多 20 个买家的 verifier 只允许连接 Docker
隔离 API，不允许候选 API 作为 host 同 uid 进程运行。它必须在读取 attestation 和任何 HTTP 前
要求 `ASSESSMENT_API_CONTAINER`，由受信宿主执行 `docker inspect`，证明容器正在运行、非
root 数值 UID:GID、非 privileged、只读根、`cap_drop: ALL`、无 `cap_add`/unconfined、no-new-
privileges、不是 host namespace，不接收 host device/supplementary group，且没有任何
bind/volume/volumes-from；唯一允许的 mount 是隔离 `/tmp` tmpfs。
`3000/tcp` 还必须恰好发布到 `API_URL` 的 `127.0.0.1` 端口。

`internal: true` 只删除外部默认路由，不会自动阻止容器访问宿主 bridge gateway，因而不能单独
证明 Docker daemon 或其他宿主服务不可达。写入型 verifier 只允许在一次性 Linux assessment
host 上运行：受信评审者必须先创建固定 `br-mkt-assess` internal bridge、禁用 IPv6，并在
宿主 `INPUT` 的第一条规则跳入专用链；专用链只允许 established/related 响应，随后拒绝该
bridge 发起的其他宿主本机连接。规则不存在、顺序不符、真实 gateway canary 探针没有超时、
Docker Desktop 无等价可执行
证明时必须标记 blocked。宿主也不应暴露 dockerd TCP API，但硬门禁仍是阻断该 bridge 发起的
全部 LOCAL 新连接；个人工作站不能把“我没有配置 host-gateway”当成宿主隔离证据。

随后 verifier 才读取固定路径证明；首次写请求前还必须同时满足
`ALLOW_ISOLATED_ASSESSMENT=yes`、显式 `API_URL`/`APP_ORIGIN`、
`EXPECTED_DATABASE=market_assessment_test`，以及 reader-owned 目标证明。被评应用自报的
`/readiness/evidence` 不能证明自己连接了哪个数据库，verifier 不得读取或降级到该端点。
attestation 记录当前 container ID/image ID，并与本轮 inspect 严格一致；随机 sentinel 的公开
详情 GET 还要与数据库行的 id/title/price/createdAt 严格一致。候选人声明、默认 URL、共享库、
host API、可读取证据的容器或只验证 loopback 都不能授权写入。

## 5. 文件、接口与证据清单

| 项目 | 责任 | 验收 |
| --- | --- | --- |
| `packages/contracts` | DTO/parser/error codes | 两前端与 API 对同一 fixture |
| reservation cancel/confirm | 授权 + 状态机 + transaction | 403/409/成功与 rollback |
| active reservation index | 并发最后防线 | 20 买家数据库一条 |
| outbox event | 同事务可靠事件 | rollback 不留孤儿、恢复可重放 |
| consumer effect unique key | 持久幂等 | 同 event 重放结果一条 |
| React journeys | 五条评审路径 | 浏览器/键盘/错误恢复 |
| Vue journeys | 同样五条 | 与 React 同业务结果 |
| `evidence/verify-reservation.mjs` | 外部 HTTP verifier | Docker 隔离、loopback、20 买家一胜 |
| target attestation | API/数据库身份门禁 | container/image ID、固定安全文件、PG18、固定库名/origin、短时效、随机 sentinel |
| DB assertion | 独立只读验证 | 有效预约恰好 1 |
| `evidence/README.md` | 索引与边界 | 预期/实际/未验证分开 |

## 6. 最小可运行案例

### 6.1 完整外部预约 verifier

业务验证只通过公开 HTTP 契约工作，但 API 运行身份先信任受信宿主的 `docker inspect`，数据库
身份只信任固定的 reader-owned 文件：
`/tmp/full-course-verification/batch-f/reader-owned/assessment/target-attestation.json`。
从固定 `reader-owned` 根开始逐组件 `lstat`：根与 `assessment/` 必须是当前 uid 拥有、非
symlink、`0700` 的目录，根 realpath 只允许固定 `/tmp/.../reader-owned` 或 macOS 对应的
`/private/tmp/.../reader-owned`；attestation 必须是当前 uid 拥有、非 symlink、`0600`、非空
regular file。打开时使用 `O_NOFOLLOW`，并在打开后从根重走、比较每个组件的 dev/ino。任一条件
失败立即终止，不能动态接受父目录 realpath，也不能读取被评应用的 `/readiness/evidence` 兜底。

attestation 由评审者在一次性隔离库中插入不可登录 owner 的只读 sentinel 后生成。结构严格，
多余键、非规范时间、超过 15 分钟的证明、容器或镜像变化、非随机 sentinel 或目标不匹配都会
被拒绝：

```json
{
  "database": "market_assessment_test",
  "serverMajor": 18,
  "address": "127.0.0.1",
  "apiOrigin": "http://127.0.0.1:3000",
  "containerId": "8a71c4d2e9f06b35a8c4f2197e6d0b53c8f1a9246d7e3b50a9c2f8164e7d35b1",
  "containerImageId": "sha256:4d8c7b2a1e906f35d4c8b2197a6e0f53c8d1a9246b7e3f50a8c2d9164e7b35a1",
  "networkId": "5e9d8c7b6a504132ffeeddccbbaa99887766554433221100abcdefabcdefabcd",
  "hostIsolationProfile": "linux-input-bridge-drop-v1",
  "hostProbeImage": "registry.example.test/trusted/node-probe@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "observedAt": "2026-10-11T12:00:00.000Z",
  "sentinelId": "29e45ca2-4f48-4a73-a6cf-41d609ae2f37",
  "sentinelTitle": "ASSESSMENT-SENTINEL-7af3c86bdfce488c8d34d9227c913265f0c21f14f81254f4",
  "sentinelPriceCents": 731245,
  "sentinelCreatedAt": "2026-10-11T11:59:58.421Z"
}
```

**完整文件：`evidence/verify-reservation.mjs`**

```js
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const EVIDENCE_ROOT =
  "/tmp/full-course-verification/batch-f/reader-owned";
const ATTESTATION_DIRECTORY =
  `${EVIDENCE_ROOT}/assessment`;
const ATTESTATION_PATH =
  `${ATTESTATION_DIRECTORY}/target-attestation.json`;
const EVIDENCE_ROOT_REALPATHS = new Set([
  "/tmp/full-course-verification/batch-f/reader-owned",
  "/private/tmp/full-course-verification/batch-f/reader-owned",
]);
const ATTESTATION_KEYS = [
  "database",
  "serverMajor",
  "address",
  "apiOrigin",
  "containerId",
  "containerImageId",
  "networkId",
  "hostIsolationProfile",
  "hostProbeImage",
  "observedAt",
  "sentinelId",
  "sentinelTitle",
  "sentinelPriceCents",
  "sentinelCreatedAt",
];
const EXPECTED_DATABASE_NAME = "market_assessment_test";
const ATTESTATION_MAX_AGE_MS = 15 * 60 * 1000;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const LOOPBACK_ADDRESSES = new Set(["127.0.0.1", "::1"]);
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SENTINEL_TITLE = /^ASSESSMENT-SENTINEL-[0-9a-f]{48}$/;
const CONTAINER_ID = /^[0-9a-f]{64}$/;
const CONTAINER_IMAGE_ID = /^sha256:[0-9a-f]{64}$/;

function requiredEnv(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be set explicitly`);
  }
  return value;
}

function requireExactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} keys differ: ${actual.join(",")}`);
  }
}

function boundedInteger(name, fallback, minimum, maximum) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}`);
  }
  return value;
}

function checkedApiBase(raw) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("API_URL must use http or https");
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error("assessment API must be a loopback target");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("API_URL must not contain credentials, query, or hash");
  }
  if (url.pathname !== "/api/v1/") {
    throw new Error("API_URL pathname must be /api/v1/");
  }
  return url;
}

function checkedOrigin(name, raw) {
  const url = new URL(raw);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${name} must use http or https`);
  }
  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(`${name} must be loopback`);
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== "/" && url.pathname !== "")
  ) {
    throw new Error(`${name} must be a credential-free origin`);
  }
  return url.origin;
}

function checkedCanonicalUtc(name, value) {
  if (
    typeof value !== "string" ||
    Number.isNaN(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  ) {
    throw new Error(`${name} must be canonical UTC`);
  }
  return value;
}

function checkedOwnedPath(path, type, expectedMode, expectedRealpaths, label) {
  const stats = lstatSync(path);
  if (stats.isSymbolicLink()) {
    throw new Error(`${label} must not be a symlink`);
  }
  if (
    (type === "directory" && !stats.isDirectory()) ||
    (type === "file" && !stats.isFile())
  ) {
    throw new Error(`${label} must be a ${type}`);
  }
  if (stats.uid !== process.getuid()) {
    throw new Error(`${label} must be owned by the current uid`);
  }
  const actualMode = stats.mode & 0o7777;
  if (actualMode !== expectedMode) {
    throw new Error(
      `${label} mode must be ${expectedMode.toString(8)}; got ` +
      actualMode.toString(8),
    );
  }
  const actualRealpath = realpathSync(path);
  if (!expectedRealpaths.has(actualRealpath)) {
    throw new Error(`${label} realpath must equal its fixed path`);
  }
  return { path, stats, realpath: actualRealpath, label };
}

function assertPathIdentity(component) {
  const current = lstatSync(component.path);
  if (
    current.isSymbolicLink() ||
    current.dev !== component.stats.dev ||
    current.ino !== component.stats.ino
  ) {
    throw new Error(`${component.label} changed while opening attestation`);
  }
}

function readTargetAttestation() {
  const root = checkedOwnedPath(
    EVIDENCE_ROOT,
    "directory",
    0o700,
    EVIDENCE_ROOT_REALPATHS,
    "reader-owned root",
  );
  const directory = checkedOwnedPath(
    ATTESTATION_DIRECTORY,
    "directory",
    0o700,
    new Set([join(root.realpath, "assessment")]),
    "assessment directory",
  );
  const before = checkedOwnedPath(
    ATTESTATION_PATH,
    "file",
    0o600,
    new Set([join(directory.realpath, "target-attestation.json")]),
    "target attestation",
  );
  let descriptor;
  try {
    descriptor = openSync(
      ATTESTATION_PATH,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    const opened = fstatSync(descriptor);
    if (
      !opened.isFile() ||
      opened.uid !== process.getuid() ||
      (opened.mode & 0o7777) !== 0o600 ||
      opened.dev !== before.stats.dev ||
      opened.ino !== before.stats.ino
    ) {
      throw new Error("target attestation changed while opening");
    }
    for (const component of [root, directory, before]) {
      assertPathIdentity(component);
    }
    const text = readFileSync(descriptor, "utf8");
    if (text.length === 0) {
      throw new Error("target attestation must not be empty");
    }
    return JSON.parse(text);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function checkedAssessmentContainer(context, requestedId) {
  if (!CONTAINER_ID.test(requestedId)) {
    throw new Error("ASSESSMENT_API_CONTAINER must be a full container ID");
  }
  let output;
  try {
    output = execFileSync(
      "docker",
      ["inspect", "--type=container", requestedId],
      {
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        timeout: 5000,
      },
    );
  } catch (error) {
    throw new Error("docker inspect failed for ASSESSMENT_API_CONTAINER", {
      cause: error,
    });
  }

  let values;
  try {
    values = JSON.parse(output);
  } catch (error) {
    throw new Error("docker inspect returned invalid JSON", { cause: error });
  }
  if (!Array.isArray(values) || values.length !== 1) {
    throw new Error("docker inspect must return exactly one container");
  }
  const value = values[0];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("docker inspect container must be an object");
  }
  if (!CONTAINER_ID.test(value.Id) || value.Id !== requestedId) {
    throw new Error("docker inspect container ID does not match");
  }
  if (!CONTAINER_IMAGE_ID.test(value.Image)) {
    throw new Error("docker inspect image ID must be a sha256 digest");
  }
  if (value.State?.Running !== true) {
    throw new Error("assessment API container must be running");
  }

  const containerUser = value.Config?.User;
  if (
    typeof containerUser !== "string" ||
    !/^[1-9][0-9]*:[1-9][0-9]*$/.test(containerUser.trim())
  ) {
    throw new Error(
      "assessment API container must use an explicit non-zero numeric UID:GID",
    );
  }
  if (value.HostConfig?.Privileged !== false) {
    throw new Error("assessment API container must not be privileged");
  }
  if (String(value.HostConfig?.NetworkMode).toLowerCase() === "host") {
    throw new Error("assessment API container must not use host network");
  }
  if (String(value.HostConfig?.PidMode).toLowerCase() === "host") {
    throw new Error("assessment API container must not use host PID mode");
  }
  if (
    ["host", "container"].includes(
      String(value.HostConfig?.IpcMode).split(":", 1)[0].toLowerCase(),
    ) ||
    String(value.HostConfig?.UTSMode).toLowerCase() === "host" ||
    String(value.HostConfig?.CgroupnsMode).toLowerCase() === "host" ||
    String(value.HostConfig?.UsernsMode).toLowerCase() === "host"
  ) {
    throw new Error("assessment API container must isolate host namespaces");
  }
  if (value.HostConfig?.ReadonlyRootfs !== true) {
    throw new Error("assessment API container root filesystem must be read-only");
  }
  if (
    !Array.isArray(value.HostConfig?.CapDrop) ||
    !value.HostConfig.CapDrop.some(
      (capability) => String(capability).toUpperCase() === "ALL",
    )
  ) {
    throw new Error("assessment API container must drop all capabilities");
  }
  if (
    (Array.isArray(value.HostConfig?.CapAdd) &&
      value.HostConfig.CapAdd.length > 0) ||
    value.HostConfig?.SecurityOpt?.some((option) =>
      /(?:seccomp|apparmor)=unconfined/i.test(String(option))
    )
  ) {
    throw new Error(
      "assessment API container must not add capabilities or disable confinement",
    );
  }
  if (
    !Array.isArray(value.HostConfig?.SecurityOpt) ||
    !value.HostConfig.SecurityOpt.some((option) =>
      ["no-new-privileges", "no-new-privileges:true"].includes(
        String(option).toLowerCase(),
      )
    )
  ) {
    throw new Error(
      "assessment API container must enable no-new-privileges",
    );
  }
  if (
    (Array.isArray(value.HostConfig?.Binds) &&
      value.HostConfig.Binds.length > 0) ||
    (Array.isArray(value.HostConfig?.VolumesFrom) &&
      value.HostConfig.VolumesFrom.length > 0)
  ) {
    throw new Error(
      "assessment API container must not use bind mounts or volumes-from",
    );
  }
  if (
    (Array.isArray(value.HostConfig?.Devices) &&
      value.HostConfig.Devices.length > 0) ||
    (Array.isArray(value.HostConfig?.DeviceCgroupRules) &&
      value.HostConfig.DeviceCgroupRules.length > 0) ||
    (Array.isArray(value.HostConfig?.DeviceRequests) &&
      value.HostConfig.DeviceRequests.length > 0) ||
    (Array.isArray(value.HostConfig?.GroupAdd) &&
      value.HostConfig.GroupAdd.length > 0)
  ) {
    throw new Error(
      "assessment API container must not receive host devices or supplementary groups",
    );
  }

  if (!Array.isArray(value.Mounts)) {
    throw new Error("docker inspect Mounts must be an array");
  }
  for (const mount of value.Mounts) {
    if (
      String(mount?.Type).toLowerCase() !== "tmpfs" ||
      mount?.Destination !== "/tmp"
    ) {
      throw new Error(
        "assessment API container may mount only an isolated /tmp tmpfs",
      );
    }
  }

  if (
    value.Config?.Env?.some((entry) =>
      /^(?:DOCKER_HOST|DOCKER_CONTEXT)=/.test(String(entry))
    ) ||
    value.HostConfig?.ExtraHosts?.some((entry) =>
      /host-gateway/i.test(String(entry))
    )
  ) {
    throw new Error(
      "assessment API container must not receive Docker endpoints or host-gateway",
    );
  }

  let contextValues;
  try {
    contextValues = JSON.parse(execFileSync(
      "docker",
      ["context", "inspect"],
      { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 5000 },
    ));
  } catch (error) {
    throw new Error("docker context inspect failed", { cause: error });
  }
  if (!Array.isArray(contextValues) || contextValues.length !== 1) {
    throw new Error("docker context inspect must return exactly one context");
  }
  const daemonEndpoint = contextValues?.[0]?.Endpoints?.docker?.Host;
  if (
    typeof daemonEndpoint !== "string" ||
    !/^unix:\/\/\/.+/.test(daemonEndpoint)
  ) {
    throw new Error(
      "assessment host Docker context must use a Unix socket, not TCP",
    );
  }

  const attachedNetworks = Object.values(
    value.NetworkSettings?.Networks ?? {},
  );
  if (
    attachedNetworks.length !== 1 ||
    !/^[0-9a-f]{64}$/.test(attachedNetworks[0]?.NetworkID ?? "")
  ) {
    throw new Error(
      "assessment API must attach to exactly one identified network",
    );
  }
  let networkValues;
  try {
    networkValues = JSON.parse(execFileSync(
      "docker",
      ["network", "inspect", attachedNetworks[0].NetworkID],
      { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 5000 },
    ));
  } catch (error) {
    throw new Error("docker network inspect failed", { cause: error });
  }
  if (
    networkValues?.length !== 1 ||
    networkValues[0]?.Id !== attachedNetworks[0].NetworkID ||
    networkValues[0]?.Internal !== true ||
    networkValues[0]?.Driver !== "bridge" ||
    networkValues[0]?.EnableIPv6 !== false ||
    networkValues[0]?.Options?.["com.docker.network.bridge.name"] !==
      "br-mkt-assess"
  ) {
    throw new Error(
      "assessment API network must be the fixed IPv4-only internal bridge",
    );
  }

  if (context.base.hostname !== "127.0.0.1" || context.base.port === "") {
    throw new Error("API_URL must use 127.0.0.1 with an explicit host port");
  }
  const bindings = value.NetworkSettings?.Ports?.["3000/tcp"];
  if (
    !Array.isArray(bindings) ||
    bindings.length !== 1 ||
    bindings[0]?.HostIp !== "127.0.0.1" ||
    bindings[0]?.HostPort !== context.base.port
  ) {
    throw new Error(
      "container 3000/tcp must map exactly to the API_URL loopback port",
    );
  }
  return {
    containerId: value.Id,
    containerImageId: value.Image,
    networkId: attachedNetworks[0].NetworkID,
  };
}

function checkedTargetAttestation(value, context, container) {
  requireExactKeys(value, ATTESTATION_KEYS, "target attestation");
  if (value.database !== context.expectedDatabase) {
    throw new Error("target attestation database does not match");
  }
  if (value.serverMajor !== 18) {
    throw new Error("target attestation must report PostgreSQL major 18");
  }
  if (!LOOPBACK_ADDRESSES.has(value.address)) {
    throw new Error("target attestation database address must be loopback");
  }
  const apiOrigin = checkedOrigin("target attestation apiOrigin", value.apiOrigin);
  if (apiOrigin !== context.base.origin) {
    throw new Error("target attestation API origin does not match API_URL");
  }
  if (
    value.containerId !== container.containerId ||
    value.containerImageId !== container.containerImageId ||
    value.networkId !== container.networkId
  ) {
    throw new Error(
      "target attestation container or network identity does not match inspect",
    );
  }
  if (value.hostIsolationProfile !== "linux-input-bridge-drop-v1") {
    throw new Error("target attestation lacks the trusted host firewall profile");
  }
  if (
    typeof value.hostProbeImage !== "string" ||
    !/@sha256:[0-9a-f]{64}$/.test(value.hostProbeImage)
  ) {
    throw new Error("target attestation lacks an immutable host probe image");
  }
  checkedCanonicalUtc("target attestation observedAt", value.observedAt);
  const age = Date.now() - Date.parse(value.observedAt);
  if (age < -30_000 || age > ATTESTATION_MAX_AGE_MS) {
    throw new Error("target attestation is outside the allowed time window");
  }
  if (!UUID_V4.test(value.sentinelId)) {
    throw new Error("target attestation sentinelId must be a random UUID v4");
  }
  if (!SENTINEL_TITLE.test(value.sentinelTitle)) {
    throw new Error("target attestation sentinelTitle must contain a random nonce");
  }
  if (
    !Number.isSafeInteger(value.sentinelPriceCents) ||
    value.sentinelPriceCents < 0 ||
    value.sentinelPriceCents > 100_000_000
  ) {
    throw new Error("target attestation sentinelPriceCents is invalid");
  }
  checkedCanonicalUtc(
    "target attestation sentinelCreatedAt",
    value.sentinelCreatedAt,
  );
  const sentinelAge = Date.now() - Date.parse(value.sentinelCreatedAt);
  if (sentinelAge < -30_000 || sentinelAge > ATTESTATION_MAX_AGE_MS) {
    throw new Error("target attestation sentinel is outside the allowed time window");
  }
  return {
    database: value.database,
    serverMajor: value.serverMajor,
    address: value.address,
    apiOrigin,
    containerId: value.containerId,
    containerImageId: value.containerImageId,
    networkId: value.networkId,
    hostIsolationProfile: value.hostIsolationProfile,
    hostProbeImage: value.hostProbeImage,
    observedAt: value.observedAt,
    sentinelId: value.sentinelId,
    sentinelTitle: value.sentinelTitle,
    sentinelPriceCents: value.sentinelPriceCents,
    sentinelCreatedAt: value.sentinelCreatedAt,
  };
}

function cookieFrom(headers) {
  const values = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [];
  const line = values[0] ?? headers.get("set-cookie");
  return line?.split(";", 1)[0] ?? null;
}

async function jsonResponse(response) {
  const text = await response.text();
  if (!text) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(
      `expected JSON for status ${response.status}; got ${contentType}`,
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`invalid JSON for status ${response.status}`);
  }
}

async function request(context, path, options = {}) {
  const method = options.method ?? "GET";
  const headers = { Accept: "application/json" };
  if (!["GET", "HEAD"].includes(method)) headers.Origin = context.origin;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.bearerToken) {
    headers.Authorization = `Bearer ${options.bearerToken}`;
  }
  if (options.session) {
    headers.Cookie = options.session.cookie;
    headers["X-CSRF-Token"] = options.session.csrfToken;
  }
  const response = await fetch(new URL(path, context.base), {
    method,
    headers,
    body: options.body === undefined
      ? undefined
      : JSON.stringify(options.body),
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });
  return {
    status: response.status,
    body: await jsonResponse(response),
    cookie: cookieFrom(response.headers),
    requestId: response.headers.get("x-request-id"),
  };
}

function targetAttestation(context, container) {
  try {
    return {
      source: ATTESTATION_PATH,
      value: checkedTargetAttestation(
        readTargetAttestation(),
        context,
        container,
      ),
    };
  } catch (error) {
    throw new Error(
      `invalid reader-owned target attestation at ${ATTESTATION_PATH}`,
      { cause: error },
    );
  }
}

async function verifySentinel(context, attestation) {
  const response = await request(
    context,
    `listings/${encodeURIComponent(attestation.sentinelId)}`,
  );
  if (response.status !== 200) {
    throw new Error(`sentinel lookup returned ${response.status}`);
  }
  const actual = {
    id: response.body?.id,
    title: response.body?.title,
    priceCents: response.body?.priceCents,
    createdAt: response.body?.createdAt,
  };
  const expected = {
    id: attestation.sentinelId,
    title: attestation.sentinelTitle,
    priceCents: attestation.sentinelPriceCents,
    createdAt: attestation.sentinelCreatedAt,
  };
  assert.deepEqual(
    actual,
    expected,
    "HTTP sentinel does not match the independently verified database row",
  );
  return actual;
}

async function account(context, label, runId) {
  const credentials = {
    email: `${label}-${runId}-${randomUUID()}@example.test`,
    password: "assessment-only-password-24",
  };
  const registration = await request(context, "auth/register", {
    method: "POST",
    body: credentials,
  });
  assert.equal(registration.status, 202);
  assert.deepEqual(registration.body, { accepted: true });

  const login = await request(context, "auth/login", {
    method: "POST",
    body: credentials,
  });
  assert.equal(login.status, 200);
  assert.ok(login.cookie);
  assert.equal(typeof login.body?.csrfToken, "string");
  assert.equal(typeof login.body?.user?.id, "string");
  return {
    cookie: login.cookie,
    csrfToken: login.body.csrfToken,
    id: login.body.user.id,
  };
}

export function assertReservationOutcome({
  created,
  responses,
  after,
  buyerCount,
}) {
  assert.equal(Number.isSafeInteger(created.body?.version), true);
  assert.ok(created.body.version >= 1);
  const statuses = responses.map((response) => response.status);
  assert.equal(statuses.filter((status) => status === 201).length, 1);
  assert.equal(
    statuses.filter((status) => status === 409).length,
    buyerCount - 1,
  );
  for (const response of responses.filter((item) => item.status === 409)) {
    assert.equal(response.body?.code, "RESERVATION_CONFLICT");
    const requestId = response.requestId ?? response.body?.requestId;
    assert.equal(typeof requestId, "string");
    assert.ok(requestId.trim().length > 0);
  }
  assert.equal(Number.isSafeInteger(after.body?.version), true);
  assert.equal(after.body?.version, created.body.version + 1);
  return statuses;
}

export async function verifyReservation() {
  if (requiredEnv("ALLOW_ISOLATED_ASSESSMENT") !== "yes") {
    throw new Error("ALLOW_ISOLATED_ASSESSMENT must equal yes");
  }
  const expectedDatabase = requiredEnv("EXPECTED_DATABASE");
  if (expectedDatabase !== EXPECTED_DATABASE_NAME) {
    throw new Error(`EXPECTED_DATABASE must equal ${EXPECTED_DATABASE_NAME}`);
  }
  const context = {
    base: checkedApiBase(requiredEnv("API_URL")),
    origin: checkedOrigin("APP_ORIGIN", requiredEnv("APP_ORIGIN")),
    expectedDatabase,
  };
  const buyerCount = boundedInteger("BUYERS", 20, 2, 20);
  const containerId = requiredEnv("ASSESSMENT_API_CONTAINER");
  const inspectedContainer = checkedAssessmentContainer(context, containerId);
  const attestation = targetAttestation(context, inspectedContainer);
  const currentContainer = checkedAssessmentContainer(context, containerId);
  assert.deepEqual(
    currentContainer,
    inspectedContainer,
    "assessment API container changed after attestation read",
  );
  const sentinel = await verifySentinel(context, attestation.value);

  // No mutation may move above the container, file, and sentinel binding.
  const runId = randomUUID();
  const seller = await account(context, "seller", runId);
  const buyers = [];
  for (let index = 0; index < buyerCount; index += 1) {
    buyers.push(await account(context, `buyer-${index + 1}`, runId));
  }

  const created = await request(context, "listings", {
    method: "POST",
    body: {
      title: `ASSESSMENT-${runId}`,
      description: "reader-owned isolated assessment fixture",
      priceCents: 12345,
    },
    session: seller,
  });
  assert.equal(created.status, 201);
  assert.equal(created.body?.priceCents, 12345);
  assert.equal(created.body?.ownerId, seller.id);
  assert.equal(created.body?.status, "available");
  const listingId = created.body.id;

  const selfReservation = await request(
    context,
    `listings/${listingId}/reservations`,
    { method: "POST", session: seller },
  );
  assert.equal(selfReservation.status, 403);

  const responses = await Promise.all(
    buyers.map((buyer) => request(
      context,
      `listings/${listingId}/reservations`,
      { method: "POST", session: buyer },
    )),
  );

  const after = await request(context, `listings/${listingId}`);
  assert.equal(after.status, 200);
  assert.equal(after.body?.status, "reserved");
  assert.equal(after.body?.priceCents, 12345);
  const statuses = assertReservationOutcome({
    created,
    responses,
    after,
    buyerCount,
  });

  return {
    label: "LOCAL_ISOLATED_ASSESSMENT_FIXTURE",
    verifiedAt: new Date().toISOString(),
    runId,
    listingId,
    buyerCount,
    target: {
      ...attestation.value,
      appOrigin: context.origin,
      attestationSource: attestation.source,
      sentinelVerified: sentinel,
    },
    statusCounts: {
      created: statuses.filter((status) => status === 201).length,
      conflict: statuses.filter((status) => status === 409).length,
    },
    selfReservationStatus: selfReservation.status,
    finalListing: {
      status: after.body.status,
      version: after.body.version,
      priceCents: after.body.priceCents,
    },
    cleanup: {
      strategy: "discard the reader-owned market_assessment_test database",
      note: "do not truncate or drop a shared database",
    },
  };
}

if (
  process.argv[1] &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
) {
  console.log(JSON.stringify(await verifyReservation(), null, 2));
}
```

**完整文件：`evidence/verify-reservation.test.mjs`**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { assertReservationOutcome } from "./verify-reservation.mjs";

function validOutcome() {
  return {
    created: { body: { version: 4 } },
    responses: [
      { status: 201, body: {}, requestId: "winner-request" },
      {
        status: 409,
        body: { code: "RESERVATION_CONFLICT" },
        requestId: "loser-request",
      },
    ],
    after: { body: { version: 5 } },
    buyerCount: 2,
  };
}

test("accepts one winner and exact reservation conflicts", () => {
  assert.deepEqual(
    assertReservationOutcome(validOutcome()),
    [201, 409],
  );
});

test("rejects a different 409 code", () => {
  const input = validOutcome();
  input.responses[1].body.code = "VERSION_CONFLICT";
  assert.throws(() => assertReservationOutcome(input));
});

test("rejects an empty conflict request id", () => {
  const input = validOutcome();
  input.responses[1].requestId = "";
  assert.throws(() => assertReservationOutcome(input));
});

test("rejects unsafe or nonincrementing versions", () => {
  const unsafe = validOutcome();
  unsafe.created.body.version = Number.MAX_SAFE_INTEGER + 1;
  assert.throws(() => assertReservationOutcome(unsafe));

  const stale = validOutcome();
  stale.after.body.version = stale.created.body.version;
  assert.throws(() => assertReservationOutcome(stale));
});
```

attestation 不能手填。以下命令必须在受信宿主运行，并从 `docker inspect` 读取当前完整
container ID/image ID；候选 API 容器不得使用任何 bind/volume/volumes-from，因而也不能通过
`/var/run` 父目录接触 Docker socket 或证据根。两个固定 service
还要连接同一个 reader-owned loopback PG18 实例中的一次性 `market_assessment_test`：
`market_assessment_admin_local` 只能管理该隔离库，`market_assessment_reader_local` 只有
SELECT。admin 事务插入随机 UUID/192-bit nonce sentinel；reader 独立复核目标和该行；Node
最后以 `0600` 临时文件 + 同目录 rename 原子发布 attestation：

该命令不是防火墙安装器。受信管理员必须先在**一次性 Linux host** 创建名为
`br-mkt-assess` 的 IPv4-only internal bridge，并配置以下顺序的规则：

```bash
docker network create \
  --driver bridge \
  --internal \
  --subnet 172.31.240.0/24 \
  --opt com.docker.network.bridge.name=br-mkt-assess \
  market-assessment-internal
```

assessment Compose override 必须让 `db`、`migrate`、`api` 只连接这个预创建 external network；
不要让候选提交拥有网络或防火墙定义：

```yaml
services:
  db:
    networks: [assessment_internal]
  migrate:
    networks: [assessment_internal]
  api:
    networks: [assessment_internal]

networks:
  assessment_internal:
    external: true
    name: market-assessment-internal
```

```text
INPUT 第一条：
-A INPUT -i br-mkt-assess -j MARKET-ASSESSMENT-INPUT

MARKET-ASSESSMENT-INPUT 仅两条：
-A MARKET-ASSESSMENT-INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
-A MARKET-ASSESSMENT-INPUT -j DROP
```

必须在启动 API/migration 容器前完成，且 assessment 网络不得运行 Docker socket proxy。
下面只做只读 `iptables -S` 核验；它需要受控的无交互 sudo 权限。不要在个人工作站临时改防火墙
来追求通过；没有专用 host 和规则时直接记录 blocked。

```bash
set -euo pipefail
umask 077
[[ "$(uname -s)" == "Linux" ]] || {
  echo "write assessment requires a disposable Linux host" >&2
  exit 2
}
: "${API_ORIGIN:?set API_ORIGIN, for example http://127.0.0.1:3000}"
: "${ASSESSMENT_API_CONTAINER:?set the full API container ID}"
: "${TRUSTED_PROBE_IMAGE:?set a preloaded audited image@sha256 digest}"
[[ "$TRUSTED_PROBE_IMAGE" =~ @sha256:[0-9a-f]{64}$ ]] || {
  echo "TRUSTED_PROBE_IMAGE must use an immutable repository digest" >&2
  exit 2
}
ATTESTATION_PATH=/tmp/full-course-verification/batch-f/reader-owned/assessment/target-attestation.json
CONTAINER_PROOF=$(
  docker inspect --type=container "$ASSESSMENT_API_CONTAINER"
)
DOCKER_CONTEXT_PROOF=$(docker context inspect)
CONTAINER_NETWORK_ID=$(
  CONTAINER_PROOF="$CONTAINER_PROOF" node -e '
    const values = JSON.parse(process.env.CONTAINER_PROOF);
    const networks = Object.values(values[0]?.NetworkSettings?.Networks ?? {});
    if (networks.length !== 1 || !/^[0-9a-f]{64}$/.test(networks[0]?.NetworkID ?? "")) {
      throw new Error("expected one identified assessment network");
    }
    process.stdout.write(networks[0].NetworkID);
  '
)
NETWORK_PROOF=$(docker network inspect "$CONTAINER_NETWORK_ID")

NETWORK_PROOF="$NETWORK_PROOF" node -e '
  const values = JSON.parse(process.env.NETWORK_PROOF);
  const network = values[0];
  if (
    values.length !== 1 ||
    network?.Internal !== true ||
    network?.Driver !== "bridge" ||
    network?.EnableIPv6 !== false ||
    network?.Options?.["com.docker.network.bridge.name"] !== "br-mkt-assess"
  ) {
    throw new Error("expected fixed IPv4-only internal assessment bridge");
  }
'

INPUT_RULES=$(sudo -n iptables -S INPUT)
ASSESSMENT_RULES=$(sudo -n iptables -S MARKET-ASSESSMENT-INPUT)
INPUT_RULES="$INPUT_RULES" \
ASSESSMENT_RULES="$ASSESSMENT_RULES" node <<'NODE'
function appendRules(text) {
  return text.split("\n").filter((line) => line.startsWith("-A "));
}
const input = appendRules(process.env.INPUT_RULES);
const assessment = appendRules(process.env.ASSESSMENT_RULES);
if (
  input[0] !==
    "-A INPUT -i br-mkt-assess -j MARKET-ASSESSMENT-INPUT"
) {
  throw new Error("assessment firewall jump must be first in INPUT");
}
if (
  assessment.length !== 2 ||
  ![
    "-A MARKET-ASSESSMENT-INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT",
    "-A MARKET-ASSESSMENT-INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT",
  ].includes(assessment[0]) ||
  assessment[1] !== "-A MARKET-ASSESSMENT-INPUT -j DROP"
) {
  throw new Error("assessment firewall chain does not match the required profile");
}
NODE

NETWORK_GATEWAY=$(
  NETWORK_PROOF="$NETWORK_PROOF" node -e '
    const values = JSON.parse(process.env.NETWORK_PROOF);
    const gateway = values[0]?.IPAM?.Config?.[0]?.Gateway;
    if (typeof gateway !== "string" || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(gateway)) {
      throw new Error("assessment network must expose one IPv4 gateway");
    }
    process.stdout.write(gateway);
  '
)
PROBE_TMP=$(mktemp -d)
PROBE_PORT_FILE=$PROBE_TMP/port
node -e '
  const net = require("node:net");
  const [host, portFile] = process.argv.slice(1);
  const server = net.createServer((socket) => socket.end());
  server.listen(0, host, () => {
    require("node:fs").writeFileSync(
      portFile,
      String(server.address().port),
    );
  });
' "$NETWORK_GATEWAY" "$PROBE_PORT_FILE" &
PROBE_SERVER_PID=$!
cleanup_gateway_probe() {
  kill "$PROBE_SERVER_PID" 2>/dev/null || true
  wait "$PROBE_SERVER_PID" 2>/dev/null || true
  rm -rf "$PROBE_TMP"
}
trap cleanup_gateway_probe EXIT
for _ in $(seq 1 100); do
  [[ -s "$PROBE_PORT_FILE" ]] && break
  kill -0 "$PROBE_SERVER_PID" 2>/dev/null || {
    echo "host gateway canary failed to start" >&2
    exit 3
  }
  sleep 0.05
done
[[ -s "$PROBE_PORT_FILE" ]] || {
  echo "host gateway canary did not publish a port" >&2
  exit 3
}
PROBE_PORT=$(cat "$PROBE_PORT_FILE")

set +e
docker run --rm --pull=never \
  --network "$CONTAINER_NETWORK_ID" \
  --read-only \
  --user 65534:65534 \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --pids-limit 64 \
  --memory 128m \
  --env NODE_OPTIONS= \
  "$TRUSTED_PROBE_IMAGE" \
  node - "$NETWORK_GATEWAY" "$PROBE_PORT" <<'NODE'
const net = require("node:net");
const [host, rawPort] = process.argv.slice(2);
const socket = net.createConnection({
  host,
  port: Number(rawPort),
});
let finished = false;
function finish(code) {
  if (finished) return;
  finished = true;
  socket.destroy();
  process.exit(code);
}
socket.setTimeout(1500);
socket.once("connect", () => finish(90));
socket.once("timeout", () => finish(42));
socket.once("error", () => finish(43));
NODE
PROBE_STATUS=$?
set -e
cleanup_gateway_probe
trap - EXIT
[[ "$PROBE_STATUS" -eq 42 ]] || {
  echo "assessment bridge reached or could not test the host gateway" >&2
  exit 4
}
HOST_ISOLATION_PROFILE=linux-input-bridge-drop-v1

read -r SENTINEL_ID SENTINEL_OWNER_ID SENTINEL_NONCE SENTINEL_PRICE <<EOF
$(node -e '
  const { randomBytes, randomInt, randomUUID } = require("node:crypto");
  console.log(
    randomUUID(),
    randomUUID(),
    randomBytes(24).toString("hex"),
    randomInt(100, 100_000_001),
  );
')
EOF
SENTINEL_TITLE="ASSESSMENT-SENTINEL-$SENTINEL_NONCE"
SENTINEL_EMAIL="assessment-sentinel-$SENTINEL_NONCE@example.test"

PGSERVICE=market_assessment_admin_local \
psql "service=market_assessment_admin_local" -X -v ON_ERROR_STOP=1 \
  -v sentinel_id="$SENTINEL_ID" \
  -v owner_id="$SENTINEL_OWNER_ID" \
  -v sentinel_title="$SENTINEL_TITLE" \
  -v sentinel_email="$SENTINEL_EMAIL" \
  -v sentinel_price="$SENTINEL_PRICE" <<'SQL'
BEGIN;
SELECT (
  current_database() = 'market_assessment_test'
  AND current_setting('server_version_num')::integer >= 180000
  AND current_setting('server_version_num')::integer < 190000
  AND COALESCE(inet_server_addr()::text, '') IN ('127.0.0.1', '::1')
) AS target_ok
\gset
\if :target_ok
\else
  \echo 'refusing admin target: expected loopback PG18 market_assessment_test'
  \quit 3
\endif
INSERT INTO users(id, email, password_hash, role)
VALUES (
  :'owner_id'::uuid,
  :'sentinel_email',
  'assessment-sentinel-has-no-login-credential',
  'user'
);
INSERT INTO listings(
  id, title, description, price_cents, owner_id, status, version
)
VALUES (
  :'sentinel_id'::uuid,
  :'sentinel_title',
  'reader-owned API/database binding sentinel',
  :'sentinel_price'::integer,
  :'owner_id'::uuid,
  'sold',
  1
);
COMMIT;
SQL

DB_PROOF=$(
  PGSERVICE=market_assessment_reader_local \
  psql "service=market_assessment_reader_local" -X -qAt \
    -v ON_ERROR_STOP=1 -v sentinel_id="$SENTINEL_ID" <<'SQL'
SELECT (
  current_database() = 'market_assessment_test'
  AND current_setting('server_version_num')::integer >= 180000
  AND current_setting('server_version_num')::integer < 190000
  AND COALESCE(inet_server_addr()::text, '') IN ('127.0.0.1', '::1')
) AS target_ok
\gset
\if :target_ok
\else
  \echo 'refusing reader target: expected loopback PG18 market_assessment_test'
  \quit 4
\endif
SELECT json_build_object(
  'database', current_database(),
  'serverMajor', current_setting('server_version_num')::integer / 10000,
  'address', inet_server_addr()::text,
  'sentinelId', id::text,
  'sentinelTitle', title,
  'sentinelPriceCents', price_cents,
  'sentinelCreatedAt',
    to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
)::text
FROM listings
WHERE id = :'sentinel_id'::uuid;
SQL
)
test -n "$DB_PROOF"

DB_PROOF="$DB_PROOF" API_ORIGIN="$API_ORIGIN" \
ASSESSMENT_API_CONTAINER="$ASSESSMENT_API_CONTAINER" \
CONTAINER_PROOF="$CONTAINER_PROOF" \
DOCKER_CONTEXT_PROOF="$DOCKER_CONTEXT_PROOF" \
NETWORK_PROOF="$NETWORK_PROOF" \
HOST_ISOLATION_PROFILE="$HOST_ISOLATION_PROFILE" \
TRUSTED_PROBE_IMAGE="$TRUSTED_PROBE_IMAGE" \
ATTESTATION_PATH="$ATTESTATION_PATH" node <<'NODE'
const {
  chmodSync,
  lstatSync,
  mkdirSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join } = require("node:path");
const { randomUUID } = require("node:crypto");

const target = process.env.ATTESTATION_PATH;
const directory = dirname(target);
const evidenceRoot = dirname(directory);
const allowedRootRealpaths = new Set([
  "/tmp/full-course-verification/batch-f/reader-owned",
  "/private/tmp/full-course-verification/batch-f/reader-owned",
]);

function checkedDirectory(path, allowedRealpaths, label) {
  const stats = lstatSync(path);
  const resolved = realpathSync(path);
  if (
    stats.isSymbolicLink() ||
    !stats.isDirectory() ||
    stats.uid !== process.getuid() ||
    (stats.mode & 0o7777) !== 0o700 ||
    !allowedRealpaths.has(resolved)
  ) {
    throw new Error(`${label} is not a secure fixed directory`);
  }
  return resolved;
}

mkdirSync(evidenceRoot, { recursive: true, mode: 0o700 });
const rootRealpath = checkedDirectory(
  evidenceRoot,
  allowedRootRealpaths,
  "reader-owned root",
);
mkdirSync(directory, { mode: 0o700 });
checkedDirectory(
  directory,
  new Set([join(rootRealpath, "assessment")]),
  "assessment directory",
);

const inspectedValues = JSON.parse(process.env.CONTAINER_PROOF);
if (!Array.isArray(inspectedValues) || inspectedValues.length !== 1) {
  throw new Error("docker inspect must return exactly one container");
}
const inspected = inspectedValues[0];
if (
  !/^[0-9a-f]{64}$/.test(inspected?.Id) ||
  inspected.Id !== process.env.ASSESSMENT_API_CONTAINER ||
  !/^sha256:[0-9a-f]{64}$/.test(inspected?.Image) ||
  !/^[1-9][0-9]*:[1-9][0-9]*$/.test(inspected?.Config?.User ?? "") ||
  inspected?.State?.Running !== true ||
  inspected?.HostConfig?.Privileged !== false ||
  inspected?.HostConfig?.ReadonlyRootfs !== true ||
  String(inspected?.HostConfig?.NetworkMode).toLowerCase() === "host" ||
  String(inspected?.HostConfig?.PidMode).toLowerCase() === "host" ||
  !inspected?.HostConfig?.CapDrop?.some(
    value => String(value).toUpperCase() === "ALL",
  ) ||
  (inspected?.HostConfig?.CapAdd?.length ?? 0) !== 0 ||
  inspected?.HostConfig?.SecurityOpt?.some(
    value => /(?:seccomp|apparmor)=unconfined/i.test(String(value)),
  ) ||
  !inspected?.HostConfig?.SecurityOpt?.some(
    value => ["no-new-privileges", "no-new-privileges:true"].includes(
      String(value).toLowerCase(),
    ),
  ) ||
  (inspected?.HostConfig?.Binds?.length ?? 0) !== 0 ||
  (inspected?.HostConfig?.VolumesFrom?.length ?? 0) !== 0 ||
  (inspected?.HostConfig?.Devices?.length ?? 0) !== 0 ||
  (inspected?.HostConfig?.DeviceCgroupRules?.length ?? 0) !== 0 ||
  (inspected?.HostConfig?.DeviceRequests?.length ?? 0) !== 0 ||
  (inspected?.HostConfig?.GroupAdd?.length ?? 0) !== 0 ||
  ["host", "container"].includes(
    String(inspected?.HostConfig?.IpcMode).split(":", 1)[0].toLowerCase(),
  ) ||
  String(inspected?.HostConfig?.UTSMode).toLowerCase() === "host" ||
  String(inspected?.HostConfig?.CgroupnsMode).toLowerCase() === "host" ||
  String(inspected?.HostConfig?.UsernsMode).toLowerCase() === "host" ||
  !Array.isArray(inspected?.Mounts) ||
  !inspected.Mounts.every(
    mount =>
      String(mount?.Type).toLowerCase() === "tmpfs" &&
      mount?.Destination === "/tmp",
  ) ||
  inspected?.Config?.Env?.some(
    value => /^(?:DOCKER_HOST|DOCKER_CONTEXT)=/.test(String(value)),
  ) ||
  inspected?.HostConfig?.ExtraHosts?.some(
    value => /host-gateway/i.test(String(value)),
  )
) {
  throw new Error("docker inspect returned an unsafe assessment container");
}
const contextValues = JSON.parse(process.env.DOCKER_CONTEXT_PROOF);
if (!Array.isArray(contextValues) || contextValues.length !== 1) {
  throw new Error("docker context inspect must return exactly one context");
}
const daemonEndpoint = contextValues?.[0]?.Endpoints?.docker?.Host;
if (
  typeof daemonEndpoint !== "string" ||
  !/^unix:\/\/\/.+/.test(daemonEndpoint)
) {
  throw new Error("assessment host Docker context must use a Unix socket");
}
const attachedNetworks = Object.values(
  inspected?.NetworkSettings?.Networks ?? {},
);
const networkValues = JSON.parse(process.env.NETWORK_PROOF);
if (
  attachedNetworks.length !== 1 ||
  !/^[0-9a-f]{64}$/.test(attachedNetworks[0]?.NetworkID ?? "") ||
  networkValues?.length !== 1 ||
  networkValues[0]?.Id !== attachedNetworks[0].NetworkID ||
  networkValues[0]?.Internal !== true ||
  networkValues[0]?.Driver !== "bridge" ||
  networkValues[0]?.EnableIPv6 !== false ||
  networkValues[0]?.Options?.["com.docker.network.bridge.name"] !==
    "br-mkt-assess" ||
  process.env.HOST_ISOLATION_PROFILE !==
    "linux-input-bridge-drop-v1"
) {
  throw new Error("assessment API lacks the trusted host isolation profile");
}
const apiOrigin = new URL(process.env.API_ORIGIN);
const bindings = inspected?.NetworkSettings?.Ports?.["3000/tcp"];
if (
  apiOrigin.hostname !== "127.0.0.1" ||
  apiOrigin.port === "" ||
  !Array.isArray(bindings) ||
  bindings.length !== 1 ||
  bindings[0]?.HostIp !== "127.0.0.1" ||
  bindings[0]?.HostPort !== apiOrigin.port
) {
  throw new Error("container 3000/tcp does not match API_ORIGIN");
}

const proof = JSON.parse(process.env.DB_PROOF);
const value = {
  database: proof.database,
  serverMajor: proof.serverMajor,
  address: proof.address,
  apiOrigin: new URL(process.env.API_ORIGIN).origin,
  containerId: inspected.Id,
  containerImageId: inspected.Image,
  networkId: attachedNetworks[0].NetworkID,
  hostIsolationProfile: process.env.HOST_ISOLATION_PROFILE,
  hostProbeImage: process.env.TRUSTED_PROBE_IMAGE,
  observedAt: new Date().toISOString(),
  sentinelId: proof.sentinelId,
  sentinelTitle: proof.sentinelTitle,
  sentinelPriceCents: proof.sentinelPriceCents,
  sentinelCreatedAt: proof.sentinelCreatedAt,
};
const temporary = join(directory, `.target-attestation.${process.pid}.${randomUUID()}`);
try {
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  chmodSync(temporary, 0o600);
  renameSync(temporary, target);
} catch (error) {
  try { unlinkSync(temporary); } catch {}
  throw error;
}
NODE
```

数据库事务和文件 rename 分别原子；若文件发布失败，sentinel 只留在稍后整体丢弃的一次性库中。
不用可登录账号创建 sentinel，也不让 verifier 修改它。生成后若容器或镜像变化，必须重新 inspect
并生成新 attestation，不能手改 ID。`GET /api/v1/listings/:sentinelId` 必须能读取 sold 详情；
若产品选择隐藏 sold 详情，应提供等价的公开只读详情契约，但不能恢复应用自报数据库身份的端点。

### 6.2 静态与目标拒绝检查

以下测试只能在尚未开始真实评审的全新固定根运行。PATH 最前面的假 `docker` 返回受控 inspect
JSON；假 HTTP server 对 sentinel 返回 404，并分别计数 GET/POST。缺省配置、host 进程标识、
bind/volume/device、root 或命名用户、host namespace、附加 capability、Docker endpoint、
非固定网络、坏权限和 symlink 都必须在任何 HTTP 前失败；唯一允许到达 HTTP 的 good inspect
也必须因 sentinel 404 在首个 POST 前停止：

```bash
set -euo pipefail
node --check evidence/verify-reservation.mjs

TEST_TMP=$(mktemp -d)
ROOT=/tmp/full-course-verification/batch-f/reader-owned
ASSESS_DIR=$ROOT/assessment
ATTESTATION_PATH=$ASSESS_DIR/target-attestation.json
test ! -e "$ROOT"
STATE=$TEST_TMP/server-state.json
PORT_FILE=$TEST_TMP/server-port
INSPECT_FILE=$TEST_TMP/inspect.json
CONTEXT_FILE=$TEST_TMP/context.json
NETWORK_FILE=$TEST_TMP/network.json
CONTAINER_ID=8a71c4d2e9f06b35a8c4f2197e6d0b53c8f1a9246d7e3b50a9c2f8164e7d35b1
IMAGE_ID=sha256:4d8c7b2a1e906f35d4c8b2197a6e0f53c8d1a9246b7e3f50a8c2d9164e7b35a1
NETWORK_ID=5e9d8c7b6a504132ffeeddccbbaa99887766554433221100abcdefabcdefabcd

mkdir -p "$TEST_TMP/bin"
cat >"$TEST_TMP/bin/docker" <<'SH'
#!/bin/sh
set -eu
case "${1:-} ${2:-}" in
  "inspect --type=container")
    cat "$FAKE_DOCKER_INSPECT"
    ;;
  "context inspect")
    cat "$FAKE_DOCKER_CONTEXT"
    ;;
  "network inspect")
    cat "$FAKE_DOCKER_NETWORK"
    ;;
  *)
    exit 64
    ;;
esac
SH
chmod 700 "$TEST_TMP/bin/docker"

node -e '
  const fs = require("node:fs");
  const http = require("node:http");
  const [statePath, portPath] = process.argv.slice(1);
  let gets = 0;
  let posts = 0;
  const save = () => {
    const temporary = `${statePath}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify({ gets, posts }));
    fs.renameSync(temporary, statePath);
  };
  save();
  const server = http.createServer((request, response) => {
    if (request.method === "GET") gets += 1;
    if (request.method === "POST") posts += 1;
    save();
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ code: "NOT_FOUND" }));
  });
  server.listen(0, "127.0.0.1", () => {
    fs.writeFileSync(portPath, String(server.address().port));
  });
' "$STATE" "$PORT_FILE" &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  rm -rf "$TEST_TMP" "$ROOT"
}
trap cleanup EXIT
while [[ ! -s "$PORT_FILE" ]]; do sleep 0.05; done
PORT=$(cat "$PORT_FILE")
API_URL="http://127.0.0.1:$PORT/api/v1/"

counts() {
  node -e '
    const fs = require("node:fs");
    process.stdout.write(fs.readFileSync(process.argv[1], "utf8"));
  ' "$STATE"
}

must_refuse_before_http() {
  local label=$1
  shift
  local before
  before=$(counts)
  if "$@" >"$TEST_TMP/$label.out" 2>"$TEST_TMP/$label.err"; then
    echo "expected $label to refuse" >&2
    exit 1
  fi
  [[ "$(counts)" == "$before" ]] || {
    echo "$label sent HTTP before refusing" >&2
    exit 1
  }
}

must_refuse_before_post() {
  local label=$1
  shift
  local before after
  before=$(node -e 'process.stdout.write(String(JSON.parse(process.argv[1]).posts))' "$(counts)")
  if "$@" >"$TEST_TMP/$label.out" 2>"$TEST_TMP/$label.err"; then
    echo "expected $label to refuse" >&2
    exit 1
  fi
  after=$(node -e 'process.stdout.write(String(JSON.parse(process.argv[1]).posts))' "$(counts)")
  [[ "$after" == "$before" ]] || {
    echo "$label sent a POST before refusing" >&2
    exit 1
  }
}

write_inspect() {
  node - "$INSPECT_FILE" "$1" "$CONTAINER_ID" "$IMAGE_ID" "$PORT" "$NETWORK_ID" <<'NODE'
const fs = require("node:fs");
const [target, kind, containerId, imageId, port, networkId] =
  process.argv.slice(2);
const value = {
  Id: containerId,
  Image: imageId,
  State: { Running: true },
  Config: { User: "10001:10001", Env: [] },
  HostConfig: {
    Privileged: false,
    NetworkMode: "bridge",
    PidMode: "",
    IpcMode: "private",
    UTSMode: "",
    CgroupnsMode: "private",
    UsernsMode: "",
    ReadonlyRootfs: true,
    CapDrop: ["ALL"],
    CapAdd: [],
    SecurityOpt: ["no-new-privileges:true"],
    Binds: [],
    VolumesFrom: [],
    Devices: [],
    DeviceCgroupRules: [],
    DeviceRequests: [],
    GroupAdd: [],
    ExtraHosts: [],
  },
  Mounts: [],
  NetworkSettings: {
    Networks: {
      assessment_internal: { NetworkID: networkId },
    },
    Ports: {
      "3000/tcp": [{ HostIp: "127.0.0.1", HostPort: port }],
    },
  },
};
if (kind === "bad-mount") {
  value.Mounts.push({
    Type: "bind",
    Source: "/var/run",
    Destination: "/host-run",
  });
}
if (kind === "bind") value.HostConfig.Binds.push("/host:/host:ro");
if (kind === "volumes-from") value.HostConfig.VolumesFrom.push("other:ro");
if (kind === "privileged") value.HostConfig.Privileged = true;
if (kind === "writable-root") value.HostConfig.ReadonlyRootfs = false;
if (kind === "missing-cap-drop") value.HostConfig.CapDrop = [];
if (kind === "root-user") value.Config.User = "0:0";
if (kind === "zero-uid") value.Config.User = "0:10001";
if (kind === "zero-gid") value.Config.User = "10001:0";
if (kind === "named-user") value.Config.User = "app";
if (kind === "host-network") value.HostConfig.NetworkMode = "host";
if (kind === "host-pid") value.HostConfig.PidMode = "host";
if (kind === "host-ipc") value.HostConfig.IpcMode = "host";
if (kind === "host-uts") value.HostConfig.UTSMode = "host";
if (kind === "host-cgroup") value.HostConfig.CgroupnsMode = "host";
if (kind === "host-userns") value.HostConfig.UsernsMode = "host";
if (kind === "cap-add") value.HostConfig.CapAdd.push("SYS_ADMIN");
if (kind === "unconfined") value.HostConfig.SecurityOpt.push("seccomp=unconfined");
if (kind === "missing-security-opt") value.HostConfig.SecurityOpt = [];
if (kind === "docker-env") value.Config.Env.push("DOCKER_HOST=tcp://host:2375");
if (kind === "docker-context-env") value.Config.Env.push("DOCKER_CONTEXT=remote");
if (kind === "host-gateway") {
  value.HostConfig.ExtraHosts.push("docker-host:host-gateway");
}
if (kind === "device") {
  value.HostConfig.Devices.push({
    PathOnHost: "/dev/disk0",
    PathInContainer: "/dev/host-disk",
    CgroupPermissions: "r",
  });
}
if (kind === "device-rule") value.HostConfig.DeviceCgroupRules.push("b 8:* r");
if (kind === "device-request") {
  value.HostConfig.DeviceRequests.push({ Driver: "example", Count: -1 });
}
if (kind === "group-add") value.HostConfig.GroupAdd.push("100");
if (kind === "second-network") {
  value.NetworkSettings.Networks.untrusted = {
    NetworkID: "e".repeat(64),
  };
}
if (kind === "bad-port") {
  value.NetworkSettings.Ports["3000/tcp"][0].HostPort =
    String(Number(port) + 1);
}
fs.writeFileSync(target, JSON.stringify([value]));
NODE
}

write_context() {
  node - "$CONTEXT_FILE" "$1" <<'NODE'
const fs = require("node:fs");
const [target, kind] = process.argv.slice(2);
const host = kind === "unix"
  ? "unix:///tmp/fake-docker.sock"
  : "tcp://127.0.0.1:2375";
fs.writeFileSync(target, JSON.stringify([{
  Endpoints: { docker: { Host: host } },
}]));
NODE
}

write_network() {
  node - "$NETWORK_FILE" "$1" "$NETWORK_ID" <<'NODE'
const fs = require("node:fs");
const [target, kind, networkId] = process.argv.slice(2);
fs.writeFileSync(target, JSON.stringify([{
  Id: kind === "wrong-id" ? "f".repeat(64) : networkId,
  Internal: kind !== "external",
  Driver: "bridge",
  EnableIPv6: kind === "ipv6",
  Options: {
    "com.docker.network.bridge.name":
      kind === "wrong-bridge" ? "br-wrong" : "br-mkt-assess",
  },
}]));
NODE
}

run_verifier() {
  env \
    PATH="$TEST_TMP/bin:$PATH" \
    FAKE_DOCKER_INSPECT="$INSPECT_FILE" \
    FAKE_DOCKER_CONTEXT="$CONTEXT_FILE" \
    FAKE_DOCKER_NETWORK="$NETWORK_FILE" \
    ALLOW_ISOLATED_ASSESSMENT=yes \
    EXPECTED_DATABASE=market_assessment_test \
    API_URL="$API_URL" \
    APP_ORIGIN=http://localhost:5173 \
    ASSESSMENT_API_CONTAINER="$CONTAINER_ID" \
    node evidence/verify-reservation.mjs
}

must_refuse_before_http default env -u API_URL -u APP_ORIGIN \
  ALLOW_ISOLATED_ASSESSMENT=yes \
  EXPECTED_DATABASE=market_assessment_test \
  node evidence/verify-reservation.mjs
must_refuse_before_http host-process env \
  ALLOW_ISOLATED_ASSESSMENT=yes \
  API_URL="$API_URL" \
  APP_ORIGIN=http://localhost:5173 \
  EXPECTED_DATABASE=market_assessment_test \
  ASSESSMENT_API_CONTAINER=host-process \
  node evidence/verify-reservation.mjs
must_refuse_before_http external env \
  ALLOW_ISOLATED_ASSESSMENT=yes \
  API_URL=https://example.com/api/v1/ \
  APP_ORIGIN=http://localhost:5173 \
  EXPECTED_DATABASE=market_assessment_test \
  ASSESSMENT_API_CONTAINER="$CONTAINER_ID" \
  node evidence/verify-reservation.mjs

mkdir -p "$ASSESS_DIR"
chmod 700 "$ROOT" "$ASSESS_DIR"
write_inspect good
write_context unix
write_network internal
node - "$ATTESTATION_PATH" "$PORT" "$CONTAINER_ID" "$IMAGE_ID" "$NETWORK_ID" <<'NODE'
const fs = require("node:fs");
const { randomBytes, randomInt, randomUUID } = require("node:crypto");
const [path, port, containerId, containerImageId, networkId] =
  process.argv.slice(2);
const now = new Date().toISOString();
fs.writeFileSync(path, JSON.stringify({
  database: "market_assessment_test",
  serverMajor: 18,
  address: "127.0.0.1",
  apiOrigin: `http://127.0.0.1:${port}`,
  containerId,
  containerImageId,
  networkId,
  hostIsolationProfile: "linux-input-bridge-drop-v1",
  hostProbeImage:
    "registry.example.test/trusted/node-probe@sha256:" + "a".repeat(64),
  observedAt: now,
  sentinelId: randomUUID(),
  sentinelTitle: `ASSESSMENT-SENTINEL-${randomBytes(24).toString("hex")}`,
  sentinelPriceCents: randomInt(100, 100_000_001),
  sentinelCreatedAt: now,
}), { mode: 0o600 });
NODE

cp "$ATTESTATION_PATH" "$TEST_TMP/good-attestation.json"
node - "$ATTESTATION_PATH" <<'NODE'
const fs = require("node:fs");
const path = process.argv[2];
const value = JSON.parse(fs.readFileSync(path, "utf8"));
value.hostIsolationProfile = "self-asserted";
fs.writeFileSync(path, JSON.stringify(value), { mode: 0o600 });
NODE
must_refuse_before_http wrong-host-isolation-profile run_verifier
grep -q "lacks the trusted host firewall profile" \
  "$TEST_TMP/wrong-host-isolation-profile.err"
mv "$TEST_TMP/good-attestation.json" "$ATTESTATION_PATH"
chmod 600 "$ATTESTATION_PATH"

cp "$ATTESTATION_PATH" "$TEST_TMP/good-attestation.json"
node - "$ATTESTATION_PATH" <<'NODE'
const fs = require("node:fs");
const path = process.argv[2];
const value = JSON.parse(fs.readFileSync(path, "utf8"));
value.hostProbeImage = "node:24.21.0-bookworm-slim";
fs.writeFileSync(path, JSON.stringify(value), { mode: 0o600 });
NODE
must_refuse_before_http mutable-host-probe-image run_verifier
grep -q "lacks an immutable host probe image" \
  "$TEST_TMP/mutable-host-probe-image.err"
mv "$TEST_TMP/good-attestation.json" "$ATTESTATION_PATH"
chmod 600 "$ATTESTATION_PATH"

must_refuse_before_post sentinel-404 run_verifier
grep -q "sentinel lookup returned 404" "$TEST_TMP/sentinel-404.err"

write_inspect bad-mount
must_refuse_before_http bad-mount run_verifier
grep -q "may mount only an isolated /tmp tmpfs" "$TEST_TMP/bad-mount.err"
write_inspect bind
must_refuse_before_http bind run_verifier
grep -q "must not use bind mounts or volumes-from" "$TEST_TMP/bind.err"
write_inspect volumes-from
must_refuse_before_http volumes-from run_verifier
grep -q "must not use bind mounts or volumes-from" "$TEST_TMP/volumes-from.err"
write_inspect privileged
must_refuse_before_http privileged run_verifier
grep -q "must not be privileged" "$TEST_TMP/privileged.err"
write_inspect writable-root
must_refuse_before_http writable-root run_verifier
grep -q "root filesystem must be read-only" "$TEST_TMP/writable-root.err"
write_inspect missing-cap-drop
must_refuse_before_http missing-cap-drop run_verifier
grep -q "must drop all capabilities" "$TEST_TMP/missing-cap-drop.err"
write_inspect root-user
must_refuse_before_http root-user run_verifier
grep -q "explicit non-zero numeric UID:GID" "$TEST_TMP/root-user.err"
write_inspect zero-uid
must_refuse_before_http zero-uid run_verifier
grep -q "explicit non-zero numeric UID:GID" "$TEST_TMP/zero-uid.err"
write_inspect zero-gid
must_refuse_before_http zero-gid run_verifier
grep -q "explicit non-zero numeric UID:GID" "$TEST_TMP/zero-gid.err"
write_inspect named-user
must_refuse_before_http named-user run_verifier
grep -q "explicit non-zero numeric UID:GID" "$TEST_TMP/named-user.err"
write_inspect host-network
must_refuse_before_http host-network run_verifier
grep -q "must not use host network" "$TEST_TMP/host-network.err"
write_inspect host-pid
must_refuse_before_http host-pid run_verifier
grep -q "must not use host PID mode" "$TEST_TMP/host-pid.err"
write_inspect host-ipc
must_refuse_before_http host-ipc run_verifier
grep -q "must isolate host namespaces" "$TEST_TMP/host-ipc.err"
write_inspect host-uts
must_refuse_before_http host-uts run_verifier
grep -q "must isolate host namespaces" "$TEST_TMP/host-uts.err"
write_inspect host-cgroup
must_refuse_before_http host-cgroup run_verifier
grep -q "must isolate host namespaces" "$TEST_TMP/host-cgroup.err"
write_inspect host-userns
must_refuse_before_http host-userns run_verifier
grep -q "must isolate host namespaces" "$TEST_TMP/host-userns.err"
write_inspect cap-add
must_refuse_before_http cap-add run_verifier
grep -q "must not add capabilities" "$TEST_TMP/cap-add.err"
write_inspect unconfined
must_refuse_before_http unconfined run_verifier
grep -q "must not add capabilities" "$TEST_TMP/unconfined.err"
write_inspect missing-security-opt
must_refuse_before_http missing-security-opt run_verifier
grep -q "must enable no-new-privileges" "$TEST_TMP/missing-security-opt.err"
write_inspect device
must_refuse_before_http device run_verifier
grep -q "must not receive host devices" "$TEST_TMP/device.err"
write_inspect device-rule
must_refuse_before_http device-rule run_verifier
grep -q "must not receive host devices" "$TEST_TMP/device-rule.err"
write_inspect device-request
must_refuse_before_http device-request run_verifier
grep -q "must not receive host devices" "$TEST_TMP/device-request.err"
write_inspect group-add
must_refuse_before_http group-add run_verifier
grep -q "must not receive host devices" "$TEST_TMP/group-add.err"
write_inspect docker-env
must_refuse_before_http docker-env run_verifier
grep -q "must not receive Docker endpoints" "$TEST_TMP/docker-env.err"
write_inspect docker-context-env
must_refuse_before_http docker-context-env run_verifier
grep -q "must not receive Docker endpoints" "$TEST_TMP/docker-context-env.err"
write_inspect host-gateway
must_refuse_before_http host-gateway run_verifier
grep -q "must not receive Docker endpoints" "$TEST_TMP/host-gateway.err"
write_inspect good
write_context tcp
must_refuse_before_http tcp-docker-context run_verifier
grep -q "must use a Unix socket" "$TEST_TMP/tcp-docker-context.err"
write_context unix
write_network external
must_refuse_before_http external-network run_verifier
grep -q "must be the fixed IPv4-only internal bridge" "$TEST_TMP/external-network.err"
write_network wrong-id
must_refuse_before_http wrong-network-id run_verifier
grep -q "must be the fixed IPv4-only internal bridge" "$TEST_TMP/wrong-network-id.err"
write_network ipv6
must_refuse_before_http ipv6-network run_verifier
grep -q "must be the fixed IPv4-only internal bridge" "$TEST_TMP/ipv6-network.err"
write_network wrong-bridge
must_refuse_before_http wrong-bridge run_verifier
grep -q "must be the fixed IPv4-only internal bridge" "$TEST_TMP/wrong-bridge.err"
write_network internal
write_inspect second-network
must_refuse_before_http second-network run_verifier
grep -q "must attach to exactly one identified network" \
  "$TEST_TMP/second-network.err"
write_inspect bad-port
must_refuse_before_http bad-port run_verifier
grep -q "must map exactly to the API_URL loopback port" \
  "$TEST_TMP/bad-port.err"
write_inspect good

chmod 755 "$ROOT"
must_refuse_before_http bad-root-permissions run_verifier
chmod 700 "$ROOT"
chmod 755 "$ASSESS_DIR"
must_refuse_before_http bad-directory-permissions run_verifier
chmod 700 "$ASSESS_DIR"
chmod 640 "$ATTESTATION_PATH"
must_refuse_before_http bad-file-permissions run_verifier
chmod 600 "$ATTESTATION_PATH"

mv "$ATTESTATION_PATH" "$TEST_TMP/real-attestation.json"
ln -s "$TEST_TMP/real-attestation.json" "$ATTESTATION_PATH"
must_refuse_before_http file-symlink run_verifier
rm "$ATTESTATION_PATH"
mv "$TEST_TMP/real-attestation.json" "$ATTESTATION_PATH"
chmod 600 "$ATTESTATION_PATH"

mv "$ROOT" "$TEST_TMP/real-reader-owned"
ln -s "$TEST_TMP/real-reader-owned" "$ROOT"
must_refuse_before_http parent-symlink run_verifier
rm "$ROOT"
mv "$TEST_TMP/real-reader-owned" "$ROOT"

node -e '
  const counts = JSON.parse(process.argv[1]);
  if (counts.gets !== 1 || counts.posts !== 0) process.exit(1);
' "$(counts)"
```

语法检查预期退出 0；good inspect 只产生一次 sentinel GET，其 404 使脚本非零；TCP Docker
context、非固定 internal 网络、network ID 漂移、Docker 环境变量、host-gateway、host device/
group/capability/namespace 和所有其他容器/路径反例连 GET 都不能发送，最终必须是
`gets=1, posts=0`。坏文件不能被“修复权限后继续”当成同
一次证明；测试恢复权限只是为了构造下一条独立用例。假 docker 只验证门禁，不冒充真实 Docker
运行证据。脚本中的固定密码只用于随机 `@example.test` 账号和一次性隔离数据库，不用于真实账号。

### 6.3 运行并保存报告

```bash
ALLOW_ISOLATED_ASSESSMENT=yes \
EXPECTED_DATABASE=market_assessment_test \
API_URL=http://127.0.0.1:3000/api/v1/ \
APP_ORIGIN=http://localhost:5173 \
ASSESSMENT_API_CONTAINER="$(
  docker compose --project-name market-assessment-lab ps -q api
)" \
BUYERS=20 \
  node evidence/verify-reservation.mjs \
  > /tmp/full-course-verification/batch-f/reader-owned/assessment/reservation-report.json
```

`docker compose ps -q api` 必须返回 64 位完整 container ID，不能用服务名、host PID 或候选人
自报值替代。verifier 在读取固定 attestation 前 inspect 一次，在 sentinel GET 前再 inspect
一次；两次结果及 attestation 的 container/image ID 必须一致。随后 sentinel 响应的
id/title/priceCents/createdAt 必须逐字段严格相等。容器门禁、文件门禁、GET 缺失/错误或不一致
都要在任何 POST 前停止。数据库连接串和 Cookie 不能写入报告或 shell history。
`auth/register` 必须保持当前后端契约 `202` 与 `{ "accepted": true }`，不能为适配 verifier
改成同步 `201`。

预期 `created=1`、`conflict=19`、self reservation 403、Listing 为 reserved、version 恰好加 1。
当前没有运行 API/PG18 时，此命令未执行，不能复制预期 JSON 作为证据。

## 7. 邻里集市集成案例

### 7.1 用数据库补足 HTTP verifier 的盲区

外部脚本看不到数据库是否真的只有一行。只读 service 固定
`market_assessment_reader_local`。下列同一命令链先核对 loopback、固定库名和 PG18，再把
report 中的期望值带入 SQL；任何目标或业务不变量失败都由 `\quit` 返回非零：

```bash
set -euo pipefail
: "${EXPECTED_DATABASE:?set EXPECTED_DATABASE explicitly}"
[[ "$EXPECTED_DATABASE" == "market_assessment_test" ]]

REPORT=/tmp/full-course-verification/batch-f/reader-owned/assessment/reservation-report.json
REPORT_VALUES=$(
  node -e '
    const fs = require("node:fs");
    const report = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const values = [
      report.listingId,
      report.finalListing?.status,
      report.finalListing?.version,
      report.finalListing?.priceCents,
    ];
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(values[0]) ||
      values[1] !== "reserved" ||
      !Number.isInteger(values[2]) ||
      values[2] < 1 ||
      values[3] !== 12345
    ) {
      throw new Error("reservation report fields are invalid");
    }
    console.log(values.join("\t"));
  ' "$REPORT"
)
IFS=$'\t' read -r LISTING_ID EXPECTED_STATUS EXPECTED_VERSION EXPECTED_PRICE \
  <<< "$REPORT_VALUES"

PGSERVICE=market_assessment_reader_local \
psql -X -v ON_ERROR_STOP=1 \
  -v expected_database="$EXPECTED_DATABASE" \
  -v listing_id="$LISTING_ID" \
  -v expected_status="$EXPECTED_STATUS" \
  -v expected_version="$EXPECTED_VERSION" \
  -v expected_price="$EXPECTED_PRICE" <<'SQL'
SELECT (
  current_database() = :'expected_database'
  AND current_setting('server_version_num')::integer >= 180000
  AND current_setting('server_version_num')::integer < 190000
  AND COALESCE(inet_server_addr()::text, '') IN ('127.0.0.1', '::1')
) AS target_ok
\gset
\if :target_ok
\else
  \echo 'refusing database target: expected loopback PostgreSQL 18 assessment DB'
  \quit 3
\endif

SELECT (
  (
    SELECT count(*) = 1
    FROM reservations
    WHERE listing_id = :'listing_id'::uuid
      AND status IN ('pending', 'confirmed')
  )
  AND EXISTS (
    SELECT 1
    FROM listings
    WHERE id = :'listing_id'::uuid
      AND status = :'expected_status'
      AND version = :'expected_version'::integer
      AND price_cents = :'expected_price'::integer
  )
) AS invariants_ok
\gset
\if :invariants_ok
  \echo 'reservation and listing invariants passed'
\else
  \echo 'reservation or listing invariant failed'
  \quit 4
\endif
SQL
```

退出 0 才表示 active reservations 恰好 1，且 Listing 为 reserved、金额 12345、version 与
report 一致；只打印 `SELECT` 结果不算断言。reader role 只有 SELECT，不拥有 DML、DDL 或角色
权限。目标检查与业务断言不得拆成两个可被分别跳过的命令。

### 7.2 取消事务

取消命令的 service 伪代码：

```ts
await transaction(async (client) => {
  const listing = await listings.lockByReservationId(client, reservationId);
  const reservation = await reservations.lockById(client, reservationId);
  authorizeCancel(actor, listing, reservation);
  requireState(reservation, "pending");
  await reservations.cancel(client, reservation.id);
  await listings.markAvailableAndIncrementVersion(client, listing.id);
  await outbox.insert(client, {
    id: eventId,
    eventType: "reservation.cancelled.v1",
    aggregateId: reservation.id,
    aggregateVersion: reservation.version + 1,
    payload: {
      reservationId: reservation.id,
      listingId: listing.id,
      priceCents: listing.priceCents,
      occurredAt: databaseUtc,
    },
  });
});
```

`authorizeCancel` 只允许 buyer 或 Listing owner。payload 不含邮箱/Cookie。任何一步失败都回滚
Reservation、Listing version/status 与 outbox。重复取消返回 409，不再增加 version/event。

### 7.3 确认事务

确认只允许 Listing owner，且 reservation 必须 pending：

```text
lock listing -> lock reservation -> actor == listing.owner
-> reservation confirmed -> listing sold + version
-> reservation.confirmed.v1 outbox -> commit
```

buyer、陌生用户、管理员默认都不能确认；如果产品增加管理员强制处理，必须新增审计、原因、权限
和测试，不能借已有 role 隐式放行。

### 7.4 Outbox/consumer 验收

每种 reserve/cancel/confirm 测试：

1. 在 outbox insert 前注入失败：业务/outbox 全回滚；
2. commit 后 Redis 不可用：业务存在、outbox pending；
3. 恢复并发布：published 有时间；
4. queue 接受后、published 标记前模拟中断：同 event 可重发；
5. consumer 重放：幂等记录与通知只有一条；
6. SIGTERM：停止 claim 新任务、等待有界 active、关闭连接。

不能用 Mock queue 替代毕业可靠性分；Mock 可用于单元测试，最终需隔离 Redis/BullMQ 证据。

### 7.5 React 与 Vue 实现顺序

两个前端分别：

1. 更新 contracts parser 和错误 code；
2. 实现预约详情、取消/确认 mutation 与权限提示；
3. 保留提交中状态，阻止本窗口重复点击但不依赖按钮保证幂等；
4. 对 401 恢复身份，对 403 说明权限，对 409 保留上下文并重读；
5. mutation 成功后采用服务端返回 version/status；
6. 增加键盘、焦点、live region 和失败恢复测试；
7. 运行同样五条 E2E，不共享框架组件或测试结果。

### 7.6 选修 Review 边界

只有 confirmed 预约参与者可评价；每个 reservation/author 一条；rating 1..5 integer；正文最多
2000 字。必须有数据库唯一约束、后端参与者授权、重复 409、非参与者 403、双前端 error/recovery。
它最多单独加 5 分，不降低任何基础要求。

### 7.7 证据包结构

```text
evidence/
  README.md
  environment.txt
  commands/
  http/
  database/
  browser-react/
  browser-vue/
  delivery/
  operations/
  assessment/
```

`README.md` 对每项写：

```text
claim:
evidence_class: observed-pass | observed-fail-recovered | blocked | manual-gap
environment:
command:
started_at_utc:
ended_at_utc:
exit_status:
artifact_paths:
sanitization:
remaining_boundary:
```

失败截图/输出与修复后结果使用不同文件。浏览器 trace 在保存前检查 Cookie/header/body；必要时只
保留经脱敏摘要，不上传原 trace。

### 7.8 测试数据清理

每轮必须创建 disposable `market_assessment_test`，不能把 admin/reader service 指向共享开发
库。完成并审核证据后，先停止本轮 API/worker 和其他自有连接，再由该隔离库所有者通过同一个
固定本地 admin service 丢弃**整个库**：

```bash
PGSERVICE=market_assessment_admin_local \
  dropdb --maintenance-db=postgres --force market_assessment_test
```

运行前再次核对 service 的 host/port 为本轮 loopback PG18，目标名逐字等于
`market_assessment_test`；任一不匹配就停止。保留脱敏报告后再删除短时效 attestation。不要
`TRUNCATE`、按标题模糊删 sentinel/fixture，或为方便而改成长期共享库；本验收的清理边界就是
丢弃整库。

## 8. 常见错误与排查路径

### 8.1 明确错误示例

```ts
// 错误：前端传来的 ownerId 决定权限，两个写又不在同一事务。
await reservations.update(input.reservationId, { status: "confirmed" });
if (input.ownerId) {
  await listings.update(input.listingId, { status: "sold" });
}
await queue.add("reservation.confirmed", input);
```

任意客户端可伪造 ownerId；第二条失败会留下部分状态；queue add 与数据库不是同一事务；payload
还可能包含未审查字段。

### 8.2 五段诊断记录

**现象**：20 个请求返回一个 201、19 个 409，但数据库有两条 pending。
**证据**：保存 HTTP report、listing ID、两条 reservation、索引定义和事务日志；不保存 Cookie。
**原因**：迁移中的部分唯一索引未在 assessment 库执行；service 错误映射隐藏了第二次 insert。
**修复**：恢复 migration checksum 门禁，应用唯一索引，修正 SQLSTATE 23505 -> 409，并拒绝
schema drift。
**复验**：从全新库迁移，20 买家重跑；HTTP 一胜、DB 一条、version +1、失败事务无 outbox。

### 8.3 错误对照表

| 现象 | 证据 | 原因候选 | 修复与复验 |
| --- | --- | --- | --- |
| React 通过、Vue 缺路径 | E2E 清单 | 把“同契约”误当共用结果 | Vue 独立跑五条路径 |
| 取消后 Listing 仍 reserved | transaction rows | 分步提交或漏更新 | 同 client 事务 + 回滚测试 |
| 409 后草稿丢失 | UI trace/state | error handler 重置表单 | 保留草稿并显式采用服务端 |
| outbox 有事件但通知重复 | event/effect SQL | consumer 幂等不持久 | event ID 唯一事务 |
| verifier 外部目标被拒绝 | 脚本错误 | 安全门正常 | 改用 reader-owned loopback |
| verifier 在 HTTP 前拒绝容器 | inspect/POST 计数 | 无宿主防火墙 profile、host API/device/group、非数值/零 UID、privileged/host namespace、capability/unconfined、任何 bind/volume 或端口不匹配 | 在一次性 Linux host 恢复固定 bridge/firewall 与最小权限容器后重建 attestation |
| verifier 在 loopback 写错库 | attestation/sentinel GET | 只校验 URL，或信任应用自报 | 重建固定安全 attestation，以随机 DB sentinel 绑定 API |
| HTTP 一胜但 DB 两条 | SQL assertion/index | 约束缺失/连错库 | migration/target 修复后重跑 |
| 证据包含 Cookie | 扫描/trace | 保存原 headers | 删除泄露产物、轮换并重采 |
| 构建通过却无 PG18 | environment | 以静态代替运行 | 标 blocked，不计数据库分 |

## 9. 课后题

**问题 1：为什么 verifier 仍需要数据库断言？**
参考答案：HTTP 只能看到返回和资源投影；实现可能错误地返回 409 却插入两行，数据库查询验证最终
不变量。

**问题 2：为什么取消与确认要写 outbox？**
参考答案：状态变化会触发通知/缓存等跨系统副作用；同事务记录事件避免业务成功而事件永久丢失。

**问题 3：为什么 React/Vue 不能互相代替验收？**
参考答案：组件、状态、路由、竞态与错误恢复实现不同，共享契约不证明两个实现都正确。

**问题 4：为什么评审后不让 verifier 自动 TRUNCATE？**
参考答案：脚本无法可靠确认数据库 ownership，默认整表清理破坏性高；一次性隔离库更可审计。

## 10. 实践练习

### 基础：20 买家证据

在 reader-owned assessment 栈先用假 docker 运行 default/host process、bind/volume/device、
root/named user、host namespace、capability/unconfined、Docker endpoint、错误 bridge 与坏权限/
父级 symlink 拒绝，并证明这些用例 HTTP 为 0；good inspect + sentinel 404 只允许一次 GET 且
POST 为 0。再在一次性 Linux host 先建立固定 bridge 与 `INPUT` profile，之后才启动
assessment 服务；用受信宿主 inspect 和固定 admin/reader service 生成
attestation，运行 verifier 和同链 SQL。预期注册保持 202，预约 1 个 201、19 个 409、自约 403、
有效预约一条、version +1。完成标准是写前 container/image 与 sentinel 严格匹配，HTTP/SQL 通过
同一 listing ID 关联、任一不变量失败时命令非零，证据审核后丢弃整个隔离库。

### 进阶：取消与确认矩阵

为 buyer/seller/stranger、pending/cancelled/confirmed 建立状态表并实现 HTTP/DB 测试。预期只有
合法 actor + pending 成功；重复/终态 409，越权 403，事务/outbox 同成同败。

### 故障注入：确认丢失

在 commit 成功后、HTTP 响应前中断一次本地 API。客户端先重读状态，不盲目重复；预期数据库只有
一次变化，UI 能解释结果不确定并恢复。完成标准是两个前端都保留用户上下文。

## 11. 阶段验收

- [ ] 最终 workspace 只有一份 lock，包名、scripts、contracts 和 TS 兼容线清楚。
- [ ] 金额始终整数分，持久化时间 UTC，owner/buyer/role 不接受客户端自报。
- [ ] 预约、取消、确认状态机及 403/409 明确。
- [ ] Listing -> Reservation 固定锁顺序，业务/version/outbox 同事务。
- [ ] active reservation 有数据库唯一约束，20 买家 HTTP/SQL 证据一致。
- [ ] consumer 以持久 event ID 幂等，重复投递业务副作用一条。
- [ ] React/Vue 各自覆盖六类 UI 状态与五条评审路径。
- [ ] verifier 无 API/origin/container 默认值，也不读取被评应用的 `/readiness/evidence` 自报。
- [ ] API 使用数值非零 UID:GID、只读根、`cap_drop: ALL`、无 cap add/unconfined、no-new-privileges，不使用 host namespace/device/group、Docker endpoint/host-gateway 或任何 bind/volume/volumes-from；只允许 `/tmp` tmpfs。
- [ ] 受信宿主 Docker context 只有一个非空 Unix socket endpoint；API 只连接固定 `br-mkt-assess` IPv4-only internal bridge。
- [ ] 一次性 Linux host 在启动候选容器前已配置并核验首条 `INPUT` jump、两条专用链规则与 gateway canary 超时；Docker Desktop 或无等价证明环境保持 blocked。
- [ ] `3000/tcp` 只映射到 `API_URL` 的 127.0.0.1 端口，inspect ID/image 与 attestation 当前值一致。
- [ ] 固定 reader-owned 根和 assessment 均为当前 uid/0700/非 symlink/固定 realpath，attestation 为当前 uid/0600/非 symlink/regular file。
- [ ] attestation 打开后从根逐组件 dev/ino 不变，父级 symlink 和动态父 realpath 被拒绝。
- [ ] 目标证明严格核对 loopback、PG18、库名、API origin、container/image、时效和随机 sentinel。
- [ ] 首次 POST 前的 sentinel GET 严格匹配 id/title/priceCents/createdAt；缺失或不一致时 POST 为 0。
- [ ] admin/reader service 只连接一次性 `market_assessment_test`，账号注册仍为 202 accepted。
- [ ] verifier 并发最多 20、随机 `example.test`、超时有界，不输出秘密。
- [ ] SQL 的目标门禁与预约/Listing 硬断言在同一命令链，失败退出非零。
- [ ] 证据审核后停止自有服务并丢弃整个隔离库，不做共享库行级清理。
- [ ] 证据包保留失败历史，区分 observed、blocked、manual gap。
- [ ] 当前未运行 PG/Docker/Redis/浏览器的维度没有被写成通过。

## 12. 常见问题

**取消后能否删除 Reservation？**
不建议。保留 cancelled 行便于审计、幂等和状态解释；有效唯一索引排除 cancelled。

**管理员是否应能确认任何交易？**
基础契约不允许。增加强制操作需独立权限、原因、审计和双前端说明。

**两个前端必须像素一致吗？**
不必；业务复杂度、状态、权限、错误恢复和可访问结果等价即可。

**verifier 为什么顺序创建账号？**
避免账号/登录限频干扰预约并发；真正并发只施加在目标 reservation mutation。

**为什么 loopback API 仍必须在 Docker 中？**
host 上同 uid 候选进程可直接读取或替换 `0600` attestation，文件权限不能隔离同 uid。毕业
verifier 因而只接受一次性 Linux host 上具有固定 `INPUT` 隔离 profile、数值非 root、
无 host device/group、无 bind/volume 且仅有 `/tmp` tmpfs 的容器；评分器仍在受信 host reader
进程运行，候选应用不进入证据命名空间。Docker `internal` 网络本身不够。

**已有 API 没有数据库身份端点怎么办？**
不需要，也不得新增给被评应用自报数据库身份的捷径。评审者用固定 admin service 在一次性库
插入随机 sentinel，再用固定 reader service 复核 PG18/loopback/库名和该行；受信宿主同时用
`docker inspect` 写入当前 container/image ID，原子生成固定路径、15 分钟内有效的 attestation。
verifier 再次 inspect 并通过公开详情 GET 绑定 API 后才允许 POST。

**为什么不能复用团队共享测试库再删 sentinel？**
attestation 授权随后会创建多名账号、Listing、Reservation 和 outbox；行级清理容易遗漏跨表
状态，也无法证明没有误删他人数据。固定 service 必须指向一次性 `market_assessment_test`，
审核后停止服务并丢弃整个库。

**证据包可以放到公开仓库吗？**
只能放经审查脱敏的摘要。原 trace、dump、私钥、Cookie、连接串和真实数据不能公开或提交。

## 13. 扩展阅读

官方资料快照：**2026-10-11**。

- [PostgreSQL 18 Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html)：
  并发可见性。
- [PostgreSQL 18 Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html)：锁顺序。
- [PostgreSQL Partial Indexes](https://www.postgresql.org/docs/18/indexes-partial.html)：有效预约唯一性。
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)：
  服务端对象授权。
- [Playwright Test](https://playwright.dev/docs/writing-tests)：浏览器路径与 trace。
- [下一课：评分、复审与独立修改](02-scoring-review-independent-change.md)。

## 我现在能做到什么

我能把业务状态机、数据库约束、事务/outbox、双前端和交付证据组织成同一毕业系统，并用外部 HTTP
与独立 SQL 共同验证并发预约，而不把未运行能力写成通过。

## 单元导航

- 上一章：[05 性能、安全与运维](../README.md#05-性能安全与运维)
- 章节目录：[06 毕业项目](../README.md#06-毕业项目)
- 下一课：[评分、复审与独立修改](02-scoring-review-independent-change.md)
- 课程级契约：[统一项目契约与阶段验收](../../00-guide/project-contract.md)
- 分卷入口：[全栈联调与交付](../README.md)
