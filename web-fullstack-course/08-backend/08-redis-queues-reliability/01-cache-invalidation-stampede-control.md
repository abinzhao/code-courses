# 缓存失效与击穿控制：让 Redis 加速但不裁决业务

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个显式标记的 MOCK cache-aside 实验、公共列表缓存键与失效设计 |
| 练习位置 | 读者自己的 `market-backend-lab/cache/` |
| 运行条件 | 最小案例仅需 Node.js 24；真实扩展另需授权 Redis |
| 核心命令 | `node --test cache/cache-aside.test.mjs` |
| 成功证据 | miss 后写缓存、hit 不读库、epoch 失效、并发 miss 在单进程合并为一次 load |
| 失败证据 | key 缺字段、失效顺序错误、私有字段进入公共缓存时测试失败 |
| 环境标签 | 最小案例是 **MOCK Redis / STATIC 数据**，不证明真实 Redis 行为 |

## 1. 任务背景

邻里集市公共列表越来越热，团队希望用 Redis 减少 PostgreSQL 读取。最直接的 cache-aside 是：

```text
读：GET -> miss -> SELECT -> SET
写：UPDATE PostgreSQL -> DEL cache
```

这个流程能工作，但不是“加一层 Redis 就结束”。列表 key 若漏掉 q、sort、cursor 或权限范围，
不同查询会串数据；写后只 `DEL` 仍可能被更早开始的慢查询写回旧值；大量请求同时 miss 会把
一个热点放大成大量数据库查询；Redis 故障若被当成业务故障，缓存反而降低可用性。

缓存是有陈旧窗口的派生副本。预约资格、对象所有权、库存状态和唯一性必须由 PostgreSQL 的
当前事务与约束裁决，不能因为缓存更快就读取缓存作最终决定。

## 2. 学习目标

完成本课后，你能够：

1. 画出 cache-aside 的 hit、miss、写后失效和降级路径；
2. 设计包含 schema、epoch、规范查询和权限范围的 key；
3. 解释朴素 delete 后旧读回填的竞态；
4. 用 epoch 命名空间隔离失效前启动的旧加载；
5. 用进程内 single-flight 减少同一进程的热点击穿；
6. 说明分布式锁、stale-while-revalidate、TTL 抖动各自的边界；
7. 在 Redis 不可用时让公共读受控回源，同时保护数据库；
8. 明确哪些关键路径必须绕过缓存。

## 3. 预备知识

- 理解[安全搜索与动态查询](../07-search-pagination-files/01-safe-search-dynamic-queries.md)；
- 理解[Offset 与 Keyset](../07-search-pagination-files/02-offset-keyset-consistent-pagination.md)；
- 理解事务提交后才允许对外发布结果；
- 能区分业务事实和可重建派生数据。

创建个人练习目录：

```bash
mkdir -p cache
node --version
```

本课最小案例自行实现内存 `MockRedis`，文件名、测试名和输出都保留 `MOCK`。它用于确定性观察
算法，不模拟 Redis 网络、过期精度、Lua、复制、淘汰或故障切换。

## 4. 核心理论

### 4.1 Cache-aside 的所有权

应用拥有加载和失效逻辑：

```text
请求
  -> 读 epoch
  -> 读 cache key
  -> hit: 解析并返回
  -> miss: 从 PostgreSQL 读取
  -> 校验结果
  -> 写短 TTL cache
  -> 返回
```

写路径先在 PostgreSQL 提交业务变化，再推进 cache epoch。提交前失效会出现“缓存已清但事务
最终回滚”；提交后失效可能失败，因此需要短 TTL、告警和 outbox 重试。不能把 Redis 操作放进
PostgreSQL 事务后就宣称二者原子。

### 4.2 Key 是查询契约的摘要

公共列表缓存 key 至少绑定：

- 应用与资源名；
- 序列化 schema 版本；
- 全局或分区 epoch；
- q 的规范形态；
- status、sort、limit、page/cursor；
- locale 或任何会改变响应的公开维度；
- 权限范围，例如 `public`。

不要直接拼原始 q 到 key：它可能很长、包含个人信息或控制字符。先建立字段顺序固定的规范
对象，再对 JSON 做 SHA-256 摘要。SHA-256 在这里用于稳定短 key，不是密码或访问控制。

含 `isFavorite`、未公开草稿、用户价格等私有字段的响应不能进入 `scope=public`。最简单的
策略是公共列表缓存公共字段，用户私有覆盖单独查询或不缓存。

### 4.3 `DEL` 后仍可能回填旧值

时序：

```text
R1: cache miss，开始慢 SELECT（读到旧快照）
W1: UPDATE + COMMIT
W1: DEL key
R1: SELECT 完成，把旧结果 SET 回同一个 key
```

TTL 最终会清掉旧值，但陈旧窗口可能比产品允许更长。epoch 方案让 R1 在读取数据库前取得
epoch=7，并只向 `...:7:hash` 写；W1 提交后 `INCR` 到 8，新请求只读 `...:8:hash`。R1 即使
后来写回，也写到旧命名空间。

epoch 不是无限免费：旧 key 等 TTL 回收，全局 epoch 会让所有列表一起 miss。可按资源或分区
细化，但越细越难保证所有相关 key 被推进。

### 4.4 TTL 是资源和恢复边界，不是正确性证明

TTL 控制：

- 未显式失效时的最大预计陈旧窗口；
- 旧 epoch key 的回收；
- 内存占用；
- 故障后自然恢复速度。

到期时间可加入小范围随机抖动，避免大量 key 同一秒失效。抖动不解决单个热点击穿，也不能让
关键预约状态变得可缓存。

### 4.5 Single-flight 只合并一个进程

把同一个 key 的加载 Promise 放入 Map，后续请求等待它，可把一个进程内 N 次 miss 合并为一次
数据库读取。Promise 无论成功失败都要在 `finally` 删除，否则永久复用失败或陈旧结果。

多进程仍可能各发一次查询。跨进程方案包括：

- Redis 锁：随机 token、短租约、仅持有者用 Lua 比较后删除；
- stale-while-revalidate：允许短期旧值，只有一个刷新者；
- 数据库/应用限流：保护回源容量；
- 热点预热：只能优化已知热点，不能替代失效。

锁租约可能在加载完成前过期，锁服务故障也要决定 fail-open 还是 fail-closed。缓存读通常
fail-open 回源，但必须有并发上限，不能无限冲击数据库。

### 4.6 穿透、击穿和雪崩是不同现象

| 现象 | 含义 | 常见控制 |
| --- | --- | --- |
| 穿透 | 大量查询不存在对象，每次都回源 | 短暂 negative cache、输入限制、速率限制 |
| 击穿 | 一个热点 key 失效，大量并发回源 | single-flight、租约锁、stale refresh |
| 雪崩 | 大量 key 同时失效或 Redis 故障 | TTL 抖动、容量隔离、降级、数据库保护 |

negative cache 必须有短 TTL，并在对象创建后失效；授权失败不能按公共 key 缓存，否则可能泄露
资源是否存在。

### 4.7 缓存数据也要解析

缓存可能来自旧版本、部分写入、运维误写或错误服务。`JSON.parse` 成功不等于领域合法。命中后
仍应验证 `priceCents` 为非负安全整数分、`createdAt` 为 UTC ISO、分页结构符合当前 schema。
解析失败时删除/绕过该 key、记录低敏错误并回源，不把损坏对象直接发给客户端。

## 5. 元素、属性、API 或配置清单

| Redis/应用接口 | 本课用途 | 边界 |
| --- | --- | --- |
| `GET` | 读取 epoch 和缓存值 | miss 与连接失败要区分 |
| `SET ... EX seconds` | 写入有 TTL 的派生值 | 写失败不回滚已提交业务 |
| `INCR listings:epoch` | 推进命名空间 | 全局推进会制造一轮 miss |
| `DEL` | 删除损坏或精确 key | 单独 DEL 有旧读回填竞态 |
| Lua compare-and-delete | 释放自己持有的锁 | 仍受租约过期影响 |
| SHA-256 | 摘要规范查询生成短 key | 不是授权和保密 |
| single-flight Map | 合并同进程加载 | 不跨进程 |
| TTL jitter | 分散到期时间 | 不解决单热点 |
| negative cache | 短暂缓存不存在 | 不能缓存敏感授权差异 |
| DB bulkhead | 限制缓存故障回源并发 | 过载时应受控失败或降级 |

## 6. 最小可运行案例

### 6.1 创建明确标记的 MOCK 实现

创建完整文件 `cache/cache-aside.mjs`：

```js
import { createHash } from "node:crypto";

export class MockRedis {
  constructor() {
    this.values = new Map([["market:listings:epoch", "0"]]);
  }
  async get(key) {
    return this.values.get(key) ?? null;
  }
  async setEx(key, _seconds, value) {
    this.values.set(key, value);
  }
  async incr(key) {
    const next = Number(this.values.get(key) ?? "0") + 1;
    this.values.set(key, String(next));
    return next;
  }
}

const inflight = new Map();

function normalizedPublicQuery(input) {
  if (input.scope !== "public") {
    throw new Error("cache: only public listing responses are supported");
  }
  if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 100) {
    throw new Error("limit: expected integer 1..100");
  }
  return {
    scope: "public",
    q: String(input.q ?? "").trim(),
    sort: input.sort ?? "newest",
    limit: input.limit,
    after: input.after ?? null,
  };
}

function cacheKey(epoch, input) {
  const canonical = JSON.stringify(normalizedPublicQuery(input));
  const digest = createHash("sha256").update(canonical).digest("hex");
  return `market:listings:v1:${epoch}:${digest}`;
}

export async function readPublicListings({ redis, query, load, parse }) {
  const epoch = (await redis.get("market:listings:epoch")) ?? "0";
  const key = cacheKey(epoch, query);
  const cached = await redis.get(key);
  if (cached !== null) {
    return { source: "cache", value: parse(JSON.parse(cached)) };
  }

  if (!inflight.has(key)) {
    const promise = (async () => {
      const loaded = parse(await load());
      await redis.setEx(key, 30, JSON.stringify(loaded));
      return loaded;
    })().finally(() => inflight.delete(key));
    inflight.set(key, promise);
  }

  return { source: "database", value: await inflight.get(key) };
}

export async function invalidatePublicListings(redis) {
  return redis.incr("market:listings:epoch");
}
```

`MockRedis` 故意不实现 TTL 和网络错误，因此类名和任务卡都不能省略 MOCK 标签。`parse` 由调用者
提供，让数据库结果和缓存命中经过同一个领域解析器。

### 6.2 创建可观察测试

创建完整文件 `cache/cache-aside.test.mjs`：

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  MockRedis,
  invalidatePublicListings,
  readPublicListings,
} from "./cache-aside.mjs";

const query = { scope: "public", q: "台灯", sort: "newest", limit: 20 };
const page = {
  items: [{
    id: "listing-1",
    title: "台灯",
    priceCents: 1990,
    createdAt: "2026-10-11T08:00:00.000Z",
  }],
  nextCursor: null,
};

function parse(value) {
  assert.equal(Number.isSafeInteger(value.items[0].priceCents), true);
  assert.match(value.items[0].createdAt, /Z$/);
  return structuredClone(value);
}

test("MOCK: cache-aside hits, invalidates by epoch, and coalesces one process", async () => {
  const redis = new MockRedis();
  let loads = 0;
  const load = async () => {
    loads += 1;
    await Promise.resolve();
    return page;
  };

  const firstWave = await Promise.all([
    readPublicListings({ redis, query, load, parse }),
    readPublicListings({ redis, query, load, parse }),
    readPublicListings({ redis, query, load, parse }),
  ]);
  assert.equal(loads, 1);
  assert.equal(firstWave.every((result) => result.value.items[0].priceCents === 1990), true);

  const hit = await readPublicListings({ redis, query, load, parse });
  assert.equal(hit.source, "cache");
  assert.equal(loads, 1);

  await invalidatePublicListings(redis);
  const afterWrite = await readPublicListings({ redis, query, load, parse });
  assert.equal(afterWrite.source, "database");
  assert.equal(loads, 2);
});

test("MOCK: refuses user-private response scope", async () => {
  const redis = new MockRedis();
  await assert.rejects(
    readPublicListings({
      redis,
      query: { ...query, scope: "user:user-1" },
      load: async () => page,
      parse,
    }),
    /only public/,
  );
});
```

运行：

```bash
node --test cache/cache-aside.test.mjs
```

预期 2 条测试通过：第一波三个请求只调用一次 `load`，随后命中缓存，epoch 推进后重新加载。
这只能证明当前 Node 进程和 Map 的行为，不能写成“Redis 击穿已解决”。

## 7. 邻里集市集成案例

### 7.1 真实 Redis 适配边界

真实适配器可把 `get`、`setEx`、`incr` 映射到项目锁定的 Redis 客户端。初始化时记录：

```bash
redis-server --version
redis-cli --version
redis-cli -u 'redis://127.0.0.1:6379' PING
pnpm list --depth 0
```

连接 URL 只使用本地占位值；不要在命令历史、日志或报告中暴露密码。TLS、ACL、集群和云服务
需要各自真实环境验证，`PING` 只证明一次控制连接成功。

适配器应区分：

- cache miss：`GET` 正常返回 null；
- cache corrupt：JSON/领域解析失败，删除 key 并回源；
- Redis unavailable：记录低敏事件，受限回源；
- database unavailable：返回受控依赖错误，不能用无限陈旧值冒充当前业务事实。

### 7.2 写路径

邻里集市更新商品：

```text
PostgreSQL transaction:
  检查 owner/version
  UPDATE title/priceCents/status/version
  INSERT outbox(cache.listings.invalidate)
COMMIT
尝试 INCR market:listings:epoch
成功：标记失效事件完成
失败：outbox dispatcher 稍后重试；短 TTL 限制窗口
```

价格仍是整数分，更新时间在数据库持久化为 timestamptz 并对外规范成 UTC ISO。`INCR` 必须发生
在 COMMIT 后；若在提交前推进，回滚也会制造无意义 miss。

### 7.3 缓存击穿策略的选择

邻里集市当前单体先使用：

1. 进程内 single-flight；
2. 30 秒基础 TTL + 小范围抖动；
3. 每实例受限回源并发；
4. Redis 错误 fail-open 到数据库，但过载时返回受控 503；
5. 公共列表才缓存，预约与 owner/version 检查绕过。

多实例热点仍超载时，再评估 Redis 租约锁。锁值使用随机 token，释放使用原子 compare-delete：

```lua
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
end
return 0
```

这是设计片段，不是本课已运行证据。还需验证租约过期、加载超时、持锁进程崩溃和等待者退避。

### 7.4 可观察故障手册

在授权的本地 Redis 运行：

1. 预热一个公共列表 key，记录一次命中；
2. 停止 Redis；
3. 请求公共列表，预期受限回源并记录 `cache_unavailable`；
4. 请求预约，仍由 PostgreSQL 事务裁决；
5. 恢复 Redis，下一次读取重建缓存；
6. 核对日志不包含 q 原文、Cookie、连接串或缓存正文。

若未实际执行，报告写“手册待运行”。不能把 MOCK 测试的绿色输出用作真实 Redis 恢复证据。

## 8. 常见错误与排查路径

### 8.1 明确错误示例：提交后只 DEL

```text
R1 miss -> 慢 SELECT 旧值
W1 COMMIT -> DEL
R1 SET 旧值
```

- **现象**：更新成功后列表先变新，随后又短暂显示旧价格。
- **证据**：request ID 时序显示旧读开始早于 COMMIT，却在 DEL 后完成 SET；缓存值仍是旧 `priceCents`。
- **原因**：旧加载和新失效写同一个 key，delete 没有隔离在途请求。
- **修复**：使用 epoch 命名空间，或采用版本比较/写入保护；保留短 TTL 和失效重试。
- **复验**：用 deferred load 固定时序，W1 推进 epoch 后完成 R1；新请求只读新 epoch，旧值仅留在旧 key。

### 8.2 Key 漏掉排序或权限范围

- **现象**：`price_asc` 请求得到 newest 顺序，或用户看见他人的私有收藏状态。
- **证据**：两种请求计算出相同 key。
- **原因**：key 没有覆盖所有响应维度，或缓存对象混合公共和私有字段。
- **修复**：规范对象列出完整维度；私有覆盖拆开或绕过公共缓存。
- **复验**：不同 sort/cursor/scope 的摘要不同，公共值不含 user-specific 字段。

### 8.3 single-flight Promise 永久保留

- **现象**：一次数据库失败后后续请求立即复用同一拒绝。
- **证据**：inflight Map 中失败 key 没有删除。
- **原因**：只在成功分支清理。
- **修复**：在 Promise `finally` 中删除。
- **复验**：第一次 load 故意失败，第二次恢复成功并真正再次调用 load。

### 8.4 Redis 故障压垮 PostgreSQL

- **现象**：缓存断开后数据库池等待和超时急升。
- **证据**：cache error、回源并发、pool waiting 和 p95 同时上升。
- **原因**：fail-open 没有并发预算。
- **修复**：single-flight、bulkhead、速率限制、降级响应和容量预案。
- **复验**：故障注入期间数据库并发不超过设定上限，超出请求受控失败而非无限排队。

## 9. 课后题

1. **为什么缓存命中仍要做领域解析？**
   答案：缓存可能来自旧 schema、错误写入或损坏值；JSON 可解析不等于整数分、UTC 和分页合法。
2. **TTL 是否能替代显式失效？**
   答案：不能。TTL 只限制预计陈旧窗口；产品要求更及时更新时仍需提交后失效。
3. **single-flight 为什么不能解决多实例击穿？**
   答案：Map 只在一个进程内共享，每个实例仍可能各自回源一次。
4. **预约资格为什么不能从缓存判断？**
   答案：缓存允许陈旧且可丢失，预约唯一性必须由当前 PostgreSQL 事务和约束裁决。

## 10. 实践练习

### 基础：补齐缓存 key 维度

为 `status` 和 `locale` 增加规范字段。可判定标准：字段顺序固定；不同值摘要不同；q 原文不在
最终 key；原测试仍通过。

### 进阶：损坏值回源

让 MockRedis 返回合法 JSON 但 `priceCents: "1990"`。可判定标准：领域解析拒绝、损坏 key 被
删除或绕过、数据库 load 执行一次、修复值重新缓存；不能把字符串价格强制转为数字掩盖错误。

### 故障注入：失败 Promise 清理

第一次 load 抛错，第二次返回合法 page。可判定标准：第一次请求失败，inflight 不残留，第二次
真实调用 load 并成功；记录现象、证据、原因、修复和复验。

## 11. 阶段验收

- [ ] cache-aside hit/miss、epoch 失效和单进程合并有测试；
- [ ] key 包含 schema、epoch、规范查询和公开 scope；
- [ ] q 原文、Cookie、Token 和完整响应不进入日志/key；
- [ ] 朴素 DEL 的旧读回填竞态能被准确复述；
- [ ] 写路径在 PostgreSQL COMMIT 后失效，失败有 TTL 与 outbox 恢复；
- [ ] 预约、对象授权、version 冲突和唯一性绕过缓存；
- [ ] Redis 故障回源有并发保护；
- [ ] MOCK 结果没有被报告为真实 Redis 证据。

## 12. 常见问题

**能否缓存 404？**
可以短暂缓存公共“确实不存在”，但创建后要失效；涉及权限隐藏时不能用公共 negative cache
泄露资源存在性。

**epoch 会不会一直增长？**
Redis 整数范围很大，但仍应监控和设计恢复。Redis 丢失后 epoch 回到默认值可能撞上旧 key，
因此 key 还应带部署/schema generation，或恢复时推进新的 namespace。

**缓存 JSON 还是二进制格式？**
先选择可版本化、可解析、可观测的格式。任何格式都需要 schema 版本和值域校验；二进制不自动
更安全。

**是否应该把缓存和 BullMQ 放同一个 Redis？**
生产通常应评估隔离，因为缓存淘汰和队列持久性目标不同。小型环境若共享，也要明确内存策略、
容量和故障影响，不能把缓存淘汰配置直接用于任务。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Redis：Cache-aside pattern](https://redis.io/learn/howtos/solutions/microservices/caching)
- [Redis `SET`](https://redis.io/docs/latest/commands/set/)
- [Redis `INCR`](https://redis.io/docs/latest/commands/incr/)
- [Redis distributed locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/)
- [Redis eviction](https://redis.io/docs/latest/develop/reference/eviction/)
- [AWS Builders' Library：Caching challenges and strategies](https://aws.amazon.com/builders-library/caching-challenges-and-strategies/)

## 我现在能做到什么

我能把 Redis 限定为可丢失派生副本，设计完整缓存 key、cache-aside 与 epoch 失效，用
single-flight 和回源预算控制击穿，并明确关键业务仍由 PostgreSQL 裁决。

## 单元导航

- 章节目录：[08 Redis、Outbox 与队列](../README.md#08-redisoutbox-与队列)
- 上一课：[上传流、类型、存储与清理](../07-search-pagination-files/03-upload-streams-type-storage-cleanup.md)
- 下一课：[事务 Outbox 与一致性](02-transactional-outbox-consistency.md)
