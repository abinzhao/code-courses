# 02 Composition API 与 script setup

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[01 模板语法与响应式基础](./01-模板语法与响应式基础.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[Vue](https://vuejs.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 掌握 `<script setup>` 语法糖的用法和编译优化原理
- 理解 defineProps / defineEmits 的类型安全设计
- 掌握 defineExpose、defineModel 的高级用法
- 熟练使用 watch / watchEffect 并理解其区别
- 掌握模板引用 ref 访问 DOM 元素
- 了解 Teleport 组件的使用场景
- 能独立实现带搜索的表格组件

---

## 内容讲解

### 一、\<script setup\> 语法糖

`<script setup>` 是 Vue 3.2 引入的编译时语法糖，在 SFC（单文件组件）中使用 Composition API 时的推荐写法。它在编译阶段做了大量优化，不是简单的语法简化。

```vue
<!-- ❌ 传统写法：需要手动 return -->
<script lang="ts">
import { ref } from 'vue'

export default {
  setup() {
    const count = ref(0)
    function increment() { count.value++ }

    // 必须手动暴露给模板
    return { count, increment }
  }
}
</script>

<!-- ✅ script setup：顶层的变量和函数自动暴露给模板 -->
<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
function increment() { count.value++ }
// 不需要 return！编译时自动处理
</script>
```

**核心特性**：

1. **自动暴露**：顶层绑定（变量、函数、 import 的组件）直接在模板中可用，无需 `return`
2. **编译优化**：静态分析更彻底，生成更高效的渲染函数；不需要 `setup()` 函数包装，减少运行时开销
3. **TypeScript 原生支持**：`lang="ts"` 即可，类型推导完整
4. **组件自动注册**：导入的组件无需在 `components` 选项中注册

```vue
<script setup lang="ts">
import MyButton from './MyButton.vue'
// MyButton 在模板中直接可用，无需 components 注册
</script>

<template>
  <MyButton />
</template>
```

**与 React 的对比**：`<script setup>` 本质上是编译时的便利，类似于 React 的函数组件——都是在同一个作用域内写逻辑，不需要额外的配置对象。但 Vue 的编译优化更激进，可以在模板编译阶段就确定哪些绑定是静态的。

### 二、defineProps：类型安全的 Props 声明

父组件向子组件传递数据的基础机制，`defineProps` 是仅在 `<script setup>` 中可用的**编译宏**（无需导入）。

```vue
<!-- 子组件 ChildCard.vue -->
<script setup lang="ts">
// ============ 方式一：运行时声明（仅校验类型） ============
const props = defineProps({
  name: { type: String, required: true },
  age: { type: Number, default: 0 },
  tags: { type: Array as () => string[], default: () => [] }
})

// ============ 方式二：纯类型声明（推荐，TypeScript 原生） ============
interface Props {
  name: string
  age?: number          // ? 表示可选
  tags?: string[]
  status?: 'active' | 'inactive'  // 联合类型字面量
}

const props = defineProps<Props>()

// 带默认值的类型声明（Vue 3.3+ 支持）
// withDefaults 是编译宏，也不需导入
const props = withDefaults(defineProps<Props>(), {
  age: 0,
  tags: () => [],
  status: 'active'
})
</script>

<template>
  <div class="card">
    <h3>{{ props.name }}</h3>
    <!-- 模板中也可省略 props. 直接访问 -->
    <h3>{{ name }}</h3>
    <p>年龄：{{ age }}</p>
    <span v-for="tag in tags" :key="tag">{{ tag }}</span>
  </div>
</template>
```

```vue
<!-- 父组件 -->
<template>
  <ChildCard name="张三" :age="25" :tags="['Vue', 'TS']" status="active" />
</template>
```

**关键点**：
- `defineProps` 是编译宏，不需要从 vue 导入
- 类型声明方式提供完整的 IDE 智能提示和类型检查
- `withDefaults` 为可选的 props 提供默认值
- **Props 是只读的**，子组件不应该直接修改 props（单向数据流原则）

### 三、defineEmits：类型安全的事件声明

子组件通过 `defineEmits` 声明可以向父组件触发的事件：

```vue
<!-- 子组件 SearchBar.vue -->
<script setup lang="ts">
// ============ 类型声明方式 ============
interface Emits {
  // 事件名: (参数列表) => 返回值
  (e: 'search', keyword: string): void
  (e: 'clear'): void
  (e: 'update:modelValue', value: string): void
}

const emit = defineEmits<Emits>()

const keyword = ref('')

function handleSearch() {
  if (keyword.value.trim()) {
    emit('search', keyword.value)  // 触发父组件的 @search 事件
  }
}

function handleClear() {
  keyword.value = ''
  emit('clear')
}
</script>
```

```vue
<!-- 父组件 -->
<template>
  <SearchBar
    @search="handleSearch"
    @clear="handleClear"
  />
</template>

<script setup lang="ts">
function handleSearch(keyword: string) {
  console.log('搜索关键词:', keyword)
}
function handleClear() {
  console.log('已清空')
}
</script>
```

**对比 React**：`emit` ≈ React 中通过 props 传递回调函数 `onSearch(keyword)`。Vue 的方式更接近原生 DOM 事件模型，监听和触发分离。

### 四、defineExpose：暴露子组件方法

默认情况下，`<script setup>` 的组件对外是封闭的，父组件通过 `ref` 无法访问子组件内部。`defineExpose` 选择性暴露：

```vue
<!-- 子组件 Modal.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)
const title = ref('')

function open(modalTitle: string) {
  title.value = modalTitle
  visible.value = true
}

function close() {
  visible.value = false
}

// 只暴露 open 和 close，visible 和 title 对外不可见
defineExpose({ open, close })
</script>
```

```vue
<!-- 父组件 -->
<script setup lang="ts">
import { ref } from 'vue'
import Modal from './Modal.vue'

// 获取组件实例的模板引用，类型会自动推导
const modalRef = ref<InstanceType<typeof Modal>>()

function showModal() {
  modalRef.value?.open('确认删除')  // 类型安全的方法调用
}
</script>

<template>
  <button @click="showModal">打开弹窗</button>
  <Modal ref="modalRef" />
</template>
```

**与 React 对比**：`defineExpose` ≈ React 的 `useImperativeHandle` + `forwardRef`，都是限制性地暴露子组件方法。但 Vue 的设计更简洁——不需要额外的 HOC。

### 五、defineModel（Vue 3.4+）：简化 v-model 双向绑定

`defineModel` 是 Vue 3.4 引入的编译宏，极大简化了组件上的 `v-model` 双向绑定：

```vue
<!-- ============ Vue 3.4 之前 ============ -->
<script setup lang="ts">
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// 手动创建代理变量
const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})
</script>

<!-- ============ Vue 3.4+ ============ -->
<script setup lang="ts">
// 一行搞定！等价于上面的所有代码
const modelValue = defineModel<string>({ required: true })

// 多个 v-model
const firstName = defineModel<string>('firstName', { required: true })
const lastName = defineModel<string>('lastName', { default: '' })
</script>
```

```vue
<!-- 父组件使用 -->
<template>
  <CustomInput v-model="text" />
  <!-- 等价于 -->
  <CustomInput :model-value="text" @update:model-value="text = $event" />

  <!-- 多个 v-model -->
  <UserName v-model:first-name="first" v-model:last-name="last" />
</template>
```

`defineModel` 本质上是一个语法糖，底层仍然是 props + emit 机制，即它帮你隐式创建了 prop（名为 `modelValue` 或你指定的名称）和对 `update:xxx` 的 emit。但在写法上，它让你可以像使用普通 `ref` 一样直接读写这个值，组件内部逻辑更直观。

### 六、watch vs watchEffect

两者都是用于监听响应式数据变化并执行副作用，但行为模式不同：

```typescript
import { ref, reactive, watch, watchEffect } from 'vue'

const keyword = ref('')
const user = reactive({ name: '', age: 0 })

// ============ watch：显式指定监听源 ============

// 监听单个 ref
watch(keyword, (newVal, oldVal) => {
  console.log(`关键词从 "${oldVal}" 变为 "${newVal}"`)
})

// 监听 reactive 对象的属性（用 getter 函数）
watch(
  () => user.name,
  (newName) => {
    console.log('用户名变化:', newName)
  }
)

// 同时监听多个源
watch(
  [keyword, () => user.age],
  ([newKeyword, newAge], [oldKeyword, oldAge]) => {
    console.log('关键词或年龄发生了变化')
  }
)

// 深度监听（deep: true）：监听对象内部嵌套属性的变化
watch(
  () => user,
  (newUser) => {
    console.log('user 内部属性变化')
  },
  { deep: true }  // 对 reactive 对象默认 deep: true
)

// 立即执行（immediate: true）：组件初始化时先执行一次
watch(keyword, (val) => {
  console.log('关键词:', val)
}, { immediate: true })

// ============ watchEffect：自动收集依赖 ============

watchEffect(() => {
  // 回调中访问了哪些响应式数据，就自动监听哪些
  // 初始化时立即执行一次（等价于 watch 的 immediate: true）
  console.log(`搜索：${keyword.value}，用户：${user.name}`)
})

// watchEffect 返回一个停止函数
const stop = watchEffect(() => {
  /* ... */
})
// 需要时手动停止
stop()
```

#### 核心区别对比

| 对比维度 | watch | watchEffect |
|---------|-------|-------------|
| 依赖收集 | **显式指定**监听源 | **自动追踪**回调中的响应式依赖 |
| 初始化执行 | 默认不执行，需 `immediate: true` | 立即执行一次 |
| 新旧值 | 回调参数提供 `(newVal, oldVal)` | 不提供新旧值 |
| 停止方式 | 返回停止函数 | 返回停止函数 |
| 副作用清理 | `onCleanup` 参数（第三个参数） | `onCleanup` 参数 |
| 适用场景 | 需要比较新旧值、精确控制触发时机 | 依赖较多、不想手动声明、需要立即执行 |
| 深度监听 | 需要显式 `deep: true` | 自动深度追踪所有访问的属性 |

**实战经验**：
- 需要拿到旧值对比时 → `watch`
- 依赖简单明确、需要新旧值 → `watch`
- 依赖复杂、不需要旧值 → `watchEffect`
- 需要在数据变化后发请求 → `watch`（配合防抖更可控）
- 需要根据多个状态计算并更新 DOM → `watchEffect`

**与 React 对比**：`watch` ≈ React 的 `useEffect` 加依赖数组（但 watch 显式指定监听源而非声明依赖数组），`watchEffect` ≈ React 的 `useEffect` 不加依赖数组（每次渲染都执行）。Vue 的方式更精细，因为响应式系统能精确追踪到具体是哪个属性变了。

### 七、模板引用 ref（访问 DOM 元素）

用 `ref` 属性获取模板中的 DOM 元素或组件实例：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 声明一个 ref 变量，变量名必须与模板中 ref 属性值相同
const inputRef = ref<HTMLInputElement | null>(null)
const divRef = ref<HTMLDivElement | null>(null)

// onMounted 中 DOM 已挂载，可以安全访问
onMounted(() => {
  inputRef.value?.focus()  // 自动聚焦
  console.log(divRef.value?.offsetHeight)
})

// 在普通函数中使用（需要确保 DOM 已挂载）
function focusInput() {
  inputRef.value?.focus()
}

// ============ v-for 中使用 ref ============
const items = ref(['a', 'b', 'c'])
const itemRefs = ref<HTMLLIElement[]>([])

// 动态 ref：值为函数时，每次挂载/更新都会调用
function setItemRef(el: HTMLLIElement | null, index: number) {
  if (el) itemRefs.value[index] = el
}
</script>

<template>
  <!-- 单个元素 ref -->
  <input ref="inputRef" type="text" placeholder="自动聚焦" />

  <!-- 绑定到组件获取组件实例 -->
  <ChildComponent ref="childRef" />

  <!-- v-for 中的动态 ref -->
  <ul>
    <li
      v-for="(item, index) in items"
      :key="item"
      :ref="(el) => setItemRef(el as HTMLLIElement | null, index)"
    >
      {{ item }}
    </li>
  </ul>
</template>
```

**注意**：`ref` 属性挂载的值在 `onMounted` 及之后的生命周期中才可用，`setup` 阶段 DOM 还未渲染。

### 八、Teleport 组件

`<Teleport>` 允许将组件的 DOM 内容"传送"到指定位置，解决 z-index 和 overflow 的层叠问题：

```vue
<template>
  <div class="app">
    <button @click="showModal = true">打开弹窗</button>

    <!-- 内容会被渲染到 body 下的 #modal-container -->
    <Teleport to="#modal-container">
      <div v-if="showModal" class="modal-overlay">
        <div class="modal-content">
          <h3>提示</h3>
          <p>这是一条重要消息</p>
          <button @click="showModal = false">关闭</button>
        </div>
      </div>
    </Teleport>

    <!-- 也可以传送到 body 末尾（没有 #modal-container 时自动创建） -->
    <Teleport to="body">
      <Notification v-if="showNotify" />
    </Teleport>
  </div>
</template>

<!-- index.html 中预置的挂载点 -->
<!--
<body>
  <div id="app"></div>
  <div id="modal-container"></div>
</body>
-->
```

**典型场景**：
- Modal / Dialog（避免被父元素 `overflow: hidden` 裁剪）
- Toast / Notification（保证在页面最顶层）
- 全局 Loading 遮罩

### 九、实战：带搜索的表格组件

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'

// ==================== 类型定义 ====================
interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  status: 'active' | 'inactive'
}

// ==================== 数据 ====================
const users = ref<User[]>([
  { id: 1, name: '张三', email: 'zhangsan@example.com', role: 'admin', status: 'active' },
  { id: 2, name: '李四', email: 'lisi@example.com', role: 'editor', status: 'active' },
  { id: 3, name: '王五', email: 'wangwu@example.com', role: 'viewer', status: 'inactive' },
  { id: 4, name: '赵六', email: 'zhaoliu@example.com', role: 'editor', status: 'active' },
  { id: 5, name: '孙七', email: 'sunqi@example.com', role: 'viewer', status: 'inactive' }
])

// ==================== 搜索 ====================
const searchKeyword = ref('')
const roleFilter = ref<'all' | User['role']>('all')
const statusFilter = ref<'all' | User['status']>('all')

// 计算属性：多重筛选
const filteredUsers = computed(() => {
  let result = users.value

  // 关键词搜索（姓名或邮箱）
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.trim().toLowerCase()
    result = result.filter(
      u => u.name.includes(keyword) || u.email.includes(keyword)
    )
  }

  // 角色筛选
  if (roleFilter.value !== 'all') {
    result = result.filter(u => u.role === roleFilter.value)
  }

  // 状态筛选
  if (statusFilter.value !== 'all') {
    result = result.filter(u => u.status === statusFilter.value)
  }

  return result
})

// 结果统计
const resultCount = computed(() => filteredUsers.value.length)

// ==================== 排序 ====================
type SortKey = 'name' | 'email' | 'role' | 'status'
const sortKey = ref<SortKey>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

const sortedUsers = computed(() => {
  const list = [...filteredUsers.value]
  list.sort((a, b) => {
    const aVal = a[sortKey.value]
    const bVal = b[sortKey.value]
    const factor = sortOrder.value === 'asc' ? 1 : -1
    return aVal > bVal ? factor : -factor
  })
  return list
})

function toggleSort(key: SortKey) {
  if (sortKey.value === key) {
    // 点击同一列：切换升降序
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = key
    sortOrder.value = 'asc'
  }
}

// watchEffect 自动收集：结果变化时打印日志
watchEffect(() => {
  console.log(`筛选结果：${resultCount.value} 条记录`)
})

// ==================== 分页 ====================
const currentPage = ref(1)
const pageSize = ref(3)
const totalPages = computed(() => Math.ceil(sortedUsers.value.length / pageSize.value))

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return sortedUsers.value.slice(start, start + pageSize.value)
})

// 搜索条件变化时重置到第一页
watch([searchKeyword, roleFilter, statusFilter], () => {
  currentPage.value = 1
})

// ==================== 操作 ====================
function toggleStatus(id: number) {
  const user = users.value.find(u => u.id === id)
  if (user) {
    user.status = user.status === 'active' ? 'inactive' : 'active'
  }
}

// ==================== 角色映射 ====================
const roleLabel: Record<User['role'], string> = {
  admin: '管理员',
  editor: '编辑者',
  viewer: '观察者'
}
</script>

<template>
  <div class="table-demo">
    <h2>用户管理</h2>

    <!-- 搜索栏 -->
    <div class="toolbar">
      <input
        v-model="searchKeyword"
        placeholder="搜索姓名或邮箱..."
        class="search-input"
      />
      <select v-model="roleFilter" class="filter-select">
        <option value="all">全部角色</option>
        <option value="admin">管理员</option>
        <option value="editor">编辑者</option>
        <option value="viewer">观察者</option>
      </select>
      <select v-model="statusFilter" class="filter-select">
        <option value="all">全部状态</option>
        <option value="active">启用</option>
        <option value="inactive">禁用</option>
      </select>
    </div>

    <!-- 表格 -->
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th @click="toggleSort('name')" class="sortable">
              姓名 {{ sortKey === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅' }}
            </th>
            <th @click="toggleSort('email')" class="sortable">
              邮箱 {{ sortKey === 'email' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅' }}
            </th>
            <th @click="toggleSort('role')" class="sortable">
              角色 {{ sortKey === 'role' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅' }}
            </th>
            <th @click="toggleSort('status')" class="sortable">
              状态 {{ sortKey === 'status' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅' }}
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paginatedUsers.length === 0">
            <td colspan="5" class="empty-row">无匹配结果</td>
          </tr>
          <tr v-for="user in paginatedUsers" :key="user.id">
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ roleLabel[user.role] }}</td>
            <td>
              <span :class="['status-badge', user.status]">
                {{ user.status === 'active' ? '启用' : '禁用' }}
              </span>
            </td>
            <td>
              <button @click="toggleStatus(user.id)" class="btn-action">
                {{ user.status === 'active' ? '禁用' : '启用' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="pagination" v-if="totalPages > 1">
      <button :disabled="currentPage <= 1" @click="currentPage--">上一页</button>
      <span>第 {{ currentPage }} / {{ totalPages }} 页（共 {{ resultCount }} 条）</span>
      <button :disabled="currentPage >= totalPages" @click="currentPage++">下一页</button>
    </div>
  </div>
</template>

<style scoped>
.table-demo {
  max-width: 900px;
  margin: 0 auto;
  font-family: system-ui, sans-serif;
}
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}
.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
.table-wrapper {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}
th {
  background: #f5f5f5;
  font-weight: 600;
}
th.sortable {
  cursor: pointer;
  user-select: none;
}
th.sortable:hover {
  background: #e8e8e8;
}
.empty-row {
  text-align: center;
  color: #999;
  padding: 40px;
}
.status-badge {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 13px;
}
.status-badge.active {
  background: #e6f7e6;
  color: #2e7d32;
}
.status-badge.inactive {
  background: #f5f5f5;
  color: #999;
}
.btn-action {
  padding: 4px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}
.pagination button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
```

**要点回顾**：
- `<script setup>` 自动暴露顶层绑定，编译优化
- `defineProps` + TypeScript 实现类型安全的 props
- `defineEmits` 声明事件接口
- `computed` 实现多重筛选 + 排序 + 分页
- `watchEffect` 自动收集依赖打印日志
- `watch` 监听筛选条件变化重置页码

---

## 常见问题

**Q1：script setup 和普通 setup() 函数功能上有什么实际差异？**

A：功能等价，但 `script setup` 更简洁（无需 return），编译产物更优（静态提升更彻底），TypeScript 体验更好。唯一的限制是：不能在 `script setup` 中使用 `this`（但 Composition API 本就不需要 this）。

**Q2：defineProps 的两种声明方式选哪种？**

A：TypeScript 项目中用纯类型声明（`defineProps<Props>()`），享受完整的类型推导和 IDE 提示。JavaScript 项目用运行时声明方式。`withDefaults` 只在类型声明方式下使用。

**Q3：watch 和 watchEffect 同时监听了同一个变量，谁先执行？**

A：`watchEffect` 先执行。因为它在初始化时就立即执行一次（收集依赖），然后数据变化时再次执行。`watch` 默认不立即执行，需要 `immediate: true` 才会初始化时执行。如果都监听了同一个变化，执行顺序是：先创建的 watchEffect → 先创建的 watch。

**Q4：defineModel 是新的底层实现吗？**

A：不是，它是纯粹的编译宏。编译后等价于 `defineProps` + `defineEmits`。好处是简化代码，不需要手写 getter/setter。如果你的项目 Vue 版本 < 3.4，仍然需要用传统方式。

**Q5：Teleport 的内容还能响应父组件的状态变化吗？**

A：能。Teleport 只改变了 DOM 的挂载位置，逻辑层级不变——内容仍然属于当前组件树，能正常访问父组件的状态、props 和依赖注入，生命周期也按当前组件树正常执行。

**Q6：如何在父组件中调用 script setup 子组件的方法？**

A：子组件用 `defineExpose` 暴露方法，父组件用 `ref` 获取组件实例，然后通过 `ref.value.methodName()` 调用。注意这打破了单向数据流，应谨慎使用，优先考虑 props + emit 模式。

**Q7：v-for 列表的 ref 为什么需要用函数形式？**

A：因为 `v-for` 渲染多个元素，简单的 `ref="xxx"` 会指向最后一个渲染的元素。用函数 `:ref="(el) => callback(el, index)"` 可以拿到每个元素的引用并存到数组中，适用于需要操作多个 DOM 节点的场景。

**Q8：Teleport 和 CSS position: fixed 有什么区别？**

A：`position: fixed` 只解决相对于视口的定位问题，但元素仍然在父级 DOM 树中，受限于父级的 `transform`、`filter`、`perspective` 等 CSS 属性（会创建新的包含块）以及 `overflow: hidden`。Teleport 将元素移到 body 级别，彻底绕开所有层叠上下文限制。

---

## 实操作业

### 基础：用户信息表单

- 用 `defineProps` 接收初始用户数据
- 用 `defineEmits` 向父组件提交表单数据
- 用 `defineModel` 实现一个 `v-model` 的自定义输入框组件
- 表单包含：姓名、邮箱、角色选择

### 进阶：可拖拽排序的表格

在实战表格基础上扩展：
- 用 `watch` 监听排序变化并保存到 localStorage
- 用 `watchEffect` 实现搜索结果自动打印到控制台
- 实现列表项拖拽排序功能
- 选中多行批量操作（全选/反选/删除）

### 挑战：全局通知系统

用 Teleport + provide/inject + 组合函数实现：
- 一个 `useNotification` composable，提供 `notify(msg, type)` 方法
- 用 `provide` 在全局注入
- Notification 组件用 Teleport 渲染到 body
- 支持自动消失（watch + setTimeout）
- 支持 success / error / warning / info 四种类型

<!-- exercise-guidance:start -->
### 作业参考与验收

- **基础**：Props 初始值复制成表单草稿，提交 emit 新对象；defineModel 明确类型。编辑不直接改父数据，取消不污染原值，姓名/邮箱/角色均有合法值验证。
- **进阶**：拖拽以 ID 排序，选择集合独立于展示顺序；watch 只持久化必要数据。刷新后顺序恢复，删除已选项同步移除 ID，并提供键盘排序替代。
- **挑战**：provide 统一通知动作和列表，Teleport 放 DOM 容器，按 ID 管 timer。四类通知有文本语义，卸载清 timer，移除通知后旧 timer 不影响其他条目。
<!-- exercise-guidance:end -->
<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“Composition API 与 script setup”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
- 起始验证：在 `前端学习路线` 目录运行 `npm run atlas:test`。
- 自动检查：为本课新增或修改的行为补充测试；无法自动化的浏览器行为必须保留截图、Network、Performance 或无障碍树证据。

### 项目验收

- [ ] 正常路径可以从统一入口复现
- [ ] 空值、错误或权限边界至少覆盖一项
- [ ] 相关自动测试通过，且没有删除既有断言
- [ ] 记录一个“现象—原因—验证—结论”
<!-- atlas-task:end -->

---

## 本节小结

- **`<script setup>`**：编译时语法糖，自动暴露顶层绑定，TypeScript 原生支持
- **defineProps / defineEmits**：类型安全的组件接口，编译宏无需导入
- **defineExpose**：选择性暴露子组件方法，类似 React 的 useImperativeHandle
- **defineModel（3.4+）**：一行搞定 v-model 双向绑定
- **watch**：显式指定监听源，可拿新旧值，精确控制
- **watchEffect**：自动收集依赖，初始化立即执行，适合副作用同步
- **模板 ref**：访问 DOM 元素或组件实例，需在 onMounted 后使用
- **Teleport**：将 DOM 传送至指定位置，解决弹窗/通知的层叠问题

<!-- course-nav:start -->
---

[上一篇：01 模板语法与响应式基础](./01-模板语法与响应式基础.md) · [课程地图](../../README.md) · [下一篇：03 计算属性、侦听器与生命周期](./03-计算属性-侦听器-生命周期.md)
<!-- course-nav:end -->
