# TS 7 与 TS 6 并行类型检查：主 CLI、兼容 API 与诊断证据

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 为同一份普通 TypeScript 源码建立 TS 7 主检查与 TS 6 兼容检查 |
| 前置 | 已完成冻结安装、Vite 模块图和生产预览 |
| 建议投入 | 3 小时学习与配置，45 分钟诊断及兼容故障实验 |
| 主要产物 | 双别名清单、共享 `tsconfig.json`、版本探针、最小 ESLint 旧 API 边界 |
| 成功证据 | `tsc` 为 `7.0.2`，`tsc6` 与导入 API 为相同的 6.0 系列版本，双检查和构建通过 |
| 失败证据 | 类型错误被分别记录；禁用 `typescript` 兼容入口后 TS 7 仍成功而 Lint 明确失败 |
| 环境边界 | 本课只检查普通 `.ts`；不声称 Vue SFC、框架插件或全部生态已经兼容 TS 7 |

本课采用官方并行别名：

```text
@typescript/native = npm:typescript@7.0.2
typescript         = npm:@typescript/typescript6@6.0.2
tsc                = TS 7 主编译器
tsc6               = TS 6 兼容编译器
```

包清单中的兼容包装版本 `6.0.2` 不保证 `tsc6 --version` 也输出 `6.0.2`。包装包会转导出
TS 6 编译器范围，实际编译器版本由锁文件决定；必须以现场探针为证据。

## 1. 任务背景

TypeScript 7 提供新的原生编译器主线，但旧式 TypeScript 编译器 API 没有被同一路径直接替代。
`typescript-eslint`、Vue 语言工具和其他分析器可能仍通过：

```js
import ts from "typescript";
```

调用 `createProgram`、AST 节点判断和类型服务。若把包名 `typescript` 直接指向 TS 7，可能让这些旧 API
消费者失去它们依赖的接口；若只停留在 TS 6，又无法验证 TS 7 主线。

本课不让两个工具争抢同一个 `tsc`。TS 7 别名提供 `tsc`，TS 6 兼容包提供 `tsc6` 与旧 API。
两条检查读取同一份受支持交集配置，输出分别保留，失败时不删除其中一条来制造一致。

## 2. 学习目标

完成本课后，你应能：

- 精确写出 TS 7/TS 6 两个别名、两个 CLI 和一个 API 入口；
- 用三条版本探针区分包装版本、编译器输出与导入 API；
- 为普通浏览器 TypeScript 建立共享 `tsconfig.json`；
- 解释“受支持交集”与“主线专属实验”的不同；
- 分别运行 `typecheck`、`typecheck:compat` 与 `typecheck:all`；
- 保存两套诊断、退出码和最小输入，处理结果差异；
- 说明 Vite build 成功为什么不等于类型检查成功；
- 说明旧编译器 API 消费者为什么继续依赖包名 `typescript`；
- 证明兼容入口缺失时 TS 7 可成功而 Lint 配置加载失败；
- 明确普通 `tsc` 不能替 Vue SFC 模板和语言服务验收；
- 对外部 JSON 保持 `unknown`，运行时解析成功后才生成 `Listing`。

## 3. 预备知识

进入练习工程并确认上一课产物：

```bash
cd "$HOME/code/market-engineering-lab"
pnpm install --frozen-lockfile
pnpm exec vite --version
pnpm build
```

此时 build 只运行 Vite。它证明模块可转换并生成产物，没有独立的类型门禁。本课会更新清单和锁文件，
因此第一次变更后运行普通 `pnpm install`；锁文件同步后再恢复冻结安装。

先理解两类版本事实：

| 事实 | 获取方式 | 本课预期 |
| --- | --- | --- |
| TS 7 CLI | `pnpm exec tsc --version` | `Version 7.0.2` |
| TS 6 兼容 CLI | `pnpm exec tsc6 --version` | `Version 6.0.x` |
| 包名 `typescript` 的 API | Node ESM import 后打印 `ts.version` | 与 `tsc6` 相同的 `6.0.x` |

## 4. 核心理论

### 4.1 别名键决定消费者看到的包名

清单项：

```text
"@typescript/native": "npm:typescript@7.0.2"
```

表示在项目中用键 `@typescript/native` 安装注册表包 `typescript@7.0.2`。该主线包提供 `tsc`。

清单项：

```text
"typescript": "npm:@typescript/typescript6@6.0.2"
```

表示包名 `typescript` 指向官方 TS 6 兼容包装包。旧工具仍然可以 `import "typescript"`，并使用
包装包提供的 `tsc6` 和旧编译器 API。

别名解决的是并行命名与入口冲突，不证明任意插件已经兼容。每个消费者仍需运行自己的门禁。

### 4.2 三条探针不能合并成一句“TypeScript 已安装”

三条探针回答三个问题：

```bash
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec node --input-type=module -e 'import ts from "typescript"; console.log(ts.version)'
```

第一条证明主 CLI 入口，第二条证明兼容 CLI，第三条证明旧 API 消费者实际导入的版本。若只运行第一条，
无法知道 Lint 使用的 `typescript` 包是否存在；只运行第三条，也无法证明主 CLI 已切换到 TS 7。

### 4.3 共享配置采用受支持交集

双检查的共享配置应优先使用两条路径都理解且项目真正需要的选项：

| 选项 | 本课值 | 理由 |
| --- | --- | --- |
| `target` | `ES2025` | 保留现代语义；浏览器最终目标仍由 Vite 配置决定 |
| `module` | `ESNext` | 保留 ESM 给 Vite 构建 |
| `moduleResolution` | `Bundler` | 匹配 Vite 浏览器源码解析 |
| `lib` | `ES2025`, `DOM` | 普通现代 JS 与浏览器 API 类型 |
| `strict` | `true` | 启用严格类型检查 |
| `noUncheckedIndexedAccess` | `true` | 索引访问包含缺失可能 |
| `exactOptionalPropertyTypes` | `true` | 区分缺失与显式 `undefined` |
| `verbatimModuleSyntax` | `true` | 保留类型/值导入意图 |
| `isolatedModules` | `true` | 每个文件可被 Vite 独立转换 |
| `noEmit` | `true` | 类型门禁不写构建产物 |

若要试验 TS 7 专属能力，应建立单独配置与命令，并明确它不属于兼容门禁。不能把主配置改成 TS 6
不认识的选项，再以“兼容检查太旧”为由删除失败路径。

### 4.4 两条诊断可能不完全相同

两版编译器可能对同一输入给出不同诊断代码、消息、位置或数量。正确做法是保留：

- 输入文件的最小复现；
- `tsc` 与 `tsc6` 的精确版本；
- 两条命令；
- 两个退出码；
- 两份完整诊断；
- 最终采用共同约束还是隔离专属配置的决定。

不应把两个日志拼成一个“TypeScript error”，也不应使用 `any`、断言或排除文件让差异消失。

### 4.5 Vite、TS 7、TS 6 与 Lint 是四条证据

| 工具 | 主要回答 | 不能替代 |
| --- | --- | --- |
| Vite 8 | 模块能否转换与构建 | 完整类型关系 |
| TS 7 `tsc` | 主线编译器如何检查 | 旧 API 工具兼容 |
| TS 6 `tsc6` | 兼容编译器如何检查 | TS 7 主线 |
| ESLint + parser | 规则、AST 与可选类型服务 | 运行时业务、浏览器行为 |

后续质量门禁会分别命名这些步骤。本课先建立最小 Lint 配置，只为证明旧 API 依赖边界；完整 flat config
规则、Prettier 和组合门禁在下一章展开。

### 4.6 外部数据类型不因双检查而可信

写出：

```ts
const response: Listing = await fetch(url).then((item) => item.json());
```

不会在运行时检查字符串价格、非法时间或缺失字段。正确入口是 `unknown`，经过运行时解析后才返回
`Listing`。两版编译器都通过，只证明代码满足静态关系，不能证明服务端真的返回合法 JSON。

### 4.7 Vue SFC 不在本课证据范围内

`tsc` 与 `tsc6` 的 `include: ["src/**/*.ts"]` 不理解 `.vue` 模板。Vue 项目需要与其版本匹配的
Vue 语言工具和 `vue-tsc`，并验证模板、宏、插件与构建器。不能因为本课普通 `.ts` 双检查通过，
就声称 React/Vue 插件和所有 SFC 都已迁移到 TS 7。

## 5. 元素、属性、API 或配置清单

| 项目 | 精确值或命令 | 角色与边界 |
| --- | --- | --- |
| `@typescript/native` | `npm:typescript@7.0.2` | TS 7 主包别名，提供 `tsc` |
| `typescript` | `npm:@typescript/typescript6@6.0.2` | TS 6 兼容包装与旧 API 包名 |
| `tsc` | `pnpm exec tsc --version` | 主检查入口，预期 `7.0.2` |
| `tsc6` | `pnpm exec tsc6 --version` | 兼容检查入口，实际为锁文件中的 6.0 系列 |
| `ts.version` | Node ESM import | 旧 API 实际编译器版本，应与 `tsc6` 相同 |
| `ts.createProgram` | 旧编译器 API | Lint/分析工具可能依赖；TS 7 主 CLI 不能替它证明兼容 |
| `tsconfig.json` | 双检查共享 | 只放两条路径已验证的交集选项 |
| `typecheck` | `tsc --noEmit` | TS 7 主门禁 |
| `typecheck:compat` | `tsc6 --noEmit` | TS 6 兼容门禁 |
| `typecheck:all` | 顺序运行两条门禁 | 任一失败即非零退出 |
| `moduleResolution` | `Bundler` | 匹配 Vite 浏览器源码，不是 Node 服务端默认策略 |
| `noEmit` | `true` | 类型检查不写 JS，产物由 Vite 负责 |
| ESLint | `10.12.0` | 本课只建最小旧 API 边界 |
| typescript-eslint | `8.71.1` | 解析 TS 并消费兼容 API；完整规则见下一章 |
| Vue SFC | 不在 `include` | 需独立语言工具，不写成已验证 |

## 6. 最小可运行案例

### 6.1 更新完整清单

完整替换练习根 `package.json`：

```json
{
  "name": "market-engineering-lab",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@12.10.1",
  "engines": {
    "node": ">=24.21.0 <25"
  },
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "typecheck": "tsc --noEmit",
    "typecheck:compat": "tsc6 --noEmit",
    "typecheck:all": "pnpm typecheck && pnpm typecheck:compat",
    "lint": "eslint \"src/**/*.ts\" --max-warnings 0",
    "build": "pnpm typecheck:all && vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "devDependencies": {
    "@typescript/native": "npm:typescript@7.0.2",
    "eslint": "10.12.0",
    "typescript": "npm:@typescript/typescript6@6.0.2",
    "typescript-eslint": "8.71.1",
    "vite": "8.3.0"
  }
}
```

清单有意新增 ESLint 与 parser，需要普通安装更新锁文件：

```bash
cd "$HOME/code/market-engineering-lab"
pnpm install
pnpm install --frozen-lockfile
```

第一次命令更新依赖图，第二次证明清单与新锁文件一致。两条都应退出 `0`。

### 6.2 创建共享 TypeScript 配置

创建文件：

```bash
touch tsconfig.json
```

完整文件 `tsconfig.json`：

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
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts"]
}
```

### 6.3 建立可观察的版本探针

```bash
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec node --input-type=module -e 'import ts from "typescript"; console.log(ts.version)'
```

可判定预期：

```text
Version 7.0.2
Version 6.0.x
6.0.x
```

后两行中的 `x` 必须由本机实际输出替换到学习记录中，并且二者相同。既有课程验证中两者为 `6.0.3`，
但本课仍要求现场观察，不能把兼容包装包清单版本 `6.0.2` 抄成编译器输出。

### 6.4 最小类型边界

创建完整文件 `src/typecheck-probe.ts`：

```ts
type PriceRecord = {
  priceCents: number;
  createdAt: string;
};

export function parsePriceRecord(value: unknown): PriceRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("expected object");
  }
  const source = value as Record<string, unknown>;
  if (
    typeof source.priceCents !== "number" ||
    !Number.isSafeInteger(source.priceCents) ||
    source.priceCents < 0
  ) {
    throw new Error("priceCents: expected non-negative safe integer");
  }
  if (typeof source.createdAt !== "string") {
    throw new Error("createdAt: expected text");
  }
  const date = new Date(source.createdAt);
  if (Number.isNaN(date.valueOf()) || date.toISOString() !== source.createdAt) {
    throw new Error("createdAt: expected canonical UTC ISO 8601");
  }
  return {
    priceCents: source.priceCents,
    createdAt: source.createdAt,
  };
}

const raw: unknown = {
  priceCents: 1990,
  createdAt: "2026-10-11T08:00:00.000Z",
};
parsePriceRecord(raw);
```

运行：

```bash
pnpm typecheck
pnpm typecheck:compat
pnpm typecheck:all
```

三条命令都应没有诊断并退出 `0`。这是“普通 `.ts` 与共享选项位于支持交集”的可观察证据。

## 7. 邻里集市集成案例

本节把上一课静态商品数据放进运行时解析边界。数据仍是源码内的本地静态教学数据，但用 `unknown`
模拟进入系统前的外部形状；真实 HTTP 数据也必须走同类解析器。

### 7.1 创建完整领域契约

```bash
touch src/contracts.ts
```

完整文件 `src/contracts.ts`：

```ts
export type Listing = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  status: "available" | "reserved" | "sold";
  ownerId: string;
  version: number;
  createdAt: string;
};

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("listing: expected object");
  }
  return value as Record<string, unknown>;
}

function text(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
    throw new Error(`${path}: expected text`);
  }
  return value;
}

function integer(value: unknown, path: string, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${path}: expected safe integer >= ${minimum}`);
  }
  return value;
}

function utc(value: unknown): string {
  const input = text(value, "createdAt");
  const time = new Date(input);
  if (Number.isNaN(time.valueOf()) || time.toISOString() !== input) {
    throw new Error("createdAt: expected canonical UTC ISO 8601");
  }
  return input;
}

export function parseListing(value: unknown): Listing {
  const source = object(value);
  const status = source.status;
  if (status !== "available" && status !== "reserved" && status !== "sold") {
    throw new Error("status: invalid listing status");
  }
  return {
    id: text(source.id, "id"),
    title: text(source.title, "title"),
    description: text(source.description, "description", true),
    priceCents: integer(source.priceCents, "priceCents", 0),
    status,
    ownerId: text(source.ownerId, "ownerId"),
    version: integer(source.version, "version", 1),
    createdAt: utc(source.createdAt),
  };
}
```

完整替换 `src/listings.ts`：

```ts
import { parseListing } from "./contracts";
import type { Listing } from "./contracts";

export type { Listing } from "./contracts";

const teachingPayload: unknown[] = [
  {
    id: "listing-1",
    title: "台灯",
    description: "功能正常，自提",
    priceCents: 1990,
    status: "available",
    ownerId: "user-1",
    version: 1,
    createdAt: "2026-10-11T08:00:00.000Z",
  },
  {
    id: "listing-2",
    title: "旧书",
    description: "社区共享，免费领取",
    priceCents: 0,
    status: "available",
    ownerId: "user-2",
    version: 1,
    createdAt: "2026-10-11T08:30:00.000Z",
  },
];

export const listings: readonly Listing[] = teachingPayload.map((item) => parseListing(item));
```

`render-listing.ts` 继续从 `./listings` 导入 `Listing` 类型，因此上一课其它文件无需改动。运行完整链：

```bash
pnpm typecheck:all
pnpm build
pnpm preview
```

预期：

- 两个编译器检查退出 `0`；
- Vite 构建在类型门禁之后执行；
- preview 页面仍显示 `台灯 19.90 元` 与 `旧书 0.00 元`；
- 将任一 `priceCents` 临时改成字符串时，解析器在运行时拒绝；
- 静态教学数据标签仍存在，不宣称已连接真实后端。

### 7.2 为旧 API 消费者建立最小可执行边界

创建文件：

```bash
mkdir -p scripts
touch scripts/assert-old-compiler-api.mjs eslint.config.mjs
```

完整文件 `scripts/assert-old-compiler-api.mjs`：

```js
import ts from "typescript";

export function assertOldCompilerApi() {
  if (typeof ts.createProgram !== "function") {
    throw new Error("typescript compatibility API is unavailable");
  }
  return ts.version;
}
```

完整文件 `eslint.config.mjs`：

```js
import tseslint from "typescript-eslint";
import { assertOldCompilerApi } from "./scripts/assert-old-compiler-api.mjs";

assertOldCompilerApi();

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-debugger": "error",
    },
  },
];
```

运行：

```bash
pnpm lint
pnpm exec node --input-type=module -e 'import { assertOldCompilerApi } from "./scripts/assert-old-compiler-api.mjs"; console.log(assertOldCompilerApi())'
```

预期 Lint 退出 `0`，第二条命令打印与 `tsc6 --version` 相同的 6.0 系列版本。这里显式导入旧 API，
是为了让依赖边界可观察；下一章会把浏览器/Node 文件范围、globals、推荐规则和 Prettier 顺序完整配置。

## 8. 常见错误与排查路径

### 8.1 明确错误案例一：双编译器诊断记录

先备份 `src/listings.ts`，再把第一个商品临时改成：

```ts
const invalidListing: Listing = {
  id: "listing-error",
  title: "错误金额",
  description: "",
  priceCents: "1990",
  status: "available",
  ownerId: "user-1",
  version: 1,
  createdAt: "2026-10-11T08:00:00.000Z",
};
```

把该声明临时追加到文件末尾，然后分别捕获诊断：

```bash
mkdir -p evidence
set +e
pnpm typecheck > evidence/ts7-typecheck.txt 2>&1
ts7_status=$?
pnpm typecheck:compat > evidence/ts6-typecheck.txt 2>&1
ts6_status=$?
set -e
printf 'ts7=%s ts6=%s\n' "$ts7_status" "$ts6_status"
diff -u evidence/ts6-typecheck.txt evidence/ts7-typecheck.txt || true
```

两条状态都应非零，至少指出字符串不能赋给 `number`。`diff || true` 只用于比较两份已经保存的诊断，
不能出现在正式类型门禁中。

| 记录项 | 本次证据 |
| --- | --- |
| 现象 | 两个类型门禁都停止，build 不应继续 |
| 证据 | 两个退出码、两个版本和两个诊断文件 |
| 原因 | 静态 `Listing` 要求整数分为 `number`，错误示例提供字符串 |
| 修复 | 删除故障声明；外部字符串数据必须由运行时解析器拒绝，不用断言强转 |
| 复验 | `pnpm typecheck:all && pnpm build` 退出 `0` |

删除故障声明和本地 `evidence/` 后再复验。证据摘要写入学习记录即可，不把临时日志提交为项目源码。

### 8.2 明确错误案例二：禁用兼容入口，TS 7 成功而 Lint 失败

以下实验只移动可恢复的安装链接，不改清单与锁文件：

```bash
test -e node_modules/typescript
mv node_modules/typescript node_modules/typescript.compat-disabled
pnpm exec tsc --version
pnpm typecheck
pnpm lint
echo "lint exit=$?"
```

预期：

- `tsc --version` 仍为 `7.0.2`；
- `pnpm typecheck` 仍退出 `0`；
- `pnpm lint` 在加载 `eslint.config.mjs` 或 parser 时因找不到 `typescript` 兼容入口而非零失败。

立即恢复：

```bash
mv node_modules/typescript.compat-disabled node_modules/typescript
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck:all
```

| 记录项 | 本次证据 |
| --- | --- |
| 现象 | TS 7 主检查成功，但 Lint 无法加载旧 API 边界 |
| 证据 | `tsc` 版本与退出 `0`；Lint 的模块解析错误与非零退出 |
| 原因 | TS 7 CLI 来自 `@typescript/native`，Lint 仍通过包名 `typescript` 消费兼容 API |
| 修复 | 恢复官方 `typescript` 兼容别名与冻结安装结果 |
| 复验 | Lint、`typecheck`、`typecheck:compat` 全部退出 `0` |

这证明“主 CLI 已升级”不能替代“旧 API 消费者可运行”。不要通过删除 Lint、移除配置导入或改成
`|| true` 处理兼容失败。

### 8.3 其他排查记录

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| `tsc6` 不存在 | `pnpm list --depth 0` 与 bin 错误 | 安装了普通 `typescript` 或别名键错误 | 使用精确官方兼容别名并更新锁文件 | 三条版本探针 |
| API 版本与包装版本不同 | `ts.version` 和清单值 | 包装包转导出实际编译器 | 记录两种版本，不强行改日志 | `tsc6` 与 API 相同 |
| build 成功但 `typecheck` 失败 | 两个命令退出码不同 | Vite 转换不等于类型诊断 | 保留 build 前的双门禁 | `pnpm build` 先运行 `typecheck:all` |
| `.vue` 没有诊断 | `include` 只含 `.ts` | 普通 tsc 不检查 SFC 模板 | 在 Vue 工程配置并运行受支持的语言工具 | 保存 Vue 专属命令与版本 |

## 9. 课后题

**问题 1：为什么不把 TS 7 直接安装到包名 `typescript`？**

参考答案：旧工具仍通过该包名读取 TS 6 编译器 API；课程用 `@typescript/native` 隔离主 CLI，
把 `typescript` 留给兼容 API，避免入口冲突。

**问题 2：为什么清单写 `6.0.2`，探针可能输出 `6.0.3`？**

参考答案：`6.0.2` 是兼容包装包版本，包装包转导出的实际 TS 6 编译器由依赖范围和锁文件决定。

**问题 3：两条编译器诊断不同，应该删掉哪一条？**

参考答案：都不删。保存版本、输入、命令、退出码与诊断，判断是共同代码错误还是主线专属差异，再决定共享交集或独立配置。

**问题 4：双类型检查能证明外部 JSON 合法吗？**

参考答案：不能。JSON 在运行时仍是 `unknown`，必须解析字段、值域、整数分和 UTC 时间。

**问题 5：TS 7 普通源码通过，为什么不能宣布 Vue 已兼容？**

参考答案：`.vue` 模板、宏、Vue language tools 和插件有独立解析与版本边界，本课没有运行这些证据。

## 10. 实践练习

### 基础练习：拒绝小数分与负数

向本地 `teachingPayload` 分别注入 `priceCents: 19.9` 与 `priceCents: -1`，观察 preview 的运行时失败，
随后恢复合法值。

验收标准：

- 源变量保持 `unknown`；
- 解析器明确报告 `priceCents`；
- 不用 `Math.round` 静默修复非法输入；
- 恢复后双检查、build 与 preview 成功。

### 进阶练习：建立诊断归档格式

为一个确定的类型错误保存 TS 7 与 TS 6 的版本、命令、退出码和日志，再写一段结论。

答案标准：

- 两个文件分别命名，不覆盖；
- 结论区分共同错误和消息差异；
- 修复源类型，不改门禁；
- 修复后删除临时故障与原始本地日志，只保留必要摘要。

### 故障注入练习：证明三条路径独立

按第 8.2 节暂时移动 `node_modules/typescript` 链接，依次运行主 CLI、兼容 CLI、API 导入和 Lint。

验收标准：

- TS 7 主 CLI 仍输出 `7.0.2`；
- `tsc6`、API 或 Lint 中依赖兼容入口的路径明确失败；
- 恢复链接并冻结安装；
- 三条版本探针、Lint 和双检查全部恢复；
- 没有修改清单、锁文件或关闭规则。

## 11. 阶段验收

按顺序执行：

```bash
cd "$HOME/code/market-engineering-lab"
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec node --input-type=module -e 'import ts from "typescript"; console.log(ts.version)'
pnpm lint
pnpm typecheck
pnpm typecheck:compat
pnpm typecheck:all
pnpm build
pnpm preview
```

通过标准：

- Node 为 `24.21.0`，pnpm 为 `12.10.1`；
- `tsc` 精确为 `7.0.2`；
- `tsc6` 与导入 API 版本相同，均为实际观察到的 6.0 系列；
- Lint、两条独立类型检查、组合检查和 build 都退出 `0`；
- preview 展示 `19.90`、`0.00`，静态教学边界可见；
- 至少一次确定类型错误让两个诊断分别非零失败；
- 至少一次兼容入口故障证明 TS 7 成功不能替 Lint 证明兼容；
- Vue SFC、托管 CI、真实后端、生产缓存与跨浏览器仍明确列为未验证。

## 12. 常见问题

**能只保留 `typecheck:all` 吗？**

组合入口适合总门禁，但应保留两个具名脚本，失败时才能单独复验和记录。

**为什么 `tsc6` 输出不是固定写成 `6.0.2`？**

因为清单固定的是兼容包装包。实际编译器由包装包依赖和锁文件解析，必须现场探测。

**可以让 TS 7 用一个 tsconfig、TS 6 用另一个吗？**

迁移实验可以，但要说明差异。主质量门禁优先共享受支持交集，避免两条路径检查不同源码后仍声称等价。

**`skipLibCheck` 能解决兼容问题吗？**

它只跳过声明文件检查，不会补回缺失编译器 API，也不应被用来隐藏自己源码的错误。

**为什么本课引入最小 ESLint，却不讲完整规则？**

这里只验证旧 API 消费边界。完整 flat config、文件作用域、globals、Prettier 和失败门禁属于下一章。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [TypeScript 7.0 发布说明](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)：原生编译器与并行兼容方案。
- [TypeScript TSConfig Reference](https://www.typescriptlang.org/tsconfig/)：共享编译选项语义。
- [TypeScript Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)：模块与解析策略。
- [Vite TypeScript support](https://vite.dev/guide/features.html#typescript)：Vite 转译与独立类型检查边界。
- [typescript-eslint Getting Started](https://typescript-eslint.io/getting-started/)：parser 与 flat config 入口。
- [Vue TypeScript Overview](https://vuejs.org/guide/typescript/overview.html)：SFC 专属语言工具边界。

## 我现在能做到什么

我能让 TS 7 主 CLI 与 TS 6 兼容 CLI/API 在同一工程中各司其职，保留两套可审计诊断，
并证明 Vite 构建、TS 7 检查和旧 API 工具兼容是三类不同证据；我也不会把普通 `.ts` 通过扩大成
Vue SFC、真实 JSON 或整个生态已经兼容。

## 单元导航

[返回本章 Hub](../01-pnpm-vite-esm.md) ·
[上一课：Vite、ESM、开发构建与预览](02-vite-esm-dev-build-preview.md) ·
[下一课：Prettier 格式范围](../02-lint-format-quality/01-prettier-format-scope.md)
