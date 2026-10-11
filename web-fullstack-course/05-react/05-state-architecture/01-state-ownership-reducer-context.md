# 状态所有权、reducer 与 Context：先决定真相在哪里

## 任务卡

- **任务**：分类 URL、草稿、服务器和共享客户端状态，实现纯收藏 reducer 与强约束 Context。
- **产出**：最小实验 `state-lab/favorite-state.ts`，以及主项目中的聚焦接线片段。
- **运行**：Node.js 24、React 19.3、TypeScript strict；在个人练习工作区执行。
- **完成证据**：reducer 断言通过，Provider 缺失时报错，跨路由收藏数量来自同一状态。
- **边界**：reducer/Context 不提供持久化、认证、对象授权、事务或刷新恢复。

## 1. 任务背景

同一商品若同时存在 loader 数据、组件 state 和 Context 副本，任何一次刷新都可能让三者
不一致。问题不在于“React 状态太多”，而在于没有先决定谁拥有真相。

本课把商品状态留给服务端与路由，把搜索条件留给 URL，把发布草稿留在表单，只把会话期
收藏反馈放入共享客户端状态。这样每次更新都有唯一来源，失败也知道回到哪里。

## 2. 学习目标

完成后你能：

1. 按生命周期、可分享性和权威来源分类状态；
2. 用判别联合定义 reducer action；
3. 保持 reducer 纯、不可变且幂等；
4. 用 `createContext<T | null>` 暴露显式依赖；
5. 解释 reducer、Context 与服务器持久化的边界。

## 3. 预备知识

先完成路由 loader/action，并理解 PUT/DELETE 收藏契约。商品 `status/version` 是服务器事实；
收藏接口只提供目标写入，当前契约没有“查询全部收藏”。价格仍是整数分，时间仍是 UTC
ISO 8601，不能因为进入 Context 就更换领域规则。

## 4. 核心理论

### 4.1 用三个问题决定所有者

1. 刷新或分享 URL 后是否应恢复？是则优先 URL。
2. 是否由服务器或数据库裁决？是则保持服务器事实，不复制为长期客户端真相。
3. 是否只影响一个交互草稿？是则局部 state 足够。

Context 适合跨树传递稳定依赖或小规模共享状态，不是“所有 state 的仓库”。

### 4.2 reducer 描述事实，不执行副作用

`start/saved/failed/reset` 分别描述已经发生的阶段。HTTP 在调用层执行，完成后派发结果。
reducer 不读 cookie、不请求接口、不改 localStorage，也不产生随机 ID。

### 4.3 明确目标比 toggle 更稳

收藏接口是 PUT/DELETE 目标状态。`saved(id, selected)` 可安全重放；“把当前值取反”依赖
可能过期的客户端快照，网络重试后还可能再次反转。

### 4.4 null 默认值暴露接线错误

伪造默认用户会让缺少 Provider 的测试悄悄通过。Context 默认 `null`，自定义 Hook 立即
抛出“必须在 Provider 内使用”，错误更接近根因。

## 5. 元素、属性、API 或配置清单

| API / 类型 | 本课职责 | 失效边界 |
| --- | --- | --- |
| `useReducer` | 集中纯状态迁移 | 不运行 HTTP |
| `createContext` | 声明树级依赖 | 不持久化 |
| `useContext` | 订阅最近 Provider | value 改变会通知消费者 |
| 判别联合 action | 约束每种动作字段 | 运行时外部数据仍需校验 |
| `Readonly` / 只读 props | 表达调用方所有权 | 不冻结运行时对象 |
| `Set` 临时去重 | 生成无重复新数组 | 不能原地改 state 内 Set |
| `satisfies` | 检查映射完整性 | 不生成运行时检查 |

## 6. 最小可运行案例

在个人练习目录创建 `state-lab/`。

**完整文件：`state-lab/favorite-state.ts`**

```ts
export type FavoriteState = Readonly<{
  ids: readonly string[];
  pending: readonly string[];
  error: string;
}>;

export type FavoriteAction =
  | { type: "start"; id: string }
  | { type: "saved"; id: string; selected: boolean }
  | { type: "failed"; id: string; message: string }
  | { type: "reset" };

export const initialFavorites: FavoriteState = {
  ids: [],
  pending: [],
  error: "",
};

export function favoriteReducer(
  state: FavoriteState,
  action: FavoriteAction,
): FavoriteState {
  switch (action.type) {
    case "start":
      return {
        ...state,
        pending: [...new Set([...state.pending, action.id])],
        error: "",
      };
    case "saved":
      return {
        ids: action.selected
          ? [...new Set([...state.ids, action.id])]
          : state.ids.filter((id) => id !== action.id),
        pending: state.pending.filter((id) => id !== action.id),
        error: "",
      };
    case "failed":
      return {
        ...state,
        pending: state.pending.filter((id) => id !== action.id),
        error: action.message,
      };
    case "reset":
      return initialFavorites;
  }
}

const started = favoriteReducer(initialFavorites, {
  type: "start",
  id: "lamp-1",
});
const saved = favoriteReducer(started, {
  type: "saved",
  id: "lamp-1",
  selected: true,
});
const repeated = favoriteReducer(saved, {
  type: "saved",
  id: "lamp-1",
  selected: true,
});

if (repeated.ids.join(",") !== "lamp-1") throw new Error("not idempotent");
if (initialFavorites.pending.length !== 0) throw new Error("input mutated");
console.log(JSON.stringify(repeated));
```

**命令：在 `state-lab` 执行**

```bash
pnpm exec tsc --strict --target ES2022 --module NodeNext \
  --moduleResolution NodeNext favorite-state.ts
node favorite-state.js
```

预期输出只含一个 `lamp-1`，`pending` 为空。渐进扩展：先让初始 ids 含 `lamp-1`，派发
`start` 再 `failed`，结果必须仍含该 ID。

## 7. 邻里集市集成案例

Context 只暴露本章需要的值和命令。

**关键片段：`apps/react-web/src/MarketContext.tsx`**

```tsx
import { createContext, useContext, useReducer } from "react";
import type { ReactNode } from "react";
import {
  favoriteReducer,
  initialFavorites,
  type FavoriteState,
} from "./favorite-state";

type User = Readonly<{ id: string; name: string }>;
type MarketValue = Readonly<{
  user: User | null;
  favorites: FavoriteState;
  setFavorite: (id: string, selected: boolean) => Promise<void>;
}>;

const MarketContext = createContext<MarketValue | null>(null);

export function useMarket(): MarketValue {
  const value = useContext(MarketContext);
  if (value === null) {
    throw new Error("useMarket 必须在 MarketProvider 内使用");
  }
  return value;
}

export function MarketProvider({ children }: { children: ReactNode }) {
  const [favorites] = useReducer(favoriteReducer, initialFavorites);
  async function setFavorite(_id: string, _selected: boolean) {
    throw new Error("下一课接入 HTTP 命令");
  }
  return (
    <MarketContext value={{ user: null, favorites, setFavorite }}>
      {children}
    </MarketContext>
  );
}
```

这里的抛错函数明确表示命令尚未接入，不能作为最终实现。下一课会把副作用放回 Provider
调用层。路由 loader 的 `Listing[]` 不进入 Context，避免形成第二份服务器缓存。

## 8. 常见错误与排查路径

**明确错误示例：**

```ts
case "saved":
  state.ids.push(action.id);
  return state;
```

它修改旧对象并返回同一引用，React 可能跳过更新，历史快照也被污染。

| 项目 | 记录 |
| --- | --- |
| 现象 | 收藏计数偶尔不刷新，重复点击后数量增加两次 |
| 证据 | reducer 返回值与输入 `Object.is` 为 true；ids 出现重复值 |
| 原因 | 原地 mutation，加上 toggle/append 没有目标幂等语义 |
| 修复 | 返回新对象；按 ID 去重；action 携带明确 `selected` |
| 复验 | 原输入不变，重复 saved 后仍只有一个 ID，组件重新渲染一次合法结果 |

另一个常见错误是把 loader 商品数组复制进 Context。用 React DevTools 对比两份版本，
删除副本，让 loader 继续拥有服务器快照。

## 9. 课后题

1. 为什么搜索关键字不应只放 Context？
2. reducer 为什么不能直接调用 `fetch`？
3. `createContext({user: demoUser})` 有什么风险？
4. 收藏 PUT 成功是否证明刷新后能恢复全部收藏？

答案：

1. URL 状态需要分享、刷新和前进后退恢复。
2. reducer 可能被重放，且纯函数才可确定测试；副作用属于调用层。
3. 缺 Provider 时会悄悄使用假身份，掩盖接线错误。
4. 不能；当前没有读取全部收藏的接口。

## 10. 实践练习

**基础**：初始 ids 含 `lamp-1`，派发 `failed`。验收：ID 保留、pending 移除、error 更新。

**进阶**：增加 `clearError` action。参考标准：只清 error，不改变 ids/pending，并由
TypeScript 的 switch 覆盖检查约束。

**故障注入**：临时恢复原地 `push`。加入
`if (Object.is(saved, started)) throw new Error("mutation")`，确认先失败；恢复不可变实现后通过。

## 11. 阶段验收

- [ ] URL、草稿、服务器、共享客户端状态都有明确所有者。
- [ ] reducer 无请求、时间、随机数和外部可变读写。
- [ ] 重复 selected=true 不重复计数。
- [ ] failed 保留写入前的收藏结果。
- [ ] Context 默认值为 null，缺 Provider 明确失败。
- [ ] Provider 没有复制 loader 商品列表。
- [ ] 运行命令、预期输出和失败证据均已记录。
- [ ] 没有声称刷新恢复或服务端授权已经实现。

## 12. 常见问题

**小应用是否一定要 useReducer？**

不一定。状态转移有多阶段、需独立测试时 reducer 更清晰；简单布尔值用 state 即可。

**Context value 是否必须 useMemo？**

先测量。只要依赖在变化，memo 不能阻止合法通知；第 3 课再讨论拆分与外部 store。

**数组与 Set 应选哪个？**

小规模可序列化状态用数组清晰；Set 可做计算，但每次更新仍需新实例。

## 13. 扩展阅读

资料快照：2026-10-11。

- [React：Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- [React：Scaling Up with Reducer and Context](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [React：useReducer](https://react.dev/reference/react/useReducer)
- [React：createContext](https://react.dev/reference/react/createContext)
- [React：useContext](https://react.dev/reference/react/useContext)

兼容边界：示例采用 React 19 的 `<Context value>` 写法。旧 `.Provider` 写法仍可见于历史项目；
类型通过不证明 HTTP 响应或用户身份可信。

## 我现在能做到什么

我能先给每类状态确定唯一所有者，再用纯 reducer 表达幂等收藏结果，并让 Context 接线错误
立即暴露，而不是把所有数据堆进一个全局对象。

## 单元导航

- 章节目录：[第 05 章目录](../README.md#第五章状态架构)
- 下一单元：[会话、收藏命令与并发保护](./02-session-favorites-concurrency.md)
