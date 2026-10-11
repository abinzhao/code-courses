# 事件、状态快照与不可变更新

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 可观察批处理、快照与函数式更新差异的计数实验 |
| 建议时间 | 90 分钟 |
| 前置 | 第 1 章静态应用、函数与数组方法 |
| 项目连接 | 为搜索、筛选和本地发布建立状态更新规则 |
| 完成证据 | “正确 +2”每次增加 2；商品更新不改写旧数组 |

本课的状态只存在浏览器内存中。刷新会丢失；它不能替代 API、数据库或跨标签页一致性。

## 1. 任务背景

邻里集市要响应搜索输入、筛选开关和发布按钮。普通局部变量改变后不会通知 React；state setter 会安排新的 render，但当前事件处理器仍看到所属 render 的旧快照。

如果连续两次执行 `setCount(count + 1)`，两个表达式都读取同一个 `count`。如果直接 `items.push(newItem)`，数组引用没有变化且旧快照被改写，React 和测试都难以判断发生了什么。

## 2. 学习目标

- 为表单、按钮事件编写明确的 TypeScript 类型。
- 解释 state 是某次 render 的快照。
- 区分直接值更新与函数式更新。
- 解释 React 事件更新批处理。
- 不可变地更新对象与数组。
- 识别 stale closure，而不是误判为 setter 失效。
- 直接计算派生数据，不复制第二份 state。

## 3. 预备知识

从第 1 章静态应用开始。运行：

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm typecheck
pnpm dev --host 127.0.0.1
```

需要知道：

- `const next = [...items, item]` 产生新数组；
- `map` 可替换某个对象；
- `filter` 产生派生列表；
- 事件处理器传函数引用，不在 render 中调用。

## 4. 核心理论

### 4.1 setter 安排下一次 render

`useState` 返回当前 render 的值。调用 setter 后，当前变量不会原地改变；React 把更新加入队列，并在合适时机批处理。下面日志仍打印旧值是正常快照行为：

```tsx
setCount(count + 1)
console.log(count)
```

### 4.2 函数式更新描述队列转换

当下一个值依赖前一个值，使用 updater：

```tsx
setCount((current) => current + 1)
```

两个 updater 会依次接收队列中最新结果，因此能稳定增加 2。直接值 `count + 1` 连写两次只是两次请求设置为同一个值。

### 4.3 state 视为只读

不能修改已有 state 对象：

```tsx
listing.status = 'sold'
items.push(listing)
```

应创建新对象和新数组：

```tsx
setItems((current) =>
  current.map((item) =>
    item.id === id ? { ...item, status: 'sold' } : item,
  ),
)
```

浅复制只复制一层。嵌套数据仍需逐层复制，或重新设计更扁平的数据形状。

### 4.4 派生值不是新 state

`visible = items.filter(...)` 同时由 `items` 与 `q` 决定。若再维护 `filteredItems` state，就有两份真相，任何漏同步都会产生旧列表。同步纯计算直接在 render 执行。

## 5. 元素、属性、API 或配置清单

| API / 类型 | 用途 | 边界 |
| --- | --- | --- |
| `useState` | 保存跨 render 的局部状态 | 刷新即丢失 |
| state setter | 安排更新 | 不同步改写当前快照 |
| updater function | 基于队列最新值更新 | 必须纯净 |
| `ChangeEvent<HTMLInputElement>` | 独立输入处理器类型 | 内联处理器通常可推断 |
| `MouseEvent<HTMLButtonElement>` | 独立按钮处理器类型 | 不要使用宽泛 `any` |
| `map` | 不可变替换数组项 | 返回新数组 |
| `filter` | 产生派生集合 | 不应复制为同步 state |
| `...` 展开 | 浅复制对象或数组 | 嵌套引用仍共享 |
| `Object.is` | React 比较 state 值的基础 | 原地修改常保留同一引用 |

## 6. 最小可运行案例

**完整文件：`apps/react-web/src/examples/StateSnapshotDemo.tsx`**

```tsx
import { useState } from 'react'
import type { ChangeEvent } from 'react'

export default function StateSnapshotDemo() {
  const [count, setCount] = useState(0)
  const [label, setLabel] = useState('台灯')

  function changeLabel(event: ChangeEvent<HTMLInputElement>) {
    setLabel(event.target.value)
  }

  function wrongPlusTwo() {
    setCount(count + 1)
    setCount(count + 1)
  }

  function correctPlusTwo() {
    setCount((current) => current + 1)
    setCount((current) => current + 1)
  }

  return (
    <main>
      <h1>状态快照实验</h1>
      <label htmlFor="label">商品名称</label>
      <input id="label" value={label} onChange={changeLabel} />
      <p role="status">
        {label || '未命名商品'}：计数 {count}
      </p>
      <button type="button" onClick={wrongPlusTwo}>
        错误 +2
      </button>
      <button type="button" onClick={correctPlusTwo}>
        正确 +2
      </button>
    </main>
  )
}
```

**关键片段：`apps/react-web/src/App.tsx`**

```tsx
export { default } from './examples/StateSnapshotDemo'
```

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm typecheck
pnpm dev --host 127.0.0.1
```

预期“错误 +2”只增加 1，“正确 +2”增加 2。输入名称时状态文本跟随更新。这个对比是教学证据，集成代码不应保留故意错误按钮。

渐进扩展：将 `correctPlusTwo` 的 updater 改成三次，结果应增加 3；把 `setLabel` 后立即读取 `label`，会观察到当前事件的旧快照。

## 7. 邻里集市集成案例

搜索和本地状态的核心接线：

**关键片段：`apps/react-web/src/examples/LocalMarket.tsx`**

```tsx
const [items, setItems] = useState<Listing[]>(seed)
const [q, setQ] = useState('')
const [availableOnly, setAvailableOnly] = useState(false)

const normalizedQuery = q.trim().toLocaleLowerCase('zh-CN')
const visible = items.filter((item) => {
  const matchesText = item.title
    .toLocaleLowerCase('zh-CN')
    .includes(normalizedQuery)
  return matchesText && (!availableOnly || item.status === 'available')
})

function markSold(id: string) {
  setItems((current) =>
    current.map((item) =>
      item.id === id
        ? { ...item, status: 'sold', version: item.version + 1 }
        : item,
    ),
  )
}
```

`visible.length`、列表内容与空状态都从同一个 `visible` 得出，不另建 `count` state。这里递增 `version` 只是内存实验；真实 PATCH 的最新版本由后端判断并返回，浏览器不能自行解决并发冲突。

`markSold` 也不是授权。即使只向 owner 显示按钮，服务端仍必须依据会话检查 `ownerId`。

## 8. 常见错误与排查路径

### 明确错误：原地修改数组

```tsx
function wrongAdd(listing: Listing) {
  items.push(listing)
  setItems(items)
}
```

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | 点击发布后对象出现在调试器数组里，但页面可能不更新，撤销也异常 |
| 证据 | 更新前后 `Object.is(items, nextItems)` 为 `true`；旧快照内容已被改写 |
| 原因 | `push` 修改原数组，setter 收到同一引用 |
| 修复 | `setItems((current) => [listing, ...current])` |
| 复验 | 新旧数组引用不同；页面只增加一次，旧快照保持原内容 |

其他错误：

- `onClick={save()}`：render 时立即调用；应传 `onClick={save}`。
- 为 `visible` 建 state 后忘记同步：删除复制状态，直接派生。
- 异步回调读旧 `q`：传入明确参数或按 Effect/路由生命周期重新建同步。
- 直接改写 `item.version`：创建新对象；真实版本仍以服务端为准。

## 9. 课后题

1. 为什么两个 `setCount(count + 1)` 通常只增加 1？
2. 什么场景必须使用函数式更新？
3. 为什么派生列表不应默认存为 state？
4. 不可变更新能否自动提供后端事务安全？

参考答案：

1. 两次都读取当前 render 的同一个 `count`，请求设置同一个结果。
2. 下一个值依赖队列中的前一个值，尤其连续更新或异步回调时。
3. 它能由现有输入计算，复制会增加同步点和不一致可能。
4. 不能。它只改善前端状态可推理性，跨用户并发仍由数据库和后端处理。

## 10. 实践练习

### 基础

增加“重置”按钮，把计数设为 0、名称设为“台灯”。完成标准：按钮显式 `type="button"`，不触发表单默认提交。

### 进阶

在 fixture 中切换 `lamp-1` 状态为 sold，同时 `version + 1`，不得修改其他对象引用。完成标准：旧数组与台灯旧对象均未被改写，折叠桌对象可保持同一引用。

### 故障注入

临时改为 `push + setItems(items)`，记录页面、React DevTools 和引用证据，再恢复函数式新数组。完成标准：最终类型检查通过，新增动作一次只增加一项。

答案判定：基础使用 setter；进阶用 `map` 和对象展开；故障练习包含现象、证据、原因、修复、复验。

## 11. 阶段验收

- [ ] 能演示值更新与 updater 的不同结果。
- [ ] 独立事件处理器具有具体事件类型。
- [ ] 数组和对象更新不修改旧快照。
- [ ] 搜索结果、数量、空状态来自同一派生值。
- [ ] 本地 state 明确标记为刷新丢失。
- [ ] 没有把按钮状态或前端字段当作后端授权。
- [ ] `pnpm typecheck` 与 `pnpm build` 退出 0。

## 12. 常见问题

**所有 setter 都必须写 updater 吗？**<br>
不必。新值不依赖旧值时可直接设置；依赖旧值时 updater 更准确。

**不可变更新是否意味着深拷贝整个应用？**<br>
不。只复制发生变化路径上的层级，未变化对象可以保留引用。

**批处理是否会漏掉用户操作？**<br>
不会。正确的 updater 会按队列组合；错误通常来自重复读取旧快照。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**。

- [React：Responding to Events](https://react.dev/learn/responding-to-events)
- [React：State as a Snapshot](https://react.dev/learn/state-as-a-snapshot)
- [React：Queueing a Series of State Updates](https://react.dev/learn/queueing-a-series-of-state-updates)
- [React：Updating Arrays in State](https://react.dev/learn/updating-arrays-in-state)
- [React：Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)

## 我现在能做到什么

我能用 typed event 与 state 驱动交互，解释快照和批处理，并以不可变更新保持商品列表可推理。

## 单元导航

[返回章目录](../README.md#第二章事件状态与表单) · [下一课：受控、非受控表单与金额验证](02-controlled-uncontrolled-form-validation.md)
