# JavaScript/TypeScript 与工程卷自检报告

本文件先保留 2026-10-10 的 JavaScript/TypeScript 与原工程卷历史证据，末尾新增
2026-10-11 Batch D 教材扩展验证。两个日期的环境、范围和结论不能互相替代。

检查日期：2026-10-10。范围仅为 `04-javascript-typescript` 与 `07-engineering`。
交付为16章正文、两卷README与本报告；报告和README不计入章数。
这两目录之外的教材文件没有在本任务中写入、覆盖或回退。
没有提交、推送、部署或修改全书主线工作区。

## 结构与篇幅

正文合计5988行、42107个汉字，汉字统计采用 Unicode Script=Han。
最短284行，最少2512个汉字；全部超过180行并达到约2500中文字要求。
各章具有目标前置、理论场景、具体示例、错误实验、练习答案、验收与官方资料。
Markdown围栏成对；21段JSON配置全部通过JSON.parse。
本范围相对链接检查无断链；JS卷README已链接到本报告。
当时的占位标记扫描没有发现未完成内容。

| 卷与章节 | 行数 | 汉字 |
| --- | ---: | ---: |
| JS01 值与控制流程 | 321 | 2603 |
| JS02 函数与错误 | 315 | 2747 |
| JS03 对象与数据 | 316 | 2554 |
| JS04 原型与模块 | 328 | 2564 |
| JS05 DOM与事件 | 335 | 2524 |
| JS06 异步与取消 | 356 | 2512 |
| TS07 核心 | 357 | 2582 |
| TS08 领域设计 | 392 | 2521 |
| JS09 测试与算法 | 344 | 2520 |
| 工程01 pnpm/Vite/ESM | 383 | 2968 |
| 工程02 质量门禁 | 310 | 2750 |
| 工程03 资源与性能 | 296 | 2635 |
| 工程04 Workspace | 418 | 2644 |
| 工程05 分层测试 | 409 | 2689 |
| 工程06 CI与发布 | 284 | 2629 |
| 工程07 结业闭环 | 824 | 2665 |

## 实际运行环境

系统为macOS arm64；验证运行时Node24.21.0，pnpm12.10.1。
默认shell原先为Node22.22.0；默认pnpm入口因旧Corepack缓存文件缺失而失败。
未修改全局安装、缓存或配置，通过临时目录安装固定工具后完成验证。
临时提取源码、依赖、浏览器和构建产物均在
`/tmp/fullstack-course-verify-20261010-js-engineering/`，不进入教材目录。
提取是对正文完整代码块的机械复制，未在仓库新增验证脚本。
正文格式示例按教材命令在临时工程执行Prettier后再检查。

结业工具实测：Vite8.3.0、Vitest5.0.0、Playwright1.64.0、ESLint10.12.0。
Playwright Chromium为Chrome for Testing156.0.8078.4，revision1248。
TS7别名CLI为7.0.2；兼容包装包为6.0.2，实际tsc6/API为6.0.3。
兼容包装包依赖 `@typescript/old` 的TS6范围，实际版本由生成的锁文件固定，
不能把包装包6.0.2误写为编译器输出6.0.2；正文已说明这一差别。
安装使用本机已配置的包源，未单独验证公共npm源的整套干净安装。

## 命令与结果

以下命令均从相应临时实验根目录执行，PATH指向临时Node24与固定pnpm。

| 验证 | 命令或操作 | 结果 |
| --- | --- | --- |
| JS独立演示 | `node <file.mjs>`，逐个运行21个文件 | 全部退出0，含异步API、事件循环、模块、算法输出 |
| 金额与竞态 | `node --test testing/money.test.mjs search-controller.test.mjs` | 5/5通过，含非法金额、累计溢出、输入不变、过期与销毁保护 |
| TS兼容实验 | `pnpm typecheck`、`pnpm build` | TS6.0.3检查与编译成功 |
| TS输出 | `node dist/main.js`、`narrowing.js`、`generics.js`、`domain-demo.js` | 四项退出0，金额、收窄、泛型、UTC与错误路径符合正文 |
| JS DOM页 | `node dom/server.mjs`，agent-browser操作 | 新增书架50.00、收藏台灯、移除台灯及计数符合预期 |
| 结业安装 | `pnpm install`、`pnpm install --frozen-lockfile` | 成功，锁文件由pnpm生成 |
| 结业格式 | `pnpm format`、`pnpm format:check` | 成功 |
| 结业静态检查 | `pnpm lint`、`pnpm typecheck:all` | ESLint与TS7/TS6双检查成功 |
| 结业业务测试 | `pnpm test` | Vitest3/3通过 |
| 结业构建 | `pnpm build` | Vite8/Rolldown成功，7模块转换 |
| 结业浏览器 | `pnpm test:e2e` | Chromium1/1通过 |
| 结业预算 | `pnpm budget` | JS gzip1739字节，低于单文件81920和总量184320字节 |
| 总闭环 | `pnpm verify` | 退出0，全部阶段与自动预览服务闭环完成 |

Chromium测试覆盖台灯19.90、免费书架0.00、500错误、非法字符串价格拒绝、
空结果和失败后恢复查询。它连接本机只读教学API，不证明真实后端认证与事务。
JS演示21项为first、types、check-price、total、function-basics、money、
defaults、scope、listings、references、page、data-boundary、prototype、this、
counter-class、modules/main、modules/lazy、order、async-demo、search-demo、algorithms。
所有为本次启动的浏览器与静态服务已关闭；verify的预览服务由测试工具结束。

补充外部验证证据：主线程在Node24.19下运行JS09提取的
`node --test money.test.mjs`，报告3/3通过，涵盖正常金额、非法输入、
汇总与输入不变。此项注明为主线程证据，不冒充本作者独立执行。

## 契约与路线检查

金额为非负安全整数分，完整Listing字段与UTC时间保留。
分页为 `{items,page,pageSize,total}`，未知输入经解析后使用。
搜索同时使用AbortController与编号，取消不等于撤销服务端写入。
认证解释保持同源HttpOnly cookie，并说明CSRF、会话过期、跨源credentials边界。
权限、有效预约唯一性和版本409恢复均未交给前端类型或按钮保证。

工程卷使用当前Vite Rolldown说明、ESLint flat config、pnpm workspace、
公共exports、design tokens、真实测试断言与公开VITE_变量边界。
类型脚本统一为 `typecheck`、`typecheck:compat`、`typecheck:all`；
`format:check` 与资源预算命令不是类型入口，不再保留含糊的 `pnpm check`。
TS6起点明确为兼容实验，TS7官方双别名在工程01与结业有完整配置。
ESLint继续读TS6旧API，不声称Vue语言工具可未经核验直接替换TS7。
所有独立实验明确不覆盖全书apps/react-web、apps/vue-web、apps/api主线。

## 未验证与风险

未逐项实跑每章的全部增量片段、练习答案和人为故障注入。
工程01至06的独立组合未分别完整重建；结业组合已经完整实跑，
不能把它扩大解释为前六章每一种配置变体均已实测。
未验证真实后端、认证、CSRF、CORS、预约并发事务、生产部署与缓存回滚。
未验证React/Vue真实应用及Vue SFC语言工具兼容，也未执行托管GitHub CI。
未进行Firefox、WebKit、移动设备和生产性能验收。
CI示例官方Action采用主版本tag而非固定SHA，正文说明了供应链残余边界。
这些未验证项不影响本机教材实验已取得的证据，但不能报告为生产全栈验收通过。

---

## 2026-10-11 Batch D 教材扩展验证

本节只记录本轮实际执行结果。验证项目由四篇结业教程中的唯一完整文件块机械提取到
`/tmp/full-course-verification/batch-d/market-engineering-capstone`。教材目录没有新增
`package.json`、锁文件、依赖目录、构建目录、浏览器二进制、报告或实验源码。

### 结构与静态证据

| 检查 | 命令摘要 | 观察结果 |
| --- | --- | --- |
| 稳定章入口 | `glob 07-engineering/[0-9][0-9]-*.md` | `7` |
| 详细教程 | 枚举七个同名目录 | `22`，分布 `3/3/3/3/3/3/4` |
| 覆盖矩阵 | 检查 `ENGINEERING-COVERAGE.md` | `74` 个唯一 ID |
| 教程标题 | 过滤围栏后匹配 `## 1.` 至 `## 13.` | `22/22`，并含任务卡、能力总结和单元导航 |
| Markdown 围栏 | 每篇统计围栏数量 | 全部成对 |
| 相对链接 | 忽略代码围栏后解析并逐路径存在性检查 | `712` 条相对链接，零断链 |
| 占位与空白 | `rg` 扫描未完成标记；逐行检查尾随空白 | 零匹配、零尾随空白 |
| 仓库产物 | `find` 扫描 package、lock、依赖、构建、报告目录 | 零路径 |
| Git diff | `git diff --check -- web-fullstack-course/07-engineering` | 零发现 |

结构计数、标题、围栏、链接和空白使用以下实际命令；覆盖矩阵另以
`/opt/homebrew/bin/python3.14`（实际 `3.14.7`）运行 Batch D 计划 Task 10 Step 4 的完整
九列/锚点脚本。系统 `python3` 为 `3.9.6`，不支持脚本使用的 `zip(strict=True)`，因此没有
把它的 `TypeError` 误记为矩阵失败或成功：

```bash
python3 - <<'PY'
from pathlib import Path
import re

root = Path("web-fullstack-course/07-engineering")
expected_lessons = {
    "01-pnpm-vite-esm/01-node-pnpm-manifests-lockfiles.md",
    "01-pnpm-vite-esm/02-vite-esm-dev-build-preview.md",
    "01-pnpm-vite-esm/03-ts7-ts6-parallel-typecheck.md",
    "02-lint-format-quality/01-prettier-format-scope.md",
    "02-lint-format-quality/02-eslint-flat-config-typescript.md",
    "02-lint-format-quality/03-quality-gates-failure-diagnostics.md",
    "03-build-assets-performance/01-vite-build-graph-chunks-dynamic-import.md",
    "03-build-assets-performance/02-client-env-sourcemaps-cache-release.md",
    "03-build-assets-performance/03-asset-budget-production-preview.md",
    "04-workspace-component-library/01-pnpm-workspace-dependency-graph.md",
    "04-workspace-component-library/02-package-exports-contracts-publishing.md",
    "04-workspace-component-library/03-design-tokens-cross-framework-boundaries.md",
    "05-unit-integration-e2e/01-vitest-unit-domain-boundaries.md",
    "05-unit-integration-e2e/02-vitest-integration-http-races.md",
    "05-unit-integration-e2e/03-playwright-built-page-e2e.md",
    "06-ci-git-release/01-git-scope-reviewable-commits.md",
    "06-ci-git-release/02-ci-reproducible-quality-pipeline.md",
    "06-ci-git-release/03-artifacts-release-cache-rollback.md",
    "07-engineering-capstone/01-capstone-contract-scaffold.md",
    "07-engineering-capstone/02-capstone-domain-app-teaching-api.md",
    "07-engineering-capstone/03-capstone-tests-build-budget-browser.md",
    "07-engineering-capstone/04-clean-room-verification-evidence.md",
}
hubs = sorted(root.glob("[0-9][0-9]-*.md"))
lessons = sorted(
    path
    for directory in root.iterdir()
    if directory.is_dir() and directory.name[:2].isdigit()
    for path in directory.glob("*.md")
)
matrix_rows = [
    line
    for line in (root / "ENGINEERING-COVERAGE.md").read_text().splitlines()
    if re.match(r"^\| ENG-[A-Z]+-[0-9]+ \|", line)
]
assert len(hubs) == 7
assert len(lessons) == 22
assert {str(path.relative_to(root)) for path in lessons} == expected_lessons
assert len(matrix_rows) == 74
for lesson in lessons:
    text = lesson.read_text()
    visible = re.sub(r"```.*?```", "", text, flags=re.S)
    assert re.findall(r"^## ([0-9]+)\.", visible, flags=re.M) == [
        str(number) for number in range(1, 14)
    ]
    assert text.count("```") % 2 == 0
errors = []
relative_links = 0
for source in root.rglob("*.md"):
    visible = re.sub(r"```.*?```", "", source.read_text(), flags=re.S)
    for target in re.findall(r"\[[^\]]+\]\(([^)\s]+)", visible):
        if "://" in target or target.startswith(("#", "mailto:", "tel:")):
            continue
        relative_links += 1
        path = target.split("#", 1)[0]
        if path and not (source.parent / path).resolve().exists():
            errors.append(f"{source}: {target}")
    for number, line in enumerate(source.read_text().splitlines(), 1):
        assert not line.endswith((" ", "\t")), f"{source}:{number}"
assert not errors, "\n".join(errors)
print(
    f"hubs={len(hubs)} lessons={len(lessons)} "
    f"matrix_rows={len(matrix_rows)} relative_links={relative_links}"
)
PY

rg -n '\b(TO[D]O|TB[D]|FIX[M]E|WI[P])\b|待完[善]|自行补[充]|占位[符]|类似前[文]' \
  web-fullstack-course/07-engineering
find web-fullstack-course/07-engineering -type d \
  \( -name node_modules -o -name dist -o -name coverage -o -name labs \) -print
find web-fullstack-course/07-engineering -type f \
  \( -name package.json -o -name pnpm-lock.yaml -o -name yarn.lock -o -name .env \) -print
git diff --check -- web-fullstack-course/07-engineering
```

`rg` 以退出码 `1` 表示零匹配，两个 `find` 和 `git diff --check` 均无输出。

精确文件集检查输出：

```text
Engineering detailed lesson set: PASS (22; 3/3/3/3/3/3/4)
Engineering lesson structure: PASS (22)
Engineering relative links: PASS
Engineering coverage matrix: PASS (74 unique rows; Python 3.14)
Engineering Markdown trailing whitespace: PASS
```

### 机械提取与安装

结业课提取器先读取 27 条 `CAPSTONE_EXPECT`，再要求完整文件 header、BEGIN、END、路径和
owner 一致，写盘前拒绝重复、缺失、未声明和 owner 漂移。

```text
Mechanical extraction: PASS
files=27
owners={'01': 8, '02': 10, '03': 9}
target=/private/tmp/full-course-verification/batch-d/market-engineering-capstone
```

目标 Node `v24.21.0` 从官方发布包解压到 `/tmp/full-course-verification/tools`，没有修改全局
Node。pnpm 使用现有 `12.10.1`。首次安装生成锁文件，随后冻结安装退出 `0`；冻结安装前后
SHA-256 相同：

```text
5778016cc1d3b9480e2818b54a380c6aa0dde830c949eb8e0e5392181b4103b6
```

安装输出为 `139` 个包，全部来自当前已配置缓存或包源，`downloaded 0`。因此本轮没有获得
“从公共 npm registry 全新下载”的证据。

### 工具与门禁结果

| 证据 | 命令 | 实际结果 |
| --- | --- | --- |
| Node | `node --version` | `v24.21.0` |
| pnpm | `pnpm --version` | `12.10.1` |
| TS 7 CLI | `pnpm exec tsc --version` | `Version 7.0.2` |
| TS 6 CLI | `pnpm exec tsc6 --version` | `Version 6.0.3` |
| TS 6 API | 导入 `typescript` 打印 `ts.version` | `6.0.3`；清单包装包为 `6.0.2` |
| Vite | `pnpm exec vite --version` | `8.3.0`，Node 24.21.0 |
| Vitest | `pnpm exec vitest --version` | `5.0.0` |
| Playwright | `pnpm exec playwright --version` | `1.64.0` |
| Chromium | Playwright 启动后读取 `browser.version()` | `156.0.8078.4` |
| ESLint | `pnpm exec eslint --version` | `10.12.0` |
| Prettier | `pnpm exec prettier --version` | `3.8.0` |
| 格式 | `pnpm format:check` | 退出 `0` |
| Lint | `pnpm lint` | 退出 `0`，零 warning/error |
| TS 7 | `pnpm typecheck` | 退出 `0` |
| TS 6 | `pnpm typecheck:compat` | 退出 `0` |
| 双编译器 | `pnpm typecheck:all` | 退出 `0` |
| 单元/集成 | `pnpm test` | `3` 个文件、`16/16` tests 通过 |
| Vite 构建 | `pnpm build` | `7` modules transformed，退出 `0` |
| 构建输出 | `find apps/lab-web/dist -type f` | HTML、1 CSS、1 JS，仅在 `/tmp` |
| 资源预算 | `pnpm budget` | JS raw `4294`、gzip `1992`，退出 `0` |
| 浏览器 | `pnpm test:e2e` | Chromium `7/7` scenarios 通过 |
| 聚合门 | `pnpm verify` | 按 quality、build、budget、E2E 顺序退出 `0` |

Vitest 的 16 条断言覆盖整数分、零值、非法金额、UTC 规范化、无效日历日期、分页矛盾、
重复 ID、输入不变、HTTP 状态、查询编码、same-origin credentials、运行时解析、取消、
generation guard、dispose 和错误恢复。

Playwright 的 7 条场景覆盖 `19.90`、`0.00`、HTTP 500、字符串价格拒绝、空成功、过期结果
保护和失败后恢复。测试连接本机只读教学 API 与 Vite production preview；这不证明真实后端
认证、对象授权、事务、生产网络或生产缓存。

### 故障注入与恢复

| 故障 | 失败门与结果 | 恢复证据 |
| --- | --- | --- |
| 清单把 Vite 从 `8.3.0` 改为 `8.3.1`，锁文件不变 | frozen install 退出 `1`，报告 specifier mismatch | 恢复清单后冻结安装退出 `0`，锁 hash 不变 |
| 删除一处格式空格 | `format:check` 退出 `1`，定位 `src/main.ts` | 恢复源码后退出 `0` |
| 插入 `debugger` | ESLint 退出 `1`，`no-debugger` 定位 `5:1` | 删除后 Lint 退出 `0` |
| 把字符串赋给 `number` | TS 7 退出 `1`，TS 6 退出 `2`，均为 `TS2322` | 删除故障声明后双检查退出 `0` |
| 金额除数由 `100` 改为 `10` | domain test `1` 失败、`6` 通过，实际得到 `10.00` | 恢复后 `7/7` 通过 |
| 移除成功分支的过期结果保护 | search test `1` 失败、`4` 通过，旧结果覆盖 fresh 状态 | 恢复取消/generation 条件后 `5/5` 通过 |
| JS 单文件和总预算都设为 `1` 字节 | budget 退出 `1`，gzip `1992` 明确超限 | 恢复 `81920/184320` 后退出 `0` |
| 指向不存在的构建目录 | budget 退出 `1`，报告 `missing build directory` | 指回真实 `dist` 后退出 `0` |
| Vite import 改为不存在的 `./search-missing` | 直接 Vite build 退出 `1`，报告 `UNRESOLVED_IMPORT` 和 `src/main.ts` | 恢复 `./search` 后 Vite 转换 `7` 个模块并退出 `0` |
| 临时进程占用 `127.0.0.1:4173` | Playwright webServer 退出 `1`，报告端口已占用 | 停止本次临时进程后 `7/7` 通过，端口释放 |
| 移除表单 submit 监听 | 场景 2 非零失败并保留 screenshot/trace | 恢复监听、重建后 `7/7` 通过 |
| 本机 API 返回字符串金额 | 页面进入 parser 错误态并显示 `priceCents` | 同一浏览器会话再搜索 `valid`，恢复“台灯：19.90 元”和“共 1 件” |

非法 API 数据恢复的独立命令输出为
`Invalid API data recovery: PASS (string price rejected, valid search recovered)`。故障日志、截图和
trace 只存在于 `/tmp`，没有写入教材。

### 未验证与剩余风险

- 未在托管 GitHub Actions 运行工作流，也未上传远端制品。
- 未从公共 npm registry 清空缓存重装，当前安装复用了本机缓存或既有包源。
- 未验证 Firefox、WebKit、Safari、真实移动设备、VoiceOver、NVDA 或 JAWS。
- 未验证公共 registry 安装、CDN cache headers、Source Map 托管访问策略、生产域名、TLS、
  部署权限、观察窗口和真实前端回滚。
- 本机教学 API 不包含真实认证、对象授权、CSRF、数据库事务、并发预约或持久化。
- 未执行生产数据库迁移、备份恢复、容量和灾难恢复；前端静态回滚不能撤销数据库写入。

这些项目保持为 manual gap 或 environment block，不写成通过。
