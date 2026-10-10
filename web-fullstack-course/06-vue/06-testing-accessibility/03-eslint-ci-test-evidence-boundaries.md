# 把 Lint、类型、测试、构建与 E2E 变成可信门禁

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | 前两课测试、pnpm 锁文件、Vite Vue 应用 |
| 输入 | TS、SFC、测试、配置和浏览器场景 |
| 输出 | ESLint 10 flat config、命令矩阵、CI 顺序和证据说明 |
| 命令 | lint → vue-tsc → vitest → build → Playwright |
| 运行 | Node 24、冻结安装、独占端口 |
| 边界 | 文档给出配置；托管 CI 未实际运行时不得写“通过” |

## 1. 任务背景

单独运行 Vite build 只证明转译和打包路径，没有执行完整模板类型检查；只运行 ESLint 也不能证明组件 props 类型；复用已有 5174 进程会让 E2E 对错误版本的应用通过。

质量门禁必须可复现、失败即停止，并记录每条命令真正证明了什么。工具未安装、浏览器缺失和业务断言失败是不同问题，不能统称“测试挂了”。

## 2. 学习目标

- 为 TypeScript、Vue SFC、Node 配置编写 ESLint 10 flat config。
- 让 `vue-tsc` 负责模板类型，Vite 负责生产构建。
- 定义单元、组件、store 与浏览器测试的顺序。
- 使用冻结锁文件、严格端口和全新服务器减少假通过。
- 把自动证据与未验证的后端、安全、跨浏览器、辅助技术边界分开。

## 3. 预备知识

版本规则来自[课程版本基线](../../00-guide/02-version-baseline.md)：Node 24 LTS、ESLint 10 flat config、Vue 工具使用 TS6 兼容 API。安装后记录实际版本：

```bash
node --version
pnpm --version
pnpm exec eslint --version
pnpm exec vue-tsc --version
pnpm exec vitest --version
pnpm exec playwright --version
```

命令输出是环境事实，不等于功能通过。

## 4. 核心理论

### 4.1 门禁顺序

```text
冻结安装
  ↓
Lint（明显错误/规则）
  ↓
vue-tsc（TS + SFC 模板）
  ↓
Vitest（纯函数/组件/store）
  ↓
Vite build（生产依赖图/资源）
  ↓
Playwright（真实浏览器主路径）
```

便宜且反馈快的步骤靠前。任何步骤失败，后续结果都不能覆盖它。构建成功不允许删除失败测试，Lint 成功也不允许跳过模板类型检查。

### 4.2 TS7 与 TS6 工具边界

教材教授 TS7 语言主线，但 Vue 语言工具依赖旧式编译器 API，按基线使用 `@typescript/typescript6` 兼容线。脚本要确认实际命令名；若项目暴露 `tsc6`，`vue-tsc` 的依赖仍由锁文件决定。不能把两个历史环境合称一个不存在的“统一最新版”。

### 4.3 证据的逻辑含义

| 通过项 | 可以声称 | 不可以声称 |
| --- | --- | --- |
| ESLint | 已配置规则未发现问题 | 类型、运行行为正确 |
| vue-tsc | 当前类型/SFC 模板通过 | 浏览器 API 存在 |
| Vitest jsdom | 业务函数/组件/store 断言通过 | 布局、真实网络、读屏正确 |
| Vite build | 当前依赖图可生产打包 | SSR 或部署可用 |
| Chromium E2E | 指定场景在该引擎通过 | Safari/Firefox/真实移动设备通过 |
| 前端 409 UI | 页面能恢复冲突 | 数据库唯一约束正确 |

## 5. 元素、属性、API 或配置清单

| 配置/命令 | 责任 | 必须条件 | 常见失败 |
| --- | --- | --- | --- |
| `eslint.config.mjs` | flat config | ESLint 10 | 使用旧 `.eslintrc` |
| `vue-eslint-parser` | 解析 SFC 外层 | `.vue` files | 只用 TS parser |
| `typescript-eslint` | 解析 script TS | parser/options | 版本不兼容 |
| `vue-tsc -b` | 模板与项目引用类型 | TS6 API 兼容 | 只跑 Vite |
| `vitest run` | 一次性测试 | jsdom 配置 | watch 模式留进程 |
| `vite build` | 生产打包 | 类型门禁已通过 | 把转译当类型检查 |
| `--strictPort` | 拒绝端口漂移 | 新进程 | 悄悄连接旧服务 |
| `--frozen-lockfile` | 固定依赖图 | 已提交锁文件 | CI 临时重算依赖 |

## 6. 最小可运行案例

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/eslint.config.mjs`**

```js
import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

export default defineConfig([
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['**/*.vue'],
    extends: [vue.configs['flat/essential'], tseslint.configs.recommended],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: ['.vue'],
      },
      globals: globals.browser,
    },
  },
  {
    files: ['**/*.config.{ts,mjs}', 'server.mjs'],
    languageOptions: { globals: globals.node },
  },
])
```

**关键片段：`apps/vue-web/package.json`**

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings 0",
    "typecheck": "vue-tsc -b",
    "test": "vitest run",
    "build": "vite build",
    "e2e": "playwright test"
  }
}
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

错误实验：在 SFC 中声明未使用变量，Lint 应非零；把不存在的 prop 传给组件，`vue-tsc` 应非零。分别修复并复验，证明两个门禁都真实执行。

## 7. 邻里集市集成案例

### 7.1 独占浏览器服务器

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
```

`reuseExistingServer: false` 与 `--strictPort` 共同避免连接旧应用。失败 trace 只在本地临时输出，不提交教材仓库。

### 7.2 CI 工作流片段

**关键片段：`neighborhood-market/.github/workflows/vue-check.yml`**

```yaml
name: vue-check
on: [push, pull_request]
jobs:
  check:
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
      - run: pnpm --filter vue-web lint
      - run: pnpm --filter vue-web typecheck
      - run: pnpm --filter vue-web test
      - run: pnpm --filter vue-web build
      - run: pnpm --filter vue-web exec playwright install --with-deps chromium
      - run: pnpm --filter vue-web e2e
```

Action 主版本是教学示例，不代表已审核最新补丁；生产可固定已审查 SHA。本课不运行托管 GitHub Actions，因此只能说“工作流配置已静态检查”，不能说“CI 通过”。

## 8. 常见错误与排查路径

**错误示例：失败后降级门禁。**

```yaml
- run: pnpm test || true
- run: pnpm install --no-frozen-lockfile
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| `.vue` 未被 lint | 输出文件数不含 SFC | parser/files 配置缺失 | 加 Vue flat config | 故意错误能失败 |
| build 过、模板类型错 | vue-tsc 未运行 | Vite 仅转译 | 独立 typecheck | 错 prop 被阻止 |
| E2E 对旧页面通过 | 端口已有进程 | 复用服务器 | strictPort + 不复用 | 端口冲突直接失败 |
| CI 依赖每次变化 | 无锁/非冻结安装 | 解析新依赖 | 提交锁文件、冻结安装 | 同依赖树 |
| 浏览器没安装 | Playwright executable missing | 环境准备缺失 | install chromium | 再运行业务用例 |
| 失败仍显示绿 | `|| true`/continue-on-error | 人为吞失败 | 删除旁路 | 非零阻断 job |

诊断先记录失败命令、退出码、工具版本和首个错误；不要一次升级全部依赖再猜。

## 9. 课后题

1. **为何 build 不能替代 vue-tsc？**<br>
   答：Vite 主要转译和打包，不承诺执行完整 TS/SFC 模板类型检查。
2. **为何 E2E 要在 build 之后？**<br>
   答：先阻止明显静态/单元失败，减少昂贵浏览器运行；最终仍要穿过真实应用。
3. **`--frozen-lockfile` 失败应怎样处理？**<br>
   答：在明确依赖变更中重新生成并审查锁文件，而不是 CI 静默改为非冻结安装。
4. **Chromium 通过能否关闭无障碍验收？**<br>
   答：不能；真实屏幕阅读器、Safari/Firefox 和移动设备仍需人工/专项测试。

## 10. 实践练习

**基础：负向类型门禁。**临时把 Listing status 写成 `"draft"`，确认 `pnpm typecheck` 失败；恢复后通过。

**进阶：隔离端口。**先占用 5174，再运行 E2E。答案标准：命令因 strictPort 失败，而不是转到 5175。

**故障注入：删除 `.vue` files 配置。**加入一个未使用变量，Lint 错误消失即证明配置失效；恢复后错误重新出现，再修复源码。

## 11. 阶段验收

- [ ] ESLint 使用 flat config，无 `.eslintrc` 主线。
- [ ] `.ts`、`.vue` 和 Node 配置分别有正确 parser/global。
- [ ] 负向类型和 Lint 实验都能使门禁失败。
- [ ] 五个命令按顺序运行且退出 0。
- [ ] Playwright 使用独占 strict port。
- [ ] CI 使用 frozen lockfile，不吞失败。
- [ ] 报告记录实际版本、测试数量和未验证范围。

## 12. 常见问题

**可以把所有命令合成一个 `check` 吗？**<br>
可以，但 CI 日志仍应清楚显示各步骤，便于定位。开发时保留独立脚本能运行最小相关检查。

**为什么不在教材仓库创建 package.json？**<br>
教材只嵌入应用示例；学员在练习工作区重建。仓库不保存依赖、构建产物或锁文件。

**CI 中可以复用缓存吗？**<br>
可以缓存包下载，但不能缓存并复用不透明的 `node_modules` 来绕过冻结安装与依赖校验。

## 13. 扩展阅读

资料快照日期：2026-10-10。

- [ESLint Configure](https://eslint.org/docs/latest/use/configure/)：flat config。
- [eslint-plugin-vue User Guide](https://eslint.vuejs.org/user-guide/)：SFC flat 配置。
- [Vue TypeScript Overview](https://vuejs.org/guide/typescript/overview.html)：`vue-tsc` 与 Vite 分工。
- [Playwright Web Server](https://playwright.dev/docs/test-webserver)：服务器生命周期与复用。
- [pnpm CI](https://pnpm.io/continuous-integration)：冻结安装与缓存边界。

## 我现在能做到什么

我能搭建一条不吞失败、能证明工具真实执行且诚实描述证据边界的 Vue 质量门禁。

## 单元导航

[上一课：路由、浏览器与无障碍](02-router-browser-accessibility-errors.md) · [返回章入口](../06-testing-accessibility.md) · [下一章：性能与进阶 Vue](../07-performance-advanced-vue.md)
