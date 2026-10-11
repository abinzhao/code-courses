# Vite、TypeScript 与第一版集市

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 建立可复现的 Vue TypeScript 工程并渲染两条完整商品数据 |
| 可观察产出 | 工作区命令、`domain.ts`、`App.vue`、`main.ts`、`style.css` |
| 运行条件 | Node.js 24 LTS；可用的 pnpm；Chromium 或同级开发浏览器 |
| 建议时间 | 120 分钟 |
| 完成证据 | 实际版本、`vue-tsc`、生产构建、320px 页面和负向类型门禁 |

## 1. 任务背景

前两课分别验证了 SFC 编译和组件 API，现在要把它们放进真实工具链。Vite 开发服务器可以快速
显示页面，但它不会因为能转译 TypeScript 就自动完成严格类型检查。Vue 模板还需要
`vue-tsc` 读取 TypeScript 编译器 API。

本书版本快照采用 Vue 3.5.43、Vite 8、Node.js 24 LTS；TypeScript 7 是语言主线，但当前
Vue 工具仍通过 TS6 兼容 API 验证。安装命令必须记录实际解析版本，不能把历史输出或版本范围
当成本机事实。

## 2. 学习目标

完成后你应能：

1. 创建 `neighborhood-market/apps/vue-web`，不把教材仓库当应用目录；
2. 区分 Vite 转译、`vue-tsc` 类型检查和生产构建；
3. 记录 Node、pnpm、Vue、Vite、vue-tsc 与 TypeScript 的实际版本；
4. 定义完整 `Listing`、分页与预约类型；
5. 遵守整数分和 UTC ISO 8601 领域契约；
6. 用负向类型实验证明 SFC 模板确实进入检查；
7. 在窄屏和键盘路径下验收静态商品页。

## 3. 预备知识

先完成[SFC 编译](01-sfc-template-compiler.md)与
[组件身份](02-props-slots-list-identity.md)。本机应有 Node 24；先记录而不是伪造：

```bash
node --version
corepack --version
```

若 Node 不是 24，切换到受支持的 Node 24 补丁后再创建工程。若 pnpm 命令损坏，先修复
Corepack 或按 pnpm 官方方式启用指定版本，不通过全局随机升级掩盖问题。

## 4. 核心理论

### 4.1 三道不同门禁

| 门禁 | 主要输入 | 能证明什么 | 不能证明什么 |
| --- | --- | --- | --- |
| Vite dev | 模块图、SFC、静态资源 | 当前开发路径能加载和热更新 | 严格模板类型、生产产物 |
| `vue-tsc -b` | TS project references、`.ts`、`.vue` | 声明与模板类型符合当前工具组合 | 浏览器交互与布局 |
| `vite build` | 生产模块图与资源 | 生产构建能够生成产物 | 真实 API、安全、部署成功 |

三者都要运行。删除 `vue-tsc` 只会让错误失去门禁，不会修复错误。

### 4.2 TS7 语言线与 TS6 工具线

当前版本基线记录：TS7 原生编译器没有旧式编译器 API，而 Vue 语言工具需要该 API。
因此应用依赖名仍是 `typescript`，实际指向 `@typescript/typescript6` 兼容包；
`vue-tsc` 读取这个依赖。可另装 `@typescript/native` 研究 TS7，但不能让 TS7 的成功替代
SFC 门禁。

包装包版本和内部编译器输出可能不同。必须同时记录：

```bash
pnpm list typescript vue-tsc --depth 0
pnpm exec tsc6 --version
pnpm exec vue-tsc --version
```

### 4.3 类型契约和运行时事实

`Listing` 为源码和已适配数据提供编译期约束。它不检查 HTTP JSON，也不执行后端授权。
本课只有源码种子，因此可以直接使用类型；第 3 章开始接入 API 时，要显式写出运行时验证缺口。

金额存储和传输都使用整数分。`3500` 表示 35 元；`35` 只表示 0.35 元。持久化时间使用 UTC
ISO 8601，例如 `2026-10-01T08:00:00.000Z`，本地格式只在渲染时生成。

### 4.4 工作区不等于教材目录

教程中的路径都相对于读者自己的 `neighborhood-market/`。教材仓库只保存 Markdown，
不保存依赖、锁文件、构建产物或练习应用。真实项目应提交应用的 package manifest 和锁文件；
本教材验证则在全新 `/tmp` 工程重建。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 本课约束 |
| --- | --- | --- |
| `pnpm create vite` | 创建官方 Vue TS 起点 | 创建后检查实际模板内容 |
| `@vitejs/plugin-vue` | 编译 SFC | 版本需与 Vite/Vue 实测兼容 |
| `vue-tsc -b` | 检查 project references 和 SFC | `typecheck` 必须直接调用 |
| `strict` | 启用严格类型语义 | 不为通过示例而关闭 |
| `moduleResolution: "bundler"` | 匹配 Vite 浏览器模块解析 | Node 原生服务另选策略 |
| `allowImportingTsExtensions` | 允许仅类型/打包路径中的 `.ts` 导入 | 需配 `noEmit` |
| `Intl.NumberFormat` | 把整数分格式化为本地货币 | 不改变领域存储值 |
| `Intl.DateTimeFormat` | 本地化 UTC 时间 | SSR 需统一首屏格式策略 |
| `createApp(App)` | 建立客户端应用 | 每个入口只挂载一次 |
| `satisfies` | 校验映射完整性 | 保留值的精确类型 |

## 6. 最小可运行案例

### 6.1 创建工程并记录版本

**命令：在个人练习目录执行**

```bash
mkdir neighborhood-market
cd neighborhood-market
pnpm create vite@latest apps/vue-web --template vue-ts
cd apps/vue-web
pnpm install
pnpm add vue@3.5.43
pnpm add -D typescript@npm:@typescript/typescript6@~6.0.2
pnpm list vue vite @vitejs/plugin-vue vue-tsc typescript --depth 0
pnpm exec tsc6 --version
pnpm exec vue-tsc --version
```

若 `neighborhood-market` 已存在，只创建缺失应用，不重复覆盖。`latest` 只用于取得当日模板；
成功后锁文件和实际 `pnpm list` 才是该练习工程的复现证据。

在现有 `package.json` 中只调整 scripts，保留模板产生的依赖。

**关键片段：`apps/vue-web/package.json`**

```json
{
  "scripts": {
    "dev": "vite",
    "typecheck": "vue-tsc -b",
    "build": "pnpm typecheck && vite build",
    "preview": "vite preview"
  }
}
```

### 6.2 建立最小领域文件

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/domain.ts`**

```ts
export type ListingStatus = 'available' | 'reserved' | 'sold'

export type Listing = {
  id: string
  title: string
  description: string
  priceCents: number
  status: ListingStatus
  ownerId: string
  version: number
  createdAt: string
}

export type Page<T> = {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export type Reservation = {
  id: string
  listingId: string
  buyerId: string
  status: 'pending' | 'confirmed' | 'cancelled'
  createdAt: string
}

export function money(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new RangeError('priceCents 必须是非负安全整数')
  }
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(cents / 100)
}

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

先运行类型检查，再故意把 `desk-1.status` 改为 `'booking'`。预期 `pnpm typecheck` 失败并指向
联合类型；恢复 `'reserved'` 后重新运行应通过。这是负向门禁，不得通过增加非法联合成员修复。

## 7. 邻里集市集成案例

复用上一课的 `ListingCard.vue`，建立静态市场。

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/App.vue`**

```vue
<script setup lang="ts">
import ListingCard from './ListingCard.vue'
import { seed } from './domain'

function inspect(id: string) {
  console.info('教学验货意向，不创建预约', { id })
}
</script>

<template>
  <main>
    <h1>邻里集市</h1>
    <p>闲置物品，在社区里继续发挥价值。</p>
    <p><strong>静态教学数据，不创建真实预约或支付。</strong></p>
    <section aria-label="商品列表">
      <ListingCard
        v-for="item in seed"
        :key="item.id"
        :listing="item"
      >
        <template #actions="{ listing }">
          <button type="button" @click="inspect(listing.id)">
            记录验货意向
          </button>
        </template>
        <small>商品编号：{{ item.id }}</small>
      </ListingCard>
    </section>
  </main>
</template>
```

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/main.ts`**

```ts
import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')
```

**阶段替换文件（完成本课时覆盖）：`apps/vue-web/src/style.css`**

```css
:root {
  color: #183028;
  background: #f5f6f2;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}

body {
  margin: 0;
}

main {
  box-sizing: border-box;
  inline-size: min(100%, 52rem);
  margin-inline: auto;
  padding: 1.25rem;
}

button,
input,
textarea {
  font: inherit;
}

button {
  min-block-size: 2.75rem;
  padding-inline: 0.9rem;
}

:focus-visible {
  outline: 3px solid #17624b;
  outline-offset: 3px;
}
```

检查脚手架 `index.html` 中仍有 `<div id="app"></div>` 和 `/src/main.ts` 入口，并把
`<html lang="en">` 改为 `lang="zh-CN"`。

**命令：在 `apps/vue-web` 执行**

```bash
pnpm typecheck
pnpm build
pnpm dev --host 127.0.0.1
```

预期显示两张卡片、35 元与 80 元、可预约与已预约状态。点击按钮只在 Console 记录教学意向。

## 8. 常见错误与排查路径

**明确错误示例：单位错误。**

**关键片段：`apps/vue-web/src/domain.ts`**

```ts
priceCents: 35
```

它会合法地显示为 0.35 元，类型检查无法推断作者原本想写 35 元。单位契约需要测试、命名和
评审共同保证；修复为 `3500`，不能删除格式化中的 `/ 100`。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 开发页面可见，但 `pnpm typecheck` 报模板 prop 类型错误 |
| 证据 | `App.vue` 中写了 `listing="item"`，错误显示 `string` 不能赋给 `Readonly<Listing>` |
| 原因 | 缺少 `:`，传入的是静态字符串而不是表达式 |
| 修复 | 改为 `:listing="item"`，保持严格 prop 类型 |
| 复验 | `pnpm typecheck` 和 `pnpm build` 都退出 0，页面两张卡片仍正确 |

若 pnpm 本身报模块缺失，先记录 Node、Corepack 和 pnpm shim 路径。这属于工具环境，不应通过
修改 Vue 组件代码处理。

## 9. 课后题

1. Vite 页面能打开，为什么仍要运行 `vue-tsc`？
2. 为什么 `Listing` 类型不能证明 API 响应可信？
3. `3500` 分怎样变成 35 元，哪一个值应持久化？
4. 为什么 UTC 时间只在显示边界本地化？
5. `pnpm list` 与 `package.json` 版本范围哪个更能证明本次实际安装？

**参考答案：**

1. Vite 以转译和模块加载为主，模板严格类型需要独立门禁。
2. TypeScript 类型在运行时被擦除，未知 JSON 必须解析。
3. 展示时除以 100 并格式化；持久化仍为整数 `3500`。
4. 持久化保持统一瞬间，用户时区只影响显示。
5. 当前安装的 `pnpm list` 和锁文件；范围只声明允许解析区间。

## 10. 实践练习

### 基础：增加书架种子

增加 `published-bookcase`，标题“二手书架”，价格 `12000` 分，状态 `available`。

**答案标准：**完整提供七个字段；`createdAt` 带 `Z`；页面显示 120 元和第三张卡片。

### 进阶：统一时间格式函数

在 `domain.ts` 增加 `displayTime(utc: string)`，卡片调用它。

**参考答案方向：**用 `new Date(utc)` 配合 `Intl.DateTimeFormat`；源对象不改写。SSR 章节会
进一步约束服务端与客户端首屏时区一致性。

### 故障注入：证明模板进入类型检查

把卡片模板中的 `listing.priceCents` 改成 `listing.priceCent`。

**答案标准：**保存失败输出，确认错误定位到 `.vue` 模板；恢复字段后类型检查与构建都通过。

## 11. 阶段验收

- [ ] 保存 Node、pnpm 和五个前端依赖的实际版本输出。
- [ ] `Listing` 字段、状态联合、整数分与 UTC 规则完整。
- [ ] `pnpm typecheck` 和 `pnpm build` 均退出 0。
- [ ] 非法状态和错误模板字段都曾使类型门禁失败。
- [ ] 浏览器显示固定两条商品，Console 无挂载或 prop 警告。
- [ ] 320 CSS 像素下无页面级横向溢出，Tab 焦点可见。
- [ ] 页面明确标注静态教学数据和非真实预约边界。

## 12. 常见问题

**为什么不把完整 `package.json` 固定在本课？**

脚手架和工具补丁会变化。本课固定主线和命令，实际练习由锁文件保存解析结果，交付时报告真实版本。

**可以直接使用 TypeScript 7 替换兼容包吗？**

只有在 `vue-tsc` 与相关工具的官方支持和实际门禁都通过后才可切换，不能根据语言编译器单项成功推断。

**开发服务必须用 `--host 0.0.0.0` 吗？**

不必。本机教学默认绑定 `127.0.0.1`，避免无意暴露到局域网。

**为什么按钮仍然存在？**

它只记录可观察教学意图，并明确不创建预约。第 4 章接入后端接口后才讨论真实写操作。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [Vue：快速开始](https://vuejs.org/guide/quick-start.html)
- [Vue：TypeScript 与组合式 API](https://vuejs.org/guide/typescript/composition-api.html)
- [Vue：发布版本](https://vuejs.org/about/releases.html)
- [Vite：开始使用](https://vite.dev/guide/)
- [vue-tsc 项目](https://github.com/vuejs/language-tools)
- [TypeScript 7 发布说明](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)

本书版本判断详见[版本基线](../../00-guide/version-baseline.md)。实际解析版本必须在自己的
练习目录重新记录。

## 我现在能做到什么

我能从空目录建立 Vue TypeScript 工程，区分开发、类型与构建门禁，并把完整商品契约以整数分
和 UTC 时间渲染为可访问的静态市场。

## 单元导航

[上一课：Props、插槽与身份](02-props-slots-list-identity.md) ·
[返回章目录](../README.md#第一章sfc模板与商品组件) ·
[下一章：响应式、事件与表单](../02-reactivity-events-forms/01-ref-reactive-computed-updates.md)
