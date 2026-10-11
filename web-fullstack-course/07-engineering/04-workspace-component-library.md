# 04 Workspace、组件库与 Design Tokens

## 本章任务

把单应用工程扩展为边界清楚的 pnpm workspace：`apps/lab-web` 负责浏览器入口，`packages/contracts` 负责环境无关的类型、运行时解析与整数分规则，`packages/ui` 负责公共样式入口和浏览器视觉原语。完成后，你应能从依赖图、包公共入口、发布产物和跨框架消费四个角度解释“共享什么、由谁依赖、怎样验证”。

本章仍是本地教学工程，不连接真实账号、数据库或预约写接口。价格在存储、传输和计算阶段始终使用非负安全整数分，`1990` 与 `0` 只在展示层格式化为 `19.90` 与 `0.00`。外部 JSON 在运行时解析成功前保持 `unknown`。共享类型、workspace 链接和页面按钮都不能证明身份、对象授权、事务或生产发布已经成立。

## 必要前置

- 完成[第 01 章：pnpm、Vite 与 ESM](01-pnpm-vite-esm.md)，能区分清单、根锁文件、安装结果与运行时解析。
- 完成[第 02 章：Lint、格式与质量门禁](02-lint-format-quality.md)，保留 `typecheck`、`typecheck:compat` 与 `typecheck:all` 三个明确入口。
- 完成[第 03 章：构建、资源、缓存与性能预算](03-build-assets-performance.md)，知道 Vite 构建成功不等于类型、行为、无障碍或发布通过。
- 准备 Node.js `24.21.0`、pnpm `12.11.2`、Vite `8.3.4`、TS 7 CLI `7.0.2` 与 TS 6 兼容包装包 `6.0.2`；兼容编译器/API 的实际 6.0 系列版本以锁文件和版本探针为准。
- 在读者自己的练习目录创建 `market-workspace`，不要在教材目录安装依赖，也不要覆盖全书的 `apps/react-web`、`apps/vue-web` 或 `apps/api`。

## 三课路线

| 顺序 | 教程 | 主要产出 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [pnpm Workspace 与依赖图](04-workspace-component-library/01-pnpm-workspace-dependency-graph.md) | 三成员工作区、`workspace:*`、过滤命令、单根锁文件与无环依赖方向 | 120 分钟 |
| 2 | [Package Exports、运行时契约与发布](04-workspace-component-library/02-package-exports-contracts-publishing.md) | 公共入口、`unknown` 解析器、源码包/发布包对照、peer 决策与干净消费者 | 150 分钟 |
| 3 | [语义 Design Tokens 与跨框架边界](04-workspace-component-library/03-design-tokens-cross-framework-boundaries.md) | 语义 token、主题、对比度与 forced colors 证据、React/Vue 等价消费边界 | 120 分钟 |

先建立依赖图，再定义可消费的公共契约，最后共享视觉原语。第 2 课依赖第 1 课的成员和包名；第 3 课依赖前两课的 `exports` 与运行时金额规则。不要先用 TypeScript `paths` 绕过安装关系，也不要先抽象框架生命周期再反推包职责。

## 章级邻里集市任务

在 `market-workspace` 中完成以下累计结果：

```text
market-workspace/
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml                 # 仅由 pnpm 在根生成
  apps/
    lab-web/
  packages/
    contracts/
    ui/
```

`apps/lab-web` 通过包名公共入口读取 `@market/contracts` 与 `@market/ui`；`packages/ui` 只依赖环境无关的 `packages/contracts`；共享包不得反向导入应用。页面用同一金额规则展示台灯 `19.90 元` 与免费书籍 `0.00 元`，并能切换浅色、深色以及浏览器 forced-colors 模拟。React 与 Vue 只共享领域契约和语义 token，各自保留组件、状态、事件与生命周期实现。

累计任务必须保留这些边界：

- `packages/contracts` 不导出数据库连接、会话、密钥、DOM 构造或框架状态。
- 所有真实源码导入都在对应包的 `dependencies` 中声明；根依赖不替成员掩盖缺失声明。
- 消费者只能使用 `exports` 公开的根入口或子路径，不能深导入 `src/`。
- 私有源码包可由已声明支持的 Vite 工作区直接消费；发布包必须生成 JavaScript、声明文件和必要 CSS，并在仓库外的干净消费者中安装打包文件。
- React/Vue 组件库只有在实际依赖框架运行时时才声明相应 peer；纯 contracts 包不添加无意义 peer。
- token 名称表达“文本、表面、边框、焦点”等用途。构建通过不证明颜色可读，必须补充对比度和 forced-colors 浏览器证据。

## 综合验收与评分

总分 **100 分**，达到 **80 分**且无阻断项才通过。所有分值均为整数。

| 维度 | 分值 | 必需证据 |
| --- | ---: | --- |
| 依赖图与复现 | 25 | 根成员清单、唯一根锁文件、`workspace:*`、按包名过滤输出；成员缺失、未声明依赖或反向依赖至少各有一份失败证据 |
| 公共契约与发布 | 30 | 仅公共入口导入；深导入被拒绝；外部 JSON 经过运行时解析；能书面区分源码消费包和编译发布包；干净消费者安装打包文件成功 |
| 视觉与跨框架边界 | 25 | 语义 token、浅/深主题、对比度记录、forced-colors 记录；React/Vue 业务范围等价但不共享生命周期代码 |
| 命令与说明 | 20 | `typecheck`、`typecheck:compat`、`typecheck:all`、应用生产构建均成功；页面可见 `19.90` 与 `0.00`；明确列出本章未验证的授权和生产边界 |

以下任一项为阻断项：金额改用浮点元作为领域值；用类型断言信任外部 JSON；共享包包含真实密钥、数据库连接或会话实现；应用依赖未声明却靠根安装偶然解析；深导入绕过 `exports`；循环依赖未处理；只凭构建绿灯声称对比度、授权、发布或回滚通过。

建议保存以下证据：

```bash
pnpm --version
pnpm list -r --depth -1
pnpm --filter @market/lab-web... list --depth -1
pnpm typecheck
pnpm typecheck:compat
pnpm typecheck:all
pnpm --filter @market/lab-web build
```

同时保留一个失败前后对照：命令、退出码、首条关键错误、最小修复和复验结果。打包与干净消费在系统临时目录完成，不把 tarball、`node_modules`、`dist` 或第二个锁文件提交进教材仓库。

## 导航

[上一章：构建、资源、缓存与性能预算](03-build-assets-performance.md) · [开始第 1 课](04-workspace-component-library/01-pnpm-workspace-dependency-graph.md) · [下一章：单元、集成与端到端测试](05-unit-integration-e2e.md) · [工程化覆盖矩阵](ENGINEERING-COVERAGE.md) · [工程卷目录](README.md)
