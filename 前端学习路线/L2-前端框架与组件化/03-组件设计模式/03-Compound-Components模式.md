# Compound Components 模式

<!-- course-meta:start -->
> **课程元数据**
> - 层级：L2 前端框架与组件化
> - 先修：[受控与非受控组件](./02-受控与非受控组件.md)
> - 建议用时：150-240 分钟
> - 技术基线：2026-10，详见[技术基线与来源](../../技术基线与来源.md)
> - 一手资料：[MDN Web Docs](https://developer.mozilla.org/)
> - 完成要求：运行示例、完成至少基础作业、提交验证记录
<!-- course-meta:end -->

## 学习目标

- 理解 Compound Components（复合组件）的设计思想：父子组件通过隐式上下文通信
- 掌握 React Context 驱动复合组件的完整实现
- 掌握 Vue provide/inject 驱动的等效实现
- 能独立实现 Select/Option、Tabs/Tab、Accordion/Item 等经典复合组件
- 理解复合组件与传统 props 透传的本质区别

---

## 内容讲解

### 一、什么是 Compound Components

设想你正在设计一个 `Select` 组件。传统 API 可能长这样：

```jsx
<Select options={[{ value: 'bj', label: '北京' }, ...]} onChange={...} />
```

这很简洁，但完全不灵活——如果你想在选项前加图标、分组、自定义高亮呢？你只能不断往 `options` 上加字段，直到配置臃肿不堪。

**Compound Components**（复合组件）方案：

```jsx
<Select value={val} onChange={setVal}>
  <Select.Option value="bj">🏙️ 北京</Select.Option>
  <Select.Option value="sh">🌆 上海</Select.Option>
  <Select.Option value="sz" disabled>🌃 深圳</Select.Option>
</Select>
```

**核心思想**：一组组件**共同工作**，它们通过**隐式的上下文**共享状态，而不是通过显式的 props 层层传递。使用方通过**组合子组件**来声明 UI，而不是通过配置对象。

**本质区别**：

| 传统 props 透传 | Compound Components |
|---|---|
| 配置驱动，扁平对象 | 组合驱动，嵌套 JSX/模板 |
| 灵活性受限，需预定义所有可能 | 无限灵活，使用方自由组合 |
| 子组件不知道父组件状态 | 子组件通过 Context 感知父组件 |
| `<Select options={...} />` | `<Select><Select.Option/></Select>` |

---

### 二、React 实现：Context 驱动

React 的 Compound Components 依赖 **Context** 实现隐式状态共享。

#### 2.1 手动挂载子组件

```jsx
import { createContext, useContext, useState } from 'react';

// ========== 1. 创建 Context ==========
const SelectContext = createContext(null);

// ========== 2. 父组件 ==========
function Select({ children, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  // 将状态和方法通过 Context 下发
  const contextValue = {
    value,        // 当前选中值
    onChange,     // 选中变化回调
    isOpen,       // 下拉是否打开
    open:  () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((v) => !v),
  };

  return (
    <SelectContext.Provider value={contextValue}>
      <div className="select" tabIndex={0} onBlur={() => setIsOpen(false)}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

// ========== 3. 子组件 ==========
function Option({ value: optionValue, children }) {
  const { value, onChange, close } = useContext(SelectContext);
  const isSelected = value === optionValue;

  return (
    <div
      className={`select-option ${isSelected ? 'selected' : ''}`}
      onClick={() => { onChange(optionValue); close(); }}
    >
      {children}
    </div>
  );
}

// ========== 4. 挂载为静态属性 ==========
Select.Option = Option;

export default Select;
```

使用：

```jsx
<Select value={city} onChange={setCity}>
  <Select.Trigger placeholder="请选择城市" />
  <Select.Option value="bj">北京</Select.Option>
  <Select.Option value="sh">上海</Select.Option>
  <Select.Option value="sz">深圳</Select.Option>
</Select>
```

#### 2.2 完整 Select 组件（支持单选、多选、搜索）

```jsx
import { createContext, useContext, useState, useRef, useEffect } from 'react';

const SelectContext = createContext(null);

// ========== Select（父容器）==========
function Select({ children, value, onChange, multiple = false }) {
  const [isOpen, setIsOpen]   = useState(false);
  const [search, setSearch]   = useState('');
  const containerRef          = useRef(null);

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // 多选模式下的值操作
  function selectValue(optionValue) {
    if (multiple) {
      const arr = Array.isArray(value) ? value : [];
      if (arr.includes(optionValue)) {
        onChange(arr.filter((v) => v !== optionValue));
      } else {
        onChange([...arr, optionValue]);
      }
    } else {
      onChange(optionValue);
      setIsOpen(false);
    }
  }

  function isSelected(optionValue) {
    return multiple
      ? Array.isArray(value) && value.includes(optionValue)
      : value === optionValue;
  }

  const ctx = {
    value, selectValue, isSelected, isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((v) => !v),
    search, setSearch,
  };

  return (
    <SelectContext.Provider value={ctx}>
      <div ref={containerRef} className="select-root">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

// ========== Trigger —— 触发器 ==========
function Trigger({ placeholder = '请选择' }) {
  const { value, isOpen, toggle } = useContext(SelectContext);
  const displayText = Array.isArray(value)
    ? value.length ? `已选 ${value.length} 项` : placeholder
    : value || placeholder;

  return (
    <div className="select-trigger" onClick={toggle}>
      <span>{displayText}</span>
      <span className={`arrow ${isOpen ? 'open' : ''}`}>▾</span>
    </div>
  );
}

// ========== Dropdown —— 下拉面板 ==========
function Dropdown({ children }) {
  const { isOpen, search, setSearch } = useContext(SelectContext);
  if (!isOpen) return null;

  return (
    <div className="select-dropdown">
      {/* 搜索框 */}
      <div className="select-search">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索..."
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="select-options">{children}</div>
    </div>
  );
}

// ========== Option —— 选项 ==========
function Option({ value: optionValue, disabled, children }) {
  const { selectValue, isSelected, search } = useContext(SelectContext);

  // 搜索过滤：不区分大小写匹配 label 文本
  if (search && typeof children === 'string') {
    if (!children.toLowerCase().includes(search.toLowerCase())) {
      return null;
    }
  }

  return (
    <div
      className={`select-option ${isSelected(optionValue) ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={() => !disabled && selectValue(optionValue)}
    >
      {/* 多选模式显示复选框 */}
      {Array.isArray(selectValue) && (
        <input type="checkbox" checked={isSelected(optionValue)} readOnly />
      )}
      {children}
    </div>
  );
}

// ========== 挂载子组件 ==========
Select.Trigger  = Trigger;
Select.Dropdown = Dropdown;
Select.Option   = Option;

export default Select;
```

使用：

```jsx
const [city, setCity] = useState('');

<Select value={city} onChange={setCity}>
  <Select.Trigger placeholder="请选择城市" />
  <Select.Dropdown>
    <Select.Option value="bj">北京</Select.Option>
    <Select.Option value="sh">上海</Select.Option>
    <Select.Option value="sz" disabled>深圳（暂不可选）</Select.Option>
  </Select.Dropdown>
</Select>
```

**为什么子组件能自动感知父组件状态？** 因为 `useContext(SelectContext)` —— Context 绕过了 props 的显式传递，实现了「只要在 Provider 子树内，就能读取数据」。这就是 Compound Components 的魔法核心。

---

### 三、Vue 实现：provide/inject

Vue 的 `provide` / `inject` 与 React Context 在概念上完全对应。

#### 3.1 provide/inject 基础

```vue
<!-- Select.vue -->
<template>
  <div class="select-root" ref="containerRef">
    <slot />
  </div>
</template>

<script setup>
import { ref, provide, readonly } from 'vue'

const props = defineProps({
  modelValue: [String, Number, Array],
  multiple: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const search = ref('')

function selectValue(optionValue) {
  if (props.multiple) {
    const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : []
    const idx = arr.indexOf(optionValue)
    if (idx > -1) arr.splice(idx, 1)
    else arr.push(optionValue)
    emit('update:modelValue', arr)
  } else {
    emit('update:modelValue', optionValue)
    isOpen.value = false
  }
}

function isSelected(optionValue) {
  return props.multiple
    ? Array.isArray(props.modelValue) && props.modelValue.includes(optionValue)
    : props.modelValue === optionValue
}

// 向所有子组件注入共享状态
provide('selectContext', {
  modelValue: readonly(props.modelValue), // 只读，防止子组件直接修改
  multiple: props.multiple,
  isOpen: readonly(isOpen),
  search: readonly(search),
  selectValue,
  isSelected,
  open:  () => { isOpen.value = true },
  close: () => { isOpen.value = false },
  toggle: () => { isOpen.value = !isOpen.value },
  setSearch: (v) => { search.value = v },
})
</script>
```

子组件：

```vue
<!-- SelectOption.vue -->
<template>
  <div
    v-if="visible"
    class="select-option"
    :class="{ selected: ctx.isSelected(value), disabled }"
    @click="!disabled && ctx.selectValue(value)"
  >
    <slot />
  </div>
</template>

<script setup>
import { inject, computed } from 'vue'

const props = defineProps({
  value: [String, Number],
  disabled: Boolean,
})

const ctx = inject('selectContext')

// 搜索过滤
const visible = computed(() => {
  if (!ctx.search.value) return true
  // 尝试获取默认插槽的文本内容来做搜索匹配（简化处理）
  return true
})
</script>
```

**关于组件注册**：Vue 通常不把子组件挂为父组件的静态属性，而是通过**单独导出**或**目录约定**来组织：`Select.vue`、`SelectOption.vue`、`SelectTrigger.vue` 放在同一目录下。使用时分别导入，或者通过 `import { Select, SelectOption } from './select'` 统一导出。

---

### 四、Tabs 标签页实战

#### React 实现

```jsx
import { createContext, useContext, useState } from 'react';

const TabsContext = createContext(null);

// ========== Tabs ==========
function Tabs({ children, defaultActiveKey, activeKey, onChange }) {
  const [internalActive, setInternalActive] = useState(defaultActiveKey ?? '');

  // 支持受控/非受控两种模式
  const isControlled = activeKey !== undefined;
  const currentKey = isControlled ? activeKey : internalActive;

  function handleChange(key) {
    if (!isControlled) setInternalActive(key);
    onChange?.(key);
  }

  return (
    <TabsContext.Provider value={{ activeKey: currentKey, onChange: handleChange }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

// ========== TabList —— 标签头部 ==========
function TabList({ children }) {
  return <div className="tabs-header">{children}</div>;
}

// ========== Tab —— 单个标签 ==========
function Tab({ tabKey, children }) {
  const { activeKey, onChange } = useContext(TabsContext);

  return (
    <button
      className={`tabs-tab ${activeKey === tabKey ? 'active' : ''}`}
      onClick={() => onChange(tabKey)}
    >
      {children}
    </button>
  );
}

// ========== TabPanels —— 内容区容器 ==========
function TabPanels({ children }) {
  return <div className="tabs-content">{children}</div>;
}

// ========== TabPanel —— 单个内容面板 ==========
function TabPanel({ tabKey, children }) {
  const { activeKey } = useContext(TabsContext);
  if (activeKey !== tabKey) return null;
  return <div className="tabs-panel">{children}</div>;
}

// 挂载
Tabs.TabList   = TabList;
Tabs.Tab       = Tab;
Tabs.TabPanels = TabPanels;
Tabs.TabPanel  = TabPanel;

export default Tabs;
```

使用：

```jsx
<Tabs defaultActiveKey="users" onChange={(key) => console.log('切换到:', key)}>
  <Tabs.TabList>
    <Tabs.Tab tabKey="users">用户管理</Tabs.Tab>
    <Tabs.Tab tabKey="orders">订单管理</Tabs.Tab>
    <Tabs.Tab tabKey="settings">系统设置</Tabs.Tab>
  </Tabs.TabList>
  <Tabs.TabPanels>
    <Tabs.TabPanel tabKey="users"><UserTable /></Tabs.TabPanel>
    <Tabs.TabPanel tabKey="orders"><OrderTable /></Tabs.TabPanel>
    <Tabs.TabPanel tabKey="settings"><SettingsForm /></Tabs.TabPanel>
  </Tabs.TabPanels>
</Tabs>
```

**为什么不用 props 传递？** 如果不用 Compound Components，API 会变成：

```jsx
<Tabs items={[{key:'users',label:'用户管理',content:<UserTable/>},...]}/>
```

- Tab 内部要是有复杂的结构（图标、角标、Tooltip）怎么办？加字段。
- Panel 如果也要和 Tab 联动、加动画呢？加更多字段。
- 迟早变成「配置地狱」。

Compound Components 直接让使用方写 JSX 组装，**天然支持任意复杂度**。

---

#### Vue 实现

```vue
<!-- Tabs.vue -->
<template>
  <div class="tabs">
    <slot />
  </div>
</template>

<script setup>
import { ref, provide, readonly } from 'vue'

const props = defineProps({
  defaultActiveKey: String,
  activeKey: String,
})

const emit = defineEmits(['update:activeKey', 'change'])

const isControlled = props.activeKey !== undefined
const internalActive = ref(props.defaultActiveKey ?? '')

function handleChange(key) {
  if (!isControlled) internalActive.value = key
  emit('update:activeKey', key)
  emit('change', key)
}

provide('tabsContext', {
  activeKey: isControlled ? readonly(props.activeKey) : internalActive,
  onChange: handleChange,
})
</script>
```

```vue
<!-- Tab.vue -->
<template>
  <button
    class="tabs-tab"
    :class="{ active: ctx.activeKey === tabKey }"
    @click="ctx.onChange(tabKey)"
  >
    <slot />
  </button>
</template>

<script setup>
import { inject } from 'vue'
defineProps({ tabKey: { type: String, required: true } })
const ctx = inject('tabsContext')
</script>
```

```vue
<!-- TabPanel.vue -->
<template>
  <div v-if="ctx.activeKey === tabKey" class="tabs-panel">
    <slot />
  </div>
</template>

<script setup>
import { inject } from 'vue'
defineProps({ tabKey: { type: String, required: true } })
const ctx = inject('tabsContext')
</script>
```

使用：

```vue
<Tabs default-active-key="users" @change="(key) => console.log('切换到:', key)">
  <TabList>
    <Tab tab-key="users">用户管理</Tab>
    <Tab tab-key="orders">订单管理</Tab>
  </TabList>
  <TabPanels>
    <TabPanel tab-key="users"><UserTable /></TabPanel>
    <TabPanel tab-key="orders"><OrderTable /></TabPanel>
  </TabPanels>
</Tabs>
```

---

## 常见问题

**Q1：Compound Components 和普通组件组合有什么区别？**

普通组合中，子组件不知道父组件的状态（除非通过 props 显式传入）。Compound Components 中，子组件通过 Context 自动感知父组件状态，使用者不需要手动传递 props。

**Q2：React Context 和 Vue provide/inject 在性能上有区别吗？**

React Context 的值变化会导致所有订阅者重新渲染（可用 `useMemo` 优化）。Vue 的 provide/inject 配合 `ref` 是响应式的，只有实际使用了该数据的组件才会重新渲染。在性能上 Vue 的粒度更细。

**Q3：子组件一定要挂载为父组件的静态属性吗？**

不是必须，但这是 React 社区的惯用做法（`Select.Option`），好处是：
- 一眼看出这些组件是一套的
- 避免命名冲突（`Option` vs `SelectOption`）
- import 一条语句搞定

Vue 社区通常用目录约定或统一导出文件。

**Q4：复合组件如何做类型校验？**

在子组件中检查 Context 是否为 `null`：

```jsx
function Option(props) {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error('<Select.Option> must be used inside <Select>');
  // ...
}
```

这样如果误用，会立刻报错，而不是静默失败或产生 `undefined` 异常。

**Q5：Vue 的 slot 和 Compound Components 有什么关系？**

两者是互补的。Compound Components 解决的是「多组件间隐式共享状态」的问题，slot 解决的是「内容分发」的问题。在一个 Compound Component 中，父组件用 `provide` 下发状态，子组件用 slot 接收内容——两者结合使用。

**Q6：为什么 React 版本用 `children` 而不用 render props？**

Compound Components 模式下，子组件各自通过 Context 读取状态，不需要父组件向子组件传递数据。render props 用于「父组件向子组件传递渲染函数+数据」的场景。两者解决的问题不同：Compound Components 解决隐式状态共享，render props 解决显式渲染控制。

**Q7：可以用 Composable（Vue）/ Hook（React）替代 Compound Components 吗？**

不能完全替代。Hook/Composable 解决的是**逻辑复用**；Compound Components 解决的是**UI 组合 + 隐式状态共享**。一个 Select 组件需要使用者自由排列 Trigger、Dropdown、Option 的位置和结构，这是 UI 层面的灵活性问题，不是逻辑复用问题。

**Q8：复合组件是否需要把整个 context 对象 memo 化？**

React 中如果 context value 是一个每次渲染都新建的对象，会导致所有消费者重新渲染。建议用 `useMemo` 包裹：

```jsx
const ctx = useMemo(() => ({ value, onChange, isOpen }), [value, onChange, isOpen]);
```

Vue 中 `provide` 传递 `reactive` 或 `ref` 对象，天然保持引用稳定，不需要额外优化。

---

## 实操作业

### 基础练习：Accordion 手风琴

实现一个 Accordion（手风琴）组件：
- `<Accordion>` 作为容器，管理展开/折叠状态
- `<Accordion.Item>` 表示每一项
- `<Accordion.Header>` 是标题区（点击切换）
- `<Accordion.Panel>` 是内容区
- 支持「同时只展开一项」（默认）和「允许多项同时展开」两种模式
- 分别用 React 和 Vue 实现，对比 Context/provide 的用法差异

### 进阶练习：Menu 导航菜单

实现一个支持嵌套的 Menu 组件：
- `<Menu>` 根容器
- `<Menu.SubMenu>` 子菜单（可嵌套）
- `<Menu.Item>` 菜单项
- 支持横向和纵向两种布局
- SubMenu 通过 hover（横向）或 click（纵向）展开
- 提示：嵌套的 SubMenu 如何让任意层级的 Item 感知到根 Menu 的状态？

### 挑战练习：可扩展的表单容器

设计一套 Form 复合组件：
- `<Form>` 管理所有字段的值、校验状态、提交状态
- `<Form.Item>` 管理单个字段的校验、错误提示、布局
- `<Form.Submit>` 提交按钮，自动感知 Form 的提交状态，提交中自动 disabled
- 任意嵌套层级的 `<Form.Item>` 都能自动注册到根 `<Form>` 的 Context 中
- 支持表单级别的 `onFinish` 回调和字段级别的 `rules` 校验
- 提示：自定义 Hook/Composable 如何与 Compound Components 配合？

---

<!-- atlas-task:start -->
## Atlas 项目任务

- 项目起点：[Atlas 贯穿项目](../../projects/atlas/README.md)
- 阶段目标：[L2 里程碑](../../projects/atlas/milestones/L2.md)
- 本课任务：按 L2 里程碑把“Compound Components 模式”应用到 Atlas 组件化版本，明确组件 API、状态归属、加载与错误状态，并添加行为测试。
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

- **Compound Components** 的核心是「一组组件通过隐式 Context 共享状态，使用方自由组合渲染结构」
- React 用 `createContext` + `useContext` 实现，Vue 用 `provide` + `inject` 实现，本质完全相同
- Context 绕过了 props 显式传递，让任意嵌套层级的子组件都能感知父组件状态
- 典型应用：Select/Option、Tabs/Tab、Accordion/Item、Menu/MenuItem、Form/FormItem
- 相比配置驱动的 API，Compound Components 在**灵活性**上有决定性优势——使用方可以任意排列、插入、包装子组件
- 结合 Hook/Composable 可以在 Compound Components 中进一步解耦逻辑，形成「逻辑层（Hook）→ Context 层（状态分发）→ UI 层（用户组合）」的三层架构

<!-- course-nav:start -->
---

[上一篇：受控与非受控组件](./02-受控与非受控组件.md) · [课程地图](../../README.md) · [下一篇：高阶组件与自定义 Hooks](./04-高阶组件与自定义Hooks.md)
<!-- course-nav:end -->
