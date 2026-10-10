# JSX、渲染纯度与提交阶段

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课产出 | 一个能证明 JSX 文本会被转义、渲染不会改写输入的商品预览 |
| 建议时间 | 90 分钟 |
| 前置 | JavaScript 函数、对象、数组，HTML 基础 |
| 运行位置 | `neighborhood-market/apps/react-web` |
| 完成证据 | 页面显示原始危险文本而不创建图片；Strict Mode 下商品数不增长 |

本课只研究“数据怎样成为 React 元素并提交到 DOM”。数据来自本地常量，不代表数据库记录，也没有登录、授权或持久化能力。

## 1. 任务背景

邻里集市收到标题 `台灯 <img src=x onerror=alert(1)>`。页面需要把它当作居民输入的普通文本，而不是可执行标签；同一组件还可能因父级更新或 Strict Mode 检查被重复调用，所以渲染期间不能向全局数组追加商品。

数据流是：

```text
Listing 数据 -> 组件函数 -> React 元素树 -> commit -> DOM
```

React 可以重算元素树而不提交，也可以在开发 Strict Mode 中额外调用组件以暴露不纯逻辑。组件被调用不等于真实 DOM 已经改变。

## 2. 学习目标

- 说明 JSX 是 JavaScript 语法扩展，不是 HTML 字符串。
- 区分 React 元素、组件实例描述与浏览器 DOM 节点。
- 区分 render 与 commit，并保持渲染阶段纯净。
- 使用 JSX 表达式、属性和条件分支。
- 解释默认文本转义与 `dangerouslySetInnerHTML` 的信任边界。
- 用 Strict Mode 证据定位渲染期副作用。

## 3. 预备知识

先确认 Node 与项目工具：

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
node --version
pnpm list react react-dom vite --depth 0
pnpm typecheck
```

本书目标环境是 Node 24 LTS、React 19.3 与 Vite 8。命令输出才是当前项目实际版本；版本不同不能靠修改文档假装一致。若应用尚未创建，先完成本章第 3 课的脚手架步骤，再回到本课。

需要理解：

- 函数接收输入并返回值；
- `map` 从数组生成新数组；
- 对象展开不会自动深拷贝；
- 浏览器最终显示的是 DOM，不直接执行 TSX。

## 4. 核心理论

### 4.1 JSX 产生 React 元素

`<h2>{listing.title}</h2>` 经构建工具转换为 React JSX runtime 调用，得到普通的元素描述。它不是 `HTMLElement`，因此不能调用 `querySelector` 或 `focus`。React 在 commit 阶段才创建或更新 DOM。

组件名必须大写。`<listingCard />` 会被解释为未知原生标签；`<ListingCard />` 才会调用组件函数。

### 4.2 render 必须纯净

纯渲染满足三条规则：

1. 同样的 props、state、context 得到同样的 JSX；
2. 不改写渲染前已经存在的对象；
3. 不在渲染中请求、订阅、写存储或安排计时器。

同步金额格式化属于计算，可以直接在 render 中完成。用户提交属于事件；外部订阅属于 Effect。把两者都塞进 Effect 会增加一次无意义渲染并制造状态漂移。

### 4.3 render 与 commit

状态更新先触发 render。React 比较新旧元素树后才 commit 必要的 DOM 变化。浏览器绘制发生在 commit 之后。一次 render 可能被重试或放弃，因此“组件函数执行次数”不是“用户看见变化次数”。

Strict Mode 的开发检查会额外调用渲染逻辑，并执行 Effect 的 setup/cleanup 探针。它不会在生产环境保证固定调用次数；正确做法是消除副作用，而不是用 ref 跳过检查。

### 4.4 转义与危险 HTML

JSX 中的字符串插值默认转义 `<`、`>`、`&` 等字符。标题即使看起来像 `<img>`，也只会成为文本节点。`dangerouslySetInnerHTML` 会跳过这层保护，只能接收经过可信、上下文正确的消毒流程产生的 HTML。TypeScript 的 `string` 类型不表示“已消毒”。

## 5. 元素、属性、API 或配置清单

| API / 语法 | 本课用途 | 关键边界 |
| --- | --- | --- |
| JSX `{expression}` | 插入字符串、数值或元素 | 不能直接放 `if` 语句 |
| `className` | 写 DOM `class` | 不写 HTML 的 `class` 属性名 |
| `htmlFor` | 关联 label 与控件 | 对应控件 `id` 必须唯一 |
| Fragment `<>...</>` | 返回多个同级元素 | 不产生额外 DOM 容器 |
| `StrictMode` | 开发期纯度与清理探针 | 不是生产安全机制 |
| 条件三元表达式 | 在两个元素分支间选择 | 分支仍须返回可渲染值 |
| `&&` | 条件成立时显示 | 用 `count > 0`，避免渲染数字 `0` |
| `dangerouslySetInnerHTML` | 注入可信 HTML | 禁止直接使用居民输入 |
| `createRoot` | 建立浏览器根节点 | 容器缺失应明确失败 |

## 6. 最小可运行案例

先建立一个纯渲染预览。文件放在现有 Vite 应用中，再临时让 `App.tsx` 导出它。

**完整文件：`apps/react-web/src/examples/JsxPurityDemo.tsx`**

```tsx
type Preview = Readonly<{
  title: string
  priceCents: number
  available: boolean
}>

const preview: Preview = {
  title: '台灯 <img src=x onerror=alert(1)>',
  priceCents: 3500,
  available: true,
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(cents / 100)
}

export default function JsxPurityDemo() {
  const status = preview.available ? '可预约' : '暂不可预约'

  return (
    <main>
      <h1>商品预览</h1>
      <article>
        <h2>{preview.title}</h2>
        <p>{formatMoney(preview.priceCents)}</p>
        <p>{status}</p>
      </article>
    </main>
  )
}
```

**关键片段：`apps/react-web/src/App.tsx`**

```tsx
export { default } from './examples/JsxPurityDemo'
```

**命令：在 `neighborhood-market/apps/react-web` 执行**

```bash
pnpm typecheck
pnpm dev --host 127.0.0.1
```

打开终端给出的地址。预期标题原样显示尖括号文本，Elements 面板中没有该标题生成的 `img`；价格显示 `¥35.00`，状态显示“可预约”。停止服务使用 `Ctrl+C`。

渐进扩展：把 `available` 改为 `false`，页面只改变状态文本；把 `priceCents` 改为 `0`，页面显示零元。不要把 35 元写成 `35` 分。

## 7. 邻里集市集成案例

主项目使用领域对象而不是只含三个字段的预览：

**关键片段：`apps/react-web/src/domain.ts`**

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
```

台灯固定数据应使用 `priceCents: 3500` 和 `createdAt: '2026-10-01T08:00:00.000Z'`。金额存储和传输都使用整数分；时间持久化使用 UTC ISO 8601，仅显示时本地化。

在卡片 render 中可以格式化金额和日期，但不能改写 `listing.status`、`listing.version`，也不能根据当前用户隐藏按钮后就宣称完成授权。授权和预约唯一性属于后端职责。

本阶段的数据是静态演示数据。界面或教材说明必须保留“静态演示”边界，不能把它称为已从 API 读取。

## 8. 常见错误与排查路径

### 明确错误：渲染时写入模块数组

```tsx
const audit: string[] = []

function WrongCard({ title }: { title: string }) {
  audit.push(title)
  return <p>{title}，审计数：{audit.length}</p>
}
```

这段代码在每次 render 时改变外部状态。Strict Mode、父组件更新或并发重算都会让计数失真。

### 五段诊断记录

| 阶段 | 记录 |
| --- | --- |
| 现象 | 开发环境首次打开就出现重复审计项，点击无关按钮后数量继续增长 |
| 证据 | React DevTools 显示组件被重渲染；`audit.length` 大于真实用户操作数 |
| 原因 | `audit.push` 位于 render，组件函数不纯 |
| 修复 | 删除渲染期写入；真正的审计由明确的用户事件调用服务端接口 |
| 复验 | 重载并触发父级更新，商品数量和审计数据均不随 render 次数增长 |

其他常见错误：

- `count && <p>` 在零时显示 `0`：改成 `count > 0 && <p>`。
- 根容器 ID 不一致：对照 `index.html` 与 `main.tsx`，不要用非空断言掩盖。
- 用 `dangerouslySetInnerHTML` 显示描述：恢复普通插值并检查 Elements。

## 9. 课后题

1. JSX 为什么不是 HTML 字符串？
2. 为什么组件返回元素后不一定已经改变 DOM？
3. `new Date().toISOString()` 能否直接写在静态 Listing 的 render 中？
4. TypeScript 把字段标为 `string`，能否证明它可安全注入 HTML？

参考答案：

1. JSX 编译成创建 React 元素的 JavaScript 调用，元素是描述对象。
2. React 可能重算、比较或放弃一次 render，只有 commit 才更新 DOM。
3. 不应把当前时间作为无条件渲染输入，它会让相同输入得到不同输出并引发水合问题；创建时间应在创建事件或服务端产生。
4. 不能。类型只描述值的形状，不提供 HTML 消毒和运行时信任证明。

## 10. 实践练习

### 基础

为预览增加 `description`，使用普通 JSX 插值显示。完成标准：输入 `<strong>便宜</strong>` 时页面显示文本而非粗体标签。

### 进阶

增加 `formatUtc(iso)`，用 `Intl.DateTimeFormat('zh-CN')` 显示固定 UTC 时间。完成标准：源数据仍是以 `Z` 结尾的 ISO 字符串，只有界面文本本地化。

### 故障注入

临时加入本节 `audit.push` 错误并在 Strict Mode 中观察，再删除。完成标准：记录现象、证据、原因、修复、复验五项，最终刷新后无重复数据。

答案判定：

- 基础练习不得使用 `dangerouslySetInnerHTML`。
- 进阶练习不得把本地化文本回写 `createdAt`。
- 故障练习最终 `pnpm typecheck` 成功，Console 无自定义重复写入。

## 11. 阶段验收

- [ ] `pnpm typecheck` 退出码为 0。
- [ ] 危险标题以文本显示，Elements 中没有由标题产生的 `img`。
- [ ] 35 元的数据是 `3500` 分。
- [ ] 时间源值使用 UTC ISO 8601。
- [ ] 组件 render 不请求、不订阅、不改写外部对象。
- [ ] 能口头区分元素描述、render、commit 与 DOM。

失败证据包括：TSX 无法编译、标题生成真实标签、Strict Mode 下数据增长、根节点报错。修复后重新运行同一命令和浏览器步骤，不用关闭 Strict Mode 制造通过。

## 12. 常见问题

**开发中组件调用两次，是 React 的 bug 吗？**<br>
不一定。Strict Mode 会执行开发探针；先检查组件纯度，不依赖精确调用次数。

**金额格式化会不会太慢，应该放 Effect 吗？**<br>
不应该。同步派生值在 render 计算；有测量证据后再讨论缓存。

**默认转义是否等于应用没有 XSS？**<br>
不等于。URL、HTML 注入、第三方组件和服务端输出仍有各自边界；本课只证明普通文本插值会转义。

## 13. 扩展阅读

官方资料快照日期：**2026-10-10**。

- [React：Your UI as a Tree](https://react.dev/learn/understanding-your-ui-as-a-tree)
- [React：Keeping Components Pure](https://react.dev/learn/keeping-components-pure)
- [React：Render and Commit](https://react.dev/learn/render-and-commit)
- [React：StrictMode](https://react.dev/reference/react/StrictMode)
- [React DOM：Common components](https://react.dev/reference/react-dom/components/common)

## 我现在能做到什么

我能把不可信标题作为安全文本渲染，解释 React 元素到 DOM 的阶段，并用 Strict Mode 证据发现渲染期副作用。

## 单元导航

[返回章节入口](../01-jsx-components.md) · [下一课：组件、组合与列表身份](02-components-props-composition-list-identity.md)
