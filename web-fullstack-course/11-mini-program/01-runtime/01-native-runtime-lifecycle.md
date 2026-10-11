# MP-01 原生双层运行时：页面不是浏览器标签

## 任务卡

- 任务：记录冷启动、隐藏、返回与销毁，解释每项回调的资源边界。
- 产出：独立原生实验 `native-life/` 的四个完整文件及一张轨迹表。
- 运行：微信开发者工具；本实验没有网络、登录或真实用户数据。
- 证据：`launch → app show → load → show → ready` 与后台恢复轨迹。
- 边界：工具轨迹不保证真机调度时间；不调用 DOM、localStorage 或 Node API。

## 1. 任务背景

Web 应用常把“离开页面”理解为组件卸载。小程序 `navigateTo` 会保留原页面，原页面先
`onHide`，返回时 `onShow`，并不会再次 `onLoad`。若在每次 show 发出预约 POST，
用户切到后台再回来就可能重复提交。

## 2. 学习目标

能区分 App、Page 与组件实例，解释逻辑层/视图层通信，建立启动记录而不收集身份信息；
能预测后台、返回与关闭时哪些状态保留，哪些资源需要重建。

## 3. 预备知识

理解函数、对象与闭包。建立全新的个人实验目录，不与 Taro 产物混用。工具项目 AppID
使用自己的测试账号配置；下面 `app.json` 是应用配置，不是账号配置。

<a id="s4"></a>
## 4. 核心理论

### 4.1 两层之间不是共享 DOM

逻辑层负责 JavaScript 与业务状态，视图层负责模板渲染。`setData` 提交可序列化补丁，
跨边界后才能影响显示。直接 `this.data.count++` 只改逻辑对象，不构成可靠视图更新。
两层之间有序列化和调度成本，不能将巨大对象、函数、循环引用当视图状态。

### 4.2 三类生命周期

App 的 `onLaunch` 面向一次应用实例启动，`onShow/onHide` 面向前后台。
Page 的 `onLoad` 初始化路由输入，`onShow` 恢复可见工作，`onReady` 表示首轮渲染完成，
`onHide` 停止可见资源，`onUnload` 永久释放此页面实例。`onHide` 不保证随后卸载。
操作系统可能终止进程，不能依赖“最后一次 unload”才保存草稿。

### 4.3 参数和全局状态

启动参数与页面参数都来自不可信外部输入。分享链接也能冷启动，不能假设用户已经
从列表走过来。App 内存适合实例级协调，不是持久存储，不是业务授权。

## 5. API 清单

| API | 用途 | 禁止推断 |
| --- | --- | --- |
| `App` | 应用实例回调 | show 不代表重新登录 |
| `Page` | 页面实例与数据 | hide 不代表销毁 |
| `setData` | 数据补丁与完成回调 | 回调不证明网络提交 |
| `onLoad(options)` | 首次路由输入 | options 不可信 |
| `onReady` | 首轮视图完成 | 不等于所有异步任务完成 |

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `native-life/app.json`：

```json
{"pages":["pages/index/index"],"window":{"navigationBarTitleText":"生命周期实验"}}
```

完整文件 `native-life/app.js`：

```js
App({
  onLaunch() { console.info("app launch"); },
  onShow() { console.info("app show"); },
  onHide() { console.info("app hide"); }
});
```

完整文件 `native-life/pages/index/index.js`：

```js
Page({
  data: { count: 0, phase: "created" },
  onLoad() { console.info("page load"); },
  onShow() {
    console.info("page show");
    this.setData({ phase: "visible" });
  },
  onReady() { console.info("page ready"); },
  onHide() { console.info("page hide"); },
  onUnload() { console.info("page unload"); },
  increment() {
    const count = this.data.count + 1;
    this.setData({ count }, () => console.info("view update", count));
  }
});
```

完整文件 `native-life/pages/index/index.wxml`：

```xml
<view>{{phase}} / {{count}}</view>
<button bindtap="increment">增加一次</button>
```

导入实验目录，编译后点两次按钮，预期显示 `visible / 2`。切后台再返回，预期 count
仍为 2，出现 hide/show，不应出现第二次 load。工具重新编译会创建新实例，count 归零。
停止实验时关闭项目；无服务进程与持久数据需要清理。

<a id="s7"></a>
## 7. 邻里集市集成案例

将页面阶段用于列表：load 解析 `q`，show 发起只读刷新，hide 取消列表读取，
unload 使所有任务代次失效。预约只能由用户明确点击提交，不能从 show 自动发起。
草稿随有效编辑保存，而不是只在 unload 保存。MP-02 提供完整资源控制器，
MP-24 的 `useDidShow/useDidHide` 展示 Taro 对应关系。

分享详情恢复顺序为：解析 ID → 读取权威 Listing → 根据身份启用预约；
缺失身份只影响写操作，不将整个公开详情伪装成“加载失败”。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：将 `setData({ count })` 改成 `this.data.count = count`。
现象是 Console 值增加但视图不可靠更新。证据同时保存逻辑值和界面截图；
根因是跳过通信边界；恢复 setData，重新点两次复验。

第二实验：把预约日志放到 onShow，后台返回会再次输出。不要以防抖掩盖生命周期错误；
移到明确点击事件，服务端仍须幂等。只记录阶段和计数，不输出启动参数中可能含的身份信息。

## 9. 课后题

1. hide 后对象是否必然丢失？答案：否，返回栈中的实例可保留。
2. ready 能说明预约成功吗？答案：只表示首轮渲染，成功须读服务端结果。
3. 为什么编辑时保存草稿？答案：进程可能被终止，最终回调不是持久化保证。

<a id="s10"></a>
## 10. 实践练习

- 基础：增加 `reset`。参考答案：事件中 `this.setData({ count: 0 })`，视图立即回到 0。
- 进阶：统计可见次数。参考答案：独立 `shows` 字段，在 onShow 执行 setData，
  不将它当访问量或唯一用户统计；后台返回应增加而 load 不增加。
- 故障注入：把 DOM 查询放进 onReady。参考答案：观察 `document` 不存在，
  删除浏览器 API；平台节点查询使用平台 selector query，且不能拿它替代业务状态。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 四文件可导入，按钮两次后显示 2。
- [ ] 记录冷启和后台恢复，load 与 show 没有混淆。
- [ ] 明确工具重编译与真实后台恢复不是同一操作。
- [ ] 故障实验具有现象、证据、原因、修复、复验。
- [ ] 不宣称已验证真机终止、基础库差异或真实写事务。

## 12. 常见问题

React effect 是否等于 onShow？不是。挂载与可见是不同轴，保留页面可能只隐藏。
App 全局对象是否适合保存 Token？只能暂存业务会话，安全边界仍由服务端与平台存储策略保证。

## 13. 扩展阅读

核对日期 2026-10-12。
[微信页面生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/page-life-cycle.html)、
[小程序运行机制](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/operating-mechanism.html)。
本文未实际运行开发者工具或真机，实际证据见本卷自检。

## 我现在能做到什么

我能解释显示、隐藏和销毁的差异，把只读恢复与用户写操作放在正确生命周期。

## 单元导航

[上一单元：本卷环境](../README.md) ·
[下一单元：资源所有权](02-page-component-ownership.md) · [本卷](../README.md)
