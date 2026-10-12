# 03-Playwright E2E 测试

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L3 工程化与质量保障
> - 先修：[02-组件测试与 Testing Library](./02-组件测试与Testing-Library.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Playwright](https://playwright.dev/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 E2E 测试在测试体系中的定位和价值
- 掌握 Playwright 的三层架构：Browser → Context → Page
- 熟练使用基本操作（导航、点击、输入、截图）和断言
- 能用多种选择器策略定位元素
- 掌握网络拦截和等待机制
- 会使用 Trace Viewer 调试失败的测试
- 能为登录流程编写完整的跨浏览器 E2E 测试

---

## 内容讲解

### 一、E2E 测试的定位

E2E（End-to-End）测试在真实浏览器中运行，模拟用户从打开页面到完成目标的完整流程。它的价值不在多而在精——只测最重要的用户路径。

| 测试层 | 速度 | 可靠性 | 覆盖范围 | 维护成本 |
|--------|------|--------|---------|---------|
| 单元测试 | 毫秒 | 极高 | 单个函数/模块 | 低 |
| 组件测试 | 秒级 | 高 | 单个组件 | 中 |
| E2E | 分钟级 | 中（网络/环境波动） | 完整用户流程 | 高 |

**E2E 应该测什么？** 只测核心业务流的 happy path 和最关键的异常场景。例如：用户注册、登录、下单、支付——这些如果挂了，业务就停了。至于"第三个 Tab 的颜色是否和设计稿一致"，这是视觉回归的范畴，不该放在 E2E 里。

---

### 二、Playwright 核心概念

Playwright 是微软出品的跨浏览器自动化测试框架，用一个 API 同时驱动 Chromium、Firefox 和 WebKit。

```
Browser（浏览器实例）
  ├── Context 1（独立的浏览器上下文，类似一个无痕窗口）
  │     ├── Page A（标签页）
  │     └── Page B
  └── Context 2
        └── Page C
```

**Context 是关键创新：** 每个 Context 有独立的 cookie、localStorage、sessionStorage。你可以用多个 Context 模拟多用户同时登录，而不需要打开多个浏览器。

```bash
# 安装
npm install -D @playwright/test
npx playwright install  # 下载浏览器二进制文件（约 400MB，只需一次）
```

---

### 三、基本操作 API

```typescript
import { test, expect } from '@playwright/test'

// test.describe 组织测试套件，test.beforeEach 设定每个用例的前置条件
test.describe('Playwright 基本操作演示', () => {

  test.beforeEach(async ({ page }) => {
    // 每个用例开始前先导航到目标页面
    await page.goto('https://example.com')
  })

  // ========== 导航 ==========
  test('page.goto —— 导航到指定 URL', async ({ page }) => {
    // goto 默认等待 load 事件触发后再继续
    await page.goto('https://example.com/about')
    // 断言当前 URL
    expect(page.url()).toContain('/about')
  })

  // ========== 点击 ==========
  test('page.click —— 点击元素', async ({ page }) => {
    // 用文本定位按钮并点击
    await page.click('text=More information')
    // 验证页面发生变化
    await expect(page).toHaveURL(/iana\.org/)
  })

  // ========== 输入 ==========
  test('page.fill —— 填写输入框', async ({ page }) => {
    // 先导航到一个有表单的页面
    await page.goto('https://example.com/login')
    // fill 会自动 focus → 清空 → 输入
    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'secret123')
  })

  // ========== 截图 ==========
  test('page.screenshot —— 页面截图', async ({ page }) => {
    // 全页截图（调试神器，自动化报告必备）
    await page.screenshot({ path: 'screenshots/home.png', fullPage: true })
  })

  // ========== 选择器基础 ==========
  test('多种选择器定位同一个元素', async ({ page }) => {
    // 用 CSS 选择器
    await page.click('button.submit')

    // 用文本内容
    await page.click('text=提交')

    // 用 getByRole（推荐，接近 Testing Library 的哲学）
    await page.click(page.getByRole('button', { name: '提交' }))

    // 用 test id
    await page.click(page.getByTestId('submit-btn'))
  })
})
```

---

### 四、断言体系

Playwright 的断言分两类：**自动等待断言** 和 **非自动等待断言**。只要有可能，用前者。

```typescript
import { test, expect } from '@playwright/test'

test.describe('Playwright 断言速查', () => {

  test('页面级别的断言', async ({ page }) => {
    await page.goto('https://example.com')

    // URL 断言（自动等待 URL 变化）
    await expect(page).toHaveURL('https://example.com/')
    await expect(page).toHaveURL(/example/)

    // 标题断言（自动等待 title 更新）
    await expect(page).toHaveTitle('Example Domain')
    await expect(page).toHaveTitle(/Example/)
  })

  test('元素级别的断言', async ({ page }) => {
    await page.goto('https://example.com')

    const heading = page.locator('h1')

    // 可见性断言（自动等待元素出现在 DOM 且可见）
    await expect(heading).toBeVisible()

    // 文本内容断言
    await expect(heading).toHaveText('Example Domain')

    // 包含文本
    await expect(heading).toContainText('Example')

    // 值断言（用于 input）
    const input = page.locator('input')
    await input.fill('hello')
    await expect(input).toHaveValue('hello')

    // 计数断言
    const links = page.locator('a')
    await expect(links).toHaveCount(1)

    // 状态断言
    const checkbox = page.locator('input[type="checkbox"]')
    await checkbox.check()
    await expect(checkbox).toBeChecked()

    const button = page.locator('button[disabled]')
    await expect(button).toBeDisabled()
  })

  test('否定断言', async ({ page }) => {
    await page.goto('https://example.com')

    // 断言元素不可见
    await expect(page.locator('.non-existent')).not.toBeVisible()

    // 断言元素隐藏（DOM 中存在但不可见）
    await expect(page.locator('.hidden')).toBeHidden()
  })
})
```

**自动等待的核心价值：** 当你写 `await expect(locator).toBeVisible()` 时，Playwright 不会立即失败。它会反复检查直到元素可见或超时（默认 5 秒）。这意味着你不需要手动写 `waitFor` 来处理渲染延迟。

---

### 五、选择器策略（从好到差）

Playwright 支持多种选择器引擎，优先级如下：

```typescript
test.describe('选择器优先级演示', () => {

  test('按推荐度排序的选择器策略', async ({ page }) => {
    await page.goto('https://example.com/login')

    // 1️⃣ getByRole —— 最推荐（语义化，最接近用户认知）
    await page.getByRole('button', { name: '登录' }).click()
    await page.getByRole('textbox', { name: '用户名' }).fill('admin')

    // 2️⃣ getByLabel —— 通过 <label> 关联找 input（需要 htmlFor 或嵌套 label）
    await page.getByLabel('密码').fill('secret')

    // 3️⃣ getByPlaceholder —— 通过 placeholder 属性找 input
    await page.getByPlaceholder('请输入手机号').fill('13800138000')

    // 4️⃣ getByText —— 通过文本内容找元素
    await page.getByText('忘记密码？').click()

    // 5️⃣ getByTestId —— 最后手段（需要 data-testid="xxx" 属性）
    await page.getByTestId('submit-btn').click()

    // 6️⃣ locator + CSS —— 当你实在用不了上面的方式时
    await page.locator('.login-form button[type="submit"]').click()

    // 7️⃣ text= —— 纯文本选择器（最简单的语法，但不够精确）
    await page.locator('text=立即注册').click()
  })
})
```

**最佳实践：** 前端开发时主动给关键交互元素加上适当的 ARIA 属性和 `data-testid`，让你的测试不受 CSS 重构的影响。一个类名变了，测试不应该红。

---

### 六、等待机制

Playwright 最大的卖点之一就是「自动等待」。但有些场景你还是需要手动等待：

```typescript
test.describe('等待机制', () => {

  // ========== 自动等待（你不需要做什么） ==========
  test('Playwright 自动等待元素可交互', async ({ page }) => {
    await page.goto('/app')

    // click 会自动等待：元素可见 → 元素稳定 → 接收事件 → 未被其他元素遮挡
    // 如果元素还在动画中或 disabled，click 会一直等到它 ready
    await page.getByRole('button', { name: '删除' }).click()
  })

  // ========== 等待网络 ==========
  test('waitForResponse —— 等待 API 返回', async ({ page }) => {
    // 方式一：先注册等待，再触发请求（推荐）
    const responsePromise = page.waitForResponse(
      resp => resp.url().includes('/api/users') && resp.status() === 200
    )
    await page.getByRole('button', { name: '加载用户' }).click()
    const response = await responsePromise
    const body = await response.json()
    expect(body).toHaveProperty('data')
  })

  // ========== 等待导航 ==========
  test('waitForURL —— 等待导航完成', async ({ page }) => {
    await page.getByRole('link', { name: '个人中心' }).click()
    // waitForURL 自动等待，直到 URL 匹配给定的模式
    await page.waitForURL('**/profile')
    await expect(page).toHaveURL(/profile/)
  })

  // ========== 等待网络空闲 ==========
  test('waitForLoadState —— 等待加载状态', async ({ page }) => {
    await page.goto('/dashboard')
    // 等待所有网络请求完成（networkidle 在网络不稳定的页面慎用）
    await page.waitForLoadState('networkidle')
  })

  // ========== 等待选择器可见 ==========
  test('waitForSelector —— 等待元素出现', async ({ page }) => {
    await page.goto('/slow-page')
    // 手动等待某个元素出现（Playwright 断言的自动等待一般就够了）
    await page.waitForSelector('.data-loaded', { state: 'visible', timeout: 10000 })
  })
})
```

**一条关键原则：** 如果你的测试里到处都是 `waitForTimeout(3000)`（硬等 3 秒），那说明你的等待策略有严重问题。Playwright 设计的自动等待就是为了消灭这种不可靠的做法。用 `waitForResponse`、`waitForSelector` 等面向条件的等待，而不是面向时间的等待。

---

### 七、网络拦截

E2E 测试中，网络拦截有三个最实用的场景：

```typescript
test.describe('网络拦截', () => {

  // ========== 场景 1：Mock API 响应（避免依赖后端） ==========
  test('mock API 返回假数据', async ({ page }) => {
    // route 拦截匹配的请求，返回自定义响应
    await page.route('**/api/users', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, name: 'Mock User' }]),
      })
    })

    await page.goto('/users')
    // 页面上将显示 Mock User，而不是真实 API 返回的数据
    await expect(page.getByText('Mock User')).toBeVisible()
  })

  // ========== 场景 2：拦截请求验证参数 ==========
  test('验证请求参数是否正确', async ({ page }) => {
    let requestBody: any = null

    await page.route('**/api/login', route => {
      requestBody = route.request().postDataJSON()
      route.continue() // 放行请求
    })

    await page.fill('input[name="username"]', 'admin')
    await page.fill('input[name="password"]', 'secret')
    await page.getByRole('button', { name: '登录' }).click()

    // 验证发送的请求体
    expect(requestBody).toEqual({ username: 'admin', password: 'secret' })
  })

  // ========== 场景 3：模拟网络异常 ==========
  test('模拟网络错误时页面展示错误提示', async ({ page }) => {
    // abort 中断请求，模拟网络故障
    await page.route('**/api/data', route => route.abort('internetdisconnected'))

    await page.goto('/dashboard')
    // 检查页面是否正确展示了错误提示
    await expect(page.getByText('网络连接失败')).toBeVisible()
  })
})
```

---

### 八、调试 Playwright 测试

测试写完后，总有几个用例在各种莫名其妙的地方挂掉。Playwright 提供了三个调试利器：

```bash
# 1. --debug：单步调试，每步要手动确认才继续
npx playwright test --debug

# 2. --headed：显示浏览器窗口（默认是无头模式）
npx playwright test login.spec.ts --headed

# 3. --ui：打开 Playwright 的图形化界面（v1.30+）
npx playwright test --ui
```

**Trace Viewer 是最强的调试工具，没有之一：**

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // 失败时自动记录 trace（强烈推荐开启）
    trace: 'retain-on-failure',
    // 或者在 CI 中始终记录：
    // trace: 'on',
  },
})

// 查看 trace：
// npx playwright show-trace test-results/xxx/trace.zip
```

Trace Viewer 会打开一个网页，你可以：
- 逐帧回放测试的每一步操作（DOM 快照）
- 查看每一步前后的页面截图
- 检查每个网络请求的请求/响应
- 查看控制台日志
- 查看每一步执行的时间线

**几乎不需要 `console.log` 调试了。**

---

### 九、多浏览器测试

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // 为三个浏览器引擎分别配置项目
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // 还可以加移动端
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // 全局超时配置
  timeout: 30000,
  expect: { timeout: 5000 },

  // 重试次数（CI 中很有用，处理偶发失败）
  retries: process.env.CI ? 2 : 0,

  // 并行执行
  workers: process.env.CI ? 2 : undefined,
})
```

**要不要三个浏览器都跑？** 如果你只需要支持 Chrome（很多企业内部系统），一个就够了。如果你的产品面向公众，至少覆盖 Chromium 和 WebKit（Safari 的引擎）。Firefox 通常是最少出问题的，可以选跑。

---

### 十、实战：为登录流程编写完整 E2E 测试

假设你的应用有一个登录页面，我们覆盖完整流程：

```typescript
// tests/login.spec.ts
import { test, expect } from '@playwright/test'

// 测试数据集中管理，方便维护
const VALID_USER = {
  username: 'admin',
  password: 'Admin@123456',
}

test.describe('登录流程', () => {

  // 每个用例开始前打开登录页
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    // 验证登录页正常加载
    await expect(page.getByRole('heading', { name: '登录' })).toBeVisible()
  })

  // ==================== 页面加载 ====================
  test('登录页正常渲染所有元素', async ({ page }) => {
    // 验证表单元素都存在
    await expect(page.getByLabel('用户名')).toBeVisible()
    await expect(page.getByLabel('密码')).toBeVisible()
    await expect(page.getByRole('button', { name: '登录' })).toBeVisible()
    // 验证跳转链接
    await expect(page.getByText('还没有账号？立即注册')).toBeVisible()
  })

  // ==================== 表单验证 ====================
  test('用户名为空时显示错误提示', async ({ page }) => {
    // 不填用户名，只填密码
    await page.getByLabel('密码').fill('any-password')
    await page.getByRole('button', { name: '登录' }).click()

    // 验证错误提示出现
    await expect(page.getByText('请输入用户名')).toBeVisible()
    // 验证没有跳转到其他页面
    await expect(page).toHaveURL('/login')
  })

  test('密码为空时显示错误提示', async ({ page }) => {
    await page.getByLabel('用户名').fill('admin')
    // 不填密码，直接点击登录
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page.getByText('请输入密码')).toBeVisible()
  })

  // ==================== 成功登录 ====================
  test('填写正确账号密码后成功登录并跳转到首页', async ({ page }) => {
    // 输入正确的账号密码
    await page.getByLabel('用户名').fill(VALID_USER.username)
    await page.getByLabel('密码').fill(VALID_USER.password)

    // 点击登录按钮
    await page.getByRole('button', { name: '登录' }).click()

    // 验证跳转到首页
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })

    // 验证登录后的 UI 元素（比如用户头像或退出按钮）
    await expect(page.getByText(`欢迎，${VALID_USER.username}`)).toBeVisible()
  })

  // ==================== 登录失败 ====================
  test('密码错误时显示错误提示', async ({ page }) => {
    await page.getByLabel('用户名').fill(VALID_USER.username)
    await page.getByLabel('密码').fill('WrongPassword123')

    await page.getByRole('button', { name: '登录' }).click()

    // 等待错误提示出现（后端需要时间返回 401）
    await expect(page.getByText('用户名或密码错误')).toBeVisible({ timeout: 10000 })

    // 密码输入框应该被清空（安全考虑）
    await expect(page.getByLabel('密码')).toHaveValue('')
  })

  // ==================== 网络异常 ====================
  test('网络异常时显示系统错误提示', async ({ page }) => {
    // mock 登录接口返回 500 错误
    await page.route('**/api/login', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    })

    await page.getByLabel('用户名').fill(VALID_USER.username)
    await page.getByLabel('密码').fill(VALID_USER.password)
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page.getByText('系统繁忙，请稍后重试')).toBeVisible()
  })

  // ==================== 登录态保持 ====================
  test('登录后刷新页面仍然保持登录状态', async ({ page }) => {
    // 步骤 1：完成登录
    await page.getByLabel('用户名').fill(VALID_USER.username)
    await page.getByLabel('密码').fill(VALID_USER.password)
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page).toHaveURL('/dashboard')

    // 步骤 2：刷新页面
    await page.reload()

    // 步骤 3：验证仍在 dashboard，没有跳回登录页
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByText(`欢迎，${VALID_USER.username}`)).toBeVisible()
  })
})
```

**一个 E2E 测试的最佳实践总结：**

1. **数据独立：** 每个测试用例用不同的测试账号或每次生成唯一数据（UUID 后缀），避免互相干扰
2. **不要测单元逻辑：** 表单验证的每一个边界条件用单测测，E2E 测每个字段的一个代表性错误就够了
3. **稳定 > 速度：** 用 Playwright 的自动等待代替 `sleep`，用条件等待代替时间等待
4. **可读性 > 简洁：** E2E 测试是活文档，变量名和注释应该让非技术人员也能大致看懂

---

## 常见问题

**Q1：E2E 测试跑太慢怎么办？**
按模块拆分测试文件，利用 Playwright 的 `workers` 并行执行。只在 CI 中跑完整套件，本地开发只跑改动的 spec 文件。核心路径的冒烟测试单独一个 spec，2 分钟内跑完。

**Q2：测试偶发失败（flaky test）怎么排查？**
95% 的 flaky 是因为等待不够。检查是否有 `waitForTimeout` 硬等、是否有异步渲染没被自动等待捕获。开 `trace: 'retain-on-failure'`，从 Trace Viewer 中精确看到失败那一刻的页面状态。

**Q3：E2E 需要连接真实后端吗？**
依赖程度从低到高有三种策略：完全 mock（最快最稳，适合前端团队独立维护）、连接 staging 环境（最真实，但受环境影响）、混合（关键接口 mock，其它走真实）。对于登录流程，推荐连接 staging。

**Q4：Playwright 和 Cypress 选哪个？**
Playwright 几乎是全面领先：原生多浏览器支持、自动等待更智能、网络拦截更强大、Trace Viewer 碾压 Cypress 的调试体验。除非团队已经在 Cypress 上有大量投资，新项目优先选 Playwright。

**Q5：怎么处理需要登录态的前置条件？**
在 `beforeEach` 中用 `page.request.post` 直接调登录 API 拿到 token，然后通过 `page.context().addCookies()` 注入——跳过 UI 登录步骤，节省大量时间。

**Q6：要不要给测试环境创建专门的测试账号？**
一定要。不要用真实用户数据跑测试。测试账号的数据应该是可预测、可重置的，避免测试的副作用污染真实环境。

**Q7：移动端的 E2E 怎么做？**
Playwright 内置了移动端设备的 viewport 和 user agent 模拟（`devices['iPhone 13']`）。如果还需要触摸手势，用 `page.tap()` 代替 `page.click()`。

**Q8：E2E 失败的截图放哪里？**
Playwright 默认放在 `test-results/`。在 CI 中，把这个目录作为构建产物上传，方便事后排查。GitHub Actions 可以直接归档 `test-results/`。

---

## 实操作业

### 🟢 基础：为一个静态页面写 E2E 测试

创建一个简单的待办事项（Todo）页面（或找一个公开的 Todo App），用 Playwright 写测试覆盖：
- 打开页面，标题正确
- 添加一条待办事项，列表中出现该项
- 勾选完成，样式变化
- 删除一条，列表减少

### 🟡 进阶：为一个带 API 的页面写 E2E 测试

为一个用户列表页写 E2E（搜索 → 列表展示 → 分页 → 点击进入详情）。要求：
- 用 `page.route` mock 所有 API 响应
- 至少使用 `getByRole`、`getByText`、`getByLabel` 三种选择器
- 截图保存关键步骤
- 加上 `trace: 'retain-on-failure'` 配置

### 🔴 挑战：完整用户注册 + 登录 + 信息修改流程

设计三个 spec 文件，覆盖一个完整的用户生命周期：
- `register.spec.ts`：访问注册页 → 填写表单 → 验证 → 提交 → 验证跳转到登录页
- `login.spec.ts`：用刚注册的账号登录 → 验证跳转 → 验证登录态
- `profile.spec.ts`：登录后修改个人信息 → 保存 → 验证修改成功 → 退出登录

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L3 里程碑](../../projects/atlas/milestones/L3.md)
- 本课任务：把“Playwright E2E 测试”接入 Atlas 工程链路，形成可重复命令和失败门禁，并保存一次故意失败与恢复的证据。
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

- E2E 测核心流程，不是万金油；维护成本高，只测业务关键路径
- Playwright 架构：Browser → Context（独立会话） → Page（标签页）
- 选择器优先级：`getByRole` > `getByLabel` > `getByPlaceholder` > `getByText` > `getByTestId` > CSS
- Playwright 自动等待元素可交互，不要用 `sleep` 代替
- 网络拦截三场景：mock 响应、验证请求、模拟异常
- `trace: 'retain-on-failure'` + Trace Viewer 是定位失败的重要证据，必要时结合视频、截图、Console、Network 和服务端日志
- 多浏览器用 `projects` 配置，至少覆盖 Chromium
- E2E 测试数据必须独立、可重置，不能用生产数据

<!-- course-nav:start -->
---

[上一篇：02-组件测试与 Testing Library](./02-组件测试与Testing-Library.md) · [课程地图](../../README.md) · [下一篇：04-测试策略与覆盖率](./04-测试策略与覆盖率.md)
<!-- course-nav:end -->
