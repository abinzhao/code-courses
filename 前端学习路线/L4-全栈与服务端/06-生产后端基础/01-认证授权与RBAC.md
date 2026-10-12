# 01 认证、授权与 RBAC

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L4 全栈与服务端
> - 先修：[03-Nginx、域名与 HTTPS](../05-部署与运维/03-Nginx-域名与HTTPS.md)
> - 建议用时：180-300 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN Web Docs](https://developer.mozilla.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 区分身份认证、会话管理、授权和资源归属校验
- 理解 Cookie Session、JWT、OAuth 2.0、OpenID Connect 的职责边界
- 能设计角色、权限、资源和操作之间的关系
- 能在服务端实施默认拒绝与最小权限
- 能安全处理密码、会话过期、注销和权限变更
- 能为 Atlas 建立权限矩阵和回归测试

---

## 内容讲解

### 一、四个问题不能混为一谈

```text
认证 Authentication：你是谁？
会话 Session：后续请求如何持续识别你？
授权 Authorization：你能做什么？
资源校验 Ownership/Policy：你能否操作这一条具体数据？
```

登录成功不等于拥有所有权限。管理员角色也不应自动绕过租户、数据地域或审计要求。

### 二、密码只保存慢哈希

注册流程：

```text
明文密码
  ↓ 参数校验
Argon2id / scrypt / bcrypt
  ↓ 独立随机 salt + 成本参数
数据库保存 password_hash
```

原则：

- 不保存明文密码。
- 不使用通用快速哈希直接处理密码。
- 不自行设计加密或“加盐算法”。
- 比较函数应由成熟密码库提供。
- 成本参数需要随硬件能力升级，并允许登录时渐进重哈希。

密码重置令牌应一次性、短时有效，只保存令牌哈希，并在成功使用后立即失效。

### 三、Cookie Session 与 JWT

#### Cookie Session

浏览器保存随机会话 ID，服务端保存会话数据：

```http
Set-Cookie: __Host-session=<random>; Path=/; HttpOnly; Secure; SameSite=Lax
```

优势：

- 服务端可立即撤销
- 权限变更易于生效
- Cookie 可设 HttpOnly

成本：

- 需要共享会话存储
- 跨区域读取需要设计

#### JWT

JWT 是带签名声明，不是加密容器：

```json
{
  "sub": "user-123",
  "aud": "atlas-web",
  "iss": "https://auth.example.com",
  "exp": 1791763200
}
```

验证必须包含：

- 签名算法白名单
- `iss`
- `aud`
- `exp` / `nbf`
- 密钥轮换

JWT 难以即时撤销，访问令牌应短时有效。浏览器长期会话通常仍需要安全 Cookie 与刷新机制。

### 四、OAuth 2.0 与 OpenID Connect

OAuth 2.0 解决委托访问，OpenID Connect 在其上增加身份层。

网页登录推荐 Authorization Code + PKCE：

```text
浏览器 → 身份提供方授权页
       ← authorization code
服务端 → code + verifier 换 token
服务端 → 校验 id_token 的 issuer/audience/nonce
服务端 → 建立自己的 Atlas 会话
```

不要把第三方 access token 当作自己的永久会话，也不要只解析 ID Token 而不验证签名和声明。

### 五、RBAC 是起点，不是全部

角色：

```text
reader
author
reviewer
admin
```

权限：

```text
article:read
article:create
article:update:self
article:review
article:publish
user:manage
```

权限矩阵：

| 操作 | reader | author | reviewer | admin |
|---|---:|---:|---:|---:|
| 阅读公开文章 | ✅ | ✅ | ✅ | ✅ |
| 创建草稿 | ❌ | ✅ | ✅ | ✅ |
| 编辑自己的草稿 | ❌ | ✅ | ✅ | ✅ |
| 审核文章 | ❌ | ❌ | ✅ | ✅ |
| 管理用户 | ❌ | ❌ | ❌ | ✅ |

RBAC 只能说明角色拥有什么能力。编辑文章时仍要检查：

```text
用户是否有 article:update:self
AND article.author_id === user.id
AND article.status 允许编辑
AND article.tenant_id === user.tenant_id
```

### 六、把授权放在服务端策略层

```ts
type Actor = {
  id: string;
  tenantId: string;
  permissions: Set<string>;
};

type Article = {
  authorId: string;
  tenantId: string;
  status: 'draft' | 'review' | 'published';
};

export function canUpdateArticle(actor: Actor, article: Article) {
  if (actor.tenantId !== article.tenantId) return false;
  if (actor.permissions.has('article:update:any')) return true;

  return (
    actor.permissions.has('article:update:self') &&
    actor.id === article.authorId &&
    article.status === 'draft'
  );
}
```

Route Handler、Server Function、后台任务都调用同一策略，不把权限只写在按钮显示逻辑中。

### 七、会话生命周期

必须定义：

- 绝对过期时间
- 空闲过期时间
- 登录后会话轮换
- 提权后重新认证
- 修改密码后的会话撤销
- 注销与全设备注销
- 权限变更何时生效

注销不只是删除浏览器状态，还要让服务端会话或刷新令牌失效。

### 八、审计日志

高风险操作记录：

```json
{
  "actorId": "user-123",
  "action": "article.publish",
  "resourceType": "article",
  "resourceId": "article-456",
  "result": "allowed",
  "requestId": "req-789",
  "occurredAt": "2026-10-12T10:30:00Z"
}
```

审计日志不保存密码、访问令牌和完整敏感内容，并限制读取权限。

---

## 常见问题

### Q1：JWT 放 localStorage 可以吗？

脚本可读取 localStorage，XSS 成功后令牌容易被窃取。浏览器会话优先评估 HttpOnly Secure Cookie，并同时处理 CSRF。

### Q2：前端隐藏按钮算权限控制吗？

不算。它改善体验，但攻击者仍可直接发请求。服务端必须再次授权。

### Q3：角色越多越灵活吗？

角色过多会形成组合爆炸。先定义稳定权限，再用角色聚合权限；特殊条件交给策略。

### Q4：管理员是否可以跳过资源归属校验？

取决于明确策略。跨租户、隐私和合规边界通常不能仅凭“管理员”绕过。

### Q5：OAuth 登录后还需要自己的会话吗？

通常需要。第三方身份只完成外部认证，应用仍要维护本地用户映射、权限和会话生命周期。

### Q6：接口返回 404 还是 403？

如果暴露资源是否存在会造成枚举风险，可以对无权访问者返回 404；团队需统一策略并保留内部审计原因。

---

## 实操作业

### 基础：权限矩阵

为 Atlas 的文章、评论、用户管理列出角色、权限和资源条件，至少覆盖：

- 自己的草稿
- 他人的草稿
- 已发布文章
- 跨租户访问

### 进阶：策略函数测试

实现 `canUpdateArticle`、`canPublishArticle`、`canDeleteComment`，使用表驱动测试覆盖允许和拒绝组合。

### 挑战：会话威胁测试

设计并验证：

- 会话固定攻击防护
- 过期令牌
- 权限变更后旧会话
- 重放注销后的刷新令牌
- 跨站请求
- 多设备注销

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L4 里程碑](../../projects/atlas/milestones/L4.md)
- 本课任务：按 L4 里程碑把“认证、授权与 RBAC”接入 Atlas 全栈版本，明确服务端信任边界、数据契约、失败响应和回滚方式。
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

- 认证、会话、授权和资源校验是不同层次
- 密码使用成熟慢哈希，令牌和会话需要完整生命周期
- JWT 是签名声明，不自动提供保密性和撤销能力
- RBAC 聚合权限，资源级策略决定具体数据是否可操作
- 前端权限只改善体验，服务端策略才是安全边界

<!-- course-nav:start -->
---

[上一篇：03-Nginx、域名与 HTTPS](../05-部署与运维/03-Nginx-域名与HTTPS.md) · [课程地图](../../README.md) · [下一篇：02 限流、幂等与优雅关闭](./02-限流-幂等与优雅关闭.md)
<!-- course-nav:end -->
