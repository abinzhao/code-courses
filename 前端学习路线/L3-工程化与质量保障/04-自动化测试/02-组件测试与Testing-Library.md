# 02-组件测试与 Testing Library

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L3 工程化与质量保障
> - 先修：[01-Vitest 单元测试实战](./01-Vitest单元测试实战.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Testing Library](https://testing-library.com/docs/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解组件测试的核心哲学：测行为，不测实现
- 掌握 Testing Library 的三级查询优先级：角色 > 文本 > testId
- 能使用 React Testing Library 编写表单组件的全套测试
- 能使用 Vue Testing Library 实现等价测试
- 理解 userEvent vs fireEvent 的本质区别
- 掌握异步更新的等待策略

---

## 内容讲解

### 一、组件测试的核心哲学

组件测试最大的坑是**测实现细节**。看一个反面教材：

```typescript
// ❌ 反面教材：测实现细节
it('点击按钮后 count 状态变为 1', () => {
  const { result } = renderHook(() => useCounter())
  act(() => result.current.increment())
  expect(result.current.count).toBe(1)
})

// ✅ 正确的测试：测行为
it('点击按钮后页面显示计数 1', async () => {
  render(<Counter />)
  await userEvent.click(screen.getByRole('button', { name: '增加' }))
  expect(screen.getByText('计数：1')).toBeVisible()
})
```

两者的区别：

| 维度 | 测实现 | 测行为 |
|------|--------|--------|
| 断言对象 | 内部状态（count） | 页面上的可见文本 |
| 重构安全 | ❌ 改内部实现，测试全红 | ✅ 只要页面表现不变，测试就绿 |
| 可读性 | 只有开发者懂 | 所有人都能看懂 |
| 信心 | 低——不代表用户能看到正确结果 | 高——用户看到什么，你就测什么 |

**Testing Library 的设计原则：你的测试越像用户使用软件的方式，你的测试就越能给你信心。**

---

### 二、三种查询方式的优先级

Testing Library 的查询 API 有明确的优先级排序：

```
getByRole（最推荐） > getByLabelText > getByPlaceholderText
> getByText > getByDisplayValue
> getByAltText > getByTitle
> getByTestId（最后手段）
```

**为什么不推荐 getByTestId？** 因为用户在页面上看不到 `data-testid`。如果你大量依赖 testid，你测试的不是用户视角，而是实现细节。testid 只在一件事上有用：当你实在无法通过其他方式定位元素时（比如动态生成的列表项），它比其他 hack 方式更稳定。

```typescript
// 优先级演示：同一个按钮的三种查询方式

// ✅ 最好：用户看到的就是一个叫"提交"的按钮
screen.getByRole('button', { name: '提交' })

// ⚠️ 还行：用户确实能看到这个文字
screen.getByText('提交')

// ❌ 最后手段：data-testid 对用户不可见
screen.getByTestId('submit-btn')
```

---

### 三、React Testing Library 核心 API

先来看一个完整的测试入门的全貌：

```typescript
// Greeting.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import Greeting from './Greeting'

// 组件源码：
// function Greeting() {
//   const [name, setName] = useState('')
//   return (
//     <div>
//       <label htmlFor="name">你的名字</label>
//       <input id="name" value={name} onChange={e => setName(e.target.value)} />
//       {name && <p>你好，{name}！</p>}
//     </div>
//   )
// }

describe('Greeting 组件', () => {
  // 核心流程：render → 查询 → 交互 → 断言
  it('输入名字后显示问候语', async () => {
    // 1. render：把组件渲染到 jsdom 中
    render(<Greeting />)

    // 2. 查询：通过 label 文字找到 input（getByLabelText 关联 <label htmlFor>）
    const input = screen.getByLabelText('你的名字')

    // 3. 交互：模拟用户输入（注意一定要 await！）
    await userEvent.type(input, '小明')

    // 4. 断言：页面上出现了问候语
    expect(screen.getByText('你好，小明！')).toBeVisible()
  })

  it('名字为空时不显示问候语', () => {
    render(<Greeting />)
    // queryByText：查找元素，找不到返回 null（不抛异常）
    expect(screen.queryByText(/你好/)).toBeNull()
  })
})
```

**核心 API 速查表：**

| API | 用途 |
|-----|------|
| `render(<Component />)` | 渲染组件到 jsdom，返回 `container` 和查询方法 |
| `screen.getByRole(...)` | 按 ARIA role 查询，找不到抛异常 |
| `screen.queryByRole(...)` | 同上，但找不到返回 null |
| `screen.findByRole(...)` | 异步查询，返回 Promise，等元素出现 |
| `screen.getAllByRole(...)` | 查多个元素，返回数组 |
| `userEvent.click(el)` | 模拟真实用户点击 |
| `userEvent.type(el, 'text')` | 模拟真实用户输入 |
| `fireEvent.change(el, ...)` | 直接触发 DOM 事件（不推荐，见第四节） |

**getBy / queryBy / findBy 的区别：**

| | 找不到时 | 使用场景 |
|---|---|---|
| `getBy...` | 抛异常 | 同步断言元素**此刻存在** |
| `queryBy...` | 返回 null | 断言元素**不存在** |
| `findBy...` | reject Promise | 断言元素**最终会出现**（异步） |

---

### 四、userEvent vs fireEvent：本质区别

这是绝大多数初学者最容易搞混的概念。

```typescript
// fireEvent：直接触发一个 DOM 事件
fireEvent.change(input, { target: { value: 'a' } })
// ↑ 等价于 input.dispatchEvent(new Event('change'))

// userEvent：模拟真实用户的操作序列
await userEvent.type(input, 'a')
// ↑ 等价于 { focus → keyDown → keyPress → input event → keyUp → change event }
```

**真实差别：**

假设你有个输入框，它的 onChange 逻辑里检查了 `event.target.value`。用 `fireEvent.change`，你必须手动构造 `{ target: { value: '...' } }`。而 `userEvent.type` 会自动触发完整的键盘事件链，浏览器的 `target.value` 会被自然填充。

再举个更明显的例子——一个按钮在 `onMouseDown` 和 `onMouseUp` 之间有不同的 UI 状态：

```typescript
// ❌ fireEvent.click 只触发 click 事件，跳过了 mousedown/mouseup
fireEvent.click(button)

// ✅ userEvent.click 触发完整序列：hover → mousedown → mouseup → click
await userEvent.click(button)
```

**结论：测试点击、输入、Tab 等用户操作时，优先使用 `userEvent`。** 当 `userEvent` 不支持目标事件（如 `animationEnd`）、需要精确测试单个底层 DOM 事件，或测试环境无法完成完整交互序列时，再使用 `fireEvent`。

---

### 五、常用查询示例

```typescript
import { render, screen } from '@testing-library/react'

// 假设我们测试这样一个表单：
// <form aria-label="登录表单">
//   <label htmlFor="email">邮箱</label>
//   <input id="email" type="email" placeholder="请输入邮箱" />
//
//   <label htmlFor="password">密码</label>
//   <input id="password" type="password" />
//
//   <button type="submit">登录</button>
// </form>

describe('查询 API 速查', () => {
  beforeEach(() => {
    render(<LoginForm />)
  })

  it('getByRole —— 最推荐的查询方式', () => {
    // 按钮的 role 默认是 'button'，用 name 匹配按钮上的文字
    expect(screen.getByRole('button', { name: '登录' })).toBeVisible()

    // 表单有 aria-label 时可以用 role 'form'
    expect(screen.getByRole('form', { name: '登录表单' })).toBeVisible()

    // textbox 是 input[type="email"] 和 input[type="text"] 的 role
    expect(screen.getByRole('textbox', { name: '邮箱' })).toBeVisible()
    // 注：input[type="password"] 没有 name 关联时可能无法通过 getByRole 查
  })

  it('getByLabelText —— 通过 label 文字找 input', () => {
    // 匹配 <label htmlFor="email">邮箱</label> → <input id="email">
    expect(screen.getByLabelText('邮箱')).toBeVisible()
    // 等价于：getByRole('textbox', { name: '邮箱' })
  })

  it('getByPlaceholderText —— 通过 placeholder 找 input', () => {
    expect(screen.getByPlaceholderText('请输入邮箱')).toBeVisible()
  })

  it('getByText —— 通过文本内容查找元素', () => {
    // 查找包含"登录"文字的按钮（如果 getByRole 定位不够精确时才用）
    expect(screen.getByText('登录')).toBeVisible()
  })

  it('getByTestId —— 最后手段', () => {
    // 需要组件中有 data-testid="login-btn"
    expect(screen.getByTestId('login-btn')).toBeVisible()
  })
})
```

**一个实用技巧：** 用 `screen.logTestingPlaygroundURL()` 可以在浏览器中打开 Testing Playground，帮你找到某个元素的最佳查询方式。

---

### 六、等待异步更新

组件常常有异步行为：API 请求、延迟渲染、动画结束后显示内容。Testing Library 的异步查询就是为这个场景设计的：

```typescript
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('异步行为测试', () => {
  // 场景：点击"加载"按钮 → 显示 loading → 请求完成后显示数据

  it('findBy —— 等待元素出现', async () => {
    render(<UserList />)
    await userEvent.click(screen.getByText('加载用户'))

    // findByText 会不断重试直到找到元素，默认超时 1000ms
    const userItem = await screen.findByText('Alice')
    expect(userItem).toBeVisible()
  })

  it('waitFor —— 等待任意条件满足', async () => {
    render(<UserList />)
    await userEvent.click(screen.getByText('加载用户'))

    // waitFor 更灵活：可以等待任意断言
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeVisible()
      expect(screen.queryByText('加载中...')).toBeNull()
    })
  })

  it('waitForElementToBeRemoved —— 等待元素消失', async () => {
    render(<UserList />)
    await userEvent.click(screen.getByText('加载用户'))

    // 等待 loading 文案消失（意味着数据加载完成）
    await waitForElementToBeRemoved(() => screen.queryByText('加载中...'))

    // 此时数据已经出现
    expect(screen.getByText('Alice')).toBeVisible()
  })
})
```

**超时处理：** 默认超时 1000ms，可以在第三个参数中修改：
```typescript
await screen.findByText('Alice', {}, { timeout: 3000 })
```

---

### 七、哪些东西不应该测试？

这条规则简单但重要：**外部行为是测试目标，内部实现是测试禁区。**

| 不该测的（实现细节） | 应该测的（用户行为） |
|-------------------|-------------------|
| 组件内部 state 的值 | 页面上显示的文本 |
| `useEffect` 的执行次数 | 副作用导致的页面变化 |
| 子组件被传入的 props | 子组件渲染的内容 |
| CSS 类名（除 BEM 约定外） | 元素是否可见/不可见 |
| 内部方法是否被调用 | 用户操作后的结果 |
| Redux/Vuex store 的内部状态 | 状态变化后的 UI 表现 |

**对于第三方库：** 不重复验证第三方库已经承诺的内部逻辑。你不需要测 `useState` 的 `setState` 是否触发重渲染，那是 React 团队的职责；但要测试应用与第三方库之间的集成契约，例如适配器参数、错误回退和升级后仍需成立的关键行为。

---

### 八、React 实战：为一个表单组件编写完整测试

```typescript
// RegistrationForm.tsx —— 被测试的组件
import { useState, type FormEvent } from 'react'

interface FormData {
  username: string
  email: string
  password: string
  agreeToTerms: boolean
}

interface Props {
  onSubmit: (data: FormData) => Promise<void>
}

export default function RegistrationForm({ onSubmit }: Props) {
  const [form, setForm] = useState<FormData>({
    username: '', email: '', password: '', agreeToTerms: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.username.trim()) newErrors.username = '用户名不能为空'
    if (form.username.trim().length < 3) newErrors.username = '用户名至少 3 个字符'
    if (!form.email.includes('@')) newErrors.email = '邮箱格式不正确'
    if (form.password.length < 6) newErrors.password = '密码至少 6 位'
    if (!form.agreeToTerms) newErrors.agreeToTerms = '请同意服务条款'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    if (!validate()) return
    setSubmitting(true)
    try {
      await onSubmit(form)
    } catch {
      setSubmitError('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const updateField = (field: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
      setForm(prev => ({ ...prev, [field]: value }))
    }

  return (
    <form aria-label="注册表单" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="username">用户名</label>
        <input id="username" value={form.username} onChange={updateField('username')} />
        {errors.username && <span role="alert">{errors.username}</span>}
      </div>
      <div>
        <label htmlFor="email">邮箱</label>
        <input id="email" type="email" value={form.email} onChange={updateField('email')} />
        {errors.email && <span role="alert">{errors.email}</span>}
      </div>
      <div>
        <label htmlFor="password">密码</label>
        <input id="password" type="password" value={form.password} onChange={updateField('password')} />
        {errors.password && <span role="alert">{errors.password}</span>}
      </div>
      <div>
        <label>
          <input type="checkbox" checked={form.agreeToTerms} onChange={updateField('agreeToTerms')} />
          同意服务条款
        </label>
        {errors.agreeToTerms && <span role="alert">{errors.agreeToTerms}</span>}
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? '提交中...' : '注册'}
      </button>
      {submitError && <span role="alert">{submitError}</span>}
    </form>
  )
}
```

```typescript
// RegistrationForm.test.tsx —— 完整组件测试
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import RegistrationForm from './RegistrationForm'

// 辅助函数：一次性填写整个表单
async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('用户名'), 'zhangsan')
  await user.type(screen.getByLabelText('邮箱'), 'zhangsan@example.com')
  await user.type(screen.getByLabelText('密码'), '123456')
  await user.click(screen.getByRole('checkbox', { name: '同意服务条款' }))
}

describe('RegistrationForm', () => {
  // 每个用例使用独立的 userEvent 实例
  const setup = () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<RegistrationForm onSubmit={onSubmit} />)
    return { onSubmit, user }
  }

  // ==================== 渲染测试 ====================
  describe('初始渲染', () => {
    it('所有表单字段和注册按钮都已渲染', () => {
      setup()
      expect(screen.getByLabelText('用户名')).toBeVisible()
      expect(screen.getByLabelText('邮箱')).toBeVisible()
      expect(screen.getByLabelText('密码')).toBeVisible()
      expect(screen.getByRole('checkbox', { name: '同意服务条款' })).toBeVisible()
      expect(screen.getByRole('button', { name: '注册' })).toBeVisible()
    })

    it('初始状态没有错误提示', () => {
      setup()
      // queryByRole 找不到时返回 null，不会抛异常
      expect(screen.queryByRole('alert')).toBeNull()
    })
  })

  // ==================== 输入测试 ====================
  describe('用户输入', () => {
    it('输入用户名后输入框显示相应值', async () => {
      const { user } = setup()
      const input = screen.getByLabelText('用户名')
      await user.type(input, 'zhangsan')
      // 断言 input 的 value 属性
      expect(input).toHaveValue('zhangsan')
    })

    it('勾选复选框后状态更新', async () => {
      const { user } = setup()
      const checkbox = screen.getByRole('checkbox', { name: '同意服务条款' })
      expect(checkbox).not.toBeChecked()
      await user.click(checkbox)
      expect(checkbox).toBeChecked()
    })
  })

  // ==================== 验证测试 ====================
  describe('表单验证', () => {
    it('用户名为空时显示错误提示', async () => {
      const { user } = setup()
      // 不改任何输入，直接点提交
      await user.click(screen.getByRole('button', { name: '注册' }))
      expect(screen.getByText('用户名不能为空')).toBeVisible()
      // onSubmit 没有被调用
    })

    it('用户名少于 3 个字符时显示错误', async () => {
      const { user } = setup()
      await user.type(screen.getByLabelText('用户名'), 'ab')
      await user.click(screen.getByRole('button', { name: '注册' }))
      expect(screen.getByText('用户名至少 3 个字符')).toBeVisible()
    })

    it('邮箱格式不正确时显示错误', async () => {
      const { user } = setup()
      await user.type(screen.getByLabelText('用户名'), 'zhangsan')
      await user.type(screen.getByLabelText('邮箱'), 'not-an-email')
      await user.click(screen.getByRole('button', { name: '注册' }))
      expect(screen.getByText('邮箱格式不正确')).toBeVisible()
    })

    it('密码少于 6 位时显示错误', async () => {
      const { user } = setup()
      await user.type(screen.getByLabelText('用户名'), 'zhangsan')
      await user.type(screen.getByLabelText('邮箱'), 'a@b.com')
      await user.type(screen.getByLabelText('密码'), '12345')
      await user.click(screen.getByRole('button', { name: '注册' }))
      expect(screen.getByText('密码至少 6 位')).toBeVisible()
    })

    it('未勾选条款时显示错误', async () => {
      const { user } = setup()
      await user.type(screen.getByLabelText('用户名'), 'zhangsan')
      await user.type(screen.getByLabelText('邮箱'), 'a@b.com')
      await user.type(screen.getByLabelText('密码'), '123456')
      // 故意不勾选 checkbox
      await user.click(screen.getByRole('button', { name: '注册' }))
      expect(screen.getByText('请同意服务条款')).toBeVisible()
    })
  })

  // ==================== 提交测试 ====================
  describe('表单提交', () => {
    it('合法数据正确提交', async () => {
      const { onSubmit, user } = setup()
      await fillForm(user)
      await user.click(screen.getByRole('button', { name: '注册' }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          username: 'zhangsan',
          email: 'zhangsan@example.com',
          password: '123456',
          agreeToTerms: true,
        })
      })
    })

    it('提交中按钮显示 loading 且被禁用', async () => {
      // 让 onSubmit 返回一个永远不 resolve 的 Promise，观察 loading 状态
      const onSubmit = vi.fn(() => new Promise(() => {}))
      const user = userEvent.setup()
      render(<RegistrationForm onSubmit={onSubmit} />)

      await fillForm(user)
      await user.click(screen.getByRole('button', { name: '注册' }))

      // 按钮文字变为"提交中..."
      expect(screen.getByRole('button', { name: '提交中...' })).toBeDisabled()
    })

    it('提交失败时显示错误提示', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('Network Error'))
      const user = userEvent.setup()
      render(<RegistrationForm onSubmit={onSubmit} />)

      await fillForm(user)
      await user.click(screen.getByRole('button', { name: '注册' }))

      await waitFor(() => {
        expect(screen.getByText('提交失败，请重试')).toBeVisible()
      })
    })
  })

  // ==================== 错误清除测试 ====================
  describe('错误清除', () => {
    it('修改无效字段后错误提示消失', async () => {
      const { user } = setup()
      // 先触发验证错误
      await user.click(screen.getByRole('button', { name: '注册' }))
      expect(screen.getByText('用户名不能为空')).toBeVisible()

      // 修改用户名（错误应该在下次提交前不会自动清除——取决于你的设计）
      // 这里的场景是：修改后再提交，旧错误消失，新验证通过
      await user.type(screen.getByLabelText('用户名'), 'zhangsan')
      await user.type(screen.getByLabelText('邮箱'), 'a@b.com')
      await user.type(screen.getByLabelText('密码'), '123456')
      await user.click(screen.getByRole('checkbox', { name: '同意服务条款' }))

      // 重新提交
      await user.click(screen.getByRole('button', { name: '注册' }))
      // 旧错误消失，onSubmit 被成功调用
      await waitFor(() => {
        expect(screen.queryByText('用户名不能为空')).toBeNull()
      })
    })
  })
})
```

---

### 九、Vue 实战：等价测试

Testing Library 的哲学是框架无关的。Vue Testing Library 的 API 几乎和 React 版一样：

```vue
<!-- RegistrationForm.vue -->
<template>
  <form aria-label="注册表单" @submit.prevent="handleSubmit">
    <div>
      <label for="username">用户名</label>
      <input id="username" v-model="form.username" />
      <span v-if="errors.username" role="alert">{{ errors.username }}</span>
    </div>
    <div>
      <label for="email">邮箱</label>
      <input id="email" type="email" v-model="form.email" />
      <span v-if="errors.email" role="alert">{{ errors.email }}</span>
    </div>
    <div>
      <label for="password">密码</label>
      <input id="password" type="password" v-model="form.password" />
      <span v-if="errors.password" role="alert">{{ errors.password }}</span>
    </div>
    <div>
      <label>
        <input type="checkbox" v-model="form.agreeToTerms" />
        同意服务条款
      </label>
      <span v-if="errors.agreeToTerms" role="alert">{{ errors.agreeToTerms }}</span>
    </div>
    <button type="submit" :disabled="submitting">
      {{ submitting ? '提交中...' : '注册' }}
    </button>
    <span v-if="submitError" role="alert">{{ submitError }}</span>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'

interface FormData {
  username: string; email: string; password: string; agreeToTerms: boolean
}

const props = defineProps<{ onSubmit: (data: FormData) => Promise<void> }>()

const form = reactive<FormData>({
  username: '', email: '', password: '', agreeToTerms: false,
})
const errors = reactive<Record<string, string>>({})
const submitting = ref(false)
const submitError = ref('')

const validate = (): boolean => {
  // 清空旧错误
  Object.keys(errors).forEach(k => delete (errors as any)[k])
  if (!form.username.trim()) {
    errors.username = '用户名不能为空'
  } else if (form.username.trim().length < 3) {
    errors.username = '用户名至少 3 个字符'
  }
  if (!form.email.includes('@')) errors.email = '邮箱格式不正确'
  if (form.password.length < 6) errors.password = '密码至少 6 位'
  if (!form.agreeToTerms) errors.agreeToTerms = '请同意服务条款'
  return Object.keys(errors).length === 0
}

const handleSubmit = async () => {
  submitError.value = ''
  if (!validate()) return
  submitting.value = true
  try {
    await props.onSubmit({ ...form })
  } catch {
    submitError.value = '提交失败，请重试'
  } finally {
    submitting.value = false
  }
}
</script>
```

```typescript
// RegistrationForm.test.ts —— Vue Testing Library
import { render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import RegistrationForm from './RegistrationForm.vue'

// 辅助函数：一次性填写整个表单
async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('用户名'), 'zhangsan')
  await user.type(screen.getByLabelText('邮箱'), 'zhangsan@example.com')
  await user.type(screen.getByLabelText('密码'), '123456')
  await user.click(screen.getByRole('checkbox', { name: '同意服务条款' }))
}

describe('RegistrationForm (Vue)', () => {
  const setup = () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    // Vue 的 render 需要传 props
    render(RegistrationForm, { props: { onSubmit } })
    return { onSubmit, user }
  }

  describe('初始渲染', () => {
    it('所有表单字段和按钮都已渲染', () => {
      setup()
      expect(screen.getByLabelText('用户名')).toBeVisible()
      expect(screen.getByLabelText('邮箱')).toBeVisible()
      expect(screen.getByLabelText('密码')).toBeVisible()
      expect(screen.getByRole('checkbox', { name: '同意服务条款' })).toBeVisible()
      expect(screen.getByRole('button', { name: '注册' })).toBeVisible()
    })
  })

  describe('表单验证', () => {
    it('用户名为空时显示错误提示', async () => {
      const { user } = setup()
      await user.click(screen.getByRole('button', { name: '注册' }))
      expect(screen.getByText('用户名不能为空')).toBeVisible()
    })

    it('邮箱格式不正确时显示错误', async () => {
      const { user } = setup()
      await user.type(screen.getByLabelText('用户名'), 'zhangsan')
      await user.type(screen.getByLabelText('邮箱'), 'bad-email')
      await user.click(screen.getByRole('button', { name: '注册' }))
      expect(screen.getByText('邮箱格式不正确')).toBeVisible()
    })
  })

  describe('表单提交', () => {
    it('合法数据正确提交', async () => {
      const { onSubmit, user } = setup()
      await fillForm(user)
      await user.click(screen.getByRole('button', { name: '注册' }))
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          username: 'zhangsan',
          email: 'zhangsan@example.com',
          password: '123456',
          agreeToTerms: true,
        })
      })
    })

    it('提交失败时显示错误', async () => {
      const onSubmit = vi.fn().mockRejectedValue(new Error('fail'))
      const user = userEvent.setup()
      render(RegistrationForm, { props: { onSubmit } })
      await fillForm(user)
      await user.click(screen.getByRole('button', { name: '注册' }))
      await waitFor(() => {
        expect(screen.getByText('提交失败，请重试')).toBeVisible()
      })
    })
  })
})
```

**Vue vs React 测试的区别：** 核心上几乎没有区别。`render` 的传参方式不同（Vue 传 props 对象，React 传 JSX），但查询 API 和 userEvent 完全一致。这也是 Testing Library 框架无关哲学的体现。

---

### 十、@testing-library/user-event v14 的重要变化

userEvent v14 引入了 `userEvent.setup()`，这是必须使用的新模式：

```typescript
// ❌ v13 旧写法（不要再用了）
import userEvent from '@testing-library/user-event'
userEvent.click(button) // 直接调用，不返回 Promise

// ✅ v14 新写法（必须先用 setup）
const user = userEvent.setup()
await user.click(button) // 返回 Promise，必须 await

// setup 的好处：
// 1. 所有事件共享同一个内部状态（如当前焦点元素）
// 2. 所有操作返回 Promise，防止漏掉 await
// 3. 可以在 setup 时配置全局行为：
const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
```

---

## 常见问题

**Q1：组件测试和单元测试的边界在哪里？**
如果你的"单元"是一个组件，那组件测试就是单元测试。如果你的"单元"是一个纯函数，那组件测试就属于集成测试的范畴。不必纠结命名——纠结测试有没有覆盖用户的关键路径。

**Q2：应该把组件渲染到 jsdom 还是真实浏览器？**
组件测试用 jsdom（Testing Library 默认），速度快、不依赖浏览器。E2E 用真实浏览器（Playwright/Cypress）。不要混淆两层的职责。

**Q3：getByRole 为什么查不到我的 div？**
`getByRole` 只能查有隐式或显式 ARIA role 的元素。`<div>` 没有隐式 role，`<button>` 有隐式 role="button"。如果确实要查 div，用 `getByText` 或者给 div 加上适当的 role 属性。

**Q4：render 得到的 container 和 screen 有什么区别？**
`screen` 是全局的查询入口，推荐使用。`container` 是 render 返回的 DOM 节点，只在一种场景有用——你需要 `container.firstChild` 匹配快照。所有查询都用 `screen`。

**Q5：怎么测试使用了 React Router 的组件？**
用 `MemoryRouter` 包裹组件——它是最适合测试的 Router，不依赖浏览器 URL。`render(<MemoryRouter><MyPage /></MemoryRouter>)`。

**Q6：怎么测试依赖了全局状态（Redux/Pinia）的组件？**
渲染时用真实的 store，但给 store 传入测试专用的初始状态。或者直接把组件需要的状态通过 props 传入（更好的设计）。

**Q7：测试太多导致跑一次好几分钟怎么办？**
检查是否有真实网络请求没 mock、是否在 `beforeEach` 中做了不必要的重渲染、是否可以用 `--pool forks` 并行执行。Vitest 的 watch 模式只跑有变更相关用例，日常开发不会慢。

**Q8：该不该给每个组件都写测试？**
展示型组件（纯渲染）不测。业务组件（含交互、验证、状态变化）必须测。第三方 UI 库的组件不测。规则：组件有 if/else 逻辑 → 写测试。

---

## 实操作业

### 🟢 基础：为计数器组件写测试

实现一个 `Counter` 组件（React 或 Vue），包含：显示当前计数、`+1` 按钮、`-1` 按钮、`重置` 按钮。用 Testing Library 写测试：
- 初始显示 0
- 点击 +1 后显示 1
- 点击 -1 后显示 -1
- 点击重置后恢复 0

### 🟡 进阶：为搜索组件写异步测试

实现一个 `SearchBox` 组件：输入关键词 → 点击搜索 → 调用 API → 显示结果列表（或"无结果"提示）。要求：
- 使用 `vi.mock` 模拟 API 调用
- 测试 loading 状态的出现和消失
- 测试搜索结果的渲染
- 测试空结果的提示

### 🔴 挑战：为多步骤表单写完整测试

实现一个三步注册表单（填写信息 → 验证手机 → 设置密码），每步之间的前进/后退，最终提交。用 Testing Library 写测试覆盖：
- 每一步的渲染、前进、后退
- 每一步的表单验证
- 最终提交的 mock
- 至少用到 `getByRole`、`userEvent`、`waitFor`、`findBy` 四种 API

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L3 里程碑](../../projects/atlas/milestones/L3.md)
- 本课任务：把“组件测试与 Testing Library”接入 Atlas 工程链路，形成可重复命令和失败门禁，并保存一次故意失败与恢复的证据。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

- 组件测试的黄金法则：测行为，不测实现
- 查询优先级：`getByRole` > `getByLabelText` > `getByText` > `getByTestId`
- `getBy` 断言存在，`queryBy` 断言不存在，`findBy` 等待异步出现
- 用户点击、输入和键盘操作优先用 `userEvent.setup()`；底层或暂不支持的事件再用 `fireEvent`
- 异步用 `findBy`、`waitFor`、`waitForElementToBeRemoved`
- 不测内部 state、不测第三方库、不测实现细节
- React 和 Vue 的 Testing Library 写法 90% 一致，差异只在 `render` 传参

<!-- course-nav:start -->
---

[上一篇：01-Vitest 单元测试实战](./01-Vitest单元测试实战.md) · [课程地图](../../README.md) · [下一篇：03-Playwright E2E 测试](./03-Playwright-E2E测试.md)
<!-- course-nav:end -->
