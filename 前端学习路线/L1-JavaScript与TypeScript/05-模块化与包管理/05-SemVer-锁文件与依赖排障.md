# SemVer、锁文件与依赖排障

<!-- course-meta:start -->
> - 层级：L1
> - 先修：[npm 与生命周期](./04-npm-package-json与脚本生命周期.md)
> - 建议用时：150 分钟
> - 一手资料：[SemVer](https://semver.org/)、[npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci)、[package-lock](https://docs.npmjs.com/cli/v11/configuring-npm/package-lock-json)
<!-- course-meta:end -->

## 学习目标

- 能计算常见版本范围，理解声明范围与实际安装版本的区别。
- 能用可重复安装定位 peer 冲突、重复实例和幽灵依赖。
- 能进行最小依赖升级并验证消费者。

## 内容讲解

### 1. 版本范围

| 声明 | 正式版本的主要范围 |
|---|---|
| `1.2.3` | 只允许该版本 |
| `~1.2.3` | `>=1.2.3 <1.3.0` |
| `^1.2.3` | `>=1.2.3 <2.0.0` |
| `^0.2.3` | `>=0.2.3 <0.3.0` |
| `^0.0.3` | `>=0.0.3 <0.0.4` |

预发布版本有额外匹配规则，不能直接套正式版本范围。SemVer 是作者的兼容承诺，不能证明升级没有 bug；类型、性能、平台与边界变化都需要验证。

### 2. 声明与解析树

package.json 保存依赖范围；锁文件记录实际解析版本及来源等信息；node_modules 是某次安装后的磁盘布局。这三个对象不能混为一谈。

一个项目按约定使用一种包管理器与对应锁文件。pnpm workspace、npm workspaces 的协议和布局不完全相同，不能把 `workspace:*` 原样复制给所有 npm 版本。

| 动作 | npm 项目 | pnpm 项目 |
|---|---|---|
| 增加依赖 | `npm install 包名` | `pnpm add 包名` |
| 重复安装 | `npm ci` | `pnpm install --frozen-lockfile` |
| 原因追踪 | `npm explain 包名` | `pnpm why 包名` |
| 依赖列表 | `npm ls` | `pnpm list` |

`npm ci` 要求已有匹配锁文件，失配时失败，安装前会移除当前 node_modules，并且不更新 manifest/锁文件。只在可重建的练习或 CI 目录中实验。

### 3. 锁文件失配实验

在上课的独立练习包执行 `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`，由工具生成锁文件。给 manifest 增加一个未锁定依赖，再执行 `npm ci --ignore-scripts --no-audit --no-fund`。

预期失败，说明冻结安装没有擅自替你补齐锁文件。随后按正常依赖变更流程运行 npm install 更新锁文件，再审查 diff。此实验若接触 registry，应使用受信任来源且不要执行不明安装脚本。

### 4. 排障顺序

1. 记录 Node/npm/pnpm 版本、失败命令和错误码。
2. 确认 registry、代理与项目配置来源；不要输出含凭据的 `.npmrc`。
3. 使用 explain/why 确认谁引入冲突版本。
4. 检查依赖是否被当前包直接声明，排除依赖提升造成的“碰巧可用”。
5. peer 冲突优先找兼容版本组合；`--legacy-peer-deps` 会改变解析方式，不能代替兼容验证。
6. 在新练习目录按锁文件安装并运行消费者测试，区分缓存、磁盘和依赖树问题。

同一库出现多份不一定是 bug；React 等要求共享实例的库重复加载可能破坏 Hooks。`overrides` 只能强制解析，不能保证上游接受被替换 API。

### 5. 审计与升级

`npm audit --json` 返回的是已知漏洞信息，不覆盖自写代码、恶意发布或未知漏洞。根据依赖路径、版本、生产可达性与缓解措施决策。

不要直接执行 `npm audit fix --force` 后宣称安全完成。先选择最小修复版本，检查 release notes 和 manifest/lock diff，再跑类型、测试、构建及关键消费者。tarball integrity 校验不能证明发布者可信。

## 常见问题

**有锁文件就绝对可复现吗？** 还受平台、运行时、原生依赖、安装脚本及 registry 可用性影响，CI 需记录这些条件。

**删锁文件能解决冲突吗？** 可能让解析结果改变，却失去原证据；先定位冲突再由工具更新。

**能提交 node_modules 吗？** 通常不需要；项目采用 vendoring 时遵循明确策略，不能临时把整个目录塞入 Git。

## 实操作业

1. 基础：计算上表范围，列出 `^0.2.3` 是否匹配 0.2.9、0.3.0。
2. 进阶：建立锁文件失配实验，保留失败与恢复输出。
3. 挑战：追踪一个间接依赖，给出升级、替换、临时缓解的成本及回归范围。

### 参考答案与验收

- 0.2.9 匹配，0.3.0 不匹配。
- 冻结安装不能修改锁文件来制造成功；恢复后 manifest 与 lock 应一致。
- 升级报告需要依赖路径、兼容版本和消费者验证；只有“0 vulnerabilities”不够。

<!-- atlas-task:start -->
## Atlas 项目任务

为模块化 Atlas 选择单一包管理器，在新目录重建并运行核心测试，验证没有依赖全局工具或幽灵依赖。见 [L1 里程碑](../../projects/atlas/milestones/L1.md)。
<!-- atlas-task:end -->

---

## 本节小结

版本范围表达兼容期望，锁文件固定解析结果，安装与测试提供实际证据。排障需要追踪原因，不能靠删锁文件碰运气。

<!-- course-nav:start -->
---

[上一篇：npm、package.json 与脚本生命周期](./04-npm-package-json与脚本生命周期.md) · [课程地图](../../README.md) · [下一篇：01 JSX、组件、Props 与 State](../../L2-前端框架与组件化/01-React-19-核心/01-JSX-组件-Props-State.md)
<!-- course-nav:end -->
