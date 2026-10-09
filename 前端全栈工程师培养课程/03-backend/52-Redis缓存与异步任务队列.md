# 52-Redis 缓存与异步任务队列

## 目标

数据库是后端的事实来源，但让每次请求都直接打到数据库，既慢又贵：热门内容被反复读取，耗时操作（发邮件、生成报表、调用第三方）会阻塞用户响应。解决这两类问题的工业标准组件是 Redis——前半程作为缓存挡住读压力，后半程作为队列底座把耗时工作异步化。

本单元把“缓存”和“异步任务”放在同一个 Redis 主题下学习：它们共享一套数据结构思维，也共同出现在每一个真实后端系统中。

完成本知识单元后，学员应能够：

1. 说出 Redis 五种核心数据结构及其典型场景，能为计数器、去重、排行榜、消息流等需求选择正确结构。
2. 在 Node.js 中使用 ioredis 连接 Redis，设计带前缀与版本的键名，完成读写与过期操作。
3. 实现 cache-aside 与 read-through 缓存模式，并能解释 write-through/write-behind 的差异。
4. 治理缓存穿透、击穿、雪崩三类高并发故障，合理使用 TTL、空值缓存、互斥锁与随机过期。
5. 设计缓存一致性方案：更新数据库后删除缓存、延迟双删，并理解短暂不一致窗口的客观存在。
6. 使用 BullMQ 创建队列与 Worker，配置重试、指数退避、延迟任务、并发度与定时（repeatable）任务，并保证消费者幂等。

本单元的核心信念是：缓存是“以一致性换性能”的工程取舍，队列是“以异步换吞吐”的工程取舍；两者的价值与风险都来自这个取舍本身，必须显式设计而非默认开启。

## 技术栈

| 工具或库 | 当前稳定版本线 | 用途 | 学习要求 |
|---|---|---|---|
| Redis | 7.x 稳定版 | 内存数据库：缓存、计数器、队列底座 | 掌握五种结构、TTL、持久化与内存淘汰概念 |
| ioredis | 5.x 稳定版 | Node.js Redis 客户端 | 掌握连接、命令 Promise、pipeline、键前缀 |
| BullMQ | 5.x 稳定版 | 基于 Redis 的任务队列 | 掌握 Queue、Worker、Job、重试、延迟、repeatable |
| @bull-board/api + ui | 当前稳定版 | 队列可视化（可选） | 会在开发环境观察任务状态 |
| Node.js | 当前 LTS | 运行 Worker 进程 | 理解队列生产者与消费者可分属不同进程 |
| Docker | 当前稳定版 | 本地启动 Redis | 会用固定版本镜像映射 6379 端口 |
| pnpm | 当前稳定版 | 依赖与脚本管理 | 统一启动 API 与 Worker 的脚本 |

约定：

- 本地 Redis 通过 Docker 启动，镜像固定版本（如 `redis:7-alpine`），地址来自环境变量 `REDIS_URL`，不写死在代码里。
- 键名统一格式 `app:<domain>:<id>`，并保留版本升级位（如 `app:v2:user:<id>`），便于灰度与批量失效。
- 所有缓存 TTL 必须显式设置，不写入永久键；示例值使用秒为单位。
- 队列名、任务名使用小写加冒号的领域命名（如 `email`、`report:weekly`）。

开始前检查环境：

```bash
docker version
```

随后启动本地 Redis：

```bash
docker run -d --name redis-lab -p 6379:6379 redis:7-alpine
docker exec -it redis-lab redis-cli ping
```

预期观察：`PING` 返回 `PONG`。练习结束后可用 `docker rm -f redis-lab` 清理。

## 详细的理论知识讲解和示例伪代码

### 1. Redis 是什么与数据结构

#### 1.1 Redis 的定位

Redis（Remote Dictionary Server）是把数据主要存放在内存中的键值数据库，读写下通常在亚毫秒级。它支持持久化（RDB/AOF）、主从复制与高可用集群，在后端常承担四类角色：

```text
1. 缓存：挡住热点数据的读请求
2. 计数器/限流器：原子 INCR、过期窗口
3. 协作结构：排行榜（有序集合）、去重（集合）、消息流（列表/流）
4. 队列底座：BullMQ 等框架在其结构上实现可靠任务队列
```

内存模型决定了它不适合存放大体积、低访问频率的数据；单实例内存容量是规划中的硬约束。

#### 1.2 五种核心结构

| 结构 | 特征 | 典型命令 | 典型场景 |
|---|---|---|---|
| String | 字符串/数字/二进制 | GET SET INCR EXPIRE | 缓存对象 JSON、计数器、分布式锁 |
| Hash | 字段-值映射 | HGET HSET HGETALL | 用户资料、购物车分项 |
| List | 有序可重复序列 | LPUSH RPOP LRANGE | 简单消息队列、最新列表 |
| Set | 无序不重复集合 | SADD SISMEMBER SINTER | 标签去重、共同关注、抽奖 |
| ZSet | 带分数的有序集合 | ZADD ZRANGE ZREVRANGE | 排行榜、延迟排序、热点榜 |

另有 Stream（可持久化、支持消费组的消息流）、Bitmap（位统计）、HyperLogLog（基数估算）等扩展结构，BullMQ 底层就综合使用了多种结构。

#### 1.3 结构选择示例

```text
需求：文章浏览量
  String + INCR：article:views:<id>，原子累加

需求：用户已点赞的文章（防重复点赞）
  Set：user:<id>:likes，SISMEMBER 判断

需求：本周热文榜
  ZSet：rank:weekly，score 为热度分，ZREVRANGE 取前 10

需求：用户资料（只想改单个字段）
  Hash：user:<id>，HSET 更新局部字段
```

#### 1.4 与后端系统的关系

选错结构不会立刻报错，但会在规模上付出代价：用 String 存整个对象导致每次局部更新都要读出全量；用 List 做去重导致重复任务。结构选择是缓存与队列设计的第一步决策。

#### 1.5 常见误区

> 误区一：把 Redis 当成“更快的主数据库”，不保留持久化数据库。

内存数据在故障、淘汰、误删下会丢失；缓存的权威数据必须在数据库中可重建。

> 误区二：不设 TTL，键只增不减。

内存会被长期不用的数据占满，触发淘汰策略甚至写入失败。

### 2. Node.js 客户端与基本操作

#### 2.1 安装与连接

```bash
pnpm add ioredis
```

```ts
// src/redis/client.ts
import { Redis } from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // BullMQ 要求该配置；纯缓存使用时可用默认值
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => {
  // 记录但不崩溃：缓存故障时系统应能降级直连数据库
  console.error('redis error', err.message);
});
```

键前缀统一注入，避免多应用共用 Redis 时互相覆盖：

```ts
export const namespaced = new Redis(env.REDIS_URL, {
  keyPrefix: 'app:',
});
```

#### 2.2 基本读写与过期

```ts
// 写入并设置 60 秒过期
await redis.set('article:100', JSON.stringify(article), 'EX', 60);

// 读取
const raw = await redis.get('article:100');
const data = raw ? JSON.parse(raw) : null;

// 原子计数 + 首次写入时设置过期
const views = await redis.incr('article:100:views');
if (views === 1) {
  await redis.expire('article:100:views', 24 * 60 * 60);
}
```

#### 2.3 原子操作与 pipeline

```ts
// Hash 局部更新
await redis.hset('user:100', { name: '小林', level: 3 });
const level = await redis.hget('user:100', 'level');

// ZSet 排行榜
await redis.zadd('rank:weekly', 42, 'article:100');
const top = await redis.zrevrange('rank:weekly', 0, 9, 'WITHSCORES');

// pipeline 一次往返执行多条命令，适合批量写入
const pipe = redis.pipeline();
for (const item of items) {
  pipe.set(`item:${item.id}`, JSON.stringify(item), 'EX', 300);
}
await pipe.exec();
```

存量 CommonJS 服务里使用 ioredis 的写法如下，命令同样以 Promise 返回，可用 async 函数组织：

```js
// src/redis/counter.js
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

async function incrementViews(articleId) {
  const key = `app:article:${articleId}:views`;
  const views = await redis.incr(key);
  if (views === 1) {
    await redis.expire(key, 24 * 60 * 60);
  }
  return views;
}

module.exports = { incrementViews };
```

#### 2.4 键设计规范

```text
格式：app:<domain>:<id>[:field]
示例：app:user:1001
      app:article:100:views
      app:v2:feed:recommended

规则：
- 全小写，冒号分层，不出现空格
- id 不含用户可控原始字符（避免注入式键名）
- 大批量同类键保留版本前缀，失效时按版本整体切换
```

#### 2.5 常见误区

> 误区一：循环里逐条 await，一百条数据一百次网络往返。

用 pipeline 合并；网络往返在 Redis 操作中往往比命令本身更耗时。

> 误区二：缓存值直接 JSON.parse 不做异常处理。

脏数据或版本不兼容会让解析抛错；解析失败应视为未命中并回源。

### 3. 缓存模式

#### 3.1 Cache-Aside（旁路缓存）：最主流

应用同时管理缓存与数据库：读时先查缓存，未命中再查数据库并回填；写时更新数据库并使缓存失效。缓存与应用解耦，Redis 宕机时系统仍可直连数据库运行。

```ts
// src/cache/cache-aside.ts
import { redis } from '../redis/client';
import type { ArticleRepository } from '../repositories/article.repository';

export class CachedArticleService {
  constructor(
    private readonly repo: ArticleRepository,
    private readonly ttlSeconds = 300,
  ) {}

  async getById(id: string) {
    const key = `article:${id}`;

    // 1. 查缓存
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as Article;
    }

    // 2. 未命中，回源数据库
    const article = await this.repo.findById(id);
    if (article) {
      // 3. 回填缓存
      await redis.set(key, JSON.stringify(article), 'EX', this.ttlSeconds);
    }
    return article;
  }
}
```

#### 3.2 Read-Through：由缓存层负责回源

读穿模式下应用只向缓存层请求，缓存层自身在未命中时调用加载器。代码上通常以“带 loader 的通用缓存包装”实现：

```ts
// src/cache/read-through.ts
export async function readThrough<T>(
  key: string,
  loader: () => Promise<T | null>,
  ttlSeconds: number,
): Promise<T | null> {
  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }

  const value = await loader();
  if (value !== null) {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }
  return value;
}

// 使用
const article = await readThrough(
  `article:${id}`,
  () => repo.findById(id),
  300,
);
```

cache-aside 与 read-through 在请求路径上看似相似，区别在于“谁知道数据库的存在”：旁路缓存里应用知道，读穿里只有缓存层知道，业务代码更干净。

#### 3.3 Write-Through 与 Write-Behind

```text
Write-Through（写穿）：
  写请求同时更新缓存与数据库，两者在一次操作内同步完成
  优点：读到的永远是新值
  缺点：写延迟被数据库拖住，缓存价值在写上打折

Write-Behind / Write-Back（写回）：
  先写缓存立即返回，由后台异步批量落库
  优点：写吞吐极高
  缺点：落库前宕机会丢数据，需要可靠队列与重试，风险最高
```

| 模式 | 读复杂度 | 一致性 | 典型场景 |
|---|---|---|---|
| Cache-Aside | 低 | 最终一致 | 通用业务读多写少 |
| Read-Through | 低 | 最终一致 | 希望业务代码不感知数据源 |
| Write-Through | 中 | 强 | 读写都要即时可见 |
| Write-Behind | 高 | 最终一致且有窗口 | 写入量巨大、可容忍延迟（日志聚合） |

Web 业务默认从 cache-aside 起步，只有明确的吞吐/一致性需求才升级其他模式。

#### 3.4 常见误区

> 误区一：写操作只更新缓存、不更新数据库。

缓存被淘汰或 Redis 重启后新值消失；数据库永远是权威来源。

> 误区二：所有数据一视同仁加缓存。

低访问率数据的缓存收益小于其一致性维护成本；缓存应集中在热点。

### 4. TTL 与缓存三大故障

#### 4.1 缓存穿透：查询根本不存在的数据

请求的 key 在缓存和数据库中都不存在，每次都“缓存未命中 → 打数据库”。攻击者用大量不存在的 id 即可压垮数据库。

```text
治理：
1. 空值缓存：数据库查不到也缓存一个空标记，TTL 较短（如 60 秒）
2. 参数校验：非法 id（负数、格式错误）在入口直接拒绝
3. 布隆过滤器：大规模场景在缓存前挡一层“可能存在性”判断
```

```ts
const NULL_PLACEHOLDER = '__NULL__';

async function getArticle(id: string) {
  const key = `article:${id}`;
  const cached = await redis.get(key);
  if (cached === NULL_PLACEHOLDER) return null;
  if (cached) return JSON.parse(cached);

  const article = await repo.findById(id);
  if (!article) {
    // 空值短缓存，挡住重复穿透
    await redis.set(key, NULL_PLACEHOLDER, 'EX', 60);
    return null;
  }

  await redis.set(key, JSON.stringify(article), 'EX', 300);
  return article;
}
```

#### 4.2 缓存击穿：单个热点键恰好失效

热点 key 过期的一瞬间，大量并发请求同时未命中，全部涌向数据库。

```text
治理：
1. 互斥锁：只允许一个请求回源重建，其余等待或读旧值
2. 热点键不过期（逻辑过期）：由后台任务主动刷新
```

```ts
async function getHotArticle(id: string) {
  const key = `article:${id}`;
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);

  const lockKey = `lock:article:${id}`;
  // SET NX EX：抢锁成功才回源
  const locked = await redis.set(lockKey, '1', 'NX', 'EX', 10);

  if (locked) {
    try {
      const article = await repo.findById(id);
      await redis.set(key, JSON.stringify(article), 'EX', 300);
      return article;
    } finally {
      await redis.del(lockKey);
    }
  }

  // 没抢到锁：短暂等待后重读缓存
  await new Promise((r) => setTimeout(r, 50));
  const rebuilt = await redis.get(key);
  return rebuilt ? JSON.parse(rebuilt) : null;
}
```

#### 4.3 缓存雪崩：大量键在同一时刻集体失效

TTL 相同的一批缓存同时过期，或 Redis 整体宕机，流量瞬间全部压向数据库。

```text
治理：
1. TTL 加随机抖动：基础 TTL ± 随机秒数，把失效时间打散
2. 多级缓存/本地缓存：Redis 故障时的最后一层缓冲
3. 熔断与限流：数据库侧设置保护，宁可部分降级不可整体打挂
4. Redis 高可用部署：从实例与哨兵/集群降低整体不可用概率
```

```ts
function ttlWithJitter(baseSeconds: number): number {
  const jitter = Math.floor(Math.random() * 120); // 0 至 119 秒随机
  return baseSeconds + jitter;
}

await redis.set(key, JSON.stringify(value), 'EX', ttlWithJitter(300));
```

#### 4.4 三类问题对比

| 问题 | 触发条件 | 首选治理 |
|---|---|---|
| 穿透 | 数据不存在 | 空值缓存 + 入口校验 |
| 击穿 | 单点热点失效 | 互斥锁/逻辑过期 |
| 雪崩 | 大面积同时失效或宕机 | TTL 抖动 + 熔断限流 + 高可用 |

#### 4.5 常见误区

> 误区一：空值缓存设置与正常数据一样长的 TTL。

数据稍后被创建时，用户长时间读到空结果；空值 TTL 应明显更短。

> 误区二：互斥锁不设过期。

持锁进程崩溃导致死锁，所有后续请求永远拿不到数据；锁必须带 TTL。

### 5. 缓存一致性

#### 5.1 一致性问题的来源

cache-aside 下缓存与数据库是两个独立系统，写操作无法在同一个原子事务里更新二者，因此必然存在短暂不一致窗口。工程目标不是“绝对强一致”（那应放弃缓存），而是“把窗口压到可接受、方向可控”。

#### 5.2 推荐策略：先更新数据库，再删除缓存

```text
写流程：
1. 更新数据库
2. 删除缓存（而不是更新缓存）

为什么是删除而不是更新：
- 更新缓存要求写线程重算值，并发写顺序错乱时缓存可能停在旧值
- 删除后下一次读触发回源，拿到的一定是数据库当前值
- 写多读少场景下更新缓存会做大量无用功
```

```ts
// src/cache/article-write.service.ts
export async function updateArticle(id: string, patch: ArticlePatch) {
  // 1. 更新数据库
  const updated = await repo.update(id, patch);

  // 2. 删除缓存（删失败要可补救，见 5.3）
  await redis.del(`article:${id}`);

  return updated;
}
```

#### 5.3 删除失败怎么办：重试与订阅

```text
风险：数据库更新成功，redis.del 失败 → 旧值一直留到 TTL
补救（按场景选择）：
1. 删除操作入队异步重试（本单元第 6 节起的队列正好承担）
2. 延迟双删：更新库后删一次，等待数百毫秒后再删一次，兜住并发读回填旧值
3. 订阅数据库变更日志（CDC），由消费者统一删缓存，业务代码不直接操作
```

延迟双删伪代码：

```text
更新数据库
删除缓存
等待一个略大于“一次读事务 + 回填”的时间（如 500 毫秒）
再次删除缓存
```

#### 5.4 需要强一致的读怎么办

对“支付结果确认”“账户余额展示”这类不容忍旧值的读：

```text
- 该接口不读缓存，直接查数据库
- 或写操作后的短时间内强制绕过缓存（携带 bypass 标记）
- 为关键写接口配置“写后主动刷新 + 版本号校验”，回填时比对版本防止旧值覆盖新值
```

#### 5.5 与后端系统的关系

一致性事故往往在高并发写时暴露：后台显示已修改，用户端仍是旧内容并投诉。设计阶段必须为每个缓存实体写清三件事：写时失效策略、失效失败的补救、TTL 上限（兜底窗口）。

#### 5.6 常见误区

> 误区一：先删缓存再更新数据库。

删缓存后、库更新前有读请求，会把旧值重新回填，不一致窗口被放大；顺序应为先库后缓存。

> 误区二：给缓存设超长 TTL 又没有删除补救。

删除一旦失败，旧值停留可达数小时；TTL 是最后兜底，不能只靠它。

### 6. BullMQ 队列与 Job 生命周期

#### 6.1 为什么需要任务队列

发邮件、生成 PDF、调用慢速第三方、批量同步数据，如果放在请求线程内同步执行，用户要等到全部完成才得到响应，任何一步超时整个请求失败。任务队列把“要做的事”落成可持久化的 Job，由独立 Worker 异步消费。

```text
API 进程（生产者）：用户点击“发送”
  ↓ queue.add(...)，立即返回“已提交”
Redis（队列存储）：Job 被持久化，API 宕机也不丢
Worker 进程（消费者）：取出 Job，执行真正的发送，结果回写
```

#### 6.2 安装与创建队列

```bash
pnpm add bullmq
```

```ts
// src/queues/email.queue.ts
import { Queue } from 'bullmq';
import { env } from '../config/env';

export const emailQueue = new Queue('email', {
  connection: { url: env.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 24 * 3600 },
    removeOnFail: { age: 7 * 24 * 3600 },
  },
});

export type EmailJobData = {
  to: string;
  template: 'welcome' | 'reset-password';
  payload: Record<string, string>;
  reqId?: string;
};

export async function enqueueWelcomeEmail(to: string, name: string, reqId: string) {
  return emailQueue.add('send-welcome', {
    to,
    template: 'welcome',
    payload: { name },
    reqId,
  } satisfies EmailJobData);
}
```

#### 6.3 Job 的生命周期状态

```text
waiting（等待） → active（执行中） → completed（完成）
                    ↓ 失败且还有剩余次数
                  delayed（退避等待） → waiting → active
                    ↓ 次数耗尽
                  failed（失败，保留记录）

其他状态：
prioritized（按优先级插入）
paused（队列暂停，不被消费）
waiting-children（父任务等待子任务完成）
```

可视化：开发环境可用 Bull Board 挂载面板，直接观察各队列状态、失败原因与重试次数。

#### 6.4 与后端系统的关系

队列把请求的响应延迟与工作的实际耗时解耦：接口稳定在毫秒级返回，Worker 按自身节奏消费，还可以通过增加 Worker 数量水平扩展消费能力。Redis 持久化让任务不随应用重启丢失。

#### 6.5 常见误区

> 误区一：把队列当成“万能异步”，不考虑失败结果。

Job 最终 failed 后要有告警与人工/自动补偿，否则任务静默消失。

> 误区二：completed/failed 记录立即删除。

排查问题无据可查；应保留一段时间（按年龄或数量）。

### 7. Worker、重试、延迟与并发

#### 7.1 创建 Worker

```ts
// src/workers/email.worker.ts
import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { sendEmail } from '../mail/send-email';
import { logger } from '../logger/logger';
import type { EmailJobData } from '../queues/email.queue';

export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    'email',
    async (job: Job<EmailJobData>) => {
      logger.info(
        { jobId: job.id, reqId: job.data.reqId, event: 'email_job_start' },
        '开始处理邮件任务',
      );

      await sendEmail({
        to: job.data.to,
        template: job.data.template,
        payload: job.data.payload,
      });

      return { sentTo: job.data.to };
    },
    {
      connection: { url: env.REDIS_URL },
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error(
      {
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
        err,
        event: 'email_job_failed',
      },
      '邮件任务失败',
    );
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, event: 'email_job_completed' }, '邮件任务完成');
  });

  return worker;
}
```

Worker 可以作为独立入口启动：

```ts
// src/worker-entry.ts
import { startEmailWorker } from './workers/email.worker';

startEmailWorker();
console.log('email worker started');
```

```json
{
  "scripts": {
    "start:worker": "tsx src/worker-entry.ts"
  }
}
```

#### 7.2 重试与退避策略

```ts
await queue.add('sync-profile', data, {
  attempts: 5,
  backoff: {
    type: 'exponential', // 2^attempt × delay：2s,4s,8s...
    delay: 2000,
  },
});
```

```text
重试纪律：
- 只对“可恢复错误”重试：网络抖动、429、502
- 对“确定性错误”不重试：邮箱格式非法、参数缺失（重试结果不会变）
- 在 Job 中根据错误类型决定是否 throw（throw 才触发重试）
```

```ts
async function processor(job: Job) {
  try {
    await callRemote();
  } catch (err) {
    if (isRetryable(err) && job.attemptsMade < job.opts.attempts!) {
      throw err; // 交给 BullMQ 退避重试
    }
    throw new UnrecoverableError('参数非法，终止重试'); // 直接进 failed
  }
}
```

#### 7.3 延迟任务

```ts
// 30 分钟后执行（如未支付订单自动取消）
await orderQueue.add(
  'cancel-if-unpaid',
  { orderId },
  { delay: 30 * 60 * 1000, jobId: `cancel:${orderId}` },
);
```

固定 jobId 还能防止重复入队：同一业务只存在一个取消任务。若订单提前支付，可在支付成功后按 jobId 移除该延迟任务。

#### 7.4 并发度与背压

```text
concurrency：单个 Worker 同时处理的任务数
  调大 → 吞吐上升，但对下游（数据库/第三方）的并发压力同步上升
  原则：以最慢下游可承受的并发为上限，而不是本机 CPU 核数

背压：生产速度持续大于消费速度时
  限制入队速率、增加 Worker、监控队列积压长度，积压超阈值告警
```

#### 7.5 优雅关停

收到 SIGTERM 时调用 `worker.close()`：不再领取新任务、等待在途任务结束后退出，避免任务在执行中被硬终止造成半成品。

#### 7.6 常见误区

> 误区一：对所有异常统一重试到次数耗尽。

参数类错误被无谓重试，还可能把“重复提交”副作用放大（如重复发券）；用 UnrecoverableError 区分。

> 误区二：concurrency 只增不减，不看下游容量。

把第三方服务打到限流雪崩，重试流量再二次冲击，形成恶性循环。

### 8. 定时任务与消费者幂等

#### 8.1 Repeatable 定时任务

BullMQ 支持按重复规则（cron 或固定间隔）反复调度任务：

```ts
// 每周一早上 9 点生成周报
await reportQueue.add(
  'weekly-report',
  { type: 'weekly' },
  {
    repeat: {
      pattern: '0 9 * * 1',
      tz: 'Asia/Shanghai',
    },
    jobId: 'report:weekly', // 固定标识避免重复注册多份
  },
);
```

```text
注意：
- repeat 任务注册一次即可；重复 add 相同规则会产生多份调度
- 每次触发产生一个独立 Job，各自走完整重试与状态记录
- 不再需要时用 removeRepeatableByKey 精确注销
```

#### 8.2 幂等：消费者必须可安全重复执行

队列天然“至少一次”投递：重试、网络抖动、Worker 崩溃恢复都可能让同一个 Job 被执行多次。幂等性保证“同一任务执行一次和执行多次，结果相同”。

非幂等的典型事故：Job 执行成功但回写完成状态前 Worker 重启，重试后再次扣款/发券/加积分。

#### 8.3 三种幂等实现

```ts
// 方式 1：业务唯一键 + 数据库唯一约束（最可靠）
async function grantCoupon(job: Job<{ userId: string; couponId: string }>) {
  const grantKey = `${job.data.userId}:${job.data.couponId}`;
  try {
    await db.query(
      'INSERT INTO coupon_grants(unique_key, user_id, coupon_id) VALUES ($1,$2,$3)',
      [grantKey, job.data.userId, job.data.couponId],
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      logger.info({ event: 'duplicate_grant_skipped' }, '重复发券任务，跳过');
      return; // 已发过，视为成功
    }
    throw err;
  }
  await doIssueCoupon(job.data);
}
```

```ts
// 方式 2：任务处理状态标记（先占位再执行）
// SET NX：只有首次执行能写入标记
const firstRun = await redis.set(
  `job-done:${job.id}`,
  '1',
  'NX',
  'EX',
  24 * 3600,
);
if (!firstRun) {
  logger.info({ jobId: job.id }, '任务已执行，幂等返回');
  return;
}
await doTheWork();
```

```text
方式 3：下游操作本身幂等
- 调用第三方时携带同一 Idempotency-Key，对方据此去重
- “设置状态为 paid”比“余额 +100”更天然幂等
优先让下游幂等，再叠加本地唯一约束，形成双保险
```

#### 8.4 副作用任务的检查清单

```text
每个写副作用 Job 上线前回答：
1. 同一 jobId 被执行两次，会重复扣款/发券/发邮件吗？
2. 执行成功但确认消息丢失，重试路径是否安全？
3. 唯一键用什么（业务键优先于随机 jobId）？
4. 去重标记与业务写入是否在同一事务内？
```

第 3 点尤其关键：去重标记和业务写入若分属两个系统且不在同一事务，“标记成功、业务失败”或反过来都会破坏幂等，应优先用数据库唯一约束这类单点机制。

#### 8.5 与后端系统的关系

定时任务让周报、账单、数据对账自动运行；幂等则是整个队列体系可重试、可恢复的前提。没有幂等保证时，团队不敢开重试、不敢重启 Worker，队列就退化成“只能成功不能出错”的脆弱系统。

#### 8.6 常见误区

> 误区一：认为 BullMQ 配置了重试就“消息只投递一次”。

重试与恢复机制恰恰可能让任务多次执行；幂等是业务方必须兑现的承诺。

> 误区二：用随机 jobId 做幂等键。

每次重试/重新入队 jobId 变化，去重失效；应使用稳定的业务唯一键。

## 课后题

1. Redis 五种核心数据结构分别适合什么场景？请为“文章浏览量、防重复点赞、本周热文榜、局部更新用户资料”各选一种并说明理由。
2. 为什么 Redis 不应替代主数据库做权威存储？键为什么必须设置 TTL？
3. cache-aside 的读流程分哪三步？它与 read-through 的本质区别（“谁知道数据库存在”）是什么？
4. write-through 与 write-behind 在一致性与写延迟上如何取舍？什么场景才值得使用风险最高的 write-behind？
5. 缓存穿透、击穿、雪崩分别由什么触发？请各配一个首选治理手段。
6. 缓存一致性为什么推荐“先更新数据库、再删除缓存”，而不是“更新缓存”或“先删缓存”？删除失败有哪三种补救？
7. 场景分析：大促零点，大量商品详情缓存使用相同的 5 分钟 TTL，五分钟后数据库连接被打满。请判断故障类型并给出三项改造。
8. 场景分析：攻击者用十万个不存在的文章 id 请求详情接口，数据库 CPU 打满。请分析穿透链路，用空值缓存 + 入口校验 + 布隆过滤器分层设计防线。
9. 场景分析：BullMQ 某发券任务在“发券成功、回写状态前”Worker 被重启，重试后用户收到两张券。请解释根因，并用业务唯一键 + 下游幂等键重写消费者。
10. 场景分析：周报定时任务出现重复，每周一同一周报生成了三份。请分析注册环节的问题，给出固定 jobId 与幂等消费双重修复。

## 实践练习题

### 练习 1：Redis 数据结构实操

#### 任务

在一个 Express 项目中用 Redis 实现文章浏览量统计、点赞去重与热文榜三个能力，并通过接口验证原子性与排序结果。

#### 步骤约束

1. 浏览量使用 String 的 INCR，首次计数时设置当日过期，验证并发两次接口结果为 2 且无重复计数逻辑。
2. 点赞使用 Set：SISMEMBER 判断已点赞，重复点赞返回冲突且不重复计数；取消点赞用 SREM。
3. 热文榜使用 ZSet：每次点赞 ZINCRBY，接口返回 ZREVRANGE 前 10 及分数，顺序正确。
4. 所有键使用 `app:` 前缀与冒号分层，批量准备数据使用 pipeline。

#### 提交物

- Redis 操作模块与路由；
- 三类能力的接口调用与返回记录；
- 键结构清单。

#### 验收标准

- 计数为原子操作，并发结果正确；
- 点赞不重复、可取消；
- 榜单按分数排序；
- 键名规范且均带 TTL（榜单/计数按业务周期设置）。

### 练习 2：Cache-Aside 与三大故障治理

#### 任务

为文章详情实现 cache-aside 缓存，并治理穿透、击穿、雪崩；验证 Redis 故障时系统可降级直连数据库。

#### 步骤约束

1. 读：先缓存后回源回填；不存在的 id 做空值短缓存；正常 TTL 加 0 至 120 秒随机抖动。
2. 热点 id 使用 `SET NX EX` 互斥锁，保证只有一次回源；锁必须带过期，未抢到锁的请求等待后重读。
3. 写：先更新数据库再删除缓存；提供延迟双删实现并注释两次删除各自兜住的竞态。
4. 断开 Redis 重复请求，验证接口仍能返回（降级直连）且不崩溃。

#### 提交物

- 缓存服务读写代码；
- 三类治理的关键实现；
- 降级与并发回源的验证记录。

#### 验收标准

- 未命中/空值/热点/批量过期四类场景均有对策；
- 并发下数据库只被回源一次（击穿场景）；
- 写后读到新值，删除失败有补救路径；
- Redis 宕机不影响可用性。

### 练习 3：BullMQ 邮件/报表队列与幂等消费

#### 任务

使用 BullMQ 实现“欢迎邮件异步发送 + 每周报表定时生成”，配置重试、退避、延迟与并发，并保证消费者幂等、关停优雅。

#### 步骤约束

1. Queue 配置 attempts、exponential backoff、完成/失败记录保留策略；Worker 独立进程启动，concurrency 明确并说明依据。
2. 处理器对确定性错误抛出 UnrecoverableError 立即终止，对网络类错误 throw 触发重试。
3. 注册一个 cron 定时报表任务（固定 jobId），演示重复注册不会产生多份调度，并写出注销方式。
4. 幂等：消费者用业务唯一键 + 唯一约束去重，模拟“执行后重启”的重试，断言副作用只发生一次。
5. SIGTERM 时 worker.close() 优雅退出，在途任务完成后进程结束。

#### 提交物

- Queue、Worker、定时注册与处理器代码；
- 幂等去重实现；
- 重试、定时、优雅关停三类运行记录。

#### 验收标准

- 接口立即返回，任务异步完成；
- 可恢复错误按退避重试、确定性错误不重试；
- 同一任务执行多次副作用只生效一次；
- 关停无半成品任务、无残留进程。

## 阶段验收作业

### 作业名称

Redis 缓存 + BullMQ 异步任务的完整后端方案

### 作业场景

团队要为“文章 + 账户”模块接入 Redis：热点读取走缓存并能抗住高并发故障，耗时操作（邮件、报表、订单超时取消）走 BullMQ 异步执行，系统在 Redis 抖动、任务重试、实例重启三类情况下都不产生重复副作用。评审关注设计取舍是否说清、故障治理是否闭环、消费者是否真正幂等。

### 提交物

```text
redis-backend/
├── src/
│   ├── redis/
│   │   └── client.ts
│   ├── cache/
│   │   ├── article-cache.ts
│   │   └── cache-aside.ts
│   ├── queues/
│   │   ├── email.queue.ts
│   │   └── report.queue.ts
│   ├── workers/
│   │   ├── email.worker.ts
│   │   └── report.worker.ts
│   ├── services/
│   │   └── article-write.service.ts
│   ├── worker-entry.ts
│   └── app.ts
├── docker-compose.yml
└── README.md
```

提交要求：

1. 缓存：cache-aside 完整实现，穿透/击穿/雪崩三类治理齐备，写一致性含删除补救。
2. 队列：至少两个队列（即时任务 + 定时任务），含重试、退避、延迟任务（订单超时取消）、明确并发度。
3. 全部副作用消费者幂等，使用数据库唯一约束或下游幂等键，不以随机 jobId 去重。
4. docker-compose 提供固定版本 Redis；API 与 Worker 可分别启动、优雅关停。
5. README 写清键设计、TTL 策略、队列拓扑、重试与幂等方案，以及故障演练步骤。

### 演示步骤

学员在 15 分钟内完成：

1. 启动 Redis、API 与 Worker，展示接口立即返回、任务异步完成。
2. 请求不存在的文章 id 两次，展示空值缓存使第二次不打数据库。
3. 对热点键制造并发请求，展示互斥锁使数据库只回源一次。
4. 更新文章后读取，展示缓存被删除后回源为新值。
5. 制造可恢复错误展示退避重试；制造确定性错误展示立即终止不重试。
6. 触发定时任务并演示注销；模拟“执行后重启”重试，断言邮件/报表副作用只发生一次。
7. 发送 SIGTERM，展示 Worker 完成在途任务后优雅退出。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| Redis 结构与客户端 | 15 | 结构选择正确，键规范，pipeline 与原子命令使用恰当 |
| 缓存模式实现 | 15 | cache-aside/read-through 清晰，读写路径正确 |
| 三大故障治理 | 20 | 穿透/击穿/雪崩对策完整且参数合理（短TTL、锁TTL、抖动） |
| 缓存一致性 | 15 | 先库后缓存，删除失败有补救，强一致读有绕行方案 |
| BullMQ 队列体系 | 20 | Queue/Worker、重试退避、延迟、并发、定时任务配置正确 |
| 幂等与工程规范 | 15 | 消费者幂等可验证，优雅关停，README 完整 |

细分规则：

- 结构客户端 15 分：结构选择 6 分，键设计 5 分，pipeline/原子命令 4 分。
- 缓存模式 15 分：读三步完整 8 分，模式区分清楚 7 分。
- 故障治理 20 分：空值缓存 6 分，互斥锁 7 分，TTL 抖动 4 分，降级可用 3 分。
- 一致性 15 分：顺序正确 6 分，延迟双删/重试 5 分，强一致绕行 4 分。
- 队列体系 20 分：生命周期与状态 5 分，重试退避 6 分，延迟任务 4 分，定时与并发 5 分。
- 幂等规范 15 分：唯一约束去重 7 分，重试只生效一次 4 分，优雅关停与 README 4 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. 缓存不设 TTL，或写入永久键导致内存只增不减。
2. 写操作只更新缓存不更新数据库，或先删缓存后更新库且无补救。
3. 穿透/击穿/雪崩三类故障没有任何对策，或互斥锁不带过期。
4. 消费者不幂等：重试或重启恢复后重复扣款、发券、发邮件。
5. 以随机 jobId 作为幂等键，或去重标记与业务写入明显矛盾却无说明。
6. 对确定性错误反复重试，或任务 failed 后无任何告警与补偿。
7. Worker 不能优雅关停，硬终止留下半成品；或提交真实密钥与外网依赖。
8. 代码无法按 README 与 docker-compose 在评审环境复现。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 掌握 Redis 结构与场景 | `client.ts`、三类数据能力、演示步骤 1 |
| 实现 cache-aside/read-through | `cache-aside.ts`、`article-cache.ts` |
| 治理穿透/击穿/雪崩 | 空值缓存、互斥锁、TTL 抖动，演示步骤 2、3 |
| 设计缓存一致性 | `article-write.service.ts`、演示步骤 4 |
| 使用 BullMQ 队列/Worker/重试/延迟/并发 | Queue、Worker 文件，演示步骤 5 |
| 实现定时任务 | `report.queue.ts` 注册与注销演示 |
| 保证消费者幂等 | 唯一约束与幂等键，演示步骤 6 |

### 提交前自检

- [ ] 全部键名符合 `app:<domain>:<id>` 规范并显式设置 TTL。
- [ ] 热点读走缓存，Redis 故障时降级直连数据库，接口仍可用。
- [ ] 空值缓存、互斥锁（带 TTL）、TTL 随机抖动三类代码均可指认。
- [ ] 写路径严格“先数据库、后删缓存”，删除失败有重试或双删。
- [ ] 每个队列配置了 attempts、backoff、记录保留与明确并发度。
- [ ] 确定性错误不重试，可恢复错误按退避重试，failed 有告警。
- [ ] 所有副作用消费者可用稳定业务唯一键通过“执行后重试只生效一次”的验证。
- [ ] API 与 Worker 收到 SIGTERM 均能优雅退出，docker-compose 可一键启动全部组件。
