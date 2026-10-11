# MP-03 模板、样式与事件：让组件意图穿过边界

## 任务卡

- 任务：实现原生商品行，观察冒泡、属性和局部数据更新。
- 产出：在 MP-01 实验中新增组件四文件，替换页面模板并增加页面事件。
- 运行：微信工具编译；点击内部按钮只产生一次收藏意图。
- 边界：本地收藏不是服务端写入；样式与事件需真实平台检查。

## 1. 任务背景

商品行可打开详情，内部按钮可收藏。同一点击如果冒泡到行，就会同时导航。
组件若直接改父页面数据，会失去所有权，也无法在多行之间保持一致状态。

## 2. 学习目标

理解 WXML 条件与列表、稳定 key、properties 与自定义事件，区分 bind/catch，
解释 rpx、样式隔离与安全区，不把 HTML/CSS 全部能力当小程序保证。

## 3. 预备知识

完成 MP-01。组件路径相对项目根；原生 `wx:for` 与 Taro map 是不同源码形式，
编译结果相似不代表语法可互换。

<a id="s4"></a>
## 4. 核心理论

模板绑定数据，不执行任意业务 JavaScript。`wx:if` 改变节点存在性，hidden 保留节点；
频繁切换可以比较两者成本，但不以隐藏代替敏感数据过滤。`wx:key` 应使用稳定业务 ID，
不是数组位置。数字 `0` 分是合法值，不能通过真假判断隐藏它。

`rpx` 按视口宽度折算，设计基准 750；它不是固定物理像素，也不保证文字随用户字体缩放。
布局需检查窄屏、长标题、安全区和触控大小。自定义组件默认样式隔离，
页面选择器不能被假定可直接覆盖组件；明确 externalClasses 或组件 props 比全局穿透可靠。

bind 允许冒泡，catch 阻止继续冒泡。`dataset` 属于事件节点输入，仍须校验；
组件使用 `triggerEvent` 发出意图，父组件拥有收藏状态并更新 props。

## 5. API 清单

| 项目 | 决策 |
| --- | --- |
| properties | 父级传值，组件不偷改 |
| triggerEvent | 向外传稳定 ID 与意图 |
| catchtap | 收藏不触发行导航 |
| wx:key | 使用 id，而不是 index |
| rpx | 流体长度，不是设备分辨率 |

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `components/listing-row/index.json`：

```json
{"component":true}
```

完整文件 `components/listing-row/index.js`：

```js
Component({
  properties: {
    listingId: String, title: String, priceCents: Number, favorite: Boolean
  },
  methods: {
    open() { this.triggerEvent("open", { id: this.properties.listingId }); },
    favoriteTap() {
      this.triggerEvent("favorite", { id: this.properties.listingId });
    }
  }
});
```

完整文件 `components/listing-row/index.wxml`：

```xml
<view class="row" bindtap="open">
  <text>{{title}} / {{priceCents}} 分</text>
  <button catchtap="favoriteTap">{{favorite ? "取消收藏" : "收藏"}}</button>
</view>
```

完整文件 `components/listing-row/index.wxss`：

```css
.row { padding: 24rpx; border-bottom: 1px solid #ddd; }
text { display: block; overflow-wrap: break-word; }
button { min-height: 88rpx; margin-top: 16rpx; }
```

完整文件 `pages/index/index.json`：

```json
{"usingComponents":{"listing-row":"/components/listing-row/index"}}
```

完整替换 `pages/index/index.js`：

```js
Page({
  data: { favorite: false },
  open(event) { console.info("open", event.detail.id); },
  favorite(event) {
    if (event.detail.id !== "lamp-1") throw new Error("invalid id");
    this.setData({ favorite: !this.data.favorite });
  }
});
```

完整替换 `pages/index/index.wxml`：

```xml
<listing-row listing-id="lamp-1" title="台灯" price-cents="{{0}}"
  favorite="{{favorite}}" bind:open="open" bind:favorite="favorite" />
```

编译后显示 0 分，点收藏只更新按钮，点标题输出 open。停止时关闭项目，
本实验不存储收藏；重编译后恢复 false。

<a id="s7"></a>
## 7. 邻里集市集成案例

列表父页面以 ID 集合存收藏，服务端 Listing 不添加 `favorite` 字段。
搜索重排仍按 id 匹配，不将第一行的收藏错移到新第一行。详情事件只携带 ID，
完整详情从后端读取。Taro 中用 `onClick`、`event.stopPropagation()` 与受控 props，
完整客户端见 MP-24；需验证编译后的原生事件行为。

<a id="s8"></a>
## 8. 常见错误与排查路径

将 catchtap 改 bindtap：收藏后出现 open 日志，根因是冒泡。恢复 catchtap，
分别点击标题和按钮复验。将 `price-cents="{{0}}"` 错写字符串时，检查 properties 类型
与工具警告，不以 `Number(value) || 0` 默默吞掉非法输入。

## 9. 课后题

1. 隐藏数据是否就安全？答案：不，数据已传客户端，安全依靠服务端返回范围。
2. index 能否做 key？答案：可静态演示，但重排业务集合应稳定 ID。
3. rpx 能否解决所有屏幕？答案：不能，文字、safe area 与长内容另测。

<a id="s10"></a>
## 10. 实践练习

- 基础：免费商品显示“免费”。参考答案：严格比较 `priceCents === 0`，不对非法值降为 0。
- 进阶：增加已售标签。参考答案：props 增加 status，父级先 parser；
  `sold` 禁用新预约但仍可按产品约定展示历史详情。
- 故障注入：直接修改 properties.favorite。参考答案：会破坏单向数据流；
  发事件并由父级 setData，测试两行互不影响。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 0 分可见，收藏一次不导航。
- [ ] 样式隔离明确，窄屏长标题不遮挡按钮。
- [ ] 两行交换顺序时状态按 ID 保留。
- [ ] 工具和真机事件证据单独记录；本机编译不能代替它们。

## 12. 常见问题

所有 CSS 都可用吗？不，组件样式和各平台实现有差异。catch 是否影响业务授权？
不，它仅控制事件传播。

## 13. 扩展阅读

[WXML](https://developers.weixin.qq.com/miniprogram/dev/reference/wxml/)、
[WXSS](https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxss.html)、
[组件通信](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/events.html)。

## 我现在能做到什么

我能用受控属性与事件表达商品行意图，检查样式隔离和冒泡故障。

## 单元导航

[上一单元](../01-runtime/02-page-component-ownership.md) ·
[下一单元](02-taro-render-budget.md) · [本卷](../README.md)
