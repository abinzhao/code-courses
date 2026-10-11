# 语义 Design Tokens：共享视觉原语，不共享框架生命周期

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 可切换浅/深主题的语义 CSS tokens、forced-colors 规则、React/Vue 等价卡片边界 |
| 最小案例 | `apps/lab-web` 使用公共 token 展示 `19.90` 与 `0.00`，键盘切换主题 |
| 关键故障 | 文字和表面颜色对比度降到 `1.26:1` 时构建仍成功，但浏览器验收失败 |
| 运行位置 | 第 1、2 课的 `market-workspace/`；React/Vue 文件进入各自已有课程应用 |
| 固定工具 | Node.js `24.21.0`、pnpm `12.10.1`、Vite `8.3.0`、现代 Chromium |
| 完成时间 | 约 120 分钟 |
| 明确边界 | Chromium 模拟不是 Windows 高对比度、Firefox、WebKit 或真实辅助技术验收 |

本课继续使用经过 parser 的 Listing，价格领域值为非负安全整数分。token 只负责视觉决策，不能验证外部 JSON、身份、对象授权、库存、预约事务或角色权限。React 与 Vue 使用同一业务复杂度和包公共入口，但各自保留自然的组件、状态、事件和生命周期。

## 1. 任务背景

当 React 页面用一套绿色、Vue 页面用另一套绿色时，团队可能把所有组件都塞进一个“跨框架组件库”。结果往往是条件分支、手动 DOM 和生命周期适配层越来越多，两个框架都失去自然用法。

真正稳定的共享层通常更小：领域契约、金额规则、图标资源和语义视觉 token。React 组件和 Vue 组件可以分别把这些输入渲染为相同业务信息，而不共享 Hook、ref、响应式代理或节点所有权。

颜色变量能通过 CSS 解析，也不代表用户能读清。文字与背景可能只有极低对比度；操作状态可能只靠颜色区分；强制颜色模式可能抹掉自定义背景。设计 token 必须连接到浏览器证据，而不是停在“构建通过”。

## 2. 学习目标

完成本课后，你能够：

1. 使用“文本、表面、边框、焦点、操作”等语义名称，而不是把十六进制值写进组件。
2. 用同一语义 token 为浅色、深色和 forced-colors 提供有责任边界的取值。
3. 计算并检查普通文本对比度，区分静态色值检查与浏览器最终计算样式。
4. 说明 `forced-color-adjust`、系统颜色和原生控件在强制颜色模式中的作用。
5. 判断布局/交互应留在应用，还是视觉原语值得进入共享包。
6. 限制 DOM 工厂的使用范围，避免 React/Vue 与外部代码同时管理同一节点。
7. 让 React/Vue 卡片展示同一 Listing 字段和金额规则，但不共享框架生命周期代码。

## 3. 预备知识

- 完成[第 1 课](01-pnpm-workspace-dependency-graph.md)，依赖方向为 `app → ui → contracts`。
- 完成[第 2 课](02-package-exports-contracts-publishing.md)，只使用包公共入口，外部值经 parser。
- 理解 CSS 自定义属性、继承、媒体查询、焦点和基本颜色表示。
- 已学习 React props/组件和 Vue props/SFC；本课不重复框架基础。
- 知道浏览器构建成功不代表视觉、键盘或辅助技术行为正确。

先执行：

```bash
cd market-workspace
pnpm graph:check
pnpm typecheck:all
pnpm build
```

基线失败时先恢复前两课。视觉修改不应同时掩盖包图或 parser 回归。

## 4. 核心理论

### 4.1 Token 名称应表达用途

比较两种命名：

```css
--green-700: #075e54;
--market-color-action-bg: #075e54;
```

前者描述一个色阶位置，后者描述“主要操作背景”的语义。组件真正需要的是语义：按钮背景、页面文字、卡片表面、弱化文字和焦点轮廓。主题变化时，语义保持，值可以替换。

基础色阶可作为设计工具内部原料，但应用组件优先消费语义 token。不要把 `--color-1`、`--color-2` 之类编号直接变成长期公共 API；消费者无法判断何时应该使用。

### 4.2 CSS 自定义属性通过级联生效

Token 可以定义在 `:root`，主题选择器覆盖同名属性，组件在需要的位置用 `var()` 读取：

```css
:root {
  --market-color-text: #172126;
}

:root[data-market-theme="dark"] {
  --market-color-text: #f3f6f7;
}

.market-card {
  color: var(--market-color-text);
}
```

最终值取决于级联、继承、选择器和运行时属性。只检查源文件里的一个十六进制值，不一定代表元素最终颜色；浏览器 Computed 面板才反映实际结果。

### 4.3 对比度是“前景与实际背景”的关系

相对亮度对比度公式为：

```text
(较亮相对亮度 + 0.05) / (较暗相对亮度 + 0.05)
```

WCAG 2.x 的常用 AA 门槛是：普通文本至少 `4.5:1`，大号文本至少 `3:1`。课程不把所有文字都假设为大号，因此主要文本、弱化文本和按钮文字按普通文本检查。图标、边框、焦点和状态还各有非文本对比与可识别性责任，不能只算正文一组颜色。

本课预期色对：

| 主题/用途 | 前景 | 背景 | 计算比值 |
| --- | --- | --- | ---: |
| 浅色正文 | `#172126` | `#ffffff` | `16.38:1` |
| 浅色弱化文字 | `#41545c` | `#ffffff` | `7.93:1` |
| 浅色主要操作 | `#ffffff` | `#075e54` | `7.67:1` |
| 深色正文 | `#f3f6f7` | `#182124` | `15.08:1` |
| 深色弱化文字 | `#c5d0d4` | `#182124` | `10.41:1` |
| 深色主要操作 | `#07231e` | `#55d6be` | `9.26:1` |

数值检查是设计输入，不是最终浏览器证明。透明度、背景图片、覆盖规则、disabled 状态和浏览器强制颜色都可能改变实际组合。

### 4.4 Forced colors 由用户环境接管颜色

在 Windows 高对比度等环境中，浏览器可能启用 `forced-colors: active`，将页面颜色替换为有限的系统颜色。CSS 可以使用 `Canvas`、`CanvasText`、`ButtonFace`、`ButtonText`、`Highlight` 等系统颜色表达用途。

优先让原生语义元素和浏览器自动调整工作。`forced-color-adjust: none` 会阻止用户颜色覆盖，只应在极少数保留信息所必需、且经过真实辅助环境验证的场景使用。本课不使用它。

状态不能只靠背景色区分。“可购买”文字、边框和 DOM 语义在颜色被替换后仍应存在。自定义焦点也要在 forced colors 下可见。

### 4.5 共享与本地的判断标准

适合共享：

- 跨应用含义相同的文本、表面、焦点和间距 token。
- Listing、运行时 parser、整数分格式函数。
- 经过明确许可的图标和静态资源。
- 与框架无关且责任稳定的 CSS class 契约。

更适合留在应用：

- 只在一个页面出现的网格列数和特殊营销布局。
- 路由状态、请求取消、页面弹窗和权限提示。
- React Hook、Context、Suspense 边界。
- Vue composable、ref、watch 和组件生命周期。

共享的判断不是“两个文件看起来像”，而是语义和变化原因相同。若 React 卡片和 Vue 卡片今天都呈现白色方框，但交互、状态和发布节奏不同，强行共享完整组件会增加耦合。

### 4.6 DOM 工厂有明确上限

第 1 课的 `createListingCard` 适合纯 DOM 教学 app，因为节点只有一个所有者。React 和 Vue 都有自己的渲染与更新模型；若先由 DOM 工厂创建节点，再让框架更新同一子树，框架可能无法理解外部改动，事件清理和状态同步也会混乱。

跨框架复用应停在数据、纯函数、CSS 和资源层。React 组件返回 JSX，Vue 组件使用 template；各自框架拥有节点、事件和生命周期。不要为了复用几行标签实现一个隐形跨框架渲染器。

### 4.7 业务等价不等于逐行翻译

React 与 Vue 等价卡片都应：

- 接收已经解析的完整 Listing。
- 展示标题、描述、状态和整数分格式金额。
- 使用相同语义 class/token。
- 不自行读取全局用户、发起写请求或决定对象授权。

它们不需要具有相同源码结构。验收比较业务输入、可见输出、键盘行为和状态，不比较 Hook 与 composable 的行号。

## 5. 元素、属性、API 或配置清单

| 属性、API 或文件 | 用途 | 本课选择 | 边界 |
| --- | --- | --- | --- |
| `--market-color-text` | 主要文字 | 高对比语义色 | 不能代替字号/字重检查 |
| `--market-color-text-muted` | 次要说明 | 仍按普通文本检查 | 不应用低透明度制造“弱化” |
| `--market-color-canvas` | 页面底色 | 浅/深主题分别定义 | 背景图片可能改变实际背景 |
| `--market-color-surface` | 卡片表面 | 与 canvas 分层 | 阴影不是唯一边界 |
| `--market-color-border` | 边界 | 普通模式可见 | forced colors 下使用系统色 |
| `--market-color-action-*` | 主要操作前景/背景 | 成对定义 | hover/focus/disabled 仍需检查 |
| `--market-color-focus` | 键盘焦点轮廓 | `3px` outline | 不能用 `outline: none` 删除 |
| `color-scheme` | 告知 UA 主题倾向 | light/dark 随主题变化 | 不自动生成自定义主题 |
| `data-market-theme` | 显式主题状态 | `light` / `dark` | 不是身份或权限状态 |
| `prefers-color-scheme` | 系统主题偏好 | 可作为初始值来源 | 用户显式选择应有清晰策略 |
| `@media (forced-colors: active)` | 强制颜色适配 | 使用系统颜色 | Chromium 模拟不等于真实 OS 验收 |
| `Canvas` / `CanvasText` | 系统画布前景/背景 | forced colors token 值 | 仅在支持环境生效 |
| `ButtonFace` / `ButtonText` | 系统按钮色 | 主要操作 | 原生 button 仍优先 |
| `forced-color-adjust` | 控制 UA 强制调色 | 保持默认 `auto` | `none` 需极强证据 |
| `:focus-visible` | 键盘型焦点样式 | 明确 outline | 不应只靠颜色微变 |
| `getComputedStyle` | 读取浏览器最终样式 | 调试最终 token | 不能单独完成辅助技术验收 |
| Vite `8.3.0` | 构建 CSS 与应用 | 生产构建证据 | 不计算可读性或授权 |

## 6. 最小可运行案例

### 6.1 替换语义 token 文件

完整替换 `market-workspace/packages/ui/src/tokens.css`：

```css
:root {
  color-scheme: light;
  font-family: system-ui, sans-serif;
  --market-color-canvas: #f4f7f6;
  --market-color-surface: #ffffff;
  --market-color-text: #172126;
  --market-color-text-muted: #41545c;
  --market-color-border: #9aabb1;
  --market-color-action-bg: #075e54;
  --market-color-action-text: #ffffff;
  --market-color-focus: #005fcc;
  --market-space-1: 0.5rem;
  --market-space-2: 1rem;
  --market-radius-card: 0.75rem;
}

:root[data-market-theme="dark"] {
  color-scheme: dark;
  --market-color-canvas: #111719;
  --market-color-surface: #182124;
  --market-color-text: #f3f6f7;
  --market-color-text-muted: #c5d0d4;
  --market-color-border: #819197;
  --market-color-action-bg: #55d6be;
  --market-color-action-text: #07231e;
  --market-color-focus: #8bbcff;
}

body {
  margin: 0;
  color: var(--market-color-text);
  background: var(--market-color-canvas);
}

main {
  max-width: 48rem;
  margin-inline: auto;
  padding: var(--market-space-2);
}

.market-toolbar {
  display: flex;
  gap: var(--market-space-1);
  align-items: center;
  flex-wrap: wrap;
}

.market-action {
  padding: var(--market-space-1) var(--market-space-2);
  color: var(--market-color-action-text);
  background: var(--market-color-action-bg);
  border: 2px solid transparent;
  border-radius: var(--market-radius-card);
  font: inherit;
  cursor: pointer;
}

.market-action:focus-visible {
  outline: 3px solid var(--market-color-focus);
  outline-offset: 3px;
}

.market-card {
  margin-block: var(--market-space-2);
  padding: var(--market-space-2);
  color: var(--market-color-text);
  background: var(--market-color-surface);
  border: 1px solid var(--market-color-border);
  border-radius: var(--market-radius-card);
}

.market-card__description {
  color: var(--market-color-text-muted);
}

.market-card__price {
  font-weight: 700;
}

.market-card__status {
  display: inline-block;
  padding: 0.125rem var(--market-space-1);
  border: 1px solid currentColor;
  border-radius: 999px;
}

@media (forced-colors: active) {
  :root,
  :root[data-market-theme="dark"] {
    --market-color-canvas: Canvas;
    --market-color-surface: Canvas;
    --market-color-text: CanvasText;
    --market-color-text-muted: CanvasText;
    --market-color-border: CanvasText;
    --market-color-action-bg: ButtonFace;
    --market-color-action-text: ButtonText;
    --market-color-focus: Highlight;
  }

  .market-card,
  .market-card__status {
    border-color: CanvasText;
  }

  .market-action {
    border-color: ButtonText;
  }
}
```

forced-colors 分支保留文字、边框和焦点，不使用 `forced-color-adjust: none`。主题 token 集中在公共文件，页面特殊网格仍留在应用 CSS。

### 6.2 更新 DOM 工厂的语义 class

完整替换 `market-workspace/packages/ui/src/index.ts`：

```ts
import { formatCents } from "@market/contracts";
import type { Listing } from "@market/contracts";

const statusLabels = {
  available: "可购买",
  reserved: "已预约",
  sold: "已售出",
} as const;

export function createListingCard(listing: Listing): HTMLElement {
  const card = document.createElement("article");
  card.className = "market-card";
  card.dataset.listingId = listing.id;

  const title = document.createElement("h2");
  title.textContent = listing.title;

  const description = document.createElement("p");
  description.className = "market-card__description";
  description.textContent = listing.description;

  const price = document.createElement("p");
  price.className = "market-card__price";
  price.textContent = `${formatCents(listing.priceCents)} 元`;

  const status = document.createElement("p");
  status.className = "market-card__status";
  status.textContent = statusLabels[listing.status];

  card.append(title, description, price, status);
  return card;
}
```

状态同时用文字和边框表达，不只靠颜色。组件接收已解析 Listing，不读取当前用户，也不根据 `ownerId` 自行授予编辑权限。

### 6.3 增加可键盘操作的主题切换

完整替换 `market-workspace/apps/lab-web/index.html`：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>邻里集市 Design Tokens</title>
  </head>
  <body>
    <main>
      <h1>邻里集市</h1>
      <p>本地静态教学数据，不代表真实库存或授权。</p>
      <div class="market-toolbar">
        <button
          id="theme-toggle"
          class="market-action"
          type="button"
          aria-pressed="false"
        >
          使用深色主题
        </button>
        <span id="theme-status" role="status" aria-live="polite">当前为浅色主题</span>
      </div>
      <div id="app"></div>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

完整替换 `market-workspace/apps/lab-web/src/main.ts`：

```ts
import { parseListing } from "@market/contracts";
import { createListingCard } from "@market/ui";
import "@market/ui/tokens.css";

const rawListings: unknown = [
  {
    id: "listing-1",
    title: "台灯",
    description: "本地静态教学数据，自提",
    priceCents: 1990,
    status: "available",
    ownerId: "user-1",
    version: 1,
    createdAt: "2026-10-11T08:00:00.000Z",
  },
  {
    id: "listing-2",
    title: "免费书籍",
    description: "本地静态教学数据，整套领取",
    priceCents: 0,
    status: "reserved",
    ownerId: "user-2",
    version: 1,
    createdAt: "2026-10-11T08:30:00.000Z",
  },
];

if (!Array.isArray(rawListings)) throw new TypeError("listings: expected array");
const listings = rawListings.map((value) => parseListing(value));

const app = document.querySelector<HTMLDivElement>("#app");
const toggle = document.querySelector<HTMLButtonElement>("#theme-toggle");
const themeStatus = document.querySelector<HTMLSpanElement>("#theme-status");
if (!app || !toggle || !themeStatus) throw new Error("missing page elements");

app.replaceChildren(...listings.map((listing) => createListingCard(listing)));

toggle.addEventListener("click", () => {
  const dark = document.documentElement.dataset.marketTheme !== "dark";
  document.documentElement.dataset.marketTheme = dark ? "dark" : "light";
  toggle.setAttribute("aria-pressed", String(dark));
  toggle.textContent = dark ? "使用浅色主题" : "使用深色主题";
  themeStatus.textContent = dark ? "当前为深色主题" : "当前为浅色主题";
});
```

### 6.4 运行与可观察结果

```bash
pnpm typecheck:all
pnpm build
pnpm --filter @market/lab-web dev
```

打开 `http://127.0.0.1:5173/`：

1. 页面显示台灯 `19.90 元`、免费书籍 `0.00 元`。
2. 状态文字分别为“可购买”和“已预约”。
3. 用 `Tab` 聚焦按钮，能看到清晰轮廓。
4. 按 `Enter` 或空格切换主题，按钮文本、`aria-pressed` 和状态文字同步变化。
5. 刷新会回到浅色主题，因为本课没有声明持久化；不要把临时 DOM 状态描述成用户偏好已保存。

关闭服务用 `Ctrl+C`。生产构建成功只证明 CSS/TS 可处理，接下来仍要做浏览器视觉检查。

## 7. 邻里集市集成案例

### 7.1 浏览器对比度证据

在 Chromium DevTools 中选择浅色卡片正文、弱化说明和主要按钮，查看 Computed 样式与颜色选择器的 contrast 信息。分别记录前景、实际背景和比值，再切换深色主题重复。

最低记录表：

| 状态 | 元素 | 浏览器前景/背景 | 观察比值 | 结论 |
| --- | --- | --- | ---: | --- |
| 浅色 | 卡片正文 | `#172126` / `#ffffff` | `16.38:1` | 普通文本通过 |
| 浅色 | 主要按钮 | `#ffffff` / `#075e54` | `7.67:1` | 普通文本通过 |
| 深色 | 卡片正文 | `#f3f6f7` / `#182124` | `15.08:1` | 普通文本通过 |
| 深色 | 主要按钮 | `#07231e` / `#55d6be` | `9.26:1` | 普通文本通过 |

若 DevTools 显示值与表不同，以实际计算样式为证据，检查是否有扩展、级联或透明度覆盖。不能为了让文档数值一致而忽略浏览器结果。

### 7.2 Forced-colors 模拟

打开 DevTools 的 Rendering 面板，找到 “Emulate CSS media feature forced-colors”，选择 `active`。重新检查：

- 页面与卡片使用 Canvas/CanvasText。
- 主要按钮文字、边框和背景仍可区分。
- 状态文字和边框仍存在，不靠绿色/灰色判断。
- `Tab` 到按钮时焦点轮廓可见。
- `19.90` 与 `0.00` 文本没有消失。

保存浏览器版本、模拟设置和观察结果。Chromium 模拟只能提供实现证据，仍不能冒充真实 Windows 高对比度、屏幕阅读器或其他浏览器验收。

### 7.3 React 完整卡片文件

以下文件用于已经存在的 React 课程应用，不加入 `apps/lab-web`，也不让 React 接管 DOM 工厂节点。

完整文件 `apps/react-web/src/components/ListingCard.tsx`：

```tsx
import { formatCents } from "@market/contracts";
import type { Listing } from "@market/contracts";

const statusLabels = {
  available: "可购买",
  reserved: "已预约",
  sold: "已售出",
} as const;

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <article className="market-card" data-listing-id={listing.id}>
      <h2>{listing.title}</h2>
      <p className="market-card__description">{listing.description}</p>
      <p className="market-card__price">{formatCents(listing.priceCents)} 元</p>
      <p className="market-card__status">{statusLabels[listing.status]}</p>
    </article>
  );
}
```

React 拥有 JSX 节点。若未来加入收藏状态，使用应用现有 state/query 层，不把 Hook 放进 `@market/contracts` 或 CSS token 包。

### 7.4 Vue 完整卡片文件

完整文件 `apps/vue-web/src/components/ListingCard.vue`：

```vue
<script setup lang="ts">
import { formatCents } from "@market/contracts";
import type { Listing } from "@market/contracts";

const { listing } = defineProps<{ listing: Listing }>();

const statusLabels = {
  available: "可购买",
  reserved: "已预约",
  sold: "已售出",
} as const;
</script>

<template>
  <article class="market-card" :data-listing-id="listing.id">
    <h2>{{ listing.title }}</h2>
    <p class="market-card__description">{{ listing.description }}</p>
    <p class="market-card__price">{{ formatCents(listing.priceCents) }} 元</p>
    <p class="market-card__status">{{ statusLabels[listing.status] }}</p>
  </article>
</template>
```

Vue 拥有 template 节点。若加入响应式收藏状态，使用 Vue 的 ref/composable 和生命周期，不调用 React Hook，也不把 Vue ref 传进 contracts。

### 7.5 等价范围清单

| 业务能力 | React | Vue | 共享层 |
| --- | --- | --- | --- |
| Listing 输入 | typed prop | typed prop | `@market/contracts` 类型和 parser |
| 金额显示 | `formatCents` | `formatCents` | 非负安全整数分规则 |
| 状态文字 | 三状态完整映射 | 三状态完整映射 | 可共享稳定领域词汇，不共享框架节点 |
| 视觉 class | `className` | `class` | `@market/ui/tokens.css` |
| DOM 所有权 | React renderer | Vue renderer | 不共享 DOM 工厂节点 |
| 本地状态 | Hook/应用状态层 | ref/composable/应用状态层 | 不进入 contracts/token |
| 授权 | 只决定提示和入口 | 只决定提示和入口 | 后端按可信会话执行 |

将两个完整文件放入各自已存在的课程工程后，使用各工程已经验证的类型、测试和构建命令。若当前没有这两个工程，只能把代码记为教材边界示例，不能声称 React/Vue 构建通过。

### 7.6 为什么不导出一个“跨框架 ListingCard”

共享 DOM 工厂会迫使 React/Vue 把外部节点当黑盒，框架无法自然处理更新和清理。Web Component 可以作为另一种明确架构，但它有属性序列化、事件、表单、SSR 和样式边界成本；本课没有真实需求，不额外引入。

这里共享的是业务语义与视觉原语，组件分别实现。这让两端能够用各自生态做可访问性、测试和生命周期管理，同时保持验收范围一致。

## 8. 常见错误与排查路径

### 8.1 错误一：颜色能编译，但文字不可读

临时把浅色主题改为：

```css
:root {
  --market-color-surface: #888888;
  --market-color-text: #777777;
}
```

- **现象**：`pnpm typecheck:all` 和 `pnpm build` 仍退出 0，但卡片正文几乎融入背景。
- **证据**：浏览器最终计算色为 `#777777` / `#888888`，对比度约 `1.26:1`，低于普通文本 `4.5:1`。
- **原因**：构建器验证语法和模块，不评价视觉可读性；token 值违反使用场景。
- **修复**：恢复经过计算的语义色对，不在单个组件追加互相冲突的局部颜色补丁。
- **复验**：重新构建后，在浏览器浅/深主题各检查实际前景背景；正文比值恢复为 `16.38:1` 与 `15.08:1`，键盘焦点仍可见。

这份记录必须包含浏览器证据。只写“修复后 build 通过”不算复验。

### 8.2 错误二：用颜色作为唯一状态

- **现象**：普通主题看似有绿/灰状态，forced colors 下两者无法区分。
- **证据**：DOM 中没有“可购买/已预约”文字，只有背景色 class。
- **原因**：状态语义被编码为视觉值，用户颜色替换后信息丢失。
- **修复**：保留明确文本、边框或图标与可访问名称；颜色只作增强。
- **复验**：强制颜色下隐藏自定义色后，状态含义仍可读。

### 8.3 错误三：关闭 forced colors

- **现象**：品牌色保留，但用户选定的高对比度方案无法作用于组件。
- **证据**：组件使用 `forced-color-adjust: none`，焦点或文字在实际方案中不可见。
- **原因**：为视觉一致性覆盖用户偏好。
- **修复**：恢复默认自动调整，使用系统颜色和结构性边界。
- **复验**：模拟和真实目标环境中检查文字、按钮、焦点与状态。

### 8.4 错误四：React/Vue 同时管理 DOM 工厂节点

- **现象**：更新后内容回退、事件重复、卸载后监听仍存在。
- **证据**：框架组件在 effect/mounted 中 append DOM 工厂节点，又由框架模板更新同一子树。
- **原因**：节点所有权和清理责任不唯一。
- **修复**：分别用 JSX/template 实现组件，只共享 contracts、纯函数和 tokens。
- **复验**：重复更新与卸载后，页面内容和监听数量稳定，各框架测试独立通过。

### 8.5 排查顺序

| 现象 | 首要证据 | 可能责任层 |
| --- | --- | --- |
| 变量未生效 | Computed、级联来源、选择器 | token 导入或 CSS 作用域 |
| 深色某处仍浅色 | 最终背景、局部硬编码 | 应用/组件局部样式 |
| 构建绿但不可读 | 浏览器对比度 | token 值与组合 |
| forced colors 信息消失 | 模拟/真实系统颜色 | 只靠背景或关闭调色 |
| 键盘无焦点 | Tab 路径、`:focus-visible` | 交互样式 |
| React/Vue 输出不同 | 相同 fixture 的可见字段 | 框架组件业务范围 |
| 按钮隐藏却仍可越权调用 | Network 和服务端响应 | 后端授权，不是 token |

## 9. 课后题

**1. 为什么 `--green-700` 不一定适合作为组件公共 API？**

参考答案：它描述色阶位置，不描述使用语义。主题变化或品牌调整后，“按钮背景”仍是稳定概念，而某个绿色编号可能不再适合该用途。

**2. token 对比度达标，是否证明整个卡片无障碍？**

参考答案：不能。还要检查焦点、状态表达、字号、放大、阅读顺序、键盘、强制颜色和辅助技术名称。

**3. 为什么 React 与 Vue 不直接共享 DOM 工厂？**

参考答案：两个框架需要拥有渲染节点和生命周期。共享外部节点会造成更新、事件和清理责任冲突。

**4. forced-colors 模拟通过后还剩什么风险？**

参考答案：真实 Windows 主题、不同浏览器、缩放、屏幕阅读器和用户自定义组合尚未验证，模拟不能替代目标环境。

**5. 前端根据 `ownerId` 隐藏编辑按钮是否完成授权？**

参考答案：没有。隐藏按钮只改善体验，后端必须基于可信会话和当前对象再次检查所有权或角色。

## 10. 实践练习

### 基础：增加危险操作 token

增加 `--market-color-danger-bg` 与 `--market-color-danger-text`，为一个纯教学“移除筛选”按钮使用。不要改变后端数据。

验收标准：

- 名称表达用途，不叫 `red-1`。
- 浅/深主题普通文本对比均至少 `4.5:1`。
- forced colors 使用 ButtonFace/ButtonText 或由原生按钮自动调整。
- 键盘焦点仍由统一 focus token 表达。

### 进阶：为 React/Vue 建立等价 fixture

用同一两个已解析 Listing fixture 渲染 React 和 Vue 卡片，分别断言：

- 台灯显示 `19.90 元` 和“可购买”。
- 免费书籍显示 `0.00 元` 和“已预约”。
- 标题、描述、金额、状态四类信息都存在。
- 测试不共享框架渲染器，只共享 fixture 和业务预期。

如果对应框架工程尚未建立，把此项标为未运行，不写成通过。

### 故障注入：破坏 forced-colors 可识别性

临时删除状态文字，只保留不同背景色，再启用 forced colors。

确定性验收：

1. 记录普通主题与强制颜色下的差异。
2. 说明颜色被替换后为何无法判断状态。
3. 恢复文字和边框，不通过禁用 forced colors 修复。
4. 用键盘重新检查按钮焦点。
5. 写出完整“现象、证据、原因、修复、复验”记录。

## 11. 阶段验收

### 自动检查

```bash
cd market-workspace
pnpm graph:check
pnpm typecheck
pnpm typecheck:compat
pnpm typecheck:all
pnpm build
pnpm --filter @market/lab-web dev
```

### 浏览器检查

- [ ] 浅色和深色页面都显示 `19.90 元` 与 `0.00 元`。
- [ ] `Tab`、`Enter` 和空格可完成主题切换，焦点始终可见。
- [ ] 主题按钮的文本、`aria-pressed` 和 live status 一致。
- [ ] 浅色/深色正文、弱化文字和操作文字的最终色对符合记录。
- [ ] 对比度故障注入中 build 仍成功，但浏览器证据明确失败。
- [ ] forced-colors 模拟下文字、状态、边框、按钮和焦点均可识别。
- [ ] 未使用 `forced-color-adjust: none` 保留品牌色。

### 跨框架检查

- [ ] React 与 Vue 都从 `@market/contracts` 公共入口读取 Listing 和 `formatCents`。
- [ ] 两端展示相同字段、状态和整数分结果。
- [ ] React 使用 JSX 所有权，Vue 使用 template 所有权。
- [ ] Hook、ref、watch、effect、mounted 和路由状态均未进入 contracts/token 包。
- [ ] 若未实际运行两个框架工程，证据明确标为“教材文件已审查，框架构建未验证”。

通过本课不代表真实 Windows 高对比度、Firefox、WebKit、屏幕阅读器、生产主题持久化、认证、对象授权或预约事务已经通过。

## 12. 常见问题

**主题选择应该存 localStorage 吗？**

取决于产品隐私和同步策略。本课只验证当前页面状态，不引入持久化。若保存，应处理首屏闪烁、系统偏好、跨标签和用户清除数据。

**可以把所有间距都做成全局 token 吗？**

不必。只有跨消费者语义稳定、变化需协调的值值得共享。单页特殊布局留在应用更清楚。

**为什么不使用 CSS-in-JS 同时服务 React/Vue？**

工具选择不能消除框架运行时和生命周期差异。公共 CSS 自定义属性已经满足本课共享目标，无需增加依赖和服务端渲染复杂度。

**DOM 工厂是不是永远不能用于框架？**

可以把外部库封装在单一框架组件中，并明确节点所有权和清理；但本课简单卡片没有这个必要。不要让框架与工厂共同修改同一子树。

**系统颜色会破坏品牌一致性吗？**

强制颜色模式优先满足用户可读性。品牌一致性不能高于用户明确选择的辅助显示需求。

## 13. 扩展阅读

资料快照日期：**2026-10-11**。

- [MDN: Using CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties)：自定义属性、继承与 fallback。
- [MDN: `forced-colors`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/forced-colors)：强制颜色媒体特性。
- [MDN: `<system-color>`](https://developer.mozilla.org/en-US/docs/Web/CSS/system-color)：Canvas、ButtonFace 等系统颜色。
- [MDN: `forced-color-adjust`](https://developer.mozilla.org/en-US/docs/Web/CSS/forced-color-adjust)：默认调整与谨慎退出。
- [W3C WCAG 2.2: Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)：普通和大号文本对比要求。
- [React: Your UI as a Tree](https://react.dev/learn/understanding-your-ui-as-a-tree)：React 组件树和所有权。
- [Vue: Component Basics](https://vuejs.org/guide/essentials/component-basics.html)：Vue 组件输入与模板边界。

## 我现在能做到什么

我能把跨应用视觉决策写成语义 token，为浅色、深色和 forced colors 保留可读边界，并用浏览器最终样式而不是构建绿灯验收对比度；我也能让 React 与 Vue 消费同一领域契约和 CSS 原语，同时保留各自的节点、状态和生命周期所有权。

## 单元导航

[章节 hub](../04-workspace-component-library.md) · [上一课：Package Exports、运行时契约与发布](02-package-exports-contracts-publishing.md) · [下一课：用单元测试锁定领域边界](../05-unit-integration-e2e/01-vitest-unit-domain-boundaries.md) · [工程化卷目录](../README.md)
