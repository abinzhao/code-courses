# 现代前端工程化

本卷把“浏览器里能运行的代码”推进为可安装、可检查、可测试、可构建、可审查的工程。详细教程位于稳定编号章入口之下，共 `3/3/3/3/3/3/4` 篇；编号章路径保持不变，负责路线、依赖和章级验收。

实验使用框架无关的 TypeScript 页面和本机只读教学 API。它们能证明本地工具链与浏览器行为，不能证明真实认证、对象授权、事务、生产缓存、发布或回滚。

## 版本与运行条件

资料快照：2026-10-11。版本探针输出才是当前机器事实。

| 工具 | 课程选择 | 责任与边界 |
| --- | --- | --- |
| Node.js | `24.21.0` | 运行工具和教学 API，不替代浏览器 |
| pnpm | `12.10.1` | 解析依赖、生成锁文件、运行脚本 |
| Vite | `8.3.0` | 开发、Rolldown 生产构建与预览；不替代类型检查 |
| TS 7 主 CLI | `@typescript/native` -> `npm:typescript@7.0.2` | 提供 `tsc` |
| TS 6 兼容包 | `typescript` -> `npm:@typescript/typescript6@6.0.2` | 提供 `tsc6` 和旧编译器 API；实际内部版本用探针记录 |
| ESLint | `10.12.0` | Flat config 与代码规则 |
| Prettier | `3.8.0` | 格式检查，不证明业务正确 |
| Vitest | `5.0.0` | Node 单元与集成行为 |
| Playwright | `1.64.0` | 匹配 Chromium 的构建页行为 |

首次安装由 pnpm 生成 `pnpm-lock.yaml`，后续使用 `--frozen-lockfile`。教材仓库只保存 Markdown；包清单、锁文件、依赖、构建产物、浏览器下载和报告只能出现在读者练习目录或 `/tmp/full-course-verification/`。

## 学习路线

### 01 pnpm、Vite 与 ESM

章入口：[建立可复现的起点](01-pnpm-vite-esm.md)

1. [Node、pnpm、清单与锁文件](01-pnpm-vite-esm/01-node-pnpm-manifests-lockfiles.md)
2. [Vite、ESM、开发、构建与预览](01-pnpm-vite-esm/02-vite-esm-dev-build-preview.md)
3. [TS 7 与 TS 6 并行类型检查](01-pnpm-vite-esm/03-ts7-ts6-parallel-typecheck.md)

### 02 Lint、格式与质量门禁

章入口：[让失败归属到具体工具](02-lint-format-quality.md)

1. [Prettier 格式范围与忽略边界](02-lint-format-quality/01-prettier-format-scope.md)
2. [ESLint Flat Config 与 TypeScript](02-lint-format-quality/02-eslint-flat-config-typescript.md)
3. [质量门与失败诊断](02-lint-format-quality/03-quality-gates-failure-diagnostics.md)

### 03 构建、资源、缓存与性能预算

章入口：[从模块图到可执行预算](03-build-assets-performance.md)

1. [Vite 构建图、chunk 与动态导入](03-build-assets-performance/01-vite-build-graph-chunks-dynamic-import.md)
2. [客户端变量、Source Map、缓存与发布](03-build-assets-performance/02-client-env-sourcemaps-cache-release.md)
3. [资源预算与生产预览](03-build-assets-performance/03-asset-budget-production-preview.md)

### 04 Workspace、组件库与 Design Tokens

章入口：[建立可解释的包边界](04-workspace-component-library.md)

1. [pnpm Workspace 依赖图](04-workspace-component-library/01-pnpm-workspace-dependency-graph.md)
2. [包导出、契约与发布边界](04-workspace-component-library/02-package-exports-contracts-publishing.md)
3. [Design Tokens 与跨框架边界](04-workspace-component-library/03-design-tokens-cross-framework-boundaries.md)

### 05 单元、集成与端到端测试

章入口：[按证据层选择测试](05-unit-integration-e2e.md)

1. [Vitest 领域单元边界](05-unit-integration-e2e/01-vitest-unit-domain-boundaries.md)
2. [Vitest HTTP 集成与请求竞态](05-unit-integration-e2e/02-vitest-integration-http-races.md)
3. [Playwright 构建页端到端测试](05-unit-integration-e2e/03-playwright-built-page-e2e.md)

### 06 Git、CI 与发布

章入口：[让证据跟随同一提交](06-ci-git-release.md)

1. [Git 范围、审查与可回退提交](06-ci-git-release/01-git-scope-reviewable-commits.md)
2. [可复现 CI 质量流水线](06-ci-git-release/02-ci-reproducible-quality-pipeline.md)
3. [制品、发布、缓存与回滚边界](06-ci-git-release/03-artifacts-release-cache-rollback.md)

### 07 工程结业

章入口：[从干净安装到浏览器验收](07-engineering-capstone.md)

1. [结业项目契约与脚手架](07-engineering-capstone/01-capstone-contract-scaffold.md)
2. [领域、页面与本机教学 API](07-engineering-capstone/02-capstone-domain-app-teaching-api.md)
3. [测试、构建、预算与浏览器门禁](07-engineering-capstone/03-capstone-tests-build-budget-browser.md)
4. [干净环境重建与证据记录](07-engineering-capstone/04-clean-room-verification-evidence.md)

## 连续项目与边界

本卷的 `market-engineering-capstone` 使用完整 `Listing` 契约，价格是非负安全整数分，持久化时间是 UTC ISO 8601，外部 JSON 在运行时解析前保持 `unknown`。搜索同时使用取消和 generation guard；取消旧请求不代表撤销服务端写入。

`apps/lab-web` 是隔离工程实验，不替代 React、Vue 或真实后端。浏览器 bundle、`VITE_` 变量和公开 Source Map 不能承载秘密。路由拦截、本机只读 API 和 Mock 数据不能证明认证、对象授权、事务或生产回滚。

## 验收入口

- [工程化覆盖矩阵](ENGINEERING-COVERAGE.md)：知识点到理论、案例、诊断、练习与验收的映射。
- [自检与验证记录](SELF-CHECK.md)：保留 2026-10-10 历史证据，并记录 2026-10-11 教材扩展的实际结果。
- [统一项目契约](../00-guide/05-project-assessment.md)
- [版本基线](../00-guide/02-version-baseline.md)

最终本地链路应分别观察格式、Lint、TS 7、TS 6、Vitest、Vite、gzip 预算和 Playwright，再运行聚合 `pnpm verify`。构建成功不替代其他门，聚合命令名也不证明未在日志中出现的步骤。

## 官方入口

- [Node.js 发布](https://nodejs.org/en/about/previous-releases)
- [pnpm](https://pnpm.io/)
- [Vite Guide](https://vite.dev/guide/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Vitest](https://vitest.dev/guide/)
- [Playwright](https://playwright.dev/docs/intro)
- [全书入口](../README.md)
