# 受控、非受控表单与金额验证

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 可访问、可失败恢复的发布表单与纯金额解析器 |
| 建议时间 | 120 分钟 |
| 核心契约 | `35.10 -> 3510`；零元与 1000000.00 元合法 |
| 失败要求 | 非法输入不提交；保存失败保留全部草稿 |
| 完成证据 | 金额边界测试通过，成功后才重置表单 |

表单验证只改善前端反馈。服务端仍须验证字段、解析会话、检查对象权限；浏览器提交的 `ownerId`、角色或 buyer ID 都不能作为授权依据。

## 1. 任务背景

居民输入价格时处于字符串编辑过程：空串、`35.`、`35.1` 都可能是中间状态。若输入框 state 直接保存 number，空串和小数点会被过早吞掉；若用 `parseFloat`，`35元`、科学计数或多余字符可能被宽松接受。

邻里集市要求金额存储和传输使用整数分，合法范围为 0 到 1000000.00 元。发布失败必须保留草稿，成功后才清空，避免用户因网络或会话故障重新填写。

## 2. 学习目标

- 区分受控输入的 `value` 与非受控输入的 `defaultValue`。
- 用字符串保存金额编辑状态，验证后转换为整数分。
- 精确拒绝负数、科学计数、前导零、三位小数和超限值。
- 使用 `useId` 建立 label、帮助和错误关联。
- 统一使用 form `onSubmit` 支持点击与 Enter。
- 建模 idle、pending、error、success 互斥状态。
- 保存失败保留草稿，保存成功后重置。
- 用表格测试锁定输入契约。

## 3. 预备知识

本课沿用第 1 章工程和上一课 state 快照。安装测试工具时记录实际版本：

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm add -D vitest@5.0.3
pnpm pkg set scripts.test="vitest run"
pnpm list vitest --depth 0
```

如果注册表无法解析该版本，保留错误并重新核对版本基线，不静默换预发布包。纯解析器不依赖 DOM，可在 Node 环境测试。

## 4. 核心理论

### 4.1 受控与非受控

受控输入以 React state 为真相：

```tsx
<input value={title} onChange={(event) => setTitle(event.target.value)} />
```

非受控输入以 DOM 当前值为真相，`defaultValue` 只设置初值，提交时从 `FormData` 读取。两者都合法：

- 实时校验、联动和明确重置适合受控；
- 简单一次性提交可使用非受控；
- 同一字段不能一会儿 `undefined`、一会儿字符串，否则会切换模式。

### 4.2 金额先解析字符串

规则分两步：

1. 正则只接受规范十进制表示；
2. 整数部分乘 100，小数部分补足两位，再检查安全整数与上限。

不使用 `Number(text) * 100` 直接转换，因为输入语法可能过宽，二进制浮点还可能产生非整数结果。

### 4.3 状态应互斥

三个 boolean `isPending/isError/isSuccess` 可以同时为真。联合类型只允许一个状态。pending 时阻止重复提交；error 用 `role="alert"`，普通进度与成功用 `role="status"`。

### 4.4 浏览器验证与业务验证分层

`required`、`maxLength` 提供基础交互；`validateDraft` 提供可测试规则；服务端再次执行权威验证。任一层成功都不能证明当前用户有发布权限。

## 5. 元素、属性、API 或配置清单

| API / 属性 | 用途 | 边界 |
| --- | --- | --- |
| `value` + `onChange` | 受控输入 | 初值保持字符串 |
| `defaultValue` | 非受控初值 | 后续 prop 变化不会同步 DOM |
| `FormData` | 读取表单成功控件 | 返回 `FormDataEntryValue` |
| `onSubmit` | 统一点击与 Enter | 需要 `preventDefault` |
| `useId` | 生成同页唯一关联 ID | 不作为商品 key |
| `required` | 浏览器空值约束 | 不替代服务端验证 |
| `maxLength` | 限制输入长度 | 服务端仍需限制 |
| `inputMode="decimal"` | 提示移动键盘 | 不是验证规则 |
| `aria-describedby` | 关联帮助文本 | ID 必须真实存在 |
| `aria-busy` | 表示表单处理中 | 同时禁用重复提交 |
| `role="alert"` | 宣告错误 | 不用于普通成功信息 |
| `role="status"` | 宣告进度与成功 | 保持信息简洁 |

## 6. 最小可运行案例

先实现纯边界：

**完整文件：`apps/react-web/src/form.ts`**

```ts
export type Draft = Readonly<{
  title: string
  description: string
  price: string
}>

export type ListingInput = Readonly<{
  title: string
  description: string
  priceCents: number
}>

export type ValidationResult =
  | { ok: true; value: ListingInput }
  | { ok: false; message: string }

export function parsePrice(text: string): number | null {
  const match = /^(0|[1-9]\d{0,6})(?:\.(\d{1,2}))?$/.exec(text.trim())
  if (!match) return null

  const integerPart = Number(match[1])
  const fractionPart = Number((match[2] ?? '').padEnd(2, '0'))
  const cents = integerPart * 100 + fractionPart

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

**完整文件：`apps/react-web/src/form.test.ts`**

```ts
import { describe, expect, it } from 'vitest'
import { parsePrice, validateDraft } from './form'

describe('price-and-draft-contract', () => {
  it.each([
    ['0', 0],
    ['0.00', 0],
    ['35.1', 3510],
    ['35.10', 3510],
    ['1000000.00', 100_000_000],
  ])('parses %s as integer cents', (text, expected) => {
    expect(parsePrice(text)).toBe(expected)
  })

  it.each([
    '-1',
    '01',
    '3e2',
    '35.001',
    '1000000.01',
    'Infinity',
    '',
  ])('rejects %s', (text) => {
    expect(parsePrice(text)).toBeNull()
  })

  it('trims text and returns a complete input', () => {
    expect(validateDraft({
      title: '  二手书架  ',
      description: '  保存完好，可自提。  ',
      price: '120.00',
    })).toEqual({
      ok: true,
      value: {
        title: '二手书架',
        description: '保存完好，可自提。',
        priceCents: 12000,
      },
    })
  })
})
```

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm test
pnpm typecheck
```

预期所有表格用例通过。测试名 `price-and-draft-contract` 与 React/Vue 共享业务场景一致。

## 7. 邻里集市集成案例

**完整文件：`apps/react-web/src/ListingForm.tsx`**

```tsx
import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { validateDraft } from './form'
import type { ListingInput } from './form'

type SubmitState =
  | { status: 'idle'; message: '' }
  | { status: 'pending'; message: string }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string }

type ListingFormProps = Readonly<{
  onSave: (input: ListingInput) => Promise<void> | void
}>

export default function ListingForm({ onSave }: ListingFormProps) {
  const id = useId()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: 'idle',
    message: '',
  })

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitState.status === 'pending') return

    const result = validateDraft({ title, description, price })
    if (!result.ok) {
      setSubmitState({ status: 'error', message: result.message })
      return
    }

    setSubmitState({ status: 'pending', message: '正在发布……' })
    try {
      await onSave(result.value)
      setTitle('')
      setDescription('')
      setPrice('')
      setSubmitState({ status: 'success', message: '发布成功。' })
    } catch (error) {
      setSubmitState({
        status: 'error',
        message: error instanceof Error ? error.message : '发布失败。',
      })
    }
  }

  const messageId = `${id}-message`
  const priceHelpId = `${id}-price-help`

  return (
    <form
      aria-label="发布商品"
      aria-busy={submitState.status === 'pending'}
      onSubmit={submit}
    >
      <h2>发布闲置</h2>

      <label htmlFor={`${id}-title`}>标题</label>
      <input
        id={`${id}-title`}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
        maxLength={60}
      />

      <label htmlFor={`${id}-description`}>描述</label>
      <textarea
        id={`${id}-description`}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        required
        maxLength={500}
      />

      <label htmlFor={`${id}-price`}>价格（元）</label>
      <input
        id={`${id}-price`}
        inputMode="decimal"
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        aria-describedby={`${priceHelpId} ${messageId}`}
        required
      />
      <p id={priceHelpId}>0 至 1000000 元，最多两位小数。</p>

      <button disabled={submitState.status === 'pending'}>
        {submitState.status === 'pending' ? '正在发布' : '发布'}
      </button>
      <p
        id={messageId}
        role={submitState.status === 'error' ? 'alert' : 'status'}
      >
        {submitState.message}
      </p>
    </form>
  )
}
```

父级的 `onSave` 决定写入内存还是发 HTTP；表单只负责草稿、验证和提交状态。失败抛出错误，字段保持；成功 resolve 后字段才重置。

## 8. 常见错误与排查路径

### 明确错误：用宽松浮点解析金额

```ts
const priceCents = Math.round(parseFloat(text) * 100)
```

`parseFloat('35元')` 会得到 35，`parseFloat('3e2')` 会接受科学计数；这不符合业务输入契约。

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | 输入 `35元` 或 `3e2` 仍能发布，服务端可能随后返回 400 |
| 证据 | 单测显示宽松解析器产生 3500 或 30000，而契约要求 `null` |
| 原因 | `parseFloat` 允许尾随字符和指数形式 |
| 修复 | 先用完整匹配的十进制正则，再按字符串小数位组装整数分 |
| 复验 | 合法边界通过，负数/指数/前导零/三位小数/超限全部拒绝 |

其他错误：

- 先清空字段再 `await onSave`：把重置移动到成功分支。
- `value={maybeUndefined}`：始终使用字符串初值。
- 只在按钮 `onClick` 提交：改用 form `onSubmit` 支持 Enter。
- 把 `ownerId` 放进表单：删除；身份由服务端 HttpOnly Cookie 会话解析。

## 9. 课后题

1. 为什么金额输入 state 保持字符串？
2. `inputMode="decimal"` 是否会阻止非法字符？
3. 为什么失败后不应清空草稿？
4. 前端验证通过为何仍可能收到 400？

参考答案：

1. 编辑中间态包含空串和不完整小数，只有提交验证后才转换为整数分。
2. 不会，它只是键盘提示，必须执行业务验证。
3. 网络、会话或服务故障不应迫使用户重新输入。
4. 服务端是权威边界，规则可能更严格，且请求可能被篡改或过期。

## 10. 实践练习

### 基础

增加“取消”按钮，清空字段和消息。必须使用 `type="button"`。完成标准：点击不触发提交，Tab 可到达。

### 进阶

实现非受控的“快速搜索”表单，提交时用 `FormData` 读取 `q`。完成标准：不同时从过期 React state 读取 q，GET 语义明确。

### 故障注入

让 `onSave` 抛出 `new Error('演示写入失败')`。完成标准：出现 alert、按钮重新启用、三个字段原样保留；恢复成功函数后才清空。

答案判定：金额矩阵全部满足；取消按钮不提交；非受控字段只有 DOM/FormData 一份真相；故障路径不假报成功。

## 11. 阶段验收

- [ ] `price-and-draft-contract` 全部通过。
- [ ] `0` 与 `1000000.00` 合法。
- [ ] 负数、指数、前导零、三位小数、超限值拒绝。
- [ ] 表单 label、帮助文本和状态信息关联完整。
- [ ] Enter 与按钮都只提交一次。
- [ ] pending 禁止重复提交。
- [ ] 失败保留草稿，成功才重置。
- [ ] 请求对象只包含业务输入，不包含伪造身份。

## 12. 常见问题

**可以直接用 `<input type="number">` 吗？**<br>
可以作为控件选择，但仍应保存字符串并执行相同业务解析；不同浏览器对中间态和本地化输入行为不同。

**为什么 `35.1` 等于 3510 分？**<br>
小数部分补足两位，“1”表示一角，即 10 分。

**成功提示应该永久保留吗？**<br>
由产品需求决定；本课只要求状态可观察且不与错误同时出现。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**。

- [React DOM：input](https://react.dev/reference/react-dom/components/input)
- [React DOM：form](https://react.dev/reference/react-dom/components/form)
- [React：useId](https://react.dev/reference/react/useId)
- [MDN：FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [MDN：inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/inputmode)
- [Vitest：参数化测试](https://vitest.dev/api/#test-each)

## 我现在能做到什么

我能用受控或非受控策略管理表单，精确把十进制金额转换为整数分，并让失败可恢复、成功可判定。

## 单元导航

[上一课：事件、状态快照与更新](01-events-state-snapshots-updates.md) · [返回章节入口](../02-events-state-forms.md) · [下一课：搜索、发布与状态所有权](03-search-publish-state-ownership.md)
