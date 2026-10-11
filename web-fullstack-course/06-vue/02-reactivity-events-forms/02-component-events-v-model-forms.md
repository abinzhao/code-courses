# 组件事件、v-model 与可恢复表单

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 建立类型化搜索字段和可等待发布表单，严格把元字符串转换为整数分 |
| 可观察产出 | `form.ts`、金额测试、`SearchField.vue`、`ListingForm.vue` |
| 运行条件 | Vue 3.5.43、Vitest、上一课工程 |
| 建议时间 | 120 分钟 |
| 完成证据 | 金额边界测试、Enter 提交、失败保稿、成功重置和错误诊断 |

## 1. 任务背景

用户编辑金额时需要保留空串、`35.` 等中间文字，业务提交时却只接受精确整数分。如果一开始
就用 `v-model.number` 或 `parseFloat`，输入格式会被宽松转换，科学计数、前导零或三位小数
可能越过契约。

发布还涉及异步时序：pending 时阻止重复提交，失败时保留草稿，只有拥有者确认保存成功后
才清空。普通组件事件是通知，不能被子组件 `await`；需要等待的保存行为应作为命令 prop。

## 2. 学习目标

完成后你应能：

1. 区分 DOM 事件和不会自动冒泡的组件事件；
2. 使用 `defineEmits` 声明类型化通知；
3. 使用 `defineModel` 建立清晰的自定义 `v-model`；
4. 精确解析金额字符串并检查整数分上限；
5. 用可辨识联合表达验证成功或错误；
6. 设计 idle、pending、error、success 表单状态；
7. 解释命令 prop 与成功通知各自的时序；
8. 用 label、说明、alert/status 和 Enter 路径建立可访问表单。

## 3. 预备知识

先完成[响应式基础](01-ref-reactive-computed-updates.md)。安装当前工程兼容的 Vitest，并记录版本：

**命令：在 `apps/vue-web` 执行**

```bash
pnpm add -D vitest
pnpm exec vitest --version
```

测试只验证纯金额与草稿规则，不需要浏览器。组件交互仍要通过后续组件测试或 Chromium 路径验证。

## 4. 核心理论

### 4.1 DOM 事件与组件事件

原生 `submit`、`input`、`click` 沿 DOM 事件模型传播。Vue 组件通过 `emit` 发出的事件只通知
直接父组件，不自动冒泡到祖先。事件名和载荷应表达已经发生的事实，例如 `saved`；
需要返回 Promise 的命令不应伪装成可等待事件。

### 4.2 `defineModel` 的实际契约

`defineModel<string>()` 等价于一组 `modelValue` prop 与 `update:modelValue` 事件协议。
子组件写模型 ref 时发出更新，真正状态仍由父级拥有。设置 `{ required: true }` 可避免子组件
默认值与父级 `undefined` 不同步。

双向绑定只解决值传递，不解决授权、并发、持久化或业务验证。

### 4.3 金额编辑态与提交态

表单草稿保留 `price: string`，提交边界执行：

```text
完整格式匹配
  → 整数部分 × 100
  → 小数补齐两位
  → 安全整数和值域检查
  → 产生 priceCents
```

合法：`0`、`0.5`、`35.10`、`1000000.00`。

拒绝：空串、负数、`01`、`1e2`、`35.`、`35.001`、`1000000.01`。

不要先转浮点再乘 100；不要把 `Number("") === 0` 当成免费商品。

### 4.4 可等待命令和通知

`save(input): Promise<void>` 是命令：子组件等待它决定成功或失败。`saved(input)` 是成功后的
通知：父级可以记录分析或更新无须回传完成时序的内容。`emit()` 返回值不是父处理器 Promise，
因此 `await emit('save')` 会立即继续。

### 4.5 表单状态机

状态转换应可审查：

```text
idle/error/success
  → 验证失败：error，保留草稿
  → 验证成功：pending
pending
  → save 成功：success，清空草稿，发 saved
  → save 失败：error，保留草稿
```

pending 时按钮禁用并在提交函数再次守卫，避免键盘或脚本重复触发。

## 5. 元素、属性、API 或配置清单

| API 或属性 | 作用 | 本课约束 |
| --- | --- | --- |
| `defineEmits<T>()` | 声明组件通知及载荷 | 返回值不可作为命令 Promise |
| `defineModel<T>()` | 声明 `modelValue` 协议 | 不替代业务验证 |
| `@submit.prevent` | 统一点击与 Enter 提交 | 逻辑放 form，不只绑 button |
| `v-model` | 保留输入文字 | 金额不使用 `.number` |
| `useId()` | 生成当前应用稳定的 DOM 关联 ID | 不是商品 ID |
| `aria-busy` | 表达表单正在处理 | 仍需可见 pending 文案 |
| `role="alert"` | 朗读重要错误 | 不应用于普通成功状态 |
| `role="status"` | 宣告非紧急进度/成功 | 文案应具体 |
| `inputmode="decimal"` | 提示移动键盘布局 | 不执行格式校验 |
| `maxlength` | 浏览器输入辅助 | 后端仍须验证 |

## 6. 最小可运行案例

### 6.1 纯金额与草稿验证

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/form.ts`**

```ts
export type Draft = {
  title: string
  description: string
  price: string
}

export type ListingInput = {
  title: string
  description: string
  priceCents: number
}

export type ValidationResult =
  | { ok: true; value: ListingInput }
  | { ok: false; message: string }

export function parsePrice(text: string): number | null {
  const match = /^(0|[1-9]\d{0,6})(?:\.(\d{1,2}))?$/.exec(text.trim())
  if (!match) return null

  const wholeCents = Number(match[1]) * 100
  const fractionCents = Number((match[2] ?? '').padEnd(2, '0'))
  const cents = wholeCents + fractionCents

  return Number.isSafeInteger(cents)
    && cents >= 0
    && cents <= 100_000_000
    ? cents
    : null
}

export function validateDraft(draft: Draft): ValidationResult {
  const title = draft.title.trim()
  const description = draft.description.trim()
  const priceCents = parsePrice(draft.price)

  if (title.length < 2 || title.length > 60) {
    return { ok: false, message: '标题需要 2 到 60 个字符。' }
  }
  if (description.length < 5 || description.length > 500) {
    return { ok: false, message: '描述需要 5 到 500 个字符。' }
  }
  if (priceCents === null) {
    return {
      ok: false,
      message: '价格需为 0 至 1000000 元，最多两位小数。',
    }
  }

  return {
    ok: true,
    value: { title, description, priceCents },
  }
}
```

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/form.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { parsePrice, validateDraft } from './form'

describe('price-and-draft-contract', () => {
  it.each([
    ['0', 0],
    ['0.5', 50],
    ['35.10', 3510],
    ['1000000.00', 100_000_000],
  ])('accepts %s as integer cents', (text, expected) => {
    expect(parsePrice(text)).toBe(expected)
  })

  it.each([
    '',
    '-1',
    '01',
    '1e2',
    '35.',
    '35.001',
    '1000000.01',
  ])('rejects %s', (text) => {
    expect(parsePrice(text)).toBeNull()
  })

  it('trims text and produces the command shape', () => {
    expect(validateDraft({
      title: '  二手书架  ',
      description: '  可拆卸，配件齐全。  ',
      price: '120.00',
    })).toEqual({
      ok: true,
      value: {
        title: '二手书架',
        description: '可拆卸，配件齐全。',
        priceCents: 12000,
      },
    })
  })
})
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm exec vitest run src/form.test.ts
```

预期三组测试全部通过；报告实际测试数，不复制本教程文字作为结果。

### 6.2 自定义搜索字段

**完整文件：`apps/vue-web/src/SearchField.vue`**

```vue
<script setup lang="ts">
const model = defineModel<string>({ required: true })
defineProps<{ label: string }>()
const emit = defineEmits<{ clear: [] }>()

function clear() {
  model.value = ''
  emit('clear')
}
</script>

<template>
  <div class="search-field">
    <label>
      {{ label }}
      <input v-model="model" type="search" />
    </label>
    <button type="button" @click="clear">清除关键字</button>
  </div>
</template>
```

父级 `v-model="q"` 拥有搜索值；`clear` 是已发生的通知。渐进过程是先连接原生输入，再抽出
`defineModel`，最后增加无载荷清除事件。

## 7. 邻里集市集成案例

**完整文件：`apps/vue-web/src/ListingForm.vue`**

```vue
<script setup lang="ts">
import { reactive, ref, useId } from 'vue'
import { validateDraft } from './form'
import type { Draft, ListingInput } from './form'

const props = defineProps<{
  save: (input: ListingInput) => void | Promise<void>
}>()
const emit = defineEmits<{ saved: [input: ListingInput] }>()

const id = useId()
const draft = reactive<Draft>({
  title: '',
  description: '',
  price: '',
})
const status = ref<'idle' | 'pending' | 'error' | 'success'>('idle')
const message = ref('')

async function submit() {
  if (status.value === 'pending') return

  const result = validateDraft(draft)
  if (!result.ok) {
    status.value = 'error'
    message.value = result.message
    return
  }

  status.value = 'pending'
  message.value = '正在发布……'
  try {
    await props.save(result.value)
    Object.assign(draft, { title: '', description: '', price: '' })
    status.value = 'success'
    message.value = '发布成功。'
    emit('saved', result.value)
  } catch (error) {
    status.value = 'error'
    message.value = error instanceof Error ? error.message : '发布失败。'
  }
}
</script>

<template>
  <form
    aria-label="发布商品"
    :aria-busy="status === 'pending'"
    @submit.prevent="submit"
  >
    <h2>发布闲置</h2>

    <label :for="`${id}-title`">标题</label>
    <input
      :id="`${id}-title`"
      v-model="draft.title"
      required
      maxlength="60"
    />

    <label :for="`${id}-description`">描述</label>
    <textarea
      :id="`${id}-description`"
      v-model="draft.description"
      required
      maxlength="500"
    />

    <label :for="`${id}-price`">价格（元）</label>
    <input
      :id="`${id}-price`"
      v-model="draft.price"
      inputmode="decimal"
      required
      :aria-describedby="`${id}-price-help`"
    />
    <p :id="`${id}-price-help`">
      0 至 1000000 元，最多两位小数，例如 35.10。
    </p>

    <button :disabled="status === 'pending'">
      {{ status === 'pending' ? '正在发布' : '发布' }}
    </button>
    <p
      v-if="message"
      :role="status === 'error' ? 'alert' : 'status'"
    >
      {{ message }}
    </p>
  </form>
</template>
```

最小集成父级可以先成功，再注入失败：

**关键片段：`apps/vue-web/src/App.vue`**

```vue
<ListingForm
  :save="async (input) => {
    await new Promise(resolve => setTimeout(resolve, 300))
    console.info('浏览器内存教学写入', input)
  }"
/>
```

失败实验把保存函数临时改成：

```ts
async function failSave() {
  await new Promise(resolve => setTimeout(resolve, 300))
  throw new Error('演示写入失败，请保留草稿后重试。')
}
```

合法输入失败后，三个字段原值仍在，按钮重新可用，错误通过 alert 呈现。恢复成功函数后再次
提交，才清空草稿。该输出仍只存在于 Console 和内存，不是服务端保存。

## 8. 常见错误与排查路径

**明确错误示例：把通知当命令等待。**

**关键片段：`apps/vue-web/src/BadListingForm.vue`**

```ts
const emit = defineEmits<{ save: [input: ListingInput] }>()
await emit('save', result.value)
Object.assign(draft, { title: '', description: '', price: '' })
```

`emit` 不返回父处理器的 Promise，草稿会在父级失败前被清空。修复为可等待的 `save` prop，
成功后再发送 `saved` 通知。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 父级保存延迟后失败，表单却先显示成功且草稿消失 |
| 证据 | Network/Console 显示失败发生在清空之后；子组件使用 `await emit('save')` |
| 原因 | 组件 emit 是同步通知接口，不汇总父处理器 Promise |
| 修复 | 把保存定义为 `(input) => Promise<void>` prop，并在 try 中 await |
| 复验 | 再次注入失败，显示 alert、草稿保留、按钮恢复；成功才清空 |

另一个错误是金额输入使用 `v-model.number` 后直接乘 100。它会丢失编辑中间态，并把宽松转换
当成验证。恢复字符串草稿和 `parsePrice`。

## 9. 课后题

1. 为什么组件事件不会自动传到祖父组件？
2. `defineModel` 是否让子组件成为状态拥有者？
3. 为什么 `35.10` 不应先 `parseFloat` 再乘 100？
4. 为什么失败时必须保留草稿？
5. `inputmode="decimal"` 是否能阻止粘贴 `1e2`？

**参考答案：**

1. Vue 组件事件只通知直接父级，跨层需显式转发或重新设计所有权。
2. 不会；它实现 prop/update 协议，父级仍拥有值。
3. 浮点和宽松解析不能表达完整格式契约，整数/小数分段转换更精确。
4. 用户输入是可恢复工作，基础设施或验证失败不应造成数据丢失。
5. 不能，它只提示键盘布局，提交边界仍需验证。

## 10. 实践练习

### 基础：剩余字数

显示描述剩余字符数。

**参考答案方向：**使用 `computed(() => 500 - draft.description.length)`，不使用 watch 维护第二份数字。

### 进阶：组件交互测试

使用 Vue Test Utils 注入会 reject 的 `save`，填写三个字段并 submit。

**答案标准：**断言草稿仍存在、错误可见、按钮恢复；不能用任意 sleep，使用 `flushPromises`。

### 故障注入：重复提交

让 save 延迟 1 秒，快速按 Enter 两次。

**答案标准：**保存函数只调用一次；按钮 pending；函数开头的状态守卫仍存在，不能只依赖 disabled。

## 11. 阶段验收

- [ ] 金额边界表格测试通过，实际测试数量已记录。
- [ ] 搜索字段的 `v-model` 与 clear 通知职责清楚。
- [ ] 发布表单支持 Tab、Enter 和鼠标路径。
- [ ] pending 可见并阻止重复提交。
- [ ] 验证失败和保存失败都保留草稿。
- [ ] 只有保存成功才清空并发出 `saved`。
- [ ] `pnpm typecheck`、测试和构建均通过。
- [ ] 未把前端成功提示描述成持久化或授权证据。

## 12. 常见问题

**为什么保存用 prop，其他动作常用 emit？**

这里子组件必须等待完成来决定是否清空。无需等待结果的“选择了某项”更适合通知事件。

**能否只依赖 HTML `required`？**

不能。原生约束改善交互，纯验证提供统一业务格式，后端还要再次验证。

**零元为什么合法？**

统一业务契约允许免费转让；空输入与合法 `0` 必须区分。

**错误消息是否直接显示服务器堆栈？**

不能。稳定错误体只给恢复所需信息和 requestId，敏感堆栈留在受控日志。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [Vue：组件事件](https://vuejs.org/guide/components/events.html)
- [Vue：组件 `v-model`](https://vuejs.org/guide/components/v-model.html)
- [Vue：表单输入绑定](https://vuejs.org/guide/essentials/forms.html)
- [Vue：`useId`](https://vuejs.org/api/composition-api-helpers.html#useid)
- [Vitest：参数化测试](https://vitest.dev/api/#test-each)

## 我现在能做到什么

我能建立类型化组件输入输出，能把金额字符串严格转换为整数分，并能实现失败保稿、成功重置、
键盘可提交的表单状态机。

## 单元导航

[上一课：响应式与更新队列](01-ref-reactive-computed-updates.md) ·
[返回章目录](../README.md#第二章响应式事件与可提交表单) ·
[下一课：搜索、发布与状态所有权](03-search-publish-state-ownership.md)
