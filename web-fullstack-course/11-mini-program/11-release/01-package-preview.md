# MP-21 包体与预览：可复建产物先于二维码

## 任务卡

- 任务：从锁文件干净构建三平台，度量主包/分包并区分构建与预览。
- 产出：独立 `package-audit.mjs`、`package-audit.test.mjs`、产物清单。
- 运行：`npm ci`、测试/类型/三 build、包审计。
- 证据：文件数、字节、每文件 SHA-256、分包预算、实际预览边界。
- 边界：本地字节不是平台压缩包大小；二维码/上传是外部操作，必须另获授权。

## 1. 任务背景

“能打包”不说明首包适合冷启动，也不说明源码与产物一致。
预览工具可能复用旧目录，平台压缩/上传又有独立限额。
先冻结源码、锁文件与产物摘要，再用对应工具预览，避免验证了不同构建。

## 2. 学习目标

冻结直接依赖与锁文件；生成稳定产物清单；衡量主包/分包；
识别公共依赖回流主包；记录预览工具、账号与版本；
不把源码配置或本地 build 成功当上传证据。

## 3. 预备知识

完成 [工具真机验收](../10-testing/02-device-weak-network.md) 与 MP-24 完整项目。
首次 npm install 生成锁文件，干净复验 npm ci；不手改 lock，不在教材仓库安装。
真实预览需平台工具/账号/AppID，密钥或自动化凭据不进入源码/日志。

<a id="s4"></a>
## 4. 核心理论

### 4.1 可复建与一致性

记录 Node/npm/Taro、源 Markdown 哈希、提取清单、package-lock 摘要与 build 命令。
精确直接依赖不冻结全部传递依赖，只有 lock 加 npm ci 才固定依赖树。
产物摘要按相对路径排序，记录每文件字节/hash，再对清单整体 hash；
不能仅按文件 mtime 判断同一构建。

### 4.2 包体与分包预算

Taro 公共 runtime/vendor 可能进主包，即使页面在分包也不代表依赖都独立。
本实验主包预算 2 MiB、分包 packages 预算 1 MiB，总量 5 MiB 是教学内部门，
不是长期平台限额。实施时从各平台官方/工具检查当前主包、单分包、总量、
独立分包与插件限制。平台压缩、剔除规则与本地 raw bytes 不同，分别记录。

### 4.3 预览与上传

构建不需要账号；工具预览需正确 AppID、权限与工具；自动上传/体验版/二维码
可能是外部写操作，不在本卷验证自动执行。CI 私钥只由授权平台 runner 安全读取，
不打印、不打入产物、不写通用共享配置。
预览记录时间、平台、工具、构建摘要与二维码有效性；二维码本身可能泄漏体验入口，
按测试权限管理。

## 5. 产物审计设计

脚本递归读取目标 dist，不修改文件；拒绝 symlink，避免把外部文件混入摘要。
按 packages 前缀区分教学分包与主包，不能解释成精确平台下载量。
独立测试用临时目录，不清真实 dist。audit 默认路径由参数指定，避免扫全磁盘。

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `package-audit.mjs`：

```js
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
const hash = value => createHash("sha256").update(value).digest("hex");
export async function audit(root) {
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const full = join(path, entry.name);
      if (entry.isSymbolicLink()) throw new Error("symlink not allowed");
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const content = await readFile(full);
        files.push({ path: relative(root, full).split("\\").join("/"), bytes: content.length, sha256: hash(content) });
      }
    }
  }
  await walk(root);
  files.sort((a,b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  const mainBytes = files.filter(f => !f.path.startsWith("packages/")).reduce((n,f) => n + f.bytes, 0);
  const subBytes = files.filter(f => f.path.startsWith("packages/")).reduce((n,f) => n + f.bytes, 0);
  return { files, mainBytes, subBytes, totalBytes: mainBytes + subBytes, sha256: hash(JSON.stringify(files)),
    budgetPass: mainBytes <= 2 * 1024 * 1024 && subBytes <= 1024 * 1024 && mainBytes + subBytes <= 5 * 1024 * 1024 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw new Error("provide exactly one output directory");
  const result = await audit(resolve(process.argv[2]));
  console.info(JSON.stringify(result, null, 2));
  if (!result.budgetPass) process.exitCode = 1;
}
```

完整文件 `package-audit.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { audit } from "./package-audit.mjs";
test("artifact manifest is stable and separates main/subpackage", async () => {
  const root = await mkdtemp(join(process.cwd(), ".mini-package-test-"));
  try {
    await mkdir(join(root, "packages"));
    await writeFile(join(root, "app.js"), "abc");
    await writeFile(join(root, "packages", "page.js"), "defg");
    const first = await audit(root), second = await audit(root);
    assert.equal(first.sha256, second.sha256);
    assert.equal(first.mainBytes, 3); assert.equal(first.subBytes, 4);
    assert.equal(first.budgetPass, true);
    await writeFile(join(root, "app.js"), "changed");
    assert.notEqual((await audit(root)).sha256, first.sha256);
  } finally { await rm(root, { recursive: true, force: true }); }
});
```

测试临时目录创建在当前个人练习根下；本卷运行根位于 `/tmp/course-mini-20261012`。
finally 只清本测试 freshly-created 目录，不用通配 rm。

```bash
node --test package-audit.test.mjs
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build:weapp
npm run build:tt
npm run build:alipay
node package-audit.mjs dist/weapp
node package-audit.mjs dist/tt
node package-audit.mjs dist/alipay
```

预期 manifest 包含 app、三主包页、两分包页、平台项目配置与 runtime，
内部 budgetPass=true。按实际命令输出记录，不预填字节/平台下载大小。
命令自然退出；watch Control-C。保留摘要供审查，无需上传、预览或删除产物。

<a id="s7"></a>
## 7. 邻里集市集成案例

发布页/预约页属于 packages 分包，home/detail/account 属主包。
App 级导入会把依赖提前放进公共包，因此不在 app 初始化读取所有分包文件。
MP-24 demo service 在 client 公共依赖中，真实生产要独立入口裁掉它，
不是把故障按钮藏掉就减少体积/去伪身份。

平台预览前核对项目 AppID 与 dist 目录，记录源码/lock/manifest hash。
二维码只用于对应授权测试者；体验版不是审核发布。
缺账号时记录构建与预算通过、预览未验证，不做假二维码。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：在主包加入 3 MiB 文件，audit budgetPass=false；删除本次注入文件后恢复。
若两个构建 manifest 不同，按每文件 hash 找变化，不立即归因 runner。
源配置名与输出名不同先检查 Taro project-config；不能把游客 AppID 当真实应用上传。

## 9. 课后题

1. raw bytes 小于 2 MiB 就能提审吗？答案：不，平台实际打包与规则独立检查。
2. 精确 package.json 足够复建吗？答案：还需 lock、工具链、源码与构建配置。
3. CI 私钥可放 dist 吗？答案：绝不，授权 runner 独立保管与读取。

<a id="s10"></a>
## 10. 实践练习

- 基础：改 app.js 一个字节。参考答案：该文件 hash 和总 manifest hash 都变化。
- 进阶：分包引入大依赖。参考答案：比较主/分包 manifest 与工具分析，
  公共 vendor 回流主包时不能只看页面目录。
- 故障注入：导入旧 dist 预览。参考答案：工具对应文件摘要不等于最终 manifest，
  拒绝把旧二维码登记最终验收，重新导入授权构建。

<a id="s11"></a>
## 11. 阶段验收

- [ ] audit 测试、干净 install、类型、测试与三 build 实际通过。
- [ ] 主/分包 bytes 与 SHA-256 有记录，平台限额另核对。
- [ ] 预览未授权不执行，游客/空 AppID 不冒充体验版。
- [ ] 凭据、源码 map 风险与 demo 代码边界已审查。

## 12. 常见问题

是否把构建 hash 当 commit？不。本任务禁止 commit/push，记录 Markdown 和产物 hash，
不能编造不存在的提交。正式发布应增加真实 revision，与本地未提交教材证据分开。

## 13. 扩展阅读

[Taro 应用配置](https://docs.taro.zone/docs/app-config/)、
[Taro CI](https://docs.taro.zone/docs/plugin-mini-ci/)、
[微信分包](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages/basic.html)。

## 我现在能做到什么

我能复建并审计产物，区分本地包体、平台限制、预览与正式上传。

## 单元导航

[上一单元](../10-testing/02-device-weak-network.md) ·
[下一单元](02-review-rollout-rollback.md) · [本卷](../README.md)
