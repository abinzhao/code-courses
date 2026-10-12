# 页面生命周期、bfcache 与资源调度

<!-- course-meta:start -->
> - 层级：L0，代码实验在 L1 事件与 Fetch 后完成
> - 先修：[布局绘制合成](./03-布局-绘制-合成流水线.md)、[DOM 事件](../../L1-JavaScript与TypeScript/01-JavaScript语法核心/06-DOM事件与事件委托.md)
> - 建议用时：150 分钟
> - 一手资料：[Page Lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)、[bfcache](https://web.dev/articles/bfcache)
<!-- course-meta:end -->

## 学习目标

- 能区分 HTTP 缓存、Service Worker 缓存与 bfcache。
- 能在页面隐藏时保存草稿，在历史恢复后重新校验业务数据。
- 能解释脚本、字体和图片资源对首屏的影响。

## 内容讲解

### 1. 导航的三种结果

同文档导航（如 hash 更新）可能不重新创建文档；普通导航创建新文档；后退/前进可能从 bfcache 恢复冻结的 DOM 和 JavaScript 堆。

bfcache 是浏览器保存页面运行状态的优化，不是 HTTP 响应缓存，也不由 `Cache-Control: max-age` 直接控制。是否命中取决于浏览器版本、页面能力和资源约束，不能要求所有访问都命中。

```text
活动页面 → hidden → 可能 frozen / 被丢弃
普通导航 → pagehide → 可能进入 bfcache
历史恢复 → pageshow(persisted=true) → 恢复冻结页面
```

标签页关闭、系统杀进程和移动端回收不保证派发最后事件。不能把数据保存只放进 `unload`。

### 2. 可复制的草稿保存

页面需提供 `textarea#draft` 与 `p#status`：

```js
const draft = document.querySelector('#draft');
const status = document.querySelector('#status');
const key = 'atlas:draft:v1';

try {
  draft.value = localStorage.getItem(key) ?? '';
} catch {
  status.textContent = '本地存储不可用，请手动导出草稿';
}

function save() {
  try {
    localStorage.setItem(key, draft.value);
    status.textContent = '草稿已保存到本机';
  } catch {
    status.textContent = '保存失败，请复制或导出草稿';
  }
}

// 输入时已保存，生命周期事件只作补充，不能作唯一保障。
draft.addEventListener('input', save);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
});
window.addEventListener('pagehide', save);
window.addEventListener('pageshow', (event) => {
  console.log('从历史快照恢复：', event.persisted);
  // 实际项目在此重新校验登录、权限、版本与服务器变更。
});
```

localStorage 同步写入适合这个小草稿实验；大文档使用 IndexedDB，并按变化节流，不能每次按键序列化完整数据库。

### 3. 冻结后的业务校验

从历史恢复的管理页面可能仍显示旧角色、已撤销会话和过期列表。恢复时重新请求身份与关键资源，服务端每次写操作仍应鉴权。

后台轮询在 hidden 时暂停，在 visible 时重新同步。不要假设 `setInterval` 在后台保持精确间隔。执行一次 poll 后再安排下一次可避免请求重叠。

长连接、数据库连接、锁和未完成任务应按所属资源在生命周期变化时释放或重建。具体能力是否阻碍 bfcache 要在目标浏览器测量，不能机械归类为“永远不能缓存”。

### 4. 资源调度

| 机制 | 适用情形 | 常见浪费 |
|---|---|---|
| `defer` | 外部经典脚本，解析后按序执行 | 与 async 混用后误以为顺序不变 |
| `type="module"` | 模块及依赖图，默认延后执行 | 未考虑跨源 CORS 与 MIME |
| `preload` | 本导航确定会用到的关键资源 | as、URL 或凭据不匹配导致重复下载 |
| `modulepreload` | 提前准备模块依赖 | 预加载所有路由与首屏竞争 |
| `preconnect` | 确定会访问的远端连接 | 给大量无关域建立连接 |
| `fetchpriority="high"` | 关键首屏图片的提示 | 给所有图片 high，失去优先级差异 |
| `loading="lazy"` | 首屏以下图片/iframe | 首屏 LCP 图片被延迟 |

浏览器保留调度权，优先级属性是提示。通过 Network 的 Initiator、Priority、Timing 与 Performance 时间线确认是否缩短关键路径。

## 常见问题

**sendBeacon 是否保证保存成功？** 返回 true 表示进入发送队列，不保证服务端接收；不能用它作唯一可靠写入协议。

**能否在 unload 中做异步 Fetch？** 关闭时机和执行不可靠，优先提前保存与可重试协议。

**如何判断 bfcache 命中？** 看 `pageshow.persisted`，结合 DevTools 的 Back/forward cache 检查；普通 HTTP 缓存命中不能替代此证据。

## 实操作业

1. 基础：输入草稿、切换标签页、刷新，确认保存和失败提示。
2. 进阶：在两个本地页面间前进后退，记录 pageshow、pagehide 与 persisted。
3. 挑战：给首屏图片添加尺寸与高优先级，对非首屏图片懒加载，在相同网络条件测量。

### 参考答案与验收

- 草稿应在输入后就被保存，而不是等待关闭；存储异常必须向用户提供导出路径。
- bfcache 恢复应触发身份/列表同步，不能把快照中的“已登录”当成鉴权。
- 报告至少包含一次命中或未命中的实际原因；优化比较使用相同设备、网络和内容。

<!-- atlas-task:start -->
## Atlas 项目任务

为 Atlas 加入草稿与恢复后同步，记录后台暂停和历史返回路径。验收草稿不依赖 unload，恢复页面不能绕过服务端权限。见 [L0 里程碑](../../projects/atlas/milestones/L0.md)。
<!-- atlas-task:end -->

---

## 本节小结

生命周期事件是恢复与资源管理信号，不能提供最终写入保证。资源提示必须服务于实测关键路径。

<!-- course-nav:start -->
---

[上一篇：来源隔离、CORS 与跨窗口通信](./05-来源隔离-CORS与跨窗口通信.md) · [课程地图](../../README.md) · [下一篇：IndexedDB、配额与离线数据](./07-IndexedDB-配额与离线数据.md)
<!-- course-nav:end -->
