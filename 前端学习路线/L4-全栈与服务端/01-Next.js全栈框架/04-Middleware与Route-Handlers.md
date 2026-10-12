# 04 Middleware 与 Route Handlers

## 学习目标

- 理解 Middleware 的执行时机和适用场景
- 掌握 `middleware.ts` 文件的配置和 `config.matcher` 路径匹配
- 能实现常见的 Middleware 场景：认证校验、国际化路由、A/B 测试、bot 拦截
- 掌握 Route Handlers 的文件约定和 HTTP 方法
- 熟练使用 `NextRequest` 和 `NextResponse` 操作请求/响应
- 能配置 CORS、处理 Cookie、实现流式响应
- 实现一个带 JWT 认证的完整 API 系统 + 全局认证中间件

---

## 内容讲解

### 一、Middleware 是什么？

Middleware（中间件）是在**请求到达页面/API 之前**执行的代码。它在 Next.js 的 Edge Runtime（基于 Web API 的轻量运行时）中运行，位于 CDN 边缘节点，因此执行速度非常快。

```
用户请求 → Middleware（边缘节点）→ 页面/API
                ↑
          可以：重定向、重写、添加 Header、返回 401
          不能：访问数据库、使用 Node.js API、长时间运行
```

#### Middleware vs Server Components vs Route Handler

| 特性 | Middleware | Server Component | Route Handler |
|------|-----------|-----------------|---------------|
| 运行时机 | 请求到达前 | 页面渲染时 | API 请求时 |
| 运行环境 | Edge Runtime | Node.js Runtime | 两者可选 |
| 能访问数据库 | ❌ | ✅ | ✅ |
| 能操作 Cookie | ✅（读和设置） | ✅（只读） | ✅ |
| 能重定向 | ✅ | ✅（redirect） | ✅ |
| 适合场景 | 全局逻辑 | 页面数据获取 | REST API |

> **避坑提示**：Middleware 运行在 Edge Runtime 中，**不能使用 Node.js 原生 API**（`fs`、`net`、`crypto` 的非 Web Crypto 部分等）。需要这些能力时，把逻辑放到 Route Handler 中。

---

### 二、middleware.ts 的配置

#### 2.1 基础结构

```ts
// middleware.ts —— 必须放在项目根目录（与 app/ 同级，不是 app/ 内）
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // request：包含了当前请求的所有信息
  // 这个函数在每个匹配的请求到达页面/API 之前执行

  console.log(`[Middleware] ${request.method} ${request.nextUrl.pathname}`);

  // 继续到下一个处理环节（页面或 API）
  return NextResponse.next();
}

// config.matcher：指定哪些路径触发 middleware
export const config = {
  matcher: [
    /*
     * 匹配所有路径，但不包括：
     * - _next/static（静态文件）
     * - _next/image（图片优化）
     * - favicon.ico（网站图标）
     * - 图片文件（.svg, .png 等）
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

> **避坑提示**：`middleware.ts` 必须放在**项目根目录**（和 `package.json` 同级），而不是 `app/` 目录中。每个项目只能有一个 `middleware.ts`。

#### 2.2 matcher 匹配规则

```ts
// ① 精确匹配
export const config = { matcher: '/about' };       // 只匹配 /about

// ② 路径前缀匹配
export const config = { matcher: '/dashboard/:path*' }; // /dashboard/ 下所有路径

// ③ 多个模式
export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],  // 匹配 /admin 和 /api 下所有路径
};

// ④ 排除模式（使用正则负向断言）
export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],  // 排除 /api、/_next、带扩展名的文件
};

// ⑤ 不写 matcher：对所有请求生效（不推荐，会影响性能）
```

---

### 三、常用场景实战

#### 3.1 认证校验

最常用的 Middleware 场景：检查用户是否登录，未登录跳转到登录页。

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 路由配置：需要认证的路径
const PROTECTED_ROUTES = ['/dashboard', '/profile', '/settings', '/api/admin'];
const PUBLIC_ROUTES = ['/login', '/register', '/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ① 公开路由直接放行
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // ② 检查是否需要认证
  const needsAuth = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  if (!needsAuth) {
    return NextResponse.next();
  }

  // ③ 读取 Cookie 中的 token
  const token = request.cookies.get('auth_token')?.value;

  // ④ token 不存在 → 重定向到登录页，并附带当前 URL 用于登录后跳回
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);  // 登录后跳回原页面
    return NextResponse.redirect(loginUrl);
  }

  // ⑤ 简单验证 token（生产环境用 JWT 验证库）
  try {
    const payload = JSON.parse(atob(token.split('.')[1])); // 解码 JWT payload
    // 可以在这里检查过期时间、权限等
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  } catch {
    // token 无效
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ⑥ 验证通过，继续到页面
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

#### 3.2 国际化路由（i18n）

根据请求头中的 `Accept-Language` 自动跳转到对应语言路径：

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LOCALES = ['zh-CN', 'en', 'ja'] as const;
const DEFAULT_LOCALE = 'zh-CN';

function getLocale(request: NextRequest): string {
  // ① 优先读取 Cookie 中的语言设置
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as any)) {
    return cookieLocale;
  }

  // ② 其次读请求头 Accept-Language
  const acceptLanguage = request.headers.get('accept-language') || '';
  // "zh-CN,zh;q=0.9,en;q=0.8" → 取第一个
  const preferred = acceptLanguage.split(',')[0]?.split(';')[0];
  if (preferred && SUPPORTED_LOCALES.includes(preferred as any)) {
    return preferred;
  }

  // ③ 使用默认语言
  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 如果 URL 已经包含语言前缀，跳过
  const hasLocale = SUPPORTED_LOCALES.some(locale =>
    pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
  if (hasLocale) return NextResponse.next();

  // 获取用户偏好语言，重写 URL
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;

  return NextResponse.rewrite(request.nextUrl);  // rewrite 不改变浏览器地址栏
}
```

> **避坑提示**：`NextResponse.rewrite()` 不会改变浏览器地址栏的 URL，用户看到的一直是 `/about`，但实际渲染的是 `/zh-CN/about`。如果用 `redirect`，浏览器地址栏会变化。

#### 3.3 A/B 测试

通过 Cookie 将用户随机分到不同实验组：

```ts
// middleware.ts
export function middleware(request: NextRequest) {
  // 只在首页执行 A/B 测试
  if (request.nextUrl.pathname !== '/') {
    return NextResponse.next();
  }

  // 检查是否已分配实验组
  let variant = request.cookies.get('ab_variant')?.value;

  if (!variant) {
    // 随机分配：50% control（原始版本），50% test（新版）
    variant = Math.random() < 0.5 ? 'control' : 'test';
  }

  // 设置 Cookie（30 天有效，保持一致性）
  const response = NextResponse.next();
  response.cookies.set('ab_variant', variant, {
    maxAge: 30 * 24 * 60 * 60,  // 30 天
    httpOnly: true,
    sameSite: 'lax',
  });

  // 通过响应头传递分组信息，页面中可以读取
  response.headers.set('x-ab-variant', variant);

  return response;
}
```

页面中读取：

```tsx
// app/page.tsx
import { headers } from 'next/headers';

export default async function HomePage() {
  const headersList = await headers();
  const variant = headersList.get('x-ab-variant') || 'control';

  return (
    <main>
      {variant === 'test' ? <NewHeroSection /> : <OriginalHeroSection />}
    </main>
  );
}
```

#### 3.4 Bot 拦截

```ts
// middleware.ts
const BLOCKED_USER_AGENTS = ['Bytespider', 'YisouSpider', 'PetalBot'];
const BLOCKED_IPS = ['123.45.67.89'];  // 已知恶意 IP

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.headers.get('x-forwarded-for') || request.ip || '';

  // 检查 User-Agent
  if (BLOCKED_USER_AGENTS.some(bot => userAgent.includes(bot))) {
    return new NextResponse('Access Denied', { status: 403 });
  }

  // 检查 IP
  if (BLOCKED_IPS.some(blocked => ip.includes(blocked))) {
    return new NextResponse('Access Denied', { status: 403 });
  }

  return NextResponse.next();
}
```

---

### 四、Route Handlers（API 路由）

Route Handlers 是 Next.js 内置的 REST API 方案。在 `app/` 目录下用 `route.ts` 文件定义：

```
app/api/
├── posts/
│   ├── route.ts          → /api/posts（GET 列表，POST 创建）
│   └── [id]/
│       └── route.ts      → /api/posts/:id（GET、PUT、DELETE）
└── auth/
    ├── login/route.ts    → /api/auth/login
    └── register/route.ts → /api/auth/register
```

#### 4.1 基础 Route Handler

```ts
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET /api/posts —— 获取文章列表
export async function GET(request: NextRequest) {
  // 读取查询参数
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  // 模拟数据库查询
  const posts = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1 + (page - 1) * limit,
    title: `文章标题 ${i + 1 + (page - 1) * limit}`,
  }));

  return NextResponse.json({
    data: posts,
    page,
    limit,
    total: 50,
  });
}

// POST /api/posts —— 创建文章
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();  // 解析 JSON 请求体

    // 输入验证
    if (!body.title || body.title.length < 2) {
      return NextResponse.json(
        { error: '标题至少 2 个字符' },
        { status: 400 }
      );
    }

    // 创建文章...
    // const post = await db.post.create({ data: body });

    return NextResponse.json(
      { message: '创建成功', post: { id: 1, ...body } },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
```

#### 4.2 动态路由的 Route Handler

```ts
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET /api/posts/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const postId = parseInt(id);

  // 模拟查找
  if (postId > 100) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  return NextResponse.json({
    id: postId,
    title: `文章 ${postId}`,
    content: '这是文章内容...',
  });
}

// PUT /api/posts/:id —— 更新文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // 更新逻辑...
  return NextResponse.json({ message: '更新成功', id, ...body });
}

// DELETE /api/posts/:id —— 删除文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 删除逻辑...
  return NextResponse.json({ message: '删除成功', id });
}
```

> **避坑提示**：`route.ts` 不能和 `page.tsx` 放在同一级目录。`/app/posts/` 下要么有 `page.tsx`，要么有 `route.ts`，不能同时存在——Next.js 会报冲突错误。

---

### 五、NextRequest 和 NextResponse

#### 5.1 NextRequest 核心属性

```ts
export async function POST(request: NextRequest) {
  // 请求头
  const authHeader = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');

  // Cookie
  const session = request.cookies.get('session')?.value;
  const allCookies = request.cookies.getAll();

  // URL 信息
  const url = request.nextUrl;          // URL 对象
  const pathname = request.nextUrl.pathname;
  const searchParams = request.nextUrl.searchParams;  // URLSearchParams

  // IP 地址
  const ip = request.ip ?? request.headers.get('x-forwarded-for');

  // 地理位置（Vercel 部署时自动注入）
  const geo = request.geo;  // { city, country, region, latitude, longitude }

  // 请求体
  const json = await request.json();      // JSON
  const text = await request.text();      // 纯文本
  const formData = await request.formData(); // FormData
}
```

#### 5.2 NextResponse 核心用法

```ts
// ① 返回 JSON
return NextResponse.json({ success: true }, { status: 200 });

// ② 重定向
return NextResponse.redirect(new URL('/login', request.url));
// 永久重定向
return NextResponse.redirect(new URL('/new-path', request.url), 301);

// ③ URL 重写（浏览器地址不变）
return NextResponse.rewrite(new URL('/zh-CN/about', request.url));

// ④ 设置 Cookie
const response = NextResponse.json({ success: true });
response.cookies.set('token', 'abc123', {
  httpOnly: true,     // JS 不可访问（防 XSS）
  secure: true,       // 仅 HTTPS
  sameSite: 'strict', // 防 CSRF
  maxAge: 60 * 60 * 24, // 24 小时
  path: '/',
});
return response;

// ⑤ 设置响应头
const response = NextResponse.next();
response.headers.set('x-custom-header', 'hello');
return response;

// ⑥ 直接构造响应
return new NextResponse('Not Found', { status: 404 });
```

---

### 六、CORS 配置

```ts
// app/api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server';

// 封装 CORS 配置
function corsResponse(data: any, status = 200, customHeaders?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: {
      // 允许的源（生产环境改为具体域名）
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development'
        ? '*'
        : 'https://your-production-domain.com',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',  // 预检请求缓存 24 小时
      ...customHeaders,
    },
  });
}

// 处理 OPTIONS 预检请求
export async function OPTIONS() {
  return corsResponse({});
}

export async function GET(request: NextRequest) {
  // 业务逻辑...
  return corsResponse({ data: [] });
}

export async function POST(request: NextRequest) {
  // 业务逻辑...
  return corsResponse({ success: true }, 201);
}
```

> **避坑提示**：`Access-Control-Allow-Origin` 设为 `*` 时不能同时设置 `Access-Control-Allow-Credentials: true`，浏览器会直接拒绝。如果需要携带 Cookie，必须指定具体的源。

---

### 七、实战：JWT 认证 + 全局中间件 + API 路由

完整的认证系统实现：

```ts
// lib/auth.ts —— JWT 工具函数
import { SignJWT, jwtVerify } from 'jose';  // Edge Runtime 兼容的 JWT 库

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
);

// 生成 JWT
export async function createToken(payload: { userId: number; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET);
}

// 验证 JWT
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { userId: number; role: string };
  } catch {
    return null;
  }
}
```

```ts
// middleware.ts —— 全局认证中间件
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

// 需要认证的路径
const PROTECTED_API = '/api/';
const AUTH_API = '/api/auth/';  // 登录注册接口不需要认证

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只对 /api 路径生效（排除 auth 接口）
  if (!pathname.startsWith(PROTECTED_API) || pathname.startsWith(AUTH_API)) {
    return NextResponse.next();
  }

  // 提取 token
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: '未提供认证令牌' }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: '令牌无效或已过期' }, { status: 401 });
  }

  // 将用户信息注入请求头（API Route 中可以读取）
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', String(payload.userId));
  requestHeaders.set('x-user-role', payload.role);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: '/api/:path*',
};
```

```ts
// app/api/auth/login/route.ts —— 登录接口
import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';

// 模拟用户数据库
const USERS = [
  { id: 1, email: 'admin@example.com', password: 'admin123', role: 'admin' },
  { id: 2, email: 'user@example.com', password: 'user123', role: 'user' },
];

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  // 验证输入
  if (!email || !password) {
    return NextResponse.json({ error: '邮箱和密码不能为空' }, { status: 400 });
  }

  // 查找用户
  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user) {
    return NextResponse.json({ error: '邮箱或密码错误' }, { status: 401 });
  }

  // 生成 JWT
  const token = await createToken({ userId: user.id, role: user.role });

  return NextResponse.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
}
```

```ts
// app/api/profile/route.ts —— 受保护的接口
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // middleware 已注入的用户信息
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  return NextResponse.json({
    message: '这是受保护的接口',
    user: { id: userId, role: userRole },
    data: { /* 用户专属数据 */ },
  });
}
```

**请求流程：**

```
POST /api/auth/login       → Middleware 放行（AUTH_API）→ 登录接口 → 返回 JWT

GET  /api/profile           → Middleware 拦截 → 验证 JWT → 注入 x-user-id → 返回数据
     Authorization: Bearer <token>
```

---

## 常见问题

### Q1：Middleware 和 Route Handler 里的 `request` 有什么区别？

都是 `NextRequest` 类型，但在 Middleware 中你可以修改 `requestHeaders` 并传递给下游。在 Route Handler 中，headers 已经被 Middleware 处理过了。在 Middleware 中通过 `NextResponse.next({ request: { headers } })` 设置的 headers，Route Handler 可以通过 `request.headers.get()` 读取。

### Q2：为什么 Middleware 里不能查数据库？

Middleware 运行在 Edge Runtime，Node.js 的数据库驱动（如 `pg`、`mysql2`、Prisma 的 Node.js 模式）依赖 Node.js 原生 API，Edge Runtime 不支持。如果需要查库做认证，有两种方案：
1. 在 Middleware 中发 HTTP 请求到 `/api/auth/verify` 接口验证
2. 把认证逻辑移到各个 Route Handler 或 Server Component 中

### Q3：`route.ts` 和 Server Action 什么时候用哪个？

- **Server Action**：组件内数据操作（表单、按钮点击），适合 React 内部使用
- **Route Handler**：需要对外暴露的 REST API（第三方调用、Webhook、移动端 App）

如果你的 API 只被自己前端调用，Server Action 更简单。如果需要被其他系统调用，用 Route Handler。

### Q4：`NextResponse.redirect()` vs `NextResponse.rewrite()` 的区别？

- **redirect**：浏览器地址栏会变化，客户端经历完整的 HTTP 重定向
- **rewrite**：地址栏不变，服务端内部转发，用户无感知

国际化用 rewrite（不暴露语言前缀），登录跳转用 redirect（用户需要看到变化）。

### Q5：如何在 Route Handler 中处理文件上传？

```ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;  // 获取上传的文件
  const bytes = await file.arrayBuffer();      // 转为二进制
  const buffer = Buffer.from(bytes);           // 如果需要写入磁盘
  // 保存文件...
}
```

### Q6：CORS 报错怎么排查？

1. 确认 `OPTIONS` handler 返回的 `Access-Control-Allow-Origin` 与请求的 `Origin` 匹配
2. 确认 `Access-Control-Allow-Methods` 包含了实际的请求方法
3. 确认没有同时设置 `Allow-Origin: *` 和 `Allow-Credentials: true`
4. 在 Vercel/Netlify 等平台可能需要在平台层面额外配置 CORS

### Q7：Middleware 中能直接返回 JSON 吗？

可以。`return NextResponse.json({ error: '...' }, { status: 401 })`。这通常用于 API 接口的认证失败。对于页面请求，更常见的是 `NextResponse.redirect('/login')`。

---

## 实操作业

### 基础练习：简单 API + Middleware 日志

实现一个 `/api/todos` 的 CRUD API：
- `GET /api/todos`：返回 Todo 列表（内存数组）
- `POST /api/todos`：创建 Todo
- `PUT /api/todos/[id]`：更新 Todo
- `DELETE /api/todos/[id]`：删除 Todo
- 在 `middleware.ts` 中记录每个请求的 method、pathname 和时间戳到控制台

### 进阶练习：JWT 认证系统

在基础练习的基础上增加认证：
- `/api/auth/register`：注册接口（邮箱 + 密码，存内存）
- `/api/auth/login`：登录接口，返回 JWT token
- Middleware 保护 `/api/todos` 接口，未登录返回 401
- 每个 Todo 记录 creatorId，用户只能操作自己的 Todo
- 实现 token 过期处理（设置为 1 分钟，测试过期后返回错误信息）

### 挑战练习：Rate Limiting + API 版本管理

实现两个高级功能：
- **Rate Limiting**：在 Middleware 中基于 IP 实现简单的请求频率限制（内存 Map，60 秒内最多 30 次请求），超出返回 429
- **API 版本管理**：通过 Middleware 实现 `/api/v1/` 和 `/api/v2/` 的路由，`v1` 返回简单 JSON，`v2` 返回带 `{ version: '2.0', data: ... }` 的包装格式。不创建 `v1/v2` 文件夹，纯 Middleware rewrite 实现

---

## 本节小结

Middleware 和 Route Handlers 是 Next.js 全栈能力的关键拼图：

1. **Middleware 用于请求前置处理**：认证、国际化、A/B 测试——任何"在渲染之前"执行的逻辑
2. **Route Handlers 用于 REST API**：对外暴露的接口，支持完整的 HTTP 方法和请求/响应控制
3. **两者互补**：Middleware 做"门卫"（拦截和路由），Route Handler 做"服务员"（处理具体业务）

记住 Middleware 的限制：Edge Runtime、不能查数据库、适合轻量级操作。需要重量级操作时，让 Middleware 放行到 Route Handler 或 Server Component 中处理。

到此，L4「Next.js 全栈框架」的四篇核心教程全部完成。你已经掌握了 App Router 路由、四种渲染策略、Server Actions 数据变更、Middleware 和 Route Handlers——这些是 Next.js 生产开发中最常用的 80% 能力。