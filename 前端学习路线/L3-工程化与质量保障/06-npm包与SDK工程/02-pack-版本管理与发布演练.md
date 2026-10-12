# pack、版本管理与发布演练

<!-- course-meta:start -->
> - 层级：L3
> - 先修：[消费者契约](./01-exports-类型声明与消费者契约.md)、[SemVer 与锁文件](../../L1-JavaScript与TypeScript/05-模块化与包管理/05-SemVer-锁文件与依赖排障.md)
> - 建议用时：180 分钟
> - 一手资料：[npm pack](https://docs.npmjs.com/cli/v11/commands/npm-pack)、[可信发布](https://docs.npmjs.com/trusted-publishers)、[Changesets](https://github.com/changesets/changesets)
<!-- course-meta:end -->

## 学习目标

- 能检查实际 tarball 内容，并在干净消费者验证。
- 能区分版本号、dist-tag、来源证明与实际安全。
- 能设计不依赖长期个人凭据的发布流程和恢复方案。

## 内容讲解

### 1. 本地打包流程

本课无需真实发布。保留练习包 `private: true`，在包目录运行：

```bash
npm pack --dry-run --json --ignore-scripts
npm pack --ignore-scripts
```

第一条查看拟包含文件，第二条产生 tgz。`--ignore-scripts` 用于这个不需要构建的纯 JS 练习；真实需要构建的包应先完成受控构建，验证 tarball 中包含产物。

在另一个空消费者目录运行 `npm init -y`，再安装实际输出的 tgz 路径：

```bash
npm install ../atlas-title-lab/atlas-title-lab-0.1.0.tgz --ignore-scripts --no-audit --no-fund
node --test consumer.test.mjs
```

文件名以 pack 输出为准。验收禁止用 workspace symlink 或源码路径代替 tarball，因为链接可能隐藏漏打包文件。

### 2. 包内容审查

显式 `files` 白名单比默认打包整个目录更容易审查。仍需检查始终包含项、子目录忽略规则和实际输出，不要以“.gitignore 有写”就断言文件不会发布。

包中应包含实现、声明、说明、必要许可证与运行资源；不包含 `.env`、真实测试数据、内部地址和无关大文件。检查 sourcemap 是否暴露不应分发的源码。

### 3. 版本与渠道

patch 修复兼容问题，minor 新增兼容功能，major 表示破坏兼容。更改 exports、默认行为、错误码或声明文件可能破坏消费者，不能只按新增代码行数判断。

`1.0.0-beta.1` 是预发布版本，`beta`/`latest` 是指向版本的 dist-tag。移动 tag 不改变已发布内容，也不能自动让所有锁文件消费者回退。

Changesets 可记录每个包的变更级别和原因，再生成版本与 changelog。多包发布还需根据包间依赖传播兼容影响；不要只修改根版本。

### 4. 发布流水线

```text
消费者测试 → 构建 → tarball 检查 → 类型/运行时验证
→ 人工或受控发布门禁 → registry 发布 → 独立安装验证
```

registry 发布是外部写入，教程仅设计流程。执行前需确认包所有权、许可证、版本、目标 registry、权限和来源。

优先使用 registry 支持的 OIDC 可信发布，在支持范围内配置包与 CI 仓库身份关联。来源证明可帮助验证构建来源，不能证明源码无恶意。具体 Node/npm/CI 支持范围以官方文档为准，不在这里写死不经验证的最低版本。

### 5. 事故恢复

包版本通常不能原地覆盖。发现错误时停止后续发布，评估 deprecate、修复版本和 tag 调整；不要依赖随时 unpublish，registry 有时限与依赖限制。

恢复要验证两类消费者：固定版本安装和跟随 tag 的安装。安全事故同时检查凭据撤销、受影响版本、依赖路径和公告内容。

## 常见问题

**npm pack 与 publish 是否完全相同？** 核心打包相关，但生命周期与 registry 写入不同；dry-run 不等于真实消费者已经安装成功。

**加 provenance 就不会供应链攻击吗？** 不会；仍需代码审查、权限控制、依赖验证与产物审计。

## 实操作业

1. 基础：完成 tarball 安装与消费者测试，记录包内文件。
2. 进阶：移除声明文件后验证类型消费者失败，再修复。
3. 挑战：写一个 0.1 → 0.2 → 1.0 的变更方案，包含兼容影响、渠道和事故处理。

### 参考答案与验收

干净消费者通过才能证明打包可用；types 漏失必须被类型检查抓住。破坏公开导入路径需评估 major；恢复记录应说明已锁版本不会因 tag 移动自动改变。

<!-- atlas-task:start -->
## Atlas 项目任务

交付 Atlas SDK 的本地 tarball、独立消费者和发布 Runbook。本课不要求远端发布。见 [L3 里程碑](../../projects/atlas/milestones/L3.md)。
<!-- atlas-task:end -->

---

## 本节小结

发布前验证实际产物和消费者，发布后按不可覆盖的版本管理恢复。

<!-- course-nav:start -->
---

[上一篇：exports、类型声明与消费者契约](./01-exports-类型声明与消费者契约.md) · [课程地图](../../README.md) · [下一篇：01 App Router 与文件约定](../../L4-全栈与服务端/01-Next.js全栈框架/01-App-Router与文件约定.md)
<!-- course-nav:end -->
