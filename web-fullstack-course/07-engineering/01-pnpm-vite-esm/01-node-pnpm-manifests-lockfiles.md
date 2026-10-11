# Node、pnpm、清单与锁文件：建立可复现安装

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 从空目录建立 `market-engineering-lab`，固定运行时与包管理器，生成并验证锁文件 |
| 前置 | 会使用终端、理解文件路径，能阅读基础 JavaScript ESM |
| 建议投入 | 2.5 小时学习与操作，30 分钟故障实验 |
| 主要产物 | `.node-version`、`package.json`、pnpm 生成的 `pnpm-lock.yaml`、Node ESM 邻里集市外壳 |
| 成功证据 | 版本探针成功、Node 脚本输出 `台灯：19.90 元`、删除 `node_modules` 后可冻结重装 |
| 失败证据 | 清单与锁文件不一致时，冻结安装以非零退出并报告锁文件过期 |
| 环境边界 | 所有实验只在读者拥有的练习目录执行，不在教材仓库安装依赖 |

本课使用 Node.js `24.21.0`、pnpm `12.11.2`、Vite `8.3.4`、TypeScript
7/6 并行别名。Vite 与编译器在本课只作为安装对象和版本探针，页面与双类型检查分别在后两课完成。

## 1. 任务背景

“把源码发给同伴”并不等于“同伴得到同一个工程”。源码没有说明使用哪个 Node
主版本、哪个包管理器、传递依赖实际解析到什么版本，也没有证明命令从正确目录运行。
一台机器上残留的 `node_modules` 还可能掩盖清单缺项。

本课把隐含条件变成四类证据：

1. `.node-version` 记录课程希望版本管理器选择的 Node 版本；
2. `package.json` 记录项目身份、脚本、直接依赖和工具约束；
3. `pnpm-lock.yaml` 记录 pnpm 实际解析出的完整依赖图与完整性信息；
4. 版本命令、冻结安装和可观察输出证明当前机器确实执行了这些约定。

`.node-version` 与 `engines` 都不会自动安装 Node，`packageManager` 也不会让任意机器自动切换
pnpm。配置是可检查契约，真实环境仍以命令输出为准。

## 2. 学习目标

完成本课后，你应能：

- 区分 Node 运行时与 pnpm 包管理器的职责；
- 解释 `package.json`、`packageManager`、`engines`、直接依赖和传递依赖；
- 说明锁文件、内容寻址 store 与项目 `node_modules` 的关系；
- 从干净目录完成普通安装与冻结安装；
- 判断当前目录错误、安装产物损坏和权限错误；
- 证明安装产物可删除重建，而不是把 `node_modules` 当源码提交；
- 证明清单与锁文件不一致会被冻结门禁阻止；
- 在邻里集市外壳中坚持价格使用非负安全整数分、时间使用 UTC ISO 8601。

## 3. 预备知识

先确认自己能执行以下只读命令：

```bash
pwd
node --version
pnpm --version
```

目标输出分别是当前绝对路径、`v24.21.0` 与 `12.11.2`。补丁版本不符时不要伪造输出；
先按 [版本基线](../../00-guide/02-version-baseline.md) 核对支持范围。本课不要求通过
`sudo` 安装依赖，也不要求修改教材仓库或全书主线 workspace。

需要回顾项目业务字段时，阅读[邻里集市统一契约](../../00-guide/05-project-assessment.md)。
本课只使用源码内的静态教学数据，没有网络 JSON，因此不声称已经验证外部 `unknown` 数据。

## 4. 核心理论

### 4.1 Node 与 pnpm 各自负责什么

Node.js 是 JavaScript 运行时。它负责执行 `node src/print-listing.js`、提供文件系统等内置
API，并实现 Node 的包加载规则。pnpm 是包管理器。它读取清单，解析与下载依赖，生成锁文件，
组织项目链接，并把清单中的脚本交给 shell 与对应程序执行。

```text
package.json + pnpm-lock.yaml
              │
              ▼
       pnpm 解析并安装
              │
              ├── 项目 node_modules 链接
              └── 可执行入口，例如 vite、tsc、tsc6
                              │
                              ▼
                       Node 或对应二进制执行
```

Node 不会替 pnpm 解析整张依赖图；pnpm 也不会替 Node 执行业务模块。`pnpm node`、
`pnpm exec vite` 看似都从 pnpm 开始，最终仍由对应运行时或工具承担执行语义。

### 4.2 `package.json` 是直接意图，不是完整安装快照

本章会用到这些字段：

| 字段 | 作用 | 不能替代什么 |
| --- | --- | --- |
| `name` / `version` | 标识当前包 | 不证明已经发布 |
| `private` | 阻止误发布 | 不让浏览器代码变成秘密 |
| `type: "module"` | 让 Node 把包内普通 `.js` 按 ESM 解释 | 不等于 HTML 已使用模块脚本 |
| `packageManager` | 声明期望 pnpm 及版本 | 不自动修复本机 PATH |
| `engines.node` | 声明支持的 Node 范围 | 不自动下载 Node |
| `scripts` | 为团队提供稳定命令名 | 不保证脚本内部逻辑正确 |
| `devDependencies` | 声明开发与构建工具 | 不保证这些工具不会进入浏览器构建图 |

直接依赖是当前清单主动声明的依赖。传递依赖是直接依赖为了完成自身工作而声明的依赖。
即使直接版本写成精确的 `8.3.4`，传递依赖仍可能使用版本范围；锁文件负责记录本次实际解析结果。

### 4.3 锁文件是工具生成的依赖图

`pnpm install` 首次运行会生成 `pnpm-lock.yaml`。它通常包含：

- lockfile 格式版本；
- 当前 importer 的直接依赖解析；
- 包版本、来源和完整性；
- peer dependency 组合；
- 传递依赖关系。

锁文件不是手写教程配置。人工补一行无法可靠维护完整性、peer 组合和图关系。需要改变依赖时，
修改清单并让 pnpm 更新锁文件，再审查两者的 diff。

开发者有意改变依赖时运行普通安装：

```bash
pnpm install
```

CI、验收或“不得漂移”的干净重建使用：

```bash
pnpm install --frozen-lockfile
```

冻结安装不会替清单重新决定依赖图。清单与锁文件不一致时，它应该失败；失败正是门禁有效的证据。

### 4.4 store、`node_modules` 与源码的关系

pnpm 把包内容保存在内容寻址 store，再通过项目中的链接组织可见依赖。相同内容可以被多个项目复用，
但每个项目仍必须显式声明自己需要的包。

```bash
pnpm store path
pnpm list --depth 0
pnpm list --depth 1
```

第一条显示当前 store 路径；后两条分别观察直接层和下一层依赖。输出路径和传递包数量会随平台及锁文件
变化，不能把另一台机器的绝对路径写成验收常量。

`node_modules` 是安装产物。它可以从清单与锁文件重建，不应提交到课程仓库。store 也不是项目备份：
源码、清单和锁文件丢失后，store 不能替你恢复项目意图。

### 4.5 当前目录是命令输入的一部分

pnpm 从当前目录寻找项目边界。看到“找不到脚本”或“没有清单”时，先检查：

```bash
pwd
test -f package.json && echo "manifest: found" || echo "manifest: missing"
pnpm root
```

在父目录运行与在项目根运行是两个不同输入。反复全局安装 Vite 不会修复错误目录，反而可能让命令使用
另一版本，增加定位难度。

### 4.6 权限问题不能用管理员安装掩盖

如果此前用管理员身份创建了项目文件，普通用户可能无法更新 `node_modules` 或 store。先观察所有者：

```bash
ls -ld . node_modules 2>/dev/null || true
ls -ld "$(pnpm store path)"
```

最稳妥的恢复方式是在自己拥有的目录重新创建练习并冻结安装。确需修复所有者时，只能在确认路径属于自己、
理解命令影响并获得机器管理授权后处理。不要对系统目录递归改权，也不要把 `sudo pnpm install` 当常规方案。

## 5. 元素、属性、API 或配置清单

| 项目 | 固定值或示例 | 文件角色与边界 |
| --- | --- | --- |
| Node.js | `24.21.0` | 执行 Node ESM；实际版本以 `node --version` 为准 |
| pnpm | `12.11.2` | 解析依赖、生成锁文件、执行项目脚本 |
| Vite | `8.3.4` | 后续开发服务、Rolldown 生产构建与预览 |
| `@typescript/native` | `npm:typescript@7.0.2` | TS 7 主 CLI，提供 `tsc` |
| `typescript` | `npm:@typescript/typescript6@6.0.2` | TS 6 兼容 API 与 `tsc6` |
| `.node-version` | `24.21.0` | 支持该文件的版本管理器可读取，普通 shell 不会自动切换 |
| `packageManager` | `pnpm@12.11.2` | 工具选择契约，不是安装程序 |
| `engines.node` | `>=24.21.0 <25` | 允许范围，不是版本下载器 |
| `pnpm-lock.yaml` | 由 `pnpm install` 生成 | 完整依赖解析，不手写 |
| `node_modules` | 安装产物 | 可删除重建，不提交 |
| `pnpm install` | 更新或生成锁文件 | 依赖有意改变时使用并审查 |
| `--frozen-lockfile` | 禁止清单与锁文件漂移 | CI 与可复现验收门禁 |
| `pnpm store path` | 输出平台相关路径 | store 位置观察，不写进项目配置 |

## 6. 最小可运行案例

### 6.1 创建练习目录

以下命令只创建读者自己的练习工程：

```bash
mkdir -p "$HOME/code/market-engineering-lab/src"
cd "$HOME/code/market-engineering-lab"
touch .node-version package.json
pwd
```

预期最后一行以 `/code/market-engineering-lab` 结尾。使用编辑器写入下面两个完整文件。

完整文件 `.node-version`：

```text
24.21.0
```

完整文件 `package.json`：

```json
{
  "name": "market-engineering-lab",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@12.11.2",
  "engines": {
    "node": ">=24.21.0 <25"
  },
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1"
  },
  "devDependencies": {
    "@typescript/native": "npm:typescript@7.0.2",
    "typescript": "npm:@typescript/typescript6@6.0.2",
    "vite": "8.3.4"
  }
}
```

### 6.2 安装并观察直接依赖

```bash
node --version
pnpm --version
pnpm install
test -f pnpm-lock.yaml && echo "lockfile: generated"
pnpm list --depth 0
pnpm exec vite --version
```

可判定的预期结果：

```text
v24.21.0
12.11.2
lockfile: generated
vite/8.3.4
```

`pnpm list` 的树形符号和别名展示可能随终端变化，不把整段文本作为断言。关键证据是三项直接依赖可见、
Vite 版本正确、命令退出码为零。

### 6.3 证明安装产物可重建

先确认当前目录，随后只删除这个读者自有练习中的安装产物：

```bash
pwd
test -f package.json
test -f pnpm-lock.yaml
rm -rf node_modules
pnpm install --frozen-lockfile
pnpm exec vite --version
```

预期冻结安装退出 `0`，Vite 再次报告 `8.3.4`。这证明 `node_modules` 是可恢复产物；
它不证明公共 npm 源、离线缓存和另一操作系统已经验证。

## 7. 邻里集市集成案例

本节在同一练习中增加一个不依赖浏览器的 Node ESM 外壳。它先固定领域不变量，下一课再接入 Vite 页面。

创建文件：

```bash
cd "$HOME/code/market-engineering-lab"
touch src/listing.js src/print-listing.js
```

完整文件 `src/listing.js`：

```js
export const listing = Object.freeze({
  id: "listing-1",
  title: "台灯",
  description: "本地静态教学数据，功能正常，自提",
  priceCents: 1990,
  status: "available",
  ownerId: "user-1",
  version: 1,
  createdAt: "2026-10-11T08:00:00.000Z",
});

export function formatCents(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("expected non-negative safe integer cents");
  }
  const whole = Math.floor(cents / 100);
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole}.${fraction}`;
}
```

完整文件 `src/print-listing.js`：

```js
import { formatCents, listing } from "./listing.js";

const time = new Date(listing.createdAt);
if (Number.isNaN(time.valueOf()) || time.toISOString() !== listing.createdAt) {
  throw new Error("createdAt must be canonical UTC ISO 8601");
}

console.log(`${listing.title}：${formatCents(listing.priceCents)} 元`);
console.log(`createdAt=${listing.createdAt}`);
```

运行：

```bash
node src/print-listing.js
```

预期输出：

```text
台灯：19.90 元
createdAt=2026-10-11T08:00:00.000Z
```

这里的数据来自源码并已明确标为静态教学数据。它没有经过 HTTP，也没有认证、授权、事务或持久化。
价格 `1990` 表示整数分，不写成浮点元 `19.9`；时间持久形式保持 UTC，展示本地化留给界面层。

## 8. 常见错误与排查路径

### 8.1 明确错误案例：清单与锁文件不一致

在练习根执行以下故障实验。备份只用于恢复本次读者自有实验：

```bash
cp package.json package.json.before-mismatch
pnpm pkg set devDependencies.picocolors=1.1.1
pnpm install --frozen-lockfile
echo "exit=$?"
```

预期看到 `ERR_PNPM_OUTDATED_LOCKFILE` 或等价的清单/锁文件不一致说明，退出码非零。

| 记录项 | 本次证据 |
| --- | --- |
| 现象 | 冻结安装停止，没有更新依赖 |
| 证据 | pnpm 非零退出，并指出 `package.json` 与 `pnpm-lock.yaml` 不一致 |
| 原因 | 清单新增直接依赖，锁文件 importer 尚未记录它 |
| 修复 | 若这是有意变更，普通安装并审查锁文件；本次故障实验则恢复原清单 |
| 复验 | 恢复后再次冻结安装，必须退出 `0` |

恢复并复验：

```bash
mv package.json.before-mismatch package.json
pnpm install --frozen-lockfile
pnpm list --depth 0
```

不要把 CI 改成普通安装来掩盖漂移，也不要手工往锁文件补一行。

### 8.2 当前目录错误

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 找不到 `package.json` 或脚本 | `pwd` 与 `test -f package.json` | 命令在父目录或其他工程运行 | `cd "$HOME/code/market-engineering-lab"` | `pnpm exec vite --version` 为 `8.3.4` |

### 8.3 权限或损坏安装

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| `EACCES`、链接异常或包缺失 | 目录所有者、pnpm 原始错误、冻结安装日志 | 项目曾被其他用户创建，或安装中断 | 在自有目录重建；不要用管理员安装覆盖证据 | 删除本项目 `node_modules` 后冻结安装成功 |

### 8.4 Node 主版本错误

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| engines 警告或工具行为不同 | `node --version` 不在 `>=24.21.0 <25` | 版本管理器未切换 | 按团队认可方式选择 Node 24.21.0 | 重新运行版本探针与 Node 脚本 |

## 9. 课后题

**问题 1：`packageManager`、`engines` 和锁文件为什么不能互相替代？**

答案标准：指出三者分别描述包管理器选择、运行时允许范围与实际依赖解析；并说明机器仍需主动安装和选择工具。

**问题 2：直接依赖都写精确版本，为什么还需要锁文件？**

参考答案：直接包仍有自己的依赖和 peer 组合，清单没有记录整张解析图与完整性；锁文件保存本次实际结果。

**问题 3：pnpm store 能否让未声明的依赖成为合法依赖？**

参考答案：不能。store 只是内容复用；包必须在自己的清单中声明，不能依赖本机碰巧缓存的内容。

**问题 4：删除锁文件再安装，是否等于“清理缓存”？**

参考答案：不等于。删除锁文件会让 pnpm 重新解析依赖图，可能改变版本；清理安装产物应优先保留锁文件并冻结重装。

## 10. 实践练习

### 基础练习：增加免费商品

在静态数组中增加 `priceCents: 0` 的“旧书”，复用 `formatCents` 输出。

验收标准：

- 输出包含 `旧书：0.00 元`；
- 没有使用 `if (!priceCents)` 把零当成缺失；
- 时间仍为可规范化的 UTC ISO 8601；
- `node src/print-listing.js` 退出 `0`。

### 进阶练习：制作依赖证据表

运行 `pnpm list --depth 0`、`pnpm list --depth 1` 与 `pnpm store path`，记录“直接依赖、
传递依赖、store 路径”三类事实。

答案标准：

- 不把传递依赖复制为项目直接依赖；
- 不把本机绝对 store 路径提交为跨平台配置；
- 能指出哪条信息来自清单，哪条来自锁文件或实际命令。

### 故障注入练习：损坏安装产物

确认位于读者自有练习根后，删除 `node_modules`，不得删除锁文件，执行冻结安装。

验收标准：

- 删除前保存 `pwd`、清单与锁文件存在证据；
- 冻结安装成功；
- `pnpm exec vite --version` 恢复为 `8.3.4`；
- 能解释此实验只证明安装产物可恢复，不证明生产部署或公共源可用。

## 11. 阶段验收

按顺序执行：

```bash
cd "$HOME/code/market-engineering-lab"
node --version
pnpm --version
test -f package.json
test -f pnpm-lock.yaml
pnpm install --frozen-lockfile
pnpm exec vite --version
node src/print-listing.js
```

通过标准：

- Node 为 `v24.21.0`，pnpm 为 `12.11.2`，Vite 为 `8.3.4`；
- 清单和锁文件都存在，锁文件由 pnpm 生成；
- 冻结安装退出 `0`；
- 邻里集市输出精确包含 `19.90` 与 UTC 时间；
- 已观察一次清单/锁文件不一致的非零失败，并恢复到绿色；
- 没有在教材目录生成 `package.json`、锁文件、`node_modules` 或构建产物。

## 12. 常见问题

**可以把 `node_modules` 打包发给同伴吗？**

不作为课程复现方案。它含平台、链接与安装状态差异；应交付源码、清单和生成的锁文件，让同伴冻结安装。

**为什么 `private: true` 仍不能保存前端秘密？**

它只阻止包发布命令误发布，不改变浏览器构建产物的公开性质。

**冻结安装失败时能否先删锁文件？**

不能把这作为默认修复。先判断清单变更是否有意；有意则普通安装并审查，无意则恢复清单。

**pnpm store 损坏时怎么办？**

先保留原始错误，确认项目清单和锁文件；按 pnpm 官方命令检查 store 或在受控环境重新获取。不要先递归修改系统权限。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [Node.js Packages](https://nodejs.org/api/packages.html)：`type`、`exports` 与包边界。
- [Node.js 发布与支持](https://nodejs.org/en/about/previous-releases)：核对 LTS 状态。
- [pnpm 安装](https://pnpm.io/installation)：选择受支持的安装方式。
- [pnpm install](https://pnpm.io/cli/install)：普通与冻结安装语义。
- [pnpm symlinked node_modules structure](https://pnpm.io/symlinked-node-modules-structure)：store 与链接布局。
- [pnpm CLI](https://pnpm.io/pnpm-cli)：项目命令和版本探针。

## 我现在能做到什么

我能从空目录建立受版本约束的 Node/pnpm 工程，读懂清单与锁文件的不同责任，证明安装产物可以恢复，
并让清单漂移在冻结安装中明确失败，而不是通过删除锁文件或放宽门禁制造绿灯。

## 单元导航

[返回本章 Hub](../01-pnpm-vite-esm.md) ·
[上一课：数据结构、复杂度、搜索与排序](../../04-javascript-typescript/09-testing-debugging-algorithms/03-data-structures-complexity-search-sort.md) ·
[下一课：Vite、ESM、开发构建与预览](02-vite-esm-dev-build-preview.md)
