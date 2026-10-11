# Effect 生命周期、清理与 Strict Mode

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 正确订阅浏览器在线状态并完整清理的组件 |
| 建议时间 | 100 分钟 |
| 核心判断 | Effect 只同步外部系统，不承接纯计算或点击提交 |
| 故障证据 | 挂载/卸载多次后，一个浏览器事件只产生一次状态更新 |
| 项目连接 | 为第 2 课 HTTP 请求取消建立生命周期模型 |

Effect 不是“组件渲染后随便执行代码”的容器。每个 Effect 都应能说清它连接哪个外部系统、何时建立、何时停止。

## 1. 任务背景

邻里集市需要感知网络在线状态，并在搜索条件变化时切换 HTTP 请求。如果监听器不移除、计时器不清理、旧请求不取消，组件卸载后仍会更新，开发 Strict Mode 还会更快暴露重复订阅。

另一方面，金额格式化、筛选列表和按钮点击提交本来就是同步计算或用户事件，把它们放进 Effect 会增加额外 render 和状态不同步窗口。

## 2. 学习目标

- 判断某段逻辑是否需要 Effect。
- 解释 setup、cleanup、依赖变化和卸载顺序。
- 在 Strict Mode 探针下保持行为正确。
- 诚实列出 Effect 依赖，不通过删依赖消除 lint。
- 清理事件监听器、计时器、观察器与请求。
- 区分 `useRef`、`useEffect` 与 `useLayoutEffect`。
- 解释写请求为何不应由页面 render 自动触发。

## 3. 预备知识

先保证第 2 章应用通过：

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm test
pnpm typecheck
```

需要理解组件可能重复 render，且 Strict Mode 已在 `main.tsx` 启用。不要为本课删除 Strict Mode。

## 4. 核心理论

### 4.1 Effect 的问题形式

一个 Effect 应能改写成：

```text
当依赖为这些值时，连接这个外部系统；
依赖变化或组件离开时，撤销刚才那次连接。
```

若无法指出外部系统，通常不需要 Effect：

- `items.filter(...)`：render 中派生；
- `money(cents)`：render 中格式化；
- 用户点击发布：事件处理器；
- `window.addEventListener`：Effect；
- 定时轮询：Effect；
- GET 请求：Effect 或路由 loader。

### 4.2 setup/cleanup 对称

React 首次提交后执行 setup。依赖改变时先用旧依赖执行 cleanup，再用新依赖 setup；卸载时执行最后一次 cleanup。开发 Strict Mode 会额外执行 setup -> cleanup -> setup，以验证资源能否安全重建。

cleanup 不是“只在组件销毁时执行”。它属于某次具体 setup。

### 4.3 依赖表达读取事实

Effect 内读取的响应式值应进入依赖。删除依赖会让 Effect 继续使用旧闭包。若对象或函数每次 render 新建，可把只属于 Effect 的构造移进 Effect，或把纯 helper 放模块外；不要先用 `useCallback` 掩盖边界不清。

### 4.4 ref 与 layout Effect

`useRef` 保存不触发 render 的可变引用，例如 DOM 节点、计时器 ID、上一次请求序号。用户可见数据只放 ref 不会刷新 UI。

`useLayoutEffect` 在 commit 后、浏览器绘制前同步执行，适合必须先测量再定位的布局；它会阻塞绘制，不应用来发普通网络请求或替代 `useEffect`。

### 4.5 请求取消不是业务回滚

取消 GET 可节省客户端资源并阻止旧结果覆盖。请求可能已到达服务器。POST 预约或发布即使客户端 abort，服务端仍可能完成；幂等性、事务和唯一约束必须由后端保证。

## 5. 元素、属性、API 或配置清单

| API | 用途 | cleanup / 边界 |
| --- | --- | --- |
| `useEffect` | 提交后同步外部系统 | 返回 cleanup |
| Effect 依赖数组 | 声明响应式输入 | 不靠删项冻结旧闭包 |
| `addEventListener` | 订阅浏览器事件 | 同一引用 `removeEventListener` |
| `setInterval` | 周期任务 | `clearInterval` |
| `MutationObserver` | 观察 DOM 变化 | `disconnect` |
| `AbortController` | 取消支持 signal 的异步操作 | 不回滚服务端业务 |
| `useRef` | 保存 DOM 或非渲染可变值 | 改 `current` 不触发 render |
| `useLayoutEffect` | 绘制前测量/定位 | 阻塞绘制，谨慎使用 |
| `StrictMode` | 开发重建探针 | 不保证固定调用次数 |

## 6. 最小可运行案例

**完整文件：`apps/react-web/src/examples/EffectLifecycleDemo.tsx`**

```tsx
import { useEffect, useState } from 'react'

function readOnline() {
  return navigator.onLine
}

export default function EffectLifecycleDemo() {
  const [online, setOnline] = useState(readOnline)

  useEffect(() => {
    function updateOnlineState() {
      setOnline(readOnline())
    }

    window.addEventListener('online', updateOnlineState)
    window.addEventListener('offline', updateOnlineState)

    return () => {
      window.removeEventListener('online', updateOnlineState)
      window.removeEventListener('offline', updateOnlineState)
    }
  }, [])

  return (
    <main>
      <h1>外部订阅实验</h1>
      <p role="status">
        当前网络状态：{online ? '在线' : '离线'}
      </p>
      <p>请使用 DevTools Network 面板切换 Offline 后再恢复。</p>
    </main>
  )
}
```

**关键片段：`apps/react-web/src/App.tsx`**

```tsx
export { default } from './examples/EffectLifecycleDemo'
```

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm typecheck
pnpm dev --host 127.0.0.1
```

在 Chromium DevTools 切换 Offline，状态变“离线”；恢复 No throttling，状态变“在线”。Strict Mode 额外 setup/cleanup 后仍只有一份有效监听器。

渐进扩展：父级用按钮挂载/卸载该组件五次，再切换一次 Offline。预期只出现一次可见状态变化，不产生卸载后更新警告。

## 7. 邻里集市集成案例

商品搜索请求的生命周期应由当前 q 拥有：

**关键片段：`apps/react-web/src/useListings.ts`**

```tsx
useEffect(() => {
  const controller = new AbortController()

  loadListings(q, controller.signal)
    .then((page) => {
      if (!controller.signal.aborted) {
        setResource({ status: 'success', data: page })
      }
    })
    .catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setResource(toErrorResource(error))
      }
    })

  return () => controller.abort()
}, [q])
```

q 改变时，旧请求 cleanup 先 abort，新请求再建立。`loadListings`、`toErrorResource` 若为模块级纯 helper，不需要进依赖。第 2 课会给出完整实现。

以下内容不放 Effect：

- 发布按钮触发 POST；
- 预约按钮触发 POST；
- `visible.length`；
- 金额与时间格式化。

自动发写请求可能在 Strict Mode、重新挂载或导航恢复时重复执行。后端即使有约束，也不应把错误触发方式合理化。

## 8. 常见错误与排查路径

### 明确错误：匿名监听器无法移除

```tsx
useEffect(() => {
  window.addEventListener('online', () => setOnline(true))
  return () => {
    window.removeEventListener('online', () => setOnline(true))
  }
}, [])
```

两个箭头函数不是同一引用，cleanup 没有移除原监听器。

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | 每次重新进入页面后，一次 online 事件触发多次日志或更新 |
| 证据 | DevTools Event Listeners 中监听器数量持续增加 |
| 原因 | setup 与 cleanup 使用不同函数引用 |
| 修复 | 在 Effect 内声明具名 handler，注册和移除复用同一引用 |
| 复验 | 重复挂载/卸载五次后监听器数量不增长，一次事件只更新一次 |

其他错误：

- 用 ref 标记“Effect 已执行”绕过 Strict Mode：修复清理逻辑。
- 为同步筛选建 Effect + state：删除 Effect，render 中派生。
- 依赖 q 却写 `[]`：加入 q，并取消旧同步。
- 把 POST 放挂载 Effect：改由明确事件或路由 action 触发。

## 9. 课后题

1. cleanup 只在卸载时执行吗？
2. 为什么 Strict Mode 的重复 setup 不应该用 ref 禁掉？
3. 取消 fetch 能否保证预约未写入数据库？
4. 用户可见的 online 状态为什么不能只放 ref？

参考答案：

1. 不是。依赖变化前也会清理上一次 setup。
2. 探针在暴露不完整清理；绕过会把泄漏留到真实导航。
3. 不能。服务器可能已收到请求，业务一致性由后端事务和约束保证。
4. ref 改变不触发 render，界面不会更新。

## 10. 实践练习

### 基础

订阅 `visibilitychange`，显示页面可见/隐藏状态。完成标准：注册和移除使用同一 handler。

### 进阶

实现每秒更新一次的“本地演示时钟”，卸载时清理 interval。完成标准：时间只用于显示，不回写 Listing 的 `createdAt`。

### 故障注入

故意去掉 `removeEventListener`，重复挂载组件并记录监听器增长，再恢复。完成标准：给出五段诊断，最终 Strict Mode 保持开启。

答案判定：基础和进阶都具有对称 cleanup；故障修复后监听器/计时器数量不随挂载次数增长。

## 11. 阶段验收

- [ ] 能为每个 Effect 指出外部系统。
- [ ] setup 与 cleanup 对称。
- [ ] 依赖数组与 Effect 内读取一致。
- [ ] Strict Mode 保持启用且无重复订阅。
- [ ] 同步派生和用户提交不放 Effect。
- [ ] 能解释 abort 与业务回滚的区别。
- [ ] `pnpm typecheck && pnpm build` 退出 0。

## 12. 常见问题

**空依赖数组是否表示“整个应用只执行一次”？**<br>
不是。它表示一次组件挂载生命周期；卸载后重新挂载会再次执行，开发探针也会重建。

**Effect 里 setState 一定错误吗？**<br>
不一定。外部系统回调转成 UI state 是合理用法；从 props 能直接计算的值则不应绕一圈。

**什么时候使用 `useLayoutEffect`？**<br>
必须在绘制前读取布局并同步调整时；普通订阅和请求优先 `useEffect`。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**。

- [React：Synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [React：You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)
- [React：useEffect](https://react.dev/reference/react/useEffect)
- [React：useLayoutEffect](https://react.dev/reference/react/useLayoutEffect)
- [React：useRef](https://react.dev/reference/react/useRef)
- [MDN：AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)

## 我现在能做到什么

我能为外部同步建立完整生命周期，在 Strict Mode 中验证清理，并把纯计算、用户事件和 Effect 分配到正确边界。

## 单元导航

[返回章目录](../README.md#第三章effecthttp-与自定义-hook) · [下一课：HTTP、取消与资源状态](02-fetch-http-abort-resource-state.md)
