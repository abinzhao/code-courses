# 组件边界、组合与列表身份

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 可组合的 `ListingCard` 与可观察 key 身份的重排实验 |
| 建议时间 | 100 分钟 |
| 前置 | 上一课的 JSX、纯渲染、领域对象 |
| 关键证据 | 重排后每件商品的备注和焦点仍属于原商品 |
| 项目边界 | 仍使用静态数据，不包含 API、认证或持久化 |

组件边界不是“把 JSX 随便拆短”。本课按职责拆出商品卡片：父级拥有列表和动作，卡片只接收只读商品与组合内容。

## 1. 任务背景

邻里集市既要在列表页显示“查看详情”，又要在个人页显示“编辑”。如果 `ListingCard` 为每种场景增加布尔属性，它会逐渐承担页面决策。更稳定的方式是让卡片负责商品语义，让父级通过 `children` 组合具体动作。

列表还要支持排序。若 key 使用数组下标，行内尚未保存的备注、焦点或组件状态可能移动到另一件商品，造成“台灯的备注跑到折叠桌”。

## 2. 学习目标

- 用组件边界表达单一职责。
- 定义只读、精确的 props，并理解 props 所有权。
- 使用 `ReactNode` 与 `children` 完成组合。
- 使用 `satisfies` 检查状态到文案的完整映射。
- 区分数据 ID、DOM ID 与 React key。
- 解释稳定 key 怎样维持同级组件身份。
- 通过重排实验识别下标 key 和随机 key 的错误。

## 3. 预备知识

本课沿用 `Listing`：

```ts
type Listing = {
  id: string
  title: string
  description: string
  priceCents: number
  status: 'available' | 'reserved' | 'sold'
  ownerId: string
  version: number
  createdAt: string
}
```

运行前确认上一课和领域文件可通过类型检查：

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm typecheck
```

理解数组 `map` 与不可变 `toReversed()`；若目标浏览器或编译目标不支持 `toReversed`，可使用 `[...items].reverse()`，不能直接改写 state 数组。

## 4. 核心理论

### 4.1 props 是父级提供的快照

props 对当前 render 只读。子组件不能执行 `listing.title = '...'`，也不应把收到的对象当作自己的可变存储。需要变化时，父级通过事件处理器更新拥有的数据，再传入新 props。

`Readonly<{ listing: Listing }>` 能阻止给 props 属性重新赋值；若领域对象本身也声明 `Readonly`，还能阻止浅层字段修改。类型约束不会冻结运行时对象，架构仍须保持所有权。

### 4.2 组合优于布尔开关堆积

`children` 是普通 prop，类型通常为 `ReactNode`。卡片提供标题、描述、价格与状态的位置，页面决定放链接、按钮或提示。卡片不需要知道当前是列表页还是管理页。

### 4.3 key 是同级身份

React 在同一父级的子元素间使用 `type + key` 判断身份。稳定业务 ID 能让某件商品在排序、插入、删除后保持组件 state 和 DOM 节点关联。

key 不会自动作为 prop 传给组件。需要 ID 时仍应传 `listing` 或 `listingId`。

- 数组下标描述位置，不描述商品；
- `Math.random()` 每次 render 都变化，会强制卸载重建；
- `useId()` 解决可访问性 DOM ID，不应作为业务列表 key；
- 数据 ID 应由数据创建时生成一次，服务端数据使用服务端 ID。

### 4.4 条件渲染保持领域完整

用完整状态映射比散落三元表达式更容易发现新增状态。`satisfies Record<Listing['status'], string>` 会在漏掉状态或拼错键时产生类型错误。

## 5. 元素、属性、API 或配置清单

| API / 类型 | 用途 | 边界 |
| --- | --- | --- |
| 函数组件 | props 到元素树的纯映射 | 组件名以大写开头 |
| `Readonly<T>` | 表达浅层只读输入 | 不是运行时冻结 |
| `ReactNode` | `children` 等可渲染内容 | 不等于 DOM Node |
| `children` | 父级组合卡片动作 | 子级不决定页面流程 |
| `key` | 同级列表身份 | 不会传入组件 |
| `useId` | label、heading 等 DOM 关联 | 不用于列表 key |
| `satisfies` | 检查映射覆盖且保留推断 | 不产生运行时校验 |
| `map` | 数据到元素数组 | 每个同级项需要稳定 key |
| `toReversed` | 返回反向副本 | 不改写原数组 |

## 6. 最小可运行案例

先建立可组合卡片。`money` 与 `Listing` 在第 3 课给出完整领域文件。

**完整文件：`apps/react-web/src/ListingCard.tsx`**

```tsx
import { useId } from 'react'
import type { ReactNode } from 'react'
import { money } from './domain'
import type { Listing } from './domain'

const statusText = {
  available: '可预约',
  reserved: '已预约',
  sold: '已售出',
} satisfies Record<Listing['status'], string>

type ListingCardProps = Readonly<{
  listing: Listing
  children?: ReactNode
}>

export default function ListingCard({
  listing,
  children,
}: ListingCardProps) {
  const headingId = useId()

  return (
    <article aria-labelledby={headingId}>
      <h2 id={headingId}>{listing.title}</h2>
      <p>{listing.description}</p>
      <p>
        <strong>{money(listing.priceCents)}</strong>
        {' · '}
        <span>{statusText[listing.status]}</span>
      </p>
      <p>
        发布于{' '}
        <time dateTime={listing.createdAt}>
          {new Intl.DateTimeFormat('zh-CN').format(new Date(listing.createdAt))}
        </time>
      </p>
      {children}
    </article>
  )
}
```

渐进扩展为身份实验：

**完整文件：`apps/react-web/src/examples/IdentityDemo.tsx`**

```tsx
import { useState } from 'react'
import ListingCard from '../ListingCard'
import { seed } from '../domain'

function PrivateNote() {
  const [note, setNote] = useState('')

  return (
    <label>
      本地备注
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
    </label>
  )
}

export default function IdentityDemo() {
  const [reversed, setReversed] = useState(false)
  const items = reversed ? seed.toReversed() : seed

  return (
    <main>
      <h1>列表身份实验</h1>
      <button type="button" onClick={() => setReversed((value) => !value)}>
        反转商品顺序
      </button>
      <section aria-label="商品列表">
        {items.map((listing) => (
          <ListingCard key={listing.id} listing={listing}>
            <PrivateNote />
          </ListingCard>
        ))}
      </section>
    </main>
  )
}
```

**关键片段：`apps/react-web/src/App.tsx`**

```tsx
export { default } from './examples/IdentityDemo'
```

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm typecheck
pnpm dev --host 127.0.0.1
```

在台灯备注输入“门口验货”，保持输入框焦点并反转顺序。预期备注和焦点仍跟随台灯，折叠桌没有得到这段状态。

## 7. 邻里集市集成案例

列表页组合详情链接，管理页组合编辑按钮，两者复用同一语义卡片：

**关键片段：`apps/react-web/src/App.tsx`**

```tsx
<section aria-label="商品列表">
  {seed.map((listing) => (
    <ListingCard key={listing.id} listing={listing}>
      <a href={`/listings/${encodeURIComponent(listing.id)}`}>查看详情</a>
    </ListingCard>
  ))}
</section>
```

此处原生 `a` 只是静态阶段示例；第 4 章会改成 React Router `Link`，避免 SPA 内部导航整页刷新。

商品 key 使用 `listing.id`。台灯 `lamp-1` 和折叠桌 `desk-1` 是教学 fixture；真实创建商品必须采用服务端响应的 ID。`ownerId` 可以影响按钮展示，但后端仍须根据 HttpOnly Cookie 会话检查对象授权。卡片隐藏编辑按钮不构成授权。

卡片显示整数分格式化结果和 UTC 时间的本地化结果，不改写源字段。

## 8. 常见错误与排查路径

### 明确错误：用下标或随机数做 key

```tsx
{items.map((listing, index) => (
  <ListingCard key={index} listing={listing} />
))}

{items.map((listing) => (
  <ListingCard key={Math.random()} listing={listing} />
))}
```

第一段把状态绑定到位置；第二段让每次 render 都产生新身份。

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | 反转后“门口验货”出现在折叠桌，或输入框失焦并清空 |
| 证据 | React DevTools 显示组件 state 跟随索引，随机 key 时节点被卸载重建 |
| 原因 | key 不代表稳定商品身份 |
| 修复 | 使用 `key={listing.id}`，ID 在创建数据时只生成一次 |
| 复验 | 连续反转两次，备注、焦点和商品始终对应；Console 无 key 警告 |

其他错误：

- 试图读取 `props.key`：显式传入 `listing.id`。
- 子组件修改 `listing.status`：改由拥有列表的父级更新新对象。
- `statusText` 漏掉 `sold`：保留 `satisfies`，补齐映射而不是断言绕过。
- 用 `useId` 作为商品 key：改用领域 ID；`useId` 只服务 DOM 关联。

## 9. 课后题

1. 为什么 key 不应该使用数组下标？
2. `children` 与“增加 `showEditButton` prop”相比有什么优势？
3. `Readonly` 是否能阻止服务端 JSON 被运行时代码改写？
4. 同一个商品在两个互不相干的列表中能否使用相同 key？

参考答案：

1. 下标代表当前位置，插入、删除、排序后不再代表同一业务对象。
2. 组合让父级拥有页面动作，卡片保持语义职责，减少布尔分支组合。
3. 不能，它是编译期浅层约束；运行时边界仍需校验与所有权纪律。
4. 可以。key 只要求在同一父级的同级元素中唯一稳定。

## 10. 实践练习

### 基础

给 `ListingCard` 增加 `aria-describedby`，让描述段落与 article 关联。使用 `useId` 生成 DOM ID。完成标准：同页多个卡片 ID 不冲突。

### 进阶

增加“仅显示可预约”切换，并保持每件商品备注。完成标准：隐藏再恢复某项时，明确说明组件卸载会清除局部 state；若业务要求保留，应把备注提升到以商品 ID 为键的父级状态。

### 故障注入

把 key 临时改成 `index`，在台灯输入备注后反转，再恢复 `listing.id`。完成标准：保存五段诊断记录，并能解释错误为何不是 input 自身造成。

答案判定：基础不把 `listing.id` 直接拼成未经约束的 DOM ID；进阶明确 state 生命周期；故障练习恢复后通过类型检查且无 key 警告。

## 11. 阶段验收

- [ ] `ListingCard` props 为只读且包含可选 `children`。
- [ ] 状态映射覆盖 `available`、`reserved`、`sold`。
- [ ] 列表使用 `listing.id` 作为 key。
- [ ] 重排后备注与焦点仍属于原商品。
- [ ] 金额仍以整数分输入格式化器。
- [ ] `createdAt` 源值仍是 UTC ISO 8601。
- [ ] 页面动作由父级组合，卡片不承担授权判断。

运行 `pnpm typecheck` 和 `pnpm build`。预期均退出 0；浏览器 Console 不出现 key、受控输入或重复 ID 警告。

## 12. 常见问题

**所有组件都应该很小吗？**<br>
不是。边界应围绕职责、所有权和变化原因，而不是机械行数。

**可以把完整 Listing 展开成十个 props 吗？**<br>
可以但未必更清晰。本课卡片围绕一个领域对象工作，传对象能保持契约集中；可复用原子组件再选择更窄 props。

**稳定 key 能阻止所有状态丢失吗？**<br>
不能。组件从树中移除会卸载；key 只解决同级协调身份，不是持久化机制。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**。

- [React：Passing Props to a Component](https://react.dev/learn/passing-props-to-a-component)
- [React：Rendering Lists](https://react.dev/learn/rendering-lists)
- [React：Preserving and Resetting State](https://react.dev/learn/preserving-and-resetting-state)
- [React：useId](https://react.dev/reference/react/useId)
- [TypeScript：satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)

## 我现在能做到什么

我能设计只读组件契约，用 `children` 组合页面动作，并用稳定 key 保护商品在重排中的状态身份。

## 单元导航

[上一课：JSX 与渲染纯度](01-rendering-jsx-purity.md) · [返回章节入口](../01-jsx-components.md) · [下一课：Vite、TypeScript 与第一版集市](03-vite-typescript-first-market.md)
