# 02 Lint、格式与质量门禁

## 本章任务

把邻里集市工程中的格式、代码规则和两条 TypeScript 编译器路径拆成可独立运行、
可独立失败、可准确归因的质量门。最终产出不是一个含义模糊的“检查成功”，而是
Prettier、ESLint、TS 7 与 TS 6 兼容检查各自可复验的红绿证据。

## 必要前置

- 已完成[第 01 章：pnpm、Vite 与 ESM](01-pnpm-vite-esm.md)。
- 已在读者自己的 `market-engineering-lab` 中生成并审查锁文件。
- 能分别运行 `tsc` 与 `tsc6`，并理解 Vite 构建不执行完整类型检查。
- 所有实验只修改个人练习目录，不在教材目录安装依赖或生成产物。

## 学习顺序

1. [Prettier 3.9.10：格式范围、忽略规则与可审查改写](02-lint-format-quality/01-prettier-format-scope.md)
   先定义格式工具能改什么、不能改什么，保护锁文件和生成目录，并区分
   `--check` 与 `--write`。
2. [ESLint 10 Flat Config：文件作用域与 TypeScript 兼容 API](02-lint-format-quality/02-eslint-flat-config-typescript.md)
   再按浏览器与 Node 文件作用域组合全局忽略、推荐规则、环境全局变量和
   `eslint-config-prettier`。
3. [独立质量门：红绿实验与失败诊断](02-lint-format-quality/03-quality-gates-failure-diagnostics.md)
   最后组合命名明确的 fail-fast 门禁，并用格式漂移、未使用代码、`debugger`
   和类型错误逐层验证。

建议依次投入 90 分钟、120 分钟和 120 分钟。第二课依赖第一课的格式边界；
第三课依赖前两课均已恢复为绿色，不能跳过失败实验直接抄最终脚本。

## 依赖关系

```text
可审查的格式范围
  -> 按文件语义生效的 ESLint flat config
  -> 独立 format:check / lint / typecheck / typecheck:compat
  -> fail-fast quality
  -> 行为测试、浏览器验收与人工评审
```

`typescript` 包名继续指向 TS 6 兼容 API，供 `typescript-eslint` 等旧 API
消费者使用；`@typescript/native` 提供 TS 7 的 `tsc`。两条编译器路径必须
分别保留输出，不能因为其中一条绿色就删除另一条。

## 邻里集市综合任务

在个人 `market-engineering-lab` 中完成以下累计任务：

1. 固定 Prettier `3.9.10`，建立配置和忽略文件，仅改写明确纳入范围的手写源码。
2. 固定 ESLint `10.12.0`，用 flat config 区分浏览器 TypeScript 与 Node 脚本。
3. 让 `src/main.ts` 展示源码内教学商品“台灯：19.90 元”，金额保持非负安全整数分。
4. 分别注入格式漂移、未使用变量、`debugger` 和字符串金额类型错误。
5. 为每次失败记录工具名、退出码、文件与行列、规则或诊断号、根因、最小修复和复验命令。
6. 恢复后依次运行全部命名门禁，再运行聚合 `quality`，确认没有通过禁用规则、
   放宽类型或改坏业务断言制造绿色。

本章数据是源码内教学数据，不是外部 API 响应。外部 JSON 仍须保持 `unknown`
直到运行时解析成功；静态检查也不证明服务端认证、授权、事务或生产缓存正确。

## 章级验收证据

| 证据 | 判定标准 |
| --- | --- |
| 格式范围 | `prettier --version` 为 `3.9.10`；锁文件、依赖目录、构建产物和声明的生成目录未被改写 |
| Lint 配置 | `eslint --version` 为 `10.12.0`；`--print-config` 能证明目标文件匹配浏览器或 Node 作用域 |
| 独立门禁 | `format:check`、`lint`、`typecheck`、`typecheck:compat`、`typecheck:all` 均可单独运行并保留退出结果 |
| 红绿证据 | 四类故障各由所属工具报红；恢复最小改动后对应命令转绿 |
| 聚合顺序 | `quality` 按格式、Lint、双编译器顺序 fail-fast，不使用含义模糊的通用 `check` 代替命名门 |
| 证据边界 | 能说明金额算法、运行时输入、浏览器行为、后端权限和生产发布仍需其他验证层 |

## 章节导航

- 上一章：[01 pnpm、Vite 与 ESM](01-pnpm-vite-esm.md)
- 下一章：[03 构建、资源、缓存与性能预算](03-build-assets-performance.md)
- 分卷入口：[现代前端工程化](README.md)
- 覆盖矩阵：[工程化覆盖矩阵](ENGINEERING-COVERAGE.md)
