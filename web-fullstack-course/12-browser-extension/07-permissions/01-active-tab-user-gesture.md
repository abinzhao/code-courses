# EX13 ActiveTab：用户调用后的临时能力

## 任务卡

120 分钟；前置 EX01、EX10；产出授权前失败、action 后成功与错误 origin 拒绝三张记录。

## 1. 任务背景

用户只想读取正在看的商品。默认申请永久全站权限既不必要，也改变隐私风险。
activeTab 配合 scripting 足够完成一次临时公开读取。

## 2. 学习目标

区分 activeTab、tabs 与 host permission；将用户意图与当前目标绑定；
处理受限页面、导航和未授权失败，不自动申请更大权限。

## 3. 前置知识与环境

EX01 原生或 EX23 主线；fixture 目标页；独立 Chromium。
浏览器内部页面如 chrome://extensions 不能普通注入，失败不是需要 `<all_urls>` 的理由。

<a id="s4"></a>
## 4. 核心机制

activeTab 由用户调用扩展 action 等平台认可动作触发，临时提供目标 tab 的 host 能力；
它不是打开任何 extension HTML 后都自动产生，也不是所有页面长期授权。
scripting 是执行 API 权限，activeTab/host 是目标访问授权，两层必须满足。
tabs.query 的敏感 URL 字段受 tabs 或目标 host 能力控制；主线不增加全局 tabs 权限。
同源导航可能保留平台授权，但应用仍每次 targetUrl 校验；跨源导航后不能继续读。

## 5. 设计与步骤

用户在目标页点工具栏→popup 读 active tab→URL parser→顶层 isolated executeScript→parseItem→
再次 tabs.get 核对 URL。遇到页面变化或权限缺失，提示重读/调用 action，不偷偷永久申请。

<a id="s6"></a>
## 6. 最小可运行示例

EX01 原生完整 popup 已可运行，以下为 popup 控制台独立探针：

```js
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (!tab?.id || !tab.url) throw Error('Invoke toolbar on the target page');
const url = new URL(tab.url);
if (url.origin !== 'http://127.0.0.1:4173' ||
    !/^\/items\/[a-z0-9-]{1,40}$/.test(url.pathname)) throw Error('TARGET');
const [result] = await chrome.scripting.executeScript({
  target: { tabId: tab.id, frameIds: [0] }, world: 'ISOLATED',
  func: () => location.origin === 'http://127.0.0.1:4173'
    ? document.querySelector('article[data-market-item] h1')?.textContent : null,
});
console.log(typeof result.result === 'string' ? 'public read success' : 'unsupported');
```

安装后从目标页调用 action，预期 success。打开不同 origin 后不能成功；
不打印完整页面或用户数据。自动化 EX24 使用 CDP 触发真正 action 获取 activeTab，
再测试 bundle 标签，不能把 bundle 标签本身说成授权动作。
停止：关独立浏览器，fixture `Ctrl+C`，移除实验扩展。

<a id="s7"></a>
## 7. 业务集成

[App read](../12-capstone/01-complete-project-rebuild.md#file-shared-app-tsx) 不读任何 secret/form，
没有永久 host_permissions。用户主动 Enable target host 是独立可选模式，见 EX14。
侧栏读取同样需目标授权，不能因为并排显示就自然获得所有网页。

<a id="s8"></a>
## 8. 错误实验与排查

未点 action 直接打开 popup.html 标签，activeTab 不保证存在；记录失败，再调用真实工具栏复验。
把目标换 `localhost:4173`，应用拒绝；恢复 exact origin。跨源跳转后重用旧 tabId，
必须重新 URL 检查，不把 tabId 当永久内容身份。
若 executeScript 失败，检查权限层与页面层，不直接加 all_urls。

## 9. 课后思考与答案

1. activeTab 与 scripting 可互换？答案：不能，一个目标授权，一个 API 能力。
2. UI 点击按钮一定能创建 activeTab 吗？答案：不是，需平台认可调用入口；本卷从 toolbar action 开始。
3. 为什么再次 tabs.get？答案：异步执行期间用户可能导航，防止保存错误 URL 对应的采集。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：列必要权限。答案：activeTab+scripting；local/alarms 是独立业务能力。
- 进阶：描绘导航竞争。答案：读前 URL A→执行→tab 当前 B→拒绝重读，不拼接 A 和 B。
- 故障注入：删除 scripting。答案：API 拒绝；恢复并核对 manifest，不申请全站 host。

<a id="s11"></a>
## 11. 验收清单

- [ ] 默认无必选 host_permissions。
- [ ] 真正 action 后目标公开读取成功。
- [ ] 错误 origin、内部页和导航竞争有失败状态。
- [ ] 不新增 tabs/all_urls 作为兜底。
- [ ] 授权前后与 bundle 测试边界明确。

## 12. 小结

临时能力对齐用户当前动作，业务校验继续限定平台能力的使用范围。

## 13. 扩展阅读

- [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)
- [Chrome Scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Chrome Tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs)

## 我现在能做到什么

能在不申请长期站点权限的情况下完成受限公开读取，并正确处理授权失效。

## 单元导航

[上一页 EX12](../06-storage-data/02-migration-export-deletion.md) · [卷入口](../README.md) · [下一页 EX14](02-optional-host-revocation.md)
