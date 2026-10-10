# 01 pnpm、Vite 与 ESM：建立可复现的工程起点

## 本章任务

把一个空目录建设为可复现的邻里集市浏览器工程，并为后续质量门禁保留清楚的工具边界：

- Node.js `24.21.0` 负责运行时；
- pnpm `12.10.1` 负责依赖图、锁文件与脚本入口；
- Vite `8.3.0` 负责开发服务、Rolldown 生产构建与本地预览；
- TS 7 `tsc` 负责主线类型检查；
- TS 6 `tsc6` 与包名 `typescript` 负责旧编译器 CLI/API 兼容。

本章完成后，读者应能从干净安装得到同一模块图，在浏览器展示整数分金额，并分别取得
dev、build、preview、TS 7 与 TS 6 的证据。

## 必要前置与边界

前置：

- 完成 JavaScript/TypeScript 卷，理解 ESM、DOM、`unknown` 与运行时解析；
- 能使用 `pwd`、`cd`、`node --version` 和浏览器 DevTools；
- 已阅读[课程版本基线](../00-guide/02-version-baseline.md)与[邻里集市统一契约](../00-guide/05-project-assessment.md)。

边界：

- 所有实验建立在读者自己的 `$HOME/code/market-engineering-lab`，不在教材目录安装依赖；
- 价格始终为非负安全整数分，持久时间始终为 UTC ISO 8601；
- 本地静态数据明确标记为教学数据，外部 JSON 在运行时解析前保持 `unknown`；
- Vite 转译不替代类型检查，build 成功不替代 Lint、测试、浏览器与部署验证；
- preview 不是生产服务器，不证明认证、授权、事务、TLS、缓存或回滚；
- 不向教材仓库加入 `package.json`、锁文件、`node_modules`、`dist` 或 `labs/`。

## 三课学习路线

| 顺序 | 教程 | 核心产出 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [Node、pnpm、清单与锁文件](01-pnpm-vite-esm/01-node-pnpm-manifests-lockfiles.md) | 精确清单、生成锁文件、冻结重装与失败证据 | 3 小时 |
| 2 | [Vite、ESM、开发构建与预览](01-pnpm-vite-esm/02-vite-esm-dev-build-preview.md) | HTML/TS/CSS 模块图、dev/build/preview 三类证据 | 3.5 小时 |
| 3 | [TS 7 与 TS 6 并行类型检查](01-pnpm-vite-esm/03-ts7-ts6-parallel-typecheck.md) | `tsc`、`tsc6`、旧 API 和兼容失败证据 | 3.5 小时 |

依赖关系：

```text
清单与锁文件
  └── Vite 模块图和生产产物
      └── TS 7 主检查 + TS 6 兼容检查
          └── 第 02 章静态质量门禁
```

三课必须按顺序完成。第二课沿用第一课生成的锁文件，第三课在有意增加 Lint 依赖后更新锁文件；
不能混用三份互相矛盾的清单。

## 章级邻里集市任务

在独立练习目录完成一个“本地静态教学数据”列表页：

1. 台灯价格为 `1990` 分，页面显示 `19.90 元`；
2. 旧书价格为 `0` 分，页面显示 `0.00 元`；
3. `createdAt` 使用规范 UTC ISO 8601；
4. HTML 入口通过 ESM 连接 TypeScript 与 CSS；
5. 开发服务使用严格端口 `5173`；
6. Vite 8 构建生成带 hash 的生产资源；
7. preview 使用严格端口 `4173` 加载 `dist`；
8. TS 7 与 TS 6 读取同一份共享配置并独立通过；
9. `typescript` 包名继续提供旧 API，不能被 TS 7 CLI 结论替代。

这个任务不连接真实后端，没有登录、对象授权、预约事务或持久化。静态数据和本地 preview 不能被写成
生产能力。

## 综合验收证据

| 证据层 | 命令或观察 | 通过标准 |
| --- | --- | --- |
| 运行时 | `node --version` | `v24.21.0` |
| 包管理器 | `pnpm --version` | `12.10.1` |
| 干净安装 | 删除读者练习的 `node_modules` 后运行 `pnpm install --frozen-lockfile` | 退出 `0`，未改锁文件 |
| 锁文件门禁 | 制造清单/锁文件不一致后冻结安装 | 非零退出；恢复后再次通过 |
| 开发服务 | `pnpm dev` | `5173` 显示 `19.90` 与 `0.00`，可观察源码图 |
| 生产构建 | `pnpm build` | 双类型检查先通过，随后生成练习目录 `dist/` |
| 生产预览 | `pnpm preview` | `4173` 加载 `/assets/` 产物，不请求 `/src/main.ts` |
| TS 7 | `pnpm exec tsc --version`、`pnpm typecheck` | 精确 `7.0.2`，退出 `0` |
| TS 6 CLI | `pnpm exec tsc6 --version`、`pnpm typecheck:compat` | 观察到 6.0 系列，退出 `0` |
| TS 6 API | Node ESM 导入 `typescript` 并打印 `ts.version` | 与 `tsc6` 实际版本相同 |
| 组合检查 | `pnpm typecheck:all` | 任一编译器失败都会阻止后续阶段 |
| 兼容故障 | 暂时禁用安装结果中的 `typescript` 入口 | TS 7 仍成功，Lint/旧 API 路径明确失败；恢复后全绿 |

验收记录必须包含命令、版本、退出码、浏览器 URL、Network 资源路径和失败恢复。只写“运行成功”不构成
可复核证据。

## 章级完成标准

- [ ] 能解释 Node 与 pnpm 的不同责任。
- [ ] 锁文件由 pnpm 生成，冻结安装能阻止清单漂移。
- [ ] 删除安装产物后可从清单和锁文件恢复。
- [ ] ESM 与 CSS 模块图在开发服务中可观察。
- [ ] build 与 preview 的证据没有和 dev 混写。
- [ ] 金额与 UTC 边界符合邻里集市契约。
- [ ] `tsc`、`tsc6`、`import "typescript"` 三条路径命名一致。
- [ ] 双编译器都检查同一份普通 TypeScript 源码。
- [ ] Vue SFC、真实后端、托管 CI、跨浏览器和生产发布仍明确标为未验证。
- [ ] 教材仓库中没有出现包清单、锁文件、安装目录或构建产物。

## 上下章导航

[上一单元：工程化卷导读（第 00 单元）](README.md) ·
[返回工程化卷目录](README.md) ·
[下一章：Lint、格式与质量门禁](02-lint-format-quality.md)
