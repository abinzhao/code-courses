# 干净环境重建与证据记录：从机械提取到红绿总门禁

## 任务卡

| 项目 | 本课约定 |
| --- | --- |
| 任务 | 机械提取 27 个完整文件，在 `/tmp` clean room 完成安装、探针、门禁、故障注入和清理 |
| 前置 | 前三课的 expected、完整文件 header/marker 和累计脚本已完成 |
| 建议投入 | 3 小时首次安装与验证，60 分钟故障注入和证据整理 |
| 完整文件 owner | 本课为 `0`；所有代码围栏都是命令、算法或精确变更，不是项目完整文件 |
| 目标目录 | `/tmp/web-fullstack-modernization/batch-4/market-engineering-capstone` |
| 成功证据 | 结构 27/27、冻结安装不改锁、版本探针、独立门、七场景、预算和 `pnpm verify` |
| 失败证据 | 清单漂移、格式、Lint、TS、Vitest、Vite、预算、端口和浏览器行为均先红后绿 |
| 证据分类 | observed pass、observed failure/recovery、environment block、manual gap |

本课的提取器只识别连续四件套：

```text
**完整文件：`relative/path`**
CAPSTONE_FILE_BEGIN(path, owner)
一个 fenced code block
CAPSTONE_FILE_END(path)
```

普通代码围栏、diff、命令和路径讨论没有 marker，因此不会被落盘。

## 1. 任务背景

从教程手工复制项目会引入不可审计选择：读者可能漏掉 ignore 文件、把差异片段当完整文件、
覆盖同一路径两次，或在安装后才发现树不一致。clean-room 验证必须先证明输入集合，再让工具
生成 lockfile、依赖、构建和报告。

运行成功也不是唯一证据。每个门至少要证明一次：

```text
合法输入 -> 退出 0
故障注入 -> 所属门非零退出
恢复输入 -> 同一门重新退出 0
最终 verify -> 全链再次退出 0
```

无法运行的外部环境要分类为 environment block；需要真实设备或生产系统的项目分类为 manual
gap。两类都不能写成 pass。

## 2. 学习目标

完成本课后，你能够：

1. 用可直接运行的 Python 提取器读取 expected 和完整文件 marker；
2. 在写盘前拒绝重复、缺失、未声明、owner 不符和 header 不符；
3. 在 `/tmp` 生成并审查 lockfile，再证明 frozen 重装不改变它；
4. 分别记录 Node、pnpm、TS 7、TS 6 CLI/API、Vite、Vitest 和 Playwright 版本；
5. 独立运行 format、Lint、双编译器、Vitest、build、budget 和 E2E；
6. 为每个门执行最小、可恢复、归属明确的故障注入；
7. 用精确证据区分 observed pass、observed failure/recovery、environment block 和 manual gap；
8. 停止临时服务并删除 `/tmp` 项目，确认教材树没有生成物。

## 3. 预备知识

从课程仓库根目录执行：

```bash
pwd
test -f web-fullstack-course/07-engineering/07-engineering-capstone/01-capstone-contract-scaffold.md
test -f web-fullstack-course/07-engineering/07-engineering-capstone/02-capstone-domain-app-teaching-api.md
test -f web-fullstack-course/07-engineering/07-engineering-capstone/03-capstone-tests-build-budget-browser.md
test -f web-fullstack-course/07-engineering/07-engineering-capstone/04-clean-room-verification-evidence.md
```

四条 `test` 均应退出 `0`。若当前目录不同，先切回仓库根；不要把错误根目录生成的空项目当作
教材缺失。

安全边界：

- 提取器只删除精确目标 `/tmp/web-fullstack-modernization/batch-4/market-engineering-capstone`；
- 故障注入前复制目标文件，恢复后立即重跑 owner 门；
- 不修改教材 Markdown、全局工具、生产账号或远端仓库；
- 不提交、不推送、不部署；
- Playwright 浏览器缓存可能由其他项目共享，不执行全局破坏性清理。

## 4. 核心理论

### 4.1 提取算法必须有独立 expected

如果只从 `CAPSTONE_FILE_BEGIN` 推导文件树，漏掉一个 marker 仍会得到“提取成功”。本课先从
第 01 课读取 27 条 `CAPSTONE_EXPECT`，再从四课读取完整文件块，比较：

```text
expected paths == extracted paths
expected owner(path) == block owner(path)
header path == BEGIN path == END path
BEGIN count == matched block count == END count
```

只有全部相等才写盘。重复路径在选择覆盖顺序前就失败。

### 4.2 Lockfile 是生成证据

首次 `pnpm install` 让固定 pnpm 根据清单生成 lockfile。审查包括：

- 根 importer 和两个 workspace member；
- TS 7 alias 与 TS 6 wrapper；
- 固定直接工具版本；
- 没有 `link:` 指向教材树或机器私人路径。

随后保存 SHA-256，执行 frozen install，再比较摘要。冻结重装不改 lockfile 才能证明输入一致。

### 4.3 版本探针是运行事实

清单写了版本不等于实际命令使用该版本。至少记录：

```text
node --version
pnpm --version
pnpm exec tsc --version
pnpm exec tsc6 --version
import "typescript" -> ts.version
pnpm exec vite --version
pnpm exec vitest --version
pnpm exec playwright --version
```

TS 6 wrapper 清单 `6.0.2` 与实际 CLI/API 补丁可能不同；只要求后两者相同并处于观察到的 6.0
系列。

### 4.4 故障注入要归属单一门

格式故障只增加一个未格式化临时文件；Lint 故障只增加 `debugger`；类型故障只增加字符串赋给
number；业务故障只改金额除数；build 故障只破坏一个 import；预算故障用环境变量，不改默认
阈值；E2E 故障只断开输入到搜索词的连接。

每轮恢复后重跑同一命令。连续叠加多个错误会让 fail-fast 遮挡真正 owner。

### 4.5 证据分类以是否实际观察为准

| 分类 | 使用条件 | 示例 |
| --- | --- | --- |
| observed pass | 本轮命令实际退出 0，输出与范围已保存 | `pnpm test` 的文件/测试数 |
| observed failure/recovery | 注入后实际非零，恢复后同命令退出 0 | 1 byte budget |
| environment block | 本应可自动运行，但工具/网络/权限阻止 | Chromium 下载被授权代理阻断 |
| manual gap | 本任务设计上不包含目标环境 | Firefox、真实移动设备、生产 TLS |

配置文本、预期结果和历史记录都不是本轮 observed pass。

## 5. 元素、属性、API 或配置清单

| 项目 | 精确值/命令 | 责任 |
| --- | --- | --- |
| `SOURCE_ROOT` | 四课所在目录 | 提取输入，只读 |
| `TARGET` | `/tmp/web-fullstack-modernization/batch-4/market-engineering-capstone` | 唯一写入根 |
| `CAPSTONE_EXPECT` | 第 01 课 27 条 | 声明树与 owner |
| `CAPSTONE_FILE_BEGIN/END` | 前三课完整文件 | 机器边界 |
| `sha256sum`/`shasum` | lockfile 前后摘要 | 证明 frozen 未修改 |
| `set +e` | 只包围预期失败命令 | 保存非零退出码 |
| `test "$status" -ne 0` | 验证故障真的失败 | 防止“未失败也继续” |
| `trap` | 异常时恢复备份或停止端口进程 | 降低临时状态泄漏 |
| `pnpm verify` | 总门禁 | 只在全部恢复后运行 |
| `find` | 生成物扫描 | 教材树必须无 package/lock/dist |

## 6. 最小可运行案例

### 6.1 可直接运行的机械提取脚本

以下命令从课程仓库根运行。它不是 capstone 项目文件，不带完整文件 marker。

```bash
set -euo pipefail

SOURCE_ROOT="$PWD/web-fullstack-course/07-engineering/07-engineering-capstone"
TARGET="/tmp/web-fullstack-modernization/batch-4/market-engineering-capstone"
export SOURCE_ROOT TARGET

python3 - <<'PY'
from pathlib import Path
import os
import re
import shutil

source_root = Path(os.environ["SOURCE_ROOT"]).resolve()
target = Path(os.environ["TARGET"]).resolve()
required_target = Path(
    "/tmp/web-fullstack-modernization/batch-4/market-engineering-capstone"
).resolve()
if target != required_target:
    raise SystemExit(f"refusing unexpected target: {target}")

lessons = sorted(source_root.glob("0[1-4]-*.md"))
if len(lessons) != 4:
    raise SystemExit(f"expected four lessons, found {len(lessons)}")

scaffold = source_root / "01-capstone-contract-scaffold.md"
expect_pattern = re.compile(
    r'<!-- CAPSTONE_EXPECT path="([^"]+)" owner="(0[1-4])" -->'
)
expected = {}
for path, owner in expect_pattern.findall(scaffold.read_text()):
    if path in expected:
        raise SystemExit(f"duplicate expected path: {path}")
    expected[path] = owner
if len(expected) != 27:
    raise SystemExit(f"expected 27 declared paths, found {len(expected)}")

block_pattern = re.compile(
    r'^\*\*完整文件：`([^`]+)`\*\*\n'
    r'<!-- CAPSTONE_FILE_BEGIN path="([^"]+)" owner="(0[1-4])" -->\n'
    r'```[^\n]*\n(.*?)\n```\n'
    r'<!-- CAPSTONE_FILE_END path="([^"]+)" -->',
    flags=re.MULTILINE | re.DOTALL,
)

blocks = {}
sources = {}
begin_count = 0
end_count = 0
for lesson in lessons:
    text = lesson.read_text()
    begin_count += len(
        re.findall(r"^<!-- CAPSTONE_FILE_BEGIN path=", text, flags=re.MULTILINE)
    )
    end_count += len(
        re.findall(r"^<!-- CAPSTONE_FILE_END path=", text, flags=re.MULTILINE)
    )
    for header_path, begin_path, owner, content, end_path in block_pattern.findall(text):
        if not (header_path == begin_path == end_path):
            raise SystemExit(
                f"path mismatch in {lesson.name}: "
                f"header={header_path} begin={begin_path} end={end_path}"
            )
        if begin_path in blocks:
            raise SystemExit(
                f"duplicate complete file: {begin_path}; "
                f"{sources[begin_path]} and {lesson.name}"
            )
        if begin_path not in expected:
            raise SystemExit(f"undeclared complete file: {begin_path}")
        if expected[begin_path] != owner:
            raise SystemExit(
                f"owner mismatch for {begin_path}: "
                f"expected={expected[begin_path]} actual={owner}"
            )
        blocks[begin_path] = content + "\n"
        sources[begin_path] = lesson.name

if begin_count != len(blocks) or end_count != len(blocks):
    raise SystemExit(
        f"unmatched marker: begin={begin_count} matched={len(blocks)} end={end_count}"
    )

missing = sorted(set(expected) - set(blocks))
unexpected = sorted(set(blocks) - set(expected))
if missing or unexpected:
    raise SystemExit(f"missing={missing}\nunexpected={unexpected}")

shutil.rmtree(target, ignore_errors=True)
for relative_path, content in sorted(blocks.items()):
    output = target / relative_path
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(content)

actual = {
    str(path.relative_to(target))
    for path in target.rglob("*")
    if path.is_file()
}
if actual != set(expected):
    raise SystemExit(
        f"tree mismatch: missing={sorted(set(expected) - actual)} "
        f"unexpected={sorted(actual - set(expected))}"
    )

owners = {}
for owner in expected.values():
    owners[owner] = owners.get(owner, 0) + 1
print(
    "Mechanical extraction: PASS "
    f"(files={len(actual)}, owners={owners}, target={target})"
)
PY

cd "$TARGET"
find . -type f -print | sort
```

预期最后打印：

```text
Mechanical extraction: PASS (files=27, owners={'01': 8, '02': 10, '03': 9}, ...)
```

`find` 此时只包含 expected 27 文件；没有 lockfile、`node_modules`、`dist` 或测试报告。

### 6.2 安装、lockfile 和 frozen 复验

先核对目录，再运行：

```bash
TARGET="/tmp/web-fullstack-modernization/batch-4/market-engineering-capstone"
cd "$TARGET"
test "$PWD" = "$TARGET"

node --version
pnpm --version
pnpm install
test -f pnpm-lock.yaml
shasum -a 256 pnpm-lock.yaml > /tmp/capstone-lock.before.sha256
pnpm install --frozen-lockfile
shasum -a 256 pnpm-lock.yaml > /tmp/capstone-lock.after.sha256
diff -u /tmp/capstone-lock.before.sha256 /tmp/capstone-lock.after.sha256
```

`diff` 无输出并退出 `0`。首次安装使用当前已配置包源；若任务要求证明公共 npm registry，还需
清空独立缓存并显式配置公共源，本课不把现有源安装扩大为公共源证据。

### 6.3 版本探针

```bash
pnpm exec tsc --version
pnpm exec tsc6 --version
pnpm exec node --input-type=module -e 'import ts from "typescript"; console.log(ts.version)'
pnpm exec vite --version
pnpm exec vitest --version
pnpm exec playwright --version
```

预期 TS 7 为 `7.0.2`，TS 6 CLI/API 相同且在 6.0 系列，Vite `8.3.4`、Vitest `5.0.3`、
Playwright `1.64.0`。

## 7. 邻里集市集成案例

### 7.1 先运行绿色基线

```bash
pnpm format
pnpm format:check
pnpm lint
pnpm typecheck
pnpm typecheck:compat
pnpm typecheck:all
pnpm test
pnpm build
find apps/lab-web/dist -type f -print | sort
pnpm budget
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm format` 只允许在 `/tmp` 中运行。执行后用 `find` 和后续提取 diff 检查它没有掩盖教材
源码漂移；理想结果是完整文件已经符合固定 Prettier，不产生内容变化。

### 7.2 清单/lockfile 漂移

```bash
cp package.json /tmp/capstone-package.before-lock.json
pnpm pkg set devDependencies.picocolors=1.1.1
set +e
pnpm install --frozen-lockfile
lock_status=$?
set -e
test "$lock_status" -ne 0
mv /tmp/capstone-package.before-lock.json package.json
pnpm install --frozen-lockfile
```

失败 owner 是 pnpm frozen gate。恢复清单，不删除 lockfile，也不改用普通安装掩盖漂移。

### 7.3 格式门

```bash
printf 'export const formatDrift={value:1}\n' > tests/format-drift.ts
set +e
pnpm format:check
format_status=$?
set -e
test "$format_status" -ne 0
rm tests/format-drift.ts
pnpm format:check
```

### 7.4 Lint 门

```bash
cp apps/lab-web/src/main.ts /tmp/capstone-main.before-lint.ts
printf '\ndebugger;\n' >> apps/lab-web/src/main.ts
set +e
pnpm lint
lint_status=$?
set -e
test "$lint_status" -ne 0
mv /tmp/capstone-main.before-lint.ts apps/lab-web/src/main.ts
pnpm lint
```

### 7.5 TS 7 与 TS 6 门

```bash
cp apps/lab-web/src/main.ts /tmp/capstone-main.before-type.ts
printf '\nconst typeProbe: number = "1990";\n' >> apps/lab-web/src/main.ts
set +e
pnpm typecheck
ts7_status=$?
pnpm typecheck:compat
ts6_status=$?
set -e
test "$ts7_status" -ne 0
test "$ts6_status" -ne 0
mv /tmp/capstone-main.before-type.ts apps/lab-web/src/main.ts
pnpm typecheck:all
```

两条诊断分别保存，不能根据 TS 7 失败推断 TS 6 结果。

### 7.6 Vitest 金额和 stale-result 门

金额故障：

```bash
cp packages/contracts/src/index.ts /tmp/capstone-contracts.before-money.ts
perl -0pi -e 's/Math\.floor\(parsed \/ 100\)/Math.floor(parsed \/ 1000)/' \
  packages/contracts/src/index.ts
set +e
pnpm exec vitest run tests/domain.test.ts
money_status=$?
set -e
test "$money_status" -ne 0
mv /tmp/capstone-contracts.before-money.ts packages/contracts/src/index.ts
pnpm exec vitest run tests/domain.test.ts
```

Stale guard 故障：

```bash
cp apps/lab-web/src/search.ts /tmp/capstone-search.before-stale.ts
perl -0pi -e \
  's/if \(disposed \|\| current !== generation \|\| controller\.signal\.aborted\) \{\n          return;\n        \}\n        if \(page/if \(disposed\) {\n          return;\n        }\n        if \(page/' \
  apps/lab-web/src/search.ts
set +e
pnpm exec vitest run tests/search.test.ts
stale_status=$?
set -e
test "$stale_status" -ne 0
mv /tmp/capstone-search.before-stale.ts apps/lab-web/src/search.ts
pnpm test
```

第二个实验保留 `active?.abort()`，但成功分支故意不检查旧 signal/generation；注入 reader 忽略
取消后，旧结果会错误发布。

### 7.7 Vite build 门

```bash
cp apps/lab-web/src/main.ts /tmp/capstone-main.before-build.ts
perl -0pi -e 's#@market/ui/tokens\.css#@market/ui/missing.css#' \
  apps/lab-web/src/main.ts
set +e
pnpm --filter @market/lab-web build
build_status=$?
set -e
test "$build_status" -ne 0
mv /tmp/capstone-main.before-build.ts apps/lab-web/src/main.ts
pnpm build
```

### 7.8 预算门

```bash
pnpm budget
set +e
JS_FILE_GZIP_LIMIT_BYTES=1 JS_TOTAL_GZIP_LIMIT_BYTES=1 pnpm budget
budget_status=$?
set -e
test "$budget_status" -ne 0
pnpm budget
```

再验证缺失构建：

```bash
set +e
node scripts/check-assets.mjs apps/lab-web/dist-missing
missing_build_status=$?
set -e
test "$missing_build_status" -ne 0
```

### 7.9 严格 preview 端口门

```bash
ready_file="/tmp/capstone-port-4173.ready"
rm -f "$ready_file"
READY_FILE="$ready_file" node -e '
  const fs = require("node:fs");
  const server = require("node:http").createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("occupied");
  });
  server.listen(4173, "127.0.0.1", () => {
    fs.writeFileSync(process.env.READY_FILE, "ready");
  });
' &
port_pid=$!
cleanup_port_probe() {
  kill "$port_pid" 2>/dev/null || true
  wait "$port_pid" 2>/dev/null || true
  rm -f "$ready_file"
}
trap cleanup_port_probe EXIT

port_ready=0
for attempt in $(seq 1 100); do
  if [ -f "$ready_file" ]; then
    port_ready=1
    break
  fi
  if ! kill -0 "$port_pid" 2>/dev/null; then
    echo "port owner exited before readiness" >&2
    exit 1
  fi
  sleep 0.05
done
if [ "$port_ready" -ne 1 ]; then
  echo "timed out waiting for port owner" >&2
  exit 1
fi

set +e
pnpm exec playwright test -g "scenario 1"
port_status=$?
set -e
test "$port_status" -ne 0
cleanup_port_probe
trap - EXIT
pnpm exec playwright test -g "scenario 1"
```

轮询等待的是明确 listen 事件文件，不用固定长等待猜端口是否就绪。

### 7.10 浏览器行为门

```bash
cp apps/lab-web/src/main.ts /tmp/capstone-main.before-e2e.ts
perl -0pi -e \
  's/void search\.search\(query\.value\.trim\(\)\);/void search.search\("valid"\);/' \
  apps/lab-web/src/main.ts
pnpm --filter @market/lab-web build
set +e
pnpm exec playwright test -g "scenario 2"
e2e_status=$?
set -e
test "$e2e_status" -ne 0
mv /tmp/capstone-main.before-e2e.ts apps/lab-web/src/main.ts
pnpm build
pnpm exec playwright test
```

场景 2 输入 `free` 却被错误入口改成 `valid`，应在 `0.00` 可见断言失败。修复行为，不把场景 2
改成只检查搜索按钮存在。

### 7.11 最终聚合门

```bash
pnpm verify
```

必须从日志观察 format、Lint、TS 7、TS 6、Vitest、Vite、budget 和七场景 Chromium 都在本轮
执行。不能因为命令名叫 verify 就省略日志核对。

## 8. 常见错误与排查路径

### 明确错误：清单漂移后删除 lockfile

| 五段 | 记录 |
| --- | --- |
| 现象 | frozen install 报清单与 lockfile 不一致 |
| 证据 | 非零退出和根 importer 差异，原 lockfile 摘要仍可读取 |
| 原因 | 故障注入增加直接依赖，lockfile 未记录 |
| 修复 | 本实验恢复原清单；真实有意变更则普通安装、审查新 lockfile，再 frozen |
| 复验 | frozen 退出 0，前后摘要按预期一致 |

删除 lockfile 重新解析会丢失原依赖图证据，不是 frozen 失败的最小修复。

### 证据分类错误

| 错误说法 | 正确分类 |
| --- | --- |
| “YAML/配置存在，所以托管 CI 通过” | manual gap，除非真实 runner 已执行 |
| “Chromium 通过，所以 Firefox/WebKit 通过” | manual gap |
| “浏览器下载失败，所以 E2E 通过不了但代码没问题” | environment block，不是 pass |
| “预算预期会失败” | 预期说明；只有实际非零并恢复才是 observed failure/recovery |
| “历史记录曾通过” | inherited evidence，不是本轮 observed pass |

### 排查顺序

1. 确认当前目录为精确 TARGET。
2. 找到首个 owner 门与非零退出码。
3. 比较注入前备份和当前文件。
4. 恢复本轮唯一注入。
5. 重跑同一 owner 门。
6. 最后重跑 `pnpm verify`。

连续两次恢复后仍失败，停止试错，保存已确认版本、diff、首条错误和未确认边界。

## 9. 课后题

**问题 1：提取器为什么在写盘前检查 owner？**

参考答案：防止后课用相同或新路径偷偷承担另一课责任；owner 漂移会使完整文件唯一来源失效。

**问题 2：为什么 `pnpm format` 只能在 `/tmp` 运行？**

参考答案：教材存放原始完整文件。验证器可在临时工程确认格式，但不能让工具改写课程范围外文件或
生成仓库包清单。

**问题 3：端口占用为什么是 environment failure，不是产品断言失败？**

参考答案：preview 尚未启动，七场景没有执行。证据 owner 是 webServer/strictPort。

**问题 4：为什么恢复每个故障后还要最终 verify？**

参考答案：局部门转绿不证明恢复没有破坏后续层；总门禁重新连接当前完整状态。

## 10. 实践练习

### 基础：增加提取器 dry-run 输出

在临时命令副本中只打印 `path -> owner -> source lesson`，不写文件。

判定标准：27 行、owner 计数 `8/10/9`、无重复；实际提取算法仍执行完整校验。

### 进阶：机器可读证据账本

把每条命令记录为 JSON Lines，字段固定为 `command`、`category`、`exitCode`、`scope`、
`observedAtUtc`、`summary`。

判定标准：UTC 使用 ISO 8601；failure 和 recovery 是两行；不保存 token、Cookie、完整 trace
或个人路径；历史输出不冒充本轮。

### 故障注入：差异片段伪装

在临时教程副本增加一个写有路径名称的 diff 围栏，但不加完整文件 marker。

判定标准：提取文件数仍为 27，差异片段不落盘；给它错误地加 BEGIN 后，提取器因未声明或重复
明确失败。

## 11. 阶段验收

### 自动证据

- [ ] 机械提取打印 27 文件，owner 为 `8/10/9`，无重复、缺失、未声明或 marker 残留。
- [ ] Node/pnpm 与清单固定版本一致。
- [ ] 首次 install 生成 lockfile，frozen 重装不改变摘要。
- [ ] TS 7 为 `7.0.2`；TS 6 CLI/API 输出相同实际 6.0 系列。
- [ ] Prettier、ESLint、双编译器和 Vitest 独立通过。
- [ ] Vite 构建生成 `apps/lab-web/dist`，预算报告每文件和总量。
- [ ] Playwright `1.64.0` 的七场景通过，4173 结束后不再监听。
- [ ] 每门故障注入实际失败，恢复后同一门通过。
- [ ] `pnpm verify` 在全部恢复后退出 0。

### 证据分类

- observed pass：仅记录本轮退出 0 的本地命令和实际输出。
- observed failure/recovery：记录注入、非零退出、恢复与同命令退出 0。
- environment block：记录工具、网络、权限或浏览器安装的原始阻塞；不写 pass。
- manual gap：记录托管 CI、Firefox、WebKit、真实移动设备、生产缓存/TLS/部署、真实后端授权/
  事务和生产回滚。

### 清理

确认没有本轮后台进程后执行：

```bash
TARGET="/tmp/web-fullstack-modernization/batch-4/market-engineering-capstone"
test "$TARGET" = "/tmp/web-fullstack-modernization/batch-4/market-engineering-capstone"
rm -rf "$TARGET"
rmdir /tmp/web-fullstack-modernization/batch-4 2>/dev/null || true
rmdir /tmp/web-fullstack-modernization 2>/dev/null || true
rm -f /tmp/capstone-lock.before.sha256 /tmp/capstone-lock.after.sha256
```

最后从课程仓库根扫描：

```bash
find web-fullstack-course/07-engineering -type d \
  \( -name node_modules -o -name dist -o -name coverage -o -name test-results \
     -o -name playwright-report \) -print
find web-fullstack-course/07-engineering -type f \
  \( -name package.json -o -name pnpm-lock.yaml -o -name .env \) -print
```

两条命令都应无输出。不要删除共享 Playwright 缓存或其他项目目录来追求“全机无浏览器”。

## 12. 常见问题

**为什么提取器使用正则读取 Markdown？**

这里的输入格式是本章自己定义的严格连续 marker 契约，不是任意 Markdown 解析。它还比较
marker 计数和 expected；普通围栏不会命中。

**首次 `pnpm install` 是否必须清空全局 store？**

不必须。本课验证清单/lockfile 和干净项目目录；公共源、完全冷缓存和离线安装是不同证据，应
单独说明。

**浏览器 install 已有缓存还算验证吗？**

命令成功并由 Playwright 运行匹配 Chromium，能证明当前环境可用；不能证明首次公网下载或其他
操作系统依赖安装。

**可以保留 `/tmp` 项目供审查吗？**

执行阶段可在验证期间保留，任务完成后按计划清理。需要长期证据时保存脱敏摘要，不提交
`node_modules`、dist、lockfile、trace 或浏览器。

## 13. 扩展阅读

官方资料快照日期：**2026-10-11**。

- [pnpm install](https://pnpm.io/cli/install)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Prettier CLI](https://prettier.io/docs/cli)
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface)
- [Vitest Guide](https://vitest.dev/guide/)
- [Vite Static Deploy](https://vite.dev/guide/static-deploy)
- [Playwright Browsers](https://playwright.dev/docs/browsers)
- [Playwright Test Web Server](https://playwright.dev/docs/test-webserver)

## 我现在能做到什么

我能从机器可识别的教材契约重建唯一项目，证明 lockfile、版本和每层门禁的真实红绿状态，并把
本地通过、故障恢复、环境阻塞和人工缺口分开记录；验证结束后还能清理临时服务与文件，不污染
教材仓库。

## 单元导航

[返回第 07 章入口](../07-engineering-capstone.md) ·
[上一课：测试、构建、预算与浏览器门禁](03-capstone-tests-build-budget-browser.md) ·
[返回工程化卷目录](../README.md)
