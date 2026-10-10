# ref、reactive、computed 与更新队列

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 建立可观察的响应式因果链，并把商品筛选写成纯派生 |
| 可观察产出 | `ReactivityProbe.vue`、`CatalogStateDemo.vue` |
| 运行条件 | 第 1 章完成的 Vue 3.5 TypeScript 工程 |
| 建议时间 | 100 分钟 |
| 完成证据 | 计数更新、computed 运行记录、`nextTick` DOM 证据、解构故障记录 |

## 1. 任务背景

普通变量变化不会自动通知 Vue。邻里集市要让搜索文字、复选框和商品数组共同决定可见列表，
必须建立可以追踪的读取与写入关系。若再手工保存一份 `visibleItems` 和一份 `visibleCount`，
它们很快会与真实列表失去同步。

本课只处理浏览器内存中的状态和纯派生。请求、存储和外部订阅属于副作用，下一章再引入。

## 2. 学习目标

完成后你应能：

1. 解释 `ref` 与 `reactive` 如何暴露响应式读写；
2. 区分脚本中的 `.value` 与模板顶层 ref 自动解包；
3. 使用纯 `computed` 从唯一源状态派生列表和数量；
4. 说明 Vue 怎样批量安排 DOM 更新，并正确使用 `nextTick`；
5. 复现普通解构丢失响应式关系；
6. 使用 `toRef`、`toRefs` 或 getter 保留明确依赖；
7. 说明 Vue 3.5 props 响应式解构的适用范围。

## 3. 预备知识

先确认第 1 章静态市场的 `domain.ts`、`ListingCard.vue` 和 `seed` 可用。需要理解：

- 源状态是可直接写入的业务事实；
- 派生状态能从源状态重新计算；
- DOM 是 Vue 根据当前状态提交的结果；
- 浏览器内存状态会在刷新后重建。

## 4. 核心理论

### 4.1 `ref` 与 `reactive`

`ref(value)` 返回带 `.value` 的响应式容器，适合原始值和需要整体替换的对象/数组。
`reactive(object)` 返回 Proxy，适合稳定对象身份下的属性读写。二者都可以表达对象状态，
选择依据是读写方式，不存在“reactive 更高级”。

模板会自动解包顶层 ref，因此模板写 `q`；脚本必须写 `q.value`。把模板规则带进普通
TypeScript 会得到 ref 对象而不是内部值。数组、Map 等集合中的 ref 也不要依赖所有位置自动解包。

### 4.2 依赖追踪

Vue 在响应式 getter 被活动计算读取时记录依赖，在 setter 写入时通知相关计算。抽象路径是：

```text
执行 computed getter
  → 读取 q.value / items.value
  → 记录依赖
写入 q.value
  → 标记 computed 失效
下一次读取 computed
  → 重新计算并更新使用它的渲染
```

`computed` 会缓存结果，但缓存不是永久副本。依赖没变时复用，依赖变更后下次读取重新计算。

### 4.3 派生必须纯净

筛选列表、数量和剩余字数都能由当前源状态得到，应写成 `computed`。getter 中不应：

- 发送 POST；
- 修改被读取的数组；
- 显示通知；
- 生成随机 ID；
- 写本地存储。

computed 求值时机由依赖和读取决定，不等于一次用户意图。副作用放到事件处理器或明确 watcher。

### 4.4 更新队列与 `nextTick`

同一同步任务内多次写响应式状态，Vue 会批量安排组件更新，避免每次写入都立即重绘。
状态值通常已经可读，但 DOM 可能仍是旧文本。必须在“确实需要读取更新后 DOM”时：

```ts
await nextTick()
```

任意 `setTimeout(..., 100)` 只是猜测，慢设备和测试环境都可能不同。大多数业务逻辑不需要等待 DOM。

### 4.5 解构边界

`const { title } = reactiveDraft` 取得当时的普通字符串，后续 `reactiveDraft.title` 变化不会
改写这个绑定。可保持 `reactiveDraft.title` 访问，或使用 `toRef`/`toRefs`。

Vue 3.5 的 `<script setup>` 对 `defineProps` 解构提供编译期响应式转换，但这不是所有对象的
JavaScript 新语义。把解构值传给需要持续读取的普通函数时，仍应传 getter，例如 `() => title`。

## 5. 元素、属性、API 或配置清单

| API | 作用 | 本课边界 |
| --- | --- | --- |
| `ref<T>(value)` | 建立 `.value` 容器 | 模板顶层自动解包，脚本不自动 |
| `reactive(object)` | 返回响应式 Proxy | 普通解构会取出当前值 |
| `computed(getter)` | 缓存纯派生 | 不执行写操作或请求 |
| `nextTick()` | 等待当前 DOM 更新批次 | 不等待网络或 CSS 动画 |
| `toRef(object, key)` | 为一个属性保留 ref 关系 | 不复制值 |
| `toRefs(object)` | 把每个属性转为 ref | 避免对大对象无差别展开 |
| `isRef` / `isReactive` | 调试响应式种类 | 不是业务分支 API |
| `structuredClone` | 复制可克隆种子数据 | 不适合函数、DOM 或所有 class |
| `v-model` | 连接表单值与响应式状态 | 不替代业务验证 |

## 6. 最小可运行案例

**完整文件：`apps/vue-web/src/lessons/ReactivityProbe.vue`**

```vue
<script setup lang="ts">
import { computed, nextTick, reactive, ref, toRef } from 'vue'

const count = ref(0)
const draft = reactive({ title: '九成新台灯' })
const titleRef = toRef(draft, 'title')
const doubled = computed(() => {
  console.count('doubled computed')
  return count.value * 2
})
const output = ref<HTMLElement | null>(null)
const evidence = ref('')

async function increaseTwice() {
  count.value++
  count.value++
  const before = output.value?.textContent ?? ''
  await nextTick()
  const after = output.value?.textContent ?? ''
  evidence.value = `DOM 更新前：${before}；更新后：${after}`
}
</script>

<template>
  <section aria-labelledby="reactivity-probe-title">
    <h2 id="reactivity-probe-title">响应式探针</h2>
    <p ref="output">count={{ count }}；double={{ doubled }}</p>
    <button type="button" @click="increaseTwice">连续增加两次</button>
    <label>
      商品标题
      <input v-model="titleRef" />
    </label>
    <p>当前标题：{{ draft.title }}</p>
    <p role="status">{{ evidence }}</p>
  </section>
</template>
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm typecheck
pnpm dev --host 127.0.0.1
```

点击一次后 `count` 从 0 到 2，`double` 为 4。证据应显示等待前后 DOM 文本不同；实际字符串
可能包含空白，验收关注数字变化。连续读取 `doubled` 而依赖未变时，Console 计数不应无条件增加。

渐进扩展顺序：

1. 只用 `ref` 增加计数；
2. 加 `computed` 派生两倍值；
3. 同步写两次观察批量更新；
4. 加 `nextTick` 读取更新后 DOM；
5. 用 `toRef` 保留 `draft.title` 的双向关系。

## 7. 邻里集市集成案例

**完整文件：`apps/vue-web/src/lessons/CatalogStateDemo.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import ListingCard from '../ListingCard.vue'
import { seed } from '../domain'
import type { Listing } from '../domain'

const items = ref<Listing[]>(structuredClone(seed))
const q = ref('')
const availableOnly = ref(false)

const normalizedQuery = computed(() => q.value.trim().toLocaleLowerCase('zh-CN'))
const visibleItems = computed(() => items.value.filter((item) => {
  const matchesQuery = item.title
    .toLocaleLowerCase('zh-CN')
    .includes(normalizedQuery.value)
  return matchesQuery && (!availableOnly.value || item.status === 'available')
}))
const resultText = computed(() => `找到 ${visibleItems.value.length} 件商品`)
</script>

<template>
  <section aria-labelledby="catalog-demo-title">
    <h2 id="catalog-demo-title">内存商品筛选</h2>
    <p><strong>教学数据只存在于浏览器内存，刷新后恢复种子。</strong></p>
    <label>
      搜索标题
      <input v-model="q" type="search" />
    </label>
    <label>
      <input v-model="availableOnly" type="checkbox" />
      只看可预约商品
    </label>
    <p role="status">{{ resultText }}</p>
    <p v-if="visibleItems.length === 0">
      没有匹配商品，请调整关键字或筛选条件。
    </p>
    <section v-else aria-label="筛选结果">
      <ListingCard
        v-for="item in visibleItems"
        :key="item.id"
        :listing="item"
      />
    </section>
  </section>
</template>
```

`items` 是源状态，`visibleItems` 和 `resultText` 都是派生。不要在三个位置分别更新数量。
输入“台灯”应得到一项；输入“不存在”应得到成功的空状态，而不是错误。

## 8. 常见错误与排查路径

**明确错误示例：普通解构丢失关系。**

**关键片段：`apps/vue-web/src/lessons/BadDestructure.vue`**

```ts
const draft = reactive({ title: '九成新台灯' })
const { title } = draft
draft.title = '折叠桌'
console.log(title) // 仍是“九成新台灯”
```

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 输入框中的源标题变化，但页面某处仍显示旧标题 |
| 证据 | Vue DevTools 中 `draft.title` 已更新；旧位置读取普通解构变量 `title` |
| 原因 | 解构复制了当时字符串，没有保留 Proxy 属性读取 |
| 修复 | 继续访问 `draft.title`，或使用 `toRef(draft, 'title')` |
| 复验 | 再次输入后两个显示位置同步，`pnpm typecheck` 与构建通过 |

另一错误是在 computed 内执行 `items.value.push(...)`。它一边读取一边写源依赖，可能形成循环或
不可预测求值。应由事件处理器写 `items`，让 computed 重新派生。

## 9. 课后题

1. 模板为什么写 `q`，脚本却写 `q.value`？
2. computed 缓存依据是什么？
3. `nextTick` 是否等待 fetch 完成？
4. 为什么“找到 N 件”不应单独存成 ref？
5. Vue 3.5 props 解构是否让任意 reactive 解构都保持响应式？

**参考答案：**

1. 模板编译器对顶层 ref 自动解包，普通 TypeScript 没有该规则。
2. getter 运行时读取的响应式依赖。
3. 不等待；它只等待当前 Vue DOM 更新批次。
4. 它完全由可见数组长度决定，第二份状态可能漂移。
5. 不是；那是 `<script setup>` 针对 props 的编译转换。

## 10. 实践练习

### 基础：派生可预约数量

增加 `availableCount`，页面显示当前所有商品中可预约数量。

**参考答案：**

```ts
const availableCount = computed(
  () => items.value.filter(item => item.status === 'available').length,
)
```

### 进阶：响应式属性引用

把搜索条件放进 `reactive({ q: '', availableOnly: false })`，使用 `toRefs` 给模板。

**答案标准：**解构后仍是 ref；脚本访问需要 `.value`；不得维护第二份同步字段。

### 故障注入：移除 computed

把 `visibleItems` 改成初始化时计算一次的普通数组，随后搜索。

**答案标准：**复现列表不更新；证据指出普通数组没有持续读取 q；恢复 computed 后复验空状态和台灯结果。

## 11. 阶段验收

- [ ] 能解释 ref 容器、reactive Proxy 和 computed 依赖链。
- [ ] 连续两次写入后，状态为 2 且 DOM 在 `nextTick` 后反映结果。
- [ ] 商品筛选和数量都由 computed 派生。
- [ ] 搜索无结果显示 empty，而不是 error。
- [ ] 普通解构故障已复现并修复。
- [ ] 页面明确标注浏览器内存边界。
- [ ] `pnpm typecheck` 和 `pnpm build` 通过。

## 12. 常见问题

**数组应该放在 ref 还是 reactive？**

两者都可用。本教程需要整体替换服务器快照，选择 `ref<Listing[]>` 让写入边界明显。

**可以直接 `items.value.push()` 吗？**

Vue 能追踪该写入，但应在明确事件中执行。本课偏好整体替换以便观察，不把它说成唯一正确写法。

**`nextTick` 可以修复所有异步竞态吗？**

不能。网络竞态要取消旧请求或忽略过期结果；下一章专门处理。

**为什么不用 watch 维护筛选结果？**

筛选是纯派生，computed 能从唯一源重新计算；watch 更适合外部同步。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [Vue：响应式基础](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [Vue：计算属性](https://vuejs.org/guide/essentials/computed.html)
- [Vue：DOM 更新时机](https://vuejs.org/api/general.html#nexttick)
- [Vue：响应式工具](https://vuejs.org/api/reactivity-utilities.html)
- [Vue 3.5：Props 响应式解构](https://vuejs.org/api/sfc-script-setup.html#reactive-props-destructure)

## 我现在能做到什么

我能从源状态建立纯派生，能解释更新队列和 `nextTick`，也能识别普通解构导致的响应式关系丢失。

## 单元导航

[返回章入口](../02-reactivity-events-forms.md) ·
[下一课：组件事件、v-model 与表单](02-component-events-v-model-forms.md)
