# 06 认证、会话与授权：分开身份、对象和角色

## 本章使命

本章不实现“一个登录按钮”，而是建立三道不可混淆的服务端边界：

1. 密码哈希与账号查询验证“提交者掌握某账号凭据”；
2. opaque session 把高熵随机凭据换成短期服务端会话，Cookie/Origin/CSRF 保护浏览器请求；
3. 对象授权与 RBAC 根据可信 actor、目标对象和动作决定允许或拒绝。

认证成功只得到身份，不自动获得任意 Listing 的编辑权。前端隐藏按钮、body 中的 `ownerId`、
Cookie 存在或客户端提交的 `role=admin` 都不是授权证据。

## 必要前置与版本

先完成：

- [Node HTTP、错误与关闭](01-node-runtime-http.md)；
- [NestJS DTO、Pipe 与错误契约](02-nest-api-validation.md)；
- [PostgreSQL 数据访问](04-postgres-data-access.md)；
- [事务与并发](05-transactions-concurrency.md)；
- [邻里集市项目契约](../00-guide/05-project-assessment.md)。

课程使用 Node.js 24 标准库异步 `scrypt`、服务端 PostgreSQL session、同源 HttpOnly Cookie。
参数需要在实际部署硬件上测量；教材值是可运行起点，不是永久安全常量。示例账号、密码、session
和 CSRF token 均为虚构或运行时随机值，不记录原文、不提交 Cookie jar。

## 学习路线

| 顺序 | 教程 | 核心问题 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [密码哈希与账号边界](06-auth-sessions-rbac/01-password-hashing-account-boundaries.md) | 怎样保存可验证但不可恢复的密码，并降低账号枚举 | 140 分钟 |
| 2 | [Cookie 会话、Origin 与 CSRF](06-auth-sessions-rbac/02-cookie-sessions-origin-csrf.md) | opaque session 如何创建、轮换、过期、撤销和防跨站写入 | 160 分钟 |
| 3 | [认证、对象授权与 RBAC](06-auth-sessions-rbac/03-authentication-object-authorization-rbac.md) | 401、403、owner 条件和角色能力如何分层验证 | 150 分钟 |

依赖顺序是“验证凭据 → 建立请求身份 → 对每个动作授权”。不能跳过第二步把密码每次发给业务接口，
也不能跳过第三步把“已登录”当作“有权操作”。

## 章级邻里集市任务

完成注册、登录、当前用户、退出、编辑商品和管理员统计的安全闭环：

1. 注册 DTO 拒绝 `role`、`id` 和未知字段；邮箱规范化，密码在落库前异步高成本哈希。
2. 登录对不存在账号与错误密码返回相同公开错误，并执行同类成本验证路径。
3. 登录成功生成至少 32 随机字节的 opaque sid；数据库只保存 sid 摘要、会话用户、CSRF 摘要/
   token、创建和绝对过期时间。
4. 响应设置 `HttpOnly`、生产 `Secure`、明确 `SameSite`、`Path` 与过期；登录后轮换会话。
5. 浏览器 unsafe 请求同时验证精确允许 Origin 和绑定当前 session 的 CSRF token。
6. logout 删除服务端 session 并用相同 Cookie 属性清除浏览器 Cookie；旧 sid 重放得到 401。
7. 认证 guard 只建立 actor；Listing 服务单独检查 owner；RBAC guard 只处理明确管理能力。
8. 未认证返回 401；已认证但无权返回 403（或按明确存在性隐藏策略返回 404）；version 冲突返回 409。
9. 日志不含密码、password_hash、sid、Cookie、CSRF token、连接串或完整认证 header。

## 综合验收与证据

| 检查 | 合格证据 | 不能推出的结论 |
| --- | --- | --- |
| 密码单元测试 | 随机盐不同、正确/错误验证、损坏格式受控失败 | 登录 HTTP 已安全 |
| 防枚举测试 | 不存在/错误密码同 status/code/message，均执行 derive | 互联网时序完全不可区分 |
| session 单元测试 | 原 sid 与摘要不同、过期/撤销失败 | Cookie 属性正确 |
| Set-Cookie 检查 | HttpOnly/Path/SameSite/Expires，生产 Secure | CSRF 已完成 |
| Origin + CSRF | 邪恶/缺失 Origin 或 token 返回 403 | XSS 已被防止 |
| logout 重放 | 服务端删除后旧 Cookie 401 | 所有设备都已退出 |
| 对象授权 | 用户乙 PATCH 用户甲商品 403，数据库不变 | 管理员策略自动正确 |
| RBAC | 普通用户管理统计 403，管理员 200 | 管理员可绕过对象规则 |
| anti-enumeration | 登录错误响应一致，日志脱敏 | 注册策略无需设计 |

章级验收：

- [ ] 密码不使用普通 SHA-256/可逆加密，哈希格式包含版本与参数。
- [ ] 不存在账号仍运行固定 dummy hash 的验证路径。
- [ ] sid 是高熵 opaque 随机值，数据库不保存可直接使用的原文。
- [ ] Cookie、Origin、SameSite、CORS、CSRF 和 TLS 的职责分别说明。
- [ ] unsafe 请求的 Origin 与 CSRF 都由服务端验证。
- [ ] 认证、对象授权、RBAC 分别有测试，body/前端角色不可信。
- [ ] 401/403/404/409 使用一致且可解释，没有全部返回 200。
- [ ] 日志、错误和测试快照没有敏感凭据。
- [ ] 内存 session/静态策略测试明确标注，真实持久会话需 PostgreSQL/HTTP 证据。

## 证据边界

密码纯函数测试不证明账号数据库或速率限制；内存 session store 不证明多副本、重启持久化和真实
Cookie；策略函数不证明控制器已调用它。只有真实 HTTP、PostgreSQL session 状态和数据库对象
不变断言共同证明集成路径。CSRF 不防 XSS，CORS 不替代 CSRF，TLS 不替代认证，RBAC 不替代对象
授权。

## 章节导航

[上一章：事务与并发](05-transactions-concurrency.md) ·
[后端卷目录](README.md) ·
[后端覆盖矩阵](BACKEND-COVERAGE.md) ·
[下一章：搜索、分页与文件](07-search-pagination-files.md)
