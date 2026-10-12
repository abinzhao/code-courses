# 02 SSR / ISR / PPR 渲染策略

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L4 全栈与服务端
> - 先修：[01 App Router 与文件约定](./01-App-Router与文件约定.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Next.js](https://nextjs.org/docs)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Next.js 四种渲染策略（SSG / SSR / ISR / PPR）的区别和适用场景
- 掌握 Static Rendering 的触发条件与 `generateStaticParams` 的用法
- 理解 Dynamic Rendering 的触发机制：`cookies()` / `headers()` / `searchParams`
- 掌握 ISR 的 `revalidate` 配置，理解"增量"的含义
- 了解 PPR（Partial Prerendering）的概念和 Suspense 在其中的作用
- 能用渲染策略决策树为实际场景选型
- 实现产品列表（SSG）+ 详情页（ISR）+ 用户仪表盘（SSR）的完整案例

---

## 内容讲解

### 一、四种渲染策略全景

> **Next.js 16 模式说明**：本章前半部分的 `dynamic`、路由段 `revalidate` 和传统 SSG/ISR 分类适用于未开启 Cache Components 的项目。开启 `cacheComponents: true` 后，应改用 `use cache`、`cacheLife`、`cacheTag`、`Suspense` 和运行时数据边界，不能混用被替代的路由段配置。

Next.js 在 App Router 中提供了四种渲染策略，形成了一个从"完全静态"到"完全动态"的光谱：

```
静态程度：高 ←——————————————————————————→ 低
          SSG         ISR         SSR        PPR
         构建时生成   增量静态    每次请求    静态壳+动态洞
```

| 策略 | 数据新鲜度 | 响应速度 | 服务器压力 | 适用场景 |
|------|----------|---------|----------|---------|
| SSG（Static Site Generation） | 最低（构建时固定） | 最快（CDN 直接返回） | 最低 | 文档、博客、营销页 |
| ISR（Incremental Static Regeneration） | 按时间间隔更新 | 快（首次命中可能慢） | 低 | 产品详情、CMS 内容 |
| SSR（Dynamic Rendering） | 最高（每次实时） | 慢（需等服务端处理） | 高 | 用户仪表盘、个性化内容 |
| PPR（Partial Prerendering） | 部分静态 + 部分实时 | 快（静态壳即时 + 动态内容流式） | 中 | 电商页面、社交 Feed |

---

### 二、SSG：静态站点生成

SSG 在**构建时**（`next build`）就把页面渲染成静态 HTML，部署到 CDN 后用户访问直接返回 HTML 文件，不需要服务端参与。

#### 2.1 默认行为

App Router 中，如果页面**不依赖动态数据**（没有 `cookies()`、`headers()`、`searchParams` 等动态 API），默认就是 SSG：

```tsx
// app/about/page.tsx —— 自动识别为 SSG
// ✅ 没有任何动态依赖，构建时生成静态 HTML
export default function AboutPage() {
  return <h1>关于我们</h1>;
}
```

`next build` 输出会标注：

```
○  (Static)  prerendered as static content
```

#### 2.2 generateStaticParams：批量生成静态页面

对于动态路由，需要用 `generateStaticParams` 告诉 Next.js"构建时生成哪些路径"：

```tsx
// app/products/[id]/page.tsx
interface Product {
  id: number;
  name: string;
  price: number;
}

// 构建时调用的函数：返回所有要预渲染的路径参数
export async function generateStaticParams() {
  const products: Product[] = await fetch('https://api.example.com/products').then(r => r.json());

  // 返回 id 列表，Next.js 会为每个 id 生成一个静态页面
  return products.map(product => ({
    id: String(product.id),  // 必须是字符串
  }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product: Product = await fetch(`https://api.example.com/products/${id}`).then(r => r.json());

  return (
    <div>
      <h1>{product.name}</h1>
      <p>¥{product.price}</p>
    </div>
  );
}
```

> **避坑提示**：`generateStaticParams` 返回的值必须是**字符串**。如果数据是 `number`，记得用 `String()` 转换。此外，该函数只在构建时执行一次，内部可以使用 Node.js API（读文件系统、查数据库等）。

#### 2.3 dynamicParams：控制未知路径的行为

```tsx
// 默认是 true：未预渲染的路径会在首次请求时按需生成（fallback 模式）
export const dynamicParams = true;

// 设为 false：未预渲染的路径直接返回 404
export const dynamicParams = false;
```

---

### 三、SSR：动态渲染

当页面依赖**请求级别的信息**（如 Cookie、Header、查询参数）时，Next.js 会自动切换为 SSR——**每次请求都在服务端重新渲染**。

#### 3.1 触发动态渲染的"开关"

使用以下任何一个 API，页面就会从 SSG 变为 SSR：

```tsx
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

export default async function DashboardPage() {
  // ① cookies() —— 读取请求中的 Cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  // ② headers() —— 读取请求头
  const headersList = await headers();
  const userAgent = headersList.get('user-agent');

  if (!token) {
    return <div>请先登录</div>;
  }

  // ③ 基于 token 获取个性化数据（每次请求不同）
  const user = await fetch('https://api.example.com/me', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());

  return (
    <div>
      <h1>欢迎回来，{user.name}</h1>
      <p>你的设备：{userAgent}</p>
    </div>
  );
}
```

在 `next build` 输出中查看每条路由的渲染说明。当前版本通常用 `ƒ` 表示按需动态渲染；具体符号以本次构建输出的图例为准：

```
ƒ  (Dynamic)  server-rendered on demand
```

#### 3.2 强制指定渲染策略

你也可以通过路由段配置显式声明：

```tsx
// 强制动态渲染（即使没有用 cookies/headers）
export const dynamic = 'force-dynamic';

// 强制静态渲染（即使用了 cookies 也会在构建时报错）
export const dynamic = 'force-static';

// 默认：自动检测
export const dynamic = 'auto';
```

> **避坑提示**：`dynamic = 'force-static'` 时如果有 `cookies()` 调用，构建会直接**报错**而不是静默降级为 SSR。这是 Next.js 的设计：让你在 CI 阶段就发现配置错误。

---

### 四、ISR：增量静态再生成

ISR 结合了 SSG 的速度和 SSR 的数据新鲜度。核心思路：**页面依然是预渲染的静态 HTML，但可以按时间间隔在后台重新生成**。

#### 4.1 基于时间的 ISR（Time-based Revalidation）

```tsx
// app/products/[id]/page.tsx
interface Product {
  id: number;
  name: string;
  price: number;
  updatedAt: string;
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // revalidate: 60 → 这个页面的缓存 60 秒后过期
  // 过期后，下一个请求会触发后台重新生成
  const product = await fetch(`https://api.example.com/products/${id}`, {
    next: { revalidate: 60 },  // ← ISR 的关键配置，单位：秒
  }).then(r => r.json());

  return (
    <div>
      <h1>{product.name}</h1>
      <p>¥{product.price}</p>
      <p className="text-gray-500">更新时间：{product.updatedAt}</p>
    </div>
  );
}
```

**ISR 的工作流程：**

```
第 0 秒：用户 A 访问 /products/1 → 返回静态 HTML，时间戳 00:00
第 30 秒：用户 B 访问 /products/1 → 命中缓存，返回同一份 HTML（时间戳仍是 00:00）
第 65 秒：用户 C 访问 /products/1 → 缓存过期，返回旧 HTML 给 C，同时后台触发重新生成
第 66 秒：用户 D 访问 /products/1 → 后台已重新生成，返回新 HTML，时间戳 01:06
```

这叫 **stale-while-revalidate**：先返回旧内容（不阻塞用户），后台更新缓存。

#### 4.2 按需 ISR（On-demand Revalidation）

通过 `revalidateTag` 或 `revalidatePath` 主动清除缓存：

```tsx
// 在 Server Action 或 Route Handler 中使用
import { revalidateTag, revalidatePath } from 'next/cache';

// 按标签：标记为 stale，下一次访问先返回旧值并后台刷新
revalidateTag('products', 'max');

// 按路径：只清除 /products/1 的缓存
revalidatePath('/products/1');
```

数据获取时打标签：

```tsx
const product = await fetch(`https://api.example.com/products/${id}`, {
  next: { revalidate: 3600, tags: ['products', `product-${id}`] },
});
```

---

### 五、Streaming SSR：流式传输

传统的 SSR 必须等**整个页面所有数据都就绪**后才能返回 HTML。如果某个组件数据慢，整个页面都被阻塞：

```
传统 SSR：  [3 秒获取所有数据] → [渲染] → [返回完整 HTML]
Streaming： [0.5 秒发送静态壳] → [动态部分数据就绪一个发一个]
```

Next.js 通过 React 的 `<Suspense>` 实现流式传输：

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react';

// 慢数据组件（模拟 3 秒延迟）
async function SlowUserStats() {
  await new Promise(resolve => setTimeout(resolve, 3000));
  const stats = await fetch('https://api.example.com/stats').then(r => r.json());
  return <div>总订单：{stats.total}</div>;
}

// 快数据组件
async function FastNotifications() {
  const notifications = await fetch('https://api.example.com/notifications').then(r => r.json());
  return <div>新消息：{notifications.length} 条</div>;
}

export default function DashboardPage() {
  return (
    <div>
      <h1>仪表盘</h1>
      {/* Suspense 边界：静态壳先返回，内部内容流式传输 */}
      <Suspense fallback={<div>加载中...</div>}>
        <SlowUserStats />
      </Suspense>
      <Suspense fallback={<div>加载中...</div>}>
        <FastNotifications />
      </Suspense>
    </div>
  );
}
```

用户在 0.5 秒内就能看到仪表盘标题和"加载中..."，不需要等 3 秒。

---

### 六、PPR：通过 Cache Components 实现部分预渲染

Next.js 16 使用可选的 **Cache Components** 模式实现部分预渲染。开启后，框架在构建期生成静态 HTML 外壳，并要求无法预渲染的子树显式放入 Suspense：
- **静态外壳（Static Shell）**：构建时预渲染，加载极快
- **动态内容（Dynamic Holes）**：运行时用 Suspense 流式注入

```tsx
// next.config.ts —— 开启 Cache Components
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

```tsx
// app/product/[id]/page.tsx
import { Suspense } from 'react';

// 静态外壳不读取运行时 params，只把 Promise 交给 Suspense 内的动态子树
export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div>
      <Header />    {/* 静态：导航栏 */}
      <Sidebar />   {/* 静态：侧边栏 */}
      <main>
        {/* 动态洞：库存和价格实时变化 */}
        <Suspense fallback={<PriceSkeleton />}>
          <Price params={params} />
        </Suspense>
        <Suspense fallback={<StockSkeleton />}>
          <Stock params={params} />
        </Suspense>
      </main>
    </div>
  );
}

async function Price({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const price = await getLivePrice(id);
  return <strong>{price}</strong>;
}
```

| 对比 | SSG | PPR |
|------|-----|-----|
| 静态壳 | 整个页面 | 页面外壳 |
| 动态内容 | 无（完全静态） | Suspense 洞中动态渲染 |
| 适用场景 | 完全不变化的内容 | 大部分静态 + 少量动态 |

> **避坑提示**：旧的 `experimental.ppr` / `ppr: 'incremental'` 配置已被迁移路径取代。启用 `cacheComponents` 后，开发和构建阶段会检查未缓存异步数据是否位于 Suspense 内；按路由逐步迁移并用构建输出确认静态外壳。

---

### 七、渲染策略决策树

面对一个页面，问自己三个问题：

```
① 内容对每个用户都不同吗？
   ├── 是 → ② 对速度要求极高吗？
   │        ├── 是 → SSR + Streaming（仪表盘、个人中心）
   │        └── 否 → SSR（后台管理页面）
   └── 否 → ③ 内容会频繁更新吗？
            ├── 更新频率 < 1 天 → ISR（产品详情、文章页）
            ├── 更新频率 < 1 小时 → ISR + revalidateTag 按需（CMS 内容）
            └── 几乎不更新 → SSG（文档站、营销落地页）
```

---

### 八、实战：三种渲染策略的综合应用

#### 8.1 产品列表页（SSG）

```tsx
// app/products/page.tsx
interface Product {
  id: number;
  name: string;
  price: number;
  image: string;
}

// ✅ 没有 cookies/headers/searchParams，自动 SSG
export default async function ProductList() {
  const products: Product[] = await fetch('https://fakestoreapi.com/products').then(r => r.json());

  return (
    <div className="grid grid-cols-3 gap-4">
      {products.map(p => (
        <a key={p.id} href={`/products/${p.id}`} className="border rounded p-4 hover:shadow-lg">
          <img src={p.image} alt={p.name} className="h-40 mx-auto" />
          <h2 className="font-bold mt-2">{p.name}</h2>
          <p className="text-red-500">¥{p.price}</p>
        </a>
      ))}
    </div>
  );
}
```

#### 8.2 产品详情页（ISR）

```tsx
// app/products/[id]/page.tsx
export const revalidate = 300; // 5 分钟 ISR

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await fetch(`https://fakestoreapi.com/products/${id}`, {
    next: { revalidate: 300, tags: [`product-${id}`] },
  }).then(r => r.json());

  return (
    <article className="max-w-2xl mx-auto">
      <img src={product.image} alt={product.name} className="h-64 mx-auto" />
      <h1 className="text-3xl font-bold mt-4">{product.name}</h1>
      <p className="text-2xl text-red-500 my-2">¥{product.price}</p>
      <p className="text-gray-700">{product.description}</p>
      <p className="text-gray-400 text-sm mt-4">数据每 5 分钟自动刷新</p>
    </article>
  );
}
```

#### 8.3 用户仪表盘（SSR + Streaming）

```tsx
// app/dashboard/page.tsx
import { cookies } from 'next/headers';
import { Suspense } from 'react';

// 顶部问候 + 快速统计（SSR 但不阻塞，用 Suspense 拆分）
async function Welcome() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  const user = await fetch('https://api.example.com/me', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());

  return <h1>欢迎回来，{user.name}！</h1>;
}

// 慢数据：订单统计
async function OrderStats() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  await new Promise(resolve => setTimeout(resolve, 2000)); // 模拟慢查询

  const stats = await fetch('https://api.example.com/orders/stats', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json());

  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      <StatCard label="今日订单" value={stats.today} />
      <StatCard label="本月订单" value={stats.month} />
      <StatCard label="总金额" value={`¥${stats.totalAmount}`} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded p-4 text-center">
      <div className="text-gray-500 text-sm">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function StatsFallback() {
  return (
    <div className="grid grid-cols-3 gap-4 mt-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="border rounded p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-16 mx-auto" />
          <div className="h-8 bg-gray-200 rounded w-12 mx-auto mt-2" />
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div>
      <Suspense fallback={<div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />}>
        <Welcome />
      </Suspense>
      <Suspense fallback={<StatsFallback />}>
        <OrderStats />
      </Suspense>
    </div>
  );
}
```

---

## 常见问题

### Q1：为什么我的页面明明没写 cookies() 但还是变成了 SSR？

检查是否有以下情况：
- 页面或它的**父 layout** 中使用了 `cookies()` 或 `headers()`
- 页面直接访问了 `searchParams`
- 路由段配置中写了 `export const dynamic = 'force-dynamic'`
- 使用了 `unstable_noStore()`（Next.js 16 中已稳定为 `noStore()`）

### Q2：SSG 页面的数据构建后变了怎么办？

这正是 ISR 的用武之地。把 `fetch` 的 `cache` 改为 `next: { revalidate: N }`，页面会在 N 秒后自动在后台重新生成。或者用 `revalidatePath()` 在数据变更时手动触发。

### Q3：`revalidate` 和 `cache: 'no-store'` 有什么区别？

- `revalidate: 60`：缓存 60 秒，期间返回旧数据，过期后后台刷新 → **ISR**
- `cache: 'no-store'`：完全不缓存，每次请求重新获取 → **SSR**
- 不设置：使用 Next.js 的数据缓存默认行为

### Q4：什么时候用 ISR 而不是 SSR？

当业务允许一个明确的陈旧窗口（如文章、商品描述）时，ISR 通常能降低渲染成本并提高缓存命中率。需要按用户、Cookie 或请求参数生成内容，或者每次请求都要重新访问数据源时，再考虑动态 SSR。SSR 只表示本次请求会在服务端渲染，并不保证上游数据源、`fetch` 或 CDN 没有缓存；股票和竞拍等实时数据通常还需要客户端订阅、轮询以及明确的一致性策略。

### Q5：Streaming SSR 和 SSR 的性能差异有多大？

Streaming SSR 可以先发送已经就绪的 HTML 和 Suspense fallback，不必等待所有数据完成，因此常能改善首字节和首次可见反馈。收益没有固定毫秒数，取决于数据依赖、网络、运行区域和代理缓冲；应同时测量 TTFB、FCP、LCP，以及用户是否更早看到有意义内容。

### Q6：PPR 现在能用在生产环境吗？

Next.js 16 通过可选的 `cacheComponents: true` 提供 PPR 行为，不再使用 `experimental.ppr`。是否启用取决于部署平台支持、现有缓存配置和迁移成本；先在单条路由验证构建输出、缓存失效和请求时数据，再逐步扩大范围。

### Q7：`fetch` 缓存和 ISR 的 `revalidate` 是什么关系？

`fetch` 层面的 `next.revalidate` 控制**单个数据请求**的缓存策略。路由段级别的 `export const revalidate` 控制**整个页面**的重新生成间隔。两者独立但相关——页面重新生成时会重新触发所有 fetch。建议在 fetch 层面精细控制，而不是统一用路由级别的 revalidate。

---

## 实操作业

### 基础练习：识别渲染策略

创建一个 Next.js 项目，实现以下三个页面，然后用 `next build` 的图例辨认静态和动态路由，并在生产模式重复请求验证缓存行为：
- `/about`：纯文本页面，无任何数据请求
- `/time`：显示当前服务端时间（使用 `new Date().toISOString()`）
- `/profile`：使用 `cookies()` 读取假 token，基于 token 显示不同内容

### 进阶练习：ISR 商品详情

基于 fakestoreapi.com（免费 API），实现一个商品详情页：
- `/products/[id]` 使用 ISR，设置 `revalidate: 120`
- 页面显示商品信息 + "最后缓存时间"（观察 2 分钟内的变化）
- 添加一个 Server Action 按钮"立即刷新"，点击后调用 `revalidatePath` 清除缓存
- 对比点击前后的缓存时间和内容变化

### 挑战练习：Streaming Dashboard

实现一个仪表盘页面，包含三个**独立的数据源**，各有不同的延迟：
- 用户欢迎区域（100ms）
- 订单统计图表（2000ms，模拟慢查询）
- 系统通知列表（500ms）

用 `<Suspense>` 包裹每个区域，先显示标题与骨架，再独立显示完成的区域。记录响应块到达和 DOM 出现时刻；模拟的 100ms 数据延迟不等于端到端页面耗时保证。用 Network 与浏览器录制共同验证流式行为，仅看到 HTML Content-Type 不足以证明流式输出。

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：await cookies 的请求依赖会影响动态行为；new Date 本身不保证每次请求重算。用生产 build 与重复请求核对渲染/缓存策略，构建符号以当前版本图例为准。
- **进阶**：在固定缓存配置下记录生成时间、revalidate 与请求时刻；开发模式不能作为 ISR 证据。刷新 action 验证权限，失效不总意味着下一时刻立即同步重建。
- **挑战**：三个异步 server component 独立 Suspense，记录 HTML chunk 到达与 DOM 出现顺序。100ms 是模拟数据延迟不是端到端 SLA，代理缓冲可能影响流式可见性。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L4 里程碑](../../projects/atlas/milestones/L4.md)
- 本课任务：按 L4 里程碑把“SSR / ISR / PPR 渲染策略”接入 Atlas 全栈版本，明确服务端信任边界、数据契约、失败响应和回滚方式。
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

渲染策略是 Next.js 最核心的面试点和实战点。关键记忆三句话：

1. **SSG 是静态的极致**：构建时生成，CDN 直出，适合不变化的内容
2. **ISR 是动静结合的巧思**：静态页 + 定时刷新，适合大部分内容型场景
3. **SSR + Streaming 是动态的优雅**：用 Suspense 边界拆解慢组件，用户不用等整个页面

这个决策框架用熟了，大多数业务场景你都能第一反应选对策略。下一节我们学习 Server Actions——Next.js 处理表单和数据变更的新范式。

官方参考：[Next.js Cache Components](https://nextjs.org/docs/app/getting-started/cache-components) · [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)

<!-- course-nav:start -->
---

[上一篇：01 App Router 与文件约定](./01-App-Router与文件约定.md) · [课程地图](../../README.md) · [下一篇：03 Server Actions 与数据变更](./03-Server-Actions与数据变更.md)
<!-- course-nav:end -->
