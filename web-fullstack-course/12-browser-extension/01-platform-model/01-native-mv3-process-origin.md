# EX01 原生 MV3：安装、进程与 Origin

## 任务卡

90–120 分钟；前置 DOM、Promise、HTTP origin；产出原生四文件扩展、一次安装记录与进程职责表。只使用独立浏览器 profile。

## 1. 任务背景

邻里集市助手必须从一个没有框架的扩展开始。普通网页无法调用扩展存储或在其他标签页执行代码；
扩展也不能因为安装了就读取所有网页。先建立权限、origin 与入口之间的合同，再加入 React。

## 2. 学习目标

能解释 manifest、popup、content script、service worker 的职责；安装未打包扩展；
验证 popup 重建后计数仍在；只读取回环商品页公开标题，不读取表单与账号信息。

## 3. 前置知识与环境

Chrome/Chromium ≥120；本次实际版本见 [基线](../BASELINE.md)。原生文件不需要 npm。
新建个人练习目录 `native`，四文件如下。演示页服务器完整源码在
[EX23 fixture](../12-capstone/01-complete-project-rebuild.md#file-fixtures-server-mjs)；
从该文件启动 `node fixtures/server.mjs`，访问 `http://127.0.0.1:4173/items/lamp`。

<a id="s4"></a>
## 4. 核心机制

| 上下文 | 能力 | 不能作为权威状态的部分 |
|---|---|---|
| 网页主世界 | 页面 DOM、页面自己的 JS | 页面提供的字符串不可信 |
| content isolated world | 共享 DOM、受限扩展 API | 不能直接读取页面 JS 变量 |
| popup 扩展页 | DOM、消息、扩展 API | 关闭即销毁，表单状态会丢失 |
| MV3 SW | 事件、消息、存储 | 无 document；空闲会停止 |

origin 为协议、主机、端口的组合。`localhost:4173` 与 `127.0.0.1:4173` 不同；
manifest host 匹配不是业务 URL parser，后者还要检查路径与端口。
`activeTab` 是用户调用 action 后对当前标签的临时授权，不是持续扫描授权。

## 5. 设计与步骤

先加载四文件；再单次计数；关闭 popup 再打开；最后在目标页通过工具栏读取标题。
存储使用 `chrome.storage.local`，不是 popup 的 `localStorage`。原生计数仅演示串行用户动作，
不承诺多 popup 并发写一致性；并发设计在 [EX11](../06-storage-data/01-quota-single-writer.md)。

<a id="s6"></a>
## 6. 最小可运行示例

以下是完整四文件。禁止将脚本改为远程 URL 或内联事件处理器。

<a id="file-native-manifest-json"></a>
### native/manifest.json

<!-- file: native/manifest.json -->
```json
{
  "manifest_version": 3,
  "name": "Market Native Lab",
  "version": "1.0.0",
  "minimum_chrome_version": "120",
  "permissions": ["storage", "activeTab", "scripting", "alarms"],
  "background": { "service_worker": "worker.js" },
  "action": { "default_popup": "popup.html" },
  "content_security_policy": { "extension_pages": "script-src 'self'; object-src 'self'" }
}
```

<a id="file-native-worker-js"></a>
### native/worker.js

<!-- file: native/worker.js -->
```js
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL('popup.html') ||
      !message || message.type !== 'COUNT' || Object.keys(message).length !== 1) {
    respond({ ok: false }); return false;
  }
  void chrome.storage.local.get('count').then(async data => {
    const count = Number.isSafeInteger(data.count) ? data.count : 0;
    await chrome.storage.local.set({ count: count + 1 });
    respond({ ok: true, count: count + 1 });
  }, () => respond({ ok: false }));
  return true;
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'lab') console.info('LAB_ALARM');
});
chrome.runtime.onInstalled.addListener(() => {
  void chrome.alarms.create('lab', { periodInMinutes: 1 });
});
```

<a id="file-native-popup-html"></a>
### native/popup.html

<!-- file: native/popup.html -->
```html
<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Market Native Lab</title>
<body><button id="read">Read public title</button><button id="count">Count once</button>
<p id="status" role="status"></p><script src="popup.js"></script></body></html>
```

<a id="file-native-popup-js"></a>
### native/popup.js

<!-- file: native/popup.js -->
```js
const status = document.querySelector('#status');
const countButton = document.querySelector('#count');
countButton.addEventListener('click', async () => {
  countButton.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'COUNT' });
    status.textContent = response?.ok ? `Count ${response.count}` : 'Count rejected';
  } catch { status.textContent = 'Worker unavailable'; }
  finally { countButton.disabled = false; }
});
document.querySelector('#read').addEventListener('click', async () => {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab.url);
    if (url.origin !== 'http://127.0.0.1:4173' || !/^\/items\/[a-z0-9-]+$/.test(url.pathname)) {
      throw Error('Target only');
    }
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      func: () => {
        if (location.origin !== 'http://127.0.0.1:4173') return null;
        return document.querySelector('article[data-market-item] h1')?.textContent ?? null;
      },
    });
    if (typeof result.result !== 'string' || result.result.length > 120) throw Error('Invalid public title');
    status.textContent = result.result;
  } catch { status.textContent = 'Open target and invoke toolbar action'; }
});
```

在独立 Chrome 打开 `chrome://extensions`，启用开发者模式，加载 `native` 目录。
点击 `Count once` 预期 `Count 1`；关闭再打开点击预期 `Count 2`。
目标页点击工具栏，再点 `Read public title`，恶意形状标题应显示为文本，而不是图片。
自动安装烟测完整源码见 [EX24](../12-capstone/02-five-path-acceptance.md#file-tests-native-mjs)。
停止：关独立浏览器，终端 `Ctrl+C` 停 fixture；从扩展管理页移除练习扩展，清理自己创建的 profile。

<a id="s7"></a>
## 7. 业务集成

原生例子没有保存商品或备注；其计数不是业务 Listing。
WXT 主线使用 `Item {id,title,priceCents,url}` 公开投影，SW 单写者替代原生计数写法。
后续只在扩展 UI 输入备注；页面标题使用 `textContent`，原生演示也遵守这个边界。

<a id="s8"></a>
## 8. 错误实验与排查

| 注入错误 | 现象与证据 | 原因 | 修复与复验 |
|---|---|---|---|
| manifest 拼错 `service_worker` | 扩展管理页加载报错 | 平台入口不可识别 | 恢复字段，重新加载 |
| popup 使用内联 `<script>` | 控制台 CSP 拒绝 | 扩展页脚本只能本地外链 | 恢复 popup.js，再点击 |
| 打开 `localhost:4173` | 状态提示目标限制 | origin 不等价 | 回到 127.0.0.1，再调用 action |
| 把 count 仅存在模块变量 | 重载后台后归零 | SW 内存不持久 | 恢复 storage，再停 SW 复验 |

实验记录必须包含触发步骤与具体状态，不写“可能坏了”。

## 9. 课后思考与答案

1. 为什么 popup 刷新不是扩展重装？答案：HTML 上下文重建，extension ID 和 storage 区仍在。
2. 为什么 SW 不能 querySelector？答案：它不是文档上下文；DOM 操作应在 popup 或 content script。
3. 权限列表是否证明业务授权？答案：只证明平台能力；业务 parser 和用户意图仍须核对。

<a id="s10"></a>
## 10. 分层练习与参考答案

- 基础：删掉 `alarms` 后观察错误。答案：创建 alarm 失败；既用该 API，就恢复声明或移除相关能力，两者需一致。
- 进阶：画一次 COUNT 时序。答案：popup → runtime message → SW 校验 sender → storage read/set → response → 文本状态。
- 故障注入：向 COUNT 加 `tabId`。答案：`Object.keys` 长度检查拒绝，计数不变；不能信任消息中的标签 ID。

<a id="s11"></a>
## 11. 验收清单

- [ ] 四文件可安装，没有远程代码。
- [ ] 计数 1→2，关闭 popup 不丢持久计数。
- [ ] 仅目标公开标题可读，错误 origin 被拒绝。
- [ ] 记录 SW 不具备 DOM、popup 不持久这两条边界。
- [ ] 关闭浏览器和 fixture，移除独立实验扩展。

## 12. 小结

manifest 决定平台入口与能力，业务代码决定允许的数据范围；两者都不能省略。
不要先用框架隐藏生命周期，再试图补权限模型。

## 13. 扩展阅读

- [Chrome Hello World](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)
- [Chrome 架构与核心概念](https://developer.chrome.com/docs/extensions/develop#core-concepts)
- [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)

## 我现在能做到什么

能从零安装原生 MV3、追踪跨上下文消息，并用持久存储替代易失内存。

## 单元导航

[卷入口](../README.md) · [下一篇 EX02](02-isolated-world-trust-boundaries.md)
