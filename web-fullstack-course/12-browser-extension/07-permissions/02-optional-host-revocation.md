# EX14 Optional Host：拒绝、注册与撤销

## 任务卡

150 分钟；前置 EX13；产出拒绝降级、同意后注册、撤销后刷新和 manifest 白名单。

## 1. 任务背景

用户可选择在目标站点持久显示公开商品标记，但拒绝应仍可用 toolbar activeTab。
可选模式不得被构建工具偷偷转成安装时必选权限。

## 2. 学习目标

从直接用户动作请求 optional host；按需 registerContentScripts；
撤销注册和权限，解释旧文档刷新；审计真实 manifest 而非仅看配置。

## 3. 前置知识与环境

EX23 完整配置、content 与 App；双 build 后执行 `node tests/artifacts.mjs`。
系统权限弹窗拒绝/同意需手工独立 profile 复做；本次自动化未宣称测完这组弹窗。

<a id="s4"></a>
## 4. 核心机制

manifest optional pattern 是 `http://127.0.0.1/*`；host 匹配不能精确当作端口 gate。
实际 request 使用 HOST=`http://127.0.0.1:4173/*`，内容入口再 exact origin 校验。
permission request 必须在按钮动作链内立即调用，不能先 await GET；
不同浏览器的 pattern/提示行为须真实安装核对。
registration:'runtime' 让 WXT 产出脚本但不静态 content_scripts；
本次 WXT 0.21.4 仍生成必选 host_permissions，manifestGenerated hook 删除，并由产物测试守住。
撤销不等于已经注入旧文档的 JS 立即移除；用户需刷新。

## 5. 设计与步骤

Enable→request；false→降级提示；true→检查注册 id=market，仅缺失才注册；
Revoke→unregister→permissions.remove→清当前 Item→提示刷新。
不自动重复弹权限，不把拒绝作为错误去绕过。

<a id="s6"></a>
## 6. 最小可运行示例

在主线 options 控制台检查真实状态，不发起权限写操作：

```js
const pattern = 'http://127.0.0.1:4173/*';
console.log('granted', await chrome.permissions.contains({ origins: [pattern] }));
console.log('registered', (await chrome.scripting.getRegisteredContentScripts()).map(row => row.id));
```

随后用 UI Enable target host，先拒绝：预期 declined，仍可 action 临时读取。
再次主动点击同意，刷新目标页：预期标记；Revoke 后检查 contains=false、注册为空，
刷新目标页标记消失。全部写操作来自显式按钮，完整代码在
[App](../12-capstone/01-complete-project-rebuild.md#file-shared-app-tsx)。
停止：撤销后刷新，关独立浏览器，fixture `Ctrl+C`。

<a id="s7"></a>
## 7. 业务集成

主线不请求 all_urls、不静态注入，不向非目标端口发送数据。
hook 删除的是本课程无必选 host 的配置结果，不能不经审查复制到需要必选权限的其他项目。
旧 profile 可能仍保留权限，发布和迁移不能用“新包 manifest 没有”替代用户撤销记录。

<a id="s8"></a>
## 8. 错误实验与排查

删除 hook，重新 build，artifacts 应因 host_permissions 存在失败；恢复后通过。
忘 unregister，仅 remove 后重开注册检查可能残留；恢复两步并刷新。
在 request 前延迟，权限提示可能因用户动作链失效；恢复直接 request。
拒绝后若 UI 假装 enabled，修复布尔检查，不能 mock 真权限为成功。

## 9. 课后思考与答案

1. 可选权限拒绝是否禁用整个扩展？答案：否，临时 activeTab 仍是默认主线。
2. 为什么源码还要 origin？答案：host pattern 不等于端口/路径业务合同。
3. revoke 成功为何旧标记仍在？答案：已运行脚本生命周期与 permission state 不同，刷新清文档。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：拒绝一次。答案：declined，不注册；用户可用 toolbar 读。
- 进阶：二次 enable。答案：检查 id 去重，不重复 register 同 id。
- 故障注入：忘删除必选 host。答案：产物白名单失败，配置修复后双平台复验。

<a id="s11"></a>
## 11. 验收清单

- [ ] request 是显式用户动作，拒绝可降级。
- [ ] 默认无静态 content_scripts/必选 host。
- [ ] 注册 id 去重、撤销含 unregister/remove。
- [ ] 刷新旧页面后标记消失。
- [ ] 手工弹窗与自动产物证据分开。

## 12. 小结

权限是动态用户状态，生成配置、实际授权与已注入文档必须分别核对。

## 13. 扩展阅读

- [Chrome Permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [registerContentScripts](https://developer.chrome.com/docs/extensions/reference/api/scripting#method-registerContentScripts)
- [WXT 入口](https://wxt.dev/guide/essentials/entrypoints)

## 我现在能做到什么

能为可选持久模式提供拒绝、去重和撤销闭环，不扩大默认权限。

## 单元导航

[上一页 EX13](01-active-tab-user-gesture.md) · [卷入口](../README.md) · [下一页 EX15](../08-network-csp/01-fetch-csp-no-credentials.md)
