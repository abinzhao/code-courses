# BullMQ 幂等、重试、死信与停机：允许重复尝试，不允许重复结果

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个无业务副作用的 BullMQ 重试实验、PostgreSQL 幂等 handler、失败检查与停机手册 |
| 练习位置 | 读者自己的 `market-backend-lab/queues/` |
| 运行条件 | Node.js 24、BullMQ 6.3.12、ioredis 6.0.0、读者授权的 Redis；业务幂等复验另需 PostgreSQL 18 |
| 核心命令 | `node --env-file=.env queues/retry-demo.mjs` |
| 成功证据 | 暂时错误在有界重试后完成；永久错误直接进入 failed；进程关闭后无本课悬挂连接 |
| 失败证据 | 重试耗尽、Redis 断开、活动任务超出停机预算均有明确日志与非零/告警状态 |
| 环境标签 | BullMQ demo **不产生真实通知**；业务幂等必须由真实 PostgreSQL 测试证明 |

## 1. 任务背景

Outbox dispatcher 把同一个 `reservation.created.v1` 发布两次并不一定是缺陷：第一次可能已被
Redis 接受，但 dispatcher 在写 `published_at` 前崩溃。Worker 也可能在完成数据库写入后、向
Redis 确认完成前退出，BullMQ 会再次尝试。

可靠队列的目标不是强行阻止所有重复，而是：

```text
稳定 event ID
  -> 队列 jobId 降低同时存在的重复任务
  -> 有界重试恢复暂时错误
  -> PostgreSQL 业务幂等消除重复结果
  -> 重试耗尽后保留可检查失败
  -> 修复后受控重放
```

`jobId` 只在该队列中相同 job 仍存在时去重。任务完成后被清理、Redis 数据丢失或换队列后，
同一个 ID 可以再次进入。真正需要长期保护的“站内通知只创建一次”必须有 PostgreSQL 唯一键
和事务。

## 2. 学习目标

完成本课后，你能够：

1. 区分领域 event ID、BullMQ jobId 和业务幂等键；
2. 配置有界 `attempts` 与指数 backoff；
3. 把暂时错误和永久错误映射到重试策略；
4. 用同一 PostgreSQL 事务写幂等收据与站内通知；
5. 解释 completed、failed、stalled 和外部送达的不同状态；
6. 检查 failed 集合并设计死信摘要和人工重放；
7. 用 concurrency、数据库池和依赖限额建立背压；
8. 在 SIGTERM 后停止取新工作、等待有界活动任务并按序关闭连接。

## 3. 预备知识

- 完成[事务 Outbox 与一致性](02-transactional-outbox-consistency.md)；
- 理解 PostgreSQL 唯一约束和同一 client 事务；
- 理解 Node signal、Promise 和资源关闭；
- 能使用不含真实凭据的 `.env` 占位配置。

创建个人练习目录并安装课程快照验证过的队列包。BullMQ 6 把 `ioredis` 作为可选 peer；
只安装 `bullmq` 会在创建 Queue/Worker 时得到缺失 Redis client 的启动错误：

```bash
mkdir -p queues
pnpm add -E bullmq@6.3.12 ioredis@6.0.0 --ignore-scripts
pnpm list bullmq ioredis
node --version
```

把实际解析版本保存到实验记录。升级任一包时都要重新运行本课 demo，不能只改版本文字。
本课已验证纯 JavaScript fallback，不需要可选的 `msgpackr-extract` 原生构建；`--ignore-scripts`
让安装在严格 pnpm 策略下仍为零退出。若项目确实要启用可选原生性能路径，应单独审查并固定允许的
包与脚本，不能无条件运行交互式“全部批准”。
`.env` 使用本地占位：

```dotenv
REDIS_URL=redis://127.0.0.1:6379
```

`.env` 不提交。若 Redis 有密码或 TLS，只在受控秘密管理中配置，不把 URL 输出到日志。

## 4. 核心理论

### 4.1 三种身份各有保留期

| 身份 | 例子 | 所有者 | 作用 |
| --- | --- | --- | --- |
| event ID | UUID | 业务事务/outbox | 事件重试、重放时保持不变 |
| jobId | 同一个 event ID | BullMQ 队列 | 同队列中现存任务去重和定位 |
| business idempotency key | `(consumer_name,event_id)` | PostgreSQL 消费者 | 长期阻止同一消费者重复结果 |

不要每次 dispatcher 重试都生成新 event ID，也不要使用 BullMQ 自动 ID 后尝试从 jobId 推断业务
事件。自定义 jobId 使用 UUID 可避免分隔符和编码歧义。

### 4.2 JobId 去重有生命周期

当相同 jobId 的任务仍处于 waiting、active、delayed、completed 或 failed 且尚未删除时，
重复 add 通常不会创建第二个 job。`removeOnComplete` 清理后，这个队列不再记得它；Redis 从
备份恢复或重建也可能丢失历史。

因此：

- jobId 是队列层优化；
- completed 保留时间应覆盖常见 dispatcher 重试窗口；
- failed 保留供诊断；
- 业务唯一键覆盖更长重放和灾难恢复窗口。

### 4.3 重试只适合可能自行恢复的错误

暂时错误：

- 数据库连接短暂中断；
- 依赖返回 429/503 且有合理 retry-after；
- 网络超时；
- 租约冲突。

永久错误：

- event schema/version 不支持；
- recipient/listing ID 格式非法；
- 业务对象确定不存在且不会由乱序补齐；
- 权限或配置永久拒绝。

暂时错误抛普通错误，由 `attempts` + backoff 重试。确认永久错误可抛 BullMQ 的
`UnrecoverableError` 停止后续自动尝试。分类错误本身会变化：404 可能是乱序暂时错误，也可能
是永久数据损坏，必须按业务上下文决定。

### 4.4 Handler 的幂等事务

数据库站内信可以把幂等收据和结果放进同一 PostgreSQL 事务：

```text
BEGIN
INSERT processed_events(consumer,event_id) ON CONFLICT DO NOTHING RETURNING ...
若没有插入：COMMIT，返回 duplicate
INSERT notifications(event_id, recipient_id, body, created_at)
COMMIT
```

若第二个 INSERT 失败，整个事务回滚，收据也不存在，下一次可重试。不要先在事务外永久标记
processed，再调用可能失败的副作用。

外部邮件不能加入 PostgreSQL 事务。需要 delivery 表状态、以 event ID 作为供应商 idempotency
key（若支持）、超时后的查询/对账，以及“未知是否送达”的明确状态。供应商不支持幂等时不能
承诺恰好一次。

### 4.5 Failed 集合是最小死信入口

本课把重试耗尽或永久失败并保留的 BullMQ failed job 当作待处理死信：

- `removeOnFail: false`；
- 运维工具分页读取 `queue.getFailed`；
- 展示 jobId、name、attemptsMade、时间和脱敏 error code；
- 不展示完整 payload、Token、连接串或堆栈给无权限用户；
- 记录确认、修复、重试或放弃的审计。

单独的 dead-letter queue 可以隔离处理，但“从 failed 复制到 DLQ”本身也可能失败或重复，需要
稳定 dead-letter ID 和对账。先把 failed 保留与巡检做好，再增加复制器。

### 4.6 手工重放也必须幂等

重放前：

1. 确认根因已修复；
2. 查看业务幂等收据和实际副作用；
3. 确认事件 schema 仍受支持；
4. 记录操作人、原因、原 jobId 和时间；
5. 对原 failed job 使用受控 retry，或以同一 event ID 重建；
6. 观察最终状态并对账。

不能“清空 failed 然后全部重新加”作为修复。它会丢失证据并可能冲击依赖。

### 4.7 背压是端到端容量关系

Worker `concurrency=20` 不代表系统能同时处理 20 个数据库事务。并发上限应满足：

```text
所有 worker 活动 DB 操作
  <= 专用连接池可用连接
  <= PostgreSQL 可承受预算
```

还要监控 waiting 数量、最老 job 年龄、处理吞吐、失败率、active 时长、数据库池等待和外部
429。队列增长是积压证据，不是可靠性本身。Producer 也要有速率和批量上限。

### 4.8 优雅停机不等于永远等待

收到 SIGTERM：

1. dispatcher 停止 claim 新 outbox；
2. worker 停止获取新 job 并等待 active handler；
3. handler 的每个网络/数据库操作有自己的超时；
4. 关闭 QueueEvents、producer Queue、Redis/数据库连接；
5. 在平台 grace period 内完成；超时可能被强制终止。

强制终止后 active job 可能被判 stalled 并重新处理，所以业务幂等不是可选项。`worker.close()`
等待当前任务，但无法让一个没有超时的外部调用自动结束。

## 5. 元素、属性、API 或配置清单

| BullMQ/数据项 | 本课用途 | 边界 |
| --- | --- | --- |
| `Queue.add` | 以 event ID 创建 job | 成功确认仍可能在网络中丢失 |
| `jobId` | 队列内现存 job 去重 | 清理/重建后不再保护 |
| `attempts` | 最大有界尝试 | 不是无限重试 |
| exponential `backoff` | 拉开暂时错误重试 | 生产还应评估抖动 |
| `UnrecoverableError` | 明确永久错误 | 错误分类必须可靠 |
| `Worker` | 消费并执行 handler | completed 不等于外部送达 |
| `QueueEvents` | 观察完成/失败事件 | 需要独立连接和关闭 |
| `removeOnComplete` | 有界保留成功 job | 保留过短会削弱 jobId 去重 |
| `removeOnFail: false` | 保留失败证据 | 需要容量和清理策略 |
| `queue.getFailed` | 分页检查 failed | 输出必须脱敏 |
| `worker.close()` | 停新工作并等待 active | handler 必须有超时 |
| `processed_events` | 持久业务幂等 | 保留期覆盖重放窗口 |

## 6. 最小可运行案例

### 6.1 环境探针

只在读者授权的 Redis 环境运行：

```bash
redis-server --version
redis-cli --version
redis-cli -u 'redis://127.0.0.1:6379' PING
redis-cli -u 'redis://127.0.0.1:6379' INFO server | sed -n 's/^redis_version:/redis_version=/p'
pnpm list bullmq ioredis
```

预期 PING 返回 `PONG`，其余命令给出实际版本。若失败，保存原始错误；不要启动未知共享 Redis、
不要用真实密码替换进教程，也不要把连接失败写成代码测试通过。

### 6.2 创建无业务副作用的 BullMQ demo

创建完整文件 `queues/retry-demo.mjs`：

```js
import { randomUUID } from "node:crypto";
import {
  Queue,
  QueueEvents,
  UnrecoverableError,
  Worker,
} from "bullmq";

function connectionFromEnvironment() {
  const url = new URL(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
    throw new Error("REDIS_URL: expected redis or rediss");
  }
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number(url.pathname.slice(1) || 0),
    tls: url.protocol === "rediss:" ? {} : undefined,
  };
}

const queueName = "market-reliability-demo";
const connection = connectionFromEnvironment();
const queue = new Queue(queueName, { connection });
const events = new QueueEvents(queueName, { connection });
const worker = new Worker(
  queueName,
  async (job) => {
    console.log(JSON.stringify({
      event: "demo_job_attempt",
      jobId: job.id,
      attempt: job.attemptsMade + 1,
      mode: job.data.mode,
    }));
    if (job.data.mode === "permanent") {
      throw new UnrecoverableError("INVALID_DEMO_RECIPIENT");
    }
    if (job.data.mode === "transient" && job.attemptsMade < 2) {
      throw new Error("TEMPORARY_DEMO_DEPENDENCY");
    }
    return { eventId: job.data.eventId, outcome: "demo-only" };
  },
  { connection, concurrency: 2 },
);

let closing;
function close(reason) {
  if (!closing) {
    closing = (async () => {
      console.log(JSON.stringify({ event: "demo_shutdown", reason }));
      await worker.close();
      await events.close();
      await queue.close();
    })();
  }
  return closing;
}
process.once("SIGTERM", () => void close("SIGTERM"));
process.once("SIGINT", () => void close("SIGINT"));

try {
  await events.waitUntilReady();
  await worker.waitUntilReady();
  const transientEventId = randomUUID();
  const permanentEventId = randomUUID();
  const options = {
    attempts: 5,
    backoff: { type: "exponential", delay: 100 },
    removeOnComplete: { age: 86_400, count: 10_000 },
    removeOnFail: false,
  };

  const transient = await queue.add(
    "demo.notification.v1",
    { eventId: transientEventId, mode: "transient" },
    { ...options, jobId: transientEventId },
  );
  const permanent = await queue.add(
    "demo.notification.v1",
    { eventId: permanentEventId, mode: "permanent" },
    { ...options, jobId: permanentEventId },
  );

  const settled = await Promise.allSettled([
    transient.waitUntilFinished(events, 30_000),
    permanent.waitUntilFinished(events, 30_000),
  ]);
  const failed = (await queue.getFailed(0, 49))
    .filter((job) => job.id === permanentEventId)
    .map((job) => ({
      jobId: job.id,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
    }));

  console.log(JSON.stringify({
    event: "demo_summary",
    settled: settled.map((result) => result.status),
    failed,
  }));
} finally {
  await close("main-finally");
}
```

该 Worker 只返回 `demo-only`，不写数据库、不发邮件。随机 UUID 让重复运行不撞上次保留 job。

### 6.3 运行与可观察结果

```bash
node --env-file=.env queues/retry-demo.mjs
```

预期观察：

- transient job 打印 3 次 attempt 后 fulfilled；
- permanent job 第一次抛 `INVALID_DEMO_RECIPIENT` 后 rejected，不消耗全部 5 次；
- summary 的 failed 数组含永久 job；
- 最后出现 `demo_shutdown`，进程退出。

日志顺序和延迟会随调度变化，不写死毫秒值。如果命令没有真实运行，只能把这些列为预期，不得
报告为已经观察。

## 7. 邻里集市集成案例

### 7.1 PostgreSQL 幂等表

迁移：

```sql
CREATE TABLE processed_events (
  consumer_name text NOT NULL,
  event_id uuid NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer_name, event_id)
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  event_id uuid NOT NULL UNIQUE,
  recipient_id uuid NOT NULL REFERENCES users(id),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

`processed_at` 和 `created_at` 对外均规范为 UTC ISO。通知正文不记录密码、Cookie、Token 或
连接串。

### 7.2 幂等 handler

以下是 service 增量结构，必须使用同一个 transaction client：

```ts
async function handleReservationCreated(client: PoolClient, event: unknown) {
  const parsed = parseReservationCreatedV1(event);
  await client.query("BEGIN");
  try {
    const receipt = await client.query(
      `INSERT INTO processed_events (consumer_name, event_id)
       VALUES ('market-notification-v1', $1)
       ON CONFLICT DO NOTHING
       RETURNING event_id`,
      [parsed.eventId],
    );
    if (receipt.rowCount === 0) {
      await client.query("COMMIT");
      return { outcome: "duplicate" as const };
    }

    await client.query(
      `INSERT INTO notifications (id, event_id, recipient_id, body)
       VALUES ($1, $2, $3, $4)`,
      [
        randomUUID(),
        parsed.eventId,
        parsed.sellerId,
        `商品 ${parsed.listingId} 收到预约`,
      ],
    );
    await client.query("COMMIT");
    return { outcome: "created" as const };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}
```

`parseReservationCreatedV1` 要验证 event type/version、UUID、非负安全整数 `priceCents` 和 UTC
时间；不能把 `job.data as Event` 当验证。通知插入失败时 receipt 同时回滚。

### 7.3 Worker 错误分类

Worker 在调用 handler 前：

1. schema 不支持 -> `UnrecoverableError("UNSUPPORTED_EVENT_VERSION")`；
2. 外键暂时缺失且允许乱序等待 -> 普通 `DependencyNotReadyError`，有界重试；
3. PostgreSQL 连接/序列化失败 -> 按 SQLSTATE 分类，只有暂时类重试；
4. duplicate -> 正常完成并记录低基数 outcome；
5. created -> 正常完成；
6. 未知错误 -> 失败，日志脱敏，不能返回敏感堆栈给队列监控页面。

不要捕获所有错误后返回 `{ok:false}`；BullMQ 会把 resolved Promise 标记 completed，重试和
failed 检查都失效。

### 7.4 Failed / dead-letter 运维手册

受控管理命令或内部工具执行：

```ts
const failed = await queue.getFailed(0, 49);
for (const job of failed) {
  console.log({
    jobId: job.id,
    name: job.name,
    attemptsMade: job.attemptsMade,
    errorCode: classifyFailedReason(job.failedReason),
  });
}
```

只打印分类摘要。重放前查：

```sql
SELECT consumer_name, event_id, processed_at
FROM processed_events
WHERE event_id = $1;

SELECT event_id, count(*)::integer AS total
FROM notifications
WHERE event_id = $1
GROUP BY event_id;
```

若通知已存在，重复 handler 应返回 duplicate；若不存在且根因已修复，可审计后 retry。最终失败
任务的保留和归档策略必须有容量上限，但不能在调查前自动删除全部证据。

### 7.5 停机顺序

长运行进程分别拥有 dispatcher、Worker、QueueEvents、producer Queue、Redis connection 和
PostgreSQL pool。Signal handler：

```text
stopping = true
停止 outbox poll/claim
await worker.close()       # 不再取新 job，等待 active
await queueEvents.close()
await producerQueue.close()
await redis.quit()/disconnect（按客户端契约）
await pool.end()
```

每个依赖调用都要有小于平台 grace period 的超时。平台最终强杀时 job 可能再次执行，真实复验
必须证明同一 event ID 重放后 `notifications` 仍为 1。

### 7.6 真实端到端验收

记录 Redis、BullMQ、PostgreSQL 客户端/服务端、连接目标和迁移状态。然后：

1. 同一 outbox event 至少发布三次；
2. jobId 使用同一 event ID；
3. 必要时在 job 清理后再次加入，证明队列去重不是永久保证；
4. handler 运行三次，`processed_events` 一行、`notifications` 一行；
5. 暂时错误按 backoff 恢复，永久错误进入 failed；
6. 修复永久错误并审计重放；
7. 活动任务中发送 SIGTERM，观察不取新任务、当前任务有界结束、连接关闭；
8. 强制终止窗口后重启，重复任务仍不产生重复通知。

没有实际服务时只保留手册，不虚构输出。

## 8. 常见错误与排查路径

### 8.1 明确错误示例：只依赖 jobId

```ts
await queue.add("reservation.created.v1", event, {
  jobId: event.id,
  removeOnComplete: true,
});
```

- **现象**：任务完成并立即清理后，同一事件再次加入并创建第二条通知。
- **证据**：Redis 中旧 job 已不存在；notifications 出现相同 event ID 的重复结果或唯一冲突。
- **原因**：jobId 去重只覆盖现存队列记录，没有持久业务收据。
- **修复**：保留合理 completed 窗口，并在 PostgreSQL 事务中用 `(consumer,event_id)` 和业务唯一键。
- **复验**：清理/重建队列后重放同一 event ID，handler 返回 duplicate，通知仍只有一行。

### 8.2 捕获错误后返回

- **现象**：依赖持续失败，BullMQ 却把 job 标记 completed。
- **证据**：handler catch 记录后 `return { ok:false }`，没有 throw。
- **原因**：Promise 正常 resolve 被解释为处理成功。
- **修复**：暂时错误重新抛出，永久错误抛 `UnrecoverableError`；只把已幂等处理视为成功。
- **复验**：暂时错误增加 attemptsMade，永久错误进入 failed，成功才 completed。

### 8.3 无限重试永久错误

- **现象**：无效 recipient 占满队列并持续打数据库。
- **证据**：同一 error code attempts 持续增长，没有上限或告警。
- **原因**：没有错误分类和 dead-letter 流程。
- **修复**：有界 attempts，确认永久错误不可恢复，failed 保留并告警。
- **复验**：永久 demo 第一次失败后停止，failed 可查询且没有敏感 payload。

### 8.4 停机直接 `process.exit`

- **现象**：active job 被中断，连接未关闭，重启后重复处理。
- **证据**：Signal handler 直接退出，没有 worker.close 日志；数据库出现中断事务。
- **原因**：跳过资源生命周期。
- **修复**：按序关闭并为 handler 依赖设置超时；保留平台最终强杀边界。
- **复验**：SIGTERM 期间不取新 job，活动 job 完成或超时回滚，重启后幂等。

### 8.5 并发高于数据库容量

- **现象**：队列吞吐没有提高，pool waiting 和延迟反而上升。
- **证据**：Worker active 高、数据库可用连接耗尽、超时增加。
- **原因**：只调 concurrency，没有端到端容量预算。
- **修复**：降低并发、分离池预算、批量/限速并监控 oldest-job age。
- **复验**：压力测试中吞吐稳定，池等待与失败率在预算内。

## 9. 课后题

1. **为什么 jobId 不能替代业务唯一键？**
   答案：job 记录会被清理或丢失，且只在单个队列命名空间内；业务重放窗口通常更长。
2. **为什么 duplicate handler 可以标记 completed？**
   答案：目标业务结果已经存在，再执行无需产生副作用；幂等收据证明这是成功收敛而非吞错。
3. **failed job 是否等于独立 DLQ？**
   答案：它是最小死信入口。独立 DLQ 还需复制可靠性、稳定 ID、权限和对账。
4. **优雅停机为何仍需要幂等？**
   答案：平台可能在 grace period 后强杀，网络确认也可能丢失，active job 仍会重跑。

## 10. 实践练习

### 基础：增加第四次重复处理

对同一 event ID 连续调用 handler 四次。可判定标准：第一次 created，后三次 duplicate；
`processed_events` 与 `notifications` 都只有一行。

### 进阶：外部邮件 delivery 状态

设计 `pending/sending/sent/unknown/failed` 状态和 provider idempotency key。可判定标准：超时不
直接标 sent；可查询/对账 unknown；重复任务复用同一 provider key；不承诺供应商不支持的恰好一次。

### 故障注入：结果提交后、job 完成确认前退出

提交 PostgreSQL 通知后终止 Worker。可判定标准：重启后 job 可能重试，但 handler 返回
duplicate，通知仍一行；记录现象、证据、原因、修复和复验。

## 11. 阶段验收

- [ ] event ID、jobId 和业务幂等键被分别定义；
- [ ] 暂时/永久错误有不同 throw 和重试行为；
- [ ] attempts/backoff 有界，failed 保留可检查；
- [ ] 幂等收据与数据库副作用在同一 PostgreSQL 事务；
- [ ] completed 不被当作外部送达证明；
- [ ] failed 检查、修复、审计重放和容量清理形成闭环；
- [ ] Worker concurrency 与数据库/依赖容量对账；
- [ ] SIGTERM 停止新工作、等待有界 active 并关闭全部连接；
- [ ] 未运行 Redis/PostgreSQL 时没有报告真实队列或幂等通过。

## 12. 常见问题

**`attempts: 1` 是重试一次吗？**
应以当前锁定 BullMQ 版本文档和实际 demo 核对；课程语义要求“总尝试次数”有明确测试，不依赖
模糊口头约定。

**是否应该把完整 error stack 存进 failed job？**
队列内部可能保留失败原因，但运维展示和日志必须脱敏、限权和限长。秘密一旦进入 payload/stack
可能被长期保留。

**Worker 可以和 API 跑在同一进程吗？**
小型部署可以，但停机、扩缩容、CPU/连接池和故障影响会耦合。无论同进程或分进程，都要明确
资源所有权和关闭顺序。

**Redis 持久化后是否就不会丢任务？**
不能这样承诺。持久化、复制、故障切换和恢复各有窗口，必须按实际配置演练；outbox 仍是可重建
队列任务的业务来源。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [BullMQ：Job IDs](https://docs.bullmq.io/guide/jobs/job-ids)
- [BullMQ：Retrying failing jobs](https://docs.bullmq.io/guide/retrying-failing-jobs)
- [BullMQ：Idempotent jobs](https://docs.bullmq.io/patterns/idempotent-jobs)
- [BullMQ：Graceful shutdown](https://docs.bullmq.io/guide/workers/graceful-shutdown)
- [BullMQ：Connections](https://docs.bullmq.io/guide/connections)
- [Redis persistence](https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/)
- [PostgreSQL 18：Unique Indexes](https://www.postgresql.org/docs/18/indexes-unique.html)

## 我现在能做到什么

我能让 BullMQ 接受重复尝试但不产生重复数据库结果，按错误性质实施有界重试和 failed 巡检，
并用端到端容量与优雅停机设计保证故障后仍可恢复。

## 单元导航

- 章节目录：[08 Redis、Outbox 与队列](../README.md#08-redisoutbox-与队列)
- 上一课：[事务 Outbox 与一致性](02-transactional-outbox-consistency.md)
- 下一章：[09 测试、OpenAPI 与可观测性](../09-testing-openapi-observability/01-unit-http-real-postgres-tests.md)
