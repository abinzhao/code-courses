# EX17 WXT：入口、生成 Manifest 与依赖边界

## 任务卡

150 分钟；前置 原生 MV3、TypeScript、React；产出可重建 WXT 工程、类型检查与 manifest 对账。

## 1. 任务背景

原生四文件教平台，WXT 管理 TS/React 编译与跨浏览器入口。
框架不能代替权限审计，尤其生成 manifest 可能与配置直觉不同。

## 2. 学习目标

理解约定入口与生成产物；固定顶层依赖、生成锁文件；
区分开发 HMR 与生产包，不手改 `.output` 或 `.wxt`。

## 3. 前置知识与环境

Node ≥22.12，本次实际 22.22.0；WXT 0.21.4、React 19.3.0，完整精确版本见
[BASELINE](../BASELINE.md)。当前 TypeScript 注册表版本与保守验证版本不同，不能冒称最新版实测。
EX23 收录每个源码和配置，EX24 收录测试；先全部重建再安装。

<a id="s4"></a>
## 4. 核心机制

entrypoints/background.ts→background.js；market.content.ts→content-scripts/market.js；
popup/options/sidepanel 的 index.html/main.tsx→对应 HTML 与共享 chunk。
React module 提供构建集成，WXT prepare 生成类型配置；tsconfig extends `.wxt/tsconfig.json`。
manifestVersion 显式 3；配置只是输入，权限/入口必须读真实生成 JSON。
runtime registration 不静态注入，但本次 WXT 仍产生必选 host，hook 删除并受 artifacts 守护。
只修改源码配置，不手工补 output manifest；否则下次 build 会覆盖且不可复现。

## 5. 设计与步骤

EX23/24 抽取→npm install→check→test→双 build→artifact。
目录中 source、native、fixtures、tests 不会自动全进包；实际包文件应可列举。
生产不是 dev server，商店不允许远程代码，不能把 HMR 连接当发布配置。

<a id="s6"></a>
## 6. 最小可运行示例

主线完整配置：

<a id="file-wxt-config-ts"></a>
### wxt.config.ts

<!-- file: wxt.config.ts -->
```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      // Runtime registration must not turn optional host access into install-time access.
      delete manifest.host_permissions;
    },
  },
  manifest: ({ browser }) => ({
    name: 'Neighbor Market Helper',
    description: 'Local notes for public loopback market items. No account or remote sync.',
    permissions: ['storage', 'alarms', 'activeTab', 'scripting', ...(browser === 'chrome' ? ['sidePanel'] : [])],
    optional_host_permissions: ['http://127.0.0.1/*'],
    content_security_policy: { extension_pages: "script-src 'self'; object-src 'self'; connect-src http://127.0.0.1:4173" },
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: {
          id: 'neighbor-market@example.invalid',
          strict_min_version: '140.0',
          data_collection_permissions: { required: ['none'] },
        },
      },
    } : { minimum_chrome_version: '120' }),
  }),
});
```

完整 package/tsconfig/入口也必须一起重建，见 [EX23](../12-capstone/01-complete-project-rebuild.md#s6)。
在个人工程运行：

```sh
npm install
npm run check
npm test
npm run build:chrome
node -e "const fs=require('node:fs');const m=JSON.parse(fs.readFileSync('.output/chrome-mv3/manifest.json'));console.log(m.manifest_version,m.permissions,m.host_permissions)"
```

预期 MV3、最小权限、host_permissions undefined；实际输出不是只看 tsconfig 编译成功。
可运行 `npm run dev` 体验 HMR，结束 `Ctrl+C`；验证时使用生产 build 重新加载独立扩展。

<a id="s7"></a>
## 7. 业务集成

完整工程把共享 domain、App 和 CSS 放 shared，背景和内容入口 import 同一 parser。
tsconfig 不把 tests 当应用类型检查范围；Vitest 执行测试，但不是静态测试文件类型检查，
这项范围必须明确。WXT 集成可能变更，版本升级需再次双 build/manifest 断言。

<a id="s8"></a>
## 8. 错误实验与排查

漏 `wxt prepare` 或 tsconfig extends 错，类型生成不可用；恢复配置再 check。
手改 output manifest 后 build，改动消失；修复源 config 并重验。
删除 hook 后 artifacts 报权限扩大，恢复而非放宽。
dev 正常而生产 CSP 报错时，检查生产入口与远程脚本，不将 dev URL 发布。

## 9. 课后思考与答案

1. WXT 是否自动保证 least privilege？答案：否，最终 manifest 与请求方式要审计。
2. 精确顶层版本等于全依赖字节冻结？答案：否，锁文件由安装生成，复做应保留锁证据。
3. 为什么不把应用源码单独放教材目录？答案：教材只 Markdown，源码完整嵌正文并可机械重建。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：映射三类入口。答案：background、content、HTML UI，产物名在上表。
- 进阶：审核 manifest。答案：MV3、最小 permissions、optional only、无 WAR/静态 content、正确 background。
- 故障注入：漏 React module。答案：构建/JSX 集成异常，恢复模块并 check/build，不用手工 output。

<a id="s11"></a>
## 11. 验收清单

- [ ] 全部入口可重建，npm install 生成个人锁文件。
- [ ] check/test/build 与 artifact 分别通过。
- [ ] 无手改 output/.wxt。
- [ ] dev 与 production 证据分开。
- [ ] 精确依赖和类型检查范围明确。

## 12. 小结

WXT 管构建，不接管业务安全；生成产物仍是平台合同的最终证据。

## 13. 扩展阅读

- [WXT Entrypoints](https://wxt.dev/guide/essentials/entrypoints)
- [WXT Configuration](https://wxt.dev/api/reference/wxt/)
- [WXT Frameworks](https://wxt.dev/guide/essentials/frontend-frameworks)

## 我现在能做到什么

能从原生平台模型迁入完整 TS/React 工程，并审计构建后权限而非相信配置。

## 单元导航

[上一页 EX16](../08-network-csp/02-web-accessible-resources.md) · [卷入口](../README.md) · [下一页 EX18](02-firefox-env-build-differences.md)
