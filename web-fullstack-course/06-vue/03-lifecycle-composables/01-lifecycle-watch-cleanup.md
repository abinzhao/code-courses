# 生命周期、watch 与同步清理

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 为组件建立外部资源所有权，并证明参数变化与卸载都会执行清理 |
| 可观察产出 | `LifecycleProbe.vue`、`SelectionPreview.vue` |
| 运行条件 | 第 2 章 Vue 工程，无网络依赖 |
| 建议时间 | 110 分钟 |
| 完成证据 | 监听器/计时器计数、快速切换结果、卸载后无继续输出 |

## 1. 任务背景

组件渲染的是状态，但窗口监听器、计时器、请求和第三方订阅存在于 Vue 之外。若组件消失后
这些资源仍运行，它们会继续写状态、重复触发或占用内存。

邻里集市详情会在商品 ID 改变时重新读取数据。同一个路由组件可能被复用，只改变参数，因此
“只在 mounted 时执行一次”不够；每一次同步必须拥有对应失效和清理路径。

## 2. 学习目标

完成后你应能：

1. 说明 setup、mounted、updated、unmounted 的先后职责；
2. 在 setup 同步阶段注册生命周期钩子；
3. 区分 `watch` 的显式来源和 `watchEffect` 的自动收集；
4. 解释 `watchEffect` 首个 `await` 后的依赖收集限制；
5. 在 watcher 回调同步阶段注册清理；
6. 选择 `flush` 和 `nextTick`，避免更新循环；
7. 对称移除监听器、计时器和失效任务。

## 3. 预备知识

需要理解 ref、computed 和 `nextTick`。先记住两种不同清理：

- 生命周期清理：组件不再存在时释放组件拥有的资源；
- watcher 清理：来源变化或 watcher 停止前，让上一轮同步失效。

请求取消属于第二类，下一课会把同一模式应用到 `AbortController`。

## 4. 核心理论

### 4.1 生命周期不是任意回调

`<script setup>` 同步执行时建立实例逻辑。`onMounted` 在客户端首次 DOM 挂载后执行，
`onUnmounted` 在实例卸载时释放外部资源。钩子应同步注册，让 Vue 知道它属于当前实例：

```text
setup 注册钩子
  → 首次渲染/提交
  → mounted 建立浏览器资源
  → 多次响应式更新
  → unmounted 释放资源
```

SSR 不运行 `onMounted`；依赖 `window` 的代码应位于客户端钩子或明确客户端模块中。

### 4.2 updated 不是通用写状态入口

`onUpdated` 在 DOM 更新后运行。若其中无条件写响应式状态，会触发下一轮更新，形成循环。
需要特定状态变化时用明确 watch；只需读取更新后 DOM 时优先在触发操作后 `await nextTick()`。

### 4.3 `watch` 与 `watchEffect`

`watch(source, callback)` 把依赖和副作用分开，适合请求参数、路由参数和需比较新旧值的场景。
`watchEffect(callback)` 自动收集同步执行期间读取的依赖，适合短小、依赖直观的同步效果。

异步 `watchEffect` 只收集第一个 `await` 之前的读取。若在 await 后才读取 `q.value`，后续 q
变化不会重新触发。复杂异步流程应使用显式 watch，避免依赖被控制流隐藏。

### 4.4 清理必须先拥有资源

watch 回调拿到的 `onCleanup` 应在创建资源后立即同步注册：

```ts
watch(source, (_value, _old, onCleanup) => {
  const timer = window.setTimeout(...)
  onCleanup(() => window.clearTimeout(timer))
})
```

Vue 3.5 也提供 `onWatcherCleanup`，同样必须在同步阶段调用，不能等待 await 后才注册。

### 4.5 flush 选择

- 默认 `pre`：组件更新前运行，适合大多数数据同步；
- `post`：组件 DOM 更新后运行，适合确需读取 DOM；
- `sync`：同步触发，跳过批量处理，容易在高频写入中产生开销。

网络请求通常不需要 `post`。不要把 flush 当作修复竞态的工具。

## 5. 元素、属性、API 或配置清单

| API | 作用 | 关键边界 |
| --- | --- | --- |
| `onMounted` | 建立客户端 DOM/浏览器资源 | SSR 不执行 |
| `onUnmounted` | 释放组件拥有的资源 | 与建立操作对称 |
| `onUpdated` | 观察 DOM 已更新 | 不无条件写状态 |
| `watch` | 观察显式来源 | 请求参数首选 |
| `watchEffect` | 自动收集同步依赖 | 首个 await 后不再收集 |
| `onCleanup` | 失效上一轮 watcher 工作 | 同步注册 |
| `onWatcherCleanup` | Vue 3.5 watcher 清理 API | 不能 await 后调用 |
| `flush: 'post'` | DOM 提交后执行 | 只在确需 DOM 时使用 |
| `stop()` | 停止手工 watcher | setup 同步建立者通常随实例停止 |

## 6. 最小可运行案例

**完整文件：`apps/vue-web/src/lessons/LifecycleProbe.vue`**

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const seconds = ref(0)
const width = ref(0)
let timer: number | undefined

function updateWidth() {
  width.value = window.innerWidth
  console.count('resize handled')
}

onMounted(() => {
  console.count('LifecycleProbe mounted')
  updateWidth()
  window.addEventListener('resize', updateWidth)
  timer = window.setInterval(() => {
    seconds.value++
  }, 1000)
})

onUnmounted(() => {
  console.count('LifecycleProbe unmounted')
  window.removeEventListener('resize', updateWidth)
  if (timer !== undefined) window.clearInterval(timer)
})
</script>

<template>
  <section aria-labelledby="lifecycle-title">
    <h2 id="lifecycle-title">生命周期探针</h2>
    <p>视口宽度：{{ width }}；存活秒数：{{ seconds }}</p>
  </section>
</template>
```

**关键片段：`apps/vue-web/src/App.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import LifecycleProbe from './lessons/LifecycleProbe.vue'

const show = ref(true)
</script>

<template>
  <button type="button" @click="show = !show">切换探针</button>
  <LifecycleProbe v-if="show" />
</template>
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm typecheck
pnpm dev --host 127.0.0.1
```

显示探针后调整窗口，隐藏探针，再调整窗口并等待两秒。预期隐藏后不再出现该实例的 resize
计数，重新显示时秒数从 0 开始。开发热更新可能产生额外生命周期，验收前硬刷新。

渐进扩展：先只记录 mounted/unmounted，再加 resize，最后加 interval；每增加一种资源，都先写出
对应清理再继续。

## 7. 邻里集市集成案例

用可取消的计时器模拟“根据当前商品选择生成慢速预览”，重点观察 watcher 失效，不冒充 API。

**完整文件：`apps/vue-web/src/lessons/SelectionPreview.vue`**

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'

const selectedId = ref('lamp-1')
const preview = ref('正在准备台灯预览……')
const completed = ref(0)

watch(
  selectedId,
  (id, _oldId, onCleanup) => {
    let expired = false
    const delay = id === 'lamp-1' ? 700 : 100
    preview.value = `正在准备 ${id} 的教学预览……`

    const timer = window.setTimeout(() => {
      if (expired) return
      completed.value++
      preview.value = id === 'lamp-1'
        ? '九成新台灯：3500 分'
        : '折叠桌：8000 分'
    }, delay)

    onCleanup(() => {
      expired = true
      window.clearTimeout(timer)
    })
  },
  { immediate: true },
)
</script>

<template>
  <section aria-labelledby="selection-preview-title">
    <h2 id="selection-preview-title">商品选择预览</h2>
    <label>
      当前商品
      <select v-model="selectedId">
        <option value="lamp-1">九成新台灯</option>
        <option value="desk-1">折叠桌</option>
      </select>
    </label>
    <p role="status">{{ preview }}</p>
    <p>已提交预览次数：{{ completed }}</p>
    <p><strong>这是计时器教学模拟，不是 API 响应或持久化数据。</strong></p>
  </section>
</template>
```

刷新后立即选择折叠桌。虽然台灯延迟更长，最终仍应显示折叠桌，完成次数为 1。`expired` 检查
与清除计时器共同防止旧任务提交。

## 8. 常见错误与排查路径

**明确错误示例：监听器函数引用不一致。**

**关键片段：`apps/vue-web/src/lessons/LeakingProbe.vue`**

```ts
onMounted(() => {
  window.addEventListener('resize', () => console.log(window.innerWidth))
})

onUnmounted(() => {
  window.removeEventListener('resize', () => console.log(window.innerWidth))
})
```

两个箭头函数是不同对象，移除不会命中原监听器。将处理器保存为同一引用，并匹配 capture 等选项。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 隐藏探针后调整窗口，Console 仍持续输出；重复显示后一次 resize 输出多次 |
| 证据 | Performance/Event Listeners 显示旧监听器仍在，remove 使用新的箭头函数 |
| 原因 | 建立和移除不是同一函数引用 |
| 修复 | 抽出 `updateWidth`，add/remove 都使用该引用，并清理 interval |
| 复验 | 隐藏后 resize 与秒数都停止；重复挂载不会增加每次事件处理次数 |

异步 watcher 的另一个错误是在 await 后才调用 `onWatcherCleanup`。清理注册已错过同步窗口，应在
创建 controller/timer 后立即注册。

## 9. 课后题

1. 为什么 `onMounted` 应在 setup 同步阶段注册？
2. `watchEffect` 为什么可能漏掉 await 后读取的 ref？
3. `onUpdated` 中无条件 `count.value++` 会发生什么？
4. watcher 清理在什么时候运行？
5. `flush: 'post'` 是否能取消旧请求？

**参考答案：**

1. Vue 需要把钩子关联到当前实例，异步脱离后关联不可靠。
2. 自动依赖收集只覆盖同步执行段。
3. DOM 更新触发 hook，hook 再写状态，形成持续更新。
4. 来源下一次变化前以及 watcher 停止前。
5. 不能；它只调整回调相对 DOM 提交的时机。

## 10. 实践练习

### 基础：在线状态

监听 `online`/`offline`，页面显示当前网络提示，并在卸载时移除。

**答案标准：**两个事件使用稳定函数引用；提示只是浏览器信号，不证明 API 可用。

### 进阶：暂停与恢复计时器

增加按钮暂停 interval，再恢复且不得创建重复 timer。

**答案标准：**同时检查 timer 是否存在；卸载总能清理；状态与资源所有权一致。

### 故障注入：移除 watcher 清理

注释 `onCleanup`，快速从台灯切到折叠桌。

**答案标准：**最终被慢台灯覆盖或完成次数为 2；恢复清理后最终只属于当前选择。

## 11. 阶段验收

- [ ] 能画出 setup、mount、update、unmount 的顺序。
- [ ] 监听器和 timer 建立/清理对称。
- [ ] 卸载后无继续写入或 Console 输出。
- [ ] 快速切换商品时旧任务不能覆盖当前选择。
- [ ] 能解释 watch 和 watchEffect 的依赖差异。
- [ ] 已复现函数引用泄漏并形成五段记录。
- [ ] `pnpm typecheck` 与 `pnpm build` 通过。

## 12. 常见问题

**同步 setup 中创建的 watch 还要手动 stop 吗？**

通常会随组件停止；提前停止、异步脱离实例创建或非组件作用域时仍需显式管理。

**为什么不在 `onMounted` 里创建所有 watcher？**

多数 watcher 不依赖 DOM，setup 中同步创建即可自动归属实例。

**清理意味着异步操作绝不会完成吗？**

不一定。计时器可清除，网络请求可能已到服务器；仍需过期结果守卫。

**SSR 为什么看不到 mounted 日志？**

服务端只渲染组件输出，不建立浏览器 DOM，mounted 属于客户端阶段。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [Vue：生命周期](https://vuejs.org/guide/essentials/lifecycle.html)
- [Vue：Watchers](https://vuejs.org/guide/essentials/watchers.html)
- [Vue：组合式生命周期 API](https://vuejs.org/api/composition-api-lifecycle.html)
- [Vue：`nextTick`](https://vuejs.org/api/general.html#nexttick)
- [MDN：事件监听器](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)

## 我现在能做到什么

我能把外部资源归属到组件或 watcher，能在失效和卸载时对称清理，并能解释异步依赖收集的边界。

## 单元导航

[返回章入口](../03-lifecycle-composables.md) ·
[下一课：HTTP 错误、取消与资源状态](02-fetch-http-abort-resource-state.md)
