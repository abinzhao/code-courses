# 01-RESTful 设计规范

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L4 全栈与服务端
> - 先修：[03-Worker Threads 与集群](../02-Node.js后端基础/03-Worker-Threads与集群.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN Web Docs](https://developer.mozilla.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 REST 架构风格的核心约束：资源导向、无状态、统一接口
- 掌握 URL 设计规范：名词复数、层级嵌套、避免动词
- 熟练运用 HTTP 方法的语义：GET、POST、PUT、PATCH、DELETE
- 正确使用 HTTP 状态码表达 API 执行结果
- 设计统一的请求/响应体格式和分页规范
- 掌握查询参数的筛选、排序、字段选择、关联加载
- 了解 API 版本管理的三种主流策略及其适用场景
- 实战：为一个博客系统设计完整的 RESTful API 规范文档

---

## 内容讲解

### 一、REST 的核心原则

REST（Representational State Transfer）不是协议，而是一种**架构风格**。它由 Roy Fielding 在 2000 年博士论文中提出，规定了分布式超媒体系统的 6 个约束。对 API 设计者来说，只需抓住三条核心：

#### 1.1 资源导向（Resource-Oriented）

REST 的核心思想是：**一切皆资源**。URL 指向的是"资源"而非"动作"。

```
❌ 错误：URL 里带动词
POST /api/createPost
GET  /api/getPost?id=123
POST /api/deletePost?id=123

✅ 正确：URL 指向资源，动作由 HTTP 方法表达
POST   /api/posts          → 创建文章
GET    /api/posts/123      → 获取文章
DELETE /api/posts/123      → 删除文章
```

> **关键认知**：你要设计的不是一组"接口函数"，而是一套"资源访问规则"。客户端通过操作资源的"表示"（Representation）来改变资源状态。

#### 1.2 无状态（Stateless）

**每个请求必须包含服务器理解该请求所需的所有信息**。服务器不保存客户端会话状态。

```typescript
// ❌ 依赖服务端 session —— 不是 RESTful
// 服务端内存中保存了 userSession，第二次请求依赖它
app.get('/api/profile', (req, res) => {
  const user = sessionStore.get(req.cookies.sessionId);
  res.json(user);
});

// ✅ 每次请求自带凭证 —— RESTful
// 客户端每次把 token 放在 Authorization 头里
app.get('/api/profile', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const user = jwt.verify(token, SECRET); // 每次请求都验证
  res.json(user);
});
```

**无状态的好处**：
- **水平扩展**：任何服务器都能处理请求，不需要"黏性会话"
- **可靠性**：服务器重启不会丢失客户端状态
- **可缓存**：中间件（CDN、反向代理）可以安全缓存响应

> **避坑提示**：无状态不是说"不能有用户登录"，而是说"登录状态由客户端在每次请求中携带"（通常用 JWT Token）。

#### 1.3 统一接口（Uniform Interface）

REST 的接口由四个约束定义：

| 约束 | 含义 | 示例 |
|------|------|------|
| 资源标识 | 每个资源有唯一 URL | `/api/users/42` |
| 自描述消息 | 请求/响应包含处理所需信息 | `Content-Type: application/json` |
| HATEOAS | 响应包含可用的下一步链接（可选） | `{ "links": { "self": "/api/posts/1" } }` |
| 通过表示操作资源 | 客户端通过发送资源的"表示"来修改资源 | `PUT /api/users/42` + JSON body |

---

### 二、URL 设计规范

#### 2.1 基本原则

```typescript
// ✅ 名词复数 + 层级结构
GET    /api/posts           ← 文章列表（集合）
GET    /api/posts/123       ← id=123 的文章（单个资源）
POST   /api/posts           ← 创建文章
GET    /api/posts/123/comments    ← 某文章下的评论（子资源）
GET    /api/users/5/posts         ← 某用户的文章（跨资源关联）

// ❌ 反模式
GET    /api/getPosts        ← URL 里带动词
POST   /api/posts/create    ← URL 里带动词
GET    /api/post/123        ← 单数形式不一致
```

#### 2.2 层级深度控制

```
✅ 合理深度（≤ 3 层）
/api/posts/123/comments/456
/api/users/5/orders/10/items

❌ 太深（无法阅读、难以维护）
/api/users/5/orders/10/items/3/variants/2
```

**解决方案**：深层关系通过查询参数或独立资源来获取：

```
// 方案 A：独立端点 + 查询参数
GET /api/variants?itemId=3

// 方案 B：在响应中包含链接（HATEOAS）
{
  "id": 3,
  "name": "某种商品",
  "variants": "/api/items/3/variants"  // 让客户端自己跟进
}
```

#### 2.3 避免动词的例外场景

某些操作确实无法映射为 CRUD 资源，此时允许使用动词：

```
POST /api/orders/123/cancel        ← 取消订单
POST /api/posts/456/publish        ← 发布文章
POST /api/users/789/reset-password ← 重置密码
```

> **原则**：优先尝试把动作建模为资源属性更新（`PATCH /api/orders/123` + `{ "status": "cancelled" }`），只有确实不合理时才用动词。

---

### 三、HTTP 方法的语义

REST 的核心是**用 HTTP 方法表达操作意图**，而非在 URL 或 Body 中表达。

| 方法 | 语义 | 幂等性 | 请求体 | 响应体 |
|------|------|--------|--------|--------|
| **GET** | 获取资源 | ✅ 是 | 无 | 资源表示 |
| **POST** | 创建资源 | ❌ 否 | 资源表示 | 新资源表示 |
| **PUT** | 全量替换 | ✅ 是 | 完整资源表示 | 更新后资源 |
| **PATCH** | 部分更新 | 不一定 | 变更字段 | 更新后资源 |
| **DELETE** | 删除资源 | ✅ 是 | 无 | 空 或 删除确认 |

#### 3.1 GET —— 安全且幂等

```typescript
// ✅ GET 请求没有副作用，可以被缓存
// 分页、筛选、排序都通过查询参数控制
GET /api/posts?page=2&perPage=20&status=published&sort=-createdAt

// ❌ 不要在 GET 请求体里放数据
GET /api/posts
{ "status": "published" }  ← 很多 HTTP 客户端不支持 GET 带 Body

// ❌ 不要用 GET 执行写操作
GET /api/posts/123/delete   ← 浏览器预取可能会意外删除
```

#### 3.2 POST —— 非幂等

```typescript
// 创建文章（客户端不需要指定 ID，由服务端生成）
POST /api/posts
Content-Type: application/json

{
  "title": "RESTful API 设计",
  "content": "REST 是一种架构风格...",
  "tags": ["api", "backend"]
}

// 响应：201 Created + 新资源的位置
// HTTP/1.1 201 Created
// Location: /api/posts/789

{
  "id": 789,
  "title": "RESTful API 设计",
  "createdAt": "2026-10-12T08:00:00Z"
}
```

#### 3.3 PUT vs PATCH —— 最容易混淆的两个方法

```typescript
// 原资源
// GET /api/users/42 → { "name": "张三", "email": "zhangsan@example.com", "role": "admin" }
```

```typescript
// PUT：全量替换 —— 发送完整的资源表示
// 未传的字段会被设为 null 或默认值！
PUT /api/users/42
{ "name": "张三改名" }

// 结果 → { "name": "张三改名", "email": null, "role": null }
// ⚠️ email 和 role 被清空了！
```

```typescript
// PATCH：部分更新 —— 只发送要改的字段
PATCH /api/users/42
{ "name": "张三改名" }

// 结果 → { "name": "张三改名", "email": "zhangsan@example.com", "role": "admin" }
// ✅ email 和 role 保持不变
```

> **避坑提示**：90% 的业务场景应该用 **PATCH** 而非 PUT。除非你确实需要"全量替换"的语义（如配置文件的整体更新），否则 PUT 容易造成数据丢失。

#### 3.4 DELETE —— 幂等删除

```typescript
DELETE /api/posts/123

// 第一次：204 No Content（删除成功）
// 第二次：204 No Content 或 404 Not Found
// 关键是：第二次请求不会产生不同的副作用（资源仍然是已删除状态）
```

---

### 四、状态码的正确使用

#### 4.1 2xx：成功

| 状态码 | 含义 | 何时使用 |
|--------|------|----------|
| **200 OK** | 请求成功 | GET、PUT、PATCH 成功时，返回资源表示 |
| **201 Created** | 资源创建成功 | POST 成功后，配合 `Location` 头返回新资源 URL |
| **204 No Content** | 成功但无响应体 | DELETE 成功、或不需要返回数据的 PATCH |

```typescript
// 返回 201 时的最佳实践
app.post('/api/posts', async (req, res) => {
  const post = await db.posts.create(req.body);
  // Location 头让客户端知道新资源的地址
  res.setHeader('Location', `/api/posts/${post.id}`);
  res.status(201).json(post);
});
```

#### 4.2 3xx：重定向

| 状态码 | 含义 | 场景 |
|--------|------|------|
| **301** | 永久重定向 | API 路径永久迁移（浏览器/搜索引擎会记住新 URL） |
| **302** | 临时重定向 | 登录后跳转回原页面 |
| **304** | 未修改 | 配合 `If-None-Match` / `If-Modified-Since` 做缓存校验 |

```typescript
// 304 的典型场景：资源未变化，客户端用缓存
app.get('/api/posts/:id', (req, res) => {
  const etag = generateETag(post);
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end(); // 不传 Body，节省带宽
  }
  res.setHeader('ETag', etag);
  res.json(post);
});
```

#### 4.3 4xx：客户端错误

| 状态码 | 含义 | 何时使用 |
|--------|------|----------|
| **400** | 请求格式错误 | JSON 解析失败、字段类型不对 |
| **401** | 未认证 | 没有提供凭证或凭证过期 |
| **403** | 无权限 | 已认证但权限不足（普通用户尝试管理员操作） |
| **404** | 资源不存在 | URL 存在但对应资源不存在 |
| **409** | 资源冲突 | 并发编辑冲突、用户名已被占用 |
| **422** | 语义错误 | 参数格式正确但业务上不合法（如 age: -5） |
| **429** | 频率限制 | 请求过多，配合 `Retry-After` 头 |

```typescript
// 状态码选择实战
// 400 vs 422：两者最常混淆

// 400：参数格式本身就不对（JSON 解析失败、缺少必填字段）
POST /api/users  → 缺少 Content-Type
→ 400: { "error": "请求体必须是 application/json" }

// 422：参数格式正确，但逻辑上不合法
POST /api/users  → { "age": -5 }
// JSON 是合法的，age 也是 number，但 -5 不是有效年龄
→ 422: { "error": "年龄必须在 0-150 之间" }

// 401 vs 403
// 401：我不知道你是谁（没有 token / token 过期）
GET /api/admin/users  （没带 Authorization 头）
→ 401: { "error": "请先登录" }

// 403：我知道你是谁，但你没权限（有 token，但角色不对）
GET /api/admin/users  （带了普通用户的 token）
→ 403: { "error": "只有管理员可以访问" }
```

#### 4.4 5xx：服务端错误

| 状态码 | 含义 | 何时使用 |
|--------|------|----------|
| **500** | 服务器内部错误 | 未预期的异常（数据库挂了、代码 Bug） |

> **关键原则**：5xx 表示"问题出在服务端"，4xx 表示"问题出在客户端"。不要把业务逻辑错误（如"用户不存在"）返回 500，这是误导性的。

---

### 五、请求和响应体设计

#### 5.1 统一响应格式

```typescript
// 成功响应：统一的 envelope 格式
{
  "code": 0,               // 0 表示成功，非 0 表示错误（便于客户端判断）
  "message": "success",
  "data": {                // 实际负载，成功时才有
    "id": 789,
    "title": "RESTful API 设计"
  },
  "meta": {                // 元信息：分页、请求耗时等
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}

// 错误响应
{
  "code": 40401,           // 业务错误码（6 位：HTTP 状态码 + 2 位业务码）
  "message": "文章不存在",   // 面向用户的描述
  "detail": "Post with id 99999 was not found in database", // 面向开发者的详情
  "requestId": "req_a1b2c3" // 请求追踪 ID，用于日志排查
}
```

#### 5.2 分页规范

```typescript
// 方案 A：offset-based（偏移分页）
// 优点：简单直观，支持跳页
// 缺点：数据增减时可能重复/遗漏（"漂流"问题）
GET /api/posts?page=2&perPage=20

// 响应
{
  "data": [...],
  "meta": {
    "page": 2,           // 当前页
    "perPage": 20,       // 每页条数
    "total": 150,        // 总记录数
    "totalPages": 8      // 总页数（前端判断是否显示"下一页"）
  }
}

// 方案 B：cursor-based（游标分页）
// 优点：不受数据增减影响，适合无限滚动和实时数据
// 缺点：不支持跳页
GET /api/posts?cursor=abc123&limit=20

// 响应
{
  "data": [...],
  "meta": {
    "nextCursor": "def456",   // 下一页的游标，无数据时为 null
    "hasMore": true           // 是否还有更多数据
  }
}
```

> **选择建议**：管理后台（需要跳页功能）用 offset-based；信息流（无限滚动、实时数据）用 cursor-based。

---

### 六、查询参数设计

```typescript
// 完整示例：查询参数应当语义清晰、可组合
GET /api/posts
  ?status=published         // 筛选：状态
  &tag=javascript           // 筛选：标签
  &sort=-createdAt          // 排序：- 表示降序
  &fields=id,title,excerpt  // 字段选择：只返回需要的字段
  &expand=author            // 关联加载：同时返回作者信息
  &page=1&perPage=20        // 分页
```

| 参数 | 说明 | 示例 |
|------|------|------|
| `filter[status]` | 精确筛选 | `?filter[status]=published` |
| `q` | 模糊搜索 | `?q=restful` |
| `sort` | 排序（`-` 降序） | `?sort=-createdAt,title` |
| `fields` | 返回字段 | `?fields=id,title,excerpt` |
| `expand` | 关联加载 | `?expand=author,tags` |
| `page` / `perPage` | 分页 | `?page=2&perPage=20` |

---

### 七、API 版本管理策略

#### 7.1 URL 版本（推荐，最直观）

```
GET /api/v1/posts/123
GET /api/v2/posts/123    ← v2 可能有不同字段或行为
```

优点：一眼能看出版本，方便调试和文档。
缺点：URL 不够"纯净"（REST 原教旨主义者会反对）。

#### 7.2 Header 版本

```
GET /api/posts/123
Accept: application/vnd.myapp.v2+json
```

优点：URL 干净。
缺点：不直观，调试时容易忘记带 Header，缓存策略复杂。

#### 7.3 查询参数版本

```
GET /api/posts/123?version=2
```

优点：简单。
缺点：污染查询参数，缓存 key 变复杂。

> **推荐**：对公开 API 使用 **URL 版本**（简单粗暴，用户友好）；对内部 API 使用 **Header 版本**（更"RESTful"）。无论如何，选择后保持一致。

---

### 八、实战：博客系统 RESTful API 设计

下面是一份可直接交给团队实施的 API 规范文档。

```typescript
// ============================================================
// 博客系统 RESTful API v1 规范
// Base URL: https://api.myblog.com/v1
// 认证: Authorization: Bearer <jwt_token>
// 内容类型: Content-Type: application/json
// ============================================================

// ============ 文章资源 ============

// 获取文章列表
GET /posts
  ?status=published          // published | draft | archived
  &tag=javascript,nodejs     // 逗号分隔，AND 逻辑
  &q=restful                 // 标题和摘要的模糊搜索
  &sort=-createdAt           // 默认按创建时间倒序
  &fields=id,title,excerpt   // 可指定返回字段
  &expand=author             // 同时加载作者信息
  &page=1&perPage=20         // offset-based 分页

// 201 Created
// Location: /posts/123
// {
//   "code": 0,
//   "data": {
//     "id": 123,
//     "title": "RESTful API 设计",
//     "slug": "restful-api-design",
//     "content": "...",
//     "status": "draft",
//     "createdAt": "2026-10-12T08:00:00Z"
//   }
// }

// 获取单篇文章
GET /posts/123
// 404 Not Found（文章不存在时）
// 200 OK（文章存在时）

// 创建文章
POST /posts
// Request Body:
// {
//   "title": "RESTful API 设计",
//   "content": "REST 是一种架构风格...",
//   "tags": ["api", "backend"],
//   "status": "draft"          // draft | published
// }

// 更新文章（部分更新）
PATCH /posts/123
// Request Body（只传要改的字段）:
// {
//   "title": "新标题",
//   "status": "published"
// }
// 409 Conflict（同时被其他人修改）

// 删除文章
DELETE /posts/123
// 204 No Content

// ============ 评论资源（子资源） ============

// 获取文章的所有评论
GET /posts/123/comments?page=1&perPage=20&sort=-createdAt

// 创建评论
POST /posts/123/comments
// Request Body:
// {
//   "content": "写得真好！",
//   "parentId": null            // null 表示顶级评论，传入评论 ID 表示回复
// }
// 201 Created
// Location: /posts/123/comments/456

// 删除评论（只有作者可以删除）
DELETE /posts/123/comments/456
// 204 No Content
// 403 Forbidden（非作者尝试删除）

// ============ 用户资源 ============

// 获取用户公开信息
GET /users/42
GET /users/42/posts?page=1&perPage=20  // 某用户的文章

// ============ 标签资源 ============

// 获取所有标签
GET /tags?sort=-postCount

// 获取某个标签下的文章
GET /tags/javascript/posts?page=1&perPage=20

// ============ 认证 ============

// 注册
POST /auth/register
// { "username": "...", "email": "...", "password": "..." }
// 201 Created

// 登录
POST /auth/login
// { "email": "...", "password": "..." }
// 200 OK
// { "code": 0, "data": { "token": "eyJ...", "user": {...} } }

// 刷新 Token
POST /auth/refresh
// { "refreshToken": "..." }

// ============ 错误码规范 ============
// 40001: 参数格式错误
// 40101: Token 未提供
// 40102: Token 已过期
// 40301: 权限不足
// 40401: 资源不存在
// 40901: 资源冲突（并发编辑）
// 42201: 参数校验失败
// 42901: 请求频率超限
// 50001: 服务器内部错误
```

---

## 常见问题

### Q1：RESTful 一定比 RPC 好吗？

不是。REST 适合**资源型 API**（博客文章、用户信息、商品管理），RPC 适合**动作型 API**（发送邮件、启动任务、执行计算）。实际项目中两者经常共存：核心 CRUD 用 REST，复杂业务操作用 RPC 风格端点。

### Q2：PATCH 请求体的字段传 null 是什么意思？

`{ "name": null }` 表示"把 name 设为 null"。如果 public 字段接收 null，这就等价于"清空 name"。如果你只想忽略某字段，就不要在 PATCH 的 Body 里传它。

### Q3：为什么 POST /api/posts 创建的文章 URL 是 /api/posts/123，而不是在响应体里传？

响应体里确实包含 `id: 123`，但 `Location` 响应头是 HTTP 标准的做法，它可以被代理、缓存和日志系统自动理解，不依赖 JSON 解析。

### Q4：401 和 403 到底怎么区分？很多人都用混了。

记住一句话：**401 = "你是谁？"（未认证），403 = "你不配"（权限不足）**。如果用户没登录，返回 401；如果用户登录了但角色不对，返回 403。更简单的判断：返回 401 后客户端应该跳转到登录页；返回 403 后客户端应该显示"无权限"提示。

### Q5：状态码 200 和 204 在 DELETE 时用哪个？

都行，但推荐 **204 No Content**（表示操作成功且没有响应体）。客户端根据状态码就知道不需要解析 Body。如果你需要在 DELETE 后返回被删资源的概要信息，也可以用 200。

### Q6：一个接口返回的字段太多怎么办？

用 `fields` 查询参数让客户端选择需要的字段：`GET /posts?fields=id,title,excerpt`。这能显著减少网络传输量，尤其在移动端。这个模式叫 **Sparse Fieldsets**。

### Q7：什么时候需要 API 版本号？

当你需要对现有接口做**不兼容的改动**时（删除字段、改变字段含义、修改认证方式）。如果只是新增字段或新增端点，不需要发新版。建议 v1 上线后至少保持 6-12 个月的兼容期。

### Q8：查询参数里的 `expand` 是什么？

`expand` 让客户端一次性获取关联资源，避免 N+1 问题。比如 `GET /posts/123?expand=author,tags` 在返回文章的同时内嵌作者和标签信息，省去客户端再发两个请求。后端实现时用 JOIN 或批量查询来高效获取。

---

## 实操作业

### 基础练习：设计一套 API 规范

为一个**任务管理（Todo）系统**设计完整的 RESTful API 规范，要求包含：

- 用户注册/登录（认证）
- 任务的 CRUD（任务列表、创建、更新状态、删除）
- 任务的分类标签管理
- 统一响应格式和错误码定义

输出格式参照第八节的博客系统 API 文档，用 Markdown 完整写出所有端点。

### 进阶练习：实现分页和筛选

基于上一步的 Todo API，为"任务列表"端点设计查询参数：

- 按状态筛选（`status=todo|done|archived`）
- 按优先级排序（`sort=-priority,createdAt`）
- 按关键字搜索标题（`q=...`）
- 支持 cursor-based 分页（因为任务列表频繁增减，offset 分页会重复）
- 写出每种组合场景的请求示例和预期响应

### 挑战练习：设计多版本 API

你的 Todo API 需要发 v2 版本了。v2 相比 v1 有什么破坏性变更？请设计具体的 v1 → v2 迁移方案：

- v2 中 `POST /tasks` 的请求体结构变了（新增了 `dueDate` 和 `assigneeId` 字段为必填）
- v2 中 `GET /tasks` 的响应体新增了 `projectId` 字段
- v2 中废弃了 `GET /tasks?filter=...`，改为各自独立参数
- 请写出 v1 和 v2 的完整 API 差异对照表，并设计客户端平滑迁移策略

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L4 里程碑](../../projects/atlas/milestones/L4.md)
- 本课任务：按 L4 里程碑把“RESTful 设计规范”接入 Atlas 全栈版本，明确服务端信任边界、数据契约、失败响应和回滚方式。
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

RESTful API 设计的核心是 **资源建模** 和 **HTTP 语义的正确使用**：

1. **资源导向**：URL 指向资源（名词复数），HTTP 方法表达操作意图
2. **无状态**：每个请求自包含所有信息，不依赖服务端会话
3. **方法语义**：GET 读、POST 建、PUT 全量替换、PATCH 部分更新、DELETE 删
4. **状态码**：2xx 成功、4xx 客户端错、5xx 服务端错——用对状态码远比"一律 200 + 自定义 code"更专业
5. **统一格式**：envelope 响应体、合理的分页参数、语义化的查询参数

RESTful 不是教条。它是一套经过 20 年验证的 Web API 设计最佳实践，当你的 API 被第三方调用、被前端团队对接时，一致的 RESTful 规范能极大减少沟通成本和集成 Bug。

下一节我们将学习 tRPC，看看在前后端都是 TypeScript 的全栈场景中，如何实现**端到端类型安全**。

<!-- course-nav:start -->
---

[上一篇：03-Worker Threads 与集群](../02-Node.js后端基础/03-Worker-Threads与集群.md) · [课程地图](../../README.md) · [下一篇：02-tRPC 端到端类型安全](./02-tRPC端到端类型安全.md)
<!-- course-nav:end -->
