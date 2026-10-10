# 07 TypeScript 核心：从推断到可复验契约

## 本章任务、产出与前置

先完成第 01–06 章，尤其要能区分 JavaScript 值、外部 JSON 和异步状态。
本章把已有 JavaScript 规则迁移到严格 TypeScript：局部值依靠推断，边界写清注解，
不可信输入保持 `unknown`，状态用判别联合表达，复用关系用泛型保存。

最终产出是一个读者在个人目录创建的 `ts-lab/`：同一组有效源码分别由
TypeScript 7.0.2 主线和 TS 6 兼容命令检查。教材仓库不保存项目、依赖或锁文件。

运行基线为 Node.js 24 LTS、pnpm 12.10.1。开始前先记录实际输出：

```bash
node --version
pnpm --version
```

版本不符时保留真实证据，不把推荐版本写成实测结果。

## 学习路线

| 顺序 | 教程 | 核心产出 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [推断、注解与严格配置](07-typescript-core/01-inference-annotations-strict-config.md) | 双编译器严格项目、构建与执行证据 | 150 分钟 |
| 2 | [联合、收窄与状态建模](07-typescript-core/02-unions-narrowing-state-modeling.md) | `unknown` 输入与穷尽状态函数 | 120 分钟 |
| 3 | [泛型、工具类型与健全性边界](07-typescript-core/03-generics-utility-types-soundness.md) | 保留类型关系的分页转换 | 120 分钟 |

三课按顺序学习。第一课建立配置与命令语义；第二课依赖严格检查暴露遗漏分支；
第三课复用前两课的有效领域值，但不把泛型当成运行时验证器。

## 版本与命令责任

- `pnpm exec tsc --version`：TS 7.0.2 主线原生编译器。
- `pnpm exec tsc6 --version`：兼容包命令；锁定解析中实际报告 6.0.3。
- `import ts from "typescript"`：旧式编译器 API；实际报告 6.0.3。
- `typecheck`、`typecheck:compat`：只检查，不生成 JavaScript。
- `build`：主线 TS 7 生成 `dist/`。
- `node dist/main.js`：执行生成的 JavaScript，不再执行类型注解。

包装包 6.0.2 与内部编译器 6.0.3 是两个事实，不能拼成不存在的安装版本。
TS 6 只提供兼容证据，不被描述成当前主线。

## 章级邻里集市任务

建立一个严格项目，完成以下链路：

1. 用非负安全整数分表达金额，数组读取保留 `undefined` 可能；
2. 把 `unknown` 金额收窄为成功或失败结果；
3. 用 `idle/loading/success/error` 联合表达搜索界面，空列表属于成功状态；
4. 用 `mapPage<T, U>` 转换分页项目而保留页码和总数；
5. 分别运行 TS 7 与 TS 6 兼容检查，再由 TS 7 构建并运行。

禁止用 `any`、双重断言或无理由的非空断言消除错误。外部 JSON 的完整字段解析在
[下一章](08-typescript-domain-design.md)继续。

## 综合验收证据

- [ ] TS 7 命令报告 7.0.2，TS 6 命令与旧 API 分别报告 6.0.3。
- [ ] `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`、
      `noEmitOnError` 均显式启用。
- [ ] 两条类型检查命令通过，只有主线构建命令写入 `dist/`。
- [ ] `NaN`、负数、字符串金额被运行时分支拒绝，0 分被接受。
- [ ] 空搜索结果显示为成功空态，不与错误态合并。
- [ ] 新增联合分支时 `never` 检查能够暴露未处理分支。
- [ ] 分页映射不修改输入，并保留 `page/pageSize/total`。
- [ ] 能解释类型检查、生成 JavaScript、执行 JavaScript 三份证据各自证明什么。

## 导航

[上一章：异步、Fetch 与事件循环](06-async-fetch-event-loop.md) ·
[下一章：TypeScript 领域设计](08-typescript-domain-design.md) ·
[本卷目录](README.md) ·
[覆盖矩阵](JS-TS-COVERAGE.md)
