# 路由、浏览器、无障碍与错误恢复：主路径必须可操作也可返回

## 任务卡

- **任务**：建立顶层与路由局部错误恢复，运行 Chromium 业务流和键盘/焦点验收。
- **产出**：`ErrorBoundary.tsx`、`RouteFocus.tsx`、Playwright 场景与人工检查记录。
- **运行**：独立 strictPort 开发服务器、Playwright Chromium、320px 与 200% 缩放。
- **完成证据**：404/503 可恢复，键盘完成主流程，路由标题接收焦点，状态语义正确。
- **边界**：Chromium 自动化不等于 Safari/Firefox 或真实屏幕阅读器认证。

## 1. 任务背景

组件测试看不到真实 history fallback、浏览器焦点顺序和两个页面竞争。另一方面，E2E 只点
一次正常按钮也无法证明错误语义。需要把错误放在最窄可恢复边界，并以 URL、DOM、焦点、
Network 状态和可见消息共同判断。

错误边界不是全局 `catch`。请求失败应留在资源状态，路由 loader/action 错误由
`errorElement` 提供语境，顶层边界只防止未知渲染异常造成白屏。

## 2. 学习目标

完成后你能：

1. 区分渲染错误、路由错误与异步命令错误；
2. 为 SPA 路由切换恢复标题与焦点；
3. 用 Playwright role/name locator 编排共享业务流；
4. 验证 320px、200% 缩放、键盘和 reduced motion；
5. 记录自动化未覆盖的辅助技术与浏览器边界。

## 3. 预备知识

应用已提供 `/listings`、`/listings/:id`、`/login`、`/new`，教学 API 能触发 `__error`、
missing、登录、发布、收藏和预约。每次 E2E 使用新进程和独立端口，预约 fixture 不能被上次
运行污染。主控件必须有可访问名称。

## 4. 核心理论

### 4.1 错误边界按恢复范围布置

- 资源请求：组件内 loading/error/retry；
- loader/action：路由 `errorElement`，保留返回路径；
- 未知 render 异常：顶层 ErrorBoundary，避免空白；
- event/Promise 异常：事件自己的 try/catch，不会自动进入类错误边界；
- SSR 异常：服务器渲染流程处理，客户端边界不能捕获已失败的服务器响应。

### 4.2 路由切换需要页面级反馈

SPA 不会像完整导航那样自动朗读新文档。pathname 变化后更新 `document.title`，把焦点移到
当前页面 `h1`（`tabIndex=-1`），但搜索输入每次变化不能抢焦点。

### 4.3 可访问语义是行为契约

label 命名输入，button 负责动作，link 负责导航。`role=status` 用于非紧急结果，
`role=alert` 用于需要立即注意的错误；同一消息不要同时重复播报。

### 4.4 两页面才能观察预约冲突

一个页面 disabled 只证明本地 UI。两个独立 page 同时预约同一 fixture，必须观察一个 201
和一个 409，才能覆盖教学 API 的冲突语义；真实数据库仍需后端集成测试。

## 5. 元素、属性、API 或配置清单

| 接口 / 语义 | 用途 | 边界 |
| --- | --- | --- |
| React Error Boundary | 捕获子树 render/lifecycle 错误 | 不捕获事件 Promise/SSR |
| Router `errorElement` | 路由语境内恢复 | 不替代资源状态 |
| `tabIndex={-1}` | 允许程序聚焦标题 | 不进入正常 Tab 顺序 |
| `document.title` | 告知页面语境 | 仍需可见 h1 |
| `role="status"` | 成功/非紧急更新 | 避免频繁噪声 |
| `role="alert"` | 错误即时提示 | 不替代字段关联 |
| `aria-pressed` | 收藏开关状态 | 不替代按钮文案 |
| `prefers-reduced-motion` | 减少非必要动效 | 不删除必要状态反馈 |
| Playwright `page` | 独立浏览上下文页 | 同进程教学 API 非数据库 |

## 6. 最小可运行案例

**完整文件：`apps/react-web/src/ErrorBoundary.tsx`**

```tsx
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

type State = { error: Error | null };

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("render-failure", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main>
          <h1>界面出现错误</h1>
          <p role="alert">当前区域无法显示，请重新加载。</p>
          <button type="button" onClick={() => window.location.reload()}>
            重新加载
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
```

生产日志必须脱敏，不记录凭据、密码或私有商品内容。渐进扩展：在一张卡片临时 throw，
观察顶层恢复；再把 503 留在路由 errorElement，确认局部失败不会摧毁全站导航。

## 7. 邻里集市集成案例

**完整文件：`apps/react-web/src/RouteFocus.tsx`**

```tsx
import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

export default function RouteFocus({ title }: { title: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${title} · 邻里集市`;
    heading.current?.focus();
  }, [pathname, title]);

  return <h1 ref={heading} tabIndex={-1}>{title}</h1>;
}
```

将它放在每个页面主标题位置，不要另留第二个 h1。焦点样式必须保留：

```css
:focus-visible {
  outline: 3px solid #155eef;
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

**关键片段：`apps/react-web/e2e/market.spec.ts`**

```ts
import { expect, test } from "@playwright/test";

test("search-empty-and-recovery", async ({ page }) => {
  await page.goto("/listings?q=不存在");
  await expect(page.getByText("没有匹配商品。")).toBeVisible();
  await page.getByLabel("搜索标题").fill("__error");
  await page.getByRole("button", { name: "筛选" }).click();
  await expect(page.getByRole("alert")).toContainText("503");
  await page.getByRole("link", { name: "返回商品列表" }).click();
  await expect(page.getByRole("heading", { name: "邻里集市" })).toBeFocused();
});

test("reservation-conflict-across-tabs", async ({ browser }) => {
  const context = await browser.newContext();
  const login = await context.newPage();
  await login.goto("/login");
  await login.getByRole("button", { name: "以演示居民登录" }).click();
  await expect(login).toHaveURL(/\/listings$/);
  await login.close();

  const first = await context.newPage();
  const second = await context.newPage();
  await Promise.all([
    first.goto("/listings/lamp-1"),
    second.goto("/listings/lamp-1"),
  ]);
  await Promise.all([
    first.getByRole("button", { name: "预约" }).click(),
    second.getByRole("button", { name: "预约" }).click(),
  ]);
  const messages = await Promise.all([
    first.locator('[role="status"],[role="alert"]').allTextContents(),
    second.locator('[role="status"],[role="alert"]').allTextContents(),
  ]);
  expect(messages.flat().join(" ")).toMatch(/预约成功/);
  expect(messages.flat().join(" ")).toMatch(/409/);
});
```

完整共享场景名保持固定：

| 场景 | 关键断言 |
| --- | --- |
| `price-and-draft-contract` | 金额边界与整数分 |
| `failed-publish-keeps-draft` | 失败保留草稿 |
| `favorite-target-is-idempotent` | PUT/DELETE 幂等 |
| `late-session-result-is-ignored` | logout 后旧结果丢弃 |
| `search-empty-and-recovery` | empty 与 503 分开 |
| `login-publish-favorite-logout` | 核心会话流程 |
| `reservation-conflict-across-tabs` | 一个成功、一个 409 |
| `not-found-and-service-failure` | 404/503 恢复 |
| `keyboard-primary-path` | 键盘、焦点和消息 |
| `ssr-html-and-hydration` | 第 08 章执行 |

## 8. 常见错误与排查路径

**明确错误示例：**

```tsx
<div onClick={reserve}>预约</div>
```

它默认不可聚焦、没有按钮键盘行为，也没有禁用/名称语义。

| 项目 | 记录 |
| --- | --- |
| 现象 | 鼠标能预约，Tab 找不到控件；路由后读屏仍停在旧页面 |
| 证据 | Accessibility tree 无 button；`document.activeElement` 仍是旧 link |
| 原因 | 用 div 模拟按钮，且 SPA 导航没有标题焦点恢复 |
| 修复 | 使用原生 button；pathname 后聚焦新 h1；保留 focus-visible |
| 复验 | Tab/Enter 完成预约，导航后新 h1 focused，状态消息只播报一次 |

不要通过增加 `tabIndex=0` 和 keydown 重新实现原生按钮的全部行为。

## 9. 课后题

1. ErrorBoundary 为什么抓不到 click handler 中被拒绝的 Promise？
2. 404 和 503 为什么不能都显示“没有商品”？
3. placeholder 为什么不能代替 label？
4. Chromium E2E 通过为何不等于屏幕阅读器通过？

答案：

1. 类错误边界只处理子树渲染/生命周期错误，事件异步需自身 catch。
2. 404 是资源不存在，503 是服务暂不可用，恢复动作不同。
3. placeholder 会消失且不是稳定可访问名称。
4. 自动化只覆盖浏览器 DOM/无障碍树的一部分，没有真实朗读与用户设置。

## 10. 实践练习

**基础**：用键盘完成搜索并返回列表。验收：焦点可见，Enter 提交，新标题 focused。

**进阶**：在 320px、200% 缩放完成登录、发布、收藏、预约。验收：无页面级横向溢出，
消息不被遮挡。

**故障注入**：删除 `tabIndex=-1`。路由焦点测试应失败；恢复属性和 focus-visible 后通过。

## 11. 阶段验收

- [ ] 顶层、路由和资源错误边界职责分开。
- [ ] 404、503、empty、401、403、409 保留不同语义。
- [ ] 主控件使用 role/name locator。
- [ ] 两页面预约得到一次成功和一次 409。
- [ ] 路由标题与 document.title 同步，标题可聚焦。
- [ ] 键盘主路径覆盖 Tab、Shift+Tab、Enter、Space、Escape。
- [ ] 320px/200% 无页面级横向溢出。
- [ ] reduced motion 不删除必要反馈。
- [ ] 未执行的浏览器和辅助技术明确列出。

## 12. 常见问题

**所有导航都应自动 focus h1 吗？**

页面级路由通常需要；局部筛选更新不应抢焦点。按导航语义区分。

**可以只用 axe 自动扫描吗？**

不能。自动规则有价值，但不覆盖任务流程、朗读质量和认知可用性。

**为什么 E2E 使用独立端口？**

防止误连其他本机服务而得到虚假绿色结果。

## 13. 扩展阅读

资料快照：2026-10-11。

- [React：Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [React Router：Error Boundaries](https://reactrouter.com/how-to/error-boundary)
- [Playwright：Locators](https://playwright.dev/docs/locators)
- [WAI：Forms Tutorial](https://www.w3.org/WAI/tutorials/forms/)
- [WCAG：Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)
- [MDN：prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)

兼容边界：本课以 Chromium 为自动化目标。Safari、Firefox、VoiceOver、NVDA、JAWS 和真实
移动设备必须单独执行后才能记录通过。

## 我现在能做到什么

我能把错误放在最小可恢复边界，用真实浏览器验证路由、冲突和焦点，并清楚区分键盘自动化
证据与跨浏览器、辅助技术人工证据。

## 单元导航

- 上一单元：[纯函数与组件契约测试](./01-pure-component-contract-tests.md)
- 下一单元：[ESLint、CI 与证据边界](./03-eslint-ci-test-evidence-boundaries.md)
