# MP-02 页面与组件资源所有权：取消不等于结果失效

## 任务卡

- 任务：用手动 Promise 证明隐藏、重新显示与销毁后的迟到响应不能覆盖状态。
- 产出：独立 `owner.mjs`、`owner.test.mjs`；原生组件接线说明。
- 运行：`node --test owner.test.mjs`，不使用任意睡眠。
- 证据：2 项测试通过；删除代次守卫后出现旧结果。
- 边界：Node 只验证控制器，平台回调仍须工具与真机验证。

## 1. 任务背景

详情页被新页面覆盖时仍存在，图片预览又可能造成短暂隐藏。一次请求 abort 不能证明服务端
停止，也不能证明 Promise 不再完成。资源的拥有者必须决定谁还能提交可见结果。

## 2. 学习目标

区分暂停与永久释放；建立代次守卫；理解 Component 的 attached、ready、detached 和
pageLifetimes.show/hide；避免在多处释放同一订阅造成不可恢复。

## 3. 预备知识

阅读 MP-01 与现存 JS 确定性测试教程。两个文件放同一目录，Node >=18；
AbortController 是控制边界，不把平台 RequestTask 当浏览器 fetch。

<a id="s4"></a>
## 4. 核心理论

组件 attached 表示进入节点树，ready 表示布局完成，detached 表示离开节点树。
组件的 pageLifetimes 处理所属页面显示/隐藏，不能假设 attached 每次返回都运行。
页面拥有读取任务；组件拥有自己的监听、计时器和观察器。避免 App 全局保存页面实例。

隐藏时暂停并使旧任务失效，显示时创建新任务。销毁后永久禁止 start。abort 节约资源，
generation 保证即使取消被忽略也不会呈现旧结果。finally 只能清理本任务拥有的句柄，
不能无条件设置 idle 覆盖新任务的 success。

## 5. API 清单

| 项目 | 契约 |
| --- | --- |
| `start()` | 当前可见代次读取 |
| `pause()` | 暂停、递增代次、发出取消 |
| `dispose()` | 幂等永久释放 |
| `lifetimes.detached` | 组件自身释放 |
| `pageLifetimes.hide` | 暂停页面可见工作 |

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `owner.mjs`：

```js
export function createOwner(read, show) {
  let epoch = 0;
  let active;
  let dead = false;
  const pause = () => { epoch++; active?.abort(); active = undefined; };
  return {
    async start() {
      if (dead) throw new Error("disposed");
      pause();
      const current = epoch;
      const controller = new AbortController();
      active = controller;
      show("loading");
      try {
        const value = await read(controller.signal);
        if (current === epoch && !dead) show(value);
      } catch (error) {
        if (current === epoch && !dead) show("error");
      } finally {
        if (active === controller) active = undefined;
      }
    },
    pause,
    dispose() { if (!dead) { dead = true; pause(); } }
  };
}
```

完整文件 `owner.test.mjs`：

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { createOwner } from "./owner.mjs";
function deferred() {
  let resolve;
  const promise = new Promise(r => { resolve = r; });
  return { promise, resolve };
}
test("pause and resume reject the old completion", async () => {
  const old = deferred(), fresh = deferred(), states = [];
  const tasks = [old, fresh];
  const owner = createOwner(() => tasks.shift().promise, x => states.push(x));
  const a = owner.start();
  owner.pause();
  const b = owner.start();
  fresh.resolve("fresh"); await b;
  old.resolve("old"); await a;
  assert.deepEqual(states, ["loading", "loading", "fresh"]);
  owner.dispose();
});
test("dispose rejects future work and late completion", async () => {
  const task = deferred(), states = [];
  const owner = createOwner(() => task.promise, x => states.push(x));
  const pending = owner.start();
  owner.dispose(); owner.dispose();
  task.resolve("late"); await pending;
  assert.deepEqual(states, ["loading"]);
  await assert.rejects(owner.start(), /disposed/);
});
```

运行 `node --test owner.test.mjs`，预期 tests 2 / pass 2 / fail 0。
测试自行释放控制器，无常驻服务。组件接线必须按下节暂停而不是永久释放。

<a id="s7"></a>
## 7. 邻里集市集成案例

原生列表组件在 `lifetimes.attached` 创建 owner，在 `pageLifetimes.show` start、
hide pause、detached dispose。页面初次可见也必须显式 start，不能依赖 show 是否早于 attached；
可以让 attached start、随后 show 再 start，代次守卫使首次旧结果失效，但测量重复读取成本。
更清晰的实现由页面统一驱动一个 owner，组件只呈现 props。

Taro 列表在 `useDidShow` 重读、`useDidHide` abort，effect cleanup 永久释放。
写请求不得因隐藏“撤销成功”；预约结果交给 MP-08 的同键恢复协议。

<a id="s8"></a>
## 8. 常见错误与排查路径

删除 `current === epoch`，第一项变成 `fresh, old`。证据为状态数组，根因是读取器忽略
取消时旧结果仍可呈现；恢复成功和错误分支守卫。把 hide 接成 dispose，则返回时
`disposed`；修复为 pause，重新运行两项测试并在工具中导航返回。

## 9. 课后题

1. detached 必然随 hide 发生吗？答案：不，页面可保留组件树。
2. abort 能回滚写入吗？答案：不能，服务端可能提交。
3. finally 为何检查句柄身份？答案：旧任务不能释放当前任务的引用。

<a id="s10"></a>
## 10. 实践练习

- 基础：连续 dispose 三次。参考答案：状态不新增，start 始终拒绝。
- 进阶：旧任务 reject。参考答案：手动 deferred 增加 reject，最新成功后拒绝旧任务，
  状态中不含 error。
- 故障注入：finally 无条件 show idle。参考答案：旧任务完成覆盖 fresh，
  删除呈现副作用，仅释放本句柄。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 两项测试独立夹具，无睡眠。
- [ ] 隐藏可恢复，销毁不可恢复。
- [ ] 成功与失败都检查新鲜度。
- [ ] 工具中另测组件 attached/ready/detached，不冒充已在 Node 证明。

## 12. 常见问题

所有资源都放 App 吗？不，应贴近拥有者。后台计时器是否可靠？不，应在恢复时比较 UTC
截止时间，而不是累计 tick 次数。

## 13. 扩展阅读

[组件生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/lifetimes.html)、
[Taro 页面生命周期](https://docs.taro.zone/docs/react-page/)。

## 我现在能做到什么

我能为页面与组件建立可暂停、可释放的异步边界，并确定性验证迟到结果。

## 单元导航

[上一单元](01-native-runtime-lifecycle.md) ·
[下一单元：模板事件](../02-rendering/01-template-style-events.md) · [本卷](../README.md)
