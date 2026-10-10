# 存储与安全：本地数据不是保险箱，登录也不等于有权

本章先按生命周期选择内存、Web Storage 与 IndexedDB，再把 Cookie、XSS、CSRF、CORS 和对象授权拆成独立边界。目标是知道数据由谁拥有、何时可能丢失、哪个脚本能读取，以及服务端必须拒绝哪些请求。

## 本章任务

你将完成：

1. 对比内存、sessionStorage、localStorage 的刷新与跨标签行为。
2. 使用版本化 schema 读取本地偏好并暴露并发覆盖。
3. 建立 IndexedDB v1→v2 迁移、索引、提交和回滚证据。
4. 运行本地 Cookie 会话与攻击页，验证 XSS、CSRF 和对象授权。

章级产出是“商品草稿与安全边界证据包”：三组完整实验、跨标签记录、数据库升级/回滚记录、安全请求矩阵和未验证边界。

## 必要前置

- [browser-lab 运行契约](README.md#多文件实验怎样启动)
- [邻里集市项目与安全主线](../00-guide/05-project-assessment.md#6-会话和安全主线)
- [缓存与 CORS](01-network-http-cache/03-cache-validation-cors-observation.md)
- JavaScript 对象、JSON、Promise 与事件基础

所有实验仅使用虚构商品和本机数据。不要输入真实凭据、Cookie、Token 或个人信息；不要把本地 HTTP Cookie 配置复制到生产。

## 学习路线

| 顺序 | 教程 | 核心问题 | 建议投入 | 关键证据 |
| --- | --- | --- | ---: | --- |
| 1 | [内存、Web Storage 与跨标签冲突](03-storage-security/01-memory-web-storage-cross-tab.md) | 刷新、开新标签或清站点数据后还剩什么？ | 90～120分钟 | 生命周期、storage事件、revision |
| 2 | [IndexedDB 事务、索引与升级](03-storage-security/02-indexeddb-transactions-upgrades.md) | 结构化草稿怎样提交、迁移和回滚？ | 100～130分钟 | v1→v2、blocked、abort |
| 3 | [源、Cookie、XSS、CSRF 与对象授权](03-storage-security/03-origin-cookie-xss-csrf-authorization.md) | 谁能读响应、谁在登录、谁有权改对象？ | 120～150分钟 | 401/403/409、攻击页复验 |

先掌握可丢失的本地状态，再学习事务型草稿，最后进入服务端身份与权限。不要用前两课的浏览器存储替代第三课的会话和授权。

## 邻里集市综合任务

建立一份数据责任表：

| 数据 | 建议位置 | 丢失/冲突处理 | 安全边界 |
| --- | --- | --- | --- |
| 当前筛选与展开 | 内存 | 刷新重建 | 不含秘密 |
| 主题与页尺寸 | localStorage | schema校验、默认值 | 同源脚本可读 |
| 未发布商品草稿 | IndexedDB | 事务、迁移、可恢复 | 可清理，不是权威商品 |
| 已发布 Listing | 服务端数据库 | version冲突409 | 认证 + owner授权 |
| 收藏与预约 | 服务端数据库 | 幂等/唯一约束/事务 | 当前用户与对象规则 |
| 会话标识 | HttpOnly Secure Cookie（生产） | 过期、轮换、撤销 | CSRF与HTTPS |

综合流程必须满足：草稿发布成功后才删除本地草稿；网络失败保留；409展示服务器版本；页面使用文本 sink；跨站写请求被拒绝；已登录用户修改他人商品仍返回403。

## 综合验收

- [ ] 三篇教程的 Node/HTML/JS（含攻击页）完整案例均可运行。
- [ ] 能区分内存、sessionStorage、localStorage、IndexedDB 和服务端数据库。
- [ ] 本地持久数据都经过 schema 与业务字段校验。
- [ ] 跨标签写入不会被静默当作无冲突。
- [ ] IndexedDB 从空库和v1两条路径都能到v2。
- [ ] 保存成功以事务 complete 为准，故障事务完整回滚。
- [ ] blocked/versionchange 有明确恢复路径。
- [ ] 攻击形状标题只显示文本，不产生可执行节点。
- [ ] 无会话401、坏CSRF/他人对象403、旧版本409均有证据。
- [ ] 请求体伪造 ownerId/role 不改变服务端授权。
- [ ] CORS、SameSite、CSRF、XSS 与对象授权职责没有混用。
- [ ] 生产 HTTPS、Secure Cookie、真实域名、多浏览器、隐私模式、配额与独立安全测试标为未验证。

验收者会随机执行清站点数据、保持旧数据库连接、改 CSRF token、改 listing ID 和输入 HTML 形状文本。每种结果都必须可解释且不破坏其他路径。

## 章节导航

[上一章：渲染与事件循环](02-rendering-event-loop.md) · [下一章：Fetch、流与实时通信](04-fetch-streams-realtime.md) · [浏览器卷](README.md)
