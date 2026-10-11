# EX03 Action 与 Popup：用户动作、重建和异步状态

## 任务卡

120 分钟；前置 EX01、React Hooks；产出可反复打开的 popup、忙碌/失败状态及关闭重开记录。

## 1. 任务背景

工具栏按钮是临时授权的入口，popup 是短命文档。用户读取后点击网页就可能关闭 popup。
若把保存中的 Promise、未保存备注或商品列表仅存在组件内，不能承诺关闭后继续。

## 2. 学习目标

理解 action 与 popup 的配置；从持久存储重建 UI；处理请求失败、重复点击与组件卸载；
区分“已读取”“已保存”“已导出请求”。

## 3. 前置知识与环境

最小实验用 EX01 四文件；主线在 EX23 完整重建并运行 `npm install`、
`npm run build:chrome` 后加载 `.output/chrome-mv3`。fixture 使用独立终端。

<a id="s4"></a>
## 4. 核心机制

`action.default_popup` 有值时，用户点击会打开文档，不能同时假设 `action.onClicked` 是主入口。
popup 关闭使 React 树、事件监听和组件内状态消失；后台也不能依赖这个文档持续存在。
`useEffect` 中 GET 是重建；`storage.onChanged` 是失效通知，应再读权威数据，而非拿局部事件拼状态。
事件 cleanup 和 `alive` 防止卸载后的 UI 更新；它们不撤销已经提交给 SW 的 SAVE。

## 5. 设计与步骤

UI 读取当前商品后允许输入备注；SAVE 只有收到成功响应才显示成功；错误不假装保存。
busy 禁止重复提交，删除还需确认。未保存备注会随 popup 关闭丢失，这是明确的产品边界，
不是把敏感备注自动写网页或无授权后台保存的理由。

<a id="s6"></a>
## 6. 最小可运行示例

完整替换 EX01 个人练习目录的 `popup.js`，只保留计数重建实验：

```js
const button = document.querySelector('#count');
const status = document.querySelector('#status');
let alive = true;
window.addEventListener('pagehide', () => { alive = false; }, { once: true });
async function load() {
  try {
    const data = await chrome.storage.local.get('count');
    if (alive) status.textContent = `Stored ${data.count ?? 0}`;
  } catch { if (alive) status.textContent = 'Read failed'; }
}
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    const result = await chrome.runtime.sendMessage({ type: 'COUNT' });
    if (!result?.ok) throw Error('REJECTED');
    if (alive) status.textContent = `Stored ${result.count}`;
  } catch { if (alive) status.textContent = 'Save failed'; }
  finally { if (alive) button.disabled = false; }
});
void load();
```

重新加载原生扩展，计数后关闭再开，预期读取同一 Stored 值。该实验未覆盖 Read 按钮，
恢复 EX01 popup.js 后再做公开读取。停止：关闭独立浏览器和 fixture，移除练习扩展。

<a id="s7"></a>
## 7. 业务集成

[完整 App](../12-capstone/01-complete-project-rebuild.md#file-shared-app-tsx) 有 GET、run、status、
storage listener 和 cleanup；[popup 入口](../12-capstone/01-complete-project-rebuild.md#file-entrypoints-popup-main-tsx)
只 render `<App mode="popup" />`。React 文本插值不解析标题与备注的 HTML。
读取先固定 tab URL，脚本完成后再次 `tabs.get`，导航竞争时要求重读。

<a id="s8"></a>
## 8. 错误实验与排查

输入未保存备注再点击网页，重新打开预期备注草稿消失；保存后再打开，列表应有备注。
把 worker COUNT schema 改坏，预期 Save failed 而不是 Stored；恢复后重试。
若主线 Read 失败，检查目标页是否活动、是否真的调用工具栏 action、URL 是否符合合同。
自动化把 bundle 开在标签页能验证业务 UI，但不能证明宿主 popup 关闭和尺寸，须单独手测。

## 9. 课后思考与答案

1. UI 卸载是否取消 SAVE？答案：不一定；响应未知时应重开后 GET 核对，不能盲目重试产生重复作用。
2. storage change 是权威快照吗？答案：不是；后台 GET 负责迁移与校验。
3. 为何不展示原始异常详情？答案：公开 UI 使用可行动错误，内部码不泄露数据；测试定位在 SW。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：关闭重开三次。答案：每次 GET 重建，已保存项不重复。
- 进阶：设计草稿能力但不实现。答案：需明确自动保存意图、作用域、保留和删除规则，不能偷偷扩大需求。
- 故障注入：断开 worker 响应。答案：记录失败状态与已持久数据；先 GET 核对再人工重试。

<a id="s11"></a>
## 11. 验收清单

- [ ] 成功、读取失败、保存失败、busy 都有可见状态。
- [ ] 持久项关闭重开仍在，草稿边界明确。
- [ ] cleanup 移除 storage listener。
- [ ] 恶意形状标题仍为文本。
- [ ] 区分 bundle 标签测试与宿主 popup 手测。

## 12. 小结

popup 是展示与用户意图的入口，不是数据生命周期的所有者。

## 13. 扩展阅读

- [Chrome Action](https://developer.chrome.com/docs/extensions/reference/api/action)
- [Popup](https://developer.chrome.com/docs/extensions/develop/ui/add-popup)
- [React useEffect](https://react.dev/reference/react/useEffect)

## 我现在能做到什么

能设计可重建的短命 UI，不用 UI 内存承诺持久成功。

## 单元导航

[上一页 EX02](../01-platform-model/02-isolated-world-trust-boundaries.md) · [卷入口](../README.md) · [下一页 EX04](02-options-sidepanel-accessibility.md)
