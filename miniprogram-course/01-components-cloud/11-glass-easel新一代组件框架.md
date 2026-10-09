# 11-glass-easel新一代组件框架

## 目标

完成本知识单元后，学员应能说清小程序组件框架从 exparser 演进到 glass-easel 的来龙去脉，并能在真实工程中用新一代 Chaining 形式组织复杂组件，而不是只会背一个链式调用的写法。

学员应能够：

1. 说清 exparser 与 glass-easel 各自是什么、两者是替代关系还是并存关系，以及 glass-easel 开始支持 WebView 渲染的基础库版本与 2026 年的用户覆盖率。
2. 区分组件定义的两种形式：传统 Definition（对象字面量）形式与 Chaining（链式调用）形式，理解它们为什么可以混用、在什么场景下优先选择谁。
3. 默写并解释 Chaining 主干：`Component().data().init(function () { /* ... */ }).register()`，知道每一段在组件定义阶段与实例化阶段分别做什么。
4. 理解 `init` 函数会在每个组件实例创建时执行一次，其闭包是实例私有变量的正确存放位置，并能区分“定义期一份”与“每实例一份”。
5. 在 `init` 中通过 `lifetime`、`method`、`observer`、`pageLifetime` 等接口注册生命周期与方法，理解其中 `this` 的指向是组件实例。
6. 说清单一 slot、多 slot（`multipleSlots`）与动态 slot（`dynamicSlots`）的差别，能用动态 slot 让插槽内容在 `wx:for` 中重复并通过 `slot:` 前缀接收数据。
7. 理解 trait behaviors 的设计目的：用 TypeScript 接口在组件之间声明 JS 能力契约，配合 `relations` 实现解耦，并能写出 `Behavior.trait<T>()`、`implement` 与 `traitBehavior` 的完整链路。
8. 使用新 WXML 编译器提供的 `let:` 临时变量与 `class:` 样式类语法，理解它们为什么只在 glass-easel 下可用。
9. 掌握启用 glass-easel 的配置方式（页面 JSON 的 `componentFramework`、`glassEaselWebview` 与 app.json 全局生效），并能为旧基础库设计兼容与回退方案。
10. 用 Chaining 形式独立重写「逛吃指南」中的一个复杂组件（店铺卡片），通过 TypeScript 类型检查并在真机验证行为与旧实现一致。

本单元是阶段二组件化部分的框架升级课，后续 Skyline（U28）强制使用 glass-easel，本课是其前置地基。

## 技术栈

本单元不引入后端依赖，在已有 TypeScript 小程序项目中操作即可。

| 工具或环境 | 用途 | 学习要求 |
|---|---|---|
| 微信基础库 3.8.12 及以上 | 提供 glass-easel 对 WebView 渲染的支持 | 知道 3.8.12 是自由使用门槛，会查覆盖率 |
| 微信开发者工具（建议较新 nightly/稳定版） | 编译、类型检查、真机预览 | 会切换基础库版本、对比两种框架行为 |
| TypeScript | 编写 Chaining 组件与 trait 接口 | 能通过 `tsc` 类型检查，不滥用 any |
| glass-easel Chaining API | `Component()` / `Behavior()` 链式定义 | 掌握 data/init/lifetime/method/observer 等 |
| 新 WXML 编译器语法 | `let:`、`class:`、`style:`、`slot:` | 能正确使用并知道仅 glass-easel 支持 |
| app.json / 页面 JSON | 声明 `componentFramework` | 会全局/逐页启用与回退 |

版本与覆盖率约定：

- 2026 年 8 月官方宣布 glass-easel 可自由使用：从小程序基础库 3.8.12 起支持 WebView 渲染引擎，当时已覆盖约 98% 的微信用户。
- 使用 Skyline 渲染引擎时只能选用 glass-easel，不存在 exparser 选项。
- 具体 API 的最低支持版本以官方文档与真机实测为准；覆盖率数据是工程排期依据，不是“可以不做低版本处理”的理由。

## 详细的理论知识讲解和示例伪代码

### 1. 为什么需要新一代组件框架：exparser 的历史与局限

小程序从 2017 年前后支持自定义组件起，内部使用的组件框架叫 **exparser**。它实现了自定义组件的注册、属性、数据、生命周期、slot、behaviors 等一整套机制，是过去多年小程序组件化的底座。

随着小程序页面越来越复杂，exparser 暴露出三类问题：

1. **历史包袱**：一些早期设计的语义与边界情况难以调整，框架内部更新算法难以整体重构。
2. **新特性受限**：动态 slot、trait behaviors 这类新机制需要更现代的内核模型，在旧内核上只能打补丁。
3. **性能天花板**：复杂列表与频繁 `setData` 场景下，旧的更新算法存在进一步优化空间。

官方对两个框架的定位是：

> exparser 是传统组件框架，对旧代码兼容性最佳，但缺少部分新特性、性能不是最优；glass-easel 是新一代组件框架，提供更多特性与更优性能。

需要强调：**两者是“并存、可按页面选择”的关系，不是一次强制升级**。框架会长期保留 exparser 以兼容存量代码，开发者可以逐页迁移，而不是在某一天被迫全量改写。

误区提醒：

- “glass-easel 是新的渲染引擎”——错误。glass-easel 是**组件框架**（管理组件定义、实例、生命周期、更新算法），WebView 与 Skyline 才是**渲染引擎**。组件框架与渲染引擎是两个维度。
- “换了 glass-easel 就不用管 setData 成本了”——错误。逻辑层与渲染层仍然不共享内存，`setData` 依然是跨线程异步通信，数据量与频率成本依旧存在，glass-easel 只是让框架侧的更新算法更快。

### 2. glass-easel 是什么：定位、版本与覆盖率

**glass-easel** 是新版小程序组件框架的核心实现。本质上，它是一个 JavaScript 的组件化界面框架，用来进行组件化、声明式的界面开发；其内核也可以独立运行在 Web 环境（官方有开源项目），并配套代码编辑器插件、开发者工具扩展、国际化扩展等附件。

关键事实（2026 年）：

| 维度 | 事实 |
|---|---|
| 框架名称 | glass-easel |
| 与旧框架关系 | exparser 的升级版，保持高兼容性 |
| WebView 支持起点 | 基础库 3.8.12 起可自由使用 |
| 用户覆盖 | 发布时已覆盖约 98% 微信用户 |
| Skyline 关系 | Skyline 渲染引擎只能使用 glass-easel |
| 配套能力 | Chaining API、动态 slot、trait behaviors、新 WXML 编译器、更新算法优化 |

性能层面，官方给出的方向是：

- 综合使用基于虚拟树与非基于虚拟树的更新算法，以适应不同场景；
- 列表更新在部分场景可提速数倍；
- 新 WXML 编译器编译更快，WXML 生成码执行速度可提升约 20%；
- 提供高级数据更新方法、数据字段拷贝控制、组件初始化策略等高级优化手段。

本单元不要求记忆具体百分比用于考试，而要求建立工程判断：**新项目与复杂页面默认优先 glass-easel，存量页面按覆盖率与风险逐步迁移**。

### 3. 两种定义形式：Definition 与 Chaining 总览

`Component` 构造器（以及 `Behavior` 构造器、`Page` 构造器）支持两种写法。

**Definition 形式（对象字面量，传统写法）**：

```typescript
// components/shop-card/shop-card.ts
Component({
  options: {
    multipleSlots: true,
  },
  properties: {
    shopId: {
      type: String,
      value: '',
    },
  },
  data: {
    liked: false,
    likeCount: 0,
  },
  observers: {
    shopId(shopId: string) {
      // 属性变化时重新读取收藏状态
    },
  },
  lifetimes: {
    attached() {
      // 进入页面节点树
    },
  },
  methods: {
    onTapLike() {
      // 事件处理
    },
  },
})
```

**Chaining 形式（链式调用，新一代写法）**：

```typescript
// components/shop-card/shop-card.ts
export default Component()
  .options({ multipleSlots: true })
  .properties({
    shopId: {
      type: String,
      value: '',
    },
  })
  .data(() => ({
    liked: false,
    likeCount: 0,
  }))
  .init(function ({ lifetime }) {
    lifetime('attached', () => {
      // 进入页面节点树
    })
  })
  .register()
```

两种形式的关系：

1. **表达能力基本对等**：Definition 的每个定义段（data、methods、lifetimes、observers……）在 Chaining 中都有对应方法。
2. **可以混用**：一个组件用 Chaining，它引用的 behavior 可以是 Definition 的，反之亦然。
3. **Chaining 的增量价值集中在 `init` 闭包**：它给每个实例一个独立作用域，天然适合放实例私有变量，并对 TypeScript 类型推断更友好。

一个完整的链式结构以无参 `Component()` 开始，以 `.register()` 结束。**漏掉 `register()` 是新手最常见错误**——不调用它，组件定义不会被注册，页面里只会得到一个未定义的占位。

误区提醒：

- 不要把 Chaining 理解成“运行时一层层 new 出对象”。链式方法大多是在**组件定义阶段**收集配置，真正每个实例执行的逻辑写在 `init` 与生命周期里。
- Chaining 不是强制语法糖升级，Definition 形式不会被废弃，简单组件继续用 Definition 完全合理。

### 4. Chaining API 方法地图

下表把常用链式方法与 Definition 定义段对应起来，便于迁移时查阅。

| Chaining 方法 | 对应 Definition 段 | 作用 |
|---|---|---|
| `.options(obj)` | `options` | 组件选项，如多 slot、样式隔离、虚拟 Host |
| `.data(obj 或 () => obj)` | `data` | 组件内部数据，参与模板渲染 |
| `.properties(obj)` | `properties` | 外部属性定义 |
| `.behavior(b)` / `.behaviors([...])` | `behaviors` | 引用 behavior |
| `.observers(obj)` | `observers` | 数据监听器 |
| `.lifetimes(obj)` | `lifetimes` | 组件生命周期 |
| `.pageLifetimes(obj)` | `pageLifetimes` | 所在页面的生命周期 |
| `.methods(obj)` | `methods` | 组件方法 |
| `.relations(obj)` | `relations` | 组件间关系 |
| `.externalClasses([...])` | `externalClasses` | 外部样式类 |
| `.definitionFilter(fn)` | `definitionFilter` | 自定义组件扩展时的定义过滤 |
| `.init(fn)` | 无直接对应 | 每实例执行的初始化闭包 |
| `.register()` | 由构造器隐式完成 | 结束链式调用并注册定义 |

注意 `.data` 在 Chaining 中推荐传**工厂函数** `.data(() => ({ ... }))`。原因与对象类型数据字段有关：对象字面量在模块加载时只有一份，使用工厂函数可以让每个实例拿到独立的初始对象，降低多实例共享同一引用的风险。Definition 形式里框架同样会对 data 做处理，但 Chaining 下工厂函数是更清晰、更被推荐的写法。

`init` 函数会收到一组“实例接口”，官方示例中出现过的包括：

- `data`：当前实例数据（等价于生命周期里的 `this.data`）；
- `setData`：绑定到当前实例的更新方法（等价于 `this.setData`）；
- `lifetime(name, fn)`：注册组件生命周期；
- `pageLifetime(name, fn)`：注册页面生命周期；
- `method(fn)`：注册一个组件方法，返回该函数引用；
- `observer(fields, fn)`：注册数据监听器；
- `relation(def)`：定义组件间关系（应在 `init` 返回前同步调用）；
- `implement(trait, impl)`：实现一个 trait behavior（应在 `init` 返回前同步调用）。

不必死记这份清单，关键是理解：**这些接口都是“注册到当前实例”的，而不是挂在全局 this 上的魔法字段**。

### 5. init 闭包：实例私有变量的正确归宿

Definition 形式下，想存一个“不参与渲染、每个实例各自一份”的变量，常见做法是在 `lifetimes.created` 或 `attached` 里往 `this` 上挂：

```typescript
Component({
  lifetimes: {
    created() {
      // 不推荐：污染组件实例，类型上也要额外声明
      ;(this as any).timer = null
    },
  },
})
```

这种写法的问题：变量挂在实例上，与框架字段混在一起，TypeScript 需要额外扩展类型，且容易被误以为可以直接在模板里访问。

Chaining 的 `init` 给出了更干净的方案——**闭包私有变量**：

```typescript
export default Component()
  .data(() => ({
    remain: 0,
  }))
  .init(function ({ lifetime, method, setData }) {
    // 私有变量：外部无法访问，每个实例各一份，不参与 setData
    let timer: ReturnType<typeof setInterval> | null = null
    let tickCount = 0

    const start = method(function () {
      if (timer) return
      timer = setInterval(() => {
        tickCount += 1
        setData({ remain: tickCount })
      }, 1000)
    })

    lifetime('attached', start)

    lifetime('detached', () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    })
  })
  .register()
```

这里有三层必须讲清：

1. **执行次数**：模块加载时执行的是链式定义；`init` 函数体在**每个组件实例创建时执行一次**。页面里放 20 个该组件，`init` 就执行 20 次，各自产生独立的 `timer`、`tickCount`。
2. **闭包共享**：`init` 内部通过 `method`、`lifetime` 注册的函数与私有变量处于同一个闭包，因此生命周期回调与事件方法能读写这些变量，组件外部却访问不到。
3. **不经过通信**：私有变量只活在逻辑层，不放进 `data`，也就不会被序列化、跨线程传输。计时器句柄、请求取消标志、临时计算结果都适合放这里（呼应 U02：只有需要渲染的数据才进 `data`）。

误区提醒：

- 在 `init` 顶层直接执行重逻辑要谨慎——它每实例执行一次，20 个实例就跑 20 次。
- `init` 里可以同步读 `data`、注册回调，但涉及节点布局的操作要等 `ready` 之后。
- 不要在 `init` 闭包里保存只会用到一次的巨型对象而不释放，组件销毁后闭包仍被回调引用时会造成泄漏；`detached` 里要做清理。

### 6. Chaining 中的生命周期：lifetime 注册与 this

`init` 中通过 `lifetime(name, fn)` 注册组件生命周期，可注册的名称与 Definition 的 `lifetimes` 一致：`created`、`attached`、`ready`、`moved`、`detached`、`error` 等。

```typescript
export default Component()
  .data(() => ({ width: 0 }))
  .init(function ({ lifetime, setData }) {
    lifetime('created', () => {
      // 实例刚创建，不能 setData
    })

    lifetime('attached', function () {
      // 进入节点树，可以拿到 this.data、this.dataset
      console.log('attached:', this.is, this.dataset)
    })

    lifetime('ready', () => {
      // 布局完成，可以使用 createSelectorQuery
      this.createSelectorQuery()
        .select('.root')
        .boundingClientRect((rect) => {
          if (rect) setData({ width: rect.width })
        })
        .exec()
    })

    lifetime('detached', () => {
      // 离开节点树，清理资源
    })
  })
  .register()
```

关于 `this`：

- `init` 的函数体以及 `lifetime` 回调中，`this` 指向**当前组件实例**，因此 `this.setData`、`this.triggerEvent`、`this.createSelectorQuery` 都可用。
- 示例里大量使用从 `init` 参数解构出的 `setData`，它与 `this.setData` 等价，但在闭包中传递时无需额外绑定 `this`，写异步回调更省心。

页面生命周期用 `pageLifetime` 注册，对应 Definition 的 `pageLifetimes`：

```typescript
.init(function ({ pageLifetime }) {
  pageLifetime('show', () => {
    // 组件所在页面被展示（包括从下级页面返回）
  })
  pageLifetime('hide', () => {
    // 页面被隐藏
  })
  pageLifetime('resize', (size) => {
    // 页面尺寸变化
  })
})
```

这一时机在「逛吃指南」中非常关键：详情页返回列表页时，列表组件应在页面 `show` 时刷新收藏态，而不是只在 `attached` 读一次（U12 会系统讲解跨页刷新时机）。

误区提醒：

- `created` 阶段不能调用 `setData`，这与框架无关，是组件实例化时序决定的。
- 同名生命周期在组件与多个 behavior 中都会执行，顺序是“被引用者优先、组件自身最后”，不要依赖“只执行一次”。

### 7. 属性、data 与数据监听

外部属性用 `.properties` 声明，内部数据用 `.data` 声明，二者最终都会出现在实例的 `data` 上并可用于模板渲染。

```typescript
export default Component()
  .properties({
    shop: {
      type: Object,
      value: {} as Shop,
    },
    // 简化写法
    compact: {
      type: Boolean,
      value: false,
    },
  })
  .data(() => ({
    liked: false,
  }))
  .init(function ({ observer, lifetime }) {
    // Chaining 中注册数据监听器
    observer('shop.id', (shopId: string) => {
      // 属性变化：重新同步收藏态
      console.log('shop 变化：', shopId)
    })

    // 监听多个字段
    observer(['liked', 'compact'], (liked: boolean, compact: boolean) => {
      console.log('liked/compact：', liked, compact)
    })

    lifetime('attached', function () {
      // 属性在 attached 时已可用
      console.log(this.data.shop)
    })
  })
  .register()

interface Shop {
  id: string
  name: string
}
```

数据监听（observers）的语义与 Definition 形式一致：

- 支持监听子数据字段，如 `shop.id`、`list[1].liked`；
- 支持通配 `shop.**` 监听对象下所有子字段变化；
- 监听到的是变化后的值，回调中再 `setData` 要避免自触发死循环。

误区提醒：

- 属性名在 JS 中用驼峰（`shopId`），WXML 传值时用连字符（`shop-id`），数据绑定中仍可写驼峰，命名要全工程统一。
- 不要用 observer 去“拼凑响应式系统”实现所有逻辑；observer 是通知机制，复杂派生状态可结合成熟的 computed behavior，但要确认其对 Chaining/glass-easel 的支持版本。

### 8. 动态 slot：让插槽内容随列表重复

slot 有三种模式，前两种统称“静态 slot”：

| 模式 | 开启方式 | 语义 | 性能 |
|---|---|---|---|
| 单一 slot | 默认 | 只能有一个 `<slot />`，多写只第一个生效 | 最优 |
| 多 slot | `options.multipleSlots = true` | 多个具名 slot，内容只渲染一次 | 略低 |
| 动态 slot | `options.dynamicSlots = true` | slot 可在 `wx:for` 中重复，可向插槽内容传数据 | 按需使用 |

静态 slot 有一个容易踩坑的语义：即使 `<slot />` 被 `wx:if` 藏掉了，插槽内容节点仍然会被创建，`attached` 照常触发；slot 重新出现时内容不会重新创建。希望“插槽内容随 slot 一起创建销毁 / 在列表中重复”，就要用动态 slot。

定义端（一个可复用的虚拟列表外壳）：

```typescript
// components/simple-list/simple-list.ts
export default Component()
  .options({ dynamicSlots: true })
  .data(() => ({
    list: [
      { id: 'A', name: '阿婆牛杂' },
      { id: 'B', name: '宝华鲜虾面' },
      { id: 'C', name: '超记煲仔饭' },
    ],
  }))
  .register()
```

```xml
<!-- components/simple-list/simple-list.wxml -->
<view class="list">
  <block wx:for="{{ list }}" wx:key="id">
    <!-- 每次循环生成一份插槽内容拷贝，并携带 index 与 item -->
    <slot list-index="{{ index }}" item="{{ item }}" />
  </block>
</view>
```

使用端通过 `slot:` 前缀接收动态 slot 携带的数据：

```xml
<!-- 页面 WXML -->
<simple-list>
  <!-- slot:字段名 接收，短横线会映射为驼峰 -->
  <view class="row" slot:item slot:listIndex="index">
    {{ index + 1 }}. {{ item.name }}
  </view>
</simple-list>
```

接收时可以改名：`slot:listIndex="rowIndex"`，模板里就用 `rowIndex`。

要点回顾：

1. 每个 `<slot />` 拥有插槽内容节点树的一份**拷贝**，因此列表有几项，使用者提供的内容就渲染几份。
2. 数据方向是“定义端 → 使用端”：定义端在 `<slot>` 上挂字段，使用端用 `slot:` 接。
3. 动态 slot 是 glass-easel 新特性；旧框架上需要 polyfill，且 polyfill 与原生的组件不能互通，选型时要明确。

误区提醒：

- 动态 slot 不是“动态插槽名”。它解决的是 slot 重复与传参，不是运行时拼接 `name`。
- 不需要重复渲染时不要开 `dynamicSlots`，默认单一 slot 性能最好，按需升级。

### 9. trait behaviors：带类型的组件间接口契约

组件之间要调用彼此的 JS 方法，历史上有几种方式：`triggerEvent`（适合事件通知，不适合反向取数）、`selectComponent` 后直接调方法（父子强耦合、类型不明）、`export` 定义段（返回值定制）。glass-easel 推荐的新方案是 **trait behaviors**：用 TypeScript 接口声明“这里有一组能力”，用实现与引用替代硬编码的组件路径，天然解耦且类型安全。

trait behaviors 只有 glass-easel 原生支持；在 exparser 上可借助官方 chaining-api-polyfill，但两套体系互不相通。

**第一步：定义接口契约。**

```typescript
// components/list/traits.ts

// 列表项需要对外暴露的能力
export interface IListItemTrait {
  getId(): string
  getTitle(): string
}

// 包装成 trait behavior；它本身不提供实现，只是一个带类型的标记
export const listItemTrait = Behavior.trait<IListItemTrait>()
```

**第二步：提供能力的组件实现它。**

```typescript
// components/food-item/food-item.ts
import { listItemTrait } from '../list/traits'

export default Component()
  .data(() => ({
    id: '',
    title: '',
  }))
  .init(function ({ data, implement, relation }) {
    // 声明与父组件 list 的关系
    relation({
      type: 'parent',
      target: '../list/list',
      linked() {
        // 被插入列表时
      },
    })

    // implement 必须在 init 返回前同步调用
    implement(listItemTrait, {
      getId() {
        return data.id
      },
      getTitle() {
        return data.title
      },
    })
  })
  .register()
```

**第三步：消费端面向 trait 编程，而不是面向具体组件。**

```typescript
// components/list/list.ts
import { listItemTrait, IListItemTrait } from './traits'

export default Component()
  .init(function ({ relation, lifetime }) {
    relation({
      type: 'child',
      target: listItemTrait, // 用 trait 代替写死的组件路径
      linked(child) {
        const item: IListItemTrait | undefined = child.traitBehavior(listItemTrait)
        if (item) {
          console.log('新增列表项：', item.getId(), item.getTitle())
        }
      },
      unlinked(child) {
        const item = child.traitBehavior(listItemTrait)
        console.log('移除：', item?.getId())
      },
    })

    lifetime('detached', () => {
      // 清理
    })
  })
  .register()
```

这样 `<food-item>` 未来可以被任意“实现了 `listItemTrait`”的组件替换（比如广告位组件、活动卡片组件），列表组件一行不改——这就是面向接口解耦的价值。

**扩展方法**：`Behavior.trait` 还能接收转换函数，把“实现者提供的接口”转换成“调用者拿到的接口”，可以追加便捷方法或裁剪不对外暴露的字段：

```typescript
interface ICollectCore {
  isCollected(id: string): boolean
}

interface ICollectTrait extends ICollectCore {
  // 调用者额外获得的便捷方法
  labelOf(id: string): string
}

export const collectTrait = Behavior.trait<ICollectCore, ICollectTrait>((impl) => ({
  ...impl,
  labelOf(id: string) {
    return impl.isCollected(id) ? '已收藏' : '收藏'
  },
}))
```

误区提醒：

- trait behavior 不是普通 behavior：它不合并数据与生命周期，只描述 JS 接口契约，不要拿它当 mixin 用。
- `implement` 与 `relation` 都应在 `init` 返回前同步调用，不能放进生命周期或事件回调里延迟注册。
- `child.traitBehavior(t)` 可能返回 `undefined`（对方未实现），调用前必须判空。

### 10. 新 WXML 编译器（上）：let: 临时变量

glass-easel 附带了新的 WXML 编译器，其中一个实用语法是 **`let:` 临时变量**。当逻辑层数据结构较深、其中一部分在节点内被反复使用时，可以用它把这段数据“提”成一个短名。

```xml
<view class="card">
  <block let:shop="{{ detail.payload.currentShop }}">
    <view class="title">{{ shop.name }}</view>
    <view class="addr">{{ shop.address }}</view>
    <view class="score">评分 {{ shop.score }}</view>
    <image src="{{ shop.cover }}" mode="aspectFill" />
  </block>
</view>
```

语义要点：

1. `let:变量名="{{ 表达式 }}"`，作用域仅限它所在标签本身及其内部。
2. 它是**模板层**的临时变量，不产生 `setData`、不回写逻辑层数据，纯粹减少重复书写深层路径。
3. 仅 glass-easel 组件框架支持；在 exparser 下会报语法不支持。

它在 `wx:for` 中也能让模板更干净：

```xml
<block wx:for="{{ recommend.groups.food.list }}" wx:key="id" let:shop="{{ item }}">
  <view class="row">{{ shop.name }} · {{ shop.area }}</view>
</block>
```

误区提醒：

- `let:` 不是 JS 的变量声明，不能在其中做运算声明（如自增、函数调用副作用），右侧是数据绑定表达式。
- 不要为了“少写几个字”把整个 `data` 都重新 `let` 一遍，保持模板可读。
- 临时变量只在模板可用，逻辑层读不到它；需要在逻辑层复用的短路径应在 JS 里解构。

### 11. 新 WXML 编译器（下）：class: 与 style: 语法

传统写法中，动态样式类通常要在一个 `class` 字符串里拼接，静态类与条件类混在一起：

```xml
<view class="btn {{ liked ? 'btn-active' : '' }} {{ disabled ? 'btn-disabled' : '' }}">
  收藏
</view>
```

新编译器提供 **`class:` 前缀**，把“静态类”和“条件类”拆开声明，语义清晰、不易漏空格：

```xml
<view
  class="btn"
  class:btn-active="{{ liked }}"
  class:btn-disabled="{{ disabled }}"
>
  收藏
</view>
```

规则：

- `class:类名`（不带值）表示无条件添加该类；
- `class:类名="{{ 布尔表达式 }}"` 表示条件为真时添加、为假时移除；
- 可以与普通 `class` 共存，框架会合并。

对应的 **`style:` 前缀**用于条件内联样式：

```xml
<view
  style:opacity="{{ loading ? 0.6 : 1 }}"
  style:pointer-events="{{ loading ? 'none' : 'auto' }}"
/>
```

在「逛吃指南」店铺卡片里，这类语法让状态样式一目了然：

```xml
<view class="shop-card" class:compact="{{ compact }}" class:highlighted="{{ liked }}">
  <image class="cover" src="{{ shop.cover }}" mode="aspectFill" />
  <view class="name">{{ shop.name }}</view>
  <view class:badge="{{ shop.award }}" class:badge-hidden="{{ !shop.award }}">
    必吃榜
  </view>
</view>
```

误区提醒：

- `class:` 后写的是**类名本身**，不是字符串值；写成 `class:'btn-active'="{{ true }}"` 是错误的。
- 条件类的值应是布尔语义；依赖字符串拼接的复杂样式仍建议交给 WXSS 与修饰类，而不是堆内联样式。
- `class:`/`style:` 与 `let:`、`slot:` 一样仅 glass-easel 支持，混用前确认页面的组件框架。

### 12. 启用 glass-easel：componentFramework 与逐页/全局配置

在使用 WebView 渲染引擎时，每个页面可以独立选择组件框架，默认是 exparser。要改用 glass-easel，需要在**页面 JSON** 中声明：

```json
{
  "usingComponents": {},
  "componentFramework": "glass-easel",
  "glassEaselWebview": true
}
```

字段含义：

- `componentFramework: "glass-easel"`：指定本页面使用 glass-easel 组件框架；
- `glassEaselWebview: true`：在 WebView 渲染下启用 glass-easel 的配套开关；
- 页面内的自定义组件跟随其所在页面的框架选择，不需要逐个组件配置。

全局启用方式：把 `componentFramework` 放到 **app.json**，对所有页面生效：

```json
{
  "pages": ["pages/index/index", "pages/detail/detail"],
  "componentFramework": "glass-easel"
}
```

工程建议：

1. **新项目**：直接在 app.json 全局开启 glass-easel，统一语法与特性。
2. **存量项目小步迁移**：先选一个复杂但边界清晰的页面（如详情页）逐页开启，验证通过后再推广；未开启的页面继续用 exparser。
3. **Skyline 页面**：只能用 glass-easel，迁移到 Skyline 的同时自然完成框架切换。
4. **真机与低版本**：在调试基础库与真机上分别验证，结合覆盖率（约 98%）决定是否需要回退分支。

误区提醒：

- 只写 `componentFramework` 而漏掉 WebView 下需要的配套字段，可能导致页面行为异常，按官方迁移文档逐项核对。
- 组件 JSON 里写 `componentFramework` 并不能决定页面框架——框架由**页面**选择。

### 13. 兼容回退与迁移步骤

虽然 3.8.12+ 已覆盖约 98% 用户，但“覆盖 98%”不等于“剩下 2% 可以不管”，尤其在课程项目要上线真实用户时。标准迁移流程如下：

1. **盘点**：列出页面复杂度、第三方组件/behavior、是否依赖 exparser 特殊语义。
2. **单页试点**：选一个页面开启 glass-easel，跑通全部交互，重点关注 slot、样式隔离、生命周期时序、组件选择器。
3. **类型与 lint 先行**：升级 `miniprogram-api-typings` 到较新版本，确保 Chaining 写法在 `tsc` 下无类型错误。
4. **灰度推广**：按页面逐步开启，保留 exparser 页面作为对照。
5. **回退方案**：对不支持的低版本，页面配置与代码要能回退——可借助 `wx.canIUse` / 基础库版本判断，对差异特性（动态 slot、trait、let/class）提供 Definition 形式或 polyfill 的等价实现。

版本能力判断示例：

```typescript
// utils/framework.ts
export function supportGlassEasel(): boolean {
  // 以基础库语义/文档为准：上线前应通过 wx.canIUse 或版本比较确认
  return typeof wx.canIUse === 'function' && wx.canIUse('componentFramework')
}
```

> 说明：具体能力字符串与判定方式随版本演进，以上仅示意“上线前必须做能力判断”的工程思路，实际以官方兼容性文档为准。

chaining-api-polyfill 的适用边界也要记住：

- 它让 exparser 上也能使用 Chaining 与 trait behaviors；
- 但 polyfill 定义的 trait 只能在 polyfill 组件体系内使用，glass-easel 原生定义的 trait 只能在原生体系内使用，二者不可混用。

### 14. 综合示例：用 Chaining 重写「逛吃指南」店铺卡片组件

下面把一个真实复杂组件从 Definition 改写为 Chaining。组件职责：展示店铺封面与信息、维护收藏按钮、对外暴露“是否收藏”的 trait 能力、支持一个角标 slot，并在所在页面重新显示时刷新收藏态。

```json
// components/shop-card/shop-card.json
{
  "component": true,
  "usingComponents": {}
}
```

```typescript
// components/shop-card/shop-card.ts
import { collectTrait } from '../traits/collect'

interface Shop {
  id: string
  name: string
  address: string
  cover: string
  score: number
}

export default Component()
  .options({ multipleSlots: true })
  .properties({
    shop: {
      type: Object,
      value: {} as Shop,
    },
  })
  .data(() => ({
    liked: false,
    animating: false,
  }))
  .init(function ({ data, setData, lifetime, pageLifetime, method, implement }) {
    // —— 实例私有变量：请求防抖与动画标记，不进 data、不跨线程 ——
    let syncing = false
    let animTimer: ReturnType<typeof setTimeout> | null = null

    // 读取收藏态（此处用同步缓存占位，U12 会给出完整封装）
    const readLiked = method(function (): boolean {
      try {
        const ids: string[] = wx.getStorageSync('gc_fav_ids') || []
        return ids.includes(data.shop.id)
      } catch (err) {
        console.warn('读取收藏失败', err)
        return false
      }
    })

    const refresh = method(function () {
      if (syncing || !data.shop.id) return
      syncing = true
      const liked = readLiked()
      setData({ liked }, () => {
        syncing = false
      })
    })

    const onToggleLike = method(function () {
      if (data.animating) return
      let ids: string[] = []
      try {
        ids = wx.getStorageSync('gc_fav_ids') || []
      } catch (err) {
        console.warn('读取收藏失败', err)
      }

      const next = !data.liked
      const nextIds = next
        ? Array.from(new Set([...ids, data.shop.id]))
        : ids.filter((id) => id !== data.shop.id)

      try {
        wx.setStorageSync('gc_fav_ids', nextIds)
        setData({ liked: next, animating: true })
        if (animTimer) clearTimeout(animTimer)
        animTimer = setTimeout(() => setData({ animating: false }), 240)
      } catch (err) {
        console.error('写入收藏失败', err)
        wx.showToast({ title: '操作失败，请重试', icon: 'none' })
      }
    })

    // 实现收藏 trait，供父组件统一查询
    implement(collectTrait, {
      isCollected(id: string) {
        try {
          const ids: string[] = wx.getStorageSync('gc_fav_ids') || []
          return ids.includes(id)
        } catch {
          return false
        }
      },
    })

    lifetime('attached', refresh)

    // 从详情页返回时页面再次 show，刷新收藏态
    pageLifetime('show', refresh)

    lifetime('detached', () => {
      if (animTimer) {
        clearTimeout(animTimer)
        animTimer = null
      }
    })
  })
  .register()
```

```xml
<!-- components/shop-card/shop-card.wxml -->
<view class="shop-card" class:liked="{{ liked }}" class:animating="{{ animating }}">
  <image class="cover" src="{{ shop.cover }}" mode="aspectFill" />
  <view class="info">
    <view class="name">{{ shop.name }}</view>
    <view class="addr">{{ shop.address }}</view>
    <view class="score">★ {{ shop.score }}</view>
  </view>
  <view class="corner">
    <!-- 多 slot：页面可塞活动角标，不提供时为空 -->
    <slot name="corner" />
  </view>
  <button
    class="fav-btn"
    class:fav-btn-on="{{ liked }}"
    bindtap="onToggleLike"
  >
    {{ liked ? '已收藏' : '收藏' }}
  </button>
</view>
```

页面使用：

```json
// pages/index/index.json
{
  "usingComponents": {
    "shop-card": "/components/shop-card/shop-card"
  }
}
```

```xml
<!-- pages/index/index.wxml -->
<block wx:for="{{ shops }}" wx:key="id">
  <shop-card shop="{{ item }}">
    <view slot="corner" class:tag="{{ item.award }}">必吃榜</view>
  </shop-card>
</block>
```

这个综合示例覆盖了本单元几乎全部要点：`.options`/`.properties`/`.data(工厂)`/`init` 闭包私有变量、`method`/`lifetime`/`pageLifetime`、`implement` trait、多 slot，以及新编译器的 `class:` 语法；同时严格遵守“逻辑层无 DOM、setData 仍跨线程异步、密钥不放前端”的底层约束——示例里没有任何 DOM 操作，也没有出现任何密钥。

### 15. 常见误区清单

1. **把 glass-easel 当渲染引擎**：它是组件框架，渲染引擎是 WebView / Skyline。
2. **忘记 `.register()`**：链式定义不注册等于没写。
3. **在 `init` 顶层做重计算**：每实例执行一次，注意实例数量。
4. **把私有变量塞进 `data`**：计时器句柄、锁标志进 `data` 只会增加跨线程传输。
5. **以为换框架后 setData 变同步**：它依旧跨线程、依旧异步，回调才表示渲染完成。
6. **静态 slot 里假设内容随 slot 销毁**：静态 slot 内容常驻，需要联动销毁请用动态 slot。
7. **拿 trait 当 mixin**：trait 只声明 JS 接口契约，不合并数据与生命周期。
8. **`implement`/`relation` 延迟到回调里注册**：必须在 `init` 返回前同步完成。
9. **在 exparser 页面直接使用 `let:`/`class:`/`slot:`**：仅 glass-easel 支持，会直接报错或不生效。
10. **看到 98% 覆盖率就不做回退**：剩余低版本仍需能力判断与降级实现。

## 课后题

1. exparser 与 glass-easel 是什么关系？为什么官方没有直接用 glass-easel 强制替换 exparser？
2. 请从“组件框架与渲染引擎是两个维度”的角度，说明 glass-easel、WebView、Skyline 三者的关系。
3. 写出 Chaining 形式的最小骨架，并标注哪一步是“定义期”执行、哪一步是“每个实例创建时”执行。
4. 为什么 Chaining 中推荐用 `.data(() => ({ ... }))` 工厂函数，而不是直接传对象字面量？
5. `init` 闭包中的私有变量与挂在 `data` 上的字段，在“实例数量、是否跨线程、外部能否访问”三个方面有什么区别？
6. 单一 slot、多 slot、动态 slot 分别解决什么问题？为什么静态 slot 下即使 `<slot />` 被 `wx:if` 隐藏，插槽内容仍然会创建？
7. 动态 slot 中数据如何从“定义端”流向“使用端”？请写出 `<slot>` 挂字段与 `slot:` 接收的对应写法。
8. trait behaviors 相比 `selectComponent` 直接调子组件方法，在耦合度与类型安全上有什么改进？`child.traitBehavior(t)` 为什么要判空？
9. `let:`、`class:`、`style:` 分别解决什么模板问题？它们在 exparser 下能否使用？为什么？
10. 场景题：团队准备把一个使用了多 slot 和 observers 的存量页面迁移到 glass-easel，但仍有约 2% 用户基础库低于 3.8.12。请给出迁移步骤、启用配置与低版本回退方案，并指出哪些新特性必须准备降级实现。

## 实践练习题

### 练习 1：把一个 Definition 组件改写为 Chaining

#### 任务

在「逛吃指南」项目中选取一个已有 Definition 组件（如店铺卡片或标签栏），用 Chaining 形式完整重写，外部行为保持不变。

参考结构：

```text
Component()
  .options(原 options)
  .properties(原 properties)
  .data(() => (原 data))
  .init(function ({ lifetime, method, observer }) {
    // 原 lifetimes -> lifetime(...)
    // 原 methods  -> method(...)
    // 原 observers -> observer(...)
  })
  .register()
```

#### 步骤约束

1. 改写前先记录原组件的交互清单（事件、属性、slot、生命周期）。
2. 改写后 WXML/WXSS 尽量不动，便于对照行为。
3. 至少把一个“不参与渲染”的变量（如定时器、锁）移到 `init` 闭包私有变量。
4. 通过 TypeScript 编译，不允许大面积使用 any 绕过检查。

#### 提交物

- 改写前后的组件 `.ts` 文件；
- 交互对照清单；
- 真机运行截图或录屏。

#### 验收标准

- 两种实现外部行为一致；
- 链式定义以 `.register()` 结束；
- 至少一个私有变量通过闭包实现且不再污染 `data`；
- `tsc` 无类型错误。

### 练习 2：实现动态 slot 的可复用列表

#### 任务

实现一个 `simple-list` 组件，内部用 `wx:for` 渲染列表，通过动态 slot 让使用方自定义每一行的内容，并把 `item`、`index` 传给插槽内容。

参考代码：

```xml
<!-- simple-list.wxml -->
<block wx:for="{{ list }}" wx:key="id">
  <slot list-index="{{ index }}" item="{{ item }}" />
</block>
```

```typescript
// simple-list.ts
export default Component()
  .options({ dynamicSlots: true })
  .properties({
    list: { type: Array, value: () => [] },
  })
  .register()
```

使用端：

```xml
<simple-list list="{{ shops }}">
  <view class="row" slot:item slot:listIndex="rowIndex">
    {{ rowIndex + 1 }} - {{ item.name }}
  </view>
</simple-list>
```

#### 步骤约束

1. 页面必须在 glass-easel 下运行，先确认 `componentFramework` 配置。
2. 分别尝试默认接收名与改名接收（`slot:listIndex="rowIndex"`）。
3. 把列表顺序打乱或增删一项，确认每行内容正确重复渲染。
4. 思考并记录：该场景为什么不适合用静态 slot。

#### 提交物

- `simple-list` 四个文件；
- 使用端页面代码；
- 列表渲染截图；
- 100 字以内的“动态 slot 适用场景”结论。

#### 验收标准

- 插槽内容随列表项正确重复；
- `item`、`index` 能在使用端正确读取，改名生效；
- 能解释动态 slot 与静态 slot 的差异；
- 未开启 glass-easel 时有明确的报错认知与处理。

### 练习 3：用 trait behaviors 解耦父子组件

#### 任务

定义一个“可收藏条目” trait，让至少两种不同组件（如店铺卡片、美食条目）实现它；父级列表组件只面向 trait 收集条目 id，不引用任何具体组件路径。

参考代码：

```typescript
// traits.ts
export interface ICollectable {
  getId(): string
}
export const collectable = Behavior.trait<ICollectable>()
```

```typescript
// 子组件
.init(function ({ implement, data }) {
  implement(collectable, {
    getId() {
      return data.id
    },
  })
})
```

```typescript
// 父组件 relation
relation({
  type: 'child',
  target: collectable,
  linked(child) {
    const node = child.traitBehavior(collectable)
    if (node) console.log(node.getId())
  },
})
```

#### 步骤约束

1. trait 接口先写 TypeScript 声明，再用 `Behavior.trait<T>()` 包装。
2. 两种子组件分别 `implement`，父组件 `relation` 的 `target` 必须是 trait 而非路径。
3. 所有 `implement`/`relation` 在 `init` 返回前同步完成。
4. 增加一个只实现部分逻辑的“第三组件”，验证未实现方返回 `undefined` 的判空处理。

#### 提交物

- trait 定义、两种子组件、父组件代码；
- 父组件收集到的 id 列表日志；
- 判空处理的代码片段。

#### 验收标准

- 父组件不出现任何具体子组件路径；
- 两种异构子组件都能被统一收集 id；
- `traitBehavior` 结果均做了判空；
- 类型在 `tsc` 下完整通过。

## 阶段验收作业

本作业是阶段二组件化升级的关键证据点，重点证明**你能在真实工程中驾驭 glass-easel 的新一代写法，并且清楚它的能力边界与兼容代价**。

### 任务描述

在「逛吃指南」项目中完成一次“组件框架升级 + 复杂组件重写”：

1. 选定一个页面（建议首页店铺列表或详情页）启用 glass-easel，正确配置页面 JSON；如需全局启用，在 app.json 中说明影响范围。
2. 用 Chaining 形式重写其中的复杂组件（店铺卡片），要求包含：外部属性、工厂 data、`init` 闭包内至少两个实例私有变量、组件生命周期与页面生命周期各至少一个、一个数据监听。
3. 组件内使用至少一种 glass-easel 专属语法：动态 slot 或 trait behaviors 任选其一（鼓励都用），模板中使用 `let:` 与 `class:` 语法。
4. 编写一份不超过 300 字的迁移说明：启用配置、新特性清单、低版本回退方案。

### 完成标准

- 页面在 glass-easel 下真机运行正常，交互与旧实现一致；
- Chaining 组件以 `.register()` 结束，类型检查通过，无靠 any 堆砌的类型；
- 实例私有变量通过闭包实现，不把句柄/锁放进 `data`；
- 至少一种专属特性（动态 slot / trait）真实生效，而非仅写在代码里未使用；
- 迁移说明包含可执行的低版本回退思路；
- 全程无 DOM 操作、无密钥、无 `setData` 之后立刻读界面状态的假设。

### 评分要点（100 分）

| 维度 | 分值 | 要点 |
|---|---:|---|
| 框架理解 | 20 | exparser/glass-easel、组件框架/渲染引擎关系讲得清 |
| Chaining 重写 | 25 | 链式结构完整，生命周期/方法/监听注册正确 |
| init 闭包 | 15 | 私有变量合理，每实例一份，资源在 detached 清理 |
| 专属特性落地 | 20 | 动态 slot / trait 真实使用且正确，let/class 用上 |
| 兼容与配置 | 10 | componentFramework 配置正确，回退方案可行 |
| 代码与文档 | 10 | TS 类型完整、命名清晰、300 字说明准确 |

### 强制不通过条件

- 组件定义缺少 `.register()`，或页面并未真正运行在 glass-easel 下却声称完成迁移；
- 无法解释 `init` 闭包“每实例执行一次”或把私有变量继续塞进 `data`；
- 出现 DOM 操作、`eval`，或代码/文档中包含密钥等机密；
- 动态 slot / trait 代码写了但从未被实际使用，属于“表演式实现”；
- TypeScript 编译不通过，或用大面积 any/断言掩盖类型错误；
- 对低版本没有任何能力判断与回退方案。

完成本作业后，进入 U12「本地存储与全局状态」，为「逛吃指南」的收藏、浏览历史、发布草稿实现本地持久化与跨页面同步，把组件内的本地读写升级为统一的数据层。
