# 浏览器扩展课程实际自检

核验日期：2026-10-12。范围仅 `web-fullstack-course/12-browser-extension/**`；
教材仅 Markdown，未修改共享文件、提交、推送、合并、部署或商店上传。
证据分为作者初次正文重建与复审修复后机械重建两轮。初次安装、构建、native/E2E 与候选包
保留原记录；复审轮重新提取当前源码，单独验证类型、测试和产物门，不冒称重新安装或重跑应用。

## 数量与覆盖

| 项目 | 实际数量 |
|---|---|
| 教程 | 24 篇，EX01–EX24，12 章每章 2 篇 |
| 卷级文档 | README、BASELINE、EXTENSION-COVERAGE、SELF-CHECK 共 4 篇 |
| 本卷 Markdown | 28 个；“26 个”只包含教程与 README/BASELINE |
| 每篇结构 | `## 任务卡`、1–13 节、`## 我现在能做到什么`、`## 单元导航`，共 16 个有序二级标题 |
| 覆盖矩阵 | 24 个唯一 ID、§4/6/7/8/10/11 共 144 个显式正文锚点链接 |
| 可重建工程 | EX23 的 19 文件+EX24 的 5 文件，共 24 个 |

[覆盖矩阵](EXTENSION-COVERAGE.md) 包含逐篇机制、源码、集成、错误实验、三类练习答案与验收，
并将蓝图 12 模块映射到实际正文。原生 MV3→WXT/TS/React，Chrome/Firefox 编译主线；
Safari 为明确条件路线，不虚构完成。

## 环境

Node `22.22.0`、npm `10.9.4`、WXT `0.21.4`、React/React DOM `19.3.0`、
TypeScript `5.9.3`、Vitest `5.0.3`、jsdom `29.0.0`、Playwright `1.64.0`。
初次重建时实际 Vite `8.3.4`；Chrome for Testing macOS arm64 `156.0.8078.4`。
顶层依赖固定，传递依赖由初次 npm 生成锁文件，未来复现应使用该个人锁证据。

参考工程：`/tmp/course-extension-20261012`。
初次正文重建并实际运行：`/tmp/course-extension-20261012-rebuilt`。
复审轮最终正文重建：`/tmp/course-extension-20261012-closeout`。
三个目录均在教材仓库之外。初次安装输出 added 190 packages、audited 191、found 0 vulnerabilities；
这只是当时 npm 审计快照，不等于完整安全审计。
复审轮只以 symlink 复用稳定重建目录的 `node_modules`，未执行 install，不声称新的 clean install。

## 本次执行结果

以下表格是作者初次正文重建记录，不包含后来 artifact 白名单修复：

| 命令/检查 | 初次实际结果 |
|---|---|
| `node scripts/extract.mjs COURSE OUTPUT REFERENCE` | extracted 24 files；24 个 SHA-256 全一致 |
| `npm install` | 成功，prepare 生成类型；个人 lock 自动生成 |
| `npm run check` | `wxt prepare && tsc --noEmit` 成功 |
| `npm test` | 1 个文件、11 tests passed；不是旧 9 条结果 |
| `npm run build:chrome` | chrome-mv3 成功，11 文件，240354 bytes |
| `npm run build:firefox` | firefox-mv3 成功，11 文件，240431 bytes |
| `node tests/artifacts.mjs` | 当时两目标均输出 `manifest allowlist + 11 files PASS`；旧脚本未严格拒绝额外文件，已在复审轮补门 |
| `CHROMIUM_PATH=... node tests/native.mjs` | 原生扩展实际安装、popup/message/持久计数 1→2 PASS |
| `CHROMIUM_PATH=... npm run e2e` | 真正安装主线包，五路径及额外断言全部 PASS |
| `npm run zip:chrome`、`npm run zip:firefox` | 仅本地候选成功，无签名/上传 |
| `unzip -l` | Chrome/Firefox 运行包各 11 文件，manifest 在根，无 tests/fixture/native/map |
| 本卷结构/相对链接审计 | 28 Markdown、24 唯一 ID、每篇完整 13 节、围栏配对、310 相对链接/169 显式锚点通过；复审轮再验 |
| 本卷空白/范围扫描 | 无未展开 include，教材无应用产物；`git diff --check` 无报告 |
| 资源清理 | 全部命令已退出；4173 无监听，临时 market-profile/native-market 目录无残留 |

check 的 tsconfig 排除 tests；Vitest 执行测试，不宣称测试文件另做静态类型检查。
相对链接审计不验证外部官方 URL 的即时可达性。未提交新文件不受普通 tracked diff 全覆盖，
因此同时执行本卷文件级结构、围栏、链接和空白扫描。

### 复审轮结果与日志

命令运行目录为 `/tmp/course-extension-20261012-closeout`，
完整 stdout/stderr、退出码及结构化哈希保存于 `/tmp/extension-closeout-evidence-20261012`。
执行入口为 `node /tmp/extension-closeout-20261012.mjs`；它使用新建空目录，拒绝覆盖已有目录。

| 命令/检查 | 实际结果 | 日志文件 |
|---|---|---|
| `node /tmp/extension-closeout-evidence-20261012/extract.mjs /Users/bytedance/Documents/my-demo/github/web-code-docs/web-fullstack-course/12-browser-extension /tmp/course-extension-20261012-closeout` | 24 文件与最终 EX23/24 字节一致；23 个匹配稳定参考，仅 artifact 脚本不同 | `01-extract.log`、`sources.json` |
| `npm run check`、`npm test` | check 通过；基础 1 文件 11 tests passed | `02-check-base.log`、`03-test-base.log` |
| 从 EX19 原样复制至 `tests/sink.test.ts` 后 `npx --no-install vitest run tests/sink.test.ts` | 1 test passed；未把它加入 24 文件 Capstone 契约 | `04-test-sink.log` |
| 再次 `npm run check`、`npm test` | check 通过；2 文件 12 tests passed | `05-check-with-sink.log`、`06-test-all.log` |
| `node tests/artifacts.mjs` | Chrome/Firefox 均 manifest 白名单及严格 11 文件通过 | `07-artifact-normal.log`、`12-artifact-restored.log` |
| 双目标新增 `tests/should-not-ship.txt` | 旧门退出 0；新门退出 1，`unexpected file count` | `08-*-extra-old.log`、`09-*-extra-fixed.log` |
| 双目标将合法 CSS 换成 `assets/not-allowed.css`，仍为 11 文件 | 旧门退出 0；新门退出 1，`unexpected file assets/not-allowed.css` | `10-*-replacement-old.log`、`11-*-replacement-fixed.log` |
| `unzip -Z1` 与逐文件 `unzip -p`/SHA-256 | 两运行 zip 各 11 文件，全部与已过新门的产物字节一致；sources.zip 另审 | `13-*-zip-list.log`、`results.json` |
| `node /tmp/extension-heading-audit-20261012.mjs` | 24 篇每篇 16 个有序二级标题、连续导航；55 个既存围栏字节不变 | `/tmp/extension-heading-baseline-20261012.json` |
| `node /tmp/extension-final-audit-20261012.mjs`、`git diff --check` | 28 Markdown、310 相对链接、169 显式锚点、24 源码 hash 全一致；教程仅三处标题变换，无额外产物或空白错误 | `final-audit.log`、`final-documents.json` |

污染仅施加于独立副本，每例 `finally` 清理/恢复；结束后两目标共 22 个文件哈希全部恢复，
稳定参考工程和三个旧候选 zip 未改动。未启动 browser、fixture 或 profile；
不需要因 artifact 门的最小改动重跑 build/native/E2E，19 个 EX23 应用文件均未变化。
复审轮未执行 lint 命令，使用 `check`、围栏/结构/相对链接/文件空白检查和 `git diff --check`；
测试静态类型、跨平台及宿主 UI 的未验证边界仍保留。

## 测试断言

11 条测试：公开 Item/foreign origin/额外字段/负价格；消息版本/schema；sender/frame/origin/UI；
迁移幂等/坏版本/重复 ID；公开 DOM 文本；并发写；写失败队列恢复与删除；
新 repository 恢复与过期；删除后 prune 不创建 key；第 101 项拒绝且原 notes 保留；
精确保留边界与再多 1ms 删除。
复审轮额外运行 EX19 的 1 条 sink 测试：markup 形状标题经 `textContent` 后不生成 img。
其源码 SHA-256 为 `4c7fca5b6f59fa89ea7f0d3a8199e08f2522dc74b9dfe6c2a9cbbf8e94a076f1`；
它是个人工程增量测试，合并套件 12 passed，EX23/24 机械提取基线仍是 24 文件、11 条 domain 测试。

```text
P1 public read + text sink PASS
Content isolated injection + iframe exclusion + SPA + real sender rejection PASS
P2 save + options synchronization PASS
P3 worker termination + storage recovery PASS
P4 user export PASS
P5 confirmed deletion + durable empty state PASS
Keyboard focus + deletion confirmation + alarm registration PASS
Installed Chromium extension; five paths PASS
```

自动化调用真实 CDP action 获得 activeTab，然后在 tab 测相同 popup bundle；
不声称宿主 popup 尺寸、点击外部关闭、全焦点行为已验。
P3 是 CDP 强制停止后消息重建，不是自然空闲/睡眠测试。
P4 检查用户按钮触发下载与文件名，不冒称导出内容另做了完整验收。
alarm 注册对象与注入时钟保留测试已验；真实时间周期清理未等待验证。

## 修复与失败证据

- WXT runtime registration 仍生成必选 host：源 config hook 删除，双 manifest allowlist 守护。
- options 标签页带 sender.tab：以实际扩展 base+固定 path 授权，不错误禁用 tab。
- SPA 初始 sender.url 与当前路径不同：校验文档 origin、current sender.tab.url 并 tabs.get 复核。
- fixture iframe 递归：限制一层，保留顶层/iframe 排除实验。
- 删除后 alarm 重建空 key：prune undefined guard；单测 writes=0、E2E durable={}。
- v1 重复 ID：新增断言先实际失败（11 条中 1 failed），补迁移重复校验后 11 passed，
  当前正文重建工程再次 11 passed。拒绝坏数据，不静默去重或清空。
- 产物扫描 URL 正则误报：限制 URL 字符边界后复验，不允许真实远程代码。
- 两类官方外链 404：EX01 改为 `extensions/develop#core-concepts`，EX19/24 改为
  `extensions/how-to/test/end-to-end-testing`；替代页面 HTTP 200，分别核对核心概念锚点与端到端测试标题。
- sidePanel 动作链：effect 缓存 windowId、按钮直接调用；源码编译通过，宿主开启未冒称实测。

### 复审修复记录

复审 `review29ce3dfd` 初始为 HOLD：1 BLOCK、3 WARN。
已核实的修复及复验如下，不把本轮验证当作独立审查放行：

- EX19 sink 实验位于 `tests/sink.test.ts`，使用 `../shared/domain` 并与 tests 排除配置一致；
  修复后单独 1 passed、合并 12 passed，生产 check 通过，不宣称 tests 静态类型通过。
- EX24 产物门增加相对路径、6 个固定文件、5 个生成文件名称模式和 11 总数约束；
  两目标正常通过，两种污染各在两目标被拒绝；旧门接受相同污染的失败证据已保存。
- EX21 区分运行包各 11 文件与另审的 sources.zip；本轮逐文件复验运行 zip，
  明确 sources.zip 缺完整单测且仍含旧 artifact 门，不能作为最终完整验收源码。
- EX01–EX24 三处标题机械归一；正文、链接和 55 个代码围栏无其他字节变化。

修复完成且定向验证通过；独立定向复审结论为 `PROCEED`，
原测试路径阻断及文件白名单、zip 分类、治理标题三项问题均已关闭。

## 源码 SHA-256

以下 24 个值全部对应最终 EX23/24 正文与复审轮提取工程，不含生成锁/产物。
其中 23 个与稳定参考工程一致；唯一变化为 `tests/artifacts.mjs`：
旧值 `78c6ce9c47c3583c6ae8f69c93543efaba4ffa7eeaacf404c47a865348818e5b`，
新值见表；标题归一未改变提取源码字节。

```text
3ec3d70db85755db43d1a8987cebea9a5ba0672e9001d5cf28ca7050e61e08b2  package.json
36de54b1dff94de0189d492361655d8145de66b99ea7df229839fa1742ac74fd  tsconfig.json
f063c94c89d8626fc9fcb0e930e1479973fa421525b56c7f7c5aa1632ac1c0e3  wxt.config.ts
852da9d90f8c56ac305137da083fb278f45d3816b26a1d667a42ee7fd22713ab  shared/domain.ts
402f52923c86417007dc906b083d13f362025fd82d85c160bf9ed4de31718247  shared/App.tsx
5b7169c4f3747482c0f2347133002ddc712ceacb8f54d64bd0703f9dfb2ebd1e  shared/ui.css
16f70b973233b25f2c6843c3224eae3e738949b6f4808a4ad09a771f854f8c3d  entrypoints/background.ts
453d263ae30094e7eda126ae71a838b8af5c08462e4bd337158f3bed5e177b2f  entrypoints/market.content.ts
a28963c3f03e57251cc321e564f0d4baa1904c0f277094964b3f7c7bf875ae80  entrypoints/popup/index.html
d3966153ec28a4dba01510790ab3f83fc59cd439eec5255a4f4df4ce91a1e4d0  entrypoints/popup/main.tsx
845a8f3fe0a28396c745685a89943f1ab2d64f85a72858a66ef7b2fadfa35661  entrypoints/options/index.html
9441629a63ae359ea661a1881e6a364097bbca6cb29fbbb7093e7cf587b9e56e  entrypoints/options/main.tsx
e0f71c26f71a69bd3a1b1fa17215352c313802bf9964bf72ca6bfda6f2760a18  entrypoints/sidepanel/index.html
f4870b1d308b1c182c830db3989cf10ee7039f52eba982b82e8106a52e0b9a7b  entrypoints/sidepanel/main.tsx
d62d11242f3303cf40525462574e5d4368b1697ef5d71f6932f0d6e531c1b930  fixtures/server.mjs
1a09ac9c940b555b2c32dced6f725025ca17de6d60843aaeb136d57514c241e1  native/manifest.json
6538dcb272abb023de464818683300ad8ffcd530daf1dc5af0c492119f41149d  native/worker.js
0161741b50bcee87528ca42ff0c17948e4a4a8ee237b9ade210280b0bd05180a  native/popup.html
2401f6129c6aa27cdb4eac1aa2320740446f73e15a19d3adc7b6de2603cd5099  native/popup.js
7523af18247464ad03baa9fbf9fd6d7dd2ebc492103405dd121122e9465ff169  tests/domain.test.ts
762321563380143e9c577e62144623019277ee7dc183ce78c6c22dfd6d66900b  tests/artifacts.mjs
7095f81e8026e64ea37eef7c614d60e792bf85e20501d0411e527673115b8958  tests/native.mjs
bef1b759985ae91fdcd05a9272149eeb7cc988a11833a2abd46022e3ec8875e9  tests/browser.mjs
e2875a06f242820112d5a780c5ca2068a32a22b368f3543535224724b37872f1  scripts/extract.mjs
```

## 本地候选摘要

下列是作者本轮初次正文重建产物，位于 `/tmp/course-extension-20261012-rebuilt/.output/`；
后来只对 artifact 门做最小变更验证。本轮实测三份 zip 与 lock 的旧摘要均未变，没有重建源码 zip。

| 初次候选文件 | SHA-256 |
|---|---|
| Chrome zip，77652 bytes | `daf855f27b63b81d5c3501d1eb30591355979deae1a7e48b5161ae0fef0d74cd` |
| Firefox zip，77681 bytes | `9112220762fb6e48747791ced5d935a52490856b7f9373ed7e824531046e0030` |
| WXT 自动 sources.zip，44107 bytes | `c1e5d86ef7900fd1e54061d2efb459dd4795b15105dbc58bab8fd0e1fe3b3e30` |
| 个人生成 package-lock.json | `a59a0d8917bcf0afdd58b26667bfa9d3f5c80e8617f87a6cc725a2db860b6230` |

运行包各 11 文件；sources.zip 是另一种档案，含 24 文件（包括 lock、fixture/native/部分测试）。
WXT 默认 sources.zip 未包含 `tests/domain.test.ts`，所以不能当完整验收源码；
其中 `tests/artifacts.mjs` 仍是上面列出的旧 hash；不冒称档案已包含最终白名单修复。
完整 24 文件以最终 EX23/24 正文和上面 hash 为准，EX19 sink 为另一个增量实验。
源码档案不是安装包，不应按运行包“零 tests”规则审它。
包摘要只绑定初次产物，不承诺未来 npm 重新解析的传递依赖字节相同。

## 未验证与剩余风险

- 独立定向复审尚未给出放行；复审轮未重新 install/build/native/E2E/zip，旧 sources.zip 未更新。
- Firefox/Edge 实际安装、同五路径、permission/sidebar/storage 访问差异；目前仅 Chrome/Firefox 编译通过。
- Safari macOS/iOS/iPadOS：无完整 Xcode，转换、签名、容器、启用、真实安装与商店全部未验。
- 工具栏 popup 宿主大小/关闭/完整焦点、Chrome sidePanel 开启、系统权限同意/拒绝/撤销弹窗、
  屏幕阅读器、缩放/高对比度、Windows/Linux 未完整运行。
- EX02 world 控制台探针、EX15 公开 fetch/CSP 错误实验未逐一自动运行；有完整读者复做步骤。
- 保留实际 alarm 周期、自然空闲/睡眠、真实坏 profile/升级卸载、导出文件内容未另做平台验收。
- 业务 200000 UTF-8 bytes 防线存在，100 项和字段限制使本套正常输入更早受限；未宣称字节极限实测。
- 商店签名、账号、审核、驳回、灰度、上架/下架与外部写操作未执行；本地回环只是教学候选。
- 旧注入脚本撤权后需刷新；DELETE 不撤 host、不删导出/备份；local 不加密，关闭浏览器不保证准点保留删除。

[卷入口](README.md) · [版本与业务基线](BASELINE.md) · [逐篇覆盖](EXTENSION-COVERAGE.md)
