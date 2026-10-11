# 在真实浏览器中验证路由、键盘、焦点与错误恢复

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | 路由应用、语义 HTML、上一课的单元证据 |
| 输入 | 用户导航、键盘动作、404/503/409、渲染异常 |
| 输出 | 可恢复边界、路由焦点、Playwright 关键流程 |
| 视口 | 1280px 主路径；320 CSS px 与 200% 缩放边界 |
| 验证 | role/name 定位、两页面冲突、Console 与焦点检查 |
| 边界 | Chromium 自动化不等于屏幕阅读器或全浏览器认证 |

## 1. 任务背景

组件测试无法发现生产静态服务器未回退到 `index.html`、路由切换后焦点仍停在消失链接、原生 dialog 的 Escape 没同步 model，或两标签页预约只有一个页面更新。

真实浏览器测试穿过构建、路由、事件和本机教学 API。它更接近用户，但仍不能证明后端数据库事务、真实 Cookie 安全或辅助技术朗读质量。本课同时建立渲染错误恢复，避免单个后代组件错误让整个应用白屏。

## 2. 学习目标

- 用 `onErrorCaptured` 捕获后代渲染/setup 错误并提供重建路径。
- 在路由完成后更新文档标题并把焦点移到页面主标题。
- 使用 Playwright role/name 定位完成业务主路径。
- 验证 `status/alert`、可见焦点、键盘操作、减少动态与窄屏。
- 正确模拟两个页面竞争预约并断言一次成功、一次 409。

## 3. 预备知识

浏览器测试安装：

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
pnpm list @playwright/test --depth 0
```

E2E 必须启动全新、独占端口的服务器，不能复用开发者手工修改过的进程。教学 API 为内存状态，workers 设为 1，避免不同测试并行污染种子。

## 4. 核心理论

### 4.1 三类错误边界

- 请求错误：由 composable/路由加载捕获，保留页面外壳与重试。
- 事件命令错误：在 click/submit action 中 `try/catch`，显示安全反馈。
- 渲染/setup 错误：由祖先 `onErrorCaptured` 捕获，重建后代或返回列表。

`onErrorCaptured` 不会自动捕获任意脱离组件链的 Promise rejection。返回 `false` 阻止继续向上传播；fallback 自己必须简单可靠。

### 4.2 路由焦点

SPA 更新内容不会像完整页面加载那样自动通知所有用户。导航完成后：

1. 更新 `document.title`；
2. 等 DOM 更新；
3. 主标题临时 `tabindex="-1"` 并 focus；
4. 保留可见 focus 样式。

不能每次 query 输入变化都抢焦点，只在确认导航进入新页面时执行。

### 4.3 可访问状态

- 输入有真实 `<label for>`，placeholder 不是名称。
- 操作进度用 `role="status"`，错误需要及时关注时用 `role="alert"`。
- 收藏按钮用 `aria-pressed`；disabled 期间仍有文字说明。
- 焦点顺序跟 DOM 和视觉顺序一致。
- 动画在 `prefers-reduced-motion: reduce` 下关闭非必要过渡。

## 5. 元素、属性、API 或配置清单

| API/语义 | 作用 | 断言 | 边界 |
| --- | --- | --- | --- |
| `onErrorCaptured` | 后代渲染错误 | fallback 可见并可重试 | 不捕获所有异步命令 |
| `router.afterEach` | 导航完成 | 标题与焦点更新 | 要清理/单次注册 |
| `tabindex="-1"` | 允许标题程序化聚焦 | `toBeFocused()` | 不进入正常 Tab 顺序 |
| `role="status"` | 非阻塞状态 | 成功/进度文本 | 不滥用 live region |
| `role="alert"` | 重要错误 | 失败文本出现 | 不放堆栈/秘密 |
| `getByRole` | 按可访问树定位 | 名称稳定 | 能找到不代表体验完整 |
| `context.newPage()` | 同上下文第二页 | 会话共享、页面独立 | 教学内存 API 非数据库 |
| `emulateMedia` | 减少动态偏好 | 动画持续时间为 0 | 仍需人工观察 |

## 6. 最小可运行案例

**完整文件：`apps/vue-web/src/ErrorBoundary.vue`**

```vue
<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const failed = ref(false)
const attempt = ref(0)

onErrorCaptured(() => {
  failed.value = true
  return false
})

function retry() {
  failed.value = false
  attempt.value += 1
}
</script>

<template>
  <section v-if="failed" role="alert" aria-labelledby="render-error-title">
    <h2 id="render-error-title">页面显示失败</h2>
    <p>可以重建当前页面；若仍失败，请返回商品列表。</p>
    <button type="button" @click="retry">重新显示</button>
    <a href="/listings">返回列表</a>
  </section>
  <div v-else :key="attempt">
    <slot />
  </div>
</template>
```

**关键片段：`apps/vue-web/src/App.vue`**

```vue
<ErrorBoundary>
  <RouterView />
</ErrorBoundary>
```

创建一个 setup 中抛错的实验子组件，确认 fallback 出现；删除错误后点击“重新显示”，内容恢复。fallback 不渲染原始 error.message，因为它可能包含内部字段。

**命令：在 `apps/vue-web` 执行**

```bash
pnpm exec vue-tsc -b
pnpm dev --host 127.0.0.1 --port 5174 --strictPort
```

## 7. 邻里集市集成案例

### 7.1 路由焦点恢复

**关键片段：`apps/vue-web/src/router.ts`**

```ts
router.afterEach(async to => {
  document.title = typeof to.meta.title === 'string'
    ? `${to.meta.title} · 邻里集市`
    : '邻里集市'
  await nextTick()
  document.querySelector<HTMLElement>('main h1')?.focus()
})
```

**关键片段：页面标题**

```vue
<h1 tabindex="-1">商品列表</h1>
```

### 7.2 共享业务场景

**关键片段：`apps/vue-web/e2e/market.spec.ts`**

```ts
import { expect, test } from '@playwright/test'

test('search-empty-and-recovery', async ({ page }) => {
  await page.goto('/listings')
  await page.getByLabel('搜索标题').fill('没有这件商品')
  await page.getByRole('button', { name: '筛选', exact: true }).click()
  await expect(page.getByText('没有匹配商品。')).toBeVisible()
  await page.getByRole('link', { name: '清除筛选' }).click()
  await expect(page.getByRole('heading', { name: '九成新台灯' })).toBeVisible()
})

test('reservation-conflict-across-tabs', async ({ page, context }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: '以演示居民登录' }).click()
  await page.goto('/listings/lamp-1')
  const second = await context.newPage()
  await second.goto('/listings/lamp-1')

  await page.getByRole('button', { name: '预约', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('预约成功')
  await second.getByRole('button', { name: '预约', exact: true }).click()
  await expect(second.getByRole('alert')).toContainText('商品已被预约')
  await second.close()
})

test('not-found-and-service-failure', async ({ page }) => {
  await page.goto('/listings/missing')
  await expect(page.getByRole('alert')).toContainText('商品不存在')
  await page.goto('/listings?q=__error')
  await expect(page.getByRole('alert')).toContainText('演示服务故障')
  await page.getByRole('link', { name: '清除筛选' }).click()
  await expect(page.getByRole('heading', { name: '商品列表' })).toBeFocused()
})
```

### 7.3 键盘与响应式检查

主路径不调用 `locator.click()` 代替键盘：

```ts
test('keyboard-primary-path', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/listings')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('搜索标题')).toBeFocused()
  await page.keyboard.type('台灯')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: '九成新台灯' })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
})
```

200% 缩放可用 CDP/浏览器缩放人工复验；CSS viewport 320 与缩放是两个维度，不能互相冒充。

## 8. 常见错误与排查路径

**错误示例：用 CSS 选择器定位视觉位置。**

```ts
await page.locator('.toolbar > button:nth-child(2)').click()
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 测试重排后失效 | DOM 第 2 个按钮改变 | 定位依赖布局 | role/name | 文案/语义不变时通过 |
| 导航后读屏无上下文 | activeElement 仍是旧链接/body | 未恢复焦点 | focus 新 h1 | `toBeFocused` |
| fallback 反复崩溃 | Console 指向边界自身 | fallback 依赖出错服务 | 简化为原生元素 | 错误页稳定 |
| 409 偶发不出现 | 两页并发次序不确定 | 未等待第一次成功 | 先断言 201，再触发第二次 | 结果确定 |
| 窄屏横向滚动 | `scrollWidth` 大于 clientWidth | 固定宽度/长文本 | 流式布局与换行 | 320px 无溢出 |
| reduced motion 仍动画 | 媒体查询未覆盖类 | 只改一条 transition | 集中关闭非必要动画 | emulate 后持续时间 0 |

先保存 URL、activeElement、可访问名称、Network status 和 Console，再归因；不要通过强制 click 绕过不可操作元素。

## 9. 课后题

1. **为何 route error 与 render error 不应只用一个全局白屏？**<br>
   答：路由请求错误通常可保留导航和局部重试；渲染边界只处理后代异常，范围越小恢复代价越低。
2. **`getByRole` 找到按钮能证明屏幕阅读器体验吗？**<br>
   答：不能，只证明当前浏览器可访问树中的角色/名称；朗读顺序和交互仍需真实辅助技术。
3. **为何第二标签页要同一个 context？**<br>
   答：模拟同一浏览器会话共享 Cookie，同时保持两个独立页面快照。
4. **焦点为什么放在 h1 而不是 body？**<br>
   答：主标题提供新页面上下文，`tabindex=-1` 可聚焦又不改变正常 Tab 顺序。

## 10. 实践练习

**基础：状态语义。**检查 loading 使用 status、错误使用 alert、收藏使用 aria-pressed。答案标准：没有只靠颜色区分。

**进阶：发布失败键盘流。**只用 Tab/Enter 填写并提交 `__error` 草稿，断言 alert 出现且标题输入值保留。

**故障注入：删除 label 的 `for`。**`getByLabel('搜索标题')` 应失败；修复真实关联，不改成 CSS 定位。

## 11. 阶段验收

- [ ] setup/render 错误出现可恢复 fallback。
- [ ] 导航后文档标题更新、h1 聚焦且 outline 可见。
- [ ] 搜索空态、404、503 均有恢复入口。
- [ ] 两页面预约严格得到一次成功和一次 409。
- [ ] 320 CSS px 无页面级横向溢出。
- [ ] 键盘可完成主路径，不用强制 click。
- [ ] reduced-motion 关闭非必要 Transition。
- [ ] Console 无未处理错误；预期故障有显式断言。

## 12. 常见问题

**可以在每次 query 改变时 focus h1 吗？**<br>
通常不应。用户正在输入或浏览结果时抢焦点会打断操作；只在明确页面导航后恢复上下文。

**为什么错误边界重试可能丢草稿？**<br>
重建后代会销毁局部状态。日常校验错误应留在组件内；边界只处理无法继续渲染的异常。

**Playwright workers 为什么设为 1？**<br>
教学 API 使用共享内存种子，没有正式测试隔离。生产系统应为每个 worker 建独立数据，而不是长期依赖串行。

## 13. 扩展阅读

资料快照日期：2026-10-10。

- [Vue `onErrorCaptured`](https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured)：捕获范围与传播。
- [Vue Accessibility](https://vuejs.org/guide/best-practices/accessibility.html)：路由焦点、语义与跳转链接。
- [Playwright Locators](https://playwright.dev/docs/locators)：role/name 优先级。
- [WAI-ARIA 状态与属性](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/)：名称和状态基础。

## 我现在能做到什么

我能在真实浏览器中验证路由恢复、键盘、焦点、状态语义、窄屏和冲突，同时清楚标记自动化证据没有覆盖的辅助技术与后端边界。

## 单元导航

[上一课：纯函数、组件与 Store 测试](01-pure-component-store-tests.md) · [返回章目录](../README.md#第六章测试无障碍与错误恢复) · [下一课：ESLint、CI 与证据边界](03-eslint-ci-test-evidence-boundaries.md)
