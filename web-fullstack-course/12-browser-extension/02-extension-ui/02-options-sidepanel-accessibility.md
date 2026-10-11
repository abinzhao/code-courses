# EX04 Options、侧栏与键盘：不同宿主，同一数据合同

## 任务卡

120 分钟；前置 EX03；产出 options 同步、删除确认、键盘路径与侧栏能力差异表。

## 1. 任务背景

popup 适合短操作，options 适合保留设置和导出删除，侧栏适合与网页并排。
共享组件不表示宿主 API 一样，也不表示所有 UI 都能获得同一个活动标签授权。

## 2. 学习目标

配置 WXT 三种 HTML 入口；理解 sidePanel 的直接用户动作限制与 Firefox sidebar；
实现 label、焦点、状态播报、确认删除和失败恢复。

## 3. 前置知识与环境

重建 EX23 全工程，执行双平台 build。真实运行本次仅 Chromium；
Firefox sidebar 构建不等于已安装。options 用 `runtime.openOptionsPage()` 打开。

<a id="s4"></a>
## 4. 核心机制

options 可以是标签页，因此 sender 带 tab 不代表不可信。应核对 extension ID、scheme/host 和固定
`/options.html` 路径，不能用 `!sender.tab` 鉴权。
Chrome `sidePanel.open` 要由直接用户动作触发；先 await 无关任务可能失去动作链。
主线用 effect 预取 windowId，在按钮处理器直接调用 open；Firefox 分支使用 sidebarAction。
`role=status` 和 `aria-live` 播报非阻塞状态，checkbox 显式确认删除，浏览器原生 button 支持键盘。

## 5. 设计与步骤

三入口都复用 App，options 隐藏“读取当前商品”，避免把设置页面误当临时授权入口。
侧栏不强迫自动开启，失败显示状态；按钮焦点轮廓保留，长备注换行，forced-colors 有边框。

<a id="s6"></a>
## 6. 最小可运行示例

以下独立 HTML 可保存为个人 `keyboard-lab.html` 用浏览器打开，不需要扩展权限：

```html
<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><title>删除确认实验</title>
<style>:focus-visible{outline:3px solid Highlight}label{display:block}</style>
<body>
<label><input id="confirm" type="checkbox">确认删除本地实验数据</label>
<button id="remove" disabled>删除</button><p id="status" role="status" aria-live="polite">等待确认</p>
<script>
const confirm = document.querySelector('#confirm');
const remove = document.querySelector('#remove');
confirm.addEventListener('change', () => { remove.disabled = !confirm.checked; });
remove.addEventListener('click', () => {
  confirm.checked = false; remove.disabled = true;
  document.querySelector('#status').textContent = '实验删除完成';
  confirm.focus();
});
</script></body></html>
```

Tab 到 checkbox，Space 勾选，Tab 到按钮，Enter，预期状态改变且焦点回确认框。
这是普通网页可用的内联脚本，不可搬进扩展页；扩展入口必须外链脚本。
停止：关实验页；主线浏览器关闭、fixture `Ctrl+C`。不删除用户已有文件。

<a id="s7"></a>
## 7. 业务集成

[options HTML](../12-capstone/01-complete-project-rebuild.md#file-entrypoints-options-index-html)
设置 `manifest.open_in_tab=true`；[sidepanel 入口](../12-capstone/01-complete-project-rebuild.md#file-entrypoints-sidepanel-main-tsx)
复用 App。全部源码及 CSS 在 EX23，保存通过 SW 后 options GET 刷新。
主线删除后按钮重新禁用；本次自动化确认键盘存在可聚焦元素，不冒称全屏幕阅读器验证通过。

<a id="s8"></a>
## 8. 错误实验与排查

取消删除确认，按钮应禁用；删 label，仅在个人实验页观察键盘用户无法得知字段意义，随后恢复。
在 sidePanel open 前插入异步延迟，可能被浏览器拒绝；记录宿主错误并恢复直接调用。
若 options GET 被拒绝，检查授权是否错误禁止 sender.tab，而非加宽允许所有 URL。
Firefox 不支持 Chrome sidePanel 时应走编译分支，不进行 try-any-API 式静默吞错。

## 9. 课后思考与答案

1. 同一 HTML 可否证明侧栏一致？答案：只能证明 bundle，宿主开启、宽度、焦点仍分别验收。
2. 禁用按钮能替代授权吗？答案：不能；后台仍校验消息与 sender。
3. 为什么不自动删除导出文件？答案：扩展没有这些外部副本的生命周期所有权。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：完成纯键盘删除。答案：Tab→Space→Tab→Enter；未确认不能触发。
- 进阶：定义侧栏手测表。答案：直接工具栏动作、开启成功/拒绝、关闭再开、窄宽度、焦点可见。
- 故障注入：移除 sidePanel 权限。答案：Chrome 开启失败；恢复配置并检查生成 manifest，不以 Firefox 分支掩盖。

<a id="s11"></a>
## 11. 验收清单

- [ ] options 收到另一入口保存后的数据更新。
- [ ] 删除必须确认，完成后再次禁用。
- [ ] label、status、焦点与键盘操作存在。
- [ ] 区分 Chrome sidePanel 与 Firefox sidebar_action。
- [ ] 未实测宿主、阅读器项目明确记录。

## 12. 小结

共享数据逻辑，保留宿主区别；无障碍从原生语义与完整状态开始。

## 13. 扩展阅读

- [Chrome Options](https://developer.chrome.com/docs/extensions/develop/ui/options-page)
- [Chrome Side Panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel)
- [MDN sidebarAction](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/sidebarAction)

## 我现在能做到什么

能为三类 UI 建立相同持久合同与不同宿主验收，不用鼠标点击代替键盘证明。

## 单元导航

[上一页 EX03](01-action-popup-lifecycle.md) · [卷入口](../README.md) · [下一页 EX05](../03-worker-lifecycle/01-events-reconstruction.md)
