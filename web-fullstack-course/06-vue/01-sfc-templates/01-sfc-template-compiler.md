# SFC 结构、模板编译与安全输出

## 任务卡

| 项目 | 内容 |
| --- | --- |
| 本课任务 | 用一个可观察探针解释 `.vue` 文件从源码到 DOM 的过程 |
| 可观察产出 | `SfcProbe.vue`、安全商品预览和一份编译/运行边界记录 |
| 运行条件 | Node.js 24 LTS、Vue 3.5.43、Vite 8；版本以实际安装输出为准 |
| 建议时间 | 90 至 120 分钟 |
| 完成证据 | 页面输出、Console 实例计数、一次 `v-html` 错误实验和构建结果 |

## 1. 任务背景

浏览器认识 HTML、CSS 和 JavaScript，却不认识 `.vue`。邻里集市把模板、组件逻辑和局部样式
放在一个单文件组件（Single-File Component，SFC）中，Vite 的 Vue 插件再把它们编译成
浏览器可以加载的 JavaScript 与 CSS。

本课先建立这条因果链。示例数据写在源码中，页面必须标为静态教学预览；它不调用 API、
不证明数据持久化，也不因为使用了 Vue 就自动获得安全授权。

## 2. 学习目标

完成后你应能：

1. 说明 `<script setup>`、`<template>` 和 `<style scoped>` 的职责；
2. 区分模块求值、组件实例建立、渲染更新和 DOM 提交；
3. 解释模板表达式、属性绑定与文本插值怎样被编译；
4. 证明文本插值会转义 HTML，并说出 `v-html` 的信任边界；
5. 解释 scoped style 为什么不是 Shadow DOM；
6. 用真实错误证据定位编译错误、挂载错误和运行时错误。

## 3. 预备知识

先完成[章入口](../01-sfc-templates.md)中的边界阅读，并准备由
`pnpm create vite ... --template vue-ts` 创建的个人练习工程。若尚未创建，可先阅读本课，
再在第 3 课统一建立工程。

需要区分：

- 源文件：编辑器中的 `.vue` 文本；
- 编译产物：插件生成的 JavaScript 渲染函数与 CSS；
- 组件实例：每次使用组件时建立的运行状态；
- DOM：浏览器当前文档中的节点，不等于源文件。

## 4. 核心理论

### 4.1 从 SFC 到页面

开发环境的主要路径是：

```text
.vue 源码
  → @vitejs/plugin-vue 解析三个区块
  → 模板编译为渲染函数
  → script setup 编译为组件 setup
  → CSS 提取或注入
  → 浏览器加载模块
  → Vue 创建实例并提交 DOM
```

Vite 负责模块图、开发服务和构建；Vue 编译器负责理解 SFC 与模板。页面能打开只证明转译和
运行经过了当前路径，不证明 `vue-tsc` 已检查模板属性，也不证明生产构建成功。

### 4.2 实例作用域与模块作用域

`<script setup>` 中的普通顶层语句会成为组件 `setup()` 的一部分，每创建一个实例就执行一次。
真正的模块级共享值应放在普通 `<script>` 或外部 `.ts` 模块中。共享可变模块变量会跨实例，
在 SSR 中还可能跨请求，因此默认不要把用户状态放在那里。

编译宏 `defineProps`、`defineEmits` 和 `defineModel` 由编译器处理，不需要从 `vue` 导入。
`ref`、`computed` 等运行时 API 则需要真实导入。把宏和运行时 API 混为一谈，会导致不存在的
导入或错误的生命周期推断。

### 4.3 模板不是任意程序

模板插值 `{{ expression }}` 和绑定 `:attribute="expression"` 接受 JavaScript 表达式，
但不应承担循环语句、网络写入或复杂业务规则。模板每次重新求值时，副作用可能重复发生。
复杂纯计算放进函数或后续的 `computed`；用户写操作放进事件处理器。

静态属性 `title="listing.title"` 的值就是文字 `listing.title`。动态绑定必须写
`:title="listing.title"` 或 `v-bind:title="listing.title"`。

### 4.4 转义与 `v-html`

文本插值把 `<`、`>` 等字符作为文字写入文本节点，用户描述不会直接成为可执行标签。
`v-html` 则把字符串交给 `innerHTML`，绕开文本转义。它只能接收已经由可信、经过审计的
HTML 净化流程产生的内容；类型为 `string` 不是安全证明。

### 4.5 scoped style 的真实边界

`<style scoped>` 会让编译器给当前组件节点添加属性，并改写选择器。它仍然使用普通 DOM：

- 继承属性仍会跨组件边界；
- CSS 自定义属性仍可从祖先传入；
- `:deep()` 可穿透到子组件实现，因而应谨慎；
- 全局 reset、页面背景和字体仍属于全局样式；
- 它不提供脚本、数据或安全隔离。

## 5. 元素、属性、API 或配置清单

| 项目 | 作用 | 本课边界 |
| --- | --- | --- |
| `<script setup lang="ts">` | 声明每个组件实例的 setup 逻辑 | 顶层可见于模板，不等于全局变量 |
| `<template>` | 声明渲染结构 | 表达式应保持纯净 |
| `<style scoped>` | 给选择器增加编译期作用域属性 | 不是 Shadow DOM 或安全沙箱 |
| `{{ value }}` | 输出转义后的文本 | 不渲染可信富文本 |
| `v-bind` / `:` | 把表达式结果绑定到属性或 prop | 无冒号时是静态字符串 |
| `v-html` | 设置元素 `innerHTML` | 禁止直接接收商品描述等外部输入 |
| `createApp` | 创建客户端应用 | 仍需正确挂载目标 |
| `.mount('#app')` | 把应用挂载到现有 DOM 容器 | 选择器必须与 `index.html` 一致 |
| `@vitejs/plugin-vue` | 让 Vite 处理 Vue SFC | 不替代 `vue-tsc` |
| `vue-tsc` | 检查 TypeScript 与模板类型 | 不运行浏览器交互 |

## 6. 最小可运行案例

在 Vite Vue TypeScript 工程中创建探针组件。

**完整文件：`apps/vue-web/src/lessons/SfcProbe.vue`**

```vue
<script setup lang="ts">
const source = '<strong>只显示文字，不执行 HTML</strong>'
const generatedAt = '2026-10-11T08:00:00.000Z'

console.count('SfcProbe setup')
</script>

<template>
  <section aria-labelledby="sfc-probe-title">
    <h2 id="sfc-probe-title">SFC 编译探针</h2>
    <p data-testid="escaped">{{ source }}</p>
    <p>
      持久化时间：
      <time :datetime="generatedAt">{{ generatedAt }}</time>
    </p>
  </section>
</template>

<style scoped>
section {
  border-inline-start: 0.25rem solid #17624b;
  padding-inline-start: 1rem;
}
</style>
```

先在 `App.vue` 导入并使用一次，再使用两次。

**关键片段：`apps/vue-web/src/App.vue`**

```vue
<script setup lang="ts">
import SfcProbe from './lessons/SfcProbe.vue'
</script>

<template>
  <main>
    <h1>Vue 编译实验</h1>
    <SfcProbe />
    <SfcProbe />
  </main>
</template>
```

**命令：在 `apps/vue-web` 执行**

```bash
pnpm dev --host 127.0.0.1
```

打开终端输出给出的地址。预期页面显示两段带尖括号的文字，Elements 中没有额外的
`strong` 节点；Console 中 `SfcProbe setup` 计数为 2。开发模式热更新可能增加后续计数，
所以验收时先刷新一次并清空 Console。

逐步扩展顺序：

1. 只保留标题，确认 SFC 能编译；
2. 加入 `source` 插值，观察转义；
3. 加入 `:datetime`，比较静态与动态属性；
4. 使用两次组件，观察实例 setup 次数；
5. 在 Elements 中查看 scoped 属性，确认它不是 shadow root。

## 7. 邻里集市集成案例

下面的预览只负责安全显示一件静态商品，不引入 props；组件契约在下一课建立。

**完整文件：`apps/vue-web/src/lessons/SafeListingPreview.vue`**

```vue
<script setup lang="ts">
const listing = {
  id: 'lamp-1',
  title: '九成新台灯',
  description: '<img src=x onerror=alert(1)> 暖光，功能正常。',
  priceCents: 3500,
  status: 'available',
  ownerId: 'seller-1',
  version: 1,
  createdAt: '2026-10-01T08:00:00.000Z',
} as const

const displayPrice = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
}).format(listing.priceCents / 100)
</script>

<template>
  <article :aria-labelledby="`preview-${listing.id}`">
    <p><strong>静态教学数据，不创建真实预约。</strong></p>
    <h2 :id="`preview-${listing.id}`">{{ listing.title }}</h2>
    <p>{{ listing.description }}</p>
    <p>{{ displayPrice }} · 可预约</p>
    <time :datetime="listing.createdAt">
      {{ new Date(listing.createdAt).toLocaleString('zh-CN') }}
    </time>
  </article>
</template>
```

这里 `3500` 是整数分；除以 100 只发生在展示格式化边界。`createdAt` 保持 UTC ISO 8601，
本地化结果不写回领域对象。`as const` 只缩窄源码常量类型，不验证未来 HTTP JSON。

把 `SafeListingPreview` 放进 `App.vue` 后，页面应把 `<img ...>` 原样显示为文字，Console
不出现 alert。该结论只覆盖文本插值，不代表任意富文本输入都安全。

## 8. 常见错误与排查路径

**明确错误示例：不要用于商品描述。**

**关键片段：`apps/vue-web/src/lessons/UnsafePreview.vue`**

```vue
<p v-html="listing.description"></p>
```

如果描述来自卖家，攻击者可注入事件属性或危险链接。修复不是把值断言成某个 TypeScript
类型，而是回到文本插值；确有富文本需求时，在独立信任边界采用经过评审的净化器和 CSP。

### 五段诊断记录

| 项目 | 记录 |
| --- | --- |
| 现象 | 页面空白，Console 提示 `Failed to mount app: mount target selector "#app" returned null` |
| 证据 | `main.ts` 使用 `.mount('#app')`，而 `index.html` 容器被改成 `id="root"` |
| 原因 | Vue 挂载选择器与实际 DOM 容器不一致，不是模板编译失败 |
| 修复 | 恢复 `<div id="app"></div>`，或同步修改唯一挂载选择器 |
| 复验 | 刷新后标题出现；Console 无挂载警告；`pnpm build` 退出 0 |

若终端先报模板语法错误，优先读取插件给出的文件、行列和 code frame；若终端构建成功但页面
报错，再看 Console 与 Network。不要通过删除 `<script setup>`、关闭 strict 或改成 `any`
来掩盖真实错误。

## 9. 课后题

1. 浏览器为什么不能直接把 `.vue` 当普通 JavaScript 执行？
2. `<script setup>` 顶层语句为什么可能执行多次？
3. `title="listing.title"` 与 `:title="listing.title"` 有何区别？
4. scoped style 是否能阻止父级字体继承？
5. 文本插值安全是否等于整个应用没有 XSS？

**参考答案：**

1. `.vue` 是需要 SFC 编译器解析的容器格式，浏览器没有对应模块语义。
2. 它被编译进组件 setup，每个实例各运行一次。
3. 前者是固定文字，后者求值并绑定表达式结果。
4. 不能；普通 CSS 继承仍然存在。
5. 不等于。它只保证该文本输出路径进行转义，`v-html`、URL、第三方脚本等边界仍需审查。

## 10. 实践练习

### 基础：观察实例

给 `SfcProbe` 增加 `const instanceCreatedAt = Date.now()` 并显示结果，使用两个实例。

**答案标准：**两个实例分别建立值；不得把用户状态放到外部模块再假装实例隔离。

### 进阶：比较动态属性

增加一个 `data-created-at` 动态属性，并在 Elements 中核对值。

**参考答案：**

```vue
<p :data-created-at="generatedAt">{{ generatedAt }}</p>
```

属性值应为完整 UTC 字符串。不要为了显示本地时间而改写机器值。

### 故障注入：破坏模板闭合

删除一个 `</section>`，保存并记录 Vite 错误；修复后再运行类型检查与构建。

**答案标准：**记录必须包含现象、终端 code frame、根因、修复和复验；不能只写“刷新好了”。

## 11. 阶段验收

- [ ] 能画出 SFC 源码到 DOM 的五步路径。
- [ ] 两个探针实例产生两次初始 setup 证据。
- [ ] 危险描述以文字显示，没有被 `v-html` 执行。
- [ ] `3500` 分显示为 35 元，源值没有改成浮点元。
- [ ] UTC 原值和本地展示值职责分离。
- [ ] `pnpm typecheck` 与 `pnpm build` 均通过。
- [ ] 已完成一次挂载错误或模板错误诊断闭环。

本课不验收网络、认证、持久化或权限。出现静态卡片不能写成“商品已经发布”。

## 12. 常见问题

**为什么开发模式看到更多 setup 计数？**

热更新会重新执行受影响模块或重建实例。先硬刷新并清空 Console，再记录可比较证据。

**能否在模板直接调用格式化函数？**

纯函数可以。会发请求、修改数组或写日志的副作用函数不应因渲染而执行。

**所有样式都应 scoped 吗？**

不是。页面字体、背景、reset 和焦点基线通常属于全局；组件内部结构可使用 scoped。

**为什么本课不直接使用 `v-html` 加粗描述？**

商品描述属于外部可控数据。视觉需求不能取消输入信任边界。

## 13. 扩展阅读

以下资料快照日期为 **2026-10-11**：

- [Vue：单文件组件](https://vuejs.org/guide/scaling-up/sfc.html)
- [Vue：`<script setup>`](https://vuejs.org/api/sfc-script-setup.html)
- [Vue：模板语法](https://vuejs.org/guide/essentials/template-syntax.html)
- [Vue：SFC CSS 特性](https://vuejs.org/api/sfc-css-features.html)
- [Vue：安全](https://vuejs.org/guide/best-practices/security.html)
- [Vite：插件 API](https://vite.dev/guide/api-plugin.html)

版本事实以[全书版本基线](../../00-guide/02-version-baseline.md)和实际 `pnpm list` 输出为准；
本课不根据文档发布日期猜测本机补丁版本。

## 我现在能做到什么

我能解释 Vue SFC 的编译和实例边界，能选择文本插值而不是不受信任的 `v-html`，并能用
编译、挂载和浏览器证据定位不同层的失败。

## 单元导航

[返回章入口](../01-sfc-templates.md) ·
[下一课：Props、插槽、指令与列表身份](02-props-slots-list-identity.md)
