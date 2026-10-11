# 搜索、发布与状态所有权

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 组合搜索、筛选与发布，并为 URL、草稿、列表和派生结果确定所有者 |
| 可观察产出 | `local-listing.ts`、纯测试、`LocalMarketPage.vue` |
| 运行条件 | 本章前两课文件、Vue 3.5、Vitest |
| 建议时间 | 100 至 120 分钟 |
| 完成证据 | 发布书架、空状态、失败保稿、筛选隐藏诊断和刷新复位 |

## 1. 任务背景

单个 ref 和单个表单都能工作，但组合页面容易把状态放错位置：表单草稿被提升成全局变量，
可见数量单独存储，搜索和商品列表各维护一份副本，最终任何更新都要同时修改多个位置。

本课按“谁读取、谁写入、何时销毁、是否需要分享”决定状态所有权。发布仍是浏览器内存教学
操作，使用本地 UUID 只为列表身份，不冒充服务器签发的真实资源 ID。

## 2. 学习目标

完成后你应能：

1. 区分局部草稿、页面源状态、纯派生、URL 状态和服务器事实；
2. 把需要共同读写的商品数组提升到最近共同父级；
3. 让搜索结果和数量保持单一数据源；
4. 在用户提交事件中只创建一次 ID 和 UTC 时间；
5. 解释为什么新商品可能被当前筛选隐藏；
6. 明确刷新丢失、前端身份与后端授权边界；
7. 用失败注入验证草稿保留和恢复路径。

## 3. 预备知识

需要完成[响应式基础](01-ref-reactive-computed-updates.md)与
[表单命令](02-component-events-v-model-forms.md)。以下文件应已存在：

```text
src/domain.ts
src/form.ts
src/ListingCard.vue
src/SearchField.vue
src/ListingForm.vue
```

本课不建立 Router、Pinia 或 API。某份状态只有一个页面使用，不应为了“以后可能共享”提前全局化。

## 4. 核心理论

### 4.1 四类状态

| 状态 | 本课所有者 | 原因 | 后续演进 |
| --- | --- | --- | --- |
| 表单 draft | `ListingForm` | 只有表单编辑，失败要保留 | 仍属于表单 |
| `items` | `LocalMarketPage` | 列表展示与发布都需要 | 第 3 章改为服务器快照 |
| `q` / `availableOnly` | 页面 | 当前本地筛选控件使用 | 第 4 章将 q/page 放 URL |
| `visibleItems` / count | computed | 完全由源状态决定 | 不存入 store |

状态提升到最近共同父级，不等于移动到应用全局。销毁页面时应一起销毁的草稿和筛选，留在页面
更符合生命周期。

### 4.2 发布事件中的一次性值

`crypto.randomUUID()` 和 `new Date().toISOString()` 不是纯派生，不应放进 computed 或模板。
它们在一次成功保存命令中各执行一次：

```text
已验证 ListingInput
  → 生成本地 ID
  → 生成 UTC 时间
  → 组成 Listing
  → 写入 items
```

本地 ID 只服务当前演示实例。接入 API 后必须使用服务端响应的 `created.id`，不能客户端再生成。

### 4.3 派生条件可能隐藏合法写入

用户搜索“台灯”时发布“二手书架”，源数组确实增加了书架，但 computed 仍只返回匹配台灯的项。
这不是保存失败。可靠界面可以在成功文案中提示“新商品可能被当前筛选隐藏”，或提供清除筛选。
不能为了“立刻看到”再维护第二份不受筛选的可见列表。

### 4.4 前端反馈不是系统事实

本章 `ownerId: 'local-user'`、UUID 和成功提示都是阶段模拟。它们不能证明：

- 用户经过认证；
- 该用户有发布权限；
- 刷新后仍存在；
- 多标签页共享；
- 预约具有唯一性；
- 后端接受了输入。

第 3、4 章逐步接入教学 API，同时继续标明非生产边界。

## 5. 元素、属性、API 或配置清单

| API 或模式 | 作用 | 边界 |
| --- | --- | --- |
| `ref<Listing[]>` | 页面商品源状态 | 刷新后重建 |
| `computed` | 派生筛选和数量 | 不生成 UUID、不写数组 |
| `structuredClone(seed)` | 为教学种子建立页面副本 | 不持久化 |
| `crypto.randomUUID()` | 建立本地列表身份 | 不是服务器资源 ID |
| `new Date().toISOString()` | 生成 UTC 时间字符串 | 依赖当前设备时间 |
| 数组展开 | 在事件中建立新数组 | Vue 也能追踪其他明确写法 |
| 命令 prop | 等待发布完成 | 当前实现只写内存 |
| `role="status"` | 呈现结果数量和保存结果 | 错误应使用 alert |

## 6. 最小可运行案例

把组装领域对象的纯边界独立出来，注入 ID 和时间以便测试。

**完整文件：`apps/vue-web/src/local-listing.ts`**

```ts
import type { Listing } from './domain'
import type { ListingInput } from './form'

export type LocalListingMetadata = {
  id: string
  createdAt: string
}

export function createLocalListing(
  input: ListingInput,
  metadata: LocalListingMetadata,
): Listing {
  if (!metadata.id) {
    throw new Error('本地商品 ID 不能为空')
  }
  if (new Date(metadata.createdAt).toISOString() !== metadata.createdAt) {
    throw new Error('createdAt 必须是规范 UTC ISO 8601')
  }
  return {
    ...input,
    id: metadata.id,
    status: 'available',
    ownerId: 'local-user',
    version: 1,
    createdAt: metadata.createdAt,
  }
}
```

**完整文件：`apps/vue-web/src/local-listing.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { createLocalListing } from './local-listing'

describe('local-listing-contract', () => {
  it('keeps integer cents and canonical UTC', () => {
    expect(createLocalListing(
      {
        title: '二手书架',
        description: '可拆卸，配件齐全。',
        priceCents: 12000,
      },
      {
        id: 'published-bookcase',
        createdAt: '2026-10-11T08:00:00.000Z',
      },
    )).toMatchObject({
      id: 'published-bookcase',
      priceCents: 12000,
      status: 'available',
      ownerId: 'local-user',
      version: 1,
      createdAt: '2026-10-11T08:00:00.000Z',
    })
  })

  it('rejects non-canonical time', () => {
    expect(() => createLocalListing(
      {
        title: '二手书架',
        description: '可拆卸，配件齐全。',
        priceCents: 12000,
      },
      { id: 'bookcase', createdAt: '2026-10-11 08:00:00' },
    )).toThrow('UTC ISO 8601')
  })
})
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm exec vitest run src/form.test.ts src/local-listing.test.ts
```

纯函数不读取当前时钟或随机源，因此测试可重复。页面事件负责把一次生成的元数据传入。

## 7. 邻里集市集成案例

**完整文件：`apps/vue-web/src/pages/LocalMarketPage.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import ListingCard from '../ListingCard.vue'
import ListingForm from '../ListingForm.vue'
import SearchField from '../SearchField.vue'
import { seed } from '../domain'
import { createLocalListing } from '../local-listing'
import type { Listing } from '../domain'
import type { ListingInput } from '../form'

const items = ref<Listing[]>(structuredClone(seed))
const q = ref('')
const availableOnly = ref(false)
const savedMessage = ref('')
const injectFailure = ref(false)

const visibleItems = computed(() => {
  const query = q.value.trim().toLocaleLowerCase('zh-CN')
  return items.value.filter((item) => {
    const matchesQuery = item.title
      .toLocaleLowerCase('zh-CN')
      .includes(query)
    const matchesStatus = !availableOnly.value
      || item.status === 'available'
    return matchesQuery && matchesStatus
  })
})

async function save(input: ListingInput) {
  await new Promise(resolve => setTimeout(resolve, 250))
  if (injectFailure.value) {
    throw new Error('演示写入失败，请保留草稿后重试。')
  }
  const item = createLocalListing(input, {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  })
  items.value = [item, ...items.value]
  savedMessage.value = '已写入浏览器内存；刷新后会恢复教学种子。'
}

function clearFilters() {
  q.value = ''
  availableOnly.value = false
}
</script>

<template>
  <section aria-labelledby="local-market-title">
    <h2 id="local-market-title">邻里集市：本地教学版</h2>
    <p>
      <strong>商品只存在于当前页面内存，不代表认证、授权或持久化。</strong>
    </p>

    <SearchField
      v-model="q"
      label="搜索标题"
      @clear="availableOnly = false"
    />
    <label>
      <input v-model="availableOnly" type="checkbox" />
      只看可预约商品
    </label>
    <button type="button" @click="clearFilters">清除全部筛选</button>

    <p role="status">找到 {{ visibleItems.length }} 件商品</p>
    <p v-if="visibleItems.length === 0">
      没有匹配商品，请清除或调整筛选。
    </p>
    <section v-else aria-label="商品列表">
      <ListingCard
        v-for="item in visibleItems"
        :key="item.id"
        :listing="item"
      />
    </section>

    <label>
      <input v-model="injectFailure" type="checkbox" />
      下一次保存注入教学失败
    </label>
    <ListingForm :save="save" />
    <p v-if="savedMessage" role="status">{{ savedMessage }}</p>
  </section>
</template>
```

在应用入口使用页面：

**关键片段：`apps/vue-web/src/App.vue`**

```vue
<script setup lang="ts">
import LocalMarketPage from './pages/LocalMarketPage.vue'
</script>

<template>
  <main>
    <h1>邻里集市</h1>
    <LocalMarketPage />
  </main>
</template>
```

先搜索“台灯”，再发布书架。保存成功但列表仍只显示台灯；清除筛选后书架出现。刷新浏览器后
书架消失且种子恢复，这正是本章明确的内存边界。

## 8. 常见错误与排查路径

**明确错误示例：为“确保显示”维护第二份列表。**

**关键片段：`apps/vue-web/src/pages/BadLocalMarketPage.vue`**

```ts
const items = ref<Listing[]>(structuredClone(seed))
const visibleItems = ref<Listing[]>(structuredClone(seed))

function save(item: Listing) {
  items.value.unshift(item)
  visibleItems.value.unshift(item)
}
```

搜索、状态变化和删除时两份数组必须同步，很容易漂移。修复为单一 `items` 和纯 computed。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 页面提示发布成功，却看不到“二手书架” |
| 证据 | Vue DevTools 中 `items[0].title` 是二手书架，`q` 仍为“台灯” |
| 原因 | computed 按当前查询正确隐藏了不匹配的新商品 |
| 修复 | 清除筛选或在成功文案提示当前筛选仍生效；不复制第二份列表 |
| 复验 | 清除筛选后书架出现，价格 120 元，ID 和 UTC 时间只生成一次 |

若失败注入后草稿消失，问题在 `ListingForm` 的成功/失败时序，不应在页面重新保存一份表单草稿。

## 9. 课后题

1. 为什么表单草稿不放在 `LocalMarketPage`？
2. 为什么 visible count 不单独维护？
3. 本地 UUID 能否发送给真实后端作为最终商品 ID？
4. 刷新后商品消失是否说明 Vue 响应式失败？
5. pending 按钮能否防止另一标签页同时发布或预约？

**参考答案：**

1. 只有表单编辑，且失败恢复属于表单生命周期。
2. 它由 computed 数组长度完整决定，第二份状态会漂移。
3. 不能；接入创建 API 后使用服务端返回 ID。
4. 不是，内存应用重新启动并恢复种子；本章没有持久化层。
5. 不能，只约束当前组件；跨客户端一致性由后端处理。

## 10. 实践练习

### 基础：增加成功提示细节

让成功提示包含标题，但不输出整个用户输入对象。

**答案标准：**显示经过验证的标题；仍明确“浏览器内存”；不把 ownerId 写成安全身份。

### 进阶：重置筛选策略

设计“发布成功后自动清除筛选”和“保持筛选”两种方案，选择一种并说明代价。

**参考答案方向：**自动清除更容易看到新商品，但改变用户上下文；保持筛选更可预测，需要明确提示。
本教程选择保持筛选。

### 故障注入：刷新复位

发布书架后刷新页面。

**答案标准：**书架消失、种子恢复、页面边界文案仍可见；不得通过 localStorage 偷偷改为持久化。

## 11. 阶段验收

- [ ] 搜索、可预约筛选、清除和空状态均可观察。
- [ ] 发布书架得到 `12000` 分、一次 UUID 和 UTC ISO 时间。
- [ ] 当前筛选隐藏新商品时能用源状态证据解释。
- [ ] 注入失败后 alert 可见、草稿保留、按钮恢复。
- [ ] 成功后草稿清空，刷新后本地商品消失。
- [ ] 页面明确标注内存、非认证和非持久化边界。
- [ ] 金额测试、本地对象测试、类型检查和构建全部通过。

## 12. 常见问题

**为什么不直接加 Pinia？**

当前状态只属于一个页面。Pinia 在第 5 章处理真正跨路由会话与收藏。

**可以用 localStorage 保留商品吗？**

那会引入序列化、迁移、跨标签和可信边界，超出本课目标；第 3 章先接统一教学 API。

**为什么本地商品 ownerId 是固定字符串？**

它只满足领域形状并明确是模拟值，不代表安全登录。真实 ownerId 由后端会话决定。

**发布后为何不立即排序？**

本课选择新商品置顶。真实 API 应定义固定排序，前端不能自行假定服务器顺序。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [Vue：状态管理基础](https://vuejs.org/guide/scaling-up/state-management.html)
- [Vue：组件事件](https://vuejs.org/guide/components/events.html)
- [MDN：`crypto.randomUUID`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
- [MDN：`Date.prototype.toISOString`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)
- [邻里集市统一项目契约](../../00-guide/project-contract.md)

## 我现在能做到什么

我能按读写者和生命周期分配状态，组合搜索与可恢复发布，并诚实地区分浏览器内存反馈和后端系统事实。

## 单元导航

[上一课：组件事件与表单](02-component-events-v-model-forms.md) ·
[返回章目录](../README.md#第二章响应式事件与可提交表单) ·
[下一章：生命周期、请求与 Composable](../03-lifecycle-composables/01-lifecycle-watch-cleanup.md)
