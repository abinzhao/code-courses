# 第八章：变换、过渡与可取消动画

> 动作只解释界面变化，不替代业务状态、成功确认或无障碍反馈。

## 本章任务

为邻里集市商品收藏、状态筛选和阅读进度增加短暂反馈。所有动作都能被打断，在减少动作、API 缺失和滚动时间线不受支持时仍保留完整操作结果。

## 学习成果

完成本章后，你能够：

- 从坐标系、参考盒和函数顺序推导 `transform` 结果；
- 解释变换建立堆叠上下文或包含块后对定位后代的影响；
- 区分布局、绘制与合成成本，不把 `transform` 宣称为无条件免费；
- 用明确的 transition 列表连接两个界面状态；
- 设计可重播、可中断且不依赖结束事件提交业务状态的关键帧；
- 使用 Web Animations API 管理动画对象、取消与 Promise 拒绝；
- 把 scroll/view timeline 作为有限支持增强；
- 为减少动作、缺少 API 与浏览器差异提供静态等价结果。

## 详细教程

| 顺序 | 教程 | 核心问题 | 建议时间 |
| --- | --- | --- | ---: |
| 1 | [变换、坐标系与合成](08-transforms-transitions-animation/01-transforms-coordinates-compositing.md) | 视觉几何怎样由参考盒、原点和函数顺序得到 | 4–5 小时 |
| 2 | [过渡、关键帧与可取消状态](08-transforms-transitions-animation/02-transitions-keyframes-cancelable-state.md) | CSS 动作怎样服从组件状态机并处理中断 | 5–6 小时 |
| 3 | [WAAPI、滚动时间线与减少动作](08-transforms-transitions-animation/03-waapi-scroll-timeline-reduced-motion.md) | 脚本与滚动驱动动画怎样检测、取消和降级 | 5–6 小时 |

预计总学习时间：14–17 小时。

## 知识依赖

```text
正常流、定位与堆叠上下文
  → 变换参考盒、原点和矩阵组合
  → 两状态过渡
  → 多关键帧时间序列
  → 组件状态机与中断
  → WAAPI 对象生命周期
  → 滚动时间线渐进增强
  → 减少动作与跨浏览器复验
```

前置：[盒模型、流与定位](03-box-sizing-flow-position.md)、[响应式布局与容器查询](07-responsive-container.md)。动画只改变呈现；收藏、预约、支付和持久化仍由独立业务流程决定。

## 章级综合任务

在个人目录创建 `practice/css-08-market/index.html`：

1. 商品卡用短 `transform` 反馈收藏，不改变正常流占位；
2. 过渡只列 `background-color`、`border-color` 和 `transform`，不使用 `all`；
3. 收藏状态先同步写入 `aria-pressed`、按钮文字和状态区域，再启动装饰动作；
4. 连续点击会取消旧动画，不产生未处理的 `finished` Promise 拒绝；
5. “取消动作”只停止呈现，不回滚已发生的收藏状态；
6. 页面阅读进度在支持 scroll timeline 时增强，不支持时隐藏装饰；
7. `prefers-reduced-motion: reduce` 下取消位移、缩放和平滑滚动；
8. 页面明确标注收藏仅为内存演示，没有发送请求或持久化。

## 综合故障演练

- 交换 `translate` 与 `rotate` 顺序，记录包围框和路径差异；
- 给祖先添加 `transform`，观察 `position: fixed` 后代的包含块变化；
- 将过渡改成 `transition: all`，证明无关属性也被意外动画化；
- 在动画结束事件中才更新收藏，快速取消以复现状态丢失；
- 重复添加同一个动画类，观察第二次不一定重播；
- 取消 WAAPI 动画但不处理 `finished`，记录 Promise 拒绝；
- 把 `animation-timeline` 写在 `animation` 简写前，观察被重置；
- 开启减少动作，确认静态状态仍即时、清晰且可操作。

## 本章验收

- [ ] 能用坐标系和乘法顺序解释变换结果；
- [ ] 能识别变换造成的堆叠上下文、包含块和视觉溢出；
- [ ] transition 属性列表、时长、延迟和中断行为可观察；
- [ ] 关键帧、填充模式和业务状态没有互相冒充；
- [ ] 连续点击、取消、页面隐藏与 API 缺失路径无异常；
- [ ] 减少动作模式保留等价的文字和静态状态；
- [ ] 滚动驱动动画只作为 `@supports` 内增强；
- [ ] 已记录 Safari、Firefox、低性能设备和辅助技术的未验证范围。

## 进入下一章前

如果业务结果仍等待动画结束、取消动作会丢状态，或 reduce 模式只是把时长改得极短，应先修复。本书下一章会把这些动作放入有主题契约、层叠层和系统模式边界的组件。

[上一章：响应式布局与容器查询](07-responsive-container.md) · [开始第一课](08-transforms-transitions-animation/01-transforms-coordinates-compositing.md) · [下一章：现代 CSS 组件](09-components-modern-css.md) · [返回 CSS 模块](README.md)
