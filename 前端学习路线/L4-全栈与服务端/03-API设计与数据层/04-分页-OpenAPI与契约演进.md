# 分页、OpenAPI 与契约演进

<!-- course-meta:start -->
> - 层级：L4
> - 先修：[REST](./01-RESTful设计规范.md)、[服务端校验](./03-数据校验与错误处理.md)
> - 建议用时：180 分钟
> - 一手资料：[OpenAPI](https://spec.openapis.org/oas/latest.html)、[HTTP 语义](https://httpwg.org/specs/rfc9110.html)
<!-- course-meta:end -->

## 学习目标

- 能定义稳定分页与机器可读接口契约。
- 能区分兼容新增与破坏性变化，并验证旧消费者。

## 内容讲解

### 1. 契约包含什么

接口至少记录方法、路径、认证方式、参数、schema、状态码、错误码、分页、大小限制、幂等与版本规则。TypeScript 类型不自动构成运行时验证，也不能代替 HTTP 契约。

OpenAPI 可描述这些边界，并生成客户端或契约测试；schema 与实际行为仍需通过测试对账。不要只生成漂亮文档却返回不同错误结构。

### 2. offset 与 cursor

offset 易于跳页，但大量数据和并发插入可能造成慢查询、重复或漏行。cursor 更适合稳定顺序连续读取，仍需处理游标权限、过期、排序变化和被删除行。

PostgreSQL 示例以 created_at 和 id 组成全序：

```sql
SELECT id, title, created_at
FROM articles
WHERE status = 'published'
  AND (created_at, id) < ($1::timestamptz, $2::uuid)
ORDER BY created_at DESC, id DESC
LIMIT $3;
```

第一页没有 cursor，省略元组条件；查询 limit+1 判断是否还有下一页。字段、方向和筛选必须一致，配套索引 `(status, created_at DESC, id DESC)` 并以 EXPLAIN 验证。

cursor 可编码为版本化结构，Base64 不防篡改。游标不是授权令牌；每次请求仍执行租户和用户过滤。需要签名时由服务端验证，不把用户提供 SQL 片段当游标。

### 3. 条件请求与并发更新

读取返回 ETag，更新使用 If-Match；版本不匹配返回 412，或在业务 revision 协议中使用 409。选择一种清晰方案并定义客户端恢复，不能混用导致消费者误判。

缓存键需包含实际影响响应的用户、语言和筛选维度。私有数据不能因 URL 相同就进入共享缓存。

### 4. 兼容演进

| 变化 | 常见兼容影响 |
|---|---|
| 新增可选响应字段 | 通常兼容，但严格消费者仍要测试 |
| 新增必填请求字段 | 破坏旧客户端 |
| string 改 number | 破坏类型和解析 |
| 新 enum 值 | exhaustive 客户端可能失败 |
| 删除字段/路径 | 破坏 |
| 修改错误码/排序 | 可能破坏业务行为 |

先部署能同时接受新旧请求的服务端，再升级客户端，确认旧版本退出后收紧契约。版本策略可以路径、头或契约版本；关键是有消费者清单、废弃期和观测证据。

## 常见问题

**有 tRPC 就不需要版本兼容吗？** 同仓库类型不阻止旧部署、移动端或扩展继续调用旧接口。

**游标分页不会漏数据吗？** 在约定顺序和一致性模型下改善稳定性，不保证所有并发变化都得到快照级结果。

## 实操作业

基础定义文章分页 OpenAPI；进阶插入同一 created_at 的多条数据验证 id tie-breaker；挑战升级字段并跑旧消费者。

### 参考答案与验收

每页无重复 ID，游标稳定排序且限制 page size；非法游标返回明确 4xx，不泄漏 SQL。兼容报告包含旧客户端真实调用，不能只对比类型文件。

<!-- atlas-task:start -->
## Atlas 项目任务

为 Atlas 列表和编辑接口定义分页、错误、版本和并发更新契约。见 [L4 里程碑](../../projects/atlas/milestones/L4.md)。
<!-- atlas-task:end -->

---

## 本节小结

API 设计要覆盖数据顺序、并发与旧消费者，而不仅是 URL 命名。

<!-- course-nav:start -->
---

[上一篇：03-数据校验与错误处理](./03-数据校验与错误处理.md) · [课程地图](../../README.md) · [下一篇：SSE、WebSocket 与断线恢复](./05-SSE-WebSocket与断线恢复.md)
<!-- course-nav:end -->
