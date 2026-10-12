# npm、package.json 与脚本生命周期

<!-- course-meta:start -->
> - 层级：L1
> - 先修：[ESM](./01-ESM规范与动态导入.md)、[开发环境](../../L0-Web基石/00-学习准备与第一个网页/01-开发环境-终端与项目目录.md)
> - 建议用时：150 分钟
> - 一手资料：[npm package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json)、[npm scripts](https://docs.npmjs.com/cli/v11/using-npm/scripts)
<!-- course-meta:end -->

## 学习目标

- 能解释 npm CLI、registry、包与 Node.js 的区别。
- 能为应用与库选择依赖类型，并追踪脚本参数和工作目录。
- 能判断安装或打包时哪些脚本会执行。

## 内容讲解

### 1. 四个概念

Node.js 执行 JavaScript；npm CLI 安装依赖和运行包脚本；registry 分发包元数据及 tarball；包是由 package.json 描述的一组文件。npm 包不一定由 Node.js 执行，也可以提供浏览器代码、类型或二进制工具。

先运行 `node --version` 与 `npm --version`，再选择对应 CLI 版本的文档。npm 可以独立升级，不能由 Node 版本直接推断所有命令行为。

### 2. 最小练习包

在独立空目录执行 `npm init -y`。将 package.json 改为：

```json
{
  "name": "atlas-package-lab",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22 <25" },
  "scripts": {
    "check": "node --check src/index.js",
    "test": "node --test",
    "hello": "node src/index.js",
    "prehello": "node scripts/before.mjs"
  }
}
```

建立 `src/index.js`：

```js
// process.argv 前两项是 Node 路径和脚本路径。
console.log(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() }));
```

建立 `scripts/before.mjs`：

```js
console.error('执行 hello 前的准备工作');
```

执行 `npm run hello -- --name Atlas`，预期先看到准备日志，再得到 `["--name","Atlas"]`。`--` 把之后的参数交给脚本，不交给 npm 自己。

脚本工作目录是包根目录。npm 会把本地 `node_modules/.bin` 加入脚本 PATH，因此 `vite`、`tsc` 应安装在项目内，不依赖导师电脑的全局版本。

### 3. 依赖类型

| 字段 | 消费者含义 | 例子 |
|---|---|---|
| dependencies | 运行或使用包需要 | HTTP 客户端、业务校验库 |
| devDependencies | 开发、测试、构建需要 | TypeScript、测试框架 |
| peerDependencies | 要与宿主共享的兼容依赖 | React 组件库的 React |
| optionalDependencies | 失败时允许继续安装 | 具有明确降级路径的平台能力 |
| peerDependenciesMeta | 指定某个 peer 可选等 | 可选框架集成 |

现代 npm 可以自动安装 peer，但不能由此忽略兼容范围。`optional` 不代表程序不需要处理模块缺失。构建工具即使在 devDependencies，部署构建阶段仍必须安装它；构建后才可以只保留运行依赖。

`engines` 在 npm 默认配置下通常是警告而非强制拒绝。CI 应显式设置运行时并运行验证，不能把字段存在当成运行时已经受控。

### 4. 生命周期与风险

显式 `npm run hello` 可以触发 prehello → hello → posthello。安装、pack、publish 则有各自的生命周期，尤其注意 `prepare` 和 `prepack`。Git 依赖的准备流程可能包含构建，行为应按所用 npm 版本核对。

`--ignore-scripts` 可以跳过安装生命周期；显式 `npm run test` 仍会执行 test 本身，但前后置脚本行为不同。需要原生构建的包可能因忽略脚本不可用，必须在受控环境验证，不能全局永久禁用后就认为功能完整。

脚本拥有当前用户权限。不要把任意远端代码放进安装钩子，也不要使用安装钩子读取用户文件或凭据。

### 5. 跨平台脚本

Unix 的 `cp`、`rm`、`VAR=value command` 不直接等同于 Windows PowerShell/cmd。优先用 Node 内置 fs 和 process 编写平台无关脚本：

```js
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
await copyFile('src/index.js', 'dist/index.js');
```

不要把所有命令塞成难以转义的 shell 字符串；涉及文件路径和用户输入时，使用参数数组和明确校验。

## 常见问题

**npx 会不会安装东西？** 可能。优先使用已安装的本地工具；临时远端执行应核对包名、版本和安装提示，避免拼写劫持。

**private true 能隐藏代码吗？** 它主要防止 npm 发布，不能加密源码，也不能替代 Git 或文件系统权限。

**devDependencies 是否不能进入生产？** 它描述依赖角色；是否进入产物还取决于打包流程。浏览器产物需要检查实际 bundle。

## 实操作业

1. 基础：完成练习包，记录参数传递、工作目录和前置脚本顺序。
2. 进阶：分别给应用、React 组件库和 CLI 列依赖类型，并解释原因。
3. 挑战：用 Node 实现跨平台复制脚本，输入不存在时非零退出。

### 参考答案与验收

- hello 参数不能包含 npm 自身的 `--`；cwd 应为包根。
- React 组件库通常把 React 放 peer 与开发测试依赖，避免消费者加载两个独立 React 实例。
- 脚本错误必须传播到退出码；测试需要在没有全局 vite/tsc 的环境验证。

<!-- atlas-task:start -->
## Atlas 项目任务

整理 Atlas 的 scripts 与依赖职责，编写“命令 → 输入 → 输出 → 失败退出码”表。见 [L1 里程碑](../../projects/atlas/milestones/L1.md)。
<!-- atlas-task:end -->

---

## 本节小结

package.json 描述包的契约和自动执行入口。能运行命令之外，还要能解释依赖角色、生命周期与跨平台行为。

<!-- course-nav:start -->
---

[上一篇：03 pnpm 与 Monorepo 入门](./03-pnpm与Monorepo入门.md) · [课程地图](../../README.md) · [下一篇：SemVer、锁文件与依赖排障](./05-SemVer-锁文件与依赖排障.md)
<!-- course-nav:end -->
