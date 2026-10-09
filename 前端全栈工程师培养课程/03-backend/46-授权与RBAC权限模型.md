# 46-授权与 RBAC 权限模型

## 目标

完成本知识单元后，学员应能在已完成认证的后端服务上，设计并落地一套可维护、可验证的授权体系，堵住水平越权与垂直越权漏洞。

学员应能够：

1. 说清用户、角色、权限三者的关系，独立完成 RBAC 数据模型与建表设计。
2. 用权限矩阵梳理“角色—资源—操作”的映射，并将矩阵转化为代码可执行的权限定义。
3. 用守卫或中间件在路由层落地授权检查，理解声明式权限与命令式资源校验的分工。
4. 实现资源 owner 归属校验，防御通过篡改 ID 访问他人数据的水平越权。
5. 识别垂直越权风险，落实最小权限原则与角色提升的服务端控制。
6. 实现组织或租户维度的数据隔离，并能说明 RBAC 的适用边界及向更细粒度模型演进的方向。

本单元默认认证已完成（令牌中已含用户身份）。认证本身、密码哈希与 JWT 细节见第 45 单元；输入校验与统一错误返回见第 47 单元。

## 技术栈

| 工具或依赖 | 当前稳定版本参考 | 用途 | 学习要求 |
|---|---|---|---|
| Node.js | 22 LTS / 24 LTS | 后端运行时 | 能组织中间件与数据访问 |
| Express | 4.x（5.x 已发布） | 路由与中间件链 | 能串联认证、授权守卫 |
| `jsonwebtoken` | 9.x | 从令牌读取身份 | 理解角色信息的来源与局限 |
| SQL 数据库 + 查询构建器或 ORM | Prisma 5.x / Knex 3.x 等 | 持久化用户角色权限 | 能写多对多关联查询 |
| `zod` | 3.x / 4.x | 校验路径参数中的资源 ID | 配合授权做输入收窄 |
| 测试工具（可选） | Vitest 1.x / 2.x | 权限用例回归 | 能为越权场景补测试 |

数据表总体关系：

```text
users ──< user_roles >── roles ──< role_permissions >── permissions
  │
  └── 业务表通过 owner_id / org_id 与用户和组织关联
```

## 详细的理论知识讲解和示例伪代码

### 1. 授权在请求链路中的位置

#### 定义

授权是在认证通过之后，针对“本次请求的具体资源与操作”做出允许或拒绝的决定。一个完整的授权决定通常包含四个要素：主体（Who，已认证用户及其角色）、动作（Action，如 read/create/update/delete）、资源（Resource，如 article、order）、范围（Scope，如属于哪个组织、是不是本人数据）。

#### 与后端的关系

授权不能只在入口做一次粗粒度判断就结束。路由守卫解决“有没有这类操作的资格”，资源级校验解决“能不能操作这一条具体数据”，两者必须叠加。授权检查必须全部在服务端完成，任何前端隐藏、禁用按钮都只是用户体验层。

```text
请求进入
认证中间件：确认身份，挂到 req.user          # 第 45 单元内容
权限守卫：检查角色是否具备该动作的一般权限      # 粗粒度
业务处理：查询资源并校验 owner/org 归属         # 细粒度
通过后才执行写操作
任何一步失败：停止链路，返回 403/404
```

#### 示例

```js
// 两层授权：守卫给“资格”，业务代码给“归属”
app.delete(
  '/api/articles/:id',
  authenticate,
  requirePermission('article:delete'),
  async (req, res, next) => {
    try {
      const article = await findArticleById(req.params.id);
      if (!article) return res.sendStatus(404);
      if (!canAccessArticle(req.user, article)) {
        // 不属于自己且没有平台级删除权：拒绝
        return res.status(403).json({ code: 'FORBIDDEN', message: '无权操作该资源' });
      }
      await deleteArticle(article.id);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);
```

#### 常见误区

> 只要登录了，接口就默认可用，权限以后再说。

默认放行是最危险的授权策略。安全基线应是默认拒绝，显式授予才放行。

> 前端不显示删除按钮，用户就删不了。

攻击者可以直接构造 HTTP 请求，按钮是否存在对服务端毫无约束力。

### 2. 用户、角色与权限模型

#### 定义

RBAC（Role-Based Access Control，基于角色的访问控制）把权限授予角色，再把角色赋予用户，形成“用户—角色—权限”的两层间接关系。

- 用户（User）：具体账号，如“李雷”。
- 角色（Role）：一组职责的集合，如 member、editor、admin。
- 权限（Permission）：对某类资源执行某类动作的许可，命名常用 `资源:动作`，如 `article:publish`。

引入角色这一中间层，是为了避免把成百上千条权限直接逐个分配给用户：新人入职只需授予角色，岗位变化只需调整角色，权限策略可复用、可审计。

#### 与后端的关系

用户与角色、角色与权限通常都是多对多关系，需要关联表。权限命名一旦确定就是系统契约，应集中定义为常量或清单，避免散落在路由字符串中。

#### 示例

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE
);

CREATE TABLE roles (
  key TEXT PRIMARY KEY,          -- 'member' / 'editor' / 'admin'
  name TEXT NOT NULL
);

CREATE TABLE permissions (
  key TEXT PRIMARY KEY           -- 'article:create' / 'article:delete'
);

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id),
  role_key TEXT NOT NULL REFERENCES roles(key),
  PRIMARY KEY (user_id, role_key)
);

CREATE TABLE role_permissions (
  role_key TEXT NOT NULL REFERENCES roles(key),
  permission_key TEXT NOT NULL REFERENCES permissions(key),
  PRIMARY KEY (role_key, permission_key)
);
```

```text
一次授权关系示例：
用户 李雷
  └── 角色 editor
        ├── article:read
        ├── article:create
        ├── article:update
        └── article:publish
（不包含 article:delete 与 user:manage）
```

#### 常见误区

> 直接在 users 表加一个 `is_admin` 布尔列就够了。

布尔列只能表达“管理员/非管理员”两种状态，无法支撑多种角色与最小权限，很快会演变成到处判断 `is_admin` 的混乱代码。

> 角色越多越安全。

角色爆炸（为每个微小差异建一个角色）会让权限不可审计。角色应对应稳定职责，而不是临时需求。

### 3. 权限矩阵与权限定义

#### 定义

权限矩阵是一张“角色 × 权限”的对照表，用可读形式固化每个角色能做什么。它是产品、后端、测试共同的契约：矩阵单元格即授权规则，测试用例应能逐一映射到矩阵。

#### 与后端的关系

矩阵必须落到代码中一份唯一的权限定义上，代码和文档不能各写一套。加载权限有两种常见时机：登录时把该用户全部权限放入会话上下文（简单、即时性略差），或每次请求从缓存/数据库加载（变更即时、成本更高）。无论哪种，角色权限变更后要明确收敛时间。

#### 示例

```text
权限矩阵（示例教学系统）：
权限                 member   editor   admin
article:read          ✓        ✓        ✓
article:create        ✓        ✓        ✓
article:update        仅本人    ✓        ✓
article:delete        ✗        仅本人    ✓
article:publish       ✗        ✓        ✓
comment:moderate      ✗        ✗        ✓
user:manage           ✗        ✗        ✓
```

```js
// 集中式角色权限定义：矩阵的代码形态
const ROLE_PERMISSIONS = {
  member: ['article:read', 'article:create', 'article:update'],
  editor: [
    'article:read',
    'article:create',
    'article:update',
    'article:delete',
    'article:publish',
  ],
  admin: [
    'article:read',
    'article:create',
    'article:update',
    'article:delete',
    'article:publish',
    'comment:moderate',
    'user:manage',
  ],
};

const PERMISSIONS = new Set(Object.values(ROLE_PERMISSIONS).flat());

function permissionsForRoles(roleKeys) {
  return new Set(roleKeys.flatMap((key) => ROLE_PERMISSIONS[key] || []));
}
```

#### 常见误区

> 权限矩阵放在需求文档里，代码里凭记忆写判断。

文档与代码漂移后，越权漏洞往往就从“记忆偏差”产生。应以代码中的权限定义为唯一事实源，矩阵由定义生成或定期对账。

> 把 URL 路径直接当权限字符串匹配。

路径会随版本重构，且同一资源可能有多个路径。权限应表达业务语义（`article:delete`），与路由解耦。

### 4. 守卫与中间件落地

#### 定义

守卫（Guard）是授权检查的统一执行点：在业务处理前根据当前用户的权限集合决定放行还是拒绝。在 Express 中通常以中间件工厂实现；在 NestJS 等框架中则是带元数据的守卫类。声明式写法描述“这个路由需要什么权限”，具体判断逻辑集中复用。

#### 与后端的关系

守卫只回答“一般资格”，不能替代数据归属判断。守卫应默认拒绝：权限集合加载失败、角色未知、权限未显式声明时一律拒绝，而不是放行。

#### 示例

```ts
import type { NextFunction, Request, Response } from 'express';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; roles: string[]; permissions: Set<string> };
    }
  }
}

// 要求全部具备：requirePermissions('a', 'b')
export function requirePermissions(...required: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ code: 'UNAUTHENTICATED', message: '请先登录' });
    }
    const ok = required.every((perm) => user.permissions.has(perm));
    if (!ok) {
      return res.status(403).json({ code: 'FORBIDDEN', message: '没有执行该操作的权限' });
    }
    next();
  };
}

// 任一具备即可
export function requireAnyPermission(...candidates: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.sendStatus(401);
    const ok = candidates.some((perm) => req.user!.permissions.has(perm));
    if (!ok) return res.sendStatus(403);
    next();
  };
}
```

```js
// 路由声明：读起来直接对应权限矩阵
app.post(
  '/api/articles',
  authenticate,
  requirePermissions('article:create'),
  createArticleHandler
);

app.post(
  '/api/comments/:id/moderate',
  authenticate,
  requirePermissions('comment:moderate'),
  moderateHandler
);
```

#### 常见误区

> 在每个处理函数里手写 if 判断角色名。

角色名散落在业务代码中，新增角色时需要全局搜改，极易漏改。应判断权限而非角色，并集中到守卫。

> 守卫通过后，处理函数里不再做任何检查。

守卫只证明“这类动作有资格”，对具体那条数据的归属仍需校验。

### 5. 资源 owner 归属与水平越权防护

#### 定义

水平越权（Horizontal Privilege Escalation）指用户本有权限操作“自己的”同类资源，却通过篡改标识访问了“其他同级用户”的资源。例如把请求中的订单 ID 从 `1001` 改成 `1002`，看到别人的订单。其根源是只检查“是否登录、是否有订单查看权”，没有检查“这条订单是不是你的”。

资源 owner 归属校验要求：每张需要隔离的表都有明确归属字段（如 `owner_id`、`org_id`）；查询时把归属条件放进 WHERE，而不是先按 ID 查出再判断；更新和删除同样带上归属约束并检查影响行数。

#### 与后端的关系

owner 校验是授权中最常被遗漏、也最容易在代码审查中发现的一层。安全写法是让数据库查询天然带归属条件，使“别人的数据”根本查不出来，而不是依赖开发者记得在拿到结果后比较。

#### 示例

```ts
// 危险写法：只按主键查，归属靠后面的人记得判断
// const order = await db.query('SELECT * FROM orders WHERE id = $1', [id]);

// 安全写法：归属条件进入查询本身
async function getOrderScoped(user: { id: string; permissions: Set<string> }, id: string) {
  const canViewAll = user.permissions.has('order:view:all');
  const sql = canViewAll
    ? 'SELECT * FROM orders WHERE id = $1'
    : 'SELECT * FROM orders WHERE id = $1 AND owner_id = $2';
  const params = canViewAll ? [id] : [id, user.id];
  const rows = await pool.query(sql, params);
  return rows[0] ?? null;
}
```

```js
// 更新同样限定归属，并以影响行数判断是否越权
app.patch('/api/orders/:id', authenticate, requirePermissions('order:update'), async (req, res) => {
  const result = await pool.query(
    'UPDATE orders SET status = $1 WHERE id = $2 AND owner_id = $3',
    [req.body.status, req.params.id, req.user.id]
  );
  if (result.rowCount === 0) {
    // 不存在或不属于当前用户：对外统一 404，避免暴露资源是否存在
    return res.status(404).json({ code: 'NOT_FOUND', message: '资源不存在' });
  }
  res.status(204).end();
});
```

```text
判断顺序：
1. 认证：你是谁
2. 动作权限：你能不能改订单
3. 归属条件：这条订单是不是你的
缺第 3 步就是水平越权
```

#### 常见误区

> 用 UUID 做主键，猜不到 ID 就不用做归属校验了。

“猜不到”不是访问控制。ID 会出现在分享链接、日志、浏览器历史里，安全必须建立在校验而非不可猜测上。

> 查不到别人数据时返回 403 更明确。

返回 403 会向攻击者确认“该资源存在但不属于你”，多数业务场景用 404 隐藏资源存在性更安全。

### 6. 垂直越权与最小权限

#### 定义

垂直越权（Vertical Privilege Escalation）指低权限用户执行了高权限角色才能做的操作，例如普通会员调用用户管理接口、普通员工访问财务报表。典型成因是管理接口只靠“入口 URL 隐蔽”保护，或授权检查被遗漏。

最小权限原则（Principle of Least Privilege）要求每个用户、每个进程只拥有完成当前任务所必需的最少权限，且权限时间尽可能短。默认角色应是权限最小的 member，敏感操作单独成权限，不要为了省事给大量用户挂 admin。

#### 与后端的关系

防御垂直越权的工程手段：所有敏感路由统一经过权限守卫；管理后台接口与普通接口分组并加组级守卫；为“低权限访问高权限接口”编写自动化测试；角色变更操作本身需要高权限与审计日志。

#### 示例

```js
// 管理接口分组：组级统一守卫，避免逐个路由漏挂
const adminRouter = express.Router();

adminRouter.use(authenticate);
adminRouter.use(requirePermissions('admin:area')); // 进入管理区的基础权限

adminRouter.post('/users/:id/roles', requirePermissions('user:manage'), async (req, res) => {
  const { roles } = req.body;
  // 禁止把角色提为 admin，除非操作者本身具备专门授权
  if (roles.includes('admin') && !req.user.permissions.has('user:assign-admin')) {
    return res.status(403).json({ code: 'FORBIDDEN', message: '无权授予管理员角色' });
  }
  await updateUserRoles(req.params.id, roles);
  res.status(204).end();
});

app.use('/api/admin', adminRouter);
```

```text
最小权限检查清单：
1. 新用户默认角色是不是权限最小的 member？
2. 敏感动作是否拆成独立权限，而不是用 admin 一刀切？
3. 服务进程、数据库账号是否只拿到必需权限？
4. 角色授予与回收是否有审计记录？
```

#### 常见误区

> 管理后台路径用 `/internal-xyz` 这种不公开地址，就不需要权限检查。

“通过隐蔽获得安全”不成立，路径一旦泄露或被枚举即失守。

> 开发者为了调试方便，长期保留自己的 admin 角色。

长期高权限账号违反最小权限，且是内部风险来源；应使用临时提权并留痕。

### 7. 组织与租户隔离

#### 定义

在多组织、多租户系统（SaaS）中，授权还包含一个范围维度：用户即使是某组织的管理员，也只能管理该组织内的资源，不能触及其他租户的数据。租户隔离通常通过每张业务表携带 `org_id`（或 `tenant_id`）实现，并在所有查询中强制带上该条件。

隔离强度常见三档：

| 方式 | 做法 | 特点 |
|---|---|---|
| 共享库共享表 + org_id | 逻辑隔离，查询带租户条件 | 成本低，依赖代码纪律 |
| 共享库独立 Schema | 每租户独立 Schema | 隔离增强，迁移复杂 |
| 独立库 | 每租户独立数据库 | 隔离最强，成本最高 |

#### 与后端的关系

租户上下文必须来自服务端可信来源（会话/令牌中已验证的 org 归属），不能信任请求体里传入的 `orgId`。工程上可通过 ORM 中间件、数据访问层封装自动注入租户条件，避免每个查询手写导致遗漏。

#### 示例

```ts
// 租户上下文来自已认证会话，忽略客户端提交的 orgId
function listInvoices(user: { id: string; orgIds: string[] }, queryOrgId?: string) {
  const orgId = queryOrgId && user.orgIds.includes(queryOrgId) ? queryOrgId : user.orgIds[0];
  if (!orgId) throw new AppError('FORBIDDEN', 403, '不属于任何组织');
  return pool.query('SELECT * FROM invoices WHERE org_id = $1 ORDER BY id DESC', [orgId]);
}
```

```js
// 数据访问层封装：所有发票查询必经租户条件
function invoiceRepository(reqUser) {
  const scoped = (sql, params = []) => {
    if (!/\borg_id\b/.test(sql)) {
      throw new Error('租户隔离缺失：查询必须包含 org_id 条件');
    }
    return pool.query(sql, [...params, reqUser.activeOrgId]);
  };
  return {
    list: () => scoped('SELECT * FROM invoices WHERE org_id = $1'),
    byId: (id) => scoped('SELECT * FROM invoices WHERE id = $1 AND org_id = $2', [id]),
  };
}
```

```text
用户在多个组织时的切换：
会话保存用户的 org 成员列表（服务端权威）
切换组织 -> 校验成员资格 -> 更新当前 activeOrg
之后所有查询只作用于该组织
```

#### 常见误区

> 相信前端传来的 orgId，省一次成员校验。

攻击者可传入任意 orgId 直接跨租户读取数据。组织成员资格必须由服务端验证。

> 管理员可以跨租户排障，所以不加 org_id 条件。

跨租户能力应通过受控的内部通道单独授予并审计，不能成为业务查询省略隔离的理由。

### 8. RBAC 的演进与边界

#### 定义

RBAC 以角色为中心，适合职责相对稳定的系统。当授权规则依赖动态属性时，例如“只能编辑工作时间内、且文档状态为草稿的文档”“只能审批金额不超过 5 万元的报销”，纯角色模型会力不从心。此时可引入 ABAC（Attribute-Based Access Control，基于属性的访问控制），根据用户属性、资源属性、环境属性（时间、地点、IP）动态计算决策。

常见折中是 RBAC 为主、资源归属与少量属性规则为辅：角色决定动作资格，owner/org 决定数据范围，个别复杂规则用策略函数或策略引擎（如 OPA/Cedar 思路）表达。

#### 与后端的关系

不要在项目第一天就引入复杂策略引擎，但应让授权决策点保持集中，未来才能把“写死的 if”替换为策略求值而不影响业务代码。

#### 示例

```text
RBAC：editor 可以 article:update
归属：只能更新 owner_id = 自己的文章
属性规则：status = 'published' 的文章需 article:republish 才能改

三者串联才是完整决策
```

```js
// 策略函数：在 RBAC 与 owner 之上叠加动态属性判断
function canUpdateArticle(user, article) {
  if (!user.permissions.has('article:update')) return false;
  if (article.owner_id !== user.id && !user.permissions.has('article:update:any')) {
    return false;
  }
  if (article.status === 'published' && !user.permissions.has('article:republish')) {
    return false;
  }
  return true;
}
```

#### 常见误区

> RBAC 解决不了某条特殊规则，说明模型失败，要整体推翻。

多数系统通过 RBAC + owner + 少量策略函数即可覆盖，无需一步到位上 ABAC 平台。

> 把复杂判断分散在各个接口里拼起来。

授权逻辑分散后无法统一审计。决策点集中，才能回答“谁在什么条件下能做什么”。

## 课后题

1. 一个完整的授权决定包含哪四个要素？请用“删除文章”这个具体请求逐项说明。
2. 为什么需要“角色”这一中间层，而不是把权限直接分配给用户？
3. 权限命名为什么推荐 `资源:动作` 形式？请设计一个“评论审核”功能对应的权限名。
4. 路由守卫解决了什么，没有解决什么？为什么守卫通过后业务代码仍要做归属校验？
5. 什么是水平越权？请构造一个具体的攻击请求，并指出代码层面的根因。
6. 什么是垂直越权？它和水平越权的区别是什么？
7. 场景分析：某团队为省事故，把所有新入职员工默认授予 admin 角色，后端连接数据库使用具备建库删表权限的 DBA 账号。请从最小权限角度指出至少三处风险，并给出默认角色、敏感授权和数据库账号三方面的整改方案。
8. 场景分析：成员 A 修改请求 URL 中的 `orderId` 后看到了成员 B 的订单。请给出查询代码的错误写法、安全写法，以及为什么推荐返回 404 而不是 403。
9. 场景分析：某 SaaS 系统支持多组织，接口允许在请求体传 `orgId` 切换组织。攻击者会如何利用？服务端应如何获取租户上下文？
10. 场景分析：某规则要求“编辑只能在工作日 9 点到 18 点修改状态为草稿的文档”。纯 RBAC 为什么不够？在不引入重型引擎的前提下如何落地？

## 实践练习题

### 练习 1：RBAC 数据模型与权限守卫

#### 任务

实现用户—角色—权限的数据模型，加载用户权限集合，并用统一守卫保护文章接口。

#### 步骤约束

1. 建立 users、roles、permissions、user_roles、role_permissions 五张表，并初始化 member、editor、admin 三个角色及其权限。
2. 实现登录后加载该用户全部权限并挂到 `req.user.permissions`；权限定义集中在一份常量文件。
3. 实现 `requirePermissions(...perms)` 中间件，默认拒绝，权限不足返回 403。
4. 为 article 的增删改查接口分别挂上对应权限，未登录返回 401。
5. 输出一张由代码定义生成的权限矩阵，确保代码与矩阵一致。

#### 提交物

- 建表脚本与初始化数据脚本；
- 权限常量文件与守卫代码；
- 三种角色调用各接口的结果矩阵记录；
- 200 字以内的设计说明。

#### 验收标准

- 多对多关系正确，权限可通过角色正确解析；
- 未显式授权的请求一律被拒；
- 接口表现与权限矩阵完全一致；
- 代码中不存在散落的硬编码角色判断；
- 矩阵与代码定义能够对账。

### 练习 2：资源归属与越权防护

#### 任务

在订单模块实现 owner 归属校验，并通过自动化测试覆盖水平与垂直越权。

#### 步骤约束

1. orders 表包含 `id`、`owner_id`、`status`；创建测试用户 A、B 与各自订单。
2. 查询、更新、删除接口的 SQL 必须带 `owner_id` 条件；越权访问返回 404。
3. 管理接口 `GET /api/admin/orders` 要求 `order:view:all` 权限，普通成员访问返回 403。
4. 用 Vitest 或等价工具编写测试：本人访问成功、访问他人订单 404、低权限访问管理接口 403。
5. 尝试把主键换成 UUID 再验证一次，说明“不可猜测”为何不能替代校验。

#### 提交物

- 订单路由与查询代码；
- 测试文件及运行结果；
- 越权请求与响应记录；
- 一段关于 403/404 选择的说明。

#### 验收标准

- 水平越权与垂直越权均有测试且通过；
- 归属条件出现在查询 SQL 中，而非事后判断；
- 越权响应不暴露资源是否存在；
- 测试可重复运行，不依赖手工数据；
- 不通过关闭守卫来让测试“变绿”。

### 练习 3：多组织租户隔离

#### 任务

把文章模块升级为多组织模型，实现组织成员资格校验与全查询租户条件注入。

#### 步骤约束

1. 增加 organizations 与 organization_members 表，文章携带 `org_id`；准备两个组织与交叉成员数据。
2. 会话保存用户所属组织列表；提供 `POST /api/switch-org`，切换前校验成员资格。
3. 所有文章查询必须带 `org_id` 条件；通过数据访问层封装自动注入，并对缺少 org 条件的查询直接报错。
4. 请求体中传入的 `orgId` 只允许在成员列表范围内生效，越范围返回 403。
5. 编写隔离测试：组织 X 的用户无论如何构造请求都读不到组织 Y 的文章。

#### 提交物

- 组织相关表结构与数据访问层代码；
- 组织切换与跨租户拒绝的证据；
- 隔离测试与结果；
- 一份“租户泄漏应急排查思路”说明。

#### 验收标准

- 跨租户请求全部被拒，数据库层面无跨组织结果返回；
- 租户上下文只来自服务端可信数据；
- 缺少 org 条件的查询无法执行；
- 测试覆盖成员、非成员、多组织切换三种身份；
- 说明文档能指出共享表方案的残余风险。

## 阶段验收作业

### 作业名称

RBAC 授权体系实现与越权防护验收

### 作业场景

一个内容协作平台已有登录认证，安全评审发现：文章接口没有统一授权、订单可通过改 ID 越权访问、多组织数据存在串读风险。你需要在现有服务上补全 RBAC 体系，并以矩阵、测试和现场演示证明每类风险已被堵住。

### 提交物

```text
authz-service/
├── src/
│   ├── authz/
│   │   ├── permissions.js      # 权限与角色定义（唯一事实源）
│   │   ├── guards.js           # requirePermissions
│   │   └── policies.js         # owner 与属性策略
│   ├── repositories/
│   │   ├── articles.js
│   │   └── orders.js           # 查询自带归属/租户条件
│   ├── routes/
│   │   ├── articles.js
│   │   ├── orders.js
│   │   └── admin.js
│   └── server.js
├── db/
│   ├── schema.sql
│   └── seed.sql
├── test/
│   └── authz.test.js
├── evidence/
│   ├── permission-matrix.md
│   └── attack-walkthrough.md
└── README.md
```

### 演示步骤

学员需在 20 分钟内完成：

1. 展示数据模型与权限矩阵，说明三种角色的权限边界。
2. 分别以 member、editor、admin 身份调用文章接口，结果与矩阵一致。
3. 以用户 A 身份尝试访问用户 B 的订单，展示返回 404，并指出 SQL 中的归属条件。
4. 以普通成员访问管理接口，展示 403；现场演示授予/回收角色后行为变化。
5. 在两个组织间切换，证明无法读取另一个组织的数据，伪造请求体 orgId 被拒绝。
6. 运行越权测试套件并解释断言对应的风险。
7. 回答导师提问：默认角色、管理员授予、向 ABAC 演进的预留方式。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| RBAC 模型 | 20 | 五表关系正确，权限定义集中，角色与矩阵一致 |
| 守卫落地 | 15 | 默认拒绝，声明式权限，401/403 正确 |
| 水平越权防护 | 20 | 查询自带 owner 条件，越权返回 404，测试覆盖 |
| 垂直越权与最小权限 | 15 | 管理接口组级守卫，敏感授权拆分，角色变更受控 |
| 租户隔离 | 15 | org 上下文可信，查询强制 org 条件，跨租户被拒 |
| 证据与工程规范 | 15 | 矩阵与攻击报告齐全，测试可运行，README 可复现 |

细分规则：

- RBAC 模型：表结构 8 分；权限定义集中 6 分；矩阵对账 6 分。
- 守卫落地：中间件正确性 8 分；状态码 7 分。
- 水平越权防护：归属查询 8 分；404 隐藏资源 6 分；测试 6 分。
- 垂直越权与最小权限：组级守卫 7 分；授权拆分与审计 8 分。
- 租户隔离：上下文来源 7 分；强制条件 8 分。
- 证据与规范：报告 8 分；可复现 7 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过：

1. 授权策略默认放行，或存在未经过任何守卫的敏感接口。
2. 可通过篡改资源 ID 读取或修改他人数据（水平越权成立）。
3. 低权限用户可成功调用管理接口（垂直越权成立）。
4. 可通过请求体传入 orgId 读取其他租户数据。
5. 权限判断只在前端完成，服务端无对应检查。
6. 提交真实账号、令牌或生产数据；伪造测试结果或关闭守卫制造通过。
7. 只提交截图，没有可运行代码、测试与请求证据。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解用户—角色—权限模型 | schema.sql 与模型讲解 |
| 维护权限矩阵 | permission-matrix.md 与代码对账 |
| 用守卫落地授权 | guards.js 与三角色接口演示 |
| 防御水平越权 | 订单归属查询、404 证据与测试 |
| 防御垂直越权与最小权限 | admin 路由组、角色变更演示 |
| 实现租户隔离 | 组织切换与跨租户拒绝证据 |
| 理解 RBAC 边界 | policies.js 与现场演进说明 |

### 提交前自检

- [ ] 六个学习目标均有对应证据。
- [ ] 权限定义只有一份事实源，矩阵由其生成或对账一致。
- [ ] 每个敏感路由都经过认证与授权守卫。
- [ ] 查询、更新、删除均带 owner 或 org 条件。
- [ ] 越权访问返回 404，垂直越权返回 403。
- [ ] 角色授予与回收有服务端控制与记录。
- [ ] 自动化测试覆盖水平越权、垂直越权与跨租户三类场景。
- [ ] README 能指导评审者在干净环境复现全部演示。
