# 01-Vitest 单元测试实战

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L3 工程化与质量保障
> - 先修：[02 — 合并、变基与冲突解决](../03-Git协作流/02-合并-变基与冲突解决.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Vite](https://vite.dev/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解测试的三大价值：回归保护、活文档、设计反馈
- 掌握 Vitest 的 describe/it/expect 核心语法和常用 Matchers
- 能正确使用测试生命周期（setup/teardown）
- 会写 Mock 和 Spy，隔离外部依赖
- 能处理异步测试和参数化测试
- 能配置并解释覆盖率阈值，并用小型工具函数库练习完整分支覆盖

---

## 内容讲解

### 一、为什么要写测试？

写测试表面上费时间，但它保护的是你的**未来时间**。测试的价值在三个维度：

**1. 回归保护（Regression Shield）**

你重构了一段代码，怎么知道没把功能搞坏？跑一下测试，绿灯就是答案。没有测试的重构叫"赌命"，有测试的重构叫"工程"。

**2. 活文档（Living Documentation）**

注释会过时，但测试不会——因为测试不过就会红灯。看一个函数的测试比看它的注释更能理解它真正的行为边界。

**3. 设计反馈（Design Feedback）**

如果你发现写测试很痛苦——需要 mock 十几个依赖、函数的参数绕来绕去——那说明你的代码设计有问题。测试难写 = 代码耦合度高，这是最早的设计坏味道探测器。

---

### 二、Vitest 简介

Vitest 是由 Vite 团队打造的下一代测试框架，核心优势：

| 特性 | Vitest | Jest |
|------|--------|------|
| 配置 | 零配置，自动读取 vite.config.ts | 需要独立 jest.config |
| 速度 | esbuild 编译，极快 | babel/jest-transform，较慢 |
| HMR | 支持监听模式热更新 | 仅 watcher 重跑 |
| ESM | 原生支持 | 需要 transform |
| API | 兼容 Jest API | — |
| TypeScript | 开箱即用 | 需要 ts-jest 等配置 |

**一句话结论：** 如果你的项目用了 Vite，用 Vitest 就是自然而然的选择。如果你从 Jest 迁移，几乎零成本——API 完全兼容。

```bash
# 安装
npm install -D vitest

# package.json 中配置
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

### 三、基本语法：describe、it、expect

一个测试文件的标准结构如下。**describe 嵌套 describe 是允许的**，用来组织复杂测试场景：

```typescript
// math.test.ts
import { describe, it, expect } from 'vitest'
import { add, multiply } from './math'

// describe：测试套件，把相关的测试用例组织在一起
describe('math 工具函数', () => {

  // 可以嵌套 describe 做更细粒度的分组
  describe('add', () => {
    // it（别名 test）：一个独立的测试用例
    it('两个正数相加，返回和', () => {
      // expect + toBe：最基础的断言
      expect(add(1, 2)).toBe(3)
    })

    it('正负数相加，返回正确的差值', () => {
      expect(add(5, -3)).toBe(2)
    })
  })

  describe('multiply', () => {
    it('两个正数相乘', () => {
      expect(multiply(3, 4)).toBe(12)
    })
  })
})
```

**命名习惯：** `it('应该做什么', ...)` 或 `it('不应该做什么', ...)`。好的用例名读起来像一句话——`it('两个正数相加，返回和')` 连起来读就是"it 两个正数相加，返回和"。

---

### 四、核心 Matchers

Matchers 是 `expect(xxx).toBeSomething()` 中的 `toBeSomething` 部分。掌握下面这些就覆盖了 90% 的场景：

```typescript
import { describe, it, expect } from 'vitest'

describe('Matchers 速查', () => {

  // ========== 严格相等 vs 值相等 ==========
  it('toBe —— 严格相等（===），用于原始值', () => {
    expect(2 + 2).toBe(4)
    expect('hello').toBe('hello')
  })

  it('toEqual —— 深度值相等，用于对象/数组', () => {
    // toBe 比较的是引用，这里两个对象是不同的引用 → 会失败
    // expect({ a: 1 }).toBe({ a: 1 })  // ❌ 失败
    expect({ a: 1 }).toEqual({ a: 1 })   // ✅ 通过，递归对比每个属性
    expect([1, 2, 3]).toEqual([1, 2, 3]) // ✅
  })

  // ========== 真值判断 ==========
  it('toBeTruthy / toBeFalsy —— 判断值的真假', () => {
    expect('非空字符串').toBeTruthy()
    expect(1).toBeTruthy()
    expect(0).toBeFalsy()
    expect('').toBeFalsy()
    expect(null).toBeFalsy()
    expect(undefined).toBeFalsy()
  })

  it('toBeNull / toBeUndefined / toBeDefined', () => {
    expect(null).toBeNull()
    expect(undefined).toBeUndefined()
    expect(42).toBeDefined()
  })

  // ========== 数值比较 ==========
  it('toBeGreaterThan / toBeLessThan / toBeCloseTo', () => {
    expect(10).toBeGreaterThan(5)
    expect(10).toBeLessThan(20)
    expect(10).toBeGreaterThanOrEqual(10)

    // 浮点数不能用 toBe，必须用 toBeCloseTo
    expect(0.1 + 0.2).toBeCloseTo(0.3)  // ✅
    // expect(0.1 + 0.2).toBe(0.3)      // ❌ 浮点精度问题
  })

  // ========== 字符串与数组包含 ==========
  it('toContain —— 检查数组/字符串是否包含某元素', () => {
    expect(['react', 'vue', 'angular']).toContain('vue')
    expect('hello world').toContain('world')
  })

  it('toHaveLength —— 检查长度', () => {
    expect([1, 2, 3]).toHaveLength(3)
    expect('abc').toHaveLength(3)
  })

  // ========== 异常测试 ==========
  it('toThrow —— 验证函数抛出了异常', () => {
    // 注意：必须把函数调用包在箭头函数里，否则异常会被提前抛出
    const throwError = () => { throw new Error('炸了') }
    expect(throwError).toThrow('炸了')

    // 也可以验证异常类型
    expect(() => JSON.parse('invalid')).toThrow(SyntaxError)
  })

  // ========== 对象部分匹配 ==========
  it('toMatchObject —— 检查对象是否包含指定的属性子集', () => {
    const user = { id: 1, name: 'Alice', role: 'admin' }
    expect(user).toMatchObject({ name: 'Alice', role: 'admin' })
    // 不需要检查所有属性，只检查你关心的那部分
  })

  // ========== 快照测试 ==========
  it('toMatchSnapshot —— 快照对比', () => {
    const config = { api: 'https://api.example.com', version: '2.0' }
    // 首次运行：生成快照文件 __snapshots__/xxx.snap
    // 后续运行：与快照对比，不一致就报错（按 u 键更新快照）
    expect(config).toMatchSnapshot()
  })

  // ========== 否定断言 ==========
  it('not —— 否定某个断言', () => {
    expect(1 + 1).not.toBe(3)
    expect(['a', 'b']).not.toContain('c')
  })
})
```

**快照测试的注意事项：** 快照不是银弹。它适合测试稳定的输出（如配置对象、序列化结果），但不适合频繁变化的 UI 组件。提交快照文件时务必 review 内容，不要盲目 `u` 全部更新。

---

### 五、测试生命周期

测试生命周期让你在用例前后执行准备和清理工作：

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest'

describe('测试生命周期演示', () => {
  // 在整个 describe 块中所有测试执行之前运行一次
  beforeAll(() => {
    console.log('→ 连接数据库（只执行一次）')
  })

  // 在每个 it 用例执行之前都运行一次
  beforeEach(() => {
    console.log('  → 插入测试数据（每个用例前都执行）')
  })

  // 在每个 it 用例执行之后都运行一次
  afterEach(() => {
    console.log('  ← 清理测试数据（每个用例后都执行）')
  })

  // 在整个 describe 块中所有测试执行之后运行一次
  afterAll(() => {
    console.log('← 断开数据库连接（只执行一次）')
  })

  it('测试用例 A', () => {
    expect(1 + 1).toBe(2)
  })

  it('测试用例 B', () => {
    expect(2 + 2).toBe(4)
  })
})

// 执行顺序：
// beforeAll → beforeEach → 用例 A → afterEach → beforeEach → 用例 B → afterEach → afterAll
```

**关键原则：每个用例之间的状态必须独立。** 不要依赖用例的执行顺序，也不要让用例 A 修改的状态影响用例 B。`beforeEach` 的职责就是为每个用例设置一个干净的起始状态。

---

### 六、Mock 与 Spy

测试的核心原则是**隔离**——单测只测一个单元的逻辑，外部依赖全部 mock 掉。

```typescript
import { describe, it, expect, vi } from 'vitest'

// ========== vi.fn()：创建一个假函数 ==========
describe('vi.fn —— Mock 函数', () => {
  it('验证函数被调用和参数', () => {
    // 创建一个 mock 函数
    const mockFn = vi.fn()

    mockFn('hello', 42)
    mockFn('world')

    // 断言：被调用了 2 次
    expect(mockFn).toHaveBeenCalledTimes(2)
    // 断言：第一次调用时传入了 'hello' 和 42
    expect(mockFn).toHaveBeenNthCalledWith(1, 'hello', 42)
    // 断言：最后一次调用时传入了 'world'
    expect(mockFn).toHaveBeenLastCalledWith('world')
  })

  it('让 mock 函数返回指定值', () => {
    const mockFn = vi.fn(() => 'fake result')
    // 也可以这样写：
    // const mockFn = vi.fn().mockReturnValue('fake result')

    expect(mockFn()).toBe('fake result')
  })

  it('让 mock 函数返回 Promise（模拟异步依赖）', () => {
    const mockFetch = vi.fn().mockResolvedValue({ data: 'ok' })

    // mockFetch() 返回一个 Promise，resolve 时值为 { data: 'ok' }
    await expect(mockFetch()).resolves.toEqual({ data: 'ok' })
  })
})

// ========== vi.spyOn()：监听对象上的方法 ==========
describe('vi.spyOn —— Spy 监视', () => {
  it('监视对象方法的调用，但不改变行为', () => {
    const math = {
      add: (a: number, b: number) => a + b,
    }

    // 创建一个 spy，默认会保留原方法的实现
    const spy = vi.spyOn(math, 'add')

    math.add(1, 2)

    expect(spy).toHaveBeenCalledWith(1, 2)
    expect(math.add(1, 2)).toBe(3) // 仍然返回正确结果

    // 用完一定要清理，否则会影响其他用例
    spy.mockRestore()
  })

  it('监视并替换方法实现', () => {
    const api = {
      fetchUser: (id: number) => fetch(`/api/user/${id}`),
    }

    // 替换实现，不发送真实请求
    const spy = vi.spyOn(api, 'fetchUser').mockResolvedValue({ name: 'Mock User' })

    const user = await api.fetchUser(1)
    expect(user).toEqual({ name: 'Mock User' })

    spy.mockRestore()
  })
})

// ========== vi.mock()：替换整个模块 ==========
describe('vi.mock —— 模块级别的 Mock', () => {
  // 在文件顶层调用 vi.mock，整个模块的所有导出都会被 mock
  // Vitest 会自动提升 vi.mock 到文件最前面执行（hoisting）
})

// 一个典型的实战场景：mock axios 请求
// 假设 api.ts 中：
// import axios from 'axios'
// export const getUser = (id: number) => axios.get(`/api/user/${id}`)

// 在测试文件中：
// vi.mock('axios')
// import axios from 'axios'
// const mockedAxios = vi.mocked(axios)
//
// it('getUser 成功返回数据', async () => {
//   mockedAxios.get.mockResolvedValue({ data: { id: 1, name: 'Alice' } })
//   const user = await getUser(1)
//   expect(user.data.name).toBe('Alice')
// })
```

**Mock 的原则：只 mock 你拥有的边界，不 mock 你不拥有的内部行为。** 比如 mock `axios.get` 是合理的（HTTP 是你的边界），但 mock `Date.now()` 的内部实现就不是好习惯——改用依赖注入或 `vi.useFakeTimers()`。

---

### 七、异步测试

Vitest 对异步测试有三层支持：

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('异步测试的三种写法', () => {

  // 方式一：async/await —— 最推荐
  it('async/await 方式', async () => {
    const fetchData = () => Promise.resolve('data')
    const result = await fetchData()
    expect(result).toBe('data')
  })

  // 方式二：expect(...).resolves / .rejects
  it('resolves / rejects 断言方式', async () => {
    const success = Promise.resolve('ok')
    const failure = Promise.reject(new Error('fail'))

    // 不需要手动 await，断言会自动等待 Promise settle
    await expect(success).resolves.toBe('ok')
    await expect(failure).rejects.toThrow('fail')
  })

  // 方式三：done 回调（不推荐，除非维护老代码）
  it('done 回调方式（老式风格）', (done) => {
    setTimeout(() => {
      expect(1 + 1).toBe(2)
      done() // 必须调用 done，否则测试会超时
    }, 100)
  })
})

// 使用 vi.useFakeTimers 控制时间（测试定时器时必备）
describe('假定时器', () => {
  it('使用 vi.useFakeTimers 跳过等待时间', () => {
    vi.useFakeTimers() // 接管所有定时器

    const fn = vi.fn()
    setTimeout(fn, 5000) // 设定一个 5 秒后的回调

    vi.advanceTimersByTime(5000) // 快进 5 秒，fn 被调用

    expect(fn).toHaveBeenCalled()

    vi.useRealTimers() // 恢复真实定时器
  })
})
```

---

### 八、参数化测试

同一个逻辑要对多组输入验证时，用 `it.each` 避免重复代码：

```typescript
import { describe, it, expect } from 'vitest'

// 假设这是你要测试的函数
function formatPrice(price: number, currency: string): string {
  if (price < 0) throw new Error('价格不能为负数')
  const symbols: Record<string, string> = { CNY: '¥', USD: '$', EUR: '€' }
  return `${symbols[currency] || currency}${price.toFixed(2)}`
}

describe('formatPrice', () => {

  // it.each：一张表驱动所有用例
  it.each([
    // 格式：[输入1, 输入2, 期望输出]
    [100,     'CNY', '¥100.00'],
    [50,      'USD', '$50.00'],
    [99.9,    'EUR', '€99.90'],
    [0,       'CNY', '¥0.00'],
    [1234.5,  'USD', '$1234.50'],
  ])('输入 %i %s → 输出 %s', (price, currency, expected) => {
    // %i = 整数占位符，%s = 字符串占位符
    expect(formatPrice(price, currency)).toBe(expected)
  })

  // 也可以用对象数组，用例名更清晰
  it.each([
    { price: 100, currency: 'CNY', expected: '¥100.00' },
    { price: 50,  currency: 'USD', expected: '$50.00' },
  ])('$price $currency → $expected', ({ price, currency, expected }) => {
    expect(formatPrice(price, currency)).toBe(expected)
  })
})
```

---

### 九、覆盖率配置

覆盖率衡量的是你"哪些代码行被测试执行过"。在 `vite.config.ts` 中配置：

```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    // 覆盖率配置
    coverage: {
      provider: 'v8',          // 或 'istanbul'，v8 更快
      reporter: ['text', 'html', 'lcov'], // 输出格式
      reportsDirectory: './coverage',     // 输出目录

      // 只统计 src 目录下的源码覆盖率
      include: ['src/**/*.{ts,tsx}'],
      // 排除类型定义和常量文件
      exclude: ['src/**/*.d.ts', 'src/**/constants.ts'],

      // 覆盖率阈值：不达标测试就失败（CI 中很实用）
      thresholds: {
        lines: 90,        // 行覆盖率 ≥ 90%
        functions: 90,    // 函数覆盖率 ≥ 90%
        branches: 85,     // 分支覆盖率 ≥ 85%
        statements: 90,   // 语句覆盖率 ≥ 90%
      },
    },
  },
})
```

**覆盖率报告怎么看？**

运行 `npx vitest --coverage` 后，打开 `coverage/index.html`，你会看到四个指标：
- **Statements**：每一条语句是否被执行
- **Branches**：每个 if/else、switch 分支是否都被覆盖
- **Functions**：每个函数是否被调用过
- **Lines**：每一行代码是否被执行过（最直观）

红色行 = 没有被任何测试执行到 = 你的测试漏了这种场景。

---

### 十、实战：为一个工具函数库编写完整测试

假设你有一个规模可控的 `utils` 工具库，本练习刻意要求**执行到每个分支**，用于学习覆盖率报告；这不是生产项目的统一指标：

```typescript
// src/utils/index.ts —— 被测试的源码
/**
 * 通用工具函数库
 */

/** 格式化数字为千分位字符串 */
export function formatNumber(num: number): string {
  if (typeof num !== 'number' || Number.isNaN(num)) {
    throw new TypeError('参数必须是有效数字')
  }
  return num.toLocaleString('zh-CN')
}

/** 深拷贝（简化版，只处理 JSON 安全类型） */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj
  return JSON.parse(JSON.stringify(obj))
}

/** 防抖函数 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
}

/** 从对象中提取指定 key 组成新对象 */
export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

/** 拼接 URL 参数 */
export function buildQuery(base: string, params: Record<string, string | number>): string {
  const search = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')
  return search ? `${base}?${search}` : base
}
```

```typescript
// src/utils/__tests__/index.test.ts —— 完整测试
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatNumber, deepClone, debounce, pick, buildQuery } from '../index'

// ==================== formatNumber ====================
describe('formatNumber', () => {
  // —— 正常用例 ——
  it('整数正确格式化（千分位）', () => {
    expect(formatNumber(1234567)).toBe('1,234,567')
  })

  it('小数正确格式化', () => {
    expect(formatNumber(1234.56)).toContain('1,234')
  })

  // —— 边界用例 ——
  it('0 可以正常格式化', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('负数也能格式化', () => {
    expect(formatNumber(-9999)).toBe('-9,999')
  })

  // —— 异常用例 ——
  it('传入 NaN 抛出 TypeError', () => {
    expect(() => formatNumber(NaN)).toThrow(TypeError)
  })

  it('传入非数字类型抛出 TypeError', () => {
    // @ts-expect-error 故意传入错误类型来测试
    expect(() => formatNumber('123' as any)).toThrow(TypeError)
  })
})

// ==================== deepClone ====================
describe('deepClone', () => {
  it('克隆后的对象与原对象值相等', () => {
    const obj = { a: 1, b: { c: 2 }, d: [1, 2, 3] }
    const cloned = deepClone(obj)
    expect(cloned).toEqual(obj)
  })

  it('克隆后的对象是新的引用（修改不影响原对象）', () => {
    const obj = { a: 1 }
    const cloned = deepClone(obj)
    cloned.a = 999
    expect(obj.a).toBe(1) // 原对象不变
  })

  it('原始值直接返回', () => {
    expect(deepClone(42)).toBe(42)
    expect(deepClone('hello')).toBe('hello')
    expect(deepClone(true)).toBe(true)
  })

  it('null 直接返回 null', () => {
    expect(deepClone(null)).toBeNull()
  })

  it('undefined 直接返回 undefined', () => {
    expect(deepClone(undefined)).toBeUndefined()
  })
})

// ==================== debounce ====================
describe('debounce', () => {
  // 使用假定时器来测试 debounce
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('在 delay 内多次调用，只执行最后一次', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 300)

    // 快速连续调用三次
    debounced('a')
    debounced('b')
    debounced('c')

    // 此时 fn 还没被调用（还没到 300ms）
    expect(fn).not.toHaveBeenCalled()

    // 快进 300ms
    vi.advanceTimersByTime(300)

    // 只被调用一次，参数是最后一次传入的 'c'
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })

  it('间隔超过 delay 的两次调用都会执行', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 300)

    debounced('first')
    vi.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledWith('first')

    debounced('second')
    vi.advanceTimersByTime(300)
    expect(fn).toHaveBeenCalledWith('second')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('第三次调用重置计时器', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 300)

    debounced('a')
    vi.advanceTimersByTime(200) // 只过了 200ms
    debounced('b')              // 又调用了一次，计时器重置
    vi.advanceTimersByTime(200) // 又过了 200ms，总共 400ms
    // 但因为 b 重置了计时器，fn 还没执行
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100) // 再等 100ms（b 之后恰好 300ms）
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('b')
  })
})

// ==================== pick ====================
describe('pick', () => {
  it('提取对象中指定的 key', () => {
    const obj = { a: 1, b: 2, c: 3 }
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 })
  })

  it('如果 key 不存在则忽略', () => {
    const obj = { a: 1 }
    // @ts-expect-error 测试不存在的 key
    expect(pick(obj, ['a', 'x'] as any)).toEqual({ a: 1 })
  })

  it('空 keys 数组返回空对象', () => {
    expect(pick({ a: 1 }, [])).toEqual({})
  })

  it('空对象 + 任意 keys 返回空对象', () => {
    // @ts-expect-error 测试空对象
    expect(pick({}, ['a'] as any)).toEqual({})
  })
})

// ==================== buildQuery ====================
describe('buildQuery', () => {
  it('正确拼接 URL 参数', () => {
    expect(buildQuery('/api/users', { page: 1, size: 10 }))
      .toBe('/api/users?page=1&size=10')
  })

  it('参数值需要 URL 编码', () => {
    expect(buildQuery('/search', { q: 'hello world' }))
      .toBe('/search?q=hello%20world')
  })

  it('没有参数时返回原始 URL', () => {
    expect(buildQuery('/api/users', {})).toBe('/api/users')
  })

  it('过滤掉 undefined 和 null 值的参数', () => {
    const params = { a: 1, b: undefined as any, c: null as any, d: 'ok' }
    expect(buildQuery('/api', params)).toBe('/api?a=1&d=ok')
  })
})
```

运行 `npx vitest --coverage`，这个有限示例应达到 100% 的行、函数和分支覆盖率。随后删掉一个关键断言再运行，你会看到覆盖率可能不变，从而验证“执行过”不等于“验证正确”。

---

## 常见问题

**Q1：toBe 和 toEqual 到底怎么选？**
原始类型（string/number/boolean/undefined/null）用 `toBe`，对象/数组用 `toEqual`。`toBe` 用的是 `Object.is()`（近似 `===`），`toEqual` 是递归深度比较。

**Q2：什么时候用 describe 嵌套？**
当你能用一句话描述一组用例时。比如 `describe('formatNumber', () => { describe('正常输入', ...) describe('异常输入', ...) })`。嵌套不是越多越好，通常 1-2 层最清晰。

**Q3：Mock 应该 mock 到什么程度？**
只 mock 你要测试的那个单元的外部依赖。如果你在测一个处理用户输入的函数，就不要去 mock `Math.random()`。边界清晰时 mock 才有意义。

**Q4：测试文件放哪里？**
两种主流方案：`__tests__` 目录（集中管理）和 `.test.ts` 同目录（就近原则）。Vitest 默认两种都识别。推荐后者——测试文件紧挨源码，删除源码时测试也会一起被删。

**Q5：覆盖率 100% 意味着代码完美吗？**
不。覆盖率只告诉你"代码被执行了"，不告诉你"逻辑被验证了"。你可以写一个完全不写断言的测试，覆盖率也是 100%。目标是"有意义的覆盖率"，而不是 100% 这个数字。

**Q6：哪些代码不需要写单测？**
通常不重复测试第三方库内部实现、没有业务分支的简单 getter/setter 或纯框架样板。第三方库 wrapper 往往正是应用的集成边界，应测试参数转换、错误映射和兼容契约。判断依据是失败风险和行为价值，不是文件类型。

**Q7：测试跑太慢怎么办？**
检查是否 mock 了不必要的依赖（比如真的连了数据库）、是否用了 `vi.useRealTimers()` 在等真实延迟、是否每个用例都重新 import 模块。Vitest 的 `--pool forks` 可以并行跑测试文件。

**Q8：snapshot 测试适合什么场景？**
配置对象、序列化输出、错误信息的文案。不适合 UI 组件（过于脆弱，稍微改一点样式就红）。提交 snapshot 文件前务必 review diff。

---

## 实操作业

### 🟢 基础：为字符串工具函数写单测

创建 `src/utils/string.ts`，实现三个函数：
- `capitalize(str)`：首字母大写
- `truncate(str, maxLen)`：超出长度加 `...`
- `camelToKebab(str)`：驼峰转短横线 `helloWorld → hello-world`

为每个函数写至少 5 个用例（正常 + 空字符串 + 边界长度 + 异常输入）。

### 🟡 进阶：为带依赖的服务函数写 Mock 测试

创建一个 `src/services/userService.ts`，它从 `axios` 获取用户数据。写测试时不真正发 HTTP 请求，用 `vi.mock('axios')` 验证：
- 请求成功时返回正确的数据
- 请求失败时正确抛出异常
- URL 中的参数拼接正确

### 🔴 挑战：为一个 Class 写完整测试并分析覆盖率

实现 `src/classes/EventEmitter.ts`，包含 `on`、`off`、`emit`、`once` 四个方法。为它写完整测试：
- 注册事件 → 触发事件 → 验证回调被调用
- `once` 只触发一次
- `off` 取消监听后不再触发
- 同一个事件多个回调都会被调用
- 对这个有限练习达到 100% 覆盖率的四项指标
- 手工引入一个错误实现，确认至少一个测试会失败

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：先规定空串、maxLen 与缩略号是否计入长度；至少五例分别覆盖三函数。camelToKebab 的连续大写与 Unicode 策略明确，错误参数不能产生静默奇怪字符串。
- **进阶**：mock 网络依赖但断言实际 URL、响应映射与错误 cause；每例清 mock。状态 500 与网络拒绝分别测试，不能只断言 mock 被调用而忽略返回契约。
- **挑战**：Emitter 用 Map/Set 管监听，once 在调用前注销避免重入重复；emit 可取快照防回调删订阅干扰。覆盖 off 不存在/重复注册/异常策略，故意破坏 once 后至少一例失败。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L3 里程碑](../../projects/atlas/milestones/L3.md)
- 本课任务：把“Vitest 单元测试实战”接入 Atlas 工程链路，形成可重复命令和失败门禁，并保存一次故意失败与恢复的证据。
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

- 测试的三大价值：回归保护、活文档、设计反馈
- `describe` 组织测试套件，`it` 定义测试用例，`expect` 做断言
- `toBe` 用于原始值，`toEqual` 用于对象数组，`toThrow` 测异常
- 生命周期：`beforeAll` → `beforeEach` → 用例 → `afterEach` → `afterAll`
- Mock 三件套：`vi.fn()`（假函数）、`vi.spyOn()`（监视）、`vi.mock()`（替换模块）
- 异步测试首选 `async/await`，定时器用 `vi.useFakeTimers()`
- 参数化测试用 `it.each` 避免复制粘贴
- 覆盖率配置在 `vite.config.ts` 的 `test.coverage` 中，`v8` 比 `istanbul` 更快
- 覆盖率高 ≠ 代码质量高，有意义覆盖 > 数字 100%

<!-- course-nav:start -->
---

[上一篇：02 — 合并、变基与冲突解决](../03-Git协作流/02-合并-变基与冲突解决.md) · [课程地图](../../README.md) · [下一篇：02-组件测试与 Testing Library](./02-组件测试与Testing-Library.md)
<!-- course-nav:end -->
