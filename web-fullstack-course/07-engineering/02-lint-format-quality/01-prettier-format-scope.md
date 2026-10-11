# Prettier 3.9.10：格式范围、忽略规则与可审查改写

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 固定 Prettier 3.9.10，定义配置、扫描范围和忽略边界 |
| 可观察产出 | `.prettierrc.json`、`.prettierignore`、格式失败与恢复记录 |
| 运行条件 | Node.js 24.21.0、pnpm 12.11.2、已有 `market-engineering-lab` |
| 建议时间 | 90 分钟 |
| 完成证据 | 版本输出、`--check` 红绿结果、改写前后 diff、错误算法反例 |

## 1. 任务背景

邻里集市的两名开发者可以把同一对象排成不同换行，这种差异会放大评审噪声。
Prettier 适合把可机械决定的空格、换行、引号和尾逗号交给固定版本处理，让评审
把注意力放回金额、状态和数据边界。

格式一致不等于程序正确。把 `1990` 分错误地除以 `1000`，仍能得到完全符合
Prettier 规则的源码。本课先建立这个边界，再决定哪些手写文件允许被改写。
锁文件、依赖目录、构建输出和代码生成器拥有的目录不由 Prettier 二次改写。

所有操作都在读者自己的 `market-engineering-lab` 中完成。教材仓库只保存教程，
不保存本课的包清单、锁文件、依赖目录或构建产物。

## 2. 学习目标

完成本课后，你应能：

- 区分格式规范、静态正确性、运行时行为和人工评审；
- 固定并核对 Prettier `3.9.10`，理解版本也是格式结果的一部分；
- 解释配置文件、忽略文件、CLI 显式路径和当前目录如何共同决定范围；
- 区分 `--check` 的只读门禁与 `--write` 的有副作用改写；
- 在改写前确认路径，在改写后审查 diff；
- 保护 `pnpm-lock.yaml`、`node_modules/`、`dist/` 和声明的生成目录；
- 用可复验反例证明格式通过不能发现错误金额算法。

## 3. 预备知识

先完成[第 01 章](../01-pnpm-vite-esm.md)，确认当前目录与工具版本：

```bash
cd "$HOME/code/market-engineering-lab"
node --version
pnpm --version
pwd
```

预期分别看到 `v24.21.0`、`12.11.2` 和个人练习目录的绝对路径。实际练习根目录
不同时替换第一条路径，后续命令保持在同一根目录执行。先查看状态：

```bash
git status --short
```

若练习目录不是 Git 仓库，该命令会明确报错；仍可使用本课的 `/tmp` 副本和
`diff -u` 审查格式变化。不要为了运行格式工具而在教材仓库初始化或提交实验。

## 4. 核心理论

### 4.1 格式化只处理表示方式

Prettier 解析受支持的源码，再按自己的打印规则输出。它擅长统一这些差异：

- 对象和数组何时换行；
- 双引号或单引号；
- 分号、尾逗号和缩进；
- 超过 `printWidth` 倾向时的排版。

它不会决定商品价格单位、API 权限、错误恢复或测试预期。`printWidth` 也不是
“任何行都不得超过”的语法上限，长 URL、字符串或不可拆表达式仍可能超过它。

### 4.2 配置、范围与忽略是三个问题

`.prettierrc.json` 回答“命中的文件怎样打印”。CLI 参数回答“从哪里开始找文件”。
`.prettierignore` 回答“即使扫描到，也不应处理哪些路径”。三者不能互相替代。

在项目根运行 `prettier .` 会从当前目录遍历受支持文件。误在父目录执行可能扫描
无关项目；只配置忽略而不核对 `pwd` 仍可能越界。对当前任务只改两个文件时，
优先把两个路径明确写入命令，交付前再执行项目级 `prettier . --check`。

### 4.3 `--check` 与 `--write`

`--check` 读取文件并比较规范化结果，不改磁盘。存在格式漂移时退出码为 `1`；
内部错误通常使用不同的非零码。`--write` 会直接改文件，应在明确路径和工作区
状态后执行。正确顺序是：

```text
确认目录与状态 -> 只读检查 -> 明确改写路径 -> 审查 diff -> 再次只读检查
```

CI 只运行 `--check`。如果 CI 自动 `--write`，原提交仍然不符合规范，只是运行器
临时生成了未提交版本，评审者无法确认改写内容。

### 4.4 生成文件有唯一所有者

`pnpm-lock.yaml` 由 pnpm 根据清单和解析结果生成。`dist/` 由 Vite 生成，
`src/generated/` 在本实验中约定由代码生成器拥有。第二个工具改写这些文件会造成
无意义 diff，甚至破坏签名、快照或再次生成的一致性。

忽略并不等于保密。被忽略的前端环境文件如果进入浏览器构建，值仍可能公开；
被忽略的生成代码也仍需由其生成器和对应验证负责。

## 5. 元素、属性、API 或配置清单

| 命令、配置或文件 | 固定值或作用 | 本课边界 |
| --- | --- | --- |
| `prettier` | `3.9.10` | 版本不同可能产生不同排版 |
| `.prettierrc.json` | 项目打印规则 | 不选择扫描目录 |
| `.prettierignore` | Gitignore 风格忽略规则 | 不会从仓库删除文件 |
| `semi` | `true` | 统一分号，不检查业务 |
| `singleQuote` | `false` | JavaScript/TypeScript 使用双引号 |
| `trailingComma` | `"all"` | 在支持位置保留尾逗号 |
| `printWidth` | `100` | 排版倾向，不是硬错误上限 |
| `--check` | 只读比较，漂移时非零退出 | 适合本地门禁和 CI |
| `--write` | 原地改写 | 执行前确认路径，执行后审查 diff |
| `--list-different` | 只列出会变化的文件 | 适合核对意外范围 |
| `--ignore-path` | 显式指定忽略文件 | 多根目录时避免读错文件 |
| `pnpm-lock.yaml` | pnpm 生成的依赖图 | 由 pnpm 管理，不交给 Prettier |
| `src/generated/` | 本实验生成目录约定 | 改源模板后重新生成，不手改 |

## 6. 最小可运行案例

### 6.1 安装与创建配置

在个人实验根执行：

```bash
pnpm add -D -E prettier@3.9.10
pnpm exec prettier --version
mkdir -p src/generated scripts
touch .prettierrc.json .prettierignore src/format-scope.ts
```

预期版本输出：

```text
3.9.10
```

完整文件 `.prettierrc.json`：

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100
}
```

完整文件 `.prettierignore`：

```gitignore
node_modules/
dist/
coverage/
playwright-report/
test-results/
pnpm-lock.yaml
src/generated/
```

把下面故意未格式化的完整内容写入 `src/format-scope.ts`：

```ts
export const preview={title:"格式实验",priceCents:1990}
console.log( preview )
```

### 6.2 先红，再改写，再绿

执行只读检查并立即记录退出码：

```bash
pnpm exec prettier src/format-scope.ts --check
printf 'exit=%s\n' "$?"
```

预期稳定证据包含 `src/format-scope.ts`、格式警告和 `exit=1`。先保存改写前副本，
再只改这个文件：

```bash
cp src/format-scope.ts /tmp/market-format-scope.before.ts
pnpm exec prettier src/format-scope.ts --write
diff -u /tmp/market-format-scope.before.ts src/format-scope.ts
pnpm exec prettier src/format-scope.ts --check
printf 'exit=%s\n' "$?"
```

`diff -u` 因发现差异通常退出 `1`，这次是预期观察，不是格式门禁失败。审查后的
完整文件应为：

```ts
export const preview = { title: "格式实验", priceCents: 1990 };
console.log(preview);
```

最后一次 `--check` 输出 `All matched files use Prettier code style!` 并显示
`exit=0`。若版本输出、路径或 diff 与预期不同，先停止，不扩大为 `prettier . --write`。

### 6.3 证明忽略生效

把一行不规范的教学文本写入被生成器拥有的路径：

```bash
printf 'export const generated={value:1}\n' > src/generated/client.ts
pnpm exec prettier . --list-different
```

预期列表不包含 `src/generated/client.ts` 或 `pnpm-lock.yaml`。若还列出其他手写
文件，逐个判断是否属于当前任务，不要直接全量改写。清理本实验文件：

```bash
rm src/generated/client.ts
```

## 7. 邻里集市集成案例

创建完整文件 `scripts/market-preview.mjs`：

```js
function formatCents(cents) {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError("expected non-negative safe integer cents");
  }
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

const listing = {
  id: "listing-1",
  title: "台灯",
  description: "源码内教学数据，自提",
  priceCents: 1990,
  status: "available",
  ownerId: "user-1",
  version: 1,
  createdAt: "2026-10-11T08:00:00.000Z",
};

console.log(`${listing.title}：${formatCents(listing.priceCents)} 元`);
console.log(`createdAt=${listing.createdAt}`);
```

只格式化本课新增的手写文件，再运行：

```bash
pnpm exec prettier scripts/market-preview.mjs --write
pnpm exec prettier scripts/market-preview.mjs --check
node scripts/market-preview.mjs
```

预期输出：

```text
Checking formatting...
All matched files use Prettier code style!
台灯：19.90 元
createdAt=2026-10-11T08:00:00.000Z
```

价格仍是整数 `1990` 分，持久化时间仍是 UTC ISO 8601。这个输出只证明源码内
教学对象和金额函数在 Node 中按预期运行，不证明外部 JSON 已解析，也不证明浏览器、
真实 API、权限或数据库正确。

## 8. 常见错误与排查路径

### 明确错误案例：格式通过，金额仍然错误

创建完整文件 `scripts/format-trap.mjs`：

```js
function formatCents(cents) {
  return (cents / 1000).toFixed(2);
}

console.log(formatCents(1990));
```

执行：

```bash
pnpm exec prettier scripts/format-trap.mjs --write
pnpm exec prettier scripts/format-trap.mjs --check
node scripts/format-trap.mjs
```

格式检查退出 `0`，Node 却输出错误结果 `1.99`。正确业务结果应为 `19.90`。
不要给 Prettier 增加业务职责；恢复除数和安全整数校验，行为应由测试负责。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | `format:check` 绿色，但页面金额仍少一位 |
| 证据 | Prettier 退出 `0`；`node scripts/format-trap.mjs` 输出 `1.99`，输入为 `1990` 分 |
| 原因 | 算法错误地除以 `1000`；格式工具只重排源码，不验证金额语义 |
| 修复 | 恢复整数商、余数补零和非负安全整数检查；不修改格式门逃避问题 |
| 复验 | Prettier 仍退出 `0`，行为测试或直接运行输出 `19.90`，非法金额明确抛错 |

其他高频路径：

- `No files matching`：先检查当前目录和 CLI 路径，不改成扫描父目录；
- 意外列出 `dist/`：检查 `.prettierignore` 位置和 `--ignore-path`；
- 大量无关 diff：立即停止，恢复自己刚产生的改写，再改用显式文件路径；
- 锁文件变化：确认变化来自 pnpm 安装，而不是格式工具；
- `--check` 退出 `2`：按内部错误处理，读取第一条解析或配置错误，不当成普通漂移。

## 9. 课后题

1. 为什么 CI 应运行 `--check` 而不是 `--write`？
2. `.prettierrc.json` 能否阻止 `dist/` 被扫描？
3. `printWidth: 100` 是否保证每行最多 100 个字符？
4. `pnpm-lock.yaml` 被忽略后，是否可以不提交锁文件？

**参考答案：**

1. CI 应验证提交本身；自动改写只产生运行器内的未提交版本。
2. 不能；配置决定打印方式，忽略文件和 CLI 路径决定范围。
3. 不能；它是打印倾向，某些内容不会或无法按该宽度拆分。
4. 不可以；忽略仅针对 Prettier。应用锁文件仍由 pnpm 生成、审查并纳入版本控制。

## 10. 实践练习

### 基础

故意删除 `scripts/market-preview.mjs` 中一个分号并改变对象空格，先运行
`--check`，再对单文件运行 `--write`。

判定答案：第一次退出 `1` 并列出该文件；改写后 diff 只有排版变化；复验退出 `0`。

### 进阶

在已有 Git 练习仓库中只格式化 `src/format-scope.ts` 和
`scripts/market-preview.mjs`，不得改写其他文件。

判定答案：命令显式包含两个路径；`git diff --name-only` 只出现预期手写文件；
`pnpm-lock.yaml`、`src/generated/` 和无关源码不在 diff 中。

### 故障注入

临时删除 `.prettierignore` 中的 `src/generated/`，重建未格式化
`src/generated/client.ts`，运行 `--list-different`，然后恢复忽略规则并复验。

判定答案：注入时列表出现生成文件；恢复后消失。修复是恢复所有权边界，
不是手工格式化生成文件。实验结束后删除该教学生成文件。

## 11. 阶段验收

- [ ] `pnpm exec prettier --version` 精确输出 `3.9.10`。
- [ ] 能说明配置、CLI 路径和忽略文件各自负责什么。
- [ ] `--check` 的失败和恢复都记录了退出码。
- [ ] `--write` 前确认范围，执行后审查了 diff。
- [ ] 锁文件、依赖目录、构建输出和 `src/generated/` 未被改写。
- [ ] 邻里集市输出保持 `1990` 分对应 `19.90` 元。
- [ ] 能用错误算法反例解释“格式绿色不等于业务正确”。
- [ ] 完成一份“现象、证据、原因、修复、复验”记录。

## 12. 常见问题

**为什么不把所有文件都交给 Prettier？**

不同文件有不同所有者。锁文件和生成物应由原工具稳定生成，二次改写只增加漂移。

**可以在保存时自动格式化吗？**

可以，但编辑器必须使用项目固定版本和相同配置。交付前仍运行 CLI 门禁，避免
编辑器插件版本、工作区根目录或忽略规则不一致。

**Prettier 能替代 ESLint 的格式相关规则吗？**

Prettier 负责打印；下一课用 `eslint-config-prettier` 关闭冲突的样式规则，
ESLint 继续负责代码模式。两个命令保持独立，失败归因更清楚。

**忽略 `.env` 是否能保护前端秘密？**

不能。忽略只影响工具或版本控制。任何进入浏览器 bundle 的值都可被用户读取，
秘密必须留在受控服务端。

## 13. 扩展阅读

官方参考快照日期：**2026-10-11**。

- [Prettier 官方文档](https://prettier.io/docs/)
- [Prettier CLI](https://prettier.io/docs/cli)
- [Prettier 配置](https://prettier.io/docs/configuration)
- [Prettier 忽略文件](https://prettier.io/docs/ignore)
- [Prettier 与 Linter 的职责](https://prettier.io/docs/integrating-with-linters)

## 我现在能做到什么

我能固定 Prettier 3.9.10，准确控制格式范围，保护生成物和锁文件，在写入前后审查
变化，并用可运行反例说明格式门只证明排版一致，不证明金额算法或业务行为正确。

## 单元导航

[返回第 02 章入口](../02-lint-format-quality.md) ·
[上一课：TS 7 / TS 6 并行类型检查](../01-pnpm-vite-esm/03-ts7-ts6-parallel-typecheck.md) ·
[下一篇：ESLint 10 Flat Config](02-eslint-flat-config-typescript.md)
