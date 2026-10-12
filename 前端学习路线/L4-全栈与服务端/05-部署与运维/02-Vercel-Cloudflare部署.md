# 02-Vercel / Cloudflare 部署

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L4 全栈与服务端
> - 先修：[01-Docker 容器化部署](./01-Docker容器化部署.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Vercel](https://vercel.com/docs)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Vercel、Cloudflare Pages、Netlify 三者的定位、差异和选型逻辑
- 掌握 Vercel 部署 Next.js 项目的完整流程（Git 关联 + 自动部署）
- 理解 Vercel 的预览部署（Preview Deployment）和即时回滚机制
- 合理管理 Vercel 环境变量（区分 Build-time 和 Runtime）
- 能用 Vercel Analytics 监控 Web Vitals
- 了解 Cloudflare Pages + Workers + D1 的边缘计算架构
- 完成自定义域名绑定和 SSL 证书的自动配置
- 实战：将 Next.js 博客从零部署到 Vercel

---

## 内容讲解

### 一、现代前端部署平台对比

部署已经不再是买服务器、装 Nginx、配 SSL 的时代。对于前端应用，现代托管平台已经把这些脏活累活全部自动化。先看三大主流平台的对比：

| 维度 | Vercel | Cloudflare Pages | Netlify |
|------|--------|-----------------|---------|
| 核心优势 | Next.js 最佳搭档（同一家公司开发） | 全球最强 CDN 网络，边缘计算突出 | 最老牌的 Jamstack 平台，插件生态丰富 |
| 免费额度 | 100GB 带宽/月，6000 构建分钟/月 | 无限带宽，500 次构建/月 | 100GB 带宽/月，300 分钟构建/月 |
| Serverless 函数 | ✅ Vercel Functions（基于 AWS） | ✅ Cloudflare Workers（边缘运行） | ✅ Netlify Functions（基于 AWS Lambda） |
| 边缘渲染 | ✅ Edge Functions / ISR | ✅ Workers（原生边缘） | ✅ Edge Functions（Deno 运行时） |
| 数据库 | Vercel Postgres / KV / Blob | D1（SQLite 边缘数据库）/ KV / R2 | Netlify Blobs |
| 适合场景 | Next.js / SvelteKit / Nuxt 全栈项目 | 静态站点 + 轻量 API + 全球低延迟 | 静态站点生成器（Gatsby / Hugo） |
| 构建速度 | 快（专为 Next.js 优化） | 中 | 中 |

**选型建议**：

```
你的项目是 Next.js？
  ├── 是 → 无脑选 Vercel（深度集成，零配置）
  └── 否 → 项目需要边缘数据库或全球超低延迟？
            ├── 是 → Cloudflare Pages + Workers + D1
            └── 否 → 静态博客/文档站？Netlify 或 Cloudflare Pages 都可
```

### 二、Vercel 部署 Next.js：从零到上线

Vercel 是 Next.js 的创造者，两家是同一家公司（Vercel Inc.）。这意味着 **Vercel 对 Next.js 的支持是原生的、零配置的**——不需要写 Dockerfile，不需要配 Nginx，不需要管 SSL。

#### 2.1 通过 Git 关联自动部署（推荐）

```
本地写代码
    │
    │ git push
    ▼
GitHub / GitLab / Bitbucket
    │
    │ Webhook 通知
    ▼
Vercel 自动触发构建
    │
    │ npm install → npm run build → 部署到全球 CDN
    ▼
生产环境上线 ✨
```

**具体步骤**：

```bash
# 1. 确保项目已推送到 GitHub
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main

# 2. 打开 vercel.com，用 GitHub 账号登录

# 3. 点击 "New Project" → 从列表中选择你的仓库

# 4. Vercel 自动检测到 Next.js 项目，构建配置自动填充：
#    Framework: Next.js
#    Build Command: next build（自动识别）
#    Output Directory: .next（自动识别）
#    Install Command: npm install（自动识别）

# 5. 点击 "Deploy"，等待 1-2 分钟

# 6. 部署完成，Vercel 自动分配域名：<项目名>.vercel.app
```

#### 2.2 Vercel CLI 部署（适合快速预览）

```bash
# 全局安装
npm i -g vercel

# 在项目根目录执行
vercel

# 首次会让你：
# 1. 登录（浏览器弹窗）
# 2. 确认项目配置（一路回车即可）
# 3. 自动部署并返回预览 URL

# 部署到生产环境
vercel --prod
```

#### 2.3 vercel.json 配置文件（可选，用于自定义行为）

```json
{
  "buildCommand": "next build",
  "devCommand": "next dev --port 3000",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": ".next",

  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],

  "redirects": [
    {
      "source": "/old-blog/:slug",
      "destination": "/blog/:slug",
      "permanent": true
    }
  ],

  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://external-api.example.com/:path*"
    }
  ]
}
```

> **提示**：Vercel 会自动检测项目中是否有 `vercel.json`。大部分情况下不需要这个文件，Next.js 的配置在 `next.config.ts` 中管理即可。

### 三、预览部署和回滚

这是 Vercel 最实用的两个功能：

#### 3.1 预览部署（Preview Deployment）

每次在非主分支上 push 代码或创建 PR，Vercel 会自动构建一个**预览环境**，返回一个唯一的 URL。这个 URL 和正式环境完全独立，可以发给同事或产品经理预览，确认无误后再合并。

```
main 分支 push          → 生产环境（your-app.vercel.app）
feat/xxx 分支 push      → 预览环境（your-app-git-feat-xxx.vercel.app）
PR #42                  → 预览环境（your-app-随机hash.vercel.app）
```

预览环境的 URL 会自动作为评论贴到对应的 GitHub PR 中，点击直达预览页面。

#### 3.2 即时回滚

Vercel 保存每次部署的完整快照。如果新版本有 Bug：

1. 打开 Vercel Dashboard → 你的项目 → Deployments
2. 找到上一个正常版本，点击右侧 `···` → `Promote to Production`
3. 瞬间回滚到之前的版本（不是重新构建，只是把流量切回去）

这就是**不可变部署（Immutable Deploy）**的理念：每次部署都是一个不可变的快照，回滚只是改变流量指向哪个快照，而不是"把代码改回去"。

### 四、Vercel 环境变量管理

环境变量的管理分两个层面：

#### 4.1 变量类型

| 变量前缀 | 可见性 | 用途 |
|---------|--------|------|
| `NEXT_PUBLIC_*` | 浏览器端可见 | API 基础 URL、第三方 SDK Key（非敏感） |
| 无前缀 | 仅服务端 | 数据库连接串、JWT 密钥、支付私钥 |
| `VERCEL_*` | 系统注入 | `VERCEL_URL`、`VERCEL_ENV` 等 Vercel 内置变量 |

#### 4.2 变量作用域

Vercel 支持为不同环境设置**同名变量的不同值**：

```
DATABASE_URL
├── Production   → postgresql://prod-db:5432/app
├── Preview      → postgresql://preview-db:5432/app_preview
└── Development  → postgresql://localhost:5432/app_dev
```

在 Vercel Dashboard → Settings → Environment Variables 中，可以给变量指定 `Production`、`Preview`、`Development` 三个环境，且可以为每个环境设置不同的值。

#### 4.3 通过 CLI 管理变量

```bash
# 查看所有变量
vercel env ls

# 添加变量（交互式）
vercel env add DATABASE_URL

# 添加到特定环境
vercel env add DATABASE_URL production

# 从 .env.local 批量导入
vercel env pull      # 从 Vercel 下载到本地
vercel env push      # 从本地推送到 Vercel（需 --yes 确认）
```

### 五、Vercel Analytics 和 Web Vitals 监控

Vercel 内置了性能监控，只需要引入一个组件：

```bash
npm install @vercel/analytics
```

```tsx
// app/layout.tsx —— 集成 Analytics
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        {/* 放在 body 末尾即可，自动采集 Web Vitals 和页面访问 */}
        <Analytics />
      </body>
    </html>
  );
}
```

如果需要更细粒度的 Web Vitals 监控：

```bash
npm install @vercel/speed-insights
```

```tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

// 在 layout.tsx 中添加
<SpeedInsights />
```

部署后，在 Vercel Dashboard → Analytics 中可以看到：

- **LCP（Largest Contentful Paint）**：最大内容绘制时间，衡量加载速度
- **FID / INP**：首次输入延迟 / 交互到下次绘制，衡量交互响应
- **CLS（Cumulative Layout Shift）**：累计布局偏移，衡量视觉稳定性
- **TTFB（Time to First Byte）**：首字节时间，衡量服务器响应

这些数据按设备类型（桌面 / 移动端）、地理位置分组，直接反映真实用户的使用体验。

### 六、Cloudflare Pages：静态站点的另一个选择

如果你的项目不需要完整的 Next.js SSR（比如只是一份 Astro / Hugo / Vite 生成的静态站点，或者使用 Next.js 的 `output: 'export'`），Cloudflare Pages 是一个极好的选择——无限带宽 + 全球 330+ 节点。

#### 6.1 部署静态站点

```bash
# 安装 Wrangler CLI
npm i -g wrangler

# 登录
wrangler login

# 在项目中创建 Cloudflare Pages 项目
wrangler pages project create my-blog

# 部署（output 目录为 out 或 dist）
wrangler pages deploy ./out

# 也可以通过 Git 关联自动部署（在 Cloudflare Dashboard 操作）
```

#### 6.2 Cloudflare Pages 也支持 Functions

Cloudflare Pages 不仅仅是静态托管，它还支持 **Functions**（本质上是 Cloudflare Workers 的一层包装）：

```
my-blog/
├── functions/            ← Pages Functions 目录
│   ├── api/
│   │   └── posts.ts      ← /api/posts
│   └── _middleware.ts    ← 全局中间件（认证、A/B 测试等）
└── ... (静态文件)
```

```typescript
// functions/api/posts.ts —— Cloudflare Pages Function 示例
interface Env {
  DB: D1Database;           // 绑定的 D1 数据库
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT * FROM posts ORDER BY created_at DESC LIMIT 20'
    ).all();
    return Response.json(results);
  }

  return new Response('Method not allowed', { status: 405 });
};
```

### 七、Cloudflare Workers 和 D1：边缘计算简介

#### 7.1 Cloudflare Workers

Workers 是 Cloudflare 的 Serverless 平台，代码运行在全球边缘节点上，用户访问最近的节点，延迟极低。**Workers 不是 Node.js 运行时**，而是基于 V8 Isolate 的轻量运行时（Service Worker API），这意味着它有自己的一套 API：

```typescript
// Cloudflare Worker 示例
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 解析请求
    const url = new URL(request.url);
    const path = url.pathname;

    // 路由
    if (path === '/api/hello') {
      return Response.json({ message: 'Hello from the edge!' });
    }

    // 代理到 KV 存储
    if (path.startsWith('/cache/')) {
      const key = path.replace('/cache/', '');
      const value = await env.MY_KV.get(key);
      return value
        ? new Response(value)
        : new Response('Not found', { status: 404 });
    }

    return new Response('Not found', { status: 404 });
  },
};
```

#### 7.2 Cloudflare D1：边缘 SQLite 数据库

D1 是 Cloudflare 的分布式关系数据库，底层是 SQLite。亮点：

- **全球分布**：数据自动同步到 Worker 所在的边缘节点，读操作延迟极低
- **SQLite 兼容**：用标准 SQL 操作，不需要学新语法
- **HTTP API**：不需要连接池，直接通过 HTTP 请求操作

```bash
# 创建 D1 数据库
wrangler d1 create my-app-db

# 本地开发
wrangler d1 execute my-app-db --local --file=./schema.sql

# 写入数据（在 Worker 中）
await env.DB.prepare(
  'INSERT INTO posts (title, content) VALUES (?, ?)'
).bind(title, content).run();
```

#### 7.3 选型判断：Vercel 还是 Cloudflare？

```
你的项目核心需求：
├── Next.js 深度集成 / ISR / PPR / Server Actions
│   └── → Vercel（原生支持，零配置）
├── 全球超低延迟 / 边缘数据库 / WebSocket 实时通信
│   └── → Cloudflare Workers + D1 + Durable Objects
├── 静态博客 / 文档站 / 纯前端 SPA
│   └── → Vercel / Cloudflare Pages / Netlify 三个都可以
└── 重度依赖 Node.js 原生模块
    └── → Vercel 或自建服务器（Cloudflare Workers 不是 Node.js 运行时）
```

### 八、自定义域名和 SSL 证书

#### 8.1 Vercel 配置自定义域名

1. 在域名注册商（如阿里云、Namecheap、Cloudflare）处购买域名，比如 `myblog.com`
2. Vercel Dashboard → 你的项目 → Settings → Domains
3. 输入 `myblog.com`，点击 Add
4. Vercel 会给出需要配置的 DNS 记录：

```
类型    名称    值
CNAME   @      cname.vercel-dns.com
CNAME   www    cname.vercel-dns.com
```

5. 在域名注册商的 DNS 管理中添加这些记录
6. 等待 DNS 生效（几分钟到 48 小时）
7. Vercel 自动申请并续签 Let's Encrypt SSL 证书

> Vercel 也会自动签发通配符 SSL 证书（`*.myblog.com`），覆盖所有子域名。

#### 8.2 Cloudflare 配置自定义域名

如果用 Cloudflare Pages，推荐把域名 DNS 解析托管在 Cloudflare 上：

1. 将域名 Nameserver 指向 Cloudflare（`xxx.ns.cloudflare.com`）
2. Cloudflare Pages → 你的项目 → Custom domains → Set up a custom domain
3. 输入 `myblog.com`，Cloudflare 自动配置 DNS 和 SSL

Cloudflare 的 SSL 支持更灵活：
- **Flexible**：浏览器 ↔ Cloudflare 加密，Cloudflare ↔ 源站不加密
- **Full**：浏览器 ↔ Cloudflare ↔ 源站全链路加密（推荐）
- **Full (strict)**：全链路加密 + 源站证书必须可信

### 九、实战：将 Next.js 博客部署到 Vercel

完整流程，从零到上线：

```bash
# ==================== 步骤 1：准备项目 ====================
# 确保项目在 GitHub 上（如果是新项目）
git init
git add .
git commit -m "feat: 初始化博客项目"
git remote add origin https://github.com/<你的用户名>/nextjs-blog.git
git push -u origin main

# ==================== 步骤 2：添加必要的环境变量 ====================
# 在 Vercel Dashboard 中或通过 CLI 添加
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add NEXT_PUBLIC_SITE_URL production

# ==================== 步骤 3：可选，添加 vercel.json ====================
# 在项目根目录创建 vercel.json（仅需要自定义头部/重定向时）
```

```json
// vercel.json —— 博客项目可选配置
{
  "headers": [
    {
      "source": "/_next/static/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "redirects": [
    { "source": "/posts", "destination": "/blog", "permanent": true }
  ]
}
```

```bash
# ==================== 步骤 3（可选）：Vercel CLI 首次部署 ====================
npm i -g vercel
vercel            # 按提示登录，一路回车，Vercel 自动部署
vercel --prod     # 确认无误后推送到生产环境

# ==================== 步骤 4：关联 GitHub 自动部署 ====================
# 1. 打开 vercel.com/dashboard
# 2. 点击 "Add New..." → Project
# 3. 导入 GitHub 仓库 nextjs-blog
# 4. Vercel 自动识别为 Next.js 项目
# 5. 确认环境变量（从上一步导入或手动添加）
# 6. 点击 Deploy

# ==================== 步骤 5：配置自定义域名 ====================
# vercel.com → 项目 → Settings → Domains
# 输入你的域名：myblog.com
# 按提示到域名注册商添加 DNS 记录

# ==================== 步骤 6：集成 Analytics ====================
npm install @vercel/analytics @vercel/speed-insights
```

```tsx
// app/layout.tsx —— 添加 Analytics
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

```bash
# ==================== 步骤 7：推送变更，触发自动部署 ====================
git add .
git commit -m "feat: 集成 Vercel Analytics"
git push

# 到 Vercel Dashboard 观察部署进度
# 部署成功后访问：https://myblog.com ✨
```

---

## 常见问题

### Q1：Vercel 的免费额度够用吗？

对于个人博客和小型项目，免费额度非常充裕：每月 100GB 带宽、6000 构建分钟。一个普通的个人博客月流量通常不到 10GB。超出后可以升级 Pro（$20/月）。

### Q2：为什么 Vercel 部署后的 Next.js ISR 缓存有时不更新？

确保 `next.config.ts` 中的 `revalidate` 时间合理。另外，Vercel 的 ISR 存储是基于边缘缓存的，`.next/cache` 会被持久化（不像其他平台那样可能丢失）。如果确实不更新，可以通过 API 手动触发 on-demand revalidation：`fetch('/api/revalidate?secret=xxx')`。

### Q3：Cloudflare Workers 能跑完整的 Next.js 吗？

不能直接跑。Cloudflare Workers 不是 Node.js 运行时，而 Next.js 的 SSR 依赖 Node.js API。但在 Cloudflare 上可以通过 `@opennextjs/cloudflare` 适配器来部署 Next.js 项目。最简单的方式是用 `next.config.ts` 中的 `output: 'export'` 生成静态站点部署到 Pages。

### Q4：预览部署的 URL 能被搜索引擎抓取吗？

不会。Vercel 的预览部署默认设置 `X-Robots-Tag: noindex`，搜索引擎不会索引预览环境的页面。

### Q5：Vercel 如何设置多个自定义域名？

在 Settings → Domains 中可以添加多个域名（如 `myblog.com` 和 `www.myblog.com`）。Vercel 会自动把 `www` 重定向到你设置的 Primary Domain。

### Q6：Cloudflare D1 和传统 PostgreSQL 的主要区别是什么？

D1 基于 SQLite，是嵌入式数据库，不支持客户端连接池。它通过 HTTP API 访问，每个读请求自动路由到最近的边缘节点。适合读多写少、低延迟需求高的场景。不适合复杂 JOIN、大数据量写入、需要连接池的场景。

### Q7：Vercel Functions 有没有超时限制？

免费版（Hobby）最长 10 秒，Pro 版最长 60 秒，Enterprise 最长 900 秒。长任务（如 AI 推理、视频处理）不适合 Serverless Functions，应该用长运行服务（或使用 Edge Functions 的 streaming）。

### Q8：环境变量修改后需要重新部署吗？

是的。所有非 `NEXT_PUBLIC_*` 的变量（服务端变量）在下一次部署时才生效。只有 `NEXT_PUBLIC_*` 前缀的变量会在构建时嵌入客户端代码，同样需要重新构建。修改环境变量后，在 Deployments 页面手动触发 Redeploy 即可。

---

## 实操作业

### 基础练习：Vercel 一键部署

1. 将一个已有的 Next.js 项目推送到 GitHub
2. 在 Vercel 上关联该仓库并完成首次部署
3. 在 Vercel Dashboard 中查看构建日志，理解每一步在做什么
4. 通过 `vercel` CLI 创建一个预览部署，对比预览 URL 和生产 URL

### 进阶练习：完整上线流程

1. 配置至少 3 个环境变量（数据库地址、API Key、站点 URL），区分为 production 和 preview 不同值
2. 集成 `@vercel/analytics` 和 `@vercel/speed-insights`，部署后查看 Web Vitals 数据
3. 创建 `vercel.json`，添加至少 2 条重定向规则和 2 条安全头配置
4. 绑定自己实际控制的域名或测试子域名；没有时使用平台提供的预览域名
5. 仅在隔离预览环境模拟一次回滚：部署有界故障版本，再恢复上一个已验证版本，检查页面、API 与数据兼容

### 挑战练习：Cloudflare 边缘部署

1. 将同一个博客改为 `output: 'export'` 模式，生成静态站点
2. 使用 Cloudflare Pages 部署该静态站点，关联 GitHub 自动部署
3. 创建一个简单的 Workers Function（如 `/api/hello`），返回 JSON 数据
4. 在 Cloudflare 上创建 D1 数据库，创建一个 `comments` 表，在 Workers 中实现评论的读写 API
5. 写一份 Vercel vs Cloudflare 的体验对比（部署速度、配置复杂度、文档质量等）

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：预览 commit/URL 与生产区分，构建日志核对框架适配和运行时。实际访问公开页与 API；远端未执行只完成配置时标记待验证。
- **进阶**：Secret 放服务端环境，公开变量单独列；域名用实际控制的测试子域名。故障仅放预览版本，回滚后检查版本、数据与安全头，不能破坏真实生产来演示。
- **挑战**：static export 只承载静态功能，动态 API 另用 Workers/Pages Functions；D1 与 PostgreSQL 差异记录。迁移、授权、读写和错误真实执行，平台未开通不能宣称上线通过。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L4 里程碑](../../projects/atlas/milestones/L4.md)
- 本课任务：按 L4 里程碑把“Vercel / Cloudflare 部署”接入 Atlas 全栈版本，明确服务端信任边界、数据契约、失败响应和回滚方式。
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

现代前端部署已经高度自动化，核心选择取决于你的框架和技术栈：

1. **Next.js 项目 → Vercel**：零配置、自动识别、开箱即用的 ISR/SSR/Edge Functions 支持。Git push 即部署，预览环境自动生成。
2. **静态站点或边缘计算场景 → Cloudflare**：全球 330+ 节点的 CDN 网络，Workers + D1 + R2 构成了完整的边缘计算平台。
3. **关键认知**：环境变量分 Build-time（`NEXT_PUBLIC_*`）和 Runtime（无前缀），不可变部署的核心理念（回滚 = 切换流量指向），预览部署的价值（每个 PR 都有独立环境）。

下一节我们学习如何使用 Nginx 自建部署——当你需要更多控制权（反向代理、负载均衡、SSL 终止）时的传统但强大的方案。

<!-- course-nav:start -->
---

[上一篇：01-Docker 容器化部署](./01-Docker容器化部署.md) · [课程地图](../../README.md) · [下一篇：03-Nginx、域名与 HTTPS](./03-Nginx-域名与HTTPS.md)
<!-- course-nav:end -->
