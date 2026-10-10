# 递归资源预算与生产预览

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | 已生成入口和 report 动态 chunk，并完成公开配置/发布边界分析 |
| 输入 | Vite `dist/` 或显式传入的构建目录 |
| 输出 | 每文件 raw + gzip 字节、全部 JavaScript 汇总和可失败门禁 |
| 文件 | `scripts/check-assets.mjs`、`package.json` scripts 增量 |
| 默认预算 | 单个 JavaScript gzip `<= 80 KiB`；全部 JavaScript gzip `<= 180 KiB` |
| 故障门禁 | 缺失构建拒绝、无 JavaScript 拒绝、1 byte 阈值退出非零 |
| 版本 | Node.js 24.21.0、pnpm 12.10.1、Vite 8.3.0；无新增运行时依赖 |
| 边界 | 本地 gzip 不等于生产 `Content-Encoding`；全部 JS 不等于首屏请求 |

## 1. 任务背景

Vite 会显示部分构建体积，但警告阈值不一定让命令失败，也不必等于团队要治理的口径。邻里集市需要一条独立、可复现、能返回非零退出码的资源门禁，让体积回归在提交或 CI 阶段可见。

“预算脚本运行成功”本身也可能是错误：如果 `dist/` 根本不存在、脚本只扫描顶层而漏掉嵌套资源，或者超限只打印 warning 后仍退出 0，绿灯没有任何约束意义。本课先定义口径，再故意验证缺失构建和 1 byte 阈值会失败。

## 2. 学习目标

- 用 Node.js 内置 `fs/promises` 递归遍历构建目录。
- 为每个 JavaScript 文件记录 raw 与独立 gzip 字节。
- 执行单文件 gzip 80 KiB 和全部 JavaScript gzip 180 KiB 的默认预算。
- 缺失构建目录或零 JavaScript 文件时明确退出非零。
- 用环境变量注入 1 byte 阈值，证明门禁能够发现失败且无需改源码。
- 区分全部构建 JS、首屏请求、缓存命中、压缩传输和主线程执行成本。
- 在生产预览中把预算报告与 Network 观察并列，而不是相互替代。

## 3. 预备知识

从读者自己的实验根检查：

```bash
cd market-engineering-lab
node --version
pnpm --version
pnpm quality
pnpm build
find dist -type f -print | sort
```

预期已有 `dist/index.html`、入口 JavaScript 和 report 动态 chunk。脚本只读构建文件，不修改源码或输出。Vite 构建仍应先执行质量门禁；预算不能替代格式、Lint、TS 7、TS 6、测试或浏览器验收。

默认阈值换算为精确字节：

```text
80 KiB  = 80 × 1024 = 81920 bytes
180 KiB = 180 × 1024 = 184320 bytes
```

“超过”采用 `>`：刚好等于阈值通过，增加 1 byte 后失败。gzip 输出受压缩器版本和选项影响，比较时要记录 Node 版本。

## 4. 核心理论

### 4.1 先定义四种体积

| 口径 | 本课怎样得到 | 能回答 | 不能回答 |
| --- | --- | --- | --- |
| 每文件 raw | `Buffer.byteLength` | 磁盘中未压缩资源规模 | 网络真实传输量 |
| 每文件 gzip | `gzipSync(buffer)` | 固定 Node/选项下的可比压缩估算 | 服务器真的使用 gzip |
| 全部 JS gzip | 各文件独立 gzip 后求和 | 完整构建 JavaScript 上界口径 | 首页实际下载 |
| 首屏请求/transfer | 生产预览或生产 Network | 特定页面、缓存状态下请求了什么 | 所有后续 chunk 与真实用户分布 |

动态 report chunk 会进入“全部 JS”，但点击前不应进入“首屏请求”。反过来，浏览器缓存命中可能显示很小或零传输，但资源仍属于应用代码。没有注明缓存、路径和操作的 Network 数字不可比较。

### 4.2 为什么按文件独立 gzip

HTTP 静态服务通常按资源独立响应，因此脚本对每个文件独立压缩，再累加结果。它不等同于把所有文件拼成一个 gzip 流，也不包含 HTTP header、TLS、连接和缓存开销。

生产服务器可能选择 Brotli、gzip 或不压缩，也可能因内容类型、代理或阈值使用不同设置。只有目标生产响应的 `Content-Encoding`、`Content-Length`/Transferred 和缓存状态能证明线上行为。

### 4.3 递归扫描为何是契约

构建器可以把资源放在 `dist/assets/` 或更深目录。只执行 `readdir("dist")` 会漏掉真实 JavaScript。递归脚本需要：

1. 先确认构建根存在且是目录；
2. 遍历所有子目录；
3. 只统计普通 `.js`、`.mjs`、`.cjs` 文件；
4. 使用稳定顺序输出；
5. 零文件时拒绝；
6. 任何超限使进程退出非零。

脚本不跟随符号链接，避免循环和把构建目录外内容算入预算。Vite 客户端构建通常输出 `.js`，扩展支持只是让脚本职责更清楚。

### 4.4 预算值来自项目，不来自工具默认

80/180 KiB 是本教学实验约定，不是所有站点的普适速度标准。真实项目应结合：

- 目标设备和网络；
- 首屏与交互后功能；
- 解析、编译和执行成本；
- 业务指标和错误预算；
- 缓存与发布策略；
- 可访问性和降级要求。

代码更小仍可能在主线程执行昂贵循环；代码更大也可能完全不在当前路径请求。体积门禁是早期信号，不是性能结论。

### 4.5 门禁必须证明红绿两种状态

正常构建通过只能证明当前资源低于阈值。把阈值临时设为 1 byte 并观察非零退出，才能证明超限路径可达。恢复默认值后再次通过，说明实验没有把项目留在错误状态。

缺失构建测试同理：传入一个确定不存在的目录，必须得到明确错误和非零退出。不能自动创建空 `dist/`、把“没有文件”当 0 byte 成功，或在 catch 中返回 0。

## 5. 元素、属性、API 或配置清单

| API/命令/配置 | 来源/版本 | 作用 | 本课约束 |
| --- | --- | --- | --- |
| `readdir(..., { withFileTypes: true })` | Node.js 24 | 获取目录项及类型 | 递归目录，只读取普通文件 |
| `stat` | `node:fs/promises` | 验证构建根 | 缺失或非目录都拒绝 |
| `readFile` | `node:fs/promises` | 读取资源为 Buffer | 不把文本字符数当字节数 |
| `gzipSync` | `node:zlib` | 生成本地 gzip 估算 | 固定 `level: 9`，记录 Node 版本 |
| `join` / `relative` / `resolve` | `node:path` | 构造与显示路径 | 不用字符串拼路径分隔符 |
| `process.argv[2]` | Node.js | 接收构建根 | 默认 `dist`，可测其他目录 |
| `process.env.JS_FILE_GZIP_LIMIT_BYTES` | shell | 故障注入单文件阈值 | 只接受正安全整数 |
| `process.env.JS_TOTAL_GZIP_LIMIT_BYTES` | shell | 故障注入总阈值 | 默认 184320 |
| `process.exitCode = 1` | Node.js | 向 shell/CI 表达失败 | 不用 warning 冒充门禁 |
| `pnpm build` | 项目脚本 | 先生成当前产物 | 构建仍需质量门禁 |
| `pnpm budget` | 项目脚本 | 执行独立预算 | 缺失构建必须失败 |
| Network `Content-Encoding` | 浏览器响应头 | 观察服务实际压缩 | 本地 preview 不代表生产 |

## 6. 最小可运行案例

先创建脚本目录：

```bash
mkdir -p scripts
```

**完整文件：`scripts/check-assets.mjs`**

```js
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { gzipSync } from "node:zlib";

const DEFAULT_FILE_LIMIT = 80 * 1024;
const DEFAULT_TOTAL_LIMIT = 180 * 1024;

function positiveInteger(value, fallback, name) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive safe integer`);
  }
  return parsed;
}

async function requireBuildDirectory(directory) {
  let metadata;
  try {
    metadata = await stat(directory);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(`missing build directory: ${directory}; run the build first`);
    }
    throw error;
  }
  if (!metadata.isDirectory()) {
    throw new Error(`build path is not a directory: ${directory}`);
  }
}

async function walkJavaScript(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((left, right) =>
    left.name < right.name ? -1 : left.name > right.name ? 1 : 0,
  );

  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJavaScript(path)));
    } else if (entry.isFile() && /\.(?:c|m)?js$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

async function main() {
  const root = resolve(process.argv[2] ?? "dist");
  const fileLimit = positiveInteger(
    process.env.JS_FILE_GZIP_LIMIT_BYTES,
    DEFAULT_FILE_LIMIT,
    "JS_FILE_GZIP_LIMIT_BYTES",
  );
  const totalLimit = positiveInteger(
    process.env.JS_TOTAL_GZIP_LIMIT_BYTES,
    DEFAULT_TOTAL_LIMIT,
    "JS_TOTAL_GZIP_LIMIT_BYTES",
  );

  await requireBuildDirectory(root);
  const files = await walkJavaScript(root);
  if (files.length === 0) {
    throw new Error(`no built JavaScript found under: ${root}`);
  }

  let rawTotal = 0;
  let gzipTotal = 0;
  let failed = false;

  for (const file of files) {
    const raw = await readFile(file);
    const gzipBytes = gzipSync(raw, { level: 9 }).byteLength;
    const overFileLimit = gzipBytes > fileLimit;
    rawTotal += raw.byteLength;
    gzipTotal += gzipBytes;
    failed ||= overFileLimit;
    console.log(
      `${relative(root, file)} raw=${raw.byteLength} gzip=${gzipBytes} ` +
        `fileLimit=${fileLimit} status=${overFileLimit ? "FAIL" : "PASS"}`,
    );
  }

  const overTotalLimit = gzipTotal > totalLimit;
  failed ||= overTotalLimit;
  console.log(
    `TOTAL files=${files.length} raw=${rawTotal} gzip=${gzipTotal} ` +
      `totalLimit=${totalLimit} status=${overTotalLimit ? "FAIL" : "PASS"}`,
  );

  if (failed) {
    console.error("JavaScript asset budget exceeded");
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  console.error(`[asset-budget] ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
```

先用两层合成目录验证递归和输出，不依赖 Vite：

```bash
mkdir -p budget-fixture/assets/nested
printf 'console.log("entry")\n' > budget-fixture/assets/entry.js
printf 'export const lazy = "report"\n' > budget-fixture/assets/nested/report.js
node scripts/check-assets.mjs budget-fixture
```

预期打印两个文件各自的 raw、gzip 和 `PASS`，再打印 `TOTAL files=2`，退出码为 0。具体 gzip 字节随 Node/zlib 版本记录，不写死。

验证缺失构建拒绝：

```bash
set +e
node scripts/check-assets.mjs dist-missing-training
missing_status=$?
set -e
test "$missing_status" -ne 0
```

预期包含 `missing build directory`，且 `missing_status` 非零。不存在目录不能被当成 0 byte 成功。

验证 1 byte 故障：

```bash
set +e
JS_FILE_GZIP_LIMIT_BYTES=1 \
JS_TOTAL_GZIP_LIMIT_BYTES=1 \
node scripts/check-assets.mjs budget-fixture
one_byte_status=$?
set -e
test "$one_byte_status" -ne 0
```

预期至少一个文件和 TOTAL 显示 `FAIL`，输出 `JavaScript asset budget exceeded`，退出码非零。最后恢复默认值：

```bash
node scripts/check-assets.mjs budget-fixture
```

预期重新退出 0。环境变量只用于本次命令，没有修改脚本默认预算。

## 7. 邻里集市集成案例

在 `package.json` 的 `scripts` 中增加以下键；这是增量片段，不是完整清单替换：

```json
{
  "budget": "node scripts/check-assets.mjs dist",
  "verify:assets": "pnpm build && pnpm budget"
}
```

构建并执行：

```bash
pnpm verify:assets
find dist -type f -print | sort
pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort
```

预算输出应至少覆盖入口和 report JavaScript，每个文件 gzip 不超过 81920 bytes，全部 JavaScript gzip 不超过 184320 bytes。实际文件名、raw 和 gzip 数字来自本次构建，不复制教材示例值。

在浏览器 Network 勾选 Disable cache，清空记录后重新加载：

1. 保存首屏实际请求的 JavaScript URL、Resource Size/Transferred 和状态。
2. 确认 report chunk 未在点击前请求。
3. 点击“加载教学统计”，保存新增 report 请求。
4. 查看响应头是否有 `Content-Encoding`，但明确标注这是 Vite 本地 preview。
5. `Ctrl+C` 停止服务。

形成并列记录：

```text
预算：全部构建 JS，各文件独立 Node gzip，Node 版本：
首屏：本地 preview、禁用缓存、点击前实际请求：
交互后：点击统计新增请求：
响应压缩：本地 Content-Encoding 观察：
生产状态：未验证 CDN、真实压缩、缓存头、TLS 与用户设备性能
```

若 `vite preview` 没有 gzip 响应，也不表示生产必须无压缩；它只说明当前本地服务响应。若它有压缩，也不能外推 CDN 配置。

### 默认预算、缺失构建和 1 byte 三段验收

正常门禁：

```bash
pnpm build
pnpm budget
```

缺失构建门禁使用明确不存在的路径，不移动真实 `dist`：

```bash
set +e
node scripts/check-assets.mjs dist-does-not-exist
missing_status=$?
set -e
test "$missing_status" -ne 0
```

1 byte 门禁：

```bash
set +e
JS_FILE_GZIP_LIMIT_BYTES=1 \
JS_TOTAL_GZIP_LIMIT_BYTES=1 \
pnpm budget
one_byte_status=$?
set -e
test "$one_byte_status" -ne 0
```

恢复默认门禁：

```bash
pnpm budget
```

四段命令的退出顺序应为 `0 / 非零 / 非零 / 0`。这证明门禁的通过、缺失输入、超限和恢复路径，不证明 80/180 KiB 本身就是生产最优预算。

## 8. 常见错误与排查路径

**故意错误：只扫 `dist` 顶层，找不到文件时仍打印成功。**

```js
const files = (await readdir("dist")).filter((name) => name.endsWith(".js"));
console.log(`total=${files.length === 0 ? 0 : "unknown"}`);
```

Vite 默认把 JavaScript 放在 `dist/assets/`，该脚本会漏报并制造 0 byte 绿灯。

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 明明有 chunk 却显示 0 个文件 | `find dist` 有 `assets/*.js`，脚本只读顶层 | 未递归 | 使用 Dirent 递归遍历 | 输出包含入口与 report |
| 未执行 build 仍预算通过 | `dist` 不存在，退出码却为 0 | catch 吞错或把空输入当成功 | 显式 `stat` 并拒绝缺失目录 | 不存在路径退出非零 |
| 超限只显示 warning，CI 仍绿 | shell `$?` 为 0 | 没有设置失败退出码 | 任一文件/总量超限设 `process.exitCode=1` | 1 byte 实验退出非零 |
| 预算写“首屏 10 KiB” | 报告包含未请求的 report chunk | 把全部构建 JS 当首屏请求 | 预算与 Network 分栏记录 | 点击前/后请求清单可区分 |
| 报告 gzip 就称生产已压缩 | 生产 URL 无响应头证据 | Node 本地估算被外推 | 检查目标响应 `Content-Encoding` | 仅在生产实测后报告 |
| 改大阈值让回归通过 | 没有需求、设备或趋势依据 | 用阈值掩盖体积变化 | 定位新增依赖/代码，评审预算变更 | 默认值或批准的新预算均有证据 |

错误记录至少保存命令、Node 版本、构建标识、退出码、超限文件与恢复后的输出。不要提交 `dist/` 或临时 fixture 到教材仓库。

## 9. 课后题

1. **为什么 raw 字节不能直接当下载量？**<br>
   答：网络可能使用 gzip/Brotli、缓存和协议开销；raw 是未压缩文件大小。
2. **为什么全部 JS gzip 不等于首屏？**<br>
   答：它包含点击后才请求的动态 chunk；首屏要按具体页面 Network 观察。
3. **脚本为什么拒绝空目录？**<br>
   答：空目录更可能表示构建缺失或扫描错误；把它当 0 byte 会制造无效绿灯。
4. **单文件刚好 81920 bytes 是否失败？**<br>
   答：不失败；本契约是“超过”80 KiB 才失败，即比较 `>`。
5. **预算通过是否证明交互不卡顿？**<br>
   答：不能。还要测解析执行、长任务、布局绘制、网络和真实用户指标。

## 10. 实践练习

**基础：加入第三层目录。**<br>
在 fixture 的更深目录添加一个 `.mjs`，另加一个 `.css`。验收：脚本递归统计 3 个 JavaScript 文件，不统计 CSS，TOTAL raw 等于三个文件 raw 之和。

**进阶：记录首屏与全部 JS。**<br>
对邻里集市生产预览分别记录预算文件集、点击前 Network 和点击后 Network。验收：report 属于全部 JS 和交互后请求，不被写进首屏请求。

**故障注入：1 byte 与无文件。**<br>
先以 1 byte 环境变量运行，再对只含 CSS 的目录运行。验收：两者都退出非零，分别给出超限和 `no built JavaScript`；恢复默认对真实 `dist` 后通过。

## 11. 阶段验收

- [ ] `scripts/check-assets.mjs` 只使用 Node.js 内置模块并递归扫描。
- [ ] 每个 JavaScript 输出 raw、gzip、单文件阈值和 PASS/FAIL。
- [ ] TOTAL 输出文件数、raw 总量、gzip 总量和 184320 bytes 阈值。
- [ ] 单文件 gzip `> 81920` 或总 gzip `> 184320` 时退出非零。
- [ ] 缺失目录与零 JavaScript 目录都被拒绝。
- [ ] 正常 / 缺失 / 1 byte / 恢复的退出顺序为 `0 / 非零 / 非零 / 0`。
- [ ] 生产预览记录区分点击前与点击后请求。
- [ ] 报告明确写出本地 gzip、preview 响应与生产压缩是三种证据。
- [ ] 未把预算通过描述成 Core Web Vitals、真实用户体验或生产发布通过。

## 12. 常见问题

**为什么不用 Vite 的 `chunkSizeWarningLimit`？**<br>
它是构建 warning 口径，默认比较未压缩 chunk，且警告不等于本课的失败门禁。可以保留，但不能替代独立预算。

**为什么使用同步 gzip？**<br>
脚本在构建后顺序检查少量文件，简单且结果清楚。大型项目可并发或流式处理，但要控制资源并保持同一统计口径。

**是否应该同时检查 Brotli？**<br>
只有生产策略确实使用并可验证时再新增独立口径。不要把两种算法混成一个阈值或凭本地 Brotli 断言线上启用。

**环境变量可被开发者调大，门禁还有意义吗？**<br>
故障注入需要覆盖值；CI 正常脚本不应传覆盖变量，并应评审工作流。任何门禁都依赖受控命令和可审计配置。

## 13. 扩展阅读

资料快照日期：2026-10-11。

- [Node.js `fs/promises`](https://nodejs.org/api/fs.html#promises-api)：目录与文件的异步读取。
- [Node.js `zlib`](https://nodejs.org/api/zlib.html)：`gzipSync` 与压缩能力。
- [Node.js `path`](https://nodejs.org/api/path.html)：跨平台路径构造。
- [Vite：Build Options](https://vite.dev/config/build-options)：压缩大小报告、chunk warning 与输出目录。
- [Vite：Deploying a Static Site](https://vite.dev/guide/static-deploy)：`dist` 和本地 preview 的定位。
- [MDN：Compression in HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Compression)：内容编码与传输压缩。

## 我现在能做到什么

我能用递归 Node.js 脚本执行明确的 raw + gzip 预算，证明缺失构建和 1 byte 超限会失败，并把全部构建 JS、本地预览请求与生产传输证据分开。

## 单元导航

[返回章入口](../03-build-assets-performance.md) · [上一课：客户端环境、Source Map、缓存与发布](02-client-env-sourcemaps-cache-release.md) · [下一课：pnpm Workspace 依赖图](../04-workspace-component-library/01-pnpm-workspace-dependency-graph.md)
