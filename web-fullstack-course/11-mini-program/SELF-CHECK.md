# 小程序卷实际自检

验证日期：2026-10-12。范围仅本卷，24 篇正文 + README/BASELINE/覆盖矩阵/本文件，
合计 28 个 Markdown 文件。蓝图 12 模块内容覆盖；平台交付证据不等于内容覆盖。
正文结构为任务卡、1–13 节、能力总结、上下课及卷 README 导航。

## 提取与复建

仓库仅存 Markdown，未在仓库安装、运行、生成锁文件或产物。实际工作根
`/tmp/course-mini-followup2-20261012`，最终项目 `final/final-rebuild/`，
独立实验 `final/labs/MP-*/`。本轮原文快照在 `before-markdown/`，
修前实现与新增失败测试机械提取在 `before/`。前轮历史根为
`/tmp/course-mini-blockfix-20261012`，独立复审证据在 `/tmp/course-mini5-review-20261012`。
脚本从最终正文的“完整文件”代码围栏机械提取，不用预先编写的应用替代教材。

- 核心 Capstone 32 文件：MP-23 五文件、MP-24 二十四文件、MP-15 三个图片文件。
- 全卷扩展 TS/TSX 与核心合并为 39 文件，包含网络、幂等、草稿、通知、配置和组件测试。
- 同名完整文件比较内容一致；MP-06 的预加载配置属于独立替换实验，
  最终项目保留 MP-24 的隐私声明与默认包图。
- 原生实验与独立 Node 实验单独提取，不能将多个 app.json 覆盖进 Taro 项目。
- 客户端隔离测试复制最终 client/domain/request/storage/service 原文，仅替换 platform IO；
  每测试独立目录 finally 清理，不修改客户端实现以获得通过。
- 页面操作测试 TypeScript react-jsx 转译实际 Publish/Detail，仅替换 Taro IO/hook/组件导入，
  react-test-renderer 驱动真实输入、按钮和 show 回调；不镜像业务实现，不证明平台运行。

实际命令：

```bash
cd /tmp/course-mini-followup2-20261012
MINI_WORK=/tmp/course-mini-followup2-20261012/final \
  node /tmp/course-mini-blockfix-20261012/verify-docs.mjs extract
cd final/final-rebuild
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build:weapp
npm run build:tt
npm run build:alipay
```

前轮直接依赖安装日志为 added 1150 packages。本轮从空目录提取后仅复用前轮生成的
package-lock，干净 npm ci 日志为 added 1151 packages in 9s，退出成功。
前轮安装日志在 `/tmp/course-mini-blockfix-20261012/pre-refresh/final-install.log`，
本轮干净 ci 在 `final/final-ci.log`；最终安装未复用旧 node_modules。
Node `22.22.0`、npm `10.9.4`；具体冻结依赖见 [BASELINE](BASELINE.md)。
最终 package-lock SHA-256：
`76c49bf203277c99a8d8609bafc94f1d7a4198d3166b2301183c77fcf06075b5`。
该锁文件只在练习目录，不纳入教材仓库。
项目源码清单（相对路径、bytes、SHA-256 排序后 JSON）SHA-256：
`8e60a8030a8c2bd78e36c5cc6cd7a058a0934c05fe8b8e9dec57b9238efadc42`。
正文文档清单 SHA-256（27 个 Markdown，排除本自检以避免自引用）：
`7b138efeaa5104d84ebf2e27f7d31b3d34c0fad02c5d007cd9108291a585d99f`。
详细逐文件摘要与原文比较结果在 `final/source-consistency.json`。

## 运行结果

| 检查 | 实际结果 | 证明边界 |
| --- | --- | --- |
| npm run typecheck | 通过，tsc --noEmit 无诊断 | 最终 39 文件严格类型 |
| npm test | 47/47，fail/cancelled/skipped 均 0 | 原 39 保留，新增发布生命周期 8 项 |
| 原始测试独立复跑 | 39/39，fail/cancelled/skipped 均 0 | 十个原测试文件，未改断言 |
| 核心 Capstone test | 36/36，fail/cancelled/skipped 均 0 | 原核心 28 + 发布生命周期 8，六个测试文件 |
| 原独立复审边界复跑 | 6/6，fail/cancelled/skipped 均 0 | 只读原复审测试，另计，不混入正文 47 项 |
| 独立 Node test | 17/17，fail/cancelled/skipped 均 0 | 资源所有权、code 交换、session、文件、能力、平台策略、证据、包审计、回退 |
| node labs/MP-05/route.mjs | route assertions: 5 passed | ID 与详情路径，不是平台返回栈 |
| build:weapp | Compiled successfully in 2.69s | 最终微信目标模板/脚本/样式构建 |
| build:tt | Compiled successfully in 2.31s | 最终抖音目标构建 |
| build:alipay | Compiled successfully in 2.39s | 最终支付宝目标构建，真实 authCode 未接 |

独立测试命令：

```bash
cd /tmp/course-mini-followup2-20261012/final
node --test labs/MP-02/*.test.mjs labs/MP-09/*.test.mjs \
  labs/MP-10/*.test.mjs labs/MP-12/*.test.mjs labs/MP-14/*.test.mjs \
  labs/MP-18/*.test.mjs labs/MP-20/*.test.mjs labs/MP-21/*.test.mjs \
  labs/MP-22/*.test.mjs
node labs/MP-05/route.mjs
```

原始 39 项包含既有 3 条实际客户端测试：撤销等待期间即时失效、
逐项清理失败禁止新登录、旧会话恢复 404 不以新身份提交。
React 组件 2 项使用 renderToStaticMarkup 渲染实际 ReservationLabel，
不冒充 Taro 平台渲染或交互测试。
前轮新增 recovery 13 项：发布回执与清理重试、页面重挂载、坏回执禁止覆盖、重复退出/重启、
清理日志写失败、返回保留编辑、图片合并/最新选择/会话代次、确定拒绝显式结束、
未知命令同键恢复/不可结束/重试冲突仍未知、结束后等待最新详情再允许 POST。
本轮新增 publish-lifecycle 8 项：在途重挂载单 POST、新模块恢复卸载成功回执、
跨身份迟到成功归原 owner/不改新 UI、未知态跨点击/重挂载/退出/重启保持锁、
操作标记写失败零 POST、卸载成功回执写失败同进程恢复、坏标记失败关闭、
下一草稿须确认删除标记与回执。核心子集另运行
`npx tsx --test tests/contracts.test.ts tests/client.test.ts tests/upload.test.ts tests/view.test.tsx tests/recovery.test.tsx tests/publish-lifecycle.test.tsx`，
结果 36/36。最终正文与提取项目逐字比较：41 个源代码围栏对应 39 个唯一项目文件，
19 个独立 Node 文件也逐字一致；没有通过放宽 parser/断言或修改提取源码获得绿灯。

## 产物与预算

从最终 dist 读取每文件 bytes/SHA-256，排序后对 manifest 再哈希。
主包指非 packages/ 文件，分包为 packages/；这是 raw bytes，不是平台压缩上传大小。
教学主包 2 MiB、分包 1 MiB、总量 5 MiB 三门均通过，
MP-06 的更保守 1.5 MiB 主包预警也未触发。

| 平台 | 文件数 | 主包 bytes | 分包 bytes | 总 bytes | 实际项目配置 |
| --- | --- | --- | --- | --- | --- |
| 微信 | 32 | 345572 | 14949 | 360521 | project.config.json |
| 抖音 | 29 | 287765 | 14913 | 302678 | project.config.json |
| 支付宝 | 30 | 293773 | 14901 | 308674 | mini.project.json |

manifest SHA-256：

- 微信：`ce767937c6a7a83a2d3d5e2c05573d6dbfa0851917be4868289adcbcab0167da`
- 抖音：`a6aedddf95d80ce71436ff7625d5e30f40d5b362739a548c046f6e491c73154e`
- 支付宝：`cf2438443eea34216c79203cc8cb2648912d2815dc69062dae562975ab9d9f8b`

产物有三主包页面、两分包页面、公共 runtime/vendor 与相应模板/样式。
检查了 app.json 的 pages/subPackages 与微信 requiredPrivateInfos；
不把某源码布尔配置是否保留到输出，当作平台分享已实测。
图片选择的 inspectImages 已进入实际 platform 调用图，上传控制器不在默认 demo 自动发请求。
三平台输出未包含 react-test-renderer 或测试夹具字符串，dev 测试依赖未进入运行包。

```bash
cd /tmp/course-mini-followup2-20261012/final/final-rebuild
node ../labs/MP-21/package-audit.mjs dist/weapp
node ../labs/MP-21/package-audit.mjs dist/tt
node ../labs/MP-21/package-audit.mjs dist/alipay
```

日志与证据位于 `final/`：`final-ci.log`、`final-typecheck.log`、
`final-tests.log`、`final-build-{weapp,tt,alipay}.log`、
`artifact-{weapp,tt,alipay}.json`、`extraction-manifest.json`、`docs-audit.json`、
`final-core-tests.log`、`final-independent.log`、`final-route.log`、
`source-consistency.json`、`artifact-summary.json`、`original-39.log`、
`review-boundaries.log`、`verification-results.json`、`final-extract.log`。

## 修复与失败证据

1. 早期独立 7 条合同测试先以稳定未实现行为红灯（0/7），恢复完整领域/parser/服务后 7/7；
   这是早期历史证据；前轮最终扩展项目为 39/39，本轮保留原 39，再加 8 得到 47/47。
2. 初次 Taro 编译缺 Babel React/TS preset，已在最终 package 清单补齐精确依赖。
3. Taro 4.3 subscribe Option 同时要求微信/支付宝字段；改为明确微信原生 typed wrapper，
   检查逐模板结果，不塞 entityIds、不关闭 strict。
4. Reservation transition 的字面量被扩大为 string，显式类型修正并复验。
5. 最终 upload-platform 的 getFileInfo 成功/失败联合类型使 size 直接访问报 TS2339；
   已修改 **Markdown 正文**，先检验 `"size" in file` 与 number，再机械提取，
   tsc 无诊断且三平台重新 build。
6. Capstone 修正即时本机退出、逐项清理、旧账号 404 恢复拒绝、草稿读失败先清界面、
   图片回调 epoch；新增真实 client 测试。
7. 补详情分享页面配置、实际文案组件、默认图片元信息预检；三平台产物按新源码复建。
8. 已替换失效 Taro React/Storage/login/subpackage 外链，
   使用核验的 Hooks、setStorageSync、login、应用配置与微信分包细页。

前轮 5 个独立 review P1 修复的原文失败证据位于
`/tmp/course-mini-blockfix-20261012` 工作根 `red-confirmed.log`：
7 项测试中 6 个真实业务红灯、1 个未知同键恢复对照绿灯。修前源文从 `before-markdown/`
机械提取；最初 JSX 夹具配置错误单独保留，未计作业务红灯。
修前重复发布复现另存 `red-duplicate-publish.log`：清理失败后连续点击实际 POST=3，
创建商品=3；最终 recovery 保持 POST=1，清理重试不创建商品。
补测坏回执覆盖风险红灯在 `red-edge.log`（10/11）；结束拒绝后未等待回读的红灯在
`pre-refresh/red-refresh-boundary.log`（POST 1，预期 0）。
修复后最终 13 项 recovery 全部通过：收到 publishedId 不再 POST，清理独立重试；
待清理 owner/key 持久保留且全部确认才解锁；同会话返回保留编辑；
图片按最新 draft/generation/epoch 合并；首次确定拒绝显式结束后新 begin，
未知命令不自动重试、不换新键，也不因重试冲突升级为确定拒绝。

本轮两条发布生命周期 P1 的失败证据来自独立复审
`/tmp/course-mini5-review-20261012/review-boundaries.log`，并在本轮
`red-publish-lifecycle.log` 以真实页面组件操作复现：新增 8 项全部为业务断言红灯。

| 生命周期阻断 | 修前证据 | 最终证据 |
| --- | --- | --- |
| 在途卸载重挂载 | POST=2、created=2 | POST=1、created=1，新挂载订阅成功回执并保持提交锁 |
| 卸载后成功回执未落盘 | receipt=null、draftPresent=true，正常 storage 未尝试写回执 | receipt={id:listing-2,cleaned:false} 持久保存，新模块显式清理/登录后恢复 |

最终日志 `final/final-tests.log` 包含两条业务快照，正文新增 8 项全部通过；
`final/review-boundaries.log` 原独立复审 6 项全部通过，未改原测试。
成功回执在 parser 中先按捕获 owner 保存，再受 api 会话代次检查；
正常存储下卸载或切换身份不跳过写入，旧回调不改新 UI 或清理新草稿。
pending/unknown 使用 owner 单草稿槽 holder 与持久操作标记，未知态不开放新 POST；
标记退出不删除，重启仍阻塞。holder 最多 16 owner，不驱逐在途或未持久成功，
页面监听卸载即删除；显式下一草稿须确认删除操作标记与回执。
回执磁盘写失败与正常存储卸载是不同边界：前者保留同进程成功及持久未知标记，
后者已验证 publishedId 可持久恢复，不能用磁盘失败风险说明替代修复。

最终定向独立复审为 `PROCEED`，两项生命周期阻断均关闭。原六边界 6/6、
正文生命周期 8/8、补充独立检查 8/8；五组双进程探针共十个阶段全部通过。
仅通过 StorageIO JSON 交换磁盘快照，不共享模块 holder：成功回执可恢复，
未知态重启后新增 POST 为 0。此证据不代替平台 storage 与真机生命周期。
完整结论在 `/tmp/course-mini-publish-final-review-20261012/directed-conclusion.md`。

安装有上游 deprecated 警告，例如 inflight、glob、eslint 8、webpack-chain；
没有擅自 overrides、升级框架或忽略类型来清除警告。本次未做完整供应链漏洞审计，
不把“不执行 npm audit”描述为依赖安全。

## 文档与范围

本卷检查脚本验证 24 个唯一 MP ID、每篇完整 1–13 节、144 个指定 s* 锚点、
README 直接链接、相邻导航与卷返回、Markdown 围栏和所有本卷相对链接/片段目标。
共享文件作为链接目标只读；不生成旧章入口。
本卷相对链接检查不包含全部外链内容验证；外链统一复验属全库检查，
本卷不宣称已逐个验证所有外部页面内容。

```bash
cd /tmp/course-mini-followup2-20261012
MINI_WORK=/tmp/course-mini-followup2-20261012/final \
  node /tmp/course-mini-blockfix-20261012/verify-docs.mjs
node check-final.mjs
git -C /Users/bytedance/Documents/my-demo/github/web-code-docs \
  diff --check -- web-fullstack-course/11-mini-program
```

最终 290 条相对链接、154 条片段链接零错误；没有源码文件、node_modules、lock、dist 或日志进入仓库。
git diff --check 无报错。卷内处于未提交状态，
未 commit/push、未修改共享文件，未执行发布或部署。
本卷整体未跟踪，额外以修前快照逐文件 `git diff --no-index` 对比并检查空白错误；
准确差异在工作根 `mini-exact.diff`、`mini-diff-summary.json`，本轮仅 3 个本卷 Markdown
变化：MP-24、README、SELF-CHECK。前轮 7 文件历史快照与日志保留，不混作本轮范围。

## 未验证与剩余风险

| 项目 | 实际限制 |
| --- | --- |
| 微信工具 | 本机有 2.01.2510290，CLI --help 可读；未导入最终项目、未验证账号授权与基础库 |
| 微信账号/真机 | 使用 touristappid 构建；无本次任务授权的真实 AppID/测试账号/设备证据 |
| 抖音 | 本机 Applications 未见独立抖音工具；无授权 AppID/测试账号/真机证据 |
| 支付宝 | 未见独立支付宝工具；空 AppID，真实 authCode/订阅未接，无账号/真机证据 |
| 真实网络 | TLS、合法域名、平台超时/取消、真实弱网与上传未验证 |
| 身份与后端 | 上游替身/内存 service 不证明平台交换、持久消费记录、数据库事务、对象存储或多进程并发 |
| 权限与媒体 | 实际隐私弹窗、系统拒绝/设置、相机、文件配额、真实图片解码与服务端二验未验证 |
| 订阅 | 未请求真实测试模板或发送消息，未验 outbox/延迟/用户打开 |
| 发布 | 未预览/上传/提审/灰度/回退；无二维码、审核或正式 revision 证据 |
| 发布恢复 | 当前发布端点无服务端幂等/按命令查询；未知标记阻止新 POST，须原账号人工或业务恢复核对。正常存储卸载成功回执已验证可持久恢复；回执磁盘写失败仅同进程保留成功知识，崩溃后只能恢复未知标记 |
| H5 | 仅策略降级对照，无完整 H5 插件/认证构建，不作平台验收 |

教学验收已覆盖源代码与可运行实验；蓝图要求的真实微信首发、第二平台真机、
真实后端和发布必须在授权条件下补证。准确保留这些缺口，不将 Node 替身或三平台
build 转成真机、账号、隐私审核或生产可靠性通过。

[返回本卷](README.md) · [技术基线](BASELINE.md) · [全篇覆盖](MINI-PROGRAM-COVERAGE.md)
