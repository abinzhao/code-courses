# 05-WXML模板语法

## 目标

完成本知识单元后，学员应能把页面数据**声明式地**渲染成界面，熟练掌握 WXML 的数据绑定、条件渲染、列表渲染与模板复用，并理解这些语法在双线程模型下是如何被执行的，而不是把 WXML 当成 HTML 来写。

学员应能够：

1. 说出 WXML 与 HTML 的本质差异：WXML 只描述组件树与数据绑定，不存在 DOM，逻辑层也没有 `window`、`document`。
2. 使用 Mustache 双大括号 `{{ }}` 完成文本内容、组件属性、布尔属性、`class`/`style` 的动态绑定。
3. 在 `{{ }}` 中安全使用三元运算、算术、字符串拼接、比较、逻辑组合、数组/对象字面量与数据路径访问，并明确**不能在其中调用 Page 方法**。
4. 准确区分 `wx:if` 与 `hidden` 的渲染机制（惰性创建/销毁 vs 始终渲染仅切换显隐），并根据切换频率正确选型。
5. 使用 `wx:for` 遍历数组，用 `wx:for-item`、`wx:for-index` 自定义变量名，并解释 `wx:key` 在列表 diff 复用时的意义与取值规则。
6. 使用 `<block>` 对多个节点进行逻辑包装，理解它不产生真实节点，只承载 `wx:if`/`wx:for`。
7. 使用 `<template>` 定义可复用片段，通过 `is` 动态选择模板、通过 `data` 传参，并掌握展开运算符传参写法。
8. 区分 `import` 与 `include` 的引入语义与作用域限制，能正确组织多文件模板结构。
9. 说清**单向数据流**：数据从逻辑层经 `setData` 跨线程异步流向渲染层，用户交互经事件回到逻辑层，模板不能反向修改父数据。
10. 在尚未学习自定义组件之前，使用 template + 数据归一化实现「逛吃指南」探店笔记卡片、列表与详情的结构复用，并识别列表渲染反模式。

本单元承接 U02 双线程模型与 U04 生命周期；U06 将解决“模板里如何做格式化计算”的问题（WXS）；自定义组件在 U07/U08 系统学习。

## 技术栈

本单元不引入后端依赖，继续使用 TypeScript 原生小程序与静态 mock 数据。

| 工具或 API | 用途 | 学习要求 |
|---|---|---|
| WXML 文件 | 描述页面结构与数据绑定 | 能独立编写含绑定/条件/列表的页面 |
| Mustache `{{ }}` | 数据绑定与简单运算 | 掌握支持的运算类型与限制 |
| `wx:if` / `wx:elif` / `wx:else` | 条件渲染（惰性） | 理解创建/销毁成本 |
| `hidden` | 条件隐藏（常驻） | 理解与 wx:if 的选型差异 |
| `wx:for` | 列表渲染 | 会遍历数组与对象 |
| `wx:for-item` / `wx:for-index` | 自定义循环变量 | 解决嵌套循环重名问题 |
| `wx:key` | 列表项稳定身份 | 会用唯一字段与 `*this`，理解 index 坑 |
| `<block>` | 无节点逻辑包装 | 用于多节点条件/循环 |
| `<template name/is/data>` | 模板定义与实例化 | 会复用与动态切换 |
| `<import src>` | 引入模板定义 | 理解作用域不穿透 |
| `<include src>` | 复制引入文件内容 | 理解与 import 的区别 |
| `Page({ data, setData })` | 逻辑层数据与更新 | 理解跨线程异步更新 |
| `bind:tap` / `data-*` | 事件与自定义数据 | 能从模板把交互送回逻辑层 |
| 开发者工具 WXML 面板 / AppData 面板 | 查看节点树与数据 | 用工具验证渲染结果与数据变化 |

实验约定：

- 所有渲染结论先在 AppData 面板改数据观察，再写代码，不靠“想当然”。
- mock 数据集中放在页面 `data` 或独立 `mock.ts`，字段命名与后续云数据库集合保持一致（笔记 id、封面、店名、人均、发布时间等）。
- 模板中只出现真实组件（`view`、`text`、`image`、`button` 等），禁止写 `div`、`span`、`p` 等 HTML 标签。

## 详细的理论知识讲解和示例伪代码

### 1. WXML 是什么：双线程下的视图描述语言

WXML（WeiXin Markup Language）是小程序框架设计的一套标签语言，用来描述页面的**组件树结构**，它承担三件事：

1. 声明页面由哪些**组件**构成（`view`、`text`、`image`、`scroll-view` 等）；
2. 声明组件的**属性**与事件绑定；
3. 声明数据与结构之间的**绑定关系**（`{{ }}`、`wx:if`、`wx:for`）。

它与 HTML 的关键区别：

| 对比项 | HTML | WXML |
|---|---|---|
| 运行结果 | 浏览器 DOM 树，可用 `document` 查询 | 组件树，由框架编译后在渲染层呈现 |
| 标签 | `div`/`span` 等标准元素 | `view`/`text` 等小程序组件 |
| 事件 | DOM 事件体系 | 组件事件模型（`bindtap`、`catchtap` 等） |
| 数据 | 需手动操作 DOM 同步 | 声明式绑定，`setData` 驱动 |
| 脚本环境 | JS 可直接访问 DOM | 逻辑层**没有** `window`/`document` |

结合 U02 的双线程模型：WXML 与数据一起在**渲染层**（WebView，进阶可选 Skyline）生成界面；`Page` 的 JS/TS 运行在**逻辑层**。两层之间通过 Native 桥通信。因此“数据变了界面怎么变”由框架接管，开发者只负责声明绑定关系，这就是**声明式渲染**。

一个最小页面：

```xml
<!-- pages/notes/notes.wxml -->
<view class="page">
  <text class="title">{{ city }} · 探店笔记</text>
</view>
```

```typescript
// pages/notes/notes.ts
Page({
  data: {
    city: '上海'
  }
})
```

渲染层最终呈现文本“上海 · 探店笔记”。框架做的事情是：编译模板 → 读取逻辑层 `data.city` → 生成组件树。

### 2. Mustache 数据绑定：内容、属性与布尔值

双大括号 `{{ }}` 的本质是一个**数据占位符**，框架在渲染时用当前数据替换它。

#### 2.1 文本内容绑定

```xml
<view class="shop-card">
  <text class="shop-name">{{ note.shopName }}</text>
  <text class="shop-meta">{{ note.district }} · 人均 {{ note.avgPrice }} 元</text>
</view>
```

#### 2.2 组件属性绑定

属性值写成字符串时是**字面量**；要让它随数据变化，必须包 `{{ }}`：

```xml
<image
  class="cover"
  src="{{ note.coverUrl }}"
  mode="aspectFill"
/>
```

`src="{{ note.coverUrl }}"` 是动态绑定；`mode="aspectFill"` 是固定字面量。

#### 2.3 布尔属性的经典坑

很多组件的布尔属性（`checked`、`disabled`、`hidden`、`loading`）在不写大括号时拿到的是**字符串**，而字符串 `"false"` 在布尔判断里为真：

```xml
<!-- 错误：disabled 收到字符串 "false"，组件仍然被禁用 -->
<button disabled="false">领取优惠券</button>

<!-- 正确：布尔绑定 -->
<button disabled="{{ !canReceive }}">领取优惠券</button>
```

#### 2.4 动态 class 与 style

```xml
<view class="tag {{ note.isHot ? 'tag--hot' : '' }}">
  {{ note.category }}
</view>

<view
  class="card {{ note.liked ? 'card--liked' : '' }}"
  style="padding: {{ cardPadding }}px;"
>
  ...
</view>
```

配合 WXSS：

```css
.tag--hot {
  color: #ff4d2d;
  border-color: #ff4d2d;
}
```

#### 2.5 可运行的完整示例

```typescript
// pages/notes/notes.ts
Page({
  data: {
    cardPadding: 12,
    note: {
      id: 101,
      shopName: '巷子里的小面馆',
      district: '静安区',
      category: '面食',
      avgPrice: 38,
      coverUrl: '/images/shop-noodle.png',
      isHot: true,
      liked: false
    },
    canReceive: false
  }
})
```

**常见误区**：

- 忘记加 `{{ }}`，把属性写成 `src="note.coverUrl"`，结果把字符串 `note.coverUrl` 当成地址。
- 给布尔属性写裸字符串，导致逻辑与预期相反。
- 在逻辑层尝试 `document.querySelector('.cover')`——逻辑层没有 DOM，需要节点信息时应使用 `wx.createSelectorQuery()`（后续单元讲解）。

### 3. Mustache 中的运算

`{{ }}` 内可以写**简单表达式**，框架在渲染时求值。支持以下类别。

#### 3.1 三元运算

```xml
<text class="price">
  {{ note.avgPrice >= 100 ? '¥' + note.avgPrice + '（偏贵）' : '¥' + note.avgPrice }}
</text>
```

#### 3.2 算术运算

```xml
<text>双人预计 {{ note.avgPrice * 2 }} 元</text>
<text>券后 {{ note.avgPrice - 10 }} 元</text>
```

#### 3.3 字符串拼接与比较

```xml
<text>{{ note.shopName + '（' + note.district + '）' }}</text>
<text wx:if="{{ note.likes > 1000 }}">人气爆款</text>
```

#### 3.4 逻辑组合

```xml
<button
  class="receive-btn"
  disabled="{{ note.couponReceived || note.couponSoldOut }}"
>
  {{ note.couponSoldOut ? '已抢光' : (note.couponReceived ? '已领取' : '领取优惠券') }}
</button>
```

#### 3.5 数组与对象字面量

```xml
<!-- 在属性中直接写字面量数组/对象 -->
<view wx:for="{{ ['全部', '美食', '咖啡', '展览'] }}" wx:key="*this">
  <text>{{ item }}</text>
</view>

<!-- 对象字面量配合需要 object 参数的组件属性 -->
<view data-track="{{ { id: note.id, from: 'card'} }}">埋点节点</view>
```

#### 3.6 数据路径与数组下标

```xml
<text>{{ note.tags[0] }}</text>
<text>{{ shopInfo.address.city }}</text>
<text>{{ ['周一', '周二', '周三'][note.openDay] }}</text>
```

#### 3.7 不能做什么

Mustache 里**不能调用 Page 上定义的函数**，例如下面这种写法不会执行：

```xml
<!-- 错误：模板无法调用 Page 方法 -->
<text>{{ formatPrice(note.avgPrice) }}</text>
```

需要在渲染期调用函数时，有两条正道：

1. 在逻辑层提前计算好，放进 `data`（如 `avgPriceText`）；
2. 使用 WXS（U06 详解），例如 `{{ fmt.price(note.avgPrice) }}`。

**常见误区**：在模板里塞复杂业务逻辑，导致 WXML 难读、难测试。经验法则：模板表达式应当“一眼能看懂”，超过一个三元分支的逻辑都应下沉到逻辑层或 WXS。

### 4. 数据更新的底层：setData 跨线程异步

模板里的数据全部来自 `Page` 的 `data`，而改变它的唯一正规入口是 `this.setData`。

```typescript
Page({
  data: {
    note: { id: 101, liked: false, likes: 128 }
  },
  onToggleLike() {
    const liked = !this.data.note.liked
    this.setData({
      'note.liked': liked,
      'note.likes': this.data.note.likes + (liked ? 1 : -1)
    })
  }
})
```

要点（与 U02 呼应）：

- `setData` 引起的视图更新是**跨线程异步**的：数据从逻辑层序列化后经 Native 桥发到渲染层，再由渲染层更新组件树。不要在调用后立刻假设界面已经变化，需要在更新完成后执行逻辑时用回调：

```typescript
this.setData({ loading: false }, () => {
  // 视图已完成更新后的回调
  console.log('渲染层已更新')
})
```

- 直接写 `this.data.note.liked = true` **不会触发渲染**，只会改逻辑层对象，造成数据与界面不一致。
- 支持**数据路径**局部更新，避免整对象替换：`this.setData({ 'note.likes': 129 })`、`this.setData({ ['notes[' + i + '].liked']: true })`。
- 数据经通信通道传输，因此要控制 `setData` 的数据量：只传变化的字段，不要把超大列表整体重传。

### 5. 条件渲染：wx:if / wx:elif / wx:else

`wx:if` 是**真正的条件渲染**：条件为假时，框架根本不会创建对应节点；条件从假变真时才创建，从真变假时销毁。

```xml
<view wx:if="{{ note.couponStatus === 'available' }}" class="coupon coupon--ok">
  <text>立减 10 元，可领取</text>
</view>
<view wx:elif="{{ note.couponStatus === 'received' }}" class="coupon coupon--done">
  <text>已领取，到店出示</text>
</view>
<view wx:else class="coupon coupon--none">
  <text>暂无优惠券</text>
</view>
```

配套数据：

```typescript
Page({
  data: {
    note: { couponStatus: 'available' } // available | received | empty
  }
})
```

`wx:if` 还可以作用在多个节点上，这时用 `<block>` 包裹（见第 10 节）：

```xml
<block wx:if="{{ note.detail }}">
  <view class="section-title">门店信息</view>
  <view class="shop-addr">{{ note.detail.address }}</view>
  <view class="shop-hours">{{ note.detail.openHours }}</view>
</block>
```

在自定义组件（后续单元）场景下，`wx:if` 的销毁会触发组件的 detached，重建会重新 attached 并执行自身生命周期——这是它与 `hidden` 最容易被忽视的成本差异。

### 6. wx:if 与 hidden 的区别与选用

所有组件都有一个公共属性 `hidden`，它控制组件是否隐藏，但组件**始终会被渲染**，只是不可见。

```xml
<view hidden="{{ !showTip }}" class="tip">新人可领一张 5 元券</view>
```

两者机制对比：

| 对比项 | `wx:if` | `hidden` |
|---|---|---|
| 初始为假时 | 不渲染，惰性 | 仍然渲染，仅隐藏 |
| 切换时 | 销毁/重建节点与组件 | 仅切换显隐状态 |
| 切换成本 | 高（含生命周期） | 低 |
| 初始渲染成本 | 低 | 略高 |
| 适用场景 | 很少切换、依赖重建逻辑 | 频繁切换 |

选型示例：

```xml
<!-- 频繁切换的筛选项面板：用 hidden，避免反复销毁重建 -->
<view class="filter-panel" hidden="{{ !filterOpen }}">
  <!-- 一堆筛选项 -->
</view>

<!-- 只有管理员才能看到的入口、且极少出现：用 wx:if -->
<button wx:if="{{ isAdmin }}" class="admin-entry">数据看板</button>

<!-- 互斥的大块内容（详情/评价/活动）：可用 wx:if，切换即重建上下文 -->
<note-detail wx:if="{{ tab === 'detail' }}" />
<note-comments wx:elif="{{ tab === 'comments' }}" />
```

**常见误区**：

- 用 `wx:if` 包高频切换面板，导致每次切换都重建组件树、内部状态（如滚动位置、输入内容）丢失。
- 用 `hidden` 包“有权限才允许出现”的敏感内容——节点和数据早已下发到渲染层，隐藏不等于安全；真正的权限数据应在后端控制，前端只做交互呈现。
- 同时写 `wx:if` 和 `hidden` 期望叠加效果，语义混乱，应按场景二选一。

### 7. 列表渲染：wx:for

`wx:for` 绑定一个数组，用数组各项重复渲染当前节点。默认当前项变量名为 `item`，当前下标变量名为 `index`。

```xml
<view class="note-list">
  <view
    class="note-card"
    wx:for="{{ notes }}"
    wx:key="id"
    data-id="{{ item.id }}"
    bindtap="onOpenDetail"
  >
    <image class="note-cover" src="{{ item.coverUrl }}" mode="aspectFill" />
    <view class="note-body">
      <text class="note-title">{{ item.title }}</text>
      <text class="note-shop">{{ item.shopName }} · {{ item.district }}</text>
      <view class="note-tags">
        <text class="tag" wx:for="{{ item.tags }}" wx:for-item="tag" wx:key="*this">
          {{ tag }}
        </text>
      </view>
      <text class="note-meta">点赞 {{ item.likes }} · {{ item.publishedAtText }}</text>
    </view>
  </view>
</view>
```

对应数据：

```typescript
interface NoteCard {
  id: number
  title: string
  shopName: string
  district: string
  coverUrl: string
  tags: string[]
  likes: number
  publishedAtText: string
}

Page({
  data: {
    notes: [
      {
        id: 101,
        title: '藏在弄堂里的本帮小馆',
        shopName: '巷子里的小面馆',
        district: '静安区',
        coverUrl: '/images/note-101.png',
        tags: ['本帮菜', '弄堂', '一人食'],
        likes: 326,
        publishedAtText: '2 小时前'
      },
      {
        id: 102,
        title: '周末咖啡地图 · 第三站',
        shopName: '山与咖啡',
        district: '徐汇区',
        coverUrl: '/images/note-102.png',
        tags: ['咖啡', '手冲', '可办公'],
        likes: 1024,
        publishedAtText: '昨天'
      }
    ] as NoteCard[]
  },
  onOpenDetail(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/note-detail/note-detail?id=${id}` })
  }
})
```

#### 7.1 wx:for-item 与 wx:for-index

嵌套循环时内外层变量会重名，用这两个属性改名：

```xml
<view wx:for="{{ groupedNotes }}" wx:for-item="group" wx:for-index="groupIndex" wx:key="groupIndex">
  <view class="group-title">{{ group.district }}（{{ groupIndex + 1 }}）</view>
  <view
    class="mini-card"
    wx:for="{{ group.items }}"
    wx:for-item="note"
    wx:for-index="noteIndex"
    wx:key="id"
  >
    <text>{{ noteIndex + 1 }}. {{ note.title }}</text>
  </view>
</view>
```

#### 7.2 遍历对象与字符串

`wx:for` 也可以遍历对象（`item` 为值、`index` 为键）和字符串（逐字符），但业务中最常见、也是官方最推荐的仍然是数组：

```xml
<view wx:for="{{ note.scoreMap }}" wx:for-item="score" wx:for-index="dimension" wx:key="dimension">
  <text>{{ dimension }}：{{ score }} 分</view>
</view>
```

**常见误区**：把 `index` 当业务 id 使用（它只是当前位置）；嵌套循环不改变量名导致内层取错数据。

### 8. wx:key 的意义：稳定身份与高效复用

`wx:key` 告诉框架：每个循环项的**稳定且唯一**的标识是什么。框架在数据变化（插入、删除、重排、刷新）时用它做匹配，尽量复用已有节点，只移动/更新必要部分。

没有 `wx:key` 时，框架只能按位置（index）匹配。考虑“在列表头部插入一条新笔记”：

```text
旧数据顺序:        新数据顺序（头部插入）:
0  笔记A           0  笔记NEW
1  笔记B           1  笔记A
2  笔记C           2  笔记B
                    3  笔记C
```

- 用 index 当身份：框架认为 0 号位的 A 变成了 NEW，1 号位的 B 变成了 A……几乎每个节点都要更新内容，节点内部状态（输入框焦点、选中态）也会错位。
- 用稳定 id 当身份：框架认出 A/B/C 只是位置下移，只需插入一个新节点并移动其余节点，卡片内部状态得以保留。

#### 8.1 wx:key 的两种合法取值

1. **字符串**：数组项中某个**唯一属性**的属性名（属性值本身必须稳定唯一，不能是布尔或数字字段名的误用）：

```xml
<view wx:for="{{ notes }}" wx:key="id">{{ item.title }}</view>
```

注意这里写的是 `wx:key="id"`，不是 `wx:key="{{ item.id }}"`——它要的是“字段名”，框架自己去取值。

2. **保留关键字 `*this`**：当数组项本身就是字符串或数字，且整体唯一时：

```xml
<text class="tag" wx:for="{{ item.tags }}" wx:key="*this">{{ item }}</text>
```

#### 8.2 什么时候 index 也“能跑”

列表满足“纯展示、从头到尾不会插入/删除/重排、项内无内部状态”时，用 index 不会立刻出错。但这属于脆弱约定，工程上统一要求写 `wx:key`，让列表在将来可编辑、可排序时不返工。

**常见误区**：

- `wx:key` 重复（如多条笔记临时 id 都为 0），框架告警并退化为按位置匹配。
- 对对象数组写 `*this`，对象引用每次刷新都变，等于没有稳定身份。
- 忘记写 `wx:key` 又忽视控制台警告。

### 9. block：不产生节点的逻辑包装

`<block>` 不是组件，它**不会在组件树中产生任何节点**，只用于承载 `wx:if`、`wx:for` 这类控制属性，把多个兄弟节点作为一个整体处理。

```xml
<!-- 同时控制两个节点的显隐，又不想要多余的包裹 view -->
<block wx:if="{{ note.hasActivity }}">
  <view class="divider"></view>
  <view class="activity-banner">
    <text>{{ note.activity.title }}</text>
    <text class="activity-time">{{ note.activity.timeText }}</text>
  </view>
</block>
```

配合 `wx:for` 生成“每一项包含多个节点”的结构：

```xml
<block wx:for="{{ notes }}" wx:key="id">
  <view class="card" data-id="{{ item.id }}" bindtap="onOpenDetail">
    <text class="card-title">{{ item.title }}</text>
  </view>
  <view class="card-gap"></view>
</block>
```

在开发者工具的 WXML 面板可以验证：`block` 本身不出现在节点结构中，只有它内部的真实节点。

**常见误区**：给 `block` 加 `class`、`style`、`bindtap`——它不产生节点，这些属性没有承载对象；需要样式或事件时应包一层真实 `view`。

### 10. template：定义、is 与 data 传参

`<template>` 用于定义一段**可复用的代码片段**，它有“定义”和“使用”两个角色。

#### 10.1 定义模板

```xml
<!-- components/templates/note-card.wxml -->
<template name="noteCard">
  <view class="note-card">
    <image class="note-card__cover" src="{{ coverUrl }}" mode="aspectFill" />
    <view class="note-card__body">
      <text class="note-card__title">{{ title }}</text>
      <text class="note-card__shop">{{ shopName }} · {{ district }}</text>
      <text class="note-card__meta">点赞 {{ likes }} · {{ publishedAtText }}</text>
    </view>
  </view>
</template>
```

模板内部只能访问 `data` 传入的变量，**没有页面数据作用域**，这与“复制粘贴一段 WXML”的 include 完全不同。

#### 10.2 使用模板与 data 传参

```xml
<template
  is="noteCard"
  data="{{ coverUrl: item.coverUrl, title: item.title, shopName: item.shopName, district: item.district, likes: item.likes, publishedAtText: item.publishedAtText }}"
/>
```

当传入字段与对象字段同名时，使用**展开运算符**最简洁：

```xml
<view wx:for="{{ notes }}" wx:key="id" data-id="{{ item.id }}" bindtap="onOpenDetail">
  <template is="noteCard" data="{{ ...item }}" />
</view>
```

还可以额外补充字段：

```xml
<template is="noteCard" data="{{ ...item, layout: 'compact' }}" />
```

#### 10.3 is 动态切换模板

`is` 支持 Mustache，可以根据数据渲染不同模板，实现“同一位置、多种卡片样式”：

```xml
<block wx:for="{{ feeds }}" wx:key="id">
  <template is="{{ item.feedType === 'video' ? 'videoCard' : 'noteCard' }}" data="{{ ...item }}" />
</block>
```

#### 10.4 模板的能力边界

template 只是**结构片段**，它没有自己的 JS、没有样式隔离、没有事件处理函数的归属——事件仍然绑定在使用它的页面上。需要“结构 + 逻辑 + 样式”三位一体复用时，应使用自定义组件（U07/U08）。template 的定位是“组件化之前的轻量复用”。

### 11. import 与 include

#### 11.1 import：引入模板定义

```xml
<!-- pages/notes/notes.wxml -->
<import src="../../components/templates/note-card.wxml" />

<view class="note-list">
  <block wx:for="{{ notes }}" wx:key="id">
    <template is="noteCard" data="{{ ...item }}" />
  </block>
</view>
```

import 的语义是“拿到目标文件里**定义的 template**，以便用 `is` 实例化”。它有两条重要规则：

1. **只导入 template 定义**，不会把目标文件里的普通节点搬过来；
2. **作用域不穿透**：若 A import B，B 又 import C，那么 A 只能使用 B 中定义的模板，不能使用 C 中的模板。需要 C 的模板必须在 A 中显式再 import 一次。

#### 11.2 include：整文件复制

include 把目标文件的内容**原样复制**到当前位置（`<template>` 与 `<wxs>` 标签除外），适合抽取固定的结构片段，例如页面头部、底部说明：

```xml
<!-- /partials/list-header.wxml -->
<view class="list-header">
  <text class="list-header__title">本周热门探店</text>
  <text class="list-header__sub">编辑精选 · 每周五更新</text>
</view>
```

```xml
<!-- pages/notes/notes.wxml -->
<include src="../../partials/list-header.wxml" />

<view class="note-list">
  <!-- 列表内容 -->
</view>
```

#### 11.3 对比与选择

| 对比项 | import | include |
|---|---|---|
| 行为 | 引入 template 定义 | 复制文件全部内容 |
| 数据作用域 | 模板只认 data 传入 | 复制进来的代码直接用页面数据 |
| 作用域穿透 | 不穿透嵌套 import | 就是文本层面的复制 |
| 典型场景 | 复用可传参卡片 | 复用固定头尾、说明区块 |

**常见误区**：用 include 引入 template 文件却发现模板“没出现”（template 标签不被 include 复制）；或指望 import 连模板里用到的数据一起导入。

### 12. 单向数据流：数据向下、事件向上

小程序模板遵循**单向数据流**：

```text
逻辑层 data
   │  setData（跨线程、异步）
   ▼
渲染层 WXML 组件树
   │  用户操作触发事件（bindtap / bindinput ...）
   ▼
逻辑层事件处理函数 → 再次 setData → 界面更新（闭环）
```

这意味着：

1. 界面永远是 `data` 的“投影”，想改界面，先改数据；
2. 模板表达式、template 都**不能反向修改**页面或父级数据——你无法在 WXML 里写“点击就把父变量 +1”，必须绑定事件、在逻辑层处理；
3. 表单输入没有“双向绑定魔法”，要受控就得手动接回：

```xml
<input
  class="search-input"
  value="{{ keyword }}"
  placeholder="搜索门店、菜品"
  bindinput="onKeywordInput"
  bindconfirm="onSearch"
/>
```

```typescript
Page({
  data: { keyword: '' },
  onKeywordInput(e: WechatMiniprogram.Input) {
    // 用户输入 → 事件 → setData，数据重新流回输入框
    this.setData({ keyword: e.detail.value })
  },
  onSearch() {
    this.fetchNotes(this.data.keyword)
  },
  fetchNotes(keyword: string) {
    /* 按关键词请求，后续单元接入云开发 */
  }
})
```

template 里对传入数据做的任何“改动想法”也不会回传给页面——它拿到的只是渲染所需的值。后续学习自定义组件时，“properties 向下、triggerEvent 向上”是同一思想在组件边界上的延伸。

**安全提醒**：单向数据流是界面机制，不是安全边界。任何下发到前端的数据用户都能通过工具看到，因此**密钥、token、其他用户隐私绝不能放进前端代码或数据包**；前端只拿“当前用户被允许看到的内容”。

### 13. 组件化之前的模板复用策略

在还没学自定义组件时，一套可落地的复用组合是：**template 管结构、数据归一化管差异、WXSS 管皮肤**。

#### 13.1 在逻辑层做数据归一化

后端或云数据库返回的原始字段，在渲染前统一“整形成模板需要的形状”，让模板保持简单：

```typescript
// utils/normalize.ts
interface RawNote {
  _id: string
  name: string
  shop: { name: string; city: string; area: string }
  price: number
  like_count: number
  cover: string
}

interface NoteCard {
  id: string
  title: string
  shopName: string
  district: string
  avgPrice: number
  likes: number
  coverUrl: string
}

export function toNoteCard(raw: RawNote): NoteCard {
  return {
    id: raw._id,
    title: raw.name,
    shopName: raw.shop.name,
    district: raw.shop.area,
    avgPrice: raw.price,
    likes: raw.like_count,
    coverUrl: raw.cover
  }
}
```

```typescript
// pages/notes/notes.ts
import { toNoteCard } from '../../utils/normalize'

Page({
  data: { notes: [] as NoteCard[] },
  onLoad() {
    const rawList: RawNote[] = require('../../mock/notes')
    this.setData({ notes: rawList.map(toNoteCard) })
  }
})
```

#### 13.2 结构复用与皮肤变体

同一个 `noteCard` 模板，通过额外字段切换样式类：

```xml
<template name="noteCard">
  <view class="note-card note-card--{{ layout || 'full' }}">
    <image class="note-card__cover" src="{{ coverUrl }}" mode="aspectFill" />
    <view class="note-card__body">
      <text class="note-card__title">{{ title }}</text>
      <text wx:if="{{ layout !== 'compact' }}" class="note-card__shop">{{ shopName }} · {{ district }}</text>
    </view>
  </view>
</template>
```

```css
.note-card--compact .note-card__cover {
  width: 120rpx;
  height: 120rpx;
}
```

#### 13.3 何时该升级为自定义组件

出现以下信号时，说明 template 已不够用，应升级组件：片段需要自己维护内部状态、需要自己的事件逻辑与数据请求、需要在多处用不同逻辑实例化、需要样式隔离防止互相污染。

### 14. 「逛吃指南」列表与详情综合示例

#### 14.1 列表页：卡片复用 + 跳转

```xml
<!-- pages/notes/notes.wxml -->
<import src="../../templates/note-card.wxml" />
<include src="../../partials/list-header.wxml" />

<view class="tabs">
  <view
    class="tabs__item {{ activeTab === index ? 'tabs__item--active' : '' }}"
    wx:for="{{ tabs }}"
    wx:key="*this"
    data-index="{{ index }}"
    bindtap="onSwitchTab"
  >
    <text>{{ item }}</text>
  </view>
</view>

<view class="note-list">
  <block wx:for="{{ notes }}" wx:key="id">
    <view class="note-list__item" data-id="{{ item.id }}" bindtap="onOpenDetail">
      <template is="noteCard" data="{{ ...item }}" />
    </view>
  </block>

  <view wx:if="{{ notes.length === 0 && !loading }}" class="empty">
    <text>附近还没有探店笔记，下拉试试</text>
  </view>
</view>
```

```typescript
// pages/notes/notes.ts
Page({
  data: {
    tabs: ['推荐', '美食', '咖啡', '展览'],
    activeTab: 0,
    loading: false,
    notes: [] as NoteCard[]
  },
  onSwitchTab(e: WechatMiniprogram.TouchEvent) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ activeTab: index })
    // 后续接入按分类查询
  },
  onOpenDetail(e: WechatMiniprogram.TouchEvent) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/note-detail/note-detail?id=${id}` })
  }
})
```

#### 14.2 详情页：条件区块 + 内容渲染

```xml
<!-- pages/note-detail/note-detail.wxml -->
<view class="detail" wx:if="{{ note }}">
  <image class="detail__cover" src="{{ note.coverUrl }}" mode="aspectFill" />

  <view class="detail__main">
    <text class="detail__title">{{ note.title }}</text>
    <view class="detail__shop">
      <text>{{ note.shopName }}</text>
      <text class="detail__district">{{ note.district }}</text>
    </view>

    <view class="detail__photos">
      <image
        class="detail__photo"
        wx:for="{{ note.images }}"
        wx:key="*this"
        src="{{ item }}"
        mode="aspectFill"
      />
    </view>

    <text class="detail__content">{{ note.content }}</text>

    <block wx:if="{{ note.coupon }}">
      <view class="coupon-bar">
        <view class="coupon-bar__info">
          <text class="coupon-bar__amount">¥{{ note.coupon.amount }}</text>
          <text class="coupon-bar__cond">满 {{ note.coupon.threshold }} 元可用</text>
        </view>
        <button
          class="coupon-bar__btn"
          disabled="{{ note.coupon.received || note.coupon.soldOut }}"
          bindtap="onReceiveCoupon"
        >
          {{ note.coupon.soldOut ? '已抢光' : (note.coupon.received ? '已领取' : '立即领取') }}
        </button>
      </view>
    </block>
  </view>
</view>

<view class="detail--loading" wx:else>
  <text>加载中…</text>
</view>
```

```typescript
// pages/note-detail/note-detail.ts
Page({
  data: {
    note: null as null | (NoteCard & {
      content: string
      images: string[]
      coupon: { amount: number; threshold: number; received: boolean; soldOut: boolean } | null
    })
  },
  onLoad(query: Record<string, string | undefined>) {
    const id = Number(query.id)
    this.loadDetail(id)
  },
  loadDetail(id: number) {
    /* 当前用 mock；后续单元替换为云数据库 db.collection('notes').doc(id) */
    const mockDetail = this.buildMockDetail(id)
    this.setData({ note: mockDetail })
  },
  buildMockDetail(id: number) {
    return {
      id,
      title: '藏在弄堂里的本帮小馆',
      shopName: '巷子里的小面馆',
      district: '静安区',
      coverUrl: '/images/note-101.png',
      likes: 326,
      publishedAtText: '2 小时前',
      content: '门脸很小，里面别有洞天。招牌葱油拌面香气十足……',
      images: ['/images/p1.png', '/images/p2.png'],
      coupon: { amount: 10, threshold: 50, received: false, soldOut: false }
    }
  },
  onReceiveCoupon() {
    this.setData({ 'note.coupon.received': true })
    wx.showToast({ title: '领取成功', icon: 'success' })
  }
})
```

这个例子串联了：import 模板、include 片段、动态 class、嵌套 wx:for、block + wx:if、wx:if 与空态、数据路径 setData、事件回到逻辑层——正是本单元的完整闭环。

### 15. 常见反模式清单与本单元小结

| 反模式 | 后果 | 正确做法 |
|---|---|---|
| 把 WXML 当 HTML，写 div/span | 组件无法识别，渲染异常 | 一律使用 view/text 等小程序组件 |
| 逻辑层访问 window/document | 报错，双线程下无 DOM | 用小程序 API 与 SelectQuery |
| 布尔属性不写 `{{}}` | 字符串真假与预期相反 | 布尔值动态绑定 |
| 高频切换用 wx:if | 反复销毁重建、状态丢失 | 用 hidden |
| 敏感内容靠 hidden 隐藏 | 数据已下发，可被查看 | 后端控制数据，前端不存密钥 |
| wx:for 不写 wx:key | 告警、diff 错位、性能差 | 稳定唯一字段或 `*this` |
| 用 index 做可编辑列表的 key | 插入删除时状态错乱 | 用业务 id |
| 模板里调用 Page 方法 | 表达式不生效 | 逻辑层预算或用 WXS |
| 直接改 this.data 不 setData | 界面不更新 | 始终走 setData |
| 一次 setData 传超大整包 | 跨线程通信开销大、卡顿 | 数据路径局部更新、控制体量 |
| template 里写事件逻辑期待自运行 | 模板无 JS 归属 | 事件写在使用页面，或升级组件 |

学完本单元，学员应能在不看文档的情况下：根据数据结构写出含绑定、条件、列表的页面；解释 `wx:if`/`hidden`、`wx:key` 的机制；并把重复结构抽成 template 按 import/include 规则组织。格式化计算能力由下一单元 WXS 补齐。

## 课后题

1. WXML 与 HTML 至少有哪三点本质区别？为什么在小程序的逻辑层中不能使用 `document.getElementById`？
2. Mustache `{{ }}` 可以完成哪几类绑定？请各写一个例子：文本内容、`image` 的 `src`、布尔属性、动态 `class`。
3. `<switch checked="false" />` 与 `<switch checked="{{ false }}" />` 的行为有何不同？请解释原因。
4. 请说明 `wx:if` 与 `hidden` 在“初始渲染”和“切换”两个阶段各自做了什么，并分别给出一个适合使用它们的业务场景。
5. `wx:key` 的作用是什么？不写它会有什么后果？它有哪两种合法取值，分别适用于什么数组？
6. 为什么“可头部插入、可删除”的列表不推荐用数组下标 index 作为 `wx:key`？请结合节点复用过程说明。
7. `<block>` 与普通 `<view>` 有什么区别？为什么可以给 `view` 加 `bindtap`，却不应给 `block` 加？
8. 请说清 `import` 与 `include` 在行为、数据作用域、嵌套作用域上的区别；`<template>` 标签的内容能否被 include 复制？
9. 场景分析题：某同学写了一个“仅会员可见”的按钮，用 `hidden="{{ !isVip }}"` 控制，普通用户点开后通过抓包看到了会员活动的接口地址和活动数据。请指出方案的两个问题，并给出正确设计。
10. 场景分析题：探店笔记列表用 `wx:for="{{ notes }}"` 渲染，但没写 `wx:key`；后来加了“置顶”功能（把某条笔记移动到数组头部），结果置顶后卡片里的点赞数显示串位、图片加载闪烁。请解释根因，并说明如何修改数据与模板来彻底解决。

## 实践练习题

### 练习 1：探店笔记卡片列表（绑定 + wx:for + wx:key）

#### 任务

使用静态 mock 数据渲染至少 6 张探店笔记卡片，卡片包含封面、标题、店名、行政区、标签组、点赞数，点击卡片携带 id 跳转到占位详情页。

参考代码：

```xml
<view class="note-list">
  <view
    class="note-card"
    wx:for="{{ notes }}"
    wx:key="id"
    data-id="{{ item.id }}"
    bindtap="onOpenDetail"
  >
    <image class="note-card__cover" src="{{ item.coverUrl }}" mode="aspectFill" />
    <view class="note-card__body">
      <text class="note-card__title">{{ item.title }}</text>
      <text class="note-card__shop">{{ item.shopName }} · {{ item.district }}</text>
      <view class="note-card__tags">
        <text class="tag" wx:for="{{ item.tags }}" wx:for-item="tag" wx:key="*this">{{ tag }}</text>
      </view>
      <text class="note-card__likes">点赞 {{ item.likes }}</text>
    </view>
  </view>
</view>
```

#### 步骤约束

1. 数据定义为带类型的数组（TS interface：id/title/shopName/district/coverUrl/tags/likes）。
2. 必须同时出现外层 `wx:key="id"` 与标签层 `wx:key="*this"`。
3. 跳转用 `wx.navigateTo`，id 通过 `data-*` + `dataset` 获取，不允许写死在 URL 模板里循环。
4. 列表为空时显示空态视图（用 `wx:if` 判断长度）。

#### 提交物

- 页面 WXML/TS/WXSS；
- 控制台无 wx:key 警告的截图；
- AppData 面板数据与界面对应关系说明（100 字以内）。

#### 验收标准

- 6 条数据全部正确渲染，标签不重名、不串位；
- 点击每张卡片跳转 URL 中的 id 与数据一致；
- 把某条数据移动到数组头部后，卡片内容不错位、不闪烁。

### 练习 2：条件渲染选型实验（wx:if vs hidden）

#### 任务

在同一页面实现两个切换区域：一个“筛选面板”（频繁开关），一个“会员推广区”（极少出现），分别使用 `hidden` 与 `wx:if`，并在 WXML 面板观察节点的创建与销毁。

概念伪代码：

```text
筛选面板按钮（点击切换 filterOpen）
  └─ <view hidden="{{ !filterOpen }}">…一堆筛选项…</view>

会员推广区
  └─ <block wx:if="{{ isVip }}">
       <view>专属券</view><button>立即使用</button>
     </block>
```

#### 步骤约束

1. 在筛选面板内放一个 `<input>`，输入内容后反复开关，验证 hidden 方式下内容保留。
2. 把筛选面板临时改成 wx:if 再试一次，记录输入内容的变化，最后改回 hidden。
3. 在 WXML 面板分别截图：wx:if 为假时节点不存在；hidden 为假时节点仍在。
4. 用一句话写出选型结论并注释在代码中。

#### 提交物

- 页面代码与注释；
- 两种状态下 WXML 面板对比截图（至少 4 张）；
- 100 字以内实验记录。

#### 验收标准

- 两种机制的节点存在性截图证据完整；
- 能解释输入内容为何在一种方式下保留、另一种方式下丢失；
- 最终代码选型与“频繁切换用 hidden”一致。

### 练习 3：抽取 noteCard 模板并用 import 复用

#### 任务

把练习 1 的卡片结构抽成独立 `<template name="noteCard">` 文件，列表页通过 `import` 引入并用展开语法传参；另外新建一个“附近推荐”页面，复用同一模板渲染 3 条紧凑布局数据。

参考代码：

```xml
<!-- templates/note-card.wxml -->
<template name="noteCard">
  <view class="note-card note-card--{{ layout || 'full' }}">
    <image class="note-card__cover" src="{{ coverUrl }}" mode="aspectFill" />
    <view class="note-card__body">
      <text class="note-card__title">{{ title }}</text>
      <text class="note-card__shop">{{ shopName }} · {{ district }}</text>
      <text class="note-card__likes">点赞 {{ likes }}</text>
    </view>
  </view>
</template>
```

```xml
<!-- 使用方 -->
<import src="../../templates/note-card.wxml" />
<block wx:for="{{ notes }}" wx:key="id">
  <view data-id="{{ item.id }}" bindtap="onOpenDetail">
    <template is="noteCard" data="{{ ...item, layout: 'compact' }}" />
  </view>
</block>
```

#### 步骤约束

1. 模板文件只含 template 定义；两个使用页均通过 import 引入，禁止复制卡片代码。
2. 模板内变量必须全部由 `data` 提供，不允许直接依赖页面字段。
3. 紧凑页通过 `layout: 'compact'` 切换样式，WXSS 中实现对应变体。
4. 验证 import 不穿透：再建一个被间接 import 的模板，确认不能跨层使用并记录现象。

#### 提交物

- 模板文件、两个使用页代码与公共 WXSS；
- 两个页面渲染截图；
- import 作用域验证记录（100 字以内）。

#### 验收标准

- 两处卡片由同一份模板渲染、样式按 layout 正确变化；
- 修改模板一处，两个页面同步生效；
- 能说清模板数据作用域与 import 不穿透规则。

## 阶段验收作业

本作业是阶段一“静态骨架”的**视图表达证据点**，重点证明学员能独立用 WXML 完成真实信息流页面，并对条件渲染、列表 key、模板复用做出正确的工程决策。

### 任务描述

为「逛吃指南」实现“探店笔记”信息流与详情骨架（纯前端静态数据）：

1. 列表页渲染不少于 8 条笔记，支持顶部分类 Tab（推荐/美食/咖啡/展览），点击卡片进入详情并携带 id；包含空态视图。
2. 卡片结构必须抽成 `noteCard` 模板并用 import 引入；另建一个“附近推荐”区块（可在同页或新页）复用同一模板，通过 layout 字段切换紧凑样式。
3. 详情页包含封面、标题、门店信息、图集（wx:for）、正文，以及一个用 block + wx:if 控制的优惠券领取区，领取按钮在“已领取/已抢光”时禁用且文案变化。
4. 列表页实现一次“模拟置顶”操作（把某条数据移动到数组头部），验证卡片不错位；实现一个频繁开关的筛选面板（hidden）。

### 完成标准

- 列表—详情链路可用，id 传递正确，空态、禁用态、隐藏态均有真实呈现；
- 卡片结构零复制：两处使用同一份 template，修改一处两处生效；
- 列表全部带 `wx:key`，置顶操作后内容不串位、输入态不丢失；
- 能现场解释任一渲染现象背后的机制（跨线程异步、惰性渲染、key 复用、单向数据流）。

### 评分要点（100 分）

| 维度 | 分值 | 要点 |
|---|---:|---|
| 数据绑定与 Mustache 运算 | 15 | 文本/属性/布尔/class 绑定正确，表达式克制合理 |
| 条件渲染 | 15 | wx:if 与 hidden 选型正确，block 用法规范 |
| 列表渲染与 wx:key | 20 | key 合法稳定，嵌套循环变量清晰，置顶无错位 |
| 模板复用 | 20 | template/is/data/import 使用正确，零结构复制 |
| 单向数据流与事件 | 10 | 事件回逻辑层、数据路径 setData，无反向改数据 |
| 业务完整度 | 10 | 列表/详情/券区/空态/筛选面板闭环可演示 |
| 代码规范与表达 | 10 | 无 HTML 标签、无反模式，命名清晰、能讲清机制 |

### 强制不通过条件

- 出现 `div`/`span` 等 HTML 标签，或在逻辑层使用 `window`/`document`；
- 列表未写 `wx:key`，或用 index 导致置顶/插入时内容错位；
- 卡片代码靠复制粘贴实现、未通过 template + import 复用；
- 把密钥或越权数据放进前端并以 hidden 充当权限控制；
- 直接修改 `this.data` 不调用 `setData`，或无法解释 `setData` 的跨线程异步特性；
- 核心链路（列表跳转、领券状态切换）不可演示。

完成本作业后，学员已具备用 WXML 表达任意静态页面的能力。下一单元 U06「WXS 渲染层脚本」将让模板拥有渲染层计算能力，解决发布时间、价格、距离、文本截断等格式化问题，并为高频交互的渲染层响应打下基础。
