# EX02 Isolated World：共享 DOM，不共享信任

## 任务卡

90 分钟；前置 EX01；产出两个世界的对照表、文本安全 sink 与伪造消息拒绝记录。

## 1. 任务背景

商品标题可能是 `<img ...>` 字符串；页面还能删除扩展插入的节点。isolated world 隔离的是
JS 全局环境，不是 DOM，也不是输入可信性。不能把“在扩展内执行”误解为“来自可信数据”。

## 2. 学习目标

区分 DOM 共享与 JS 隔离；不使用 MAIN world 提取内部对象；理解 shadow DOM 只是样式边界；
让恶意形状标题保持文本。

## 3. 前置知识与环境

安装 EX01 原生扩展，启动 EX23 的 fixture，目标页调用一次工具栏 action。
DevTools 必须先确认执行上下文：普通网页控制台与 popup 控制台不是同一世界。

<a id="s4"></a>
## 4. 核心机制

同一文档的 MAIN world 和扩展 ISOLATED world 有不同的 `window` 属性、原型环境；
DOM 节点仍由它们共同观察。页面看不到扩展闭包变量，却能改标题、移除标记。
shadow root 不提供秘密存储，`mode:'open'` 可被页面查到；即便 closed 也不应存秘密。
`postMessage` 不是身份认证，本卷不建网页→扩展特权桥。content 只能 REPORT，不能 GET/DELETE。

## 5. 设计与步骤

把公开 DOM 看作不可信输入：限定 origin/path → 只取 article 字段 → parser → 文本渲染 →
通过 runtime 向 SW 报告。所有特权动作只从扩展自己的固定 UI URL 发起。

<a id="s6"></a>
## 6. 最小可运行示例

先在目标网页控制台执行，仅设置实验布尔值：

```js
window.marketLabVisible = true;
document.querySelector('article h1').textContent = '<img src=x onerror=alert(1)>';
```

再在原生 popup 控制台运行完整探针。目标页必须仍是当前活动标签。

```js
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
if (new URL(tab.url).origin !== 'http://127.0.0.1:4173') throw Error('TARGET');
const [probe] = await chrome.scripting.executeScript({
  target: { tabId: tab.id, frameIds: [0] },
  world: 'ISOLATED',
  func: () => ({
    seesPageGlobal: window.marketLabVisible === true,
    publicTitle: document.querySelector('article h1')?.textContent,
  }),
});
document.querySelector('#status').textContent = JSON.stringify(probe.result);
```

预期 `seesPageGlobal:false`，标题仍是 `<img ...>` 文本，DOM 中没有新增图片。
刷新目标页清理布尔值与标题改动；关闭 popup 和独立浏览器，`Ctrl+C` 停 fixture。

<a id="s7"></a>
## 7. 业务集成

[content 全文件](../12-capstone/01-complete-project-rebuild.md#file-entrypoints-market-content-ts)
只使用 `textContent`，不 `innerHTML`，不读取表单或页面 JS。
[sender 授权](../12-capstone/01-complete-project-rebuild.md#file-shared-domain-ts)
拒绝 content 的 DELETE。读取公开标题并不需要绕过世界隔离或读取 cookies。

<a id="s8"></a>
## 8. 错误实验与排查

把探针 world 改为 MAIN，只观察布尔值，预期变 true；这证明隔离被主动跨越，而不是必须如此。
立即恢复 ISOLATED。另在主线目标页删除 `#neighbor-helper`，观察页面能改变共享 DOM；
刷新恢复标记。不要用真实恶意 HTML 去执行注入，错误 sink 可用 DOM 节点数量断言说明风险。
若标题不更新，检查 DevTools 是否在 iframe 或 popup，而不是目标顶层文档。

## 9. 课后思考与答案

1. shadow DOM 可否保护备注？答案：不能；备注应在扩展 storage 和 UI，不放页面 DOM。
2. 页面标题包含 HTML 是否一定 XSS？答案：取决于 sink；文本 sink 不解析标签。
3. 为什么不用页面的商品全局变量？答案：扩大耦合和信任面，公开 DOM 足够完成任务。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：重复探针。答案：ISOLATED false、MAIN true、两者读到相同标题。
- 进阶：画信任边界。答案：页面字符串→parser→Item；content REPORT→sender gate；UI SAVE→storage 单写者。
- 故障注入：content 发 DELETE。答案：主线响应 `{ok:false,error:'REQUEST_FAILED'}`，数据不删除，见 EX20 实测。

<a id="s11"></a>
## 11. 验收清单

- [ ] 记录两个 world 的差异而非仅截图。
- [ ] 标题按文本显示，无新增 img。
- [ ] 能解释 DOM 共享和 shadow 非秘密边界。
- [ ] 未引入 postMessage 特权桥或 MAIN 抓内部数据。
- [ ] 实验修改通过刷新清理。

## 12. 小结

isolated world 缩小运行环境耦合，但输入校验、sender 校验和文本 sink 仍是独立责任。

## 13. 扩展阅读

- [Chrome Content Scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [ExecutionWorld](https://developer.chrome.com/docs/extensions/reference/api/scripting#type-ExecutionWorld)
- [MDN Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM)

## 我现在能做到什么

能用实验区分执行隔离与数据可信性，并避免不必要的跨世界桥。

## 单元导航

[上一页 EX01](01-native-mv3-process-origin.md) · [卷入口](../README.md) · [下一页 EX03](../02-extension-ui/01-action-popup-lifecycle.md)
