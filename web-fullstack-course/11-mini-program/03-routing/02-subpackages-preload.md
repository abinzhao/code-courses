# MP-06 分包与预加载：预算是模块图，不是移动文件夹

## 任务卡

- 任务：将发布、预约放入普通分包，检查公共依赖实际落点与深链加载。
- 产出：`src/app.config.ts` 完整实验配置与平台输出包清单。
- 运行：MP-24 项目类型检查、微信/抖音 build，工具禁缓存冷启动分包。
- 边界：本课程预算不是平台硬上限；平台配额在提审前重新核对。

## 1. 任务背景

把页面挪到 packages 目录不等于包体变小。它若静态导入主包大库，公共 runtime
和共享依赖仍可能进入主包。预加载也只改善后续等待，不是首包预算豁免。

## 2. 学习目标

理解主包、普通分包、独立分包的依赖边界；按功能拆包；检查 preloadRule；
保持分享深链与返回恢复在分包冷加载时可用。

## 3. 预备知识

完成 MP-05，创建 MP-23/24 全部项目文件。不使用旧章入口配置；
下例替换 MP-24 app.config，页面路径与完整源码保持一致。

<a id="s4"></a>
## 4. 核心理论

主包包含应用入口和常用页面；普通分包可依赖主包资源，但跨普通分包互相依赖需要
符合平台规则。独立分包设计为不依赖主包环境，App 初始化、共享数据和运行时加载都
必须另核对，不能只加 independent 就宣称隔离成功。

预算同时看源码图、输出文件图与平台上传包统计。课程建议主包 <1.5 MiB、
单普通分包 <1 MiB 的内部预警值，但实际微信/抖音/支付宝硬上限以当日账号文档为准。
输出目录字节数不是平台打包大小，压缩、工具处理与公共包影响不同。

预加载只在允许条件下提早下载；弱网、无网、缓存失效都必须有加载与重试状态。
不要提前执行分包写操作或请求权限，用户仍要在实际使用时授权。

## 5. 配置清单

| 项目 | 核对 |
| --- | --- |
| pages | 三个主包页面完整存在 |
| subPackages | root 不与页面路径重复 |
| preloadRule | 首页可预加载 packages，非提交业务 |
| independent | 本实验关闭，不伪造独立包 |
| output | 每平台独立 dist，防止互相覆盖 |

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `src/app.config.ts`：

```ts
export default defineAppConfig({
  pages: ["pages/home/index", "pages/detail/index", "pages/account/index"],
  subPackages: [{ root: "packages", pages: ["publish/index", "reservations/index"] }],
  preloadRule: { "pages/home/index": { network: "all", packages: ["packages"] } },
  window: { navigationBarTitleText: "邻里集市演示" },
  permission: { "scope.userLocation": { desc: "仅用于选择附近区域，可手工输入" } },
  requiredPrivateInfos: ["getLocation"]
});
```

在 MP-24 项目根运行：

```bash
npm run typecheck
npm run build:weapp
npm run build:tt
du -sk dist/weapp dist/tt
```

预期 app.json 中包含 packages 的两页，输出有主包 runtime 和分包页面。
`du` 只显示本机目录 KiB，另在各平台工具查看包体分析。工具清缓存后从首页到发布，
再直接启动分包页面；弱网重试不应丢失已保存草稿。结束时停止 watch、关闭项目，
只清理自己的 dist 后可再次 build，不删共享依赖或真实草稿。

<a id="s7"></a>
## 7. 邻里集市集成案例

发布表单与预约管理访问频率较低，放 packages；列表与公开详情留主包。
domain/parser 很小可共享，图片编辑器这类大依赖不应静态导入首页。
MP-24 选择无额外图片库的基线，以确保预算可解释。
第二平台检查输出的 subPackages 字段和实际路由，不能只对比 TypeScript 配置文本。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：把 path 写成 `packages/packages/publish/index`。构建或工具找不到页面；
证据记录输出配置与实际文件路径，根因是 root 重复，恢复 root+相对 pages。
第二实验：在首页导入巨型编辑器，包体上升；删入口依赖后复验模块图，
不靠关闭 minify 或删除功能文件“减包”。

## 9. 课后题

1. 预加载能突破包体上限吗？答案：不能。
2. 文件夹变小等于上传包变小吗？答案：需平台统计。
3. 独立分包能默认读 App 全局身份吗？答案：不能假设主包已加载。

<a id="s10"></a>
## 10. 实践练习

- 基础：关闭预加载。参考答案：删除 preloadRule，分包按需加载，路由仍正确。
- 进阶：仅 Wi-Fi 预加载。参考答案：按目标平台支持值使用 `network:"wifi"`，
  真机比较流量与等待，拒绝把无网失败描述为预加载成功。
- 故障注入：分包访问另一个普通分包资源。参考答案：记录工具失败，
  将公共小资源放主包或按平台规则改依赖，不复制秘密/会话到每包。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 两平台包图、输出字段、工具包体分别记录。
- [ ] 分包直接冷启、弱网失败和返回恢复不依赖已访问首页。
- [ ] 内部预算与官方硬限制明确区分。
- [ ] 未验证独立分包和真机时不标通过。

## 12. 常见问题

Taro 支持所有分包策略吗？以当前 runner、平台插件和基础库组合验证；
异步分包与原生独立分包不是同一个概念。

## 13. 扩展阅读

[微信分包](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages.html)、
[Taro 应用配置](https://docs.taro.zone/docs/app-config/)、
[Taro 项目配置](https://docs.taro.zone/docs/project-config/)。

## 我现在能做到什么

我能按功能与依赖图拆包，检查实际输出并用冷启动证明恢复边界。

## 单元导航

[上一单元](01-stack-state-recovery.md) · [下一单元](../04-network/01-request-parser-cancellation.md) · [本卷](../README.md)
