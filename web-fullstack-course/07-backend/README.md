# 07 后端与数据库

## 阶段任务

使用 Node.js、NestJS、PostgreSQL 和 Prisma 把 NoteFlow 从前端原型推进到具备真实数据、认证、组织隔离和 RBAC 的服务端系统。

## 周次范围

| 周次 | 主题 | 交付方向 |
| --- | --- | --- |
| W38–W39 | Node.js、NestJS、REST、输入校验、错误响应和 OpenAPI | 用户与文章 API |
| W40–W41 | PostgreSQL、SQL、Prisma、迁移、事务、索引和 N+1 | 核心数据模型与查询 |
| W42–W43 | 认证、Token 轮换、CORS、CSRF、组织隔离和 RBAC | 登录、成员和权限系统 |

## 阶段成果

- Controller、应用服务、查询/仓储和 Prisma 边界清晰。
- API 具备统一错误、输入校验、分页、筛选和 OpenAPI。
- 数据库具备迁移、约束、索引、事务和 `EXPLAIN` 证据。
- 服务端对每个组织资源执行成员关系和权限检查。

入口与阶段里程碑见[学习路径](../00-course-map/01-learning-path.md#第八阶段nodejsnestjs-与数据库)。
