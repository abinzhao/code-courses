# 28-Skyline渲染引擎与Worklet动画

## 目标

完成本知识单元后，学员应能把「逛吃指南」的核心页面从 WebView 渲染迁移到 Skyline 渲染引擎，用 Worklet 在 UI 线程实现手势与动画，并且在低版本与未覆盖平台上可靠地回退到 WebView——升级体验，但不破坏兼容。

学员应能够：

1. 说清 Skyline 的架构：独立渲染线程承担 Layout、Composite、Paint，AppService 侧独立上下文承担组件树构建，并与 U02 的 WebView 双线程模型逐点对比。
2. 解释 Skyline 为什么界面更不容易被业务逻辑阻塞、页面间为什么可以共享资源，以及 WXS 在 Skyline 下位置发生了什么变化。
3. 在 `app.json`、页面 JSON、分包 JSON 三个层级正确启用 `renderer: "skyline"` 与 `componentFramework: "glass-easel"`，并配好 `rendererOptions.skyline` 兼容选项。
4. 使用 `wx.getSkylineInfo`、`wx.canIUse` 与实例上的 `this.renderer` 查询当前环境能力，区分“平台支持”与“本次实际命中渲染器”。
5. 说清两种灰度路径：We 分析 AB 实验逐步放量（含“100% 不等于全量”的陷阱）与 `disableABTest + sdkVersionBegin/End` 直配。
6. 识别并适配布局差异：默认 flex 布局、默认 `border-box`、节点默认 `relative`、无全局滚动、无原生导航栏，以及文本内联、省略、z-index、选择器边界等不支持项。
7. 使用 `scroll-view type="list"`、`list-view`、`grid-view` 完成长列表按需渲染，理解“直接子节点粒度回收”与 `list-item` 样式共享的约束。
8. 掌握 Worklet 机制：`'worklet'` 指令、`runOnUI`/`runOnJS`、共享值 `shared` 与 `derived`，理解捕获变量的序列化与冻结限制。
9. 使用 `applyAnimatedStyle` 配合 `timing`、`spring`、`decay`、`Easing` 与组合动画实现流畅动画；使用手势组件处理 pan/tap/scale 等手势，理解手势状态机与手势协商。
10. 使用 `wx.preloadSkylineView` 做页面预路由，了解自定义路由转场、`open-container` 容器转场与共享元素；选核心页面迁移并用帧率、跟手延迟等真机数据量化流畅度收益，同时验证 WebView 回退路径。

## 技术栈

| 工具或能力 | 用途 | 学习要求 |
|---|---|---|
| Skyline 渲染引擎当前版本 | 独立渲染线程、新管线 | 理解架构与能力边界 |
| `app.json` 的 `renderer` / `componentFramework` / `rendererOptions` | 全局启用与兼容配置 | 会写完整配置块 |
| 页面 / 分包 JSON 的 `renderer` | 按页面或分包粒度开启 | 会做渐进式迁移 |
| glass-easel 组件框架 | Skyline 下单线程版本组件树 | 理解其与 Skyline 的配合 |
| `wx.getSkylineInfo(Sync)` / `wx.canIUse` | 查询平台支持情况 | 会读字段并做分支 |
| `this.renderer` | 识别实际渲染器 | 会按渲染器切换 WXSS/逻辑 |
| We 分析 AB 实验 | 默认灰度通道 | 理解放量与实验结束语义 |
| `disableABTest` + `sdkVersionBegin/End` | 绕过 AB 的直配灰度 | 会按基础库版本圈定人群 |
| `scroll-view type="list"` / `list-view` / `grid-view` | 长列表按需渲染 | 理解子节点粒度与约束 |
| `wx.worklet`：`shared`/`derived`/`runOnUI`/`timing`/`spring`/`decay`/`Easing` | UI 线程动画 | 能写共享值驱动的动画 |
| `this.applyAnimatedStyle` / `clearAnimatedStyle` | 绑定动画样式 | 理解 selector/updater/config |
| 手势组件（pan/tap/scale 等 gesture-handler） | UI 线程手势 | 理解状态机、协商与 native-view |
| `wx.preloadSkylineView` / `open-container` / 自定义路由 | 预路由与转场 | 会预加载并了解转场能力 |
| 微信开发者工具当前稳定版 | Skyline 调试 | 开启 Skyline 调试与 worklet 编译 |
| 真机设备 | 迁移验证与量化 | iOS、Android 真机，覆盖低版本回退 |

实验约定：

- Skyline 与 WebView 可以混跳，迁移一律按“页面粒度渐进开启”推进，禁止一次性全改。
- 所有 Skyline 页面必须同时验证两件事：高版本下命中 Skyline，低版本/未覆盖平台下 WebView 表现正确。
- Worklet 仅在 Skyline 下可用；涉及 Worklet 的逻辑必须有 WebView 兜底实现，不得在低版本报错。
- 流畅度收益延续 U27 的证据标准：真机采集、至少 3 次、量化前后对比。

## 详细的理论知识讲解和示例伪代码

### 1. 为什么需要 Skyline：WebView 的历史包袱

WebView 是成熟技术：兼容性好、特性丰富。但在移动端，它把 JS 执行、DOM 树创建、CSS 解析、样式计算、Layout、Paint 全部放在同一条线程上，渲染流水线冗长。于是两个问题难以根除：

- 业务 JS 执行稍久就阻塞同线程的渲染，动画掉帧、点击无响应；
- 快速滚动时，异步分块光栅化容易出现白块，滚动途中更新 DOM 会出现内容不同步。

U02 的双线程模型通过“逻辑层 / 渲染层隔离 + Native 中转”解决了安全与大部分阻塞问题，但每个页面仍是独立 WebView：建栈要新建 JS 引擎实例，页面间资源难以共享，跨线程通信始终有序列化成本。

Skyline 的目标不是替换 Web 标准，而是在 WebView 之外提供一条**更精简、更接近原生**的渲染管线：

```text
设计取舍：
  精简 CSS 集合（只保留更现代的常用特性）
  精确控制节点渲染（尽量不做不可见区域的布局绘制）
  同步光栅化（避免快速滚动白块）
  把手势/动画能力下沉到渲染线程（Worklet）
```

关键工程事实：适配了 Skyline 的小程序在不使用新增特性时，可在低版本无缝自动退回 WebView。因此 Skyline 是“增量增强”，不是“推倒重来”。

### 2. Skyline 架构：独立渲染线程与更精简管线

Skyline 对线程组织做了两处核心改动：

1. 创建一条独立的**渲染线程**，专门负责 Layout、Composite、Paint；
2. 在 AppService 中划出一个独立上下文，承担原本由 WebView 承担的 JS 逻辑与 DOM 树（组件树）创建。

```text
WebView 模式：
┌─────────────── AppService（逻辑层）───────────────┐
│ 业务 JS、setData、wx API                            │
└─────────────── Native 桥（序列化）────────────────┘
┌─────────────── WebView（每页面一个）──────────────┐
│ JS 引擎 + DOM 树 + CSS + Layout + Paint（同线程）   │
└──────────────────────────────────────────────────┘

Skyline 模式：
┌──────── AppService（组件树构建上下文 + 业务 JS）────┐
│ glass-easel 建树、setData、WXS、wx API              │
│              │ 不再经 JSBridge 交换框架数据          │
┌──────────── 渲染线程（独立）──────────────────────┐
│ Layout、Composite、Paint、Worklet 运行时、手势识别   │
└──────────────────────────────────────────────────┘
```

这套架构带来的直接收益：

- 界面更不容易被业务逻辑阻塞：渲染任务独立线程执行；
- 无需为每个页面新建 WebView/JS 引擎实例，减少内存与启动时间开销；
- 页面之间可以共享更多框架资源（组件树上下文、样式表等）；
- 框架内部代码之间不再通过 JSBridge 交换数据，减少大量通信时间；
- WXSS 在构建期预编译为二进制，运行时直接读取，免去运行时解析（官方数据：较运行时解析快数倍）。

需要注意：WXS 被移到了 AppService 中，逻辑本身不用改，但“询问页面信息”一类接口变为异步、效率可能下降；复杂动画应改用更靠近渲染流程的 Worklet。

### 3. 线程模型再认识：setData 与 WXS 的位置变化

在 Skyline 下，U27 反复优化的 `setData` 本身发生了质变：

- 由于组件树构建上下文与业务 JS 同在 AppService 侧，`setData` 不再需要 JSBridge 式的序列化跨线程通信，**通信开销与序列化开销消失**；
- 但数据合并、组件树 diff、样式与布局渲染仍然存在，传超大对象、高频无意义更新依然浪费；
- 动画/手势若仍走“事件到 JS 再 setData 回来”，异步延迟依旧存在——这正是 Worklet 要解决的。

```text
WebView：setData = 序列化 + JSBridge + 反序列化 + diff + 渲染
Skyline：setData = 同上下文数据更新 + diff + 渲染（无桥通信）
UI 线程闭环：手势 → Worklet → applyAnimatedStyle（不经过 JS 线程）
```

WXS 的变化同样要记住：Skyline 下 WXS 运行在 AppService（JS 线程），而触摸事件产生在 UI 线程，因此 WXS 响应事件的跟手性能反而不如在 WebView 下；Skyline 页面的高频手势应优先使用手势组件 + Worklet。

常见误区：以为“上了 Skyline 就可以随便 setData”——桥没了，但 diff 与渲染成本还在；把 WebView 下的 WXS 拖拽原封不动当高性能方案——Skyline 下应换 Worklet。

### 4. 启用 Skyline：app.json / page.json 配置详解

全局启用（适合新项目或已完成全量适配的项目）：

```json
{
  "lazyCodeLoading": "requiredComponents",
  "renderer": "skyline",
  "componentFramework": "glass-easel",
  "rendererOptions": {
    "skyline": {
      "defaultDisplayBlock": true,
      "defaultContentBox": true,
      "tagNameStyleIsolation": "legacy",
      "enableScrollViewAutoSize": true,
      "keyframeStyleIsolation": "legacy"
    }
  }
}
```

各配置的作用：

| 配置 | 作用 |
|---|---|
| `lazyCodeLoading: "requiredComponents"` | 按需注入，Skyline 依赖该特性，应先开启并测试 |
| `renderer: "skyline"` | 指定渲染引擎，缺省为 webview |
| `componentFramework: "glass-easel"` | 使用新版组件框架，适配 Skyline 单线程模型 |
| `defaultDisplayBlock` | 默认 Block 布局，默认表现向 Web 对齐 |
| `defaultContentBox` | 默认 content-box 盒模型，向 Web 对齐 |
| `tagNameStyleIsolation: "legacy"` | tag 选择器按旧版全局方式匹配 |
| `enableScrollViewAutoSize` | scroll-view 自动撑高兼容 |
| `keyframeStyleIsolation: "legacy"` | 关键帧样式隔离按旧版处理 |

渐进式迁移时，把 `renderer` 与 `componentFramework` 下沉到页面 JSON：

```json
// pages/shop-detail/shop-detail.json
{
  "navigationStyle": "custom",
  "renderer": "skyline",
  "componentFramework": "glass-easel"
}
```

也可以按分包粒度开启，分包内页面统一使用 Skyline：

```json
{
  "subPackages": [
    {
      "root": "packageDetail",
      "pages": ["pages/detail/detail", "pages/interior/interior"],
      "renderer": "skyline",
      "componentFramework": "glass-easel"
    }
  ]
}
```

开发者工具侧还要确认：详情 → 本地设置中勾选“开启 Skyline 渲染调试”，使用 Worklet 时勾选“编译 worklet 代码”（工具提示为将 JS 编译成 ES5 相关项），调试基础库切到 3.0.0 或以上。模拟器左上角会显示当前 renderer。

常见误区：只写 `renderer` 不写 `componentFramework`；开启后遇到白屏只怀疑代码——可先重启工具；期望热重载——Skyline 模式下支持情况以当前工具为准，必要时重新编译。

### 5. 版本覆盖与能力查询

Skyline 只在较高版本的微信客户端可用。文档快照的覆盖情况大致是：Android 8.0.33 起、iOS 8.0.34 起支持，较完整的特性建议对应客户端 8.0.40 / 基础库 3.0.2 及以上；开发者工具 Stable 1.06.2307260 起支持；HarmonyOS 从基础库 3.11.3 起支持。PC、企业微信等端的支持以当前官方文档的支持表为准。

运行时查询有三个层次，不要混用：

```typescript
// ① 平台层面：当前环境对 Skyline 的支持情况与引擎版本
wx.getSkylineInfo({
  success(res) {
    console.log('是否支持', res.isSupported, '引擎版本', res.version)
  }
})
const info = wx.getSkylineInfoSync()
console.log(info.isSupported)

// ② 接口/组件层面：某个具体能力在当前版本是否可用
const canUseWorklet = wx.canIUse('worklet')
console.log('worklet 可用', canUseWorklet)

// ③ 实例层面：本页面本次实际用的是哪一个渲染器
Page({
  data: {
    renderer: 'webview' as 'webview' | 'skyline'
  },
  onLoad() {
    // this.renderer 由框架注入，取值 'webview' 或 'skyline'
    this.setData({ renderer: this.renderer })
  }
})
```

三者的关系：`getSkylineInfo` 回答“这台设备能不能跑”，`canIUse` 回答“这个特性有没有”，`this.renderer` 回答“我现在到底跑在哪”。即使平台支持，页面也可能因 AB 实验或灰度配置仍以 WebView 渲染。

常见误区：只判断平台支持，不判断实际 renderer 就执行 Worklet；把工具模拟器的结果等同于真机覆盖。

### 6. 灰度发布：We 分析 AB 实验与 sdkVersion 直配

Skyline 相关变更上线时默认走灰度，平台提供了两条路径。

路径一：We 分析 AB 实验（默认机制）。

- 新版本发布后，默认仍以 WebView 运行；需要在 We 分析 AB 实验的“小程序基础库实验”中逐步放量；
- 开发者本人也受实验影响，调试时需加白名单，或在工具中强切；
- 关键陷阱：**实验流量分配到 100% 不等于全量 Skyline**，此时通常是 Skyline 与 WebView 各 50%；要真正全量，需要先结束实验，再选择全量某一个实验组。

```text
推荐放量节奏（示例）：
  内部白名单 → 1% → 5% → 20% → 50%（AB 对照观察性能与异常）
  确认收益与稳定性后：结束实验 → 全量 Skyline 组
```

路径二：关闭 AB 实验，按版本直配（已充分测试、不需要 AB 对照时使用）。

```json
{
  "rendererOptions": {
    "skyline": {
      "disableABTest": true,
      "sdkVersionBegin": "3.0.1",
      "sdkVersionEnd": "15.255.255"
    }
  }
}
```

字段含义：`sdkVersionBegin` 是命中 Skyline 的基础库最低版本；`sdkVersionEnd` 是上限，**必须填一个足够大的值**（如 15.255.255），否则之后发布的新基础库版本反而不会命中 Skyline。

也可以按微信客户端版本圈定（与 sdkVersion 二选一）：

```json
{
  "rendererOptions": {
    "skyline": {
      "disableABTest": true,
      "iosVersionBegin": "8.0.40",
      "iosVersionEnd": "15.255.255",
      "androidVersionBegin": "8.0.40",
      "androidVersionEnd": "15.255.255",
      "ohosVersionBegin": "1.0.10",
      "ohosVersionEnd": "15.255.255"
    }
  }
}
```

常见误区：上线后发现没人命中 Skyline——忘了配置 AB 或没加白名单；End 字段填当前版本导致新版本集体回退；把 AB 100% 当全量。

### 7. 布局差异适配（一）：默认 flex、盒模型与定位体系

Skyline 为性能精简了布局模型，默认值与 Web 不同，这是迁移时布局错乱的首要原因。

| 差异点 | WebView / Web 默认 | Skyline 默认 | 适配手段 |
|---|---|---|---|
| 布局方式 | block | flex | `defaultDisplayBlock: true` 或显式声明 flex |
| 盒模型 | content-box | border-box | `defaultContentBox: true` |
| 节点定位 | static | relative | 需要时显式设置 position |
| 页面滚动 | 页面全局可滚 | 无全局滚动 | 用 scroll-view 做局部滚动 |
| 导航栏 | 可用原生导航栏 | 不支持原生导航栏 | `navigationStyle: "custom"` 自行实现 |

局部滚动是必须接受的结构性变化。Skyline 下常规页面骨架是“自定义导航栏 + flex:1 的 scroll-view”：

```xml
<view class="page">
  <navigation-bar title="店铺详情"></navigation-bar>
  <scroll-view
    type="list"
    scroll-y
    class="page__scroll"
  >
    <view class="cell" wx:for="{{ list }}" wx:key="id" list-item>
      <text>{{ item.title }}</text>
    </view>
  </scroll-view>
</view>
```

```css
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.page__scroll {
  flex: 1;
  width: 100%;
}
```

官方还建议配合一段 WXSS Reset 对齐两端表现（全局样式重置）：

```css
page,
view,
text,
image,
button,
video,
map,
scroll-view,
swiper,
input,
textarea,
navigator {
  position: relative;
}

page {
  height: 100%;
}
```

定位差异的连带影响：所有节点默认 `relative`，会让 `position: absolute` 的参照节点与 Web 下不同，出现坐标不准；需要在样式中显式声明参照节点的 position。

### 8. 布局差异适配（二）：组件与样式不支持项清单

Skyline 的 WXSS 是 WebView 的子集，并将长期如此。高频踩坑点如下：

| 问题 | Skyline 表现 | 适配方式 |
|---|---|---|
| 多段文本内联 | 不支持 inline 布局 | 用 `text`/`span` 组件包裹，或改 flex |
| 单行省略 | `text-overflow: ellipsis` 只对 text 生效 | `<text overflow="ellipsis">` + nowrap + overflow hidden |
| 多行省略 | view 上无效 | `<text max-lines="{{2}}">` |
| z-index | 不支持完整 Web 层叠上下文 | 仅在同层级节点间使用 z-index |
| 选择器跨组件 | tag/id 不跨自定义组件匹配 | 用 class + 样式隔离，或 tagNameStyleIsolation |
| 组件 animate 接口 | 不支持 | 用 Worklet 动画实现 |
| SVG | 不支持 style 选择器、rgba 等 | 改内联、用 fill-opacity，提交前用 SVGO 优化 |
| float 布局 | 不支持 | 用 flex 重写 |
| 原生组件调试 | 工具暂不支持 map/canvas/video/camera 调试 | 真机预览调试 |

文本内联的正确写法：

```xml
<!-- 文本与图片混排：span 包裹 -->
<text class="line">
  <text>人均</text>
  <span><image class="icon" src="/assets/coin.png" /></span>
  <text class="price">¥38</text>
</text>
```

单行省略的声明式写法：

```xml
<text class="title" overflow="ellipsis">{{ item.title }}</text>
```

```css
.title {
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
}
```

scroll-view 横向滚动还要兼顾 WebView：横向滚动容器在 WebView 下需开启 flex：

```xml
<scroll-view scroll-x enable-flex class="h-scroll">
  <view class="h-scroll__item" wx:for="{{ coupons }}" wx:key="id">
    {{ item.name }}
  </view>
</scroll-view>
```

```css
.h-scroll {
  display: flex;
  flex-direction: row;
}
.h-scroll__item {
  flex-shrink: 0;
}
```

适配方法建议：开启前述兼容开关，让默认值向 Web 对齐；用工具的 WXML 面板定位异常节点；对纯样式无法对齐的场景，再按 `this.renderer` 分支处理。

### 9. 长列表与局部滚动：scroll-view、list-view、grid-view

Skyline 对长列表做了平台级优化，核心是**按需渲染**：scroll-view 只渲染接近视口的直接子节点，远离视口的子节点被回收；首次渲染还有 lazy mount 机制。

关键约束：回收粒度是 **scroll-view 的直接子节点**。

```xml
<!-- 正确：5 个直接子节点，每个都能按需渲染/回收 -->
<scroll-view type="list" scroll-y>
  <view wx:for="{{ list }}" wx:key="id" list-item>{{ item.title }}</view>
</scroll-view>

<!-- 失效结构：只有 1 个直接子节点，里面包了全部内容，无法按项回收 -->
<scroll-view type="list" scroll-y>
  <view>
    <view wx:for="{{ list }}" wx:key="id">{{ item.title }}</view>
  </view>
</scroll-view>
```

`list-item` 属性用于开启相似节点样式共享：列表项样式一致时只计算一次。通过 `wx:for` 展开的节点声明 `list-item` 即可（新版本会进一步自动识别）。

需要更强的列表控制（回收事件、固定布局）时，可使用 `list-view` / `grid-view` 组件：

```xml
<list-view
  scroll-y
  class="lv"
  binditemmount="onItemMount"
  binditemunmount="onItemUnmount"
>
  <list-view-item
    wx:for="{{ list }}"
    wx:key="id"
    item-key="{{ item.id }}"
  >
    <view class="cell">
      <image class="cell__img" src="{{ item.cover }}" mode="aspectFill" lazy-load />
      <text class="cell__title">{{ item.title }}</text>
    </view>
  </list-view-item>
</list-view>
```

```typescript
Page({
  onItemMount(e: WechatMiniprogram.CustomEvent<{ key: string }>) {
    // 节点挂载：可做按需监听等
    console.log('挂载', e.detail.key)
  },
  onItemUnmount(e: WechatMiniprogram.CustomEvent<{ key: string }>) {
    // 节点回收：释放该项绑定的资源
    console.log('回收', e.detail.key)
  }
})
```

注意：按需渲染下，对离屏直接子节点做 `selectAll().boundingClientRect()` 可能拿不到尺寸，因为节点尚未渲染；需要时改为逐个查询或在节点挂载后查询。

### 10. Worklet 是什么：跑在 UI 线程的函数

Worklet 是一种声明在开发者代码中、可以运行在 JS 线程或 UI 线程的函数，函数体顶部用 `'worklet'` 指令声明。它使手势与动画的处理不再跨线程绕回 JS。

```typescript
function someWorklet(greeting: string) {
  'worklet'
  // 直接调用时运行在 JS 线程
  console.log(greeting)
}

// 运行在 UI 线程：通过 runOnUI 派发
wx.worklet.runOnUI(someWorklet)('hello')
```

Worklet 之间可以互相调用；从 UI 线程需要回到 JS 线程时，用全局的 `runOnJS`：

```typescript
const { runOnUI } = wx.worklet

function someFunc(greeting: string) {
  // 普通函数，运行在 JS 线程
  console.log('hello', greeting)
}

function backToJSWorklet() {
  'worklet'
  runOnJS(someFunc)('skyline')
}

runOnUI(backToJSWorklet)()
```

两条重要的使用限制：

1. Worklet 捕获的外部变量会被序列化、生成 UI 线程上的拷贝；捕获之后再改原变量，UI 侧看不到变化——需要同步的状态必须用共享值。
2. 捕获的对象类型变量会被 `Object.freeze` 冻结；在页面/组件的 Worklet 回调中访问数据时，用 `this.data.msg` 这种具体属性访问，不要解构 `this.data`，否则可能导致 `this.data` 被冻结、setData 失效；调用页面方法时用 `this.methodName.bind(this)`。

```typescript
Page({
  data: { msg: 'Skyline' },

  handleTap() {
    'worklet'
    // 正确：直接访问具体属性
    const msg = 'hello ' + this.data.msg

    // 正确：bind 后再交给 runOnJS
    const showModal = this.showModal.bind(this)
    runOnJS(showModal)(msg)
  },

  showModal(text: string) {
    wx.showModal({ title: text })
  }
})
```

### 11. 共享值 shared 与 derived

共享值（sharedValue）由 `wx.worklet.shared` 在 JS 线程创建，可在两个线程间同步。读写都通过 `.value`，用法上可以类比 Vue 3 的 `ref`，但二者不是同一概念。

```typescript
const { shared, runOnUI } = wx.worklet

const offset = shared(0)

function readOffset() {
  'worklet'
  console.log('UI 线程读到', offset.value)
  offset.value = 2 // UI 线程修改
}

// JS 线程修改
offset.value = 1
runOnUI(readOffset)()
```

对比“普通捕获变量”与“共享值”：

```typescript
const captured = { name: 'skyline' }
const synced = shared(0)

function compareWorklet() {
  'worklet'
  console.log(captured.name) // 仍是声明时的 'skyline'
  console.log(synced.value) // 能读到最新值
}

captured.name = 'changed' // 无法同步到 UI 拷贝
synced.value = 99         // 可以同步
wx.worklet.runOnUI(compareWorklet)()
```

`derived` 用于创建“由其他共享值派生”的共享值，派生关系自动维护：

```typescript
const { shared, derived } = wx.worklet

const width = shared(100)
// doubleWidth 随 width 自动更新（具体 API 形态以官方文档为准）
const doubleWidth = derived(() => {
  'worklet'
  return width.value * 2
})

console.log(doubleWidth.value) // 200
```

常见误区：用普通闭包变量驱动动画还指望跨线程同步；共享值忘记 `.value`；把 sharedValue 当 Vue ref 到处解构。

### 12. 动画体系：timing / spring / decay 与 applyAnimatedStyle

动画的工作方式：在实例上调用 `applyAnimatedStyle(selector, updater)`，`updater` 是捕获了共享值的 Worklet；共享值变化时，updater 在 UI 线程重新执行，返回的样式对象直接应用到选中节点，全程不经过 JS 线程。

最小可运行示例（点击驱动）：

```xml
<view id="moved-box" class="box"></view>
<button bindtap="tap">点击移动小球</button>
```

```typescript
Page({
  onLoad() {
    const offset = wx.worklet.shared(0)
    this._offset = offset

    this.applyAnimatedStyle('#moved-box', () => {
      'worklet'
      return {
        transform: `translateX(${offset.value}px)`
      }
    })
  },

  tap() {
    // 用动画类型封装赋值：timing 表示按时间曲线推进
    this._offset.value = wx.worklet.timing(300, {
      duration: 250,
      easing: wx.worklet.Easing.ease
    })
  }
})
```

内置动画类型：

| 接口 | 语义 | 典型场景 |
|---|---|---|
| `timing(to, options)` | 按固定时长 + 缓动曲线推进 | 常规显式动画 |
| `spring(to, options)` | 弹簧物理动画 | 手势松手回弹 |
| `decay(options)` | 惯性衰减 | 手势甩动后的自然停止 |
| `sequence(...)` | 顺序执行组合 | 多段动画编排 |
| `repeat(anim, n)` | 重复执行 | 循环动效 |
| `delay(anim, ms)` | 延迟执行 | 交错动画 |
| `cancelAnimation(shared)` | 取消动画 | 中断当前动画 |

弹簧 + 自定义曲线示例：

```typescript
const { shared, spring, Easing } = wx.worklet

Page({
  onLoad() {
    const scale = shared(1)
    this._scale = scale

    this.applyAnimatedStyle('.target', () => {
      'worklet'
      return { transform: `scale(${scale.value})` }
    })
  },

  onPressIn() {
    this._scale.value = spring(0.92, {
      damping: 12,
      stiffness: 180
    })
  },

  onPressOut() {
    this._scale.value = spring(1, {
      damping: 10,
      stiffness: 160
    })
  }
})
```

`applyAnimatedStyle` 的完整参数与清理：

```typescript
const styleIds: number[] = []

this.applyAnimatedStyle(
  '.box',
  () => {
    'worklet'
    return { transform: `translateX(${this._offset.value}px)` }
  },
  {
    immediate: true, // 是否立即执行一次作为初值，默认 true
    flush: 'async'  // async：下个渲染时间片生效（默认，性能更好）；sync：当前时间片生效
  },
  (res) => {
    styleIds.push(res.styleId)
  }
)

// 提前解绑（节点移除时会自动释放）
this.clearAnimatedStyle('.box', styleIds, () => {
  console.log('已解除样式绑定')
})
```

注意：`clearAnimatedStyle` 只是解除依赖关系，不会重置当前样式；updater 返回对象的 key 使用 CSS 属性驼峰写法，支持的样式集合以 Skyline WXSS 文档为准。

### 13. 手势系统：手势组件、状态机与手势协商

Skyline 内置一批手势组件，免去自行监听 touch、计算手势的工作，且回调直接在 UI 线程触发。

| 手势组件 | 触发时机 |
|---|---|
| `<tap-gesture-handler>` | 点击 |
| `<double-tap-gesture-handler>` | 双击 |
| `<scale-gesture-handler>` | 多指缩放 |
| `<force-press-gesture-handler>` | iPhone 重按 |
| `<pan-gesture-handler>` | 拖动（横/纵） |
| `<vertical-drag-gesture-handler>` | 纵向滑动 |
| `<horizontal-drag-gesture-handler>` | 横向滑动 |
| `<long-press-gesture-handler>` | 长按 |

规则：手势组件是**虚组件**，不参与布局，其上 class/style 无效；只能包含一个直接子节点，真正响应的是这个子节点；手势不冒泡；所有回调都必须是 Worklet。

通用属性：

| 属性 | 作用 |
|---|---|
| `tag` | 手势协商时的组件标识 |
| `worklet:ongesture` | 手势处理回调（UI 线程） |
| `worklet:should-response-on-move` | move 过程中是否派发本次事件 |
| `worklet:should-accept-gesture` | 手势识别阶段是否接受该手势 |
| `simultaneous-handlers` | 声明可同时触发的其他手势 tag |
| `native-view` | 代理的原生节点：scroll-view / swiper |

手势状态枚举：

```typescript
enum GestureState {
  POSSIBLE = 0,  // 未识别
  BEGIN = 1,     // 已识别
  ACTIVE = 2,    // 连续手势活跃中
  END = 3,       // 终止
  CANCELLED = 4  // 取消
}
```

连续手势的完整流程是 `POSSIBLE → BEGIN → ACTIVE → END`，被其他手势抢占时可能走 `CANCELLED`。离散手势（tap/double-tap）只触发一次。

完整示例：卡片跟手拖动 + 松手按位置回弹，最终结果回 JS 落库。

```xml
<pan-gesture-handler worklet:ongesture="handlePan">
  <view class="swipe-card">
    <text>拖动我</text>
  </view>
</pan-gesture-handler>
```

```typescript
const { shared, spring, runOnJS } = wx.worklet

Page({
  onLoad() {
    const translateX = shared(0)
    this._translateX = translateX

    this.applyAnimatedStyle('.swipe-card', () => {
      'worklet'
      return { transform: `translateX(${translateX.value}px)` }
    })
  },

  handlePan(evt: { state: number; deltaX: number }) {
    'worklet'
    if (evt.state === 2) {
      // ACTIVE：增量跟手，无跨线程延迟
      this._translateX.value += evt.deltaX
    } else if (evt.state === 3 || evt.state === 4) {
      // END / CANCELLED：按阈值决定吸回还是飞走
      const x = this._translateX.value
      this._translateX.value = spring(Math.abs(x) > 80 ? -320 : 0, {
        damping: 16,
        stiffness: 170
      })
      if (Math.abs(x) > 80) {
        runOnJS(this.persistDismiss.bind(this))(x)
      }
    }
  },

  persistDismiss(x: number) {
    console.log('卡片被划走，落库', x)
  }
})
```

手势协商：嵌套手势默认“识别一个、其余失效”，内层识别后外层失效。要实现“列表滚动与整区拖动衔接”（类似评论区半屏效果），双方用 `simultaneous-handlers` 声明共存，并用 `native-view` 代理滚动容器内部手势：

```xml
<vertical-drag-gesture-handler
  tag="outer"
  simultaneous-handlers="{{['inner']}}"
  worklet:ongesture="handleOuter"
>
  <vertical-drag-gesture-handler
    tag="inner"
    native-view="scroll-view"
    simultaneous-handlers="{{['outer']}}"
    worklet:ongesture="handleInner"
  >
    <scroll-view scroll-y type="list">
      <view class="cell" wx:for="{{ list }}" wx:key="id" list-item></view>
    </scroll-view>
  </vertical-drag-gesture-handler>
</vertical-drag-gesture-handler>
```

`should-accept-gesture` 在识别阶段触发一次（返回 false 则手势及关联 scroll-view 都不生效）；`should-response-on-move` 在 move 中持续触发，可随时暂停派发。

### 14. 页面预路由与转场：预加载、自定义路由与容器转场

由于大多数线上小程序仍以 WebView 为主，客户端默认不会提前预加载 Skyline 环境。预测用户即将进入 Skyline 页面时，可主动预加载：

```typescript
// 例如：用户在列表卡片上停留、或点击行为发生前
wx.preloadSkylineView({
  success() {
    wx.navigateTo({
      url: '/packageDetail/pages/detail/detail?id=' + this.currentId
    })
  }
})
```

同类预加载能力还有 `wx.preloadWebview`（预建 WebView）与 `wx.preloadAssets`（为视图层预载字体、图片等媒体资源）。

转场能力分三档：

第一档：`open-container` 容器转场。源页面与目标页面各放置一个 `open-container`，`navigateTo` 时框架自动对容器做位置、尺寸、背景色、圆角、阴影的形变过渡。

```xml
<open-container
  transition-type="fadeThrough"
  transition-duration="{{300}}"
  closed-color="#ffffff"
  closed-border-radius="{{12}}"
  open-color="#ffffff"
>
  <view class="shop-thumb">
    <image src="{{ item.cover }}" mode="aspectFill" />
    <text class="shop-thumb__title">{{ item.title }}</text>
  </view>
</open-container>
```

`transition-type` 支持 `fade`（淡入叠放）与 `fadeThrough`（先淡出再淡入）。

第二档：共享元素（share-element）。让两个 Skyline 页面中的同一视觉元素（如封面大图）跨页面连续运动，具体属性以组件文档为准。

第三档：自定义路由。基于 Worklet 描述两个页面的入场/离场状态，可以实现大多数原生转场效果。其处理跑在渲染侧，示意结构：

```text
自定义路由 Worklet（伪代码）：
  根据转场进度 progress（0→1）：
    旧页面：transform/opacity 随 progress 退场
    新页面：从偏移位置随 progress 入场
  手势返回时 progress 可被手势反向驱动
注册方式与支持版本：以官方「自定义路由」文档为准
```

低版本与 WebView 下，自定义路由与共享元素自动退化为“无动效”，不影响跳转本身。

### 15. 兼容回退策略与迁移收益量化

回退是上线设计的一部分，不是事后补救。

平台自动降级规则：在不支持 Skyline 的版本/平台，或未命中灰度条件时，页面自动以 WebView 渲染。官方对部分特性的 WebView 兼容如下：

| 特性 | WebView / 低版本表现 |
|---|---|
| Worklet 动画 | WebView 侧需开发者自行兼容（提供降级实现） |
| 手势系统 | 相当于空节点，回调不触发，需自行兼容 |
| 自定义路由 / 共享元素 | 无动效，跳转正常 |
| scroll-view 按需渲染 | 无此优化，正常全量渲染 |
| grid-view | 需自行兼容 |
| scroll-view 新增属性/事件 | 不支持，需要时按版本分支 |

需要按渲染器分支时，结合 U27 的工具做双实现：

```xml
<view class="panel panel--{{ renderer }}">
  <text wx:if="{{ renderer === 'skyline' }}">新交互模式</text>
  <text wx:else>WebView 模式</text>
</view>
```

```typescript
Page({
  data: { renderer: 'webview' as 'webview' | 'skyline' },

  onLoad() {
    this.setData({ renderer: this.renderer })
  },

  onInteraction() {
    if (this.renderer === 'skyline') {
      this.runWorkletAnimation()
    } else {
      // WebView 兜底：使用 setData/WXS 的常规实现
      this.runWebViewFallback()
    }
  },

  runWorkletAnimation() {},
  runWebViewFallback() {}
})
```

迁移页面的选择标准：优先关键路径、高频交互、手势密集的页面（如详情页半屏面板、横向卡片堆）；静态长文本页收益有限。

流畅度收益量化表（示例台账，数据需真机自测）：

| 指标 | WebView | Skyline + Worklet | 采集方式 |
|---|---|---|---|
| 拖拽跟手延迟 | 2~4 帧（约 33~66ms） | 0 帧（UI 线程闭环） | 真机高速录像 / Trace |
| 连续拖动平均帧率 | 48fps | 60fps | 帧率浮窗 |
| P95 帧时长 | 41ms | 19ms | Trace 统计 |
| 页面进入可交互 | 640ms | 410ms | 性能面板 |
| 多页面运行内存 | 305MB | 238MB | 内存曲线 |

常见误区：只演示高版本、不验证回退；收益只给帧率不给跟手延迟；把低端机上的 WebView 兜底实现写漏，低版本直接白屏或报错。

## 课后题

1. 请画出 Skyline 的线程组织，并与 WebView 模式逐点对比：渲染任务在哪、组件树在哪、页面间资源如何共享、JSBridge 是否还参与框架数据交换。
2. Skyline 下 `setData` 的成本发生了什么变化？为什么说“桥没了，但不代表可以乱用 setData”？
3. 在 app.json 中启用 Skyline 需要哪些关键配置？`lazyCodeLoading`、`componentFramework`、`rendererOptions` 各自解决什么问题？
4. `wx.getSkylineInfo`、`wx.canIUse`、`this.renderer` 三个查询分别回答什么问题？为什么只判断“平台支持”还不够？
5. 请解释 We 分析 AB 实验的放量机制，“流量 100% 不等于全量 Skyline”是什么意思？要真正全量应该怎样操作？
6. 使用 `disableABTest` 直配时，`sdkVersionBegin` / `sdkVersionEnd` 应如何填写？End 字段如果误填为当前版本，会有什么后果？
7. Skyline 的默认布局、盒模型、节点定位与 Web 有什么不同？为什么 Skyline 必须使用 scroll-view 做局部滚动？请给出“导航栏 + 滚动区”的结构骨架。
8. 什么是 Worklet？请说明 `'worklet'` 指令、`runOnUI`、`runOnJS` 的作用，以及“捕获变量会被序列化/冻结”这条限制对编码的具体影响。
9. 场景题：「逛吃指南」店铺详情页迁移 Skyline 后，真机测试发现：iOS 上正常，部分老 Android 机进入页面白屏；手势拖动在低版本完全无响应。请给出你的兼容设计（如何检测、如何回退、手势如何兜底），并说明上线前必须验证哪些组合。
10. 场景题：产品要求首页卡片支持“跟手侧滑 + 松手惯性消失”，并在跳转详情时让卡片封面图“飞到”详情页顶部。请分别说明应使用哪些 Skyline 能力（手势、动画、转场），这些能力在 WebView 下分别退化为什么，以及你会如何量化这次改造的收益。

## 实践练习题

### 练习 1：单页启用 Skyline 与回退演练

#### 任务

新建 `pages/skyline-demo/skyline-demo`，按页面粒度启用 Skyline，页面顶部显示当前实际渲染器（this.renderer）；随后通过切换调试基础库完成一次“高版本命中 Skyline、低版本回退 WebView”的对照验证。

参考代码：

```json
// skyline-demo.json
{
  "navigationStyle": "custom",
  "renderer": "skyline",
  "componentFramework": "glass-easel"
}
```

```typescript
Page({
  data: {
    renderer: 'webview' as 'webview' | 'skyline',
    skylineInfo: ''
  },

  onLoad() {
    this.setData({ renderer: this.renderer })

    wx.getSkylineInfo({
      success: (res) => {
        this.setData({ skylineInfo: res.isSupported + ' / ' + res.version })
      }
    })
  }
})
```

```xml
<view class="page">
  <text class="tag">实际渲染器：{{ renderer }}</text>
  <text class="tag">平台支持：{{ skylineInfo }}</text>
  <view class="box {{ renderer }}">
    <text>同一套内容，两种渲染引擎</text>
  </view>
</view>
```

#### 步骤约束

1. app.json 中必须已开启 `lazyCodeLoading: "requiredComponents"`；页面只在本页生效，不影响其他页面。
2. 工具中勾选 Skyline 调试，基础库分别用 3.0.0 以上与 2.x 各编译一次，截图记录 renderer 显示。
3. 低版本下页面必须正常显示，不得出现 Worklet/手势组件导致的报错（本页不使用 Worklet）。
4. 真机至少验证一台高版本设备。

#### 提交物

- 页面四件套；
- 高/低基础库两次渲染截图；
- 100 字以内结论：自动回退在什么条件下发生。

#### 验收标准

- 高版本显示 skyline、低版本显示 webview，页面内容一致；
- 不修改全局 renderer 即可让单页生效；
- 能说清 `this.renderer` 与平台支持的区别。

### 练习 2：Worklet 动画 + Pan 手势卡片

#### 任务

在 Skyline 页面实现一张可横向拖动的卡片：手指移动时 UI 线程跟手位移；松手时按阈值用 spring 回到原位或飞出；飞出结果通过 `runOnJS` 回传逻辑层并更新提示文案。需提供 WebView 兜底交互（如点击按钮完成同样的状态变化）。

参考代码：

```xml
<view class="stage">
  <pan-gesture-handler worklet:ongesture="handlePan">
    <view class="card">
      <text>拖动卡片</text>
    </view>
  </pan-gesture-handler>

  <button wx:if="{{ renderer === 'webview' }}" bindtap="webviewDismiss">
    WebView 兜底：移除卡片
  </button>
  <text class="result">{{ resultText }}</text>
</view>
```

```typescript
const { shared, spring, runOnJS } = wx.worklet

Page({
  data: {
    renderer: 'webview' as 'webview' | 'skyline',
    resultText: ''
  },

  onLoad() {
    this.setData({ renderer: this.renderer })
    const x = shared(0)
    this._x = x

    if (this.renderer === 'skyline') {
      this.applyAnimatedStyle('.card', () => {
        'worklet'
        return { transform: `translateX(${x.value}px)` }
      })
    }
  },

  handlePan(evt: { state: number; deltaX: number }) {
    'worklet'
    if (evt.state === 2) {
      this._x.value += evt.deltaX
    } else if (evt.state === 3 || evt.state === 4) {
      const current = this._x.value
      const dismiss = Math.abs(current) > 100
      this._x.value = spring(dismiss ? -360 : 0, { damping: 15, stiffness: 180 })
      if (dismiss) {
        runOnJS(this.updateResult.bind(this))('卡片已移除')
      }
    }
  },

  webviewDismiss() {
    this.updateResult('卡片已移除（WebView 兜底）')
  },

  updateResult(text: string) {
    this.setData({ resultText: text })
  }
})
```

#### 步骤约束

1. 拖动全过程逻辑层不得收到逐帧消息（在 handlePan 中只在结束时 runOnJS）。
2. spring 参数需让回弹在约 300ms 内完成，无明显震荡。
3. 必须验证 WebView 模式：手势组件为空节点，兜底按钮可完成相同状态变化且无报错。
4. 真机录屏验证跟手度，并记录一次帧率。

#### 提交物

- 页面四件套；
- 真机跟手录屏与帧率记录；
- WebView 兜底路径截图。

#### 验收标准

- 卡片零延迟跟手、松手按阈值正确回弹或飞出；
- 逻辑层只在结束时收到一次回传；
- WebView 下功能闭环、无控制台报错。

### 练习 3：灰度方案设计、预路由与收益对比

#### 任务

为一个即将迁移 Skyline 的核心页面编写上线方案文档并落地预加载：配置 `disableABTest + sdkVersionBegin/End`（或写明 AB 实验放量计划），在跳转前调用 `wx.preloadSkylineView`，并在 WebView 与 Skyline 两种模式下采集同路径帧率与进入耗时对比。

伪代码：

```text
上线方案：
  第一步 内部白名单/AB 1% 验证
  第二步 5%→20%→50%，对照性能与崩溃数据
  第三步 结束实验全量，或使用 disableABTest 按 sdkVersion 圈定
预路由：
  触发时机（卡片停留/点击）→ wx.preloadSkylineView → navigateTo
收益对比：
  同机型、同路径测进入耗时与帧率，各 3 次
```

参考代码：

```json
{
  "rendererOptions": {
    "skyline": {
      "disableABTest": true,
      "sdkVersionBegin": "3.0.2",
      "sdkVersionEnd": "15.255.255"
    }
  }
}
```

```typescript
function openDetail(id: number) {
  wx.preloadSkylineView({
    success() {
      wx.navigateTo({ url: '/packageDetail/pages/detail/detail?id=' + id })
    },
    fail() {
      // 预加载失败不影响正常跳转
      wx.navigateTo({ url: '/packageDetail/pages/detail/detail?id=' + id })
    }
  })
}
```

#### 步骤约束

1. 方案必须写清两种灰度路径的选择理由，AB 路径要包含“100%≠全量”的处理说明。
2. preloadSkylineView 的失败分支必须仍能正常跳转。
3. 性能对比在同一台真机、相同操作路径下完成，分别记录 WebView 与 Skyline 数据各 3 次。
4. 必须记录至少一项“跟手延迟/帧率”和一项“进入耗时”。

#### 提交物

- 灰度上线方案文档；
- 灰度配置 JSON 与预路由代码；
- WebView/Skyline 对比数据表。

#### 验收标准

- 灰度路径与版本字段填写正确，End 值不会阻断未来版本；
- 预加载失败可降级跳转；
- 收益数据来自真机同路径对比。

## 阶段验收作业

本作业是 W14 里程碑的高级渲染证据点：为「逛吃指南」选择一个核心页面完成 Skyline 迁移，要求体验有真机数据证明的提升，且低版本回退路径完整可用。

### 任务描述

1. 选定一个核心页面（建议店铺详情半屏面板或首页横向卡片堆等高频交互页），先说明选择理由（关键路径、交互频率、预期收益）。
2. 完成迁移适配：自定义导航栏、scroll-view 局部滚动结构、WXSS Reset 与不支持项排查（文本/省略/z-index/选择器等逐项检查），长列表按直接子节点粒度组织并启用按需渲染。
3. 至少实现一个 Worklet 手势动画（跟手 + timing/spring/decay 物理反馈），并提供 WebView 兜底实现；可选用 open-container 或共享元素完善转场。
4. 设计上线灰度：写明 AB 放量计划或 `disableABTest + sdkVersion` 配置；在跳转链路接入 `wx.preloadSkylineView`。
5. 产出迁移报告：高低版本命中情况、WebView/Skyline 帧率与跟手延迟对比、回退验证结果、机型与基础库版本。

### 完成标准

- 页面在高版本真机确认命中 Skyline，交互跑在 UI 线程，跟手无跨线程延迟；
- 在不支持 Skyline 的环境下自动回退 WebView，布局与功能完整、无报错；
- Worklet 动画与 WebView 兜底两条路径都实际走通并可演示；
- 灰度配置字段正确，预加载失败可降级；
- 流畅度收益有同路径真机数据（帧率、跟手延迟或进入耗时）支撑。

### 评分要点（100 分）

| 维度 | 分值 | 要点 |
|---|---:|---|
| 架构理解 | 15 | 线程模型、与 WebView 差异、setData/WXS 位置变化讲得清 |
| 迁移适配质量 | 20 | 导航栏/局部滚动/样式不支持项排查到位，布局无错位 |
| 长列表与滚动 | 10 | scroll-view/list-view 结构满足按需渲染约束 |
| Worklet 动画 | 20 | 共享值 + applyAnimatedStyle 使用正确，物理反馈自然 |
| 手势系统 | 15 | 手势组件、状态机处理正确，协商/代理使用合理 |
| 灰度与回退 | 10 | 灰度方案可执行，回退路径实测有效，预路由正确 |
| 量化证据 | 10 | 帧率/跟手延迟对比来自真机同路径采集 |

### 强制不通过条件

- Worklet 或手势在 Skyline 下不生效、动画仍走 JS 线程 setData 跟手；
- 低版本/未覆盖平台回退失败（白屏、报错、功能不可用），或未提供 WebView 兜底；
- 灰度配置字段错误（如 sdkVersionEnd 阻断未来版本）且未发现；
- 流畅度收益没有真机数据，或只验证了模拟器；
- scroll-view 结构不满足直接子节点约束却声称完成按需渲染；
- 无法解释 Skyline 架构、共享值机制或手势状态机。

完成本作业后，W14「性能与增长」里程碑闭环：主包体积、启动与帧率量化达标，分享裂变可追踪，核心页面完成 Skyline 改造且可回退。下一阶段进入 U29 起的工程化与结业内容，把性能与渲染能力纳入可发布、可运维、可自动化验证的完整交付体系。
