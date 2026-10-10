# ESLint、CI 与证据边界：每个绿色命令只证明它检查过的事

## 任务卡

- **任务**：配置 ESLint 10 flat config，定义 lint/type/unit/build/E2E 顺序和证据边界。
- **产出**：`eslint.config.mjs`、脚本约定、CI 关键步骤与验证记录模板。
- **运行**：Node.js 24、pnpm 锁定版本、TS6 兼容编译器、ESLint 10、Vitest、Playwright。
- **完成证据**：五个门禁在新进程、独立端口退出 0；负类型注入能让 typecheck 失败。
- **边界**：CI 示例未在托管平台执行时只能称配置；前端门禁不证明后端安全和事务。

## 1. 任务背景

Vite build 可能只转译 TSX，不执行完整类型检查；jsdom 可能让组件测试通过，却没有加载真实
路由；E2E 可能误连另一个占用端口的服务。绿色结果若没有命令、版本、目录和隔离条件，就
无法作为可复现证据。

本课让每个工具只承担明确职责，并用负向门禁证明命令确实检查目标文件。

## 2. 学习目标

完成后你能：

1. 编写 ESLint 10 flat config 与 Hooks 规则；
2. 区分类型、Lint、测试、构建和 E2E 的职责；
3. 使用 frozen lockfile、strictPort 和新进程隔离证据；
4. 注入类型错误验证 typecheck 不是空跑；
5. 诚实记录未执行环境和跨层风险。

## 3. 预备知识

项目沿用版本基线：Node.js 24 LTS、React 19.3、Vite 8、ESLint 10。依赖旧 TypeScript
compiler API 的链路使用官方兼容包提供的 `tsc6`，不把它写成 TS7 已验证。安装后保存真实
`node --version`、`pnpm --version` 和 `pnpm list --depth 0`。

## 4. 核心理论

### 4.1 门禁按反馈速度排列

Lint 和 typecheck 先发现静态问题，unit 快速固定规则，build 验证生产图，E2E 最后启动
浏览器。顺序失败即停，减少昂贵步骤和噪声。

### 4.2 构建不能替代类型检查

Vite 主职责是模块和资源构建。脚本应显式执行 `tsc6 -b --force`，避免复用陈旧增量结果。
负向注入非法 Listing status 后必须非零退出，恢复后再通过。

### 4.3 可复现安装属于证据

锁文件记录解析后的依赖图，CI 使用 `pnpm install --frozen-lockfile`。教材不存应用锁文件，
但读者重建项目必须提交自己的锁文件并记录实际解析版本。

### 4.4 工具通过不扩张保证

ESLint Hooks 规则不证明业务授权；E2E 教学 API 不证明数据库唯一性；Chromium 不证明
Safari/Firefox；自动 DOM 检查不证明读屏体验。

## 5. 元素、属性、API 或配置清单

| 配置 / 命令 | 主要职责 | 不能证明 |
| --- | --- | --- |
| `eslint.config.mjs` | 静态规则、Hooks、未使用值 | 运行时正确 |
| `tsc6 -b --force` | TSX 和配置类型 | 外部 JSON 可信 |
| `vitest run` | 纯函数/组件契约 | 真实浏览器 |
| `vite build` | 生产模块与资源图 | SSR 服务可运行 |
| `playwright test` | Chromium 用户路径 | 全浏览器/辅助技术 |
| `--frozen-lockfile` | 依赖图不漂移 | 包本身无漏洞 |
| `strictPort` | 不误连其他服务 | 服务业务正确 |
| `--max-warnings 0` | warning 阻断 | 规则覆盖全部风险 |

## 6. 最小可运行案例

**完整文件：`apps/react-web/eslint.config.mjs`**

```js
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: { "react-hooks": hooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "no-debugger": "error",
    },
  },
  {
    files: ["**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
]);
```

**命令：在 `apps/react-web` 执行**

```bash
pnpm exec eslint . --max-warnings 0
```

预期退出 0。渐进扩展：在组件条件分支中临时调用 `useState`，Lint 必须报
`react-hooks/rules-of-hooks`；恢复后通过。

## 7. 邻里集市集成案例

`package.json` 脚本应明确拆分：

**关键片段：`apps/react-web/package.json`**

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc6 -b --force",
    "test": "vitest run",
    "build": "pnpm typecheck && vite build",
    "e2e": "playwright test"
  }
}
```

本地执行顺序：

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm e2e
```

Playwright `webServer` 使用 `--host 127.0.0.1 --port 5183 --strictPort` 与
`reuseExistingServer: false`。

**关键片段：`.github/workflows/frontend.yml`**

```yaml
name: react-quality
on: [push, pull_request]
jobs:
  react:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 12.10.1
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter react-web lint
      - run: pnpm --filter react-web typecheck
      - run: pnpm --filter react-web test
      - run: pnpm --filter react-web build
      - run: pnpm --filter react-web exec playwright install --with-deps chromium
      - run: pnpm --filter react-web e2e
```

这段只有在真实托管 CI 运行后才有远端通过证据。组织若要求 action SHA 固定，按其供应链
策略替换标签。

证据记录：

```text
日期 / OS:
node --version:
pnpm --version:
pnpm list --depth 0:
lint/typecheck/unit/build/e2e 退出码与测试数:
服务器端口与是否新进程:
失败注入及恢复:
未验证环境:
```

## 8. 常见错误与排查路径

**明确错误示例：**

```json
{ "scripts": { "typecheck": "vite build" } }
```

它把构建器当类型检查器，负类型门禁可能仍然“通过”。

| 项目 | 记录 |
| --- | --- |
| 现象 | 注入 `status: "draft"` 后 typecheck 仍退出 0 |
| 证据 | script 实际只运行 Vite；日志没有 tsc6 |
| 原因 | 门禁命令没有执行 TypeScript 项目检查 |
| 修复 | 脚本改为 `tsc6 -b --force`，build 显式依赖 typecheck |
| 复验 | 非法状态非零退出；恢复 `available` 后五级门禁通过 |

若 E2E 一秒内异常通过，检查端口是否已有其他服务。strictPort 和不复用服务可让冲突直接
失败，而不是借用未知页面。

## 9. 课后题

1. 为什么 `vite build` 不能默认当完整 typecheck？
2. 为什么测试数必须记录实际输出？
3. ESLint 通过是否证明 Hook 没有竞态？
4. Chromium 通过是否证明真实数据库不会重复预约？

答案：

1. Vite 可转译 TypeScript 而不执行项目级语义检查。
2. 依赖和测试会变化，复制历史数字会伪造当前证据。
3. 不能；规则检查调用与依赖模式，运行时顺序仍需测试。
4. 不能；教学 API 和浏览器按钮不替代事务/唯一约束。

## 10. 实践练习

**基础**：加入未使用变量，Lint 应非零；删除后恢复。

**进阶**：向 Listing 注入非法 status，typecheck 失败；恢复后重新运行 build。

**故障注入**：先占用 5183，再运行 E2E。strictPort 必须阻断；停止占用进程后用新 server
通过，不能设置 `reuseExistingServer: true` 掩盖冲突。

## 11. 阶段验收

- [ ] ESLint 10 使用 flat config，没有 `.eslintrc` 主线。
- [ ] Hooks 调用与依赖规则为 error。
- [ ] typecheck 明确执行 tsc6 项目检查。
- [ ] 五个命令按固定顺序运行并记录真实计数。
- [ ] lockfile frozen 安装写入读者项目流程。
- [ ] E2E 使用独立 strictPort 新进程。
- [ ] 负类型、Lint、端口三类故障均能让门禁失败。
- [ ] CI 未实际运行时没有写成托管 CI 已通过。
- [ ] 后端、安全、跨浏览器和辅助技术边界明确。

## 12. 常见问题

**为什么本卷使用 TS6 兼容命令？**

当前部分工具依赖旧 compiler API；TS7 语言主线与兼容工具线按版本基线分开。

**是否应在 CI 自动修复 Lint？**

门禁应报告并失败，避免 CI 写回未审查代码。修复在开发流程完成。

**测试和 build 能并行吗？**

可在成熟 CI 优化，但先保证依赖、日志和失败归因清楚。

## 13. 扩展阅读

资料快照：2026-10-11。

- [ESLint 10 Release](https://eslint.org/blog/2026/02/eslint-v10.0.0-released/)
- [ESLint：Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files)
- [React：eslint-plugin-react-hooks](https://react.dev/reference/eslint-plugin-react-hooks)
- [TypeScript：Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [pnpm：Continuous Integration](https://pnpm.io/continuous-integration)
- [Playwright：Test Web Server](https://playwright.dev/docs/test-webserver)

兼容边界：CI action 标签、pnpm 补丁和插件支持范围会变化；安装后记录实际依赖树。本课
未执行托管 CI、软件成分分析、生产部署或真实后端测试。

## 我现在能做到什么

我能让每个质量门禁承担可验证的单一职责，用负向注入证明它不是空跑，并避免把前端绿色
命令扩张成未经执行的安全、后端或跨平台结论。

## 单元导航

- 上一单元：[路由、浏览器、无障碍与错误恢复](./02-router-browser-accessibility-errors.md)
- 下一单元：[第 07 章入口](../07-performance-modern-react.md)
