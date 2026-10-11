# 07 工程结业：从契约脚手架到干净环境证据

## 本章使命

把前六章的安装、静态质量、工作区、构建、测试、预算和浏览器证据组装成一个可机械重建的
`market-engineering-capstone`。项目代码只存在于四篇教程的完整文件围栏中；验证时提取到
`/tmp/web-fullstack-modernization/batch-4/market-engineering-capstone`，不在教材树安装依赖或
保存生成物。

这是**本机、只读、教学工程**。Vite 插件提供的同源 API 不包含真实身份、对象授权、CSRF、
事务、数据库、生产缓存或回滚。价格保持非负安全整数分，持久化时间保持 UTC ISO 8601，
外部 JSON 在运行时解析前保持 `unknown`。

## 必要前置

- 已完成[第 06 章：Git、CI 与发布](06-ci-git-release.md)及其前置章节。
- 能区分 Node、pnpm、Vite、TS 7、TS 6 兼容 API、ESLint、Vitest 与 Playwright 的责任。
- 本机可使用 Node.js `24.21.0`、pnpm `12.11.2` 和现代 Chromium。
- 已阅读[统一项目契约](../00-guide/05-project-assessment.md)与
  [版本基线](../00-guide/02-version-baseline.md)。

## 四课路线

| 顺序 | 教程 | 主要责任 | 建议时间 |
| ---: | --- | --- | ---: |
| 1 | [结业项目契约与脚手架](07-engineering-capstone/01-capstone-contract-scaffold.md) | 精确树、版本、脚本、根配置与完整文件 ownership | 3 小时 |
| 2 | [领域、页面与本机教学 API](07-engineering-capstone/02-capstone-domain-app-teaching-api.md) | parser、整数分、tokens、五类 API 路径、四态 UI、abort + generation | 4 小时 |
| 3 | [测试、构建、预算与浏览器门禁](07-engineering-capstone/03-capstone-tests-build-budget-browser.md) | Vitest 三层测试、七场景 Playwright、递归 gzip 预算 | 4 小时 |
| 4 | [干净环境重建与证据记录](07-engineering-capstone/04-clean-room-verification-evidence.md) | 机械提取、冻结安装、版本探针、逐门故障注入与证据分类 | 3 小时 |

依赖顺序不可交换：

```text
根契约与 ownership
  -> 领域、HTTP、状态与 DOM
  -> 单元/集成/E2E/预算
  -> clean-room 重建、红绿故障与总门禁
```

## 文件责任

完整项目共 27 个文件。第 01 课拥有 8 个根配置文件，第 02 课拥有 10 个领域与应用文件，
第 03 课拥有 9 个测试与预算文件，第 04 课不拥有项目文件。每个完整文件围栏都有
`CAPSTONE_FILE_BEGIN/END` 标记；第 01 课的 `CAPSTONE_EXPECT` 清单是机械提取的唯一声明源。
后续课程只能引用路径或展示精确变更块，不得再次给出同一路径的完整文件。

## 累计邻里集市验收

1. `1990` 分显示 `19.90`，`0` 分显示 `0.00`。
2. API 覆盖正常、受控延迟、空成功、HTTP 500 和字符串价格五类路径。
3. 页面明确区分 loading、success、empty 与 error，并能从 error 恢复。
4. 新查询取消旧 signal；即使注入读取器忽略取消，generation guard 仍阻止旧结果发布。
5. parser 拒绝非法金额、UTC、分页矛盾和重复 ID，且不修改输入。
6. Chromium 七个场景分别验证金额、零值、500、字符串价格、空态、旧结果防护和恢复。
7. 预算递归统计每个 JavaScript 的 raw/gzip 与总 gzip，单文件上限 `81920` 字节，
   总上限 `184320` 字节。

## 必需命令与证据

| 阶段 | 命令 | 必须观察 |
| --- | --- | --- |
| 环境 | `node --version`、`pnpm --version` | `v24.21.0`、`12.11.2` |
| 安装 | `pnpm install`、`pnpm install --frozen-lockfile` | 锁文件只在 `/tmp` 生成，冻结重装不改变它 |
| 编译器 | `pnpm exec tsc --version`、`pnpm exec tsc6 --version`、导入 `typescript` | TS 7 为 `7.0.2`；兼容 CLI/API 为同一实际 6.0 系列 |
| 静态质量 | `pnpm format:check`、`pnpm lint`、`pnpm typecheck:all` | 每个门独立退出 `0` |
| 行为 | `pnpm test` | 领域、HTTP、取消、竞态、销毁与恢复断言实际执行 |
| 构建 | `pnpm build` | 质量门先运行，随后生成 `apps/lab-web/dist` |
| 预算 | `pnpm budget` | 每文件和总量均输出 PASS；1 byte 注入非零失败 |
| 浏览器 | `pnpm test:e2e` | 严格端口 4173 上七场景通过，服务自动停止 |
| 总门禁 | `pnpm verify` | quality -> build -> budget -> Chromium 的日志链完整 |

## 生产排除项

以下能力在本章保持未验证：公共 registry 的完整安装路径、托管 CI、Firefox、WebKit、真实
移动设备、生产 TLS/CDN/缓存头、真实认证与对象授权、CSRF、数据库事务、预约唯一性、部署和
生产回滚。浏览器 bundle、`VITE_` 值与 Source Map 都不能保存秘密；前端取消请求也不能撤销
服务端已经完成的写入。

## 章节导航

- 上一章：[06 Git、CI 与发布](06-ci-git-release.md)
- 第一课：[结业项目契约与脚手架](07-engineering-capstone/01-capstone-contract-scaffold.md)
- 分卷入口：[现代前端工程化](README.md)
- 覆盖矩阵：[工程化覆盖矩阵](ENGINEERING-COVERAGE.md)
- 全书入口：[Web 全栈课程](../README.md)
