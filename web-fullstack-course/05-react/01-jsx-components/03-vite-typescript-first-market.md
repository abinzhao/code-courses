# 用 Vite 与 TypeScript 建立第一版邻里集市

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 可安装、可类型检查、可构建的 React 19.3 静态集市 |
| 建议时间 | 120 分钟 |
| 工作区 | `neighborhood-market/apps/react-web`，不在教材仓库创建应用 |
| 数据范围 | 两条静态 fixture，无请求、登录或持久化 |
| 完成证据 | `typecheck`、`build` 退出 0；浏览器显示两张卡片 |

本课固定“教材代码快照”，实际安装结果仍以 `pnpm list --depth 0` 和锁文件为准。不要为了让命令看起来一致而忽略安装错误或 engine 提示。

## 1. 任务背景

前两课分别验证了 JSX 纯度和组件身份，现在把它们放进一个真实 Vite React TypeScript 应用。工作区必须与教材目录分离：Markdown 保存源码说明，读者在个人练习目录创建应用；依赖、锁文件和构建产物不进入教材仓库。

第一版邻里集市只证明：

- React 根节点能挂载；
- 严格类型能覆盖领域对象与 TSX；
- 整数分和 UTC 时间按契约显示；
- 静态卡片在 320 CSS 像素宽度可阅读。

它不证明 API、Cookie、对象授权、数据库事务或预约唯一性。

## 2. 学习目标

- 从空目录创建 Vite React TypeScript 应用。
- 区分 Node、pnpm、React、Vite 与 TypeScript 的职责。
- 配置 TS6 兼容编译器命令，不把它冒称 TS7 最新主线。
- 开启严格类型检查并理解 Vite 转译不等于类型检查。
- 定义完整 `Listing`、分页与错误契约。
- 使用整数分、UTC ISO 8601 和固定 fixture。
- 完成开发、类型检查、生产构建与浏览器检查。

## 3. 预备知识

先记录环境：

**命令：在准备创建项目的父目录执行**

```bash
node --version
corepack --version
pnpm --version
```

课程基线是 Node 24 LTS。2026-10-11 本轮教材验证实际使用 Node `v24.19.0` 与 pnpm `12.11.2`。这不是要求读者伪造输出；本机不同应如实记录并核对 Vite engine。

创建目录：

**命令：在个人练习目录执行**

```bash
mkdir -p neighborhood-market/apps
cd neighborhood-market
pnpm create vite apps/react-web --template react-ts
cd apps/react-web
```

删除模板演示组件和图片前先确认没有其他代码引用。保留 `src/vite-env.d.ts`。

## 4. 核心理论

### 4.1 各工具只负责一层

| 工具 | 责任 | 不负责 |
| --- | --- | --- |
| Node | 运行 Vite、TypeScript 和脚本 | 不在浏览器渲染 React UI |
| pnpm | 解析并安装依赖、执行 scripts | 不替代锁文件验证 |
| Vite | 开发服务器、模块转换、生产构建 | 默认不会完整检查 TypeScript 类型 |
| TypeScript | 静态类型检查 | 不验证 HTTP JSON 运行时字段 |
| React | 根据状态描述 UI | 不提供数据库、路由服务器或授权 |

### 4.2 TS7 语言主线与 TS6 工具兼容线

版本基线记录 TS7 已正式发布，但部分生态工具仍依赖旧编译器 API。本应用使用 `@typescript/typescript6` 包装包提供 `tsc6`，执行严格项目检查；它是兼容选择，不是“最新 TypeScript”。

若并行安装 `@typescript/native`，分别运行 `tsc --version` 与 `tsc6 --version`。不要把两个命令指向同一个未知二进制后声称双线通过。

### 4.3 类型与运行时边界

`Listing` 能让源码漏字段时报错，却不能保证 `response.json()` 真有这些字段。外部 JSON 在第 3 章明确标记断言边界，生产应用应使用运行时解析器。

金额以整数分存储与传输；显示时除以 100。持久化时间使用 UTC ISO 8601；本地化只发生在显示层。

## 5. 元素、属性、API 或配置清单

| 配置 / API | 本课值或用途 | 边界 |
| --- | --- | --- |
| `react` / `react-dom` | `19.3.0` | 实际以安装结果为准 |
| `vite` | `8.3.4` | Vite 8 使用当前工具链，不等于全栈框架 |
| `@vitejs/plugin-react` | `6.1.2` | 负责 React 转换与 Fast Refresh |
| `typescript` alias | `@typescript/typescript6@6.0.2` | 提供兼容 API 与 `tsc6` |
| `strict` | `true` | 不替代运行时校验 |
| `jsx` | `react-jsx` | 使用自动 JSX runtime |
| `moduleResolution` | `Bundler` | 对应浏览器打包场景 |
| `createRoot` | 创建客户端根 | 容器缺失应抛出明确错误 |
| `StrictMode` | 开发探针 | 不提供授权或数据安全 |

## 6. 最小可运行案例

以下是本课静态应用的完整文件。`ListingCard.tsx` 使用上一课的完整版本。

**完整文件：`apps/react-web/package.json`**

```json
{
  "name": "react-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "packageManager": "pnpm@12.11.2",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc6 -b",
    "build": "pnpm typecheck && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/node": "26.6.5",
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "@vitejs/plugin-react": "6.1.2",
    "typescript": "npm:@typescript/typescript6@6.0.2",
    "vite": "8.3.4"
  }
}
```

**完整文件：`apps/react-web/tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

**完整文件：`apps/react-web/tsconfig.app.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": false,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"]
}
```

**完整文件：`apps/react-web/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

**完整文件：`apps/react-web/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

**完整文件：`apps/react-web/index.html`**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>邻里集市</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

保留 Vite 生成的客户端声明；严格模式会用它识别 CSS 等资源导入。

**完整文件：`apps/react-web/src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm install
pnpm list --depth 0
pnpm exec tsc6 --version
pnpm typecheck
pnpm build
pnpm dev --host 127.0.0.1
```

预期 `tsc6` 报告 6.0.x，类型检查和构建退出 0，开发服务器只绑定本机地址。

## 7. 邻里集市集成案例

定义领域与 fixture：

**完整文件：`apps/react-web/src/domain.ts`**

```ts
export type ListingStatus = 'available' | 'reserved' | 'sold'

export type Listing = Readonly<{
  id: string
  title: string
  description: string
  priceCents: number
  status: ListingStatus
  ownerId: string
  version: number
  createdAt: string
}>

export type Page<T> = Readonly<{
  items: T[]
  page: number
  pageSize: number
  total: number
}>

export type ApiErrorBody = Readonly<{
  code: string
  message: string
  requestId: string
  details?: unknown
}>

export const money = (cents: number) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(cents / 100)

export const seed: Listing[] = [
  {
    id: 'lamp-1',
    title: '九成新台灯',
    description: '暖光，功能正常，可在社区门口当面验货。',
    priceCents: 3500,
    status: 'available',
    ownerId: 'seller-1',
    version: 1,
    createdAt: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'desk-1',
    title: '折叠桌',
    description: '适合小阳台，桌面有一处轻微划痕。',
    priceCents: 8000,
    status: 'reserved',
    ownerId: 'seller-2',
    version: 1,
    createdAt: '2026-10-02T08:00:00.000Z',
  },
]
```

**完整文件：`apps/react-web/src/App.tsx`**

```tsx
import ListingCard from './ListingCard'
import { seed } from './domain'

export default function App() {
  return (
    <main>
      <header>
        <h1>邻里集市</h1>
        <p>静态教学数据：刷新不会改变，也尚未连接 API。</p>
      </header>
      <section aria-label="商品列表">
        {seed.map((listing) => (
          <ListingCard key={listing.id} listing={listing}>
            <p>商品编号：{listing.id}</p>
          </ListingCard>
        ))}
      </section>
    </main>
  )
}
```

**完整文件：`apps/react-web/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('缺少 #root 容器')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**完整文件：`apps/react-web/src/index.css`**

```css
:root {
  font-family: system-ui, sans-serif;
  color: #183028;
  background: #f5f6f2;
  line-height: 1.6;
}

body {
  margin: 0;
}

main {
  max-width: 52rem;
  margin: auto;
  padding: 1.5rem;
}

article {
  border-bottom: 1px solid #9baaa0;
  padding: 1rem 0;
}

input,
textarea,
button {
  box-sizing: border-box;
  max-width: 100%;
  padding: 0.5rem;
  font: inherit;
}

:focus-visible {
  outline: 3px solid #17624b;
  outline-offset: 3px;
}

[role="alert"] {
  color: #9b1d20;
}
```

预期页面显示台灯 35 元、折叠桌 80 元和对应状态。缩窄到 320 CSS 像素，不应产生页面级横向滚动。

## 8. 常见错误与排查路径

### 明确错误：只运行 Vite 构建就宣称类型通过

```bash
pnpm exec vite build
```

Vite 会转译 TypeScript，但不保证执行完整类型检查。正确构建脚本先执行 `tsc6 -b`。

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | 页面能构建，但把 `status` 写成 `"active"` 仍未在构建阶段阻塞 |
| 证据 | 直接 `vite build` 退出 0；`pnpm typecheck` 报 Listing 状态不兼容 |
| 原因 | 只执行了转译，没有执行 TypeScript 项目检查 |
| 修复 | `build` 固定为 `pnpm typecheck && vite build` |
| 复验 | 错误状态使 build 失败；恢复 `available` 后 typecheck 与 build 均通过 |

其他故障：

- `tsc` 找不到：本课兼容包提供的是 `tsc6`，检查 package 与 scripts。
- 页面空白且 Console 显示缺少 `#root`：核对 `index.html` 和 `main.tsx`。
- 35 元显示 0.35 元：输入应为 `3500` 分，不要修改格式化器掩盖单位错误。
- Node 22 仍能偶然运行：不等于满足教材 Node 24 基线，记录实际环境并切换后复验。

## 9. 课后题

1. 为什么 Vite 成功构建不能单独证明类型正确？
2. `tsc6` 为何不是“TypeScript 7 已验证”的证据？
3. `createdAt` 为什么不保存 `2026年10月1日`？
4. `Listing` 类型为什么不能替代 HTTP JSON 校验？

参考答案：

1. Vite 的职责是转换和打包，通常会擦除类型，不执行完整项目语义检查。
2. 它运行 TS6 兼容编译器；TS7 需使用自己的命令单独验证。
3. 本地化文本丢失统一时区和机器可解析语义；应存 UTC ISO 8601，显示时转换。
4. 类型在编译后消失，远端数据可缺字段或类型错误。

## 10. 实践练习

### 基础

加入 fixture“二手书架”，价格 `12000` 分、状态 `sold`、独立 ID 和 UTC 时间。完成标准：第三张卡片显示 120 元和“已售出”。

### 进阶

给 `money` 增加开发期断言：非安全整数时抛错，并为 `0`、`3500`、`100000000` 编写纯函数断言。完成标准：不接受小数分。

### 故障注入

把一项状态写成 `active`，分别运行 `vite build` 与 `pnpm build`，记录退出码，然后恢复。完成标准：能证明类型门禁确实执行，而不是删除错误或放宽类型。

答案判定：新增对象包含全部字段；金额仍为整数分；时间以 `Z` 结尾；最终 `pnpm typecheck && pnpm build` 退出 0。

## 11. 阶段验收

- [ ] Node、pnpm 与依赖版本来自真实命令输出。
- [ ] `pnpm exec tsc6 --version` 指向 TS6 兼容线。
- [ ] `strict` 与 `react-jsx` 已开启。
- [ ] `pnpm typecheck` 和 `pnpm build` 退出 0。
- [ ] 两个 fixture 字段完整、金额为整数分、时间为 UTC。
- [ ] 320px 视口无页面级横向溢出。
- [ ] 页面明确标识静态教学数据。
- [ ] 没有把本阶段描述成已登录、已持久化或已授权。

## 12. 常见问题

**为什么主线选择 Vite？**<br>
本书用 Vite 建立 SPA，再单独教学 SSR 与全栈框架边界；工具职责更清晰。

**能把所有依赖写成 `latest` 吗？**<br>
学习新项目可以先解析当前版本，但可复现证据必须记录实际版本并提交锁文件；教材快照不等于未来永久最新版。

**为什么教材仓库不保存这个 package.json？**<br>
应用源码由读者在练习工作区重建；教材仓库只保存 Markdown，避免依赖和构建产物污染文档项目。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**；本轮注册表解析日期：**2026-10-11**。

- [Vite：Getting Started](https://vite.dev/guide/)
- [Vite：Features - TypeScript](https://vite.dev/guide/features.html#typescript)
- [React：Installation](https://react.dev/learn/installation)
- [React：createRoot](https://react.dev/reference/react-dom/client/createRoot)
- [TypeScript：Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Node.js 发布状态](https://nodejs.org/en/about/previous-releases)

## 我现在能做到什么

我能在独立练习工作区创建 React 19.3/Vite 8 应用，用 TS6 兼容命令执行严格类型检查，并按整数分和 UTC 契约渲染第一版静态集市。

## 单元导航

[上一课：组件、组合与列表身份](02-components-props-composition-list-identity.md) · [返回章节入口](../01-jsx-components.md) · [下一章：事件、状态与表单](../02-events-state-forms.md)
