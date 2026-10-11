# EX05 后台事件：同步注册，异步重建

## 任务卡

120 分钟；前置 Promise、EX01；产出事件注册图、重建 repository 与失败响应记录。

## 1. 任务背景

MV3 后台不是永远存在的 Node 服务。浏览器唤醒 SW 是为了投递事件；
如果先 await 读配置再注册监听，冷启动时可能错过预期入口。

## 2. 学习目标

同步注册 runtime/alarm/install/startup；异步任务返回明确响应；
每次 worker 重建都能从 storage 恢复，不依赖模块缓存。

## 3. 前置知识与环境

EX23 完整工程和 EX24 测试；`npm run check`、`npm test`。
原生实验用 EX01 四文件，修改只在个人目录进行。

<a id="s4"></a>
## 4. 核心机制

监听器在模块/`defineBackground` 回调同步执行期注册；监听器内才发起异步 IO。
本卷 callback 消息监听返回字面量 `true`，告诉平台稍后 respond；它不是成功值，也不能永久保活。
repository 每次操作 read→migrate→change→write，唯一模块变量是调度队列。
`onInstalled` 是安装/更新，不是每次后台重启；`onStartup` 是浏览器 profile 启动。
顶层 ensureAlarm 补充检查 alarm 是否仍在，监听先注册，再做初始化。

## 5. 设计与步骤

schema→sender→当前 tab 复核→业务操作→统一响应。失败统一 `REQUEST_FAILED`，
内部测试使用明确异常判断，不将原始备注或消息输出日志。
权威数据只在 `market` key；UI 与 content 都不直接业务写 storage。

<a id="s6"></a>
## 6. 最小可运行示例

保存为个人 `rebuild.mjs`，完整纯 JS 实验不需要浏览器：

```js
import assert from 'node:assert/strict';
let durable = 0;
function newWorker() {
  const listeners = new Map();
  listeners.set('COUNT', async () => { durable += 1; return durable; });
  return message => {
    const handler = listeners.get(message);
    if (!handler) return Promise.reject(Error('TYPE'));
    return handler();
  };
}
let dispatch = newWorker();
assert.equal(await dispatch('COUNT'), 1);
dispatch = newWorker();
assert.equal(await dispatch('COUNT'), 2);
await assert.rejects(dispatch('DELETE'), /TYPE/);
console.log('reconstruction PASS');
```

运行 `node rebuild.mjs` 预期 PASS。这里 durable 是实验外部存储替身，不是实际 SW 全局；
真实 storage 恢复见 EX20。脚本结束无后台进程；关闭主线浏览器，停止 fixture。

<a id="s7"></a>
## 7. 业务集成

[完整 background](../12-capstone/01-complete-project-rebuild.md#file-entrypoints-background-ts)
包含同步注册、callback response、ensureAlarm、TRUSTED_CONTEXTS。
[repository](../12-capstone/01-complete-project-rebuild.md#file-shared-domain-ts)
允许旧队列失败后继续，冷启动新队列但重读持久状态。
TRUSTED_CONTEXTS 是支持该 API 的 Chrome 加固，不冒称 Firefox 一样提供。

<a id="s8"></a>
## 8. 错误实验与排查

在个人原生 worker 删除 `return true`，COUNT 可能在异步响应前通道关闭，popup 显示拒绝/不可用。
观察 popup 与 worker 两个控制台，恢复后重载复验；不要用不断 ping 掩盖生命周期。
把监听放到 `setTimeout` 内，冷启动事件可能早于注册；恢复同步注册。
若 worker 重启数据为零，检查是否误把 storage 值复制到模块变量后仅修改变量。

## 9. 课后思考与答案

1. `return true` 保证写一定完成？答案：不；它维持响应通道意图，写成功仍以 IO/响应为证。
2. 为什么初始化也检查 alarm？答案：alarm 可能消失，不能只相信曾安装过。
3. 内存队列合法吗？答案：只做当前 worker 调度，不承载业务真相；恢复靠持久 IO。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：标出同步行。答案：四类 addListener 同步；repo.get、ensureAlarm 异步。
- 进阶：设计失败序列。答案：write 拒绝→用户错误→后续 SAVE 成功→GET 校验，不让 rejected tail 永久阻塞。
- 故障注入：发送未知版本。答案：parser 拒绝、无 storage 写、明确失败响应；恢复 v1 成功。

<a id="s11"></a>
## 11. 验收清单

- [ ] 无初始化 await 包裹事件注册。
- [ ] 异步响应通道写法与目标平台兼容。
- [ ] worker 重建后从 storage 恢复。
- [ ] 失败队列可继续，不输出敏感输入。
- [ ] 不以定时 ping 保活。

## 12. 小结

事件注册决定是否能收到工作，持久 IO 决定恢复后知道什么。

## 13. 扩展阅读

- [Chrome SW 事件](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events)
- [Chrome Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)

## 我现在能做到什么

能分开同步入口与异步 IO，为终止重建建立明确响应合同。

## 单元导航

[上一页 EX04](../02-extension-ui/02-options-sidepanel-accessibility.md) · [卷入口](../README.md) · [下一页 EX06](02-termination-alarms-retention.md)
