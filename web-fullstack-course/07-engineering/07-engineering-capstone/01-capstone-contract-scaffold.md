# 结业项目契约与脚手架：先冻结树、版本和文件责任

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 为 `market-engineering-capstone` 固定业务验收、精确文件树、工具版本、根脚本和配置 |
| 前置 | 完成工程化前六章，能解释锁文件、双编译器、质量门和 production preview |
| 建议投入 | 2.5 小时阅读与录入，30 分钟结构故障实验 |
| 完整文件 owner | 本课只拥有 8 个根配置文件；全项目 expected tree 共 27 个文件 |
| 成功证据 | expected tree、owner 与完整文件标记一一对应；根配置可被第 04 课机械提取 |
| 失败证据 | 缺失、重复、owner 不符或未声明文件会在安装前被提取器拒绝 |
| 环境边界 | 本机教学工程；教材仓库不保存清单、锁文件、依赖、构建或浏览器产物 |

本课只定义并拥有根配置。第 02 课拥有领域与应用源码，第 03 课拥有测试与预算，第 04 课只
执行提取和验证。完整项目文件必须同时满足：

1. 前一行是唯一的 `**完整文件：\`relative/path\`**`；
2. 围栏外有匹配的 `CAPSTONE_FILE_BEGIN/END`；
3. 路径和 owner 与本课 expected tree 相同；
4. 四课中同一路径只出现一次完整文件声明。

## 1. 任务背景

结业项目最容易出现的失败不是语法错误，而是教材无法还原：一篇课写了旧版清单，另一篇又
贴一份同路径“完整文件”；测试引用了树里没有的夹具；验证者只能手工猜测哪些代码块要覆盖
哪些路径。这样的项目即使作者机器运行过，也不可审计。

本课先把 27 个文件变成一份机器可读契约。路径、owner、脚本顺序和版本在写业务源码前固定。
后续课程可以展示小型错误片段或精确变更块，但不带完整文件标记，提取器不会把它们写入项目。

结业业务验收也在这里冻结：

- `priceCents` 是非负安全整数分，`1990` 显示 `19.90`，`0` 显示 `0.00`；
- `createdAt` 是可规范化的 UTC ISO 8601；
- HTTP JSON 在 parser 前保持 `unknown`；
- API 提供正常、受控延迟、空成功、500 与字符串价格路径；
- UI 区分 loading、success、empty、error，并能在失败后恢复；
- abort 减少旧工作，generation guard 独立决定发布权；
- format、Lint、TS 7、TS 6、Vitest、Vite、预算与 Chromium 都有独立失败证据。

## 2. 学习目标

完成本课后，你能够：

1. 从精确 expected tree 判断缺失、重复和未声明文件；
2. 区分根配置、工作区成员、应用源码、测试与生成物；
3. 固定 Node/pnpm 和 TS 7/TS 6 并行入口；
4. 解释 `quality`、`build`、`budget`、`test:e2e` 与 `verify` 的调用链；
5. 使用 ESLint 10 flat config 区分浏览器、Node 与测试文件；
6. 说明 Vite 转译、类型检查、Lint、测试和浏览器行为为何不能互相替代；
7. 为每个完整文件指定唯一 owner，阻止后续教程复制同一路径完整内容。

## 3. 预备知识

先阅读：

- [工程卷版本与边界](../README.md)；
- [第 01 章：pnpm、Vite 与 ESM](../01-pnpm-vite-esm.md)；
- [第 02 章：Lint、格式与质量门禁](../02-lint-format-quality.md)；
- [第 05 章：单元、集成与端到端测试](../05-unit-integration-e2e.md)；
- [统一项目契约](../../00-guide/05-project-assessment.md)。

只做环境探针，不在教材目录安装：

```bash
node --version
pnpm --version
pwd
```

课程目标是 Node `v24.21.0` 与 pnpm `12.11.2`。实际输出不符时保留原始证据，并在读者自己的
版本管理环境修复；不要修改教材文件中的固定版本来伪装一致。

## 4. 核心理论

### 4.1 Expected tree 是安装前契约

机械重建先比较“声明文件集合”和“实际提取文件集合”，再运行 `pnpm install`。若顺序反过来，
缺失成员清单可能被残留安装结果掩盖，未声明文件也可能悄悄参与格式、Lint 或构建。

树中不包含：

- `pnpm-lock.yaml`：首次安装在 `/tmp` 由 pnpm 生成；
- `node_modules/`：可重建安装结果；
- `apps/lab-web/dist/`：Vite 构建输出；
- `test-results/`、`playwright-report/`：失败证据；
- 浏览器二进制：Playwright 的外部缓存；
- `.env`：本项目不需要客户端环境文件。

### 4.2 Complete-file ownership 防止教材漂移

完整文件是“提取后可以直接落盘”的代码块。owner 是教材责任，不是运行时权限：

```text
01 根契约：版本、脚本、TS、Lint、Prettier、ignore
02 产品实现：contracts、tokens、应用清单、HTML、API、状态和 DOM
03 验证实现：Vitest、夹具、领域/HTTP/竞态测试、Playwright、预算
04 证据流程：不拥有项目文件，只读取前三课标记
```

后课需要说明故障时，只展示精确变更块，例如“把除数 `100` 改为 `1000`”。没有
`CAPSTONE_FILE_BEGIN` 的代码围栏不是完整文件，提取器会忽略。

### 4.3 两条 TypeScript 路径共享交集配置

根清单使用官方并行别名：

```text
@typescript/native = npm:typescript@7.0.2       -> tsc
typescript         = npm:@typescript/typescript6@6.0.2 -> tsc6 + 旧 API
```

`tsc6 --version` 与 `import ts from "typescript"` 的实际输出可能是包装包转导出的
`6.0.3`。清单版本和内部编译器版本是两类事实，必须分别记录。Vite、ESLint parser 和两个
编译器也各自提供不同证据。

### 4.4 脚本链保留独立门

本项目使用以下调用图：

```text
format:check ─┐
lint ─────────┼─> quality ─> build ─> budget ─> Playwright ─> test:e2e ─> verify
TS 7 + TS 6 ──┤
Vitest ────────┘
```

实际定义为：

- `quality`：格式、Lint、双编译器和 Vitest；
- `build`：先 `quality`，再构建应用；
- `budget`：读取已有 `apps/lab-web/dist`；
- `test:e2e`：先 `build`，再预算，最后 Playwright；
- `verify`：调用 `test:e2e`，形成完整本地门禁。

独立脚本仍保留，失败时先重跑 owner 门，不把所有错误称为“verify 失败”。

### 4.5 本地证据不能外推生产

`private: true` 防止误发布，不保护浏览器秘密。`credentials: "same-origin"` 只声明请求策略，
不证明 Cookie、CSRF 或对象授权。Vite preview 插件不是部署后的后端。Chromium 和本地 gzip
不能证明 Firefox、WebKit、移动设备、CDN 响应头、TLS 或生产回滚。

## 5. 元素、属性、API 或配置清单

### 5.1 固定版本

| 工具 | 精确声明 | 责任 |
| --- | --- | --- |
| Node.js | `24.21.0` | 执行工具、测试和本机教学 API |
| pnpm | `12.11.2` | 工作区、依赖图、锁文件和脚本 |
| Vite | `8.3.4` | 开发、Rolldown 构建和 preview |
| TS 7 | `@typescript/native: npm:typescript@7.0.2` | 主 `tsc` |
| TS 6 wrapper | `typescript: npm:@typescript/typescript6@6.0.2` | `tsc6` 和旧编译器 API |
| ESLint | `10.12.0` | Flat config 静态规则 |
| Prettier | `3.9.10` | 格式改写与只读检查 |
| Vitest | `5.0.3` | Node 单元与集成测试 |
| Playwright | `1.64.0` | Chromium 构建页测试 |

### 5.2 精确 expected tree 与 owner

每行 HTML 注释由第 04 课提取器读取，表格供人审查。owner 值就是教程文件名前缀。

| 路径 | owner | 文件角色 |
| --- | --- | --- |
| `.node-version` | `01` | Node 选择提示 |
| `package.json` | `01` | 根版本、脚本和开发工具 |
| `pnpm-workspace.yaml` | `01` | 工作区成员 |
| `tsconfig.json` | `01` | TS 7/TS 6 共享交集 |
| `eslint.config.mjs` | `01` | ESLint 10 flat config |
| `.prettierrc.json` | `01` | 格式规则 |
| `.prettierignore` | `01` | 生成物与锁文件格式边界 |
| `.gitignore` | `01` | 本地生成物边界 |
| `packages/contracts/package.json` | `02` | 领域包公共入口 |
| `packages/contracts/src/index.ts` | `02` | parser 与整数分 |
| `packages/ui/package.json` | `02` | tokens 公共子路径 |
| `packages/ui/src/tokens.css` | `02` | 浏览器视觉原语 |
| `apps/lab-web/package.json` | `02` | 应用脚本和 workspace 依赖 |
| `apps/lab-web/index.html` | `02` | Vite HTML 入口 |
| `apps/lab-web/teaching-api.mjs` | `02` | 本机只读五路径 API |
| `apps/lab-web/vite.config.mjs` | `02` | 严格端口和 API 插件 |
| `apps/lab-web/src/search.ts` | `02` | HTTP reader 与搜索控制器 |
| `apps/lab-web/src/main.ts` | `02` | DOM 状态与恢复入口 |
| `vitest.config.mjs` | `03` | Node 测试发现 |
| `tests/fixtures/listing-page.ts` | `03` | 每次新建的领域夹具 |
| `tests/fixtures/deferred.ts` | `03` | 无 sleep 的 Promise 控制 |
| `tests/domain.test.ts` | `03` | 金额、UTC、分页、唯一性、不可变 |
| `tests/http.test.ts` | `03` | Response、状态、查询、signal、parser |
| `tests/search.test.ts` | `03` | abort、generation、empty、dispose、恢复 |
| `playwright.config.mjs` | `03` | Chromium 和 preview |
| `tests/e2e/market.spec.ts` | `03` | 七个用户场景 |
| `scripts/check-assets.mjs` | `03` | 递归 raw/gzip 预算 |

<!-- CAPSTONE_EXPECT path=".node-version" owner="01" -->
<!-- CAPSTONE_EXPECT path="package.json" owner="01" -->
<!-- CAPSTONE_EXPECT path="pnpm-workspace.yaml" owner="01" -->
<!-- CAPSTONE_EXPECT path="tsconfig.json" owner="01" -->
<!-- CAPSTONE_EXPECT path="eslint.config.mjs" owner="01" -->
<!-- CAPSTONE_EXPECT path=".prettierrc.json" owner="01" -->
<!-- CAPSTONE_EXPECT path=".prettierignore" owner="01" -->
<!-- CAPSTONE_EXPECT path=".gitignore" owner="01" -->
<!-- CAPSTONE_EXPECT path="packages/contracts/package.json" owner="02" -->
<!-- CAPSTONE_EXPECT path="packages/contracts/src/index.ts" owner="02" -->
<!-- CAPSTONE_EXPECT path="packages/ui/package.json" owner="02" -->
<!-- CAPSTONE_EXPECT path="packages/ui/src/tokens.css" owner="02" -->
<!-- CAPSTONE_EXPECT path="apps/lab-web/package.json" owner="02" -->
<!-- CAPSTONE_EXPECT path="apps/lab-web/index.html" owner="02" -->
<!-- CAPSTONE_EXPECT path="apps/lab-web/teaching-api.mjs" owner="02" -->
<!-- CAPSTONE_EXPECT path="apps/lab-web/vite.config.mjs" owner="02" -->
<!-- CAPSTONE_EXPECT path="apps/lab-web/src/search.ts" owner="02" -->
<!-- CAPSTONE_EXPECT path="apps/lab-web/src/main.ts" owner="02" -->
<!-- CAPSTONE_EXPECT path="vitest.config.mjs" owner="03" -->
<!-- CAPSTONE_EXPECT path="tests/fixtures/listing-page.ts" owner="03" -->
<!-- CAPSTONE_EXPECT path="tests/fixtures/deferred.ts" owner="03" -->
<!-- CAPSTONE_EXPECT path="tests/domain.test.ts" owner="03" -->
<!-- CAPSTONE_EXPECT path="tests/http.test.ts" owner="03" -->
<!-- CAPSTONE_EXPECT path="tests/search.test.ts" owner="03" -->
<!-- CAPSTONE_EXPECT path="playwright.config.mjs" owner="03" -->
<!-- CAPSTONE_EXPECT path="tests/e2e/market.spec.ts" owner="03" -->
<!-- CAPSTONE_EXPECT path="scripts/check-assets.mjs" owner="03" -->

## 6. 最小可运行案例

最小案例只建立根配置，不安装。第 04 课会把本节完整文件与后两课文件一起提取。

**完整文件：`.node-version`**
<!-- CAPSTONE_FILE_BEGIN path=".node-version" owner="01" -->
```text
24.21.0
```
<!-- CAPSTONE_FILE_END path=".node-version" -->

**完整文件：`package.json`**
<!-- CAPSTONE_FILE_BEGIN path="package.json" owner="01" -->
```json
{
  "name": "market-engineering-capstone",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@12.11.2",
  "engines": {
    "node": ">=24.21.0 <25"
  },
  "scripts": {
    "dev": "pnpm --filter @market/lab-web dev",
    "typecheck": "tsc --noEmit",
    "typecheck:compat": "tsc6 --noEmit",
    "typecheck:all": "pnpm typecheck && pnpm typecheck:compat",
    "lint": "eslint . --max-warnings 0",
    "format": "prettier . --write",
    "format:check": "prettier . --check",
    "test": "vitest run",
    "quality": "pnpm format:check && pnpm lint && pnpm typecheck:all && pnpm test",
    "build": "pnpm quality && pnpm --filter @market/lab-web build",
    "budget": "node scripts/check-assets.mjs apps/lab-web/dist",
    "preview": "pnpm --filter @market/lab-web preview",
    "test:e2e": "pnpm build && pnpm budget && playwright test",
    "verify": "pnpm test:e2e"
  },
  "devDependencies": {
    "@eslint/js": "10.0.1",
    "@market/contracts": "workspace:*",
    "@playwright/test": "1.64.0",
    "@typescript/native": "npm:typescript@7.0.2",
    "eslint": "10.12.0",
    "eslint-config-prettier": "10.1.8",
    "globals": "17.13.0",
    "prettier": "3.9.10",
    "typescript": "npm:@typescript/typescript6@6.0.2",
    "typescript-eslint": "8.71.1",
    "vite": "8.3.4",
    "vitest": "5.0.3"
  }
}
```
<!-- CAPSTONE_FILE_END path="package.json" -->

**完整文件：`pnpm-workspace.yaml`**
<!-- CAPSTONE_FILE_BEGIN path="pnpm-workspace.yaml" owner="01" -->
```yaml
packages:
  - "apps/*"
  - "packages/*"
```
<!-- CAPSTONE_FILE_END path="pnpm-workspace.yaml" -->

运行到这里的可观察结论只是：Node/pnpm 约束、脚本入口和成员 glob 已明确。尚未有成员清单，
所以不能提前安装；完整树由第 02、03 课补齐后一次性提取。

## 7. 邻里集市集成案例

下面五个完整根文件让所有成员和测试共享同一套静态规则。

**完整文件：`tsconfig.json`**
<!-- CAPSTONE_FILE_BEGIN path="tsconfig.json" owner="01" -->
```json
{
  "compilerOptions": {
    "target": "ES2025",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2025", "DOM"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noEmit": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["apps/*/src/**/*.ts", "packages/*/src/**/*.ts", "tests/**/*.ts"]
}
```
<!-- CAPSTONE_FILE_END path="tsconfig.json" -->

`skipLibCheck` 只跳过声明文件检查，不跳过本项目源码，也不会补回旧编译器 API。Vite 转译仍
不能代替两条 `--noEmit`。

**完整文件：`eslint.config.mjs`**
<!-- CAPSTONE_FILE_BEGIN path="eslint.config.mjs" owner="01" -->
```js
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/coverage/**",
    "**/test-results/**",
    "**/playwright-report/**",
  ]),
  {
    files: ["apps/**/*.ts", "packages/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "no-debugger": "error",
    },
  },
  {
    files: ["tests/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "no-debugger": "error",
    },
  },
  {
    files: ["*.mjs", "apps/**/*.mjs", "scripts/**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
    },
  },
  prettier,
]);
```
<!-- CAPSTONE_FILE_END path="eslint.config.mjs" -->

浏览器源码不获得 Node globals；测试明确运行在 Node 24，但会构造标准 Web API 对象，因此测试
范围合并两组平台 globals。`eslint-config-prettier` 放在末尾，只关闭冲突规则，不运行格式化。

**完整文件：`.prettierrc.json`**
<!-- CAPSTONE_FILE_BEGIN path=".prettierrc.json" owner="01" -->
```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100
}
```
<!-- CAPSTONE_FILE_END path=".prettierrc.json" -->

**完整文件：`.prettierignore`**
<!-- CAPSTONE_FILE_BEGIN path=".prettierignore" owner="01" -->
```gitignore
node_modules/
**/dist/
pnpm-lock.yaml
coverage/
test-results/
playwright-report/
```
<!-- CAPSTONE_FILE_END path=".prettierignore" -->

**完整文件：`.gitignore`**
<!-- CAPSTONE_FILE_BEGIN path=".gitignore" owner="01" -->
```gitignore
node_modules/
**/dist/
coverage/
test-results/
playwright-report/
.env.local
.env.*.local
```
<!-- CAPSTONE_FILE_END path=".gitignore" -->

这些 ignore 只控制工具或 Git 范围，不是安全边界。任何进入浏览器 bundle 的值都可被观察。

## 8. 常见错误与排查路径

### 明确错误：同一路径出现第二个完整文件声明

错误做法是在第 03 课再次写：

```markdown
**完整文件：`package.json`**
```

并加完整文件 marker。第 04 课会在落盘前发现重复路径，不选择“后一个覆盖前一个”。

| 五段 | 记录 |
| --- | --- |
| 现象 | 机械提取在安装前非零退出 |
| 证据 | 错误包含 `duplicate complete file: package.json` 和两个来源文档 |
| 原因 | 同一路径有两个完整 owner，教材没有单一事实源 |
| 修复 | 保留第 01 课完整文件；后课只写精确 scripts 变更块或引用路径 |
| 复验 | expected、声明 header、marker 与提取集合均为 27 个唯一路径 |

### 其他高频错误

| 现象 | 优先证据 | 原因 | 最小修复 | 复验 |
| --- | --- | --- | --- | --- |
| 提取后少文件 | expected 与 marker 差集 | 忘记完整标记或路径拼写不同 | 在唯一 owner 课补齐匹配声明 | 结构检查 27/27 |
| 出现未声明文件 | marker 与 expected 差集 | 教程新增文件但未更新树 | 明确职责后同时更新树和 owner | 差集为空 |
| `tsc` 与 `tsc6` 指向错误 | 三条版本探针 | 别名键或包名调换 | 恢复官方并行别名 | 7.0.2 与同一 6.0.x |
| Lint 看不到 `document` | `--print-config` | 文件 glob 或 globals 错 | 修复浏览器作用域 | browser globals 命中 |
| `verify` 只跑最后一步 | pnpm 子脚本日志 | 聚合脚本绕过上游门 | 恢复完整调用链 | 日志按约定顺序出现 |

## 9. 课后题

**问题 1：为什么 expected tree 不能从实际 marker 自动推导？**

参考答案：若实际 marker 本身漏文件，自动推导仍会“自洽”。独立 expected 清单才能发现缺失和
未声明项。

**问题 2：为什么同时保留人可读 header 与机器 marker？**

参考答案：header 让读者直接知道落盘路径；marker 提供无歧义边界、owner 和结束位置。提取器
还会检查两者相邻且一致，避免文档与机器语义漂移。

**问题 3：`verify` 成功能否证明生产发布成功？**

参考答案：不能。它只覆盖本机固定工具链、Vite preview、Chromium 和本地预算。

**问题 4：为什么测试文件由第 03 课拥有，而不是第 02 课跟随实现？**

参考答案：owner 是教材讲解责任。第 02 课定义完整产品实现，第 03 课集中定义验证实现；运行时
仍通过 imports 连接，并由 expected tree 同时重建。

## 10. 实践练习

### 基础：人工对账

从 expected 表中分别数出 owner 01/02/03 的文件数。

判定标准：`8 / 10 / 9`，合计 `27`；owner 04 为 `0`。

### 进阶：脚本调用图

从根清单画出 `verify` 到每个独立门的有向图，并指出 `pnpm budget` 单独运行的前置。

判定标准：能追踪到 format、Lint、TS 7、TS 6、Vitest、Vite、budget 和 Playwright；
`budget` 需要已有 `apps/lab-web/dist`。

### 故障注入：owner 不一致

在临时文档副本中把一个 `owner="02"` 改成 `owner="03"`，运行第 04 课提取器。

判定标准：安装前失败，错误指向 expected owner 与 marker owner；恢复后结构检查通过。不得让
提取器忽略 owner。

## 11. 阶段验收

- [ ] expected tree 精确列出 27 个路径，无目录占位。
- [ ] owner 计数为 `8 / 10 / 9 / 0`。
- [ ] 本课 8 个完整文件各有唯一 header、BEGIN 和 END。
- [ ] 根清单固定 Node/pnpm、TS 7/TS 6、ESLint、Prettier、Vitest、Vite、Playwright。
- [ ] `quality`、`build`、`budget`、`test:e2e`、`verify` 调用关系可解释。
- [ ] TS 配置使用两个编译器共同支持的普通 TypeScript 交集。
- [ ] ESLint 区分浏览器、测试和 Node 文件。
- [ ] 生成物、锁文件和报告没有被列入 expected tree。
- [ ] 能说明本地教学 API、preview 和 Chromium 的生产边界。

## 12. 常见问题

**为什么不把 lockfile 贴成完整文件？**

锁文件由固定 pnpm 根据完整清单生成，手贴会复制平台与解析结果并失去生成证据。第 04 课会
生成、审查摘要并冻结重装。

**为什么根 devDependencies 声明 `@market/contracts: workspace:*`？**

根测试直接从包公共入口导入 parser，因此根 importer 是真实消费者，必须显式声明。

**可以把 `quality` 改成并行执行吗？**

可以另行设计，但本教材使用确定 fail-fast 顺序方便错误归属。并行方案也必须保留每门真实退出
状态和完整日志。

**路径 header 足够机械提取吗？**

不够。普通教程可能讨论一个路径或展示变更块。本项目只提取 header 后紧邻的成对 marker
围栏，并检查 owner 与 expected。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [pnpm Workspace](https://pnpm.io/workspaces)：成员与 workspace 协议。
- [pnpm install](https://pnpm.io/cli/install)：普通与 frozen 安装。
- [TypeScript 7.0 发布说明](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)：
  主 CLI 与 TS 6 兼容路径。
- [ESLint 配置文件](https://eslint.org/docs/latest/use/configure/configuration-files)：
  flat config 匹配与顺序。
- [Prettier CLI](https://prettier.io/docs/cli)：`--write` 与 `--check`。
- [Vite Guide](https://vite.dev/guide/)：HTML 入口、构建和 preview。

## 我现在能做到什么

我能先冻结一个可机械验证的项目树，为每个完整文件指定唯一 owner，并把版本、脚本和根配置
连接成可诊断门禁；我不会让重复完整文件、生成物或本地 preview 冒充单一事实源和生产证据。

## 单元导航

[返回第 07 章入口](../07-engineering-capstone.md) ·
[上一课：制品、发布、缓存与回滚](../06-ci-git-release/03-artifacts-release-cache-rollback.md) ·
[下一课：领域、页面与本机教学 API](02-capstone-domain-app-teaching-api.md)
