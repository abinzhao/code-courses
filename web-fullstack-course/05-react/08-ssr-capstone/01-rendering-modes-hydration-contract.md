# 渲染模式与水合契约：服务器首帧和客户端首帧必须相同

## 任务卡

- **任务**：比较 CSR/SSR/SSG/混合渲染，建立渐进 GET 与可复现水合不变量。
- **产出**：完整 `HydrationContract.tsx` 最小组件、模式决策表和四类 mismatch 记录。
- **运行**：React 19.3、`renderToString`、`hydrateRoot`、Chromium 禁用/启用 JavaScript。
- **完成证据**：原始 HTML 有公开商品，GET 搜索无 JS 可用，水合计数 0→1 且无恢复日志。
- **边界**：内容提前出现不代表交互已水合；SSR 也不保证接口更快或数据永远新鲜。

## 1. 任务背景

SSR 服务器生成 HTML，浏览器先解析展示，再由 React 在同一 DOM 上建立事件和状态关系。
若服务器初始输出与客户端第一次 render 不同，React 可能报告 mismatch、丢弃部分 DOM 或
重建子树。问题不是“警告难看”，而是用户看到跳变、焦点丢失和事件对应风险。

本课先固定同一 `InitialData`，再讨论什么时候值得 SSR。

## 2. 学习目标

完成后你能：

1. 按内容时效、交互和运维成本选择渲染模式；
2. 区分服务器 render、浏览器解析和 hydration；
3. 设计无 JavaScript 可用的 GET 搜索；
4. 诊断随机数、时区、浏览器全局和非法 HTML mismatch；
5. 分开测量内容可见与交互可用时间。

## 3. 预备知识

需要理解纯 render、序列化和 HTTP 状态。公开 Listing 可以进入初始 HTML；cookie、CSRF、
密码、私有用户和服务器密钥不能。预约状态即使预渲染显示 available，提交时仍需后端重新
确认，可能返回 409。

## 4. 核心理论

### 4.1 四种模式没有统一胜者

| 模式 | HTML 生成时机 | 优点 | 主要成本 |
| --- | --- | --- | --- |
| CSR | JS 下载执行后 | 部署简单、交互模型统一 | 首次内容依赖 JS/请求 |
| SSR | 每个请求 | 原始 HTML 有当前内容 | 服务器 CPU、数据等待、隔离 |
| SSG | 构建时 | CDN 分发便宜 | 数据变化需重建/再验证 |
| 混合 | 按页面/区域 | 对不同内容选策略 | 缓存与心智模型更复杂 |

内部管理页不需要搜索收录且首屏交互强时，CSR 可能更合理。公开商品列表可 SSR，但用户面板
可水合后请求私有数据。

### 4.2 hydration 不是重新插入 HTML

`hydrateRoot` 复用服务器 DOM 并绑定 React 树。服务端和客户端初始 props、状态、结构与
可确定文本必须一致。水合后 Effect 才能读取 localStorage 或本地化显示。

### 4.3 渐进增强保留基本任务

`<form action="/" method="get">` 在无 JS 时由浏览器导航，服务器按 q 返回新 HTML。JS 可在
水合后增强为客户端导航，但不能破坏基础搜索。

### 4.4 内容时间与交互时间分开

raw HTML 有商品只证明内容可见；计数按钮从 0 到 1 才证明事件已水合。两项都要记录，不能
用“页面看到了”替代交互验证。

## 5. 元素、属性、API 或配置清单

| API / 机制 | 用途 | 边界 |
| --- | --- | --- |
| `renderToString` | 同步生成 HTML 字符串 | 不等待挂起数据 |
| `hydrateRoot` | 在现有 DOM 上建立交互 | 初始树必须一致 |
| `onRecoverableError` | 记录水合恢复 | 不应当作忽略 mismatch |
| GET form | 无 JS 搜索 | 只适合读取操作 |
| `defaultValue` | 使用服务端 q 初始值 | 水合前不可随机变化 |
| `useEffect` | 水合后客户端增强 | 不进入服务器 render |
| `suppressHydrationWarning` | 极窄不可避免文本 | 不是通用修复 |
| `noscript` | 补充 JS 缺失说明 | 不替代可用 HTML |

## 6. 最小可运行案例

**完整文件：`apps/react-web/ssr-lab/src/HydrationContract.tsx`**

```tsx
import { useState } from "react";

export type PublicListing = Readonly<{
  id: string;
  title: string;
  priceCents: number;
}>;

export type InitialData = Readonly<{
  q: string;
  items: readonly PublicListing[];
  error: string;
}>;

function money(cents: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(cents / 100);
}

export default function HydrationContract(props: { initial: InitialData }) {
  const [count, setCount] = useState(0);
  return (
    <main>
      <h1>邻里集市 SSR</h1>
      <form action="/" method="get">
        <label>
          搜索标题
          <input name="q" defaultValue={props.initial.q} />
        </label>
        <button type="submit">筛选</button>
      </form>
      {props.initial.error ? (
        <section role="alert">
          <p>{props.initial.error}</p>
          <a href="/">重新加载列表</a>
        </section>
      ) : props.initial.items.length === 0 ? (
        <p>没有匹配商品。</p>
      ) : (
        props.initial.items.map((item) => (
          <article key={item.id}>
            <h2>{item.title}</h2>
            <p>{money(item.priceCents)}</p>
          </article>
        ))
      )}
      <button type="button" onClick={() => setCount((value) => value + 1)}>
        水合检查：{count}
      </button>
    </main>
  );
}
```

服务器和客户端都接收同一 `initial`。最小 raw HTML 应含“九成新台灯”和“水合检查：0”；
水合后点击变成 1。渐进扩展：禁用 JavaScript 提交 q，服务器仍返回筛选 HTML。

## 7. 邻里集市集成案例

服务器请求流程：

```text
URL /?q=台灯
  → 解析并规范 q
  → 可信数据源读取公开列表
  → 构造 InitialData
  → renderToString(<App initial={initial} />)
  → 安全序列化同一个 initial
  → 浏览器 JSON.parse
  → hydrateRoot(<App initial={initial} />)
```

**关键片段：`apps/react-web/ssr-lab/src/entry-client.tsx`**

```tsx
const root = document.getElementById("root");
const data = document.getElementById("initial-data");
if (!root || !data?.textContent) throw new Error("缺少 SSR 快照");
const initial = JSON.parse(data.textContent) as InitialData;

hydrateRoot(root, <HydrationContract initial={initial} />, {
  onRecoverableError(error) {
    console.error("hydration-recovery", error);
  },
});
```

类型断言只描述本服务器生成的快照。若 JSON 来自外部 API，服务器进入 render 前仍需运行时
解析。第 2 课处理安全序列化和请求隔离。

## 8. 常见错误与排查路径

**明确错误示例：**

以下四个故障分别破坏水合契约。

```tsx
<p>{Math.random()}</p>
<p>{new Date().toLocaleString()}</p>
<p>{localStorage.getItem("theme")}</p>
<p><div>非法嵌套</div></p>
```

| 项目 | 记录 |
| --- | --- |
| 现象 | Console 出现 hydration mismatch，局部 DOM 被重建 |
| 证据 | 服务端/客户端随机值或时区文本不同；DOM parser 修正非法结构 |
| 原因 | 首次 render 输入不确定，或浏览器解析后的 DOM 与 React 树不同 |
| 修复 | 随机值进入快照；首帧用确定 UTC；localStorage 移到 Effect；修正 HTML |
| 复验 | raw HTML 与首个客户端 render 一致，Console 无 hydration-recovery |

不要批量加 `suppressHydrationWarning`。它只隐藏极窄文本警告，不修结构、数据或事件风险。

## 9. 课后题

1. SSR 是否意味着浏览器不下载 JavaScript？
2. 为什么 SSG 的 available 仍可能在预约时得到 409？
3. raw HTML 有按钮是否证明按钮可交互？
4. localStorage 主题为什么不能直接进入服务器 render？

答案：

1. 否，需要交互时仍下载客户端代码并水合。
2. 构建后的快照会过期，后端必须实时裁决预约。
3. 不能；需要水合点击证据。
4. 服务器无该 API，且两端首帧可能不同。

## 10. 实践练习

**基础**：禁用 JavaScript，用 GET form 搜索台灯。验收：200 且 raw HTML 只含匹配项。

**进阶**：水合后在 Effect 本地化 UTC 时间。验收：首帧先显示确定 UTC，不产生 mismatch。

**故障注入**：依次加入随机数、localStorage、非法嵌套，保存每次 Console 证据；逐项修复后
0→1 且无 recoverable error。

## 11. 阶段验收

- [ ] 渲染模式选择包含业务和运维成本。
- [ ] 服务器与客户端共享同一 InitialData。
- [ ] raw HTML 含公开商品和计数 0。
- [ ] 无 JS GET 搜索可完成。
- [ ] 水合点击 0→1。
- [ ] 随机、时区、浏览器全局、非法 HTML 故障均可解释。
- [ ] Console 无 hydration-recovery。
- [ ] 私有会话数据不在 InitialData。
- [ ] 内容可见与交互可用分别记录。

## 12. 常见问题

**SSR 一定改善性能吗？**

不一定。串行上游会恶化 TTFB，仍需真实条件测量。

**可以让客户端先重新 fetch 再 hydrate 吗？**

不应。数据可能变化并导致首帧不一致；先用快照水合，后续再重验证。

**所有页面都应 SSR 吗？**

不应。按公开性、首次内容、交互与运维成本选择。

## 13. 扩展阅读

资料快照：2026-10-11。

- [React：renderToString](https://react.dev/reference/react-dom/server/renderToString)
- [React：hydrateRoot](https://react.dev/reference/react-dom/client/hydrateRoot)
- [React：suppressHydrationWarning](https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors)
- [Vite：SSR Guide](https://vite.dev/guide/ssr)
- [MDN：Progressive enhancement](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement)

兼容边界：本课验证开发 SSR 原理，不含生产双构建、CDN、真实上游或负载。浏览器本地化
和无 JavaScript 行为仍需在目标浏览器分别复测。

## 我现在能做到什么

我能根据页面目标选择渲染模式，固定服务器与客户端首帧输入，并用原始 HTML、无 JS 搜索和
0→1 交互分别证明内容与水合。

## 单元导航

- 上一单元：[第 08 章入口](../08-ssr-capstone.md)
- 下一单元：[Vite SSR、序列化与请求隔离](./02-vite-ssr-serialization-isolation.md)
