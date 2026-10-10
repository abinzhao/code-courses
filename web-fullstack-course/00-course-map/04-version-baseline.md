# 版本基线与发布前核验

## 为什么要记录版本

教程中的命令和代码都依赖运行时。为了让学习者能复现结果，课程把“大版本能力”和“具体补丁版本”分开：

- 正文解释稳定的 API 契约。
- 实验仓库使用锁文件固定具体依赖。
- 每次课程重发前复核官方支持状态、迁移说明和安全公告。

完整版本清单见[根目录技术版本基线](../../03-technology-version-manifest.md)。

## 课程主线基线

| 技术 | 主线基线 | 课程用途 |
| --- | --- | --- |
| Node.js | 24.21.x LTS | 浏览器配套工具、Node.js 服务和脚本 |
| TypeScript | 6.0.2 | 类型安全前端和后端代码 |
| React | 19.3.x | React 管理后台 |
| Next.js | 16.x | 公共内容侧 SSR |
| Vue | 3.5.x | Vue 管理后台 |
| Vite | 8.x | React/Vue CSR 构建 |
| pnpm | 12.11.x | Workspace、Monorepo 和依赖管理 |
| NestJS | 12.x | REST API 与模块化后端 |
| PostgreSQL | 18.x | 关系数据库 |
| Prisma | 7.10.x | Schema、迁移、查询和事务 |
| Redis | 8.x | 缓存、短期状态和队列基础设施 |
| BullMQ | 6.x | 异步任务队列 |
| Playwright | 1.64.x | 浏览器端到端测试 |
| Docker Compose | v2 | 本地编排和部署 |

## W1 使用范围

W1 不需要安装全部课程工具，只观察四类基础环境：

| 工具 | 作用 | W1 验证方式 |
| --- | --- | --- |
| 浏览器 | 发起请求、解析页面、显示资源和提供 DevTools | 打开 U01 并查看 Network |
| Node.js | 运行静态服务器和环境检查脚本 | `node --version`、运行 `.mjs` |
| pnpm | 后续课程的包管理器 | `pnpm --version` |
| Git | 记录可恢复的项目变更 | `git status`、`git log` |

Node.js 22 或 pnpm 命令损坏时，学习者仍可以完成浏览器观察；但环境检查必须如实记录失败原因。

## 版本冻结文件

正式实现课程代码时，项目根目录应包含：

```text
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
.nvmrc
.node-version
```

建议的 `package.json` 运行时约束：

```json
{
  "engines": {
    "node": ">=24.21.0 <25",
    "pnpm": ">=12.11.0 <13"
  },
  "packageManager": "pnpm@12.11.0"
}
```

## 每次发布前核验

```bash
node --version
pnpm --version
pnpm outdated
pnpm audit
pnpm -r typecheck
pnpm -r lint
pnpm -r test
```

还要人工检查：

- Node.js Releases 和 LTS 状态
- React、Next.js、Vue、NestJS 官方迁移文档
- PostgreSQL 和 Prisma 兼容性
- Playwright 浏览器支持
- 关键依赖安全公告和弃用通知

## 官方资料入口

- [Node.js Releases](https://nodejs.org/en/about/previous-releases)
- [React Blog](https://react.dev/blog)
- [Next.js Support Policy](https://nextjs.org/support-policy)
- [Vue 官方文档](https://vuejs.org/guide/introduction.html)
- [NestJS Migration Guide](https://docs.nestjs.com/migration-guide)
- [PostgreSQL Releases](https://www.postgresql.org/docs/current/release.html)
- [Prisma ORM](https://www.prisma.io/docs/orm)
- [pnpm 文档](https://pnpm.io/)
- [Playwright 文档](https://playwright.dev/docs/intro)
