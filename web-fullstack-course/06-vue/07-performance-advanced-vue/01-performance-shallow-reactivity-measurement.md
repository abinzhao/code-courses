# 先测瓶颈，再选择浅层响应、分页或缓存

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | computed、浏览器 Performance、生产构建 |
| 输入 | 5000 条合成商品、搜索词、根替换操作 |
| 输出 | 可复算测量记录与正确的 `shallowRef` 更新 |
| 文件 | `src/PerformanceLab.vue` |
| 验证 | 正确性、DOM 数量、Performance trace、构建 |
| 边界 | 单机实验不是生产收益；`nextTick` 不是绘制完成 |

## 1. 任务背景

输入搜索词时卡顿，可能来自网络、JS 计算、5000 个组件更新、布局或绘制。直接加 `computed`、`v-memo` 或 `shallowRef` 只是在猜。

本课先固定数据量、构建模式和操作，再逐层减少工作：服务端分页限制下载量，页面只展示需要的节点，纯派生由 computed 缓存，大型不可变集合才考虑 shallowRef。每一步先证明输出仍正确。

## 2. 学习目标

- 区分网络、解析、计算、DOM、布局和绘制成本。
- 记录可比较的性能条件，不编造百分比。
- 解释 computed 的依赖缓存和纯函数要求。
- 正确使用 `shallowRef` 根替换。
- 判断分页、虚拟化、稳定 props、`v-once` 与 `v-memo` 的适用边界。

## 3. 预备知识

先用生产构建：

```bash
pnpm build
pnpm exec vite preview --host 127.0.0.1 --port 4175 --strictPort
```

记录 Node、浏览器版本、设备、是否节流、数据量、查询和重复次数。Vue DevTools 观察组件更新，浏览器 Performance 观察长任务、布局与绘制。开发 HMR 和日志会污染结果。

## 4. 核心理论

### 4.1 成本分层

```text
请求等待 → JS 下载/解析 → 响应式计算 → 虚拟 DOM/DOM 更新 → layout → paint/composite
```

`computed` 只可能减少重复计算，不能缩短 HTTP；`shallowRef` 减少深层代理成本，不能减少 DOM；分页和虚拟化才直接限制节点数量。

### 4.2 computed 必须纯

getter 根据依赖计算结果，依赖未变时可复用。不能在 getter 内写计时状态或发请求，否则读取本身又触发更新，缓存语义失效。

### 4.3 shallowRef 的更新契约

`shallowRef(rows)` 只追踪 `.value` 身份。`rows.value[0].title = ...` 不触发更新；正确方式是创建新数组和变更项。若业务需要频繁嵌套编辑，普通 `ref/reactive` 更自然，不应为了理论性能到处 `triggerRef`。

### 4.4 跳过渲染的风险

稳定 props 能避免无关子组件更新。`v-once` 永久固定子树；`v-memo` 依赖数组漏项会展示旧数据。它们应由 profile 证明必要，并有状态更新测试。

虚拟列表减少节点，但会影响键盘导航、读屏连续性、浏览器查找和滚动定位，需要专项可访问性策略。20 条分页通常比自研虚拟化更简单。

## 5. 元素、属性、API 或配置清单

| API/工具 | 作用 | 本课规则 | 不能证明 |
| --- | --- | --- | --- |
| `computed` | 缓存纯派生 | getter 不写状态 | 网络更快 |
| `shallowRef` | 仅追踪根值 | 用根替换更新 | 深层自动响应 |
| `nextTick` | 等 Vue 更新队列 | 用于 DOM 读写时序 | 像素已绘制 |
| `performance.now` | 单页高精度时间 | 标注测量区间 | 用户总体体验 |
| Performance panel | 主线程、layout/paint | 生产构建 trace | 后端耗时原因 |
| Vue DevTools | 组件更新/状态 | 找更新范围 | 浏览器绘制成本 |
| `v-once` | 永久跳过更新 | 真静态内容 | 动态数据正确 |
| `v-memo` | 按依赖跳过子树 | 依赖必须完整 | 通用加速 |

## 6. 最小可运行案例

**完整文件：`apps/vue-web/src/PerformanceLab.vue`**

```vue
<script setup lang="ts">
import { computed, nextTick, ref, shallowRef } from 'vue'

type Row = { id: string; title: string }

const rows = shallowRef<Row[]>(
  Array.from({ length: 5000 }, (_, index) => ({
    id: `lab-${index}`,
    title: `合成商品 ${index}`,
  })),
)
const query = ref('')
const elapsed = ref('')
const visible = computed(() =>
  rows.value.filter(row => row.title.includes(query.value)),
)

async function toggleAndMeasure() {
  const start = performance.now()
  query.value = query.value === '4999' ? '' : '4999'
  await nextTick()
  elapsed.value =
    `Vue 更新队列完成：${(performance.now() - start).toFixed(2)}ms`
}

function renameFirst() {
  rows.value = rows.value.map((row, index) =>
    index === 0 ? { ...row, title: '更新后的实验商品' } : row,
  )
}
</script>

<template>
  <main>
    <h1>Vue 性能测量实验</h1>
    <label>实验关键字 <input v-model="query"></label>
    <button type="button" @click="toggleAndMeasure">切换查询并测量</button>
    <button type="button" @click="renameFirst">整体替换第一项</button>
    <p role="status">{{ elapsed }}</p>
    <p>匹配 {{ visible.length }} 项，仅渲染前 30 项。</p>
    <ul>
      <li v-for="row in visible.slice(0, 30)" :key="row.id">
        {{ row.title }}
      </li>
    </ul>
  </main>
</template>
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm typecheck
pnpm build
pnpm exec vite preview --host 127.0.0.1 --port 4175 --strictPort
```

先断言查询 `4999` 只显示 1 项，再记录至少 5 次结果并取中位数。错误实验是原地改 `rows.value[0].title`：界面不会可靠更新；恢复根替换后复验。`elapsed` 文案明确只到 Vue 队列，不写“完成绘制”。

## 7. 邻里集市集成案例

真实列表首先使用后端分页：

```text
GET /api/v1/listings?page=1&pageSize=20&q=台灯
```

页面保留服务端 `total`，只渲染当前页。卡片 props 传稳定业务值：

**关键片段：`apps/vue-web/src/pages/ListPage.vue`**

```vue
<ListingCard
  v-for="item in resource.data.items"
  :key="item.id"
  :listing="item"
  :favorite="favoriteIds.includes(item.id)"
/>
```

不要给所有卡片传不断变化的 `activeId` 再让每张卡自己比较；父级可传已经计算好的布尔值。若 profile 证明 `includes` 成为热点，可从已确认 ID 派生 `Set`，但必须在数组变化时重建，避免可变 Set 绕过追踪。

测量记录模板：

```text
构建：Vite production preview
浏览器/设备：
数据：当前页 20 / 合成实验 5000
操作：空查询切到 4999
节流：
重复：5 次，中位数
结果：Vue 队列 / trace 长任务 / DOM 节点数分别记录
结论：只描述观察，不外推到生产
```

## 8. 常见错误与排查路径

**错误示例：用一次开发环境计时宣称优化 80%。**

```ts
console.time('fast')
rows.value.filter(/* ... */)
console.timeEnd('fast')
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| 深层修改不更新 | ref 身份未变 | shallowRef 只追踪根 | 新数组/新对象 | 标题更新 |
| 输入仍卡 | trace 显示大量 DOM/layout | 只优化 computed | 分页/限制节点 | 节点数下降 |
| 结果波动巨大 | HMR、日志、后台任务 | 条件未固定 | 生产构建、多次中位数 | 波动可解释 |
| v-memo 显示旧收藏 | 依赖不含 favorite | 跳过了必要更新 | 补依赖或删除优化 | 收藏切换正确 |
| nextTick 后截图仍旧 | 浏览器尚未绘制 | 把队列当帧完成 | `requestAnimationFrame`/trace | 观察实际帧 |

## 9. 课后题

1. **computed 能减少 5000 个 DOM 节点吗？**<br>
   答：不能；它缓存计算，节点数量由分页、窗口化或模板范围控制。
2. **shallowRef 是否总比 ref 快？**<br>
   答：不是。它改变更新契约，适合大型不可变结构；嵌套频繁编辑会增加复杂度。
3. **为何 `nextTick` 结果不能叫渲染完成时间？**<br>
   答：它只保证 Vue DOM 更新已排队/应用，不保证浏览器完成 layout、paint 与 composite。
4. **虚拟列表为什么需要 A11y 专项？**<br>
   答：未挂载项会影响读屏顺序、键盘移动、浏览器查找和滚动定位。

## 10. 实践练习

**基础：根替换。**增加 `appendRow()`，使用新数组追加，断言计数与列表都更新。

**进阶：稳定 props。**用 Vue DevTools 比较传 `activeId` 和传 `selected:boolean` 的组件更新范围，记录条件和结果，不预设提升比例。

**故障注入：漏掉 v-memo 依赖。**让收藏切换显示旧值，保存证据后删除或修复依赖。答案标准：正确性测试先恢复，再讨论耗时。

## 11. 阶段验收

- [ ] 生产预览而非 HMR 下记录。
- [ ] 条件包含设备、浏览器、数据量、操作、节流和重复次数。
- [ ] 查询与根替换正确性先通过。
- [ ] DOM 节点数与计算时间分开记录。
- [ ] 无“使用 API 所以更快”的无证据结论。
- [ ] `v-once/v-memo/virtualization` 均写明失效边界。
- [ ] 实验完成后恢复业务主入口。

## 12. 常见问题

**可以直接安装虚拟列表库吗？**<br>
先确认分页仍不足、真实节点是瓶颈，再评估库的键盘、读屏、动态高度和维护状态。新增依赖不是本课默认答案。

**是否需要手工调用 `triggerRef`？**<br>
偶尔集成外部不可变数据时可用，但若每次嵌套写都调用，说明 shallowRef 不适合该模型。

**一次 profile 没有长任务是否就完成？**<br>
不够。还要覆盖目标设备、数据量和交互；无问题也应记录条件，不外推到全部用户。

## 13. 扩展阅读

资料快照日期：2026-10-10。

- [Vue Performance](https://vuejs.org/guide/best-practices/performance.html)：更新优化与分页建议。
- [Vue Reactivity Advanced](https://vuejs.org/api/reactivity-advanced.html)：`shallowRef` 和触发边界。
- [Vue `nextTick`](https://vuejs.org/api/general.html#nexttick)：更新队列语义。
- [Chrome Performance](https://developer.chrome.com/docs/devtools/performance/)：主线程与渲染证据。

## 我现在能做到什么

我能先把慢交互拆成可测层，再用正确性约束和真实条件选择 computed、浅层响应、分页或节点优化。

## 单元导航

[返回章目录](../README.md#第七章性能证据与进阶-vue) · [下一课：Teleport、Transition 与对话框](02-teleport-transition-dialog-accessibility.md)
