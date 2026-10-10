# 用可控输入证明纯函数、组件与 Store 契约

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | Vitest、Vue Test Utils、Pinia、发布表单与 market store |
| 输入 | 金额字符串、草稿、成功/失败 Promise、乱序响应 |
| 输出 | 纯函数、组件和 store 三层可重复测试 |
| 命令 | `vitest run`、`vue-tsc -b` |
| 观察 | 请求整数分、失败留草稿、收藏幂等、旧结果失效 |
| 边界 | Mock 只替换持久化边界，不替换待测业务规则 |

## 1. 任务背景

“组件能挂载”不能证明金额没有精度错误，“按钮被点击”也不能证明失败时保留草稿。邻里集市的高风险规则跨三层：金额解析是纯函数，提交后的 DOM 状态属于组件，响应乱序属于 store。

把所有断言塞进 E2E 会变慢且难定位；把所有依赖都 Mock 又会删除真实风险。本课按最小责任选择测试层。

## 2. 学习目标

- 用表驱动测试覆盖金额上下界和非法语法。
- 用可访问名称驱动 Vue Test Utils 输入与提交。
- 区分 `nextTick` 与 `flushPromises`。
- 为每个测试创建新 Pinia，避免状态泄漏。
- 用 deferred Promise 精确控制完成顺序，不使用任意 sleep。

## 3. 预备知识

安装并记录实际版本：

```bash
pnpm add -D vitest @vue/test-utils jsdom
pnpm list vitest @vue/test-utils jsdom --depth 0
```

Vitest 环境配置为 jsdom，测试文件匹配 `src/**/*.test.ts`。jsdom 提供 DOM API 模型，不实现真实布局、网络栈或辅助技术。

## 4. 核心理论

### 4.1 测试层按风险分工

| 风险 | 最低有效层 | 原因 |
| --- | --- | --- |
| 金额语法/上限 | 纯函数 | 输入输出确定，定位最快 |
| 表单失败留草稿 | 组件 | 需要事件、异步状态和 DOM |
| 收藏响应乱序 | store | 需要 action 与完成顺序，不需要浏览器 |
| label/键盘/路由焦点 | 浏览器 | jsdom 不提供真实交互与布局 |
| 并发预约唯一 | 后端集成 | 前端 Mock 无数据库约束 |

测试应断言用户可见结果和稳定领域输出，不直接读取组件私有 ref。`setValue()` 和 `trigger('submit')` 穿过公开 DOM 接口；直接调用内部函数会绕过接线错误。

### 4.2 等待真实条件

`nextTick()` 等待 Vue 响应式更新队列；`flushPromises()` 让已排队 Promise 完成。两者都不是“等 500ms 看运气”。当组件发起异步 save，应先触发表单，再 `flushPromises()`，最后断言 DOM。

### 4.3 Mock 边界

发布测试可以传入 `save` 函数，因为目标是组件如何处理协议结果。`parsePrice` 和 `validateDraft` 必须用真实实现，否则测试永远成功也无法发现金额错误。store 测试 Mock `api`，但保留 epoch、busy 和数组收敛逻辑。

## 5. 元素、属性、API 或配置清单

| API | 作用 | 本课模式 | 误用 |
| --- | --- | --- | --- |
| `it.each` | 表驱动边界 | 金额输入/期望 | 只测一个正常值 |
| `mount` | 渲染组件 | 传真实 props/provider | 读取私有实例 |
| `setValue` | 输入并触发事件 | input/textarea | 直接改 ref |
| `trigger` | 触发 submit/click | `form.trigger('submit')` | 绕过表单 |
| `flushPromises` | 完成 Promise 队列 | save 后等待 | 固定 sleep |
| `createPinia` | 独立 store 容器 | 每测试创建 | 全文件共享脏状态 |
| `vi.mocked` | 类型化 Mock | `api` | Mock 掉全部业务 |
| `wrapper.unmount` | 清理组件 | 每用例结束 | 泄漏 watcher |

## 6. 最小可运行案例

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/form.ts`**

```ts
export type ListingDraft = {
  title: string
  description: string
  price: string
}

export type ValidDraft = Omit<ListingDraft, 'price'> & {
  priceCents: number
}

const PRICE = /^(0|[1-9]\d{0,6})(?:\.(\d{1,2}))?$/

export function parsePrice(input: string): number | null {
  const value = input.trim()
  const match = PRICE.exec(value)
  if (!match) return null
  const [yuanText, fraction = ''] = value.split('.')
  const cents = Number(yuanText) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents <= 100_000_000 ? cents : null
}

export function validateDraft(draft: ListingDraft):
  | { ok: true; value: ValidDraft }
  | { ok: false; message: string } {
  const title = draft.title.trim()
  const description = draft.description.trim()
  if (title.length < 2 || title.length > 60) {
    return { ok: false, message: '标题需要 2 到 60 个字符。' }
  }
  if (description.length < 5 || description.length > 500) {
    return { ok: false, message: '描述需要 5 到 500 个字符。' }
  }
  const priceCents = parsePrice(draft.price)
  if (priceCents === null) {
    return { ok: false, message: '价格需为 0 到 1000000.00 的普通小数。' }
  }
  return { ok: true, value: { title, description, priceCents } }
}
```

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/form.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { parsePrice, validateDraft } from './form'

describe('price-and-draft-contract', () => {
  it.each([
    ['35.10', 3510],
    ['0', 0],
    ['1000000.00', 100_000_000],
    ['-1', null],
    ['01', null],
    ['3e2', null],
    ['35.001', null],
    ['1000000.01', null],
  ])('parsePrice(%s) -> %s', (input, expected) => {
    expect(parsePrice(input)).toBe(expected)
  })

  it('规范化合法草稿', () => {
    expect(validateDraft({
      title: ' 二手书架 ',
      description: ' 可拆卸，配件齐全。 ',
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

预期所有表项通过。故意删除前导零限制后，`01` 用例必须失败；恢复实现再复验。

## 7. 邻里集市集成案例

### 7.1 表单失败保留草稿

**关键片段：`apps/vue-web/src/ListingForm.test.ts`**

```ts
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ListingForm from './ListingForm.vue'

async function fill(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('[name="title"]').setValue('二手书架')
  await wrapper.get('[name="description"]').setValue('可拆卸，配件齐全。')
  await wrapper.get('[name="price"]').setValue('120.00')
}

describe('failed-publish-keeps-draft', () => {
  it('失败显示 alert、保留输入并恢复按钮', async () => {
    const save = vi.fn().mockRejectedValue(new Error('服务暂不可用'))
    const wrapper = mount(ListingForm, { props: { save } })
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('服务暂不可用')
    expect(wrapper.get('[name="title"]').element).toHaveProperty('value', '二手书架')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.emitted('saved')).toBeUndefined()
    wrapper.unmount()
  })

  it('成功发送整数分并清空草稿', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const wrapper = mount(ListingForm, { props: { save } })
    await fill(wrapper)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(save).toHaveBeenCalledWith({
      title: '二手书架',
      description: '可拆卸，配件齐全。',
      priceCents: 12000,
    })
    expect(wrapper.get('[name="title"]').element).toHaveProperty('value', '')
    expect(wrapper.emitted('saved')).toHaveLength(1)
    wrapper.unmount()
  })
})
```

### 7.2 Store 响应顺序

**关键片段：`apps/vue-web/src/stores/market.test.ts`**

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../api'
import { useMarketStore } from './market'

vi.mock('../api', () => ({ api: vi.fn() }))
const request = vi.mocked(api)

beforeEach(() => {
  setActivePinia(createPinia())
  request.mockReset()
})

describe('favorite-target-is-idempotent', () => {
  it('重复目标只有一个 ID', async () => {
    request.mockResolvedValue({ ok: true })
    const store = useMarketStore()
    store.user = { id: 'demo-buyer', name: '演示居民' }
    await store.setFavorite('lamp-1', true)
    await store.setFavorite('lamp-1', true)
    expect(store.favoriteIds).toEqual(['lamp-1'])
  })
})

describe('late-session-result-is-ignored', () => {
  it('退出后旧收藏结果不回写', async () => {
    let finish!: (value: unknown) => void
    request.mockImplementationOnce(() =>
      new Promise(resolve => { finish = resolve }),
    )
    const store = useMarketStore()
    store.user = { id: 'demo-buyer', name: '演示居民' }
    const oldWrite = store.setFavorite('lamp-1', true)
    request.mockResolvedValueOnce({ ok: true })
    await store.logout()
    finish({ ok: true })
    await oldWrite
    expect(store.user).toBeNull()
    expect(store.favoriteIds).toEqual([])
  })

  it('退出后晚到登录不能复活旧会话', async () => {
    let finishLogin!: (value: unknown) => void
    request.mockImplementationOnce(() =>
      new Promise(resolve => { finishLogin = resolve }),
    )
    const store = useMarketStore()
    const oldLogin = store.login()
    request.mockResolvedValueOnce({ ok: true })
    await store.logout()
    finishLogin({ id: 'old-user', name: '旧居民' })
    await oldLogin
    expect(store.user).toBeNull()
  })

  it('新登录后晚到退出不能清除新会话', async () => {
    let finishLogout!: (value: unknown) => void
    request.mockImplementationOnce(() =>
      new Promise(resolve => { finishLogout = resolve }),
    )
    const store = useMarketStore()
    store.user = { id: 'old-user', name: '旧居民' }
    const oldLogout = store.logout()
    request.mockResolvedValueOnce({ id: 'new-user', name: '新居民' })
    await store.login()
    finishLogout({ ok: true })
    await oldLogout
    expect(store.user).toEqual({ id: 'new-user', name: '新居民' })
  })
})
```

deferred Promise 直接控制顺序。测试只证明 store 不接受旧结果，不能证明服务器撤销了已经执行的写入。

## 8. 常见错误与排查路径

**错误示例：用 sleep 等状态。**

```ts
await new Promise(resolve => setTimeout(resolve, 1000))
expect(wrapper.text()).toContain('发布成功')
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 测试偶发失败 | CI 时间波动 | 任意 sleep | 等 Promise/DOM 条件 | 重复运行稳定 |
| 失败用例草稿为空 | DOM 显示已重置 | finally 中清表单 | 仅成功分支 reset | 失败断言通过 |
| 单独通过、全集失败 | 前一测试 store 残留 | 共享 Pinia | `beforeEach(createPinia)` | 任意顺序通过 |
| 金额错误没被发现 | `validateDraft` 被 Mock | Mock 过界 | 保留真实纯函数 | 变异输入使测试变红 |
| jsdom 空字段仍提交 | 原生约束行为不完整 | 环境边界 | 业务校验 + 浏览器 E2E | 两层分别通过 |

## 9. 课后题

1. **何时使用 `nextTick`，何时使用 `flushPromises`？**<br>
   答：前者等 Vue DOM 更新队列，后者等已调度 Promise；异步提交常先完成 Promise，再观察 DOM。
2. **为什么每个 store 测试都创建 Pinia？**<br>
   答：保证状态、订阅和插件不跨用例泄漏，使结果与执行顺序无关。
3. **组件测试为何不直接调用 `submit()`？**<br>
   答：那会绕过表单事件、按钮接线和默认行为，无法证明用户路径。
4. **前端测试能证明预约唯一吗？**<br>
   答：不能，唯一性依赖服务端事务/数据库约束，前端只能验证如何显示 409。

## 10. 实践练习

**基础：补充金额边界。**加入空串、`35元`、空格包裹合法值，答案分别为 `null/null/对应整数分`。

**进阶：取消收藏失败。**先让 PUT 成功，再让 DELETE 抛错，断言 `favoriteIds` 仍含 `lamp-1` 且错误向组件传播。

**故障注入：去掉 epoch 检查。**运行晚到响应测试应失败；恢复检查后通过。完成标准是测试失败原因能指向会话所有权，而不是加 sleep。

## 11. 阶段验收

- [ ] 金额合法/非法表覆盖计划要求的全部语法。
- [ ] 成功请求体是 `priceCents: 12000`。
- [ ] 失败发布保留三项草稿且按钮恢复。
- [ ] 重复收藏目标不重复 ID。
- [ ] late response 测试使用 deferred Promise。
- [ ] 每测试新 Pinia，组件测试主动 unmount。
- [ ] 没有任意 sleep、吞异常或弱化断言。

运行并记录实际数量：

```bash
pnpm exec vitest run
pnpm exec vue-tsc -b
```

## 12. 常见问题

**可以全部使用浏览器测试吗？**<br>
技术上可以，但执行慢、失败定位差。纯规则和 store 顺序用更低层证据更稳定，关键接线再由浏览器覆盖。

**Vue Test Utils 的选择器能用 class 吗？**<br>
可以，但 class 常因样式变化而不稳定。优先原生 name、role 和可访问名称；完整 A11y 语义仍需真实浏览器检查。

**快照测试适合这些业务规则吗？**<br>
不适合作为主证据。快照能发现结构变化，却不能清楚表达金额边界、失败保留或并发所有权。

## 13. 扩展阅读

资料快照日期：2026-10-10。

- [Vue Testing Guide](https://vuejs.org/guide/scaling-up/testing.html)：测试层和组件契约。
- [Vue Test Utils](https://test-utils.vuejs.org/guide/)：挂载、事件和异步行为。
- [Vitest Guide](https://vitest.dev/guide/)：Mock、表驱动和运行方式。
- [Pinia Testing](https://pinia.vuejs.org/cookbook/testing.html)：活动 Pinia 与 store 隔离。

## 我现在能做到什么

我能把纯规则、组件行为和 store 时序放在合适测试层，用确定输入而不是等待运气证明关键契约。

## 单元导航

[返回章入口](../06-testing-accessibility.md) · [下一课：路由、浏览器与无障碍](02-router-browser-accessibility-errors.md)
