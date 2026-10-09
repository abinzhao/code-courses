# 06-WXS渲染层脚本

## 目标

完成本知识单元后，学员应能理解 WXS 在双线程架构中的定位：它是运行在**渲染层**的脚本，让模板在不跨线程通信的情况下拥有计算与高频交互响应能力。学员应能够：

1. 说清 WXS 是什么、运行在哪一层，以及它与逻辑层 JS/TS 的隔离关系。
2. 解释“为什么需要 WXS”：Mustache 不能调用 Page 方法，而每次格式化都走 `setData` 会产生跨线程通信成本。
3. 使用内联 `<wxs module="...">` 在 WXML 中直接编写渲染层脚本，并在 `{{ }}` 中调用其导出函数。
4. 使用外链 `.wxs` 文件配合 `<wxs src module>` 组织可跨页面复用的渲染层脚本。
5. 掌握 WXS 的模块机制：`module.exports` 导出、`require` 引入其他 `.wxs` 文件，理解模块作用域隔离。
6. 说出 WXS 的 ES 语法限制：以 ES5 语法为准，不使用 `let/const`、箭头函数、模板字符串、解构、Promise、class 等 ES6+ 特性；日期与正则使用 `getDate()`、`getRegExp()`。
7. 使用 WXS 为「逛吃指南」实现发布时间（刚刚/分钟前/昨天/日期）、价格（分转元、去尾零、千分位）、距离（m/km）、文本截断等格式化。
8. 使用 WXS 响应事件（`bindtouchstart="{{m.fn}}"`、`change:prop="{{m.observer}}"`）在渲染层处理拖拽等高频交互，并通过 `setStyle`/`setState` 直接更新、`callMethod` 按需回到逻辑层。
9. 在“逻辑层处理 vs WXS 处理”之间做出工程取舍：业务规则与数据归一化放逻辑层，纯展示格式化与高频手势放 WXS。
10. 识别 WXS 常见误区：误用 ES6 语法、试图调用 `wx.*` API、把 WXS 当安全边界、忽略其仅在依赖数据变化时重算。

本单元承接 U05 WXML 模板语法；自定义组件（U07/U08）中同样可以使用 WXS；列表滚动性能与手势体系在 U18、U27、U28 继续深入。

## 技术栈

| 工具或 API | 用途 | 学习要求 |
|---|---|---|
| WXS 语言 | 渲染层脚本 | 理解定位、语法与限制 |
| `<wxs module="m">`（内联） | 在 WXML 中写脚本 | 会定义并在模板中调用 |
| `<wxs src="x.wxs" module="m">`（外链） | 引入外部脚本文件 | 会用相对路径组织复用 |
| `module.exports` | 导出模块成员 | 能导出函数集合 |
| `require('./x.wxs')` | 模块间依赖 | 会在 wxs 间引用 |
| WXS 数据类型 | number/string/boolean/object/array/function/null/undefined | 知道无 DOM/BOM 对象 |
| `getDate()` / `getRegExp()` | 日期、正则构造 | 不能直接 `new Date`，用专有构造器 |
| `JSON` / `Math` / `parseInt` 等 | 内置对象与函数 | 会用于格式化计算 |
| `bindxxx="{{m.fn}}"` | 渲染层响应事件 | 会处理 touch 类高频事件 |
| `change:prop="{{m.observer}}"` | 属性变化观察 | 会监听渲染层 prop 变更 |
| `ownerInstance.setStyle/setState/getState` | 渲染层直接更新 | 理解不跨线程 |
| `ownerInstance.callMethod` | 回逻辑层调用 Page 方法 | 按需触发、低频回传 |
| `ownerInstance.triggerEvent/getBoundingClientRect` | 组件事件与布局查询 | 知道用途与使用方式 |
| 开发者工具 Console / WXML 面板 | 调试 WXS | 用日志与节点树验证 |

实验约定：

- WXS 代码一律使用 `var` 与 `function`，写完先自查是否混入 ES6 语法。
- 所有示例基于「逛吃指南」真实字段：时间戳（毫秒）、价格（分）、距离（米）、标题/正文文本。
- 仍然禁止 `div`/`span` 等 HTML 标签；WXS 不操作 DOM，只做计算与渲染层实例操作。

## 详细的理论知识讲解和示例伪代码

### 1. 为什么需要 WXS：从“模板不能调函数”说起

U05 讲过：Mustache 支持运算，但**不能调用 Page 上的方法**。于是面对“把以分为单位的价格显示成 ¥38.00”“把时间戳显示成 2 小时前”这类需求，常见两种朴素做法：

做法一：逻辑层提前算好，塞进 `data`：

```typescript
this.setData({
  note: {
    avgPriceCents: 3800,
    avgPriceText: '¥38.00',
    publishedAt: 1759900000000,
    publishedAtText: '2 小时前'
  }
})
```

做法二：模板里堆三元表达式硬算。

两者都有代价：做法一让同一份业务数据携带大量“展示专用字段”，源数据一变就要重新计算并 `setData`，这些更新要从逻辑层跨线程发到渲染层；做法二让 WXML 迅速变得不可维护。

WXS 给出第三条路：**把脚本放到渲染层执行**。

```xml
<wxs src="../../wxs/format.wxs" module="fmt" />

<text class="price">{{ fmt.formatPrice(note.avgPriceCents) }}</text>
<text class="time">{{ fmt.formatPublishTime(note.publishedAt) }}</text>
```

模板在渲染时直接在渲染层调用 `fmt` 里的函数，无需逻辑层预先准备 `avgPriceText`，也无需为展示字段发起跨线程数据传输。这就是 WXS 存在的核心理由。

### 2. WXS 的运行环境定位

WXS（WeiXin Script）是小程序设计的一套**运行在渲染层**的脚本语言。结合 U02 的双线程模型：

```text
逻辑层（JsCore / V8 级别环境，无 window/document）
  Page 的 TS/JS、setData、wx.* API、网络请求
        │  Native 桥（序列化数据，异步）
        ▼
渲染层（WebView；进阶可选 Skyline）
  WXML/WXSS 渲染 ＋ WXS 执行
```

关键定位：

- WXS 与页面 JS/TS **不在同一个线程**，互相不能直接访问对方变量；
- WXS 的执行结果直接参与当前模板渲染；纯函数格式化不产生跨线程通信；
- WXS 不依赖小程序基础库版本，低版本客户端也能运行（语法由框架编译保障）；
- WXS 中**没有** `window`、`document`、`navigator` 等 BOM/DOM 对象，也不能调用 `wx.*` API；
- WXS 拿到的数据仅限于模板中传入的数据，无法读取逻辑层 `globalData`。

**常见误区**：以为 WXS 是“另一个 JS 文件”，在里面写 `wx.request`、`console.log(window.innerWidth)`——这些在渲染层都不存在。

### 3. 内联 WXS：<wxs module>

最简单的使用方式是把脚本直接写在 WXML 的 `<wxs>` 标签内，并用 `module` 指定模块名，模板通过“模块名.函数名”调用。

```xml
<!-- pages/note-detail/note-detail.wxml -->
<wxs module="fmt">
  function formatPrice(cents) {
    if (cents === null || cents === undefined) {
      return ''
    }
    var yuan = cents / 100
    return '¥' + yuan.toFixed(2)
  }

  module.exports = {
    formatPrice: formatPrice
  }
</wxs>

<view class="coupon-row">
  <text class="coupon-row__price">{{ fmt.formatPrice(note.avgPriceCents) }}</text>
  <text class="coupon-row__coupon">券后 {{ fmt.formatPrice(note.couponPriceCents) }}</text>
</view>
```

要点：

- `module` 属性必填，且值必须是合法标识符（如 `fmt`、`format`），同一页面内模块名不能重复；
- 必须通过 `module.exports` 暴露的成员才能在模板中访问；
- 内联脚本可以直接读取 WXML 中绑定的数据（如 `note.avgPriceCents`），但它本身在独立的模块作用域中运行。

内联适合**短小、单页专用**的逻辑；一旦函数较多或要在多个页面复用，应使用外链 `.wxs` 文件。

### 4. 外链 WXS：.wxs 文件与 src 引入

#### 4.1 创建 wxs 文件

```javascript
// wxs/format.wxs
function formatPrice(cents) {
  if (cents === null || cents === undefined) {
    return ''
  }
  return '¥' + (cents / 100).toFixed(2)
}

function formatDistance(meters) {
  if (meters === null || meters === undefined) {
    return ''
  }
  if (meters < 1000) {
    return Math.round(meters) + 'm'
  }
  return (meters / 1000).toFixed(1) + 'km'
}

module.exports = {
  formatPrice: formatPrice,
  formatDistance: formatDistance
}
```

#### 4.2 在 WXML 中引入

```xml
<!-- pages/notes/notes.wxml -->
<wxs src="../../wxs/format.wxs" module="fmt" />

<view class="note-list">
  <view class="note-card" wx:for="{{ notes }}" wx:key="id">
    <image class="note-card__cover" src="{{ item.coverUrl }}" mode="aspectFill" />
    <text class="note-card__title">{{ item.title }}</text>
    <text class="note-card__meta">
      {{ fmt.formatDistance(item.distanceMeters) }} ·
      人均 {{ fmt.formatPrice(item.avgPriceCents) }}
    </text>
  </view>
</view>
```

规则：

- 外链写法中 `src` 与 `module` 都是必填；
- `src` 使用**相对路径**指向项目内的 `.wxs` 文件；
- 同一份 `format.wxs` 可以在任意多个页面引入，这是 WXS 复用的主要方式。

**常见误区**：把 `.wxs` 后缀写成 `.js`；用绝对路径或 npm 包路径；在 TS 文件里 `import` 一个 wxs 期望当普通模块用——wxs 由渲染层编译，不能在逻辑层直接引用。

### 5. module.exports 与 require：模块机制

每个 wxs 文件（以及每个内联 `<wxs>`）都是一个**独立模块**，有自己的作用域，外部默认什么都看不见。通过 `module.exports` 暴露成员，通过 `require` 引入其他 wxs。

```javascript
// wxs/price.wxs
function toYuan(cents) {
  return cents / 100
}

function formatPrice(cents) {
  return '¥' + toYuan(cents).toFixed(2)
}

module.exports = {
  toYuan: toYuan,
  formatPrice: formatPrice
}
```

```javascript
// wxs/format.wxs
var price = require('./price.wxs')

function formatCoupon(coupon) {
  var text = price.formatPrice(coupon.amountCents)
  if (coupon.thresholdCents > 0) {
    text = text + '（满 ' + price.toYuan(coupon.thresholdCents) + ' 元可用）'
  }
  return text
}

module.exports = {
  formatPrice: price.formatPrice,
  formatCoupon: formatCoupon
}
```

要点：

- `require` 的路径必须是相对路径且带 `.wxs` 后缀；
- 被引用模块同样通过 `module.exports` 暴露接口；
- 模块之间是单向依赖，注意不要循环 require；
- 模块内可以定义“私有”变量与函数，未导出的内容外部不可见，适合放中间计算。

模板里仍然只接触最终引入的那个模块名：

```xml
<wxs src="../../wxs/format.wxs" module="fmt" />
<text>{{ fmt.formatCoupon(note.coupon) }}</text>
```

### 6. WXS 的 ES 语法限制

这是 WXS 与普通 JS/TS 最大的书写差异：**WXS 语法以 ES5 为准**，框架按自己的规则编译执行，许多 ES6+ 语法不能使用。

#### 6.1 支持的写法

```javascript
var count = 0                    // 使用 var 声明
var name = '逛吃'
var list = [1, 2, 3]
var map = { city: '上海', area: '静安' }

function add(a, b) {             // function 声明
  return a + b
}

var pick = function (list) {     // 函数表达式
  return list[0]
}

for (var i = 0; i < list.length; i++) {
  count = count + list[i]
}

if (count > 3) {
  // ...
} else {
  // ...
}
```

#### 6.2 禁用/不支持的特性

| 特性 | 错误示例 | 正确替代 |
|---|---|---|
| `let` / `const` | `const x = 1` | `var x = 1` |
| 箭头函数 | `var f = (x) => x + 1` | `var f = function (x) { return x + 1 }` |
| 模板字符串 | `` `¥${x}` `` | `'¥' + x` |
| 解构赋值 | `var { a } = obj` | `var a = obj.a` |
| 默认/展开/rest 参数 | `function f(a = 1) {}`、`...args` | 函数体内手动判断 |
| 对象简写/计算属性 | `{ fn }`、`{ [k]: 1 }` | `{ fn: fn }` |
| class | `class A {}` | 构造函数 + 原型写法或普通对象 |
| Promise / 异步函数 | `new Promise(...)`、`async/await` | WXS 中不做异步 IO |
| Map/Set/Symbol | `new Map()` | 用普通对象与数组 |
| for...of | `for (var x of arr)` | 普通 for 循环 |
| `Object.assign` | `Object.assign(a, b)` | 手动逐字段复制 |

#### 6.3 日期与正则：getDate / getRegExp

WXS 提供了专有构造方式，不要直接写 `new Date()`、正则字面量也不推荐：

```javascript
var now = getDate()                       // 当前日期对象
var target = getDate(1759900000000)       // 指定时间戳
var year = target.getFullYear()
var month = target.getMonth() + 1

var reg = getRegExp('^\\d+$', 'i')         // 正则对象，参数：表达式文本、标志
if (reg.test('123')) {
  // ...
}
```

可用的全局对象还包括 `Math`、`JSON`，以及 `parseInt`、`parseFloat`、`isNaN` 等常用函数；数组的 `slice`、`join`、`indexOf`、`forEach` 等 ES5 方法可以使用，但为了最大兼容性，关键路径示例统一用普通 for 循环书写。

**常见误区**：从 TS 文件复制代码进 wxs 不改语法；用 `new Date()` 得到预期日期；使用正则字面量导致编译报错。

### 7. WXS 数据类型与运算符

WXS 支持的数据类型：`number`、`string`、`boolean`、`object`、`array`、`function`、`null`、`undefined`。类型判断用 `typeof` 与手动判空：

```javascript
function isEmpty(value) {
  if (value === null || value === undefined) {
    return true
  }
  if (typeof value === 'string') {
    return value.length === 0
  }
  if (Array.isArray(value)) {
    return value.length === 0
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0
  }
  return false
}
```

注意：`Array.isArray` 属于 ES5，可使用；`Object.keys` 同样属于 ES5。

运算时注意数值精度与类型：

```javascript
function safeDivide(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number' || b === 0) {
    return 0
  }
  return a / b
}
```

**常见误区**：把逻辑层传来的字符串数字直接做乘法（如 `'3800' * 1`），虽然部分场景能隐式转换，但应显式 `Number(value)` 或 `parseInt(value, 10)`，避免格式化结果出现 `NaN`。

### 8. WXS 响应事件：让事件在渲染层被响应

WXS 最有价值的进阶能力是**响应事件**：把组件事件直接绑定到 WXS 函数，事件在渲染层被处理，不再“渲染层 → 逻辑层 → 渲染层”绕一圈。这对拖拽、跟手移动、高频滚动等场景至关重要——每一帧都跨线程一次，手势就会明显滞后。

绑定语法是把事件属性的值写成 Mustache 形式的模块函数：

```xml
<wxs module="drag" src="../../wxs/drag.wxs" />

<view
  class="ball"
  bindtouchstart="{{ drag.onTouchStart }}"
  bindtouchmove="{{ drag.onTouchMove }}"
  bindtouchend="{{ drag.onTouchEnd }}"
>
  拖我探店
</view>
```

对应的 wxs：

```javascript
// wxs/drag.wxs
var startX = 0
var startY = 0

function onTouchStart(event, ownerInstance) {
  var touch = event.touches[0]
  startX = touch.clientX
  startY = touch.clientY
  // 记录渲染层内部状态，不经过逻辑层
  ownerInstance.setState({ dragging: true })
}

function onTouchMove(event, ownerInstance) {
  var touch = event.touches[0]
  var dx = touch.clientX - startX
  var dy = touch.clientY - startY
  // 直接在渲染层改样式，跟手无跨线程延迟
  ownerInstance.setStyle({
    transform: 'translate(' + dx + 'px, ' + dy + 'px)'
  })
}

function onTouchEnd(event, ownerInstance) {
  ownerInstance.setState({ dragging: false })
  // 只有交互结束、需要持久化时，才回逻辑层一次
  ownerInstance.callMethod('onDragEnd', { x: startX, y: startY })
}

module.exports = {
  onTouchStart: onTouchStart,
  onTouchMove: onTouchMove,
  onTouchEnd: onTouchEnd
}
```

逻辑层只接收最终结果：

```typescript
Page({
  onDragEnd(payload: { x: number; y: number }) {
    // 保存最终位置到数据/云端，例如记录卡片排序
    console.log('拖拽结束', payload)
  }
})
```

事件处理函数接收两个参数：

- `event`：与页面事件结构相似，含 `touches`、`changedTouches`、`timeStamp` 等；
- `ownerInstance`：绑定该事件的组件在渲染层的实例描述对象。

**常见误区**：在 `onTouchMove` 里 `callMethod` 让逻辑层 setData 跟手——等于退回跨线程老路，高频事件必然卡顿。渲染层能闭环的就在渲染层闭环。

### 9. change:prop 属性观察与渲染层实例方法

#### 9.1 change:prop 观察器

当组件上某个属性（prop）发生变化时，可以在渲染层直接收到通知，语法为 `change:属性名="{{模块.函数}}"`：

```xml
<wxs module="mapCard" src="../../wxs/map-card.wxs" />

<view
  class="map-card"
  latitude="{{ latitude }}"
  change:latitude="{{ mapCard.onLatitudeChange }}"
  longitude="{{ longitude }}"
  change:longitude="{{ mapCard.onLongitudeChange }}"
>
  当前位置：{{ latitude }}, {{ longitude }}
</view>
```

```javascript
// wxs/map-card.wxs
function onLatitudeChange(newVal, oldVal, ownerInstance) {
  ownerInstance.setState({ latitude: newVal })
  // 渲染层即时反馈，例如更新指示点样式
  ownerInstance.setStyle({ '--lat': String(newVal) })
}

function onLongitudeChange(newVal, oldVal, ownerInstance) {
  ownerInstance.setState({ longitude: newVal })
}

module.exports = {
  onLatitudeChange: onLatitudeChange,
  onLongitudeChange: onLongitudeChange
}
```

观察器参数依次为：新值、旧值、组件实例。它适合“数据频繁变化、但只需要渲染层局部反馈”的场景。

#### 9.2 ownerInstance 常用方法

| 方法 | 作用 | 是否跨线程 |
|---|---|---|
| `setStyle(obj)` | 直接设置组件样式 | 否，渲染层内完成 |
| `setState(obj)` | 在渲染层保存组件状态 | 否 |
| `getState(obj, cb)` | 读取此前保存的渲染层状态 | 否 |
| `setClass(cls)` | 切换组件 class | 否 |
| `getDataset()` | 读取 `data-*` | 否 |
| `getBoundingClientRect(cb)` | 查询布局信息 | 渲染层查询 |
| `selectComponent(selector)` | 选择子组件实例 | 否 |
| `callMethod(name, args)` | 调用逻辑层 Page 方法 | 是，按需低频使用 |
| `triggerEvent(name, detail)` | 触发自定义组件事件 | 视组件边界 |

经验法则：**能渲染层闭环就不 callMethod；需要业务落库、需要其他全局数据时才 callMethod**。这与“高频交互不走 setData”的性能原则完全一致。

### 10. 格式化场景一：发布时间

“刚刚 / x 分钟前 / x 小时前 / 昨天 / 具体日期”是信息流最常见的时间格式。

```javascript
// wxs/time.wxs
var MINUTE = 60 * 1000
var HOUR = 60 * MINUTE
var DAY = 24 * HOUR

function pad(n) {
  return n < 10 ? '0' + n : '' + n
}

function formatPublishTime(timestamp) {
  if (!timestamp) {
    return ''
  }
  var now = getDate().getTime()
  var diff = now - timestamp
  if (diff < 0) {
    diff = 0
  }
  if (diff < MINUTE) {
    return '刚刚'
  }
  if (diff < HOUR) {
    return Math.floor(diff / MINUTE) + ' 分钟前'
  }
  if (diff < DAY) {
    return Math.floor(diff / HOUR) + ' 小时前'
  }
  if (diff < 2 * DAY) {
    return '昨天'
  }
  if (diff < 7 * DAY) {
    return Math.floor(diff / DAY) + ' 天前'
  }
  var d = getDate(timestamp)
  var text = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  if (d.getFullYear() === getDate().getFullYear()) {
    // 今年内的只显示月日，更简洁
    text = pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  }
  return text
}

module.exports = {
  formatPublishTime: formatPublishTime
}
```

在卡片中使用：

```xml
<wxs src="../../wxs/time.wxs" module="timeFmt" />
<text class="note-card__time">{{ timeFmt.formatPublishTime(item.publishedAt) }}</text>
```

**注意（重算时机）**：WXS 函数只在其引用的数据变化、模板重新渲染时才重算。页面长时间停留时，“2 分钟前”不会自己变成“3 分钟前”。若要滚动时刻更新，可由逻辑层定时 `setData` 一个轻量时间戳作为依赖，或接受“进入页面时计算一次”的产品约定——这是用 WXS 做相对时间必须知道的限制。

### 11. 格式化场景二：价格

价格以“分”存储是工程惯例（避免浮点误差），展示时再换算。

```javascript
// wxs/price.wxs
function formatPrice(cents) {
  if (cents === null || cents === undefined) {
    return ''
  }
  return '¥' + (cents / 100).toFixed(2)
}

// 去掉无意义的 .00，如 ¥38 而不是 ¥38.00
function formatPriceTrim(cents) {
  if (cents === null || cents === undefined) {
    return ''
  }
  var text = (cents / 100).toFixed(2)
  if (text.slice(text.length - 3) === '.00') {
    text = text.slice(0, text.length - 3)
  }
  return '¥' + text
}

// 千分位，用于客单价较高的场景，如 ¥1,280.00
function thousands(text) {
  var parts = text.split('.')
  var intPart = parts[0]
  var sign = ''
  if (intPart.charAt(0) === '-') {
    sign = '-'
    intPart = intPart.slice(1)
  }
  var result = ''
  var count = 0
  for (var i = intPart.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) {
      result = ',' + result
    }
    result = intPart.charAt(i) + result
    count++
  }
  return sign + result + (parts.length > 1 ? '.' + parts[1] : '')
}

function formatPriceThousands(cents) {
  if (cents === null || cents === undefined) {
    return ''
  }
  return '¥' + thousands((cents / 100).toFixed(2))
}

module.exports = {
  formatPrice: formatPrice,
  formatPriceTrim: formatPriceTrim,
  formatPriceThousands: formatPriceThousands
}
```

使用：

```xml
<wxs src="../../wxs/price.wxs" module="priceFmt" />
<text class="price">{{ priceFmt.formatPrice(note.avgPriceCents) }}</text>
<text class="price price--big">{{ priceFmt.formatPriceThousands(activity.budgetCents) }}</text>
```

**常见误区**：在逻辑层用元为单位做浮点运算（`38.5 - 10.2` 产生精度误差）再传给 WXS。正确做法是金额一律以整数分存储与计算，WXS 只负责最后展示换算。

### 12. 格式化场景三：距离与文本截断

#### 12.1 距离

```javascript
function formatDistance(meters) {
  if (meters === null || meters === undefined) {
    return ''
  }
  if (meters < 1000) {
    return Math.round(meters) + 'm'
  }
  if (meters < 10000) {
    return (meters / 1000).toFixed(1) + 'km'
  }
  return Math.round(meters / 1000) + 'km'
}
```

#### 12.2 文本截断

```javascript
function truncate(text, len) {
  if (!text) {
    return ''
  }
  if (text.length <= len) {
    return text
  }
  return text.slice(0, len) + '…'
}

// 按最大行数估算截断（简单按每行字符数估算，精确两行省略仍优先用 WXSS）
function truncateByLines(text, perLine, lines) {
  var max = perLine * lines
  return truncate(text, max)
}

// 截断并去除首尾空白
function truncateTrim(text, len) {
  if (!text) {
    return ''
  }
  text = text.replace(/^\s+|\s+$/g, '')
  return truncate(text, len)
}
```

注意上面的正则在真实 wxs 文件中应使用 `getRegExp('^\\s+|\\s+$', 'g')`：

```javascript
function trim(text) {
  return text.replace(getRegExp('^\\s+|\\s+$', 'g'), '')
}
```

#### 12.3 组合使用

```xml
<wxs src="../../wxs/format.wxs" module="fmt" />

<view class="note-card" wx:for="{{ notes }}" wx:key="id">
  <text class="note-card__title">{{ fmt.truncate(item.title, 20) }}</text>
  <text class="note-card__summary">{{ fmt.truncate(item.summary, 48) }}</text>
  <text class="note-card__dist">距你 {{ fmt.formatDistance(item.distanceMeters) }}</text>
</view>
```

**常见误区**：用 WXS 实现精确的“两行省略”——跨机型字号宽度不同，字符数估算并不精确；常规两行省略优先用 WXSS（`-webkit-line-clamp` 或 Skyline 的行数控制），WXS 截断用于“硬性字符上限”场景。

### 13. WXS 与逻辑层处理的对比取舍

| 对比项 | 逻辑层处理（TS + setData） | WXS 处理（渲染层） |
|---|---|---|
| 语言能力 | 完整 ES/TS，npm 生态 | ES5 子集，无类型检查 |
| 可用 API | `wx.*`、网络请求、存储 | 仅传入数据与有限内置对象 |
| 更新成本 | 数据跨线程传输，异步 | 纯计算不跨线程 |
| 复用方式 | TS 模块/服务 | 外链 .wxs，多页直接引入 |
| 可测试性 | 可单测、可类型推导 | 难单测，靠真机/工具验证 |
| 适用内容 | 业务规则、权限、数据归一化、复杂计算 | 展示格式化、高频手势、渲染层联动 |

决策建议：

1. **取数与整形在逻辑层**：云数据库/接口返回的原始数据先在逻辑层归一（字段映射、分单位价格、时间戳），这与 U05 的 `toNoteCard` 一致。
2. **展示格式在 WXS**：同一分单位价格，列表要 `¥38`、详情要 `¥38.00`、票据要 `¥38.00（千分位）`——同一源数据用不同 WXS 函数呈现，不必为每个场景冗余 setData。
3. **高频交互渲染层闭环**：touchmove、scroll 类操作用 WXS 事件 + setStyle/setState；最终状态用一次 callMethod 回传落库。
4. **需要 wx API 或全局信息时回逻辑层**：WXS 无法发请求、无法读登录态，遇到这些只能 callMethod。

### 14. WXS 常见误区、调试与安全边界

#### 14.1 调试手段

- 在 wxs 中使用 `console.log` 输出中间值，日志出现在开发者工具的 Console 面板（注意它来自渲染层）；
- 用 AppData 面板确认传入数据，用 WXML 面板确认最终结构；
- 拖拽类问题真机必测：模拟器鼠标与真机触摸的事件频率差异很大。

#### 14.2 典型错误清单

| 错误 | 现象 | 处理 |
|---|---|---|
| 混入 let/箭头函数/模板字符串 | 编译报错或函数不执行 | 改回 ES5 写法 |
| `new Date()` | 日期不可用 | `getDate()` / `getDate(ts)` |
| 在 wxs 调 `wx.request` | API 不存在 | callMethod 回逻辑层请求 |
| 高频 move 中 callMethod | 跟手卡顿 | setStyle 渲染层闭环 |
| 期望相对时间自动刷新 | 停留后文案过期 | 接受约定或加时间依赖 |
| 模块名不合法/重复 | 引入失败 | 使用唯一合法标识符 |
| 用 TS 给 wxs 写类型 | 文件不被识别 | .wxs 保持纯脚本 |

#### 14.3 安全边界仍然有效

WXS 运行在渲染层，不等于“数据更安全”。传入模板的数据（包括 WXS 处理的原始值）用户都可在工具中看到，因此：

- 密钥、支付签名私钥、服务端凭证**绝不能放进前端**（WXML/JS/WXS/JSON 任何位置都不行）；
- 价格、库存等最终判定必须在后端/云函数完成，前端格式化只负责显示，用户看到的 `¥38` 不能作为扣款依据；
- WXS 可以把原始分值换算成文本，但“这张券能不能领”的结论必须来自服务端。

### 15. 「逛吃指南」综合示例：卡片格式化 + 地图卡片手势

#### 15.1 列表页：一套数据，多种格式

```xml
<!-- pages/notes/notes.wxml -->
<wxs src="../../wxs/format.wxs" module="fmt" />

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
      <text class="note-card__title">{{ fmt.truncate(item.title, 20) }}</text>
      <text class="note-card__shop">{{ item.shopName }} · {{ item.district }}</text>
      <view class="note-card__tags">
        <text class="tag" wx:for="{{ item.tags }}" wx:for-item="tag" wx:key="*this">{{ tag }}</text>
      </view>
      <view class="note-card__footer">
        <text class="note-card__dist">距你 {{ fmt.formatDistance(item.distanceMeters) }}</text>
        <text class="note-card__price">人均 {{ fmt.formatPriceTrim(item.avgPriceCents) }}</text>
        <text class="note-card__time">{{ fmt.formatPublishTime(item.publishedAt) }}</text>
      </view>
    </view>
  </view>

  <view wx:if="{{ notes.length === 0 }}" class="empty">
    <text>附近暂无笔记</text>
  </view>
</view>
```

#### 15.2 详情页优惠券：WXS 拼接券文案

```xml
<wxs src="../../wxs/format.wxs" module="fmt" />

<view class="coupon-bar" wx:if="{{ note.coupon }}">
  <view class="coupon-bar__info">
    <text class="coupon-bar__amount">{{ fmt.formatPriceTrim(note.coupon.amountCents) }}</text>
    <text class="coupon-bar__desc">{{ fmt.formatCoupon(note.coupon) }}</text>
  </view>
  <button
    class="coupon-bar__btn"
    disabled="{{ note.coupon.received || note.coupon.soldOut }}"
    bindtap="onReceiveCoupon"
  >
    {{ note.coupon.soldOut ? '已抢光' : (note.coupon.received ? '已领取' : '立即领取') }}
  </button>
</view>
```

#### 15.3 门店卡片：渲染层拖拽，结束时回传

```xml
<!-- pages/shop-detail/shop-detail.wxml -->
<wxs module="drag" src="../../wxs/drag.wxs" />

<view class="sheet">
  <view
    class="sheet__handle"
    bindtouchstart="{{ drag.onTouchStart }}"
    bindtouchmove="{{ drag.onTouchMove }}"
    bindtouchend="{{ drag.onTouchEnd }}"
  >
    <view class="sheet__bar"></view>
    <text class="sheet__title">{{ shop.name }}</text>
  </view>
  <view class="sheet__content">
    <text>{{ shop.address }}</text>
  </view>
</view>
```

```typescript
// pages/shop-detail/shop-detail.ts
Page({
  data: {
    shop: { name: '巷子里的小面馆', address: '静安区某弄 12 号' }
  },
  onDragEnd(payload: { x: number; y: number }) {
    // 只在手势结束时接收一次：记录面板最终展开高度/停留位置
    console.log('面板停留位置', payload)
  }
})
```

这个综合例子完整覆盖了：外链 wxs 复用、价格/时间/距离/截断四类格式化、WXS 响应事件渲染层闭环、callMethod 低频回逻辑层，以及“前端只展示、判定在后端”的安全约束。

学完本单元，学员应能在不看文档的情况下：判断一段计算应放逻辑层还是 WXS；独立编写符合 ES5 限制的 wxs 模块；并用 WXS 事件实现跟手交互。下一阶段进入自定义组件（U07/U08），WXS 仍会作为组件内部的渲染层工具继续使用。

## 课后题

1. 请从双线程模型出发，说明 WXS 运行在哪一层、与逻辑层脚本是什么关系，为什么说“纯格式化 WXS 不产生跨线程通信”？
2. 内联 `<wxs module>` 与外链 `<wxs src module>` 在语法和适用场景上有什么不同？请各写一个最小示例。
3. WXS 模块如何导出与引入？请写出：在 `price.wxs` 中导出函数、在 `format.wxs` 中 require 并再次导出的代码骨架。
4. 请列出至少 6 种 WXS 不支持的 ES6+ 特性，并给出对应的 ES5 写法。
5. 为什么 WXS 中要使用 `getDate()` 和 `getRegExp()` 而不是 `new Date()` 与正则字面量？请写出获取“当前时间”和“匹配数字开头”正则对象的代码。
6. WXS 响应事件的绑定语法长什么样？请说明事件处理函数接收到的两个参数分别是什么。
7. 拖拽跟手场景中，为什么不应在 `touchmove` 里 `callMethod` 让逻辑层 setData？`setStyle` 与 `callMethod` 各自应在什么时机使用？
8. 用 WXS 做“x 分钟前”相对时间有什么固有限制？如果产品要求页面停留时文案持续刷新，你会如何设计？
9. 场景分析题：支付页把“金额计算规则”写在 WXS 里，用户改了本地数据包里的分值后看到应付价变成了 ¥0.01，并据此完成了支付相关请求。请指出该设计的安全问题与正确架构（提示：格式化与判定分离）。
10. 场景分析题：探店列表在低端机上快速滑动时，“距离/时间”出现明显跳动和卡顿；排查发现每条卡片的距离文本、时间文本都由逻辑层在定位回调中批量 `setData`。请给出两套优化方案，并说明你最终选择哪套、为什么。

## 实践练习题

### 练习 1：新建 format.wxs 统一格式化工具

#### 任务

创建 `wxs/format.wxs`，导出四个函数：`formatPrice`（分转 ¥ 两位小数）、`formatPriceTrim`（去 .00）、`formatDistance`（m/km）、`truncate`（文本截断加省略号），并在探店笔记列表中全部调用。

参考代码：

```javascript
function formatPrice(cents) {
  if (cents === null || cents === undefined) return ''
  return '¥' + (cents / 100).toFixed(2)
}

function truncate(text, len) {
  if (!text) return ''
  if (text.length <= len) return text
  return text.slice(0, len) + '…'
}

module.exports = {
  formatPrice: formatPrice,
  truncate: truncate
}
```

#### 步骤约束

1. 文件内只允许 `var`/`function`/普通 for 循环，提交前逐行自查 ES6 语法。
2. 至少准备 6 条 mock 数据，覆盖“价格为整元/非整元”“距离小于 1km/大于 1km/大于 10km”“标题超长/不超长”等边界。
3. WXML 中四个函数都必须被实际调用，不能定义了不用。
4. 对 `null`、`undefined`、空字符串输入返回空字符串，界面不得出现 `¥NaN`、`undefinedm`。

#### 提交物

- `wxs/format.wxs`、页面 WXML/TS；
- 边界数据渲染截图；
- 100 字以内函数说明。

#### 验收标准

- 所有边界输入显示正确，无 NaN/undefined 文本；
- 代码中不存在任何 ES6+ 特性；
- 同一份 mock 数据改成分单位后，无需逻辑层生成展示字段即可正确呈现。

### 练习 2：发布时间格式化与重算验证

#### 任务

编写 `wxs/time.wxs` 的 `formatPublishTime`，实现“刚刚 / x 分钟前 / x 小时前 / 昨天 / x 天前 / 月日 / 年月日”分层规则，并验证 WXS 的重算时机。

概念伪代码：

```text
输入 timestamp（毫秒）
diff = 当前时间 - timestamp
diff < 1 分钟        → 刚刚
diff < 1 小时        → x 分钟前
diff < 24 小时       → x 小时前
diff < 48 小时       → 昨天
diff < 7 天          → x 天前
今年内               → MM-DD
跨年                  → YYYY-MM-DD
```

#### 步骤约束

1. 必须用 `getDate()` 取当前时间，用补零函数格式化月日。
2. 准备至少 7 个时间点 mock 数据覆盖每一档，并在页面标注每条命中的规则。
3. 打开页面停留 2 分钟后观察文案是否自动变化，记录现象；再由逻辑页 `setData` 修改一次对应 timestamp 验证重算。
4. 输出 100 字以内结论：WXS 相对时间何时重算、产品上应如何约定。

#### 提交物

- `wxs/time.wxs` 与页面代码；
- 七档渲染截图；
- 停留观察与手动重算记录。

#### 验收标准

- 七档结果全部正确，跨年场景年份显示无误；
- 能用自己的话说清“为什么停留时不自动刷新”；
- 手动改动依赖数据后文案立即更新。

### 练习 3：WXS 响应事件实现跟手卡片

#### 任务

在页面中放一个可横向拖动的“优惠券小球”，触摸移动时用 WXS 渲染层跟手改变位移，松手时通过 `callMethod` 把最终位置回传逻辑层并显示。

参考代码：

```xml
<wxs module="drag" src="../../wxs/drag.wxs" />

<view class="stage">
  <view
    class="ball"
    bindtouchstart="{{ drag.onTouchStart }}"
    bindtouchmove="{{ drag.onTouchMove }}"
    bindtouchend="{{ drag.onTouchEnd }}"
  >
    券
  </view>
</view>
<text class="result">最终位置：{{ endText }}</text>
```

```javascript
var startX = 0
var baseX = 0

function onTouchStart(event, ownerInstance) {
  startX = event.touches[0].clientX
  var state = ownerInstance.getState()
  baseX = state && typeof state.x === 'number' ? state.x : 0
}

function onTouchMove(event, ownerInstance) {
  var x = baseX + (event.touches[0].clientX - startX)
  ownerInstance.setStyle({ transform: 'translateX(' + x + 'px)' })
  ownerInstance.setState({ x: x })
}

function onTouchEnd(event, ownerInstance) {
  var state = ownerInstance.getState()
  ownerInstance.callMethod('onDragEnd', { x: state ? state.x : 0 })
}

module.exports = {
  onTouchStart: onTouchStart,
  onTouchMove: onTouchMove,
  onTouchEnd: onTouchEnd
}
```

#### 步骤约束

1. 移动过程中逻辑层**不接收任何事件**（可在逻辑层 touchmove 处不写任何绑定，自证无跨线程）。
2. 连续多次拖动时位置应基于上一次结果累加，不回弹归零。
3. 松手后逻辑页 `onDragEnd` 更新 `endText`，界面显示最终坐标。
4. 真机至少验证一次，模拟器验证一次。

#### 提交物

- `wxs/drag.wxs`、页面代码；
- 真机与模拟器操作录屏或截图；
- 逻辑层仅在松手时收到事件的日志。

#### 验收标准

- 拖动全程跟手流畅，逻辑层只在松手触发一次；
- 多次拖动位置累加正确；
- 能解释该方案比“touchmove 走 setData”更快的原因。

## 阶段验收作业

本作业是阶段一视图表达的**渲染层脚本证据点**，重点证明学员能独立编写 WXS 模块完成格式化，并能用 WXS 响应事件处理高频交互，同时在逻辑层与渲染层之间做出正确取舍。

### 任务描述

为「逛吃指南」升级笔记列表、详情与一个手势交互（纯前端静态数据）：

1. 建立统一的 `wxs/format.wxs`（可再拆 `price.wxs`/`time.wxs` 并用 require 组合），至少包含：价格（分转元、去尾零、千分位三种）、发布时间（六档规则）、距离（m/km 三档）、文本截断。
2. 列表页与详情页全部使用该模块展示，不再在逻辑层生成任何“展示文本字段”；准备覆盖所有边界的 mock 数据（整元/非整元、刚发布/跨年、近距离/远距离、超长标题）。
3. 实现一个渲染层手势：优惠券小球横向跟手拖动或门店卡片上下跟手展开，移动全程渲染层闭环，松手时 callMethod 回传最终位置并落进页面 data 展示。
4. 详情页优惠券文案（金额 + 满减条件）由 WXS 拼接；领取状态文案仍由 WXML 条件渲染完成。

### 完成标准

- 格式化能力集中于 wxs 模块、多页复用，逻辑层数据只存“分值/时间戳/米数”等原始值；
- 所有边界输入无 NaN/undefined，价格展示与存储单位严格分离；
- 手势跟手流畅，逻辑层只在结束时收到一次回传；
- 能现场说明任一实现为何放在 WXS 或逻辑层，并复述“前端不存密钥、判定在后端”的安全约束。

### 评分要点（100 分）

| 维度 | 分值 | 要点 |
|---|---:|---|
| WXS 模块组织 | 15 | 内联/外链选用合理，exports/require 正确 |
| ES5 语法合规 | 15 | 无 let/箭头函数/模板字符串等 ES6+ 特性 |
| 价格/时间/距离/截断格式化 | 25 | 规则完整、边界全覆盖、无异常文本 |
| WXS 响应事件 | 20 | 渲染层闭环跟手、setState 累加、仅结束 callMethod |
| 逻辑层/WXS 取舍 | 10 | 数据归一在逻辑层、展示在 WXS，职责清晰 |
| 安全意识 | 5 | 无密钥前端化、知道金额判定在后端 |
| 真机验证与表达 | 10 | 真机演示流畅，能讲清机制与重算时机 |

### 强制不通过条件

- WXS 中出现 ES6+ 语法导致编译失败或函数不执行；
- 使用 `new Date()`、在 wxs 中调用 `wx.*` 或访问 window/document；
- 高频 move 事件走逻辑层 setData，或手势不可用、回弹错误无法连续拖动；
- 边界输入出现 `¥NaN`、`undefinedm`、`null 分钟前` 等异常文本；
- 把密钥、签名或金额最终判定放进前端代码；
- 无法解释 WXS 的运行层级、重算时机以及与逻辑层处理的取舍。

完成本作业后，阶段一“页面结构 + 渲染层逻辑”的表达能力已经闭环。下一阶段进入 U07/U08 自定义组件，学员将把“模板 + WXS + 数据”升级为“结构 + 逻辑 + 样式”三位一体的可复用组件，为后续云开发与复杂业务页面打下基础。
