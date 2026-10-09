# 26-Vue3 响应式原理、组件通信与 Composables

## 目标

完成本知识单元后，学员应理解 Vue 响应式系统“为什么能在数据变化后精准更新界面”，并能在多种组件通信与逻辑复用场景中选择正确方案，而不是把所有数据都堆进全局状态。

学员应能够：

1. 用自己的语言解释响应式要解决的问题，并比较 Vue 3 的 Proxy 方案与 Vue 2 的 `Object.defineProperty` 方案在能力上的差异。
2. 区分 `ref` 与 `reactive` 的适用场景，遵守 `.value`、整体替换、解构失去响应性等使用规则，并能使用 `toRefs`/`toRef` 处理需要解构的场景。
3. 在概念层面描述依赖收集（track）与触发更新（trigger）如何协作，解释“模板中哪里用到了数据，哪里才会更新”。
4. 根据组件关系选择通信方式：父子用 props/emits，跨层级上下文用 provide/inject，组件双向绑定用 `v-model`。
5. 使用模板引用访问 DOM 或组件实例，并能把组件生命周期与“创建、挂载、更新、卸载”四个阶段对应起来。
6. 编写 Composable（组合式函数）复用有状态逻辑，理解它与 React 自定义 Hook 的异同，并能判断何时直接使用 VueUse 提供的工具。

本单元聚焦浏览器端响应式与组件协作。路由与 Pinia 集中状态管理在下一单元展开；表单校验、数据请求与测试在第 28 单元讲解。

## 技术栈

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| Vue 当前稳定版（3.5+，开课确认最新） | 响应式系统与组件模型 | 掌握 ref、reactive、computed、watch、生命周期 |
| TypeScript 当前稳定版 | 为状态、注入与 Composable 标注类型 | 能为响应式状态与函数返回值设计类型 |
| Vite 当前稳定版 | 开发与构建 | 能运行项目并通过类型检查与构建 |
| VueUse 当前稳定版 | 组合式工具函数集合 | 能按需使用常见工具并读懂其实现思路 |
| Vue DevTools 当前稳定版 | 观察依赖、状态与组件生命周期 | 能查看组件状态、注入与更新时间线 |
| Node.js 当前 LTS 与 npm | 运行工具链 | 能安装依赖与执行脚本 |

安装 VueUse 的命令（本单元后半段使用）：

```bash
npm install @vueuse/core
```

说明：

- 课程以 Vue 3 组合式 API 为唯一新代码主线，Vue 2 的实现只用于理解历史差异。
- 不写死小版本号；Proxy、`ref` 解包等行为以当前安装版本文档为准。
- VueUse 是非常流行的组合式工具库，本单元只点到典型工具，重点仍是自己能写出等价 Composable。

## 详细的理论知识讲解和示例伪代码

### 1. 响应式要解决的问题

#### 1.1 定义

响应式（reactivity）是一种让“数据变化”自动传播到“依赖这些数据的地方”的机制。在前端界面中，依赖数据的地方包括模板中显示的文本、绑定的属性、计算属性与侦听器。开发者只修改数据，不需要手动找出所有受影响的界面位置逐一更新。

```text
普通变量：值变了，但没有任何系统知道谁关心这个变化
响应式数据：读取时被登记为“有人依赖我”，写入时通知“依赖我的人可以更新了”
```

一个概念模型：

```text
数据 count
  ↑ 读取时登记依赖
模板中 {{ count }}
计算属性 double = computed(() => count * 2)
  ↓ 写入 count = 2 时
模板与 double 被通知，按调度重新计算并更新 DOM
```

#### 1.2 与 Web 的关系

在命令式代码中，数据与 DOM 是两份需要手动同步的东西。每增加一个显示该数据的位置，就多一处需要记得更新的代码，任何遗漏都会出现“数据已变、界面仍旧”的缺陷。响应式把“找出所有受影响位置”的工作交给框架。

```ts
// 命令式：每新增一个显示 count 的元素，都要手动同步
let count = 0;

function increment() {
  count += 1;
  const countText = document.querySelector('#count-text');
  const liveRegion = document.querySelector('#live-region');
  if (countText) countText.textContent = String(count);
  if (liveRegion) liveRegion.textContent = `当前计数 ${count}`;
}
```

用 Vue 后，无论界面上有多少处使用 `count`，都只修改数据本身：

```vue
<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);

function increment() {
  count.value += 1;
}
</script>

<template>
  <button type="button" @click="increment">
    计数：{{ count }}，两倍：{{ count * 2 }}
  </button>
  <p aria-live="polite">当前计数 {{ count }}</p>
</template>
```

与 React 对照：React 通过“状态变化 → 组件函数重新执行 → 比较输出”的方式让界面与数据一致，粒度从组件开始；Vue 通过响应式依赖追踪，直接定位到模板中受影响的更新点。两种路线都消除了手动同步 DOM 的负担。

#### 1.3 常见误区

> 响应式就是“数据变了界面自动变”，不需要关心使用规则。

自动传播的前提是按规则创建与使用响应式数据。把响应式对象随意解构、用普通变量引用其属性，都会让后续修改脱离追踪，这是本单元后续小节的重点。

> 响应式数据变化后会立刻同步操作 DOM。

Vue 会把组件内的多次状态变化合并、调度后异步执行更新，避免同一帧内重复改动 DOM。因此修改数据后读取 DOM，可能拿到的还是更新前的值；需要等 DOM 更新完成时使用 `nextTick`。

### 2. 从 Object.defineProperty 到 Proxy

#### 2.1 定义

Vue 2 使用 `Object.defineProperty` 拦截对象属性的读取与写入；Vue 3 改用 `Proxy` 代理整个对象。两者都能实现“读取时收集依赖、写入时通知更新”，但 Proxy 在语言能力层面更完整。

`Object.defineProperty` 的概念形态：

```ts
const data = {};
let value = 0;

Object.defineProperty(data, 'count', {
  get() {
    // 读取时收集依赖
    return value;
  },
  set(next: number) {
    // 写入时触发更新
    value = next;
  },
});
```

Proxy 的概念形态：

```ts
const raw = { count: 0 };

const proxy = new Proxy(raw, {
  get(target, key, receiver) {
    // 读取任意属性时都能拦截，包括此前不存在的属性
    return Reflect.get(target, key, receiver);
  },
  set(target, key, value, receiver) {
    // 写入任意属性时都能拦截
    return Reflect.set(target, key, value, receiver);
  },
});
```

#### 2.2 与 Web 的关系

理解两种拦截方式的差异，可以解释 Vue 2 中那些著名的“检测不到”的限制，以及为什么 Vue 3 中它们大多消失了。

Vue 2 中 `Object.defineProperty` 只拦截初始化时已存在的属性，因此：

```text
给对象新增一个原本不存在的属性，视图不会更新
需要借助 this.$set(object, 'newKey', value)
直接通过下标修改数组某一项、修改 length，视图不会按预期更新
需要使用 splice 等被重写的数组方法，或 $set
```

Vue 3 中 Proxy 代理整个对象：

```ts
import { reactive } from 'vue';

const user = reactive<{ name: string; nickname?: string }>({ name: '学员' });

// 新增属性也能被拦截，界面会更新
user.nickname = '阿七';
```

数组按下标赋值也能被检测：

```ts
import { reactive } from 'vue';

const list = reactive<number[]>([1, 2, 3]);

// Vue 3 中这种修改是响应式的
list[0] = 10;
list.length = 2;
```

能力对比小结：

| 方向 | Vue 2 / defineProperty | Vue 3 / Proxy |
|---|---|---|
| 拦截对象 | 单个属性，需逐个定义 | 整个对象，一次代理 |
| 新增属性 | 默认检测不到，需要 `$set` | 可以检测 |
| 数组下标与 length | 存在检测限制 | 可以检测 |
| Map/Set 等集合类型 | 支持困难 | 原生支持响应式代理 |
| 浏览器要求 | 更老的环境 | 需要支持 Proxy 的现代浏览器 |

Proxy 也让嵌套对象的处理更自然：Vue 3 在读取到嵌套对象时才按需把它转成代理（惰性转换），而不是初始化时就递归遍历整个对象。

#### 2.3 常见误区

> Vue 3 响应式“全靠 Proxy”，所以任何对象在任何地方修改都能被追踪。

Proxy 只在通过代理对象访问时生效。直接修改原始对象、绕过代理，系统无法感知；代码中应始终使用 `reactive`/`ref` 返回的那个代理引用。

> Vue 2 中数组完全不能响应。

Vue 2 重写了 `push`、`pop`、`splice` 等数组方法，通过这些方法修改数组是响应式的；受限的是直接下标赋值与修改 `length`。表述应准确，不能一概而论。

### 3. ref 与 reactive：区别与使用规则

#### 3.1 定义

- `ref`：接收一个值，返回一个带有 `value` 属性的响应式引用对象。它可以包装基本类型，也可以包装对象；包装对象时内部会借助 reactive 代理。
- `reactive`：接收一个对象或数组，返回该对象的响应式代理，只适用于对象类型，不能用于基本类型。

```text
const count = ref(0)        // 脚本中 count.value，模板中 count
const state = reactive({ count: 0 })  // state.count
```

#### 3.2 与 Web 的关系

界面状态既有基本类型（开关、计数、输入词），也有成组的对象（表单、列表、配置）。`ref` 提供统一的“按引用传递、整体替换”的入口；`reactive` 让对象属性的修改直接被追踪。

```ts
import { reactive, ref } from 'vue';

// 基本类型只能用 ref
const keyword = ref('');
const loading = ref(false);

// 对象可以用 reactive
const form = reactive({
  name: '',
  age: 0,
  remember: true,
});

// 修改属性直接生效
form.name = '学员';
```

`ref` 包装对象与数组：

```ts
import { ref } from 'vue';

type Item = { id: number; title: string };

const items = ref<Item[]>([]);

// 替换整个数组非常自然，常见于请求返回后重新赋值
items.value = [{ id: 1, title: '新数据' }];

// 也可以修改具体属性
items.value[0].title = '更新后的标题';
```

模板中的自动解包：

```vue
<script setup lang="ts">
import { ref } from 'vue';

const count = ref(0);
</script>

<template>
  <!-- 模板中不需要写 count.value -->
  <button type="button" @click="count++">{{ count }}</button>
</template>
```

注意模板中 ref 只在顶层属性位置自动解包；嵌套在数组或普通对象中的 ref 不会按预期在模板里自动展开，初学时应优先让顶层状态保持简单。

#### 3.3 使用规则

规则一：脚本中访问 `ref` 必须用 `.value`，模板中不用。

```ts
import { ref } from 'vue';

const count = ref(0);

count.value += 1;
console.log(count.value);
```

规则二：`reactive` 对象不能整体替换，直接赋新对象会让变量脱离原代理。

```ts
import { reactive } from 'vue';

const state = reactive({ items: [] as number[], loading: false });

// 错误：state 指向了新的普通对象，模板仍引用旧代理
// state = { items: [1], loading: true };

// 正确：逐个属性修改，或使用 Object.assign
Object.assign(state, { items: [1], loading: true });
```

需要经常整体替换的数据，用 `ref` 更合适：

```ts
import { ref } from 'vue';

const state = ref({ items: [] as number[], loading: false });

state.value = { items: [1], loading: true };
```

规则三：解构 `reactive` 对象的属性会失去响应性，因为得到的是普通值类型拷贝。

```ts
import { reactive } from 'vue';

const state = reactive({ name: '学员', age: 20 });

// name 是普通字符串，之后 state.name 变化不会影响这个变量
let { name } = state;
name = '新名字';
```

需要保持解构后的响应性，使用 `toRefs`：

```ts
import { reactive, toRefs } from 'vue';

const state = reactive({ name: '学员', age: 20 });

// 每个属性变成对应的 ref，解构后仍与原对象联动
const { name, age } = toRefs(state);

name.value = '新名字';
console.log(state.name); // 新名字
```

只需要其中一个属性时，使用 `toRef`：

```ts
import { reactive, toRef } from 'vue';

const state = reactive({ name: '学员', age: 20 });
const nameRef = toRef(state, 'name');

nameRef.value = '阿七';
```

规则四：不要把 `reactive` 与 `ref` 无规则混用在同一份状态上。团队可约定：表单、配置等成组对象用 `reactive`；需要整体替换、基本类型、从外部传入的数据用 `ref`。

#### 3.4 常见误区

> 用了 `ref` 却在脚本里直接写 `count += 1`。

这样修改的是局部变量而不是响应式引用，界面不会更新。脚本里始终通过 `.value`。

> `reactive` 返回的对象和原始对象是同一个，可以随意保存原始对象以后修改。

应只通过代理访问与修改。保留并修改原始对象不会触发更新，还会造成两份引用语义混乱。

> `ref` 包装对象后，修改对象属性要写两层 value。

`items.value` 取出的是代理数组，直接 `items.value[0].title = 'x'` 即可；不需要 `items.value.value`。

### 4. track 与 trigger：依赖收集与触发更新

#### 4.1 定义

Vue 响应式系统在概念上有两个核心动作：

- track（依赖收集）：当某个副作用或渲染过程读取响应式数据时，系统记录“这个正在执行的过程依赖了这个数据”。
- trigger（触发更新）：当响应式数据被修改时，系统根据收集到的记录，通知对应的过程重新执行或安排更新。

```text
读取响应式属性 → track：登记当前副作用与该属性的关系
写入响应式属性 → trigger：找出依赖该属性的所有副作用，调度执行
```

#### 4.2 与 Web 的关系

一次组件渲染本质上是一个响应式副作用：模板执行时读取哪些数据，就收集哪些数据为依赖。之后只有这些数据变化，组件渲染才需要重新执行；模板中没有用到的数据即使变化，也不会触发该组件更新。这解释了 Vue 更新的精准性。

不借助框架 API 的概念伪代码，理解原理即可：

```text
当前活跃副作用 = 空

function effect(回调):
    当前活跃副作用 = 回调
    执行回调()          # 回调中读取数据，触发 get → track
    当前活跃副作用 = 空

依赖表 = Map<目标对象, Map<属性, Set<副作用>>>()

track(目标, 属性):
    如果存在当前活跃副作用:
        在依赖表中登记“该副作用依赖 目标.属性”

trigger(目标, 属性):
    找到依赖 目标.属性 的所有副作用
    把它们加入调度队列，稍后执行
```

与 Proxy 结合后的完整概念链：

```text
effect 执行渲染函数
  ↓ 读取 proxy.count，进入 get
get 中调用 track：记录渲染函数依赖 count
  ↓ 用户修改 proxy.count，进入 set
set 中调用 trigger：通知渲染函数
  ↓ 调度器合并同一组件的多次变化，异步执行
渲染函数重新执行，生成新的虚拟节点
  ↓ 比较差异，只更新真实 DOM 中变化的部分
```

`computed` 也参与这套机制，但它有自己的缓存：当依赖未变化时，多个读取者共享同一个计算结果；依赖变化后，它被标记为“需要重新计算”，下次读取才真正执行。

`watch` 与 `watchEffect` 都是基于这套依赖系统提供给开发者的入口：

```text
watch(source, callback)：显式 source，变化后调用 callback，可拿到新旧值
watchEffect(callback)：立即执行 callback 并自动收集依赖
两者都返回停止函数，组件卸载时框架会自动停止组件内创建的侦听
```

#### 4.3 调度与 nextTick

Vue 不会在每次数据变化后同步刷新 DOM，而是把组件更新放入队列，在微任务时机统一执行：

```ts
import { nextTick, ref } from 'vue';

const count = ref(0);

async function incrementAndRead() {
  count.value += 1;
  // 此时 DOM 更新尚未执行
  await nextTick();
  // 到这里本轮 DOM 更新已经完成，可以读取更新后的界面
}
```

这与浏览器事件循环、微任务知识相衔接，也解释了为什么连续修改多个状态通常只触发一次界面更新。

#### 4.4 常见误区

> track 是开发者需要手动调用的函数。

track/trigger 是框架内部概念，日常开发使用 `ref`、`reactive`、`computed`、`watch` 即可，不需要手写这些底层函数。要求理解的是机制，而不是记住内部 API 名。

> 数据一变，依赖它的所有组件都会完整重建 DOM。

受影响的是依赖该数据的渲染副作用，且最终 DOM 更新仍经过差异比较，只改动必要部分。

### 5. 组件通信：props/emits、provide/inject 与组件 v-model

#### 5.1 定义

Vue 提供多种组件通信方式，按关系由近到远选择：

- props down / emits up：父子组件通信的默认方式，单向数据流。
- provide / inject：祖先组件提供数据，任意深度的后代组件注入使用，用于明确的上下文共享。
- 组件 `v-model`：在组件上建立“属性向下传、事件向上抛”的双向绑定语法糖。
- Pinia：跨页面、跨区域的集中客户端状态，下一单元讲解。

#### 5.2 与 Web 的关系

通信方式的选择本质是在回答“这个状态归谁所有、谁需要知道它的变化”。默认使用最局部的方案，可以让数据来源始终可追踪，避免把临时状态扩散成隐式全局变量。

props/emits 在第 25 单元已经系统使用。这里补充两个易错点：声明事件载荷类型，以及父组件用短横线监听。

```vue
<script setup lang="ts">
type PaginationProps = {
  page: number;
  total: number;
};

defineProps<PaginationProps>();

const emit = defineEmits<{
  change: [page: number];
}>();

function goNext(page: number) {
  emit('change', page);
}
</script>

<template>
  <button type="button" @click="goNext(page + 1)">第 {{ page }} 页 / 共 {{ total }} 页</button>
</template>
```

provide/inject：祖先提供主题或表单上下文。

```ts
// 祖先组件
import { provide, ref } from 'vue';

const theme = ref<'light' | 'dark'>('light');

provide('theme', theme);
```

```vue
<script setup lang="ts">
// 任意深度的后代组件
import { inject } from 'vue';

const theme = inject<{ value: 'light' | 'dark' }>('theme');
</script>

<template>
  <div :data-theme="theme?.value">内容区域</div>
</template>
```

推荐使用 InjectionKey 获得完整类型：

```ts
// injection-keys.ts
import type { InjectionKey, Ref } from 'vue';

export const themeKey: InjectionKey<Ref<'light' | 'dark'>> = Symbol('theme');
```

```ts
import { provide } from 'vue';
import { themeKey } from './injection-keys';

provide(themeKey, ref<'light' | 'dark'>('light'));
```

```ts
import { inject } from 'vue';
import { themeKey } from './injection-keys';

const theme = inject(themeKey);
```

inject 可以提供默认值，避免找不到注入时得到 `undefined`：

```ts
const theme = inject(themeKey, ref<'light' | 'dark'>('light'));
```

组件 `v-model`：父组件写法是 `v-model="keyword"`，展开后等价于传入 `modelValue` 属性并监听 `update:modelValue` 事件。

```vue
<!-- SearchInput.vue -->
<script setup lang="ts">
defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <input
    type="search"
    :value="modelValue"
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  />
</template>
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import SearchInput from './SearchInput.vue';

const keyword = ref('');
</script>

<template>
  <SearchInput v-model="keyword" />
  <p>当前关键词：{{ keyword }}</p>
</template>
```

同一个组件可以有多个具名双向绑定，使用 `v-model:参数名`：

```vue
<!-- 父组件 -->
<FilterPanel v-model:keyword="keyword" v-model:tag="tag" />
```

```vue
<!-- FilterPanel.vue -->
<script setup lang="ts">
defineProps<{
  keyword: string;
  tag: string;
}>();

const emit = defineEmits<{
  'update:keyword': [value: string];
  'update:tag': [value: string];
}>();
</script>
```

`v-model` 还支持修饰符（如 `.trim`、`.number` 与自定义修饰符），表单单元会继续使用内置修饰符。

#### 5.3 provide/inject 的边界

```text
适合：主题、语言、表单实例、布局上下文等“祖先明确拥有、后代普遍需要”的依赖
不适合：把所有业务数据挂到根组件 provide，变成无法追踪的隐式全局状态
若多个相距很远的页面都要读写同一状态，下一单元的 Pinia 通常更合适
```

注入响应式对象时，推荐“提供方保留修改方法，注入方调用方法”，而不是让任意后代直接改写共享数据，便于约束变化路径。

#### 5.4 常见误区

> provide/inject 传普通对象，修改其属性也能更新界面。

只有响应式数据的变化才会触发更新。需要跨组件响应时，提供 `ref`/`reactive` 或其只读包装。

> 组件 v-model 意味着子组件可以修改父组件状态。

子组件仍然不能直接改 prop，它只是按约定抛出 `update:xxx` 事件，由父组件更新自己的状态，单向数据流没有被打破。

### 6. 模板引用与生命周期

#### 6.1 定义

模板引用通过 `ref` 属性把模板中的 DOM 元素或子组件实例绑定到脚本中的同名引用。生命周期钩子让开发者在组件创建、挂载、更新、卸载等阶段执行逻辑。

常用生命周期钩子（组合式 API）：

| 钩子 | 触发时机 |
|---|---|
| `onBeforeMount` | 组件挂载到 DOM 之前 |
| `onMounted` | 组件已挂载，可访问 DOM 与子组件 |
| `onBeforeUpdate` | 响应式数据变化、DOM 更新之前 |
| `onUpdated` | DOM 更新之后 |
| `onBeforeUnmount` | 组件即将卸载，适合清理资源 |
| `onUnmounted` | 组件已卸载 |
| `onErrorCaptured` | 捕获后代组件抛出的错误 |

#### 6.2 与 Web 的关系

模板引用对应 React 中的 `useRef` 配合 JSX `ref` 属性；生命周期对应组件与浏览器 DOM 关系的各个阶段。访问真实 DOM 的命令式能力（聚焦、滚动、播放视频）应放在 `onMounted` 之后。

DOM 引用：

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';

const inputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  inputRef.value?.focus();
});
</script>

<template>
  <input ref="inputRef" type="text" aria-label="自动聚焦输入框" />
</template>
```

在 `v-for` 上使用引用，得到的是元素数组：

```vue
<script setup lang="ts">
import { ref } from 'vue';

const itemRefs = ref<HTMLElement[]>([]);
const items = ['一', '二', '三'];
</script>

<template>
  <ul>
    <li v-for="(item, index) in items" :key="item" :ref="(el) => { if (el) itemRefs[index] = el; }">
      {{ item }}
    </li>
  </ul>
</template>
```

引用子组件并调用其暴露的方法。子组件需要通过 `defineExpose` 显式暴露：

```vue
<!-- Modal.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const open = ref(false);

function show() {
  open.value = true;
}

defineExpose({ show });
</script>

<template>
  <div v-if="open" role="dialog" aria-modal="true">弹窗内容</div>
</template>
```

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Modal from './Modal.vue';

const modalRef = ref<InstanceType<typeof Modal> | null>(null);

onMounted(() => {
  modalRef.value?.show();
});
</script>

<template>
  <button type="button" @click="modalRef?.show()">打开弹窗</button>
  <Modal ref="modalRef" />
</template>
```

生命周期与清理：订阅、定时器、全局监听应在 `onMounted` 建立、`onBeforeUnmount` 或 `onUnmounted` 清理。不过很多这类逻辑最终会收敛到 Composable 中。

```ts
import { onBeforeUnmount, onMounted } from 'vue';

let controller: AbortController | null = null;

onMounted(() => {
  controller = new AbortController();
});

onBeforeUnmount(() => {
  controller?.abort();
});
```

#### 6.3 常见误区

> 在 setup 顶层直接读取模板引用对应的 DOM。

setup 执行期间组件尚未挂载，引用值还是 `null`；DOM 访问必须在挂载后。

> 不写 `defineExpose` 也能从父组件随意调用子组件的任何内部函数。

默认情况下 `<script setup>` 的内部绑定对外封闭，必须显式暴露。这是一种封装保护。

> `onUpdated` 适合发请求，因为界面更新后数据可能又需要刷新。

在 `onUpdated` 中修改响应式状态可能造成“更新 → 再改 → 再更新”的循环。数据获取应由状态变化、事件或请求层驱动，而不是无条件挂在更新钩子上。

### 7. Composables：组合式函数与逻辑复用

#### 7.1 定义

Composable（组合式函数）是一个以 `use` 开头的函数，内部使用 Vue 的响应式 API 与生命周期，把“状态 + 操作状态的逻辑 + 清理”打包复用。它复用的是状态逻辑，不是状态本身：每次调用都会建立一套独立的状态。

```text
function useXxx(参数) {
  const 状态 = ref(...);
  function 操作() { /* 修改状态 */ }
  return { 状态, 操作 };
}
```

#### 7.2 与 Web 的关系

多个组件都需要开关、倒计时、本地存储、订阅窗口尺寸等逻辑时，复制代码会造成行为漂移。Composable 提供单一实现，组件只负责调用与渲染，这与 React 自定义 Hook 解决的问题完全对应。

一个开关 Composable：

```ts
// composables/useToggle.ts
import { ref } from 'vue';

export function useToggle(initial = false) {
  const open = ref(initial);

  function toggle() {
    open.value = !open.value;
  }

  function setOpen(value: boolean) {
    open.value = value;
  }

  return {
    open,
    toggle,
    setOpen,
  };
}
```

在两个组件中使用，状态彼此独立：

```vue
<script setup lang="ts">
import { useToggle } from '../composables/useToggle';

const panel = useToggle(false);
</script>

<template>
  <button type="button" @click="panel.toggle" :aria-expanded="panel.open">
    {{ panel.open ? '收起' : '展开' }}
  </button>
  <p v-if="panel.open">面板内容</p>
</template>
```

带生命周期的本地存储 Composable：

```ts
// composables/useLocalStorage.ts
import { ref, watch } from 'vue';

export function useLocalStorage<T>(key: string, initial: T) {
  const stored = window.localStorage.getItem(key);
  const value = ref<T>(stored ? (JSON.parse(stored) as T) : initial);

  watch(
    value,
    (next) => {
      window.localStorage.setItem(key, JSON.stringify(next));
    },
    { deep: true },
  );

  return value;
}
```

异步请求形态的 Composable（只演示结构，请求封装在第 28 单元完整展开）：

```ts
// composables/useAsyncState.ts
import { ref, shallowRef } from 'vue';

export function useAsyncState<T>(task: () => Promise<T>) {
  const data = shallowRef<T | null>(null);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function run() {
    loading.value = true;
    error.value = null;
    try {
      data.value = await task();
    } catch (cause) {
      error.value = cause instanceof Error ? cause : new Error('未知错误');
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, run };
}
```

与 React 自定义 Hook 的对照：

| 方向 | React 自定义 Hook | Vue Composable |
|---|---|---|
| 状态原语 | `useState`/`useReducer` | `ref`/`reactive` |
| 派生值 | 渲染中计算或 `useMemo` | `computed` |
| 外部同步 | `useEffect` 加清理 | `watch`/`watchEffect` 与生命周期钩子 |
| 调用规则 | 必须顶层调用，靠调用顺序对应槽位 | 组合式函数没有同样的顺序限制，但仍推荐在 setup 同步上下文中调用 |
| 多次调用是否共享状态 | 不共享 | 不共享 |

一个关键差异：React Hook 依赖严格调用顺序，不能放进条件；Vue Composable 本质是普通函数，可以在条件或事件中调用，但在组件 setup 中创建需要被模板与生命周期管理的状态时，仍应在 setup 同步阶段建立，避免时序混乱。

#### 7.3 设计原则

- 返回值优先使用对象而非长位置参数数组，字段名清晰，便于按需解构。
- Composable 内保持单一职责；一个 `useUserPreference` 不应同时承担请求、权限、路由等多重逻辑。
- 需要清理时在内部注册 `onScopeDispose`/`onBeforeUnmount`，调用方不必记得手动清理。
- 只暴露必要的状态与方法，内部计算属性与工具函数不强制返回。

使用 `onScopeDispose` 让清理同时适用于组件与 effect 作用域：

```ts
import { onScopeDispose } from 'vue';

export function useEventListener<K extends keyof WindowEventMap>(
  type: K,
  listener: (event: WindowEventMap[K]) => void,
) {
  window.addEventListener(type, listener);

  onScopeDispose(() => {
    window.removeEventListener(type, listener);
  });
}
```

#### 7.4 常见误区

> 两个组件调用同一个 Composable 会共享同一份状态。

普通 Composable 每次调用都创建独立状态，这与 React 自定义 Hook 一致。需要共享时，由共同父组件调用后通过 props 下发、使用 provide/inject，或下一单元的 Pinia。

> Composable 里必须返回 `ref`，不能返回普通函数或常量。

应按需要返回：只读场景可返回 `computed`，工具方法直接返回函数，常量直接返回值。重点是契约清晰。

> 把整个应用的状态写进一个 `useGlobal`，在任何组件调用，就等于状态管理库。

缺少命名空间、devtools、SSR 与持久化等能力时，手写全局单例容易失控；下一单元的 Pinia 是这类需求的正式方案。

### 8. VueUse：站在成熟工具的肩膀上

#### 8.1 定义

VueUse 是一组基于组合式 API 的工具函数集合，覆盖浏览器 API 封装、状态工具、动画、时间、数组与敏感度控制等。它的每个工具都是一个 Composable，可以直接导入使用，也可以作为自己编写 Composable 的参考。

#### 8.2 与 Web 的关系

浏览器 API（本地存储、剪贴板、媒体查询、在线状态、定时器、元素尺寸）在直接使用时需要处理兼容性与清理。VueUse 把这些样板逻辑封装为响应式工具，让组件只消费结果。

几个典型工具：

```ts
import { computed } from 'vue';
import {
  useDark,
  useEventListener,
  useLocalStorage,
  useMediaQuery,
  useOnline,
  useTitle,
  useToggle,
} from '@vueuse/core';

// 在线状态：离线时自动更新
const isOnline = useOnline();

// 响应式页面标题
useTitle(computed(() => (isOnline.value ? '工作台' : '离线模式')));

// 本地存储偏好
const density = useLocalStorage<'comfortable' | 'compact'>('density', 'comfortable');

// 媒体查询
const isWide = useMediaQuery('(min-width: 960px)');

// 深色模式与配套开关
const isDark = useDark();
const toggleDark = useToggle(isDark);

// 事件监听在作用域销毁时自动移除
useEventListener(window, 'resize', () => {
  console.log(window.innerWidth);
});
```

`useEventListener` 也可以绑定到具体元素引用：

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useEventListener } from '@vueuse/core';

const areaRef = ref<HTMLElement | null>(null);

useEventListener(areaRef, 'keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    console.log('在区域内按下 Escape');
  }
});
</script>

<template>
  <div ref="areaRef" tabindex="0">可聚焦区域</div>
</template>
```

使用 VueUse 的原则：

```text
先确认问题是否已有成熟工具，避免重复造轮子
再读该工具的入参与返回类型，理解其响应式行为与清理时机
课程练习要求先自己实现等价 Composable 一次，再对照 VueUse 的实现
```

VueUse 中的部分工具接受响应式参数（ref 或 getter），可以让配置随状态动态变化，例如把轮询间隔、条件开关做成响应式输入。使用时以当前版本类型定义为准确认。

#### 8.3 常见误区

> 装了 VueUse 就不需要理解响应式原理。

工具内部大量使用本单元的 ref、computed、watch 与作用域清理；不理解原理就无法判断工具行为边界，也难以排查问题。

> VueUse 工具可以在任意普通函数甚至模块顶层随意调用并期望随组件自动清理。

依赖组件生命周期的自动清理需要在组件或 effect 作用域内调用；脱离作用域时应自行处理停止与清理。

## 课后题

1. 响应式要解决的核心问题是什么？请用“一个数据在页面多处显示”的例子说明手动同步与响应式同步的差别。
2. Vue 3 的 Proxy 相比 Vue 2 的 `Object.defineProperty` 在哪些场景下能力更强？请至少写出三类 Vue 2 中“检测不到”的变化。
3. 场景分析：维护一个 Vue 2 项目时，同事通过 `this.list[3] = newItem` 修改数组，界面没有更新。请解释原因，并给出两种可行修改方式。
4. `ref` 与 `reactive` 分别适合什么场景？为什么需要整体替换的状态更适合 `ref`？
5. 场景分析：代码中 `const { name } = reactive(user)` 后修改 `name`，界面没有变化。请解释解构为什么会失去响应性，并使用两种 API 修复。
6. 请在概念层面描述 track 与 trigger 的协作：模板渲染、get、set、调度更新之间是什么顺序？
7. 场景分析：某状态变化后，组件 A 更新了，组件 B 没有更新。已知 B 的脚本中读取过这个状态，但模板中没有使用。这个现象合理吗？请结合依赖收集解释。
8. provide/inject 与 props/emits 的边界分别是什么？为什么不建议把所有业务数据都在根组件 provide？
9. 组件上的 `v-model="keyword"` 展开后等价于哪两个绑定？为什么说它没有破坏单向数据流？
10. 场景分析：把 React 中的 `useToggle` 自定义 Hook 迁移为 Vue Composable，两个组件同时使用后状态是否共享？请写出 Vue 版本并对照说明 React Hook 与 Vue Composable 在调用规则上的差异。

## 实践练习题

### 练习 1：响应式状态规则练习

#### 任务

创建一个演示页面，分别使用 `ref` 与 `reactive` 管理状态，并刻意练习整体替换、解构恢复与 DOM 更新等待三类规则。

#### 步骤约束

1. 使用 Vite 创建 Vue 3 加 TypeScript 项目（可延续第 25 单元项目）。
2. 用 `ref` 管理关键词与一个对象数组，演示请求返回后整体替换数组。
3. 用 `reactive` 管理一个设置对象，使用 `Object.assign` 批量更新，不允许整体重新赋值。
4. 使用 `toRefs` 解构设置对象，并在模板中证明解构出的 ref 与原对象联动。
5. 修改状态后使用 `nextTick`，在注释中写明 DOM 更新前后的读取差异。
6. 通过构建与类型检查。

#### 提交物

- 演示页面代码；
- 三类规则的代码位置注释；
- 修改前后的界面截图；
- 一份 100 至 200 字的规则小结。

#### 验收标准

- 脚本能准确使用 `.value`，没有遗漏；
- reactive 对象没有被整体替换；
- toRefs 解构保持响应性；
- nextTick 使用场景正确；
- 构建通过。

### 练习 2：多层上下文与组件 v-model

#### 任务

实现一个带主题上下文的设置面板：祖先组件通过 provide/inject 提供主题，搜索输入组件通过 `v-model` 与父组件双向绑定。

#### 步骤约束

1. 定义 `InjectionKey`，在祖先组件 provide 一个 `ref` 主题，在至少两层之下的组件 inject 使用并反映到 `data-theme`。
2. inject 必须提供类型安全的默认值，不能得到未处理的 `undefined`。
3. 实现 `SearchInput.vue`，接收 `modelValue` 并抛出 `update:modelValue`，父组件使用 `v-model`。
4. 再实现一个具名双向绑定 `v-model:tag`，证明一个组件可以有多个双向绑定。
5. 切换主题与输入关键词时，界面立即响应；搜索输入不直接修改 prop。
6. 在 README 中说明 provide/inject 与 v-model 分别解决什么问题。

#### 提交物

- 主题相关组件、SearchInput 与父页面代码；
- InjectionKey 类型定义；
- 不同主题与输入状态截图；
- 通信方式说明。

#### 验收标准

- inject 类型完整且有默认值；
- v-model 与具名 v-model 行为正确；
- 单向数据流完整；
- 主题能跨越至少两层组件生效；
- 无类型错误。

### 练习 3：Composable 工具集与 VueUse 对照

#### 任务

先自己实现三个 Composable，再用 VueUse 的等价工具替换其中一个，对比行为与实现差异。

#### 步骤约束

1. 实现 `useToggle`、`useLocalStorage`、`useEventListener` 三个 Composable，前两个含状态，第三个负责注册与清理。
2. `useEventListener` 使用 `onScopeDispose` 完成清理，并在组件中通过反复挂载证明监听不会叠加。
3. 至少在两个不同组件中调用 `useToggle`，用日志证明它们的状态相互独立。
4. 使用 VueUse 的 `useOnline` 或 `useMediaQuery` 替换其中一个自实现功能，保持组件表现一致。
5. 为所有 Composable 标注参数与返回类型，不使用 `any`。
6. 编写一份对照表，比较自实现与 VueUse 在能力与清理时机上的差异。

#### 提交物

- `composables/` 目录与调用组件；
- VueUse 替换前后的代码对比；
- 监听清理的控制台证据；
- 对照表与说明。

#### 验收标准

- 三个 Composable 行为正确、类型完整；
- 多次调用状态独立；
- 事件监听随作用域自动清理；
- VueUse 替换后界面表现一致；
- 能解释自实现与成熟工具的差距。

## 阶段验收作业

### 作业名称

响应式驱动的“设置中心”与逻辑复用说明书

### 作业场景

团队要求你实现一个纯前端设置中心：包含主题切换、通知开关、资料草稿与在线状态，并把可复用逻辑收敛为 Composable。本阶段重点验证你是否真正理解 Vue 响应式原理与组件协作边界，尤其是 `ref`/`reactive` 的使用规则、provide/inject 的适用范围，以及 Composable 与 React 自定义 Hook 的异同。

### 提交物

```text
settings-center-vue/
├── src/
│   ├── components/
│   │   ├── ThemePanel.vue
│   │   ├── ToggleRow.vue
│   │   ├── ProfileDraft.vue
│   │   └── NetworkStatus.vue
│   ├── composables/
│   │   ├── useToggle.ts
│   │   ├── useLocalStorage.ts
│   │   └── useOnlineStatus.ts
│   ├── keys/
│   │   └── injection-keys.ts
│   ├── pages/
│   │   └── SettingsPage.vue
│   ├── types/
│   │   └── settings.ts
│   ├── App.vue
│   └── main.ts
├── reactivity-design.md
└── README.md
```

必做内容：

1. 主题通过 provide/inject 从页面提供，至少两层之下的组件注入并反映到 `data-theme`；使用 InjectionKey 与默认值。
2. 通知开关至少三项，使用自实现 `useToggle`；偏好通过 `useLocalStorage` 持久化，刷新后恢复。
3. 资料草稿使用 `reactive` 管理，演示 `toRefs` 解构；一个字符计数使用 `computed` 表达。
4. 在线状态组件使用自己的 `useOnlineStatus`，正确注册与移除浏览器监听。
5. `reactivity-design.md` 包含：ref/reactive 选择表、track/trigger 概念图、通信方式决策表、与 React Hook 的对照。
6. 至少一处使用 VueUse 工具，并在设计文档中说明为什么此处直接采用成熟工具。

### 演示步骤

学员在 15 分钟内完成：

1. 启动项目，展示设置中心完整界面。
2. 切换主题与通知开关，刷新页面证明持久化生效。
3. 用 Vue DevTools 指出 provide/inject 的数据与组件状态。
4. 修改浏览器联网状态，展示在线状态变化，并证明监听已正确清理。
5. 填写资料草稿，展示 computed 字符计数与 toRefs 联动。
6. 讲解 reactivity-design.md 中的 track/trigger 概念图与通信决策表。
7. 回答导师追问：某状态为什么用 ref 而不是 reactive，某逻辑为什么抽成 Composable。

### 评分标准

总分 100 分，70 分及以上通过。

| 维度 | 分值 | 满分要求 |
|---|---:|---|
| 响应式原理理解 | 20 | 能解释 Proxy 优势、track/trigger 机制与调度时机 |
| ref 与 reactive 使用 | 20 | 选择合理，.value、整体替换、toRefs 等规则全部正确 |
| 组件通信 | 20 | props/emits、provide/inject、v-model 场景选择与类型正确 |
| 模板引用与生命周期 | 10 | DOM 访问时机正确，defineExpose 使用规范 |
| Composables 逻辑复用 | 20 | 抽象合理，状态独立，清理完整，类型清晰 |
| 文档与工程 | 10 | 设计文档完整，VueUse 使用恰当，构建通过，README 可复现 |

细分评分：

- 响应式原理：Proxy 对比 7 分，track/trigger 8 分，nextTick 调度 5 分。
- ref 与 reactive：场景选择 7 分，.value 与替换规则 7 分，toRefs 6 分。
- 组件通信：props/emits 6 分，provide/inject 8 分，v-model 6 分。
- 模板引用与生命周期：DOM 引用 4 分，defineExpose 3 分，生命周期清理 3 分。
- Composables：抽象质量 8 分，状态独立 5 分，清理 4 分，类型 3 分。
- 文档与工程：设计文档 4 分，VueUse 3 分，构建与 README 3 分。

### 强制不通过条件

出现以下任一情况，本次验收不通过：

1. 无法解释 Proxy 与 `Object.defineProperty` 的差异，或认为 Vue 2 数组“完全不能响应”。
2. 解构 reactive 后状态失效却未处理，或脚本中普遍遗漏 ref 的 `.value`。
3. 直接修改原始对象绕过代理，期望界面更新。
4. provide/inject 没有类型约束与默认值处理，或把全部业务数据挂到根组件当作全局状态。
5. 组件 v-model 中直接修改 prop，而不是抛出更新事件。
6. 多个组件调用同一 Composable 时期望或被实现成共享同一份可变状态，且经询问无法纠正。
7. 事件监听、定时器等资源没有清理，或项目无法按 README 启动、构建失败。

### 学习目标与验收映射

| 学习目标 | 验收证据 |
|---|---|
| 理解响应式问题域 | reactivity-design.md 与现场解释 |
| 掌握 Proxy 与 defineProperty 差异 | 原理对照与 Vue 2 场景问答 |
| 掌握 ref/reactive 规则 | 主题、草稿、偏好代码与构建结果 |
| 理解 track/trigger | 概念图与组件更新现象解释 |
| 掌握组件通信方式 | InjectionKey、v-model、事件处理代码 |
| 掌握模板引用与生命周期 | defineExpose、DOM 访问与资源清理演示 |
| 掌握 Composables 逻辑复用 | useToggle、useLocalStorage、useOnlineStatus |
| 合理使用 VueUse | 至少一处工具调用与说明 |

### 提交前自检

- [ ] 全部学习目标均有对应证据。
- [ ] 脚本中 ref 访问均使用 `.value`，模板中不写 `.value`。
- [ ] reactive 对象没有被整体替换，需要解构处使用了 toRefs/toRef。
- [ ] 只用代理引用访问与修改响应式对象，没有保留并修改原始对象。
- [ ] provide/inject 具备 InjectionKey、类型与默认值。
- [ ] 组件 v-model 严格通过属性与更新事件实现。
- [ ] Composable 多次调用状态独立，事件与定时器随作用域清理。
- [ ] reactivity-design.md 包含 ref/reactive 选择表、track/trigger 图与通信决策表。
- [ ] VueUse 的使用有明确理由，自实现 Composable 至少保留三个。
- [ ] `npm run build` 无错误，README 可指导复现。
