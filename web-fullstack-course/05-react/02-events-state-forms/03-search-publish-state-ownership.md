# 搜索、发布与状态所有权

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 可搜索、筛选、发布和故障恢复的内存版邻里集市 |
| 建议时间 | 120 分钟 |
| 状态边界 | 列表归共同父级；表单草稿留在表单；筛选结果直接派生 |
| 持久化边界 | 仅当前标签页内存，刷新全部恢复 fixture |
| 完成证据 | 搜索/空状态一致；失败保留草稿；成功新增一条完整 Listing |

这是 React 第一个完整交互闭环，但仍是本地演示。`ownerId: 'local-user'` 只是 fixture 字段，不代表经过认证的身份。

## 1. 任务背景

商品列表与发布动作都要读取或更新 `items`，因此 `items` 应提升到两者共同的父组件。表单草稿只有表单自身使用，留在 `ListingForm` 可缩短生命周期。搜索结果、数量和空状态都由 `items + q + availableOnly` 派生，不应各保存一份。

新增商品需要一次性 ID 和创建时间。它们应在用户成功提交事件中产生，而不是在 render 时产生；否则每次重算都会改变身份和时间。

## 2. 学习目标

- 根据“谁读、谁写、何时销毁”确定 state 所有权。
- 提升共享列表状态，同时保留局部表单草稿。
- 从单一来源派生筛选列表、数量和空状态。
- 在事件处理时生成一次 ID 和 UTC 时间。
- 只在保存成功后重置表单。
- 区分“新增被当前筛选隐藏”与“写入失败”。
- 明确内存数据、静态身份与真实后端的边界。

## 3. 预备知识

需要已存在：

```text
src/domain.ts
src/ListingCard.tsx
src/form.ts
src/ListingForm.tsx
src/index.css
```

先运行纯金额测试：

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm test
pnpm typecheck
```

如果 `crypto.randomUUID` 的类型缺失，检查 `tsconfig.app.json` 是否包含 DOM lib；不要用 `Math.random()` 冒充稳定 ID。

## 4. 核心理论

### 4.1 state 所有权问题清单

为每个候选 state 回答：

1. 谁读取？
2. 谁修改？
3. 生命周期何时结束？
4. 是否需要分享进 URL？
5. 是否来自服务端，需不需要重新验证？

`items` 被列表和发布动作共享，放父级。表单字段只有表单读取，放局部。`visible` 能计算，不是 state。第 4 章会把 q 与 page 放进 URL；本课只学习局部交互。

### 4.2 生成值的时机

`crypto.randomUUID()` 和 `new Date().toISOString()` 放在 `save` 中，每次成功提交只执行一次。放在 render 中会随重算改变；放模块顶层会让所有新增对象共用一个值。

真实 API 上线后，ID、ownerId、version 与 createdAt 使用服务端响应，不由浏览器覆盖。浏览器当前时间不能作为数据库权威时间。

### 4.3 派生筛选与重置

更换关键字时可保持“只看可预约”，也可以按产品规则重置；必须明确而非偶然。发布成功后，新商品若不匹配当前 q，列表不会显示，这是正确筛选结果。成功消息与总数据变化可用于判断写入发生，再清除筛选查看。

### 4.4 内存状态不等于持久化

本课刷新即恢复 `seed`。不能用 LocalStorage 悄悄掩盖，也不能宣称“发布成功后已保存”。第 3 章本机教学 API 仍只保存服务器进程内存；真实持久化要到后端数据库阶段。

## 5. 元素、属性、API 或配置清单

| API / 模式 | 用途 | 边界 |
| --- | --- | --- |
| state lifting | 让列表与发布共享 `items` | 不等于全局状态 |
| local state | 保存 q、开关、故障注入 | 刷新丢失 |
| derived value | `filter` 得到 `visible` | 不复制为 state |
| `crypto.randomUUID` | 事件中生成本地 ID | 服务端阶段使用响应 ID |
| `Date#toISOString` | 事件中生成 UTC 演示时间 | 服务端时间才是持久化权威 |
| functional setter | 基于最新列表插入 | 避免 stale snapshot |
| `type="button"` | 防止非提交按钮触发表单 | 表单提交按钮可省略或写 submit |
| `role="status"` | 宣告结果数量 | 不用于错误 |
| `role="alert"` | 宣告保存错误 | 错误恢复后应更新 |

## 6. 最小可运行案例

先观察一份 state 怎样产生多个一致输出：

**完整文件：`apps/react-web/src/examples/DerivedSearchDemo.tsx`**

```tsx
import { useState } from 'react'
import { seed } from '../domain'

export default function DerivedSearchDemo() {
  const [q, setQ] = useState('')
  const normalized = q.trim().toLocaleLowerCase('zh-CN')
  const visible = seed.filter((item) =>
    item.title.toLocaleLowerCase('zh-CN').includes(normalized),
  )

  return (
    <main>
      <h1>商品搜索</h1>
      <label htmlFor="demo-search">搜索标题</label>
      <input
        id="demo-search"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />
      <p role="status">找到 {visible.length} 件商品</p>
      {visible.length === 0 ? (
        <p>没有匹配商品，请调整关键字。</p>
      ) : (
        <ul>
          {visible.map((item) => <li key={item.id}>{item.title}</li>)}
        </ul>
      )}
    </main>
  )
}
```

**关键片段：`apps/react-web/src/App.tsx`**

```tsx
export { default } from './examples/DerivedSearchDemo'
```

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm typecheck
pnpm dev --host 127.0.0.1
```

输入“台灯”只显示一项；输入“书架”显示空状态；清空恢复两项。数量与列表必须始终一致。

## 7. 邻里集市集成案例

把搜索、筛选、发布和错误注入接起来：

**完整文件：`apps/react-web/src/examples/LocalMarket.tsx`**

```tsx
import { useState } from 'react'
import ListingCard from '../ListingCard'
import ListingForm from '../ListingForm'
import { seed } from '../domain'
import type { Listing } from '../domain'
import type { ListingInput } from '../form'

export default function LocalMarket() {
  const [items, setItems] = useState<Listing[]>(seed)
  const [q, setQ] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [failNextSave, setFailNextSave] = useState(false)

  const normalized = q.trim().toLocaleLowerCase('zh-CN')
  const visible = items.filter((item) => {
    const matchesText = item.title
      .toLocaleLowerCase('zh-CN')
      .includes(normalized)
    return matchesText && (!availableOnly || item.status === 'available')
  })

  async function save(input: ListingInput) {
    if (failNextSave) {
      setFailNextSave(false)
      throw new Error('教学故障：本次写入失败。')
    }

    const listing: Listing = {
      ...input,
      id: crypto.randomUUID(),
      status: 'available',
      ownerId: 'local-user',
      version: 1,
      createdAt: new Date().toISOString(),
    }
    setItems((current) => [listing, ...current])
  }

  function resetFilters() {
    setQ('')
    setAvailableOnly(false)
  }

  return (
    <main>
      <h1>邻里集市</h1>
      <p>内存教学数据：刷新页面会丢失新发布的商品。</p>

      <section aria-labelledby="filters-heading">
        <h2 id="filters-heading">筛选商品</h2>
        <label htmlFor="search">搜索标题</label>
        <input
          id="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(event) => setAvailableOnly(event.target.checked)}
          />
          只看可预约商品
        </label>
        <button type="button" onClick={resetFilters}>
          重置筛选
        </button>
      </section>

      <p role="status">找到 {visible.length} 件商品</p>
      {visible.length === 0 ? (
        <p>没有匹配商品，请调整筛选条件。</p>
      ) : (
        <section aria-label="商品列表">
          {visible.map((item) => (
            <ListingCard key={item.id} listing={item} />
          ))}
        </section>
      )}

      <label>
        <input
          type="checkbox"
          checked={failNextSave}
          onChange={(event) => setFailNextSave(event.target.checked)}
        />
        下一次保存失败（仅教学故障注入）
      </label>
      <ListingForm onSave={save} />
    </main>
  )
}
```

**关键片段：`apps/react-web/src/App.tsx`**

```tsx
export { default } from './examples/LocalMarket'
```

发布“二手书架”时发送给 `save` 的 `priceCents` 必须是 `12000`。本地创建时间使用 UTC ISO 字符串。身份 `local-user` 仅为教学占位；真实 API 会从 HttpOnly Cookie 会话确定用户，并返回 ID、ownerId、version、createdAt。

## 8. 常见错误与排查路径

### 明确错误：把筛选结果复制进 state

```tsx
const [visible, setVisible] = useState(seed)

function add(listing: Listing) {
  setItems((current) => [listing, ...current])
  // 忘记同步 visible，页面继续显示旧结果。
}
```

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | 表单显示发布成功，但当前列表看不到“二手书架” |
| 证据 | `items` 已增加；搜索框仍是“台灯”，`visible` 不包含书架 |
| 原因 | 新商品被合法筛选隐藏，而不是写入丢失 |
| 修复 | 清除筛选查看；产品需要时可在成功后明确重置 q，但不能暗中维护第二份列表 |
| 复验 | 清除筛选后书架出现；数量、空状态和列表一致 |

另一个常见原因才是错误复制 state：若清除筛选仍不出现，检查 `visible` 是否直接从最新 `items` 派生。

其他错误：

- render 中调用 `randomUUID()`：移到保存事件。
- 保存前清空草稿：保留到 `await onSave` 成功。
- `button` 默认提交外层表单：非提交动作写 `type="button"`。
- 用 `local-user` 判断权限：它只是内存 fixture，后端仍需鉴权。

## 9. 课后题

1. 为什么 `items` 在父级而草稿在子级？
2. 发布成功但当前搜索看不到新商品，首先检查什么？
3. 为什么 ID 不在 render 中生成？
4. 本地 ownerId 能否证明用户身份？

参考答案：

1. 列表和发布都使用 items；草稿只有表单使用，局部边界更清晰。
2. 检查 q 与 availableOnly 是否合法隐藏结果，再检查数据是否真正更新。
3. render 可重复，生成值会破坏稳定身份；事件中每次提交生成一次。
4. 不能。真实身份来自服务端会话，授权由后端执行。

## 10. 实践练习

### 基础

新增“共 N 件商品，其中 M 件匹配”文本。N 来自 `items.length`，M 来自 `visible.length`，不得增加 count state。

### 进阶

发布成功后只在当前 q 非空且新标题不匹配时显示“商品已发布，但被筛选隐藏”的状态提示。完成标准：不自动篡改用户筛选，提示可被读屏器感知。

### 故障注入

选中“下一次保存失败”，提交合法书架，再取消故障并重试。完成标准：第一次 alert、草稿保留、列表不增加；第二次成功、草稿清空、列表只增加一次。

答案判定：所有数量均为派生；隐藏提示依据真实条件；失败不产生对象，成功对象字段完整。

## 11. 阶段验收

- [ ] 搜索、可预约筛选、重置与空状态工作。
- [ ] 数量和列表来自同一派生结果。
- [ ] 本地发布对象包含完整 Listing 字段。
- [ ] 价格为整数分，创建时间为 UTC ISO 8601。
- [ ] ID 与时间只在保存事件生成一次。
- [ ] 失败保留草稿且不新增，成功才清空且只新增一次。
- [ ] 刷新恢复 seed，页面明确说明内存边界。
- [ ] 320px、Tab、Enter 主路径可用。
- [ ] `pnpm test && pnpm typecheck && pnpm build` 退出 0。

## 12. 常见问题

**为什么不用 Context 存全部状态？**<br>
当前只有共同父级需要共享，提升 state 已足够；第 5 章再按跨路由需求讨论架构。

**刷新丢失是否是 bug？**<br>
本课是明确教学边界。若需求要求持久化，就必须接服务端，而不是改文案假装完成。

**可以发布后自动清空搜索吗？**<br>
可以，但要作为明确产品规则并测试历史行为；本课选择保留筛选并解释隐藏结果。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**。

- [React：Sharing State Between Components](https://react.dev/learn/sharing-state-between-components)
- [React：Thinking in React](https://react.dev/learn/thinking-in-react)
- [React：Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [MDN：crypto.randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
- [MDN：Date.toISOString](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)

## 我现在能做到什么

我能按所有权放置 state，构建可搜索、可发布、可失败恢复的内存应用，并准确说明它与真实持久化和授权的差距。

## 单元导航

[上一课：表单与金额验证](02-controlled-uncontrolled-form-validation.md) · [返回章目录](../README.md#第二章事件状态与表单) · [下一章：Effect、HTTP 与自定义 Hook](../03-effects-reuse/01-effects-lifecycle-cleanup-strict-mode.md)
