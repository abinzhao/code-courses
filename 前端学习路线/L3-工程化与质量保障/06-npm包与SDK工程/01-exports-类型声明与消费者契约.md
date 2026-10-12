# exports、类型声明与消费者契约

<!-- course-meta:start -->
> - 层级：L3
> - 先修：[ESM](../../L1-JavaScript与TypeScript/05-模块化与包管理/01-ESM规范与动态导入.md)、[npm 基础](../../L1-JavaScript与TypeScript/05-模块化与包管理/04-npm-package-json与脚本生命周期.md)
> - 建议用时：180 分钟
> - 一手资料：[Node Packages](https://nodejs.org/docs/latest-v24.x/api/packages.html)、[TS 模块参考](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
<!-- course-meta:end -->

## 学习目标

- 能设计一个最小 npm 库的公开入口与声明文件。
- 能区分源码测试与安装后的消费者测试，识别错误 exports 和泄漏的 Node 依赖。

## 内容讲解

### 1. 从消费者定义 API

Atlas SDK 先只提供 `normalizeTitle(value)`，接受字符串、压缩空白、返回标题。先建消费者测试，再实现：

```js
// consumer.test.mjs：在安装打包文件后的消费者目录运行。
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTitle } from 'atlas-title-lab';
test('压缩标题空白', () => {
  assert.equal(normalizeTitle('  Atlas   Notes '), 'Atlas Notes');
});
test('拒绝非字符串', () => {
  assert.throws(() => normalizeTitle(null), TypeError);
});
```

此测试只有在包可安装、可解析、函数行为正确时才通过，不能靠源码相对 import 绕过入口验证。

### 2. 最小文件集合

```text
atlas-title-lab/
  package.json
  src/index.js
  src/index.d.ts
  README.md
```

```json
{
  "name": "atlas-title-lab",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "files": ["src"],
  "types": "./src/index.d.ts",
  "exports": {
    ".": {
      "types": "./src/index.d.ts",
      "import": "./src/index.js"
    }
  }
}
```

`src/index.js`：

```js
export function normalizeTitle(value) {
  if (typeof value !== 'string') throw new TypeError('标题必须是字符串');
  return value.trim().replace(/\s+/gu, ' ');
}
```

`src/index.d.ts`：

```ts
export declare function normalizeTitle(value: string): string;
```

exports 是公开入口白名单。消费者不应依赖 `包名/src/内部文件.js`；新增 exports 可能使此前深层导入失败，属于兼容变更。types 条件放在前面；Node 忽略类型条件，TypeScript 按模块解析模式选择声明。

### 3. ESM 与 CJS 的选择

先确定消费者是否需要 CommonJS。纯 ESM 是简单默认方案；若需要 CJS，明确提供对应实现与声明，并测试两类消费者。

不同 Node 版本对 `require(ESM)` 支持不同，顶层 await 和模块形状也会影响兼容。不能仅根据 `"type":"module"` 推断所有 require 行为。

不要为了“双格式”让两个入口各自维护单例状态，可能产生双实例。共享状态、身份类型和注册表必须设计一致性。

### 4. 浏览器与 Node 边界

浏览器 SDK 不能无意 import `node:fs`、process 环境或服务端秘密。共享纯函数与平台适配器拆开，公开 `./browser`、`./node` 入口时分别测试。

`sideEffects: false` 是可被 tree shaking 使用的声明，不是优化按钮。模块若注册全局监听、注入 CSS 等，错误声明可能删除必要行为。

### 5. 类型与运行时双重契约

声明文件里的 string 不能阻止 JavaScript 消费者传 null，因此运行时校验仍需要。类型验证用消费者的 `tsc --noEmit`，设置与目标运行环境一致的 moduleResolution，测试正确调用和预期编译失败。

## 常见问题

**源码测试都通过，安装后为什么失败？** files 漏文件、exports 路径错误、依赖未声明或声明文件解析模式不符。

**能只发 TypeScript 源码吗？** 可以在明确支持的消费链路采用，但必须说明转译、类型与运行时要求，不能默认所有 Node/打包器都支持。

## 实操作业

1. 基础：实现上面的库，打包安装后运行消费者测试。
2. 进阶：增加 `./search` 入口，验证内部路径不能深层导入。
3. 挑战：用 Node 与浏览器构建两个消费者，验证没有 Node 内置模块泄漏到浏览器。

### 参考答案与验收

消费者必须导入包名；tarball 包含实现和 d.ts；非法输入抛 TypeError。修改公开函数返回类型应让类型消费者暴露变化；内部未导出路径的失败属于预期封装行为。

<!-- atlas-task:start -->
## Atlas 项目任务

从 Atlas 抽取一个稳定纯函数 SDK，由独立消费者验证，不共享源码路径。见 [L3 里程碑](../../projects/atlas/milestones/L3.md)。
<!-- atlas-task:end -->

---

## 本节小结

包工程交付的是安装后可使用的契约；源码正确只是其中一层。

<!-- course-nav:start -->
---

[上一篇：构建、测试与部署自动化：前端 CI/CD 全链路实战](../05-CICD流水线/02-构建-测试-部署自动化.md) · [课程地图](../../README.md) · [下一篇：pack、版本管理与发布演练](./02-pack-版本管理与发布演练.md)
<!-- course-nav:end -->
