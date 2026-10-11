# EX10 Sender、Tab 与 Origin：不信任消息自报身份

## 任务卡

150 分钟；前置 EX09；产出 sender 决策表、真实 content DELETE 拒绝与导航竞争解释。

## 1. 任务背景

content 属于自己的 extension ID，但处理的是不可信网页。不能因为 sender.id 相同，
就允许它读备注、删除数据或代替 UI 保存任意命令。

## 2. 学习目标

按消息类型校验 sender；绑定顶层 tab 和当前 URL；允许自己的 options tab 而不误授权页面；
理解 SPA 中 sender.url 与当前 tab URL 的不同角色。

## 3. 前置知识与环境

完整 domain/background；`npm test` 与 EX24 E2E。只用固定回环目标与独立 profile。

<a id="s4"></a>
## 4. 核心机制

| 请求 | 必须来自 | 复核 |
|---|---|---|
| REPORT | 自己的顶层 content | id、frameId=0、origin、文档 URL origin、tab.id、tab.url=item.url |
| GET/SAVE/DELETE/SET_RETENTION | 自己的 popup/options/sidepanel | id、runtime.getURL base 的 scheme/host、固定 path、无 query/hash |

sender 由浏览器提供，不用请求体 tabId。background REPORT 再 `tabs.get` 检查当前 URL；
这减少导航竞争，不能将一次 URL 检查宣称为页面内容真实性证明。
SPA 注入文档的 sender.url 可能仍是初始路径，所以仅校验其 origin；
current sender.tab.url 和复核 tabs.get 才绑定当前 item URL。
options 独立 tab 合法，禁止“有 sender.tab 就拒绝”的错误规则。

## 5. 设计与步骤

先 schema，再 id，再按类型分权。content 只能报告公开字段，不能读取或删除 notes。
UI URL 必须实际扩展 base；Firefox 使用 moz-extension 的 runtime URL，不能硬编码 Chrome scheme。

<a id="s6"></a>
## 6. 最小可运行示例

在主线工程新建个人 `sender.test.ts`：

```ts
import { it, expect } from 'vitest';
import { authorize, parseMessage, ORIGIN } from './shared/domain';
it('does not grant content UI authority', () => {
  const msg = parseMessage({ v: 1, type: 'DELETE' });
  const page = { id: 'ext', url: `${ORIGIN}/items/lamp`, origin: ORIGIN, frameId: 0,
    tab: { id: 8, url: `${ORIGIN}/items/lamp` } };
  expect(() => authorize(msg, page, 'ext')).toThrow('SENDER');
  expect(authorize(msg, { id: 'ext', url: 'chrome-extension://ext/options.html',
    tab: { id: 9 } }, 'ext')).toBe(true);
});
```

`npx vitest run sender.test.ts` 预期通过；这是模型断言。
EX24 浏览器脚本实际从 executeScript 的 isolated context 发送 DELETE，响应 ok=false，
再 GET 验证数据未删除，才是真实 sender 证据。脚本 finally 清理 profile/server；手工则关浏览器和 fixture。

<a id="s7"></a>
## 7. 业务集成

[authorize](../12-capstone/01-complete-project-rebuild.md#file-shared-domain-ts) 与
[background](../12-capstone/01-complete-project-rebuild.md#file-entrypoints-background-ts) 是完整实现。
SAVE 的 Item 仍 parse，UI 的合法 origin 不免除数据校验；
主线没有 externally_connectable，不引入第三方扩展或网页授权入口。

<a id="s8"></a>
## 8. 错误实验与排查

删除 frameId 检查，iframe 单测应失去拒绝；恢复后通过。
用消息体 tabId 代替 sender.tab.id，额外字段 schema 应拒绝，不允许放宽。
把 REPORT 的 sender.url 要求与 item URL 全路径一致，SPA 报告可能错误拒绝；
修复为文档 origin+当前 tab URL+tabs.get，重做 SPA。
放宽 UI 到任意 extension URL 会接受未知页面，恢复固定 path 后拒绝 foreign host。

## 9. 课后思考与答案

1. id 相同为什么不够？答案：自己的 content 面向不可信 DOM，不具备 UI 用户意图。
2. URL 相同证明内容可信吗？答案：不能；Item parser 与文本 sink 仍必须存在。
3. 为什么 origin 端口再检查？答案：manifest 匹配模式不能精确替代应用端口合同。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：foreign id。答案：SENDER 拒绝，无业务 IO。
- 进阶：SPA old sender.url。答案：初始路径 origin 合法，当前 tab/item/book 一致即可 REPORT；tabs.get 再复核。
- 故障注入：合法 content 发 GET。答案：固定 UI path 规则拒绝，不返回本地备注。

<a id="s11"></a>
## 11. 验收清单

- [ ] sender 来自平台而非消息字段。
- [ ] REPORT 顶层、origin、tab 和复核 URL 齐备。
- [ ] options 带 tab 可用，foreign extension URL 不可用。
- [ ] content GET/DELETE 均拒绝。
- [ ] SPA 测试通过，未扩大为任意 URL。

## 12. 小结

最小权限不仅是 manifest 列表，也包括同一个扩展内部不同上下文的分权。

## 13. 扩展阅读

- [MessageSender](https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender)
- [MDN runtime.MessageSender](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender)

## 我现在能做到什么

能把真实 sender、活动文档和业务 URL 绑定，同时处理 options 与 SPA 的实际差异。

## 单元导航

[上一页 EX09](01-schema-response-errors.md) · [卷入口](../README.md) · [下一页 EX11](../06-storage-data/01-quota-single-writer.md)
