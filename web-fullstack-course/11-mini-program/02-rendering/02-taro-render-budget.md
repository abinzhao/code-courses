# MP-04 Taro React 渲染预算：共享 JSX，不共享浏览器假设

## 任务卡

- 任务：用完整商品列表组件限制传入视图的数据，建立渲染测量基线。
- 产出：`src/components/ListingList.tsx`；使用 MP-24 项目编译。
- 运行：类型检查、微信 build，工具观察 20/200 行与图片尺寸。
- 边界：Node 时间与 webpack 时间不是小程序首屏时间。

## 1. 任务背景

把完整后端响应、缓存和上传任务都塞进 React state，会让视图层收到不必要的数据。
Taro 共享 React 编程模型，但平台渲染器和跨层成本仍存在；`memo` 不会替你取消请求或
消除大数据补丁。

## 2. 学习目标

区分领域模型与展示投影；识别 setState、跨层序列化与图片解码成本；用实测选择分页或虚拟列表，
避免“加 memo 即性能优化”的结论。

## 3. 预备知识

完成原生渲染篇和 React props/state。用 MP-24 项目创建组件，无需新增依赖；
保持 React 18 与 Taro 4.3.0 一致。下面不是 HTML 的 div/img。

<a id="s4"></a>
## 4. 核心理论

平台组件使用 View/Text/Button/Image，不访问 document。Taro 将 JSX 与逻辑翻译为
平台可运行产物，不能由 JSX 可编译推断所有事件/样式一致。

展示投影只包含 id/title/price/status，图片固定尺寸，列表有稳定 key。把分页作为默认
预算：先加载 20 行，用户主动翻页或滚动后加载下一页。无限列表要去重、稳定顺序、
最大保留数量和返回位置恢复，不能不停 append。

性能至少测首屏可用、输入响应、setData 频率/大小、图片解码和内存。
工具中固定基础库与设备模拟条件，再真机测；不同机型不能只比较平均值。
Taro 样式 px 转平台尺寸，原生 rpx 已是平台单位，不能重复换算。

## 5. 配置清单

| 项目 | 预算/观察 |
| --- | --- |
| 页面 items | 默认 20，最大 100 后换页 |
| 投影 | 不含 Token、缓存、RequestTask |
| key | Listing.id |
| 图片 | 固定占位尺寸，异常态不撑开布局 |
| profiler | 区分 React、跨层、平台渲染证据 |

<a id="s6"></a>
## 6. 最小可运行案例

完整文件 `src/components/ListingList.tsx`：

```tsx
import { memo } from "react";
import { View, Text, Button } from "@tarojs/components";
import { Listing } from "../domain";
interface Props { items: Listing[]; onOpen(id: string): void }
function ListingList({ items, onOpen }: Props) {
  if (items.length > 100) throw new Error("列表超过本页预算，请分页");
  return <View>
    {items.map(item => <View className="row" key={item.id}>
      <Text>{item.title}</Text>
      <Text>{(item.priceCents / 100).toFixed(2)} 元 / {item.status}</Text>
      <Button onClick={() => onOpen(item.id)}>查看详情</Button>
    </View>)}
    {items.length === 0 && <Text>暂无匹配商品</Text>}
  </View>;
}
export default memo(ListingList);
```

在 MP-24 首页导入组件，以 `items={items}` 和导航回调替换 items.map。
运行 `npm run typecheck` 与 `npm run build:weapp`；工具中空列表显示空态，
20 行均有按钮，101 行触发预算错误。此异常是课堂主动护栏，生产应在请求/分页状态层
提前避免超限并显示恢复入口，而非让渲染异常作为正常体验。
结束时停止 watch；组件没有订阅、缓存或额外清理。

<a id="s7"></a>
## 7. 邻里集市集成案例

服务返回完整 Listing，经 parser 进入领域缓存，列表组件只读取四字段。详情再按 ID
读取，不能用截短的列表投影冒充完整资源。收藏变化只改变本地 ID 集合，
不修改服务端 version；点击预约更新后重新读详情与列表。

建立测量表：20 行基线、200 行错误实验、分页 20 行恢复，每次记录基础库、设备、
包版本、首次可交互时间、最大补丁量和滚动是否丢事件。不把本机 tsc 通过填到性能栏。

<a id="s8"></a>
## 8. 常见错误与排查路径

故障实验：取消 100 行护栏并复制 200 行数据，故意用数组 index 当 key；
收藏或重排时检查错行状态与渲染成本。根因分别是身份不稳定和无预算，
恢复 id、分页、瘦投影，再按同设备条件复测。
不要只记录“更流畅”；给测量值与观测方法。日志只记条数/耗时，不打印所有商品和会话。

## 9. 课后题

1. memo 能解决大响应吗？答案：不能，它只按 props 比较减少 React 重渲染。
2. webpack 快代表首屏快吗？答案：构建与运行时不同。
3. 20 行是平台硬限制吗？答案：是本课程预算，不是官方配额。

<a id="s10"></a>
## 10. 实践练习

- 基础：空列表。参考答案：显示暂无商品，不出现 loading 永久态。
- 进阶：20 行分页。参考答案：page/pageSize/total 从 parser 得到，换页前使旧代次失效；
  切页清晰显示当前页，不用客户端切片掩盖服务端全量拉取。
- 故障注入：每次输入都将整个响应 JSON 放入 state。参考答案：比较补丁体积，
  将查询文本和领域缓存分离，只提交展示所需数据，不加入秘密。

<a id="s11"></a>
## 11. 阶段验收

- [ ] 平台组件而非 DOM；id key、空态、预算明确。
- [ ] 记录同设备前后性能，数据量与图片条件一致。
- [ ] 类型、构建、工具性能、真机性能分开。
- [ ] 只以测量证明优化，不声明未运行的真机结果。

## 12. 常见问题

直接上虚拟列表吗？先证明瓶颈；平台滚动、回收、可访问性和返回位置可能增加维护成本。
CSS 能完全复用吗？保留语义与布局意图，逐平台核对支持项。

## 13. 扩展阅读

[Taro Hooks](https://docs.taro.zone/docs/hooks)、
[微信性能](https://developers.weixin.qq.com/miniprogram/dev/framework/performance/)。

## 我现在能做到什么

我能建立可测量的列表预算，区分编译速度与平台渲染性能。

## 单元导航

[上一单元](01-template-style-events.md) ·
[下一单元](../03-routing/01-stack-state-recovery.md) · [本卷](../README.md)
