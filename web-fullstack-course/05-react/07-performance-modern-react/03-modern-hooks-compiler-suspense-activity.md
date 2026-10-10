# 现代 Hooks、Compiler、Suspense 与 Activity：新能力也有生命周期边界

## 任务卡

- **任务**：完成 Hook 地图，验证 `use`/Suspense、ref prop、Effect Event、lazy、Compiler、Activity。
- **产出**：完整 `ModernBoundaryLab.tsx`、Compiler 配置片段和逐项运行记录。
- **运行**：React 19.3、Vite 8、plugin-react 当前兼容配置、Chromium。
- **完成证据**：稳定资源只挂起一次，ref 聚焦可用，Activity 保留 state 且重建 Effect。
- **边界**：Compiler 转换标记不等于性能提升；普通 Vite 不提供 RSC/Server Function。

## 1. 任务背景

现代 React API 解决不同问题：`use` 读取可挂起资源，Effect Event 在 Effect 中读取最新非响应
值，Activity 隐藏子树时保留 state 并清理 Effect，Compiler 在构建时插入 memo 化。把它们
合成“React 19 自动变快”会掩盖各自前提。

本课用隔离实验逐项观察，并在结束后恢复主项目入口。

## 2. 学习目标

完成后你能：

1. 从完整 Hook 地图选择正确 API；
2. 为 `use` 提供稳定 Promise 与 Suspense/error 边界；
3. 用 React 19 ref prop 暴露窄命令句柄；
4. 用 Effect Event 读取最新非响应逻辑而不隐藏真实依赖；
5. 用构建产物和生命周期证据验证 Compiler/Activity。

## 3. 预备知识

先理解纯 render、Effect cleanup、错误边界和性能测量。实验文件不进入主路由；临时替换入口
时保留原文件备份位置，完成后恢复并重新 typecheck/build。

安装 Compiler 前先执行 `pnpm list @vitejs/plugin-react --depth 0`，根据实际主版本使用官方
对应配置，不叠加历史 Babel 写法。

## 4. 核心理论

### 4.1 `use` 读取资源，不等于普通 Effect fetch

`use(promise)` 会把 pending 交给 Suspense，把 reject 交给错误边界。Promise 必须来自稳定
缓存、框架或模块；在 render 中每次 `fetch()` 会不断创建资源并重复挂起。

### 4.2 ref prop 是逃生口

React 19 函数组件可接收 ref prop。`useImperativeHandle` 只暴露 `focus()` 等窄命令，不把
整个 DOM 或内部 state 变成命令式公共 API。

### 4.3 Effect Event 不是依赖隐藏器

事件源/roomId 决定是否重新订阅，必须是 Effect 依赖；主题文案只需在回调发生时读取最新值，
可进入 Effect Event。它不作为普通 click handler，也不从子组件跨层调用。

### 4.4 Activity 保留 state，不保留活跃 Effect

hidden 子树保留输入草稿，但 Effect cleanup；visible 后重新 setup。这与 CSS display:none
不同，也与卸载不同。外部视频、WebSocket 等仍需正确 cleanup。

### 4.5 Compiler 是构建转换

Compiler 依赖纯 render、不可变输入和 Hooks 规则。产物标记只能证明转换发生，性能收益仍需
Profiler。同样，Compiler 不能修请求竞态或授权错误。

## 5. 元素、属性、API 或配置清单

| Hook / API | 负责什么 | 本书位置或边界 |
| --- | --- | --- |
| `useState` | 局部可见状态 | setter 不改当前快照 |
| `useReducer` | 纯状态转移 | 第 05 章；无副作用 |
| `useContext` | 订阅祖先依赖 | 不是持久化 |
| `useRef` | DOM/非显示可变值 | 改变不渲染 |
| `useEffect` | 外部同步与 cleanup | 不做派生计算 |
| `useLayoutEffect` | 绘制前测量 | 阻塞绘制，SSR 无 DOM |
| `useInsertionEffect` | CSS 库注入 | 非业务请求 |
| `useMemo` | 缓存纯计算 | 非语义保证 |
| `useCallback` | 稳定函数引用 | 只用于真实引用需求 |
| `useTransition` | 非紧急更新/pending | 不延迟 input value |
| `useDeferredValue` | 延迟非紧急显示 | 不是网络 debounce |
| `useId` | 可访问关联 ID | 不是列表 key |
| `useImperativeHandle` | 暴露窄命令 | 不泄露全部 DOM |
| `useSyncExternalStore` | 外部一致快照 | SSR 需 server snapshot |
| `useDebugValue` | DevTools 标签 | 不影响业务 |
| `useEffectEvent` | Effect 回调读最新值 | 不隐藏响应依赖 |
| `useActionState` | Action 结果/pending | 与 reducer 不同 |
| `useOptimistic` | Action 临时投影 | 非持久化 |
| `useFormStatus` | 祖先 form 状态 | `react-dom` API |
| `use` | 读取 Context/Promise 资源 | 由 Suspense/error 恢复 |

## 6. 最小可运行案例

**完整文件：`apps/react-web/src/ModernBoundaryLab.tsx`**

```tsx
import {
  Activity,
  Suspense,
  use,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { Ref } from "react";
import ErrorBoundary from "./ErrorBoundary";

const help = new Promise<string>((resolve) => {
  setTimeout(() => resolve("预约结果必须由服务器确认。"), 350);
});

function Help() {
  return <p>{use(help)}</p>;
}

type FocusHandle = { focus: () => void };

function SearchInput({ ref }: { ref: Ref<FocusHandle> }) {
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focus: () => input.current?.focus(),
  }), []);
  return <label>实验搜索<input ref={input} /></label>;
}

function PreservedDraft() {
  const [draft, setDraft] = useState("");
  const [theme, setTheme] = useState("普通");
  const [message, setMessage] = useState("");
  const onTick = useEffectEvent(() => setMessage(`当前主题：${theme}`));

  useEffect(() => {
    const timer = setInterval(() => onTick(), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section>
      <label>
        实验草稿
        <input value={draft} onChange={(event) => setDraft(event.target.value)} />
      </label>
      <button
        type="button"
        onClick={() => setTheme((old) => old === "普通" ? "高对比" : "普通")}
      >
        切换主题
      </button>
      <p role="status">{message}</p>
    </section>
  );
}

export default function ModernBoundaryLab() {
  const [visible, setVisible] = useState(true);
  const search = useRef<FocusHandle>(null);
  return (
    <main>
      <h1>现代边界实验</h1>
      <SearchInput ref={search} />
      <button type="button" onClick={() => search.current?.focus()}>
        聚焦搜索
      </button>
      <ErrorBoundary>
        <Suspense fallback={<p role="status">正在读取帮助……</p>}>
          <Help />
        </Suspense>
      </ErrorBoundary>
      <button type="button" onClick={() => setVisible((old) => !old)}>
        切换草稿显示
      </button>
      <Activity mode={visible ? "visible" : "hidden"}>
        <PreservedDraft />
      </Activity>
    </main>
  );
}
```

**命令：在 `apps/react-web` 执行**

```bash
pnpm typecheck
pnpm build
pnpm dev --host 127.0.0.1 --port 5186 --strictPort
```

预期先显示 Suspense fallback，随后帮助出现；聚焦按钮把焦点移到输入。输入草稿后隐藏再显示，
草稿保留；计时 Effect 在 hidden cleanup、visible setup。可在 Effect 中临时记录 setup/cleanup
次数观察，不把日志保留进最终代码。

## 7. 邻里集市集成案例

路由级代码拆分：

**关键片段：`apps/react-web/src/router.tsx`**

```tsx
const routes = [
  {
    path: "new",
    lazy: async () => {
      const module = await import("./routes/NewListingPage");
      return { Component: module.default, action: module.action };
    },
  },
];
```

`route.lazy` 可一起加载 Component/action；`React.lazy` 只加载组件。两者都要加载/错误 UI，
并避免点击后先下载组件再串行开始数据请求的瀑布。

plugin-react 6+ 按当前官方组合：

**关键片段：`apps/react-web/vite.config.ts`**

```ts
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";

plugins: [
  react(),
  babel({ presets: [reactCompilerPreset()] }),
  devApi(),
]
```

执行：

```bash
pnpm add -D babel-plugin-react-compiler @rolldown/plugin-babel
pnpm build
rg "react/compiler-runtime|useMemoCache" dist
```

实际标记以当前工具版本为准。命中只证明转换存在；再用相同 Profile 条件比较，测不到收益
就不写收益结论。实验完成后恢复主入口并运行 typecheck/build/E2E。

## 8. 常见错误与排查路径

**明确错误示例：**

```tsx
function Help() {
  const data = use(fetch("/api/v1/help").then((response) => response.text()));
  return <p>{data}</p>;
}
```

每次 render 创建新 Promise，可能持续挂起并重复请求。

| 项目 | 记录 |
| --- | --- |
| 现象 | Suspense fallback 反复出现，Network 重复请求 |
| 证据 | 每次 render 都有新 Promise/请求；没有稳定资源层 |
| 原因 | 在渲染函数中创建异步资源 |
| 修复 | 使用框架/缓存数据层或稳定模块资源；错误交给边界 |
| 复验 | 同一资源只建立一次，fallback 后稳定显示，reject 可恢复 |

另一个错误是把 roomId 放入 Effect Event 并从依赖删除，切换房间后仍订阅旧源。roomId 仍是
Effect 依赖，只有 theme 等非响应式回调读取进入 Effect Event。

## 9. 课后题

1. `use` 能否在 render 中读取每次新建的 fetch Promise？
2. Activity hidden 与卸载有何不同？
3. Compiler 标记是否证明页面更快？
4. ref prop 是否应暴露组件全部 DOM？

答案：

1. 不应；需要稳定资源，否则重复挂起/请求。
2. hidden 保留 state/DOM 语义但清理 Effect，卸载丢失组件 state。
3. 不能；只证明转换发生，收益需同条件测量。
4. 不应；只暴露 focus 等窄命令，维持声明式数据流。

## 10. 实践练习

**基础**：验证 focus handle，只暴露 `focus()`，不暴露 input value setter。

**进阶**：让帮助 Promise reject，ErrorBoundary 显示恢复 UI。参考标准：不在 `use` 周围
try/catch 吞掉挂起。

**故障注入**：把 Promise 移进 Help，观察重复挂起；恢复模块级稳定资源。再删除 Effect
cleanup，观察 Activity 隐藏后 timer 继续；恢复 cleanup 后通过。

## 11. 阶段验收

- [ ] Hook 地图包含职责与失效边界。
- [ ] Promise 稳定创建，Suspense 与错误边界配对。
- [ ] ref prop 只暴露窄命令。
- [ ] Effect Event 没有隐藏 roomId/q 等真实依赖。
- [ ] Activity 保留草稿，隐藏时 Effect cleanup。
- [ ] lazy 路由有加载与错误恢复。
- [ ] Compiler 有构建标记，性能收益只按测量记录。
- [ ] 实验后主入口恢复并重新通过门禁。
- [ ] 未把 Vite 冒充 RSC/Server Function 框架。

## 12. 常见问题

**`use` 为什么可出现在条件中？**

它的规则与普通 Hooks 不完全相同，但仍只能在组件/Hook 中使用，并受 Suspense/error 边界约束。

**Activity 是否等于 CSS display:none？**

不是。它管理 React 子树的可见模式和 Effect 生命周期。

**Compiler 是否允许可变 props？**

不允许把优化当成修复；纯 render 和不可变规则仍是前提。

## 13. 扩展阅读

资料快照：2026-10-11。

- [React：Hooks Reference](https://react.dev/reference/react/hooks)
- [React：use](https://react.dev/reference/react/use)
- [React：Suspense](https://react.dev/reference/react/Suspense)
- [React：useEffectEvent](https://react.dev/reference/react/useEffectEvent)
- [React：useImperativeHandle](https://react.dev/reference/react/useImperativeHandle)
- [React：Activity](https://react.dev/reference/react/Activity)
- [React Compiler Installation](https://react.dev/learn/react-compiler/installation)

兼容边界：API 与 Vite 插件配置按 2026-10-11 快照。安装后核对实际版本；canary/RFC 不进入
主线。真实性能、生产资源层和 RSC 框架未由本实验自动获得。

## 我现在能做到什么

我能按问题选择现代 React API，用稳定资源、窄 ref、诚实依赖和生命周期证据验证行为，并把
Compiler 转换与真实性能收益分开。

## 单元导航

- 上一单元：[Actions、乐观状态与表单状态](./02-actions-optimistic-form-status.md)
- 下一单元：[第 08 章入口](../08-ssr-capstone.md)
