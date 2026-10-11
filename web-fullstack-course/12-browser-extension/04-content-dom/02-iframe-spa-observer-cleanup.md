# EX08 Iframe、SPA 与 Observer：更新和清理必须成对

## 任务卡

120 分钟；前置 EX07；产出顶层注入、SPA 更新、去重与 invalidation cleanup 记录。

## 1. 任务背景

SPA 切换商品不会总触发文档重新加载；iframe 则有自己的文档和 sender.frameId。
只在 document_idle 读取一次会留下旧标题，allFrames 注入又会扩大读取范围。

## 2. 学习目标

限定顶层 frame；监听公开 DOM 变化和历史返回；避免 observer 观察自己的写入；
释放监听、observer 和标记，理解仅 URL 变化的覆盖限制。

## 3. 前置知识与环境

完整 content 在 EX23，fixture 有一层 iframe 和 SPA next item 按钮。
加载主线后通过 optional host 重新加载目标页，或 EX24 隔离测试临时 executeScript。

<a id="s4"></a>
## 4. 核心机制

`allFrames:false` 限定注入目标，代码再检查 `window.top===window`；后台复核 `frameId===0`。
MutationObserver 合并 DOM 批次，microtask 去重；只改变 history.pushState 不会自动触发 popstate。
本 fixture pushState 后改公开 article，因此 DOM observer 能刷新；返回键触发 popstate。
这不是任意 SPA router 的通用方案：纯 URL 变化无 DOM 更新可能不刷新，应另接路由事件或有限重检。
WXT ctx invalidation cleanup 防止开发重载遗留监听；浏览器移除权限不会让旧文档代码立刻蒸发。

## 5. 设计与步骤

先做一个独立 observer 实验，再看完整 content。主线 last JSON 去重；自己 marker 的变化不触发新采集。
shadow 中 status 只是展示，不存备注；iframe 被排除；无支持 article 显示 unsupported。

<a id="s6"></a>
## 6. 最小可运行示例

在目标页控制台运行完整可清理实验，不涉及扩展权限：

```js
let runs = 0;
let queued = false;
const observed = document.querySelector('article');
const observer = new MutationObserver(() => {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    runs += 1;
    console.log('public title', observed.querySelector('h1').textContent, runs);
  });
});
observer.observe(observed, { subtree: true, childList: true, characterData: true, attributes: true });
window.stopMarketLab = () => { observer.disconnect(); delete window.stopMarketLab; };
```

点 SPA next item，预期打印 Book shelf；调用 `window.stopMarketLab()`，再改 DOM 不应打印。
刷新清理控制台实验；主线关闭独立浏览器、fixture `Ctrl+C`。不要把每次 mutation 记录完整 DOM。

<a id="s7"></a>
## 7. 业务集成

[完整 content](../12-capstone/01-complete-project-rebuild.md#file-entrypoints-market-content-ts)
用 ctx.addEventListener 注册 popstate/pageshow，ctx.onInvalidated 断 observer、移除 marker。
EX24 浏览器脚本验证顶层有 marker、iframe 无 marker、SPA 更新 Book shelf。
sender.url 可能仍是最初注入文档 URL，授权要看 origin 与当前 tab，详见 EX10。

<a id="s8"></a>
## 8. 错误实验与排查

把刷新写入放到被观察 article 内，且无 last 去重，容易形成反复 mutation；记录计数后停止 observer。
恢复外部 marker、去重和自写过滤，复验一次 SPA 只产生稳定展示。
把 allFrames 改 true 只是错误实验，不得保留；后台仍拒绝 frameId≠0。
如果 SPA URL 变了但标题没变，先核对路由是否改 DOM，不宣称 observer 能捕获 pushState 本身。

## 9. 课后思考与答案

1. 为什么不是所有 mutation 都采集？答案：自写变化、重复批次无新业务值，应过滤与去重。
2. 不注入 iframe 是否足够授权？答案：不，消息层也复核 frameId。
3. revoke 后如何清旧脚本？答案：解除注册和权限后刷新已有页面；ctx invalidation 不是通用权限撤销通知。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：停止 observer 再点击。答案：不再打印，证明 cleanup 可观察。
- 进阶：定义纯 URL SPA 的边界。答案：另定路由事件合同；不改 MAIN history 原型来偷渡页面桥。
- 故障注入：移除 article。答案：主线显示 unsupported，last 清空；恢复合法 article 可再次报告。

<a id="s11"></a>
## 11. 验收清单

- [ ] 顶层有标记，iframe 无标记。
- [ ] fixture SPA 标题更新，重复值去重。
- [ ] cleanup 后无 observer 输出。
- [ ] 明确纯 pushState 的未覆盖边界。
- [ ] 无 page form 或全 DOM 日志。

## 12. 小结

注入、更新与清理是同一个生命周期合同，不是三个独立小技巧。

## 13. 扩展阅读

- [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [History pushState](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)
- [WXT Content Scripts](https://wxt.dev/guide/essentials/content-scripts)

## 我现在能做到什么

能在限定 frame 与 SPA 合同内维护展示，并说明不支持的路由形态。

## 单元导航

[上一页 EX07](01-public-dom-parser.md) · [卷入口](../README.md) · [下一页 EX09](../05-message-contract/01-schema-response-errors.md)
