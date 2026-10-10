# 外部 store、Context 性能与 SSR：快照必须稳定且按请求隔离

## 任务卡

- **任务**：解释 Context 通知模型，实现 `useSyncExternalStore` 契约和每请求 store 工厂。
- **产出**：完整最小文件 `state-lab/favorite-store.ts`，主项目 Hook 与 SSR 工厂片段。
- **运行**：Node.js 24、React 19.3、TypeScript strict。
- **完成证据**：未更新时快照引用稳定，订阅可清理，两个 SSR 请求的 store 不共享数据。
- **边界**：外部 store 不补齐缺失的收藏查询接口，也不自动解决缓存、权限或持久化。

## 1. 任务背景

Context value 任一字段改变，读取该 Context 的消费者都会收到通知。小应用完全可以接受；
若高频收藏进度让只读会话组件反复渲染，应先用 Profiler 证明成本，再拆 Context 或采用
带订阅的外部 store。

外部 store 比 Context 多了契约：订阅必须可取消，`getSnapshot` 在未变化时必须返回同一
引用，SSR 还需服务器快照。写错任一项都可能产生无限更新或水合不一致。

## 2. 学习目标

完成后你能：

1. 解释 Provider value 改变为何通知消费者；
2. 判断拆分 Context、memo 与外部 store 的适用条件；
3. 实现稳定 `subscribe/getSnapshot/getServerSnapshot`；
4. 为每个 SSR 请求创建独立 store；
5. 识别当前 API 无法恢复收藏集合的真实缺口。

## 3. 预备知识

需要理解 reducer 不变性、订阅 cleanup 和 SSR 首次输入一致。先运行 React Profiler，记录
组件名、交互、数据量与 commit；不要因为看到“性能”二字就提前引入第三方 store。

本课 store 只保存当前会话的收藏反馈。商品列表仍由 Router loader 管理。

## 4. 核心理论

### 4.1 memo 不能消除合法变化

`useMemo(() => ({user, favorites}), [user, favorites])` 只在依赖不变时复用对象。favorites
改变时消费者理应收到通知。若会话和收藏更新频率不同，拆成两个 Context 往往更简单。

### 4.2 外部 store 是 React 之外的数据源

React 通过 `subscribe` 获知可能变化，再读取 `getSnapshot`。snapshot 要可缓存：每次返回
`{...state}` 会让 React 认为持续变化。更新时创建新不可变快照，未更新时复用旧引用。

### 4.3 服务器快照与客户端首帧相等

SSR 的 `getServerSnapshot` 必须与客户端水合第一次读取一致。公开初始数据可安全序列化；
私有会话、cookie、CSRF 或密钥不能为了“对齐”放进 HTML。

### 4.4 模块 singleton 会跨请求

Node 模块在多个请求间复用。模块顶层 `const store = createStore()` 可能把 A 用户状态提供给
B 用户。SSR handler 必须每次调用工厂，缓存也要按公开键和隐私策略隔离。

## 5. 元素、属性、API 或配置清单

| API | 契约 | 常见错误 |
| --- | --- | --- |
| `useSyncExternalStore` | 订阅外部可变源 | 用它重复 loader 数据 |
| `subscribe(listener)` | 返回 unsubscribe | cleanup 不移除 listener |
| `getSnapshot()` | 未变化时引用稳定 | 每次创建新对象 |
| `getServerSnapshot()` | SSR/水合初始值一致 | 读取浏览器全局 |
| `useMemo` | 缓存纯计算或引用 | 当成阻止所有渲染 |
| `memo` | props 相等时跳过渲染 | 自定义比较漏掉函数 |
| store factory | 创建隔离实例 | 模块 singleton 保存用户态 |
| `Cache-Control` | 声明响应缓存范围 | 私有 HTML 使用 public |

## 6. 最小可运行案例

**完整文件：`state-lab/favorite-store.ts`**

```ts
export type FavoriteSnapshot = Readonly<{
  ids: readonly string[];
  pending: readonly string[];
  error: string;
}>;

export type FavoriteStore = Readonly<{
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => FavoriteSnapshot;
  getServerSnapshot: () => FavoriteSnapshot;
  set: (id: string, selected: boolean) => void;
  reset: () => void;
}>;

const empty: FavoriteSnapshot = { ids: [], pending: [], error: "" };

export function createFavoriteStore(
  initial: FavoriteSnapshot = empty,
): FavoriteStore {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => snapshot,
    set(id, selected) {
      const ids = selected
        ? [...new Set([...snapshot.ids, id])]
        : snapshot.ids.filter((value) => value !== id);
      const unchanged =
        ids.length === snapshot.ids.length &&
        ids.every((value, index) => value === snapshot.ids[index]);
      if (unchanged) return;
      snapshot = { ids, pending: [], error: "" };
      emit();
    },
    reset() {
      if (snapshot === empty) return;
      snapshot = empty;
      emit();
    },
  };
}

const requestA = createFavoriteStore();
const requestB = createFavoriteStore();
const before = requestA.getSnapshot();
requestA.set("lamp-1", true);
requestA.set("lamp-1", true);

if (before === requestA.getSnapshot()) throw new Error("update not visible");
if (requestA.getSnapshot() !== requestA.getSnapshot()) {
  throw new Error("snapshot is unstable");
}
if (requestB.getSnapshot().ids.length !== 0) throw new Error("request leak");
console.log("stable-snapshot-and-request-isolation");
```

**命令：在 `state-lab` 执行**

```bash
pnpm exec tsc --strict --target ES2022 --module NodeNext \
  --moduleResolution NodeNext favorite-store.ts
node favorite-store.js
```

预期输出 `stable-snapshot-and-request-isolation`。渐进扩展：订阅计数器，重复设置同一目标时
计数不增加；调用 unsubscribe 后更新也不再通知。

## 7. 邻里集市集成案例

**关键片段：`apps/react-web/src/useFavorites.ts`**

```tsx
import { useSyncExternalStore } from "react";
import type { FavoriteStore } from "./favorite-store";

export function useFavorites(store: FavoriteStore) {
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
}
```

浏览器根部可以用窄 Context 只传 store 实例，组件通过 Hook 订阅快照。实例本身稳定，更新
发生在 store 内部，不必把整个快照塞进同一个会话 Context。

**关键片段：`apps/react-web/src/entry-server.tsx`**

```tsx
export function render(request: Request) {
  const favoriteStore = createFavoriteStore();
  const app = (
    <FavoriteStoreContext value={favoriteStore}>
      <App url={request.url} />
    </FavoriteStoreContext>
  );
  return renderToString(app);
}
```

每次 `render` 新建实例。若公开页面初始收藏为空，客户端也必须以相同空快照建 store。
真实用户收藏 SSR 需要安全的服务端读取契约和 private/no-store 响应，不能查询不到就从
localStorage 拼一份。

### 当前缺失边界

现有 API 只有 PUT/DELETE，没有 `GET /favorites`。因此：

- 同一 Provider 生命周期内可跨路由保持；
- 刷新后只知道本次页面开始后的写入；
- 不能宣称集合代表服务端全部收藏；
- 后续新增读取接口时还需定义分页、用户隔离、注销和缓存策略。

## 8. 常见错误与排查路径

**明确错误示例：**

```ts
getSnapshot() {
  return { ...snapshot };
}
```

即使数据不变也返回新对象，React 会持续认为快照变化。

| 项目 | 记录 |
| --- | --- |
| 现象 | Console 报 “The result of getSnapshot should be cached” 或持续重渲染 |
| 证据 | 连续两次 `Object.is(getSnapshot(), getSnapshot())` 为 false |
| 原因 | 每次读取创建新对象，没有以更新事件为边界缓存快照 |
| 修复 | 只在真实更新时替换 snapshot；读取直接返回当前引用 |
| 复验 | 未更新时引用相同；一次 set 只通知一次；重复目标不通知 |

SSR 若出现 A 请求收藏泄漏到 B 请求，检查 store 是否在模块顶层创建。移入请求 handler，
并用两个实例断言隔离。

## 9. 课后题

1. Context value 加 useMemo 后，favorites 改变时消费者是否还应更新？
2. `getSnapshot` 为什么不能每次返回新数组包装对象？
3. `getServerSnapshot` 能否读取 `window.localStorage`？
4. 外部 store 能否自动补齐缺失的 GET 收藏接口？

答案：

1. 应更新；依赖确实改变，memo 不能隐藏合法变化。
2. React 无法判断数据未变，可能持续检查和渲染。
3. 不能；服务器无 window，且会造成首帧不一致。
4. 不能；store 是客户端机制，不创造服务端契约。

## 10. 实践练习

**基础**：添加 subscribe 计数，set 新目标后为 1，重复 set 后仍为 1。

**进阶**：拆分 `SessionContext` 与 `FavoriteStoreContext`。参考标准：只显示用户名的组件在
收藏变化时无额外 commit，结论附 Profiler 条件而非主观感受。

**故障注入**：把 store 移到 SSR 模块顶层，先让 requestB 看见 requestA 的 `lamp-1`；
恢复工厂到 handler 后两个实例隔离。

## 11. 阶段验收

- [ ] 未变化时 snapshot 引用稳定。
- [ ] 更新时产生新不可变 snapshot。
- [ ] subscribe 返回可工作的 unsubscribe。
- [ ] 重复目标状态不产生多余通知。
- [ ] React Hook 同时提供客户端与服务器读取函数。
- [ ] SSR 每请求创建 store，没有模块级用户状态。
- [ ] 私有数据不进入公开 initial JSON 或公共缓存。
- [ ] 缺少 GET favorites 的刷新限制明确记录。

## 12. 常见问题

**什么时候只拆 Context 就够了？**

状态域少、更新频率可分离时优先拆分，学习和维护成本更低。

**外部 store 一定更快吗？**

不一定。它增加订阅契约，只有实际 Profiler 证据支持时才有价值。

**可以把 loader 数据放进 store 做缓存吗？**

需要明确失效、重验证和路由集成；本卷让 Router 继续拥有服务器数据，避免双源。

## 13. 扩展阅读

资料快照：2026-10-11。

- [React：useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [React：memo](https://react.dev/reference/react/memo)
- [React：useMemo](https://react.dev/reference/react/useMemo)
- [React：Server Rendering APIs](https://react.dev/reference/react-dom/server)
- [MDN：Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)

兼容边界：本课实现教学级内存 store，没有时间旅行、持久化、跨标签同步或服务端查询。
第三方 store 的 SSR 用法应以其当前官方文档为准。

## 我现在能做到什么

我能用证据决定是否离开 Context，实现符合 React 契约的稳定外部快照，并确保 SSR 状态
按请求隔离，同时不把客户端容器冒充后端收藏查询。

## 单元导航

- 上一单元：[会话、收藏命令与并发保护](./02-session-favorites-concurrency.md)
- 下一单元：[第 06 章入口](../06-testing-accessibility.md)
