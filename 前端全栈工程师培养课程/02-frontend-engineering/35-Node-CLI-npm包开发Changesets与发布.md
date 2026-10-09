# 35-Node CLI、npm 包开发、Changesets 与发布

## 目标

完成本知识单元后，学员应能独立完成一个 Node.js 命令行工具和一个可发布 npm 包的设计、开发、测试、版本管理与发布，而不是只会在本地 `node index.js` 运行后直接 `npm publish`。

学员应能够：

1. 按“输入、输出、边界、失败方式”设计 CLI，实现参数解析、文件生成、帮助信息与正确的退出码。
2. 配置 `bin`、shebang 与可执行权限，让包安装后产生可调用的命令。
3. 组织现代 npm 包结构，正确使用 `exports`、`files`、ESM 与类型声明，控制公开 API 边界。
4. 使用构建工具产出可发布产物，并在发布前用 `npm pack` 等手段检查内容、体积与敏感信息。
5. 使用 Changesets 管理 semver 版本与 changelog，说清 patch、minor、major 的选择依据。
6. 走通 `npm publish` 全流程，理解 registry、双因子认证（2FA）、访问令牌与撤销发布的限制。

本单元默认在第 34 单元的 pnpm workspace 中开发包，但所有发布机制对独立仓库同样成立。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Node.js 当前 LTS（24.x，或团队锁定的 LTS） | CLI 与包的运行时 | 掌握 `process.argv`、退出码、fs/path API |
| TypeScript 当前稳定版（5.x） | CLI 与库源码 | 能输出 `.d.ts`，保持公开 API 类型稳定 |
| `cac`（或 `commander`） | CLI 参数解析 | 能定义命令、选项、帮助与版本信息 |
| `picocolors`、`ora`、`prompts` | 终端着色、加载态、交互输入 | 能在不污染机器可读输出的前提下改善体验 |
| `tsup`（或 Vite library mode） | 构建 ESM/CJS 产物与类型声明 | 能配置入口、格式、sourcemap 与清理 |
| Vitest | CLI 纯函数与文件生成测试 | 能在临时目录中测试并断言退出码 |
| Changesets 2.x | 版本与 changelog 管理 | 掌握 add/version/publish 流程 |
| npm registry（含私有 registry 概念） | 包分发 | 理解登录、2FA、token、`npm publish` 与弃包策略 |

版本说明：

- Changesets 的核心命令（`changeset`、`version`、`publish`）长期稳定，本单元以当前稳定版为准。
- npm 默认 registry 为 `https://registry.npmjs.org`；企业内常用私有 registry，通过 `.npmrc` 作用域映射。
- 本单元所有令牌、密码均为占位值，例如 `npm_placeholder_xxxx`。

开始前检查环境：

```bash
node -v
pnpm -v
npm whoami || echo "当前未登录 npm"
```

预期观察：

- 前两条输出版本号。
- `npm whoami` 在已登录时输出用户名，未登录时报错；未登录不影响本地开发，只在真正发布时需要认证。

## 详细的理论知识讲解和示例伪代码

### 1. CLI 的设计心智：输入、输出、边界

#### 1.1 定义

CLI（Command Line Interface）是通过命令行接收文本指令、输出文本结果的程序。前端工程师日常开发的 CLI 包括脚手架、代码生成器、路由扫描器、类型生成器、国际化提取器和发布辅助工具。

设计一个 CLI 前必须回答四个问题：

```text
输入：命令、参数、选项、环境变量、配置文件分别是什么？
输出：人类可读文本，还是 JSON 等机器可读结构？
边界：会读写哪些路径？会不会覆盖用户文件？
失败：参数错误、文件冲突、权限不足时如何退出？
```

#### 1.2 工程化关系

一个合格 CLI 的工程特征：

- 高频路径简单：`mytool init demo` 一步到位；
- 危险操作可预演：支持 `--dry-run`，先展示将要发生什么；
- 覆盖文件前询问或报错，绝不静默改写；
- 提供 `--help` 与版本信息；
- CI 场景提供 `--yes` 跳过交互；
- 成功退出码 `0`，失败非零。

错误示范与改进对照：

```ts
// 错误：无帮助、无校验、失败也返回 0
console.log(process.argv[2]);
```

```ts
// 改进：明确命令契约
type CliOptions = {
  dryRun: boolean;
  yes: boolean;
  outDir: string;
};

function printHelp(): void {
  console.log(`用法: mytool <command> [options]

命令:
  init <name>      创建新项目
  generate <name>  生成模块文件

选项:
  --dry-run        只预览，不写文件
  --yes            跳过确认（用于 CI）
  --out-dir <dir>  指定输出目录
  --help           显示帮助
  --version        显示版本`);
}
```

机器可读输出场景（供其他脚本消费）应与日志分离：

```bash
mytool scan --format json > report.json
# 进度与提示应走 stderr，stdout 只输出 JSON，避免污染数据
```

#### 1.3 常见误区

> 把所有提示和 JSON 结果都打到 stdout。

下游用 `mytool scan --format json | jq` 解析时，混入的日志行会直接导致解析失败。约定是：数据走 stdout，诊断信息走 stderr。

> CLI 只给自己用，不需要 help。

工具会被队友、CI 和三个月后的自己调用。help 是成本最低、收益最高的文档。

### 2. bin、shebang 与可执行入口

#### 2.1 定义

`bin` 字段把包内文件注册为命令；shebang（`#!` 开头的第一行）告诉操作系统用什么解释器执行该文件。全局或局部安装包时，npm 会创建命令名到该文件的链接。

```json
{
  "name": "@acme/create-module",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "acme-create-module": "./dist/index.js"
  }
}
```

入口文件第一行必须是 shebang：

```ts
// src/index.ts
#!/usr/bin/env node

console.log('acme-create-module 已启动');
```

`#!/usr/bin/env node` 的含义是“在 PATH 中查找 node 来执行本文件”，比写死 `/usr/local/bin/node` 更跨机器。

#### 2.2 工程化关系

安装后的调用链路：

```text
pnpm add -g @acme/create-module
  ↓
npm/pnpm 在可执行目录创建 acme-create-module 链接
  ↓
用户输入 acme-create-module init demo
  ↓
操作系统读取 shebang，用 node 执行 dist/index.js
```

本地开发时不必发布，可以直接用 node 运行或用 pnpm link 模拟：

```bash
node ./dist/index.js --help
# 在包目录执行 pnpm link --global，随后即可用命令名调用
pnpm link --global
acme-create-module --version
```

构建时要确保产物保留 shebang。tsup 会基于源码首行自动保留；若产物首行丢失（命令表现为“语法错误”或被当成普通 shell 脚本），需要在构建配置中显式处理。

跨平台注意：Windows 上 npm 通过 `cmd` 包装器（`acme-create-module.cmd`）调用，不需要文件可执行位；macOS/Linux 则要求文件具备执行权限，发布前可补：

```bash
chmod +x ./dist/index.js
```

单一可执行文件的包也可使用字符串形式简写：

```json
{
  "name": "acme-say",
  "bin": "./dist/index.js"
}
```

此时命令名与包名相同。

#### 2.3 常见误区

> 配置了 bin 但文件没有 shebang。

安装后调用会报“exec format error”或被 shell 当作系统脚本解析。bin 与 shebang 是成对条件。

> 在 TypeScript bin 文件里把 shebang 写在 import 之后。

shebang 只有出现在文件绝对第一行才有效；构建后顺序若被打乱同样失效。

### 3. 参数解析：命令、选项与环境变量

#### 3.1 定义

不借助库时，参数来自 `process.argv`（前两项是 node 路径与脚本路径，用户参数从第三项开始）。手写解析能工作，但帮助、默认值、类型转换和错误提示都要自己维护，因此工程中通常使用 `cac` 或 `commander`。

#### 3.2 工程化关系

原生 argv 结构观察：

```ts
// src/argv-demo.ts
console.log(process.argv);
// 执行 node argv-demo.ts init demo --dry-run
// ['/path/to/node', '/path/to/argv-demo.ts', 'init', 'demo', '--dry-run']
```

使用 cac 的完整示例：

```ts
// src/index.ts
#!/usr/bin/env node
import { cac } from 'cac';
import { runInit } from './commands/init';
import { runGenerate } from './commands/generate';

const version = '0.1.0';
const cli = cac('acme-create-module');

cli
  .command('init <name>', '创建新项目')
  .option('--out-dir <dir>', '输出目录', { default: '.' })
  .option('--yes', '跳过确认')
  .action(async (name: string, options: { outDir: string; yes: boolean }) => {
    await runInit({ name, ...options });
  });

cli
  .command('generate <name>', '生成功能模块')
  .option('--dry-run', '只预览不写文件')
  .action(async (name: string, options: { dryRun: boolean }) => {
    await runGenerate({ name, ...options });
  });

cli.help();
cli.version(version);
cli.parse();
```

参数优先级建议遵循常见约定：

```text
显式选项（--out-dir） > 环境变量（ACME_OUT_DIR） > 配置文件 > 内置默认值
```

布尔标志与值选项要区分清楚：`--dry-run` 是 flag，`--out-dir dist` 需要消费后一个值。库会自动处理 `=` 写法（`--out-dir=dist`）与 negate（`--no-xxx`）。

交互输入应可被自动化绕过：

```ts
// src/prompt.ts
import prompts from 'prompts';

export async function confirm(message: string, ci: boolean): Promise<boolean> {
  if (ci) return true;
  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message,
    initial: false,
  });
  return response.value === true;
}
```

#### 3.3 常见误区

> 危险操作默认“yes”，CI 中再想办法拦截。

默认值应是安全的：交互式默认取消、CI 必须显式 `--yes`。默认放行会让一条命令在队友机器上造成不可逆改动。

> 自己手写 argv 切分，忽略 `--`、引号和 `=` 等边界。

参数解析的边角情况很多，成熟库经过充分验证；除非刻意学习，否则不要重复造轮子。

### 4. 文件生成：冲突处理、跨平台路径与原子性

#### 4.1 定义

文件生成类 CLI 的标准流程是：读取模板 → 收集参数 → 计算目标路径 → 检查冲突 → 预览 → 写入 → 输出下一步。核心约束是“不破坏用户项目”。

#### 4.2 工程化关系

路径必须使用 path API 拼接，禁止手写斜杠：

```ts
// src/paths.ts
import path from 'node:path';

export function resolveTarget(outDir: string, name: string): string {
  return path.resolve(outDir, name);
}

export function targetFile(base: string, ...segments: string[]): string {
  return path.join(base, ...segments);
}
```

带冲突检查与 dry-run 的生成逻辑：

```ts
// src/commands/generate.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderTemplate } from '../template';

type GenerateInput = {
  name: string;
  dryRun: boolean;
};

export async function runGenerate({ name, dryRun }: GenerateInput): Promise<void> {
  const targetDir = path.resolve('src/features', name);
  const files = [
    { path: 'index.ts', template: 'index.ts.tpl' },
    { path: `${name}.tsx`, template: 'component.tsx.tpl' },
    { path: `${name}.test.ts`, template: 'test.ts.tpl' },
  ];

  try {
    const stat = await fs.stat(targetDir);
    if (stat.isDirectory()) {
      throw new Error(`目标目录已存在：${targetDir}，为避免覆盖已中止`);
    }
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('已存在')) {
      // ENOENT 表示目录不存在，正是可创建的预期状态
    }
  }

  const planned = files.map((file) => path.join(targetDir, file.path));

  if (dryRun) {
    console.log('dry-run：将创建以下文件');
    planned.forEach((file) => console.log(`  ${file}`));
    return;
  }

  await fs.mkdir(targetDir, { recursive: true });
  for (const file of files) {
    const content = await renderTemplate(file.template, { name });
    await fs.writeFile(path.join(targetDir, file.path), content, 'utf8');
  }

  console.log(`已生成模块 ${name}`);
  console.log(`下一步：在路由中引入 src/features/${name}`);
}
```

更稳妥的多文件写入可采用“临时目录 + 重命名”策略，降低半成品风险：

```text
1. 在目标旁创建 .tmp-xxxx 临时目录
2. 全部文件写入临时目录
3. 校验无误后 rename 到目标位置（同盘 rename 是原子的）
4. 任一步失败则删除临时目录，不留垃圾
```

模板变量渲染时要按纯文本替换，避免把用户输入当作代码执行；用户提供的名称还应做标识符合法性检查（如禁止 `../` 穿越路径）。

#### 4.3 常见误区

> 目录存在就 `rm -rf` 重建。

这是脚手架事故的最常见来源：一条命令删掉用户已有代码。存在冲突应中止并提示，绝不自动删除。

> 用字符串拼 Windows 与 POSIX 路径。

`path.join`、`path.resolve` 能正确处理分隔符；手写 `dir + '/' + file` 在 Windows 上可能产生非法路径。

### 5. 错误处理与退出码

#### 5.1 定义

退出码是 CLI 与调用者（Shell、CI、其他工具）之间最基础的契约：`0` 成功，非零失败。约定中的常用值包括：通用错误 `1`、参数误用 `2`；程序也可以自定义更大的退出码，但必须在文档中说明。

#### 5.2 工程化关系

统一入口捕获错误并映射退出码：

```ts
// src/main.ts
export class UsageError extends Error {}

export async function main(argv: string[]): Promise<number> {
  try {
    // 将 argv 交给命令分发
    console.log(`收到参数：${argv.join(' ')}`);
    return 0;
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`参数错误：${error.message}`);
      console.error('使用 --help 查看用法');
      return 2;
    }
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`程序异常：${message}`);
    return 1;
  }
}
```

```ts
// src/index.ts
#!/usr/bin/env node
import { main } from './main';

main(process.argv.slice(2)).then((code) => {
  process.exit(code);
});
```

区分两类错误，输出策略不同：

```text
用户错误（参数缺失、路径冲突、取消确认）
    → 提示原因与解决办法，退出码 2，不打印吓人的堆栈
程序错误（未预期异常）
    → 保留堆栈与调试线索，退出码 1
```

验证退出码（在命令结束后立即读取）：

```bash
acme-create-module generate ../../etc --dry-run
echo $?        # 预期为非零
acme-create-module --help
echo $?        # 预期为 0
```

注意 `process.exit()` 会立即终止事件循环，可能中断未完成的 stdout 写入；更稳妥的方式是设置 `process.exitCode` 让事件循环自然排空，或在确认输出完成后再退出。

```ts
process.exitCode = 1;   // 标记失败，但允许挂起的 I/O 完成
```

#### 5.3 常见误区

> catch 住错误打印一行日志，然后返回 0。

CI 只认退出码，会把这次失败误判为成功并继续发布。“打印失败”不等于“报告失败”。

> 任何错误都输出完整堆栈。

用户输入错误配堆栈只会制造恐慌、淹没真正的解决提示。堆栈应留给程序缺陷。

### 6. npm 包结构：exports、files、ESM 与类型声明

#### 6.1 定义

一个现代 npm 包通过 package.json 声明公开入口、可导入子路径、随包文件和模块系统。`exports` 是“入口的白名单”：未列出的路径，消费者即使知道文件存在也无法导入。

#### 6.2 工程化关系

现代 ESM 包的推荐配置：

```json
{
  "name": "@acme/format",
  "version": "0.4.2",
  "type": "module",
  "description": "面向订单业务的格式化工具集",
  "license": "MIT",
  "sideEffects": false,
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./currency": {
      "types": "./dist/currency.d.ts",
      "import": "./dist/currency.js"
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "engines": {
    "node": ">=20"
  }
}
```

字段解读：

- `"type": "module"`：包内 `.js` 按 ESM 解释；需要 CJS 产物可用 `.cjs` 后缀。
- `exports` 条件顺序中 `types` 应放在最前，保证解析器先拿到类型。
- `files` 是发布白名单，源码、测试、配置默认不会发布。
- `sideEffects: false` 帮助打包器做 tree shaking（有 CSS 等副作用时不能全开）。
- `engines` 声明最低运行版本，只产生警告，不是硬门禁。

类型声明要求覆盖全部公开 API：

```ts
// src/index.ts
export { formatCurrency } from './currency';
export { formatDate } from './date';

export type FormatCurrencyOptions = {
  currency?: string;
  locale?: string;
};
```

组件库应把 React 放在 peerDependencies，避免打包两份 React：

```json
{
  "peerDependencies": {
    "react": "^18.0.0 || ^19.0.0"
  },
  "devDependencies": {
    "react": "18.3.1"
  }
}
```

子路径导出让包可以演进内部结构而不破坏使用者；反过来，一旦发布了某个子路径，它就成为公开契约，删除它属于破坏性变更。

#### 6.3 常见误区

> 不写 exports，用户能 import 包内任意文件“更灵活”。

这等于把整个目录结构都变成公开 API，以后任何文件挪动都会破坏使用者。显式白名单才是可持续的边界。

> 发布的包没有 `.d.ts`，让使用者自己装 @types。

一手包应自带类型；缺失类型会让 TypeScript 用户退化成 any，包的可用性大打折扣。

### 7. 构建与发布前检查

#### 7.1 定义

构建把 TypeScript 源码转换成可在 Node 中运行的产物并生成声明文件；发布前检查是在真正 publish 之前，用一系列确定性动作确认产物正确、内容干净、质量门禁通过。

#### 7.2 工程化关系

tsup 配置示例（基于 esbuild，简单快速）：

```ts
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/currency.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  outDir: 'dist',
});
```

发布前检查清单与脚本：

```json
{
  "scripts": {
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "tsup",
    "prepack": "pnpm build",
    "prepublishOnly": "pnpm lint && pnpm typecheck && pnpm test && pnpm build",
    "pack:inspect": "npm pack --dry-run"
  }
}
```

各检查的目的：

```text
lint/typecheck   质量与类型门禁
test             行为正确性，CLI 测试应覆盖退出码
build            确保 dist 最新
npm pack --dry-run  预览最终会发布哪些文件、体积多大
```

执行打包检查并阅读输出：

```bash
pnpm build
npm pack --dry-run
# 输出包含 Tarball、文件列表、package size / unpacked size
```

重点核查：

- 文件列表中没有 `src/**/*.test.ts`、fixture、`.env`、本地脚本；
- 没有任何密钥或内网地址；
- 体积异常大时检查是否误把 node_modules 或 sourcemap 策略写错；
- `dist` 中每个 exports 入口都真实存在。

也可以实际生成 tarball 解开核对：

```bash
npm pack
mkdir -p /tmp/pkg-inspect && tar -xzf acme-format-*.tgz -C /tmp/pkg-inspect
ls /tmp/pkg-inspect/package/dist
```

#### 7.3 常见误区

> 只看构建成功就发布，不检查 tarball 内容。

最常见的事故是“产物里没带上类型声明”或“发布了测试用的本地配置文件”，这些只有 pack 列表能直接暴露。

> 用 `prepublish` 而非 `prepublishOnly`。

`prepublish` 还会在本地 `npm install` 等场景触发，语义已不推荐；发布前门禁应挂在 `prepublishOnly`。

### 8. Changesets 与 npm publish 全流程

#### 8.1 定义

Changesets 用“变更单（changeset）”记录每次改动影响了哪些包、属于哪一级 semver、给使用者看的说明是什么；`version` 步骤据此批量更新版本号并生成 changelog，`publish` 步骤把达到发布条件的包推到 registry。

semver 选择标准：

```text
patch（0.4.2 → 0.4.3） 向后兼容的缺陷修复
minor（0.4.2 → 0.5.0） 向后兼容的新功能
major（0.4.2 → 1.0.0） 破坏性变更：删除/改名公开 API、改变既有行为
```

#### 8.2 工程化关系

初始化与日常流程：

```bash
pnpm add -w -D @changesets/cli
pnpm changeset init

# 1. 完成代码改动后填写变更单（交互式选择包与级别）
pnpm changeset

# 2. 汇总变更单，更新版本与 CHANGELOG.md
pnpm changeset version

# 3. 发布所有版本落后于 registry 的包
pnpm changeset publish
```

生成的变更单示例：

```yaml
# .changeset/nine-cats-jump.md
---
'@acme/format': minor
---

新增 formatDate 的相对时间格式（“3 分钟前”），不改变既有调用方式。
```

CHANGELOG 是写给使用者的协作材料，应说明“改了什么、怎么迁移、有无风险”，而不是复制提交标题。

登录与发布：

```bash
npm login
# 建议账号启用 2FA；发布时按提示完成动态验证
npm whoami
pnpm changeset publish
```

CI 中使用访问令牌认证（令牌通过 CI Secret 注入，占位示例）：

```bash
# .npmrc 可在 CI 中临时生成或通过环境变量提供认证
# //registry.npmjs.org/:_authToken=${NPM_TOKEN}
NPM_TOKEN=npm_placeholder_xxxx pnpm changeset publish
```

作用域包默认是 restricted（私有），公开发布需显式声明：

```json
{
  "name": "@acme/format",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org"
  }
}
```

私有 registry 通过 `.npmrc` 做作用域映射：

```text
@acme-internal:registry=https://registry.internal.example.com/
//registry.internal.example.com/:_authToken=${INTERNAL_NPM_TOKEN}
```

关于撤销：npm 政策允许在发布后很短时间内 unpublish，但超过时限的包通常不能删除，只能用 `npm deprecate` 标记弃用。因此发布前检查不可替代，发错版本的正确补救通常是发布修复版本而非指望撤回。

多包联动时 Changesets 会自动处理内部依赖：若 `@acme/ui` 依赖新发布的 `@acme/format`，version 阶段会同步提升 ui 的版本与依赖范围，避免“下游锁定旧版上游”。

#### 8.3 常见误区

> 破坏性变更只发 patch，想着“先让用户装上再说”。

这违反 semver 契约，使用者按兼容预期升级会直接遭遇故障。破坏就必须 major（0.x 阶段也应在团队内明确约定升级信号）。

> 把长期有效的发布令牌写进仓库 .npmrc。

令牌等于发布权限，提交即泄露，可能被用于抢包或投毒。令牌只能存在于本机受控配置或 CI Secret 中。

## 课后题

1. 设计 CLI 前必须回答哪四个问题？为什么“危险操作支持 dry-run”是工程素养而不是可选功能？
2. `bin` 字段和 shebang 各自的作用是什么？只配置其中一个会出现什么现象？
3. 场景分析：队友发布了一个 CLI，使用者反馈“执行命令时报 exec format error”。请列出至少两个可能原因与对应的检查步骤。
4. 为什么机器可读输出应走 stdout、诊断信息走 stderr？请结合管道命令说明混用后的后果。
5. 场景分析：某脚手架发现目标目录存在时直接清空重建，结果删掉了用户两天的改动。请描述正确的冲突处理流程，以及“临时目录 + 重命名”如何降低半成品风险。
6. CLI 的退出码约定是什么？程序 catch 到错误、打印日志后仍返回 `0`，会在 CI 中造成什么问题？
7. npm 包的 `exports` 解决什么问题？为什么不建议让消费者 import 包内任意路径？
8. 场景分析：某团队发布组件库后，使用者反馈页面报 “Invalid hook call”，排查发现组件库产物中打包了一份独立的 React，与宿主应用的 React 同时存在。请解释根因，说明为什么组件库应把 react 放入 `peerDependencies`，以及发布前应如何检查产物中是否误打包了 React。
9. `npm pack --dry-run` 能帮助发现哪些发布事故？请列出至少四类应在输出中警惕的内容。
10. 场景分析：你为 `@acme/format` 删除了一个公开函数并改变了 `formatCurrency` 的默认币种，准备发布。请判断版本级别、写出 changelog 要点，并描述从变更单到发布的完整命令序列；发布后若发现错误，为什么通常不能依赖 unpublish？

## 实践练习题

### 练习 1：可安装的脚手架 CLI

#### 任务

开发 `acme-create-module` CLI：实现 `init <name>` 与 `generate <name>` 两个命令，支持 help、dry-run、yes，并在本地通过链接方式像真实命令一样调用。

#### 步骤约束

1. 使用参数解析库定义命令与选项，禁止裸切 argv 充当最终实现。
2. 目标已存在时必须中止并返回非零退出码，不得清空或覆盖。
3. `generate --dry-run` 只打印计划文件列表，不写任何文件。
4. 在 bin 入口正确处理 shebang；用 `pnpm link --global` 后以命令名演示。
5. 交互确认在 `--yes` 下自动通过，且默认选择安全项。

#### 提交物

- CLI 源码与 package.json（含 bin）；
- help 输出、dry-run 输出、成功与冲突场景的执行记录（含退出码）；
- 链接调用的演示步骤；
- 参数设计说明。

#### 验收标准

- 命令名可直接调用，shebang 与权限正确；
- 冲突场景不破坏任何文件，退出码符合约定；
- dry-run 与真实执行行为分明；
- help 覆盖所有命令与选项；
- stdout/stderr 职责清晰。

### 练习 2：可发布的 ESM 工具包

#### 任务

开发 `@acme/format` 工具包：用 TypeScript 实现至少三个格式化函数，构建 ESM/CJS 双产物与类型声明，配置 exports 与 files，并用 npm pack 完成发布内容审查。

#### 步骤约束

1. 包必须是 ESM 包（`type: module`），同时提供 require 可用的 CJS 产物。
2. exports 至少包含主入口与一个子路径，且每个入口在 dist 中真实存在并带类型。
3. files 白名单只包含产物与必要文档；测试、源码配置不得发布。
4. 执行 `npm pack --dry-run`，对照输出逐项核查并记录体积。
5. 生成 tarball 解开验证，写一段 README API 示例并确认示例能获得类型提示。

#### 提交物

- 包源码、构建配置与 package.json；
- pack 检查记录与解开 tarball 的文件清单；
- README 与 API 示例；
- 发布内容自检表。

#### 验收标准

- 双格式产物与类型声明齐全可用；
- 未列出的内部路径无法被导入；
- tarball 无测试文件、密钥与本地配置；
- README 示例与真实 API 一致；
- 构建可重复，clean 后产物完整。

### 练习 3：Changesets 版本与发布演练

#### 任务

在包项目中接入 Changesets，完成一次 patch 与一次 minor 变更的版本管理；在不真正公开发布的前提下，演练认证与发布全流程，并记录每一步证据。

#### 步骤约束

1. 初始化 Changesets，分别为两次变更填写变更单，说明级别选择理由。
2. 执行 version 后核对版本号与 CHANGELOG 内容，再回退版本提交以便重复演练。
3. 用本地占位令牌演练 publish 的认证路径（可指向本地测试 registry 或仅做 dry-run），不得向公共 registry 发布练习包。
4. 文档写清 2FA 的作用、令牌保管规则与 `publishConfig.access` 的含义。
5. 若在 workspace 中完成，需演示内部依赖版本联动提升。

#### 提交物

- Changesets 配置、变更单与生成的 CHANGELOG；
- 版本号变化记录与级别依据说明；
- 认证/发布演练命令与输出；
- 发布安全说明。

#### 验收标准

- 版本变化严格符合 semver；
- changelog 面向使用者、含迁移与风险信息；
- 演练过程没有真实发布练习代码、没有提交令牌；
- 能解释 unpublish 限制与弃用策略；
- 多包联动时依赖范围更新正确。

## 阶段验收作业

### 作业名称

CLI 工具与 npm 包的版本化交付

### 作业场景

团队需要一套“模块生成 + 格式化工具”组合：一个帮助开发者快速生成标准模块目录的 CLI，以及一个被多个应用复用的格式工具包。你需要把它们做成真正可以安装、版本化、可发布的产品，并回答：

- 使用者安装后如何调用？帮助、报错与退出码是否专业？
- 公开 API 边界在哪里？类型是否随包分发？
- 每次发布如何确定版本级别、如何向使用者说明变更？
- 发布前如何保证产物正确、内容干净？
- 认证信息如何保管，发错版本如何补救？

### 提交物

```text
acme-tools-lab/
├── packages/
│   ├── cli/
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── main.ts
│   │   │   └── commands/
│   │   ├── package.json
│   │   └── tsup.config.ts
│   └── format/
│       ├── src/
│       ├── package.json
│       └── tsup.config.ts
├── .changeset/
├── docs/
│   ├── release-runbook.md
│   └── api.md
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

提交清单：

1. CLI 具备 init/generate、help、dry-run、yes 与正确退出码，可通过链接真实调用。
2. 格式包具备 ESM/CJS 产物、类型声明、exports 子路径与 files 白名单。
3. 两个包均通过 lint/typecheck/test/build，CLI 测试覆盖临时目录文件生成与退出码断言。
4. npm pack 检查记录（文件列表与体积）。
5. Changesets：至少一次 patch、一次 minor 的变更单、版本与 CHANGELOG；workspace 联动证据。
6. `docs/release-runbook.md`：发布步骤、2FA 与令牌保管、registry 配置、发错版本补救。

### 演示步骤

学员需要在 15 分钟内完成以下演示：

1. 展示 CLI 帮助，并用真实命令名执行一次 generate dry-run。
2. 制造目录冲突，展示安全中止与退出码；再正常生成并说明产物。
3. 展示格式包的双格式产物与子路径导入，验证类型提示。
4. 运行 npm pack 检查，指出发布白名单如何排除测试与配置文件。
5. 展示 Changesets 从变更单到版本、CHANGELOG 的结果，并解释级别依据。
6. 讲解发布认证与令牌保管，回答“发错版本怎么办”。

导师可以临时要求新增一个选项或函数，并要求学员判断它属于哪一级版本变更。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| CLI 设计与可用性 | 20 | 输入输出清晰，help/dry-run/yes 完整，体验专业 |
| bin 与退出码 | 15 | shebang 正确，命令可调用，成功失败退出码准确 |
| 文件生成安全 | 15 | 冲突中止、跨平台路径、无覆盖事故、原子性意识 |
| 包结构与类型 | 20 | ESM、exports、files、双产物与类型声明正确 |
| 发布前检查 | 10 | pack 审查、质量门禁、tarball 内容干净 |
| Changesets 与发布流程 | 20 | semver 准确、changelog 清晰、认证与补救流程正确 |

细分评分规则：

#### CLI 设计与可用性：20 分

- 命令/选项设计与 help：7 分；
- dry-run/yes 与交互安全：7 分；
- stdout/stderr 分离：6 分。

#### bin 与退出码：15 分

- bin、shebang、权限：7 分；
- 退出码映射与 CI 语义：8 分。

#### 文件生成安全：15 分

- 冲突处理：7 分；
- 跨平台路径与标识符校验：4 分；
- 原子性与失败清理：4 分。

#### 包结构与类型：20 分

- exports 与 files：7 分；
- ESM/CJS 双产物：6 分；
- 类型声明与 peer 依赖：7 分。

#### 发布前检查：10 分

- pack 列表核查：6 分；
- 门禁脚本与体积检查：4 分。

#### Changesets 与发布流程：20 分

- 变更单与 semver：7 分；
- changelog 与联动提升：7 分；
- 2FA、令牌与补救策略：6 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过；修正后重新验收：

1. CLI 在失败时返回退出码 `0`，或发生错误后继续输出成功结果。
2. 文件生成会静默覆盖或删除用户已有文件。
3. bin 入口缺少 shebang，安装后命令无法调用。
4. 发布的包缺少类型声明，或 exports 入口在产物中不存在。
5. tarball 中包含测试文件、本地配置、密钥或无关大文件，且未被发现纠正。
6. 破坏性变更按 patch 发布，或无法说明版本级别依据。
7. 把发布令牌、密码写进仓库文件，或向公共 registry 发布了练习包。
8. 只提交截图，没有源码、命令记录与发布文档。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 按工程标准设计 CLI | 命令设计文档、help 与现场演示 |
| 配置 bin 与 shebang | package.json、链接调用与跨平台说明 |
| 实现安全的文件生成 | 冲突实验、路径处理与生成测试 |
| 正确处理错误与退出码 | 退出码断言与失败场景演示 |
| 组织现代 npm 包结构 | exports/files/ESM/类型声明与 pack 记录 |
| 执行发布前检查 | 门禁脚本与 tarball 核查 |
| 管理版本与发布 | Changesets 变更单、CHANGELOG 与发布演练 |
