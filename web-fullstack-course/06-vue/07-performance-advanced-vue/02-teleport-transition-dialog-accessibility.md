# 用 Teleport 与原生 Dialog 建立可恢复焦点的模态交互

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 前置 | SFC、`defineModel`、watch、语义对话框 |
| 输入 | 打开/关闭 model、确认意图、Escape、焦点来源 |
| 输出 | Teleport 模态框、Transition、焦点恢复、减少动态 |
| 文件 | `index.html`、`ConfirmDialog.vue`、调用组件 |
| 验证 | 键盘、Escape、cancel/close、缺失目标、reduced-motion |
| 边界 | Teleport 不创建模态语义；原生 dialog 才负责 top layer |

## 1. 任务背景

对话框常因父容器 `overflow`、transform 或 stacking context 被裁切，所以需要把 DOM 移到页面顶层。Teleport 解决挂载位置，却不会自动提供焦点限制、背景不可交互、Escape 或名称。

本课使用原生 `<dialog>.showModal()` 获得浏览器模态行为，Teleport 到稳定 `#overlays`，再让组件 model、dialog open 状态和焦点恢复保持一致。

## 2. 学习目标

- 解释 Teleport 改变 DOM 位置但不改变逻辑组件树。
- 使用 `aria-labelledby` 为 dialog 建立名称。
- 同步 `defineModel`、`cancel`、关闭按钮和原生 close。
- 在快速开关中检查最新 model，避免旧异步回调重开。
- 为 Transition 提供 reduced-motion 降级并恢复触发器焦点。

## 3. 预备知识

在 `index.html` 的应用根节点之后准备稳定目标：

```html
<div id="app"></div>
<div id="overlays"></div>
```

目标必须在 Teleport 挂载时存在。`defer` 只协调同一更新 tick，不是“等待任意异步节点出现”。SSR 中不要在 setup 模块顶层读取 `document`。

## 4. 核心理论

### 4.1 三层责任

| 层 | 责任 |
| --- | --- |
| Teleport | DOM 放到稳定 overlay 容器 |
| 原生 dialog/showModal | top layer、背景 inert、默认焦点约束、Escape cancel |
| Vue model/Transition | 声明开关、同步事件、进入离开样式 |

仅给 `<div role="dialog">` 不会自动限制背景焦点；自定义模态还需要完整焦点循环、inert 和恢复逻辑。

### 4.2 焦点生命周期

打开前保存 `document.activeElement`。dialog 挂载后调用 `showModal()`，`autofocus` 把初始焦点放在安全操作。关闭流程先把 model 设为 false，让 leave 完成，再恢复之前的触发器。触发器若已被删除，`isConnected` 检查可避免 focus 无效节点。

### 4.3 状态同步

Escape 触发 `cancel`；`.prevent` 阻止浏览器自行关闭，使 model 成为关闭入口。浏览器或代码产生 `close` 时仍把 model 同步成 false。watch 在 `await nextTick()` 后重新检查 `open.value`，避免用户快速开关时旧回调打开已关闭 dialog。

## 5. 元素、属性、API 或配置清单

| 元素/API | 作用 | 本课用法 | 边界 |
| --- | --- | --- | --- |
| `<Teleport to>` | 移动真实 DOM | `#overlays` | 不改变 inject/事件 |
| `<dialog>` | 对话框元素 | 配合 `showModal` | `open` 属性不是完整模态 |
| `showModal()` | 进入 top layer | 节点挂载后调用 | 重复调用会抛错 |
| `cancel` | Escape 请求关闭 | prevent 后走 model | 与 `close` 不同 |
| `close` | 对话框已关闭 | 同步 model | 不代表业务确认 |
| `aria-labelledby` | 可访问名称 | 指向标题 ID | ID 必须唯一 |
| `autofocus` | 初始焦点 | 放在取消按钮 | 每 dialog 只一个 |
| `<Transition>` | 进入/离开类 | opacity/transform | 不延迟业务成功 |
| `prefers-reduced-motion` | 用户动态偏好 | 去除非必要过渡 | 不隐藏状态变化 |

## 6. 最小可运行案例

**完整文件：`apps/vue-web/src/ConfirmDialog.vue`**

```vue
<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'

const open = defineModel<boolean>({ required: true })
defineProps<{ title: string }>()
const emit = defineEmits<{ confirm: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const titleId = useId()
let previous: HTMLElement | null = null

watch(open, async value => {
  if (value) {
    previous = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    await nextTick()
    if (!open.value || !dialog.value || dialog.value.open) return
    dialog.value.showModal()
  }
}, { flush: 'post' })

function requestClose() {
  open.value = false
}

function confirm() {
  emit('confirm')
  requestClose()
}

function restoreFocus() {
  if (previous?.isConnected) previous.focus()
  previous = null
}

onBeforeUnmount(() => {
  if (dialog.value?.open) dialog.value.close()
})
</script>

<template>
  <Teleport to="#overlays">
    <Transition name="dialog" @after-leave="restoreFocus">
      <dialog
        v-if="open"
        ref="dialog"
        :aria-labelledby="titleId"
        @cancel.prevent="requestClose"
        @close="open = false"
      >
        <h2 :id="titleId">{{ title }}</h2>
        <slot />
        <div class="actions">
          <button type="button" autofocus @click="requestClose">取消</button>
          <button type="button" @click="confirm">确认</button>
        </div>
      </dialog>
    </Transition>
  </Teleport>
</template>

<style scoped>
dialog {
  max-width: min(30rem, calc(100vw - 2rem));
  border: 1px solid #536b5d;
  border-radius: 0.5rem;
}
dialog::backdrop { background: rgb(0 0 0 / 45%); }
.dialog-enter-active,
.dialog-leave-active { transition: opacity 160ms ease, transform 160ms ease; }
.dialog-enter-from,
.dialog-leave-to { opacity: 0; transform: translateY(0.5rem); }
@media (prefers-reduced-motion: reduce) {
  .dialog-enter-active,
  .dialog-leave-active { transition: none; }
}
</style>
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm typecheck
pnpm build
pnpm dev --host 127.0.0.1 --port 5174 --strictPort
```

调用组件用一个按钮设置 `open = true`。Tab 不应进入背景，Escape 后焦点回按钮。错误实验是删除 `#overlays`：Console 显示 Teleport 目标缺失；恢复稳定节点，而不是用定时器等待。

## 7. 邻里集市集成案例

预约确认由页面拥有业务命令，对话框只发确认意图：

**关键片段：`apps/vue-web/src/pages/DetailPage.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue'
import ConfirmDialog from '../ConfirmDialog.vue'

const confirmOpen = ref(false)
const pending = ref(false)
const feedback = ref('')

async function reserve() {
  pending.value = true
  feedback.value = ''
  try {
    await createReservation()
    feedback.value = '预约成功。'
  } catch (error) {
    feedback.value = toMessage(error)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <button type="button" :disabled="pending" @click="confirmOpen = true">
    预约
  </button>
  <ConfirmDialog
    v-model="confirmOpen"
    title="确认预约九成新台灯"
    @confirm="reserve"
  >
    <p>提交后仍由服务器检查登录、商品状态和唯一预约。</p>
  </ConfirmDialog>
  <p v-if="feedback" :role="feedback === '预约成功。' ? 'status' : 'alert'">
    {{ feedback }}
  </p>
</template>
```

dialog 的“确认”不直接改 Listing，也不声称成功；真正结果由 API 返回。409 时保留详情并提示刷新，不自动重复非幂等预约。

## 8. 常见错误与排查路径

**错误示例：只加 role 的自定义 div。**

```html
<div role="dialog"><button>确认</button></div>
```

| 现象 | 证据 | 原因 | 修复 | 复验 |
| --- | --- | --- | --- | --- |
| Tab 进入背景 | activeElement 落到页面链接 | 非模态 div | 原生 showModal 或完整焦点管理 | Tab 限制在 dialog |
| Escape 关闭但 model 仍 true | dialog 消失、Vue 状态未变 | 未处理 cancel/close | 统一走 requestClose | 再打开正常 |
| 关闭后焦点丢失 | activeElement 为 body | 未保存触发器 | 打开前保存，leave 后恢复 | 按钮 focused |
| 快速开关又重开 | 旧 nextTick 回调执行 | await 后未检查最新值 | 检查 `open.value` | 最终保持关闭 |
| 动画让用户不适 | reduced-motion 仍 160ms | 媒体查询缺失 | transition none | 模拟偏好后为 0 |
| 对话框被裁切 | DOM 仍在 overflow 容器 | 未 Teleport/目标错误 | 稳定 overlays | 视口内完整显示 |

## 9. 课后题

1. **Teleport 是否改变 provide/inject 来源？**<br>
   答：不改变，依赖按逻辑组件树解析。
2. **为什么不能只写 `<dialog open>`？**<br>
   答：`open` 只显示非模态 dialog；`showModal()` 才进入 top layer 并使背景不可交互。
3. **确认事件为何不直接显示“预约成功”？**<br>
   答：确认只是用户意图，后端仍可能返回 401/403/409/503。
4. **减少动态是否意味着删除所有状态反馈？**<br>
   答：不是，只去除非必要运动；成功/失败内容仍立即可见。

## 10. 实践练习

**基础：焦点恢复。**分别用 Escape、取消、确认关闭，断言触发器重新获得焦点。

**进阶：快速开关。**同一 tick 打开再关闭，最终 dialog 不应打开且 Console 无异常。

**故障注入：删除 overlay。**保存 Console 证据，恢复目标后复验。禁止用任意 `setTimeout` 掩盖接线错误。

## 11. 阶段验收

- [ ] dialog 有可访问名称且标题 ID 唯一。
- [ ] showModal 只在节点存在且未打开时调用。
- [ ] Escape、取消、确认、原生 close 均同步 model。
- [ ] 关闭后焦点回原触发器。
- [ ] Tab 不进入背景，320px 对话框不溢出视口。
- [ ] reduced-motion 下无非必要过渡。
- [ ] Teleport 缺失目标故障可复现并修复。
- [ ] 业务成功只由 API 响应决定。

## 12. 常见问题

**Teleport 可以直接到 body 吗？**<br>
客户端简单场景可行，但 SSR hydration 和多 overlay 管理更难。使用专用稳定容器更可控。

**原生 dialog 是否完全不需要测试？**<br>
仍需在目标浏览器验证焦点、关闭事件、样式和辅助技术；浏览器实现也有兼容差异。

**Transition 应等待 API 完成再关闭吗？**<br>
取决于交互。本例确认后关闭，再在页面显示 pending/结果；也可保持 dialog 显示 pending，但不能用动画假装请求成功。

## 13. 扩展阅读

资料快照日期：2026-10-10。

- [Vue Teleport](https://vuejs.org/guide/built-ins/teleport.html)：逻辑树与目标规则。
- [Vue Transition](https://vuejs.org/guide/built-ins/transition.html)：进入离开类与 JavaScript hooks。
- [MDN dialog](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog)：模态、cancel、close 和焦点。
- [WAI-ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)：名称、焦点与键盘期望。

## 我现在能做到什么

我能把 DOM 挂载、原生模态语义和 Vue 状态分层实现，并验证键盘、焦点恢复与减少动态边界。

## 单元导航

[上一课：测量与浅层响应](01-performance-shallow-reactivity-measurement.md) · [返回章目录](../README.md#第七章性能证据与进阶-vue) · [下一课：KeepAlive 与异步组件](03-keepalive-async-components-lifecycle.md)
