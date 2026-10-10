# 性能测量、memo 与并发更新：优化必须对应已观测成本

## 任务卡

- **任务**：区分网络、bundle、计算、DOM、布局成本，测量后使用 memo 与并发更新。
- **产出**：完整 `PerformanceLab.tsx` 和一份包含条件、前后数据与结论的 Profile 记录。
- **运行**：生产构建、Chromium Performance、React DevTools Profiler、固定 1000 条夹具。
- **完成证据**：输入保持即时，结果可延迟；依赖缺失能复现过期结果；无编造百分比。
- **边界**：实验夹具与节流不是生产流量；transition 不取消请求也不保证响应顺序。

## 1. 任务背景

页面“慢”可能是接口等待、下载包过大、过滤计算、上千 DOM 节点或布局抖动。给每个函数
加 `useCallback` 只改变引用，无法降低 RTT，也不能减少 DOM。错误优化还会制造过期闭包。

本课先在固定条件下定位成本，再用最小工具处理对应瓶颈。没有可重复基线时，结论只能写
“未测”，不能写“提升 60%”。

## 2. 学习目标

完成后你能：

1. 记录可复现性能基线；
2. 判断 `memo/useMemo/useCallback` 是否有真实引用需求；
3. 用 `useDeferredValue` 延迟非紧急结果；
4. 用 `useTransition` 标记非紧急状态切换；
5. 说明分页和虚拟化的性能与无障碍边界。

## 3. 预备知识

先确保功能测试通过。性能比较使用同一生产构建、浏览器版本、设备、电源状态、CPU/网络
节流、数据量和操作路径。开发 Strict Mode 的重复渲染不是生产 commit 时间。

`seed` 夹具含 `lamp-1` 和 `desk-1`，扩展为 1000 条只供本地实验。

## 4. 核心理论

### 4.1 先分类，再选工具

- Network：Waterfall、TTFB、缓存命中；
- bundle：传输大小、解析/执行、未使用代码；
- compute：CPU profile、React render 时长；
- DOM/layout/paint：节点数、Layout、Paint、CLS；
- interaction：INP 与用户输入到可见反馈。

### 4.2 memo 系列不是语义保证

`useMemo` 缓存纯计算，`useCallback` 缓存函数引用，`memo` 在 props 相等时跳过子组件 render。
React 可以出于实现原因丢弃缓存，业务正确性不能依赖“永不重算”。

### 4.3 紧急输入与非紧急结果分开

受控 input 的 value 必须立即跟随 `q`。结果列表读取 `deferredQ`，允许短暂显示旧结果并给
状态提示。`useDeferredValue` 不是 debounce；网络请求仍需取消、缓存或明确防抖。

### 4.4 少渲染数据优于缓存全部

服务端分页减少传输与 DOM。虚拟化适合大列表，但要验证键盘可达、屏幕阅读器上下文、滚动
恢复和动态高度；不为演示 API 数量随意新增库。

## 5. 元素、属性、API 或配置清单

| API / 工具 | 作用 | 常见误用 |
| --- | --- | --- |
| React Profiler | 组件 render/commit 证据 | 用开发重复渲染估生产 |
| Performance panel | 主线程、布局、绘制 | 只看总时长不看轨道 |
| `memo` | props 相等时跳过 render | 子组件本身很便宜仍包裹 |
| `useMemo` | 缓存纯计算结果 | 用来修副作用 |
| `useCallback` | 稳定函数引用 | 每个 handler 都使用 |
| `useDeferredValue` | 延迟非紧急值 | 当网络 debounce |
| `useTransition` | 标记非紧急更新 | 包住 input value |
| pagination | 限制传输和 DOM | 忘记 URL/总数语义 |
| virtualization | 限制可见 DOM | 忽略键盘与朗读 |

## 6. 最小可运行案例

**完整文件：`apps/react-web/src/PerformanceLab.tsx`**

```tsx
import {
  memo,
  useDeferredValue,
  useMemo,
  useState,
  useTransition,
} from "react";
import { seed, type Listing } from "./domain";
import ListingCard from "./ListingCard";

const rows: Listing[] = Array.from({ length: 1000 }, (_, index) => {
  const source = seed[index % seed.length]!;
  return {
    ...source,
    id: `lab-${index}`,
    title: `${source.title} ${index}`,
  };
});

const ResultList = memo(function ResultList(props: {
  items: readonly Listing[];
  q: string;
}) {
  const visible = useMemo(
    () => props.items.filter((item) => item.title.includes(props.q)),
    [props.items, props.q],
  );
  return (
    <section aria-label="性能实验结果">
      <p>匹配 {visible.length} 项，仅展示前 30 项。</p>
      {visible.slice(0, 30).map((item) => (
        <ListingCard key={item.id} listing={item} />
      ))}
    </section>
  );
});

export default function PerformanceLab() {
  const [q, setQ] = useState("");
  const deferredQ = useDeferredValue(q);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [pending, startTransition] = useTransition();
  const items = useMemo(
    () => availableOnly
      ? rows.filter((item) => item.status === "available")
      : rows,
    [availableOnly],
  );

  return (
    <main>
      <h1>性能实验</h1>
      <label htmlFor="performance-q">关键字</label>
      <input
        id="performance-q"
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />
      <button
        type="button"
        onClick={() => startTransition(() => {
          setAvailableOnly((value) => !value);
        })}
      >
        切换可预约范围
      </button>
      <p role="status">
        {pending || q !== deferredQ ? "结果更新中，暂时显示旧结果。" : "结果已更新。"}
      </p>
      <ResultList items={items} q={deferredQ} />
    </main>
  );
}
```

临时从实验入口渲染该组件。**命令：在 `apps/react-web` 执行**

```bash
pnpm typecheck
pnpm build
pnpm dev --host 127.0.0.1 --port 5184 --strictPort
```

在 4× CPU 节流下输入“台灯”，记录 input 与列表 commit。渐进扩展：对比结果直接使用 q
的版本，但必须保存相同条件下的数字，而不是只写“感觉更顺”。

## 7. 邻里集市集成案例

主项目优先使用服务器分页 `page/pageSize/q`，URL 保存页码和关键字。性能实验只验证调度，
不把 1000 条内存夹具接回真实业务。

记录模板：

```text
构建：production / commit:
设备与浏览器：
CPU/网络条件：
数据量与显示量：
操作：从空输入连续键入“台灯”
基线：最长 commit / INP / DOM 节点
改动后：同三项
结论：保留或删除优化
未测：真实生产数据、低端移动设备
```

函数引用只有在传给 memo 子组件、Effect 依赖或外部订阅且 Profiler 证明有成本时才考虑
`useCallback`。若回调依赖 `selectedId`，必须写入依赖或改用函数式更新，不能用空数组冻结
旧值。

## 8. 常见错误与排查路径

**明确错误示例：**

```tsx
const visible = useMemo(
  () => items.filter((item) => item.title.includes(q)),
  [items],
);
```

缺少 q，输入改变后结果过期。

| 项目 | 记录 |
| --- | --- |
| 现象 | 输入显示“台灯”，列表仍是上一个关键字 |
| 证据 | Profiler 显示组件 render，但 memo 返回旧数组；依赖中无 q |
| 原因 | 为减少计算隐藏了真实依赖 |
| 修复 | 加入 q；再基于测量决定是否保留 memo |
| 复验 | 每个关键字对应结果，类型/测试通过；性能记录条件一致 |

另一个错误是把 `setQ` 放进 transition，导致受控输入自身延迟。保持输入紧急，只延迟列表。

## 9. 课后题

1. memo 能否减少接口 RTT？
2. `useDeferredValue` 是否自动减少请求次数？
3. 为什么缓存不能成为正确性条件？
4. 虚拟列表为什么需要额外 A11y 验收？

答案：

1. 不能，它只影响 React 渲染。
2. 不能，它延迟值的渲染；请求需独立策略。
3. React 可重算，依赖变化也会失效；逻辑必须在无缓存时仍正确。
4. 未渲染项目、焦点移动和列表上下文可能影响键盘与朗读。

## 10. 实践练习

**基础**：保存一次有/无 deferred 的 Profile。答案必须含条件和数值。

**进阶**：把列表改为服务端分页，每页 20。验收：URL 可刷新，total/pageSize 正确，DOM 数
明显受限但不声称接口更快。

**故障注入**：删除 q 依赖，复现旧结果；恢复后加行为测试，不能通过删除 memo 遮掩未记录
的故障过程。

## 11. 阶段验收

- [ ] 性能记录包含设备、构建、数据量、节流和操作。
- [ ] 网络、bundle、计算、DOM、布局成本分开。
- [ ] input value 不在 transition。
- [ ] 延迟结果有状态提示，不误导为最新。
- [ ] memo 依赖完整，删除缓存仍保持正确。
- [ ] 优先分页，只在有证据时考虑虚拟化。
- [ ] 没有编造性能百分比。
- [ ] 实验完成后恢复主入口。

## 12. 常见问题

**React Compiler 出现后还需要测量吗？**

需要。Compiler 减少部分手工 memo 工作，不会修网络、DOM 或错误数据模型。

**开发模式能否比较相对趋势？**

可辅助定位，但正式结论应在生产构建和固定条件下复测。

**为什么只显示前 30 项？**

把计算与 DOM 成本分开，避免实验结论被 1000 个卡片布局主导。

## 13. 扩展阅读

资料快照：2026-10-11。

- [React：Profiler](https://react.dev/reference/react/Profiler)
- [React：memo](https://react.dev/reference/react/memo)
- [React：useMemo](https://react.dev/reference/react/useMemo)
- [React：useDeferredValue](https://react.dev/reference/react/useDeferredValue)
- [React：useTransition](https://react.dev/reference/react/useTransition)
- [web.dev：Interaction to Next Paint](https://web.dev/articles/inp)

兼容边界：实验数据与 CPU 节流是合成条件。生产用户设备、网络分布、缓存和真实性能收益
未单独执行时必须记录为未验证。

## 我现在能做到什么

我能先定位慢在网络、计算还是 DOM，再用最小的 memo 或并发工具处理已观测问题，并让每条
性能结论带上可重复的测试条件。

## 单元导航

- 上一单元：[第 07 章入口](../07-performance-modern-react.md)
- 下一单元：[Actions、乐观状态与表单状态](./02-actions-optimistic-form-status.md)
