# Props、插槽、指令与列表身份

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 把重复商品结构拆为有明确所有权的组件，并证明稳定 key 保持实例身份 |
| 可观察产出 | `IdentityRow.vue`、`IdentityListDemo.vue`、`ListingCard.vue` |
| 运行条件 | 第 1 课的 Vite Vue TypeScript 工程 |
| 建议时间 | 100 至 120 分钟 |
| 完成证据 | 重排前后草稿归属、slot 输出、一个错误 key 诊断记录 |

## 1. 任务背景

邻里集市的列表会反复显示标题、描述、价格和状态，但详情链接、收藏按钮或教学说明由不同
页面决定。复制整张卡片会让金额和无障碍修复漂移；把所有变化都塞进布尔 prop 又会形成难以
维护的组合。

本课用 props 表达必需输入，用 slots 表达父级拥有的扩展内容，用稳定 key 连接业务 ID 与组件
实例。组件只改善界面结构，不能授予后端权限，也不能把列表数据变成持久化数据。

## 2. 学习目标

完成后你应能：

1. 使用类型参数声明只读 props，并解释嵌套对象的所有权；
2. 区分默认、具名和作用域插槽；
3. 选择 `v-if`、`v-show`、`v-for`、`v-bind` 的合适职责；
4. 解释 key 如何参与同级节点身份匹配；
5. 复现下标 key 和随机 key 导致的状态或焦点迁移；
6. 设计父组件拥有动作、子组件拥有展示的卡片 API。

## 3. 预备知识

先完成[上一课](01-sfc-template-compiler.md)，确认模板表达式和文本转义的边界。需要理解
TypeScript 对象类型、数组 `map` 的概念，以及原生 HTML 的 `article`、`button` 和 `label`。

本课沿用完整领域字段：

```text
id/title/description/priceCents/status/ownerId/version/createdAt
```

字段名字和语义来自[邻里集市项目契约](../../00-guide/05-project-assessment.md)。组件类型只描述
预期形状，不验证未来 API 返回的未知 JSON。

## 4. 核心理论

### 4.1 Props 是输入契约，不是共享写入口

`defineProps<{ listing: Listing }>()` 让父组件必须提供匹配数据，并使模板获得字段类型。
props 顶层只读；即使 JavaScript 允许修改对象内部属性，子组件也不应偷偷写
`listing.status`。可靠方向是：

```text
父级拥有状态 → prop 传入 → 子级展示
子级产生意图 → emit 或回调 → 拥有者决定是否更新
```

后续涉及服务器数据时，最终状态还要由服务器响应决定。子组件改对象既绕过所有权，也无法
锁住另一浏览器标签页。

### 4.2 Slots 表达结构扩展

默认插槽适合附加说明，具名插槽适合稳定区域，作用域插槽让子组件把局部上下文显式提供给
父级。插槽内容在父级作用域求值，所以父级可以使用路由、会话和动作函数，而卡片不必知道
这些服务。

当主体规则相同而扩展区域不同，slot 比复制组件或增加多个 `showX` prop 更合适。若扩展内容
是简单数据，例如标题文字，普通 prop 更清楚。

### 4.3 条件指令的生命周期差异

- `v-if` 为假时不创建或销毁分支，适合低频或昂贵内容；
- `v-show` 始终保留节点，只切换 `display`，适合频繁显示/隐藏且需保留局部状态；
- 两者都只是前端呈现，不是权限控制；
- 不应在同一元素组合 `v-if` 与 `v-for`，先计算过滤结果再循环更清晰。

### 4.4 Key 定义“还是不是同一个实例”

Vue 在同级子节点间比较 key 来复用、移动或销毁实例。商品排序后数组下标变化，但商品 ID
不变，因此 `item.id` 才是稳定身份。

错误选择会产生不同故障：

- 下标 key：重排后，第 0 个实例仍被当作第 0 个，局部草稿可能跟错商品；
- 随机 key：每次渲染都成为新实例，焦点和局部状态被销毁；
- 重复 key：身份不唯一，更新结果不可依赖。

key 只需在同一组兄弟节点间唯一。它帮助渲染，不证明数据库对象存在，更不是授权凭据。

## 5. 元素、属性、API 或配置清单

| API 或指令 | 作用 | 重要边界 |
| --- | --- | --- |
| `defineProps<T>()` | 声明组件输入 | 不执行运行时 API JSON 校验 |
| `withDefaults` | 为类型 props 提供默认值 | 必需业务对象通常不应伪造默认值 |
| `<slot />` | 默认插槽出口 | 内容在父级作用域求值 |
| `<slot name="actions" />` | 具名插槽出口 | 名称是组件公共 API |
| `:listing="item"` | 动态 prop 绑定 | 无冒号时传静态字符串 |
| `v-for="item in items"` | 按集合生成同级节点 | 必须配稳定 key |
| `:key="item.id"` | 标识同级实例身份 | 不能用随机数强制刷新 |
| `v-if` | 条件创建/销毁 | 会影响局部状态和生命周期 |
| `v-show` | 切换 CSS 显示 | 节点仍在 DOM 中 |
| `satisfies` | 校验映射覆盖联合类型 | 不改变运行时值 |

## 6. 最小可运行案例

先用局部输入证明组件身份。

**完整文件：`apps/vue-web/src/lessons/IdentityRow.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ item: { id: string; title: string } }>()
const note = ref('')
</script>

<template>
  <article>
    <h3>{{ item.title }}</h3>
    <label>
      {{ item.title }} 的验货备注
      <input v-model="note" :data-owner-id="item.id" />
    </label>
  </article>
</template>
```

**完整文件：`apps/vue-web/src/lessons/IdentityListDemo.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import IdentityRow from './IdentityRow.vue'

const items = ref([
  { id: 'lamp-1', title: '九成新台灯' },
  { id: 'desk-1', title: '折叠桌' },
])

function reverse() {
  items.value = [...items.value].reverse()
}
</script>

<template>
  <section aria-labelledby="identity-title">
    <h2 id="identity-title">列表身份实验</h2>
    <button type="button" @click="reverse">反转顺序</button>
    <IdentityRow
      v-for="item in items"
      :key="item.id"
      :item="item"
    />
  </section>
</template>
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm typecheck
pnpm dev --host 127.0.0.1
```

将 `IdentityListDemo` 临时放进 `App.vue`。在台灯输入框填写“灯罩有划痕”，保持焦点并反转。
预期备注仍属于 `lamp-1`，焦点跟随该实例移动。渐进扩展：

1. 先显示无输入的两行；
2. 加入子组件局部 `note`；
3. 使用 `item.id` 作为 key 并重排；
4. 临时改为数组下标，复现备注归属错误；
5. 恢复 ID key 并复验。

## 7. 邻里集市集成案例

卡片负责所有页面都一致的展示，父级通过插槽提供页面动作。

**完整文件：`apps/vue-web/src/ListingCard.vue`**

```vue
<script setup lang="ts">
import { money } from './domain'
import type { Listing } from './domain'

defineProps<{ listing: Readonly<Listing> }>()

const statusText = {
  available: '可预约',
  reserved: '已预约',
  sold: '已售出',
} satisfies Record<Listing['status'], string>
</script>

<template>
  <article :aria-labelledby="`listing-${listing.id}`">
    <h2 :id="`listing-${listing.id}`">{{ listing.title }}</h2>
    <p>{{ listing.description }}</p>
    <p>
      <strong>{{ money(listing.priceCents) }}</strong>
      · {{ statusText[listing.status] }}
    </p>
    <p>
      <time :datetime="listing.createdAt">
        {{ new Date(listing.createdAt).toLocaleString('zh-CN') }}
      </time>
    </p>
    <div v-if="$slots.actions" class="actions">
      <slot name="actions" :listing="listing" />
    </div>
    <slot />
  </article>
</template>

<style scoped>
article {
  border-block-end: 1px solid #9baaa0;
  padding-block: 1rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
```

`Readonly<Listing>` 明确卡片 API 的写入意图，但不是深度运行时冻结。父级使用：

**关键片段：`apps/vue-web/src/App.vue`**

```vue
<ListingCard v-for="item in seed" :key="item.id" :listing="item">
  <template #actions="{ listing }">
    <button type="button" @click="inspect(listing.id)">
      记录验货意向
    </button>
  </template>
  <small>静态教学数据，不创建真实预约。</small>
</ListingCard>
```

`inspect` 只记录前端教学意图，不能把按钮点击描述为预约成功。真实预约必须调用后端，后端依据
HttpOnly 会话识别买家，并以约束保证同一商品只能有一个有效预约。

## 8. 常见错误与排查路径

**明确错误示例：**

**关键片段：`apps/vue-web/src/lessons/BadIdentityList.vue`**

```vue
<IdentityRow
  v-for="(item, index) in items"
  :key="index"
  :item="item"
/>
```

下标描述位置，不描述商品。随机 key 更糟，因为任何父级更新都可能重建全部行。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 反转列表后，“灯罩有划痕”出现在折叠桌输入框 |
| 证据 | Vue DevTools 显示第 0 个 `IdentityRow` 实例被复用，模板 key 是 `index` |
| 原因 | key 跟随位置而非商品，局部 `note` 属于实例并留在原位置 |
| 修复 | 改用 `:key="item.id"`，并保证同级 ID 唯一且稳定 |
| 复验 | 重新填写台灯备注并反转，备注与焦点都跟随 `lamp-1` |

另一个常见错误是把 `:listing="item"` 写成 `listing="item"`。`vue-tsc` 应指出字符串与
`Readonly<Listing>` 不兼容。修复绑定语法，不要把 prop 改成 `unknown` 或 `any`。

## 9. 课后题

1. 为什么父组件拥有列表，卡片却不应直接修改 `listing.status`？
2. 默认插槽与作用域插槽的变量从哪里来？
3. `v-show` 能否保护未授权用户看不到敏感数据？
4. key 为什么不能使用 `crypto.randomUUID()` 在模板更新时生成？
5. `useId` 生成的 DOM ID 能否代替商品 ID 作为 API 路径？

**参考答案：**

1. 列表和最终服务器事实不属于卡片；直接修改绕过拥有者和请求结果。
2. 插槽内容在父级作用域求值，作用域插槽额外接收子组件显式提供的数据。
3. 不能，节点和数据仍在客户端；授权由后端执行。
4. 每次值都变化会让 Vue 销毁旧实例，丢失状态和焦点。
5. 不能。DOM 关联 ID 和领域对象身份解决不同问题。

## 10. 实践练习

### 基础：增加状态说明插槽

给卡片增加名为 `meta` 的具名插槽，父级显示 `version`。

**参考答案：**

```vue
<slot name="meta" :version="listing.version" />
```

父级通过 `#meta="{ version }"` 使用；不得让卡片为每一种文案增加布尔 prop。

### 进阶：验证重排身份

增加“按标题排序”和“恢复种子顺序”按钮，在任一输入框保留备注。

**答案标准：**任何排序后备注仍属于相同 `data-owner-id`；两个按钮使用不可变数组替换便于
观察，但本课不把该写法宣称为 Vue 的唯一更新方式。

### 故障注入：重复 ID

把两行临时都设为 `lamp-1`，记录 Vue 警告和错误行为，再恢复唯一 ID。

**答案标准：**指出同级 key 重复导致身份不确定；修复数据，不通过隐藏警告完成验收。

## 11. 阶段验收

- [ ] `IdentityListDemo` 可由键盘触发反转。
- [ ] 稳定 ID key 下，局部备注和焦点不迁移。
- [ ] 下标 key 故障已复现并形成五段记录。
- [ ] `ListingCard` 的 props、默认 slot、具名 slot 和作用域 slot 均有明确职责。
- [ ] 危险描述仍通过文本插值输出。
- [ ] 金额是整数分，时间存 UTC、显示时本地化。
- [ ] `pnpm typecheck` 与 `pnpm build` 退出 `0`。

## 12. 常见问题

**可以为了重置表单而修改 key 吗？**

有意替换一个稳定版本 key 可以表达“这是新实例”，但随机 key 不是可审计的重置协议。优先
设计显式重置命令和状态所有权。

**为什么 `$slots.actions` 可用于条件显示？**

它检查父级是否提供对应插槽，从而避免输出空操作容器；它不证明用户有操作权限。

**props 能否传函数？**

可以，尤其是子组件需要等待命令完成时。普通成功通知更适合 emit；第 2 章会比较两者。

**什么时候应复制组件而不是使用 slot？**

当两个界面的主体职责和数据契约已经不同，不应为了表面复用建立复杂 slot 协议。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [Vue：Props](https://vuejs.org/guide/components/props.html)
- [Vue：Slots](https://vuejs.org/guide/components/slots.html)
- [Vue：列表渲染与 key](https://vuejs.org/guide/essentials/list.html)
- [Vue：条件渲染](https://vuejs.org/guide/essentials/conditional.html)
- [Vue：组件基础](https://vuejs.org/guide/essentials/component-basics.html)

项目身份、金额、时间和权限规则以
[统一项目契约](../../00-guide/05-project-assessment.md)为准。

## 我现在能做到什么

我能用 props 和 slots 设计清楚的父子边界，能解释 key 与组件实例身份，并能通过重排实验
证明下标 key 为什么会让局部状态串位。

## 单元导航

[上一课：SFC 结构与编译](01-sfc-template-compiler.md) ·
[返回章入口](../01-sfc-templates.md) ·
[下一课：Vite、TypeScript 与第一版集市](03-vite-typescript-first-market.md)
