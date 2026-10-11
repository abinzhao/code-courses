# 工程卷自检报告

检查日期：2026-10-11。范围仅为 `07-engineering` 当前教材与其唯一工程 Capstone。

## 1. 静态结构

| 检查 | 当前结果 |
| --- | ---: |
| Markdown 文件 | 32 |
| 章入口 | 7 |
| 详细教程 | 22，分布 `3/3/3/3/3/3/4` |
| 覆盖矩阵 ID | 74，全部唯一 |
| 相对链接 | 725，零断链 |
| 教程结构 | 22/22 含任务卡、`1..13`、能力总结和单元导航 |
| 代码围栏 | 全部成对 |
| 过时模式 | 当前词表零命中 |
| 课程树实验产物 | package、lock、依赖、构建和覆盖率目录均为零 |
| 空白检查 | `git diff --check` 零发现 |

两个选择性拆分候选的可见内容分别为 338、358 行，均低于 900 行门槛。它们分别拥有领域/
应用/API 与测试/构建/预算/浏览器的单一 Capstone 切片，结论均为 `KEEP-LONG`。

## 2. 重建环境

机械提取器从四篇结业教程读取 27 条 `CAPSTONE_EXPECT`，并校验完整文件 header、BEGIN/END、
owner、重复路径、未声明路径与最终树。

```text
Mechanical extraction: PASS
files=27
owners={'01': 8, '02': 10, '03': 9}
target=/private/tmp/web-fullstack-modernization/batch-4/market-engineering-capstone
```

验证命令显式把校验过的临时 Node 24.21.0 二进制放在 `PATH` 首位；登录 shell 的默认 Node
版本不是本轮证据。运行环境：

| 工具 | 实际输出 |
| --- | --- |
| Node.js | `v24.21.0`，官方归档 SHA-256 校验通过 |
| pnpm | `12.11.2` |
| TypeScript 主 CLI | `7.0.2` |
| TS 兼容 CLI | `6.0.3` |
| `typescript` compiler API | `6.0.3` |
| Vite | `8.3.4` |
| Vitest | `5.0.3` |
| ESLint | `10.12.0` |
| Prettier | `3.9.10` |
| Playwright | `1.64.0` |
| Chromium | `156.0.8078.4` |

首次安装解析 137 个包。锁文件 SHA-256 在 frozen reinstall 前后均为：

```text
c6dc4b6ed48e116b55d391e9cd627dceeddaa9e8be76cadeba821bcce8a99827
```

## 3. 正向门禁

| 门禁 | 实际结果 |
| --- | --- |
| `pnpm format:check` | 退出 0 |
| `pnpm lint` | 退出 0 |
| `pnpm typecheck` | TS 7 退出 0 |
| `pnpm typecheck:compat` | TS 6 退出 0 |
| `pnpm test` | 3 个文件，16/16 通过 |
| `pnpm build` | 7 个模块转换，退出 0 |
| `pnpm budget` | JS raw 4,294 B，gzip 1,992 B，退出 0 |
| `pnpm test:e2e` | Chromium 7/7 通过 |
| `pnpm verify` | 格式、Lint、双类型、Vitest、构建、预算和 E2E 全链路退出 0 |

浏览器场景覆盖整数分、零金额、HTTP 500、字符串金额 parser 拒绝、成功空态、迟到结果抑制和
错误后恢复。Vite preview 使用 `127.0.0.1:4173`、strict port 且不复用既有服务。

## 4. 负向门禁

每项故障均先观察非零退出，再恢复并用同一 owner 门复验：

| 注入 | 失败证据 | 恢复证据 |
| --- | --- | --- |
| 清单增加未入锁依赖 | frozen install 报 `ERR_PNPM_OUTDATED_LOCKFILE` | 恢复清单后 frozen 退出 0 |
| 未格式化文件 | Prettier 退出 1并指向文件 | 删除注入后退出 0 |
| `debugger` | ESLint `no-debugger` 退出 1 | 恢复后退出 0 |
| 字符串赋给 number | TS 7 退出 1、TS 6 退出 2，均为 TS2322 | 双类型检查退出 0 |
| 金额除数错误 | 领域测试 1 项失败 | 7/7 领域测试通过 |
| parser 强制数字转换 | 领域与 HTTP parser 测试各失败 1 项 | 11/11 定向测试通过 |
| 删除旧结果 generation/signal 保护 | stale-result 测试失败 | 搜索测试 5/5 通过 |
| 未导出的 CSS 路径 | Vite 构建非零退出 | 完整 build 退出 0 |
| 预算阈值设为 1 B | 文件与总预算均 `FAIL` | 正常预算 `PASS` |
| 缺失构建目录 | 预算脚本明确拒绝 | 正常构建目录通过 |
| 4173 被占用 | Playwright webServer 在场景执行前失败 | 释放端口后定向场景通过 |
| 搜索入口固定为错误查询 | Chromium 零金额场景失败 | 恢复后 7/7 通过 |

## 5. CI 与发布边界

工作流示例已固定当前审查的 checkout、setup-node 与 upload-artifact 完整 SHA，并限制
`contents: read`、超时、并发取消、frozen install、匹配 Chromium 和 commit-linked artifact。
升级时重新解析官方 tag、审查差异并更新版本旁注。

本轮未触发托管 CI、上传制品、发布、部署或回滚。未验证 Firefox、WebKit、真实移动设备、
屏幕阅读器、真实认证/事务、生产缓存和生产容量。Chromium、本机 API 与静态工作流检查不能
外推到这些范围。

[工程卷目录](README.md) · [覆盖矩阵](ENGINEERING-COVERAGE.md) ·
[全书验证记录](../VALIDATION.md)
