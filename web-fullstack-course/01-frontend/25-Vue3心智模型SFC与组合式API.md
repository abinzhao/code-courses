# 25-Vue3 心智模型、SFC 与组合式 API

## 目标

完成本知识单元后，学员应建立 Vue 的第一套心智模型，并能把已经掌握的 React 经验准确迁移过来，而不是把 Vue 当成“另一套需要死记的标签”。

学员应能够：

1. 用自己的语言解释 Vue 的声明式渲染：模板如何描述“数据与界面的对应关系”，以及它与 React 中 `UI = f(state)` 的异同。
2. 说出 Vue 响应式更新与 React 状态驱动重渲染在触发方式上的差异，并能在调试工具中观察这一差异。
3. 使用 `createApp` 创建并挂载 Vue 应用，理解应用实例、根组件与挂载点的关系。
4. 编写结构完整的单文件组件（SFC），正确组织 `template`、`<script setup>` 与 `<style scoped>` 三个区块。
5. 使用插值与 `v-bind`、`v-on`、`v-if`/`v-show`、`v-for` 完成界面表达，并能解释 `key` 的作用。
6. 使用 `computed` 表达派生数据、使用 `watch` 处理需要响应变化的副作用，并通过 `defineProps`/`defineEmits` 配合 TypeScript 定义组件输入输出。

本单元聚焦心智模型与 SFC 基础。响应式原理（Proxy、`ref`/`reactive` 的内部机制）、组件通信进阶与 Composables 将在下一单元展开；路由与状态库在随后两个单元讲解。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Vue 当前稳定版（3.5+，开课确认最新） | 构建用户界面的渐进式框架 | 理解声明式模板、响应式与组件 |
| Vite 当前稳定版 | 本地开发服务器与构建工具 | 能创建项目、启动开发服务器、执行构建 |
| TypeScript 当前稳定版 | 为组件、props 与状态提供静态类型 | 能为 props、emits 与变量标注类型 |
| Node.js 当前 LTS 与 npm | 运行工具链 | 能安装依赖并执行 npm 脚本 |
| Vue DevTools 浏览器扩展当前稳定版 | 观察组件树与响应式状态 | 能查看组件层级、props、事件与状态 |
| VS Code 与 Volar（Vue - Official） | SFC 语言支持 | 能获得模板类型检查与跳转能力 |

创建项目的命令：

```bash
npm create vite@latest vue-mental-model -- --template vue-ts
cd vue-mental-model
npm install
npm run dev
```

说明：

- 课程统一使用 Vue 3 与组合式 API（Composition API）的 `<script setup>` 写法，不以 Vue 2 作为主线。
- 选项式 API（Options API）只要求能够读懂存量项目，不作为新代码的主要写法。
- 不写死小版本号；遇到 API 行为差异时，以当前安装版本的官方文档为准。
- TypeScript 配置以 Vite 的 vue-ts 模板默认值为准，本单元不要求自定义复杂编译选项。
- 编辑 SFC 请使用 Volar（在新版本编辑器中名称为 Vue - Official），旧的 Vetur 不作为主线工具。

## 详细的理论知识讲解和示例伪代码

### 1. Vue 的声明式心智模型：响应式数据驱动模板

#### 1.1 定义

Vue 是声明式的 UI 框架。开发者在模板中描述“当数据是某个值时，界面应该呈现什么结构”，由框架负责把真实 DOM 变成模板所描述的样子。数据变化后，开发者不需要手动查找节点、改属性、增删子元素，框架会让 DOM 与新的数据保持一致。

Vue 的核心可以概括为三句话：

```text
响应式数据是事实来源
模板是数据到界面的声明式描述
数据变化后，框架只更新受影响的 DOM
```

与 React 对照，两者目标相同，触发路径不同：

| 方向 | React | Vue |
|---|---|---|
| UI 描述方式 | JSX | 模板（template） |
| 更新触发 | 调用 `setState` 后重新执行组件函数 | 修改响应式数据后，依赖该数据的视图自动更新 |
| 更新粒度思想 | 组件级重渲染，再比较差异 | 基于响应式依赖定位受影响的更新点 |
| 逻辑复用 | 自定义 Hook | Composable（组合式函数） |
| 文件组织 | TSX 加 CSS 文件 | 单文件组件 SFC |

React 的公式是 `UI = f(state)`：状态变化后重新调用渲染函数，计算出新的界面描述，再把差异更新到 DOM。Vue 同样满足“界面由数据决定”，但开发者通常不直接面对“重新执行整个组件函数”这一过程，而是修改被追踪的响应式数据，由框架根据依赖关系把变化送到模板中使用该数据的位置。

#### 1.2 与 Web 的关系

浏览器原生只提供命令式的 DOM API。不用框架时，切换一条会员横幅需要手动操作多个属性：

```ts
const banner = document.querySelector('#banner');

if (banner) {
  banner.textContent = user.isVip ? '欢迎回来，尊贵会员' : '欢迎回来';
  banner.className = user.isVip ? 'banner banner-vip' : 'banner';
}
```

同一件事用 Vue 模板表达，只描述数据与界面的对应关系：

```vue
<script setup lang="ts">
import { ref } from 'vue';

const isVip = ref(true);
</script>

<template>
  <div :class="isVip ? 'banner banner-vip' : 'banner'">
    {{ isVip ? '欢迎回来，尊贵会员' : '欢迎回来' }}
  </div>
</template>
```

不需要查询节点，也不需要在每条分支里记得改全属性。当 `isVip` 被赋予新值时，`class` 与文本会自动与它保持一致。这与 React 中“只改 state、不直接改 DOM”的纪律是同一种工程思想。

#### 1.3 常见误区

> Vue 是声明式的，所以完全不能碰 DOM。

声明式是主线，但确实存在需要读取焦点、滚动位置或对接第三方 DOM 库的场景，这些将在下一单元的模板引用（`ref` 属性）中处理。业务 UI 更新应默认通过响应式数据与模板表达，而不是随手 `document.querySelector` 改内容。

> Vue 靠“数据绑定时轮询检查值有没有变”来更新界面。

Vue 不需要轮询。它通过响应式系统在读取数据时收集依赖、在写入数据时通知依赖方，下一单元会从 Proxy 层面解释这一机制。

> Vue 和 React 一个“响应式”、一个“不响应式”。

两者都是数据驱动的声明式框架，差别在更新的触发与调度方式，而不是一个会响应数据、一个不会。

### 2. createApp：创建并挂载 Vue 应用

#### 2.1 定义

每个 Vue 应用从一个应用实例开始。`createApp` 接收根组件，返回应用实例；调用实例的 `mount` 方法，把应用挂载到页面中的一个 DOM 元素上。

```text
createApp(根组件)  →  应用实例
应用实例.mount(挂载点选择器)  →  应用渲染到该 DOM 节点内部
```

一个最小的入口文件如下：

```ts
// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

createApp(App).mount('#app');
```

对应的 HTML 只需要一个挂载点：

```html
<!-- index.html（节选） -->
<div id="app"></div>
<script type="module" src="/src/main.ts"></script>
```

#### 2.2 与 Web 的关系

挂载点是“框架管辖范围”的边界。Vue 会把根组件渲染到 `#app` 内部，并接管其中的更新；挂载点之外的区域仍是普通 HTML，可以由静态页面或其他脚本管理。理解这一点有助于解释“为什么 Vue 不更新挂载点外部的内容”。

与 React 对照，两者结构几乎一一对应：

```ts
// React 19 的等价入口
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
```

```text
React：createRoot(容器).render(<App />)
Vue  ：createApp(App).mount('#app')
```

应用实例还可以在挂载前注册全局能力，例如插件、全局组件与全局指令：

```ts
import { createApp } from 'vue';
import App from './App.vue';
import { pinia } from './plugins/state';

const app = createApp(App);

app.use(pinia);
app.mount('#app');
```

本单元只要求理解 `app.use` 是“在挂载前给应用安装插件”的入口，路由与 Pinia 的具体安装在后续单元完成。

#### 2.3 常见误区

> `mount` 写在任何位置都可以。

应先完成插件注册再 `mount`，否则根组件渲染时可能拿不到插件提供的能力。推荐固定写法：创建实例、注册插件、最后挂载。

> 一个页面只能有一个 Vue 应用。

技术上可以创建多个应用实例并挂载到不同节点，微前端或渐进改造旧系统时常见；但新项目默认使用单一应用实例，配合组件树组织全部界面。

### 3. 单文件组件 SFC：template、script setup 与 style scoped

#### 3.1 定义

单文件组件（Single-File Component，SFC）是把一个组件的模板、逻辑与样式集中在一个 `.vue` 文件中的组织方式。一个完整 SFC 通常包含三个区块：

```vue
<script setup lang="ts">
// 组件逻辑：状态、函数、导入、类型
</script>

<template>
  <!-- 组件结构：HTML 风格的声明式模板 -->
</template>

<style scoped>
/* 组件样式：scoped 表示只作用于当前组件 */
</style>
```

三个区块的职责：

- `<script setup lang="ts">`：编写组合式 API 逻辑。`setup` 表示其中声明的顶层变量与函数可以直接在模板中使用；`lang="ts"` 启用 TypeScript。
- `<template>`：声明组件渲染的结构，使用 HTML 语法加上 Vue 指令与插值。
- `<style scoped>`：编写组件样式，`scoped` 通过给元素添加属性标识，把样式限制在当前组件内部。

#### 3.2 与 Web 的关系

SFC 最终被构建工具编译：模板编译成渲染函数，脚本编译成标准 JavaScript 模块，样式经过作用域处理后注入。浏览器收到的仍是普通 JS 与 CSS，`.vue` 只是源码层面的组织形式。

一个完整示例：

```vue
<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);

function increment() {
  count.value += 1;
}
</script>

<template>
  <section class="counter-card">
    <h2>计数示例</h2>
    <p>当前值：{{ count }}</p>
    <button type="button" class="primary" @click="increment">加一</button>
  </section>
</template>

<style scoped>
.counter-card {
  padding: 16px;
  border: 1px solid #d0d7de;
  border-radius: 8px;
}

.primary {
  background-color: #1f6feb;
  color: #ffffff;
}
</style>
```

注意在 `<script setup>` 中读取或修改 `ref` 创建的状态要使用 `.value`，而在模板中 Vue 会自动解包，直接写 `count` 即可。`ref` 的完整原理在下一单元展开，本单元先建立“脚本里用 `.value`、模板里直接用”的使用习惯。

`scoped` 的边界：

```vue
<style scoped>
/* 只命中当前组件模板中的 .card，不会泄漏到子组件根节点以外的元素 */
.card {
  margin-bottom: 12px;
}
</style>
```

当确实需要影响子组件内部样式时，可使用 `:deep()` 伪类，但应把它当成例外而不是默认手段：

```vue
<style scoped>
.card :deep(.child-title) {
  font-weight: 600;
}
</style>
```

#### 3.3 常见误区

> `<script setup>` 里声明的变量要像 React 那样 `return` 出去模板才能用。

`<script setup>` 会自动把顶层绑定暴露给模板，声明后直接在模板中使用即可，不需要也不能写 `return` 清单。

> `style scoped` 等于给样式加了命名空间，可以随便写重名类。

`scoped` 通过属性选择器限制作用域，类名仍应保持语义清晰；过度依赖短类名与深层选择器会让样式难以追踪。

> 三个区块的顺序必须固定为 script、template、style。

语言上区块顺序不影响功能，但团队通常约定统一顺序（本课程示例统一为 script、template、style），减少阅读差异。

### 4. 插值与指令：v-bind、v-on 与事件处理

#### 4.1 定义

插值使用双花括号把数据渲染为文本：

```text
{{ 表达式 }}
```

指令是模板中以 `v-` 开头的特殊属性，用于把响应式行为应用到模板上。本单元首先使用两个最核心的指令：

- `v-bind`：把数据绑定到元素属性，缩写为冒号 `:`。
- `v-on`：绑定事件监听，缩写为 `@`。

```text
v-bind:属性名="表达式"   等价于   :属性名="表达式"
v-on:事件名="处理函数"   等价于   @事件名="处理函数"
```

#### 4.2 与 Web 的关系

插值与属性绑定对应原生 DOM 的文本节点与元素属性；事件绑定对应 `addEventListener`。Vue 让这些关系直接在模板中可读，并且在数据变化、组件卸载时自动维护与清理。

```vue
<script setup lang="ts">
import { ref } from 'vue';

const articleUrl = ref('https://example.com/articles/1');
const imageAlt = ref('课程封面图');
const clicks = ref(0);

function trackOpen() {
  clicks.value += 1;
}
</script>

<template>
  <div>
    <a :href="articleUrl" target="_blank" rel="noreferrer" @click="trackOpen">
      打开原文（已点击 {{ clicks }} 次）
    </a>
    <img src="/cover.png" :alt="imageAlt" width="240" />
  </div>
</template>
```

在模板中可以写表达式，例如字符串拼接与三元运算：

```vue
<template>
  <button type="button" :disabled="clicks >= 5">
    {{ clicks < 5 ? `还能点击 ${5 - clicks} 次` : '今日次数已用完' }}
  </button>
</template>
```

事件处理可以直接调用函数并传入参数。需要访问原生事件时，使用内置的 `$event`：

```vue
<script setup lang="ts">
function remove(id: number) {
  console.log('删除', id);
}
</script>

<template>
  <button type="button" @click="remove(3)">删除</button>
  <button type="button" @click="remove(3)">删除（同源）</button>
</template>
```

事件修饰符用于表达常见事件语义，避免在处理函数里写样板代码：

```text
@click.prevent   阻止默认行为，对应 event.preventDefault()
@click.stop      阻止冒泡，对应 event.stopPropagation()
@submit.prevent  阻止表单默认提交，表单处理中最常用
@keyup.enter     只在按下 Enter 键时触发
```

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <input type="text" @keyup.enter="handleSubmit" />
    <button type="submit">保存</button>
  </form>
</template>
```

在 TypeScript 中为内联事件标注原生事件类型：

```vue
<script setup lang="ts">
function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  console.log(target.value);
}
</script>

<template>
  <input type="text" @input="handleInput" />
</template>
```

#### 4.3 常见误区

> `{{ }}` 可以渲染 HTML 标签。

双花括号只渲染为文本，写入的标签会被转义，这是防止跨站脚本攻击的重要保护。确需渲染受信任的 HTML 时才使用 `v-html`，且必须确保内容来源可信、经过净化。

> 绑定事件要写成 `@click="handleClick()"` 才会在点击时执行。

写成 `@click="handleClick"` 是把函数作为监听器；写成带括号形式是在点击时执行该表达式。需要传参时才使用括号，无参时两种形式都可用，但默认推荐直接给函数引用。

> 插值里可以写 `if` 语句。

花括号里只能写表达式，不能写语句；条件逻辑用三元表达式，或在 `<script setup>` 中先计算好变量。

### 5. 条件渲染与列表渲染：v-if、v-show、v-for 与 key

#### 5.1 定义

- `v-if`：根据条件决定是否真正渲染该元素及其内容，条件为假时节点不存在于 DOM 中。
- `v-else`/`v-else-if`：与 `v-if` 配合表达分支。
- `v-show`：根据条件切换元素的 `display`，元素始终保留在 DOM 中。
- `v-for`：根据数组或对象批量渲染一组结构相似的元素。
- `:key`：为列表中的每个节点提供稳定身份标识，帮助框架在更新前后正确对应节点。

#### 5.2 与 Web 的关系

页面中的提示面板、空态、表格行、导航项都依赖条件与列表渲染。框架根据条件增删节点或切换显示，根据数组差异最小化更新 DOM，`key` 正是判断“新旧节点是否同一个”的依据。

```vue
<script setup lang="ts">
import { ref } from 'vue';

type LoadState = 'loading' | 'success' | 'error';

const state = ref<LoadState>('loading');
</script>

<template>
  <section>
    <p v-if="state === 'loading'">正在加载…</p>
    <p v-else-if="state === 'error'" role="alert">加载失败，请稍后重试</p>
    <p v-else>加载完成</p>
  </section>
</template>
```

`v-if` 与 `v-show` 的选择：

```text
v-if ：切换不频繁、希望条件为假时不渲染、不监听内部组件时使用，有真正的销毁与重建成本
v-show：切换非常频繁时使用，只切换 CSS display，初始渲染成本始终存在
```

列表渲染：

```vue
<script setup lang="ts">
type Tag = {
  id: number;
  name: string;
  count: number;
};

const tags: Tag[] = [
  { id: 1, name: '前端', count: 12 },
  { id: 2, name: 'Vue', count: 8 },
];
</script>

<template>
  <ul>
    <li v-for="tag in tags" :key="tag.id">
      {{ tag.name }}（{{ tag.count }}）
    </li>
  </ul>
</template>
```

`v-for` 也支持拿到索引：

```vue
<template>
  <ul>
    <li v-for="(tag, index) in tags" :key="tag.id">
      {{ index + 1 }}. {{ tag.name }}
    </li>
  </ul>
</template>
```

可以遍历对象的值、键与索引，但业务中最常见的仍是数组：

```vue
<template>
  <ul>
    <li v-for="(value, key) in settings" :key="key">{{ key }}：{{ value }}</li>
  </ul>
</template>
```

#### 5.3 key 的作用与规则

`key` 帮助框架判断“这次渲染的某个节点，对应上次渲染的哪个节点”：

- 应使用数据中稳定且唯一的字段，例如业务 id。
- 同一个父节点下的兄弟节点之间，key 不能重复。
- key 只需在兄弟节点间唯一，不要求全局唯一。
- 数组下标作为 key，只在列表永不重新排序、不在中间插入或删除时才可接受；可变列表用下标会让组件状态、输入焦点跟随错误的数据行。

```vue
<script setup lang="ts">
import { ref } from 'vue';

type Article = { id: number; title: string };

const articles = ref<Article[]>([
  { id: 101, title: 'Vue 入门' },
  { id: 102, title: '响应式原理' },
]);
</script>

<template>
  <ul>
    <li v-for="article in articles" :key="article.id">{{ article.title }}</li>
  </ul>
</template>
```

渲染列表时应同时设计空态：

```vue
<template>
  <p v-if="articles.length === 0" class="empty">暂无数据，换个关键词试试</p>
  <ul v-else>
    <li v-for="article in articles" :key="article.id">{{ article.title }}</li>
  </ul>
</template>
```

`v-for` 与 `v-if` 不应放在同一个元素上：两者同时存在时优先级与语义容易混淆，也会带来不必要的计算。需要过滤时，应先用计算属性得到过滤后的数组再渲染，下一节将看到这一写法。

#### 5.4 常见误区

> key 只是为了消除控制台警告，可以用下标或随机数应付。

随机数每次渲染都变化，会让节点被反复销毁重建；下标在可变列表中会造成状态错位。key 直接影响身份判断，属于正确性问题，不是格式问题。

> 用 `v-show` 隐藏了组件，它内部的请求与监听就不会执行。

`v-show` 只是视觉隐藏，组件仍被创建并存活；希望真正停止内部行为时使用 `v-if`。

### 6. 计算属性与侦听器：computed、watch 与 watchEffect

#### 6.1 定义

- 计算属性 `computed`：声明一个由其他响应式数据派生的值，依赖变化时自动重新计算，并缓存结果；依赖未变时多次访问直接返回缓存。
- 侦听器 `watch`：显式指定要侦听的数据源，当数据变化时执行副作用，可以拿到新值与旧值。
- `watchEffect`：立即执行一次回调，自动收集其中用到的响应式依赖，之后任一依赖变化时重新执行。

```text
computed：用于“算出来给界面或逻辑用的值”，有返回值
watch  ：用于“数据变了以后做点什么”，关注副作用
```

#### 6.2 与 Web 的关系

过滤结果、总数、格式化文案、是否可提交等都属于派生数据。在 Vue 中应优先用 `computed` 表达，而不是手动维护一个容易与源数据不一致的副本，这与 React 中“渲染期间直接派生、必要时 `useMemo`”的思想一致。

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';

type KnowledgeItem = {
  id: number;
  title: string;
  favorite: boolean;
};

const keyword = ref('');
const items = ref<KnowledgeItem[]>([
  { id: 1, title: 'Vue 声明式渲染', favorite: true },
  { id: 2, title: 'React Hooks 回顾', favorite: false },
  { id: 3, title: 'TypeScript 类型设计', favorite: true },
]);

const filteredItems = computed(() => {
  const word = keyword.value.trim();
  if (!word) {
    return items.value;
  }
  return items.value.filter((item) => item.title.includes(word));
});

const favoriteCount = computed(() => items.value.filter((item) => item.favorite).length);
</script>

<template>
  <div>
    <input v-model="keyword" type="search" aria-label="关键词" placeholder="搜索条目" />
    <p>收藏数：{{ favoriteCount }}</p>
    <p v-if="filteredItems.length === 0" class="empty">没有匹配的条目</p>
    <ul v-else>
      <li v-for="item in filteredItems" :key="item.id">{{ item.title }}</li>
    </ul>
  </div>
</template>
```

示例中首次出现 `v-model="keyword"`，它在输入框上创建双向绑定：输入变化会更新 `keyword`，而 `keyword` 变化也会反映到输入框。表单绑定的完整细节在第 28 单元展开，本单元先用它配合搜索场景。

计算属性可写：默认计算属性是只读的；当业务确实需要“赋值后反向修改源状态”时，可提供 `get` 与 `set`：

```ts
import { computed, ref } from 'vue';

const firstName = ref('张');
const lastName = ref('三');

const fullName = computed({
  get: () => `${firstName.value}${lastName.value}`,
  set: (value: string) => {
    firstName.value = value.slice(0, 1);
    lastName.value = value.slice(1);
  },
});
```

使用 `watch` 响应明确的数据变化：

```vue
<script setup lang="ts">
import { ref, watch } from 'vue';

const roomId = ref('room-1');

watch(roomId, (newId, oldId) => {
  console.log(`从 ${oldId} 切换到 ${newId}，在此重新连接房间`);
});
</script>

<template>
  <button type="button" @click="roomId = 'room-2'">切换房间</button>
</template>
```

`watchEffect` 适合不关心旧值、希望依赖自动收集的场景：

```ts
import { ref, watchEffect } from 'vue';

const keyword = ref('');

watchEffect(() => {
  // 首次立即执行，之后 keyword 变化时重新执行
  document.title = `搜索：${keyword.value}`;
});
```

侦听多个来源：

```ts
import { ref, watch } from 'vue';

const page = ref(1);
const pageSize = ref(20);

watch([page, pageSize], ([nextPage, nextSize], [oldPage, oldSize]) => {
  console.log('分页参数变化', { oldPage, oldSize, nextPage, nextSize });
});
```

#### 6.3 computed 与 watch 的分工

```text
能用 computed 从已有数据算出来的值，不要用 watch 加一个冗余状态去同步
watch 用于真正的副作用：请求、订阅、操作存储、命令式 API、日志上报
选择顺序：先想“这是派生值还是副作用”，再选 computed 或 watch
```

反模式示例：侦听关键词，把过滤结果再存进一个 `ref`。这样源数据、关键词与结果之间需要手动保持同步，任何一次漏更新都会产生不一致：

```ts
// 不推荐：filtered 是派生值，不应成为需要同步的第二份状态
import { ref, watch } from 'vue';

const keyword = ref('');
const filtered = ref<KnowledgeItem[]>([]);

watch([keyword, items], () => {
  filtered.value = items.value.filter((item) => item.title.includes(keyword.value));
});
```

推荐直接使用前面示例中的 `computed`。

#### 6.4 常见误区

> computed 不缓存，只是一种写法不同的函数。

计算属性基于响应式依赖缓存，依赖不变时重复访问不会重新执行；普通方法每次模板重新渲染都会执行。适合放真正派生且可能被多次读取的值。

> 在 computed 里发请求、改其他状态。

计算属性应是纯粹的派生计算：相同依赖得到相同结果，不产生副作用。异步逻辑放到侦听器、事件处理或专门的请求层中。

> watch 回调里修改自己侦听的值可以制造“自动联动”，很方便。

这种循环联动会让数据流难以追踪，还可能触发意外的反复执行。需要联动时应重新设计状态归属，而不是在侦听器中互相赋值。

### 7. TypeScript 与组件输入输出：defineProps、defineEmits

#### 7.1 定义

在 `<script setup>` 中，`defineProps` 声明组件接收的输入，`defineEmits` 声明组件会向父组件抛出的事件。两者都是编译宏，不需要导入，直接使用即可。配合 TypeScript 的泛型写法，可以得到完整的类型检查。

```text
defineProps<PropsType>()：声明 props
defineEmits<EmitsType>()：声明事件
```

Vue 与 React 一样遵循单向数据流：父组件通过 props 把数据传给子组件，子组件不能直接修改 props；需要改变数据时，子组件抛出事件，由父组件决定如何更新。

#### 7.2 与 Web 的关系

类型化的 props 与事件让组件契约在编译阶段可见：漏传 prop、类型错误、事件名拼错都会在编辑器与构建阶段暴露，而不是等到界面异常才发现。

```vue
<script setup lang="ts">
type KnowledgeCardProps = {
  id: number;
  title: string;
  summary: string;
  favorite: boolean;
};

defineProps<KnowledgeCardProps>();

const emit = defineEmits<{
  toggleFavorite: [id: number];
  openDetail: [id: number];
}>();
</script>

<template>
  <article class="card">
    <h3>{{ title }}</h3>
    <p>{{ summary }}</p>
    <button type="button" @click="emit('toggleFavorite', id)">
      {{ favorite ? '取消收藏' : '收藏' }}
    </button>
    <button type="button" @click="emit('openDetail', id)">查看详情</button>
  </article>
</template>
```

父组件使用该子组件，监听事件并持有状态：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import KnowledgeCard from './KnowledgeCard.vue';

type KnowledgeItem = {
  id: number;
  title: string;
  summary: string;
  favorite: boolean;
};

const items = ref<KnowledgeItem[]>([
  { id: 1, title: 'Vue 声明式渲染', summary: '模板描述数据到界面的映射', favorite: true },
  { id: 2, title: 'SFC 组织方式', summary: 'template、script、style 集中管理', favorite: false },
]);

function toggleFavorite(id: number) {
  const target = items.value.find((item) => item.id === id);
  if (target) {
    target.favorite = !target.favorite;
  }
}

function openDetail(id: number) {
  console.log('打开详情', id);
}
</script>

<template>
  <KnowledgeCard
    v-for="item in items"
    :key="item.id"
    :id="item.id"
    :title="item.title"
    :summary="item.summary"
    :favorite="item.favorite"
    @toggle-favorite="toggleFavorite"
    @open-detail="openDetail"
  />
</template>
```

模板中监听组件事件使用短横线写法（`@toggle-favorite`），脚本中声明与抛出使用小驼峰（`toggleFavorite`），Vue 会自动对应。

带默认值的 props：使用 `withDefaults` 为可选 props 提供默认值：

```vue
<script setup lang="ts">
type PanelProps = {
  title: string;
  density?: 'comfortable' | 'compact';
  closable?: boolean;
};

withDefaults(defineProps<PanelProps>(), {
  density: 'comfortable',
  closable: false,
});
</script>

<template>
  <section :data-density="density">
    <h2>{{ title }}</h2>
    <button v-if="closable" type="button">关闭</button>
  </section>
</template>
```

声明不带额外载荷的事件，以及联合类型载荷：

```vue
<script setup lang="ts">
type SortEvent = {
  field: 'title' | 'updatedAt';
  order: 'asc' | 'desc';
};

const emit = defineEmits<{
  close: [];
  sort: [payload: SortEvent];
}>();

function chooseTitleSort() {
  emit('sort', { field: 'title', order: 'asc' });
}
</script>
```

在脚本中使用 props 时，用变量接收返回值：

```vue
<script setup lang="ts">
type GreetingProps = {
  name: string;
  prefix?: string;
};

const props = defineProps<GreetingProps>();

function greet() {
  console.log(`${props.prefix ?? '你好'}，${props.name}`);
}
</script>
```

#### 7.3 props 的只读性与 React 对照

```vue
<script setup lang="ts">
type BadProps = {
  count: number;
};

const props = defineProps<BadProps>();

// 错误：试图直接修改 prop，破坏单向数据流
function wrong() {
  props.count += 1;
}
</script>
```

正确做法与 React 完全一致：子组件展示并抛出意图，父组件更新自己的状态，再通过 props 把新值传回来。

```text
React：子组件调用 props.onChange(next)
Vue  ：子组件执行 emit('change', next)
两者的“状态归父组件所有”这一原则相同
```

#### 7.4 常见误区

> 为了省事，把所有 props 标记为可选。

大量可选 props 会削弱类型保护，也掩盖“组件真正需要什么”的契约。必填值应标为必填，缺失时让编译器报错；确实有合理默认值时配合 `withDefaults`。

> props 名字用小驼峰，模板中传值也必须写小驼峰。

组件内 props 使用小驼峰；在 DOM 模板中传递时使用短横线写法，SFC 模板中两种写法通常都能识别，课程统一在父组件使用短横线以贴合 HTML 习惯。

> 事件可以不声明，直接 `emit('anything')`。

不声明的事件没有类型保护，父组件监听时也无法得到提示。所有组件事件都应通过 `defineEmits` 显式声明，这是组件对外契约的一部分。

## 课后题

1. 用自己的语言解释 Vue 的声明式渲染，并说明它与 React 的 `UI = f(state)` 在目标上一致、在更新触发方式上不同。
2. 场景分析：一个学员说“Vue 一定比 React 快，因为 Vue 数据一变界面就变，React 还要重新执行组件”。请指出这个说法的问题，并说明比较框架性能时真正应该关注什么。
3. 请描述 `createApp(App).mount('#app')` 中应用实例、根组件与挂载点三者的关系，并写出 React 19 的等价入口。
4. SFC 的三个区块分别承担什么职责？为什么说浏览器最终收到的仍然是普通 JavaScript 与 CSS？
5. 场景分析：同事在模板中写了 `<div>{{ userInput }}</div>`，其中 `userInput` 包含一段来自用户输入的 `<img>` 标签字符串。页面会显示图片吗？这一默认行为为什么是一种安全保护？
6. 请写出 `v-bind` 与 `v-on` 的缩写形式，并各举一个例子；再说明 `@submit.prevent` 解决了什么原生问题。
7. `v-if` 与 `v-show` 有什么区别？一个需要频繁开合的下拉面板更适合哪一个？一个只有管理员可见的操作区呢？说明理由。
8. 场景分析：一个待办列表支持在顶部插入与中间删除，代码使用数组下标作为 key。用户在第一行输入了一半内容后插入新条目，输入框内容“跑到了”第二行。请解释原因与修复方法。
9. computed 与普通函数、与 watch 分别有什么区别？请各用一句话概括，并说明为什么不应用 watch 加冗余状态来维护过滤结果。
10. 场景分析：阅读下面的子组件代码，指出两处违反单向数据流或类型契约的问题，并给出修正版本。

```vue
<script setup lang="ts">
const props = defineProps<{ count: number }>();

function handleClick() {
  props.count += 1;
  emit('count-changed');
}
</script>
```

## 实践练习题

### 练习 1：静态个人资料卡与组件树

#### 任务

使用 Vite 创建 Vue 3 加 TypeScript 项目，用至少 5 个 SFC 组件拼出一张静态个人资料页，包含头像、姓名、标签列表、简介与操作按钮，并与你在 React 单元完成的同类页面做对照。

#### 步骤约束

1. 使用 `npm create vite` 的 vue-ts 模板创建项目，确认 VS Code 已启用 Volar（Vue - Official）。
2. 至少拆分为 `Avatar.vue`、`UserInfo.vue`、`TagList.vue`、`ActionBar.vue`、`ProfileCard.vue` 五个组件。
3. 姓名、标签、简介等数据集中在 `ProfileCard.vue`，通过 props 向下传递，子组件不写死业务数据。
4. 使用 Vue DevTools 截图组件树，确认层级关系与实时 props。
5. 所有组件通过 `defineProps` 的泛型写法显式声明 props 类型。
6. 执行 `npm run build`，确认没有类型与构建错误。

#### 提交物

- 完整项目目录；
- 组件树截图或文本图；
- 启动与构建命令记录；
- 一份简短的 props 流向说明，对比 React 版的数据流。

#### 验收标准

- 组件数量与拆分符合要求；
- props 类型齐全，无 TypeScript 报错；
- 数据集中在顶层组件，子组件不互相直接读取数据；
- 页面在桌面与手机宽度下都不出现横向滚动；
- 构建可以成功完成。

### 练习 2：可交互的知识条目列表

#### 任务

在练习 1 的项目中新增一个知识条目列表模块：父组件维护条目数组，支持收藏切换，并用计算属性实现关键词搜索与收藏统计。

#### 步骤约束

1. 定义 `KnowledgeItem` 类型，至少包含 `id`、`title`、`summary`、`favorite` 字段，准备不少于 8 条初始数据。
2. 使用 `v-for` 渲染列表，`:key` 必须使用条目 id，不允许使用数组下标。
3. 点击收藏按钮时，子组件通过 `defineEmits` 抛出事件，父组件更新对应条目，子组件不得直接修改 props。
4. 使用 `computed` 表达过滤结果与收藏总数，不新增结果状态。
5. 搜索框使用 `v-model` 绑定关键词；过滤结果为空时显示空态文案。
6. 收藏按钮需包含可读的可见文字或 `aria-label`。

#### 提交物

- 列表相关组件代码；
- 收藏与搜索的数据流说明；
- 全部结果、有搜索结果、空搜索结果三种状态截图；
- 类型检查与构建结果。

#### 验收标准

- key 使用稳定 id；
- 收藏状态更新后界面立即变化；
- 空态可稳定复现；
- 子组件保持只读，通过事件与父组件通信；
- 不存在下标 key、未闭合标签、在同一元素上并用 `v-for` 与 `v-if` 等问题。

### 练习 3：可复用条目卡片与事件契约

#### 任务

实现一个可复用的 `KnowledgeCard.vue` 组件，用 props 接收条目数据，用事件对外表达“切换收藏”与“查看详情”两种意图，并在一个演示页面中用它渲染整组数据。

#### 步骤约束

1. `KnowledgeCard.vue` 使用 `defineProps` 声明至少四个字段，使用 `defineEmits` 声明 `toggleFavorite` 与 `openDetail` 两个带 id 载荷的事件。
2. 为一个可选的 `density` 属性使用 `withDefaults` 提供默认值，并在模板中通过 `data-density` 反映出来。
3. 演示页面维护数据，监听事件时使用短横线写法，并在处理函数中更新状态或输出日志。
4. 卡片内部不写死任何业务文案之外的数据，所有条目内容来自 props。
5. 在卡片根节点上使用语义化的 `<article>`，按钮区分主操作与次操作。
6. 通过构建检查，无 TypeScript 报错。

#### 提交物

- `KnowledgeCard.vue` 与演示页面代码；
- 不同密度与收藏状态截图；
- props 与事件的类型定义；
- 一份事件契约说明，对比 React 中通过回调 props 通信的写法。

#### 验收标准

- 卡片可渲染任意符合类型的条目；
- 事件载荷正确，父组件能据此更新对应数据；
- 默认值与可选属性行为正确；
- 单向数据流完整，没有直接修改 props；
- 构建通过。

## 阶段验收作业

### 作业名称

Vue 组件化“知识卡片工作台”静态交互版

### 作业场景

团队要开发一个知识管理页面的前端骨架，后端接口尚未就绪。本阶段只验证你是否真正掌握 Vue 的组件心智模型：界面是否由响应式数据驱动、SFC 结构是否规范、props 与事件是否构成清晰契约、条件与列表渲染是否正确。你可以与 React 单元的同名作业对照实现，但代码必须完整自洽。

### 提交物

```text
knowledge-workbench-vue/
├── src/
│   ├── components/
│   │   ├── AppHeader.vue
│   │   ├── SideNav.vue
│   │   ├── FilterBar.vue
│   │   ├── KnowledgeCard.vue
│   │   └── KnowledgeList.vue
│   ├── pages/
│   │   └── WorkbenchPage.vue
│   ├── types/
│   │   └── knowledge.ts
│   ├── App.vue
│   └── main.ts
├── README.md
└── evidence.md
```

必做内容：

1. 页面包含顶部栏、侧边导航、筛选栏、知识条目列表。
2. 初始数据不少于 12 条，每条包含 id、标题、摘要、标签数组、收藏状态、更新时间。
3. 支持关键词筛选与仅看收藏，条件可叠加；过滤结果必须使用 `computed` 表达。
4. 点击条目的收藏按钮通过事件通知页面组件更新，子组件保持 props 只读。
5. 列表为空时展示空态；所有列表 key 使用业务 id。
6. `evidence.md` 中包含组件树文本图、数据流说明，以及一段与 React 版本的对照小结。

### 演示步骤

学员在 15 分钟内完成：

1. 启动开发服务器，展示完整页面。
2. 打开 Vue DevTools，指出组件树中的父子关系、实时 props 与组件状态。
3. 依次演示关键词筛选、仅看收藏以及两者叠加。
4. 临时清空数据或使用不匹配的关键词，演示空态。
5. 点击不同条目的收藏按钮，在 DevTools 中观察状态更新。
6. 展示 `evidence.md` 中的组件树、数据流说明与 React 对照小结。
7. 回答导师随机追问：某个状态为什么放在这一层、某个交互为什么用事件而不是直接修改。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 心智模型 | 20 | 正确解释声明式模板与数据驱动，界面全部由数据驱动，无手动 DOM 更新业务 UI |
| SFC 与工程结构 | 15 | 三个区块组织规范，命名一致，样式作用域清晰，无滥用深层选择器 |
| Props 与事件契约 | 25 | props 类型完整，事件显式声明且载荷正确，单向数据流没有被破坏 |
| 条件与列表渲染 | 25 | 多条件叠加正确，computed 使用规范，key 为稳定 id，空态完整 |
| 工程与表达 | 15 | 无 TypeScript 与构建错误，README 可复现，evidence 对照清晰 |

细分评分：

- 心智模型：声明式解释 7 分，更新触发方式理解 7 分，无命令式操作业务 UI 6 分。
- SFC 与工程结构：三区块组织 6 分，script setup 使用 5 分，样式作用域 4 分。
- Props 与事件契约：props 类型 8 分，事件声明与载荷 8 分，单向数据流 9 分。
- 条件与列表渲染：筛选叠加 8 分，computed 9 分，key 与空态 8 分。
- 工程与表达：构建通过 6 分，README 5 分，evidence 与 React 对照 4 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过：

1. 使用 `document.querySelector`、jQuery 等方式直接修改业务 UI，绕过 Vue 数据流。
2. 子组件直接修改 props，或修改 props 中的数组、对象后假装是子组件内部状态。
3. 可变列表使用数组下标或随机数作为 key，或列表中出现重复 key。
4. 用 watch 加冗余状态维护本可由 computed 直接派生的过滤结果，且经询问无法说明理由。
5. 组件没有任何拆分，全部逻辑堆在单个超过 500 行的 SFC 中。
6. TypeScript 报错未处理，或大量使用 `any` 绕过类型检查。
7. 项目无法按 README 在另一台满足环境要求的机器上启动和构建，或只提交截图没有可运行代码。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解 Vue 声明式渲染及与 React 的异同 | 现场解释、evidence 对照小结 |
| 掌握 createApp 与应用挂载 | main.ts 与挂载点代码 |
| 掌握 SFC 三区块组织 | 全部组件目录与样式作用域代码 |
| 掌握插值、v-bind、v-on | 卡片、筛选栏与事件处理代码 |
| 掌握条件与列表渲染及 key | 筛选叠加、空态演示、业务 id key |
| 掌握 computed 与 watch 的分工 | 过滤与收藏统计代码、现场问答 |
| 掌握类型化 props 与事件 | 各组件 defineProps/defineEmits 定义与构建结果 |

### 提交前自检

- [ ] 六个学习目标均有对应证据。
- [ ] 项目中没有直接操作业务 DOM 的代码。
- [ ] 所有 props 都有明确类型，必填项未被改成可选。
- [ ] 过滤与收藏统计通过 computed 表达，没有维护冗余结果状态。
- [ ] 筛选条件叠加结果正确，空态可演示。
- [ ] 列表 key 全部使用稳定且唯一的业务 id。
- [ ] 子组件不直接修改 props，所有变化通过事件上抛。
- [ ] 样式默认使用 scoped，深层选择器仅在确有必要时出现。
- [ ] README 包含环境要求、安装步骤、启动方式与目录说明。
- [ ] `npm run build` 无错误，evidence 中的组件树与实际代码一致。
